# Bridge Process Model

## Decision

During the bridge phase, Reubah runs as two internal processes:

```text
Public TypeScript API  ->  Internal Go legacy converter
apps/api               ->  cmd/server
```

The TypeScript API is the public HTTP boundary for new clients. The Go server remains an internal conversion backend until conversion logic is extracted or replaced.

## Why This Model

- It keeps the new public API contract stable while preserving existing conversion behavior.
- It avoids rewriting image and document conversion at the same time as the API and frontend refactor.
- It creates a clear boundary where field names, errors, and response headers can be normalized.
- It lets the TanStack web app target `/v1` immediately.

## Runtime Shape

Development:

```text
http://localhost:8787  TypeScript API
http://localhost:8081  Go legacy server
```

Production bridge phase:

```text
External users/browser
        |
        v
TypeScript API container/process
        |
        v
Go converter container/process on private network
```

Only the TypeScript API should be exposed publicly in the bridge phase. The Go converter should be private.

## Configuration

The TypeScript API reads the legacy converter URL from:

```text
REUBAH_LEGACY_API_URL
```

Default:

```text
http://localhost:8081
```

## Contract Boundary

Public request fields:

```text
file
output_format
quality
width
height
resize_mode
optimize
```

Legacy Go fields stay private:

```text
image
document
format
resizeMode
```

The TypeScript API owns translation between the two.

## Deletion Gates

Do not delete `cmd/server`, `internal/handlers`, or `templates` while this bridge is active.

Safe deletion can happen only after one of these is true:

- The TypeScript API calls extracted Go converter code without using legacy HTTP routes.
- The relevant converter has been rewritten and validated in TypeScript.
- A separate converter service replaces the current Go server.

## Later Options

### Option A: Extract Go Converter Service

Move conversion-only routes into a private Go service and remove the server-rendered UI.

Best when:

- Go remains the strongest conversion runtime.
- We want a small private converter process.
- We want minimal conversion behavior changes.

### Option B: Rewrite Specific Converters In TypeScript

Move image conversion to libraries like `sharp`, and keep document conversion isolated behind LibreOffice.

Best when:

- TypeScript replacement quality matches current behavior.
- Operational simplicity improves.
- Fixture tests prove output compatibility.

### Option C: Queue-Based Workers

Introduce jobs and worker queues later.

Best when:

- Conversion time becomes too long for synchronous requests.
- We need retries, progress, cancellation, or usage metering.
- API keys/accounts exist.

This is deferred from phases 1-5.
