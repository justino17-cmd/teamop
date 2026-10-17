/* ══ g16 · accueil#13 — LES PUCES DE L'HISTORIQUE DISENT UN MOT, PAS UNE CLÉ TECHNIQUE ════════════════════
   Constaté au navigateur : la rangée de filtres montrait « Tout | finance | support | auth | crud » —
   les clés internes du journal (`type`), en minuscules et en jargon. `journalView` écrivait `${t}` tel quel.

   La parade n'est PAS de renommer les clés : elles sont écrites dans `db.journal` de toutes les entreprises
   (et `TYPE_ICO`, `journalGo` les lisent). Une table de LIBELLÉS (`TYPE_LBL`) s'ajoute à côté, l'écran la
   consulte, et la valeur du filtre (`histFilter`) garde la clé. Un type inconnu (une version plus récente,
   un import) s'affiche tel quel plutôt que de disparaître.

   Ce banc EXÉCUTE la vraie `journalView`, et recense tous les types que le code écrit (`logEvent(…,'type')`)
   pour exiger un libellé à chacun : une table qui oublie un type remettrait la clé brute sur l'écran. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1151 · 0. la population ──');
const JV = bloc('function journalView('), ESC = ligne('const esc = s =>'), TI = ligne('const TYPE_ICO='), TL = ligne('const TYPE_LBL=');
v('les pièces sont trouvées', [JV.length > 500, !!ESC, !!TI, !!TL], [true, true, true, true]);
v('une seule définition de TYPE_LBL', SRC.split('const TYPE_LBL=').length - 1, 1);

/* Les types que le code ÉCRIT : logEvent(action, detail, 'type'…) — le troisième argument, littéral. */
const ecrits = new Set();
for (const m of SRC.matchAll(/\blogEvent\(\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|[^,()]+(?:\([^()]*\))?)\s*,\s*(?:'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|[^,]+?)\s*,\s*'([a-z]+)'/g)) ecrits.add(m[1]);
const ICO = TI ? Object.keys(vm.runInNewContext('(' + TI.slice(TI.indexOf('{'), TI.lastIndexOf('}') + 1) + ')')) : [];
vrai('la population : le code écrit des types de journal (' + [...ecrits].join(',') + ')', ecrits.size >= 6, [...ecrits]);

function monde(types) {
  const journal = types.map((t, i) => ({ id: 'j' + i, ts: 100 - i, userId: 'u', userNom: 'X', action: 'a' + i, detail: 'd', type: t }));
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __page: {}, db: { users: [], journal }, currentUser: { id: 'u' }, current: 'historique' };
  vm.createContext(ctx);
  vm.runInContext(`${ESC}\n${TI.replace('const ', 'var ')}\n${TL ? TL.replace('const ', 'var ') : ''}
    function fullName(u){ return u&&u.nom||'—'; } function journalAuteur(j){ return j.userNom; }
    var histFilter='all', _histMax=80, _histVue='', HIST_PAS=80;
    function setHeader(){} function t(s){ return s; } function visibleJournal(l){ return l; } function fmtTs(ts){ return String(ts); } function emptyState(){ return ''; }
    function $(id){ return id==='content' ? { set innerHTML(h){ __page.html=h; } } : {}; }
    ${JV}`, ctx);
  return ctx;
}
const puces = h => [...h.matchAll(/<div class="chip [^"]*" onclick="histFilter='([^']*)'[^"]*">([^<]*)<\/div>/g)].map(m => [m[1], m[2]]);

console.log('\n── 1. les puces affichent un libellé, et la clé reste dans le filtre ──');
{
  const m = monde(['finance', 'support', 'auth', 'crud']);
  m.journalView('Historique', '');
  const p = puces(m.__page.html);
  v('la population : cinq puces (Tout + quatre types)', p.length, 5);
  v('les clés du filtre sont intactes (les données gardent leurs clés)', p.map(x => x[0]), ['all', 'finance', 'support', 'auth', 'crud']);
  v('« Tout » puis quatre libellés lisibles', p.map(x => x[1]), ['Tout', 'Finance', 'Support', 'Connexion', 'Modifications']);
  vrai('⛔ aucune puce ne montre plus la clé brute en minuscules',
    p.slice(1).every(x => x[1] !== x[0]), p);
}

console.log('\n── 2. chaque type que le code écrit a un libellé ──');
{
  const m = monde([...ecrits]);
  m.journalView('Historique', '');
  const p = puces(m.__page.html).filter(x => x[0] !== 'all');
  v('la population : une puce par type écrit', p.length, ecrits.size);
  const brutes = p.filter(x => x[1] === x[0]).map(x => x[0]);
  v('aucun type écrit n\'apparaît en clé brute', brutes, []);
  const vides = p.filter(x => !x[1].trim()).map(x => x[0]);
  v('aucun libellé vide', vides, []);
  vrai('les libellés sont distincts (deux puces identiques ne se distinguent pas)', new Set(p.map(x => x[1])).size === p.length, p.map(x => x[1]));
  vrai('les clés de TYPE_ICO ont toutes leur libellé', ICO.every(k => TL.includes(k + ':')), ICO.filter(k => !TL.includes(k + ':')));
}

console.log('\n── 3. un type inconnu reste visible ──');
{
  const m = monde(['nouveauType']);
  m.journalView('Historique', '');
  const p = puces(m.__page.html);
  v('la puce d\'un type que la table ignore dit sa clé, plutôt que de disparaître', p[1], ['nouveauType', 'nouveauType']);
}

console.log('\n── 4. le filtre filtre toujours par la clé ──');
{
  const m = monde(['finance', 'auth', 'auth']);
  vm.runInContext("histFilter='auth'", m);
  m.journalView('Historique', '');
  v('deux lignes « auth » seulement', (m.__page.html.match(/class="tl-item"/g) || []).length, 2);
  vrai('la puce active est celle de la clé', /class="chip active" onclick="histFilter='auth'/.test(m.__page.html));
}

console.log('\n══ test-1151 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
