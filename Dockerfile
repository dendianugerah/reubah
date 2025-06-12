# Build stage
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    gcc \
    g++ \
    pkgconfig \
    libwebp-dev \
    musl-dev \
    nodejs \
    npm \
    libheif-dev \
    x265-dev \
    libde265-dev \
    bash

# Copy go.mod and go.sum first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy application code and build
COPY . ./
WORKDIR /app/templates
RUN npm install && npm run build

# Go back to app directory and build the application
WORKDIR /app
RUN CGO_ENABLED=1 go build -o reubah ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    libreoffice \
    ttf-liberation \
    libwebp \
    openjdk11-jre \
    curl \
    libheif-dev \
    x265-dev \
    libde265-dev

# Create directories for LibreOffice
RUN mkdir -p /tmp/.cache /tmp/.config /tmp/.local

# Copy binary and static files
COPY --from=builder /app/reubah /app/reubah
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/static ./static

# Create non-root user
RUN addgroup -g 1000 appgroup && \
    adduser -u 1000 -G appgroup -D appuser && \
    chown -R appuser:appgroup /app /tmp/.cache /tmp/.config /tmp/.local

USER appuser

# Set environment variables for LibreOffice
ENV HOME=/tmp

EXPOSE 8081

# Add health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD curl -f http://localhost:8081/ || exit 1

CMD ["/app/reubah"]
