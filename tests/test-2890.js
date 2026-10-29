/* ⛔ CE QUE CE FICHIER GARDE — LE RÉFÉRENTIEL DES MÉTIERS (`metiers.json`) ET SON INTERRUPTEUR UNIQUE (23 octobre 2026).

   Justin : « quand ils prennent un abonnement, ils choisissent le métier, et c'est obligatoire ; un système où ils cochent les
   catégories ; et quand ils cochent, que ça explique la catégorie ». Une seule source pour le serveur, la Tour, l'espace client,
   la page de paiement et le générateur du site : `metiers.json`. Quatre choses à tenir, chacune lue dans le CODE ou exécutée :

     1. le fichier est SAIN : JSON valide, 23 métiers, chaque rubrique citée existe dans `NAV` d'app.html (ou est l'écran des
        paramètres), chaque rubrique ouverte par défaut a sa raison, chaque rubrique a son explication ;
     2. l'INTERRUPTEUR est un : `ouverts`. Un métier n'y entre que si l'application publique le connaît (`METIERS_ORDRE`) ou par
        un réglage explicite (`ouvertsReglage`, avec sa raison) — et un réglage devenu inutile se retire (le banc le refuse) ;
     3. le MODULE du serveur (`server/metiers.js`, le vrai) obéit : il n'ouvre que ce que le fichier ouvre, jamais moins que
        les treize d'avant, ne ferme personne quand le fichier manque ou se tronque, et sert le référentiel aux écrans ;
     4. le serveur, le site et les pages le LISENT — dans le code, pas dans une phrase.
   ⛔ LA BÊTA PRÉCÈDE LE PUBLIC : sur cette branche `app.html` connaît 23 métiers et dit « Validation des mouvements ». `metiers.json`
   décrit la version PUBLIQUE. L'écart est DÉCLARÉ en un seul endroit (tests/beta-en-avance.js) : `ORDRE_PUBLIC` = l'ordre d'app.html moins les
   métiers déclarés, `libellePublic` lit le libellé déclaré comme le libellé public. Tout autre écart fait tomber ce banc, et la
   déclaration elle-même est contrôlée (`mensongesMetiers`, `mensongesLibelles`).
   Rien ne sort d'ici : aucun réseau, aucune donnée de client. */
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);

/* le code sans ses commentaires (ceux qui COMMENCENT une ligne) — un motif se cherche dans le code, jamais dans une phrase */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function litteral(src, debut) {
  const d0 = src.indexOf(debut); if (d0 < 0) return '';
  const o = src.indexOf(debut.trim().slice(-1) === '[' ? '[' : '{', d0 + debut.length - 1);
  const ouv = src[o], ferm = ouv === '[' ? ']' : '}';
  let prof = 0, q = null, k = o;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === ouv) prof++; else if (c === ferm) { prof--; if (!prof) break; }
  }
  return src.slice(o, k + 1);
}
const evalue = txt => vm.runInNewContext('(' + txt + ')');
const BETA = require('./beta-en-avance.js');

console.log('\n── 2890 · le référentiel des métiers et son interrupteur ──');
const CHEMIN = process.env.METIERS_FICHIER ? path.resolve(process.env.METIERS_FICHIER) : path.join(RACINE, 'metiers.json');
const BRUT = fs.readFileSync(CHEMIN, 'utf8');
let J = null; try { J = JSON.parse(BRUT); } catch (e) { J = null; }
vrai('(population) metiers.json se lit comme du JSON', !!J && typeof J === 'object');
if (!J) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }

const APPN = nu(lire('APP_FICHIER', 'app.html')), SRV = lire('SERVEUR_FICHIER', 'server/index.js'), SRVN = nu(SRV);
const NAV = evalue(litteral(APPN, 'const NAV = ['));
const ORDRE_BETA = evalue(litteral(APPN, 'const METIERS_ORDRE=['));
const ORDRE_APP = BETA.ordrePublic(ORDRE_BETA);   // les métiers que l'application PUBLIQUE connaît (la bêta en connaît dix de plus, déclarés)
const clesNav = NAV.flatMap(g => g.items.map(i => i.k)), libNav = {};
NAV.forEach(g => g.items.forEach(i => { libNav[i.k] = { l: i.l, g: g.g }; }));
const TOUJOURS = ['dashboard', 'utilisateurs', 'modulesElan', 'parametres'];

/* ══ 1. LE FICHIER EST SAIN ══ */
console.log('\n1. Le fichier : 23 métiers, des rubriques qui existent, une raison et une explication partout');
vrai('(population) NAV (10 groupes, une quarantaine de rubriques) et METIERS_ORDRE (24 clés depuis la climatisation du 29 octobre 2026 ; publiques : 13 avant la v772, les 23 depuis le 23 octobre 2026) sont lus dans le CODE d\'app.html',
  NAV.length === 10 && clesNav.length >= 40 && Array.isArray(ORDRE_BETA) && ORDRE_BETA.length === 24 && ORDRE_APP.length === 24 - BETA.PAS_ENCORE_OUVERTS.length, JSON.stringify([NAV.length, clesNav.length, ORDRE_BETA, ORDRE_APP]));
const cles = Object.keys(J.metiers);
v('24 métiers (les treize actuels, les dix nouveaux et la climatisation, séparée du chauffage le 29 octobre 2026)', cles.length, 24);
v('   `ordreMetiers` les range tous, une fois chacun', J.ordreMetiers.slice().sort(), cles.slice().sort());
/* un métier DÉCLARÉ en avance (la climatisation, rangée juste après le chauffage) peut se trouver n'importe où dans la liste : ce qu'on garde, c'est l'ordre des métiers que le public connaît */
const ORDRE_FICHIER_PUBLIC = J.ordreMetiers.filter(k => BETA.PAS_ENCORE_OUVERTS.indexOf(k) < 0);
v('   ceux de l\'application publique ouvrent la liste, dans son ordre (les métiers déclarés en avance mis à part)', ORDRE_FICHIER_PUBLIC.slice(0, ORDRE_APP.length), ORDRE_APP);
v('   … et les métiers déclarés en avance sont bien dans la liste', BETA.PAS_ENCORE_OUVERTS.filter(k => J.ordreMetiers.indexOf(k) < 0), []);
const NOUVEAUX = ['incendie', 'froid', 'ascenseurs', 'portails', 'ramonage', 'assainissement', 'energies', 'alarme', 'eau', 'piscine'];
v('   les dix nouveaux suivent', ORDRE_FICHIER_PUBLIC.slice(13), NOUVEAUX);
const rub = J.rubriques, clesRub = Object.keys(rub);
v('42 rubriques décrites : les 38 cochables et les 4 qui ne se cochent jamais', clesRub.length, 42);
v('⛔ chaque rubrique décrite existe dans NAV d\'app.html (ou est l\'écran des paramètres, hors NAV)', clesRub.filter(k => !clesNav.includes(k) && k !== 'parametres'), []);
v('⛔ et chaque rubrique de NAV est décrite (une rubrique ajoutée au menu sans explication fait tomber ce banc)', clesNav.filter(k => !clesRub.includes(k)), []);
v('   les libellés sont ceux du menu (le client coche ce qu\'il verra) — à l\'écart DÉCLARÉ près (la bêta précède le public)', clesRub.filter(k => libNav[k] && BETA.libellePublic(k, libNav[k].l) !== rub[k].titre).map(k => [k, libNav[k].l, rub[k].titre]), []);
v('⛔ la déclaration d\'avance de la bêta est VRAIE côté libellés (app.html porte le libellé déclaré, le référentiel public l\'ancien)', BETA.mensongesLibelles(libNav, Object.fromEntries(clesRub.map(k => [k, rub[k].titre]))), []);
v('   les groupes sont ceux du menu', clesRub.filter(k => libNav[k] && libNav[k].g !== rub[k].groupe).map(k => [k, libNav[k].g, rub[k].groupe]), []);
v('   les quatre rubriques « toujours » sont marquées, et elles seules', clesRub.filter(k => rub[k].toujours), TOUJOURS.slice().sort((a, b) => clesRub.indexOf(a) - clesRub.indexOf(b)));
v('⛔ chaque rubrique a son explication, en vraies phrases (au moins 40 signes) — « quand ils cochent, ça explique la catégorie »',
  clesRub.filter(k => typeof rub[k].explication !== 'string' || rub[k].explication.trim().length < 40), []);
/* ⛔ Une explication est LUE PAR LE CLIENT (page de paiement, espace client, site) : pas de note de travail (« il doit devenir… »), pas de promesse d'évolution
   (« il sera rendu… »), pas de « aujourd'hui » qui date le texte, pas de parenthèse qui parle du menu en interne. */
v('⛔ aucune explication ne porte une note de travail ni une promesse d\'évolution',
  clesRub.filter(k => /doit devenir|il sera |elle sera |sera rendu|bientôt|aujourd'hui|à venir|le menu s'appelle|\(f\d+\)/i.test(rub[k].explication)), []);
v('   … et un titre et un pictogramme', clesRub.filter(k => !rub[k].titre || !rub[k].ic), []);
let manques = [], extras = [], inconnues = [], chevauche = [], vides = [], sansToujours = [], petits = [], sansTexte = [];
for (const k of cles) {
  const m = J.metiers[k];
  if (!m.nom || !m.ic || !m.sous) sansTexte.push(k);
  const R = m.rubriques || [], P = m.proposees || {}, W = m.pourquoi || {};
  R.forEach(r => { if (!rub[r]) inconnues.push(k + ':' + r); if (typeof W[r] !== 'string' || W[r].trim().length < 20) manques.push(k + ':' + r); });
  Object.keys(W).forEach(r => { if (!R.includes(r)) extras.push(k + ':' + r); });
  Object.keys(P).forEach(r => { if (!rub[r]) inconnues.push(k + ':proposée ' + r); if (R.includes(r)) chevauche.push(k + ':' + r); if (typeof P[r] !== 'string' || P[r].trim().length < 15) vides.push(k + ':' + r); });
  if (new Set(R).size !== R.length) chevauche.push(k + ':doublon');
  TOUJOURS.forEach(t => { if (!R.includes(t)) sansToujours.push(k + ':' + t); });
  if (R.length < 15) petits.push(k + ':' + R.length);
}
v('   chaque métier a un nom, un pictogramme et une ligne qui le résume', sansTexte, []);
v('⛔ toute rubrique citée par un métier (ouverte ou proposée) existe dans le catalogue', inconnues, []);
v('⛔ chaque rubrique ouverte par défaut a SA raison, propre au métier (au moins 20 signes) — jamais un masque recopié', manques, []);
v('   … et aucune raison ne vise une rubrique que le métier n\'ouvre pas', extras, []);
v('   une rubrique proposée n\'est pas déjà ouverte, et chacune a sa raison', chevauche.concat(vides), []);
v('   les quatre rubriques « toujours » sont ouvertes pour chaque métier', sansToujours, []);
v('   (population) aucun métier n\'a moins de 15 rubriques — sinon « chaque raison présente » ne prouverait rien', petits, []);
const total = cles.reduce((t, k) => t + J.metiers[k].rubriques.length, 0);
vrai('   (population) ' + total + ' rubriques ouvertes au total, toutes avec leur raison', total >= 23 * 15, total);
/* les métiers ne se ressemblent pas : un référentiel recopié d'un métier à l'autre serait la faute que Justin a dénoncée (« là je trouve ça léger ») */
const signatures = new Set(cles.map(k => J.metiers[k].rubriques.slice().sort().join(',')));
vrai('⛔ les 23 métiers n\'ouvrent pas tous les mêmes rubriques (au moins 8 combinaisons différentes)', signatures.size >= 8, signatures.size);
vrai('   la 3D est le seul à ouvrir les rubriques du registre, des box et du devis xylophage',
  cles.filter(k => ['registre', 'carteBox', 'devisXylo', 'boxes', 'saisieConso'].some(r => J.metiers[k].rubriques.includes(r))).join() === '3d', cles.filter(k => ['registre', 'carteBox', 'devisXylo', 'boxes', 'saisieConso'].some(r => J.metiers[k].rubriques.includes(r))).join());
v('   aucun métier hors 3D n\'ouvre par défaut une rubrique réservée (`seulement`) — la grille d\'abonnement les cache, l\'application aussi',
  cles.filter(k => k !== '3d').flatMap(k => J.metiers[k].rubriques.filter(r => Array.isArray(rub[r].seulement) && !rub[r].seulement.includes(k)).map(r => k + ':' + r)), []);
vrai('   le fichier ne porte ni adresse électronique, ni clé, ni code promo, ni chemin d\'une machine',
  !/[\w.+-]+@[\w-]+\.[\w.]+/.test(BRUT) && !/sk_(live|test)_|api[_-]?key|\/home\/|\/Users\/|TEAMOP3MOIS/i.test(BRUT));

/* ══ 2. L'INTERRUPTEUR EST UN ══ */
console.log('\n2. L\'interrupteur : `ouverts`, lié à l\'application (`METIERS_ORDRE`) ou à un réglage explicite');
const ouv = J.ouverts, reg = J.ouvertsReglage;
vrai('(population) `ouverts` et `ouvertsReglage` sont là', Array.isArray(ouv) && ouv.length >= 13 && reg && typeof reg === 'object' && !Array.isArray(reg));
v('⛔ tout métier que l\'application connaît est ouvert (ouvrir un métier dans app.html sans l\'ouvrir ici ferait tomber ce banc)', ORDRE_APP.filter(k => !ouv.includes(k)), []);
v('⛔ la déclaration d\'avance de la bêta est VRAIE côté métiers (déclarés connus d\'app.html, et NON ouverts par metiers.json)', BETA.mensongesMetiers(ORDRE_BETA, ouv), []);
v('⛔ tout métier ouvert que l\'application ne connaît pas porte un réglage explicite avec sa raison (sinon un client le choisirait et recevrait la 3D)',
  ouv.filter(k => !ORDRE_APP.includes(k) && (typeof reg[k] !== 'string' || reg[k].trim().length < 20)), []);
v('   un réglage qui vise une clé que l\'application connaît désormais est PÉRIMÉ : on le retire', Object.keys(reg).filter(k => ORDRE_APP.includes(k) || !ouv.includes(k)), []);
v('   tout métier ouvert existe dans le référentiel', ouv.filter(k => !J.metiers[k]), []);
v('   aucun doublon', ouv.length, new Set(ouv).size);
v('⛔ les dix nouveaux métiers sont FERMÉS tant que l\'application ne les connaît pas (aucun réglage ne les ouvre aujourd\'hui)', NOUVEAUX.filter(k => ouv.includes(k) && !ORDRE_APP.includes(k)), []);
v('   les treize d\'avant sont ouverts, comme avant', ORDRE_APP.filter(k => !ouv.includes(k)), []);

/* ══ 3. LE MODULE DU SERVEUR (le vrai) ══ */
console.log('\n3. Le module du serveur (`server/metiers.js`, le vrai) obéit au fichier');
const CATS_OK = evalue(litteral(SRVN, 'const CATS_OK = ['));
const CATS_TOUJOURS = evalue(litteral(SRVN, 'const CATS_TOUJOURS = ['));
const creer = require(path.join(RACINE, 'server', 'metiers.js'));
vrai('(population) CATS_OK (38) et CATS_TOUJOURS (4) sont lus dans le code du serveur', CATS_OK.length === 38 && CATS_TOUJOURS.length === 4, [CATS_OK.length, CATS_TOUJOURS.length]);
v('⛔ le catalogue du référentiel est EXACTEMENT les rubriques cochables du serveur plus les quatre « toujours » (dans l\'ordre du menu)', clesRub.filter(k => !TOUJOURS.includes(k)), CATS_OK);
const M = creer(CHEMIN, CATS_OK, CATS_TOUJOURS);
/* L'état d'AVANT la publication de la v772 (treize ouverts, les dix nouveaux fermés), FABRIQUÉ : depuis le 23 octobre 2026 le vrai fichier ouvre
   les vingt-trois, et les refus d'un métier fermé se jouent sur cette copie — sinon ils ne viseraient plus rien. */
const HIST13 = ORDRE_FICHIER_PUBLIC.slice(0, 13);
const bac13 = fs.mkdtempSync(path.join(os.tmpdir(), 'b2890a-'));
const J13 = JSON.parse(BRUT); J13.ouverts = HIST13.slice(); J13.ouvertsReglage = {};
const F13 = path.join(bac13, 'treize.json'); fs.writeFileSync(F13, JSON.stringify(J13));
const M13 = creer(F13, CATS_OK, CATS_TOUJOURS), P13 = M13.publique();
vrai('le module lit le fichier', M.lu === true);
v('⛔ il ouvre exactement `ouverts` (les vingt-trois depuis la v772)', M.ouverts.slice().sort(), ouv.slice().sort());
v('   … et refuse un métier fermé, un inconnu, un vide, un nombre', [M13.estOuvert('incendie'), M13.estOuvert('piscine'), M.estOuvert('boulangerie'), M.estOuvert(''), M.estOuvert(null), M.estOuvert(3)], [false, false, false, false, false, false]);
v('   … et accepte tous ceux de l\'application publique', ORDRE_APP.map(k => M.estOuvert(k)), ORDRE_APP.map(() => true));
v('   ses libellés sont ceux du fichier', ORDRE_APP.map(k => M.nom(k)), ORDRE_APP.map(k => J.metiers[k].nom));
v('   le conseil d\'un métier = ses rubriques ouvertes par défaut, sans les quatre « toujours », dans l\'ordre du menu',
  M.conseil('chauffage'), CATS_OK.filter(c => J.metiers.chauffage.rubriques.includes(c)));
v('   … et il n\'y a PAS de conseil pour un métier fermé (le serveur ne devine rien)', [M13.conseil('incendie'), M.conseil('inconnu')], [null, null]);
const P = M.publique();
vrai('⛔ le référentiel servi aux écrans : les métiers OUVERTS seulement', P && P.ok === true && JSON.stringify(P.ouverts) === JSON.stringify(M.ordre) && Object.keys(P.metiers).join() === P.ouverts.join(), P && Object.keys(P.metiers).join());
vrai('   … sans aucun métier fermé (sur l\'état d\'avant : les dix nouveaux ne sortaient pas du serveur tant qu\'ils étaient fermés)', !!P13 && NOUVEAUX.every(k => !P13.metiers[k]) && HIST13.every(k => !!P13.metiers[k]));
v('   … avec les 38 rubriques cochables, titrées, expliquées', [Object.keys(P.rubriques).length, Object.values(P.rubriques).every(r => r.titre && r.explication.length >= 40)], [38, true]);
v('   … et les quatre « toujours » à part', P.toujours.map(t => t.k), CATS_TOUJOURS);
v('   … les groupes dans l\'ordre du menu', P.groupes, NAV.map(g => g.g).filter(g => g !== 'Tableau de bord' || CATS_OK.some(c => libNav[c] && libNav[c].g === g)));
v('   … la raison de chaque rubrique conseillée, par métier', Object.keys(P.metiers).filter(k => Object.keys(P.metiers[k].pourquoi).length !== P.metiers[k].rubriques.length), []);
vrai('   … en moins de 80 Ko (il part à chaque ouverture de l\'écran d\'abonnement)', JSON.stringify(P).length < 80000, JSON.stringify(P).length);

/* le module sur des fichiers fabriqués : un réglage explicite ouvre, un fichier absent ou tronqué ne ferme personne */
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'b2890-'));
try {
  const ecrire = (nom, o) => { const f = path.join(bac, nom); fs.writeFileSync(f, typeof o === 'string' ? o : JSON.stringify(o)); return f; };
  const ouvert = JSON.parse(BRUT); ouvert.ouvertsReglage = { incendie: 'ouvert pour l\'essai : l\'application le connaît sur la bêta, publiée le jour même' }; ouvert.ouverts = HIST13.concat(['incendie']);
  const A = creer(ecrire('reglage.json', ouvert), CATS_OK, CATS_TOUJOURS);
  v('⛔ un réglage explicite OUVRE le métier (et lui seul) — mutation de l\'interrupteur', [A.estOuvert('incendie'), A.estOuvert('froid'), A.ouverts.length], [true, false, 14]);
  vrai('   … et le conseil de ce métier ouvert est servi', Array.isArray(A.conseil('incendie')) && A.conseil('incendie').length >= 15);
  const tronque = JSON.parse(BRUT); tronque.ouverts = [];
  const B = creer(ecrire('tronque.json', tronque), CATS_OK, CATS_TOUJOURS);
  v('⛔ un fichier dont `ouverts` est vidé ne ferme PERSONNE : les treize historiques restent ouverts', B.ouverts.slice().sort(), HIST13.slice().sort());
  const inconnue = JSON.parse(BRUT); inconnue.ouverts = ouv.concat(['boulangerie']);
  v('   une clé qui n\'est pas dans le référentiel ne s\'ouvre pas', creer(ecrire('inconnue.json', inconnue), CATS_OK, CATS_TOUJOURS).estOuvert('boulangerie'), false);
  const C = creer(path.join(bac, 'absent.json'), CATS_OK, CATS_TOUJOURS);
  v('⛔ un fichier ABSENT (déploiement du serveur seul avant le site) : les treize restent ouverts, rien d\'autre, et pas de référentiel à servir',
    [C.lu, C.ouverts.slice().sort(), C.publique(), C.conseil('3d')], [false, HIST13.slice().sort(), null, null]);
  const D = creer(ecrire('casse.json', '{ pas du json'), CATS_OK, CATS_TOUJOURS);
  v('   un fichier illisible : pareil', [D.lu, D.ouverts.length], [false, 13]);
} finally { try { fs.rmSync(bac, { recursive: true, force: true }); fs.rmSync(bac13, { recursive: true, force: true }); } catch (e) {} }

/* ══ 4. LES LECTEURS LISENT L'INTERRUPTEUR (dans le code) ══ */
console.log('\n4. Le serveur lit l\'interrupteur (et plus une liste recopiée)');
vrai('⛔ `METIERS_OK` vient du module du référentiel, plus d\'un littéral écrit à la main', /const metiersMod = require\('\.\/metiers'\)\(path\.join\(__dirname, '\.\.', 'metiers\.json'\), CATS_OK, CATS_TOUJOURS\);/.test(SRVN) && /const METIERS_OK = metiersMod\.ouverts;/.test(SRVN) && !/const METIERS_OK = \[/.test(SRVN));
vrai('   `metierOk` et `METIERS_LBL` en dérivent', /const metierOk = m => \(METIERS_OK\.includes\(m\) \? m : ''\);/.test(SRVN) && /const METIERS_LBL = metiersMod\.libelles\(\);/.test(SRVN));
vrai('   la route publique `GET /api/metiers` sert le référentiel et dit 503 quand il manque', /app\.get\('\/api\/metiers', \(req, res\) => \{\s*const p = metiersMod\.publique\(\);\s*if \(!p\) return res\.status\(503\)/.test(SRVN));
vrai('   le module est déclaré APRÈS `CATS_TOUJOURS` (une `const` lue avant sa déclaration est en zone morte)', SRVN.indexOf('const metiersMod =') > SRVN.indexOf('const CATS_TOUJOURS ='));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
