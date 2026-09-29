/* ⛔ LE SITE VITRINE « MARINE » — les huit pages générées, relues contre l'application et le dépôt.
   27 septembre 2026, Justin : « partout où il y a des captures d'écran, je veux des vrais iPhone avec un vrai
   Mac, avec des vraies captures d'écran de l'application ».

   Ce que ce banc garde, et pourquoi chaque point :
   1. les pages d'`apercu/site/` SONT la sortie de `scripts/site-marine.js` — une page retouchée à la main
      divergerait au prochain passage du générateur, en silence ;
   2. aucune promesse retirée par Justin (« hors-ligne », « sans réseau » : 23 septembre 2026, `f1cc223`) ;
   3. les places et les prix sont ceux de l'APPLICATION (`PLANS` d'app.html) — la FAQ d'avant disait
      « 3 en Business, 5 en Business Premium » pendant que les cartes disaient 2 et 3 ;
   4. chaque lien mène quelque part (fichier du dépôt, ancre présente) ; aucun `mailto` ailleurs que
      support@ ; aucune adresse externe ;
   5. chaque écran d'appareil a sa version jour ET nuit, et l'image existe ;
   6. aucun bouton de mode (le site suit le système, sans bouton — THEME.md § 0, et Justin le 29 septembre 2026) ;
   7. OP MESSAGES : « Bientôt disponible », aucune formule ne se choisit ;
   8. « Créer » ne dit jamais « demande envoyée » (c'est la messagerie de la personne qui l'envoie) ;
   9. un aperçu ne se référence pas (`noindex`), la page de racine si.
   La preuve au navigateur (menus, fenêtres, onglets, formulaire, débordement) vit dans
   `scratchpad/sonde-site.js`, que ce banc exige. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const GEN = require('../scripts/site-marine.js');
const CLES = Object.keys(GEN.PAGES);
const DIR = path.join(RACINE, 'apercu', 'site');
const texte = h => h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ').replace(/<[^>]+>/g, ' ').replace(/&nbsp;| | /g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

console.log('1. les pages sont la sortie du générateur');
/* les huit pages d'origine, les cinq pages métier et les six pages par fonction du plan SEO de Justin (29 septembre 2026 :
   « une page = une URL = un mot-clé principal » ; le soir même : « une page par fonction […], plus une page nettoyage ») —
   test-846 garde leur référencement */
v('dix-neuf pages : les huit du site, les cinq pages métier et les six pages par fonction', CLES.slice().sort(), ['applications', 'creer', 'elan', 'index', 'logiciel-anti-nuisibles',
  'logiciel-bons-de-commande', 'logiciel-chauffage-climatisation', 'logiciel-devis-factures', 'logiciel-electricien', 'logiciel-gestion-de-stock', 'logiciel-nettoyage',
  'logiciel-planning-interventions', 'logiciel-plombier', 'logiciel-pointage', 'logiciel-registre-sanitaire', 'metiers', 'opmessages', 'pourquoi', 'tarifs']);
const PAGES = {};
for (const c of CLES) {
  const f = path.join(DIR, c + '.html');
  const lu = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  PAGES[c] = lu;
  vrai(c + '.html est identique à la sortie du générateur (sinon : node scripts/site-marine.js)', lu && lu === GEN.page(c, { racine: false }));
}

console.log('2. aucune promesse retirée');
for (const c of CLES) {
  const t = texte(PAGES[c]).toLowerCase();
  vrai(c + ' : ni « hors-ligne » ni « sans réseau »', !/hors[- ]ligne|sans r[ée]seau|offline/.test(t));
}

console.log('3. places et prix : ceux de l\'application');
const app = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
const bloc = app.slice(app.indexOf('const PLANS={'), app.indexOf('};', app.indexOf('const PLANS={')) + 2);
vrai('PLANS se lit dans app.html', bloc.length > 100);
const PLANS = {};
for (const m of bloc.matchAll(/(\w+):\{l:'([^']+)',prix:'([^']+)',maxU:(\d+)/g)) PLANS[m[1]] = { nom: m[2], prix: m[3], places: +m[4] };
v('quatre formules dans l\'application', Object.keys(PLANS), ['gratuit', 'pro', 'business', 'premium']);
/* ⛔ UN ABONNEMENT = UN UTILISATEUR — Justin, 27 septembre 2026 au soir : « à partir d'aujourd'hui c'est 1 utilisateur par
   abonnement ». Le site (et la page de paiement, `test-837`) le disent tout de suite. L'application, elle, le fera avec la
   version qui porte `maxU:1` — publiée sur SA phrase, comme toute version. ENTRE LES DEUX, l'application en service donne
   PLUS que ce que le site promet (2 places par abonnement Business, 3 en Business Premium) — jamais moins : personne n'a
   moins que ce qu'il a payé. Cet écart est DÉCLARÉ ici, valeur par valeur, et il se referme tout seul : une formule dont
   l'application donne 1 exige l'égalité, et un écart déclaré qui ne sert plus fait tomber le banc — on le retire alors
   d'ici, dans le même geste que l'application. */
const PLACES_VENDUES = 1;
/* ✅ REFERMÉ LE 28 SEPTEMBRE 2026 (v762, bêta) : l'application donne 1 place par abonnement dans toutes les formules.
   ⚠️ Sur `main`, tant que l'application EN SERVICE porte encore 2 et 3 (v760), ce fichier-là garde l'écart : il se retire
   là-bas avec la publication de l'application, dans le même geste. */
const ECART_APPLICATION = {};
for (const f of GEN.FORMULES_GESTION) {
  const p = PLANS[f.cle];
  vrai(f.cle + ' : nom « ' + f.nom + ' » = « ' + (p && p.nom) + ' »', p && p.nom === f.nom);
  vrai(f.cle + ' : prix ' + f.prix + ' = ' + (p && p.prix), p && p.prix.startsWith(f.prix + ' '));
  vrai(f.cle + ' : le site vend ' + PLACES_VENDUES + ' utilisateur (« ' + f.places + ' »)', new RegExp('^' + PLACES_VENDUES + ' utilisateur(?!s)').test(f.places));
  const dansApp = p && p.places;
  vrai(f.cle + ' : l\'application donne ' + dansApp + ' — ' + (dansApp === PLACES_VENDUES ? 'la même chose' : 'l\'écart déclaré, jamais moins'),
    dansApp === PLACES_VENDUES || (dansApp === ECART_APPLICATION[f.cle] && dansApp > PLACES_VENDUES));
}
for (const cle of Object.keys(ECART_APPLICATION)) vrai('l\'écart déclaré pour « ' + cle + ' » sert encore (sinon : le retirer d\'ici)', PLANS[cle] && PLANS[cle].places === ECART_APPLICATION[cle]);
const faq = texte(PAGES.tarifs);
vrai('la FAQ dit « Un abonnement donne un compte utilisateur, quelle que soit la formule »', faq.includes('Un abonnement donne un compte utilisateur, quelle que soit la formule'));
vrai('l\'exemple de la FAQ compte juste (Business × 3 = ' + 3 * PLACES_VENDUES + ' comptes)', faq.includes('Business × 3 = ' + 3 * PLACES_VENDUES + ' comptes'));
vrai('plus aucune trace des places d\'avant (« 2 en Business », « 3 en Business Premium », « Business × 2 = 4 »)', !/[2-5] en Business|Business × 2 = 4/.test(faq));
vrai('⛔ le site ne promet nulle part plusieurs utilisateurs par abonnement', CLES.every(c => !/\b[2-9] utilisateurs inclus|\(\d utilisateurs/.test(texte(PAGES[c]) + ' ' + ((PAGES[c].match(/<meta name="description" content="([^"]*)"/) || [])[1] || ''))));

console.log('4. chaque lien mène quelque part');
let liens = 0, morts = [];
const ids = c => new Set([...PAGES[c].matchAll(/\sid="([^"]+)"/g)].map(m => m[1]));
for (const c of CLES) for (const m of PAGES[c].matchAll(/\s(?:href|src|srcset)="([^"]+)"/g)) {
  for (const brut of m[1].split(',').map(x => x.trim().split(/\s+/)[0])) {
    liens++;
    const u = brut;
    if (/^mailto:/.test(u)) { if (u !== 'mailto:support@teamop.fr') morts.push(c + ' → ' + u); continue; }
    if (/^https?:/.test(u)) { morts.push(c + ' → adresse externe ' + u); continue; }
    const [chemin, ancre] = u.split('#');
    const sansQ = chemin.split('?')[0];
    if (!sansQ) { if (ancre && !ids(c).has(ancre)) morts.push(c + ' → #' + ancre); continue; }
    if (sansQ.startsWith('/')) { if (!fs.existsSync(path.join(RACINE, sansQ))) morts.push(c + ' → ' + u); continue; }
    const cible = sansQ.replace(/\.html$/, '');
    if (!PAGES[cible]) { morts.push(c + ' → ' + u + ' (page inconnue)'); continue; }
    if (ancre && !ids(cible).has(ancre)) morts.push(c + ' → ' + u + ' (ancre absente)');
  }
}
vrai('population : ' + liens + ' liens et sources relus', liens > 300);
v('aucun lien mort', morts, []);
vrai('les formules mènent à la page d\'abonnement — son aperçu dans l\'aperçu (4 formules)', ['gratuit', 'pro', 'business', 'premium'].every(k => PAGES.tarifs.includes('href="/apercu/recap-abonnement.html?formule=' + k + '"')));
const tarifsRacine = GEN.page('tarifs', { racine: true });
vrai('… et la vraie page à la racine (4 formules)', ['gratuit', 'pro', 'business', 'premium'].every(k => tarifsRacine.includes('href="/recap-abonnement.html?formule=' + k + '"')));
vrai('⛔ la racine n\'envoie jamais vers un aperçu', Object.keys(GEN.PAGES).every(c => !/href="\/apercu\//.test(GEN.page(c, { racine: true }))));

console.log('5. chaque écran d\'appareil, jour et nuit');
let ecrans = 0;
for (const c of CLES) for (const m of PAGES[c].matchAll(/<picture>([\s\S]*?)<\/picture>/g)) {
  ecrans++;
  const nuit = (m[1].match(/<source data-nuit media="\(prefers-color-scheme: dark\)" srcset="([^"]+)"/) || [])[1] || '';
  vrai(c + ' : l\'écran se lit dans la v2 (vitrine/v2/captures/)', /src="\/vitrine\/v2\/captures\//.test(m[1]));
  for (const u of (m[1].match(/\/vitrine\/[^"\s,]+\.webp/g) || [])) if (!fs.existsSync(path.join(RACINE, u))) vrai(c + ' : ' + u + ' existe', false);
  const jour = (m[1].match(/<img src="([^"]+)"/) || [])[1] || '';
  const racineJ = jour.replace(/-jour(-1x)?\.webp$/, ''), racineN = nuit.split(/[\s,]/)[0].replace(/-nuit(-1x)?\.webp$/, '');
  vrai(c + ' : ' + path.basename(racineJ) + ' a son jour et sa nuit', /-jour(-1x)?\.webp$/.test(jour) && /-nuit(-1x)?\.webp$/.test(nuit.split(/[\s,]/)[0]) && racineJ === racineN);
  vrai(c + ' : l\'écran a un texte de remplacement', /<img [^>]*alt="[^"]{12,}"/.test(m[1]));
}
vrai('population : ' + ecrans + ' écrans d\'appareil', ecrans >= 16);
for (const f of fs.readdirSync(path.join(RACINE, 'vitrine', 'v2', 'captures'))) vrai('captures : ' + f + ' pèse moins de 400 Ko', fs.statSync(path.join(RACINE, 'vitrine', 'v2', 'captures', f)).size < 400 * 1024);

console.log('5 bis. chaque case de « Ce que fait OP GESTION » montre son écran (Justin, 27 septembre au soir)');
const bento = (PAGES.elan.match(/<div class="bento">[\s\S]*?<\/div><script type="application\/json"/) || [''])[0];
const cases = bento.split('<button type="button" class="tuile-f').slice(1);
v('dix cases', cases.length, 10);
v('les dix ont leur appareil', cases.filter(x => /class="vue /.test(x) && /<picture>/.test(x)).length, 10);
vrai('les grandes montrent un Mac, les petites un iPhone', cases.every(x => /^[^"]*large/.test(x) ? /class="vue v-mac"/.test(x) : /class="vue (v-iphone|duo)"/.test(x)));
v('dix écrans DIFFÉRENTS (une capture ne sert pas deux cases)', new Set(cases.map(x => (x.match(/src="([^"]+)"/) || [])[1])).size, 10);
vrai('plus de « Code PIN » (l\'application est au mot de passe depuis septembre)', !/code PIN/i.test(PAGES.elan));

/* 27 septembre au soir, Justin : « je veux vraiment un mode jour et un mode nuit » — un bouton ☀︎/☾ forçait l'autre
   mode. 29 septembre, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux que ça
   soit automatique ». Le site suit l'appareil, et RIEN d'autre : retour au point 6 de la maquette (THEME.md § 0). */
console.log('6. jour et nuit : l\'appareil, sans bouton');
/* ⛔ Par la FONCTION, dans le CODE (tests/mode-site.js) : la relecture adverse du 29 septembre au soir a fait passer un
   bouton `class="mode on"`, un `id="bascule">☾` et une tête privée de ses couleurs de barre à travers ce paragraphe,
   qui ne cherchait que la chaîne exacte `class="mode"` et une ligne de la tête. */
const MS = require('./mode-site.js');
const TETE = GEN.TETE_MODE;
for (const c of CLES) for (const [ou, s] of [['aperçu', PAGES[c]], ['racine', GEN.page(c, { racine: true })]]) {
  v(c + ' (' + ou + ') : ⛔ aucun bouton de mode, aucun mode forcé, aucune clé de mode (quelle qu\'en soit l\'écriture)', MS.restesDeMode(s, TETE), []);
  const tete = (s || '').slice(0, (s || '').indexOf('</head>'));
  vrai(c + ' (' + ou + ') : la tête du mode, à l\'identique (couleurs de barre, color-scheme, effacement), une fois, dans <head>, avant la feuille',
    (s || '').split(TETE).length === 2 && tete.indexOf(TETE) > 0 && tete.indexOf(TETE) < tete.indexOf('/vitrine/v2/site.css'));
}
const css = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.css'), 'utf8');
const nuitSys = (css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{([^}]*)\}/) || [])[1];
vrai('la nuit est sous la requête de l\'appareil, sur :root', !!nuitSys);
{
  const f = MS.formeFeuille(css);
  v('⛔ UN bloc :root de jour, UN bloc de nuit (sous la requête, :root seul), rien d\'autre ne redéfinit les jetons — [racines, nuits, jours, ordre, nuit = :root seul]',
    [f.racines, f.nuits, f.jours, f.ordre, f.nuitSeulementRacine], [2, 1, 0, true, true]);
  v('⛔ color-scheme : « light dark », une seule fois, sur le :root de jour (sinon champs et barres restent clairs la nuit)', [f.schemes, f.schemeJour], [1, true]);
  v('⛔ la feuille ne connaît plus de mode forcé, et du bouton que la garde qui le cache (une page restée en cache le porte encore)',
    [f.dataTheme, f.reglesMode], [false, ['.mode, .coin-mode { display: none !important; }']]);
}
const jsv2 = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//gm, ' ');
vrai('site.js ne porte aucun jour / nuit', !/CLE_MODE|teamop_site_mode|choisirMode|data-theme/.test(jsv2));
for (const c of CLES) vrai(c + ' : les écrans de nuit suivent l\'appareil d\'eux-mêmes (media de la <source>)', !/<source data-nuit(?! media="\(prefers-color-scheme: dark\)")/.test(PAGES[c]));
for (const c of CLES) vrai(c + ' : site.js est chargé', /<script src="\/vitrine\/v2\/site\.js" defer><\/script>/.test(PAGES[c]));

console.log('6 bis. tarifs : la formule touchée devient la bleue');
vrai('le script rend les cartes choisissables (classe « choix », phare déplacé)', /g\.classList\.add\('choix'\)/.test(jsv2) && /x\.classList\.toggle\('phare', x === c\)/.test(jsv2));
vrai('OP MESSAGES : ses boutons prennent les couleurs d\'OP GESTION (plus de fond gris)', /\.formule \.cta\.attente \{ cursor: inherit; \}/.test(css) && !/\.cta\.attente \{[^}]*background/.test(css));

/* 27 septembre au soir, Justin, sur son iPhone : « pourquoi là c'est blanc ? » (de nuit), puis « et là, sur le même
   jour, il y a du sombre, pourquoi ? ». La maquette RETOURNAIT la carte mise en avant (sombre de jour, blanche de nuit).
   Elle suit désormais le mode, et une teinte + un halo la distinguent des autres cases. Les contrastes se recalculent
   ici, au point le plus éclairé du halo — là où sont posés le titre et le sous-titre. */
console.log('6 ter. la carte mise en avant suit le mode, se distingue des autres cases, et reste lisible sous son halo');
const cssCode = css.replace(/\/\*[\s\S]*?\*\//g, ' ');
const jourBloc = (cssCode.match(/(?:^|\n):root \{([^}]*)\}/) || [])[1] || '';
const jeton = (bloc, n) => ((bloc || '').match(new RegExp('--' + n + ':\\s*([^;]+);')) || [])[1];
const rgb = c => { c = (c || '').trim().replace(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/i, '#$1$1$2$2$3$3'); let m = c.match(/^#([0-9a-f]{6})$/i); if (m) return [0, 2, 4].map(i => parseInt(m[1].substr(i, 2), 16)).concat(1);
  m = c.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };
const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const sur = (fond, voile) => fond.slice(0, 3).map((x, i) => x + (voile[i] - x) * voile[3]);
vrai('population : le bloc de jour et le bloc de nuit se lisent', jourBloc.length > 200 && (nuitSys || '').length > 200);
for (const [mode, bloc, page] of [['jour', jourBloc, jeton(jourBloc, 'bg')], ['nuit', nuitSys, jeton(nuitSys, 'bg')]]) {
  const bg = rgb(jeton(bloc, 'inv-bg')), fg = rgb(jeton(bloc, 'inv-fg')), sub = rgb(jeton(bloc, 'inv-sub')), fond = rgb(page);
  vrai(mode + ' : les jetons de la carte se lisent (' + [jeton(bloc, 'inv-bg'), jeton(bloc, 'inv-fg'), jeton(bloc, 'inv-sub')].join(' · ') + ')', bg && fg && sub && fond);
  if (!(bg && fg && sub && fond)) continue;
  const carte = rgb(jeton(bloc, 'card'));
  vrai(mode + ' : ⛔ la carte suit le mode (luminance ' + lum(bg).toFixed(3) + (mode === 'jour' ? ', claire le jour' : ', sombre la nuit') + ')', mode === 'jour' ? lum(bg) > .6 : lum(bg) < .06);
  vrai(mode + ' : et se distingue des autres cases (' + (carte ? contraste(bg, carte).toFixed(3) : '?') + ' ≥ 1,08)', carte && contraste(bg, carte) >= 1.08);
  const halo = (jeton(bloc, 'inv-halo') || '').trim(), voile = halo === 'none' ? null : rgb((halo.match(/rgba\([^)]*\)/) || [])[0]);
  vrai(mode + ' : le halo se lit (' + (voile ? 'rgba ' + voile.join(',') : 'aucun') + ')', !!voile);
  const eclaire = voile ? sur(bg, voile) : bg;
  for (const [nom, c] of [['titre', fg], ['sous-titre', sub]]) {
    const r = Math.min(contraste(c, bg), contraste(c, eclaire));
    vrai(mode + ' : ' + nom + ' lisible partout sur la carte, halo compris (' + r.toFixed(2) + ' ≥ 4,5)', r >= 4.5);
  }
  vrai(mode + ' : la carte se détache de la page (' + contraste(bg, fond).toFixed(2) + ' ≥ 1,2)', contraste(bg, fond) >= 1.2);
}
vrai('la règle peint la couleur, le halo et le filet de la carte', /\.tuile-f\.inv \{ background-color: var\(--inv-bg\); background-image: var\(--inv-halo\); box-shadow: var\(--inv-bord\); color: var\(--inv-fg\); \}/.test(cssCode));

console.log('6 quinquies. un mode est un mode : aucune couleur qui ne suive pas le mode');
/* La maquette avait une famille de jetons « toujours sombres » (--nuit, --nuit-2…) : « Au dépôt », « Prêt en trois
   étapes », la carte OP MESSAGES, la conversation — sombres le jour, et de la couleur exacte de la page la nuit (la carte
   disparaissait). Chaque jeton de couleur du jour doit avoir sa valeur de nuit ; la sonde, elle, recense au navigateur
   toutes les grandes surfaces de chaque page (§ « rien de sombre sur la page de jour »). */
const nomsJetons = b => [...(b || '').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)].filter(m => /#|rgba?\(|gradient/.test(m[2])).map(m => m[1]);
const duJour = nomsJetons(jourBloc), deNuit = new Set(nomsJetons(nuitSys));
vrai('population : ' + duJour.length + ' jetons de couleur le jour', duJour.length >= 15);
const orphelins = duJour.filter(n => !deNuit.has(n));
vrai('chaque jeton de couleur du jour a sa valeur de nuit' + (orphelins.length ? ' — sans nuit : ' + orphelins.join(', ') : ''), orphelins.length === 0);
vrai('plus aucun jeton « toujours sombre » (--nuit…)', !/var\(--nuit/.test(cssCode) && !/--nuit[a-z0-9-]*:/.test(cssCode));
/* une couleur écrite EN DUR ne suit pas le mode — fond, texte, bord, trait, dégradé, nom de couleur, hsl()… sur TOUTES les
   règles, celles des @media comprises (la relecture adverse y a glissé `color:#0b1426`, `background: white`, un dégradé,
   la première règle d'un @media : aucun ne tombait). Seuls restent, nommés un par un : les voiles (derrière un menu ou une
   fenêtre, noirs par nature), le ruban d'aperçu (jamais servi à la racine), et les OMBRES noires (elles ne peignent
   aucune surface : une ombre se lit dans les deux modes). */
const ECARTS_DUR = { '.voile | background': 'le voile derrière le menu', '.fenetre | background': 'le voile derrière une fenêtre',
  '.ruban-apercu | background': 'le ruban d\'aperçu', '.ruban-apercu | color': 'le ruban d\'aperçu' };
const ombreNoire = ([, p, val]) => /shadow$/.test(p) && (val.match(/#[0-9a-f]{3,8}\b|\b(?:rgba?|hsla?)\([^)]*\)|\b(?:white|black)\b/gi) || []).every(x => /^rgba\(\s*0\s*,\s*0\s*,\s*0\s*,/.test(x));
const regles = MS.reglesAPlat(css);
vrai('population : les règles de la feuille se lisent, @media compris (' + regles.length + ' règles, dont ' + regles.filter(r => r.media).length + ' sous un @media)', regles.length > 250 && regles.filter(r => r.media).length >= 30);
const durs = MS.couleursEnDurFeuille(css), ecartsVus = new Set();
const fautes = durs.filter(d => { const k = d[0] + ' | ' + d[1]; if (k in ECARTS_DUR) { ecartsVus.add(k); return false; } return !ombreNoire(d); });
v('⛔ aucune couleur écrite en dur hors des écarts nommés', fautes.map(d => d.join(' | ')), []);
v('   et aucun écart qui ne sert plus', Object.keys(ECARTS_DUR).filter(k => !ecartsVus.has(k)), []);
const genTexte = fs.readFileSync(path.join(RACINE, 'scripts', 'site-marine.js'), 'utf8');
vrai('le générateur n\'écrit plus de carte « nuit » ni de couleur de sondage en dur', !/class="(grande-carte|app-carte) nuit"/.test(genTexte) && !/<i style="[^"]*background:#/.test(genTexte));

/* Même soirée, la photo de son iPhone : sous le Mac de la case « Interventions », une bande vide. Mesuré : 48 à 88 px
   de 430 à 360 px de large. La case prend la hauteur du Mac, l'ancienne hauteur devient un plafond — le bureau ne
   bouge pas (scratchpad/sonde-site.js le mesure, largeur par largeur). */
console.log('6 quater. une case à Mac prend la hauteur du Mac, jamais plus que la hauteur d\'avant');
const hLarge = (cssCode.match(/\.tuile-f\.large \.vue \{ height: (clamp\([^)]*\)); \}/) || [])[1];
const hBase = (cssCode.match(/\.tuile-f \.vue \{ position: relative;[^}]*height: (clamp\([^)]*\));/) || [])[1];
vrai('les hauteurs d\'avant se lisent (' + hBase + ' · ' + hLarge + ')', !!hLarge && !!hBase);
vrai('case à Mac : hauteur du contenu, plafond = la hauteur d\'avant, 24 px sous le socle', cssCode.includes('.tuile-f .vue.v-mac { height: auto; max-height: ' + hBase + '; padding-bottom: 24px; }'));
vrai('grande case à Mac : plafond = la hauteur d\'avant des grandes cases', cssCode.includes('.tuile-f.large .vue.v-mac { max-height: ' + hLarge + '; }'));
vrai('« Partout » garde sa hauteur (l\'iPhone posé devant occupe le bas)', !/\.vue\.duo \{[^}]*height/.test(cssCode));

console.log('7. OP MESSAGES : bientôt disponible, rien ne se choisit');
const msg = (PAGES.tarifs.match(/<div class="formules" id="formules-msg"[\s\S]*?<\/div>\s*<p class="note-msg">/) || [''])[0];
vrai('le bloc des formules OP MESSAGES est trouvé', msg.length > 500);
vrai('aucun lien de formule dans OP MESSAGES', !/href=/.test(msg));
v('trois « Bientôt disponible »', (msg.match(/Bientôt disponible/g) || []).length, 3);
vrai('la page OP MESSAGES le dit', texte(PAGES.opmessages).includes('Bientôt disponible'));

console.log('8. « Créer » part par e-mail, et le dit');
vrai('le formulaire n\'a pas d\'action serveur', /<form class="demande" id="demande" novalidate>/.test(PAGES.creer));
vrai('jamais « demande envoyée »', !/demande envoy[ée]/i.test(texte(PAGES.creer)));
const js = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//gm, ' ');
vrai('site.js prépare un mailto vers support@teamop.fr', /location\.href = 'mailto:support@teamop\.fr\?subject='/.test(js));
vrai('le métier part en tête de la demande', /lignes\.push\('MÉTIER CHOISI : '/.test(js));
v('12 métiers proposés, 6 packs prêts', [(PAGES.creer.match(/class="metier-puce"/g) || []).length, (PAGES.creer.match(/data-pret="1"/g) || []).length], [12, 6]);

console.log('9. référencement');
for (const c of CLES) vrai(c + ' : l\'aperçu porte « noindex »', PAGES[c].includes('<meta name="robots" content="noindex">'));
for (const c of CLES) vrai(c + ' : la page de racine ne le porte pas', !GEN.page(c, { racine: true }).includes('noindex'));
vrai('le lanceur d\'application n\'est que sur l\'accueil', PAGES.index.includes('teamop_app') && CLES.filter(c => c !== 'index').every(c => !PAGES[c].includes('teamop_app')));
vrai('le logo de la barre est celui de TEAM OP', CLES.every(c => PAGES[c].includes('<img src="/icons/teamop-192.png"')));
/* ⛔ LE LOGO QUE GOOGLE AFFICHE À CÔTÉ DE teamop.fr (Justin, 28 septembre 2026, capture d'une recherche : le rond vert
   d'OP GESTION). Google lit les <link rel="icon"> de la page d'accueil et préfère une grande image : chaque page déclare
   les icônes TEAM OP, dont une de 192 px, et AUCUNE icône d'OP GESTION (vertes : icons/icon-*, icons/opgestion-*,
   icons/apple-touch-icon.png) ne sert d'icône de page. */
const ICONES = c => (PAGES[c].match(/<link rel="(?:icon|apple-touch-icon|shortcut icon)"[^>]*>/g) || []);
vrai('population : ' + CLES.reduce((n, c) => n + ICONES(c).length, 0) + ' icônes de page déclarées', CLES.every(c => ICONES(c).length >= 4));
vrai('chaque page déclare le favicon, l\'icône 32 px ET l\'icône 192 px de TEAM OP', CLES.every(c => ['href="/favicon.ico"', 'href="/icons/teamop-favicon-32.png"', 'sizes="192x192" href="/icons/teamop-192.png"'].every(x => ICONES(c).some(l => l.includes(x)))));
v('aucune icône d\'OP GESTION (verte) ne sert d\'icône de page', CLES.filter(c => ICONES(c).some(l => /icons\/(?:icon-|opgestion-|apple-touch-icon\.png)/.test(l))), []);

const idsDoubles = CLES.map(c => { const n = {}; for (const m of PAGES[c].matchAll(/\sid="([^"]+)"/g)) n[m[1]] = (n[m[1]] || 0) + 1; return Object.keys(n).filter(k => n[k] > 1).map(k => c + '#' + k); }).flat();
v('aucun identifiant en double (#fonctions l\'était : la section ET les données des fenêtres — aucune ne s\'ouvrait)', idsDoubles, []);

/* 27 septembre 2026 : le site passe à la racine (« fait les 3 »). Deux choses se gardent à partir de là :
   · les pages de la RACINE sont, elles aussi, la sortie du générateur (--racine) — une retouche à la main
     disparaîtrait au passage suivant, et c'est désormais le site servi ;
   · le contrôle de syntaxe de la CI les accepte. Il passait chaque <script> à `new Function` : le bloc de
     données JSON d'elan.html et d'opmessages.html y était une erreur, et la CI de main serait tombée au rouge
     sur des pages justes (vu sur la copie de main, avant de pousser). */
/* le nom commercial d'une formule ne change pas avec le dessin du site : la maquette écrivait « Messages Premium »,
   le site en service et la page d'avant disaient « Messages Business Premium » (test-756 le relit dans tarifs.html) */
const TAR_T = texte(GEN.page('tarifs', { racine: true }));
v('les trois formules OP MESSAGES gardent leurs noms en service', ['Perso', 'Messages Pro', 'Messages Business Premium'].filter(n => !TAR_T.includes(n)), []);
vrai('plus de « Messages Premium » tout court', !/Messages Premium/.test(TAR_T));

/* ⛔ LA RACINE EST EN SERVICE : elle ne bouge que sur « remplace le site ». Jusque-là, elle est la v1 publiée le
   27 septembre (fe599df), empreinte gardée dans vitrine/racine-v1.json — pages ET ressources qu'elles lisent. Le
   jour du remplacement, elle devient la sortie du générateur, et ce fichier d'empreintes se retire. */
console.log('10. la racine et la CI');
const crypto = require('crypto'), h = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const V1 = fs.existsSync(path.join(RACINE, 'vitrine', 'racine-v1.json')) ? JSON.parse(fs.readFileSync(path.join(RACINE, 'vitrine', 'racine-v1.json'), 'utf8')) : null;
for (const c of CLES) {
  const f = path.join(RACINE, c + '.html');
  const lu = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  const genere = lu && lu === GEN.page(c, { racine: true });
  const v1 = V1 && lu && h(f) === V1.pages[c + '.html'];
  vrai(c + '.html (racine) est ' + (genere ? 'la sortie du générateur' : 'la v1 publiée, intacte') + ' (ni retouchée à la main, ni remplacée sans la phrase de Justin)', genere || v1);
}
if (V1) for (const r of Object.keys(V1.ressources)) vrai('la v1 en service garde ' + r + ' à l\'identique', fs.existsSync(path.join(RACINE, r)) && h(path.join(RACINE, r)) === V1.ressources[r]);
const blocsJson = CLES.reduce((n, c) => n + (GEN.page(c, { racine: true }).match(/<script type="application\/json"/g) || []).length, 0);
vrai('population : des blocs de données JSON dans les pages (' + blocsJson + ')', blocsJson >= 2);
const syntaxe = require('child_process').spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'verifier-syntaxe.js')], { encoding: 'utf8' });
vrai('le contrôle de syntaxe de la CI passe sur les pages de la racine — ' + (syntaxe.stdout || '').trim().split('\n').pop(), syntaxe.status === 0);

console.log('11. la preuve au navigateur existe');
vrai('scratchpad/sonde-site.js existe', fs.existsSync(path.join(RACINE, 'scratchpad', 'sonde-site.js')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
