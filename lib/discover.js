// Speaker discovery from any conference URL.
// Main source: schema.org Person entries in JSON-LD. Fallback: one Parallel search.
const { parallelSearch, httpError, slug } = require('./util');

const UA = 'Mozilla/5.0 (compatible; AIAmbassador/0.1)';

async function fetchHtml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw httpError(502, `Could not load that page (HTTP ${res.status}).`);
  return res.text();
}

function extractPeople(html, base) {
  const raw = [];
  let listName = '';
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    const types = [].concat(n['@type'] || []);
    if (types.includes('ItemList') && n.name && !listName) listName = n.name;
    if (types.includes('Person') && n.name) raw.push(n);
    Object.values(n).forEach(walk);
  };
  const re = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(html))) { try { walk(JSON.parse(m[1])); } catch { /* skip bad block */ } }

  const abs = (u) => { try { return u ? new URL(u, base).href : ''; } catch { return ''; } };
  const people = raw.map((p) => {
    const sameAs = [].concat(p.sameAs || []);
    const org = Array.isArray(p.worksFor) ? p.worksFor[0] : p.worksFor;
    const img = Array.isArray(p.image) ? p.image[0] : p.image;
    return {
      name: String(p.name).trim(),
      title: p.jobTitle || '',
      org: (org && (typeof org === 'string' ? org : org.name)) || '',
      image: abs(img && img.url ? img.url : img),
      profileUrl: abs(p.url),
      linkedin: sameAs.find((s) => /linkedin\.com/i.test(s)) || '',
    };
  });
  const title = (html.match(/<title[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '';
  const conferenceName = listName.replace(/\s*(Speakers?|Keynotes?)\s*$/i, '').trim()
    || title.split('|').pop().trim() || new URL(base).hostname;
  return { people, conferenceName };
}

// Supplement: many sites list only part of the roster in JSON-LD. Read the visible speaker cards too
// (link "View <Name> profile", then name, company and role text, and the portrait).
function extractCards(html, base) {
  const decode = (s) => s.replace(/&amp;/g, '&').replace(/&#x27;|&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  const text = (s) => decode(String(s || '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const abs = (u) => { try { return u ? new URL(u, base).href : ''; } catch { return ''; } };
  const parts = html.split(/<a[^>]+aria-label="View /i).slice(1);
  const people = [];
  for (const part of parts) {
    const name = decode((part.match(/^(.+?) profile"/) || [])[1] || '').trim();
    const href = (part.match(/href="([^"]+)"/) || [])[1];
    if (!name || !href) continue;
    const chunk = part.slice(0, 6000);
    const h3 = (chunk.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i) || [])[1];
    const company = (chunk.match(/<p[^>]*company[^>]*>([\s\S]*?)<\/p>/i) || [])[1];
    const role = (chunk.match(/<p[^>]*role[^>]*>([\s\S]*?)<\/p>/i) || [])[1];
    const imgUrl = (chunk.match(/url=(https?%3A%2F%2F[^&"\s]+)/i) || [])[1];
    people.push({
      name: text(h3) || name, title: text(role), org: text(company),
      image: imgUrl ? decodeURIComponent(imgUrl) : '', profileUrl: abs(decode(href)), linkedin: '',
    });
  }
  return people;
}

// Fallback: keep only "Name, Title" pairs that literally appear in Parallel excerpts.
async function speakersFromParallel(url) {
  const host = new URL(url).hostname.replace(/^www\./, '');
  const data = await parallelSearch({
    objective: `List the announced speakers of the conference at ${url}, with their job titles and organizations`,
    search_queries: [`${host} speakers`, `${host} keynote speakers`],
    max_chars_total: 6000,
  });
  const titleWords = '(?:Co-)?(?:Founder|CEO|CTO|CPO|COO|CISO|VP|Vice President|Professor|Director|Head|Chief|Partner|President|Managing|Senior|Principal|Research|Engineer|Scientist|Chair)';
  const re = new RegExp(`([A-Z][a-z]+(?: [A-Z]\\.)? [A-Z][A-Za-z'’-]{2,})[,:\\s–-]+(${titleWords}[^.,;|\\n]{0,60})`, 'g');
  const seen = new Map();
  for (const r of data.results || []) {
    for (const ex of r.excerpts || []) {
      let m;
      while ((m = re.exec(ex))) {
        const name = m[1].trim();
        if (seen.has(name)) continue;
        const org = (m[2].match(/\bat ([A-Z][\w&.\- ]{1,40})/) || [])[1] || '';
        seen.set(name, { name, title: m[2].replace(/\bat .*/, '').trim(), org: org.trim(), image: '', profileUrl: r.url, linkedin: '' });
      }
    }
  }
  return { people: [...seen.values()].slice(0, 40), conferenceName: host };
}

async function discoverSpeakers(url) {
  const candidates = [url];
  const u = new URL(url);
  if (!/speaker/i.test(u.pathname)) candidates.push(u.origin + '/speakers');

  let found = { people: [], conferenceName: '' };
  let usedUrl = url;
  let lastError = null;
  for (const c of candidates) {
    try {
      const html = await fetchHtml(c);
      const result = extractPeople(html, c);
      const have = new Set(result.people.map((p) => p.name.toLowerCase()));
      for (const p of extractCards(html, c)) if (!have.has(p.name.toLowerCase())) result.people.push(p);
      if (result.people.length) { found = result; usedUrl = c; break; }
      if (!found.conferenceName) found.conferenceName = result.conferenceName;
    } catch (e) { lastError = e; }
  }
  let source = 'json-ld';
  if (!found.people.length) {
    source = 'parallel';
    try { found = await speakersFromParallel(url); } catch (e) { lastError = lastError || e; }
  }
  if (!found.people.length) {
    throw httpError(lastError && lastError.status ? lastError.status : 404,
      lastError ? lastError.message : "No speakers found at that URL. Try the conference's speakers page.");
  }

  const used = new Set();
  const speakers = [];
  for (const p of found.people) {
    const key = p.name.toLowerCase();
    if (used.has(key)) continue;
    used.add(key);
    speakers.push({ id: slug(p.name), ...p, bio: '', topics: [], sources: [], enriched: false });
  }
  return { conferenceUrl: url, speakersUrl: usedUrl, conferenceName: found.conferenceName, fetchedAt: new Date().toISOString(), source, speakers };
}

module.exports = { discoverSpeakers };
