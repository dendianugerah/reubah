# Reubah

Reubah is an API-first file conversion project with a Bun + Hono API, a TanStack web app, and an OpenAPI contract.

## Features

- Public REST API for image and document conversion
- Scalar API reference served from the OpenAPI contract
- TypeScript client package for the public API
- TanStack Router and TanStack Query web app
- Direct image conversion with `sharp`, `pdf-lib`, and `bmp-js`
- Direct document conversion through LibreOffice

## Quick Start

### Docker

```bash
git clone https://github.com/dendianugerah/reubah.git
cd reubah
docker-compose up -d
```

API:

```text
http://localhost:8787
```

API reference:

```text
http://localhost:8787/reference
```

### Local Development

Requirements:

- Bun
- LibreOffice for document conversion

```bash
bun install
bun run api:dev
```

Run the web app in a second terminal:

```bash
bun run web:dev
```

## API

```http
GET  /v1/health
GET  /v1/capabilities
POST /v1/image-conversions
POST /v1/document-conversions
GET  /openapi.json
GET  /reference
```

The canonical contract lives at `openapi/v1.yaml`.

## Format Support

Image inputs:

```text
jpg, jpeg, png, webp, gif, bmp, heic, heif
```

Image outputs:

```text
jpg, jpeg, png, webp, gif, bmp, heic, heif, pdf
```

Document inputs and outputs:

```text
pdf, doc, docx, odt, rtf, txt
```

## Commands

```bash
bun run check
bun run api:test
bun run api:typecheck
bun run web:typecheck
bun run client:test
```

## Notes

- Files are processed synchronously and returned directly.
- Temporary document conversion files are cleaned up after each request.
- Document conversions use isolated LibreOffice profiles per request.
- Missing LibreOffice returns `503 converter-unavailable`.
- Slow LibreOffice conversions are killed after `REUBAH_LIBREOFFICE_TIMEOUT_MS`, defaulting to 120 seconds.
- API keys, accounts, billing, usage tracking, rate limits, async jobs, and npm local conversion packages are deferred.

## License

This project is licensed under the [MIT License](LICENSE).
