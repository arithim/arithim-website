# "Call us" front end

Files: `assets/callus.js`, `assets/callus.css`, `assets/vendor/elevenlabs-client-1.29.0.js`.
Every page carries `<link rel=stylesheet href=/assets/callus.css?v=3>`, a plain `<a class="callus-link" href="/contact.html">` and `<script src=/assets/callus.js?v=3 defer>`. Insight pages get them from `tools/templates/insight.html`. Without JavaScript the link goes to the contact form. `/assets/*` is served `immutable` for a year (`_headers`), so bump `?v=` in every page whenever callus.js or callus.css changes (or rename the files). `tools/stage_site.sh` also rewrites `?v=` to a content hash in the staged copy, so a deploy always busts the cache; the manual number only matters for local runs. Currently `?v=3`.

On index.html and contact.html there is also an inline `<a class="callus-link callus-cta">` as the main call-to-action; the email addresses stay as secondary links.

## Vendored SDK

- Package: `@elevenlabs/client` **1.29.0** (esbuild 0.28.2), built 21 Oct 2026 in a scratch dir.
- File: `assets/vendor/elevenlabs-client-1.29.0.js`, 634,494 bytes, minified ESM exporting `Conversation`.
- sha256: `cfeb97d4ce9bc2ba7016145a43f221e8d2fed48f5a6efa21466f941f0a5b7322`
- Build:

```
mkdir elbundle && cd elbundle && npm init -y
npm i --save-exact @elevenlabs/client@1.29.0 esbuild@0.28.2
echo 'export { Conversation } from "@elevenlabs/client";' > entry.js
./node_modules/.bin/esbuild entry.js --bundle --minify --format=esm --platform=browser --target=es2020 --legal-comments=none --outfile=out.js
cp out.js <site>/assets/vendor/elevenlabs-client-1.29.0.js
```

- To upgrade: repeat with the new version, change `SDK_FILE` in callus.js, bump `?v=`, update this record.
- Third-party URLs inside the bundle: on the WebSocket audio path the SDK loads `libsamplerate.worklet.js` from cdn.jsdelivr.net when the browser cannot create a 16 kHz AudioContext (Safari). Both modes now use WebSocket, so the file is vendored: `assets/vendor/libsamplerate.worklet-2.1.2.js`, 2,016,428 bytes, `@alexanderolsen/libsamplerate-js@2.1.2` `dist/libsamplerate.worklet.js` (the exact URL in the bundle), sha256 `ca6e162f194d3ee5a2d2cd3c3b49641d31e56845aeae507feca1cdf8aa8116cb`. Download: `curl -fsSL https://cdn.jsdelivr.net/npm/@alexanderolsen/libsamplerate-js@2.1.2/dist/libsamplerate.worklet.js`. The SDK has a `libsampleratePath` option, so the bundle is NOT patched; callus.js passes the absolute URL of the vendored copy to `startSession`. If the SDK is upgraded, re-check that the bundle's jsdelivr URL still names the same version. The SDK's worklets are created from blob: URLs, so a future CSP needs `blob:` in `script-src`/`worker-src`.

## API contract the front end assumes

- `POST /api/call/start` `{turnstileToken, mode: "voice"|"text"}`
  - 200 `{callId, signedUrl, agent?: {name}, agents?: {<agent_id>: {name}|name}}` (both modes use the WebSocket transport; WebRTC tokens are no longer issued); 200 `{mock: true}` forces the demo.
  - 503 calls disabled, 429 budget spent (both go to the contact form); 400/403 failed human check (back to the start screen); anything else is a generic failure with text/contact fallbacks.
- `GET /api/call/summary?callId=…` 200 `{summary: "text"}`; 202 or `{status:"pending"}` means not ready (polled every 1.5 s, up to 24 times, then the panel offers the contact form).
- `POST /api/call/summary` `{callId, helpful: boolean}`.
- Only `callId` ever appears in a URL.
- Book link: set `data-book-url="https://…"` on the callus.js script tag or `window.ARITHIM_CALLUS = {bookUrl}`; https only; absent means no link.

## Behaviour

- Voice: `getUserMedia` first (tracks stopped at once; the SDK asks again), then `/api/call/start`, then `Conversation.startSession({signedUrl, connectionType:"websocket", libsampleratePath, dynamicVariables:{call_id}, textOnly:false})`. For Safari, `unlockAudio()` creates and resumes an AudioContext synchronously inside the click, and the mic probe stream is kept open until the session is up (the SDK builds its own AudioContext after the network round trip, when the gesture may be gone). 8 s budget for the SDK connect; on timeout the session is closed and text mode and the contact form are offered. Wake lock is held by callus.js (the SDK's own is off), re-acquired when the tab becomes visible.
- Text mode: `startSession({..., textOnly: true})` returns a `TextConversation` (no microphone, no audio). It uses the same signed URL over WebSocket as voice. Replies arrive through `onMessage`, user input goes out with `sendUserMessage(text)`. The agents, transfers and the custom-LLM brain are the same as voice, because the agent configuration is unchanged. Not yet tested against a live ElevenLabs agent: the backend must issue a token that permits text-only use.
- Agent names: the SDK's message events carry no agent name. The label starts as `agent.name` from the start response (default "Front desk"). On a `transfer*` tool call the status shows "Transferring you"; when the tool response arrives, callus.js tries to read an agent name from `full_tool_result` (`agent_name`, or `agent_id` looked up in `agents`), else shows "Colleague". If the backend wants exact names after a transfer, put the roster in the start response and make the transfer tool result JSON include `agent_id`. Needs checking against a real transfer.
- Closing the panel (X or Esc) while a call is live asks "End and close / Keep going" first.
- Accessibility: `role=dialog aria-modal`, focus trap, Esc, focus returns to the opener, `role=status` and `role=log aria-live=polite` for status and captions, animations only under `prefers-reduced-motion: no-preference`.

## Local review and mock mode

Static server in the repo root: `python3 -m http.server 8765`, open `http://localhost:8765/`. On localhost only: a 404 from `/api/call/start` switches to mock mode (scripted front desk to consulting transfer, then a sample summary), and the Turnstile requirement is dropped after 2.5 s if the widget does not produce a token. Adding `#callus-mock` to the URL skips the microphone and the API completely (used for the screenshots; useful where there is no microphone). The panel says "Preview mode" while mocking. In production a 404 is treated as a failure.

Screenshots are in `docs/screens/` (desktop 800x600 pane and 375 px wide; the 375 px set was taken on a minimal responsive test page, see below).

## Known limitation outside this widget

The existing site pages have no responsive CSS (no media queries, fixed 40 px gutters and multi-column grids). On a phone the layout viewport grows to about 1070 px and the page is shown zoomed out, so any fixed element, including this button, looks small. The widget itself is built for 360 px and was checked at 375 px on a responsive test page; it will look right on phones once the pages get a mobile layout.

## Backend notes (added by the backend build)

- `/api/call/start` returns `{callId, signedUrl, agent:{id,name}, agents:{<agent_id>: <displayName>}, mode, mock?, conversationId (null: the LLM endpoint binds it on the first request), dynamicVariables:{call_id}, maxSeconds, wrapUpSeconds}`. `agents` is built from `config.agent_roster` (JSON id to role) with names from `ROLES[role].displayName`; if the roster is empty only the front desk is listed and later transfers fall back to "Colleague".
- Status codes: 503 `{error:"calls_off"}` when switched off or no agent configured; 429 for IP limit, budget spent, text limit or too many concurrent calls (`error` says which); 403 failed Turnstile or Origin; 400 bad body; 502 ElevenLabs signed-URL failure. All error bodies carry `fallback` ("form" or "text").
- Mock: with `CALL_MOCK=1` on a NON-production host (never on arithim.com / www.arithim.com) the response has `mock: true` and a fake signed URL; the D1 call row is still created so the llm endpoint can be exercised.
- Text-only: the token endpoint has NO text-only parameter (query params: agent_id, participant_name, branch_id, version_id, environment). Text-only is a client-side session option (`textOnly: true`, sent as the `conversation.text_only` override), and ElevenLabs rejects overrides that are not enabled in the agent's Security tab. Step 0: enable the "Text only" override on all four agents, and confirm the same token works with `textOnly: true`. `/start` now returns a signed URL (`GET /v1/convai/conversation/get-signed-url`) for both modes.
- The call id reaches the brain via the agent's `custom_llm.request_headers` (`X-Call-Id` = dynamic variable `call_id`), which is why the front end must pass `dynamicVariables:{call_id}` (it does). `customLlmExtraBody` is not needed.
- Transfer results do not carry `agent_id`; the roster only helps if the front end can learn the id some other way. Treat exact post-transfer names as a step-0 check.

## Human check (Turnstile) and retries

A Turnstile token is single use. `obtainToken()` hands out the current token and clears it; every `/api/call/start` attempt (first call, retry, text after a failed voice attempt, "Try again") calls it. If no token is ready it moves the widget into the connecting view (a widget detached from the page never finishes a new challenge, which was the cause of "The human check did not complete" after a failed voice attempt), resets it, and waits up to 20 s (one extra reset at 8 s). Timeout shows the fallback with "Try again". Only the server answer `challenge verification failed` maps to "The human check did not pass".
