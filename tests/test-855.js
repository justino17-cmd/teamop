/* ⛔ LA PAGE TARIFS DES OPTIONS DU PRO — cartes, bloc d'options et tableau comparatif nés de UNE table (1er octobre 2026,
   Justin : « Plus cher » ; cahier des charges des options, section 7).
   Ce que ce banc garde, et pourquoi chaque point :
   1. la TABLE : prix des options = la grille du contrat (9 / 6 / 6 / 6), formules = FORMULES_GESTION, et l'arithmétique que la page
      énonce (Pro + Stock < Business < Pro + deux options) est vraie ; si le serveur ou l'application déclarent la grille, ils l'égalent ;
   2. TROIS RENDUS, UNE SOURCE : chaque ligne du CATALOGUE se retrouve dans le tableau (une ligne, trois cellules justes), dans la carte de
      la formule qui l'ouvre et, pour une option, dans la carte de cette option ; chaque prix écrit dans la page est un prix de la table ;
   3. LA RACINE NE CHANGE PAS : sans `--options` ET sans `OPTIONS_GESTION` dans app.html, les 19 pages de la racine sont celles du dépôt,
      octet pour octet — les options ne partent jamais à la racine sur une déduction ;
   4. LE VERROU : le générateur REFUSE de vendre ce que l'application ne connaît pas (option absente, prix ou écrans différents) ;
   5. LE TABLEAU TIENT SANS FAIRE DÉFILER LA PAGE (cadre qui défile, positionné : un enfant absolu d'un cadre non positionné élargit la
      page — mesuré à 450 px sur 360) et l'onglet OP MESSAGES masque ce qui est à OP GESTION ;
   6. les phrases « Pro n'a ni stock… » ne sont plus fausses, et aucune retouche ne vise du vide.
   La preuve au navigateur (360, 390, 768, 1440 px, jour et nuit) vit dans une sonde du scratchpad (captures-site/mesure.js). */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);
const jette = (t, f, motif) => { let m = null; try { f(); } catch (e) { m = e.message; } vrai(t + (m ? ' (« ' + m.split('\n')[0].slice(0, 70) + '… »)' : ''), m && motif.test(m)); };
const GEN = require('../scripts/site-marine.js');
const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;| | /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const nb = s => s.replace(/\u00a0|\u202f/g, ' ');
const APER = GEN.page('tarifs');                  // l'aperçu : options montrées
const RAC = GEN.page('tarifs', { racine: true }); // la racine : celle d'avant

console.log('1. la table : la grille du contrat, et l\'arithmétique que la page énonce');
{
  const GRILLE = { stock: 9, achats: 6, compta: 6, sanitaire: 6 };   // cahier des charges, section 1
  v('population : quatre options, dans l\'ordre du contrat', GEN.OPTIONS_SITE.map(o => o.cle), ['stock', 'achats', 'compta', 'sanitaire']);
  v('prix par utilisateur et par mois = la grille du contrat', Object.fromEntries(GEN.OPTIONS_SITE.map(o => [o.cle, o.prix])), GRILLE);
  v('formules : 15, 25, 50 (FORMULES_GESTION)', GEN.FORMULES_GESTION.map(f => [f.cle, +f.prix]), [['pro', 15], ['business', 25], ['premium', 50]]);
  v('l\'année offre deux mois', GEN.MOIS_OFFERTS, 2);
  const pro = 15, bus = 25;
  vrai('Pro + Stock (24) < Business (25) ; Pro + les deux options les moins chères (27) > Business', pro + GRILLE.stock < bus && pro + 12 > bus);
  vrai('l\'écran Registre sanitaire est « métier 3D »', GEN.OPTIONS_SITE.find(o => o.cle === 'sanitaire').metier3d === true);
  const srv = lire('server/index.js').replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const m = srv.match(/const OPTIONS_PRIX_MOIS\s*=\s*\{([^}]*)\}/);
  if (m) v('le serveur déclare la même grille (OPTIONS_PRIX_MOIS)', Object.fromEntries([...m[1].matchAll(/(\w+)\s*:\s*(\d+)/g)].map(x => [x[1], +x[2]])), GRILLE);
  else console.log('  · le serveur de cette branche ne déclare pas encore OPTIONS_PRIX_MOIS : comparaison page ↔ serveur à la fusion (test-852)');
  const appO = GEN.lireOptionsApp(lire('app.html'));
  if (appO) v('l\'application déclare les mêmes options, prix et écrans', Object.keys(appO).sort(), Object.keys(GRILLE).sort());
  else console.log('  · app.html ne déclare pas encore OPTIONS_GESTION : l\'aperçu vend dans le vide, la racine ne vend rien (§ 3)');
}

console.log('2. trois rendus, une source');
{
  const T = nb(texte(APER));
  const cat = GEN.CATALOGUE;
  const lignes = cat.flatMap(c => c.l.map(l => ({ c, l })));
  const val = (c, l, col) => l[col] !== undefined ? l[col] : (col === 'pro' ? (c.opt || 1) : 1);
  vrai('population : plus de 20 lignes de catalogue', lignes.length > 20);
  const tableau = (APER.match(/<table class="tableau-formules">[\s\S]*?<\/table>/) || [''])[0];
  vrai('le tableau est trouvé', tableau.length > 1000);
  const rangees = [...tableau.matchAll(/<tr><th scope="row">([\s\S]*?)<\/th>([\s\S]*?)<\/tr>/g)];
  // deux rangées de prix en plus des lignes du catalogue
  v('le tableau a UNE rangée par ligne du catalogue (+ les deux rangées de prix)', rangees.length, lignes.length + 2);
  lignes.forEach(({ c, l }, i) => {
    const cellules = [...rangees[i][2].matchAll(/<td([^>]*)>([\s\S]*?)<\/td>/g)];
    const attendu = ['pro', 'business', 'premium'].map(col => { const x = val(c, l, col); return x === 1 ? 'inclus' : !x ? 'non inclus' : 'option'; });
    const lu = cellules.map(m => /class="opt-cell"/.test(m[1]) ? 'option' : /non inclus/.test(m[2]) ? 'non inclus' : /inclus/.test(m[2]) ? 'inclus' : '?');
    if (JSON.stringify(lu) !== JSON.stringify(attendu) || !nb(texte(rangees[i][1])).startsWith(nb(l.t))) v('tableau, ligne « ' + l.t + ' »', [texte(rangees[i][1]), lu], [l.t, attendu]);
  });
  ok++; console.log('  ✓ les ' + lignes.length + ' lignes du tableau disent, cellule par cellule, ce que la table dit');
  // cellules d'option : le prix lu est celui de la table
  const prixCell = [...tableau.matchAll(/<td class="opt-cell"><span class="vh">en option : <\/span>([^<]*)<\/td>/g)].map(m => nb(m[1]));
  v('les cellules « option » du Pro portent le prix de la table (ou les deux options requises)', prixCell.filter(p => !/^\+(9|6) €$/.test(p) && p !== 'Stock + Achats'), []);
  // les cartes de formule
  const cartes = [...APER.matchAll(/<article class="formule[^"]*"><div>[\s\S]*?<\/article>/g)].map(m => m[0]).slice(0, 3);
  v('trois cartes de formule détaillées', cartes.length, 3);
  const dansCarte = (carte, t) => nb(texte(carte)).includes(nb(t));
  for (const [i, col] of ['pro', 'business', 'premium'].entries()) {
    const manquants = lignes.filter(({ c, l }) => {
      const x = val(c, l, col), prec = col === 'premium' ? val(c, l, 'business') : col === 'business' ? val(c, l, 'pro') : null;
      const doit = col === 'pro' ? x === 1 : x === 1 && prec !== 1;
      return doit !== dansCarte(cartes[i], l.t);
    }).map(({ l }) => l.t);
    v('carte ' + col + ' : exactement les lignes que la table lui donne (Pro : ce qu\'il a ; les autres : ce qu\'ils ajoutent)', manquants, []);
  }
  vrai('la carte Pro propose chaque option, avec son prix de la table', GEN.OPTIONS_SITE.every(o => dansCarte(cartes[0], o.nom + ' +' + o.prix + ' €')));
  vrai('la carte Pro ne coche PAS une ligne d\'option (elle est « en option »)', lignes.filter(({ c, l }) => val(c, l, 'pro') !== 1).every(({ l }) => !dansCarte(cartes[0].replace(/<li class="opt">[\s\S]*?<\/li>/g, ''), l.t)));
  // le bloc d'options
  for (const o of GEN.OPTIONS_SITE) {
    const b = (APER.match(new RegExp('<article class="option" id="option-' + o.cle + '">[\\s\\S]*?</article>')) || [''])[0];
    vrai(o.cle + ' : carte d\'option trouvée', b.length > 100);
    vrai(o.cle + ' : prix mensuel et annuel de la table (+' + o.prix + ' €, +' + o.prix * 10 + ' €)', nb(texte(b)).includes('+' + o.prix + ' € par utilisateur et par mois') && nb(texte(b)).includes('+' + o.prix * 10 + ' € par an : 2 mois offerts'));
    const c = cat.find(x => x.opt === o.cle);
    v(o.cle + ' : ses lignes sont celles de la catégorie du catalogue', c.l.filter(l => !nb(texte(b)).includes(nb(l.t))).map(l => l.t), []);
    vrai(o.cle + ' : le lien mène à la page de paiement avec la formule Pro et SA clé', b.includes('?formule=pro&amp;options=' + o.cle + '"'));
  }
  vrai('« Registre sanitaire (métier 3D) » : réservé au métier 3D, dit dans sa carte', /o-3d/.test((APER.match(/<article class="option" id="option-sanitaire">[\s\S]*?<\/article>/) || [''])[0]));
  // tout prix écrit « +N € » dans la page est un prix de la table ; tout prix de formule est dans FORMULES_GESTION
  const plus = [...T.matchAll(/\+(\d+) €/g)].map(m => +m[1]);
  v('population : des prix d\'option sont écrits dans la page', plus.length > 10, true);
  v('chaque « +N € » de la page est un prix d\'option de la table, mensuel ou annuel (10 mois)', [...new Set(plus)].filter(n => !GEN.OPTIONS_SITE.some(o => n === o.prix || n === o.prix * 10)), []);
  // l'arithmétique énoncée
  vrai('la page énonce Pro + Stock = 24 €, moins que Business 25 €, et « au moins 27 € » avec deux options', T.includes('Pro avec l\'option Stock : 24 €, moins que Business (25 €)') && T.includes('au moins 27 €'));
  // les rangées de prix
  const px = [...tableau.matchAll(/<td class="px">([^<]*)<\/td>/g)].map(m => nb(m[1]));
  v('rangées de prix : mensuel puis annuel (10 mois)', px, ['15 €', '25 €', '50 €', '150 €', '250 €', '500 €']);
  // les ancres
  vrai('#options et #comparatif existent dans l\'aperçu', /id="options"/.test(APER) && /id="comparatif"/.test(APER));
}

/* ⛔ L'APPLICATION D'AVANT LES OPTIONS, FABRIQUÉE À PARTIR DE LA VRAIE. Ce banc jouait « app.html + une déclaration
   en plus » tant que app.html ne connaissait pas les options. Depuis la v768 elle les DÉCLARE (vraiment) : la lecture
   rend la première déclaration, la vraie, et les fixtures qui s'y ajoutaient n'étaient plus lues (7 ✗ le 1er octobre). On
   rend donc à la fixture une application SANS déclaration — la vraie, dont la constante est renommée — et la déclaration
   jouée vient d'elle seule. Un renommage qui ne trouverait rien se DIT (population). */
const APP_REELLE = lire('app.html');
const APP_SANS = APP_REELLE.replace(/^([ \t]*)const OPTIONS_GESTION=/m, '$1const OPTIONS_GESTION_RENOMMEE=');
console.log('3. LA RACINE NE CHANGE PAS');
{
  vrai('(population) la fixture « sans options » est bien l\'application SANS déclaration, et la vraie en porte une', APP_SANS !== APP_REELLE && GEN.lireOptionsApp(APP_SANS) === null && Object.keys(GEN.lireOptionsApp(APP_REELLE) || {}).length === 4);
  const cles = Object.keys(GEN.PAGES);
  const changees = cles.filter(c => GEN.page(c, { racine: true }) !== lire(c + '.html'));
  v('population : ' + cles.length + ' pages à la racine', cles.length, 19);
  v('⛔ les 19 pages de la racine sont celles du dépôt, octet pour octet', changees, []);
  vrai('la racine n\'a ni bloc d\'options, ni tableau, ni ancre #options, ni carte détaillée', !/id="options"|id="comparatif"|suite-gestion|class="groupe|class="an"/.test(RAC) && !/tarifs\.html#(options|comparatif)/.test(GEN.page('index', { racine: true })));
  const APP_OPTIONS = 'const OPTIONS_GESTION={\n  stock:{l:\'Stock\',prix:9,vues:[\'produits\',\'stock\',\'mouvements\',\'saisieConso\',\'boxes\',\'carteBox\',\'produitsDonnes\',\'demandes\',\'histoDemandes\',\'brouillon\',\'validations\']},\n  achats:{l:\'Achats\',prix:6,vues:[\'fournisseurs\',\'bons\',\'commandes\',\'boiteMail\']},\n  compta:{l:\'Compta\',prix:6,vues:[\'comptabilite\',\'telecollecte\',\'enveloppes\']},\n  sanitaire:{l:\'Registre\',prix:6,vues:[\'registre\',\'produits\'],metier3d:true}\n};\n';
  vrai('(population) la fixture d\'une application qui connaît les options est lue : 4 options', Object.keys(GEN.lireOptionsApp(APP_OPTIONS) || {}).length === 4);
  vrai('⛔ MÊME UNE application qui les connaît ne les met pas à la racine sans le geste « --options » (page identique à celle d\'avant)', GEN.page('tarifs', { racine: true, appSrc: APP_SANS + '\n' + APP_OPTIONS }) === RAC);
  const avec = GEN.page('tarifs', { racine: true, options: true, appSrc: APP_SANS + '\n' + APP_OPTIONS });
  vrai('… avec le geste ET une application qui les connaît, la racine les montre', /id="options"/.test(avec) && /id="comparatif"/.test(avec) && /href="\/recap-abonnement\.html\?formule=pro&amp;options=stock"/.test(avec) && !/\/apercu\//.test(avec.replace(/<meta name="robots"[^>]*>/, '')));
  jette('⛔ « --options » sur une application qui ne les connaît pas : le générateur refuse', () => GEN.page('tarifs', { racine: true, options: true, appSrc: APP_SANS }), /ne déclare pas OPTIONS_GESTION/);
}

console.log('4. le verrou : le site ne vend pas ce que l\'application ne livre pas');
{
  const app = APP_SANS;
  const base = o => 'const OPTIONS_GESTION={' + Object.entries(o).map(([k, x]) => k + ':{prix:' + x[0] + ',vues:[' + x[1].map(s => "'" + s + "'").join(',') + ']}').join(',') + '};\n';
  const V = { stock: [9, GEN.OPTIONS_SITE[0].vues], achats: [6, GEN.OPTIONS_SITE[1].vues], compta: [6, GEN.OPTIONS_SITE[2].vues], sanitaire: [6, GEN.OPTIONS_SITE[3].vues] };
  const sans = k => { const o = { ...V }; delete o[k]; return o; };
  for (const racine of [false, true]) {
    const o = racine ? { racine: true, options: true } : { racine: false };
    const ou = racine ? 'racine' : 'aperçu';
    vrai('(' + ou + ') une application fidèle laisse passer', GEN.page('tarifs', { ...o, appSrc: app + '\n' + base(V) }).includes('id="options"'));
    jette('(' + ou + ') une option inconnue de l\'application : refus', () => GEN.page('tarifs', { ...o, appSrc: app + '\n' + base(sans('sanitaire')) }), /« sanitaire » : le site la vend, app\.html ne la connaît pas/);
    jette('(' + ou + ') un prix différent : refus', () => GEN.page('tarifs', { ...o, appSrc: app + '\n' + base({ ...V, stock: [7, V.stock[1]] }) }), /« stock » : le site la vend 9 €, app\.html 7 €/);
    jette('(' + ou + ') d\'autres écrans : refus', () => GEN.page('tarifs', { ...o, appSrc: app + '\n' + base({ ...V, achats: [6, ['bons']] }) }), /« achats » : le site dit qu'elle ouvre/);
  }
  // la VRAIE déclaration d'app.html : la garde la lit et la laisse passer ; la moindre dérive de SA grille la fait refuser
  jette('⛔ la vraie app.html dont l\'option Stock passe à 7 € : refus', () => GEN.page('tarifs', { racine: false, appSrc: APP_REELLE.replace("stock:{l:'Stock',prix:9,", "stock:{l:'Stock',prix:7,") }), /« stock » : le site la vend 9 €, app\.html 7 €/);
  jette('⛔ la vraie app.html dont l\'option Compta perd un écran : refus', () => GEN.page('tarifs', { racine: false, appSrc: APP_REELLE.replace("vues:['comptabilite','telecollecte','enveloppes']", "vues:['comptabilite','telecollecte']") }), /« compta » : le site dit qu'elle ouvre/);
  vrai('la vraie app.html passe la garde (aperçu et racine avec le geste)', GEN.page('tarifs', { racine: false, appSrc: APP_REELLE }).includes('id="options"') && GEN.page('tarifs', { racine: true, options: true, appSrc: APP_REELLE }).includes('id="options"'));
  // la lecture ne se laisse pas tromper : un commentaire, une apostrophe, une accolade dans une chaîne
  v('un commentaire de ligne qui cite la constante ne la déclare pas', GEN.lireOptionsApp('// const OPTIONS_GESTION = { stock:{prix:9} };\nconst x=1;'), null);
  v('un commentaire de bloc en début de ligne non plus', GEN.lireOptionsApp('/* const OPTIONS_GESTION = { stock:{prix:9} }; */\nconst x=1;'), null);
  v('une apostrophe française et une accolade dans un commentaire n\'égarent pas la lecture', Object.keys(GEN.lireOptionsApp("const OPTIONS_GESTION = {\n // l'option { Stock }\n stock:{l:'Stock {x}',prix:9,vues:['a']},\n achats:{prix:6}\n};\nconst Z={}")), ['stock', 'achats']);
  jette('une accolade jamais refermée est un refus, pas un « pas d\'options »', () => GEN.lireOptionsApp('const OPTIONS_GESTION = { stock:{prix:9}'), /jamais refermée/);
}

console.log('5. le tableau tient, l\'onglet OP MESSAGES masque ce qui est à OP GESTION');
{
  const css = lire('vitrine/v2/site.css').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const reg = css.match(/\.table-defile \{([^}]*)\}/);
  vrai('le cadre du tableau défile de côté', reg && /overflow-x: auto/.test(reg[1]));
  vrai('⛔ … et il est POSITIONNÉ (sinon un enfant absolu, « .vh », élargit la page : 450 px mesurés sur 360)', reg && /position: relative/.test(reg[1]));
  vrai('le tableau a une largeur minimale (il défile plutôt que s\'écraser)', /\.tableau-formules \{[^}]*min-width: \d+px/.test(css));
  vrai('la première colonne reste en place pendant le défilement', /tbody th\[scope="row"\] \{[^}]*position: sticky; left: 0/.test(css));
  vrai('aucune des nouvelles classes n\'est `.formule`, `.formules` ni `.places` (site.js y poserait la carte bleue, test-837 compte les places)', !/class="(option|suite-gestion|options-pro|comparatif)[^"]*\b(formule|formules|places)\b/.test(APER));
  const tab = APER.match(/<div class="table-defile"[^>]*>/)[0];
  vrai('le cadre est une région nommée, atteignable au clavier', /role="region"/.test(tab) && /aria-labelledby="comparatif-t"/.test(tab) && /tabindex="0"/.test(tab));
  const t = APER.match(/<table class="tableau-formules">[\s\S]*?<\/table>/)[0];
  vrai('le tableau a un titre (caption), des en-têtes de colonne et de ligne', /<caption/.test(t) && (t.match(/<th scope="col"/g) || []).length === 4 && (t.match(/<th scope="row"/g) || []).length > 20);
  vrai('⛔ rien ne se dit par la seule couleur : un « inclus » ou « non inclus » écrit pour chaque cellule', (t.match(/class="vh">(inclus|non inclus|en option : )/g) || []).length === (t.match(/<td/g) || []).length - 6);
  // l'onglet
  const js = lire('vitrine/v2/site.js').replace(/\/\*[\s\S]*?\*\//g, ' ');
  vrai('site.js masque les blocs « data-onglet » qui ne sont pas à l\'onglet choisi', /\$\$\('\[data-onglet\]'\)\.forEach\(function \(b\) \{ b\.hidden = b\.getAttribute\('data-onglet'\) !== cible; \}\)/.test(js));
  vrai('les ancres #options et #comparatif choisissent OP GESTION', /h === 'options' \|\| h === 'comparatif'\) choisir\('formules-gestion'\)/.test(js));
  const i = APER.indexOf('class="suite-gestion"'), g = APER.indexOf('id="formules-gestion"'), m = APER.indexOf('id="formules-msg"');
  vrai('le bloc est lié à l\'onglet OP GESTION, après ses cartes et avant celles d\'OP MESSAGES', /class="suite-gestion" data-onglet="formules-gestion"/.test(APER) && g < i && i < m);
  const msg = (APER.match(/<div class="formules" id="formules-msg"[\s\S]*?<\/div>\s*<p class="note-msg">/) || [''])[0];
  vrai('le bloc d\'OP MESSAGES reste sans lien et sans option (test-835 §7)', msg.length > 500 && !/href=/.test(msg) && !/option/i.test(msg));
}

console.log('6. les phrases « Pro n\'a ni stock… » ne sont plus fausses');
{
  const cles = Object.keys(GEN.PAGES);
  let appliquees = 0;
  for (const [de, vers] of GEN.SUBST_OPTIONS) {
    const avant = cles.filter(c => GEN.page(c, { racine: true }).includes(de.replace(/'/g, '&#39;') ) || nb(texte(GEN.page(c, { racine: true }))).includes(nb(de))).length;
    const apresDe = cles.filter(c => nb(texte(GEN.page(c))).includes(nb(de))).length;
    const apresVers = cles.filter(c => nb(texte(GEN.page(c))).includes(nb(vers))).length;
    appliquees += apresVers;
    v('retouche « ' + de.slice(0, 48) + '… » : dite à la racine (' + avant + ' pages), plus dite dans l\'aperçu, remplacée', [avant > 0, apresDe, apresVers > 0], [true, 0, true]);
  }
  vrai('population : les retouches de phrase touchent bien des pages (' + appliquees + ')', appliquees >= 6);
  const stock = nb(texte(GEN.page('logiciel-gestion-de-stock'))), stockR = nb(texte(GEN.page('logiciel-gestion-de-stock', { racine: true })));
  GEN.page('tarifs', { racine: true });
  vrai('⛔ générer la racine ne laisse pas son état derrière : l\'aperçu garde ses options (description des tarifs, menu)', /Options du Pro/.test(GEN.PAGES.tarifs.desc) && /tarifs\.html#options/.test(GEN.page('index')));
  vrai('page Stock : la carte Pro dit « Pas de stock dans Pro seul » et l\'option Stock ; la racine garde « Pas de stock dans Pro : »', /Pas de stock dans Pro seul/.test(stock) && /option Stock \(\+9 €\)/.test(stock) && /Pas de stock dans Pro :/.test(stockR));
  vrai('page Bons : les bons sont une option Achats, et la commande suggérée demande aussi le Stock', /Pas de bons de commande dans Pro seul/.test(nb(texte(GEN.page('logiciel-bons-de-commande')))) && /option Achats fournisseurs \(\+6 €\)/.test(nb(texte(GEN.page('logiciel-bons-de-commande')))) && /option Stock en plus/.test(nb(texte(GEN.page('logiciel-bons-de-commande')))));
  const reg = nb(texte(GEN.page('logiciel-registre-sanitaire')));
  vrai('page Registre : « Pas d\'écran Registre dans Pro seul », le dossier sanitaire suit l\'option, plus de « n\'est pas une option »', /Pas d'écran Registre dans Pro seul/.test(reg) && /dossier sanitaire fait partie de l'option Registre sanitaire/.test(reg) && !/n'est pas une option/.test(reg));
  const ns = ['logiciel-plombier', 'logiciel-electricien', 'logiciel-chauffage-climatisation', 'logiciel-nettoyage'];
  v('pages métier non 3D : le Pro dit que stock, bons et compta s\'ajoutent en option, sans un mot de box ni de registre', ns.filter(c => { const h = GEN.page(c), t = nb(texte(h.slice(h.indexOf('<main>'), h.indexOf('</main>')))); return !/s'ajoutent au Pro en option, dès 6 €/.test(t) || /\bbox\b|registre/i.test(t); }), []);
  vrai('page 3D : le registre, le dossier et les box passent par leurs options', /option Registre sanitaire \(\+6 €\)/.test(nb(texte(GEN.page('logiciel-anti-nuisibles')))) && /option Stock \(\+9 €\)/.test(nb(texte(GEN.page('logiciel-anti-nuisibles')))));
  v('descriptions : 155 signes au plus, avec les options', cles.filter(c => GEN.PAGES[c].desc.length > 155), []);
  vrai('la description des tarifs annonce les options à partir de 6 €', /Options du Pro dès 6\u00a0€/.test(GEN.PAGES.tarifs.desc));
  vrai('(racine) la description des tarifs d\'avant est inchangée', !/Options/.test((GEN.page('tarifs', { racine: true }).match(/<meta name="description" content="([^"]*)"/) || [])[1]));
  vrai('index : le stock « avec Business, ou l\'option Stock du Pro »', /Avec Business, ou l'option Stock du Pro/.test(nb(texte(GEN.page('index')))));
}

console.log('7. FAQ, menu et pied');
{
  const T = nb(texte(APER));
  vrai('FAQ : les options, Business ou Pro avec options, l\'année', /Comment fonctionnent les options du Pro/.test(T) && /Business ou Pro avec des options/.test(T) && /Et si je paie à l'année/.test(T));
  vrai('FAQ : l\'annuel est dit à 10 mois sur 12, avec les sommes de la table', /10 mois au lieu de 12 : 2 mois offerts, pour la formule comme pour les options\. Pro : 150 € par utilisateur et par an, Business : 250 €, Business Premium : 500 €/.test(T));
  vrai('FAQ : changer d\'avis — une option s\'ajoute à tout moment et se retire sur demande', /Une option s'ajoute à tout moment depuis la page d'abonnement, et se retire sur simple demande au support/.test(T));
  vrai('les questions d\'avant sont gardées mot pour mot (places, compte, installation)', /Un abonnement donne un compte utilisateur, quelle que soit la formule/.test(T) && /Faut-il un compte pour payer/.test(T) && /Faut-il installer quelque chose/.test(T));
  vrai('aucune FAQ n\'est écrite deux fois (identifiants de réponse uniques)', (() => { const ids = [...APER.matchAll(/id="(r\d+)"/g)].map(m => m[1]); return ids.length === new Set(ids).size && ids.length === 10; })());
  vrai('« HT » n\'apparaît nulle part (test-837)', !/\bHT\b/.test(T));
  const menu = GEN.page('index');
  vrai('aperçu : le volet Tarifs mène aux options et au comparatif (menu, mobile, pied)', (menu.match(/tarifs\.html#options/g) || []).length >= 3 && (menu.match(/tarifs\.html#comparatif/g) || []).length >= 3);
  vrai('le sous-titre du volet se lit dans FORMULES_GESTION', /Pro 15 € · Business 25 € · Business Premium 50 €/.test(menu) && GEN.VOLETS.tarifs.grands[0].sous === 'Pro 15 € · Business 25 € · Business Premium 50 €');
  v('racine : le volet Tarifs est celui d\'avant', JSON.stringify(GEN.voletsActifs(false).tarifs), JSON.stringify(GEN.VOLETS.tarifs));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
