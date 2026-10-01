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

const FICHIERS = ['apercu/opmessages/index.html', 'server-msg/public/api.js', 'server-msg/public/source-serveur.js', 'icons/opmsg-192.png', 'icons/opmsg-favicon-32.png'];
function copie() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-912-'));
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
const g = GEN.generer({});
v('population : le générateur produit quatre fichiers', Object.keys(g.fichiers).sort(), ['index.html', 'opmsg-192.png', 'opmsg-favicon-32.png', 'opmsg-ui.js']);
v('⛔ server-msg/public/ est À JOUR (octet pour octet) : personne n\'a retouché la page servie à la main, l\'aperçu n\'a pas changé sans régénération', GEN.ecarts(g), []);
vrai('population : l\'ensemble servi lit plus de 30 méthodes de la source et appelle plus de 15 routes /api/ (' + g.rapport.methodes + ', ' + g.rapport.routes + ')', g.rapport.methodes >= 30 && g.rapport.routes >= 15);

console.log('\nLa sortie ne diffère de l\'aperçu que par les substitutions déclarées');
{
  const apercu = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
  const html = g.fichiers['index.html'].toString('utf8'), ui = g.fichiers['opmsg-ui.js'].toString('utf8');
  /* on INVERSE chaque substitution : on doit retrouver l'aperçu au caractère près */
  let inv = html.replace('<script src="api.js"></script>\n<script src="source-serveur.js"></script>', '<script src="source.js"></script>').replace('<script src="opmsg-ui.js"></script>', () => '<script>\n' + ui + '</script>');
  inv = inv.split('src="opmsg-').join('src="../../icons/opmsg-').split('href="opmsg-').join('href="../../icons/opmsg-');
  inv = inv.replace('<title>OP MESSAGES</title>', '<title>OP MESSAGES — aperçu</title>').replace('OP MESSAGES a besoin de JavaScript.', 'Cet aperçu d\'OP MESSAGES a besoin de JavaScript.');
  const csp = (s) => s.replace(/<meta http-equiv="Content-Security-Policy" content="[^"]*">/, '<CSP>');
  const sansCommentaireCsp = (s) => s.replace(/<!-- ⛔ (?:AUCUN APPEL RÉSEAU|FICHIER GÉNÉRÉ)[\s\S]*?-->\n/, '');
  v('⛔ inverser les substitutions (pièce de données, script extrait, logo, titre, phrase) redonne l\'aperçu EXACT — hors politique de la page et son commentaire, qui sont les deux seules différences voulues', sansCommentaireCsp(csp(inv)) === sansCommentaireCsp(csp(apercu)), true);
  vrai('la politique du service remplace celle de l\'aperçu : connect-src \'self\' (le réseau, vers le service seul), plus de « default-src none » sans connect-src', html.includes(GEN.CSP_SERVICE) && !/content="default-src 'none'; img-src 'self' blob:; media-src blob:;/.test(html));
  v('⛔ aucun script en ligne, aucun onclick=, aucun domaine tiers dans la page servie', [/<script(?![^>]*\bsrc=)[^>]*>/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), /\son[a-z]+\s*=\s*["']/i.test(html.replace(/<!--[\s\S]*?-->/g, '')), /(src|href)="https?:\/\//i.test(html)], [false, false, false]);
  v('les trois scripts, dans l\'ordre : le client, le module de données, l\'interface', Array.from(html.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)).map(m => m[1]), ['api.js', 'source-serveur.js', 'opmsg-ui.js']);
  v('⛔ ni source de démonstration ni nom d\'exemple dans ce que le service sert', GEN.MARQUES_DEMO.filter(x => (html.replace(/<!--[\s\S]*?-->/g, '') + T.sansCommentaires(ui) + T.sansCommentaires(fs.readFileSync(path.join(RACINE, 'server-msg/public/source-serveur.js'), 'utf8'))).includes(x)), []);
  v('les icônes sont celles du dépôt, octet pour octet', ['opmsg-192.png', 'opmsg-favicon-32.png'].map(i => g.fichiers[i].equals(fs.readFileSync(path.join(RACINE, 'icons', i)))), [true, true]);
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
