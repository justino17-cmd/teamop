#!/usr/bin/env node
'use strict';
/* ══ GARDE GIT — hook PreToolUse de Claude Code, sur l'outil Bash ══════════════════════════════════════════════
 *
 * ⛔ POURQUOI. CLAUDE.md, « COMMITER LE CORRECTIF AVANT DE MUTER » : le `git checkout <fichier>` qui retire une
 * mutation restaure depuis HEAD, et emporte avec elle tout correctif NON COMMITÉ du même fichier, sans un mot. Pris
 * trois fois les 19 et 20 septembre 2026 — dont un commit qui annonçait un correctif et ne contenait que son banc.
 *
 * ⛔ POURQUOI ON NE BLOQUE PAS. La méthode des mutations SE SERT de ce geste : « correctif → banc → git commit →
 * mutation → git checkout ». Au moment du checkout, le fichier porte la mutation — un changement non commité qu'on
 * VEUT jeter. Le hook ne peut pas distinguer une mutation d'un correctif oublié ; il rend donc la perte RÉVERSIBLE :
 * avant que la commande parte, les fichiers qu'elle effacerait sont recopiés dans `.git/garde-git/<horodatage>/`
 * (avec `changements.diff`), et le modèle est prévenu (`additionalContext`). Il ne refuse que si la copie échoue :
 * promettre une sauvegarde qu'on n'a pas faite serait pire que tout.
 *
 * Gestes surveillés : `git checkout` sur des chemins (ou `-f`), `git restore` (arbre de travail), `git reset --hard`,
 * `git switch -f`, `git clean -f`. On suit `cd`, `git -C`, `bash -c`, et on ignore le corps des heredocs (un message
 * de commit qui CITE « git checkout » n'est pas un geste). Toute lecture ratée laisse passer : une garde qui casse
 * le travail ordinaire se fait débrancher, et c'est ainsi qu'on perd un garde-fou.
 * `tests/test-996.js` joue chaque forme, dans un vrai dépôt temporaire.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const GARDER = 30;                     // copies conservées par dépôt — les plus anciennes partent
const PLAFOND = 200 * 1024 * 1024;     // au-delà, on refuse plutôt que de promettre une copie

function git(cwd, args) {
  // LC_ALL=C : `git clean -n` écrit « Would remove », que la langue de la machine traduirait.
  return execFileSync('git', ['-c', 'core.quotepath=off', ...args], {
    cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], env: { ...process.env, LC_ALL: 'C' }, maxBuffer: 64 * 1024 * 1024,
  });
}

/* ── Lire la commande comme le ferait un shell, assez pour trouver les gestes ─────────────────────────────── */

function sansHeredocs(cmd) {
  const out = []; let fin = null;
  for (const l of cmd.split('\n')) {
    if (fin) { if (l.replace(/^\t+/, '') === fin) fin = null; continue; }
    out.push(l);
    const m = l.match(/<<-?\s*(['"]?)([A-Za-z_][\w-]*)\1/);
    if (m) fin = m[2];
  }
  return out.join('\n');
}

function commandes(cmd) {
  const res = []; let mots = []; let mot = ''; let dansMot = false;
  const finMot = () => { if (dansMot) mots.push(mot); mot = ''; dansMot = false; };
  const finCmd = () => { finMot(); if (mots.length) res.push(mots); mots = []; };
  for (let i = 0; i < cmd.length; i++) {
    const c = cmd[i];
    if (c === "'") {
      const j = cmd.indexOf("'", i + 1);
      mot += j < 0 ? cmd.slice(i + 1) : cmd.slice(i + 1, j); i = j < 0 ? cmd.length : j; dansMot = true; continue;
    }
    if (c === '"') {
      let j = i + 1;
      while (j < cmd.length && cmd[j] !== '"') {
        if (cmd[j] === '\\' && j + 1 < cmd.length) { mot += cmd[j + 1]; j += 2; continue; }
        mot += cmd[j]; j++;
      }
      i = j; dansMot = true; continue;
    }
    if (c === '\\') { if (i + 1 < cmd.length && cmd[i + 1] !== '\n') mot += cmd[i + 1]; i++; dansMot = true; continue; }
    if (c === '#' && !dansMot) { const j = cmd.indexOf('\n', i); i = j < 0 ? cmd.length : j - 1; continue; }
    if (c === ' ' || c === '\t') { finMot(); continue; }
    if (c === '$' && cmd[i + 1] === '(') { finCmd(); i++; continue; }
    if ('\n;&|()`'.includes(c)) { finCmd(); continue; }
    if (c === '<' || c === '>') {
      // `2>/dev/null`, `2>&1` : le numéro de canal et la cible ne sont pas des arguments de la commande.
      if (dansMot && /^\d+$/.test(mot)) { mot = ''; dansMot = false; } else finMot();
      while (i + 1 < cmd.length && '<>&'.includes(cmd[i + 1])) i++;
      mots.push('\u0000redir'); continue;
    }
    mot += c; dansMot = true;
  }
  finCmd();
  return res.map(m => m.filter((x, k) => x !== '\u0000redir' && m[k - 1] !== '\u0000redir')).filter(m => m.length);
}

function parcourir(cmd, cwd, trouvailles, profondeur) {
  for (const mots of commandes(sansHeredocs(cmd))) cwd = analyser(mots, cwd, trouvailles, profondeur);
}

function analyser(mots, cwd, trouvailles, profondeur) {
  let i = 0;
  for (;;) {                                         // affectations et enveloppes devant la vraie commande
    if (i >= mots.length) return cwd;
    const m = mots[i];
    if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(m)) { i++; continue; }
    if (['sudo', 'command', 'nice', 'nohup', 'time', 'exec', 'builtin'].includes(m)) {
      i++; while (mots[i] && mots[i].startsWith('-')) i++; continue;
    }
    if (m === 'env') { i++; while (mots[i] && (mots[i].startsWith('-') || /^[A-Za-z_]\w*=/.test(mots[i]))) i++; continue; }
    if (m === 'timeout') { i++; while (mots[i] && mots[i].startsWith('-')) { if (/^-[sk]$/.test(mots[i])) i++; i++; } i++; continue; }
    break;
  }
  const nom = path.basename(mots[i]);
  const args = mots.slice(i + 1);
  if (nom === 'cd' || nom === 'pushd') {
    const d = args[0];
    if (!d || d === '~') return os.homedir();
    if (d === '-') return cwd;
    return path.resolve(cwd, d.replace(/^~(?=\/)/, os.homedir()));
  }
  if (['bash', 'sh', 'zsh'].includes(nom) && profondeur < 3) {
    const k = args.findIndex(a => /^-[a-z]*c[a-z]*$/.test(a));
    if (k >= 0 && args[k + 1]) parcourir(args[k + 1], cwd, trouvailles, profondeur + 1);
    return cwd;
  }
  if (nom === 'git') gestesGit(args, cwd, trouvailles, mots.slice(i).join(' '));
  return cwd;
}

function decouper(args, avecValeur) {
  const opts = new Set(); const avant = []; const apres = []; let tiret = false;
  for (let k = 0; k < args.length; k++) {
    const a = args[k];
    if (tiret) { apres.push(a); continue; }
    if (a === '--') { tiret = true; continue; }
    if (a.startsWith('--')) { const n = a.split('=')[0]; opts.add(n); if (!a.includes('=') && avecValeur.has(n)) k++; continue; }
    if (a.startsWith('-') && a.length > 1) {
      if (avecValeur.has(a)) { opts.add(a); k++; continue; }
      if (avecValeur.has(a.slice(0, 2))) { opts.add(a.slice(0, 2)); continue; }     // `-bnom`
      for (const ch of a.slice(1)) opts.add('-' + ch);                                  // `-fq` = `-f -q`
      continue;
    }
    avant.push(a);
  }
  return { opts, avant, apres, tiret };
}

function estArbre(cwd, s) {
  if (s === '-' || /^@\{-\d+\}$/.test(s)) return true;
  try { git(cwd, ['rev-parse', '--verify', '--quiet', '--end-of-options', s + '^{tree}']); return true; } catch { return false; }
}

function gestesGit(args, cwd, trouvailles, texte) {
  let i = 0;
  while (i < args.length && args[i].startsWith('-')) {
    const a = args[i];
    if (a === '-C') { cwd = path.resolve(cwd, args[i + 1] || '.'); i += 2; continue; }
    if (['-c', '--git-dir', '--work-tree', '--namespace', '--config-env'].includes(a)) { i += 2; continue; }
    i++;
  }
  const sous = args[i]; const reste = args.slice(i + 1);
  const tout = [':/'];
  if (sous === 'checkout') {
    const { opts, avant, apres, tiret } = decouper(reste, new Set(['-b', '-B', '--orphan', '--pathspec-from-file']));
    if (opts.has('-p') || opts.has('--patch')) return;
    const creation = opts.has('-b') || opts.has('-B') || opts.has('--orphan');
    let chemins = [];
    if (tiret) chemins = apres;
    else if (avant.length) chemins = estArbre(cwd, avant[0]) ? avant.slice(1) : avant;
    if (opts.has('--pathspec-from-file')) chemins = tout;
    if (chemins.length && !creation) trouvailles.push({ texte, cwd, mode: 'suivis', chemins });
    else if (opts.has('-f') || opts.has('--force')) trouvailles.push({ texte, cwd, mode: 'suivis', chemins: tout });
  } else if (sous === 'restore') {
    const { opts, avant, apres } = decouper(reste, new Set(['-s', '--source', '--pathspec-from-file']));
    const index = opts.has('-S') || opts.has('--staged'); const arbre = opts.has('-W') || opts.has('--worktree');
    if (index && !arbre) return;                                     // ne touche que l'index : rien ne se perd
    const chemins = opts.has('--pathspec-from-file') ? tout : [...avant, ...apres];
    if (chemins.length) trouvailles.push({ texte, cwd, mode: 'suivis', chemins });
  } else if (sous === 'reset') {
    if (decouper(reste, new Set()).opts.has('--hard')) trouvailles.push({ texte, cwd, mode: 'suivis', chemins: tout });
  } else if (sous === 'switch') {
    const { opts } = decouper(reste, new Set(['-c', '-C', '--orphan']));
    if (opts.has('-f') || opts.has('--force') || opts.has('--discard-changes')) trouvailles.push({ texte, cwd, mode: 'suivis', chemins: tout });
  } else if (sous === 'clean') {
    const { opts } = decouper(reste, new Set(['-e', '--exclude']));
    if ((opts.has('-f') || opts.has('--force')) && !opts.has('-n') && !opts.has('--dry-run')) trouvailles.push({ texte, cwd, mode: 'clean', args: reste });
  }
}

/* ── Ce que la commande effacerait ───────────────────────────────────────────────────────────────────────── */

function menaces(t) {
  const top = git(t.cwd, ['rev-parse', '--show-toplevel']).trim();
  const gitdir = git(t.cwd, ['rev-parse', '--absolute-git-dir']).trim();
  const fichiers = [];
  if (t.mode === 'suivis') {
    const parts = git(t.cwd, ['status', '--porcelain=v1', '-z', '--untracked-files=no', '--', ...t.chemins]).split('\0');
    for (let k = 0; k < parts.length; k++) {
      const e = parts[k]; if (e.length < 4) continue;
      if (e[0] === 'R' || e[0] === 'C') k++;                         // le nom d'origine suit un renommage
      fichiers.push(e.slice(3));
    }
  } else {
    const essai = [];
    for (const a of t.args) {
      if (a === '--force') continue;
      if (/^-[a-zA-Z]+$/.test(a)) { const r = a.replace(/f/g, ''); if (r !== '-') essai.push(r); continue; }
      essai.push(a);
    }
    for (const l of git(t.cwd, ['clean', '-n', ...essai]).split('\n')) {
      const m = l.match(/^Would remove (.+)$/);
      if (m) fichiers.push(path.relative(top, path.resolve(t.cwd, m[1])));
    }
  }
  return { top, gitdir, fichiers };
}

function taille(p) {
  let st; try { st = fs.lstatSync(p); } catch { return 0; }
  if (!st.isDirectory()) return st.size;
  return fs.readdirSync(p).reduce((s, n) => s + taille(path.join(p, n)), 0);
}

function mettreDeCote(m, textes) {
  const total = m.fichiers.reduce((s, f) => s + taille(path.join(m.top, f)), 0);
  if (total > PLAFOND) throw new Error(`${Math.round(total / 1048576)} Mo à recopier, plafond ${PLAFOND / 1048576} Mo`);
  const racine = path.join(m.gitdir, 'garde-git');
  const nom = new Date().toISOString().replace(/[-:]/g, '').replace('T', '-').slice(0, 15) + '-' + process.pid;
  const dest = path.join(racine, nom);
  fs.mkdirSync(path.join(dest, 'fichiers'), { recursive: true });
  for (const f of m.fichiers) {
    const src = path.join(m.top, f);
    if (!fs.existsSync(src)) continue;                                 // supprimé : c'est le diff qui le garde
    fs.cpSync(src, path.join(dest, 'fichiers', f), { recursive: true });
  }
  let diff = '';
  try { diff = git(m.top, ['diff', 'HEAD', '--binary', '--', ...m.fichiers.map(f => ':/' + f)]); } catch { /* dépôt sans commit */ }
  fs.writeFileSync(path.join(dest, 'changements.diff'), diff);
  fs.writeFileSync(path.join(dest, 'COMMANDE.txt'), textes.join('\n') + '\n\n' + m.fichiers.join('\n') + '\n');
  const anciennes = fs.readdirSync(racine).sort();
  for (const n of anciennes.slice(0, Math.max(0, anciennes.length - GARDER))) fs.rmSync(path.join(racine, n), { recursive: true, force: true });
  return dest;
}

/* ── Hook ────────────────────────────────────────────────────────────────────────────────────────────────── */

let brut = '';
process.stdin.on('data', d => { brut += d; });
process.stdin.on('end', () => {
  let entree;
  try { entree = JSON.parse(brut); } catch { process.exit(0); }
  const cmd = entree && entree.tool_input && entree.tool_input.command;
  if (typeof cmd !== 'string' || !/\bgit\b/.test(cmd)) process.exit(0);

  const trouvailles = [];
  try { parcourir(cmd, entree.cwd || process.cwd(), trouvailles, 0); } catch { process.exit(0); }

  const parDepot = new Map();
  for (const t of trouvailles) {
    let m; try { m = menaces(t); } catch { continue; }               // pas un dépôt git : rien à garder
    if (!m.fichiers.length) continue;
    const d = parDepot.get(m.top) || { ...m, fichiers: [], textes: [] };
    for (const f of m.fichiers) if (!d.fichiers.includes(f)) d.fichiers.push(f);
    d.textes.push(t.texte);
    parDepot.set(m.top, d);
  }
  if (!parDepot.size) process.exit(0);

  const avis = [];
  for (const d of parDepot.values()) {
    const liste = d.fichiers.slice(0, 8).join(', ') + (d.fichiers.length > 8 ? ` (+${d.fichiers.length - 8})` : '');
    let dest;
    try { dest = mettreDeCote(d, d.textes); } catch (e) {
      process.stderr.write(`⛔ garde-git : « ${d.textes.join(' ; ')} » effacerait des changements NON COMMITÉS (${liste}), ` +
        `et la copie de sauvegarde a échoué (${e.message}). Commite d'abord, ou mets-les de côté : git stash push -- <fichiers>.\n`);
      process.exit(2);
    }
    avis.push(`⚠️ garde-git : « ${d.textes.join(' ; ')} » efface des changements NON COMMITÉS dans ${d.fichiers.length} fichier(s) : ${liste}. ` +
      `Copie mise de côté AVANT : ${dest} (fichiers/ + changements.diff). Si c'était une mutation qu'on retire, rien à faire. ` +
      `Si un correctif non commité était dedans, le reprendre depuis cette copie et le commiter avant la prochaine mutation ` +
      `(CLAUDE.md : correctif → banc → git commit → mutation → git checkout).`);
  }
  process.stdout.write(JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', additionalContext: avis.join('\n') } }));
  process.exit(0);
});
