export const SERVICE_NAME = "reubah-api";
export const SERVICE_VERSION = process.env.REUBAH_API_VERSION ?? "1.0.0";
export const LEGACY_API_URL = normalizeUrl(process.env.REUBAH_LEGACY_API_URL ?? "http://localhost:8081");
export const LEGACY_API_TIMEOUT_MS = getPositiveIntegerEnv("REUBAH_LEGACY_API_TIMEOUT_MS", 120_000);

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

function getPositiveIntegerEnv(name: string, fallback: number) {
  const value = process.env[name];

  if (!value) {
    return fallback;
  }

  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error(`Invalid ${name} value: ${value}`);
  }

  return parsed;
}
