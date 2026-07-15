import { Hono } from "hono";

import { problem } from "../http/problem";

export const conversionRoutes = new Hono();

conversionRoutes.post("/image-conversions", (c) => {
  return problem(c, {
    type: "not-implemented",
    title: "Not implemented",
    status: 501,
    detail: "Image conversion is not implemented in the TypeScript API shell yet.",
  });
});

conversionRoutes.post("/document-conversions", (c) => {
  return problem(c, {
    type: "not-implemented",
    title: "Not implemented",
    status: 501,
    detail: "Document conversion is not implemented in the TypeScript API shell yet.",
  });
});
