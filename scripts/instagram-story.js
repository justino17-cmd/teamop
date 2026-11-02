#!/usr/bin/env node
/* La story Instagram d'un article du blog, publiée toute seule.

   Justin, 2 novembre 2026 : « je veux que tu mettes les stories automatiquement quand tu mets les blogs ».

     node scripts/instagram-story.js publier <slug>

   L'image est `blog/img/<slug>-story.jpg` (fabriquée par scripts/blog-story.py, partie avec l'article). Instagram ne
   reçoit pas de fichier : il va chercher l'image à son ADRESSE PUBLIQUE. On attend donc que le site publié la serve
   (jusqu'à IG_ATTENTE_S secondes), puis l'API Graph de Meta en deux temps — un conteneur `media_type=STORIES`, puis
   `media_publish` une fois le conteneur prêt.

   Secrets GitHub : IG_USER_ID (l'identifiant du compte professionnel Instagram) et IG_ACCESS_TOKEN (jeton longue durée
   avec la permission instagram_content_publish). Mode d'emploi : contenu/blog/INSTAGRAM-STORIES.md.
   Réglables pour les bancs : IG_API_BASE, IG_SITE_BASE, IG_ATTENTE_S, IG_PRET_S, BLOG_RACINE.

   ⛔ Ce que ce fichier garde (tests/test-3236.js) :
     · il ne bloque JAMAIS la publication du blog : secrets absents, image pas en ligne, API qui refuse → UNE ligne le
       dit (avertissement GitHub) et la sortie reste 0 ;
     · le jeton voyage dans l'EN-TÊTE `Authorization`, jamais dans une adresse, et n'apparaît dans aucun message, même
       quand l'API le répète (`nettoyer`) ;
     · une image que le site ne sert pas ne part pas : Instagram publierait une erreur, ou rien.
   ⚠️ L'API ne pose pas l'autocollant « Lien » d'une story : l'image dit « À lire sur teamop.fr/blog ». */
'use strict';
const fs = require('fs'), path = require('path');

const RACINE = process.env.BLOG_RACINE || path.join(__dirname, '..');
const SITE = 'https://teamop.fr';
const SLUG = /^[a-z0-9][a-z0-9-]*$/;
const SECRETS = ['IG_USER_ID', 'IG_ACCESS_TOKEN'];

function nettoyer(t) {
  let s = String(t == null ? '' : t);
  const jeton = process.env.IG_ACCESS_TOKEN;
  if (jeton && jeton.length >= 4) s = s.split(jeton).join('***');
  return s.replace(/EA[A-Za-z0-9]{20,}/g, '***').replace(/IG[A-Za-z0-9]{20,}/g, '***')
    .replace(/access_token=[^&\s"]+/gi, 'access_token=***').replace(/Bearer\s+\S+/gi, 'Bearer ***').replace(/\s+/g, ' ').slice(0, 300);
}
const dire = (t, avertir) => console.log((avertir && process.env.GITHUB_ACTIONS ? '::warning::' : '') + nettoyer(t));
const pause = ms => new Promise(r => setTimeout(r, ms));

async function http(url, opts = {}) {
  const r = await fetch(url, { ...opts, signal: AbortSignal.timeout(30000) });
  const texte = await r.text();
  let json = null; try { json = JSON.parse(texte); } catch (e) { /* pas du JSON */ }
  return { status: r.status, ok: r.ok, json, texte };
}
const causeApi = r => {
  const e = r.json && r.json.error;
  return `HTTP ${r.status}${e ? ' ' + [e.type, e.code, e.message].filter(Boolean).join(' — ') : ''}`;
};

/* attend que le site publié serve l'image ; vrai si elle répond 200 dans le délai */
async function imageEnLigne(url) {
  const attente = +(process.env.IG_ATTENTE_S || 0) * 1000, t0 = Date.now();
  for (;;) {
    try { if ((await fetch(url, { signal: AbortSignal.timeout(15000) })).status === 200) return true; } catch (e) { /* pas encore */ }
    if (Date.now() - t0 >= attente) return false;
    await pause(Math.min(15000, Math.max(50, attente / 10)));
  }
}

async function publier(slug) {
  if (!SLUG.test(slug || '')) { dire('instagram-story : slug invalide', true); return 0; }
  const fichier = path.join(RACINE, 'blog', 'img', slug + '-story.jpg');
  if (!fs.existsSync(fichier)) { dire(`instagram-story : pas de blog/img/${slug}-story.jpg (scripts/blog-story.py ne l'a pas fabriquée)`, true); return 0; }
  const env = process.env, manque = SECRETS.filter(k => !env[k]);
  if (manque.length) { dire(`instagram-story : rien publié, il manque ${manque.join(', ')} (voir contenu/blog/INSTAGRAM-STORIES.md)`); return 0; }
  const image = `${env.IG_SITE_BASE || SITE}/blog/img/${slug}-story.jpg`;
  try {
    if (!(await imageEnLigne(image))) { dire(`instagram-story : l'image de ${slug} n'est pas en ligne, story NON publiée`, true); return 0; }
    const base = (env.IG_API_BASE || 'https://graph.facebook.com/v21.0').replace(/\/$/, '');
    const compte = encodeURIComponent(env.IG_USER_ID);
    const auth = { Authorization: 'Bearer ' + env.IG_ACCESS_TOKEN };
    const form = o => ({ method: 'POST', headers: { ...auth, 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(o) });

    const c = await http(`${base}/${compte}/media`, form({ image_url: image, media_type: 'STORIES' }));
    if (!c.ok || !c.json || !c.json.id) { dire(`instagram-story : Instagram a refusé la story de ${slug} (${causeApi(c)})`, true); return 0; }
    const conteneur = encodeURIComponent(c.json.id);

    // le conteneur se prépare côté Meta (téléchargement de l'image) : on attend « FINISHED », pas plus de IG_PRET_S
    const pret = +(env.IG_PRET_S || 60) * 1000, t0 = Date.now();
    for (;;) {
      const e = await http(`${base}/${conteneur}?fields=status_code`, { headers: auth });
      const st = e.json && e.json.status_code;
      if (st === 'FINISHED') break;
      if (st === 'ERROR' || st === 'EXPIRED') { dire(`instagram-story : Instagram n'a pas pu préparer la story de ${slug} (${st})`, true); return 0; }
      if (Date.now() - t0 >= pret) { dire(`instagram-story : la story de ${slug} n'était pas prête à temps (${st || causeApi(e)}), non publiée`, true); return 0; }
      await pause(Math.min(5000, Math.max(50, pret / 12)));
    }

    const p = await http(`${base}/${compte}/media_publish`, form({ creation_id: c.json.id }));
    if (!p.ok || !p.json || !p.json.id) { dire(`instagram-story : publication de la story de ${slug} refusée (${causeApi(p)})`, true); return 0; }
    dire(`instagram-story : story de ${slug} publiée (${p.json.id})`);
  } catch (e) {
    dire(`instagram-story : ${slug} non publiée — ${e.message}`, true);
  }
  return 0;
}

module.exports = { publier, nettoyer };

if (require.main === module) {
  const [cmd, slug] = process.argv.slice(2);
  if (cmd !== 'publier') { console.error('usage : node scripts/instagram-story.js publier <slug>'); process.exit(2); }
  publier(slug).then(c => process.exit(c || 0), e => { console.error(nettoyer('instagram-story : ' + e.message)); process.exit(0); });
}
