/* ⛔ CE QUE CE FICHIER GARDE — LE WORKFLOW QUI DÉPLOIE OP MESSAGES, LU COMME DES DÉPENDANCES, ET LES LISTES QUI LE GARDENT.

   `.github/workflows/deploiement-messages.yml` parle au VPS par une clé SSH à commande forcée. Ce qui compte n'est
   pas ce qu'il DIT vouloir faire mais ce qu'il PEUT faire, et c'est une affaire de dépendances entre jobs :
     · la bêta part APRÈS les bancs (`needs`) — jamais en parallèle : le 19 septembre 2026, le déploiement d'OP GESTION
       finissait 50 à 100 s AVANT ses bancs, parce qu'ils vivaient dans un autre workflow ;
     · la production NE PART PAS d'une poussée : seulement par un lancement manuel, avec l'approbation de l'environnement
       `msg-prod` — la phrase « publie OP MESSAGES » de Justin, traduite en geste. On l'ÉVALUE : l'expression `if:` de
       chaque job est jouée pour chaque événement possible, on ne lit pas son intention ;
     · les filtres de chemins sont DISJOINTS de ceux d'OP GESTION : un push sur `server-msg/` ne redémarre pas `teamop-api`,
       et inversement ;
     · rien de secret ni de venu de l'extérieur n'est interpolé dans un script (`${{ … }}` : injection de commande) ;
     · le compteur est LE MÊME que partout (`scripts/bancs-ci.sh`), appelé avec SA liste et son plancher — et on joue la
       ligne réelle du workflow contre de fausses suites, pour qu'une liste vide, une suite absente ou un plancher non
       atteint ne passe pas au vert.
   Le parse des blocs `run:` et des heredocs distants est celui de `test-728` (qui lit tous les workflows). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');
const { banc, sansCommentaires, RACINE } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const WF = path.join(RACINE, '.github', 'workflows');
const lire = (...p) => fs.readFileSync(path.join(RACINE, ...p), 'utf8');
console.log('\n── 933 · le déploiement d\'OP MESSAGES, lu comme des dépendances ──');

const nomWf = 'deploiement-messages.yml';
vrai('le workflow existe', fs.existsSync(path.join(WF, nomWf)));
const src = lire('.github', 'workflows', nomWf);
const dep = lire('.github', 'workflows', 'deploiement.yml');
const code = sansCommentaires(src);

/* ── Lecture sommaire d'un workflow : les jobs, leurs lignes. Pas de bibliothèque YAML (le dépôt n'en a aucune). ── */
function jobsDe(texte) {
  const jobs = {}; let courant = null, dansJobs = false;
  for (const l of texte.split('\n')) {
    if (/^jobs:\s*$/.test(l)) { dansJobs = true; continue; }
    if (!dansJobs) continue;
    const m = /^  ([A-Za-z0-9_-]+):\s*$/.exec(l);
    if (m) { courant = m[1]; jobs[courant] = []; continue; }
    if (courant) jobs[courant].push(l);
  }
  return jobs;
}
const J = jobsDe(src);
const champ = (job, cle) => { const m = new RegExp('^    ' + cle + ':\\s*(.+?)\\s*$', 'm').exec((J[job] || []).join('\n')); return m ? m[1] : null; };
v('trois jobs, et pas un de plus : les bancs, la bêta, la production', Object.keys(J).sort(), ['bancs', 'deployer-beta', 'deployer-prod']);

/* ── Les blocs `run:` (même désindentage que test-728 : le délimiteur d'un heredoc doit revenir en colonne zéro) ── */
function blocsRun(texte) {
  const L = texte.split('\n'), out = [];
  for (let i = 0; i < L.length; i++) {
    const m = /^(\s*)(?:-\s+)?run:\s*(\|-?)?\s*(.*)$/.exec(L[i]);
    if (!m) continue;
    if (!m[2]) { out.push({ ligne: i + 1, texte: m[3] + '\n', jobLigne: i }); continue; }
    const base = m[1].length, corps = [];
    let j = i + 1;
    for (; j < L.length; j++) { if (!L[j].trim()) { corps.push(''); continue; } if (L[j].search(/\S/) <= base) break; corps.push(L[j]); }
    const marge = Math.min(...corps.filter(l => l.trim()).map(l => l.search(/\S/)));
    out.push({ ligne: i + 1, texte: corps.map(l => l.slice(marge)).join('\n') + '\n' });
    i = j - 1;
  }
  return out;
}
const blocs = blocsRun(src);
vrai('des blocs run: sont lus (population avant verdict)', blocs.length >= 6);

/* ══ 1. LES DÉCLENCHEURS ═══════════════════════════════════════════════════════════════════════════ */
{
  const paths = (texte) => { const m = /^\s*paths:\s*\[([^\]]*)\]/m.exec(texte); return m ? m[1].split(',').map(x => x.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean) : []; };
  const mien = paths(src), leur = paths(dep);
  v('⛔ la bêta part d\'une poussée sur server-msg/**, sa liste de bancs et son propre workflow — rien d\'autre',
    mien.sort(), ['.github/workflows/deploiement-messages.yml', 'scripts/bancs-messages.liste', 'server-msg/**']);
  vrai('   le déploiement d\'OP GESTION filtre bien sur server/** (population de la comparaison)', leur.includes('server/**'));
  const glob = (g) => new RegExp('^' + g.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*/g, '\u0000').replace(/\*/g, '[^/]*').replace(/\u0000/g, '.*') + '$');
  const part = (liste, f) => liste.some(g => glob(g).test(f));
  v('⛔ un fichier du service d\'OP MESSAGES ne déclenche PAS le déploiement d\'OP GESTION', part(leur, 'server-msg/index.js'), false);
  v('⛔ un fichier du serveur d\'OP GESTION ne déclenche PAS celui d\'OP MESSAGES', part(mien, 'server/index.js'), false);
  v('   le déploiement d\'OP GESTION ne réagit pas à un fichier de server-msg/public/ (« server/** » n\'attrape pas « server-msg/ »)', part(leur, 'server-msg/public/messages.js'), false);
  v('   les deux workflows ne se déclenchent pas l\'un l\'autre par leur propre fichier', [part(mien, '.github/workflows/deploiement.yml'), part(leur, '.github/workflows/deploiement-messages.yml')], [false, false]);
  vrai('   seul main déclenche (jamais une branche)', /^on:\s*\n\s+push:\s*\n\s+branches:\s*\[main\]/m.test(src));
  vrai('⛔ le lancement manuel offre bêta ET production, le sha, et l\'option « retour » (un recul se demande, il ne s\'improvise pas)',
    /workflow_dispatch:[\s\S]*cible:[\s\S]*options: \[beta, prod\][\s\S]*sha:[\s\S]*retour:[\s\S]*type: boolean/.test(src));
  v('   la cible par défaut est la bêta (jamais la production par défaut)', /cible:[\s\S]*?default: beta/.test(src), true);
  v('   le workflow ne porte aucun droit d\'écriture', /^permissions:\s*\n\s+contents: read\s*$/m.test(src), true);
  v('⛔ pas de `concurrency` au niveau du workflow (les bancs ne doivent pas attendre un déploiement qui touche le VPS)', /^concurrency:/m.test(src), false);
}

/* ══ 2. LES DÉPENDANCES ENTRE JOBS ════════════════════════════════════════════════════════════════════ */
{
  for (const j of ['deployer-beta', 'deployer-prod']) {
    v('⛔ ' + j + ' ATTEND les bancs (needs: bancs)', champ(j, 'needs'), 'bancs');
    vrai('   ' + j + ' parle bien au VPS (c\'est ce qui rend le needs obligatoire)', J[j].some(l => /root@api\.teamop\.fr/.test(l)));
    vrai('   ' + j + ' a un délai maximal', champ(j, 'timeout-minutes') !== null);
  }
  vrai('les bancs ne parlent PAS au VPS', !J['bancs'].some(l => /ssh|root@|VPS_SSH/.test(l)));
  vrai('   et ont leur délai', champ('bancs', 'timeout-minutes') !== null);

  /* ⛔ L'ÉVALUATION : chaque `if:` est joué pour chaque événement possible. */
  const evaluer = (expr, ctx) => {
    const js = expr.replace(/github\.event_name/g, JSON.stringify(ctx.event)).replace(/inputs\.cible/g, JSON.stringify(ctx.cible));
    if (!/^[\s"'a-z_=&|!()-]*$/i.test(js)) throw new Error('expression inattendue : ' + js);
    return !!new Function('return (' + js + ')')();
  };
  const si = { 'deployer-beta': champ('deployer-beta', 'if'), 'deployer-prod': champ('deployer-prod', 'if') };
  vrai('   chaque job de déploiement porte une condition `if:`', !!si['deployer-beta'] && !!si['deployer-prod']);
  const evt = [['push', ''], ['workflow_dispatch', 'beta'], ['workflow_dispatch', 'prod']];
  const attendu = { 'push|': ['deployer-beta'], 'workflow_dispatch|beta': ['deployer-beta'], 'workflow_dispatch|prod': ['deployer-prod'] };
  for (const [event, cible] of evt) {
    const part = ['deployer-beta', 'deployer-prod'].filter(j => si[j] && evaluer(si[j], { event, cible }));
    v('⛔ ' + (event === 'push' ? 'une POUSSÉE sur main' : 'un lancement manuel, cible « ' + cible + ' »') + ' déclenche : ' + (attendu[event + '|' + cible].join(', ')),
      part, attendu[event + '|' + cible]);
  }
  v('⛔ la production ne part JAMAIS d\'une poussée (c\'est la phrase de Justin, pas un automatisme)', si['deployer-prod'] ? evaluer(si['deployer-prod'], { event: 'push', cible: '' }) : 'absent', false);

  /* ⛔ L'ENVIRONNEMENT QUI PORTE LA PHRASE : seul le job de production le demande. */
  v('⛔ la production attend l\'approbation de l\'environnement msg-prod', champ('deployer-prod', 'environment'), 'msg-prod');
  v('   la bêta n\'en demande aucune (elle part à chaque poussée, après les bancs)', champ('deployer-beta', 'environment'), null);
  v('   « msg-prod » ne se trouve que dans le job de production', ['bancs', 'deployer-beta'].filter(j => J[j].some(l => /msg-prod/.test(l))), []);

  /* ⛔ UN SEUL DÉPLOIEMENT À LA FOIS SUR LE VPS, ET LE MÊME GROUPE QU'OP GESTION — sans couper un déploiement en cours. */
  const groupeDe = (texte) => (/concurrency:\s*\n(?:\s+#[^\n]*\n)*\s+group:\s*([\w-]+)/.exec(texte) || [])[1];
  const groupeGestion = groupeDe(dep);
  v('   le groupe de concurrence d\'OP GESTION est lu (population)', groupeGestion, 'deploiement-vps');
  for (const j of ['deployer-beta', 'deployer-prod']) {
    v('⛔ ' + j + ' : concurrency sur le groupe du VPS (' + groupeGestion + ')', groupeDe(J[j].join('\n')), groupeGestion);
    vrai('   ' + j + ' : on ne coupe pas un déploiement en cours (cancel-in-progress: false)', /cancel-in-progress:\s*false/.test(J[j].join('\n')));
  }
  v('   les bancs n\'ont PAS de concurrency (ils ne touchent pas au VPS)', /concurrency:/.test(J['bancs'].join('\n')), false);
}

/* ══ 3. LES BANCS QUE LE WORKFLOW LANCE ═══════════════════════════════════════════════════════════════ */
{
  const bancs = J['bancs'].join('\n');
  vrai('⛔ les dépendances du service s\'installent AVANT les bancs, sans scripts (npm ci --omit=dev --ignore-scripts --prefix server-msg)',
    /npm ci --omit=dev --ignore-scripts --no-audit --no-fund --prefix server-msg/.test(bancs) && bancs.indexOf('npm ci') < bancs.indexOf('bancs-ci.sh'));
  vrai('   la syntaxe de chaque fichier du service est contrôlée (node --check, bash -n) avant les bancs',
    /xargs -0 -n1 node --check/.test(bancs) && /bash -n/.test(bancs) && bancs.indexOf('node --check') < bancs.indexOf('bancs-ci.sh'));
  const ligne = (/^\s+run: (BANCS_PLANCHER=\S.*bancs-ci\.sh.*)$/m.exec(bancs) || [])[1];
  vrai('⛔ le compteur est LE compteur partagé, lancé avec le plancher et la liste d\'OP MESSAGES', !!ligne
    && /BANCS_PLANCHER=\$\(sed -n 's\/\^#plancher \/\/p' scripts\/bancs-messages\.liste\) bash scripts\/bancs-ci\.sh \$\(grep -vE '\^\[\[:space:\]\]\*\(#\|\$\)' scripts\/bancs-messages\.liste\)$/.test(ligne));
  vrai('   le job lance les bancs du commit déployé, pas d\'un autre (checkout du sha demandé)', /ref: \$\{\{ inputs\.sha \|\| github\.sha \}\}/.test(bancs));

  /* ⛔ ON JOUE LA LIGNE RÉELLE DU WORKFLOW contre de fausses suites : liste vide, suite absente, plancher inatteint,
     suite qui échoue. Le compteur est celui du dépôt, copié tel quel dans un dossier à part (jamais les vraies suites :
     elles se relanceraient elles-mêmes). */
  if (ligne) {
    const jouer = (suites, plancher, extra) => {
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'opmsg-liste-'));
      fs.mkdirSync(path.join(d, 'scripts')); fs.mkdirSync(path.join(d, 'tests'));
      fs.copyFileSync(path.join(RACINE, 'scripts', 'bancs-ci.sh'), path.join(d, 'scripts', 'bancs-ci.sh'));
      const bon = (n) => 'for (let i = 0; i < ' + n + '; i++) console.log("  ✓ x"); console.log("\\n' + n + ' ✓  0 ✗");';
      fs.writeFileSync(path.join(d, 'tests', 'test-a.js'), bon(3));
      fs.writeFileSync(path.join(d, 'tests', 'test-b.js'), bon(4));
      fs.writeFileSync(path.join(d, 'tests', 'test-rouge.js'), 'console.log("  ✗ cassé"); console.log("\\n1 ✓  1 ✗"); process.exitCode = 1;');
      fs.writeFileSync(path.join(d, 'scripts', 'bancs-messages.liste'), '# en-tête\n' + (plancher !== null ? '#plancher ' + plancher + '\n' : '') + suites.map(s => s + '\n').join('') + (extra || ''));
      const r = spawnSync('bash', ['-c', ligne], { cwd: d, encoding: 'utf8' });
      fs.rmSync(d, { recursive: true, force: true });
      return { rc: r.status, sortie: String(r.stdout) + String(r.stderr) };
    };
    const ok = jouer(['tests/test-a.js', 'tests/test-b.js'], 7);
    v('la ligne du workflow, jouée sur deux suites saines : verte, avec le bon total', [ok.rc, /2 suites · 7 vérifications/.test(ok.sortie)], [0, true]);
    const bas = jouer(['tests/test-a.js', 'tests/test-b.js'], 8);
    vrai('⛔ un plancher non atteint (des suites ont sauté leur partie) : ROUGE', bas.rc === 1 && /le plancher est 8/.test(bas.sortie));
    const absente = jouer(['tests/test-a.js', 'tests/test-zzz.js'], 3);
    vrai('⛔ une suite nommée par la liste et ABSENTE : rouge (une suite renommée ne sort pas de la porte en silence)', absente.rc === 1 && /n'existe pas/.test(absente.sortie));
    const rouge = jouer(['tests/test-a.js', 'tests/test-rouge.js'], 3);
    vrai('⛔ une suite qui échoue : rouge, et le coupable est nommé', rouge.rc === 1 && /test-rouge\.js/.test(rouge.sortie));
    const vide = jouer([], 1);
    vrai('⛔ une liste VIDE : rouge (« un ensemble vide passe et ne prouve rien »)', vide.rc !== 0);
    const sansPlancher = jouer(['tests/test-a.js'], null);
    vrai('   sans ligne #plancher le compteur ne contrôle rien : c\'est pourquoi le banc exige la ligne dans la vraie liste (plus bas)', sansPlancher.rc === 0);
  }
}

/* ══ 4. CE QUI NE DOIT PAS ENTRER DANS UN SCRIPT ═══════════════════════════════════════════════════════ */
{
  const lignesSecrets = src.split('\n').filter(l => /secrets\./.test(l) && !/^\s*#/.test(l));
  vrai('la clé SSH est lue dans un secret (population avant verdict)', lignesSecrets.length === 2);
  v('⛔ le secret n\'entre que par un `env:` du job — jamais interpolé dans un script (UNE clé par instance : la bêta n\'a pas celle de la production)', lignesSecrets.filter(l => !/^      CLE_SSH: \$\{\{ secrets\.VPS_SSH_KEY_MSG_(BETA|PROD) \}\}$/.test(l)), []);
  vrai('⛔ CHAQUE job lit SA clé : la bêta VPS_SSH_KEY_MSG_BETA seule, la production VPS_SSH_KEY_MSG_PROD seule (sinon la clé de la bêta déploierait la production, ou la production ne serait pas protégée par son environnement)',
    /secrets\.VPS_SSH_KEY_MSG_BETA/.test(J['deployer-beta'].join('\n')) && !/VPS_SSH_KEY_MSG_PROD/.test(J['deployer-beta'].join('\n'))
    && /secrets\.VPS_SSH_KEY_MSG_PROD/.test(J['deployer-prod'].join('\n')) && !/secrets\.VPS_SSH_KEY_MSG_BETA/.test(J['deployer-prod'].join('\n')));
  v('⛔ aucun `${{ … }}` dans un bloc run: (une valeur venue de l\'extérieur — le sha, la cible — y deviendrait une commande)',
    blocs.filter(b => /\$\{\{/.test(b.texte)).map(b => b.ligne), []);
  v('⛔ aucun journalctl (le dépôt est public, les journaux d\'un run sont lus par tous pendant 90 jours)', /journalctl/.test(code), false);
  const mauvais = []; const re = /\$\{[A-Za-z_][A-Za-z0-9_]*:[?+-]([^}]*)\}/g; let m;
  while ((m = re.exec(src))) if (/['"`]/.test(m[1])) mauvais.push(m[0]);
  v('⛔ aucun ${var:?mot} ne porte de quote dans son mot (le script entier cesserait de se parser)', mauvais, []);
  vrai('   le sha est contrôlé (40 hexadécimaux) AVANT d\'être envoyé au VPS, dans chaque job qui déploie',
    ['deployer-beta', 'deployer-prod'].every(j => /\[\[ "\$SHA" =~ \^\[0-9a-f\]\{40\}\$ \]\]/.test(J[j].join('\n'))));

  /* La demande envoyée est celle de SON job : « beta » dans le job bêta, « prod » dans celui de la production — un job
     qui enverrait l'autre cible déploierait le mauvais service sans qu'aucun contrôle ne s'en aperçoive. */
  for (const [job, cible, autre] of [['deployer-beta', 'beta', 'prod'], ['deployer-prod', 'prod', 'beta']]) {
    const ssh = J[job].filter(l => /ssh -i/.test(l)).join('\n') + '\n' + J[job].filter(l => /root@api\.teamop\.fr/.test(l)).join('\n');
    vrai('⛔ ' + job + ' demande « ' + cible + ' » (et pas « ' + autre + ' »), par commande forcée, hors invite',
      new RegExp('root@api\\.teamop\\.fr "' + cible + ' \\$SHA \\$RETOUR"').test(ssh) && !new RegExp('root@api\\.teamop\\.fr "' + autre + ' ').test(ssh) && /BatchMode=yes/.test(ssh));
  }
  const connus = (txt) => txt.split('\n').map(l => l.trim()).filter(l => /^(api\.teamop\.fr|217\.154\.6\.139) ssh-ed25519 /.test(l)).sort();
  vrai('   la clé d\'hôte du VPS est celle de deploiement.yml (deux lignes, mêmes octets) — une clé d\'hôte publique n\'est pas un secret', connus(src).length === 4 && connus(dep).length === 2
    && connus(src).every((l, k, a) => l === connus(dep)[k % 2 === 0 ? 0 : 1] || connus(dep).includes(l)));
  vrai('⛔ la production n\'accepte pas un « non installé » silencieux (elle a été demandée : un vert ne doit pas laisser croire qu\'elle est déployée)',
    /grep -q 'non installé'; then\s*\n\s*echo "::error::[^\n]*"\s*\n\s*exit 1\s*\n\s*fi/.test(J['deployer-prod'].join('\n')));
  vrai('   la bêta, elle, accepte « non installé » (le code se fusionne avant l\'installation) : avertissement, pas d\'échec',
    /::notice::/.test(J['deployer-beta'].join('\n')) && !/non installé[\s\S]{0,200}exit 1/.test(J['deployer-beta'].join('\n')));
  vrai('   la bêta sans secret ne rougit pas non plus (on le dit, on sort en 0)', /VPS_SSH_KEY_MSG_BETA absent[\s\S]{0,200}exit 0/.test(J['deployer-beta'].join('\n')));
  vrai('   la production sans secret ROUGIT', /VPS_SSH_KEY_MSG_PROD est absent[\s\S]{0,200}exit 1/.test(J['deployer-prod'].join('\n')));
}

/* ══ 5. LA LISTE DES BANCS D'OP MESSAGES ══════════════════════════════════════════════════════════════ */
{
  const liste = path.join(RACINE, 'scripts', 'bancs-messages.liste');
  vrai('la liste existe', fs.existsSync(liste));
  if (fs.existsSync(liste)) {
    const brut = fs.readFileSync(liste, 'utf8');
    const L = brut.split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
    const pl = +((brut.match(/^#plancher (\d+)\s*$/m) || [])[1] || 0);
    vrai('⛔ elle porte son plancher de vérifications (sans lui, une suite qui saute sa partie exécutée rend un total plus petit et VERT)', pl >= 200);
    v('⛔ chaque suite nommée existe', L.filter(f => !fs.existsSync(path.join(RACINE, f))), []);
    v('   pas de doublon', L.length, new Set(L).size);
    v('   chaque ligne est un banc de tests/ (rien d\'autre ne se lance par ce compteur)', L.filter(f => !/^tests\/test-9\d\d\.js$/.test(f)), []);
    for (const s of ['930', '931', '932', '933', '934']) vrai('   le banc ' + s + ' (l\'installation et le déploiement) est dans la liste', L.includes('tests/test-' + s + '.js'));
    const serveur = fs.readFileSync(path.join(RACINE, 'scripts', 'bancs-serveur.liste'), 'utf8').split('\n').map(x => x.trim()).filter(x => x && !x.startsWith('#'));
    v('⛔ la liste est DISJOINTE de celle du serveur d\'OP GESTION (deux services, deux portes, deux planchers)', L.filter(f => serveur.includes(f)), []);
    /* ⛔ Elle ne lit AUCUNE page d'OP GESTION : sur `main`, `app.html` et `tour.html` ne sont pas ceux de la branche, et ces
       suites tomberaient sur un déploiement juste (la leçon de `bancs-serveur.liste`). On compte la population lue. */
    const sansMoi = L.filter(f => f !== 'tests/test-933.js');   // ce banc NOMME ces pages dans son propre motif : il ne se lit pas lui-même
    const lecteurs = sansMoi.filter(f => fs.existsSync(path.join(RACINE, f))).filter(f => /\b(app|beta|tour|espace|connexion|reinit)\.html\b/.test(sansCommentaires(fs.readFileSync(path.join(RACINE, f), 'utf8'))));
    v('⛔ aucune suite de la liste ne lit une page d\'OP GESTION (app, beta, tour, espace, connexion, reinit)', lecteurs, []);
    /* UNE exception, nommée : `test-904` lance le VRAI `server/index.js` — c'est la couture réelle de la porte bêta, la seule chose que
       le faux OP GESTION de poche ne peut pas garder. Il saute vert, avec 0 vérification, sans `server/node_modules` : le workflow doit
       donc les installer (sinon le plancher de la liste, qui compte ses vérifications, ferait échouer chaque déploiement). */
    const DEPEND_DU_SERVEUR = ['tests/test-904.js'];
    v('   seule la couture réelle (test-904) dépend du dossier de dépendances d\'OP GESTION (server/node_modules) — et elle est nommée ici',
      sansMoi.filter(f => fs.existsSync(path.join(RACINE, f))).filter(f => /server\/node_modules/.test(fs.readFileSync(path.join(RACINE, f), 'utf8'))), DEPEND_DU_SERVEUR);
    vrai('⛔ le workflow INSTALLE les dépendances d\'OP GESTION avant les bancs (sans elles test-904 saute vert et le plancher fait échouer le job)',
      /npm ci [^\n]*--prefix server\s*$/m.test(src) && src.indexOf('--prefix server\n') < src.indexOf('bancs-ci.sh'));
  }
}

/* ══ 6. LE SCRIPT QUI FABRIQUE LE COMMIT DE MAIN EMPORTE TOUT D'OP MESSAGES ═══════════════════════════ */
{
  const prep = lire('scripts', 'preparer-deploiement-serveur.sh');
  const c = sansCommentaires(prep);
  const bloc = (/^OPMSG_FICHIERS=\(([\s\S]*?)\)\s*$/m.exec(c) || [])[1] || '';
  const fichiers = bloc.split(/\s+/).filter(Boolean);
  vrai('le script de préparation nomme les fichiers d\'OP MESSAGES qui partent (population avant verdict)', fichiers.length >= 6);
  for (const f of ['server-msg', '.github/workflows/deploiement-messages.yml', '.github/scripts/surveillance-messages.js', 'scripts/bancs-messages.liste', 'design/opmessages', 'tests/bac-messages.js', '.gitignore'])
    vrai('⛔ « ' + f + ' » part avec le serveur (sinon rien d\'OP MESSAGES n\'arrive sur main, ou ses bancs tombent sur « introuvable »)', fichiers.includes(f));
  vrai('   les suites de la liste d\'OP MESSAGES sont extraites une à une, et la liste doit être peuplée', /mapfile -t SUITES_MSG < <\(grep -vE '\^\[\[:space:\]\]\*\(#\|\$\)' scripts\/bancs-messages\.liste\)/.test(c) && /-ge 5/.test(c));
  vrai('⛔ il lance les bancs d\'OP MESSAGES AVEC LEUR plancher, avant de commiter',
    /BANCS_PLANCHER="\$\(sed -n 's\/\^#plancher \/\/p' scripts\/bancs-messages\.liste\)" bash scripts\/bancs-ci\.sh "\$\{SUITES_MSG\[@\]\}"/.test(c)
    && c.indexOf('scripts/bancs-messages.liste)" bash scripts/bancs-ci.sh') < c.indexOf('commit -q'));
  vrai('   les deux dossiers de dépendances sont exigés, liés le temps des bancs, et retirés À LA SORTIE quoi qu\'il arrive (trap)',
    /server-msg\/node_modules manque/.test(c) && /trap 'rm -f "\$DEST\/server\/node_modules" "\$DEST\/server-msg\/node_modules"' EXIT/.test(c));
  vrai('   la syntaxe du service est contrôlée avant les bancs', /find server-msg -name '\*\.js'[^\n]*node --check/.test(c) && /bash -n/.test(c));
  vrai('⛔ le commit ajoute le service, ses suites et son workflow', /"\$\{OPMSG_FICHIERS\[@\]\}" "\$\{SUITES_MSG\[@\]\}"/.test(c));
  v('⛔ le script ne pousse toujours RIEN lui-même', c.split('\n').filter(l => /git\b.*\bpush\b/.test(l) && !/^\s*echo /.test(l)), []);
  /* Le contrôle qui prévient un faux vert : un lien `node_modules` (pas un dossier) échappe à un motif « dossier ». */
  vrai('   et il refuse un commit qui contiendrait node_modules, d\'où qu\'il vienne', /git diff --cached --name-only \| grep -q 'node_modules'/.test(c));
}

/* ══ 7. test-728 CONNAÎT LE TROISIÈME APPELANT ═════════════════════════════════════════════════════════ */
{
  const t728 = lire('tests', 'test-728.js');
  vrai('test-728 attend exactement les trois workflows qui lancent le compteur', /\['ci\.yml', 'deploiement-messages\.yml', 'deploiement\.yml'\]/.test(t728));
  const appelants = fs.readdirSync(WF).filter(f => /\.ya?ml$/.test(f) && /bancs-ci\.sh/.test(fs.readFileSync(path.join(WF, f), 'utf8'))).sort();
  v('   et c\'est ce que le dépôt contient', appelants, ['ci.yml', 'deploiement-messages.yml', 'deploiement.yml']);
}

t.fin();
