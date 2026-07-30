# 🎬 WatchMatch

A chat-first movie and TV recommendation assistant. No mood grid, no genre browsing —
just describe what you're in the mood for and WatchMatch asks at most one clarifying
question before recommending specific, real titles that actually fit. React to what
it suggests — 👍, 👎, or just tell it in plain text — and it adapts immediately, without
ever repeating a pick you've already seen or rejected. Click any title for a full detail
view with a **Watch Now** button that jumps straight into a search on
[streamv2](https://github.com/smile-plzz/streamv2).

Built as a focused spin-off of the "Chat with AI" feature from
[MoodReel](https://github.com/smile-plzz/MovieRecommendationBasedOnMood), with a
few additions: a feedback loop where reactions to recommendations directly steer
the next answer, a persistent taste profile kept locally in your browser, fuzzy
matching so an AI-recommended title still resolves to a real poster even with a
slightly off year or spelling, and a one-click hop into streamv2 to actually watch
a pick.

Live, deployed, and in daily use — not a demo.

---

## ✨ How it works

- You chat naturally about what you want to watch — mood, genre, "something like
  *X* but lighter," how much time you have, what streaming services you have, etc.
- [Mistral AI](https://mistral.ai/) (via a serverless function that keeps the API
  key server-side) asks at most one short clarifying question, then recommends
  3–6 *specific* real titles — never vague genre buckets — each with a one-line
  reason tailored to what you asked for. It never repeats a title already
  suggested earlier in the same conversation, and never invents a title it
  isn't confident actually exists.
- Every recommended title is resolved against [OMDB](http://www.omdbapi.com/)
  (via a serverless proxy — the API key lives only on the server) with a fuzzy
  fallback chain: exact title+year, then title alone, then a fuzzy search — so
  a slightly-off year or spelling still resolves to a real poster and rating
  instead of a bare placeholder. All of a batch's lookups run in parallel with
  a staggered reveal, rather than one at a time.
- Click a card to open a detail modal — full plot, cast, director, IMDb/Rotten
  Tomatoes/Metacritic ratings, awards — plus a **Watch Now** button that opens
  [streamv2](https://smile-plzz.github.io/streamv2/) with that title pre-searched
  so you can pick a source and play it.
- Every card (and the modal) has three quick actions: 👍 **like** (a taste
  signal — future recommendations lean into what made this pick fit you),
  ✓ **watched** (never suggested again), and 👎 **not for me** — which both
  excludes the title for good *and* immediately tells the AI in the chat, so
  its very next reply visibly adjusts instead of repeating the same kind of miss.
- Typed feedback works the same way: say "too slow," "already seen that," or
  "loved the first one, more like that" and the system prompt treats it as the
  strongest signal in the conversation.
- Your liked/watched/not-interested lists live in browser `localStorage` — no
  account, no backend database.

### Interaction details

- **Mobile-first touch ergonomics**: tap targets sized to Apple's HIG minimum,
  no stuck-hover-after-tap states, 16px input text (stops iOS Safari's
  auto-zoom-on-focus), and safe-area padding around notches/home indicators.
- **Smart scrolling**: the transcript only auto-scrolls to new content if you
  were already near the bottom — if you've scrolled up to reread something, a
  new reply shows a "↓ New message" pill instead of yanking your position.
- **Composer**: an auto-growing textarea — Enter sends, Shift+Enter for a
  newline — instead of a single-line field.

---

## 🧰 Tech stack

- **Frontend**: vanilla HTML/CSS/JS, no build step, single page (`index.html`)
- **AI**: [Mistral AI](https://mistral.ai/) via a Vercel serverless function (`api/chat.js`)
- **Movie data**: [OMDB API](http://www.omdbapi.com/) via a Vercel serverless
  function (`api/omdb.js`) — the key is configured once at deployment, never
  exposed to or entered by the visitor
- **Watch it**: hands off to [streamv2](https://github.com/smile-plzz/streamv2)
  (a separate free streaming aggregator) for actual playback
- **Storage**: browser `localStorage` for your taste profile only

---

## ⚙️ Getting started

### 1. Clone

```bash
git clone https://github.com/smile-plzz/WatchMatch.git
cd WatchMatch
```

### 2. Run locally with Vercel (needed for both serverless functions)

```bash
npm i -g vercel   # if you don't already have it
vercel dev
```

Create a `.env.local` file (already covered by `.gitignore`) with:

```
MISTRAL_API_KEY=your-mistral-key-here
OMDB_API_KEY=your-omdb-key-here
```

Get a free OMDB key at [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx).
Then open the local URL Vercel prints. A plain static server (e.g.
`python3 -m http.server`) will serve the page but **cannot** run the `api/`
functions, so both chat and movie-card lookups will report themselves as
unconfigured.

---

## 🚀 Deploy to Vercel

```bash
vercel
```

Vercel auto-detects the static frontend and the serverless functions at
`api/chat.js` and `api/omdb.js`. In the Vercel dashboard, go to **Project
Settings → Environment Variables** and add:

- `MISTRAL_API_KEY` — from [console.mistral.ai](https://console.mistral.ai/)
- `OMDB_API_KEY` — from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx)

Never commit either key to the repo. Redeploy (or push) after adding them.

---

## 📁 Folder structure

```
WatchMatch/
├── index.html       # Chat UI, movie detail modal, localStorage taste lists
├── api/
│   ├── chat.js       # Serverless proxy to Mistral AI — conversational recommender
│   └── omdb.js        # Serverless proxy to OMDB — keeps the key server-side
├── vercel.json
├── package.json
└── .env.example
```

---

## 💾 Data & storage

| Key | Purpose |
|---|---|
| `watchmatch_liked` | Titles you've thumbs-upped — used as a taste signal |
| `watchmatch_watched` | Titles marked watched — excluded from future recommendations |
| `watchmatch_not_interested` | Titles thumbs-downed — excluded from future recommendations |

The "already suggested this conversation" memory that stops the AI repeating
itself mid-chat is session-only (in memory, not `localStorage`) and resets
whenever you start a new chat.

---

## 🐞 Known limitations

- Chat has no non-AI fallback — a conversation can't be reduced to keyword
  matching, so without `MISTRAL_API_KEY` configured, chat says so directly.
- Without `OMDB_API_KEY` configured, cards fall back to a plain title (no
  poster/rating), but Watch Now still works since it just searches by title.
- OMDB's free tier caps at 1,000 requests/day per key.
- Recommended titles are only as good as Mistral's knowledge — very recent
  releases may occasionally be missed or misdated; unresolved titles are
  labeled "unverified title" rather than shown as a normal confirmed result.
- streamv2 has no direct "open and autoplay" link for a specific title, so
  Watch Now lands on its search results for that title rather than an
  already-playing page.
- `api/chat.js` has no per-visitor rate limiting — fine for personal/low-traffic
  use, but a widely-shared link could run up the Mistral bill faster than
  expected.

---

## 📜 License

MIT
