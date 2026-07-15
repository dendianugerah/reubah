import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import { capabilities } from "./domain/capabilities";
import { getDocumentContentType, getImageContentType } from "./domain/media-types";

const openApiPath = new URL("../../../openapi/v1.yaml", import.meta.url);

type OpenApiDocument = {
  paths: Record<
    string,
    {
      post?: {
        responses: Record<
          string,
          {
            content?: Record<string, unknown>;
          }
        >;
      };
    }
  >;
  components: {
    schemas: Record<string, { enum?: string[] }>;
  };
};

async function readOpenApiDocument() {
  return parse(await Bun.file(openApiPath).text()) as OpenApiDocument;
}

describe("OpenAPI contract alignment", () => {
  test("documents the initial public API routes", async () => {
    const document = await readOpenApiDocument();

    expect(Object.keys(document.paths).sort()).toEqual([
      "/v1/capabilities",
      "/v1/document-conversions",
      "/v1/health",
      "/v1/image-conversions",
    ]);
  });

  test("keeps image capabilities aligned with OpenAPI enums", async () => {
    const document = await readOpenApiDocument();

    expect(document.components.schemas.ImageInputFormat.enum).toEqual([
      ...capabilities.image_conversions.input_formats,
    ]);
    expect(document.components.schemas.ImageOutputFormat.enum).toEqual([
      ...capabilities.image_conversions.output_formats,
    ]);
    expect(document.components.schemas.ResizeMode.enum).toEqual([
      ...capabilities.image_conversions.resize_modes,
    ]);
    expect(document.components.schemas.QualityPreset.enum).toEqual([
      ...capabilities.image_conversions.quality_presets,
    ]);
  });

  test("keeps document capabilities aligned with OpenAPI enums", async () => {
    const document = await readOpenApiDocument();

    expect(document.components.schemas.DocumentFormat.enum).toEqual([
      ...capabilities.document_conversions.output_formats,
    ]);
  });

  test("documents every implemented image conversion response media type", async () => {
    const document = await readOpenApiDocument();
    const contentTypes = Object.keys(
      document.paths["/v1/image-conversions"].post?.responses["200"].content ?? {},
    );

    const expectedContentTypes = new Set(
      capabilities.image_conversions.output_formats.map((format) => getImageContentType(format)),
    );

    for (const contentType of expectedContentTypes) {
      expect(contentTypes).toContain(contentType);
    }
  });

  test("documents every implemented document conversion response media type", async () => {
    const document = await readOpenApiDocument();
    const contentTypes = Object.keys(
      document.paths["/v1/document-conversions"].post?.responses["200"].content ?? {},
    );

    const expectedContentTypes = new Set(
      capabilities.document_conversions.output_formats.map((format) => getDocumentContentType(format)),
    );

    for (const contentType of expectedContentTypes) {
      expect(contentTypes).toContain(contentType);
    }
  });

  test("documents conversion error responses", async () => {
    const document = await readOpenApiDocument();
    const expectedStatuses = ["400", "413", "415", "422", "500", "503", "504"];

    expect(Object.keys(document.paths["/v1/image-conversions"].post?.responses ?? {})).toEqual([
      "200",
      ...expectedStatuses,
    ]);
    expect(Object.keys(document.paths["/v1/document-conversions"].post?.responses ?? {})).toEqual([
      "200",
      ...expectedStatuses,
    ]);
  });
});
