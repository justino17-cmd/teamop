/* ⛔ CE QUE CE FICHIER GARDE — L'INSTALLATION D'OP MESSAGES, EXÉCUTÉE DANS UN BAC À SABLE.

   `server-msg/install-msg.sh` est lancé par Justin, en root, sur le VPS où tourne OP GESTION. Il a trois
   façons de mal tourner, et aucune ne se voit à la lecture :
     · toucher à OP GESTION (le bloc d'`api.teamop.fr`, `/opt/teamop`, `teamop-api`) ;
     · AFFICHER un secret — Justin recolle toutes ses sorties dans la conversation (règle du 24 septembre 2026) ;
     · générer une clé maître neuve par-dessus des bases existantes (c'est ce que faisait `install.sh` le
       19 septembre : un commentaire promettait « jamais », le code testait la présence du FICHIER).
   Ce banc l'EXÉCUTE (modèle `test-729`) : racine factice, dépôt d'origine réel, faux `systemctl`/`nginx`/`caddy`/
   `certbot`/`useradd`/`chown`/`runuser` qui journalisent — voir `tests/bac-messages.js`. Il ne lit du texte
   que pour ce qu'un bac ne peut pas jouer.

   ⚠️ Les clés de ce banc sont des CANARIS (64 hexadécimaux reconnaissables) : on les cherche dans tout ce
   que le script a le droit d'écrire à l'écran — et dans rien d'autre que leur fichier. */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { bac, banc } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const CLE = 'c0ffee' + 'ab12'.repeat(14) + '0f';               // 64 hexadécimaux, reconnaissable
const CLE2 = 'beef01' + '9a8b'.repeat(14) + 'e1';
const PUB = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGq6Fake0Fake0Fake0Fake0Fake0Fake0Fake0Fake0 deploy@mac';
const ENTREE = CLE + '\n' + CLE + '\n' + PUB + '\n';
const OUTILS = ['bash', 'git', 'flock', 'curl', 'node'].every(o => spawnSync('bash', ['-c', 'command -v ' + o]).status === 0);
vrai('les outils du bac sont là (bash, git, flock, curl, node)', OUTILS);
if (!OUTILS) { t.fin(); return; }

const aSauver = [];
const neuf = (qui) => { const b = bac(); aSauver.push(b); if (qui !== false) b.proxy(qui || 'nginx'); return b; };
const modeDe = (b, rel) => (fs.statSync(path.join(b.R, rel)).mode & 0o777).toString(8);
console.log('\n── 931 · l\'installation d\'OP MESSAGES, exécutée ──');

/* ══ 1. UNE INSTALLATION NEUVE DE LA BÊTA — le cas qui doit marcher, sinon personne n'installe ═══════════ */
let b1 = neuf('nginx');
const apiAvant = fs.readFileSync(b1.apiNginx, 'utf8');
const r1 = b1.installer('beta', ENTREE);
v('⛔ une installation neuve réussit', r1.rc, 0);
const sha1 = b1.sha();
v('   le service répond, avec le sha du dépôt (le bon code tourne)', (b1.sante('beta') || {}).sha, sha1);
v('   et c\'est la release de CE sha qui est liée', b1.lien('beta'), sha1);
vrai('   /health dit ok, instance beta', (b1.sante('beta') || {}).ok === true && (b1.sante('beta') || {}).instance === 'beta');
vrai('   la sortie finit sur l\'état de /health, rien d\'autre de la machine', /\/health : ok=true instance=beta sha=[0-9a-f]{8}/.test(r1.sortie));
vrai('   le miroir est un clone NU et SANS blobs (l\'historique du dépôt pèse plus d\'un gigaoctet à cause des pages)', /bare = true/.test(b1.lire('opt/opmsg/repo/config') || '') && /partialclonefilter = blob:none/.test(b1.lire('opt/opmsg/repo/config') || ''));
v('   l\'utilisateur système est créé une seule fois', (b1.journal().match(/useradd /g) || []).length, 1);
vrai('   sans shell et sans dossier personnel', /--system/.test(b1.journal()) && /--no-create-home/.test(b1.journal()) && /nologin/.test(b1.journal()));

/* Les droits : c'est ce qui sépare un service durci d'un service ouvert. */
v('⛔ les données ne se lisent que par opmsg (0700)', modeDe(b1, 'opt/opmsg/beta/data'), '700');
v('⛔ la configuration est en 0600', modeDe(b1, 'etc/opmsg/beta.json'), '600');
v('⛔ la clé maître est en 0600', modeDe(b1, 'etc/opmsg/beta.kek'), '600');
v('   le déployeur est exécutable', modeDe(b1, 'opt/opmsg/deployer.sh'), '755');
v('   le lanceur est exécutable', modeDe(b1, 'opt/opmsg/lancer.sh'), '755');
vrai('   la configuration et les données sont données à opmsg, le code reste à root',
  /chown opmsg:opmsg \S*\/beta\/data/.test(b1.journal()) && /chown opmsg:opmsg \S*\/beta\.json/.test(b1.journal())
  && /chown root:root \S*deployer\.sh/.test(b1.journal()));
v('⛔ la clé posée est celle qu\'on a saisie (pas une autre)', (b1.lire('etc/opmsg/beta.kek') || '').trim(), CLE);
vrai('   le réglage systemd de la clé a été posé par la pose de clé (après la clé, pas avant)',
  /LoadCredential=kek:/.test(b1.lire('etc/systemd/system/teamop-msg@beta.service.d/kek.conf') || ''));

/* ⛔ LES SECRETS NE PASSENT JAMAIS PAR L'ÉCRAN. */
vrai('⛔ la clé maître saisie n\'apparaît NULLE PART dans la sortie', !r1.sortie.includes(CLE));
const cfg = JSON.parse(b1.lire('etc/opmsg/beta.json'));
vrai('⛔ la clé privée VAPID n\'apparaît pas dans la sortie', typeof cfg.vapidPrivateKey === 'string' && cfg.vapidPrivateKey.length >= 40 && !r1.sortie.includes(cfg.vapidPrivateKey));
vrai('   ni la publique (rien à gagner à l\'afficher)', !r1.sortie.includes(cfg.vapidPublicKey));
v('   la paire VAPID est bien formée (65 octets publics, 32 privés, courbe P-256)',
  [Buffer.from(cfg.vapidPublicKey, 'base64url').length, Buffer.from(cfg.vapidPrivateKey, 'base64url').length, Buffer.from(cfg.vapidPublicKey, 'base64url')[0]], [65, 32, 4]);
v('   la configuration dit l\'instance, le domaine et le port', [cfg.instance, cfg.domaine, cfg.port, cfg.origine],
  ['beta', 'msg-beta.teamop.fr', Number(b1.port), 'https://msg-beta.teamop.fr']);
vrai('   la clé n\'est pas écrite dans la configuration', !JSON.stringify(cfg).includes(CLE));
vrai('   ni dans le fichier d\'environnement de l\'unité', !(b1.lire('etc/opmsg/beta.env') || '').includes(CLE));
vrai('   ni dans la ligne de clé SSH', !(b1.lire('root/.ssh/authorized_keys') || '').includes(CLE));

/* ⛔ LA PAIRE VAPID, UN CAS SUR 256 : `getPrivateKey()` rend les octets SANS zéro de tête. Une clé privée de
   31 octets est refusée par web-push ("private key should be 32 bytes") — et ça n'arrive qu'une installation
   sur 256, donc jamais sous les yeux de qui écrit le script. On joue le cas, exprès : un `crypto` truqué dont
   la clé privée n'a que 31 octets, et le VRAI générateur extrait du script. */
{
  const SH = fs.readFileSync(path.join(__dirname, '..', 'server-msg', 'install-msg.sh'), 'utf8');
  const m = /node -e '\n([\s\S]*?)'\n/.exec(SH);
  vrai('le générateur de configuration est trouvé dans le script (population avant verdict)', !!m && m[1].includes('vapidPrivateKey'));
  if (m) {
    const dossier = fs.mkdtempSync(path.join(require('os').tmpdir(), 'vapid-'));
    const pre = path.join(dossier, 'pre.js');
    fs.writeFileSync(pre, "const c = require('crypto'); const vrai = c.createECDH;\n" +
      "c.createECDH = (n) => { const e = vrai(n); const g = e.getPrivateKey.bind(e); e.getPrivateKey = () => g().subarray(1); return e; };\n");
    const out = path.join(dossier, 'cfg.json');
    const r = spawnSync(process.execPath, ['-r', pre, '-e', m[1]], { encoding: 'utf8',
      env: Object.assign({}, process.env, { OPMSG_CFG_CHEMIN: out, OPMSG_CFG_INSTANCE: 'beta', OPMSG_CFG_DOMAINE: 'msg-beta.teamop.fr', OPMSG_CFG_PORT: '8091' }) });
    v('le générateur tourne avec un crypto qui rend une clé privée de 31 octets', r.status, 0);
    const c = JSON.parse(fs.readFileSync(out, 'utf8'));
    v('⛔ la clé privée écrite fait QUAND MÊME 32 octets (complétée du zéro de tête)', Buffer.from(c.vapidPrivateKey, 'base64url').length, 32);
    v('   et le fichier est créé en 0600 d\'emblée', (fs.statSync(out).mode & 0o777).toString(8), '600');
    fs.rmSync(dossier, { recursive: true, force: true });
  }
}

/* ══ 2. L'UNITÉ SYSTEMD : DURCIE, ET SANS LoadCredential ═══════════════════════════════════════════ */
const unite = b1.lire('etc/systemd/system/teamop-msg@.service') || '';
vrai('l\'unité modèle existe (teamop-msg@.service)', unite.length > 100);
for (const [nom, motif] of [
  ['User=opmsg', /^User=opmsg$/m], ['NoNewPrivileges', /^NoNewPrivileges=true$/m], ['ProtectSystem=strict', /^ProtectSystem=strict$/m],
  ['ReadWritePaths limité à SON dossier de données', /^ReadWritePaths=\/opt\/opmsg\/%i\/data$/m], ['PrivateTmp', /^PrivateTmp=true$/m],
  ['ProtectHome', /^ProtectHome=true$/m], ['RestrictAddressFamilies', /^RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX$/m],
  ['MemoryMax=1G', /^MemoryMax=1G$/m], ['CPUWeight bas', /^CPUWeight=([1-9]|[1-4][0-9])$/m], ['IOWeight bas', /^IOWeight=([1-9]|[1-4][0-9])$/m],
  ['LimitNOFILE', /^LimitNOFILE=\d{4,}$/m], ['Restart=always', /^Restart=always$/m], ['capacités vidées', /^CapabilityBoundingSet=$/m],
]) vrai('   ⛔ ' + nom, motif.test(unite));
vrai('   le démarrage passe par le lanceur (qui pose OPMSG_SHA)', /^ExecStart=\/opt\/opmsg\/lancer\.sh$/m.test(unite));
vrai('   le port vient du fichier d\'environnement, jamais écrit dans l\'unité', /^EnvironmentFile=\/etc\/opmsg\/%i\.env$/m.test(unite) && !/PORT=\d/.test(unite));
v('⛔ l\'unité NE PORTE PAS LoadCredential (c\'est le drop-in de la pose de clé, après la clé — test-729)', /^\s*LoadCredential\s*=/m.test(unite), false);
vrai('   et elle n\'est pas root', !/^User=root$/m.test(unite));
const lanceur = b1.lire('opt/opmsg/lancer.sh') || '';
vrai('   le lanceur lit le sha sur le lien `current` (une seule vérité) et exécute node', /readlink -f/.test(lanceur) && /OPMSG_SHA=/.test(lanceur) && /exec \/usr\/bin\/node index\.js/.test(lanceur));
const lanceurSyntaxe = spawnSync('sh', ['-n', path.join(b1.R, 'opt/opmsg/lancer.sh')], { encoding: 'utf8' });
v('   le lanceur INSTALLÉ se parse (sh -n)', lanceurSyntaxe.status, 0);
vrai('   le service est démarré à l\'amorçage', /systemctl enable teamop-msg@beta/.test(b1.journal()));

/* ══ 3. LA CLÉ SSH DE LA CI : COMMANDE FORCÉE ══════════════════════════════════════════════════════ */
const auth = (b1.lire('root/.ssh/authorized_keys') || '').split('\n').filter(Boolean);
v('⛔ authorized_keys porte exactement UNE ligne à nous', auth.length, 1);
v('   et c\'est une COMMANDE FORCÉE, restreinte : elle ne peut lancer que le déployeur',
  auth[0], 'restrict,command="/opt/opmsg/deployer.sh" ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGq6Fake0Fake0Fake0Fake0Fake0Fake0Fake0Fake0 opmsg-deploiement');
v('   les droits du dossier .ssh et du fichier', [modeDe(b1, 'root/.ssh'), modeDe(b1, 'root/.ssh/authorized_keys')], ['700', '600']);

/* ══ 4. LE PROXY : UN FICHIER À PART, VALIDÉ AVANT D'ÊTRE RECHARGÉ, ET LE BLOC D'api.teamop.fr INTACT ═══ */
v('⛔ le bloc d\'api.teamop.fr est identique octet pour octet', fs.readFileSync(b1.apiNginx, 'utf8'), apiAvant);
vrai('   et son lien dans sites-enabled n\'a pas bougé', fs.readlinkSync(path.join(b1.R, 'etc/nginx/sites-enabled/api.teamop.fr')) === b1.apiNginx);
const ngx = b1.lire('etc/nginx/sites-available/opmsg-beta.conf') || '';
vrai('   OP MESSAGES a SON fichier (opmsg-beta.conf), relié dans sites-enabled', ngx.length > 100 && b1.existe('etc/nginx/sites-enabled/opmsg-beta.conf'));
vrai('   il ne mentionne pas api.teamop.fr', !/api\.teamop\.fr/.test(ngx));
vrai('   il sert le domaine de la bêta et envoie vers le port de la bêta, en local seulement',
  /server_name msg-beta\.teamop\.fr;/.test(ngx) && new RegExp('proxy_pass http://127\\.0\\.0\\.1:' + b1.port + ';').test(ngx) && !/proxy_pass http:\/\/(?!127\.0\.0\.1)/.test(ngx));
const fluxBloc = (ngx.match(/location = \/api\/flux \{[\s\S]*?\n    \}/) || [''])[0];
vrai('⛔ le flux SSE n\'est PAS retenu en tampon', /proxy_buffering off;/.test(fluxBloc) && /proxy_cache off;/.test(fluxBloc));
vrai('⛔ et nginx ne le coupe pas à 60 s (3700 s)', /proxy_read_timeout 3700s;/.test(fluxBloc));
vrai('⛔ X-Forwarded-For est ÉCRASÉ par l\'adresse vue par nginx, jamais complété (req.ip, trust proxy 1)',
  (ngx.match(/proxy_set_header X-Forwarded-For \$remote_addr;/g) || []).length === 2 && !/proxy_add_x_forwarded_for/.test(ngx));
vrai('   HTTP/2 à la forme de nginx 1.24 (`listen … ssl http2`) — Ubuntu 24.04', /listen 443 ssl http2;/.test(ngx) && !/^\s*http2 on;/m.test(ngx));
vrai('   le port 80 redirige vers https et laisse passer Let\'s Encrypt', /acme-challenge/.test(ngx) && /return 301 https:\/\/msg-beta\.teamop\.fr\$request_uri;/.test(ngx));
vrai('   les en-têtes de sécurité sont ceux du SERVICE (pas de doublon posé par nginx)', !/add_header/.test(ngx));
{
  const J = b1.journal().split('\n');
  const iT = J.findIndex(l => /nginx -t$/.test(l)), iR = J.findIndex(l => /rechargements|reload nginx/.test(l)) ;
  const rech = b1.journal('rechargements.log');
  vrai('⛔ nginx -t a tourné AVANT le rechargement', iT >= 0 && /reload nginx/.test(b1.journal()) && b1.journal().indexOf('nginx -t') < b1.journal().indexOf('reload nginx'));
  vrai('   le certificat a été demandé (webroot, pour le seul domaine de la bêta)', /certbot certonly --webroot -w \/var\/www\/opmsg-acme -d msg-beta\.teamop\.fr /.test(b1.journal()));
  void iR; void rech;
}
v('⛔ rien d\'OP GESTION n\'a été touché : aucun appel à teamop-api, aucun chemin teamop',
  [/teamop-api/.test(b1.journal()), Object.keys(b1.etat()).filter(k => /(^|\/)teamop(\/|$)/.test(k) && !/teamop-msg@/.test(k) && !/teamop\.fr/.test(k))], [false, []]);
vrai('   le seul programme relancé dans systemctl est le proxy (reload) et notre unité',
  b1.journal().split('\n').filter(l => /systemctl (restart|reload|stop|start)/.test(l)).every(l => /(reload nginx|teamop-msg@beta)/.test(l)));

/* ══ 5. REJOUABLE : DEUX PASSAGES DONNENT LE MÊME ÉTAT ══════════════════════════════════════════════ */
{
  const avant = b1.etat(/^opt\/opmsg\/repo\//);
  const cfgAvant = b1.lire('etc/opmsg/beta.json');
  const kekAvant = b1.lire('etc/opmsg/beta.kek');
  const nL = b1.journal().split('\n').length;
  // La clé existe : elle ne se redemande pas. La clé publique non plus : la ligne tagguée est déjà là.
  const r = b1.installer('beta', '');
  v('⛔ un second passage réussit sans rien demander', r.rc, 0);
  v('   et laisse EXACTEMENT le même état (contenus, droits, liens)', b1.etat(/^opt\/opmsg\/repo\//), avant);
  v('   la configuration n\'est pas réécrite (la paire VAPID reste celle de la première fois)', b1.lire('etc/opmsg/beta.json'), cfgAvant);
  v('⛔ la clé maître n\'est pas retouchée', b1.lire('etc/opmsg/beta.kek'), kekAvant);
  v('   l\'utilisateur n\'est pas recréé', (b1.journal().match(/useradd /g) || []).length, 1);
  v('   le certificat n\'est pas redemandé', (b1.journal().match(/certbot /g) || []).length, 1);
  v('   la ligne de clé SSH n\'est pas dupliquée', (b1.lire('root/.ssh/authorized_keys') || '').split('\n').filter(Boolean).length, 1);
  vrai('   la pose de clé est rappelée SANS clé en argument (elle est déjà là : c\'est elle qui le constate)',
    /cle_en_argument=non/.test(b1.journal('poser-cle.log')));
  vrai('   le second passage n\'a pas régénéré de clé : celle du fichier est toujours le canari', (b1.lire('etc/opmsg/beta.kek') || '').trim() === CLE);
  vrai('   le service répond encore avec le bon sha', (b1.sante('beta') || {}).sha === sha1);
  void nL;
}

/* ══ 6. LA CLÉ MAÎTRE : ON NE LA GÉNÈRE JAMAIS ICI, ET ON NE LA RÉGÉNÈRE JAMAIS ═══════════════════════
   La pose de clé FACTICE génère et AFFICHE une clé quand on ne lui en donne pas — c'est le défaut de l'outil
   de `server/`. Si l'installation l'appelait sans clé, ce banc verrait un fichier de clé apparaître. */
{
  const b = neuf('nginx');
  const r = b.installer('beta', '');
  v('⛔ sans clé saisie (Entrée vide) : l\'installation REFUSE', r.rc, 1);
  v('   aucun fichier de clé n\'a été généré (le piège aurait écrit et affiché une clé)', b.existe('etc/opmsg/beta.kek'), false);
  vrai('   elle dit pourquoi : on ne génère pas sur ce VPS (elle s\'afficherait) — et donne la voie (Mac, pbcopy)', /ne la génère pas/.test(r.sortie) && /pbcopy/.test(r.sortie));
  v('   la pose de clé n\'a même pas été appelée', b.journal('poser-cle.log'), '');
  v('⛔ ni service démarré, ni proxy touché, ni déploiement', [/restart teamop-msg/.test(b.journal()), /reload nginx/.test(b.journal()), b.existe('etc/nginx/sites-available/opmsg-beta.conf'), b.lien('beta')], [false, false, false, null]);
  vrai('   et le drop-in systemd n\'existe pas (un LoadCredential vers un fichier absent empêcherait systemd de démarrer)', !b.existe('etc/systemd/system/teamop-msg@beta.service.d/kek.conf'));
}
{
  // Des données existent, la clé est absente : un INCIDENT. Entrée vide : on refuse et on le dit.
  const b = neuf('nginx');
  fs.mkdirSync(path.join(b.R, 'opt/opmsg/beta/data'), { recursive: true });
  fs.writeFileSync(path.join(b.R, 'opt/opmsg/beta/data/msg.db'), 'x');
  const r = b.installer('beta', '');
  v('⛔ des données et pas de clé, aucune saisie : REFUS', r.rc, 1);
  vrai('   il dit que c\'est un INCIDENT, pas une installation', /INCIDENT/.test(r.sortie) && /séquestre/.test(r.sortie));
  v('   rien n\'a été généré, rien n\'a été écrit côté clé', [b.existe('etc/opmsg/beta.kek'), b.journal('poser-cle.log')], [false, '']);
  // La clé du séquestre, elle, répare : c'est le seul chemin légitime.
  const r2 = b.installer('beta', CLE2 + '\n' + CLE2 + '\n' + PUB + '\n');
  v('   avec la clé du SÉQUESTRE saisie, l\'installation passe (le seul chemin qui répare)', r2.rc, 0);
  v('   et c\'est bien celle-là qui est posée', (b.lire('etc/opmsg/beta.kek') || '').trim(), CLE2);
  vrai('   la clé du séquestre n\'est pas répétée à l\'écran', !r2.sortie.includes(CLE2));
  vrai('   les données existantes n\'ont pas été touchées', b.lire('opt/opmsg/beta/data/msg.db') === 'x');
}
{
  const b = neuf('nginx');
  const r = b.installer('beta', CLE + '\n' + CLE2 + '\n' + PUB + '\n');
  v('⛔ deux saisies différentes : rien n\'est écrit', [r.rc, b.existe('etc/opmsg/beta.kek')], [1, false]);
  vrai('   ni l\'une ni l\'autre n\'apparaît à l\'écran', !r.sortie.includes(CLE) && !r.sortie.includes(CLE2));
  const b2 = neuf('nginx');
  const r2 = b2.installer('beta', CLE.slice(0, 63) + '\n' + CLE.slice(0, 63) + '\n' + PUB + '\n');
  v('⛔ une clé de 63 caractères est refusée, rien n\'est écrit', [r2.rc, b2.existe('etc/opmsg/beta.kek')], [1, false]);
  vrai('   le message donne la LONGUEUR lue, pas la clé', /longueur lue : 63/.test(r2.sortie) && !r2.sortie.includes(CLE.slice(0, 63)));
  const b3 = neuf('nginx');
  const r3 = b3.installer('beta', 'z'.repeat(64) + '\n' + 'z'.repeat(64) + '\n' + PUB + '\n');
  v('   64 caractères qui ne sont pas des hexadécimaux : refusés', [r3.rc, b3.existe('etc/opmsg/beta.kek')], [1, false]);
}
{
  // Un outil de pose de clé NÉGLIGENT qui afficherait la clé qu'on lui donne : le masqueur l'efface.
  const b = neuf('nginx');
  const r = b.installer('beta', ENTREE, { FACTICE_AFFICHE: '1' });
  v('⛔ même si la pose de clé affichait la clé, l\'écran ne la montre pas', [r.rc, r.sortie.includes(CLE)], [0, false]);
  vrai('   il y a écrit « [clé masquée] » à la place', /\[clé masquée\]/.test(r.sortie));
}

{
  // Un collage depuis un terminal ajoute souvent un retour chariot ou des espaces : la clé reste la même.
  const b = neuf('nginx');
  const r = b.installer('beta', '  ' + CLE + '\r\n' + CLE + ' \r\n' + PUB + '\n');
  v('une clé collée avec espaces et retour chariot est posée telle quelle', [r.rc, (b.lire('etc/opmsg/beta.kek') || '').trim()], [0, CLE]);
}

/* ══ 7. LA CLÉ PUBLIQUE DE DÉPLOIEMENT : SEULEMENT UNE CLÉ PUBLIQUE ═══════════════════════════════════ */
{
  const b = neuf('nginx');
  const r = b.installer('beta', CLE + '\n' + CLE + '\n-----BEGIN OPENSSH PRIVATE KEY-----\n');
  v('⛔ une clé PRIVÉE collée par erreur est refusée', r.rc, 1);
  vrai('   et elle n\'est pas recopiée à l\'écran', !/BEGIN OPENSSH/.test(r.sortie));
  vrai('   rien n\'est écrit dans authorized_keys', !b.existe('root/.ssh/authorized_keys') || (b.lire('root/.ssh/authorized_keys') || '') === '');
  const b2 = neuf('nginx');
  const r2 = b2.installer('beta', CLE + '\n' + CLE + '\nssh-ed25519 AAAA" ; touch /tmp/x ; "\n');
  v('⛔ une ligne qui tente de sortir de la commande forcée est refusée', [r2.rc, /touch/.test(b2.lire('root/.ssh/authorized_keys') || '')], [1, false]);
  const b3 = neuf('nginx');
  const r3 = b3.installer('beta', CLE + '\n' + CLE + '\n', { OPMSG_CLE_PUBLIQUE: PUB });
  v('   la clé publique peut aussi venir de l\'environnement (installation sans question)', [r3.rc, (b3.lire('root/.ssh/authorized_keys') || '').includes('restrict,command="/opt/opmsg/deployer.sh"')], [0, true]);
  const b4 = neuf('nginx');
  const r4 = b4.installer('beta', CLE + '\n' + CLE + '\n\n');
  v('   sans clé publique (Entrée) : l\'installation va au bout et DIT que la CI ne pourra pas déployer', [r4.rc, /la CI ne pourra pas déployer/.test(r4.sortie)], [0, true]);
}

/* ══ 8. LE PROXY : TROIS CAS DE REFUS, CHACUN SANS RIEN CASSER ═══════════════════════════════════════ */
{
  // nginx -t refuse : rien n'est rechargé, le fichier d'OP MESSAGES disparaît (installation neuve).
  const b = neuf('nginx');
  b.drapeau('nginx-refuse', '1');
  const r = b.installer('beta', ENTREE);
  v('⛔ nginx -t refuse : l\'installation s\'arrête', r.rc, 1);
  v('   rien n\'est rechargé', /reload nginx/.test(b.journal()), false);
  v('   le fichier d\'OP MESSAGES est retiré (il aurait cassé le prochain rechargement d\'api.teamop.fr)', [b.existe('etc/nginx/sites-available/opmsg-beta.conf'), b.existe('etc/nginx/sites-enabled/opmsg-beta.conf')], [false, false]);
  v('   le bloc d\'api.teamop.fr est intact', fs.readFileSync(b.apiNginx, 'utf8'), b.apiTexte);
  vrai('   et aucun déploiement n\'a eu lieu', !b.existe('opt/opmsg/beta/current'));
}
{
  // nginx -t refuse un SECOND passage : le fichier est remis comme il était.
  const b = neuf('nginx');
  b.installer('beta', ENTREE);
  const avant = b.lire('etc/nginx/sites-available/opmsg-beta.conf');
  b.drapeau('nginx-refuse', '1');
  const nbRech = (b.journal().match(/reload nginx/g) || []).length;
  const r = b.installer('beta', '', { OPMSG_PORT: String(Number(b.port) + 1) });
  v('⛔ un second passage refusé par nginx -t : échec', r.rc, 1);
  v('   le fichier est REMIS comme il était (pas de configuration à moitié écrite)', b.lire('etc/nginx/sites-available/opmsg-beta.conf'), avant);
  v('   aucun rechargement de plus', (b.journal().match(/reload nginx/g) || []).length, nbRech);
}
{
  const b = neuf('nginx');
  b.drapeau('certbot-refuse', '1');
  const r = b.installer('beta', ENTREE);
  v('⛔ certificat refusé (DNS absent) : l\'installation s\'arrête', r.rc, 1);
  vrai('   elle dit que c\'est probablement le DNS', /DNS/.test(r.sortie));
  const ngx2 = b.lire('etc/nginx/sites-available/opmsg-beta.conf') || '';
  vrai('   et nginx n\'a reçu QUE le bloc du port 80 : un bloc 443 sans certificat l\'empêcherait de recharger', /listen 80;/.test(ngx2) && !/listen 443/.test(ngx2) && !/ssl_certificate/.test(ngx2));
  v('   le bloc d\'api.teamop.fr est intact', fs.readFileSync(b.apiNginx, 'utf8'), b.apiTexte);
}
{
  // nginx récent : la forme `http2 on;`.
  const b = neuf('nginx');
  b.drapeau('nginx-version', '1.26.0');
  b.installer('beta', ENTREE);
  const n = b.lire('etc/nginx/sites-available/opmsg-beta.conf') || '';
  vrai('nginx ≥ 1.25.1 : `http2 on;` (et plus http2 sur la ligne listen)', /^\s*http2 on;/m.test(n) && /listen 443 ssl;/.test(n) && !/listen 443 ssl http2/.test(n));
}

/* ══ 9. CADDY — l'autre proxy possible ═════════════════════════════════════════════════════════════════ */
{
  const b = neuf('caddy');
  const r = b.installer('beta', ENTREE, { OPMSG_PROXY: '' });
  v('Caddy actif (détecté tout seul) : l\'installation réussit', r.rc, 0);
  const cf = fs.readFileSync(b.caddyfile, 'utf8');
  vrai('⛔ le Caddyfile d\'origine est conservé tel quel (bloc d\'api.teamop.fr compris), seule une ligne `import` s\'ajoute',
    cf.startsWith(b.caddyTexte) && cf.slice(b.caddyTexte.length).trim() === 'import /etc/caddy/opmsg/*.caddy');
  const f = b.lire('etc/caddy/opmsg/beta.caddy') || '';
  vrai('   le bloc d\'OP MESSAGES est dans SON fichier', /^msg-beta\.teamop\.fr \{/m.test(f) && new RegExp('reverse_proxy 127\\.0\\.0\\.1:' + b.port).test(f));
  vrai('⛔ SSE non retenu en tampon, et X-Forwarded-For écrasé par l\'adresse vue (jamais complété)', /flush_interval -1/.test(f) && /header_up X-Forwarded-For \{remote_host\}/.test(f));
  vrai('   validé AVANT le rechargement', b.journal().indexOf('caddy validate') >= 0 && b.journal().indexOf('caddy validate') < b.journal().indexOf('reload caddy'));
  vrai('   nginx n\'a pas été touché (ni rechargé ni écrit)', !/reload nginx|nginx -t/.test(b.journal()) && !b.existe('etc/nginx/sites-available/opmsg-beta.conf'));
  b.installer('beta', '', { OPMSG_PROXY: '' });
  v('⛔ rejoué : une seule ligne import (pas de doublon)', (fs.readFileSync(b.caddyfile, 'utf8').match(/^import /gm) || []).length, 1);
}
{
  const b = neuf('caddy');
  b.drapeau('caddy-refuse', '1');
  const r = b.installer('beta', ENTREE, { OPMSG_PROXY: '' });
  v('⛔ Caddy refuse (caddy validate) : échec', r.rc, 1);
  v('   le Caddyfile est remis EXACTEMENT comme avant', fs.readFileSync(b.caddyfile, 'utf8'), b.caddyTexte);
  v('   notre fichier est retiré, rien n\'est rechargé', [b.existe('etc/caddy/opmsg/beta.caddy'), /reload caddy/.test(b.journal())], [false, false]);
}
{
  const b = neuf('nginx');
  fs.writeFileSync(path.join(b.E, 'proxy-caddy'), '');
  const r = b.installer('beta', ENTREE, { OPMSG_PROXY: '' });
  vrai('nginx ET caddy actifs, rien d\'indiqué : l\'installation REFUSE de choisir', r.rc === 1 && /OPMSG_PROXY/.test(r.sortie));
  v('   et rien n\'a été installé de ce côté', b.existe('etc/nginx/sites-available/opmsg-beta.conf'), false);
  const b2 = neuf(false);
  const r2 = b2.installer('beta', ENTREE, { OPMSG_PROXY: '' });
  vrai('aucun proxy actif : refus net', r2.rc === 1 && /aucun proxy actif/.test(r2.sortie));
  const b3 = neuf('nginx');
  v('OPMSG_PROXY=apache : refusé', b3.installer('beta', ENTREE, { OPMSG_PROXY: 'apache' }).rc, 2);
}

/* ══ 10. LA PRODUCTION — UNIQUEMENT SUR LA PHRASE DE JUSTIN ═══════════════════════════════════════════ */
{
  const b = neuf('nginx');
  const r = b.installer('prod', ENTREE);
  v('⛔ prod sans « publie OP MESSAGES » (OPMSG_PUBLIE=oui) : refus', r.rc, 1);
  v('   RIEN n\'est écrit (la racine reste vide à l\'exception du proxy déjà là)', Object.keys(b.etat()).filter(k => !/^etc\/(nginx\/|$)/.test(k)), []);
  vrai('   et aucune commande système n\'a été lancée', !/useradd|systemctl|certbot|chown/.test(b.journal()));
  vrai('   le message renvoie à la phrase de Justin', /publie OP MESSAGES/.test(r.sortie));
  v('   « non » ne vaut pas « oui »', b.installer('prod', ENTREE, { OPMSG_PUBLIE: 'non' }).rc, 1);
}
{
  // Les deux instances coexistent : un utilisateur, un miroir, un lanceur ; deux configurations, deux paires VAPID, deux clés.
  const b = neuf('nginx');
  const portProd = String(Number(b.port) + 1);
  const rb = b.installer('beta', ENTREE);
  const rp = b.installer('prod', CLE2 + '\n' + CLE2 + '\n\n', { OPMSG_PUBLIE: 'oui', OPMSG_PORT: portProd });
  v('prod avec la phrase : s\'installe', [rb.rc, rp.rc], [0, 0]);
  const cb = JSON.parse(b.lire('etc/opmsg/beta.json')), cp = JSON.parse(b.lire('etc/opmsg/prod.json'));
  vrai('⛔ chaque instance a SA paire VAPID (un abonnement push de la bêta ne doit pas se retrouver en production)', cb.vapidPrivateKey !== cp.vapidPrivateKey && cb.vapidPublicKey !== cp.vapidPublicKey);
  v('   le domaine et le port de la production', [cp.domaine, cp.port], ['msg.teamop.fr', Number(portProd)]);
  v('⛔ chaque instance a SA clé maître', [(b.lire('etc/opmsg/beta.kek') || '').trim(), (b.lire('etc/opmsg/prod.kek') || '').trim()], [CLE, CLE2]);
  vrai('   chacune a son dossier de données, ses releases et son unité (teamop-msg@prod)', b.existe('opt/opmsg/prod/data') && b.existe('opt/opmsg/prod/releases') && /enable teamop-msg@prod/.test(b.journal()));
  v('   un seul utilisateur, un seul miroir', [(b.journal().match(/useradd /g) || []).length, fs.readdirSync(path.join(b.R, 'opt/opmsg')).filter(n => n === 'repo').length], [1, 1]);
  v('   le fichier de proxy de la production est à part de celui de la bêta', [b.existe('etc/nginx/sites-available/opmsg-prod.conf'), /server_name msg\.teamop\.fr;/.test(b.lire('etc/nginx/sites-available/opmsg-prod.conf') || '')], [true, true]);
  v('⛔ une seule ligne de clé SSH de déploiement pour les deux (la même clé CI, le même déployeur)', (b.lire('root/.ssh/authorized_keys') || '').split('\n').filter(Boolean).length, 1);
}

/* ══ 11. LES REFUS D'ENTRÉE, ET CE QUI MANQUE ══════════════════════════════════════════════════════════ */
{
  const b = neuf('nginx');
  v('instance inconnue : usage', b.installer('staging', ENTREE).rc, 2);
  v('⛔ un domaine qui sortirait du fichier de proxy est refusé', b.installer('beta', ENTREE, { OPMSG_DOMAINE: 'x.fr; return 200' }).rc, 2);
  v('   un port qui n\'est pas un nombre aussi', b.installer('beta', ENTREE, { OPMSG_PORT: '80;' }).rc, 2);
  vrai('   et rien n\'a été écrit pour autant', !b.existe('opt/opmsg') && !b.existe('etc/opmsg'));
}
{
  // Node trop ancien : pas de node:sqlite. L'installation s'arrête avant de rien créer.
  const b = neuf('nginx');
  const faux = path.join(b.d, 'binnode'); fs.mkdirSync(faux);
  fs.writeFileSync(path.join(faux, 'node'), '#!/bin/sh\n[ "$1" = "-p" ] && { echo 20; exit 0; }\nexec ' + process.execPath + ' "$@"\n', { mode: 0o755 });
  const r = b.installer('beta', ENTREE, { PATH: faux + path.delimiter + b.env().PATH });
  vrai('Node 20 : refus (node:sqlite demande Node 22), avant toute création', r.rc === 1 && /Node 22/.test(r.sortie) && !b.existe('opt/opmsg'));
}
{
  // Le dépôt n'a pas la pose de clé : on le dit, on ne devine pas.
  const b = neuf('nginx');
  b.commit({ 'server-msg/poser-cle.js': null }, 'sans pose de clé');
  const r = b.installer('beta', ENTREE);
  vrai('main sans poser-cle.js : refus net, rien d\'installé côté service', r.rc === 1 && /poser-cle\.js/.test(r.sortie) && !b.existe('etc/systemd/system/teamop-msg@.service'));
}
{
  // Le premier déploiement échoue (le service répond le mauvais sha) : l'installation le DIT et sort en erreur.
  const b = neuf('nginx');
  b.commit({ 'server-msg/MENT': 'f'.repeat(40) }, 'un service qui ment');
  const r = b.installer('beta', ENTREE);
  vrai('⛔ premier déploiement refusé : l\'installation sort en erreur et le dit', r.rc === 1 && /le déploiement a échoué/.test(r.sortie));
  v('   le lien n\'existe pas et le service est arrêté (rien ne tourne que le contrôle a refusé)', [b.lien('beta'), /systemctl stop teamop-msg@beta/.test(b.journal())], [null, true]);
  vrai('   la clé et la configuration sont posées, elles (l\'installation reste rejouable)', b.existe('etc/opmsg/beta.kek') && b.existe('etc/opmsg/beta.json'));
}

for (const b of aSauver) b.fin();
t.fin();
