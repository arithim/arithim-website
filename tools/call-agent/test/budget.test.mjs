import test from "node:test";
import assert from "node:assert/strict";
import { makeDb, seedCall } from "./helpers.mjs";
import { reserveIp, reserveGlobal, reserveText, releaseCall, insertCallIfRoom, releaseGlobal } from "../../../functions/_lib/budget.js";
import { getConfig, ipPrefix, ipKey } from "../../../functions/_lib/d1.js";

const DAY = "2026-10-21";

test("per-IP: 2 calls and 30 minutes a day", async () => {
  const db = makeDb(); const cfg = await getConfig(db);
  assert.equal(await reserveIp(db, "ipA", DAY, 15, cfg), true);
  assert.equal(await reserveIp(db, "ipA", DAY, 15, cfg), true);
  assert.equal(await reserveIp(db, "ipA", DAY, 15, cfg), false); // third call
  assert.equal(await reserveIp(db, "ipB", DAY, 15, cfg), true); // other IP unaffected
});
test("per-IP minutes cap bites before the call cap", async () => {
  const db = makeDb(); const cfg = { ...(await getConfig(db)), ip_day_calls_cap: 5 };
  assert.equal(await reserveIp(db, "ipA", DAY, 20, cfg), true);
  assert.equal(await reserveIp(db, "ipA", DAY, 20, cfg), false);
});
test("global day cap 60 min, 4 full calls", async () => {
  const db = makeDb(); const cfg = await getConfig(db);
  const r = [];
  for (let i = 0; i < 5; i++) r.push(await reserveGlobal(db, DAY, 15, cfg));
  assert.deepEqual(r, [true, true, true, true, false]);
});
test("month cap 300 across days", async () => {
  const db = makeDb(); const cfg = { ...(await getConfig(db)), day_minutes_cap: 1000 };
  let ok = 0;
  for (let d = 1; d <= 28; d++) for (let i = 0; i < 2; i++) if (await reserveGlobal(db, `2026-10-${String(d).padStart(2, "0")}`, 15, cfg)) ok++;
  assert.equal(ok, 20); // 20 x 15 = 300
  assert.equal(await reserveGlobal(db, "2026-11-01", 15, cfg), true); // next month is free
});
test("concurrent reservations cannot oversubscribe", async () => {
  const db = makeDb(); const cfg = await getConfig(db);
  const res = await Promise.all(Array.from({ length: 10 }, () => reserveGlobal(db, DAY, 15, cfg)));
  assert.equal(res.filter(Boolean).length, 4);
});
test("release returns unused minutes and the day can be reused", async () => {
  const db = makeDb(); const cfg = await getConfig(db);
  const c = await seedCall(db, { day: DAY, ip_key: "ipA" });
  assert.equal(await reserveIp(db, "ipA", DAY, 15, cfg), true);
  assert.equal(await reserveGlobal(db, DAY, 15, cfg), true);
  await releaseCall(db, { ...c, mode: "voice" }, 3);
  const g = await db.prepare("SELECT reserved_minutes, used_minutes FROM budgets WHERE day = ?").bind(DAY).first();
  assert.equal(g.reserved_minutes, 3); assert.equal(g.used_minutes, 3);
  const ip = await db.prepare("SELECT calls, minutes FROM ip_budgets WHERE ip_key = 'ipA'").first();
  assert.equal(ip.minutes, 3); assert.equal(ip.calls, 1); // the call still counts against the 2-per-day limit
});
test("release never goes negative", async () => {
  const db = makeDb();
  await db.prepare("INSERT INTO budgets (day) VALUES (?)").bind(DAY).run();
  await releaseGlobal(db, DAY, 15, 0);
  assert.equal((await db.prepare("SELECT reserved_minutes AS r FROM budgets").first()).r, 0);
});
test("concurrency cap: only 2 active voice calls", async () => {
  const db = makeDb(); const now = 1_800_000_000;
  const mk = (id) => ({ call_id: id.repeat(32), created_at: now, day: DAY, ip_key: "x", mode: "voice", reserved_minutes: 15 });
  assert.equal(await insertCallIfRoom(db, mk("1"), 2, 1200, now), true);
  assert.equal(await insertCallIfRoom(db, mk("2"), 2, 1200, now), true);
  assert.equal(await insertCallIfRoom(db, mk("3"), 2, 1200, now), false);
  // an old call outside the window no longer counts
  assert.equal(await insertCallIfRoom(db, mk("4"), 2, 1200, now + 5000), true);
});
test("text conversations: per IP 3 and global 20 a day; failed global rolls the IP back", async () => {
  const db = makeDb(); const cfg = { ...(await getConfig(db)), text_day_cap: 4 };
  const r = [];
  for (let i = 0; i < 4; i++) r.push(await reserveText(db, "ipA", DAY, cfg));
  assert.deepEqual(r, [true, true, true, false]);
  assert.equal(await reserveText(db, "ipB", DAY, cfg), true);
  assert.equal(await reserveText(db, "ipC", DAY, cfg), false);
  assert.equal((await db.prepare("SELECT text_conversations AS n FROM ip_budgets WHERE ip_key='ipC'").first()).n, 0);
});
test("ip prefix: IPv6 reduced to /64; keys are hashed", async () => {
  assert.equal(ipPrefix("2001:db8:1:2:aaaa:bbbb:cccc:dddd"), "2001:db8:1:2");
  assert.equal(ipPrefix("2001:db8::1"), "2001:db8:0:0");
  assert.equal(ipPrefix("203.0.113.9"), "203.0.113.9");
  assert.equal(await ipKey("2001:db8:1:2::1", "s"), await ipKey("2001:db8:1:2:ffff::9", "s"));
  assert.notEqual(await ipKey("1.2.3.4", "s"), await ipKey("1.2.3.4", "t"));
});
