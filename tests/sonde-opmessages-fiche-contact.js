/* ══ SONDE — LA FICHE D'UN CONTACT DIT CE QU'ON A EN COMMUN (réunions, groupes), DANS LA VRAIE PAGE SERVIE ═════════════════════════════════════════════════════════════
   7 octobre 2026 : « au niveau des contacts, pour le pro, on peut voir leur tableau de réunion — s'ils participent à la même réunion — quand on clique sur le contact ». Contre le VRAI service :
   Alice, Bruno et Chloé ; deux réunions à venir avec Bruno (l'une organisée par Alice, l'autre par Bruno, avec Chloé aussi), une réunion d'Alice avec Chloé SEULE, une réunion de Bruno avec
   Chloé SANS Alice, une réunion avec Bruno dans quatre mois (hors des deux mois de la fiche), et un groupe à trois. On joue :
     1. au bureau (1440, souris) : toucher Bruno CHOISIT la personne, la fiche paraît à droite — ses deux réunions, dans l'ordre, sa réponse (« Bruno organise »), le groupe ;
        ⛔ rien dont Alice ne fait pas partie (la réunion Bruno–Chloé), ni la réunion d'Alice avec Chloé seule, ni celle de quatre mois ;
     2. « Programmer une réunion avec Bruno » ouvre le formulaire avec Bruno DÉJÀ invité ; « Message » ouvre la conversation ;
     3. au téléphone (393, au doigt) : toucher Bruno ouvre la FEUILLE de sa fiche, avec les mêmes réunions ; toucher une réunion ouvre sa fiche ; le retour revient à la fiche de Bruno ;
     4. la route elle-même : un inconnu, soi-même et un identifiant mal formé reçoivent 404, comme une personne qui n'existe pas.
   ⛔ ON ATTEND AU GESTE ; ⛔ CHAQUE ABSENCE EST PRÉCÉDÉE DE SA POPULATION.   Lancer :   node tests/sonde-opmessages-fiche-contact.js     CAPTURES=/dossier pour les images.
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
const MOTS = { alice: 'pw-alice-1234', bruno: 'pw-bruno-1234', chloe: 'pw-chloe-1234', dora: 'pw-dora-12345' };
const NOMS = { alice: 'Alice Martin', bruno: 'Bruno Petit', chloe: 'Chloé Garnier', dora: 'Dora Inconnue' };
const PARIS = 'Europe/Paris', H = 3600000, J = 24 * H;
function localDans(t, tz) {
  const p = {};
  for (const x of new Intl.DateTimeFormat('en-CA', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).formatToParts(t)) p[x.type] = x.value;
  return p.year + '-' + p.month + '-' + p.day + 'T' + p.hour + ':' + p.minute;
}

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(MOTS).map(l => [l, { pass: MOTS[l], nom: NOMS[l], actif: true }])));
  const port = await T.portLibre();
  const svc = await T.lancerService({ port, urlGestion: og.url, config: { origines: ['http://127.0.0.1:' + port] } });
  let b = null;
  try { b = await pw.chromium.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] }); }
  catch (e) { console.error('Sonde non lançable : ' + e.message.split('\n')[0]); await svc.arreter(); await og.fermer(); process.exit(2); }
  try {
    const C = {};
    for (const l of Object.keys(MOTS)) C[l] = await T.connecter(svc, og, l, MOTS[l]);
    const A = C.alice;
    for (const l of ['bruno', 'chloe']) { const k = await A.post('/api/contacts/lien', {}); await C[l].post('/api/liens/accepter', { code: k.j.code }); }
    { const k = await C.bruno.post('/api/contacts/lien', {}); await C.chloe.post('/api/liens/accepter', { code: k.j.code }); }
    await A.post('/api/conversations/groupe', { nom: 'Chantier Lyon', membres: [C.bruno.moi.id, C.chloe.moi.id] });
    const t0 = Math.ceil((Date.now() + J) / H) * H;
    const prog = async (qui, titre, debut, invites) => { const r = await C[qui].post('/api/reunions', { titre, debut: localDans(debut, PARIS), fin: localDans(debut + H, PARIS), tz: PARIS, invites, notifier: false }); if (!r.j || !r.j.reunion) throw new Error('réunion non créée (' + qui + ', ' + titre + ') : ' + JSON.stringify(r.j)); return r.j.reunion.id; };
    await prog('alice', 'Point chantier', t0, [C.bruno.moi.id]);
    await prog('bruno', 'Visite client', t0 + 2 * J, [A.moi.id, C.chloe.moi.id]);
    await prog('alice', 'Réservé Chloé', t0 + J, [C.chloe.moi.id]);
    await prog('bruno', 'Secret Bruno-Chloé', t0 + 3 * J, [C.chloe.moi.id]);
    await prog('alice', 'Bilan lointain', t0 + 120 * J, [C.bruno.moi.id]);

    console.log('\n4. La route elle-même');
    const r = await A.get('/api/personnes/' + C.bruno.moi.id + '/commun');
    v('population : Alice et Bruno ont DEUX réunions à venir en commun (la prochaine d\'abord) et un groupe', [r.code, (r.j.reunions || []).map(x => x.titre), (r.j.groupes || []).map(g => g.nom)], [200, ['Point chantier', 'Visite client'], ['Chantier Lyon']]);
    v('⛔ ni la réunion Bruno–Chloé (Alice n\'y est pas), ni celle d\'Alice avec Chloé seule, ni celle de quatre mois', (r.j.reunions || []).map(x => x.titre).filter(t => /Secret|Réservé|lointain/.test(t)), []);
    v('la réponse de Bruno est dite (il organise « Visite client », « attente » pour « Point chantier »)', (r.j.reunions || []).map(x => x.son_statut), ['attente', 'accepte']);
    v('Dora (qu\'Alice ne voit pas), soi-même, un identifiant mal formé : 404', [(await A.get('/api/personnes/' + C.dora.moi.id + '/commun')).code, (await A.get('/api/personnes/' + A.moi.id + '/commun')).code, (await A.get('/api/personnes/x/commun')).code], [404, 404, 404]);

    for (const [nom, vp, mob] of [['bureau', { width: 1440, height: 900 }, false], ['téléphone', { width: 393, height: 852 }, true]]) {
      console.log('\n── ' + nom);
      const ctx = await b.newContext({ viewport: vp, isMobile: mob, hasTouch: mob, reducedMotion: 'reduce', locale: 'fr-FR', timezoneId: PARIS });
      const page = await ctx.newPage(); page.setDefaultTimeout(12000);
      const erreurs = []; page.on('pageerror', e => erreurs.push(String(e && e.message || e).slice(0, 220)));
      const attendre = (fn, arg, ms) => page.waitForFunction(fn, arg, { timeout: ms || 12000, polling: 50 }).then(() => true, () => false);
      const toucher = async sel => { const l = page.locator(sel).filter({ visible: true }).first(); await l.scrollIntoViewIfNeeded().catch(() => {}); if (mob) await l.tap(); else await l.click(); };
      const capture = async n => { if (!DOSSIER) return; fs.mkdirSync(DOSSIER, { recursive: true }); await page.screenshot({ path: path.join(DOSSIER, n + '.png') }); };
      await page.goto(svc.base + '/');
      await page.fill('#c-login', 'alice'); await page.fill('#c-pass', MOTS.alice); await toucher('#c-entrer');
      vrai('population : Alice est connectée', await attendre(() => { const a = document.getElementById('app'); return a && !a.hidden && document.getElementById('moi-nom').textContent.trim().length > 0; }));
      await page.evaluate(() => { location.hash = '#contacts'; });
      vrai('population : Bruno est dans ses contacts', await attendre(() => Array.from(document.querySelectorAll('#vc-corps [data-act="vc-ecrire"]')).some(x => /Bruno Petit/.test(x.textContent))));
      const uidB = C.bruno.moi.id;
      await toucher('#vc-corps [data-act="vc-ecrire"][data-uid="' + uidB + '"]');
      const zone = mob ? '#info-corps' : '#vc-fiche';
      if (mob) vrai('1. toucher Bruno ouvre la FEUILLE de sa fiche (« Contact »), pas la conversation', await attendre(() => document.getElementById('feuille').dataset.mode === 'personne' && /Bruno Petit/.test(document.getElementById('info-corps').textContent) && !document.documentElement.dataset.conv));
      else vrai('1. toucher Bruno le CHOISIT : sa fiche paraît à droite, la ligne est marquée', await attendre(x => /Bruno Petit/.test((document.querySelector('#vc-fiche .vc-fiche-nom') || {}).textContent || '') && document.querySelector('#vc-corps [data-uid="' + x + '"][aria-current="true"]'), uidB));
      vrai('les réunions en commun paraissent (après le squelette)', await attendre(z => document.querySelectorAll(z + ' [data-fiche="reunion"]').length > 0, zone));
      v('…les deux réunions d\'Alice et Bruno, la prochaine d\'abord', await page.evaluate(z => Array.from(document.querySelectorAll(z + ' [data-fiche="reunion"] .fc-titre')).map(e => e.textContent), zone), ['Point chantier', 'Visite client']);
      v('…avec la réponse de Bruno', await page.evaluate(z => Array.from(document.querySelectorAll(z + ' [data-fiche="reunion"] .fc-sous')).map(e => e.textContent.split('\n').pop().replace(/^.*\d\d:\d\d/, '').trim()), zone), ['Bruno n\'a pas encore répondu', 'Bruno organise']);
      v('⛔ rien dont Alice ne fait pas partie, ni la réunion avec Chloé seule, ni celle de quatre mois', await page.evaluate(z => /Secret|Réservé|lointain/.test(document.querySelector(z).textContent), zone), false);
      v('le groupe en commun', await page.evaluate(z => Array.from(document.querySelectorAll(z + ' [data-fiche="groupe"] .fc-titre')).map(e => e.textContent), zone), ['Chantier Lyon']);
      vrai('les gestes : Message, Appeler, Vidéo, Réunion, Favori', await page.evaluate(z => ['ecrire', 'appel', 'programmer', 'favori'].every(a => document.querySelector(z + ' .vc-action[data-fiche="' + a + '"]')), zone));
      await capture('fiche-' + (mob ? 'telephone' : 'bureau'));

      console.log('2. Les gestes');
      await toucher(zone + ' .fc-ligne[data-fiche="programmer"]');
      vrai('« Programmer une réunion avec Bruno » : le formulaire s\'ouvre, Bruno DÉJÀ invité', await attendre(x => { const f = document.getElementById('feuille'); return f && f.dataset.mode === 'reunion-new' && !!document.querySelector('#rf-invites [aria-checked="true"][data-id="' + x + '"], #rf-invites [aria-pressed="true"][data-uid="' + x + '"], #rf-invites [data-retirer="' + x + '"]') || /Bruno/.test((document.getElementById('rf-invites') || {}).textContent || '') && f.dataset.mode === 'reunion-new'; }, uidB));
      await page.goBack();
      if (mob) {
        vrai('le retour revient à la fiche de Bruno', await attendre(() => document.getElementById('feuille').dataset.mode === 'personne' && document.documentElement.classList.contains('feuille-ouverte')));
        await attendre(() => document.querySelectorAll('#info-corps [data-fiche="reunion"]').length > 0);
        await toucher('#info-corps [data-fiche="reunion"]');
        vrai('3. toucher une réunion ouvre SA fiche', await attendre(() => document.getElementById('feuille').dataset.mode === 'reunion' && /Point chantier/.test(document.getElementById('info-corps').textContent)));
        await page.goBack();
        vrai('…et le retour revient encore à la fiche de Bruno', await attendre(() => document.getElementById('feuille').dataset.mode === 'personne'));
      } else vrai('le retour referme le formulaire, la fiche de Bruno est toujours là', await attendre(() => !document.documentElement.classList.contains('feuille-ouverte') && /Bruno Petit/.test(document.querySelector('#vc-fiche').textContent)));
      await toucher(zone + ' .vc-action[data-fiche="ecrire"]');
      vrai('« Message » ouvre la conversation avec Bruno', await attendre(() => document.documentElement.dataset.conv === '1' && /Bruno/.test(document.getElementById('conv-titre').textContent)));
      v('aucune erreur JavaScript', erreurs, []);
      await ctx.close();
    }
  } finally { await b.close(); await svc.arreter(); await og.fermer(); }
  fin();
})().catch(e => { console.error(e); process.exit(2); });
