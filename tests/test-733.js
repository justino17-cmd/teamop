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
  bloc('function opIdDerive('), bloc('function opSignature('), bloc('function opFichiersDe('), bloc('function opAmpute('),
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
  /* ⚠️ TOUT CE QUI SUIT PASSE PAR `(l && l.r) || {}` : un banc qui PLANTE en dit moins qu'un
     banc qui ÉCHOUE. Une mutation qui retenait l'intervention faisait jeter la ligne suivante
     sur un `undefined`, et les vingt contrôles d'après ne rendaient plus rien du tout — on
     voyait une trace de pile au lieu de savoir ce qui marchait encore. Même défaut que celui
     corrigé dans `test-723` le 19 septembre. */
  const r0 = (l && l.r) || {}, ph0 = r0.photos || [], dc0 = (r0.docs || [])[0] || {};
  v('⛔ la photo ne porte que son identifiant', ph0[0], 'piece:' + SHA);
  v('   et celle qui n\'avait déjà que lui est intacte', ph0[1], 'piece:' + SHB);
  v('⛔ le document ne porte plus son contenu', [dc0.data, dc0.surServeur], ['', true]);
  v('   mais il garde son identifiant et son nom', [dc0.pid, dc0.nom], [SHA, 'rapport.pdf']);
  /* La mesure qui dit si le chantier sert à quelque chose : une pièce jointe de 1,5 Mo pèse
     2 Mo en base64 — à elle seule, le double du plafond entier d'un document Firestore. */
  const poids = JSON.stringify(l || {}).length;
  vrai('⛔ la ligne pèse moins de 1 Ko là où le contenu en fait 8 (mesuré : ' + poids + ' octets)', poids < 1024);
  v('⛔ aucune ligne ne porte de base64', lignes.filter(x => JSON.stringify(x.r || '').indexOf('base64') >= 0).length, 0);

  /* ⛔ ET LA BASE LOCALE N'A PAS BOUGÉ. C'est la garde qui protège le travail des collègues :
     toucher `db` changerait l'empreinte de 220 interventions d'un coup, leur donnerait un `_m`
     neuf, et elles gagneraient toutes les fusions. */
  v('⛔ `db` n\'a PAS été touché (la base locale garde ses blobs)', JSON.stringify(base), avant);
}

/* ══ 1 bis. ⛔ LA LIGNE DÉCLARE LES PIÈCES QU'ELLE RÉFÉRENCE ═════════════════════
   Sans cette déclaration, une pièce dont plus aucune ligne ne parle reste sur le disque du VPS
   POUR TOUJOURS : la suppression d'aujourd'hui dépend d'un geste du client (`pieceSupprimer`),
   et un onglet fermé au mauvais moment, une coupure réseau ou une suppression faite depuis un
   AUTRE appareil suffisent à la manquer.
   ⚠️ C'est l'appareil qui déclare, pas le serveur qui devine : il POURRAIT déchiffrer chaque
   corps pour y chercher les identifiants, mais ce serait un déchiffrement par ligne et par
   envoi, sur la boucle d'événements, pour une information que l'appareil connaît gratuitement.
   Le registre côté serveur est éprouvé par `tests/test-723.js`. */
console.log('\n⛔ Une ligne dit quelles pièces elle référence');
{
  const base = {
    interventions: [
      { id: 'i1', titre: 'Deux photos et un doc', _m: 1,
        photos: ['piece:' + SHA + ':' + IMAGE, 'piece:' + SHB],
        docs: [{ pid: SHA, nom: 'r.pdf', data: IMAGE }] },
      { id: 'i2', titre: 'Rien', _m: 2 },
    ],
  };
  const lignes = api.opDecomposer(base);
  const l1 = lignes.find(l => l.id === 'i1'), l2 = lignes.find(l => l.id === 'i2');
  v('⛔ la ligne déclare ses pièces, sans doublon', (l1 && l1.f || []).slice().sort(), [SHA, SHB]);
  /* `f` n'est posé que s'il y a quelque chose à dire : une ligne sur cent en porte, et un
     tableau vide sur toutes les autres ferait grossir chaque envoi pour rien. */
  v('   une ligne sans pièce ne porte pas le champ du tout', 'f' in (l2 || {}), false);
  /* ⛔ ET LA DÉCLARATION SUIT LE CONTENU. Retirer une photo doit retirer sa référence, sinon
     la pièce devient indélébile — exactement ce qu'on répare. */
  const moins = api.opDecomposer({ interventions: [{ id: 'i1', titre: 'Une seule', _m: 3, photos: ['piece:' + SHB] }] });
  v('⛔ une photo retirée fait disparaître sa référence', moins[0].f, [SHB]);
  /* Ce qui n'est pas un identifiant de pièce n'entre pas : une photo collée en clair, un
     champ libre, un data URL — rien de tout ça n'est un sha. */
  const sale = api.opDecomposer({ interventions: [{ id: 'i3', titre: 'x', _m: 4, photos: [IMAGE, 'piece:PAS-UN-SHA'] }] });
  v('   et rien qui ne soit un sha n\'y entre', 'f' in sale[0], false);
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

/* ══ ÉTAPE 5 — L'ORDRE DE `opSocleLire`, ET IL SE PAIE DANS LE MAUVAIS SENS ══════════════════
   ⛔ MESURÉ AU NAVIGATEUR LE 20 SEPTEMBRE 2026, puis corrigé : avec `save()` AVANT
   `ombreRelever()`, les 120 fiches simplement LUES repartaient toutes avec un `_m` NEUF, et
   l'appareil annonçait qu'il repousserait 2 908 lignes. `save()` appelle `estampiller()`, qui
   date de maintenant tout enregistrement absent de l'ombre ; or l'ombre date d'AVANT la
   lecture. Un appareil qui ne fait que LIRE s'attribuait la base entière et gagnait toutes les
   fusions contre ses collègues — `boxAutoNouveautes` à l'échelle de l'entreprise.
   Après correction, même sonde : `avecUnMNeuf: 0`, et les collections identiques entre les
   deux appareils passent de 2 sur 12 à 9 sur 12 (les trois restantes sont un artefact de
   sonde : `migrate()` ajoute `typeClient` aux fiches que l'appareil témoin avait construites
   à la main, ce qui a été mesuré champ par champ).

   ⚠️ C'est un ORDRE, donc ça se lit dans le texte du fichier livré — on ne peut pas l'exécuter
   ici. La preuve fonctionnelle est la sonde ci-dessus ; ce contrôle empêche la régression. */
{
  console.log('\n⛔ Étape 5 — `ombreRelever()` passe AVANT `save()` dans la lecture');
  const corps = bloc('async function opSocleLireVraiment(');
  vrai('la fonction de lecture est bien dans le fichier livré', corps.length > 200);
  /* On vise le CODE, pas le commentaire qui l'explique — ce dépôt a payé trois fois pour
     l'inverse, dans trois fichiers différents, le même soir. */
  const net = corps.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const iOmbre = net.indexOf('ombreRelever()');
  const iSave = net.indexOf('save()');
  vrai('⛔ elle relève l\'ombre', iOmbre > 0);
  vrai('⛔ et elle enregistre', iSave > 0);
  vrai('⛔⛔ et l\'ombre est relevée AVANT l\'enregistrement', iOmbre > 0 && iSave > 0 && iOmbre < iSave);
  /* `migrate` doit passer avant les deux : l'ombre doit figer l'état NORMALISÉ, sinon le
     premier `save()` re-tamponne tout ce que `migrate` vient de compléter. */
  const iMig = net.indexOf('migrate(db)');
  vrai('⛔ et `migrate` avant l\'ombre, sinon il re-tamponne ce qu\'il complète', iMig > 0 && iMig < iOmbre);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
