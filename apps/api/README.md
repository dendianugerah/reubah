# Reubah API

TypeScript public API for Reubah.

## Commands

Run from the repository root:

```bash
bun run api:dev
bun run api:test
bun run api:typecheck
```

Run on a custom port:

```bash
PORT=17982 bun run api:start
```

## Routes

```http
GET /v1/health
GET /v1/capabilities
POST /v1/image-conversions
POST /v1/document-conversions
GET /openapi.json
GET /reference
```

## Conversion Runtime

Image conversions run in the API process through `sharp`, `pdf-lib`, and `bmp-js`.

Document conversions run in the API process through LibreOffice. By default the API calls `soffice`; override the executable when needed:

```bash
REUBAH_LIBREOFFICE_COMMAND=/path/to/soffice bun run api:start
```

LibreOffice conversions time out after 120 seconds by default. Override that with:

```bash
REUBAH_LIBREOFFICE_TIMEOUT_MS=180000 bun run api:start
```

## Contract Source

The canonical OpenAPI contract is:

```text
openapi/v1.yaml
```

The API serves that same contract as JSON at `/openapi.json`, and Scalar renders it at `/reference`.
