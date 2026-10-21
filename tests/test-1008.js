/* ⛔ CE QUE CE FICHIER GARDE — LE SITE PUBLIC NE SERT QUE LE SITE PUBLIC (17 octobre 2026).

   GitHub Pages servait la RACINE du dépôt : https://teamop.fr/CLAUDE.md, /REPRISE.md,
   /.claude/agents/gardien.md et /firestore.rules répondaient 200 (mesuré ce jour-là). Justin a
   choisi « le dossier public » : `scripts/assembler-site.sh` rassemble une LISTE BLANCHE dans
   `_site`, et `.github/workflows/publication-site.yml` publie ce dossier.

   Ce banc lance le VRAI script dans un dossier temporaire et tient trois choses :
     1. ⛔ rien d'interne n'entre — notes, agents, serveurs, bancs, règles Firestore, outils ;
     2. tout ce qui était servi et doit l'être y est — chaque page de la racine suivie par git
        (une page neuve n'a pas à toucher au script), les dossiers servis, ce que le domaine
        attend (CNAME, robots, assetlinks) ;
     3. ⛔ aucune page ne pointe vers un fichier que le dépôt a et que le site n'a plus. C'est
        la panne que la liste blanche peut créer : un dossier servi oublié rend une page cassée
        chez un client, sans erreur nulle part. Une référence déjà absente du DÉPÔT est un lien
        mort d'avant : comptée et nommée, elle ne fait pas tomber ce banc.
   La résolution suit `<base href>` : les copies d'`apercu/` pointent vers la racine. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { spawnSync } = require('child_process');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINE = path.join(__dirname, '..');
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'site-'));
const SITE = path.join(TMP, '_site');

const r = spawnSync('bash', [path.join(RACINE, 'scripts/assembler-site.sh'), SITE], { encoding: 'utf8' });
v('le script assemble sans erreur', r.status, 0);
if (r.status !== 0) console.log(r.stderr);

const fichiers = [];
(function parcourir(d) {
  if (!fs.existsSync(d)) return;
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    e.isDirectory() ? parcourir(p) : fichiers.push(path.relative(SITE, p));
  }
})(SITE);
vrai('le site assemblé contient des fichiers (population : ' + fichiers.length + ')', fichiers.length > 100);
const existe = rel => fs.existsSync(path.join(SITE, rel));

console.log('\n1. Rien d\'interne');
for (const rel of ['CLAUDE.md', 'REPRISE.md', 'VERSION-STABLE.md', '.claude', '.github', '.githooks', '.mcp.json',
  'skills-lock.json', 'firestore.rules', 'firestore-opmessages.rules', 'storage.rules', 'server', 'server-msg',
  'tests', 'scripts', 'scratchpad', 'design', 'beta-build.js']) {
  v('absent du site : ' + rel, existe(rel), false);
}
v('aucun fichier .md, où qu\'il soit — sauf le jumeau Markdown de l\'accueil, à la racine, nommé (21 octobre 2026, fabriqué par scripts/site-marine.js)', fichiers.filter(f => /\.md$/i.test(f) && f !== 'index.md'), []);
v('…et ce jumeau-là est bien publié (et lui seul parmi les .md)', fichiers.filter(f => /\.md$/i.test(f)), ['index.md']);

console.log('\n2. Tout ce qui se sert');
for (const rel of ['index.html', 'app.html', 'beta.html', 'tour.html', 'espace.html', 'connexion.html', 'tarifs.html',
  'sw.js', 'op-fs.js', 'CNAME', '.nojekyll', 'robots.txt', 'sitemap.xml', 'favicon.ico', 'manifest.webmanifest',
  '.well-known/assetlinks.json']) {
  vrai('présent : ' + rel, existe(rel));
}
for (const d of ['icons', 'vitrine', 'sons', 'screenshots', 'apercu']) {
  vrai('dossier servi : ' + d + '/', fichiers.some(f => f.startsWith(d + '/')));
}
const suivis = spawnSync('git', ['ls-files'], { cwd: RACINE, encoding: 'utf8' });
const pagesRacine = (suivis.stdout || '').split('\n').filter(f => /^[^/]+\.(html|webmanifest)$/.test(f));
vrai('les pages de la racine sont recensées (population : ' + pagesRacine.length + ')', pagesRacine.length > 20);
v('chaque page et manifeste de la racine est publié', pagesRacine.filter(f => !existe(f)), []);

console.log('\n3. Aucune page ne pointe vers un fichier que le site a perdu');
const EXT = /\.(html|js|css|json|png|svg|jpe?g|webp|gif|mp3|wav|ogg|m4a|woff2?|webmanifest|ico|pdf|mp4|webm)$/i;
const perdus = new Map(), deja = new Set();
let references = 0;
for (const f of fichiers) {
  if (!/\.(html|js|css|webmanifest|json)$/.test(f)) continue;
  const t = fs.readFileSync(path.join(SITE, f), 'utf8');
  const base = (/<base\s+href=["']([^"']*)["']/i.exec(t) || [])[1];
  let dir = path.dirname(f);
  if (base !== undefined) {
    const b = base.replace(/^https?:\/\/[^/]+/, '');
    dir = b.startsWith('/') ? path.normalize(b.slice(1) || '.') : path.normalize(path.join(dir, b));   // une base absolue repart de la racine
  }
  const re = /(?:src|href)\s*=\s*["']([^"'#?]+)|url\(\s*["']?([^"')#?]+)|["']([A-Za-z0-9_./-]+\.(?:html|js|css|json|png|svg|jpe?g|webp|gif|mp3|wav|ogg|m4a|woff2?|webmanifest|ico|pdf|mp4|webm))["']/g;
  let m;
  while ((m = re.exec(t))) {
    const ref = (m[1] || m[2] || m[3] || '').trim();
    if (!ref || /^(https?:|\/\/|data:|mailto:|tel:|javascript:|blob:|#)/.test(ref) || /[${}+<>\s]/.test(ref) || !EXT.test(ref)) continue;
    const rel = ref.startsWith('/') ? ref.slice(1) : path.normalize(path.join(dir, ref));
    if (rel.startsWith('..')) continue;
    references++;
    if (existe(rel)) continue;
    if (!fs.existsSync(path.join(RACINE, rel))) { deja.add(rel); continue; }
    if (!perdus.has(rel)) perdus.set(rel, f);
  }
}
vrai('des références ont été lues (population : ' + references + ')', references > 200);
v('aucune référence vers un fichier du dépôt absent du site', [...perdus].map(([rel, f]) => rel + ' ← ' + f), []);
if (deja.size) console.log('  (liens déjà morts dans le dépôt, hors de ce banc : ' + deja.size + ' — ' + [...deja].slice(0, 5).join(', ') + ')');

console.log('\n4. Le workflow publie CE dossier');
const wf = fs.readFileSync(path.join(RACINE, '.github/workflows/publication-site.yml'), 'utf8');
vrai('il lance le script d\'assemblage', /run: bash scripts\/assembler-site\.sh _site/.test(wf));
vrai('il téléverse _site, et seulement lui', /upload-pages-artifact@[^\n]+\n\s+with:\n\s+path: _site\s*$/m.test(wf));
vrai('il vérifie que CLAUDE.md répond 404 après publication', /verifier 404 CLAUDE\.md/.test(wf));

try { fs.rmSync(TMP, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
