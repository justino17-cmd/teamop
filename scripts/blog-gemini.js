/* Les images d'un article du blog, dessinées par Gemini (Justin, 26 octobre 2026 : « je veux que les publications soient
   automatiques et que les images soient gérées avec Gemini »).

   Lancé par `.github/workflows/blog-publication.yml` sur la demande de fusion d'un article, AVANT la fusion :

     node scripts/blog-gemini.js <slug> <dossier-de-travail>

   · la PHOTO de couverture : une scène de terrain, rangée dans `contenu/blog/photos/<slug>.<ext>` (hors du site) ;
     `scripts/blog-images.py` la pose ensuite à droite du panneau bleu nuit. Déjà là → rien n'est redemandé ;
   · les images DANS le texte : une `<img … data-gemini="description">` du fragment est dessinée, l'attribut retiré.
     La tâche planifiée pose d'abord une image d'attente (`blog-images.py --attente`) pour que les bancs passent.

   ⛔ Un échec n'empêche JAMAIS la publication, et ne laisse rien de laid en ligne : sans clé ou si Gemini refuse,
   la couverture reste le panneau seul et la figure en attente est RETIRÉE du texte (image d'attente comprise).
   ⛔ La clé voyage dans l'en-tête `x-goog-api-key`, jamais dans l'adresse : une adresse finit dans les journaux.
   ⛔ Les consignes de l'image sont fixes ici, pas dans la description de l'article : personnes fictives, tenue bleu
   marine, ni texte, ni logo, ni marque — la règle du blog (`contenu/blog/SUJETS.md`), qu'un modèle ne doit pas oublier.

   Écrit `<dossier>/manifeste.json` : { couverture: chemin|null, figures: [{ src, brut }], retirees: [src], modele }.
   Aucune dépendance. `GEMINI_BASE` et `BLOG_RACINE` servent aux bancs (tests/test-3060.js). */
'use strict';
const fs = require('fs'), path = require('path');

const RACINE = process.env.BLOG_RACINE || path.join(__dirname, '..');
const BASE = (process.env.GEMINI_BASE || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
const CLE = process.env.GEMINI_API_KEY || '';
const DELAI_MS = Number(process.env.GEMINI_DELAI_MS) || 120000;

const CONSIGNES = 'Photorealistic photograph, natural light, documentary style, France. ' +
  'Any person shown is a fictional adult; field workers wear plain navy blue work clothes with no logo. ' +
  'Absolutely no text, letters, numbers, signs, logos, brand names or watermarks anywhere in the image. ' +
  'No recognizable real person. Scene: ';

const promptCouverture = a => CONSIGNES + (a.photo ||
  'a field technician at work on a client site in France, illustrating the topic: ' + a.titre) + '.';
const promptFigure = d => CONSIGNES + d + '.';

const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };

async function appel(url, corps) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), DELAI_MS);
  try {
    const r = await fetch(url, { method: corps ? 'POST' : 'GET', signal: ac.signal,
      headers: Object.assign({ 'x-goog-api-key': CLE }, corps ? { 'Content-Type': 'application/json' } : {}),
      body: corps ? JSON.stringify(corps) : undefined });
    const texte = await r.text();
    let j = null; try { j = JSON.parse(texte); } catch (e) { /* une page d'erreur HTML */ }
    return { code: r.status, j };
  } finally { clearTimeout(t); }
}

/* le modèle d'IMAGE le plus récent que la clé peut appeler — les noms changent d'une saison à l'autre, on ne les
   écrit pas en dur. `flash` d'abord (le moins cher), puis la version la plus haute. Réglable : GEMINI_MODELE_IMAGE. */
function choisirModele(liste) {
  const ver = n => { const m = /(\d+(?:\.\d+)?)/.exec(n); return m ? parseFloat(m[1]) : 0; };
  const ok = (liste || []).filter(m => m && /image/i.test(m.name || '') && !/imagen/i.test(m.name || '') &&
    (m.supportedGenerationMethods || []).includes('generateContent'));
  ok.sort((a, b) => (/flash/.test(b.name) - /flash/.test(a.name)) || (ver(b.name) - ver(a.name)) ||
    (/preview|exp/.test(a.name) - /preview|exp/.test(b.name)));
  return ok.length ? ok[0].name.replace(/^models\//, '') : null;
}

async function modele() {
  if (process.env.GEMINI_MODELE_IMAGE) return process.env.GEMINI_MODELE_IMAGE;
  const r = await appel(BASE + '/models?pageSize=1000');
  if (r.code !== 200 || !r.j) throw new Error('liste des modèles illisible (HTTP ' + r.code + ')');
  const m = choisirModele(r.j.models);
  if (!m) throw new Error('aucun modèle d\'image accessible avec cette clé');
  return m;
}

/* une image ; le format demandé d'abord, sans format si le modèle ne le connaît pas */
async function dessiner(mod, prompt, format) {
  const url = BASE + '/models/' + encodeURIComponent(mod) + ':generateContent';
  const essais = [
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: format } } },
    { contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseModalities: ['TEXT', 'IMAGE'] } }
  ];
  let dernier = '';
  for (const corps of essais) {
    const r = await appel(url, corps);
    if (r.code === 200 && r.j) {
      const parts = (((r.j.candidates || [])[0] || {}).content || {}).parts || [];
      const p = parts.map(x => x.inlineData || x.inline_data).find(x => x && x.data);
      if (p) return { octets: Buffer.from(p.data, 'base64'), ext: EXT[p.mimeType || p.mime_type] || 'png' };
      dernier = 'réponse sans image';
      continue;
    }
    dernier = 'HTTP ' + r.code + (r.j && r.j.error && r.j.error.message ? ' — ' + String(r.j.error.message).slice(0, 160) : '');
    if (r.code !== 400) break;           // seul un 400 dit « ce format-là » : le reste ne s'arrange pas en réessayant
  }
  throw new Error(dernier);
}

/* les figures en attente du fragment : la figure entière (pour la retirer) et ce qu'elle doit montrer */
function figuresEnAttente(html) {
  const out = [];
  const re = /<figure\b[^>]*>(?:(?!<\/figure>)[\s\S])*?<img\b[^>]*\bdata-gemini="([^"]*)"[^>]*>(?:(?!<\/figure>)[\s\S])*?<\/figure>/g;
  for (const m of html.matchAll(re)) {
    const src = /\bsrc="([^"]+)"/.exec(m[0]);
    out.push({ bloc: m[0], description: m[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&'), src: src ? src[1] : null });
  }
  return out;
}

async function principal(slug, dossier) {
  const SOURCES = path.join(RACINE, 'contenu', 'blog');
  const fiche = JSON.parse(fs.readFileSync(path.join(SOURCES, 'articles.json'), 'utf8')).find(a => a.slug === slug);
  if (!fiche) throw new Error('article inconnu : ' + slug);
  const fragment = path.join(SOURCES, slug + '.htm');
  let html = fs.readFileSync(fragment, 'utf8');
  fs.mkdirSync(dossier, { recursive: true });
  const man = { couverture: null, figures: [], retirees: [], modele: null };
  const dire = t => console.log('blog-gemini : ' + t);

  const photos = path.join(SOURCES, 'photos');
  const dejaPhoto = fs.existsSync(photos) && fs.readdirSync(photos).some(f => f.startsWith(slug + '.'));
  const attente = figuresEnAttente(html);

  let mod = null;
  if (!CLE) dire('pas de clé GEMINI_API_KEY : couverture sans photo, figures en attente retirées');
  else if (!dejaPhoto || attente.length) {
    try { mod = await modele(); man.modele = mod; dire('modèle ' + mod); }
    catch (e) { dire('Gemini injoignable (' + e.message + ') : on publie sans ses images'); }
  }

  if (mod && !dejaPhoto && fiche.photo !== false) {
    try {
      const img = await dessiner(mod, promptCouverture(fiche), '4:5');
      fs.mkdirSync(photos, { recursive: true });
      man.couverture = path.join(photos, slug + '.' + img.ext);
      fs.writeFileSync(man.couverture, img.octets);
      dire('photo de couverture : ' + img.octets.length + ' octets');
    } catch (e) { dire('photo de couverture refusée (' + e.message + ') : le panneau seul'); }
  }

  for (const [i, f] of attente.entries()) {
    let fait = false;
    if (mod && f.src && f.src.startsWith('/blog/img/')) {
      try {
        const img = await dessiner(mod, promptFigure(f.description), '16:9');
        const brut = path.join(dossier, 'figure-' + i + '.' + img.ext);
        fs.writeFileSync(brut, img.octets);
        man.figures.push({ src: f.src, brut });
        html = html.replace(f.bloc, f.bloc.replace(/\s*data-gemini="[^"]*"/, ''));
        fait = true;
        dire('figure ' + f.src + ' : ' + img.octets.length + ' octets');
      } catch (e) { dire('figure ' + f.src + ' refusée (' + e.message + ')'); }
    }
    if (!fait) {
      /* ni figure vide ni image d'attente en ligne : le bloc part, son fichier aussi */
      html = html.replace(f.bloc, '');
      if (f.src && f.src.startsWith('/blog/img/')) { try { fs.unlinkSync(path.join(RACINE, f.src)); } catch (e) { /* déjà absent */ } }
      man.retirees.push(f.src);
    }
  }
  fs.writeFileSync(fragment, html.replace(/\n{3,}/g, '\n\n'));
  fs.writeFileSync(path.join(dossier, 'manifeste.json'), JSON.stringify(man, null, 1));
  return man;
}

module.exports = { choisirModele, figuresEnAttente, promptCouverture, promptFigure, CONSIGNES };

if (require.main === module) {
  const [slug, dossier] = process.argv.slice(2);
  if (!slug || !dossier) { console.error('usage : node scripts/blog-gemini.js <slug> <dossier-de-travail>'); process.exit(2); }
  principal(slug, dossier).catch(e => { console.error('blog-gemini : ' + e.message); process.exit(1); });
}
