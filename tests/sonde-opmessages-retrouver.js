/* ══ SONDE — « RETROUVER » : RECHERCHER DANS LA CONVERSATION, PHOTOS, FICHIERS ET LIENS, DANS LA VRAIE PAGE SERVIE (9 octobre 2026) ═════════════════════════════════
   L'inventaire d'OP MESSAGES (« pas de recherche dans les messages ») : deux feuilles ouvertes depuis les Infos d'une conversation.
   Contre le VRAI service, trois personnes ; Ana au téléphone (360 px, l'écran le plus étroit), puis au bureau :
     1. les Infos proposent « Rechercher dans la conversation » et « Photos, fichiers et liens » ;
     2. « rochefort » trouve quatre messages (texte, nom d'un fichier, lien), l'occurrence SURLIGNÉE telle qu'elle est écrite ; une recherche vide le dit ;
     3. ⛔ toucher le résultat le PLUS ANCIEN (au-delà des 100 messages chargés) ferme la feuille, remonte l'historique et MONTRE le message (il est à l'écran, marqué) ;
     4. la galerie : deux vignettes chargées (blob:), « Fichiers » (le nom, la taille), « Liens » (deux adresses, en nouvel onglet, sans référent) ; une vignette mène à sa photo ;
     5. à 360 px rien ne défile de côté, chaque ligne fait 44 px ; au bureau le champ prend le focus, Échap ferme ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-retrouver.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc' };
const TEL = { viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };

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
    for (const l of ['ben', 'cleo']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const ecrire = (X, conv, corps) => X.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid() }, typeof corps === 'string' ? { texte: corps } : corps));
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
    const sVieux = (await ecrire(P.ben, G, 'Le chantier de Rochefort démarre lundi')).j.seq;
    /* 129 messages de remplissage, à trois (le plafond de messages est par personne) : le message de Ben sort de la première page (100) que la page charge */
    const qui = [P.ana, P.ben, P.cleo];
    for (let i = 0; i < 129; i++) await ecrire(qui[i % 3], G, 'remplissage numéro ' + i);
    const p1 = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: F.png({ w: 40, h: 30 }) }), p2 = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: F.png({ w: 30, h: 40 }) });
    const sPh = (await ecrire(P.ben, G, { type: 'photo', pieces: [{ id: p1.j.id, w: 40, h: 30 }, { id: p2.j.id, w: 30, h: 40 }], texte: 'Façade côté rue' })).j.seq;
    const pf = await F.deposer(P.cleo, { conv: G, genre: 'fichier', corps: F.pdf(4000), nom: 'Plan ROCHEFORT.pdf' });
    const sF = (await ecrire(P.cleo, G, { type: 'fichier', piece: pf.j.id })).j.seq;
    const sL = (await ecrire(P.ana, G, 'Le plan : https://exemple.fr/plan et www.mairie-rochefort.fr')).j.seq;
    const sA = (await ecrire(P.ana, G, 'rochefort encore')).j.seq;
    v('population : la conversation porte plus de 130 messages, et le message de Ben est le tout premier', [sA - sVieux >= 130, sVieux < sPh, sPh < sF], [true, true, true]);

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
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(300); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const ouvrirInfos = async (X) => { await X.page.locator('#conv-titre').click(); return att(X, () => !!document.querySelector('#info-corps [data-act="chercher"]')); };
    const largeur = (X) => X.page.evaluate(() => ({ large: document.documentElement.scrollWidth <= innerWidth, lignes: Array.from(document.querySelectorAll('#info-corps .rc-res, #info-corps .md-fichier, #info-corps .md-voir, #info-corps [data-act="chercher"], #info-corps [data-act="medias"]')).filter(x => x.offsetParent).every(x => x.getBoundingClientRect().height >= 44 && x.getBoundingClientRect().right <= innerWidth + 0.5) }));

    console.log('\n── 1. Au téléphone : les Infos proposent les deux feuilles ──');
    const A = await ouvrir('ana', TEL, '#messages/' + G);
    vrai('population : la conversation est ouverte', await att(A, () => document.getElementById('conv-messages').textContent.includes('rochefort encore')));
    /* la profondeur de l'entrée d'historique de la conversation : un résultat touché doit y RAMENER (pas en pousser une seconde de la même conversation) */
    const nConv = await A.page.evaluate(() => history.state && history.state.opmsg ? history.state.n : null);
    vrai('les Infos proposent « Rechercher dans la conversation » et « Photos, fichiers et liens »', await ouvrirInfos(A) && await A.page.evaluate(() => /Rechercher dans la conversation/.test(document.querySelector('#info-corps [data-act="chercher"]').textContent) && /Photos, fichiers et liens/.test(document.querySelector('#info-corps [data-act="medias"]').textContent)));
    await A.page.waitForTimeout(400);
    await A.page.locator('#info-corps [data-act="chercher"]').tap();
    vrai('« Rechercher » : la feuille, son titre, son champ', await att(A, () => document.getElementById('feuille-titre').textContent === 'Rechercher' && !!document.getElementById('rc-q')));

    console.log('\n── 2. « rochefort » : quatre messages, l\'occurrence surlignée ──');
    await A.page.locator('#rc-q').fill('rochefort');
    vrai('quatre résultats paraissent, et l\'état le dit', await att(A, () => document.querySelectorAll('#rc-liste [data-rc-seq]').length === 4 && /4 messages/.test(document.getElementById('rc-etat').textContent)));
    const res = await A.page.evaluate(() => Array.from(document.querySelectorAll('#rc-liste [data-rc-seq]')).map(x => ({ seq: +x.dataset.rcSeq, mark: (x.querySelector('mark') || {}).textContent || null, nom: x.querySelector('.rc-nom').textContent })));
    v('du plus récent au plus ancien (mon message, le lien, le fichier, celui de Ben), « Vous » pour les miens', res.map(x => [x.seq, x.nom]), [[sA, 'Vous'], [sL, 'Vous'], [sF, 'Cléo'], [sVieux, 'Ben']]);
    v('⛔ l\'occurrence est SURLIGNÉE telle qu\'elle est écrite (« rochefort », « ROCHEFORT », « Rochefort »)', res.map(x => x.mark), ['rochefort', 'rochefort', 'ROCHEFORT', 'Rochefort']);
    v('⛔ à 360 px : rien ne défile de côté, chaque résultat fait au moins 44 px', await largeur(A), { large: true, lignes: true });
    await capture(A, 'r1-recherche');
    await A.page.locator('#rc-q').fill('zzqx');
    vrai('une recherche sans résultat le dit', await att(A, () => /Aucun message ne contient « zzqx »/.test(document.getElementById('rc-etat').textContent) && document.getElementById('rc-liste').hidden));
    /* le réseau coupé pendant une recherche : l'échec se DIT et « Réessayer » le rejoue */
    await A.page.route('**/messages/chercher**', r => r.abort());
    await A.page.locator('#rc-q').fill('rochefort');
    vrai('⛔ une recherche qui échoue le dit et propose « Réessayer » (la liste ne fait pas semblant d\'être vide)', await att(A, () => !document.getElementById('rc-reessayer-zone').hidden && document.getElementById('rc-liste').hidden && !/Aucun message/.test(document.getElementById('rc-etat').textContent)));
    await capture(A, 'r1b-echec');
    await A.page.unroute('**/messages/chercher**');
    await A.page.locator('[data-rc-reessayer]').tap();
    vrai('« Réessayer » : les quatre résultats, « Réessayer » s\'efface', await att(A, () => document.querySelectorAll('#rc-liste [data-rc-seq]').length === 4 && document.getElementById('rc-reessayer-zone').hidden));

    console.log('\n── 3. ⛔ Le plus ancien : la feuille se ferme, l\'historique remonte, le message se montre ──');
    v('population : le message de Ben n\'est PAS dans ce que la page a chargé', await A.page.evaluate((s) => !Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).some(x => x.textContent.includes('Rochefort démarre')), sVieux), true);
    await A.page.locator('#rc-liste [data-rc-seq="' + sVieux + '"]').tap();
    vrai('la feuille se ferme, le message de Ben est à l\'écran et marqué', await att(A, () => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.textContent.includes('Rochefort démarre')); if (!m || document.documentElement.classList.contains('feuille-ouverte')) return false; const r = m.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && m.classList.contains('msg-cible'); }, null, 20000));
    v('⛔ … sans doubler l\'historique : on est revenu à l\'entrée de la conversation (même profondeur qu\'avant les Infos)', await A.page.evaluate(() => history.state && history.state.opmsg ? history.state.n : null), nConv);
    vrai('⛔ … et le FOCUS est sur le message atteint (plus sur le bouton d\'en-tête qui avait ouvert les Infos)', await att(A, () => { const a = document.activeElement; return !!a && a.matches('#conv-messages .msg[data-mid]') && a.textContent.includes('Rochefort démarre'); }));
    await capture(A, 'r2-au-message');

    console.log('\n── 4. La galerie : photos, fichiers, liens ──');
    await ouvrirInfos(A); await A.page.waitForTimeout(400);
    await A.page.locator('#info-corps [data-act="medias"]').tap();
    vrai('« Photos, fichiers et liens » : deux vignettes, chargées (blob:)', await att(A, () => document.getElementById('feuille-titre').textContent === 'Photos, fichiers et liens' && document.querySelectorAll('#md-corps .md-photo img').length === 2 && Array.from(document.querySelectorAll('#md-corps .md-photo img')).every(i => /^blob:/.test(i.src) && i.complete)));
    v('la grille a trois colonnes, des cases carrées', await A.page.evaluate(() => { const g = document.querySelector('.md-grille'), c = document.querySelector('.md-photo').getBoundingClientRect(); return [getComputedStyle(g).gridTemplateColumns.split(' ').length, Math.abs(c.width - c.height) < 1]; }), [3, true]);
    await capture(A, 'r3-photos');
    await A.page.locator('#md-seg [data-md-genre="fichier"]').tap();
    vrai('« Fichiers » : « Plan ROCHEFORT.pdf », sa taille', await att(A, () => { const x = document.querySelector('#md-corps .md-fichier'); return !!x && /Plan ROCHEFORT\.pdf/.test(x.textContent) && /Ko/.test(x.textContent) && document.querySelector('#md-seg [data-md-genre="fichier"]').getAttribute('aria-pressed') === 'true'; }));
    await A.page.locator('#md-seg [data-md-genre="lien"]').tap();
    vrai('« Liens » : deux adresses', await att(A, () => document.querySelectorAll('#md-corps a.md-lien').length === 2));
    v('⛔ chaque lien s\'ouvre dans un nouvel onglet, sans référent ni accès à la page', await A.page.evaluate(() => Array.from(document.querySelectorAll('#md-corps a.md-lien')).map(a => [a.getAttribute('href'), a.target, a.rel])), [['https://exemple.fr/plan', '_blank', 'noopener noreferrer nofollow'], ['https://www.mairie-rochefort.fr', '_blank', 'noopener noreferrer nofollow']]);
    v('⛔ à 360 px, la galerie non plus ne défile pas de côté', await largeur(A), { large: true, lignes: true });
    await capture(A, 'r4-liens');
    await A.page.locator('#md-seg [data-md-genre="photo"]').tap();
    await att(A, () => document.querySelectorAll('#md-corps .md-photo').length === 2);
    await A.page.locator('#md-corps .md-photo').first().tap();
    vrai('une vignette mène à SA photo dans la conversation', await att(A, (s) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg[data-mid]')).find(x => x.textContent.includes('Façade côté rue')); return !!m && !document.documentElement.classList.contains('feuille-ouverte') && m.classList.contains('msg-cible'); }, sPh, 15000));
    v('⛔ … là encore, à l\'entrée de la conversation (pas une de plus)', await A.page.evaluate(() => history.state && history.state.opmsg ? history.state.n : null), nConv);

    console.log('\n── 5. Au bureau : le champ prend le focus, Échap ferme ──');
    const B = await ouvrir('ana', BUREAU, '#messages/' + G);
    await att(B, () => document.getElementById('conv-messages').textContent.includes('rochefort encore'));
    await ouvrirInfos(B); await B.page.waitForTimeout(400);
    await B.page.locator('#info-corps [data-act="chercher"]').click();
    vrai('au bureau, le champ de recherche prend le focus (une souris, pas de clavier qui surgit)', await att(B, () => document.activeElement && document.activeElement.id === 'rc-q'));
    await B.page.keyboard.type('façade');
    vrai('« façade » trouve la légende de la photo', await att(B, () => document.querySelectorAll('#rc-liste [data-rc-seq]').length === 1));
    await capture(B, 'r5-bureau');
    await B.page.keyboard.press('Escape');
    vrai('Échap ferme la feuille', await att(B, () => !document.documentElement.classList.contains('feuille-ouverte')));

    v('aucune erreur JavaScript dans les deux pages', pages.flatMap(X => X.erreurs), []);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* rien */ } }
    try { await b.close(); } catch (e) { /* rien */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
