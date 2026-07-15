import type { DocumentConversionInput, ImageConversionInput } from "./types";

export function imageConversionFormData(input: ImageConversionInput) {
  const formData = new FormData();

  formData.set("file", input.file, input.file.name);
  formData.set("output_format", input.outputFormat);

  appendOptional(formData, "quality", input.quality);
  appendOptional(formData, "width", input.width);
  appendOptional(formData, "height", input.height);
  appendOptional(formData, "resize_mode", input.resizeMode);

  if (input.optimize !== undefined) {
    formData.set("optimize", input.optimize ? "true" : "false");
  }

  return formData;
}

export function documentConversionFormData(input: DocumentConversionInput) {
  const formData = new FormData();

  formData.set("file", input.file, input.file.name);
  formData.set("output_format", input.outputFormat);

  return formData;
}

function appendOptional(formData: FormData, key: string, value: string | number | undefined) {
  if (value !== undefined) {
    formData.set(key, String(value));
  }
}
