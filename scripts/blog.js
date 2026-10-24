#!/usr/bin/env node
/* ══ LE GÉNÉRATEUR DU BLOG — teamop.fr/blog/ ══════════════════════════════════════════════════════════════════
   Justin, 24 octobre 2026 : BabyLoveGrowth (blog.teamop.fr) demandait 600 € ; « toi tu peux faire ce que BabyLoveGrowth
   fait » — « bah go le faire, je vais pas payer ». Les quatre articles publiés là-bas (21 → 24 octobre) sont rapatriés
   ici, textes et images, et les suivants s'écrivent directement dans le dépôt.

   CE QUI EST SOURCE, CE QUI EST FABRIQUÉ :
   · `contenu/blog/articles.json` — la fiche de chaque article (slug, titre, description, date, image de couverture,
     FAQ pour les données structurées). Le plus récent en tête.
   · `contenu/blog/<slug>.html` — le corps de l'article : un fragment HTML (h2, h3, p, listes, tableaux, figures).
     `contenu/` n'est PAS publié (`scripts/assembler-site.sh` est une liste blanche) : seules les pages fabriquées partent.
   · `blog/img/` — les images, en WebP 1200 × 675.
   · FABRIQUÉS ici, jamais retouchés à la main : `blog/index.html`, `blog/<slug>.html`, `blog/flux.xml` (RSS).
     Le plan du site (`sitemap.xml`) les reprend par `entreesSitemap()`, appelé depuis `scripts/site-marine.js`.

     node scripts/blog.js                 → écrit le blog
     node scripts/site-marine.js --racine → réécrit le sitemap (et les pages du site) — à relancer après un article neuf

   ⛔ L'EN-TÊTE ET LE PIED SONT CEUX DU SITE (`site-marine.js` les exporte) : un menu recopié divergerait au premier
   changement. Leurs liens sont RELATIFS (« tarifs.html ») parce que le site vit à la racine ; sous /blog/ ils mèneraient à
   /blog/tarifs.html — `absolus()` les ancre à la racine. Un `<base href="/">` aurait fait la même chose et cassé toutes
   les ancres de la table des matières (« #faq » serait parti vers l'accueil).
   ⛔ COMME SUR LE SITE : contact@ seul, jamais de téléphone ni l'adresse du support ; aucune promesse de « hors-ligne » ;
   un abonnement = un utilisateur ; OP MESSAGES « bientôt disponible ». Un article neuf se relit contre ces règles. */
'use strict';
const fs = require('fs'), path = require('path');
const S = require('./site-marine.js');
const RACINE = path.join(__dirname, '..');
const SOURCES = path.join(RACINE, 'contenu', 'blog');
const DEST = path.join(RACINE, 'blog');
const URL_BLOG = S.SITE_URL + 'blog/';
const { esc } = S;

const ARTICLES = () => JSON.parse(fs.readFileSync(path.join(SOURCES, 'articles.json'), 'utf8'))
  .sort((a, b) => b.date.localeCompare(a.date) || a.slug.localeCompare(b.slug));
/* les insécables de la typographie française (« : ; ! ? » et guillemets), posés dans le TEXTE seulement — jamais dans une balise */
const insecables = html => html.replace(/>([^<]+)</g, (m, t) => '>' + t.replace(/ ([:;!?»])/g, '\u202f$1').replace(/« /g, '«\u202f') + '<');
const corpsDe = slug => insecables(fs.readFileSync(path.join(SOURCES, slug + '.html'), 'utf8').trim());
const urlArticle = a => URL_BLOG + a.slug + '.html';
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const dateFr = iso => { const [y, m, d] = iso.split('-').map(Number); return d + (d === 1 ? 'er' : '') + ' ' + MOIS[m - 1] + ' ' + y; };
const texteDe = html => html.replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
const minutesDe = html => Math.max(1, Math.round(texteDe(html).split(' ').length / 220));
/* les liens relatifs de l'en-tête et du pied du site, ancrés à la racine (voir l'en-tête de ce fichier) */
const absolus = html => html.replace(/(\s(?:href|src)=")(?![a-z]+:|\/|#)([^"]+)"/g, '$1/$2"');

function tete(o) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
${S.TETE_MODE}
<title>${esc(o.titre)}</title>
<meta name="description" content="${esc(o.desc)}">
<link rel="canonical" href="${o.url}">
<meta name="robots" content="index, follow, max-image-preview:large">
<meta property="og:type" content="${o.type}">
<meta property="og:locale" content="fr_FR">
<meta property="og:site_name" content="TEAM OP">
<meta property="og:title" content="${esc(o.ogTitre || o.titre)}">
<meta property="og:description" content="${esc(o.desc)}">
<meta property="og:url" content="${o.url}">
<meta property="og:image" content="${o.image.url}">
<meta property="og:image:width" content="${o.image.l}">
<meta property="og:image:height" content="${o.image.h}">
<meta property="og:image:alt" content="${esc(o.image.alt)}">
${o.publie ? `<meta property="article:published_time" content="${o.publie}">\n<meta property="article:author" content="Justin Biret">\n` : ''}<meta name="twitter:card" content="summary_large_image">
<link rel="alternate" type="application/rss+xml" title="Blog TEAM OP" href="/blog/flux.xml">
<script type="application/ld+json">
${JSON.stringify(o.jsonld, null, 2).replace(/</g, '\\u003c')}
</script>
${S.ICONES('blog')}
<link rel="manifest" href="/manifest-teamop.webmanifest">
<link rel="stylesheet" href="${S.RES}site.css">
<link rel="stylesheet" href="${S.RES}blog.css">
${o.precharger ? `<link rel="preload" as="image" href="${o.precharger}" fetchpriority="high">\n` : ''}</head>
<body>
`;
}
function habiller(debut, main) {
  S.pourLaRacine(true);
  return debut + absolus(S.entete(null)) + `\n<main>\n${main}\n${S.commencer()}\n</main>\n` + absolus(S.pied())
    + `\n<script src="${S.RES}site.js" defer></script>\n<script src="/cookies.js" defer></script>\n</body>\n</html>\n`;
}

const ORGA = { '@type': 'Organization', '@id': S.SITE_URL + '#organisation', name: 'TEAM OP', url: S.SITE_URL, logo: S.SITE_URL + 'icons/teamop-192.png' };
const AUTEUR = { '@type': 'Person', name: 'Justin Biret', jobTitle: 'Fondateur de TEAM OP', url: S.SITE_URL + 'pourquoi.html' };
const imageDe = a => ({ url: URL_BLOG + 'img/' + a.image, l: 1200, h: 675, alt: a.imageAlt });

/* l'encart qui remplace celui de la plateforme, après le premier paragraphe — prix lu dans les formules du site, jamais recopié */
const encart = () => {
  const pro = S.FORMULES_GESTION.reduce((m, f) => Math.min(m, Number(f.prix)), Infinity);
  return `<aside class="billet-encart" aria-label="OP GESTION"><p class="surtitre">OP GESTION</p>
<p class="encart-titre">Interventions, planning, devis et factures, dans une seule application.</p>
<p>Pour les entreprises de terrain, sur téléphone, tablette et ordinateur. À partir de ${pro} € par mois et par utilisateur, sans engagement.</p>
<p class="encart-actions"><a class="bouton" href="/op-gestion.html">Découvrir OP GESTION</a><a class="lien-suite" href="/demo.html">Essayer la démonstration ›</a></p></aside>`;
};
const apresPremierParagraphe = (html, bloc) => { const i = html.indexOf('</p>'); return i < 0 ? bloc + html : html.slice(0, i + 4) + '\n' + bloc + '\n' + html.slice(i + 4); };

function pageArticle(a, tous) {
  const corps = corpsDe(a.slug), img = imageDe(a), url = urlArticle(a), min = minutesDe(corps);
  const autres = tous.filter(x => x.slug !== a.slug).slice(0, 3);
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'BlogPosting', '@id': url + '#article', headline: a.titre, description: a.description, image: { '@type': 'ImageObject', url: img.url, width: img.l, height: img.h },
      datePublished: a.date, dateModified: a.maj || a.date, inLanguage: 'fr-FR', mainEntityOfPage: url, author: AUTEUR, publisher: ORGA,
      wordCount: texteDe(corps).split(' ').length },
    { '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Accueil', item: S.SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Blog', item: URL_BLOG },
      { '@type': 'ListItem', position: 3, name: a.titre, item: url }] }]
    .concat(a.faq && a.faq.length ? [{ '@type': 'FAQPage', mainEntity: a.faq.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.r } })) }] : []) };
  const main = `<article class="billet">
<nav class="fil" aria-label="Fil d'Ariane"><a href="/">Accueil</a><span aria-hidden="true">›</span><a href="/blog/">Blog</a></nav>
<header class="billet-tete">
<h1>${S.fr(a.titre)}</h1>
<p class="billet-meta">Par Justin Biret · <time datetime="${a.date}">${dateFr(a.date)}</time> · ${min} min de lecture</p>
</header>
<figure class="billet-couverture"><img src="/blog/img/${a.image}" alt="${esc(a.imageAlt)}" width="1200" height="675" fetchpriority="high" decoding="async"></figure>
<div class="billet-corps">
${apresPremierParagraphe(corps, encart())}
</div>
<footer class="billet-auteur"><img src="/icons/teamop-192.png" width="48" height="48" alt="" loading="lazy"><div><b>Justin Biret</b><span>Fondateur de TEAM OP. Une question sur cet article : <a href="mailto:contact@teamop.fr">contact@teamop.fr</a></span></div></footer>
</article>
${autres.length ? `<section class="blog-suite" aria-labelledby="a-lire"><h2 id="a-lire">À lire aussi</h2><div class="blog-grille">${autres.map(carte).join('')}</div></section>` : ''}`;
  return habiller(tete({ titre: a.titre + ' | Blog TEAM OP', ogTitre: a.titre, desc: a.description, url, type: 'article', image: img, publie: a.date, jsonld, precharger: '/blog/img/' + a.image }), main);
}

const carte = a => `<a class="blog-carte" href="/blog/${a.slug}.html"><img src="/blog/img/${a.image}" alt="" width="1200" height="675" loading="lazy" decoding="async"><span class="blog-carte-texte"><time datetime="${a.date}">${dateFr(a.date)}</time><b>${S.fr(a.titre)}</b><span>${S.fr(a.description)}</span></span></a>`;

function pageIndex(tous) {
  const desc = 'Conseils pour les entreprises de terrain : gestion des interventions, ordres de travail, devis, factures, stock et organisation des équipes. Par TEAM OP.';
  const jsonld = { '@context': 'https://schema.org', '@graph': [
    { '@type': 'Blog', '@id': URL_BLOG + '#blog', name: 'Blog TEAM OP', url: URL_BLOG, description: desc, inLanguage: 'fr-FR', publisher: ORGA,
      blogPost: tous.map(a => ({ '@type': 'BlogPosting', headline: a.titre, url: urlArticle(a), datePublished: a.date, image: imageDe(a).url, author: AUTEUR })) }] };
  const [une, ...reste] = tous;
  const main = `<section class="scene courte"><p class="surtitre">Blog</p><h1>Le terrain, mieux organisé.</h1><p class="chapeau">Méthodes, outils et retours d'expérience pour les entreprises qui travaillent chez leurs clients.</p></section>
<section class="blog-liste" aria-label="Articles">
${une ? `<a class="blog-une" href="/blog/${une.slug}.html"><img src="/blog/img/${une.image}" alt="" width="1200" height="675" fetchpriority="high" decoding="async"><span class="blog-carte-texte"><time datetime="${une.date}">${dateFr(une.date)}</time><b>${S.fr(une.titre)}</b><span>${S.fr(une.description)}</span><span class="lien-suite">Lire l'article ›</span></span></a>` : ''}
${reste.length ? `<div class="blog-grille">${reste.map(carte).join('')}</div>` : ''}
</section>`;
  const img = une ? imageDe(une) : S.IMAGE_PARTAGE;
  return habiller(tete({ titre: 'Blog TEAM OP — conseils pour les entreprises de terrain', desc, url: URL_BLOG, type: 'website', image: img, jsonld }), main);
}

function flux(tous) {
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const rfc = iso => new Date(iso + 'T08:00:00+02:00').toUTCString();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>Blog TEAM OP</title>
<link>${URL_BLOG}</link>
<atom:link href="${URL_BLOG}flux.xml" rel="self" type="application/rss+xml"/>
<description>Conseils pour les entreprises de terrain, par TEAM OP.</description>
<language>fr-FR</language>
${tous.length ? `<lastBuildDate>${rfc(tous[0].date)}</lastBuildDate>\n` : ''}${tous.map(a => `<item>
<title>${x(a.titre)}</title>
<link>${urlArticle(a)}</link>
<guid isPermaLink="true">${urlArticle(a)}</guid>
<pubDate>${rfc(a.date)}</pubDate>
<description>${x(a.description)}</description>
<enclosure url="${URL_BLOG}img/${a.image}" type="image/webp" length="${fs.existsSync(path.join(DEST, 'img', a.image)) ? fs.statSync(path.join(DEST, 'img', a.image)).size : 0}"/>
</item>`).join('\n')}
</channel>
</rss>
`;
}

/* pour `sitemap()` de site-marine.js : [adresse, priorité, date] */
function entreesSitemap() {
  const tous = ARTICLES();
  return [[URL_BLOG, '0.7', tous.length ? tous[0].date : '2026-10-24']].concat(tous.map(a => [urlArticle(a), '0.6', a.maj || a.date]));
}

/* les contrôles qui ne demandent pas de navigateur — `tests/test-2900.js` les relance */
function verifier(tous) {
  const pb = [];
  const slugs = new Set();
  for (const a of tous) {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(a.slug)) pb.push(a.slug + ' : slug invalide');
    if (slugs.has(a.slug)) pb.push(a.slug + ' : slug en double'); slugs.add(a.slug);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(a.date)) pb.push(a.slug + ' : date invalide');
    if (!a.titre || a.titre.length > 70) pb.push(a.slug + ' : titre absent ou trop long (' + (a.titre || '').length + ')');
    if (!a.description || a.description.length > 170) pb.push(a.slug + ' : description absente ou trop longue');
    if (!fs.existsSync(path.join(DEST, 'img', a.image))) pb.push(a.slug + ' : couverture absente ' + a.image);
    if (!a.imageAlt) pb.push(a.slug + ' : couverture sans texte alternatif');
    if (!fs.existsSync(path.join(SOURCES, a.slug + '.html'))) { pb.push(a.slug + ' : corps absent (contenu/blog/' + a.slug + '.html)'); continue; }
    const c = corpsDe(a.slug);
    for (const m of c.matchAll(/src="([^"]+)"/g)) if (!m[1].startsWith('/blog/img/') || !fs.existsSync(path.join(RACINE, m[1]))) pb.push(a.slug + ' : image ' + m[1]);
    const ids = new Set([...c.matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
    for (const m of c.matchAll(/href="#([^"]+)"/g)) if (!ids.has(m[1])) pb.push(a.slug + ' : ancre absente #' + m[1]);
    for (const m of c.matchAll(/href="(\/[^"#?]*)/g)) {
      const f = m[1].endsWith('/') ? m[1] + 'index.html' : m[1];
      const ok = fs.existsSync(path.join(RACINE, f)) || (f.startsWith('/blog/') && slugs.has(f.slice(6).replace(/\.html$/, ''))) || tous.some(x => '/blog/' + x.slug + '.html' === f);
      if (!ok) pb.push(a.slug + ' : lien mort ' + m[1]);
    }
    if (/<(script|style|iframe)\b/i.test(c)) pb.push(a.slug + ' : balise interdite dans le corps');
    if (/\bon[a-z]+=/i.test(c)) pb.push(a.slug + ' : gestionnaire d\'événement dans le corps');
    if (/<h1\b/i.test(c)) pb.push(a.slug + ' : un seul h1, celui de la page');
    if (/tel:|babylovegrowth|blog\.teamop\.fr/i.test(c)) pb.push(a.slug + ' : mention interdite (téléphone, ancienne plateforme)');
    /* une PROMESSE de hors-ligne (retirée du site le 23 septembre 2026) — parler du critère en général reste permis */
    if (/même sans réseau|(?:OP GESTION|l['’]application)[^.]{0,60}(?:hors[- ]ligne|hors connexion|sans réseau)/i.test(c)) pb.push(a.slug + ' : promesse de hors-ligne');
    if (/mailto:(?!contact@teamop\.fr")/.test(c)) pb.push(a.slug + ' : seule contact@ est permise');
  }
  return pb;
}

if (require.main === module) {
  const tous = ARTICLES();
  const pb = verifier(tous);
  if (pb.length) { console.error('✗ le blog ne part pas :\n  ' + pb.join('\n  ')); process.exit(1); }
  fs.mkdirSync(DEST, { recursive: true });
  /* les pages d'un article retiré de la liste ne restent pas en ligne en silence */
  for (const f of fs.readdirSync(DEST)) if (f.endsWith('.html') && f !== 'index.html' && !tous.some(a => a.slug + '.html' === f)) { fs.unlinkSync(path.join(DEST, f)); console.log('− blog/' + f); }
  for (const a of tous) { fs.writeFileSync(path.join(DEST, a.slug + '.html'), pageArticle(a, tous)); console.log('✓ blog/' + a.slug + '.html'); }
  fs.writeFileSync(path.join(DEST, 'index.html'), pageIndex(tous)); console.log('✓ blog/index.html');
  fs.writeFileSync(path.join(DEST, 'flux.xml'), flux(tous)); console.log('✓ blog/flux.xml');
}
module.exports = { ARTICLES, pageArticle, pageIndex, flux, entreesSitemap, verifier, absolus, corpsDe };
