import { Hono } from "hono";

import { SERVICE_NAME, SERVICE_VERSION } from "../config";

export const healthRoutes = new Hono();

healthRoutes.get("/health", (c) => {
  return c.json({
    status: "ok",
    service: SERVICE_NAME,
    version: SERVICE_VERSION,
  });
});
