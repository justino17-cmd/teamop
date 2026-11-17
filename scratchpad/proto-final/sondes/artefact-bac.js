// BAC À SABLE DE L'ARTEFACT, simulé (17 novembre 2026, voie « artefact », étape 1).
// Justin ouvre le prototype dans un « artefact » de claude.ai : la page est servie dans un cadre verrouillé. Ce qui marche sur
// 127.0.0.1 peut y être MORT sans un mot (téléchargement par lien, window.open, alert, impression…). Cet outil rejoue ces règles
// sur une page ouverte par lib.ouvrir, pour que les sondes TOUCHENT les boutons et lisent ce qui s'est vraiment passé.
//
// Règles imitées (elles valent pour tout visiteur) :
//   · un clic sur un lien « download », une adresse blob: ou data: : INERTE (rien ne se télécharge) et COMPTÉ ;
//   · window.claude n'existe QUE dans la page du haut (jamais dans un cadre) : use('downloads') rend { save } ; tout autre nom rend null.
//     save({filename, data}) suit le VRAI contrat (downloads.d.ts, runtime 0.2.75) : extension dans la liste permise, données non
//     vides, refus du visiteur = rejet { code:'declined' }, réussite = { status:'saved' } ; chaque fichier est noté (nom, type
//     déduit de l'extension, taille, 8 premiers octets) ;
//   · confirm rend false, prompt rend null, alert et print ne font rien (comptés) ; window.open rend null (compté) ;
//   · un lien mailto: tel: sms: ne fait rien et ne dit rien : la navigation est annulée et COMPTÉE ;
//   · le presse-papiers : writeText note le texte (ou refuse, ou n'existe pas) ; on ne lit JAMAIS le presse-papiers ;
//   · le réseau : toute requête hors 127.0.0.1 est COUPÉE et comptée (les hôtes permis par l'artefact — cdnjs, jsdelivr, unpkg,
//     tailwind, jquery pour les scripts ; fonts.googleapis.com pour les feuilles ; fonts.gstatic.com pour les polices — sont aussi
//     coupés ici, faute d'Internet, mais rangés à part : « permis hors ligne ») ;
//   · rangement refusé (option) : localStorage / sessionStorage jettent (à l'accès, ou à chaque méthode), indexedDB aussi.
//
// Utilisation (sonde) :
//   const bac = require('./artefact-bac.js');
//   const c = await bac.ouvrir({ profil:'mac', qui:'marc' }, { presse:'ok' });   // même options que lib.ouvrir ; 2ᵉ argument : le bac
//   await c.p.click(...); const e = await bac.etat(c); // e.fichiers, e.liensInertes, e.dialogues, e.navigations, e.coupes…
// Ou, pour une page déjà ouverte : await bac.poser(page, contexte, opts) — réinstalle le bac et RECHARGE la page (un script
// d'initialisation ne s'exécute qu'avant les scripts de la page).
// Options : refuser:true (le visiteur refuse chaque enregistrement), echec:'unavailable'|'too_large'|'rate_limited' (le pont rejette
// avec ce code), pont:false (window.claude absent partout), presse:'ok'|'refuse'|'absent'|'sel' (« sel » : pas de navigator.clipboard, mais la copie par
// sélection marche ; « refuse » et « absent » : rien ne copie), rangement:'refuse'|'methodes'|'vide'.
const path = require('path');
const lib = require('../lib.js');

// ── côté page : un script d'initialisation, exécuté dans CHAQUE cadre avant tout script de la page ──────────────────────────
function initBac(o) {
  const haut = window === window.top;
  let J; try { J = window.top.__bacJ || (window.top.__bacJ = { liensInertes: [], fichiers: [], refus: [], dialogues: [], impressions: 0, ouvertures: [], navigations: [], presse: [], rangement: [], use: [], copiesSelection: [], essaisSave: 0 }); } catch (e) { J = window.__bacJ = window.__bacJ || { liensInertes: [], fichiers: [], refus: [], dialogues: [], impressions: 0, ouvertures: [], navigations: [], presse: [], rangement: [], use: [], copiesSelection: [], essaisSave: 0 }; }
  const cadre = haut ? 'haut' : (location.pathname.split('/').pop() || 'cadre');
  // dialogues : ils ne s'affichent JAMAIS
  window.alert = m => { J.dialogues.push({ t: 'alert', m: String(m).slice(0, 80), cadre }); };
  window.confirm = m => { J.dialogues.push({ t: 'confirm', m: String(m).slice(0, 80), cadre }); return false; };
  window.prompt = m => { J.dialogues.push({ t: 'prompt', m: String(m).slice(0, 80), cadre }); return null; };
  window.print = () => { J.impressions++; };
  window.open = u => { J.ouvertures.push({ u: String(u).slice(0, 120), cadre }); return null; };
  // blob : on retient le contenu de chaque adresse fabriquée, pour dire ce qu'un lien inerte aurait donné
  const blobs = new Map(), cree = URL.createObjectURL.bind(URL);
  URL.createObjectURL = b => { const u = cree(b); try { blobs.set(u, b); } catch (e) {} return u; };
  const ENTETE = a => a.getAttribute('href') || '';
  const inerte = (a, via) => { const h = ENTETE(a), b = blobs.get(a.href), nom = a.getAttribute('download') || '';
    J.liensInertes.push({ nom, via, href: h.slice(0, 40), taille: b ? b.size : null, type: b ? b.type : null, cadre }); };
  const analyser = ev => { const chemin = ev.composedPath ? ev.composedPath() : [ev.target]; const a = chemin.find(x => x && x.tagName === 'A'); if (!a) return;
    const h = ENTETE(a);
    if (a.hasAttribute('download') || /^(blob|data):/i.test(h)) { ev.preventDefault(); inerte(a, a.hasAttribute('download') ? 'download' : 'blob/data'); return; }
    const m = /^(mailto|tel|sms):/i.exec(h); if (m) { ev.preventDefault(); J.navigations.push({ schema: m[1].toLowerCase(), u: h.slice(0, 60), cadre }); } };
  // La page a d'abord sa chance : un lien que SON écouteur prend en charge (preventDefault) n'est pas inerte. Le bac ne tranche qu'en fin de remontée, sur ce
  // que le navigateur aurait fait de lui-même (rien, dans le cadre verrouillé). Les liens détachés (a.click() sans l'attacher) passent par le même chemin.
  window.addEventListener('click', ev => { if (!ev.defaultPrevented) analyser(ev); }, false);
  const clic0 = HTMLAnchorElement.prototype.click;
  HTMLAnchorElement.prototype.click = function () { if (this.isConnected) return clic0.call(this); analyser({ composedPath: () => [this], preventDefault() {}, target: this }); };
  // le pont : seulement dans la page du HAUT
  const EXT = 'gif png jpg jpeg webp mp4 webm txt json md docx pptx epub csv ttf html svg pdf xlsx zip'.split(' ');
  const MIME = { pdf: 'application/pdf', csv: 'text/csv', txt: 'text/plain', json: 'application/json', md: 'text/markdown', html: 'text/html', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', zip: 'application/zip', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', svg: 'image/svg+xml' };
  if (haut && o.pont !== false) {
    const downloads = { save: async req => {
      J.essaisSave++;
      const nom = req && req.filename, d = req && req.data;
      if (typeof nom !== 'string' || !nom || nom.length > 512) throw { code: 'bad_request', message: 'nom de fichier invalide' };
      const ext = (nom.split('.').pop() || '').toLowerCase();
      if (!/\./.test(nom) || EXT.indexOf(ext) < 0) throw { code: 'rejected_extension', message: 'extension refusée : ' + nom };
      let taille = 0, debut = '';
      if (typeof d === 'string') { taille = new TextEncoder().encode(d).length; debut = d.slice(0, 8); }
      else if (d instanceof Blob) { taille = d.size; try { const b = new Uint8Array(await d.slice(0, 8).arrayBuffer()); debut = String.fromCharCode(...b); } catch (e) {} }
      else if (d instanceof ArrayBuffer || ArrayBuffer.isView(d)) { taille = d.byteLength; const b = new Uint8Array(d.buffer || d, d.byteOffset || 0, Math.min(8, d.byteLength)); debut = String.fromCharCode(...b); }
      else throw { code: 'bad_request', message: 'données absentes' };
      if (!taille) throw { code: 'bad_request', message: 'données vides' };
      if (o.echec) { J.refus.push({ nom, code: o.echec }); throw { code: o.echec, message: 'échec simulé' }; }
      if (o.refuser) { J.refus.push({ nom, code: 'declined' }); throw { code: 'declined', message: 'le visiteur a refusé' }; }
      J.fichiers.push({ nom, type: MIME[ext] || 'application/octet-stream', taille, debut, cadre });
      return { status: 'saved' }; } };
    window.claude = { use: async n => { J.use.push(String(n)); return n === 'downloads' ? downloads : null; } };
  }
  // presse-papiers : on écrit, on ne lit jamais
  if (o.presse === 'absent' || o.presse === 'sel') { try { Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true }); } catch (e) {} }
  else { const pp = { writeText: t => { if (o.presse === 'refuse') return Promise.reject(new DOMException('refusé', 'NotAllowedError')); J.presse.push(String(t).slice(0, 80)); return Promise.resolve(); }, readText: () => { J.presse.push('⚠ LECTURE'); return Promise.reject(new DOMException('refusé', 'NotAllowedError')); } };
    try { Object.defineProperty(navigator, 'clipboard', { value: pp, configurable: true }); } catch (e) {} }
  const ec = document.execCommand ? document.execCommand.bind(document) : null;
  document.execCommand = function (c) { if (String(c).toLowerCase() === 'copy') { let t = ''; try { t = String(getSelection()); } catch (e) {} J.copiesSelection.push(t.slice(0, 80)); return (!o.presse || o.presse === 'ok' || o.presse === 'sel') && !!t; } return ec ? ec.apply(document, arguments) : false; };
  // rangement refusé
  if (o.rangement === 'refuse') {
    for (const k of ['localStorage', 'sessionStorage']) { try { Object.defineProperty(window, k, { configurable: true, get() { J.rangement.push({ op: 'acces', k, cadre }); throw new DOMException('Accès au rangement refusé', 'SecurityError'); } }); } catch (e) {} }
    try { Object.defineProperty(window, 'indexedDB', { configurable: true, get() { J.rangement.push({ op: 'acces', k: 'indexedDB', cadre }); throw new DOMException('refusé', 'SecurityError'); } }); } catch (e) {}
  } else if (o.rangement === 'methodes') {
    for (const m of ['getItem', 'setItem', 'removeItem', 'clear', 'key']) { Storage.prototype[m] = function () { J.rangement.push({ op: m, cadre }); throw new DOMException('Quota ou accès refusé', 'QuotaExceededError'); }; }
  } else if (o.rangement === 'vide') {
    // revient VIDE à chaque lecture, accepte les écritures sans rien garder (un aperçu qui oublie tout)
    for (const m of ['getItem', 'key']) Storage.prototype[m] = function () { return null; };
    for (const m of ['setItem', 'removeItem', 'clear']) Storage.prototype[m] = function () {};
  }
}

// ── côté Node : le réseau, les fenêtres ouvertes ─────────────────────────────────────────────────────────────────────────
const SCRIPTS_OK = /^(cdnjs\.cloudflare\.com|cdn\.jsdelivr\.net|unpkg\.com|cdn\.tailwindcss\.com|code\.jquery\.com)$/;
const JOURNAUX = new WeakMap();
function journalDe(ctx) { let j = JOURNAUX.get(ctx); if (!j) { j = { coupes: [], permisHorsLigne: [], popups: [] }; JOURNAUX.set(ctx, j); } return j; }
async function brancherReseau(ctx) {
  const j = journalDe(ctx); if (j.branche) return j; j.branche = true;
  await ctx.route('**/*', route => { let h = ''; try { h = new URL(route.request().url()).hostname; } catch (e) {}
    if (h === '127.0.0.1' || h === 'localhost' || h === '') return route.continue();
    const t = route.request().resourceType(), u = route.request().url().slice(0, 100);
    const permis = (t === 'script' && SCRIPTS_OK.test(h)) || (t === 'stylesheet' && h === 'fonts.googleapis.com') || (t === 'font' && h === 'fonts.gstatic.com');
    (permis ? j.permisHorsLigne : j.coupes).push({ h, t, u });
    return route.abort(permis ? 'internetdisconnected' : 'blockedbyclient'); });
  // une fenêtre qui s'ouvre (lien target=_blank) : comptée puis refermée, jamais suivie
  ctx.on('page', async np => { const mere = ctx.pages()[0]; if (np === mere) return; j.popups.push({ u: np.url().slice(0, 100) }); try { await np.waitForLoadState('domcontentloaded', { timeout: 2000 }).catch(() => {}); j.popups[j.popups.length - 1].u = np.url().slice(0, 100); await np.close(); } catch (e) {} });
  return j;
}
const script = o => `(${initBac.toString()})(${JSON.stringify(o || {})})`;
// ouvrir(optionsLib, optionsBac) : lib.ouvrir avec le bac posé AVANT tout script de la page (le réseau compris, par un lanceur patché)
let patche = false;
function patcher() { if (patche) return; patche = true; const { chromium } = require('/opt/node-tools/node_modules/playwright'), lance = chromium.launch.bind(chromium);
  chromium.launch = async (...a) => { const b = await lance(...a), nc = b.newContext.bind(b); b.newContext = async (o) => { const c = await nc(o); if (c.__bacVoulu !== false) await brancherReseau(c); return c; }; return b; }; }
patcher();
exports.ouvrir = async (optsLib, optsBac) => { const c = await lib.ouvrir({ ...(optsLib || {}), init: script(optsBac) }); c.bac = journalDe(c.ctx); return c; };
// poser(page, contexte, opts) : pour une page déjà ouverte — installe, puis recharge
exports.poser = async (page, ctx, opts) => { await brancherReseau(ctx); await ctx.addInitScript(script(opts)); await page.reload({ waitUntil: 'load', timeout: 60000 }); await page.waitForTimeout(1200); return journalDe(ctx); };
// l'état complet : ce que la page a noté (journal du HAUT) + ce que le réseau a vu
exports.etat = async c => { const p = c.p || c; const ctx = c.ctx || p.context(); const j = journalDe(ctx);
  const h = await p.evaluate(() => { try { return JSON.parse(JSON.stringify(window.top.__bacJ || window.__bacJ || {})); } catch (e) { return {}; } });
  return { liensInertes: [], fichiers: [], refus: [], dialogues: [], impressions: 0, ouvertures: [], navigations: [], presse: [], rangement: [], use: [], copiesSelection: [], essaisSave: 0, ...h, coupes: j.coupes.slice(), permisHorsLigne: j.permisHorsLigne.slice(), popups: j.popups.slice() }; };
// remet les compteurs à zéro (avant un geste précis)
exports.zero = async c => { const ctx = c.ctx || c.p.context(); const j = journalDe(ctx); j.coupes.length = 0; j.permisHorsLigne.length = 0; j.popups.length = 0;
  await (c.p || c).evaluate(() => { const J = window.top.__bacJ; if (J) for (const k of Object.keys(J)) J[k] = Array.isArray(J[k]) ? [] : 0; }); };
exports.initBac = initBac; exports.script = script; exports.lib = lib;
exports.SCRIPTS_OK = SCRIPTS_OK;
