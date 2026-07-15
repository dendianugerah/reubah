export const capabilities = {
  limits: {
    max_upload_bytes: 32 * 1024 * 1024,
    max_image_width: 8192,
    max_image_height: 8192,
  },
  image_conversions: {
    input_formats: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif"],
    output_formats: ["jpg", "jpeg", "png", "webp", "gif", "bmp", "heic", "heif", "pdf"],
    resize_modes: ["fit", "fill", "stretch"],
    quality_presets: ["low", "medium", "high", "lossless"],
  },
  document_conversions: {
    input_formats: ["pdf", "doc", "docx", "odt", "rtf", "txt"],
    output_formats: ["pdf", "doc", "docx", "odt", "rtf", "txt"],
  },
} as const;
