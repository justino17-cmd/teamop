/* ⛔ CE QUE CE FICHIER GARDE — LA PAGE DE L'INVITÉ SANS COMPTE (`server-msg/public/invite.html` + `invite.js`) ET LE REFUS DU GÉNÉRATEUR.

   Cette page est ouverte par un INCONNU muni d'un lien : c'est la seule page d'OP MESSAGES qu'un visiteur sans compte voit en entier. Trois choses la tiennent :
     · elle est SERVIE par le vrai service, en clair, sans cookie posé, avec sa politique de page (script-src 'self', rien d'un autre domaine) et sans jeton écrit dans le fichier ;
     · le générateur (`scripts/opmsg-public.js`, contrôle « 5e bis ») REFUSE qu'elle mente : un script en ligne, un gestionnaire en attribut, une ressource d'un autre domaine, un `innerHTML` (un nom
       tapé par un inconnu doit rester du TEXTE), un accès au rangement de l'appareil (un invité ne laisse rien derrière lui), un appel hors de `/api/invite/…`, une source de démonstration.
       Chaque refus est joué sur une COPIE mutée — et ils sont éprouvés par `mutations` sur le générateur (retirer une garde fait tomber ce banc) ;
     · ses routes appartiennent TOUTES au contrat de l'invité (population comptée avant de croire « aucune route étrangère »). */
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const GEN = require('../scripts/opmsg-public.js');
const RACINE = path.join(__dirname, '..');
const IV = require('./outils-invite');

const FICHIERS = ['apercu/opmessages/index.html', 'opcourrier.js', 'server-msg/public/api.js', 'server-msg/public/source-serveur.js', 'server-msg/public/invite.html', 'server-msg/public/invite.js',
  'server-msg/public/sw.js', 'server-msg/public/manifest.webmanifest', 'icons/opmsg-192.png', 'icons/opmsg-512.png', 'icons/opmsg-apple-touch.png', 'icons/opmsg-favicon-32.png', 'sons/courrier.mp3'];
function copie() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3053-'));
  for (const f of FICHIERS) { fs.mkdirSync(path.dirname(path.join(d, f)), { recursive: true }); fs.copyFileSync(path.join(RACINE, f), path.join(d, f)); }
  return d;
}
const muter = (d, f, fn) => { const p = path.join(d, f); const avant = fs.readFileSync(p, 'utf8'); const apres = fn(avant); if (apres === avant) throw new Error('la mutation n\'a rien changé dans ' + f); fs.writeFileSync(p, apres); };
function refuse(titre, f, fn, motif) {
  const d = copie();
  try {
    muter(d, f, fn);
    let msg = null;
    try { GEN.generer({ racine: d }); } catch (e) { msg = e instanceof GEN.ErreurGenerateur ? e.message : 'AUTRE ERREUR : ' + (e && e.stack || e); }
    vrai('⛔ ' + titre + ' → le générateur REFUSE' + (msg && !msg.startsWith('AUTRE') ? ' (« ' + msg.slice(0, 80) + (msg.length > 80 ? '…' : '') + ' »)' : ''), msg !== null && !msg.startsWith('AUTRE') && motif.test(msg));
    if (msg && msg.startsWith('AUTRE')) console.log('      ' + msg.slice(0, 300));
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

(async () => {
  console.log('Le générateur ACCEPTE la page commitée, et la compte');
  let g;
  try { g = GEN.generer({}); } catch (e) { vrai('⛔ le générateur ACCEPTE les sources commitées (refus : « ' + String(e && e.message || e).slice(0, 200) + ' »)', false); fin(); }
  vrai('population : invite.js cite au moins 8 routes /api/invite/… (' + g.rapport.routesInvite + ')', g.rapport.routesInvite >= 8);
  const html = fs.readFileSync(path.join(RACINE, 'server-msg/public/invite.html'), 'utf8'), js = fs.readFileSync(path.join(RACINE, 'server-msg/public/invite.js'), 'utf8');
  const code = T.sansCommentaires(js);
  const routes = Array.from(code.matchAll(/['"`](\/api\/[a-z][a-z0-9_/-]*)/g)).map(m => m[1]);
  vrai('population : ' + routes.length + ' mentions de route dans le code de la page (commentaires retirés)', routes.length >= 8);
  v('⛔ aucune route hors de /api/invite/', routes.filter(r => !r.startsWith('/api/invite/')), []);
  v('les trois scripts, dans l\'ordre : le client, le module de données, la page', Array.from(html.replace(/<!--[\s\S]*?-->/g, '').matchAll(/<script[^>]*\bsrc="([^"]+)"/g)).map(m => m[1]), ['api.js', 'source-serveur.js', 'invite.js']);
  vrai('⛔ la page ne range rien sur l\'appareil (ni localStorage, ni sessionStorage, ni indexedDB, ni cookie lu ou écrit, ni service worker) — population : le code fait plus de 5 000 caractères (' + code.length + ')',
    code.length > 5000 && !/\b(localStorage|sessionStorage|indexedDB|document\.cookie|navigator\.serviceWorker)\b/.test(code));
  vrai('⛔ aucun balisage construit : ni innerHTML, ni outerHTML, ni insertAdjacentHTML, ni document.write, ni eval', !/\b(innerHTML|outerHTML|insertAdjacentHTML|document\.write|eval\s*\(|new\s+Function)\b/.test(code));
  vrai('le jeton ne vit que dans le FRAGMENT de l\'adresse (location.hash) et la page efface le fragment une fois lu (history.replaceState) — il ne reste ni dans l\'historique ni dans une capture d\'adresse',
    /location\.hash/.test(code) && /history\.replaceState/.test(code));
  vrai('la page ne cite aucun jeton réel (aucun opi_ ni 32 signes d\'un jeton dans le fichier)', !/opi_[A-Za-z0-9_-]{20}/.test(js + html) && !/#i=[A-Za-z0-9_-]{32}/.test(js + html));

  console.log('\nLe générateur REFUSE une page qui mentirait (copies mutées)');
  vrai('⛔ l\'écran d\'identité porte la MENTION RGPD : responsable (TEAM OP), finalité, 30 jours, droits, contact@teamop.fr et la politique de confidentialité',
    /responsable du traitement/.test(html) && /une seule finalité/.test(html) && /30 jours/.test(html) && /accès ou l'effacement/.test(html) && /mailto:contact@teamop\.fr/.test(html) && /https:\/\/teamop\.fr\/confidentialite\.html/.test(html));
  vrai('… et elle est DANS l\'écran d\'identité (avant le bouton « Demander à entrer »), pas dans un coin que personne ne lit', html.indexOf('id="p-identite"') < html.indexOf('id="rgpd"') && html.indexOf('id="rgpd"') < html.indexOf('id="p-prepa"'));
  refuse('la mention RGPD disparaît (plus de durée de 30 jours)', 'server-msg/public/invite.html', s => s.replace('30 jours', 'quelque temps'), /RGPD/);
  refuse('la mention RGPD perd le contact', 'server-msg/public/invite.html', s => s.replace('mailto:contact@teamop.fr', 'mailto:x@exemple.invalid'), /RGPD/);
  refuse('un lien vers un AUTRE domaine que la politique de confidentialité', 'server-msg/public/invite.html', s => s.replace('https://teamop.fr/confidentialite.html', 'https://exemple.invalid/p.html'), /RGPD|autre domaine/);
  refuse('un <script> en ligne dans invite.html', 'server-msg/public/invite.html', s => s.replace('</body>', '<script>window.x=1</script></body>'), /script/i);
  refuse('un gestionnaire d\'événement en attribut (onclick=)', 'server-msg/public/invite.html', s => s.replace('<body', '<body onclick="x()"'), /gestionnaire/);
  refuse('une ressource d\'un autre domaine', 'server-msg/public/invite.html', s => s.replace('</head>', '<link rel="stylesheet" href="https://exemple.invalid/x.css"></head>'), /autre domaine/);
  refuse('l\'ordre des scripts change', 'server-msg/public/invite.html', s => s.replace('<script src="api.js"></script>', '').replace('<script src="invite.js"></script>', '<script src="invite.js"></script><script src="api.js"></script>'), /ordre des scripts/);
  refuse('la politique de la page autorise du script en ligne', 'server-msg/public/invite.html', s => s.replace("script-src 'self'", "script-src 'self' 'unsafe-eval'"), /politique/);
  refuse('la politique de la page perd « default-src \'none\' »', 'server-msg/public/invite.html', s => s.replace("default-src 'none'; ", ''), /politique/);
  refuse('invite.js construit du balisage (innerHTML)', 'server-msg/public/invite.js', s => s + '\nconst __x = document.body; __x.innerHTML = "<b>" + nomTape + "</b>";\n', /balisage/);
  refuse('invite.js range quelque chose sur l\'appareil (localStorage)', 'server-msg/public/invite.js', s => s + '\ntry { localStorage.setItem("nom", "x"); } catch (e) {}\n', /appareil/);
  refuse('invite.js appelle une route qui n\'est pas de l\'invité (/api/flux)', 'server-msg/public/invite.js', s => s + '\nconst __r = "/api/flux";\n', /n'est pas de l'invité/);
  refuse('invite.js contient de la source de démonstration (simulerRecu)', 'server-msg/public/invite.js', s => s + '\nfunction simulerRecu() {}\n', /démonstration/i);
  refuse('invite.js perd presque toutes ses routes (la lecture du code a échoué)', 'server-msg/public/invite.js', s => s.replace(/\/api\/invite\/(?!entrer)/g, '/x/'), /population/);

  console.log('\nLe VRAI service la sert');
  const I = await IV.monter();
  try {
    const c = I.clientInvite();
    const p = await c.get('/invite.html');
    vrai('GET /invite.html → 200 text/html', p.code === 200 && /text\/html/.test(p.h.get('content-type') || ''));
    vrai('⛔ aucun cookie posé par la page d\'accueil de l\'invité (un visiteur qui ouvre la page ne devient personne)', c.jar.size === 0);
    vrai('⛔ la politique est celle du fichier (script-src \'self\', pas d\'unsafe-eval)', /script-src 'self'/.test(p.txt) && !/unsafe-eval/.test(p.txt));
    const j = await c.get('/invite.js');
    vrai('GET /invite.js → 200 javascript, octet pour octet celui du dépôt', j.code === 200 && /javascript/.test(j.h.get('content-type') || '') && j.txt === js);
    vrai('invite.html servie = invite.html du dépôt (octet pour octet)', p.txt === html);
    const a = await c.get('/api/invite/etat');
    vrai('⛔ sans session, la page ne lit rien : GET /api/invite/etat → 401', a.code === 401);
  } finally { await I.arreter(); }
  fin();
})().catch(e => { console.error('banc mort :', e && e.stack || e); process.exit(1); });
