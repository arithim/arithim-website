# Shared page partials

`tools/build_insights.py` stamps these into every page between markers:

```html
<!-- partial:header {"label": "/about", "active": "about.html"} -->
...generated, do not edit...
<!-- /partial:header -->
```

| Partial | Params | Where |
|---|---|---|
| `head` | none | inside `<head>`: favicons, theme colour, fonts, `support.js`, `site.css` |
| `header` | `label` (text after the logo), `active` (nav link to highlight, or `""`), `cta` (`talk`, `contact` or `demo`; default `talk`) | top of `<x-dc>` |
| `footer` | `back_href`, `back_text`, `email` (default `hello@arithim.com`) | bottom of `<x-dc>` |

The nav links themselves are `NAV_LINKS` in `build_insights.py`. Edit a partial or the list, run `python3 tools/build_insights.py`, and commit the pages it rewrites. CI runs `--check`, which fails if any page has drifted from its partials.
