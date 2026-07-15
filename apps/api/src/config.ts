export const SERVICE_NAME = "reubah-api";
export const SERVICE_VERSION = process.env.REUBAH_API_VERSION ?? "1.0.0";
export const LEGACY_API_URL = normalizeUrl(process.env.REUBAH_LEGACY_API_URL ?? "http://localhost:8081");

export function getPort() {
  const value = process.env.PORT ?? "8787";
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

function normalizeUrl(value: string) {
  return value.replace(/\/+$/, "");
}
