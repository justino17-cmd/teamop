/* ══ MOUVEMENTS STOCK : CHACUN VOIT LES BONS DE REMISE QUI LE CONCERNENT (v734) ══════════════
   Question posée à Justin le 23 septembre 2026 : « Mouvements stock montre tous les bons de
   remise de l'entreprise à tout le monde, alors que les mouvements eux-mêmes sont filtrés. J'applique
   la même règle ? » Sa réponse : « Mouvement stock pareil, tu appliques les mêmes règles, chacun
   voit ce qui le concerne. »

   Un bon de remise concerne sa BOX, celui qui l'a FAIT, et celui qui a REÇU les produits. La
   règle est UNE fonction, `visibleRemises`, lue par Mouvements stock ET par Produits donnés — qui
   avait jusque-là sa propre copie. Elle partage avec `visibleMouvements` la liste des noms qui me
   concernent (`nomsConcernes`) : deux listes finiraient par ne plus reconnaître les mêmes gens.

   ⚠️ Aucun banc ne gardait `visibleMouvements` avant celui-ci. Il EXÉCUTE les vraies fonctions
   extraites d'app.html, sur quatre personnes : un technicien, l'administrateur, un chef d'équipe
   avec une équipe rattachée, et personne. Le rendu dans une vraie page est mesuré par
   `scratchpad/sonde-remises.js`.                                                              */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}

console.log('\n── 783 · 0. la population ──');
const NOMS = ['function nomCle(x){', 'function nomsConcernes(p){', 'function visibleMouvements(list){', 'function visibleRemises(list){'];
const CODE = NOMS.map(bloc);
v('les quatre fonctions sont trouvées', NOMS.filter((n, i) => !CODE[i]), []);
for (const n of NOMS) { const tete = n.slice(0, n.indexOf('(') + 1); v('… une seule définition de ' + tete.slice(9, -1), SRC.split(tete).length - 1, 1); }

/* L'entreprise : deux box, quatre personnes. Karim est technicien, sa box est Nord ; Sofia est
   dans l'équipe de Léo (chef d'équipe) ; Nadia et Jean sont ailleurs. */
const USERS = [{ id: 'uK', prenom: 'Karim', nom: 'Benali', role: 'technicien' }, { id: 'uL', prenom: 'Léo', nom: 'Martin', role: 'chefEquipe' },
  { id: 'uS', prenom: 'Sofia', nom: 'Perez', role: 'technicien', chefId: 'uL' }, { id: 'uA', prenom: 'Justin', nom: 'Roux', role: 'admin' }];
const BONS = [
  { id: 'b1', boxId: 'bxN', par: 'Léo Martin', pourQui: 'Nadia Lopez' },          // sur SA box
  { id: 'b2', boxId: 'bxS', par: 'Karim Benali', pourQui: 'Sofia Perez' },        // qu'il a FAIT
  { id: 'b3', boxId: 'bxS', par: 'Sofia Perez', pourQui: 'Karim Benali' },        // qu'il a REÇU
  { id: 'b4', boxId: 'bxS', par: 'Sofia Perez', pourQui: 'Nadia Lopez' },         // entre deux autres
  { id: 'b5', boxId: 'bxS', par: '  KARIM benali ', pourQui: 'Jean Terrain' },    // son nom, autrement écrit
  { id: 'b6', boxId: 'disparue', par: 'Nadia Lopez', pourQui: 'Jean Terrain' },   // box supprimée, entre deux autres
  null,
];
const MVTS = [
  { id: 'm1', boxId: 'bxN', technicien: 'Léo Martin' }, { id: 'm2', boxId: 'bxS', technicien: 'Karim Benali' },
  { id: 'm3', boxId: 'bxS', technicien: 'Sofia Perez' }, { id: 'm4', boxId: '', technicien: 'Nadia Lopez' },
];
function monde({ moi, voitTout = false, perimTech = null, perimUser = null, mesBox = [] }) {
  const ctx = { currentUser: moi ? USERS.find(u => u.id === moi) : null,
    db: { users: USERS, techniciens: [{ id: 'tS', nom: 'Perez', prenom: 'Sofia' }] },
    can: k => k === 'voirTout' && voitTout, perimetreTechIds: () => perimTech, perimetreUserIds: () => perimUser,
    mesBoxIds: () => new Set(mesBox), fullName: u => ((u.prenom || '') + ' ' + (u.nom || '')).trim() };
  vm.createContext(ctx); vm.runInContext(CODE.join('\n'), ctx);
  ctx.bons = () => vm.runInContext('visibleRemises(' + JSON.stringify(BONS) + ')', ctx).map(r => r.id);
  ctx.mvts = () => vm.runInContext('visibleMouvements(' + JSON.stringify(MVTS) + ')', ctx).map(m => m.id);
  return ctx;
}

console.log('\n── 783 · 1. ⛔ UN TECHNICIEN : sa box, ce qu’il a fait, ce qu’il a reçu — rien d’autre ──');
if (CODE.every(Boolean)) {
  const K = monde({ moi: 'uK', mesBox: ['bxN'] });
  const b = K.bons();
  vrai('population : des bons de toutes les sortes, dont un vide', BONS.length === 7);
  vrai('un bon sur SA box est visible, même fait par un autre', b.includes('b1'));
  vrai('⛔ un bon qu’il a FAIT est visible, même sur une box qui n’est pas la sienne', b.includes('b2'));
  vrai('⛔ un bon qu’il a REÇU est visible — c’est son nom qui est écrit dessus', b.includes('b3'));
  vrai('⛔⛔ un bon entre deux AUTRES personnes, sur une box qui n’est pas la sienne, est caché', !b.includes('b4'));
  vrai('⛔ … même sur une box supprimée', !b.includes('b6'));
  vrai('son nom écrit autrement (casse, espaces) le reconnaît quand même', b.includes('b5'));
  v('en tout : b1, b2, b3, b5', b, ['b1', 'b2', 'b3', 'b5']);
  v('⛔ ses MOUVEMENTS suivent la même règle : sa box, les siens', K.mvts(), ['m1', 'm2']);

  console.log('\n── 783 · 2. « tout voir » SANS équipe rattachée : tout ──');
  const A = monde({ moi: 'uA', voitTout: true, perimTech: null });
  v('l’administrateur voit tous les bons — et l’entrée vide est écartée (le tri de l’écran lit `ts`)', A.bons(), ['b1', 'b2', 'b3', 'b4', 'b5', 'b6']);
  v('… et tous les mouvements', A.mvts(), ['m1', 'm2', 'm3', 'm4']);

  console.log('\n── 783 · 3. ⛔ « tout voir » AVEC une équipe rattachée : son périmètre ──');
  const L = monde({ moi: 'uL', voitTout: true, perimTech: new Set(['tS']), perimUser: new Set(['uS', 'uL']), mesBox: ['bxN'] });
  const lb = L.bons();
  vrai('⛔ un bon fait par quelqu’un de son équipe est visible (Sofia → Nadia)', lb.includes('b4'));
  vrai('… et un bon reçu par quelqu’un de son équipe (Karim → Sofia)', lb.includes('b2'));
  vrai('⛔ mais pas un bon entre deux personnes hors de son équipe, sur une box hors de son périmètre', !lb.includes('b6'));
  v('ses mouvements : sa box, les siens, ceux de son équipe', L.mvts(), ['m1', 'm3']);

  console.log('\n── 783 · 4. personne de connecté : rien ──');
  const N = monde({ moi: null });
  v('aucun bon', N.bons(), []);
  v('aucun mouvement', N.mvts(), []);
}

console.log('\n── 783 · 5. ⛔ LES DEUX ÉCRANS LISENT LA MÊME RÈGLE ──');
const vue = bloc('views.mouvements=function(){');
vrai('population : la vue Mouvements stock est trouvée', vue.length > 3000, vue.length);
vrai('⛔⛔ Mouvements stock filtre les BONS (avant : tous les bons de l’entreprise)', /const brs=visibleRemises\(db\.bonsRemise\|\|\[\]\)/.test(vue) && !/(?<!visibleRemises)\(db\.bonsRemise\|\|\[\]\)\.slice\(\)/.test(vue));
vrai('… comme il filtre les mouvements', /visibleMouvements\(\[\.\.\.db\.mouvements\]\)/.test(vue));
const dons = bloc('function donsListe(){');
vrai('population : la liste de Produits donnés est trouvée', dons.length > 500, dons.length);
vrai('⛔ Produits donnés lit la MÊME fonction (plus sa propre copie de la règle)', /visibleRemises\(db\.bonsRemise\|\|\[\]\)\.forEach/.test(dons) && !/r\.pourQui===me/.test(dons) && !/vues\.has\(r\.boxId\)/.test(dons));
/* Tout parcours de TOUS les bons passe par visibleRemises — sauf deux, nommés : le nettoyage des bons
   de démonstration (une écriture, pas un affichage) et `remisePdf`, qui retrouve UN bon par son
   identifiant depuis une ligne déjà filtrée. Un troisième parcours devra se ranger ici ou filtrer. */
const PARCOURS = (SRC.match(/(?<!visibleRemises)\(db\.bonsRemise\|\|\[\]\)\.(forEach|map|filter|slice|find)\([^;]{0,40}/g) || []);
const CONNUS = [/^\(db\.bonsRemise\|\|\[\]\)\.filter\(r=>!r\._demo\)/, /^\(db\.bonsRemise\|\|\[\]\)\.find\(x=>x\.id===id\)/];
v('aucun autre parcours de tous les bons que les deux nommés (nettoyage démo, PDF par identifiant)', PARCOURS.filter(x => !CONNUS.some(r => r.test(x))), []);
vrai('population : les deux parcours nommés sont bien là (sinon le contrôle ci-dessus ne regarde rien)', PARCOURS.length === 2, PARCOURS);

console.log('\n── 783 · 6. la mesure dans une vraie page existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-remises.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-remises.js existe', !!SONDE);
vrai('… elle ouvre le VRAI écran Mouvements stock (bandes dépliées) et compte les bons rendus',
  /go\('\$\{vue\}'\)/.test(SONDE) && /lire\('u-karim','mouvements'\)/.test(SONDE) && /mvtBoxOuverts=/.test(SONDE) && /remisePdf\\\\\(/.test(SONDE));
vrai('… en technicien ET en administrateur', /technicien/i.test(SONDE) && /admin/i.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-783 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
