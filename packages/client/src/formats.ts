export const imageInputFormats = ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif"] as const;
export const imageOutputFormats = [...imageInputFormats, "pdf"] as const;
export const documentFormats = ["pdf", "doc", "docx", "odt", "rtf", "txt"] as const;
export const resizeModes = ["fit", "fill", "stretch"] as const;
export const qualityPresets = ["low", "medium", "high", "lossless"] as const;

export type ImageInputFormat = (typeof imageInputFormats)[number];
export type ImageOutputFormat = (typeof imageOutputFormats)[number];
export type DocumentFormat = (typeof documentFormats)[number];
export type ResizeMode = (typeof resizeModes)[number];
export type QualityPreset = (typeof qualityPresets)[number];
