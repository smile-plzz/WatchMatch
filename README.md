# 🎬 WatchMatch

A chat-first movie and TV recommendation assistant. No mood grid, no genre browsing —
just describe what you're in the mood for and WatchMatch asks at most one clarifying
question before recommending specific, real titles that actually fit. React to what
it suggests — 👍, 👎, or just tell it in plain text — and it adapts immediately.
Click any title for a full detail view with a **Watch Now** button that jumps
straight into a search on [streamv2](https://github.com/smile-plzz/streamv2).

Built as a focused spin-off of the "Chat with AI" feature from
[MoodReel](https://github.com/smile-plzz/MovieRecommendationBasedOnMood), with
three additions: a feedback loop where reactions to recommendations directly
steer the next answer, a persistent taste profile (liked/watched/not-interested)
kept locally in your browser, and a one-click hop into streamv2 to actually
watch a pick.

---

## ✨ How it works

- You chat naturally about what you want to watch — mood, genre, "something like
  *X* but lighter," how much time you have, what streaming services you have, etc.
- [Mistral AI](https://mistral.ai/) (via a serverless function that keeps the API
  key server-side) asks at most one short clarifying question, then recommends
  3–6 *specific* real titles — never vague genre buckets — each with a one-line
  reason tailored to what you asked for.
- Each recommended title is looked up on [OMDB](http://www.omdbapi.com/) (via a
  serverless proxy — the API key lives only on the server, never in the browser)
  and shown as a real card (poster, rating) inline in the chat.
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

---

## 🐞 Known limitations

- Chat has no non-AI fallback — a conversation can't be reduced to keyword
  matching, so without `MISTRAL_API_KEY` configured, chat says so directly.
- Without `OMDB_API_KEY` configured, cards fall back to a plain title (no
  poster/rating), but Watch Now still works since it just searches by title.
- OMDB's free tier caps at 1,000 requests/day per key.
- Recommended titles are only as good as Mistral's knowledge — very recent
  releases may occasionally be missed or misdated.
- streamv2 has no direct "open and autoplay" link for a specific title, so
  Watch Now lands on its search results for that title rather than an
  already-playing page.

---

## 📜 License

MIT
