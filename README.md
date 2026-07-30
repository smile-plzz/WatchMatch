# 🎬 ReelChat

A chat-first movie and TV recommendation assistant. No mood grid, no genre browsing —
just describe what you're in the mood for and ReelChat asks at most one clarifying
question before recommending specific, real titles that actually fit.

Built as a focused spin-off of the "Chat with AI" feature from
[MoodReel](https://github.com/smile-plzz/MovieRecommendationBasedOnMood), with one
addition: ReelChat remembers what you've marked watched or not-interested (locally,
in your browser) and tells the AI to never recommend those titles again.

---

## ✨ How it works

- You chat naturally about what you want to watch — mood, genre, "something like
  *X* but lighter," how much time you have, what streaming services you have, etc.
- [Mistral AI](https://mistral.ai/) (via a serverless function that keeps the API
  key server-side) asks at most one short clarifying question, then recommends
  3–6 *specific* real titles — never vague genre buckets.
- Each recommended title is looked up on [OMDB](http://www.omdbapi.com/) and shown
  as a real card (poster, year, rating) inline in the chat.
- Every card has quick actions: ♥ favorite, ✓ mark watched, ✕ not interested.
  Watched and not-interested titles are sent back to the AI on every future
  message so it never repeats a recommendation you've already rejected or seen.
- Everything (favorites/watched/not-interested/your OMDB key) lives in browser
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
git clone https://github.com/smile-plzz/ReelChat.git
cd ReelChat
```

### 2. Get an OMDB key (free)

Get a free key from [omdbapi.com/apikey.aspx](https://www.omdbapi.com/apikey.aspx),
then paste it in via the 🔑 icon once the app is running — it's saved only in
your browser. Without a key, chat still works but recommendation cards show a
plain title instead of a poster/rating.

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
ReelChat/
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
| `reelchat_favorites` | Favorited titles |
| `reelchat_watched` | Titles marked watched |
| `reelchat_not_interested` | Titles hidden from future recommendations |
| `reelchat_omdb_key` | Your OMDB API key, if set |

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
