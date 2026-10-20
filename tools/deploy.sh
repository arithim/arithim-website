#!/usr/bin/env bash
# Deploy the site to Cloudflare Pages (project "arithim").
#
# Usage:
#   tools/deploy.sh                 # production (branch "main")
#   tools/deploy.sh my-preview      # preview deployment at my-preview.arithim.pages.dev
#
# Needs `npx` (Node) and either `wrangler login` or CLOUDFLARE_API_TOKEN +
# CLOUDFLARE_ACCOUNT_ID in the environment. Normally CI does this; see DEPLOY.md.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
# wrangler compiles ./functions relative to the current directory, so always run from the repo root.
cd "$repo_root"

branch="${1:-main}"

python3 tools/build_insights.py --check

stage="$(mktemp -d)"
trap 'rm -rf "$stage"' EXIT
tools/stage_site.sh "$stage"

npx --yes wrangler pages deploy "$stage" \
  --project-name=arithim \
  --branch="$branch" \
  --commit-dirty=true
