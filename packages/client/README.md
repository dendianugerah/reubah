# @reubah/client

Typed HTTP client for the Reubah public API.

This package wraps the `/v1` HTTP API. It does not bundle local converters, native dependencies, API keys, accounts, billing, or rate limiting.

## Usage

```ts
import { createReubahClient } from "@reubah/client";

const reubah = createReubahClient({
  baseUrl: "https://api.reubah.com",
});

const result = await reubah.imageConversions.create({
  file,
  outputFormat: "webp",
  quality: "high",
  optimize: true,
});

const bytes = await result.arrayBuffer();
```

## Development

```bash
bun run client:typecheck
bun run client:test
bun run client:build
```
