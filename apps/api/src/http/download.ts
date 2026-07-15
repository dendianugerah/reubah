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
      "Content-Disposition": `attachment; filename="${options.filename}"`,
    },
  });
}
