#!/usr/bin/env bash
set -euo pipefail

"$PACKAGE_MANAGER" run ci
"$PACKAGE_MANAGER" run typecheck
"$PACKAGE_MANAGER" run test
