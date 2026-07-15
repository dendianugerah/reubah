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

export type ConversionFile = {
  blob: Blob;
  filename: string;
  contentType: string;
};

export type ImageConversionInput = {
  file: File;
  outputFormat: string;
  quality?: string;
  width?: string;
  height?: string;
  resizeMode?: string;
  optimize?: boolean;
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  request_id: string;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly problem?: ProblemDetails,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function getHealth() {
  return getJson<Health>("/v1/health");
}

export async function getCapabilities() {
  return getJson<Capabilities>("/v1/capabilities");
}

export async function createImageConversion(input: ImageConversionInput): Promise<ConversionFile> {
  const body = new FormData();

  body.set("file", input.file);
  body.set("output_format", input.outputFormat);

  if (input.quality) {
    body.set("quality", input.quality);
  }

  if (input.width) {
    body.set("width", input.width);
  }

  if (input.height) {
    body.set("height", input.height);
  }

  if (input.resizeMode) {
    body.set("resize_mode", input.resizeMode);
  }

  if (input.optimize) {
    body.set("optimize", "true");
  }

  const response = await fetch(`${apiBaseUrl}/v1/image-conversions`, {
    method: "POST",
    body,
  });

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  const blob = await response.blob();
  const contentType = response.headers.get("Content-Type") ?? blob.type;
  const filename = getFilenameFromContentDisposition(response.headers.get("Content-Disposition")) ?? "converted-file";

  return {
    blob,
    filename,
    contentType,
  };
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return response.json() as Promise<T>;
}

async function apiErrorFromResponse(response: Response) {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/problem+json")) {
    const problem = (await response.json()) as ProblemDetails;
    return new ApiError(problem.detail, problem);
  }

  return new ApiError(`Request failed with status ${response.status}`);
}

function getFilenameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const match = value.match(/filename="?(?<filename>[^";]+)"?/);
  return match?.groups?.filename ?? null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
