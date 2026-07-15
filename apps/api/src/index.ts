import { getPort } from "./config";
import { createApp } from "./app";

const port = getPort();
const app = createApp();

Bun.serve({
  port,
  fetch: app.fetch,
});

console.log(`Reubah API listening on http://localhost:${port}`);
