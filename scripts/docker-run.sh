#!/usr/bin/env bash
set -euo pipefail

docker compose up --detach --build "$@"
docker compose ps
