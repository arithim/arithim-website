"""Tests for tools/build_keynotes.py. Run: python3 -m unittest tools/test_build_keynotes.py"""

import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_keynotes as bk  # noqa: E402

DECK = """--- title
kicker: Keynote
# A ==big== idea
notes: First note.
Second line of the note.

--- stats
kicker: Numbers
## Two numbers.
- 17% | of something
- <5% | of something else

--- list numbered
## Steps.
- One | small print
- Two

--- quote
> A short quote.
cite: Someone, 2026
"""


class ParseSlides(unittest.TestCase):
    def test_layouts_and_fields(self):
        slides = bk.parse_slides(DECK)
        self.assertEqual([s["layout"] for s in slides], ["title", "stats", "list", "quote"])
        self.assertEqual(slides[0]["level"], 1)
        self.assertEqual(slides[0]["notes"], ["First note.", "Second line of the note."])
        self.assertEqual(slides[1]["items"], [("17%", "of something"), ("<5%", "of something else")])
        self.assertIn("numbered", slides[2]["flags"])
        self.assertEqual(slides[2]["items"][1], ("Two", ""))
        self.assertEqual(slides[3]["quote"], "A short quote.")
        self.assertEqual(slides[3]["cite"], "Someone, 2026")

    def test_first_slide_must_be_title(self):
        with self.assertRaisesRegex(ValueError, "first slide"):
            bk.parse_slides("--- statement\n## Hello.\n")

    def test_one_highlight_per_slide(self):
        with self.assertRaisesRegex(ValueError, "more than one phrase"):
            bk.parse_slides("--- title\n# ==One== and ==two==\n")

    def test_unknown_layout(self):
        with self.assertRaisesRegex(ValueError, "unknown layout"):
            bk.parse_slides("--- title\n# Hi\n\n--- chart\n## Nope\n")

    def test_cards_limit(self):
        with self.assertRaisesRegex(ValueError, "2 to 4"):
            bk.parse_slides("--- title\n# Hi\n\n--- cards\n## One card\n- A | b\n")

    def test_highlight_and_escaping(self):
        out = bk.rich("Is it ==actually working== <today>?")
        self.assertIn('<mark class="kn-hl">actually working</mark>', out)
        self.assertIn("&lt;today&gt;", out)


class RealDecks(unittest.TestCase):
    def test_every_deck_renders_on_its_insight(self):
        articles = bk.bi.load_articles()
        by_slug = {a["slug"]: a for a in articles}
        for d in bk.load_decks():
            page = bk.bi.render_article(by_slug[d["slug"]], articles)
            self.assertEqual(page.count("data-kn-slide"), len(d["slides"]) + 1)
            self.assertIn(d["qr_file"], page)
            self.assertIn("keynote.js", page)
            self.assertIn('"license": "https://creativecommons.org/licenses/by-nc/4.0/"', page)
            self.assertIn('href="legal.html#slides"', page)
            self.assertNotIn("@@", page)
            self.assertNotIn("{{", page)

    def test_insight_without_deck_is_unchanged(self):
        articles = bk.bi.load_articles()
        decks = {d["slug"] for d in bk.load_decks()}
        plain = next(a for a in articles if a["slug"] not in decks)
        page = bk.bi.render_article(plain, articles)
        self.assertNotIn("data-kn-deck", page)
        self.assertNotIn("keynote.js", page)


if __name__ == "__main__":
    unittest.main()
