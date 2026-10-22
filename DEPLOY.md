# Publishing arithim.com

The repository root is the site. There is no `dist/` folder and no JavaScript build: pages are plain static HTML served through `support.js`. The one generated part is the Insights section, which `tools/build_insights.py` builds from Markdown (stdlib Python 3.11+, no packages to install).

`site.css` is the site's one stylesheet. It holds the mobile menu, the phone and tablet layout for the inline-styled pages, and the Technical Sales Guide page's styles. Pages keep their inline styles, and elements that need to change at narrow widths carry an `r-*` class (listed at the top of `site.css`). A new page should link `/site.css` after `support.js`, reuse those classes, and load `arithim-fx.js` from its `componentDidMount`, which also sets up the mobile menu (`site-nav.js`). The insight template already does all of this.

The header nav is copied into every page. To add or rename a nav link, change every top-level page and `tools/templates/insight.html`, then rebuild the insights.

Production is the Cloudflare Pages project **`arithim`** (account id in the `CLOUDFLARE_ACCOUNT_ID` secret). The contact form is a Pages Function in `functions/api/contact.js`; it deploys with the site.

## How deploys happen

| Event | What runs | Result |
|-------|-----------|--------|
| Pull request opened or updated | `.github/workflows/deploy.yml`: unit tests, `build_insights.py --check`, then a preview deploy | Preview URL commented on the PR |
| Push to `main` (merge) | Same workflow, production job | arithim.com updated |
| By hand | `tools/deploy.sh [preview-name]` | Production (no argument) or a named preview |

Repository secrets required: `CLOUDFLARE_API_TOKEN` (Cloudflare API token with Pages: Edit) and `CLOUDFLARE_ACCOUNT_ID`.

What gets published: everything in the repo root except `content/`, `tools/`, `.github/`, `.wrangler/`, `.claude/`, `functions/` (compiled separately, see below), `DEPLOY.md` and other `*.md`. `tools/stage_site.sh` copies that set into a temporary directory and both the workflow and `deploy.sh` deploy from there.

`functions/` is not copied into the temporary directory on purpose. `wrangler pages deploy` reads `./functions` from the directory it is run in, so it must run from the repo root (the workflow and `deploy.sh` both do). Copying it would also make the function source downloadable.

## Publishing an article

1. Create `content/insights/<slug>.md`. Copy an existing file for the front matter fields. The file name must match `slug`.
   - Front matter is TOML between `+++` lines: `title`, `slug`, `date` (unquoted `2026-10-20`), `category`, `breadcrumb`, `description`, `lede`, `cta`. Optional: `updated`, `read_minutes` (otherwise 230 words per minute), `author`, `keywords`, `research = true`, `faq`, `sources`, `citation`, `mentions`, `about`, `card_label`, `summary`, `footnote`.
   - The body is a small Markdown subset: `##` and `###` headings, paragraphs, `-` and `1.` lists, `> pull quote`, pipe tables, `**bold**`, `*italic*`, `[links](url)`, and a trailing `{.note}` to make a paragraph small print. Raw HTML is escaped.
2. Build: `python3 tools/build_insights.py`. This writes `insight-<slug>.html`, refreshes the lists in `insights.html` and `research.html` (between their marker comments) and regenerates `sitemap.xml`. Running it again changes nothing.
3. Run the tests: `python3 -m unittest tools/test_build_insights.py`.
4. Preview locally if you like: `python3 -m http.server 8000` and open `http://localhost:8000/insights.html`.
5. Commit the Markdown and the generated files together, push a branch and open a pull request. CI fails if the generated files are stale (`--check`).
6. Open the preview URL the workflow comments on the PR. Check the new page, `insights.html`, and (for research pieces) `research.html`.
7. Merge. The production job deploys to arithim.com.

Do not edit `insight-*.html` by hand. Edit the Markdown and rebuild. Do not edit between the `<!-- insights:start -->` and `<!-- research:start -->` markers either.

## First-time setup (already done for arithim)

```bash
npm install -g wrangler
wrangler login
wrangler pages project create arithim --production-branch=main
```

Custom domains (`arithim.com`, `www.arithim.com`) are attached to the project in the Cloudflare dashboard (Workers & Pages, arithim, Custom domains). If the zone is on Cloudflare, DNS is wired automatically. Function secrets (Resend key, Turnstile secret) are set under Settings, Variables and Secrets on the Pages project, not in this repo.

## Deploying by hand

```bash
tools/deploy.sh               # production
tools/deploy.sh my-preview    # preview at my-preview.arithim.pages.dev
```

It runs the staleness check, stages the publishable files, and calls `npx wrangler pages deploy` with `--project-name=arithim`. Authenticate with `wrangler login` or by exporting `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`. The branch is always passed explicitly so a deploy from a feature branch is never mistaken for production.

## After going live

Google retired the sitemap ping endpoint in 2023, so there is no URL to ping. Use these instead, once per new article or after a big change:

1. **Google Search Console**: confirm the `sitemap.xml` submission is still "Success", then use URL Inspection on the new article and click Request Indexing.
2. **Bing Webmaster Tools**: same checks (sitemap status, URL Inspection). Bing also feeds several AI search products.
3. **Cloudflare Crawler Hints** (IndexNow): in the Cloudflare dashboard go to Caching, Configuration and turn on Crawler Hints. Cloudflare then notifies Bing, Yandex and other IndexNow participants when content changes, with no per-article step.

Also check `https://arithim.com/sitemap.xml`, `https://arithim.com/robots.txt`, and paste the article URL into a social preview debugger to confirm the Open Graph card renders. Test the JSON-LD with Google's Rich Results Test (FAQ and breadcrumb markup) or the Schema Markup Validator.

## What is in the repo

- `*.html`: the pages. `index.html`, services (6 detail pages), research, insights, case studies (5), about, contact, privacy. `insight-*.html` are generated.
- `content/insights/*.md`: article sources.
- `tools/`: `build_insights.py` (build and `--check`), `templates/insight.html`, `test_build_insights.py`, `stage_site.sh`, `deploy.sh`.
- `functions/api/contact.js`: contact form handler (Pages Function).
- `support.js`, `arithim-fx.js`: page runtime and scroll/hover effects.
- `assets/`: favicons, Apple touch icon, `og-image.png`, `founder.jpg`.
- `sitemap.xml` (generated), `robots.txt`, `_headers` (caching and security headers), `CNAME` (leftover from GitHub Pages; Cloudflare ignores it).
