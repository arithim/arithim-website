import os
import sys
import unittest

sys.path.insert(0, os.path.dirname(__file__))
import digest  # noqa: E402

NOW = 1_792_000_000


def sample():
    return {
        "totals": [{"calls": 4, "voice": 3, "text": 1, "minutes": 20.0}],
        "outcomes": [{"outcome": "enquiry", "n": 2}, {"outcome": "(none)", "n": 2}],
        "flags": [{"call_id": "ab" * 16, "flags": "price", "current_role": "consulting", "created_at": NOW - 100}],
        "messages": [{"type": "enquiry", "n": 2}, {"type": "billing_query", "n": 1}],
        "unanswered": [
            {"ref": "ARC-261020-AAAA", "type": "enquiry", "summary": "=HYPERLINK(\"http://evil\",\"x\") I don't know | <script>alert(1)</script>", "created_at": NOW - 50},
            {"ref": "ARC-261020-BBBB", "type": "other", "summary": "-2+3 not sure about fees", "created_at": NOW - 40},
        ],
        "helpful": [{"yes": 3, "no": 1}],
        "unsent": [{"call_id": "ef" * 16, "status": "ended", "created_at": NOW - 3600}],
        "unfinalised": [{"call_id": "cd" * 16, "mode": "voice", "status": "active", "created_at": NOW - 7200}],
    }


class DigestTest(unittest.TestCase):
    def test_cell_escaping(self):
        self.assertEqual(digest.cell("=1+1"), "'=1+1")
        self.assertEqual(digest.cell("@SUM(A1)"), "'@SUM(A1)")
        self.assertTrue(digest.cell("+44 20").startswith("'"))
        self.assertNotIn("<", digest.cell("<b>x</b>"))
        self.assertNotIn("\n", digest.cell("a\nb|c"))
        self.assertIn("\\|", digest.cell("a|b"))

    def test_render(self):
        md = digest.render(sample(), 7, NOW)
        self.assertIn("Conversations: 4 (3 voice, 1 text)", md)
        self.assertIn("Voice minutes used: 20.0", md)
        self.assertIn("3 of 4 (75%)", md)
        self.assertIn("'=HYPERLINK", md)
        self.assertNotIn("<script>", md)
        self.assertIn("'-2+3", md)
        self.assertIn("older than 1 hour", md)
        self.assertIn("billing_query", md)
        self.assertIn("ESTIMATED", md)
        self.assertIn("Emails not sent", md)
        self.assertIn("efefefef", md)

    def test_empty(self):
        d = {k: [] for k in sample()}
        d["totals"] = [{"calls": 0, "voice": 0, "text": 0, "minutes": None}]
        md = digest.render(d, 7, NOW)
        self.assertIn("no ratings yet", md)
        self.assertIn("All calls older than 1 hour have a finalised record", md)
        self.assertIn("Every finished call has its email sent", md)

    def test_gather_uses_query(self):
        seen = []
        digest.gather(lambda sql: seen.append(sql) or [], NOW, 7)
        self.assertEqual(len(seen), 8)
        self.assertTrue(all("DELETE" not in s.upper() and "UPDATE" not in s.upper() for s in seen))


if __name__ == "__main__":
    unittest.main()
