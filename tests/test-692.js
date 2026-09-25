/* ══ PHASE 2 : ON COMPRESSE, ET ON ARRÊTE D'AMPUTER CE QU'ON N'A PLUS BESOIN D'AMPUTER ═════

   Le 15 septembre au matin, la synchro d'ELAN était à l'arrêt pour 1,1 Ko : 621,1 Ko de base
   pour 620,0 Ko permis. La v675 a débloqué l'entreprise en raccourcissant les journaux de la
   copie poussée — un correctif juste, mais qui coûte : l'historique d'activité de l'équipe ne
   monte plus en entier dans le nuage.

   Cette version rend cet historique. `NUAGE_BUDGET` pesait du TEXTE CLAIR ; ce que Firestore
   refuse, c'est un DOCUMENT de plus d'1 Mio, et le document est maintenant du gzip chiffré en
   base64. On mesure donc le document réel avant de retirer quoi que ce soit.

   ⛔ ET ON LE MESURE, ON NE LE DÉDUIT PAS D'UN TAUX. Ces données compressent à −89 % (mesuré
   au navigateur sur la base réelle d'ELAN, scratchpad/preuve-gzip.js), mais une base pleine de
   photos en base64 compresserait à peine : un taux supposé se retournerait exactement le jour
   où ça compte. Les deux cas sont éprouvés ici, avec la VRAIE fonction extraite du fichier
   livré — la recopier ne prouverait rien.

   ⛔ ET LE DANGER QUI NE SE VOIT PAS : un navigateur sans `DecompressionStream` déchiffre
   parfaitement le document et rend quand même `null`, comme une clé étrangère. Sans garde il
   pousserait sa propre base par-dessus celle de l'équipe. Sa cause est certaine (`d.z` posé ET
   la fonction manquante), donc on la nomme et on lui coupe l'écriture. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

console.log('\n── 692 · la base entière monte au nuage, compressée ──');

/* ── Les vraies fonctions, extraites par comptage d'accolades ──
   ⛔ Jamais de fenêtre de N caractères : trois tests s'y sont cassés ce mois-ci, la fenêtre
   avalait la fin de la fonction ou s'arrêtait avant. On compte les accolades. */
function corps(nom, entete) {
  const d = APP.indexOf(entete);
  if (d < 0) return null;
  let n = 0;
  for (let i = APP.indexOf('{', d); i < APP.length; i++) {
    if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) return APP.slice(d, i + 1); } }
  return null;
}
const SRC = {
  doc: corps('nuageDocOctets', 'function nuageDocOctets(n){'),
  possible: corps('gzipPossible', 'function gzipPossible(){'),
  gzipper: corps('gzipper', 'async function gzipper(txt){'),
  /* ⛔ Depuis le point 4 de l'étape 0, les deux allègements commencent par sortir les pièces
     déjà déposées sur le VPS. Sans cette fonction, le module assemblé ici plante. */
  sortir: corps('syncSortirPieces', 'function syncSortirPieces(base){'),
  /* v749 : la liste des journaux coupés, lue par syncAlleger (la même que la réception écarte). */
  journaux: corps('syncJournaux', 'function syncJournaux(){'),
  alleger: corps('syncAlleger', 'function syncAlleger(base, budget){'),
  nuage: corps('syncAllegerNuage', 'async function syncAllegerNuage(base){'),
};
v('les sept fonctions sont trouvées dans app.html', Object.keys(SRC).filter(k => !SRC[k]), []);

const ENC_MAX = 780 * 1024, BUDGET = 620 * 1024;
v('le budget du document est bien celui du fichier livré', /const NUAGE_ENC_MAX=780\*1024;/.test(APP), true);
v('… et l\'ancien budget de texte clair n\'a pas bougé', /const NUAGE_BUDGET=620\*1024;/.test(APP), true);

const mod = new Function('NUAGE_BUDGET', 'NUAGE_ENC_MAX', 'TextEncoder', 'CompressionStream', 'Blob', 'Response', 'Uint8Array',
  SRC.doc + '\n' + SRC.possible + '\n' + SRC.gzipper + '\n' + SRC.sortir + '\n' + SRC.journaux + '\n' + SRC.alleger + '\n' + SRC.nuage +
  '\n; return {nuageDocOctets:nuageDocOctets, gzipPossible:gzipPossible, gzipper:gzipper, syncAlleger:syncAlleger, syncAllegerNuage:syncAllegerNuage};'
)(BUDGET, ENC_MAX, TextEncoder, CompressionStream, Blob, Response, Uint8Array);

v('ce banc sait compresser (sinon il ne prouve rien)', mod.gzipPossible(), true);

/* ── 1. La taille du document est calculée, pas approchée ──
   AES-GCM ajoute 16 octets de sceau, base64 rend 4 caractères pour 3 octets. On le vérifie
   contre un vrai chiffrement, pas contre la formule qu'on vient d'écrire. */
(async () => {
  const cle = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  for (const n of [1, 2, 3, 1000, 65537]) {
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: new Uint8Array(12) }, cle, new Uint8Array(n));
    const b64 = Buffer.from(ct).toString('base64').length;
    v('nuageDocOctets(' + n + ') = la vraie longueur du base64 chiffré', mod.nuageDocOctets(n), b64);
  }

  /* ── 2. Une base réaliste : le poids est du CONTENU, comme chez ELAN ──
     Du texte français répétitif, pas des 'x' — les 'x' compresseraient à rien et le banc
     serait flatteur. Un tirage déterministe : un test qui change de verdict d'un jour à
     l'autre ne vaut rien. */
  let graine = 20260915;
  const tir = (n) => { graine = (graine * 1103515245 + 12345) % 2147483648; return graine % n; };
  const MOTS = ('intervention traitement appât poste contrôle cuisine réserve local technique rongeur '
    + 'blatte souris rat mouche piège gel pulvérisation nettoyage désinfection restaurant boulangerie '
    + 'entrepôt cave sous-sol vestiaire chambre froide plonge zone livraison quai réfectoire').split(' ');
  const phrase = (n) => Array.from({ length: n }, () => MOTS[tir(MOTS.length)]).join(' ');
  const lignes = (prefixe, nb, mots) => Array.from({ length: nb }, (_, i) =>
    ({ id: prefixe + i, ts: 1757000000000 + i * 60000, nom: phrase(3), texte: phrase(mots), qte: tir(50) }));

  const base = {
    boxes: lignes('b', 40, 260),        // les plus lourdes chez ELAN
    mouvements: lignes('m', 900, 26),   // registre biocide : on n'y touche JAMAIS
    produits: lignes('p', 220, 18),
    interventions: lignes('i', 300, 30),
    journal: lignes('j', 500, 22),      // plafonné à 500, c'est ce que la v675 raccourcissait
    users: lignes('u', 12, 6),
  };
  const clair = new TextEncoder().encode(JSON.stringify(base)).length;
  console.log('    · base d\'essai : ' + Math.round(clair / 1024) + ' Ko de texte clair');
  v('⚠️ le banc dépasse VRAIMENT l\'ancien budget (sinon il vérifie qu\'il ne se passe rien)', clair > BUDGET, true);

  /* Ce que l'ancien chemin faisait — et fait toujours quand la compression manque. */
  const avant = mod.syncAlleger(base);
  v('SANS compression, l\'ancien chemin raccourcit bien le journal', avant.journalCoupe > 0, true);

  /* Ce que fait la v690. */
  const apres = await mod.syncAllegerNuage(base);
  console.log('    · document compressé : ' + Math.round(apres.doc / 1024) + ' Ko pour ' + (ENC_MAX / 1024) + ' Ko permis'
    + ' (' + Math.round(100 - apres.doc * 100 / clair) + ' % de moins que le clair)');
  v('⛔ AVEC compression, la base part ENTIÈRE — pas un objet recopié', apres.copie === base, true);
  v('… aucune pièce retirée', apres.retirees, 0);
  v('⛔ … et AUCUNE ligne de journal coupée : l\'historique remonte au nuage', apres.journalCoupe, 0);
  v('… l\'écriture n\'est pas déclarée impossible', apres.impossible, false);
  v('… le document tient dans le budget', apres.doc <= ENC_MAX, true);
  v('… et `taille` dit toujours le clair, pour les messages', apres.taille, clair);
  v('⛔ les mouvements sont intacts (registre biocide, dossier sanitaire)', apres.copie.mouvements.length, base.mouvements.length);
  v('⛔ les box aussi', apres.copie.boxes.length, base.boxes.length);

  /* ── 3. Le cas qui se retournerait si on supposait un taux ──
     Des pièces jointes : de l'aléatoire en base64 ne compresse quasiment pas. La base doit
     alors être allégée comme avant, et le résultat RE-MESURÉ. */
  const bruit = (n) => require('crypto').randomBytes(n).toString('base64');
  const lourde = {
    interventions: lignes('i', 60, 30).map((r, i) => i < 5 ? Object.assign({}, r, { docs: [{ nom: 'photo' + i, data: bruit(300 * 1024) }] }) : r),
    journal: lignes('j', 200, 22),
  };
  const clairL = new TextEncoder().encode(JSON.stringify(lourde)).length;
  console.log('    · base à pièces jointes : ' + Math.round(clairL / 1024) + ' Ko, dont 5 pièces incompressibles');
  const dur = await mod.syncAllegerNuage(lourde);
  console.log('    · après allègement : document ' + Math.round(dur.doc / 1024) + ' Ko, ' + dur.retirees + ' pièce(s) retirée(s)');
  v('⛔ une base incompressible est bien allégée (le taux n\'est pas supposé)', dur.retirees > 0, true);
  v('… et la base LOCALE n\'est pas touchée', lourde.interventions[0].docs[0].data.length, 300 * 1024 * 4 / 3 | 0);
  v('… le document résultant tient dans le budget', dur.doc <= ENC_MAX, true);
  v('… et l\'écriture n\'est plus déclarée impossible', dur.impossible, false);

  /* ── 4. Celui qui ne sait pas lire n'écrit plus ── */
  v('⛔ la cause est certaine, pas devinée (drapeau posé ET fonction absente)',
    /if\(p===null&&d\.z&&!gzipPossible\(\)\) nuageIllisible\(\);/.test(APP), true);
  v('⛔ et syncPush s\'arrête là, avant toute écriture', /if\(_nuageIllisible\) return;/.test(APP), true);
  v('… une seule fois par session', /function nuageIllisible\(\)\{ if\(_nuageIllisible\) return; _nuageIllisible=true;/.test(APP), true);
  v('… et ça se DIT, à l\'écran et au journal de l\'entreprise',
    /Ce navigateur est trop ancien pour lire les données de l\\'équipe/.test(APP) && /logEvent\('Synchro arrêtée'/.test(APP), true);

  /* ── 5. Le chemin d'appel ── */
  v('⛔ la synchro passe par la mesure, pas par l\'ancien chemin', /const alle=await syncAllegerNuage\(db\);/.test(APP), true);
  v('… et syncAlleger reste synchrone, éprouvable seule', /^function syncAlleger\(base, budget\)\{/m.test(APP), true);
  v('le refus se dit dans l\'unité qui le décide', /alle\.doc\?\('document '\+Math\.round\(alle\.doc\/1024\)\+' Ko compressé pour '/.test(APP), true);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
