/* ⛔ CE QUE CE FICHIER GARDE — LA STORY INSTAGRAM D'UN ARTICLE PART TOUTE SEULE (2 novembre 2026).

   Justin : « je veux que tu mettes les stories automatiquement quand tu mets les blogs ». `scripts/blog-story.py` fabrique
   `blog/img/<slug>-story.jpg` avant la fusion ; `scripts/instagram-story.js` la publie après la publication du site, par
   l'API Graph de Meta. Ce banc joue le VRAI script contre un faux Meta sur 127.0.0.1 (jamais le vrai) :
     1. chaque article publié a SA story, au format d'une story (JPEG 1080 × 1920) — lu dans l'en-tête du fichier, sans
        Pillow (la vérification de GitHub ne l'a pas) ;
     2. la publication : conteneur `media_type=STORIES` avec l'adresse PUBLIQUE de l'image, attente de « FINISHED », puis
        `media_publish` ; le jeton en EN-TÊTE, jamais dans une adresse ;
     3. ⛔ secrets absents, image pas en ligne, refus de l'API, conteneur en erreur : RIEN ne fait échouer (sortie 0), tout se
        DIT, et le jeton n'apparaît jamais dans ce qui est dit, même quand l'API le répète ;
     4. une image que le site ne sert pas ne part pas ;
     5. le workflow : fabriquer avant la fusion, publier après le site, secrets par `secrets.`, jamais bloquant. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { spawn } = require('child_process');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const RACINE = path.join(__dirname, '..');
const SCRIPT = path.join(RACINE, 'scripts', 'instagram-story.js');
const JETON = 'EAAbancZQXjetonquinesortjamais0123456789';

/* la taille d'un JPEG, lue dans son marqueur SOF */
function tailleJpeg(b) {
  if (b[0] !== 0xFF || b[1] !== 0xD8) return null;
  let i = 2;
  while (i < b.length) {
    if (b[i] !== 0xFF) return null;
    const m = b[i + 1], l = b.readUInt16BE(i + 2);
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)];
    i += 2 + l;
  }
  return null;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'igstory-'));
fs.mkdirSync(path.join(tmp, 'blog', 'img'), { recursive: true });
fs.copyFileSync(path.join(RACINE, 'blog/img/bon-d-intervention-story.jpg'), path.join(tmp, 'blog/img/bon-d-intervention-story.jpg'));

const lancer = env => new Promise(res => {
  const p = spawn(process.execPath, [SCRIPT, 'publier', 'bon-d-intervention'], { env: { PATH: process.env.PATH, BLOG_RACINE: tmp, ...env } });
  let o = ''; p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  p.on('close', code => res({ code, sortie: o }));
});

const etat = { reqs: [], image: 200, modeMedia: 'ok', statut: ['IN_PROGRESS', 'FINISHED'], publies: 0 };
const srv = http.createServer((q, r) => {
  let corps = ''; q.on('data', d => corps += d); q.on('end', () => {
    etat.reqs.push({ m: q.method, url: q.url, h: q.headers, corps });
    const j = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
    if (q.url.startsWith('/blog/img/')) { r.writeHead(etat.image); return r.end('x'); }
    const bon = q.headers.authorization === 'Bearer ' + JETON;
    if (q.url === '/v21/1789/media' && q.method === 'POST') {
      if (!bon) return j(401, { error: { message: 'jeton absent' } });
      if (etat.modeMedia === 'refus') return j(400, { error: { type: 'OAuthException', code: 10, message: 'Application does not have permission (access_token=' + JETON + ')' } });
      return j(200, { id: 'cont42' });
    }
    if (q.url.startsWith('/v21/cont42?fields=status_code')) return j(200, { status_code: etat.statut.length > 1 ? etat.statut.shift() : etat.statut[0] });
    if (q.url === '/v21/1789/media_publish' && q.method === 'POST') { if (!bon) return j(401, {}); etat.publies++; return j(200, { id: 'story777' }); }
    j(404, {});
  });
});

(async () => {
  console.log('1. chaque article publié a sa story, au bon format');
  const arts = JSON.parse(fs.readFileSync(path.join(RACINE, 'contenu/blog/articles.json'), 'utf8'));
  vrai(`(population) ${arts.length} articles publiés`, arts.length >= 7);
  const tailles = arts.map(a => { const f = path.join(RACINE, 'blog/img', a.slug + '-story.jpg'); return fs.existsSync(f) ? tailleJpeg(fs.readFileSync(f)) : null; });
  v('chaque article a blog/img/<slug>-story.jpg en JPEG 1080 × 1920', tailles.map(t => t && t.join('x')), arts.map(() => '1080x1920'));

  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const B = `http://127.0.0.1:${srv.address().port}`;
  const env = { IG_USER_ID: '1789', IG_ACCESS_TOKEN: JETON, IG_API_BASE: B + '/v21', IG_SITE_BASE: B, IG_ATTENTE_S: '0', IG_PRET_S: '2', GITHUB_ACTIONS: 'true' };

  console.log('2. la publication');
  let x = await lancer(env);
  v('sortie 0', x.code, 0);
  vrai('elle se dit publiée', /story de bon-d-intervention publiée \(story777\)/.test(x.sortie));
  v('un seul media_publish', etat.publies, 1);
  const media = etat.reqs.find(q => q.url === '/v21/1789/media');
  const champs = media ? Object.fromEntries(new URLSearchParams(media.corps)) : {};
  v('le conteneur est une STORY, avec l\'adresse PUBLIQUE de l\'image', [champs.media_type, champs.image_url], ['STORIES', B + '/blog/img/bon-d-intervention-story.jpg']);
  vrai('elle attend « FINISHED » avant de publier (deux lectures de l\'état)', etat.reqs.filter(q => q.url.startsWith('/v21/cont42')).length === 2);
  vrai('le jeton voyage en EN-TÊTE, jamais dans une adresse ni dans le corps', etat.reqs.filter(q => q.url.startsWith('/v21')).every(q => q.h.authorization === 'Bearer ' + JETON && !q.url.includes(JETON) && !q.corps.includes(JETON)));
  vrai('le jeton n\'apparaît pas dans ce qui est dit', !x.sortie.includes(JETON));

  console.log('3. rien ne bloque, tout se dit');
  etat.reqs = []; etat.publies = 0;
  x = await lancer({ ...env, IG_ACCESS_TOKEN: '', IG_USER_ID: '' });
  v('sans secrets : sortie 0, et il dit lesquels manquent', [x.code, /il manque IG_USER_ID, IG_ACCESS_TOKEN/.test(x.sortie)], [0, true]);
  v('… sans rien demander à Meta', etat.reqs.filter(q => q.url.startsWith('/v21')).length, 0);

  etat.modeMedia = 'refus';
  x = await lancer(env);
  v('Meta refuse : sortie 0, un avertissement GitHub', [x.code, /::warning::instagram-story : Instagram a refusé/.test(x.sortie)], [0, true]);
  vrai('… et le jeton que l\'API répète est effacé', !x.sortie.includes(JETON) && /access_token=\*\*\*/.test(x.sortie));
  v('… rien publié', etat.publies, 0);
  etat.modeMedia = 'ok';

  etat.statut = ['ERROR'];
  x = await lancer(env);
  v('conteneur en erreur : sortie 0, il le dit, rien publié', [x.code, /n'a pas pu préparer/.test(x.sortie), etat.publies], [0, true, 0]);
  etat.statut = ['IN_PROGRESS'];
  x = await lancer(env);
  v('conteneur jamais prêt : sortie 0, il le dit, rien publié', [x.code, /pas prête à temps/.test(x.sortie), etat.publies], [0, true, 0]);
  etat.statut = ['FINISHED'];

  console.log('4. une image que le site ne sert pas ne part pas');
  etat.image = 404; etat.reqs = [];
  x = await lancer(env);
  v('image absente : sortie 0, « NON publiée », Meta jamais appelé', [x.code, /NON publiée/.test(x.sortie), etat.reqs.filter(q => q.url.startsWith('/v21')).length], [0, true, 0]);
  etat.image = 200;
  fs.rmSync(path.join(tmp, 'blog/img/bon-d-intervention-story.jpg'));
  x = await lancer(env);
  v('story pas fabriquée : sortie 0, il le dit', [x.code, /pas de blog\/img\/bon-d-intervention-story\.jpg/.test(x.sortie)], [0, true]);
  srv.close();

  console.log('5. le workflow');
  const W = fs.readFileSync(path.join(RACINE, '.github/workflows/blog-publication.yml'), 'utf8');
  const iFab = W.indexOf('python3 scripts/blog-story.py'), iFus = W.indexOf('- name: Fusionner'), iSite = W.indexOf('gh workflow run publication-site.yml'), iPub = W.indexOf('node scripts/instagram-story.js publier');
  vrai('la story se fabrique AVANT la fusion (elle part avec l\'article)', iFab > 0 && iFab < iFus);
  vrai('elle se publie APRÈS la publication du site', iPub > iSite && iSite > 0);
  const etape = W.slice(W.lastIndexOf('- name:', iPub));
  vrai('l\'étape de publication ne bloque jamais (continue-on-error)', /continue-on-error:\s*true/.test(etape));
  vrai('les secrets viennent de `secrets.`', /IG_USER_ID:\s*\$\{\{\s*secrets\.IG_USER_ID\s*\}\}/.test(etape) && /IG_ACCESS_TOKEN:\s*\$\{\{\s*secrets\.IG_ACCESS_TOKEN\s*\}\}/.test(etape));
  vrai('ce banc fait partie des bancs du blog du workflow', /for t in [^\n]*\b3236\b/.test(W));
  const GEM = fs.readFileSync(path.join(RACINE, 'scripts/blog-gemini.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  vrai('⛔ un refus de Gemini (quota, clé absente) devient un avertissement GitHub, pas une ligne perdue du journal',
    /const dire = \(t, alerte\) => console\.log\(\(alerte && process\.env\.GITHUB_ACTIONS \? '::warning::'/.test(GEM) &&
    ["photo de couverture refusée", "' refusée (", 'pas de clé GEMINI_API_KEY', 'Gemini injoignable'].every(m => new RegExp("dire\\([^;]*" + m.replace(/[()]/g, '\\$&') + "[^;]*, true\\)").test(GEM)));
  vrai('le mode d\'emploi existe', fs.existsSync(path.join(RACINE, 'contenu/blog/INSTAGRAM-STORIES.md')));

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log(`════ test-3236 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception ' + (e && e.stack || e)); console.log(`════ test-3236 : ${ok} ✓ ${ko + 1} ✗ ════`); process.exit(1); });
