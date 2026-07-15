# Bridge Development Runbook

This runbook is for the temporary bridge phase where the TypeScript public API calls the existing Go server for conversion work.

## Processes

Run two processes during local development:

```text
Go legacy server      http://localhost:8081
TypeScript API        http://localhost:8787
```

The TypeScript API bridges:

```http
POST /v1/image-conversions     -> http://localhost:8081/process
POST /v1/document-conversions  -> http://localhost:8081/process/document
```

## Prerequisites

Go server:

- Go 1.22+
- LibreOffice for document conversion
- `pkg-config`
- HEIF/libheif development libraries
- GCC/G++

TypeScript API:

- Bun

## Start The Legacy Server

Terminal 1:

```bash
bun run legacy:dev
```

The legacy server defaults to:

```text
http://localhost:8081
```

## Start The TypeScript API

Terminal 2:

```bash
bun run api:dev
```

The TypeScript API defaults to:

```text
http://localhost:8787
```

If the legacy server is not on `8081`, override the bridge target:

```bash
REUBAH_LEGACY_API_URL=http://localhost:8081 bun run api:dev
```

The API forwards `X-Request-ID` to the legacy server and waits up to 120 seconds for each upstream conversion. Override the timeout when testing slow local converters:

```bash
REUBAH_LEGACY_API_TIMEOUT_MS=180000 bun run api:dev
```

If the API port is occupied:

```bash
PORT=17982 bun run api:start
```

## Smoke Checks

Health:

```bash
curl -i http://localhost:8787/v1/health
```

Capabilities:

```bash
curl -i http://localhost:8787/v1/capabilities
```

OpenAPI:

```bash
curl -i http://localhost:8787/openapi.json
```

API reference:

```text
http://localhost:8787/reference
```

Image conversion:

```bash
curl -X POST http://localhost:8787/v1/image-conversions \
  -F "file=@static/assets/home.png" \
  -F "output_format=webp" \
  -F "quality=high" \
  --output /tmp/reubah-home.webp
```

Document conversion requires a real local document fixture. Example:

```bash
curl -X POST http://localhost:8787/v1/document-conversions \
  -F "file=@/path/to/report.docx" \
  -F "output_format=pdf" \
  --output /tmp/reubah-report.pdf
```

## Automated Checks

```bash
bun run check
```

This runs the TypeScript API typecheck and tests. It does not start the Go server or run real conversion fixtures yet.

## Bridge Integration Tests

Start the legacy Go server first:

```bash
bun run legacy:dev
```

Then run the opt-in bridge integration tests:

```bash
bun run api:test:integration
```

These tests send real fixture files through the TypeScript API and expect the existing Go conversion endpoints to respond successfully.

## Known Local Failure

If `go test ./...` fails with a `pkg-config` error, install `pkg-config` and the HEIF development libraries for your platform. The current Go image processor depends on libheif through CGO.

## Deletion Rule

Do not delete the old Go routes or template UI during the bridge phase. The TypeScript API still depends on the Go conversion routes, and the TanStack web app has not replaced the server-rendered UI yet.
