#!/usr/bin/env node
/* ══ LE GÉNÉRATEUR DE L'INTERFACE SERVIE PAR OP MESSAGES ══════════════════════════════════════════════════════════════════
 *
 * Il fabrique `server-msg/public/` — ce que le SERVICE sert — depuis la VRAIE interface de Justin (`apercu/opmessages/index.html`) :
 * pas de seconde interface à maintenir. Il ne change QUE trois choses :
 *   1. la pièce de données : `<script src="source.js">` (les conversations d'exemple de l'aperçu) devient `api.js` puis `source-serveur.js`
 *      (le client du service et le module qui le branche sur le contrat de l'interface) ;
 *   2. le script en ligne est EXTRAIT dans `opmsg-ui.js` : la politique du service est `script-src 'self'`, un `<script>` en ligne y serait
 *      refusé et la page resterait blanche (relecture du gardien, remarque 6) — on adapte le générateur, pas la politique ;
 *   3. la politique de la page (`<meta http-equiv="Content-Security-Policy">`) : celle de l'aperçu interdit tout `fetch` (`default-src 'none'`,
 *      aucun `connect-src`) ; celle du service autorise `connect-src 'self'` et rien d'autre de plus, et ses images/médias ne sortent pas de la page.
 * Plus des retouches de forme : le logo et l'icône se lisent à côté de la page, le titre ne dit plus « aperçu ».
 *
 * ⛔ IL REFUSE UNE SORTIE QUI MENTIRAIT. C'est la panne type de ce dépôt (une garde décrite n'est pas une garde) : une sortie qui garderait la source
 * de DÉMONSTRATION (`simulerRecu`, les conversations d'exemple) servirait de fausses conversations à de vraies personnes ; une sortie qui n'appelle
 * aucune route `/api/` serait une page qui fait semblant. Il jette donc (code 1, et la raison dite) quand :
 *   · le module de données du service ne tient pas le CONTRAT de l'interface (une méthode que la page appelle — lue dans son code, pas dans une liste
 *     écrite à la main — n'existe pas dans `source-serveur.js`, ou une méthode obligatoire manque) ;
 *   · la sortie contient de la source de démonstration (`simulerRecu`, `creerSourceApercu`, un nom d'exemple de l'aperçu) ou référence encore `source.js` ;
 *   · l'ensemble servi n'appelle pas au moins dix routes `/api/` distinctes ;
 *   · un `<script>` en ligne, un gestionnaire `onclick=` en attribut ou une ressource d'un autre domaine reste dans la page ;
 *   · une des substitutions ne trouve pas exactement UNE cible (une interface qui change de forme ne passe pas en silence).
 * `tests/test-912.js` mute chacune de ces gardes sur une COPIE et exige que le générateur tombe.
 *
 * Usage :  node scripts/opmsg-public.js              écrit `server-msg/public/{index.html, opmsg-ui.js, opmsg-*.png}`
 *          node scripts/opmsg-public.js --verifier   ne fait qu'une chose : dit si ce qui est commité est ce que le générateur produirait (code 1 sinon)
 * Aucune dépendance. Aucun appel réseau.
 */
const fs = require('fs'), path = require('path');

class ErreurGenerateur extends Error { constructor(m) { super(m); this.name = 'ErreurGenerateur'; } }
const jette = (m) => { throw new ErreurGenerateur(m); };

/* ce que le contrat de l'interface EXIGE du module de données du service (celles que la page appelle sont, en plus, lues dans son code) */
const OBLIGATOIRES = ['moi', 'contacts', 'lister', 'ouvrir', 'envoyer', 'marquerLu', 'creerGroupe', 'ecouter', 'appels', 'demarrerAppel', 'appel', 'terminerAppel', 'conversationPour',
  'demarrer', 'connexion', 'deconnexion', 'surSessionMorte', 'verifierSession', 'personne'];
/* ce qui n'existe que dans l'aperçu : jamais dans une page servie à de vraies personnes */
const MARQUES_DEMO = ['simulerRecu', 'creerSourceApercu', 'OPMSG_creerSourceApercu', 'Camille Roux', 'Mathis Lambert', 'Inès Garnier', 'Hugo Perrin', 'Lina Fabre', 'Noé Carpentier', 'Équipe dépôt', 'Chantier Les Tilleuls'];
const CSP_SERVICE = "default-src 'none'; img-src 'self' blob:; media-src 'self' blob:; style-src 'unsafe-inline'; script-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'self'";
const ICONES = ['opmsg-192.png', 'opmsg-favicon-32.png'];

const lire = (racine, ...p) => { const f = path.join(racine, ...p); try { return fs.readFileSync(f); } catch (e) { return jette('fichier introuvable : ' + path.relative(racine, f)); } };
const texte = (racine, ...p) => lire(racine, ...p).toString('utf8');
function remplacerUnique(src, motif, par, quoi) {
  const n = typeof motif === 'string' ? src.split(motif).length - 1 : (src.match(new RegExp(motif.source, motif.flags.includes('g') ? motif.flags : motif.flags + 'g')) || []).length;
  if (n !== 1) jette('la substitution « ' + quoi + ' » devait trouver UNE cible, elle en a trouvé ' + n + ' — l\'interface a changé de forme, le générateur doit être relu');
  return src.replace(motif, () => par);
}
const sansCommentairesJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

function generer(o) {
  o = o || {};
  const racine = path.resolve(o.racine || path.join(__dirname, '..'));
  const pub = path.join('server-msg', 'public');
  let html = texte(racine, 'apercu', 'opmessages', 'index.html');
  const api = texte(racine, pub, 'api.js'), source = texte(racine, pub, 'source-serveur.js');

  /* ── 1. la pièce de données ── */
  html = remplacerUnique(html, '<script src="source.js"></script>', '<script src="api.js"></script>\n<script src="source-serveur.js"></script>', 'la pièce de données (source.js → api.js + source-serveur.js)');

  /* ── 2. le script en ligne, extrait (CSP script-src 'self') ── */
  const en_ligne = Array.from(html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi));
  if (en_ligne.length !== 1) jette('l\'interface doit porter UN script en ligne, elle en porte ' + en_ligne.length);
  const ui = en_ligne[0][1].replace(/^\n/, '');
  if (!ui.trim()) jette('le script en ligne est vide');
  html = html.replace(en_ligne[0][0], () => '<script src="opmsg-ui.js"></script>');

  /* ── 3. la politique de la page ── */
  const metaCsp = /<meta http-equiv="Content-Security-Policy" content="[^"]*">/;
  html = remplacerUnique(html, metaCsp, '<meta http-equiv="Content-Security-Policy" content="' + CSP_SERVICE + '">', 'la politique de la page (CSP)');
  /* le commentaire qui précède la politique de l'aperçu affirmait « aucun appel réseau » : faux ici, il est remplacé par la règle de CETTE page */
  html = remplacerUnique(html, /<!-- ⛔ AUCUN APPEL RÉSEAU[\s\S]*?-->\n/, '<!-- ⛔ FICHIER GÉNÉRÉ par scripts/opmsg-public.js depuis apercu/opmessages/index.html — NE PAS LE MODIFIER À LA MAIN (tests/test-912.js compare).\n     La politique ci-dessous est celle du SERVICE : seul `connect-src \'self\'` rouvre le réseau (vers le service lui-même, jamais un autre domaine), les scripts viennent tous de\n     cette origine (le script en ligne de l\'aperçu est extrait dans opmsg-ui.js), les images et les médias ne sortent pas de la page. -->\n', 'le commentaire de politique');

  /* ── 4. les retouches de forme ── */
  html = html.split('../../icons/opmsg-').join('opmsg-');
  html = remplacerUnique(html, '<title>OP MESSAGES — aperçu</title>', '<title>OP MESSAGES</title>', 'le titre');
  html = remplacerUnique(html, 'Cet aperçu d\'OP MESSAGES a besoin de JavaScript.', 'OP MESSAGES a besoin de JavaScript.', 'la phrase « sans JavaScript »');

  /* ── 5. les refus ── */
  /* 5a. le contrat : ce que la page appelle existe dans le module du service */
  let module_ = null;
  try {
    const OPMSG = (() => { const m = { exports: {} }; new Function('module', 'window', 'globalThis', api)(m, undefined, {}); return m.exports; })();
    const m = { exports: {} };
    new Function('module', 'window', source)(m, undefined);
    module_ = m.exports.creerSourceServeur({ OPMSG, fetch: () => Promise.reject(new Error('jamais')) });
  } catch (e) { jette('le module de données du service ne se construit pas : ' + (e && e.message)); }
  const manque = OBLIGATOIRES.filter(k => !(k in module_));
  if (manque.length) jette('le module de données du service ne tient pas le contrat : il manque ' + manque.join(', '));
  if (!module_.capacites || typeof module_.capacites !== 'object') jette('le module de données du service n\'annonce pas ses capacités (source.capacites)');
  const appelees = Array.from(new Set(Array.from(sansCommentairesJs(ui).matchAll(/\bsource\.([A-Za-z_][A-Za-z0-9_]*)/g)).map(m => m[1])));
  if (appelees.length < 10) jette('population : la page ne semble appeler que ' + appelees.length + ' méthodes de la source — la lecture de son code a échoué');
  const absentes = appelees.filter(k => !(k in module_));
  if (absentes.length) jette('la page appelle des méthodes que le module de données du service n\'a pas : ' + absentes.join(', '));

  /* 5b. aucune source de démonstration, aucune référence à source.js */
  const servi = { 'index.html': html, 'opmsg-ui.js': ui, 'api.js': api, 'source-serveur.js': source };
  for (const [nom, c] of Object.entries(servi)) {
    const code = nom.endsWith('.js') ? sansCommentairesJs(c) : c.replace(/<!--[\s\S]*?-->/g, ' ');
    const trouvees = MARQUES_DEMO.filter(x => code.includes(x));
    if (trouvees.length) jette(nom + ' contient de la source de DÉMONSTRATION (' + trouvees.join(', ') + ') : le service servirait de fausses conversations à de vraies personnes');
  }
  if (/src="source\.js"/.test(html)) jette('la page référence encore source.js (les données de démonstration)');

  /* 5c. l'ensemble servi appelle le service */
  const routes = new Set(Array.from(sansCommentairesJs(api + '\n' + source + '\n' + ui).matchAll(/'(\/api\/[a-z][a-z0-9_/-]*)/g)).map(m => m[1]));
  if (routes.size < 10) jette('l\'ensemble servi n\'appelle que ' + routes.size + ' routes /api/ (au moins 10 attendues) : une page qui n\'appelle pas le service fait semblant');

  /* 5d. la politique du service est tenue */
  const sansCommentairesHtml = html.replace(/<!--[\s\S]*?-->/g, ' ');
  if (/<script(?![^>]*\bsrc=)[^>]*>/i.test(sansCommentairesHtml)) jette('un <script> en ligne reste dans la page (script-src \'self\' le refuserait)');
  if (/\son[a-z]+\s*=\s*["']/i.test(sansCommentairesHtml)) jette('un gestionnaire d\'événement en attribut (onclick=…) reste dans la page');
  if (/(src|href|action)\s*=\s*["']\s*(https?:)?\/\//i.test(sansCommentairesHtml)) jette('une ressource d\'un autre domaine est référencée par la page');
  const scripts = Array.from(sansCommentairesHtml.matchAll(/<script[^>]*\bsrc="([^"]+)"/g)).map(m => m[1]);
  if (scripts.join(',') !== 'api.js,source-serveur.js,opmsg-ui.js') jette('l\'ordre des scripts doit être api.js, source-serveur.js, opmsg-ui.js (obtenu : ' + scripts.join(', ') + ')');
  if (!html.includes(CSP_SERVICE)) jette('la politique de la page n\'est pas celle du service');
  if (html.includes('connect-src') && !/connect-src 'self'/.test(html)) jette('connect-src doit être \'self\'');

  const fichiers = { 'index.html': Buffer.from(html, 'utf8'), 'opmsg-ui.js': Buffer.from(ui, 'utf8') };
  for (const i of ICONES) fichiers[i] = lire(racine, 'icons', i);
  return { fichiers, rapport: { methodes: appelees.length, routes: routes.size, octets: Object.values(fichiers).reduce((a, b) => a + b.length, 0) }, racine, dossier: path.join(racine, pub) };
}

function ecrire(g) {
  fs.mkdirSync(g.dossier, { recursive: true });
  for (const [nom, c] of Object.entries(g.fichiers)) fs.writeFileSync(path.join(g.dossier, nom), c);
}
/* ce qui est commité est-il ce que le générateur produirait ? → la liste des fichiers qui diffèrent */
function ecarts(g) {
  const diff = [];
  for (const [nom, c] of Object.entries(g.fichiers)) {
    let actuel = null; try { actuel = fs.readFileSync(path.join(g.dossier, nom)); } catch (e) { actuel = null; }
    if (!actuel || !actuel.equals(c)) diff.push(nom);
  }
  return diff;
}

module.exports = { generer, ecrire, ecarts, ErreurGenerateur, OBLIGATOIRES, MARQUES_DEMO, CSP_SERVICE };

if (require.main === module) {
  try {
    const g = generer({});
    if (process.argv.includes('--verifier')) {
      const d = ecarts(g);
      if (d.length) { console.error('server-msg/public/ n\'est pas ce que le générateur produirait : ' + d.join(', ') + '\n  → node scripts/opmsg-public.js'); process.exit(1); }
      console.log('server-msg/public/ est à jour (' + Object.keys(g.fichiers).length + ' fichiers, ' + g.rapport.methodes + ' méthodes de la source, ' + g.rapport.routes + ' routes /api/).');
    } else {
      ecrire(g);
      console.log('server-msg/public/ écrit : ' + Object.keys(g.fichiers).join(', ') + ' (' + g.rapport.octets + ' octets ; ' + g.rapport.methodes + ' méthodes de la source, ' + g.rapport.routes + ' routes /api/).');
    }
  } catch (e) {
    if (e instanceof ErreurGenerateur) { console.error('GÉNÉRATEUR REFUSE : ' + e.message); process.exit(1); }
    throw e;
  }
}
