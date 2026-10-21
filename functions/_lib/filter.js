// Pre-speech filter. Each sentence is checked before it is streamed to the caller; a hit is replaced by a
// fixed line, never regenerated. The same detectors run over the whole transcript after the call.

export const LINE_FIGURES = "I can't give figures or promises on a call; Tarun will cover that with you.";
export const LINE_AVOID = "I'd rather not go into that on a call; Tarun can cover it with you.";

const DAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";

const DETECTORS = [
  ["price", /[£$€]\s?\d|\d\s?[£$€]/],
  ["price", /\b\d[\d,.]*\s?(?:k|m|bn|thousand|million)?\s?(?:pounds?|dollars?|euros?|quid|gbp|usd|eur|pence|cents?)\b/i],
  ["price", /\b(?:a|one|two|three|four|five|six|seven|eight|nine|ten|twenty|fifty|hundred|thousand)\s+(?:thousand\s+)?(?:pounds?|dollars?|euros?|quid)\b/i],
  ["guarantee", /\bguarantee[sd]?\b/i],
  ["guarantee", /\b(?:i|we)\s+(?:can\s+|do\s+)?promise\b|\bi\s+swear\b|\bwe\s+promise\b|\bpromised\b/i],
  ["date", new RegExp(`\\b(?:will|shall|'ll|going to)\\b[^.!?]*\\b(?:by|on|before|until)\\s+(?:${DAYS}|tomorrow|tonight|(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\b|(?:next|this)\\s+(?:week|month|${DAYS})|(?:the\\s+)?end of (?:the\\s+)?(?:day|week|month|year)|(?:${MONTHS})\\b)`, "i")],
  ["date", new RegExp(`\\b(?:will|shall|'ll|going to)\\b[^.!?]*\\b(?:call|ring|email|e-mail|reply|respond|contact|get back|be in touch|send)[^.!?]*\\b(?:tomorrow|tonight|today|this (?:morning|afternoon|evening)|first thing|${DAYS}|within (?:the next )?(?:an? |\\d+ |two |three |four |five )?(?:hours?|minutes?))\\b`, "i")],
];

export function parseDenylist(raw) {
  return String(raw || "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length >= 3 && !l.startsWith("#"));
}

function denyRegexes(denylist) {
  return (denylist || []).map((term) => {
    const esc = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    return new RegExp(`(?<![\\p{L}\\p{N}])${esc}(?![\\p{L}\\p{N}])`, "iu");
  });
}

// Returns the list of category names that hit. Never returns the matched deny-list term.
export function detect(text, denylist = []) {
  const hits = new Set();
  for (const [name, re] of DETECTORS) if (re.test(text)) hits.add(name);
  for (const re of denyRegexes(denylist)) if (re.test(text)) { hits.add("denylist"); break; }
  return [...hits];
}

// Returns {text, hits}. A deny-list hit gets LINE_AVOID; any other hit gets LINE_FIGURES.
export function filterSentence(sentence, denylist = []) {
  const hits = detect(sentence, denylist);
  if (hits.length === 0) return { text: sentence, hits };
  return { text: hits.includes("denylist") ? LINE_AVOID : LINE_FIGURES, hits };
}

// Streaming splitter: feed deltas, get complete sentences. Flushes on terminal punctuation followed by
// whitespace, on a newline, and on a comma/semicolon once the buffer is long.
export class SentenceSplitter {
  constructor({ longClause = 140 } = {}) { this.buf = ""; this.longClause = longClause; }
  push(delta) {
    this.buf += delta;
    const out = [];
    for (;;) {
      const m = /([.!?]+["')\]]*)(\s+)|(\n+)/.exec(this.buf);
      let cut = -1;
      if (m) cut = m.index + (m[1] ? m[1].length : 0);
      let end = m ? m.index + m[0].length : -1;
      if (!m && this.buf.length > this.longClause) {
        const c = /[,;:]\s/.exec(this.buf.slice(this.longClause - 20));
        if (c) { cut = this.longClause - 20 + c.index + 1; end = cut + 1; }
      }
      if (cut < 0) break;
      const s = this.buf.slice(0, cut).trim();
      this.buf = this.buf.slice(end);
      if (s) out.push(s);
    }
    return out;
  }
  flush() {
    const s = this.buf.trim();
    this.buf = "";
    return s ? [s] : [];
  }
}

// Whole-text filtering for caller-facing documents (the end-screen summary).
export function filterText(text, denylist = []) {
  const sp = new SentenceSplitter({ longClause: 1e9 });
  const sentences = [...sp.push(text + " "), ...sp.flush()];
  const hits = new Set();
  const out = sentences.map((s) => {
    const r = filterSentence(s, denylist);
    r.hits.forEach((h) => hits.add(h));
    return r.text;
  });
  return { text: out.join(" "), hits: [...hits] };
}

// Post-call scanner over agent lines. `lines` are strings (agent speech only).
export function scanAgentLines(lines, denylist = []) {
  const hits = new Set();
  for (const l of lines) detect(l, denylist).forEach((h) => hits.add(h));
  return [...hits];
}
