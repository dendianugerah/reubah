FROM oven/bun:1.3.8-debian AS build-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile

FROM build-deps AS web-build

COPY apps/web apps/web

ARG VITE_REUBAH_API_URL=http://localhost:8788
ENV VITE_REUBAH_API_URL=$VITE_REUBAH_API_URL

RUN bun run web:build

FROM oven/bun:1.3.8-debian AS api-deps

WORKDIR /app

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.8-debian AS api-runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fonts-liberation \
    libreoffice \
  && groupadd --system reubah \
  && useradd --system --gid reubah --home-dir /tmp --shell /usr/sbin/nologin reubah \
  && rm -rf /var/lib/apt/lists/*

COPY --from=api-deps /app /app
COPY apps/api apps/api
COPY openapi openapi

RUN chown -R reubah:reubah /app

ENV NODE_ENV=production
ENV PORT=8787
ENV HOME=/tmp
ENV REUBAH_LIBREOFFICE_COMMAND=/usr/bin/soffice
ENV REUBAH_LIBREOFFICE_TIMEOUT_MS=120000

EXPOSE 8787

USER reubah

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8787/v1/health || exit 1

STOPSIGNAL SIGTERM

CMD ["bun", "run", "api:start"]

FROM oven/bun:1.3.8-debian AS web-runtime

WORKDIR /app/apps/web

RUN groupadd --system reubah \
  && useradd --system --gid reubah --home-dir /tmp --shell /usr/sbin/nologin reubah

COPY apps/web/server.ts server.ts
COPY --from=web-build /app/apps/web/dist dist

RUN chown -R reubah:reubah /app

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

USER reubah

HEALTHCHECK --interval=30s --timeout=3s \
  CMD bun -e 'fetch("http://localhost:3000/healthz").then((response) => process.exit(response.ok ? 0 : 1)).catch(() => process.exit(1))'

STOPSIGNAL SIGTERM

CMD ["bun", "server.ts"]
