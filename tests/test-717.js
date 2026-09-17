/* ══ test-717 — UNE PASTILLE DIT CE QU'ELLE COMPTE, PAS SEULEMENT COMBIEN ═══════════════════
 *
 * Point 7, quatrième volet. Justin, 17 septembre 2026, capture à l'appui : la Tour affichait
 * « Espace par défaut — TEAM OP · 4 pers. / 7 j » et « 🔑 1 » sur des espaces qu'il venait de
 * vider. Il a lu « il reste 4 personnes » et « il reste 1 clé ». La Tour ne mentait pas — elle
 * répondait à une autre question : 4 personnes se sont CONNECTÉES sur une fenêtre de 7 jours
 * (donc avant sa suppression), et 1 essai de connexion a été REFUSÉ sur 24 h — c'est-à-dire,
 * très probablement, la preuve que sa suppression marchait.
 *
 * ⛔ LE DÉFAUT N'ÉTAIT PAS DANS LE COMPTAGE, IL ÉTAIT DANS LES MOTS. Et `tour.html` portait
 * déjà la règle, écrite pour « ⏸ » et « 🎁 » : « la couleur ne parle jamais seule, toute
 * pastille porte un mot ou un chiffre ». « 🔑 1 » portait un chiffre et l'a quand même mise en
 * erreur — parce qu'un chiffre sans unité ne dit pas ce qu'il compte. Le sens ne tenait qu'à
 * un `title`, qui N'EXISTE PAS sur un téléphone : il n'y a pas de survol au doigt.
 *
 * Ce banc extrait `ligneCnx` du fichier RÉEL et l'EXÉCUTE sur le jeu de données exact de la
 * capture de Justin. Il ne relit pas une intention, il lit ce qui s'affiche.
 */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');

let ok = 0, ko = 0;
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };
const contient = (nom, h, t) => { if (String(h).indexOf(t) !== -1) ok++; else { ko++; console.log('  ✗ ' + nom + '\n      cherché : ' + JSON.stringify(t) + '\n      dans    : ' + JSON.stringify(String(h).slice(0, 300))); } };
const absent = (nom, h, t) => { if (String(h).indexOf(t) === -1) ok++; else { ko++; console.log('  ✗ ' + nom + ' — ' + JSON.stringify(t) + ' présent dans ' + JSON.stringify(String(h).slice(0, 300))); } };

/* ── extraction de la vraie fonction, par comptage d'accolades ─────────────────────────────── */
function extraire(debut) {
  const i = SRC.indexOf(debut);
  if (i < 0) throw new Error('introuvable dans tour.html : ' + debut);
  let p = 0, j = SRC.indexOf('{', i);
  for (let k = j; k < SRC.length; k++) {
    if (SRC[k] === '{') p++;
    else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(i, k + 1); }
  }
  throw new Error('accolades non refermées : ' + debut);
}

const CORPS = extraire('var ligneCnx=function(x,nature){');
/* Les dépendances sont remplacées par des bouchons NEUTRES : on teste les mots produits par
   ligneCnx, pas le reste de la Tour. Un bouchon qui embellirait fausserait la mesure. */
const fab = new Function('esc,jsq,sigle,nomEspace,nomTechnique,cnxDepuis,natureDe,verNum,CNX', `
  ${CORPS}
  return ligneCnx;`);
const ligneCnx = fab(
  (s) => String(s == null ? '' : s), (s) => String(s), (s) => String(s).slice(0, 2).toUpperCase(),
  (nom, t) => nom || t, (t) => 'Espace par défaut — TEAM OP', (ts) => 'il y a 5 jours',
  () => 'technique', (v) => parseInt(v, 10) || 0, { sel: null });

console.log('1. La capture de Justin, rejouée sur la vraie fonction');

/* Exactement ce qu'il voyait : un espace technique, 4 personnes connectées dans la fenêtre de
   7 jours (donc AVANT sa suppression d'il y a deux jours), et 1 essai refusé sur 24 h. */
const CAPTURE = { t: 'default', nom: '', slug: '', technique: true,
  resume: { derniere: Date.now() - 5 * 86400000, utilisateurs7: 4, echecs24: 1, versions: {} } };
const h = ligneCnx(CAPTURE, 'active');

contient('« 4 pers. » dit maintenant qu\'elles se sont CONNECTÉES', h, '4 pers. connectées');
contient('… et sur quelle fenêtre', h, '4 pers. connectées / 7 j');
absent('l\'ancien libellé muet a disparu', h, '4 pers. / 7 j');
contient('« 🔑 1 » dit maintenant ce qu\'il compte', h, '🔑 1 refus');
absent('la pastille ne se réduit plus au pictogramme et au nombre', h, '>🔑 1</span>');

/* ⛔ Le `title` reste utile à la souris, mais il ne doit PLUS porter le sens à lui seul :
   la preuve, c'est que le texte visible suffit sans lui. */
const visible = h.replace(/<[^>]*>/g, ' ');
contient('le sens est dans le TEXTE VISIBLE, pas seulement dans le title', visible, '4 pers. connectées / 7 j');
contient('le motif du refus est visible sans survol', visible, '1 refus');

console.log('2. Les accords, parce qu\'un « 1 échecs » discrédite tout l\'écran');
const un = ligneCnx({ t: 'a', nom: 'X', slug: 'x', technique: true,
  resume: { derniere: Date.now() - 86400000, utilisateurs7: 1, echecs24: 1, versions: {} } }, 'active');
contient('une seule personne : singulier', un, '1 pers. connectée / 7 j');
absent('… et pas de « s » parasite', un, '1 pers. connectées');
contient('un seul refus', un, '🔑 1 refus');

const plus = ligneCnx({ t: 'b', nom: 'Y', slug: 'y', technique: true,
  resume: { derniere: Date.now() - 86400000, utilisateurs7: 3, echecs24: 2, versions: {} } }, 'active');
contient('trois personnes : pluriel', plus, '3 pers. connectées / 7 j');
contient('deux refus — « refus » est invariable', plus, '🔑 2 refus');

console.log('3. Un fait absent DISPARAÎT — on n\'écrit pas « 0 échec »');
const zero = ligneCnx({ t: 'c', nom: 'Z', slug: 'z', technique: true,
  resume: { derniere: Date.now() - 86400000, utilisateurs7: 0, echecs24: 0, versions: {} } }, 'active');
absent('aucune pastille de refus quand il n\'y en a pas', zero, 'refus');
absent('aucun « 0 pers. »', zero, '0 pers.');
vrai('la ligne existe quand même', zero.indexOf('<button') === 0);

console.log('4. La ligne d\'une CLIENTE dit la même chose, dans les mêmes mots');
const fab2 = new Function('esc,jsq,sigle,nomEspace,nomTechnique,cnxDepuis,natureDe,verNum,CNX', `
  ${CORPS}
  return ligneCnx;`);
const ligneCli = fab2(
  (s) => String(s == null ? '' : s), (s) => String(s), (s) => String(s).slice(0, 2).toUpperCase(),
  (nom, t) => nom || t, (t) => t, (ts) => 'il y a 2 h',
  () => 'cliente', (v) => parseInt(v, 10) || 0, { sel: null });
const cli = ligneCli({ t: 'elan', nom: 'ELAN', slug: 'elan', formule: 'Pro',
  resume: { derniere: Date.now() - 7200000, utilisateurs7: 3, appareils7: 2, connexions7: 7, echecs24: 2, versions: { '695': 1 } } }, 'active');
contient('une cliente aussi dit « pers. connectées »', cli, '3 pers. connectées');
absent('l\'ancien « 3 personnes » nu a disparu', cli, '3 personnes');
contient('les connexions gardent leur fenêtre', cli, '7 connexions / 7 j');
contient('la pastille de refus est la même des deux côtés', cli, '🔑 2 refus');
/* Une seule connexion doit s'accorder aussi : c'était écrit « 1 connexions / 7 j ». */
const cli1 = ligneCli({ t: 'e2', nom: 'W', slug: 'w', formule: 'Pro',
  resume: { derniere: Date.now() - 7200000, utilisateurs7: 1, appareils7: 1, connexions7: 1, echecs24: 0, versions: {} } }, 'active');
contient('une seule connexion : singulier', cli1, '1 connexion / 7 j');
absent('… et plus le « 1 connexions » d\'avant', cli1, '1 connexions');

console.log('5. L\'écran Entreprises porte la MÊME pastille — sinon elle ment d\'un écran à l\'autre');
const lignePast = /if\(o\.echecs24\) al\.push\((.+?)\);/.exec(SRC);
vrai('la pastille d\'échec de l\'écran Entreprises est trouvée', !!lignePast);
if (lignePast) {
  const pastille = new Function('o', 'return ' + lignePast[1] + ';');
  contient('même mot des deux côtés', pastille({ echecs24: 1 }), '🔑 1 refus');
  contient('même forme au pluriel', pastille({ echecs24: 4 }), '🔑 4 refus');
}

console.log('6. Aucune pastille de la Tour ne se réduit à un pictogramme et un nombre');
/* La règle est écrite dans tour.html pour ⏸ et 🎁 ; « 🔑 1 » y avait échappé. Ce banc la rend
   mécanique : toute pastille dont le contenu visible n'est qu'un symbole et un nombre rougit. */
const pastilles = SRC.match(/<span class="past[^"]*"[^>]*>[^<]*'/g) || [];
vrai('il y a bien des pastilles à contrôler', pastilles.length >= 4);
const nues = pastilles.filter(p => {
  const txt = p.replace(/^<span[^>]*>/, '').replace(/'$/, '');
  /* On retire le pictogramme de tête, puis on regarde s'il reste un mot. */
  const reste = txt.replace(/^[^\w\s]+\s*/u, '').trim();
  return reste === '' || /^[+\-]?$/.test(reste);
});
vrai('aucune pastille nue (symbole seul, sans mot ni unité)', nues.length === 0);
if (nues.length) nues.forEach(p => console.log('      nue : ' + p));

console.log('7. La pastille reste COURTE — mesuré au navigateur, verrouillé ici');
/* ⛔ Node ne mesure pas des pixels ; ce banc tient donc la seule chose qu'il peut tenir, et
   qui suffit à empêcher le retour du défaut : la LONGUEUR du texte. La mesure qui a tranché
   vit dans `scratchpad/sonde-pastilles-tour.md` — 39 px (avant) → 112 px et ROGNÉE (premier
   essai) → 75 px entière (retenu), à 390 px de large, avec le vrai CSS de la Tour. */
const LIMITE = 14;
[1, 24, 9999].forEach(n => {
  const t = ligneCnx({ t: 'z', nom: 'Z', slug: 'z', technique: true,
    resume: { derniere: Date.now() - 86400000, utilisateurs7: 1, echecs24: n, versions: {} } }, 'active');
  const m = /<span class="past[^"]*"[^>]*>([^<]*)<\/span>/.exec(t);
  vrai('la pastille existe pour ' + n + ' refus', !!m);
  if (m) vrai('… et tient en ' + LIMITE + ' caractères (' + JSON.stringify(m[1]) + ' = ' + [...m[1]].length + ')', [...m[1]].length <= LIMITE);
});
/* Le contre-exemple, pour que la limite ne soit pas décorative : la forme qu'on a essayée
   et mesurée trop large doit être refusée par cette même règle. */
vrai('la forme rognée mesurée à 112 px serait refusée par cette limite', [...'🔑 24 échecs / 24 h'].length > LIMITE);

console.log('8. Le commentaire qui porte la règle a été mis à jour');
vrai('la leçon du 17 septembre est écrite à côté du code', /UN CHIFFRE SEUL NE SUFFIT PAS/.test(SRC));
vrai('… et elle dit pourquoi le title ne suffit pas', /title.*n'a jamais sauvé personne sur un téléphone/.test(SRC));
vrai('… et la mesure qui a fait raccourcir la pastille est écrite', /MAIS ELLE RESTE COURTE, ET C'EST MESURÉ/.test(SRC));
vrai("… avec le chiffre qui l'a tranchée", /39 px à 112 px/.test(SRC));

console.log('\n════ test-717 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
if (ko) process.exit(1);
