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
    libheif-dev \
    x265-dev \
    libde265-dev \
    bash

# Copy go.mod and go.sum first to leverage Docker cache
COPY go.mod go.sum ./
RUN go mod download

# Copy application code and build
COPY . ./
RUN CGO_ENABLED=1 go build -o reubah ./cmd/server

# Runtime stage
FROM alpine:3.19

WORKDIR /app

# Install runtime dependencies
RUN apk add --no-cache \
    bash \
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

# Copy binary
COPY --from=builder /app/reubah /app/reubah

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
  CMD curl -f http://localhost:8081/health || exit 1

CMD ["/app/reubah"]
