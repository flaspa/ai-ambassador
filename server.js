// AI Ambassador server: static files + speaker discovery + Parallel enrichment.
// Node built-ins only. API keys stay on the server.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { readCache, writeCache, normalizeUrl, httpError } = require('./lib/util');
const { discoverSpeakers } = require('./lib/discover');
const { enrich } = require('./lib/enrich');
const { emailFor } = require('./lib/email');
const { buildDraft } = require('./lib/draft');
const composio = require('./lib/composio');
const links = require('./lib/links');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = Number(process.env.PORT) || 3210;
const MIME = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.svg': 'image/svg+xml', '.json': 'application/json' };

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readBody(req) {
  return new Promise((resolve) => {
    let b = '';
    req.on('data', (c) => { b += c; if (b.length > 1e6) req.destroy(); });
    req.on('end', () => { try { resolve(b ? JSON.parse(b) : {}); } catch { resolve({}); } });
  });
}
const withFlags = (data, cached) => ({ ...data, cached, parallelConfigured: !!process.env.PARALLEL_API_KEY });

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (url.pathname === '/api/speakers' && req.method === 'GET') {
      const target = normalizeUrl(url.searchParams.get('url'));
      const cache = readCache();
      if (cache && url.searchParams.get('refresh') !== '1' && cache.conferenceUrl === target) {
        return sendJson(res, 200, withFlags(cache, true));
      }
      const fresh = await discoverSpeakers(target);
      writeCache(fresh);
      return sendJson(res, 200, withFlags(fresh, false));
    }
    if (url.pathname === '/api/enrich' && req.method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, await enrich(body.ids));
    }
    if (url.pathname === '/api/status' && req.method === 'GET') {
      return sendJson(res, 200, { parallel: !!process.env.PARALLEL_API_KEY, ...(await composio.status()) });
    }
    if (url.pathname === '/api/email' && req.method === 'POST') {
      const body = await readBody(req);
      return sendJson(res, 200, await emailFor(String(body.id || '')));
    }
    if (url.pathname === '/api/draft/text' && req.method === 'POST') {
      const body = await readBody(req);
      const cache = readCache();
      const speaker = cache && cache.speakers.find((s) => s.id === body.id);
      if (!speaker) throw httpError(404, 'Speaker not found.');
      return sendJson(res, 200, buildDraft({
        speaker, interests: body.interests, conferenceName: cache.conferenceName,
        senderName: String(body.senderName || '').slice(0, 80), matchReason: body.matchReason || null, happened: body.happened !== false,
      }));
    }
    if (url.pathname === '/api/draft' && req.method === 'POST') {
      // Creates a Gmail draft only. The user must click "Create Gmail draft"; nothing is ever sent.
      const body = await readBody(req);
      const to = String(body.to || '').trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(to)) throw httpError(400, 'Enter a valid recipient email address.');
      if (!String(body.subject || '').trim() || !String(body.body || '').trim()) throw httpError(400, 'Subject and message cannot be empty.');
      const draft = await composio.createGmailDraft({ to, subject: String(body.subject), body: String(body.body) });
      return sendJson(res, 200, { created: true, ...draft, to });
    }
    if (url.pathname === '/api/links/check' && req.method === 'POST') {
      const cache = readCache();
      if (!cache) throw httpError(400, 'Load a conference first.');
      const results = await links.checkMany(cache.speakers.flatMap(links.urlsOf));
      let removed = 0;
      for (const sp of cache.speakers) removed += await links.cleanSpeaker(sp, results);
      writeCache(cache);
      const states = [...results.values()].reduce((a, r) => { a[r.state] = (a[r.state] || 0) + 1; return a; }, {});
      return sendJson(res, 200, { checked: results.size, ...states, removed });
    }
    const rel = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
    const file = path.join(PUBLIC_DIR, rel);
    if (!file.startsWith(PUBLIC_DIR) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      res.writeHead(404); return res.end('Not found');
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  } catch (e) {
    sendJson(res, e.status || 500, { error: e.message || 'Something went wrong.' });
  }
});

server.listen(PORT, () => console.log(`AI Ambassador running at http://localhost:${PORT}`));
