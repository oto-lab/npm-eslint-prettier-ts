#!/usr/bin/env bash
set -euo pipefail

git config user.name 'github-actions[bot]'
git config user.email 'github-actions[bot]@users.noreply.github.com'
git add -- package.json
if git ls-files --error-unmatch package-lock.json >/dev/null 2>&1; then
  git add -- package-lock.json
fi
if ! git diff --cached --quiet; then
  git commit -m "release: $TAG"
fi
git tag "$TAG"
git push --atomic origin HEAD:refs/heads/main "refs/tags/$TAG"
