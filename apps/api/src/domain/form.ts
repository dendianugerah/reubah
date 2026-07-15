import { z } from "zod";

import { capabilities } from "./capabilities";

const imageOutputFormats = capabilities.image_conversions.output_formats;
const qualityPresets = capabilities.image_conversions.quality_presets;
const resizeModes = capabilities.image_conversions.resize_modes;
const documentFormats = capabilities.document_conversions.output_formats;

export const imageConversionOptionsSchema = z.object({
  output_format: z.enum(imageOutputFormats),
  quality: z.enum(qualityPresets).optional(),
  width: z.coerce.number().int().min(1).max(capabilities.limits.max_image_width).optional(),
  height: z.coerce.number().int().min(1).max(capabilities.limits.max_image_height).optional(),
  resize_mode: z.enum(resizeModes).optional(),
  optimize: z
    .enum(["true", "false"])
    .transform((value) => value === "true")
    .optional(),
});

export type ImageConversionOptions = z.infer<typeof imageConversionOptionsSchema>;

export const documentConversionOptionsSchema = z.object({
  output_format: z.enum(documentFormats),
});

export type DocumentConversionOptions = z.infer<typeof documentConversionOptionsSchema>;

export type ValidationFailure = {
  title: string;
  detail: string;
  status: number;
  type: string;
};

export function getRequiredFile(formData: FormData, key: string): File | ValidationFailure {
  const value = formData.get(key);

  if (!(value instanceof File)) {
    return {
      type: "invalid-request",
      title: "Invalid request",
      status: 400,
      detail: `Multipart field "${key}" must contain a file.`,
    };
  }

  if (value.size === 0) {
    return {
      type: "invalid-request",
      title: "Invalid request",
      status: 400,
      detail: `Multipart field "${key}" must not be empty.`,
    };
  }

  if (value.size > capabilities.limits.max_upload_bytes) {
    return {
      type: "payload-too-large",
      title: "Payload too large",
      status: 413,
      detail: `File size exceeds the ${capabilities.limits.max_upload_bytes} byte limit.`,
    };
  }

  return value;
}

export function getStringFields(formData: FormData, keys: string[]) {
  return Object.fromEntries(
    keys.map((key) => {
      const value = formData.get(key);
      return [key, typeof value === "string" && value.length > 0 ? value : undefined];
    }),
  );
}

export function validationFailureFromZod(error: z.ZodError): ValidationFailure {
  const issue = error.issues[0];

  return {
    type: "invalid-request",
    title: "Invalid request",
    status: 400,
    detail: issue ? `${issue.path.join(".") || "request"}: ${issue.message}` : "Request validation failed.",
  };
}
