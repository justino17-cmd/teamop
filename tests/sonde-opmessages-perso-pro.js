/* ══ SONDE — PERSO / PRO, DANS LA VRAIE PAGE SERVIE (formule de PRODUCTION : seul un compte pro a deux côtés) ═══════════════════════════════════════════════
   7 octobre 2026 : « ça serait bien d'avoir un bouton pour basculer de perso à pro, et que le nom soit OP MESSAGES PRO quand on est en pro ». Contre le VRAI service :
     1. téléphone (390 px) — Ana (un espace : Ben est son collègue ; Cléo, une amie) : le sélecteur « Perso | Pro » sous le titre de Messages, Perso d'abord ; la liste ne
        montre que Cléo et « Mélange » ; pas de tableau de bord ; un message de Ben (Pro) allume une pastille sur « Pro » ;
     2. « Pro » : Ben et le canal ; « OP MESSAGES PRO » (la pastille PRO), le titre de l'onglet, l'onglet « Accueil » ; le service a retenu le côté ;
     3. une recherche cherche des deux côtés ; ouvrir Cléo y BASCULE (Perso) ;
     4. les infos de Cléo : « Ranger dans » — Perso (auto) ; « Pro » s'enregistre ;
     5. le côté suit le compte : la page rechargée revient du côté choisi ;
     6. bureau : le sélecteur en haut de la barre latérale (pas sous le titre), la marque « OP MESSAGES PRO », « Tableau de bord » du côté Pro seulement ;
     7. Cléo (aucun espace, formule Perso) ne voit rien de tout ça, et toute sa liste ;
     8. aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-perso-pro.js   (CAPTURES=/dossier pour les images)
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
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null, S = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    /* l'espace d'Ana, Ben dedans (une vraie invitation rangée dans la base, comme test-961) ; Cléo et Ben, contacts d'Ana */
    S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'ESPACEZXSONDEPRO', proprio: A0.moi.id }).id;
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
    { const c0 = await cotes(); v('population : côté du service — Ben et le canal Pro, Cléo et « Mélange » Perso', [c0[AB], c0[AC], c0[G2], c0[K], Object.keys(c0).length], ['pro', 'perso', 'perso', 'pro', 4]); }

    const ouvrirPage = async (login, bureau) => {
      const ctx = await b.newContext(bureau ? { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1, reducedMotion: 'reduce', locale: 'fr-FR' }
        : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR' });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const P = { ctx, page, erreurs: [], bureau };
      page.on('pageerror', e => P.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0 && document.querySelectorAll('#liste-conv li').length > 0; }, null, { timeout: 15000 });
      return P;
    };
    const att = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (P, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await P.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = (P, sel) => P.bureau ? P.page.locator(sel).first().click() : P.page.locator(sel).first().tap();
    /* ce que la page montre : le sélecteur visible et son côté, la marque, la liste, la navigation */
    const etatPage = P => P.page.evaluate(() => {
      const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      const segs = Array.from(document.querySelectorAll('[data-cote-seg]')).filter(vis);
      const seg = segs[0] || null;
      const presse = seg ? (seg.querySelector('[aria-pressed="true"]') || {}).dataset : null;
      const pastilles = seg ? Array.from(seg.querySelectorAll('[data-cote]')).map(x => { const n = x.querySelector('.cote-n'); return n && !n.hidden ? n.textContent : ''; }) : [];
      const marque = Array.from(document.querySelectorAll('.side-marque b, #marque-tel')).filter(vis).map(x => x.innerText.replace(/\s+/g, ' ').trim());
      const noms = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim());
      const nav = Array.from(document.querySelectorAll('#tabs a.tab, #nav-side a.side-lien')).filter(vis).map(a => a.dataset.vue);
      return { segs: segs.map(s => s.classList.contains('cote-seg-side') ? 'barre' : 'liste'), cote: presse ? presse.cote : null, pastilles, marque, noms, nav, titre: document.title };
    });

    /* ═══ 1-5. TÉLÉPHONE ═══ */
    console.log('\n1. Téléphone : Perso d\'abord');
    const A = await ouvrirPage('ana', false);
    let e = await etatPage(A);
    v('le sélecteur est sous le titre de Messages (un seul visible), côté Perso', [e.segs, e.cote], [['liste'], 'perso']);
    v('la marque en haut dit « OP MESSAGES » (sans PRO)', e.marque, ['OP MESSAGES']);
    v('la liste : Cléo et « Mélange » seulement (population : quatre conversations au service)', e.noms.sort(), ['Cléo Banc', 'Mélange']);
    vrai('pas d\'onglet « Accueil » du côté Perso — ' + e.nav.join(', '), e.nav.length >= 3 && !e.nav.includes('accueil'));
    await capture(A, 'pp-1-perso');
    await dire(B0, AB, 'Tu passes au dépôt ?');
    vrai('un message de Ben (côté Pro) allume la pastille de « Pro » : 1', await att(A, () => { const s = Array.from(document.querySelectorAll('[data-cote-seg]')).find(x => x.getClientRects().length); const n = s && s.querySelector('[data-cote="pro"] .cote-n'); return !!n && !n.hidden && n.textContent === '1'; }));
    v('…et sa ligne ne paraît pas dans la liste Perso', (await etatPage(A)).noms.includes('Ben Banc'), false);

    console.log('\n2. « Pro »');
    await toucher(A, '.cote-seg-liste [data-cote="pro"]');
    vrai('côté Pro : Ben et le canal, plus Cléo ni « Mélange »', await att(A, () => { const n = Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).sort(); return n.join('|') === 'Ben Banc|# général' || n.join('|') === '# général|Ben Banc'; }));
    e = await etatPage(A);
    v('« OP MESSAGES PRO » en haut, le sélecteur sur Pro, plus de pastille sur Pro (on y est)', [e.marque, e.cote, e.pastilles], [['OP MESSAGES PRO'], 'pro', ['', '']]);
    vrai('le titre de l\'onglet dit « OP MESSAGES PRO » ; l\'onglet « Accueil » paraît — ' + e.titre + ' ; ' + e.nav.join(', '), / — OP MESSAGES PRO$/.test(e.titre) && e.nav[0] === 'accueil');
    vrai('le service a retenu le côté (Pro)', await (async () => { for (let i = 0; i < 40; i++) { if ((await A0.get('/api/moi')).j.moi.prefs.mode === 'pro') return true; await new Promise(r => setTimeout(r, 100)); } return false; })());
    await capture(A, 'pp-2-pro');

    console.log('\n3. Chercher des deux côtés ; ouvrir une conversation de l\'autre côté y bascule');
    await A.page.locator('#recherche-conv').fill('Cléo');
    vrai('du côté Pro, chercher « Cléo » la trouve (une recherche cherche partout)', await att(A, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).some(x => x.textContent.trim() === 'Cléo Banc')));
    await A.page.locator('#liste-conv [data-ouvrir]', { hasText: 'Cléo Banc' }).first().tap();
    vrai('la conversation de Cléo s\'ouvre', await att(A, () => document.documentElement.dataset.conv === '1' && /Cléo/.test(document.getElementById('conv-titre').textContent)));
    vrai('⛔ et le côté a basculé : Perso, sans la pastille PRO', await att(A, () => document.documentElement.dataset.cote === 'perso' && Array.from(document.querySelectorAll('.marque-pro')).every(x => x.hidden)));

    console.log('\n4. Ranger Cléo dans Pro (ses infos)');
    await toucher(A, '#conv-titre');
    vrai('les infos : « Ranger dans » — Perso (auto)', await att(A, () => { const r = document.querySelector('#info-corps [data-act="cote"]'); return !!r && r.querySelector('.reglage-valeur').textContent.trim() === 'Perso (auto)'; }));
    await toucher(A, '#info-corps [data-act="cote"]');
    vrai('son menu : Automatique (Perso) coché, Perso, Pro', await att(A, () => document.getElementById('deroule').matches(':popover-open') && Array.from(document.querySelectorAll('#deroule-liste .deroule-choix')).map(x => x.textContent.trim() + (x.getAttribute('aria-checked') === 'true' ? '✓' : '')).join('|') === 'Automatique (Perso)✓|Perso|Pro'));
    await capture(A, 'pp-3-ranger');
    await A.page.locator('#deroule-liste .deroule-choix[data-valeur="pro"]').tap();
    vrai('« Pro » : la ligne dit Pro', await att(A, () => document.querySelector('#info-corps [data-act="cote"] .reglage-valeur').textContent.trim() === 'Pro'));
    v('le service l\'a rangée Pro (pour Ana)', (await cotes())[AC], 'pro');
    v('⛔ chez Cléo, elle reste Perso', (((await C0.get('/api/conversations')).j.conversations || []).find(c => c.id === AC) || {}).cote, 'perso');
    await A.page.keyboard.press('Escape');

    console.log('\n4 bis. « Confirmer l\'envoi » (côté pro)');
    await A.page.evaluate(() => { location.hash = '#reglages'; });
    vrai('Profil : la ligne « Confirmer l\'envoi », « Jamais »', await att(A, () => { const r = document.getElementById('reg-confirmer'); return !!r && r.getClientRects().length > 0 && document.getElementById('reg-v-confirmer').textContent.trim() === 'Jamais'; }));
    await toucher(A, '#reg-confirmer');
    vrai('son menu : Jamais (coché), Groupes et canaux, Partout', await att(A, () => document.getElementById('deroule').matches(':popover-open') && Array.from(document.querySelectorAll('#deroule-liste .deroule-choix')).map(x => x.textContent.trim() + (x.getAttribute('aria-checked') === 'true' ? '✓' : '')).join('|') === 'Jamais✓|Groupes et canaux|Partout'));
    await A.page.locator('#deroule-liste .deroule-choix[data-valeur="groupes"]').tap();
    vrai('« Groupes et canaux » : la ligne le dit, le compte le garde', await att(A, () => document.getElementById('reg-v-confirmer').textContent.trim() === 'Groupes et canaux') && (await A0.get('/api/moi')).j.moi.prefs.confirmer_envoi === 'groupes');
    await capture(A, 'pp-6-confirmer-reglage');
    const nMsg = async (conv) => (((await A0.get('/api/conversations/' + conv + '/messages')).j.messages) || []).length;
    await A.page.evaluate(g => { location.hash = '#messages/' + g; }, G2);
    await att(A, () => document.documentElement.dataset.conv === '1' && /Mélange/.test(document.getElementById('conv-titre').textContent));
    const n0 = await nMsg(G2);
    await A.page.locator('#saisie').fill('Réunion à 9 h demain');
    await A.page.locator('#envoyer').tap();
    vrai('dans un GROUPE, la flèche demande : « Envoyer à « Mélange » — 2 personnes ? », Annuler / Envoyer', await att(A, () => !document.getElementById('compo-confirme').hidden && /^Envoyer à « Mélange » — 2 personnes \?/.test(document.getElementById('compo-confirme-texte').textContent)));
    await A.page.waitForTimeout(500);
    v('⛔ rien n\'est parti, le texte est toujours dans le champ', [await nMsg(G2), await A.page.inputValue('#saisie')], [n0, 'Réunion à 9 h demain']);
    await capture(A, 'pp-7-confirmer-barre');
    const gb = await A.page.evaluate(() => { const r = id => document.getElementById(id).getBoundingClientRect(); const o = r('compo-confirme-oui'), n = r('compo-confirme-non'), b = r('compo-confirme'); return { memeLigne: Math.abs(o.top - n.top) < 2, ordre: n.right <= o.left + 1, dedans: o.right <= b.right && b.right <= innerWidth, h: [Math.round(o.height), Math.round(n.height)] }; });
    v('les deux gestes restent ensemble (Annuler puis Envoyer, sur la même ligne), dans l\'écran, 44 px au doigt', [gb.memeLigne, gb.ordre, gb.dedans, gb.h.every(x => x >= 44)], [true, true, true, true]);
    await A.page.locator('#saisie').fill('Réunion à 10 h demain');
    vrai('retaper le texte annule la demande (on ne confirme pas un texte qu\'on n\'a pas relu)', await att(A, () => document.getElementById('compo-confirme').hidden));
    await A.page.locator('#envoyer').tap();
    await att(A, () => !document.getElementById('compo-confirme').hidden);
    await A.page.locator('#compo-confirme-oui').tap();
    vrai('« Envoyer » : le message part (le service l\'a), la barre s\'en va, le champ est vide', await (async () => { for (let i = 0; i < 40; i++) { if (await nMsg(G2) === n0 + 1) return true; await new Promise(r => setTimeout(r, 100)); } return false; })() && await att(A, () => document.getElementById('compo-confirme').hidden && !document.getElementById('saisie').value));
    await A.page.evaluate(c => { location.hash = '#messages/' + c; }, AB);
    await att(A, () => document.documentElement.dataset.conv === '1' && /Ben/.test(document.getElementById('conv-titre').textContent));
    const n1 = await nMsg(AB);
    await A.page.locator('#saisie').fill('Oui, à 14 h');
    await A.page.locator('#envoyer').tap();
    vrai('dans une conversation à DEUX (« Groupes et canaux »), le message part sans demander', await (async () => { for (let i = 0; i < 40; i++) { if (await nMsg(AB) === n1 + 1) return true; await new Promise(r => setTimeout(r, 100)); } return false; })());
    v('…et aucune barre n\'a paru', await A.page.evaluate(() => document.getElementById('compo-confirme').hidden), true);
    await A0.post('/api/moi/maj', { prefs: { confirmer_envoi: 'jamais' } });
    v('aucune erreur JavaScript (Ana, téléphone)', A.erreurs, []);
    await A.ctx.close();

    console.log('\n5. Le côté suit le compte');
    await A0.post('/api/moi/maj', { prefs: { mode: 'pro' } });
    const A2 = await ouvrirPage('ana', false);
    e = await etatPage(A2);
    v('une page neuve repart du côté du compte (Pro) : Ben, Cléo (rangée Pro) et le canal', [e.cote, e.noms.sort()], ['pro', ['# général', 'Ben Banc', 'Cléo Banc'].sort()]);
    await A2.ctx.close();

    /* ═══ 6. BUREAU ═══ */
    console.log('\n6. Bureau');
    const D = await ouvrirPage('ana', true);
    e = await etatPage(D);
    v('le sélecteur est en haut de la barre latérale (et pas sous le titre), côté Pro ; la marque dit « OP MESSAGES PRO »', [e.segs, e.cote, e.marque], [['barre'], 'pro', ['OP MESSAGES PRO']]);
    vrai('« Tableau de bord » dans la barre latérale du côté Pro — ' + e.nav.join(', '), e.nav[0] === 'accueil');
    const ligneMarque = await D.page.evaluate(() => { const b = document.querySelector('.side-marque b'), p = b.querySelector('.marque-pro'); const rb = b.getBoundingClientRect(), rp = p.getBoundingClientRect(), side = document.querySelector('.side').getBoundingClientRect(); return { h: Math.round(rb.height), memeLigne: Math.abs((rp.top + rp.bottom) / 2 - (rb.top + rb.bottom) / 2) < 6, dedans: rp.right <= side.right - 4 }; });
    v('la marque tient sur UNE ligne : la pastille PRO à côté du nom, dans la barre (mesuré : elle passait dessous)', [ligneMarque.memeLigne, ligneMarque.dedans, ligneMarque.h <= 24], [true, true, true]);
    await D.page.evaluate(() => { location.hash = '#accueil'; });
    vrai('population : le tableau de bord est ouvert', await att(D, () => !document.getElementById('vue-accueil').hidden));
    await capture(D, 'pp-4-bureau-pro');
    await toucher(D, '.cote-seg-side [data-cote="perso"]');
    vrai('« Perso » : le tableau de bord quitte la barre latérale ET l\'écran (retour à Messages), la marque perd PRO', await att(D, () => !Array.from(document.querySelectorAll('#nav-side a')).some(a => a.dataset.vue === 'accueil') && !document.getElementById('vue-messages').hidden && Array.from(document.querySelectorAll('.marque-pro')).every(x => x.hidden)));
    vrai('la liste : « Mélange » seul (Cléo est rangée Pro)', await att(D, () => Array.from(document.querySelectorAll('#liste-conv .conv-nom')).map(x => x.textContent.trim()).join('|') === 'Mélange'));
    await capture(D, 'pp-5-bureau-perso');
    v('aucune erreur JavaScript (Ana, bureau)', D.erreurs, []);
    await D.ctx.close();

    /* ═══ 7. UN COMPTE QUI N'EST PAS PRO ═══ */
    console.log('\n7. Cléo (aucun espace, formule Perso)');
    const C = await ouvrirPage('cleo', false);
    e = await etatPage(C);
    v('ni sélecteur, ni marque, ni « Accueil » ; toute sa liste (Ana et « Mélange »)', [e.segs, e.marque, e.nav.includes('accueil'), e.noms.sort()], [[], [], false, ['Ana Banc', 'Mélange']]);
    await C.page.evaluate(() => { location.hash = '#reglages'; });
    await att(C, () => !!document.getElementById('reg-sortir'));
    v('…ni « Confirmer l\'envoi » dans son Profil (population : le Profil est ouvert)', [!!(await C.page.$('#reg-sortir')), !!(await C.page.$('#reg-confirmer'))], [true, false]);
    v('aucune erreur JavaScript (Cléo)', C.erreurs, []);
  } catch (x) {
    vrai('la sonde est morte : ' + (x && x.stack || x), false);
  } finally {
    try { await b.close(); } catch (x) {}
    try { if (S) S.fermer(); } catch (x) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
