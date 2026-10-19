// "My CRM" drawer: contact list with status/email/notes, and the Google Sheets sync button.
(function () {
  const { esc, post } = Crm;
  const dlg = document.getElementById('crm');
  let busy = false;

  function sheetBlock() {
    const s = Crm.state.sheet || {};
    if (!s.id) return '<p class="muted">Not synced yet. Syncing creates a Google Sheet named "AI Ambassador CRM" in your Google account.</p>';
    return `<p class="muted">Sheet: <a href="${esc(s.url)}" target="_blank" rel="noopener">AI Ambassador CRM</a>${s.syncedAt ? ` · last synced ${esc(new Date(s.syncedAt).toLocaleTimeString())}` : ''}</p>`;
  }

  function row(c) {
    const opts = Crm.state.statuses.map((s) => `<option ${s === c.status ? 'selected' : ''}>${esc(s)}</option>`).join('');
    return `<li class="crm-row" data-id="${esc(c.id)}">
      <div class="crm-main"><strong>${esc(c.name)}</strong><span class="muted">${esc([c.title, c.org].filter(Boolean).join(' · '))}</span>
        <span class="where">${c.score} · ${esc(c.label)} · ${c.syncedAt ? 'in sheet' : 'not synced'}</span></div>
      <div class="crm-fields">
        <input class="c-email" type="email" placeholder="email" value="${esc(c.email)}" aria-label="Email for ${esc(c.name)}">
        <select class="c-status" aria-label="Status for ${esc(c.name)}">${opts}</select>
        <input class="c-notes" type="text" placeholder="notes" value="${esc(c.notes)}" aria-label="Notes for ${esc(c.name)}">
        <button type="button" class="link c-del">Remove</button>
      </div>
      <details class="crm-hunter"><summary>Find or verify email${c.hunter ? (c.hunter.verified ? ' · verified' : ' · unverified') : ''}</summary><div class="h-slot"></div></details></li>`;
  }

  function render() {
    const list = Crm.state.contacts;
    const sheet = Crm.state.sheet || {};
    dlg.querySelector('.p-body').innerHTML = `
      <h2 id="crm-title">My CRM</h2>
      ${sheetBlock()}
      <div class="o-actions">
        <button type="button" class="btn btn-primary" id="crm-sync" ${list.length && !busy ? '' : 'disabled'}>${busy ? 'Syncing…' : 'Sync to Google Sheets'}</button>
        ${sheet.url ? `<a class="btn btn-secondary" href="${esc(sheet.url)}" target="_blank" rel="noopener">Open sheet</a>` : ''}
      </div>
      <p id="crm-msg" class="muted" role="status">${esc(Crm.notice)}</p>
      ${list.length ? `<ul class="crm-list">${list.map(row).join('')}</ul>` : '<p class="muted">No contacts yet. Select speakers in the gallery and choose Add to CRM.</p>'}`;
    dlg.querySelector('#crm-sync').addEventListener('click', sync);
    dlg.querySelectorAll('.crm-row').forEach((li) => {
      const id = li.dataset.id;
      const patch = async (p) => {
        try { Crm.state = await post('/api/crm/update', { id, patch: p }); Crm.notice = 'Saved. Sync to update the sheet.'; } catch (e) { Crm.notice = e.message; }
        Crm.paint();
      };
      li.querySelector('.c-status').addEventListener('change', (e) => patch({ status: e.target.value }));
      li.querySelector('.c-email').addEventListener('change', (e) => patch({ email: e.target.value }));
      li.querySelector('.c-notes').addEventListener('change', (e) => patch({ notes: e.target.value }));
      li.querySelector('.crm-hunter').addEventListener('toggle', (e) => {
        const slot = li.querySelector('.h-slot');
        if (e.target.open && !slot.dataset.ready) {
          slot.dataset.ready = '1';
          HunterUI.mount(slot, id, { onChange: async () => { Crm.state = await (await fetch('/api/crm')).json(); Crm.notice = 'Email saved to your CRM. Sync to update the sheet.'; } });
        }
      });
      li.querySelector('.c-del').addEventListener('click', async () => {
        Crm.state = await post('/api/crm/remove', { id }); Crm.notice = 'Removed.'; Crm.paint(); Gallery.refresh();
      });
    });
  }

  async function sync() {
    busy = true; Crm.notice = ''; render();
    try {
      const out = await post('/api/crm/sync');
      Crm.state = out;
      Crm.notice = `${out.created ? 'Created the sheet and wrote' : 'Updated the sheet with'} ${out.rows} contact${out.rows === 1 ? '' : 's'}.`;
    } catch (e) { Crm.notice = e.message; }
    busy = false; Crm.paint();
  }

  dlg.querySelector('.p-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });

  window.CrmPanel = {
    open() { render(); if (!dlg.open) dlg.showModal(); },
    refresh() { if (dlg.open) render(); },
  };
})();
