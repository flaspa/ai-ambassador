// Synonym-aware match scoring. Runs in the browser, so re-ranking is instant.
// Every score is explained with a quoted snippet taken from the speaker's own data.
(function () {
  const SYN = {
    'embodied ai': ['embodied', 'physical ai', 'humanoid', 'robot', 'manipulation'],
    'robotics': ['robot', 'cobot', 'autonomous', 'autonomy', 'drone', 'manipulation', 'warehouse automation'],
    'computer vision': ['vision', 'perception', 'image', 'camera', 'visual', 'video understanding'],
    'wearables': ['wearable', 'smart glasses', 'glasses', 'AR', 'headset', 'hearables', 'devices'],
    'agents': ['agent', 'agentic', 'assistant', 'autonomous workflows'],
    'healthcare': ['healthcare', 'health', 'clinical', 'medical', 'biotech', 'biology'],
    'venture capital': ['venture', 'investor', 'venture fund', 'VC', 'investing'],
    'developer tools': ['developer', 'devtools', 'API', 'open source', 'code', 'software engineering'],
    'llms': ['LLM', 'language model', 'foundation model', 'generative ai', 'genai'],
    'security': ['security', 'cybersecurity', 'cyber', 'CISO', 'privacy'],
    'education': ['education', 'teaching', 'students', 'curriculum', 'university'],
    'policy': ['policy', 'regulation', 'government', 'economics'],
    'fintech': ['fintech', 'payments', 'banking', 'finance'],
    'data science': ['data science', 'data scientist', 'analytics', 'machine learning', 'ML'],
  };
  // Generic words that appear in many unrelated bios: they count, but only weakly.
  const WEAK = new Set(['image', 'visual', 'camera', 'devices', 'code', 'assistant', 'health', 'fund', 'investing', 'university', 'finance', 'autonomous', 'api', 'vision', 'perception']);
  const stemWord = (w) => (w.length > 4 && /s$/.test(w) && !/ss$/.test(w) ? w.slice(0, -1) : w);
  const norm = (s) => String(s).toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter(Boolean).map(stemWord).join(' ');
  const NORM_SYN = Object.entries(SYN).map(([k, v]) => [norm(k), v]);
  const reCache = new Map();

  function termRegex(term) {
    if (!reCache.has(term)) {
      const e = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      reCache.set(term, new RegExp(`\\b${e}(?:s|es|ics|ic|ed|ing|al|ally)?\\b`, 'i'));
    }
    return reCache.get(term);
  }

  function parse(text) {
    const seen = new Set();
    return String(text || '').split(/[,;\n]+/).map((s) => s.trim()).filter((s) => {
      const k = s.toLowerCase();
      if (!k || seen.has(k)) return false;
      seen.add(k); return true;
    });
  }

  // Terms for one interest: the phrase itself (exact) plus synonyms and per-word fallbacks.
  function termsFor(interest) {
    const n = norm(interest);
    const exact = [interest.trim()];
    const syn = [];
    for (const [key, list] of NORM_SYN) {
      if (n === key || n.includes(key) || (n.length >= 4 && key.includes(n))) syn.push(...list);
    }
    if (!syn.length) n.split(' ').filter((w) => w.length > 3 && w !== 'tool').forEach((w) => syn.push(w));
    return { exact, syn: [...new Set(syn)].filter((t) => !exact.includes(t)) };
  }

  function fieldsOf(s) {
    const f = [
      { name: 'role', w: 3, text: [s.title, s.org].filter(Boolean).join(' · ') },
      { name: 'topics', w: 3, text: (s.topics || []).join(' · ') },
      { name: 'bio', w: 2, text: s.bio || '' },
    ];
    (s.sources || []).forEach((x) => f.push({ name: 'source', w: 1, text: `${x.title || ''}. ${x.excerpt || ''}` }));
    return f.filter((x) => x.text);
  }

  function snippet(field, m) {
    const t = field.text;
    if (field.name === 'topics') return t.split(' · ').find((x) => x.toLowerCase().includes(m[0].toLowerCase())) || t;
    if (field.name === 'role') return t;
    let a = Math.max(0, m.index - 35), b = Math.min(t.length, m.index + m[0].length + 55);
    let s = t.slice(a, b).replace(/\s+/g, ' ').trim();
    if (a > 0 && /\S/.test(t[a - 1])) s = s.replace(/^\S*\s?/, '');
    if (b < t.length && /\S/.test(t[b])) s = s.replace(/\s?\S*$/, '');
    return (a > 0 ? '…' : '') + s + (b < t.length ? '…' : '');
  }

  function bestHit(terms, fields) {
    let best = null;
    const tryTerms = (list, factor) => {
      for (const term of list) {
        const re = termRegex(term);
        for (const f of fields) {
          const m = re.exec(f.text);
          if (!m) continue;
          const value = f.w * factor;
          if (!best || value > best.value) best = { value, field: f.name, snippet: snippet(f, m) };
        }
      }
    };
    tryTerms(terms.exact, 1);
    tryTerms(terms.syn.filter((t) => !WEAK.has(t.toLowerCase())), 0.75);
    tryTerms(terms.syn.filter((t) => WEAK.has(t.toLowerCase())), 0.3);
    return best;
  }

  function label(score) {
    if (score >= 70) return { level: 'strong', label: 'Strong match' };
    if (score >= 40) return { level: 'good', label: 'Good match' };
    if (score >= 15) return { level: 'some', label: 'Some overlap' };
    return { level: 'low', label: 'Low match' };
  }

  function score(speaker, interests) {
    const fields = fieldsOf(speaker);
    const hits = interests.map((i) => ({ interest: i, hit: bestHit(termsFor(i), fields) }));
    const vals = hits.map((h) => (h.hit ? h.hit.value / 3 : 0));
    const max = Math.max(0, ...vals);
    const mean = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
    const total = Math.round(100 * (0.55 * max + 0.45 * mean));
    const reasons = hits.filter((h) => h.hit).sort((a, b) => b.hit.value - a.hit.value).map((h) => ({
      interest: h.interest.charAt(0).toUpperCase() + h.interest.slice(1), snippet: h.hit.snippet, field: h.hit.field,
    }));
    return { score: total, ...label(total), reasons };
  }

  window.Match = { parse, score };
})();
