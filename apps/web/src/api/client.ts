import {
  ReubahApiError,
  createReubahClient,
  type Capabilities,
  type Health,
  type ImageOutputFormat,
  type QualityPreset,
  type ResizeMode,
} from "@reubah/client";

const defaultApiUrl = "http://localhost:8787";

export const apiBaseUrl = trimTrailingSlash(import.meta.env.VITE_REUBAH_API_URL || defaultApiUrl);
export const ApiError = ReubahApiError;

const reubah = createReubahClient({
  baseUrl: apiBaseUrl,
});

export type { Capabilities, Health };

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
  return reubah.health.get();
}

export async function getCapabilities() {
  return reubah.capabilities.get();
}

export async function createImageConversion(input: ImageConversionInput): Promise<ConversionFile> {
  const result = await reubah.imageConversions.create({
    file: input.file,
    outputFormat: input.outputFormat as ImageOutputFormat,
    quality: input.quality ? (input.quality as QualityPreset) : undefined,
    width: input.width ? Number(input.width) : undefined,
    height: input.height ? Number(input.height) : undefined,
    resizeMode: input.resizeMode ? (input.resizeMode as ResizeMode) : undefined,
    optimize: input.optimize,
  });
  const blob = await result.blob();

  return {
    blob,
    filename: result.filename ?? "converted-file",
    contentType: result.contentType,
  };
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}
