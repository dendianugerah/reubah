import { afterEach, describe, expect, test } from "bun:test";

import { createApp } from "./app";
import { maxMultipartBodyBytes } from "./http/multipart";
import { requestIdHeader } from "./http/request-id";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("Reubah API shell", () => {
  test("returns health metadata", async () => {
    const app = createApp();
    const response = await app.request("/v1/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-ID")).toStartWith("req_");
    expect(await response.json()).toEqual({
      status: "ok",
      service: "reubah-api",
      version: "1.0.0",
    });
  });

  test("preserves incoming request ID", async () => {
    const app = createApp();
    const response = await app.request("/v1/health", {
      headers: {
        "X-Request-ID": "req_test",
      },
    });

    expect(response.headers.get("X-Request-ID")).toBe("req_test");
  });

  test("returns conversion capabilities", async () => {
    const app = createApp();
    const response = await app.request("/v1/capabilities");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.limits.max_upload_bytes).toBe(33554432);
    expect(body.image_conversions.output_formats).toContain("webp");
    expect(body.image_conversions.output_formats).toContain("pdf");
    expect(body.document_conversions.input_formats).toContain("docx");
  });

  test("returns problem details for unknown routes", async () => {
    const app = createApp();
    const response = await app.request("/v1/missing");
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(response.headers.get("Content-Type")).toContain("application/problem+json");
    expect(body).toMatchObject({
      type: "https://docs.reubah.com/errors/not-found",
      title: "Not found",
      status: 404,
    });
    expect(body.request_id).toStartWith("req_");
  });

  test("serves the OpenAPI document", async () => {
    const app = createApp();
    const response = await app.request("/openapi.json");
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.openapi).toBe("3.1.0");
    expect(body.paths["/v1/image-conversions"]).toBeDefined();
    expect(body.paths["/v1/document-conversions"]).toBeDefined();
  });

  test("serves the Scalar API reference", async () => {
    const app = createApp();
    const response = await app.request("/reference");
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toContain("text/html");
    expect(body).toContain("Reubah API Reference");
  });

  test("validates image conversion multipart requests", async () => {
    const app = createApp();
    const body = new FormData();
    body.set("output_format", "webp");

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toContain("application/problem+json");
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/invalid-request",
      title: "Invalid request",
      status: 400,
      detail: 'Multipart field "file" must contain a file.',
    });
  });

  test("rejects oversized multipart requests before parsing the body", async () => {
    const app = createApp();
    let legacyFetchCalled = false;

    globalThis.fetch = (async (input, init) => {
      void input;
      void init;
      legacyFetchCalled = true;

      return new Response("unexpected legacy response", {
        status: 500,
      });
    }) as typeof fetch;

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=test",
        "Content-Length": String(maxMultipartBodyBytes + 1),
      },
      body: "",
    });
    const problem = await response.json();

    expect(response.status).toBe(413);
    expect(legacyFetchCalled).toBe(false);
    expect(response.headers.get("Content-Type")).toContain("application/problem+json");
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/payload-too-large",
      title: "Payload too large",
      status: 413,
      detail: `Multipart body exceeds the ${maxMultipartBodyBytes} byte limit.`,
    });
  });

  test("returns problem details for malformed multipart bodies", async () => {
    const app = createApp();

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=missing",
      },
      body: "not-a-valid-multipart-body",
    });
    const problem = await response.json();

    expect(response.status).toBe(400);
    expect(response.headers.get("Content-Type")).toContain("application/problem+json");
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/invalid-request",
      title: "Invalid request",
      status: 400,
      detail: "Request body must be valid multipart/form-data.",
    });
  });

  test("rejects unsupported image input formats before calling the legacy API", async () => {
    const app = createApp();
    const body = new FormData();
    let legacyFetchCalled = false;

    body.set("file", new File(["svg-bytes"], "vector.svg", { type: "image/svg+xml" }));
    body.set("output_format", "webp");

    globalThis.fetch = (async (input, init) => {
      void input;
      void init;
      legacyFetchCalled = true;

      return new Response("unexpected legacy response", {
        status: 500,
      });
    }) as typeof fetch;

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(legacyFetchCalled).toBe(false);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: 'Unsupported image input format "svg". Supported formats: jpg, jpeg, png, webp, gif, bmp, heic, heif.',
    });
  });

  test("bridges image conversion requests to the legacy Go API", async () => {
    const app = createApp();
    const requestBody = new FormData();
    requestBody.set("file", new File(["image-bytes"], "photo.png", { type: "image/png" }));
    requestBody.set("output_format", "webp");
    requestBody.set("quality", "high");
    requestBody.set("width", "1200");
    requestBody.set("resize_mode", "fill");
    requestBody.set("optimize", "true");

    globalThis.fetch = (async (input, init) => {
      expect(input).toBe("http://localhost:8081/process");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      expect(new Headers(init?.headers).get(requestIdHeader)).toBe("req_image_bridge");

      const upstreamBody = init?.body as FormData;
      expect(upstreamBody.get("image")).toBeInstanceOf(File);
      expect(upstreamBody.get("format")).toBe("webp");
      expect(upstreamBody.get("quality")).toBe("high");
      expect(upstreamBody.get("width")).toBe("1200");
      expect(upstreamBody.get("resizeMode")).toBe("fill");
      expect(upstreamBody.get("optimize")).toBe("true");

      return new Response("converted-image", {
        status: 200,
        headers: {
          "Content-Type": "image/webp",
        },
      });
    }) as typeof fetch;

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      headers: {
        [requestIdHeader]: "req_image_bridge",
      },
      body: requestBody,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="photo.webp"');
    expect(await response.text()).toBe("converted-image");
  });

  test("validates document conversion multipart requests", async () => {
    const app = createApp();
    const body = new FormData();
    body.set("output_format", "pdf");

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(400);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/invalid-request",
      title: "Invalid request",
      status: 400,
      detail: 'Multipart field "file" must contain a file.',
    });
  });

  test("rejects unsupported document input formats before calling the legacy API", async () => {
    const app = createApp();
    const body = new FormData();
    let legacyFetchCalled = false;

    body.set(
      "file",
      new File(["deck-bytes"], "slides.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    );
    body.set("output_format", "pdf");

    globalThis.fetch = (async (input, init) => {
      void input;
      void init;
      legacyFetchCalled = true;

      return new Response("unexpected legacy response", {
        status: 500,
      });
    }) as typeof fetch;

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(legacyFetchCalled).toBe(false);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: 'Unsupported document input format "pptx". Supported formats: pdf, doc, docx, odt, rtf, txt.',
    });
  });

  test("bridges document conversion requests to the legacy Go API", async () => {
    const app = createApp();
    const requestBody = new FormData();
    requestBody.set("file", new File(["document-bytes"], "report.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" }));
    requestBody.set("output_format", "pdf");

    globalThis.fetch = (async (input, init) => {
      expect(input).toBe("http://localhost:8081/process/document");
      expect(init?.method).toBe("POST");
      expect(init?.body).toBeInstanceOf(FormData);
      expect(new Headers(init?.headers).get(requestIdHeader)).toBe("req_document_bridge");

      const upstreamBody = init?.body as FormData;
      expect(upstreamBody.get("document")).toBeInstanceOf(File);
      expect(upstreamBody.get("format")).toBe("pdf");

      return new Response("converted-document", {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
        },
      });
    }) as typeof fetch;

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      headers: {
        [requestIdHeader]: "req_document_bridge",
      },
      body: requestBody,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="report.pdf"');
    expect(await response.text()).toBe("converted-document");
  });
});
