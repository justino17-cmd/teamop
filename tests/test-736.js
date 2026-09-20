/* ⛔ CE QUE CE FICHIER GARDE — UN REFUS DE GOOGLE NE SE RÉSUME PAS.

   Le 20 septembre 2026, `sauvegardes-activer` a rendu « ✗ REFUSÉ (403) : le compte de service
   n'a pas le droit de faire ça ». Cette phrase était écrite EN DUR dans `firebase-console.js`
   et s'affichait sur TOUT 403, quelle qu'en soit la cause — et c'était la SEULE branche du
   fichier qui jetait `r.txt`, c'est-à-dire les mots de Google. Deux rôles ont été ajoutés dans
   la console sur la foi de cette phrase. Le 403 est resté. Rien ne pouvait dire pourquoi.

   Trois causes rendent le MÊME 403, et une seule se répare dans l'IAM :
     · le rôle manque vraiment sur ce compte de service ;
     · l'API est éteinte sur le projet (`SERVICE_DISABLED`) — aucun rôle n'y changerait rien ;
     · la clé du serveur appartient à un AUTRE projet que celui visé — on ajoute alors des
       rôles dans une console qui n'est pas celle qui refuse, et on peut le faire longtemps.

   ⚠️ CE BANC N'EST PAS UNE LECTURE DE TEXTE. Il lance le VRAI fichier en sous-processus, avec
   un vrai couple de clés RSA (la signature JWT doit passer) et un faux Google préchargé par
   `--require`. Ce qu'il vérifie, ce sont les MOTS QUI SORTENT sur la sortie d'erreur — donc
   ce que Justin lit dans son terminal, pas ce que le code a l'air de faire.

   Le motif de méthode qui a tout coûté ici est écrit dans CLAUDE.md : « un motif de banc doit
   viser du CODE, jamais une phrase ». Ce fichier est très commenté, et les mots
   `datastore.owner`, `SERVICE_DISABLED`, `droits` apparaissent tous dans les commentaires. Le
   seul contrôle qui lit le fichier (l'absence de l'ancienne phrase) le fait donc COMMENTAIRES
   RETIRÉS — sans quoi il resterait rouge pour toujours, le commentaire d'`expliquerRefus`
   citant la phrase qu'il a remplacée. */
const { execFileSync } = require('child_process');
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = a === b; bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

/* ── Le bac à sable : une vraie clé RSA, un faux Google ──────────────────────────────────── */
const BAC = fs.mkdtempSync(path.join(os.tmpdir(), 'fbconsole-'));
const { privateKey } = crypto.generateKeyPairSync('rsa', { modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' }, publicKeyEncoding: { type: 'spki', format: 'pem' } });

function poserCle(clientEmail, projectId) {
  const p = path.join(BAC, 'fb-admin.json');
  fs.writeFileSync(p, JSON.stringify({ client_email: clientEmail, project_id: projectId, client_id: '104729384756102938475', private_key: privateKey }));
  return p;
}
function poserConfig(projectId) {
  const p = path.join(BAC, 'config.json');
  fs.writeFileSync(p, JSON.stringify(projectId ? { firebase: { projectId } } : {}));
  return p;
}

/* Le faux Google est préchargé AVANT le script : `--require` s'exécute en premier, donc le
   `fetch` global est déjà remplacé quand `firebase-console.js` l'appelle. Rien d'autre n'est
   simulé — la signature JWT, le parcours des commandes et l'affichage sont les vrais. */
const STUB = path.join(BAC, 'faux-google.js');
fs.writeFileSync(STUB, `
const S = JSON.parse(process.env.SCENARIO || '{}');
globalThis.fetch = async (url, opts) => {
  url = String(url);
  const rep = (statut, corps) => ({ status: statut, text: async () => typeof corps === 'string' ? corps : JSON.stringify(corps) , json: async () => typeof corps === 'string' ? JSON.parse(corps) : corps });
  /* Ordre PIEGEUX : '/tokeninfo' CONTIENT '/token'. Teste dans l'autre sens, ce faux Google
     repondait un jeton d'acces a la demande d'identite, et le banc voyait vert la branche
     << identite non confirmee >> sans jamais exercer la bonne. */
  if (url.indexOf('oauth2.googleapis.com/tokeninfo') >= 0) {
    if (S.tokeninfoSub) return rep(200, { sub: S.tokeninfoSub, scope: 'https://www.googleapis.com/auth/cloud-platform' });
    if (!S.tokeninfo) return rep(400, { error: 'invalid_token' });
    return rep(200, { email: S.tokeninfo });
  }
  if (url.indexOf('oauth2.googleapis.com/token') >= 0) return rep(200, { access_token: 'jeton-de-banc' });
  if (url.indexOf(':testIamPermissions') >= 0) {
    if (S.iamStatut && S.iamStatut !== 200) return rep(S.iamStatut, S.iamCorps || {});
    const demandees = JSON.parse((opts && opts.body) || '{}').permissions || [];
    const tenues = S.permissions === 'toutes' ? demandees : demandees.filter(p => (S.permissions || []).includes(p));
    return rep(200, { permissions: tenues });
  }
  if (url.indexOf('firestore.googleapis.com') >= 0) {
    if (S.dbStatut && S.dbStatut !== 200) return rep(S.dbStatut, S.dbCorps || {});
    if (url.indexOf('backupSchedules') >= 0) return rep(200, { backupSchedules: [] });
    return rep(200, { locationId: 'eur3', pointInTimeRecoveryEnablement: 'POINT_IN_TIME_RECOVERY_DISABLED' });
  }
  return rep(200, {});
};
`);

function lancer(cmd, scenario, opts) {
  const o = opts || {};
  const env = Object.assign({}, process.env, {
    SCENARIO: JSON.stringify(scenario || {}),
    TEAMOP_FB_ADMIN: poserCle(o.cleEmail || 'firebase-adminsdk-fbsvc@elan-gestion.iam.gserviceaccount.com', o.cleProjet || 'elan-gestion'),
    TEAMOP_CONFIG: poserConfig(o.configProjet || 'elan-gestion'),
  });
  /* ⛔ LA SORTIE D'ERREUR VA DANS UN FICHIER, ET ON LA RELIT DANS LES DEUX CAS.
     `execFileSync` ne REND que stdout quand la commande aboutit, et `e.stderr` est NUL quand
     stderr n'est pas un tuyau. Les deux pièges se compensaient : en tuyau, les refus d'une
     commande qui aboutit quand même étaient perdus ; en fichier, ceux d'une commande qui
     échoue l'étaient. Or `expliquerRefus` écrit TOUT sur stderr — c'est-à-dire tout ce que ce
     banc existe pour lire. */
  const errF = path.join(BAC, 'err.txt');
  const fd = fs.openSync(errF, 'w');
  let code = 0, sortie = '';
  try {
    sortie = execFileSync(process.execPath, ['--require', STUB, 'server/firebase-console.js', cmd],
      { env, encoding: 'utf8', stdio: ['ignore', 'pipe', fd], cwd: path.join(__dirname, '..') });
  } catch (e) {
    code = e.status === undefined ? -1 : e.status;
    sortie = String(e.stdout || '');
  }
  try { fs.closeSync(fd); } catch (e) {}
  return { code, sortie: sortie + fs.readFileSync(errF, 'utf8') };
}

/* Google refuse en nommant la permission ET la ressource. C'est CE message qui manquait. */
const REFUS_PERMISSION = { error: { code: 403, status: 'PERMISSION_DENIED',
  message: "Permission 'datastore.databases.update' denied on resource '//firestore.googleapis.com/projects/elan-gestion/databases/(default)' (or it may not exist)." } };
const REFUS_SERVICE = { error: { code: 403, status: 'PERMISSION_DENIED',
  message: 'Cloud Firestore API has not been used in project elan-gestion before or it is disabled. Enable it by visiting https://console.developers.google.com/apis/api/firestore.googleapis.com/overview?project=elan-gestion then retry.',
  details: [{ reason: 'SERVICE_DISABLED', metadata: { service: 'firestore.googleapis.com' } }] } };

console.log('\n══ 1. UN 403 DIT CE QUE GOOGLE A DIT, PAS CE QUE LE FICHIER SUPPOSE ══\n');
{
  const r = lancer('sauvegardes', { dbStatut: 403, dbCorps: REFUS_PERMISSION });
  vrai('la permission exacte que Google nomme est affichée',
    r.sortie.indexOf("Permission 'datastore.databases.update' denied") >= 0);
  vrai('la ressource visée est affichée', /projects\/elan-gestion\/databases/.test(r.sortie));
  vrai("l'ancienne phrase inventée ne s'affiche plus",
    r.sortie.indexOf("n'a pas le droit de faire ça") < 0);
  vrai('et on est renvoyé vers la MESURE, pas vers la console', /firebase-console\.js droits/.test(r.sortie));
  v('la commande échoue toujours (code 1)', r.code, 1);
}
{
  /* Le cas qui ne se répare PAS dans l'IAM. Confondu avec le précédent, il envoie ajouter des
     rôles pour toujours : ils sont peut-être déjà là, et l'API reste éteinte. */
  const r = lancer('sauvegardes', { dbStatut: 403, dbCorps: REFUS_SERVICE });
  vrai("une API éteinte est nommée comme telle", /PAS un problème de rôle/.test(r.sortie));
  vrai("le motif technique de Google est repris", /SERVICE_DISABLED/.test(r.sortie));
  vrai("le service concerné est nommé", /firestore\.googleapis\.com/.test(r.sortie));
  vrai("le lien d'activation de Google survit à l'affichage",
    r.sortie.indexOf('console.developers.google.com') >= 0);
  vrai("et on n'envoie PAS chercher un rôle", r.sortie.indexOf('droits') < 0 || !/ajouter le rôle/.test(r.sortie));
}
{
  const r = lancer('sauvegardes', { dbStatut: 500, dbCorps: { error: { message: 'backend error' } } });
  vrai('un 500 dit aussi les mots de Google', /backend error/.test(r.sortie));
  vrai('sans proposer une cause qui ne le concerne pas', !/PAS un problème de rôle/.test(r.sortie));
}

console.log('\n══ 2. « droits » MESURE, IL NE DEVINE PAS ══\n');
{
  const r = lancer('droits', { tokeninfo: 'firebase-adminsdk-fbsvc@elan-gestion.iam.gserviceaccount.com', permissions: 'toutes' });
  v('la commande aboutit', r.code, 0);
  vrai("l'identité confirmée par Google est affichée",
    /firebase-adminsdk-fbsvc@elan-gestion\.iam\.gserviceaccount\.com/.test(r.sortie));
  vrai('les sept droits attendus sont listés', (r.sortie.match(/✅ (datastore|firebaserules)\./g) || []).length === 7);
  vrai("quand rien ne manque, l'IAM est explicitement innocentée", /n'est PAS l'IAM/.test(r.sortie));
  vrai('aucun rôle n\'est proposé dans ce cas', !/Ajouter un autre rôle/.test(r.sortie));
  vrai('la contre-épreuve rejoue la demande qui refusait', /contre-épreuve/.test(r.sortie));
  vrai('et elle passe', /lecture de la base Firestore : elle passe/.test(r.sortie));
}
{
  /* Le cas réel de Justin : les règles marchent (elles ont été publiées le 18), les
     sauvegardes refusent. Le banc exige que le COMPTE des manques soit juste — un compteur
     faux fait chercher au mauvais endroit. */
  const r = lancer('droits', { tokeninfo: 'firebase-adminsdk-fbsvc@elan-gestion.iam.gserviceaccount.com',
    permissions: ['firebaserules.releases.get', 'firebaserules.releases.update', 'firebaserules.rulesets.create'],
    dbStatut: 403, dbCorps: REFUS_PERMISSION });
  vrai('les quatre droits datastore manquants sont comptés', /4 droit\(s\) sur 7 manquent/.test(r.sortie));
  vrai('le rôle à ajouter est nommé, une seule fois', (r.sortie.match(/roles\/datastore\.owner/g) || []).length === 1);
  vrai("le rôle des règles n'est PAS proposé puisqu'il est déjà là",
    r.sortie.indexOf('roles/firebaserules.admin') < 0);
  vrai('le projet à vérifier en haut de la console est nommé', /projet affiché EN HAUT est « elan-gestion »/.test(r.sortie));
  vrai("la ligne d'IAM à ouvrir est nommée", /ligne « firebase-adminsdk-fbsvc@/.test(r.sortie));
  vrai('la contre-épreuve montre que ça refuse encore', /elle refuse encore/.test(r.sortie));
}
{
  /* ⛔ LE CAS QUI EXPLIQUERAIT DEUX RÔLES AJOUTÉS EN VAIN. La console montre les rôles bien
     posés, sur une ligne que la demande ne présente jamais. */
  const r = lancer('droits', { tokeninfo: 'firebase-adminsdk-fbsvc@autre-projet.iam.gserviceaccount.com', permissions: [] },
    { cleProjet: 'autre-projet', cleEmail: 'firebase-adminsdk-fbsvc@autre-projet.iam.gserviceaccount.com', configProjet: 'elan-gestion' });
  vrai('deux projets différents sont signalés', /CE NE SONT PAS LE MÊME PROJET/.test(r.sortie));
  vrai('le projet visé est nommé', /IAM de « elan-gestion »/.test(r.sortie));
  vrai('le projet de la clé est nommé', /clé de « autre-projet »/.test(r.sortie));
  vrai('et le geste correctif ne parle plus de rôle', /config\.json, ou poser la clé du bon projet/.test(r.sortie));
}
{
  /* Une clé remplacée sous le même nom de fichier : on éditerait la mauvaise ligne d'IAM. */
  const r = lancer('droits', { tokeninfo: 'un-autre-compte@elan-gestion.iam.gserviceaccount.com', permissions: 'toutes' });
  vrai("Google voyant un autre compte que le fichier, c'est dit",
    /Google voit un AUTRE compte/.test(r.sortie));
  vrai("et la ligne d'IAM proposée est celle que Google voit, pas celle du fichier",
    r.sortie.indexOf('compte de service : un-autre-compte@') >= 0);
}
{
  const r = lancer('droits', { permissions: 'toutes' });   /* tokeninfo refuse */
  vrai("une identité non confirmée est signalée, pas tue", /identité non confirmée/.test(r.sortie));
  vrai("et on retombe sur l'adresse du fichier de clé", /firebase-adminsdk-fbsvc@elan-gestion/.test(r.sortie));
}
{
  /* ⚠️ LE CAS RÉEL, MESURÉ SUR LE VPS LE 20 SEPTEMBRE 2026 : sans la portée `userinfo.email`,
     Google ne rend PAS d'adresse pour un jeton de compte de service — seulement un identifiant
     numérique. La commande répondait donc « identité non confirmée » à la seule question qu'elle
     existe pour trancher. Élargir la portée aurait touché l'échange de jeton, dont TOUTES les
     commandes dépendent, et que ce banc ne peut pas éprouver contre le vrai Google. `client_id`
     est dans tout fichier de clé : le comparer répond à la même question sans rien risquer. */
  const r = lancer('droits', { tokeninfoSub: '104729384756102938475', permissions: 'toutes' });
  vrai("un jeton sans adresse est quand même confirmé par son identifiant",
    /c'est bien ce compte-là/.test(r.sortie));
  vrai("et on ne dit plus « non confirmée » dans ce cas", !/identité non confirmée/.test(r.sortie));
}
{
  const r = lancer('droits', { tokeninfoSub: '999999999999999999999', permissions: 'toutes' });
  vrai("un identifiant qui ne correspond pas est signalé",
    /AUTRE identifiant que celui du fichier/.test(r.sortie));
  vrai("et il n'est pas confondu avec une confirmation", !/c'est bien ce compte-là/.test(r.sortie));
}
{
  /* Si Google refuse de dire ce qu'on détient, la commande ne doit ni mentir ni tomber. */
  const r = lancer('droits', { tokeninfo: 'firebase-adminsdk-fbsvc@elan-gestion.iam.gserviceaccount.com',
    iamStatut: 403, iamCorps: REFUS_SERVICE });
  v('la commande ne tombe pas', r.code, 0);
  vrai('le refus est rapporté avec les mots de Google', /SERVICE_DISABLED/.test(r.sortie));
  vrai('et ce refus est lui-même présenté comme un renseignement', /déjà un renseignement/.test(r.sortie));
  vrai("aucune liste de droits n'est inventée", !/✅ datastore\./.test(r.sortie));
}

console.log('\n══ 3. LA COMMANDE EST ATTEIGNABLE — SANS QUOI RIEN DE CE QUI PRÉCÈDE NE SERT ══\n');
{
  const r = lancer('', {});
  vrai("« droits » figure dans l'aide", /^\s*droits\s/m.test(r.sortie));
  const r2 = lancer('droits-inconnu', {});
  vrai("une commande inconnue rend toujours l'aide", /Commandes :/.test(r2.sortie));
}
{
  /* ⛔ COMMENTAIRES RETIRÉS : le commentaire d'`expliquerRefus` CITE la phrase supprimée pour
     expliquer pourquoi elle l'a été. Chercher dans le texte brut garderait ce banc rouge à
     jamais — et chercher une phrase plutôt qu'un comportement est précisément l'erreur que
     CLAUDE.md décrit trois fois. */
  const SRC = fs.readFileSync(path.join(__dirname, '..', 'server', 'firebase-console.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai("aucune cause de 403 n'est plus écrite en dur dans le code",
    SRC.indexOf("n'a pas le droit de faire ça") < 0);
  vrai('`droits` est bien branché dans le répartiteur', /cmd === 'droits'\s*\)\s*return cmdDroits/.test(SRC));
  vrai("et `expliquerRefus` affiche bien le corps de la réponse", /motsDeGoogle\(r\)/.test(SRC));
}

try { fs.rmSync(BAC, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
