// Email finder: Parallel Search looks for a published work email, and we keep it only if the page says so.
// Every result carries its evidence (source URL + the sentence it came from) and a confidence level.
// Guessed addresses (first.last@company.com) are never returned as found; they are labeled "pattern guess".
const { parallelSearch, readCache, writeCache, httpError } = require('./util');

const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
const GENERIC = /^(info|contact|hello|press|media|support|sales|admin|office|team|careers|jobs|privacy|webmaster|noreply|no-reply|events?|marketing|hr)@/i;
const FREE = /@(gmail|yahoo|outlook|hotmail|icloud|proton(mail)?|aol|live)\./i;

const norm = (s) => String(s).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]/g, '');
const clean = (t) => String(t).replace(/\s+/g, ' ').trim();

// Words from the org that should appear in the email domain (for example "Bedrock Robotics" -> bedrock).
function orgTokens(org) {
  return String(org).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^(inc|llc|ltd|corp|the|and|labs|group|company|co)$/.test(w));
}

// People-lookup and lead-generation sites list many different people with the same name. Never trusted.
const AGGREGATORS = /contactout|rocketreach|zoominfo|signalhire|apollo\.io|lusha|nictusa|peoplefinder|spokeo|whitepages|hunter\.io|adapt\.io|clearbit|leadiq|email-?format|datanyze|anymail|voilanorbert|findthat|people-?search|fastpeoplesearch|radaris|mylife|beenverified|idcrawl|zoominfo|cbinsights|crunchbase|pitchbook/i;

// An address is accepted only when it is tied to the speaker's company: either the address domain
// contains the company name, or the page text next to it names the company. A name match alone is not enough.
function judge(sp, email, context, pageText, sourceUrl) {
  if (AGGREGATORS.test(sourceUrl || '')) return null;
  const local = norm(email.split('@')[0]);
  const domain = norm(email.split('@')[1]);
  const parts = sp.name.split(/\s+/).filter(Boolean);
  const first = norm(parts[0] || '');
  const last = norm(parts[parts.length - 1] || '');
  const nameInLocal = (first.length > 1 && local.includes(first)) || (last.length > 2 && local.includes(last));
  const lowCtx = context.toLowerCase();
  const nameNearby = lowCtx.includes(sp.name.toLowerCase()) || (last.length > 2 && lowCtx.includes(last));
  const tokens = orgTokens(sp.org);
  const orgInDomain = tokens.some((t) => domain.includes(norm(t)));
  const orgInPage = tokens.some((t) => pageText.toLowerCase().includes(t));
  if (GENERIC.test(email) || FREE.test(email)) return null;
  if (nameInLocal && orgInDomain) return { confidence: 'high', why: 'The address name and company domain match the speaker' };
  if (orgInDomain && nameNearby) return { confidence: 'high', why: 'Company domain matches and the speaker is named next to the address' };
  if (nameInLocal && nameNearby && orgInPage) return { confidence: 'medium', why: 'Name matches and the page mentions the speaker\'s company, but the domain differs' };
  return null;
}

function sentenceAround(text, email) {
  const i = text.indexOf(email);
  const a = Math.max(0, i - 90);
  const b = Math.min(text.length, i + email.length + 60);
  return (a > 0 ? '…' : '') + clean(text.slice(a, b)) + (b < text.length ? '…' : '');
}

async function findEmail(sp) {
  const data = await parallelSearch({
    objective: `Find the published work email address of ${sp.name}, ${sp.title} at ${sp.org}. Only return an address that appears on a web page.`,
    search_queries: [`${sp.name} ${sp.org} email`, `${sp.name} ${sp.org} contact`, `"${sp.name}" email address`],
    max_chars_total: 6000,
  });
  const found = new Map();
  for (const r of data.results || []) {
    for (const ex of r.excerpts || []) {
      const text = clean(ex);
      for (const email of text.match(EMAIL_RE) || []) {
        const e = email.replace(/[.,;:]+$/, '').toLowerCase();
        const j = judge(sp, e, sentenceAround(text, email), text, r.url);
        if (!j) continue;
        const prev = found.get(e);
        const rank = { high: 2, medium: 1 };
        if (!prev || rank[j.confidence] > rank[prev.confidence]) {
          found.set(e, { email: e, confidence: j.confidence, why: j.why, sourceUrl: r.url, sourceTitle: clean(r.title || r.url), evidence: sentenceAround(text, email) });
        }
      }
    }
  }
  const best = [...found.values()].sort((a, b) => (b.confidence === 'high') - (a.confidence === 'high'))[0];
  return best || null;
}

// Pattern guess from addresses seen in the conference's own data is not available, so only offer a company domain hint.
async function emailFor(id) {
  const cache = readCache();
  const sp = cache && cache.speakers.find((s) => s.id === id);
  if (!sp) throw httpError(404, 'Speaker not found. Load the conference first.');
  const found = await findEmail(sp);
  sp.emailLookup = found
    ? { ...found, checkedAt: new Date().toISOString() }
    : { email: '', confidence: 'none', why: 'No published work email found in web results.', checkedAt: new Date().toISOString() };
  writeCache(cache);
  return sp.emailLookup;
}

module.exports = { emailFor };
