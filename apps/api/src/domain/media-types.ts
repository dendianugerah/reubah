import type { DocumentConversionOptions, ImageConversionOptions } from "./form";

const imageContentTypes = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  bmp: "image/bmp",
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
} as const satisfies Record<ImageConversionOptions["output_format"], string>;

export function getImageContentType(format: ImageConversionOptions["output_format"]) {
  return imageContentTypes[format];
}

const documentContentTypes = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  odt: "application/vnd.oasis.opendocument.text",
  rtf: "application/rtf",
  txt: "text/plain",
} as const satisfies Record<DocumentConversionOptions["output_format"], string>;

export function getDocumentContentType(format: DocumentConversionOptions["output_format"]) {
  return documentContentTypes[format];
}

export function getConvertedFilename(inputName: string, outputFormat: string) {
  const withoutExtension = inputName.includes(".")
    ? inputName.slice(0, inputName.lastIndexOf("."))
    : inputName;

  return `${withoutExtension}.${outputFormat}`;
}
