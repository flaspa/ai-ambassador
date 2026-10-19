// Outreach panel inside the profile drawer: find email (Parallel) -> edit message -> create Gmail draft (never sent).
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const post = async (path, body) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Request failed (HTTP ${res.status}).`);
    return out;
  };
  const LEVEL = { high: 'Likely correct', medium: 'Possible match', none: 'Not found' };

  function emailBlock(sp) {
    const e = sp.emailLookup;
    if (!e) return '<p class="muted">Parallel searches the web for a published work email. Nothing is guessed.</p>';
    if (!e.email) return `<p class="muted">${esc(e.why)} Add an address yourself below.</p>`;
    return `<div class="email-found lvl-${e.confidence === 'high' ? 'strong' : 'good'}">
      <strong>${esc(e.email)}</strong> <span class="where">${esc(LEVEL[e.confidence] || '')}</span>
      <p class="muted">${esc(e.why)}. Source: <a href="${esc(e.sourceUrl)}" target="_blank" rel="noopener">${esc(e.sourceTitle)}</a></p>
      <p class="muted"><q>${esc(e.evidence)}</q></p></div>`;
  }

  function mount(el, sp) {
    const interests = localStorage.getItem('ambassador.interests') || '';
    const name = localStorage.getItem('ambassador.name') || '';
    const known = sp.emailLookup && sp.emailLookup.email ? sp.emailLookup.email : '';
    el.innerHTML = `
      <h3>Reach out</h3>
      <div id="o-email">${emailBlock(sp)}</div>
      <button id="o-find" class="btn btn-secondary" type="button">${sp.emailLookup ? 'Search for email again' : 'Find email with Parallel'}</button>
      <div class="o-form">
        <label for="o-to">To</label><input id="o-to" type="email" placeholder="name@company.com" value="${esc(known)}" autocomplete="off">
        <label for="o-name">Your name (signature)</label><input id="o-name" type="text" value="${esc(name)}" autocomplete="name">
        <label class="toggle"><input id="o-after" type="checkbox" checked> Write as a follow-up after the conference</label>
        <label for="o-subject">Subject</label><input id="o-subject" type="text">
        <label for="o-body">Message</label><textarea id="o-body" rows="11"></textarea>
        <div class="o-actions">
          <button id="o-regen" class="btn btn-secondary" type="button">Rewrite</button>
          <button id="o-copy" class="btn btn-secondary" type="button">Copy message</button>
          <button id="o-draft" class="btn btn-primary" type="button">Create Gmail draft</button>
        </div>
        <p id="o-msg" class="muted" role="status">This saves a draft in your Gmail. It is never sent automatically.</p>
      </div>`;
    const $ = (id) => el.querySelector(id);
    const say = (t, ok) => { const m = $('#o-msg'); m.innerHTML = t; m.className = ok ? 'muted ok' : 'muted'; };

    async function write() {
      localStorage.setItem('ambassador.name', $('#o-name').value);
      const top = Gallery.matchOf(sp).reasons[0] || null;
      try {
        const d = await post('/api/draft/text', { id: sp.id, interests, senderName: $('#o-name').value.trim(), happened: $('#o-after').checked, matchReason: top });
        $('#o-subject').value = d.subject; $('#o-body').value = d.body;
      } catch (e) { say(esc(e.message)); }
    }

    $('#o-find').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; b.disabled = true; b.classList.add('is-busy'); b.textContent = 'Searching…';
      try {
        sp.emailLookup = await post('/api/email', { id: sp.id });
        const typed = $('#o-to').value.trim();
        $('#o-email').innerHTML = emailBlock(sp);
        if (sp.emailLookup.email && !typed) $('#o-to').value = sp.emailLookup.email;
        b.textContent = 'Search for email again';
      } catch (e) { b.textContent = 'Find email with Parallel'; $('#o-email').innerHTML = `<p class="muted">${esc(e.message)}</p>`; }
      b.disabled = false; b.classList.remove('is-busy');
    });

    $('#o-regen').addEventListener('click', write);
    $('#o-after').addEventListener('change', write);
    $('#o-name').addEventListener('change', write);
    $('#o-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(`Subject: ${$('#o-subject').value}\n\n${$('#o-body').value}`); say('Copied.', true); }
      catch { say('Copy failed. Select the text and copy it manually.'); }
    });
    $('#o-draft').addEventListener('click', async (ev) => {
      const b = ev.currentTarget; const to = $('#o-to').value.trim();
      if (!to) { $('#o-to').focus(); say('Add a recipient email first.'); return; }
      if (/\[Your name\]/.test($('#o-body').value)) { $('#o-name').focus(); say('Add your name for the signature first.'); return; }
      b.disabled = true; b.classList.add('is-busy'); b.textContent = 'Creating draft…'; say('');
      try {
        await post('/api/draft', { to, subject: $('#o-subject').value, body: $('#o-body').value });
        say(`Draft created for ${esc(to)}. <a href="https://mail.google.com/mail/u/0/#drafts" target="_blank" rel="noopener">Open Gmail drafts</a>. Nothing was sent.`, true);
      } catch (e) { say(esc(e.message)); }
      b.disabled = false; b.classList.remove('is-busy'); b.textContent = 'Create Gmail draft';
    });
    write();
  }

  window.Outreach = { mount };
})();
