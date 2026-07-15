const defaultApiUrl = "http://localhost:8787";

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_REUBAH_API_URL || defaultApiUrl);

export type Health = {
  status: "ok";
  service: string;
  version: string;
};

export type Capabilities = {
  limits: {
    max_upload_bytes: number;
    max_image_width: number;
    max_image_height: number;
  };
  image_conversions: {
    input_formats: string[];
    output_formats: string[];
    resize_modes: string[];
    quality_presets: string[];
  };
  document_conversions: {
    input_formats: string[];
    output_formats: string[];
  };
};

export async function getHealth() {
  return getJson<Health>("/v1/health");
}

export async function getCapabilities() {
  return getJson<Capabilities>("/v1/capabilities");
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return response.json() as Promise<T>;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
