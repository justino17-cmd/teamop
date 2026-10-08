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
   6. un seul H1 par page, sur toutes les pages publiques — les exceptions sont nommées ;
   7. (même soir, « fait tout ça ») une description de 155 signes au plus sur TOUTES les pages publiques ; l'image de
      partage lue dans le FICHIER — JPEG ou PNG (LinkedIn lit mal le WebP), suivie par git, 1200 × 630 réels, ≤ 300 Ko,
      les dimensions déclarées exactes sur chaque page ; « temps réel » et « instantané » réservés à OP MESSAGES, chaque
      emploi NOMMÉ ; et aucune promesse que l'application ne tient pas, sur aucune page publique.
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
const METIERS = ['logiciel-anti-nuisibles', 'logiciel-plombier', 'logiciel-electricien', 'logiciel-chauffage-climatisation', 'logiciel-nettoyage'];
/* les pages par fonction (29 septembre 2026 au soir) : mêmes exigences que les pages métier, dans la rubrique Applications */
const FONCTIONS = ['logiciel-planning-interventions', 'logiciel-gestion-de-stock', 'logiciel-devis-factures', 'logiciel-bons-de-commande', 'logiciel-pointage', 'logiciel-registre-sanitaire'];
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
    ['TEAM OP', SITE, true, 'Justin Biret', 'contact@teamop.fr']);
  /* Justin, 8 octobre 2026 : contact@ pour une question ou une demande, support@ pour un problème sur une application */
  v('   ⛔ son adresse est celle du CONTACT, et le support est un point de contact à part', (de('Organization').contactPoint || []).map(p => [p['@type'], p.contactType, p.email]),
    [['ContactPoint', 'customer support', 'support@teamop.fr']]);
  v('   le site : en français, publié par l\'organisation', [de('WebSite').inLanguage, (de('WebSite').publisher || {})['@id']], ['fr-FR', de('Organization')['@id']]);
  const app = de('SoftwareApplication');
  v('   l\'application : OP GESTION, sa page (qui existe)', [app.name, existe(fichierDe(app.url || '') || '-')], ['OP GESTION', true]);
  v('   ⛔ ses offres sont celles de la page Tarifs (FORMULES_GESTION) — noms et prix, en euros',
    (app.offers || []).map(o => [o['@type'], o.name, o.price, o.priceCurrency]), GEN.FORMULES_GESTION.map(f => ['Offer', f.nom, f.prix, 'EUR']));
  v('   (population) trois formules, aucune gratuite (Justin, 29 septembre 2026 : « je veux que l\'application soit payante directement »)', [(app.offers || []).length, (app.offers || []).filter(o => +o.price === 0).length], [3, 0]);
}

/* ⛔ L'ACCUEIL A DE QUOI ÊTRE LU — Justin, 8 octobre 2026, avec l'analyse de site d'IONOS (« votre page d'accueil dispose de peu de contenu
   avec 414 mots ; 500 mots au moins sont recommandés »). Compté comme les pages métier (le seul `<main>`) : 181 mots avant les cartes
   des fonctions et des métiers, dont les liens mènent chacun à sa page. */
{
  const s = lire('index.html'), main = s.slice(s.indexOf('<main>'), s.indexOf('</main>'));
  const mots = main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(w => /[a-zà-ÿ0-9]/i.test(w)).length;
  vrai('l\'accueil : 450 mots au moins dans son contenu, menus et pied à part (' + mots + ') — l\'outil d\'IONOS, qui compte la page entière, en demande 500', mots >= 450);
  const vers = [...main.matchAll(/<a class="teaser" href="(logiciel-[a-z-]+)\.html">/g)].map(m => m[1]);
  v('   il mène à CHAQUE page par fonction et par métier (une carte chacune)', vers.slice().sort(), CLES.filter(c => c.startsWith('logiciel-')).sort());
}

console.log('\n══ 4. LES CINQ PAGES MÉTIER ══\n');
for (const c of METIERS) {
  const f = c + '.html', P = GEN.PAGES[c] || {}, s = existe(f) ? lire(f) : '';
  vrai(f + ' : existe, dans le générateur, dans la rubrique Métiers', existe(f) && !!GEN.PAGES[c] && P.section === 'metiers');
  v(f + ' : titre ≤ 60 caractères (' + (P.titre || '').length + '), description ≤ 155 (' + (P.desc || '').length + ')', [(P.titre || '').length <= 60, (P.desc || '').length <= 155], [true, true]);
  const main = s.slice(s.indexOf('<main>'), s.indexOf('</main>'));
  const mots = main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(w => /[a-zà-ÿ0-9]/i.test(w)).length;
  vrai(f + ' : 400 mots au moins (' + mots + ')', mots >= 400);
  vrai(f + ' : un lien vers les tarifs et vers l\'inscription (Créer mon compte)', /href="tarifs\.html"/.test(main) && /<a class="bouton" href="\/espace\.html">Créer mon compte<\/a>/.test(main));
  vrai(f + ' : le menu Métiers de la page le désigne comme courant', /<a href="metiers\.html" data-fly="metiers" aria-haspopup="true" aria-expanded="false" aria-current="page">Métiers<\/a>/.test(s));
}
{
  const menu = GEN.VOLETS.metiers.grands.map(l => l.href);
  v('le menu Métiers mène aux cinq pages (dans l\'ordre du plan)', menu, METIERS.map(c => c + '.html'));
  const manques = [];
  for (const c of CLES) { const s = lire(c + '.html'), fly = (s.match(/<div class="fly" id="fly-metiers">[\s\S]*?<\/div><\/div><\/div><\/div>/) || [''])[0], pied = (s.match(/<footer class="pied">[\s\S]*<\/footer>/) || [''])[0];
    for (const m of METIERS) { if (fly.indexOf('href="' + m + '.html"') < 0) manques.push(c + ' (menu) → ' + m); if (pied.indexOf('href="' + m + '.html"') < 0) manques.push(c + ' (pied) → ' + m); } }
  v('   ⛔ chaque page du site porte les cinq pages dans son volet Métiers ET dans son pied (population : ' + CLES.length + ' pages)', manques, []);
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
    METIERS.map(() => ['pro', 'business', 'premium'].map(k => GEN.FORMULES_GESTION.find(f => f.cle === k).prix)));
}

console.log('\n══ 4 bis. LES SIX PAGES PAR FONCTION ══\n');
for (const c of FONCTIONS) {
  const f = c + '.html', P = GEN.PAGES[c] || {}, s = existe(f) ? lire(f) : '';
  vrai(f + ' : existe, dans le générateur, dans la rubrique Applications', existe(f) && !!GEN.PAGES[c] && P.section === 'applications');
  v(f + ' : titre ≤ 60 caractères (' + (P.titre || '').length + '), description ≤ 155 (' + (P.desc || '').length + ')', [(P.titre || '').length <= 60, (P.desc || '').length <= 155], [true, true]);
  const main = s.slice(s.indexOf('<main>'), s.indexOf('</main>'));
  const mots = main.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(w => /[a-zà-ÿ0-9]/i.test(w)).length;
  vrai(f + ' : 400 mots au moins (' + mots + ')', mots >= 400);
  v(f + ' : un seul H1', (main.match(/<h1[\s>]/g) || []).length, 1);
  vrai(f + ' : un lien vers les tarifs et vers l\'inscription (Créer mon compte)', /href="tarifs\.html"/.test(main) && /<a class="bouton" href="\/espace\.html">Créer mon compte<\/a>/.test(main));
  vrai(f + ' : dans le plan du site', lire('sitemap.xml').indexOf('<loc>' + SITE + f + '</loc>') >= 0);
}
{
  const petits = GEN.VOLETS.applications.petits.map(l => l.href);
  v('le menu Applications mène aux six pages par fonction', FONCTIONS.filter(c => petits.indexOf(c + '.html') < 0), []);
  const manques = [];
  for (const c of CLES) { const s = lire(c + '.html'), pied = (s.match(/<footer class="pied">[\s\S]*<\/footer>/) || [''])[0];
    for (const m of FONCTIONS) if (pied.indexOf('href="' + m + '.html"') < 0) manques.push(c + ' (pied) → ' + m); }
  v('   chaque page du site les porte dans son pied (population : ' + CLES.length + ' pages)', manques, []);
  /* ⛔ LA FORMULE DITE EST CELLE QUI OUVRE LA FONCTION (PLAN_BLOQUE d'app.html) : le stock, les bons de commande et l'écran
     Registre ne sont pas dans Pro ; le pointage, les devis et les factures y sont. Une page qui promet une fonction à une
     formule qui ne l'ouvre pas vend ce qu'on ne livrera pas. Les cartes vont de Pro à Business Premium : plus de Gratuit
     sur le site (Justin, 29 septembre 2026). */
  const cartes = c => (lire(c + '.html').match(/<div class="carte-v">[\s\S]*?<\/div>/g) || []).map(x => x.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '));
  const faux = [];
  for (const [c, fermePro] of [['logiciel-gestion-de-stock', 1], ['logiciel-bons-de-commande', 1], ['logiciel-registre-sanitaire', 1],
      ['logiciel-pointage', 0], ['logiciel-devis-factures', 0]]) {
    const k = cartes(c);
    if (k.length !== 3) { faux.push(c + ' : ' + k.length + ' cartes'); continue; }
    if (!/^\s*Pro\b/.test(k[0]) || !/^\s*Business\s+\d/.test(k[1]) || !/^\s*Business Premium\b/.test(k[2])) faux.push(c + ' : les cartes ne sont pas Pro, Business, Business Premium');
    if (fermePro && !/^\s*Pro\b[\s\S]*\bPas d/.test(k[0])) faux.push(c + ' : la carte Pro ne dit pas que la fonction n\'y est pas');
    if (!fermePro && /\bPas d/.test(k[0])) faux.push(c + ' : la carte Pro dit « pas de » alors que la fonction y est');
  }
  v('   ⛔ chaque page dit dans quelle formule la fonction commence (population : 5 pages, 3 cartes chacune — Pro, Business, Business Premium)', faux, []);
  const gratuites = METIERS.concat(FONCTIONS).filter(c => cartes(c).some(x => /^\s*Gratuit\b|Tout Gratuit/.test(x)));
  v('   ⛔ aucune page métier ni par fonction ne propose encore une carte « Gratuit » (population : ' + (METIERS.length + FONCTIONS.length) + ' pages)', gratuites, []);
  /* ⛔ ET LE 3D RESTE AU 3D : les box et le registre ne se promettent qu'en les rattachant au métier 3D */
  const t = c => code(lire(c + '.html').slice(lire(c + '.html').indexOf('<main>'), lire(c + '.html').indexOf('</main>'))).replace(/<[^>]+>/g, ' ');
  v('   la page registre dit qu\'elle est pour le métier 3D, la page stock rattache les box aux entreprises 3D',
    [/pour le métier 3D/.test(t('logiciel-registre-sanitaire')), /entreprises anti-nuisibles \(3D\) y ajoutent des box/.test(t('logiciel-gestion-de-stock'))], [true, true]);
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
  /* le fichier de validation de Google Search Console (Justin, 29 septembre 2026) : son contenu est IMPOSÉ par Google, une
     ligne sans balise — et Google demande de ne jamais le retirer, sinon la propriété du site est perdue. Nommé, pas par un
     motif : un second fichier « google….html » serait une décision à prendre, pas un passe-droit */
  const SANS_HTML = { 'google151be914dcdfaf7e.html': 'google-site-verification: google151be914dcdfaf7e.html' };
  v('⛔ toutes les pages du dépôt portent <html lang="fr">', [...new Set(toutes)].filter(f => !(f in SANS_HTML) && existe(f) && !/<html[^>]*\blang="fr"/.test(lire(f))), []);
  v('   et le fichier de Google est là, suivi, avec le contenu exact que Google relit', Object.keys(SANS_HTML).filter(f => !toutes.includes(f) || !existe(f) || lire(f).trim() !== SANS_HTML[f]), []);
}

console.log('\n══ 7. CE QUE GOOGLE ET LES RÉSEAUX LISENT — ET AUCUNE PROMESSE QUE L\'APPLICATION NE TIENT PAS ══\n');
{
  const PUBLIQUES = CLES.map(c => c + '.html').concat(VOISINES);
  /* a. une description au plus de 155 signes sur TOUTES les pages publiques (Google coupe au-delà) : l'accueil (193),
        les tarifs (170) et OP GESTION (172) dépassaient — seules les pages métier et les voisines étaient comptées */
  const longues = PUBLIQUES.map(f => [f, dec(metas(lire(f), 'description')[0] || '').length]).filter(([, n]) => !n || n > 155);
  v('chaque page publique a une description de 155 signes au plus (population : ' + PUBLIQUES.length + ' pages)', longues, []);
  v('   et le générateur les écrit ainsi (la source, pas seulement la page)', CLES.filter(c => !GEN.PAGES[c].desc || GEN.PAGES[c].desc.length > 155), []);

  /* b. l'image de partage : ⛔ LinkedIn lisait mal le WebP (l'image d'avant, 1512 × 982). On lit le FICHIER — son format
        et ses dimensions réelles —, jamais ce que la page en déclare : c'est ce que les robots des réseaux téléchargent */
  const dims = b => {
    if (b.length > 24 && b.readUInt32BE(0) === 0x89504E47 && b.toString('ascii', 12, 16) === 'IHDR') return { type: 'png', l: b.readUInt32BE(16), h: b.readUInt32BE(20) };
    if (b.length > 12 && b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP') return { type: 'webp' };
    if (b[0] === 0xFF && b[1] === 0xD8) {
      for (let o = 2; o + 9 < b.length;) {
        if (b[o] !== 0xFF) { o++; continue; }
        const m = b[o + 1];
        if (m === 0xFF || m === 0x01 || (m >= 0xD0 && m <= 0xD8)) { o += m === 0xFF ? 1 : 2; continue; }   // bourrage, marqueurs sans longueur
        if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) return { type: 'jpeg', h: b.readUInt16BE(o + 5), l: b.readUInt16BE(o + 7) };
        o += 2 + b.readUInt16BE(o + 2);
      }
    }
    return { type: 'inconnu' };
  };
  const suivis = new Set(cp.execSync('git ls-files', { cwd: RACINE }).toString().split('\n'));
  const images = {};
  for (const f of PUBLIQUES) { const s = lire(f), u = metas(s, 'og:image')[0] || '';
    (images[u] = images[u] || []).push([f, metas(s, 'og:image:width')[0], metas(s, 'og:image:height')[0]]); }
  vrai('(population) ' + PUBLIQUES.length + ' pages déclarent une image de partage', Object.values(images).reduce((n, l) => n + l.length, 0) === PUBLIQUES.length && !images['']);
  for (const [u, pages] of Object.entries(images)) {
    const f = fichierDe(u) || '-', b = existe(f) ? fs.readFileSync(path.join(RACINE, f)) : Buffer.alloc(0), d = dims(b);
    v(f + ' : ⛔ un JPEG ou un PNG (' + d.type + ') — LinkedIn lit mal le WebP', d.type === 'jpeg' || d.type === 'png', true);
    v('   ⛔ suivi par git : sinon GitHub Pages ne le sert pas, et le partage n\'a plus d\'image', suivis.has(f), true);
    v('   ' + d.l + ' × ' + d.h + ' : au moins 1200 de large, au format 1,91:1 des grandes cartes de partage', [d.l >= 1200, d.l / d.h >= 1.85 && d.l / d.h <= 1.95], [true, true]);
    v('   au plus 300 Ko (' + Math.round(b.length / 1024) + ' Ko) : au-delà, WhatsApp n\'affiche pas l\'aperçu', b.length > 0 && b.length <= 300 * 1024, true);
    v('   ⛔ les dimensions DÉCLARÉES sont les vraies, sur chaque page (' + pages.length + ')', pages.filter(([, l, h]) => +l !== d.l || +h !== d.h).map(([p, l, h]) => p + ' : ' + l + ' × ' + h), []);
  }
  const ip = GEN.IMAGE_PARTAGE, di = existe(fichierDe(ip.url) || '-') ? dims(fs.readFileSync(path.join(RACINE, fichierDe(ip.url)))) : {};
  v('   le générateur déclare les dimensions du fichier (IMAGE_PARTAGE)', [ip.l, ip.h], [di.l, di.h]);

  /* c. ⛔ « TEMPS RÉEL », « INSTANTANÉ », « AU MÊME MOMENT » : la synchronisation d'OP GESTION prend quelques secondes
        (relu dans app.html v763). Ces mots ne restent que pour OP MESSAGES — une messagerie, vraiment instantanée —, et
        chaque emploi est NOMMÉ ici, avec la preuve qu'il est dans un bloc d'OP MESSAGES : un nouvel emploi, même juste,
        est une décision à écrire, pas un passage tacite. On lit la page moins ses commentaires (un commentaire ne
        s'affiche pas), balises et scripts compris (les formules du paiement vivent dans un script). */
  const source = f => lire(f).replace(/<!--[\s\S]*?-->/g, ' ').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const INSTANT = /temps réel|instantané/i, tous = re => new RegExp(re.source, 'gi');
  const PERMIS = [
    ['applications.html', 'une seule conversation\u202f: chat en ',   // l'espace fine insécable du site, devant « : »
     (s, o) => s.lastIndexOf('OP MESSAGES', o) > o - 200, 'la carte d\'OP MESSAGES'],
    ['tarifs.html', 'App web + mobile, synchro en ', (s, o) => o > s.indexOf('id="formules-msg"') && s.indexOf('id="formules-msg"') > s.indexOf('id="formules-gestion"') && o < s.indexOf('id="faq"'), 'la formule Perso, parmi les formules d\'OP MESSAGES'],
    ['espace.html', 'desc:"Messagerie d\'équipe : chat ', (s, o) => s.lastIndexOf('name:\'OP MESSAGES\'', o) > o - 80, 'la fiche d\'OP MESSAGES du portail'],
    ['recap-abonnement.html', 'detail: \'synchro ', (s, o) => s.startsWith('groupe: \'msg\'', s.lastIndexOf('groupe: \'', o)), 'la formule Messages Perso']];
  const PAGE_ENTIERE = 'opmessages.html';   // la page d'OP MESSAGES
  const trouves = [], vus = new Set();
  let pagesLues = 0;
  for (const f of PUBLIQUES.concat('404.html')) { if (f === PAGE_ENTIERE) continue; const s = source(f); pagesLues++;
    for (const m of s.matchAll(tous(INSTANT))) { const p = PERMIS.find(([pf, avant]) => pf === f && s.slice(m.index - avant.length, m.index) === avant);
      if (p && p[2](s, m.index)) vus.add(p); else trouves.push(f + ' : « …' + s.slice(Math.max(0, m.index - 50), m.index + m[0].length).replace(/\s+/g, ' ') + ' »'); } }
  vrai('(population) ' + pagesLues + ' pages lues, et le motif reconnaît ce qu\'il cherche', pagesLues === PUBLIQUES.length && INSTANT.test('synchro en temps réel') && INSTANT.test('Instantané sur tous les appareils'));
  v('⛔ « temps réel » et « instantané » : seulement les emplois NOMMÉS, chacun dans un bloc d\'OP MESSAGES', trouves, []);
  v('   chaque emploi nommé existe encore (une entrée qui parle d\'une phrase disparue est une décision prise pour du vide)', PERMIS.filter(p => !vus.has(p)).map(p => p[0] + ' — ' + p[3]), []);
  vrai('   (population) la page d\'OP MESSAGES les emploie bien — elle seule, en entier', INSTANT.test(source(PAGE_ENTIERE)));
  /* la source d'OP GESTION ne les porte nulle part : les formules du générateur, et celles de la page de paiement */
  const textes = x => typeof x === 'string' ? [x] : Array.isArray(x) ? x.flatMap(textes) : x && typeof x === 'object' ? Object.values(x).flatMap(textes) : [];
  v('   aucune formule d\'OP GESTION du générateur ne les porte (FORMULES_GESTION)', textes(GEN.FORMULES_GESTION).filter(t => /temps réel|instantané|au même moment/i.test(t)), []);
  const recap = source('recap-abonnement.html'), blocsGestion = recap.split(/(?=groupe: ')/).filter(b => b.startsWith('groupe: \'gestion\''));
  v('   ni aucune formule d\'OP GESTION de la page de paiement (population : ' + blocsGestion.length + ' formules)', [blocsGestion.length === 3, blocsGestion.filter(b => /temps réel|instantané|au même moment/i.test(b.split(/\n  \}/)[0])).length], [true, 0]);

  /* d. ⛔ LES PROMESSES QUE L'APPLICATION NE TIENT PAS — sur TOUTES les pages publiques, plus seulement les pages métier.
        Relu dans app.html v763 le 29 septembre 2026 au soir : un contrat ne planifie rien tout seul (« Générer la
        prochaine intervention », d'un clic) et ne rappelle aucune échéance ; une box est un LIEU de stock, à une adresse —
        l'écran Véhicules ne gère que la flotte (plaque, kilométrage, assurance) ; la caméra lit une étiquette ; pas de
        relance automatique ; plus de module chantier ; la synchro prend quelques secondes. La page Métiers promettait
        « contrats à récurrence automatique » et « rappels d'échéance », la page OP GESTION « jusque dans le camion » et
        « contrats planifiés automatiquement ». (La récurrence d'une INTERVENTION, elle, crée la suivante à sa clôture :
        intRecurNext — « récurrences automatiques » reste vrai.) */
  const FAUX = [[/au même moment/i, '« au même moment »'], [/code-barres?/i, 'code-barres'], [/rappels? d.échéance/i, 'rappel d\'échéance'],
    [/passages? automatiques?/i, 'passage automatique'], [/relances? automatiques?/i, 'relance automatique'], [/suivi de chantier|gestion de chantier/i, 'module chantier'],
    [/inviolable/i, '« inviolable »'], [/camion/i, 'une box « camion »'], [/contrats?[^.·<"\n]{0,40}automatiquement|contrats?[^.·<"\n]{0,20}récurrence automatique/i, 'un contrat qui planifie tout seul'],
    [/box \/ poste/i, 'une box « poste »'],
    /* ⛔ ET CE QUE LA RELECTURE DU 29 SEPTEMBRE AU SOIR A TROUVÉ ENSUITE, chaque phrase relue dans app.html v764 :
       le serveur garde la clé de chaque équipe (`cleEquipeVerdict` la lit dans l'annuaire) — « de bout en bout »,
       « à vous seul », « personne d'autre » sont faux ; `exportFacturX` rend un XML nu, pas une Factur-X ; aucun
       espace de suivi pour les clients d'une entreprise, aucune statistique réservée au Premium (PLAN_BLOQUE ne ferme
       rien au-delà de Business) ; le Premium ne remplace plus le NOM de l'application (applyBrand) ; aucun bouton
       n'envoie de confirmation de rendez-vous (seul « E-mail de rappel ») ; `envoyerComptaComplet` n'est appelé
       nulle part ; un SMS s'ouvre sur le téléphone, sans PDF ; la notification poussée va à `#v=…`, pas à une fiche ;
       une nouvelle intervention prévient toute l'équipe, pas « l'assigné » ; seules les photos du diagnostic
       xylophage vont sur un devis ; le métier se change par le support. */
    [/de bout en bout/i, 'chiffrement « de bout en bout »'], [/à vous seul/i, '« à vous seul »'], [/personne d.autre que votre équipe/i, '« personne d\'autre que votre équipe »'],
    [/factur-?x/i, 'Factur-X'], [/vos clients suivent leurs interventions/i, 'un espace de suivi pour les clients'], [/statistiques avancées|multi-sites/i, 'statistiques avancées / multi-sites'],
    [/personnalisation complète/i, '« personnalisation complète » (nom compris)'], [/confirmations? de rendez-vous/i, 'confirmation de rendez-vous'], [/à la comptable/i, 'envoi « à la comptable »'],
    [/en PDF par e-mail ou par SMS|e-mail ou SMS depuis la fiche/i, 'un PDF envoyé « par SMS »'], [/directement la bonne fiche/i, 'une notification qui ouvre la fiche'], [/intervention assignée/i, '« intervention assignée »'],
    [/devis avec photos/i, 'des devis avec photos'], [/changez de réglage quand vous voulez/i, 'un métier qu\'on change soi-même'], [/câblage/i, 'une intervention type « câblage »'],
    [/en 4 onglets|temps de trajet réels|scanner sécurisé|relevés horodatés|vos mentions|export excel|tracé et crédite le stock/i, 'un détail que l\'application ne fait pas'],
    /* ⛔ LA RELECTURE ADVERSE DU 29 SEPTEMBRE 2026 (NUIT) — 39 constats confirmés dans app.html, puis les décisions de Justin :
       plus de Gratuit (« je veux que l'application soit payante directement »), ni « Le plus choisi », ni « 3 mois offerts sur
       chaque future application » ; le service 24h/24 et le support prioritaire restent (« je l'assure »). Chaque motif est
       une phrase que la page portait et que l'application contredit : la jauge suit la capacité de chacun (planGauge, 75 % /
       100 %), le technicien ne saisit aucune pause (pointerFin), les totaux de nuit des Archives lisent encore HH:MM, la durée
       légale n'est préremplie que pour les événements familiaux (ABS_INFO), la validation se règle par personne ou pour toute
       l'entreprise (valideSoumis), le seuil ne vit que dans la cloche, deux appareils hors synchro peuvent tirer le même numéro
       (docNumsDoubles le signale), la carte des box ne s'exporte pas, le Certibiocide n'a qu'un badge, l'IA du compte-rendu
       n'est pas ouverte aux clients, OP GESTION n'a pas d'espace « par SIRET », OP MESSAGES a son propre compte, l'installation
       sur iPhone passe par « Partager », le métier masque box et registre même en Premium, le tableau de bord de Pro n'a ni
       commandes ni demandes. */
    [/au-delà de sept heures|au-delà de neuf/i, 'une jauge à 7 h / 9 h'], [/noter sa pause/i, 'une pause que le technicien note'],
    [/journée vide/i, '« jamais une journée vide »'], [/durée proposée par défaut est la durée légale/i, 'la durée légale proposée pour tous les motifs'],
    [/un point de stock peut exiger/i, 'une validation réglée par point de stock'], [/prévient par une notification les personnes concernées/i, 'un seuil qui notifie'],
    [/même saisies sur deux appareils/i, 'un numéro « jamais en double, même sur deux appareils »'], [/partage en PDF/i, 'une carte des box partagée en PDF'],
    [/une alerte prévient avant l.échéance/i, 'une alerte Certibiocide'], [/pause comprise/i, '« pause comprise »'],
    [/compte-rendu assisté/i, 'un compte-rendu assisté (l\'IA n\'est pas ouverte aux clients)'], [/le plus choisi/i, 'le badge « Le plus choisi »'],
    [/sur chaque future application/i, '« 3 mois offerts sur chaque future application »'], [/\(SIRET\) a son espace/i, 'un espace « par SIRET »'],
    [/un seul compte/i, '« un seul compte »'], [/en un clic sur iPhone/i, 'une installation « en un clic » sur iPhone'],
    [/100 % des fonctions|100 % de toutes les applications/i, '« 100 % des fonctions » (le métier masque box et registre)'],
    [/interventions, commandes et demandes en attente/i, 'un tableau de bord « commandes et demandes » en Pro'],
    [/tout gratuit|gratuit pour commencer|commencez gratuitement|rapports? d.intervention simples/i, 'une formule Gratuit d\'OP GESTION'],
    [/rapports complets/i, 'des « rapports complets » réservés à une formule (aucune garde de formule sur le rapport)']];
  const fausses = [];
  for (const f of PUBLIQUES.concat('404.html')) { const s = source(f); for (const [re, nom] of FAUX) { const m = s.match(re); if (m) fausses.push(f + ' : ' + nom + ' — « …' + s.slice(Math.max(0, m.index - 40), m.index + m[0].length).replace(/\s+/g, ' ') + ' »'); } }
  v('⛔ aucune page publique ne promet ce que l\'application ne fait pas (population : ' + (PUBLIQUES.length + 1) + ' pages)', fausses, []);
  vrai('   (population) les motifs reconnaissent les phrases d\'avant', [
    'Contrats d\'entretien à récurrence automatique', 'Passages planifiés et rappels d\'échéance', 'Chaque produit tracé, jusque dans le camion',
    'Contrats récurrents planifiés automatiquement', 'Chaque box / poste : produits', 'toute l\'équipe voit les mêmes données au même moment',
    'Un mot de passe personnel par compte, chiffrement AES-256 de bout en bout', 'Chiffré, isolé, et à vous seul', 'Suivi payé / impayé, TVA, export Factur-X',
    'Espace client : vos clients suivent leurs interventions', 'Statistiques avancées, multi-sites / multi-équipes', 'Personnalisation complète : logo, nom, votre couleur',
    'Avis de passage, rappels, confirmations de rendez-vous', 'Récapitulatif à la comptable et export Excel en un clic', 'envoyez-les en PDF par e-mail ou par SMS',
    'Envoi par e-mail ou SMS depuis la fiche', 'Un clic ouvre directement la bonne fiche', 'Intervention assignée, arrivage, seuil de stock, message',
    'Devis avec photos, transformés en facture en un clic', 'Vous changez de réglage quand vous voulez', 'Interventions type : tableau, câblage, contrôle…',
    'Fiche détaillée en 4 onglets', 'temps de trajet réels et carte', 'Scanner sécurisé, seuils d\'alerte', 'relevés horodatés avec photo',
    'votre logo, vos champs, vos mentions', 'Chaque mouvement est tracé et crédite le stock.', 'Personne d\'autre que votre équipe n\'y accède.',
    'au-delà de sept heures elle passe à l\'orange, au-delà de neuf au rouge', 'Il peut noter sa pause, en minutes, avant de clôturer.',
    'l\'équipe de nuit ne se retrouve jamais avec une journée vide', 'la durée proposée par défaut est la durée légale', 'Un point de stock peut exiger qu\'un responsable valide',
    'et prévient par une notification les personnes concernées', 'deux factures ne portent jamais le même numéro, même saisies sur deux appareils',
    'Carte géolocalisée des box, partage en PDF', 'et une alerte prévient avant l\'échéance', 'depuis son téléphone, pause comprise',
    'Rapports complets : photos, signatures, compte-rendu assisté', 'Le plus choisi', '3 mois offerts sur chaque future application',
    'Chaque entreprise (SIRET) a son espace isolé', 'Un seul compte pour tout.', 'qui s\'installe en un clic sur iPhone, Android, Mac et Windows',
    '100 % des fonctions d\'OP GESTION, sans limite', 'Interventions, commandes et demandes en attente.', 'Tout Gratuit, plus', 'Gratuit pour commencer.',
    'Commencez gratuitement, sans engagement', 'Rapports d\'intervention simples'].every(t => FAUX.some(([re]) => re.test(t))));
  /* ⛔ ET CE QUI RESTE VRAI NE DOIT PAS TOMBER SOUS UN MOTIF : une garde qui crie faux se fait désactiver. */
  v('   (contre-épreuve) les phrases justes qui les remplacent passent', [
    'Données chiffrées (AES-256) sur l\'appareil avant l\'envoi', 'Suivi payé / impayé et TVA collectée', 'Commande suggérée, réception qui crédite le stock',
    'Envoi par e-mail, PDF joint — ou un SMS prêt à partir de votre téléphone', 'et envoyez-les en PDF par e-mail — ou leur résumé par SMS, depuis votre téléphone.',
    'Avis de passage et rappel de rendez-vous par e-mail, depuis la fiche', 'Synthèse comptable et export CSV (s\'ouvre dans Excel) en un clic',
    'Dans l\'application, la cloche mène droit à la bonne fiche', 'Checklist, photos avant/après, signatures client et technicien horodatées',
    'Espace client', 'l\'envoi d\'un rapport par e-mail ou SMS',
    'orange aux trois quarts, rouge quand la journée est pleine', 'Pour une pause, il termine sa journée puis la reprend : l\'écart s\'affiche et n\'est pas compté.',
    'l\'écran Pointage additionne les heures de nuit comme les autres', 'Pour les événements familiaux (mariage, naissance, décès d\'un proche…), la durée prévue par la loi est proposée',
    'Vous pouvez exiger qu\'un responsable valide les mouvements avant qu\'ils ne comptent, pour certaines personnes ou pour toute l\'entreprise',
    'l\'application le signale dans la cloche, et la commande suggérée le reprend', 'Si deux appareils émettent le même numéro avant de s\'être synchronisés, l\'application le signale dans la liste.',
    'Carte géolocalisée des box (métier 3D)', 'un badge le signale 60 jours avant l\'échéance', 'une pause, entre une fin et une reprise, n\'est pas comptée',
    'Rapports d\'intervention : photos, signatures, envoi en PDF', 'Chaque entreprise a son espace isolé, avec sa propre clé', 'chaque application se choisit selon vos besoins',
    'en un clic sur Android et sur ordinateur, et sur iPhone par Partager', 'Toutes les fonctions d\'OP GESTION pour votre métier, sans limite',
    'Les interventions en cours ; le reste se choisit carte par carte.', 'Créez-le d\'abord, c\'est gratuit.', 'La messagerie classique, gratuite : messages, appels et vidéo.'].filter(t => FAUX.some(([re]) => re.test(t))), []);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
