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
   6. aucun bouton de mode (le site suit le système, sans bouton — THEME.md § 0) ;
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
v('huit pages', CLES.sort(), ['applications', 'creer', 'elan', 'index', 'metiers', 'opmessages', 'pourquoi', 'tarifs']);
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
for (const f of GEN.FORMULES_GESTION) {
  const p = PLANS[f.cle];
  vrai(f.cle + ' : nom « ' + f.nom + ' » = « ' + (p && p.nom) + ' »', p && p.nom === f.nom);
  vrai(f.cle + ' : prix ' + f.prix + ' = ' + (p && p.prix), p && p.prix.startsWith(f.prix + ' '));
  vrai(f.cle + ' : ' + f.places + ' (' + (p && p.places) + ' dans l\'application)', p && new RegExp('^' + p.places + ' utilisateur').test(f.places));
}
const faq = texte(PAGES.tarifs);
const attendu = `1 en Gratuit, 1 en Pro, ${PLANS.business.places} en Business, ${PLANS.premium.places} en Business Premium`;
vrai('la FAQ dit « ' + attendu + ' »', faq.includes(attendu));
vrai('l\'exemple de la FAQ compte juste (Business × 2 = ' + 2 * PLANS.business.places + ' comptes)', faq.includes('Business × 2 = ' + 2 * PLANS.business.places + ' comptes'));
vrai('plus aucune trace de « 5 en Business Premium »', !/5 en Business Premium|3 en Business,/.test(faq));

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
vrai('les formules mènent à la page d\'abonnement (4 formules)', ['gratuit', 'pro', 'business', 'premium'].every(k => PAGES.tarifs.includes('href="/recap-abonnement.html?formule=' + k + '"')));

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

/* 27 septembre au soir, Justin : « je veux vraiment un mode jour et un mode nuit ». Le site suit toujours
   l'appareil ; un bouton force l'autre mode et le garde. Ce banc gardait l'inverse (« pas de bouton ») : c'était
   la maquette, c'est désormais sa phrase qui décide. */
console.log('6. jour et nuit : l\'appareil, et un bouton qui force');
for (const c of CLES) vrai(c + ' : le bouton ☀︎/☾ est dans la barre, caché tant que le script ne l\'a pas branché', /<button class="mode" type="button" hidden aria-label="Passer en mode nuit"/.test(PAGES[c]));
for (const c of CLES) vrai(c + ' : le mode choisi se pose AVANT le premier rendu (script dans <head>)', /<head>[\s\S]*localStorage\.getItem\('teamop_site_mode'\)[\s\S]*<\/head>/.test(PAGES[c]));
const css = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.css'), 'utf8');
const nuitSys = (css.match(/@media \(prefers-color-scheme: dark\)\s*\{\s*:root:not\(\[data-theme="light"\]\)\s*\{([^}]*)\}/) || [])[1];
const nuitForcee = (css.match(/\n:root\[data-theme="dark"\]\s*\{([^}]*)\}/) || [])[1];
vrai('la nuit de l\'appareil ne s\'applique pas quand on a forcé le jour', !!nuitSys);
vrai('la nuit forcée a son bloc', !!nuitForcee);
vrai('⛔ et les deux blocs de nuit sont IDENTIQUES (deux copies d\'une palette divergent toujours)', !!nuitSys && nuitSys.replace(/\s+/g, ' ').trim() === (nuitForcee || '').replace(/\s+/g, ' ').trim());
const jsv2 = fs.readFileSync(path.join(RACINE, 'vitrine', 'v2', 'site.js'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//gm, ' ');
vrai('les écrans de nuit suivent le bouton (le media des <source> est réécrit)', /\$\$\('source\[data-nuit\]'\)\.forEach/.test(jsv2));
vrai('la même clé dans la page et dans le script', /var CLE_MODE = 'teamop_site_mode'/.test(jsv2));

console.log('6 bis. tarifs : la formule touchée devient la bleue');
vrai('le script rend les cartes choisissables (classe « choix », phare déplacé)', /g\.classList\.add\('choix'\)/.test(jsv2) && /x\.classList\.toggle\('phare', x === c\)/.test(jsv2));
vrai('OP MESSAGES : ses boutons prennent les couleurs d\'OP GESTION (plus de fond gris)', /\.formule \.cta\.attente \{ cursor: inherit; \}/.test(css) && !/\.cta\.attente \{[^}]*background/.test(css));

/* 27 septembre au soir, Justin, sur son iPhone en mode sombre : « pourquoi là c'est blanc ? ». La maquette retournait
   la carte mise en avant (sombre de jour, BLANCHE de nuit) : un aplat blanc de 700 px dans une page de nuit. Elle reste
   sombre dans les deux modes ; de nuit, c'est un bleu plus clair et un halo qui la distinguent. Les contrastes se
   recalculent ici, au point le plus éclairé du halo — là où sont posés le titre et le sous-titre. */
console.log('6 ter. la carte mise en avant : sombre de jour ET de nuit, lisible sous son halo');
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
  vrai(mode + ' : ⛔ la carte est SOMBRE (luminance ' + lum(bg).toFixed(3) + ', jamais un aplat clair)', lum(bg) < .06);
  const halo = (jeton(bloc, 'inv-halo') || '').trim(), voile = halo === 'none' ? null : rgb((halo.match(/rgba\([^)]*\)/) || [])[0]);
  vrai(mode + ' : le halo se lit (' + (voile ? 'rgba ' + voile.join(',') : 'aucun') + ')', halo === 'none' || !!voile);
  const eclaire = voile ? sur(bg, voile) : bg;
  for (const [nom, c] of [['titre', fg], ['sous-titre', sub]]) {
    const r = Math.min(contraste(c, bg), contraste(c, eclaire));
    vrai(mode + ' : ' + nom + ' lisible partout sur la carte, halo compris (' + r.toFixed(2) + ' ≥ 4,5)', r >= 4.5);
  }
  if (mode === 'nuit') vrai('nuit : la carte se détache de la page (' + contraste(bg, fond).toFixed(2) + ' ≥ 1,25)', contraste(bg, fond) >= 1.25);
}
vrai('la règle peint la couleur, le halo et le filet de la carte', /\.tuile-f\.inv \{ background-color: var\(--inv-bg\); background-image: var\(--inv-halo\); box-shadow: var\(--inv-bord\); color: var\(--inv-fg\); \}/.test(cssCode));
vrai('le jour n\'a ni halo ni filet (la carte de la maquette, inchangée)', /--inv-halo: none;/.test(jourBloc) && /--inv-bord: none;/.test(jourBloc));

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
