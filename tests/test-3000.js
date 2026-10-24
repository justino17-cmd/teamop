/* ⛔ CE QUE CE FICHIER GARDE — LE BLOG DE teamop.fr/blog/ (24 octobre 2026).

   Justin a quitté BabyLoveGrowth (blog.teamop.fr, 600 €) : les quatre articles sont rapatriés dans le dépôt
   (`contenu/blog/`, non publié) et `scripts/blog.js` fabrique `blog/`. Ce banc tient :
     1. les sources sont saines (`verifier()` du générateur : slugs, dates, images, ancres, liens, balises interdites) ;
     2. ⛔ les pages servies SONT la sortie du générateur — on corrige `contenu/blog/` ou le générateur, jamais une page ;
     3. chaque article porte ce que Google lit : un seul h1, l'adresse canonique, les données structurées (BlogPosting,
        fil d'Ariane, FAQ quand l'article en a une), l'image de partage qui existe ;
     4. ⛔ aucun lien relatif ne survit sous /blog/ : l'en-tête et le pied du site écrivent « tarifs.html », qui y mènerait
        à /blog/tarifs.html ; et chaque lien vers le site mène à un fichier qui existe ;
     5. le plan du site, le flux RSS, l'assemblage et le pied du site connaissent le blog — et plus blog.teamop.fr ;
     6. la contre-épreuve : `verifier()` crie sur une image absente, une ancre morte, un téléphone, une promesse de hors-ligne. */
'use strict';
const fs = require('fs'), path = require('path');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const RACINE = path.join(__dirname, '..');
const B = require('../scripts/blog.js');
const S = require('../scripts/site-marine.js');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');

const tous = B.ARTICLES();
console.log('1. les sources');
vrai('population : au moins les quatre articles rapatriés (' + tous.length + ')', tous.length >= 4);
for (const s of ['gestion-des-interventions', 'ordre-de-travail', 'suivi-des-interventions', 'signature-electronique-devis'])
  vrai('l\'article rapatrié « ' + s + ' » est là (son adresse a déjà été partagée)', tous.some(a => a.slug === s));
v('verifier() ne trouve rien', B.verifier(tous), []);
v('le plus récent en tête', tous.map(a => a.date), tous.map(a => a.date).slice().sort().reverse());

console.log('2. les pages servies sont la sortie du générateur');
for (const a of tous) v('blog/' + a.slug + '.html identique', lire('blog/' + a.slug + '.html') === B.pageArticle(a, tous), true);
v('blog/index.html identique', lire('blog/index.html') === B.pageIndex(tous), true);
v('blog/flux.xml identique', lire('blog/flux.xml') === B.flux(tous), true);
const pagesBlog = fs.readdirSync(path.join(RACINE, 'blog')).filter(f => f.endsWith('.html'));
v('aucune page orpheline dans blog/', pagesBlog.sort(), tous.map(a => a.slug + '.html').concat('index.html').sort());

console.log('3. ce que Google lit');
for (const a of tous) {
  const h = lire('blog/' + a.slug + '.html');
  v(a.slug + ' : un seul h1', (h.match(/<h1\b/g) || []).length, 1);
  vrai(a.slug + ' : adresse canonique', h.includes(`<link rel="canonical" href="https://teamop.fr/blog/${a.slug}.html">`));
  const ld = JSON.parse(/<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/.exec(h)[1]);
  const types = ld['@graph'].map(x => x['@type']);
  vrai(a.slug + ' : BlogPosting et fil d\'Ariane', types.includes('BlogPosting') && types.includes('BreadcrumbList'));
  const faq = ld['@graph'].find(x => x['@type'] === 'FAQPage');
  v(a.slug + ' : la FAQ structurée a autant de questions que la fiche', faq ? faq.mainEntity.length : 0, (a.faq || []).length);
  vrai(a.slug + ' : chaque réponse de FAQ a un texte', !faq || faq.mainEntity.every(q => q.name && q.acceptedAnswer.text.length > 20));
  const og = /<meta property="og:image" content="https:\/\/teamop\.fr\/([^"]+)">/.exec(h);
  vrai(a.slug + ' : l\'image de partage existe', og && fs.existsSync(path.join(RACINE, og[1])));
  vrai(a.slug + ' : la date de publication est dite', h.includes(`<meta property="article:published_time" content="${a.date}">`));
}

console.log('4. les liens');
let liens = 0; const morts = [];
for (const f of pagesBlog) {
  const h = lire('blog/' + f);
  for (const m of h.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
    const u = m[1]; liens++;
    if (/^(https?:|mailto:|#)/.test(u)) { if (/^mailto:/.test(u) && u !== 'mailto:contact@teamop.fr') morts.push(f + ' → ' + u); continue; }
    if (!u.startsWith('/')) { morts.push(f + ' → relatif ' + u); continue; }
    const c = u.split(/[?#]/)[0];
    if (!fs.existsSync(path.join(RACINE, c.endsWith('/') ? c + 'index.html' : c))) morts.push(f + ' → ' + u);
  }
  for (const m of h.matchAll(/href="#([^"]+)"/g)) if (!h.includes(' id="' + m[1] + '"')) morts.push(f + ' → #' + m[1]);
}
vrai('population : ' + liens + ' liens relus', liens > 400);
v('aucun lien relatif, aucun lien mort', morts, []);
vrai('les liens extérieurs ne transmettent pas leur origine', pagesBlog.every(f => [...lire('blog/' + f).matchAll(/<a href="(https?:[^"]+)"([^>]*)>/g)].every(m => /^https:\/\/teamop\.fr/.test(m[1]) || /rel="noopener"/.test(m[2]))));

console.log('5. le site connaît le blog');
const plan = S.sitemap();
vrai('le plan du site liste l\'index du blog', plan.includes('<loc>https://teamop.fr/blog/</loc>'));
for (const a of tous) vrai('le plan du site liste ' + a.slug, plan.includes(`<loc>https://teamop.fr/blog/${a.slug}.html</loc><lastmod>${a.maj || a.date}</lastmod>`));
v('sitemap.xml est la sortie de site-marine.js', lire('sitemap.xml'), plan);
vrai('le flux RSS est du XML annoncé dans chaque page', lire('blog/flux.xml').startsWith('<?xml') && pagesBlog.every(f => lire('blog/' + f).includes('href="/blog/flux.xml"')));
vrai('l\'assemblage publie blog/', /for d in [^;]*\bblog\b/.test(lire('scripts/assembler-site.sh')));
vrai('⛔ l\'assemblage ne publie PAS contenu/ (les sources)', !/for d in [^;]*\bcontenu\b/.test(lire('scripts/assembler-site.sh')));
const racine = fs.readdirSync(RACINE).filter(f => f.endsWith('.html'));
v('plus aucune page de la racine ne mène à blog.teamop.fr', racine.filter(f => lire(f).includes('blog.teamop.fr')), []);
vrai('le pied du site mène à /blog/', lire('index.html').includes('<a href="/blog/">Blog</a>'));

console.log('6. la contre-épreuve : verifier() crie');
const faux = (o, attendu) => { const a = Object.assign({}, tous[0], o); const pb = B.verifier([a]); vrai('il voit : ' + attendu, pb.some(x => x.includes(attendu))); };
faux({ image: 'absente.webp' }, 'couverture absente');
faux({ date: '24/10/2026' }, 'date invalide');
faux({ slug: 'Avec Espace' }, 'slug invalide');
faux({ slug: 'article-sans-corps' }, 'corps absent');
const essai = (html, attendu) => { const orig = fs.readFileSync;
  fs.readFileSync = function (f, e) { return String(f).endsWith(tous[0].slug + '.html') && String(f).includes('contenu') ? html : orig.apply(fs, arguments); };
  try { vrai('il voit : ' + attendu, B.verifier([tous[0]]).some(x => x.includes(attendu))); } finally { fs.readFileSync = orig; } };
essai('<p><a href="#nulle-part">x</a></p>', 'ancre absente');
essai('<p>Appelez le <a href="tel:+33600000000">06</a></p>', 'mention interdite');
essai('<p>OP GESTION fonctionne même sans réseau.</p>', 'promesse de hors-ligne');
essai('<p><a href="/page-qui-nexiste-pas.html">x</a></p>', 'lien mort');
essai('<script>alert(1)</script>', 'balise interdite');

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
