// OpenAI chat messages <-> Anthropic Messages format, and the Anthropic SSE parser.

function textOf(content) {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((p) => (typeof p === "string" ? p : p?.text || "")).join("");
  return String(content);
}

function parseArgs(s) {
  if (s && typeof s === "object") return s;
  try { const v = JSON.parse(s || "{}"); return v && typeof v === "object" && !Array.isArray(v) ? v : {}; } catch { return {}; }
}

// Returns {system: string[] (system messages from ElevenLabs), messages: Anthropic messages}.
// - system messages are collected separately
// - assistant tool_calls become tool_use blocks, tool messages become tool_result blocks in the next user turn
// - orphan tool results (no matching tool_use) become plain text
// - consecutive same-role messages are merged; the list starts and ends with a user message
export function openaiToAnthropic(openaiMessages) {
  const system = [];
  const out = [];
  const pushBlocks = (role, blocks) => {
    if (!blocks.length) return;
    const last = out[out.length - 1];
    if (last && last.role === role) last.content.push(...blocks);
    else out.push({ role, content: [...blocks] });
  };
  const knownToolUse = new Set();
  for (const m of openaiMessages || []) {
    if (!m || typeof m !== "object") continue;
    if (m.role === "system" || m.role === "developer") {
      const t = textOf(m.content).trim();
      if (t) system.push(t);
    } else if (m.role === "user") {
      const t = textOf(m.content).trim();
      if (t) pushBlocks("user", [{ type: "text", text: t }]);
    } else if (m.role === "assistant") {
      const blocks = [];
      const t = textOf(m.content).trim();
      if (t) blocks.push({ type: "text", text: t });
      for (const tc of m.tool_calls || []) {
        const id = tc.id || `toolu_${knownToolUse.size}_${(tc.function?.name || "x")}`;
        knownToolUse.add(id);
        blocks.push({ type: "tool_use", id, name: tc.function?.name || "unknown", input: parseArgs(tc.function?.arguments) });
      }
      pushBlocks("assistant", blocks);
    } else if (m.role === "tool") {
      const t = textOf(m.content) || "(no output)";
      if (m.tool_call_id && knownToolUse.has(m.tool_call_id)) {
        pushBlocks("user", [{ type: "tool_result", tool_use_id: m.tool_call_id, content: t }]);
      } else {
        pushBlocks("user", [{ type: "text", text: `[tool result] ${t}` }]);
      }
    }
  }
  // tool_result blocks must come first in a user message
  for (const m of out) {
    if (m.role === "user") m.content.sort((a, b) => (a.type === "tool_result" ? 0 : 1) - (b.type === "tool_result" ? 0 : 1));
  }
  // An assistant tool_use not followed by a tool_result would be rejected: drop those tool_use blocks.
  for (let i = 0; i < out.length; i++) {
    const m = out[i];
    if (m.role !== "assistant") continue;
    const next = out[i + 1];
    const answered = new Set((next?.content || []).filter((b) => b.type === "tool_result").map((b) => b.tool_use_id));
    m.content = m.content.filter((b) => b.type !== "tool_use" || answered.has(b.id));
  }
  const cleaned = out.filter((m) => m.content.length > 0);
  // merge again after dropping
  const merged = [];
  for (const m of cleaned) {
    const last = merged[merged.length - 1];
    if (last && last.role === m.role) last.content.push(...m.content);
    else merged.push(m);
  }
  if (merged.length === 0 || merged[0].role !== "user") merged.unshift({ role: "user", content: [{ type: "text", text: "(The call has just connected.)" }] });
  if (merged[merged.length - 1].role !== "user") merged.push({ role: "user", content: [{ type: "text", text: "(The caller has said nothing.)" }] });
  return { system, messages: merged };
}

export function openaiToolsToAnthropic(tools) {
  const out = [];
  for (const t of tools || []) {
    const f = t?.function;
    if (t?.type !== "function" || !f?.name) continue;
    out.push({
      name: f.name,
      description: f.description || "",
      input_schema: f.parameters && typeof f.parameters === "object" ? f.parameters : { type: "object", properties: {} },
    });
  }
  return out;
}

// Parse an Anthropic SSE body into events. Yields parsed JSON objects (skips ping and non-JSON).
export async function* sseEvents(body) {
  const reader = body.getReader();
  const dec = new TextDecoder();
  let buf = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buf += dec.decode(value, { stream: true });
      let i;
      while ((i = buf.search(/\r?\n\r?\n/)) >= 0) {
        const raw = buf.slice(0, i);
        buf = buf.slice(i).replace(/^\r?\n\r?\n/, "");
        const data = raw.split(/\r?\n/).filter((l) => l.startsWith("data:")).map((l) => l.slice(5).trimStart()).join("\n");
        if (!data || data === "[DONE]") continue;
        try { yield JSON.parse(data); } catch {}
      }
    }
    const tail = buf.trim();
    if (tail.startsWith("data:")) { try { yield JSON.parse(tail.slice(5).trim()); } catch {} }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
}

// OpenAI streaming chunk builders.
export function chunk(id, model, delta, finish = null) {
  return { id, object: "chat.completion.chunk", created: Math.floor(Date.now() / 1000), model, choices: [{ index: 0, delta, finish_reason: finish }] };
}
