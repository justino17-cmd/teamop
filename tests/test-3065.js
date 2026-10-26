/* ⛔ CE QUE CE FICHIER GARDE — LES POSTS DE LA FICHE GOOGLE SE FONT SEULS (26 octobre 2026).

   Justin : les « posts » de la fiche Google Business Profile « TEAM OP » doivent partir tout seuls, comme le blog.
   `scripts/google-post.js` rédige le post à partir de l'article (sans modèle) puis le publie par l'API
   (mybusiness.googleapis.com/v4, localPosts) ; `.github/workflows/blog-publication.yml` le prépare AVANT la fusion et le
   publie APRÈS la publication du site. Ce banc joue le VRAI script contre un faux Google sur 127.0.0.1 (jamais le vrai) :
     1. la rédaction : longueur, lien ?de=google, bouton LEARN_MORE, ni téléphone, ni formule creuse, ni tutoiement, aucun
        prix hors de la grille 15 / 25 / 50 € — sur les vrais articles ET sur un article piégé ;
     2. `verifierPost` mord sur chaque règle (un post fautif écrit à la main est refusé) ;
     3. la publication : le jeton d'accès voyage en EN-TÊTE, jamais dans une adresse ; les secrets sont dans le corps du
        jeton et nulle part ailleurs ; rien n'est publié deux fois (marque `publie`, ET relecture des posts de la fiche
        quand la marque manque) ;
     4. ⛔ l'absence de secrets, une erreur du jeton ou de l'API ne font JAMAIS échouer le workflow (sortie 0) mais se
        DISENT — et aucun secret ni jeton n'apparaît dans ce qui est dit, même quand l'API les répète ;
     5. image absente en ligne → publié sans image ; 6. le workflow : préparer avant la fusion, publier après le site,
        secrets par `secrets.`, jamais bloquant. */
'use strict';
const fs = require('fs'), path = require('path'), os = require('os'), http = require('http');
const { spawn } = require('child_process');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const RACINE = path.join(__dirname, '..');
const SCRIPT = path.join(RACINE, 'scripts', 'google-post.js');
const G = require(SCRIPT);

const S = { id: 'idclient-ZQX-9911', clisec: 'cs-banc-ZQX-secretclient', refresh: 'rt-banc-ZQX-jamais-affiche', acces: 'at-banc-ZQX-court-de-vie', compte: '424242', fiche: '3113104183760997296' };
const TOUS = [S.id, S.clisec, S.refresh, S.acces];

/* ---------- la racine de banc : de vrais articles, une vraie couverture ---------- */
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'gpost-'));
const R = n => path.join(tmp, n);
fs.mkdirSync(R('contenu/blog/posts-google'), { recursive: true }); fs.mkdirSync(R('blog/img'), { recursive: true });
const arts = JSON.parse(fs.readFileSync(path.join(RACINE, 'contenu/blog/articles.json'), 'utf8'));
const piege = { slug: 'piege-test', titre: 'Suivre ses interventions sans ressaisie', date: '2026-10-26', image: arts[0].image, imageAlt: 'x',
  description: 'Tu peux gagner 1 200 € par mois, n’hésitez pas. Un outil pour suivre vos interventions sans ressaisie. Offre garantie gratuite.', faq: [] };
fs.writeFileSync(R('contenu/blog/articles.json'), JSON.stringify([...arts, piege]));
for (const a of arts) { fs.copyFileSync(path.join(RACINE, 'contenu/blog', a.slug + '.htm'), R('contenu/blog/' + a.slug + '.htm')); fs.copyFileSync(path.join(RACINE, 'blog/img', a.image), R('blog/img/' + a.image)); }
fs.writeFileSync(R('contenu/blog/piege-test.htm'), '<p>x</p><h2 id="en-bref">En bref</h2><ul><li>Le devis coûte 120 € TTC à la visite.</li><li>Appelez-nous au 01 23 45 67 89 pour un devis.</li><li>Notre ligne directe : 06 12 34 56 78.</li><li>Tu verras, ton planning se remplit seul.</li><li>Un technicien voit sa journée sur son téléphone, avec les fiches et les photos du client.</li></ul>');

const lancer = (args, env, cwd) => new Promise(res => {
  const p = spawn(process.execPath, [SCRIPT, ...args], { env: { PATH: process.env.PATH, BLOG_RACINE: tmp, ...env }, cwd: cwd || tmp });
  let o = ''; p.stdout.on('data', d => o += d); p.stderr.on('data', d => o += d);
  p.on('close', code => res({ code, sortie: o }));
});
const lirePost = s => JSON.parse(fs.readFileSync(R('contenu/blog/posts-google/' + s + '.json'), 'utf8'));

/* ---------- un faux Google : jeton, liste et création de posts, et le site ---------- */
const etat = { reqs: [], posts: [], modeToken: 'ok', modePost: 'ok', site: 200, image: 200 };
const srv = http.createServer((q, r) => {
  let corps = ''; q.on('data', d => corps += d); q.on('end', () => {
    etat.reqs.push({ m: q.method, url: q.url, h: q.headers, corps });
    const j = (c, o) => { r.writeHead(c, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
    if (q.url === '/token') {
      if (etat.modeToken === 'refus') return j(400, { error: 'invalid_grant', error_description: 'Token has been expired or revoked ' + S.refresh });
      return j(200, { access_token: S.acces, expires_in: 3599, token_type: 'Bearer' });
    }
    const base = `/v4/accounts/${S.compte}/locations/${S.fiche}/localPosts`;
    if (q.url.startsWith(base) && q.method === 'GET') return j(200, { localPosts: etat.posts });
    if (q.url === base && q.method === 'POST') {
      if (q.headers.authorization !== 'Bearer ' + S.acces) return j(401, { error: { status: 'UNAUTHENTICATED', message: 'no' } });
      if (etat.modePost === 'refus') return j(403, { error: { status: 'PERMISSION_DENIED', message: 'Quota 0 pour le projet ; ' + q.headers.authorization + ' client ' + S.clisec + ' ' + S.id } });
      const p = JSON.parse(corps), nom = `accounts/${S.compte}/locations/${S.fiche}/localPosts/n${etat.posts.length + 1}`;
      etat.posts.push({ ...p, name: nom, state: 'LIVE' });
      return j(200, { ...p, name: nom, state: 'LIVE' });
    }
    if (/^\/blog\/img\//.test(q.url)) { r.writeHead(etat.image); return r.end('x'); }
    if (/^\/blog\/.*\.html$/.test(q.url)) { r.writeHead(etat.site); return r.end('x'); }
    j(404, {});
  });
});

(async () => {
  console.log('0. nettoyer() efface aussi les FORMES réelles des jetons Google (construites ici à l\'exécution)');
  const formes = ['ya' + '29.abcDEF-123_xyz', '1/' + '/0gAbCdEfGhIjKlMn-opQ', 'GOC' + 'SPX-AbCdEf123_-xyz'];
  vrai('jeton d\'accès, refresh token et secret client réels : effacés d\'un message d\'erreur', formes.every(f => !G.nettoyer('erreur ' + f + ' fin').includes(f.slice(4))) && G.nettoyer('Authorization: Bearer abc.def').includes('Bearer ***'));
  console.log('1. la rédaction sur les vrais articles');
  for (const a of arts) {
    const r = await lancer(['preparer', a.slug]);
    v(`${a.slug} : préparé, sortie 0`, r.code, 0);
    const rec = lirePost(a.slug), p = rec.post;
    v(`${a.slug} : aucune erreur de règle`, G.verifierPost(rec), []);
    vrai(`${a.slug} : ≤ 600 caractères et le titre ouvre le texte`, p.summary.length <= 600 && p.summary.startsWith(a.titre));
    v(`${a.slug} : bouton LEARN_MORE vers l'article avec ?de=google`, p.callToAction, { actionType: 'LEARN_MORE', url: `https://teamop.fr/blog/${a.slug}.html?de=google` });
    vrai(`${a.slug} : image = JPEG public de teamop.fr, et le fichier existe`, p.media && /^https:\/\/teamop\.fr\/blog\/img\/[\w.-]+-google\.jpg$/.test(p.media[0].sourceUrl) && fs.existsSync(R('blog/img/' + path.basename(p.media[0].sourceUrl))));
    v(`${a.slug} : STANDARD en français`, [p.topicType, p.languageCode], ['STANDARD', 'fr']);
  }
  const tous = arts.map(a => lirePost(a.slug).post.summary).join('\n');
  vrai('population : cinq posts examinés', arts.length >= 5);
  vrai('⛔ aucun « € » dans les posts : un seuil légal n\'est pas un tarif', !/€|\beuros?\b/i.test(tous));
  vrai('aucun chiffre de téléphone, aucune adresse web dans le texte', !/\d{6,}|https?:|www\./.test(tous));

  console.log('2. l\'article piégé : la rédaction écarte, la règle refuse');
  const rp = await lancer(['preparer', 'piege-test']);
  v('l\'article piégé est préparé quand même (sortie 0)', rp.code, 0);
  const sp = lirePost('piege-test').post.summary;
  vrai('ni prix, ni téléphone, ni « n\'hésitez », ni tutoiement, ni « gratuit/garanti »', !/€|\d{4}|hésitez|\bTu\b|\btu\b|\bton\b|gratuit|garanti|appelez/i.test(sp));
  vrai('le texte sûr de l\'article est gardé (le technicien voit sa journée)', /technicien voit sa journée/.test(sp));
  const bon = lirePost(arts[0].slug);
  const cas = (nom, f, motif) => { const c = JSON.parse(JSON.stringify(bon)); f(c); const e = G.verifierPost(c).join(' | '); vrai(`verifierPost refuse : ${nom}`, motif.test(e)); };
  cas('un téléphone', c => c.post.summary += ' Au 06 12 34 56 78', /téléphone/);
  cas('un téléphone international', c => c.post.summary += ' +33 6 12 34 56 78', /téléphone/);
  cas('« n\'hésitez pas »', c => c.post.summary += ' N’hésitez pas à nous écrire.', /formule/);
  cas('un prix de 120 €', c => c.post.summary += ' Dès 120 €.', /grille/);
  cas('un prix de 1 200 euros', c => c.post.summary += ' 1 200 euros par mois.', /grille/);
  cas('un tutoiement', c => c.post.summary += ' Tu gagnes du temps.', /tutoiement/);
  cas('une adresse web dans le texte', c => c.post.summary += ' https://exemple.fr', /formule/);
  cas('plus de 600 caractères', c => c.post.summary += ' mot'.repeat(200), /trop long/);
  cas('un lien sans ?de=google', c => c.post.callToAction.url = c.post.callToAction.url.replace('?de=google', ''), /lien du bouton/);
  cas('un autre bouton', c => c.post.callToAction.actionType = 'CALL', /LEARN_MORE/);
  cas('une image WebP', c => c.post.media[0].sourceUrl = c.post.media[0].sourceUrl.replace(/\.jpg$/, '.webp'), /image/);
  cas('une image hors de teamop.fr', c => c.post.media[0].sourceUrl = 'https://exemple.fr/a.jpg', /image/);
  vrai('un prix de la grille (15 €) n\'est PAS refusé par la règle (seuls les autres le sont)', (() => { const c = JSON.parse(JSON.stringify(bon)); c.post.summary += ' Pro : 15 € par mois.'; return !G.verifierPost(c).some(e => /grille/.test(e)); })());
  const rien = await lancer(['preparer', 'inconnu-xx']);
  v('un slug inconnu : sortie 1 (la préparation le dit)', rien.code, 1);

  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const U = 'http://127.0.0.1:' + srv.address().port;
  const ENV = { GBP_CLIENT_ID: S.id, GBP_CLIENT_SECRET: S.clisec, GBP_REFRESH_TOKEN: S.refresh, GBP_ACCOUNT_ID: S.compte, GBP_LOCATION_ID: S.fiche,
    GBP_API_BASE: U + '/v4', GBP_TOKEN_URL: U + '/token', GBP_SITE_BASE: U, GBP_ATTENTE_S: '0' };
  const rouler = async (slug, env = ENV) => { etat.reqs = []; return lancer(['publier', slug], env); };
  const sans = t => !TOUS.some(s => t.includes(s));
  const A = arts[0].slug;

  console.log('3. sans secrets : une ligne, sortie 0, rien d\'envoyé');
  const e0 = await rouler(A, { GBP_CLIENT_ID: S.id, GBP_API_BASE: U + '/v4', GBP_TOKEN_URL: U + '/token' });
  v('sortie 0', e0.code, 0);
  vrai('une seule ligne, qui nomme ce qui manque', e0.sortie.trim().split('\n').length === 1 && /GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, GBP_ACCOUNT_ID, GBP_LOCATION_ID/.test(e0.sortie) && !/GBP_CLIENT_ID,/.test(e0.sortie));
  v('aucune requête envoyée à Google', etat.reqs.length, 0);
  v('aucune marque posée', lirePost(A).publie, null);

  console.log('4. publication : jeton en en-tête, secrets seulement dans le corps du jeton');
  const e1 = await rouler(A);
  v('sortie 0', e1.code, 0);
  const jt = etat.reqs.find(r => r.url === '/token'), ps = etat.reqs.find(r => r.m === 'POST' && r.url.includes('localPosts'));
  vrai('le jeton est demandé par POST, secrets dans le corps (formulaire), refresh_token + grant_type', jt && jt.m === 'POST' && /grant_type=refresh_token/.test(jt.corps) && jt.corps.includes(encodeURIComponent(S.refresh)) && jt.corps.includes('client_secret='));
  vrai('⛔ aucune adresse appelée ne contient un secret ni le jeton d\'accès', etat.reqs.every(r => sans(r.url)));
  vrai('⛔ le jeton d\'accès voyage dans l\'en-tête Authorization: Bearer', ps && ps.h.authorization === 'Bearer ' + S.acces);
  vrai('aucun secret dans les en-têtes autres qu\'Authorization', etat.reqs.every(r => Object.entries(r.h).every(([k, h]) => k === 'authorization' || sans(String(h)))));
  vrai('le corps du post : texte, STANDARD, LEARN_MORE, image', ps && (b => b.topicType === 'STANDARD' && b.callToAction.actionType === 'LEARN_MORE' && b.callToAction.url.endsWith(`/blog/${A}.html?de=google`) && b.media[0].mediaFormat === 'PHOTO' && b.summary === lirePost(A).post.summary)(JSON.parse(ps.corps)));
  vrai('⛔ rien de secret dans ce que le script dit', sans(e1.sortie));
  const m = lirePost(A);
  vrai('marque posée : date, nom de la ressource', /^\d{4}-\d\d-\d\d$/.test(m.publie) && /localPosts\/n1$/.test(m.ressource));
  v('un seul post créé', etat.posts.length, 1);

  console.log('5. jamais deux fois');
  const e2 = await rouler(A);
  v('relance : sortie 0', e2.code, 0);
  vrai('relance : aucune requête, « déjà publié »', etat.reqs.length === 0 && /déjà publié/.test(e2.sortie));
  const m2 = lirePost(A); m2.publie = null; m2.ressource = null; fs.writeFileSync(R(`contenu/blog/posts-google/${A}.json`), JSON.stringify(m2));
  const e3 = await rouler(A);
  vrai('⛔ marque perdue (non commitée après fusion) : la fiche est relue, rien republié', etat.posts.length === 1 && !etat.reqs.some(r => r.m === 'POST' && r.url.includes('localPosts')) && /déjà en ligne/.test(e3.sortie));
  vrai('et la marque est reposée', lirePost(A).publie && /n1$/.test(lirePost(A).ressource));
  const s2 = arts[1].slug;
  const e4 = await rouler(s2, { ...ENV, GBP_ACCOUNT_ID: 'accounts/' + S.compte, GBP_LOCATION_ID: 'locations/' + S.fiche });
  vrai('« accounts/… » et « locations/… » collés tels quels sont acceptés (autre article : un second post)', etat.posts.length === 2 && e4.code === 0);

  console.log('6. ⛔ une erreur ne fait pas échouer — elle se dit, sans secret');
  const s3 = arts[2].slug;
  etat.modePost = 'refus';
  const e5 = await rouler(s3);
  v('API qui refuse (403) : sortie 0', e5.code, 0);
  vrai('elle dit le code et la cause', /403/.test(e5.sortie) && /PERMISSION_DENIED/.test(e5.sortie) && /Quota 0/.test(e5.sortie));
  vrai('⛔ l\'API répète le jeton, le client et son secret : rien n\'en reste dans la sortie', sans(e5.sortie));
  v('pas de marque posée sur un échec', lirePost(s3).publie, null);
  etat.modePost = 'ok'; etat.modeToken = 'refus';
  const e6 = await rouler(s3);
  v('jeton refusé : sortie 0', e6.code, 0);
  vrai('il dit « jeton refusé » et invalid_grant, sans le refresh token que Google répète', /jeton refusé/.test(e6.sortie) && /invalid_grant/.test(e6.sortie) && sans(e6.sortie));
  v('et rien n\'est publié', etat.reqs.some(r => r.m === 'POST' && r.url.includes('localPosts')), false);
  etat.modeToken = 'ok';
  const e7 = await rouler(s3, { ...ENV, GBP_API_BASE: 'http://127.0.0.1:1/v4' });
  v('Google injoignable : sortie 0', e7.code, 0);
  vrai('et il le dit', /non publié/.test(e7.sortie) && sans(e7.sortie));
  const e8 = await lancer(['publier', 'slug inconnu; rm -rf /'], ENV);
  v('slug invalide : sortie 0, dit « invalide »', [e8.code, /invalide/.test(e8.sortie)], [0, true]);
  const e9 = await lancer(['publier', 'article-sans-fichier'], ENV);
  vrai('pas de JSON préparé : sortie 0 et il le dit', e9.code === 0 && /preparer/.test(e9.sortie));

  console.log('7. l\'image doit être en ligne, sinon publié sans');
  etat.image = 404; etat.site = 200;
  const e10 = await rouler(s3);
  const p3 = etat.posts.find(p => p.callToAction.url.includes(s3));
  vrai('image en 404 : post publié SANS media, et c\'est dit', p3 && !p3.media && /SANS image/.test(e10.sortie));
  etat.image = 200; etat.site = 404;
  const s4 = arts[3].slug;
  const e11 = await rouler(s4);
  vrai('page en 404 (attente épuisée) : publié quand même, et c\'est dit', etat.posts.some(p => p.callToAction.url.includes(s4)) && /ne répond pas encore 200/.test(e11.sortie));
  etat.site = 200;
  srv.close();

  console.log('8. préparer ne réécrit pas un post déjà publié');
  const avant = fs.readFileSync(R(`contenu/blog/posts-google/${A}.json`), 'utf8');
  const e12 = await lancer(['preparer', A]);
  vrai('déjà publié : laissé tel quel', fs.readFileSync(R(`contenu/blog/posts-google/${A}.json`), 'utf8') === avant && /déjà publié/.test(e12.sortie));

  console.log('9. les posts du dépôt (préparés pour une publication à la main)');
  const dep = path.join(RACINE, 'contenu/blog/posts-google');
  vrai('population : au moins trois posts livrés', fs.existsSync(dep) && fs.readdirSync(dep).filter(f => f.endsWith('.json')).length >= 3);
  for (const f of fs.existsSync(dep) ? fs.readdirSync(dep).filter(f => f.endsWith('.json')) : []) {
    const rec = JSON.parse(fs.readFileSync(path.join(dep, f), 'utf8'));
    v(`${f} : respecte les règles`, G.verifierPost(rec), []);
    vrai(`${f} : l'image JPEG existe dans le dépôt`, !rec.post.media || fs.existsSync(path.join(RACINE, 'blog/img', path.basename(rec.post.media[0].sourceUrl))));
    vrai(`${f} : son article existe`, arts.some(a => a.slug === rec.slug) && f === rec.slug + '.json');
  }

  console.log('10. le workflow');
  const W = fs.readFileSync(path.join(RACINE, '.github/workflows/blog-publication.yml'), 'utf8').replace(/^\s*#.*$/gm, '');
  const i = s => W.indexOf(s);
  vrai('le post est PRÉPARÉ avant les bancs et avant la fusion', i('google-post.js preparer') > 0 && i('node scripts/blog.js') < i('google-post.js preparer') && i('google-post.js preparer') < i('for t in 3000') && i('google-post.js preparer') < i('gh pr merge'));
  vrai('il est PUBLIÉ après la publication du site', i('google-post.js publier') > i('gh workflow run publication-site.yml'));
  vrai('⛔ jamais bloquant : préparation en `|| echo ::warning`, publication en continue-on-error', /google-post\.js preparer "\$s" \|\| echo "::warning::/.test(W) && /Publier le post sur la fiche Google\n\s+if: [^\n]+\n\s+continue-on-error: true/.test(W));
  for (const k of ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN', 'GBP_ACCOUNT_ID', 'GBP_LOCATION_ID'])
    vrai(`${k} ne vient que du secret du même nom`, new RegExp(`${k}: \\$\\{\\{ secrets\\.${k} \\}\\}`).test(W) && (W.match(new RegExp('secrets\\.' + k, 'g')) || []).length === 1);
  vrai('le script de publication n\'est jamais appelé avec un secret en argument ni affiché', !/(echo|cat|printf)[^\n]*GBP_/.test(W) && !/google-post\.js[^\n]*(\$GBP|secrets\.)/.test(W));
  vrai('ce banc est dans la boucle des bancs du blog', /for t in 3000 835 846 1008 3060 3065;/.test(W));
  vrai('la publication attend le site en ligne (GBP_ATTENTE_S)', /GBP_ATTENTE_S: "?\d{3,}"?/.test(W));
  const M = fs.readFileSync(path.join(RACINE, '.github/workflows/google-post-manuel.yml'), 'utf8').replace(/^\s*#.*$/gm, '');
  vrai('publication manuelle : workflow_dispatch, slug passé par l\'environnement (jamais interpolé dans le shell)', /workflow_dispatch:/.test(M) && /CHOIX: \$\{\{ inputs\.slug \}\}/.test(M) && !/run:[\s\S]*\$\{\{ inputs/.test(M.slice(M.indexOf('run:'))));
  const src = fs.readFileSync(SCRIPT, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  vrai('⛔ le code ne construit aucune adresse avec un jeton (access_token=, ?key=)', !/access_token=|[?&]key=|[?&]token=/.test(src));
  vrai('aucune dépendance : seulement fs, path, child_process', [...src.matchAll(/require\('([^']+)'\)/g)].every(m => ['fs', 'path', 'child_process'].includes(m[1])));

  console.log('11. le script d\'autorisation (une fois, sur le Mac) : le refresh token va dans `gh secret set`, nulle part ailleurs');
  const jour = fs.mkdtempSync(path.join(os.tmpdir(), 'gauth-'));
  fs.mkdirSync(path.join(jour, 'bin'));
  fs.writeFileSync(path.join(jour, 'bin', 'gh'), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${jour}/gh-args.txt"\ncat >> "${jour}/gh-stdin.txt"\nprintf '\\n' >> "${jour}/gh-stdin.txt"\n`, { mode: 0o755 });
  const RT = 'rt-fraichement-rendu-QQQ-secret';
  const g = http.createServer((q, r) => {
    let c = ''; q.on('data', d => c += d); q.on('end', () => {
      const j = (o) => { r.writeHead(200, { 'Content-Type': 'application/json' }); r.end(JSON.stringify(o)); };
      if (q.url === '/token') return j(/code=CODE-OK/.test(c) && /client_secret=/.test(c) ? { access_token: S.acces, refresh_token: RT } : { error: 'invalid_grant' });
      if (q.url === '/accounts') return j(q.headers.authorization === 'Bearer ' + S.acces ? { accounts: [{ name: 'accounts/777' }] } : {});
      r.writeHead(404); r.end();
    });
  });
  await new Promise(r => g.listen(0, '127.0.0.1', r));
  const GU = 'http://127.0.0.1:' + g.address().port;
  const aut = await new Promise(res => {
    const p = spawn(process.execPath, [path.join(RACINE, 'scripts/google-post-autoriser.js')], { env: { PATH: path.join(jour, 'bin') + path.delimiter + process.env.PATH, GBP_NO_OPEN: '1',
      GBP_CLIENT_ID: S.id, GBP_CLIENT_SECRET: S.clisec, GBP_AUTH_URL: GU + '/auth', GBP_TOKEN_URL: GU + '/token', GBP_ACCOUNTS_URL: GU + '/accounts' } });
    let o = '', lance = false;
    const suite = () => { const m = o.match(/(http:\/\/127\.0\.0\.1:\d+\/auth\?\S+)/); if (!m || lance) return; lance = true;
      const u = new URL(m[1]); const cb = new URL(u.searchParams.get('redirect_uri')); cb.searchParams.set('code', 'CODE-OK'); cb.searchParams.set('state', u.searchParams.get('state'));
      o += '[portee:' + u.searchParams.get('scope') + '|offline:' + u.searchParams.get('access_type') + ']';
      http.get(cb, r => r.resume()); };
    p.stdout.on('data', d => { o += d; suite(); }); p.stderr.on('data', d => o += d);
    p.on('close', code => res({ code, sortie: o }));
  });
  g.close();
  const gAr = fs.readFileSync(path.join(jour, 'gh-args.txt'), 'utf8'), gIn = fs.readFileSync(path.join(jour, 'gh-stdin.txt'), 'utf8');
  v('sortie 0', aut.code, 0);
  vrai('portée business.manage et accès hors ligne demandés', aut.sortie.includes('[portee:https://www.googleapis.com/auth/business.manage|offline:offline]'));
  v('les cinq secrets sont posés par « gh secret set <NOM> »', gAr.trim().split('\n'), ['secret set GBP_CLIENT_ID', 'secret set GBP_CLIENT_SECRET', 'secret set GBP_REFRESH_TOKEN', 'secret set GBP_ACCOUNT_ID', 'secret set GBP_LOCATION_ID']);
  v('⛔ les valeurs arrivent par l\'entrée standard (refresh token, compte lu par l\'API, fiche)', gIn.trim().split('\n'), [S.id, S.clisec, RT, '777', '3113104183760997296']);
  vrai('⛔ aucune valeur dans les arguments de gh', ![S.id, S.clisec, RT, '777'].some(x => gAr.includes(x)));
  vrai('⛔ ni le refresh token, ni le secret client, ni le jeton d\'accès dans ce que le script affiche', ![RT, S.clisec, S.acces].some(x => aut.sortie.includes(x)));
  fs.rmSync(jour, { recursive: true, force: true });

  fs.rmSync(tmp, { recursive: true, force: true });
  console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
