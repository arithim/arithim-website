// Pre-speech filter. Each sentence is checked before it is streamed to the caller; a hit is replaced by a
// fixed line, never regenerated. The same detectors run over the whole transcript after the call.

export const LINE_FIGURES = "I can't give figures or promises on a call; Tarun will cover that with you.";
export const LINE_AVOID = "I'd rather not go into that on a call; Tarun can cover it with you.";

// Number vocabulary for the price and time detectors. CORE words are quantities; FILL words may sit between them
// ("half a million", "a hundred and fifty", "one point five million").
const CORE = "\\d[\\d,.]*|zero|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|million|billion|half|couple|few|several|dozen|k";
const FILL = "a|an|of|and|point";
const UNIT = "pounds?(?:\\s+sterling)?|quid|dollars?|euros?|bucks?|gbp|usd|eur|pence|cents?";
const NUMWORD = "one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety";
const COUNT = `\\d+|${NUMWORD}|a|an|a couple of|a few|several|half an?`;
const DAYS = "monday|tuesday|wednesday|thursday|friday|saturday|sunday";
const MONTHS = "jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?";
const PROMISE = "(?:\\bwill|\\bshall|'ll|\\bgoing to|\\bgonna|\\bcan expect|\\bshould hear)";
// "within one working day" is the sanctioned reply promise and is NOT matched: "working" sits between the count and "day".
const WITHIN = `within\\s+(?:(?:the\\s+(?:next|first)\\s+)(?:(?:${COUNT})\\s+)?|(?:${COUNT})\\s+)(?:hours?|minutes?|days?|weeks?)\\b`;
const DATE_TIME = [
  `\\b(?:by|on|before|until)\\s+(?:${DAYS}|tomorrow|tonight|(?:the\\s+)?\\d{1,2}(?:st|nd|rd|th)?\\b|(?:next|this)\\s+(?:week|month|${DAYS})|(?:the\\s+)?end of (?:the\\s+)?(?:day|week|month|year)|(?:${MONTHS})\\b)`,
  "\\b(?:tomorrow|tonight|later today|next (?:week|month)|this week|first thing)\\b",
  `\\bin\\s+(?:the\\s+next\\s+)?(?:(?:${COUNT})\\s+)?(?:hours?|minutes?|days?|weeks?)\\b`,
  `\\b${WITHIN}`,
].join("|");

const DETECTORS = [
  ["price", /[£$€]\s?\d|\d\s?[£$€]/],
  // quantity words/digits then a currency word: "ten grand" is handled below
  ["price", new RegExp(`\\b(?:(?:${CORE}|${FILL})[\\s-]+)*(?:${CORE})\\s?(?:${UNIT})\\b`, "i")],
  ["price", new RegExp(`\\b\\d[\\d,.]*\\s?(?:k|m|bn|mn)\\s?(?:${UNIT})\\b`, "i")],
  ["price", /\ba\s+(?:pound|dollar|euro|quid|buck)\b(?!-)/i],
  // "5k", "five k", "30K a year"
  ["price", /\b\d[\d,.]*\s?(?:k|bn)\b/i],
  ["price", new RegExp(`\\b(?:${NUMWORD}|hundred|thousand|million|billion|couple|few|several|dozen)\\s+(?:k|grand)\\b`, "i")],
  ["price", /\ba\s+grand\b(?=\s*(?:[.,!?;]|$|a\b|per\b|each\b|or\b|to\b|for\b|and\b))/i],
  // currency code before the figure, "pounds sterling five thousand"
  ["price", new RegExp(`\\b(?:gbp|usd|eur)\\s?(?:${CORE})\\b`, "i")],
  ["price", new RegExp(`\\b(?:pounds\\s+sterling|sterling)\\s+(?:${CORE})\\b`, "i")],
  ["guarantee", /\bguarantee[sd]?\b/i],
  ["guarantee", /\b(?:i|we)\s+(?:can\s+|do\s+)?promise\b|\bi\s+swear\b|\bwe\s+promise\b|\bpromised\b/i],
  // a promise word followed, anywhere in the same sentence, by a time
  ["date", new RegExp(`${PROMISE}\\b[^.!?]*(?:${DATE_TIME})`, "i")],
  ["date", new RegExp(`${PROMISE}\\b[^.!?]*\\b(?:call|ring|email|e-mail|reply|respond|contact|get back|hear back|be in touch|send)[^.!?]*\\b(?:today|this (?:morning|afternoon|evening)|${DAYS})\\b`, "i")],
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
// `context` (optional) is the whole sentence the piece came from; the date-promise check runs on it as well.
export function filterSentence(sentence, denylist = [], context = "") {
  const hits = detect(sentence, denylist);
  if (context && context !== sentence && !hits.includes("date") && detect(context).includes("date")) hits.push("date");
  if (hits.length === 0) return { text: sentence, hits };
  return { text: hits.includes("denylist") ? LINE_AVOID : LINE_FIGURES, hits };
}

// Streaming splitter: feed deltas, get complete sentences. Flushes on terminal punctuation followed by
// whitespace, on a newline, and on a comma/semicolon once the buffer is long.
// `contexts` runs parallel to the last push()/flush() result: for each piece, the text of its whole sentence so far
// (earlier long-clause pieces included), so a date promise split at a comma is still seen as one sentence.
export class SentenceSplitter {
  constructor({ longClause = 140 } = {}) { this.buf = ""; this.longClause = longClause; this.sentence = ""; this.contexts = []; }
  push(delta) {
    this.buf += delta;
    this.contexts = [];
    const out = [];
    for (;;) {
      const m = /([.!?]+["')\]]*)(\s+)|(\n+)/.exec(this.buf);
      let cut = -1;
      let terminal = false;
      if (m) { cut = m.index + (m[1] ? m[1].length : 0); terminal = true; }
      let end = m ? m.index + m[0].length : -1;
      if (!m && this.buf.length > this.longClause) {
        const c = /[,;:]\s/.exec(this.buf.slice(this.longClause - 20));
        if (c) { cut = this.longClause - 20 + c.index + 1; end = cut + 1; }
      }
      if (cut < 0) break;
      const s = this.buf.slice(0, cut).trim();
      this.buf = this.buf.slice(end);
      this.sentence = (this.sentence ? this.sentence + " " : "") + s;
      if (s) { out.push(s); this.contexts.push(this.sentence.slice(-600)); }
      if (terminal) this.sentence = "";
    }
    return out;
  }
  flush() {
    const s = this.buf.trim();
    this.buf = "";
    this.contexts = [];
    const whole = ((this.sentence ? this.sentence + " " : "") + s).slice(-600);
    this.sentence = "";
    if (!s) return [];
    this.contexts.push(whole);
    return [s];
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
