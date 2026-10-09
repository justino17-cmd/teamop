/* ══ SONDE — LES MENTIONS @PRÉNOM, DANS LA VRAIE PAGE SERVIE (8 octobre 2026) ═════════════════════════════════════════════════════════════════════
   Justin : « fais tout ça » — « @prénom dans un groupe, et la personne est prévenue ». Contre le VRAI service, cinq personnes, deux Camille :
     1. au bureau, Ana dans le groupe « Chantier » : « @ » ouvre la liste des membres (sans elle), « cl » la filtre, ↓ et Entrée ÉCRIVENT « @Cléo » — ⛔ sans envoyer ;
        deux Camille : la liste les distingue par leur nom, on choisit la seconde ; Échap ne ferme QUE la liste ; Entrée envoie — le SERVICE a prévenu Cléo et Camille Petit,
        ⛔ pas Camille Roux (l'homonyme), pas Ben ; la bulle met les deux prénoms en gras ;
     2. ⛔ dans une conversation à deux, « @ » n'ouvre rien ;
     3. au téléphone, Ben (Pro, sur la liste) : une mention arrive → une bannière la dit (le groupe, « Ana Banc vous a mentionné. ») ; la toucher OUVRE le groupe, où « @Ben » est voilé (c'est lui) ;
        toucher un nom de la liste « @ » l'écrit et GARDE le clavier ;
     4. le tableau de bord (côté Pro) : un bloc « Mentions » ; la mention déjà lue (sa conversation ouverte) n'est plus « non lue » ; une nouvelle mention arrive pendant qu'il le regarde → elle
        y paraît NON LUE, comptée ; la toucher ouvre la conversation, et au retour elle est lue.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-mentions.js   (CAPTURES=/dossier pour les images)
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
const MOTS = { ana: 'pw-ana-12345678', ben: 'pw-ben-12345678', cleo: 'pw-cleo-12345678', camr: 'pw-camr-12345678', camp: 'pw-camp-12345678' };
const NOMS = { ana: 'Ana Banc', ben: 'Ben Banc', cleo: 'Cléo Banc', camr: 'Camille Roux', camp: 'Camille Petit' };
const JOUR = 86400000;
const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 }, BUREAU = { viewport: { width: 1440, height: 900 } };

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
    for (const l of ['ben', 'cleo', 'camr', 'camp']) { const k = await P.ana.post('/api/contacts/lien', { max: 1 }); await P[l].post('/api/liens/accepter', { code: k.j.code }); }
    /* Ben est Pro : membre de l'espace abonné d'Ana (posé en base, comme le tableau de bord) — c'est lui qui a le bloc « Mentions » */
    const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'Atelier Nord', proprio: P.ana.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_sonde', abonnement: 'sub_sonde', statut: 'active', places: 5 });
    const code = crypto.randomBytes(16).toString('base64url'), h = crypto.createHash('sha256').update(code).digest('hex');
    S.lienCreer({ h, genre: 'espace', cible: E, par: P.ana.moi.id, ttlMs: JOUR, max: 5 });
    S.invitationAccepter({ h, uid: P.ben.moi.id, max: Infinity });
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.ben.moi.id, P.cleo.moi.id, P.camr.moi.id, P.camp.moi.id] })).j.conversation.id;
    const AB = (await P.ana.post('/api/conversations/directe', { uid: P.ben.moi.id })).j.conversation.id;
    v('population : un groupe à cinq (deux Camille), une directe Ana ↔ Ben, Ben est Pro', [!!G, !!AB, (await P.ben.get('/api/espaces')).j.formule], [true, true, 'pro']);
    /* (8 octobre 2026, « que tout soit à part ») le tableau de bord est le côté PRO : « Chantier » (Ana, collègue, et trois contacts qui ne le sont pas) est Perso par la règle — ses
       mentions n'y entreraient pas. Ben le range Pro, comme on range un groupe de travail où il y a des gens de dehors. */
    v('population : Ben range « Chantier » dans Pro (il ne l\'est pas d\'office : trois de ses membres ne sont pas ses collègues)', [(await P.ben.post('/api/conversations/' + G + '/prefs', { cote: 'pro' })).code,
      (((await P.ben.get('/api/conversations')).j.conversations || []).find(c => c.id === G) || {}).cote], [200, 'pro']);
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    await P.ben.post('/api/conversations/' + G + '/messages', { cid: cid(), texte: 'Bonjour à tous' });
    const mentionsDe = async (X) => ((await X.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'mention');

    const ouvrir = async (login, pf, hash) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: 'Europe/Paris' }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [], mobile: !!pf.isMobile };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/' + (hash || ''));
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      pages.push(X);
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.waitForTimeout(250); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const liste = (X) => X.page.evaluate(() => document.getElementById('compo-mentions').hidden ? null : Array.from(document.querySelectorAll('#compo-mentions [data-mention]')).map(x => x.lastElementChild.textContent.trim() + (x.getAttribute('aria-selected') === 'true' ? '*' : '')));      // le NOM (le premier enfant est l'avatar et ses initiales)
    const champ = (X) => X.page.evaluate(() => document.getElementById('saisie').value);

    console.log('\n── 1. Au bureau : Ana écrit dans « Chantier » ──');
    const A = await ouvrir('ana', BUREAU, '#messages/' + G);
    await att(A, () => document.querySelectorAll('#conv-messages .msg').length >= 1);
    await A.page.locator('#saisie').click();
    await A.page.keyboard.type('Bonjour @');
    vrai('« @ » ouvre la liste : les quatre membres, ⛔ sans Ana (on ne se mentionne pas)', await att(A, () => document.querySelectorAll('#compo-mentions [data-mention]').length === 4 && !document.getElementById('compo-mentions').hidden), JSON.stringify(await liste(A)));
    v('les noms sont ENTIERS (deux Camille se distinguent), le premier est choisi', (await liste(A) || []).slice().sort(), ['Ben Banc*', 'Camille Petit', 'Camille Roux', 'Cléo Banc'].sort());
    await capture(A, 'm1-liste-arobase');
    await A.page.keyboard.type('cl');
    vrai('« cl » la filtre : Cléo seule', await att(A, () => { const l = Array.from(document.querySelectorAll('#compo-mentions [data-mention]')); return l.length === 1 && /Cléo Banc/.test(l[0].textContent); }), JSON.stringify(await liste(A)));
    const avant = ((await P.ana.get('/api/conversations/' + G + '/messages')).j.messages || []).length;
    await A.page.keyboard.press('Enter');
    vrai('⛔ Entrée ÉCRIT « @Cléo » (et un espace) et ferme la liste…', await att(A, () => document.getElementById('saisie').value === 'Bonjour @Cléo ' && document.getElementById('compo-mentions').hidden), JSON.stringify([await champ(A), await liste(A)]));
    await A.page.waitForTimeout(300);
    v('⛔ … SANS envoyer (le service n\'a pas un message de plus)', ((await P.ana.get('/api/conversations/' + G + '/messages')).j.messages || []).length, avant);
    await A.page.keyboard.type('et @cam');
    vrai('« @cam » : les deux Camille', await att(A, () => document.querySelectorAll('#compo-mentions [data-mention]').length === 2));
    const ordre = await liste(A);
    const cible = ordre && ordre[0].startsWith('Camille Petit') ? 0 : 1;
    if (cible === 1) await A.page.keyboard.press('ArrowDown');
    vrai('↓ déplace le choix (Camille Petit)', await att(A, () => { const s = document.querySelector('#compo-mentions [aria-selected="true"]'); return !!s && /Camille Petit/.test(s.textContent) && document.getElementById('saisie').getAttribute('aria-activedescendant') === s.id; }), JSON.stringify(await liste(A)));
    await A.page.keyboard.press('Tab');
    vrai('Tab l\'écrit aussi (« @Camille »)', await att(A, () => document.getElementById('saisie').value === 'Bonjour @Cléo et @Camille ' && document.getElementById('compo-mentions').hidden), JSON.stringify(await champ(A)));
    await A.page.keyboard.type('@b');
    vrai('population : « @b » rouvre la liste (Ben)', await att(A, () => !document.getElementById('compo-mentions').hidden));
    await A.page.keyboard.press('Escape');
    vrai('⛔ Échap ne ferme QUE la liste : la conversation reste ouverte, le texte intact', await att(A, () => document.getElementById('compo-mentions').hidden && document.documentElement.dataset.conv === '1' && document.getElementById('saisie').value === 'Bonjour @Cléo et @Camille @b'));
    for (let i = 0; i < 2; i++) await A.page.keyboard.press('Backspace');
    await A.page.keyboard.type('!');
    await A.page.keyboard.press('Enter');
    const parti = await att(A, () => document.getElementById('saisie').value === '' && Array.from(document.querySelectorAll('#conv-messages .bulle')).some(x => /Bonjour @Cléo et @Camille !/.test(x.textContent)));
    vrai('Entrée (la liste fermée) envoie le message', parti);
    const [mC, mP, mR, mB] = [await mentionsDe(P.cleo), await mentionsDe(P.camp), await mentionsDe(P.camr), await mentionsDe(P.ben)];
    v('⛔ le SERVICE a prévenu Cléo et Camille PETIT (choisie) — pas Camille Roux (l\'homonyme), pas Ben', [mC.length, mP.length, mR.length, mB.length, mC[0] && mC[0].texte], [1, 1, 0, 0, 'Ana Banc vous a mentionné.']);
    const gras = await A.page.evaluate(() => { const l = Array.from(document.querySelectorAll('#conv-messages .bulle')).find(x => /Bonjour @Cléo/.test(x.textContent)); return l ? Array.from(l.querySelectorAll('b.mention-nom')).map(x => x.textContent + (x.classList.contains('mention-moi') ? '*' : '')) : null; });
    v('la bulle met « @Cléo » et « @Camille » en gras (pas voilés : ce n\'est pas Ana)', gras, ['@Cléo', '@Camille']);
    await capture(A, 'm1b-bulle-mentions');

    console.log('\n── 2. Dans une conversation à deux, « @ » n\'ouvre rien ──');
    await A.page.evaluate((id) => { location.hash = '#messages/' + id; }, AB);
    await att(A, () => document.documentElement.dataset.conv === '1');
    await A.page.locator('#saisie').click();
    await A.page.keyboard.type('Salut @');
    await A.page.waitForTimeout(300);
    v('⛔ la liste reste fermée (population : le champ a bien reçu « @ »)', [await champ(A), await liste(A)], ['Salut @', null]);
    await A.page.locator('#saisie').fill('');

    console.log('\n── 3. Au téléphone : Ben reçoit une mention ──');
    const B = await ouvrir('ben', TEL, '#messages');
    await att(B, () => !document.getElementById('vue-messages').hidden && document.documentElement.dataset.conv !== '1');
    await P.ana.post('/api/conversations/' + G + '/messages', { cid: cid(), texte: '@Ben tu peux passer au dépôt ?', mentions: [P.ben.moi.id] });
    vrai('une bannière la dit : le groupe, et « Ana Banc vous a mentionné. » — elle se touche', await att(B, () => { const n = document.getElementById('notif'); return n.classList.contains('on') && n.classList.contains('touchable') && document.getElementById('notif-texte').textContent === 'Chantier' && document.getElementById('notif-aide').textContent === 'Ana Banc vous a mentionné.'; }),
      await B.page.evaluate(() => [document.getElementById('notif').className, document.getElementById('notif-texte').textContent, document.getElementById('notif-aide').textContent]));
    await capture(B, 'm3-banniere');
    await B.page.locator('#notif').tap();
    vrai('la toucher OUVRE le groupe', await att(B, (g) => document.documentElement.dataset.conv === '1' && /Chantier/.test(document.getElementById('conv-titre').textContent) && location.hash.includes(g), G));
    vrai('« @Ben » y est voilé (c\'est lui)', await att(B, () => Array.from(document.querySelectorAll('#conv-messages b.mention-nom.mention-moi')).some(x => x.textContent === '@Ben')));
    // ⛔ et voilé DANS la ligne : la classe « moi » faisait hériter la mention de la carte du compte (flex, 44 px, fond) — un bloc gris sur sa propre ligne
    vrai('« @Ben » reste dans la ligne (ni bloc, ni 44 px de haut)', await B.page.evaluate(() => { const x = Array.from(document.querySelectorAll('#conv-messages b.mention-nom.mention-moi')).find(y => y.textContent === '@Ben'); if (!x) return false; const c = getComputedStyle(x); return c.display === 'inline' && x.getBoundingClientRect().height < 40; }));
    await capture(B, 'm3b-bulle-moi');
    await B.page.locator('#saisie').tap();
    await B.page.keyboard.type('Oui @an');
    vrai('population : « @an » propose Ana', await att(B, () => { const l = Array.from(document.querySelectorAll('#compo-mentions [data-mention]')); return l.length >= 1 && l.some(x => /Ana Banc/.test(x.textContent)); }), JSON.stringify(await liste(B)));
    await B.page.locator('#compo-mentions [data-mention]', { hasText: 'Ana Banc' }).tap();
    vrai('⛔ toucher le nom l\'écrit, et le CLAVIER reste (le champ garde le focus)', await att(B, () => document.getElementById('saisie').value === 'Oui @Ana ' && document.activeElement === document.getElementById('saisie') && document.getElementById('compo-mentions').hidden), JSON.stringify([await champ(B), await B.page.evaluate(() => document.activeElement && document.activeElement.id)]));
    await B.page.locator('#saisie').fill('');

    console.log('\n── 3 bis. Les liens d\'un message (9 octobre 2026) : une adresse se touche, s\'ouvre ailleurs, sans référent ──');
    const LIEN = 'https://exemple.invalid/devis?id=42&v=2';
    const ouverts = [];
    await B.ctx.route('https://exemple.invalid/**', r => { ouverts.push({ url: r.request().url(), referent: r.request().headers().referer || null }); return r.fulfill({ status: 200, contentType: 'text/html', body: '<title>ok</title>ok' }); });
    await P.ana.post('/api/conversations/' + G + '/messages', { cid: cid(), texte: 'Le devis : ' + LIEN + '. Merci @Cléo' });
    await att(B, (u) => Array.from(document.querySelectorAll('#conv-messages .bulle a.lien-msg')).some(x => x.getAttribute('href') === u), LIEN);
    const lien = await B.page.evaluate((u) => { const a = Array.from(document.querySelectorAll('#conv-messages .bulle a.lien-msg')).find(x => x.getAttribute('href') === u); return a ? [a.textContent, a.target, a.rel, getComputedStyle(a).color === getComputedStyle(a.closest('.bulle')).color, getComputedStyle(a).textDecorationLine, a.closest('.bulle').textContent] : null; }, LIEN);
    v('l\'adresse devient un lien : son texte (sans le point de la phrase), un nouvel onglet, sans référent ni accès à la page, la couleur de la bulle, souligné ; la mention (une autre personne) reste à côté',
      lien, [LIEN, '_blank', 'noopener noreferrer nofollow', true, 'underline', 'Le devis : ' + LIEN + '. Merci @Cléo']);
    await capture(B, 'm3c-lien');
    const [onglet] = await Promise.all([B.ctx.waitForEvent('page', { timeout: 8000 }), B.page.locator('#conv-messages a.lien-msg').last().tap()]);
    await onglet.waitForLoadState('domcontentloaded').catch(() => {});
    v('⛔ le toucher ouvre l\'adresse dans un AUTRE onglet — sans référent — et la conversation reste où elle était, sans menu ouvert',
      [onglet.url(), ouverts.length >= 1 && ouverts.every(o => o.referent === null), await B.page.evaluate(() => document.documentElement.dataset.conv === '1' && document.getElementById('menu-fond').hidden)],
      [LIEN, true, true]);
    await onglet.close();

    console.log('\n── 4. Le tableau de bord : le bloc « Mentions » ──');
    await B.page.evaluate(() => { location.hash = '#messages'; });
    await att(B, () => document.documentElement.dataset.conv !== '1');
    await B.page.locator('.cote-seg-liste [data-cote="pro"]').tap();
    await att(B, () => !!document.querySelector('#tabs .tab[data-vue="accueil"]'));
    await B.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('population : le tableau de bord porte un bloc « Mentions »', await att(B, () => !document.getElementById('vue-accueil').hidden && !!document.getElementById('bord-mentions') && !/Chargement/.test(document.getElementById('bord-mentions').textContent)));
    const lignes = () => B.page.evaluate(() => Array.from(document.querySelectorAll('#bord-mentions .bord-mention')).map(x => [x.querySelector('.appel-nom-ligne').textContent.trim(), x.querySelector('.appel-kind').textContent.trim(), x.classList.contains('non-lue')]));
    v('la mention de tout à l\'heure : « Chantier — Ana Banc vous a mentionné. », ⛔ LUE (Ben a ouvert le groupe), et le compteur ne dit rien', [await lignes(), await B.page.evaluate(() => document.getElementById('bord-mentions-n').textContent)], [[['Chantier', 'Ana Banc vous a mentionné.', false]], '']);
    await P.ana.post('/api/conversations/' + G + '/messages', { cid: cid(), texte: '@Ben et la clé du local ?', mentions: [P.ben.moi.id] });
    vrai('une nouvelle mention arrive pendant qu\'il regarde : elle paraît, NON LUE, comptée « 1 »', await att(B, () => { const l = document.querySelectorAll('#bord-mentions .bord-mention'); return l.length === 2 && l[0].classList.contains('non-lue') && document.getElementById('bord-mentions-n').textContent === '1'; }),
      JSON.stringify(await lignes()));
    await capture(B, 'm4-tableau-mentions');
    await B.page.locator('#bord-mentions .bord-mention.non-lue').first().tap();
    vrai('la toucher ouvre la conversation', await att(B, () => document.documentElement.dataset.conv === '1' && /Chantier/.test(document.getElementById('conv-titre').textContent)));
    await B.page.goBack();
    vrai('au retour, elle est LUE (le compteur s\'est tu) — et le service le sait', await att(B, () => !document.getElementById('vue-accueil').hidden && document.querySelectorAll('#bord-mentions .bord-mention.non-lue').length === 0 && document.getElementById('bord-mentions-n').textContent === ''));
    let lues = false; for (let i = 0; i < 40 && !lues; i++) { lues = (await mentionsDe(P.ben)).every(n => n.lue); if (!lues) await new Promise(r => setTimeout(r, 100)); }
    vrai('⛔ côté SERVICE, les deux mentions de Ben sont lues', lues && (await mentionsDe(P.ben)).length === 2);

    v('aucune erreur JavaScript, ni chez Ana (bureau) ni chez Ben (téléphone)', [A.erreurs, B.erreurs], [[], []]);
  } catch (e) {
    vrai('la sonde s\'est déroulée sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    for (const X of pages) { try { await X.ctx.close(); } catch (e) { /* déjà fermé */ } }
    try { await b.close(); } catch (e) { /* tant pis */ }
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
