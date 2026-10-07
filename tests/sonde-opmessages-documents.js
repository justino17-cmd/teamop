/* ══ SONDE — LE SUIVI D'UN DOCUMENT, DANS LA CONVERSATION ET DANS LA SALLE DE RÉUNION (la vraie page servie) ══════════════════════════════════════════════════════════════
   7 octobre 2026 : « s'envoyer des documents par la réunion, par rapport au chat ; savoir qui a reçu le document, qui l'a téléchargé — très important pour les patrons ».
   Contre le VRAI service, Ana, Ben et Cléo, au bureau (souris) :
     1. dans la conversation du groupe, sous le fichier qu'Ana a envoyé : « Qui l'a téléchargé ? » ; il ouvre la feuille « Suivi du document » — 0 / 2 ;
        ⛔ sous le fichier de quelqu'un d'autre, rien ; le menu du message d'Ana propose « Qui l'a téléchargé », celui de Ben non ;
     2. Ben télécharge : la feuille, restée ouverte, passe à 1 / 2 et nomme Ben sous « Téléchargé » (elle se relit seule) ;
     3. dans la SALLE d'un appel de groupe (micros et caméras fabriqués par le navigateur) : la discussion propose « Envoyer un document » ; Ana envoie un fichier depuis la salle,
        il paraît en carte téléchargeable chez Ben, avec « Qui l'a téléchargé ? » chez Ana seule ; Ben le télécharge en touchant la carte ; le compteur d'Ana dit « 1 sur 2 », et
        le panneau « Suivi du document » nomme Ben.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-documents.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const F = require('./outils-pieces');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', '--autoplay-policy=no-user-gesture-required',
  '--allow-loopback-in-peer-connection', '--disable-features=WebRtcHideLocalIpsWithMdns'];
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-1234567' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cleo Banc' };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], appels: { balayageMs: 100, perduMs: 20000, parHeure: 900, parPaireHeure: 90, entrantsParHeure: 600 } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    for (const [x, y] of [[A0, B0], [A0, C0], [B0, C0]]) { const l = await x.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Comité de direction', membres: [B0.moi.id, C0.moi.id] })).j.conversation.id;
    const envoyer = (c, corps) => c.post('/api/conversations/' + G + '/messages', Object.assign({ cid: 'cid-' + Math.random().toString(36).slice(2, 12) }, corps));
    const dA = await F.deposer(A0, { conv: G, genre: 'fichier', nom: 'Budget 2027.pdf', corps: F.pdf() });
    await envoyer(A0, { type: 'fichier', piece: dA.j.id });
    const dB = await F.deposer(B0, { conv: G, genre: 'fichier', nom: 'Planning Ben.pdf', corps: F.pdf() });
    await envoyer(B0, { type: 'fichier', piece: dB.j.id });

    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 1280, height: 820 }, reducedMotion: 'reduce', locale: 'fr-FR', permissions: ['microphone', 'camera'], acceptDownloads: true });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [] }; page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };

    console.log('\n1. Dans la conversation');
    const A = await ouvrir('ana');
    await A.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
    vrai('population : la conversation montre les deux fichiers', await att(A, () => document.querySelectorAll('#conv-messages .fichier').length === 2));
    const liens = await A.page.evaluate(() => Array.from(document.querySelectorAll('#conv-messages [data-suivi]')).map(e => [e.textContent.trim(), !!e.closest('.msg') && /Budget/.test(e.closest('.msg').textContent)]));
    v('« Qui l\'a téléchargé ? » sous le fichier d\'Ana, et ⛔ PAS sous celui de Ben', liens, [['Qui l\'a téléchargé ?', true]]);
    await capture(A, 'doc-conversation');
    await A.page.locator('#conv-messages [data-suivi]').click();
    vrai('la feuille « Suivi du document » s\'ouvre : 0 / 2, Ben et Cléo « pas encore téléchargé »', await att(A, () => document.getElementById('feuille-titre').textContent === 'Suivi du document' && /0\s*\/ 2/.test((document.querySelector('.suivi-compte') || {}).textContent || '') && /Pas encore téléchargé/.test(document.getElementById('info-corps').textContent)));
    await F.lirePiece(B0, dA.j.id);
    vrai('2. Ben télécharge : la feuille restée ouverte passe à 1 / 2 et le nomme sous « Téléchargé » (relue seule)', await att(A, () => /1\s*\/ 2/.test((document.querySelector('.suivi-compte') || {}).textContent || '') && /Téléchargé/.test(document.getElementById('info-corps').textContent) && /Ben Banc/.test(document.querySelector('#info-corps .carte').textContent), null, 16000));
    await capture(A, 'doc-suivi-feuille');
    await A.page.keyboard.press('Escape');
    await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    const menus = [];
    for (const nom of ['Budget', 'Planning']) {
      await A.page.evaluate(n => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(n)); m.querySelector('.msg-plus').click(); }, nom);
      await att(A, () => !document.getElementById('menu-fond').hidden);
      menus.push(await A.page.evaluate(() => !!document.querySelector('#menu-msg [data-menu="suivi"]')));
      await A.page.keyboard.press('Escape'); await att(A, () => document.getElementById('menu-fond').hidden);
    }
    v('le menu du fichier d\'Ana propose « Qui l\'a téléchargé » ; ⛔ celui du fichier de Ben non', menus, [true, false]);

    console.log('\n3. Dans la salle d\'un appel de groupe');
    const B = await ouvrir('ben'), C = await ouvrir('cleo');
    /* l'appel part DU GROUPE (la caméra de l'en-tête) : c'est sa conversation que la salle montre en « Discussion » — un appel lancé depuis « Appels » n'en a pas */
    await A.page.evaluate(g => { location.hash = '#messages/' + g; }, G);
    await att(A, () => document.documentElement.dataset.conv === '1');
    await A.page.locator('#conv-cam').click();
    vrai('population : Ana est dans la salle', await att(A, () => document.documentElement.dataset.salle === '1', null, 20000));
    for (const S of [B, C]) {
      const r = await att(S, () => { const x = document.getElementById('appel-repondre'); return !!x && x.getClientRects().length > 0; }, null, 20000);
      if (r) await S.page.locator('#appel-repondre').click();
    }
    vrai('population : Ben est dans la salle', await att(B, () => document.documentElement.dataset.salle === '1', null, 20000));
    const ouvrirDiscussion = async (S) => { await S.page.locator('#salle-discussion').click(); return att(S, () => !!document.getElementById('salle-saisie-form')); };
    vrai('la discussion de la salle s\'ouvre chez Ana, avec « Envoyer un document »', await ouvrirDiscussion(A) && await A.page.evaluate(() => !!document.querySelector('[data-sa="doc-joindre"]')));
    const fichier = path.join(require('os').tmpdir(), 'Compte-rendu-' + process.pid + '.pdf'); fs.writeFileSync(fichier, F.pdf());
    await A.page.setInputFiles('#salle-doc', fichier);
    vrai('Ana envoie un document DEPUIS la salle : il paraît dans sa discussion, avec « Qui l\'a téléchargé ? »', await att(A, () => Array.from(document.querySelectorAll('#salle-panneau-corps .salle-doc')).some(e => /Compte-rendu/.test(e.textContent)) && !!document.querySelector('#salle-panneau-corps [data-sa="doc-suivi"]'), null, 20000));
    vrai('chez Ben : la carte téléchargeable du document d\'Ana, ⛔ sans « Qui l\'a téléchargé ? » (il n\'en est pas l\'auteur — sous SON fichier, oui)', await ouvrirDiscussion(B) && await att(B, () => {
      const msgs = Array.from(document.querySelectorAll('#salle-panneau-corps .salle-msg.doc')), cr = msgs.find(e => /Compte-rendu/.test(e.textContent)), sien = msgs.find(e => /Planning Ben/.test(e.textContent));
      return !!cr && !cr.querySelector('[data-sa="doc-suivi"]') && !!sien && !!sien.querySelector('[data-sa="doc-suivi"]');
    }, null, 20000));
    const [dl] = await Promise.all([B.page.waitForEvent('download', { timeout: 15000 }).catch(() => null), B.page.evaluate(() => Array.from(document.querySelectorAll('#salle-panneau-corps .salle-doc')).find(e => /Compte-rendu/.test(e.textContent)).click())]);
    vrai('Ben touche la carte : le navigateur télécharge « Compte-rendu… .pdf »', !!dl && /Compte-rendu/.test(dl.suggestedFilename()));
    if (dl) await dl.path().catch(() => null);
    vrai('chez Ana : « Téléchargé par 1 sur 2 » (relu seul)', await att(A, () => Array.from(document.querySelectorAll('#salle-panneau-corps [data-sa="doc-suivi"]')).some(e => /Téléchargé par 1 sur 2/.test(e.textContent)), null, 25000));
    await capture(A, 'doc-salle-discussion');
    await A.page.locator('#salle-panneau-corps [data-sa="doc-suivi"]').last().click();
    vrai('le panneau « Suivi du document » nomme Ben (téléchargé) et Cléo (pas encore)', await att(A, () => { const t = document.getElementById('salle-panneau-corps').textContent; return document.getElementById('salle-panneau-titre').textContent === 'Suivi du document' && /Ben Banc/.test(t) && /Cleo Banc/.test(t) && /1\s*\/ 2/.test(t); }));
    await capture(A, 'doc-salle-suivi');
    await A.page.locator('[data-sa="suivi-retour"]').click();
    vrai('« ‹ Discussion » revient au fil', await att(A, () => !!document.getElementById('salle-saisie-form')));
    for (const [nom, S] of [['Ana', A], ['Ben', B], ['Cléo', C]]) v('aucune erreur JavaScript chez ' + nom, S.erreurs, []);
    try { fs.unlinkSync(fichier); } catch (e) { /* rien */ }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
