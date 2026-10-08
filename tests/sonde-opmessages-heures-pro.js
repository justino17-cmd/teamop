/* ══ SONDE — LES HEURES DE TRAVAIL CÔTÉ PRO, DANS LA VRAIE PAGE SERVIE (formule de PRODUCTION : seul un compte pro a deux côtés) ══════════════════════════════════
   8 octobre 2026 : « il faut bien différencier le pro et le perso, que tout soit à part ». Contre le VRAI service, Ana (un espace abonné : Ben est son collègue ; Cléo, une amie) :
     1. téléphone, Réglages → Notifications : « Heures de travail (Pro) » existe chez Ana, coupé ; ⛔ pas chez Cléo (aucun espace : rien à couper) ;
     2. l'allumer : du lundi au vendredi, 9 h – 18 h, la page le DIT et le service le garde ; l'éditeur paraît (sept jours, deux heures) ;
     3. toucher « samedi » : il se presse, le service a six jours, la phrase dit « du lundi au samedi » ; changer le début (8 h 30) : le service a 510 ;
     4. ⛔ retirer le DERNIER jour est refusé, et la page le dit — le service garde ce jour ;
     5. hors des heures, côté Perso : un message de Ben (Pro) ne fait PAS surgir de bannière ; un message de Cléo (Perso), si — population ; côté Pro (on travaille) : celui de Ben surgit ;
     6. le couper : le service n'a plus rien, l'éditeur disparaît, la phrase dit « Coupé » ;
     7. la mise en page : à 360 px, les sept jours et les deux heures tiennent dans la carte (rien ne déborde) ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-heures-pro.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
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
const H = require(path.join(T.SERVICE, 'heures-pro.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };
const PARIS = 'Europe/Paris', JOUR = 86400000;

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null, S = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'ESPACEZXHEURES', proprio: A0.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_sonde_heures', abonnement: 'sub_sonde_heures', statut: 'active', places: 5 });
    { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: E, par: A0.moi.id, ttlMs: JOUR, max: 5 }); S.invitationAccepter({ h: sha(code), uid: B0.moi.id }); }
    const convs = {};
    for (const [y, nom] of [[B0, 'ben'], [C0, 'cleo']]) { const l = await A0.post('/api/contacts/lien', { max: 1 }); convs[nom] = (await y.post('/api/liens/accepter', { code: l.j.code })).j.conversation; }
    const directe = async (X, autre) => { const r = await X.post('/api/conversations/directe', { uid: autre }); return r.j && r.j.conversation ? r.j.conversation.id : null; };
    const DB = await directe(B0, A0.moi.id), DC = await directe(C0, A0.moi.id);
    const envoyer = (X, conv, texte) => X.post('/api/conversations/' + conv + '/messages', { cid: 'm_' + crypto.randomBytes(8).toString('hex'), texte });
    await envoyer(B0, DB, 'Bonjour Ana'); await envoyer(C0, DC, 'Coucou Ana');
    const cotes = Object.fromEntries(((await A0.get('/api/conversations')).j.conversations || []).map(x => [x.id, x.cote]));
    v('population : Ana est Pro (son espace est abonné), Cléo Perso ; chez Ana, la conversation avec Ben est Pro, celle avec Cléo Perso',
      [(await A0.get('/api/espaces')).j.formule, (await C0.get('/api/espaces')).j.formule, cotes[DB], cotes[DC]], ['pro', 'perso', 'pro', 'perso']);

    const ouvrirPage = async (login, largeur) => {
      const ctx = await b.newContext({ viewport: { width: largeur || 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const P = { ctx, page, erreurs: [], nom: login };
      pages.push(P);
      page.on('pageerror', e => P.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return P;
    };
    const att = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (P, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await P.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = (P, sel) => P.page.locator(sel).filter({ visible: true }).first().tap();
    const versNotifs = async (P) => {
      await P.page.evaluate(() => { location.hash = '#reglages/notifications'; });
      return att(P, () => { const c = document.getElementById('reg-notif'); return !!c && c.getClientRects().length > 0 && !!c.querySelector('#reg-notif-sw'); });
    };
    const reglageServi = async () => (await A0.get('/api/moi')).j.moi.prefs.heures_pro;
    const attService = async (attendu) => { for (let i = 0; i < 40; i++) { if (JSON.stringify(await reglageServi()) === JSON.stringify(attendu)) return true; await new Promise(r => setTimeout(r, 100)); } return false; };
    const aide = (P) => P.page.evaluate(() => { const x = document.querySelector('#reg-notif-heures small'); return x ? x.textContent : null; });
    const jours = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-hp-jour]')).map(x => x.getAttribute('aria-pressed') === 'true' ? 1 : 0).join(''));

    /* ═══ 1. LE RÉGLAGE EXISTE CHEZ ANA, PAS CHEZ CLÉO ═══ */
    console.log('\n1. Réglages → Notifications : « Heures de travail (Pro) » chez Ana (deux côtés), pas chez Cléo');
    const A = await ouvrirPage('ana');
    vrai('population : la section Notifications s\'ouvre chez Ana', await versNotifs(A));
    v('« Heures de travail (Pro) » est là, coupé : « Coupé : le Pro sonne à toute heure. »', [await A.page.evaluate(() => { const x = document.getElementById('reg-notif-heures'); return x ? x.getAttribute('aria-checked') : null; }), await aide(A)], ['false', 'Coupé : le Pro sonne à toute heure.']);
    const C = await ouvrirPage('cleo');
    vrai('population : la section Notifications s\'ouvre chez Cléo (avec sa « Pause pendant les réunions »)', await versNotifs(C) && await C.page.evaluate(() => !!document.getElementById('reg-notif-pause')));
    v('⛔ … mais pas d\'heures de travail chez elle : aucun espace, rien à couper', await C.page.evaluate(() => !!document.getElementById('reg-notif-heures')), false);

    /* ═══ 2. L'ALLUMER ═══ */
    console.log('\n2. L\'allumer : du lundi au vendredi, 9 h – 18 h');
    await toucher(A, '#reg-notif-heures');
    vrai('le service le garde : du lundi au vendredi, 540 → 1080', await attService({ jours: [1, 2, 3, 4, 5], debut: 540, fin: 1080 }), JSON.stringify(await reglageServi()));
    vrai('la page le DIT : « En dehors de 9 h – 18 h, du lundi au vendredi, … Les appels sonnent toujours »', await att(A, () => { const x = document.querySelector('#reg-notif-heures small'); return !!x && /^En dehors de 9 h – 18 h, du lundi au vendredi, les messages et les mentions Pro ne font pas sonner/.test(x.textContent) && /Les appels sonnent toujours/.test(x.textContent); }), await aide(A));
    v('l\'éditeur paraît : sept jours (L à V pressés), le début 09:00, la fin 18:00', [await jours(A), await A.page.evaluate(() => [document.getElementById('reg-hp-debut').value, document.getElementById('reg-hp-fin').value].join('–'))], ['1111100', '09:00–18:00']);
    await capture(A, 'hp-1-allume');

    /* ═══ 3. LES JOURS ET L'HEURE ═══ */
    console.log('\n3. « Samedi » se touche ; le début passe à 8 h 30');
    await toucher(A, '[data-hp-jour="6"]');
    vrai('le service a six jours', await attService({ jours: [1, 2, 3, 4, 5, 6], debut: 540, fin: 1080 }), JSON.stringify(await reglageServi()));
    vrai('samedi est pressé, la phrase dit « du lundi au samedi »', await att(A, () => document.querySelector('[data-hp-jour="6"]').getAttribute('aria-pressed') === 'true' && /du lundi au samedi/.test(document.querySelector('#reg-notif-heures small').textContent)), await aide(A));
    await A.page.locator('#reg-hp-debut').fill('08:30');
    await A.page.locator('#reg-hp-debut').dispatchEvent('change');
    vrai('le service a 8 h 30 (510)', await attService({ jours: [1, 2, 3, 4, 5, 6], debut: 510, fin: 1080 }), JSON.stringify(await reglageServi()));
    vrai('la phrase dit « 8 h 30 – 18 h »', await att(A, () => /^En dehors de 8 h 30 – 18 h, du lundi au samedi/.test(document.querySelector('#reg-notif-heures small').textContent)), await aide(A));

    /* ═══ 4. LE DERNIER JOUR ═══ */
    console.log('\n4. ⛔ Le dernier jour ne se retire pas');
    for (const j of [2, 3, 4, 5, 6]) { await toucher(A, '[data-hp-jour="' + j + '"]'); await att(A, (x) => document.querySelector('[data-hp-jour="' + x + '"]').getAttribute('aria-pressed') === 'false', j); }
    vrai('population : il ne reste que le lundi', await attService({ jours: [1], debut: 510, fin: 1080 }), JSON.stringify(await reglageServi()));
    await toucher(A, '[data-hp-jour="1"]');
    vrai('⛔ retirer le lundi est refusé, et la page le dit (« Garde au moins un jour »)', await att(A, () => /Garde au moins un jour/.test(document.getElementById('reg-notif').textContent)));
    v('… le lundi reste pressé, et le service le garde', [await jours(A), JSON.stringify(await reglageServi())], ['1000000', JSON.stringify({ jours: [1], debut: 510, fin: 1080 })]);

    /* ═══ 5. LA BANNIÈRE ═══ */
    console.log('\n5. Hors des heures, côté Perso : un message pro ne surgit pas ; côté Pro, si');
    const l = H.instantLocal(Date.now(), PARIS);
    const hors = { jours: [1, 2, 3, 4, 5, 6, 7], debut: (l.minute + 120) % 1440, fin: (l.minute + 180) % 1440 };
    await A0.post('/api/moi/maj', { prefs: { heures_pro: hors, mode: 'perso' } });
    await A.page.reload();
    await A.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
    await A.page.evaluate(() => { location.hash = '#messages'; });
    vrai('population : Ana est côté Perso, hors de ses heures (la page relue)', await att(A, () => document.documentElement.dataset.cote !== 'pro' && !document.getElementById('vue-messages').hidden));
    /* ⛔ LA BANNIÈRE EST UNE SEULE : elle ne garde que le DERNIER texte. Lire son texte à la fin ne dit pas ce qui a surgi entre-temps (la sentinelle remplace tout) — la
       première version de cette sonde passait ainsi sous la mutation qu'elle devait voir. La sonde relève donc CHAQUE texte affiché, par un observateur qu'elle pose elle-même. */
    const relever = (P) => P.page.evaluate(() => { window.__bann = []; const t = document.getElementById('notif-texte'); new MutationObserver(() => { if (t.textContent) window.__bann.push(t.textContent); }).observe(t, { childList: true, characterData: true, subtree: true }); });
    const releves = (P) => P.page.evaluate(() => window.__bann || []);
    /* ⛔ APRÈS UN RECHARGEMENT, LE FLUX SE REBRANCHE APRÈS L'ÉCRAN : un message parti avant lui ne se dit pas en bannière (la liste le relit, sans bannière). On ne mesure
       qu'une fois le flux PROUVÉ branché : Cléo écrit jusqu'à ce qu'une bannière surgisse (trois essais au plus) — au geste, pas au chronomètre. */
    const brancher = async (P) => {
      await relever(P);
      for (let i = 0; i < 3; i++) { await envoyer(C0, DC, 'Tu es là ? ' + i); if (await att(P, () => window.__bann.some(x => /Cléo/.test(x)), null, 4000)) return true; }
      return false;
    };
    vrai('population : le flux de la page est branché (une bannière de Cléo a surgi)', await brancher(A), JSON.stringify(await releves(A)));
    await relever(A);
    await envoyer(C0, DC, 'Ciné ce soir ?');
    vrai('population : le message de Cléo (Perso) SURGIT', await att(A, () => window.__bann.some(x => /Cléo/.test(x))), JSON.stringify(await releves(A)));
    await envoyer(B0, DB, 'Le devis du client ?');
    /* la SENTINELLE (un second message de Cléo, envoyé APRÈS celui de Ben) : le flux est ordonné — quand elle surgit, l'arrivée de Ben est déjà passée par la page */
    await envoyer(C0, DC, 'Sentinelle');
    vrai('population : la sentinelle surgit (deux bannières de Cléo relevées)', await att(A, () => window.__bann.filter(x => /Cléo/.test(x)).length >= 2), JSON.stringify(await releves(A)));
    v('⛔ aucune bannière de Ben n\'a surgi entre les deux messages de Cléo (chaque texte affiché relevé)', (await releves(A)).filter(x => /Ben/.test(x)), []);
    await A0.post('/api/moi/maj', { prefs: { mode: 'pro' } });
    await A.page.reload();
    await A.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
    vrai('population : Ana est côté Pro', await att(A, () => document.documentElement.dataset.cote === 'pro'));
    vrai('population : le flux de la page est rebranché (côté Pro, la bannière de Cléo surgit aussi)', await brancher(A), JSON.stringify(await releves(A)));
    await relever(A);
    await envoyer(B0, DB, 'Je suis encore au bureau');
    vrai('côté Pro (on travaille), le message de Ben SURGIT, même hors des heures', await att(A, () => window.__bann.some(x => /Ben/.test(x))), JSON.stringify(await releves(A)));

    /* ═══ 6. LE COUPER ═══ */
    console.log('\n6. Le couper');
    vrai('population : la section Notifications se rouvre', await versNotifs(A));
    await toucher(A, '#reg-notif-heures');
    vrai('le service n\'a plus rien', await attService(undefined), JSON.stringify(await reglageServi()));
    vrai('l\'éditeur disparaît, la phrase dit « Coupé » (la page repeinte après la réponse : on attend au geste)', await att(A, () => !document.querySelector('.hp-editeur') && (document.querySelector('#reg-notif-heures small') || {}).textContent === 'Coupé : le Pro sonne à toute heure.'), await aide(A));

    /* ═══ 7. LA MISE EN PAGE ═══ */
    console.log('\n7. À 360 px, tout tient dans la carte ; aucune erreur');
    await A0.post('/api/moi/maj', { prefs: { heures_pro: { jours: [1, 2, 3, 4, 5], debut: 540, fin: 1080 } } });
    const P360 = await ouvrirPage('ana', 360);
    vrai('population : l\'éditeur ouvert à 360 px', await versNotifs(P360) && await att(P360, () => !!document.querySelector('.hp-editeur')));
    const m = await P360.page.evaluate(() => {
      const c = document.getElementById('reg-notif').getBoundingClientRect();
      const tous = Array.from(document.querySelectorAll('.hp-jour, #reg-hp-debut, #reg-hp-fin'));
      return { n: tous.length, dedans: tous.every(e => { const r = e.getBoundingClientRect(); return r.left >= c.left - 0.5 && r.right <= c.right + 0.5; }), jour: Math.round(document.querySelector('.hp-jour').getBoundingClientRect().width), page: document.documentElement.scrollWidth <= innerWidth };
    });
    v('les sept jours et les deux heures DANS la carte (population : 9 éléments), une pastille ≥ 40 px, la page ne défile pas de côté', [m.n, m.dedans, m.jour >= 40, m.page], [9, true, true, true]);
    await capture(P360, 'hp-360');
    v('aucune erreur JavaScript, sur aucune page', pages.map(P => [P.nom, P.erreurs]), pages.map(P => [P.nom, []]));
  } catch (err) {
    vrai('la sonde s\'est déroulée sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    for (const P of pages) { try { await P.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
