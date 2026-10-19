// Composio REST client. Used for Gmail drafts only; there is deliberately no send function here.
const { httpError } = require('./util');

const BASE = 'https://backend.composio.dev/api/v3.1';
const accounts = {};

function key() {
  const k = process.env.COMPOSIO_API_KEY;
  if (!k) throw httpError(400, 'COMPOSIO_API_KEY is missing. Add it to the local .env file and restart the server.');
  return k;
}

async function api(method, path, body) {
  const res = await fetch(BASE + path, {
    method, signal: AbortSignal.timeout(30000),
    headers: { 'x-api-key': key(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (json.error && json.error.message) || `Composio request failed (HTTP ${res.status}).`;
    throw httpError(res.status === 401 ? 401 : 502, msg);
  }
  return json;
}

// Newest ACTIVE connection for a toolkit, found through the key's own project.
async function account(toolkit, force) {
  if (accounts[toolkit] && !force) return accounts[toolkit];
  const list = await api('GET', `/connected_accounts?toolkit_slugs=${toolkit}&limit=20`);
  const active = (list.items || []).filter((i) => i.status === 'ACTIVE' && i.toolkit && i.toolkit.slug === toolkit);
  if (!active.length) throw httpError(409, `No active ${toolkit} connection in Composio. Connect ${toolkit} first.`);
  active.sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  accounts[toolkit] = { id: active[0].id, userId: active[0].user_id };
  return accounts[toolkit];
}

async function execute(toolkit, slug, args) {
  const acct = await account(toolkit);
  const out = await api('POST', `/tools/execute/${slug}`, { connected_account_id: acct.id, user_id: acct.userId, arguments: args });
  if (out.successful === false) throw httpError(502, `${slug} failed: ${String(out.error || 'unknown error').slice(0, 200)}`);
  return (out.data && (out.data.response_data || out.data)) || {};
}

async function gmailProfile() {
  const d = await execute('gmail', 'GMAIL_GET_PROFILE', { user_id: 'me' });
  return { email: d.emailAddress || '' };
}

// Creates a draft in the connected Gmail account. It is never sent.
async function createGmailDraft({ to, subject, body }) {
  const d = await execute('gmail', 'GMAIL_CREATE_EMAIL_DRAFT', { recipient_email: to, subject, body, is_html: false, user_id: 'me' });
  const draft = d.draft || d;
  return { draftId: draft.id || d.draft_id || d.id || '', messageId: (draft.message && draft.message.id) || '' };
}

async function status() {
  const out = { composioKey: !!process.env.COMPOSIO_API_KEY, gmail: false, googlesheets: false, gmailAddress: '' };
  if (!out.composioKey) return out;
  for (const t of ['gmail', 'googlesheets']) {
    try { await account(t, true); out[t] = true; } catch { /* not connected */ }
  }
  if (out.gmail) { try { out.gmailAddress = (await gmailProfile()).email; } catch { /* profile is optional */ } }
  return out;
}

module.exports = { status, createGmailDraft };
