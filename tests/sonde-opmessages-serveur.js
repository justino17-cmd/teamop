/* ══ SONDE DE BOUT EN BOUT — OP MESSAGES SERVI, À DEUX PERSONNES, DANS DE VRAIS NAVIGATEURS ═══════════════════════════════════════════
   Justin : « je veux que tu testes tout de A à Z d'OP MESSAGES, elle doit fonctionner parfaitement ». `tests/test-911.js` fait parler le module de données de
   la page au vrai service ; cette sonde fait jouer la VRAIE PAGE SERVIE (`server-msg/public/`, générée par `scripts/opmsg-public.js` depuis l'interface de Justin)
   par deux personnes — chacune dans son navigateur, avec ses cookies — contre le VRAI service (`server-msg/index.js`, démarré ici sur un port libre) et un OP GESTION
   factice qui tient les accès bêta que la Tour coupe et rouvre. Tout se passe sur 127.0.0.1.

   Deux couples d'appareils, jour puis nuit :
     · Alice, iPhone 393 (le doigt : toucher, appui long) — Bruno, bureau 1440 (la souris : clic, clic droit) — Eve, bureau 1024 rejoint un groupe par son lien ;
     · Chloé, Android 360 (nuit) — Dave, iPad 820 (nuit) — Fred, iPhone 393 (nuit) rejoint un groupe par son lien.
   Chaque couple joue TOUT le parcours : connexion et refus de la porte, contacts par lien, conversation (envoi, « Lu », non lus, bannière, frappe, présence), actions
   sur un message (réagir, répondre, copier, modifier, supprimer pour moi / pour tous), groupes (créer, infos, admins, lien, retrait, sortie), réseau coupé puis rendu,
   chaque refus du service (401, 403, 404, 409, 410, 413, 429 avec Retry-After, 503, réseau) DIT à l'écran et effacé par la réussite suivante, ce qui est « bientôt »
   (appels, réunions — les pièces ont leur sonde : `tests/sonde-opmessages-pieces.js`), l'accès coupé dans la Tour, une autre personne dans le même navigateur, la déconnexion (réussie ET ratée), l'injection de HTML.

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION (CLAUDE.md : « une assertion sur un ensemble vide passe et ne prouve rien »).
   ⛔ UNE LARGEUR SE MESURE DEUX FOIS (deux trames, une lecture forcée, puis 700 ms plus tard) et CONTRE LA LARGEUR POSÉE du profil.
   ⛔ ON ATTEND AU GESTE, JAMAIS AU CHRONOMÈTRE : chaque attente porte sur ce qu'on doit VOIR (waitForFunction), avec un plafond qui dit ce qui manquait.
   ⛔ UNE MESURE QUI ÉCHOUE DIT POURQUOI : chaque ✗ nomme ce qui a été lu à la place.

   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-serveur.js
              … --rapide           (le couple iPhone + bureau, jour seulement — pour les mutations)
              CAPTURES=/dossier    (les deux navigateurs côte à côte à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const T = require('./outils-msg');
/* ⛔ PROFIL EN RUBRIQUES (6 octobre 2026) : une carte de réglage n'est montrée que dans SA rubrique — on la touche comme la personne le ferait (« Profil › Confidentialité ») */
const rubrique = async (S, sec) => { const pg = S.page || S; await pg.waitForFunction((x) => !!document.querySelector('[data-reg-sec="' + x + '"]'), sec, { timeout: 9000 }).catch(() => {}); await pg.evaluate((x) => { const b = document.querySelector('[data-reg-sec="' + x + '"]'); if (b) b.click(); }, sec); await pg.waitForFunction((x) => { const s = document.getElementById('reg-sec-' + x); return !!s && !s.hidden; }, sec, { timeout: 9000 }).catch(() => {}); };
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-serveur.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const RAPIDE = process.argv.includes('--rapide');
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];

const PROFILS = {
  iphone:  { nom: 'iPhone 393',  w: 393,  h: 852,  dpr: 2, mobile: true,  insets: { top: 54, bottom: 34 } },
  android: { nom: 'Android 360', w: 360,  h: 740,  dpr: 2, mobile: true,  insets: null },
  ipad:    { nom: 'iPad 820',    w: 820,  h: 1180, dpr: 1, mobile: true,  insets: null },
  bureau:  { nom: 'bureau 1440', w: 1440, h: 900,  dpr: 1, mobile: false, insets: null },
  petit:   { nom: 'bureau 1024', w: 1024, h: 768,  dpr: 1, mobile: false, insets: null },
};

const MOTS = {
  alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', eve: 'pw-eve-123456', chloe: 'pw-chloe-1234', dave: 'pw-dave-12345', fred: 'pw-fred-12345', coupe: 'pw-coupe-123',
};
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', eve: '<img src=x onerror=window.__pwn=1>Eve', chloe: 'Chloé Durand', dave: 'Dave Moreau', fred: 'Fred Lambert', coupe: 'Coupé' };

/* ── le câble qu'on arrache : un relais TCP entre un navigateur et le service. `couper()` détruit les connexions ouvertes (le flux temps réel casse VRAIMENT : un
   `setOffline` du navigateur ne rompt pas une connexion déjà établie) et refuse les nouvelles ; `rendre()` les accepte de nouveau. Il note la première ligne de
   chaque requête (et si elle porte `Last-Event-ID` / `depuis=`) : la reprise du flux se prouve sur ce que le service a REÇU.
   `lat.ms` : une LATENCE posée sur les requêtes ordinaires (pas sur le flux) — le bloc 13 bis s'en sert pour que la conversation d'un onglet neuf mette toujours du temps à se charger : l'attente qu'il
   fait de la conversation CHARGÉE (et non seulement ouverte) est alors prouvée à chaque passage, pas seulement les jours où la machine est lente. ── */
function relais(portCible) {
  const socks = new Set(), journal = []; let ouvert = true; const lat = { ms: 0 };
  const srv = net.createServer(c => {
    if (!ouvert) { c.destroy(); return; }
    const u = net.connect(portCible, '127.0.0.1');
    socks.add(c); socks.add(u);
    const fin = () => { c.destroy(); u.destroy(); socks.delete(c); socks.delete(u); };
    c.on('error', fin); u.on('error', fin); c.on('close', fin); u.on('close', fin);
    c.on('data', d => { if (c._muet) return; const t = d.toString('latin1'); const m = /^(GET|POST) (\S+) HTTP/.exec(t); if (m && /^\/api\/flux/.test(m[2])) c._flux = true; if (m) journal.push({ ligne: m[1] + ' ' + m[2], reprise: /last-event-id:\s*\d+/i.test(t) || /[?&]depuis=\d+/.test(m[2]) }); if (c._flux || !lat.ms) u.write(d); else setTimeout(() => { try { u.write(d); } catch (e) { /* fermé entre-temps */ } }, lat.ms); });
    u.on('data', d => { if (c._muet) return; c.write(d); });   // `_muet` : la connexion reste OUVERTE et ne livre plus rien (ni octet, ni erreur)
  });
  return new Promise(ok => srv.listen(0, '127.0.0.1', () => ok({
    port: srv.address().port, base: 'http://127.0.0.1:' + srv.address().port, journal, lat,
    couper() { ouvert = false; for (const x of Array.from(socks)) x.destroy(); },
    rendre() { ouvert = true; },
    /* les connexions ouvertes en ce moment deviennent « à moitié mortes » : un câble débranché, un NAT expiré — aucune erreur, aucun octet. Les connexions NEUVES passent. */
    muet() { for (const x of Array.from(socks)) if (x._flux) x._muet = true; },   // le FLUX seulement : une connexion de requêtes ordinaires muette bloquerait aussi les appels qui rouvrent le flux (le navigateur réutilise ses connexions)
    fermer() { ouvert = false; for (const x of Array.from(socks)) x.destroy(); try { srv.close(); } catch (e) { /* rien */ } },
  })));
}

/* ── l'ouverture d'une page : un contexte NEUF (ses propres cookies) par personne ── */
async function ouvrir(b, base, pf, o) {
  o = o || {};
  const ctx = o.ctx || await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile,
    colorScheme: o.nuit ? 'dark' : 'light', reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris',
    permissions: ['clipboard-read', 'clipboard-write'], baseURL: base,
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, nom: o.nom || '?', base, erreurs: [], console: [], reseau: [], gestes: 0, media: 0, fichiers: 0 };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 220)); });
  page.on('request', r => S.reseau.push(r.url()));
  page.on('filechooser', () => { S.fichiers++; });
  /* le micro et la caméra : la version servie n'en demande JAMAIS (« bientôt ») — on compte les demandes */
  await page.addInitScript(() => {
    window.__media = 0; window.__ev = [];
    for (const t of ['pointerdown', 'pointerup', 'pointercancel', 'contextmenu', 'click', 'touchstart', 'touchend', 'touchcancel']) window.addEventListener(t, e => { const c = e.target && e.target.id ? '#' + e.target.id : (e.target && e.target.className) || (e.target && e.target.tagName); window.__ev.push(t + ':' + String(c).slice(0, 30)); if (window.__ev.length > 40) window.__ev.shift(); }, true);
    try { if (navigator.mediaDevices) { const g = navigator.mediaDevices.getUserMedia; navigator.mediaDevices.getUserMedia = function () { window.__media++; return g ? g.apply(this, arguments) : Promise.reject(new Error('absent')); }; } } catch (e) { /* rien */ }
  });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}

/* ── lectures et attentes (au geste) ── */
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent : null; }, sel);
const visible = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); if (!e || e.hidden) return false; const r = e.getClientRects(); return r.length > 0 && getComputedStyle(e).visibility !== 'hidden' && getComputedStyle(e).display !== 'none'; }, sel);
const nombre = (S, sel) => S.page.evaluate(s => document.querySelectorAll(s).length, sel);
/* attend que `fn(arg)` (exécutée DANS la page) rende vrai ; rend la dernière valeur lue (pour dire ce qu'on a vu à la place) */
async function attendre(S, fn, arg, ms) {
  try { await S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }); return true; } catch (e) { return false; }
}
const texteVu = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : '(absent)'; }, sel);
async function verifier(titre, S, fn, arg, ms, ceQuOnVoit) {
  const ok = await attendre(S, fn, arg, ms);
  if (ok) vrai(titre, true);
  else { const vu = ceQuOnVoit ? await ceQuOnVoit().catch(() => '?') : ''; v(titre, 'non vu à temps (' + (ms || 9000) + ' ms)' + (vu ? ' ; vu : ' + vu : ''), 'vu'); }
  return ok;
}
/* le texte d'un sélecteur CONTIENT (insensible à la casse et aux espaces multiples) */
const contient = (sel, mot) => ({ sel, mot: String(mot).toLowerCase() });
const FN_CONTIENT = a => { const e = document.querySelector(a.sel); return !!e && !e.hidden && e.textContent.replace(/\s+/g, ' ').toLowerCase().includes(a.mot); };
const FN_ABSENT = s => { const e = document.querySelector(s); return !e || e.hidden || !e.textContent.trim(); };
const attendreTexte = (titre, S, sel, mot, ms) => verifier(titre, S, FN_CONTIENT, contient(sel, mot), ms, () => texteVu(S, sel));

/* ── les gestes : le doigt pour un téléphone, la souris pour un bureau ── */
async function toucher(S, sel, o) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  try { if (S.pf.mobile) await loc.tap(o || {}); else await loc.click(o || {}); }
  catch (e) {
    const d = await S.page.evaluate(x => { const l = Array.from(document.querySelectorAll(x)); return l.length + ' trouvé(s), ' + l.map(e => (e.hidden ? 'hidden' : 'non masqué') + '/' + e.getClientRects().length + ' boîtes').join(', ') + ' ; saisie=«' + (document.getElementById('saisie') || {}).value + '» ; avis=«' + (document.getElementById('avis') || {}).textContent + '»'; }, sel.split(',')[0]).catch(() => '?');
    throw new Error(String(e.message).split('\n')[0] + ' — ' + sel.slice(0, 80) + ' — ' + d);
  }
}
async function saisir(S, sel, texte) { const loc = S.page.locator(sel); await loc.fill(texte); S.gestes++; }
async function retourListe(S) {
  if (await visible(S, '#conv-retour')) { await toucher(S, '#conv-retour'); await S.page.waitForFunction(() => document.documentElement.dataset.conv !== '1', null, { timeout: 4000 }).catch(() => {}); }
}
async function onglet(S, vue) { if (vue === 'reglages' && await S.page.evaluate(() => { const s = document.getElementById('vue-reglages'); return !!s && !s.hidden && s.getClientRects().length > 0; })) return;   /* déjà dans le Profil (une rubrique ouverte) : « Profil » n'est plus un onglet (7 octobre 2026), et la rubrique se choisit d'ici */ await retourListe(S); await toucher(S, 'a[data-vue="' + vue + '"]'); await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 5000 }).catch(() => {}); }
async function appuiLong(S, sel) {
  await S.page.locator(sel).first().scrollIntoViewIfNeeded().catch(() => {});
  const bb = await S.page.locator(sel).first().boundingBox(); if (!bb) throw new Error('appui long : ' + sel + ' sans boîte');
  const c = await S.ctx.newCDPSession(S.page), x = bb.x + bb.width / 2, y = bb.y + bb.height / 2;
  await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  await dormir(1000);                                    // le menu s'ouvre à 480 ms : le doigt se lève 520 ms APRÈS son ouverture (passé les 350 ms où la page ignore tout clic) — le clic du relâcher tombe sur le fond
  await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await c.detach().catch(() => {}); S.gestes++;
}
async function envoyerTexte(S, texte) {
  await saisir(S, '#saisie', texte);
  await S.page.waitForFunction(() => !document.getElementById('envoyer').hidden, null, { timeout: 3000 }).catch(() => {});
  await toucher(S, '#envoyer');
}
/* le message dont la BULLE porte ce texte (pas une réponse qui le CITE) */
const bulle = (S, texte) => S.page.locator('#conv-messages .msg').filter({ has: S.page.locator('.bulle', { hasText: texte }) });
async function menuDe(S, texte, moyen) {
  if (moyen === 'plus' && S.pf.mobile) moyen = 'long';          // le bouton « ⋯ » n'existe que là où il y a un survol (@media (hover: hover)) : au doigt, c'est l'appui long
  const m = bulle(S, texte).last();
  const mid = await m.getAttribute('data-mid');
  if (moyen === 'long') await appuiLong(S, '.msg[data-mid="' + mid + '"] .bulle');
  else if (moyen === 'droit') { await m.locator('.bulle').click({ button: 'right' }); S.gestes++; }
  else await toucher(S, '.msg[data-mid="' + mid + '"] .msg-plus');
  const ouvert = await S.page.waitForFunction(() => !document.getElementById('menu-fond').hidden, null, { timeout: 3000 }).then(() => true, () => false);
  if (!ouvert) {
    if (DOSSIER_CAPTURES) { try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, 'echec-menu-' + S.nom.replace(/\W+/g, '') + '.png') }); } catch (e) { /* facultatif */ } }
    throw new Error('le menu ne s\'est pas ouvert (' + moyen + ') ; avis=«' + (await lire(S, '#avis')) + '» visible=' + (await visible(S, '#avis')) + ' ; événements vus : ' + (await S.page.evaluate(() => window.__ev.slice(-8).join(' ')).catch(() => '?')));
  }
  await dormir(400);                                       // la page ignore un clic dans les 350 ms qui suivent l'ouverture (le relâcher d'un appui long)
  return mid;
}
const actionMenu = (S, act) => toucher(S, '#menu-msg [data-menu="' + act + '"]');
async function connecter(S, login) {
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]);
  await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
}
async function ouvrirPage(S, chemin) {
  await S.page.goto('about:blank'); await S.page.goto(S.base + (chemin || '/'));
}
async function ouvrirConvAvec(S, nom) {
  await onglet(S, 'messages');
  await toucher(S, '#liste-conv .conv:has(.conv-nom:text-is("' + nom + '"))');
  await S.page.waitForFunction(n => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(n), nom, { timeout: 7000 });
}
async function enligne(S) { await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 }); }
async function lireLiens(S) { return S.page.evaluate(() => { const c = document.querySelector('#ct-lien-champ, #ci-lien-champ'); return c ? c.value : null; }); }

/* ── la largeur, deux fois, contre la largeur POSÉE ── */
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    const dep = document.documentElement.scrollWidth, cl = document.documentElement.clientWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep, cl, sx, n: document.querySelectorAll('body *').length };
  });
  const a = await mesure(); await dormir(700); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1;
  S.population = (S.population || 0) + b.n;
  if (b.sx > 0 || b.dep > S.pf.w + 1) { S.debordements = S.debordements || []; S.debordements.push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx + ' (1re mesure ' + a.dep + ')'); }
}

/* ── les captures : les deux navigateurs côte à côte ── */
async function capturer(b, nom, personnes) {
  if (!DOSSIER_CAPTURES) return;
  fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true });
  const imgs = [];
  for (const S of personnes) imgs.push({ nom: S.nom + ' · ' + S.pf.nom, data: (await S.page.screenshot({ type: 'png' })).toString('base64'), w: S.pf.w, h: S.pf.h });
  const ctx = await b.newContext({ viewport: { width: Math.min(2400, imgs.reduce((s, i) => s + i.w, 0) + 60 * imgs.length), height: Math.max(...imgs.map(i => i.h)) + 70 } });
  const p = await ctx.newPage();
  await p.setContent('<body style="margin:0;background:#1c1c1e;color:#fff;font:14px system-ui;display:flex;gap:24px;padding:16px;align-items:flex-start">' +
    imgs.map(i => '<figure style="margin:0"><figcaption style="margin-bottom:6px">' + i.nom.replace(/</g, '&lt;') + '</figcaption><img style="width:' + i.w + 'px;border-radius:12px;display:block" src="data:image/png;base64,' + i.data + '"></figure>').join('') + '</body>');
  await p.waitForTimeout(200);
  await p.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '.png'), fullPage: true });
  await ctx.close();
}

/* ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function couple(b, env, cfg) {
  const { og, svc } = env, base = svc.base, tag = cfg.tag;
  const [la, lb, lc] = cfg.logins;
  const nomA = NOMS[la], nomB = NOMS[lb];
  const prenomB = nomB.split(' ')[0], prenomC = NOMS[lc].replace(/^.*>/, '').split(' ')[0];
  console.log('\n══ ' + cfg.titre + ' ══');
  const baseB = env.relais ? env.relais.base : base;       // B parle au service PAR le relais : on peut lui arracher le câble
  const A = await ouvrir(b, base, cfg.pa, { nuit: cfg.nuit, nom: nomA });
  const B = await ouvrir(b, baseB, cfg.pb, { nuit: cfg.nuit, nom: nomB });
  const C = await ouvrir(b, base, cfg.pc, { nuit: cfg.nuit, nom: NOMS[lc] });
  const tous = [A, B, C];
  const bloc = async (titre, fn) => {
    console.log('\n' + titre);
    try { await fn(); } catch (e) { v(titre + ' : le bloc est allé jusqu\'au bout', 'EXCEPTION : ' + String(e && e.message || e).split('\n').filter(Boolean).slice(0, 4).join(' | ').slice(0, 520), 'sans exception'); }
  };
  const T1 = tag + '-un', T2 = tag + '-deux', T3 = tag + '-trois';

  await bloc('1. La porte : la page sans session, les refus dits, la réussite qui les efface', async () => {
    await A.page.goto(base + '/');
    await verifier('sans session : l\'écran de connexion est montré, l\'application ne l\'est pas', A, () => { const c = document.getElementById('connexion'), a = document.getElementById('app'); return !c.hidden && a.hidden && c.getClientRects().length > 0; }, null, 8000);
    vrai('le titre de l\'onglet dit « Connexion — OP MESSAGES »', /Connexion — OP MESSAGES/.test(await A.page.title()));
    vrai('population : les deux champs et le bouton existent', (await nombre(A, '#c-login, #c-pass, #c-entrer')) === 3);
    await largeur(A, 'connexion');
    if (cfg.pa.mobile) {
      const tailles = await A.page.evaluate(() => ['c-login', 'c-pass'].map(i => parseFloat(getComputedStyle(document.getElementById(i)).fontSize)));
      vrai('au doigt : les champs de connexion font 16 px au moins (iOS zoomerait la page sinon) — ' + tailles.join(', '), tailles.every(x => x >= 16));
    }
    await toucher(A, '#c-entrer');
    await attendreTexte('champs vides : « Saisis l\'identifiant et le mot de passe »', A, '#connexion-erreur', 'saisis l\'identifiant', 3000);
    await saisir(A, '#c-login', la); await saisir(A, '#c-pass', 'pas-le-bon'); await toucher(A, '#c-entrer');
    await attendreTexte('un mauvais mot de passe : le refus est dit (identifiant ou mot de passe incorrect)', A, '#connexion-erreur', 'incorrect', 6000);
    vrai('et le mot de passe saisi n\'est pas gardé dans le champ', (await A.page.inputValue('#c-pass')) === '');
    /* ⛔ le refus d'avant ne survit pas à l'essai suivant : il s'efface DÈS QU'ON REVALIDE, pas quand la réponse arrive (une réponse lente laissait l'ancien verdict à l'écran) */
    await A.page.route('**/api/beta/entrer', async r => { await dormir(1200); await r.continue(); });
    await saisir(A, '#c-pass', 'encore-faux'); await toucher(A, '#c-entrer');
    await dormir(350);
    v('essai suivant EN COURS (réponse retenue 1,2 s) : l\'ancien refus a DÉJÀ disparu de l\'écran', await visible(A, '#connexion-erreur'), false);
    await attendreTexte('… puis l\'essai suivant écrit SON verdict', A, '#connexion-erreur', 'incorrect', 6000);
    await A.page.unroute('**/api/beta/entrer');
    og.mode = 'panne';
    await saisir(A, '#c-pass', MOTS[la]); await toucher(A, '#c-entrer');
    await verifier('OP GESTION injoignable (503) : la phrase REMPLACE le refus d\'avant (« momentanément indisponible »), elle ne s\'y ajoute pas', A, () => { const t = document.getElementById('connexion-erreur').textContent; return /momentanément indisponible/.test(t) && !/incorrect/.test(t); }, null, 8000, () => texteVu(A, '#connexion-erreur'));
    og.mode = 'normal';
    await saisir(A, '#c-login', 'coupe'); await saisir(A, '#c-pass', MOTS.coupe); await toucher(A, '#c-entrer');
    await attendreTexte('un accès COUPÉ dans la Tour : « Cet accès a été coupé »', A, '#connexion-erreur', 'coupé', 6000);
    og.mode = '429';
    await saisir(A, '#c-login', la); await saisir(A, '#c-pass', MOTS[la]); await toucher(A, '#c-entrer');
    await attendreTexte('trop d\'essais (verrou d\'OP GESTION) : la phrase le dit', A, '#connexion-erreur', 'verrouill', 6000);
    og.mode = 'normal';
    await saisir(A, '#c-pass', MOTS[la]); await toucher(A, '#c-entrer');
    await enligne(A);
    vrai('la réussite ouvre l\'application : le nom de la personne est là (« ' + (await lire(A, '#moi-nom')) + ' ») et l\'écran de connexion est caché', (await lire(A, '#moi-nom')).includes(nomA.split(' ')[0]) && !(await visible(A, '#connexion')));
    vrai('et AUCUN refus d\'avant ne survit (la page repart d\'une page neuve : le champ d\'erreur est vide)', ((await lire(A, '#connexion-erreur')) || '') === '' || !(await visible(A, '#connexion-erreur')));
    await B.page.goto(baseB + '/'); await connecter(B, lb);
    await C.page.goto(base + '/'); await connecter(C, lc);
    const ck = (await A.ctx.cookies()).find(c => c.name === 'opm');
    vrai('le cookie de session existe, HttpOnly, SameSite, sans date de fin lointaine : la page ne peut pas le lire', !!ck && ck.httpOnly === true && /Lax|Strict/.test(ck.sameSite));
    vrai('document.cookie ne montre pas la session', !/opm=/.test(await A.page.evaluate(() => document.cookie)));
    vrai('aucun jeton dans localStorage ni sessionStorage', await A.page.evaluate(v0 => { try { const t = JSON.stringify([Object.entries(localStorage), Object.entries(sessionStorage)]); return !t.includes(v0) && !/[0-9a-f]{40,}/.test(t); } catch (e) { return true; } }, ck ? ck.value : 'x'));
    await capturer(b, tag + '-01-liste-vide', [A, B]);
  });

  await bloc('2. Les contacts : un lien d\'invitation (créé, ouvert, accepté), vu par les deux', async () => {
    vrai('liste vide : une phrase qui dit quoi faire (pas « Aucun résultat pour « » »)', /Aucune conversation pour l'instant/.test(await lire(A, '#liste-conv')));
    await onglet(A, 'reglages'); await rubrique(A, 'contacts');
    vrai('Réglages : le compte, « Ajouter un contact », « Se déconnecter »', (await nombre(A, '#reg-contact, #reg-sortir')) === 2 && (await lire(A, '#vue-reglages')).includes(nomA));
    await largeur(A, 'réglages');
    await toucher(A, '#reg-contact');
    await verifier('la feuille « Contacts » s\'ouvre', A, () => !document.getElementById('info-corps').hidden && !!document.querySelector('[data-act="lien-creer"]'), null, 5000);
    await largeur(A, 'feuille contacts');
    await toucher(A, '[data-act="lien-creer"]');
    await verifier('« Créer un lien » : le lien d\'invitation apparaît', A, () => !!document.getElementById('ct-lien-champ') && /#lien=/.test(document.getElementById('ct-lien-champ').value), null, 5000);
    const lien = await lireLiens(A);
    vrai('le lien est une adresse de la page + #lien=<code> (le code est dans le fragment : il ne part jamais au serveur)', /^http:\/\/127\.0\.0\.1:\d+\/#lien=[A-Za-z0-9_-]{20,64}$/.test(lien || ''));
    /* B ouvre le lien comme on le ferait depuis un message : une page neuve */
    await ouvrirPage(B, '/' + lien.slice(lien.indexOf('#')));
    await enligne(B);
    await verifier('B ouvre le lien : la feuille « Contacts » s\'ouvre d\'elle-même et lit l\'invitation (« ' + nomA + ' veut t\'ajouter »)', B, a => { const e = document.getElementById('ct-apercu'); return !!e && e.textContent.includes(a); }, nomA, 8000, () => texteVu(B, '#info-corps'));
    await toucher(B, '[data-act="lien-accepter"]');
    await verifier('B accepte : « Contact ajouté » et la conversation s\'ouvre', B, () => !!document.querySelector('#conv-ecran') && document.documentElement.dataset.conv === '1', null, 8000);
    await verifier('A voit B arriver dans ses contacts SANS recharger (la feuille de A est restée ouverte)', A, n => { const e = document.getElementById('ct-liste'); return !!e && e.textContent.includes(n); }, nomB, 8000, () => texteVu(A, '#ct-liste'));
    await toucher(A, '#g-annuler');
  });

  await bloc('3. La conversation : envoi, bannière, non lu, « Lu », réponse sans bannière', async () => {
    await envoyerTexte(B, T1);
    await verifier('B voit sa bulle, « Envoyé »', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /Envoyé|Lu/.test(m.textContent); }, T1, 6000);
    await verifier('A reçoit une BANNIÈRE dans la page (« ' + nomB + ' », le texte) sans avoir rien demandé', A, a => { const n = document.getElementById('notif'); return n.classList.contains('on') && n.textContent.includes(a.nom) && n.textContent.includes(a.t); }, { nom: nomB, t: T1 }, 8000, () => texteVu(A, '#notif'));
    await onglet(A, 'messages');
    await verifier('A : la conversation est dans la liste, avec l\'aperçu et le POINT « non lu »', A, a => { const r = Array.from(document.querySelectorAll('#liste-conv .conv')).find(x => x.textContent.includes(a.nom)); return !!r && r.textContent.includes(a.t) && !!r.querySelector('.point'); }, { nom: nomB, t: T1 }, 8000, () => texteVu(A, '#liste-conv'));
    await largeur(A, 'liste avec une conversation');
    await toucher(A, '#liste-conv .conv');
    await verifier('A ouvre : le message est là', A, t => Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes(t)), T1, 6000);
    await verifier('le point « non lu » de A s\'éteint', A, () => !document.querySelector('#liste-conv .point'), null, 6000);
    await verifier('B voit « Lu hh:mm » sous sa bulle, EN DIRECT', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /Lu \d\d:\d\d/.test(m.textContent); }, T1, 8000, async () => await B.page.evaluate(() => (document.querySelector('.statut') || {}).textContent));
    await largeur(A, 'conversation'); await largeur(B, 'conversation');
    await envoyerTexte(A, T2);
    await verifier('B (conversation sous les yeux) reçoit la réponse', B, t => Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes(t)), T2, 8000);
    vrai('et SANS bannière : le message est déjà dans le fil', !(await B.page.evaluate(() => document.getElementById('notif').classList.contains('on') && /Alice/.test(document.getElementById('notif').textContent))));
    await verifier('A voit « Lu » sous sa réponse (B la lit)', A, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /Lu \d\d:\d\d/.test(m.textContent); }, T2, 8000);
    /* le même envoi deux fois dans le même instant ne poste pas deux messages */
    await saisir(A, '#saisie', T3);
    await A.page.evaluate(() => { const e = document.getElementById('envoyer'); e.click(); e.click(); });
    await verifier('A : deux clics dans le même instant ne postent QU\'UN message', A, t => Array.from(document.querySelectorAll('#conv-messages .msg')).filter(x => x.textContent.includes(t)).length === 1, T3, 6000);
    await dormir(600);
    vrai('B n\'en reçoit qu\'un', (await bulle(B, T3).count()) === 1);
    vrai('population : le fil de A porte les trois messages — ' + (await nombre(A, '#conv-messages .msg')) + ' bulles', (await nombre(A, '#conv-messages .msg')) >= 3);
    await capturer(b, tag + '-02-conversation', [A, B]);
  });

  await bloc('4. La frappe et la présence', async () => {
    /* la frappe ne part qu'UNE fois par 2,5 s : on tape comme une personne, une lettre toutes les 300 ms, jusqu'à ce que B voie les points */
    await A.page.locator('#saisie').click();
    let vu = false;
    for (let i = 0; i < 20 && !vu; i++) { await A.page.keyboard.type(i % 2 ? 'a' : 'e', { delay: 20 }); await dormir(300); vu = await B.page.evaluate(() => !!document.querySelector('#conv-messages .saisie-ind')); }
    vrai('A tape : B voit les trois points « est en train d\'écrire » (au bout de ' + 'quelques frappes)', vu);
    await capturer(b, tag + '-03-frappe', [A, B]);
    await A.page.locator('#saisie').fill(''); await A.page.evaluate(() => document.getElementById('saisie').blur());
    await verifier('A arrête (champ vidé, focus quitté) : les points s\'éteignent chez B', B, () => !document.querySelector('#conv-messages .saisie-ind'), null, 9000);
    await toucher(A, '#conv-titre');
    await verifier('les infos du contact disent « En ligne » (B est là)', A, () => /En ligne/.test((document.querySelector('#info-corps .info-sous') || {}).textContent || ''), null, 6000, () => texteVu(A, '#info-corps'));
    await largeur(A, 'infos d\'une conversation à deux');
    await toucher(A, '#g-annuler');
  });

  await bloc('5. Les actions sur un message : réagir, répondre, copier, modifier, supprimer', async () => {
    const M = tag + '-cible';
    await envoyerTexte(B, M);
    await verifier('A reçoit le message à agir', A, t => Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes(t)), M, 8000);
    await menuDe(A, M, cfg.pa.mobile ? 'long' : 'droit');
    vrai('le menu (' + (cfg.pa.mobile ? 'appui long au doigt' : 'clic droit') + ') propose six réactions et les actions d\'un message reçu (Répondre, Copier, Supprimer pour moi — pas Modifier)',
      (await nombre(A, '#menu-msg .menu-emoji')) === 6 && (await nombre(A, '#menu-msg [data-menu="repondre"]')) === 1 && (await nombre(A, '#menu-msg [data-menu="modifier"]')) === 0 && (await nombre(A, '#menu-msg [data-menu="supprimer-moi"]')) === 1);
    await capturer(b, tag + '-04-menu', [A, B]);
    await toucher(A, '#menu-msg .menu-emoji[data-menu-reac="👍"]');
    await verifier('A réagit 👍 : la pastille est chez A (la sienne) ET chez B', A, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && !!m.querySelector('.reac.moi'); }, M, 6000);
    await verifier('chez B la pastille 👍 paraît, sans être la sienne', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); const r = m && m.querySelector('.reac'); return !!r && r.textContent.includes('👍') && !r.classList.contains('moi'); }, M, 8000);
    await toucher(A, '#conv-messages .msg:has-text("' + M + '") .reac');
    await verifier('A retouche la pastille : la réaction se retire, chez les deux', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && !m.querySelector('.reac'); }, M, 8000);
    await menuDe(A, M, 'plus');
    await actionMenu(A, 'repondre');
    await verifier('« Répondre » : la bande de contexte nomme ' + prenomB, A, a => !document.getElementById('compo-contexte').hidden && document.getElementById('compo-contexte-texte').textContent.includes(a), prenomB, 4000);
    const R = tag + '-reponse';
    await envoyerTexte(A, R);
    await verifier('la réponse porte la CITATION du message, chez B', B, a => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(a.r)); return !!m && !!m.querySelector('.citation') && m.querySelector('.citation').textContent.includes(a.m); }, { r: R, m: M }, 8000);
    await verifier('et chez A, qui n\'a plus de bande de contexte', A, a => !!Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(a)) && document.getElementById('compo-contexte').hidden, R, 6000);
    await menuDe(B, M, cfg.pb.mobile ? 'plus' : 'droit');
    await actionMenu(B, 'copier');
    await attendreTexte('« Copier le texte » : le petit mot dit « Texte copié »', B, '#mot', 'texte copié', 3000);
    await B.page.bringToFront();
    v('et le presse-papiers contient bien le texte', await B.page.evaluate(() => navigator.clipboard.readText().catch(e => 'illisible : ' + e.message)), M);
    const E = tag + '-modifiable';
    await envoyerTexte(A, E);
    await verifier('B reçoit', B, t => Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes(t)), E, 8000);
    await menuDe(A, E, 'plus');
    await actionMenu(A, 'modifier');
    vrai('« Modifier » : le champ reprend le texte et la bande dit « Modifier le message »', (await A.page.inputValue('#saisie')) === E && (await lire(A, '#compo-contexte-texte')).includes('Modifier le message'));
    const E2 = tag + '-corrige';
    await saisir(A, '#saisie', E2); await toucher(A, '#envoyer');
    await verifier('le texte change chez B, avec la mention « Modifié »', B, a => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(a)); return !!m && /Modifié/.test(m.textContent); }, E2, 8000);
    vrai('l\'ancien texte n\'est plus dans le fil de B', !(await lire(B, '#conv-messages')).includes('-modifiable'));
    /* supprimer pour moi : disparaît chez A seul */
    await menuDe(A, M, 'plus');
    await actionMenu(A, 'supprimer-moi');
    await verifier('« Supprimer pour moi » : le message disparaît chez A', A, t => !Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes(t) && !x.querySelector('.citation')), M, 6000, () => A.page.evaluate(() => Array.from(document.querySelectorAll('#conv-messages .msg')).map(x => x.textContent.replace(/\s+/g, ' ').slice(0, 45)).join(' | ')));
    await dormir(500);
    vrai('… et reste chez B', (await bulle(B, M).count()) >= 1);
    /* supprimer pour tous : deux touches, dites */
    await menuDe(A, E2, 'plus');
    await actionMenu(A, 'supprimer-tous');
    vrai('« Supprimer pour tous » demande une SECONDE touche, et la dit', /Supprimer ce message pour tous/.test(await lire(A, '#menu-msg')));
    await actionMenu(A, 'supprimer-tous');
    await verifier('chez B le message devient « Message supprimé »', B, () => /Message supprimé/.test(document.getElementById('conv-messages').textContent), null, 8000);
    await verifier('et chez A aussi', A, () => /Message supprimé/.test(document.getElementById('conv-messages').textContent), null, 6000);
    await menuDe(B, 'Message supprimé', cfg.pb.mobile ? 'plus' : 'droit');
    vrai('sur un message supprimé : plus de « Répondre » ni de « Copier »', (await nombre(B, '#menu-msg [data-menu="repondre"], #menu-msg [data-menu="copier"]')) === 0);
    await B.page.keyboard.press('Escape'); await B.page.waitForFunction(() => document.getElementById('menu-fond').hidden, null, { timeout: 3000 }).catch(() => {});
  });

  await bloc('6. Un texte venu d\'un tiers ne devient jamais du code', async () => {
    const PIEGE = '<img src=x onerror="window.__pwn=1">&<b>gras</b>' + tag;
    await envoyerTexte(B, PIEGE);
    await verifier('A reçoit le texte piégé', A, t => (document.getElementById('conv-messages').textContent || '').includes('gras</b>' + t), tag, 8000, () => A.page.evaluate(() => document.getElementById('conv-messages').textContent.slice(-300)));
    const etat = await A.page.evaluate(t => ({ img: document.querySelectorAll('#conv-messages img').length, gras: document.querySelectorAll('#conv-messages .bulle b').length, pwn: window.__pwn || null, texte: Array.from(document.querySelectorAll('#conv-messages .bulle')).some(x => x.textContent.includes('<img src=x onerror="window.__pwn=1">&<b>gras</b>' + t)) }), tag);
    v('population : la bulle porte le texte BRUT (balises visibles comme des lettres)', etat.texte, true);
    v('aucune image injectée, aucune balise en gras, aucun script exécuté chez A', [etat.img, etat.gras, etat.pwn], [0, 0, null]);
  });

  await bloc('7. Un groupe : créer depuis ses contacts, écrire, infos, admins, lien, retrait, sortie', async () => {
    const G = 'Chantier ' + tag;
    await onglet(A, 'messages');
    await toucher(A, '#btn-plus'); await toucher(A, '[data-nd-act="groupe"]');
    await verifier('la feuille « Nouveau groupe » montre « Inviter par un lien » et les contacts', A, () => !document.getElementById('feuille').hidden && !!document.querySelector('#g-contacts [data-lien]') && document.querySelectorAll('#g-contacts .contact').length >= 1, null, 5000);
    await largeur(A, 'nouveau groupe');
    vrai('« Créer » est grisé tant que personne n\'est choisi', (await A.page.getAttribute('#g-creer', 'aria-disabled')) === 'true');
    await toucher(A, '#g-contacts .contact[data-id]');
    vrai('un contact coché : « 1 / 1 » et « Créer » s\'allume', /1 \/ 1/.test(await lire(A, '#g-compteur')) && (await A.page.getAttribute('#g-creer', 'aria-disabled')) === 'false');
    await saisir(A, '#g-nom', G);
    await toucher(A, '#g-creer');
    await verifier('le groupe paraît dans la liste de A', A, g => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(x => x.textContent === g), G, 8000);
    await verifier('B en est PRÉVENU par une bannière et le voit dans sa liste', B, g => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(x => x.textContent === g), G, 9000);
    await capturer(b, tag + '-05-groupe-cree', [A, B]);
    await ouvrirConvAvec(A, G);
    await envoyerTexte(A, tag + '-g1');
    await ouvrirConvAvec(B, G);
    await verifier('B ouvre le groupe : le message, avec le NOM de l\'auteur au-dessus', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && !!m.querySelector('.msg-nom'); }, tag + '-g1', 8000);
    await envoyerTexte(B, tag + '-g2');
    await verifier('A reçoit la réponse du groupe', A, t => (document.getElementById('conv-messages').textContent || '').includes(t), tag + '-g2', 8000);
    /* infos */
    await toucher(A, '#conv-titre');
    await verifier('les infos du groupe : deux membres, A est « Admin »', A, () => /Groupe · 2 membres/.test((document.querySelector('#info-corps .info-sous') || {}).textContent || '') && !!document.querySelector('#info-corps .badge-admin'), null, 6000, () => texteVu(A, '#info-corps'));
    await largeur(A, 'infos du groupe');
    const rangees = await A.page.evaluate(() => {
      const rangs = Array.from(document.querySelectorAll('#info-corps .contact.avec-actions'));
      const chevauche = (a, b) => a.right > b.left + 1 && b.right > a.left + 1 && a.bottom > b.top + 1 && b.bottom > a.top + 1;
      return { n: rangs.length, chev: rangs.filter(r => { const g = document.createRange(); g.selectNodeContents(r.querySelector('.contact-nom')); return chevauche(g.getBoundingClientRect(), r.querySelector('.contact-actions').getBoundingClientRect()); }).length };
    });
    vrai('population : ' + rangees.n + ' membre(s) gérable(s) dans les infos du groupe', rangees.n >= 1);
    v('0 membre dont le NOM passe sous ses boutons « Nommer admin » / « Retirer » (le texte réel est mesuré, pas sa boîte)', rangees.chev, 0);
    await capturer(b, tag + '-06-infos-groupe', [A, B]);
    await toucher(A, '[data-act="annonces"]');
    await verifier('« Seuls les admins écrivent » : chez B le champ est fermé et la phrase le dit', B, () => !document.getElementById('compo-ferme').hidden || document.getElementById('compo').hidden, null, 8000, () => texteVu(B, '#compo-ferme'));
    await toucher(A, '[data-act="annonces"]');
    await verifier('rouvert : B peut de nouveau écrire', B, () => !document.getElementById('compo').hidden && document.getElementById('compo-ferme').hidden, null, 8000);
    await toucher(A, '[data-act="ephemeres"]');
    await verifier('« Messages éphémères » : la valeur change (24 h) et la feuille la redit', A, () => /h|jour|min/.test(((document.querySelector('[data-act="ephemeres"] .reglage-valeur') || {}).textContent) || ''), null, 5000);
    await toucher(A, '[data-act="ephemeres"]');
    /* lien de groupe : C le COLLE dans la feuille Contacts */
    await toucher(A, '[data-act="lien-groupe"]');
    await verifier('« Inviter par un lien » : le lien du groupe est montré', A, () => !!document.getElementById('ci-lien-champ') && /#lien=/.test(document.getElementById('ci-lien-champ').value), null, 5000);
    const lienG = await A.page.inputValue('#ci-lien-champ');
    const tLien = await A.page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('ci-lien-champ')).fontSize));
    vrai('⛔ D5 : le champ du lien de groupe fait 16 px au moins (iOS zoomerait la page sinon) — ' + tLien + ' px', tLien >= 16);
    await onglet(C, 'reglages'); await rubrique(C, 'contacts'); await toucher(C, '#reg-contact');
    const tCode = await C.page.evaluate(() => parseFloat(getComputedStyle(document.getElementById('ct-code')).fontSize));
    vrai('⛔ D5 : le champ « Coller le lien reçu » fait 16 px au moins — ' + tCode + ' px', tCode >= 16);
    /* ⛔ P4 : ce qu'on colle est TOUT ce qu'on a reçu — une phrase, des guillemets, un point final : le code se lit quand même */
    await saisir(C, '#ct-code', 'Voici le lien du groupe : « ' + lienG + ' ». À bientôt !'); await toucher(C, '[data-act="lien-lire"]');
    await verifier('C colle le lien : l\'aperçu dit « t\'invite dans le groupe « ' + G + ' » »', C, g => (document.getElementById('ct-apercu').textContent || '').includes(g), G, 6000, () => texteVu(C, '#info-corps'));
    await toucher(C, '[data-act="lien-accepter"]');
    await verifier('C accepte : « Tu as rejoint le groupe », la conversation du groupe s\'ouvre', C, () => document.documentElement.dataset.conv === '1', null, 8000);
    await verifier('A voit le groupe passer à TROIS membres, sans recharger', A, () => /Groupe · 3 membres/.test((document.querySelector('#info-corps .info-sous') || {}).textContent || ''), null, 9000, () => texteVu(A, '#info-corps'));
    vrai('le nom de C (« ' + NOMS[lc] + ' » — du HTML pour Eve) est montré comme du TEXTE, tel quel, dans la liste des membres de A', await A.page.evaluate(n => document.querySelectorAll('#info-corps img').length === 0 && document.getElementById('info-corps').textContent.includes(n), NOMS[lc]));
    await envoyerTexte(C, tag + '-g3');
    await verifier('C écrit : A et B le reçoivent', B, t => (document.getElementById('conv-messages').textContent || '').includes(t), tag + '-g3', 9000);
    /* admins et retrait */
    await toucher(A, '#info-corps .contact:has(.contact-nom:has-text("' + prenomB + '")) [data-act="admin"]');
    await toucher(B, '#conv-titre');
    await verifier('chez B les infos montrent maintenant « Ajouter au groupe » et « Retirer »', B, () => !!document.querySelector('#info-corps [data-act="retirer"]'), null, 8000, () => texteVu(B, '#info-corps'));
    await toucher(B, '#g-annuler');
    await toucher(A, '#info-corps .contact:has(.contact-nom:has-text("' + prenomC + '")) [data-act="retirer"]');
    await verifier('A retire C : C est averti (« Tu n\'es plus dans cette conversation »), revient à la liste, le groupe n\'y est plus', C, g => !Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(x => x.textContent === g) && document.documentElement.dataset.conv !== '1', G, 9000, () => texteVu(C, '#liste-conv'));
    await envoyerTexte(B, tag + '-apres');
    await dormir(1200);
    vrai('C ne reçoit plus RIEN de ce groupe après son retrait (ni le fil, ni la liste, ni la bannière)', !(await C.page.evaluate(t => document.body.innerText.includes(t), tag + '-apres')) && !(await C.page.evaluate(() => document.getElementById('notif').classList.contains('on') && /Chantier/.test(document.getElementById('notif').textContent))));
    await toucher(A, '#g-annuler');
    /* B quitte */
    await toucher(B, '#conv-titre');
    await toucher(B, '[data-act="quitter"]');
    vrai('« Quitter le groupe » demande une SECONDE touche et le dit', /Toucher encore/.test(await lire(B, '[data-act="quitter"]')));
    await toucher(B, '[data-act="quitter"]');
    await attendreTexte('B quitte : le petit mot dit « Tu as quitté le groupe »', B, '#mot', 'quitté', 4000);
    await verifier('A voit B partir (le fil dit qu\'il a quitté, ou le groupe n\'a plus qu\'un membre)', A, () => /quitt|retir|part/i.test(document.getElementById('conv-messages').textContent) || /1 membre/.test(document.body.innerText), null, 9000);
  });

  await bloc('8. Le réseau coupé puis rendu : file d\'attente, jamais de doublon, reprise du flux', async () => {
    await ouvrirConvAvec(B, nomA); await ouvrirConvAvec(A, nomB);
    const H = tag + '-horsligne';
    try {
    await B.ctx.setOffline(true);
    await verifier('B coupé : la bannière « hors ligne » paraît', B, () => !document.getElementById('hors-ligne').hidden, null, 12000, () => texteVu(B, '#hors-ligne'));
    await envoyerTexte(B, H);
    await verifier('B écrit hors ligne : la bulle dit « En attente de connexion… »', B, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /En attente de connexion/.test(m.textContent); }, H, 6000, async () => await B.page.evaluate(() => (document.querySelector('#conv-messages .msg:last-child') || {}).textContent));
    await capturer(b, tag + '-07-hors-ligne', [A, B]);
    for (const k of [1, 2, 3]) await envoyerTexte(A, tag + '-pendant' + k);
    } finally { await B.ctx.setOffline(false); }
    await verifier('réseau rendu : la bannière disparaît', B, () => document.getElementById('hors-ligne').hidden, null, 20000, () => texteVu(B, '#hors-ligne'));
    await verifier('le message mis en file part, UNE fois : A le reçoit', A, t => (document.getElementById('conv-messages').textContent || '').includes(t), H, 20000);
    await dormir(800);
    v('et A n\'en a reçu qu\'UN exemplaire (population : le message existe, puis son compte)', [(await bulle(A, H).count())], [1]);
    await verifier('B reprend le flux : les trois messages de A arrivent, dans l\'ordre', B, t => { const x = document.getElementById('conv-messages').textContent; const i = [1, 2, 3].map(k => x.indexOf(t + '-pendant' + k)); return i.every(n => n >= 0) && i[0] < i[1] && i[1] < i[2]; }, tag, 20000);
    await verifier('et la bulle de B n\'est plus « en attente »', B, () => !/En attente de connexion/.test(document.getElementById('conv-messages').textContent), null, 10000);
  });

  await bloc('8 bis. Le câble arraché (connexion TCP rompue net) : le flux casse, se rouvre tout seul et REPREND où il en était', async () => {
    if (!env.relais) { console.log('  — pas de relais : bloc sauté'); return; }
    const R = env.relais, flux0 = R.journal.filter(j => /\/api\/flux/.test(j.ligne)).length;
    await ouvrirConvAvec(B, nomA); await ouvrirConvAvec(A, nomB);
    vrai('population : B a ouvert son flux temps réel par le relais (' + flux0 + ' ouverture(s) vues)', flux0 >= 1);
    R.couper();
    await verifier('câble arraché : la bannière « connexion perdue » paraît chez B (le flux est VRAIMENT rompu)', B, () => !document.getElementById('hors-ligne').hidden, null, 15000, () => texteVu(B, '#hors-ligne'));
    for (const k of [1, 2, 3]) await envoyerTexte(A, tag + '-cable' + k);
    await dormir(600);
    R.rendre();
    await verifier('câble rendu : les trois messages arrivent chez B, dans l\'ordre', B, t => { const x = document.getElementById('conv-messages').textContent; const i = [1, 2, 3].map(k => x.indexOf(t + '-cable' + k)); return i.every(n => n >= 0) && i[0] < i[1] && i[1] < i[2]; }, tag, 30000, () => texteVu(B, '#conv-messages'));
    await dormir(500);
    v('et chacun UNE seule fois dans le fil de B (population : trois messages envoyés pendant la coupure)', await B.page.evaluate(t => [1, 2, 3].map(k => document.getElementById('conv-messages').textContent.split(t + '-cable' + k).length - 1), tag), [1, 1, 1]);
    await verifier('la bannière disparaît quand le flux est revenu', B, () => document.getElementById('hors-ligne').hidden, null, 20000, () => texteVu(B, '#hors-ligne'));
    const apres = R.journal.slice(flux0).filter(j => /\/api\/flux/.test(j.ligne));
    vrai('⛔ la reprise a DEMANDÉ LA SUITE (Last-Event-ID / depuis=) au lieu de tout recommencer — ' + apres.length + ' ouverture(s) après la coupure, dont ' + apres.filter(j => j.reprise).length + ' avec reprise', apres.some(j => j.reprise));
  });

  await bloc('8 ter. Une connexion qui se TAIT (ouverte, jamais une erreur) : la page le détecte, le dit, rouvre et rattrape', async () => {
    if (!env.relais) { console.log('  — pas de relais : bloc sauté'); return; }
    const R = env.relais, flux0 = R.journal.filter(j => /\/api\/flux/.test(j.ligne)).length;
    await ouvrirConvAvec(B, nomA); await ouvrirConvAvec(A, nomB);
    const S1 = tag + '-silence';
    R.muet();
    await envoyerTexte(A, S1);
    await dormir(1200);
    vrai('population : la connexion muette ne livre rien — 1,2 s après l\'envoi, B n\'a PAS le message et aucune bannière ne le dit (la page ne sait rien)', (await bulle(B, S1).count()) === 0 && !(await visible(B, '#hors-ligne')));
    await verifier('⛔ D3 : au bout de 2,5 pulsations (7,5 s ici, 50 s en production) la page DIT « connexion perdue » — alors qu\'aucune erreur n\'est venue', B, () => !document.getElementById('hors-ligne').hidden, null, 20000, () => texteVu(B, '#hors-ligne'));
    await verifier('⛔ D3 : elle rouvre le flux, REPREND où elle en était (Last-Event-ID) et le message manqué paraît', B, t => (document.getElementById('conv-messages').textContent || '').includes(t), S1, 25000, () => texteVu(B, '#conv-messages'));
    await verifier('et la bannière disparaît', B, () => document.getElementById('hors-ligne').hidden, null, 15000, () => texteVu(B, '#hors-ligne'));
    await dormir(400);
    v('un seul exemplaire du message chez B (population : il a été envoyé une fois)', await bulle(B, S1).count(), 1);
    vrai('⛔ la reprise a DEMANDÉ LA SUITE (Last-Event-ID / depuis=) au lieu de tout recommencer', R.journal.slice(flux0).filter(j => /\/api\/flux/.test(j.ligne)).some(j => j.reprise));
    await capturer(b, tag + '-10-silence-rattrape', [A, B]);
  });

  await bloc('9. Chaque refus du service est DIT, et la réussite suivante l\'efface', async () => {
    try {
    const reponse = (code, error, h, methode) => route => (methode && route.request().method() !== methode) ? route.continue() : route.fulfill({ status: code, contentType: 'application/json', headers: h || {}, body: JSON.stringify({ error }) });
    /* 429 sur l'envoi, avec Retry-After */
    await B.page.route('**/api/conversations/*/messages', reponse(429, 'quota_atteint', { 'Retry-After': '40' }, 'POST'));
    await envoyerTexte(B, tag + '-refus429');
    await attendreTexte('429 + Retry-After 40 : l\'avis dit « réessaie dans 40 s »', B, '#avis', 'réessaie dans 40 s', 4000);
    await B.page.unroute('**/api/conversations/*/messages');
    await B.page.route('**/api/conversations/*/messages', reponse(413, 'trop_gros', {}, 'POST'));
    await toucher(B, '#envoyer');
    await attendreTexte('413 : l\'avis dit « trop volumineuse » ET REMPLACE le précédent', B, '#avis', 'trop volumineuse', 4000);
    vrai('… sans garder la phrase du 429', !/réessaie dans 40 s/.test(await lire(B, '#avis')));
    await B.page.unroute('**/api/conversations/*/messages');
    await B.page.route('**/api/conversations/*/messages', reponse(403, 'interdit', {}, 'POST'));
    await toucher(B, '#envoyer');
    await attendreTexte('403 : « Tu n\'as pas le droit de faire cela ici »', B, '#avis', 'pas le droit', 4000);
    await B.page.unroute('**/api/conversations/*/messages');
    await toucher(B, '#envoyer');
    await verifier('la RÉUSSITE suivante efface le refus (plus d\'avis) et le message part', B, () => document.getElementById('avis').hidden && document.getElementById('saisie').value === '', null, 6000, () => texteVu(B, '#avis'));
    await verifier('A reçoit ce message-là (celui qu\'on avait retenté)', A, t => (document.getElementById('conv-messages').textContent || '').includes(t), tag + '-refus429', 9000);
    /* 409 sur la modification, 403 sur la réaction */
    const mine = tag + '-pour-409';
    await envoyerTexte(A, mine);
    await verifier('A a un message à modifier', A, t => (document.getElementById('conv-messages').textContent || '').includes(t), mine, 6000);
    await A.page.route('**/api/conversations/*/messages/modifier', reponse(409, 'delai_depasse'));
    await menuDe(A, mine, 'plus'); await actionMenu(A, 'modifier'); await saisir(A, '#saisie', mine + 'x'); await toucher(A, '#envoyer');
    await attendreTexte('409 : « Un message ne se modifie plus après 15 minutes »', A, '#avis', '15 minutes', 4000);
    await A.page.unroute('**/api/conversations/*/messages/modifier');
    await toucher(A, '#compo-contexte-x');
    await A.page.route('**/api/conversations/*/messages/reagir', reponse(403, 'interdit'));
    await menuDe(A, mine, 'plus'); await toucher(A, '#menu-msg .menu-emoji[data-menu-reac="❤️"]');
    await attendreTexte('403 sur une réaction : l\'avis le dit', A, '#avis', 'pas le droit', 4000);
    await A.page.unroute('**/api/conversations/*/messages/reagir');
    /* la liste refusée : 429 sur GET /api/conversations, le bouton Réessayer */
    await B.page.route('**/api/conversations', reponse(429, 'quota_atteint', { 'Retry-After': '40' }, 'GET'));
    await retourListe(B);
    await envoyerTexte(A, tag + '-declencheur');
    await verifier('429 sur la LISTE : « La liste n\'a pas pu être mise à jour », avec l\'attente (40 s) et le bouton Réessayer', B, () => { const e = document.getElementById('liste-erreur'); return !e.hidden && /40 s/.test(e.textContent) && !document.getElementById('liste-erreur-bouton').hidden; }, null, 9000, () => texteVu(B, '#liste-erreur'));
    await toucher(B, '#liste-erreur-bouton');
    await verifier('« Réessayer » alors que le service refuse encore : le refus reste DIT (il ne disparaît pas parce qu\'on a touché)', B, () => !document.getElementById('liste-erreur').hidden && /40 s/.test(document.getElementById('liste-erreur').textContent), null, 4000, () => texteVu(B, '#liste-erreur'));
    await B.page.unroute('**/api/conversations');
    await toucher(B, '#liste-erreur-bouton');
    await verifier('« Réessayer » une fois le service revenu : la liste est relue et le refus s\'efface', B, () => document.getElementById('liste-erreur').hidden && document.querySelectorAll('#liste-conv .conv').length >= 1, null, 6000, () => texteVu(B, '#liste-erreur'));
    /* 404 (réel) : une conversation qui n'existe pas dans l'adresse ; 410 (réel) : un lien révoqué ; 409 (réel) : son propre lien */
    await B.page.evaluate(() => { location.hash = '#messages/inexistante123'; });
    await verifier('404 (réel) : une conversation absente de l\'adresse dit « n\'existe plus » et ramène à la liste', B, () => document.documentElement.dataset.conv !== '1' && /existe plus|Introuvable/.test(document.getElementById('mot').textContent), null, 6000, () => texteVu(B, '#mot'));
    await onglet(A, 'reglages'); await rubrique(A, 'contacts'); await toucher(A, '#reg-contact');
    await toucher(A, '[data-act="lien-creer"]');
    await verifier('un lien neuf est créé', A, () => !!document.getElementById('ct-lien-champ'), null, 5000);
    const vieux = await A.page.inputValue('#ct-lien-champ');
    await saisir(A, '#ct-code', vieux); await toucher(A, '[data-act="lien-lire"]');
    await verifier('lire son propre lien montre l\'aperçu et le bouton « Accepter »', A, () => !!document.querySelector('[data-act="lien-accepter"]'), null, 5000, () => texteVu(A, '#info-corps'));
    await toucher(A, '[data-act="lien-accepter"]');
    await verifier('409 (réel) : accepter SON PROPRE lien dit « c\'est ton propre lien »', A, () => /propre lien/.test(document.getElementById('info-erreur').textContent), null, 5000, () => texteVu(A, '#info-erreur'));
    await toucher(A, '[data-act="lien-revoquer"]');
    await verifier('« Révoquer mes liens » : le petit mot le dit', A, () => /révoqué/.test(document.getElementById('mot').textContent), null, 5000);
    await onglet(C, 'reglages'); await rubrique(C, 'contacts'); if (!(await visible(C, '#ct-code'))) await toucher(C, '#reg-contact');
    await saisir(C, '#ct-code', vieux); await toucher(C, '[data-act="lien-lire"]');
    await verifier('410 (réel) : un lien révoqué dit « n\'est plus valable »', C, () => /n'est plus valable/.test(document.getElementById('info-erreur').textContent), null, 6000, () => texteVu(C, '#info-erreur'));
    await saisir(C, '#ct-code', 'pas-un-lien'); await toucher(C, '[data-act="lien-lire"]');
    await verifier('et un lien mal copié : « colle le lien reçu en entier » REMPLACE le refus d\'avant', C, () => /en entier/.test(document.getElementById('info-erreur').textContent) && !/plus valable/.test(document.getElementById('info-erreur').textContent), null, 4000);
    await toucher(C, '#g-annuler'); await toucher(A, '#g-annuler');
    } finally { await B.page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); await A.page.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {}); }
  });

  await bloc('9 ter. Relectures du 2 octobre : deux messages identiques, le retour sur l\'onglet, un « Lu » refusé, un lien collé avec sa phrase', async () => {
    await ouvrirConvAvec(B, nomA); await ouvrirConvAvec(A, nomB);
    /* D2 — « ok » puis « ok » 250 ms plus tard, la réponse du service retardée : DEUX messages (le second était avalé : il ressemblait au texte qu'on venait de voir refuser) */
    const OK = tag + '-ok';
    await A.page.route('**/api/conversations/*/messages', async r => { if (r.request().method() === 'POST') await dormir(900); await r.continue(); });
    await envoyerTexte(A, OK);
    await dormir(250);
    await envoyerTexte(A, OK);
    const deux = (S) => verifier('⛔ D2 : ' + S.nom.split(' ')[0] + ' voit DEUX messages « ' + OK + ' » (envoyés à 250 ms d\'écart)', S, t => Array.from(document.querySelectorAll('#conv-messages .msg .bulle')).filter(x => x.textContent.trim() === t).length === 2, OK, 14000, () => texteVu(S, '#conv-messages'));
    await deux(A); await deux(B);
    await A.page.unroute('**/api/conversations/*/messages');
    v('et le champ de saisie d\'Alice est vide (rien de renvoyé)', await A.page.inputValue('#saisie'), '');
    const nonLus = () => B.page.evaluate(async () => { const r = await fetch('/api/conversations'); const j = await r.json(); return j.conversations.reduce((n, c) => n + (c.non_lus || 0), 0); });
    /* D4 + G2 — l'onglet de B est CACHÉ pendant que le message arrive ; le service refuse son « Lu » (503) ; il revient : le refus se DIT ; puis un retour réussi marque lu */
    const V = tag + '-cache';
    await B.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); });
    await envoyerTexte(A, V);
    await verifier('B (onglet caché) reçoit le message dans le fil', B, t => (document.getElementById('conv-messages').textContent || '').includes(t), V, 9000);
    await dormir(700);
    const nl0 = await nonLus();
    vrai('population : tant que l\'onglet est caché, le message reste « non lu » chez le service (' + nl0 + ' non lu)', nl0 >= 1);
    await B.page.route('**/api/conversations/*/lu', r => r.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'disque_plein' }) }));
    await B.page.evaluate(() => { delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
    await attendreTexte('⛔ G2 : le « Lu » refusé par le service (503) se DIT (« accusé de lecture »), il ne se perd pas en silence', B, '#avis', 'accusé de lecture', 6000);
    vrai('population : le refus a bien eu lieu (toujours « non lu » chez le service)', (await nonLus()) >= 1);
    await B.page.unroute('**/api/conversations/*/lu');
    await B.page.evaluate(() => { Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' }); document.dispatchEvent(new Event('visibilitychange')); delete document.visibilityState; document.dispatchEvent(new Event('visibilitychange')); });
    await verifier('⛔ D4 : B revient sur l\'onglet — la conversation est marquée LUE chez le service (plus aucun non lu)', B, async () => { const r = await fetch('/api/conversations'); const j = await r.json(); return j.conversations.reduce((n, c) => n + (c.non_lus || 0), 0) === 0; }, null, 8000, async () => 'non lus : ' + await nonLus());
    await verifier('et Alice voit « Lu » sous son message (B l\'a lu en revenant sur l\'onglet)', A, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /Lu \d\d:\d\d/.test(m.textContent); }, V, 9000);
    /* un refus (réaction) ne survit pas à la réussite qui le dément */
    const M = tag + '-ok';
    await menuDe(B, M, cfg.pb.mobile ? 'plus' : 'droit');
    await B.page.route('**/api/conversations/*/messages/reagir', r => r.fulfill({ status: 429, contentType: 'application/json', headers: { 'Retry-After': '30' }, body: JSON.stringify({ error: 'quota_atteint' }) }));
    await toucher(B, '#menu-msg .menu-emoji[data-menu-reac="👍"]');
    await attendreTexte('une réaction refusée (429) : l\'avis le dit', B, '#avis', 'réessaie dans 30 s', 4000);
    await B.page.unroute('**/api/conversations/*/messages/reagir');
    await menuDe(B, M, cfg.pb.mobile ? 'plus' : 'droit');
    await toucher(B, '#menu-msg .menu-emoji[data-menu-reac="👍"]');
    await verifier('⛔ la réaction qui RÉUSSIT efface le refus d\'avant (plus d\'avis à l\'écran)', B, () => document.getElementById('avis').hidden, null, 5000, () => texteVu(B, '#avis'));
    /* un lien ouvert dans un onglet DÉJÀ ouvert (seul le fragment change) ouvre la feuille, et l'adresse est remise à la route */
    const code = await A.page.evaluate(async () => { const r = await fetch('/api/contacts/lien', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-OPM': '1' }, body: JSON.stringify({ max: 1, jours: 7 }) }); return (await r.json()).code; });
    vrai('population : Alice a un code de lien neuf (' + String(code).length + ' signes)', typeof code === 'string' && code.length >= 20);
    await B.page.evaluate(c => { location.hash = '#lien=' + c; }, code);
    await verifier('⛔ P4 : « #lien=… » dans un onglet déjà ouvert ouvre la feuille Contacts et lit le lien (« veut t\'ajouter »)', B, () => /veut t'ajouter/.test((document.getElementById('ct-apercu') || {}).textContent || ''), null, 8000, () => texteVu(B, '#info-corps'));
    vrai('… et le code ne reste pas dans la barre d\'adresse', !/lien=/.test(await B.page.evaluate(() => location.href)));
    await toucher(B, '#g-annuler');
    await verifier('la feuille se referme (B retrouve sa conversation)', B, () => !document.documentElement.classList.contains('feuille-ouverte') && !!document.getElementById('saisie').offsetParent, null, 5000, () => texteVu(B, '#info-corps'));
    /* ⛔ des SIGNES, pas des unités UTF-16 : le service compte les points de code (8 000 émojis passent) ; la page refusait dès 4 001 et annonçait un chiffre faux */
    await B.page.evaluate(() => { const t = document.getElementById('saisie'); t.value = '😀'.repeat(5000); t.dispatchEvent(new Event('input', { bubbles: true })); });
    await dormir(300);
    vrai('⛔ 5 000 émojis (10 000 unités UTF-16, 5 000 signes) : aucun « trop long » — le service les accepte', !/trop long/.test(await lire(B, '#avis')) || (await visible(B, '#avis')) === false);
    await B.page.evaluate(() => { const t = document.getElementById('saisie'); t.value = '😀'.repeat(8001); t.dispatchEvent(new Event('input', { bubbles: true })); });
    await attendreTexte('⛔ 8 001 émojis : « 1 signes en trop » (le compte est celui du service, pas 4 000 de trop)', B, '#avis', '1 signes en trop', 3000);
    await B.page.evaluate(() => { const t = document.getElementById('saisie'); t.value = ''; t.dispatchEvent(new Event('input', { bubbles: true })); });
  });

  await bloc('10. Ce qui est « bientôt » le dit (appels, réunions) — et les pièces, elles, sont là : « + » propose Photo et Fichier, le micro demande le micro', async () => {
    await onglet(A, 'appels');
    await verifier('l\'onglet Appels dit « Bientôt disponible »', A, () => /Bientôt disponible/.test(document.getElementById('vue-appels').textContent), null, 4000, () => texteVu(A, '#vue-appels'));
    await onglet(A, 'reunions');
    await verifier('l\'onglet Réunions dit « Bientôt disponible »', A, () => /Bientôt disponible/.test(document.getElementById('vue-reunions').textContent), null, 4000);
    await ouvrirConvAvec(A, nomB);
    await toucher(A, '#compo-plus');
    await verifier('« + » ouvre une petite feuille « Photo / Fichier » (le service sait les pièces), et n\'ouvre AUCUN sélecteur tant qu\'on n\'a pas choisi', A, () => !document.getElementById('menu-fond').hidden && document.querySelectorAll('#menu-msg [data-plus]').length === 2, null, 3000, () => texteVu(A, '#menu-msg'));
    v('population : la feuille « Joindre » porte ses deux actions, nommées, et aucun sélecteur de fichier ne s\'est ouvert', [await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-plus]')).map(b => b.textContent)), A.fichiers], [['Photo', 'Fichier'], 0]);
    await A.page.keyboard.press('Escape');
    await verifier('Échap referme la feuille « Joindre »', A, () => document.getElementById('menu-fond').hidden, null, 3000);
    await toucher(A, '#conv-cam');
    await attendreTexte('la caméra de l\'en-tête : « Les appels arrivent bientôt »', A, '#mot', 'appels arrivent bientôt', 3000);
    await saisir(A, '#saisie', ''); await A.page.evaluate(() => { const m = document.getElementById('compo-micro'); m.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch', button: 0 })); });
    await verifier('le micro DEMANDE le micro (ce navigateur n\'en a pas : la phrase le dit, aucune erreur dans la console)', A, () => window.__media >= 1 && /micro/i.test(document.getElementById('avis').textContent), null, 4000, () => texteVu(A, '#avis'));
    await dormir(300);
  });

  await bloc('11. Les écrans tiennent dans l\'écran (largeur mesurée deux fois, contre la largeur posée)', async () => {
    await largeur(A, 'conversation (fin)'); await largeur(B, 'liste'); await largeur(C, 'liste');
    for (const S of [A, B, C]) {
      const taille = await S.page.evaluate(() => ['saisie', 'recherche-conv'].map(i => { const e = document.getElementById(i); return e ? parseFloat(getComputedStyle(e).fontSize) : 99; }));
      if (S.pf.mobile) vrai(S.nom + ' (' + S.pf.nom + ') : les champs font 16 px au moins (' + taille.join(', ') + ')', taille.every(x => x >= 16));
    }
  });

  await bloc('12. Une autre personne dans le même navigateur : la page repart de zéro', async () => {
    await onglet(A, 'messages');
    await A.page.evaluate(() => { window.__marque = 'ancienne page'; });
    const avant = await A.page.evaluate(() => ({ lignes: document.querySelectorAll('#liste-conv .conv').length, bulles: document.querySelectorAll('#conv-messages .msg').length, noms: Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(e => e.textContent) }));
    vrai('population : la page d\'Alice porte des conversations et des messages avant le changement (' + avant.lignes + ' conversations, ' + avant.bulles + ' bulles)', avant.lignes >= 1 && avant.bulles >= 1);
    /* un second onglet du MÊME contexte : une autre personne se connecte (le cookie de session est remplacé) */
    const P2 = await A.ctx.newPage();
    const S2 = { ctx: A.ctx, page: P2, pf: A.pf, nom: 'autre onglet', base, erreurs: [], gestes: 0 };
    await P2.goto(base + '/');
    await verifier('l\'autre onglet voit la session d\'Alice (c\'est le même navigateur)', S2, () => !document.getElementById('app').hidden, null, 8000);
    const rep = await P2.evaluate(async a => { const r = await fetch('/api/beta/entrer', { method: 'POST', headers: { 'X-OPM': '1', 'Content-Type': 'application/json' }, body: JSON.stringify(a) }); return r.status; }, { login: cfg.intrus, pass: MOTS[cfg.intrus] });
    v('l\'autre personne se connecte dans le même navigateur (le cookie de session est REMPLACÉ ; la session d\'Alice reste vivante côté service)', rep, 200);
    await P2.goto(base + '/'); await enligne(S2);
    vrai('une autre personne est connectée (' + (await lire(S2, '#moi-nom')) + ')', (await lire(S2, '#moi-nom')).includes(NOMS[cfg.intrus].split(' ')[0]));
    /* on revient sur le premier onglet : il le voit — la page REPART, et la nouvelle page est celle de la personne connectée maintenant (le cookie est le sien) */
    const prenomI = NOMS[cfg.intrus].split(' ')[0];
    const nomsAvant = avant.noms;
    await A.page.evaluate(() => window.dispatchEvent(new Event('online')));
    await verifier('l\'onglet d\'Alice REPART de zéro et montre la session de ' + prenomI + ' (une page neuve, jamais un mélange)', A, p => !document.getElementById('app').hidden && document.getElementById('moi-nom').textContent.includes(p) && !window.__marque, prenomI, 10000, () => texteVu(A, '#moi-nom'));
    const apres = await A.page.evaluate(a => { const noms = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(e => e.textContent); return { marque: window.__marque || null, bulles: document.querySelectorAll('#conv-messages .msg').length, info: document.getElementById('info-corps').children.length, reste: noms.filter(n => a.noms.includes(n)), texte: document.body.innerText.includes(a.tag + '-'), url: location.search + location.hash }; }, { noms: nomsAvant, tag });
    v('rien de la personne d\'avant ne reste dans la page : ni mémoire (nouvelle page), ni conversation de sa liste, ni message, ni feuille d\'infos', [apres.marque, apres.bulles, apres.info, apres.reste, apres.texte], [null, 0, 0, [], false]);
    vrai('l\'adresse n\'emporte plus de conversation ouverte ni le motif : « ' + apres.url + ' »', !/messages\//.test(apres.url) && !/\?m=/.test(apres.url));
    await capturer(b, tag + '-08-autre-personne', [A, S2]);
    await P2.close();
    /* la personne d'avant se reconnecte : tout lui revient */
    await onglet(A, 'reglages'); await toucher(A, '#reg-sortir');
    await verifier('la personne suivante se déconnecte : écran de connexion', A, () => !document.getElementById('connexion').hidden, null, 8000);
    await connecter(A, la);
    await verifier('Alice se reconnecte : ses conversations sont revenues', A, () => document.querySelectorAll('#liste-conv .conv').length >= 1, null, 8000);
  });

  await bloc('13. L\'accès coupé dans la Tour : la page repart, avec la phrase, sans rien garder', async () => {
    await ouvrirConvAvec(B, nomA);
    await toucher(B, '#conv-titre');
    await B.page.evaluate(() => { window.__marque = 'ancienne page de B'; });
    const avant = await B.page.evaluate(() => ({ lignes: document.querySelectorAll('#liste-conv .conv').length, bulles: document.querySelectorAll('#conv-messages .msg').length, info: document.getElementById('info-corps').children.length }));
    vrai('population : B a une liste, un fil et une feuille d\'infos ouverts avant la coupure (' + JSON.stringify(avant) + ')', avant.lignes >= 1 && avant.bulles >= 1 && avant.info >= 1);
    og.comptes[lb].actif = false;
    await verifier('la Tour coupe l\'accès : B revient à l\'écran de connexion avec « Ta session a pris fin »', B, () => !document.getElementById('connexion').hidden && /Ta session a pris fin/.test(document.getElementById('connexion-erreur').textContent), null, 15000, () => texteVu(B, '#connexion-erreur'));
    const apres = await B.page.evaluate(() => ({ marque: window.__marque || null, lignes: document.querySelectorAll('#liste-conv .conv').length, bulles: document.querySelectorAll('#conv-messages .msg').length, info: document.getElementById('info-corps').children.length, appVisible: !document.getElementById('app').hidden }));
    v('rien de B ne reste (page neuve, liste, fil, infos vides, application cachée)', [apres.marque, apres.lignes, apres.bulles, apres.info, apres.appVisible], [null, 0, 0, 0, false]);
    const code = await B.page.evaluate(async () => (await fetch('/api/conversations')).status);
    v('et le service REFUSE les appels de B (401)', code, 401);
    await capturer(b, tag + '-09-acces-coupe', [A, B]);
    await saisir(B, '#c-login', lb); await saisir(B, '#c-pass', MOTS[lb]); await toucher(B, '#c-entrer');
    await attendreTexte('B retente avec l\'accès toujours coupé : « Cet accès a été coupé »', B, '#connexion-erreur', 'coupé', 6000);
    og.comptes[lb].actif = true;
    await saisir(B, '#c-pass', MOTS[lb]); await toucher(B, '#c-entrer');
    await enligne(B);
    await verifier('la Tour rouvre l\'accès : B se reconnecte et retrouve ses conversations', B, () => document.querySelectorAll('#liste-conv .conv').length >= 1, null, 8000);
  });

  await bloc('13 bis. Un message qui n\'est pas parti ne se perd pas EN SILENCE : fermer la page le demande, repartir le dit', async () => {
    if (!env.relais) { console.log('  — pas de relais : bloc sauté'); return; }
    const R = env.relais;
    /* ⛔ UNE CONVERSATION « OUVERTE » N'EST PAS UNE CONVERSATION CHARGÉE. `dataset.conv = '1'` est posé au PREMIER instant du toucher, avant que le service ait rendu la conversation et ses messages (deux
       requêtes de suite pour un onglet neuf). Couper le câble dans cet intervalle laisse la page sans compositeur (`#compo` reste caché), et le `fill('#saisie')` d'après attend neuf secondes un champ qui ne
       viendra pas — puis TOUT le reste tombe en cascade (14 et 15 : le câble resté coupé). Pris par le testeur le 3 octobre 2026 (trois fois sur trois sur la fusion), rejoué sur 6c9be34 avec 300 ms de
       latence sur les requêtes ordinaires : le MÊME échec, donc la page n'y est pour rien — le toucher n'était pas perdu (chronologie relevée au navigateur : pointerdown, click, `dataset.conv` en 14 ms), c'est la
       coupure qui arrivait avant la fin du chargement. On attend donc la conversation CHARGÉE (`aria-busy` retombé, compositeur visible), et sans avaler l'échec : un onglet qui ne s'ouvre pas le DIT. */
    const chargee = (S) => S.page.waitForFunction(() => document.documentElement.dataset.conv === '1' && document.getElementById('conv-messages').getAttribute('aria-busy') === 'false' && !document.getElementById('compo').hidden, null, { timeout: 8000 });
    let P1 = null, P2 = null;
    try {
    await ouvrirConvAvec(B, nomA);
    const nouvelOnglet = async () => {
      const page = await B.ctx.newPage(); page.setDefaultTimeout(9000);
      const S2 = { ctx: B.ctx, page, pf: B.pf, nom: 'autre onglet de B', base: baseB, erreurs: [], gestes: 0 };
      await page.goto(baseB + '/'); await enligne(S2);
      return S2;
    };
    /* 1. fermer un onglet qui n'a RIEN en attente : aucune question */
    P1 = await nouvelOnglet();
    const dlg1 = []; P1.page.on('dialog', d => { dlg1.push(d.type()); d.accept().catch(() => {}); });
    await toucher(P1, '#liste-conv .conv'); await chargee(P1);
    await P1.page.close({ runBeforeUnload: true });
    await dormir(700);   // le dialogue d'un onglet fermé arrive APRÈS la fin de `close()` : lire tout de suite rendrait « aucun » à coup sûr
    v('⛔ population : fermer un onglet sans message en attente ne pose AUCUNE question', dlg1, []);
    /* 2. fermer un onglet qui a un message « En attente de connexion » : le navigateur DEMANDE confirmation (« quitter la page ? ») */
    P2 = await nouvelOnglet();
    R.lat.ms = 250;   // la conversation d'un onglet NEUF met un quart de seconde par requête à se charger (elle en fait deux) : couper le câble sans l'avoir attendue est un échec à CHAQUE passage
    await toucher(P2, '#liste-conv .conv'); await chargee(P2);
    R.lat.ms = 0;
    const PERDU = tag + '-perdu-fermeture';
    R.couper();
    await verifier('l\'onglet est coupé : la bannière paraît', P2, () => !document.getElementById('hors-ligne').hidden, null, 15000, () => texteVu(P2, '#hors-ligne'));
    await envoyerTexte(P2, PERDU);
    await verifier('population : le message est « En attente de connexion… »', P2, t => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && /En attente de connexion/.test(m.textContent); }, PERDU, 6000);
    const dlg2 = []; P2.page.on('dialog', d => { dlg2.push(d.type()); d.accept().catch(() => {}); });
    await P2.page.close({ runBeforeUnload: true });
    await dormir(700);
    v('⛔ G1 / D8 : fermer l\'onglet avec un message en attente DEMANDE confirmation (beforeunload) — rien n\'est rangé sur l\'appareil, la page le dit avant de le perdre', dlg2, ['beforeunload']);
    R.rendre();
    await dormir(800);
    vrai('population : le message laissé en attente par l\'onglet fermé n\'est jamais arrivé chez Alice', (await bulle(A, PERDU).count()) === 0);
    /* 3. la session meurt (accès coupé dans la Tour) pendant qu'un message est en attente : la page repart de zéro ET LE DIT */
    await verifier('B est de retour en ligne (flux rétabli)', B, () => document.getElementById('hors-ligne').hidden, null, 20000, () => texteVu(B, '#hors-ligne'));
    R.couper();
    await verifier('B coupé : bannière', B, () => !document.getElementById('hors-ligne').hidden, null, 15000, () => texteVu(B, '#hors-ligne'));
    await envoyerTexte(B, tag + '-perdu-un'); await envoyerTexte(B, tag + '-perdu-deux');
    await verifier('population : deux messages en attente chez B (la source les compte)', B, () => window.OPMSG_SOURCE.enAttente() === 2, null, 6000, async () => 'enAttente = ' + await B.page.evaluate(() => window.OPMSG_SOURCE.enAttente()));
    og.comptes[lb].actif = false;
    await dormir(700);
    R.rendre();
    await verifier('⛔ G1 : l\'accès est coupé : la page repart ET dit que 2 messages n\'étaient pas partis (le nombre, jamais le texte)', B, () => !document.getElementById('connexion').hidden && /Ta session a pris fin/.test(document.getElementById('connexion-erreur').textContent) && /2 messages n'étaient pas encore partis/.test(document.getElementById('connexion-erreur').textContent), null, 25000, () => texteVu(B, '#connexion-erreur'));
    vrai('⛔ le TEXTE des messages ne voyage pas dans l\'adresse ni sur l\'écran de connexion', !/perdu-un|perdu-deux/.test(await B.page.evaluate(() => location.href + ' ' + document.body.innerText.replace(/\s+/g, ' '))));
    vrai('et l\'adresse a été nettoyée (plus de « ?m= » ni de « &n= »)', !/[?&](m|n)=/.test(await B.page.evaluate(() => location.href)));
    og.comptes[lb].actif = true;
    await saisir(B, '#c-login', lb); await saisir(B, '#c-pass', MOTS[lb]); await toucher(B, '#c-entrer');
    await enligne(B);
    vrai('B se reconnecte : plus de phrase sur les messages perdus (la page est neuve)', !/pas encore partis/.test(await B.page.evaluate(() => document.getElementById('connexion-erreur').textContent)));
    vrai('population : aucun des deux messages n\'est arrivé chez Alice (ils ont été perdus, et dits)', (await bulle(A, tag + '-perdu-un').count()) === 0 && (await bulle(A, tag + '-perdu-deux').count()) === 0);
    } finally {
      /* ⛔ un bloc qui lève ne laisse NI le câble coupé NI l'accès fermé derrière lui : sans cela, un seul défaut en faisait huit (14 et 15 tombaient sur le câble resté coupé) */
      R.rendre(); R.lat.ms = 0; og.comptes[lb].actif = true;
      for (const x of [P1, P2]) { try { if (x && !x.page.isClosed()) await x.page.close(); } catch (e) { /* déjà fermé */ } }
    }
  });

  await bloc('14. La déconnexion : ratée elle le dit et ne laisse rien à moitié, réussie elle vide tout', async () => {
    await onglet(B, 'reglages');
    await B.page.route('**/api/compte/deconnexion', r => r.abort('connectionfailed'));
    await toucher(B, '#reg-sortir');
    await verifier('déconnexion RATÉE (réseau) : la phrase le dit et B reste connecté', B, () => !document.getElementById('reg-erreur').hidden && /connexion|réseau/i.test(document.getElementById('reg-erreur').textContent) && !document.getElementById('app').hidden, null, 6000, () => texteVu(B, '#reg-erreur'));
    await onglet(B, 'messages');
    const T4 = tag + '-apres-echec';
    await ouvrirConvAvec(A, nomB);
    await envoyerTexte(A, T4);
    await verifier('et le TEMPS RÉEL de B marche toujours (le flux n\'a pas été fermé avant de savoir) : le message d\'Alice arrive', B, t => document.body.innerText.includes(t) || Array.from(document.querySelectorAll('#liste-conv .conv-apercu')).some(x => x.textContent.includes(t)), T4, 9000, () => texteVu(B, '#liste-conv'));
    await B.page.unroute('**/api/compte/deconnexion');
    await onglet(B, 'reglages'); await toucher(B, '#reg-sortir');
    await verifier('déconnexion réussie : écran de connexion et « Tu es déconnecté. »', B, () => !document.getElementById('connexion').hidden && /Tu es déconnecté/.test(document.getElementById('connexion-erreur').textContent), null, 8000, () => texteVu(B, '#connexion-erreur'));
    const vide = await B.page.evaluate(() => ({ lignes: document.querySelectorAll('#liste-conv .conv').length, bulles: document.querySelectorAll('#conv-messages .msg').length, app: !document.getElementById('app').hidden }));
    v('page vidée : ni liste, ni fil, application cachée', [vide.lignes, vide.bulles, vide.app], [0, 0, false]);
    vrai('le cookie de session est retiré', !(await B.ctx.cookies()).some(c => c.name === 'opm' && c.value));
    await B.page.goBack().catch(() => {});
    await B.page.waitForTimeout(800);
    const retour = await B.page.evaluate(() => ({ url: location.href, lignes: document.querySelectorAll('#liste-conv .conv').length, app: !document.getElementById('app').hidden, connexion: !document.getElementById('connexion').hidden }));
    vrai('population : le retour arrière a bien ramené sur une page de l\'application (' + retour.url + ')', retour.url.startsWith(baseB));
    v('le bouton « retour » du navigateur ne ressuscite rien (aucune liste, pas d\'application)', [retour.lignes, retour.app], [0, false]);
    await B.page.goto(baseB + '/'); await connecter(B, lb);
    /* ⛔ G4 : le service répond aussi à « //index.html » (express.static normalise) : `location.replace('//index.html?m=…')` est une adresse SANS SCHÉMA, lue comme l'hôte « index.html » */
    await B.page.goto(baseB + '//index.html'); await enligne(B);
    vrai('population : la page est bien servie depuis « //index.html » (chemin ' + await B.page.evaluate(() => location.pathname) + ')', (await B.page.evaluate(() => location.pathname)).startsWith('//'));
    await onglet(B, 'reglages'); await toucher(B, '#reg-sortir');
    await verifier('⛔ G4 : déconnecté depuis « //index.html », la page revient à l\'écran de connexion DU SERVICE (« Tu es déconnecté ») — pas vers l\'hôte « index.html »', B, () => !document.getElementById('connexion').hidden && /Tu es déconnecté/.test(document.getElementById('connexion-erreur').textContent), null, 8000, () => texteVu(B, '#connexion-erreur'));
    v('et l\'hôte est celui du service', await B.page.evaluate(() => location.host), new URL(baseB).host);
    await B.page.goto(baseB + '/'); await connecter(B, lb);
  });

  await bloc('15. La présence : quand quelqu\'un ferme son navigateur, les autres le voient partir', async () => {
    await ouvrirConvAvec(A, nomB);
    await toucher(A, '#conv-titre');
    await verifier(prenomB + ' est « En ligne » pour A', A, () => /En ligne/.test((document.querySelector('#info-corps .info-sous') || {}).textContent || ''), null, 8000, () => texteVu(A, '#info-corps'));
    await B.ctx.close();
    await verifier(prenomB + ' ferme son navigateur : A le voit PARTIR (« Conversation à deux », plus « En ligne »)', A, () => !/En ligne/.test((document.querySelector('#info-corps .info-sous') || {}).textContent || '') && !!document.querySelector('#info-corps .info-sous'), null, 12000, () => texteVu(A, '#info-corps'));
    await toucher(A, '#g-annuler');
  });

  /* ── le bilan de la population et des zéros ── */
  console.log('\nBilan des écrans, des erreurs et du réseau');
  const nb = k => tous.reduce((x, S) => x + (S[k] || 0), 0);
  vrai('population : ' + nb('ecrans') + ' écrans mesurés en largeur (' + nb('population') + ' éléments examinés), ' + nb('gestes') + ' gestes portés', nb('ecrans') >= 8 && nb('gestes') > 60);
  v('0 débordement latéral sur ces écrans (mesuré deux fois, contre la largeur posée du profil)', [].concat(A.debordements || [], B.debordements || [], C.debordements || []), []);
  for (const S of tous) {
    v(S.nom + ' (' + S.pf.nom + ') : aucune exception JavaScript non rattrapée', S.erreurs, []);
    const autres = S.console.filter(t => !/Failed to load resource|net::ERR_|EventSource|status of (4|5)\d\d/.test(t));
    v(S.nom + ' : aucune erreur de console autre qu\'un refus réseau attendu (' + S.console.length + ' refus réseau relevés)', autres, []);
    const dehors = S.reseau.filter(u => !u.startsWith(S.base) && !u.startsWith('data:') && !u.startsWith('blob:') && u !== 'about:blank');
    v(S.nom + ' : aucune requête hors du service (' + S.reseau.length + ' requêtes examinées)', dehors, []);
  }
  for (const S of tous) { try { await S.ctx.close(); } catch (e) { /* déjà fermé */ } }
}

/* ══ le lancement ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: l !== 'coupe' }])));
  const portSvc = await T.portLibre();
  const relaisB = await (async () => { const r = await relais(portSvc); return r; })();
  const svc = await T.lancerService({ port: portSvc, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + portSvc, relaisB.base], pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 } } });
  let b = null;
  try {
    b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS });
  } catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const h = await (await fetch(svc.base + '/')).text();
    vrai('population : le service sert la page générée (' + h.length + ' octets, trois scripts)', (h.match(/<script[^>]+src=/g) || []).length === 3);
    await couple(b, { og, svc, relais: relaisB }, { tag: 'jr', titre: 'Alice (iPhone 393, jour) et Bruno (bureau 1440, jour) — Eve (bureau 1024) les rejoint', logins: ['alice', 'bruno', 'eve'], intrus: 'chloe', pa: PROFILS.iphone, pb: PROFILS.bureau, pc: PROFILS.petit, nuit: false });
    if (!RAPIDE) await couple(b, { og, svc, relais: relaisB }, { tag: 'nt', titre: 'Chloé (Android 360, nuit) et Dave (iPad 820, nuit) — Fred (iPhone 393) les rejoint', logins: ['chloe', 'dave', 'fred'], intrus: 'alice', pa: PROFILS.android, pb: PROFILS.ipad, pc: PROFILS.iphone, nuit: true });
    const sortie = svc.sortie.texte();
    v('le service n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { await b.close(); } catch (e) { /* rien */ } relaisB.fermer(); await svc.arreter(); await og.fermer(); }
  fin();
})();
