/* ══ SONDE DE BOUT EN BOUT — LES RÉUNIONS PROGRAMMÉES D'OP MESSAGES, DANS DE VRAIS NAVIGATEURS ══════════════════════════════════════════════════════
   `tests/test-976.js` fait parler le module de données de la page au vrai service ; `test-970` à `975` jouent le calendrier, le fichier .ics, le stockage, les routes, le planificateur et le courriel.
   Celle-ci joue ce que seul un navigateur voit : la VRAIE PAGE SERVIE (`server-msg/public/`), au DOIGT (iPhone 393) et à la souris (bureau 1440, à New York), contre le VRAI service, sur 127.0.0.1 — jamais
   teamop.fr — trois fois : la bêta avec un relais SMTP de banc et une horloge décalable (tout ouvert), la bêta SANS relais (l'écran DIT que l'envoi par courriel n'est pas encore ouvert) et un service à la
   formule de PRODUCTION (« Programmer » est une fonction Pro : refusée, dite, rien de créé).

   Ce qu'elle joue : l'agenda de la semaine (vide, puis avec la réunion, l'aujourd'hui, les sept jours) ; « Programmer » (les champs, les refus d'ICI, une série hebdomadaire de trois dates qui traverse le
   changement d'heure d'octobre, les invités filtrés par une recherche) ; la fiche de l'organisateur et celle d'un invité (les gestes de chacun, et SEULEMENT ceux-là) ; la réponse de Bruno vue EN DIRECT
   par Alice ; SES rappels à lui ; la conversation de la réunion (dont le titre mène à la réunion) ; une personne non invitée qui ne voit RIEN ; inviter, puis retirer en direct ; le fichier .ics téléchargé
   (toute la série, une date) ; le courriel (les refus, un envoi qui part avec son fichier, le plafond par adresse) ; modifier (un lieu ne touche pas aux réponses, un horaire les remet en attente ;
   « Notifier » éteint ne prévient personne) ; les rappels qui arrivent à l'heure, une seule fois, quand le service avance de trois heures ; annuler (avec demande de confirmation) puis supprimer ;
   l'absence d'erreur dans la console et de débordement d'écran.

   ⛔ CE QU'ELLE NE PEUT PAS JOUER, ET DIT : un vrai relais SMTP et une vraie boîte de réception (le relais est un faux, local : le geste de Justin est de le configurer, en saisie masquée, par
   `node server-msg/configurer-courriel.js`) ; l'ouverture du fichier .ics dans une vraie application d'agenda (`test-971` le relit par un lecteur indépendant) ; la notification poussée quand la page est
   FERMÉE (`sonde-opmessages-push.js`) — ici la même notification arrive par le flux, et l'adresse `/#reunions/<identifiant>` que la notification ouvrirait est jouée par `goto` ; un vrai téléphone dans un
   vrai fuseau (le navigateur de banc reçoit un fuseau forcé : Paris pour Alice, New York pour Bruno).

   ⛔ CHAQUE ZÉRO EST PRÉCÉDÉ DE SA POPULATION. ⛔ ON ATTEND AU GESTE (waitForFunction), JAMAIS AU CHRONOMÈTRE. ⛔ UNE MESURE QUI ÉCHOUE DIT CE QU'ELLE A LU À LA PLACE.
   ⛔ Les secrets du banc sont fictifs et portent des lettres hors de [0-9a-f] ; le « service qui avance » est l'horloge DU PROCESSUS du service (`lib-horloge-msg.js`), pas celle du navigateur.
   Lancer :   NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-reunions.js
              CAPTURES=/dossier   (une capture de chaque navigateur à chaque étape clé)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner (pas de navigateur, pas de dépendances du service). */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { fauxRelais, lireMessage } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.\n  NODE_PATH=/opt/node22/lib/node_modules/playwright/node_modules node tests/sonde-opmessages-espaces.js'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER_CAPTURES = process.env.CAPTURES || null;
const dormir = T.dort;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const PROFILS = {
  iphone: { nom: 'iPhone 393', w: 393, h: 852, dpr: 2, mobile: true, insets: { top: 54, bottom: 34 } },
  bureau: { nom: 'bureau 1440', w: 1440, h: 900, dpr: 1, mobile: false, insets: null },
};
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dora: 'pw-dora-12345' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Durand', dora: 'Dora Leroy' };
const JOUR = 86400000;

async function ouvrir(b, base, pf, o) {
  o = o || {};
  const ctx = await b.newContext({
    viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: 'light', reducedMotion: 'reduce', locale: 'fr-FR',
    timezoneId: o.tz || 'Europe/Paris', permissions: ['clipboard-read', 'clipboard-write'], baseURL: base,
  });
  /* chaque bannière que la page MONTRE est notée (titre | texte) : une notification arrivée en direct, sans qu'on touche rien, se relit */
  await ctx.addInitScript(() => {
    window.__bannieres = [];
    const poser = () => {
      const aide = document.getElementById('notif-aide'), titre = document.getElementById('notif-texte');
      if (!aide || !titre) return;
      new MutationObserver(() => { const t = aide.textContent.trim(); if (t) window.__bannieres.push(titre.textContent.trim() + ' | ' + t); }).observe(aide, { childList: true, characterData: true, subtree: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', poser); else poser();
  });
  const page = await ctx.newPage();
  page.setDefaultTimeout(15000);
  const S = { ctx, page, pf, nom: '?', base, erreurs: [], console: [], gestes: 0, requetes: [], postes: [], navigations: [] };
  /* l'erreur ET d'où elle vient (les trois premières lignes de la pile) : « Cannot read properties of null » seul ne nomme personne */
  /* ⛔ Un prédicat de `waitForFunction` qui lit un élément pas encore là jette DANS la page, et Playwright le relaie comme une erreur de page : la sonde s'accuserait elle-même (tour 3 de cette sonde :
     « 0 erreur JavaScript » tombé sur sa propre attente). Une erreur dont AUCUNE ligne de pile n'est un script servi par l'application, et qui vient d'une évaluation de la sonde, est celle de la sonde. */
  S.bruitSonde = 0;
  page.on('pageerror', e => {
    const pile = String(e && e.stack || ''), dePage = pile.includes(new URL(base).origin + '/') && /\.js:\d+:\d+/.test(pile.split(new URL(base).origin).slice(1).join(''));
    if (!dePage && /eval at (predicate|evaluate)/.test(pile)) { S.bruitSonde++; return; }
    S.erreurs.push(String(e && e.message || e).slice(0, 240) + (pile ? ' @ ' + pile.split('\n').slice(1, 4).map(x => x.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//, '')).join(' < ') : ''));
  });
  page.on('console', m => { if (m.type() === 'error') S.console.push(m.text().slice(0, 240)); });
  page.on('request', r => { const u = new URL(r.url()); if (u.origin === new URL(base).origin) { S.requetes.push(r.method() + ' ' + u.pathname); if (r.method() === 'POST') S.postes.push({ chemin: u.pathname, corps: r.postData() }); } });
  /* chaque refus du service, NOMMÉ (statut, méthode, chemin) : « un 429 » seul ne dit pas quelle route a refusé */
  S.refus = []; S.lentes = [];
  /* une réponse du service qui met plus de 2 s est NOMMÉE : une page qui « arrive en retard » ne se devine pas à la lecture */
  page.on('requestfinished', r => { try { const t = r.timing(), u = new URL(r.url()); const d = t.responseEnd - t.startTime; if (u.origin === new URL(base).origin && d > 2000) S.lentes.push(r.method() + ' ' + u.pathname + ' ' + Math.round(d) + ' ms'); } catch (e) { /* sans mesure */ } });
  page.on('response', r => { try { const u = new URL(r.url()); if (u.origin === new URL(base).origin && r.status() >= 400) S.refus.push(r.status() + ' ' + r.request().method() + ' ' + u.pathname); } catch (e) { /* une réponse sans adresse lisible */ } });
  await ctx.route(/^https:\/\/(checkout|billing)\.stripe\.test\//, r => { S.navigations.push(r.request().url()); return r.fulfill({ status: 200, contentType: 'text/html;charset=utf-8', body: '<!doctype html><title>Stripe du banc</title><p>Stripe du banc</p>' }); });
  if (pf.insets) { try { const c = await ctx.newCDPSession(page); await c.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: pf.insets.top, bottom: pf.insets.bottom, left: 0, right: 0 } }); } catch (e) { /* facultatif */ } }
  return S;
}
const lire = (S, sel) => S.page.evaluate(s => { const e = document.querySelector(s); return e ? e.textContent.replace(/\s+/g, ' ').trim() : null; }, sel);
/* ⛔ Une exception DU PRÉDICAT (un élément qui n'est pas encore dans la page : « Cannot read properties of null ») fait échouer `waitForFunction` tout de suite, sans attendre le délai — première version de cette
   sonde : « non vu à temps » au bout de 30 ms. On réessaie jusqu'au délai ; seul le délai écoulé dit « pas vu ». */
async function attendre(S, fn, arg, ms) {
  const fin = Date.now() + (ms || 12000);
  for (;;) {
    try { await S.page.waitForFunction(fn, arg, { timeout: Math.max(1, fin - Date.now()), polling: 50 }); return true; }
    catch (e) {
      if (/Timeout/i.test(String(e && e.message)) || Date.now() >= fin) return false;
      await dormir(80);
    }
  }
}
/* ce que la page DIT à ce moment (titre de feuille, refus affiché, toast, dernières erreurs) : une mesure qui échoue doit nommer ce qu'elle a lu à la place */
const etatPage = (S) => S.page.evaluate(() => {
  const t = id => { const e = document.getElementById(id); return e ? e.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; };
  const code = document.getElementById('en-code'), ap = document.getElementById('en-apercu');
  return 'feuille=' + t('feuille-titre') + (document.documentElement.classList.contains('feuille-ouverte') ? '(ouverte)' : '(fermée)') + ' · erreur=' + (t('info-erreur') || '') + ' · mot=' + (t('mot') || '') + ' · conv=' + (document.documentElement.dataset.conv || '-') + ' · vue=' + (document.documentElement.dataset.vue || '-')
    + (code ? ' · champ-lien=' + code.value.slice(0, 30) + ' · aperçu=' + (ap ? ap.textContent.slice(0, 80) : '(absent)') : '') + ' · adresse=' + location.pathname + location.search + location.hash.slice(0, 40);
}).then(x => x + ' · dernières requêtes : ' + S.requetes.slice(-5).join(', ')).catch(() => '?');
async function verifier(titre, S, fn, arg, ms, vu) {
  const t0 = Date.now();
  const ok = await attendre(S, fn, arg, ms);
  if (ok) { vrai(titre, true); if (Date.now() - t0 > 3000) (S.attentes = S.attentes || []).push(titre.slice(0, 70) + ' : ' + (Date.now() - t0) + ' ms'); }
  else {
    let reste = ''; try { reste = vu ? await vu() : ''; } catch (e) { reste = '?'; }
    v(titre, 'non vu à temps' + (reste ? ' ; vu : ' + String(reste).slice(0, 400) : '') + ' ; page : ' + await etatPage(S) + (S.erreurs.length ? ' ; erreurs JS : ' + S.erreurs.slice(-2).join(' | ') : ''), 'vu');
  }
  return ok;
}
async function toucher(S, sel) {
  const loc = S.page.locator(sel).filter({ visible: true }).first();
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  S.gestes++;
  if (S.pf.mobile) await loc.tap(); else await loc.click();
}
async function saisir(S, sel, texte) { await S.page.locator(sel).filter({ visible: true }).first().fill(texte); S.gestes++; }
async function capture(S, nom) {
  if (!DOSSIER_CAPTURES) return;
  try { fs.mkdirSync(DOSSIER_CAPTURES, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER_CAPTURES, nom + '-' + S.pf.nom.replace(/\W+/g, '') + '.png') }); } catch (e) { /* facultatif */ }
}
async function connecter(S, login) {
  await S.page.goto(S.base + '/');
  await saisir(S, '#c-login', login); await saisir(S, '#c-pass', MOTS[login]); await toucher(S, '#c-entrer');
  await S.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
}
async function retourListe(S) {
  const vis = await S.page.evaluate(() => { const e = document.getElementById('conv-retour'); return !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden'; });
  if (vis) { await toucher(S, '#conv-retour'); await S.page.waitForFunction(() => document.documentElement.dataset.conv !== '1', null, { timeout: 4000 }).catch(() => {}); }
}
async function onglet(S, vue) {
  await retourListe(S);
  await toucher(S, 'a[data-vue="' + vue + '"]');
  await S.page.waitForFunction(x => { const s = document.getElementById('vue-' + x); return s && !s.hidden && s.getClientRects().length > 0; }, vue, { timeout: 6000 });
}
/* deux trames et une lecture forcée, puis la page est POUSSÉE à droite : seul un défilement réel compte (CLAUDE.md) */
async function largeur(S, etape) {
  const mesure = () => S.page.evaluate(async () => {
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.documentElement.offsetWidth;
    window.scrollTo(9999, window.scrollY); const sx = window.scrollX; window.scrollTo(0, window.scrollY);
    return { dep: document.documentElement.scrollWidth, sx, n: document.querySelectorAll('body *').length };
  });
  await mesure(); await dormir(600); const b = await mesure();
  S.ecrans = (S.ecrans || 0) + 1; S.population = (S.population || 0) + b.n;
  if (b.sx > 0 || b.dep > S.pf.w + 1) (S.debordements = S.debordements || []).push(etape + ' : scrollWidth ' + b.dep + ' pour ' + S.pf.w + ', poussée ' + b.sx);
}
const titreFeuille = (S) => lire(S, '#feuille-titre');
const feuilleOuverte = (t) => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === t;
const texteCorps = (S) => lire(S, '#info-corps');
const lignes = (S, sel) => S.page.evaluate(s => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => e.textContent.replace(/\s+/g, ' ').trim()), sel);
async function fermerFeuille(S) {
  const ouverte = await S.page.evaluate(() => document.documentElement.classList.contains('feuille-ouverte'));
  if (ouverte) { await toucher(S, '#g-annuler'); await S.page.waitForFunction(() => !document.documentElement.classList.contains('feuille-ouverte'), null, { timeout: 5000 }).catch(() => {}); }
}
const mot = (S) => lire(S, '#mot');

/* ═══ LES DATES ET LES CONSTANTES DU BANC ══════════════════════════════════════════════════════════════════════════════════════════════════════
   Les secrets du banc sont fictifs et portent des lettres hors de [0-9a-f] : jamais le hasard d'une empreinte. L'oracle des dates (`Intl`) ne partage rien avec le service. */
const MIN = 60000, H = 3600000;
const TITRE = 'Point WQXZ-CANARI', LIEU = 'Salle WQXZ-B', LIEU_2 = 'javascript:alert(WQXZ-C)', TITRE_2 = 'Rappel WQXZ-CANARI', TITRE_3 = 'Collègue WQXZ-CANARI';
const UTIL = 'UTIL-WQXZ-CANARI', MDP_RELAIS = 'MDP-WQXZ-CANARI-7', EXPEDITEUR = 'invitations@exemple.invalid', ADRESSE = 'wqxz.dest@exemple.invalid';
const PARIS = 'Europe/Paris', NY = 'America/New_York';
const QUOTAS = { reunion: { max: 100000, fenetreMs: H }, ics: { max: 100000, fenetreMs: MIN }, courriel: { max: 100000, fenetreMs: MIN } };
const ymd = (t) => new Date(t).toISOString().slice(0, 10);
const FMT = (tz, o) => new Intl.DateTimeFormat('fr-FR', Object.assign({ timeZone: tz }, o));
const heureDans = (t, tz) => FMT(tz, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(t);
const libJour = (j) => FMT('UTC', { weekday: 'long', day: 'numeric', month: 'long' }).format(Date.parse(j + 'T12:00:00Z'));
const majuscule1 = (t) => t.charAt(0).toUpperCase() + t.slice(1);
const dit = (t, tz) => FMT(tz, { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(t).replace(/ | /g, ' ');
/* l'instant (UTC) où il est hh:mm à Paris le jour « 2026-10-26 » */
function instantParis(jour, hh, mm) {
  for (const off of [1, 2]) {
    const t = Date.parse(jour + 'T' + String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0') + ':00Z') - off * H;
    if (heureDans(t, PARIS) === String(hh).padStart(2, '0') + ':' + String(mm).padStart(2, '0')) return t;
  }
  return NaN;
}
/* l'heure LOCALE d'un instant dans un fuseau, sous la forme que le service lit : « 2026-10-26T14:00 » */
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}
/* le prochain changement d'heure d'automne en Europe (le dernier dimanche d'octobre) : le lundi d'AVANT, le lundi d'APRÈS et celui d'après — tous dans le futur de la machine */
function scenarioDst(maintenant) {
  const dernierDimanche = (a) => { const d = new Date(Date.UTC(a, 9, 31)); while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1); return d.getTime(); };
  let a = new Date(maintenant).getUTCFullYear(), d = dernierDimanche(a);
  if (d - 6 * JOUR < maintenant + 2 * JOUR) { a++; d = dernierDimanche(a); }
  return { avant: ymd(d - 6 * JOUR), apres: ymd(d + JOUR), apres2: ymd(d + 8 * JOUR), dimanche: ymd(d) };
}
/* le jour du changement d'heure de MARS (le dernier dimanche) de la prochaine année dont mars n'est pas déjà derrière nous : à Paris, 02:30 n'existe pas ce jour-là (02:00 devient 03:00) */
function trouDeMars(maintenant) {
  const dernierDimanche = (a) => { const d = new Date(Date.UTC(a, 2, 31)); while (d.getUTCDay() !== 0) d.setUTCDate(d.getUTCDate() - 1); return d.getTime(); };
  let a = new Date(maintenant).getUTCFullYear(), d = dernierDimanche(a);
  if (d < maintenant + 2 * JOUR) { a++; d = dernierDimanche(a); }
  return ymd(d);
}
const bannieres = (S) => S.page.evaluate(() => window.__bannieres.slice());
const choisir = async (S, sel, valeur) => { await S.page.locator(sel).filter({ visible: true }).first().selectOption(valeur); S.gestes++; };
const erreurInfo = (S) => lire(S, '#info-erreur');
/* ce que la fiche montre, lu dans la page (le texte de chaque ligne, les gestes offerts, les liens .ics) */
const lireFiche = (S) => S.page.evaluate(() => {
  const c = document.getElementById('info-corps'), net = (e) => e.textContent.replace(/\s+/g, ' ').trim(), t = (s) => { const e = c.querySelector(s); return e ? net(e) : null; };
  return {
    nom: t('.info-nom'), sous: t('.info-sous'), annulee: !!Array.from(c.querySelectorAll('.info-erreur')).find(e => /est annulée/.test(e.textContent)),
    infos: Array.from(c.querySelectorAll('.carte > div.reglage')).map(net),
    participants: Array.from(c.querySelectorAll('.contact.avec-actions')).filter(e => !e.querySelector('[data-reu="inviter"]')).map(e => net(e.querySelector('.contact-texte'))),
    gestes: Array.from(c.querySelectorAll('[data-reu]')).map(e => e.dataset.reu + (e.dataset.statut ? ':' + e.dataset.statut : '') + (e.dataset.min ? ':' + e.dataset.min : '')),
    cochees: Array.from(c.querySelectorAll('[aria-checked="true"]')).map(e => (e.dataset.statut || e.dataset.min || e.dataset.portee || e.dataset.reu)),
    liens: Array.from(c.querySelectorAll('a[download]')).map(e => [e.href, net(e)]),
    inviter: Array.from(c.querySelectorAll('[data-reu="inviter"]')).map(e => e.dataset.uid),
  };
});
/* chaque cible de la fiche et de l'agenda fait 44 px au moins au doigt (l'élément qui RÉPOND : le bouton lui-même) */
const petitesCibles = (S, sel) => S.page.evaluate((s) => Array.from(document.querySelectorAll(s)).filter(e => e.getClientRects().length > 0 && !e.hidden).map(e => { const r = e.getBoundingClientRect(); return [e.dataset.reu || e.id || e.className, Math.round(r.width), Math.round(r.height)]; }).filter(x => x[2] < 43.5 || x[1] < 43.5), sel);

/* un service : la bêta (tout ouvert) avec un relais SMTP de banc et une horloge décalable, la bêta SANS relais, un service à la formule de PRODUCTION */
const CONFIG_BASE = { pulsationMs: 3000, presenceGraceMs: 500, balayageMs: 500, beta: { relectureMs: 300, timeoutMs: 1500 }, quotas: QUOTAS };
async function personnes(svc, og, logins) {
  const c = {};
  for (const l of logins) c[l] = await T.connecter(svc, og, l, MOTS[l]);
  return c;
}
/* deux personnes sont contacts l'une de l'autre (par le lien de contact : le geste que la page offre ailleurs) */
async function contacts(x, y) {
  const l = await x.post('/api/contacts/lien', {});
  if (l.code !== 201) throw new Error('lien de contact refusé : ' + l.code);
  const a = await y.post('/api/liens/accepter', { code: l.j.code });
  if (a.code !== 200) throw new Error('lien de contact non accepté : ' + a.code);
}

/* ═══ A. LA BÊTA : TOUT OUVERT — PROGRAMMER, RÉPONDRE, RAPPELER, MODIFIER, ANNULER, SUPPRIMER, LE .ICS, LE COURRIEL ═════════════════════════════════════ */
async function parcoursA(b, ctx) {
  const { svc, og, relais } = ctx;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const nb = (req, ...args) => Number(sql(req, ...args).n);
  const P = await personnes(svc, og, ['alice', 'bruno', 'dora', 'chloe']);
  await contacts(P.alice, P.bruno); await contacts(P.alice, P.dora);
  const A = await ouvrir(b, svc.base, PROFILS.iphone), B = await ouvrir(b, svc.base, PROFILS.bureau, { tz: NY }), D = await ouvrir(b, svc.base, PROFILS.iphone), Z = await ouvrir(b, svc.base, PROFILS.bureau);
  A.nom = 'Alice'; B.nom = 'Bruno'; D.nom = 'Dora'; Z.nom = 'Chloé';
  const tous = [A, B, D, Z];
  await connecter(A, 'alice'); await connecter(B, 'bruno'); await connecter(D, 'dora'); await connecter(Z, 'chloe');
  const DST = scenarioDst(Date.now());
  const OCC = [instantParis(DST.avant, 14, 0), instantParis(DST.apres, 14, 0), instantParis(DST.apres2, 14, 0)];
  vrai('population : l\'oracle trouve les trois instants (14:00 à Paris, avant et après le changement d\'heure du ' + DST.dimanche + ')', OCC.every(Number.isFinite) && OCC[1] - OCC[0] === 7 * JOUR + H && OCC[2] - OCC[1] === 7 * JOUR);
  vrai('population : à New York l\'heure diffère de celle de Paris avant ET après (08:00 puis 09:00, c\'est ce que l\'écran de Bruno doit montrer)', heureDans(OCC[0], NY) !== heureDans(OCC[0], PARIS) && heureDans(OCC[0], NY) !== heureDans(OCC[1], NY));

  console.log('── L\'agenda vide (au doigt, iPhone 393) ──');
  await onglet(A, 'reunions');
  vrai('population : le service ne tient AUCUNE réunion (l\'agenda vide est donc vrai, ce n\'est pas une liste qui n\'a pas chargé)', nb('SELECT COUNT(*) AS n FROM reunion') === 0);
  await verifier('l\'onglet Réunions : son titre, la semaine, sept jours dont UN SEUL « aujourd\'hui » (et c\'est le jour choisi), « Programmer », et « Aucune réunion ce jour-là »', A, () => {
    const auj = document.querySelectorAll('#sem-jours [aria-current="date"]');
    return document.getElementById('titre-reunions').textContent === 'Réunions' && document.querySelectorAll('#sem-jours .jour').length === 7 && auj.length === 1 && auj[0].getAttribute('aria-pressed') === 'true'
      && !!document.getElementById('btn-reunion-nouvelle') && /Aucune réunion ce jour-là/.test(document.getElementById('liste-reunions').textContent);
  }, null, 10000, () => lire(A, '#vue-reunions'));
  v('chaque cible tactile de l\'agenda mesure 44 px au moins (population : sept jours, deux flèches, le titre de la semaine, « Programmer »)', [(await A.page.evaluate(() => document.querySelectorAll('#sem-jours .jour, .sem-fleche, #sem-titre, #btn-reunion-nouvelle').length)), await petitesCibles(A, '#sem-jours .jour, .sem-fleche, #sem-titre, #btn-reunion-nouvelle')], [11, []]);
  await capture(A, 'r1-agenda-vide');
  await largeur(A, 'Réunions (vide)');

  console.log('\n── « Programmer » : le formulaire, ses refus locaux, une série hebdomadaire de trois dates qui traverse le changement d\'heure ──');
  await toucher(A, '#btn-reunion-nouvelle');
  await verifier('la feuille « Nouvelle réunion » s\'ouvre avec ses champs et la liste des gens qu\'on peut inviter', A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre') && document.querySelectorAll('#rf-invites [data-uid]').length === 2, null, 8000, () => texteCorps(A));
  const form = await A.page.evaluate(() => {
    const ids = ['rf-titre', 'rf-lieu', 'rf-debut', 'rf-fin', 'rf-tz', 'rf-rep'], el = (i) => document.getElementById(i);
    return {
      presents: ids.map(i => !!el(i)), tz: el('rf-tz').value, rep: el('rf-rep').value, finRepCachee: el('rf-fin-rep').hidden, polices: ids.map(i => parseFloat(getComputedStyle(el(i)).fontSize)), hauteurs: ids.map(i => Math.round(el(i).getBoundingClientRect().height)),
      rappels: Array.from(document.querySelectorAll('#rf-rappels [data-min]')).map(e => [e.dataset.min, e.getAttribute('aria-checked')]),
      invites: Array.from(document.querySelectorAll('#rf-invites [data-uid]')).map(e => e.querySelector('.contact-nom').textContent), n: el('rf-invites-n').textContent,
      notifier: document.querySelector('[data-reu="form-notifier"]').getAttribute('aria-checked'), debut: el('rf-debut').value, fin: el('rf-fin').value,
    };
  });
  v('le formulaire neuf : six champs, le fuseau de l\'appareil (Paris), pas de répétition (sa fin cachée), le rappel de 15 minutes seul coché, « Notifier » allumé, aucun invité choisi', [form.presents, form.tz, form.rep, form.finRepCachee, form.rappels, form.n, form.notifier],
    [[true, true, true, true, true, true], PARIS, 'aucune', true, [['5', 'false'], ['15', 'true'], ['60', 'false'], ['1440', 'false']], '0', 'true']);
  v('… les deux contacts (Bruno, Dora) sont proposés', form.invites.slice().sort(), ['Bruno Petit', 'Dora Leroy']);
  vrai('… le début est une heure pleine à venir et la fin une heure plus tard', /^\d{4}-\d{2}-\d{2}T\d{2}:00$/.test(form.debut) && Date.parse(form.fin + ':00Z') - Date.parse(form.debut + ':00Z') === H);
  v('⛔ chaque champ fait 16 px de police au moins (Safari zoomerait la page au toucher) et 44 px de haut', [form.polices.every(p => p >= 16), form.hauteurs.every(h => h >= 43)], [true, true]);
  await capture(A, 'r2-formulaire');
  await largeur(A, 'formulaire « Nouvelle réunion »');
  /* les refus d'ICI : rien ne part au service */
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('sans titre : « Donne un titre à la réunion. »', A, () => /Donne un titre à la réunion/.test(document.getElementById('info-erreur').textContent), null, 4000, () => erreurInfo(A));
  await saisir(A, '#rf-titre', TITRE);
  await saisir(A, '#rf-debut', DST.avant + 'T14:00');
  v('changer le début DÉPLACE la fin d\'autant (la durée d\'une heure est gardée)', await A.page.evaluate(() => document.getElementById('rf-fin').value), DST.avant + 'T15:00');
  await saisir(A, '#rf-fin', DST.avant + 'T13:00');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('une fin avant le début : « La fin de la réunion doit tomber après son début. »', A, () => /La fin de la réunion doit tomber après son début/.test(document.getElementById('info-erreur').textContent), null, 4000, () => erreurInfo(A));
  await saisir(A, '#rf-fin', DST.avant + 'T15:00');
  /* « Tous les mois » un 31 : les mois qui n'ont pas de 31 sont sautés — la page le DIT avant */
  await choisir(A, '#rf-rep', 'mensuelle');
  v('« Tous les mois » un ' + Number(DST.avant.slice(8, 10)) + ' : aucune remarque', await A.page.evaluate(() => document.getElementById('rf-rep-note').hidden), true);
  await saisir(A, '#rf-debut', DST.avant.slice(0, 8) + '31T14:00');
  await verifier('« Tous les mois » un 31 : la page DIT que les mois sans 31 sont sautés', A, () => !document.getElementById('rf-rep-note').hidden && /Les mois qui n'ont pas de 31 sont sautés/.test(document.getElementById('rf-rep-note').textContent), null, 4000, () => texteCorps(A));
  await saisir(A, '#rf-debut', DST.avant.slice(0, 8) + '29T14:00');
  v('… un 29 aussi (la borne basse)', await A.page.evaluate(() => [document.getElementById('rf-rep-note').hidden, /n'ont pas de 29 /.test(document.getElementById('rf-rep-note').textContent)]), [false, true]);
  await saisir(A, '#rf-debut', DST.avant.slice(0, 8) + '28T14:00');
  v('… et un 28 jamais (la borne haute de ce qui n\'est pas sauté)', await A.page.evaluate(() => document.getElementById('rf-rep-note').hidden), true);
  await saisir(A, '#rf-debut', DST.avant + 'T14:00');
  v('… et la remarque reste éteinte quand le jour redevient un ' + Number(DST.avant.slice(8, 10)), await A.page.evaluate(() => document.getElementById('rf-rep-note').hidden), true);
  await saisir(A, '#rf-fin', DST.avant + 'T15:00');
  await choisir(A, '#rf-rep', 'hebdomadaire');
  await verifier('« Toutes les semaines » montre la fin de la répétition (ni date ni nombre tant qu\'on n\'a pas choisi)', A, () => !document.getElementById('rf-fin-rep').hidden && document.getElementById('rf-jusqua-c').hidden && document.getElementById('rf-n-c').hidden, null, 4000);
  await choisir(A, '#rf-fin-type', 'nombre');
  await verifier('« Après un nombre de fois » montre le nombre (et cache la date)', A, () => !document.getElementById('rf-n-c').hidden && document.getElementById('rf-jusqua-c').hidden, null, 4000);
  await saisir(A, '#rf-n', '1');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('un nombre de réunions de 1 : « Le nombre de réunions est un entier entre 2 et 1 000. »', A, () => /entier entre 2 et 1 000/.test(document.getElementById('info-erreur').textContent), null, 4000, () => erreurInfo(A));
  v('… et RIEN n\'est parti au service (population : le service ne tient toujours aucune réunion, la page n\'a envoyé aucune requête d\'écriture de réunion)', [nb('SELECT COUNT(*) AS n FROM reunion'), A.postes.filter(p => p.chemin === '/api/reunions').length], [0, 0]);
  await saisir(A, '#rf-n', '3');
  /* une heure qui N'EXISTE PAS (le trou de mars) : le SERVICE la refuse — c'est lui qui connaît les fuseaux — et la page le dit */
  const TROU = trouDeMars(Date.now());
  await saisir(A, '#rf-debut', TROU + 'T02:30');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('⛔ ' + TROU + ' à 02:30 n\'existe pas à Paris (le changement d\'heure de mars) : le SERVICE la refuse et la page le dit — « Cette heure n\'existe pas ce jour-là »', A, () => /Cette heure n'existe pas ce jour-là/.test(document.getElementById('info-erreur').textContent), null, 8000, () => erreurInfo(A));
  v('… (population : la demande est bien partie, et le service n\'a rien créé)', [A.postes.filter(p => p.chemin === '/api/reunions').length, nb('SELECT COUNT(*) AS n FROM reunion')], [1, 0]);
  await saisir(A, '#rf-debut', DST.avant + 'T14:00');
  await saisir(A, '#rf-fin', DST.avant + 'T15:00');
  await saisir(A, '#rf-lieu', LIEU);
  await toucher(A, '#rf-rappels [data-min="1440"]');
  /* les invités : la recherche filtre, et ce qu'on a coché RESTE coché quand le filtre change */
  await saisir(A, '#rf-recherche', 'dor');
  await verifier('la recherche « dor » ne laisse que Dora', A, () => { const l = Array.from(document.querySelectorAll('#rf-invites .contact-nom')).map(e => e.textContent); return l.length === 1 && l[0] === 'Dora Leroy'; }, null, 4000);
  await saisir(A, '#rf-recherche', '');
  await toucher(A, '#rf-invites [data-uid]:has-text("Bruno Petit")');
  await verifier('Bruno est coché, le compteur dit 1', A, () => document.getElementById('rf-invites-n').textContent === '1' && Array.from(document.querySelectorAll('#rf-invites [data-uid]')).some(e => /Bruno/.test(e.textContent) && e.getAttribute('aria-checked') === 'true'), null, 4000);
  await saisir(A, '#rf-recherche', 'dor'); await saisir(A, '#rf-recherche', '');
  v('… et il le RESTE après avoir filtré puis vidé la recherche (Dora n\'est pas cochée)', await A.page.evaluate(() => Array.from(document.querySelectorAll('#rf-invites [data-uid]')).map(e => [e.querySelector('.contact-nom').textContent, e.getAttribute('aria-checked')]).sort((x, y) => x[0] < y[0] ? -1 : 1)), [['Bruno Petit', 'true'], ['Dora Leroy', 'false']]);
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('« Programmer » : la fiche de la réunion s\'ouvre, à son titre', A, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom') && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 12000, () => texteCorps(A));
  const R = sql('SELECT id FROM reunion').id;
  vrai('population : le service tient UNE réunion, de ' + (nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', R)) + ' invités (l\'organisateur et Bruno)', /^r_[0-9a-f]{32}$/.test(R) && nb('SELECT COUNT(*) AS n FROM reunion') === 1 && nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', R) === 2);
  v('⛔ le service a rangé l\'heure en UTC : les trois occurrences de l\'oracle, la série garde 14:00 à Paris de part et d\'autre du ' + DST.dimanche, [Number(sql('SELECT debut AS n FROM reunion WHERE id = ?', R).n), sql('SELECT tz AS n FROM reunion WHERE id = ?', R).n, sql('SELECT rep AS n FROM reunion WHERE id = ?', R).n, nb('SELECT n AS n FROM reunion WHERE id = ?', R)], [OCC[0], PARIS, 'hebdomadaire', 3]);

  console.log('\n── La fiche de l\'organisateur (Alice) ──');
  const fa = await lireFiche(A);
  v('la fiche : le titre, « Vous organisez cette réunion », le jour et l\'horaire, la répétition, le lieu', [fa.nom, fa.sous, fa.infos.length, /Lundi/.test(fa.infos[0]) && fa.infos[0].includes(libJour(DST.avant).split(' ').slice(1).join(' ')) && /14:00 – 15:00/.test(fa.infos[0]), fa.infos[1], fa.infos[2]],
    [TITRE, 'Vous organisez cette réunion', 3, true, 'Se répète toutes les semaines, 3 fois', LIEU]);
  v('… les deux participants : elle (organisatrice, « vous ») et Bruno (en attente)', fa.participants.map(p => p.replace(/\s+/g, ' ')), ['Alice Martin (vous)Organisateur', 'Bruno PetitEn attente']);
  const attendusHote = ['rappel:5', 'rappel:15', 'rappel:60', 'rappel:1440', 'retirer', 'inviter', 'conversation', 'modifier', 'courriel-ouvrir', 'annuler-demander', 'supprimer-demander'];
  v('⛔ ses gestes d\'organisatrice : modifier, envoyer par courriel, annuler, supprimer, inviter, retirer — et AUCUNE réponse à donner à sa propre réunion', [attendusHote.filter(g => !fa.gestes.includes(g)), fa.gestes.filter(g => /^reponse/.test(g))], [[], []]);
  v('… ses rappels : ceux de la réunion (15 minutes, 1 jour), cochés', fa.cochees.filter(c => /^\d+$/.test(c)).sort(), ['1440', '15']);
  v('⛔ le fichier .ics : une adresse de CE service pour UNE date et pour TOUTE la série, qui se TÉLÉCHARGE', [fa.liens.map(l => l[1]), fa.liens.map(l => l[0].replace(R, 'R').replace(/\d{9,}/, 'N'))], [['Cette date (.ics)', 'Toute la série (.ics)'], [svc.base + '/api/reunions/R/ics?occurrence=N', svc.base + '/api/reunions/R/ics?serie=1']]);
  v('… Dora est proposée à l\'invitation (pas Bruno, déjà invité)', fa.inviter.length, 1);
  v('chaque cible de la fiche mesure 44 px au moins (population : ses boutons et ses liens)', [(await A.page.evaluate(() => document.querySelectorAll('#info-corps [data-reu], #info-corps a.mini, #g-annuler').length)) > 10, await petitesCibles(A, '#info-corps [data-reu], #info-corps a.mini, #g-annuler')], [true, []]);
  await capture(A, 'r3-fiche-organisateur');
  await largeur(A, 'fiche (organisateur)');

  console.log('\n── Bruno (bureau, à New York) : l\'invitation arrive SANS recharger, à l\'heure de New York ──');
  await verifier('⛔ la bannière dit l\'invitation, dans le fuseau de Bruno (08:00 à New York, pas 14:00 de Paris) — il n\'avait encore ouvert AUCUN écran d\'agenda', B,
    (arg) => window.__bannieres.some(t => t.includes('Alice Martin vous a invité à une réunion : ' + arg.ny) && !t.includes(arg.paris)), { ny: dit(OCC[0], NY), paris: dit(OCC[0], PARIS) }, 10000, () => bannieres(B).then(l => l.join(' // ')));
  await onglet(B, 'reunions');
  for (let i = 0; i < 60; i++) {
    if (await B.page.evaluate((l) => !!document.querySelector('#sem-jours .jour[aria-label^="' + l + ',"]'), libJour(DST.avant))) break;
    await toucher(B, '#sem-suiv');
    await B.page.waitForFunction(() => document.getElementById('liste-reunions').getAttribute('aria-busy') !== 'true', null, { timeout: 5000 }).catch(() => {});
  }
  await toucher(B, '#sem-jours .jour[aria-label^="' + libJour(DST.avant) + ',"]');
  await verifier('⛔ l\'agenda de Bruno montre la réunion à SON heure (' + heureDans(OCC[0], NY) + '), avec l\'heure de Paris à côté, l\'organisatrice, « À répondre »', B, (a) => {
    const l = document.querySelector('#liste-reunions .reunion-ligne'); if (!l) return false;
    const sous = Array.from(l.querySelectorAll('.reunion-sous')).map(e => e.textContent);
    return l.querySelector('.reunion-titre').textContent === a.titre && l.querySelector('.reunion-heure').textContent === a.h && sous.some(t => /Alice Martin · 2 participants/.test(t)) && sous.some(t => t === 'Heure de Paris : 14:00 – 15:00')
      && /À répondre/.test(l.querySelector('.reunion-etat').textContent) && l.querySelector('.reunion-etat').classList.contains('attention');
  }, { titre: TITRE, h: heureDans(OCC[0], NY) + heureDans(OCC[0] + H, NY) }, 12000, () => lire(B, '#liste-reunions'));
  await capture(B, 'r4-agenda-bruno');
  await largeur(B, 'Réunions (Bruno, liste)');
  await toucher(B, '#liste-reunions .reunion-ligne');
  await verifier('Bruno ouvre la fiche', B, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom') && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 10000, () => texteCorps(B));
  const fb = await lireFiche(B);
  v('⛔ la fiche de Bruno : « Organisée par Alice Martin », SON heure avec celle de Paris entre parenthèses, la répétition', [fb.sous, /08:00 – 09:00 \(14:00 – 15:00 à Paris\)/.test(fb.infos[0]) || fb.infos[0].includes(heureDans(OCC[0], NY) + ' – ' + heureDans(OCC[0] + H, NY) + ' (14:00 – 15:00 à Paris)'), fb.infos[1]], ['Organisée par Alice Martin', true, 'Se répète toutes les semaines, 3 fois']);
  v('… trois réponses possibles, AUCUNE choisie ; ses rappels sont ceux de la réunion (15 minutes, 1 jour)', [fb.gestes.filter(g => /^reponse/.test(g)), fb.cochees.filter(c => /^(accepte|decline|peutetre)$/.test(c)), fb.cochees.filter(c => /^\d+$/.test(c)).sort()], [['reponse:accepte', 'reponse:peutetre', 'reponse:decline'], [], ['1440', '15']]);
  v('⛔ et RIEN de l\'organisatrice : ni modifier, ni annuler, ni supprimer, ni courriel, ni inviter, ni retirer (population : il a des gestes — réponse, rappels, conversation)', [fb.gestes.length > 5, fb.gestes.filter(g => ['modifier', 'annuler-demander', 'supprimer-demander', 'courriel-ouvrir', 'inviter', 'retirer'].includes(g))], [true, []]);
  await capture(B, 'r5-fiche-invite');
  await largeur(B, 'fiche (invité)');

  console.log('\n── La réponse de Bruno : Alice la voit EN DIRECT, sur sa fiche restée ouverte ──');
  v('(avant) Alice voit Bruno « En attente »', (await lireFiche(A)).participants.filter(p => /Bruno/.test(p)), ['Bruno PetitEn attente']);
  await toucher(B, '[data-reu="reponse"][data-statut="accepte"]');
  await verifier('Bruno : « Accepter » est choisi', B, () => { const p = document.querySelector('[data-reu="reponse"][data-statut="accepte"]'); return !!p && p.getAttribute('aria-checked') === 'true' && document.querySelectorAll('[data-reu="reponse"][aria-checked="true"]').length === 1; }, null, 8000, () => texteCorps(B));
  vrai('… et le service le tient', sql('SELECT statut AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.bruno.moi.id).n === 'accepte');
  await verifier('⛔ Alice le voit SANS toucher : « Bruno Petit — Accepté »', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Bruno Petit/.test(e.textContent) && /Accepté/.test(e.textContent)), null, 10000, () => texteCorps(A));
  /* les deux autres réponses : la dernière est celle qui compte, et Alice la voit à chaque fois */
  await toucher(B, '[data-reu="reponse"][data-statut="peutetre"]');
  await verifier('Bruno répond « Peut-être » : Alice le voit EN DIRECT', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Bruno Petit/.test(e.textContent) && /Peut-être/.test(e.textContent)), null, 10000, () => texteCorps(A));
  await toucher(B, '[data-reu="reponse"][data-statut="decline"]');
  await verifier('Bruno « Refuse » : son choix est « Refuser » (et lui seul) ; Alice le voit « Refusé »', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Bruno Petit/.test(e.textContent) && /Refusé/.test(e.textContent)), null, 10000, () => texteCorps(A));
  await verifier('… chez Bruno une seule réponse est choisie, « Refuser » (sa page se redessine APRÈS l\'événement qu\'Alice a reçu : on attend la sienne)', B, () => { const c = document.querySelectorAll('[data-reu="reponse"][aria-checked="true"]'); return c.length === 1 && c[0].dataset.statut === 'decline'; }, null, 8000, () => texteCorps(B));
  v('… et le service tient « decline »', sql('SELECT statut AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.bruno.moi.id).n, 'decline');
  await toucher(B, '[data-reu="reponse"][data-statut="accepte"]');
  await verifier('Bruno ré-accepte : Alice le voit « Accepté » de nouveau', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Bruno Petit/.test(e.textContent) && /Accepté/.test(e.textContent)), null, 10000, () => texteCorps(A));
  /* ses rappels à lui */
  await toucher(B, '#reu-rappels [data-min="60"]');
  await verifier('Bruno ajoute « 1 heure avant » : coché, et « Rétablir les rappels de la réunion » paraît', B, () => document.querySelector('#reu-rappels [data-min="60"]').getAttribute('aria-checked') === 'true' && !!document.querySelector('[data-reu="rappels-defaut"]'), null, 8000, () => texteCorps(B));
  v('⛔ le service tient SES rappels (5/15/60/1440 → 15, 60, 1440) et ceux d\'Alice n\'ont pas bougé (population : sa ligne existe, sans rappels à elle)', [sql('SELECT rappels AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.bruno.moi.id).n, nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ? AND rappels IS NULL', R, P.alice.moi.id)], ['[15,60,1440]', 1]);
  await toucher(B, '[data-reu="rappels-defaut"]');
  await verifier('« Rétablir » : ses rappels redeviennent ceux de la réunion, et le bouton disparaît', B, () => document.querySelector('#reu-rappels [data-min="60"]').getAttribute('aria-checked') === 'false' && !document.querySelector('[data-reu="rappels-defaut"]'), null, 8000, () => texteCorps(B));

  console.log('\n── La conversation de la réunion : une conversation à plusieurs, dont le titre mène à la réunion ──');
  await toucher(B, '[data-reu="conversation"]');
  await verifier('la conversation s\'ouvre : son titre est celui de la réunion, avec les phrases système de la réunion', B, (t) => document.documentElement.dataset.conv === '1' && document.getElementById('conv-titre').textContent.includes(t) && Array.from(document.querySelectorAll('#conv-messages .systeme')).some(e => /Alice Martin a programmé la réunion/.test(e.textContent)), TITRE, 12000, () => lire(B, '#conv-ecran'));
  v('… son avatar est l\'agenda (une icône, pas des initiales) et son étiquette dit « voir la réunion »', await B.page.evaluate(() => [!!document.querySelector('#conv-titre .avatar svg'), document.getElementById('conv-titre').getAttribute('aria-label')]), [true, TITRE + ' — voir la réunion']);
  await saisir(B, '#saisie', 'Je serai là WQXZ');
  await toucher(B, '#envoyer');
  await verifier('Bruno écrit dans la conversation comme dans un groupe', B, () => Array.from(document.querySelectorAll('#conv-messages .msg, #conv-messages .bulle')).some(e => /Je serai là WQXZ/.test(e.textContent)), null, 8000, () => lire(B, '#conv-messages'));
  await toucher(B, '#conv-titre');
  await verifier('⛔ toucher le titre de la conversation ouvre la RÉUNION (pas les infos d\'un groupe)', B, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom') && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 8000, () => etatPage(B));
  v('… et la fiche ne propose PAS de quitter la CONVERSATION seule (population : la fiche a des gestes) — la sortie de l\'invité est « Quitter la RÉUNION », qui emporte les deux', await B.page.evaluate(() => [document.querySelectorAll('#info-corps [data-reu]').length > 5, /Quitter la conversation|Quitter le groupe/.test(document.getElementById('info-corps').textContent), !!document.querySelector('#info-corps [data-reu="quitter-demander"]')]), [true, false, true]);
  await fermerFeuille(B);

  console.log('\n── Chloé n\'est pas invitée : l\'adresse de la réunion ne lui montre RIEN ──');
  await Z.page.goto(svc.base + '/#reunions/' + R);
  await verifier('⛔ elle reçoit « Cette réunion n\'existe plus. » et aucune fiche ne s\'ouvre', Z, () => /Cette réunion n'existe plus/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'), null, 10000, () => etatPage(Z));
  v('… et rien de la réunion n\'est dans sa page (le titre, le lieu : population — la page est chargée, elle a des éléments)', await Z.page.evaluate((a) => [document.getElementById('app').innerText.length > 50, document.getElementById('app').innerText.includes(a.t), document.getElementById('app').innerText.includes(a.l)], { t: TITRE, l: LIEU }), [true, false, false]);

  const FAUX = 'r_' + 'e'.repeat(32);
  await Z.page.goto(svc.base + '/#reunions/r_zz');
  await Z.page.goto(svc.base + '/#reunions/' + FAUX);
  await T.attendre(() => Z.requetes.some(r => r.endsWith('/api/reunions/' + FAUX)), 8000, 20);
  v('⛔ un identifiant mal formé (« #reunions/r_zz ») n\'ouvre RIEN et ne part PAS au service (population : l\'adresse bien formée qui le suivait, elle, est partie)', [Z.requetes.some(r => r.endsWith('/api/reunions/' + FAUX)), Z.requetes.some(r => /r_zz/.test(r))], [true, false]);

  console.log('\n── Dora : invitée en cours de route, puis retirée — sa fiche ouverte se ferme EN DIRECT ──');
  await toucher(A, '[data-reu="inviter"]');
  await verifier('Alice invite Dora : trois participants, et plus personne à inviter', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).filter(e => !e.querySelector('[data-reu="inviter"]')).length === 3 && !document.querySelector('[data-reu="inviter"]'), null, 10000, () => texteCorps(A));
  v('… Dora est « En attente » (et la section « Inviter » a disparu)', await A.page.evaluate(() => [Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Dora Leroy/.test(e.textContent) && /En attente/.test(e.textContent) && !e.querySelector('[data-reu="inviter"]')), !!document.querySelector('[data-reu="inviter"]')]), [true, false]);
  await verifier('⛔ la bannière de Dora : l\'invitation, à l\'heure de Paris (son fuseau)', D, (arg) => window.__bannieres.some(t => t.includes('Alice Martin vous a invité à une réunion : ' + arg)), dit(OCC[0], PARIS), 10000, () => bannieres(D).then(l => l.join(' // ')));
  await D.page.goto(svc.base + '/#reunions/' + R);
  await verifier('Dora ouvre la réunion par son adresse (le toucher d\'une notification) : la fiche s\'ouvre', D, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom') && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 12000, () => etatPage(D));
  await toucher(A, '[data-reu="retirer"][data-uid="' + P.dora.moi.id + '"]');
  await verifier('Alice retire Dora : deux participants de nouveau (et Dora est de nouveau proposée à l\'invitation)', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).filter(e => !e.querySelector('[data-reu="inviter"]')).length === 2 && !!document.querySelector('[data-reu="inviter"]'), null, 10000, () => texteCorps(A));
  await verifier('⛔ la fiche de Dora SE FERME toute seule : « Cette réunion n\'existe plus, ou tu n\'y es plus invité. »', D, () => /Cette réunion n'existe plus/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'), null, 12000, () => etatPage(D));

  console.log('\n── Quitter la réunion : la sortie de l\'invité, confirmée — l\'organisatrice la voit EN DIRECT ──');
  const convR = sql('SELECT conv AS n FROM reunion WHERE id = ?', R).n;
  await toucher(A, '[data-reu="inviter"]');
  await verifier('Alice réinvite Dora : trois participants', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).filter(e => !e.querySelector('[data-reu="inviter"]')).length === 3 && !document.querySelector('[data-reu="inviter"]'), null, 10000, () => texteCorps(A));
  await D.page.goto(svc.base + '/#reunions/' + R);
  await verifier('Dora rouvre la réunion : sa fiche porte « Quitter la réunion » (la rubrique « Invité »)', D, () => document.getElementById('feuille-titre').textContent === 'Réunion' && !!document.querySelector('[data-reu="quitter-demander"]') && !document.querySelector('[data-reu="annuler-demander"]'), null, 12000, () => etatPage(D));
  v('⛔ la fiche d\'Alice, l\'organisatrice, n\'offre PAS « Quitter la réunion » : elle annule ou supprime', await A.page.evaluate(() => [!!document.querySelector('[data-reu="quitter-demander"]'), !!document.querySelector('[data-reu="annuler-demander"]')]), [false, true]);
  vrai('… la cible tactile du bouton fait 44 px au moins', (await D.page.evaluate(() => document.querySelector('[data-reu="quitter-demander"]').getBoundingClientRect().height)) >= 44);
  await toucher(D, '[data-reu="quitter-demander"]');
  await verifier('« Quitter la réunion » demande confirmation et dit ce qui arrive (l\'organisateur peut réinviter)', D, () => /Quitter cette réunion \?/.test(document.getElementById('info-corps').textContent) && /peut te réinviter/.test(document.getElementById('info-corps').textContent) && !!document.querySelector('[data-reu="quitter-confirmer"]') && !!document.querySelector('[data-reu="confirmation-retour"]'), null, 6000, () => texteCorps(D));
  await toucher(D, '[data-reu="confirmation-retour"]');
  await verifier('« Rester » : la demande disparaît, le geste est revenu', D, () => !document.querySelector('[data-reu="quitter-confirmer"]') && !!document.querySelector('[data-reu="quitter-demander"]'), null, 6000, () => texteCorps(D));
  vrai('… et RIEN n\'a changé au service (population : Dora est invitée, membre de la conversation)', nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.dora.moi.id) === 1 && nb('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', convR, P.dora.moi.id) === 1);
  const registreAvant = nb(`SELECT COUNT(*) AS n FROM purge WHERE genre IN ('reunion_invite', 'groupe_membre') AND objet LIKE ?`, '%|' + P.dora.moi.id + '|%');
  await toucher(D, '[data-reu="quitter-demander"]');
  await toucher(D, '[data-reu="quitter-confirmer"]');
  await verifier('⛔ Dora quitte : sa feuille se ferme et la page dit « Tu as quitté la réunion » (pas « n\'existe plus »)', D, () => /Tu as quitté la réunion/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'), null, 12000, () => etatPage(D));
  v('⛔ le service tient la sortie : plus d\'invitation, plus membre de la conversation, DEUX lignes de plus au registre des effacements (la réunion et le groupe) — et la réunion existe toujours', [nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.dora.moi.id), nb('SELECT COUNT(*) AS n FROM membre WHERE conv = ? AND uid = ? AND quitte_le IS NULL', convR, P.dora.moi.id), nb(`SELECT COUNT(*) AS n FROM purge WHERE genre IN ('reunion_invite', 'groupe_membre') AND objet LIKE ?`, '%|' + P.dora.moi.id + '|%') - registreAvant, nb('SELECT COUNT(*) AS n FROM reunion WHERE id = ?', R)], [0, 0, 2, 1]);
  await verifier('⛔ la fiche d\'Alice, restée ouverte, ne liste plus Dora (deux participants, Dora de nouveau proposée à l\'invitation) — EN DIRECT, sans toucher', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).filter(e => !e.querySelector('[data-reu="inviter"]')).length === 2 && !!document.querySelector('[data-reu="inviter"]'), null, 12000, () => texteCorps(A));
  await onglet(D, 'reunions');
  await verifier('… et l\'agenda de Dora n\'a plus la réunion', D, (t) => !Array.from(document.querySelectorAll('#liste-reunions .reunion-titre, #liste-reunions .reunion-ligne')).some(e => e.textContent.includes(t)), TITRE, 12000, () => lire(D, '#vue-reunions'));

  return { tous, sql, nb, P, A, B, D, Z, R, DST, OCC };
}

/* la suite du parcours A : l'agenda d'Alice, le fichier .ics, le courriel, modifier, les rappels, annuler et supprimer */
const deplier = (t) => t.replace(/\r\n[ \t]/g, '');
const enUtc = (t) => new Date(t).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
async function telecharger(S, sel) {
  const [dl] = await Promise.all([S.page.waitForEvent('download', { timeout: 10000 }), toucher(S, sel)]);
  return { nom: dl.suggestedFilename(), texte: fs.readFileSync(await dl.path(), 'utf8') };
}
const dernierPost = (S, motif) => { const l = S.postes.filter(p => motif.test(p.chemin)); return l.length ? JSON.parse(l[l.length - 1].corps || '{}') : null; };
const ligneAgenda = (S, a, ms) => verifier(a.titre_verif, S, (x) => {
  const j = document.querySelector('#sem-jours .jour[aria-pressed="true"]'), l = document.querySelector('#liste-reunions .reunion-ligne');
  return !!j && j.getAttribute('aria-label').startsWith(x.jour + ',') && /1 réunion/.test(j.getAttribute('aria-label')) && !!l && l.querySelector('.reunion-heure').textContent === x.heures && l.querySelector('.reunion-titre').textContent === x.titre
    && x.sous.test(l.querySelector('.reunion-sous').textContent) && l.querySelector('.reunion-etat').textContent === x.etat;
}, { jour: a.jour, heures: a.heures, titre: a.titre, sous: a.sous, etat: a.etat }, ms || 12000, () => lire(S, '#vue-reunions'));

async function parcoursA2(E) {
  const { svc, relais, sql, nb, P, A, B, D, Z, R, DST, OCC } = E;

  console.log('\n── L\'agenda d\'Alice : la série garde 14:00 de part et d\'autre du changement d\'heure ──');
  await fermerFeuille(A);
  await ligneAgenda(A, { titre_verif: 'l\'agenda d\'Alice suit la réunion : le ' + libJour(DST.avant) + ' est choisi, « 14:00 / 15:00 », le titre, le lieu, 2 participants, « Organisateur »', jour: libJour(DST.avant), heures: '14:0015:00', titre: TITRE, sous: /Salle WQXZ-B · 2 participants/, etat: 'Organisateur' });
  await capture(A, 'r6-agenda-alice');
  await largeur(A, 'Réunions (Alice, une réunion)');
  await toucher(A, '#sem-suiv');
  await ligneAgenda(A, { titre_verif: '⛔ le lundi d\'APRÈS le changement d\'heure (' + libJour(DST.apres) + ') : la réunion est TOUJOURS à 14:00 (la série garde son heure locale)', jour: libJour(DST.apres), heures: '14:0015:00', titre: TITRE, sous: /Salle WQXZ-B · 2 participants/, etat: 'Organisateur' });
  const brut = await P.alice.get('/api/reunions?du=' + (OCC[0] - JOUR) + '&au=' + (OCC[2] + JOUR));
  v('… le service le dit en UTC : 12:00 puis 13:00 puis 13:00 (population : une réunion, trois occurrences)', [brut.j.reunions.length, brut.j.reunions[0].occurrences.map(o => o.debut)], [1, OCC]);
  await onglet(A, 'messages');
  await verifier('la conversation de la réunion est dans la liste d\'Alice : le titre pour nom, une icône d\'agenda, et — le dernier message étant une phrase système (Dora retirée) — « Activité de la réunion » (jamais « du groupe »)', A, (a) => {
    const c = Array.from(document.querySelectorAll('#liste-conv .conv')).find(e => e.querySelector('.conv-nom').textContent === a);
    return !!c && c.querySelector('.conv-apercu').textContent === 'Activité de la réunion' && !!c.querySelector('.avatar svg');
  }, TITRE, 12000, () => lire(A, '#liste-conv'));
  await onglet(A, 'reunions');

  console.log('\n── Le fichier .ics : téléchargé par le lien de la fiche, relu comme le ferait un agenda ──');
  await toucher(A, '#liste-reunions .reunion-ligne');
  await verifier('Alice ouvre la réunion depuis son agenda : la fiche parle de CETTE date (le deuxième lundi)', A, (a) => document.getElementById('feuille-titre').textContent === 'Réunion' && !!document.querySelector('#info-corps .carte > div.reglage') && document.querySelector('#info-corps .carte > div.reglage').textContent.toLowerCase().includes(a), libJour(DST.apres).split(' ').slice(1).join(' '), 10000, () => texteCorps(A));
  const serie = await telecharger(A, 'a.mini[href*="serie="]');
  const sd = deplier(serie.texte);
  v('⛔ « Toute la série » : un VRAI calendrier téléchargé — la règle hebdomadaire de trois dates, l\'heure LOCALE de Paris, son fuseau, les deux rappels d\'Alice',
    [/\.ics$/.test(serie.nom), sd.startsWith('BEGIN:VCALENDAR'), sd.includes('SUMMARY:' + TITRE), /RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3/.test(sd), sd.includes('DTSTART;TZID=Europe/Paris:' + DST.avant.replace(/-/g, '') + 'T140000'), sd.includes('BEGIN:VTIMEZONE'), (sd.match(/BEGIN:VALARM/g) || []).length, sd.includes(R)],
    [true, true, true, true, true, true, 2, true]);
  const date = await telecharger(A, 'a.mini[href*="occurrence="]');
  const dd = deplier(date.texte);
  v('⛔ « Cette date » : UNE occurrence — la date du deuxième lundi, sans règle de répétition (population : le fichier est un calendrier avec son titre)',
    [/\.ics$/.test(date.nom), dd.startsWith('BEGIN:VCALENDAR') && dd.includes('SUMMARY:' + TITRE), /RRULE/.test(dd), new RegExp('DTSTART[^:\\r\\n]*:(' + enUtc(OCC[1]) + '|' + DST.apres.replace(/-/g, '') + 'T140000)').test(dd)], [true, true, false, true]);
  await capture(A, 'r7-fiche-date');
  await largeur(A, 'fiche (organisateur, deuxième date)');

  console.log('\n── Le courriel : le formulaire, ses refus, un envoi qui part avec son fichier, et le plafond par adresse ──');
  vrai('population : le relais de banc n\'a reçu AUCUN courriel (et le service dit que l\'envoi est ouvert)', relais.messages.length === 0 && (await (await fetch(svc.base + '/api/config')).json()).courriel.ouvert === true);
  await toucher(A, '[data-reu="courriel-ouvrir"]');
  await verifier('« Envoyer par courriel » déplie : le champ de l\'adresse, la portée (toute la série choisie), l\'avis — et PAS « pas encore ouvert »', A, () => !!document.getElementById('rc-adresse') && !document.getElementById('reu-courriel-note') && document.querySelector('[data-reu="courriel-portee"][data-portee="serie"]').getAttribute('aria-checked') === 'true' && /L'adresse n'est pas conservée/.test(document.getElementById('reu-courriel').textContent), null, 8000, () => texteCorps(A));
  v('chaque cible du formulaire de courriel fait 44 px au moins (le champ, les deux portées, « Envoyer »)', await petitesCibles(A, '#reu-courriel input, #reu-courriel [data-reu]'), []);
  await largeur(A, 'fiche (formulaire de courriel)');
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await verifier('sans adresse : « Écris l\'adresse courriel de la personne. »', A, () => /Écris l'adresse courriel de la personne/.test(document.getElementById('info-erreur').textContent), null, 4000, () => erreurInfo(A));
  await saisir(A, '#rc-adresse', 'pas une adresse');
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await verifier('une adresse fausse : le SERVICE refuse, et la page le dit — « Cette adresse courriel n\'est pas valable. »', A, () => /Cette adresse courriel n'est pas valable/.test(document.getElementById('info-erreur').textContent), null, 8000, () => erreurInfo(A));
  v('… et rien n\'est parti (population : le relais est joignable, il n\'a reçu aucun courriel ; aucune ligne de plafond)', [relais.messages.length, nb('SELECT COUNT(*) AS n FROM courrier_envoi')], [0, 0]);
  await saisir(A, '#rc-adresse', ADRESSE);
  await toucher(A, '[data-reu="courriel-portee"][data-portee="date"]');
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await verifier('« Cette date » à une vraie adresse : « Invitation envoyée par courriel », le champ est vidé', A, () => /Invitation envoyée par courriel/.test(document.getElementById('mot').textContent) && document.getElementById('rc-adresse').value === '', null, 12000, () => etatPage(A));
  await T.attendre(() => relais.messages.length >= 1, 8000, 20);
  const m1 = relais.messages.length ? lireMessage(relais.messages[0]) : null;
  v('⛔ le relais a reçu UN courriel : à cette adresse, l\'objet fixe, de la part de l\'expéditeur du service, avec UN calendrier en pièce jointe — celui d\'UNE date (le deuxième lundi), sans règle de répétition',
    [relais.messages.length, m1 && m1.enveloppe.a, m1 && m1.sujet, m1 && m1.enveloppe.de, m1 && m1.ics && m1.ics.includes('SUMMARY:' + TITRE), m1 && m1.ics && /RRULE/.test(m1.ics), m1 && m1.ics && new RegExp('DTSTART[^:\\r\\n]*:(' + enUtc(OCC[1]) + '|' + DST.apres.replace(/-/g, '') + 'T140000)').test(deplier(m1.ics))],
    [1, [ADRESSE], 'Invitation à une réunion — OP MESSAGES', EXPEDITEUR, true, false, true]);
  v('… l\'objet est FIXE (aucun mot de la réunion : ni le titre ni le lieu ne peuvent y glisser une ligne) ; le texte, lui, nomme la réunion (titre, lieu)', m1 && [m1.sujet.includes('WQXZ'), (m1.texte || '').includes(TITRE), (m1.texte || '').includes(LIEU)], [false, true, true]);
  await toucher(A, '[data-reu="courriel-portee"][data-portee="serie"]');
  await saisir(A, '#rc-adresse', ADRESSE);
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await T.attendre(() => relais.messages.length >= 2, 12000, 20);
  const m2 = relais.messages.length >= 2 ? lireMessage(relais.messages[1]) : null;
  v('« Toute la série » à la même adresse (le deuxième envoi de la semaine, permis) : le calendrier porte la règle hebdomadaire', [relais.messages.length, m2 && /RRULE:FREQ=WEEKLY;BYDAY=MO;COUNT=3/.test(deplier(m2.ics || ''))], [2, true]);
  await saisir(A, '#rc-adresse', 'WQXZ.Dest+etiquette@Exemple.Invalid');
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await verifier('⛔ un TROISIÈME envoi à la même boîte (autre écriture : majuscules, « +étiquette ») : refusé, et la page dit pourquoi — deux invitations par adresse et par semaine', A, () => /Cette adresse a déjà reçu deux invitations de ta part cette semaine/.test(document.getElementById('info-erreur').textContent), null, 8000, () => erreurInfo(A));
  v('… le relais n\'a reçu que les DEUX premiers (le refus n\'est jamais parti) ; le service tient deux lignes de plafond, jamais l\'adresse en clair', [relais.messages.length, nb('SELECT COUNT(*) AS n FROM courrier_envoi'), (() => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare('SELECT dest_h FROM courrier_envoi').all().some(r => /wqxz|exemple/i.test(String(r.dest_h))); } finally { d.close(); } })()], [2, 2, false]);
  await toucher(A, '[data-reu="courriel-ouvrir"]');

  console.log('\n── Modifier : un lieu ne touche pas aux réponses, un horaire les remet en attente — Bruno le voit EN DIRECT ──');
  await toucher(A, '[data-reu="modifier"]');
  await verifier('« Modifier la réunion » : le formulaire porte ce que la réunion porte (titre, lieu, début, fin, fuseau, répétition, nombre, rappels) et PAS la liste des invités', A, (a) => {
    const g = (i) => document.getElementById(i);
    return document.getElementById('feuille-titre').textContent === 'Modifier la réunion' && !!g('rf-titre') && g('rf-titre').value === a.titre && g('rf-lieu').value === a.lieu && g('rf-debut').value === a.debut && g('rf-fin').value === a.fin && g('rf-tz').value === a.tz
      && g('rf-rep').value === 'hebdomadaire' && g('rf-fin-type').value === 'nombre' && g('rf-n').value === '3' && !g('rf-invites') && Array.from(document.querySelectorAll('#rf-rappels [aria-checked="true"]')).map(e => e.dataset.min).sort().join() === '1440,15';
  }, { titre: TITRE, lieu: LIEU, debut: DST.avant + 'T14:00', fin: DST.avant + 'T15:00', tz: PARIS }, 10000, () => texteCorps(A));
  await largeur(A, 'formulaire « Modifier la réunion »');
  await saisir(A, '#rf-lieu', LIEU_2);
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('un changement de LIEU : on revient à la fiche, qui montre le nouveau lieu — écrit en TEXTE (« javascript: » n\'est jamais un lien)', A, (l) => document.getElementById('feuille-titre').textContent === 'Réunion' && Array.from(document.querySelectorAll('#info-corps .carte > div.reglage')).some(e => e.textContent.includes(l)) && !document.querySelector('#info-corps a.lien-lieu') && !document.querySelector('#info-corps a[href^="javascript"]'), LIEU_2, 12000, () => texteCorps(A));
  v('⛔ la page n\'a envoyé QUE le lieu (et le choix de notifier) : pas l\'horaire, pas le titre, pas la liste', dernierPost(A, /\/api\/reunions\/r_[0-9a-f]{32}\/modifier$/), { lieu: LIEU_2, notifier: true });
  vrai('… la réponse de Bruno est restée « accepté »', sql('SELECT statut AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.bruno.moi.id).n === 'accepte');
  await verifier('… et Bruno en est prévenu (bannière « a modifié la réunion »)', B, () => window.__bannieres.some(t => /Alice Martin a modifié la réunion/.test(t)), null, 10000, () => bannieres(B).then(l => l.join(' // ')));
  /* « Notifier les invités » éteint : le changement est fait, personne n'est prévenu */
  await toucher(A, '[data-reu="modifier"]');
  await verifier('le formulaire se rouvre', A, () => document.getElementById('feuille-titre').textContent === 'Modifier la réunion' && !!document.getElementById('rf-lieu'), null, 8000);
  await saisir(A, '#rf-lieu', LIEU);
  await toucher(A, '[data-reu="form-notifier"]');
  v('« Notifier les invités » s\'éteint', await A.page.evaluate(() => document.querySelector('[data-reu="form-notifier"]').getAttribute('aria-checked')), 'false');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('le lieu est rétabli (la fiche le montre)', A, (l) => document.getElementById('feuille-titre').textContent === 'Réunion' && Array.from(document.querySelectorAll('#info-corps .carte > div.reglage')).some(e => e.textContent.includes(l)), LIEU, 12000, () => texteCorps(A));
  v('⛔ la page a envoyé « notifier: false »', dernierPost(A, /\/modifier$/), { lieu: LIEU, notifier: false });
  /* Bruno rouvre la fiche : sa réponse y est toujours */
  await B.page.goto(svc.base + '/#reunions/' + R);
  await verifier('Bruno rouvre la réunion : sa réponse « Accepter » y est toujours (le lieu n\'y a rien changé)', B, () => { const p = document.querySelector('[data-reu="reponse"][data-statut="accepte"]'); return document.getElementById('feuille-titre').textContent === 'Réunion' && !!p && p.getAttribute('aria-checked') === 'true'; }, null, 12000, () => etatPage(B));
  /* l'HORAIRE */
  await toucher(A, '[data-reu="modifier"]');
  await verifier('le formulaire se rouvre (horaire)', A, () => document.getElementById('feuille-titre').textContent === 'Modifier la réunion' && !!document.getElementById('rf-debut'), null, 8000);
  await saisir(A, '#rf-debut', DST.avant + 'T15:00');
  v('… la fin suit le début (16:00)', await A.page.evaluate(() => document.getElementById('rf-fin').value), DST.avant + 'T16:00');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('un changement d\'HORAIRE : la fiche montre 15:00 – 16:00', A, () => document.getElementById('feuille-titre').textContent === 'Réunion' && Array.from(document.querySelectorAll('#info-corps .carte > div.reglage')).some(e => e.textContent.includes('15:00 – 16:00')), null, 12000, () => texteCorps(A));
  v('⛔ la page a envoyé l\'horaire ENTIER (début, fin, fuseau, répétition, nombre) et rien d\'autre', dernierPost(A, /\/modifier$/), { debut: DST.avant + 'T15:00', fin: DST.avant + 'T16:00', tz: PARIS, repetition: 'hebdomadaire', jusqua: null, n: 3, notifier: true });
  v('… le service a remis la réponse de Bruno EN ATTENTE', sql('SELECT statut AS n FROM reunion_invite WHERE reunion = ? AND uid = ?', R, P.bruno.moi.id).n, 'attente');
  await verifier('⛔ Bruno le voit SANS toucher : plus aucune réponse choisie, et la bannière dit l\'horaire changé, à SON heure (09:00 à New York)', B,
    (a) => document.querySelectorAll('[data-reu="reponse"][aria-checked="true"]').length === 0 && window.__bannieres.some(t => t.includes('Alice Martin a changé l\'horaire de la réunion : ' + a)), dit(instantParis(DST.avant, 15, 0), NY), 12000, () => bannieres(B).then(l => l.join(' // ')));
  v('⛔ « Notifier: non » n\'a PRÉVENU PERSONNE : Bruno a reçu une seule bannière « a modifié la réunion » (celle du premier changement) — la suivante, avec l\'horaire, est arrivée après (sentinelle)', (await bannieres(B)).filter(t => /Alice Martin a modifié la réunion/.test(t)).length, 1);
  await capture(B, 'r8-horaire-change');

  console.log('\n── Les rappels : à l\'heure, UNE seule fois, pour ceux qui sont invités et personne d\'autre ──');
  const T0 = Math.ceil((Date.now() + 3 * H) / MIN) * MIN;
  const c2 = await P.alice.post('/api/reunions', { titre: TITRE_2, lieu: 'https://visio.exemple.invalid/wqxz', debut: localDans(T0, PARIS), fin: localDans(T0 + H, PARIS), tz: PARIS, rappels: [15, 5], invites: [P.bruno.moi.id], notifier: false });
  vrai('population : une seconde réunion, dans trois heures, deux rappels (15 et 5 minutes), Bruno invité — aucun rappel parti, aucune bannière « Commence » chez personne', c2.code === 201 && nb('SELECT COUNT(*) AS n FROM rappel') === 0 && (await Promise.all([A, B, D, Z].map(S => bannieres(S)))).every(l => !l.some(t => /Commence/.test(t))));
  const R2 = c2.j.reunion.id;
  svc.avancer(T0 - 15 * MIN + 2000 - Date.now());
  await verifier('⛔ le service avance de ~3 heures : le rappel de 15 minutes arrive chez Bruno, SANS qu\'il touche rien — le titre, « Commence dans 15 minutes », l\'heure à New York', B, (a) => window.__bannieres.some(t => t.startsWith(a.t + ' | Commence dans 15 minutes — ' + a.q)), { t: TITRE_2, q: dit(T0, NY) }, 20000, () => bannieres(B).then(l => l.join(' // ')));
  await verifier('… et chez Alice, l\'organisatrice, à l\'heure de Paris', A, (a) => window.__bannieres.some(t => t.startsWith(a.t + ' | Commence dans 15 minutes — ' + a.q)), { t: TITRE_2, q: dit(T0, PARIS) }, 20000, () => bannieres(A).then(l => l.join(' // ')));
  svc.avancer(10 * MIN);
  await verifier('dix minutes plus tard, le second rappel (5 minutes) arrive chez Bruno : il sert de SENTINELLE au « une seule fois »', B, (t) => window.__bannieres.some(x => x.startsWith(t + ' | Commence dans 5 minutes')), TITRE_2, 20000, () => bannieres(B).then(l => l.join(' // ')));
  await verifier('… et chez Alice', A, (t) => window.__bannieres.some(x => x.startsWith(t + ' | Commence dans 5 minutes')), TITRE_2, 20000, () => bannieres(A).then(l => l.join(' // ')));
  const rb = await bannieres(B), ra = await bannieres(A), rz = await bannieres(Z), rd = await bannieres(D);
  v('⛔ chaque rappel n\'est arrivé qu\'UNE fois (population : deux rappels chez Bruno, deux chez Alice)', [rb.filter(t => /Commence dans 15 minutes/.test(t)).length, rb.filter(t => /Commence dans 5 minutes/.test(t)).length, ra.filter(t => /Commence dans 15 minutes/.test(t)).length, ra.filter(t => /Commence dans 5 minutes/.test(t)).length], [1, 1, 1, 1]);
  v('… le registre du service tient quatre lignes (deux rappels × deux personnes) — et Chloé, qui n\'est pas invitée, et Dora, qu\'on a retirée, n\'ont rien reçu (population : leur page est ouverte, elle a reçu d\'autres bannières avant)', [nb('SELECT COUNT(*) AS n FROM rappel WHERE reunion = ?', R2), rz.some(t => /Commence/.test(t)), rd.some(t => /Commence/.test(t)), rd.length > 0], [4, false, false, true]);
  /* la fiche d'une réunion SANS répétition : un seul lien, un lieu qui est une adresse web (un lien sûr) */
  await B.page.goto(svc.base + '/#reunions/' + R2);
  await verifier('Bruno ouvre la seconde réunion : un seul lien .ics (« Ajouter à mon agenda »), pas de ligne de répétition, le lieu est un lien qui ne donne rien à la page ouvrante', B, (t) => {
    const a = document.querySelector('#info-corps a.lien-lieu'), liens = Array.from(document.querySelectorAll('#info-corps a[download]'));
    return document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom').textContent === t && liens.length === 1 && /Ajouter à mon agenda/.test(liens[0].textContent) && !/Se répète/.test(document.getElementById('info-corps').textContent)
      && !!a && a.getAttribute('target') === '_blank' && /noopener/.test(a.rel) && /noreferrer/.test(a.rel);
  }, TITRE_2, 12000, () => texteCorps(B));

  console.log('\n── Annuler (avec demande de confirmation), puis supprimer : les invités l\'apprennent EN DIRECT ──');
  await B.page.goto(svc.base + '/#reunions/' + R);
  await verifier('Bruno rouvre la première réunion (pour voir ce qu\'Alice va en faire)', B, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 12000, () => etatPage(B));
  await toucher(A, '[data-reu="annuler-demander"]');
  await verifier('« Annuler la réunion » demande confirmation, et dit ce qui arrive', A, () => /Annuler cette réunion \?/.test(document.getElementById('info-corps').textContent) && !!document.querySelector('[data-reu="annuler-confirmer"]') && !!document.querySelector('[data-reu="confirmation-retour"]'), null, 6000, () => texteCorps(A));
  await toucher(A, '[data-reu="confirmation-retour"]');
  await verifier('« Garder la réunion » : la demande disparaît, les gestes sont revenus', A, () => !document.querySelector('[data-reu="annuler-confirmer"]') && !!document.querySelector('[data-reu="annuler-demander"]'), null, 6000, () => texteCorps(A));
  vrai('… et RIEN n\'a changé au service (population : la réunion existe, elle n\'est pas annulée)', nb('SELECT COUNT(*) AS n FROM reunion WHERE id = ? AND annulee = 0', R) === 1);
  await toucher(A, '[data-reu="annuler-demander"]');
  await toucher(A, '[data-reu="annuler-confirmer"]');
  await verifier('annulée : la fiche d\'Alice le dit, plus de « Modifier » ni de rappels, mais « Supprimer »', A, () => !!Array.from(document.querySelectorAll('#info-corps .info-erreur')).find(e => /Cette réunion est annulée/.test(e.textContent)) && !document.querySelector('[data-reu="modifier"]') && !document.getElementById('reu-rappels') && !!document.querySelector('[data-reu="supprimer-demander"]'), null, 12000, () => texteCorps(A));
  vrai('… le service tient l\'annulation', nb('SELECT COUNT(*) AS n FROM reunion WHERE id = ? AND annulee = 1', R) === 1);
  await verifier('⛔ Bruno le voit SANS toucher : « Cette réunion est annulée. », plus de réponse ni de rappels — et la bannière', B, () => !!Array.from(document.querySelectorAll('#info-corps .info-erreur')).find(e => /Cette réunion est annulée/.test(e.textContent)) && document.querySelectorAll('[data-reu="reponse"]').length === 0 && !document.getElementById('reu-rappels') && window.__bannieres.some(t => /Alice Martin a annulé la réunion/.test(t)), null, 12000, () => texteCorps(B));
  await fermerFeuille(A);
  await verifier('dans l\'agenda d\'Alice, la ligne est barrée et dit « Annulée »', A, () => { const l = document.querySelector('#liste-reunions .reunion-ligne'); return !!l && l.classList.contains('annulee') && l.querySelector('.reunion-etat').textContent === 'Annulée'; }, null, 12000, () => lire(A, '#vue-reunions'));
  await capture(A, 'r9-annulee');
  await toucher(A, '#liste-reunions .reunion-ligne');
  await verifier('Alice rouvre la fiche annulée', A, () => document.getElementById('feuille-titre').textContent === 'Réunion' && !!document.querySelector('[data-reu="supprimer-demander"]'), null, 8000);
  await toucher(A, '[data-reu="supprimer-demander"]');
  await verifier('« Supprimer la réunion » demande confirmation ; une réunion déjà annulée n\'offre PAS « Prévenir les invités » (ils l\'ont su)', A, () => /Supprimer cette réunion \?/.test(document.getElementById('info-corps').textContent) && !document.querySelector('[data-reu="prevenir"]') && !!document.querySelector('[data-reu="supprimer-confirmer"]'), null, 6000, () => texteCorps(A));
  const conv1 = sql('SELECT conv AS n FROM reunion WHERE id = ?', R).n;
  await toucher(A, '[data-reu="supprimer-confirmer"]');
  await verifier('supprimée : la feuille d\'Alice se ferme', A, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 10000, () => etatPage(A));
  v('⛔ le service a TOUT emporté : la réunion, ses invités, sa conversation (population : la conversation existait)', [nb('SELECT COUNT(*) AS n FROM reunion WHERE id = ?', R), nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE reunion = ?', R), nb('SELECT COUNT(*) AS n FROM conversation WHERE id = ?', conv1), /^c_[0-9a-f]{32}$/.test(conv1)], [0, 0, 0, true]);
  await verifier('⛔ la fiche de Bruno SE FERME toute seule : « Cette réunion n\'existe plus, ou tu n\'y es plus invité. »', B, () => /Cette réunion n'existe plus, ou tu n'y es plus invité/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'), null, 12000, () => etatPage(B));
  await verifier('… et sa conversation a quitté sa liste', B, (t) => { const l = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(e => e.textContent); return l.length >= 0 && !l.includes(t); }, TITRE, 8000, () => lire(B, '#liste-conv'));
  /* la seconde réunion : supprimée en éteignant « Prévenir les invités » */
  await A.page.goto(svc.base + '/#reunions/' + R2);
  await verifier('Alice ouvre la seconde réunion', A, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom').textContent === t, TITRE_2, 12000, () => etatPage(A));
  await toucher(A, '[data-reu="supprimer-demander"]');
  await verifier('une réunion À VENIR offre « Prévenir les invités », allumé', A, () => { const p = document.querySelector('[data-reu="prevenir"]'); return !!p && p.getAttribute('aria-checked') === 'true'; }, null, 6000, () => texteCorps(A));
  await toucher(A, '[data-reu="prevenir"]');
  await verifier('… elle l\'éteint', A, () => document.querySelector('[data-reu="prevenir"]').getAttribute('aria-checked') === 'false', null, 6000);
  await toucher(A, '[data-reu="supprimer-confirmer"]');
  await verifier('supprimée : la fiche se ferme', A, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 10000, () => etatPage(A));
  v('⛔ la page a envoyé « notifier: false » au service', dernierPost(A, /\/supprimer$/), { notifier: false });
  v('⛔ le service n\'a plus aucune réunion, plus aucun registre de rappel (population : on en avait quatre)', [nb('SELECT COUNT(*) AS n FROM reunion'), nb('SELECT COUNT(*) AS n FROM rappel')], [0, 0]);
  await verifier('⛔ la fiche de Bruno (la seconde réunion) se ferme toute seule — et, « Prévenir » éteint, il n\'a reçu AUCUNE bannière de suppression (sentinelle : la sienne est arrivée avant)', B, () => /Cette réunion n'existe plus, ou tu n'y es plus invité/.test(document.getElementById('mot').textContent) && !document.documentElement.classList.contains('feuille-ouverte'), null, 12000, () => etatPage(B));
  v('… (Bruno a reçu UNE bannière d\'annulation en tout : celle de l\'annulation explicite de la première réunion)', (await bannieres(B)).filter(t => /Alice Martin a annulé la réunion/.test(t)).length, 1);
  console.log('\n── Les collègues d\'un espace : invitables sans être des contacts — et relus à chaque ouverture ──');
  const esp = await P.alice.post('/api/espaces', { nom: 'Atelier WQXZ' });
  const lienEsp = esp.code === 201 ? await P.alice.post('/api/espaces/' + esp.j.espace.id + '/invitations', {}) : null;
  const accEsp = lienEsp && lienEsp.j && lienEsp.j.code ? await P.chloe.post('/api/invitations/accepter', { code: lienEsp.j.code }) : null;
  vrai('population : Alice a un espace et Chloé en est membre (elle n\'est toujours le contact de personne)', esp.code === 201 && !!accEsp && accEsp.code === 200 && nb('SELECT COUNT(*) AS n FROM espace_membre') === 2);
  await onglet(A, 'reunions');
  await toucher(A, '#btn-reunion-nouvelle');
  await verifier('⛔ « Programmer » propose maintenant Chloé, avec son espace — alors que les écrans d\'avant avaient lu la liste AVANT que l\'espace existe', A, () => Array.from(document.querySelectorAll('#rf-invites [data-uid]')).some(e => /Chloé Durand/.test(e.textContent) && /Collègue — Atelier WQXZ/.test(e.textContent)), null, 10000, () => texteCorps(A));
  await saisir(A, '#rf-titre', TITRE_3);
  await saisir(A, '#rf-debut', DST.apres2 + 'T10:00');
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('« Programmer » sans invité : la fiche s\'ouvre, l\'organisatrice y est seule — et Chloé lui est proposée, comme collègue', A, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom') && document.querySelector('#info-corps .info-nom').textContent === t
    && Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Chloé Durand/.test(e.textContent) && /Collègue — Atelier WQXZ/.test(e.textContent) && !!e.querySelector('[data-reu="inviter"]')), TITRE_3, 15000, () => texteCorps(A));
  await toucher(A, '[data-reu="inviter"][data-uid="' + P.chloe.moi.id + '"]');
  await verifier('Alice invite Chloé depuis la fiche : elle y est « En attente »', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Chloé Durand/.test(e.textContent) && /En attente/.test(e.textContent) && !e.querySelector('[data-reu="inviter"]')), null, 10000, () => texteCorps(A));
  v('⛔ le service l\'a invitée (un collègue d\'espace s\'invite sans être un contact)', nb('SELECT COUNT(*) AS n FROM reunion_invite WHERE uid = ?', P.chloe.moi.id), 1);
  await verifier('⛔ la bannière de Chloé dit l\'invitation, à l\'heure de Paris', Z, (arg) => window.__bannieres.some(t => t.includes('Alice Martin vous a invité à une réunion : ' + arg)), dit(instantParis(DST.apres2, 10, 0), PARIS), 10000, () => bannieres(Z).then(l => l.join(' // ')));
  await toucher(A, '[data-reu="retirer"][data-uid="' + P.chloe.moi.id + '"]');
  await verifier('Alice retire Chloé : elle est de nouveau proposée', A, () => Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Chloé Durand/.test(e.textContent) && !!e.querySelector('[data-reu="inviter"]')), null, 10000, () => texteCorps(A));
  /* Chloé quitte l'espace : plus une collègue. La fiche, rouverte, relit la liste — elle n'est plus proposée */
  const part = await P.chloe.post('/api/espaces/' + esp.j.espace.id + '/quitter', {});
  vrai('population : Chloé a quitté l\'espace (il n\'a plus qu\'un membre)', part.code === 200 && nb('SELECT COUNT(*) AS n FROM espace_membre') === 1);
  await fermerFeuille(A);
  await toucher(A, '#liste-reunions .reunion-ligne');
  await verifier('⛔ la fiche rouverte : Chloé n\'est PLUS proposée (les collègues sont relus à chaque ouverture) — et Bruno et Dora, contacts, le sont toujours', A, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom').textContent === t
    && !Array.from(document.querySelectorAll('#info-corps .contact.avec-actions')).some(e => /Chloé Durand/.test(e.textContent)) && document.querySelectorAll('[data-reu="inviter"]').length === 2, TITRE_3, 12000, () => texteCorps(A));
  await largeur(A, 'fiche (collègues relus)');
  return { tous: E.tous };
}

/* ═══ B. LA BÊTA SANS RELAIS : L'ÉCRAN DIT QUE LE COURRIEL N'EST PAS OUVERT — SEULEMENT QUAND LE SERVICE L'A DIT ════════════════════════════════════ */
async function parcoursB(b, ctx) {
  const { svc, og } = ctx;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const P = await personnes(svc, og, ['alice']);
  const A = await ouvrir(b, svc.base, PROFILS.iphone); A.nom = 'Alice (sans relais)';
  await connecter(A, 'alice');
  const T0 = Math.ceil((Date.now() + 2 * H) / MIN) * MIN;
  const c = await P.alice.post('/api/reunions', { titre: TITRE, lieu: LIEU, debut: localDans(T0, PARIS), fin: localDans(T0 + H, PARIS), tz: PARIS });
  const R = c.j.reunion.id;
  console.log('── Sans relais SMTP : « l\'envoi par courriel n\'est pas encore ouvert » ──');
  v('population : le service le dit lui-même (/api/config → courriel.ouvert:false), et la réunion existe', [(await (await fetch(svc.base + '/api/config')).json()).courriel, c.code, Number(sql('SELECT COUNT(*) AS n FROM reunion').n)], [{ ouvert: false }, 201, 1]);
  await A.page.goto(svc.base + '/#reunions/' + R);
  await verifier('Alice ouvre sa réunion', A, (t) => document.getElementById('feuille-titre').textContent === 'Réunion' && document.querySelector('#info-corps .info-nom').textContent === t, TITRE, 12000, () => etatPage(A));
  await toucher(A, '[data-reu="courriel-ouvrir"]');
  await verifier('⛔ la fiche dit « L\'envoi par courriel n\'est pas encore ouvert. » — et ne propose NI champ NI bouton « Envoyer » (rien ne peut partir)', A, () => /L'envoi par courriel n'est pas encore ouvert/.test((document.getElementById('reu-courriel-note') || { textContent: '' }).textContent) && !document.getElementById('rc-adresse') && !document.querySelector('[data-reu="courriel-envoyer"]'), null, 10000, () => texteCorps(A));
  await capture(A, 'r10-courriel-pas-ouvert');
  await largeur(A, 'fiche (courriel pas encore ouvert)');
  await toucher(A, '[data-reu="courriel-ouvrir"]');
  /* une PANNE de lecture de la configuration n'est pas « pas encore ouvert » : la page ne le dit pas, le service le dira à l'envoi */
  await A.page.route('**/api/config', (r) => r.fulfill({ status: 500, contentType: 'application/json', body: '{}' }));
  await toucher(A, '[data-reu="courriel-ouvrir"]');
  await verifier('⛔ quand le service ne répond pas à la question (panne), la page NE DIT PAS « pas encore ouvert » : elle propose le champ', A, () => !!document.getElementById('rc-adresse') && !document.getElementById('reu-courriel-note'), null, 10000, () => texteCorps(A));
  await A.page.unroute('**/api/config');
  await saisir(A, '#rc-adresse', ADRESSE);
  await toucher(A, '[data-reu="courriel-envoyer"]');
  await verifier('… et c\'est LE SERVICE qui répond à l\'envoi : « L\'envoi par courriel n\'est pas encore ouvert. »', A, () => /L'envoi par courriel n'est pas encore ouvert/.test(document.getElementById('info-erreur').textContent), null, 10000, () => erreurInfo(A));
  v('… (population : la page a bien envoyé la demande au service, qui l\'a refusée ; aucune ligne de plafond)', [A.postes.filter(p => /\/courriel$/.test(p.chemin)).length, Number(sql('SELECT COUNT(*) AS n FROM courrier_envoi').n)], [1, 0]);
  return { tous: [A] };
}

/* ═══ C. UN SERVICE À LA FORMULE DE PRODUCTION : « PROGRAMMER » EST UNE FONCTION PRO ═════════════════════════════════════════════════════════════ */
async function parcoursC(b, ctx) {
  const { svc, og } = ctx;
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const A = await ouvrir(b, svc.base, PROFILS.iphone); A.nom = 'Alice (formule de production)';
  await connecter(A, 'alice');
  console.log('\n── À la formule de production : « Programmer » demande Messages Pro ──');
  await onglet(A, 'reunions');
  await toucher(A, '#btn-reunion-nouvelle');
  await verifier('le formulaire s\'ouvre (on peut le remplir, c\'est l\'envoi qui est refusé)', A, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre'), null, 8000, () => texteCorps(A));
  await saisir(A, '#rf-titre', TITRE);
  await toucher(A, '[data-reu="form-enregistrer"]');
  await verifier('⛔ le service refuse (402) et la page le DIT : « Cette fonction fait partie de Messages Pro. » — le formulaire reste ouvert avec ce qu\'on a écrit', A, (t) => /Cette fonction fait partie de Messages Pro/.test(document.getElementById('info-erreur').textContent) && document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && document.getElementById('rf-titre').value === t, TITRE, 10000, () => etatPage(A));
  v('… et RIEN n\'a été créé (population : la page a bien envoyé la demande)', [A.postes.filter(p => p.chemin === '/api/reunions').length, Number(sql('SELECT COUNT(*) AS n FROM reunion').n), Number(sql('SELECT COUNT(*) AS n FROM conversation').n)], [1, 0, 0]);
  await capture(A, 'r11-programmer-pro');
  await largeur(A, 'formulaire (refus Messages Pro)');
  await fermerFeuille(A);
  await verifier('l\'agenda reste lisible (« Aucune réunion ce jour-là »), le refus n\'a rien cassé', A, () => /Aucune réunion ce jour-là/.test(document.getElementById('liste-reunions').textContent), null, 8000, () => lire(A, '#vue-reunions'));
  return { tous: [A] };
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const relais = await fauxRelais({ auth: { utilisateur: UTIL, mdp: MDP_RELAIS } });
  const relaisCfg = { hote: '127.0.0.1', port: relais.port, securite: 'aucune', utilisateur: UTIL, mot_de_passe: MDP_RELAIS, de: EXPEDITEUR, timeoutMs: 3000 };
  const svcA = await T.lancerService({ urlGestion: og.url, horloge: true, config: Object.assign({}, CONFIG_BASE, { reunions: { planificateurMs: 200, bailMs: 2000 }, courriel: relaisCfg }) });
  const svcB = await T.lancerService({ urlGestion: og.url, config: Object.assign({}, CONFIG_BASE) });
  const svcC = await T.lancerService({ urlGestion: og.url, config: Object.assign({}, CONFIG_BASE, { formule: { toutOuvert: false } }) });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : le navigateur ne démarre pas (' + e.message.split('\n')[0] + ')'); await svcA.arreter(); await svcB.arreter(); await svcC.arreter(); await relais.fermer(); await og.fermer(); process.exit(2); }
  const tous = [];
  try {
    const e1 = await parcoursA(b, { svc: svcA, og, relais });
    tous.push(...e1.tous);
    await parcoursA2(Object.assign({ svc: svcA, relais }, e1));
    const rb = await parcoursB(b, { svc: svcB, og });
    tous.push(...rb.tous);
    const rc = await parcoursC(b, { svc: svcC, og });
    tous.push(...rc.tous);
    console.log('\n── La fin : rien d\'anormal ──');
    /* un refus du service est LOGUÉ par le navigateur : on les NOMME. Sont attendus, exprès : la visite sans session (401), la formule de production (402 sur « Programmer »), l'heure qui n'existe pas le jour du changement d'heure (400 sur « Programmer »), une réunion qu'on ne voit pas ou qui n'existe plus (404 sur la lecture),
       une adresse fausse (400 sur le courriel), le plafond par adresse (429 sur le courriel), le service qui n'a pas de relais (503 sur le courriel), la lecture de la configuration que le banc fait échouer exprès (500) et l'indicateur de saisie (429, plafonné à un appel par 2 s). Tout autre refus est un défaut. */
    const SAISIE_429 = /^429 POST \/api\/conversations\/c_[0-9a-f]{32}\/saisie$/;
    const ATTENDUS = [/^401 /, /^500 GET \/api\/config$/, /^402 POST \/api\/reunions$/, /^400 POST \/api\/reunions$/, /^404 GET \/api\/reunions\/r_[0-9a-f]{32}$/, /^400 POST \/api\/reunions\/r_[0-9a-f]{32}\/courriel$/, /^429 POST \/api\/reunions\/r_[0-9a-f]{32}\/courriel$/, /^503 POST \/api\/reunions\/r_[0-9a-f]{32}\/courriel$/, SAISIE_429];
    for (const S of tous) {
      vrai(S.nom + ' : (population) ' + S.gestes + ' gestes portés, ' + (S.ecrans || 0) + ' écrans mesurés en largeur', S.gestes > 2);
      v(S.nom + ' : 0 erreur JavaScript, aucune erreur de console autre qu\'un refus du service', [S.erreurs, S.console.filter(t => !/Failed to load resource/.test(t))], [[], []]);
      v(S.nom + ' : aucun écran ne déborde de ses ' + S.pf.w + ' px', S.debordements || [], []);
      v(S.nom + ' : aucun geste n\'a attendu plus de 3 s, aucune réponse du service plus de 2 s', [S.attentes || [], S.lentes || []], [[], []]);
      v(S.nom + ' : les refus réseau relevés sont des refus ATTENDUS — relevé : ' + (S.refus.join(', ') || 'aucun'), S.refus.filter(x => !ATTENDUS.some(re => re.test(x))), []);
    }
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally {
    for (const [nom, svc] of [['bêta avec relais', svcA], ['bêta sans relais', svcB], ['production', svcC]]) {
      const sortie = svc.sortie.texte();
      v('le service (' + nom + ') n\'a écrit AUCUNE erreur ni exception pendant tout le parcours (population : ' + sortie.split('\n').filter(Boolean).length + ' lignes de journal)', /Error|TypeError|unhandled|Exception/.test(sortie), false);
    }
    try { await b.close(); } catch (e) { /* rien */ }
    await svcA.arreter(); await svcB.arreter(); await svcC.arreter(); await relais.fermer(); await og.fermer();
  }
  fin();
})();
