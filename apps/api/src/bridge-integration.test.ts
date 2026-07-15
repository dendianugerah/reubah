import { describe, expect, test } from "bun:test";

import { createApp } from "./app";

const shouldRun = process.env.REUBAH_RUN_BRIDGE_INTEGRATION === "1";
const bridgeTest = test.skipIf(!shouldRun);

describe("legacy bridge integration", () => {
  bridgeTest(
    "converts an image through the legacy Go server",
    async () => {
      const app = createApp();
      const body = new FormData();
      const image = Bun.file(new URL("../../../static/assets/home.png", import.meta.url));

      body.set("file", new File([await image.arrayBuffer()], "home.png", { type: "image/png" }));
      body.set("output_format", "webp");
      body.set("quality", "high");

      const response = await app.request("/v1/image-conversions", {
        method: "POST",
        body,
      });
      const bytes = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("image/webp");
      expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="home.webp"');
      expect(bytes.byteLength).toBeGreaterThan(0);
    },
    { timeout: 30_000 },
  );

  bridgeTest(
    "converts a document through the legacy Go server",
    async () => {
      const app = createApp();
      const body = new FormData();
      const document = Bun.file(new URL("../test-fixtures/document.txt", import.meta.url));

      body.set("file", new File([await document.arrayBuffer()], "document.txt", { type: "text/plain" }));
      body.set("output_format", "pdf");

      const response = await app.request("/v1/document-conversions", {
        method: "POST",
        body,
      });
      const bytes = await response.arrayBuffer();

      expect(response.status).toBe(200);
      expect(response.headers.get("Content-Type")).toBe("application/pdf");
      expect(response.headers.get("Content-Disposition")).toBe('attachment; filename="document.pdf"');
      expect(bytes.byteLength).toBeGreaterThan(0);
    },
    { timeout: 60_000 },
  );
});
