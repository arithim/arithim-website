# Call-agent knowledge and pack builder

Configuration for the phone agents behind the "Call us" button (plan: arithim-ops/call-agent/PLAN.md, sections 4 and 5). Nothing in this folder is published on the website.

## The three knowledge tiers

1. **Core facts, in each agent's prompt (cached).** `knowledge/claims.md`, the claims register. It is the single source for anything the agents state as fact about Arithim: who we are, services, products, case studies as the site states them, TSG security statements quoted verbatim with the security pack's Built / Partly built / Planned labels, the reply promise, contact details, and a "we do not say" list. Every claim has an id and a source tag. The prompt generator (a later step) copies this file in.
2. **Long-tail knowledge, retrieved (RAG).** `knowledge/allowlist.txt` is an explicit list of repo-relative files: the public site pages, the insights, and `knowledge/answer-gists.md` (question and answer-gist pairs grouped by agent, with the questions we cannot answer yet listed at the end). `build_pack.py` turns that list into `build/pack/<slug>.md` files, each starting with a `Source:` line, plus `build/pack/index.json`.
3. **Skills in each agent's own prompt.** The discovery playbook (consulting), "how a pilot runs" (TSG), invoice triage and complaint handling (customer desk). These live in the role prompts under `agents/` (`front-desk.md`, `consulting.md`, `tsg.md`, `customer-desk.md`); they are not part of the pack. The four assistants are Hannah (front desk), Oliver (consulting and discovery), Charlotte (Technical Sales Guide) and Daniel (customer desk). Each prompt is standalone: the shared rules (voice style, guardrails, refusal lines, tools, end of call) are repeated in each file, so a change to a shared rule is made in all four.

Rules that keep the tiers safe:

- The pack is built only from the allowlist. Nothing else is read. A path that does not exist stops the build.
- The agents never see confidential customer or prospect names or internal price figures, not even as things to avoid. Their refusal line is "I don't have information about our customers or pricing to share; Tarun can go through that with you."
- The deny-list holds those names and figures. It lives only on the Mac (and in CI as a secret) and is never committed.
- TSG facts are not on the public site. They come from the TSG docs the owner approved for phone use, and are tagged `TSG docs:` in the register. Security wording is copied, not reworded.

## Running the build

```
python3 tools/call-agent/build_pack.py
python3 -m unittest tools/call-agent/test_build_pack.py
```

Python 3.11, standard library only. The build:

1. reads `knowledge/allowlist.txt`;
2. extracts readable text from each HTML page (navigation, footer, sticky header, scripts and styles are dropped; copy that the pages keep in component properties is included; template placeholders are dropped);
3. writes `build/pack/*.md` and `build/pack/index.json` (`build/` is gitignored);
4. if `agents/` exists, writes `functions/_lib/call-knowledge.generated.js` (see below);
5. runs the deny-list check over `build/pack`, `knowledge/`, `agents/` and the generated module. The module is also checked as decoded text, because its JSON escapes would otherwise hide a term that spans a line break. On a hit the generated module is deleted.

### The generated module

`functions/_lib/call-knowledge.generated.js` is committed output; never edit it by hand. It exports:

- `ROLES`: `front-desk`, `consulting`, `tsg`, `customer-desk`, each `{displayName, system}`. `system` is the role prompt, then `# Claims register` (all of claims.md), then `# Knowledge for this role`: the answer-gist intro, that role's gist section and the shared "Not answered yet" section, then the role's public pages. Front desk gets about, index, services, contact, privacy and case studies. Consulting gets all services pages, case studies, research and insights. TSG gets no pages (none exist). Customer desk gets privacy and contact.
- `FULL_PACK`: claims, all gists and every public page, for the `think` tool.
- `VERSION`: a hash of the content. No timestamps, stable ordering, so prompt caching holds until content changes.

Changing a prompt, a claim, a gist or an allowlisted page changes `VERSION`; rebuild and commit the module with the change.

### Deny-list

- Path: `$CALL_AGENT_DENYLIST`, default `~/.config/arithim/call-agent-denylist.txt` (chmod 600, outside the repo).
- Format: one term per line; blank lines and lines starting with `#` are ignored.
- Matching: case-insensitive, whole word. Hits are listed as file, line and term, and the exit code is 1.
- If the file is missing the build prints a warning and exits 2. Pass `--allow-missing-denylist` only for a throwaway local run (for example CI before the secret is wired in); never for anything that is synced to an agent.
- Other flags: `--no-check` (build only), `--root` (another checkout).

Exit codes: 0 ok, 1 deny-list hits or a bad allowlist, 2 deny-list file missing.

## Keeping it current

- Change a fact: edit `knowledge/claims.md` first, with its source tag, then the gist that uses it (gists cite claim ids).
- Add a page to the pack: add its path to `knowledge/allowlist.txt` on purpose, then rebuild.
- Add a confidential name or figure to the deny-list as soon as it appears in any internal document, then rebuild.
- Never write a confidential name or internal price in this folder, including in comments and tests.

## Agent settings, sync and digest

- `agents/<role>.json`: ElevenLabs agent settings as data (voice placeholder, custom LLM URL and headers, transfer rules, limits, retention). The `notes` field lists anything not verified against the API docs. Placeholders: `@<role>` (agent id), `@webhook`, `{secret_name}`.
- `sync.mjs --env staging|prod [--dry-run]`: creates or patches the four agents, writes `agents.<env>.lock.json`, prints (never runs) the D1 config SQL. Test: `node --test tools/call-agent/test/sync.test.mjs`.
- `digest.py [--email]`: weekly Markdown digest from D1, no model. Test: `python3 -m unittest discover -s tools/call-agent -p 'test_*.py'`.
- Go-live steps: `arithim-ops/call-agent/RUNBOOK.md`.
