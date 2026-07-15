import { createMiddleware } from "hono/factory";

export const requestIdHeader = "X-Request-ID";

export const requestId = createMiddleware<{
  Variables: {
    requestId: string;
  };
}>(async (c, next) => {
  const incoming = c.req.header(requestIdHeader);
  const id = incoming && incoming.trim().length > 0 ? incoming : createRequestId();

  c.set("requestId", id);
  c.header(requestIdHeader, id);

  await next();
});

function createRequestId() {
  return `req_${crypto.randomUUID().replaceAll("-", "")}`;
}
