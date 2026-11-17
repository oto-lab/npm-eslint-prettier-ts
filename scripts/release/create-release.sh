#!/usr/bin/env bash
set -euo pipefail

if gh release view "$TAG" >/dev/null 2>&1; then
  exit 0
fi

flags=(--verify-tag --generate-notes)
if [[ $PRERELEASE == true ]]; then
  flags+=(--prerelease)
fi
gh release create "$TAG" "${flags[@]}"
