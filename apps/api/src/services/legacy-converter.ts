import { LEGACY_API_URL } from "../config";
import type { ImageConversionOptions } from "../domain/form";

export class LegacyConverterError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly type: string,
  ) {
    super(detail);
  }
}

export async function convertImageWithLegacyApi(file: File, options: ImageConversionOptions) {
  const body = new FormData();

  body.set("image", file, file.name);
  body.set("format", options.output_format);

  if (options.quality) {
    body.set("quality", options.quality);
  }

  if (options.width) {
    body.set("width", String(options.width));
  }

  if (options.height) {
    body.set("height", String(options.height));
  }

  if (options.resize_mode) {
    body.set("resizeMode", options.resize_mode);
  }

  if (options.optimize) {
    body.set("optimize", "true");
  }

  let response: Response;

  try {
    response = await fetch(`${LEGACY_API_URL}/process`, {
      method: "POST",
      body,
    });
  } catch {
    throw new LegacyConverterError(
      503,
      "Converter unavailable",
      "The image converter service is unavailable.",
      "converter-unavailable",
    );
  }

  if (!response.ok) {
    throw await legacyErrorFromResponse(response);
  }

  return response;
}

async function legacyErrorFromResponse(response: Response) {
  const status = normalizeStatus(response.status);
  let detail = "Image conversion failed.";

  try {
    const body = await response.json();
    detail = body?.error?.message ?? body?.message ?? detail;
  } catch {
    const text = await response.text().catch(() => "");
    if (text.trim().length > 0) {
      detail = text.trim();
    }
  }

  return new LegacyConverterError(status, titleForStatus(status), detail, typeForStatus(status));
}

function normalizeStatus(status: number) {
  if ([400, 413, 415, 422, 500, 503].includes(status)) {
    return status;
  }

  if (status >= 400 && status < 500) {
    return 400;
  }

  return 502;
}

function titleForStatus(status: number) {
  switch (status) {
    case 400:
      return "Invalid request";
    case 413:
      return "Payload too large";
    case 415:
      return "Unsupported media type";
    case 422:
      return "Conversion failed";
    case 503:
      return "Converter unavailable";
    default:
      return "Upstream conversion error";
  }
}

function typeForStatus(status: number) {
  switch (status) {
    case 400:
      return "invalid-request";
    case 413:
      return "payload-too-large";
    case 415:
      return "unsupported-media-type";
    case 422:
      return "conversion-failed";
    case 503:
      return "converter-unavailable";
    default:
      return "upstream-conversion-error";
  }
}
