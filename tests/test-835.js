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
  const nuit = (m[1].match(/<source media="\(prefers-color-scheme: dark\)" srcset="([^"]+)"/) || [])[1] || '';
  const jour = (m[1].match(/<img src="([^"]+)"/) || [])[1] || '';
  const racineJ = jour.replace(/-jour(-1x)?\.webp$/, ''), racineN = nuit.split(/[\s,]/)[0].replace(/-nuit(-1x)?\.webp$/, '');
  vrai(c + ' : ' + path.basename(racineJ) + ' a son jour et sa nuit', /-jour(-1x)?\.webp$/.test(jour) && /-nuit(-1x)?\.webp$/.test(nuit.split(/[\s,]/)[0]) && racineJ === racineN);
  vrai(c + ' : l\'écran a un texte de remplacement', /<img [^>]*alt="[^"]{12,}"/.test(m[1]));
}
vrai('population : ' + ecrans + ' écrans d\'appareil', ecrans >= 6);
for (const f of fs.readdirSync(path.join(RACINE, 'vitrine', 'captures'))) vrai('captures : ' + f + ' pèse moins de 400 Ko', fs.statSync(path.join(RACINE, 'vitrine', 'captures', f)).size < 400 * 1024);

console.log('6. pas de bouton de mode');
for (const c of CLES) vrai(c + ' : ni « Mode jour » ni « Mode nuit » ni data-theme', !/Mode jour|Mode nuit|data-theme|setMode/.test(PAGES[c]));
const css = fs.readFileSync(path.join(RACINE, 'vitrine', 'site.css'), 'utf8');
vrai('la nuit vient du système (prefers-color-scheme: dark)', /@media \(prefers-color-scheme: dark\)\s*\{\s*:root\s*\{/.test(css));

console.log('7. OP MESSAGES : bientôt disponible, rien ne se choisit');
const msg = (PAGES.tarifs.match(/<div class="formules" id="formules-msg"[\s\S]*?<\/div>\s*<p class="note-msg">/) || [''])[0];
vrai('le bloc des formules OP MESSAGES est trouvé', msg.length > 500);
vrai('aucun lien de formule dans OP MESSAGES', !/href=/.test(msg));
v('trois « Bientôt disponible »', (msg.match(/Bientôt disponible/g) || []).length, 3);
vrai('la page OP MESSAGES le dit', texte(PAGES.opmessages).includes('Bientôt disponible'));

console.log('8. « Créer » part par e-mail, et le dit');
vrai('le formulaire n\'a pas d\'action serveur', /<form class="demande" id="demande" novalidate>/.test(PAGES.creer));
vrai('jamais « demande envoyée »', !/demande envoy[ée]/i.test(texte(PAGES.creer)));
const js = fs.readFileSync(path.join(RACINE, 'vitrine', 'site.js'), 'utf8').replace(/^\s*\/\*[\s\S]*?\*\//gm, ' ');
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
console.log('10. la racine et la CI');
for (const c of CLES) {
  const f = path.join(RACINE, c + '.html');
  const lu = fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : '';
  vrai(c + '.html (racine) est la sortie du générateur (sinon : node scripts/site-marine.js --racine)', lu && lu === GEN.page(c, { racine: true }));
}
const blocsJson = CLES.reduce((n, c) => n + (GEN.page(c, { racine: true }).match(/<script type="application\/json"/g) || []).length, 0);
vrai('population : des blocs de données JSON dans les pages (' + blocsJson + ')', blocsJson >= 2);
const syntaxe = require('child_process').spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'verifier-syntaxe.js')], { encoding: 'utf8' });
vrai('le contrôle de syntaxe de la CI passe sur les pages de la racine — ' + (syntaxe.stdout || '').trim().split('\n').pop(), syntaxe.status === 0);

console.log('11. la preuve au navigateur existe');
vrai('scratchpad/sonde-site.js existe', fs.existsSync(path.join(RACINE, 'scratchpad', 'sonde-site.js')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
if (ko) process.exitCode = 1;
