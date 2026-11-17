#!/usr/bin/env bash
set -euo pipefail

path=$(node -p 'const p = require("./package.json"); encodeURIComponent(p.name) + "/" + p.version')
status=$(curl --silent --show-error --output /dev/null --write-out '%{http_code}' --max-time 30 "https://registry.npmjs.org/$path")
case "$status" in
  200) echo 'This version is already published.' ;;
  404) npm publish --access public --provenance --ignore-scripts --tag "$DIST_TAG" ;;
  *) printf 'npm registry lookup failed (HTTP %s).\n' "$status" >&2; exit 1 ;;
esac
