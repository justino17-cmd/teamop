/* ⛔ CE QUE CE FICHIER GARDE — LE BLOG SE PUBLIE SEUL, IMAGES PAR GEMINI (26 octobre 2026).

   Justin : « je veux que les publications soient automatiques et que les images soient gérées avec Gemini ».
   `.github/workflows/blog-publication.yml` termine la demande de fusion d'un article : `scripts/blog-gemini.js` fait
   dessiner la photo de couverture et les images du texte, `scripts/blog-images.py` les pose, les bancs du blog
   repassent, puis la demande est fusionnée et le site publié. Ce banc tient :
     1. le choix du modèle d'image (le plus récent « flash », jamais Imagen ni un modèle de texte) ;
     2. le VRAI script contre un faux Gemini sur 127.0.0.1 : la clé dans l'en-tête et jamais dans une adresse ni dans
        la sortie, les consignes fixes dans chaque demande (fictif, bleu marine, ni texte ni logo), le format 4:5 pour
        la couverture et 16:9 pour le texte, l'essai sans format quand le modèle refuse le format ;
     3. ⛔ un échec ne laisse RIEN de laid en ligne : sans clé, Gemini en panne ou une image refusée, la figure en
        attente est retirée du texte, son image d'attente supprimée, et le script sort en 0 (l'article part quand même) ;
     4. le workflow : réservé aux branches `claude/blog-*` du dépôt, refuse une demande qui touche autre chose que le
        blog, installe Pillow AVANT de poser les images, passe les bancs APRÈS les images et AVANT la fusion, demande la
        publication du site (une fusion par GITHUB_TOKEN ne déclenche rien sur `main`), et ne cite la clé que par le secret.
   La conversion en WebP (Pillow) se joue dans le workflow sur l'article réel ; sa preuve locale est
   `scratchpad/sonde-blog-images.sh` (citée dans REPRISE.md). */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http'), zlib = require('zlib');
const { spawnSync, spawn } = require('child_process');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const RACINE = path.join(__dirname, '..');
const G = require('../scripts/blog-gemini.js');
const CLE = 'cle-banc-3060-ZZZZ-jamais-affichee';

/* un vrai PNG 4 × 4 (les octets que Gemini renverrait) */
function png() {
  const crc = b => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; }
    let x = 0xffffffff; for (const o of b) x = t[(x ^ o) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const bloc = (type, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(type), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.from([0, 0, 0, 4, 0, 0, 0, 4, 8, 2, 0, 0, 0]);
  const lignes = Buffer.concat(Array.from({ length: 4 }, () => Buffer.from([0, 30, 60, 120, 30, 60, 120, 30, 60, 120, 30, 60, 120])));
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), bloc('IHDR', ihdr), bloc('IDAT', zlib.deflateSync(lignes)), bloc('IEND', Buffer.alloc(0))]);
}
const PNG = png();

console.log('1. le modèle d\'image');
v('le « flash » le plus récent', G.choisirModele([
  { name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/imagen-4.0-generate', supportedGenerationMethods: ['predict'] },
  { name: 'models/gemini-2.5-flash-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.5-pro-image', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/gemini-3.1-flash-image-preview', supportedGenerationMethods: ['generateContent'] }
]), 'gemini-3.1-flash-image');
v('aucun modèle d\'image → null (jamais un modèle de texte)', G.choisirModele([{ name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] }]), null);
v('Imagen écarté (il ne parle pas generateContent)', G.choisirModele([{ name: 'models/imagen-4.0-image', supportedGenerationMethods: ['generateContent'] }]), null);
v('figures en attente lues avec leur description', G.figuresEnAttente('<p>a</p><figure><img src="/blog/img/x.webp" data-gemini="un camion &quot;bleu&quot;" alt="x"></figure><figure><img src="/blog/img/y.webp" alt="y"></figure>')
  .map(f => [f.src, f.description]), [['/blog/img/x.webp', 'un camion "bleu"']]);

/* un dossier jetable qui a la forme du dépôt */
function bac() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'blog3060-'));
  fs.mkdirSync(path.join(r, 'contenu', 'blog'), { recursive: true });
  fs.mkdirSync(path.join(r, 'blog', 'img'), { recursive: true });
  fs.writeFileSync(path.join(r, 'contenu', 'blog', 'articles.json'), JSON.stringify([{ slug: 'essai-gemini', titre: 'Planning des techniciens : le guide', description: 'd', date: '2026-10-27', image: 'essai-gemini-couverture.webp', imageAlt: 'a' }]));
  fs.writeFileSync(path.join(r, 'contenu', 'blog', 'essai-gemini.htm'),
    '<p>Intro.</p>\n<figure><img alt="Une technicienne règle un planning" data-gemini="a technician planning her week on a tablet" decoding="async" height="675" loading="lazy" src="/blog/img/essai-planning.webp" width="1200"/></figure>\n' +
    '<p>Milieu.</p>\n<figure><img alt="Un camion" data-gemini="ECHEC a van parked" height="675" src="/blog/img/essai-camion.webp" width="1200"/></figure>\n<p>Fin.</p>\n');
  for (const f of ['essai-planning.webp', 'essai-camion.webp']) fs.writeFileSync(path.join(r, 'blog', 'img', f), 'attente');
  return r;
}

/* le faux Gemini : il note chaque requête ; « 4:5 » refusé une fois pour jouer l'essai sans format */
function fauxGemini() {
  const vu = [];
  let refusFormat = true;
  const s = http.createServer((q, r) => {
    let corps = ''; q.on('data', d => { corps += d; }); q.on('end', () => {
      const j = corps ? JSON.parse(corps) : null;
      vu.push({ url: q.url, cle: q.headers['x-goog-api-key'], j });
      const rep = (code, o) => { r.writeHead(code, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
      if (q.method === 'GET' && q.url.startsWith('/models')) return rep(200, { models: [
        { name: 'models/gemini-3.7-flash', supportedGenerationMethods: ['generateContent'] },
        { name: 'models/gemini-3.1-flash-image', supportedGenerationMethods: ['generateContent'] }] });
      const texte = j.contents[0].parts[0].text, cfg = j.generationConfig || {};
      if (texte.includes('ECHEC')) return rep(500, { error: { message: 'panne simulée' } });
      if (cfg.imageConfig && cfg.imageConfig.aspectRatio === '4:5' && refusFormat) { refusFormat = false; return rep(400, { error: { message: 'aspect ratio non pris en charge' } }); }
      rep(200, { candidates: [{ content: { parts: [{ text: 'voici' }, { inlineData: { mimeType: 'image/png', data: PNG.toString('base64') } }] } }] });
    });
  });
  return new Promise(res => s.listen(0, '127.0.0.1', () => res({ s, vu, base: 'http://127.0.0.1:' + s.address().port })));
}

function lancer(r, env) {
  return new Promise(res => {
    const p = spawn(process.execPath, [path.join(RACINE, 'scripts', 'blog-gemini.js'), 'essai-gemini', path.join(r, 'travail')],
      { env: Object.assign({}, process.env, { BLOG_RACINE: r, GEMINI_MODELE_IMAGE: '' }, env) });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    p.on('close', code => res({ code, sortie }));
  });
}
const lireFrag = r => fs.readFileSync(path.join(r, 'contenu', 'blog', 'essai-gemini.htm'), 'utf8');
const man = r => JSON.parse(fs.readFileSync(path.join(r, 'travail', 'manifeste.json'), 'utf8'));

(async () => {
  console.log('2. le vrai script contre un faux Gemini');
  const F = await fauxGemini();
  const r = bac();
  const x = await lancer(r, { GEMINI_API_KEY: CLE, GEMINI_BASE: F.base });
  v('le script sort en 0', x.code, 0);
  vrai('population : des requêtes ont été faites (' + F.vu.length + ')', F.vu.length >= 4);
  vrai('la clé voyage dans l\'en-tête x-goog-api-key, à chaque requête', F.vu.every(q => q.cle === CLE));
  vrai('⛔ la clé n\'est dans AUCUNE adresse', F.vu.every(q => !q.url.includes(CLE)));
  vrai('⛔ la clé n\'apparaît pas dans la sortie', !x.sortie.includes(CLE));
  const dessins = F.vu.filter(q => q.j);
  vrai('chaque demande d\'image porte les consignes fixes (fictif, bleu marine, ni texte ni logo)',
    dessins.length >= 3 && dessins.every(q => q.j.contents[0].parts[0].text.startsWith(G.CONSIGNES) && /navy blue/.test(G.CONSIGNES) && /no text/i.test(G.CONSIGNES) && /fictional/.test(G.CONSIGNES)));
  vrai('le modèle d\'image choisi par la liste (pas le modèle de texte)', dessins.every(q => q.url.includes('gemini-3.1-flash-image:generateContent')));
  vrai('la couverture est demandée en 4:5, puis SANS format quand le modèle refuse', dessins[0].j.generationConfig.imageConfig.aspectRatio === '4:5' && !dessins[1].j.generationConfig.imageConfig);
  vrai('la couverture parle du sujet de l\'article', dessins[0].j.contents[0].parts[0].text.includes('Planning des techniciens'));
  vrai('la figure est demandée en 16:9, avec sa description', dessins.some(q => q.j.generationConfig.imageConfig && q.j.generationConfig.imageConfig.aspectRatio === '16:9' && q.j.contents[0].parts[0].text.includes('planning her week')));
  const photo = path.join(r, 'contenu', 'blog', 'photos', 'essai-gemini.png');
  vrai('la photo de couverture est rangée HORS du site (contenu/blog/photos/), octets de Gemini', fs.existsSync(photo) && fs.readFileSync(photo).equals(PNG));
  const f = lireFrag(r);
  vrai('la figure dessinée garde son bloc, sans l\'attribut data-gemini', f.includes('src="/blog/img/essai-planning.webp"') && !/data-gemini/.test(f));
  vrai('⛔ la figure refusée par Gemini est RETIRÉE du texte', !f.includes('essai-camion'));
  vrai('⛔ et son image d\'attente est supprimée', !fs.existsSync(path.join(r, 'blog', 'img', 'essai-camion.webp')));
  vrai('le texte autour reste intact', /Intro\.[\s\S]*Milieu\.[\s\S]*Fin\./.test(f));
  const m = man(r);
  v('le manifeste : la couverture, la figure à poser, la figure retirée', [!!m.couverture, m.figures.map(z => z.src), m.retirees], [true, ['/blog/img/essai-planning.webp'], ['/blog/img/essai-camion.webp']]);
  vrai('la figure brute est bien l\'image de Gemini', fs.readFileSync(m.figures[0].brut).equals(PNG));

  console.log('3. relancé : rien n\'est redemandé');
  const avant = F.vu.length;
  const x2 = await lancer(r, { GEMINI_API_KEY: CLE, GEMINI_BASE: F.base });
  v('deuxième passage : aucune requête (photo déjà là, plus de figure en attente)', [x2.code, F.vu.length - avant], [0, 0]);
  F.s.close();

  console.log('4. sans clé, et Gemini en panne : l\'article part quand même, sans rien de laid');
  const r2 = bac();
  const y = await lancer(r2, { GEMINI_API_KEY: '', GEMINI_BASE: 'http://127.0.0.1:9' });
  v('sans clé : sort en 0', y.code, 0);
  vrai('sans clé : les deux figures en attente sont retirées, leurs images d\'attente aussi', !/<figure/.test(lireFrag(r2)) && !fs.existsSync(path.join(r2, 'blog', 'img', 'essai-planning.webp')));
  vrai('sans clé : pas de photo de couverture', !fs.existsSync(path.join(r2, 'contenu', 'blog', 'photos')));
  const r3 = bac();
  const z = await lancer(r3, { GEMINI_API_KEY: CLE, GEMINI_BASE: 'http://127.0.0.1:9', GEMINI_DELAI_MS: '3000' });
  v('Gemini injoignable : sort en 0', z.code, 0);
  vrai('Gemini injoignable : figures retirées, et il le dit', !/<figure/.test(lireFrag(r3)) && /injoignable/.test(z.sortie));
  vrai('⛔ Gemini injoignable : la clé n\'apparaît pas dans la sortie', !z.sortie.includes(CLE));

  console.log('5. le workflow');
  const W = fs.readFileSync(path.join(RACINE, '.github', 'workflows', 'blog-publication.yml'), 'utf8');
  const code = W.replace(/^\s*#.*$/gm, '');
  vrai('déclenché par une demande de fusion vers main', /pull_request:[\s\S]*branches: \[main\]/.test(code));
  vrai('⛔ réservé aux branches claude/blog-* DE CE DÉPÔT', /if: startsWith\(github\.head_ref, 'claude\/blog-'\) && github\.event\.pull_request\.head\.repo\.full_name == github\.repository/.test(code));
  const i = s => code.indexOf(s);
  vrai('⛔ refuse une demande qui touche autre chose que blog/, contenu/blog/, sitemap.xml', /grep -vE '\^\(blog\/\|contenu\/blog\/\|sitemap\\\.xml\$\)'/.test(code) && /exit 1/.test(code.slice(i('La demande ne touche'), i('Les articles neufs'))));
  vrai('Pillow est installé AVANT de poser les images', i('pip install --quiet pillow') > 0 && i('pip install --quiet pillow') < i('python3 scripts/blog-images.py'));
  vrai('les images avant les pages, les pages avant les bancs, les bancs avant la fusion, la fusion avant la publication',
    i('node scripts/blog-gemini.js') < i('node scripts/blog.js') && i('node scripts/blog.js') < i('for t in 3000 835 846 1008 3060') &&
    i('for t in 3000 835 846 1008 3060') < i('gh pr merge') && i('gh pr merge') < i('gh workflow run publication-site.yml'));
  vrai('un banc qui tombe arrête tout (exit 1 dans la boucle des bancs)', /tests\/test-\$t\.js[^\n]*\|\| \{[^}]*exit 1; \}/.test(code));
  vrai('⛔ la clé ne vient QUE du secret GEMINI_API_KEY, passée en variable d\'environnement', /GEMINI_API_KEY: \$\{\{ secrets\.GEMINI_API_KEY \}\}/.test(code) && (code.match(/secrets\.GEMINI_API_KEY/g) || []).length === 1 && !/(echo|cat|printf)[^\n]*GEMINI_API_KEY/.test(code));
  vrai('on n\'ajoute au commit que le blog et le plan du site', /git add blog contenu\/blog sitemap\.xml/.test(code) && !/git add -A|git add \./.test(code));
  vrai('la fusion vise la tête qu\'on a éprouvée (--match-head-commit)', /--match-head-commit "\$tete"/.test(code));
  vrai('si la fusion attend des vérifications, on attend qu\'elle ait eu lieu avant de publier', /--auto[\s\S]*MERGED[\s\S]*gh workflow run/.test(code));
  vrai('publication-site.yml accepte bien un lancement à la demande', /workflow_dispatch:/.test(fs.readFileSync(path.join(RACINE, '.github', 'workflows', 'publication-site.yml'), 'utf8')));
  vrai('la clé n\'est écrite en clair nulle part dans le dépôt de ce banc', !fs.readFileSync(path.join(RACINE, 'scripts', 'blog-gemini.js'), 'utf8').includes('AIza'));

  console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
