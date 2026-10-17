/* ══ g20 · FOURNISSEURS — RENOMMER NE DÉTACHE RIEN, ET UN NOM SE CONTRÔLE (achats#1, achats#8) ═════════
   Constat (agents de test de la bêta, 16 octobre 2026) :
   · achats#1 — un produit désigne son fournisseur par son NOM (`p.fournisseurs=['ARMOSA']`, jamais par
     identifiant : voir `fourMemeNom`). Renommer ARMOSA en « ARMOSA France » (écran Fournisseurs, ou le ✎
     rapide d'un bon) changeait la fiche et pas les produits : « 53 produits au catalogue » devenait « 0 »,
     et le filtre fournisseur du Catalogue des bons ne trouvait plus rien. Persistant après rechargement.
   · achats#8 — l'écran Fournisseurs ne contrôlait aucun nom : deux fournisseurs de même nom, une carte au
     nom fait d'espaces ; `bonFourNew` (le ＋ du bon) refusait déjà le doublon. Et avec deux noms égaux,
     `fidOf()` prend le premier.

   Ce banc EXÉCUTE les vraies `saveSimple` et `fourQuickSave` (et `fournisseurRenommer` quand elle existe)
   dans un bac à sable, avec les vraies `nomNorm`, `fourMemeNom` et `produitDuFournisseur`.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return ''; }
const NN = bloc('function nomNorm(s){'), FM = bloc('function fourMemeNom(a,b){'), PF = bloc('function produitDuFournisseur(p,nom){'),
  SS = bloc('function saveSimple(e,coll,id,numFields){'), FQ = bloc('function fourQuickSave(fid){'), FR = bloc('function fournisseurRenommer('),
  FC = bloc('function fournisseurNomControle(');
const nbDef = n => SRC.split('function ' + n + '(').length - 1;

console.log('\n── 1230 · 0. la population ──');
v('les fonctions du bac à sable sont trouvées', [!!NN, !!FM, !!PF, SS.length > 400, FQ.length > 300], [true, true, true, true, true]);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', ['saveSimple', 'fourQuickSave', 'nomNorm', 'fourMemeNom'].map(nbDef), [1, 1, 1, 1]);
vrai('fournisseurRenommer et fournisseurNomControle : zéro ou une définition', nbDef('fournisseurRenommer') <= 1 && nbDef('fournisseurNomControle') <= 1);

function monde(four, produits, champs) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise,
    db: { fournisseurs: four, produits, clients: [] }, __toasts: [], __saves: 0, __closes: 0, __go: 0, __champs: champs || {}, current: 'fournisseurs' };
  vm.createContext(ctx);
  vm.runInContext(`${NN}\n${FM}\n${PF}\n${FC}\n${FR}
    var COLL_GRP={fournisseurs:'com',clients:'cli'}, COLL_QUOI={fournisseurs:'un fournisseur'};
    function permGarde(){ return true; } function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; }
    function closeModal(){ __closes++; } function go(){ __go++; } function logEvent(){} var __id=0; function uid(){ return 'n'+(++__id); }
    function FormData(t){ return Object.entries(t.__d); }
    var $ = function(i){ return document.getElementById(i); };
    var document = { getElementById: function(i){ return i==='four-quick' ? { remove(){} } : (i in __champs ? { value: __champs[i] } : null); } };
    var _fourQuickCb=null;
    ${SS}\n${FQ}`, ctx);
  return ctx; }
const jeu = () => ({
  four: [{ id: 'f1', nom: 'ARMOSA', email: 'a@armosa.fr' }, { id: 'f2', nom: 'ORCAD' }, { id: 'f3', nom: "L'Épicerie" }],
  prod: [{ id: 'p1', nom: 'GEL BLATTES', fournisseurs: ['ARMOSA', 'ENSYSTEX'] }, { id: 'p2', nom: 'APPÂT', fournisseurs: ['armosa'] },
    { id: 'p3', nom: 'PIÈGE', fournisseurs: ['ORCAD'] }, { id: 'p4', nom: 'SEUL', fournisseurs: ['ARMOSA'] }, { id: 'p5', nom: 'SANS', fournisseurs: [] }] });
const nb = (W, nom) => W.db.produits.filter(p => W.produitDuFournisseur(p, nom)).length;
const formSimple = (W, id, d) => W.saveSimple({ preventDefault() {}, target: { __d: d } }, 'fournisseurs', id, []);

console.log('\n── 1230 · 1. achats#1 — renommer par l’écran Fournisseurs (saveSimple) ──');
{ const j = jeu(), W = monde(j.four, j.prod);
  v('avant : ARMOSA a 3 produits (la casse ne compte pas)', nb(W, 'ARMOSA'), 3);
  formSimple(W, 'f1', { nom: 'ARMOSA France', email: 'a@armosa.fr' });
  v('la fiche porte le nouveau nom', W.db.fournisseurs[0].nom, 'ARMOSA France');
  v('⛔ la carte « ARMOSA France » garde ses 3 produits (avant le correctif : 0)', nb(W, 'ARMOSA France'), 3);
  v('… et plus aucun produit ne désigne l’ancien nom (le lien est RENOMMÉ, pas dupliqué)', nb(W, 'ARMOSA'), 0);
  v('un produit à deux fournisseurs garde l’autre : [ARMOSA France, ENSYSTEX]', W.db.produits[0].fournisseurs, ['ARMOSA France', 'ENSYSTEX']);
  v('les autres fournisseurs ne bougent pas (ORCAD : 1 produit)', nb(W, 'ORCAD'), 1);
  v('aucun produit n’a été créé ni retiré', W.db.produits.map(p => p.id), ['p1', 'p2', 'p3', 'p4', 'p5']);
  v('la fiche de ORCAD n’est pas touchée (aucun champ ajouté)', W.db.produits[2], { id: 'p3', nom: 'PIÈGE', fournisseurs: ['ORCAD'] });
  vrai('un seul save() pour le geste, la fenêtre se ferme', W.__saves === 1 && W.__closes === 1, [W.__saves, W.__closes]); }
{ const j = jeu(), W = monde(j.four, j.prod);
  formSimple(W, 'f1', { nom: 'Armosa', email: 'a@armosa.fr' });
  v('un simple changement de casse du MÊME fournisseur est permis (pas un doublon de lui-même)', [W.db.fournisseurs[0].nom, nb(W, 'Armosa')], ['Armosa', 3]); }

console.log('\n── 1230 · 2. achats#1 — renommer par le ✎ rapide d’un bon (fourQuickSave) ──');
{ const j = jeu(), W = monde(j.four, j.prod, { 'fq-nom': 'ARMOSA France', 'fq-email': 'a@armosa.fr', 'fq-contact': '', 'fq-tel': '' });
  W.fourQuickSave('f1');
  v('la fiche porte le nouveau nom', W.db.fournisseurs[0].nom, 'ARMOSA France');
  v('⛔ elle garde ses 3 produits', nb(W, 'ARMOSA France'), 3);
  v('l’ancien nom ne désigne plus personne', nb(W, 'ARMOSA'), 0); }

console.log('\n── 1230 · 3. achats#1 — refuser un renommage vers un nom qui existe ──');
{ const j = jeu(), W = monde(j.four, j.prod);
  formSimple(W, 'f1', { nom: ' orcad ', email: '' });
  v('⛔ ARMOSA → « orcad » (casse et espaces près) : refusé', W.db.fournisseurs[0].nom, 'ARMOSA');
  vrai('… dit pourquoi', W.__toasts.some(t => /existe déjà/.test(t)), W.__toasts);
  vrai('… ne sauvegarde rien et laisse la fenêtre ouverte (le texte tapé n’est pas perdu)', W.__saves === 0 && W.__closes === 0, [W.__saves, W.__closes]);
  v('… ne touche à aucun produit', nb(W, 'ARMOSA'), 3); }
{ const j = jeu(), W = monde(j.four, j.prod, { 'fq-nom': 'Orcad', 'fq-email': '', 'fq-contact': '', 'fq-tel': '' });
  W.fourQuickSave('f1');
  v('le ✎ rapide refuse aussi ce doublon', [W.db.fournisseurs[0].nom, W.__saves], ['ARMOSA', 0]); }
{ const j = jeu(); j.four.push({ id: 'f9', nom: 'Armosa' }); const W = monde(j.four, j.prod);
  formSimple(W, 'f1', { nom: 'ARMOSA Sud', email: '' });
  v('deux fiches d’avant à la casse près : renommer l’une ne retire pas les produits de l’autre (lien « ARMOSA » encore porté par f9)', nb(W, 'Armosa'), 3); }

console.log('\n── 1230 · 4. achats#8 — créer : un nom vide ou déjà pris est refusé (comme bonFourNew) ──');
{ const j = jeu(), W = monde(j.four, j.prod);
  formSimple(W, '', { nom: '   ', email: '' });
  v('⛔ un nom d’espaces ne crée AUCUNE carte', W.db.fournisseurs.length, 3);
  vrai('… et le dit', W.__toasts.length > 0, W.__toasts);
  const t0 = W.__toasts.length;
  formSimple(W, '', { nom: " l'épicerie ", email: '' });
  v('⛔ « l’épicerie » (casse, accent, espaces) = « L’Épicerie » : doublon refusé', W.db.fournisseurs.length, 3);
  vrai('… avec « existe déjà »', W.__toasts.slice(t0).some(t => /existe déjà/.test(t)), W.__toasts);
  formSimple(W, '', { nom: '  Sodif  ', email: '' });
  v('un nom neuf est créé, sans les espaces autour', W.db.fournisseurs.map(f => f.nom).slice(3), ['Sodif']);
  v('(population : trois refus ont eu lieu, une création)', [W.__saves, W.db.fournisseurs.length], [1, 4]); }

console.log('\n── 1230 · 5. une autre collection ne change pas ──');
{ const j = jeu(), W = monde(j.four, j.prod);
  W.saveSimple({ preventDefault() {}, target: { __d: { nom: 'Boulangerie' } } }, 'clients', '', []);
  v('un client se crée comme avant (aucun contrôle de fournisseur)', W.db.clients.map(c => c.nom), ['Boulangerie']); }

console.log('\n══ test-1230 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
