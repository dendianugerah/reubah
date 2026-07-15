# Reubah API

TypeScript public API shell for Reubah.

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

## Implemented Routes

```http
GET /v1/health
GET /v1/capabilities
GET /openapi.json
GET /reference
```

The conversion endpoints are reserved in `openapi/v1.yaml` and will be wired to the conversion layer next:

```http
POST /v1/image-conversions
POST /v1/document-conversions
```

## Contract Source

The canonical OpenAPI contract is:

```text
openapi/v1.yaml
```

The API serves that same contract as JSON at `/openapi.json`, and Scalar renders it at `/reference`.
