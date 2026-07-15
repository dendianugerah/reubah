export type ImageInputFormat = "jpg" | "jpeg" | "png" | "webp" | "gif" | "bmp" | "heic" | "heif";
export type ImageOutputFormat = ImageInputFormat | "pdf";
export type DocumentFormat = "pdf" | "doc" | "docx" | "odt" | "rtf" | "txt";
export type ResizeMode = "fit" | "fill" | "stretch";
export type QualityPreset = "low" | "medium" | "high" | "lossless";

export type ReubahClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
};

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
    input_formats: ImageInputFormat[];
    output_formats: ImageOutputFormat[];
    resize_modes: ResizeMode[];
    quality_presets: QualityPreset[];
  };
  document_conversions: {
    input_formats: DocumentFormat[];
    output_formats: DocumentFormat[];
  };
};

export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  request_id?: string;
};

export type ImageConversionInput = {
  file: File;
  outputFormat: ImageOutputFormat;
  quality?: QualityPreset;
  width?: number;
  height?: number;
  resizeMode?: ResizeMode;
  optimize?: boolean;
};

export type DocumentConversionInput = {
  file: File;
  outputFormat: DocumentFormat;
};

export type ConversionResult = {
  response: Response;
  contentType: string;
  filename: string | null;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
};
