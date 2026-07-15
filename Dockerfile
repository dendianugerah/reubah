FROM oven/bun:1-debian

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    ca-certificates \
    curl \
    fonts-liberation \
    libreoffice \
  && rm -rf /var/lib/apt/lists/*

COPY package.json bun.lock ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/client/package.json packages/client/package.json

RUN bun install --frozen-lockfile

COPY . .

ENV NODE_ENV=production
ENV PORT=8787
ENV HOME=/tmp

EXPOSE 8787

HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8787/v1/health || exit 1

CMD ["bun", "run", "api:start"]
