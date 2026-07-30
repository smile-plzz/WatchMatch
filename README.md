# 🎬 WatchMatch

A chat-first movie and TV recommendation assistant. No mood grid, no genre browsing —
just describe what you're in the mood for and WatchMatch asks at most one clarifying
question before recommending specific, real titles that actually fit. React to what
it suggests — 👍, 👎, or just tell it in plain text — and it adapts immediately.

Built as a focused spin-off of the "Chat with AI" feature from
[MoodReel](https://github.com/smile-plzz/MovieRecommendationBasedOnMood), with two
additions: a feedback loop where reactions to recommendations directly steer the
next answer, and a persistent taste profile (liked/watched/not-interested) kept
locally in your browser.

---

## ✨ How it works

- You chat naturally about what you want to watch — mood, genre, "something like
  *X* but lighter," how much time you have, what streaming services you have, etc.
- [Mistral AI](https://mistral.ai/) (via a serverless function that keeps the API
  key server-side) asks at most one short clarifying question, then recommends
  3–6 *specific* real titles — never vague genre buckets — each with a one-line
  reason tailored to what you asked for.
- Each recommended title is looked up on [OMDB](http://www.omdbapi.com/) and shown
  as a real card (poster, rating) inline in the chat.
- Every card has three quick actions: 👍 **like** (a taste signal — future
  recommendations lean into what made this pick fit you), ✓ **watched** (never
  suggested again), and 👎 **not for me** — which both excludes the title for
  good *and* immediately tells the AI in the chat, so its very next reply visibly
  adjusts instead of repeating the same kind of miss.
- Typed feedback works the same way: say "too slow," "already seen that," or
  "loved the first one, more like that" and the system prompt treats it as the
  strongest signal in the conversation.
- Everything (liked/watched/not-interested/your OMDB key) lives in browser
  `localStorage` — no account, no backend database.

---

## 🧰 Tech stack

- **Frontend**: vanilla HTML/CSS/JS, no build step, single page (`index.html`)
- **AI**: [Mistral AI](https://mistral.ai/) via a Vercel serverless function (`api/chat.js`)
- **Movie data**: [OMDB API](http://www.omdbapi.com/) (client-side, bring-your-own free key)
- **Storage**: browser `localStorage` only

---

## ⚙️ Getting started

### 1. Clone

```bash
git clone https://github.com/smile-plzz/WatchMatch.git
cd WatchMatch
```

### 2. OMDB key

Get a free key from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx),
then paste it in via the key icon (top right) once the app is running — it's
saved only in your browser. Without a key, chat still works but recommendation
cards show a plain title instead of a poster/rating.

### 3. Run locally with Vercel (needed for the AI chat function)

```bash
npm i -g vercel   # if you don't already have it
vercel dev
```

Create a `.env.local` file (already covered by `.gitignore`) with:

```
MISTRAL_API_KEY=your-key-here
```

Then open the local URL Vercel prints. A plain static server (e.g.
`python3 -m http.server`) will serve the page but **cannot** run `api/chat.js`,
so chat will report itself as unconfigured.

---

## 🚀 Deploy to Vercel

```bash
vercel
```

Vercel auto-detects the static frontend and the serverless function at
`api/chat.js`. In the Vercel dashboard, go to **Project Settings → Environment
Variables** and add `MISTRAL_API_KEY` with your key from
[console.mistral.ai](https://console.mistral.ai/) — never commit it to the repo.
Redeploy (or push) after adding it.

---

## 📁 Folder structure

```
WatchMatch/
├── index.html       # Chat UI, OMDB lookups, localStorage lists
├── api/
│   └── chat.js       # Serverless proxy to Mistral AI — conversational recommender
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
| `watchmatch_omdb_key` | Your OMDB API key, if set |

---

## 🐞 Known limitations

- Chat has no non-AI fallback — a conversation can't be reduced to keyword
  matching, so without `MISTRAL_API_KEY` configured, chat says so directly.
- OMDB's free tier caps at 1,000 requests/day per key.
- Recommended titles are only as good as Mistral's knowledge — very recent
  releases may occasionally be missed or misdated.

---

## 📜 License

MIT
