/* ══ OUTIL DES BANCS DE LA PAGE D'OP MESSAGES QUI JOUENT LES FICHES DE RÉUNION (tests/test-1581 à 1584) ══════════════════════════════════════
 *
 * Pas une suite (le nom ne commence pas par `test-` : le compteur ne le lance pas). Il sort de la page (`apercu/opmessages/index.html`) les VRAIES déclarations de fonctions dont un banc a
 * besoin — jamais une copie réécrite — et les exécute dans un bac à sable `vm`.
 *
 * La page est un fichier de dix mille lignes : une fonction comme `htmlFiche` ou `rendreFormReunion` en appelle quarante autres. Plutôt que de toutes les extraire, le bac à sable
 * enveloppe le code dans un `with` dont l'objet répond « oui » à tout nom que ni le code ni la plateforme ne définit : ce qu'un banc fournit est la vraie donnée (ou la vraie fonction),
 * tout le reste est une fonction qui ne fait rien et rend ''. ⛔ Un banc qui lit ce que la fonction RÉELLE écrit ne garde pas l'intention d'un commentaire (CLAUDE.md : « un motif de banc
 * vise du code, jamais une phrase ») : les commentaires sont retirés avant de chercher une déclaration.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
/* ⛔ pas de nettoyage naïf des blocs /* … *\/ : seulement ceux qui COMMENCENT une ligne, et les « // » précédés d'une espace (CLAUDE.md, 21 septembre 2026) */
const sansCommJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const script = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(script);

/* le corps d'une déclaration, de son début à SA dernière accolade (les chaînes et les gabarits sont sautés) */
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    /* un commentaire `/* … *\/` posé en fin de ligne n'est pas retiré par `sansCommJs` (seuls ceux qui COMMENCENT une ligne le sont) : son apostrophe ne doit pas ouvrir une chaîne */
    if (ch === '/' && JS[j + 1] === '*') { const k = JS.indexOf('*/', j + 2); if (k < 0) return ''; j = k + 1; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1); }
  }
  return '';
}
const ligne = (debut) => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };

/* Monte les déclarations demandées (`{ nom: texte }`) avec ce que le banc fournit (`donnees`) ; rend `{ F, absents, P }` : `F` les fonctions exportées, `absents` les morceaux introuvables. */
function monter(morceaux, donnees) {
  const absents = Object.keys(morceaux).filter((k) => !morceaux[k]);
  const noms = Object.keys(morceaux).filter((k) => morceaux[k]);
  const dedans = Object.assign({ __sortie: {} }, donnees || {});
  const P = new Proxy(dedans, {
    has: (t, k) => typeof k === 'string' && !(k in globalThis) && k !== 'P',
    get: (t, k) => (k in t ? t[k] : (typeof k === 'string' ? function () { return ''; } : undefined)),
    set: (t, k, v) => { t[k] = v; return true; },
  });
  const code = 'with (P) {\n' + noms.map((k) => morceaux[k]).join('\n') + '\n' + noms.map((k) => '__sortie.' + k + ' = typeof ' + k + ' === "undefined" ? undefined : ' + k + ';').join('\n') + '\n}';
  const ctx = vm.createContext({ P, Math, JSON, Number, Array, Object, String, Date, Intl, RegExp, Promise, Set, Map, console, Infinity, isNaN, parseInt, parseFloat, encodeURIComponent, setTimeout, clearTimeout });
  vm.runInContext(code, ctx, { timeout: 5000, filename: 'page-extraite.js' });
  return { F: dedans.__sortie, absents, donnees: dedans };
}

/* ce que la page écrit comme titres de section (`.rubrique`) : pour chacun, ce qui le SUIT (un autre titre, la fin, ou du contenu) */
function rubriques(html) {
  const re = /<div class="rubrique"><span>([^<]*)<\/span>(?:<span[^>]*>[^<]*<\/span>)?<\/div>/g, sortie = [];
  let m;
  while ((m = re.exec(html))) {
    const apres = html.slice(m.index + m[0].length);
    sortie.push({ titre: m[1], suivi: /^\s*$/.test(apres) ? 'fin' : /^<div class="rubrique">/.test(apres) ? 'titre' : 'contenu' });
  }
  return sortie;
}

module.exports = { RACINE, PAGE, JS, decl, ligne, monter, rubriques };
