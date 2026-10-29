/* L'ÉVALUATION SANS PROMPTFOO (28 octobre 2026) — rejoue un cas exactement comme promptfoo le ferait : le fournisseur construit le vrai prompt et rend la réponse, puis chaque assertion
 * (`assertions.js`, par le chemin que le cas écrit) reçoit `(sortie, contexte)`. Elle sert à deux choses : `lancer.sh estimer` (le coût, sans clé) et le banc `test-3132`, qui doit pouvoir
 * éprouver les assertions sans que promptfoo — un outil externe, hors du dépôt — soit installé. */
'use strict';
const Fournisseur = require('./fournisseur-teamop.js');
const ASSERTIONS = require('./assertions.js');

/* `file://assertions.js:nom` → la fonction. Une assertion qui n'a pas ce format est refusée : le banc ne la rejouerait pas, donc personne ne l'aurait vue échouer. */
function fonctionDe(a) {
  const m = /^file:\/\/assertions\.js:([A-Za-z]+)$/.exec(String(a && a.value || ''));
  if (!m || a.type !== 'javascript') throw new Error('assertion non rejouable : ' + JSON.stringify(a && a.value));
  const f = ASSERTIONS[m[1]];
  if (typeof f !== 'function') throw new Error('assertion inconnue : ' + m[1]);
  return f;
}

async function evaluerCas(cas, qualite, mode) {
  const avant = { m: process.env.TEAMOP_PF_MODE, q: process.env.TEAMOP_PF_QUALITE };
  process.env.TEAMOP_PF_MODE = mode || 'simule'; process.env.TEAMOP_PF_QUALITE = qualite || 'bonne';
  try {
    const rep = await new Fournisseur().callApi('', { vars: cas.vars });
    if (rep.error) return { erreur: rep.error, resultats: [], reponse: rep };
    const resultats = [];
    for (const a of cas.assert) {
      let r;
      try { r = await fonctionDe(a)(rep.output, { config: a.config || {}, vars: cas.vars, providerResponse: rep, test: cas }); }
      catch (e) { r = { pass: false, reason: 'l’assertion a jeté : ' + e.message }; }
      resultats.push({ metric: a.metric, pass: !!(r && r.pass), reason: r && r.reason });
    }
    return { sortie: rep.output, resultats, reponse: rep };
  } finally {
    for (const [k, v] of [['TEAMOP_PF_MODE', avant.m], ['TEAMOP_PF_QUALITE', avant.q]]) { if (v === undefined) delete process.env[k]; else process.env[k] = v; }
  }
}

module.exports = { evaluerCas, fonctionDe };
