import { afterEach, describe, expect, test } from "bun:test";

import { convertImageWithLegacyApi, LegacyConverterError } from "./services/legacy-converter";

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe("legacy converter bridge", () => {
  test("maps upstream timeouts to converter timeout errors", async () => {
    globalThis.fetch = (async (input, init) => {
      void input;

      await new Promise<void>((_resolve, reject) => {
        const signal = init?.signal;
        expect(signal).toBeDefined();

        const rejectWithAbort = () => {
          const error = new Error("The operation was aborted.");
          error.name = "AbortError";
          reject(error);
        };

        if (signal?.aborted) {
          rejectWithAbort();
          return;
        }

        signal?.addEventListener("abort", rejectWithAbort, {
          once: true,
        });
      });

      return new Response("unexpected response", {
        status: 500,
      });
    }) as typeof fetch;

    try {
      await convertImageWithLegacyApi(
        new File(["image-bytes"], "photo.png", {
          type: "image/png",
        }),
        {
          output_format: "webp",
        },
        {
          requestId: "req_timeout",
          timeoutMs: 1,
        },
      );

      throw new Error("Expected the legacy converter request to time out.");
    } catch (error) {
      expect(error).toBeInstanceOf(LegacyConverterError);
      expect(error).toMatchObject({
        status: 504,
        title: "Converter timeout",
        type: "converter-timeout",
        detail: "The converter did not respond within 1 ms.",
      });
    }
  });
});
