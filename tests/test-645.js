/* ⛔ CE QUE CE FICHIER GARDE — la copie poussée vers Firestore TIENT dans le document (1 Mo),
   et ce qu'on en retire ne se perd nulle part.

   Mesuré chez ELAN le 11 septembre 2026, sur toute l'équipe à la fois : Firestore LIT la base
   mais REFUSE chaque écriture (400 sur le canal Write, « Write stream exhausted maximum allowed
   queued writes ») → aucun accusé en 15 s → « Connexion requise » → rechargement → recommence.
   Toute la base part dans UN document, pièces jointes (≤ 1,5 Mo) et photos en base64 comprises,
   et rien ne mesurait rien avant d'écrire.

   Deux faces, éprouvées ici sur les VRAIES fonctions extraites d'app.html :
   · syncAlleger(base, budget) — au-dessus du budget, la copie poussée perd ses pièces et photos
     les plus lourdes, marquées ; la base d'origine n'est PAS touchée ; sous le budget, la copie
     EST la base (même objet) ; sans aucune pièce à retirer, elle dit « impossible ».
   · syncRegreffer(local, fusion) — un enregistrement arrivé allégé reprend les pièces qu'on a
     en local ; un enregistrement qui a ses pièces n'est pas touché. */

const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
function extraire(nom) {
  const i = APP.indexOf('function ' + nom + '(');
  if (i < 0) throw new Error('fonction introuvable : ' + nom);
  let j = APP.indexOf('{', i), p = 0;
  for (let k = j; k < APP.length; k++) { const c = APP[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) { j = k; break; } } }
  return APP.slice(i, j + 1);
}
/* ⛔ `syncAlleger` APPELLE `syncSortirPieces` DEPUIS LE POINT 4 de l'étape 0 : une pièce
   déjà déposée sur le VPS n'a plus à voyager dans le document de l'équipe. Sans cette ligne,
   ce banc PLANTE — et c'est ce qu'il a fait, immédiatement, ce qui est le comportement
   voulu : un banc qui exécute la vraie fonction doit tomber quand elle change de dépendances,
   pas continuer à certifier une version qu'il n'exécute plus. */
/* ⛔ `PH_MARQUE` EST UNE DÉPENDANCE DE CES TROIS FONCTIONS, ET ELLE SE PREND DANS LE FICHIER.
   Depuis que `syncRegreffer` apparie les photos par leur identifiant, elle en a besoin comme
   les deux autres. Ce banc est tombé au moment exact où la dépendance est apparue — c'est le
   comportement voulu, écrit juste au-dessus. ⚠️ On l'EXTRAIT, on ne la recopie pas : une copie
   figée dirait « ça marche » sur une expression que le fichier n'utilise plus.
   ⚠️ Et le silence est le vrai danger ici : `syncRegreffer` est enveloppée d'un `try/catch` qui
   rend 0. Une constante manquante ne plante donc pas — elle fait rendre 0 à TOUTE la fonction,
   documents compris, sans un mot. C'est exactement ce qu'on a vu : trois contrôles rouges dont
   DEUX sur les documents, qu'on n'avait pas touchés. `tests/test-714.js` exige donc aussi que
   la constante soit déclarée AVANT la fonction dans le fichier. */
/* ⚠️ `const` → `var`, ET C'EST INDISPENSABLE : un `const` déclaré dans un `eval` ne sort PAS
   de la portée de l'eval, alors qu'un `var` la rejoint. Sans cette substitution, la constante
   restait invisible pour les fonctions évaluées juste après, et les trois contrôles restaient
   rouges — en accusant les documents, qu'on n'avait pas touchés. */
// eslint-disable-next-line no-eval
eval(((APP.match(/const PH_MARQUE=[^\n]+/) || [''])[0]).replace('const ', 'var '));
// eslint-disable-next-line no-eval
eval(extraire('syncSortirPieces'));
/* v749 : syncAlleger lit la liste des journaux qu'elle coupe dans syncJournaux (la même que la
   réception écarte de sa décision de renvoi) — sans elle, ce bac à sable meurt au premier appel. */
// eslint-disable-next-line no-eval
eval(extraire('syncJournaux'));
// eslint-disable-next-line no-eval
eval(extraire('syncAlleger'));
// eslint-disable-next-line no-eval
eval(extraire('syncRegreffer'));

const gros = n => 'data:application/pdf;base64,' + 'A'.repeat(n);
const photo = n => 'data:image/jpeg;base64,' + 'P'.repeat(n);

console.log('La copie poussée tient dans le budget, la base locale garde tout');
{
  const base = {
    clients: [{ id: 'c1', nom: 'Mairie' }],
    interventions: [
      { id: 'i1', titre: 'Dératisation', docs: [{ nom: 'devis.pdf', type: 'application/pdf', ts: 1, data: gros(300000) }, { nom: 'plan.pdf', type: 'application/pdf', ts: 2, data: gros(50000) }], photos: [photo(120000), photo(90000)] },
      { id: 'i2', titre: 'Désinsectisation', photos: [photo(200000)] },
      { id: 'i3', titre: 'Sans pièce' }
    ]
  };
  const avant = JSON.stringify(base);
  const r = syncAlleger(base, 250 * 1024);   // budget 250 Kio : la base fait ~760 Ko, il faut en retirer
  v('un allègement a eu lieu', r.retirees > 0, true);
  v('la copie poussée est sous le budget', r.taille <= 250 * 1024, true);
  v('…et n\'est pas déclarée impossible', r.impossible, false);
  v('la base LOCALE est intacte au bit près', JSON.stringify(base), avant);
  v('la copie est un autre objet que la base', r.copie === base, false);
  const c1 = r.copie.interventions[0], c2 = r.copie.interventions[1], c3 = r.copie.interventions[2];
  v('le plus lourd est parti en premier : le devis de 300 Ko est allégé et marqué', [c1.docs[0].data, c1.docs[0].horsNuage], ['', true]);
  v('…son nom, son type et sa date restent (l\'entrée est toujours listée)', [c1.docs[0].nom, c1.docs[0].type, c1.docs[0].ts], ['devis.pdf', 'application/pdf', 1]);
  v('la photo de 200 Ko est partie, comptée sur l\'enregistrement', [c2.photos.length, c2.photosHorsNuage], [0, 1]);
  v('l\'enregistrement sans pièce est le MÊME objet (pas cloné pour rien)', c3 === base.interventions[2], true);
  v('les autres collections sont partagées telles quelles', r.copie.clients === base.clients, true);
}

console.log('\nSous le budget, rien ne bouge');
{
  const base = { interventions: [{ id: 'i1', photos: [photo(1000)], docs: [{ nom: 'a', ts: 1, data: gros(1000) }] }] };
  const r = syncAlleger(base, 250 * 1024);
  v('aucune pièce retirée', r.retirees, 0);
  v('la copie EST la base (même objet)', r.copie === base, true);
  v('pas impossible', r.impossible, false);
}

/* ⚠️ LE CONTRAT A CHANGÉ LE 15 SEPTEMBRE 2026, EXPRÈS. Une base lourde de JOURNAL n'est plus
   un cul-de-sac : la copie poussée raccourcit les journaux d'activité (voir test-690), et
   l'écriture passe. C'est ce qui a débloqué ELAN, arrêtée pour 1,1 Ko de dépassement.
   La garantie « quand on ne peut rien retirer, on le DIT et on n'écrit pas » reste entière —
   elle se vérifie désormais sur une donnée qu'on ne touche JAMAIS : les mouvements, qui
   alimentent le registre biocide et le dossier sanitaire. */
console.log('\nTrop lourde et rien à retirer : on le dit, on n\'écrit pas');
{
  const base = { mouvements: Array.from({ length: 4000 }, (_, k) => ({ id: 'm' + k, motif: 'x'.repeat(100) })), interventions: [{ id: 'i1', photos: [photo(5000)] }] };
  const r = syncAlleger(base, 100 * 1024);
  v('toutes les pièces sont retirées', r.copie.interventions[0].photos.length, 0);
  v('⛔ les mouvements ne sont JAMAIS raccourcis', r.copie.mouvements.length, 4000);
  v('…et c\'est donc quand même impossible', r.impossible, true);
}
console.log('\nTrop lourde À CAUSE DU JOURNAL : on raccourcit la copie, et ça passe');
{
  const base = { journal: Array.from({ length: 4000 }, (_, k) => ({ id: 'j' + k, ts: k, action: 'x'.repeat(100) })),
                 mouvements: Array.from({ length: 50 }, (_, k) => ({ id: 'm' + k, motif: 'y'.repeat(50) })) };
  const r = syncAlleger(base, 100 * 1024);
  v('⛔ l\'écriture n\'est plus abandonnée', r.impossible, false);
  v('des lignes de journal ont été écartées de la copie', (r.journalCoupe || 0) > 0, true);
  v('⛔ la base locale garde ses 4000 lignes', base.journal.length, 4000);
  v('⛔ et les mouvements restent intacts', r.copie.mouvements.length, 50);
}

console.log('\nLa regreffe : ce qui arrive allégé ne prend pas nos pièces');
{
  const local = { interventions: [
    { id: 'i1', _m: 1, docs: [{ nom: 'devis.pdf', ts: 1, data: gros(100) }, { nom: 'plan.pdf', ts: 2, data: gros(50) }], photos: [photo(10), photo(20)] },
    { id: 'i2', _m: 1, photos: [photo(30)] }
  ] };
  // ce qu'un collègue a poussé : i1 allégé (le plus récent, il gagne la fusion) ; i2 intact avec SA photo à lui
  const fusion = { interventions: [
    { id: 'i1', _m: 5, docs: [{ nom: 'devis.pdf', ts: 1, data: '', horsNuage: true }, { nom: 'plan.pdf', ts: 2, data: gros(50) }], photos: [], photosHorsNuage: 2 },
    { id: 'i2', _m: 5, photos: [photo(99)] },
    { id: 'i9', _m: 5, photos: [], photosHorsNuage: 1 }
  ] };
  const n = syncRegreffer(local, fusion);
  const f1 = fusion.interventions[0], f2 = fusion.interventions[1], f9 = fusion.interventions[2];
  v('la pièce allégée reprend nos données locales', f1.docs[0].data, gros(100));
  v('la pièce intacte n\'est pas touchée', f1.docs[1].data, gros(50));
  v('les photos allégées reprennent les nôtres', f1.photos.length, 2);
  v('un enregistrement qui a ses pièces garde LES SIENNES (pas les nôtres)', f2.photos, [photo(99)]);
  v('un enregistrement inconnu en local reste allégé (rien à regreffer)', f9.photos.length, 0);
  v('deux regreffes comptées (une pièce, un lot de photos)', n, 2);
  v('la fonction ne casse pas sur des bases vides', syncRegreffer(null, null), 0);
}

console.log('\nLa garde est câblée aux bons endroits');
/* ⛔ LA GARANTIE N'A PAS CHANGÉ, SON ÉCRITURE SI — v690, 15 septembre 2026. Depuis que la
   compression est allumée, `syncAllegerNuage` rend AUSSI les octets gzip qu'elle vient de peser
   pour décider, et l'envoi les reprend tels quels au lieu de recompresser (433 ms de moins par
   enregistrement sur un téléphone). Ces octets sont issus de `alle.copie` dans les deux
   branches de la fonction — jamais de `db`. Donc : ou bien on chiffre `alle.gz`, ou bien, à
   défaut, `JSON.stringify(alle.copie)`. Ce qui reste interdit, et c'est ça qu'on garde sous
   surveillance, c'est de chiffrer `db` directement. */
v('l\'envoi chiffre la COPIE allégée, pas la base',
  /const e=await syncEncrypt\(alle\.gz\?null:JSON\.stringify\(alle\.copie\), alle\.gz\);/.test(APP), true);
v('⛔ et rien ne chiffre `db` en direct', /syncEncrypt\(JSON\.stringify\(db\)\)/.test(APP), false);
/* ⛔ CE QUI COMPTE EST QUE LA BRANCHE NE CHIFFRE ET N'ÉCRIVE RIEN, pas qu'elle tienne en
   400 caractères. La fenêtre fixe était un accident : elle a cassé le jour où la branche a
   gagné un commentaire et deux traces (journal + Tour), alors que le comportement n'avait
   pas bougé d'une ligne. On isole donc la branche par ses accolades et on éprouve son
   contenu — un banc qui casse sur une longueur apprend à élargir un nombre, pas à vérifier. */
(function(){
  const d = APP.indexOf('if(alle.impossible){');
  v('la branche « trop lourde » est trouvée dans app.html', d > 0, true);
  if (d < 0) return;
  let n = 0, f = d;
  for (let i = APP.indexOf('{', d); i < APP.length; i++) {
    if (APP[i] === '{') n++; else if (APP[i] === '}') { n--; if (!n) { f = i; break; } } }
  const br = APP.slice(d, f + 1);
  v('impossible → on sort par return, sans rien écrire', /return;\s*\}$/.test(br), true);
  v('⛔ impossible → rien n\'est chiffré ni envoyé dans cette branche',
    /syncEncrypt|setDoc|updateDoc|_fbDoc/.test(br), false);
})();
/* ══ v671 · « CONTACTE TEAM OP » ET TEAM OP N'EN SAIT RIEN ════════════════════════════════
   Constaté chez ELAN le 14 septembre 2026, capture à l'appui. Quand la base dépasse le
   budget même sans pièces, l'app ABANDONNE l'écriture : la synchro de l'appareil est
   arrêtée, les box et les stocks divergent en silence d'un téléphone à l'autre. La seule
   trace était un console.error que personne n'ouvre — donc on savait que ça ne rentrait
   pas, jamais ce qui pesait, et le client n'avait rien à nous montrer.
   Deux choses à tenir : que la mesure EXISTE (parColl), et qu'elle SORTE (journal + Tour). */
console.log('\nL\'abandon d\'écriture dit ce qui pèse');
v('syncAlleger pèse chaque collection de la copie poussée',
  /const parColl=colls\.map\(c=>\{ let n2=0;/.test(APP), true);
v('… en gardant les six plus lourdes, avec leur nombre de lignes',
  /\.sort\(\(a,b\)=>b\.n-a\.n\)\.slice\(0,6\)/.test(APP) && /x\.c\+' '\+Math\.round\(x\.n\/1024\)\+' Ko\/'\+x\.l\+' l\.'/.test(APP), true);
v('… et les sorties de la fonction la portent toutes',
  (APP.match(/parColl/g) || []).length >= 5, true);
/* ⛔ Le client doit pouvoir LIRE la panne dans son application, et la Tour doit la RECEVOIR.
   L'un sans l'autre laisse quelqu'un dans le noir. */
v('⛔ la panne s\'écrit dans le Journal de l\'entreprise',
  /logEvent\('Synchro impossible'/.test(APP), true);
v('⛔ et remonte à la Tour par le chemin déjà en place',
  /syncDiagnostic\('impossible : '\+det\)/.test(APP), true);
/* Une fois par session : répéter à chaque tentative gonflerait le journal — plafonné à 500 —
   et ferait tourner la base qu'on essaie justement d'alléger. */
v('⛔ une seule fois par session, pas à chaque tentative',
  /if\(!_lourdDit\)\{ _lourdDit=true;/.test(APP) && /let _lourdDit=false;/.test(APP), true);
/* ⚠️ Ces lignes partent au journal de l'entreprise ET à la Tour : des noms de collection et
   des octets, jamais un nom de client, une adresse ou un contenu. */
v('⛔ la trace ne porte que des noms de collection et des tailles',
  /parColl\.join\(', '\)/.test(APP), true);

v('regreffe à la réception ET avant l\'écriture', (APP.match(/syncRegreffer\((db|_localAvant),(remote|db)\)/g) || []).length, 2);
/* ⚠️ RÉEXPRIMÉ, PAS AFFAIBLI. Cette ligne épinglait la FORME exacte de l'ancienne condition
   (`if(!d.data){ toast(…`). Le point 4 de l'étape 0 l'a changée — une pièce sans `data` peut
   désormais être sur le VPS — et le contrôle rougissait pour une réécriture juste. Épingler une
   forme, c'est se condamner à rouvrir le banc à chaque amélioration, donc à apprendre à passer
   outre. On demande donc ce qui compte vraiment, et il y en a PLUS qu'avant : les trois issues
   doivent être dites, et distinctes. */
{ const open = APP.slice(APP.indexOf('async function intDocOpen('), APP.indexOf('function intDocDel('));
  v('ouvrir une pièce restée locale le dit au lieu de planter', /Cette pièce est restée sur l/.test(open), true);
  v('⛔ … une pièce supprimée du serveur le dit AUTREMENT', /supprimé du serveur/.test(open), true);
  v('⛔ … et un échec de réseau ne dit NI l\'un NI l\'autre', /Impossible de récupérer/.test(open), true); }


/* ── v646 : l'allègement couvre TOUTES les collections, et une écriture qui ne passe pas
   ne bloque plus l'application quand le réseau, lui, répond. ───────────────────────── */
console.log('\nL\'allègement ne se limite plus aux interventions');
{
  const sig = 'data:image/png;base64,' + 'S'.repeat(150000);
  const base = {
    interventions: [{ id: 'i1', photos: ['data:image/jpeg;base64,' + 'P'.repeat(80000)] }],
    telecollectes: [{ id: 't1', photos: ['data:image/jpeg;base64,' + 'T'.repeat(200000)] }],
    registres: [{ id: 'r1', signature: sig }],
    societes: [{ id: 's1', logo: 'data:image/png;base64,' + 'L'.repeat(120000) }]
  };
  const avant = JSON.stringify(base);
  const r = syncAlleger(base, 100 * 1024);
  v('la base locale reste intacte', JSON.stringify(base), avant);
  v('la photo de télécollecte est allégée', r.copie.telecollectes[0].photos.length, 0);
  v('la signature du registre est allégée et marquée', [r.copie.registres[0].signature, r.copie.registres[0].champsHorsNuage], ['', ['signature']]);
  v('le logo de la société est allégé', r.copie.societes[0].logo, '');
  v('la copie tient dans le budget', r.taille <= 100 * 1024, true);
  v('on sait ce qui pesait (diagnostic)', r.gros.length > 0, true);
}

console.log('\nLa regreffe couvre aussi ces champs et ces collections');
{
  const local = { registres: [{ id: 'r1', _m: 1, signature: 'VRAIE-SIGNATURE' }], telecollectes: [{ id: 't1', _m: 1, photos: ['A', 'B'] }] };
  const fusion = { registres: [{ id: 'r1', _m: 9, signature: '', champsHorsNuage: ['signature'] }], telecollectes: [{ id: 't1', _m: 9, photos: [], photosHorsNuage: 2 }] };
  const n = syncRegreffer(local, fusion);
  v('la signature allégée reprend la nôtre', fusion.registres[0].signature, 'VRAIE-SIGNATURE');
  v('les photos de télécollecte reviennent', fusion.telecollectes[0].photos, ['A', 'B']);
  v('deux regreffes comptées', n, 2);
}

console.log('\nUne écriture non acquittée ne bloque plus si le réseau répond');
v('on mesure le réseau avant de décider', /const r2=await fetch\(PUSH_API\+'\/health',\{method:'HEAD'/.test(APP), true);
/* ⛔ RÉ-EXPRIMÉ SUR L'INTENTION LE 17 SEPTEMBRE 2026 — et RENFORCÉ. Il épinglait l'adjacence
   exacte de deux instructions ; une ligne insérée entre elles le faisait rougir alors que le
   comportement était intact. On vérifie maintenant ce qui compte vraiment : dans la branche
   « pas de réseau », le travail est marqué en attente ET l'écran hors ligne est appelé avec
   son motif — et la fonction sort sans écrire. Trois faits au lieu d'une chaîne de caractères. */
{
  const iB = APP.indexOf('if(!reseau){');
  const br = iB < 0 ? '' : APP.slice(iB, iB + 400);
  v('réseau absent → la branche existe', iB > 0, true);
  v('réseau absent → le travail est marqué en attente', /_horsLignePush=true/.test(br), true);
  v('réseau absent → écran hors ligne, avec son motif', /horsLigneDebut\('écriture sans réponse'\)/.test(br), true);
  /* v751 : les drapeaux se posent désormais APRÈS horsLigneDebut() (qui les remet à zéro) — le `return` reste
     dans la même branche, quelques instructions plus loin. */
  v('réseau absent → et on sort sans écrire', (() => { const l = br.split('\n')[0].trim(); return /horsLigneDebut\('écriture sans réponse'\)/.test(l) && /return; \}$/.test(l); })(), true);
}
v('réseau présent → on prévient, on ne bloque pas', /Tes modifications ne partent pas encore vers l/.test(APP), true);


/* ── v647 : la file d'écriture saturée se reprend UNE fois, jamais deux ───────────── */
console.log('\nFile d\'écriture saturée : une seule reprise, jamais de boucle');
v('le drapeau de reprise unique existe', /let _fbFileSaturee=false;/.test(APP), true);
v('on réagit à resource-exhausted', /er\.code==='resource-exhausted'/.test(APP), true);
v('…une seule fois (le drapeau garde le rechargement)', /if\(!_fbFileSaturee\)\{ _fbFileSaturee=true;/.test(APP), true);
v('…et la deuxième fois on le DIT au lieu de recharger', /La synchronisation reste bloquée/.test(APP), true);


/* ── v648 : le dépôt d'annuaire envoie sa version, sinon le serveur le refuse en 426 ── */
console.log('\nL\'annuaire de connexion annonce sa version');
v('le dépôt /api/espaces/comptes envoie `ver`',
  /body:JSON\.stringify\(\{t:t,kh:kh,comptes:envoi,ver:String\(APP_VERSION\|\|''\)\}\)/.test(APP), true);
v('…et c\'est bien la route de l\'annuaire', /\/api\/espaces\/comptes/.test(APP), true);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
