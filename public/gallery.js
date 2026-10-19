// Gallery: ranked, filterable grid of every speaker.
(function () {
  let speakers = [];
  let sort = 'match';
  let filter = '';
  let goodOnly = false;
  let interestText = '';
  let matches = new Map();
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const initials = (n) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0].toUpperCase()).join('');
  const root = () => document.getElementById('gallery');

  function rescore() {
    const list = Match.parse(interestText);
    matches = new Map(speakers.map((s) => [s.id, Match.score(s, list)]));
  }
  const matchOf = (sp) => matches.get(sp.id) || { score: 0, level: 'low', label: 'Low match', reasons: [] };

  function visible() {
    const q = filter.trim().toLowerCase();
    let list = speakers.filter((s) => {
      if (goodOnly && matchOf(s).score < 40) return false;
      if (!q) return true;
      return [s.name, s.org, s.title, ...(s.topics || [])].join(' ').toLowerCase().includes(q);
    });
    list = list.slice().sort((a, b) => (sort === 'name'
      ? a.name.localeCompare(b.name)
      : matchOf(b).score - matchOf(a).score || a.name.localeCompare(b.name)));
    return list;
  }

  function card(s) {
    const m = matchOf(s);
    const top = m.reasons[0];
    const topics = (s.topics || []).slice(0, 3).map((t) => `<li>${esc(t)}</li>`).join('');
    return `<li><button type="button" class="card card-btn lvl-${m.level}" data-id="${esc(s.id)}">
      <span class="card-top">
        <span class="avatar">${esc(initials(s.name))}${s.image ? `<img src="${esc(s.image)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.remove()">` : ''}</span>
        <span class="who"><span class="name">${esc(s.name)}</span><span class="role">${esc([s.title, s.org].filter(Boolean).join(' · '))}</span></span>
      </span>
      <span class="score"><span class="num">${m.score}</span><span class="lab">${esc(m.label)}</span><span class="bar"><i style="width:${m.score}%"></i></span></span>
      <span class="why">${top ? `${esc(top.interest)}: <q>${esc(top.snippet)}</q>` : 'No overlap found yet'}</span>
      <ul class="topics">${topics}</ul>
    </button></li>`;
  }

  function summary() {
    const list = Match.parse(interestText);
    const strong = speakers.filter((s) => matchOf(s).score >= 70).length;
    const good = speakers.filter((s) => matchOf(s).score >= 40).length;
    const names = list.length ? list.join(', ').replace(/, ([^,]*)$/, ' and $1') : 'your interests';
    return `${strong} strong ${strong === 1 ? 'match' : 'matches'} and ${good - strong} good for ${esc(names)}`;
  }

  function paintGrid() {
    const list = visible();
    const grid = root().querySelector('.grid');
    root().querySelector('.count').textContent = `${list.length} of ${speakers.length} speakers`;
    root().querySelector('.summary').innerHTML = summary();
    grid.innerHTML = list.length ? list.map(card).join('')
      : '<li class="empty">No speakers match that filter. <button type="button" class="link" id="clear-filter">Clear filter</button></li>';
  }

  function mount() {
    root().innerHTML = `
      <p class="summary"></p>
      <div class="toolbar">
        <label class="sr" for="g-filter">Filter speakers</label>
        <input id="g-filter" type="search" placeholder="Filter by name, company, role or topic" value="${esc(filter)}">
        <label class="sort"><span>Sort</span><select id="g-sort"><option value="match">Best match</option><option value="name">Name A–Z</option></select></label>
        <label class="toggle"><input id="g-good" type="checkbox" ${goodOnly ? 'checked' : ''}> Strong and good matches only</label>
        <span class="count" role="status"></span>
      </div>
      <ul class="grid"></ul>`;
    const r = root();
    r.querySelector('#g-sort').value = sort;
    r.querySelector('#g-filter').addEventListener('input', (e) => { filter = e.target.value; paintGrid(); });
    r.querySelector('#g-sort').addEventListener('change', (e) => { sort = e.target.value; paintGrid(); });
    r.querySelector('#g-good').addEventListener('change', (e) => { goodOnly = e.target.checked; paintGrid(); });
    r.addEventListener('click', (e) => {
      if (e.target.id === 'clear-filter') { filter = ''; goodOnly = false; mount(); return; }
      const b = e.target.closest('.card-btn');
      if (b) Profile.open(b.dataset.id, b);
    });
    paintGrid();
  }

  window.Gallery = {
    set(list, interests) { speakers = list; interestText = interests; rescore(); mount(); },
    setInterests(text) { interestText = text; rescore(); if (speakers.length) { paintGrid(); Profile.refresh(); } },
    update(updated) {
      updated.forEach((u) => { const i = speakers.findIndex((s) => s.id === u.id); if (i >= 0) speakers[i] = u; });
      rescore(); paintGrid();
    },
    byId: (id) => speakers.find((s) => s.id === id),
    matchOf,
    all: () => speakers,
  };
})();
