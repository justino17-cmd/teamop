/* ══ SONDE — L'ONGLET « RÉUNIONS » ET LE LIEN INVITÉ TROUVABLE, DANS LA VRAIE PAGE SERVIE (26 octobre 2026) ═══════════════════════════════════════════════════════
   « Pourquoi dans OP MESSAGES j'ai pas Réunions ? » puis « je veux un onglet Réunion et je trouve pas le lien inviter ». Contre le VRAI service (formule de PRODUCTION : seul un espace abonné donne le Pro),
   au bureau (1280 px) puis au téléphone (390 px, AU DOIGT) :
     1. l'onglet « Réunions » est dans la barre latérale ET dans la barre d'onglets, juste AVANT « Agenda » ; au téléphone, aucun libellé n'est coupé ;
     2. Perso (Ben, aucun espace ; Ana quand elle repasse côté Perso) : pas d'onglet — l'Agenda, lui, reste ;
     3. l'onglet : « Nouvelle réunion » bien visible (44 px, dans l'écran) ; les réunions À VENIR dans l'ordre, un intertitre par jour ; « Rejoindre » quand la salle est ouverte ; « Lien invité » sur CHAQUE
        réunion de l'organisateur qui vit — ⛔ pas sur celle d'un autre, pas sur une annulée, pas sur une passée ; les PASSÉES repliées, puis dépliées ;
     4. « Lien invité » copie bien …/invite.html#i=<jeton de 32 signes>, celui que le service tient pour cette réunion ;
     5. la fiche s'ouvre depuis la ligne ; « Invité (sans compte) » y est en HAUT (après « Rejoindre », avant l'ordre du jour, les participants et « Salle ») ; le retour système ramène à la liste ;
     6. « Nouvelle réunion » ouvre le formulaire ; une réunion programmée paraît dans la liste, et sa fiche s'ouvre sur « Copier le lien invité » (qui copie le lien) ;
     7. un compte Pro sans réunion lit « Aucune réunion prévue. » et « Nouvelle réunion » ; l'adresse « #reunions-liste » rouvre l'onglet ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE (waitForFunction) ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   NODE_PATH=/opt/node22/lib/node_modules node tests/sonde-opmessages-onglet-reunions.js   (CAPTURES=/dossier pour les images)
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', dan: 'pw-dan-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', dan: 'Dan Banc' };
const PARIS = 'Europe/Paris', H = 3600000, JOUR = 86400000;
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}
if (DOSSIER) fs.mkdirSync(DOSSIER, { recursive: true });
setTimeout(() => { console.log('  ✗ délai global de la sonde dépassé (8 min)'); process.exit(1); }, 480000).unref();

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const P = {}; for (const l of Object.keys(MOTS)) P[l] = await T.connecter(svc, og, l, MOTS[l]);
    for (const l of ['ben', 'cleo', 'dan']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    /* l'espace d'Ana, abonné (Messages Pro), avec Cléo et Dan : on le pose en base, comme les autres sondes — créer un espace est une fonction Pro */
    const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'Atelier Nord', proprio: P.ana.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_sonde', abonnement: 'sub_sonde', statut: 'active', places: 5 });
    for (const l of ['cleo', 'dan']) {
      const code = crypto.randomBytes(16).toString('base64url'), h = crypto.createHash('sha256').update(code).digest('hex');
      S.lienCreer({ h, genre: 'espace', cible: E, par: P.ana.moi.id, ttlMs: JOUR, max: 5 });
      S.invitationAccepter({ h, uid: P[l].moi.id, max: Infinity });
    }
    v('population : Ana, Cléo et Dan sont Pro (espace abonné), Ben est Perso', [(await P.ana.get('/api/espaces')).j.formule, (await P.cleo.get('/api/espaces')).j.formule, (await P.dan.get('/api/espaces')).j.formule, (await P.ben.get('/api/espaces')).j.formule], ['pro', 'pro', 'pro', 'perso']);

    /* ── les réunions d'Ana ── */
    const heureNette = (d) => { while (localDans(d + H, PARIS) <= localDans(d, PARIS)) d += H; return d; };
    const prog = async (X, titre, debut, extra) => { const r = await X.post('/api/reunions', Object.assign({ titre, debut: localDans(debut, PARIS), fin: localDans(debut + H, PARIS), tz: PARIS, invites: [P.ben.moi.id], notifier: false, cote: 'pro' }, extra || {})); return r.code === 201 ? r.j.reunion.id : 'ECHEC ' + r.code; };
    const tVive = Date.now() + 2 * 60000;                                             // commence dans deux minutes : la salle est ouverte à l'entrée
    const rVive = await prog(P.ana, 'Point client LRQX', tVive);
    const rDemain = await prog(P.ana, 'Revue devis LRQX', heureNette(Date.now() + JOUR + 3 * H));
    const rLointain = await prog(P.ana, 'Bilan mensuel LRQX', heureNette(Date.now() + 12 * JOUR + 3 * H));
    const rAnnulee = await prog(P.ana, 'Annulée LRQX', heureNette(Date.now() + 2 * JOUR + 3 * H));
    const rAutre = await prog(P.cleo, 'Réunion de Cléo LRQX', heureNette(Date.now() + JOUR + 5 * H), { invites: [P.ana.moi.id] });
    const rPassee = await prog(P.ana, 'Point fini LRQX', Date.now() + 2 * 60000);
    v('population : six réunions programmées (cinq d\'Ana, une de Cléo)', [rVive, rDemain, rLointain, rAnnulee, rAutre, rPassee].map(x => /^r_[0-9a-f]{32}$/.test(x)), Array(6).fill(true));
    v('population : Ana annule « Annulée »', (await P.ana.post('/api/reunions/' + rAnnulee + '/annuler', {})).code, 200);
    { const s = await P.ana.post('/api/reunions/' + rPassee + '/rejoindre', {}); const t = s.j && s.j.appel ? await P.ana.post('/api/salles/' + s.j.appel.id + '/terminer', {}) : { code: 0 };
      v('population : Ana ouvre « Point fini » puis la TERMINE pour tous (elle devient passée)', [s.code, t.code], [200, 200]); }
    v('population : Ana est côté Pro (le compte le retient)', (await P.ana.post('/api/moi/maj', { prefs: { mode: 'pro' } })).code, 200);

    const ouvrir = async (login, pf, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS, permissions: ['clipboard-read', 'clipboard-write'] }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [], tel: !!pf.isMobile };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      /* ⛔ la page montre l'application avant d'avoir fini de démarrer : on attend que la navigation soit CONSTRUITE (la sonde mesurait zéro onglet une fois sur cinq) */
      await page.waitForFunction(() => document.querySelectorAll('#tabs a.tab').length > 0 && document.querySelectorAll('#nav-side a.side-lien').length > 0, null, { timeout: 15000 });
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (X, nom, plein) => { if (!DOSSIER) return; await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png'), fullPage: !!plein }); };
    const toucher = (X, loc) => X.tel ? loc.tap() : loc.click();
    const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };
    const BUREAU = { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 };
    const navVis = (X) => X.page.evaluate(() => {
      const vis = e => !!e && e.getClientRects().length > 0 && getComputedStyle(e).visibility !== 'hidden';
      return Array.from(document.querySelectorAll('#tabs a.tab, #nav-side a.side-lien')).filter(vis).map(a => a.dataset.vue + ':' + a.querySelector('span').textContent.trim());
    });
    const lignes = (X, ul) => X.page.evaluate((sel) => Array.from(document.querySelectorAll(sel + ' > li')).map(li => {
      const t = li.querySelector('.reunion-titre');
      return { jour: li.classList.contains('bord-jour') ? li.textContent.trim() : null, titre: t ? t.textContent.trim() : null, rejoindre: !!li.querySelector('[data-rejoindre]'), lien: !!li.querySelector('[data-lien-invite]'), annulee: !!li.querySelector('.annulee'),
        ouvre: !!li.querySelector('[data-reunion]'), etat: (li.querySelector('.reunion-etat') || {}).textContent || '' };
    }), ul);
    const idNum = (X) => X.page.evaluate(() => document.documentElement.dataset.vue + '|' + location.hash);

    /* ═══ 1. LE BUREAU ═══ */
    console.log('1. bureau (1280 px) — Ana, côté Pro');
    const D = await ouvrir('ana', BUREAU);
    const navD = await navVis(D);
    vrai('population : la barre latérale compte ses rubriques (' + navD.join(', ') + ')', navD.length >= 5);
    vrai('⛔ « Réunions » est dans la barre latérale, JUSTE AVANT « Agenda »', navD.indexOf('reunions-liste:Réunions') >= 0 && navD.indexOf('reunions-liste:Réunions') + 1 === navD.indexOf('reunions:Agenda'));
    await toucher(D, D.page.locator('#nav-side a[data-vue="reunions-liste"]'));
    vrai('l\'onglet s\'ouvre : adresse #reunions-liste, titre « Réunions »', await att(D, () => document.documentElement.dataset.vue === 'reunions-liste' && location.hash === '#reunions-liste' && document.getElementById('titre-reunions-liste').textContent === 'Réunions' && document.querySelectorAll('#lr-avenir > li').length >= 4));
    v('le titre de l\'onglet du navigateur', await D.page.title(), 'Réunions — OP MESSAGES PRO');
    await capture(D, 'bureau-onglet-reunions');
    const nv = await lignes(D, '#lr-avenir');
    const titres = nv.filter(x => x.titre).map(x => x.titre);
    v('⛔ les réunions à venir, la plus proche en tête (la passée et le reste n\'y sont pas)', titres, ['Point client LRQX', 'Revue devis LRQX', 'Réunion de Cléo LRQX', 'Annulée LRQX', 'Bilan mensuel LRQX']);
    v('un intertitre par jour (population : au moins trois jours différents)', [nv.filter(x => x.jour).length >= 3, nv.filter(x => x.jour)[0].jour], [true, 'Aujourd\'hui']);
    const L = Object.fromEntries(nv.filter(x => x.titre).map(x => [x.titre, x]));
    v('⛔ « Rejoindre » sur la réunion dont la salle est ouverte, pas sur les autres', Object.keys(L).filter(t => L[t].rejoindre), ['Point client LRQX']);
    v('⛔ « Lien invité » sur CHAQUE réunion d\'Ana qui vit — pas celle de Cléo (population : elle est dans la liste), pas l\'annulée', Object.keys(L).filter(t => L[t].lien).sort(), ['Bilan mensuel LRQX', 'Point client LRQX', 'Revue devis LRQX']);
    vrai('population : la réunion de Cléo et l\'annulée sont bien dans la liste (annulée dite « Annulée »)', !!L['Réunion de Cléo LRQX'] && L['Annulée LRQX'].etat === 'Annulée' && L['Annulée LRQX'].annulee);
    const nouv = await D.page.locator('#lr-nouvelle').boundingBox();
    vrai('« Nouvelle réunion » est visible en haut de l\'onglet (' + Math.round(nouv.width) + '×' + Math.round(nouv.height) + ' px)', nouv.height >= 44 && nouv.y < 300);
    vrai('« Réunions passées » : repliées, avec leur nombre', await D.page.evaluate(() => { const c = document.getElementById('lr-passees-carte'); return !c.hidden && document.getElementById('lr-passees-bouton').getAttribute('aria-expanded') === 'false' && document.getElementById('lr-passees').hidden && document.getElementById('lr-passees-n').textContent === '1'; }));
    await toucher(D, D.page.locator('#lr-passees-bouton'));
    vrai('… dépliées : « Point fini » y est, sans « Rejoindre » ni « Lien invité »', await att(D, () => !document.getElementById('lr-passees').hidden && document.querySelectorAll('#lr-passees .reunion-titre').length === 1) && await (async () => { const p = await lignes(D, '#lr-passees'); const t = p.find(x => x.titre); return t.titre === 'Point fini LRQX' && !t.rejoindre && !t.lien; })());
    await capture(D, 'bureau-onglet-passees');

    console.log('4. « Lien invité » sur une ligne copie le lien');
    await D.page.evaluate(() => navigator.clipboard.writeText(''));
    await toucher(D, D.page.locator('#lr-avenir li', { hasText: 'Revue devis LRQX' }).locator('[data-lien-invite]'));
    vrai('la page dit « Lien invité copié »', await att(D, () => /Lien invité copié/.test(document.getElementById('mot').textContent)));
    const lien = await D.page.evaluate(() => navigator.clipboard.readText());
    vrai('⛔ le presse-papiers porte …/invite.html#i=<jeton de 32 signes>', new RegExp('^' + svc.base.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/invite\\.html#i=[A-Za-z0-9_-]{32}$').test(lien));
    { const ap = await T.client(svc.base).post('/api/invite/apercu', { jeton: lien.split('#i=')[1] }); v('… c\'est le jeton que le service tient pour « Revue devis » (l\'aperçu public le dit)', [ap.code, ap.j && ap.j.reunion && ap.j.reunion.titre], [200, 'Revue devis LRQX']); }

    console.log('5. la fiche s\'ouvre depuis la ligne ; « Invité (sans compte) » y est en haut');
    await toucher(D, D.page.locator('#lr-avenir li', { hasText: 'Point client LRQX' }).locator('[data-reunion]'));
    vrai('la fiche de « Point client » s\'ouvre', await att(D, () => document.documentElement.classList.contains('feuille-ouverte') && !!document.querySelector('#info-corps [data-reu="inv-copier"]') && !!document.querySelector('#info-corps [data-reu="attente"]')));
    const ordre = await D.page.evaluate(() => {
      const c = document.getElementById('info-corps'), tous = Array.from(c.querySelectorAll('.rubrique > span:first-child, [data-reu="rejoindre"], [data-reu="attente"], [data-reu="inv-copier"]'));
      return tous.map(e => e.dataset && e.dataset.reu ? e.dataset.reu : e.textContent.trim());
    });
    const iR = ordre.indexOf('rejoindre'), iI = ordre.indexOf('Invité (sans compte)'), iOdj = ordre.indexOf('Ordre du jour'), iP = ordre.indexOf('Participants'), iS = ordre.indexOf('Salle');
    vrai('population : la fiche compte « Rejoindre », « Participants » et « Salle » (' + ordre.join(' › ') + ')', iR >= 0 && iP >= 0 && iS >= 0);
    vrai('⛔ « Invité (sans compte) » vient APRÈS « Rejoindre » et AVANT « Participants », « Organisateur » et « Salle »', iR < iI && iI < iP && iI < iS && iI < ordre.indexOf('Organisateur'));
    vrai('… et il n\'est plus répété sous « Salle » (une seule carte « Invité », une seule fois « Copier le lien invité » dans les gestes)', ordre.filter(x => x === 'Invité (sans compte)').length === 1 && ordre.filter(x => x === 'inv-copier').length === 1);
    vrai('… la proposition de la création n\'y est PAS (cette réunion n\'a pas été créée à l\'instant)', await D.page.evaluate(() => !document.querySelector('#info-corps [data-reu="inv-neuf"]')));
    await capture(D, 'bureau-fiche-invite-en-haut');
    await D.page.goBack();
    vrai('le retour système ferme la fiche et RESTE sur l\'onglet Réunions', await att(D, () => !document.documentElement.classList.contains('feuille-ouverte') && document.documentElement.dataset.vue === 'reunions-liste' && location.hash === '#reunions-liste'));

    console.log('6. « Nouvelle réunion » ouvre le formulaire ; la réunion programmée paraît, et propose son lien');
    await toucher(D, D.page.locator('#lr-nouvelle'));
    vrai('le formulaire « Nouvelle réunion » s\'ouvre', await att(D, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion' && !!document.getElementById('rf-titre')));
    await D.page.locator('#rf-titre').fill('Création LRQX');
    await toucher(D, D.page.locator('[data-reu="form-enregistrer"]'));
    vrai('la fiche de la réunion créée s\'ouvre', await att(D, () => document.getElementById('feuille-titre').textContent === 'Réunion' && /Création LRQX/.test(document.getElementById('info-corps').textContent)));
    vrai('⛔ …sur la proposition « Copier le lien invité » (avant la date, au-dessus de la carte « Invité (sans compte) »)', await att(D, () => { const n = document.querySelector('#info-corps [data-reu="inv-neuf"]'), r = Array.from(document.querySelectorAll('#info-corps .rubrique > span:first-child')).find(x => x.textContent === 'Invité (sans compte)'); return !!n && !!r && (n.compareDocumentPosition(r) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0; }));
    await capture(D, 'bureau-fiche-apres-creation');
    await D.page.evaluate(() => navigator.clipboard.writeText(''));
    await toucher(D, D.page.locator('[data-reu="inv-neuf"]'));
    vrai('la proposition copie un lien invité', await att(D, () => /Lien invité copié/.test(document.getElementById('mot').textContent)) && /\/invite\.html#i=[A-Za-z0-9_-]{32}$/.test(await D.page.evaluate(() => navigator.clipboard.readText())));
    await D.page.goBack();
    vrai('la fiche fermée, l\'onglet montre la réunion qu\'on vient de programmer, avec son « Lien invité »', await att(D, () => document.documentElement.dataset.vue === 'reunions-liste' && Array.from(document.querySelectorAll('#lr-avenir li')).some(li => /Création LRQX/.test(li.textContent) && li.querySelector('[data-lien-invite]'))));
    vrai('… et la fiche rouverte ne propose PLUS la création (une seule fois)', await (async () => { await toucher(D, D.page.locator('#lr-avenir li', { hasText: 'Création LRQX' }).locator('[data-reunion]')); await att(D, () => !!document.querySelector('#info-corps [data-reu="inv-copier"]')); return D.page.evaluate(() => !document.querySelector('#info-corps [data-reu="inv-neuf"]')); })());
    await D.page.goBack();

    console.log('2. Perso : plus d\'onglet Réunions (l\'Agenda reste)');
    await toucher(D, D.page.locator('.cote-seg-side [data-cote="perso"]'));
    vrai('Ana repasse côté Perso depuis l\'onglet : elle quitte l\'onglet (Messages)', await att(D, () => document.documentElement.dataset.cote === 'perso' && document.documentElement.dataset.vue === 'messages'));
    { const n = await navVis(D); vrai('population : la barre compte « Agenda » (' + n.join(', ') + ')', n.includes('reunions:Agenda')); vrai('⛔ … et AUCUN « Réunions »', !n.some(x => x.startsWith('reunions-liste:'))); }
    await D.page.goto(svc.base + '/#reunions-liste');
    vrai('l\'adresse #reunions-liste rouvre l\'onglet (le côté Pro suit)', await att(D, () => document.documentElement.dataset.vue === 'reunions-liste' && document.documentElement.dataset.cote === 'pro' && document.querySelectorAll('#lr-avenir .reunion-titre').length >= 4));
    v('bureau : aucune erreur JavaScript', D.erreurs, []);
    await D.ctx.close();

    /* ═══ 3. LE TÉLÉPHONE ═══ */
    console.log('3. téléphone (390 px) — au doigt');
    const A = await ouvrir('ana', TEL);
    const navT = await navVis(A);
    vrai('⛔ « Réunions » est dans la barre d\'onglets, juste avant « Agenda » (' + navT.join(', ') + ')', navT.indexOf('reunions-liste:Réunions') >= 0 && navT.indexOf('reunions-liste:Réunions') + 1 === navT.indexOf('reunions:Agenda'));
    const barre = await A.page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('#tabs a.tab')).filter(a => a.getClientRects().length), bar = document.getElementById('tabs').getBoundingClientRect();
      const actif = tabs.find(a => a.getAttribute('aria-current') === 'page'), autres = tabs.filter(a => a !== actif);
      const montre = a => { const r = a.querySelector('span').getBoundingClientRect(); return r.width > 4 && r.height > 4; };
      const icones = tabs.every(a => { const r = a.querySelector('svg').getBoundingClientRect(); return r.width >= 20 && r.height >= 20; });
      return { n: tabs.length, largeur: Math.round(bar.width), dense: document.getElementById('tabs').classList.contains('dense'), mini: Math.round(Math.min(...tabs.map(a => a.getBoundingClientRect().width))), hauteurMin: Math.round(Math.min(...tabs.map(a => a.getBoundingClientRect().height))), dedans: bar.left >= 0 && bar.right <= innerWidth, icones,
        actifMontre: !!actif && montre(actif), actifDedans: !!actif && (r => r.left >= bar.left && r.right <= bar.right)(actif.querySelector('span').getBoundingClientRect()), actifCoupe: !!actif && actif.querySelector('span').scrollWidth > actif.querySelector('span').clientWidth + 0.5,
        autresMontrent: autres.filter(montre).length, autresNoms: autres.map(a => a.querySelector('span').textContent.trim()), police: Math.min(...tabs.map(a => parseFloat(getComputedStyle(a).fontSize))) };
    });
    vrai('population : ' + barre.n + ' onglets mesurés dans une barre de ' + barre.largeur + ' px (resserrée : ' + barre.dense + ')', barre.n >= 7 && barre.dense);
    vrai('⛔ sept onglets : l\'onglet ACTIF dit son nom, entier et dans la barre (« Messages » à l\'ouverture : le plus long des sept) ; les six autres ne montrent que leur icône (' + barre.icones + ')', barre.actifMontre && barre.actifDedans && !barre.actifCoupe && barre.autresMontrent === 0 && barre.icones);
    v('… et leurs noms restent LUS (dans la page, hors de l\'écran) : de quoi nommer chaque onglet au lecteur d\'écran', barre.autresNoms, ['Accueil', 'Contacts', 'Appels', 'Réunions', 'Agenda', 'Courrier']);
    vrai('l\'écriture ne descend pas sous 11 px (' + barre.police + ' px), chaque onglet fait 44 px de haut au moins (' + barre.hauteurMin + ') et la barre tient dans l\'écran (colonne la plus étroite : ' + barre.mini + ' px)', barre.police >= 11 && barre.hauteurMin >= 44 && barre.dedans);
    await capture(A, 'telephone-barre-onglets');
    await toucher(A, A.page.locator('#tabs a[data-vue="reunions-liste"]'));
    vrai('l\'onglet s\'ouvre au doigt', await att(A, () => document.documentElement.dataset.vue === 'reunions-liste' && document.querySelectorAll('#lr-avenir .reunion-titre').length >= 4));
    await capture(A, 'telephone-onglet-reunions');
    vrai('⛔ la bulle de la barre se pose sur l\'onglet actif (colonnes égales, même à sept onglets : elle et lui ont la même place, à un pixel près)', await att(A, () => {
      const bu = document.querySelector('.tabs-bulle').getBoundingClientRect(), t = document.querySelector('#tabs a.tab[aria-current="page"]').getBoundingClientRect();
      return Math.abs(bu.left - t.left) <= 1.5 && Math.abs(bu.width - t.width) <= 1.5;
    }));
    await capture(A, 'telephone-onglet-reunions-pleine-page', true);
    const m = await A.page.evaluate(() => {
      const r = document.getElementById('lr-nouvelle').getBoundingClientRect(), gestes = Array.from(document.querySelectorAll('#lr-avenir .reunion-gestes > button')).map(e => { const q = e.getBoundingClientRect(); return Math.round(q.height); });
      const textes = Array.from(document.querySelectorAll('#lr-avenir .reunion-corps')).map(e => Math.round(e.getBoundingClientRect().width));
      return { nouv: [Math.round(r.width), Math.round(r.height), Math.round(r.top)], gestes, texteMin: Math.min(...textes), nTextes: textes.length, deborde: document.documentElement.scrollWidth - 390 };
    });
    vrai('« Nouvelle réunion » : ' + m.nouv[0] + '×' + m.nouv[1] + ' px, à ' + m.nouv[2] + ' px du haut — dans l\'écran', m.nouv[1] >= 44 && m.nouv[2] > 0 && m.nouv[2] < 500);
    vrai('population : ' + m.gestes.length + ' gestes (« Rejoindre », « Lien invité ») mesurés — chacun fait 44 px au moins', m.gestes.length >= 4 && m.gestes.every(h => h >= 44));
    vrai('⛔ le texte de chaque ligne garde de la place (' + m.nTextes + ' lignes ; la plus étroite : ' + m.texteMin + ' px) et rien ne déborde (' + m.deborde + ' px)', m.nTextes >= 5 && m.texteMin >= 150 && m.deborde <= 0);
    await A.page.evaluate(() => navigator.clipboard.writeText(''));
    await toucher(A, A.page.locator('#lr-avenir li', { hasText: 'Point client LRQX' }).locator('[data-lien-invite]'));
    vrai('« Lien invité » au doigt : le lien est copié', await att(A, () => /Lien invité copié/.test(document.getElementById('mot').textContent)) && /\/invite\.html#i=[A-Za-z0-9_-]{32}$/.test(await A.page.evaluate(() => navigator.clipboard.readText())));
    await toucher(A, A.page.locator('#lr-avenir li', { hasText: 'Revue devis LRQX' }).locator('[data-reunion]'));
    vrai('la fiche s\'ouvre au doigt ; « Invité (sans compte) » y est avant « Participants »', await att(A, () => { const r = Array.from(document.querySelectorAll('#info-corps .rubrique > span:first-child')).map(x => x.textContent); return r.indexOf('Invité (sans compte)') >= 0 && r.indexOf('Invité (sans compte)') < r.indexOf('Participants'); }));
    await capture(A, 'telephone-fiche-invite-en-haut');
    await A.page.goBack();
    vrai('le retour système ferme la fiche, l\'onglet reste', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && document.documentElement.dataset.vue === 'reunions-liste'));
    await toucher(A, A.page.locator('#tabs a[data-vue="reunions"]'));
    vrai('l\'Agenda reste l\'Agenda (semaine, mois) à côté', await att(A, () => document.documentElement.dataset.vue === 'reunions' && document.getElementById('titre-reunions').textContent === 'Agenda' && !!document.getElementById('reu-vue-seg')));
    await A.page.goBack();
    vrai('le retour système ramène à l\'onglet Réunions', await att(A, () => document.documentElement.dataset.vue === 'reunions-liste'));
    v('téléphone : aucune erreur JavaScript', A.erreurs, []);
    await A.ctx.close();

    /* ═══ 7. LES AUTRES COMPTES ═══ */
    console.log('7. les autres comptes');
    const Be = await ouvrir('ben', TEL);
    { const n = await navVis(Be); vrai('population : Ben (Perso, aucun espace) a l\'Agenda (' + n.join(', ') + ')', n.includes('reunions:Agenda')); vrai('⛔ … et pas d\'onglet « Réunions »', !n.some(x => x.startsWith('reunions-liste:'))); }
    await Be.ctx.close();
    v('population : Dan est côté Pro (le compte le retient) — sans quoi l\'onglet n\'est pas dans sa barre', (await P.dan.post('/api/moi/maj', { prefs: { mode: 'pro' } })).code, 200);
    const Da = await ouvrir('dan', TEL);
    vrai('population : l\'onglet est dans la barre de Dan (la page a fini de démarrer)', await att(Da, () => !!document.querySelector('#tabs a[data-vue="reunions-liste"]')));
    await toucher(Da, Da.page.locator('#tabs a[data-vue="reunions-liste"]'));
    vrai('Dan (Pro, aucune réunion) : l\'état vide dit quoi faire', await att(Da, () => document.documentElement.dataset.vue === 'reunions-liste' && /Aucune réunion prévue\./.test((document.querySelector('#lr-avenir .lr-vide') || {}).textContent || '') && !!document.querySelector('#lr-avenir [data-lr="nouvelle"]')));
    vrai('… sans « Réunions passées » (rien à replier)', await Da.page.evaluate(() => document.getElementById('lr-passees-carte').hidden));
    await capture(Da, 'telephone-etat-vide');
    await toucher(Da, Da.page.locator('#lr-avenir [data-lr="nouvelle"]'));
    vrai('« Nouvelle réunion » de l\'état vide ouvre le formulaire', await att(Da, () => document.getElementById('feuille-titre').textContent === 'Nouvelle réunion'));
    v('Dan : aucune erreur JavaScript', Da.erreurs, []);
    await Da.ctx.close();
  } catch (e) {
    vrai('la sonde a tourné sans exception', false);
    console.log(e && e.stack || e);
    process.exitCode = 1;
  } finally {
    try { await b.close(); } catch (e) { /* fermé */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
