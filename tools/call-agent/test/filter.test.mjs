import test from "node:test";
import assert from "node:assert/strict";
import { detect, filterSentence, SentenceSplitter, filterText, parseDenylist, LINE_FIGURES, LINE_AVOID, scanAgentLines } from "../../../functions/_lib/filter.js";

test("currency and number-word prices are caught", () => {
  for (const s of ["It costs £5,000 a month.", "About $20k.", "That is 300 euros.", "Roughly two thousand pounds.", "It's 50 quid.", "Around 1.5m dollars."]) {
    assert.ok(detect(s).includes("price"), s);
  }
});
test("guarantees and promises", () => {
  for (const s of ["We guarantee results.", "I promise it will work.", "Guaranteed delivery.", "We can promise that."]) assert.ok(detect(s).includes("guarantee"), s);
});
test("promised dates", () => {
  for (const s of ["Tarun will call you tomorrow.", "We'll get back to you by Friday.", "He will email you on the 3rd.", "We will send it before the end of the week.", "Tarun will ring you this afternoon."]) assert.ok(detect(s).includes("date"), s);
});
test("allowed lines pass", () => {
  for (const s of ["A person will reply within one working day.", "We help with AI readiness and automation.", "Your reference is ARC-261021-AB2C.", "I can take a message for Tarun.", "Our offices are in London."]) {
    assert.deepEqual(detect(s), [], s);
  }
});
test("denylist matches whole words, case-insensitively, and is replaced with a fixed line", () => {
  const dl = parseDenylist("# comment\nAcme Holdings\nzx\nSecretco\n");
  assert.deepEqual(dl, ["Acme Holdings", "Secretco"]);
  assert.equal(filterSentence("We worked with acme   holdings last year.", dl).text, LINE_AVOID);
  assert.equal(filterSentence("Secretcos is different.", dl).text, "Secretcos is different.");
  assert.equal(filterSentence("It is £10.", dl).text, LINE_FIGURES);
});
test("denylist hit never exposes the term", () => {
  const r = filterSentence("Secretco is a client", ["Secretco"]);
  assert.deepEqual(r.hits, ["denylist"]);
  assert.ok(!r.text.includes("Secretco"));
});
test("splitter yields sentences as deltas arrive and flushes the tail", () => {
  const sp = new SentenceSplitter();
  const out = [];
  for (const d of ["Hello the", "re. How can ", "I help? Sure", "thing"]) out.push(...sp.push(d));
  assert.deepEqual(out, ["Hello there.", "How can I help?"]);
  assert.deepEqual(sp.flush(), ["Surething"]);
});
test("splitter does not split inside numbers", () => {
  const sp = new SentenceSplitter();
  assert.deepEqual([...sp.push("Version 2.5 is out. Next "), ...sp.flush()], ["Version 2.5 is out.", "Next"]);
});
test("splitter breaks a very long clause at a comma", () => {
  const sp = new SentenceSplitter({ longClause: 60 });
  const out = sp.push("word ".repeat(14) + "end, and more words keep coming without any full stop at all here");
  assert.equal(out.length, 1);
});
test("filterText replaces only offending sentences", () => {
  const r = filterText("We talked about automation. It would cost £500. Next step is a reply.");
  assert.equal(r.text, `We talked about automation. ${LINE_FIGURES} Next step is a reply.`);
  assert.deepEqual(r.hits, ["price"]);
});
test("scanAgentLines", () => {
  assert.deepEqual(scanAgentLines(["hello", "we guarantee it"]), ["guarantee"]);
});

// ---- code review H2/M3: widened grammar ----
test("review phrases: spoken figures in every form are caught", () => {
  for (const s of [
    "a million pounds", "two million pounds", "half a million euros", "one point five million pounds",
    "eleven pounds", "fourteen pounds", "nineteen pounds", "thirty pounds", "forty pounds", "sixty pounds", "seventy pounds", "eighty pounds", "ninety pounds",
    "about 5k", "five k a month", "ten grand", "five hundred bucks", "a hundred and fifty pounds", "a couple of thousand quid",
    "GBP 5000", "USD 500", "EUR 500", "pounds sterling five thousand", "5,000 GBP", "It costs a grand.", "Only a pound.", "three billion dollars", "about 30k",
  ]) assert.ok(detect(s).includes("price"), s);
});
test("review phrases: open-ended time promises are caught", () => {
  for (const s of [
    "You'll hear back next week.", "He will be in touch in 2 hours.", "We'll reply in two hours.", "Tarun will reply by Friday.",
    "Tarun will call you tomorrow.", "We will respond within 24 hours.", "You can expect a reply within the next hour.",
    "We'll be in touch within a couple of days.", "He'll get back to you later today.", "Someone will get back to you in a few days.",
  ]) assert.ok(detect(s).includes("date"), s);
});
test("normal speech and the sanctioned reply promise are not filtered", () => {
  for (const s of [
    "A person will reply within one working day.", "Tarun will reply within one working day.", "One working day.",
    "We have three people on the team.", "About forty suppliers a month.", "That is a grand idea.", "It takes a few minutes to explain.",
    "We will go through it in three steps.", "I'd like to take a few details.", "Thirty suppliers use it.", "Version 2.5 is out.",
  ]) assert.deepEqual(detect(s), [], s);
});
test("a date promise cut at a long-clause comma is still caught on the whole sentence", () => {
  const text = "Tarun will go through everything you have told me about the supplier approvals process and the spreadsheets your team use today and then, reply by Friday";
  const sp = new SentenceSplitter();
  const pieces = [], ctx = [];
  for (const d of text.match(/.{1,17}/g)) { sp.push(d).forEach((x, i) => { pieces.push(x); ctx.push(sp.contexts[i]); }); }
  sp.flush().forEach((x, i) => { pieces.push(x); ctx.push(sp.contexts[i]); });
  assert.ok(pieces.length >= 2);
  const out = pieces.map((p, i) => filterSentence(p, [], ctx[i]));
  assert.ok(out.some((r) => r.text === LINE_FIGURES), "second piece is replaced");
  assert.ok(!out.map((r) => r.text).join(" ").includes("Friday"));
});
test("the filter only ever sees agent speech: a caller's own figures are not flagged", () => {
  assert.deepEqual(scanAgentLines(["Hello, how can I help?"]), []);
  // the caller said it; only agent lines are passed to the scanner
  const lines = [{ agent: false, text: "We pay about forty pounds a month, ten grand a year" }, { agent: true, text: "Thanks, I will take a message." }];
  assert.deepEqual(scanAgentLines(lines.filter((l) => l.agent).map((l) => l.text)), []);
});
