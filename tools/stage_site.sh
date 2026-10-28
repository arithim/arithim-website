#!/usr/bin/env bash
# Copy the publishable files of the site into a directory (used by deploy.sh and CI).
#
# Usage: tools/stage_site.sh <target-dir>
#
# Excluded: sources and tooling (content/, tools/, .github/), build and VCS state
# (.git, .wrangler/, .claude/), markdown docs (DEPLOY.md, *.md), migrations/ (the D1 schema is not for publishing), and functions/.
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
  --exclude '/migrations/' \
  --exclude '.git' \
  --exclude '.gitignore' \
  --exclude '.DS_Store' \
  --exclude '__pycache__/' \
  --exclude 'DEPLOY.md' \
  --exclude '*.md' \
  "$repo_root"/ "$target"/

# Cache busting: /assets/* is served immutable for a year, so the ?v= on callus.js must change when the file does.
# Rewrite it to a short content hash in the staged copy (the repo keeps a manual ?v=N for local runs).
for asset in callus.js; do
  f="$target/assets/$asset"
  [ -f "$f" ] || continue
  h="$(shasum -a 256 "$f" | cut -c1-10)"
  find "$target" -name '*.html' -type f -print0 | xargs -0 perl -pi -e "s{(/assets/\Q$asset\E)\?v=[A-Za-z0-9._-]+}{\$1?v=$h}g"
done
