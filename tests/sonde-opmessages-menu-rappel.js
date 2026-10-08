/* ══ SONDE — LE MENU D'UN MESSAGE CONTRE SA BULLE, « ME LE RAPPELER », ET LE MOIS DE L'AGENDA, DANS LA VRAIE PAGE SERVIE ═════════════════════════════════════
   Deux captures du bureau de Justin (8 octobre 2026) :
     · « il faudrait que ce soit mieux placé et il faudrait pouvoir le mettre en rappel » — le menu d'un message s'ouvrait au milieu de l'écran, loin du message ;
     · « il faudrait le calendrier du mois complet pour voir tous ses rendez-vous » — l'Agenda ne montrait qu'une semaine.
   Joué contre le VRAI service :
     1. au bureau (1440), le menu d'un message REÇU s'ouvre contre sa bulle, aligné à sa gauche ; celui d'un message ENVOYÉ, aligné à sa droite (mesuré, pas lu dans la feuille) ;
     2. « Me le rappeler » propose des heures ; « Dans 1 heure » pose un ÉVÉNEMENT dans l'agenda (le service le dit : titre, lieu, rappel à l'heure) ;
     2 bis. (8 octobre 2026 : « cocher fait », « reporter », « voir le message ») le rappel garde le CHEMIN vers son message ; ouvert par l'adresse d'une notification
        (`#reunions/<événement>`, page rechargée), sa fiche dit « Marquer comme fait », « Reporter », « Voir le message » — qui ouvre la conversation et marque le message ;
        « Reporter 10 min » et « Marquer comme fait » : le SERVICE le dit ;
     3. l'Agenda passe au MOIS : la grille entière, aujourd'hui marqué une fois, le rappel dans sa case ; le choix est retenu par le COMPTE et survit au rechargement ;
     4. au téléphone (393), le mois en points (cases de 44 px au moins), le jour touché liste ses rendez-vous ; le menu d'un message y reste la feuille du bas.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-menu-rappel.js          CAPTURES=/dossier pour les images.
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
const MOTS = { alice: 'pw-alice-12345678', ben: 'pw-ben-12345678' };
const NOMS = { alice: 'Alice Banc', ben: 'Ben Banc' };
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const TEXTE_BEN = 'Peux-tu rappeler le client WQXZ demain ?';

async function ouvrir(b, base, pf, hash) {
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  await page.goto(base + '/' + (hash || ''));
  await page.locator('#c-login').fill('alice'); await page.locator('#c-pass').fill(MOTS.alice); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
/* le menu et la rangée du message, MESURÉS (la page n'en mesure rien : c'est la feuille de style qui pose le menu) */
const geometrie = (S) => S.page.evaluate(() => {
  const m = document.getElementById('menu-msg').getBoundingClientRect(), a = document.querySelector('.menu-ancre'), r = a ? a.getBoundingClientRect() : null;
  return { menu: { t: m.top, b: m.bottom, l: m.left, r: m.right, w: m.width }, rang: r && { t: r.top, b: r.bottom, l: r.left, r: r.right }, vw: innerWidth, vh: innerHeight, fond: !document.getElementById('menu-fond').hidden };
});

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MOTS.alice), B0 = await T.connecter(svc, og, 'ben', MOTS.ben);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    const AB = (await A0.post('/api/conversations/directe', { uid: B0.moi.id })).j.conversation.id;
    await B0.post('/api/conversations/' + AB + '/messages', { cid: cid(), texte: TEXTE_BEN });
    await A0.post('/api/conversations/' + AB + '/messages', { cid: cid(), texte: 'Oui, je m\'en occupe' });
    v('population : la conversation porte deux messages (un reçu, un envoyé)', (((await A0.get('/api/conversations/' + AB + '/messages')).j.messages) || []).filter(m => !m.systeme).length, 2);

    console.log('\n── 1. Au bureau : le menu contre sa bulle ──');
    const A = await ouvrir(b, svc.base, BUREAU, '#messages/' + AB);
    vrai('population : la conversation est ouverte, les deux bulles sont là', await attendre(A, (t) => document.querySelectorAll('#conv-messages .msg.de-autre .bulle').length >= 1 && document.querySelectorAll('#conv-messages .msg.de-moi .bulle').length >= 1 && document.getElementById('conv-messages').textContent.includes(t), TEXTE_BEN));
    vrai('population : ce navigateur sait l\'ancre (sinon la fenêtre centrée d\'avant serait le bon résultat)', await A.page.evaluate(() => CSS.supports('anchor-name: --a')));
    await A.page.locator('#conv-messages .msg.de-autre .bulle').first().click({ button: 'right' });
    vrai('clic droit sur le message de Ben : le menu s\'ouvre', await attendre(A, () => !document.getElementById('menu-fond').hidden && !!document.querySelector('#menu-msg [data-menu]')));
    let g = await geometrie(A);
    vrai('population : la rangée du message porte l\'ancre', !!g.rang, JSON.stringify(g));
    const sousOuDessus = g.rang && (Math.abs(g.menu.t - (g.rang.b + 6)) <= 3 || Math.abs(g.menu.b - (g.rang.t - 6)) <= 3);
    v('⛔ le menu est CONTRE la bulle (6 px sous elle, ou au-dessus si la place manque), aligné à sa gauche — plus au milieu de l\'écran', [sousOuDessus, g.rang && Math.abs(g.menu.l - g.rang.l) <= 3, Math.abs((g.menu.l + g.menu.r) / 2 - g.vw / 2) > 40], [true, true, true]);
    vrai('…et il tient dans l\'écran', g.menu.t >= 0 && g.menu.b <= g.vh && g.menu.l >= 0 && g.menu.r <= g.vw, JSON.stringify(g.menu));
    await capture(A, '1-menu-recu-bureau');
    await A.page.keyboard.press('Escape');
    await attendre(A, () => document.getElementById('menu-fond').hidden);
    v('Échap le ferme, et l\'ancre part avec lui', await A.page.evaluate(() => document.querySelectorAll('.menu-ancre').length), 0);
    await A.page.locator('#conv-messages .msg.de-moi .bulle').first().click({ button: 'right' });
    await attendre(A, () => !document.getElementById('menu-fond').hidden);
    g = await geometrie(A);
    v('mon message : le menu s\'aligne à DROITE de ma bulle', [!!g.rang, g.rang && Math.abs(g.menu.r - g.rang.r) <= 3], [true, true]);
    await A.page.keyboard.press('Escape');

    console.log('\n── 2. « Me le rappeler » ──');
    await A.page.locator('#conv-messages .msg.de-autre .bulle').first().click({ button: 'right' });
    await attendre(A, () => !!document.querySelector('#menu-msg [data-menu="rappel"]'));
    await A.page.waitForTimeout(400);          // ⛔ le menu avale le premier clic des 350 ms qui suivent son ouverture (le relâcher d'un appui long) : une main ne clique pas plus vite
    await A.page.locator('#menu-msg [data-menu="rappel"]').click();
    const choix = await A.page.evaluate(() => Array.from(document.querySelectorAll('#menu-msg [data-menu="rappel-choix"]')).map(x => x.textContent.replace(/\s+/g, ' ').trim()));
    vrai('« Me le rappeler » propose des heures (20 min, 1 h, 3 h, demain…) avec l\'heure dite, et « Annuler »', choix.length >= 4 && /^Dans 20 minutes\d\d:\d\d$/.test(choix[0]) && /^Dans 1 heure\d\d:\d\d$/.test(choix[1]) && /^Demain09:00$/.test(choix[3]) && !!(await A.page.$('#menu-msg [data-menu="annuler"]')), JSON.stringify(choix));
    g = await geometrie(A);
    vrai('…le menu des heures reste contre la bulle', !!g.rang && g.menu.t >= 0 && g.menu.b <= g.vh && Math.abs(g.menu.l - g.rang.l) <= 3, JSON.stringify(g));
    await capture(A, '2-me-le-rappeler');
    const t0 = Date.now();
    await A.page.locator('#menu-msg [data-menu="rappel-choix"][data-quand="1h"]').click();
    vrai('« Dans 1 heure » : la page le dit (« Je te le rappelle à … — c\'est dans ton agenda »), le menu se ferme', await attendre(A, () => /Je te le rappelle à \d\d:\d\d/.test(document.getElementById('mot').textContent) && document.getElementById('menu-fond').hidden));
    const evs = ((await A0.get('/api/agenda?du=' + (t0 - 3600000) + '&au=' + (t0 + 2 * 86400000))).j.evenements) || [];
    const ev = evs.find(e => /^Rappel : Peux-tu rappeler/.test(e.titre));
    v('⛔ le service tient l\'événement : le titre du message, la conversation pour lieu, le rappel À L\'HEURE, dans une heure (à la minute près)', ev ? [ev.titre, ev.lieu, ev.rappel, Math.abs(ev.debut - (t0 + 3600000)) < 120000, /^Rappel sur le message de Ben, dans « Ben Banc »\.\n\nPeux-tu rappeler/.test(ev.note)] : null, ['Rappel : ' + TEXTE_BEN, 'Ben Banc', 0, true, true]);

    const seqBen = await (async () => { const l = (await A0.get('/api/conversations/' + AB + '/messages')).j.messages || []; const m = l.find(x => x.texte === TEXTE_BEN); return m ? m.seq : null; })();
    v('⛔ … et il garde le CHEMIN vers le message (sa conversation, son rang) — jamais une copie', ev ? ev.source : null, { conv: AB, seq: seqBen });

    console.log('\n── 3. L\'Agenda au mois ──');
    await toucher(A, '#nav-side a[data-vue="reunions"]');
    vrai('population : l\'Agenda s\'ouvre sur la SEMAINE (le défaut du compte), avec « Semaine | Mois »', await attendre(A, () => !document.getElementById('vue-reunions').hidden && !document.getElementById('sem-jours').hidden && document.getElementById('mois').hidden && document.querySelector('[data-reu-vue="semaine"]').getAttribute('aria-pressed') === 'true'));
    await toucher(A, '[data-reu-vue="mois"]');
    vrai('« Mois » : la grille entière (4 à 6 semaines de 7 jours), la bande de la semaine s\'efface', await attendre(A, () => { const n = document.querySelectorAll('#mois-jours .mjour').length; return !document.getElementById('mois').hidden && document.getElementById('sem-jours').hidden && n >= 28 && n <= 42 && n % 7 === 0; }));
    const mois = await A.page.evaluate(() => ({ titre: document.getElementById('sem-titre').textContent, auj: document.querySelectorAll('#mois-jours [aria-current="date"]').length, prec: document.getElementById('sem-prec').getAttribute('aria-label'), h: Math.min(...Array.from(document.querySelectorAll('#mois-jours .mjour')).map(x => x.offsetHeight)) }));
    const titreAttendu = (s => s.charAt(0).toUpperCase() + s.slice(1))(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'long', year: 'numeric' }).format(new Date()));
    v('le titre dit le mois (« ' + titreAttendu + ' »), aujourd\'hui est marqué UNE fois, les flèches disent « Mois précédent », les cases du bureau font 100 px au moins', [mois.titre, mois.auj, mois.prec, mois.h >= 100], [titreAttendu, 1, 'Mois précédent', true]);
    vrai('⛔ le rappel est DANS sa case : son heure et son titre', await attendre(A, () => Array.from(document.querySelectorAll('#mois-jours .mjour-elt')).some(x => /^\d\d:\d\dRappel : Peux-tu/.test(x.textContent))), JSON.stringify(await A.page.evaluate(() => Array.from(document.querySelectorAll('#mois-jours .mjour-elt')).map(x => x.textContent))));
    v('aucune case ne fait glisser la page de côté', await A.page.evaluate(() => { const s = document.scrollingElement; window.scrollTo(9999, scrollY); const x = scrollX; window.scrollTo(0, scrollY); return x; }), 0);
    await capture(A, '3-agenda-mois-bureau');
    v('⛔ le COMPTE retient le choix (prefs.agenda_vue)', ((await A0.get('/api/moi')).j.moi.prefs || {}).agenda_vue, 'mois');
    await toucher(A, '#sem-suiv');
    const suivant = (s => s.charAt(0).toUpperCase() + s.slice(1))(new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', month: 'long', year: 'numeric' }).format(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15)));
    vrai('« Mois suivant » : ' + suivant + ', sans « aujourd\'hui »', await attendre(A, (x) => document.getElementById('sem-titre').textContent === x && document.querySelectorAll('#mois-jours [aria-current="date"]').length === 0, suivant));
    await toucher(A, '#sem-titre');
    vrai('le titre ramène à aujourd\'hui', await attendre(A, (x) => document.getElementById('sem-titre').textContent === x && document.querySelectorAll('#mois-jours [aria-current="date"]').length === 1, titreAttendu));
    await A.page.reload();
    await A.page.locator('#c-login').waitFor({ state: 'detached', timeout: 3000 }).catch(() => {});
    await A.page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden; }, null, { timeout: 12000 }).catch(() => {});
    await toucher(A, '#nav-side a[data-vue="reunions"]');
    vrai('rechargée, la page rouvre l\'Agenda sur le MOIS', await attendre(A, () => !document.getElementById('mois').hidden && document.querySelectorAll('#mois-jours .mjour').length >= 28));

    console.log('\n── 3 bis. Une réunion TERMINÉE POUR TOUS le dit dans l\'agenda (durée, présents) ──');
    {
      const t0r = Date.now() + 2 * 60000, loc = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
      const cr = await A0.post('/api/reunions', { titre: 'Point WQXZ fini', debut: loc(t0r), fin: loc(t0r + 3600000), tz: 'Europe/Paris', invites: [B0.moi.id], notifier: false });
      vrai('population : la réunion est programmée (dans deux minutes : sa salle est déjà ouverte à l\'entrée)', cr.code === 201, JSON.stringify(cr.j));
      const R = cr.j.reunion.id, s1 = await A0.post('/api/reunions/' + R + '/rejoindre', {});
      await B0.post('/api/reunions/' + R + '/rejoindre', {});
      const fini = await A0.post('/api/salles/' + s1.j.appel.id + '/terminer', {});
      vrai('population : Alice et Ben y sont entrés, Alice la TERMINE POUR TOUS', !!s1.j.appel && fini.code === 200, JSON.stringify(fini.j));
      await A.page.evaluate(() => { location.hash = '#messages'; }); await A.page.waitForTimeout(200);
      await toucher(A, '#nav-side a[data-vue="reunions"]');
      const ligne = () => A.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#liste-reunions .reunion-ligne')).find(x => /Point WQXZ fini/.test(x.textContent)); return l ? { etat: (l.querySelector('.reunion-etat') || {}).textContent, sous: Array.from(l.querySelectorAll('.reunion-sous')).map(x => x.textContent), rej: !!l.parentElement.querySelector('.reunion-rejoindre') } : null; });
      vrai('⛔ l\'agenda dit « Terminée », la durée et le nombre de présents ; pour l\'organisatrice, QUI (« Vous, Ben Banc ») ; plus de « Rejoindre »', await attendre(A, () => { const l = Array.from(document.querySelectorAll('#liste-reunions .reunion-ligne')).find(x => /Point WQXZ fini/.test(x.textContent)); if (!l) return false; const sous = Array.from(l.querySelectorAll('.reunion-sous')).map(x => x.textContent); return (l.querySelector('.reunion-etat') || {}).textContent === 'Terminée' && /^Durée 1 min · 2 présents$/.test(sous[0]) && sous[1] === 'Vous, Ben Banc' && !l.parentElement.querySelector('.reunion-rejoindre'); }, null, 12000), JSON.stringify(await ligne()));
      await capture(A, '3b-agenda-reunion-terminee');
      /* ⛔ 8 octobre 2026, capture à l'appui : « quand c'est terminé, il faudrait pas qu'on puisse cliquer dessus » — la fiche proposait encore Accepter / Peut-être / Refuser.
         Mesuré au geste : un VRAI clic au centre de la ligne, puis la feuille doit rester fermée (inerte). */
      const forme = await A.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#liste-reunions .reunion-ligne')).find(x => /Point WQXZ fini/.test(x.textContent)); if (!l) return null; const r = l.getBoundingClientRect(); return { tag: l.tagName, data: l.hasAttribute('data-reunion'), presse: l.classList.contains('presse'), curseur: getComputedStyle(l).cursor, x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
      v('⛔ la ligne terminée n\'est plus un bouton : un bloc, sans identifiant de réunion, sans effet d\'appui, sans curseur de lien', forme && [forme.tag, forme.data, forme.presse, forme.curseur === 'pointer'], ['DIV', false, false, false]);
      if (forme) { await A.page.mouse.click(forme.x, forme.y); await A.page.waitForTimeout(700); }
      vrai('⛔ et la toucher n\'ouvre RIEN : la feuille reste fermée', await A.page.evaluate(() => document.getElementById('feuille').hasAttribute('inert')), await A.page.evaluate(() => (document.getElementById('feuille-titre') || {}).textContent));
    }

    console.log('\n── 4. Au téléphone ──');
    const P = await ouvrir(b, svc.base, IPHONE);
    await toucher(P, '#tabs a[data-vue="reunions"]');
    vrai('le téléphone rouvre aussi le mois (le choix suit le compte)', await attendre(P, () => !document.getElementById('mois').hidden && document.querySelectorAll('#mois-jours .mjour').length >= 28));
    const tel = await P.page.evaluate(() => {
      const cases = Array.from(document.querySelectorAll('#mois-jours .mjour')), avec = cases.filter(x => /Rappel : Peux-tu/.test(x.getAttribute('aria-label')));
      return { h: Math.min(...cases.map(x => x.offsetHeight)), w: Math.min(...cases.map(x => x.offsetWidth)), points: avec.length ? avec[0].querySelectorAll('.mjour-points i').length : -1, elts: avec.length ? getComputedStyle(avec[0].querySelector('.mjour-elts')).display : '', jour: avec.length ? avec[0].dataset.jour : null };
    });
    v('au doigt : chaque case fait 44 px au moins (haut et large), la case du rappel porte ses points (un par élément, trois au plus — la réunion terminée peut tomber le même jour), et pas de texte (trop étroit)', [tel.h >= 44, tel.w >= 44, tel.points >= 1 && tel.points <= 3, tel.elts], [true, true, true, 'none']);
    await toucher(P, '#mois-jours [data-jour="' + tel.jour + '"]');
    vrai('toucher ce jour : il est choisi, et la liste dessous porte le rappel', await attendre(P, (j) => document.querySelector('#mois-jours [data-jour="' + j + '"]').getAttribute('aria-pressed') === 'true' && /Rappel : Peux-tu/.test(document.getElementById('liste-reunions').textContent), tel.jour));
    v('aucune case ne fait glisser la page de côté (téléphone)', await P.page.evaluate(() => { window.scrollTo(9999, scrollY); const x = scrollX; window.scrollTo(0, scrollY); return x; }), 0);
    await capture(P, '4-agenda-mois-iphone');
    await P.page.evaluate((c) => { location.hash = '#messages/' + c; }, AB);
    await attendre(P, () => document.querySelectorAll('#conv-messages .msg.de-autre .bulle').length >= 1);
    await P.page.evaluate(() => { const b = document.querySelector('#conv-messages .msg.de-autre .msg-plus'); if (b) b.click(); });
    vrai('population : au téléphone, le menu s\'ouvre', await attendre(P, () => !document.getElementById('menu-fond').hidden && !!document.querySelector('#menu-msg [data-menu="rappel"]')));
    g = await geometrie(P);
    vrai('…et c\'est la feuille du bas (le pouce l\'atteint), pas un menu ancré', g.menu.b > g.vh - 60 && g.menu.w > g.vw - 40, JSON.stringify(g));


    console.log('\n── 5. La fiche d\'un rappel, ouverte par l\'adresse de sa notification ──');
    const ouvrirRappel = async () => { await P.page.goto(svc.base + '/#reunions/' + ev.id); return attendre(P, () => !!document.querySelector('#info-corps [data-evt="fait"]'), null, 12000); };
    vrai('la page rechargée sur « #reunions/<événement> » ouvre SA fiche (chargée du service), les gestes en tête : « Marquer comme fait », « Reporter » (10 min · 1 h · Demain 9 h), « Voir le message »',
      await ouvrirRappel() && await P.page.evaluate((t) => { const c = document.getElementById('info-corps'); return /Marquer comme fait/.test(c.textContent) && Array.from(c.querySelectorAll('[data-evt="reporter"]')).map(x => x.textContent).join('|') === '10 min|1 h|Demain 9 h' && !!c.querySelector('[data-evt="voir"]') && document.getElementById('ev-titre').value === 'Rappel : ' + t; }, TEXTE_BEN),
      await P.page.evaluate(() => document.getElementById('info-corps').textContent.slice(0, 200)));
    await capture(P, '5-fiche-rappel');
    await toucher(P, '#info-corps [data-evt="voir"]');
    vrai('⛔ « Voir le message » : la conversation avec Ben s\'ouvre, et SON message est marqué (amené à l\'écran)', await attendre(P, (t) => { const m = Array.from(document.querySelectorAll('#conv-messages .msg')).find(x => x.textContent.includes(t)); return !!m && m.classList.contains('msg-cible') && location.hash.includes('messages'); }, TEXTE_BEN, 8000));
    await capture(P, '5b-voir-le-message');
    await ouvrirRappel();
    const avantRep = Date.now();
    await toucher(P, '#info-corps [data-evt="reporter"][data-dans="10"]');
    vrai('« Reporter » 10 min : la page dit l\'heure retenue (« Reporté à … ») et la fiche se ferme', await attendre(P, () => /Reporté à \d\d:\d\d/.test(document.getElementById('mot').textContent)));
    const evR = (((await A0.get('/api/agenda?du=' + (avantRep - 3600000) + '&au=' + (avantRep + 2 * 86400000))).j.evenements) || []).find(x => x.id === ev.id);
    vrai('⛔ … et le SERVICE l\'a reporté : dans 10 à 11 minutes, et il sonnera', !!evR && evR.debut - avantRep >= 9 * 60000 && evR.debut - avantRep <= 12 * 60000 && evR.rappelEnAttente === true, evR);
    await ouvrirRappel();
    await toucher(P, '#info-corps [data-evt="fait"]');
    await attendre(P, () => /: fait$/.test(document.getElementById('mot').textContent));
    const evF = (((await A0.get('/api/agenda?du=' + (avantRep - 3600000) + '&au=' + (avantRep + 2 * 86400000))).j.evenements) || []).find(x => x.id === ev.id);
    vrai('⛔ « Marquer comme fait » : le SERVICE le tient fait, et il ne sonnera plus', !!evF && typeof evF.fait === 'number' && evF.rappelEnAttente === false, evF);

    /* ⛔ 6. LA FICHE OUVERTE PAR UN GESTE (8 octobre 2026, test de A à Z sur la bêta) : « Voir le message » touché depuis l'Agenda ou le tableau de bord fermait la fiche et ne
       menait NULLE PART — fermer rendait l'entrée par history.back(), dont le popstate réappliquait la vue d'avant par-dessus la conversation. Le § 5 ne pouvait pas le voir : sa
       fiche est ouverte par un LIEN (rien à rendre). */
    console.log('\n── 6. Au bureau, la fiche touchée dans l\'Agenda : « Voir le message », puis le retour ──');
    await A.page.evaluate(() => { location.hash = '#reunions'; });
    vrai('population : l\'Agenda liste le rappel (fait) du jour', await attendre(A, () => Array.from(document.querySelectorAll('button.evenement-ligne')).some(x => x.offsetWidth > 0 && /Rappel : Peux-tu/.test(x.getAttribute('aria-label') || x.textContent))));
    await A.page.locator('button.evenement-ligne').filter({ hasText: 'Rappel : Peux-tu' }).filter({ visible: true }).first().click();
    vrai('la fiche s\'ouvre par le geste (une entrée d\'historique posée)', await attendre(A, () => !!document.querySelector('#info-corps [data-evt="voir"]') && !!(history.state && history.state.opmsg && history.state.n > 0)));
    await A.page.locator('#info-corps [data-evt="voir"]').click();
    vrai('⛔ « Voir le message » : la conversation avec Ben S\'OUVRE (la vue Messages, son adresse), et son message est marqué',
      await attendre(A, (c) => location.hash === '#messages/' + c && !document.getElementById('vue-messages').hidden && Array.from(document.querySelectorAll('#conv-messages .msg')).some(x => x.textContent.includes('Peux-tu rappeler') && x.classList.contains('msg-cible')), AB),
      await A.page.evaluate(() => ({ hash: location.hash, fiche: !!document.querySelector('#info-corps [data-evt="voir"]') })));
    await A.page.waitForTimeout(400);
    await A.page.goBack();
    vrai('… et le retour ramène à l\'Agenda d\'où la fiche était partie (l\'entrée de la fiche est devenue la conversation)', await attendre(A, () => location.hash === '#reunions' && !document.getElementById('vue-reunions').hidden));

    v('aucune erreur JavaScript', [A.erreurs, P.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
