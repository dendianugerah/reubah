import { describe, expect, test } from "bun:test";
import { parse } from "yaml";

import {
  documentFormats,
  imageInputFormats,
  imageOutputFormats,
  qualityPresets,
  resizeModes,
} from "../src";

const openApiPath = new URL("../../../openapi/v1.yaml", import.meta.url);

type OpenApiDocument = {
  components: {
    schemas: Record<string, { enum?: string[] }>;
  };
};

async function readOpenApiDocument() {
  return parse(await Bun.file(openApiPath).text()) as OpenApiDocument;
}

function schemaEnum(document: OpenApiDocument, name: string) {
  return document.components.schemas[name]?.enum ?? [];
}

describe("@reubah/client OpenAPI alignment", () => {
  test("keeps exported format constants aligned with the public contract", async () => {
    const document = await readOpenApiDocument();

    expect(schemaEnum(document, "ImageInputFormat")).toEqual([...imageInputFormats]);
    expect(schemaEnum(document, "ImageOutputFormat")).toEqual([...imageOutputFormats]);
    expect(schemaEnum(document, "DocumentFormat")).toEqual([...documentFormats]);
    expect(schemaEnum(document, "ResizeMode")).toEqual([...resizeModes]);
    expect(schemaEnum(document, "QualityPreset")).toEqual([...qualityPresets]);
  });
});
