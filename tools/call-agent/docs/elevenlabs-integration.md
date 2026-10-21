# ElevenLabs Agents: custom LLM integration notes

Researched 21 October 2026 from the current docs. Each item says whether the docs state it or we infer it. Anything marked STEP 0 must be confirmed with a real staging agent before relying on it.

Sources:
- Custom LLM: https://elevenlabs.io/docs/eleven-agents/customization/llm/custom-llm
- Agent transfer: https://elevenlabs.io/docs/eleven-agents/customization/tools/system-tools/agent-transfer
- Dynamic variables: https://elevenlabs.io/docs/eleven-agents/customization/personalization/dynamic-variables
- Overrides: https://elevenlabs.io/docs/eleven-agents/customization/personalization/overrides
- Agent create API schema (CustomLlm, request_headers, custom_llm_extra_body): https://elevenlabs.io/docs/eleven-agents/api-reference/agents/create
- Conversation token: https://elevenlabs.io/docs/eleven-agents/api-reference/conversations/get-webrtc-token
- Signed URL: https://elevenlabs.io/docs/api-reference/conversations/get-signed-url
- Post-call webhooks: https://elevenlabs.io/docs/eleven-agents/workflows/post-call-webhooks
- Signature code (SDK `@elevenlabs/elevenlabs-js` 2.74.0, `dist/wrapper/webhooks.js`) and client SDK `@elevenlabs/client` 1.29.0 type `BaseConnection.d.ts`.

## 1. Request ElevenLabs sends to the custom LLM

- The server must mirror OpenAI **Chat Completions** (`POST <url>/chat/completions` style) or **Responses**. The agent config has `custom_llm.api_type` = `chat_completions` (default) | `responses` | `websocket`. We use `chat_completions`.
- Body fields seen in the docs' reference server: `messages` (`role`, `content`), `model`, `temperature`, `max_tokens`, `stream`, `user_id`, `tools`, and `elevenlabs_extra_body` (see section 3).
- Streaming: `Content-Type: text/event-stream`, chunks `data: {json}\n\n`, terminated by `data: [DONE]`. Errors in the docs' example are emitted as an error chunk.
- URL: `custom_llm.url` is "the URL of the Chat Completions compatible endpoint". STEP 0: confirm whether ElevenLabs appends `/chat/completions` to the configured URL. We serve both `POST /api/call/llm/<role>` and `POST /api/call/llm/<role>/chat/completions` (the second file re-exports the first), so either works.
- `model_id` is optional; we ignore the incoming `model` and use our own env.

## 2. System tools and tool calls

- Configured system tools are added to the request `tools` array in OpenAI function format (`{type:"function", function:{name, description, parameters}}`). Documented system tools: `end_call`, `language_detection`, `transfer_to_agent`, `transfer_to_number`, `skip_turn`, `voicemail_detection`.
- `transfer_to_agent` arguments: `agent_number` (integer, zero-indexed, required, index into the transfer rules configured on the calling agent), `reason` (optional). `end_call`: `reason` required, `message` optional. `skip_turn`: `reason` optional.
- To invoke one, our response must contain a standard OpenAI tool call: `tool_calls:[{index, id, type:"function", function:{name, arguments:"<JSON string>"}}]` with `finish_reason:"tool_calls"`. The docs do not show the streaming delta format beyond "standard OpenAI format"; we emit it the standard way (first delta carries id, type, name and empty arguments, next delta carries the arguments string, last chunk finish_reason). STEP 0: confirm the streamed form works; fall back to a single delta with the whole call.
- Transfer behaviour: the child agent gets the full transcript; `transfer_to_agent` tool calls are stripped from the history the child's LLM sees. The child's own config (prompt, voice, LLM, tools) applies, so each of the four agents needs its own `custom_llm` with its own URL (role in the path). The parent overwrites the child's client events and audio formats, so configure them identically on all four.
- Our own tools (`take_message`, `think`) are NOT sent to ElevenLabs; we execute them inside the endpoint and never expose them as ElevenLabs tools. We only pass through system tools in an allow-list (`transfer_to_agent`, `end_call`, `skip_turn`); `transfer_to_number`, `voicemail_detection`, `play_keypad_touch_tone` are dropped (no live human transfer in v1).

## 3. How the call id reaches the custom LLM

The docs do not give a single clear answer; three mechanisms exist, so the endpoint accepts all and uses the first present, then validates against D1:

1. **Request header from a dynamic variable (preferred).** The agent schema `custom_llm.request_headers` is a map of header name to either a literal string, a workspace secret (`{secret_id}`), a dynamic variable (`{variable_name}`), or an env var. So configure on every agent: `X-Call-Id` = dynamic variable `call_id`, `X-Call-Secret` = workspace secret, `X-Conversation-Id` = dynamic variable `system__conversation_id` (mandatory: requests without it get 400). This is a documented schema feature (agents-create API reference), not described in the custom-LLM guide page. STEP 0: confirm that dynamic variables are substituted in custom LLM headers and that the value survives a transfer.
2. **`elevenlabs_extra_body`.** Docs: extra parameters arrive as a top-level `elevenlabs_extra_body` object. The agent flag `platform_settings.overrides.custom_llm_extra_body` (default false) must be true, and the client passes `customLlmExtraBody` in the session options (client SDK type `BaseConnection.customLlmExtraBody?: unknown`). We read `elevenlabs_extra_body.call_id`.
3. **`system__conversation_id`** is a built-in dynamic variable (e.g. `conv_...`). The token endpoint also returns `conversation_id` when we mint the token, so `/api/call/start` stores it as `calls.el_conversation_id`. If neither a call id header nor extra body is present but `X-Conversation-Id` is, we look the call up by `el_conversation_id`. This one cannot be forged by the browser, so it is the strongest binding. The conversation id is required on every request and is bound to the call on the first LLM request when /start did not already store it (`UPDATE ... WHERE el_conversation_id IS NULL`); any later request with a different id is rejected, so one call id cannot be driven by several voice sessions.

Passing dynamic variables from the browser: JS client `Conversation.startSession({ dynamicVariables })`. The docs do not say that dynamic variables can be attached to a token minted server-side, so the frontend passes `dynamicVariables: {call_id}` itself (start.js returns it). Because a browser can forge it, the call id is a 128-bit capability and is validated against an active row; the conversation-id binding above is the check against forging.

Substitution of `{{call_id}}` in the ElevenLabs system prompt works (documented), but the custom LLM replaces the prompt with ours, so we do not rely on it. We append ElevenLabs' own system message (truncated to 4,000 characters) as an extra uncached system block so the system-tool guidance reaches the model.

## 4. Authentication

- Docs: the agent's custom LLM "API key" is a workspace secret; the docs do not say which header carries it. A third-party gateway guide says `Authorization: Bearer <secret>`.
- `request_headers` lets us add `X-Call-Secret` from a workspace secret explicitly. The endpoint accepts the secret in either `X-Call-Secret` or `Authorization: Bearer` and compares with `CALL_LLM_SECRET` in constant time. `auth_connection` only supports Bearer; not needed.
- STEP 0: confirm which header actually arrives.

## 5. Latency guidance

- The docs' buffer-word advice: if the LLM is slow, first stream a short filler ending in an ellipsis plus a trailing space ("Let me think about that... "), then the real completion. The trailing space matters so the next sentence is not glued to the ellipsis in TTS.
- We use this once: when the `think` tool starts and no text has been spoken in that turn, the endpoint emits "Let me think about that... ".
- Custom LLMs cannot be used with Realtime models. A "Limit token usage" setting exists in the dashboard.
- We stream the first sentence as soon as it ends (the splitter flushes on `. ! ?` plus whitespace, and on a comma after 120 characters).
- Reasoning: if the agent has "Reasoning summary" on, reasoning must be in `delta.reasoning` / `reasoning_content`. We leave it off and never stream model thinking.

## 6. Post-call webhook

- Event types: `post_call_transcription`, `post_call_audio` (audio base64; we keep audio off), `call_initiation_failure` (only for phone calls). Envelope: `{type, event_timestamp (unix, UTC), data}`.
- `post_call_transcription.data`: `agent_id`, `agent_name`, `conversation_id`, `status`, `user_id`, `branch_id`, `version_id`, `environment`, `transcript[]` (`role` user|agent, `message`, `tool_calls`, `tool_results`, `time_in_call_secs`, `conversation_turn_metrics`), `metadata` (`start_time_unix_secs`, `call_duration_secs`, `cost`, `termination_reason`), `analysis` (`call_successful`, `transcript_summary`), `conversation_initiation_client_data` (`conversation_config_override`, `custom_llm_extra_body`, `dynamic_variables`), `has_audio`, `has_user_audio`, `has_response_audio`.
- Header `ElevenLabs-Signature` (read lower-case `elevenlabs-signature`): `t=<unix seconds>,v0=<hex>`. From the SDK source: `hex = HMAC_SHA256(secret, "<t>.<raw body>")`, compared to `v0=<hex>`; the SDK rejects timestamps older than 30 minutes. Verify against the raw text body, never re-serialised JSON. Return 200 on success, 401 on bad signature.
- Retries: non-200 responses are retried; endpoints failing 10 times in a row with no success in 7 days are auto-disabled. Retries can duplicate, so dedupe on `conversation_id` (we do). Audio webhooks resend the full payload on retry.
- The webhook is configured at workspace level (a shared secret is shown on creation) and attached to agents; the secret goes in Pages secret `CALL_WEBHOOK_SECRET`.

## 7. Conversation token endpoint

- `GET https://api.elevenlabs.io/v1/convai/conversation/token?agent_id=<id>[&participant_name=][&branch_id=][&version_id=][&environment=]` with header `xi-api-key`. Response `{token, conversation_id}`. The docs do not state the expiry; treat as short-lived and single use (the plan relies on this; STEP 0 to confirm).
- Signed URL (WebSocket) alternative: `GET /v1/convai/conversation/get-signed-url?agent_id=...&include_conversation_id=true`. Regional hosts exist (US, EU, India, Singapore); data residency is a privacy-notice item.
- Text-only mode: the client SDK has a text-only option, and an override `text_only` exists but is disabled by default in the agent security settings. STEP 0: confirm text conversations accept the same token and that transfers work in text mode.

## 8. Contradictions or risks against PLAN v4

1. The plan says `call_id` reaches the endpoint "as a dynamic variable". The docs do not say dynamic variables are included in the LLM request. The documented routes are `request_headers` (dynamic variable reference) and `elevenlabs_extra_body` (needs the security flag). Plan unchanged, mechanism specified above.
2. The plan says "single-use conversation token"; the docs do not state single use or expiry.
3. The plan says transfers are enforced by our endpoint. That holds: the transfer is a tool call we emit, so we can refuse. But refusal means our tool result must be fed to the model inside our own loop, since ElevenLabs only learns of the call if we emit it. The endpoint does this (blocked transfer never leaves the server).
4. `transfer_to_agent` takes a zero-based `agent_number` indexing the transfer rules on the calling agent. The role prompts must map names to numbers, or the harness and endpoint map the number to a role. The front desk's rule order must therefore be fixed: 0 consulting, 1 tsg, 2 customer-desk, and the three specialists need a rule back to the front desk only if we want them to return (we do not).
5. The post-call webhook header format and tolerance are not in the web docs, only in SDK source; implemented to match the SDK.
