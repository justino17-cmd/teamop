/* ⛔ CE QUE CE FICHIER GARDE — OP COURRIER (BÊTA), ÉTAPE 1 : LA PAGE `courrier-beta.html` ET LES DEUX ENTRÉES QUI Y MÈNENT (18 octobre 2026).

   OP Courrier est la messagerie e-mail de TeamOP. Étape 1 : l'INTERFACE seule, en bêta — aucun vrai mail n'est lu ni envoyé, aucun serveur n'existe encore. Ce banc garde ce que
   l'intégration a promis (CLAUDE.md : jour/nuit sans bouton, aucune ressource externe, bêta uniquement, OP MESSAGES séparé d'OP GESTION), et il le garde sur le CODE LIVRÉ :
   les fonctions de la page sont EXTRAITES et EXÉCUTÉES (jamais recopiées), dans un bac à sable dont le réseau, le stockage et le temps sont des faux qui comptent.
     1. l'enveloppe : doctype, viewport-fit=cover, theme-color jour/nuit, `noindex`, icônes du dépôt, et une POLITIQUE DE SÉCURITÉ qui ne laisse sortir que deux annuaires DNS ;
     2. le thème : l'appareil décide (`prefers-color-scheme`), ni bouton, ni `data-theme`, ni clé de thème écrite ou relue ;
     3. aucune ressource externe : les seules adresses du fichier, la seule requête (`fetch`) dans `lireMX` ;
     4. le stockage : la clé `opcourrierB_v2`, et un stockage qui JETTE ne casse rien (la vraie `persist`, la vraie `restore`) ;
     5. ⛔ la lecture du MX derrière un GESTE : la vraie `openAddAccount` rejouée — aucune requête pendant la frappe, UNE (le domaine seul) quand on quitte le champ, une
        sur Entrée, AUCUNE quand la feuille se ferme, aucune pour un domaine grand public ; le réseau refusé retombe sur `mail.<domaine>` ;
     6. le mode démo : la vraie `receiveMail`, la vraie `signAct`, les minuteries — un seul drapeau les éteint ; la pastille dit « Bêta — aucun vrai mail n'est lu ni envoyé » ;
     7. le côté d'ouverture (`#pro` / `#perso`) : les vraies fonctions du hash ;
     8. ⛔ les entrées : « OP Courrier » dans la SUITE de `beta.html` ET SEULEMENT là (jamais dans `app.html`), la bêta se FABRIQUE avec elle (et la fabrication REFUSE quand l'une
        de ses trois ancres disparaît) ; dans OP MESSAGES, l'entrée ne se montre que sous le nom d'hôte du canal bêta, ouvre le bon côté, et rien n'est branché sur un serveur ;
     9. la page est dans le site assemblé, hors sitemap, hors cache du service worker.
   Les parties qui ne se voient qu'au navigateur — le rendu, le geste réel, les trois formats — sont gardées par les sondes `scratchpad/courrier/` (ctx 16, miss 50, sign 48, contraste AA,
   bascule 48) et `tests/sonde-opmessages-courrier.js`. ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE : chaque tranche extraite est d'abord PROUVÉE trouvée. Sans dépendance, aucun réseau. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), vm = require('vm');
const { spawnSync } = require('child_process');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const RACINE = path.join(__dirname, '..');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const PAGE = lire('courrier-beta.html');
/* ⛔ on ne retire que les blocs qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale du vrai code) ; les `//` en fin de ligne partent aussi s'ils sont précédés d'espaces */
const sansComm = (t) => t.replace(/<!--[\s\S]*?-->/g, ' ').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ').replace(/[ \t]{2,}\/\/[^\n]*$/gm, '');
const CODE = sansComm(PAGE);
/* le SCRIPT de la page (le 2ᵉ bloc : le 1ᵉʳ est le moteur de tri, gardé par test-2700) */
const scripts = Array.from(PAGE.matchAll(/<script>([\s\S]*?)<\/script>/g)).map(m => m[1]);
function tranche(quoi, debut, fin, dans) {
  const src = dans || PAGE;
  const i = src.indexOf(debut), j = i < 0 ? -1 : src.indexOf(fin, i + debut.length);
  vrai('(tranche trouvée) ' + quoi, i >= 0 && j > i && j - i > 60);
  return i >= 0 && j > i ? src.slice(i, j) : '';
}

/* ═════════════════════════════════════ 1. L'ENVELOPPE ═════════════════════════════════════ */
console.log('1. L\'enveloppe');
vrai('doctype, lang « fr », charset UTF-8 en premier dans <head>', /^<!doctype html>\s*<html lang="fr">\s*<head>\s*<meta charset="utf-8">/i.test(PAGE));
vrai('viewport : largeur de l\'appareil et viewport-fit=cover (les encoches)', /<meta name="viewport" content="[^"]*width=device-width[^"]*viewport-fit=cover[^"]*">/.test(PAGE));
vrai('theme-color de jour ET de nuit, chacune sous son média', /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: light\)">/i.test(PAGE) && /<meta name="theme-color" content="#[0-9a-f]{6}" media="\(prefers-color-scheme: dark\)">/i.test(PAGE));
vrai('⛔ noindex : une page bêta ne s\'indexe pas', /<meta name="robots" content="[^"]*noindex[^"]*">/i.test(PAGE));
for (const m of PAGE.matchAll(/<link rel="(icon|apple-touch-icon)"[^>]*href="([^"]+)"/g)) vrai('l\'icône « ' + m[2] + ' » existe dans le dépôt', fs.existsSync(path.join(RACINE, m[2])));
vrai('(population) deux icônes déclarées', (PAGE.match(/<link rel="(icon|apple-touch-icon)"/g) || []).length === 2);
vrai('le titre nomme OP Courrier', /<title>OP Courrier<\/title>/.test(PAGE));
v('deux scripts en ligne : le moteur de tri puis la page', scripts.length, 2);
const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)">/.exec(PAGE) || [])[1] || '';
vrai('(population) une politique de sécurité est posée', csp.length > 50);
const dir = {}; csp.split(';').map(x => x.trim()).filter(Boolean).forEach(x => { const [k, ...r] = x.split(/\s+/); dir[k] = r.join(' '); });
v('⛔ default-src \'none\' : rien n\'est permis qui ne soit dit', dir['default-src'], '\'none\'');
v('⛔ connect-src : les DEUX annuaires DNS, rien d\'autre', dir['connect-src'], 'https://dns.google https://cloudflare-dns.com');
v('script-src : du code en ligne, jamais d\'eval ni d\'hôte', dir['script-src'], '\'unsafe-inline\'');
v('img-src : le dépôt et les images en data: (les icônes de la page)', dir['img-src'], '\'self\' data:');
vrai('aucun joker, aucun http:, aucun unsafe-eval dans la politique', !/\*|http:|unsafe-eval/.test(csp));

/* ═════════════════════════════════════ 2. LE THÈME ═════════════════════════════════════ */
console.log('\n2. Le thème suit l\'appareil, sans bouton');
v('⛔ aucun bouton, aucune fonction, aucun emplacement de thème, aucun data-theme dans la page', ['btnTheme', 'toggleTheme', 'slotTheme', 'data-theme'].filter(x => PAGE.includes(x)), []);
vrai('la feuille de nuit est un @media (prefers-color-scheme:dark) qui redéfinit :root (une fois)', (PAGE.match(/@media \(prefers-color-scheme:dark\)\{ :root\{/g) || []).length === 1);
v('color-scheme : « light » sur le :root de jour, « dark » sur celui de nuit', [(PAGE.match(/color-scheme:light;/g) || []).length, (PAGE.match(/color-scheme:dark;/g) || []).length], [1, 1]);
vrai('aucun script ne pilote le thème (ni matchMedia sur la couleur, ni classe « dark »)', !/matchMedia\(\s*["']\(prefers-color-scheme/.test(CODE) && !/classList\.(add|toggle)\(\s*["'](dark|sombre|nuit)/.test(CODE));
vrai('les règles de nuit des pastilles gardent leur spécificité (:root .x, pas .x seul : sinon la base, plus loin, les bat)', /:root \.sgchip\.st-signed\{/.test(PAGE) && /:root \.sptab\.sp-pro\[aria-pressed="true"\]\{/.test(PAGE));

/* ═════════════════════════════════════ 3. AUCUNE RESSOURCE EXTERNE ═════════════════════════════════════ */
console.log('\n3. Aucune ressource externe');
const hotes = new Set(Array.from(CODE.matchAll(/https?:\/\/([a-z0-9.-]+)/gi)).map(m => m[1].toLowerCase()));
v('⛔ les seules adresses du fichier : l\'espace de noms SVG (data:) et les deux annuaires DNS', Array.from(hotes).sort(), ['cloudflare-dns.com', 'dns.google', 'www.w3.org']);
vrai('(population) le fichier porte bien des adresses (la liste n\'est pas vide par accident)', hotes.size === 3);
const nFetch = (CODE.match(/\bfetch\s*\(/g) || []).length;
v('une seule requête dans tout le fichier (fetch)', nFetch, 1);
const lireMX = tranche('lireMX', '  function lireMX(d){', '  function detectParMX(');
vrai('…et elle est DANS lireMX', /\bfetch\s*\(/.test(sansComm(lireMX)));
v('aucun autre moyen de sortir (XHR, WebSocket, EventSource, sendBeacon, worker, image distante, import)', ['XMLHttpRequest', 'WebSocket', 'EventSource', 'sendBeacon', 'serviceWorker', 'importScripts', 'new Image', 'new Worker', 'import('].filter(x => CODE.includes(x)), []);
v('aucun <script src>, <link> de feuille, <iframe>, <img>, @import, <form>', [/<script[^>]*\bsrc=/i, /<link[^>]*rel="stylesheet"/i, /<iframe/i, /<img\b/i, /@import/i, /<form\b/i].filter(re => re.test(CODE)).map(String), []);
v('tous les url(…) sont des data:', Array.from(CODE.matchAll(/url\(\s*["']?([^"')]+)/g)).map(m => m[1]).filter(u => !u.startsWith('data:')), []);
vrai('(population) la page porte des url(data:…)', /url\(\s*["']?data:/.test(CODE));
v('aucun src/href/action vers un autre site', Array.from(CODE.matchAll(/\b(?:src|href|action)\s*=\s*["']\s*(https?:)?\/\/[^"']*/gi)).map(m => m[0]), []);

/* ═════════════════════════════════════ 4. LE STOCKAGE ═════════════════════════════════════ */
console.log('\n4. Le stockage : préfixe bêta, et un stockage qui jette ne casse rien');
vrai('la clé est « opcourrierB_v2 » (bêta) et la clé de la maquette n\'existe plus', /var LS="opcourrierB_v2"/.test(CODE) && !/opcourrier\.v2/.test(CODE));
v('une seule clé de stockage dans tout le fichier', Array.from(new Set(Array.from(CODE.matchAll(/["'](opcourrier[A-Za-z_.0-9]*)["']/g)).map(m => m[1]))), ['opcourrierB_v2']);
v('ni sessionStorage, ni indexedDB, ni cookie', ['sessionStorage', 'indexedDB', 'document.cookie'].filter(x => CODE.includes(x)), []);
const persistance = tranche('Persistance (persist, restore, acctExists, validScope)', '  var LS="opcourrierB_v2"', '  // ---------- Dates');
v('⛔ le stockage n\'est touché que deux fois dans tout le fichier : l\'écriture de persist et la lecture de restore, chacune DANS un try', [(CODE.match(/localStorage/g) || []).length, (persistance.match(/localStorage/g) || []).length,
  /function persist\(\)\{ try\{[^]*?localStorage\.setItem\(LS,JSON\.stringify\(snap\)\);\s*\}catch\(e\)\{\}/.test(persistance), /function restore\(\)\{ try\{\s*var raw=localStorage\.getItem\(LS\);[^]*?\}catch\(e\)\{\} \}/.test(persistance)], [2, 2, true, true]);
function bacPersistance(stock, instantane) {
  const sb = { MESSAGES: [{ id: 'm1', read: true, flagged: false, folder: 'inbox', acct: 'a1' }, { id: 'm2', read: false, flagged: true, folder: 'sent', acct: 'a1', user: true, att: [] }],
    ACCOUNTS: [{ id: 'a1', kind: 'pro', name: 'A', email: 'a@x.fr', signature: '' }, { id: 'a2', kind: 'perso', name: 'B', email: 'b@y.fr', signature: '' }, { id: 'a3', kind: 'perso', name: 'C', email: 'c@z.fr' }],
    state: { scope: 'pro', folder: 'inbox', cat: 'principal', selected: null }, RULES: { senders: {}, domains: {} }, CONTACTS: { 'a@x.fr': true }, SETTINGS: { notif: true, threads: true }, GONE_ACCTS: [],
    FOLDERS: [{ id: 'inbox' }, { id: 'sent' }], SEED_IDS: ['m1', 'm2'], uid: 3, restoredSends: 0, noticeSeen: false, bruitNoter: 0,
    kindOf: (a) => a.kind, msgById: (id) => sb.MESSAGES.find(m => m.id === id), guessKind: () => 'pro', isCat: (c) => ['principal', 'notif', 'recus', 'voyages', 'promos'].includes(c),
    removeMsg: (id) => { const i = sb.MESSAGES.findIndex(m => m.id === id); if (i >= 0) sb.MESSAGES.splice(i, 1); }, learnContacts: () => {}, noterCote: () => { sb.bruitNoter++; },
    JSON, Date, Object, Array, String, parseInt, localStorage: stock,
    touche: [], document: null };
  sb.document = new Proxy({}, { get(_, k) { sb.touche.push(String(k)); return () => {}; } });   // tout accès au document est noté
  vm.createContext(sb); vm.runInContext(persistance, sb); return sb;
}
{ const calls = []; const stock = { setItem: (k, x) => calls.push(['set', k, x]), getItem: () => null };
  const sb = bacPersistance(stock); vm.runInContext('persist()', sb);
  vrai('(population) persist() a écrit UNE fois', calls.length === 1);
  v('persist() écrit sous « opcourrierB_v2 »', calls[0] && calls[0][1], 'opcourrierB_v2');
  const snap = JSON.parse(calls[0][2]);
  vrai('…un instantané versionné, sans champ « theme » (le thème n\'est plus écrit)', snap.v === 3 && !('theme' in snap) && snap.scope === 'pro');
  v('persist() ne touche ni au document ni à l\'attribut data-theme', sb.touche, []);
  vrai('persist() rend la main au côté d\'ouverture (noterCote) — le hash suit le côté choisi', sb.bruitNoter === 1); }
{ let n = 0; const sb = bacPersistance({ setItem: () => { n++; throw new Error('quota'); }, getItem: () => { n++; throw new Error('refusé'); } });
  let jete = null; try { vm.runInContext('persist(); restore();', sb); } catch (e) { jete = String(e); }
  vrai('(population) le stockage a bien été touché (et il a jeté) : ' + n + ' accès', n === 2);
  v('⛔ un stockage qui JETTE (quota, navigation privée) ne casse ni persist ni restore', jete, null); }
{ /* un instantané de la MAQUETTE (avec son champ theme) : lu sans toucher au document */
  const vieux = JSON.stringify({ v: 3, theme: 'dark', scope: 'perso', folder: 'sent', cat: 'notif', rules: { senders: {}, domains: {} }, contacts: [], kinds: {}, msgs: { m1: { read: false, flagged: true, folder: 'inbox' } }, user: [], gone: [], accounts: [], names: {}, sigs: {}, settings: { notif: false, threads: true }, goneAccts: [] });
  const sb = bacPersistance({ setItem() {}, getItem: (k) => { sb.cleLue = k; return vieux; } });
  vm.runInContext('restore()', sb);
  v('restore() lit « opcourrierB_v2 »', sb.cleLue, 'opcourrierB_v2');
  vrai('…et rétablit l\'état (côté, dossier, catégorie, lu/marqué, réglages) — la population est lue, pas supposée', sb.state.scope === 'perso' && sb.state.folder === 'sent' && sb.state.cat === 'notif' && sb.MESSAGES[0].flagged === true && sb.MESSAGES[0].read === false && sb.SETTINGS.notif === false);
  v('⛔ un champ « theme » hérité de la maquette est IGNORÉ : aucun accès au document', sb.touche, []);
  const sb2 = bacPersistance({ setItem() {}, getItem: () => '{pas du json' }); let j2 = null; try { vm.runInContext('restore()', sb2); } catch (e) { j2 = String(e); }
  v('un stockage corrompu ne casse pas la page', j2, null); }

/* ═════════════════════════════════════ 5. LA LECTURE DU MX DERRIÈRE UN GESTE ═════════════════════════════════════ */
console.log('\n5. La lecture du MX : un geste, jamais la frappe');
const ajout = tranche('« Ajouter un compte » (table des domaines, détection, openAddAccount)', '  // ---------- Ajouter un compte : on tape l\'adresse', '  // Repli : l\'ancienne liste, pour les cas rares');
v('openAddAccount, detectParDomaine, detectParMX, lireMX et provServeurEntreprise sont dans la tranche', ['function openAddAccount(', 'function detectParDomaine(', 'function detectParMX(', 'function lireMX(', 'function provServeurEntreprise('].filter(x => !ajout.includes(x)), []);
function bacAjout(opts) {
  opts = opts || {};
  const file = []; let maintenant = 0, ids = 0; const fetchs = [];
  const el = (nom) => { const L = {}; const e = { nom, value: '', hidden: false, disabled: false, textContent: '', innerHTML: '', className: '', isConnected: true, tabIndex: 0, _l: L,
    addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); }, setAttribute() {}, getAttribute: (a) => (a === 'data-kind' ? e.kind : null), removeAttribute() {}, focus() {}, scrollIntoView() {},
    click: () => { if (e.onclick) e.onclick({ target: e }); }, querySelector: () => el('sous-' + nom), classList: { add() {}, remove() {}, toggle() {} }, style: {} }; return e; };
  const cache = {}; const $ = (s) => cache[s] || (cache[s] = el(s));
  const sb = { $, $$: () => { const a = el('pro'), b = el('perso'); a.kind = 'pro'; b.kind = 'perso'; return [a, b]; },
    H: (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])),
    I: new Proxy({}, { get: () => '' }), KINDS: { pro: 'Pro', perso: 'Perso' }, state: { scope: 'pro' }, PROVIDERS: [], provOf: () => ({}), providerTile: () => '', acctExists: () => false, acctOf: () => ({}), kindOf: () => 'pro',
    acctByEmail: () => null, connectAccount: () => {}, openProviderList: () => {}, closeDrawer() {}, closeOverlay() {}, makeOverlay: () => { const o = el('overlay'); sb.overlay = o; return o; }, sheetBar: () => '', SHEET_FOOT: '', placeSheetChrome() {},
    toast() {}, Promise, JSON, Date, Object, Array, String, RegExp, Math, encodeURIComponent, AbortController, Error,
    setTimeout: (f, ms) => { const id = ++ids; file.push({ id, f, t: maintenant + (ms || 0) }); return id; },
    clearTimeout: (id) => { const i = file.findIndex(x => x.id === id); if (i >= 0) file.splice(i, 1); },
    fetch: (url) => { fetchs.push(String(url)); if (opts.reseauRefuse) return Promise.reject(new Error('refusé'));
      return Promise.resolve({ json: () => Promise.resolve({ Status: 0, Answer: [{ type: 15, data: '10 ssl0.ovh.net.' }] }) }); } };
  sb.window = sb; vm.createContext(sb); vm.runInContext(ajout + '\nthis.openAddAccount = openAddAccount;', sb);
  const api = { sb, fetchs, el: $, avancer(ms) { maintenant += ms; for (;;) { const i = file.findIndex(x => x.t <= maintenant); if (i < 0) break; const [x] = file.splice(i, 1); x.f(); } },
    vide: () => new Promise(r => setImmediate(() => setImmediate(() => setImmediate(r)))),
    tape(adresse) { $('#aMail').value = adresse; ($('#aMail')._l.input || []).forEach(f => f({ target: $('#aMail') })); api.avancer(400); },
    quitte() { ($('#aMail')._l.change || []).forEach(f => f({ target: $('#aMail') })); api.avancer(1); },
    entree() { ($('#aMail')._l.keydown || []).forEach(f => f({ key: 'Enter', preventDefault() {} })); api.avancer(1); },
    ferme() { sb.overlay.isConnected = false; $('#aMail').isConnected = false; } };
  vm.runInContext('openAddAccount()', sb);
  return api;
}
(async () => {
{ const a = bacAjout(); a.tape('julie@societe-exemple.fr'); await a.vide();
    v('⛔ pendant la frappe d\'un domaine d\'entreprise : AUCUNE requête', a.fetchs, []);
    vrai('le panneau dit qu\'il attend la fin de la saisie', /Entrée ou quittez le champ/.test(a.el('#aDet').innerHTML) && /societe-exemple\.fr/.test(a.el('#aDet').innerHTML));
    v('le bouton propose « Vérifier la messagerie », actif', [a.el('#aGo').textContent, a.el('#aGo').disabled], ['Vérifier la messagerie', false]);
    a.quitte(); await a.vide();
    v('⛔ quitter le champ : UNE requête, et elle ne porte que le nom de domaine', a.fetchs, ['https://dns.google/resolve?name=societe-exemple.fr&type=MX']);
    vrai('…le service est reconnu (OVH, serveurs IMAP proposés) et le bouton dit « Se connecter »', /OVH/.test(a.el('#aDet').innerHTML) && a.el('#aGo').textContent === 'Se connecter' && a.el('#aImap').value === 'ssl0.ovh.net');
    a.quitte(); a.quitte(); await a.vide();
    v('quitter le champ plusieurs fois ne refait pas la demande (le même domaine est déjà en mémoire)', a.fetchs.length, 1); }
  { const a = bacAjout(); a.tape('paul@autre-societe.fr'); a.entree(); await a.vide(); a.quitte(); await a.vide();
    v('⛔ Entrée : UNE requête (et le « change » qui suit ne la double pas)', a.fetchs, ['https://dns.google/resolve?name=autre-societe.fr&type=MX']); }
  { const a = bacAjout(); a.tape('paul@encore-une-societe.fr'); a.el('#aGo').click(); await a.vide();
    v('« Vérifier la messagerie » : UNE requête', a.fetchs.length, 1); }
  { const a = bacAjout(); a.tape('paul@societe-fermee.fr'); let jete = null; a.ferme(); try { a.quitte(); await a.vide(); } catch (e) { jete = String(e); }
    v('⛔ fermer la feuille (Échap, Annuler) en pleine saisie n\'est PAS un geste : aucune requête', a.fetchs, []);
    v('…et ne jette rien (le champ n\'est plus dans le document)', jete, null); }
  { const a = bacAjout(); a.tape('karim@gmail.com'); a.quitte(); await a.vide();
    v('un domaine grand public est reconnu par la table : AUCUNE requête, même en quittant le champ', a.fetchs, []);
    vrai('…et le service est reconnu (Google), connexion sans mot de passe ici', /Google|Gmail/.test(a.el('#aDet').innerHTML) && /Continuer avec Google/.test(a.el('#aGo').textContent)); }
  { const a = bacAjout({ reseauRefuse: true }); a.tape('paul@hors-ligne.fr'); a.quitte(); await a.vide(); await a.vide();
    v('réseau refusé : les DEUX annuaires sont essayés, avec le seul domaine', a.fetchs, ['https://dns.google/resolve?name=hors-ligne.fr&type=MX', 'https://cloudflare-dns.com/dns-query?name=hors-ligne.fr&type=MX']);
    vrai('⛔ …et la détection retombe sur la table + mail.<domaine>, en le DISANT', a.el('#aImap').value === 'mail.hors-ligne.fr' && /Impossible de vérifier le domaine/.test(a.el('#aDet').innerHTML)); }
  { const a = bacAjout(); a.tape('adresse invalide'); a.quitte(); await a.vide();
    v('une adresse invalide : aucune requête, rien à continuer', [a.fetchs, a.el('#aGo').disabled], [[], true]); }

/* ═════════════════════════════════════ 6. LE MODE DÉMO ═════════════════════════════════════ */
console.log('\n6. Le mode démo : un drapeau, et la mention honnête');
vrai('le drapeau : démo tant qu\'aucun serveur n\'a posé window.OPCOURRIER_SERVEUR', /var DEMO=!window\.OPCOURRIER_SERVEUR;/.test(CODE));
vrai('hors démo, plus un exemple : boîtes et messages vidés', /if\(!DEMO\)\{ ACCOUNTS\.length=0; MESSAGES\.length=0; \}/.test(CODE));
const arrivee = tranche('arrivée simulée (INCOMING, receiveMail, minuterie)', '  var INCOMING={', '  // ---------- Composer ----------');
function bacArrivee(demo) {
  const minuteries = []; const sb = { DEMO: demo, MESSAGES: [], ACCOUNTS: [{ id: 'a1', kind: 'pro', name: 'Moi', email: 'moi@x.fr' }], state: { scope: 'pro', folder: 'inbox' }, SETTINGS: { notif: true }, toasts: [], rendus: 0, sauvegardes: 0,
    app: { classList: { contains: () => false } }, document: { hidden: false }, Date, Object, Array, String,
    acctExists: () => false, acctOf: (id) => sb.ACCOUNTS[0], accountsOfKind: (k) => sb.ACCOUNTS.filter(a => a.kind === k), kindOf: (a) => a.kind,
    mk: (o) => Object.assign({ id: 'm' + (sb.MESSAGES.length + 1) }, o), firstLine: (s) => String(s).slice(0, 40), senderName: (m) => m.from.name, renderAll() { sb.rendus++; }, persist() { sb.sauvegardes++; },
    toast: (t) => sb.toasts.push(t), closeOverlay() {}, closeDrawer() {}, selectMessage() {}, msgById: () => null, setTimeout: (f, ms) => { minuteries.push(ms); return 1; } };
  sb.window = sb; vm.createContext(sb); vm.runInContext(arrivee + '\nthis.receiveMail = receiveMail;', sb); sb.minuteries = minuteries; return sb;
}
{ const sb = bacArrivee(true);
  v('démo : la minuterie d\'arrivée simulée (180 s) est posée', sb.minuteries, [180000]);
  sb.receiveMail(); vrai('démo : receiveMail() fait « arriver » un mail (population : il y en avait 0, il y en a 1)', sb.MESSAGES.length === 1 && sb.MESSAGES[0].folder === 'inbox' && sb.MESSAGES[0].read === false);
  const sb2 = bacArrivee(false);
  v('⛔ hors démo : AUCUNE minuterie d\'arrivée simulée', sb2.minuteries, []);
  sb2.receiveMail(); v('⛔ hors démo : receiveMail() n\'invente aucun mail, ne dit rien, ne sauvegarde rien', [sb2.MESSAGES.length, sb2.toasts, sb2.rendus, sb2.sauvegardes], [0, [], 0, 0]); }
const signature = tranche('signAct', '  function signAct(act,m){', '  function signDone(');
function bacSignature(demo) {
  const sb = { DEMO: demo, DAY: 864e5, Date, Object, Array, String, signLogs: [], toasts: [], signLog: (m, x) => sb.signLogs.push(x), signPreview() {}, renderAll() {}, persist() {}, toast: (t) => sb.toasts.push(t), signDone: (m) => { m.sign.st = 'signed'; },
    openSignPad() {}, openSignRequest() {}, acctOf: () => ({ name: 'Moi', email: 'moi@x.fr' }) };
  vm.createContext(sb); vm.runInContext(signature + '\nthis.signAct = signAct;', sb); return sb;
}
{ const mk = () => ({ id: 'm9', acct: 'a1', subject: 'Contrat', att: [], sign: { type: 'Contrat', level: 'simple', counter: false, st: 'pending', events: [], signers: [{ name: 'Client', email: 'c@y.fr', st: 'pending' }] } });
  const a = mk(), sb = bacSignature(true); sb.signAct('signSim', a);
  v('démo : « Simuler la signature du client » signe (population : le client était en attente)', [a.sign.signers[0].st, a.sign.st], ['signed', 'signed']);
  const b = mk(), sb2 = bacSignature(false); sb2.signAct('signSim', b);
  v('⛔ hors démo : signSim ne signe rien, ne journalise rien', [b.sign.signers[0].st, b.sign.st, sb2.signLogs, sb2.toasts], ['pending', 'pending', [], []]); }
vrai('le bouton « Simuler la signature du client » n\'existe que dans la démo (une seule occurrence, sous DEMO?)', (CODE.match(/data-act="signSim"/g) || []).length === 1 && /acts=\(DEMO\?'<button type="button" class="btn" data-act="signSim">Simuler la signature du client \(démo\)<\/button>':''\)\+'<button/.test(CODE));
vrai('« Document ouvert » (ouverture simulée du document par le client) n\'est posé que dans la démo', /if\(DEMO\) setTimeout\(function\(\)\{ var x=m\.sign&&m\.sign\.signers\[0\]; if\(!x\|\|x\.st!=="pending"/.test(CODE));
vrai('« Recevoir un mail d\'exemple » (Réglages) n\'existe que dans la démo', /\(DEMO\?'<div class="strow"><button type="button" class="btn" id="stTest">/.test(CODE) && /if\(\$\("#stTest"\)\) \$\("#stTest"\)\.onclick/.test(CODE));
vrai('hors démo, ajouter une boîte et envoyer un message REFUSENT en le disant (rien ne fait semblant)', /function connectAccount\(p,mail,name,kind\)\{\s*if\(!DEMO\)\{ toast\("OP Courrier n’est pas encore relié à un serveur/.test(CODE) && /\$\("#cSend"\)\.onclick=function\(\)\{\s*if\(!DEMO\)\{ toast\("OP Courrier n’est pas encore relié à un serveur/.test(CODE));
vrai('hors démo, composer et demander une signature SANS boîte le disent au lieu de jeter', /function openCompose\(model\)\{\s*if\(!ACCOUNTS\.length\)\{ toast\("Ajoutez d’abord une boîte mail"\)/.test(CODE) && /function openSignRequest\(pre\)\{\s*if\(!ACCOUNTS\.length\)\{ toast\("Ajoutez d’abord une boîte mail"\)/.test(CODE));
const MENTION = 'Bêta — aucun vrai mail n\'est lu ni envoyé';
const pastilles = Array.from(CODE.matchAll(/<span class="demo-pill" title="([^"]*)">Bêta<span class="dp-long">([^<]*)<\/span><\/span>/g));
v('⛔ quatre pastilles, toutes honnêtes : « ' + MENTION + ' » (infobulle et phrase longue)', [pastilles.length, pastilles.every(m => m[1] === MENTION && m[2] === ' — aucun vrai mail n\'est lu ni envoyé')], [4, true]);
v('⛔ le mot « Maquette » n\'est plus écrit nulle part dans le code ni le balisage', (CODE.match(/maquette/gi) || []).length, 0);
vrai('le pied de la barre latérale et la zone d\'état le disent aussi', /OP Courrier est en bêta : les messages sont des exemples, aucun e-mail n’est réellement envoyé ni reçu\./.test(CODE) && /Bêta · messages d’exemple/.test(CODE));

/* ═════════════════════════════════════ 7. LE CÔTÉ D'OUVERTURE ═════════════════════════════════════ */
console.log('\n7. Le côté d\'ouverture : #pro / #perso');
const cote = tranche('côté d\'ouverture', '  function coteDuHash(){', '  window.addEventListener("hashchange"');
function bacCote(hash, scope) {
  const sb = { String, location: { hash }, state: { scope: scope || 'pro', folder: 'sent', selected: 'm3', filter: 'unread' }, notes: [], app: { setAttribute: (k, x) => { sb.dataScope = x; } },
    history: { replaceState: (a, b, u) => { sb.notes.push(u); } }, acctExists: (id) => id === 'acct7', acctOf: () => ({ kind: 'perso' }), kindOf: (a) => a.kind };
  vm.createContext(sb); vm.runInContext(cote + '\nthis.f = { coteDuHash, coteCourant, ouvrirCote, noterCote };', sb); return sb;
}
v('#pro → pro, #perso → perso, #PERSO (casse) → perso', [bacCote('#pro').f.coteDuHash(), bacCote('#perso').f.coteDuHash(), bacCote('#PERSO').f.coteDuHash()], ['pro', 'perso', 'perso']);
v('rien d\'autre n\'est un côté : « », #, #x, #pro2, #v=pro, #profil', ['', '#', '#x', '#pro2', '#v=pro', '#profil'].map(h => bacCote(h).f.coteDuHash()), [null, null, null, null, null, null]);
{ const sb = bacCote('#perso'); sb.f.ouvrirCote('perso');
  vrai('ouvrirCote pose le côté, revient à la réception, sans sélection ni filtre', sb.state.scope === 'perso' && sb.state.folder === 'inbox' && sb.state.selected === null && sb.state.filter === 'all' && sb.dataScope === 'perso'); }
v('le côté courant d\'une boîte précise : sa nature (perso) — pro par défaut', [bacCote('', 'acct7').f.coteCourant(), bacCote('', 'pro').f.coteCourant(), bacCote('', 'perso').f.coteCourant()], ['perso', 'pro', 'perso']);
{ const a = bacCote('#perso', 'pro'); a.f.noterCote(); const b = bacCote('', 'pro'); b.f.noterCote(); const c = bacCote('#x', 'pro'); c.f.noterCote();
  v('noterCote : le hash suit le côté choisi — mais seulement s\'il y en avait un (sans hash, ou avec un autre, rien n\'est écrit)', [a.notes, b.notes, c.notes], [['#pro'], [], []]); }
vrai('à l\'ouverture, le hash gagne sur le côté mémorisé ; il est lu APRÈS restore()', /restore\(\);\s*if\(coteDuHash\(\)\) ouvrirCote\(coteDuHash\(\)\);/.test(CODE));
vrai('un changement de hash en cours de route change de côté', /window\.addEventListener\("hashchange",function\(\)\{ var c=coteDuHash\(\); if\(!c\|\|c===coteCourant\(\)\) return;/.test(CODE));

/* ═════════════════════════════════════ 8. LES ENTRÉES ═════════════════════════════════════ */
console.log('\n8. Les entrées : OP GESTION bêta, OP MESSAGES bêta');
const APP = lire('app.html'), BETA = lire('beta.html'), BUILD = lire('beta-build.js');
v('⛔ app.html (la version publique) ne sait rien d\'OP Courrier', (APP.match(/opcourrier|courrier-beta|OP Courrier/gi) || []).length, 0);
vrai('beta.html porte l\'entrée, vers courrier-beta.html#pro, dans la liste SUITE (#suite-fly)', /<div id="suite-fly">[\s\S]*?<a id="suite-opcourrier" href="courrier-beta\.html#pro" class="suite-row suite-mini"[\s\S]*?OP Courrier[\s\S]*?<\/a>\s*<\/div>\s*<\/div>\s*<div class="suite-user"/.test(BETA));
v('…une seule fois, et elle dit BÊTA', [(BETA.match(/id="suite-opcourrier"/g) || []).length, /id="suite-opcourrier"[\s\S]{0,900}BÊTA<\/span>/.test(BETA)], [1, true]);
v('beta.html montre la barre SUITE à une bêta (BETA_ESSAI) — trois endroits ; app.html garde la règle d\'origine (OP MESSAGES ouvert seulement)', [(BETA.match(/\(soOn\|\|BETA_ESSAI\)/g) || []).length, (APP.match(/\(soOn\|\|BETA_ESSAI\)/g) || []).length, /sb\.style\.display=soOn\?'':'none'/.test(APP)], [3, 0, true]);
{ const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-2701-'));
  try {
    const r = spawnSync(process.execPath, [path.join(RACINE, 'beta-build.js'), path.join(tmp, 'neuve.html')], { cwd: RACINE, encoding: 'utf8', timeout: 60000 });
    v('beta-build.js fabrique sans erreur', r.status, 0);
    vrai('⛔ beta.html COMMITÉE est ce que la fabrique produirait (octet pour octet) — sinon quelqu\'un a oublié `node beta-build.js`', fs.existsSync(path.join(tmp, 'neuve.html')) && fs.readFileSync(path.join(tmp, 'neuve.html'), 'utf8') === BETA);
    /* la fabrique REFUSE quand une ancre de l'entrée disparaît : une copie d'app.html mutée, la fabrique jouée dans un dossier à part (elle lit `app.html` à côté d'elle) */
    const ANCRES = [['la fin de la liste SUITE', "          </a>\n        </div>\n      </div>\n      <div class=\"suite-user\"", /fin de la liste SUITE/],
      ['l\'affichage de la barre SUITE', "sb.style.display=soOn?'':'none'; const lbl=sb.previousElementSibling;", /affichage de la barre SUITE/], ['le filet de la carte utilisateur', "pied.classList.toggle('sans-suite',!soOn)", /filet de la carte utilisateur/]];
    for (const [nom, ancre, motif] of ANCRES) {
      vrai('(l\'ancre existe UNE fois dans app.html : ' + nom + ')', APP.split(ancre).length - 1 === 1);
      const d = path.join(tmp, 'm' + ANCRES.findIndex(x => x[0] === nom)); fs.mkdirSync(d);
      fs.writeFileSync(path.join(d, 'app.html'), APP.split(ancre).join(ancre.replace(/[a-z]/i, 'X')));
      const m = spawnSync(process.execPath, [path.join(RACINE, 'beta-build.js'), path.join(d, 'sortie.html')], { cwd: d, encoding: 'utf8', timeout: 60000 });
      vrai('⛔ sans l\'ancre « ' + nom + ' » la fabrique REFUSE (code ' + m.status + ') et le dit', m.status === 1 && motif.test(m.stderr) && !fs.existsSync(path.join(d, 'sortie.html')));
    }
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); } }
/* OP MESSAGES : la source de l'interface, ce que le générateur en sert, et rien d'autre */
const SOURCES_MSG = [['apercu/opmessages/index.html', lire('apercu/opmessages/index.html')], ['server-msg/public/opmsg-ui.js', lire('server-msg/public/opmsg-ui.js')]];
for (const [nom, src] of SOURCES_MSG) {
  const c = sansComm(src);
  const defs = tranche(nom + ' : l\'entrée OP Courrier', '  const COURRIER_PAGE = ', '  const regLigne = ', c);
  function bacMsg(hote, mode) { const sb = { location: { hostname: hote, protocol: 'https:' }, etat: { mode }, RegExp, String }; vm.createContext(sb); vm.runInContext(defs + '\nthis.f = { courrierBeta, courrierUrl };', sb); return sb.f; }
  v(nom + ' : seul le NOM D\'HÔTE du canal bêta montre l\'entrée (casse indifférente ; ni la production, ni un poste, ni un nom qui y ressemble)',
    ['msg-beta.teamop.fr', 'MSG-BETA.TEAMOP.FR', 'msg.teamop.fr', 'teamop.fr', '127.0.0.1', 'localhost', 'msg-beta.teamop.fr.evil.example', 'xmsg-beta.teamop.fr', 'msg-beta.teamop.fr:8091'].map(h => bacMsg(h, 'perso').courrierBeta()),
    [true, true, false, false, false, false, false, false, false]);
  v(nom + ' : l\'adresse ouverte se déduit du canal et suit le côté (https://teamop.fr/courrier-beta.html#pro | #perso)', [bacMsg('msg-beta.teamop.fr', 'pro').courrierUrl(), bacMsg('msg-beta.teamop.fr', 'perso').courrierUrl(), bacMsg('msg-beta.teamop.fr', undefined).courrierUrl()],
    ['https://teamop.fr/courrier-beta.html#pro', 'https://teamop.fr/courrier-beta.html#perso', 'https://teamop.fr/courrier-beta.html#perso']);
  vrai(nom + ' : la carte n\'est écrite que sous courrierBeta(), et son clic REFUSE hors du canal bêta', /\(courrierBeta\(\) \? '<div class="carte"><button type="button" class="reglage presse" id="reg-courrier">/.test(c) && /\$\('vue-reglages'\)\.addEventListener\('click', e => \{ if \(!e\.target\.closest\('#reg-courrier'\) \|\| !courrierBeta\(\)\) return; window\.open\(courrierUrl\(\), '_blank', 'noopener'\); \}\);/.test(c));
  vrai(nom + ' : elle s\'ouvre dans un NOUVEL onglet, sans lien avec celui-ci (noopener) — jamais en naviguant (un appel en cours ne se coupe pas)', !/location\.(href|assign|replace)\s*=?\s*\(?\s*courrierUrl/.test(c) && /window\.open\(courrierUrl\(\), '_blank', 'noopener'\)/.test(c));
  vrai(nom + ' : elle dit « Bêta — aucun vrai mail n\'est lu ni envoyé »', /OP Courrier<small>Bêta — aucun vrai mail n\\'est lu ni envoyé<\/small>/.test(c));
}
{ const r = spawnSync(process.execPath, [path.join(RACINE, 'scripts', 'opmsg-public.js'), '--verifier'], { cwd: RACINE, encoding: 'utf8', timeout: 60000 });
  v('⛔ server-msg/public/ est ce que le générateur produit de l\'interface (sinon : node scripts/opmsg-public.js)', r.status, 0); }
{ const tout = []; for (const d of ['server', 'server-msg']) (function parcourir(p) { for (const e of fs.readdirSync(p, { withFileTypes: true })) { if (e.name === 'node_modules' || e.name === 'public' && p.endsWith('server-msg')) continue; const f = path.join(p, e.name); if (e.isDirectory()) parcourir(f); else if (/\.(js|json|sh|html)$/.test(e.name)) tout.push(f); } })(path.join(RACINE, d));
  vrai('(population) ' + tout.length + ' fichiers de serveur relus', tout.length > 30);
  v('⛔ rien n\'est branché sur un serveur : ni server/ (socle d\'OP GESTION) ni server-msg/ (le service d\'OP MESSAGES) ne connaît OP Courrier', tout.filter(f => /opcourrier|courrier-beta|OP Courrier/i.test(fs.readFileSync(f, 'utf8'))).map(f => path.relative(RACINE, f)), []);
  const api = lire('server-msg/public/api.js') + lire('server-msg/public/source-serveur.js');
  v('…ni le client ni le module de données de la page d\'OP MESSAGES (aucune route, aucun appel vers OP Courrier)', (api.match(/opcourrier|courrier-beta|OP Courrier/gi) || []).length, 0); }

/* ═════════════════════════════════════ 9. LE SITE ═════════════════════════════════════ */
console.log('\n9. Le site : servie, non indexée, non mise en cache');
{ const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'site-2701-')); const site = path.join(tmp, '_site');
  try {
    const r = spawnSync('bash', [path.join(RACINE, 'scripts', 'assembler-site.sh'), site], { encoding: 'utf8' });
    v('le site s\'assemble', r.status, 0);
    vrai('⛔ courrier-beta.html est dans le site assemblé, identique au fichier du dépôt', fs.existsSync(path.join(site, 'courrier-beta.html')) && fs.readFileSync(path.join(site, 'courrier-beta.html'), 'utf8') === PAGE);
    vrai('…et le moteur de référence et ses jeux (tests/) n\'y sont pas', !fs.existsSync(path.join(site, 'tests')) && !fs.existsSync(path.join(site, 'classify.js')));
    vrai('…ni l\'outil qui a fabriqué la page (scratchpad/)', !fs.existsSync(path.join(site, 'scratchpad')));
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); } }
vrai('⛔ hors sitemap.xml', !/courrier/i.test(lire('sitemap.xml')));
{ const sw = sansComm(lire('sw.js'));
  vrai('le service worker ne met JAMAIS la page en cache (comme beta.html et messages-beta.html : « toujours la dernière poussée »)', /if \(url\.pathname\.endsWith\('\/courrier-beta\.html'\)\) return;/.test(sw));
  const assets = tranche('la liste ASSETS du service worker', 'const ASSETS = [', '\n];', sw);
  vrai('…et elle n\'est pas dans ASSETS (' + (assets.match(/'[^']+'/g) || []).length + ' fichiers listés — la liste n\'est pas vide)', (assets.match(/'[^']+'/g) || []).length > 20 && !/courrier/.test(assets)); }
vrai('robots.txt ne l\'interdit pas : le noindex doit pouvoir être LU par qui passe (interdire le crawl empêcherait de voir la consigne)', !/courrier/i.test(lire('robots.txt')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exitCode = ko ? 1 : 0;
})().catch(e => { console.log('  ✗ le banc a jeté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
