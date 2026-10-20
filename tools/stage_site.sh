#!/usr/bin/env bash
# Copy the publishable files of the site into a directory (used by deploy.sh and CI).
#
# Usage: tools/stage_site.sh <target-dir>
#
# Excluded: sources and tooling (content/, tools/, .github/), build and VCS state
# (.git, .wrangler/, .claude/), markdown docs (DEPLOY.md, *.md), and functions/.
# functions/ is excluded on purpose: `wrangler pages deploy` compiles ./functions from
# the current working directory and publishes the result as a Worker. If it were also
# copied into the asset directory, the source would be downloadable as /functions/...
set -euo pipefail

if [ $# -ne 1 ]; then
  echo "usage: $0 <target-dir>" >&2
  exit 64
fi

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
target="$1"
mkdir -p "$target"

rsync -a --delete \
  --exclude '/content/' \
  --exclude '/tools/' \
  --exclude '/.github/' \
  --exclude '/.wrangler/' \
  --exclude '/.claude/' \
  --exclude '/functions/' \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude '.DS_Store' \
  --exclude '__pycache__/' \
  --exclude 'DEPLOY.md' \
  --exclude '*.md' \
  "$repo_root"/ "$target"/
