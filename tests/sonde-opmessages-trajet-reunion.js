/* ══ SONDE — LE TRAJET D'UNE RÉUNION DANS LA VRAIE PAGE SERVIE : CHACUN SON « PARTIR À … » ═══════════════════════════════════════════════════════════════════════════════════
   14 octobre 2026, le lot 2 du trajet : « et pareil pour pro, pour les réunions ». Joué contre le VRAI service, qui calcule chez un FAUX IGN (la boucle locale) ; le navigateur a une position
   (La Défense). Bob est invité, Alice organise :
     1. iPhone, Bob : la fiche de la réunion porte « Trajet » sous « Me rappeler » — je pars de (Ma position par défaut), voiture ou à pied, arriver en avance ;
     2. « Calculer » dit « Partir à HH:MM » pour la date de la réunion, et l'ENREGISTRE (pas de bouton « Enregistrer » dans une fiche de réunion) ; ⛔ la page n'a parlé qu'au service ;
     3. arriver 10 min avant : enregistré d'un geste, sans nouveau calcul ; « Plutôt : … » : vers l'autre adresse trouvée — le lieu de la réunion ne change pas ; à pied : recalculé ;
     4. la ligne de l'agenda dit « Partir à » ;
     5. ⛔ au bureau, de nuit, Alice : sa fiche n'a RIEN du trajet de Bob ; elle calcule le sien depuis Domicile (enregistré depuis la fiche) ;
     6. ⛔ Alice change le lieu : la fiche de Bob le dit (« Le lieu de la réunion a changé »), garde ses réglages, et se recalcule d'un geste ; « Retirer le trajet » ;
     7. l'heure de partir arrive : la bannière « Il est temps de partir » ;
     8. ⛔ une réunion en visio (un lien), une réunion refusée : pas de calcul — mais un trajet gardé d'avant le refus se RETIRE (« Il ne sert plus ») ;
     9. ⛔ un libellé piégé de l'IGN s'affiche en TEXTE.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.
   Lancer :   node tests/sonde-opmessages-trajet-reunion.js          CAPTURES=/dossier pour les images.
   Code 1 si UN contrôle tombe, 2 si elle ne peut pas tourner. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
const { fauxIgn } = require('./outils-trajet');
const { v, vrai: vrai0, fin } = T.compteur();
/* ⛔ un contrôle qui tombe dit CE QU'IL VOYAIT : le `vrai` du compteur ignore son troisième argument (l'état de la zone, les lignes de l'agenda) — sans lui, trois échecs n'ont rien dit de leur cause */
const vrai = (t, a, detail) => { vrai0(t, a); if (!a && detail !== undefined) console.log('      détail  : ' + (typeof detail === 'string' ? detail : JSON.stringify(detail)).slice(0, 900)); };
T.sauterSiSansDependances();

let pw; try { pw = require('playwright-core'); } catch (e) {
  for (const c of ['/opt/node22/lib/node_modules/playwright/node_modules/playwright-core', '/opt/node-tools/node_modules/playwright-core', 'playwright']) { try { pw = require(c); break; } catch (_) { /* suivant */ } }
  if (!pw) { console.error('Sonde non lançable : playwright-core est introuvable.'); process.exit(2); }
}
const CHROME = '/opt/pw-browsers/chromium';
const DOSSIER = process.env.CAPTURES || null;
const ARGS = ['--no-sandbox', '--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--enable-gpu-rasterization', '--ignore-gpu-blocklist', '--mute-audio'];
const MDP = { alice: 'pw-alice-trreu-1234', bob: 'pw-bob-trreu-12345' };
const IPHONE = { w: 393, h: 852, dpr: 2, mobile: true }, BUREAU = { w: 1440, h: 900, dpr: 1, mobile: false };
const PARIS = 'Europe/Paris';
const POS = { lon: 2.2384627, lat: 48.8920334 };                                       // La Défense : « ma position »

async function ouvrir(b, base, login, pf, o) {
  const opts = Object.assign({ nuit: false }, o || {});
  const ctx = await b.newContext({ viewport: { width: pf.w, height: pf.h }, deviceScaleFactor: pf.dpr, isMobile: pf.mobile, hasTouch: pf.mobile, colorScheme: opts.nuit ? 'dark' : 'light', reducedMotion: 'reduce',
    locale: 'fr-FR', timezoneId: PARIS, geolocation: { latitude: POS.lat, longitude: POS.lon, accuracy: 30 }, permissions: ['geolocation'] });
  const page = await ctx.newPage(); page.setDefaultTimeout(9000);
  const S = { ctx, page, pf, erreurs: [], requetes: [] };
  page.on('pageerror', e => S.erreurs.push(String(e && e.message || e).slice(0, 220)));
  page.on('request', r => S.requetes.push(r.url()));
  await page.goto(base + '/');
  await page.locator('#c-login').fill(login); await page.locator('#c-pass').fill(MDP[login]); await page.locator('#c-entrer').click();
  await page.waitForFunction(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }, null, { timeout: 12000 });
  return S;
}
/* ⛔ un prédicat qui JETTE (un élément absent pendant « Calcul du trajet… ») fait tomber l'attente AUSSITÔT, sans attendre : deux échecs de la sonde n'avaient pas d'autre cause — `|| ''` partout */
const attendre = (S, fn, arg, ms) => S.page.waitForFunction(fn, arg, { timeout: ms || 9000, polling: 50 }).then(() => true, () => false);
async function toucher(S, sel) { const l = S.page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (S.pf.mobile) await l.tap(); else await l.click(); }
async function capture(S, nom) { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await S.page.waitForTimeout(300); await S.page.screenshot({ path: path.join(DOSSIER, nom + '.png') }); }
const localParis = (t) => new Intl.DateTimeFormat('sv-SE', { timeZone: PARIS, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(t)).replace(' ', 'T');
const hmParis = (t) => localParis(t).slice(11, 16);
const demain = () => localParis(Date.now() + 86400000).slice(0, 10);
const instantParis = (local) => { const brut = Date.parse(local + ':00Z'); let t = brut; for (let i = 0; i < 2; i++) t += brut - Date.parse(localParis(t) + ':00Z'); return t; };
const arr = (x) => Math.round(x * 1e4) / 1e4;
const zone = (S) => S.page.evaluate(() => { const z = document.getElementById('reu-trajet-zone'); return z ? z.textContent.replace(/\s+/g, ' ').trim() : null; });
const resultat = (S) => S.page.evaluate(() => { const r = document.getElementById('rt-res'); return r ? r.textContent.replace(/\s+/g, ' ').trim() : ''; });
const ouvrirFiche = async (S, id) => { await S.page.evaluate(r => { location.hash = '#reunions/' + r; }, id); return attendre(S, () => !!document.querySelector('#info-corps .info-nom'), null, 12000); };
/* (15 octobre 2026, « plus simple ») la zone s'ouvre REPLIÉE tant qu'aucun trajet n'est rangé : un toucher sur « Calculer l'heure de départ » déplie le formulaire */
const ouvrirTrajet = async (S) => {
  if (!await attendre(S, () => !!document.querySelector('[data-reu="trajet-ouvrir"]') || !!document.getElementById('rt-depart'))) return false;
  if (await S.page.evaluate(() => !!document.querySelector('[data-reu="trajet-ouvrir"]'))) await toucher(S, '[data-reu="trajet-ouvrir"]');
  return attendre(S, () => !!document.getElementById('rt-depart'));
};

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true } });
  const ign = await fauxIgn();
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, horloge: true, config: { origines: ['http://127.0.0.1:' + port], reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: { delaiMs: 2000 } },
    env: { OPMSG_TEST_TRAJET: ign.url.replace('http://', '') } });                       // ⛔ le faux IGN par la porte de test (le fichier ne peut pas changer l'adresse de l'IGN)
  const C = (label) => ign.CARNET.find(c => c.label === label);
  const R4 = C('8 Rue de Rivoli 75004 Paris'), R1 = C('8 Rue de Rivoli 75001 Paris'), TE = C('Tour Eiffel 75007 Paris'), LI = C('12 Rue des Lilas 78000 Versailles');
  const minutesDe = (de, vers, mode) => Math.max(1, Math.ceil(ign.dureeMinutes({ lon: arr(de.lon), lat: arr(de.lat) }, { lon: arr(vers.lon), lat: arr(vers.lat) }, mode === 'pied' ? 'pedestrian' : 'car')));
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ARGS }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await ign.fermer(); await og.fermer(); process.exit(2); }
  try {
    const A0 = await T.connecter(svc, og, 'alice', MDP.alice), B0 = await T.connecter(svc, og, 'bob', MDP.bob);
    { const l = await A0.post('/api/contacts/lien', { max: 1 }); await B0.post('/api/liens/accepter', { code: l.j.code }); }
    const D0 = demain() + 'T14:00', debut0 = instantParis(D0);
    const prog = async (titre, lieu, debut, o) => {
      const r = await A0.post('/api/reunions', Object.assign({ titre, lieu, debut: localParis(debut), fin: localParis(debut + 3600000), tz: PARIS, invites: [B0.moi.id], rappels: [15], notifier: false }, o || {}));
      if (r.code !== 201) throw new Error(titre + ' : ' + r.code + ' ' + r.txt);
      return r.j.reunion.id;
    };
    const R = await prog('Revue QXT', '8 rue de Rivoli', debut0);
    const RV = await prog('Visio QXT', 'https://visio.exemple.fr/salle-qxt', debut0 + 3 * 3600000);
    const RR = await prog('Refusée QXT', 'Tour Eiffel', debut0 + 5 * 3600000);
    /* Bob avait calculé son trajet AVANT de refuser : il reste gardé — la fiche doit lui laisser le retirer (§ 8) */
    { const c = await B0.post('/api/trajet', { vers: 'Tour Eiffel', depuis: { type: 'position', lon: POS.lon, lat: POS.lat }, mode: 'voiture' });
      const p = c.code === 200 ? await B0.post('/api/reunions/' + RR + '/trajet', { trajet: { minutes: c.j.minutes, km: c.j.km, mode: 'voiture', avance: 5, depart: 'position', depart_label: 'Ma position', vers_label: c.j.vers.label }, lieu: 'Tour Eiffel' }) : c;
      if (p.code !== 200) throw new Error('le trajet de la réunion refusée : ' + c.code + ' ' + p.code + ' ' + p.txt); }
    await B0.post('/api/reunions/' + RR + '/reponse', { statut: 'decline' });
    const monTrajet = async (P, id) => (await P.get('/api/reunions/' + id)).j.moi.trajet;
    const B = await ouvrir(b, svc.base, 'bob', IPHONE);

    console.log('\n── 1. iPhone, Bob : la fiche de la réunion porte « Trajet » ──');
    vrai('la fiche s\'ouvre', await ouvrirFiche(B, R));
    vrai('la zone « Trajet » paraît (le service a dit qu\'il calcule), REPLIÉE', await attendre(B, () => !!document.querySelector('[data-reu="trajet-ouvrir"]')), await zone(B));
    const replie = await B.page.evaluate(() => { const z = document.getElementById('reu-trajet-zone'), bs = Array.from(z.querySelectorAll('button'));
      return [bs.map(x => x.textContent.trim()), !!z.querySelector('select, input'), bs.every(x => x.getBoundingClientRect().height >= 44), document.querySelector('[data-reu="trajet-ouvrir"]').getAttribute('aria-expanded')]; });
    v('   repliée : deux lignes, « Calculer l\'heure de départ » et « Y aller » — ni départ, ni mode, ni avance sous les yeux ; 44 px chacune', replie, [['Calculer l\'heure de départ', 'Y aller'], false, true, 'false']);
    await toucher(B, '[data-reu="trajet-ouvrir"]');
    vrai('un toucher la déplie : le formulaire paraît, le focus sur « Je pars de »', await attendre(B, () => !!document.getElementById('rt-depart') && document.activeElement === document.getElementById('rt-depart')), await zone(B));
    const init = await B.page.evaluate(() => ({ depart: document.getElementById('rt-depart').value, options: Array.from(document.getElementById('rt-depart').options).map(o => o.value + ':' + o.textContent),
      mode: Array.from(document.querySelectorAll('[data-reu="trajet-mode"]')).map(x => x.dataset.mode + (x.getAttribute('aria-pressed') === 'true' ? '✓' : '')), avance: document.getElementById('rt-avance').value,
      bouton: (document.querySelector('[data-reu="trajet-calculer"]') || {}).textContent, note: /ni gardée, ni montrée à personne/.test(document.getElementById('reu-trajet-zone').textContent),
      titre: /Trajet/.test(document.getElementById('reu-trajet-zone').textContent),
      apresRappels: document.getElementById('reu-rappels').compareDocumentPosition(document.getElementById('reu-trajet-zone')) === Node.DOCUMENT_POSITION_FOLLOWING }));
    v('« Je pars de » : Ma position par défaut, Domicile et Travail (à enregistrer), une autre adresse ; voiture ; arriver 5 min avant ; « Calculer l\'heure de départ »', [init.depart, init.options, init.mode, init.avance, init.bouton],
      ['position', ['position:Ma position', 'domicile:Domicile (à enregistrer)', 'travail:Travail (à enregistrer)', 'adresse:Une autre adresse'], ['voiture✓', 'pied'], '5', 'Calculer l\'heure de départ']);
    v('   la rubrique « Trajet », sous « Me rappeler » ; la position dite pour ce qu\'elle est', [init.titre, init.apresRappels, init.note], [true, true, true]);
    const tailles = await B.page.evaluate(() => Array.from(document.querySelectorAll('#reu-trajet-zone button, #reu-trajet-zone select')).filter(x => x.getClientRects().length).map(x => Math.round(x.getBoundingClientRect().height)));
    v('iPhone : chaque commande du trajet fait 44 px au moins (population : le départ, voiture, à pied, l\'avance, « Calculer », « Y aller »)', [tailles.length, tailles.every(h => h >= 44)], [6, true], tailles);

    console.log('\n── 2. « Calculer » : « Partir à », enregistré tout de suite ──');
    B.requetes.length = 0; let n = ign.etat.appels.length;
    await toucher(B, '[data-reu="trajet-calculer"]');
    const m1 = minutesDe(POS, R4, 'voiture');
    vrai('« Partir à » paraît, et « Trajet enregistré »', await attendre(B, () => /Partir à/.test((document.getElementById('rt-res') || {}).textContent || '') && /Trajet enregistré/.test(document.getElementById('mot').textContent)), await zone(B));
    const r1 = await resultat(B);
    v('   l\'heure de partir (14:00 − ' + m1 + ' min − 5 min d\'avance), la durée, d\'où, vers où, l\'autre adresse possible, « Toi seul le vois »', [
      r1.includes('Partir à ' + hmParis(debut0 - (m1 + 5) * 60000)), r1.includes(m1 + ' min en voiture'), r1.includes('— depuis Ma position'), r1.includes('Pour arriver à 13:55, 5 min avant la réunion.'),
      r1.includes('Vers ' + R4.label), r1.includes('Pas le bon endroit ? Plutôt :') && r1.includes(R1.label), r1.includes('Toi seul le vois')], [true, true, true, true, true, true, true], r1);
    vrai('   population : un vrai trajet (plus de dix minutes)', m1 > 10, m1);
    v('le service l\'a rangé, pour Bob', await monTrajet(B0, R), { minutes: m1, km: (await monTrajet(B0, R)).km, mode: 'voiture', avance: 5, depart: 'position', depart_label: 'Ma position', vers_label: R4.label });
    v('⛔ la PAGE n\'a parlé qu\'au service (aucun tiers) : un calcul, un enregistrement', [B.requetes.filter(u => !u.startsWith(svc.base) && !/^(data|blob):/.test(u)), B.requetes.filter(u => u.endsWith('/api/trajet')).length, B.requetes.filter(u => u.endsWith('/api/reunions/' + R + '/trajet')).length], [[], 1, 1]);
    const ap = ign.etat.appels.slice(n);
    v('⛔ chez l\'IGN : le lieu de la réunion tel qu\'écrit, puis la position ARRONDIE', [ap.map(x => x.chemin), ap[0] && ap[0].params.q, ap[1] && ap[1].params.start], [['/geocodage/search', '/navigation/itineraire'], '8 rue de Rivoli', arr(POS.lon) + ',' + arr(POS.lat)]);
    await capture(B, 'trajet-reunion-1-iphone');

    console.log('\n── 3. Arriver plus tôt, une autre adresse, à pied ──');
    n = ign.etat.appels.length;
    await B.page.locator('#rt-avance').selectOption('10');
    vrai('arriver 10 min avant : enregistré d\'un geste (« Heure de départ mise à jour »), l\'heure de partir recule', await attendre(B, (t) => ((document.getElementById('rt-res') || {}).textContent || '').includes('Partir à ' + t) && /Heure de départ mise à jour/.test(document.getElementById('mot').textContent), hmParis(debut0 - (m1 + 10) * 60000)), await resultat(B));
    v('   le service : l\'avance seule a changé — et rien n\'est reparti chez l\'IGN', [(await monTrajet(B0, R)).avance, (await monTrajet(B0, R)).minutes, ign.etat.appels.length - n], [10, m1, 0]);
    await toucher(B, '[data-reu="trajet-autre"]');
    const m2 = minutesDe(POS, R1, 'voiture');
    vrai('« Plutôt : ' + R1.label + ' » : recalculé vers elle, et enregistré', await attendre(B, (l) => ((document.getElementById('rt-res') || {}).textContent || '').includes('Vers ' + l), R1.label), await resultat(B));
    v('   le service : vers l\'autre adresse — et le lieu de la RÉUNION n\'a pas changé', [(await monTrajet(B0, R)).vers_label, (await monTrajet(B0, R)).minutes, (await A0.get('/api/reunions/' + R)).j.reunion.lieu], [R1.label, m2, '8 rue de Rivoli']);
    await toucher(B, '[data-reu="trajet-mode"][data-mode="pied"]');
    vrai('à pied : recalculé, enregistré', await attendre(B, () => / min à pied| h .*à pied| h à pied/.test((document.getElementById('rt-res') || {}).textContent || '') && document.querySelector('[data-reu="trajet-mode"][data-mode="pied"]').getAttribute('aria-pressed') === 'true'), await resultat(B));
    const tp = await monTrajet(B0, R);
    v('   le service : à pied, et vers où ? (il recalcule vers le lieu de la réunion)', [tp.mode, tp.avance, tp.minutes > m1], ['pied', 10, true]);

    console.log('\n── 4. La ligne de l\'agenda ──');
    /* une réunion se range côté Pro chez un invité (la règle), et l'agenda de l'iPhone s'ouvre côté Perso : Bob la range dans Perso — le geste de « Ranger dans » */
    { const conv = (await B0.get('/api/reunions/' + R)).j.reunion.conv, rg = await B0.post('/api/conversations/' + conv + '/prefs', { cote: 'perso' });
      vrai('Bob range la réunion côté Perso (« Ranger dans »)', rg.code === 200, rg.code + ' ' + rg.txt); }
    await B.page.evaluate(() => { location.hash = '#reunions'; });
    /* « Réunions du jour » : demain se choisit dans la semaine (ou la suivante, un dimanche) — le bouton du jour porte son minuit LOCAL */
    vrai('population : le jour de demain se choisit dans la semaine', await attendre(B, () => !!document.querySelector('#sem-jours [data-jour]')) && await B.page.evaluate(() => {
      const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() + 1);
      let j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]');
      if (!j) { document.getElementById('sem-suiv').click(); j = document.querySelector('#sem-jours [data-jour="' + (+d) + '"]'); }
      if (j) j.click(); return !!j; }));
    vrai('la ligne de la réunion dit « Partir à » (l\'heure de Bob à pied)', await attendre(B, (t) => Array.from(document.querySelectorAll('#liste-reunions [data-reunion]')).some(x => /Revue QXT/.test(x.textContent) && x.textContent.includes('Partir à ' + t)), hmParis(debut0 - (tp.minutes + 10) * 60000), 12000),
      await B.page.evaluate(() => Array.from(document.querySelectorAll('#liste-reunions [data-reunion]')).map(x => x.textContent.replace(/\s+/g, ' ')).join(' | ')));

    console.log('\n── 5. Au bureau, de nuit, Alice : rien du trajet de Bob ; le sien depuis Domicile ──');
    const A = await ouvrir(b, svc.base, 'alice', BUREAU, { nuit: true });
    vrai('sa fiche s\'ouvre, avec SA zone « Trajet »', await ouvrirFiche(A, R) && await ouvrirTrajet(A), await zone(A));
    const voitA = await A.page.evaluate(() => { const t = document.getElementById('info-corps').textContent; return [!!document.getElementById('rt-res'), /Partir à/.test(t), /à pied/.test(t), /75001/.test(t), /Ma position/.test(document.getElementById('rt-depart').value)]; });
    v('⛔ ni « Partir à », ni « à pied », ni l\'adresse vers laquelle Bob va : la fiche d\'Alice ne porte RIEN de son trajet', voitA.slice(0, 4), [false, false, false, false]);
    await A.page.locator('#rt-depart').selectOption('domicile');
    vrai('Domicile pas encore enregistré : son adresse se demande, et sera gardée', await attendre(A, () => !!document.getElementById('rt-adresse') && /gardée pour la prochaine fois/.test(document.getElementById('reu-trajet-zone').textContent)));
    await A.page.locator('#rt-adresse').click();
    await A.page.keyboard.type('12 rue des Lilas');
    /* ⛔ la fiche se REDESSINE pendant la frappe (un invité répond) : l'adresse tapée et le curseur ne partent pas avec l'ancienne fiche */
    const rep = await B0.post('/api/reunions/' + R + '/reponse', { statut: 'accepte' });
    vrai('pendant la frappe, Bob accepte : la fiche d\'Alice se redessine (« Accepté »)', rep.code === 200 && await attendre(A, () => /Bob Petit.*Accepté/.test(document.getElementById('info-corps').textContent.replace(/\s+/g, ' ')), null, 12000));
    v('⛔ l\'adresse tapée reste, et le curseur aussi', await A.page.evaluate(() => [document.getElementById('rt-adresse') && document.getElementById('rt-adresse').value, document.activeElement && document.activeElement.id]), ['12 rue des Lilas', 'rt-adresse']);
    await A.page.keyboard.type(', Versailles');
    await A.page.locator('#rt-adresse').press('Enter');
    vrai('Entrée : le domicile s\'enregistre, et « Partir à … — depuis Domicile »', await attendre(A, () => /depuis Domicile/.test((document.getElementById('rt-res') || {}).textContent || ''), null, 12000), await zone(A));
    v('   le service : le trajet d\'Alice depuis Domicile — et celui de Bob n\'a pas bougé', [(await monTrajet(A0, R)).depart, (await monTrajet(A0, R)).minutes, (await monTrajet(B0, R)).mode, (await monTrajet(B0, R)).depart], ['domicile', minutesDe(LI, R4, 'voiture'), 'pied', 'position']);
    await capture(A, 'trajet-reunion-2-bureau-nuit');

    console.log('\n── 6. Alice change le lieu : la fiche de Bob le dit, et se recalcule d\'un geste ──');
    vrai('population : la fiche de Bob est rouverte, son trajet à pied paraît', await ouvrirFiche(B, R) && await attendre(B, () => /à pied/.test((document.getElementById('rt-res') || {}).textContent || '')));
    const mod = await A0.post('/api/reunions/' + R + '/modifier', { lieu: 'Tour Eiffel', notifier: false });
    vrai('le lieu change (sans prévenir) : la fiche de Bob, ouverte, dit que son trajet est à refaire', mod.code === 200 && await attendre(B, () => /Le lieu de la réunion a changé depuis ton calcul/.test(document.getElementById('reu-trajet-zone').textContent) && !document.getElementById('rt-res'), null, 12000), await zone(B));
    v('   ses réglages restent (à pied, 10 min avant) — rien n\'est à rechoisir', await B.page.evaluate(() => [document.querySelector('[data-reu="trajet-mode"][data-mode="pied"]').getAttribute('aria-pressed'), document.getElementById('rt-avance').value, document.getElementById('rt-depart').value]), ['true', '10', 'position']);
    vrai('   et la bannière le lui a dit (« Le lieu a changé : votre trajet est à recalculer »)', await attendre(B, () => /votre trajet est à recalculer/.test(document.getElementById('notif').textContent) || /votre trajet est à recalculer/.test(document.body.textContent), null, 8000));
    await toucher(B, '[data-reu="trajet-calculer"]');
    vrai('« Calculer » : vers le NOUVEAU lieu, à pied, enregistré', await attendre(B, (l) => ((document.getElementById('rt-res') || {}).textContent || '').includes('Vers ' + l) && /à pied/.test(document.getElementById('rt-res').textContent), TE.label, 12000), await zone(B));
    v('   le service', [(await monTrajet(B0, R)).vers_label, (await monTrajet(B0, R)).mode, (await monTrajet(B0, R)).minutes], [TE.label, 'pied', minutesDe(POS, TE, 'pied')]);
    await toucher(B, '[data-reu="trajet-retirer"]');
    vrai('« Retirer le trajet » : « Trajet retiré », plus de « Partir à »', await attendre(B, () => /Trajet retiré/.test(document.getElementById('mot').textContent) && !document.getElementById('rt-res')));
    /* (15 octobre 2026) déplié, il le reste : « Retirer le trajet » ne replie pas le formulaire sous le doigt (son état se refaisait sans `ouvert`), et le focus ne tombe pas sur la page */
    v('   ⛔ le formulaire reste DÉPLIÉ (le départ, « Calculer », pas de ligne « Calculer l\'heure de départ » repliée)', await B.page.evaluate(() => [!!document.getElementById('rt-depart'), !!document.querySelector('[data-reu="trajet-calculer"]'), !document.querySelector('[data-reu="trajet-ouvrir"]')]), [true, true, true], await zone(B));
    vrai('   ⛔ le bouton touché a disparu : le focus va à « Calculer », pas à la page', await attendre(B, () => !!document.activeElement && document.activeElement.dataset.reu === 'trajet-calculer', null, 4000),
      await B.page.evaluate(() => document.activeElement ? document.activeElement.tagName + '#' + document.activeElement.id + '[' + (document.activeElement.dataset.reu || '') + ']' : '-'));
    v('   le service : plus de trajet pour Bob (celui d\'Alice reste — il mène à l\'ancien lieu, dit périmé)', [await monTrajet(B0, R), (await A0.get('/api/reunions/' + R)).j.moi.trajet_perime && (await A0.get('/api/reunions/' + R)).j.moi.trajet_perime.depart], [null, 'domicile']);

    console.log('\n── 7. L\'heure de partir arrive : « Il est temps de partir » ──');
    const debut7 = Math.ceil((Date.now() + 60 * 60000) / 60000) * 60000;
    const R7 = await prog('Départ QXT', 'Tour Eiffel', debut7, { rappels: [] });
    vrai('population : la fiche de la réunion qui commence dans une heure', await ouvrirFiche(B, R7) && await ouvrirTrajet(B));
    await toucher(B, '[data-reu="trajet-mode"][data-mode="voiture"]');
    await toucher(B, '[data-reu="trajet-calculer"]');
    vrai('   calculé et enregistré', await attendre(B, () => /Partir à/.test((document.getElementById('rt-res') || {}).textContent || '') && /Trajet enregistré/.test(document.getElementById('mot').textContent), null, 12000), await zone(B));
    const tr7 = await monTrajet(B0, R7);
    svc.avancer((60 - tr7.minutes - tr7.avance + 1) * 60000);
    vrai('le service avance jusqu\'à l\'heure de partir : la bannière arrive (« Il est temps de partir · ' + tr7.minutes + ' min en voiture, arrivée HH:MM »)',
      await attendre(B, (t) => { const x = document.getElementById('notif'); return x.classList.contains('on') && /Départ QXT/.test(x.textContent) && x.textContent.includes(t); }, 'Il est temps de partir · ' + tr7.minutes + ' min en voiture, arrivée ' + hmParis(debut7 - tr7.avance * 60000), 12000),
      await B.page.evaluate(() => document.getElementById('notif').textContent));
    await capture(B, 'trajet-reunion-3-banniere');

    console.log('\n── 8. Une réunion en visio, une réunion refusée : pas de « Trajet » ──');
    vrai('population : la fiche de la visio s\'ouvre (son lieu est un lien)', await ouvrirFiche(B, RV) && await attendre(B, () => /visio\.exemple\.fr/.test(document.getElementById('info-corps').textContent)));
    await B.page.waitForTimeout(600);
    v('⛔ une visio n\'a pas de trajet', await B.page.evaluate(() => [!!document.getElementById('rt-depart'), (document.getElementById('reu-trajet-zone') || {}).textContent || '']), [false, '']);
    vrai('population : la fiche de la réunion refusée s\'ouvre', await ouvrirFiche(B, RR) && await attendre(B, () => /Refusée QXT/.test(document.getElementById('info-corps').textContent)));
    await B.page.waitForTimeout(600);
    v('⛔ refusée : pas de calcul (Bob n\'y va pas)', await B.page.evaluate(() => !!document.getElementById('rt-depart')), false);
    v('   ⛔ mais le trajet calculé AVANT le refus reste retirable : « Il ne sert plus », « Retirer le trajet » — et rien d\'autre (ni heure, ni calcul)', await B.page.evaluate(() => {
      const z = document.getElementById('reu-trajet-zone'); return [/Il ne sert plus/.test(z.textContent), Array.from(z.querySelectorAll('button, select, input')).map(b => b.textContent), /Partir à/.test(z.textContent)]; }), [true, ['Retirer le trajet'], false]);
    await toucher(B, '[data-reu="trajet-retirer"]');
    vrai('« Retirer le trajet » : « Trajet retiré », et la zone s\'efface', await attendre(B, () => /Trajet retiré/.test(document.getElementById('mot').textContent) && !(document.getElementById('reu-trajet-zone') || {}).textContent));
    v('   le service : plus de trajet pour la réunion refusée', (await B0.get('/api/reunions/' + RR)).j.moi.trajet, null);

    console.log('\n── 9. Un libellé piégé de l\'IGN s\'affiche en TEXTE ──');
    const RB = await prog('Atelier QXT', 'Atelier balise', debut0 + 7 * 3600000);
    vrai('population : la fiche', await ouvrirFiche(B, RB) && await ouvrirTrajet(B));
    await toucher(B, '[data-reu="trajet-calculer"]');
    vrai('« Partir à » paraît', await attendre(B, () => /Partir à/.test((document.getElementById('rt-res') || {}).textContent || ''), null, 12000), await zone(B));
    v('⛔ le balisage s\'affiche en TEXTE (« Vers Rue <img …> & Fils », « Plutôt : Impasse <b …>gras</b> ») : aucune image, aucun gras, rien d\'exécuté', await B.page.evaluate(() => {
      const z = document.getElementById('reu-trajet-zone'), t = z.textContent;
      return [t.includes('Vers Rue <img src=x onerror="window.__xss=1"> & Fils 75011 Paris'), t.includes('Impasse <b id="injecte">gras</b> 75011 Paris'), !!z.querySelector('img, b#injecte'), !!document.getElementById('injecte'), window.__xss === 1];
    }), [true, true, false, false, false]);
    v('⛔ aucune page n\'a parlé à un tiers', [B, A].map(S => S.requetes.filter(u => !u.startsWith(svc.base) && !/^(data|blob):/.test(u))), [[], []]);
    v('aucune erreur JavaScript', [B.erreurs, A.erreurs], [[], []]);
  } finally { await b.close(); await svc.arreter(); await ign.fermer(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
