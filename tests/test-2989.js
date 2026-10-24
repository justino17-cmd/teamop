/* ══ test-2989 — L'INSTALLATION DE L'ESPACE DE TEST (server/install-test.sh, les modèles nginx et Caddy, le mode d'emploi) ══
   Décision de Justin, 23 octobre 2026 : un espace de test à côté de la production, sur le même VPS. L'installeur est le
   seul geste que Justin fait À LA MAIN sur le serveur, et il le fait avec le mot de passe de ses pages, une clé Stripe de
   test, une clé Anthropic DÉDIÉE et la moitié publique d'une clé de déploiement. Sept choses sont gardées :

     1. ⛔ LA PRODUCTION SORT DU BAC À SABLE OCTET POUR OCTET IDENTIQUE — et, dans le texte, ce qu'il en lit (comparer la clé Anthropic de test avec la sienne, vérifier que le compte de test ne
        peut pas lire ses fichiers) est la seule chose qui la nomme. Il ne COPIE plus la clé Anthropic de la production dans la configuration de test (relecture adverse : tout code de branche la lisait) ;
     2. ⛔ AUCUN SECRET NI À L'ÉCRAN NI SUR UNE LIGNE DE COMMANDE : les mêmes valeurs sont cherchées dans la sortie de
        l'installeur ET dans les arguments de jq, d'openssl et de htpasswd (des enveloppes qui les journalisent avant d'exécuter les vrais).
        Une clé Stripe de PRODUCTION (sk_live_) est refusée, une clé Anthropic de PRODUCTION aussi, une clé SSH PRIVÉE aussi ;
     3. ⛔ IL EST REJOUABLE : un second passage ne change pas un octet (configuration, clé maître de test, mot de passe),
        ne recharge pas le proxy, ne redemande rien ; il REFUSE de régénérer la clé maître si des bases de test existent ;
        et il NE REMPLACE PAS la demande de fusion en cours d'essai par `main` (le banc d'avant ne regardait pas) ;
     4. LES PAGES SONT FERMÉES, L'API NON : /api/ n'est pas derrière le mot de passe (sinon le navigateur remplacerait
        l'en-tête Bearer des pages par celui de l'authentification et tout tomberait en 401) — chez nginx comme chez Caddy ;
     5. ⛔ ROOT N'EXÉCUTE JAMAIS CE QUE LE COMPTE DE TEST PEUT ÉCRIRE : le déployeur, le modèle nginx, le modèle Caddy et le créateur de tarifs sont TÉLÉCHARGÉS au commit exact (par son SHA, lu par
        root) — jamais lus dans le miroir ; la clé de la CI est à commande forcée ; la cellule est vérifiée AVANT le premier déploiement ;
     6. ⛔ LE VPS EST PEUT-ÊTRE SOUS CADDY (REPRISE.md, 7 octobre 2026) : le faux VPS rejoue les deux proxys, y compris le refus de `caddy validate` (tout est remis comme avant) ;
     7. ⛔ LE COMPTE DE TEST NE LIT PAS LA PRODUCTION : sinon l'installeur s'arrête AVANT d'installer quoi que ce soit, et dit les deux `chmod` à passer.

   Le faux VPS est dans tests/bac-vps-essais.js. Ce qu'on joue est le VRAI install-test.sh, les VRAIS modèles nginx et Caddy.
   nginx et Caddy eux-mêmes ne sont pas dans le bac : leur syntaxe se garde par le texte rendu (aucun « @@ » restant, structure des
   blocs) ; `nginx -t` / `caddy validate` s'exécutent sur le VPS avant tout rechargement, et l'installeur remet l'ancien état s'ils refusent. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const { creerBac, code, ecrire, RACINE_DEPOT, SHA_A, SHA_B, CANARI_AGENTS } = require('./bac-vps-essais');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };

const reel = (n) => { const r = spawnSync('bash', ['-c', 'command -v ' + n], { encoding: 'utf8' }); return r.stdout.trim(); };
if (!reel('bash') || !reel('jq') || !reel('openssl') || !reel('node')) { console.log('  (bash, jq, openssl ou node absent — banc sauté)\n0 ✓  0 ✗'); return; }

const INSTALL = path.join(RACINE_DEPOT, 'server/install-test.sh');
const MODELE = path.join(RACINE_DEPOT, 'server/nginx-teamop-test.conf');
const MODELE_CADDY = path.join(RACINE_DEPOT, 'server/caddy-teamop-test.caddy');
const DEPLOYEUR = path.join(RACINE_DEPOT, 'server/deployer-test.sh');
const SRC = code(INSTALL);
const bacs = [];

/* Le bac de l'installeur : celui de tests/bac-vps-essais.js, plus des ENVELOPPES jq/openssl/htpasswd qui journalisent leurs
   arguments (pour prouver qu'aucun secret n'y passe) avant d'exécuter les vrais. */
function bac() {
  const b = creerBac(); bacs.push(b);
  for (const n of ['jq', 'openssl']) ecrire(path.join(b.BIN, n), '#!/bin/bash\necho "' + n + ' $*" >> "$BAC_ETAT/argv"\nexec ' + reel(n) + ' "$@"\n', 0o755);
  const fauxH = fs.readFileSync(path.join(b.BIN, 'htpasswd'), 'utf8').replace('#!/bin/bash\n', '#!/bin/bash\necho "htpasswd $*" >> "$BAC_ETAT/argv"\n');
  ecrire(path.join(b.BIN, 'htpasswd'), fauxH, 0o755);
  return b;
}
const CLE_STRIPE = 'sk_test_' + 'A1b2C3d4E5f6G7h8I9j0K1l2';
const CLE_ANTH = 'sk-ant-' + 'api03-TESTEspaceDeTest0123456789xyz';
const MDP = 'Mot-de-passe-secret-42';
const BLOB = 'AAAAC3NzaC1lZDI1NTE5AAAAI' + 'Q1w2E3r4T5y6U7i8O9p0A1s2D3f4G5h6J7k8';
const PUBKEY = 'ssh-ed25519 ' + BLOB + ' teamop-essai@mac-de-justin';
const MARQUE = 'teamop-essai-deploiement';
function installer(b, saisies, args, extraEnv) {
  const f = path.join(b.E, 'entree'); fs.writeFileSync(f, (saisies || []).join('\n') + '\n');
  const r = spawnSync('bash', [INSTALL].concat(args || []), { encoding: 'utf8', env: Object.assign({}, b.env, { TEAMOP_TEST_ENTREE: f, TEAMOP_TEST_BRANCHE: 'claude/essai-test' }, extraEnv || {}), timeout: 90000 });
  return { rc: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}
/* l'ORDRE des questions : clé Stripe, clé Anthropic, mot de passe (deux fois), clé publique de déploiement */
const TOUT = [CLE_STRIPE, CLE_ANTH, MDP, MDP, PUBKEY];
const config = (b) => JSON.parse(b.lire('opt/teamop/test/config.json'));
const argv = (b) => { try { return fs.readFileSync(path.join(b.E, 'argv'), 'utf8'); } catch (e) { return ''; } };
const mode = (b, rel) => (fs.statSync(b.chemin(rel)).mode & 0o777).toString(8);
const hash = (b, rel) => crypto.createHash('sha256').update(fs.readFileSync(b.chemin(rel))).digest('hex');
const cle = (b) => { try { return b.lire('root/.ssh/authorized_keys'); } catch (e) { return ''; } };

/* ═══ 1. LE TEXTE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 1. Le texte de l\'installeur (code seul, commentaires retirés)');
vrai('le script se parse (bash -n)', spawnSync('bash', ['-n', INSTALL]).status === 0);
vrai('le code n\'est pas vide (une tranche vide passerait tout)', SRC.length > 9000 && /certbot certonly/.test(SRC) && /caddy validate/.test(SRC) && /\$DEPLOYEUR/.test(SRC));
const lignesProd = SRC.split('\n').filter(l => /\/opt\/teamop\/(data|config\.json|monitor\.json|repo|firebase-admin)/.test(l));
vrai('⛔ le code ne nomme /opt/teamop/data, config.json, monitor.json, repo QUE pour les lire (clé Anthropic, droits), les rendre invisibles au service, ou dire quoi corriger (' + lignesProd.length + ' lignes)',
  lignesProd.length >= 3 && lignesProd.every(l => /^PROD_CONFIG="\$R\/opt\/teamop\/config\.json"$/.test(l) || /^InaccessiblePaths=/.test(l) || /^for p in "\$R\/opt\/teamop\/data"/.test(l) || /^\s*case "\$FUITES" in/.test(l)), lignesProd.map(l => l.slice(0, 80)));
vrai('⛔ `teamop-api` n\'apparaît dans le code que suivi de `-test`', !/teamop-api(?!-test)/.test(SRC));
const lignesEtc = SRC.split('\n').filter(l => /etc\/teamop/.test(l));
vrai('⛔ /etc/teamop (la clé maître de la production y vit) n\'est nommé que pour y ajouter kek-test, le rendre invisible, ou vérifier qu\'il est illisible (' + lignesEtc.length + ' lignes)',
  lignesEtc.every(l => /^ETC="\$R\/etc\/teamop"$/.test(l) || /kek-test/.test(l) || /^InaccessiblePaths=/.test(l) || /^for p in "\$R\/opt\/teamop\/data"/.test(l) || /^\s*case "\$FUITES" in/.test(l)) && /^KEK="\$ETC\/kek-test"$/m.test(SRC), lignesEtc.map(l => l.slice(0, 80)));
{
  const lp = SRC.split('\n').filter(l => /\$PROD_CONFIG|\$SRC_PROD/.test(l));
  vrai('⛔ la configuration de la production n\'est que LUE (jamais une redirection >) : comparer une clé avec jq, `test -f`, `test -r` sous le compte de test (' + lp.length + ' lignes)',
    lp.length >= 4 && !/>\s*"?\$(PROD_CONFIG|SRC_PROD)/.test(SRC) && lp.every(l => /^PROD_CONFIG=/.test(l) || /jq /.test(l) || /\[ -f "\$PROD_CONFIG" \]/.test(l) || /^for p in /.test(l)), lp.map(l => l.slice(0, 90)));
}
{
  const cleCopiee = /\$prod\[0\]\.agents\.cleApi \/\/ ""\) else/.test(SRC) || /\.cleApi = \(if \(\.cleApi \/\/ ""\) != "" then \.cleApi else \(\$prod/.test(SRC);
  vrai('⛔ la clé Anthropic de la production n\'est PLUS COPIÉE dans la configuration de test (elle ne sert qu\'à refuser qu\'on la redonne, et à vider une copie d\'avant)', !cleCopiee && /IN\(\$clesProd\[\]\)/.test(SRC) && /C'est la clé de la PRODUCTION/.test(SRC));
}
const systemctls = SRC.match(/systemctl [^\n]*/g) || [];
vrai('systemctl n\'est appelé que sur l\'unité de TEST, le proxy, ou daemon-reload (' + systemctls.length + ' appels)', systemctls.length >= 5 && systemctls.every(l => /\$UNITE|nginx|caddy|daemon-reload|\$1/.test(l)) && /^UNITE="teamop-api-test"$/m.test(SRC));
vrai('⛔ le service tourne sous un compte à part, dont la production est INVISIBLE (User=teamoptest, InaccessiblePaths, ProtectSystem=strict, écriture bornée aux données de test)',
  /^User=teamoptest$/m.test(SRC) && /^ProtectSystem=strict$/m.test(SRC) && /^ReadWritePaths=\/opt\/teamop\/test\/data \/opt\/teamop\/test\/monitor\.json$/m.test(SRC)
  && /^InaccessiblePaths=-\/opt\/teamop\/data -\/opt\/teamop\/config\.json -\/opt\/teamop\/monitor\.json -\/opt\/teamop\/repo -\/opt\/teamop\/firebase-admin\.json -\/opt\/opmsg -\/opt\/opcourrier -\/etc\/teamop -\/etc\/letsencrypt -\/etc\/nginx -\/etc\/caddy -\/root$/m.test(SRC));
{
  /* ⛔ Tout chemin que le VRAI serveur écrit doit être dans ReadWritePaths. Le faux systemd du bac n'applique AUCUNE restriction :
     monitor.json (comptes de la Tour, incidents, journal) a été oublié ainsi — root possède /opt/teamop/test, ProtectSystem=strict
     ne laissait que data/, et monSave() avale l'erreur : la Tour de test perdait ses comptes à chaque redémarrage, sans un mot.
     On relit donc le serveur (commentaires retirés) pour savoir OÙ il écrit, au lieu de recopier une liste ici. */
  const IDX = fs.readFileSync(path.join(RACINE_DEPOT, 'server/index.js'), 'utf8').replace(/^[ \t]*\/\/.*$/gm, ' ');   // le code, pas la phrase qui l'explique
  const mm = IDX.match(/const MONITOR_PATH = path\.join\(path\.dirname\(CONFIG_PATH\), '([^']+)'\)/);
  vrai('le serveur range son fichier de la Tour à côté de la configuration (monitor.json) — sinon ce contrôle ne garde plus rien', !!mm && mm[1] === 'monitor.json' && /fs\.writeFileSync\(MONITOR_PATH,/.test(IDX));
  const rw = ((SRC.match(/^ReadWritePaths=(.*)$/m) || [])[1] || '').split(/\s+/).filter(Boolean);
  const cfgDir = path.posix.dirname(((SRC.match(/^Environment=TEAMOP_CONFIG=(.*)$/m) || [])[1]) || '/introuvable/config.json');
  const dataDir = (SRC.match(/^Environment=TEAMOP_DATA=(.*)$/m) || [])[1];
  const ecrits = [dataDir, mm ? path.posix.join(cfgDir, mm[1]) : null];
  v('⛔ chaque chemin écrit par le serveur (TEAMOP_DATA, et monitor.json à côté de TEAMOP_CONFIG) est dans ReadWritePaths', ecrits.map(e => rw.includes(e)), [true, true]);
  vrai('⛔ …et monitor.json est créé par l\'installeur AVANT l\'unité, à teamoptest (systemd refuse de démarrer sur un ReadWritePaths manquant, et root possède le dossier)',
    /^MONITOR="\$OPT\/monitor\.json"$/m.test(SRC) && /printf '\{\}\\n' > "\$MONITOR"/.test(SRC) && /^chown teamoptest:teamoptest "\$MONITOR"$/m.test(SRC) && SRC.indexOf('chown teamoptest:teamoptest "$MONITOR"') < SRC.indexOf('UNITE_TEXTE="'));
  vrai('⛔ il n\'est créé que s\'il manque (jamais écrasé : le service y range les comptes de la Tour)', /^if \[ ! -e "\$MONITOR" \]; then/m.test(SRC));
}
vrai('⛔ la clé d\'administration Firebase de la production est hors d\'atteinte : TEAMOP_FB_ADMIN pointe un fichier de l\'espace de test', /^Environment=TEAMOP_FB_ADMIN=\/opt\/teamop\/test\/firebase-admin\.json$/m.test(SRC));
vrai('la clé maître de test est lue par LoadCredential (hors de /opt) et la config/les données par les variables du serveur', /^LoadCredential=teamop_kek:\/etc\/teamop\/kek-test$/m.test(SRC) && /^Environment=TEAMOP_CONFIG=\/opt\/teamop\/test\/config\.json$/m.test(SRC) && /^Environment=TEAMOP_DATA=\/opt\/teamop\/test\/data$/m.test(SRC));
vrai('⛔ aucun secret sur une ligne de commande : jq reçoit tout par l\'ENVIRONNEMENT (pas de --arg), les mots de passe passent par stdin à openssl et à htpasswd', !/jq[^\n]*--arg(json|file)?\b/.test(SRC) && /openssl passwd -apr1 -stdin/.test(SRC) && /printf '%s' "\$MDP" \| openssl/.test(SRC) && /printf '%s' "\$MDP" \| htpasswd -n -B -i -C 10 essai/.test(SRC));
vrai('les saisies secrètes sont MASQUÉES (read -s) et lues sur le terminal, jamais sur l\'entrée du script ; la clé PUBLIQUE, elle, se lit en clair', /IFS= read -r -s -u 8/.test(SRC) && /IFS= read -r -u 8 a/.test(SRC) && /ENTREE="\/dev\/tty"/.test(SRC));
vrai('⛔ une clé Stripe de production (sk_live_/rk_live_) est refusée, et la configuration calculée est revérifiée avant écriture', /sk_live_\*\|rk_live_\*\)/.test(SRC) && /test\("live"\)/.test(SRC));
vrai('⛔ le port par défaut n\'est PAS 8090 (réservé à OP MESSAGES prod) : 8095, et la liste des ports d\'autres services est refusée', /PORT="\$\{TEAMOP_TEST_PORT:-8095\}"/.test(SRC) && /8080\|8090\|8091/.test(SRC));
vrai('⛔ la clé maître de test n\'est jamais régénérée sur des bases existantes (même refus que poser-cle.js)', /bases_de_test\(\)/.test(SRC) && /des bases de test chiffrées existent et la clé de test est ABSENTE/.test(SRC));
vrai('⛔ le SHA qui décide de ce que root pose est lu PAR ROOT (`git ls-remote`, sans runuser), et les quatre fichiers sont téléchargés À CE SHA', /^SRC_SHA="\$\(git ls-remote "\$DEPOT"/m.test(SRC) && /curl -fsSL --max-time 60 -o "\$2" "\$RAW\/\$SRC_SHA\/\$1"/.test(SRC) && /for f in deployer-test\.sh nginx-teamop-test\.conf caddy-teamop-test\.caddy stripe-essai-prix\.js; do/.test(SRC));
vrai('⛔ aucun fichier lancé ou lu comme modèle ne vient du miroir : ni `$MIROIR/server/`, ni `bash "$MIROIR`, ni `node "$MIROIR`', !/\$MIROIR\/server/.test(SRC) && !/bash "\$MIROIR/.test(SRC) && !/node "\$MIROIR/.test(SRC) && /^\s*MODELE="\$SRC_ROOT\/nginx-teamop-test\.conf"$/m.test(SRC));
vrai('le déployeur posé par root est root:root 0755, écrit par renommage', /cp "\$SRC_ROOT\/deployer-test\.sh" "\$DEPLOYEUR\.nouveau"\nchown root:root "\$DEPLOYEUR\.nouveau"\nchmod 0755 "\$DEPLOYEUR\.nouveau"\nmv -T "\$DEPLOYEUR\.nouveau" "\$DEPLOYEUR"/.test(SRC));
vrai('⛔ la clé de la CI est posée à COMMANDE FORCÉE (restrict, command=deployer-test --ssh), une seule ligne à nous, remplacée à chaque passage', /LIGNE="restrict,command=\\"\/usr\/local\/sbin\/deployer-test --ssh\\" \$PUB_TYPE \$PUB_BLOB \$MARQUE_SSH"/.test(SRC) && /grep -v " \$MARQUE_SSH\\\$" "\$AUTH" > "\$AUTH\.nouveau"/.test(SRC));
vrai('⛔ la cellule est vérifiée (`deployer-test --sonde`) AVANT le premier déploiement, et un échec arrête tout', SRC.indexOf('"$DEPLOYEUR" --sonde') > 0 && SRC.indexOf('"$DEPLOYEUR" --sonde') < SRC.indexOf('"$DEPLOYEUR" "$D_SHA" "$D_BR"'));
vrai('⛔ rejouer ne remplace pas la demande de fusion en cours d\'essai : sans branche posée à la main, on redéploie le commit DÉJÀ servi (commit-servi)', /BRANCHE_ARG="\$\{TEAMOP_TEST_BRANCHE:-\}"/.test(SRC) && /if \[ -z "\$BRANCHE_ARG" \] && \[ -s "\$OPT\/commit-servi" \]/.test(SRC));
vrai('l\'ordre dans le texte : saisies < compte < miroir < clé < configuration < unité < proxy < certificat < cellule < premier déploiement',
  (() => { const i = s => SRC.indexOf(s); const o = [i('ouvrir_entree()'), i('useradd'), i('git clone'), i('openssl rand -hex 32 > "$KEK.nouveau"'), i('CONFIG_NEUVE="$('), i('UNITE_TEXTE="'), i('ecrire_ngx()'), i('certbot certonly'), i('"$DEPLOYEUR" --sonde'), i('"$DEPLOYEUR" "$D_SHA" "$D_BR"')]; return o.every(x => x > 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('l\'unité est posée APRÈS la clé qu\'elle charge (systemd refuse de démarrer une unité dont une source de LoadCredential manque)', SRC.indexOf('openssl rand -hex 32 > "$KEK.nouveau"') < SRC.indexOf('UNITE_TEXTE="'));
vrai('⛔ le test des droits de la production passe AVANT toute création de dossier ou de fichier de test', SRC.indexOf('lisible_par_test()') > 0 && SRC.indexOf('lisible_par_test()') < SRC.indexOf('mkdir -p "$OPT" "$OPT/releases"'));

/* ═══ 2. UNE INSTALLATION COMPLÈTE (nginx) ══════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. Installation complète dans le faux VPS (nginx)');
const B = bac();
const prodAvant = B.empreinteProduction();
let r = installer(B, TOUT);
if (r.rc !== 0) console.log(r.out.slice(-1500));
v('l\'installation réussit (code 0)', r.rc, 0);
vrai('elle se termine sur « Espace de test installé » et l\'adresse à ouvrir', /✅ Espace de test installé/.test(r.out) && /https:\/\/test\.teamop\.fr\/essais\.html/.test(r.out));
vrai('elle fait ses vérifications locales et les dit (/health ok, pages en 401)', /✓ le serveur de test répond/.test(r.out) && /✓ les pages demandent le mot de passe/.test(r.out));
vrai('⛔ elle PRÉVIENT avant les deux étapes longues qu\'il ne s\'affichera rien pendant 1 à 3 minutes (un silence se lit « ça pend » et on coupe)', /compte une minute : le dépôt se télécharge, rien ne s'affiche/.test(r.out) && /compte 1 à 3 minutes : le code et ses dépendances s'installent, rien ne s'affiche pendant ce temps — ne coupe pas/.test(r.out));
v('⛔ LA PRODUCTION SORT DU BAC À SABLE OCTET POUR OCTET IDENTIQUE (données, configuration, dépôt, unité, clé maître, bloc nginx d\'api)', B.empreinteProduction(), prodAvant);
v('…et le Caddyfile de la production n\'a pas bougé non plus (on est sous nginx)', B.lire('etc/caddy/Caddyfile'), 'api.teamop.fr {\n    reverse_proxy 127.0.0.1:8080\n}\n');
const j = B.journal();
vrai('⛔ aucun appel ne nomme l\'unité de production (systemctl, chown…)', !j.some(l => /teamop-api(?!-test)/.test(l)));
vrai('le compte « teamoptest » est un compte système sans connexion', j.some(l => /^useradd --system --user-group .*--shell \/usr\/sbin\/nologin teamoptest$/.test(l)));
vrai('le code est cloné ET récupéré EN TANT QUE teamoptest (jamais en root : le dépôt n\'est pas à lui) ; seul `ls-remote` tourne en root', j.some(l => /^runuser teamoptest git$/.test(l)) && !j.some(l => /^git (clone|fetch|checkout|rev-parse) as=-/.test(l)) && j.some(l => /^git ls-remote as=-$/.test(l)));
vrai('⛔ les quatre fichiers de root sont téléchargés AU COMMIT EXACT (aaaaaaaa), et dans cet ordre-là, AVANT la configuration', (() => { const p = f => j.findIndex(l => l === 'curl raw sha=aaaaaaaa server/' + f); const o = ['deployer-test.sh', 'nginx-teamop-test.conf', 'caddy-teamop-test.caddy', 'stripe-essai-prix.js'].map(p); return o.every(x => x >= 0) && o.every((x, k) => k === 0 || x > o[k - 1]) && o[3] < j.findIndex(l => /^prixessai /.test(l)); })(), j.filter(l => /^curl raw/.test(l)));
vrai('⛔ le déployeur de root est posé en /usr/local/sbin/deployer-test : c\'est le fichier du dépôt, root:root, 0755 ; celui du miroir (qui existe, git l\'a cloné) n\'est jamais lancé par root', B.existe('usr/local/sbin/deployer-test') && B.lire('usr/local/sbin/deployer-test') === fs.readFileSync(DEPLOYEUR, 'utf8') && mode(B, 'usr/local/sbin/deployer-test') === '755' && j.some(l => /^chown root:root .*usr\/local\/sbin\/deployer-test\.nouveau$/.test(l)));
vrai('⛔ la clé de la CI : UNE ligne à commande forcée, 0600, sans le commentaire collé avec la clé', cle(B) === 'restrict,command="/usr/local/sbin/deployer-test --ssh" ssh-ed25519 ' + BLOB + ' ' + MARQUE + '\n' && mode(B, 'root/.ssh/authorized_keys') === '600' && mode(B, 'root/.ssh') === '700', cle(B));
vrai('…et la sortie le dit sans recopier la clé', /clé de déploiement de la CI posée \(commande forcée/.test(r.out) && !r.out.includes(BLOB));
const cfg = config(B);
vrai('⛔ la configuration porte les réglages du mode test : espaceTest, courrielsCaptes, origine, plafond des agents à 10 $', cfg.espaceTest === true && cfg.courrielsCaptes === true && cfg.espaceTestOrigine === 'https://test.teamop.fr' && JSON.stringify(cfg.origins) === '["https://test.teamop.fr"]' && cfg.agents.plafondMoisTotal === 10);
vrai('la clé des routes d\'essai fait 64 hexadécimaux, tirée au hasard par l\'installation', /^[0-9a-f]{64}$/.test(cfg.espaceTestCle));
v('⛔ la clé Anthropic de la configuration de test est CELLE QU\'ON A DONNÉE à l\'installeur (dédiée)…', cfg.agents.cleApi, CLE_ANTH);
vrai('⛔ …et la clé Anthropic de la PRODUCTION n\'est copiée NULLE PART dans la configuration de test (le banc d\'avant exigeait le contraire)', !JSON.stringify(cfg).includes(CANARI_AGENTS));
vrai('⛔ rien de plus n\'est copié de la production : ni sa clé Stripe live, ni son apiKey, ni agents.reunionsAuto (les réunions tournent en test)', !JSON.stringify(cfg).includes('PRODUCTION') && cfg.apiKey !== 'PROD-API-KEY' && cfg.agents.reunionsAuto === undefined);
v('la clé Stripe de TEST est enregistrée', cfg.stripe.secretKey, CLE_STRIPE);
vrai('⛔ la table des tarifs de test (stripe.prixEssai : dix tarifs) est écrite dans la configuration par le créateur TÉLÉCHARGÉ, lancé APRÈS la clé et AVANT le premier déploiement (le fabricant des pages la lit)',
  Object.keys(cfg.stripe.prixEssai || {}).length === 10 && mode(B, 'opt/teamop/test/config.json') === '640'
  && (() => { const i = B.journal().findIndex(l => /^prixessai cfg=config\.json cle=true$/.test(l)), d = B.journal().findIndex(l => /^build as=/.test(l)); return i >= 0 && d > i; })());
vrai('…et la sortie de l\'installeur le dit en une ligne, sans secret', /tarifs de test : prêts/.test(r.out) && !r.out.includes(CLE_STRIPE));
vrai('une paire VAPID valide : publique = 65 octets (87 caractères base64url), privée = 32 octets (43)', cfg.vapidPublicKey.length === 87 && cfg.vapidPrivateKey.length === 43 && Buffer.from(cfg.vapidPublicKey, 'base64url')[0] === 4);
vrai('l\'adresse de contact est fictive (exemple-essai.fr) et aucun SMTP n\'est configuré : rien ne peut partir', /@exemple-essai\.fr$/.test(cfg.contactEmail) && Object.keys(cfg.smtp).length === 0);
v('⛔ la configuration est lisible par le seul service et root (640)', mode(B, 'opt/teamop/test/config.json'), '640');
vrai('la clé maître de test : 64 hexadécimaux, 0600, DANS /etc/teamop mais sous un autre nom que celle de la production', /^[0-9a-f]{64}$/.test(B.lire('etc/teamop/kek-test').trim()) && mode(B, 'etc/teamop/kek-test') === '600' && B.lire('etc/teamop/kek-test').trim() !== B.lire('etc/teamop/kek').trim());
const htp = B.lire('etc/nginx/teamop-test.htpasswd').trim();
vrai('⛔ le fichier du mot de passe contient un HACHAGE apr1, pas le mot de passe', /^essai:\$apr1\$[^$]+\$[./0-9A-Za-z]+$/.test(htp) && !htp.includes(MDP));
{
  const sel = htp.split('$')[2];
  const attendu = spawnSync(reel('openssl'), ['passwd', '-apr1', '-salt', sel, '-stdin'], { input: MDP, encoding: 'utf8' }).stdout.trim();
  v('…et c\'est bien le hachage du mot de passe saisi (le même sel redonne la même empreinte)', htp.split(':')[1], attendu);
}
v('le fichier du mot de passe est 0640 (lu par nginx, pas par tous)', mode(B, 'etc/nginx/teamop-test.htpasswd'), '640');
vrai('⛔ monitor.json existe après l\'installation, vide ({}), en 0600 et chowné à teamoptest (le service ne peut pas créer un fichier dans /opt/teamop/test)',
  B.existe('opt/teamop/test/monitor.json') && B.lire('opt/teamop/test/monitor.json').trim() === '{}' && mode(B, 'opt/teamop/test/monitor.json') === '600' && j.some(l => /^chown teamoptest:teamoptest .*opt\/teamop\/test\/monitor\.json$/.test(l)));
const unite = B.lire('etc/systemd/system/teamop-api-test.service');
vrai('l\'unité est posée avec le port, le compte et les chemins DE TEST', /^Environment=PORT=8095$/m.test(unite) && /^User=teamoptest$/m.test(unite) && /^WorkingDirectory=\/opt\/teamop\/test\/current\/server$/m.test(unite) && /^EnvironmentFile=-\/opt\/teamop\/test\/commit\.env$/m.test(unite));
vrai('l\'ordre du journal : compte < miroir < unité rechargée < certificat < nginx rechargé < cellule vérifiée < premier déploiement',
  (() => { const p = re => j.findIndex(l => re.test(l)); const dernier = re => { for (let k = j.length - 1; k >= 0; k--) if (re.test(j[k])) return k; return -1; }; const o = [p(/^useradd/), p(/^git clone/), p(/^systemctl daemon-reload/), p(/^certbot certonly/), dernier(/^systemctl reload nginx/), p(/^cellule .* cmd=bash$/), p(/^systemctl restart teamop-api-test/)]; return o.every(x => x >= 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('⛔ la cellule est vérifiée AVANT tout déploiement, et la sortie le dit', /✓ la cellule tient/.test(r.out) && j.findIndex(l => /^cellule .* cmd=bash$/.test(l)) < j.findIndex(l => /^build as=/.test(l)));
vrai('⛔ le premier déploiement est celui de la branche demandée, par son SHA complet', j.some(l => /^build as=teamoptest sha=aaaaaaaa branche=claude\/essai-test /.test(l)));
vrai('les pages servies sont celles du premier déploiement (le lien « pages » ne désigne plus l\'attente)', /pages\.d\/\d{14}-aaaaaaaa$/.test(B.lien('opt/teamop/test/pages') || ''));
vrai('⛔ le déploiement est lancé par le déployeur de ROOT (/usr/local/sbin), jamais par un script du miroir', !j.some(l => /miroir|repo\/server/.test(l)));
const secrets = { 'clé Stripe de test': CLE_STRIPE, 'clé Anthropic de test': CLE_ANTH, 'mot de passe des pages': MDP, 'clé maître de test': B.lire('etc/teamop/kek-test').trim(), 'clé des routes d\'essai': cfg.espaceTestCle, 'clé privée VAPID': cfg.vapidPrivateKey, 'apiKey de test': cfg.apiKey, 'clé des agents de la PRODUCTION': CANARI_AGENTS };
for (const [nom, val] of Object.entries(secrets)) {
  vrai('⛔ ' + nom + ' : ni à l\'écran, ni sur une ligne de commande de jq/openssl/htpasswd', !r.out.includes(val) && !argv(B).includes(val) && !j.some(l => l.includes(val)));
}
vrai('(le journal des enveloppes n\'est pas vide : jq et openssl ont bien été appelés — sinon la preuve ci-dessus serait creuse)', /^jq /m.test(argv(B)) && /^openssl passwd -apr1 -stdin/m.test(argv(B)) && /^openssl rand -hex 32/m.test(argv(B)));

/* ═══ 3. LE MODÈLE NGINX RENDU ═════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 3. Le fichier nginx posé');
const ngx = B.lire('etc/nginx/sites-available/teamop-test.conf');
const sansCommentaires = ngx.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const bloc = (txt, entete) => { const i = txt.indexOf(entete); if (i < 0) return ''; let d = 0, k = txt.indexOf('{', i); const deb = k; for (; k < txt.length; k++) { if (txt[k] === '{') d++; else if (txt[k] === '}') { d--; if (d === 0) break; } } return txt.slice(deb, k + 1); };
vrai('le fichier est posé et lié dans sites-enabled', ngx.length > 2000 && B.lien('etc/nginx/sites-enabled/teamop-test.conf') !== null);
vrai('⛔ aucun trou du modèle (@@) ne reste dans ce qui est posé', !/@@/.test(ngx));
vrai('le domaine, le port de TEST et la racine des pages sont ceux de l\'espace de test', (ngx.match(/server_name test\.teamop\.fr;/g) || []).length === 2 && /proxy_pass http:\/\/127\.0\.0\.1:8095;/.test(ngx) && /root \/opt\/teamop\/test\/pages;/.test(ngx));
vrai('⛔ nginx 1.24 (Ubuntu 24.04) : « http2 » sur la ligne listen, PAS « http2 on; » qui ferait échouer nginx -t', /listen 443 ssl http2;/.test(ngx) && !/http2 on;/.test(ngx));
vrai('⛔ ne parle JAMAIS au port de la production (8080) ni à api.teamop.fr', !/:8080\b/.test(sansCommentaires) && !/api\.teamop\.fr/.test(sansCommentaires));
const api = bloc(ngx, 'location ^~ /api/'), sante = bloc(ngx, 'location = /health'), pages = (ngx.match(/location \/ \{\n[^}]*\}/g) || []).filter(x => /try_files/.test(x)).join('');
vrai('⛔ /api/ n\'est PAS derrière le mot de passe de la page (auth_basic off) — sinon l\'en-tête Bearer des pages serait remplacé et tout tomberait en 401', api.length > 100 && /auth_basic off;/.test(api) && /proxy_pass http:\/\/127\.0\.0\.1:8095;/.test(api));
vrai('/health non plus (la CI et l\'installeur le sondent sans mot de passe)', /auth_basic off;/.test(sante) && /proxy_pass http:\/\/127\.0\.0\.1:8095;/.test(sante));
const horsBlocs = ngx.replace(api, '').replace(sante, '');
vrai('⛔ …et TOUT LE RESTE du serveur HTTPS l\'est : auth_basic "…" + le fichier de mots de passe, au niveau du server', /auth_basic "Espace de test TeamOP";/.test(horsBlocs) && /auth_basic_user_file \/etc\/nginx\/teamop-test\.htpasswd;/.test(horsBlocs) && (ngx.match(/auth_basic off;/g) || []).length === 2);
vrai('⛔ un `Authorization: Basic` ajouté par le navigateur est retiré avant l\'API (map), un Bearer passe tel quel', /map \$http_authorization \$teamop_test_auth_api \{\s+default\s+\$http_authorization;\s+"~\*\^Basic "\s+"";\s+\}/.test(ngx) && /proxy_set_header Authorization \$teamop_test_auth_api;/.test(api));
vrai('⛔ l\'adresse vue par nginx écrase X-Forwarded-For (jamais complétée : req.ip, trust proxy 1)', /proxy_set_header X-Forwarded-For \$remote_addr;/.test(api));
vrai('⛔ noindex sur les pages ET sur les deux emplacements d\'API (un add_header de location remplace ceux du server)', (ngx.match(/X-Robots-Tag "noindex, nofollow, noarchive" always;/g) || []).length === 3 && /X-Robots-Tag/.test(api) && /X-Robots-Tag/.test(sante));
vrai('pas de HSTS (porte à sens unique, sans intérêt pour un domaine d\'essai)', !/Strict-Transport-Security/.test(ngx));
vrai('les flux de l\'API ne sont pas retenus dans un tampon', /proxy_buffering off;/.test(api));
vrai('la racine redirige vers l\'accueil des essais', /location = \/ \{ return 302 \/essais\.html; \}/.test(ngx));
vrai('⛔ LA CLÉ DES ROUTES D\'ESSAI N\'ENTRE PAS DANS LE JOURNAL D\'ACCÈS : `/api/essais/` est exclu par un map sur $request_uri, et le journal est conditionnel (if=)', /map \$request_uri \$teamop_test_journaliser \{\s+~\^\/api\/essais\/\s+0;\s+default\s+1;\s+\}/.test(ngx) && /access_log \/var\/log\/nginx\/test\.teamop\.fr\.access\.log combined if=\$teamop_test_journaliser;/.test(ngx));
vrai('⛔ le mot de passe des pages est freiné : une zone limit_req (2 requêtes/s par adresse, réserve de 60, refus en 429) sur les PAGES seulement — pas sur l\'API, qui a ses propres plafonds', /limit_req_zone \$binary_remote_addr zone=teamop_test_pages:1m rate=2r\/s;/.test(ngx) && /limit_req_status 429;/.test(ngx) && /limit_req zone=teamop_test_pages burst=60 nodelay;/.test(pages) && !/limit_req /.test(api) && !/limit_req /.test(sante), pages);
{
  const snap = fs.readFileSync(path.join(B.E, 'nginx-au-certificat'), 'utf8');
  vrai('⛔ au moment du certificat, nginx n\'a que le port 80 et la preuve Let\'s Encrypt (un bloc 443 sans certificat ferait refuser nginx)', /acme-challenge/.test(snap) && !/listen 443/.test(snap) && !/ssl_certificate/.test(snap));
  vrai('le certificat est demandé en webroot, avec un rechargement de nginx au renouvellement', j.some(l => /^certbot certonly --webroot -w \/var\/www\/teamop-test-acme -d test\.teamop\.fr .*--deploy-hook systemctl reload nginx$/.test(l)));
}
vrai('le bloc d\'api.teamop.fr n\'a pas été touché', B.lire('etc/nginx/sites-available/api.teamop.fr') === 'server { server_name api.teamop.fr; }\n');

/* nginx 1.26 : la forme neuve de http2 */
{
  const b = bac();
  installer(b, TOUT, [], { BAC_NGINX_VERSION: '1.26.1' });
  const t = b.existe('etc/nginx/sites-available/teamop-test.conf') ? b.lire('etc/nginx/sites-available/teamop-test.conf') : '';
  vrai('nginx ≥ 1.25.1 : « http2 on; » et « listen 443 ssl; » sans http2', /\n\s+http2 on;/.test(t) && /listen 443 ssl;/.test(t) && !/ssl http2;/.test(t));
}

/* ═══ 3 bis. LE MÊME SITE SOUS CADDY ═══════════════════════════════════════════════════════════════════════════ */
console.log('\n── 3 bis. Le VPS est servi par Caddy (nginx inactif)');
{
  const b = bac(); b.poser('nginx_inactif'); b.poser('caddy_actif');
  const prod0 = b.empreinteProduction(), cf0 = b.lire('etc/caddy/Caddyfile');
  const x = installer(b, TOUT);
  if (x.rc !== 0) console.log(x.out.slice(-1200));
  v('⛔ l\'installation réussit sous Caddy (code 0) — le défaut bloquant : elle s\'arrêtait à « nginx n\'est pas actif »', x.rc, 0);
  vrai('elle dit quel proxy elle a choisi', /proxy : caddy/.test(x.out) && /── \[8\/9\] caddy :/.test(x.out), x.out.slice(0, 600));
  const jc = b.journal();
  vrai('⛔ pas de certbot (Caddy obtient son certificat), pas de nginx, pas de htpasswd nginx', !jc.some(l => /^certbot/.test(l)) && !jc.some(l => /^(nginx -t|systemctl reload nginx)/.test(l)) && !b.existe('etc/nginx/teamop-test.htpasswd') && !b.existe('etc/nginx/sites-available/teamop-test.conf'));
  const cdy = b.existe('etc/caddy/teamop-test/test.caddy') ? b.lire('etc/caddy/teamop-test/test.caddy') : '';
  vrai('le fichier Caddy est posé, sans trou du modèle (@@), pour le bon domaine et le bon port', cdy.length > 800 && !/@@/.test(cdy) && /^test\.teamop\.fr \{$/m.test(cdy) && /reverse_proxy 127\.0\.0\.1:8095 \{/.test(cdy) && /root \* \/opt\/teamop\/test\/pages$/m.test(cdy), cdy.slice(0, 300));
  v('⛔ le Caddyfile de la production ne reçoit que UNE ligne d\'import, à la fin — son bloc d\'api.teamop.fr est intact', b.lire('etc/caddy/Caddyfile'), cf0 + '\nimport /etc/caddy/teamop-test/*.caddy\n');
  const hc = b.lire('etc/caddy/teamop-test/essai.hash').trim();
  vrai('⛔ le mot de passe est un HACHAGE bcrypt (fait par htpasswd, lu sur l\'entrée standard), pas le mot de passe — dans le fichier du hachage ET dans le site', /^\$2y\$10\$[0-9a-f]{53}$/.test(hc) && !hc.includes(MDP) && cdy.includes(hc) && !cdy.includes(MDP) && !argv(b).includes(MDP) && /^htpasswd -n -B -i -C 10 essai$/m.test(argv(b)), hc);
  vrai('…le fichier du hachage et le site sont 0640 (le hachage n\'est pas lisible par tous)', mode(b, 'etc/caddy/teamop-test/essai.hash') === '640' && mode(b, 'etc/caddy/teamop-test/test.caddy') === '640');
  vrai('⛔ Caddy 2.6 (Ubuntu 24.04) : `basicauth` (basic_auth n\'existe qu\'à partir de 2.8)', /^        basicauth \{$/m.test(cdy) && !/basic_auth/.test(cdy));
  const bc = bac(); bc.poser('nginx_inactif'); bc.poser('caddy_actif');
  installer(bc, TOUT, [], { BAC_CADDY_VERSION: 'v2.9.1' });
  vrai('Caddy ≥ 2.8 : `basic_auth`', bc.existe('etc/caddy/teamop-test/test.caddy') && /^        basic_auth \{$/m.test(bc.lire('etc/caddy/teamop-test/test.caddy')));
  const sansCom = cdy.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  const hApi = bloc(sansCom, 'handle @api'), hPages = bloc(sansCom.slice(sansCom.indexOf('handle @api') + hApi.length), 'handle');
  vrai('⛔ /api/* et /health ne sont PAS derrière le mot de passe (le bloc de l\'API ne porte pas basicauth) — sinon le Bearer des pages serait remplacé et tout tomberait en 401', hApi.length > 100 && !/basic(_)?auth/.test(hApi) && /@api path \/api\/\* \/health/.test(sansCom), hApi.slice(0, 200));
  vrai('⛔ un `Authorization: Basic` ajouté par le navigateur est retiré avant l\'API (header_regexp + request_header -Authorization), un Bearer passe tel quel', /@basic header_regexp basic Authorization \^Basic\\s/.test(hApi) && /request_header @basic -Authorization/.test(hApi));
  vrai('⛔ l\'adresse vue par Caddy écrase X-Forwarded-For (jamais complétée)', /header_up X-Forwarded-For \{remote_host\}/.test(hApi));
  vrai('⛔ TOUT LE RESTE est derrière le mot de passe : le bloc des pages porte basicauth avec l\'identifiant « essai »', /basicauth \{\s+essai \$2y\$/.test(hPages) && /file_server/.test(hPages), hPages.slice(0, 300));
  vrai('noindex sur les pages ET sur l\'API ; pas de HSTS ; pas de journal d\'accès (la clé des routes d\'essai est dans l\'adresse des liens de connexion)', (cdy.match(/import entetes_essai/g) || []).length === 2 && /X-Robots-Tag "noindex, nofollow, noarchive"/.test(cdy) && !/Strict-Transport-Security/.test(cdy) && !/^\s*log\b/m.test(sansCom));
  vrai('la racine redirige vers l\'accueil des essais ; un fichier caché n\'est pas servi (404)', /redir @racine \/essais\.html 302/.test(sansCom) && /@points path_regexp \/\\\.\n\s+respond @points 404/.test(sansCom));
  vrai('⛔ ne parle JAMAIS au port de la production (8080) ni à api.teamop.fr', !/:8080\b/.test(sansCom) && !/api\.teamop\.fr/.test(sansCom));
  const iv = jc.findIndex(l => /^caddy validate /.test(l)), ir = jc.findIndex(l => /^systemctl reload caddy/.test(l));
  vrai('⛔ `caddy validate` passe AVANT le rechargement, sur un Caddyfile qui porte déjà la ligne d\'import', iv >= 0 && ir > iv && /^import \/etc\/caddy\/teamop-test\/\*\.caddy$/m.test(fs.readFileSync(path.join(b.E, 'caddyfile-au-validate'), 'utf8')));
  vrai('le premier déploiement et la cellule se font comme sous nginx, la production n\'a pas bougé (hors la ligne d\'import)', jc.some(l => /^build as=teamoptest sha=aaaaaaaa /.test(l)) && /✓ la cellule tient/.test(x.out) && JSON.stringify(b.empreinteProduction().split('\n').filter(l => !/caddy/.test(l))) === JSON.stringify(prod0.split('\n').filter(l => !/caddy/.test(l))));
  /* rejouer sous Caddy : rien ne change, rien n'est rechargé */
  const nj = b.journal().length, avant = ['etc/caddy/teamop-test/test.caddy', 'etc/caddy/teamop-test/essai.hash', 'etc/caddy/Caddyfile'].map(f => hash(b, f));
  const y = installer(b, []);
  v('rejouer sous Caddy : code 0, aucune saisie', y.rc, 0);
  v('⛔ …le site, le hachage et le Caddyfile sont identiques octet pour octet, la ligne d\'import n\'est pas dupliquée', ['etc/caddy/teamop-test/test.caddy', 'etc/caddy/teamop-test/essai.hash', 'etc/caddy/Caddyfile'].map(f => hash(b, f)), avant);
  vrai('…et Caddy n\'est ni revalidé ni rechargé pour rien', !b.journal().slice(nj).some(l => /^(caddy validate|systemctl reload caddy)/.test(l)) && /Caddy à jour \(rien à changer\)/.test(y.out));
  /* un Caddy qui refuse : tout est remis comme avant */
  const bn = bac(); bn.poser('nginx_inactif'); bn.poser('caddy_actif'); bn.poser('caddy_refuse');
  const cfn = bn.lire('etc/caddy/Caddyfile');
  const z = installer(bn, TOUT);
  vrai('⛔ `caddy validate` qui refuse : code 1, « tout est remis comme avant », aucun rechargement', z.rc === 1 && /Caddy refuse la configuration/.test(z.out) && !bn.journal().some(l => /^systemctl reload caddy/.test(l)));
  vrai('…le Caddyfile est celui d\'avant, le site n\'est pas resté, la production est intacte', bn.lire('etc/caddy/Caddyfile') === cfn && !bn.existe('etc/caddy/teamop-test/test.caddy') && !bn.existe('etc/caddy/Caddyfile.avant-test'));
  /* pas de Caddyfile à l'endroit attendu */
  const bf = bac(); bf.poser('nginx_inactif'); bf.poser('caddy_actif'); fs.rmSync(bf.chemin('etc/caddy/Caddyfile'));
  const w = installer(bf, TOUT);
  vrai('un Caddyfile introuvable : on s\'arrête, on le dit, rien n\'est écrit côté proxy', w.rc === 1 && /Caddyfile est introuvable/.test(w.out) && !bf.existe('etc/caddy/teamop-test'));
  /* les deux proxys actifs : on ne devine pas */
  const bd = bac(); bd.poser('caddy_actif');
  const d2 = installer(bd, TOUT);
  vrai('⛔ nginx ET Caddy actifs : on ne devine pas lequel tient les ports 80 et 443 — refus, rien n\'est changé', d2.rc === 1 && /nginx ET Caddy sont actifs/.test(d2.out) && !bd.existe('opt/teamop/test'));
  const d3 = installer(bd, TOUT, [], { TEAMOP_TEST_PROXY: 'caddy' });
  vrai('…et TEAMOP_TEST_PROXY=caddy tranche', d3.rc === 0 && bd.existe('etc/caddy/teamop-test/test.caddy'));
  const d4 = installer(bac(), TOUT, [], { TEAMOP_TEST_PROXY: 'apache' });
  vrai('un proxy inconnu est refusé (code 2)', d4.rc === 2 && /doit valoir nginx ou caddy/.test(d4.out));
}

/* ═══ 4. REJOUER NE CHANGE RIEN ═════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 4. Idempotence : un second passage ne change pas un octet');
{
  const fichiers = ['opt/teamop/test/config.json', 'etc/teamop/kek-test', 'etc/nginx/teamop-test.htpasswd', 'etc/nginx/sites-available/teamop-test.conf', 'etc/systemd/system/teamop-api-test.service', 'usr/local/sbin/deployer-test', 'root/.ssh/authorized_keys'];
  const RANGE = '{"users":[{"nom":"patron-essai"}],"issues":[],"journal":[]}\n';
  fs.writeFileSync(B.chemin('opt/teamop/test/monitor.json'), RANGE);   // ce que le service y a rangé entre-temps
  fichiers.push('opt/teamop/test/monitor.json');
  const avant = fichiers.map(f => hash(B, f));
  const nj = B.journal().length;
  const r2 = installer(B, []);   // AUCUNE saisie : tout est déjà en place
  v('le second passage réussit sans qu\'on lui réponde rien (code 0)', r2.rc, 0);
  v('⛔ configuration, clé maître de test, mot de passe, fichier nginx, unité, déployeur et clé de la CI : identiques octet pour octet', fichiers.map(f => hash(B, f)), avant);
  v('⛔ monitor.json (comptes de la Tour) survit à un second passage tel que le service l\'a laissé', B.lire('opt/teamop/test/monitor.json'), RANGE);
  const nouveau = B.journal().slice(nj);
  vrai('⛔ aucun nouveau certificat, aucun rechargement de nginx, aucune unité rechargée', !nouveau.some(l => /^certbot/.test(l)) && !nouveau.some(l => /^systemctl (reload nginx|daemon-reload)/.test(l)));
  vrai('il ne redemande aucune saisie (ni clé Stripe, ni clé Anthropic, ni mot de passe, ni clé de déploiement)', !/Clé secrète Stripe de test|Clé Anthropic de l'espace|Mot de passe des pages|Clé publique de déploiement/.test(r2.out));
  vrai('⛔ rejouable : la table de tarifs de test est déjà là (dix), le créateur n\'est PAS relancé (aucun appel à Stripe pour rien)', !nouveau.some(l => /^prixessai/.test(l)) && /tarifs de test : déjà en place/.test(r2.out));
  vrai('le compte n\'est pas recréé', !nouveau.some(l => /^useradd/.test(l)));
  v('la production est toujours identique', B.empreinteProduction(), prodAvant);
  const CLE2 = 'sk_test_' + 'Z9y8X7w6V5u4T3s2R1q0P9o8';
  const r3 = installer(B, [CLE2], ['stripe']);
  const c3 = config(B);
  v('« stripe » redemande la clé Stripe et SEULEMENT elle : la nouvelle remplace l\'ancienne…', c3.stripe.secretKey, CLE2);
  vrai('…sans toucher à la clé des routes d\'essai, à la paire VAPID ni à la clé Anthropic', c3.espaceTestCle === cfg.espaceTestCle && c3.vapidPrivateKey === cfg.vapidPrivateKey && c3.agents.cleApi === CLE_ANTH && r3.rc === 0);
  vrai('⛔ « stripe » relance AUSSI le créateur de tarifs (une clé neuve peut être d\'un autre compte de test : ses tarifs sont à retrouver ou à créer), clé non affichée',
    B.journal().slice(nj).some(l => /^prixessai cfg=config\.json cle=true$/.test(l)) && !r3.out.includes(CLE2));
}
{
  const r4 = installer(B, ['Nouveau-mot-de-passe-77', 'Nouveau-mot-de-passe-77'], ['motdepasse']);
  const htp2 = B.lire('etc/nginx/teamop-test.htpasswd').trim();
  vrai('« motdepasse » change le mot de passe des pages (un autre hachage) sans redemander la clé Stripe', r4.rc === 0 && htp2 !== htp && !htp2.includes('Nouveau-mot-de-passe'));
}
{
  const CLE_ANTH2 = 'sk-ant-' + 'api03-AUTREclePourLeTest9876543210ab';
  const r5 = installer(B, [CLE_ANTH2], ['anthropic']);
  vrai('« anthropic » redemande la clé Anthropic de test et SEULEMENT elle : la nouvelle remplace l\'ancienne, sans l\'afficher', r5.rc === 0 && config(B).agents.cleApi === CLE_ANTH2 && !r5.out.includes(CLE_ANTH2) && config(B).stripe.secretKey.startsWith('sk_test_'));
  const BLOB2 = 'AAAAC3NzaC1lZDI1NTE5AAAAI' + 'Z9y8X7w6V5u4T3s2R1q0P9o8N7m6L5k4J3h2G1f0';
  const r6 = installer(B, ['ssh-ed25519 ' + BLOB2 + ' autre@mac'], ['cle']);
  vrai('⛔ « cle » REMPLACE la ligne de la CI (une seule ligne à nous, l\'ancienne clé ne reste pas)', r6.rc === 0 && cle(B) === 'restrict,command="/usr/local/sbin/deployer-test --ssh" ssh-ed25519 ' + BLOB2 + ' ' + MARQUE + '\n' && !cle(B).includes(BLOB), cle(B));
}
/* ⛔ REJOUER NE REMPLACE PAS LA DEMANDE DE FUSION EN COURS D'ESSAI (relecture adverse : « stripe » redéployait `main` par-dessus) */
{
  const b = bac();
  installer(b, TOUT);                                   // premier passage : branche claude/essai-test, commit aaaaaaaa
  b.deployer(SHA_B, 'claude/autre-demande');            // une AUTRE demande de fusion passe en essai (CI)
  const servi = () => b.lire('opt/teamop/test/commit-servi').split(' ').slice(0, 2);
  v('(population) le commit servi est celui de l\'autre demande', servi(), [SHA_B, 'claude/autre-demande']);
  const nj = b.journal().length;
  const x = installer(b, ['sk_test_' + 'Q1w2E3r4T5y6U7i8O9p0A1s2'], ['stripe'], { TEAMOP_TEST_BRANCHE: undefined });
  const nouveau = b.journal().slice(nj);
  v('⛔ « stripe » SANS branche posée à la main : le commit servi n\'a pas changé (ni la branche, ni le SHA)', servi(), [SHA_B, 'claude/autre-demande']);
  vrai('…le déploiement qui a suivi est celui de CE commit (le serveur a redémarré pour relire la clé), pas celui de main', nouveau.some(l => /^build as=teamoptest sha=bbbbbbbb branche=claude\/autre-demande /.test(l)) && !nouveau.some(l => /^build as=teamoptest sha=aaaaaaaa /.test(l)) && x.rc === 0);
  vrai('…et la sortie le DIT (« DÉJÀ en essai »)', /Redéploiement du commit DÉJÀ en essai \(« claude\/autre-demande », bbbbbbbb\)/.test(x.out), x.out.slice(-600));
  const y = installer(b, [], [], { TEAMOP_TEST_BRANCHE: 'claude/essai-test' });
  vrai('à l\'inverse, une branche posée À LA MAIN est bien déployée (le geste volontaire reste possible)', y.rc === 0 && servi()[1] === 'claude/essai-test' && servi()[0] === SHA_A, servi());
}

/* ═══ 5. LES REFUS ═════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 5. Les refus : une clé de production, une clé maître orpheline, un DNS absent, nginx qui refuse, une cellule qui fuit');
{
  const b = bac();
  const x = installer(b, ['sk_live_' + 'Q'.repeat(24), '', '', MDP, MDP, '']);
  vrai('⛔ une clé Stripe de PRODUCTION (sk_live_) est refusée, dite en clair, et n\'entre jamais dans la configuration', /clé de PRODUCTION/.test(x.out) && !JSON.stringify(config(b)).includes('sk_live') && !x.out.includes('Q'.repeat(24)));
  vrai('…l\'installation va quand même au bout sans Stripe, et le dit (paiements de test éteints)', x.rc === 0 && /Stripe : pas de clé de test/.test(x.out) && !(config(b).stripe || {}).secretKey);
  vrai('⛔ sans clé de test, le créateur de tarifs n\'est PAS lancé (rien à demander à Stripe, et jamais avec une clé de production)', !b.journal().some(l => /^prixessai/.test(l)));
  vrai('…sans clé Anthropic ni clé de déploiement non plus : l\'installation le dit (agents muets, CI pas branchée) au lieu de se taire', /pas de clé Anthropic de test : les agents resteront muets/.test(x.out) && /pas de clé de déploiement : la CI ne pourra pas/.test(x.out) && (config(b).agents.cleApi || '') === '' && cle(b) === '');
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, CANARI_AGENTS, '', MDP, MDP, '']);
  vrai('⛔ la clé Anthropic de la PRODUCTION redonnée à l\'installeur est refusée (comparée à celle de /opt/teamop/config.json, sans l\'afficher) et n\'entre pas dans la configuration', /C'est la clé de la PRODUCTION/.test(x.out) && (config(b).agents.cleApi || '') === '' && !x.out.includes(CANARI_AGENTS) && !JSON.stringify(config(b)).includes(CANARI_AGENTS) && !argv(b).includes(CANARI_AGENTS));
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, 'pas-une-cle', CLE_ANTH, MDP, MDP, 'ssh-ed25519 -----BEGIN OPENSSH PRIVATE KEY-----', '-----BEGIN OPENSSH PRIVATE KEY-----', PUBKEY]);
  vrai('une saisie qui n\'est pas une clé Anthropic est refusée puis redemandée', /Ce n'est pas une clé Anthropic/.test(x.out) && config(b).agents.cleApi === CLE_ANTH);
  vrai('⛔ une clé SSH PRIVÉE collée par erreur est refusée, dite en clair, jamais écrite — puis la bonne clé publique est acceptée', /C'est une clé PRIVÉE/.test(x.out) && !cle(b).includes('PRIVATE') && cle(b).includes(BLOB));
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, CLE_ANTH, MDP, 'autre chose']);
  vrai('⛔ deux saisies différentes du mot de passe : trois essais puis refus, RIEN n\'est installé (les saisies passent avant tout geste)', x.rc === 1 && !b.existe('opt/teamop/test') && !b.existe('etc/teamop/kek-test') && !b.journal().some(l => /^(useradd|git|certbot|chown)/.test(l)));
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, CLE_ANTH, 'court', 'court', 'court', 'court', 'court', 'court']);
  vrai('un mot de passe de moins de 10 caractères est refusé', x.rc === 1 && !b.existe('etc/nginx/teamop-test.htpasswd'));
}
{
  const b = bac();
  b.poser('nginx_inactif');
  const x = installer(b, TOUT);
  vrai('⛔ ni nginx ni Caddy actifs : on s\'arrête AVANT tout geste, et on le dit', x.rc === 1 && /aucun proxy actif/.test(x.out) && !b.existe('opt/teamop/test'));
}
{
  const b = bac();
  b.poser('disque_plein');
  const x = installer(b, TOUT, [], { TEAMOP_TEST_DISQUE_MIN_KO: '999999999999' });
  vrai('⛔ pas assez de place sur le disque : on s\'arrête AVANT tout geste, avec les chiffres', x.rc === 1 && /Mo libres sur le disque/.test(x.out) && !b.existe('opt/teamop/test') && !b.journal().some(l => /^(useradd|git)/.test(l)));
}
{
  const b = bac();
  b.poser('branche_absente');
  const x = installer(b, TOUT);
  vrai('une branche qui n\'existe pas sur GitHub : refus clair, et ni clé maître ni configuration n\'ont été écrites', x.rc === 1 && /n'existe pas sur GitHub/.test(x.out) && !b.existe('etc/teamop/kek-test') && !b.existe('opt/teamop/test/config.json'));
  vrai('…et rien n\'a été posé pour root', !b.existe('usr/local/sbin/deployer-test'));
}
{
  const b = bac();
  b.poser('raw_echec');
  const x = installer(b, TOUT);
  vrai('⛔ GitHub (raw) injoignable ou fichier absent au commit : on s\'arrête, on le dit, ni le déployeur ni la configuration ne sont posés', x.rc === 1 && /introuvable au commit aaaaaaaa/.test(x.out) && !b.existe('usr/local/sbin/deployer-test') && !b.existe('opt/teamop/test/config.json'));
  const c = bac(); c.poser('raw_vide');
  const y = installer(c, TOUT);
  vrai('un fichier téléchargé VIDE est refusé de même', y.rc === 1 && !c.existe('usr/local/sbin/deployer-test'));
  const d = bac();
  for (const f of ['deployer-test.sh']) fs.writeFileSync(path.join(d.FIX, SHA_A, 'server', f), '#!/usr/bin/env bash\nif then fi (pas du bash\n');
  const z = installer(d, TOUT);
  vrai('⛔ un « déployeur » qui ne se parse même pas n\'est jamais posé pour root', z.rc === 1 && /n'est pas celui de l'espace de test/.test(z.out) && !d.existe('usr/local/sbin/deployer-test'));
  const e = bac();
  fs.writeFileSync(path.join(e.FIX, SHA_A, 'server/deployer-test.sh'), '#!/usr/bin/env bash\necho "autre chose"\n');
  const w = installer(e, TOUT);
  vrai('…ni un script qui n\'est pas le déployeur de l\'espace de test', w.rc === 1 && !e.existe('usr/local/sbin/deployer-test'));
}
{
  const b = bac();
  b.poser('lisibles', b.chemin('opt/teamop/data') + '\n' + b.chemin('opt/teamop/monitor.json') + '\n');
  fs.writeFileSync(b.chemin('opt/teamop/monitor.json'), '{"users":[]}');
  const x = installer(b, TOUT);
  vrai('⛔ le compte de test PEUT lire /opt/teamop/data et monitor.json : refus AVANT toute installation, les deux fichiers nommés', x.rc === 1 && /PEUT LIRE des fichiers de la PRODUCTION/.test(x.out) && /\/opt\/teamop\/data/.test(x.out) && /\/opt\/teamop\/monitor\.json/.test(x.out), x.out);
  vrai('…avec les commandes exactes à passer (chmod 700 sur le dossier, 600 sur le fichier) et la mise en garde de ne PAS toucher à /opt/teamop', /chmod 700 \/opt\/teamop\/data/.test(x.out) && /chmod 600 \/opt\/teamop\/monitor\.json/.test(x.out) && /PAS de chmod sur \/opt\/teamop lui-même/.test(x.out));
  vrai('…rien n\'a été créé (ni dossier de test, ni clé, ni configuration, ni déployeur) et la production n\'a pas changé de mode', !b.existe('opt/teamop/test') && !b.existe('etc/teamop/kek-test') && !b.existe('usr/local/sbin/deployer-test') && !b.journal().some(l => /^git /.test(l)));
  b.retirer('lisibles');
  const y = installer(b, TOUT);
  vrai('(contre-épreuve) une fois les droits corrigés, la même installation passe', y.rc === 0);
  const c = bac(); c.poser('lisibles', c.chemin('etc/teamop/kek') + '\n');
  const z = installer(c, TOUT);
  vrai('⛔ la clé maître de la production lisible par le compte de test est refusée aussi', z.rc === 1 && /\/etc\/teamop\/kek/.test(z.out), z.out.slice(0, 300));
}
{
  const b = bac();
  b.poser('cellule_percee');
  const x = installer(b, TOUT);
  vrai('⛔ une cellule qui FUIT (production visible, réseau ouvert) : l\'installation s\'arrête avant tout déploiement et le dit', x.rc === 1 && /visible depuis la cellule/.test(x.out) && /La cellule où tournent les branches ne tient pas : rien n'est déployé/.test(x.out) && !b.journal().some(l => /^(build|npm|systemctl restart)/.test(l)));
  const c = bac(); c.poser('cellule_refuse');
  const y = installer(c, TOUT);
  vrai('systemd-run qui refuse : même arrêt', y.rc === 1 && !c.journal().some(l => /^(build|npm)/.test(l)));
}
{
  const b = bac();
  ecrire(b.chemin('opt/teamop/test/data/socle/entreprise-x/base.db'), 'BASE-CHIFFREE-DE-TEST');
  const x = installer(b, TOUT);
  vrai('⛔ des bases de test chiffrées existent, la clé est ABSENTE : refus, aucune clé neuve (elle les rendrait illisibles)', x.rc === 1 && /illisibles/.test(x.out) && !b.existe('etc/teamop/kek-test'));
  vrai('…et le message dit comment repartir de zéro sans toucher à la production NI au compteur de dépense des agents (find … ! -name agents-budget.json)', /find \/opt\/teamop\/test\/data -mindepth 1 ! -name agents-budget\.json -delete/.test(x.out) && /remet à zéro le compteur de dépense/.test(x.out));
  v('…la production n\'a pas bougé', b.empreinteProduction(), prodAvant);
}
{
  const b = bac();
  ecrire(b.chemin('etc/teamop/kek-test'), 'pas-une-cle');
  const x = installer(b, TOUT);
  vrai('une clé de test mal formée n\'est jamais remplacée en silence', x.rc === 1 && /n'est pas une clé de 64 hexadécimaux/.test(x.out) && b.lire('etc/teamop/kek-test') === 'pas-une-cle');
}
{
  const b = bac();
  b.poser('dns_absent');
  const x = installer(b, TOUT);
  vrai('⛔ DNS pas encore posé : on s\'arrête AVANT certbot, avec l\'étape à faire, et le travail déjà fait reste', x.rc === 1 && /ne se résout pas encore/.test(x.out) && !b.journal().some(l => /^certbot/.test(l)) && b.existe('opt/teamop/test/config.json') && b.existe('etc/teamop/kek-test'));
  b.retirer('dns_absent');
  const cleAvant = config(b).espaceTestCle;
  const y = installer(b, []);
  vrai('…une fois le DNS posé, on relance : la reprise réussit SANS redemander les saisies déjà faites ni changer la clé des routes d\'essai', y.rc === 0 && config(b).espaceTestCle === cleAvant && b.journal().some(l => /^certbot/.test(l)));
}
{
  const b = bac();
  b.poser('certbot_echec');
  const x = installer(b, TOUT);
  vrai('certbot qui échoue : message clair et dernières lignes de certbot (sans secret), code 1, le port 80 reste prêt', x.rc === 1 && /Le certificat n'a pas pu être obtenu/.test(x.out) && /Challenge failed/.test(x.out));
}
{
  const b = bac();
  b.poser('nginx_refuse');
  const x = installer(b, TOUT);
  vrai('⛔ nginx -t qui refuse : l\'installeur retire SON fichier (rien de cassé pour api.teamop.fr), ne recharge pas, code 1', x.rc === 1 && /nginx refuse la configuration/.test(x.out) && !b.existe('etc/nginx/sites-available/teamop-test.conf') && !b.journal().some(l => /^systemctl reload nginx/.test(l)));
  v('…et le bloc d\'api.teamop.fr est intact', b.lire('etc/nginx/sites-available/api.teamop.fr'), 'server { server_name api.teamop.fr; }\n');
}
{
  const b = bac();
  b.poser('malsains', SHA_A + '\n');
  const x = installer(b, TOUT);
  vrai('un premier déploiement qui échoue : l\'installeur le dit, sort en 1, et rappelle que la production n\'a pas bougé', x.rc === 1 && /PREMIER DÉPLOIEMENT a échoué/.test(x.out) && /Rien de la production n'a bougé/.test(x.out));
  v('…et c\'est vrai', b.empreinteProduction(), prodAvant);
}
{
  const b = bac();
  const x = installer(b, TOUT, ['nimporte']);
  vrai('un mot inconnu en argument est refusé avec le mode d\'emploi', x.rc === 2 && /usage/.test(x.out));
  const y = installer(b, TOUT, [], { TEAMOP_TEST_PORT: '8090' });
  vrai('⛔ le port 8090 (OP MESSAGES prod) est refusé', y.rc === 2 && /appartient à un autre service/.test(y.out));
  const z = installer(b, TOUT, [], { TEAMOP_TEST_DEPOT: 'https://exemple.fr/autre.git' });
  vrai('⛔ un dépôt qui n\'est pas sur GitHub est refusé (les fichiers de root sont téléchargés par SHA sur raw.githubusercontent.com)', z.rc === 2 && /adresse GitHub/.test(z.out));
}

/* ═══ 6. LES MODÈLES ET LE MODE D'EMPLOI, DANS LE DÉPÔT ═══════════════════════════════════════════════════════ */
console.log('\n── 6. Les modèles, le mode d\'emploi');
{
  const m = code(MODELE);
  vrai('le modèle nginx porte le marqueur qui sépare la phase « port 80 » de la phase HTTPS (sans lui, la première écriture contiendrait un bloc 443 sans certificat)', /^# ==== HTTPS/m.test(fs.readFileSync(MODELE, 'utf8')) && m.length > 1500);
  vrai('le modèle ne contient aucune adresse de production ni clé', !/api\.teamop\.fr/.test(m) && !/sk_(test|live)_/.test(m));
  const c = code(MODELE_CADDY);
  vrai('le modèle Caddy existe, ne contient aucune adresse de production ni clé, et ses cinq trous sont ceux que l\'installeur remplit', c.length > 800 && !/api\.teamop\.fr/.test(c) && !/sk_(test|live)_/.test(c) && JSON.stringify(Array.from(new Set(c.match(/@@[A-Z]+@@/g))).sort()) === JSON.stringify(['@@BASIC@@', '@@DOMAINE@@', '@@HASH@@', '@@PAGES@@', '@@PORT@@']));
}
const DOC = path.join(RACINE_DEPOT, 'design/ESPACE-DE-TEST.md');
vrai('le mode d\'emploi existe', fs.existsSync(DOC));
if (fs.existsSync(DOC)) {
  const d = fs.readFileSync(DOC, 'utf8');
  vrai('il dit la ligne DNS exacte : enregistrement A « test » → 217.154.6.139, TTL 300', /\*\*A\*\*/.test(d) && /`test`/.test(d) && /217\.154\.6\.139/.test(d) && /300/.test(d));
  vrai('il dit chez qui (OVH) comme le mode d\'emploi d\'OP MESSAGES, et de ne toucher à aucune autre ligne de la zone', /OVH/.test(d) && /aucune\s+autre\s+ligne/.test(d));
  vrai('il donne la commande de vérification du DNS et ce qu\'on doit voir', /dig \+short test\.teamop\.fr/.test(d));
  vrai('il donne l\'installation en commandes réelles, qui existent dans le dépôt (install-test.sh)', /install-test\.sh/.test(d) && /ssh root@api\.teamop\.fr/.test(d) && fs.existsSync(INSTALL));
  vrai('il dit la vérification : ouvrir https://test.teamop.fr/essais.html', /https:\/\/test\.teamop\.fr\/essais\.html/.test(d));
  vrai('⛔ il ne fait faire AUCUN geste de webhook (le serveur n\'a pas de route de webhook Stripe : il relit les abonnements chez Stripe) et il dit pourquoi en une phrase', !/bash \/root\/install-test\.sh webhook/.test(d) && !/api\/stripe\/webhook/.test(d) && !/whsec_/.test(d) && /pas de route de webhook/.test(d) && /relit/.test(d));
  vrai('…et la fonction du serveur confirme : AUCUNE route de webhook Stripe dans server/index.js (sinon le mode d\'emploi mentirait)', !/app\.(post|use|all)\(\s*['"]\/api\/stripe\/webhook/.test(fs.readFileSync(path.join(RACINE_DEPOT, 'server/index.js'), 'utf8')));
  vrai('il dit la commande qui crée les tarifs de test (bash /root/install-test.sh stripe), ce qui s\'affiche, et la carte 4242', /bash \/root\/install-test\.sh stripe/.test(d) && /tarifs de test : prêts/.test(d) && /4242 4242 4242 4242/.test(d));
  vrai('⛔ il ne fait jamais afficher un secret : la section dédiée existe et aucune commande n\'imprime kek-test, config.json ou .env', /Aucune commande de ce document n'affiche un secret/.test(d) && !/cat \/etc\/teamop|cat \/opt\/teamop\/test\/config|cat \/etc\/nginx\/teamop-test\.htpasswd/.test(d));
  vrai('⛔ il ne contient aucune clé ni aucun secret (sk_test_ suivi de lettres, sk-ant- suivi de lettres, whsec_ suivi de lettres, 64 hexadécimaux)', !/sk_(test|live)_[A-Za-z0-9]{8}/.test(d) && !/sk-ant-[A-Za-z0-9]{8}/.test(d) && !/whsec_[A-Za-z0-9]{8}/.test(d) && !/\b[0-9a-f]{64}\b/.test(d));
  const rmDoc = d.split('\n').filter(l => /^\s*(rm|userdel|certbot delete)\b/.test(l) && !/~\/\.ssh\//.test(l));   // (la clé privée retirée du MAC n'est pas un chemin du VPS)
  vrai('⛔ « Tout défaire » ne supprime que des chemins de l\'espace de test (' + rmDoc.length + ' lignes), jamais la production', rmDoc.length >= 5 && rmDoc.every(l => /teamop-test|teamop-api-test|\/opt\/teamop\/test|kek-test|teamoptest|test\.teamop\.fr|deploiement-test|deployer-test|authorized_keys/.test(l) && !/\/opt\/teamop\/(data|repo|config)|\/etc\/teamop\/kek(?!-test)|teamop-api(?!-test)/.test(l)), rmDoc);
  vrai('il nomme le port 8095 et pourquoi pas 8090', /8095/.test(d) && /8090/.test(d));
  /* ── le CYCLE et les gestes, écrits (relecture du parcours de Justin, 23 octobre 2026) ── */
  vrai('⛔ il commence par demander quel PROXY tient le VPS (systemctl is-active nginx caddy, ss -ltnp) — le défaut bloquant : le script s\'arrêtait sur « nginx n\'est pas actif » sans que personne ait posé la question', /systemctl is-active nginx caddy/.test(d) && /ss -ltnp \| grep -E ':\(80\|443\) '/.test(d) && /Caddy/.test(d) && d.indexOf('systemctl is-active nginx caddy') < d.indexOf('install-test.sh -o'));
  vrai('⛔ il distingue le Mac du VPS dans le bloc d\'installation (« les lignes suivantes se tapent une fois connecté »), et fait vérifier la place (df -h /) et le fichier téléchargé (head -3) avant de lancer', /les lignes suivantes se tapent une fois connecté/.test(d) && /df -h \//.test(d) && /head -3 \/root\/install-test\.sh/.test(d) && /au moins 3 Go/.test(d));
  vrai('⛔ il dit les deux silences (« [4/9] » et « [9/9] », 1 à 3 minutes) et de ne pas couper', /1 à 3 minutes/.test(d) && /Ne coupe pas/.test(d));
  vrai('⛔ la clé de la CI : paire faite sur le Mac (ssh-keygen -t ed25519), privée copiée au presse-papiers SANS s\'afficher (pbcopy), dans l\'environnement `essai-test` à relecteur obligatoire, puis supprimée du Mac', /ssh-keygen -t ed25519 -N "" -C "teamop-essai-deploiement"/.test(d) && /pbcopy < ~\/\.ssh\/teamop-essai-deploiement\n/.test(d) && /essai-test/.test(d) && /Required reviewers/.test(d) && /VPS_SSH_KEY_TEST/.test(d) && /rm ~\/\.ssh\/teamop-essai-deploiement\n/.test(d) && !/cat ~\/\.ssh\/teamop-essai-deploiement\b(?!\.pub)/.test(d));
  vrai('⛔ il ne fait jamais coller l\'adresse d\'un bouton « Se connecter comme… » ni le journal d\'accès du proxy, et dit ce qui se colle sans risque', /Ne colle jamais/.test(d) && /journal d'accès du proxy/.test(d) && /build\.log/.test(d) && /journalctl -u teamop-api-test -n 50/.test(d));
  vrai('⛔ il écrit le CYCLE en entier : demande de fusion → vérification → approbation de l\'environnement → test dans l\'ordre → OK → fusion', /## Le cycle/.test(d) && /Approve and deploy/.test(d) && /Tu testes/.test(d) && /Tu dis OK/.test(d) && /On fusionne/.test(d));
  vrai('⛔ …avec ses CONSÉQUENCES : fusionner du `server/` déploie la PRODUCTION (deploiement.yml, après les bancs) ; app.html/sw.js restent à ta phrase ; relancer l\'installeur si le déployeur change ; les autres demandes à remettre à jour (« ne porte pas scripts/essais-build.js »)', /déploie le serveur de\s+PRODUCTION/.test(d) && /deploiement\.yml/.test(d) && /app\.html` et `sw\.js`/.test(d) && /relance `bash \/root\/install-test\.sh`/.test(d) && /ne porte pas scripts\/essais-build\.js/.test(d));
  vrai('⛔ …et deux demandes ouvertes : la dernière poussée est celle en essai, le bandeau le dit, un check gris « annulé » veut dire « remplacé par plus récent »', /dernière poussée/.test(d) && /bandeau/.test(d) && /annulée/.test(d) && /remplacé par plus récent/.test(d));
  vrai('⛔ …et le bouton « Run workflow » n\'existe pas avant la fusion : le remède est Re-run all jobs', /n'existe qu'une fois le workflow fusionné/.test(d) && /Re-run all jobs/.test(d));
  vrai('⛔ les tests de la modification ont leur convention écrite : essais/parcours.json, un tableau { titre, quoi, attendu, lien? }, affiché avant le parcours de base', /essais\/parcours\.json/.test(d) && /\{ titre, quoi, attendu, lien\? \}/.test(d) && /Les tests de cette modification/.test(d));
  vrai('⛔ rejouer l\'installeur ne remplace pas la demande de fusion en cours d\'essai : le document le dit (commit déjà servi) et donne la variable pour forcer une branche', /Rejouer ne remplace pas ce qui est en essai/.test(d) && /commit-servi/.test(d) && /TEAMOP_TEST_BRANCHE=<la branche> bash \/root\/install-test\.sh/.test(d));
  vrai('⛔ « Tout défaire » retire aussi le certificat (certbot delete), le dossier ACME, le compte teamoptest, le déployeur de root, la clé de la CI, et dit ce qui reste à la main (DNS, workflow, environnement GitHub) — et la variante Caddy', /certbot delete --cert-name test\.teamop\.fr/.test(d) && /var\/www\/teamop-test-acme/.test(d) && /userdel teamoptest/.test(d) && /rm \/usr\/local\/sbin\/deployer-test/.test(d) && /teamop-essai-deploiement\$\/d/.test(d) && /ligne DNS `test`/.test(d) && /git rm \.github\/workflows\/deploiement-test\.yml/.test(d) && /rm -rf \/etc\/caddy\/teamop-test/.test(d));
  vrai('⛔ chaque mode de `bash /root/install-test.sh <mode>` du document est un mode que l\'installeur accepte', (d.match(/bash \/root\/install-test\.sh (\w+)/g) || []).map(x => x.split(' ').pop()).every(m => new RegExp('\\b' + m + '\\b').test((SRC.match(/stripe\|motdepasse\|anthropic\|cle\)/) || [''])[0])), (d.match(/bash \/root\/install-test\.sh (\w+)/g) || []));
  vrai('le document dit la clé Anthropic DÉDIÉE (pas celle de la production) avec sa limite chez Anthropic, et que la clé restreinte Stripe ne crée pas les tarifs', /dédiée/.test(d) && /limite de dépense/.test(d) && /sk-ant-/.test(d) && /pas une clé restreinte/.test(d));
  vrai('chaque commande du mode d\'emploi qui lance un script du dépôt vise un fichier qui existe', (d.match(/bash \/root\/(install-test)\.sh/g) || []).length >= 1 && fs.existsSync(path.join(RACINE_DEPOT, 'server/install-test.sh')) && fs.existsSync(path.join(RACINE_DEPOT, 'server/deployer-test.sh')));
}

bacs.forEach(b => b.nettoyer());
console.log('\n════ test-2989 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
