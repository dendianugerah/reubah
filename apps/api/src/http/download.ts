type DownloadResponseOptions = {
  body: BodyInit | null;
  contentType: string;
  filename: string;
};

export function downloadResponse(options: DownloadResponseOptions) {
  return new Response(options.body, {
    status: 200,
    headers: {
      "Content-Type": options.contentType,
      "Content-Disposition": contentDisposition(options.filename),
    },
  });
}

export function contentDisposition(filename: string) {
  const safeFilename = sanitizeFilename(filename);

  return `attachment; filename="${asciiFallback(safeFilename)}"; filename*=UTF-8''${encodeRfc5987(safeFilename)}`;
}

function sanitizeFilename(filename: string) {
  const sanitized = filename.trim().replace(/[\u0000-\u001f\u007f/\\]/g, "_");

  return sanitized.length > 0 ? sanitized : "download";
}

function asciiFallback(filename: string) {
  return filename.replace(/["]/g, "_").replace(/[^\u0020-\u007e]/g, "_");
}

function encodeRfc5987(value: string) {
  return encodeURIComponent(value).replace(/['()*]/g, (character) => {
    return `%${character.charCodeAt(0).toString(16).toUpperCase()}`;
  });
}
