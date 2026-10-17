/* ══ OUTILS DES BANCS DES INFOS D'UNE CONVERSATION (tests/test-2520 à 1529) ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas).
 *
 * Il exécute les VRAIES fonctions de la page d'OP MESSAGES (`apercu/opmessages/index.html`) dans un bac à sable `vm` : l'ÉCOUTEUR des gestes des feuilles « Contacts » et « Infos »
 * (`$('info-corps').addEventListener('click', …)`), `apresChoixInfo`, `surRetire` et les petites fonctions qui disent ce qu'on voit (`phraseNonAjoutes`, `motLienAccepte`,
 * `motRetire`). Autour : de FAUX éléments, une FAUSSE source, et un journal de ce que la page a dit (`erreurInfo`, `mot`) et fait (`remplacer`, `rafraichirListe`).
 *
 *   · `OPMSG_RACINE=<dossier>` lit la page ailleurs que dans l'arbre : c'est ainsi qu'on montre qu'un banc TOMBE sur le code d'avant (un `git archive` du commit précédent).
 *   · ⛔ un motif vise du CODE, jamais une phrase : les commentaires sont retirés avant de chercher (CLAUDE.md). Les blocs `/* … *\/` qui COMMENCENT une ligne, et eux seuls.
 *   · ⛔ une pièce introuvable rend une chaîne VIDE, et un bac à sable qui ne contient rien passe au vert sur tout : `pieces()` dit lesquelles manquent, et chaque banc l'exige VIDE.
 */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const sansCommJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');
const SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const JS = sansCommJs(SCRIPT);

/* la déclaration d'une fonction, de son début à SA dernière accolade (les chaînes sont sautées) */
function decl(debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = debut => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
/* une déclaration `const x = …;` qui court sur plusieurs lignes : jusqu'à la première fin de ligne qui porte son « ; » après `fin` */
const jusqua = (debut, fin) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(fin, i); return i < 0 || j < 0 ? '' : JS.slice(i, j + fin.length); };
/* l'écouteur lui-même : la fonction fléchée passée à `addEventListener('click', …)` sur #info-corps */
function ecouteur() {
  const marque = "$('info-corps').addEventListener('click', async e => {"; const i = JS.indexOf(marque);
  if (i < 0) return '';
  const d = i + marque.length - 1;
  let j = d, n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) break; }
  }
  return 'async e => ' + JS.slice(d, j + 1);
}

/* les pièces de la page, par nom — une absente est une chaîne vide, et `manquantes()` la nomme */
const PIECES = {
  coteDe: ligne('const coteDe = '),
  phraseNonAjoutes: jusqua('const phraseNonAjoutes = ', "n\\'ont pas pu être ajoutés.';\n  };"),
  motLienAccepte: ligne('const motLienAccepte = '),
  apresChoixInfo: decl('async function apresChoixInfo('),
  convQuittees: ligne('const convQuittees = '),
  motRetire: decl('const motRetire = (c, brouillon) => {'),
  surRetire: decl('function surRetire('),
};
const ECOUTEUR = ecouteur();
const manquantes = (noms) => (noms || Object.keys(PIECES)).filter(k => !PIECES[k]).concat(ECOUTEUR ? [] : ['ecouteur']);

/* ═══ le bac à sable ═══
   opts : { contacts, conv: id de la conversation des infos, mode: 'perso'|'pro', modesActifs, conversations, ouverte: id de la conversation OUVERTE, brouillon } */
function bac(opts = {}) {
  const J = { erreurs: [], mots: [], remplacer: [], appels: [], ouverts: [], relus: 0, deroule: null, changerMode: [] };
  const champs = {};
  const promesses = [];
  const etat = {
    groupe: { ouvert: opts.feuille !== false, mode: 'convinfo', convId: opts.conv || 'c_g' },
    conv: opts.ouverte === undefined ? (opts.conv || 'c_g') : opts.ouverte,
    conversations: opts.conversations || [],
    mode: opts.mode || 'perso',
    route: { vue: 'messages', conv: opts.conv || 'c_g', feuille: 'convinfo:' + (opts.conv || 'c_g') },
  };
  const B = { J, etat, champs, source: {}, listeApres: null, promesses };
  const ctx = {
    console, Date, Math, JSON, Array, Object, String, Number, Promise, Error, Map, RegExp, setTimeout, clearTimeout,
    etat, CONTACTS: opts.contacts || [], NOM_COTE: { perso: 'Perso', pro: 'Pro' },
    $: id => champs[id] || null,
    erreurInfo: t => { J.erreurs.push(t || ''); },
    mot: t => { J.mots.push(t); },
    phrase: (er, defaut) => (er && er.phrase) || defaut,
    ouvrirConvId: id => { J.ouverts.push(id); },
    remplacer: r => { J.remplacer.push(r); },
    rendreConvInfo: () => { J.relus++; },
    rafraichirListe: async () => { J.appels.push('rafraichirListe'); if (B.listeApres) etat.conversations = B.listeApres; },
    modesActifs: () => opts.modesActifs !== false,
    changerMode: (...a) => { J.changerMode.push(a); },
    ouvrirDeroule: (b, titre, sous, items, cb) => { J.deroule = { titre, items, cb }; },
    __promesses: promesses,
    source: new Proxy({}, { get: (_, k) => B.source[k] }),
  };
  vm.createContext(ctx);
  /* une pièce absente (le code d'AVANT un correctif) n'empêche pas le bac de naître : elle vaut `null`, et c'est le banc qui tombe sur elle */
  const noms = ['coteDe', 'phraseNonAjoutes', 'motLienAccepte', 'apresChoixInfo', 'convQuittees', 'motRetire', 'surRetire'].filter(k => PIECES[k]);
  vm.runInContext(noms.map(k => PIECES[k]).join('\n') +
    '\nconst __reel = apresChoixInfo; apresChoixInfo = function () { const p = __reel.apply(null, arguments); __promesses.push(p); return p; };' +
    '\nthis.F = { ' + ['phraseNonAjoutes', 'motLienAccepte', 'motRetire', 'surRetire', 'coteDe', 'convQuittees'].map(k => k + ': ' + (noms.includes(k) ? k : 'null')).join(', ') + ', H: ' + (ECOUTEUR || 'null') + ' };', ctx, { timeout: 3000 });
  B.F = ctx.F;
  B.champ = (id, valeur) => { champs[id] = { id, value: valeur }; return champs[id]; };
  /* un clic sur un bouton `data-act` : l'écouteur réel, puis l'attente des gestes lancés sans attente (`apresChoixInfo`) */
  B.clic = async (act, data = {}, attrs = {}) => {
    const b = { dataset: Object.assign({ act }, data), disabled: false, getAttribute: k => (k in attrs ? attrs[k] : null), setAttribute() {}, removeAttribute() {},
      querySelector: () => ({ textContent: '' }), isConnected: true };
    await ctx.F.H({ target: { closest: () => b } });
    await Promise.all(promesses.splice(0));
    return b;
  };
  return B;
}
module.exports = { bac, PIECES, ECOUTEUR, JS, manquantes, RACINE, sansCommJs };
