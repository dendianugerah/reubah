# Reubah API Client Plan

## Decision

Create `@reubah/client` after the first API contract stabilizes. The package should be a thin TypeScript wrapper around the public HTTP API, not a local conversion engine.

Keep local/offline conversion as a separate future package, such as `@reubah/core`, if the project later exposes native or pure TypeScript converters.

## Goals

- Give API users a typed npm package without forcing them to hand-build multipart requests.
- Keep `openapi/v1.yaml` as the source of truth for routes, formats, and error shapes.
- Support Browser, Node.js, and Bun runtimes through standard `fetch`, `File`, `Blob`, and `FormData`.
- Keep the first client auth-free, matching the current API scope.
- Preserve clear REST names from the HTTP API while offering idiomatic TypeScript method names.

## Non-Goals

- Do not bundle converter binaries or native image/document dependencies.
- Do not introduce API keys, accounts, billing, or usage tracking in the first client.
- Do not couple the client to TanStack, React, or the web app.
- Do not hide the public HTTP API behind UI-specific names.

## Proposed Package Shape

```text
packages/client/
  package.json
  tsconfig.json
  src/
    index.ts
    client.ts
    errors.ts
    multipart.ts
    types.ts
  test/
    client.test.ts
```

## Public API

```ts
import { createReubahClient } from "@reubah/client";

const reubah = createReubahClient({
  baseUrl: "https://api.reubah.com",
});

const capabilities = await reubah.capabilities.get();

const result = await reubah.imageConversions.create({
  file,
  outputFormat: "webp",
  quality: "high",
  resizeMode: "fit",
  optimize: true,
});

const bytes = await result.arrayBuffer();
```

Client method names should be camelCase, but wire fields stay snake_case:

```text
outputFormat -> output_format
resizeMode   -> resize_mode
```

## Result Shape

Conversion calls should return a small response wrapper:

```ts
type ConversionResult = {
  response: Response;
  contentType: string;
  filename: string | null;
  blob(): Promise<Blob>;
  arrayBuffer(): Promise<ArrayBuffer>;
};
```

This keeps binary handling flexible for browsers, Node.js, Bun, and future CLI usage.

## Error Shape

Non-2xx API responses should throw `ReubahApiError`:

```ts
type ReubahApiError = Error & {
  status: number;
  requestId: string | null;
  problem: {
    type: string;
    title: string;
    status: number;
    detail: string;
    request_id?: string;
  };
};
```

Transport failures should throw `ReubahNetworkError` so callers can distinguish API validation failures from connectivity failures.

## Configuration

Initial config:

```ts
type ReubahClientOptions = {
  baseUrl?: string;
  fetch?: typeof fetch;
  headers?: HeadersInit | (() => HeadersInit | Promise<HeadersInit>);
};
```

The `headers` option is enough for future API keys or bearer tokens without adding auth concepts before the product needs them.

## Test Gates

- Mocked `fetch` tests for every route.
- Multipart field-name tests for image and document conversions.
- Problem Details parsing tests.
- Binary response filename and content-type tests.
- Type tests for supported formats generated from or aligned with `openapi/v1.yaml`.

## Release Gates

- `POST /v1/image-conversions` and `POST /v1/document-conversions` are stable enough for external users.
- OpenAPI contract has examples for success and error responses.
- API docs include client installation and usage examples.
- Package has no native dependencies.
- Package can be used by the web app, but the web app does not block the package release.
