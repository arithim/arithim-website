# arithim.com

The Arithim marketing site. The repo root is the site: plain static HTML, one stylesheet (`site.css`), no JavaScript build. Insight articles are generated from Markdown, and the contact form and call-us agent are Cloudflare Pages Functions in `functions/`. See `DEPLOY.md`.

## Build and test
- Needs Python 3.11+ (stdlib only) and Node 24 for the call-agent tests.
- Rebuild generated pages: `python3 tools/build_insights.py`. Staleness check: `python3 tools/build_insights.py --check`.
- Unit tests: `python3 -m unittest tools/test_build_insights.py`.
- Call-agent tests: `node --test tools/call-agent/test/*.test.mjs` and `python3 -m unittest discover -s tools/call-agent -p 'test_*.py'`.
- Rebuild the call knowledge pack with `python3 tools/call-agent/build_pack.py --allow-missing-denylist`, then commit `functions/_lib/call-knowledge.generated.js`.
- Preview locally: `python3 -m http.server 8000`.
- Do not edit `insight-*.html` by hand, or anything inside `<!-- partial:... -->`, `insights:start` or `research:start` markers. Edit the Markdown or `tools/partials/` and rebuild.
- Motion on product pages follows the `tsg-motion.js` scene pattern, not MP4s. Check media with real clicks.

## Deploy
- Production is the Cloudflare Pages project `arithim` (arithim.com). A PR gets a preview URL from `.github/workflows/deploy.yml`; a push to `main` deploys production.
- By hand: `tools/deploy.sh` (production) or `tools/deploy.sh <name>` (preview). It runs the `--check`, stages the publishable files with `tools/stage_site.sh`, then `wrangler pages deploy`.
- Run wrangler from the repo root so `functions/` is compiled. `content/`, `tools/`, `functions/` source and `*.md` are not published.
- Tarun has authorised merging insights PRs and deploying production from the Mac without waiting. That covers articles and pipeline fixes only, not other repos or destructive actions. He still reviews content.

## Never
- Never push straight to `main`. Open a PR, check the preview, then merge.
- Never publish prose that has not been through `humanizer` and `unslop`. Article titles are real search queries; keep the Q&A section.
- Never commit `.env.local` (ElevenLabs key) or put secrets in `wrangler.toml`.
- Leave the other `~/code/arithim-website-wt-*` worktrees alone. They belong to other sessions.

## Git and accounts
- Commit as `tarun@arithim.com`. The `gh` active account must be `arithim`; `Bulchandani` has no write access to the org repo.
- Remote is `arithim/arithim-website`, default branch `main`.

## Data and secrets (names only)
- Pages secrets, set on the Pages project and not in the repo: `RESEND_API_KEY`, `TURNSTILE_SECRET`, `TO_EMAIL`, `FROM_EMAIL`, `CALL_*`. Repo secrets: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
- D1: `arithim-calls` (production) and `arithim-calls-preview`, binding `CALLS_DB`, migrations in `migrations/`.
- Product data for pages: `content/products.json`. Article sources: `content/insights/*.md`.
- Secrets live in the macOS Keychain and signed-in CLIs. Set and rotate as needed; never delete one.

## Open questions for Tarun
- TODO: is `CLOUDFLARE_API_TOKEN` now set as a repo secret, so CI deploys without the Mac?
- TODO: the range redesign (Grid and Chem) prices are marked "confirm". Which are final?
- TODO: is the `CNAME` file still needed?
