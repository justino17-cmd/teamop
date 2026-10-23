/* ⛔ CE QUE CE FICHIER GARDE — UN TEXTE NE PROMET PAS CE QUE L'APPLICATION NE FAIT PAS (relecture du 23 octobre 2026).

   Le serveur enregistre les rubriques d'une entreprise (`cats`) et les rend à chaque ouverture (`/api/espaces/etat`) ; `app.html` et `beta.html` ne les lisent pas
   encore. Pendant ce temps, la grille du client et les panneaux de la Tour disaient « votre application ne montrera que ces rubriques » : un engagement commercial
   faux, visible, daté. Trois choses sont donc tenues, dans le CODE et par EXÉCUTION :
     1. UN drapeau (`CATS_APPLIQUEES`, tour.html) dit si l'application applique les rubriques ; il est comparé à ce que lit VRAIMENT app.html (la réponse de
        `/api/espaces/etat` dans `forfaitServeurSync`) — le jour où l'application les lit, le banc tombe jusqu'à ce que le drapeau passe à `true` ;
     2. hors des deux phrases qui dépendent du drapeau, aucun texte de la Tour ne dit « l'application ne montrera / montre que celles-là » ;
     3. la grille du client (`rubriques-choix.js`, partagée par l'espace client, la page de paiement et le site) ne le promet pas non plus : son texte est vrai quel que
        soit l'état de l'application (le choix part avec la demande et sert à ouvrir l'espace).
   Rien ne sort d'ici : aucun réseau. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const lire = (env, f) => fs.readFileSync(process.env[env] ? path.resolve(process.env[env]) : path.join(RACINE, f), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
/* le code sans ses commentaires (ceux qui COMMENCENT une ligne) — un motif se cherche dans le code, jamais dans une phrase */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const APPN = nu(lire('APP_FICHIER', 'app.html')), BETAN = nu(lire('BETA_FICHIER', 'beta.html')), TOURN = nu(lire('TOUR_FICHIER', 'tour.html')), RUBN = nu(lire('RUB_FICHIER', 'rubriques-choix.js'));

console.log('\n── 2893 · les textes ne promettent pas ce que l\'application ne fait pas ──');
/* l'application lit-elle les rubriques du serveur ? Chaque appel de `/api/espaces/etat` : si « cats » (le champ, ou une fonction qui l'applique) apparaît dans les
   6 000 signes qui suivent, la réponse est lue. */
function appLitCats(src) { let i = -1, n = 0, lit = false; while ((i = src.indexOf('/api/espaces/etat', i + 1)) >= 0) { n++; if (/cats/i.test(src.slice(i, i + 6000))) lit = true; } return { n, lit }; }
console.log('\n1. Le drapeau dit vrai');
const A = appLitCats(APPN), Bt = appLitCats(BETAN);
vrai('(population) app.html et beta.html appellent `/api/espaces/etat` (' + A.n + ' et ' + Bt.n + ' appel)', A.n >= 1 && Bt.n >= 1, A.n + '/' + Bt.n);
const DRAPEAU = (/var CATS_APPLIQUEES=(true|false);/.exec(TOURN) || [])[1];
vrai('(population) le drapeau est lu dans le code de la Tour', DRAPEAU === 'true' || DRAPEAU === 'false', DRAPEAU);
v('⛔ `CATS_APPLIQUEES` vaut ce que lit app.html (l\'application EN SERVICE) : aujourd\'hui rien — ' + (A.lit ? 'elle les lit' : 'elle ne les lit pas'), DRAPEAU === 'true', A.lit);

console.log('\n2. Aucun texte de la Tour ne promet autre chose que le drapeau');
const iDeb = TOURN.indexOf('var CATS_APPLIQUEES='), iFin = TOURN.indexOf('function demCatsDepart(');
vrai('(population) le bloc du drapeau et de ses deux phrases est trouvé', iDeb > 0 && iFin > iDeb, iDeb + '/' + iFin);
const bloc = TOURN.slice(iDeb, iFin);
const horsBloc = (TOURN.slice(0, iDeb) + TOURN.slice(iFin)).split('\n').filter(l => !/CATS_APPLIQUEES/.test(l)).join('\n');
const promesses = horsBloc.match(/l[’']application ne montre(?:ra)?\b[^.]{0,40}|Ce que l[’']application montre à cette entreprise|ne montrera à cette entreprise que/g) || [];
v('⛔ hors des phrases du drapeau, la Tour ne dit nulle part « l\'application ne montre(ra) que celles-là »', promesses, []);
const jouer = flag => vm.runInNewContext('var CATS_APPLIQUEES=' + flag + ';\n' + bloc.replace(/var CATS_APPLIQUEES=(true|false);/, '') + '\n({ a: catsEffet(), b: catsEffet(true), c: catsPromesse() })');
const F = jouer(false), T = jouer(true);
vrai('   drapeau FAUX : les phrases disent ce qui est vrai (enregistrées sur l\'espace, l\'application ne les applique pas encore), jamais « ne montrera »',
  /ne les applique pas encore/.test(F.a) && /ne les applique pas encore/.test(F.c) && !/ne montrera/.test(F.a + F.b + F.c), JSON.stringify(F));
vrai('   drapeau VRAI : elles reprennent la promesse (« l\'application ne montrera que celles-là »)', /ne montrera que celles-là/.test(T.a) && /ne montrera à cette entreprise que celles que tu retiens/.test(T.c), JSON.stringify(T));
v('   la variante à majuscule commence bien par une majuscule', [F.b[0] === F.b[0].toUpperCase(), T.b[0] === T.b[0].toUpperCase()], [true, true]);

console.log('\n3. La grille du client ne le promet pas non plus');
const OPRUB = require(path.join(RACINE, 'rubriques-choix.js'));
const ref = { ok: true, ordre: ['planning', 'devis'], groupes: ['Planification', 'Ventes'], toujours: [], metiers: { chauffage: { nom: 'Chauffage', rubriques: ['planning', 'devis'], pourquoi: {}, proposees: {} } },
  rubriques: { planning: { titre: 'Planning', ic: 'P', groupe: 'Planification', explication: 'Le planning de vos interventions, jour par jour.' }, devis: { titre: 'Devis', ic: 'D', groupe: 'Ventes', explication: 'Vos devis, de la demande à la signature.' } } };
const html = OPRUB.html(OPRUB.etat(ref, 'chauffage'), 'rub');
vrai('(population) la grille se rend (deux cases, une introduction)', /rub-aide/.test(html) && (html.match(/type="checkbox"/g) || []).length === 2, html.slice(0, 200));
vrai('⛔ l\'introduction de la grille ne promet pas « votre application ne montrera que ces rubriques » tant que l\'application ne les applique pas', A.lit || !/ne montrera/.test(html), (/rub-aide">[^<]*/.exec(html) || [''])[0]);
vrai('   et le code du module ne porte pas la phrase', A.lit || !/application ne montrera/.test(RUBN));
vrai('   elle dit ce qui est vrai : le choix part avec la demande et sert à ouvrir l\'espace', /votre choix part avec votre demande/.test(html), (/rub-aide">[^<]*/.exec(html) || [''])[0]);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
