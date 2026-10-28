/* Outils communs des bancs « métiers » (test-2950 et suivants) : lire une FONCTION ou un LITTÉRAL d'app.html / beta.html dans le
   CODE (commentaires de tête de ligne retirés), jamais dans une phrase. Même découpe que test-848 et test-2875. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function saute(src, k) {   // k est sur une apostrophe, un guillemet, un accent grave ou une barre : rend la position de fin
  const c = src[k];
  if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); return n < 0 ? src.length : n; }
  if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); return n < 0 ? src.length : n + 1; }
  return k;
}
function litteral(src, debut) {
  const d0 = src.indexOf(debut); if (d0 < 0) return '';
  const o = src.indexOf(debut.trim().slice(-1) === '[' ? '[' : '{', d0 + debut.length - 1);
  const ouv = src[o], ferm = ouv === '[' ? ']' : '}';
  let prof = 0, q = null, k = o;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && (src[k + 1] === '/' || src[k + 1] === '*')) { k = saute(src, k); continue; }
    if (c === ouv) prof++; else if (c === ferm) { prof--; if (!prof) break; }
  }
  return src.slice(o, k + 1);
}
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades. Les gabarits `…${…}…` sont suivis : une accolade
   dans une expression de gabarit ne referme pas la fonction. */
function fonction(src, nom) {
  const m = new RegExp('(^|\\n)[ \\t]*(?:async )?function ' + nom + '\\(').exec(src); if (!m) return '';
  const d0 = src.indexOf('function ' + nom + '(', m.index) - (/async function/.test(m[0]) ? 6 : 0);
  const debutCorps = src.indexOf('{', src.indexOf(')', d0));
  return src.slice(d0, finBloc(src, debutCorps) + 1);
}
function finBloc(src, k0) {
  let prof = 0; const pile = [];   // pile des gabarits ouverts : on y empile la profondeur d'accolades à reprendre
  for (let k = k0; k < src.length; k++) {
    const c = src[k];
    if (c === "'" || c === '"') { const q = c; for (k++; k < src.length && src[k] !== q; k++) if (src[k] === '\\') k++; continue; }
    if (c === '`') { k = gabarit(src, k); continue; }
    if (c === '/' && (src[k + 1] === '/' || src[k + 1] === '*')) { k = saute(src, k); continue; }
    if (c === '/' && /(?:[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test(src.slice(Math.max(0, k - 12), k))) {
      let cls = false;
      for (k++; k < src.length; k++) { const d = src[k]; if (d === '\\') { k++; continue; } if (d === '\n') break; if (cls) { if (d === ']') cls = false; continue; } if (d === '[') { cls = true; continue; } if (d === '/') break; }
      continue;
    }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return k; }
  }
  return src.length;
}
/* k est sur l'accent grave d'ouverture : rend la position de l'accent grave de fermeture (expressions `${…}` suivies, imbriquées comprises) */
function gabarit(src, k) {
  for (k++; k < src.length; k++) {
    const c = src[k];
    if (c === '\\') { k++; continue; }
    if (c === '`') return k;
    if (c === '$' && src[k + 1] === '{') { k = finBloc(src, k + 1); }
  }
  return k;
}
const evalue = txt => vm.runInNewContext('(' + txt + ')');
const lire = fichier => { const SRC = fs.readFileSync(path.join(RACINE, fichier), 'utf8'); return { SRC, N: nu(SRC) }; };
/* ══ UN BAC À SABLE QUI EXÉCUTE LES VRAIES FONCTIONS D'UNE PAGE ══════════════════════════════════════════════════════════════
   `bac(fichier, noms, init)` extrait du fichier RÉEL les fonctions `noms` (le code, jamais une phrase) et les exécute dans un
   espace où `init` fournit les états et les pièces qu'on veut RÉELLES ou maîtrisées (db, METIERS, NAV, openModal qui capte le
   balisage…). Tout autre nom que le code réclame (un assistant d'écran, un dessinateur) devient une fonction muette — et est
   NOMMÉ dans `bac.vus` : une dépendance oubliée se voit, elle ne se tait pas. Une propriété lue sur ce qu'une muette rend lève
   une erreur franche (un tableau de constantes manquant fait tomber, il ne passe pas pour vide).
   ⚠️ Les déclarations de fonctions d'un bloc `with` sont des fonctions de BLOC : elles se voient entre elles avant le mandataire. */
/* v779 — les métiers combinés : `metierPack()`, `metierPackDe()`, `estMetier3D()`… lisent désormais la LISTE EFFECTIVE des métiers
   (`metiersActifsDe`) et le pack COMBINÉ (`metierPackCombine`). Tout banc qui extrait l'une des premières reçoit donc les secondes —
   sinon elles deviennent des « muettes » qui rendent [], et `estMetier3D()` se met à répondre faux à la 3D. Le cache des packs combinés
   et le plafond d'associés sont des constantes du fichier : fournis ici, sauf si le banc les donne lui-même. */
const FONCTIONS_COMBINAISON = ['metiersActifsDe', 'metiersActifs', 'metiersAssocies', 'metiersAssociesEnvoi', '_packListe', '_releveMeme', 'metierPackCombine', '_cleNom', 'est3DPrincipal', 'intAffiche3D'];
const LIT_LES_METIERS = /^(metierPack|metierPackDe|metierId|estMetier3D|metierGereParc|metierGereSites|libZones|exemple|metierBloque|intTypes|sansBox)$/;
function bac(fichier, noms, init, blocs) {
  const { N } = lire(fichier);
  if (noms.some(n => LIT_LES_METIERS.test(n)) && fonction(N, 'metierPackCombine')) {
    noms = noms.concat(FONCTIONS_COMBINAISON.filter(n => noms.indexOf(n) < 0));
    init = Object.assign({ _packsCombines: new Map(), METIERS_ASSOC_MAX: 4 }, init || {});
  }
  const scope = Object.assign({ console }, init || {});
  const vus = new Set();
  /* une muette rend une liste VIDE quand on l'appelle (un résultat qu'on n'a pas fourni se lit comme « rien ») ; lue comme une LISTE (une table de constantes qu'on n'a pas fournie), elle est
     vide : `.map`, `.filter`, `for…of`… passent sur du vide au lieu de lever — et son nom est dans `vus`. */
  const muette = k => { const f = function () { return []; };
    Object.defineProperty(f, 'name', { value: k });
    Object.assign(f, { map: () => [], filter: () => [], forEach: () => {}, some: () => false, every: () => true, find: () => undefined, includes: () => false, join: () => '', indexOf: () => -1, slice: () => [], concat: () => [], flatMap: () => [], reduce: (fn, v) => v });
    f[Symbol.iterator] = function* () {};
    return f; };
  const mandataire = new Proxy(scope, {
    has(t, k) { if (typeof k === 'symbol' || k === '__out') return false; return k in t || !(k in globalThis); },
    get(t, k) { if (k === Symbol.unscopables) return undefined; if (!(k in t)) { vus.add(String(k)); t[k] = muette(String(k)); } return t[k]; },
    set(t, k, v) { t[k] = v; return true; },
  });
  const manque = noms.filter(n => !fonction(N, n));
  if (manque.length) throw new Error('fonctions introuvables dans ' + fichier + ' : ' + manque.join(', '));
  /* `blocs` : des affectations de premier niveau (« views.techniciens=function(){ ») : de leur début à la fin de leur corps */
  const extraits = (blocs || []).map(d => { const i = N.indexOf(d); if (i < 0) throw new Error('bloc introuvable dans ' + fichier + ' : ' + d); return N.slice(i, finBloc(N, N.indexOf('{', i + d.length - 1)) + 1) + ';'; });
  const code = noms.map(n => fonction(N, n)).concat(extraits).join('\n');
  const out = {};
  new Function('__scope', '__out', 'with(__scope){ ' + code + '\n__out.fn={' + noms.join(',') + '}; }')(mandataire, out);
  return { fn: out.fn, scope, vus };
}
module.exports = { RACINE, nu, litteral, fonction, evalue, lire, finBloc, bac };
