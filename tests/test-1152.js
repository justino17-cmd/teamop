/* ══ g16 · accueil#6 — RETIRER LA DERNIÈRE CARTE DU TABLEAU DE BORD NE REMET PAS LES CINQ PAR DÉFAUT ════════
   Constaté au navigateur : « Personnaliser », ✕ sur les cinq cartes l'une après l'autre — à la cinquième
   suppression, les cinq cartes d'origine revenaient d'un coup, sans un mot. Cause : `dashLayout()` remplaçait
   une liste VIDE par `DASH_DEFAULT`, comme si « tout retiré » et « jamais personnalisé » étaient la même chose.

   Ce sont deux états : `undefined` (jamais personnalisé → les cartes par défaut) et `[]` (la personne a tout
   retiré → rien, et l'écran le dit avec un bouton « Personnaliser » plutôt que de montrer un trou).
   Le repli sur le défaut reste pour ce qu'il sert vraiment : une liste dont AUCUNE clé n'est plus une carte
   connue (une carte retirée du code) ne doit pas laisser un tableau de bord vide que personne n'a voulu.
   ⛔ Rien ne s'écrit dans `db` au chargement : lire un `[]` ne le réécrit pas.

   Ce banc EXÉCUTE les vraies `dashLayout`, `dashRemove`, `dashAdd` et `dashReset`, puis lit le code de la vue. */
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

console.log('\n── 1152 · 0. la population ──');
const DL = bloc('function dashLayout(){'), RM = bloc('function dashRemove(k){'), AD = bloc('function dashAdd(k){'), RS = bloc('function dashReset(){'),
  DD = ligne('const DASH_DEFAULT='), VUE = bloc('views.dashboard=function(){');
v('les pièces sont trouvées', [DL.length > 100, !!RM, !!AD, !!RS, !!DD, VUE.length > 1000], [true, true, true, true, true, true]);
v('une seule définition de dashLayout', SRC.split('function dashLayout(').length - 1, 1);

function monde(layout, extra) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, __saves: 0, __vues: 0,
    db: Object.assign({ dashV2: 1 }, layout === undefined ? {} : { dashLayout: layout }, extra || {}) };
  vm.createContext(ctx);
  vm.runInContext(`${DD.replace('const ', 'var ')}
    var DASH_CARDS={interventions:{},boxes:{},enveloppes:{},bonsCommande:{},vehicules:{},clients:{}};
    function save(){ __saves++; } var views={dashboard(){ __vues++; }};
    ${DL}\n${RM}\n${AD}\n${RS}`, ctx);
  return ctx;
}
const DEF = ['interventions', 'boxes', 'enveloppes', 'bonsCommande', 'vehicules'];

console.log('\n── 1. jamais personnalisé : les cartes par défaut ──');
{
  const m = monde(undefined);
  v('pas de disposition → les cinq cartes par défaut', m.dashLayout(), DEF);
}

console.log('\n── 2. tout retiré : la disposition reste VIDE ──');
{
  const m = monde(undefined);
  m.dashLayout();
  for (const k of DEF.slice()) m.dashRemove(k);
  v('la population : cinq retraits ont eu lieu (chacun enregistré)', m.__saves, 5);
  v('après le cinquième retrait, db.dashLayout est vide', m.db.dashLayout, []);
  v('⛔ et dashLayout() ne remet pas les cinq par défaut', m.dashLayout(), []);
  v('même après une relecture', m.dashLayout(), []);
  const avant = m.__saves; m.dashLayout(); m.dashLayout();
  v('⛔ lire ne sauvegarde rien', m.__saves, avant);
  m.dashAdd('boxes');
  v('« Ajouter une carte » repart de la liste vide : une seule carte', m.dashLayout(), ['boxes']);
  m.dashReset();
  v('« Réinitialiser » remet bien le défaut (geste voulu)', m.dashLayout(), DEF);
}

console.log('\n── 3. un [] déjà rangé (autre appareil, synchro) reste vide ──');
{
  const m = monde([]);
  v('db.dashLayout = [] est respecté', m.dashLayout(), []);
}

console.log('\n── 4. le repli sur le défaut ne sert qu\'aux clés devenues inconnues ──');
{
  v('une liste de cartes disparues du code → défaut (pas un tableau vide que personne n\'a voulu)', monde(['carteMorte', 'autreMorte']).dashLayout(), DEF);
  v('une liste mêlée garde les cartes connues, dans l\'ordre', monde(['vehicules', 'carteMorte', 'boxes']).dashLayout(), ['vehicules', 'boxes']);
  v('une valeur qui n\'est pas une liste → défaut', monde('n\'importe quoi').dashLayout(), DEF);
}

console.log('\n── 5. la migration unique vers la disposition épurée est inchangée ──');
{
  const m = monde(['clients'], { dashV2: undefined });
  v('sans marqueur dashV2 : la disposition épurée est posée UNE fois', m.dashLayout(), DEF);
  vrai('… et le marqueur est posé, puis sauvegardé', m.db.dashV2 === 1 && m.__saves === 1, [m.db.dashV2, m.__saves]);
  m.dashRemove('boxes');
  v('ensuite un retrait est un retrait', m.dashLayout(), DEF.filter(k => k !== 'boxes'));
}

console.log('\n── 6. l\'écran dit qu\'il est vide, avec « Personnaliser » ──');
vrai('la vue a un état « aucune carte » qui mène à la personnalisation',
  /!layout\.length\s*&&\s*!dashEdit\s*&&\s*hidden\.length\)?\s*\?\s*emptyState\([^)]*dashToggleEdit\(\)/.test(VUE), VUE.slice(VUE.indexOf('class="kpis"') - 80, VUE.indexOf('class="kpis"') + 400));

console.log('\n══ test-1152 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
