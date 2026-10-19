// Shared helpers: .env loading (never logged), cache, errors, Parallel Search client.
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const CACHE_FILE = path.join(DATA_DIR, 'speakers.json');

function loadEnv() {
  try {
    const text = fs.readFileSync(path.join(ROOT, '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      if (line.trim().startsWith('#')) continue;
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m) continue;
      const value = m[2].replace(/^['"]|['"]$/g, '');
      if (value && !process.env[m[1]]) process.env[m[1]] = value;
    }
  } catch { /* no .env: Parallel features report a clear error */ }
}
loadEnv();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const httpError = (status, message) => Object.assign(new Error(message), { status });
const slug = (s) => s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '-');

function readCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')); } catch { return null; }
}
function writeCache(data) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(data, null, 2));
}
function normalizeUrl(input) {
  let u = String(input || '').trim();
  if (!u) throw httpError(400, 'Enter a conference URL.');
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u;
  try { return new URL(u).href; } catch { throw httpError(400, 'That does not look like a valid URL.'); }
}

// Parallel Search API, fast mode. The key stays on the server.
async function parallelSearch(body) {
  const key = process.env.PARALLEL_API_KEY;
  if (!key) throw httpError(400, 'PARALLEL_API_KEY is missing. Add it to the local .env file and restart the server.');
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch('https://api.parallel.ai/v1/search', {
      method: 'POST',
      headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode: 'fast', ...body }),
      signal: AbortSignal.timeout(25000),
    });
    if (res.status === 429 && attempt === 0) { await sleep(1500); continue; }
    if (!res.ok) throw httpError(res.status, `Parallel search failed (HTTP ${res.status}).`);
    return res.json();
  }
  throw httpError(429, 'Parallel search is rate limited. Try again in a moment.');
}

module.exports = { readCache, writeCache, normalizeUrl, parallelSearch, httpError, slug, sleep };
