/* ⛔ CE QUE CE FICHIER GARDE — LE GÉNÉRATEUR DE L'INTERFACE SERVIE (`scripts/opmsg-public.js`).

   `server-msg/public/` n'est PAS écrit à la main : le générateur le fabrique depuis l'interface de Justin (`apercu/opmessages/index.html`), en ne
   changeant que la pièce de données, le script en ligne (extrait : politique `script-src 'self'`) et la politique de la page. Ce banc garde trois choses :
     · CE QUI EST COMMITÉ EST CE QUE LE GÉNÉRATEUR PRODUIRAIT (octet pour octet) — sinon quelqu'un a retouché à la main la page servie, ou changé
       l'aperçu sans régénérer, et le service sert une interface qui n'est plus celle que Justin a validée ;
     · LA SORTIE NE DIFFÈRE DE L'APERÇU QUE PAR LES SUBSTITUTIONS DÉCLARÉES : on les INVERSE et on retrouve l'aperçu exact (aucune retouche cachée) ;
     · LE GÉNÉRATEUR REFUSE UNE SORTIE QUI MENTIRAIT : source de démonstration (`simulerRecu`, les conversations d'exemple), module de données qui ne tient pas le
       contrat de la page, ensemble qui n'appelle aucune route /api/, script en ligne, gestionnaire d'événement en attribut, ressource d'un autre domaine,
       substitution qui ne trouve pas UNE cible. Chaque refus est joué sur une COPIE mutée ; et le banc lui-même est éprouvé par `mutations` sur le générateur
       (retirer une garde du générateur doit faire tomber CE banc — « une garde décrite n'est pas une garde »). */
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const GEN = require('../scripts/opmsg-public.js');
const RACINE = path.join(__dirname, '..');

const FICHIERS = ['apercu/opmessages/index.html', 'server-msg/public/api.js', 'server-msg/public/source-serveur.js', 'server-msg/public/sw.js', 'server-msg/public/manifest.webmanifest',
  'icons/opmsg-192.png', 'icons/opmsg-512.png', 'icons/opmsg-apple-touch.png', 'icons/opmsg-favicon-32.png'];
function copie() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-941-'));
  for (const f of FICHIERS) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.copyFileSync(path.join(RACINE, f), path.join(d, f)); }
  return d;
}
const muter = (d, f, fn) => { const p = path.join(d, f); fs.writeFileSync(p, fn(fs.readFileSync(p, 'utf8'))); };
function refuse(titre, f, fn, motif) {
  const d = copie();
  try {
    muter(d, f, fn);
    let msg = null;
    try { GEN.generer({ racine: d }); } catch (e) { msg = e instanceof GEN.ErreurGenerateur ? e.message : 'AUTRE ERREUR : ' + (e && e.stack || e); }
    vrai('⛔ ' + titre + ' → le générateur REFUSE' + (msg && !(msg.startsWith('AUTRE')) ? ' (« ' + msg.slice(0, 90) + (msg.length > 90 ? '…' : '') + ' »)' : ''), msg !== null && !msg.startsWith('AUTRE') && motif.test(msg));
    if (msg && msg.startsWith('AUTRE')) console.log('      ' + msg.slice(0, 300));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

console.log('Ce qui est commité est ce que le générateur produit');
/* ⛔ si le générateur REFUSE les sources commitées (un service worker qui écoute `fetch`, un manifeste qui a changé de forme…), le banc le DIT par un ✗ qui cite le refus, au lieu de mourir sur une exception
   sans total (pris par les mutations W04 et W05 de `mutations-push.js`) */
let g;
try { g = GEN.generer({}); } catch (e) {
  vrai('⛔ le générateur ACCEPTE les sources commitées (il les refuse : « ' + String(e && e.message || e).slice(0, 220) + ' »)', false);
  fin();   // (sort en 1 : un ✗ est compté)
}
v('population : le générateur produit six fichiers (la page, son script, quatre icônes) — le service worker et le manifeste sont des SOURCES lues, pas des sorties', Object.keys(g.fichiers).sort(), ['index.html', 'opmsg-192.png', 'opmsg-512.png', 'opmsg-apple-touch.png', 'opmsg-favicon-32.png', 'opmsg-ui.js']);
v('⛔ server-msg/public/ est À JOUR (octet pour octet) : personne n\'a retouché la page servie à la main, l\'aperçu n\'a pas changé sans régénération', GEN.ecarts(g), []);
vrai('population : l\'ensemble servi lit plus de 30 méthodes de la source et appelle plus de 15 routes /api/ (' + g.rapport.methodes + ', ' + g.rapport.routes + ')', g.rapport.methodes >= 30 && g.rapport.routes >= 15);

console.log('\nLa sortie ne diffère de l\'aperçu que par les substitutions déclarées');
{
  const apercu = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
  const html = g.fichiers['index.html'].toString('utf8'), ui = g.fichiers['opmsg-ui.js'].toString('utf8');
  /* on INVERSE chaque substitution : on doit retrouver l'aperçu au caractère près */
  /* le manifeste, l'icône d'écran d'accueil et les trois métas se retirent EN PREMIER : sinon le renvoi des icônes vers ../../icons/ les toucherait aussi */
  let inv = html.replace(GEN.LIGNE_ICONE + GEN.LIGNES_PWA, GEN.LIGNE_ICONE).replace('<script src="api.js"></script>\n<script src="source-serveur.js"></script>', '<script src="source.js"></script>').replace('<script src="opmsg-ui.js"></script>', () => '<script>\n' + ui + '</script>');
  inv = inv.split('src="opmsg-').join('src="../../icons/opmsg-').split('href="opmsg-').join('href="../../icons/opmsg-');
  inv = inv.replace('<title>OP MESSAGES</title>', '<title>OP MESSAGES — aperçu</title>').replace('OP MESSAGES a besoin de JavaScript.', 'Cet aperçu d\'OP MESSAGES a besoin de JavaScript.');
  const csp = (s) => s.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '<CSP>');
  const sansCommentaireCsp = (s) => s.replace(/<!-- ⛔ (?:AUCUN APPEL RÉSEAU|FICHIER GÉNÉRÉ)[\s\S]*?-->\n/, '');
  v('⛔ inverser les substitutions (pièce de données, script extrait, logo, titre, phrase) redonne l\'aperçu EXACT — hors politique de la page et son commentaire, qui sont les deux seules différences voulues', sansCommentaireCsp(csp(inv)) === sansCommentaireCsp(csp(apercu)), true);
  vrai('la politique du service remplace celle de l\'aperçu : connect-src \'self\' (le réseau, vers le service seul), plus de « default-src none » sans connect-src', html.includes(GEN.CSP_SERVICE) && !/content="default-src 'none'; img-src 'self' blob:; media-src blob:;/.test(html));
  v('⛔ aucun script en ligne, aucun onclick=, aucun domaine tiers dans la page servie', [/<script(?![^>]*\bsrc=)[^>]*>/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), /\son[a-z]+\s*=\s*["']/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), /(src|href)="https?:\/\//i.test(html)], [false, false, false]);
  v('les trois scripts, dans l\'ordre : le client, le module de données, l\'interface', Array.from(html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)).map(m => m[1]), ['api.js', 'source-serveur.js', 'opmsg-ui.js']);
  v('⛔ ni source de démonstration ni nom d\'exemple dans ce que le service sert', GEN.MARQUES_DEMO.filter(x => (html.replace(/<!--[\s\S]*?-->/g, '') + T.sansCommentaires(ui) + T.sansCommentaires(fs.readFileSync(path.join(RACINE, 'server-msg/public/source-serveur.js'), 'utf8'))).includes(x)), []);
  v('les icônes sont celles du dépôt, octet pour octet', GEN.ICONES.map(i => g.fichiers[i].equals(fs.readFileSync(path.join(RACINE, 'icons', i)))), [true, true, true, true]);
  vrai('population : quatre icônes, et la page déclare son manifeste, son icône d\'écran d\'accueil et son titre d\'application — UNE fois chacun', GEN.ICONES.length === 4 && [GEN.LIGNES_PWA.match(/<link rel="manifest"/g), GEN.LIGNES_PWA.match(/<link rel="apple-touch-icon"/g), GEN.LIGNES_PWA.match(/apple-mobile-web-app-title/g)].every(m => m && m.length === 1) && html.includes(GEN.LIGNES_PWA));
  vrai('la politique de la page DIT worker-src et manifest-src (le manifeste ne retombe que sur default-src none : sans ce mot, le navigateur refuserait de le lire en silence)', /worker-src 'self'/.test(html) && /manifest-src 'self'/.test(html));
}

console.log('\nLe générateur REFUSE une sortie qui mentirait (chaque refus joué sur une copie mutée)');
refuse('source de démonstration dans le module du service (simulerRecu)', 'server-msg/public/source-serveur.js', s => s.replace('const source = {', 'const source = { simulerRecu() {},'), /DÉMONSTRATION/);
refuse('un nom d\'exemple de l\'aperçu dans l\'interface (« Camille Roux »)', 'apercu/opmessages/index.html', s => s.replace("const SUFFIXE_TITRE", "const EXEMPLE = 'Camille Roux'; const SUFFIXE_TITRE"), /DÉMONSTRATION/);
refuse('le module du service perd une méthode obligatoire (verifierSession)', 'server-msg/public/source-serveur.js', s => s.replace('demarrer, connexion, deconnexion, verifierSession, arreter,', 'demarrer, connexion, deconnexion, arreter,'), /contrat.*verifierSession|verifierSession/);
refuse('la page appelle une méthode que le module n\'a pas (source.inventee)', 'apercu/opmessages/index.html', s => s.replace("const SUFFIXE_TITRE", "source.inventee(); const SUFFIXE_TITRE"), /inventee/);
refuse('le module n\'annonce plus ses capacités', 'server-msg/public/source-serveur.js', s => s.replace('capacites: { service: true', 'capacitesx: { service: true'), /capacit/);
refuse('une seconde balise source.js dans la page', 'apercu/opmessages/index.html', s => s.replace('<script src="source.js"></script>', '<script src="source.js"></script><script src="source.js"></script>'), /UNE cible|source\.js/);
refuse('le titre de l\'aperçu écrit DEUX fois (la substitution trouverait deux cibles et n\'en changerait qu\'une)', 'apercu/opmessages/index.html', s => s.replace('</head>', '<title>OP MESSAGES — aperçu</title></head>'), /UNE cible/);
refuse('un second script en ligne', 'apercu/opmessages/index.html', s => s.replace('</body>', '<script>window.x = 1;</script></body>'), /UN script en ligne/);
refuse('la politique de la page a changé de forme (plus de meta CSP)', 'apercu/opmessages/index.html', s => s.replace('http-equiv="Content-Security-Policy"', 'http-equiv="X-Autre"'), /CSP|politique/);
refuse('un gestionnaire onclick= dans la page', 'apercu/opmessages/index.html', s => s.replace('<p class="hors-ligne"', '<p onclick="alert(1)" class="hors-ligne"'), /gestionnaire/);
refuse('une image d\'un autre domaine dans la page', 'apercu/opmessages/index.html', s => s.replace('<p class="hors-ligne"', '<img src="https://evil.example/x.png" alt=""><p class="hors-ligne"'), /autre domaine/);
refuse('un script d\'un autre domaine dans la page', 'apercu/opmessages/index.html', s => s.replace('<script src="source.js"></script>', '<script src="source.js"></script><script src="https://evil.example/x.js"></script>'), /autre domaine|ordre des scripts/);
refuse('l\'ensemble servi n\'appelle plus le service (aucune route /api/)', 'server-msg/public/api.js', s => s.split("'/api/").join("'/x/"), /routes/);
{
  const d = copie();
  try {
    fs.rmSync(path.join(d, 'icons/opmsg-192.png'));
    let msg = null;
    try { GEN.generer({ racine: d }); } catch (e) { msg = e instanceof GEN.ErreurGenerateur ? e.message : 'AUTRE ERREUR : ' + (e && e.stack || e); }
    vrai('⛔ le logo du dépôt manque → le générateur REFUSE (« ' + String(msg).slice(0, 70) + ' »)', msg !== null && /introuvable/.test(msg) && /opmsg-192/.test(msg));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}
refuse('l\'interface change de forme : le commentaire de politique a disparu', 'apercu/opmessages/index.html', s => s.replace('<!-- ⛔ AUCUN APPEL RÉSEAU', '<!-- ⛔ AUTRE CHOSE'), /UNE cible|commentaire/);

console.log('\nLe service worker et le manifeste : le générateur REFUSE ceux qui mentiraient (chacun joué sur une copie mutée)');
const SW = 'server-msg/public/sw.js', MAN = 'server-msg/public/manifest.webmanifest';
refuse('sw.js écoute `fetch` (il s\'interposerait entre la page et le réseau : une page périmée servie un jour)', SW, s => s + "\nself.addEventListener('fetch', (e) => { e.respondWith(fetch(e.request)); });\n", /s'interpose/);
refuse('sw.js ouvre un cache (`caches`)', SW, s => s + "\nself.addEventListener('install', (e) => { e.waitUntil(caches.open('v1')); });\n", /s'interpose/);
refuse('sw.js charge un script d\'ailleurs (`importScripts`)', SW, s => s + "\nimportScripts('autre.js');\n", /s'interpose/);
refuse('sw.js appelle le réseau (`fetch(`, sans écouteur)', SW, s => s + "\nfetch('/api/config');\n", /s'interpose/);
refuse('sw.js référence une adresse d\'un autre domaine', SW, s => s + "\nconst AILLEURS = 'https://evil.example/collecte';\n", /autre domaine/);
refuse('sw.js ne reçoit plus de push (l\'écouteur `push` renommé)', SW, s => s.replace("addEventListener('push'", "addEventListener('pousse'"), /ne reçoit plus de push/);
refuse('sw.js n\'ouvre plus la conversation au toucher (`notificationclick` retiré)', SW, s => s.replace("addEventListener('notificationclick'", "addEventListener('notificationclic'"), /ne reçoit plus de push|toucher/);
refuse('sw.js n\'affiche plus la notification (`showNotification` retiré : Safari retirerait l\'abonnement)', SW, s => s.replace('self.registration.showNotification(', 'self.registration.montrer('), /ne reçoit plus de push|affiche/);
refuse('le manifeste n\'est plus du JSON', MAN, s => s.replace('{', '{ // commentaire'), /pas du JSON/);
refuse('le manifeste ne s\'appelle plus « OP MESSAGES »', MAN, s => s.replace('"name": "OP MESSAGES"', '"name": "Autre chose"'), /changé de forme/);
refuse('le manifeste n\'est plus « standalone » (l\'application s\'ouvrirait dans un onglet : pas de push sur iPhone)', MAN, s => s.replace('"display": "standalone"', '"display": "browser"'), /changé de forme/);
refuse('le manifeste démarre ailleurs que sur « / »', MAN, s => s.replace('"start_url": "/"', '"start_url": "/index.html"'), /changé de forme/);
refuse('le manifeste cite une icône que le générateur ne sert pas', MAN, s => s.replace('"src": "opmsg-192.png"', '"src": "icone-inconnue.png"'), /cite une icône/);
refuse('le manifeste cite une icône d\'un autre domaine', MAN, s => s.replace('"src": "opmsg-192.png"', '"src": "https://evil.example/i.png"'), /cite une icône/);
refuse('le manifeste n\'a plus d\'icône de 512 pixels (la page ne serait plus installable)', MAN, s => s.split('"512x512"').join('"384x384"'), /192 et de 512/);
refuse('le manifeste référence une adresse d\'un autre domaine', MAN, s => s.replace('"lang": "fr",', '"lang": "fr", "homepage_url": "https://evil.example/",'), /autre domaine/);
refuse('le manifeste perd ses couleurs en hexadécimal', MAN, s => s.replace('"#1a2e6b"', '"bleu"'), /couleurs/);
refuse('l\'aperçu déclare déjà un manifeste (la page en porterait DEUX)', 'apercu/opmessages/index.html', s => s.replace('</head>', '<link rel="manifest" href="manifest.webmanifest"></head>'), /UNE fois/);
refuse('l\'icône d\'onglet de l\'aperçu a changé de forme (le générateur ne sait plus où poser le manifeste)', 'apercu/opmessages/index.html', s => s.replace('type="image/png" sizes="32x32">', 'type="image/png" sizes="32x32" data-x="1">'), /UNE cible/);
{
  const d = copie();
  try {
    fs.rmSync(path.join(d, 'icons/opmsg-512.png'));
    let msg = null;
    try { GEN.generer({ racine: d }); } catch (e) { msg = e instanceof GEN.ErreurGenerateur ? e.message : 'AUTRE ERREUR : ' + (e && e.stack || e); }
    vrai('⛔ l\'icône de 512 pixels du dépôt manque → le générateur REFUSE (« ' + String(msg).slice(0, 70) + ' »)', msg !== null && /introuvable/.test(msg) && /opmsg-512/.test(msg));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

console.log('\nUne sortie fabriquée à la main ne passe pas la vérification');
{
  const d = copie();
  try {
    const g2 = GEN.generer({ racine: d });
    GEN.ecrire(g2);
    v('population : écrite dans une copie, la sortie est « à jour »', GEN.ecarts(GEN.generer({ racine: d })), []);
    fs.appendFileSync(path.join(d, 'server-msg/public/index.html'), '\n<!-- retouche à la main -->');
    v('⛔ une retouche à la main de la page servie est DÉTECTÉE (--verifier échouerait)', GEN.ecarts(GEN.generer({ racine: d })), ['index.html']);
    GEN.ecrire(GEN.generer({ racine: d }));
    v('population : régénérée, la copie est de nouveau « à jour »', GEN.ecarts(GEN.generer({ racine: d })), []);
    muter(d, 'apercu/opmessages/index.html', s => s.replace('<p class="hors-ligne"', '<!-- ajout dans l\'aperçu --><p class="hors-ligne"'));
    v('⛔ un aperçu changé SANS régénérer est détecté aussi (la page servie n\'est plus celle que Justin a validée)', GEN.ecarts(GEN.generer({ racine: d })), ['index.html']);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}
fin();
