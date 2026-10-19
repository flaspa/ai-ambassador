// AI Ambassador server: static files + speaker discovery + Parallel enrichment.
// Node built-ins only. API keys stay on the server.
const http = require('http');
const fs = require('fs');
const path = require('path');
const { readCache, writeCache, normalizeUrl } = require('./lib/util');
const { discoverSpeakers } = require('./lib/discover');
const { enrich } = require('./lib/enrich');

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
