// Profile drawer: opens from a gallery card, shows the match explanation and live Parallel sources.
(function () {
  const dlg = document.getElementById('profile');
  let opener = null;
  let currentId = null;
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const domain = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };

  function ago(iso) {
    if (!iso) return 'not yet';
    const s = Math.max(0, (Date.now() - new Date(iso)) / 1000);
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.round(s / 60)} min ago`;
    if (s < 86400) return `${Math.round(s / 3600)} h ago`;
    return `${Math.round(s / 86400)} days ago`;
  }

  function body(sp, m) {
    const search = `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${sp.name} ${sp.org}`.trim())}`;
    const reasons = m.reasons.length
      ? `<ul class="reasons">${m.reasons.map((r) => `<li><strong>${esc(r.interest)}</strong> <q>${esc(r.snippet)}</q> <span class="where">${esc(r.field)}</span></li>`).join('')}</ul>`
      : '<p class="muted">No overlap with your interests found in the research so far.</p>';
    const sources = (sp.sources || []).length
      ? `<ul class="sources">${sp.sources.map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title || s.url)}</a><span class="where">${esc(domain(s.url))}</span>${s.excerpt && !/connection count|follower count|company name:/i.test(s.excerpt) ? `<p>${esc(s.excerpt)}</p>` : ''}</li>`).join('')}</ul>`
      : '<p class="muted">No sources yet. Run research to add them.</p>';
    return `
      <div class="p-head">
        <div class="avatar avatar-lg">${esc(initials(sp.name))}${sp.image ? `<img src="${esc(sp.image)}" alt="" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</div>
        <div><h2 id="p-title">${esc(sp.name)}</h2><p class="role">${esc([sp.title, sp.org].filter(Boolean).join(' · '))}</p></div>
      </div>
      <div class="p-score lvl-${m.level}"><span class="num">${m.score}</span><div><strong>${esc(m.label)}</strong><div class="bar"><i style="width:${m.score}%"></i></div></div></div>
      <h3>Why you match</h3>${reasons}
      <h3>About</h3>${sp.bio ? `<p>${esc(sp.bio)}</p>` : '<p class="muted">No public biography found.</p>'}
      ${(sp.topics || []).length ? `<ul class="topics">${sp.topics.map((t) => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}
      <div class="p-links">
        ${sp.linkedin ? `<a href="${esc(sp.linkedin)}" target="_blank" rel="noopener">LinkedIn profile</a>` : `<a href="${esc(search)}" target="_blank" rel="noopener">Find on LinkedIn</a>`}
        ${sp.profileUrl ? `<a href="${esc(sp.profileUrl)}" target="_blank" rel="noopener">Conference profile</a>` : ''}
      </div>
      <h3>Sources</h3>${sources}
      <div class="p-foot">
        <span id="p-fresh" class="muted">${sp.enriched ? `Researched with Parallel · ${esc(ago(sp.enrichedAt))}` : 'Not researched yet'}</span>
        <button id="p-research" class="btn btn-secondary" type="button">Research again with Parallel</button>
      </div>
      <p id="p-msg" class="muted" role="status"></p>
      <div id="p-actions"></div>`;
  }

  function render() {
    const sp = Gallery.byId(currentId);
    if (!sp) return;
    dlg.querySelector('.p-body').innerHTML = body(sp, Gallery.matchOf(sp));
    dlg.querySelector('#p-research').addEventListener('click', research);
    if (window.Outreach) window.Outreach.mount(dlg.querySelector('#p-actions'), sp);
  }

  async function research() {
    const btn = dlg.querySelector('#p-research');
    const msg = dlg.querySelector('#p-msg');
    btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = 'Researching…'; msg.textContent = '';
    try {
      const res = await fetch('/api/enrich', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids: [currentId] }) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || `Request failed (HTTP ${res.status}).`);
      if (out.failed) throw new Error(`Parallel search failed (${Object.keys(out.failures).join(', ')}).`);
      Gallery.update(out.speakers || []);
      render();
      const fresh = dlg.querySelector('#p-fresh');
      if (fresh) fresh.innerHTML = '<span class="live-dot"></span>Live · just now';
    } catch (e) {
      btn.disabled = false; btn.classList.remove('is-busy'); btn.textContent = 'Research again with Parallel';
      msg.textContent = e.message;
    }
  }

  function open(id, from) {
    currentId = id; opener = from || null;
    render();
    if (!dlg.open) dlg.showModal();
    dlg.querySelector('.p-body').scrollTop = 0;
  }

  dlg.querySelector('.p-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
  dlg.addEventListener('close', () => { if (opener && document.contains(opener)) opener.focus(); });

  window.Profile = { open, refresh: () => { if (dlg.open) render(); } };
})();
