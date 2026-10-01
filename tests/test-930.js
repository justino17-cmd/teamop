/* ⛔ CE QUE CE FICHIER GARDE — QUE LES SCRIPTS D'INSTALLATION D'OP MESSAGES SE PARSENT, NE FONT PAS CE QU'ILS
   INTERDISENT, ET QUE LE MODE D'EMPLOI NE FAIT AFFICHER AUCUN SECRET.

   Trois familles, de la plus générale à la plus précise (le modèle est `test-728`, qui garde les workflows) :
     1. chaque script se parse (`bash -n`) — et chaque heredoc qui écrit un SCRIPT (le lanceur de l'unité) aussi :
        son corps part sur le VPS et s'y parse SEUL, ce que ni `bash -n` du fichier ni un run vert n'éprouvent ;
     2. le CODE (commentaires retirés : un motif de banc vise du code, jamais la phrase qui l'explique) ne contient
        pas ce que la règle interdit : toucher à OP GESTION, afficher un secret, écrire la clé lui-même, générer
        une clé neuve, `eval`, `set -x`, `journalctl` ;
     3. le mode d'emploi de Justin (`design/opmessages/INSTALLER-LE-SERVEUR.md`) : aucune commande qui afficherait
        un secret, et les gestes dans l'ordre (règle du 24 septembre 2026 : « on ne fait jamais afficher un secret
        sur le VPS — Justin recolle toutes ses sorties dans la conversation »).
   Le comportement, lui, est EXÉCUTÉ par `test-931` (l'installation) et `test-932` (le déployeur) : ici on ne lit
   du texte que pour ce qu'un bac à sable ne peut pas jouer. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { banc, sansCommentaires, RACINE } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const SM = path.join(RACINE, 'server-msg');
const SCRIPTS = ['install-msg.sh', 'deployer.sh'];
const lire = (p) => fs.readFileSync(p, 'utf8');
console.log('\n── 930 · les scripts d\'installation d\'OP MESSAGES, lus ──');

vrai('bash est là (sans lui ce banc ne dirait rien — et un banc muet a l\'air d\'un banc vert)', spawnSync('bash', ['-c', 'true']).status === 0);
v('les deux scripts existent', SCRIPTS.filter(f => !fs.existsSync(path.join(SM, f))), []);

/* ══ 1. ILS SE PARSENT ═══════════════════════════════════════════════════════════════════════════ */
for (const f of SCRIPTS) {
  const r = spawnSync('bash', ['-n', path.join(SM, f)], { encoding: 'utf8' });
  v('[' + f + '] bash -n', [r.status, String(r.stderr).trim()], [0, '']);
  const src = lire(path.join(SM, f));
  vrai('[' + f + '] « set -euo pipefail » : une commande qui échoue ne passe pas pour réussie', /^set -euo pipefail$/m.test(src));
  vrai('[' + f + '] commence par un shebang bash', src.startsWith('#!/usr/bin/env bash\n'));
}

/* Les heredocs : on extrait chacun, et ceux qui écrivent un SCRIPT sont parsés comme tels. */
function heredocs(src) {
  const L = src.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /<<-?\s*(['"]?)([A-Za-z_][A-Za-z0-9_]*)\1\s*$/.exec(L[i]);
    if (!m || /^\s*#/.test(L[i])) continue;
    const fin = L.findIndex((l, k) => k > i && l.trim() === m[2]);
    if (fin < 0) continue;
    out.push({ ouverture: L[i], delim: m[2], texte: L.slice(i + 1, fin).join('\n') + '\n' });
    i = fin;
  }
  return out;
}
{
  const H = heredocs(lire(path.join(SM, 'install-msg.sh')));
  vrai('install-msg.sh écrit des fichiers par heredoc (population avant verdict)', H.length >= 2);
  const lanceur = H.filter(h => /lancer\.sh/.test(h.ouverture));
  v('⛔ le heredoc du LANCEUR est trouvé (c\'est un script : son corps se parse seul, sur le VPS)', lanceur.length, 1);
  for (const h of lanceur) {
    const tmp = path.join(os.tmpdir(), 'opmsg-lanceur-' + process.pid + '.sh');
    fs.writeFileSync(tmp, h.texte);
    const r = spawnSync('sh', ['-n', tmp], { encoding: 'utf8' });
    fs.rmSync(tmp, { force: true });
    v('   ⛔ le corps du lanceur se parse (sh -n)', r.status, 0);
    vrai('   il valide l\'instance avant de s\'en servir dans un chemin', /case "\$\{OPMSG_INSTANCE:-\}" in beta\|prod\)/.test(h.texte));
  }
}

/* ⛔ Le piège nommé du dépôt : un `${var:?mot}` dont le mot porte une quote casse le parse ENTIER du script. */
for (const f of SCRIPTS) {
  const src = lire(path.join(SM, f));
  const mauvais = []; const re = /\$\{[A-Za-z_][A-Za-z0-9_]*:[?+-]([^}]*)\}/g; let m;
  while ((m = re.exec(src))) if (/['"`]/.test(m[1])) mauvais.push(m[0]);
  v('[' + f + '] ⛔ aucun ${var:?mot} ne porte de quote dans son mot', mauvais, []);
}

/* ══ 2. LE CODE NE FAIT PAS CE QUE LA RÈGLE INTERDIT ══════════════════════════════════════════════════
   Sur le CODE seulement : ces scripts sont très commentés, et chaque interdit est nommé dans le commentaire qui
   l'explique. Un motif posé sur du texte brut garderait une phrase, pas un comportement. */
for (const f of SCRIPTS) {
  const code = sansCommentaires(lire(path.join(SM, f)));
  vrai('[' + f + '] le code n\'est pas vide une fois les commentaires retirés (sinon tout ce qui suit passerait sur du néant)', code.split('\n').filter(l => l.trim()).length > 40);
  const interdits = [
    ['jamais OP GESTION : aucun chemin /opt/teamop', /\/opt\/teamop/],
    ['jamais OP GESTION : aucun chemin /etc/teamop', /\/etc\/teamop/],
    ['jamais OP GESTION : aucune commande sur teamop-api', /teamop-api/],
    ['jamais le bloc d\'api.teamop.fr', /api\.teamop\.fr/],
    ['aucun journalctl (la sortie est recollée, et le journal du VPS porte des identifiants)', /journalctl/],
    ['aucun `set -x` (il afficherait chaque commande, clé comprise)', /\bset\s+-[a-z]*x/],
    ['aucun eval', /\beval\b/],
    ['aucun bash -c / sh -c sur une valeur', /\b(ba)?sh\s+-c\b/],
    ['aucun `curl … | bash`', /curl[^\n|]*\|\s*(ba)?sh/],
    ['aucune lecture du contenu de la clé ou de la configuration à l\'écran', /\b(cat|head|tail|less|more|xxd|od|base64)\s+["']?\$\{?(KEK|CONFIG)\b/],
    ['aucun echo ni printf de la clé saisie', /\b(echo|printf)\b[^\n>|]*\$\{?(K1|K2)\b(?!\})/],
    ['la clé n\'est jamais écrite par ce script : seul poser-cle.js l\'écrit', />\s*"?\$\{?KEK\b/],
    ['aucune clé générée ici (openssl rand / randomBytes pour la clé maître)', /openssl\s+rand|randomBytes\(32\)/],
    ['pas de `rm -rf /` ni de rm -rf sur une variable vide possible', /rm\s+-rf\s+"?\$\{?(R|OPT|ETC)\}?"?\s*$/m],
  ];
  /* Les lignes `echo` sont des CONSEILS écrits à l'écran (« sur ton Mac : openssl rand… »), pas des commandes exécutées. */
  const codeExecute = code.split('\n').filter(l => !/^\s*echo\b/.test(l)).join('\n');
  for (const [nom, re] of interdits) v('[' + f + '] ⛔ ' + nom, re.test(codeExecute), false);
}
{
  const code = sansCommentaires(lire(path.join(SM, 'install-msg.sh')));
  /* La clé et le déploiement sont posés DANS CET ORDRE : la clé d'abord, l'unité ensuite (test-729 : systemd refuse de
     démarrer une unité dont une source de LoadCredential manque), le proxy, le premier déploiement en dernier. */
  const i = (re) => { const m = re.exec(code); return m ? m.index : -1; };
  const iCle = i(/echo "── Clé maître…"/), iUnite = i(/UNITE_TXT='/), iProxy = i(/echo "── Proxy :/), iDeploiement = i(/Premier déploiement/);
  vrai('l\'ordre est : clé maître, unité, proxy, premier déploiement', iCle > 0 && iCle < iUnite && iUnite < iProxy && iProxy < iDeploiement);
  vrai('⛔ la clé est lue en SAISIE MASQUÉE (read -s), deux fois', (code.match(/read -rsp /g) || []).length === 2);
  vrai('   et la longueur est vérifiée avant toute pose (64 hexadécimaux)', /\^\[0-9a-f\]\{64\}\$/.test(code));
  vrai('⛔ toute sortie de la pose de clé passe par le masqueur (64 hexadécimaux → [clé masquée])', /2>&1 \| masquer/.test(code) && /s\/\[0-9A-Fa-f\]\{64\}\/\[clé masquée\]\/g/.test(code));
  vrai('   la pose de clé reçoit les chemins par l\'environnement (mêmes noms que server/poser-cle.js, préfixe OPMSG_)',
    /OPMSG_KEK_DIR="\$ETC" OPMSG_DATA="\$DATA" OPMSG_DROPIN_DIR="\$SYSD\/\$UNITE\.service\.d"/.test(code));
  vrai('⛔ la production exige OPMSG_PUBLIE=oui AVANT de créer quoi que ce soit',
    /\[ "\$INSTANCE" = "prod" \] && \[ "\$\{OPMSG_PUBLIE:-\}" != "oui" \]/.test(code) && code.indexOf('OPMSG_PUBLIE') < code.indexOf('mkdir -p'));
  vrai('⛔ le proxy est validé (nginx -t / caddy validate) avant d\'être rechargé', code.indexOf('nginx -t') > 0 && code.indexOf('nginx -t') < code.indexOf('systemctl reload nginx') && code.indexOf('caddy validate') < code.indexOf('systemctl reload caddy'));
  vrai('   le miroir est le SIEN (/opt/opmsg/repo), cloné sans blobs', /MIROIR="\$OPT\/repo"/.test(code) && /--filter=blob:none/.test(code));
  vrai('   la commande SSH est FORCÉE (restrict, command=) vers le déployeur, BORNÉE à l\'instance de la clé (--seulement=$INSTANCE)', /restrict,command=\\"\/opt\/opmsg\/deployer\.sh --seulement=\$INSTANCE\\"/.test(code));
  vrai('   et la ligne porte une marque PAR instance (la clé de la bêta et celle de la production coexistent, l\'une ne remplace pas l\'autre)', /MARQUE="opmsg-deploiement-\$INSTANCE"/.test(code));
  vrai('   Node 22 est exigé (node:sqlite)', /-ge 22/.test(code));
}
{
  const code = sansCommentaires(lire(path.join(SM, 'deployer.sh')));
  const i = (s) => code.indexOf(s);
  const codeSansEcho = code.replace(/\becho\s+"[^"\n]*"/g, 'echo');   // un conseil écrit à l'écran n'est pas une commande exécutée
  vrai('le déployeur prend le VERROU avant de toucher au miroir, au lien ou au service', i('flock -w') > 0 && i('flock -w') < i('fetch --prune') && i('fetch --prune') < i('archive --format=tar') && i('archive --format=tar') < i('systemctl restart'));
  vrai('⛔ le retour arrière existe, et il ne se contente pas de rebasculer : il redémarre et recontrôle', /basculer "\$PRECEDENT"[\s\S]{0,120}systemctl restart[\s\S]{0,80}verifier "\$ACTUEL"/.test(code));
  vrai('⛔ le contrôle compare le SHA (pas seulement ok:true)', /process\.argv\[1\]\.startsWith\(j\.sha\)/.test(code));
  vrai('⛔ npm ci s\'exécute sous opmsg, avec --ignore-scripts', /runuser -u opmsg -- /.test(code) && /--ignore-scripts/.test(code) && /--omit=dev/.test(code));
  vrai('⛔ ce que la CI demande est validé au motif (instance, sha complet, option)', /\^\(beta\|prod\)\$/.test(code) && /\^\[0-9a-f\]\{40\}\$/.test(code) && /\^\(retour\)\?\$/.test(code));
  vrai('⛔ sous ssh, le préfixe de chemin du bac est ignoré (R=""), jamais décidé de l\'extérieur', /if \[ -n "\$\{SSH_ORIGINAL_COMMAND:-\}" \]; then\s*\n\s*R=""/.test(code));
  vrai('   « non installé » sort en 0', /non installé[^\n]*\n\s*exit 0/.test(code));
  vrai('⛔ le déployeur n\'affiche aucune configuration ni journal : aucun cat, aucun systemctl status ni journalctl exécuté', !/\bcat\s|journalctl/.test(codeSansEcho) && !/systemctl status/.test(codeSansEcho));
}

/* ══ 3. LE MODE D'EMPLOI DE JUSTIN ═════════════════════════════════════════════════════════════════════ */
{
  const doc = path.join(RACINE, 'design', 'opmessages', 'INSTALLER-LE-SERVEUR.md');
  vrai('le mode d\'emploi existe', fs.existsSync(doc));
  if (fs.existsSync(doc)) {
    const md = lire(doc);
    const blocs = [...md.matchAll(/```(?:bash)?\n([\s\S]*?)```/g)].map(m => m[1]);
    vrai('il porte des blocs de commandes (population avant verdict)', blocs.length >= 8);
    /* ⛔ LES COMMANDES, C'EST AUSSI CE QUI EST ÉCRIT ENTRE ACCENTS GRAVES DANS UNE PHRASE (« `systemctl status …` ») : Justin
       les copie de la même façon. Une première version ne lisait que les blocs, et la mutation « cat de la configuration dans
       une puce » restait verte — la population lue était trop petite. */
    const enLigne = [...md.matchAll(/`([^`\n]+)`/g)].map(m => m[1]);
    vrai('il porte aussi des commandes en ligne (population avant verdict)', enLigne.length >= 10);
    const commandes = blocs.join('\n') + '\n' + enLigne.join('\n');
    const interdits = [
      ['aucun cat de la clé maître ni du dossier de configuration (sauf la relecture masquée, V=$(cat …) : le contenu va dans une variable, pas à l\'écran)', /(?<!V=\$\()\bcat\s+\S*(\.kek|\/etc\/opmsg)/],
      ['aucun cat de la configuration (elle porte la clé privée VAPID)', /\bcat\s+\S*\.json/],
      ['aucun echo d\'une variable de clé', /\becho\s+["']?\$\{?K\b(?!\})/],
      ['aucun affichage des variables d\'environnement (env, printenv, set)', /^\s*(env|printenv|set)\s*$/m],
      ['aucun ps (il montrerait la clé en argument)', /\bps\s+(aux|-ef|-e)/],
      ['aucun cat de la clé privée SSH', /\bcat\s+\S*opmsg-deploiement(?!\.pub)/],
      ['aucun openssl rand qui ne soit pas redirigé vers le presse-papiers', /openssl rand -hex 32(?!\s*\|\s*pbcopy)/],
    ];
    for (const [nom, re] of interdits) v('⛔ ' + nom, re.test(commandes), false);
    for (const [nom, re] of [
      ['la clé maître naît dans le presse-papiers (openssl rand -hex 32 | pbcopy)', /openssl rand -hex 32 \| pbcopy/],
      ['la clé SSH est faite sans phrase de passe, sur le Mac', /ssh-keygen -t ed25519 -N ""/],
      ['la privée de la bêta va dans le secret GitHub sans s\'afficher (gh secret set … <)', /gh secret set VPS_SSH_KEY_MSG_BETA < /],
      ['puis elle est effacée du Mac', /rm -P ~\/opmsg-deploiement/],
      ['la clé du service se compare SANS l\'afficher (cmp -s)', /cmp -s \/etc\/opmsg\/beta\.kek \/run\/credentials\/teamop-msg@beta\.service\/kek/],
      ['les copies se relisent en saisie masquée (read -rsp)', /read -rsp "Colle \(ou tape\) la clé/],
      ['le proxy se tranche par ss -ltnp', /ss -ltnp \| grep -E ':\(80\|443\) '/],
      ['le DNS se vérifie par dig', /dig \+short msg-beta\.teamop\.fr/],
      ['l\'installation se lance par un fichier téléchargé, pas par un tuyau', /curl -fsSL \S+install-msg\.sh -o \/root\/install-msg\.sh/],
      ['la production demande la phrase (OPMSG_PUBLIE=oui)', /OPMSG_PUBLIE=oui bash \/root\/install-msg\.sh prod/],
    ]) vrai('   ' + nom, re.test(commandes));
    vrai('   aucun `curl … | bash` (le script pose des questions : il se lit avant de se lancer)', !/curl[^\n|]*\|\s*(ba)?sh/.test(commandes));
    vrai('   l\'IP du VPS est celle de deploiement.yml', md.includes('217.154.6.139') && lire(path.join(RACINE, '.github', 'workflows', 'deploiement.yml')).includes('217.154.6.139'));
    /* Les gestes sont DANS L'ORDRE : proxy, DNS, clé maître, clé SSH, installation, lecture de la clé, contrôle de l'extérieur. */
    const pos = [/ss -ltnp/, /dig \+short msg-beta/, /openssl rand -hex 32/, /ssh-keygen/, /bash \/root\/install-msg\.sh beta/, /cmp -s \/etc\/opmsg/, /curl -s https:\/\/msg-beta\.teamop\.fr\/health/].map(re => { const m = re.exec(md); return m ? m.index : -1; });
    vrai('⛔ les gestes sont dans l\'ordre (proxy, DNS, clé maître, clé SSH, installation, lecture de la clé, contrôle extérieur)', pos.every((p, k) => p > 0 && (k === 0 || p > pos[k - 1])));
    for (const [nom, re] of [
      ['elle dit que la production attend la phrase de Justin', /publie OP MESSAGES/],
      ['elle nomme l\'environnement msg-prod et son relecteur obligatoire', /msg-prod[\s\S]{0,400}Required reviewers/],
      ['elle dit que la clé de la production est NEUVE', /clé maître NEUVE/],
      ['elle dit ce que l\'installation ne fait PAS (sauvegarde, TURN)', /Ce que cette installation ne fait PAS[\s\S]*sauvegarde[\s\S]*TURN/],
      ['elle dit ce qu\'il faut voir à la fin', /✓ OP MESSAGES \(beta\) installé\./],
    ]) vrai('   ' + nom, re.test(md));
    vrai('   aucun secret réel dans le document (rien qui ressemble à une clé de 64 hexadécimaux ou à une clé privée)', !/\b[0-9a-f]{64}\b/i.test(md) && !/BEGIN [A-Z ]*PRIVATE KEY/.test(md));
  }
}

/* ══ 4. ÉCARTS À LA CONVENTION DU DÉPÔT ════════════════════════════════════════════════════════════════ */
{
  const gi = lire(path.join(RACINE, '.gitignore'));
  vrai('⛔ server-msg/node_modules est ignoré SANS barre finale (les préparations en posent parfois un LIEN, qu\'un motif « dossier » ne retient pas)', /^server-msg\/node_modules$/m.test(gi));
}

/* ══ 5. LA COUTURE AVEC LA POSE DE CLÉ DU SERVICE — jouée dès qu'elle existe dans le dépôt ═════════════════
   `install-msg.sh` APPELLE `server-msg/poser-cle.js` (écrit à part, par l'auteur du service) : mêmes noms
   d'environnement, une clé en second argument, un drop-in `LoadCredential=kek:`. Les deux moitiés étaient
   justes séparément le 20 septembre 2026 et ne se parlaient pas — la règle du dépôt (« dès qu'une moitié appelle
   l'autre, un banc fait parler la VRAIE fonction à la VRAIE fonction »). Absente, on le DIT ; présente, on l'exécute. */
{
  const reelle = path.join(SM, 'poser-cle.js');
  if (!fs.existsSync(reelle)) {
    console.log('  (poser-cle.js du service pas encore dans ce dépôt : la couture avec install-msg.sh n\'est pas éprouvée ici — elle l\'est dès la fusion)');
  } else {
    const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-cle-'));
    const env = Object.assign({}, process.env, { OPMSG_KEK_DIR: path.join(d, 'etc'), OPMSG_DATA: path.join(d, 'data'), OPMSG_DROPIN_DIR: path.join(d, 'dropin') });
    const K = 'a1b2c3d4'.repeat(8);
    fs.mkdirSync(env.OPMSG_DATA, { recursive: true });
    fs.mkdirSync(env.OPMSG_KEK_DIR, { recursive: true }); fs.chmodSync(env.OPMSG_KEK_DIR, 0o755);   // comme install-msg.sh le crée AVANT la pose de clé
    const lancer = (...args) => spawnSync(process.execPath, [reelle, 'beta', ...args], { encoding: 'utf8', env });
    /* Le contrat : la clé du séquestre arrive par l'ENTRÉE STANDARD (`--stdin`), jamais en argument (visible dans `ps`). */
    const lancerStdin = (entree) => spawnSync(process.execPath, [reelle, 'beta', '--stdin'], { encoding: 'utf8', env, input: entree });
    const r = lancerStdin(K + '\n');
    v('la VRAIE pose de clé accepte « beta --stdin » avec la clé sur l\'entrée standard et les variables d\'environnement d\'install-msg.sh', r.status, 0);
    v('   elle écrit la clé là où install-msg.sh la cherche (<dossier>/beta.kek) en 0600', [(() => { try { return fs.readFileSync(path.join(d, 'etc', 'beta.kek'), 'utf8').trim(); } catch (e) { return null; } })(),
      (() => { try { return (fs.statSync(path.join(d, 'etc', 'beta.kek')).mode & 0o777).toString(8); } catch (e) { return null; } })()], [K, '600']);
    vrai('   et le drop-in porte LoadCredential=kek: (le nom que le service lit dans $CREDENTIALS_DIRECTORY)',
      /LoadCredential=kek:/.test((() => { try { return fs.readFileSync(path.join(d, 'dropin', 'kek.conf'), 'utf8'); } catch (e) { return ''; } })()));
    vrai('⛔ elle n\'AFFICHE pas la clé', !String(r.stdout).includes(K) && !String(r.stderr).includes(K));
    v('⛔ le dossier de la clé reste lisible (755) : il porte aussi la configuration que le service lit sous SON utilisateur (0700 la lui rendait illisible)',
      (fs.statSync(path.join(d, 'etc')).mode & 0o777).toString(8), '755');
    const r2 = lancer();
    v('   rappelée sans clé (déjà posée) : sortie 0, la clé ne change pas', [r2.status, fs.readFileSync(path.join(d, 'etc', 'beta.kek'), 'utf8').trim()], [0, K]);
    const d2 = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-cle-'));
    const env2 = Object.assign({}, env, { OPMSG_KEK_DIR: path.join(d2, 'etc'), OPMSG_DATA: path.join(d2, 'data'), OPMSG_DROPIN_DIR: path.join(d2, 'dropin') });
    fs.mkdirSync(env2.OPMSG_DATA, { recursive: true }); fs.writeFileSync(path.join(env2.OPMSG_DATA, 'msg.db'), 'x');
    const r3 = spawnSync(process.execPath, [reelle, 'beta'], { encoding: 'utf8', env: env2 });
    v('⛔ des données (msg.db) et pas de clé, aucune clé donnée : la VRAIE pose de clé REFUSE de régénérer', [r3.status, fs.existsSync(path.join(d2, 'etc', 'beta.kek'))], [1, false]);
    fs.rmSync(d, { recursive: true, force: true }); fs.rmSync(d2, { recursive: true, force: true });
  }
}

t.fin();
