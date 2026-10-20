#!/usr/bin/env python3
"""Tests for tools/build_insights.py. Run: python3 -m unittest tools/test_build_insights.py"""

import datetime as dt
import json
import re
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_insights as b  # noqa: E402

REPO = Path(__file__).resolve().parent.parent


class InlineTests(unittest.TestCase):
    def test_inline_code_is_escaped_and_not_formatted(self):
        self.assertEqual(b.inline("set `GITHUB_TOKEN` and `**x**`"), "set <code>GITHUB_TOKEN</code> and <code>**x**</code>")
        self.assertEqual(b.inline("`<b>`"), "<code>&lt;b&gt;</code>")
        self.assertNotIn("{{", b.inline("`{{x}}`"))

    def test_bold_italic(self):
        self.assertEqual(b.inline("a **b** and *c*"), "a <strong>b</strong> and <em>c</em>")

    def test_escapes_html(self):
        self.assertEqual(b.inline("<script>alert(1)</script> & co"), "&lt;script&gt;alert(1)&lt;/script&gt; &amp; co")

    def test_quotes_untouched_in_text(self):
        self.assertEqual(b.inline("Gartner's \"view\""), "Gartner's \"view\"")

    def test_external_link_gets_noopener(self):
        self.assertEqual(
            b.inline("[x](https://example.com/a?b=1&c=2)"),
            '<a href="https://example.com/a?b=1&amp;c=2" rel="noopener">x</a>',
        )

    def test_internal_link_has_no_rel(self):
        self.assertEqual(b.inline("[c](contact.html)"), '<a href="contact.html">c</a>')

    def test_link_text_formatting_and_escaping(self):
        self.assertEqual(b.inline("[**a** <b>](/x)"), '<a href="/x"><strong>a</strong> &lt;b&gt;</a>')

    def test_bold_wrapping_link(self):
        self.assertEqual(b.inline("**[a](/x)**"), '<strong><a href="/x">a</a></strong>')

    def test_javascript_url_rejected(self):
        with self.assertRaises(ValueError):
            b.inline("[x](javascript:alert(1))")

    def test_backslash_escapes(self):
        self.assertEqual(b.inline(r"2 \* 3 \* 4"), "2 * 3 * 4")
        self.assertEqual(b.inline(r"\[not a link\](x)"), "[not a link](x)")

    def test_runtime_template_braces_neutralised(self):
        self.assertNotIn("{{", b.inline("use {{ name }} here"))

    def test_plain_text(self):
        self.assertEqual(b.plain_text("see [Gartner's report](https://g.com) for **more**"), "see Gartner's report for more")


class MarkdownTests(unittest.TestCase):
    def test_headings_and_paragraphs(self):
        html = b.render_markdown("## One\n\nSome text\nwraps here.\n\n### Two\n\nMore")
        self.assertEqual(html, "<h2>One</h2>\n<p>Some text wraps here.</p>\n<h3>Two</h3>\n<p>More</p>")

    def test_h1_rejected(self):
        with self.assertRaises(ValueError):
            b.render_markdown("# Title")

    def test_bullet_list_with_continuation(self):
        html = b.render_markdown("- one\n  more of one\n- two")
        self.assertEqual(html, "<ul><li>one more of one</li><li>two</li></ul>")

    def test_ordered_list(self):
        self.assertEqual(b.render_markdown("1. a\n2. b"), "<ol><li>a</li><li>b</li></ol>")

    def test_table(self):
        html = b.render_markdown("| A | B |\n|---|---|\n| [x](https://e.com) | 2 |\n| only |")
        self.assertIn('<div class="ai-table"><table>', html)
        self.assertIn("<th>A</th><th>B</th>", html)
        self.assertIn('<td><a href="https://e.com" rel="noopener">x</a></td><td>2</td>', html)
        self.assertIn("<td>only</td><td></td>", html)  # short rows are padded

    def test_table_requires_separator(self):
        with self.assertRaises(ValueError):
            b.render_markdown("| A | B |\n| 1 | 2 |")

    def test_escaped_pipe_in_cell(self):
        html = b.render_markdown("| A |\n|---|\n| x \\| y |")
        self.assertIn("<td>x | y</td>", html)

    def test_note_marker(self):
        self.assertEqual(b.render_markdown("Fine print. {.note}"), '<p class="ai-note">Fine print.</p>')

    def test_pull_quote(self):
        html = b.render_markdown("> Short & sharp.")
        self.assertIn("border-left:2px solid #E8A13C", html)
        self.assertIn("Short &amp; sharp.", html)

    def test_raw_html_is_escaped(self):
        self.assertEqual(b.render_markdown("<div onclick=x>hi</div>"), "<p>&lt;div onclick=x&gt;hi&lt;/div&gt;</p>")


class FrontMatterTests(unittest.TestCase):
    DOC = (
        '+++\ntitle = "T"\nslug = "t"\ndate = 2026-02-03\ncategory = "C"\nbreadcrumb = "B"\n'
        'description = "D"\nlede = "L"\ncta = "Go?"\n+++\nBody **text**.\n'
    )

    def test_parse(self):
        meta, body = b.parse_front_matter(self.DOC)
        self.assertEqual(meta["title"], "T")
        self.assertEqual(meta["date"], dt.date(2026, 2, 3))
        self.assertEqual(body, "Body **text**.")

    def test_missing_front_matter(self):
        with self.assertRaises(ValueError):
            b.parse_front_matter("no front matter")

    def test_unclosed_front_matter(self):
        with self.assertRaises(ValueError):
            b.parse_front_matter('+++\ntitle = "x"\n')

    def test_arrays_of_tables(self):
        doc = self.DOC.replace("+++\nBody", '[[faq]]\nq = "Why?"\na = "Because."\n+++\nBody')
        meta, _ = b.parse_front_matter(doc)
        self.assertEqual(meta["faq"], [{"q": "Why?", "a": "Because."}])

    def _load(self, text, name="t.md"):
        with tempfile.TemporaryDirectory() as d:
            p = Path(d) / name
            p.write_text(text, encoding="utf-8")
            return b.load_article(p)

    def test_defaults_and_read_time(self):
        a = self._load(self.DOC)
        self.assertEqual(a["author"], "Tarun Bulchandani")
        self.assertFalse(a["research"])
        self.assertEqual(a["read_minutes"], 1)
        self.assertEqual(a["modified"], dt.date(2026, 2, 3))

    def test_read_time_from_word_count(self):
        words = " ".join(["word"] * 700)
        a = self._load(self.DOC.replace("Body **text**.", words))
        self.assertEqual(a["read_minutes"], 4)  # ceil((700 + 1 lede word) / 230)

    def test_explicit_read_minutes_wins(self):
        a = self._load(self.DOC.replace('cta = "Go?"', 'cta = "Go?"\nread_minutes = 9'))
        self.assertEqual(a["read_minutes"], 9)

    def test_unknown_field_rejected(self):
        with self.assertRaises(ValueError):
            self._load(self.DOC.replace('cta = "Go?"', 'cta = "Go?"\ntypo_field = 1'))

    def test_missing_required_field_rejected(self):
        with self.assertRaises(ValueError):
            self._load(self.DOC.replace('cta = "Go?"\n', ""))

    def test_slug_must_match_filename(self):
        with self.assertRaises(ValueError):
            self._load(self.DOC, name="other.md")

    def test_quoted_date_rejected(self):
        with self.assertRaises(ValueError):
            self._load(self.DOC.replace("2026-02-03", '"2026-02-03"'))


class JsonLdTests(unittest.TestCase):
    def setUp(self):
        self.articles = b.load_articles()

    def test_every_article_emits_parseable_jsonld(self):
        template = b.TEMPLATE.read_text(encoding="utf-8")
        for a in self.articles:
            page = b.render_article(a, self.articles, template)
            blocks = re.findall(r'<script type="application/ld\+json">\n(.*?)\n</script>', page, re.S)
            self.assertEqual(len(blocks), 1, a["slug"])
            graph = json.loads(blocks[0])["@graph"]
            types = [n["@type"] for n in graph]
            self.assertIn("Article", types)
            self.assertIn("BreadcrumbList", types)
            self.assertEqual("FAQPage" in types, bool(a.get("faq")))
            article = graph[0]
            self.assertEqual(article["author"]["@type"], "Person")
            self.assertEqual(article["author"]["url"], "https://arithim.com/about.html")
            self.assertIn('<meta property="og:type" content="article">', page)
            self.assertIn(f'<meta property="article:published_time" content="{a["date"].isoformat()}">', page)

    def test_jsonld_cannot_close_script_tag(self):
        text = b.jsonld_script({"x": "</script><b>"})
        self.assertEqual(text.count("</script>"), 1)


class OrderingTests(unittest.TestCase):
    def test_more_insights_prefers_same_category_then_newest(self):
        def mk(slug, day, cat):
            return {"slug": slug, "date": dt.date(2026, 1, day), "category": cat}
        arts = [mk("e", 5, "X"), mk("d", 4, "Y"), mk("c", 3, "X"), mk("b", 2, "Z"), mk("a", 1, "X")]
        picked = [a["slug"] for a in b.more_insights(arts[1], arts)]  # article "d" in category Y
        self.assertEqual(picked, ["e", "c", "b"])
        picked = [a["slug"] for a in b.more_insights(arts[0], arts)]  # "e" in X: c, a first, then d
        self.assertEqual(picked, ["c", "a", "d"])

    def test_replace_between_markers(self):
        src = "x\n  <!-- m:start -->\nold\n  <!-- m:end -->\ny"
        out = b.replace_between(src, "m", "new")
        self.assertEqual(out, "x\n  <!-- m:start -->\nnew\n  <!-- m:end -->\ny")
        self.assertEqual(b.replace_between(out, "m", "new"), out)
        with self.assertRaises(ValueError):
            b.replace_between("nothing", "m", "z")


class RepoBuildTests(unittest.TestCase):
    """Run the real build against a scratch copy of the repo."""

    def setUp(self):
        self.tmp = Path(tempfile.mkdtemp())
        self.addCleanup(shutil.rmtree, self.tmp, True)
        for item in ("content", "tools"):
            shutil.copytree(REPO / item, self.tmp / item, ignore=shutil.ignore_patterns("__pycache__"))
        for f in REPO.glob("*.html"):
            shutil.copy(f, self.tmp / f.name)

    def _write_all(self):
        articles = b.load_articles(self.tmp / "content" / "insights")
        outputs = b.generate(self.tmp, articles)
        for path, content in outputs.items():
            path.write_text(content, encoding="utf-8")
        return articles, outputs

    def test_idempotent(self):
        articles, _ = self._write_all()
        before = {p.name: p.read_text(encoding="utf-8") for p in self.tmp.glob("*.html")}
        _, outputs2 = self._write_all()
        after = {p.name: p.read_text(encoding="utf-8") for p in self.tmp.glob("*.html")}
        self.assertEqual(before, after)
        for path, content in outputs2.items():
            self.assertEqual(path.read_text(encoding="utf-8"), content)
        today = dt.date(2026, 1, 1)
        self.assertEqual(b.build_sitemap(articles, self.tmp, today), b.build_sitemap(articles, self.tmp, today))

    def test_sitemap_lists_html_pages_and_skips_404(self):
        (self.tmp / "404.html").write_text("<html></html>", encoding="utf-8")
        articles, _ = self._write_all()
        xml = b.build_sitemap(articles, self.tmp, dt.date(2026, 5, 5))
        self.assertNotIn("404.html", xml)
        self.assertIn("<loc>https://arithim.com/</loc>", xml)
        for a in articles:
            self.assertIn(f"<loc>{a['url']}</loc><lastmod>{a['modified'].isoformat()}</lastmod>", xml)

    def test_research_section_lists_only_research_articles(self):
        articles, outputs = self._write_all()
        research = outputs[self.tmp / "research.html"]
        for a in articles:
            self.assertEqual(a["file"] in research, a["research"], a["slug"])
        self.assertEqual("LATEST RESEARCH" in research, any(a["research"] for a in articles))

    def test_insights_list_is_newest_first(self):
        articles, outputs = self._write_all()
        page = outputs[self.tmp / "insights.html"]
        order = [page.index(f'href="{a["file"]}"') for a in articles]
        self.assertEqual(order, sorted(order))

    def test_check_detects_staleness(self):
        articles, outputs = self._write_all()
        target = self.tmp / articles[0]["file"]
        target.write_text(target.read_text(encoding="utf-8") + "\n<!-- edited by hand -->", encoding="utf-8")
        self.assertNotEqual(target.read_text(encoding="utf-8"), b.generate(self.tmp, articles)[target])


if __name__ == "__main__":
    unittest.main()
