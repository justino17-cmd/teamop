/* ══ SONDE — L'INVITATION À ÉCRIRE, DANS LA VRAIE PAGE SERVIE (deux navigateurs, au doigt) ═══════════════════════════════════════════════════════════════
   7 octobre 2026 : « quand on partage un contact, qu'on puisse lui envoyer un message ; et dans Messages, une invitation — un message envoyé à quelqu'un qui ne vous a pas ajouté ».
   Contre le VRAI service, à 390 px :
     1. Ana partage la fiche de Cléo dans « Chantier Nord » (Ana, Ben) ; chez Ben, la fiche montre « Écrire » ET « Ajouter » (Cléo n'est pas son contact) ;
     2. Ben touche « Écrire » : la directe s'ouvre, une ligne dit « Invitation… », Ben écrit ;
     3. chez Cléo : « Invitations 1 » en tête de la liste (sa conversation ne se mêle pas aux autres) ; elle y entre, ouvre, LIT — pas de champ, trois gestes ;
     4. Cléo accepte : le champ revient, elle répond ; chez Ben, la ligne « Invitation » disparaît et la réponse arrive ;
     5. Dan reçoit une invitation de Ben et la REFUSE : retour à la liste, plus d'« Invitations » ; chez Ben, rien ne change (toujours « Invitation ») ;
     6. aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-invitations.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', dan: 'pw-dan-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', dan: 'Dan Banc' };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo), D0 = await T.connecter(svc, og, 'dan', MOTS.dan);
    for (const [x, y] of [[A0, B0], [A0, C0], [A0, D0]]) { const l = await x.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [B0.moi.id] })).j.conversation.id;
    const fiche = async (uid) => (await A0.post('/api/conversations/' + G + '/messages', { cid: 'f-' + uid, type: 'contact', uid })).j.seq;
    await fiche(C0.moi.id); await fiche(D0.moi.id);
    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [] };
      page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const ecrireMsg = async (S, texte) => { await S.page.locator('#saisie').fill(texte); await S.page.locator('#envoyer').click(); };
    const B = await ouvrir('ben'), C = await ouvrir('cleo'), D = await ouvrir('dan');

    console.log('\n1. La fiche d\'une personne qui n\'est pas un contact : « Écrire » et « Ajouter »');
    await B.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
    vrai('population : chez Ben, deux fiches dans « Chantier Nord »', await att(B, () => document.querySelectorAll('#conv-messages .carte-msg.fiche').length === 2));
    v('la fiche de Cléo : « Écrire » et « Ajouter »', await B.page.evaluate(() => { const f = Array.from(document.querySelectorAll('#conv-messages .carte-msg.fiche')).find(x => /Cléo/.test(x.textContent)); return Array.from(f.querySelectorAll('.carte-btn')).map(x => x.textContent.trim()); }), ['Écrire', 'Ajouter']);
    await capture(B, 'invit-1-fiche');

    console.log('\n2. Ben touche « Écrire » : la directe s\'ouvre, l\'invitation est dite, il écrit');
    await B.page.locator('#conv-messages .carte-msg.fiche', { hasText: 'Cléo' }).locator('[data-fiche-ecrire-carte]').tap();
    vrai('la conversation avec Cléo s\'ouvre', await att(B, () => /Cléo/.test(document.getElementById('conv-titre') ? document.getElementById('conv-titre').textContent : document.querySelector('.conv-entete, #conv-ecran').textContent) && document.documentElement.dataset.conv === '1'));
    vrai('une ligne dit l\'invitation (texte seul, cinq messages), le champ est là — sans « + », appareil photo ni micro', await att(B, () => { const n = document.getElementById('compo-note'); const vis = id => { const e = document.getElementById(id); return !!e && e.getClientRects().length > 0; }; return !n.hidden && /Invitation/.test(n.textContent) && /cinq messages/.test(n.textContent) && !document.getElementById('compo').hidden && vis('saisie') && !vis('compo-plus') && !vis('compo-micro') && !vis('compo-camera'); }));
    await ecrireMsg(B, 'Bonjour Cléo, c\'est Ben du chantier Nord.');
    vrai('le message part (chez Ben)', await att(B, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-moi')).some(m => /chantier Nord/.test(m.textContent) && !/En attente/.test(m.textContent))));
    await capture(B, 'invit-2-ben-ecrit');

    console.log('\n3. Chez Cléo : « Invitations », la conversation, trois gestes');
    vrai('⛔ la bannière de Cléo dit « Invitation · Ben Banc » — pas « Quelqu\'un », pas le texte du message', await att(C, () => { const t = document.getElementById('notif-texte').textContent, h = document.getElementById('notif-aide').textContent; return /^Invitation · Ben Banc$/.test(t) && !/chantier Nord/.test(h) && /n'est pas dans tes contacts/.test(h); }));
    vrai('« Invitations 1 » en tête de sa liste', await att(C, () => { const x = document.querySelector('#liste-conv [data-invitations]'); return !!x && /Invitations/.test(x.textContent) && x.querySelector('.invit-n').textContent === '1' && /Ben/.test(x.textContent); }));
    v('⛔ la conversation de Ben ne se mêle pas à la liste (population : la ligne Invitations est là)', await C.page.evaluate(() => [!!document.querySelector('#liste-conv [data-invitations]'), document.querySelectorAll('#liste-conv [data-ouvrir]').length]), [true, 0]);
    await capture(C, 'invit-3-liste');
    await C.page.locator('#liste-conv [data-invitations]').tap();
    vrai('elle y entre : « ‹ Messages », « Invitations », la phrase, et Ben', await att(C, () => !!document.querySelector('#liste-conv [data-invit-retour]') && /Tant que tu n'as pas accepté/.test(document.getElementById('liste-conv').textContent) && document.querySelectorAll('#liste-conv [data-ouvrir]').length === 1));
    await capture(C, 'invit-4-sous-liste');
    await C.page.locator('#liste-conv [data-ouvrir]').tap();
    vrai('elle ouvre : le message de Ben se lit', await att(C, () => Array.from(document.querySelectorAll('#conv-messages .msg')).some(m => /chantier Nord/.test(m.textContent))));
    v('pas de champ ; le bandeau dit pourquoi, trois gestes', await C.page.evaluate(() => [document.getElementById('compo').hidden, document.getElementById('compo-invit').hidden, /ne fait pas partie de tes contacts/.test(document.getElementById('compo-invit-texte').textContent), Array.from(document.querySelectorAll('#compo-invit [data-invit]')).filter(x => !x.hidden).map(x => x.textContent)]),
      [true, false, true, ['Accepter', 'Refuser', 'Bloquer']]);
    const tailles = await C.page.evaluate(() => Array.from(document.querySelectorAll('#compo-invit [data-invit]')).map(x => { const r = x.getBoundingClientRect(); return r.height >= 44 && r.right <= innerWidth; }));
    v('les trois gestes : 44 px de haut, dans l\'écran', tailles, [true, true, true]);
    await capture(C, 'invit-5-cleo-lit');

    console.log('\n4. Cléo accepte : le champ revient, elle répond ; Ben voit la réponse');
    await C.page.locator('#compo-invit [data-invit="accepter"]').tap();
    vrai('le bandeau part, le champ revient', await att(C, () => document.getElementById('compo-invit').hidden && !document.getElementById('compo').hidden));
    await ecrireMsg(C, 'Bonjour Ben !');
    vrai('chez Ben : la réponse arrive, la ligne « Invitation » disparaît', await att(B, () => Array.from(document.querySelectorAll('#conv-messages .msg.de-autre')).some(m => /Bonjour Ben/.test(m.textContent)) && document.getElementById('compo-note').hidden));
    await capture(B, 'invit-6-ben-reponse');
    vrai('chez Cléo, plus d\'« Invitations » : la conversation est dans sa liste', await att(C, () => !document.querySelector('#liste-conv [data-invitations]') && document.querySelectorAll('#liste-conv [data-ouvrir]').length >= 1));

    console.log('\n5. Dan refuse : la conversation part de sa liste ; Ben n\'en sait rien');
    await B.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
    vrai('population : Ben revient dans « Chantier Nord »', await att(B, () => document.querySelectorAll('#conv-messages .carte-msg.fiche').length === 2));
    await B.page.locator('#conv-messages .carte-msg.fiche', { hasText: 'Dan' }).locator('[data-fiche-ecrire-carte]').tap();
    vrai('la directe avec Dan s\'ouvre, « Invitation »', await att(B, () => !document.getElementById('compo-note').hidden));
    await ecrireMsg(B, 'Salut Dan');
    vrai('chez Dan : « Invitations 1 »', await att(D, () => !!document.querySelector('#liste-conv [data-invitations]')));
    await D.page.locator('#liste-conv [data-invitations]').tap();
    await att(D, () => document.querySelectorAll('#liste-conv [data-ouvrir]').length === 1);
    await D.page.locator('#liste-conv [data-ouvrir]').tap();
    vrai('population : Dan lit l\'invitation', await att(D, () => !document.getElementById('compo-invit').hidden));
    await D.page.locator('#compo-invit [data-invit="refuser"]').tap();
    vrai('Dan refuse : retour à la liste, plus d\'« Invitations », aucune conversation de Ben', await att(D, () => document.documentElement.dataset.conv !== '1' && !document.querySelector('#liste-conv [data-invitations]') && !Array.from(document.querySelectorAll('#liste-conv [data-ouvrir]')).some(x => /Ben/.test(x.textContent))));
    await capture(D, 'invit-7-dan-refuse');
    await B.page.waitForTimeout(800);
    v('⛔ chez Ben, rien ne change : toujours « Invitation », le champ ouvert', await B.page.evaluate(() => [!document.getElementById('compo-note').hidden, !document.getElementById('compo').hidden]), [true, true]);

    v('aucune erreur JavaScript (Ben, Cléo, Dan)', [B.erreurs, C.erreurs, D.erreurs], [[], [], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
