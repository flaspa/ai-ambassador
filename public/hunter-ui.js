// "Find email" block (Hunter via Composio Instant). Paid lookups need an explicit confirmation that shows the cost.
// Used in the profile drawer and on CRM contacts. Never searches in bulk and never sends anything.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => `$${Number(n).toFixed(3)}`;
  const call = async (method, path, body) => {
    const res = await fetch(path, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(out.error || `Request failed (HTTP ${res.status}).`);
    return out;
  };

  // Verified means Hunter status "valid". accept_all, risky and unknown (and anything else) are shown as unverified.
  function statusLine(r) {
    const s = r.accepted ? 'accept_all' : r.status;
    const label = r.verified ? 'Verified' : `Unverified (${esc(s || 'unknown')})`;
    return `<span class="hv ${r.verified ? 'hv-ok' : 'hv-warn'}">${label}</span>`;
  }

  function resultHtml(r) {
    return `<div class="email-found lvl-${r.verified ? 'strong' : 'good'}">
      <strong>${esc(r.email)}</strong> ${statusLine(r)}
      <p class="muted">Confidence score ${esc(r.score)} / 100${r.domain ? ` · ${esc(r.domain)}` : ''}${r.cached ? ' · saved result, no new charge' : ''}</p>
      ${r.verified ? '' : '<p class="muted">Not confirmed as deliverable. Check it before relying on it.</p>'}</div>`;
  }

  // el: container. id: speaker id. opts.onChange(result): called after a lookup or verification so callers can update.
  async function mount(el, id, opts = {}) {
    el.innerHTML = '<p class="muted">Checking saved results…</p>';
    let q;
    try { q = await call('GET', `/api/hunter/quote?id=${encodeURIComponent(id)}`); }
    catch (e) { el.innerHTML = `<p class="muted">${esc(e.message)}</p>`; return; }
    let saved = q.saved;

    const draw = (msg = '') => {
      el.innerHTML = `
        ${saved ? resultHtml({ ...saved, cached: true }) : '<p class="muted">Hunter looks up a professional email from the person\'s name and company domain. It is a paid lookup and runs only when you confirm.</p>'}
        <div class="h-actions">
          ${saved ? '' : '<button type="button" class="btn btn-secondary h-find">Find email</button>'}
          ${saved && !saved.verifiedAt ? `<button type="button" class="btn btn-secondary h-verify">Verify email (about ${money(q.cost.verify)})</button>` : ''}
        </div>
        <div class="h-confirm" hidden></div>
        <p class="muted h-msg" role="status">${msg}</p>`;
      el.querySelector('.h-find')?.addEventListener('click', askFind);
      el.querySelector('.h-verify')?.addEventListener('click', askVerify);
    };

    const confirmBox = (html, onYes) => {
      const box = el.querySelector('.h-confirm');
      box.hidden = false; box.innerHTML = html;
      box.querySelector('.h-no').addEventListener('click', () => { box.hidden = true; box.innerHTML = ''; });
      box.querySelector('.h-yes').addEventListener('click', onYes);
      box.querySelector('input,.h-yes').focus();
    };

    const run = async (btn, path, body) => {
      btn.disabled = true; btn.classList.add('is-busy'); btn.textContent = 'Working…';
      try {
        const r = await call('POST', path, { id, confirmed: true, ...body });
        if (r.email) { saved = r; if (opts.onChange) opts.onChange(r); draw(r.cached ? 'Saved result reused. No new charge.' : `Done. Charged up to ${money(path.endsWith('verify') ? q.cost.verify : q.cost.find)}.`); }
        else draw(esc(r.message || 'No email found.'));
      } catch (e) { draw(esc(e.message)); }
    };

    function askFind() {
      confirmBox(`
        <p><strong>Paid lookup: up to ${money(q.cost.find)}</strong>, charged by Composio only if an email is found. No charge if nothing is found.</p>
        <label for="h-domain">Company domain for ${esc(q.name)}</label>
        <input id="h-domain" type="text" value="${esc(q.domain)}" placeholder="company.com" autocomplete="off">
        <p class="muted">Check the domain: a wrong one wastes the lookup.</p>
        <div class="h-actions"><button type="button" class="btn btn-primary h-yes">Confirm and search</button><button type="button" class="btn btn-secondary h-no">Cancel</button></div>`,
      (ev) => run(ev.currentTarget, '/api/hunter/find', { domain: el.querySelector('#h-domain').value }));
    }

    function askVerify() {
      confirmBox(`
        <p><strong>Paid check: about ${money(q.cost.verify)}</strong> to verify ${esc(saved.email)}.</p>
        <div class="h-actions"><button type="button" class="btn btn-primary h-yes">Confirm and verify</button><button type="button" class="btn btn-secondary h-no">Cancel</button></div>`,
      (ev) => run(ev.currentTarget, '/api/hunter/verify', {}));
    }

    draw();
  }

  window.HunterUI = { mount };
})();
