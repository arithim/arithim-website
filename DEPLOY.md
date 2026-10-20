# Publishing arithim.com

Everything in `dist/` is the site. No build step, no dependencies — plain static files.

**Recommendation: Cloudflare Pages.** It's faster to get live (one command, no repo required), gives free SSL, and serves clean URLs (`/services` works as well as `/services.html`). GitHub Pages instructions follow if you'd rather host there.

---

## Option A — Cloudflare Pages (quicker)

One-time setup:

```bash
npm install -g wrangler
wrangler login
```

Deploy from the folder containing `dist/`:

```bash
wrangler pages project create arithim --production-branch=main
wrangler pages deploy dist --project-name=arithim
```

You get a live URL immediately (`arithim.pages.dev`). Every later deploy is just the last line:

```bash
wrangler pages deploy dist --project-name=arithim
```

### Connect arithim.com

```bash
wrangler pages domain add arithim.com --project-name=arithim
wrangler pages domain add www.arithim.com --project-name=arithim
```

Then in DNS (Cloudflare dashboard → your domain → DNS), add:

| Type  | Name | Target             | Proxy |
|-------|------|--------------------|-------|
| CNAME | `@`  | `arithim.pages.dev` | On    |
| CNAME | `www`| `arithim.pages.dev` | On    |

If your domain is already on Cloudflare, adding the custom domain wires DNS automatically. SSL is issued within a few minutes.

Delete `dist/CNAME` if you go this route — it's a GitHub Pages file and Cloudflare ignores it.

---

## Option B — GitHub Pages

```bash
cd dist
git init -b main
git add -A
git commit -m "Arithim website"
gh repo create arithim-site --public --source=. --push
```

No `gh` CLI? Create the repo on github.com first, then:

```bash
git remote add origin git@github.com:YOUR-USERNAME/arithim-site.git
git push -u origin main
```

Enable Pages:

```bash
gh api -X POST repos/YOUR-USERNAME/arithim-site/pages \
  -f "source[branch]=main" -f "source[path]=/"
```

Or: repo → Settings → Pages → Source `main` / root.

`dist/CNAME` already contains `arithim.com`, so Pages picks up the custom domain on first deploy. In DNS add:

| Type  | Name | Value |
|-------|------|-------|
| A     | `@`  | `185.199.108.153` |
| A     | `@`  | `185.199.109.153` |
| A     | `@`  | `185.199.110.153` |
| A     | `@`  | `185.199.111.153` |
| CNAME | `www`| `YOUR-USERNAME.github.io` |

Then Settings → Pages → tick **Enforce HTTPS** once the certificate is issued.

Later updates:

```bash
cd dist && git add -A && git commit -m "Update" && git push
```

Note: GitHub Pages serves `/services.html`, not `/services`. Links in the site use the full filenames, so this works — but URLs keep the `.html`. Cloudflare Pages hides it.

---

## After going live

```bash
# submit the sitemap
curl "https://www.google.com/ping?sitemap=https://arithim.com/sitemap.xml"
```

Check: `https://arithim.com/sitemap.xml`, `https://arithim.com/robots.txt`, and paste the URL into any social preview debugger to confirm the OG card renders.

---

## What's in dist/

- 22 pages — `index.html` plus services (6 detail pages), research, insights (3 articles), case studies (5 cases), about, contact, privacy
- `support.js`, `arithim-fx.js` — page runtime and scroll/hover effects
- `assets/` — favicons (32px, 512px, 180px Apple touch) and `og-image.png` (1200×630)
- `sitemap.xml`, `robots.txt`, `CNAME` (GitHub Pages), `_headers` (Cloudflare caching + security headers)

All pages carry titles, meta descriptions, canonical URLs and Open Graph/Twitter tags pointing at `https://arithim.com`.
