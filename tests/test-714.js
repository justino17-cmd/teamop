/* ══ UNE PHOTO PORTE SON IDENTIFIANT DANS SA PROPRE CHAÎNE ═════════════════════════════════

   Point 5 de l'étape 0 (Justin, 17 septembre 2026 : « point 5 »). Les photos rejoignent les
   documents joints sur le VPS — et le difficile n'était pas le réseau, c'était le FORMAT.

   `i.photos` est un tableau de CHAÎNES, pas d'objets : il n'y a nulle part où poser un
   identifiant. Les deux évidences ne marchent pas :
   · un tableau parallèle désynchronise, parce que `syncAlleger` RETIRE une photo du tableau
     (`x.photos[k]=null` puis `.filter(v=>v!==null)`) au lieu de la vider sur place comme un
     document — tous les index glissent, et l'identifiant désigne la voisine ;
   · passer `photos` en objets casserait les six endroits qui mettent la chaîne directement
     dans un `<img src>` ou dans un PDF.

   D'où le format retenu, qui rend la désynchronisation IMPOSSIBLE plutôt que surveillée :
   l'identifiant vit DANS la chaîne. Supprimer une photo emporte son identifiant, par
   construction — il n'y a plus rien à tenir en parallèle. */

const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ══ 1. ⛔ L'ORDRE DU FICHIER, ET IL S'ÉPROUVE ══════════════════════════════════════════════
   `PH_MARQUE` est un `const` : pas hissé, zone morte temporelle. `syncSortirPieces` s'en sert.
   Le laisser plus bas « marchait » par chance — la fonction n'est appelée qu'à la synchro, donc
   bien après l'exécution du script. Ce dépôt a déjà payé ce pari une fois : une zone morte
   temporelle a rendu tout le rangement de catégories silencieusement inopérant, le 10 septembre
   au matin. Ici, on prend la tranche du fichier DANS SON ORDRE et on l'exécute : si la constante
   repassait sous la fonction, la tranche ne contiendrait plus la fonction et ce banc tomberait. */
console.log('\n── 714 · ⛔ la constante est déclarée AVANT la fonction qui l\'utilise ──');
const iMarque = APP.indexOf('const PH_MARQUE=');
const iSortir = APP.indexOf('function syncSortirPieces(base){');
const iAlleger = APP.indexOf('function syncAlleger(base, budget){');
v('les trois repères sont trouvés', iMarque > 0 && iSortir > 0 && iAlleger > 0, true);
v('⛔ PH_MARQUE est AVANT syncSortirPieces', iMarque < iSortir, true);
v('⛔ … et syncSortirPieces avant syncAlleger', iSortir < iAlleger, true);
/* ⛔ ET AVANT `syncRegreffer`, QUI S'EN SERT DEPUIS LE 19 SEPTEMBRE. Le danger n'est pas un
   plantage : `syncRegreffer` est enveloppée d'un `try/catch` qui rend 0. Si la constante
   repassait sous elle, la fonction rendrait 0 EN SILENCE — et pas seulement pour les photos :
   pour les DOCUMENTS aussi, qui ne sont regreffés que plus bas dans le même corps. Un
   technicien perdrait ses pièces sans qu'une seule ligne d'erreur n'apparaisse. */
const iRegr = APP.indexOf('function syncRegreffer(');
v('⛔ … et PH_MARQUE avant syncRegreffer, qui s\'en sert aussi', iRegr > 0 && iMarque < iRegr, true);

/* On exécute la tranche telle qu'elle est écrite, sans réordonner quoi que ce soit. */
const SRC = APP.slice(iMarque, iAlleger);
const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx);
vm.runInContext(SRC, ctx);
v('la tranche, dans l\'ordre du fichier, s\'exécute', typeof ctx.syncSortirPieces, 'function');

/* ══ 2. LE FORMAT ══════════════════════════════════════════════════════════════════════════ */
console.log('\n── 714 · le format, exécuté sur de vraies chaînes ──');
const D = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
const ID = 'a'.repeat(64);
v('une photo ordinaire n\'a pas d\'identifiant', ctx.photoPid(D), '');
v('… et son contenu est elle-même', ctx.photoSrc(D), D);
v('une photo déposée rend son identifiant', ctx.photoPid('piece:' + ID + ':' + D), ID);
v('… et son contenu', ctx.photoSrc('piece:' + ID + ':' + D), D);
/* ⛔ Le data URL contient des « : ». L'identifiant faisant exactement 64 hexadécimaux, la
   découpe reste sans ambiguïté — c'est toute la raison de cette longueur fixe. */
v('⛔ les « : » du data URL ne trompent pas la découpe', ctx.photoSrc('piece:' + ID + ':' + D).indexOf('data:image') , 0);
v('un marqueur SANS contenu rend une source vide, pas le marqueur',
  ctx.photoSrc('piece:' + ID), '');
/* ⛔ `<img src="">` ne charge rien et ne casse pas la page ; `src="piece:abc…"` déclencherait
   une requête vers un schéma inconnu, visible dans la console de tous les téléphones. */
v('⛔ … donc jamais « piece: » dans un src', ctx.photoSrc('piece:' + ID).indexOf('piece'), -1);
v('fabriquer un marqueur', ctx.photoMarquer(ID, D), 'piece:' + ID + ':' + D);
v('… sans identifiant, c\'est le contenu nu', ctx.photoMarquer('', D), D);
v('un identifiant mal formé n\'est pas reconnu', ctx.photoPid('piece:PAS-HEXA:' + D), '');
v('une chaîne vide ne lève pas', [ctx.photoPid(''), ctx.photoSrc(''), ctx.photoSrc(null)], ['', '', '']);

/* ══ 3. CE QUI PART DANS LE DOCUMENT DE L'ÉQUIPE ═══════════════════════════════════════════ */
console.log('\n── 714 · une photo déposée ne voyage plus, une photo locale reste ──');
const base = () => ({ interventions: [
  { id: 'i1', photos: ['piece:' + ID + ':' + D, D, 'piece:' + 'b'.repeat(64) + ':' + D] },
  { id: 'i2', photos: [D, D] },
  { id: 'i3' },
] });
{ const b = base(); const r = ctx.syncSortirPieces(b);
  v('deux photos sont sorties', r.sorties, 2);
  v('⛔ celle qui a un identifiant ne garde que lui', r.copie.interventions[0].photos[0], 'piece:' + ID);
  /* ⛔ LE CONTRÔLE QUI ÉVITE UNE PERTE DE DONNÉES : sans identifiant, le clair est le SEUL
     exemplaire au monde. */
  v('⛔ celle SANS identifiant garde son contenu entier', r.copie.interventions[0].photos[1], D);
  v('⛔ et la position ne bouge PAS — c\'est tout l\'intérêt du format',
    r.copie.interventions[0].photos.length, 3);
  v('une fiche sans photo déposée n\'est pas touchée', r.copie.interventions[1] === b.interventions[1], true); }

console.log('\n── 714 · ⛔ LA BASE LOCALE N\'EST JAMAIS TOUCHÉE ──');
/* Ce que l'appareil a pris reste sur l'appareil : si cette fonction modifiait `db`, le
   technicien perdrait ses photos dès la première synchro, sur son propre téléphone. */
{ const b = base(); const avant = JSON.stringify(b);
  const r = ctx.syncSortirPieces(b);
  v('⛔ la base d\'origine est identique, octet pour octet', JSON.stringify(b), avant);
  v('⛔ … et le tableau de photos n\'est pas le même objet',
    r.copie.interventions[0].photos === b.interventions[0].photos, false);
  v('⛔ … la photo locale est toujours lisible dans la base', ctx.photoSrc(b.interventions[0].photos[0]), D); }

/* ══ 4. LES POINTS DE RENDU ════════════════════════════════════════════════════════════════ */
console.log('\n── 714 · les six endroits qui affichent une photo passent par photoSrc ──');
/* Un seul oublié, et un technicien voit un cadre vide à la place d'une preuve de traitement —
   sans aucune erreur en console, parce qu'un `src` inconnu échoue en silence. */
[['onglet médias de la fiche', '<img src="${photoSrc(ph)}" onclick="window.open(this.src)" style="width:100%'],
 ['bloc Photos du détail', '<img src="${photoSrc(p)}" onclick="window.open(this.src)" style="width:80px'],
 ['vignettes du rapport', 'rapPhotos.map((p,idx)=>`<div style="position:relative"><img src="${photoSrc(p)}"'],
 ['clôture guidée', "rapPhotos.map((p,ix)=>{ const tg=rapTags[ix]||''; p=photoSrc(p);"],
 ['PDF du rapport', 'const photos=(i.photos||[]).map((p,ix)=>{ p=photoSrc(p);'],
 ['export de médias', 'med.push([photoSrc(p),']].forEach(([quoi, motif]) => {
  v(quoi + ' passe par photoSrc', APP.indexOf(motif) > 0, true); });
/* ⚠️ LE COMPTE TOTAL, pour qu'un septième point de rendu ajouté un jour ne passe pas
   inaperçu : 1 définition + 6 points de rendu + 2 dans `intPhotoAdd`, qui lit le contenu pour
   le déposer puis le remet derrière le marqueur. Ce banc a d'abord attendu 7 et rougi à 9 :
   c'est exactement ce qu'il doit faire quand le compte bouge — on regarde POURQUOI, et on ne
   remonte le nombre qu'une fois les deux nouvelles occurrences identifiées. */
v('⚠️ exactement 9 occurrences de photoSrc — une de plus doit faire rougir ce banc',
  (APP.match(/photoSrc\(/g) || []).length, 9);
{ const add = APP.slice(APP.indexOf('async function intPhotoAdd('), APP.indexOf('/* Suppression de m\u00e9dias'));
  v('… et les deux de plus sont bien dans intPhotoAdd', (add.match(/photoSrc\(/g) || []).length, 2); }

/* ══ 5. LA SUPPRESSION, EXÉCUTÉE ═══════════════════════════════════════════════════════════ */
console.log('\n── 714 · ⛔ supprimer une photo emporte son étiquette (défaut préexistant) ──');
/* ⛔ TROUVÉ EN ÉCRIVANT CE POINT : `i.photos.splice(ix,1)` ne touchait pas à `i.photoTags`.
   Supprimer la première photo décalait TOUTES les légendes d'un cran — sur un rapport
   sanitaire, une photo légendée « poste 12 » devient « poste 11 » sans que personne ne le
   voie. On ne pose pas une mécanique neuve à côté d'une désynchronisation connue. */
{ const iDel = APP.indexOf('function intPhotoDel(');
  const src = APP.slice(iDel, APP.indexOf('\nfunction ', iDel + 10));
  const c2 = { confirm: () => true, save() {}, renderIntDetail() {}, pieceSupprimer() {},
    photoPid: ctx.photoPid, console: { log() {}, warn() {}, error() {} } };
  c2.db = { interventions: [{ id: 'x', photos: [D + '1', 'piece:' + ID + ':' + D, D + '3'], photoTags: ['avant', 'pendant', 'apres'] }] };
  vm.createContext(c2); vm.runInContext(src, c2);
  c2.intPhotoDel('x', 0);
  const i = c2.db.interventions[0];
  v('la photo part', i.photos.length, 2);
  v('⛔ et l\'étiquette AVEC — les légendes ne glissent plus', i.photoTags, ['pendant', 'apres']);
  v('⛔ la deuxième photo a toujours SA légende', [ctx.photoSrc(i.photos[0]), i.photoTags[0]], [D, 'pendant']); }
{ const iDel = APP.indexOf('function intPhotoDel(');
  const src = APP.slice(iDel, APP.indexOf('\nfunction ', iDel + 10));
  v('⛔ et la pièce part aussi du serveur', /pieceSupprimer\(pid\)/.test(src), true);
  v('⛔ … mais APRÈS la suppression locale, qui ne dépend pas du réseau',
    src.indexOf('i.photos.splice(ix,1)') < src.indexOf('pieceSupprimer(pid)'), true); }

/* ══ 6. L'ÉCRAN N'ATTEND PAS, LE PDF ATTEND ════════════════════════════════════════════════ */
console.log('\n── 714 · l\'écran n\'attend pas, le PDF si ──');
{ const comb = APP.slice(APP.indexOf('function intPhotosCombler('), APP.indexOf('function renderIntDetail('));
  /* ⛔ AUCUN save() : « rien ne s'écrit dans les données d'une entreprise au seul chargement ».
     Une photo recopiée dans la base repartirait dans le document de l'équipe à la première
     écriture — ce qui déferait tout le chantier, en silence. */
  v('⛔ combler les photos n\'écrit RIEN', comb.indexOf('save()'), -1);
  v('… et ne redessine que si quelque chose est arrivé', /if\(n&&document\.getElementById/.test(comb), true);
  v('… sans relancer deux fois la même fiche', /_phEnCours\.has\(id\)/.test(comb), true); }
{ const pdf = APP.slice(APP.indexOf('async function printRapport('), APP.indexOf('async function printRapport(') + 1400);
  /* ⛔ Un écran incomplet se recomplète une seconde plus tard ; un PDF envoyé à un client avec
     des cadres vides est définitif, et c'est un rapport sanitaire. */
  v('⛔ le PDF attend les photos', /await photosResoudre\(i\.photos\)/.test(pdf), true);
  v('⛔ … et demande confirmation s\'il en manque encore', /n\\'ont pas pu .*tre r.*cup.*Continuer quand m/s.test(pdf), true); }
{ v('⛔ l\'envoi au client attend le PDF', /await printRapport\(id\)/.test(APP), true); }

/* ══ LE TRAJET COMPLET : UNE PHOTO DÉPOSÉE REVIENT-ELLE DANS LA BASE DE CELUI QUI L'A PRISE ?
   ⛔ BLOQUANT DE PUBLICATION, trouvé le 19 septembre 2026 en éprouvant ce qui attend de partir.
   Un technicien prend six photos, elles montent sur le VPS, il synchronise — et sa PROPRE base
   ne les a plus. `syncRegreffer` ne rendait ses pièces qu'à deux conditions : `photosHorsNuage>0`
   ET des tableaux de LONGUEURS DIFFÉRENTES. Or `syncSortirPieces` ne retire aucune entrée : il
   remplace « piece:HEX:contenu » par « piece:HEX ». Même longueur, aucun `photosHorsNuage` — la
   condition n'était donc JAMAIS remplie.
   ⚠️ L'asymétrie était le constat : le même correctif avait été appliqué aux DOCUMENTS (appariés
   par nom et horodatage) et oublié aux PHOTOS. On apparie donc par le `pid`, ce qui est tout
   l'intérêt du choix défendu en tête de ce fichier — l'identifiant vit DANS la chaîne. */
console.log('\n── 714 · ⛔ le trajet complet : déposer, synchroniser, retrouver ──');
{
  const iRegreffer = APP.indexOf('function syncRegreffer(');
  v('syncRegreffer est trouvée', iRegreffer > 0, true);
  const finR = (() => { let d = 0; for (let k = APP.indexOf('{', iRegreffer); k < APP.length; k++) {
    if (APP[k] === '{') d++; else if (APP[k] === '}') { d--; if (!d) return k + 1; } } return -1; })();
  const ctx2 = { console: { log() {}, warn() {}, error() {} } };
  vm.createContext(ctx2);
  vm.runInContext(SRC + '\n' + APP.slice(iRegreffer, finR), ctx2);
  v('la tranche s\'exécute', typeof ctx2.syncRegreffer, 'function');

  const PID = 'a'.repeat(64), PID2 = 'b'.repeat(64);
  const PHOTO = 'data:image/jpeg;base64,' + 'Z'.repeat(4000);
  const j = (o) => JSON.parse(JSON.stringify(o));
  const local = { interventions: [{ id: 'i1', _m: 1000,
    photos: ['piece:' + PID + ':' + PHOTO],
    docs: [{ pid: PID2, nom: 'rapport.pdf', ts: 5, data: 'DOC'.repeat(1000) }] }] };

  /* Ce qui PART vers l'équipe : allégé des deux côtés. */
  const parti = ctx2.syncSortirPieces(j(local)).copie;
  v('la photo part allégée (marqueur nu)', parti.interventions[0].photos[0], 'piece:' + PID);
  v('le document aussi', parti.interventions[0].docs[0].data, '');

  /* Ce qui REVIENT après fusion : le distant a gagné (même `_m`), donc la version allégée. */
  const revenu = j(parti);
  ctx2.syncRegreffer(local, revenu);
  /* ⛔ LES DEUX CONTRÔLES, ET C'EST L'ASYMÉTRIE QUI ÉTAIT LE DÉFAUT. */
  v('⛔ la photo est RENDUE à celui qui l\'a prise', revenu.interventions[0].photos[0], 'piece:' + PID + ':' + PHOTO);
  v('   et le document aussi (il l\'était déjà)', revenu.interventions[0].docs[0].data.length, 3000);

  /* ⚠️ LA CONTRE-ÉPREUVE : on ne regreffe QUE ce dont on a le clair. Une photo qu'un COLLÈGUE a
     déposée — dont on n'a jamais eu le contenu — doit rester un marqueur nu, sinon on
     inventerait des données. */
  const vide = { interventions: [{ id: 'i1', _m: 1000, photos: [], docs: [] }] };
  const distant = { interventions: [{ id: 'i1', _m: 1000, photos: ['piece:' + PID], docs: [] }] };
  ctx2.syncRegreffer(vide, distant);
  v('⛔ la photo d\'un collègue reste un marqueur nu', distant.interventions[0].photos[0], 'piece:' + PID);

  /* ⚠️ ET L'ORDRE NE COMPTE PAS : deux appareils peuvent avoir rangé les mêmes photos
     différemment. L'appariement se fait par identifiant, jamais par index. */
  const l2 = { interventions: [{ id: 'i1', _m: 1000, photos: ['piece:' + PID2 + ':B', 'piece:' + PID + ':A'], docs: [] }] };
  const r2 = { interventions: [{ id: 'i1', _m: 1000, photos: ['piece:' + PID, 'piece:' + PID2], docs: [] }] };
  ctx2.syncRegreffer(l2, r2);
  v('⛔ l\'appariement se fait par identifiant, pas par index',
    r2.interventions[0].photos, ['piece:' + PID + ':A', 'piece:' + PID2 + ':B']);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
