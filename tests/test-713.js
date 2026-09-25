/* ══ UN DOCUMENT QUI EST SUR LE SERVEUR NE VOYAGE PLUS DANS LE DOCUMENT DE L'ÉQUIPE ═════════

   Point 4 de l'étape 0 (Justin, 17 septembre 2026 : « point 4 »). C'est ici que le chantier
   devient visible : une pièce jointe déposée sur le VPS cesse de consommer le plafond de
   1 Mio de Firestore, et le collègue peut enfin l'ouvrir.

   ⛔ CE QUE CE BANC GARDE, ET POURQUOI C'EST LE PLUS DANGEREUX DE LA SÉRIE.
   `syncAlleger` et son voisinage sont le code le plus destructeur de l'application : ils
   décident de ce qui part dans le document de l'équipe, et `_fbDoc.set()` REMPLACE ce
   document. Une erreur ici ne fait pas planter — elle efface le travail de quelqu'un.
   Trois propriétés, et aucune ne se relit, elles s'exécutent :
     1. on ne vide QUE ce qui porte un identifiant de pièce (`pid`). Sans lui, le clair est le
        SEUL exemplaire qui existe : le vider serait une perte de données ;
     2. LA BASE LOCALE N'EST JAMAIS TOUCHÉE — ce que l'appareil a pris reste sur l'appareil ;
     3. le geste est fait AVANT la mesure, et sur les DEUX chemins (compressé et non). Après la
        mesure, il n'aurait aucun effet dans le cas normal — celui où la base tient déjà.

   ⚠️ LES PHOTOS NE SONT PAS DANS CE POINT, et ce n'est pas un oubli : `syncAlleger` RETIRE une
   photo du tableau (`x.photos[k]=null` puis `.filter(v=>v!==null)`) au lieu de la vider sur
   place comme un document. Les index glissent donc, et un identifiant rangé en parallèle
   désynchronise. Elles demandent un autre mécanisme — c'est le point suivant. */

const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ── la vraie fonction, extraite du fichier livré ────────────────────────────────────────── */
console.log('\n── 713 · syncSortirPieces sort du fichier livré et s\'exécute ──');
const i0 = APP.indexOf('function syncSortirPieces(base){');
const i1 = APP.indexOf('function syncAlleger(base, budget){');
v('la fonction est retrouvée', i0 > 0 && i1 > i0, true);
const SRC = APP.slice(i0, i1);
const ctx = { console: { log() {}, warn() {}, error() {} } };
vm.createContext(ctx); vm.runInContext(SRC, ctx);
v('elle s\'exécute', typeof ctx.syncSortirPieces, 'function');

const base = () => ({
  interventions: [
    { id: 'i1', nom: 'Avec pièce sur le serveur', docs: [{ nom: 'rapport.pdf', data: 'data:application/pdf;base64,AAAA', ts: 1, pid: 'a'.repeat(64) }] },
    { id: 'i2', nom: 'Avec pièce SANS identifiant', docs: [{ nom: 'photo.jpg', data: 'data:image/jpeg;base64,BBBB', ts: 2 }] },
    { id: 'i3', nom: 'Sans document' },
    { id: 'i4', docs: [
      { nom: 'a.pdf', data: 'data:application/pdf;base64,CCCC', ts: 3, pid: 'b'.repeat(64) },
      { nom: 'b.pdf', data: 'data:application/pdf;base64,DDDD', ts: 4 } ] },
  ],
  clients: [{ id: 'c1', nom: 'Client' }],
});

console.log('\n── 713 · ce qui sort, et ce qui reste ──');
{ const b = base(); const r = ctx.syncSortirPieces(b);
  v('deux documents sont sortis', r.sorties, 2);
  v('⛔ celui qui a un identifiant est vidé', r.copie.interventions[0].docs[0].data, '');
  v('… et marqué « sur le serveur »', r.copie.interventions[0].docs[0].surServeur, true);
  v('… en gardant son identifiant, sinon il serait irrécupérable', r.copie.interventions[0].docs[0].pid, 'a'.repeat(64));
  /* ⛔ LE CONTRÔLE QUI ÉVITE UNE PERTE DE DONNÉES. Sans identifiant, le clair est le seul
     exemplaire au monde. */
  v('⛔ celui SANS identifiant garde son contenu', r.copie.interventions[1].docs[0].data, 'data:image/jpeg;base64,BBBB');
  v('⛔ et dans une fiche mixte, seul celui qui a un identifiant est vidé',
    [r.copie.interventions[3].docs[0].data, r.copie.interventions[3].docs[1].data],
    ['', 'data:application/pdf;base64,DDDD']); }

console.log('\n── 713 · ⛔ LA BASE LOCALE N\'EST JAMAIS TOUCHÉE ──');
/* ⛔ C'EST LA PROPRIÉTÉ QUI COMPTE LE PLUS DE TOUT CE FICHIER. Ce que l'appareil a pris reste
   sur l'appareil : si cette fonction modifiait `db`, le technicien perdrait ses documents dès
   la première synchro, sur son propre téléphone, sans rien pouvoir récupérer. */
{ const b = base(); const avant = JSON.stringify(b);
  const r = ctx.syncSortirPieces(b);
  v('⛔ la base d\'origine est identique, octet pour octet', JSON.stringify(b), avant);
  v('⛔ … et ce n\'est pas le même objet que la copie', r.copie === b, false);
  v('⛔ … ni le même tableau d\'interventions', r.copie.interventions === b.interventions, false);
  v('⛔ … ni la même fiche', r.copie.interventions[0] === b.interventions[0], false);
  v('⛔ … ni le même document', r.copie.interventions[0].docs[0] === b.interventions[0].docs[0], false);
  /* ⚠️ Et le contre-test : ce qui n'avait rien à changer n'est PAS recopié — une copie inutile
     coûte de la mémoire sur un téléphone, et masque ce qui a vraiment bougé. */
  v('⚠️ une collection sans document n\'est pas recopiée', r.copie.clients === b.clients, true);
  v('⚠️ une fiche sans document non plus', r.copie.interventions[2] === b.interventions[2], true); }

console.log('\n── 713 · ce qui ne doit rien changer ──');
{ const b = { interventions: [{ id: 'x', docs: [{ nom: 'n.pdf', data: 'ABC', ts: 1 }] }] };
  const r = ctx.syncSortirPieces(b);
  v('aucune pièce déposée → rien ne sort, et c\'est le MÊME objet', [r.sorties, r.copie === b], [0, true]); }
{ const r = ctx.syncSortirPieces({ interventions: [{ id: 'x', docs: [{ nom: 'n', ts: 1, pid: 'c'.repeat(64) }] }] });
  v('un document déjà vidé ne compte pas une seconde fois', r.sorties, 0); }
{ v('une base vide ne lève pas', ctx.syncSortirPieces({}).sorties, 0);
  v('null non plus', ctx.syncSortirPieces(null).sorties, 0); }
{ const b = { interventions: [{ id: 'x', docs: 'pas-un-tableau' }, null, 'texte'] };
  v('des données mal formées ne lèvent pas', ctx.syncSortirPieces(b).sorties, 0); }

console.log('\n── 713 · le geste est fait AVANT la mesure, sur les DEUX chemins ──');
/* ⛔ APRÈS la mesure, il n'aurait aucun effet dans le cas NORMAL : `syncAllegerNuage` rend tôt
   quand la base tient dans le budget, et `syncAlleger` aussi. Placé après, le gain de l'étape 0
   ne serait jamais obtenu — et rien ne le signalerait, la synchro marcherait comme avant. */
{ const nuage = APP.slice(APP.indexOf('async function syncAllegerNuage(base){'), APP.indexOf('function syncRegreffer('));
  v('⛔ syncAllegerNuage le fait', nuage.indexOf('syncSortirPieces(base)') > 0, true);
  v('⛔ … AVANT sa première mesure', nuage.indexOf('syncSortirPieces(base)') < nuage.indexOf('m0=await mesurer(base)'), true);
  const alleger = APP.slice(APP.indexOf('function syncAlleger(base, budget){'), APP.indexOf('const colls=Object.keys(base)'));
  v('⛔ syncAlleger le fait aussi (chemin sans compression)', alleger.indexOf('syncSortirPieces(base)') > 0, true);
  v('⛔ … AVANT sa mesure', alleger.indexOf('syncSortirPieces(base)') < alleger.indexOf('t=taille(JSON.stringify(base))'), true); }

console.log('\n── 713 · la regreffe ramène le clair sur l\'appareil qui l\'a ──');
/* Sur le terrain, c'est la différence entre voir le document tout de suite et attendre un
   réseau qu'on n'a pas. */
{ const reg = APP.slice(APP.indexOf('function syncRegreffer('), APP.indexOf('function syncPush('));
  v('⛔ elle regreffe pour « sur le serveur » AUTANT que pour « hors nuage »',
    /d\.horsNuage\|\|d\.surServeur/.test(reg), true); }

console.log('\n── 713 · les trois gestes de l\'écran ──');
{ const add = APP.slice(APP.indexOf('function intDocAdd('), APP.indexOf('function pieceMotifTexte('));
  /* ⛔ LE CLAIR EST ÉCRIT D'ABORD, L'IDENTIFIANT S'AJOUTE APRÈS. Un dépôt peut échouer pour six
     raisons dont cinq sont temporaires ; retenir le document en attendant la confirmation, c'est
     le perdre parce que le technicien était dans une cave. */
  v('⛔ le document est enregistré AVANT d\'être déposé', add.indexOf('i.docs.push(d)') < add.indexOf('await pieceDeposer'), true);
  v('⛔ … et save() est appelé avant le dépôt', add.indexOf('save()') < add.indexOf('await pieceDeposer'), true);
  v('l\'identifiant s\'ajoute au retour', /d\.pid=dep\.id/.test(add), true);
  /* ⛔ Un échec MUET ferait croire au technicien que son collègue a reçu le document. */
  v('⛔ un échec est DIT, avec son motif', /toast\(pieceMotifTexte\(dep\.motif\)/.test(add), true); }
{ const mot = APP.slice(APP.indexOf('function pieceMotifTexte('), APP.indexOf('async function intDocOpen('));
  ['reseau', 'plein', 'trop-nombreuses', 'plein-global', 'disque', 'trop-gros', 'quota', 'ferme', 'cle', 'repli', 'sans-espace'].forEach(m => {
    v('le motif « ' + m + ' » a sa phrase', mot.indexOf("'" + m + "'") > 0, true); });
  v('… et un défaut pour ce qu\'on n\'a pas su nommer', /default: return/.test(mot), true); }
{ const open = APP.slice(APP.indexOf('async function intDocOpen('), APP.indexOf('/* ⛔ SUPPRIMER RETIRE AUSSI'));
  v('l\'ouverture va chercher la pièce sur le serveur', /await pieceLire\(d\.pid\)/.test(open), true);
  /* ⛔ TROIS ÉTATS. « Supprimé » et « pas de réseau » ne sont pas la même phrase, et les
     confondre, c'est la dette du 11 septembre. */
  v('⛔ « absente » dit SUPPRIMÉ', /r\.absente.*supprim/.test(open), true);
  v('⛔ et tout le reste dit « pas pu récupérer », jamais « supprimé »', /Impossible de r[ée]cup[ée]rer/.test(open), true); }
{ const del = APP.slice(APP.indexOf('function intDocDel('), APP.indexOf('function intComAdd('));
  v('⛔ supprimer retire aussi la pièce du serveur', /pieceSupprimer\(pid\)/.test(del), true);
  /* L'utilisateur a demandé à supprimer : le local part quoi qu'il arrive. */
  v('⛔ … mais la suppression locale ne dépend PAS du serveur',
    del.indexOf('i.docs.splice(ix,1)') < del.indexOf('pieceSupprimer(pid)'), true); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
