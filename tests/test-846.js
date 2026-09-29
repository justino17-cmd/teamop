/* ⛔ CE QUE CE FICHIER GARDE — LE RÉFÉRENCEMENT DU SITE (Justin, 29 septembre 2026, avec son plan SEO : robots.txt,
   sitemap.xml, seo-head-snippet.html, pages-metiers.md — « Fais l'optimisation SEO avec les fichiers fournis ») :
   1. robots.txt et sitemap.xml À LA RACINE ; le plan du site est CELUI DU GÉNÉRATEUR (une page ajoutée y entre seule), il
      ne nomme que des pages qui existent et qui se référencent ;
   2. chaque page du site (générée, à la racine) : lang="fr", UNE adresse canonique — la sienne —, l'Open Graph complet
      (image qui existe), un titre et une description UNIQUES ; l'aperçu, lui, ne se référence pas (noindex, rien d'autre) ;
   3. le JSON-LD sur l'accueil SEULEMENT, du JSON valide, et ses prix sont ceux de la page Tarifs (FORMULES_GESTION) ;
   4. les quatre pages métier : dans le menu Métiers de CHAQUE page, dans le pied, dans le plan du site ; titre ≤ 60,
      description ≤ 155, un H1, 400 mots au moins, un lien vers les tarifs et vers l'inscription ; et ⛔ AUCUNE promesse que
      l'application ne tient pas (relu dans app.html le même soir) ;
   5. les pages voisines (portail, connexion, paiement, pages juridiques) : leur description, leur adresse canonique et leur
      Open Graph, posés SUR LA LIGNE DU TITRE — les pages juridiques sont citées par numéro de ligne (test-836 § 6) ;
   6. un seul H1 par page, sur toutes les pages publiques — les exceptions sont nommées.
   Pas de navigateur, pas de réseau : ce banc lit les fichiers du dépôt et le générateur. */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const existe = f => fs.existsSync(path.join(RACINE, f));
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const GEN = require('../scripts/site-marine.js');
const CLES = Object.keys(GEN.PAGES);
const SITE = 'https://teamop.fr/';
const METIERS = ['logiciel-anti-nuisibles', 'logiciel-plombier', 'logiciel-electricien', 'logiciel-chauffage-climatisation'];
/* le code d'une page : sans commentaires HTML ni de bloc (un motif de banc vise du CODE, CLAUDE.md) */
const code = s => s.replace(/<!--[\s\S]*?-->/g, ' ').replace(/\/\*[\s\S]*?\*\//g, ' ');
const tete = s => { const i = s.indexOf('</head>'); return i > 0 ? s.slice(0, i) : ''; };
const attr = (s, re) => [...s.matchAll(re)].map(m => m[1]);
const metas = (s, nom) => attr(tete(s), new RegExp(`<meta (?:name|property)="${nom.replace(/[.:]/g, m => '\\' + m)}" content="([^"]*)"`, 'g'));
const canoniques = s => attr(tete(s), /<link rel="canonical" href="([^"]*)"/g);
const dec = s => String(s).replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
const h1Hors = s => (code(s).replace(/<script[\s\S]*?<\/script>/g, ' ').match(/<h1\b/g) || []).length;
const fichierDe = u => u.startsWith(SITE) ? (u.slice(SITE.length) || 'index.html') : null;

console.log('\n══ 1. robots.txt ET sitemap.xml À LA RACINE ══\n');
{
  vrai('robots.txt existe à la racine', existe('robots.txt'));
  const r = existe('robots.txt') ? lire('robots.txt') : '';
  v('robots.txt : pour tous les robots, tout est permis sauf la connexion, le portail et l\'aperçu',
    [/^User-agent: \*$/m.test(r), /^Allow: \/$/m.test(r), ['/connexion.html', '/espace.html', '/apercu/'].filter(p => !new RegExp('^Disallow: ' + p.replace(/[./]/g, m => '\\' + m) + '$', 'm').test(r))], [true, true, []]);
  v('   ⛔ il ne ferme aucune page du site, ni le site entier', r.split('\n').filter(l => /^Disallow:/.test(l) && !/\/(connexion|espace)\.html$|\/apercu\/$/.test(l)), []);
  vrai('   il désigne le plan du site', /^Sitemap: https:\/\/teamop\.fr\/sitemap\.xml$/m.test(r));
  vrai('sitemap.xml existe à la racine', existe('sitemap.xml'));
  const x = existe('sitemap.xml') ? lire('sitemap.xml') : '';
  v('⛔ sitemap.xml est celui du générateur, à l\'octet (sinon : node scripts/site-marine.js --racine)', x === GEN.sitemap(), true);
  const urls = [...x.matchAll(/<url><loc>([^<]+)<\/loc><lastmod>(\d{4}-\d{2}-\d{2})<\/lastmod><priority>(0\.\d|1\.0)<\/priority><\/url>/g)].map(m => m[1]);
  v('   chaque entrée est complète (adresse, date, priorité) — population', [urls.length >= 14, urls.length === (x.match(/<url>/g) || []).length], [true, true]);
  v('   aucune adresse en double', urls.length, new Set(urls).size);
  v('   ⛔ chaque adresse désigne une page QUI EXISTE', urls.filter(u => !fichierDe(u) || !existe(fichierDe(u))), []);
  v('   chaque page du site y est, pages métier comprises', CLES.filter(c => urls.indexOf(GEN.urlDe(c)) < 0), []);
  v('   ⛔ rien qui ne se référence pas (application, aperçu, portail, connexion, paiement, erreur)',
    urls.filter(u => /\/(apercu\/.*|(app|beta|tour|messages|messages-beta|espace|connexion|reinit|recap-abonnement|merci|404|dev|diag-geste)\.html)$/.test(u)), []);
  v('   l\'accueil est « https://teamop.fr/ », jamais « /index.html »', [urls.indexOf(SITE) >= 0, urls.some(u => /index\.html$/.test(u))], [true, false]);
  v('   la page anti-nuisibles en priorité 0,9 (son plan)', /logiciel-anti-nuisibles\.html<\/loc><lastmod>[^<]+<\/lastmod><priority>0\.9</.test(x), true);
}

console.log('\n══ 2. CHAQUE PAGE DU SITE : lang, canonique, Open Graph, titre et description uniques ══\n');
const titres = {}, descs = {};
for (const c of CLES) {
  const f = c + '.html', s = existe(f) ? lire(f) : '', t = tete(s), u = GEN.urlDe(c);
  vrai(f + ' : générée à l\'identique (sinon : node scripts/site-marine.js --racine)', s === GEN.page(c, { racine: true }));
  vrai(f + ' : <html lang="fr">', /^<!DOCTYPE html>\n<html lang="fr">/.test(s));
  v(f + ' : UNE adresse canonique, la sienne', canoniques(s), [u]);
  v(f + ' : og:url = la canonique, og:type, og:locale, og:site_name', [metas(s, 'og:url'), metas(s, 'og:type'), metas(s, 'og:locale'), metas(s, 'og:site_name')], [[u], ['website'], ['fr_FR'], ['TEAM OP']]);
  const ot = metas(s, 'og:title'), od = metas(s, 'og:description'), oi = metas(s, 'og:image');
  v(f + ' : og:title, og:description, og:image, un de chaque, non vides', [ot.length, od.length, oi.length, !!(ot[0] && od[0])], [1, 1, 1, true]);
  vrai(f + ' : l\'image de partage existe dans le dépôt, avec ses dimensions et son texte', oi[0] && existe(fichierDe(oi[0]) || '-') && metas(s, 'og:image:width').length === 1 && metas(s, 'og:image:height').length === 1 && (metas(s, 'og:image:alt')[0] || '').length > 10);
  v(f + ' : grande carte de partage, robots « index, follow »', [metas(s, 'twitter:card'), metas(s, 'robots')], [['summary_large_image'], ['index, follow, max-image-preview:large']]);
  const ti = attr(t, /<title>([^<]*)<\/title>/g), de = metas(s, 'description');
  v(f + ' : un titre et une description, non vides', [ti.length, de.length, !!(ti[0] && de[0])], [1, 1, true]);
  (titres[dec(ti[0])] = titres[dec(ti[0])] || []).push(f); (descs[dec(de[0])] = descs[dec(de[0])] || []).push(f);
  v(f + ' : un seul H1', h1Hors(s), 1);
  v(f + ' : JSON-LD sur l\'accueil seulement', (s.match(/<script type="application\/ld\+json">/g) || []).length, c === 'index' ? 1 : 0);
  /* l'aperçu : ne se référence pas, n'a ni canonique ni Open Graph à lui */
  const a = existe('apercu/site/' + f) ? lire('apercu/site/' + f) : '';
  v('apercu/site/' + f + ' : « noindex », ni canonique, ni Open Graph, ni JSON-LD',
    [/<meta name="robots" content="noindex">/.test(a), canoniques(a).length, metas(a, 'og:url').length, /application\/ld\+json/.test(a)], [true, 0, 0, false]);
}
/* l'accueil : le titre et la description du fichier SEO de Justin */
v('index.html : le titre de son fichier', dec(attr(tete(lire('index.html')), /<title>([^<]*)<\/title>/g)[0]), 'TEAM OP — Logiciel de gestion pour entreprises de terrain');

console.log('\n══ 3. LE JSON-LD DE L\'ACCUEIL ══\n');
{
  const s = lire('index.html'), m = /<script type="application\/ld\+json">\n([\s\S]*?)\n<\/script>/.exec(tete(s));
  vrai('le JSON-LD est dans <head>', !!m);
  let j = null; try { j = JSON.parse(m ? m[1] : ''); } catch (e) {}
  vrai('   c\'est du JSON valide, schema.org', j && j['@context'] === 'https://schema.org' && Array.isArray(j['@graph']));
  const g = (j && j['@graph']) || [], de = t => g.find(x => x['@type'] === t) || {};
  v('   l\'organisation : TEAM OP, son adresse, son logo (qui existe), son fondateur, son courriel',
    [de('Organization').name, de('Organization').url, existe(fichierDe(de('Organization').logo || '') || '-'), (de('Organization').founder || {}).name, de('Organization').email],
    ['TEAM OP', SITE, true, 'Justin Biret', 'support@teamop.fr']);
  v('   le site : en français, publié par l\'organisation', [de('WebSite').inLanguage, (de('WebSite').publisher || {})['@id']], ['fr-FR', de('Organization')['@id']]);
  const app = de('SoftwareApplication');
  v('   l\'application : OP GESTION, sa page (qui existe)', [app.name, existe(fichierDe(app.url || '') || '-')], ['OP GESTION', true]);
  v('   ⛔ ses offres sont celles de la page Tarifs (FORMULES_GESTION) — noms et prix, en euros',
    (app.offers || []).map(o => [o['@type'], o.name, o.price, o.priceCurrency]), GEN.FORMULES_GESTION.map(f => ['Offer', f.nom, f.prix, 'EUR']));
  v('   (population) quatre formules, dont une gratuite', [(app.offers || []).length, (app.offers || []).filter(o => o.price === '0').length], [4, 1]);
}

console.log('\n══ 4. LES QUATRE PAGES MÉTIER ══\n');
for (const c of METIERS) {
  const f = c + '.html', P = GEN.PAGES[c] || {}, s = existe(f) ? lire(f) : '';
  vrai(f + ' : existe, dans le générateur, dans la rubrique Métiers', existe(f) && !!GEN.PAGES[c] && P.section === 'metiers');
  v(f + ' : titre ≤ 60 caractères (' + (P.titre || '').length + '), description ≤ 155 (' + (P.desc || '').length + ')', [(P.titre || '').length <= 60, (P.desc || '').length <= 155], [true, true]);
  const main = s.slice(s.indexOf('<main>'), s.indexOf('</main>'));
  const mots = main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(w => /[a-zà-ÿ0-9]/i.test(w)).length;
  vrai(f + ' : 400 mots au moins (' + mots + ')', mots >= 400);
  vrai(f + ' : un lien vers les tarifs et vers l\'inscription (Créer mon compte gratuit)', /href="tarifs\.html"/.test(main) && /<a class="bouton" href="\/espace\.html">Créer mon compte gratuit<\/a>/.test(main));
  vrai(f + ' : le menu Métiers de la page le désigne comme courant', /<a href="metiers\.html" data-fly="metiers" aria-haspopup="true" aria-expanded="false" aria-current="page">Métiers<\/a>/.test(s));
}
{
  const menu = GEN.VOLETS.metiers.grands.map(l => l.href);
  v('le menu Métiers mène aux quatre pages (dans l\'ordre du plan)', menu, METIERS.map(c => c + '.html'));
  const manques = [];
  for (const c of CLES) { const s = lire(c + '.html'), fly = (s.match(/<div class="fly" id="fly-metiers">[\s\S]*?<\/div><\/div><\/div><\/div>/) || [''])[0], pied = (s.match(/<footer class="pied">[\s\S]*<\/footer>/) || [''])[0];
    for (const m of METIERS) { if (fly.indexOf('href="' + m + '.html"') < 0) manques.push(c + ' (menu) → ' + m); if (pied.indexOf('href="' + m + '.html"') < 0) manques.push(c + ' (pied) → ' + m); } }
  v('   ⛔ chaque page du site porte les quatre pages dans son volet Métiers ET dans son pied (population : ' + CLES.length + ' pages)', manques, []);
  /* ⛔ AUCUNE PROMESSE QUE L'APPLICATION NE TIENT PAS — relu dans app.html v763 le 29 septembre au soir, affirmation par
     affirmation : la synchro prend quelques secondes ; les contrats planifient au clic ; la caméra lit une étiquette ; pas
     de relance automatique ; pas de module chantier ; box et registre sont du métier 3D seulement */
  const INTERDIT = [[/temps réel/i, '« temps réel »'], [/code-barres?/i, 'code-barres'], [/rappels? d.échéance/i, 'rappel d\'échéance'],
    [/passages? automatiques?/i, 'passage automatique'], [/relances? automatiques?/i, 'relance automatique'], [/suivi de chantier|gestion de chantier/i, 'module chantier'],
    [/inviolable/i, '« inviolable »'], [/camion/i, 'une box « camion »']];
  const texte = s => code(s.slice(s.indexOf('<main>'), s.indexOf('</main>'))).replace(/<[^>]+>/g, ' ');
  const fautes = [];
  for (const c of METIERS) { const t = texte(lire(c + '.html'));
    for (const [re, nom] of INTERDIT) if (re.test(t)) fautes.push(c + ' : ' + nom);
    if (c !== 'logiciel-anti-nuisibles') {
      for (const [re, nom] of [[/\bbox\b/i, 'box'], [/registre/i, 'registre sanitaire'], [/biocide|appât|nuisible|dératisation/i, 'vocabulaire 3D']]) if (re.test(t)) fautes.push(c + ' : ' + nom);
      if (/captures\/(iphone-intervention|iphone-box|mac-planning)/.test(lire(c + '.html'))) fautes.push(c + ' : une capture de l\'entreprise 3D de démonstration');
    } }
  v('⛔ aucune promesse que l\'application ne tient pas, et rien du 3D chez les autres métiers', fautes, []);
  const prix = c => (lire(c + '.html').match(/<span class="prix-metier">([^<]*)<\/span>/g) || []).map(x => x.replace(/<[^>]+>/g, ''));
  v('   les prix des formules sur les pages métier sont ceux de la page Tarifs', METIERS.map(c => prix(c).map(x => x.split(' ')[0])),
    METIERS.map(() => ['gratuit', 'pro', 'business'].map(k => GEN.FORMULES_GESTION.find(f => f.cle === k).prix)));
}

console.log('\n══ 5. LES PAGES VOISINES : description, canonique, Open Graph — SUR LA LIGNE DU TITRE ══\n');
const VOISINES = ['espace.html', 'connexion.html', 'reinit.html', 'recap-abonnement.html', 'merci.html', 'mentions-legales.html', 'confidentialite.html', 'sous-traitance.html', 'registre-traitements.html'];
for (const f of VOISINES) {
  const s = lire(f), t = tete(s), u = SITE + f;
  vrai(f + ' : <html lang="fr">', /<html lang="fr">/.test(s));
  const de = metas(s, 'description');
  v(f + ' : une description (≤ 155), UNE canonique — la sienne —, og:url identique', [de.length, (de[0] || '').length <= 155, canoniques(s), metas(s, 'og:url')], [1, true, [u], [u]]);
  const ti = attr(t, /<title>([^<]*)<\/title>/g);
  v(f + ' : og:title = son titre, og:description = sa description, l\'image existe', [dec(metas(s, 'og:title')[0] || ''), metas(s, 'og:description')[0], existe(fichierDe(metas(s, 'og:image')[0] || '') || '-')], [dec(ti[0] || '-'), de[0], true]);
  const ligneTitre = t.split('\n').findIndex(l => l.includes('<title>')), ligneCan = t.split('\n').findIndex(l => l.includes('rel="canonical"'));
  vrai(f + ' : ⛔ tout est posé sur la ligne du titre (aucune ligne ajoutée : les pages juridiques sont citées par numéro)', ligneTitre >= 0 && ligneTitre === ligneCan);
  (titres[dec(ti[0])] = titres[dec(ti[0])] || []).push(f); (descs[dec(de[0])] = descs[dec(de[0])] || []).push(f);
}
{
  const s = lire('404.html');
  v('404.html : ⛔ PAS d\'adresse canonique (elle est servie à des adresses qui n\'existent pas), « noindex » gardé', [canoniques(s).length, /<meta name="robots" content="noindex">/.test(s)], [0, true]);
}
v('⛔ aucun titre en double entre les pages publiques (population : ' + Object.keys(titres).length + ')', Object.entries(titres).filter(([, l]) => l.length > 1).map(([t, l]) => t + ' : ' + l.join(', ')), []);
v('⛔ aucune description en double entre les pages publiques', Object.entries(descs).filter(([, l]) => l.length > 1).map(([t, l]) => t + ' : ' + l.join(', ')), []);
vrai('(population) les titres comptés couvrent le site et ses voisines', Object.keys(titres).length === CLES.length + VOISINES.length);

console.log('\n══ 6. UN SEUL H1 PAR PAGE — ET lang="fr" PARTOUT ══\n');
{
  /* exceptions nommées : reinit.html (trois ÉTAPES exclusives, une seule affichée — et « noindex »), connexion.html
     (« noindex » et fermée aux robots : son titre est la marque) ; le second H1 d'espace.html est dans le CONTRAT imprimable,
     une autre fenêtre (une chaîne de script, que h1Hors écarte) */
  const EXC = { 'reinit.html': 3, 'connexion.html': 0 };
  const publiques = CLES.map(c => c + '.html').concat(VOISINES, ['404.html']);
  v('chaque page publique a UN H1 (hors exceptions nommées, qui gardent leur compte)', publiques.map(f => [f, h1Hors(lire(f))]).filter(([f, n]) => n !== (f in EXC ? EXC[f] : 1)), []);
  const toutes = cp.execSync('git ls-files "*.html"', { cwd: RACINE }).toString().trim().split('\n').concat(METIERS.map(c => c + '.html'), METIERS.map(c => 'apercu/site/' + c + '.html'));
  vrai('(population) ' + toutes.length + ' pages', toutes.length >= 60);
  v('⛔ toutes les pages du dépôt portent <html lang="fr">', [...new Set(toutes)].filter(f => existe(f) && !/<html[^>]*\blang="fr"/.test(lire(f))), []);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
