/* ══ LES HOOKS DE CLAUDE CODE — `.claude/hooks/`, branchés dans `.claude/settings.json` ═════════════════════════════
 *
 * Trois gardes posées le 16 octobre 2026 (Justin : « installer tout ce qu'on a besoin »), parce que CLAUDE.md le dit
 * lui-même : « une garde décrite dans ce fichier n'est pas une garde ».
 *   § 1  garde-navigateur.js — le navigateur piloté ne s'ouvre que sur la bêta, l'aperçu ou le local (jamais app.html)
 *   § 2  garde-git.js        — avant un geste qui efface des changements non commités, une copie est mise de côté
 *   § 3  le branchement      — les deux gardes et le démarrage sont bien déclarés, avec des filtres qui visent juste
 *   § 4  session-start.sh    — installe ce que la CI installe, et rien sur le Mac
 *
 * Les gardes sont EXÉCUTÉES (le vrai script, un vrai JSON sur l'entrée standard) ; la garde git joue chaque forme dans
 * un vrai dépôt temporaire, et vérifie qu'on peut RÉCUPÉRER ce que la commande a effacé — pas seulement qu'un dossier
 * existe. Aucun réseau, aucune dépendance.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync, execFileSync } = require('child_process');

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const lire = f => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } };  // un fichier absent est un ✗, pas un banc qui meurt

const RACINE = path.join(__dirname, '..');
const HOOKS = path.join(RACINE, '.claude', 'hooks');
const lancer = (script, entree, env) => {
  const r = spawnSync('node', [path.join(HOOKS, script)], {
    input: typeof entree === 'string' ? entree : JSON.stringify(entree), encoding: 'utf8', env: { ...process.env, ...env },
  });
  return { code: r.status, sortie: r.stdout, err: r.stderr };
};

/* ── § 1 garde-navigateur ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('§ 1 — garde-navigateur');
const nav = (outil, url) => lancer('garde-navigateur.js', { tool_name: 'mcp__chrome-devtools__' + outil, tool_input: { url } }).code;
const CAS_NAV = [
  ['http://127.0.0.1:8123/beta.html', 0], ['http://localhost:8123/beta.html?x=1#v=planning', 0],
  ['http://127.0.0.1:8123/apercu/app.html', 0], ['http://127.0.0.1:8123/tour.html', 0], ['http://[::1]:8123/index.html', 0],
  ['https://teamop.fr/beta.html', 0], ['https://teamop.fr/apercu/tour.html', 0], ['about:blank', 0], ['data:text/html,<p>x', 0],
  ['file:///home/user/teamop/scratchpad/flou.html', 0],
  ['http://127.0.0.1:8123/app.html', 2], ['http://localhost:8123/app.html#v=clients', 2], ['http://127.0.0.1:8123/APP.HTML', 2],
  ['http://127.0.0.1:8123/%61pp.html', 2], ['https://teamop.fr/app.html', 2], ['https://teamop.fr/', 2],
  ['https://teamop.fr/tour.html', 2], ['https://api.teamop.fr/health', 2], ['file:///home/user/teamop/app.html', 2],
  ['view-source:https://teamop.fr/app.html', 2], ['https://exemple.fr/beta.html.evil/app.html', 2],
];
for (const [u, attendu] of CAS_NAV) v(`${attendu ? 'refuse' : 'laisse'} ${u}`, nav('new_page', u), attendu);
v('navigate_page est gardé aussi', nav('navigate_page', 'https://teamop.fr/app.html'), 2);
v('un outil sans adresse (take_screenshot) passe', lancer('garde-navigateur.js', { tool_name: 'mcp__chrome-devtools__take_screenshot', tool_input: {} }).code, 0);
v('navigate_page « reload » sans adresse passe', lancer('garde-navigateur.js', { tool_name: 'mcp__chrome-devtools__navigate_page', tool_input: { type: 'reload' } }).code, 0);
v('une entrée illisible laisse passer (une garde qui casse le travail se fait débrancher)', lancer('garde-navigateur.js', 'pas du json').code, 0);
const refusTexte = lancer('garde-navigateur.js', { tool_name: 'mcp__chrome-devtools__new_page', tool_input: { url: 'https://teamop.fr/app.html' } }).err;
vrai('le refus DIT pourquoi et quoi faire à la place (beta.html, 127.0.0.1)', /Bêta uniquement/.test(refusTexte) && /127\.0\.0\.1/.test(refusTexte) && /beta\.html/.test(refusTexte));

/* ── § 2 garde-git ────────────────────────────────────────────────────────────────────────────────────────────── */
console.log('§ 2 — garde-git');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'garde-git-'));
const depot = path.join(tmp, 'depot');
const ailleurs = path.join(tmp, 'ailleurs');
fs.mkdirSync(depot); fs.mkdirSync(ailleurs);
const g = (...a) => execFileSync('git', a, { cwd: depot, encoding: 'utf8', env: { ...process.env, LC_ALL: 'C' } });
g('init', '-q', '-b', 'main'); g('config', 'user.email', 'banc@exemple.fr'); g('config', 'user.name', 'banc');
// la configuration globale de la machine ne décide pas (signature obligatoire, hooks maison sur le Mac de Justin)
g('config', 'commit.gpgsign', 'false'); g('config', 'core.hooksPath', os.devnull);
fs.mkdirSync(path.join(depot, 'sous'));
fs.writeFileSync(path.join(depot, 'app.html'), 'version commitée\n');
fs.writeFileSync(path.join(depot, 'sous', 'b.js'), 'b commité\n');
g('add', '-A'); g('commit', '-q', '-m', 'départ');
g('branch', 'autre');

const CORRECTIF = 'le correctif NON COMMITÉ\n';
const salir = () => fs.writeFileSync(path.join(depot, 'app.html'), CORRECTIF);
const copies = () => { const d = path.join(depot, '.git', 'garde-git'); return fs.existsSync(d) ? fs.readdirSync(d).sort() : []; };
const viderCopies = () => fs.rmSync(path.join(depot, '.git', 'garde-git'), { recursive: true, force: true });
const ggit = (command, cwd = depot) => {
  const r = lancer('garde-git.js', { tool_name: 'Bash', tool_input: { command }, cwd });
  let avis = '';
  try { avis = JSON.parse(r.sortie).hookSpecificOutput.additionalContext; } catch { /* rien dit */ }
  return { ...r, avis };
};
const garde = (titre, command, cwd) => {
  viderCopies(); const r = ggit(command, cwd); const c = copies();
  const ok1 = r.code === 0 && c.length === 1 && /garde-git/.test(r.avis);
  vrai(`${titre} — copie mise de côté et modèle prévenu`, ok1);
  return { r, dossier: c.length ? path.join(depot, '.git', 'garde-git', c[0]) : null };
};
const laisse = (titre, command, cwd) => {
  viderCopies(); const r = ggit(command, cwd);
  vrai(`${titre} — rien à garder, rien dit`, r.code === 0 && copies().length === 0 && r.avis === '');
};

laisse('arbre propre : git checkout app.html', 'git checkout app.html');
salir();
const etatAvant = g('status', '--porcelain');
const { r: r1, dossier } = garde('git checkout app.html sur un correctif non commité', 'git checkout app.html');
vrai('   la copie porte le CONTENU du correctif (on peut le récupérer)', dossier && lire(path.join(dossier, 'fichiers', 'app.html')) === CORRECTIF);
vrai('   changements.diff porte la ligne', dossier && /\+le correctif NON COMMITÉ/.test(lire(path.join(dossier, 'changements.diff'))));
vrai('   COMMANDE.txt nomme le geste', dossier && /git checkout app\.html/.test(lire(path.join(dossier, 'COMMANDE.txt'))));
vrai('   l\'avis nomme le fichier et le chemin de la copie', /app\.html/.test(r1.avis) && r1.avis.includes(dossier));
v('   le hook ne touche PAS à l\'arbre de travail', g('status', '--porcelain'), etatAvant);
// la récupération de bout en bout : le geste part, puis on reprend depuis la copie
g('checkout', 'app.html');
v('   (le geste a bien effacé le correctif)', fs.readFileSync(path.join(depot, 'app.html'), 'utf8'), 'version commitée\n');
spawnSync('git', ['apply', path.join(dossier, 'changements.diff')], { cwd: depot });
v('   git apply changements.diff le RAMÈNE', fs.readFileSync(path.join(depot, 'app.html'), 'utf8'), CORRECTIF);

garde('git checkout -- .', 'git checkout -- .');
garde('git checkout HEAD -- app.html', 'git checkout HEAD -- app.html');
garde('git checkout HEAD app.html (sans --)', 'git checkout HEAD app.html');
garde('git checkout -f autre (bascule forcée)', 'git checkout -f autre');
laisse('git checkout autre (bascule simple : git emporte ou refuse, il n\'efface pas)', 'git checkout autre');
laisse('git checkout -b neuve', 'git checkout -b neuve');
laisse('git checkout sous/b.js (fichier propre)', 'git checkout sous/b.js');
garde('git checkout app.html 2>/dev/null (redirection)', 'git checkout app.html 2>/dev/null');
garde('cd <dépôt> && git checkout app.html, lancé d\'ailleurs', `cd ${depot} && git checkout app.html`, ailleurs);
laisse('git checkout app.html, lancé d\'un dossier qui n\'est pas un dépôt', 'git checkout app.html', ailleurs);
garde('git -C <dépôt> checkout app.html', `git -C ${depot} checkout app.html`, ailleurs);
garde('bash -c "git checkout app.html"', 'bash -c "git checkout app.html"');
garde('après d\'autres commandes : node x.js; git checkout app.html', 'node -e 1; git checkout app.html');
garde('git restore app.html', 'git restore app.html');
laisse('git restore --staged app.html (l\'index seulement)', 'git restore --staged app.html');
garde('git restore --staged --worktree app.html', 'git restore --staged --worktree app.html');
garde('git reset --hard', 'git reset --hard');
laisse('git reset --soft HEAD', 'git reset --soft HEAD');
garde('git switch -f autre', 'git switch -f autre');
laisse('git status ; git diff ; git log', 'git status; git diff; git log -1');
laisse('echo "git checkout app.html" (une phrase, pas un geste)', 'echo "git checkout app.html"');
laisse('un heredoc dont une ligne COMMENCE par git checkout (message de commit)', "git commit -F - <<'EOF'\ngit checkout app.html retire la mutation\nEOF");
laisse('   même avec <<- et un terminateur indenté', "cat <<-FIN\n\tgit checkout app.html\n\tFIN");
garde('   mais un geste APRÈS le heredoc est vu', "cat <<'EOF'\ntexte\nEOF\ngit checkout app.html");
laisse('echo \'git checkout app.html\' (guillemets simples)', "echo 'git checkout app.html'");
garde('bash -c \'git checkout app.html\' (guillemets simples)', "bash -c 'git checkout app.html'");
laisse('git stash push -- app.html (met de côté, ne perd rien)', 'git stash push -- app.html');

fs.writeFileSync(path.join(depot, 'banc-neuf.js'), 'un banc pas encore ajouté\n');
const { dossier: dClean } = garde('git clean -fd (un fichier non suivi)', 'git clean -fd');
vrai('   la copie porte le fichier non suivi', dClean && lire(path.join(dClean, 'fichiers', 'banc-neuf.js')) === 'un banc pas encore ajouté\n');
laisse('git clean -nd (essai à blanc)', 'git clean -nd');
fs.rmSync(path.join(depot, 'banc-neuf.js'));

viderCopies();
for (let k = 0; k < 33; k++) {
  const d = path.join(depot, '.git', 'garde-git', '20000101-0000' + String(k).padStart(2, '0') + '-1');
  fs.mkdirSync(d, { recursive: true });
}
ggit('git checkout app.html');
const reste = copies();
v('au-delà de 30 copies, les plus anciennes partent', reste.length, 30);
vrai('   et la plus récente est celle qu\'on vient de faire', !reste[reste.length - 1].startsWith('20000101'));
v('entrée illisible : laisse passer', lancer('garde-git.js', 'pas du json').code, 0);
v('commande sans git : sortie immédiate, rien dit', ggit('ls -la').sortie, '');
fs.rmSync(tmp, { recursive: true, force: true });

/* ── § 3 le branchement ───────────────────────────────────────────────────────────────────────────────────────── */
console.log('§ 3 — .claude/settings.json');
const reglages = JSON.parse(fs.readFileSync(path.join(RACINE, '.claude', 'settings.json'), 'utf8'));
const pre = (reglages.hooks && reglages.hooks.PreToolUse) || [];
const vise = (motif, outil) => new RegExp('^(?:' + motif + ')$').test(outil);
const entreeDe = script => pre.find(e => (e.hooks || []).some(h => (h.command || '').includes(script)));
const eGit = entreeDe('garde-git.js'); const eNav = entreeDe('garde-navigateur.js');
vrai('garde-git est déclarée', eGit);
vrai('   sur l\'outil Bash, et seulement lui', eGit && vise(eGit.matcher, 'Bash') && !vise(eGit.matcher, 'Edit'));
vrai('garde-navigateur est déclarée', eNav);
for (const o of ['new_page', 'navigate_page']) vrai(`   son filtre attrape mcp__chrome-devtools__${o} (« .* » obligatoire : sans lui, comparaison exacte)`, eNav && vise(eNav.matcher, 'mcp__chrome-devtools__' + o));
vrai('   et pas Bash', eNav && !vise(eNav.matcher, 'Bash'));
const demarrage = ((reglages.hooks && reglages.hooks.SessionStart) || []).some(e => (e.hooks || []).some(h => (h.command || '').includes('session-start.sh')));
vrai('session-start.sh est déclaré au démarrage', demarrage);
v('le modèle des sous-agents reste Sonnet (CLAUDE.md : tout en Sonnet)', reglages.env && reglages.env.CLAUDE_CODE_SUBAGENT_MODEL, 'sonnet');
for (const f of ['garde-git.js', 'garde-navigateur.js', 'session-start.sh']) {
  vrai(`${f} existe et s'exécute`, fs.existsSync(path.join(HOOKS, f)) && (fs.statSync(path.join(HOOKS, f)).mode & 0o111));
}

/* ── § 4 session-start.sh ─────────────────────────────────────────────────────────────────────────────────────── */
console.log('§ 4 — session-start.sh');
const sh = path.join(HOOKS, 'session-start.sh');
v('bash -n', spawnSync('bash', ['-n', sh]).status, 0);
const env = { ...process.env }; delete env.CLAUDE_CODE_REMOTE;
const mac = spawnSync('bash', [sh], { encoding: 'utf8', env, timeout: 10000 });
vrai('hors session distante (le Mac) : sort en 0 sans RIEN faire', mac.status === 0 && mac.stdout === '' && mac.stderr === '');
// Il recopie la CI : si `ci.yml` change, ce fichier doit changer avec elle. On lit le CODE des deux côtés.
const code = fs.readFileSync(sh, 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const ci = fs.readFileSync(path.join(RACINE, '.github', 'workflows', 'ci.yml'), 'utf8').split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
const prefixes = [...ci.matchAll(/run:\s*npm ci\b[^\n]*--prefix\s+(\S+)/g)].map(m => m[1]);
vrai('la CI installe au moins server et server-msg (sinon ce contrôle ne regarde rien)', prefixes.includes('server') && prefixes.includes('server-msg'));
for (const p of prefixes) vrai(`   ce que la CI installe (${p}), le démarrage l'installe`, new RegExp('^installer ' + p.replace(/[-]/g, '\\-') + ' ', 'm').test(code));
const vCi = (ci.match(/eslint@([\d.]+)/) || [])[1];
const vSh = (code.match(/eslint@([\d.]+)/) || [])[1];
vrai('   même version d\'ESLint que la CI', vCi && vCi === vSh);
vrai('   même version dans le contrôle « déjà là »', vSh && code.includes(`"v${vSh}"`));
vrai('npm ci, jamais npm install sur un dossier du dépôt (il réécrirait package-lock.json)', /npm ci "\$@"/.test(code) && !/npm install(?! -g)/.test(code));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
