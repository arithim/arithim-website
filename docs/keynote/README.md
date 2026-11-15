# Slide decks on insight pages

When Tarun gives an insight as a talk, workshop or panel, the slides go on that insight's page, between the title and the article. There is one URL per topic. The article underneath is what ranks in search and gets quoted in AI answers; the deck is what people pass round after the event. The last slide carries a QR code to the page, so Tarun can end a talk on it and the room can open the same slides on their phones.

Six insights have decks so far. Each deck lives in `content/keynotes/<slug>.md`, under the same slug as its insight:

- what-is-agentic-ai-where-is-it-working
- how-to-review-ai-written-code (the Don't Ship Slop talk)
- how-to-onboard-ai-agents (the Hiring the Machine Workforce talk)
- why-ai-pilots-stall-before-production (the From Pilot to Production talk)
- what-businesses-need-from-ai
- operational-intelligence-vs-automation

## What the deck does

- Arrow keys, swipes and taps on either side of a slide move through it. Every slide has its own link (`#slide-5`), so someone can share the one slide they photographed.
- On a phone the slides reflow onto a 9:16 portrait canvas instead of shrinking a 16:9 slide until the text is unreadable. Most people will arrive from the QR code on a phone.
- Present fills the screen, so Tarun can present from the page itself with no separate file.
- Save as PDF prints one slide per landscape page and nothing else.
- Speaker notes sit in a collapsed "Speaker notes" box under the deck.
- The slides always use the dark brand deck (ink ground, 64px grid, one amber phrase per slide, wordmark bottom left, page number bottom right). The page around them follows the site theme.
- Structured data adds a `PresentationDigitalDocument` to the article's graph, with the licence and a link to the article it belongs to.

## Licence

Decks are licensed under [CC BY-NC 4.0](https://creativecommons.org/licenses/by-nc/4.0/), with one extra permission: anyone may use the slides inside their own organisation, including a business, for meetings and internal training. Selling them, or charging for a talk or course built on them, needs our written permission. Third-party material in a deck (Gartner figures and quotes, for example) and the Arithim name and logo are not covered. The full wording is the "Slides you can reuse" section of the legal notice (`content/legal.json`, shown at `legal.html#slides`), and a short version sits under every deck.

The articles themselves stay all rights reserved, as before.

A solicitor has not reviewed the licence wording yet. The note in `content/legal.json` says so.

Because the licence only covers what we own, a deck built mostly on someone else's research gives people less to reuse. Decks meant to travel should lead with our own numbers and views, and keep third-party figures in the notes and sources.

## How to publish one

1. Publish the insight as usual (`content/insights/<slug>.md`).
2. Write `content/keynotes/<slug>.md` with the same slug. It holds a short front matter block, then the slides.
3. Run `python3 tools/build_all.py`. It makes the QR code (`assets/keynotes/<slug>-qr.svg`), puts the deck on `insight-<slug>.html` and refreshes `llms-full.txt`.
4. Check the page at desktop and phone width, step through every slide and print it once.
5. Open a PR as for any insight. CI runs `build_keynotes.py --check` and the tests in `tools/test_build_keynotes.py`.

The QR code needs the `segno` package (`pip install segno`) when it is first made or when the page URL changes. After that the committed SVG is reused, so CI and the rest of the build stay on the standard library.

### Front matter

Every field is optional.

| Field | What it is |
|---|---|
| `kind` | `keynote` (default), `workshop`, `panel` or `case-study`. Sets the label above the deck and on the slides. |
| `minutes`, `speaker` | Talk length; speaker (defaults to Tarun). |
| `event`, `event_date`, `event_place` | Where it was given. Shown above the deck and on the title slide. |
| `audio`, `audio_title`, `audio_minutes` | An audio version (see below). |

Title, description, FAQ, sources and the call to action come from the insight.

### Slides

Each slide starts with a line `--- <layout>`. The first slide must be `title`.

```
--- stats
kicker: How far adoption has got
## Adoption is ==early==.
- 17% | of organisations have deployed AI agents
- 42% | expect to within 12 months
notes: These figures come from Gartner's 2026 CIO survey.
```

| Layout | Takes |
|---|---|
| `title` | `# heading` |
| `statement` | `## heading`, optional paragraph |
| `list` (add `numbered` for a numbered list) | `## heading`, up to six `- item | small print` lines |
| `cards` | `## heading`, two to four `- title | body` lines |
| `stats` | `## heading`, one to three `- number | caption` lines |
| `quote` | `> quote`, `cite:` line |

Every slide can have `kicker:` and `notes:`. Notes run to the end of the slide. `==phrase==` sets the one amber phrase a slide may have; the build refuses two. The closing slide with the QR code and licence is added automatically.

Write slides as short claims and leave the evidence and caveats to the notes and the article. A slide that needs a paragraph is usually two slides.

## Case studies, workshops and panels

- Case studies fit the format well: problem, what we built, numbers, what changed, one quote. Today the deck attaches to insight pages only, so either publish the case study as an insight or extend `build_keynotes.py` to the case study pages. Keep client names out unless the client has agreed.
- Workshops need more slides and more notes. Put exercises on `list numbered` slides and the facilitator's instructions in the notes, so the page doubles as the handout.
- Panels have no single deck. Publish a short insight after the event as the write-up, with a deck of a title slide, one `quote` slide per speaker (with their agreement) and a `cards` slide for where people disagreed.

At the talk, end on the QR slide and leave it up through questions. Check the code scans from the back of the room first.

## Audio, NotebookLM style

The deck block already plays audio: set `audio = "assets/keynotes/<slug>.m4a"` and a player appears under the deck, with an `AudioObject` in the structured data. The runtime strips the `controls` attribute from media, so `keynote.js` switches the controls on after the page loads.

Producing the audio is the open part. Three routes, roughly in order of effort:

1. Record Tarun giving the talk and trim it. This is the most honest version and the cheapest to make.
2. Load the article, notes and sources into NotebookLM and export its Audio Overview, a two-host conversation. Before publishing, check the terms for publishing that audio commercially, listen to all of it for errors (it paraphrases and can get numbers wrong) and label it as AI-generated on the page.
3. Script a short two-voice conversation from the speaker notes and generate it with a text-to-speech service, so Arithim controls every sentence. More work, but nothing in it is unchecked.

Whichever route is used, publish a transcript with the audio.

## Source decks

`source-decks/` holds the three talk decks built for Tarun's speaker page (Hiring the Machine Workforce, Don't Ship Slop, From Pilot to Production in Regulated Industries) and the script that generated them. They are kept for reference and are excluded from the deploy (`tools/stage_site.sh` skips `docs/`). All three are now published as decks on their own insights, listed above.
