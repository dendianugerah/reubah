import { Hono } from "hono";

import { capabilities } from "../domain/capabilities";

export const capabilityRoutes = new Hono();

capabilityRoutes.get("/capabilities", (c) => {
  return c.json(capabilities);
});
