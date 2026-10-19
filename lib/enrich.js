// Parallel enrichment: bio, topics and sources per speaker. Bios use only text found in results.
const { parallelSearch, readCache, writeCache, httpError } = require('./util');

const TOPICS = [
  ['Robotics', /robot|cobot|manipulat/gi], ['Embodied AI', /embodied|physical ai|humanoid/gi],
  ['Computer vision', /computer vision|image recognition|visual perception|machine vision|video understanding/gi],
  ['Wearables', /wearable|smart glasses|smartglass/gi], ['AR/VR', /\bAR\b|\bVR\b|augmented reality|virtual reality|spatial computing/g],
  ['LLMs', /\bLLMs?\b|large language model|foundation model|generative ai|genai/gi], ['Agents', /\bagent(s|ic)?\b/gi],
  ['Healthcare AI', /health|clinical|medical|biotech|biolog/gi], ['Security', /security|cyber|\bCISO\b|privacy/gi],
  ['Fintech', /fintech|payments|banking|finance/gi], ['Venture capital', /venture|investor|\bVC\b|investing/gi],
  ['Developer tools', /developer|devops|\bAPI\b|open.source|software engineering/gi], ['Education', /education|teaching|curriculum|students/gi],
  ['Policy', /policy|regulation|government|economics|economist/gi], ['Data science', /data science|data scientist|analytics|machine learning|\bML\b/gi],
  ['Autonomy', /autonom|self-driving|autopilot|drone|aviation/gi], ['Hardware', /hardware|semiconductor|\bchips?\b|\bdevices?\b/gi],
];

function clean(t) {
  return String(t)
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/https?:\/\/\S+/g, ' ').replace(/[#*_>`|]+/g, ' ').replace(/\s+/g, ' ').trim();
}
function trimWords(s, max) {
  if (s.length <= max) return s;
  return s.slice(0, max).replace(/\s+\S*$/, '').replace(/[,;:\-–]+$/, '') + '…';
}

// Profile-scrape and boilerplate text is not a biography.
const JUNK = /get intro|add to my|save \w+ add|view profile|request intro|speakers agenda|sponsors about|register back|skip to content|connection count|follower count|company name:|experience:|position:|cookie|subscribe|sign up|log in|all rights reserved|read more|\bfollowers\b|\bconnections\b/i;

// Only accept sentences that describe the speaker: "<Full name> is / was / has / serves / founded ..."
// and avoid dates, bylines and publication lists. A blank bio is better than a wrong one.
const NOISE = /\b(19|20)\d{2}\b.*\b\d{1,2}:\d{2}\b|\b\d{4}-\d{4}\b|publications|follow @|\bPDT\b|\bPST\b|\bposted\b|\bby [A-Z]/;
const VERBS = '(?:is|was|has|have|serves|served|leads|led|founded|co-founded|cofounded|spent|joined|works|worked|previously|currently|holds|heads|oversees|built|builds|runs|started|launched)';

function makeBio(sp, results) {
  const name = sp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const subject = new RegExp(`\\b${name}\\b(?:\\s+(?:SM|PhD|MD)[^,]{0,12})?,?\\s+(?:\\([^)]*\\)\\s+)?(?:the\\s+|a\\s+|an\\s+)?${VERBS}\\b|\\b${name}\\s*,\\s+(?:the\\s+)?[A-Za-z&/ -]{3,60}\\s+(?:of|at)\\b`, 'i');
  const usable = results.filter((r) => !/linkedin\.com/i.test(r.url));
  for (const r of usable) {
    const picked = [];
    for (const ex of r.excerpts || []) {
      for (const s of clean(ex).split(/(?<=[.!?])\s+/)) {
        const m = subject.exec(s);
        if (!m) continue;
        const sentence = s.slice(m.index); // drop any page text before the speaker's name
        if (sentence.length > 50 && sentence.length < 380 && !JUNK.test(sentence) && !NOISE.test(sentence)
          && !/[^\x00-\x7F]{2,}.*[^\x00-\x7F]{2,}/.test(sentence)) picked.push(sentence);
      }
    }
    if (picked.length) return trimWords(picked.slice(0, 2).join(' '), 320);
  }
  return '';
}

// Topics come from the speaker's role, the vetted bio and source titles only. Search excerpts are
// excluded because they often mention other people or episodes (for example a podcast's previous topic).
function makeTopics(sp, results) {
  const text = [sp.title, sp.org, sp.bio, ...results.filter((r) => !/linkedin\.com/i.test(r.url)).slice(0, 3)
    .map((r) => r.title)].join(' ');
  return TOPICS.map(([label, re]) => [label, (text.match(re) || []).length])
    .filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label]) => label);
}

async function enrichOne(sp) {
  const data = await parallelSearch({
    objective: `Professional background and current focus of ${sp.name}, ${sp.title} at ${sp.org}`,
    search_queries: [`${sp.name} ${sp.org}`.trim(), `${sp.name} ${sp.title}`.trim()],
    max_chars_total: 1500,
  });
  const results = data.results || [];
  sp.sources = results.slice(0, 3).map((r) => ({
    title: clean(r.title || r.url), url: r.url, excerpt: trimWords(clean((r.excerpts || [])[0] || ''), 220),
  }));
  sp.bio = makeBio(sp, results);
  sp.topics = makeTopics(sp, results);
  sp.enriched = true;
  sp.enrichedAt = new Date().toISOString();
}

let running = false;
async function enrich(ids) {
  const cache = readCache();
  if (!cache) throw httpError(400, 'Load a conference first.');
  if (running) throw httpError(409, 'Research is already running.');
  running = true;
  try {
    const wanted = Array.isArray(ids) && ids.length ? new Set(ids) : null;
    const todo = cache.speakers.filter((s) => (wanted ? wanted.has(s.id) : !s.enriched));
    const failures = {};
    let next = 0;
    const worker = async () => {
      while (next < todo.length) {
        const sp = todo[next++];
        try { await enrichOne(sp); } catch (e) {
          if (e.status === 400) throw e; // missing key: stop and report
          const code = e.status ? `HTTP ${e.status}` : 'network error';
          failures[code] = (failures[code] || 0) + 1;
        }
      }
    };
    await Promise.all(Array.from({ length: 6 }, worker));
    writeCache(cache);
    const failed = Object.values(failures).reduce((a, b) => a + b, 0);
    return {
      requested: todo.length, enriched: todo.length - failed, failed, failures,
      speakers: wanted ? todo : undefined,
      totalEnriched: cache.speakers.filter((s) => s.enriched).length, total: cache.speakers.length,
    };
  } finally { running = false; }
}

module.exports = { enrich };
