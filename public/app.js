// AI Ambassador, Milestone 1: landing page + real speaker data preview.
const form = document.getElementById('finder');
const urlInput = document.getElementById('conf-url');
const interests = document.getElementById('interests');
const findBtn = document.getElementById('find-btn');
const results = document.getElementById('results');


let current = null;

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const initials = (name) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');

// Remember inputs for the next milestones.
interests.value = localStorage.getItem('ambassador.interests') || interests.value;
urlInput.value = localStorage.getItem('ambassador.url') || urlInput.value;

document.querySelectorAll('.chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    const add = chip.dataset.add;
    const have = interests.value.split(',').map((s) => s.trim().toLowerCase());
    if (have.includes(add.toLowerCase())) return;
    interests.value = interests.value.trim().replace(/,$/, '');
    interests.value += (interests.value ? ', ' : '') + add;
  });
});

function showStatus(text) {
  results.hidden = false;
  results.innerHTML = `<div class="status"><span class="spinner" aria-hidden="true"></span><span>${esc(text)}</span></div>`;
}
function showError(message) {
  results.hidden = false;
  results.innerHTML = `<div class="error" role="alert"><strong>We could not load speakers.</strong>${esc(message)}</div>`;
}

function render(data) {
  current = data;
  const total = data.speakers.length;
  const enriched = data.speakers.filter((s) => s.enriched).length;
  const sourceLabel = data.source === 'json-ld' ? 'Read from the conference page' : 'Found with Parallel search';
  const badge = data.cached
    ? '<span class="badge badge-cached">Cached</span>'
    : '<span class="badge badge-live">Live</span>';
  const note = enriched
    ? `<p class="enrich-note is-ok">${enriched} of ${total} speakers researched with Parallel.</p>`
    : `<p class="enrich-note">${data.parallelConfigured ? 'Run Parallel research to add biographies and topics.' : 'Add PARALLEL_API_KEY to .env to enable research.'}</p>`;

  results.hidden = false;
  results.innerHTML = `
    <div class="results-head">
      <div>
        <h2>${esc(data.conferenceName)}</h2>
        <div class="meta"><span>${total} speakers</span><span>${sourceLabel}</span>${badge}</div>
        ${note}
      </div>
      <button id="enrich-btn" class="btn btn-secondary" type="button" ${data.parallelConfigured ? '' : 'disabled'}>
        ${enriched === total ? 'Refresh research' : 'Research with Parallel'}
      </button>
    </div>
    <div id="gallery"></div>`;

  document.getElementById('enrich-btn').addEventListener('click', runEnrich);
  Gallery.set(data.speakers, interests.value);
}

async function loadSpeakers() {
  const url = urlInput.value.trim();
  localStorage.setItem('ambassador.url', url);
  localStorage.setItem('ambassador.interests', interests.value);
  findBtn.disabled = true;
  showStatus('Reading the speaker list…');
  try {
    const res = await fetch(`/api/speakers?url=${encodeURIComponent(url)}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Request failed (HTTP ${res.status}).`);
    render(data);
  } catch (e) {
    showError(e.message);
  } finally {
    findBtn.disabled = false;
  }
}

async function runEnrich() {
  const btn = document.getElementById('enrich-btn');
  const pending = current.speakers.filter((s) => !s.enriched).length;
  const count = pending || current.speakers.length;
  btn.disabled = true;
  btn.classList.add('is-busy');
  btn.textContent = 'Researching…';
  const note = results.querySelector('.enrich-note');
  note.className = 'enrich-note';
  note.textContent = `Searching the web for ${count} speakers. This can take up to a minute.`;
  try {
    const res = await fetch('/api/enrich', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pending ? {} : { ids: current.speakers.map((s) => s.id) }),
    });
    const out = await res.json();
    if (!res.ok) throw new Error(out.error || `Request failed (HTTP ${res.status}).`);
    const fresh = await (await fetch(`/api/speakers?url=${encodeURIComponent(urlInput.value.trim())}`)).json();
    render(fresh);
    const n = results.querySelector('.enrich-note');
    n.className = 'enrich-note is-ok';
    n.textContent = `Researched ${out.enriched} speakers with Parallel${out.failed ? `; ${out.failed} failed (${Object.keys(out.failures).join(', ')})` : ''}.`;
  } catch (e) {
    btn.disabled = false;
    btn.classList.remove('is-busy');
    btn.textContent = 'Research with Parallel';
    note.textContent = e.message;
  }
}

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (!urlInput.value.trim()) { urlInput.focus(); return; }
  loadSpeakers();
});

Crm.load();

// Re-rank instantly when the interests change (no server call).
let rankTimer;
interests.addEventListener('input', () => {
  clearTimeout(rankTimer);
  rankTimer = setTimeout(() => { localStorage.setItem('ambassador.interests', interests.value); Gallery.setInterests(interests.value); }, 250);
});
document.querySelectorAll('.chip').forEach((chip) => chip.addEventListener('click', () => interests.dispatchEvent(new Event('input'))));

// Demo shortcuts: /?auto=1 loads speakers immediately; &open=<id> opens a profile.
const params = new URLSearchParams(location.search);
if (params.has('auto')) {
  loadSpeakers().then(() => { const id = params.get('open'); if (id && Gallery.byId(id)) Profile.open(id); if (params.has('crm')) Crm.load().then(() => Crm.open()); });
}