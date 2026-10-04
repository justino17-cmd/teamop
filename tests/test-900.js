/* ⛔ CE QUE CE FICHIER GARDE — OP MESSAGES ET OP GESTION SE SÉPARENT (famille 1 de SERVEUR.md § 3.11).

   Décision de Justin, 22 septembre puis 1er octobre 2026 : OP MESSAGES est « tout et séparé » — des
   comptes de PERSONNES, son propre serveur, « pas sur Firebase ». Les deux modèles d'identité ne se
   transposent pas (l'étape A du socle a été retirée pour ça). Ce banc est ce qui empêche la séparation
   de se défaire sans bruit : un `require('../server/…')` « pour gagner du temps », un chemin
   `/opt/teamop` copié de l'autre installation, un domaine tiers.

   ⛔ CE BANC LIT DU CODE, PAS DES PHRASES : les commentaires sont retirés avant de chercher (le dépôt
   est très commenté, et le nom d'un chemin interdit apparaît justement dans la phrase qui l'explique).
   ⛔ ET IL EXÉCUTE LA GARDE : le démarrage est LANCÉ sous `/opt/teamop` et `/etc/teamop` (chemin brut,
   `..`, lien symbolique) et doit sortir en erreur AVANT de créer quoi que ce soit.

   Les mutations qui le font tomber sont décrites dans `REPRISE.md` (« OP MESSAGES — serveur, étape 1 »). */

const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const MSG = T.SERVICE, RACINE = T.RACINE;

function fichiers(dossier, sortie = []) {
  for (const e of fs.readdirSync(dossier, { withFileTypes: true })) {
    if (e.name === 'node_modules') continue;
    const p = path.join(dossier, e.name);
    if (e.isDirectory()) fichiers(p, sortie); else sortie.push(p);
  }
  return sortie;
}
const rel = (p) => path.relative(RACINE, p);
const code = (p) => {
  let s = fs.readFileSync(p, 'utf8');
  if (/\.html$/.test(p)) s = s.replace(/<!--[\s\S]*?-->/g, ' ');
  return T.sansCommentaires(s);
};
const tous = fichiers(MSG);
const sources = tous.filter(p => /\.(js|html)$/.test(p));
vrai('population : des fichiers de code à examiner (un zéro sur du vide ne prouve rien)', sources.length >= 10);

console.log('Aucun code partagé à l\'exécution avec server/');
{
  const fautifs = [];
  for (const p of sources.filter(x => x.endsWith('.js'))) {
    const c = code(p);
    for (const m of c.matchAll(/require\(\s*['"`]([^'"`]+)['"`]\s*\)/g)) {
      const cible = m[1];
      if (!cible.startsWith('.')) continue;
      const abs = path.resolve(path.dirname(p), cible);
      if (!abs.startsWith(MSG + path.sep) && abs !== MSG) fautifs.push(rel(p) + ' → ' + cible);
    }
    if (/\.\.\/server\b|\bserver\//.test(c.replace(/server-msg/g, ''))) fautifs.push(rel(p) + ' nomme server/');
  }
  v('⛔ aucun require qui sorte de server-msg/, aucune mention de server/', fautifs, []);
  const cote = fichiers(path.join(RACINE, 'server')).filter(p => p.endsWith('.js')).filter(p => /server-msg/.test(fs.readFileSync(p, 'utf8')));
  v('⛔ OP GESTION ne sait pas qu\'OP MESSAGES existe (rien dans server/ ne le nomme)', cote.map(rel), []);
}

console.log('\nAucun chemin d\'OP GESTION, aucun domaine tiers, aucune adresse de machine');
{
  const interdits = [];
  const permis = new Set(['config.js', 'poser-cle.js']);   // la garde de séparation les NOMME — pour les refuser
  for (const p of sources) {
    const c = code(p), nom = path.basename(p);
    if (/\/(opt|etc)\/teamop/.test(c) && !permis.has(nom)) interdits.push(nom + ' : chemin /opt|/etc/teamop');
    /* ⛔ UNE SECONDE EXCEPTION, NOMMÉE : `push.js` porte la LISTE BLANCHE des services push des navigateurs — celui de Chrome s'appelle `fcm.googleapis.com`. Ce n'est pas Firebase (le produit) : c'est la
       boîte aux lettres que le navigateur d'une personne impose pour la réveiller. On retire de ce fichier les noms exacts de la liste (et rien d'autre : toute autre trace de Firebase y reste interdite). */
    const sansListePush = nom === 'push.js' ? c.replace(/fcm\.googleapis\.com/g, '') : c;
    if (/firebase|firestore|googleapis|gstatic|google\.com|fcm\./i.test(sansListePush)) interdits.push(nom + ' : trace de Firebase / Google');
    /* ⛔ UNE SEULE EXCEPTION, NOMMÉE : `sms-ovh.js` porte les trois points d'entrée de l'API d'OVHcloud (Europe, Canada, États-Unis) — le
       prestataire SMS est une décision de Justin (1er octobre 2026), et la production refuse toute autre base (nos clés de signature ne
       partent pas ailleurs). Tout autre fichier, et tout autre hôte dans celui-là, reste interdit. */
    for (const m of c.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)) {
      if (/^(127\.0\.0\.1|localhost)(:\d+)?$/.test(m[1])) continue;
      if (nom === 'sms-ovh.js' && /^(?:eu|ca)\.api\.ovh\.com$|^api\.us\.ovhcloud\.com$/.test(m[1])) continue;
      /* ⛔ UNE TROISIÈME EXCEPTION, NOMMÉE : `facturation.js` appelle `api.stripe.com` — Messages Pro se paie par Stripe (SERVEUR.md § 3.8, décision de Justin), par `fetch`, sans
         bibliothèque. Le nom d'hôte est une CONSTANTE de ce seul fichier, et la porte de test des bancs (`OPMSG_TEST_STRIPE`) est refusée en production. Tout autre fichier, et tout autre
         hôte dans celui-là, reste interdit. */
      if (nom === 'facturation.js' && m[1] === 'api.stripe.com') continue;
      interdits.push(nom + ' : adresse ' + m[1]);
    }
    /* ⛔ UNE QUATRIÈME EXCEPTION, NOMMÉE ET CHIFFRÉE : `outils/verifier-relais.js` (le contrôle du relais d'appels que lance `install-turn.sh`) porte les adresses de PAIRS que le relais doit REFUSER (un réseau privé, le lien
       local de l'hébergeur…) et une adresse publique qu'il doit ACCEPTER. Ce sont les opérandes d'un test, jamais une destination de connexion : l'outil ne se connecte qu'à l'hôte et au port de la configuration de l'instance.
       Ces sept adresses-là, et aucune autre dans ce fichier ni aucune dans les autres. */
    const IP_DU_CONTROLE = new Set(['10.1.2.3', '172.16.5.5', '192.168.1.1', '169.254.169.254', '100.64.1.1', '0.0.0.1', '93.184.216.34']);
    for (const m of c.matchAll(/\b(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\b/g)) if (m[1] !== '127.0.0.1' && !(nom === 'verifier-relais.js' && IP_DU_CONTROLE.has(m[1]))) interdits.push(nom + ' : adresse IP ' + m[1]);
    if (/teamop\.fr/i.test(c)) interdits.push(nom + ' : domaine teamop.fr en dur');
  }
  v('⛔ ni /opt/teamop (hors la garde), ni Firebase, ni domaine, ni IP autre que la boucle locale', interdits, []);
  const cfg = fs.readFileSync(path.join(MSG, 'config.js'), 'utf8');
  vrai('la garde nomme bien les deux arbres refusés (elle existe, elle n\'est pas qu\'une phrase)', /INTERDITS = \['\/opt\/teamop', '\/etc\/teamop'\]/.test(code(path.join(MSG, 'config.js'))) && cfg.length > 0);
}

console.log('\nLes dépendances sont celles d\'OP GESTION, aux mêmes versions');
{
  const a = JSON.parse(fs.readFileSync(path.join(MSG, 'package.json'), 'utf8')), b = JSON.parse(fs.readFileSync(path.join(RACINE, 'server', 'package.json'), 'utf8'));
  const DECLAREES = Object.keys(a.dependencies).sort();
  v('trois dépendances (surface d\'attaque) : express, nodemailer AVEC le code qui l\'importe (`courriel.js`, étape 6) et web-push AVEC le sien (`push.js`, étape 2)', DECLAREES, ['express', 'nodemailer', 'web-push']);
  /* ⛔ Une dépendance déclarée que personne n'importe est de la surface d'attaque pour rien (relecture du gardien, point 13) :
     chaque dépendance de package.json est `require`d par au moins un fichier du service. */
  const requis = new Set();
  for (const p of sources) for (const m of code(p).matchAll(/require\(\s*['"]([^'".\/][^'"]*)['"]\s*\)/g)) requis.add(m[1].split('/')[0]);
  v('⛔ chaque dépendance déclarée est importée par le service (aucune dépendance morte)', DECLAREES.filter(k => !requis.has(k)), []);
  v('mêmes versions que server/package.json', DECLAREES.map(k => a.dependencies[k] === b.dependencies[k]), DECLAREES.map(() => true));
  vrai('un package-lock.json est commité', fs.existsSync(path.join(MSG, 'package-lock.json')));
  const lock = JSON.parse(fs.readFileSync(path.join(MSG, 'package-lock.json'), 'utf8')), lockB = JSON.parse(fs.readFileSync(path.join(RACINE, 'server', 'package-lock.json'), 'utf8'));
  v('versions RÉSOLUES identiques à celles d\'OP GESTION',
    DECLAREES.map(k => ((lock.packages['node_modules/' + k] || {}).version !== undefined) && (lock.packages['node_modules/' + k] || {}).version === (lockB.packages['node_modules/' + k] || {}).version), DECLAREES.map(() => true));
  v('⛔ le verrou porte nodemailer (parce que `courriel.js` l\'importe) et web-push (parce que `push.js` l\'importe) — et rien qu\'eux deux en plus d\'express : npm ci n\'installe rien d\'inutilisé', [Object.keys(lock.packages).filter(k => /node_modules\/nodemailer$/.test(k)), Object.keys(lock.packages).filter(k => /node_modules\/web-push$/.test(k))], [['node_modules/nodemailer'], ['node_modules/web-push']]);
  v('⛔ nodemailer se charge au premier ENVOI, jamais au démarrage (un service sans relais ne le demande pas) : le seul `require(\'nodemailer\')` du service est dans la fonction qui crée le transport', sources.filter(p => /require\(\s*['"]nodemailer['"]\s*\)/.test(code(p))).map(rel), ['server-msg/courriel.js']);
  const gi = fs.readFileSync(path.join(RACINE, '.gitignore'), 'utf8');
  vrai('server-msg/node_modules est ignoré (jamais commité)', /^server-msg\/node_modules\/$/m.test(gi));
}

console.log('\nLes listes de bancs sont disjointes');
{
  const lire = (f) => { try { return fs.readFileSync(path.join(RACINE, 'scripts', f), 'utf8').split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')); } catch (e) { return null; } };
  const msg = lire('bancs-messages.liste'), srv = lire('bancs-serveur.liste');
  vrai('population : la liste d\'OP MESSAGES existe et nomme des suites', msg && msg.length >= 8);
  v('⛔ aucune suite commune avec la liste du serveur d\'OP GESTION', msg.filter(x => srv.includes(x)), []);
  v('chaque suite nommée existe (une liste qui nomme un absent fait échouer le compteur)', msg.filter(x => !fs.existsSync(path.join(RACINE, x))), []);
  const brut = fs.readFileSync(path.join(RACINE, 'scripts', 'bancs-messages.liste'), 'utf8');
  const pl = /^#plancher (\d+)\s*$/m.exec(brut);
  vrai('la liste porte une ligne « #plancher N » (un seul plancher)', pl && (brut.match(/^#plancher /gm) || []).length === 1);
  vrai('le plancher est réel, pas symbolique (plus de 500 vérifications)', pl && parseInt(pl[1], 10) > 500);
  v('les numéros de suites d\'OP MESSAGES sont dans 900-939, 941-944 (le générateur de l\'interface, renuméroté à la fusion avec le compte Perso ; puis les pièces : 942 le module, 943 le service, 944 l\'appareil et le service), 950-959 (la sauvegarde hors site, étape 3 : 950 et 951 ; puis les notifications push et le compte : 955 le module, 956 le service, 957 l\'export et la suppression, 958 l\'appareil et le service) 960-969 (les espaces professionnels et Messages Pro, étape 5) 970-979 (les réunions programmées, étape 6 : 970 le calendrier, 971 le fichier .ics, 972 le stockage, 973 les routes, 974 le planificateur de rappels, 975 le courriel, 976 l\'interface) ou 980-989 (les appels à deux, étape 7 : 980 le stockage, 981 les routes, 982 le script du relais, 983 le service et le temps, 984 la page et le service ; puis, pour l\'étape 8, les appels à plusieurs et les salles : 986 le stockage, 987 les routes, 988 les réunions, 989 le temps, 990 la page et le service) ou 990-999', msg.filter(x => !/test-(?:9[0-3]\d|94[1-4]|95\d|96\d|97\d|98\d|99\d)\.js$/.test(x)), []);
}

console.log('\nUn jeton de session d\'OP MESSAGES n\'est pas lisible par OP GESTION');
{
  const src = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8') + fs.readFileSync(path.join(RACINE, 'server', 'comptes.js'), 'utf8');
  const re = /\/\^Bearer\\s\+\(\[A-Fa-f0-9\]\{64\}\)\$\//.exec(src);
  vrai('population : la regex Bearer d\'OP GESTION est trouvée dans son code', re);
  const jeton = 'opm_' + require('crypto').randomBytes(32).toString('base64url');
  vrai('un jeton `opm_…` (préfixe + 43 caractères) ne passe pas `Bearer [A-Fa-f0-9]{64}`', !/^Bearer\s+([A-Fa-f0-9]{64})$/.test('Bearer ' + jeton));
  const routes = fs.readFileSync(path.join(MSG, 'app.js'), 'utf8');
  vrai('le service lit sa session dans un COOKIE de la forme opm_, pas dans Authorization', /\^opm_\[A-Za-z0-9_-\]\{43\}\$/.test(routes) && !/authorization/i.test(code(path.join(MSG, 'app.js'))));
}

console.log('\nLe démarrage est REFUSÉ sous /opt/teamop et /etc/teamop — avant de créer quoi que ce soit');
{
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-900-'));
  const cred = path.join(bac, 'cred'); fs.mkdirSync(cred); fs.writeFileSync(path.join(cred, 'kek'), 'ab'.repeat(32));
  const cfg = path.join(bac, 'config.json'); fs.writeFileSync(cfg, '{}');
  const lancer = (env) => spawnSync(process.execPath, [path.join(MSG, 'index.js')], { encoding: 'utf8', timeout: 10000, env: Object.assign({}, process.env, { OPMSG_INSTANCE: 'beta', PORT: '1', CREDENTIALS_DIRECTORY: cred, OPMSG_CONFIG: cfg, OPMSG_DATA: path.join(bac, 'data') }, env) });
  const sortieSaine = lancer({ PORT: '0' });
  // témoin : un démarrage SAIN dépasse la garde (il échoue plus loin sur le port 1, ce n'est pas elle)
  vrai('témoin : avec des chemins sains la garde ne refuse pas (la sortie ne parle pas de séparation)', !/separation/.test(sortieSaine.stdout + sortieSaine.stderr));
  const cas = [
    ['données sous /opt/teamop', { OPMSG_DATA: '/opt/teamop/data-msg-banc' }],
    ['données sous /opt/teamop par « .. »', { OPMSG_DATA: '/opt/opmsg/../teamop/data-msg-banc' }],
    ['configuration sous /etc/teamop', { OPMSG_CONFIG: '/etc/teamop/msg-banc.json' }],
    ['clé (credential) sous /etc/teamop', { CREDENTIALS_DIRECTORY: '/etc/teamop/cred-banc' }],
    ['données sous /opt/teamop elle-même', { OPMSG_DATA: '/opt/teamop' }],
  ];
  const optExistait = fs.existsSync('/opt/teamop');
  for (const [nom, env] of cas) {
    const r = lancer(env);
    vrai('⛔ ' + nom + ' → sortie en erreur, motif « séparation »', r.status === 1 && /separation|séparation/i.test(r.stdout + r.stderr));
  }
  /* En tant que root (conteneur, VPS) `mkdir` sous /opt réussirait : c'est ce qui rend ce contrôle
     discriminant — un refus qui arriverait APRÈS la création laisserait le dossier derrière lui. */
  vrai('⛔ rien n\'a été créé sous /opt/teamop ni /etc/teamop par ces essais (la garde passe AVANT tout dossier)',
    !fs.existsSync('/opt/teamop/data-msg-banc') && !fs.existsSync('/etc/teamop/cred-banc') && (optExistait || !fs.existsSync('/opt/teamop')));
  vrai('⛔ le dossier de données sain n\'a pas été créé non plus par un refus', !fs.existsSync(path.join(bac, 'data')));
  try { fs.rmSync('/opt/teamop/data-msg-banc', { recursive: true, force: true }); if (!optExistait) fs.rmdirSync('/opt/teamop'); } catch (e) {}
  // un lien symbolique ne contourne pas la garde (la fonction pure, avec une racine « interdite » de bac à sable)
  const { verifierSeparation } = require(path.join(MSG, 'config.js'));
  const interdit = path.join(bac, 'arbre-interdit'); fs.mkdirSync(path.join(interdit, 'sous'), { recursive: true });
  const lien = path.join(bac, 'lien'); fs.symlinkSync(interdit, lien);
  let refuse = false;
  try { verifierSeparation({ OPMSG_DATA: path.join(lien, 'sous', 'x') }, [interdit]); } catch (e) { refuse = e.code === 'SEPARATION'; }
  vrai('⛔ un lien symbolique vers l\'arbre interdit est refusé (le chemin est RÉSOLU avant de comparer)', refuse);
  let accepte = true;
  try { verifierSeparation({ OPMSG_DATA: path.join(bac, 'ailleurs') }, [interdit]); } catch (e) { accepte = false; }
  vrai('contre-épreuve : un chemin hors de l\'arbre interdit passe', accepte);
  let voisin = true;
  try { verifierSeparation({ OPMSG_DATA: interdit + '-voisin/x' }, [interdit]); } catch (e) { voisin = false; }
  vrai('un dossier au NOM voisin (arbre-interdit-voisin) n\'est pas pris pour l\'arbre interdit', voisin);
  fs.rmSync(bac, { recursive: true, force: true });
}

fin();
