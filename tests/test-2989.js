/* ══ test-2989 — L'INSTALLATION DE L'ESPACE DE TEST (server/install-test.sh, le modèle nginx, le mode d'emploi) ══
   Décision de Justin, 23 octobre 2026 : un espace de test à côté de la production, sur le même VPS. L'installeur est le
   seul geste que Justin fait À LA MAIN sur le serveur, et il le fait avec le mot de passe de ses pages, une clé Stripe de
   test et — par un jq — la clé des agents de la production sous les yeux du script. Quatre choses sont gardées :

     1. ⛔ LA PRODUCTION SORT DU BAC À SABLE OCTET POUR OCTET IDENTIQUE — et, dans le texte, la seule lecture qu'il en fait
        (la clé des agents, en lecture seule par `--slurpfile`) est la seule ligne de code qui la nomme ;
     2. ⛔ AUCUN SECRET NI À L'ÉCRAN NI SUR UNE LIGNE DE COMMANDE : les mêmes valeurs sont cherchées dans la sortie de
        l'installeur ET dans les arguments de jq et d'openssl (des enveloppes qui les journalisent avant d'exécuter les vrais).
        Une clé Stripe de PRODUCTION (sk_live_) est refusée ;
     3. ⛔ IL EST REJOUABLE : un second passage ne change pas un octet (configuration, clé maître de test, mot de passe),
        ne recharge pas nginx, ne redemande rien ; et il REFUSE de régénérer la clé maître si des bases de test existent ;
     4. LES PAGES SONT FERMÉES, L'API NON : /api/ n'est pas derrière le mot de passe (sinon le navigateur remplacerait
        l'en-tête Bearer des pages par celui de l'authentification et tout tomberait en 401).

   Le faux VPS est dans tests/bac-vps-essais.js. Ce qu'on joue est le VRAI install-test.sh et le VRAI modèle nginx.
   nginx lui-même n'est pas dans le bac : sa syntaxe se garde par le texte rendu (aucun « @@ » restant, structure des
   blocs) ; `nginx -t` s'exécute sur le VPS avant tout rechargement, et l'installeur remet l'ancien fichier s'il refuse. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawnSync } = require('child_process');
const { creerBac, code, ecrire, RACINE_DEPOT, SHA_A, CANARI_AGENTS } = require('./bac-vps-essais');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const reel = (n) => { const r = spawnSync('bash', ['-c', 'command -v ' + n], { encoding: 'utf8' }); return r.stdout.trim(); };
if (!reel('bash') || !reel('jq') || !reel('openssl') || !reel('node')) { console.log('  (bash, jq, openssl ou node absent — banc sauté)\n0 ✓  0 ✗'); return; }

const INSTALL = path.join(RACINE_DEPOT, 'server/install-test.sh');
const MODELE = path.join(RACINE_DEPOT, 'server/nginx-teamop-test.conf');
const SRC = code(INSTALL);
const bacs = [];

/* Le bac de l'installeur : celui de tests/bac-vps-essais.js, plus des ENVELOPPES jq/openssl/node qui journalisent leurs
   arguments (pour prouver qu'aucun secret n'y passe) avant d'exécuter les vrais. */
function bac() {
  const b = creerBac(); bacs.push(b);
  for (const n of ['jq', 'openssl']) ecrire(path.join(b.BIN, n), '#!/bin/bash\necho "' + n + ' $*" >> "$BAC_ETAT/argv"\nexec ' + reel(n) + ' "$@"\n', 0o755);
  return b;
}
const CLE_STRIPE = 'sk_test_' + 'A1b2C3d4E5f6G7h8I9j0K1l2';
const MDP = 'Mot-de-passe-secret-42';
function installer(b, saisies, args, extraEnv) {
  const f = path.join(b.E, 'entree'); fs.writeFileSync(f, (saisies || []).join('\n') + '\n');
  const r = spawnSync('bash', [INSTALL].concat(args || []), { encoding: 'utf8', env: Object.assign({}, b.env, { TEAMOP_TEST_ENTREE: f, TEAMOP_TEST_BRANCHE: 'claude/essai-test' }, extraEnv || {}), timeout: 90000 });
  return { rc: r.status, out: String(r.stdout || '') + String(r.stderr || '') };
}
const TOUT = [CLE_STRIPE, MDP, MDP];
const config = (b) => JSON.parse(b.lire('opt/teamop/test/config.json'));
const argv = (b) => { try { return fs.readFileSync(path.join(b.E, 'argv'), 'utf8'); } catch (e) { return ''; } };
const mode = (b, rel) => (fs.statSync(b.chemin(rel)).mode & 0o777).toString(8);
const hash = (b, rel) => crypto.createHash('sha256').update(fs.readFileSync(b.chemin(rel))).digest('hex');

/* ═══ 1. LE TEXTE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 1. Le texte de l\'installeur (code seul, commentaires retirés)');
vrai('le script se parse (bash -n)', spawnSync('bash', ['-n', INSTALL]).status === 0);
vrai('le code n\'est pas vide (une tranche vide passerait tout)', SRC.length > 6000 && /certbot certonly/.test(SRC) && /deployer-test\.sh/.test(SRC));
const lignesProd = SRC.split('\n').filter(l => /\/opt\/teamop\/(data|config\.json|repo|firebase-admin)/.test(l));
vrai('⛔ le code ne nomme /opt/teamop/data, config.json, repo que dans DEUX lignes : la lecture de la clé des agents et la liste des chemins INVISIBLES au service (' + lignesProd.length + ')',
  lignesProd.length === 2 && lignesProd.some(l => /^PROD_CONFIG="\$R\/opt\/teamop\/config\.json"$/.test(l)) && lignesProd.some(l => /^InaccessiblePaths=/.test(l)));
vrai('⛔ `teamop-api` n\'apparaît dans le code que suivi de `-test`', !/teamop-api(?!-test)/.test(SRC));
const lignesEtc = SRC.split('\n').filter(l => /etc\/teamop/.test(l));
vrai('⛔ /etc/teamop (la clé maître de la production y vit) n\'est nommé que pour y ajouter kek-test (' + lignesEtc.length + ' lignes)',
  lignesEtc.every(l => /^ETC="\$R\/etc\/teamop"$/.test(l) || /kek-test/.test(l) || /^InaccessiblePaths=/.test(l)) && /^KEK="\$ETC\/kek-test"$/m.test(SRC));
vrai('⛔ la configuration de la production n\'est que LUE : PROD_CONFIG ne sert qu\'à un test -f, et SRC_PROD qu\'à `jq --slurpfile` (jamais une redirection >)',
  (SRC.match(/\$PROD_CONFIG/g) || []).length === 2 && /\[ -f "\$PROD_CONFIG" \] && SRC_PROD="\$PROD_CONFIG"/.test(SRC) && (SRC.match(/\$SRC_PROD/g) || []).length === 1 && /--slurpfile prod "\$SRC_PROD"/.test(SRC) && !/>\s*"?\$(PROD_CONFIG|SRC_PROD)/.test(SRC));
const systemctls = SRC.match(/systemctl [^\n]*/g) || [];
vrai('systemctl n\'est appelé que sur l\'unité de TEST, nginx, ou daemon-reload (' + systemctls.length + ' appels)', systemctls.length >= 4 && systemctls.every(l => /\$UNITE|nginx|daemon-reload|\$1/.test(l)) && /^UNITE="teamop-api-test"$/m.test(SRC));
vrai('⛔ le service tourne sous un compte à part, dont la production est INVISIBLE (User=teamoptest, InaccessiblePaths, ProtectSystem=strict, écriture bornée aux données de test)',
  /^User=teamoptest$/m.test(SRC) && /^ProtectSystem=strict$/m.test(SRC) && /^ReadWritePaths=\/opt\/teamop\/test\/data \/opt\/teamop\/test\/monitor\.json$/m.test(SRC) && /^InaccessiblePaths=-\/opt\/teamop\/data -\/opt\/teamop\/config\.json -\/opt\/teamop\/repo -\/opt\/teamop\/firebase-admin\.json -\/etc\/teamop$/m.test(SRC));
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
vrai('⛔ aucun secret sur une ligne de commande : jq reçoit tout par l\'ENVIRONNEMENT (pas de --arg), le mot de passe passe par stdin à openssl', !/jq[^\n]*--arg(json|file)?\b/.test(SRC) && /openssl passwd -apr1 -stdin/.test(SRC) && /printf '%s' "\$MDP" \| openssl/.test(SRC));
vrai('les saisies sont MASQUÉES (read -s) et lues sur le terminal, jamais sur l\'entrée du script', /IFS= read -r -s -u 8/.test(SRC) && /ENTREE="\/dev\/tty"/.test(SRC));
vrai('⛔ une clé Stripe de production (sk_live_/rk_live_) est refusée, et la configuration calculée est revérifiée avant écriture', /sk_live_\*\|rk_live_\*\)/.test(SRC) && /test\("live"\)/.test(SRC));
vrai('⛔ le port par défaut n\'est PAS 8090 (réservé à OP MESSAGES prod) : 8095, et la liste des ports d\'autres services est refusée', /PORT="\$\{TEAMOP_TEST_PORT:-8095\}"/.test(SRC) && /8080\|8090\|8091/.test(SRC));
vrai('⛔ la clé maître de test n\'est jamais régénérée sur des bases existantes (même refus que poser-cle.js)', /bases_de_test\(\)/.test(SRC) && /des bases de test chiffrées existent et la clé de test est ABSENTE/.test(SRC));
vrai('l\'ordre dans le texte : saisies < compte < miroir < clé < configuration < unité < nginx < certificat < premier déploiement',
  (() => { const i = s => SRC.indexOf(s); const o = [i('ouvrir_entree()'), i('useradd'), i('git clone'), i('openssl rand -hex 32 > "$KEK.nouveau"'), i('CONFIG_NEUVE="$('), i('UNITE_TEXTE="'), i('ecrire_ngx()'), i('certbot certonly'), i('bash "$MIROIR/server/deployer-test.sh"')]; return o.every(x => x > 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('l\'unité est posée APRÈS la clé qu\'elle charge (systemd refuse de démarrer une unité dont une source de LoadCredential manque)', SRC.indexOf('openssl rand -hex 32 > "$KEK.nouveau"') < SRC.indexOf('UNITE_TEXTE="'));

/* ═══ 2. UNE INSTALLATION COMPLÈTE ═════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. Installation complète dans le faux VPS');
const B = bac();
const prodAvant = B.empreinteProduction();
let r = installer(B, TOUT);
if (r.rc !== 0) console.log(r.out.slice(-1500));
v('l\'installation réussit (code 0)', r.rc, 0);
vrai('elle se termine sur « Espace de test installé » et l\'adresse à ouvrir', /✅ Espace de test installé/.test(r.out) && /https:\/\/test\.teamop\.fr\/essais\.html/.test(r.out));
vrai('elle fait ses vérifications locales et les dit (/health ok, pages en 401)', /✓ le serveur de test répond/.test(r.out) && /✓ les pages demandent le mot de passe/.test(r.out));
v('⛔ LA PRODUCTION SORT DU BAC À SABLE OCTET POUR OCTET IDENTIQUE (données, configuration, dépôt, unité, clé maître, bloc nginx d\'api)', B.empreinteProduction(), prodAvant);
const j = B.journal();
vrai('⛔ aucun appel ne nomme l\'unité de production (systemctl, chown…)', !j.some(l => /teamop-api(?!-test)/.test(l)));
vrai('le compte « teamoptest » est un compte système sans connexion', j.some(l => /^useradd --system --user-group .*--shell \/usr\/sbin\/nologin teamoptest$/.test(l)));
vrai('le code est cloné ET récupéré EN TANT QUE teamoptest (jamais en root : le dépôt n\'est pas à lui)', j.some(l => /^runuser teamoptest git$/.test(l)) && !j.some(l => /^git (clone|fetch|checkout|rev-parse) as=-/.test(l)));
const cfg = config(B);
vrai('⛔ la configuration porte les réglages du mode test : espaceTest, courrielsCaptes, origine, plafond des agents à 10 $', cfg.espaceTest === true && cfg.courrielsCaptes === true && cfg.espaceTestOrigine === 'https://test.teamop.fr' && JSON.stringify(cfg.origins) === '["https://test.teamop.fr"]' && cfg.agents.plafondMoisTotal === 10);
vrai('la clé des routes d\'essai fait 64 hexadécimaux, tirée au hasard par l\'installation', /^[0-9a-f]{64}$/.test(cfg.espaceTestCle));
v('⛔ la clé des agents est COPIÉE de la production (jq --slurpfile, sans écran)', cfg.agents.cleApi, CANARI_AGENTS);
vrai('⛔ rien de plus n\'est copié de la production : ni sa clé Stripe live, ni son apiKey, ni agents.reunionsAuto (les réunions tournent en test)', !JSON.stringify(cfg).includes('PRODUCTION') && cfg.apiKey !== 'PROD-API-KEY' && cfg.agents.reunionsAuto === undefined);
v('la clé Stripe de TEST est enregistrée', cfg.stripe.secretKey, CLE_STRIPE);
vrai('⛔ la table des tarifs de test (stripe.prixEssai : dix tarifs) est écrite dans la configuration par server/stripe-essai-prix.js, lancé APRÈS la clé et AVANT le premier déploiement (le fabricant des pages la lit)',
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
vrai('l\'ordre du journal : compte < miroir < unité rechargée < certificat < nginx rechargé < premier déploiement < vérifications',
  (() => { const p = re => j.findIndex(l => re.test(l)); const dernier = re => { for (let k = j.length - 1; k >= 0; k--) if (re.test(j[k])) return k; return -1; }; const o = [p(/^useradd/), p(/^git clone/), p(/^systemctl daemon-reload/), p(/^certbot certonly/), dernier(/^systemctl reload nginx/), p(/^systemctl restart teamop-api-test/)]; return o.every(x => x >= 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('⛔ le premier déploiement est celui de la branche demandée, par son SHA complet', j.some(l => /^build as=teamoptest sha=aaaaaaaa branche=claude\/essai-test /.test(l)));
vrai('les pages servies sont celles du premier déploiement (le lien « pages » ne désigne plus l\'attente)', /pages\.d\/\d{14}-aaaaaaaa$/.test(B.lien('opt/teamop/test/pages') || ''));
const secrets = { 'clé Stripe de test': CLE_STRIPE, 'mot de passe des pages': MDP, 'clé maître de test': B.lire('etc/teamop/kek-test').trim(), 'clé des routes d\'essai': cfg.espaceTestCle, 'clé privée VAPID': cfg.vapidPrivateKey, 'apiKey de test': cfg.apiKey, 'clé des agents (copiée)': CANARI_AGENTS };
for (const [nom, val] of Object.entries(secrets)) {
  vrai('⛔ ' + nom + ' : ni à l\'écran, ni sur une ligne de commande de jq/openssl', !r.out.includes(val) && !argv(B).includes(val) && !j.some(l => l.includes(val)));
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
const api = bloc(ngx, 'location ^~ /api/'), sante = bloc(ngx, 'location = /health');
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

/* ═══ 4. REJOUER NE CHANGE RIEN ═════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 4. Idempotence : un second passage ne change pas un octet');
{
  const fichiers = ['opt/teamop/test/config.json', 'etc/teamop/kek-test', 'etc/nginx/teamop-test.htpasswd', 'etc/nginx/sites-available/teamop-test.conf', 'etc/systemd/system/teamop-api-test.service'];
  const RANGE = '{"users":[{"nom":"patron-essai"}],"issues":[],"journal":[]}\n';
  fs.writeFileSync(B.chemin('opt/teamop/test/monitor.json'), RANGE);   // ce que le service y a rangé entre-temps
  fichiers.push('opt/teamop/test/monitor.json');
  const avant = fichiers.map(f => hash(B, f));
  const nj = B.journal().length;
  const r2 = installer(B, []);   // AUCUNE saisie : tout est déjà en place
  v('le second passage réussit sans qu\'on lui réponde rien (code 0)', r2.rc, 0);
  v('⛔ configuration, clé maître de test, mot de passe, fichier nginx et unité : identiques octet pour octet', fichiers.map(f => hash(B, f)), avant);
  v('⛔ monitor.json (comptes de la Tour) survit à un second passage tel que le service l\'a laissé', B.lire('opt/teamop/test/monitor.json'), RANGE);
  const nouveau = B.journal().slice(nj);
  vrai('⛔ aucun nouveau certificat, aucun rechargement de nginx, aucune unité rechargée', !nouveau.some(l => /^certbot/.test(l)) && !nouveau.some(l => /^systemctl (reload nginx|daemon-reload)/.test(l)));
  vrai('il ne redemande aucune saisie (ni clé Stripe, ni mot de passe)', !/Clé secrète Stripe de test|Mot de passe des pages/.test(r2.out));
  vrai('⛔ rejouable : la table de tarifs de test est déjà là (dix), le créateur n\'est PAS relancé (aucun appel à Stripe pour rien)', !nouveau.some(l => /^prixessai/.test(l)) && /tarifs de test : déjà en place/.test(r2.out));
  vrai('le compte n\'est pas recréé', !nouveau.some(l => /^useradd/.test(l)));
  v('la production est toujours identique', B.empreinteProduction(), prodAvant);
  const CLE2 = 'sk_test_' + 'Z9y8X7w6V5u4T3s2R1q0P9o8';
  const r3 = installer(B, [CLE2], ['stripe']);
  const c3 = config(B);
  v('« stripe » redemande la clé Stripe et SEULEMENT elle : la nouvelle remplace l\'ancienne…', c3.stripe.secretKey, CLE2);
  vrai('…sans toucher à la clé des routes d\'essai ni à la paire VAPID', c3.espaceTestCle === cfg.espaceTestCle && c3.vapidPrivateKey === cfg.vapidPrivateKey && r3.rc === 0);
  vrai('⛔ « stripe » relance AUSSI le créateur de tarifs (une clé neuve peut être d\'un autre compte de test : ses tarifs sont à retrouver ou à créer), clé non affichée',
    B.journal().slice(nj).some(l => /^prixessai cfg=config\.json cle=true$/.test(l)) && !r3.out.includes(CLE2));
}
{
  const r4 = installer(B, ['Nouveau-mot-de-passe-77', 'Nouveau-mot-de-passe-77'], ['motdepasse']);
  const htp2 = B.lire('etc/nginx/teamop-test.htpasswd').trim();
  vrai('« motdepasse » change le mot de passe des pages (un autre hachage) sans redemander la clé Stripe', r4.rc === 0 && htp2 !== htp && !htp2.includes('Nouveau-mot-de-passe'));
}

/* ═══ 5. LES REFUS ═════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 5. Les refus : une clé de production, une clé maître orpheline, un DNS absent, nginx qui refuse');
{
  const b = bac();
  const x = installer(b, ['sk_live_' + 'Q'.repeat(24), '', MDP, MDP]);
  vrai('⛔ une clé Stripe de PRODUCTION (sk_live_) est refusée, dite en clair, et n\'entre jamais dans la configuration', /clé de PRODUCTION/.test(x.out) && !JSON.stringify(config(b)).includes('sk_live') && !x.out.includes('Q'.repeat(24)));
  vrai('…l\'installation va quand même au bout sans Stripe, et le dit (paiements de test éteints)', x.rc === 0 && /Stripe : pas de clé de test/.test(x.out) && !(config(b).stripe || {}).secretKey);
  vrai('⛔ sans clé de test, le créateur de tarifs n\'est PAS lancé (rien à demander à Stripe, et jamais avec une clé de production)', !b.journal().some(l => /^prixessai/.test(l)));
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, MDP, 'autre chose']);
  vrai('⛔ deux saisies différentes du mot de passe : trois essais puis refus, RIEN n\'est installé (les saisies passent avant tout geste)', x.rc === 1 && !b.existe('opt/teamop/test') && !b.existe('etc/teamop/kek-test') && !b.journal().some(l => /^(useradd|git|certbot|chown)/.test(l)));
}
{
  const b = bac();
  const x = installer(b, [CLE_STRIPE, 'court', 'court', 'court', 'court', 'court', 'court']);
  vrai('un mot de passe de moins de 10 caractères est refusé', x.rc === 1 && !b.existe('etc/nginx/teamop-test.htpasswd'));
}
{
  const b = bac();
  b.poser('nginx_inactif');
  const x = installer(b, TOUT);
  vrai('⛔ nginx inactif (Caddy ?) : on s\'arrête AVANT tout geste, et on le dit', x.rc === 1 && /nginx n'est pas actif/.test(x.out) && !b.existe('opt/teamop/test'));
}
{
  const b = bac();
  b.poser('branche_absente');
  const x = installer(b, TOUT);
  vrai('une branche qui n\'existe pas sur GitHub : refus clair, et ni clé maître ni configuration n\'ont été écrites', x.rc === 1 && /n'existe pas sur GitHub/.test(x.out) && !b.existe('etc/teamop/kek-test') && !b.existe('opt/teamop/test/config.json'));
}
{
  const b = bac();
  ecrire(b.chemin('opt/teamop/test/data/socle/entreprise-x/base.db'), 'BASE-CHIFFREE-DE-TEST');
  const x = installer(b, TOUT);
  vrai('⛔ des bases de test chiffrées existent, la clé est ABSENTE : refus, aucune clé neuve (elle les rendrait illisibles)', x.rc === 1 && /illisibles/.test(x.out) && !b.existe('etc/teamop/kek-test'));
  vrai('…et le message dit comment repartir de zéro sans toucher à la production', /rm -rf \/opt\/teamop\/test\/data\/\*/.test(x.out));
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
  const y = installer(b, [MDP, MDP].slice(0, 0));
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
}

/* ═══ 6. LE MODÈLE NGINX ET LE MODE D'EMPLOI, DANS LE DÉPÔT ═════════════════════════════════════════════════════ */
console.log('\n── 6. Le modèle, le mode d\'emploi');
{
  const m = code(MODELE);
  vrai('le modèle porte le marqueur qui sépare la phase « port 80 » de la phase HTTPS (sans lui, la première écriture contiendrait un bloc 443 sans certificat)', /^# ==== HTTPS/m.test(fs.readFileSync(MODELE, 'utf8')) && m.length > 1500);
  vrai('le modèle ne contient aucune adresse de production ni clé', !/api\.teamop\.fr/.test(m) && !/sk_(test|live)_/.test(m));
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
  vrai('⛔ il ne contient aucune clé ni aucun secret (sk_test_ suivi de lettres, whsec_ suivi de lettres, 64 hexadécimaux)', !/sk_(test|live)_[A-Za-z0-9]{8}/.test(d) && !/whsec_[A-Za-z0-9]{8}/.test(d) && !/\b[0-9a-f]{64}\b/.test(d));
  const rmDoc = d.split('\n').filter(l => /^\s*rm\b/.test(l));
  vrai('⛔ « Tout défaire » ne supprime que des chemins de l\'espace de test (' + rmDoc.length + ' lignes rm), jamais la production', rmDoc.length >= 3 && rmDoc.every(l => /teamop-test|teamop-api-test|\/opt\/teamop\/test|kek-test/.test(l) && !/\/opt\/teamop\/(data|repo|config)|\/etc\/teamop\/kek(?!-test)|teamop-api(?!-test)/.test(l)));
  vrai('il nomme le port 8095 et pourquoi pas 8090', /8095/.test(d) && /8090/.test(d));
  vrai('chaque commande du mode d\'emploi qui lance un script du dépôt vise un fichier qui existe', (d.match(/bash \/root\/(install-test)\.sh/g) || []).length >= 1 && fs.existsSync(path.join(RACINE_DEPOT, 'server/install-test.sh')) && fs.existsSync(path.join(RACINE_DEPOT, 'server/deployer-test.sh')));
}

bacs.forEach(b => b.nettoyer());
console.log('\n════ test-2989 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
