import { Hono } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

import { problem } from "./http/problem";
import { requestId } from "./http/request-id";
import { capabilityRoutes } from "./routes/capabilities";
import { conversionRoutes } from "./routes/conversions";
import { healthRoutes } from "./routes/health";
import { openApiRoutes } from "./routes/openapi";

export function createApp() {
  const app = new Hono<{
    Variables: {
      requestId: string;
    };
  }>();

  app.use("*", requestId);
  app.use("*", secureHeaders());
  app.use(
    "*",
    cors({
      origin: "*",
      allowMethods: ["GET", "POST", "OPTIONS"],
      allowHeaders: ["Content-Type", "X-Request-ID"],
      exposeHeaders: ["X-Request-ID", "Content-Disposition"],
    }),
  );

  app.route("/v1", healthRoutes);
  app.route("/v1", capabilityRoutes);
  app.route("/v1", conversionRoutes);
  app.route("/", openApiRoutes);

  app.notFound((c) => {
    return problem(c, {
      type: "not-found",
      title: "Not found",
      status: 404,
      detail: `No route matches ${c.req.method} ${new URL(c.req.url).pathname}.`,
    });
  });

  app.onError((error, c) => {
    console.error(error);

    return problem(c, {
      type: "internal-server-error",
      title: "Internal server error",
      status: 500,
      detail: "An unexpected error occurred.",
    });
  });

  return app;
}
