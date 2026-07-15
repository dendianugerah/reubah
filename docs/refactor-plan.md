# Reubah Refactor Plan

## Decision Summary

Refactor Reubah into an API-first product with a TypeScript developer experience, while avoiding a risky full rewrite of the conversion engine on day one.

Recommended target:

```text
TanStack web app
        |
        v
TypeScript public API
        |
        v
Conversion workers
  - current Go engine first
  - TypeScript workers where the ecosystem is stronger

OpenAPI spec
        |
        v
Docs site, API reference, generated clients
```

This gives the product a clean public API boundary, modern docs, shared TypeScript types, and room to migrate conversion internals gradually.

## Goals

- Provide a public API that external users can integrate with.
- Make the web app consume the same API as external users.
- Add a separate documentation site with guides and API reference.
- Use OpenAPI as the source of truth for public API behavior.
- Move frontend and developer-facing surfaces to TypeScript.
- Preserve existing conversion functionality during migration.
- Keep the conversion engine isolated so heavy/native dependencies do not leak into app code.

## Non-Goals

- Do not rewrite every converter before shipping the new API.
- Do not make the first refactor depend on billing, accounts, or async jobs unless needed for launch.
- Do not couple public API behavior to UI-only TanStack route implementation.
- Do not remove Go until each equivalent TypeScript/native replacement has been tested against real files.

## Current State

- Go server serves HTML templates and static assets.
- Go routes handle image processing, document conversion, and PDF merge.
- Document conversion shells out to LibreOffice.
- Frontend uses Alpine, Tailwind, and plain JavaScript.
- TypeScript API shell exists in `apps/api`.
- Public contract exists in `openapi/v1.yaml`.
- Local API reference is served at `/reference` from `/openapi.json`.
- TypeScript API bridges image and document conversions to the existing Go routes.
- No TanStack web app exists yet.
- No standalone docs site exists yet.

## Execution Checklist

Use this as the working tracker. Keep commits small and update this list as each slice lands.

### Completed

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
- [x] Bridge `POST /v1/image-conversions` to existing Go `POST /process`.
- [x] Bridge `POST /v1/document-conversions` to existing Go `POST /process/document`.
- [x] Add API typecheck and test commands.
- [x] Commit work in logical slices.

### Next

- [x] Add an end-to-end dev runbook for running Go legacy server plus TypeScript API together.
- [x] Add contract consistency tests that compare implemented API responses with `openapi/v1.yaml`.
- [x] Add sample fixture files and integration tests for real image/document conversions.
- [x] Decide deployment/process model for the bridge phase: two processes, sidecar, or direct worker extraction.
- [x] Scaffold `apps/web` with TanStack Router and TanStack Query.
- [ ] Rebuild image conversion UI against `POST /v1/image-conversions`.
- [ ] Rebuild document conversion UI against `POST /v1/document-conversions`.
- [ ] Add `apps/docs` or promote `/reference` into a standalone docs site.
- [ ] Plan initial `@reubah/client` package.

### Deletion Gates

Do not delete old code until the matching gate is complete.

- [ ] Delete old image form/template code only after TanStack image workflow works through `/v1/image-conversions`.
- [ ] Delete old document form/template code only after TanStack document workflow works through `/v1/document-conversions`.
- [ ] Delete old batch/PDF merge UI only after deciding whether multi-image PDF belongs in public API v1 or a later workflow.
- [ ] Delete old Go HTTP routes only after TypeScript API no longer bridges to `POST /process` and `POST /process/document`.
- [ ] Delete Go conversion internals only after replacement converters have fixture-based quality and performance evidence.

### Deferred

- [ ] API keys.
- [ ] Rate limiting.
- [ ] Usage tracking.
- [ ] Billing/accounts.
- [ ] Async conversion jobs.
- [ ] Multi-image PDF public API.
- [ ] Local conversion npm package such as `@reubah/core`.

## Target Repository Shape

Short-term shape with minimal churn:

```text
cmd/
  api/                  # New TypeScript API may live elsewhere; Go can remain here during transition
  server/               # Current Go server, eventually deprecated or converted into worker service
internal/
  processor/            # Current Go conversion engine
  validator/
pkg/
apps/
  web/                  # TanStack Router or TanStack Start app
  docs/                 # Docs site
packages/
  api-client/           # Generated or hand-authored TypeScript client
  shared/               # Shared schemas, constants, API helpers
openapi/
  v1.yaml               # Public API contract
docs/
  refactor-plan.md
```

Cleaner long-term shape:

```text
apps/
  web/                  # User-facing web app
  docs/                 # Public docs site
  api/                  # Public TypeScript API
services/
  converter-go/         # Existing Go engine as worker/service
  converter-ts/         # TypeScript/native conversion workers over time
packages/
  shared/
  api-client/
  openapi/
```

## Architecture Direction

### Public API

Use a TypeScript API server for the public product boundary.

Good candidates:

- Hono
- Fastify
- Elysia, especially if the project standardizes on Bun

The API server should own:

- API versioning
- Request validation
- OpenAPI generation or spec validation
- Request IDs
- Error format
- Upload size limits
- Routing to conversion workers

Authentication, rate limiting, usage tracking, and billing are deferred until after phases 1-5.

### Web App

Use TypeScript + React + TanStack.

Recommended:

- TanStack Router for route structure and URL state.
- TanStack Query for conversion requests, upload state, retries, and polling.
- TanStack Form only if form complexity grows.
- TanStack Start only if SSR/server functions become useful for the web app.

The web app should not call private conversion functions directly. It should call the same `/v1` API used by external users.

### Docs Site

Use a docs framework for narrative docs plus an OpenAPI renderer for the reference.

Good candidates:

- Fumadocs + Scalar
- Astro/Starlight + Scalar
- Mintlify
- Redocly

Docs should include:

- Quickstart
- API overview
- Errors
- File limits
- Supported formats
- Image conversion guide
- Document conversion guide
- API reference generated from OpenAPI
- SDK examples

### Conversion Layer

Keep conversion work behind a worker/service boundary.

Initial implementation:

- Keep existing Go conversion engine.
- Expose it internally to the TypeScript API through HTTP, local process calls, queue jobs, or a narrow RPC-style interface.
- Treat this as an implementation detail, not part of the public API contract.

Gradual TypeScript migration:

- Move image conversion to `sharp` where it matches or improves current functionality.
- Treat multi-image PDF merge as a future workflow after image and document conversions are stable.
- Keep LibreOffice-based document conversion isolated, whether called from Go or Node, because TypeScript wrappers still depend on LibreOffice.

## API V1 Draft

Base path:

```text
/v1
```

Initial endpoints:

```http
GET  /v1/health
GET  /v1/capabilities
POST /v1/image-conversions
POST /v1/document-conversions
```

Future endpoints:

```http
POST /v1/jobs
GET  /v1/jobs/{job_id}
GET  /v1/jobs/{job_id}/result
GET  /v1/usage
GET  /v1/me
```

### Route Naming

Use noun-based resource names for public routes:

```text
image-conversions      A converted image result
document-conversions   A converted document result
```

Avoid exposing old implementation names such as `/process`, `/process/document`, or `/v1/images/convert`.

### Authentication

No API keys in phases 1-5.

The public contract should still leave room for additive authentication later:

```http
Authorization: Bearer rb_live_xxx
```

Adding this later should not require route renames or request-body changes.

### Response Model

For fast conversions:

- Return the converted file directly.
- Set `Content-Type`.
- Set `Content-Disposition`.
- Set `X-Request-ID`.

For future async conversions:

- Return `202 Accepted`.
- Return a job ID.
- Let clients poll the job endpoint.

### Error Format

Use one consistent JSON error shape.

Preferred:

```json
{
  "type": "https://docs.reubah.com/errors/unsupported-format",
  "title": "Unsupported format",
  "status": 400,
  "detail": "Conversion from docx to heic is not supported.",
  "request_id": "req_123"
}
```

### Deferred Rate Limit Headers

Add these after API keys and usage tracking exist:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 83
X-RateLimit-Reset: 1721040000
```

## OpenAPI Plan

Create and maintain `openapi/v1.yaml` before implementing the new API.

The spec should define:

- Multipart upload request bodies
- Binary file responses
- Supported error responses
- Format enums
- File size limits
- Request ID header

The initial spec intentionally does not define an auth scheme or rate limit headers.

The spec should power:

- API reference docs
- Contract tests
- TypeScript client generation
- Example requests
- Future SDKs

## Migration Phases

### Phase 1: API Contract

- Create `openapi/v1.yaml`.
- Create `docs/api-design.md`.
- Define stable endpoint names and request/response formats.
- Use noun-based REST resource names.
- Keep all phase 1-5 endpoints synchronous.
- Explicitly defer API keys, accounts, billing, and rate limits.
- Add example requests and responses.

Exit criteria:

- API shape can be reviewed without reading implementation code.
- Public route names are independent of implementation details.
- Docs can render an initial API reference from the spec.

Status: complete.

### Phase 2: TypeScript API Shell

- Create the TypeScript API app.
- Add `/v1/health`.
- Add `/v1/capabilities`.
- Serve `openapi/v1.yaml` at `/openapi.json`.
- Serve local API reference docs at `/reference`.
- Add request ID middleware.
- Add common error handling.
- Add upload parsing and size limits.
- Add OpenAPI validation or generation pipeline.

Exit criteria:

- API app boots locally.
- OpenAPI and implementation agree for at least the health endpoint.
- Errors use the new standard shape.

Status: mostly complete. Remaining work is stronger contract consistency testing and upload-size enforcement before multipart parsing.

### Phase 3: Bridge Existing Conversion Engine

- Connect TypeScript API endpoints to the current Go conversion code.
- Keep behavior equivalent to the existing app.
- Preserve current format support.
- Add integration tests using sample files.

Exit criteria:

- `/v1/image-conversions` and `/v1/document-conversions` work through the new public API.
- Existing frontend could be replaced without losing conversion functionality.

Status: implemented as a legacy HTTP bridge. Remaining work is fixture-based integration testing against the actual Go server.

### Phase 4: TanStack Web App

- Create the new web app.
- Rebuild image and document conversion workflows first.
- Keep batch image conversion only if it cleanly uses `/v1/image-conversions`.
- Use TanStack Query mutations for conversion calls.
- Use the public `/v1` API.
- Remove direct dependency on server-rendered Go templates.
- Defer multi-image PDF merge from the first TanStack rebuild.

Exit criteria:

- New web app supports image and document conversion flows.
- Users can complete the two initial public API workflows.
- UI and external API share the same backend contract.

### Phase 5: Docs Site

- Create docs app.
- Publish quickstart, overview, limits, errors, and guides.
- Render API reference from `openapi/v1.yaml`.
- Add curl and TypeScript examples.
- Add an initial `@reubah/client` plan or package scaffold if the API contract is stable.

Exit criteria:

- A new developer can convert a file by following docs only.
- API reference stays synced with OpenAPI.
- Docs clearly explain that API keys are not part of the initial public contract.

### Phase 6: Hardening

- Add API keys.
- Add rate limiting.
- Add usage tracking.
- Add structured logging.
- Add request metrics.
- Add timeout controls.
- Add worker isolation for untrusted files.
- Add security checks for file uploads and temp file cleanup.

Exit criteria:

- Public API is safe enough for external beta users.
- Failures are observable and debuggable.

### Phase 7: Conversion Engine Evaluation

- Benchmark current Go image processing vs TypeScript `sharp`.
- Benchmark current PDF merge vs TypeScript PDF libraries only when multi-image PDF becomes part of the public API.
- Compare document conversion behavior in Go vs Node LibreOffice wrappers.
- Move individual converters only when TypeScript replacement is equal or better.

Exit criteria:

- Each migration has quality, performance, and failure-mode evidence.
- Go can be reduced gradually instead of removed by assumption.

## Initial Technology Choice

Recommended first implementation:

```text
apps/api       TypeScript API server, Hono or Fastify
apps/web       TanStack Router + React + TanStack Query
apps/docs      Fumadocs or Astro/Starlight + Scalar
openapi/v1.yaml
services/go    Existing Go converter kept as internal worker/service
```

Avoid using TanStack Start as the public API boundary at first. It can still be used for the web app if SSR becomes important, but the public API should have explicit API-server concerns.

First npm package should be `@reubah/client`, a TypeScript SDK for the HTTP API. A local conversion package such as `@reubah/core` should be evaluated later because it has native dependency implications.

## Key Risks

- Document conversion still depends on LibreOffice regardless of Go or TypeScript.
- File conversion requests can be slow and memory-heavy.
- Public upload APIs need strict limits and isolation.
- A full rewrite could break format support before the API is ready.
- Generated OpenAPI can drift if there is no contract check in CI.

## Open Decisions

- Hono is selected for the first TypeScript API shell.
- TanStack Router SPA vs TanStack Start for the web app.
- Fumadocs vs Astro/Starlight vs Mintlify for docs.
- Whether `@reubah/client` is generated from OpenAPI or hand-authored first.
- Bridge phase currently uses HTTP to existing Go routes.
- Long-term conversion workers may communicate over HTTP, queue, or direct process boundary.
- Deployment target and container strategy.

## Suggested Next Step

Add a dev runbook and integration-test path for running the existing Go server plus the TypeScript API together. After that, scaffold `apps/web` and rebuild the image/document workflows against `/v1`.

## References

- OpenAPI: https://www.openapis.org
- TanStack Start: https://tanstack.com/start/latest
- TanStack Router: https://tanstack.com/router/latest
- TanStack Query: https://tanstack.com/query/latest
- sharp: https://sharp.pixelplumbing.com
- libreoffice-convert: https://github.com/elwerene/libreoffice-convert
- Scalar: https://scalar.com
- Swagger UI: https://swagger.io/open-source/swagger-ui
- Redocly: https://redocly.com/redoc
