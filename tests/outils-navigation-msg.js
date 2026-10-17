/* ══ OUTILS COMMUNS DES BANCS DE NAVIGATION D'OP MESSAGES (tests/test-1530 à 1534) ═════════════════════════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas).
 *
 * Il monte, dans un bac à sable `vm`, la VRAIE section « 6. LA NAVIGATION » de `apercu/opmessages/index.html` (memeRoute, routeDepuisHash, parentDe, pousser,
 * remplacer, rendreEntree, fermerCouche, les écouteurs de popstate) — le texte de la page, pas une copie — avec, autour d'elle :
 *   · un HISTORIQUE de navigateur qui joue ce que joue un navigateur : `pushState` coupe ce qui suit, `back()` est ASYNCHRONE (la route ne change qu'à `popstate`),
 *     une adresse qu'on écrit (`location.hash = …`) pose une entrée SANS état et lève `popstate` ;
 *   · un `appliquer` qui note chaque route jouée (la vraie dépend de tout le DOM : ce que `appliquer` fait de la route est gardé par les sondes au navigateur) ;
 *   · le vrai `fermerMenu` et les vraies pièces « menu / aperçu » quand un banc les demande (`avec`), sur des éléments factices.
 * ⛔ Un banc qui reconstruit l'ORDRE des appels pour passer ne prouve rien : ici, le texte est celui de la page, et la contre-épreuve est de le muter. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');

/* ce que la page déclare entre deux ancres — une ancre introuvable est une ERREUR (une tranche vide passerait au vert sur tout) */
function tranche(deb, fin, texte) {
  const s = texte || PAGE, i = s.indexOf(deb); if (i < 0) throw new Error('ancre introuvable : ' + deb.slice(0, 60));
  const j = s.indexOf(fin, i + deb.length); if (j < 0) throw new Error('ancre de fin introuvable : ' + fin.slice(0, 60));
  return s.slice(i, j);
}
/* une fonction de premier niveau (deux espaces d'indentation) du script, de sa déclaration à la suivante */
function fonction(nom) {
  const re = new RegExp('\\n  (?:async )?function ' + nom + '\\(');
  const m = re.exec(PAGE); if (!m) throw new Error('fonction introuvable : ' + nom);
  const deb = m.index + 1, suite = /\n  (?:async function |function |const |let |\/\* [═─]|\$\(|window\.|document\.|\{ )/g; suite.lastIndex = deb + 10;
  const n = suite.exec(PAGE); return PAGE.slice(deb, n ? n.index : PAGE.length);
}

/* un historique de navigateur */
function historique(urlDebut) {
  const pile = [{ state: null, url: urlDebut || '#messages' }]; let i = 0;
  const ecouteurs = []; const journal = [];
  const hist = {
    get state() { return pile[i].state; }, get length() { return pile.length; },
    pushState(s, t, u) { pile.splice(i + 1); pile.push({ state: s, url: u === undefined || u === '' ? pile[i].url : u }); i++; journal.push('push ' + pile[i].url); },
    replaceState(s, t, u) { pile[i] = { state: s, url: u === undefined || u === '' ? pile[i].url : u }; journal.push('replace ' + pile[i].url); },
    back() { journal.push('back'); setTimeout(() => { if (i > 0) { i--; lever(); } }, 0); },
    forward() { journal.push('forward'); setTimeout(() => { if (i < pile.length - 1) { i++; lever(); } }, 0); },
    scrollRestoration: 'auto',
  };
  const lever = () => ecouteurs.slice().forEach(f => f({ state: pile[i].state }));
  const loc = { get hash() { const k = pile[i].url.indexOf('#'); return k < 0 ? '' : pile[i].url.slice(k); }, get href() { return 'http://127.0.0.1/' + pile[i].url; } };
  const win = {
    addEventListener(nom, f) { if (nom === 'popstate') ecouteurs.push(f); },
    /* ce que fait un navigateur quand on écrit `location.hash = …` : une entrée SANS état, et popstate */
    ecrireAdresse(h) { pile.splice(i + 1); pile.push({ state: null, url: h }); i++; journal.push('adresse ' + h); setTimeout(lever, 0); },
  };
  return { hist, loc, win, pile: () => pile.map(p => ({ url: p.url, menu: !!(p.state && p.state.menu), n: p.state ? p.state.n : null, vue: p.state && p.state.r ? p.state.r.vue : null })), index: () => i, journal };
}
const attendre = (ms) => new Promise(r => setTimeout(r, ms === undefined ? 20 : ms));

/* un élément factice : tout ce que les fonctions de la page lui demandent répond sans lever */
const METHODES = new Set(['removeAttribute', 'setAttribute', 'getAttribute', 'addEventListener', 'removeEventListener', 'getClientRects', 'closest', 'append', 'remove', 'scrollIntoView', 'blur', 'click', 'matches', 'insertAdjacentHTML']);
function faux(nom) {
  const traces = [], style = {};
  const o = new Proxy(function () {}, {
    get(c, k) {
      if (k === 'traces') return traces; if (k === Symbol.toPrimitive) return () => nom;
      if (k === 'classList') return { add() {}, remove() {}, toggle() {}, contains() { return false; } };
      if (k === 'dataset') return {}; if (k === 'style') return style; if (k === 'querySelectorAll') return () => []; if (k === 'querySelector') return () => null;
      if (k === 'isConnected') return true; if (k === 'focus') return (...a) => { traces.push('focus'); };
      if (METHODES.has(k)) return () => undefined;
      return c[k];
    },
    set(c, k, v) { c[k] = v; traces.push(k + '=' + (typeof v === 'string' ? v.slice(0, 30) : v)); return true; },
    apply() { return undefined; },
  });
  return o;
}

/* monte la navigation de la page. `opts.vues` : les vues connues (par défaut sans « accueil », comme un compte sans Pro) ; `opts.avec` : des noms de fonctions de la page à ajouter, tels quels */
function monter(opts) {
  const o = Object.assign({ vues: ['messages', 'appels', 'contacts', 'reunions', 'reglages'], url: '#messages', avec: [], pre: '', post: '', appliquerDe: null }, opts || {});
  const h = historique(o.url);
  const appliquees = [];
  const nav = tranche('const memeRoute = ', '/* appliquer(route) : l\'écran DIT la route');
  const etat = { route: null, menu: null, conv: null, photo: null, groupe: { ouvert: false }, appelId: null };
  const elements = {};
  const ctx = {
    console, setTimeout, clearTimeout, URL, Object, Math, Date, history: h.hist, location: h.loc, window: h.win, etat,
    VUES: Object.fromEntries(o.vues.map(v => [v, { titre: v }])), ORDRE: o.vues.slice(), CAP: { reunions: true, agenda: true }, ID_REUNION: /^r_[0-9a-f]{32}$/, ID_EVT: /^e_[0-9a-f]{32}$/,
    REG_SECTIONS: ['entreprise', 'confidentialite', 'notifications', 'contacts', 'lieux', 'appareils', 'stockage', 'compte', 'apropos'],
    cleFeuille: f => String(f === true ? 'chat' : f), appliquees,
    $: id => elements[id] || (elements[id] = faux(id)), elements, modalite: 'pointeur',
    document: { addEventListener() {}, contains: () => true, getElementById: id => elements[id] || (elements[id] = faux(id)), documentElement: { dataset: {} } },
    synchroInert() {}, retrouverAgenda: () => null, rendreFocus(el) { if (el && el.focus) el.focus(); },
  };
  vm.createContext(ctx);
  const corps = o.appliquerDe || 'function appliquer(r) { etat.route = r; appliquees.push(JSON.stringify(r)); }';
  const extra = o.avec.map(n => fonction(n)).join('\n');
  vm.runInContext(o.pre + '\n' + corps + '\n' + nav + '\n' + extra + '\n' + o.post + '\n;this.__sortie = { pousser, remplacer, fermerCouche, rendreEntree, parentDe, memeRoute, routeDepuisHash, urlDe, entree, appliquer };', ctx, { timeout: 3000 });
  return Object.assign({ ctx, etat, appliquees, nav }, h, ctx.__sortie, { elements });
}

const { compteur } = require('./outils-msg');
module.exports = { PAGE, RACINE, tranche, fonction, historique, attendre, faux, monter, compteur };
