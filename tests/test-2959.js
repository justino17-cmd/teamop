/* ══ test-2959 : « Toute l'équipe au travail » — un geste du patron, chaque agent À L'ARRÊT passe en BROUILLON, jamais en AUTO (23 octobre 2026) ══
   Justin : « mets les agents au travail ». Le mode d'un agent ne se change qu'avec la session du patron (`/api/monitor/agents/mode`,
   `monPatronStrict`) : Claude n'y a pas accès, et c'est voulu. Le bouton réduit seize gestes à un. On EXÉCUTE la vraie `agToutBrouillon` de
   `tour.html` (un faux `apiPost` qui note chaque appel) : seuls les agents à l'arrêt bougent, un par un, toujours vers « brouillon » ; un refus
   ou une coupure arrête la série et dit combien sont passés ; un collaborateur ou un « Annuler » ne déclenchent rien. Et la barre ne montre le
   bouton qu'au patron, quand il reste quelqu'un à l'arrêt. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => { const b = JSON.stringify(obtenu) === JSON.stringify(attendu); b ? ok++ : ko++; console.log((b ? '  ✓ ' : '  ✗ ') + nom + (b ? '' : '\n      attendu : ' + JSON.stringify(attendu) + '\n      obtenu  : ' + JSON.stringify(obtenu))); };
console.log('── test-2959 : toute l\'équipe au travail, en brouillon ──');
const T = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
const i0 = T.indexOf('function agToutBrouillon(){'), i1 = T.indexOf('\nfunction agPause(', i0);
const F = i0 > 0 && i1 > i0 ? T.slice(i0, i1) : '';
v('(population) agToutBrouillon est trouvée dans le fichier livré', F.length > 400, true);

const MODES = ['arret', 'brouillon', 'auto'];
async function jouer(o) {
  const appels = [], toasts = [];
  const AG = { busy: false, agents: o.agents.map(([id, mode]) => ({ id, nom: id, mode })) };
  const ctx = vm.createContext({ AG, MYROLE: o.role || 'patron', INJOIGNABLE: 'Serveur injoignable', Promise,
    agMode: a => (a && MODES.includes(a.mode) ? a.mode : 'arret'), agEnPause: () => !!o.pause,
    confirm: () => o.confirmer !== false, toast: t => toasts.push(t), render: () => {}, chargerAgents: () => {},
    apiPost: (route, corps) => { appels.push([route, corps.agent, corps.mode]); const n = appels.length;
      if (o.coupeA === n) return Promise.reject(new Error('réseau'));
      if (o.refuseA === n) return Promise.resolve({ ok: false, d: { error: 'Refusé' } });
      const a = AG.agents.find(x => x.id === corps.agent); if (a) a.mode = corps.mode; return Promise.resolve({ ok: true, d: {} }); } });
  vm.runInContext(F + '\nthis.go=agToutBrouillon;', ctx);
  ctx.go();
  for (let k = 0; k < 200; k++) await new Promise(r => setImmediate(r));
  return { appels, toasts, AG };
}
const EQUIPE = ['lea', 'camille', 'chloe', 'louis', 'hugo', 'margaux', 'emma', 'sarah', 'max', 'jules', 'theo', 'nina', 'ines', 'victor', 'sacha', 'zoe'];
(async () => {
  { const r = await jouer({ agents: EQUIPE.map((id, i) => [id, i === 0 ? 'brouillon' : i === 1 ? 'auto' : i === 2 ? 'inconnu' : 'arret']) });
    v('(population) seize agents, dont quatorze à l\'arrêt (un mode inconnu se lit « à l\'arrêt »)', r.appels.length, 14);
    v('chaque appel vise la route du mode, et TOUJOURS « brouillon »', r.appels.every(a => a[0] === '/api/monitor/agents/mode' && a[2] === 'brouillon'), true);
    v('⛔ seuls les agents à l\'arrêt bougent : Léa (brouillon) et Camille (auto) ne sont pas touchés', r.appels.map(a => a[1]).filter(x => x === 'lea' || x === 'camille'), []);
    v('⛔ aucun agent ne passe en « auto » par ce geste', r.AG.agents.filter(a => a.mode === 'auto').map(a => a.id), ['camille']);
    v('le message dit combien sont au travail', r.toasts, ['14 agents au travail, en brouillon.']);
    v('le bouton se libère à la fin', r.AG.busy, false); }
  { const r = await jouer({ agents: EQUIPE.map(id => [id, 'arret']), refuseA: 5 });
    v('un refus du serveur arrête la série : cinq appels, pas un de plus', r.appels.length, 5);
    v('…et dit combien sont passés', r.toasts, ['Refusé — 4 sur 16 mis au travail.']); }
  { const r = await jouer({ agents: EQUIPE.map(id => [id, 'arret']), coupeA: 3 });
    v('une coupure du réseau arrête la série et le dit', [r.appels.length, r.toasts], [3, ['Serveur injoignable — 2 sur 16 mis au travail.']]); }
  { const r = await jouer({ agents: EQUIPE.map(id => [id, 'arret']), pause: true });
    v('la pause générale posée : le message dit de toucher « Reprendre »', r.toasts[0], '16 agents au travail, en brouillon. La pause générale est posée : touche « Reprendre ».'); }
  { const r1 = await jouer({ agents: EQUIPE.map(id => [id, 'arret']), role: 'collaborateur' });
    const r2 = await jouer({ agents: EQUIPE.map(id => [id, 'arret']), confirmer: false });
    v('⛔ un collaborateur ne déclenche rien ; « Annuler » non plus', [r1.appels.length, r2.appels.length], [0, 0]); }
  /* la barre : le bouton n'est dessiné que pour le patron, quand il reste quelqu'un à l'arrêt (lu dans le code, commentaires retirés) */
  const CODE = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  v('la barre ne dessine le bouton que pour le patron, et tant que tous ne sont pas allumés',
    /\(AG\.illisible\|\|MYROLE!=='patron'\|\|allumes>=AG\.agents\.length\?'':'<button type="button" class="ag-btn ok"'[^\n]*onclick="agToutBrouillon\(\)">Toute l’équipe au travail<\/button>'\)/.test(CODE), true);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
