/* ══ SONDE — L'AGENDA PERSO ET L'AGENDA PRO, DANS LA VRAIE PAGE SERVIE (formule de PRODUCTION : seul un compte pro a deux côtés) ═══════════════════════════════════════
   8 octobre 2026 : « il faudrait bien séparer l'agenda perso et pro ». 11 octobre 2026 : « quand on bascule, c'est TOUT qui bascule ; dans chaque onglet on ne choisit pas pro ou perso ;
   sur téléphone, dans les messages, on ne peut pas basculer » — UNE SEULE bascule : la barre latérale au bureau, le PROFIL au téléphone (.cote-seg-profil, carte « Perso et Pro »).
   Plus de sélecteur sous le titre de l'Agenda ni de Messages, plus de choix « Agenda : Perso | Pro » dans les fiches : un élément CRÉÉ prend le côté où l'on est.
   Contre le VRAI service, Ana (un espace abonné : Ben est son collègue ; Cléo, une amie — Perso : depuis le 12 octobre, le dîner la rend « par le lien ») a demain cinq choses — deux événements rangés (Dentiste : Perso, Revue client : Pro), un
   d'avant sans côté (Perso), une réunion avec Ben (Pro par la règle), un dîner avec Cléo (Perso) :
     1. téléphone, côté Perso : ni l'Agenda ni Messages n'ont de sélecteur sous leur titre (population : titres visibles, anciennes classes absentes du DOM) ; l'Agenda ne montre
        QUE le perso (trois sur cinq) ;
     2. le PROFIL (toucher la photo) porte le seul sélecteur ; « Pro » y est touché, ‹ Messages › rend l'Agenda : QUE le pro (deux sur cinq) — c'est le côté du compte,
        « OP MESSAGES PRO » ; le tableau de bord : la réunion et le rappel Pro, jamais le Perso ;
     3. la fiche d'un événement et celle d'une réunion n'ont AUCUN segment Perso|Pro ; créés côté Pro, ils naissent Pro (la demande le porte, le service le garde, ils paraissent
        dans l'agenda Pro) ; le menu d'un élément de l'agenda (« Ranger dans ») range un événement Perso : il quitte l'agenda Pro, et la page le DIT ;
     4. une réunion se range dans SA fiche (« Ranger dans ») : Perso pour Ana seule — Ben la garde Pro ; elle quitte l'agenda Pro ;
     5. côté Perso (par le Profil), l'Agenda montre ce qu'on vient d'y ranger — et RIEN de ce qui a été créé côté Pro ; un événement et une réunion créés côté Perso naissent Perso ;
     6. au bureau : pas de sélecteur sous le titre de l'Agenda (il est en haut de la barre latérale), et l'Agenda suit le côté choisi là ;
     7. Cléo (aucun espace, formule Perso) n'a pas de sélecteur, pas de carte « Perso et Pro » dans le Profil, et voit tout son agenda ;
     8. aucune erreur JavaScript ;
     9. (« que tout soit à part ») les APPELS et les CONTACTS aussi : côté Pro, l'appel manqué de Ben (collègue) et Ben dans « Tous » ; côté Perso, celui de Cléo, Cléo — et
        « Entreprise » n'est proposée que côté Pro.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-agenda-cote.js   (CAPTURES=/dossier pour les images)
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
const PARIS = 'Europe/Paris', JOUR = 86400000;
/* les cinq de demain, dans l'ordre des heures — et ce que chaque côté doit montrer */
const T5 = ['Dentiste QZK', 'Revue client QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'Dîner QZK'];
const PERSO3 = ['Dentiste QZK', 'Ancien rappel QZK', 'Dîner QZK'], PRO2 = ['Revue client QZK', 'Point équipe QZK'];
/* ce que la sonde crée elle-même, dans l'ordre des heures : trois créés côté Pro (dont « À ranger », rangé Perso par le menu), trois créés côté Perso */
const TOUT = ['Dentiste QZK', 'Revue client QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'Créé côté Pro QZK', 'À ranger QZK', 'Réunion Pro QZK', 'Dîner QZK', 'Anniversaire QZK', 'Créé côté Perso QZK', 'Réunion Perso QZK'];
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port], formule: { toutOuvert: false } } });
  let b = null, S = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  const pages = [];
  try {
    const A0 = await T.connecter(svc, og, 'ana', MOTS.ana), B0 = await T.connecter(svc, og, 'ben', MOTS.ben), C0 = await T.connecter(svc, og, 'cleo', MOTS.cleo);
    /* l'espace d'Ana, ABONNÉ (programmer une réunion est une fonction d'organisateur), Ben dedans ; Ben et Cléo, contacts d'Ana */
    S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    const E = S.espaceCreer({ nom: 'ESPACEZXAGENDACOTE', proprio: A0.moi.id }).id;
    S.abonnementPoser(E, { client: 'cus_sonde_cote', abonnement: 'sub_sonde_cote', statut: 'active', places: 5 });
    { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: E, par: A0.moi.id, ttlMs: JOUR, max: 5 }); S.invitationAccepter({ h: sha(code), uid: B0.moi.id }); }
    for (const y of [B0, C0]) { const l = await A0.post('/api/contacts/lien', { max: 1 }); await y.post('/api/liens/accepter', { code: l.j.code }); }
    v('population : Ana est Pro (son espace est abonné), Cléo Perso', [(await A0.get('/api/espaces')).j.formule, (await C0.get('/api/espaces')).j.formule], ['pro', 'perso']);

    /* demain, à Paris : cinq choses, chacune de son côté */
    const demain = localDans(Date.now() + JOUR, PARIS).slice(0, 10);
    const evt = (titre, h, cote) => A0.post('/api/agenda', Object.assign({ titre, debut: demain + 'T' + h, tz: PARIS, rappel: 15 }, cote ? { cote } : {}));
    const reu = (titre, h, invites) => A0.post('/api/reunions', { titre, debut: demain + 'T' + h, fin: demain + 'T' + h.replace(/^(\d\d)/, (m) => String(+m + 1).padStart(2, '0')), tz: PARIS, invites, notifier: false });
    const r1 = await evt('Dentiste QZK', '09:00', 'perso'), r2 = await evt('Revue client QZK', '11:00', 'pro'), r3 = await evt('Ancien rappel QZK', '13:00', null);
    const r4 = await reu('Point équipe QZK', '15:00', [B0.moi.id]), r5 = await reu('Dîner QZK', '19:00', [C0.moi.id]);
    v('population : les cinq sont posés au service, chacun de son côté (événements : perso, pro, aucun ; réunions par la règle : Ben collègue → Pro, Cléo amie → Perso)',
      [[r1, r2, r3].map(x => x.code + ':' + x.j.evenement.cote), [r4, r5].map(x => x.code + ':' + x.j.reunion.cote)], [['201:perso', '201:pro', '201:null'], ['201:pro', '201:perso']]);
    /* ⛔ depuis le 12 octobre 2026, on n'est invité EN SON NOM à une réunion qu'avec Pro : Cléo (Perso) est rendue « par le lien » — elle y entrera par le lien qu'Ana lui envoie */
    const piscine = await C0.post('/api/agenda', { titre: 'Piscine QZK', debut: demain + 'T19:30', tz: PARIS, rappel: 15 });
    v('population : Cléo a son propre événement demain (« Piscine »)', piscine.code, 201);
    v('⛔ Cléo (Perso) n\'est pas invitée au dîner en son nom : le service la rend « par le lien » ; Ben (collègue, Pro par l\'espace) est invité au point d\'équipe', [r5.j.par_lien, r4.j.par_lien], [[C0.moi.id], []]);
    /* deux appels manqués : Ben (collègue) et Cléo (amie) appellent Ana et raccrochent avant qu'elle réponde */
    const manquer = async (X) => { const r = await X.post('/api/appels', { uid: A0.moi.id, type: 'audio' }); if (r.code !== 201) return r.code; return (await X.post('/api/appels/' + r.j.appel.id + '/quitter', {})).code; };
    v('population : Ben puis Cléo ont appelé Ana (deux appels manqués)', [await manquer(B0), await manquer(C0)], [200, 200]);
    v('⛔ chez Ben, « Point équipe » est Pro aussi (Ana est sa collègue)', ((await B0.get('/api/reunions?du=' + (Date.now() - JOUR) + '&au=' + (Date.now() + 3 * JOUR))).j.reunions || []).filter(x => x.titre === 'Point équipe QZK').map(x => x.cote), ['pro']);

    const ouvrirPage = async (login, bureau) => {
      const ctx = await b.newContext(Object.assign(bureau ? { viewport: { width: 1280, height: 860 }, deviceScaleFactor: 1 } : { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
        { reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS }));
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const P = { ctx, page, erreurs: [], bureau, nom: login + (bureau ? ' (bureau)' : '') };
      pages.push(P);
      page.on('pageerror', e => P.erreurs.push(String(e && e.message || e).slice(0, 220)));
      await page.goto(svc.base + '/');
      await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MOTS[login]); await page.locator('#c-entrer').click();
      await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 15000 });
      return P;
    };
    const att = (P, fn, arg, ms) => P.page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 100 }).then(() => true, () => false);
    const capture = async (P, nom) => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await P.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); };
    const toucher = (P, sel, texte) => { let l = P.page.locator(sel); if (texte) l = l.filter({ hasText: texte }); l = l.filter({ visible: true }).first(); return P.bureau ? l.click() : l.tap(); };
    /* l'Agenda, puis demain (la semaine suivante si demain y est) */
    const versAgenda = async (P) => {
      await toucher(P, P.bureau ? '#nav-side a.side-lien[data-vue="reunions"]' : '#tabs a.tab[data-vue="reunions"]');
      await att(P, () => !document.getElementById('vue-reunions').hidden && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false');
      const t = await P.page.evaluate(() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); });
      /* au BUREAU, l'Agenda est la semaine en grille (la bande des jours n'y est plus : display:none dès 700 px) : demain est une CASE de la grille, la semaine suivante s'il n'y est pas */
      if (P.bureau) {
        const case_ = (x) => !!document.querySelector('#sem-grille .mjour[data-case="' + x + '"]');
        if (!(await P.page.evaluate(case_, t))) { await toucher(P, '#sem-suiv'); await att(P, case_, t); }
        return att(P, (x) => !!document.querySelector('#sem-grille .mjour[data-case="' + x + '"]') && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false', t);
      }
      if (!(await P.page.evaluate((x) => !!document.querySelector('#sem-jours [data-jour="' + x + '"]'), t))) { await toucher(P, '#sem-suiv'); await att(P, (x) => !!document.querySelector('#sem-jours [data-jour="' + x + '"]'), t); }
      await toucher(P, '#sem-jours [data-jour="' + t + '"]');
      return att(P, (x) => { const j = document.querySelector('#sem-jours [data-jour="' + x + '"]'); return !!j && j.getAttribute('aria-pressed') === 'true' && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false'; }, t);
    };
    /* ce que montre la journée : lesquels des titres attendus y sont (dans l'ordre donné) */
    /* le texte de DEMAIN : la liste du jour au téléphone, la case de demain dans la semaine en grille au bureau (ses rendez-vous, au plus huit par case : le compte reste sous huit) */
    const texteDemain = (bureau) => { if (!bureau) return document.getElementById('liste-reunions').textContent; const d = new Date(); d.setHours(24, 0, 0, 0); const c = document.querySelector('#sem-grille .mjour[data-case="' + d.getTime() + '"] .mjour-elts'); return c ? c.textContent : ''; };
    const vus = (P, titres) => P.page.evaluate(([L, f, bureau]) => { const t = new Function('return (' + f + ')')()(bureau); return L.filter(x => t.includes(x)); }, [titres, texteDemain.toString(), !!P.bureau]);
    const montre = (P, titres, attendu) => att(P, ([L, A, f, bureau]) => { const t = new Function('return (' + f + ')')()(bureau); return JSON.stringify(L.filter(x => t.includes(x))) === JSON.stringify(A); }, [titres, attendu, texteDemain.toString(), !!P.bureau]);
    /* les sélecteurs VISIBLES : la barre latérale (bureau) et le Profil (téléphone) sont les deux seuls permis ; toute autre classe se nomme « autre » et fait tomber le contrôle */
    const segVisible = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-cote-seg]')).filter(x => x.getClientRects().length).map(x => (x.classList.contains('cote-seg-side') ? 'barre' : x.classList.contains('cote-seg-profil') ? 'profil' : 'autre') + ':' + ((x.querySelector('[aria-pressed="true"]') || {}).dataset || {}).cote));
    /* les anciens sélecteurs (sous le titre de Messages et de l'Agenda) ne sont plus dans la page, ni cachés ni montrés */
    const anciens = (P) => P.page.evaluate(() => document.querySelectorAll('.cote-seg-liste, .cote-seg-agenda, #ev-cote, #rf-cote, [data-choix-cote]').length);
    /* LE geste de bascule au téléphone : la photo du profil, le segment du Profil, ‹ Retour › — chaque marche attend son effet, et le service retient le côté */
    const basculerTel = async (P, cote) => {
      await toucher(P, '.moi-pastille');
      if (!(await att(P, () => !document.getElementById('vue-reglages').hidden && Array.from(document.querySelectorAll('.cote-seg-profil')).some(x => x.getClientRects().length)))) return false;
      await toucher(P, '.cote-seg-profil [data-cote="' + cote + '"]');
      if (!(await att(P, (c) => document.documentElement.dataset.cote === c && Array.from(document.querySelectorAll('.cote-seg-profil [data-cote="' + c + '"]')).some(x => x.getAttribute('aria-pressed') === 'true'), cote))) return false;
      for (let i = 0; i < 40; i++) { if ((await A0.get('/api/moi')).j.moi.prefs.mode === cote) break; await new Promise(r => setTimeout(r, 100)); }
      await toucher(P, '.profil-retour');
      return att(P, () => document.getElementById('vue-reglages').hidden);
    };
    const agendaAna = async () => ((await A0.get('/api/agenda?du=' + (Date.now() - JOUR) + '&au=' + (Date.now() + 3 * JOUR))).j.evenements || []);
    const convDe = async (X, rid) => ((await X.get('/api/conversations')).j.conversations || []).find(c => c.reunion === rid);

    /* ═══ 1. TÉLÉPHONE, CÔTÉ PERSO ═══ */
    console.log('\n1. Téléphone, côté Perso : l\'Agenda ne montre que le perso');
    const A = await ouvrirPage('ana', false);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(A));
    vrai('(population) le titre de l\'Agenda est à l\'écran, avec la photo du profil qui mène à la bascule', await A.page.evaluate(() => Array.from(document.querySelectorAll('#vue-reunions .grand-titre')).some(x => x.getClientRects().length) && Array.from(document.querySelectorAll('.moi-pastille')).some(x => x.getClientRects().length)));
    v('⛔ AUCUN sélecteur « Perso | Pro » visible sous le titre de l\'Agenda, et les anciens ne sont plus dans la page', [await segVisible(A), await anciens(A)], [[], 0]);
    vrai('demain : Dentiste, l\'événement d\'avant (sans côté : Perso) et le dîner — ni la revue client, ni le point d\'équipe', await montre(A, T5, PERSO3), await vus(A, T5));
    await capture(A, 'ac-1-perso');
    await toucher(A, '#tabs a.tab[data-vue="messages"]');
    vrai('(population) Messages est ouvert, son titre à l\'écran', await att(A, () => !document.getElementById('vue-messages').hidden && Array.from(document.querySelectorAll('#vue-messages .grand-titre')).some(x => x.getClientRects().length)));
    v('⛔ « sur téléphone, dans les messages, on ne peut pas basculer » : aucun sélecteur visible', await segVisible(A), []);
    vrai('retour à l\'Agenda, demain', await versAgenda(A));

    /* ═══ 2. « PRO » DANS L'AGENDA ═══ */
    console.log('\n2. « Pro » par le Profil');
    await toucher(A, '.moi-pastille');
    vrai('le Profil : sa carte « Perso et Pro » porte le seul sélecteur, sur Perso', await att(A, () => !document.getElementById('vue-reglages').hidden && !document.getElementById('reg-cote').hidden && document.querySelectorAll('.cote-seg-profil').length === 1) && JSON.stringify(await segVisible(A)) === JSON.stringify(['profil:perso']), await segVisible(A));
    await capture(A, 'ac-2a-profil');
    await toucher(A, '.profil-retour');
    vrai('‹ Retour › rend l\'Agenda', await att(A, () => document.getElementById('vue-reglages').hidden && !document.getElementById('vue-reunions').hidden));
    vrai('(le geste complet) Pro, par le Profil', await basculerTel(A, 'pro'));
    vrai('retour à l\'Agenda, demain', await versAgenda(A));
    vrai('côté Pro : la revue client et le point d\'équipe, rien d\'autre', await montre(A, T5, PRO2), await vus(A, T5));
    v('c\'est le côté du COMPTE : « OP MESSAGES PRO », et toujours aucun sélecteur sous le titre de l\'Agenda', [await A.page.evaluate(() => document.documentElement.dataset.cote), await segVisible(A)], ['pro', []]);
    vrai('le service a retenu le côté (Pro)', await (async () => { for (let i = 0; i < 40; i++) { if ((await A0.get('/api/moi')).j.moi.prefs.mode === 'pro') return true; await new Promise(r => setTimeout(r, 100)); } return false; })());
    await capture(A, 'ac-2-pro');
    await toucher(A, '#tabs a.tab[data-vue="accueil"]');
    vrai('le tableau de bord (côté Pro) : le point d\'équipe dans les réunions, la revue client dans les rappels', await att(A, () => /Point équipe QZK/.test(document.getElementById('bord-reunions').textContent) && /Revue client QZK/.test(document.getElementById('bord-rappels').textContent)));
    v('⛔ …et rien du côté Perso : ni le dîner, ni le dentiste, ni l\'événement d\'avant (tous ont un rappel, tous sont demain)', await A.page.evaluate(() => { const t = document.getElementById('bord-reunions').textContent + document.getElementById('bord-rappels').textContent; return ['Dîner QZK', 'Dentiste QZK', 'Ancien rappel QZK'].filter(x => t.includes(x)); }), []);
    await capture(A, 'ac-2b-bord');

    /* ═══ 3. ÉVÉNEMENT ET RÉUNION CRÉÉS CÔTÉ PRO, PUIS UN ÉVÉNEMENT RANGÉ PERSO PAR LE MENU ═══ */
    console.log('\n3. Créés côté Pro, ils naissent Pro (la fiche n\'a aucun choix) ; le menu de l\'agenda range un événement Perso');
    const postes = [];
    A.page.on('request', q => { if (q.method() === 'POST' && /\/api\/(reunions|agenda)$/.test(q.url())) postes.push({ u: q.url().replace(/^.*\/api\//, ''), c: (() => { try { return JSON.parse(q.postData()).cote; } catch (e) { return '?'; } })() }); });
    /* la fiche d'un événement : la population (le formulaire est ouvert), puis l'absence de tout segment Perso|Pro ; il s'enregistre où l'on est */
    const creerEvenement = async (titre, h1, h2) => {
      await toucher(A, '#btn-evenement-nouveau');
      vrai('(population) la fiche d\'un nouvel événement est ouverte : titre, début, fin, bouton Enregistrer', await att(A, () => !!document.getElementById('ev-titre') && !!document.getElementById('ev-debut') && !!document.getElementById('ev-fin') && !!document.querySelector('[data-evt="enregistrer"]')));
      v('⛔ …et elle n\'a AUCUN segment Perso|Pro (ni #ev-cote, ni choix de côté, ni sélecteur visible)', [await anciens(A), await segVisible(A)], [0, []]);
      await A.page.locator('#ev-titre').fill(titre);
      await A.page.locator('#ev-debut').fill(demain + 'T' + h1); await A.page.locator('#ev-fin').fill(demain + 'T' + h2);
      await toucher(A, '[data-evt="enregistrer"]');
      return att(A, (t) => !document.documentElement.classList.contains('feuille-ouverte') && /ajouté/.test(document.getElementById('mot').textContent) && document.getElementById('liste-reunions').textContent.includes(t), titre);
    };
    vrai('retour à l\'Agenda, demain', await versAgenda(A));
    vrai('« Créé côté Pro » : enregistré (« Événement ajouté à ton agenda »), il paraît dans l\'agenda Pro', await creerEvenement('Créé côté Pro QZK', '16:00', '16:30'));
    vrai('« À ranger » : de même', await creerEvenement('À ranger QZK', '16:30', '17:00'));
    v('la demande portait le côté (Pro) pour les deux, et le service les a rangés Pro', [postes.filter(x => x.u === 'agenda').map(x => x.c), (await agendaAna()).filter(e => /^(Créé côté Pro|À ranger) QZK$/.test(e.titre)).map(e => e.titre + ':' + e.cote).sort()], [['pro', 'pro'], ['Créé côté Pro QZK:pro', 'À ranger QZK:pro']]);
    /* la réunion : sa fiche (population : elle est ouverte) n'a aucun segment ; programmée côté Pro, elle naît Pro */
    await toucher(A, '#btn-reunion-nouvelle');
    vrai('(population) la fiche d\'une nouvelle réunion est ouverte : titre, début, fin, bouton Programmer', await att(A, () => !!document.getElementById('rf-titre') && !!document.getElementById('rf-debut') && !!document.getElementById('rf-fin') && !!document.querySelector('[data-reu="form-enregistrer"]')));
    v('⛔ …et elle n\'a AUCUN segment Perso|Pro (ni #rf-cote, ni choix de côté, ni sélecteur visible)', [await anciens(A), await segVisible(A)], [0, []]);
    await A.page.locator('#rf-titre').fill('Réunion Pro QZK');
    await A.page.locator('#rf-debut').fill(demain + 'T17:00'); await A.page.locator('#rf-fin').fill(demain + 'T18:00');
    await toucher(A, '[data-reu="form-enregistrer"]');
    vrai('programmée : elle paraît dans l\'agenda Pro', await att(A, () => /Réunion Pro QZK/.test(document.getElementById('liste-reunions').textContent)));
    v('la demande portait le côté (Pro), et le service l\'a rangée Pro pour Ana', [postes.filter(x => x.u === 'reunions').map(x => x.c), await (async () => { const l = ((await A0.get('/api/conversations')).j.conversations || []).find(c => c.type === 'reunion' && c.nom === 'Réunion Pro QZK'); return l ? [l.cote_choisi, l.cote] : null; })()], [['pro'], ['pro', 'pro']]);
    for (let i = 0; i < 3 && await A.page.evaluate(() => document.documentElement.classList.contains('feuille-ouverte')); i++) { await A.page.keyboard.press('Escape'); await A.page.waitForTimeout(300); }      // la fiche de la réunion programmée
    vrai('(population) les trois créés côté Pro et la revue client paraissent dans l\'agenda Pro', await montre(A, TOUT, ['Revue client QZK', 'Point équipe QZK', 'Créé côté Pro QZK', 'À ranger QZK', 'Réunion Pro QZK']), await vus(A, TOUT));
    await capture(A, 'ac-3-pro-crees');
    /* le menu d'un élément de l'agenda (clic droit / appui long / Maj+F10) : « Ranger dans Perso » */
    await A.page.locator('#liste-reunions [data-evenement]').filter({ hasText: 'À ranger QZK' }).first().click({ button: 'right' });
    vrai('son menu propose « Ranger dans Perso »', await att(A, () => !document.getElementById('menu-fond').hidden && Array.from(document.querySelectorAll('#menu-msg [data-ag-menu="cote"]')).map(x => x.textContent.trim() + '/' + x.dataset.cote).join('|') === 'Ranger dans Perso/perso'));
    await toucher(A, '#menu-msg [data-ag-menu="cote"]');
    vrai('la page DIT où il est parti (« Événement rangé dans l\'agenda Perso »)', await att(A, () => /Événement rangé dans l'agenda Perso/.test(document.getElementById('mot').textContent)));
    vrai('⛔ et il quitte l\'agenda Pro (population : « Créé côté Pro » y est toujours)', await montre(A, ['Créé côté Pro QZK', 'À ranger QZK'], ['Créé côté Pro QZK']), await vus(A, ['Créé côté Pro QZK', 'À ranger QZK']));
    v('le service : « À ranger » est Perso, « Créé côté Pro » reste Pro', (await agendaAna()).filter(e => /^(Créé côté Pro|À ranger) QZK$/.test(e.titre)).map(e => e.titre + ':' + e.cote).sort(), ['Créé côté Pro QZK:pro', 'À ranger QZK:perso']);

    /* ═══ 4. UNE RÉUNION RANGÉE DANS SA FICHE ═══ */
    console.log('\n4. Une réunion se range dans sa fiche — pour soi seul');
    await toucher(A, '#liste-reunions .reunion-ligne', 'Point équipe QZK');
    vrai('sa fiche, rubrique « Agenda » : « Ranger dans — Pro (auto) »', await att(A, () => { const r = document.querySelector('#info-corps [data-reu="cote"]'); return !!r && r.querySelector('.reglage-valeur').textContent.trim() === 'Pro (auto)'; }));
    await toucher(A, '#info-corps [data-reu="cote"]');
    vrai('son menu : Automatique (Pro) coché, Perso, Pro', await att(A, () => document.getElementById('deroule').matches(':popover-open') && Array.from(document.querySelectorAll('#deroule-liste .deroule-choix')).map(x => x.textContent.trim() + (x.getAttribute('aria-checked') === 'true' ? '✓' : '')).join('|') === 'Automatique (Pro)✓|Perso|Pro'));
    await capture(A, 'ac-4-ranger');
    await toucher(A, '#deroule-liste .deroule-choix[data-valeur="perso"]');
    vrai('« Perso » : la page le dit, la ligne dit Perso', await att(A, () => /Réunion rangée dans l'agenda Perso/.test(document.getElementById('mot').textContent) && (document.querySelector('#info-corps [data-reu="cote"] .reglage-valeur') || {}).textContent.trim() === 'Perso'));
    v('le service : rangée Perso pour Ana (son choix) ; ⛔ chez Ben, toujours Pro', [((await convDe(A0, r4.j.reunion.id)) || {}).cote_choisi, ((await convDe(B0, r4.j.reunion.id)) || {}).cote], ['perso', 'pro']);
    await A.page.keyboard.press('Escape');
    vrai('la fiche fermée, la réunion a quitté l\'agenda Pro (il reste la revue client et les deux créés côté Pro)', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte')) && await montre(A, TOUT, ['Revue client QZK', 'Créé côté Pro QZK', 'Réunion Pro QZK']), await vus(A, TOUT));

    /* ═══ 4 bis. CÔTÉ PRO : LES APPELS ET LES CONTACTS ═══ */
    console.log('\n4 bis. Côté Pro : les Appels et les Contacts');
    const nomsAppels = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('#liste-appels .appel-nom-ligne')).map(x => x.textContent.trim()));
    const nomsContacts = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('#vc-corps .contact-nom')).map(x => x.textContent.trim()));
    const cats = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('#vc-seg [data-cat]')).map(x => x.dataset.cat));
    await toucher(A, '#tabs a.tab[data-vue="appels"]');
    vrai('côté Pro, les Appels : l\'appel de Ben (collègue), PAS celui de Cléo', await att(A, () => { const n = Array.from(document.querySelectorAll('#liste-appels .appel-nom-ligne')).map(x => x.textContent.trim()); return n.length === 1 && /^Ben/.test(n[0]); }), await nomsAppels(A));
    await toucher(A, '#tabs a.tab[data-vue="contacts"]');
    const etatCats = (P) => P.page.evaluate(() => { const s = document.getElementById('vc-seg'); return s ? [(s.querySelector('[aria-pressed="true"]') || { dataset: {} }).dataset.cat || null].concat(Array.from(s.querySelectorAll('[data-cat]')).map(x => x.dataset.cat)) : null; });
    vrai('côté Pro, les Contacts s\'ouvrent sur « Entreprise », proposée avec Tous, Favoris, Groupes', await att(A, () => { const s = document.getElementById('vc-seg'); return !!s && (s.querySelector('[aria-pressed="true"]') || { dataset: {} }).dataset.cat === 'entreprise'; }), await etatCats(A));
    await toucher(A, '#vc-seg [data-cat="tous"]');
    vrai('« Tous » côté Pro : Ben, PAS Cléo', await att(A, () => { const n = Array.from(document.querySelectorAll('#vc-corps .contact-nom')).map(x => x.textContent.trim()); return n.some(x => /^Ben/.test(x)) && !n.some(x => /^Cléo/.test(x)); }), await nomsContacts(A));
    await capture(A, 'ac-4b-contacts-pro');
    vrai('retour à l\'Agenda, demain', await versAgenda(A));

    /* ═══ 5. CÔTÉ PERSO ═══ */
    console.log('\n5. Côté Perso (par le Profil) : ce qu\'on vient d\'y ranger — rien de ce qui est créé côté Pro —, et ce qu\'on y crée');
    vrai('(le geste complet) Perso, par le Profil', await basculerTel(A, 'perso'));
    vrai('retour à l\'Agenda, demain', await versAgenda(A));
    vrai('côté Perso : le dentiste, l\'événement d\'avant, le point d\'équipe (rangé), « À ranger » (rangé) et le dîner — ⛔ ni la revue client, ni les deux créés côté Pro', await montre(A, TOUT, ['Dentiste QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'À ranger QZK', 'Dîner QZK']), await vus(A, TOUT));
    postes.length = 0;
    vrai('« Créé côté Perso » : un événement créé d\'ici paraît dans l\'agenda Perso', await creerEvenement('Créé côté Perso QZK', '21:30', '22:00'));
    /* ⛔ côté Perso, l'Agenda propose « Rendez-vous » à la place de « Réunion » (13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous ») */
    v('⛔ côté Perso : « Rendez-vous » en haut de l\'Agenda, « Réunion » caché (population : il existe)', await A.page.evaluate(() => { const vu = (id) => { const x = document.getElementById(id); return !!x && !x.hidden && x.getClientRects().length > 0; };
      return [vu('btn-rdv-nouveau'), !!document.getElementById('btn-reunion-nouvelle'), vu('btn-reunion-nouvelle')]; }), [true, true, false]);
    await toucher(A, '#btn-rdv-nouveau');
    vrai('(population) la fiche d\'un nouveau rendez-vous est ouverte : titre, « Avec », début, fin, les rappels, bouton Enregistrer', await att(A, () => document.getElementById('feuille-titre').textContent === 'Nouveau rendez-vous' && !!document.getElementById('ev-titre') && !!document.getElementById('ev-avec') && !!document.getElementById('ev-debut') && !!document.getElementById('ev-rappels') && !!document.querySelector('[data-evt="enregistrer"]')));
    v('⛔ …et elle n\'a AUCUN segment Perso|Pro', [await anciens(A), await segVisible(A)], [0, []]);
    await A.page.locator('#ev-titre').fill('Anniversaire QZK'); await A.page.locator('#ev-avec').fill('Léa');
    await A.page.locator('#ev-debut').fill(demain + 'T20:00'); await A.page.locator('#ev-fin').fill(demain + 'T21:00');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré (« Rendez-vous ajouté à ton agenda ») : il paraît dans l\'agenda Perso, « Rendez-vous avec Léa »', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /Rendez-vous ajouté/.test(document.getElementById('mot').textContent) && Array.from(document.querySelectorAll('#liste-reunions [data-evenement]')).some(x => /Anniversaire QZK/.test(x.textContent) && /Rendez-vous avec Léa/.test(x.textContent))));
    v('la demande portait le côté (Perso) pour l\'événement et le rendez-vous, et le service les a rangés Perso pour Ana — le rendez-vous en est un', [postes.map(x => x.u + ':' + x.c), (await agendaAna()).filter(e => /^(Créé côté Perso|Anniversaire) QZK$/.test(e.titre)).map(e => e.titre + ':' + e.cote + ':' + e.genre).sort()],
      [['agenda:perso', 'agenda:perso'], ['Anniversaire QZK:perso:rdv', 'Créé côté Perso QZK:perso:evenement']]);
    await capture(A, 'ac-5-perso');
    vrai('l\'agenda Perso en entier : tout ce qui y est rangé ou créé, ⛔ rien de ce qui est Pro', await montre(A, TOUT, ['Dentiste QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'À ranger QZK', 'Dîner QZK', 'Anniversaire QZK', 'Créé côté Perso QZK']), await vus(A, TOUT));
    await toucher(A, '#tabs a.tab[data-vue="appels"]');
    vrai('côté Perso, les Appels : l\'appel de Cléo, PAS celui de Ben', await att(A, () => { const n = Array.from(document.querySelectorAll('#liste-appels .appel-nom-ligne')).map(x => x.textContent.trim()); return n.length === 1 && /^Cléo/.test(n[0]); }), await nomsAppels(A));
    await toucher(A, '#tabs a.tab[data-vue="contacts"]');
    vrai('côté Perso, les Contacts : « Tous », sans « Entreprise » (les collègues sont du côté Pro)', await att(A, () => { const s = document.getElementById('vc-seg'); return !!s && (s.querySelector('[aria-pressed="true"]') || { dataset: {} }).dataset.cat === 'tous' && !s.querySelector('[data-cat="entreprise"]'); }), await cats(A));
    vrai('« Tous » côté Perso : Cléo, PAS Ben', await att(A, () => { const n = Array.from(document.querySelectorAll('#vc-corps .contact-nom')).map(x => x.textContent.trim()); return n.some(x => /^Cléo/.test(x)) && !n.some(x => /^Ben/.test(x)); }), await nomsContacts(A));
    await A.page.locator('#vc-recherche').fill('Ben');
    vrai('une recherche cherche des deux côtés : « Ben » le trouve, même côté Perso', await att(A, () => Array.from(document.querySelectorAll('#vc-corps .contact-nom')).some(x => /^Ben/.test(x.textContent.trim()))), await nomsContacts(A));
    await A.page.locator('#vc-recherche').fill('');
    await capture(A, 'ac-5b-contacts-perso');

    /* ═══ 6. AU BUREAU ═══ */
    console.log('\n6. Au bureau : le sélecteur est dans la barre latérale, l\'Agenda le suit');
    const A2 = await ouvrirPage('ana', true);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(A2));
    v('pas de sélecteur sous le titre de l\'Agenda ni dans le Profil : celui de la barre latérale, côté Perso (le dernier choisi) — et c\'est le seul', [await segVisible(A2), await A2.page.evaluate(() => Array.from(document.querySelectorAll('.moi-pastille')).filter(x => x.getClientRects().length).length)], [['barre:perso'], 0]);
    vrai('côté Perso : le perso', await montre(A2, TOUT, ['Dentiste QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'À ranger QZK', 'Dîner QZK', 'Anniversaire QZK', 'Créé côté Perso QZK']), await vus(A2, TOUT));
    await toucher(A2, '.cote-seg-side [data-cote="pro"]');
    vrai('« Pro » dans la barre latérale : l\'Agenda ne montre plus que la revue client et les deux créés côté Pro', await montre(A2, TOUT, ['Revue client QZK', 'Créé côté Pro QZK', 'Réunion Pro QZK']), await vus(A2, TOUT));
    await capture(A2, 'ac-6-bureau-pro');

    /* ═══ 7. UN COMPTE SANS LES DEUX CÔTÉS ═══ */
    console.log('\n7. Cléo (aucun espace) : pas de sélecteur, tout son agenda');
    const C = await ouvrirPage('cleo', false);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(C));
    vrai('(population) le titre de l\'Agenda et la photo du profil sont à l\'écran', await C.page.evaluate(() => Array.from(document.querySelectorAll('#vue-reunions .grand-titre')).some(x => x.getClientRects().length) && Array.from(document.querySelectorAll('.moi-pastille')).some(x => x.getClientRects().length)));
    v('aucun sélecteur « Perso | Pro » visible', await segVisible(C), []);
    await toucher(C, '.moi-pastille');
    vrai('(population) le Profil de Cléo est ouvert, son nom écrit', await att(C, () => !document.getElementById('vue-reglages').hidden && /Cléo/.test(document.getElementById('reg-profil').textContent)));
    v('⛔ …sans carte « Perso et Pro » : la carte cachée et vide, aucun sélecteur', [await C.page.evaluate(() => { const c = document.getElementById('reg-cote'); return !!c && c.hidden && c.children.length === 0; }), await segVisible(C)], [true, []]);
    await toucher(C, '.profil-retour');
    vrai('retour à l\'Agenda', await att(C, () => document.getElementById('vue-reglages').hidden && !document.getElementById('vue-reunions').hidden));
    vrai('⛔ le dîner n\'est PAS dans son agenda : Ana l\'a nommée, mais sans Pro on n\'est pas invité en son nom — on entre par le lien (population : SA piscine, demain, y est)', await montre(C, T5.concat(['Piscine QZK']), ['Piscine QZK']), await vus(C, T5.concat(['Piscine QZK'])));

    console.log('\n8. Aucune erreur JavaScript');
    v('aucune erreur JavaScript, sur aucune page', pages.map(P => P.nom + ':' + P.erreurs.length + (P.erreurs.length ? ' ' + P.erreurs[0] : '')), pages.map(P => P.nom + ':0'));
  } catch (e) {
    vrai('la sonde est morte : ' + String(e && e.stack || e).split('\n').slice(0, 3).join(' '), false);
  } finally {
    for (const P of pages) await P.ctx.close().catch(() => {});
    try { if (S) S.fermer(); } catch (x) { /* déjà fermé */ }
    if (b) await b.close().catch(() => {});
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
