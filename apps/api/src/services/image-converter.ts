import { encode as encodeBmp } from "bmp-js";
import { PDFDocument } from "pdf-lib";
import sharp, { type FitEnum, type Sharp } from "sharp";

import type { ImageConversionOptions } from "../domain/form";

export class ImageConverterError extends Error {
  public readonly status = 422;
  public readonly title = "Conversion failed";
  public readonly type = "conversion-failed";

  constructor(public readonly detail: string) {
    super(detail);
  }
}

export async function convertImage(file: File, options: ImageConversionOptions): Promise<ArrayBuffer> {
  const input = Buffer.from(await file.arrayBuffer());
  const pipeline = applyResize(sharp(input, { animated: options.output_format === "gif" }), options);

  try {
    switch (options.output_format) {
      case "jpg":
      case "jpeg":
        return toArrayBuffer(await pipeline.jpeg({ quality: quality(options.quality), mozjpeg: options.optimize }).toBuffer());
      case "png":
        return toArrayBuffer(await pipeline.png({ compressionLevel: options.optimize ? 9 : 6 }).toBuffer());
      case "webp":
        return toArrayBuffer(
          await pipeline.webp({ quality: quality(options.quality), lossless: options.quality === "lossless" }).toBuffer(),
        );
      case "gif":
        return toArrayBuffer(await pipeline.gif().toBuffer());
      case "bmp":
        return toArrayBuffer(await toBmp(pipeline));
      case "heic":
      case "heif":
        return toArrayBuffer(await pipeline.heif({ quality: quality(options.quality), compression: "hevc" }).toBuffer());
      case "pdf":
        return await toPdf(pipeline);
    }
  } catch (error) {
    throw new ImageConverterError(error instanceof Error ? error.message : "Image conversion failed.");
  }
}

function applyResize(image: Sharp, options: ImageConversionOptions) {
  if (!options.width && !options.height) {
    return image;
  }

  return image.resize({
    width: options.width,
    height: options.height,
    fit: resizeFit(options.resize_mode),
  });
}

function resizeFit(mode: ImageConversionOptions["resize_mode"]): keyof FitEnum {
  switch (mode) {
    case "fill":
      return "cover";
    case "stretch":
      return "fill";
    default:
      return "inside";
  }
}

function quality(preset: ImageConversionOptions["quality"]) {
  switch (preset) {
    case "low":
      return 60;
    case "medium":
      return 75;
    case "lossless":
      return 100;
    case "high":
    default:
      return 90;
  }
}

async function toBmp(image: Sharp) {
  const { data, info } = await image.ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return encodeBmp({
    data,
    width: info.width,
    height: info.height,
  }).data;
}

async function toPdf(image: Sharp) {
  const png = await image.png().toBuffer();
  const metadata = await sharp(png).metadata();
  const width = metadata.width ?? 1;
  const height = metadata.height ?? 1;
  const document = await PDFDocument.create();
  const embeddedImage = await document.embedPng(png);
  const page = document.addPage([width, height]);

  page.drawImage(embeddedImage, {
    x: 0,
    y: 0,
    width,
    height,
  });

  return toArrayBuffer(await document.save());
}

function toArrayBuffer(bytes: Uint8Array) {
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}
