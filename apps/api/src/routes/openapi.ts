import { Scalar } from "@scalar/hono-api-reference";
import { Hono } from "hono";
import { parse } from "yaml";

const openApiPath = new URL("../../../../openapi/v1.yaml", import.meta.url);

let cachedDocument: unknown;

export const openApiRoutes = new Hono();

openApiRoutes.get("/openapi.json", async (c) => {
  return c.json(await getOpenApiDocument());
});

openApiRoutes.get(
  "/reference",
  Scalar({
    pageTitle: "Reubah API Reference",
    url: "/openapi.json",
  }),
);

async function getOpenApiDocument() {
  if (!cachedDocument) {
    cachedDocument = parse(await Bun.file(openApiPath).text());
  }

  return cachedDocument;
}
