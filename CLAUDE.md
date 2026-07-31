# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

WatchMatch is a chat-first movie/TV recommendation app: describe a mood, get
specific real titles back, react with 👍/👎/watched and the next reply adapts.
No build step — a single static `index.html` plus two Vercel serverless
functions that keep API keys server-side.

## Commands

```bash
npm i -g vercel   # one-time
vercel dev         # run locally — required for api/ functions to work
vercel              # deploy
```

There is no lint/test/build tooling in this repo (`package.json` only defines
`dev`). A plain static file server (e.g. `python3 -m http.server`) will serve
`index.html` but **cannot** run `api/chat.js` or `api/omdb.js`, so always use
`vercel dev` when working on anything that touches chat or movie lookups.

Local secrets go in `.env.local` (gitignored), not `.env`:
```
MISTRAL_API_KEY=...
OMDB_API_KEY=...
```

## Architecture

Three files carry all the logic:

- **`index.html`** — everything client-side: markup, CSS, and a single IIFE
  of vanilla JS (no framework, no bundler). Key internal pieces, in the order
  they appear in the script:
  - `loadSet`/`saveSet` + `excludeList`/`likedList`/`shownList` — the three
    `localStorage`-backed title sets (see Data & storage below). `shownList`
    (already-suggested-this-session) is in-memory only, not persisted.
  - `fetchOmdb`/`resolveOmdb` — resolves an AI-recommended `{title, year}`
    against `api/omdb.js`: exact title+year match first, else a fuzzy search
    (`s=`) scored by `scoreCandidate` (exact-title match always outranks
    closer year, closest year wins among exact-title matches); a fuzzy result
    is only accepted if its title actually matches — a title mismatch returns
    null (placeholder card) rather than showing an unrelated movie/show.
    Batch lookups run in parallel with a staggered reveal, not sequentially.
  - `buildCard`/`openMovieModal` — render a recommendation as a card and as
    the full detail modal; both wire up the same 👍/✓/👎 action buttons via
    `wireActions`/`buildActionsHtml`, keyed by `titleKey(rec)`.
  - `sendMessage` — posts the conversation to `api/chat.js` along with the
    `exclude`/`liked`/`shown` lists, then feeds the JSON response into
    `addAssistantMessage`, which renders the reply text and any
    recommendation cards.
  - Reacting to a card (👍/✓/👎) both updates the relevant `localStorage` set
    *and* injects a `[feedback]`-tagged message into the chat, so the AI's
    next reply visibly reacts to it — this is the feedback loop the README
    describes as the core feature.

- **`api/chat.js`** — Vercel function proxying to Mistral AI
  (`mistral-small-latest`, forced JSON response). Builds the system prompt
  from three dynamic clauses appended based on request body fields:
  `exclude` (hard-exclude, never recommend), `liked` (taste signal), `shown`
  (don't repeat this session). Validates/truncates all input (message count,
  length, list sizes) before sending anything upstream, and belt-and-suspenders
  filters the model's own output against the exclude list before returning it.

- **`api/omdb.js`** — thin GET proxy to the OMDb API; whitelists passthrough
  query params (`t`, `i`, `y`, `type`, `plot`, `s`, `page`) and injects the
  server-side `OMDB_API_KEY`.

Both API functions return `500` with a descriptive message if their required
env var isn't set, rather than failing silently — the frontend surfaces that
message directly in the chat/card UI.

## Data & storage

No backend database and no accounts. Three `localStorage` keys hold the
user's taste profile (see README for exact key names): liked titles, watched
titles, and not-interested titles. Watched + not-interested both feed the
`exclude` hard-exclude list sent to the AI; liked feeds the `liked` taste
signal. The "already suggested this conversation" list is session-only
(in-memory), reset on a new chat.

## Conventions to preserve when editing

- No build step / no framework — keep `index.html` self-contained vanilla
  JS/CSS. Don't introduce a bundler or framework without discussing it first.
- Both serverless functions validate and cap all client-supplied input
  (lengths, list sizes, message counts) before using it — match that pattern
  for any new endpoint or field.
- Never recommend/return a title from the hard-exclude list — this is
  enforced twice (in the system prompt and again by filtering the model's
  output), keep both layers if touching `api/chat.js`.
- API keys (`MISTRAL_API_KEY`, `OMDB_API_KEY`) must stay server-side in the
  `api/` functions — never expose them to or accept them from the client.
