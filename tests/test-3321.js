/* ══ test-3321 — L'ESPACE DE TEST NE DÉPEND PLUS DE GITHUB : le code arrive par un PAQUET GIT envoyé de l'atelier ═════════
   20 novembre 2026, départ de GitHub (scratchpad/demenagement/PLAN.md). Avant : `deployer-test` allait chercher le commit chez GitHub
   (`git fetch origin`), `install-test.sh` téléchargeait ses fichiers sur raw.githubusercontent.com. Maintenant :
     · `deployer-test --ssh` (clé de l'atelier, commande forcée) lit sur l'entrée un PAQUET (git bundle) : taille plafonnée, `git bundle verify`,
       la tête de la branche du paquet doit être EXACTEMENT le sha demandé, seule cette branche entre dans le miroir (refs/paquets/<sha>) ;
     · le miroir n'a plus de remote : aucun fetch, clone ni ls-remote, nulle part ;
     · `scripts/atelier/envoyer-test.sh` fabrique le paquet (sans ce que le miroir possède déjà : « etat ») et l'envoie.
   Trois étages, qui ne se remplacent pas :
     1. le TEXTE (code seul : un motif de banc vise du code, jamais une phrase) ;
     2. le faux VPS (tests/bac-vps-essais.js, faux git à paquets en texte) : l'ordre des gestes, les refus, rien de basculé sur un refus ;
     3. le VRAI git : de vrais commits, de vrais paquets, un vrai miroir, et le vrai script d'envoi de l'atelier, de bout en bout.
   La sous-racine du banc n'est pas honorée sous --ssh (voulu : un chemin ne se décide jamais de l'extérieur) : on joue donc le MÊME chemin par
   `deployer-test --paquet <sha> <branche>` (root, à la main), le code après l'analyse des arguments étant partagé. Contre-épreuve : scratchpad/mutations-paquet.js. */
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { creerBac, code, RACINE_DEPOT, SHA_A, SHA_B, SHA_C, ecrire } = require('./bac-vps-essais');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a, d) => { if (a) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '\n      → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 500) : '')); } };
const sh = (c) => spawnSync('bash', ['-c', c], { encoding: 'utf8' });
if (sh('true').status !== 0 || sh('jq --version').status !== 0 || sh('flock --version').status !== 0 || sh('git --version').status !== 0) {
  console.log('  (bash, jq, flock ou git absent — banc sauté)\n0 ✓  0 ✗'); return;
}

const DEPLOYEUR = path.join(RACINE_DEPOT, 'server/deployer-test.sh');
const ENVOI = path.join(RACINE_DEPOT, 'scripts/atelier/envoyer-test.sh');
const WORKFLOW = path.join(RACINE_DEPOT, '.forgejo/workflows/deploiement-test.yml');
const SRC = code(DEPLOYEUR), SRC_ENVOI = code(ENVOI);
const bacs = [];
const bac = () => { const b = creerBac(); bacs.push(b); b.installer({ pagesVides: true }); return b; };
const nu = (j) => j.some(l => /^(npm|build|systemctl|cellule)/.test(l));   // quelque chose a été exécuté ou basculé ?

/* ═══ 1. LE TEXTE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 1. Le texte du déployeur : rien ne va sur le réseau, le paquet est borné et contrôlé');
vrai('le code n\'est pas vide (une tranche vide passerait tout)', SRC.length > 4000 && /bundle verify/.test(SRC) && /bundle list-heads/.test(SRC));
vrai('⛔ aucune récupération de code sur le réseau : ni `fetch origin`, ni `clone`, ni `ls-remote`, ni `curl` pour du code, ni adresse github', !/fetch[^\n]* origin/.test(SRC) && !/\bgit_miroir clone\b/.test(SRC) && !/ls-remote/.test(SRC) && !/github/i.test(SRC) && !/raw\.githubusercontent/.test(SRC));
vrai('⛔ le seul `fetch` est celui d\'un FICHIER-PAQUET (`fetch … "$PAQUET" "+refs/heads/$BRANCHE:refs/paquets/$SHA"`), avec le contrôle d\'objets (transfer.fsckObjects)', (SRC.match(/\bfetch\b/g) || []).length === 1 && /-c transfer\.fsckObjects=true fetch -q --no-tags "\$PAQUET" "\+refs\/heads\/\$BRANCHE:refs\/paquets\/\$SHA"/.test(SRC));
vrai('⛔ la taille est PLAFONNÉE à la lecture (`head -c MAX+1`) PUIS refusée au-delà (300 Mo)', /MAX_OCTETS=\$\(\(300 \* 1024 \* 1024\)\)/.test(SRC) && /head -c "\$\(\(MAX_OCTETS \+ 1\)\)" > "\$PAQUET"/.test(SRC) && /\[ "\$\(stat -c %s "\$PAQUET"\)" -le "\$MAX_OCTETS" \]/.test(SRC));
vrai('⛔ le paquet est CONTRÔLÉ avant d\'être lu (git bundle verify), et son sha doit être la TÊTE de la branche (list-heads, ligne exacte « <sha> refs/heads/<branche> »)', /bundle verify -q "\$PAQUET"/.test(SRC) && /bundle list-heads "\$PAQUET"[^\n]*\| grep -qxF "\$SHA refs\/heads\/\$BRANCHE"/.test(SRC));
vrai('⛔ l\'ordre dans le texte : lecture < taille < verify < tête = sha < fetch < cat-file < export', (() => { const i = s => SRC.indexOf(s); const o = [i('head -c "$((MAX_OCTETS + 1))" > "$PAQUET"'), i('-le "$MAX_OCTETS"'), i('bundle verify'), i('bundle list-heads'), i('fetch -q --no-tags'), i('cat-file -e "$SHA^{commit}"'), i('git_miroir archive')]; return o.every(x => x > 0) && o.every((x, k) => k === 0 || x > o[k - 1]); })());
vrai('le paquet est un fichier de ROOT (mktemp dans l\'espace de test, 0644 : le compte de test le lit sans pouvoir l\'écrire), effacé à la sortie', /PAQUET="\$\(mktemp "\$OPT\/paquet\.XXXXXX"\)"/.test(SRC) && /chmod 644 "\$PAQUET"/.test(SRC) && /^trap '\[ -z "\$PAQUET" \] \|\| rm -f "\$PAQUET"' EXIT$/m.test(SRC));
vrai('« etat » (la liste des têtes que le miroir possède) est une LECTURE : for-each-ref sur refs/paquets, rien d\'écrit', /for-each-ref --format='%\(objectname\)' refs\/paquets/.test(SRC));
vrai('le plafond du banc (TEAMOP_TEST_PAQUET_MAX) n\'est honoré que HORS ssh (R vide sous ssh : jamais décidé de l\'extérieur)', /^\[ -z "\$R" \] \|\| MAX_OCTETS="\$\{TEAMOP_TEST_PAQUET_MAX:-\$MAX_OCTETS\}"$/m.test(SRC));
vrai('l\'envoi de l\'atelier se parse, et n\'ouvre aucun shell distant (aucun `bash -s`, aucun heredoc vers ssh)', spawnSync('bash', ['-n', ENVOI]).status === 0 && !/bash -s|<<</.test(SRC_ENVOI.replace(/<<<"\$ETAT"/g, '')) && /"\$\{S\[@\]\}" "\$SHA \$BRANCHE" < "\$P"/.test(SRC_ENVOI));

/* ═══ 2. LE FAUX VPS : l'ordre, les refus ═══════════════════════════════════════════════════════════════════════ */
console.log('\n── 2. Un paquet valide : l\'ordre des gestes, le miroir, le déploiement');
{
  const b = bac();
  const r = b.paqueter(SHA_B, 'claude/ma-branche', b.paquet(SHA_B, 'claude/ma-branche', [SHA_A]));
  const j = b.journal();
  v('le déploiement par paquet réussit (code 0)', r.rc, 0);
  vrai('« déployé : » avec la branche et le commit court', /déployé : claude\/ma-branche bbbbbbbb/.test(r.out), r.out);
  const pos = (re) => j.findIndex(l => re.test(l));
  const o = [pos(/^git bundle as=teamoptest$/), pos(/^git fetch as=teamoptest$/), pos(/^git cat-file/), pos(/^git archive/), pos(/^cellule .* cmd=tar$/), pos(/^npm ci/), pos(/^build /), pos(/^systemctl restart teamop-api-test/)];
  vrai('⛔ l\'ordre du journal : paquet contrôlé < reçu par le miroir < commit présent < archive < tar < npm < pages < redémarrage (' + JSON.stringify(o) + ')', o.every(x => x >= 0) && o.every((x, k) => k === 0 || x > o[k - 1]));
  vrai('⛔ le paquet est lu EN TANT QUE teamoptest (jamais git de root sur un dépôt qu\'il écrit), et RIEN ne va sur le réseau', j.filter(l => /^git (bundle|fetch)/.test(l)).every(l => /as=teamoptest$/.test(l)) && !j.some(l => /^(git (clone|ls-remote|pull)|curl raw)/.test(l)));
  vrai('le commit reçu est servi', b.lire('opt/teamop/test/commit-servi').startsWith(SHA_B + ' claude/ma-branche '));
  const e = b.etat();
  vrai('« --etat » dit la tête reçue (et celle de l\'amorce) : l\'atelier n\'enverra que ce qui manque', e.rc === 0 && e.out.split('\n').includes(SHA_B) && e.out.split('\n').includes(SHA_A), e.out);
  vrai('le paquet temporaire est effacé (rien ne traîne dans l\'espace de test)', !fs.readdirSync(b.chemin('opt/teamop/test')).some(n => /^paquet\./.test(n)));
}

console.log('\n── 3. Les refus : rien n\'est exécuté, rien n\'est basculé, l\'ancien reste en service');
{
  const refus = (b) => !nu(b.journal()) && b.lien('opt/teamop/test/current') === null;
  let b = bac();
  let r = b.paqueter(SHA_B, 'main', 'ceci n\'est pas un paquet git\n');
  vrai('⛔ un paquet INVALIDE (du texte quelconque) : code 3, dit en clair, rien d\'exécuté', r.rc === 3 && /paquet git invalide/.test(r.out) && refus(b), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', '');
  vrai('⛔ un paquet VIDE : refusé (code 3)', r.rc === 3 && refus(b), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', b.paquet(SHA_B, 'main', ['9'.repeat(40)]));
  vrai('⛔ un paquet qui suppose un commit de base que le miroir n\'a PAS : code 3 (« etat » puis refaire le paquet), rien d\'exécuté', r.rc === 3 && /commit de base/.test(r.out) && refus(b), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', b.paquet(SHA_C, 'main', [SHA_A]));
  vrai('⛔ le sha demandé n\'est PAS la tête de la branche du paquet (la tête est cccccccc) : code 4, rien d\'exécuté', r.rc === 4 && /n'est pas bbbbbbbb/.test(r.out) && refus(b) && !b.existe('opt/teamop/test/releases/' + SHA_B), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'claude/autre', b.paquet(SHA_B, 'claude/ma-branche', [SHA_A]));
  vrai('⛔ le sha est la tête d\'une AUTRE branche que celle demandée : code 4', r.rc === 4 && refus(b), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', b.paquet(SHA_C, 'claude/x', [SHA_A]) + b.paquet(SHA_B, 'claude/y', []).split('\n').slice(1).join('\n'));
  vrai('⛔ un paquet à plusieurs têtes où le sha est sur une autre branche que « main » : code 4', r.rc === 4 && refus(b), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', 'x'.repeat(5000), { TEAMOP_TEST_PAQUET_MAX: '1000' });
  vrai('⛔ un paquet TROP GROS (plafond du banc : 1000 octets, paquet : 5000) : code 3, dit en clair, rien d\'exécuté — et le git du miroir ne l\'a même pas ouvert', r.rc === 3 && /paquet trop gros/.test(r.out) && refus(b) && !b.journal().some(l => /^git (bundle|fetch)/.test(l)), r.out);
  b = bac();
  r = b.paqueter(SHA_B, 'main', b.paquet(SHA_B, 'main', [SHA_A]) + 'x'.repeat(2000), { TEAMOP_TEST_PAQUET_MAX: '1000' });
  vrai('…y compris un paquet VALIDE qui dépasse le plafond (la taille décide, pas le contenu)', r.rc === 3 && /trop gros/.test(r.out) && refus(b), r.out);
  b = bac();
  r = b.deployer(SHA_B.replace(/b/g, '7'), 'main');
  vrai('en déploiement DIRECT (sans paquet), un commit que le miroir n\'a pas est refusé — sans rien chercher sur le réseau', r.rc === 1 && /inconnu du miroir/.test(r.out) && !b.journal().some(l => /^git (fetch|clone|ls-remote)/.test(l)) && refus(b), r.out);
  b = bac();
  r = b.lancer(['--paquet', SHA_B], {}, '');
  v('--paquet sans branche : usage, code 2', r.rc, 2);
  r = b.lancer(['--paquet', 'abc', 'main'], {}, '');
  v('--paquet avec un sha mal formé : code 2', r.rc, 2);
  r = b.lancer(['--paquet', SHA_B, 'a;b'], {}, b.paquet(SHA_B, 'a;b', []));
  v('⛔ --paquet avec un nom de branche piégé : code 2', r.rc, 2);
  vrai('…aucun git n\'a été lancé par ces refus', b.journal().length === 0);
}

console.log('\n── 4. Machine non installée, et la clé de l\'atelier (--ssh)');
{
  const n = creerBac(); bacs.push(n);
  n.poserDeployeur();
  const r = n.paqueter(SHA_B, 'main', n.paquet(SHA_B, 'main', [SHA_A]));
  vrai('⛔ non installé + un paquet qui arrive : sort en 0, le DIT, et lit le paquet (l\'atelier ne reçoit pas un « broken pipe »)', r.rc === 0 && /non installé/.test(r.out) && n.journal().length === 0, r.out);
  const b = bac();
  const ssh = (cmd) => b.lancer(['--ssh'], { SSH_ORIGINAL_COMMAND: cmd });
  let x = ssh('etat');
  vrai('« etat » est une demande acceptée sous ssh (ici : l\'espace de test réel n\'existe pas dans ce bac, la réponse est « non installé » — la racine du banc est ignorée)', x.rc === 0 && /non installé/.test(x.out), x.out);
  x = ssh('etat de plus');
  vrai('⛔ « etat de plus » : refusé (code 2), trop de mots', x.rc === 2, x.out);
  x = ssh('ETAT');
  vrai('⛔ « ETAT » (majuscules) n\'est PAS « etat » : lu comme « <sha> <branche> », donc refusé', x.rc === 2, x.out);
  x = ssh(SHA_B + ' main extra');
  vrai('une demande « <sha> <branche> extra » reste refusée', x.rc === 2, x.out);
  x = b.lancer(['--ssh'], { SSH_ORIGINAL_COMMAND: SHA_B + ' main' }, b.paquet(SHA_B, 'main', [SHA_A]));
  vrai('⛔ sous ssh la racine du banc est IGNORÉE même avec un paquet : rien n\'a été fait dans le faux VPS', b.journal().length === 0 && b.lien('opt/teamop/test/current') === null, x.out);
}

/* ═══ 5. LE VRAI GIT : de vrais commits, de vrais paquets, un vrai miroir, le vrai script de l'atelier ══════════════════ */
console.log('\n── 5. Le VRAI git : paquets réels, miroir réel, et `envoyer-test.sh` de bout en bout');
{
  const GIT_ENV = Object.assign({}, process.env, { GIT_AUTHOR_NAME: 't', GIT_AUTHOR_EMAIL: 't@t', GIT_COMMITTER_NAME: 't', GIT_COMMITTER_EMAIL: 't@t', GIT_CONFIG_NOSYSTEM: '1', HOME: os.tmpdir() });
  const g = (cwd, ...args) => spawnSync('git', args, { cwd, encoding: 'utf8', env: GIT_ENV });
  const gs = (cwd, ...args) => { const r = g(cwd, ...args); if (r.status !== 0) throw new Error('git ' + args.join(' ') + ' : ' + r.stderr); return r.stdout.trim(); };
  const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'teamop-paquets-'));
  const SRC_REPO = path.join(TMP, 'atelier');
  fs.mkdirSync(SRC_REPO); gs(SRC_REPO, 'init', '-q', '-b', 'main');
  /* l'arbre de chaque commit : celui d'un « commit du dépôt » du bac (server/index.js, package.json, le fabricant de pages) */
  const b = bac();
  const arbre = (n) => { for (const f of ['server/index.js', 'server/package.json', 'scripts/essais-build.js']) ecrire(path.join(SRC_REPO, f), fs.readFileSync(path.join(b.FIX, SHA_A, f), 'utf8')); ecrire(path.join(SRC_REPO, 'cle.txt'), 'version ' + n + '\n'); };
  const commit = (n) => { arbre(n); gs(SRC_REPO, 'add', '-A'); gs(SRC_REPO, 'commit', '-q', '-m', 'c' + n); return gs(SRC_REPO, 'rev-parse', 'HEAD'); };
  const C1 = commit(1);
  gs(SRC_REPO, 'checkout', '-q', '-b', 'claude/essai');
  const C2 = commit(2);
  /* le miroir du faux VPS devient un VRAI dépôt git, SANS remote ; le faux git du bac est retiré du PATH : tout ce que fait le déployeur passe par le vrai git */
  fs.rmSync(path.join(b.BIN, 'git'));
  fs.rmSync(b.chemin('opt/teamop/test/repo'), { recursive: true, force: true });
  fs.mkdirSync(b.chemin('opt/teamop/test/repo'), { recursive: true });
  gs(b.chemin('opt/teamop/test/repo'), 'init', '-q');
  b.env.GIT_CONFIG_NOSYSTEM = '1'; b.env.GIT_AUTHOR_NAME = 't'; b.env.GIT_AUTHOR_EMAIL = 't@t'; b.env.GIT_COMMITTER_NAME = 't'; b.env.GIT_COMMITTER_EMAIL = 't@t';
  const bundle = (...args) => { const f = path.join(TMP, 'p' + Math.random().toString(36).slice(2)); gs(SRC_REPO, 'bundle', 'create', '-q', f, ...args); return fs.readFileSync(f); };
  const MIROIR = b.chemin('opt/teamop/test/repo');

  let r = b.paqueter(C2, 'claude/essai', bundle('claude/essai'));   // premier paquet : tout l'historique (le miroir est vide)
  vrai('un VRAI paquet complet : déployé, par le vrai git (verify, list-heads, fetch, archive)', r.rc === 0 && /déployé : claude\/essai/.test(r.out) && b.lien('opt/teamop/test/current').endsWith('/' + C2), r.out);
  v('le miroir réel porte la tête dans refs/paquets/<sha> (et rien dans refs/heads : il n\'a pas de branche à lui)', [gs(MIROIR, 'rev-parse', 'refs/paquets/' + C2), gs(MIROIR, 'for-each-ref', 'refs/heads')], [C2, '']);
  vrai('⛔ le miroir n\'a AUCUN remote : il ne peut rien chercher', gs(MIROIR, 'remote') === '' && !/url/.test(fs.readFileSync(path.join(MIROIR, '.git/config'), 'utf8')));
  vrai('le code déployé est bien celui du commit (git archive du miroir)', fs.readFileSync(b.chemin('opt/teamop/test/releases/' + C2 + '/cle.txt'), 'utf8') === 'version 2\n');
  v('« --etat » donne la tête reçue', b.etat().out.trim(), C2);

  const C3 = commit(3);
  const petit = bundle('claude/essai', '--not', C2);
  r = b.paqueter(C3, 'claude/essai', petit);
  vrai('⛔ un paquet INCRÉMENTAL (C2..C3, ' + petit.length + ' octets, base = ce que « etat » a dit) est reçu : déployé', r.rc === 0 && b.lien('opt/teamop/test/current').endsWith('/' + C3) && petit.length < bundle('claude/essai').length, r.out);
  const C4 = commit(4);
  r = b.paqueter(C4, 'claude/essai', bundle('claude/essai', '--not', C2));
  vrai('⛔ un paquet qui suppose C2, que le miroir a : accepté (verify passe sur une base présente)', r.rc === 0, r.out);
  const C5 = commit(5);
  const orphelin = bundle('claude/essai', '--not', C4);
  const b2 = bac(); fs.rmSync(b2.BIN + '/git'); fs.rmSync(b2.chemin('opt/teamop/test/repo'), { recursive: true, force: true }); fs.mkdirSync(b2.chemin('opt/teamop/test/repo'), { recursive: true }); gs(b2.chemin('opt/teamop/test/repo'), 'init', '-q');
  Object.assign(b2.env, { GIT_CONFIG_NOSYSTEM: '1' });
  r = b2.paqueter(C5, 'claude/essai', orphelin);
  vrai('⛔ le VRAI `bundle verify` refuse un paquet dont la base manque au miroir (miroir vide, paquet C4..C5) : code 3, rien d\'exécuté', r.rc === 3 && /commit de base/.test(r.out) && !nu(b2.journal()) && b2.lien('opt/teamop/test/current') === null, r.out);
  r = b2.paqueter(C5, 'claude/essai', Buffer.from('PACK\0\0\0\2 ce n\'est pas un paquet\n'));
  vrai('⛔ du bruit à la place d\'un paquet : code 3', r.rc === 3 && !nu(b2.journal()), r.out);
  const entier = bundle('claude/essai');
  r = b2.paqueter(C4, 'claude/essai', entier);
  vrai('⛔ le VRAI list-heads : la tête du paquet est C5, on demande C4 (un commit « glissé » au fond de l\'historique) : code 4, rien d\'exécuté', r.rc === 4 && !nu(b2.journal()) && b2.lien('opt/teamop/test/current') === null, r.out);
  r = b2.paqueter(C5, 'claude/autre', entier);
  vrai('⛔ le bon sha mais une autre branche que celle du paquet : code 4', r.rc === 4, r.out);
  const tronque = entier.subarray(0, Math.floor(entier.length / 2));
  r = b2.paqueter(C5, 'claude/essai', tronque);
  vrai('⛔ un paquet TRONQUÉ en route (la moitié des octets) : refusé (code 3), rien d\'exécuté', r.rc === 3 && !nu(b2.journal()), r.out);
  r = b2.paqueter(C5, 'claude/essai', entier);
  vrai('(contre-épreuve) le même paquet entier, avec le bon sha, passe sur le même faux VPS', r.rc === 0 && b2.lien('opt/teamop/test/current').endsWith('/' + C5), r.out);

  /* ── le vrai script d'envoi de l'atelier, contre ce faux VPS : etat → paquet → déploiement ── */
  const b3 = bac(); fs.rmSync(b3.BIN + '/git'); fs.rmSync(b3.chemin('opt/teamop/test/repo'), { recursive: true, force: true }); fs.mkdirSync(b3.chemin('opt/teamop/test/repo'), { recursive: true }); gs(b3.chemin('opt/teamop/test/repo'), 'init', '-q');
  Object.assign(b3.env, { GIT_CONFIG_NOSYSTEM: '1' });
  const SSH_SHIM = path.join(TMP, 'ssh-shim.sh');
  ecrire(SSH_SHIM, '#!/bin/bash\nD="' + b3.chemin('usr/local/sbin/deployer-test') + '"\nreq="${@: -1}"\nif [ "$req" = etat ]; then exec bash "$D" --etat; fi\nread -r sha br <<<"$req"\nexec bash "$D" --paquet "$sha" "$br"\n', 0o755);
  const envoyer = (cwd, branche, extra) => { const x = spawnSync('bash', [ENVOI, branche], { cwd, encoding: 'utf8', env: Object.assign({}, b3.env, GIT_ENV, { PATH: b3.env.PATH, TEAMOP_TEST_SSH: SSH_SHIM }, extra || {}), timeout: 90000 }); return { rc: x.status, out: String(x.stdout || '') + String(x.stderr || '') }; };
  gs(SRC_REPO, 'checkout', '-q', 'claude/essai');
  r = envoyer(SRC_REPO, 'claude/essai');
  vrai('⛔ envoyer-test.sh, miroir VIDE : « etat » ne dit rien → paquet complet, déployé', r.rc === 0 && /possède 0 tête/.test(r.out) && /déployé : claude\/essai/.test(r.out) && b3.lien('opt/teamop/test/current').endsWith('/' + C5), r.out);
  const taille1 = +(r.out.match(/paquet : (\d+) Ko/) || [])[1];
  const C6 = commit(6);
  r = envoyer(SRC_REPO, 'claude/essai');
  const taille2 = +(r.out.match(/paquet : (\d+) Ko/) || [])[1];
  vrai('⛔ envoyer-test.sh, deuxième envoi : « etat » donne la tête reçue → paquet INCRÉMENTAL (plus petit que le complet), déployé', r.rc === 0 && /possède 1 tête/.test(r.out) && /déployé : claude\/essai/.test(r.out) && b3.lien('opt/teamop/test/current').endsWith('/' + C6) && taille2 <= taille1, [r.out, taille1, taille2]);
  r = envoyer(SRC_REPO, 'claude/essai');
  vrai('envoyer-test.sh, MÊME commit renvoyé : la tête est déjà connue → un paquet de la tête seule (un paquet vide n\'existe pas), redéployé sans erreur', r.rc === 0 && /déployé : claude\/essai/.test(r.out), r.out);
  r = envoyer(SRC_REPO, 'a;b');
  vrai('⛔ un nom de branche piégé est refusé par l\'atelier AVANT tout envoi (code 2)', r.rc === 2 && !/paquet :/.test(r.out), r.out);
  const n = creerBac(); bacs.push(n); n.poserDeployeur();
  ecrire(SSH_SHIM, '#!/bin/bash\nD="' + n.chemin('usr/local/sbin/deployer-test') + '"\nreq="${@: -1}"\nif [ "$req" = etat ]; then exec bash "$D" --etat; fi\nread -r sha br <<<"$req"\nexec bash "$D" --paquet "$sha" "$br"\n', 0o755);
  r = envoyer(SRC_REPO, 'claude/essai', { PATH: n.env.PATH, TEAMOP_TEST_RACINE: n.R, BAC_ETAT: n.E, BAC_RACINE: n.R });
  vrai('serveur NON installé : l\'atelier le lit dans « etat », n\'envoie RIEN et sort en 0 en le disant', r.rc === 0 && /non installé/.test(r.out) && /rien n'est envoyé/.test(r.out) && !/paquet :/.test(r.out), r.out);
  fs.rmSync(TMP, { recursive: true, force: true });
}

/* ═══ 6. LE WORKFLOW DE LA FORGE ═══════════════════════════════════════════════════════════════════════════════ */
console.log('\n── 6. Le workflow de la forge (déclenchement manuel seulement)');
{
  const wf = fs.readFileSync(WORKFLOW, 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
  vrai('le workflow existe, et sa première ligne est son nom', wf.length > 600 && /^name: Espace de test \(atelier\)$/m.test(wf));
  vrai('⛔ il n\'a QU\'UN déclencheur : workflow_dispatch (la forge n\'a pas d\'approbation d\'environnement : jamais sur push ni demande de fusion, seulement sur la phrase de Justin)', /^on:\n  workflow_dispatch:/m.test(wf) && !/^\s+(push|pull_request|pull_request_target|schedule|workflow_run):/m.test(wf));
  vrai('il demande la branche en entrée, obligatoire', /branche:\n\s+description: "[^"]+"\n\s+required: true/.test(wf));
  vrai('⛔ le nom de branche n\'est JAMAIS collé dans une commande : il passe par l\'environnement (BRANCHE) et le script le revalide', /env:\n\s+BRANCHE: \$\{\{ inputs\.branche \}\}\n\s+run: bash scripts\/atelier\/envoyer-test\.sh "\$BRANCHE"/.test(wf) && (wf.match(/\$\{\{ inputs\.branche \}\}/g) || []).length === 3 && !/run:[^\n]*\$\{\{/.test(wf));
  vrai('les bancs du serveur passent AVANT l\'envoi (needs), sur la branche demandée', /deployer:\n\s+needs: bancs/.test(wf) && (wf.match(/ref: \$\{\{ inputs\.branche \}\}/g) || []).length === 2 && /bancs-serveur\.liste/.test(wf));
  vrai('la clé est celle de l\'atelier, lue par le script (~/.ssh/deploiement-test) : le workflow ne cite AUCUN secret ni clé', !/secrets\./.test(wf) && !/ssh -i|BEGIN [A-Z ]*PRIVATE/.test(wf) && /\$HOME\/\.ssh\/deploiement-test/.test(SRC_ENVOI));
  vrai('un seul envoi à la fois (concurrency, sans annuler le déploiement en cours)', /concurrency:\n\s+group: deploiement-test\n\s+cancel-in-progress: false/.test(wf));
  vrai('⛔ rien dans le workflow ni le script ne nomme la production : ni teamop-api (sans -test), ni /opt/teamop/data, config.json ou repo', !/teamop-api(?!-test)/.test(wf + SRC_ENVOI) && !/\/opt\/teamop\/(data|config|repo)/.test(wf + SRC_ENVOI));
  vrai('l\'empreinte de l\'hôte est celle du serveur des clients, la MÊME que le déploiement du serveur (StrictHostKeyChecking=yes, fichier de clés d\'hôte à lui)', (() => { const dep = fs.readFileSync(path.join(RACINE_DEPOT, '.forgejo/workflows/deploiement-serveur.yml'), 'utf8').match(/api\.teamop\.fr ssh-ed25519 \S+/)[0]; return SRC_ENVOI.includes(dep) && /StrictHostKeyChecking=yes/.test(SRC_ENVOI) && /UserKnownHostsFile="\$KH"/.test(SRC_ENVOI); })());
  vrai('l\'envoi n\'affiche rien de secret : ni la clé ni son chemin n\'est imprimé (le refus « clé manquante » nomme le fichier, pas son contenu)', !/cat "\$K"|echo "\$K"|\$\(<"\$K"\)/.test(SRC_ENVOI));
}

for (const b of bacs) b.nettoyer();
console.log('\n════ test-3321 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
