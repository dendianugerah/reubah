import { apiErrorFromResponse, ReubahNetworkError } from "./errors";
import { documentConversionFormData, imageConversionFormData } from "./multipart";
import type {
  Capabilities,
  ConversionResult,
  DocumentConversionInput,
  Health,
  ImageConversionInput,
  ReubahClientOptions,
} from "./types";

export function createReubahClient(options: ReubahClientOptions = {}) {
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? "");
  const fetchImpl = options.fetch ?? globalThis.fetch;

  if (!fetchImpl) {
    throw new ReubahNetworkError("No fetch implementation is available.", undefined);
  }

  async function request(path: string, init: RequestInit = {}) {
    let response: Response;

    try {
      response = await fetchImpl(`${baseUrl}${path}`, {
        ...init,
        headers: await mergeHeaders(options.headers, init.headers),
      });
    } catch (error) {
      throw new ReubahNetworkError("Reubah API request failed.", error);
    }

    if (!response.ok) {
      throw await apiErrorFromResponse(response);
    }

    return response;
  }

  return {
    health: {
      async get() {
        const response = await request("/v1/health", {
          method: "GET",
        });

        return (await response.json()) as Health;
      },
    },
    capabilities: {
      async get() {
        const response = await request("/v1/capabilities", {
          method: "GET",
        });

        return (await response.json()) as Capabilities;
      },
    },
    imageConversions: {
      async create(input: ImageConversionInput) {
        const response = await request("/v1/image-conversions", {
          method: "POST",
          body: imageConversionFormData(input),
        });

        return conversionResult(response);
      },
    },
    documentConversions: {
      async create(input: DocumentConversionInput) {
        const response = await request("/v1/document-conversions", {
          method: "POST",
          body: documentConversionFormData(input),
        });

        return conversionResult(response);
      },
    },
  };
}

async function mergeHeaders(
  configuredHeaders: ReubahClientOptions["headers"],
  requestHeaders: HeadersInit | undefined,
) {
  const headers = new Headers();
  const resolvedConfiguredHeaders =
    typeof configuredHeaders === "function" ? await configuredHeaders() : configuredHeaders;

  copyHeaders(headers, resolvedConfiguredHeaders);
  copyHeaders(headers, requestHeaders);

  return headers;
}

function copyHeaders(target: Headers, source: HeadersInit | undefined) {
  if (!source) {
    return;
  }

  new Headers(source).forEach((value, key) => {
    target.set(key, value);
  });
}

function conversionResult(response: Response): ConversionResult {
  return {
    response,
    contentType: response.headers.get("Content-Type") ?? "application/octet-stream",
    filename: filenameFromContentDisposition(response.headers.get("Content-Disposition")),
    blob: () => response.blob(),
    arrayBuffer: () => response.arrayBuffer(),
  };
}

function filenameFromContentDisposition(contentDisposition: string | null) {
  if (!contentDisposition) {
    return null;
  }

  const utf8Match = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);

  if (utf8Match?.[1]) {
    return decodeURIComponent(utf8Match[1]);
  }

  const match = /filename="?([^";]+)"?/i.exec(contentDisposition);

  return match?.[1] ?? null;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}
