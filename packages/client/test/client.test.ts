import { describe, expect, test } from "bun:test";

import { createReubahClient, ReubahApiError, ReubahNetworkError } from "../src";

describe("@reubah/client", () => {
  test("fetches capabilities with configured headers", async () => {
    const client = createReubahClient({
      baseUrl: "https://api.example.com/",
      headers: {
        "X-Request-ID": "req_client",
      },
      fetch: (async (input, init): Promise<Response> => {
        expect(input).toBe("https://api.example.com/v1/capabilities");
        expect(init?.method).toBe("GET");
        expect(new Headers(init?.headers).get("X-Request-ID")).toBe("req_client");

        return Response.json({
          limits: {
            max_upload_bytes: 33554432,
            max_image_width: 8192,
            max_image_height: 8192,
          },
          image_conversions: {
            input_formats: ["png"],
            output_formats: ["webp"],
            resize_modes: ["fit"],
            quality_presets: ["high"],
          },
          document_conversions: {
            input_formats: ["docx"],
            output_formats: ["pdf"],
          },
        });
      }) as typeof fetch,
    });

    await expect(client.capabilities.get()).resolves.toMatchObject({
      limits: {
        max_upload_bytes: 33554432,
      },
    });
  });

  test("creates image conversion multipart requests", async () => {
    const client = createReubahClient({
      fetch: (async (input, init) => {
        expect(input).toBe("/v1/image-conversions");
        expect(init?.method).toBe("POST");
        expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
        expect(init?.body).toBeInstanceOf(FormData);

        const body = init?.body as FormData;

        expect(body.get("file")).toBeInstanceOf(File);
        expect(body.get("output_format")).toBe("webp");
        expect(body.get("quality")).toBe("high");
        expect(body.get("width")).toBe("1200");
        expect(body.get("height")).toBe("800");
        expect(body.get("resize_mode")).toBe("fit");
        expect(body.get("optimize")).toBe("true");

        return new Response("converted-image", {
          headers: {
            "Content-Type": "image/webp",
            "Content-Disposition": 'attachment; filename="photo.webp"',
          },
        });
      }) as typeof fetch,
    });

    const result = await client.imageConversions.create({
      file: new File(["image"], "photo.png", {
        type: "image/png",
      }),
      outputFormat: "webp",
      quality: "high",
      width: 1200,
      height: 800,
      resizeMode: "fit",
      optimize: true,
    });

    expect(result.contentType).toBe("image/webp");
    expect(result.filename).toBe("photo.webp");
    await expect(result.arrayBuffer()).resolves.toHaveProperty("byteLength", 15);
  });

  test("creates document conversion multipart requests", async () => {
    const client = createReubahClient({
      fetch: (async (input, init) => {
        expect(input).toBe("/v1/document-conversions");
        expect(init?.method).toBe("POST");
        expect(init?.body).toBeInstanceOf(FormData);

        const body = init?.body as FormData;

        expect(body.get("file")).toBeInstanceOf(File);
        expect(body.get("output_format")).toBe("pdf");

        return new Response("converted-document", {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": 'attachment; filename="report.pdf"',
          },
        });
      }) as typeof fetch,
    });

    const result = await client.documentConversions.create({
      file: new File(["document"], "report.docx", {
        type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      }),
      outputFormat: "pdf",
    });

    expect(result.contentType).toBe("application/pdf");
    expect(result.filename).toBe("report.pdf");
    await expect(result.blob()).resolves.toBeInstanceOf(Blob);
  });

  test("throws typed API errors for problem responses", async () => {
    const client = createReubahClient({
      fetch: (async (input, init): Promise<Response> => {
        void input;
        void init;

        return Response.json(
          {
            type: "https://docs.reubah.com/errors/invalid-request",
            title: "Invalid request",
            status: 400,
            detail: "Multipart field \"file\" must contain a file.",
            request_id: "req_problem",
          },
          {
            status: 400,
            headers: {
              "Content-Type": "application/problem+json",
              "X-Request-ID": "req_problem",
            },
          },
        );
      }) as typeof fetch,
    });

    try {
      await client.capabilities.get();
      throw new Error("Expected capabilities request to throw.");
    } catch (error) {
      expect(error).toBeInstanceOf(ReubahApiError);
      expect(error).toMatchObject({
        status: 400,
        requestId: "req_problem",
        problem: {
          detail: "Multipart field \"file\" must contain a file.",
        },
      });
    }
  });

  test("throws typed network errors for transport failures", async () => {
    const client = createReubahClient({
      fetch: (async (input, init): Promise<Response> => {
        void input;
        void init;

        throw new Error("offline");
      }) as typeof fetch,
    });

    await expect(client.capabilities.get()).rejects.toBeInstanceOf(ReubahNetworkError);
  });
});
