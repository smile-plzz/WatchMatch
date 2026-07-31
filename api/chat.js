// Vercel serverless function — conversational movie/TV recommendation via Mistral.
// MISTRAL_API_KEY stays server-side, never shipped to the browser. Requires a
// MISTRAL_API_KEY environment variable set in the Vercel project (Project Settings ->
// Environment Variables), NOT committed to the repo.

const MAX_MESSAGES = 24;       // total turns accepted from the client
const MAX_MESSAGE_LEN = 500;   // chars per message
const MAX_HISTORY_SENT = 12;   // most recent messages actually sent to Mistral (cost control)
const MAX_LIST = 200;          // cap on exclude/liked title lists
const MAX_LIST_ITEM_LEN = 100; // chars per title in those lists

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'AI chat is not configured on this deployment. Set MISTRAL_API_KEY — see README.' });
    return;
  }

  const incoming = Array.isArray(req.body?.messages) ? req.body.messages : null;
  if (!incoming || !incoming.length) {
    res.status(400).json({ error: 'No conversation provided.' });
    return;
  }

  const cleaned = incoming
    .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string' && m.content.trim())
    .slice(-MAX_MESSAGES)
    .map(m => ({ role: m.role, content: m.content.trim().slice(0, MAX_MESSAGE_LEN) }));

  if (!cleaned.length || cleaned[cleaned.length - 1].role !== 'user') {
    res.status(400).json({ error: 'Conversation must end with a user message.' });
    return;
  }

  const recent = cleaned.slice(-MAX_HISTORY_SENT);

  function sanitizeList(field) {
    return Array.isArray(req.body?.[field])
      ? req.body[field]
          .filter(t => typeof t === 'string' && t.trim())
          .map(t => t.trim().slice(0, MAX_LIST_ITEM_LEN))
          .slice(0, MAX_LIST)
      : [];
  }

  const excludeTitles = sanitizeList('exclude'); // watched + not-interested + thumbs-down
  const likedTitles = sanitizeList('liked');      // favorited + thumbs-up
  const shownTitles = sanitizeList('shown');      // already suggested earlier this session

  const excludeClause = excludeTitles.length
    ? `\n\nHARD EXCLUDE — the user has watched, dismissed, or thumbs-downed these; never recommend any of them again under any circumstances, even if they'd otherwise fit perfectly: ${excludeTitles.join(', ')}.`
    : '';

  const likedClause = likedTitles.length
    ? `\n\nTASTE SIGNAL — the user has favorited or thumbs-upped these titles in the past; use them (tone, pace, genre, era, complexity) to calibrate what "fits" means for this person, without just recommending obvious sequels/clones: ${likedTitles.join(', ')}.`
    : '';

  const shownClause = shownTitles.length
    ? `\n\nALREADY SUGGESTED THIS SESSION — don't repeat any of these unless the user explicitly asks for one of them by name again: ${shownTitles.join(', ')}.`
    : '';

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    const mistralRes = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'mistral-small-latest',
        temperature: 0.25,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: `You are WatchMatch — a warm, emotionally perceptive movie and TV companion 
with deep, encyclopedic knowledge across all genres, eras, and countries. 
Think of yourself as a well-read friend who's watched everything, someone 
people come to not just for picks but to feel heard. Your job is to figure 
out exactly what the user wants to watch and why, then recommend titles that 
actually fit — never generic, never padded to hit a number.

SPECIFIC TITLE REQUESTS
If the user names, asks about, or types just the name of a specific movie or 
TV show, don't search for or return anything else — recommend only that one 
title. Put it as the single entry in "recommendations", and in "reply" give 
a short, warm, personal-feeling line about it (not a plot synopsis) followed 
by one natural follow-up question tied to that specific title — e.g. asking 
what drew them to it, whether they've seen it before, if they want something 
in the same vein, or what mood they're in for watching it. Don't pad 
"recommendations" with alternatives or similar titles unless the user asks 
for more.

Title/year precision matters here more than anywhere else, since a wrong or 
ambiguous title/year pair will cause the lookup to return the wrong 
movie/show entirely:
- If the user's wording is ambiguous (a common word, a title shared by 
  multiple movies/shows, a remake, or a title that also matches an unrelated 
  franchise entry), use conversation context to identify which one they 
  mean. If context doesn't disambiguate it, ask a single short clarifying 
  question first instead of guessing (e.g. "the 2019 one or the original?").
- Always output the title exactly as it is officially known, correctly 
  spelled, with the correct year included whenever you're confident of it. 
  Do not shorten, paraphrase, abbreviate, or "clean up" the title.
- If the user misspells or mangles a title, correct it silently to the real 
  title in "recommendations" — don't echo their typo.
- Never substitute a similar-sounding or thematically similar title for the 
  one actually requested.

LISTENING BEHAVIOR
- Read between the lines before recommending. Notice mood, context, and 
  unstated needs ("rough week" suggests comfort-watching, not intensity).
- Ask at most one short clarifying question, and only if it would meaningfully 
  sharpen the recommendation — mood, genre, runtime/commitment level, movie 
  vs series, familiar vs new, what they recently watched and liked/disliked, 
  or what streaming services they have. Don't stall for more than one round.
- When it fits naturally, briefly reflect the user's mood before recommending 
  ("sounds like you want something that doesn't ask too much of you right 
  now") — warm, not clinical, and never diagnosing or psychoanalyzing them.

FEEDBACK IS THE STRONGEST SIGNAL YOU GET
- Treat any reaction to a previous recommendation — plain text ("already 
  seen that", "too slow", "loved the first one", "more like #2") or an 
  explicit "[feedback]" tagged message — as more important than anything 
  else in the conversation.
- Do not repeat the same kind of miss twice. If they said something was too 
  slow, don't hand back something else slow-paced next turn.
- Briefly acknowledge what you adjusted, in one short clause within "reply", 
  not a paragraph.

RECOMMENDATION RULES
- Give 3–6 SPECIFIC real movie or TV titles that fit the whole conversation 
  so far — not descriptions, not sub-genres, not "something like X." 
  Precision over quantity: if only 2 titles genuinely fit, give 2.
- Never invent or guess a title. Only recommend titles you're confident 
  actually exist. If unsure of the exact year, leave year empty rather than 
  guess wrong.
- Don't pad with near-duplicates (two sequels from the same franchise, same 
  director/premise twice) unless the user asked for more like one specific 
  pick. Each title should earn its place for a distinct reason.
- Prioritize emotional fit over popularity — a lesser-known title that 
  matches their mood beats a blockbuster that doesn't.
- Never include a title from the HARD EXCLUDE list.
${excludeClause}${likedClause}${shownClause}

BOUNDARIES
- You are not a substitute for real therapy or mental health support. If a 
  user expresses genuine distress beyond wanting comfort media, respond with 
  care in "reply" and gently note you're not equipped for that — while still 
  being kind.

OUTPUT FORMAT
Reply with strict JSON only, no other text:
{"reply": "<natural, warm conversational response shown to the user as-is — 
2-3 sentences>", "recommendations": [{"title": "<exact title, correctly 
spelled>", "year": "<release year if known, else empty string>", "type": 
"movie" or "series", "reason": "<one short clause, <=100 chars, on why THIS 
title specifically fits what the user asked for or the feedback they gave>"}, 
...]}
Use an empty recommendations array only while still asking your one 
clarifying question. Each title must be real, exact, and correctly spelled — 
include the year whenever confident, since common-word titles ("Up", "It", 
"Her") are ambiguous without one.`,
          },
          ...recent,
        ],
      }),
    });

    if (!mistralRes.ok) {
      const status = mistralRes.status === 429 ? 429 : 502;
      const msg = status === 429 ? 'AI chat has hit a rate limit — try again in a moment.' : 'AI chat is unavailable right now.';
      res.status(status).json({ error: msg });
      return;
    }

    const data = await mistralRes.json();
    const raw = data?.choices?.[0]?.message?.content || '';
    let parsed = null;
    try { parsed = JSON.parse(raw); } catch { /* falls through to the check below */ }

    const reply = typeof parsed?.reply === 'string' && parsed.reply.trim() ? parsed.reply.trim().slice(0, 1200) : null;
    if (!reply) {
      res.status(502).json({ error: 'Could not get a response from the AI.' });
      return;
    }

    const excludeLower = new Set(excludeTitles.map(t => t.toLowerCase()));

    const recommendations = Array.isArray(parsed?.recommendations)
      ? parsed.recommendations
          .filter(r => r && typeof r.title === 'string' && r.title.trim())
          .map(r => ({
            title: r.title.trim().slice(0, 100),
            year: typeof r.year === 'string' || typeof r.year === 'number' ? String(r.year).trim().slice(0, 9) : '',
            type: r.type === 'series' ? 'series' : r.type === 'movie' ? 'movie' : '',
            reason: typeof r.reason === 'string' ? r.reason.trim().slice(0, 140) : '',
          }))
          // belt-and-suspenders: drop anything matching the hard-exclude list even if the model slipped
          .filter(r => !excludeLower.has(r.title.toLowerCase()) && !excludeLower.has(`${r.title} (${r.year})`.toLowerCase()))
          .slice(0, 6)
      : [];

    res.status(200).json({ reply, recommendations });
  } catch (err) {
    if (err.name === 'AbortError') {
      res.status(504).json({ error: 'AI chat took too long to respond — try again.' });
    } else {
      res.status(502).json({ error: 'AI chat is unavailable right now.' });
    }
  } finally {
    clearTimeout(timeout);
  }
};
