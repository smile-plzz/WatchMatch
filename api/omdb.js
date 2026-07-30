// Vercel serverless function — OMDb API proxy so the API key stays server-side.
// Requires an OMDB_API_KEY environment variable set in the Vercel project
// (Project Settings -> Environment Variables), NOT committed to the repo.
// Get a free key at https://www.omdbapi.com/apikey.aspx.

const PASSTHROUGH_PARAMS = ['t', 'i', 'y', 'type', 'plot', 's', 'page'];
const MAX_PARAM_LEN = 200;

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.OMDB_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Movie data is not configured on this deployment. Set OMDB_API_KEY — see README.' });
    return;
  }

  const params = new URLSearchParams({ apikey: apiKey });
  for (const key of PASSTHROUGH_PARAMS) {
    const value = req.query?.[key];
    if (typeof value === 'string' && value.trim()) {
      params.set(key, value.trim().slice(0, MAX_PARAM_LEN));
    }
  }

  if (!params.has('t') && !params.has('i') && !params.has('s')) {
    res.status(400).json({ error: 'Missing search parameter.' });
    return;
  }

  try {
    const omdbRes = await fetch(`https://www.omdbapi.com/?${params.toString()}`);
    const data = await omdbRes.json();
    res.status(200).json(data);
  } catch {
    res.status(502).json({ error: 'Movie data lookup failed.' });
  }
};
