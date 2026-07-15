import { extname, join, resolve } from "node:path";

const port = getPort();
const distDirectory = resolve(import.meta.dir, "dist");
const indexPath = join(distDirectory, "index.html");

Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/healthz") {
      return new Response("ok\n", {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
        },
      });
    }

    const filePath = resolve(distDirectory, `.${decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname)}`);

    if (!filePath.startsWith(`${distDirectory}/`) && filePath !== indexPath) {
      return new Response("Not found\n", { status: 404 });
    }

    const file = Bun.file(filePath);

    if (await file.exists()) {
      return fileResponse(filePath, file);
    }

    return fileResponse(indexPath, Bun.file(indexPath));
  },
});

console.log(`Reubah web listening on http://localhost:${port}`);

function fileResponse(path: string, file: Bun.BunFile) {
  const headers = new Headers({
    "Content-Type": contentType(path),
  });

  if (path.includes("/assets/")) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  }

  return new Response(file, { headers });
}

function contentType(path: string) {
  switch (extname(path)) {
    case ".css":
      return "text/css; charset=utf-8";
    case ".gif":
      return "image/gif";
    case ".html":
      return "text/html; charset=utf-8";
    case ".ico":
      return "image/x-icon";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".js":
    case ".mjs":
      return "text/javascript; charset=utf-8";
    case ".json":
    case ".map":
      return "application/json; charset=utf-8";
    case ".png":
      return "image/png";
    case ".svg":
      return "image/svg+xml";
    case ".webp":
      return "image/webp";
    case ".woff":
      return "font/woff";
    case ".woff2":
      return "font/woff2";
    default:
      return "application/octet-stream";
  }
}

function getPort() {
  const value = process.env.PORT ?? "3000";
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0 || parsed > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return parsed;
}
