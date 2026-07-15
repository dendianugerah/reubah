import { Hono } from "hono";

import {
  parseDocumentConversionRequest,
  parseImageConversionRequest,
} from "../domain/conversion-requests";
import { getConvertedFilename, getDocumentContentType, getImageContentType } from "../domain/media-types";
import { downloadResponse } from "../http/download";
import { readMultipartFormData } from "../http/multipart";
import { problem } from "../http/problem";
import {
  convertDocumentWithLegacyApi,
  convertImageWithLegacyApi,
  LegacyConverterError,
} from "../services/legacy-converter";

type ApiEnv = {
  Variables: {
    requestId: string;
  };
};

export const conversionRoutes = new Hono<ApiEnv>();

conversionRoutes.post("/image-conversions", async (c) => {
  const formData = await readMultipartFormData(c);

  if (!(formData instanceof FormData)) {
    return problem(c, formData);
  }

  const conversion = parseImageConversionRequest(formData);

  if ("status" in conversion) {
    return problem(c, conversion);
  }

  let response: Response;

  try {
    response = await convertImageWithLegacyApi(conversion.file, conversion.options, {
      requestId: c.get("requestId"),
    });
  } catch (error) {
    if (error instanceof LegacyConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(conversion.file.name, conversion.options.output_format);

  return downloadResponse({
    body: response.body,
    contentType: getImageContentType(conversion.options.output_format),
    filename,
  });
});

conversionRoutes.post("/document-conversions", async (c) => {
  const formData = await readMultipartFormData(c);

  if (!(formData instanceof FormData)) {
    return problem(c, formData);
  }

  const conversion = parseDocumentConversionRequest(formData);

  if ("status" in conversion) {
    return problem(c, conversion);
  }

  let response: Response;

  try {
    response = await convertDocumentWithLegacyApi(conversion.file, conversion.options, {
      requestId: c.get("requestId"),
    });
  } catch (error) {
    if (error instanceof LegacyConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(conversion.file.name, conversion.options.output_format);

  return downloadResponse({
    body: response.body,
    contentType: getDocumentContentType(conversion.options.output_format),
    filename,
  });
});
