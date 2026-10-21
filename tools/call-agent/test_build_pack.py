"""Tests for build_pack.py. Run: python3 -m unittest tools/call-agent/test_build_pack.py -v"""
import contextlib
import io
import json
import os
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_pack as bp  # noqa: E402

PAGE = """<!DOCTYPE html><html><head><title>Services — Arithim</title>
<style>.x{color:red}</style><script>var secret = 'SCRIPTTEXT';</script></head>
<body><helmet><style>h1{}</style></helmet>
<div style="position:sticky;top:0"><a href="/">Sticky Logo</a></div>
<nav><a href="a.html">NavLink</a></nav>
<h1>Six ways</h1><p>We build   things.<br>Second line.</p>
<ul><li>One</li><li>Two</li></ul>
<p>{{ template placeholder }}</p>
<footer>FooterText</footer>
<div>© 2026 ARITHIM LTD</div>
<script type="text/x-dc" data-props="{&quot;accent&quot;:{&quot;editor&quot;:&quot;color&quot;,&quot;default&quot;:&quot;#fff&quot;},&quot;faqsText&quot;:{&quot;editor&quot;:&quot;text&quot;,&quot;default&quot;:&quot;Is it safe? :: Yes it is.&quot;}}"></script>
</body></html>"""


class AllowlistTests(unittest.TestCase):
    def test_comments_blanks_and_duplicates(self):
        text = "# header\n\nindex.html  # trailing\n  about.html\nindex.html\n"
        self.assertEqual(bp.parse_allowlist(text), ["index.html", "about.html"])

    def test_rejects_absolute_and_parent_paths(self):
        with self.assertRaises(ValueError):
            bp.parse_allowlist("/etc/passwd\n")
        with self.assertRaises(ValueError):
            bp.parse_allowlist("../secrets.md\n")

    def test_slug(self):
        self.assertEqual(bp.slug_for("tools/call-agent/knowledge/answer-gists.md"),
                         "tools-call-agent-knowledge-answer-gists")


class ExtractionTests(unittest.TestCase):
    def setUp(self):
        self.title, self.text = bp.extract_html(PAGE)

    def test_title(self):
        self.assertEqual(self.title, "Services — Arithim")

    def test_body_text_kept(self):
        self.assertIn("# Six ways", self.text)
        self.assertIn("We build things.", self.text)
        self.assertIn("Second line.", self.text)
        self.assertIn("One", self.text)

    def test_chrome_stripped(self):
        for junk in ("SCRIPTTEXT", "color:red", "Sticky Logo", "NavLink", "FooterText",
                     "© 2026", "{{"):
            self.assertNotIn(junk, self.text)

    def test_component_props_text_included(self):
        self.assertIn("Q: Is it safe?", self.text)
        self.assertIn("A: Yes it is.", self.text)
        self.assertNotIn("#fff", self.text)

    def test_markdown_front_matter(self):
        title, body = bp.extract_markdown('+++\ntitle = "My Post"\ndate = 2026-01-01\n+++\nBody here\n')
        self.assertEqual(title, "My Post")
        self.assertEqual(body, "Body here")
        title, body = bp.extract_markdown("# Heading\n\ntext <!-- hidden -->\n")
        self.assertEqual(title, "Heading")
        self.assertNotIn("hidden", body)


class PackTests(unittest.TestCase):
    def test_pack_files_start_with_source_line_and_index(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            (root / "page.html").write_text(PAGE, encoding="utf-8")
            (root / "notes.md").write_text("# Notes\n\nHello\n", encoding="utf-8")
            allow = root / "allow.txt"
            allow.write_text("page.html\nnotes.md\n", encoding="utf-8")
            out = root / "build" / "pack"
            index = bp.build_pack(allow, root, out)
            self.assertEqual(len(index), 2)
            first = (out / "page.md").read_text(encoding="utf-8").splitlines()[0]
            self.assertEqual(first, "Source: page.html")
            self.assertTrue((out / "notes.md").read_text().startswith("Source: notes.md"))
            self.assertEqual(json.loads((out / "index.json").read_text())[0]["source"], "page.html")

    def test_missing_allowlisted_file_is_an_error(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            allow = root / "allow.txt"
            allow.write_text("nope.html\n", encoding="utf-8")
            with self.assertRaises(FileNotFoundError):
                bp.build_pack(allow, root, root / "out")


class DenylistTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name)
        (self.root / "pack").mkdir()
        (self.root / "pack" / "a.md").write_text(
            "Source: x\n\nWe spoke to Acme Corp yesterday.\nCost was 30,000 total.\n", encoding="utf-8")
        (self.root / "pack" / "clean.md").write_text("Nothing here. Acmeology is fine.\n", encoding="utf-8")
        self.deny = self.root / "deny.txt"

    def tearDown(self):
        self.tmp.cleanup()

    def run_check(self, allow_missing=False):
        err = io.StringIO()
        with contextlib.redirect_stderr(err), contextlib.redirect_stdout(io.StringIO()):
            code = bp.run_denylist_check(self.deny, [self.root / "pack", self.root / "agents"],
                                         self.root, allow_missing)
        return code, err.getvalue()

    def test_hit_is_case_insensitive_and_reports_location(self):
        self.deny.write_text("# comment\nacme corp\n", encoding="utf-8")
        code, err = self.run_check()
        self.assertEqual(code, 1)
        self.assertIn("pack/a.md:3", err)

    def test_whole_word_only(self):
        self.deny.write_text("Acme\n", encoding="utf-8")  # "Acme Corp" is a hit, "Acmeology" is not
        hits = bp.scan_paths([self.root / "pack"], ["Acme"], self.root)
        self.assertEqual([(h[0].endswith("a.md"), h[1]) for h in hits], [(True, 3)])

    def test_currency_amount_term(self):
        hits = bp.scan_paths([self.root / "pack"], ["30,000"], self.root)
        self.assertEqual(len(hits), 1)

    def test_no_hits_passes(self):
        self.deny.write_text("Zebra Industries\n", encoding="utf-8")
        code, _ = self.run_check()
        self.assertEqual(code, 0)

    def test_missing_denylist_exits_2(self):
        code, err = self.run_check()
        self.assertEqual(code, 2)
        self.assertIn("WARNING", err)

    def test_missing_denylist_allowed_with_flag(self):
        code, err = self.run_check(allow_missing=True)
        self.assertEqual(code, 0)
        self.assertIn("WARNING", err)

    def test_agents_dir_is_scanned_when_present(self):
        (self.root / "agents").mkdir()
        (self.root / "agents" / "front-desk.md").write_text("Never mention Zebra Industries.\n")
        self.deny.write_text("Zebra Industries\n", encoding="utf-8")
        code, err = self.run_check()
        self.assertEqual(code, 1)
        self.assertIn("agents/front-desk.md", err)


class EndToEndEnvTests(unittest.TestCase):
    def test_main_uses_env_denylist(self):
        with tempfile.TemporaryDirectory() as d:
            root = Path(d)
            tool = root / "tools" / "call-agent"
            (tool / "knowledge").mkdir(parents=True)
            (root / "p.html").write_text("<body><p>Hello Zebra Industries</p></body>")
            (tool / "knowledge" / "allowlist.txt").write_text("p.html\n")
            deny = root / "deny.txt"
            deny.write_text("zebra industries\n")
            old = os.environ.get("CALL_AGENT_DENYLIST")
            os.environ["CALL_AGENT_DENYLIST"] = str(deny)
            try:
                with contextlib.redirect_stderr(io.StringIO()), contextlib.redirect_stdout(io.StringIO()):
                    self.assertEqual(bp.main(["--root", str(root)]), 1)
                    deny.write_text("someone else\n")
                    self.assertEqual(bp.main(["--root", str(root)]), 0)
            finally:
                if old is None:
                    del os.environ["CALL_AGENT_DENYLIST"]
                else:
                    os.environ["CALL_AGENT_DENYLIST"] = old


if __name__ == "__main__":
    unittest.main()
