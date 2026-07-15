const defaultApiUrl = "http://localhost:8787";

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_REUBAH_API_URL || defaultApiUrl);

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly problem?: ProblemDetails,
  ) {
    super(message);
  }
}

export type Health = {
  status: string;
  service: string;
  version: string;
};

export type Capabilities = {
  image_conversions: {
    input_formats: string[];
    output_formats: string[];
    quality_presets: string[];
    resize_modes: string[];
  };
  document_conversions: {
    input_formats: string[];
    output_formats: string[];
  };
  limits: {
    max_upload_bytes: number;
    max_image_width: number;
    max_image_height: number;
  };
};

type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  request_id?: string;
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

export async function getHealth() {
  return (await requestJson("/v1/health")) as Health;
}

export async function getCapabilities() {
  return (await requestJson("/v1/capabilities")) as Capabilities;
}

export async function createImageConversion(input: ImageConversionInput): Promise<ConversionFile> {
  const formData = new FormData();
  formData.set("file", input.file);
  formData.set("output_format", input.outputFormat);

  if (input.quality) {
    formData.set("quality", input.quality);
  }

  if (input.width) {
    formData.set("width", input.width);
  }

  if (input.height) {
    formData.set("height", input.height);
  }

  if (input.resizeMode) {
    formData.set("resize_mode", input.resizeMode);
  }

  if (input.optimize !== undefined) {
    formData.set("optimize", String(input.optimize));
  }

  const response = await request("/v1/image-conversions", {
    method: "POST",
    body: formData,
  });
  const blob = await response.blob();

  return {
    blob,
    filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")) ?? "converted-file",
    contentType: response.headers.get("Content-Type") ?? "application/octet-stream",
  };
}

async function requestJson(path: string) {
  const response = await request(path);
  return response.json();
}

async function request(path: string, init: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${apiBaseUrl}${path}`, init);
  } catch (error) {
    throw new ApiError(error instanceof Error ? error.message : "API request failed.", 0);
  }

  if (!response.ok) {
    throw await apiErrorFromResponse(response);
  }

  return response;
}

async function apiErrorFromResponse(response: Response) {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.includes("application/problem+json")) {
    const problem = (await response.json()) as ProblemDetails;
    return new ApiError(problem.detail || problem.title, response.status, problem);
  }

  return new ApiError(`API request failed with status ${response.status}.`, response.status);
}

function filenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);

  return match?.[1] ?? null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
