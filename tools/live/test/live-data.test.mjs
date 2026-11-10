// node --test tools/live/test/*.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import { serveLiveData } from "../../../functions/_lib/live-data.js";

function bucket(files) {
  return {
    async get(key) {
      if (!(key in files)) return null;
      return { body: files[key], httpEtag: '"abc"', uploaded: new Date("2026-11-10T10:00:00Z") };
    },
  };
}
const env = { LIVE_DATA: bucket({ "public/uk_national.json": '[{"mw":1}]', "private/secret.json": "no" }) };
const req = (headers = {}, method = "GET") => new Request("https://arithim.com/live/data/x", { method, headers });

test("serves a public file as JSON with caching headers", async () => {
  const r = await serveLiveData(req(), env, "uk_national.json");
  assert.equal(r.status, 200);
  assert.equal(r.headers.get("content-type"), "application/json; charset=utf-8");
  assert.match(r.headers.get("cache-control"), /max-age=300/);
  assert.equal(r.headers.get("etag"), '"abc"');
  assert.equal(await r.text(), '[{"mw":1}]');
});

test("answers 304 when the copy is current", async () => {
  const r = await serveLiveData(req({ "if-none-match": '"abc"' }), env, "uk_national.json");
  assert.equal(r.status, 304);
});

test("refuses names outside the pattern, so nothing else in the bucket is reachable", async () => {
  for (const n of ["../private/secret.json", "secret", "UK.json", "a/b.json", "x.json.bak", ""]) {
    const r = await serveLiveData(req(), env, n);
    assert.equal(r.status, 404, n);
  }
});

test("missing file is a 404 and a missing binding is a 503", async () => {
  assert.equal((await serveLiveData(req(), env, "nope.json")).status, 404);
  assert.equal((await serveLiveData(req(), {}, "uk_national.json")).status, 503);
});

test("only GET and HEAD", async () => {
  assert.equal((await serveLiveData(req({}, "POST"), env, "uk_national.json")).status, 405);
  const h = await serveLiveData(req({}, "HEAD"), env, "uk_national.json");
  assert.equal(h.status, 200);
  assert.equal(await h.text(), "");
});
