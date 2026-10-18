const C = require('./classify.js');
const cases = require('./blind_cases.js');
const ctx = { contacts: {}, rules: { senders: {}, domains: {} } };
let ok = 0; const by = {}; const fails = [];
for (const k of cases) {
  const r = C.classify(k.m, ctx);
  const got = r.junk ? 'junk' : r.cat;
  by[k.expect] = by[k.expect] || [0, 0]; by[k.expect][1]++;
  if (got === k.expect) { ok++; by[k.expect][0]++; }
  else fails.push(`[${k.expect} → ${got}] ${k.m.from.name} <${k.m.from.email}> « ${k.m.subject} » unsub=${!!k.m.unsub} spam=${r.spamScore} (${r.reasons.join(' / ')})`);
}
console.log(Object.entries(by).map(([c, [a, b]]) => `${c}: ${a}/${b}`).join('  '));
console.log(`\nTOTAL ${ok}/${cases.length} (${Math.round(100 * ok / cases.length)} %)\n`);
console.log(fails.join('\n'));
