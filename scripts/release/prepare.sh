#!/usr/bin/env bash
set -euo pipefail

if [[ $RETRY == true ]]; then
  expected=${TAG#v}
  tagged=$(git rev-parse --verify "refs/tags/$TAG^{commit}")
  if [[ $tagged != "$(git rev-parse HEAD)" ]]; then
    git switch --detach "$tagged"
    echo 'changed_ref=true' >> "$GITHUB_OUTPUT"
  fi
  if [[ $(node -p 'require("./package.json").version') != "$expected" ]]; then
    echo "package.json at $TAG does not match the tag." >&2
    exit 1
  fi
else
  npm version "$TAG" --no-git-tag-version --allow-same-version --ignore-scripts
fi
