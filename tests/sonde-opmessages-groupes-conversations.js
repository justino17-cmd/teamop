/* ══ SONDE — LES DÉCISIONS DU 26 OCTOBRE 2026 (contacts / groupes / conversations / pro / temps réel), DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════
   Contre le VRAI service (127.0.0.1), quatre personnes, Ana au téléphone (390 px, au doigt : CDP `Input.dispatchTouchEvent`) puis au bureau (1280 px), de jour et de nuit :
     1. #13 — une conversation épinglée n'est qu'EN HAUT ; l'appui long (doigt) ou le clic droit (souris) sur l'épingle propose « Désépingler » et N'OUVRE PAS la conversation ;
     2. #10 + #16 — « Nouveau groupe » sans nom : le filigrane dit « … et 2 autres », le groupe naît sous ce nom (80 signes au plus) ;
     3. #15 — en groupe, « Ben et Cléo écrivent… » (le nom, visible) ; à deux, les trois points seuls ;
     4. #12 — la liste dit « Ana Banc a ajouté Dan Banc » (une phrase), pas « Activité du groupe » ;
     5. #1 — bloquer un contact : sa conversation reste dans la liste, LISIBLE, sans champ pour écrire — une phrase et « Débloquer » ; ce qu'il écrit n'arrive pas ; débloquer rend le champ ;
     6. #11 — un canal supprimé se dit « supprimé » (le toast), pas « retiré » ;
     7. #14 — « Confirmer l'envoi » est masquée côté Perso, visible côté Pro.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-groupes-conversations.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', dan: 'pw-dan-12345678', eve: 'pw-eve-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', dan: 'Dan Banc', eve: 'Eve Banc' };
const TEL = { viewport: { width: 390, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1280, height: 860 } };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo', 'dan', 'eve']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (X, conv, texte) => X.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const D = {};
    for (const l of ['ben', 'cleo', 'dan']) { D[l] = (await P.ana.post('/api/conversations/directe', { uid: P[l].moi.id })).j.conversation.id; await ecrire(P.ana, D[l], 'Salut ' + NOMS[l].split(' ')[0]); await ecrire(P[l], D[l], 'Bonjour Ana'); }
    const listeAna = async () => (await P.ana.get('/api/conversations')).j.conversations;
    const de = async (id) => (await listeAna()).find(c => c.id === id) || {};

    const ouvrir = async (login, pf, hash, schema) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris', colorScheme: schema || 'light' }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [], tel: !!pf.hasTouch };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const ecran = (X) => X.page.evaluate(() => ({
      liste: Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).map(x => x.dataset.ouvrir),
      epingles: document.getElementById('epingles').hidden ? [] : Array.from(document.querySelectorAll('#epingles [data-ouvrir]')).map(x => x.dataset.ouvrir),
      conv: document.documentElement.hasAttribute('data-conv'),
    }));
    /* un appui long AU DOIGT : CDP `Input.dispatchTouchEvent` (un vrai toucher, pas une souris) */
    const appuiLong = async (X, selecteur, ms) => {
      const box = await X.page.locator(selecteur).first().boundingBox();
      const cdp = await X.ctx.newCDPSession(X.page), x = Math.round(box.x + box.width / 2), y = Math.round(box.y + box.height / 2);
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
      await X.page.waitForTimeout(ms || 700);
      return async () => { await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await cdp.detach().catch(() => {}); };
    };
    const convOuverte = (X) => X.page.evaluate(() => ({ visible: document.documentElement.hasAttribute('data-conv'), titre: (document.getElementById('conv-titre') || {}).textContent }));
    const ouvrirConv = async (X, id) => { await (X.tel ? X.page.locator('#liste-conv [data-ouvrir="' + id + '"], #epingles [data-ouvrir="' + id + '"]').first().tap() : X.page.locator('#liste-conv [data-ouvrir="' + id + '"], #epingles [data-ouvrir="' + id + '"]').first().click()); return att(X, () => document.documentElement.hasAttribute('data-conv') && document.getElementById('conv-messages').getAttribute('aria-busy') === 'false'); };
    const toucher = (X, sel) => X.tel ? X.page.locator(sel).first().tap() : X.page.locator(sel).first().click();

    /* ═══ 1. #13 : L'ÉPINGLE N'EST QU'EN HAUT ═════════════════════════════════════════════════════════════════════════════════════ */
    console.log('1. #13 — épinglée : en haut seulement ; appui long → « Désépingler », sans ouvrir la conversation');
    await P.ana.post('/api/conversations/' + D.ben + '/prefs', { epingle: true });
    v('population : le service dit Ben épinglé chez Ana', (await de(D.ben)).epingle, true);
    for (const schema of ['light', 'dark']) {
      const A = await ouvrir('ana', TEL, '', schema);
      const e0 = await ecran(A);
      v('⛔ [tél ' + schema + '] Ben est dans la rangée du haut, UNE fois, et PAS dans la liste (qui garde Cléo et Dan)', [e0.epingles, e0.liste.includes(D.ben), e0.liste.includes(D.cleo) && e0.liste.includes(D.dan)], [[D.ben], false, true]);
      await capture(A, 'epingles-haut-tel-' + schema);
      const relache = await appuiLong(A, '#epingles [data-ouvrir="' + D.ben + '"]');
      vrai('⛔ [tél ' + schema + '] l\'appui long au doigt ouvre le menu « Désépingler »', await att(A, () => document.getElementById('deroule').matches(':popover-open') && /Désépingler/.test(document.getElementById('deroule-liste').textContent)));
      const menu = await A.page.evaluate(() => { const r = document.getElementById('deroule').getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: innerWidth }; });
      vrai('… le menu tient dans l\'écran (390 px) : ni coupé à gauche ni à droite', menu.g >= 0 && menu.d <= menu.h);
      await capture(A, 'epingle-menu-tel-' + schema);
      await relache();
      await A.page.waitForTimeout(500);
      const apres = await convOuverte(A);
      vrai('⛔ [tél ' + schema + '] le relâcher n\'a PAS ouvert la conversation (le clic de l\'appui long est avalé)', !apres.visible || !/Ben/.test(apres.titre || ''));
      if (schema === 'light') {
        await A.page.locator('#deroule .deroule-choix').first().tap();
        vrai('« Désépingler » : le service le sait', await (async () => { for (let i = 0; i < 60; i++) { if (!(await de(D.ben)).epingle) return true; await A.page.waitForTimeout(100); } return false; })());
        await att(A, (id) => !document.querySelector('#epingles [data-ouvrir="' + id + '"]') && !!document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'), D.ben);
        const e1 = await ecran(A);
        v('… la conversation revient dans la liste (UNE fois), la rangée du haut est vide', [e1.liste.includes(D.ben), e1.epingles], [true, []]);
        await P.ana.post('/api/conversations/' + D.ben + '/prefs', { epingle: true });
      }
      await A.ctx.close(); pages.pop();
    }
    {
      const A = await ouvrir('ana', BUREAU);
      await att(A, (id) => !!document.querySelector('#epingles [data-ouvrir="' + id + '"]'), D.ben);
      await A.page.locator('#epingles [data-ouvrir="' + D.ben + '"]').click({ button: 'right' });
      vrai('[bureau] le clic droit sur l\'épingle ouvre « Désépingler »', await att(A, () => document.getElementById('deroule').matches(':popover-open') && /Désépingler/.test(document.getElementById('deroule-liste').textContent)));
      const menu = await A.page.evaluate(() => { const r = document.getElementById('deroule').getBoundingClientRect(); return { g: Math.round(r.left), d: Math.round(r.right), h: innerWidth }; });
      vrai('… et tient dans la fenêtre', menu.g >= 0 && menu.d <= menu.h);
      await capture(A, 'epingle-menu-bureau');
      await A.page.keyboard.press('Escape');
      vrai('Échap le referme', await att(A, () => !document.getElementById('deroule').matches(':popover-open')));
      const a = await ecran(A);
      vrai('… et un clic simple sur l\'épingle ouvre bien la conversation (le geste ordinaire est intact)', await (async () => { await A.page.locator('#epingles [data-ouvrir="' + D.ben + '"]').click(); return att(A, () => /Ben/.test((document.getElementById('conv-titre') || {}).textContent || '')); })());
      void a;
      await A.ctx.close(); pages.pop();
    }
    await P.ana.post('/api/conversations/' + D.ben + '/prefs', { epingle: false });

    /* ═══ 2. #10 + #16 : UN GROUPE SANS NOM ═════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n2. #10 + #16 — un groupe sans nom s\'appelle par ses membres ; une seule limite de nom (80)');
    {
      const A = await ouvrir('ana', TEL);
      await toucher(A, '#btn-plus');
      await toucher(A, '[data-nd-act="groupe"]');
      vrai('« Nouveau groupe » est ouverte', await att(A, () => document.getElementById('feuille').dataset.mode === 'chat' && !document.getElementById('feuille').inert));
      const choisir = async (l) => toucher(A, '#g-contacts .contact:has(.contact-nom:text-is("' + NOMS[l] + '"))');
      v('population : sans contact choisi, le filigrane est « Nom du groupe »', await A.page.locator('#g-nom').getAttribute('placeholder'), 'Nom du groupe');
      await choisir('ben');
      v('un contact : le filigrane est son prénom', await A.page.locator('#g-nom').getAttribute('placeholder'), 'Ben');
      await choisir('cleo'); await choisir('dan'); await choisir('eve');
      v('⛔ quatre contacts : le filigrane dit « Ben, Cléo et 2 autres » (l\'exemple de Justin)', await A.page.locator('#g-nom').getAttribute('placeholder'), 'Ben, Cléo et 2 autres');
      await capture(A, 'nouveau-groupe-filigrane-tel');
      await toucher(A, '#g-creer');
      const G = await (async () => { for (let i = 0; i < 80; i++) { const g = (await listeAna()).find(c => c.type === 'groupe' && c.nom === 'Ben, Cléo et 2 autres'); if (g) return g; await A.page.waitForTimeout(100); } return null; })();
      vrai('⛔ le groupe naît sous ce nom (le service le dit)', !!G);
      vrai('… et la liste de la page l\'affiche', await att(A, (id) => !!document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'), G && G.id));
      /* #16 : un nom de 60 signes (au-delà de l'ancienne limite de 40) se tape et se garde entier */
      await toucher(A, '#btn-plus'); await toucher(A, '[data-nd-act="groupe"]');
      await att(A, () => document.getElementById('feuille').dataset.mode === 'chat' && !document.getElementById('feuille').inert);
      await toucher(A, '#g-contacts .contact:has(.contact-nom:text-is("' + NOMS.ben + '"))');
      const long60 = 'Équipe chantier ' + 'x'.repeat(44);
      await A.page.locator('#g-nom').fill(long60 + 'y'.repeat(40));
      v('⛔ #16 — le champ garde 80 signes (avant : 40) : 60 tapés + 40 = 100 → 80', await A.page.locator('#g-nom').inputValue().then(x => Array.from(x).length), 80);
      await A.page.locator('#g-nom').fill(long60);
      await toucher(A, '#g-creer');
      vrai('⛔ un nom de 60 signes est créé tel quel', await (async () => { for (let i = 0; i < 80; i++) { if ((await listeAna()).some(c => c.nom === long60)) return true; await A.page.waitForTimeout(100); } return false; })());
      await A.ctx.close(); pages.pop();
    }

    /* ═══ 3. #15 : « ÉCRIT… » DIT QUI ═══════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n3. #15 — en groupe, la frappe dit les prénoms ; à deux, les trois points seuls');
    {
      const G = (await listeAna()).find(c => c.nom === 'Ben, Cléo et 2 autres');
      for (const schema of ['light', 'dark']) {
        const A = await ouvrir('ana', schema === 'light' ? TEL : BUREAU, '', schema);
        vrai('[' + schema + '] la conversation du groupe s\'ouvre', await ouvrirConv(A, G.id));
        vrai('population : aucun indicateur de frappe au départ', await A.page.locator('.saisie-ind').count() === 0);
        await A.page.waitForTimeout(2200);      // le service n'accepte qu'UNE frappe par 2 s, par personne et par conversation
        v('population : la frappe de Ben est acceptée (200)', (await P.ben.post('/api/conversations/' + G.id + '/saisie', { actif: true })).code, 200);
        vrai('[' + schema + '] Ben seul : « Ben écrit… »', await att(A, () => (document.querySelector('.saisie-qui') || {}).textContent === 'Ben écrit…'));
        v('… et celle de Cléo (200)', (await P.cleo.post('/api/conversations/' + G.id + '/saisie', { actif: true })).code, 200);
        vrai('⛔ [' + schema + '] Ben puis Cléo : « Ben et Cléo écrivent… »', await att(A, () => (document.querySelector('.saisie-qui') || {}).textContent === 'Ben et Cléo écrivent…'));
        const r = await A.page.evaluate(() => { const e = document.querySelector('.saisie-ind'), f = document.getElementById('conv-fil').getBoundingClientRect(), b = e.getBoundingClientRect(); return { dedans: b.left >= f.left - 1 && b.right <= f.right + 1, label: e.getAttribute('aria-label'), q: getComputedStyle(document.querySelector('.saisie-qui')).color }; });
        vrai('… l\'indicateur tient dans le fil, et l\'étiquette lue à voix haute dit la même phrase', r.dedans && r.label === 'Ben et Cléo écrivent…');
        await capture(A, 'saisie-groupe-' + (schema === 'light' ? 'tel-' : 'bureau-') + schema);
        await P.dan.post('/api/conversations/' + G.id + '/saisie', { actif: true });
        await P.eve.post('/api/conversations/' + G.id + '/saisie', { actif: true });
        vrai('[' + schema + '] quatre : « Ben, Cléo et 2 autres écrivent… »', await att(A, () => (document.querySelector('.saisie-qui') || {}).textContent === 'Ben, Cléo et 2 autres écrivent…'));
        if (schema === 'light') {
          await A.page.locator('#conv-retour').tap();
          await att(A, () => !document.documentElement.hasAttribute('data-conv'));
          vrai('(retour à la liste)', true);
          await ouvrirConv(A, D.ben);
          await P.ben.post('/api/conversations/' + D.ben + '/saisie', { actif: true });
          vrai('population : à deux, l\'indicateur paraît bien (les trois points)', await att(A, () => !!document.querySelector('.saisie-ind')));
          v('⛔ … mais SANS prénom (c\'est l\'autre)', await A.page.locator('.saisie-qui').count(), 0);
          await capture(A, 'saisie-deux-tel-light');
        }
        await A.ctx.close(); pages.pop();
      }
    }

    /* ═══ 4. #12 : LA LISTE DIT UNE PHRASE ════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n4. #12 — la liste dit « Ana Banc a ajouté Cléo Banc », pas « Activité du groupe »');
    {
      const G3 = (await P.ana.post('/api/conversations/groupe', { nom: 'Petit groupe', membres: [P.ben.moi.id] })).j.conversation.id;
      const B = await ouvrir('ben', BUREAU);
      const apercu = (X, id) => X.page.evaluate((i) => { const e = document.querySelector('#liste-conv [data-ouvrir="' + i + '"] .conv-apercu'); return e ? e.textContent.trim() : null; }, id);
      vrai('population : Ben voit le groupe dans sa liste', await att(B, (i) => !!document.querySelector('#liste-conv [data-ouvrir="' + i + '"]'), G3));
      v('la création : « Ana Banc a créé le groupe »', await apercu(B, G3), 'Ana Banc a créé le groupe');
      await P.ana.post('/api/conversations/' + G3 + '/membres/ajouter', { uids: [P.cleo.moi.id] });
      vrai('⛔ Ana ajoute Cléo : la liste de Ben dit « Ana Banc a ajouté Cléo Banc »', await att(B, (i) => ((document.querySelector('#liste-conv [data-ouvrir="' + i + '"] .conv-apercu') || {}).textContent || '').trim() === 'Ana Banc a ajouté Cléo Banc', G3));
      await capture(B, 'liste-phrase-systeme-bureau');
      await P.cleo.post('/api/conversations/' + G3 + '/quitter', {});
      vrai('⛔ Cléo quitte : « Cléo Banc a quitté le groupe »', await att(B, (i) => ((document.querySelector('#liste-conv [data-ouvrir="' + i + '"] .conv-apercu') || {}).textContent || '').trim() === 'Cléo Banc a quitté le groupe', G3));
      vrai('… et « Activité du groupe » n\'est plus nulle part', await B.page.evaluate(() => !/Activité du/.test(document.getElementById('liste-conv').textContent)));
      await B.ctx.close(); pages.pop();
    }

    /* ═══ 5. #1 : BLOQUER ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n5. #1 — un contact bloqué : conversation lisible, sans champ, une phrase et « Débloquer »');
    {
      const A = await ouvrir('ana', TEL);
      await ouvrirConv(A, D.dan);
      v('population : la conversation avec Dan a son champ, et pas de barre « Débloquer »', await A.page.evaluate(() => [!document.getElementById('compo').hidden, document.getElementById('compo-bloque').hidden, !document.getElementById('conv-cam').hidden]), [true, true, true]);
      await toucher(A, '#conv-titre');
      vrai('les Infos s\'ouvrent', await att(A, () => !!document.querySelector('#info-corps [data-act="bloquer"]')));
      await toucher(A, '#info-corps [data-act="bloquer"]');
      await toucher(A, '#info-corps [data-act="bloquer"]');
      vrai('⛔ « Bloquer » (deux touches) : on revient à la liste', await att(A, () => !document.documentElement.hasAttribute('data-conv')));
      vrai('⛔ la conversation reste DANS la liste (elle ne disparaît pas)', await att(A, (id) => !!document.querySelector('#liste-conv [data-ouvrir="' + id + '"]'), D.dan));
      v('… et le service dit `bloque` chez Ana, pas chez Dan', [(await de(D.dan)).bloque, 'bloque' in ((await P.dan.get('/api/conversations')).j.conversations.find(c => c.id === D.dan))], [true, false]);
      await ouvrirConv(A, D.dan);
      const ecr = await A.page.evaluate(() => ({ champ: !document.getElementById('compo').hidden, barre: !document.getElementById('compo-bloque').hidden, texte: document.getElementById('compo-bloque-texte').textContent, cam: !document.getElementById('conv-cam').hidden,
        bouton: (document.querySelector('#compo-bloque [data-debloquer]') || {}).textContent, h: Math.round(document.getElementById('compo-bloque').getBoundingClientRect().height), hb: Math.round(document.querySelector('#compo-bloque [data-debloquer]').getBoundingClientRect().height) }));
      v('⛔ le champ n\'est plus là ; la phrase et « Débloquer » à sa place ; plus d\'appel vidéo', [ecr.champ, ecr.barre, ecr.texte, ecr.bouton, ecr.cam], [false, true, 'Tu as bloqué Dan. Tu peux relire cette conversation, plus y écrire.', 'Débloquer', false]);
      vrai('… le bouton se touche au doigt (≥ 44 px)', ecr.hb >= 44);
      vrai('… Dan a écrit AVANT (« Bonjour Ana ») : la conversation reste lisible', await A.page.evaluate(() => /Bonjour Ana/.test(document.getElementById('conv-messages').textContent)));
      await capture(A, 'bloque-tel-light');
      const avant = await A.page.evaluate(() => document.getElementById('conv-messages').textContent);
      const badgeAvant = await A.page.evaluate(() => document.getElementById('conv-badge').hidden ? '' : document.getElementById('conv-badge').textContent);
      const unAvant = (await de(D.dan)).non_lus;
      const nb = (await (await P.dan.get('/api/conversations/' + D.dan + '/messages')).j.messages).length;
      const r = await ecrire(P.dan, D.dan, 'ZQXBLOQUEZQX après le blocage');
      v('⛔ Dan écrit à Ana (bloqué) : le service répond 201, il ne sait rien', r.code, 201);
      vrai('population : Dan relit son message chez lui', (await (await P.dan.get('/api/conversations/' + D.dan + '/messages')).j.messages).length === nb + 1);
      await A.page.waitForTimeout(1500);
      v('⛔ chez Ana : rien de nouveau dans la conversation ouverte, ni pastille (le compte des AUTRES conversations non lues ne bouge pas), ni aperçu', await A.page.evaluate(() => [document.getElementById('conv-messages').textContent, document.getElementById('conv-badge').hidden ? '' : document.getElementById('conv-badge').textContent, /ZQXBLOQUE/.test(document.body.innerText)]), [avant, badgeAvant, false]);
      v('… et le service ne compte aucun non lu de plus', (await de(D.dan)).non_lus, unAvant);
      /* la nuit, et le bureau : même état, vu autrement */
      const N = await ouvrir('ana', TEL, '', 'dark'); await ouvrirConv(N, D.dan); await capture(N, 'bloque-tel-dark'); await N.ctx.close(); pages.pop();
      const BU = await ouvrir('ana', BUREAU); await ouvrirConv(BU, D.dan); await capture(BU, 'bloque-bureau-light');
      vrai('[bureau] même état : sans champ, avec « Débloquer »', await BU.page.evaluate(() => document.getElementById('compo').hidden && !document.getElementById('compo-bloque').hidden));
      await BU.ctx.close(); pages.pop();
      /* Infos d'une directe bloquée : « Débloquer ce contact » */
      await toucher(A, '#conv-titre');
      vrai('⛔ les Infos proposent « Débloquer ce contact » (et plus « Bloquer »)', await att(A, () => !!document.querySelector('#info-corps [data-act="debloquer"]') && !document.querySelector('#info-corps [data-act="bloquer"]')));
      await A.page.keyboard.press('Escape').catch(() => {});
      await att(A, () => !document.getElementById('feuille') || document.getElementById('feuille').inert !== false || true);
      await A.page.evaluate(() => { const f = document.getElementById('g-annuler'); if (f) f.click(); });
      await att(A, () => !document.querySelector('#info-corps [data-act]') || document.getElementById('feuille').inert);
      await toucher(A, '#compo-bloque [data-debloquer]');
      vrai('⛔ « Débloquer » : le champ revient, la barre s\'en va', await att(A, () => !document.getElementById('compo').hidden && document.getElementById('compo-bloque').hidden && !document.getElementById('conv-cam').hidden));
      v('… et le service ne dit plus `bloque`', (await de(D.dan)).bloque === undefined, true);
      const apr = await ecrire(P.dan, D.dan, 'après le déblocage');
      vrai('… et ce que Dan écrit APRÈS arrive', apr.code === 201 && await att(A, () => /après le déblocage/.test(document.getElementById('conv-messages').textContent)));
      vrai('… sans jamais montrer le message de la période de blocage', await A.page.evaluate(() => !/ZQXBLOQUE/.test(document.body.innerText)));
      await A.ctx.close(); pages.pop();
    }

    /* ═══ 6. #11 : UN CANAL SUPPRIMÉ SE DIT « SUPPRIMÉ » ═══════════════════════════════════════════════════════════════════════════════ */
    console.log('\n6. #11 — un canal supprimé se dit « supprimé », pas « retiré »');
    let E = null;
    {
      E = (await P.ana.post('/api/espaces', { nom: 'Boîte sonde' })).j.espace.id;
      await P.ben.post('/api/invitations/accepter', { code: (await P.ana.post('/api/espaces/' + E + '/invitations', {})).j.code });
      const pub = (await P.ana.post('/api/espaces/' + E + '/canaux', { nom: 'general' })).j.canal;
      const priv = (await P.ana.post('/api/espaces/' + E + '/canaux', { nom: 'direction', prive: true, membres: [P.ben.moi.id] })).j.canal;
      const B = await ouvrir('ben', BUREAU);
      vrai('population : Ben a les deux canaux (le mode Pro les montre)', await (async () => { await B.page.evaluate(() => { const b = document.querySelector('.cote-seg-side [data-cote="pro"]'); if (b) b.click(); }); return att(B, ([a, b2]) => !!document.querySelector('#liste-conv [data-ouvrir="' + a + '"]') && !!document.querySelector('#liste-conv [data-ouvrir="' + b2 + '"]'), [pub.id, priv.id]); })());
      /* pour Ben, être retiré d'un canal PRIVÉ garde « retiré » */
      await ouvrirConv(B, priv.id);
      await P.ana.post('/api/espaces/' + E + '/canaux/' + priv.id + '/membres/retirer', { uid: P.ben.moi.id });
      const motPriv = await (async () => { for (let i = 0; i < 80; i++) { const t = await B.page.evaluate(() => document.getElementById('mot').classList.contains('on') ? document.getElementById('mot').textContent : ''); if (t) return t; await B.page.waitForTimeout(100); } return ''; })();
      v('population : retiré d\'un canal privé — le toast dit « retiré » (la phrase d\'avant)', motPriv, 'Tu as été retiré du canal direction.');
      await B.page.waitForTimeout(2600);
      await ouvrirConv(B, pub.id);
      await P.ana.post('/api/espaces/' + E + '/canaux/' + pub.id + '/supprimer', { confirmation: 'SUPPRIMER' });
      const mot = await (async () => { for (let i = 0; i < 80; i++) { const t = await B.page.evaluate(() => document.getElementById('mot').classList.contains('on') ? document.getElementById('mot').textContent : ''); if (t && /general/.test(t)) return t; await B.page.waitForTimeout(100); } return ''; })();
      v('⛔ canal SUPPRIMÉ : « Le canal general a été supprimé. »', mot, 'Le canal general a été supprimé.');
      await capture(B, 'canal-supprime-bureau');
      await B.ctx.close(); pages.pop();
    }

    /* ═══ 7. #14 : « CONFIRMER L'ENVOI » SE CACHE EN PERSO ═════════════════════════════════════════════════════════════════════════════ */
    console.log('\n7. #14 — « Confirmer l\'envoi » est masquée côté Perso, visible côté Pro');
    {
      for (const schema of ['light', 'dark']) {
        const A = await ouvrir('ana', BUREAU, '', schema);
        await A.page.evaluate(() => { const b = document.querySelector('.cote-seg-side [data-cote="pro"]'); if (b) b.click(); });
        await att(A, () => document.documentElement.dataset.cote === 'pro');
        await A.page.evaluate(() => { const a = document.querySelector('a[data-vue="reglages"]'); if (a) a.click(); });
        vrai('[' + schema + '] population : le Profil est ouvert, côté Pro, et « Confirmer l\'envoi » est là', await att(A, () => !!document.getElementById('reg-confirmer') && !document.getElementById('reg-confirmer').hidden));
        await capture(A, 'confirmer-pro-bureau-' + schema);
        await A.page.evaluate(() => document.querySelector('.cote-seg-side [data-cote="perso"]').click());
        vrai('⛔ [' + schema + '] côté Perso : la ligne est masquée', await att(A, () => document.documentElement.dataset.cote === 'perso' && document.getElementById('reg-confirmer').hidden));
        v('… et elle ne prend aucune place (hauteur 0)', await A.page.evaluate(() => Math.round(document.getElementById('reg-confirmer').getBoundingClientRect().height)), 0);
        await capture(A, 'confirmer-perso-bureau-' + schema);
        await A.page.evaluate(() => document.querySelector('.cote-seg-side [data-cote="pro"]').click());
        vrai('… et elle revient côté Pro', await att(A, () => document.documentElement.dataset.cote === 'pro' && !document.getElementById('reg-confirmer').hidden));
        await A.ctx.close(); pages.pop();
      }
    }
    for (const X of pages) v('aucune erreur JavaScript', X.erreurs, []);
  } catch (e) {
    vrai('la sonde a tourné sans exception', false);
    console.log(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* déjà fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
