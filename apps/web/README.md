# Reubah Web

TanStack React web app for Reubah.

## Commands

Run from the repository root:

```bash
bun run web:dev
bun run web:typecheck
bun run web:build
```

## API Target

The app reads the public API base URL from:

```text
VITE_REUBAH_API_URL
```

Default:

```text
http://localhost:8787
```

Local bridge setup:

```bash
bun run legacy:dev
bun run api:dev
bun run web:dev
```

## Current Scope

The scaffold currently verifies API connectivity and renders supported image/document capabilities. The image and document conversion workflows are the next implementation slices.
