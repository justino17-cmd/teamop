// Outils communs des sondes de la VERSION FINALE du prototype OP GESTION (16 novembre 2026).
// Un serveur local sur 127.0.0.1 sert le dépôt (RACINE), un pilote Playwright ouvre le prototype comme un vrai
// utilisateur (mode application, session ouverte), sur six profils d'appareils, jour ou nuit.
// ⛔ Jamais contre teamop.fr : tout se passe sur 127.0.0.1, entreprise fictive, aucun serveur.
// Ce fichier vit DANS le dépôt exprès : le dossier temporaire d'une session s'efface au redémarrage de la machine
// (perdu le 16 novembre avec trois heures de travail non poussé).
const http = require('http'), fs = require('fs'), path = require('path');
const { chromium } = require('/opt/node-tools/node_modules/playwright');
const RACINE = process.env.RACINE || path.join(__dirname, '..', '..');
const TYPES = { '.html':'text/html;charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.png':'image/png', '.svg':'image/svg+xml', '.webmanifest':'application/manifest+json' };
let SRV = null, PORT = 0, NAV = null;
/* ⛔ UN PLAFOND DE NAVIGATEURS POUR TOUTE LA MACHINE (16 novembre 2026, après le second redémarrage de la soirée : 13 agents,
   46 processus de navigateur, charge 7 sur 4 cœurs, puis la session est tombée). Chaque sonde prend une PLACE avant de lancer
   son navigateur (un dossier créé de façon atomique dans VERROUS) et la rend en fermant. Une place dont le processus est mort
   se reprend. Après ATTENTE_MAX sans place, la sonde part quand même et le DIT : mieux vaut une machine lente qu'une sonde
   qui ne rend jamais. Réglages : OPG_NAVIGATEURS (4 par défaut), OPG_ATTENTE_S (330).
   17 novembre, 7 h 20 : avec vingt voies, l'attente de 150 s était dépassée sans cesse (21 départs « quand même » relevés) et
   six à huit navigateurs tournaient ensemble, charge 10 sur 4 cœurs. À 330 s une sonde fait la queue au lieu de s'empiler ;
   les commandes des agents ont un délai de 580 s : une sonde de moins de quatre minutes passe encore. */
const VERROUS = '/tmp/opg-navigateurs', PLACES = parseInt(process.env.OPG_NAVIGATEURS || '4', 10), ATTENTE_MAX = parseInt(process.env.OPG_ATTENTE_S || '330', 10) * 1000;
let MA_PLACE = null;
const vivant = pid => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
const rendrePlace = () => { if (MA_PLACE) { try { fs.rmSync(MA_PLACE, { recursive: true, force: true }); } catch (e) {} MA_PLACE = null; } };
async function prendrePlace() { if (MA_PLACE) return; try { fs.mkdirSync(VERROUS, { recursive: true }); } catch (e) {}
  const t0 = Date.now(); let dit = false;
  for (;;) {
    for (let i = 0; i < PLACES; i++) { const d = path.join(VERROUS, 'place-' + i);
      try { fs.mkdirSync(d); fs.writeFileSync(path.join(d, 'pid'), String(process.pid)); MA_PLACE = d; return; }
      catch (e) { let pid = 0; try { pid = parseInt(fs.readFileSync(path.join(d, 'pid'), 'utf8'), 10); } catch (x) {}
        let age = 0; try { age = Date.now() - fs.statSync(d).mtimeMs; } catch (x) {}
        if ((pid && !vivant(pid)) || (!pid && age > 15000) || age > 15 * 60 * 1000) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (x) {} } } }
    if (Date.now() - t0 > ATTENTE_MAX) { console.log('  · aucune place de navigateur après ' + Math.round(ATTENTE_MAX / 1000) + ' s : la sonde part quand même (machine chargée)'); return; }
    if (!dit) { console.log('  · attente d’une place de navigateur (' + PLACES + ' au plus sur la machine)…'); dit = true; }
    await new Promise(r => setTimeout(r, 1500 + Math.floor(Math.random() * 1500)));
  } }
process.on('exit', rendrePlace); for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { rendrePlace(); process.exit(143); });
exports.RACINE = RACINE;
// absents : chemins (relatifs à RACINE) que le serveur rend en 404, pour jouer « la page manque »
exports.absents = new Set();
exports.serveur = () => new Promise(ok => { if (SRV) return ok(PORT);
  SRV = http.createServer((q, r) => { const rel = decodeURIComponent(q.url.split('?')[0]), x = path.join(RACINE, rel); if (!x.startsWith(RACINE) || exports.absents.has(rel.replace(/^\//, ''))) { r.writeHead(404); return r.end(); }
    fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end()) : (r.writeHead(200, { 'Content-Type': TYPES[path.extname(x)] || 'application/octet-stream' }), r.end(d))); });
  SRV.listen(0, '127.0.0.1', () => { PORT = SRV.address().port; ok(PORT); }); });

const UA_WIN = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36';
const UA_AND = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36';
const UA_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const UA_IPAD = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
// largeur POSÉE de chaque profil : un débordement se mesure contre elle, jamais contre innerWidth (qui grandit avec la page)
exports.PROFILS = {
  mac:     { w:1440, h:900 },
  mac720:  { w:1280, h:720 },
  windows: { w:1366, h:768, ua:UA_WIN },
  ipad:    { w:820,  h:1180, doigt:true, ua:UA_IPAD, encoches:{ top:24, bottom:20, left:0, right:0 } },
  iphone:  { w:390,  h:844,  doigt:true, mobile:true, ua:UA_IOS, encoches:{ top:47, bottom:34, left:0, right:0 } },
  android: { w:360,  h:740,  doigt:true, mobile:true, ua:UA_AND, encoches:{ top:24, bottom:16, left:0, right:0 } },
  petit:   { w:320,  h:568,  doigt:true, mobile:true, ua:UA_AND },
};
// ouvrir({profil, nuit, qui, app, hash, init, page, attente, guide, calme}) → {p, ctx, err, profil, doigt, largeur, hauteur, port}
//   qui : 'marc' (gérant), 'julie' (secrétariat), 'sm' (technicienne), 'kb' (chef d'équipe), 'lr', 'tl' — entre sans l'écran de connexion (?auto=)
//   app : true par défaut = mode application (ce que voit un vrai utilisateur) ; false = prototype avec son échafaudage de revue
//   qui:null avec app:true = on arrive sur l'écran de connexion (pour le tester lui-même)
//   page : une autre page d'apercu/ (ex. 'prototype-documents.html') ; requete : chaîne de requête à la place de celle du mode application
exports.ouvrir = async function (o) {
  o = o || {}; const port = await exports.serveur(); if (!NAV) { await prendrePlace(); NAV = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--js-flags=--max-old-space-size=768'] }); }
  const nom = o.profil || 'mac', pr = exports.PROFILS[nom]; if (!pr) throw new Error('profil inconnu : ' + nom);
  const ctx = await NAV.newContext({ viewport: { width: pr.w, height: pr.h }, deviceScaleFactor: 1, isMobile: !!pr.mobile, hasTouch: !!pr.doigt, userAgent: pr.ua, colorScheme: o.nuit ? 'dark' : 'light', locale: 'fr-FR', bypassCSP: !!process.env.SANS_CSP, timezoneId: 'Europe/Paris', reducedMotion: o.calme ? 'reduce' : 'no-preference' });
  const p = await ctx.newPage(), err = [];
  const bruit = t => /ERR_FAILED|fonts\.g|Failed to load resource|ERR_INTERNET|ERR_NAME|ERR_CONNECTION|net::|ERR_TUNNEL|ERR_PROXY/.test(t);
  p.on('pageerror', e => err.push('ERREUR ' + e.message + ' @ ' + String(e.stack || '').split('\n')[1]));
  p.on('console', m => { if (m.type() === 'error' && !bruit(m.text())) err.push('CONSOLE ' + m.text()); });
  let encochesPosees = false;
  if (pr.encoches) { try { const cdp = await ctx.newCDPSession(p); const e = pr.encoches; await cdp.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: e.top, bottom: e.bottom, left: e.left, right: e.right, topMax: e.top, bottomMax: e.bottom, leftMax: e.left, rightMax: e.right } }); encochesPosees = true; } catch (x) { /* Chromium qui ne sait pas : encoches à zéro, à DIRE dans le rapport */ } }
  if (o.init) await p.addInitScript(o.init);
  const app = o.app !== false, qui = o.qui === undefined ? 'marc' : o.qui;
  const q = o.requete !== undefined ? o.requete : (app && !o.page ? ('?app=1' + (qui ? '&auto=' + qui : '') + (o.guide ? '&guide=1' : '')) : '');   // guide:true : le guide des nouveautés paraît seul (900 ms après l'ouverture), comme à la première connexion
  await p.goto('http://127.0.0.1:' + port + '/apercu/' + (o.page || 'prototype-op-gestion.html') + q + (o.hash ? '#' + o.hash : ''), { waitUntil: 'load', timeout: 60000 });
  await p.waitForTimeout(o.attente || 1200);
  if (o.nuit !== undefined && !o.page) await p.evaluate(n => { try { mode = n ? 'nuit' : 'jour'; appliquerMode(); } catch (e) {} }, !!o.nuit);
  // le guide des nouveautés s'ouvre seul à la première connexion : on le laisse à qui veut le tester (o.guide), sinon on le ferme par SON bouton
  if (app && qui && !o.guide && !o.page) { await p.waitForTimeout(1100); await p.evaluate(() => { const b = document.querySelector('#nv [data-nv="fermer"]'); if (b) b.click(); }); await p.waitForTimeout(250); }
  return { p, ctx, err, profil: nom, doigt: !!pr.doigt, largeur: pr.w, hauteur: pr.h, port, encoches: encochesPosees ? pr.encoches : null };
};
exports.fin = async c => { try { await c.ctx.close(); } catch (e) {} };
exports.fermer = async () => { if (NAV) { try { await NAV.close(); } catch (e) {} NAV = null; } rendrePlace(); if (SRV) { SRV.close(); SRV = null; } };
exports.cadre = (p, motif) => p.frames().find(f => (motif || /prototype-(documents|comptabilite|paiement)\.html/).test(f.url()) && f !== p.mainFrame());

// ── gestes ────────────────────────────────────────────────────────────────────────────────────────────────
// calme(p) : deux images + lecture forcée + une attente. À appeler AVANT toute mesure (une transition de vue ment).
exports.calme = async (p, ms) => { await p.evaluate(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => { void document.documentElement.offsetWidth; r(); })))); await p.waitForTimeout(ms || 350); };
exports.aller = async (p, h) => { await p.evaluate(x => aller(x), h); await exports.calme(p, 500); };
// toucher(c, sélecteur ou Locator) : clic à la souris ou toucher au doigt selon le profil ; rend false si la cible n'est pas atteinte (à DIRE)
exports.toucher = async (c, cible, opt) => { const loc = typeof cible === 'string' ? c.p.locator(cible).first() : cible;
  try { if (c.doigt) await loc.tap({ timeout: (opt && opt.delai) || 4000 }); else await loc.click({ timeout: (opt && opt.delai) || 4000 }); await exports.calme(c.p, 300); return true; } catch (e) { return false; } };
// recensement des éléments qui répondent dans une zone : part du DOM, pas d'une liste de classes
exports.gestes = (p, zone) => p.evaluate(z => { const R = document.querySelector(z || '#contenu') || document.body, vus = [], sig = new Set();
  for (const e of R.querySelectorAll('*')) { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none' || (!e.offsetParent && cs.position !== 'fixed')) continue;
    const clic = e.tagName === 'BUTTON' || e.tagName === 'A' || e.tagName === 'SUMMARY' || (e.tagName === 'INPUT' && /checkbox|radio|button|submit/.test(e.type)) || e.getAttribute('role') === 'button' || ([...e.attributes].some(a => /^data-[a-z0-9-]+$/.test(a.name)) && cs.cursor === 'pointer');
    if (!clic || e.disabled || e.getAttribute('aria-disabled') === 'true') continue; const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
    const d = [...e.attributes].filter(a => a.name.startsWith('data-')).map(a => a.name + '=' + a.value.slice(0, 40)).join(' ');
    const lib = (e.getAttribute('aria-label') || e.textContent || e.title || '').replace(/\s+/g, ' ').trim().slice(0, 60), s = e.tagName + '|' + lib + '|' + d;
    if (sig.has(s)) continue; sig.add(s); vus.push({ balise: e.tagName, lib, data: d, sansNom: !lib, l: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top) }); }
  return vus; }, zone);
// état observable de l'écran : sert à dire si un geste a FAIT quelque chose
exports.etat = p => p.evaluate(() => { const vis = e => e && (e.offsetParent !== null || (getComputedStyle(e).position === 'fixed' && getComputedStyle(e).display !== 'none' && getComputedStyle(e).visibility !== 'hidden')); const t = s => { const e = document.querySelector(s); return vis(e) ? (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 160) : ''; }; const long = id => { const e = document.getElementById(id); return e ? e.innerHTML.length : 0; };
  return { hash: location.hash, h1: t('#contenu h1'), panneau: t('#calque .panneau h2') || t('#calque .panneau'), toast: t('#toast'), compta: vis(document.querySelector('#cmpt')), atelier: (() => { const z = document.getElementById('opdz'); return !!z && !z.hidden; })(), nv: !!document.getElementById('nv'), cnx: !!document.getElementById('cnx'), contenu: long('contenu'), calque: long('calque'), focus: document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id : '' }; });
exports.change = (a, b) => Object.keys(a).filter(k => a[k] !== b[k]);
// fermer ce qui est ouvert, par les gestes de l'application (jamais en retirant un élément du document)
exports.ranger = async p => { await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} try { fermerMenu(); } catch (e) {} }); await p.keyboard.press('Escape').catch(() => {}); await exports.calme(p, 200); };

// ── mesures ───────────────────────────────────────────────────────────────────────────────────────────────
// la page glisse-t-elle de côté ? Contre la largeur POSÉE du profil, deux lectures espacées, et on demande à la page si elle bouge.
exports.deborde = async (c, cadre) => { const f = cadre || c.p; await exports.calme(c.p, 300); const un = await f.evaluate(() => document.documentElement.scrollWidth); await c.p.waitForTimeout(700);
  return f.evaluate(({ L, un }) => { const sw = document.documentElement.scrollWidth, y = scrollY; scrollTo(9999, y); const bouge = scrollX; scrollTo(0, y);
    let coupable = ''; if (bouge > 0) { for (const e of document.querySelectorAll('body *')) { const r = e.getBoundingClientRect(); if (r.right > L + 1 && r.width > 0 && r.width <= L * 1.5 && getComputedStyle(e).position !== 'fixed') { coupable = e.tagName + '.' + String(e.className).slice(0, 50) + ' « ' + (e.textContent || '').trim().slice(0, 40) + ' » droite=' + Math.round(r.right); break; } } }
    return { largeur: L, premiere: un, seconde: sw, bouge, coupable }; }, { L: c.largeur, un }); };
// cibles au doigt sous 44 px (zone qui RÉPOND : l'élément ou son parent cliquable), champs sous 16 px (zoom d'iOS), textes écrasés
exports.doigts = (f, zone) => f.evaluate(z => { const R = document.querySelector(z || '#contenu') || document.body, petits = [], champs = [], ecrases = [];
  for (const e of R.querySelectorAll('button, a, [role=button], summary, input[type=checkbox], input[type=radio]')) { if (!e.offsetParent || e.disabled) continue; const r = e.getBoundingClientRect(); if (r.width < 2) continue;
    const zc = e.closest('label, .ligne-clic, [data-go]') || e, rz = zc.getBoundingClientRect(); if (Math.max(r.height, rz.height) < 43.5 || Math.max(r.width, rz.width) < 43.5) petits.push((e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 40) + ' ' + Math.round(Math.max(r.width, rz.width)) + '×' + Math.round(Math.max(r.height, rz.height))); }
  for (const e of R.querySelectorAll('input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=file]):not([type=hidden]), select, textarea')) { if (!e.offsetParent) continue; const fs = parseFloat(getComputedStyle(e).fontSize); if (fs < 16) champs.push((e.getAttribute('aria-label') || e.placeholder || e.name || e.id || e.tagName) + ' ' + fs + 'px'); }
  for (const e of R.querySelectorAll('h1,h2,h3,p,span,b,strong,div,td,label')) { if (!e.offsetParent || e.children.length) continue; const t = (e.textContent || '').trim(); if (t.length < 24) continue; const r = e.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(e); const lignes = new Set([...rg.getClientRects()].filter(q => q.width > 0).map(q => Math.round(q.top / 4))).size;   /* les lignes se comptent sur les rectangles du TEXTE : la hauteur d'une cellule de tableau est celle de sa RANGÉE (une voisine sur deux lignes la double) et faisait « 4 lignes » pour un libellé sur deux (19/11) */ if (lignes >= 4 && t.length / lignes < 12) ecrases.push('« ' + t.slice(0, 40) + ' » ' + Math.round(r.width) + 'px sur ' + lignes + ' lignes'); }
  return { petits: [...new Set(petits)].slice(0, 30), champs: [...new Set(champs)].slice(0, 30), ecrases: ecrases.slice(0, 20) }; }, zone);
// capture à REGARDER (outil Read) ; pleine:true pour la page entière. Les captures vont dans un dossier temporaire, jamais dans le dépôt.
// ⛔ une capture « page entière » d'un écran de 30 000 px coûte des centaines de Mo de mémoire : au-delà de 6 000 px on coupe, et on le dit.
/* ⛔ Une capture « page entière » fait perdre au navigateur piloté son émulation tactile : après elle, `(pointer:coarse)` et
   `(hover:none)` valent FAUX et toute règle écrite pour le doigt disparaît — une sonde de cibles tactiles mesurée après une
   capture pleine accusait donc à tort le code (campagne planning, 17 novembre 2026). On la rétablit. */
const retoucher = async c => { if (!c.doigt) return; try { /* la session reste ouverte : un réglage d'émulation CDP tombe avec elle */ c._cdTactile = c._cdTactile || await c.p.context().newCDPSession(c.p); await c._cdTactile.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 }); } catch (e) { console.log('  · émulation tactile non rétablie : ' + e.message); } };
exports.capture = async (c, fichier, pleine) => { fs.mkdirSync(path.dirname(fichier), { recursive: true });
  if (pleine) { try { return await captureBrute(c, fichier, pleine); } finally { await retoucher(c); } }
  return captureBrute(c, fichier, pleine); };
const captureBrute = async (c, fichier, pleine) => {
  if (pleine) { const h = await c.p.evaluate(() => Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0));
    if (h > 6000) { console.log('  · capture coupée à 6 000 px (la page en fait ' + h + ') : fais défiler pour voir la suite'); await c.p.screenshot({ path: fichier, clip: { x: 0, y: 0, width: c.largeur, height: 6000 }, fullPage: true }); return fichier; } }
  await c.p.screenshot({ path: fichier, fullPage: !!pleine }); return fichier; };

// ── comptes ───────────────────────────────────────────────────────────────────────────────────────────────
let ok = 0, ko = 0; const echecs = [];
exports.v = (nom, cond, detail) => { const d = detail === undefined ? undefined : (typeof detail === 'string' ? detail : JSON.stringify(detail)); if (cond) { ok++; console.log('  ✓', nom); } else { ko++; echecs.push(nom + (d !== undefined ? ' :: ' + d : '')); console.log('  ✗', nom, d !== undefined ? '→ ' + d : ''); } return !!cond; };
exports.bilan = () => { console.log(`\n== ${ok} ✓ · ${ko} ✗`); echecs.forEach(e => console.log(' ✗', e)); return ko; };
exports.cents = t => { const s = String(t).replace(/[\s  ]/g, '').replace('−', '-').replace('€', '').replace(',', '.'); return Math.round(parseFloat(s) * 100); };
exports.attendre = (p, f, ms, arg) => p.waitForFunction(f, arg, { timeout: ms || 8000 }).then(() => true, () => false);
