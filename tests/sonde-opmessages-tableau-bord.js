/* ══ SONDE — LE TABLEAU DE BORD « CÔTÉ PRO », DANS LA VRAIE PAGE SERVIE ═══════════════════════════════════════════════════════════════════════════════════
   7 octobre 2026 : « pour le côté pro, il faudrait un tableau de bord avec les réunions prévues, les rappels, les appels manqués mais importants ».
   Contre le VRAI service (formule de PRODUCTION : rien n'est ouvert d'office), à 390 px au doigt puis au bureau :
     1. ⛔ Ben (Messages Perso, aucun espace) n'a PAS d'onglet « Accueil » ; Ana (un espace d'entreprise abonné) l'a, EN TÊTE ;
     2. « Réunions prévues » : la réunion qu'Ana a programmée (aujourd'hui), sous l'intertitre du jour ; la toucher ouvre sa fiche ;
     3. « Rappels » : l'événement de demain qui porte un rappel, sous « Demain » ;
     4. « Appels manqués importants » : Dan (deux appels d'affilée : « A appelé 2 fois ») et Cléo (collègue de l'espace : « Collègue ») — PAS Ben (un seul appel, ni favori ni
        collègue : il reste dans Appels) ; Ana rappelle Cléo → Cléo QUITTE le tableau (rendu) ;
     5. au bureau (1280 px) : l'onglet s'appelle « Tableau de bord » dans la barre latérale ; aucune erreur JavaScript.
     6. (8 octobre 2026 : « les réunions programmées dans la semaine ou le mois, mais pas de programmer une réunion à partir d'ici ») « Semaine | Mois » : la réunion dans
        douze jours ne paraît qu'au MOIS, le choix est retenu par le COMPTE (le bureau s'ouvre dessus) ; une séance TERMINÉE n'est plus « prévue » ; ⛔ aucun « Programmer »
        — Cléo, Pro et sans réunion, lit « Aucune réunion dans les 7 / 30 prochains jours. » et rien d'autre.
     7. (8 octobre 2026, capture à l'appui : « je peux pas supprimer ») un rappel ouvert DEPUIS LE TABLEAU, modifié puis supprimé : le tableau le dit aussitôt — le service
        l'avait bien supprimé, mais seul l'Agenda se relisait.
     8. (8 octobre 2026, « il faudrait bien séparer l'agenda perso et pro ») le tableau est le côté PRO : les réunions et le rappel d'Ana y sont rangés Pro (comme la page les
        range quand on les programme côté Pro) ; ⛔ « Dîner WQXZ » et « Dentiste WQXZ », rangés Perso, n'y paraissent JAMAIS — ni en semaine, ni au mois, ni dans le compteur.
   11 octobre 2026 (« quand on bascule, c'est TOUT qui bascule… sur téléphone, dans les messages, on ne peut pas basculer ») : au téléphone, « Pro » se touche dans le PROFIL
   (la photo, puis le segment de la carte « Perso et Pro », puis ‹ Retour ›) — plus sous le titre de Messages, qui n'a plus de sélecteur (§ 1 le prouve, population à l'appui).
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
    const reu = await P.ana.post('/api/reunions', { titre: 'Point chantier WQXZ', lieu: 'Dépôt', debut: localDans(t0, PARIS), fin: localDans(t0 + H, PARIS), tz: PARIS, invites: [P.dan.moi.id], notifier: false, cote: 'pro' });
    v('population : la réunion est programmée', reu.code, 201);
    /* une autre dans douze jours (au MOIS seulement), et une troisième que la salle a déjà vue finir (« terminée pour tous ») : elle n'est plus prévue */
    /* ⛔ une heure qui tombe dans le changement d'heure (la nuit du 25 octobre) est refusée par le service : on la décale comme les suivis (`heureNette`) — mesuré le 12 octobre à minuit et quart, t12 tombait à 2 h 30 */
    const heureNette = (d) => { while (localDans(d + H, PARIS) <= localDans(d, PARIS)) d += H; return d; };
    const t12 = heureNette(t0 + 12 * JOUR);
    const reu12 = await P.ana.post('/api/reunions', { titre: 'Revue mensuelle WQXZ', debut: localDans(t12, PARIS), fin: localDans(t12 + H, PARIS), tz: PARIS, invites: [P.dan.moi.id], notifier: false, cote: 'pro' });
    const tf = Date.now() + 2 * 60000, reuF = await P.ana.post('/api/reunions', { titre: 'Point fini WQXZ', debut: localDans(tf, PARIS), fin: localDans(tf + H, PARIS), tz: PARIS, invites: [P.dan.moi.id], notifier: false, cote: 'pro' });
    const salleF = reuF.code === 201 ? await P.ana.post('/api/reunions/' + reuF.j.reunion.id + '/rejoindre', {}) : { j: {} };
    const finF = salleF.j && salleF.j.appel ? await P.ana.post('/api/salles/' + salleF.j.appel.id + '/terminer', {}) : { code: 0 };
    v('population : la réunion dans douze jours, et celle qu\'Ana a ouverte puis TERMINÉE pour tous', [reu12.code, reuF.code, finF.code], [201, 201, 200]);
    /* onze de plus, du 3ᵉ au 13ᵉ jour : au MOIS, treize réunions — douze lignes, puis « Voir l'autre dans l'Agenda » */
    /* ⛔ l'heure répétée du passage à l'heure d'hiver : lancée à 22 h 13 UTC le 11 octobre 2026, la 13ᵉ réunion tombait le 25 à 2 h 15, et sa fin une heure plus tard
       s'écrivait AUSSI « 02:15 » (heure d'hiver) — le service refuse à bon droit une réunion qui finit à l'heure où elle commence. La sonde choisit une heure qui existe. */
    const plus = []; for (let i = 3; i <= 13; i++) { const d = heureNette(t0 + i * JOUR); plus.push((await P.ana.post('/api/reunions', { titre: 'Suivi ' + i + ' WQXZ', debut: localDans(d, PARIS), fin: localDans(d + H, PARIS), tz: PARIS, invites: [P.dan.moi.id], notifier: false, cote: 'pro' })).code); }
    v('population : onze réunions de suivi, du 3ᵉ au 13ᵉ jour', plus, Array(11).fill(201));
    v('population : Cléo est Pro (membre de l\'espace abonné) et n\'est invitée nulle part', (await P.cleo.get('/api/espaces')).j.formule, 'pro');
    /* demain à midi, À PARIS (l'heure locale part telle quelle, avec son fuseau) : pas aujourd'hui — il n'entre au tableau que par son RAPPEL */
    const demainParis = localDans(Date.now() + JOUR, PARIS).slice(0, 10);
    const evt = await P.ana.post('/api/agenda', { titre: 'Rappeler le fournisseur WQXZ', debut: demainParis + 'T12:00', fin: demainParis + 'T12:30', tz: PARIS, rappel: 30, cote: 'pro' });
    v('population : l\'événement de demain, avec un rappel', evt.code, 201);
    /* (8 octobre 2026) le côté Perso d'Ana : un dîner aujourd'hui et un dentiste demain, AVEC un rappel — tout ce qu'il faut pour entrer au tableau, sauf le côté */
    const diner = await P.ana.post('/api/reunions', { titre: 'Dîner WQXZ', debut: localDans(t0 + 30 * 60000, PARIS), fin: localDans(t0 + 90 * 60000, PARIS), tz: PARIS, invites: [P.ben.moi.id], notifier: false, cote: 'perso' });
    const dentiste = await P.ana.post('/api/agenda', { titre: 'Dentiste WQXZ', debut: demainParis + 'T09:00', fin: demainParis + 'T09:30', tz: PARIS, rappel: 30, cote: 'perso' });
    v('population : le dîner (dans la semaine) et le dentiste (demain, avec un rappel) sont rangés PERSO au service ; le point de chantier, PRO', [diner.code, diner.j.reunion && diner.j.reunion.cote, dentiste.code, dentiste.j.evenement && dentiste.j.evenement.cote, reu.j.reunion && reu.j.reunion.cote],
      [201, 'perso', 201, 'perso', 'pro']);
    /* des appels manqués : Ben une fois, Cléo une fois, Dan deux fois d'affilée — chacun raccroche avant qu'Ana réponde */
    /* (8 octobre 2026, « que tout soit à part ») le tableau de bord est le côté Pro : un appel y entre s'il est du côté Pro. Dan n'est pas un collègue — Ana range leur
       conversation dans Pro, comme on le fait pour un client ; Ben, lui, reste Perso (et n'aurait de toute façon rien d'important). */
    { const d = await P.ana.post('/api/conversations/directe', { uid: P.dan.moi.id }); const r = await P.ana.post('/api/conversations/' + d.j.conversation.id + '/prefs', { cote: 'pro' });
      v('population : Ana range sa conversation avec Dan (un client, pas un collègue) dans Pro', [d.code < 300, r.code], [true, 200]); }
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
    /* LE geste de bascule au téléphone : la photo du profil, le segment du Profil, ‹ Retour › — chaque marche attend son effet (une frappe prouve qu'elle a porté) */
    const basculerTel = async (X, cote) => {
      await X.page.locator('.moi-pastille').filter({ visible: true }).first().tap();
      if (!(await att(X, () => !document.getElementById('vue-reglages').hidden && Array.from(document.querySelectorAll('.cote-seg-profil')).some(x => x.getClientRects().length)))) return false;
      await X.page.locator('.cote-seg-profil [data-cote="' + cote + '"]').filter({ visible: true }).first().tap();
      if (!(await att(X, (c) => document.documentElement.dataset.cote === c && Array.from(document.querySelectorAll('.cote-seg-profil [data-cote="' + c + '"]')).some(x => x.getAttribute('aria-pressed') === 'true'), cote))) return false;
      await X.page.locator('.profil-retour').filter({ visible: true }).first().tap();
      return att(X, () => document.getElementById('vue-reglages').hidden);
    };
    const TEL = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 };

    console.log('\n1. Qui a le tableau de bord');
    const B = await ouvrir('ben', TEL), A = await ouvrir('ana', TEL);
    const onglets = (X) => X.page.evaluate(() => Array.from(document.querySelectorAll('#tabs .tab')).map(t => t.querySelector('span').textContent.trim()));      // le libellé seul (pas le compteur caché de Contacts)
    v('⛔ Ben (Perso, aucun espace) : pas d\'« Accueil » (population : ses quatre onglets)', await onglets(B), ['Messages', 'Contacts', 'Appels', 'Agenda']);
    /* (7 octobre 2026, Perso / Pro) le tableau de bord est du côté PRO : un compte pro démarre côté Perso tant qu'il n'a rien choisi — « Pro » le fait paraître, en tête */
    vrai('(population) Messages est à l\'écran, son titre et la photo du profil visibles', await att(A, () => !document.getElementById('vue-messages').hidden && Array.from(document.querySelectorAll('#vue-messages .grand-titre')).some(x => x.getClientRects().length) && Array.from(document.querySelectorAll('.moi-pastille')).some(x => x.getClientRects().length)));
    v('Ana (un espace abonné) côté Perso : ses quatre onglets — ⛔ et AUCUN sélecteur « Perso | Pro » visible dans Messages (ni l\'ancien dans la page)', [await onglets(A), await A.page.evaluate(() => Array.from(document.querySelectorAll('[data-cote-seg]')).filter(x => x.getClientRects().length).length), await A.page.evaluate(() => document.querySelectorAll('.cote-seg-liste, .cote-seg-agenda').length)], [['Messages', 'Contacts', 'Appels', 'Agenda'], 0, 0]);
    vrai('(le geste complet) Pro, par le Profil', await basculerTel(A, 'pro'));
    await att(A, () => !!document.querySelector('#tabs .tab[data-vue="accueil"]'));
    v('Ana côté Pro : « Accueil » EN TÊTE, « Réunions » juste avant l\'Agenda (26 octobre 2026), « Courrier » à sa suite (la bêta l\'ouvre, 18 octobre 2026)', await onglets(A), ['Accueil', 'Messages', 'Contacts', 'Appels', 'Réunions', 'Agenda', 'Courrier']);
    await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('Ana touche « Accueil » : « Tableau de bord » et la date', await att(A, () => !document.getElementById('vue-accueil').hidden && document.getElementById('titre-accueil').textContent === 'Tableau de bord' && document.getElementById('bord-date').textContent.length > 5));

    console.log('\n2. Les réunions prévues');
    /* l'intertitre attendu se CALCULE (à Paris) : la réunion, dans deux heures, peut tomber demain si la sonde tourne le soir */
    const jourDe = (t) => localDans(t, PARIS).slice(0, 10), libelle = (t) => jourDe(t) === jourDe(Date.now()) ? 'Aujourd\'hui' : jourDe(t) === jourDe(Date.now() + JOUR) ? 'Demain' : null;
    vrai('la réunion d\'Ana paraît, sous « ' + libelle(t0) + ' »', await att(A, (lb) => { const l = document.getElementById('bord-reunions'); const j = l.querySelector('.bord-jour'); return !!j && j.textContent === lb && /Point chantier WQXZ/.test(l.textContent); }, libelle(t0)));
    const bordReu = () => A.page.evaluate(() => ({ texte: document.getElementById('bord-reunions').textContent, seg: Array.from(document.querySelectorAll('#bord-portee [data-bord-portee]')).map(x => x.textContent + ':' + x.getAttribute('aria-pressed')), programmer: !!document.querySelector('#vue-accueil [data-bord="programmer"]') || /Programmer/.test(document.getElementById('vue-accueil').textContent) }));
    v('⛔ « Semaine » (le défaut) : la réunion du jour, PAS celle dans douze jours, PAS la séance terminée ; le segmenté dit « Semaine » ; aucun « Programmer »', await bordReu().then(x => [/Point chantier WQXZ/.test(x.texte), /Revue mensuelle WQXZ/.test(x.texte), /Point fini WQXZ/.test(x.texte), x.seg, x.programmer]), [true, false, false, ['Semaine:true', 'Mois:false'], false]);
    v('⛔ le dîner (Perso, dans la semaine) n\'est PAS au tableau de bord (population : le point de chantier, Pro, l\'est)', await bordReu().then(x => [/Point chantier WQXZ/.test(x.texte), /Dîner WQXZ/.test(x.texte)]), [true, false]);
    await A.page.locator('#bord-portee [data-bord-portee="mois"]').tap();
    vrai('« Mois » : la réunion dans douze jours paraît (relue sur 30 jours), la séance terminée toujours pas', await att(A, () => { const t = document.getElementById('bord-reunions').textContent; return /Revue mensuelle WQXZ/.test(t) && /Point chantier WQXZ/.test(t) && !/Point fini WQXZ/.test(t) && document.querySelector('#bord-portee [data-bord-portee="mois"]').getAttribute('aria-pressed') === 'true'; }), JSON.stringify(await bordReu()));
    vrai('⛔ le COMPTE retient « Mois » (prefs.bord_reunions), sans toucher la vue de l\'Agenda', await att(A, () => true) && await (async () => { for (let i = 0; i < 30; i++) { const m = (await P.ana.get('/api/moi')).j.moi.prefs || {}; if (m.bord_reunions === 'mois') return m.agenda_vue !== 'mois'; await new Promise(r => setTimeout(r, 100)); } return false; })());
    await capture(A, 'bord-1b-mois');
    const plusLu = await A.page.evaluate(() => ({ lignes: document.querySelectorAll('#bord-reunions .reunion-ligne').length, plus: (document.querySelector('#bord-reunions [data-bord="agenda"]') || {}).textContent || '', n: document.getElementById('bord-reunions-n').textContent }));
    v('au MOIS, treize réunions : douze lignes, le compteur dit 13, puis « Voir l\'autre dans l\'Agenda » (au singulier)', plusLu, { lignes: 12, plus: 'Voir l\'autre dans l\'Agenda', n: '13' });
    await A.page.locator('#bord-reunions [data-bord="agenda"]').tap();
    vrai('le toucher ouvre l\'Agenda', await att(A, () => !document.getElementById('vue-reunions').hidden && document.getElementById('vue-accueil').hidden));
    await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    await att(A, () => !document.getElementById('vue-accueil').hidden);

    console.log('\n3. Les rappels');
    vrai('l\'événement de demain, avec son rappel, sous « Demain »', await att(A, () => { const l = document.getElementById('bord-rappels'); const j = l.querySelector('.bord-jour'); return !!j && j.textContent === 'Demain' && /Rappeler le fournisseur WQXZ/.test(l.textContent) && /Rappel 30 min avant/.test(l.textContent); }));
    v('⛔ le dentiste (Perso, demain, avec un rappel) n\'est PAS dans les rappels du tableau (population : le fournisseur, Pro, y est)', await A.page.evaluate(() => { const t = document.getElementById('bord-rappels').textContent; return [/Rappeler le fournisseur WQXZ/.test(t), /Dentiste WQXZ/.test(t)]; }), [true, false]);

    console.log('\n4. Les appels manqués IMPORTANTS');
    vrai('population : la liste des appels est lue', await att(A, () => !/Chargement/.test(document.getElementById('bord-appels').textContent)));
    const lignes = () => A.page.evaluate(() => Array.from(document.querySelectorAll('#bord-appels .appel-ligne')).map(x => [x.querySelector('.appel-nom-ligne').textContent.trim(), (x.querySelector('.bord-raison') || {}).textContent || '']));
    v('Dan (« A appelé 2 fois ») et Cléo (« Collègue ») ; ⛔ pas Ben (un seul appel, ni favori ni collègue)', await lignes(), [['Dan Banc', 'A appelé 2 fois'], ['Cléo Banc', 'Collègue']]);
    await capture(A, 'bord-1-telephone');
    /* ⛔ (17 octobre 2026, lot m21, capture iPad) LE ROUGE EST POUR L'APPEL MANQUÉ, PAS POUR LA RAISON DE L'AFFICHER : « Collègue » et « A appelé 2 fois » informent, ils n'alertent pas.
       Le nom de l'appelant prend l'encre du texte, la pastille un gris de légende — aucun des deux ne se lit dans `--rouge-txt` (la sonde demande à la PAGE la couleur de ce jeton). */
    { const c = await A.page.evaluate(() => {
        const sonde = (v) => { const e = document.createElement('i'); e.style.color = v; document.body.appendChild(e); const r = getComputedStyle(e).color; e.remove(); return r; };
        const ligne = document.querySelector('#bord-appels .appel-ligne');
        return { population: !!ligne && !!ligne.querySelector('.bord-raison'), rouge: sonde('var(--rouge-txt)'), texte: sonde('var(--text)'),
          nom: ligne ? getComputedStyle(ligne.querySelector('.appel-nom-ligne')).color : null, raison: ligne && ligne.querySelector('.bord-raison') ? getComputedStyle(ligne.querySelector('.bord-raison')).color : null };
      });
      vrai('population : une ligne d\'appel importante, avec sa pastille de raison, et la couleur du rouge de texte lue (' + c.rouge + ')', c.population && /^rgb/.test(c.rouge));
      vrai('⛔ le nom de l\'appelant au tableau n\'est pas rouge — il a l\'encre du texte (' + c.nom + ' / texte ' + c.texte + ' / rouge ' + c.rouge + ')', c.nom === c.texte && c.nom !== c.rouge);
      vrai('⛔ la pastille « Collègue » n\'est pas rouge (' + c.raison + ' / rouge ' + c.rouge + ')', !!c.raison && c.raison !== c.rouge); }
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
    /* on ATTEND la barre (lue d'un coup, elle pouvait ne pas être encore bâtie) — Ana a choisi Pro au téléphone : le compte le retient, le bureau s'ouvre côté Pro */
    vrai('la barre latérale dit « Tableau de bord » en tête (le côté Pro, retenu par le compte)', await att(A2, () => { const l = document.querySelector('#nav-side .side-lien'); return !!l && l.textContent.trim() === 'Tableau de bord'; }), await A2.page.evaluate(() => Array.from(document.querySelectorAll('#nav-side .side-lien')).map(x => x.textContent.trim()).join(' | ')));
    await A2.page.locator('#nav-side [data-vue="accueil"]').click();
    vrai('le tableau s\'ouvre, ses trois blocs remplis', await att(A2, () => /Point chantier WQXZ/.test(document.getElementById('bord-reunions').textContent) && /fournisseur/.test(document.getElementById('bord-rappels').textContent) && /Dan Banc/.test(document.getElementById('bord-appels').textContent)));
    await capture(A2, 'bord-2-bureau');
    vrai('le bureau s\'ouvre sur « Mois » (le choix du téléphone, retenu par le compte) : la réunion dans douze jours est là', await att(A2, () => document.querySelector('#bord-portee [data-bord-portee="mois"]').getAttribute('aria-pressed') === 'true' && /Revue mensuelle WQXZ/.test(document.getElementById('bord-reunions').textContent)));

    /* (15 octobre 2026, « plus simple ») un bloc vide ne se montre pas : Ana rappelle Dan aussi — plus d'appel manqué important, la rubrique se CACHE ; Dan rappelle deux fois sans réponse, elle REVIENT */
    console.log('\n5 bis. Plus rien d\'important : la rubrique se cache, et revient');
    v('population : la rubrique « Appels manqués importants » est là (Dan y reste)', await A.page.evaluate(() => [document.getElementById('bord-appels-rub').hidden, document.getElementById('bord-appels').hidden, document.querySelectorAll('#bord-appels .appel-ligne').length]), [false, false, 1]);
    const renduDan = await P.ana.post('/api/appels', { uid: P.dan.moi.id, type: 'audio' });
    await P.ana.post('/api/appels/' + renduDan.j.appel.id + '/quitter', {});
    await A.page.locator('#tabs .tab[data-vue="messages"]').tap(); await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('⛔ Ana a rappelé Dan : plus rien d\'important — la rubrique ET sa liste se cachent (population : les réunions du tableau sont là)', await att(A, () => /Point chantier WQXZ/.test(document.getElementById('bord-reunions').textContent) && document.getElementById('bord-appels-rub').hidden && document.getElementById('bord-appels').hidden),
      await A.page.evaluate(() => document.getElementById('bord-appels').textContent.trim().slice(0, 120)));
    v('   (le service n\'a perdu aucun appel : ils sont dans l\'onglet Appels)', (await manquer(P.dan)) === 200 && (await manquer(P.dan)) === 200, true);
    await A.page.locator('#tabs .tab[data-vue="messages"]').tap(); await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    vrai('Dan rappelle deux fois sans réponse : la rubrique REVIENT, avec Dan (« A appelé 2 fois »)', await att(A, () => !document.getElementById('bord-appels-rub').hidden && !document.getElementById('bord-appels').hidden && /Dan Banc/.test(document.getElementById('bord-appels').textContent)));

    console.log('\n6. Sans réunion : rien à programmer d\'ici');
    const C = await ouvrir('cleo', TEL);
    vrai('(le geste complet) Cléo passe Pro, par le Profil', await basculerTel(C, 'pro'));
    await att(C, () => !!document.querySelector('#tabs .tab[data-vue="accueil"]'));
    await C.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    const vide = () => C.page.evaluate(() => { const l = document.getElementById('bord-reunions'); return { texte: l.textContent.trim(), boutons: l.querySelectorAll('button').length }; });
    vrai('⛔ Cléo (Pro, aucune réunion) : « Aucune réunion dans les 7 prochains jours. » et AUCUN bouton', await att(C, () => { const l = document.getElementById('bord-reunions'); return l.textContent.trim() === 'Aucune réunion dans les 7 prochains jours.' && !l.querySelector('button'); }), JSON.stringify(await vide()));
    await C.page.locator('#bord-portee [data-bord-portee="mois"]').tap();
    vrai('« Mois » : « Aucune réunion dans les 30 prochains jours. », toujours sans bouton', await att(C, () => { const l = document.getElementById('bord-reunions'); return l.textContent.trim() === 'Aucune réunion dans les 30 prochains jours.' && !l.querySelector('button'); }), JSON.stringify(await vide()));
    await capture(C, 'bord-3-vide-mois');
    v('⛔ Cléo n\'a été mentionnée nulle part : pas de rubrique « Mentions » vide (population : le tableau est chargé, ses réunions le disent)', await C.page.evaluate(() => { const r = document.getElementById('bord-mentions-rub');
      return [/Aucune réunion/.test(document.getElementById('bord-reunions').textContent), !r || (r.hidden && document.getElementById('bord-mentions').hidden)]; }), [true, true]);
    console.log('\n6 bis. Le rond d\'un rappel : coché au doigt, il quitte le tableau');
    await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    await att(A, () => /Rappeler le fournisseur WQXZ/.test(document.getElementById('bord-rappels').textContent));
    const rond = await A.page.evaluate(() => { const b = document.querySelector('#bord-rappels [data-evt-fait]'); if (!b) return null; const r = b.getBoundingClientRect(), i = getComputedStyle(b.querySelector('.ic')).opacity; return { w: Math.round(r.width), h: Math.round(r.height), label: b.getAttribute('aria-label'), coche: i }; });
    v('population : la ligne du rappel porte son rond (44 × 44, vide, nommé « Marquer … comme fait »)', rond && [rond.w >= 44, rond.h >= 44, rond.coche, rond.label], [true, true, '0', 'Marquer « Rappeler le fournisseur WQXZ » comme fait']);
    await A.page.locator('#bord-rappels [data-evt-fait]').first().tap();
    vrai('⛔ coché : la ligne QUITTE le tableau aussitôt (« Aucun rappel à venir. »), la page le dit', await att(A, () => /^Aucun rappel à venir\./.test(document.getElementById('bord-rappels').textContent.trim()) && /: fait$/.test(document.getElementById('mot').textContent)));
    const evFait = ((await P.ana.get('/api/agenda?du=' + (Date.now() - JOUR) + '&au=' + (Date.now() + 3 * JOUR))).j.evenements || []).find(x => x.titre === 'Rappeler le fournisseur WQXZ');
    vrai('⛔ … et le SERVICE le tient fait (il ne sonnera plus)', !!evFait && typeof evFait.fait === 'number' && evFait.rappelEnAttente === false, evFait);
    await P.ana.post('/api/agenda/' + evFait.id + '/fait', { fait: false });          // remis à faire : la section suivante le modifie puis le supprime depuis le tableau
    await A.page.locator('#tabs .tab[data-vue="messages"]').tap();

    console.log('\n7. Un rappel modifié puis supprimé DEPUIS le tableau de bord');
    await A.page.locator('#tabs .tab[data-vue="accueil"]').tap();
    await att(A, () => /Rappeler le fournisseur WQXZ/.test(document.getElementById('bord-rappels').textContent));
    await A.page.locator('#bord-rappels [data-evenement]').first().tap();
    vrai('population : toucher le rappel ouvre sa fiche, avec « Supprimer »', await att(A, () => { const t = document.getElementById('ev-titre'); return !!t && t.value === 'Rappeler le fournisseur WQXZ' && !!document.querySelector('#info-corps [data-evt="supprimer"]'); }));
    await A.page.locator('#ev-titre').fill('Rappeler le transporteur WQXZ');
    await A.page.locator('#info-corps [data-evt="enregistrer"]').tap();
    vrai('⛔ modifié : le tableau dit le NOUVEAU titre, sans quitter l\'onglet', await att(A, () => { const t = document.getElementById('bord-rappels').textContent; return /Rappeler le transporteur WQXZ/.test(t) && !/fournisseur/.test(t); }), await A.page.evaluate(() => document.getElementById('bord-rappels').textContent));
    await A.page.locator('#bord-rappels [data-evenement]').first().tap();
    await att(A, () => !!document.querySelector('#info-corps [data-evt="supprimer"]'));
    await A.page.locator('#info-corps [data-evt="supprimer"]').tap();
    vrai('le premier toucher demande confirmation', await att(A, () => (document.querySelector('#info-corps [data-evt="supprimer"]') || {}).textContent === 'Toucher encore pour supprimer'));
    await A.page.locator('#info-corps [data-evt="supprimer"]').tap();
    vrai('⛔ supprimé : le tableau dit « Aucun rappel à venir. » aussitôt (avant : le rappel restait affiché)', await att(A, () => /^Aucun rappel à venir\./.test(document.getElementById('bord-rappels').textContent.trim()) && document.getElementById('bord-rappels-n').textContent === ''), await A.page.evaluate(() => document.getElementById('bord-rappels').textContent));
    const reste = (await P.ana.get('/api/agenda?du=' + (Date.now() - JOUR) + '&au=' + (Date.now() + 3 * JOUR))).j.evenements || [];
    v('… et le service ne l\'a plus (reste le dentiste, rangé Perso, que personne n\'a touché)', reste.map(x => x.titre), ['Dentiste WQXZ']);

    v('aucune erreur JavaScript (Ben, Ana au téléphone, Ana au bureau, Cléo)', [B.erreurs, A.erreurs, A2.erreurs, C.erreurs], [[], [], [], []]);
  } catch (e) {
    vrai('la sonde est morte : ' + (e && e.stack || e), false);
  } finally {
    try { await b.close(); } catch (e) {}
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
