import { Hono } from "hono";

import {
  documentConversionOptionsSchema,
  getRequiredFile,
  getStringFields,
  imageConversionOptionsSchema,
  validationFailureFromZod,
} from "../domain/form";
import { getConvertedFilename, getDocumentContentType, getImageContentType } from "../domain/media-types";
import { readMultipartFormData } from "../http/multipart";
import { problem } from "../http/problem";
import {
  convertDocumentWithLegacyApi,
  convertImageWithLegacyApi,
  LegacyConverterError,
} from "../services/legacy-converter";

export const conversionRoutes = new Hono();

conversionRoutes.post("/image-conversions", async (c) => {
  const formData = await readMultipartFormData(c);

  if (!(formData instanceof FormData)) {
    return problem(c, formData);
  }

  const file = getRequiredFile(formData, "file");

  if (!(file instanceof File)) {
    return problem(c, file);
  }

  const options = imageConversionOptionsSchema.safeParse(
    getStringFields(formData, ["output_format", "quality", "width", "height", "resize_mode", "optimize"]),
  );

  if (!options.success) {
    return problem(c, validationFailureFromZod(options.error));
  }

  let response: Response;

  try {
    response = await convertImageWithLegacyApi(file, options.data);
  } catch (error) {
    if (error instanceof LegacyConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(file.name, options.data.output_format);

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": getImageContentType(options.data.output_format),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});

conversionRoutes.post("/document-conversions", async (c) => {
  const formData = await readMultipartFormData(c);

  if (!(formData instanceof FormData)) {
    return problem(c, formData);
  }

  const file = getRequiredFile(formData, "file");

  if (!(file instanceof File)) {
    return problem(c, file);
  }

  const options = documentConversionOptionsSchema.safeParse(getStringFields(formData, ["output_format"]));

  if (!options.success) {
    return problem(c, validationFailureFromZod(options.error));
  }

  let response: Response;

  try {
    response = await convertDocumentWithLegacyApi(file, options.data);
  } catch (error) {
    if (error instanceof LegacyConverterError) {
      return problem(c, error);
    }

    throw error;
  }

  const filename = getConvertedFilename(file.name, options.data.output_format);

  return new Response(response.body, {
    status: 200,
    headers: {
      "Content-Type": getDocumentContentType(options.data.output_format),
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
});
