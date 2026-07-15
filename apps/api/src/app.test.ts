import { describe, expect, test } from "bun:test";
import sharp from "sharp";

import { createApp } from "./app";
import { maxMultipartBodyBytes } from "./http/multipart";

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

  test("rejects non-multipart conversion requests", async () => {
    const app = createApp();

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        output_format: "webp",
      }),
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: "Conversion requests must use multipart/form-data.",
    });
  });

  test("rejects conversion requests without a content type", async () => {
    const app = createApp();

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      body: "",
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: "Conversion requests must use multipart/form-data.",
    });
  });

  test("rejects unsupported image input formats before converting", async () => {
    const app = createApp();
    const body = new FormData();

    body.set("file", new File(["svg-bytes"], "vector.svg", { type: "image/svg+xml" }));
    body.set("output_format", "webp");

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: 'Unsupported image input format "svg". Supported formats: jpg, jpeg, png, webp, gif, bmp, heic, heif.',
    });
  });

  test("converts image requests in TypeScript", async () => {
    const app = createApp();
    const requestBody = new FormData();
    const png = await sharp({
      create: {
        width: 2,
        height: 2,
        channels: 4,
        background: {
          r: 255,
          g: 0,
          b: 0,
          alpha: 1,
        },
      },
    })
      .png()
      .toBuffer();

    requestBody.set("file", new File([png], "photo.png", { type: "image/png" }));
    requestBody.set("output_format", "webp");
    requestBody.set("quality", "high");
    requestBody.set("width", "1");
    requestBody.set("resize_mode", "fill");
    requestBody.set("optimize", "true");

    const response = await app.request("/v1/image-conversions", {
      method: "POST",
      body: requestBody,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/webp");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="photo.webp"');
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(0);
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

  test("rejects unsupported document input formats before converting", async () => {
    const app = createApp();
    const body = new FormData();

    body.set(
      "file",
      new File(["deck-bytes"], "slides.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    );
    body.set("output_format", "pdf");

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      body,
    });
    const problem = await response.json();

    expect(response.status).toBe(415);
    expect(problem).toMatchObject({
      type: "https://docs.reubah.com/errors/unsupported-media-type",
      title: "Unsupported media type",
      status: 415,
      detail: 'Unsupported document input format "pptx". Supported formats: pdf, doc, docx, odt, rtf, txt.',
    });
  });

  test("returns same-format document conversions in TypeScript", async () => {
    const app = createApp();
    const requestBody = new FormData();
    requestBody.set("file", new File(["document-bytes"], "report.txt", { type: "text/plain" }));
    requestBody.set("output_format", "txt");

    const response = await app.request("/v1/document-conversions", {
      method: "POST",
      body: requestBody,
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/plain");
    expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="report.txt"');
    expect(await response.text()).toBe("document-bytes");
  });
});
