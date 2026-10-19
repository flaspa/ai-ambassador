// CRM state and selection bar. The panel UI lives in crm-panel.js. Nothing is written to Google Sheets
// until the user clicks "Sync to Google Sheets" in the panel.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const post = async (path, body) => {
    const res = await fetch(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Request failed (HTTP ${res.status}).`);
    return out;
  };

  const selected = new Set();
  const Crm = {
    esc, post, selected,
    state: { contacts: [], sheet: {}, statuses: [] },
    notice: '',
    inCrm: (id) => Crm.state.contacts.some((c) => c.id === id),
    isSelected: (id) => selected.has(id),
    toggle(id, on) { if (on) selected.add(id); else selected.delete(id); Crm.bar(); },

    pickOf(id) {
      const m = Gallery.matchOf(Gallery.byId(id)); const top = m.reasons[0];
      return { id, score: m.score, label: m.label, reason: top ? `${top.interest}: ${top.snippet}` : '' };
    },

    async add(ids) {
      const fresh = ids.filter((id) => !Crm.inCrm(id));
      if (!fresh.length) { Crm.notice = 'Already in your CRM.'; Crm.paint(); return; }
      try {
        const out = await post('/api/crm/add', { contacts: fresh.map(Crm.pickOf) });
        Crm.state = out; Crm.notice = `Added ${out.added} to your CRM.`;
        ids.forEach((id) => selected.delete(id));
      } catch (e) { Crm.notice = e.message; }
      Crm.paint(); Gallery.refresh();
    },

    bar() {
      const el = document.getElementById('crm-bar');
      if (!el) return;
      const n = selected.size;
      el.innerHTML = `
        <span class="count">${n ? `${n} selected` : 'Select speakers with the checkboxes to add them to your CRM'}</span>
        <button type="button" class="btn btn-primary" id="crm-add" ${n ? '' : 'disabled'}>Add ${n || ''} to CRM</button>
        <button type="button" class="btn btn-secondary" id="crm-open">My CRM (${Crm.state.contacts.length})</button>
        <span class="crm-note" role="status">${esc(Crm.notice)}</span>`;
      el.querySelector('#crm-add').addEventListener('click', () => Crm.add([...selected]));
      el.querySelector('#crm-open').addEventListener('click', () => Crm.open());
    },

    paint() { Crm.bar(); if (window.CrmPanel) CrmPanel.refresh(); },
    async load() { try { Crm.state = await (await fetch('/api/crm')).json(); } catch { /* panel shows empty */ } Crm.paint(); },
    open() { CrmPanel.open(); },
  };
  window.Crm = Crm;
})();
