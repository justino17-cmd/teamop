/* ══ SONDE — LA BASCULE UNIQUE PERSO / PRO ET LE PASSAGE AUTOMATIQUE EN PRO, DANS LA VRAIE PAGE SERVIE (formule de PRODUCTION : seul un compte pro a deux côtés) ═══════════════
   11 octobre 2026, Justin : « quand on bascule, c'est TOUT qui bascule ; dans chaque onglet on ne choisit pas pro ou perso ; sur téléphone, dans les messages, on ne peut pas
   basculer ; et les pros peuvent régler un passage automatique en Pro de 8 h à 17 h ». Contre le VRAI service, AU DOIGT :
     1. téléphone (390 px) — Ana (un espace : Ben est son collègue ; Cléo, une amie) : Messages, Contacts, Appels et Agenda n'ont AUCUN sélecteur visible (chaque écran est
        rendu, son titre lu, AVANT de compter l'absence) ; le Profil porte la carte « Perso et Pro » et son segment ; « Pro » : le titre du document dit « OP MESSAGES PRO »,
        la liste ne montre que le Pro (il y avait des conversations des DEUX côtés), l'onglet « Accueil » paraît ; revenir à Messages : on est Pro ;
     2. bureau : la barre latérale porte le segment ; dans le Profil la carte est là SANS segment visible (display:none calculé) mais avec la ligne du passage automatique ;
        une tablette de 820 px, où la barre latérale paraît, fait de même ;
     3. DEUX APPAREILS, même compte : basculer sur le téléphone fait basculer l'ordinateur EN DIRECT (sans recharger), et l'ordinateur ne RÉÉCRIT pas (les POST /api/moi/maj
        de chaque contexte sont comptés, sentinelle comprise) ; puis dans l'autre sens ;
     4. sans heures de travail : la ligne « Passer en Pro pendant mes heures » mène à Notifications ; allumer les heures y fait paraître l'interrupteur dans le Profil ;
     5. le passage automatique : (a) l'allumer au doigt AVEC un choix récent d'avance = Pro TOUT DE SUITE (force) et un toast ; un geste fait ensuite l'emporte ;
        (b) à l'ouverture, la borne passée depuis le dernier choix décide du côté (début des heures → Pro, fin → Perso, toast) ; un choix plus récent que la borne, ou le
        réglage coupé, ne bouge rien ; (c) en direct : la borne franchie, l'horloge de la page avancée (page.clock), la page bascule — et un geste fait après la borne tient.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION ; ⛔ UNE FRAPPE PROUVE QU'ELLE A PORTÉ (l'élément a une taille ; au point touché, c'est lui ou son libellé).
   Lancer :   node tests/sonde-opmessages-bascule.js   (CAPTURES=/dossier pour les images)      Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };
const UA_IPAD = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const PERSO = ['Cléo Banc', 'Mélange'], PRO = ['# général', 'Ben Banc'];

/* l'heure de Paris, en minutes depuis minuit : les heures de travail se règlent dans le fuseau de la personne (celui du contexte du navigateur : Europe/Paris) */
const minParis = (t) => { const p = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(t === undefined ? Date.now() : t); return (+p.find(x => x.type === 'hour').value) * 60 + (+p.find(x => x.type === 'minute').value); };
/* une plage tous les jours, de `d` à `f` minutes AUTOUR DE MAINTENANT (négatif = passé) ; elle peut passer minuit (la règle du service : elle appartient au jour où elle commence) */
const fenetre = (d, f) => { const n = minParis(), m = x => (((n + x) % 1440) + 1440) % 1440; return { jours: [1, 2, 3, 4, 5, 6, 7], debut: m(d), fin: m(f) }; };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null, S = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    let A0 = await T.connecter(svc, og, 'ana', MOTS.ana);
    const B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    /* l'espace d'Ana, Ben dedans (une vraie invitation rangée dans la base, comme test-961 et la sonde perso/pro) ; Cléo et Ben, contacts d'Ana */
    S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'ESPACEZXSONDEBASCULE', proprio: A0.moi.id }).id;
    { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: E, par: A0.moi.id, ttlMs: 86400000, max: 5 }); S.invitationAccepter({ h: sha(code), uid: B0.moi.id }); }
    for (const y of [B0, C0]) { const l = await A0.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const dire = (P, conv, texte) => P.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const AB = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    const AC = (await A0.post('/api/conversations/directe', { uid: C0.moi.id })).j.conversation.id;
    const G2 = (await A0.post('/api/conversations/groupe', { nom: 'Mélange', membres: [B0.moi.id, C0.moi.id] })).j.conversation.id;
    const K = S.canalCreer({ espace: E, par: A0.moi.id, nom: 'général', prive: false }).id;
    await dire(A0, AB, 'Point chantier'); await dire(A0, AC, 'Ciné ce soir ?'); await dire(A0, G2, 'Coucou'); await dire(A0, K, 'Bienvenue');
    const cotes = async () => Object.fromEntries(((await A0.get('/api/conversations')).j.conversations || []).map(c => [c.id, c.cote]));
    { const c0 = await cotes(); v('population : côté du service — Ben et le canal Pro, Cléo et « Mélange » Perso (il y a des conversations des DEUX côtés)', [c0[AB], c0[AC], c0[G2], c0[K], Object.keys(c0).length], ['pro', 'perso', 'perso', 'pro', 4]); }

    /* ── le compte d'Ana, côté service : les réglages posés par la VRAIE route (l'heure du dernier choix est alors celle du service) ; `ancien` les vieillit par la base ── */
    /* ⛔ le service ne garde que DIX sessions par personne (les plus anciennes tombent) : la session d'API d'Ana est la plus vieille, elle finit par tomber après une dizaine de
       pages ouvertes — on la rouvre (401), ce qui n'a rien d'un défaut de la page */
    const apiAna = async (methode, chemin, corps) => { let r = await A0[methode](chemin, corps); if (r.code === 401) { A0 = await T.connecter(svc, og, 'ana', MOTS.ana); r = await A0[methode](chemin, corps); } return r; };
    const moiPrefs = async () => (await apiAna('get', '/api/moi')).j.moi.prefs || {};
    const regler = async (prefs) => { const r = await apiAna('post', '/api/moi/maj', { prefs }); if (r.code !== 200) throw new Error('réglage refusé (' + r.code + ') : ' + JSON.stringify(prefs)); return r; };
    const ancien = async (msAvant) => { const p = await moiPrefs(); S.personneMaj(A0.moi.id, { prefs: Object.assign({}, p, { mode_le: Date.now() - msAvant }) }); return (await moiPrefs()).mode_le; };
    const attendreService = async (fn, ms) => { for (let i = 0; i < (ms || 5000) / 100; i++) { if (fn(await moiPrefs())) return true; await new Promise(r => setTimeout(r, 100)); } return false; };

    const ouvrirPage = async (login, genre, opts) => {
      const o = opts || {}, bureau = genre === 'bureau', tablette = genre === 'tablette';
      const ctx = await b.newContext(bureau ? { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }
        : tablette ? { viewport: { width: 820, height: 1180 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, userAgent: UA_IPAD, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }
        : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const P = { ctx, page, erreurs: [], bureau, posts: [], genre };
      page.on('pageerror', e => P.erreurs.push(String(e && e.message || e).slice(0, 220)));
      /* les écritures du compte que CETTE page envoie (sentinelle : le geste qui écrit doit apparaître ici) */
      page.on('request', r => { try { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/moi/maj') { let c = null; try { c = JSON.parse(r.postData() || 'null'); } catch (_) {} P.posts.push(c); } } catch (_) {} });
      /* les toasts (#mot) s'effacent en 2,4 s, et deux dits dans le même instant ne laissent que le dernier à l'écran : un observateur NOTE chaque texte posé (un enregistrement par affectation) */
      await page.addInitScript(() => {
        window.__mots = [];
        document.addEventListener('DOMContentLoaded', () => { const m = document.getElementById('mot'); if (!m) return; new MutationObserver(rs => { for (const r of rs) for (const n of r.addedNodes) if (n.textContent) window.__mots.push(n.textContent); }).observe(m, { childList: true }); });
      });
      if (o.horloge) await page.clock.install({ time: new Date() });     // l'horloge de la page : elle court d'elle-même, et on peut l'AVANCER (fastForward)
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0 && document.querySelectorAll('#liste-conv li').length > 0; }, null, { timeout: 15000 });
      return P;
    };
    const att = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const pause = (ms) => new Promise(r => setTimeout(r, ms));
    const capture = async (P, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await P.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const motVu = (P, texte, ms) => att(P, t => (window.__mots || []).some(x => x.includes(t)), texte, ms || 6000);
    const motsPris = P => P.page.evaluate(() => (window.__mots || []).slice());
    /* UNE FRAPPE QUI PORTE : l'élément visible a une taille, et au point touché c'est lui (ou un de ses enfants, ou son libellé) — sinon on le DIT et on ne touche pas */
    const frappe = async (P, sel, quoi) => {
      const loc = P.page.locator(sel).filter({ visible: true }).first();
      try { await loc.scrollIntoViewIfNeeded({ timeout: 5000 }); } catch (e) { vrai('la frappe « ' + quoi + ' » : ' + sel + ' est introuvable à l\'écran', false); return false; }
      const box = await loc.boundingBox();
      if (!box || box.width <= 0 || box.height <= 0) { vrai('la frappe « ' + quoi + ' » : l\'élément a une taille', false); return false; }
      const x = box.x + box.width / 2, y = box.y + box.height / 2;
      const r = await loc.evaluate((el, pt) => { const h = document.elementFromPoint(pt[0], pt[1]); const ok = !!h && (el === h || el.contains(h) || (h.contains(el) && !!h.closest('label'))); return { ok, pile: h ? (h.tagName + '.' + String(h.className).slice(0, 40)) : null }; }, [x, y]);
      if (!r.ok) { vrai('la frappe « ' + quoi + ' » porte (au point touché : ' + r.pile + ')', false); return false; }
      if (P.bureau) await P.page.mouse.click(x, y); else await P.page.touchscreen.tap(x, y);
      return true;
    };
    /* ce que la page montre */
    const etatPage = P => P.page.evaluate(() => {
      const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const genreSeg = s => s.classList.contains('cote-seg-side') ? 'barre' : s.classList.contains('cote-seg-profil') ? 'profil' : 'sous-titre';
      const segs = Array.from(document.querySelectorAll('[data-cote-seg]')).filter(vis);
      const marque = Array.from(document.querySelectorAll('.side-marque b, #marque-tel')).filter(vis).map(x => x.innerText.replace(/\s+/g, ' ').trim());
      const noms = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim());
      const nav = Array.from(document.querySelectorAll('#tabs a.tab, #nav-side a.side-lien')).filter(vis).map(a => a.dataset.vue);
      const photos = Array.from(document.querySelectorAll('.moi-pastille')).filter(vis);
      const presses = segs.map(s => (s.querySelector('[aria-pressed="true"]') || { dataset: {} }).dataset.cote || null);
      return { segs: segs.map(genreSeg), presses, cote: document.documentElement.dataset.cote || null, marque, noms, nav, titre: document.title, photos: photos.length, points: photos.filter(a => vis(a.querySelector('.moi-point'))).length, kind: document.documentElement.dataset.kind || null };
    });
    /* un écran : la vue montrée, son titre LU, et les sélecteurs (dans la vue ; visibles dans tout l'écran) */
    const ecran = (P, vue) => P.page.evaluate(vu => {
      const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const s = document.getElementById('vue-' + vu), t = s ? s.querySelector('.grand-titre, h1') : null;
      return { vue: vis(s), titre: vis(t), texte: t ? t.textContent.trim() : null, segsDansLaVue: s ? s.querySelectorAll('[data-cote-seg]').length : -1, segsVisibles: Array.from(document.querySelectorAll('[data-cote-seg]')).filter(vis).length };
    }, vue);
    const TITRES = { messages: 'Messages', contacts: 'Contacts', appels: 'Appels', reunions: 'Agenda' };
    /* aller à un écran par son onglet (au doigt), attendre qu'il soit RENDU avec son titre, et compter les sélecteurs */
    const verifierEcran = async (P, vue, etiquette) => {
      if (vue !== 'messages' || await P.page.evaluate(() => document.getElementById('vue-messages').hidden)) {
        if (!await frappe(P, '#tabs .tab[data-vue="' + vue + '"]', 'onglet ' + vue)) return;
      }
      const ok = await att(P, vu => { const s = document.getElementById('vue-' + vu), t = s && s.querySelector('.grand-titre, h1'); return s && !s.hidden && s.getClientRects().length > 0 && t && t.getClientRects().length > 0 && t.textContent.trim().length > 0; }, vue);
      const h = await ecran(P, vue);
      vrai('population : ' + etiquette + ' — l\'écran « ' + TITRES[vue] + ' » est rendu, son titre lu (« ' + h.texte + ' ») — ' + JSON.stringify(h), ok && h.vue && h.titre && h.texte === TITRES[vue]);
      v('⛔ ' + etiquette + ' — « ' + TITRES[vue] + ' » n\'a AUCUN sélecteur Perso | Pro : ni dans la vue, ni visible dans l\'écran', [h.segsDansLaVue, h.segsVisibles], [0, 0]);
    };
    /* LE GESTE AU TÉLÉPHONE : la photo mène au Profil, la carte « Perso et Pro » y est, le lien « retour » ramène */
    const versProfil = async (P) => {
      if (await P.page.evaluate(() => document.getElementById('vue-reglages').getClientRects().length === 0)) { if (!await frappe(P, '.moi-pastille', 'la photo du profil')) return false; }
      return att(P, () => !document.getElementById('vue-reglages').hidden && !!document.getElementById('reg-cote') && !document.getElementById('reg-cote').hidden && document.querySelector('.cote-seg-profil').getClientRects().length > 0);
    };
    const revenir = async (P) => {
      if (!await frappe(P, '.profil-retour', 'le retour du Profil')) return false;
      return att(P, () => document.getElementById('vue-reglages').hidden && !document.getElementById('vue-messages').hidden);
    };
    /* la bascule complète au doigt : au bureau la barre latérale ; au téléphone la photo → le Profil → « Perso et Pro » → le lien « retour » */
    const basculer = async (P, cote) => {
      if (P.bureau) return frappe(P, '.cote-seg-side [data-cote="' + cote + '"]', 'la barre latérale : ' + cote);
      if (!await versProfil(P)) return false;
      if (!await frappe(P, '.cote-seg-profil [data-cote="' + cote + '"]', 'le Profil : ' + cote)) return false;
      if (!await att(P, c => document.documentElement.dataset.cote === c && document.querySelector('.cote-seg-profil [data-cote="' + c + '"]').getAttribute('aria-pressed') === 'true', cote)) return false;
      return revenir(P);
    };
    const coteEst = (P, cote) => att(P, c => document.documentElement.dataset.cote === c, cote);

    /* ═══ 1. TÉLÉPHONE ═══ */
    console.log('\n1. Téléphone : aucun sélecteur dans les écrans, la bascule est dans le Profil');
    await regler({ mode: 'perso', mode_auto: false, heures_pro: null });
    const A = await ouvrirPage('ana', 'tel');
    let e = await etatPage(A);
    v('population : la page est ouverte du côté Perso, la photo du profil est là, la liste Perso est rendue', [e.cote, e.photos, e.noms.slice().sort()], ['perso', 1, PERSO]);
    for (const [vue, nom] of [['messages', 'Messages'], ['contacts', 'Contacts'], ['appels', 'Appels'], ['reunions', 'Agenda']]) { await verifierEcran(A, vue, 'côté Perso'); if (vue === 'reunions') await capture(A, 'bs-1-agenda-perso'); }
    await verifierEcran(A, 'messages', 'côté Perso (retour)');
    v('⛔ nulle part dans l\'écran : aucun segment visible, côté Perso', (await etatPage(A)).segs, []);
    await capture(A, 'bs-1-messages-perso');

    vrai('population : au doigt, la photo du profil mène au Profil — la carte « Perso et Pro » est rendue, son segment visible', await versProfil(A));
    { const carte = await A.page.evaluate(() => { const c = document.getElementById('reg-cote'), seg = c.querySelector('.cote-seg-profil'), vis = x => !!x && x.getClientRects().length > 0;
        return { titre: (c.querySelector('.rubrique span') || {}).textContent, boutons: Array.from(seg.querySelectorAll('[data-cote]')).map(x => x.dataset.cote), visible: vis(c) && vis(seg), aide: /Tout OP MESSAGES suit/.test(c.textContent),
          dom: Array.from(document.querySelectorAll('[data-cote-seg]')).map(s => s.classList.contains('cote-seg-side') ? 'barre' : s.classList.contains('cote-seg-profil') ? 'profil' : 'AUTRE').sort() }; });
      v('le Profil a la carte « Perso et Pro », son segment (Perso, Pro) et l\'aide ; ⛔ et dans TOUT le document il n\'y a que DEUX segments : la barre latérale (cachée ici) et celui du Profil', [carte.titre, carte.boutons, carte.visible, carte.aide, carte.dom], ['Perso et Pro', ['perso', 'pro'], true, true, ['barre', 'profil']]); }
    v('le segment du Profil est le SEUL visible, côté Perso', (await etatPage(A)).segs, ['profil']);
    await capture(A, 'bs-1-profil-perso');
    vrai('toucher « Pro » (au doigt, la frappe porte)', await frappe(A, '.cote-seg-profil [data-cote="pro"]', 'Pro'));
    vrai('« Pro » se presse, la page passe du côté Pro', await att(A, () => document.documentElement.dataset.cote === 'pro' && document.querySelector('.cote-seg-profil [data-cote="pro"]').getAttribute('aria-pressed') === 'true'));
    vrai('le lien « retour » du Profil ramène à Messages', await revenir(A));
    vrai('la liste ne montre QUE le Pro : Ben et le canal — plus Cléo ni « Mélange » (population : ils existent, côté Perso)', await att(A, () => { const n = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).sort(); return n.join('|') === '# général|Ben Banc'; }));
    e = await etatPage(A);
    vrai('le titre du document dit « OP MESSAGES PRO » — « ' + e.titre + ' » ; la marque aussi — ' + JSON.stringify(e.marque), / — OP MESSAGES PRO$/.test(e.titre) && JSON.stringify(e.marque) === JSON.stringify(['OP MESSAGES PRO']));
    vrai('l\'onglet « Accueil » paraît, en tête — ' + e.nav.join(', '), e.nav[0] === 'accueil');
    v('on est Pro après le retour à Messages ; ⛔ toujours aucun sélecteur dans l\'écran', [e.cote, e.segs], ['pro', []]);
    await capture(A, 'bs-1-messages-pro');
    for (const vue of ['contacts', 'appels', 'reunions']) await verifierEcran(A, vue, 'côté Pro');
    await verifierEcran(A, 'messages', 'côté Pro (retour)');
    v('… et en repassant par Messages on est toujours Pro (le côté a suivi tous les écrans)', [(await etatPage(A)).cote, (await etatPage(A)).noms.slice().sort()], ['pro', PRO]);
    vrai('le service a retenu le côté (Pro)', await attendreService(p => p.mode === 'pro'));
    /* un LIEN qui mène à une conversation de l'autre côté (une notification, un lien collé) : toute l'application y bascule — la conversation ouverte est toujours du côté
       où l'on est (relecture des sondes du 11 octobre 2026 : un doute sur ce chemin) */
    vrai('retour au Profil, toucher « Perso » : la page repasse en Perso', await versProfil(A) && await frappe(A, '.cote-seg-profil [data-cote="perso"]', 'Perso') && await att(A, () => document.documentElement.dataset.cote === 'perso') && await revenir(A));
    await A.page.evaluate(id => { location.hash = '#messages/' + id; }, AB);
    vrai('⛔ un lien vers la conversation de Ben (Pro) depuis le côté Perso : la conversation s\'ouvre ET toute l\'application passe en Pro',
      await att(A, () => document.documentElement.dataset.conv === '1' && document.documentElement.dataset.cote === 'pro' && /Ben Banc/.test((document.querySelector('.conv-titre-nom') || {}).textContent || '')));
    await A.page.evaluate(() => history.back()); await att(A, () => document.documentElement.dataset.conv !== '1');
    v('aucune erreur JavaScript (téléphone)', A.erreurs, []);
    await A.ctx.close();

    /* ═══ 2. BUREAU, TABLETTE ═══ */
    console.log('\n2. Bureau et tablette : la barre latérale porte le segment, le Profil n\'en montre pas');
    const D = await ouvrirPage('ana', 'bureau');
    e = await etatPage(D);
    v('bureau : la barre latérale porte LE segment, côté Pro (du compte), et la marque dit « OP MESSAGES PRO »', [e.segs, e.presses, e.cote, e.marque], [['barre'], ['pro'], 'pro', ['OP MESSAGES PRO']]);
    await D.page.evaluate(() => { location.hash = '#reglages'; });
    vrai('population : le Profil est ouvert au bureau, sa carte « Perso et Pro » est rendue', await att(D, () => !document.getElementById('vue-reglages').hidden && !!document.querySelector('#reg-cote .reg-cote-seg') && !document.getElementById('reg-cote').hidden && document.getElementById('reg-cote').getClientRects().length > 0));
    { const c = await D.page.evaluate(() => { const bloc = document.querySelector('.reg-cote-seg'), seg = document.querySelector('.cote-seg-profil'), vis = x => !!x && x.getClientRects().length > 0;
        const ligne = document.getElementById('reg-mode-auto') || document.getElementById('reg-mode-heures');
        return { bloc: bloc ? getComputedStyle(bloc).display : null, segVisible: vis(seg), ligne: ligne ? ligne.id : null, ligneVisible: vis(ligne), ligneTaille: ligne ? Math.round(ligne.getBoundingClientRect().height) : 0, titre: (document.querySelector('#reg-cote .rubrique span') || {}).textContent }; });
      v('bureau : la carte « Perso et Pro » est là, ⛔ MAIS .reg-cote-seg est en display:none (calculé) et son segment n\'est pas visible', [c.titre, c.bloc, c.segVisible], ['Perso et Pro', 'none', false]);
      vrai('… et la ligne du passage automatique y est, visible, avec une hauteur — sans heures réglées c\'est #reg-mode-heures (' + JSON.stringify(c) + ')', c.ligne === 'reg-mode-heures' && c.ligneVisible && c.ligneTaille >= 40); }
    v('bureau : un seul segment visible dans le Profil, celui de la barre latérale', (await etatPage(D)).segs, ['barre']);
    await capture(D, 'bs-2-bureau-profil');
    { const n0 = D.posts.length;
      vrai('bureau : toucher « Perso » dans la barre latérale (au clic, la frappe porte)', await frappe(D, '.cote-seg-side [data-cote="perso"]', 'barre : Perso'));
      vrai('… la page passe en Perso, le côté Pro quitte la liste', await coteEst(D, 'perso') && await att(D, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).sort().join('|') === 'Cléo Banc|Mélange'));
      vrai('… et le geste a ÉCRIT (sentinelle : un POST /api/moi/maj avec le côté)', await (async () => { for (let i = 0; i < 40; i++) { if (D.posts.length - n0 === 1 && D.posts[D.posts.length - 1] && D.posts[D.posts.length - 1].prefs && D.posts[D.posts.length - 1].prefs.mode === 'perso') return true; await pause(100); } return false; })()); }
    v('aucune erreur JavaScript (bureau)', D.erreurs, []);
    await D.ctx.close();
    { const Tab = await ouvrirPage('ana', 'tablette');
      e = await etatPage(Tab);
      v('population : la tablette (820 px) est reconnue (data-kind « tablette ») et la barre latérale paraît avec LE segment', [e.kind, e.segs], ['tablette', ['barre']]);
      await Tab.page.evaluate(() => { location.hash = '#reglages'; });
      vrai('population : le Profil est ouvert sur tablette, sa carte est rendue', await att(Tab, () => !document.getElementById('vue-reglages').hidden && !!document.querySelector('#reg-cote .reg-cote-seg') && document.getElementById('reg-cote').getClientRects().length > 0));
      v('tablette : .reg-cote-seg est en display:none (calculé), un seul segment visible — celui de la barre latérale', [await Tab.page.evaluate(() => getComputedStyle(document.querySelector('.reg-cote-seg')).display), (await etatPage(Tab)).segs], ['none', ['barre']]);
      v('aucune erreur JavaScript (tablette)', Tab.erreurs, []);
      await Tab.ctx.close(); }

    /* ═══ 3. DEUX APPAREILS, MÊME COMPTE ═══ */
    console.log('\n3. Deux appareils, même compte : la bascule de l\'un suit sur l\'autre, en direct, sans réécrire');
    await regler({ mode: 'perso', mode_auto: false });
    const P1 = await ouvrirPage('ana', 'tel'), P2 = await ouvrirPage('ana', 'bureau');
    await P2.page.evaluate(() => { window.__vivant = 'ici'; });
    { const e1 = await etatPage(P1), e2 = await etatPage(P2);
      v('population : les deux appareils sont ouverts du côté Perso, avec la liste Perso', [e1.cote, e2.cote, e1.noms.slice().sort(), e2.noms.slice().sort()], ['perso', 'perso', PERSO, PERSO]); }
    await pause(600);                                       // (le flux des deux pages est établi)
    const p1a = P1.posts.length, p2a = P2.posts.length;
    vrai('le téléphone bascule en Pro au doigt (la photo, le Profil, « Pro », le retour)', await basculer(P1, 'pro'));
    vrai('l\'ORDINATEUR passe en Pro EN DIRECT (sans rien toucher, sans recharger) : côté, segment pressé, marque, liste, « Tableau de bord »', await att(P2, () => {
      const seg = document.querySelector('.cote-seg-side [aria-pressed="true"]'), noms = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).sort().join('|');
      return document.documentElement.dataset.cote === 'pro' && !!seg && seg.dataset.cote === 'pro' && noms === '# général|Ben Banc' && Array.from(document.querySelectorAll('#nav-side a')).some(a => a.dataset.vue === 'accueil');
    }, null, 12000));
    { const e2 = await etatPage(P2);
      vrai('… la marque de l\'ordinateur dit « OP MESSAGES PRO » (' + JSON.stringify(e2.marque) + ') et il l\'a annoncé (toast)', JSON.stringify(e2.marque) === JSON.stringify(['OP MESSAGES PRO']) && await motVu(P2, 'OP MESSAGES PRO', 3000));
      v('… sans recharger : la page n\'a pas été rechargée (marque posée avant) et la navigation n\'est qu\'une', [await P2.page.evaluate(() => window.__vivant), await P2.page.evaluate(() => performance.getEntriesByType('navigation').length)], ['ici', 1]);
      await capture(P2, 'bs-3-bureau-suit-pro'); }
    await pause(1500);                                      // (le temps qu'une réécriture parasite aurait de paraître)
    v('⛔ le téléphone a ÉCRIT (sentinelle : un POST /api/moi/maj portant le côté Pro) …', [P1.posts.length - p1a, !!(P1.posts[P1.posts.length - 1] && P1.posts[P1.posts.length - 1].prefs && P1.posts[P1.posts.length - 1].prefs.mode === 'pro')], [1, true]);
    v('⛔ … et l\'ordinateur NE RÉÉCRIT PAS : aucun POST /api/moi/maj de son côté', P2.posts.length - p2a, 0);
    /* … et dans l'autre sens */
    const p1b = P1.posts.length, p2b = P2.posts.length;
    vrai('l\'ordinateur repasse en Perso au clic (barre latérale)', await basculer(P2, 'perso'));
    vrai('le TÉLÉPHONE suit en direct : côté Perso, sa liste, et le segment du Profil (pressé même caché)', await att(P1, () => document.documentElement.dataset.cote === 'perso' && Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).sort().join('|') === 'Cléo Banc|Mélange' && document.querySelector('.cote-seg-profil [data-cote="perso"]').getAttribute('aria-pressed') === 'true'));
    await pause(1500);
    v('⛔ l\'ordinateur a écrit UNE fois (sentinelle) et le téléphone NE RÉÉCRIT PAS', [P2.posts.length - p2b, P1.posts.length - p1b], [1, 0]);
    v('aucune erreur JavaScript (les deux appareils)', [P1.erreurs, P2.erreurs], [[], []]);
    await P1.ctx.close(); await P2.ctx.close();

    /* ═══ 4. SANS HEURES DE TRAVAIL ═══ */
    console.log('\n4. Sans heures de travail : la ligne mène à Notifications');
    await regler({ mode: 'perso', mode_auto: false, heures_pro: null });
    const N = await ouvrirPage('ana', 'tel');
    vrai('population : le Profil est ouvert (téléphone), la carte « Perso et Pro » est rendue', await versProfil(N));
    { const l = await N.page.evaluate(() => { const vis = x => !!x && x.getClientRects().length > 0; const h = document.getElementById('reg-mode-heures'); return { heures: vis(h), auto: !!document.getElementById('reg-mode-auto'), texte: h ? h.textContent.replace(/\s+/g, ' ').trim() : null }; });
      v('sans heures réglées : « Passer en Pro pendant mes heures » est un BOUTON qui mène aux réglages (#reg-mode-heures), pas un interrupteur (#reg-mode-auto absent)', [l.heures, l.auto], [true, false]);
      vrai('… et il dit pourquoi — « ' + l.texte + ' »', /Règle d'abord tes heures de travail, dans Notifications/.test(l.texte || '')); }
    await capture(N, 'bs-4-sans-heures');
    vrai('toucher la ligne (la frappe porte)', await frappe(N, '#reg-mode-heures', 'Passer en Pro pendant mes heures'));
    vrai('elle MÈNE à Notifications : la rubrique est montrée, son titre lu', await att(N, () => { const v = document.getElementById('vue-reglages'), s = document.getElementById('reg-sec-notifications'), t = document.getElementById('reg-titre-notifications'); return v.dataset.sec === 'notifications' && s && !s.hidden && s.getClientRects().length > 0 && t && t.textContent.trim() === 'Notifications' && t.getClientRects().length > 0; }));
    vrai('population : la rubrique a chargé ses réglages — l\'interrupteur « Heures de travail (Pro) » est là, coupé', await att(N, () => { const b = document.getElementById('reg-notif-heures'); return !!b && b.getClientRects().length > 0 && b.getAttribute('aria-checked') === 'false'; }));
    await capture(N, 'bs-4-notifications');
    vrai('allumer les heures de travail (la frappe porte)', await frappe(N, '#reg-notif-heures', 'Heures de travail (Pro)'));
    vrai('le service a les heures (lundi-vendredi par défaut)', await attendreService(p => p.heures_pro && p.heures_pro.jours.length === 5));
    vrai('retour au Profil : l\'interrupteur « Passer en Pro pendant mes heures » a pris la place du bouton, coupé', await frappe(N, '[data-reg-retour]', 'Retour au profil') && await att(N, () => { const b = document.getElementById('reg-mode-auto'); return !!b && b.getClientRects().length > 0 && b.getAttribute('aria-checked') === 'false' && !document.getElementById('reg-mode-heures'); }));
    v('aucune erreur JavaScript (sans heures)', N.erreurs, []);
    await N.ctx.close();

    /* ═══ 5. LE PASSAGE AUTOMATIQUE ═══ */
    console.log('\n5a. Allumer le passage automatique, dans ses heures : Pro tout de suite');
    await regler({ mode: 'perso', mode_auto: false, heures_pro: fenetre(-90, 90) });
    { const q = await moiPrefs(); vrai('population : le choix de côté est RÉCENT (après la dernière borne, qui date d\'il y a 90 min) — sans « force », rien ne passerait en Pro', Date.now() - q.mode_le < 60000 && q.mode === 'perso' && q.heures_pro.debut !== q.heures_pro.fin); }
    const M = await ouvrirPage('ana', 'tel');
    vrai('population : le Profil est ouvert, l\'interrupteur est là, coupé, côté Perso', await versProfil(M) && await att(M, () => { const b = document.getElementById('reg-mode-auto'); return !!b && b.getClientRects().length > 0 && b.getAttribute('aria-checked') === 'false' && document.documentElement.dataset.cote === 'perso'; }));
    v('… et rien ne s\'est annoncé à l\'ouverture (le réglage est coupé)', (await motsPris(M)).filter(t => /Heures de travail/.test(t)), []);
    vrai('allumer #reg-mode-auto au doigt (la frappe porte)', await frappe(M, '#reg-mode-auto', 'Passer en Pro pendant mes heures'));
    vrai('⛔ l\'application passe en Pro TOUT DE SUITE (force : malgré un choix récent) — côté Pro, segment pressé', await att(M, () => document.documentElement.dataset.cote === 'pro' && document.querySelector('.cote-seg-profil [data-cote="pro"]').getAttribute('aria-pressed') === 'true'));
    vrai('un toast le dit : « Heures de travail : OP MESSAGES PRO » (après « Passage automatique en Pro allumé » — ' + JSON.stringify(await motsPris(M)) + ')', await motVu(M, 'Heures de travail : OP MESSAGES PRO') && await motVu(M, 'Passage automatique en Pro allumé'));
    vrai('l\'interrupteur est allumé, et le service a gardé le réglage ET le côté', await att(M, () => document.getElementById('reg-mode-auto').getAttribute('aria-checked') === 'true') && await attendreService(p => p.mode_auto === true && p.mode === 'pro'));
    await capture(M, 'bs-5a-auto-allume');
    /* un geste fait APRÈS la dernière borne l'emporte, même réglage allumé */
    vrai('à la main, on repasse en Perso (Profil, la frappe porte) — dans les heures', await frappe(M, '.cote-seg-profil [data-cote="perso"]', 'Perso') && await coteEst(M, 'perso'));
    await M.page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));      // (revenir sur la page relit la borne)
    await pause(1500);
    v('⛔ le passage automatique ne défait PAS ce choix : toujours Perso, le service aussi', [(await etatPage(M)).cote, (await moiPrefs()).mode], ['perso', 'perso']);
    vrai('l\'interrupteur se COUPE au doigt : coupé, le service le sait', await frappe(M, '#reg-mode-auto', 'Passer en Pro pendant mes heures') && await att(M, () => document.getElementById('reg-mode-auto').getAttribute('aria-checked') === 'false') && await attendreService(p => p.mode_auto === false));
    v('aucune erreur JavaScript (passage automatique, allumer)', M.erreurs, []);
    await M.ctx.close();

    console.log('\n5b. À l\'ouverture : la borne passée depuis le dernier choix décide du côté');
    const ouvrirEtLire = async (etiquette) => { const X = await ouvrirPage('ana', 'tel'); await pause(1500); const o = { X, cote: (await etatPage(X)).cote, titre: (await etatPage(X)).titre, mots: await motsPris(X) }; return o; };
    { /* (i) les heures ont COMMENCÉ il y a 45 min, le dernier choix (Perso) date de 4 h : on ouvre en Pro */
      await regler({ mode: 'perso', mode_auto: true, heures_pro: fenetre(-45, 200) }); const le = await ancien(4 * 3600000);
      vrai('population (i) : réglage allumé, côté du compte Perso, dernier choix vieux de 4 h (' + Math.round((Date.now() - le) / 60000) + ' min) — la borne de début date de 45 min', (await moiPrefs()).mode === 'perso' && (await moiPrefs()).mode_auto === true && Date.now() - le > 3.9 * 3600000);
      const o = await ouvrirEtLire('i');
      v('(i) début des heures : la page OUVRE en Pro (titre « … PRO »), le toast le dit', [o.cote, / — OP MESSAGES PRO$/.test(o.titre), o.mots.includes('Heures de travail : OP MESSAGES PRO')], ['pro', true, true]);
      vrai('(i) … et le service a gardé le côté Pro', await attendreService(p => p.mode === 'pro'));
      await capture(o.X, 'bs-5b-ouvre-pro');
      v('aucune erreur JavaScript (i)', o.X.erreurs, []); await o.X.ctx.close(); }
    { /* (ii) les heures ont FINI il y a 1 h, le dernier choix (Pro) date de 4 h : on ouvre en Perso */
      await regler({ mode: 'pro', mode_auto: true, heures_pro: fenetre(-200, -60) }); const le = await ancien(4 * 3600000);
      vrai('population (ii) : réglage allumé, côté du compte Pro, dernier choix vieux de 4 h, la borne de fin date de 60 min', (await moiPrefs()).mode === 'pro' && Date.now() - le > 3.9 * 3600000);
      const o = await ouvrirEtLire('ii');
      v('(ii) fin des heures : la page OUVRE en Perso, le toast le dit', [o.cote, !/ — OP MESSAGES PRO$/.test(o.titre), o.mots.includes('Fin des heures de travail : OP MESSAGES · Perso')], ['perso', true, true]);
      vrai('(ii) … et le service a gardé le côté Perso', await attendreService(p => p.mode === 'perso'));
      await capture(o.X, 'bs-5b-ouvre-perso');
      v('aucune erreur JavaScript (ii)', o.X.erreurs, []); await o.X.ctx.close(); }
    { /* (iii) les heures ont commencé il y a 45 min, mais le dernier choix (Perso) est de TOUT À L'HEURE : il l'emporte */
      await regler({ mode: 'perso', mode_auto: true, heures_pro: fenetre(-45, 200) });
      vrai('population (iii) : réglage allumé, dans les heures, choix récent (' + Math.round((Date.now() - (await moiPrefs()).mode_le) / 1000) + ' s)', (await moiPrefs()).mode_auto === true && Date.now() - (await moiPrefs()).mode_le < 60000);
      const o = await ouvrirEtLire('iii');
      v('(iii) un choix PLUS RÉCENT que la borne l\'emporte : la page ouvre en Perso, aucun toast d\'heures de travail', [o.cote, o.mots.filter(t => /heures de travail/i.test(t))], ['perso', []]);
      v('aucune erreur JavaScript (iii)', o.X.erreurs, []); await o.X.ctx.close(); }
    { /* (iv) le réglage est COUPÉ : un vieux choix reste ce qu'il est, même dans les heures */
      await regler({ mode: 'perso', mode_auto: false, heures_pro: fenetre(-45, 200) }); await ancien(4 * 3600000);
      vrai('population (iv) : réglage coupé, heures réglées, dernier choix vieux de 4 h', (await moiPrefs()).mode_auto === false && !!(await moiPrefs()).heures_pro);
      const o = await ouvrirEtLire('iv');
      v('(iv) réglage coupé : la page ouvre en Perso (le côté du compte), aucun toast', [o.cote, o.mots.filter(t => /heures de travail/i.test(t))], ['perso', []]);
      v('aucune erreur JavaScript (iv)', o.X.erreurs, []); await o.X.ctx.close(); }

    console.log('\n5c. En direct : la borne franchie (l\'horloge de la page avancée)');
    let clockOk = true;
    try {
      await regler({ mode: 'perso', mode_auto: true, heures_pro: fenetre(10, 250) });
      const H = await ouvrirPage('ana', 'bureau', { horloge: true });
      await pause(800);
      v('population : la page (horloge de page posée) ouvre en Perso, AVANT la borne (les heures commencent dans 10 min), sans toast', [(await etatPage(H)).cote, (await motsPris(H)).filter(t => /heures de travail/i.test(t))], ['perso', []]);
      await H.page.clock.fastForward(12 * 60000);
      vrai('la borne de début franchie (12 min plus tard sur l\'horloge de la page) : la page PASSE en Pro d\'elle-même, avec son toast', await coteEst(H, 'pro') && await motVu(H, 'Heures de travail : OP MESSAGES PRO'));
      vrai('… et le service a retenu Pro', await attendreService(p => p.mode === 'pro'));
      await capture(H, 'bs-5c-borne-pro');
      /* un geste fait APRÈS la borne tient, même quand le minuteur repasse */
      vrai('à la main, on repasse en Perso dans les heures (barre latérale)', await frappe(H, '.cote-seg-side [data-cote="perso"]', 'barre : Perso') && await coteEst(H, 'perso'));
      await H.page.clock.fastForward(31 * 60000);
      await pause(1200);
      v('⛔ 31 minutes plus tard, dans les heures, la page n\'a PAS défait ce choix (toujours Perso, le service aussi)', [(await etatPage(H)).cote, (await moiPrefs()).mode], ['perso', 'perso']);
      /* … et la borne de FIN défait, elle, un choix fait avant elle */
      vrai('on repasse en Pro à la main (dans les heures)', await frappe(H, '.cote-seg-side [data-cote="pro"]', 'barre : Pro') && await coteEst(H, 'pro'));
      await H.page.clock.fastForward(300 * 60000);
      vrai('la borne de FIN franchie (5 h plus tard) : la page repasse en Perso d\'elle-même — SENTINELLE : le minuteur tourne bien — avec son toast', await coteEst(H, 'perso') && await motVu(H, 'Fin des heures de travail : OP MESSAGES · Perso'));
      vrai('… et le service a retenu Perso', await attendreService(p => p.mode === 'perso'));
      v('aucune erreur JavaScript (en direct)', H.erreurs, []);
      await H.ctx.close();
    } catch (x) { clockOk = false; vrai('5c n\'a pas pu être jouée : ' + (x && x.stack || x), false); }
    vrai('(la partie 5c, page.clock, s\'est déroulée sans exception)', clockOk);

    /* ═══ Cléo, qui n'est pas pro, ne voit rien de tout ça ═══ */
    console.log('\n6. Cléo (aucun espace) : ni sélecteur, ni carte, ni passage automatique');
    const C = await ouvrirPage('cleo', 'tel');
    e = await etatPage(C);
    v('population : la liste de Cléo est rendue (Ana et « Mélange »), sans sélecteur', [e.noms.slice().sort(), e.segs], [['Ana Banc', 'Mélange'], []]);
    await C.page.evaluate(() => { location.hash = '#reglages'; });
    await att(C, () => !!document.getElementById('reg-sortir'));
    v('…son Profil est ouvert, sans carte « Perso et Pro », sans interrupteur ni ligne du passage automatique', [!!(await C.page.$('#reg-sortir')), await C.page.evaluate(() => { const c = document.getElementById('reg-cote'); return !c || c.hidden; }), !!(await C.page.$('#reg-mode-auto')), !!(await C.page.$('#reg-mode-heures'))], [true, true, false, false]);
    v('aucune erreur JavaScript (Cléo)', C.erreurs, []);
    await C.ctx.close();
  } catch (x) {
    vrai('la sonde est morte : ' + (x && x.stack || x), false);
  } finally {
    try { await b.close(); } catch (x) {}
    try { if (S) S.fermer(); } catch (x) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
