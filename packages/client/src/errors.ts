import type { ProblemDetails } from "./types";

export class ReubahApiError extends Error {
  public readonly name = "ReubahApiError";
  public readonly status: number;
  public readonly requestId: string | null;

  constructor(
    message: string,
    public readonly response: Response,
    public readonly problem: ProblemDetails,
  ) {
    super(message);
    this.status = response.status;
    this.requestId = response.headers.get("X-Request-ID") ?? problem.request_id ?? null;
  }
}

export class ReubahNetworkError extends Error {
  public readonly name = "ReubahNetworkError";

  constructor(message: string, public readonly cause: unknown) {
    super(message);
  }
}

export async function apiErrorFromResponse(response: Response) {
  const problem = await problemFromResponse(response);

  return new ReubahApiError(problem.detail || problem.title, response, problem);
}

async function problemFromResponse(response: Response): Promise<ProblemDetails> {
  const contentType = response.headers.get("Content-Type") ?? "";

  if (contentType.toLowerCase().includes("application/problem+json")) {
    const body = (await response.json()) as Partial<ProblemDetails>;

    return {
      type: body.type ?? "about:blank",
      title: body.title ?? response.statusText,
      status: body.status ?? response.status,
      detail: body.detail ?? response.statusText,
      request_id: body.request_id,
    };
  }

  const detail = await response.text().catch(() => response.statusText);

  return {
    type: "about:blank",
    title: response.statusText || "Request failed",
    status: response.status,
    detail: detail || response.statusText || "Request failed.",
  };
}
