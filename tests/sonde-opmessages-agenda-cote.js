/* ══ SONDE — L'AGENDA PERSO ET L'AGENDA PRO, DANS LA VRAIE PAGE SERVIE (formule de PRODUCTION : seul un compte pro a deux côtés) ═══════════════════════════════════════
   8 octobre 2026 : « il faudrait bien séparer l'agenda perso et pro ». Contre le VRAI service, Ana (un espace abonné : Ben est son collègue ; Cléo, une amie) a demain cinq
   choses — deux événements rangés (Dentiste : Perso, Revue client : Pro), un d'avant sans côté (Perso), une réunion avec Ben (Pro par la règle), un dîner avec Cléo (Perso) :
     1. téléphone, côté Perso : l'Agenda a son sélecteur « Perso | Pro » sous son titre, et ne montre QUE le perso (trois sur cinq) ;
     2. « Pro » dans l'Agenda : QUE le pro (deux sur cinq) — c'est le côté du compte, « OP MESSAGES PRO » ; le tableau de bord : la réunion et le rappel Pro, jamais le Perso ;
     3. un événement créé côté Pro naît Pro (la fiche le propose, le service le garde) ; le ranger Perso dans sa fiche le fait quitter l'agenda Pro, et la page le DIT ;
     4. une réunion se range dans SA fiche (« Ranger dans ») : Perso pour Ana seule — Ben la garde Pro ; elle quitte l'agenda Pro ;
     5. côté Perso, l'Agenda montre ce qu'on vient d'y ranger ; une réunion programmée côté Perso naît Perso (le formulaire le propose) ;
     6. au bureau : pas de sélecteur sous le titre de l'Agenda (il est en haut de la barre latérale), et l'Agenda suit le côté choisi là ;
     7. Cléo (aucun espace, formule Perso) n'a pas de sélecteur, et voit tout son agenda ;
     8. aucune erreur JavaScript.
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
      if (!(await P.page.evaluate((x) => !!document.querySelector('#sem-jours [data-jour="' + x + '"]'), t))) { await toucher(P, '#sem-suiv'); await att(P, (x) => !!document.querySelector('#sem-jours [data-jour="' + x + '"]'), t); }
      await toucher(P, '#sem-jours [data-jour="' + t + '"]');
      return att(P, (x) => { const j = document.querySelector('#sem-jours [data-jour="' + x + '"]'); return !!j && j.getAttribute('aria-pressed') === 'true' && document.getElementById('liste-reunions').getAttribute('aria-busy') === 'false'; }, t);
    };
    /* ce que montre la journée : lesquels des titres attendus y sont (dans l'ordre donné) */
    const vus = (P, titres) => P.page.evaluate((L) => { const t = document.getElementById('liste-reunions').textContent; return L.filter(x => t.includes(x)); }, titres);
    const montre = (P, titres, attendu) => att(P, ([L, A]) => { const t = document.getElementById('liste-reunions').textContent; return JSON.stringify(L.filter(x => t.includes(x))) === JSON.stringify(A); }, [titres, attendu]);
    const segVisible = (P) => P.page.evaluate(() => Array.from(document.querySelectorAll('[data-cote-seg]')).filter(x => x.getClientRects().length).map(x => (x.classList.contains('cote-seg-side') ? 'barre' : x.classList.contains('cote-seg-agenda') ? 'agenda' : 'liste') + ':' + ((x.querySelector('[aria-pressed="true"]') || {}).dataset || {}).cote));
    const agendaAna = async () => ((await A0.get('/api/agenda?du=' + (Date.now() - JOUR) + '&au=' + (Date.now() + 3 * JOUR))).j.evenements || []);
    const convDe = async (X, rid) => ((await X.get('/api/conversations')).j.conversations || []).find(c => c.reunion === rid);

    /* ═══ 1. TÉLÉPHONE, CÔTÉ PERSO ═══ */
    console.log('\n1. Téléphone, côté Perso : l\'Agenda ne montre que le perso');
    const A = await ouvrirPage('ana', false);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(A));
    v('son sélecteur « Perso | Pro » est SOUS SON TITRE (le seul visible), côté Perso', await segVisible(A), ['agenda:perso']);
    vrai('demain : Dentiste, l\'événement d\'avant (sans côté : Perso) et le dîner — ni la revue client, ni le point d\'équipe', await montre(A, T5, PERSO3), await vus(A, T5));
    await capture(A, 'ac-1-perso');

    /* ═══ 2. « PRO » DANS L'AGENDA ═══ */
    console.log('\n2. « Pro » dans l\'Agenda');
    await toucher(A, '.cote-seg-agenda [data-cote="pro"]');
    vrai('côté Pro : la revue client et le point d\'équipe, rien d\'autre', await montre(A, T5, PRO2), await vus(A, T5));
    v('c\'est le côté du COMPTE : « OP MESSAGES PRO », le sélecteur sur Pro', [await A.page.evaluate(() => document.documentElement.dataset.cote), await segVisible(A)], ['pro', ['agenda:pro']]);
    vrai('le service a retenu le côté (Pro)', await (async () => { for (let i = 0; i < 40; i++) { if ((await A0.get('/api/moi')).j.moi.prefs.mode === 'pro') return true; await new Promise(r => setTimeout(r, 100)); } return false; })());
    await capture(A, 'ac-2-pro');
    await toucher(A, '#tabs a.tab[data-vue="accueil"]');
    vrai('le tableau de bord (côté Pro) : le point d\'équipe dans les réunions, la revue client dans les rappels', await att(A, () => /Point équipe QZK/.test(document.getElementById('bord-reunions').textContent) && /Revue client QZK/.test(document.getElementById('bord-rappels').textContent)));
    v('⛔ …et rien du côté Perso : ni le dîner, ni le dentiste, ni l\'événement d\'avant (tous ont un rappel, tous sont demain)', await A.page.evaluate(() => { const t = document.getElementById('bord-reunions').textContent + document.getElementById('bord-rappels').textContent; return ['Dîner QZK', 'Dentiste QZK', 'Ancien rappel QZK'].filter(x => t.includes(x)); }), []);
    await capture(A, 'ac-2b-bord');

    /* ═══ 3. UN ÉVÉNEMENT CRÉÉ CÔTÉ PRO, PUIS RANGÉ PERSO ═══ */
    console.log('\n3. Un événement créé côté Pro naît Pro ; rangé Perso, il quitte l\'agenda Pro');
    vrai('retour à l\'Agenda, demain', await versAgenda(A));
    await toucher(A, '#btn-evenement-nouveau');
    vrai('le formulaire propose l\'agenda où il ira : Pro (le côté où l\'on est)', await att(A, () => { const s = document.getElementById('ev-cote'); return !!s && (s.querySelector('[aria-pressed="true"]') || {}).dataset.choixCote === 'pro' && s.querySelectorAll('[data-choix-cote]').length === 2; }));
    await A.page.locator('#ev-titre').fill('Créé côté Pro QZK');
    await A.page.locator('#ev-debut').fill(demain + 'T16:00'); await A.page.locator('#ev-fin').fill(demain + 'T16:30');
    await capture(A, 'ac-3-formulaire');
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré : « Événement ajouté à ton agenda », et il paraît dans l\'agenda Pro', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /ajouté/.test(document.getElementById('mot').textContent) && /Créé côté Pro QZK/.test(document.getElementById('liste-reunions').textContent)));
    v('le service l\'a rangé Pro', (await agendaAna()).filter(e => e.titre === 'Créé côté Pro QZK').map(e => e.cote), ['pro']);
    await toucher(A, '#liste-reunions [data-evenement]', 'Créé côté Pro QZK');
    vrai('sa fiche dit Pro', await att(A, () => { const s = document.getElementById('ev-cote'); return !!s && document.getElementById('ev-titre').value === 'Créé côté Pro QZK' && (s.querySelector('[aria-pressed="true"]') || {}).dataset.choixCote === 'pro'; }));
    await toucher(A, '#ev-cote [data-choix-cote="perso"]');
    v('toucher « Perso » le choisit (un seul pressé)', await A.page.evaluate(() => Array.from(document.querySelectorAll('#ev-cote [data-choix-cote]')).map(x => x.dataset.choixCote + ':' + x.getAttribute('aria-pressed'))), ['perso:true', 'pro:false']);
    await toucher(A, '[data-evt="enregistrer"]');
    vrai('enregistré : la page DIT où il est parti (« Événement rangé dans l\'agenda Perso »)', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte') && /rangé dans l'agenda Perso/.test(document.getElementById('mot').textContent)));
    vrai('⛔ et il quitte l\'agenda Pro (population : la revue client y est toujours)', await montre(A, ['Revue client QZK', 'Créé côté Pro QZK'], ['Revue client QZK']), await vus(A, ['Revue client QZK', 'Créé côté Pro QZK']));
    v('le service l\'a rangé Perso', (await agendaAna()).filter(e => e.titre === 'Créé côté Pro QZK').map(e => e.cote), ['perso']);

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
    vrai('la fiche fermée, la réunion a quitté l\'agenda Pro (il reste la revue client)', await att(A, () => !document.documentElement.classList.contains('feuille-ouverte')) && await montre(A, T5, ['Revue client QZK']), await vus(A, T5));

    /* ═══ 5. CÔTÉ PERSO ═══ */
    console.log('\n5. Côté Perso : ce qu\'on vient d\'y ranger, et une réunion programmée d\'ici');
    await toucher(A, '.cote-seg-agenda [data-cote="perso"]');
    vrai('côté Perso : le dentiste, l\'événement d\'avant, le point d\'équipe (rangé), le dîner — et l\'événement rangé Perso', await montre(A, T5.concat(['Créé côté Pro QZK']), ['Dentiste QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'Dîner QZK', 'Créé côté Pro QZK']), await vus(A, T5.concat(['Créé côté Pro QZK'])));
    await toucher(A, '#btn-reunion-nouvelle');
    vrai('le formulaire d\'une réunion propose l\'agenda : Perso (le côté où l\'on est)', await att(A, () => { const s = document.getElementById('rf-cote'); return !!s && !!document.getElementById('rf-titre') && (s.querySelector('[aria-pressed="true"]') || {}).dataset.choixCote === 'perso'; }));
    await A.page.locator('#rf-titre').fill('Anniversaire QZK');
    await A.page.locator('#rf-debut').fill(demain + 'T20:00'); await A.page.locator('#rf-fin').fill(demain + 'T21:00');
    const postes = [];
    A.page.on('request', q => { if (q.method() === 'POST' && /\/api\/reunions$/.test(q.url())) postes.push(q.postData()); });
    await toucher(A, '[data-reu="form-enregistrer"]');
    vrai('programmée : elle paraît dans l\'agenda Perso', await att(A, () => /Anniversaire QZK/.test(document.getElementById('liste-reunions').textContent)));
    v('la demande portait le côté (Perso), et le service l\'a rangée Perso pour Ana', [postes.map(p => { try { return JSON.parse(p).cote; } catch (e) { return '?'; } }), await (async () => { const l = ((await A0.get('/api/conversations')).j.conversations || []).find(c => c.type === 'reunion' && c.nom === 'Anniversaire QZK'); return l ? [l.cote_choisi, l.cote] : null; })()],
      [['perso'], ['perso', 'perso']]);
    await capture(A, 'ac-5-perso');

    /* ═══ 6. AU BUREAU ═══ */
    console.log('\n6. Au bureau : le sélecteur est dans la barre latérale, l\'Agenda le suit');
    const A2 = await ouvrirPage('ana', true);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(A2));
    v('pas de sélecteur sous le titre de l\'Agenda : celui de la barre latérale, côté Perso (le dernier choisi)', await segVisible(A2), ['barre:perso']);
    vrai('côté Perso : le perso', await montre(A2, T5, ['Dentiste QZK', 'Ancien rappel QZK', 'Point équipe QZK', 'Dîner QZK']), await vus(A2, T5));
    await toucher(A2, '.cote-seg-side [data-cote="pro"]');
    vrai('« Pro » dans la barre latérale : l\'Agenda ne montre plus que la revue client', await montre(A2, T5, ['Revue client QZK']), await vus(A2, T5));
    await capture(A2, 'ac-6-bureau-pro');

    /* ═══ 7. UN COMPTE SANS LES DEUX CÔTÉS ═══ */
    console.log('\n7. Cléo (aucun espace) : pas de sélecteur, tout son agenda');
    const C = await ouvrirPage('cleo', false);
    vrai('l\'Agenda s\'ouvre sur demain', await versAgenda(C));
    v('aucun sélecteur « Perso | Pro » visible', await segVisible(C), []);
    vrai('le dîner où Ana l\'invite est dans son agenda (population : tout son agenda)', await montre(C, T5, ['Dîner QZK']), await vus(C, T5));

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
