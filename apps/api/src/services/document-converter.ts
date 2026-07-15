import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { extname, join } from "node:path";
import { pathToFileURL } from "node:url";

import { getLibreOfficeTimeoutMs } from "../config";
import type { DocumentConversionOptions } from "../domain/form";

export class DocumentConverterError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail: string,
    public readonly type: string,
  ) {
    super(detail);
  }
}

export async function convertDocument(file: File, options: DocumentConversionOptions): Promise<ArrayBuffer> {
  const inputFormat = extension(file.name);

  if (!inputFormat) {
    throw new DocumentConverterError(415, "Unsupported media type", "Document filename has no extension.", "unsupported-media-type");
  }

  const input = await file.arrayBuffer();

  if (inputFormat === options.output_format) {
    return input;
  }

  const directory = await mkdtemp(join(tmpdir(), "reubah-doc-"));
  const inputPath = join(directory, `input.${inputFormat}`);

  try {
    await writeFile(inputPath, Buffer.from(input));
    await runLibreOffice(conversionArgs(inputPath, directory, inputFormat, options.output_format));

    const outputPath = await findConvertedFile(directory, options.output_format);
    return await readFileAsArrayBuffer(outputPath);
  } finally {
    await rm(directory, {
      force: true,
      recursive: true,
    });
  }
}

function conversionArgs(inputPath: string, outputDirectory: string, inputFormat: string, outputFormat: string) {
  const args = [
    `-env:UserInstallation=${pathToFileURL(join(outputDirectory, "profile")).href}`,
    "--headless",
    "--nologo",
    "--nodefault",
    "--nofirststartwizard",
  ];

  if (inputFormat === "pdf") {
    args.push("--infilter=writer_pdf_import");
  }

  args.push("--convert-to", outputFormat, "--outdir", outputDirectory, inputPath);

  return args;
}

async function runLibreOffice(args: string[]) {
  const command = process.env.REUBAH_LIBREOFFICE_COMMAND ?? "/usr/bin/soffice";
  const timeoutMs = getLibreOfficeTimeoutMs();
  const output = await spawnProcess("/bin/sh", ["-c", 'exec "$0" "$@"', command, ...args], timeoutMs).catch((error: unknown) => {
    if (isMissingCommand(error)) {
      throw new DocumentConverterError(
        503,
        "Converter unavailable",
        `LibreOffice command "${command}" is not available.`,
        "converter-unavailable",
      );
    }

    if (error instanceof ProcessTimeoutError) {
      throw new DocumentConverterError(
        504,
        "Conversion timed out",
        `LibreOffice conversion exceeded ${timeoutMs}ms.`,
        "converter-timeout",
      );
    }

    throw error;
  });

  if (output.exitCode === 126 || output.exitCode === 127) {
    throw new DocumentConverterError(
      503,
      "Converter unavailable",
      `LibreOffice command "${command}" is not available.`,
      "converter-unavailable",
    );
  }

  if (output.exitCode !== 0) {
    throw new DocumentConverterError(
      422,
      "Conversion failed",
      output.stderr.trim() || output.stdout.trim() || "Document conversion failed.",
      "conversion-failed",
    );
  }
}

function spawnProcess(command: string, args: string[], timeoutMs: number) {
  return new Promise<{ exitCode: number | null; stdout: string; stderr: string }>((resolve, reject) => {
    let child: Bun.Subprocess<"ignore", "pipe", "pipe">;

    try {
      child = Bun.spawn([command, ...args], {
        env: process.env,
        stdin: "ignore",
        stdout: "pipe",
        stderr: "pipe",
      });
    } catch (error) {
      reject(error);
      return;
    }

    let settled = false;
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new ProcessTimeoutError(timeoutMs)));
    }, timeoutMs);

    Promise.all([child.exited, streamToText(child.stdout), streamToText(child.stderr)])
      .then(([exitCode, stdout, stderr]) => {
        finish(() => {
          resolve({
            exitCode,
            stdout,
            stderr,
          });
        });
      })
      .catch((error: unknown) => {
        finish(() => reject(error));
      });

    function finish(callback: () => void) {
      if (settled) {
        return;
      }

      settled = true;
      clearTimeout(timer);
      callback();
    }
  });
}

async function streamToText(stream: ReadableStream<Uint8Array>) {
  return new Response(stream).text();
}

class ProcessTimeoutError extends Error {
  constructor(public readonly timeoutMs: number) {
    super(`Process exceeded ${timeoutMs}ms.`);
  }
}

async function findConvertedFile(directory: string, outputFormat: string) {
  const files = await readdir(directory);
  const output = files.find((file) => file.toLowerCase().endsWith(`.${outputFormat}`));

  if (!output) {
    throw new DocumentConverterError(
      422,
      "Conversion failed",
      `LibreOffice did not produce a .${outputFormat} file.`,
      "conversion-failed",
    );
  }

  return join(directory, output);
}

async function readFileAsArrayBuffer(path: string) {
  const bytes = await readFile(path);
  const copy = new Uint8Array(bytes.byteLength);
  copy.set(bytes);
  return copy.buffer;
}

function extension(filename: string) {
  const value = extname(filename).replace(/^\./, "").toLowerCase();
  return value.length > 0 ? value : null;
}

function isMissingCommand(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}
