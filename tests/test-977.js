/* test-977 — OP MESSAGES : LA MISE À JOUR FORCÉE, RÉGLÉE DEPUIS LA TOUR (6 octobre 2026).
 *
 * Justin : « pour les mises à jour, je veux aussi le forçage de mise à jour, comme sur OP GESTION depuis la Tour — et que tout soit
 * bien séparé ». La Tour pose le minimum de CHAQUE instance chez OP GESTION (`test-999`) ; le service le relit
 * (`server-msg/version-client.js`), refuse d'écrire sous lui (426), et la page se met à jour d'elle-même.
 *
 * Ce banc lance le VRAI service, contre un OP GESTION de poche (`fauxOpGestion`, sa route `/api/version`), et exécute le VRAI
 * `public/api.js`. Ce qu'il garde :
 *   · le numéro de la page servie (`OPMSG_VERSION`, posé par le générateur) est celui que `/api/config` annonce ;
 *   · sans minimum de la Tour, rien ne change — même une écriture sans numéro passe (les pages d'avant ce verrou) ;
 *   · sous le minimum : 426 sur les écritures, la lecture continue, et les gestes de droit passent toujours (se déconnecter…) ;
 *   · ⛔ un OP GESTION d'avant (sans écho de canal, son minimum à lui) ne bloque PERSONNE ; l'écho d'un autre canal non plus ;
 *   · ⛔ une panne ne lève ni ne pose rien : on garde le dernier minimum lu ;
 *   · la Tour lève l'exigence : tout repasse ;
 *   · le plancher du fichier (`minClient`) compte aussi ;
 *   · `api.js` envoie le numéro de la page à chaque écriture (et au dépôt d'une pièce), et un 426 réveille l'écran.
 */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const C = T.compteur(), v = C.v, vrai = C.vrai;
const { creerVersionClient } = require(path.join(T.SERVICE, 'version-client.js'));

(async () => {
  let svc = null, og = null;
  try {
    console.log('\n── 977 · le module seul : il nomme son canal et exige l\'écho ──');
    const appels = [];
    const rep = (corps, statut = 200) => async (url) => { appels.push(url); return { status: statut, json: async () => corps }; };
    let vc = creerVersionClient({ config: { instance: 'prod', minClient: 1, beta: { urlGestion: 'http://127.0.0.1:8080/', timeoutMs: 500 } }, fetchImpl: rep({ ok: true, min: 12, canal: 'messages-prod' }) });
    v('au démarrage, avant toute lecture : le plancher du fichier', vc.exige(), 1);
    v('la relecture réussit', await vc.relire(), true);
    v('… elle demande le canal de SON instance', appels[0], 'http://127.0.0.1:8080/api/version?app=messages&canal=prod');
    v('… et le minimum de la Tour s\'applique', vc.exige(), 12);
    vc = creerVersionClient({ config: { instance: 'prod', minClient: 1, beta: { urlGestion: 'http://127.0.0.1:8080' } }, fetchImpl: rep({ ok: true, min: 760, enLigne: 'enLigne' }) });
    v('⛔ un OP GESTION d\'avant (pas d\'écho) : rien ne change', [await vc.relire(), vc.exige()], [false, 1]);
    vc = creerVersionClient({ config: { instance: 'prod', minClient: 1, beta: { urlGestion: 'http://127.0.0.1:8080' } }, fetchImpl: rep({ ok: true, min: 9, canal: 'messages-beta' }) });
    v('⛔ l\'écho d\'un AUTRE canal : rien ne change', [await vc.relire(), vc.exige()], [false, 1]);
    for (const [corps, quoi] of [[{ ok: true, min: -3, canal: 'messages-prod' }, 'négatif'], [{ ok: true, min: 1.5, canal: 'messages-prod' }, 'non entier'], [{ ok: true, min: '9', canal: 'messages-prod' }, 'en texte'], [{ ok: false, min: 9, canal: 'messages-prod' }, 'ok:false']]) {
      vc = creerVersionClient({ config: { instance: 'prod', minClient: 1, beta: { urlGestion: 'http://127.0.0.1:8080' } }, fetchImpl: rep(corps) });
      v('⛔ un minimum ' + quoi + ' est ignoré', [await vc.relire(), vc.exige()], [false, 1]);
    }
    vc = creerVersionClient({ config: { instance: 'beta', minClient: 4, beta: { urlGestion: 'http://127.0.0.1:8080' } }, fetchImpl: rep({ ok: true, min: 2, canal: 'messages-beta' }) });
    await vc.relire();
    v('le plancher du fichier compte aussi (le plus grand des deux)', vc.exige(), 4);
    let panne = false, n = 7;
    vc = creerVersionClient({ config: { instance: 'beta', minClient: 1, beta: { urlGestion: 'http://127.0.0.1:8080' } }, fetchImpl: async () => { if (panne) throw new Error('réseau'); return { status: 200, json: async () => ({ ok: true, min: n, canal: 'messages-beta' }) }; } });
    await vc.relire(); panne = true;
    v('⛔ une panne garde le dernier minimum lu', [await vc.relire(), vc.exige(), vc.etat().echecs], [false, 7, 1]);
    panne = false; n = 0; await vc.relire();
    v('la Tour lève l\'exigence : retour au plancher', vc.exige(), 1);

    console.log('\n── 977 · le vrai service ──');
    const pageServie = fs.readFileSync(path.join(T.SERVICE, 'public', 'opmsg-ui.js'), 'utf8');
    const NUM = parseInt((/const OPMSG_VERSION = ([0-9]+);/.exec(pageServie) || [])[1] || '0', 10);
    vrai('la page servie porte son numéro (' + NUM + ')', NUM >= 1);
    og = await T.fauxOpGestion({ alice: { pass: 'secret-alice', nom: 'Alice', actif: true } });
    /* le service fait croire qu'il sert une page PLUS RÉCENTE (NUM + 5) : les en-têtes « NUM » du banc jouent la page restée en arrière, et la Tour peut exiger
       jusqu'à NUM + 5 (au-delà, le service ignore un minimum que personne n'atteindrait — vérifié plus bas) */
    const SERVIE = NUM + 5;
    svc = await T.lancerService({ urlGestion: og.url, config: { beta: { relectureMs: 120 } }, env: { OPMSG_TEST_VERSION_PAGE: String(SERVIE) } });
    let r = await T.client(svc.base).get('/api/config');
    v('/api/config annonce le numéro de la page servie', r.j && r.j.version_client, SERVIE);
    v('… et aucun minimum au-delà du plancher', r.j && r.j.min_client, 1);
    vrai('le service a demandé SON canal à OP GESTION', await T.attendre(() => og.versionAppels.some(a => a.app === 'messages' && a.canal === 'beta')));
    v('⛔ et ces relectures ne se mêlent pas aux appels de la porte', og.appels.filter(a => /version/.test(a.chemin)).length, 0);
    const alice = await T.connecter(svc, og, 'alice', 'secret-alice');
    const EVT = { titre: 'Point', debut: '2026-10-08T10:00', fin: '2026-10-08T11:00', tz: 'Europe/Paris' };
    r = await alice.post('/api/agenda', EVT);
    v('sans minimum : une écriture sans numéro passe (une page d\'avant ce verrou)', r.code, 201);

    console.log('\n── 977 · la Tour exige une version ──');
    og.versionMin = NUM + 1;
    const vu = await T.attendre(async () => ((await T.client(svc.base).get('/api/config')).j || {}).min_client === NUM + 1, 6000);
    vrai('le service relit le minimum de la Tour (min_client = ' + (NUM + 1) + ')', vu);
    r = await alice.post('/api/agenda', EVT);
    v('⛔ une écriture sans numéro : 426, et le minimum est dit', [r.code, r.j && r.j.error, r.j && r.j.min], [426, 'version_trop_ancienne', NUM + 1]);
    r = await alice.post('/api/agenda', EVT, { entetes: { 'X-OPM-Version': String(NUM) } });
    v('⛔ la page servie aujourd\'hui (' + NUM + ') : 426', r.code, 426);
    r = await alice.post('/api/agenda', EVT, { entetes: { 'X-OPM-Version': String(NUM + 1) + 'x' } });
    v('⛔ un numéro mal écrit compte pour 0', r.code, 426);
    r = await alice.post('/api/agenda', EVT, { entetes: { 'X-OPM-Version': String(NUM + 1) } });
    v('la version exigée passe', r.code, 201);
    r = await alice.post('/api/agenda', EVT, { entetes: { 'X-OPM-Version': String(NUM + 2) } });
    v('une version plus récente passe', r.code, 201);
    r = await alice.get('/api/agenda?du=' + Date.UTC(2026, 9, 1) + '&au=' + Date.UTC(2026, 9, 31));
    v('la lecture continue (GET sans numéro)', [r.code, r.j && r.j.evenements && r.j.evenements.length], [200, 3]);
    r = await alice.post('/api/beta/entrer', { login: 'alice', pass: 'secret-alice' });
    v('⛔ même se connecter est une écriture : 426', r.code, 426);

    console.log('\n── 977 · ce qui ne bouge PAS l\'exigence ──');
    const lu = async () => ((await T.client(svc.base).get('/api/config')).j || {}).min_client;
    for (const mode of ['ancien', 'autre', 'panne', '500']) {
      og.versionMode = mode;
      const avant = og.versionAppels.length;
      await T.attendre(() => og.versionAppels.length >= avant + 2, 6000);
      v('⛔ « ' + mode + ' » : l\'exigence reste ' + (NUM + 1), await lu(), NUM + 1);
    }
    og.versionMode = 'normal';

    console.log('\n── 977 · la Tour lève l\'exigence ──');
    og.versionMin = 0;
    vrai('min_client revient au plancher', await T.attendre(async () => (await lu()) === 1, 6000));
    r = await alice.post('/api/agenda', EVT);
    v('une écriture sans numéro repasse', r.code, 201);
    og.versionMin = NUM + 5;
    await T.attendre(async () => (await lu()) === NUM + 5, 6000);
    /* ⛔ LES GESTES DE PROTECTION passent sous le minimum (relecture du gardien) : se protéger, retirer son consentement, déconnecter un appareil, raccrocher */
    for (const [chemin, corps] of [['/api/contacts/bloquer', { uid: 'p_inconnu' }], ['/api/push/desabonner', {}], ['/api/moi/appareils/deconnecter', {}], ['/api/appels/ap_inconnu/quitter', {}]]) {
      r = await alice.post(chemin, corps);
      v('⛔ sous le minimum, ' + chemin + ' n\'est pas refusé pour sa version (' + r.code + ')', r.code === 426, false);
    }
    r = await alice.post('/api/contacts/debloquer', { uid: 'p_inconnu' });
    v('   … mais un geste ordinaire, si (débloquer : 426)', r.code, 426);

    console.log('\n── 977 · un minimum qu\'aucune page servie n\'atteint est IGNORÉ ──');
    og.versionMin = SERVIE + 1;
    const ignore = await T.attendre(() => /version_min_ignoree/.test(svc.sortie.texte()), 6000);
    vrai('⛔ au-dessus de la page servie (v' + (SERVIE + 1) + ' > v' + SERVIE + ') : le service l\'ignore et le DIT au journal', ignore);
    v('   min_client revient au plancher : personne n\'est enfermé', await lu(), 1);
    r = await alice.post('/api/agenda', EVT);
    v('   et une écriture sans numéro passe', r.code, 201);
    og.versionMin = SERVIE;
    vrai('la page servie elle-même (v' + SERVIE + ') s\'exige normalement', await T.attendre(async () => (await lu()) === SERVIE, 6000));
    og.versionMin = NUM + 5;
    await T.attendre(async () => (await lu()) === NUM + 5, 6000);
    r = await alice.post('/api/compte/deconnexion', {});
    v('⛔ sous le minimum, se déconnecter passe toujours (un droit)', r.code === 426, false);
    await svc.arreter(); svc = null;

    console.log('\n── 977 · le plancher du fichier, sans la Tour ──');
    og.versionMin = 0;
    svc = await T.lancerService({ urlGestion: og.url, config: { minClient: 3, beta: { relectureMs: 120 } } });
    r = await T.client(svc.base).get('/api/config');
    v('minClient 3 du fichier : min_client 3, même avant la première relecture', r.j && r.j.min_client, 3);
    await svc.arreter(); svc = null;

    console.log('\n── 977 · la page : api.js envoie son numéro, un 426 réveille l\'écran ──');
    const API = require(path.join(T.SERVICE, 'public', 'api.js'));
    const vus = []; let reponse = { status: 201, corps: '{"evenement":{}}' };
    const fauxFetch = async (url, init) => { vus.push({ url, h: Object.assign({}, init && init.headers) }); return { ok: reponse.status < 300, status: reponse.status, headers: { get: () => null }, text: async () => reponse.corps }; };
    let a = API.creer({ base: '', fetch: fauxFetch, versionClient: 4 });
    await a.creerEvenement(EVT);
    v('le numéro passé par le banc part avec l\'écriture', vus[0].h['X-OPM-Version'], '4');
    await a.config().catch(() => {});
    v('… mais pas avec une lecture', vus[1].h['X-OPM-Version'], undefined);
    const evts = [];
    globalThis.window = { OPMSG_VERSION_CLIENT: 9, dispatchEvent: (e) => { evts.push(e); return true; } };
    globalThis.CustomEvent = class { constructor(type, o) { this.type = type; this.detail = o && o.detail; } };
    a = API.creer({ base: '', fetch: fauxFetch });
    vus.length = 0;
    await a.deposer(new Uint8Array(3), { conv: 'c1', genre: 'photo' }).catch(() => {});
    v('la page pose son numéro (window.OPMSG_VERSION_CLIENT) — sur le dépôt d\'une pièce aussi', vus[0].h['X-OPM-Version'], '9');
    reponse = { status: 426, corps: '{"error":"version_trop_ancienne","min":11}' };
    let err = null; try { await a.creerEvenement(EVT); } catch (e) { err = e; }
    v('un 426 jette une erreur qui se dit', [err && err.code, err && err.message], ['version_trop_ancienne', API.MESSAGES.version_trop_ancienne]);
    v('… et réveille l\'écran (« opmsg-version », avec le minimum)', evts.map(e => [e.type, e.detail && e.detail.min]), [['opmsg-version', 11]]);
    globalThis.window.OPMSG_VERSION_CLIENT = 0; vus.length = 0; reponse = { status: 201, corps: '{"evenement":{}}' };
    await a.creerEvenement(EVT);
    v('une page sans numéro (l\'aperçu) n\'envoie rien', vus[0].h['X-OPM-Version'], undefined);
    delete globalThis.window; delete globalThis.CustomEvent;
  } catch (e) { C.ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  finally { if (svc) await svc.arreter(); if (og) try { await og.fermer(); } catch (e) {} }
  C.fin();
})();
