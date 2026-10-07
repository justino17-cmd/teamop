/* ══ SONDE — LE TABLEAU DE BORD « CÔTÉ PRO », DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════════════════════════════════
   7 octobre 2026 : « pour le côté pro, il faudrait un tableau de bord avec les réunions prévues, les rappels, les appels manqués mais importants ».
   Contre le VRAI service (formule de PRODUCTION : rien n'est ouvert d'office), à 390 px au doigt puis au bureau :
     1. ⛔ Ben (Messages Perso, aucun espace) n'a PAS d'onglet « Accueil » ; Ana (un espace d'entreprise abonné) l'a, EN TÊTE ;
     2. « Réunions prévues » : la réunion qu'Ana a programmée (aujourd'hui), sous l'intertitre du jour ; la toucher ouvre sa fiche ;
     3. « Rappels » : l'événement de demain qui porte un rappel, sous « Demain » ;
     4. « Appels manqués importants » : Dan (deux appels d'affilée : « A appelé 2 fois ») et Cléo (collègue de l'espace : « Collègue ») — PAS Ben (un seul appel, ni favori ni
        collègue : il reste dans Appels) ; Ana rappelle Cléo → Cléo QUITTE le tableau (rendu) ;
     5. au bureau (1280 px) : l'onglet s'appelle « Tableau de bord » dans la barre latérale ; aucune erreur JavaScript.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-tableau-bord.js   (CAPTURES=/dossier pour les images)
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
    /* l'espace d'Ana, abonné (Messages Pro), avec Cléo : on le pose en base, comme test-962 — créer un espace est une fonction Pro */
    const S = ouvrirBase({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'Atelier Nord', proprio: P.ana.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_sonde', abonnement: 'sub_sonde', statut: 'active', places: 5 });
    const code = crypto.randomBytes(16).toString('base64url'), h = crypto.createHash('sha256').update(code).digest('hex');
    S.lienCreer({ h, genre: 'espace', cible: E, par: P.ana.moi.id, ttlMs: JOUR, max: 5 });
    S.invitationAccepter({ h, uid: P.cleo.moi.id, max: Infinity });
    v('population : Ana est Pro (son espace est abonné), Ben est Perso', [(await P.ana.get('/api/espaces')).j.formule, (await P.ben.get('/api/espaces')).j.formule], ['pro', 'perso']);
    /* une réunion aujourd'hui (dans deux heures), un événement demain avec un rappel */
    const t0 = Math.ceil((Date.now() + 2 * H) / (15 * 60000)) * 15 * 60000;
    const reu = await P.ana.post('/api/reunions', { titre: 'Point chantier WQXZ', lieu: 'Dépôt', debut: localDans(t0, PARIS), fin: localDans(t0 + H, PARIS), tz: PARIS, invites: [P.cleo.moi.id], notifier: false });
    v('population : la réunion est programmée', reu.code, 201);
    const demain10 = (() => { const d = new Date(Date.now() + JOUR); d.setHours(10, 0, 0, 0); return d.getTime(); })();
    const evt = await P.ana.post('/api/agenda', { titre: 'Rappeler le fournisseur WQXZ', debut: localDans(demain10, PARIS), fin: localDans(demain10 + H / 2, PARIS), tz: PARIS, rappel: 30 });
    v('population : l\'événement de demain, avec un rappel', evt.code, 201);
    /* des appels manqués : Ben une fois, Cléo une fois, Dan deux fois d'affilée — chacun raccroche avant qu'Ana réponde */
    const manquer = async (X) => { const r = await X.post('/api/appels', { uid: P.ana.moi.id, type: 'audio' }); if (r.code !== 201) return r.code; return (await X.post('/api/appels/' + r.j.appel.id + '/quitter', {})).code; };
    v('population : quatre appels manqués partent (Ben, Cléo, Dan, Dan)', [await manquer(P.ben), await manquer(P.cleo), await manquer(P.dan), await manquer(P.dan)], [200, 200, 200, 200]);
    const lm = (await P.ana.get('/api/appels?filtre=manques')).j.appels || [];
    v('population : Ana a quatre appels manqués', lm.length, 4);

    const ouvrir = async (login, pf) => {
      const ctx = await b.newContext(Object.assign({ reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS }, pf));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const X = { ctx, page, erreurs: [] };
      page.on('pageerror', e => X.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return X;
    };
    const att = (X, fn, arg, ms) => X.page.waitForFunction(fn, arg, { timeout: ms || 15000, polling: 100 }).then(() => true, () => false);
    const capture = async (X, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await X.page.screenshot({ path: path.join(DOSSIER, nom + '.png'), fullPage: true }); };
    const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

    console.log('\n1. Qui a le tableau de bord');
    const B = await ouvrir('ben', TEL), A = await ouvrir('ana', TEL);
    const onglets = (X) => X.page.evaluate(() => Array.from(document.querySelectorAll('#tabs .tab')).map(t => t.textContent.trim()));
    v('⛔ Ben (Perso, aucun espace) : pas d\'« Accueil » (population : ses quatre onglets)', await onglets(B), ['Messages', 'Contacts', 'Appels', 'Agenda']);
    v('Ana (un espace abonné) : « Accueil » EN TÊTE', await onglets(A), ['Accueil', 'Messages', 'Contacts', 'Appels', 'Agenda']);
    await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('Ana touche « Accueil » : « Tableau de bord » et la date', await att(A, () => !document.getElementById('vue-accueil').hidden && document.getElementById('titre-accueil').textContent === 'Tableau de bord' && document.getElementById('bord-date').textContent.length > 5));

    console.log('\n2. Les réunions prévues');
    vrai('la réunion d\'Ana paraît, sous « Aujourd\'hui »', await att(A, () => { const l = document.getElementById('bord-reunions'); return /Aujourd'hui/.test(l.textContent) && /Point chantier WQXZ/.test(l.textContent); }));
    console.log('\n3. Les rappels');
    vrai('l\'événement de demain, avec son rappel, sous « Demain »', await att(A, () => { const l = document.getElementById('bord-rappels'); return /Demain/.test(l.textContent) && /Rappeler le fournisseur WQXZ/.test(l.textContent) && /Rappel 30 min avant/.test(l.textContent); }));

    console.log('\n4. Les appels manqués IMPORTANTS');
    vrai('population : la liste des appels est lue', await att(A, () => !/Chargement/.test(document.getElementById('bord-appels').textContent)));
    const lignes = () => A.page.evaluate(() => Array.from(document.querySelectorAll('#bord-appels .appel-ligne')).map(x => [x.querySelector('.appel-nom-ligne').textContent.trim(), (x.querySelector('.bord-raison') || {}).textContent || '']));
    v('Dan (« A appelé 2 fois ») et Cléo (« Collègue ») ; ⛔ pas Ben (un seul appel, ni favori ni collègue)', await lignes(), [['Dan Banc', 'A appelé 2 fois'], ['Cléo Banc', 'Collègue']]);
    await capture(A, 'bord-1-telephone');
    await A.page.locator('#bord-reunions [data-reunion]').first().tap();
    vrai('toucher la réunion ouvre sa fiche', await att(A, () => document.documentElement.classList.contains('feuille-ouverte') && document.getElementById('feuille-titre').textContent === 'Réunion'));
    await A.page.keyboard.press('Escape');
    await att(A, () => !document.documentElement.classList.contains('feuille-ouverte'));
    /* Ana rappelle Cléo (puis raccroche) : l'appel manqué de Cléo est RENDU, il quitte le tableau */
    const rendu = await P.ana.post('/api/appels', { uid: P.cleo.moi.id, type: 'audio' });
    await P.ana.post('/api/appels/' + rendu.j.appel.id + '/quitter', {});
    await A.page.locator('#tabs .tab[data-vue="messages"]').tap(); await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('Ana a rappelé Cléo : Cléo quitte le tableau, Dan reste', await att(A, () => { const n = Array.from(document.querySelectorAll('#bord-appels .appel-nom-ligne')).map(x => x.textContent.trim()); return n.length === 1 && n[0] === 'Dan Banc'; }));

    console.log('\n5. Au bureau');
    const A2 = await ouvrir('ana', { viewport: { width: 1280, height: 860 } });
    v('la barre latérale dit « Tableau de bord » en tête', await A2.page.evaluate(() => Array.from(document.querySelectorAll('#nav-side .side-lien')).map(x => x.textContent.trim())[0]), 'Tableau de bord');
    await A2.page.locator('#nav-side [data-vue="accueil"]').click();
    vrai('le tableau s\'ouvre, ses trois blocs remplis', await att(A2, () => /Point chantier WQXZ/.test(document.getElementById('bord-reunions').textContent) && /fournisseur/.test(document.getElementById('bord-rappels').textContent) && /Dan Banc/.test(document.getElementById('bord-appels').textContent)));
    await capture(A2, 'bord-2-bureau');
    v('aucune erreur JavaScript (Ben, Ana au téléphone, Ana au bureau)', [B.erreurs, A.erreurs, A2.erreurs], [[], [], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
