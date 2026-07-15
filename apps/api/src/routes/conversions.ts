import { Hono } from "hono";

import {
  parseDocumentConversionRequest,
  parseImageConversionRequest,
} from "../domain/conversion-requests";
import { getConvertedFilename, getDocumentContentType, getImageContentType } from "../domain/media-types";
import { downloadResponse } from "../http/download";
import { readMultipartFormData } from "../http/multipart";
import { problem } from "../http/problem";
import { convertDocument, DocumentConverterError } from "../services/document-converter";
import { convertImage, ImageConverterError } from "../services/image-converter";

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

  let converted: ArrayBuffer;

  try {
    converted = await convertImage(conversion.file, conversion.options);
  } catch (error) {
    if (error instanceof ImageConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(conversion.file.name, conversion.options.output_format);

  return downloadResponse({
    body: converted,
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

  let converted: ArrayBuffer;

  try {
    converted = await convertDocument(conversion.file, conversion.options);
  } catch (error) {
    if (error instanceof DocumentConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(conversion.file.name, conversion.options.output_format);

  return downloadResponse({
    body: converted,
    contentType: getDocumentContentType(conversion.options.output_format),
    filename,
  });
});
