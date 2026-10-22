// Pre-speech filter. Each sentence is checked before it is streamed to the caller; a hit is replaced by a
// fixed line, never regenerated. The same detectors run over the whole transcript after the call.

export const LINE_FIGURES = "I can't give figures or commitments on a call.";
export const LINE_AVOID = "I can't go into that on a call.";

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
  ["price", /[£$€]\s?\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|mn|million|billion|thousand)\b)?|\d[\d,]*(?:\.\d+)?\s?[£$€]/i],
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

// ---- speech clean-up, masks and the caller's own figures ----

// Stray characters from another script (a CJK character in the middle of a reference read-back) are never spoken.
export function stripNonLatin(text) {
  return String(text || "").replace(/[^\p{Script=Latin}\p{Script=Common}\p{Script=Inherited}]/gu, "").replace(/[ \t]{2,}/g, " ");
}

// Our own reference read-back ("ARC-261022-AB12", or "A R C, two six one, zero two two, then A B one two") is not a price or a time.
const ARC_WRITTEN = /\bARC-\d{6}-[A-Z0-9]{4}\b/gi;
const ARC_SPOKEN = /\ba[\s,.-]+r[\s,.-]+c\b(?:[\s,.-]+(?:then|and|zero|oh|one|two|three|four|five|six|seven|eight|nine|ten|double|triple|[a-z]|\d+)\b)*/gi;
// The sanctioned reply promise may be called a promise: "the only thing I can promise is a reply within one working day".
const SANCTIONED = /\b(?:promise|commit(?:ment)?)\b[^.!?]{0,60}\bwithin\s+(?:one|1)\s+working\s+day\b/gi;
// A refusal: "I can't promise...", "I won't guarantee...", "I'm not able to commit to a time". The negated clause runs to the next
// comma, "but", "and" etc., so "I can't promise that, but Tarun will call tomorrow" still hits on the second clause.
const NEG = "(?:can(?:'|\u2019)?t|cannot|can not|won(?:'|\u2019)?t|will not|am not able to|(?:is|are) not able to|not able to|unable to|don(?:'|\u2019)?t|do not|never|not going to|not in a position to|shouldn(?:'|\u2019)?t|couldn(?:'|\u2019)?t|wouldn(?:'|\u2019)?t|no one can|nobody can)";
const NEG_VERB = "(?:promise[sd]?|guarantee[sd]?|commit(?:ment)?s?|confirm|say|tell|give|offer|know|agree|state|speak to|make)";
const NEGATED = new RegExp(`\\b${NEG}(?:\\s+(?:really|honestly|personally|even|be|able to|in a position to|going to)){0,3}\\s+${NEG_VERB}\\b(?:(?!\\s(?:but|and|though|although|however|yet|except|so)\\s)[^,;.!?])*`, "gi");

function maskedForPromises(text) {
  return text.replace(SANCTIONED, " ").replace(NEGATED, " ");
}
function maskedForAll(text) {
  return text.replace(ARC_WRITTEN, " ").replace(ARC_SPOKEN, " ");
}

// ---- amounts the caller said themselves ----
const WORD_VAL = { zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70, eighty: 80, ninety: 90 };
const NUM_RUN = new RegExp(`\\b(?:(?:${Object.keys(WORD_VAL).join("|")}|hundred|thousand|million|and|a)[\\s-]+)*(?:${Object.keys(WORD_VAL).join("|")}|hundred|thousand|million)\\b`, "gi");
const DIGIT_NUM = /\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|mn|million|billion|thousand)\b)?/gi;

function parseWords(str) {
  let total = 0, cur = 0, seen = false;
  for (const w of str.toLowerCase().split(/[\s-]+/)) {
    if (w in WORD_VAL) { cur += WORD_VAL[w]; seen = true; }
    else if (w === "hundred") { cur = (cur || 1) * 100; seen = true; }
    else if (w === "thousand") { total += (cur || 1) * 1e3; cur = 0; seen = true; }
    else if (w === "million") { total += (cur || 1) * 1e6; cur = 0; seen = true; }
    else if (w === "and" || w === "a") continue;
    else return NaN;
  }
  return seen ? total + cur : NaN;
}
function parseDigits(str) {
  const m = /^(\d[\d,]*(?:\.\d+)?)\s?(k|m|bn|mn|million|billion|thousand)?/i.exec(str);
  if (!m) return NaN;
  const base = Number(m[1].replace(/,/g, ""));
  const mult = { k: 1e3, thousand: 1e3, m: 1e6, mn: 1e6, million: 1e6, bn: 1e9, billion: 1e9 }[(m[2] || "").toLowerCase()] || 1;
  return base * mult;
}
// The value a price match stands for, or NaN if it cannot be read as one amount ("a couple of thousand quid").
export function amountValue(match) {
  const t = String(match).toLowerCase().replace(/[£$€]/g, " ");
  const dm = /\d[\d,]*(?:\.\d+)?(?:\s?(?:k|m|bn|mn|million|billion|thousand)\b)?/.exec(t);
  if (dm) return parseDigits(dm[0]);
  const stripped = t.replace(new RegExp(`\\b(?:${UNIT})\\b`, "g"), " ").replace(/\b(?:grand|k)\b/g, (g) => (g === "k" || g === "grand" ? " thousand " : g)).trim();
  if (/\b(?:couple|few|several|dozen|half)\b/.test(stripped)) return NaN;
  return parseWords(stripped);
}
export function callerAmounts(callerText) {
  const vals = new Set();
  const t = String(callerText || "");
  for (const m of t.matchAll(DIGIT_NUM)) { const v = parseDigits(m[0]); if (!Number.isNaN(v)) vals.add(v); }
  for (const m of t.matchAll(NUM_RUN)) { const v = parseWords(m[0]); if (!Number.isNaN(v)) vals.add(v); }
  return vals;
}

function priceHit(re, text, allowed) {
  if (!allowed || allowed.size === 0) return re.test(text);
  const g = new RegExp(re.source, re.flags.includes("g") ? re.flags : re.flags + "g");
  for (const m of text.matchAll(g)) {
    const v = amountValue(m[0]);
    if (Number.isNaN(v) || !allowed.has(v)) return true;
  }
  return false;
}

// Returns the list of category names that hit. Never returns the matched deny-list term.
// `callerText` (optional): what the caller has said so far; an amount they said themselves may be read back to them.
export function detect(text, denylist = [], callerText = "") {
  const hits = new Set();
  const plain = maskedForAll(String(text || ""));
  const promiseText = maskedForPromises(plain);
  const allowed = callerText ? callerAmounts(callerText) : null;
  for (const [name, re] of DETECTORS) {
    if (name === "price") { if (priceHit(re, plain, allowed)) hits.add(name); }
    else if (re.test(promiseText)) hits.add(name);
  }
  for (const re of denyRegexes(denylist)) if (re.test(text)) { hits.add("denylist"); break; }
  return [...hits];
}

// Returns {text, hits}. A deny-list hit gets LINE_AVOID; any other hit gets LINE_FIGURES.
// `context` (optional) is the whole sentence the piece came from; the date-promise check runs on it as well.
export function filterSentence(sentence, denylist = [], context = "", callerText = "") {
  sentence = stripNonLatin(sentence);
  if (!sentence.trim()) return { text: "", hits: [] };
  const hits = detect(sentence, denylist, callerText);
  if (context && context !== sentence && !hits.includes("date") && detect(stripNonLatin(context), [], callerText).includes("date")) hits.push("date");
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
export function filterText(text, denylist = [], callerText = "") {
  const sp = new SentenceSplitter({ longClause: 1e9 });
  const sentences = [...sp.push(text + " "), ...sp.flush()];
  const hits = new Set();
  const out = sentences.map((s) => {
    const r = filterSentence(s, denylist, "", callerText);
    r.hits.forEach((h) => hits.add(h));
    return r.text;
  });
  return { text: out.filter(Boolean).join(" "), hits: [...hits] };
}

// Post-call scanner over agent lines. `lines` are strings (agent speech only).
export function scanAgentLines(lines, denylist = [], callerText = "") {
  const hits = new Set();
  for (const l of lines) detect(stripNonLatin(l), denylist, callerText).forEach((h) => hits.add(h));
  return [...hits];
}
