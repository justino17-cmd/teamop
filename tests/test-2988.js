/* ══ test-2988 — LE DÉPLOYEUR DE L'ESPACE DE TEST (server/deployer-test.sh) ET SON WORKFLOW ═══════════════════════
   Décision de Justin, 23 octobre 2026 : « toute modification, site, application, la Tour, je veux des espaces de
   test, et après on pousse ». Ce script met un commit en essai sur test.teamop.fr, SUR LA MÊME MACHINE que la production.

   Cinq choses sont gardées, et chacune a son piège :
     1. ⛔ LA PRODUCTION N'EST JAMAIS TOUCHÉE. Une seule faute de chemin (`/opt/teamop` pour `/opt/teamop/test`, `teamop-api`
        pour `teamop-api-test`) et un essai de branche écrase les données ou redémarre le serveur de clients réels. Deux
        preuves, qui ne se remplacent pas : le TEXTE du script (code seul, commentaires retirés : un motif de banc vise du code,
        jamais une phrase) ET une exécution dans un faux VPS qui contient la production en sentinelles hachées avant/après ;
     2. ⛔ L'ORDRE. Rien ne bascule tant que l'export, les dépendances et la fabrication des pages n'ont pas réussi : un
        déploiement raté laisse l'ANCIEN en service et le DIT (npm ci, fabrication, /health — trois échecs joués, plus la
        première installation, qui n'a rien où revenir) ;
     3. ⛔ AUCUN SECRET À L'ÉCRAN. La sortie d'un job GitHub est publique : la fabrication des pages connaît la clé des routes
        d'essai, sa sortie va dans un fichier du VPS (0600) — un canari imprimé par le faux fabricant ne doit jamais ressortir ;
     4. ⛔ ROOT N'EXÉCUTE JAMAIS CE QU'UNE BRANCHE A ÉCRIT (relecture adverse du 23 octobre 2026). Le banc exigeait AVANT « on repasse la main
        au plus récent » : le déployeur se relançait depuis la release, donc une demande de fusion choisissait le script que root allait
        exécuter. Il exige l'INVERSE : un déployeur différent dans le commit n'est jamais lancé (un témoin l'écrirait), le déployeur est un
        fichier de root hors du miroir, et tout ce qui exécute ou décompresse le code d'une branche (tar, npm ci, la fabrication des pages)
        passe par une CELLULE systemd (`systemd-run` : écriture bornée, production invisible, réseau coupé sauf npm) — jamais par un `runuser` nu.
        ⚠️ Le faux systemd-run du bac N'APPLIQUE aucune restriction : il note les propriétés posées. Que la cellule TIENNE se vérifie sur la vraie
        machine, par `deployer-test --sonde` (appelé par l'installeur) ;
     5. ⛔ LA CLÉ DE LA CI N'A PAS LA PRODUCTION. Le banc exigeait AVANT « une seule clé, VPS_SSH_KEY » : celle de la production, un shell root, lue
        par n'importe quelle branche qui modifie le workflow. Il exige l'INVERSE : un environnement protégé (`essai-test`), un secret à lui
        (`VPS_SSH_KEY_TEST`), une commande forcée côté VPS — et `VPS_SSH_KEY` n'apparaît dans AUCUN code du workflow.

   Le faux VPS (git, npm, systemctl, systemd-run, runuser, curl) est dans tests/bac-vps-essais.js. Ce qu'on joue est le VRAI deployer-test.sh. */
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');
const { creerBac, code, RACINE_DEPOT, SHA_A, SHA_B, SHA_C, SHA_D, SHA_E, SHA_F, CANARI_BUILD } = require('./bac-vps-essais');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };

if (spawnSync('bash', ['-c', 'true']).status !== 0 || spawnSync('jq', ['--version']).status !== 0 || spawnSync('flock', ['--version']).status !== 0) {
  console.log('  (bash, jq ou flock absent — banc sauté)\n0 ✓  0 ✗'); return;
}

const DEPLOYEUR = path.join(RACINE_DEPOT, 'server/deployer-test.sh');
const SRC = code(DEPLOYEUR);
const BRUT = fs.readFileSync(DEPLOYEUR, 'utf8');
const bacs = [];
const bac = (opts) => { const b = creerBac(); bacs.push(b); b.installer(opts); return b; };

/* ═══ 1. LE TEXTE : la production n'est jamais nommée dans ce qui s'exécute ═══════════════════════════════════════ */
console.log('\n── 1. Le texte du script (code seul, commentaires retirés)');
vrai('le script se parse (bash -n)', spawnSync('bash', ['-n', DEPLOYEUR]).status === 0);
vrai('le code n\'est pas vide (une tranche vide passerait tout)', SRC.length > 4000 && /flock/.test(SRC) && /systemctl restart/.test(SRC) && /systemd-run/.test(SRC));
const lignesProd = SRC.split('\n').filter(l => /\/opt\/teamop\/(data|config\.json|monitor\.json|repo|firebase-admin)/.test(l));
vrai('⛔ le code ne nomme /opt/teamop/data, config.json, monitor.json, repo QUE pour les rendre INVISIBLES à la cellule (' + lignesProd.length + ' lignes : les deux listes et la sonde)',
  lignesProd.length >= 2 && lignesProd.every(l => /^INVISIBLES(_STRICT)?=/.test(l) || /^for p in /.test(l)), lignesProd.map(l => l.slice(0, 60)));
vrai('⛔ le code ne nomme jamais l\'unité de production : `teamop-api` n\'apparaît que suivi de `-test`', !/teamop-api(?!-test)/.test(SRC));
const lignesEtc = SRC.split('\n').filter(l => /\/etc\/teamop/.test(l));
vrai('⛔ /etc/teamop (la clé maître de la production y vit) n\'est nommé que pour être INVISIBLE (' + lignesEtc.length + ' lignes)', lignesEtc.length >= 2 && lignesEtc.every(l => /^INVISIBLES(_STRICT)?=/.test(l) || /^for p in /.test(l)));
const lignesOpt = SRC.split('\n').filter(l => /\/opt\//.test(l));
vrai('tous les chemins du script naissent de OPT = $R/opt/teamop/test ; les autres /opt/ sont les listes d\'invisibles (' + lignesOpt.length + ' lignes)',
  /^OPT="\$R\/opt\/teamop\/test"$/m.test(SRC) && lignesOpt.every(l => /^OPT=/.test(l) || /^INVISIBLES(_STRICT)?=/.test(l) || /^for p in /.test(l)), lignesOpt.map(l => l.slice(0, 70)));
const systemctls = SRC.match(/systemctl [^\n]*/g) || [];
vrai('systemctl est appelé (' + systemctls.length + ' fois) et seulement sur $UNITE, définie comme teamop-api-test', systemctls.length >= 3 && systemctls.every(l => /\$UNITE\b/.test(l)) && /^UNITE="teamop-api-test"$/m.test(SRC));
const rms = SRC.match(/\brm -[rf]+ [^\n;|&)]*/g) || [];
vrai('chaque `rm` vise un chemin fabriqué (release, pages neuves, ancien lien, dossier de la sonde), jamais un chemin en dur (' + rms.length + ' recensés)',
  rms.length >= 8 && rms.every(l => /\$(DEST|PAGES_NEUVES|vieux|LIEN|SONDE_DOSSIER|1|2)\b/.test(l)), rms);
vrai('⛔ la bascule des pages est un RENOMMAGE (mv -T d\'un lien neuf sur le lien courant) : le site n\'est jamais sans pages', /ln -sfn "\$PAGES_NEUVES" "\$LIEN_PAGES\.nouveau"\nmv -T "\$LIEN_PAGES\.nouveau" "\$LIEN_PAGES"/.test(SRC));
vrai('⛔ la bascule du code est un renommage aussi', /ln -sfn "\$1" "\$LIEN\.nouveau"\n\s*mv -T "\$LIEN\.nouveau" "\$LIEN"/.test(SRC));
/* LA CELLULE : ce qui touche au code d'une branche */
vrai('⛔ `runuser` (le compte de test SANS cellule) n\'est défini qu\'UNE fois, pour git — jamais pour tar, npm ni node', (SRC.match(/\brunuser\b/g) || []).length === 1 && /^EN_TANT_QUE\(\) \{ runuser -u teamoptest -- "\$@"; \}$/m.test(SRC));
vrai('…et `EN_TANT_QUE` n\'est appelé que par `git_miroir` (' + (SRC.match(/\bEN_TANT_QUE\b/g) || []).length + ' occurrences)', (SRC.match(/\bEN_TANT_QUE\b/g) || []).length === 2 && /^git_miroir\(\) \{ EN_TANT_QUE git /m.test(SRC));
vrai('⛔ l\'export est décompressé DANS UNE CELLULE sans réseau, écriture bornée à la release', /git_miroir archive --format=tar "\$SHA" \| cellule non "\$DEST" "\$DEST" "\$INVISIBLES_STRICT" -- tar -x -C "\$DEST"/.test(SRC));
vrai('⛔ npm ci tourne DANS UNE CELLULE (la seule avec du réseau), sans script d\'installation (--ignore-scripts), écriture bornée à la release', /cellule oui "\$DEST" "\$DEST" "\$INVISIBLES_STRICT" HOME="\$DEST" npm_config_cache="\$DEST\/\.npm-cache" -- \\\n\s*npm ci --omit=dev --ignore-scripts/.test(SRC) && (SRC.match(/\bcellule oui\b/g) || []).length === 1);
vrai('⛔ la fabrication des pages tourne DANS UNE CELLULE sans réseau, écriture bornée aux pages neuves, avec la configuration et les données DE TEST', /cellule non "\$DEST" "\$PAGES_NEUVES" "\$INVISIBLES" TEAMOP_CONFIG="\$CONFIG" TEAMOP_DATA="\$DATA" -- \\\n\s*node scripts\/essais-build\.js "\$PAGES_NEUVES" "\$SHA" "\$BRANCHE"/.test(SRC));
vrai('⛔ la sortie de la fabrication va dans un fichier, jamais à l\'écran (>"$JOURNAL_BUILD" 2>&1) et le journal est 0600', />"\$JOURNAL_BUILD" 2>&1 \|\| CODE=\$\?/.test(SRC) && /chmod 600 "\$JOURNAL_BUILD"/.test(SRC));
{
  const cel = (SRC.match(/^cellule\(\) \{[\s\S]*?\n\}/m) || [''])[0];
  vrai('(population) la fonction `cellule` est trouvée', cel.length > 300, cel.length);
  for (const [nom, re] of [['un utilisateur à lui (User=teamoptest)', /-p User=teamoptest/], ['aucun privilège (NoNewPrivileges=yes)', /-p NoNewPrivileges=yes/], ['système en LECTURE SEULE (ProtectSystem=strict)', /-p ProtectSystem=strict/],
    ['dossiers inscriptibles bornés (ReadWritePaths)', /-p "ReadWritePaths=\$rw"/], ['production INVISIBLE (InaccessiblePaths)', /-p "InaccessiblePaths=\$invisibles"/], ['réseau décidé par l\'appelant (PrivateNetwork)', /-p "PrivateNetwork=\$net"/ ],
    ['/tmp privé, pas de /home, pas de périphériques', /-p PrivateTmp=yes -p PrivateDevices=yes -p ProtectHome=yes/], ['dossier de travail', /-p "WorkingDirectory=\$cwd"/], ['unité éphémère qu\'on attend, sans résidu', /systemd-run --quiet --wait --pipe --collect/]])
    vrai('   la cellule pose : ' + nom, re.test(cel));
  vrai('   et le réseau n\'est ouvert que si l\'appelant écrit « oui » (jamais par défaut)', /local net=yes; \[ "\$reseau" != "oui" \] \|\| net=no/.test(cel));
}
const INV = (SRC.match(/^INVISIBLES="([^"]*)"$/m) || [])[1] || '';
const PROD_INVISIBLE = ['/opt/teamop/data', '/opt/teamop/config.json', '/opt/teamop/monitor.json', '/opt/teamop/repo', '/opt/teamop/firebase-admin.json', '/opt/opmsg', '/opt/opcourrier', '/etc/teamop', '/etc/letsencrypt', '/etc/nginx', '/etc/caddy', '/root'];
v('⛔ la cellule ne voit pas la production d\'OP GESTION, d\'OP MESSAGES et d\'OP Courrier, ni la clé maître, les certificats, les proxys et /root (chaque chemin avec son « - »)', PROD_INVISIBLE.filter(p => INV.split(' ').indexOf('-' + p) < 0), []);
vrai('…et les étapes qui n\'ont aucune raison de lire la configuration de test (tar, npm) ne la voient pas non plus', /^INVISIBLES_STRICT="\$INVISIBLES -\/opt\/teamop\/test\/config\.json -\/opt\/teamop\/test\/data -\/opt\/teamop\/test\/monitor\.json"$/m.test(SRC));
vrai('⛔ le déployeur du COMMIT n\'est JAMAIS relancé : ni `exec bash`, ni comparaison avec $0, ni variable de relance', !/\bexec bash\b/.test(SRC) && !/cmp -s/.test(SRC) && !/TEAMOP_TEST_RELANCE/.test(SRC) && !/\$DEST\/server\/deployer/.test(SRC));
vrai('…et il ne rend plus le miroir inscriptible par autre chose que git (aucun checkout du miroir par le déployeur)', !/git_miroir checkout/.test(SRC));
vrai('le code n\'imprime jamais le journal du service (pas de journalctl exécuté : le dépôt est public)', !/^\s*journalctl\b/m.test(SRC) && !/\$\(journalctl/.test(SRC));
vrai('l\'ordre dans le texte : export < npm ci < fabrication < bascule du code < bascule des pages',
  (() => { const i = s => SRC.indexOf(s); const o = [i('git_miroir archive'), i('npm ci'), i('node scripts/essais-build.js'), i('basculer "$DEST"'), i('mv -T "$LIEN_PAGES.nouveau"')]; return o.every(x => x > 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('sans systemd-run, le déploiement ÉCHOUE (on ne retombe jamais sur un `runuser` nu), et c\'est dit', /command -v systemd-run[^\n]*\|\| \{ echo "✗ systemd-run est absent : on ne lance jamais le code d'une branche hors de sa cellule/.test(SRC));
vrai('la sonde vérifie les trois choses : production invisible (lecture), écriture HORS de son dossier refusée, réseau coupé', /for p in \/opt\/teamop\/data \/opt\/teamop\/config\.json \/opt\/teamop\/monitor\.json/.test(SRC) && /ecriture-hors-cellule/.test(SRC) && /\/dev\/tcp\/1\.1\.1\.1\/53/.test(SRC));

/* ═══ 2. LES ARGUMENTS ET « NON INSTALLÉ » ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. Arguments refusés, machine non installée');
{
  const b = bac();
  let r = b.deployer('abc', 'ma-branche');
  v('un SHA qui n\'a pas 40 hexadécimaux est refusé (code 2)', r.rc, 2);
  r = b.deployer(SHA_A, 'branche; rm -rf /');
  v('⛔ un nom de branche avec « ; » est refusé (code 2) : un nom de branche vient d\'un humain', r.rc, 2);
  r = b.deployer(SHA_A, 'a$(touch x)b');
  v('⛔ « $(…) » dans un nom de branche est refusé', r.rc, 2);
  r = b.deployer(SHA_A);
  v('sans branche : refusé', r.rc, 2);
  r = b.lancer([SHA_A, 'main', 'en-trop']);
  v('un argument de trop : refusé', r.rc, 2);
  vrai('rien n\'a été écrit par les refus', !b.existe('opt/teamop/test/releases/' + SHA_A) && b.journal().length === 0);
  b.nettoyer();
  const n = creerBac(); bacs.push(n);
  n.poserDeployeur();   // le déployeur est posé, mais ni l'unité, ni la configuration, ni le miroir : « non installé »
  r = n.deployer(SHA_A, 'main');
  v('⛔ machine NON INSTALLÉE : sort en 0 (la CI ne rougit pas pour une machine qu\'on n\'a pas préparée)…', r.rc, 0);
  vrai('…et le DIT, pour qu\'un vert ne se lise pas « déployé »', /non installé/.test(r.out) && /rien n'a été déployé/.test(r.out));
  v('…sans avoir appelé git, npm, systemctl ni une cellule', n.journal().length, 0);
}

/* ═══ 3. UN PREMIER DÉPLOIEMENT, DANS L'ORDRE ═════════════════════════════════════════════════════════════════════ */
console.log('\n── 3. Premier déploiement : l\'ordre des gestes, les cellules, la bascule, le commit servi');
const B1 = bac({ pagesVides: true });
const avantProd = B1.empreinteProduction();
let r = B1.deployer(SHA_A, 'claude/ma-branche');
const j1 = B1.journal();
v('le déploiement réussit (code 0)', r.rc, 0);
vrai('« déployé : » avec la branche, le commit court et l\'adresse', /déployé : claude\/ma-branche aaaaaaaa — https:\/\/test\.teamop\.fr\/essais\.html/.test(r.out));
const pos = (re) => j1.findIndex(l => re.test(l));
const ordre = [pos(/^git fetch/), pos(/^git archive/), pos(/^cellule .* cmd=tar$/), pos(/^npm ci/), pos(/^build /), pos(/^systemctl restart teamop-api-test/), pos(/^curl health/)];
vrai('⛔ l\'ordre du journal : fetch < archive < tar < npm ci < fabrication des pages < redémarrage < contrôle de /health (' + JSON.stringify(ordre) + ')', ordre.every(x => x >= 0) && ordre.every((x, k) => k === 0 || x > ordre[k - 1]));
vrai('le commit est demandé par son SHA (fetch ciblé), pas par un git pull', j1.some(l => /^git fetch/.test(l)) && !j1.some(l => /^git (pull|merge|checkout)/.test(l)));
const cellules = j1.filter(l => /^cellule /.test(l));
const celDe = (cmd) => cellules.find(l => new RegExp(' cmd=' + cmd + '$').test(l)) || '';
v('(population) trois cellules : tar, npm, node (la fabrication des pages)', cellules.map(l => l.replace(/^.* cmd=/, '')), ['tar', 'npm', 'node']);
vrai('⛔ toutes tournent sous teamoptest, sans privilège, système en lecture seule', cellules.every(l => /user=teamoptest /.test(l) && /nopriv=yes /.test(l) && /systeme=strict /.test(l)));
vrai('⛔ SEULE npm a du réseau (net=no : pas de réseau privé) ; tar et la fabrication des pages n\'en ont PAS (net=yes)', /net=no /.test(celDe('npm')) && /net=yes /.test(celDe('tar')) && /net=yes /.test(celDe('node')), cellules.map(l => l.match(/net=\S+/)[0]));
vrai('⛔ l\'écriture de chaque cellule est bornée à UN dossier : la release pour tar et npm, le dossier de pages neuf pour la fabrication', /rw=\S*\/releases\/a{40} /.test(celDe('tar')) && /rw=\S*\/releases\/a{40} /.test(celDe('npm')) && /rw=\S*\/pages\.d\/\d{14}-aaaaaaaa /.test(celDe('node')), cellules.map(l => l.match(/rw=\S+/)[0]));
vrai('⛔ la production est invisible à chacune (données, configuration, fichier de la Tour, dépôt, /etc/teamop)', cellules.every(l => ['/opt/teamop/data', '/opt/teamop/config.json', '/opt/teamop/monitor.json', '/opt/teamop/repo', '/etc/teamop'].every(p => l.includes('-' + p))));
vrai('…et tar et npm ne voient pas non plus la configuration de TEST', ['tar', 'npm'].every(c => /-\/opt\/teamop\/test\/config\.json/.test(celDe(c))) && !/-\/opt\/teamop\/test\/config\.json/.test(celDe('node')));
vrai('⛔ npm ci tourne sans script d\'installation (--ignore-scripts), sous teamoptest', j1.some(l => /^npm ci as=teamoptest .*--ignore-scripts/.test(l)));
vrai('⛔ la fabrication des pages tourne sous teamoptest, avec la configuration et les données DE TEST',
  j1.some(l => /^build as=teamoptest sha=aaaaaaaa branche=claude\/ma-branche /.test(l) && /cfg=\S*\/opt\/teamop\/test\/config\.json data=\S*\/opt\/teamop\/test\/data /.test(l)));
vrai('…depuis la release (le dossier de travail est la release)', j1.some(l => /^build .* cwd=\S*\/releases\/a{40}$/.test(l)));
vrai('⛔ le seul `runuser` restant est celui de git (le compte de test, hors cellule, ne lance JAMAIS node, npm ni tar)', j1.filter(l => /^runuser /.test(l)).every(l => l === 'runuser teamoptest git'), j1.filter(l => /^runuser /.test(l)));
vrai('⛔ À L\'INSTANT de la fabrication, rien n\'a encore basculé (le lien du code n\'existe pas, les pages sont toujours l\'attente)', j1.some(l => /^build .* current=- pages=vide /.test(l)));
vrai('⛔ AU REDÉMARRAGE le code est le neuf et les pages sont encore celles d\'avant', j1.some(l => /^systemctl restart teamop-api-test \| current=aaaaaaaa pages=vide$/.test(l)));
v('le lien du code désigne la release du commit', path.basename(B1.lien('opt/teamop/test/current') || ''), SHA_A);
vrai('les pages ont basculé sur le dossier neuf, qui porte essais.html avec le commit', /pages\.d\/\d{14}-aaaaaaaa$/.test(B1.lien('opt/teamop/test/pages') || '') && /claude\/ma-branche aaaaaaa/.test(fs.readFileSync(path.join(B1.lien('opt/teamop/test/pages'), 'essais.html'), 'utf8')));
v('le commit servi est enregistré', B1.lire('opt/teamop/test/commit-servi').split(' ').slice(0, 2), [SHA_A, 'claude/ma-branche']);
v('l\'unité reçoit le commit par son EnvironmentFile', B1.lire('opt/teamop/test/commit.env'), 'TEAMOP_COMMIT=' + SHA_A + '\nTEAMOP_BRANCHE=claude/ma-branche\n');
vrai('la release porte ses dépendances et son marqueur de fin', B1.existe('opt/teamop/test/releases/' + SHA_A + '/server/node_modules') && B1.existe('opt/teamop/test/releases/' + SHA_A + '/.pret'));
vrai('la sortie dit où en sont les routes d\'essai (présentes, fermées sans clé)', /routes d'essai : présentes \(fermées sans la clé : 403\)/.test(r.out));
vrai('⛔ le déployeur du commit n\'est PAS relancé, et la sortie ne le dit plus (« repasse la main » n\'existe plus)', !/repasse la main/.test(r.out) && !j1.some(l => /deployer/.test(l)));
vrai('la sortie PRÉVIENT que le code s\'installe, et que rien ne s\'affichera pendant ce temps (un silence de deux minutes se lit « ça pend »)', /compte une à deux minutes, rien ne s'affiche/.test(r.out));
vrai('⛔ AUCUN SECRET À L\'ÉCRAN : le canari imprimé par le fabricant de pages n\'est pas dans la sortie', !r.out.includes(CANARI_BUILD));
vrai('…il est dans le journal du VPS (build.log), en 0600', B1.lire('opt/teamop/test/build.log').includes(CANARI_BUILD) && (fs.statSync(B1.chemin('opt/teamop/test/build.log')).mode & 0o777) === 0o600);
v('⛔ LA PRODUCTION EST OCTET POUR OCTET CELLE D\'AVANT (données, configuration, dépôt, unité, clé maître, bloc nginx d\'api)', B1.empreinteProduction(), avantProd);
vrai('⛔ aucun appel systemctl ne nomme l\'unité de production', !j1.some(l => /teamop-api(?!-test)/.test(l)));

/* ═══ 3 bis. LES TESTS PROPRES À LA MODIFICATION ARRIVENT AU FABRICANT DE PAGES ══════════════════════════════════ */
console.log('\n── 3 bis. essais/parcours.json du commit → `--parcours` du fabricant de pages');
vrai('sans essais/parcours.json dans le commit : le fabricant n\'a AUCUN argument de plus, et la sortie le dit', j1.some(l => /^build-args parcours=- arguments=3$/.test(l)) && /tests de la modification : aucun \(pas de essais\/parcours\.json dans ce commit\)/.test(r.out));
{
  const b = bac({ pagesVides: true });
  const PARC = JSON.stringify([{ titre: 'Le devis change de couleur', quoi: 'Ouvre un devis.', attendu: 'Le titre est vert.' }]);
  fs.mkdirSync(path.join(b.FIX, SHA_C, 'essais'), { recursive: true }); fs.writeFileSync(path.join(b.FIX, SHA_C, 'essais/parcours.json'), PARC);
  const x = b.deployer(SHA_C, 'claude/ma-modification');
  const jb = b.journal();
  v('un commit qui porte essais/parcours.json se déploie', x.rc, 0);
  vrai('⛔ le fabricant reçoit `--parcours <release>/essais/parcours.json` (le fichier DU COMMIT, pas un fichier de la machine)', jb.some(l => /^build-args parcours=\S*\/releases\/c{40}\/essais\/parcours\.json arguments=5$/.test(l)), jb.filter(l => /^build-args/.test(l)));
  vrai('…la sortie le dit', /tests de la modification : essais\/parcours\.json/.test(x.out));
  vrai('…et le contenu du fichier du commit arrive jusque dans la page servie', fs.readFileSync(path.join(b.lien('opt/teamop/test/pages'), 'essais.html'), 'utf8').includes('Le devis change de couleur'));
}

/* ═══ 4. LES DÉPLOIEMENTS SUIVANTS : précédent, ménage, et JAMAIS le déployeur d'une release ═════════════════════════ */
console.log('\n── 4. Déploiements suivants : le précédent est gardé, le ménage borne le disque, le déployeur d\'une release n\'est jamais lancé');
{
  /* ⛔ le défaut que le banc d'AVANT exigeait comme voulu : un commit dont `server/deployer-test.sh` est DIFFÉRENT. Il porte un témoin qui s'écrit s'il est exécuté. */
  fs.writeFileSync(path.join(B1.FIX, SHA_B, 'server/deployer-test.sh'), '#!/usr/bin/env bash\necho "DÉPLOYEUR DE LA BRANCHE EXÉCUTÉ" > "$BAC_ETAT/pwned"\nexit 0\n', { mode: 0o755 });
  r = B1.deployer(SHA_B, 'claude/ma-branche');
  v('le deuxième déploiement réussit', r.rc, 0);
  vrai('⛔ le déployeur écrit par la BRANCHE n\'est pas exécuté : le témoin n\'existe pas (le banc d\'avant exigeait qu\'on le lance)', !fs.existsSync(path.join(B1.E, 'pwned')), fs.existsSync(path.join(B1.E, 'pwned')) ? 'EXÉCUTÉ' : '');
  vrai('…et la sortie ne parle d\'aucune relance', !/repasse la main|diffère/.test(r.out));
  v('…le déployeur de root (/usr/local/sbin) n\'a pas changé d\'un octet', fs.readFileSync(B1.chemin('usr/local/sbin/deployer-test'), 'utf8'), BRUT);
}
v('le lien « precedent » désigne la release d\'avant', path.basename(B1.lien('opt/teamop/test/precedent') || ''), SHA_A);
vrai('le code est celui du nouveau commit, les pages aussi', path.basename(B1.lien('opt/teamop/test/current')) === SHA_B && /bbbbbbbb$/.test(B1.lien('opt/teamop/test/pages')));
for (const s of [SHA_C, SHA_D, SHA_E, SHA_F]) { const x = B1.deployer(s, 'claude/ma-branche'); if (x.rc !== 0) console.log('      (déploiement ' + s[0] + ' : ' + x.sortie.slice(-200) + ')'); }
const releases = fs.readdirSync(B1.chemin('opt/teamop/test/releases'));
const pages = fs.readdirSync(B1.chemin('opt/teamop/test/pages.d'));
vrai('⛔ le ménage borne les releases à 3 (' + releases.length + ') : un déploiement par demande de fusion remplirait le disque', releases.length === 3 && releases.includes(SHA_F) && releases.includes(SHA_E));
vrai('…et les fabrications de pages à 3 (' + pages.length + ')', pages.length <= 3 && pages.some(p => /ffffffff$/.test(p)));
vrai('la release courante et la page servie ne sont jamais balayées', fs.existsSync(B1.chemin('opt/teamop/test/current/server/index.js')) && fs.existsSync(path.join(B1.lien('opt/teamop/test/pages'), 'essais.html')));
v('la production n\'a toujours pas bougé après six déploiements', B1.empreinteProduction(), avantProd);

/* ═══ 5. LES ÉCHECS : L'ANCIEN RESTE EN SERVICE, ET C'EST DIT ═══════════════════════════════════════════════════ */
console.log('\n── 5. Un déploiement raté laisse l\'ancien en service');
const etat = (b) => JSON.stringify([b.lien('opt/teamop/test/current'), b.lien('opt/teamop/test/pages'), b.existe('opt/teamop/test/commit.env') ? b.lire('opt/teamop/test/commit.env') : null]);
{
  const b = bac({ identique: true });
  b.deployer(SHA_A, 'main');
  const avant = etat(b), nbRestart = b.journal().filter(l => /^systemctl restart/.test(l)).length;

  b.poser('npm_echec');
  r = b.deployer(SHA_B, 'main');
  v('⛔ npm ci en échec : code 1', r.rc, 1);
  v('…le code et les pages servis n\'ont pas bougé', etat(b), avant);
  vrai('…rien n\'a été redémarré', b.journal().filter(l => /^systemctl restart/.test(l)).length === nbRestart);
  vrai('…la release à moitié faite est retirée', !b.existe('opt/teamop/test/releases/' + SHA_B));
  vrai('…et le message dit que l\'ancien reste en service', /npm ci a échoué/.test(r.out) && /l'ancien reste en service \(aaaaaaaa\)/.test(r.out));
  b.retirer('npm_echec');

  b.poser('build_echec');
  r = b.deployer(SHA_B, 'main');
  v('⛔ fabrication des pages en échec : code 1', r.rc, 1);
  v('…le code et les pages servis n\'ont pas bougé', etat(b), avant);
  vrai('…rien n\'a été redémarré', b.journal().filter(l => /^systemctl restart/.test(l)).length === nbRestart);
  vrai('…le dossier de pages à moitié fait est retiré', fs.readdirSync(b.chemin('opt/teamop/test/pages.d')).every(p => !/bbbbbbbb$/.test(p)));
  vrai('…le message dit que l\'ancien reste en service et renvoie au fichier DU VPS', /la fabrication des pages a échoué \(code 3\)/.test(r.out) && /l'ancien reste en service/.test(r.out) && /build\.log, SUR le VPS/.test(r.out));
  vrai('⛔ …et la raison (qui contient la clé des routes d\'essai) n\'est PAS recopiée à l\'écran', !r.out.includes(CANARI_BUILD));
  b.retirer('build_echec');

  /* ⛔ UNE CELLULE QUI REFUSE ARRÊTE TOUT : on ne retombe jamais sur un lancement sans cellule */
  b.poser('cellule_refuse');
  const nj = b.journal().length;
  r = b.deployer(SHA_C, 'main');
  v('⛔ systemd-run qui refuse (cellule impossible) : code 1', r.rc, 1);
  v('…le code et les pages servis n\'ont pas bougé', etat(b), avant);
  const nouveaux = b.journal().slice(nj);
  vrai('⛔ …et RIEN n\'a été lancé hors cellule : ni npm, ni fabrication des pages, ni redémarrage (aucune repli sur un `runuser` nu)', !nouveaux.some(l => /^(npm|build|systemctl)/.test(l)) && !nouveaux.some(l => /^runuser teamoptest (node|npm|tar|bash)/.test(l)), nouveaux);
  vrai('…la release à moitié faite est retirée, et le message dit que l\'ancien reste en service', !b.existe('opt/teamop/test/releases/' + SHA_C) && /l'ancien reste en service/.test(r.out));
  b.retirer('cellule_refuse');

  b.poser('malsains', SHA_B + '\n');
  r = b.deployer(SHA_B, 'main');
  v('⛔ /health muet après la bascule : code 1', r.rc, 1);
  vrai('…le message annonce le retour arrière et sa réussite', /⛔ bbbbbbbb ne tient pas — retour arrière/.test(r.out) && /retour arrière réussi : l'ancien code est revenu en service \(aaaaaaaa\)/.test(r.out));
  v('⛔ …le code est revenu à l\'ancien, les pages n\'ont JAMAIS bougé, le commit publié est celui d\'avant', etat(b), avant);
  vrai('…le service a été redémarré deux fois (le neuf, puis l\'ancien)', b.journal().filter(l => /^systemctl restart/.test(l)).length === nbRestart + 2);
  vrai('…la release refusée n\'a laissé aucun dossier de pages', fs.readdirSync(b.chemin('opt/teamop/test/pages.d')).every(p => !/bbbbbbbb$/.test(p)));
  b.retirer('malsains');

  /* un redémarrage que systemd refuse (unité cassée) suit le même chemin */
  b.poser('restart_echec');
  r = b.deployer(SHA_D, 'main');
  vrai('systemctl restart qui échoue : retour arrière aussi (code 1)', r.rc === 1 && /retour arrière/.test(r.out));
  v('…l\'état servi est intact', etat(b), avant);
  b.retirer('restart_echec');
  v('⛔ LA PRODUCTION n\'a pas bougé pendant les échecs non plus', b.empreinteProduction(), avantProd);
}
{
  const b = bac({ identique: true, pagesVides: true });
  b.poser('malsains', SHA_A + '\n');
  r = b.deployer(SHA_A, 'main');
  v('première installation dont /health échoue : code 1', r.rc, 1);
  vrai('…il n\'y a rien où revenir : le service de test est ARRÊTÉ (on ne laisse pas tourner ce que le contrôle a refusé), et c\'est dit', b.journal().some(l => /^systemctl stop teamop-api-test/.test(l)) && /première installation en échec/.test(r.out));
  vrai('…le lien du code est retiré, les pages d\'attente restent', b.lien('opt/teamop/test/current') === null && b.lien('opt/teamop/test/pages') === 'pages.d/vide');
}
{
  const b = bac({ identique: true });
  b.deployer(SHA_A, 'main');
  const avant = etat(b);
  b.poser('malsains', SHA_A + '\n');
  r = b.deployer(SHA_A, 'main');
  vrai('⛔ redéployer le MÊME commit alors que /health échoue : code 1, mais le lien n\'est PAS retiré (ce serait éteindre un espace qui marchait)', r.rc === 1 && /même release qu'avant/.test(r.out) && b.lien('opt/teamop/test/current') !== null);
  v('…l\'état servi (code, pages) est celui d\'avant', JSON.stringify([b.lien('opt/teamop/test/current'), b.lien('opt/teamop/test/pages')]), JSON.stringify(JSON.parse(avant).slice(0, 2)));
}
{
  const b = bac({ identique: true });
  b.poser('git_echec');
  r = b.deployer(SHA_A, 'main');
  vrai('⛔ git fetch impossible : code 1, dit en clair, rien de basculé', r.rc === 1 && /git fetch a échoué/.test(r.out) && b.lien('opt/teamop/test/current') === null && !b.journal().some(l => /^(npm|build|systemctl|cellule)/.test(l)));
  b.retirer('git_echec');
  r = b.deployer('9'.repeat(40), 'main');
  vrai('un commit que GitHub ne connaît pas : code 1 et « inconnu du miroir », rien de basculé', r.rc === 1 && /inconnu du miroir/.test(r.out) && !b.journal().some(l => /^(npm|build|systemctl|cellule)/.test(l)));
  r = b.deployer(SHA_A, 'main');
  v('…et le même bac déploie ensuite normalement', r.rc, 0);
}

/* ═══ 6. LE VERROU ET LES ROUTES D'ESSAI ═════════════════════════════════════════════════════════════════════════ */
console.log('\n── 6. Verrou, routes d\'essai');
vrai('un seul déploiement à la fois : flock sur un fichier de verrou DE L\'ESPACE DE TEST, avec attente bornée', /exec 9>"\$OPT\/deployer\.lock"\nflock -w 600 9/.test(SRC));
{
  const b = bac({ identique: true });
  b.poser('routes', '404');
  r = b.deployer(SHA_A, 'main');
  vrai('une branche d\'AVANT le mode test (routes d\'essai en 404) n\'est pas une erreur : le déploiement réussit et le dit', r.rc === 0 && /routes d'essai : absentes \(ce commit ne porte pas le mode test\)/.test(r.out));
  b.poser('routes', '200');
  r = b.deployer(SHA_B, 'main');
  vrai('⛔ des routes d\'essai qui répondent 200 SANS clé sont SIGNALÉES en clair dans la sortie', /ouvertes SANS clé \(200\)/.test(r.out));
}

/* ═══ 7. LA CLÉ DE LA CI : COMMANDE FORCÉE (--ssh), ET LA SONDE DE LA CELLULE ══════════════════════════════════════ */
console.log('\n── 7. `--ssh` (la clé de la CI) et `--sonde` (la cellule tient-elle ?)');
{
  const b = bac();
  const REEL = fs.existsSync('/opt/teamop/test/config.json');   // une machine qui porterait déjà l'espace de test : on ne joue pas la demande valide (elle déploierait pour de vrai)
  const ssh = (cmd, args) => b.lancer(args || ['--ssh'], cmd === null ? {} : { SSH_ORIGINAL_COMMAND: cmd });
  let x = ssh(SHA_A + ' main extra');
  vrai('⛔ un mot de trop dans la demande est refusé (code 2)', x.rc === 2 && /trop de mots/.test(x.out), x.out);
  x = ssh(SHA_A + ' branche;rm');
  v('⛔ un « ; » dans la branche est refusé (code 2)', x.rc, 2);
  x = ssh(SHA_A + ' $(touch ' + path.join(b.B, 'injecte') + ')');
  vrai('⛔ une substitution de commande n\'est pas exécutée (refus, et le fichier témoin n\'existe pas)', x.rc === 2 && !fs.existsSync(path.join(b.B, 'injecte')), x.out);
  x = ssh('abc main');
  v('un SHA trop court est refusé (code 2)', x.rc, 2);
  x = ssh(SHA_A + ' main\n' + SHA_B + ' autre');
  vrai('⛔ une demande sur deux lignes est refusée (la seconde ligne ne passe pas)', x.rc === 2 && /une ligne/.test(x.out), x.out);
  x = ssh(SHA_A + ' main', []);
  vrai('⛔ une clé SANS la borne `--ssh` (ligne d\'authorized_keys écrite à la main) est refusée', x.rc === 2 && /ne sert qu'à mettre un commit en essai/.test(x.out), x.out);
  x = ssh(SHA_A + ' main', ['--sonde']);
  v('…et on ne lance pas la sonde par la clé de la CI', x.rc, 2);
  x = ssh(null, ['--ssh']);
  vrai('--ssh sans demande (un shell interactif) : refusé, il n\'y a rien à déployer', x.rc === 2, x.out);
  if (!REEL) {
    x = ssh(SHA_A + ' claude/ma-branche');
    vrai('une demande valide passe la validation, puis dit « non installé » sur cette machine (code 0)', x.rc === 0 && /non installé/.test(x.out), x.out);
    vrai('⛔ sous ssh la racine du banc (TEAMOP_TEST_RACINE) est IGNORÉE : un chemin ne se décide jamais depuis l\'extérieur — rien n\'a été fait dans le faux VPS', b.journal().length === 0 && !b.existe('opt/teamop/test/releases'), b.journal());
  }
  /* la sonde */
  x = b.lancer(['--sonde']);
  vrai('--sonde : la cellule tient → code 0 et « la cellule tient »', x.rc === 0 && /✓ la cellule tient/.test(x.out), x.out);
  const cs = b.journal().filter(l => /^cellule /.test(l)).pop() || '';
  vrai('⛔ la sonde tourne DANS une cellule sans réseau (net=yes), écriture bornée à SON dossier jetable, sous teamoptest, avec la production invisible', /user=teamoptest net=yes /.test(cs) && /rw=\S*\/opt\/teamop\/test\/sonde\.d /.test(cs) && /-\/opt\/teamop\/data/.test(cs) && /-\/etc\/nginx/.test(cs), cs);
  vrai('…et son dossier jetable est retiré ensuite', !b.existe('opt/teamop/test/sonde.d'));
  b.poser('cellule_percee');
  x = b.lancer(['--sonde']);
  vrai('⛔ --sonde : une cellule qui FUIT (production visible, réseau ouvert) → code 1, les fuites DITES, « Rien ne sera déployé »', x.rc === 1 && /visible depuis la cellule/.test(x.out) && /NE TIENT PAS/.test(x.out) && /Rien ne sera déployé/.test(x.out), x.out);
  b.retirer('cellule_percee');
  b.poser('cellule_refuse');
  x = b.lancer(['--sonde']);
  vrai('--sonde : systemd-run qui refuse → code 1 aussi (une propriété invalide se découvre à l\'installation, pas au premier déploiement)', x.rc === 1, x.out);
  b.retirer('cellule_refuse');
  x = b.lancer(['--sonde', 'autre']);
  v('--sonde n\'accepte aucun autre argument', x.rc, 2);
}

/* ═══ 8. LE WORKFLOW : une clé à lui, un environnement protégé, une commande forcée ═══════════════════════════════ */
console.log('\n── 8. Le workflow de déploiement de test (code seul)');
{
  const WF = path.join(RACINE_DEPOT, '.github/workflows/deploiement-test.yml');
  const wf = code(WF);
  const wfBrut = fs.readFileSync(WF, 'utf8');
  vrai('le workflow existe et n\'est pas vide', wf.length > 1500 && /^name: Espace de test$/m.test(wf));
  vrai('il se lance sur les demandes de fusion vers main (opened, synchronize, reopened) ET à la main', /pull_request:\n\s+branches: \[main\]\n\s+types: \[opened, synchronize, reopened\]/.test(wf) && /workflow_dispatch:/.test(wf));
  vrai('⛔ jamais `pull_request_target` (il exécuterait du code de branche AVEC les secrets du dépôt)', !/pull_request_target/.test(wf));
  vrai('⛔ le job qui parle au VPS attend les bancs du serveur (needs), comme le déploiement de la production', /deployer:\n(\s+[a-z-]+: [^\n]*\n)*\s+needs: \[cible, bancs\]/.test(wf) && /scripts\/bancs-serveur\.liste/.test(wf));
  vrai('⛔ une demande de fusion venue d\'un FORK ne déploie pas (elle n\'a pas les secrets, et ne doit pas)', /head\.repo\.full_name == github\.repository/.test(wf));
  vrai('⛔ rien dans le code du workflow ne nomme la production : ni teamop-api (sans -test), ni /opt/teamop/data, config.json ou repo', !/teamop-api(?!-test)/.test(wf) && !/\/opt\/teamop\/(data|config|repo)/.test(wf));
  vrai('⛔ le commit et la branche passent par l\'ENVIRONNEMENT et sont validés (regex) avant de partir en argument', /SHA_PR: \$\{\{ github\.event\.pull_request\.head\.sha \}\}/.test(wf) && /\[\[ "\$BRANCHE" =~ \^\[A-Za-z0-9\._\/-\]\{1,100\}\$ \]\]/.test(wf) && !/-s \$\{\{/.test(wf));
  const hotes = (s) => (s.match(/^\s*(api\.teamop\.fr|217\.154\.6\.139) ssh-ed25519 \S+$/gm) || []).map(x => x.trim());
  const prod = fs.readFileSync(path.join(RACINE_DEPOT, '.github/workflows/deploiement.yml'), 'utf8');
  vrai('⛔ l\'empreinte de l\'hôte est épinglée, IDENTIQUE à celle du déploiement de la production (' + hotes(wf).length + ' lignes)', hotes(wf).length === 2 && JSON.stringify(hotes(wf)) === JSON.stringify(hotes(prod)));
  /* ⛔ LA CLÉ : le banc d'avant exigeait « une seule clé, VPS_SSH_KEY » — celle de la PRODUCTION */
  const secretsUtilises = wf.match(/secrets\.[A-Z_]+/g) || [];
  v('⛔ le seul secret utilisé est VPS_SSH_KEY_TEST (jamais VPS_SSH_KEY, la clé de la production, qui ouvre un shell root)', Array.from(new Set(secretsUtilises)), ['secrets.VPS_SSH_KEY_TEST']);
  vrai('⛔ …et `VPS_SSH_KEY` (sans _TEST) n\'apparaît dans AUCUNE ligne de code du workflow', !/VPS_SSH_KEY(?!_TEST)/.test(wf));
  vrai('⛔ le secret n\'est lu qu\'au niveau du job `deployer` (pas du workflow, pas des bancs)', (wf.match(/CLE_SSH: \$\{\{ secrets\.VPS_SSH_KEY_TEST \}\}/g) || []).length === 1 && !/^env:/m.test(wf));
  vrai('⛔ aucune expression ${{ }} n\'est collée dans la commande ssh (injection par nom de branche) : le SHA et la branche viennent de l\'environnement', (() => { const i = wf.indexOf('ssh -i'); return i > 0 && !/\$\{\{/.test(wf.slice(i, wf.indexOf('\n', i))); })());
  const ligneSsh = (wf.match(/^\s*ssh -i [^\n]*$/m) || [''])[0].trim();
  vrai('⛔ l\'unique commande ssh est la DEMANDE « <sha> <branche> » : pas de shell distant (`bash -s`), pas de heredoc, pas de chemin de script — la clé est à commande forcée côté VPS', /^ssh -i ~\/\.ssh\/id_deploy_test -o BatchMode=yes -o IdentitiesOnly=yes -o ConnectTimeout=15 root@api\.teamop\.fr "\$SHA \$BRANCHE"$/.test(ligneSsh) && !/bash -s|<<'DISTANT'|deployer-test\.sh/.test(wf), ligneSsh);
  vrai('sans la clé (secret absent de l\'environnement), le workflow le DIT et sort en vert : les étapes qui parlent au VPS sautent', /if: \$\{\{ env\.CLE_SSH == '' \}\}/.test(wf) && (wf.match(/if: \$\{\{ env\.CLE_SSH != '' \}\}/g) || []).length === 3 && /rien n'a été déployé/.test(wf));
  vrai('⛔ la vérification extérieure exige un 401 sur les pages (jamais les versions pas publiées ouvertes) et un refus sur /api/essais/courriels sans clé', /\[ "\$CODE" = "401" \]/.test(wf) && /\[ "\$CODE" != "200" \]/.test(wf));
  vrai('le workflow ne déclenche pas le déploiement de la production : il ne touche pas deploiement.yml', !/deploiement\.yml/.test(wf));
  vrai('un commentaire du fichier dit qu\'il ne touche jamais à la production, et pourquoi il n\'a pas sa clé (la garde existe aussi dans le texte, mais l\'intention est écrite)', /NE TOUCHE JAMAIS À LA PRODUCTION/.test(wfBrut) && /N'A PAS LA CLÉ DE LA PRODUCTION/.test(wfBrut));
  vrai('le bouton « Run workflow » est dit absent avant la fusion (relecture adverse : on cherchait un bouton qui n\'existe pas), avec le remède (Re-run)', /Ce bouton n'existe qu'UNE FOIS CE FICHIER SUR main/.test(wfBrut) && /Re-run all jobs/.test(wfBrut));
  /* ⛔ LE COMMIT TESTÉ EST LE COMMIT DÉPLOYÉ. Le job de bancs faisait `actions/checkout` SANS `ref:` : sur une demande de fusion il
     testait le commit de fusion synthétique, sur un lancement manuel le sommet de la branche — jamais l'entrée `sha` — pendant que
     le VPS recevait le sha demandé. Un job `cible` calcule le commit UNE fois ; les bancs le consomment par `ref:`, le déployeur
     par son environnement. On découpe le fichier en jobs (indentation de deux espaces) pour relier les deux sans rien supposer. */
  {
    const dans = wf.slice(wf.indexOf('\njobs:'));
    const jobs = {}; let cour = null;
    for (const l of dans.split('\n').slice(1)) { const m = l.match(/^  ([a-z]+):\s*$/); if (m) { cour = m[1]; jobs[cour] = ''; } else if (cour) jobs[cour] += l + '\n'; }
    v('le workflow a exactement trois jobs : cible, bancs, deployer', Object.keys(jobs), ['cible', 'bancs', 'deployer']);
    vrai('⛔ le job qui reçoit la clé déclare l\'ENVIRONNEMENT `essai-test` (relecteur obligatoire : le secret n\'est remis qu\'APRÈS l\'approbation de Justin) — et lui seul', /^    environment: essai-test$/m.test(jobs.deployer) && (wf.match(/^\s+environment:/gm) || []).length === 1);
    vrai('⛔ ni `cible` ni `bancs` ne touchent à un secret ni à un environnement (le code d\'une branche y tourne sans clé)', !/secrets\./.test(jobs.cible + jobs.bancs) && !/environment:/.test(jobs.cible + jobs.bancs));
    const ref = ((jobs.bancs || '').match(/uses: actions\/checkout@v4\n\s+with:\n\s+ref: (\$\{\{ needs\.cible\.outputs\.sha \}\})/) || [])[1];
    vrai('⛔ les bancs font leur checkout du commit CALCULÉ par `cible` (`ref: ${{ needs.cible.outputs.sha }}`), jamais celui que GitHub choisirait seul', !!ref && /needs: cible/.test(jobs.bancs));
    vrai('⛔ aucun `actions/checkout` du fichier n\'est sans `ref:` (un checkout nu teste le commit de fusion ou le sommet de la branche)', (wf.match(/uses: actions\/checkout@v4/g) || []).length === 1 && !/uses: actions\/checkout@v4\n(?!\s+with:\n\s+ref:)/.test(wf));
    const envs = (jobs.deployer || '').match(/^\s+SHA: (.*)$/gm) || [];
    vrai('⛔ le déployeur envoie au VPS le MÊME SHA que celui des bancs (' + envs.length + ' usages, tous `needs.cible.outputs.sha`)', envs.length >= 2 && envs.every(e => /SHA: \$\{\{ needs\.cible\.outputs\.sha \}\}$/.test(e)) && !/steps\.cible/.test(jobs.deployer) && /needs: \[cible, bancs\]/.test(jobs.deployer));
    vrai('`cible` publie sha et branche depuis son étape, avec le sha de la demande de fusion d\'abord, l\'entrée manuelle ensuite', /sha: \$\{\{ steps\.cible\.outputs\.sha \}\}/.test(jobs.cible) && /SHA="\$\{SHA_PR:-\$\{SHA_MANUEL:-\$SHA_COURANT\}\}"/.test(jobs.cible));
    vrai('⛔ le sha est validé (40 hexadécimaux) AVANT que les bancs ne le consomment, et le garde-fou des forks est sur `cible` (les deux autres sautent avec lui)', /\[\[ "\$SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/.test(jobs.cible) && /head\.repo\.full_name == github\.repository/.test(jobs.cible) && !/\bif:/.test(jobs.bancs));
  }
}

/* ═══ 9. CE QUE LE DÉPLOYEUR EXIGE DES PAGES ═════════════════════════════════════════════════════════════════════ */
console.log('\n── 9. Le contrat avec le fabricant de pages');
vrai('le déployeur appelle `scripts/essais-build.js <dossier> <commit> <branche>` (le contrat des trois chantiers)', /node scripts\/essais-build\.js "\$PAGES_NEUVES" "\$SHA" "\$BRANCHE"/.test(SRC));
vrai('un commit sans fabricant de pages est refusé avant toute bascule, avec un message qui le dit', /ne porte pas scripts\/essais-build\.js/.test(BRUT));
{
  const b = bac({ identique: true });
  fs.rmSync(path.join(b.FIX, SHA_B, 'scripts'), { recursive: true });
  r = b.deployer(SHA_B, 'main');
  vrai('⛔ …joué : un commit sans scripts/essais-build.js laisse tout en l\'état (code 1)', r.rc === 1 && /ne porte pas scripts\/essais-build\.js/.test(r.out) && b.lien('opt/teamop/test/current') === null);
}

bacs.forEach(b => b.nettoyer());
console.log('\n════ test-2988 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
