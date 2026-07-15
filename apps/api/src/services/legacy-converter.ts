import { LEGACY_API_TIMEOUT_MS, LEGACY_API_URL } from "../config";
import type { DocumentConversionOptions, ImageConversionOptions } from "../domain/form";
import { requestIdHeader } from "../http/request-id";

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

type LegacyConversionRequest = {
  requestId: string;
  timeoutMs?: number;
};

export async function convertImageWithLegacyApi(
  file: File,
  options: ImageConversionOptions,
  request: LegacyConversionRequest,
) {
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

  const response = await fetchLegacyApi("/process", body, request, "The image converter service is unavailable.");

  if (!response.ok) {
    throw await legacyErrorFromResponse(response, "Image conversion failed.");
  }

  return response;
}

export async function convertDocumentWithLegacyApi(
  file: File,
  options: DocumentConversionOptions,
  request: LegacyConversionRequest,
) {
  const body = new FormData();

  body.set("document", file, file.name);
  body.set("format", options.output_format);

  const response = await fetchLegacyApi(
    "/process/document",
    body,
    request,
    "The document converter service is unavailable.",
  );

  if (!response.ok) {
    throw await legacyErrorFromResponse(response, "Document conversion failed.");
  }

  return response;
}

async function fetchLegacyApi(
  path: string,
  body: FormData,
  request: LegacyConversionRequest,
  unavailableDetail: string,
) {
  const timeoutMs = request.timeoutMs ?? LEGACY_API_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(`${LEGACY_API_URL}${path}`, {
      method: "POST",
      body,
      headers: {
        [requestIdHeader]: request.requestId,
      },
      signal: controller.signal,
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new LegacyConverterError(
        504,
        "Converter timeout",
        `The converter did not respond within ${timeoutMs} ms.`,
        "converter-timeout",
      );
    }

    throw new LegacyConverterError(503, "Converter unavailable", unavailableDetail, "converter-unavailable");
  } finally {
    clearTimeout(timeout);
  }
}

async function legacyErrorFromResponse(response: Response, defaultDetail: string) {
  const status = normalizeStatus(response.status);
  let detail = defaultDetail;

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

function isAbortError(error: unknown) {
  return typeof error === "object" && error !== null && "name" in error && error.name === "AbortError";
}

function normalizeStatus(status: number) {
  if ([400, 413, 415, 422, 500, 503, 504].includes(status)) {
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
    case 504:
      return "Converter timeout";
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
    case 504:
      return "converter-timeout";
    default:
      return "upstream-conversion-error";
  }
}
