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

Local setup:

```bash
bun run api:dev
bun run web:dev
```

## Current Scope

The app verifies API connectivity, renders supported capabilities, and posts image conversions through the public API. Document conversion UI is the next implementation slice.
