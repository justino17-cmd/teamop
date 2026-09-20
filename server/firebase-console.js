#!/usr/bin/env node
/* ══ PARLER À FIREBASE DEPUIS LE SERVEUR, AU LIEU DE CLIQUER DANS LA CONSOLE ══════════════════
 *
 *   node server/firebase-console.js regles              # ce qui est VRAIMENT publié, comparé au dépôt
 *   node server/firebase-console.js regles-publier      # publie firestore.rules (demande confirmation)
 *   node server/firebase-console.js sauvegardes         # état des sauvegardes Firestore
 *   node server/firebase-console.js sauvegardes-activer # récupération à un instant donné + une par jour
 *   node server/firebase-console.js droits              # POURQUOI une commande refuse — mesuré, pas deviné
 *
 * ⛔ CE QUE CE FICHIER RÉPARE, ET CE N'EST PAS UN CONFORT. Le 18 septembre 2026, on a découvert
 * que `firestore.rules` du dépôt affirmait « publié le 11 septembre » alors que la console
 * servait encore l'ANCIENNE règle — celle qui laisse n'importe quel compte anonyme lire le
 * document de n'importe quelle entreprise. Personne n'a menti : le fichier a été écrit, le
 * collage dans la console ne s'est jamais fait, ou a été défait. Et rien ne pouvait le dire,
 * parce que la seule façon de comparer était d'ouvrir la console et de lire à l'œil.
 *
 * Deux copies d'une même vérité finissent toujours par diverger — c'est la leçon que ce dépôt
 * applique déjà partout ailleurs (une seule définition de `fbUidEquipe`, une seule garde
 * `sauvRefus`, les trois listes d'espaces techniques comparées ENTRE ELLES par un banc). Elle
 * n'était pas appliquée à la seule chose qui protège les données des clients.
 * Désormais : `regles` COMPARE, et `regles-publier` publie DEPUIS LE FICHIER DU DÉPÔT. Le
 * fichier devient la source, la console devient un reflet — l'écart ne peut plus s'installer.
 *
 * ⛔ IL N'AFFICHE AUCUN SECRET et ne lit AUCUNE donnée de client. Il ne touche qu'aux réglages.
 * ⚠️ `regles-publier` est la seule commande qui MODIFIE quelque chose, elle demande une
 * confirmation tapée, et Firebase garde l'historique des règles publiées (retour arrière
 * possible depuis la console).
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), readline = require('readline');

const FB_ADMIN_PATH = process.env.TEAMOP_FB_ADMIN || '/opt/teamop/firebase-admin.json';
const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const RACINE = path.join(__dirname, '..');

const lire = (p, d) => { try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (e) { return d; } };
const cle = lire(FB_ADMIN_PATH, null);
const PROJET = ((lire(CONFIG_PATH, {}) || {}).firebase || {}).projectId || (cle && cle.project_id) || 'elan-gestion';

/* Le même échange que `fbAdminJeton` dans index.js, avec une portée plus large : les règles et
   les sauvegardes ne sont pas dans `datastore`. C'est l'IAM du compte de service qui décide
   vraiment de ce qui passe — demander large ne donne aucun droit de plus. */
async function jeton() {
  if (!cle || !cle.client_email || !cle.private_key) { console.error('✗ clé d\'administration Firebase absente ou incomplète (' + FB_ADMIN_PATH + ')'); process.exit(1); }
  const b64u = o => Buffer.from(JSON.stringify(o)).toString('base64url');
  const now = Math.floor(Date.now() / 1000);
  const sans = b64u({ alg: 'RS256', typ: 'JWT' }) + '.' + b64u({
    iss: cle.client_email, aud: 'https://oauth2.googleapis.com/token',
    scope: 'https://www.googleapis.com/auth/cloud-platform', iat: now, exp: now + 3600 });
  const sig = crypto.createSign('RSA-SHA256').update(sans).sign(cle.private_key).toString('base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + sans + '.' + sig });
  const j = await r.json().catch(() => ({}));
  if (!j.access_token) { console.error('✗ Google refuse la clé d\'administration : ' + (j.error_description || j.error || r.status)); process.exit(1); }
  return j.access_token;
}

async function api(url, opts, tok) {
  const r = await fetch(url, Object.assign({ headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' } }, opts || {}));
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
  return { statut: r.status, j, txt };
}

/* ⛔ NE JAMAIS RÉSUMER UN REFUS DE GOOGLE — pris le 20 septembre 2026. La phrase « le compte
   de service n'a pas le droit de faire ça » était écrite EN DUR ici et s'affichait sur TOUT
   403, quelle qu'en soit la cause, en jetant `r.txt` — le seul endroit du fichier où le
   message de Google était perdu. Deux rôles ont été ajoutés dans la console sur la foi de
   cette phrase ; le 403 est resté, et rien ne pouvait dire pourquoi. Trois causes rendent le
   MÊME 403 et une seule se répare dans l'IAM : le rôle manque vraiment, l'API est éteinte sur
   le projet (`SERVICE_DISABLED`), ou la clé du serveur appartient à un AUTRE projet — on
   ajoute alors des rôles dans une console qui n'est pas celle qui refuse. Google les
   distingue, nomme la permission manquante et la ressource visée. On le lit, on ne devine
   plus. */
function motsDeGoogle(r) {
  const e = (r.j && r.j.error) || {};
  const det = (e.details || []).map(d => [d.reason, d.metadata && d.metadata.service]
    .filter(Boolean).join(' · ')).filter(Boolean);
  const msg = String(e.message || r.txt || '').replace(/\s+/g, ' ').trim().slice(0, 400);
  return [msg, det.length ? '(' + det.join(' | ') + ')' : ''].filter(Boolean).join(' ');
}

function expliquerRefus(r) {
  const mots = motsDeGoogle(r);
  console.error('✗ HTTP ' + r.statut + ' — Google répond :');
  console.error('  « ' + (mots || '(aucun message)') + ' »');
  if (r.statut !== 403) return;
  if (/SERVICE_DISABLED|has not been used in project|API .*is disabled/i.test(mots)) {
    console.error('\n  → Ce n\'est PAS un problème de rôle : l\'API elle-même est éteinte sur le projet.');
    console.error('    Le lien d\'activation est dans le message ci-dessus. Le suivre, attendre deux');
    console.error('    minutes, relancer.');
  } else {
    console.error('\n  → Avant de cliquer dans la console, MESURER ce qui manque vraiment :');
    console.error('    node server/firebase-console.js droits');
  }
}

/* ── LES RÈGLES ─────────────────────────────────────────────────────────────────────────── */
async function reglesPubliees(tok) {
  const rel = await api('https://firebaserules.googleapis.com/v1/projects/' + PROJET + '/releases/cloud.firestore', null, tok);
  if (rel.statut !== 200) { expliquerRefus(rel); process.exit(1); }
  const rs = await api('https://firebaserules.googleapis.com/v1/' + rel.j.rulesetName, null, tok);
  if (rs.statut !== 200) { expliquerRefus(rs); process.exit(1); }
  const f = ((rs.j.source || {}).files || [])[0] || {};
  return { source: String(f.content || ''), quand: rel.j.createTime || '?', nom: rel.j.rulesetName };
}

/* On ne compare pas des fichiers entiers : les commentaires diffèrent, l'espacement aussi, et
   un diff de 180 lignes ne dit rien à qui doit décider. On compare CE QUI DÉCIDE — la ligne
   qui autorise la lecture des données d'entreprise. C'est elle, et elle seule, qui sépare
   « chaque entreprise chez elle » de « n'importe qui peut lire ». */
function ligneQuiDecide(src) {
  const bloc = /match\s*\/elan_teams\/\{[^}]*\}\s*\{([\s\S]*?)\}/.exec(src || '');
  if (!bloc) return null;
  const l = /allow\s+read[^;]*;/.exec(bloc[1]);
  return l ? l[0].replace(/\s+/g, ' ').trim() : null;
}

async function cmdRegles(tok) {
  const pub = await reglesPubliees(tok);
  const local = fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8');
  console.log('\n══ Règle Firestore — ce qui est PUBLIÉ vs ce que dit le dépôt ══\n');
  console.log('publiée le : ' + pub.quand);
  console.log('\n  dans la console : ' + (ligneQuiDecide(pub.source) || '(bloc elan_teams introuvable)'));
  console.log('  dans le dépôt   : ' + (ligneQuiDecide(local) || '(bloc elan_teams introuvable)'));
  const memeRegle = ligneQuiDecide(pub.source) === ligneQuiDecide(local);
  const ouverte = /allow\s+read\s*:\s*if\s+connecte\(\)\s*;/.test(ligneQuiDecide(pub.source) || '');
  console.log();
  if (ouverte) {
    console.log('⛔ LA RÈGLE PUBLIÉE EST OUVERTE : n\'importe quel compte anonyme peut lire le document');
    console.log('   de n\'importe quelle entreprise. La clé d\'accès Firebase est dans app.html, public.');
    console.log('   → node server/verifier-firebase.js   (vérifier qu\'on peut fermer sans couper personne)');
    console.log('   → node server/firebase-console.js regles-publier\n');
  } else if (memeRegle) {
    console.log('✅ La console sert bien la règle du dépôt.\n');
  } else {
    console.log('⚠️ La console et le dépôt ne disent pas la même chose, sans que la règle soit ouverte.');
    console.log('   Regarder les deux lignes ci-dessus avant de publier.\n');
  }
  console.log('(taille : console ' + pub.source.length + ' o · dépôt ' + local.length + ' o)\n');
}

async function cmdReglesPublier(tok) {
  const local = fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8');
  const pub = await reglesPubliees(tok);
  console.log('\n══ Publier la règle du dépôt ══\n');
  console.log('  actuellement : ' + (ligneQuiDecide(pub.source) || '?'));
  console.log('  après        : ' + (ligneQuiDecide(local) || '?'));
  console.log('\n⛔ Un appareil incapable de présenter son jeton perdra l\'accès aux données de sa');
  console.log('   PROPRE entreprise. Avoir lancé `verifier-firebase.js` et obtenu son feu vert');
  console.log('   n\'est pas une formalité : c\'est la seule chose qui sépare ceci d\'une coupure.');
  console.log('   (Firebase garde l\'historique : un retour arrière reste possible depuis la console.)\n');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const rep = await new Promise(res => rl.question('Taper PUBLIER pour confirmer : ', x => { rl.close(); res(String(x).trim()); }));
  if (rep !== 'PUBLIER') { console.log('\nAnnulé. Rien n\'a été modifié.\n'); return; }

  const cree = await api('https://firebaserules.googleapis.com/v1/projects/' + PROJET + '/rulesets',
    { method: 'POST', body: JSON.stringify({ source: { files: [{ name: 'firestore.rules', content: local }] } }) }, tok);
  if (cree.statut !== 200) { expliquerRefus(cree); process.exit(1); }
  console.log('  règle compilée et enregistrée par Google.');
  const rel = await api('https://firebaserules.googleapis.com/v1/projects/' + PROJET + '/releases/cloud.firestore',
    { method: 'PATCH', body: JSON.stringify({ release: { name: 'projects/' + PROJET + '/releases/cloud.firestore', rulesetName: cree.j.name } }) }, tok);
  if (rel.statut !== 200) { expliquerRefus(rel); process.exit(1); }
  console.log('  ✅ PUBLIÉE.\n');
  /* On relit ce qui est servi, au lieu de croire la réponse de l'appel qui vient de l'écrire.
     C'est la même règle que pour la sauvegarde : le succès de l'envoi ne prouve que l'envoi. */
  const apres = await reglesPubliees(tok);
  console.log('  relu chez Google : ' + (ligneQuiDecide(apres.source) || '?'));
  console.log(ligneQuiDecide(apres.source) === ligneQuiDecide(local)
    ? '  ✅ la console sert bien la règle du dépôt.\n'
    : '  ⚠️ ce qui est relu ne correspond PAS au dépôt — à regarder tout de suite.\n');
}

/* ── L'INVENTAIRE COMPLET ────────────────────────────────────────────────────────────────
   ⛔ POURQUOI CETTE COMMANDE EXISTE. Justin, le 18 septembre 2026 : « je trouve qu'il y a
   beaucoup d'endroits avec beaucoup de trucs, et je sais pas à quoi ça correspond ». C'est la
   vraie difficulté de Firebase : une douzaine d'écrans, chacun avec ses réglages, aucun qui
   dise lequel compte pour CE produit-ci. Une console qu'on ne comprend pas est une console
   qu'on n'ouvre pas — et c'est comme ça qu'une règle reste non publiée pendant une semaine.
   Cette commande répond à « qu'est-ce qu'on doit faire, exactement ». Elle lit tout ce qui est
   lisible, dit ce que chaque chose PROTÈGE, et tranche : ça va, ou il faut agir.
   ⚠️ Elle dégrade proprement : un réglage que les droits actuels ne laissent pas lire est
   annoncé comme tel, jamais deviné. « Je ne sais pas » vaut mieux qu'une fausse assurance. */
async function cmdEtat(tok) {
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  console.log('║  FIREBASE — TOUT CE QUI COMPTE POUR TEAMOP, ET RIEN D\'AUTRE     ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log('  projet : ' + PROJET);
  let aFaire = [];

  /* 1. La règle : ce qui décide qui peut lire les données des clients. */
  console.log('\n── 1. LA RÈGLE — qui a le droit de lire les données de tes clients ──');
  try {
    const pub = await reglesPubliees(tok);
    const local = fs.readFileSync(path.join(RACINE, 'firestore.rules'), 'utf8');
    const lp = ligneQuiDecide(pub.source), ll = ligneQuiDecide(local);
    console.log('   publiée le ' + String(pub.quand).slice(0, 10) + ' : ' + (lp || '?'));
    if (/allow\s+read\s*:\s*if\s+connecte\(\)\s*;/.test(lp || '')) {
      console.log('   ⛔ OUVERTE — n\'importe quel compte anonyme lit n\'importe quelle entreprise.');
      aFaire.push('regles-publier   ← LE PLUS IMPORTANT : referme la porte');
    } else if (lp === ll) console.log('   ✅ fermée, et identique au dépôt.');
    else { console.log('   ⚠️ différente du dépôt (' + ll + ')'); aFaire.push('regles           ← comparer, puis décider'); }
  } catch (e) { console.log('   ⚠ non lisible : ' + e.message); }

  /* 2. Les sauvegardes de Firestore : Google n'en fait AUCUNE par défaut. */
  console.log('\n── 2. LES SAUVEGARDES — ce qui te sauve d\'une suppression accidentelle ──');
  const db = await api(BASE_DB(), null, tok);
  if (db.statut === 200) {
    const pitr = /ENABLED/.test(db.j.pointInTimeRecoveryEnablement || '');
    console.log('   emplacement : ' + (db.j.locationId || '?') + ' · retour dans le temps : ' + (pitr ? '✅ activé (7 j)' : '⛔ DÉSACTIVÉ'));
    const sch = await api(BASE_DB() + '/backupSchedules', null, tok);
    if (sch.statut === 200) {
      const l = sch.j.backupSchedules || [];
      console.log('   sauvegardes programmées : ' + (l.length ? '✅ ' + l.length : '⛔ AUCUNE'));
      if (!pitr || !l.length) aFaire.push('sauvegardes-activer  ← Google ne sauvegarde RIEN pour toi par défaut');
    } else { console.log('   sauvegardes programmées : non lisibles (droits) — il manque « Propriétaire Cloud Datastore »'); aFaire.push('IAM : ajouter roles/datastore.owner au compte de service'); }
  } else console.log('   ⚠ non lisible (droits)');

  /* 3. Les comptes : qui peut se créer une identité, et d'où. */
  console.log('\n── 3. LES COMPTES — qui peut se présenter, et depuis quel site ──');
  const cfg = await api('https://identitytoolkit.googleapis.com/admin/v2/projects/' + PROJET + '/config', null, tok);
  if (cfg.statut === 200) {
    const si = cfg.j.signIn || {};
    const anon = !!(si.anonymous && si.anonymous.enabled);
    console.log('   comptes anonymes : ' + (anon ? '✅ activés (l\'application en a BESOIN)' : '⛔ désactivés — la synchro ne peut plus démarrer'));
    const auto = cfg.j.autodeleteAnonymousUsers;
    console.log('   ménage des comptes anonymes : ' + (auto ? '✅ automatique après 30 jours' : '⚠ aucun — ils s\'accumulent pour toujours'));
    if (!auto) aFaire.push('comptes-menage       ← supprime les comptes anonymes inactifs (gratuit, sans risque)');
    const dom = cfg.j.authorizedDomains || [];
    console.log('   sites autorisés (' + dom.length + ') : ' + dom.join(', '));
    const inconnus = dom.filter(d => !/teamop\.fr$|firebaseapp\.com$|web\.app$|^localhost$/.test(d));
    if (inconnus.length) { console.log('   ⚠ à vérifier : ' + inconnus.join(', ')); aFaire.push('retirer les sites inconnus dans la console Authentication'); }
  } else console.log('   ⚠ non lisible (droits) — il manque un rôle d\'administration de l\'authentification');

  /* 4. App Check : le niveau au-dessus, à ne pas activer à la légère. */
  console.log('\n── 4. APP CHECK — refuser tout ce qui ne vient pas de ta vraie application ──');
  const ac = await api('https://firebaseappcheck.googleapis.com/v1/projects/' + PROJET + '/services', null, tok);
  if (ac.statut === 200) {
    const l = (ac.j.services || []).filter(x => /ENFORCED|UNENFORCED/.test(x.enforcementMode || ''));
    const actif = l.some(x => x.enforcementMode === 'ENFORCED');
    console.log('   ' + (actif ? '✅ exigé' : '· non exigé — c\'est le cas aujourd\'hui, et c\'est normal'));
  } else console.log('   · non lisible (droits) — sans importance tant qu\'on ne s\'en sert pas');
  console.log('   ⚠️ NE PAS l\'activer sans modifier l\'application d\'abord : tout serait refusé.');

  /* ── CE QU'IL RESTE À FAIRE, et rien d'autre ─────────────────────────────────────────── */
  console.log('\n╔══════════════════════════════════════════════════════════════════╗');
  if (!aFaire.length) { console.log('║  ✅ RIEN À FAIRE — tout ce qui compte est en place.              ║');
    console.log('╚══════════════════════════════════════════════════════════════════╝\n'); return; }
  console.log('║  CE QU\'IL RESTE À FAIRE, DANS CET ORDRE                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  aFaire.forEach((x, i) => console.log('  ' + (i + 1) + '. ' + x));
  console.log('\n  (chaque ligne qui commence par un mot simple est une commande :');
  console.log('   node server/firebase-console.js <ce mot>)\n');
}

/* Le ménage des comptes anonymes : gratuit, réversible, sans effet sur qui travaille — un
   appareil actif s'en recrée un tout seul à l'ouverture suivante. */
async function cmdComptesMenage(tok) {
  const r = await api('https://identitytoolkit.googleapis.com/admin/v2/projects/' + PROJET + '/config?updateMask=autodeleteAnonymousUsers',
    { method: 'PATCH', body: JSON.stringify({ autodeleteAnonymousUsers: true }) }, tok);
  if (r.statut !== 200) { expliquerRefus(r); process.exit(1); }
  console.log('\n✅ Les comptes anonymes inactifs depuis 30 jours seront supprimés automatiquement.');
  console.log('   Sans effet sur qui travaille : un appareil actif s\'en recrée un à l\'ouverture.\n');
}

/* ── LES SAUVEGARDES FIRESTORE ──────────────────────────────────────────────────────────── */
const BASE_DB = () => 'https://firestore.googleapis.com/v1/projects/' + PROJET + '/databases/(default)';

async function cmdSauvegardes(tok) {
  const db = await api(BASE_DB(), null, tok);
  if (db.statut !== 200) { expliquerRefus(db); process.exit(1); }
  const pitr = db.j.pointInTimeRecoveryEnablement || 'POINT_IN_TIME_RECOVERY_DISABLED';
  console.log('\n══ Sauvegardes Firestore ══\n');
  console.log('  récupération à un instant donné : ' + (/ENABLED/.test(pitr) ? '✅ activée (7 jours de rattrapage)' : '⛔ DÉSACTIVÉE'));
  const sch = await api(BASE_DB() + '/backupSchedules', null, tok);
  if (sch.statut !== 200) { expliquerRefus(sch); process.exit(1); }
  const l = sch.j.backupSchedules || [];
  console.log('  sauvegardes programmées : ' + (l.length ? l.length : '⛔ AUCUNE'));
  l.forEach(s => console.log('      · ' + (s.dailyRecurrence ? 'chaque jour' : s.weeklyRecurrence ? 'chaque semaine' : '?') + ', gardée ' + (s.retention || '?')));
  if (!/ENABLED/.test(pitr) || !l.length) {
    console.log('\n⛔ Firestore porte les données VIVANTES de tes clients, et Google n\'en garde aucune');
    console.log('   copie pour toi par défaut : une suppression accidentelle serait définitive.');
    console.log('   → node server/firebase-console.js sauvegardes-activer\n');
  } else console.log('\n✅ Les données de Firestore sont couvertes.\n');
}

async function cmdSauvegardesActiver(tok) {
  console.log('\n══ Activer les sauvegardes Firestore ══\n');
  const db = await api(BASE_DB() + '?updateMask=pointInTimeRecoveryEnablement',
    { method: 'PATCH', body: JSON.stringify({ pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_ENABLED' }) }, tok);
  if (db.statut !== 200) { expliquerRefus(db); process.exit(1); }
  console.log('  ✅ récupération à un instant donné activée (7 jours).');
  const sch = await api(BASE_DB() + '/backupSchedules', null, tok);
  const deja = ((sch.j || {}).backupSchedules || []).length;
  if (deja) { console.log('  · ' + deja + ' sauvegarde(s) programmée(s) existent déjà — on n\'en ajoute pas.\n'); return; }
  /* Quatorze jours : au-delà du délai pendant lequel une bêtise passe inaperçue, et bien
     moins cher que les 30 jours du coffre du serveur, qui lui garde des archives entières. */
  const cree = await api(BASE_DB() + '/backupSchedules',
    { method: 'POST', body: JSON.stringify({ retention: (14 * 86400) + 's', dailyRecurrence: {} }) }, tok);
  if (cree.statut !== 200) { expliquerRefus(cree); process.exit(1); }
  console.log('  ✅ une sauvegarde par jour, gardée 14 jours.\n');
  await cmdSauvegardes(tok);
}

/* ── QUI PARLE, À QUEL PROJET, ET CE QU'IL A VRAIMENT LE DROIT DE FAIRE ─────────────────────
 *
 * ⛔ CETTE COMMANDE NE DEVINE RIEN, ELLE DEMANDE. Elle existe parce qu'un 403 a été « réparé »
 * deux fois dans l'IAM sans qu'on ait jamais constaté que le droit manquait — voir le
 * commentaire d'`expliquerRefus`. Trois mesures, dans l'ordre où elles peuvent invalider les
 * suivantes :
 *   1. l'identité RÉELLE du jeton, demandée à Google et non lue dans le fichier de clé : une
 *      clé remplacée ne change pas le nom du fichier, et on éditerait alors la mauvaise ligne ;
 *   2. le projet visé comparé au projet de la clé : s'ils diffèrent, tout rôle ajouté dans la
 *      console du premier est invisible à la demande, qui part au nom du second ;
 *   3. la liste des permissions que Google reconnaît à ce compte — `testIamPermissions` rend le
 *      sous-ensemble que l'appelant DÉTIENT, et n'exige aucun droit particulier pour répondre.
 *
 * ⛔ N'AFFICHE AUCUN SECRET : une adresse de compte de service, des noms de projet, des noms de
 * permission. Rien qui ne soit déjà lisible dans la console par qui y a accès.
 */
const DROITS_REQUIS = {
  'datastore.databases.get': 'lire l\'état des sauvegardes',
  'datastore.databases.update': 'activer le retour dans le temps (7 j)',
  'datastore.backupSchedules.list': 'lire les sauvegardes programmées',
  'datastore.backupSchedules.create': 'programmer une sauvegarde par jour',
  'firebaserules.releases.get': 'lire la règle publiée',
  'firebaserules.releases.update': 'publier la règle',
  'firebaserules.rulesets.create': 'publier la règle',
};

async function cmdDroits(tok) {
  console.log('\n══ Droits — qui parle, à quel projet, et ce qu\'il peut vraiment faire ══\n');

  /* 1. L'identité réelle du jeton. Le jeton est opaque : Google seul sait à qui il appartient,
     et c'est la seule façon de voir qu'un fichier de clé a été remplacé sous le même nom. */
  let identite = '', confirme = '';
  const ti = await api('https://oauth2.googleapis.com/tokeninfo?access_token=' + encodeURIComponent(tok), null, tok);
  if (ti.statut === 200 && ti.j) {
    identite = String(ti.j.email || '');
    /* Sans la portée `userinfo.email`, Google ne rend PAS d'adresse pour un jeton de compte de
       service — seulement son identifiant numérique. On ne va pas élargir la portée demandée
       pour si peu : `client_id` est dans TOUT fichier de clé Google, et le comparer prouve
       exactement ce qu'on veut savoir — le jeton appartient-il au compte écrit dans le
       fichier ? C'est la même question, répondue sans toucher à l'échange de jeton, qui est
       le chemin dont TOUTES les commandes dépendent. */
    const num = String(ti.j.sub || ti.j.azp || ti.j.aud || '');
    const attendu = String((cle && cle.client_id) || '');
    if (!identite && num && attendu) confirme = num === attendu ? 'oui' : 'non';
  }
  const affiche = identite || cle.client_email || '?';
  console.log('  compte de service : ' + affiche);
  if (identite && cle.client_email && identite !== cle.client_email)
    console.log('     ⛔ Google voit un AUTRE compte que celui écrit dans le fichier de clé (' + cle.client_email + ').');
  else if (confirme === 'oui') console.log('     ✅ c\'est bien ce compte-là : Google connaît le jeton sous le même identifiant.');
  else if (confirme === 'non') console.log('     ⛔ Google connaît ce jeton sous un AUTRE identifiant que celui du fichier de clé.');
  else if (!identite) console.log('     ⚠ identité non confirmée par Google — adresse lue dans le fichier de clé.');

  /* 2. Le piège silencieux : viser un projet avec la clé d'un autre. La console montrerait
     alors des rôles bien ajoutés, sur une ligne que la demande ne présente jamais. */
  const projetCle = String((cle && cle.project_id) || '');
  console.log('  projet visé       : ' + PROJET);
  console.log('  projet de la clé  : ' + (projetCle || '?'));
  if (projetCle && projetCle !== PROJET) {
    console.log('\n  ⛔ CE NE SONT PAS LE MÊME PROJET. Tout rôle ajouté dans l\'IAM de « ' + PROJET + ' »');
    console.log('     restera sans effet : la demande part au nom de la clé de « ' + projetCle + ' ».');
    console.log('     Corriger firebase.projectId dans config.json, ou poser la clé du bon projet.');
  }

  /* 3. Ce que Google reconnaît. `testIamPermissions` rend ce que l'appelant DÉTIENT : ce qui
     n'y figure pas manque vraiment, et ce qui y figure innocente l'IAM. */
  const noms = Object.keys(DROITS_REQUIS);
  const t = await api('https://cloudresourcemanager.googleapis.com/v1/projects/' + PROJET + ':testIamPermissions',
    { method: 'POST', body: JSON.stringify({ permissions: noms }) }, tok);
  if (t.statut !== 200) {
    console.log('\n  ⚠ Google refuse de dire ce que ce compte détient :');
    expliquerRefus(t);
    console.log('\n  Cette réponse-là est déjà un renseignement : un projet inconnu ou une API');
    console.log('  Cloud Resource Manager éteinte refusent ainsi, et aucun rôle n\'y changerait rien.');
    return;
  }
  const a = new Set(t.j.permissions || []);
  console.log('\n  ce que Google reconnaît à ce compte :\n');
  for (const p of noms) console.log('   ' + (a.has(p) ? '✅' : '⛔') + ' ' + p.padEnd(34) + ' ' + DROITS_REQUIS[p]);

  const manque = noms.filter(p => !a.has(p));
  if (!manque.length) {
    console.log('\n  ✅ Aucun droit ne manque. Si une commande refuse encore, la cause n\'est PAS l\'IAM :');
    console.log('     relancer cette commande — elle affiche désormais la phrase exacte de Google.');
  } else {
    const roles = new Set(manque.map(p => p.indexOf('datastore.') === 0
      ? 'roles/datastore.owner      « Propriétaire Cloud Datastore »'
      : 'roles/firebaserules.admin  « Administrateur des règles Firebase »'));
    console.log('\n  ⛔ ' + manque.length + ' droit(s) sur ' + noms.length + ' manquent réellement.');
    console.log('     Console Google Cloud → IAM et administration → IAM');
    console.log('     → vérifier d\'abord que le projet affiché EN HAUT est « ' + PROJET + ' »');
    console.log('     → ligne « ' + affiche + ' » → crayon → Ajouter un autre rôle :');
    for (const r of roles) console.log('        · ' + r);
    console.log('     → Enregistrer, attendre deux minutes, relancer cette commande.');
  }

  /* La contre-épreuve : on refait vraiment la demande qui refusait. Un droit reconnu par
     `testIamPermissions` mais refusé sur la ressource dit que la cause est ailleurs. */
  console.log('\n  ── contre-épreuve : la demande qui refusait ──');
  const db = await api(BASE_DB(), null, tok);
  if (db.statut === 200) console.log('  ✅ lecture de la base Firestore : elle passe.');
  else { console.log('  ⛔ lecture de la base Firestore : elle refuse encore.'); expliquerRefus(db); }
  console.log('');
}

(async () => {
  const cmd = (process.argv[2] || '').toLowerCase();
  if (!['etat', 'regles', 'regles-publier', 'sauvegardes', 'sauvegardes-activer', 'droits', 'comptes-menage'].includes(cmd)) {
    console.log('\nCommandes :');
    console.log('  etat                ⇦ TOUT ce qui compte, et ce qu\'il reste à faire');
    console.log('  regles              ce qui est VRAIMENT publié, comparé au dépôt');
    console.log('  regles-publier      publie firestore.rules (confirmation demandée)');
    console.log('  sauvegardes         état des sauvegardes Firestore');
    console.log('  sauvegardes-activer retour dans le temps + une sauvegarde par jour');
    console.log('  droits              \u21e6 POURQUOI \u00e7a refuse : identit\u00e9, projet, permissions r\u00e9elles');
    console.log('  comptes-menage      supprime les comptes anonymes inactifs (30 j)\n');
    process.exit(1);
  }
  const tok = await jeton();
  if (cmd === 'etat') return cmdEtat(tok);
  if (cmd === 'comptes-menage') return cmdComptesMenage(tok);
  if (cmd === 'regles') return cmdRegles(tok);
  if (cmd === 'regles-publier') return cmdReglesPublier(tok);
  if (cmd === 'sauvegardes') return cmdSauvegardes(tok);
  if (cmd === 'sauvegardes-activer') return cmdSauvegardesActiver(tok);
  if (cmd === 'droits') return cmdDroits(tok);
})().catch(e => { console.error('✗ ' + e.message); process.exit(1); });
