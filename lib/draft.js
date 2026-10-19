// Draft writing. Templates only (no model call): the text uses the user's interests, the speaker's
// verified bio/role and the conference name. Nothing is invented; missing facts are simply left out.
const trimTo = (s, n) => (s.length <= n ? s : s.slice(0, n).replace(/\s+\S*$/, '').replace(/[,;:\-–]+$/, '') + '…');
const first = (name) => String(name).split(/\s+/)[0];

// Fix the case of interests ("embodied ai" -> "embodied AI") and join them as a short list.
function interestList(text) {
  const items = String(text || '').split(/[,;\n]+/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
    .map((s) => s.replace(/\bai\b/gi, 'AI'));
  if (items.length < 2) return items[0] || 'applied AI';
  return items.slice(0, -1).join(', ') + ' and ' + items[items.length - 1];
}

function buildDraft({ speaker, interests, conferenceName, senderName, matchReason, happened }) {
  const interestsText = interestList(interests);
  const conf = conferenceName || 'the conference';
  const role = [speaker.title, speaker.org].filter(Boolean).join(' at ');
  const hook = matchReason
    ? `I noticed your ${matchReason.field === 'role' ? 'work' : 'background'} in ${matchReason.interest.toLowerCase()}`
    : (role ? `I was interested to see your work as ${role}` : 'I was interested to see your session');
  const opening = happened
    ? `I'm following up after ${conf}. ${hook}, and it connects closely to what I'm working on.`
    : `I'm looking forward to ${conf}. ${hook}, and it connects closely to what I'm working on.`;
  const body = [
    `Hi ${first(speaker.name)},`,
    '',
    opening,
    '',
    `My focus is ${interestsText}. I would value a short conversation about how you approach this${speaker.org ? ` at ${speaker.org}` : ''}, and I'm happy to work around your schedule.`,
    '',
    'Would you be open to a 15-minute call in the next couple of weeks?',
    '',
    'Thank you,',
    senderName || '[Your name]',
  ].join('\n').replace(/\n+$/, '');
  const subject = happened ? `Following up after ${conf}` : `Meeting at ${conf}`;
  return { subject: trimTo(subject, 90), body };
}

module.exports = { buildDraft };
