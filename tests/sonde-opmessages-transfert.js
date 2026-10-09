/* ══ SONDE — « TRANSFÉRER » UN MESSAGE, DANS LA VRAIE PAGE SERVIE (9 octobre 2026) ════════════════════════════════════════════════════════════════
   L'idée retenue de l'inventaire (« continue le développement de op message ») : un message vers une à cinq conversations, en mon nom, marqué « Transféré ».
   Contre le VRAI service, quatre personnes ; Ana au téléphone (360 px, l'écran le plus étroit), puis au bureau :
     1. le menu d'un message reçu propose « Transférer » ; la feuille s'ouvre sur l'aperçu (« Message de Ben ») et la liste des conversations, rien de coché, « Envoyer » éteint ;
     2. ⛔ ÉCHEC PARTIEL : Cléo + le groupe d'annonces de Ben (Ana n'y écrit pas) → Cléo reçoit, la feuille RESTE ouverte sur l'annonce, sa raison dite et nommée ;
     3. Cléo voit « Transféré » au-dessus de la bulle — et ni le nom de Ben, ni rien d'autre de la conversation d'origine ;
     4. on décoche l'annonce, on coche Dan : la feuille se ferme, « Transféré », Dan l'a ;
     5. la recherche de la feuille ; ⛔ cinq conversations au plus (la sixième est éteinte, et le dire) ; tout tient à 360 px, chaque ligne fait 44 px ;
     6. au bureau : Échap ferme la feuille et rend le focus ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-transfert.js   (CAPTURES=/dossier pour les images)
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', dan: 'pw-dan-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', dan: 'Dan Banc' };
const TEL = { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };
const TEXTE = 'Le code du portail change lundi : 4521B';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo', 'dan']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    for (const l of ['cleo', 'dan']) { const k = await P.ben.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (X, conv, texte) => X.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const D = {};
    for (const l of ['ben', 'cleo', 'dan']) { D[l] = (await P.ana.post('/api/conversations/directe', { uid: P[l].moi.id })).j.conversation.id; await ecrire(P[l], D[l], 'Salut Ana'); }
    await ecrire(P.ben, D.ben, TEXTE);
    const ANN = (await P.ben.post('/api/conversations/groupe', { nom: 'Annonces chantier', membres: [P.ana.moi.id, P.cleo.moi.id], annonces_seules: true })).j.conversation.id;
    const G1 = (await P.ana.post('/api/conversations/groupe', { nom: 'Foot du jeudi', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
    const G2 = (await P.ana.post('/api/conversations/groupe', { nom: 'Vacances', membres: [P.dan.moi.id] })).j.conversation.id;
    await ecrire(P.ben, ANN, 'Réunion de chantier à 8 h');
    const listeAna = async () => (await P.ana.get('/api/conversations')).j.conversations;
    v('population : six conversations chez Ana (trois directes, l\'annonce de Ben, deux groupes à elle)', (await listeAna()).length, 6);
    const derniers = async (X, conv) => ((await X.get('/api/conversations/' + conv + '/messages')).j.messages || []).filter(m => !m.systeme);

    const ouvrir = async (login, pf, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [] };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    /* ce que la feuille montre : son titre, l'aperçu, les lignes (cochées, éteintes), le compteur, « Envoyer », la phrase d'erreur */
    const feuille = (X) => X.page.evaluate(() => ({
      ouverte: document.documentElement.classList.contains('feuille-ouverte'),
      titre: document.getElementById('feuille-titre').textContent,
      apercu: (document.querySelector('#info-corps .tr-apercu') || {}).textContent || null,
      lignes: Array.from(document.querySelectorAll('#tr-liste [data-tr]')).map(x => x.dataset.tr + (x.getAttribute('aria-checked') === 'true' ? '*' : '') + (x.getAttribute('aria-disabled') === 'true' ? '-' : '')),
      n: (document.getElementById('tr-n') || {}).textContent || null,
      envoyer: { mot: document.getElementById('g-creer').textContent, eteint: document.getElementById('g-creer').getAttribute('aria-disabled') === 'true', vu: getComputedStyle(document.getElementById('g-creer')).visibility },
      erreur: (() => { const e = document.getElementById('info-erreur'); return e && !e.hidden ? e.textContent : ''; })(),
    }));
    const ouvrirMenuSur = async (X, texte) => {
      await X.page.evaluate((t) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.textContent.includes(t)); const p = m && m.querySelector('.msg-plus'); if (p) p.click(); }, texte);
      const ok = await att(X, () => !document.getElementById('menu-fond').hidden && !!document.querySelector('#menu-msg [data-menu]'));
      await X.page.waitForTimeout(400);             // la page avale le clic qui suit l'ouverture de 350 ms (l'appui long) : on attend comme un doigt
      return ok;
    };
    const lu = (X) => X.page.evaluate(() => { const m = document.getElementById('mot'); return m && m.classList.contains('on') ? m.textContent : ''; });

    console.log('\n── 1. Au téléphone (360 px) : le menu propose « Transférer », la feuille s\'ouvre ──');
    const A = await ouvrir('ana', TEL, '#messages/' + D.ben);
    vrai('population : la conversation de Ben est ouverte, son message est là', await att(A, (t) => document.getElementById('conv-messages').textContent.includes(t), TEXTE));
    vrai('le menu du message s\'ouvre', await ouvrirMenuSur(A, TEXTE));
    const menu = await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-menu]')).map(x => x.dataset.menu));
    v('il propose « Transférer », juste après « Répondre »', menu.slice(0, 2), ['repondre', 'transferer']);
    await A.page.locator('#menu-msg [data-menu="transferer"]').tap();
    vrai('la feuille « Transférer » s\'ouvre', await att(A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Transférer' && document.querySelectorAll('#tr-liste [data-tr]').length > 0));
    const f1 = await feuille(A);
    v('elle montre l\'aperçu (« Message de Ben » et son texte), les six conversations, rien de coché (« 0 / 5 ») et « Envoyer » éteint en haut à droite',
      [/Message de Ben/.test(f1.apercu || '') && (f1.apercu || '').includes(TEXTE), f1.lignes.length, f1.lignes.filter(x => x.includes('*')).length, f1.n, f1.envoyer],
      [true, 6, 0, '0 / 5', { mot: 'Envoyer', eteint: true, vu: 'visible' }]);
    const geo = await A.page.evaluate(() => ({ large: document.documentElement.scrollWidth <= innerWidth, lignes: Array.from(document.querySelectorAll('#tr-liste [data-tr]')).every(x => { const r = x.getBoundingClientRect(); return r.height >= 44 && r.right <= innerWidth + 0.5; }), envoyer: (() => { const r = document.getElementById('g-creer').getBoundingClientRect(); return r.right <= innerWidth + 0.5 && r.height >= 32; })() }));
    v('⛔ à 360 px : rien ne défile de côté, chaque ligne fait au moins 44 px de haut et tient dans l\'écran, « Envoyer » aussi', geo, { large: true, lignes: true, envoyer: true });
    await capture(A, 't1-feuille');

    console.log('\n── 2. ⛔ Échec partiel : Cléo reçoit, l\'annonce refuse ──');
    await A.page.locator('#tr-liste [data-tr="' + D.cleo + '"]').tap();
    await A.page.locator('#tr-liste [data-tr="' + ANN + '"]').tap();
    const f2 = await feuille(A);
    v('deux cochées (aria-checked), « 2 / 5 », « Envoyer » s\'allume', [f2.lignes.filter(x => x.includes('*')).sort(), f2.n, f2.envoyer.eteint], [[D.cleo + '*', ANN + '*'].sort(), '2 / 5', false]);
    const avantCleo = (await derniers(P.cleo, D.cleo)).length, avantAnn = (await derniers(P.ben, ANN)).length;
    await A.page.locator('#g-creer').tap();
    vrai('la feuille RESTE ouverte : seule l\'annonce reste cochée, et la raison est dite en la nommant',
      await att(A, (ids) => { const l = Array.from(document.querySelectorAll('#tr-liste [data-tr]')).filter(x => x.getAttribute('aria-checked') === 'true').map(x => x.dataset.tr); const e = document.getElementById('info-erreur');
        return document.documentElement.classList.contains('feuille-ouverte') && l.length === 1 && l[0] === ids[1] && e && !e.hidden && /« Annonces chantier » : Seuls les administrateurs peuvent écrire dans ce groupe\./.test(e.textContent); }, [D.cleo, ANN]),
      JSON.stringify(await feuille(A)));
    v('… et dit ce qui est parti', await lu(A), 'Transféré à 1 conversation');
    await capture(A, 't2-echec-partiel');
    const cl = await derniers(P.cleo, D.cleo);
    v('⛔ le SERVICE : Cléo a UN message de plus, d\'Ana, au texte de Ben — et rien chez l\'annonce', [cl.length - avantCleo, cl[cl.length - 1].auteur === P.ana.moi.id, cl[cl.length - 1].texte, (await derniers(P.ben, ANN)).length - avantAnn], [1, true, TEXTE, 0]);

    console.log('\n── 3. Cléo voit « Transféré » — et pas le nom de Ben ──');
    const C = await ouvrir('cleo', TEL, '#messages/' + D.cleo);
    vrai('population : le message transféré est dans le fil de Cléo', await att(C, (t) => document.getElementById('conv-messages').textContent.includes(t), TEXTE));
    const bulle = await C.page.evaluate((t) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.textContent.includes(t)); const e = m && m.querySelector('.msg-transfere'); return m ? { etiquette: e ? e.textContent.trim() : null, avantBulle: !!(e && e.compareDocumentPosition(m.querySelector('.bulle')) & Node.DOCUMENT_POSITION_FOLLOWING), ben: /Ben/.test(m.textContent), cote: m.classList.contains('de-autre') } : null; }, TEXTE);
    v('« Transféré » au-dessus de la bulle, reçue d\'Ana — et le nom de Ben n\'apparaît nulle part dans ce message', bulle, { etiquette: 'Transféré', avantBulle: true, ben: false, cote: true });
    await capture(C, 't3-transfere-chez-cleo');

    console.log('\n── 4. On décoche l\'annonce, on coche Dan : la feuille se ferme ──');
    await A.page.locator('#tr-liste [data-tr="' + ANN + '"]').tap();
    await A.page.locator('#tr-liste [data-tr="' + D.dan + '"]').tap();
    v('population : Dan seul est coché', (await feuille(A)).lignes.filter(x => x.includes('*')), [D.dan + '*']);
    await A.page.locator('#g-creer').tap();
    vrai('la feuille se ferme et dit « Transféré »', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /^Transféré$/.test((document.getElementById('mot') || {}).textContent || '')), JSON.stringify(await feuille(A)));
    const dn = await derniers(P.dan, D.dan);
    v('… Dan l\'a reçu, d\'Ana', [dn[dn.length - 1].texte, dn[dn.length - 1].auteur === P.ana.moi.id], [TEXTE, true]);

    console.log('\n── 5. La recherche, et cinq au plus ──');
    const avantG2 = (await derniers(P.ana, G2)).length;
    await ouvrirMenuSur(A, TEXTE);
    await A.page.locator('#menu-msg [data-menu="transferer"]').tap();
    await att(A, () => document.querySelectorAll('#tr-liste [data-tr]').length === 6);
    await A.page.locator('#tr-recherche').fill('vac');
    vrai('la recherche « vac » ne garde que « Vacances »', await att(A, (g) => { const l = Array.from(document.querySelectorAll('#tr-liste [data-tr]')).map(x => x.dataset.tr); return l.length === 1 && l[0] === g; }, G2));
    await A.page.locator('#tr-recherche').fill('zzz');
    vrai('une recherche sans résultat le dit', await att(A, () => { const a = document.getElementById('tr-aucun'); return a && !a.hidden && /Aucune conversation ne correspond à « zzz »/.test(a.textContent) && document.getElementById('tr-liste').hidden; }));
    await A.page.locator('#tr-recherche').fill('');
    await att(A, () => document.querySelectorAll('#tr-liste [data-tr]').length === 6);
    for (const id of [D.ben, D.cleo, D.dan, ANN, G1]) await A.page.locator('#tr-liste [data-tr="' + id + '"]').tap();
    const f5 = await feuille(A);
    v('⛔ cinq cochées : « 5 / 5 », et la sixième (« Vacances ») est ÉTEINTE', [f5.n, f5.lignes.filter(x => x.includes('*')).length, f5.lignes.find(x => x.startsWith(G2))], ['5 / 5', 5, G2 + '-']);
    await A.page.locator('#tr-liste [data-tr="' + G2 + '"]').tap({ force: true });          // un doigt touche aussi une ligne éteinte
    const f6 = await feuille(A);
    v('… la toucher ne la coche pas, et la feuille le dit', [f6.lignes.filter(x => x.includes('*')).length, f6.erreur], [5, 'Cinq conversations au plus à la fois.']);
    await capture(A, 't5-cinq-au-plus');
    await A.page.locator('#g-annuler').tap();
    vrai('« Annuler » ferme la feuille sans rien envoyer', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte')));
    v('… rien n\'est parti vers Vacances (population : ' + avantG2 + ' message(s) d\'avant, la création du groupe)', (await derniers(P.ana, G2)).length - avantG2, 0);

    console.log('\n── 6. Au bureau : Échap ferme, le focus revient ──');
    const B = await ouvrir('ana', BUREAU, '#messages/' + D.ben);
    await att(B, (t) => document.getElementById('conv-messages').textContent.includes(t), TEXTE);
    await B.page.locator('#conv-messages .msg[data-mid]', { hasText: TEXTE }).locator('.bulle').click({ button: 'right' });
    await att(B, () => !!document.querySelector('#menu-msg [data-menu="transferer"]'));
    await B.page.waitForTimeout(400);
    await B.page.locator('#menu-msg [data-menu="transferer"]').click();
    vrai('la feuille s\'ouvre au bureau', await att(B, () => document.documentElement.classList.contains('feuille-ouverte') && document.querySelectorAll('#tr-liste [data-tr]').length === 6));
    await capture(B, 't6-bureau');
    await B.page.keyboard.press('Escape');
    vrai('Échap la ferme', await att(B, () => !document.documentElement.classList.contains('feuille-ouverte')));
    v('⛔ le focus ne tombe pas sur la page', await B.page.evaluate(() => document.activeElement && document.activeElement !== document.body), true);

    v('aucune erreur JavaScript dans les trois pages', pages.flatMap(X => X.erreurs), []);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* rien */ } }
    try { await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
