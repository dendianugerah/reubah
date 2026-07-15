import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import { capabilities } from "./domain/capabilities";
import { getDocumentContentType, getImageContentType } from "./domain/media-types";

const openApiPath = new URL("../../../openapi/v1.yaml", import.meta.url);

type OpenApiSchema = {
  type?: string;
  format?: string;
  enum?: string[];
  required?: string[];
  properties?: Record<string, OpenApiSchema>;
  minimum?: number;
  maximum?: number;
  default?: unknown;
  example?: unknown;
  $ref?: string;
};

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
    schemas: Record<string, OpenApiSchema>;
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

  test("keeps limits aligned with OpenAPI schemas", async () => {
    const document = await readOpenApiDocument();
    const limits = document.components.schemas.Limits.properties ?? {};
    const imageRequest = document.components.schemas.CreateImageConversionRequest.properties ?? {};

    expect(limits.max_upload_bytes?.example).toBe(capabilities.limits.max_upload_bytes);
    expect(limits.max_image_width?.example).toBe(capabilities.limits.max_image_width);
    expect(limits.max_image_height?.example).toBe(capabilities.limits.max_image_height);
    expect(imageRequest.width?.maximum).toBe(capabilities.limits.max_image_width);
    expect(imageRequest.height?.maximum).toBe(capabilities.limits.max_image_height);
  });

  test("documents conversion request schemas", async () => {
    const document = await readOpenApiDocument();
    const imageRequest = document.components.schemas.CreateImageConversionRequest;
    const documentRequest = document.components.schemas.CreateDocumentConversionRequest;

    expect(imageRequest.required).toEqual(["file", "output_format"]);
    expect(Object.keys(imageRequest.properties ?? {})).toEqual([
      "file",
      "output_format",
      "quality",
      "width",
      "height",
      "resize_mode",
      "optimize",
    ]);
    expect(imageRequest.properties?.file).toMatchObject({
      type: "string",
      format: "binary",
    });
    expect(imageRequest.properties?.optimize).toMatchObject({
      type: "string",
      enum: ["true", "false"],
      default: "false",
    });

    expect(documentRequest.required).toEqual(["file", "output_format"]);
    expect(Object.keys(documentRequest.properties ?? {})).toEqual(["file", "output_format"]);
    expect(documentRequest.properties?.file).toMatchObject({
      type: "string",
      format: "binary",
    });
  });

  test("documents the Problem Details schema returned by the API", async () => {
    const document = await readOpenApiDocument();
    const problem = document.components.schemas.Problem;

    expect(problem.required).toEqual(["type", "title", "status", "detail", "request_id"]);
    expect(problem.properties?.type).toMatchObject({
      type: "string",
      format: "uri",
    });
    expect(problem.properties?.status).toMatchObject({
      type: "integer",
      minimum: 400,
      maximum: 599,
    });
    expect(problem.properties?.request_id).toMatchObject({
      type: "string",
    });
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
