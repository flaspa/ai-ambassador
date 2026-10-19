// Personal CRM. Contacts live in data/crm.json (git-ignored). "Sync" writes them to a Google Sheet through
// Composio, only when the user clicks. Syncing rewrites the table, so it never creates duplicate rows.
const fs = require('fs');
const path = require('path');
const { readCache, httpError } = require('./util');
const composio = require('./composio');

const DIR = path.join(__dirname, '..', 'data');
const FILE = path.join(DIR, 'crm.json');
const STATUSES = ['To contact', 'Draft ready', 'Contacted', 'Replied', 'Not a fit'];
const HEADER = ['Name', 'Title', 'Company', 'Match score', 'Match', 'Why they match', 'Email', 'LinkedIn', 'Conference profile', 'Status', 'Notes', 'Conference', 'Added', 'Email check'];

// Only a Hunter result with status "valid" counts as verified. accept_all, risky and unknown are unverified.
const emailCheck = (c) => (!c.email ? '' : c.hunter && c.hunter.email === c.email
  ? (c.hunter.verified ? `Verified (score ${c.hunter.score})` : `Unverified: ${c.hunter.accepted ? 'accept_all' : c.hunter.status} (score ${c.hunter.score})`) : 'Entered by hand');

const clip = (v, n = 400) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

function load() {
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return { contacts: [], sheet: {} }; }
}
function save(d) {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify(d, null, 2));
}
const view = (d) => ({ contacts: d.contacts, sheet: d.sheet || {}, statuses: STATUSES });

function list() { return view(load()); }

// picks: [{ id, score, label, reason }]. Speaker details come from the server-side cache.
function add(picks) {
  const cache = readCache();
  if (!cache) throw httpError(400, 'Load a conference first.');
  const d = load();
  let added = 0;
  for (const p of Array.isArray(picks) ? picks.slice(0, 100) : []) {
    const sp = cache.speakers.find((s) => s.id === p.id);
    if (!sp || d.contacts.some((c) => c.id === sp.id)) continue;
    d.contacts.push({
      id: sp.id, name: sp.name, title: sp.title || '', org: sp.org || '',
      email: (sp.emailLookup && sp.emailLookup.email) || '', linkedin: sp.linkedin || '', profileUrl: sp.profileUrl || '',
      ...(sp.hunter ? { hunter: sp.hunter } : {}), // keep a paid Hunter result with the contact so it is never bought twice
      score: Math.max(0, Math.min(100, Number(p.score) || 0)), label: clip(p.label, 40), reason: clip(p.reason, 200),
      conference: cache.conferenceName || '', status: 'To contact', notes: '', addedAt: new Date().toISOString(),
    });
    added++;
  }
  save(d);
  return { ...view(d), added };
}

function update(id, patch) {
  const d = load();
  const c = d.contacts.find((x) => x.id === id);
  if (!c) throw httpError(404, 'That contact is not in your CRM.');
  if ('status' in patch) {
    if (!STATUSES.includes(patch.status)) throw httpError(400, 'Unknown status.');
    c.status = patch.status;
  }
  if ('email' in patch) {
    const e = clip(patch.email, 200);
    if (e && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) throw httpError(400, 'Enter a valid email address.');
    c.email = e;
  }
  if ('notes' in patch) c.notes = clip(patch.notes, 500);
  c.syncedAt = '';
  save(d);
  return view(d);
}

function remove(id) {
  const d = load();
  d.contacts = d.contacts.filter((c) => c.id !== id);
  save(d);
  return view(d);
}

const row = (c) => [c.name, c.title, c.org, c.score, c.label, c.reason, c.email, c.linkedin, c.profileUrl, c.status, c.notes, c.conference, (c.addedAt || '').slice(0, 10), emailCheck(c)];

async function sync() {
  const d = load();
  if (!d.contacts.length) throw httpError(400, 'Add at least one speaker to your CRM first.');
  const sheet = d.sheet || {};
  let created = false;
  if (!sheet.id) {
    const s = await composio.createSheet('AI Ambassador CRM');
    d.sheet = { id: s.id, url: s.url, rowCount: 0 };
    created = true;
  }
  const tab = (await composio.firstTab(d.sheet.id)) || 'Sheet1';
  const rows = [HEADER, ...d.contacts.map(row)];
  const blanks = Math.max(0, (d.sheet.rowCount || 0) - rows.length); // clear rows left over from removed contacts
  const padded = rows.concat(Array.from({ length: blanks }, () => HEADER.map(() => '')));
  await composio.writeRows(d.sheet.id, tab, padded);
  const now = new Date().toISOString();
  d.sheet.rowCount = rows.length;
  d.sheet.syncedAt = now;
  d.contacts.forEach((c) => { c.syncedAt = now; });
  save(d);
  return { ...view(d), rows: d.contacts.length, created };
}

module.exports = { list, add, update, remove, sync, _load: load, _save: save };
