// Link validation. A link is only removed when the site clearly says it is gone (404, 410, unknown host).
// Sites that block automated checks (LinkedIn 999, 401, 403, 429) are "unverified", not broken, and stay.
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

async function request(url, method) {
  const res = await fetch(url, {
    method, redirect: 'follow', signal: AbortSignal.timeout(9000),
    headers: { 'User-Agent': UA, Accept: 'text/html,application/xhtml+xml,*/*;q=0.8' },
  });
  try { await res.body?.cancel(); } catch { /* body already closed */ }
  return res.status;
}

// Returns { url, state: 'ok' | 'broken' | 'unverified', status }
async function checkUrl(url) {
  if (!/^https?:\/\//i.test(url || '')) return { url, state: 'broken', status: 0 };
  // LinkedIn answers automated requests with 429/999 whatever the profile, so checking only gets us rate limited.
  if (/^https?:\/\/([a-z]+\.)?linkedin\.com\//i.test(url)) return { url, state: 'unverified', status: 0 };
  try {
    let status = await request(url, 'HEAD');
    if (status >= 400) status = await request(url, 'GET'); // many servers reject HEAD
    if (status >= 200 && status < 400) return { url, state: 'ok', status };
    if (status === 404 || status === 410) return { url, state: 'broken', status };
    return { url, state: 'unverified', status };
  } catch (e) {
    const code = (e.cause && e.cause.code) || '';
    if (code === 'ENOTFOUND' || code === 'ERR_INVALID_URL') return { url, state: 'broken', status: 0 };
    return { url, state: 'unverified', status: 0 };
  }
}

async function checkMany(urls, concurrency = 12) {
  const unique = [...new Set(urls.filter(Boolean))];
  const results = new Map();
  let next = 0;
  const worker = async () => {
    while (next < unique.length) {
      const u = unique[next++];
      results.set(u, await checkUrl(u));
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, unique.length) }, worker));
  return results;
}

// Check one speaker's links and drop the broken ones. Mutates the speaker and returns counts.
async function cleanSpeaker(sp, results) {
  const state = (u) => (results.get(u) || { state: 'unverified' }).state;
  let broken = 0;
  if (sp.profileUrl && state(sp.profileUrl) === 'broken') { sp.profileUrl = ''; broken++; }
  if (sp.linkedin && state(sp.linkedin) === 'broken') { sp.linkedin = ''; broken++; }
  const before = (sp.sources || []).length;
  sp.sources = (sp.sources || []).filter((s) => state(s.url) !== 'broken');
  broken += before - sp.sources.length;
  sp.linksCheckedAt = new Date().toISOString();
  return broken;
}

function urlsOf(sp) {
  return [sp.profileUrl, sp.linkedin, ...(sp.sources || []).map((s) => s.url)];
}

module.exports = { checkUrl, checkMany, cleanSpeaker, urlsOf };
