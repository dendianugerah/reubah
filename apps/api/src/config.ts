export const SERVICE_NAME = "reubah-api";
export const SERVICE_VERSION = process.env.REUBAH_API_VERSION ?? "1.0.0";
export const DEFAULT_LIBREOFFICE_TIMEOUT_MS = 120_000;

export function getPort() {
  const value = process.env.PORT ?? "8787";
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw new Error(`Invalid PORT value: ${value}`);
  }

  return port;
}

export function getLibreOfficeTimeoutMs() {
  return getPositiveIntegerEnv("REUBAH_LIBREOFFICE_TIMEOUT_MS", DEFAULT_LIBREOFFICE_TIMEOUT_MS);
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
