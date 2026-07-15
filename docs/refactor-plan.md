# Reubah Refactor Plan

## Direction

Reubah is now API-first and TypeScript-first.

```text
TanStack web app
        |
        v
TypeScript public API
        |
        v
TypeScript conversion services
  - image conversion via sharp/pdf-lib/bmp-js
  - document conversion via LibreOffice process calls

OpenAPI spec
        |
        v
API reference and future docs site
```

The old Go server and old server-rendered UI are removed from this refactor. The public API remains the product boundary.

## Goals

- Provide a public API that external users can integrate with.
- Make the web app consume the same API as external users.
- Keep route names stable and resource-oriented.
- Use OpenAPI as the source of truth for public API behavior.
- Keep conversion code separated from HTTP routing.
- Defer API keys, accounts, billing, usage tracking, rate limits, async jobs, and npm local conversion packages.

## Current Repository Shape

```text
apps/
  api/                  # Bun + Hono public API
  web/                  # TanStack Router + TanStack Query web app
packages/
  client/               # TypeScript client for the public API
openapi/
  v1.yaml               # Public API contract
docs/
  api-design.md
  api-client-plan.md
  refactor-plan.md
```

## Completed

- [x] Decide first public API scope: health, capabilities, image conversions, document conversions.
- [x] Defer API keys, accounts, billing, usage tracking, rate limits, async jobs, and multi-image PDF merge.
- [x] Create API design notes in `docs/api-design.md`.
- [x] Create OpenAPI contract in `openapi/v1.yaml`.
- [x] Scaffold Bun workspace and TypeScript API app in `apps/api`.
- [x] Add `GET /v1/health`.
- [x] Add `GET /v1/capabilities`.
- [x] Serve OpenAPI JSON at `GET /openapi.json`.
- [x] Serve Scalar API reference at `GET /reference`.
- [x] Add request ID middleware.
- [x] Add Problem Details style errors.
- [x] Add upload size guarding before multipart parsing.
- [x] Normalize malformed multipart requests into Problem Details errors.
- [x] Validate uploaded input formats before converting.
- [x] Add direct TypeScript image conversion service.
- [x] Add direct TypeScript document conversion service.
- [x] Remove old Go converter code.
- [x] Remove old server-rendered UI templates.
- [x] Remove temporary compatibility docs and tests.
- [x] Scaffold `apps/web` with TanStack Router and TanStack Query.
- [x] Rebuild image conversion UI against `POST /v1/image-conversions`.
- [x] Scaffold initial `@reubah/client` package for the public HTTP API.
- [x] Make the TanStack web app consume `@reubah/client`.
- [x] Validate client format constants against `openapi/v1.yaml`.
- [x] Add API typecheck and test commands.
- [x] Commit work in logical slices.

## Next

- [ ] Rebuild document conversion UI against `POST /v1/document-conversions`.
- [ ] Add focused fixture checks for real document conversions in an environment with LibreOffice.
- [ ] Add `apps/docs` or promote `/reference` into a standalone docs site.
- [ ] Publish `@reubah/client` when the public API shape is stable.

## Deferred

- [ ] API keys.
- [ ] Rate limiting.
- [ ] Usage tracking.
- [ ] Billing/accounts.
- [ ] Async conversion jobs.
- [ ] Multi-image PDF public API.
- [ ] Local conversion npm package such as `@reubah/core`.

## API V1

```http
GET  /v1/health
GET  /v1/capabilities
POST /v1/image-conversions
POST /v1/document-conversions
```

Public routes should not expose implementation names such as `/process`, `/process/document`, or `/v1/images/convert`.

## Conversion Services

### Image

`apps/api/src/services/image-converter.ts`

- Uses `sharp` for image decode, resize, and encode.
- Uses `pdf-lib` for image-to-PDF output.
- Uses `bmp-js` for BMP output.
- Keeps conversion errors mapped to API Problem Details.

### Document

`apps/api/src/services/document-converter.ts`

- Uses LibreOffice through a narrow process-call wrapper.
- Stores conversion files in temporary directories.
- Cleans temporary files after each request.
- Returns `503 converter-unavailable` when LibreOffice is missing.
- Returns `422 conversion-failed` when LibreOffice cannot convert a valid request.
