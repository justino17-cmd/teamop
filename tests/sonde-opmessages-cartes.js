/* ══ SONDE — LES CARTES D'UNE CONVERSATION : POSITION, FICHE D'UN CONTACT, SONDAGE (la vraie page servie, deux navigateurs, au téléphone) ═══════════════════════════════════════
   7 octobre 2026 : « la localisation s'il l'active dans les paramètres — c'est une sécurité pour eux ; partager des contacts ; des sondages personnalisables, avec leurs règles ».
   Contre le VRAI service, Ana et Ben dans le groupe « Chantier Nord », à 390 px, au doigt :
     1. « + » : la grille Photos, Caméra (au doigt), Position, Contact, Document, Sondage ;
     2. ⛔ la position COUPÉE : la feuille l'explique et mène à Profil › Confidentialité — RIEN ne part (aucun envoi au service) ; allumée là, la position de l'appareil se montre et part
        sur « Envoyer » ; Ben reçoit la carte « Position partagée » et « Ouvrir dans Plans » ;
     3. la fiche de Dan (contact d'Ana) : Ben la reçoit avec « Ajouter », la touche → « Demande envoyée » ; Ana, déjà en contact, voit « Écrire » ;
     4. le sondage : la feuille refuse un seul choix, deux choix égaux ; envoyé avec ses règles (une réponse, résultats après le vote, choix ouverts) ; chez Ben, rien avant le vote, les
        décomptes après ; Ana le voit SANS recharger (le flux) avec le nom de Ben ; Ben ajoute un choix ; Ana clôt en deux touches ; les choix ne se touchent plus ;
     4 bis. (7 octobre 2026 : « voir les bulles des personnes qui votent, et pouvoir voir tous ceux qui votent ») la BULLE de chaque votant sur son choix, « Voir les votes » :
        chaque choix, son décompte, ses votants (moi d'abord) — et un sondage ANONYME ne montre ni bulle ni nom, nulle part ;
     5. le menu d'une carte ne propose ni « Modifier » ni « Copier le texte » ; aucune carte ne déborde à 390 px ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-cartes.js   (CAPTURES=/dossier pour les images)
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', dan: 'pw-dan-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', dan: 'Dan Banc' };

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), D0 = await T.connecter(svc, og, 'dan', MOTS.dan);
    for (const [x, y] of [[A0, B0], [A0, D0]]) { const l = await x.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await A0.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [B0.moi.id] })).j.conversation.id;
    const ouvrir = async (login) => {
      const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, reducedMotion: 'reduce', locale: 'fr-FR',
        permissions: ['geolocation'], geolocation: { latitude: 48.8566, longitude: 2.3522, accuracy: 25 } });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const S = { ctx, page, erreurs: [], envois: 0 };
      page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
      page.on('request', r => { if (r.method() === 'POST' && /\/api\/conversations\/[^/]+\/messages$/.test(new URL(r.url()).pathname)) S.envois++; });
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return S;
    };
    const att = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (S, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const versConv = async (S) => { await S.page.evaluate(g => { location.hash = '#messages/' + g; }, G); return att(S, () => document.documentElement.dataset.conv === '1'); };
    /* la feuille avale le premier clic des 350 ms qui suivent son ouverture (le relâcher du geste qui l'a ouverte) : un doigt ne retouche pas plus vite */
    const plus = async (S, x) => { await S.page.locator('#compo-plus').click(); await att(S, () => !!document.querySelector('#menu-msg.pj [data-plus]')); await S.page.waitForTimeout(400); if (x) await S.page.locator('[data-plus="' + x + '"]').click(); };
    const feuille = (S, titre) => att(S, t => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === t, titre);
    const A = await ouvrir('ana'), B = await ouvrir('ben');
    vrai('population : Ana et Ben ouvrent « Chantier Nord »', (await versConv(A)) && (await versConv(B)));

    console.log('\n1. La grille du « + »');
    await plus(A);
    v('« + » ouvre la grille : Photos, Caméra (au doigt), Position, Contact, Document, Sondage', await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-plus]')).map(x => x.textContent.trim())),
      ['Photos', 'Caméra', 'Position', 'Contact', 'Document', 'Sondage']);
    await capture(A, 'cartes-1-plus');
    await A.page.locator('[data-plus="position"]').click();

    console.log('\n2. La position — coupée par défaut');
    vrai('la feuille « Position » s\'ouvre et EXPLIQUE : le partage est coupé, c\'est une sécurité', (await feuille(A, 'Position')) && await att(A, () => /Le partage de position est coupé/.test(document.getElementById('info-corps').textContent) && /sécurité/.test(document.getElementById('info-corps').textContent)));
    v('⛔ rien n\'est parti vers le service (aucun envoi de message) — et la feuille n\'offre PAS d\'allumer à sa place : seulement « Ouvrir Confidentialité »',
      [A.envois, await A.page.evaluate(() => Array.from(document.querySelectorAll('#info-corps button')).map(x => x.textContent.trim()))], [0, ['Ouvrir Confidentialité']]);
    await capture(A, 'cartes-2-position-coupee');
    await A.page.locator('[data-pos="reglages"]').click();
    vrai('« Ouvrir Confidentialité » mène à Profil › Confidentialité, où « Partager ma position » est COUPÉ', await att(A, () => { const s = document.querySelector('#reg-conf [data-reg-cle="position"]'); return !!s && s.getClientRects().length > 0 && s.getAttribute('aria-checked') === 'false'; }));
    await A.page.locator('#reg-conf [data-reg-cle="position"]').click();
    vrai('Ana l\'allume (le service le retient)', await att(A, () => document.querySelector('#reg-conf [data-reg-cle="position"]').getAttribute('aria-checked') === 'true'));
    v('…et le service le dit allumé', (await A0.get('/api/moi/confidentialite')).j.position, true);
    vrai('population : Ana revient dans la conversation', await versConv(A));
    await plus(A, 'position');
    vrai('la position de l\'appareil se montre (48,85660 · 2,35220, à 25 m près) AVANT de partir', await att(A, () => { const t = document.getElementById('info-corps').textContent; return /Ta position actuelle/.test(t) && /48,85660/.test(t) && /2,35220/.test(t) && /à 25 m près/.test(t); }));
    v('…et rien n\'est encore parti', A.envois, 0);
    await capture(A, 'cartes-3-position-apercu');
    await A.page.locator('[data-pos="envoyer"]').click();
    vrai('« Envoyer ma position » : la feuille se ferme, la carte paraît chez Ana', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && !!document.querySelector('#conv-messages .carte-msg.pos')));
    vrai('Ben reçoit « Position partagée », ses coordonnées, « Ouvrir dans Plans » (l\'application de plans de l\'appareil, aucune page d\'un tiers)',
      await att(B, () => { const c = document.querySelector('#conv-messages .carte-msg.pos'); if (!c) return false; const a = c.querySelector('a.carte-btn'); return /Position partagée/.test(c.textContent) && /48,85660/.test(c.textContent) && !!a && /^(geo:|maps:|bingmaps:)/.test(a.getAttribute('href')) && /Ouvrir dans Plans/.test(a.textContent); }));
    await capture(B, 'cartes-4-position-recue');

    console.log('\n3. La fiche d\'un contact');
    await plus(A, 'contact');
    vrai('« Contact » ouvre « Partager un contact » : Ben et Dan', (await feuille(A, 'Partager un contact')) && await att(A, () => { const t = document.getElementById('cc-liste'); return !!t && /Ben Banc/.test(t.textContent) && /Dan Banc/.test(t.textContent); }));
    await A.page.locator('#cc-recherche').fill('dan');
    v('la recherche ne laisse que Dan', await A.page.evaluate(() => Array.from(document.querySelectorAll('#cc-liste [data-cc]')).filter(x => !x.hidden).map(x => x.querySelector('.contact-nom').textContent.trim())), ['Dan Banc']);
    await A.page.locator('#cc-liste [data-cc]:not([hidden])').click();
    v('la feuille se ferme sans refus', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'), null, 6000) ? '' : await A.page.evaluate(() => { const e = document.getElementById('info-erreur'); return e ? e.textContent : '(pas de zone de refus)'; }), '');
    vrai('la fiche de Dan part : chez Ben, son prénom, son identifiant, « Ajouter »', await att(B, () => { const c = document.querySelector('#conv-messages .carte-msg.fiche'); return !!c && /Dan/.test(c.textContent) && !/Banc/.test(c.textContent) && !!c.querySelector('[data-fiche-ajouter]'); }));
    vrai('chez Ana (déjà en contact avec Dan) : « Écrire »', await att(A, () => { const c = document.querySelector('#conv-messages .carte-msg.fiche'); return !!c && !!c.querySelector('[data-fiche-ecrire]'); }));
    await B.page.locator('#conv-messages .carte-msg.fiche [data-fiche-ajouter]').click();
    vrai('Ben touche « Ajouter » : « Demande envoyée » (et « Écrire » reste : une invitation, test-928)', await att(B, () => { const l = Array.from(document.querySelectorAll('#conv-messages .carte-msg.fiche .carte-btn')); return l.length === 2 && l[0].textContent.trim() === 'Écrire' && l[1].textContent.trim() === 'Demande envoyée' && l[1].getAttribute('aria-disabled') === 'true'; }));
    vrai('…et Dan a bien la demande de Ben', ((await D0.get('/api/contacts/demandes')).j.recues || []).some(x => x.id === B0.moi.id));
    await capture(B, 'cartes-5-fiche');

    console.log('\n4. Le sondage');
    await plus(A, 'sondage');
    vrai('« Sondage » ouvre « Nouveau sondage » : question, deux choix, trois règles, résultats, fin', (await feuille(A, 'Nouveau sondage')) && await att(A, () => document.querySelectorAll('[data-sd-c]').length === 2 && !!document.getElementById('sd-multiple') && !!document.getElementById('sd-anonyme') && !!document.getElementById('sd-ajout') && !!document.getElementById('sd-resultats') && !!document.getElementById('sd-fin')));
    await A.page.locator('#sd-q').fill('On se retrouve où demain ?');
    await A.page.locator('[data-sd-c="0"]').fill('Au dépôt');
    await A.page.locator('[data-sd="envoyer"]').click();
    vrai('un seul choix rempli : « Donne au moins deux choix. »', await att(A, () => document.getElementById('info-erreur').textContent === 'Donne au moins deux choix.'));
    await A.page.locator('[data-sd-c="1"]').fill('au DEPOT');
    await A.page.locator('[data-sd="envoyer"]').click();
    vrai('deux choix égaux (casse, accents) : « Deux choix sont identiques. »', await att(A, () => document.getElementById('info-erreur').textContent === 'Deux choix sont identiques.'));
    await A.page.locator('[data-sd-c="1"]').fill('Sur le chantier');
    await A.page.locator('[data-sd="plus"]').click();
    vrai('« Ajouter un choix » : une troisième ligne, et le curseur y va', await att(A, () => document.querySelectorAll('[data-sd-c]').length === 3 && document.activeElement && document.activeElement.dataset.sdC === '2'));
    await A.page.locator('[data-sd-c="2"]').fill('Au bureau');
    await A.page.locator('#sd-ajout').click();
    await A.page.locator('#sd-resultats').selectOption('apres_vote');
    await capture(A, 'cartes-6-nouveau-sondage');
    await A.page.locator('[data-sd="envoyer"]').click();
    vrai('le sondage part : la feuille se ferme', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte')));
    vrai('chez Ben : la question, ses règles dites, trois choix, AUCUN décompte avant de voter', await att(B, () => {
      const c = document.querySelector('#conv-messages .carte-msg.sondage'); if (!c) return false;
      const t = c.textContent; return /On se retrouve où demain/.test(t) && /Une réponse · Résultats après ton vote · Choix ouverts/.test(t) && c.querySelectorAll('[data-sond]').length === 3 && !c.querySelector('.sond-barre') && /Vote pour voir les résultats/.test(t);
    }));
    await B.page.locator('#conv-messages .carte-msg.sondage [data-sond$="|1"]').click();
    vrai('Ben touche « Sur le chantier » : coché, et les décomptes paraissent (1)', await att(B, () => {
      const c = document.querySelector('#conv-messages .carte-msg.sondage'); const x = c && c.querySelector('[data-sond$="|1"]');
      return !!x && x.getAttribute('aria-pressed') === 'true' && x.querySelector('.sond-n').textContent === '1' && !!c.querySelector('.sond-barre') && /1 personne a voté/.test(c.textContent);
    }));
    vrai('Ana le voit SANS recharger (le flux) : 1 vote, la BULLE de Ben sur le choix (ses initiales), et son nom dans l\'étiquette du choix', await att(A, () => { const x = document.querySelector('#conv-messages .carte-msg.sondage [data-sond$="|1"]'); if (!x) return false; const av = x.querySelectorAll('.sond-avatars .avatar'); return x.querySelector('.sond-n').textContent === '1' && av.length === 1 && /^B/.test(av[0].textContent.trim()) && /Ben/.test(x.getAttribute('aria-label') || ''); }));
    await B.page.locator('#conv-messages .carte-msg.sondage [data-sond$="|2"]').click();
    vrai('une réponse : Ben touche « Au bureau » — son vote PASSE à ce choix (un seul coché)', await att(B, () => { const l = Array.from(document.querySelectorAll('#conv-messages .carte-msg.sondage [data-sond]')); return l.length === 3 && l.map(x => x.getAttribute('aria-pressed')).join() === 'false,false,true'; }));
    await capture(B, 'cartes-7-sondage-vote');
    await A.page.locator('#conv-messages .carte-msg.sondage [data-sond$="|2"]').click();
    vrai('Ana vote « Au bureau » aussi : DEUX bulles sur ce choix, aucune sur « Sur le chantier »', await att(A, () => { const l = Array.from(document.querySelectorAll('#conv-messages .carte-msg.sondage [data-sond]')); return l.length === 3 && l[2].querySelectorAll('.sond-avatars .avatar').length === 2 && l[1].querySelectorAll('.sond-avatars .avatar').length === 0 && l[2].querySelector('.sond-n').textContent === '2'; }));
    await capture(A, 'cartes-7b-sondage-bulles');
    await A.page.locator('#conv-messages .carte-msg.sondage [data-sond-votes]').click();
    vrai('« Voir les votes » ouvre la feuille « Votes »', await feuille(A, 'Votes'));
    v('la feuille : chaque choix et son décompte ; « Au bureau » : Vous d\'abord, puis Ben ; « Sur le chantier » : Personne', await A.page.evaluate(() => Array.from(document.querySelectorAll('#info-corps .votes-choix')).map(s => [s.querySelector('.rubrique span').textContent, s.querySelector('.rubrique span:last-child').textContent, Array.from(s.querySelectorAll('.votes-ligne')).map(l => l.querySelector('span[dir]').textContent.trim()).join('|') || (s.querySelector('.votes-vide') || {}).textContent])),
      [['Au dépôt', '0 vote', 'Personne'], ['Sur le chantier', '0 vote', 'Personne'], ['Au bureau', '2 votes', 'Vous|Ben Banc']]);
    await capture(A, 'cartes-7c-voir-les-votes');
    await A.page.keyboard.press('Escape');
    vrai('Échap ferme la feuille', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte')));
    await B.page.locator('#conv-messages .carte-msg.sondage [data-sond-ajouter]').click();
    vrai('« Ajouter un choix » (choix ouverts) : la feuille, la question rappelée', (await feuille(B, 'Ajouter un choix')) && await att(B, () => /On se retrouve où demain/.test(document.getElementById('info-corps').textContent)));
    await B.page.locator('#sc-texte').fill('À la gare');
    await B.page.locator('#sc-texte').press('Enter');
    vrai('Entrée l\'ajoute : Ana voit le quatrième choix, « Ajouté par Ben »', await att(A, () => { const l = document.querySelectorAll('#conv-messages .carte-msg.sondage [data-sond]'); return l.length === 4 && /À la gare/.test(l[3].textContent) && /Ajouté par Ben/.test(l[3].textContent); }));
    v('⛔ Ben (ni auteur ni administrateur) ne voit pas « Clore » ; Ana, si (population : la carte d\'Ana est là)',
      [await B.page.evaluate(() => !!document.querySelector('#conv-messages .carte-msg.sondage [data-sond-clore]')), await A.page.evaluate(() => !!document.querySelector('#conv-messages .carte-msg.sondage [data-sond-clore]'))], [false, true]);
    await A.page.locator('#conv-messages .carte-msg.sondage [data-sond-clore]').click();
    vrai('première touche : « Confirmer la clôture » (rien n\'est clos)', await att(A, () => { const x = document.querySelector('#conv-messages .carte-msg.sondage [data-sond-clore]'); return !!x && x.textContent === 'Confirmer la clôture'; }));
    await A.page.locator('#conv-messages .carte-msg.sondage [data-sond-clore]').click();
    vrai('seconde touche : le sondage est clos — chez Ben, « Clos », les choix ne se touchent plus', await att(B, () => { const c = document.querySelector('#conv-messages .carte-msg.sondage'); return !!c && /Clos/.test(c.querySelector('.sond-regles').textContent) && Array.from(c.querySelectorAll('[data-sond]')).every(x => x.getAttribute('aria-disabled') === 'true'); }));
    await capture(A, 'cartes-8-sondage-clos');

    /* ⛔ un sondage ANONYME : les décomptes, jamais une bulle ni un nom — ni sur la carte, ni dans la feuille (« Voir les résultats ») */
    const anon = await A0.post('/api/conversations/' + G + '/messages', { cid: 'sonde-anonyme-1', type: 'sondage', question: 'Vote secret ?', choix: ['Oui', 'Non'], regles: { anonyme: true } });
    v('population : le sondage anonyme part (par le service)', [anon.code >= 200 && anon.code < 300, Number.isInteger(anon.j && anon.j.seq)], [true, true]);
    vrai('population : Ben le reçoit', await att(B, () => Array.from(document.querySelectorAll('#conv-messages .carte-msg.sondage')).some(c => /Vote secret/.test(c.textContent))));
    await B.page.locator('#conv-messages .carte-msg.sondage', { hasText: 'Vote secret' }).locator('[data-sond$="|0"]').click();
    vrai('population : chez Ana, « Oui » compte 1 vote', await att(A, () => { const c = Array.from(document.querySelectorAll('#conv-messages .carte-msg.sondage')).find(x => /Vote secret/.test(x.textContent)); const x = c && c.querySelector('[data-sond$="|0"]'); return !!x && x.querySelector('.sond-n').textContent === '1'; }));
    v('⛔ anonyme : aucune bulle sur la carte d\'Ana, aucun nom dans l\'étiquette ; le bouton dit « Voir les résultats »', await A.page.evaluate(() => { const c = Array.from(document.querySelectorAll('#conv-messages .carte-msg.sondage')).find(x => /Vote secret/.test(x.textContent)); return [c.querySelectorAll('.sond-avatars .avatar').length, /Ben/.test(c.innerHTML), (c.querySelector('[data-sond-votes]') || {}).textContent]; }), [0, false, 'Voir les résultats']);
    await A.page.locator('#conv-messages .carte-msg.sondage', { hasText: 'Vote secret' }).locator('[data-sond-votes]').click();
    vrai('la feuille « Votes » s\'ouvre', await feuille(A, 'Votes'));
    v('⛔ la feuille d\'un sondage anonyme : les décomptes et la phrase « Vote anonyme », AUCUNE ligne de votant, aucun nom', await A.page.evaluate(() => { const c = document.getElementById('info-corps'); return [c.querySelectorAll('.votes-choix').length, c.querySelectorAll('.votes-ligne').length, /Vote anonyme/.test(c.textContent), /Ben/.test(c.innerHTML), /1 vote/.test(c.textContent)]; }), [2, 0, true, false, true]);
    await A.page.keyboard.press('Escape');
    await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'));

    console.log('\n5. Le menu, la largeur, les erreurs');
    const menuDe = async (S, sel) => {
      /* au doigt, le bouton « … » est masqué (l'appui long ouvre le menu) : on lui envoie son clic — c'est le CONTENU du menu qu'on mesure ici */
      await S.page.locator('#conv-messages ' + sel).first().locator('xpath=ancestor::div[contains(@class,"msg ")]').locator('.msg-plus').dispatchEvent('click');
      await att(S, () => !!document.querySelector('#menu-msg [data-menu]')); await S.page.waitForTimeout(400);
      const l = await S.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-menu]')).map(x => x.dataset.menu));
      await S.page.keyboard.press('Escape');
      return l;
    };
    const mSond = await menuDe(A, '.carte-msg.sondage'), mPos = await menuDe(A, '.carte-msg.pos');
    v('⛔ le menu d\'une carte (le sondage, la position d\'Ana) : ni « Modifier » ni « Copier le texte » — population : « Répondre » y est', [mSond.includes('repondre'), mSond.includes('modifier'), mSond.includes('copier'), mPos.includes('modifier'), mPos.includes('copier')], [true, false, false, false, false]);
    for (const [S, n] of [[A, 'Ana'], [B, 'Ben']]) {
      const d = await S.page.evaluate(async () => {
        await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
        const l = Array.from(document.querySelectorAll('#conv-messages .carte-msg')); const fil = document.getElementById('conv-fil'); void fil.offsetWidth;
        return { n: l.length, deborde: l.filter(c => c.scrollWidth > c.clientWidth + 1).length, page: document.documentElement.scrollWidth - document.documentElement.clientWidth };
      });
      v('chez ' + n + ' : ' + d.n + ' cartes à 390 px, aucune ne déborde, la page ne glisse pas de côté', [d.n >= 3, d.deborde, d.page <= 0], [true, 0, true]);
    }
    v('aucune erreur JavaScript (Ana, Ben)', [A.erreurs, B.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
