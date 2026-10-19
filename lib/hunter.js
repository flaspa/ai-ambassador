// Hunter Email Finder / Verifier through Composio Instant (Composio-billed; no Hunter account or key).
// Lookups cost money, so nothing here runs on its own: every call comes from a user click that was confirmed
// in the UI, and results are saved so the same person is never paid for twice.
const { readCache, writeCache, httpError } = require('./util');
const composio = require('./composio');
const crm = require('./crm');

const COST = { find: 0.024, verify: 0.012 }; // USD, from the Composio catalog: Finder per email found, Verifier per billed check
const costs = () => ({ find: COST.find, verify: COST.verify });

// Hunter statuses that mean "safe to treat as verified". accept_all, risky and unknown are NOT.
const VERIFIED = new Set(['valid']);
const isVerified = (status) => VERIFIED.has(String(status || '').toLowerCase());

// Sites that write about people rather than belong to their company: never offered as a company domain.
const SKIP_HOSTS = /(^|\.)(linkedin|twitter|x|facebook|instagram|youtube|crunchbase|bloomberg|wikipedia|medium|github|techcrunch|forbes|reuters|cnbc|wsj|nytimes|vox|mitaiconference|mit|google|contactout|rocketreach|zoominfo|wikimedia|substack|podcasts?|apple|spotify|businesswire|prnewswire|globenewswire)\.[a-z.]+$/i;

// Registrable domain: last two labels, or last three for endings like .co.uk.
const rootOf = (host) => {
  const parts = host.replace(/^www\./, '').split('.');
  const second = parts[parts.length - 2];
  return parts.slice(/^(co|com|org|net|ac|gov)$/.test(second) && parts.length > 2 ? -3 : -2).join('.');
};
const orgWords = (org) => String(org).toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2 && !/^(inc|llc|ltd|corp|the|and|labs|group|company|co|university|institute)$/.test(w));

// A suggested company domain: a source link whose host is not a news/social site and contains a word from the
// company name. It is only a suggestion; the user sees it, can edit it, and confirms it before any paid lookup.
function domainFor(sp) {
  const urls = [...(sp.sources || []).map((s) => s.url), sp.profileUrl].filter(Boolean);
  const words = orgWords(sp.org);
  for (const u of urls) {
    let host = '';
    try { host = new URL(u).hostname.toLowerCase().replace(/^www\./, ''); } catch { continue; }
    if (SKIP_HOSTS.test(host)) continue;
    if (words.some((w) => host.replace(/[^a-z0-9]/g, '').includes(w))) return rootOf(host);
  }
  return '';
}

const publicResult = (r) => r && ({
  email: r.email, score: r.score, status: r.status, accepted: !!r.accepted, verified: !!r.verified,
  sourceType: r.sourceType, domain: r.domain, position: r.position, checkedAt: r.checkedAt, verifiedAt: r.verifiedAt || '', cost: r.cost,
});

// A person can be in the loaded conference's research cache, in the CRM, or both (the CRM outlives the cache).
// Results are saved in both places so a saved lookup is never paid for again.
function loadSpeaker(id) {
  const cache = readCache();
  const fromCache = cache && cache.speakers.find((s) => s.id === id);
  const crmData = crm._load();
  const fromCrm = crmData.contacts.find((c) => c.id === id);
  if (!fromCache && !fromCrm) throw httpError(404, 'Person not found. Load the conference or add them to your CRM first.');
  const sp = fromCache || { id, name: fromCrm.name, title: fromCrm.title, org: fromCrm.org, profileUrl: fromCrm.profileUrl, sources: [] };
  const saved = (fromCache && fromCache.hunter) || (fromCrm && fromCrm.hunter) || null;
  const persist = (hunter) => {
    if (fromCache) { fromCache.hunter = hunter; fromCache.emailLookup = hunter ? emailLookupOf(hunter) : fromCache.emailLookup; writeCache(cache); }
    if (fromCrm) {
      fromCrm.hunter = hunter; fromCrm.syncedAt = '';
      if (hunter && hunter.email) fromCrm.email = hunter.email;
      crm._save(crmData);
    }
  };
  return { sp, saved, persist, hasCrm: !!fromCrm };
}

const emailLookupOf = (h) => ({
  email: h.email, confidence: h.score >= 90 && h.verified ? 'high' : 'medium', why: `Hunter (${h.sourceType || 'lookup'}), score ${h.score}`,
  sourceUrl: '', sourceTitle: 'Hunter via Composio', evidence: '', checkedAt: h.checkedAt,
});

// Preview only: no network call, no charge. The UI shows this and asks for confirmation.
function quote(id) {
  const { sp, saved } = loadSpeaker(id);
  return { id, name: sp.name, domain: domainFor(sp), saved: saved && saved.email ? publicResult(saved) : null, cost: costs() };
}

async function find(id, domainOverride) {
  const { sp, saved, persist } = loadSpeaker(id);
  if (saved && saved.email) return { ...publicResult(saved), cached: true }; // never pay twice
  const domain = String(domainOverride || domainFor(sp)).toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/.*$/, '').trim();
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(domain)) throw httpError(400, 'Enter the company domain, for example company.com.');
  const d = await composio.instantTool('HUNTER_EMAIL_FINDER', { domain, full_name: sp.name, max_duration: 10 });
  const r = (d.data && d.data.email !== undefined ? d.data : d) || {};
  if (!r.email) {
    return { email: '', domain, cached: false, cost: 0, message: 'Hunter found no email for this person at that domain. You were not charged.' };
  }
  const status = String((r.verification && r.verification.status) || 'unknown').toLowerCase();
  const hunter = {
    email: String(r.email).toLowerCase(), score: Number(r.score) || 0, status, accepted: !!r.accept_all,
    verified: isVerified(status) && !r.accept_all, sourceType: r.source_type || '', domain, position: r.position || '',
    checkedAt: new Date().toISOString(), cost: COST.find,
  };
  persist(hunter);
  return { ...publicResult(hunter), cached: false };
}

async function verify(id) {
  const { saved, persist } = loadSpeaker(id);
  if (!saved || !saved.email) throw httpError(400, 'Find an email first.');
  if (saved.verifiedAt) return { ...publicResult(saved), cached: true };
  const d = await composio.instantTool('HUNTER_EMAIL_VERIFIER', { email: saved.email });
  const r = (d.data && d.data.status !== undefined ? d.data : d) || {};
  const status = String(r.status || 'unknown').toLowerCase();
  const hunter = { ...saved, status, accepted: !!(r.accept_all || status === 'accept_all') };
  hunter.verified = isVerified(status) && !hunter.accepted;
  hunter.verifiedAt = new Date().toISOString();
  hunter.cost = Math.round((saved.cost + COST.verify) * 1000) / 1000;
  persist(hunter);
  return { ...publicResult(hunter), cached: false };
}

module.exports = { quote, find, verify, costs };
