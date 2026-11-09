# "Call us" front end

Files: `assets/callus.js` (its styles are in `site.css`), `assets/vendor/elevenlabs-client-1.29.0.js`.
Every page carries a plain `<a class="callus-link" href="/contact.html">` and `<script src=/assets/callus.js?v=4 defer>`. Insight pages get them from `tools/templates/insight.html`. Without JavaScript the link goes to the contact form. `/assets/*` is served `immutable` for a year (`_headers`), so bump `?v=` in every page whenever callus.js or callus.css changes (or rename the files). `tools/stage_site.sh` also rewrites `?v=` to a content hash in the staged copy, so a deploy always busts the cache; the manual number only matters for local runs. Currently `?v=4`.

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

- Voice: `getUserMedia` first (the probe is stopped the moment it is granted; the SDK asks again and owns the only capture), then `/api/call/start`, then `Conversation.startSession({signedUrl, connectionType:"websocket", libsampleratePath, dynamicVariables:{call_id}, textOnly:false})`. For Safari, `unlockAudio()` creates and resumes an AudioContext synchronously inside the click (output only, it never captures) and closes it once the session is up. If the SDK's own capture is refused (`NotAllowedError`, `NotFoundError`) the panel shows the microphone fallback rather than a generic failure.
- Being heard (voice): the call view shows a small input level bar (`getInputVolume()` from the SDK, polled every 120 ms; the bar is `aria-hidden`) with a text label ("Waiting for you", "Hearing you", "Microphone muted"). A separate polite live region speaks only the transitions that matter ("Microphone is working", the no-input prompt, "picking you up again"). Input counts as heard at a level of 0.04 or more. Once the greeting has finished (the first return to listening after the agent spoke, or 12 s after connect if it never spoke), the clock runs only while the agent is not speaking and the mic is not muted. After 6 s with no input (10 s once the caller has been heard at least once, so a caller who is thinking is not nagged) the panel shows "We can't hear you. Check your microphone is on, or switch to text." with a "Switch to text" button. The prompt hides itself when input returns. "Switch to text" ends the voice session (a diag trail goes first) and starts a text chat through the normal `startFlow('text')`, so `obtainToken()` waits for a fresh Turnstile token. A generation counter (`S.gen`) makes the old session's late disconnect callback a no-op.
- Diag trail additions: `heard_any_audio` (boolean) and `lvl` `{min, max, n, th}` (lowest and highest input volume while unmuted, samples taken, threshold), plus events `probe_stopped`, `greeting_done`, `heard_first`, `no_input_prompt`, `switch_to_text`. 8 s budget for the SDK connect; on timeout the session is closed and text mode and the contact form are offered. Wake lock is held by callus.js (the SDK's own is off), re-acquired when the tab becomes visible.
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

## Safari: speech after the first word not reaching ElevenLabs (cycle 1 findings)

Evidence: three voice calls where the transcript holds the greeting and one word ("It's"), then silence until the 30 s no-input end; two with only the greeting (7 s and 18 s); one where the page closed after 16 s. No Safari was available for a live reproduction, so the below is read from the vendored SDK (1.29.0) and callus.js, not observed.

What the SDK does on the WebSocket path (`ay` and `Hr.create` in the bundle):

1. `getUserMedia({audio:true})` for its own permission probe, kept until the input exists.
2. A connect delay (0 ms on desktop, none set for iOS here), then the WebSocket.
3. `Hr.create` builds a NEW `AudioContext` after those awaits (so outside the click gesture), loads the libsamplerate worklet if the browser lacks the `sampleRate` constraint (Safari does), loads `rawAudioProcessor`, calls `getUserMedia` a second time with echo cancellation, noise suppression, auto gain and `voiceIsolation`, connects stream to analyser to worklet, then `await context.resume()`.
4. The SDK's own probe stream is stopped after the input and output are built.

The SDK only pre-unlocks an AudioContext inside a user gesture on iOS (`nt()` is true for iPhone/iPad and touch Macs). On desktop Safari nothing is unlocked by the SDK itself.

What callus.js did before this change: it opened its own `getUserMedia` probe in the click, kept it live through the whole connect, and stopped it only after `startSession` resolved, so up to three capture tracks overlapped and two of them were stopped within about a second of the call starting. It also held a separate unlock AudioContext for the whole call.

Likely cause, with confidence:

- Overlapping capture tracks on one Safari microphone (probe still live while the SDK opens a second, differently-constrained capture, then tracks stopped around the time the greeting plays). WebKit shares one capture source between tracks and reconfigures it (voice processing on or off) when constraints differ, and a track can end up `muted` after another track on the same source is stopped. That fits "first word heard, then nothing". Confidence: medium (about 55 percent). It is the only thing in our own code that could do this, and it is the cheapest to remove.
- The SDK's input `AudioContext` suspended or interrupted in Safari (created outside a gesture on desktop; Safari can also move a context to `interrupted` when the output `<audio>` element starts and does not resume it). The SDK awaits `resume()` once and never re-checks, and does not expose the context. Confidence: low to medium (about 25 percent). The input level indicator and the diag `lvl` summary now tell these apart: a flat level of 0 from the first sample points at a muted or suspended capture; a level that moves but never reaches ElevenLabs would show `heard_any_audio: true` with an agent that does not respond.
- Server side or ElevenLabs end-of-turn detection treating a short word followed by background noise as a finished turn. Confidence: low (about 10 percent); the "..." transcripts say the audio was silent rather than noisy.

Changes made: the permission probe is stopped as soon as it is granted so the SDK owns the only capture; the unlock AudioContext stays (output only) until the session is up, then is closed. Not changed on purpose: `preferHeadphonesForIosDevices` (it re-routes input to AirPods and similar, which is a behaviour change nobody asked for), `inputDeviceId`, and sample rate (Safari ignores the constraint and the SDK already resamples with the vendored worklet).

Risk to watch: Safari might ask for microphone permission again when the SDK opens its capture, now that our probe no longer holds the permission open. The SDK's own probe runs after the token fetch, outside the click; Safari does not require a gesture for the prompt, so the worst case is a second prompt. If it shows up in the diag trail (`mic_denied` or a `mic` fallback right after `probe_stopped`), restore the probe and stop it only once `on_connect` fires.

What to check next in a real Safari: the diag rows for `heard_any_audio` and `lvl.max` on a call where the caller spoke. `lvl.max` near 0 means the capture is dead on our side; a normal `lvl.max` with no agent reply means the audio was lost after the SDK.

## iPhone: caller not heard (cycle 2)

Evidence: every voice call where the caller was not heard came from an iPhone (Safari 18 and Chrome on iOS 26, which is WebKit too). The session connected, the greeting played, the caller's speech never reached ElevenLabs, and our probe AudioContext reported `suspended`. Desktop works. Read from the vendored SDK 1.29.0; not reproduced on a device.

What the SDK does on iOS:

- `dh()` runs when the module loads and adds capture-phase `touchstart`/`touchend`/`click` listeners that create an AudioContext, play a silent buffer and resume it inside the gesture. `lh()` later hands it to the output. We imported the module lazily inside Start call, after the tap, so those listeners never saw the tap that mattered. The output context was built after network awaits, outside any gesture.
- `Hr.create` (input) builds its own `AudioContext({sampleRate:16000})` after awaits, loads the libsamplerate and `rawAudioProcessor` worklets, calls `getUserMedia` (echoCancellation, noiseSuppression, autoGainControl, `voiceIsolation`), then awaits `resume()` once. It never re-checks the state, never calls `resume()` again, and does not expose the context. `preferHeadphonesForIosDevices` only re-routes to AirPods and is left off.
- `changeInputDevice({})` is public: it stops the capture track, calls `getUserMedia` again and reconnects a new source to the existing analyser and worklet on the same context. That is the only restart hook.

Likely cause (confidence about 50 percent, no device to confirm): the input context is suspended or goes `interrupted` after `getUserMedia` changes the audio session or the output starts, and nothing resumes it; our own unlock context being closed at connect (which can reset the iOS audio session as capture starts) may add to it. Other causes remain possible.

Changes (iOS only, detected with the SDK's own test plus the user agent; desktop behaviour is unchanged):

1. `preloadSdk()` imports the SDK when the panel opens, so its gesture unlock is registered before Start call. If it is loaded, our own `unlockAudio()` is skipped; otherwise it runs as before.
2. On iOS our unlock context is no longer closed at connect; it closes when the call ends.
3. While a voice call is set up, `window.AudioContext` is wrapped so every context is recorded. Any that is not `running` is resumed on connect (and 1 s later), on every `statechange` to `suspended` or `interrupted` (capped at 8 automatic tries) and on any tap.
4. One automatic recovery: if the caller has never been heard and the level stays flat for 4 s after the greeting, `recoverInput()` resumes all contexts and calls `changeInputDevice({})`. The "We can't hear you" prompt then waits a further 6 s.

Diag trail additions: `env.ios`, `env.wkm`, `env.tp`; events `ios` (SDK preloaded or not), `sdk_preload_ok/fail`, `ac_new` (`label:state:sampleRate`), `ac_state`, `ac_resume`, `ac_resume_fail`, `recovery_try`, `recovery_input_reopened/failed`, `recovery_worked`, `recovery_failed`; top-level `acs` (final context states) and `recovery` (`{tried, worked, states}`).

Check next on a real iPhone: `ac_new`/`ac_state` rows show whether the SDK's input context was ever `running`; `recovery_worked` means the reopen fixed it; `recovery_failed` with all contexts `running` points away from AudioContext state (look at the track `muted` state or ElevenLabs next).
