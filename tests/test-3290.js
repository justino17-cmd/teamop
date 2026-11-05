/* test-3290 — L'ÉCRAN DE DÉMARRAGE (nuit du 5 novembre 2026, chantier performance).
   Le script de l'application est EN LIGNE, à la fin de la page : tant qu'il n'a pas fini d'arriver puis de s'exécuter, rien
   n'était peint (`#login` et `#app-root` sont `display:none` dans le HTML). Mesuré : premier affichage à 9,2 s sur une première
   visite en mauvaise 4G (processeur ×4), 2,5 à 4,4 s à chaque ouverture depuis la copie du service worker. Un bloc statique
   `#demarrage`, placé AVANT le script, est peint dès les premiers octets (1,4 s, 0,2 s) et se retire SANS JavaScript quand
   l'application pose `display:flex` sur `#login` ou `#app-root`.
   Ce banc lit le CODE de la page (commentaires retirés) : l'ordre dans le document, les deux règles qui le retirent, le filet,
   et que les deux issues de `boot()` posent bien `display:flex` — sinon le démarrage resterait. La preuve au navigateur
   (retrait à la connexion ET à l'entrée, de jour et de nuit, le filet armé) est une sonde : scratchpad/sonde-demarrage.js. */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SW = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
let ok = 0, ko = 0; const v = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };

/* le HTML d'avant le premier script, sans ses commentaires : c'est ce que le navigateur peint avant que le script n'arrive */
const iScript = APP.indexOf('<script>');
const AVANT = APP.slice(0, iScript).replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, ' ');
v('le premier script est trouvé (sinon la tranche est vide et tout passerait)', iScript > 100000, String(iScript));

const iLogin = AVANT.indexOf('<div class="login" id="login"'), iApp = AVANT.indexOf('<div class="app" id="app-root"'), iDem = AVANT.indexOf('<div id="demarrage"');
v('#login, #app-root et #demarrage sont dans le HTML d\'avant le script', iLogin > 0 && iApp > 0 && iDem > 0, [iLogin, iApp, iDem].join(','));
v('#demarrage vient APRÈS #login et #app-root (le sélecteur frère « ~ » ne voit que ce qui suit)', iDem > iLogin && iDem > iApp);
v('et AVANT le premier script', iDem > 0 && iDem < AVANT.length);

const bloc = AVANT.slice(iDem, AVANT.indexOf('</div>', iDem) + 6);
v('le bloc est court (il doit arriver dans les premiers kilo-octets)', bloc.length > 40 && bloc.length < 700, String(bloc.length));
v('il ne contient aucun script, ni gestionnaire en ligne', !/<script|\son[a-z]+=/i.test(bloc));
v('il est caché aux lecteurs d\'écran (aria-hidden) : il ne dit rien de plus que l\'écran qui vient', /aria-hidden="true"/.test(bloc));
v('son icône est celle que le service worker garde déjà (aucun octet de plus)', /src="icons\/icon-192\.png"/.test(bloc) && /'icons\/icon-192\.png'/.test(SW));

/* le CSS : une seule feuille mineure, juste avant le bloc */
const css = (AVANT.match(/<style>\s*#demarrage\{[\s\S]*?<\/style>/) || [''])[0];
v('sa feuille est posée avec lui', css.length > 100, String(css.length));
v('il couvre l\'écran entier, au-dessus de la page', /#demarrage\{[^}]*position:fixed;inset:0/.test(css));
v('il suit le thème de l\'appareil par les variables de la page (jour ET nuit)', /background:var\(--bg\)/.test(css) && /color:var\(--t1\)/.test(css));
v('il se retire quand la connexion s\'affiche', /#login\[style\*="flex"\] ~ #demarrage/.test(css));
v('il se retire quand l\'application s\'affiche', /#app-root\[style\*="flex"\] ~ #demarrage/.test(css));
v('les deux règles le mettent à display:none', /#login\[style\*="flex"\] ~ #demarrage,#app-root\[style\*="flex"\] ~ #demarrage\{display:none\}/.test(css));
v('un filet le retire au bout de 25 s si boot() n\'aboutit jamais', /animation:demarrageFiltre 0s linear 25s forwards/.test(css) && /@keyframes demarrageFiltre\{to\{visibility:hidden\}\}/.test(css));
v('aucun :has() sur un attribut style (règle du dépôt : il restyle toute la page à chaque écriture)', !/:has\([^)]*\[style/.test(css));

/* les deux issues de boot() posent bien « flex » sur ce que les règles guettent */
const CODE = APP.slice(iScript).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
v('l\'écran de connexion se montre par style.display=\'flex\' sur #login', /\$\('login'\)\.style\.display='flex'/.test(CODE));
v('et l\'entrée dans l\'application par display:flex sur #app-root (jamais autre chose)', /\$\('app-root'\)\.style\.display='flex'/.test(CODE));
v('la page garde #login et #app-root en display:none au départ (sinon le démarrage les recouvrirait pour rien)', /id="login" style="display:none"/.test(AVANT) && /id="app-root" style="display:none"/.test(AVANT));

console.log('\n════ test-3290 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
