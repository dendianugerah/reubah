import { describe, expect, test } from "bun:test";

import { createApp } from "./app";

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
});
