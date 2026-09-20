/* ⛔ CE QUE CE FICHIER GARDE — ÉTAPE 3 DU SOCLE : LES PIÈCES JOINTES NE VOYAGENT PAS DANS UNE
   LIGNE, ET UN ENREGISTREMENT AMPUTÉ NE SE POUSSE PAS.

   Deux règles, et la seconde est celle qui rend l'étape BLOQUANTE pour toutes les suivantes.

   ⛔ 1. LA SUBSTITUTION SE FAIT AU BORD DU TRANSPORT, JAMAIS DANS `db`.
   La base locale garde ses blobs, définitivement. Remplacer une photo par son identifiant DANS
   `db` changerait l'empreinte de l'enregistrement (`recEmpreinte`), lui donnerait un `_m` neuf,
   et il gagnerait toutes les fusions : 220 interventions re-tamponnées d'un coup, battant le
   travail en cours de tous les collègues. C'est pour cette raison exacte que
   `syncSortirPieces` travaille sur des COPIES — et `opDecomposer` la réutilise telle quelle
   plutôt que de refaire le geste, parce que deux implantations divergeraient un jour.

   ⛔ 2. UN ENREGISTREMENT AMPUTÉ NE SE POUSSE PAS.
   `syncAlleger` vide le contenu des pièces qui n'ont PAS d'identifiant de serveur, pour faire
   tenir la copie sous le plafond de 1 Mio d'un document Firestore. L'enregistrement porte
   alors `horsNuage`, `photosHorsNuage` ou `champsHorsNuage` : il est INCOMPLET, et il n'existe
   d'exemplaire complet que sur l'appareil qui a pris la photo.
   Poussé tel quel, l'amputé et le complet arrivent avec le MÊME `maj_le` — ils décrivent le
   même geste, à la même milliseconde. Lequel gagne est une LOTERIE, et une fois sur deux elle
   efface une photo de terrain chez tout le monde. On retient donc, on le DIT, et l'appareil
   qui détient la pièce la téléverse d'abord.
   ⚠️ Retenir en silence serait pire que pousser : une ligne qui ne part jamais sans que
   personne ne l'apprenne, c'est une donnée perdue avec l'air d'aller bien. */

const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, a) => v(t, !!a, true);

console.log('\n── 733 · les pièces jointes au bord du transport (socle, étape 3) ──');

const bloc = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(i, f); };
const ligne = (sig) => { const i = SRC.indexOf(sig); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const objet = (sig) => { const i = SRC.indexOf(sig); if (i < 0) return '{}';
  let d = 0, f = -1; for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { f = k + 1; break; } } } return SRC.slice(SRC.indexOf('{', i), f); };

const code = [
  ligne('const PH_MARQUE='), bloc('function recEmpreinte('),
  'const OP_CLASSES = ' + objet('const OP_CLASSES = {') + ';',
  ligne('const OP_ID_DE ='), ligne("const OP_REGLAGES ="), ligne("const OP_BOX_FORME ="), ligne("const OP_VIDES ="),
  bloc('function opSansTampon('), bloc('function opCanon('), bloc('function opEmpreinte('),
  bloc('function opIdDerive('), bloc('function opSignature('), bloc('function opAmpute('),
  bloc('function syncSortirPieces('), bloc('function opDecomposer('), bloc('function opRecomposer('),
].join('\n');
let api = null;
try { api = new Function('db', 'console', code + '\nreturn {opDecomposer,opRecomposer,opAmpute,syncSortirPieces,opEmpreinte};')({}, { log() {}, warn() {}, error() {} }); }
catch (e) { console.log('      (extraction : ' + e.message + ')'); }
vrai('⛔ les VRAIES fonctions du fichier livré s\'extraient et s\'exécutent', !!(api && api.opDecomposer && api.opAmpute));
if (!api) { console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exitCode = 1; return; }

const SHA = 'a'.repeat(64), SHB = 'b'.repeat(64);
const IMAGE = 'data:image/jpeg;base64,' + 'Z'.repeat(4000);   // 4 Ko de contenu, comme une vraie photo

/* ══ 1. UNE PHOTO DÉPOSÉE NE VOYAGE QUE PAR SON IDENTIFIANT ═══════════════════════════════ */
console.log('\n⛔ Ce qui part sur le réseau ne porte aucun contenu de pièce');
{
  const base = {
    interventions: [{ id: 'i1', titre: 'Cuisine', _m: 1700000000000,
      photos: ['piece:' + SHA + ':' + IMAGE, 'piece:' + SHB],
      docs: [{ pid: SHA, nom: 'rapport.pdf', data: IMAGE }] }],
  };
  const avant = JSON.stringify(base);
  const lignes = api.opDecomposer(base);
  const l = lignes.find(x => x.c === 'interventions');
  vrai('l\'intervention part bien', !!l);
  v('⛔ la photo ne porte que son identifiant', l.r.photos[0], 'piece:' + SHA);
  v('   et celle qui n\'avait déjà que lui est intacte', l.r.photos[1], 'piece:' + SHB);
  v('⛔ le document ne porte plus son contenu', [l.r.docs[0].data, l.r.docs[0].surServeur], ['', true]);
  v('   mais il garde son identifiant et son nom', [l.r.docs[0].pid, l.r.docs[0].nom], [SHA, 'rapport.pdf']);
  /* La mesure qui dit si le chantier sert à quelque chose : une pièce jointe de 1,5 Mo pèse
     2 Mo en base64 — à elle seule, le double du plafond entier d'un document Firestore. */
  const poids = JSON.stringify(l).length;
  vrai('⛔ la ligne pèse moins de 1 Ko là où le contenu en fait 8 (mesuré : ' + poids + ' octets)', poids < 1024);
  v('⛔ aucune ligne ne porte de base64', lignes.filter(x => JSON.stringify(x.r || '').indexOf('base64') >= 0).length, 0);

  /* ⛔ ET LA BASE LOCALE N'A PAS BOUGÉ. C'est la garde qui protège le travail des collègues :
     toucher `db` changerait l'empreinte de 220 interventions d'un coup, leur donnerait un `_m`
     neuf, et elles gagneraient toutes les fusions. */
  v('⛔ `db` n\'a PAS été touché (la base locale garde ses blobs)', JSON.stringify(base), avant);
}

/* ══ 2. ⛔ L'ENREGISTREMENT AMPUTÉ EST RETENU, ET NOMMÉ ═══════════════════════════════════ */
console.log('\n⛔ Un enregistrement amputé ne part pas, et on sait lequel');
{
  const base = {
    interventions: [
      { id: 'complete', titre: 'OK', _m: 1, photos: ['piece:' + SHA + ':' + IMAGE] },
      { id: 'sansPhotos', titre: 'Amputée', _m: 2, photosHorsNuage: 3, photos: [] },
      { id: 'sansChamps', titre: 'Amputée 2', _m: 3, signature: '', champsHorsNuage: ['signature'] },
      { id: 'sansDoc', titre: 'Amputée 3', _m: 4, docs: [{ nom: 'x.pdf', data: '', horsNuage: true }] },
    ],
  };
  const lignes = api.opDecomposer(base);
  const ids = lignes.filter(l => l.c === 'interventions').map(l => l.id);
  v('⛔ seule l\'intervention COMPLÈTE part', ids, ['complete']);
  v('⛔ et les trois amputées sont NOMMÉES, avec leur motif',
    lignes.retenus.map(r => r.id + ':' + r.motif).sort(),
    ['sansChamps:champs', 'sansDoc:documents', 'sansPhotos:photos']);
  vrai('   chacune avec sa collection', lignes.retenus.every(r => r.c === 'interventions'));

  /* ⛔ LE CONTRE-TEST, ET IL EST LE PLUS IMPORTANT DES DEUX : la rétention doit se LEVER.
     Une fois la pièce téléversée, l'enregistrement porte un `pid`, il n'est plus amputé, et il
     part au tour suivant. Sans cette levée, une intervention à photo ne partirait JAMAIS —
     on aurait remplacé une loterie par un blocage définitif, ce qui est pire. */
  const reparee = { interventions: [{ id: 'sansPhotos', titre: 'Réparée', _m: 5, photos: ['piece:' + SHA + ':' + IMAGE] }] };
  const l2 = api.opDecomposer(reparee);
  v('⛔ une fois la pièce téléversée, l\'enregistrement PART', l2.filter(l => l.c === 'interventions').map(l => l.id), ['sansPhotos']);
  v('   et plus rien n\'est retenu', l2.retenus, []);
}

/* ══ 3. LA BOX AUSSI ══════════════════════════════════════════════════════════════════════
   Une box amputée aurait éclaté en lignes de stock parfaitement valides, et son enveloppe
   serait partie amputée : le pire des deux mondes. */
{
  const base = { boxes: [{ id: 'bx1', nom: 'Box', _m: 1, stock: { p1: { u: 1 } }, _ms: { p1: 1 }, photosHorsNuage: 2 }] };
  const lignes = api.opDecomposer(base);
  v('⛔ une box amputée ne part pas non plus', lignes.filter(l => l.c === 'boxes' || l.c === 'box_stock').length, 0);
  v('   et elle est nommée', lignes.retenus.map(r => r.c + ':' + r.id), ['boxes:bx1']);
}

/* ══ 4. L'ALLER-RETOUR, MODULO LES PIÈCES SORTIES ═════════════════════════════════════════
   ⚠️ CE N'EST PAS L'IDENTITÉ DU BANC N° 1, ET C'EST VOULU. Le transport perd le contenu des
   pièces — c'est tout l'objet de l'étape. La bonne référence n'est donc pas `db`, mais `db`
   tel qu'il est UNE FOIS SES PIÈCES SUR LE SERVEUR : `syncSortirPieces(db).copie`. L'appareil
   récupère le contenu ensuite, par `photosResoudre`, et ne le réécrit jamais dans la base. */
{
  const base = {
    interventions: [{ id: 'i1', titre: 'A', _m: 1, photos: ['piece:' + SHA + ':' + IMAGE], docs: [{ pid: SHB, nom: 'd.pdf', data: IMAGE }] }],
    clients: [{ id: 'c1', nom: 'Client', _m: 2 }],
  };
  const attendu = api.syncSortirPieces(base).copie;
  const refait = api.opRecomposer(api.opDecomposer(base), {});
  const tri = (o) => JSON.stringify(o, (k, val) => (val && typeof val === 'object' && !Array.isArray(val))
    ? Object.keys(val).sort().reduce((t, x) => (t[x] = val[x], t), {}) : val);
  v('⛔ aller-retour identique à la base UNE FOIS SES PIÈCES SORTIES',
    tri(refait.interventions) === tri(attendu.interventions) ? [] : [tri(attendu.interventions), tri(refait.interventions)], []);
  v('   et le reste de la base est intact', tri(refait.clients), tri(base.clients));
}

/* ══ 5. LE CHEMIN EST BIEN CELUI DU FICHIER LIVRÉ ═════════════════════════════════════════
   Un banc qui prouverait tout ça sur une copie recopiée ne prouverait rien. On vérifie que
   `opDecomposer` appelle VRAIMENT `syncSortirPieces`, et qu'il ne refait pas le geste. */
{
  const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const i = CODE.indexOf('function opDecomposer(');
  let d = 0, f = -1;
  for (let k = CODE.indexOf('{', i); k < CODE.length; k++) { if (CODE[k] === '{') d++; else if (CODE[k] === '}') { d--; if (!d) { f = k + 1; break; } } }
  const corps = CODE.slice(i, f);
  vrai('⛔ opDecomposer passe par syncSortirPieces (une seule définition du geste)', /syncSortirPieces\s*\(/.test(corps));
  vrai('⛔ et il consulte opAmpute avant d\'écrire une ligne', /opAmpute\s*\(/.test(corps));
  v('   il ne refait pas la découpe des marqueurs lui-même', /PH_MARQUE/.test(corps), false);
  /* `syncSortirPieces` reste la seule à savoir sortir une pièce : deux implantations
     divergeraient un jour, et c'est celle qu'on aurait oublié de corriger qui déciderait. */
  v('⛔ `syncSortirPieces` n\'est définie qu\'une fois', (CODE.match(/function syncSortirPieces\s*\(/g) || []).length, 1);
}

/* ══ 6. LA BÊTA PORTE LE MÊME CODE ════════════════════════════════════════════════════════ */
{
  const B = fs.readFileSync(path.join(RACINE, 'beta.html'), 'utf8');
  const memeQue = (sig) => { const a = bloc(sig), i = B.indexOf(sig);
    if (i < 0 || !a) return false;
    let d = 0, f = -1; for (let k = B.indexOf('{', i); k < B.length; k++) { if (B[k] === '{') d++; else if (B[k] === '}') { d--; if (!d) { f = k + 1; break; } } }
    return B.slice(i, f) === a; };
  vrai('⛔ la bêta porte le MÊME opAmpute', memeQue('function opAmpute('));
  vrai('⛔ et le MÊME syncSortirPieces', memeQue('function syncSortirPieces('));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
