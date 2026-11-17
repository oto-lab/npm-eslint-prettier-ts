#!/usr/bin/env bash
set -euo pipefail

case "$PACKAGE_MANAGER" in
  npm)
    if [[ -f package-lock.json ]]; then
      npm ci
    else
      npm install --no-package-lock
    fi
    ;;
  pnpm) pnpm install --frozen-lockfile ;;
  yarn)
    if grep -Fq '# yarn lockfile v1' yarn.lock; then
      yarn install --frozen-lockfile
    else
      yarn install --immutable
    fi
    ;;
  bun) bun install --frozen-lockfile ;;
  *) printf 'Unsupported package manager: %s\n' "$PACKAGE_MANAGER" >&2; exit 1 ;;
esac
