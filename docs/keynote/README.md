# Keynote pages on arithim.com

A keynote page publishes a talk, workshop, panel or case study as a slide deck with the notes underneath. The last slide shows a QR code, so when Tarun ends a talk on it, the room can open the same slides on their phones and keep them. Organisers get a link they can send round after the event.

The first example is `keynote-agentic-ai-where-is-it-working.html`, made from the insight [What Is Agentic AI, and Where Is It Actually Working in 2026?](../../content/insights/what-is-agentic-ai-where-is-it-working.md).

## What the page does

- The deck sits at the top of the page. Arrow keys, swipes and taps on either side of a slide move through it, and every slide has its own link (`#slide-5`), so someone can share the one slide they photographed.
- On a phone the slides reflow onto a 9:16 portrait canvas instead of shrinking a 16:9 slide until the text is unreadable. Most people will arrive from the QR code on a phone.
- Present fills the screen, so Tarun can present from the page itself with no separate file.
- Save as PDF prints one slide per landscape page. Headless Chrome gives 14 pages for the example deck.
- Under the deck, "Slide by slide" repeats each slide as text with its speaker notes. That text gives search engines and AI answer engines something to read, and works for screen readers. FAQ, sources and the usual call to action follow.
- The slides always use the dark brand deck (ink ground, 64px grid, one amber phrase per slide, wordmark bottom left, page number bottom right). The page around them follows the site theme.
- Structured data marks the page as an `Article` and a `PresentationDigitalDocument`, with `isBasedOn` pointing at the source insight and an FAQPage when there are questions.

## How to publish one

1. Write `content/keynotes/<slug>.md`. The file starts with TOML front matter, then the slides.
2. Run `python3 tools/build_all.py` (or `tools/build_keynotes.py` then `tools/build_insights.py`). This writes `keynote-<slug>.html`, the QR code in `assets/keynotes/<slug>-qr.svg`, the shared header and footer, and the sitemap entry.
3. Check the page in a browser at desktop and phone width, step through every slide and print it once.
4. Open a PR as for any insight. CI runs `build_keynotes.py --check` and the unit tests in `tools/test_build_keynotes.py`.

The QR code needs the `segno` package (`pip install segno`) when it is first made or when the page URL changes. After that the committed SVG is reused, so CI and the rest of the build stay on the standard library.

### Front matter

| Field | Needed | What it is |
|---|---|---|
| `title`, `slug`, `date`, `description`, `lede`, `cta` | yes | As for insights. `slug` matches the file name. |
| `kind` | yes | `keynote`, `workshop`, `panel` or `case-study`. Sets the label on the page and slides. |
| `minutes`, `speaker`, `topic` | no | Talk length, speaker (defaults to Tarun), subject. |
| `event`, `event_date`, `event_place` | no | Where it was given. Shown in the meta line and on the title slide. |
| `source_insight` | no | Slug of the article the talk is based on. Adds a "Read the full article" button. |
| `audio`, `audio_title`, `audio_minutes` | no | An audio version (see below). |
| `keywords`, `about`, `faq`, `sources`, `footnote` | no | As for insights. |

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

Every slide can have `kicker:` and `notes:`. Notes run to the end of the slide and appear only in the text under the deck. `==phrase==` sets the one amber phrase a slide may have; the build refuses two. The closing slide with the QR code is added automatically.

Write slides as short claims and put the evidence and caveats in the notes. A slide that needs a paragraph is usually two slides.

## Insights, case studies, workshops and panels

- Insights stay as articles; that is what ranks. Turn one into a keynote when Tarun gives it as a talk, set `source_insight`, and link back from the article. Both pages earn their place: the article answers the search query, and the deck is what people pass around after the event.
- Case studies fit the format well: problem, what we built, numbers, what changed, one quote. Use `kind = "case-study"` and keep client names out unless the client has agreed.
- Workshops need more slides and more notes. Put exercises on `list numbered` slides and the facilitator's instructions in the notes, so the page doubles as the handout.
- Panels have no single deck. Publish a short page after the event: a title slide with the panel and event, one `quote` slide per speaker (with their agreement), a `cards` slide for where people disagreed, and the notes as the write-up.

At the talk, end on the QR slide and leave it up through questions. Check the code scans from the back of the room before the talk; it encodes the full page URL and has been tested with a barcode reader.

## Audio, NotebookLM style

The template already plays audio: set `audio = "assets/keynotes/<slug>.m4a"` and a player appears above the notes, with an `AudioObject` in the structured data. The runtime strips the `controls` attribute from media, so `keynote.js` switches the controls on after the page loads.

Producing the audio is the open part. Three routes, roughly in order of effort:

1. Record Tarun giving the talk and trim it. This is the most honest version and the cheapest to make.
2. Load the article, notes and sources into NotebookLM and export its Audio Overview, a two-host conversation. Before publishing, check the terms for publishing that audio commercially, listen to all of it for errors (it paraphrases and can get numbers wrong) and label it as AI-generated on the page.
3. Script a short two-voice conversation from the speaker notes and generate it with a text-to-speech service, so Arithim controls every sentence. More work, but nothing in it is unchecked.

Whichever route is used, publish a transcript with the audio; the notes section can carry it.

## Things for Tarun to decide

- Whether keynotes get their own listing (`keynotes.html`, or a filter on `insights.html`) and a place in the Insights menu. For now the page is reachable from its URL, the QR code and the sitemap.
- Whether the source insight should link to its keynote. It does not yet.
- The "Book this talk" button goes to the contact page. A speaker page on arithim.com would be a better target once one exists.
- The keynote styles are a new section at the end of `site.css`. The head partial still loads `site.css?v=7`, so bump the version when this ships or returning visitors may see the page unstyled until their cache expires.

## Source decks

`source-decks/` holds the three talk decks built for Tarun's speaker page (Hiring the Machine Workforce, Don't Ship Slop, From Pilot to Production in Regulated Industries) and the script that generated them. They are kept for reference and are excluded from the deploy (`tools/stage_site.sh` skips `docs/`). Any of them can be moved into `content/keynotes/` in this format when it is ready to publish.
