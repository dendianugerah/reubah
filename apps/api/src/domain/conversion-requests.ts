import {
  documentConversionOptionsSchema,
  getRequiredFile,
  getStringFields,
  imageConversionOptionsSchema,
  type DocumentConversionOptions,
  type ImageConversionOptions,
  type ValidationFailure,
  validationFailureFromZod,
} from "./form";

export type ImageConversionRequest = {
  file: File;
  options: ImageConversionOptions;
};

export type DocumentConversionRequest = {
  file: File;
  options: DocumentConversionOptions;
};

export function parseImageConversionRequest(formData: FormData): ImageConversionRequest | ValidationFailure {
  const file = getRequiredFile(formData, "file");

  if (!(file instanceof File)) {
    return file;
  }

  const options = imageConversionOptionsSchema.safeParse(
    getStringFields(formData, ["output_format", "quality", "width", "height", "resize_mode", "optimize"]),
  );

  if (!options.success) {
    return validationFailureFromZod(options.error);
  }

  return {
    file,
    options: options.data,
  };
}

export function parseDocumentConversionRequest(formData: FormData): DocumentConversionRequest | ValidationFailure {
  const file = getRequiredFile(formData, "file");

  if (!(file instanceof File)) {
    return file;
  }

  const options = documentConversionOptionsSchema.safeParse(getStringFields(formData, ["output_format"]));

  if (!options.success) {
    return validationFailureFromZod(options.error);
  }

  return {
    file,
    options: options.data,
  };
}
