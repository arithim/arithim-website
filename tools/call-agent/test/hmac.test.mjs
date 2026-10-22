import test from "node:test";
import assert from "node:assert/strict";
import { verifyElevenLabsSignature, signElevenLabs, hmacSha256Hex, safeEqual } from "../../../functions/_lib/hmac.js";

const secret = "wsec_test";
const body = JSON.stringify({ type: "post_call_transcription", data: { conversation_id: "conv_1" } });

test("valid signature passes", async () => {
  const h = await signElevenLabs(body, secret);
  assert.deepEqual(await verifyElevenLabsSignature(body, h, secret), { ok: true });
});
test("known vector matches the documented scheme t.body with v0= prefix", async () => {
  const t = 1700000000;
  const hex = await hmacSha256Hex(secret, `${t}.${body}`);
  const r = await verifyElevenLabsSignature(body, `t=${t},v0=${hex}`, secret, { nowMs: t * 1000 + 1000 });
  assert.equal(r.ok, true);
});
test("tampered body fails", async () => {
  const h = await signElevenLabs(body, secret);
  assert.equal((await verifyElevenLabsSignature(body + " ", h, secret)).reason, "mismatch");
});
test("wrong secret fails", async () => {
  const h = await signElevenLabs(body, "other");
  assert.equal((await verifyElevenLabsSignature(body, h, secret)).ok, false);
});
test("replay window: stale and future timestamps rejected", async () => {
  const now = Date.now();
  const old = await signElevenLabs(body, secret, Math.floor(now / 1000) - 1801);
  assert.equal((await verifyElevenLabsSignature(body, old, secret, { nowMs: now })).reason, "stale");
  const ok = await signElevenLabs(body, secret, Math.floor(now / 1000) - 1700);
  assert.equal((await verifyElevenLabsSignature(body, ok, secret, { nowMs: now })).ok, true);
  const fut = await signElevenLabs(body, secret, Math.floor(now / 1000) + 1000);
  assert.equal((await verifyElevenLabsSignature(body, fut, secret, { nowMs: now })).reason, "future");
});
test("malformed and missing headers", async () => {
  for (const h of [null, "", "garbage", "t=abc,v0=00", "v0=00", "t=1"]) assert.equal((await verifyElevenLabsSignature(body, h, secret)).ok, false);
  assert.equal((await verifyElevenLabsSignature(body, await signElevenLabs(body, secret), "")).ok, false);
});
test("safeEqual", () => {
  assert.ok(safeEqual("abc", "abc"));
  assert.ok(!safeEqual("abc", "abd"));
  assert.ok(!safeEqual("abc", "abcd"));
  assert.ok(!safeEqual(undefined, "x"));
});
