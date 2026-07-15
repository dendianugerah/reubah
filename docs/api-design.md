# Reubah API Design

## Scope

This document defines the public API direction for the first refactor pass. It covers phases 1-5 only:

1. API contract
2. TypeScript API shell
3. Existing converter bridge
4. TanStack web app
5. Docs site

Authentication, API keys, billing, usage limits, and account dashboards are intentionally deferred.

## API Principles

- Use `/v1` from the first public contract.
- Use resource-oriented endpoint names, not UI or handler names.
- Keep routes stable even if conversion internals move from Go to TypeScript.
- Make the web app consume the same public API documented for external users.
- Return binary files directly for synchronous conversions.
- Use `application/problem+json` for errors.
- Include `X-Request-ID` on every response.
- Keep multipart field names consistent across endpoints.
- Keep public request names snake_case to fit common HTTP API conventions.
- Keep implementation concerns out of route names.

## Route Naming

Use nouns for conversion resources:

```http
GET  /v1/health
GET  /v1/capabilities
POST /v1/image-conversions
POST /v1/document-conversions
```

Avoid these shapes for the public API:

```http
POST /process
POST /process/document
POST /v1/images/convert
POST /v1/convert-document
```

The old names are implementation or action names. The new names represent resources being created:

- `image-conversions`: a conversion result from an uploaded image.
- `document-conversions`: a conversion result from an uploaded document.

## Endpoint Responsibilities

### `GET /v1/health`

Runtime health check. Used by local development, deployments, and uptime monitoring.

### `GET /v1/capabilities`

Returns supported formats, option enums, and limits. The web app should use this endpoint instead of hardcoding support matrices once the API is available.

### `GET /openapi.json`

Returns the canonical `openapi/v1.yaml` contract as JSON. This is useful for docs, SDK generation, contract tests, and API clients.

### `GET /reference`

Serves a Scalar API reference page backed by `/openapi.json`.

### `POST /v1/image-conversions`

Converts a single uploaded image.

Request:

- Multipart form data.
- Required `file`.
- Required `output_format`.
- Optional `quality`, `width`, `height`, `resize_mode`, `optimize`.

Response:

- `200 OK`
- Binary file body.
- `Content-Type` matches output format.
- `Content-Disposition` provides download filename.

### `POST /v1/document-conversions`

Converts a single uploaded document.

Request:

- Multipart form data.
- Required `file`.
- Required `output_format`.

Response:

- `200 OK`
- Binary file body.
- `Content-Type` matches output format.
- `Content-Disposition` provides download filename.

## Multipart Field Names

Use the same field names everywhere:

```text
file              Single uploaded file
output_format     Desired output format
quality           Quality preset or integer, depending on endpoint
width             Target image width
height            Target image height
resize_mode       fit, fill, stretch
optimize          true or false
```

Do not expose old field names such as `image`, `document`, or `format` in the new public API.

## Error Format

Use Problem Details style errors.

```json
{
  "type": "https://docs.reubah.com/errors/unsupported-format",
  "title": "Unsupported format",
  "status": 400,
  "detail": "Conversion from docx to heic is not supported.",
  "request_id": "req_123"
}
```

Recommended status codes:

- `400 Bad Request`: malformed request, missing field, unsupported format, invalid options.
- `413 Payload Too Large`: uploaded file exceeds the current limit.
- `415 Unsupported Media Type`: uploaded file type is not accepted.
- `422 Unprocessable Entity`: conversion request is valid but processing failed.
- `500 Internal Server Error`: unexpected system failure.
- `503 Service Unavailable`: converter dependency is unavailable.

## Examples

Convert an image:

```bash
curl -X POST http://localhost:8081/v1/image-conversions \
  -F "file=@photo.png" \
  -F "output_format=webp" \
  -F "quality=high" \
  --output photo.webp
```

Convert a document:

```bash
curl -X POST http://localhost:8081/v1/document-conversions \
  -F "file=@report.docx" \
  -F "output_format=pdf" \
  --output report.pdf
```

## Deferred Authentication

No API keys in phases 1-5.

The API should still be designed so auth can be added later without breaking routes. Future auth should be additive:

```http
Authorization: Bearer rb_live_xxx
```

## NPM Package Direction

First npm package should be a client SDK for the public API:

```ts
import { Reubah } from "@reubah/client"

const reubah = new Reubah({ baseUrl: "https://api.reubah.com" })

const result = await reubah.imageConversions.create(file, {
  outputFormat: "webp",
  quality: "high",
})
```

This SDK should wrap the HTTP API. It should not be the initial conversion engine.

A local conversion package can be evaluated later:

```ts
import { convertImage } from "@reubah/core"
```

That package has different constraints because users would need local native dependencies for some conversions.

## OpenAPI Source Of Truth

The initial public contract lives in:

```text
openapi/v1.yaml
```

The OpenAPI file should power:

- API reference docs.
- Contract tests.
- TypeScript client generation.
- Example requests in docs.
- Future SDKs.

## Separation Of Concerns

Public API app:

- Routing
- Validation
- Error shaping
- Request IDs
- File limits
- OpenAPI alignment
- Calls conversion layer

Conversion layer:

- Image processing
- Document conversion
- Native dependencies
- Temp files
- Timeouts and cleanup

Web app:

- User flows
- Upload UI
- Client-side validation for better UX
- Calls public `/v1` API only

Docs app:

- Guides
- Examples
- API reference
- SDK documentation

Do not let the web app or docs app depend on converter internals.
