import type { Context } from "hono";

import { capabilities } from "../domain/capabilities";
import type { ValidationFailure } from "../domain/form";

const multipartOverheadBytes = 1024 * 1024;

export const maxMultipartBodyBytes = capabilities.limits.max_upload_bytes + multipartOverheadBytes;

function invalidRequest(detail: string): ValidationFailure {
  return {
    type: "invalid-request",
    title: "Invalid request",
    status: 400,
    detail,
  };
}

export function validateContentLength(c: Context): ValidationFailure | null {
  const contentLength = c.req.header("content-length");

  if (!contentLength) {
    return null;
  }

  const value = contentLength.trim();

  if (!/^\d+$/.test(value)) {
    return invalidRequest("Content-Length must be a non-negative integer.");
  }

  const bytes = Number(value);

  if (!Number.isSafeInteger(bytes) || bytes > maxMultipartBodyBytes) {
    return {
      type: "payload-too-large",
      title: "Payload too large",
      status: 413,
      detail: `Multipart body exceeds the ${maxMultipartBodyBytes} byte limit.`,
    };
  }

  return null;
}

export async function readMultipartFormData(c: Context): Promise<FormData | ValidationFailure> {
  const contentLengthError = validateContentLength(c);

  if (contentLengthError) {
    return contentLengthError;
  }

  try {
    return await c.req.formData();
  } catch {
    return invalidRequest("Request body must be valid multipart/form-data.");
  }
}
