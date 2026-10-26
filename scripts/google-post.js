#!/usr/bin/env node
/* Posts de la fiche Google Business Profile « TEAM OP », faits automatiquement à partir des articles du blog.

   Justin, 26 octobre 2026 : les « posts » (actualités) de la fiche Google doivent partir seuls, comme le blog.

     node scripts/google-post.js preparer <slug>   écrit contenu/blog/posts-google/<slug>.json (rédaction DÉTERMINISTE,
                                                   aucun modèle) et, au besoin, l'image JPEG du post
     node scripts/google-post.js publier  <slug>   publie ce JSON par l'API Business Profile (v4, localPosts)
     node scripts/google-post.js verifier <slug>   rejoue les règles de contenu sur le JSON, sans rien envoyer

   Variables de `publier` (secrets GitHub) : GBP_CLIENT_ID, GBP_CLIENT_SECRET, GBP_REFRESH_TOKEN, GBP_ACCOUNT_ID,
   GBP_LOCATION_ID. Il en manque une → UNE ligne dit laquelle, sortie 0 : ce script ne bloque JAMAIS la publication du
   blog. Réglables pour les bancs : GBP_API_BASE, GBP_TOKEN_URL, GBP_SITE_BASE, GBP_ATTENTE_S, BLOG_RACINE.

   ⛔ Ce que ce fichier garde (tests/test-3065.js) :
     · le jeton d'accès voyage dans l'EN-TÊTE `Authorization`, jamais dans une adresse ; les secrets (client, refresh
       token, jeton d'accès) ne sont ni affichés ni recopiés dans un message d'erreur de l'API (`nettoyer`) ;
     · un article ne part JAMAIS deux fois : le JSON porte `publie`, et — la marque n'étant pas commitée après la
       fusion — la liste des posts déjà en ligne est relue et cherche l'adresse de l'article ;
     · une erreur de l'API se DIT (avertissement GitHub) et la sortie reste 0 ;
     · la rédaction ne dit ni prix hors grille (15 / 25 / 50 €), ni téléphone, ni formule creuse (`verifierPost`). */
'use strict';
const fs = require('fs'), path = require('path');
const { spawnSync } = require('child_process');

const RACINE = process.env.BLOG_RACINE || path.join(__dirname, '..');
const SITE = 'https://teamop.fr';
const LONGUEUR_MAX = 600;       // notre plafond ; Google en accepte davantage, mais un post court se lit
const PRIX_GRILLE = [15, 25, 50];
const dossierPosts = () => path.join(RACINE, 'contenu', 'blog', 'posts-google');
const fichierPost = slug => path.join(dossierPosts(), slug + '.json');
const urlArticle = slug => `${SITE}/blog/${slug}.html?de=google`;
const SLUG = /^[a-z0-9][a-z0-9-]*$/;

/* ---------- texte ---------- */
const ENTITES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', rsquo: '’', lsquo: '‘', laquo: '«', raquo: '»', hellip: '…', euro: '€' };
function enTexte(html) {
  return String(html).replace(/<[^>]*>/g, '')
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
    .replace(/&([a-z]+);/gi, (m, n) => ENTITES[n.toLowerCase()] ?? m)
    .replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
}
const phrases = t => (t.match(/[^.!?…]+(?:[.!?…]+|$)/g) || []).map(s => s.trim()).filter(Boolean);

/* les points « En bref » de l'article (le fragment .htm) */
function pointsEnBref(htm) {
  const i = htm.search(/<h2[^>]*id="en-bref"/);
  if (i < 0) return [];
  const reste = htm.slice(i), fin = reste.indexOf('</ul>');
  const liste = fin < 0 ? reste : reste.slice(0, fin);
  return [...liste.matchAll(/<li>([\s\S]*?)<\/li>/g)].map(m => enTexte(m[1])).filter(Boolean);
}

/* ---------- les règles de contenu ---------- */
const TELEPHONE = [/(?:\+|00)\s?\d[\d .-]{7,}\d/, /\b0\s?[1-9](?:[ .-]?\d{2}){4}\b/, /\d(?:[ .-]?\d){8,}/];
const FORMULES = [/n['’]?\s?h[ée]sitez/i, /\bgratuit/i, /\bgaranti/i, /\bmeilleur/i, /\bappelez/i, /\bcontactez-nous/i, /\bpromo/i,
  /\b100\s?%/, /\bn°\s?1\b/i, /\bsans engagement/i, /\bremise/i, /\boffre\b/i, /https?:\/\//i, /www\./i];
const TUTOIEMENT = /(?<![\p{L}])(?:tu|toi|ton|ta|tes|t['’])(?![\p{L}])|(?<![\p{L}])\p{L}+-tu(?![\p{L}])/iu;   // pas \b : « tué » n'est pas un tutoiement
const PRIX = /(\d[\d  .,]*)\s*(?:€|euros?\b|eur\b)/gi;

function verifierPost(rec) {
  const err = [], p = rec && rec.post || {};
  const s = typeof p.summary === 'string' ? p.summary : '';
  if (!s) err.push('texte vide');
  if (s.length > LONGUEUR_MAX) err.push(`texte trop long (${s.length} > ${LONGUEUR_MAX})`);
  if (p.topicType !== 'STANDARD') err.push('topicType doit être STANDARD');
  if (p.languageCode !== 'fr') err.push('languageCode doit être fr');
  const cta = p.callToAction || {};
  if (cta.actionType !== 'LEARN_MORE') err.push('bouton : LEARN_MORE attendu');
  if (!rec.slug || cta.url !== urlArticle(rec.slug)) err.push('le lien du bouton doit être ' + (rec.slug ? urlArticle(rec.slug) : 'celui de l\'article avec ?de=google'));
  for (const re of TELEPHONE) if (re.test(s)) err.push('numéro de téléphone dans le texte');
  for (const re of FORMULES) if (re.test(s)) err.push('formule interdite : ' + re.source);
  if (TUTOIEMENT.test(s)) err.push('tutoiement : le vouvoiement est la règle');
  for (const m of s.matchAll(PRIX)) {
    const n = parseFloat(m[1].replace(/[\s  ]/g, '').replace(',', '.'));
    if (!PRIX_GRILLE.includes(n)) err.push('prix hors de la grille 15/25/50 € : ' + m[0].trim());
  }
  const lettres = s.replace(/[^A-Za-zÀ-ÿ]/g, '');
  if (lettres.length > 20 && s.replace(/[^A-ZÀ-Þ]/g, '').length / lettres.length > 0.4) err.push('trop de majuscules');
  for (const m of (p.media || [])) {
    if (m.mediaFormat !== 'PHOTO' || !/^https:\/\/teamop\.fr\/blog\/img\/[\w.-]+\.(jpe?g|png)$/.test(m.sourceUrl || '')) err.push('image : une URL https://teamop.fr/blog/img/… en JPEG ou PNG est attendue');
  }
  return err;
}

/* ---------- rédaction (déterministe) ---------- */
function sansPiege(t) {
  // un prix n'entre jamais dans un post (même ceux de la grille : un seuil légal « 25 € TTC » n'est pas un tarif)
  return phrases(t).filter(f => !/€|euros?\b/i.test(f) && !/n['’]?\s?h[ée]sitez/i.test(f) && !FORMULES.some(re => re.test(f)) && !TUTOIEMENT.test(f) && !TELEPHONE.some(re => re.test(f))).join(' ');
}
function rediger(art, htm) {
  const titre = enTexte(art.titre), desc = sansPiege(enTexte(art.description));
  const fin = 'Le détail est dans l’article complet : bouton « En savoir plus ».';
  const base = [titre, desc].filter(Boolean).join('\n\n');
  let texte = base;
  for (const pt of pointsEnBref(htm).map(sansPiege).filter(Boolean)) {
    const essai = (texte === base ? base + '\n\nÀ retenir : ' : texte + '\n') + pt;
    if ((essai + '\n\n' + fin).length > LONGUEUR_MAX) continue;
    texte = essai;
    if (texte !== base && texte.split('\n').length >= 4) break;   // deux points au plus
  }
  return texte + '\n\n' + fin;
}

/* ---------- préparer ---------- */
function lireArticle(slug) {
  if (!SLUG.test(slug || '')) throw new Error('slug invalide : ' + JSON.stringify(slug));
  const arts = JSON.parse(fs.readFileSync(path.join(RACINE, 'contenu', 'blog', 'articles.json'), 'utf8'));
  const art = arts.find(a => a.slug === slug);
  if (!art) throw new Error('article inconnu : ' + slug);
  const f = path.join(RACINE, 'contenu', 'blog', slug + '.htm');
  return { art, htm: fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '' };
}

/* Google n'accepte en image de post que JPEG ou PNG (aide « Photos et vidéos » de la fiche) : la couverture WebP du
   blog est donc convertie par scripts/blog-google-image.py (Pillow), 4:3 sans rien couper. */
function imageJpeg(art) {
  const jpg = art.image.replace(/\.webp$/i, '') + '-google.jpg';
  const dest = path.join(RACINE, 'blog', 'img', jpg);
  if (!fs.existsSync(dest)) {
    const r = spawnSync(process.env.PYTHON || 'python3', [path.join(__dirname, 'blog-google-image.py'), art.slug === undefined ? '' : art.slug, art.image], { env: process.env, encoding: 'utf8' });
    if (r.status !== 0 || !fs.existsSync(dest)) return null;
  }
  return jpg;
}

function preparer(slug) {
  const { art, htm } = lireArticle(slug);
  const f = fichierPost(slug);
  if (fs.existsSync(f)) {
    const ancien = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (ancien.publie) { console.log(`posts-google/${slug}.json : déjà publié le ${ancien.publie}, laissé tel quel`); return 0; }
  }
  const jpg = imageJpeg({ ...art, slug });
  const post = { languageCode: 'fr', topicType: 'STANDARD', summary: rediger(art, htm),
    callToAction: { actionType: 'LEARN_MORE', url: urlArticle(slug) } };
  if (jpg) post.media = [{ mediaFormat: 'PHOTO', sourceUrl: `${SITE}/blog/img/${jpg}` }];
  else console.log('image JPEG indisponible (Pillow ?) : post préparé SANS image');
  const rec = { slug, prepare: new Date().toISOString().slice(0, 10), publie: null, ressource: null, post };
  const err = verifierPost(rec);
  if (err.length) { console.error('✗ post refusé par les règles :\n  - ' + err.join('\n  - ')); return 1; }
  fs.mkdirSync(dossierPosts(), { recursive: true });
  fs.writeFileSync(f, JSON.stringify(rec, null, 2) + '\n');
  console.log(`posts-google/${slug}.json écrit (${post.summary.length} caractères)`);
  return 0;
}

/* ---------- publier ---------- */
const SECRETS = ['GBP_CLIENT_ID', 'GBP_CLIENT_SECRET', 'GBP_REFRESH_TOKEN', 'GBP_ACCOUNT_ID', 'GBP_LOCATION_ID'];
let jetonCourant = '';
function nettoyer(t) {
  let s = String(t == null ? '' : t);
  for (const v of [jetonCourant, ...SECRETS.map(k => process.env[k])]) if (v && v.length >= 4) s = s.split(v).join('***');
  return s.replace(/ya29\.[\w-]+/g, '***').replace(/1\/\/[\w-]{10,}/g, '***').replace(/GOCSPX-[\w-]+/g, '***')
    .replace(/Bearer\s+\S+/gi, 'Bearer ***').replace(/\s+/g, ' ').slice(0, 300);
}
const dire = (t, avertir) => console.log((avertir && process.env.GITHUB_ACTIONS ? '::warning::' : '') + nettoyer(t));
const bout = v => String(v || '').replace(/^(accounts|locations)\//, '');

async function http(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
  const texte = await r.text();
  let json = null; try { json = JSON.parse(texte); } catch (e) { /* pas du JSON */ }
  return { status: r.status, ok: r.ok, json, texte };
}
const causeApi = r => {
  const e = r.json && r.json.error;
  const msg = e ? (typeof e === 'string' ? e + (r.json.error_description ? ' — ' + r.json.error_description : '') : (e.status || '') + (e.message ? ' — ' + e.message : '')) : '';
  return `HTTP ${r.status}${msg ? ' ' + msg : ''}`;
};

async function jeton(env) {
  const corps = new URLSearchParams({ client_id: env.GBP_CLIENT_ID, client_secret: env.GBP_CLIENT_SECRET, refresh_token: env.GBP_REFRESH_TOKEN, grant_type: 'refresh_token' });
  const r = await http(process.env.GBP_TOKEN_URL || 'https://oauth2.googleapis.com/token',
    { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: corps });
  if (!r.ok || !r.json || !r.json.access_token) throw new Error('jeton refusé par Google (' + causeApi(r) + ')');
  jetonCourant = r.json.access_token;
  return jetonCourant;
}

/* attend que la page de l'article (donc le site publié) réponde 200 ; rend vrai si l'image répond 200 aussi */
async function siteEnLigne(slug, sourceUrl) {
  const base = process.env.GBP_SITE_BASE || SITE, attente = +(process.env.GBP_ATTENTE_S || 0) * 1000, t0 = Date.now();
  const sonde = async u => { try { return (await fetch(u, { method: 'GET', signal: AbortSignal.timeout(15000) })).status === 200; } catch (e) { return false; } };
  const page = `${base}/blog/${slug}.html`;
  while (!(await sonde(page))) {
    if (Date.now() - t0 >= attente) return { page: false, image: false };
    await new Promise(r => setTimeout(r, Math.min(15000, Math.max(50, attente / 10))));
  }
  return { page: true, image: sourceUrl ? await sonde(base + new URL(sourceUrl).pathname) : false };
}

async function dejaEnLigne(racine, slug, auth) {
  let jeton = '';
  for (let i = 0; i < 10; i++) {
    const r = await http(`${racine}/localPosts?pageSize=100${jeton ? '&pageToken=' + encodeURIComponent(jeton) : ''}`, { headers: auth });
    if (!r.ok) throw new Error('liste des posts refusée (' + causeApi(r) + ')');
    const trouve = ((r.json && r.json.localPosts) || []).find(p => p.callToAction && typeof p.callToAction.url === 'string' && p.callToAction.url.includes(`/blog/${slug}.html`));
    if (trouve) return trouve;
    jeton = r.json && r.json.nextPageToken;
    if (!jeton) return null;
  }
  return null;
}

async function publier(slug) {
  if (!SLUG.test(slug || '')) { dire('slug invalide', true); return 0; }
  const f = fichierPost(slug);
  if (!fs.existsSync(f)) { dire(`google-post : pas de ${path.relative(RACINE, f)} (lancer « preparer ${slug} » d'abord)`, true); return 0; }
  const rec = JSON.parse(fs.readFileSync(f, 'utf8'));
  if (rec.publie) { dire(`google-post : ${slug} déjà publié le ${rec.publie} (${rec.ressource || 'ressource inconnue'})`); return 0; }
  const env = process.env, manque = SECRETS.filter(k => !env[k]);
  if (manque.length) { dire(`google-post : rien publié, il manque ${manque.join(', ')} (voir contenu/blog/GOOGLE-POSTS.md)`); return 0; }
  const err = verifierPost(rec);
  if (err.length) { dire(`google-post : ${slug} refusé par les règles de contenu : ${err.join(' ; ')}`, true); return 0; }
  try {
    const auth = { Authorization: 'Bearer ' + await jeton(env) };
    const racine = `${process.env.GBP_API_BASE || 'https://mybusiness.googleapis.com/v4'}/accounts/${bout(env.GBP_ACCOUNT_ID)}/locations/${bout(env.GBP_LOCATION_ID)}`;
    const deja = await dejaEnLigne(racine, slug, auth);
    if (deja) {
      rec.publie = new Date().toISOString().slice(0, 10); rec.ressource = deja.name || null;
      fs.writeFileSync(f, JSON.stringify(rec, null, 2) + '\n');
      dire(`google-post : ${slug} est déjà en ligne sur la fiche (${deja.name || 'sans nom'}), rien republié`);
      return 0;
    }
    const post = JSON.parse(JSON.stringify(rec.post));
    const src = post.media && post.media[0] && post.media[0].sourceUrl;
    const etat = await siteEnLigne(slug, src);
    if (!etat.page) dire(`google-post : la page ${slug} ne répond pas encore 200, publié quand même`, true);
    if (src && !etat.image) { delete post.media; dire(`google-post : l'image du post n'est pas en ligne, ${slug} publié SANS image`, true); }
    const r = await http(`${racine}/localPosts`, { method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' }, body: JSON.stringify(post) });
    if (!r.ok) { dire(`google-post : l'API a refusé ${slug} (${causeApi(r)}) — la publication du blog n'est pas touchée`, true); return 0; }
    rec.publie = new Date().toISOString().slice(0, 10); rec.ressource = (r.json && r.json.name) || null;
    fs.writeFileSync(f, JSON.stringify(rec, null, 2) + '\n');
    dire(`google-post : ${slug} publié sur la fiche (${rec.ressource || 'sans nom'}, état ${(r.json && r.json.state) || 'inconnu'})`);
  } catch (e) {
    dire(`google-post : ${slug} non publié — ${e.message}`, true);
  }
  return 0;
}

function verifier(slug) {
  const f = fichierPost(slug);
  if (!fs.existsSync(f)) { console.error('pas de ' + f); return 1; }
  const err = verifierPost(JSON.parse(fs.readFileSync(f, 'utf8')));
  console.log(err.length ? '✗ ' + err.join('\n✗ ') : `✓ ${slug} respecte les règles`);
  return err.length ? 1 : 0;
}

module.exports = { rediger, verifierPost, preparer, publier, pointsEnBref, enTexte, nettoyer, urlArticle };

if (require.main === module) {
  const [cmd, slug] = process.argv.slice(2);
  const action = { preparer, publier, verifier }[cmd];
  if (!action) { console.error('usage : node scripts/google-post.js preparer|publier|verifier <slug>'); process.exit(2); }
  Promise.resolve().then(() => action(slug)).then(c => process.exit(c || 0), e => {
    console.error(nettoyer('google-post : ' + e.message));
    process.exit(cmd === 'publier' ? 0 : 1);
  });
}
