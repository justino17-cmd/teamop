/* ══ test-1005 — LE TRAJET : L'HEURE À LAQUELLE PARTIR — LE MODULE SEUL, PUIS LE VRAI SERVICE CONTRE UN FAUX IGN (aucun octet ne sort sur Internet) ═════════════════════════════
   13 octobre 2026 : « dans rendez-vous il faudrait pouvoir ajouter une adresse que ça calcule le temps de trajet pour dire à la personne à quelle heure il doit partir s'il veut arriver
   5 ou 10 minutes avant » ; « il accepte de donner sa localisation, on demande s'il part bien de là où il est ou ailleurs […] c'est à nous, l'application, de tout bien calculer » ;
   « sa position, ou changer : domicile, travail, ou une adresse ». Le calcul passe par NOTRE service (`server-msg/trajet.js`), qui demande à l'IGN ; la page n'appelle aucun tiers.
     · le module seul (une horloge et un `fetch` du banc) : ce qui part (une adresse, des points ARRONDIS), le seau par seconde, la mémoire (24 h, 6 h), les réponses de l'IGN qui ne vont pas
       (429, 500, trop lourde, illisible, en retard) — toujours un refus qui se DIT, jamais une exception —, et ⛔ un point « recollé » loin (la mer) : refusé ;
     · la configuration : ouverte par défaut, `false` la ferme, ⛔ en production aucune autre adresse que celle de l'IGN ;
     · le service : le calcul depuis ma position, Domicile, Travail ou une adresse tapée, en voiture ou à pied ; Domicile et Travail SCELLÉS (la page ne reçoit jamais leur point) ;
       les refus, chacun son code ; trente calculs par heure et par personne ; ⛔ le journal ne dit que des issues ;
     · le trajet d'un rendez-vous : une échéance de plus — l'heure de PARTIR — et son rappel « Il est temps de partir » ; un lieu qui change sans trajet neuf emporte l'ancien ;
     · « Ajouter à mon calendrier » : le trajet dans la description, une alarme à l'heure de partir ; l'export porte le trajet et les lieux ; l'effacement du compte les emporte ;
     · `trajet: false` : tout se ferme, sauf ce qui ne calcule pas (lire, retirer, enregistrer un rendez-vous).
   Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const { fauxIgn } = require('./outils-trajet');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { creerTrajet, validerTrajet, avantDepart, texteAdresse, RECOLLE_MAX_M, ATTENTE_MAX_MS } = require(path.join(T.SERVICE, 'trajet.js'));
const { trajetConfig } = require(path.join(T.SERVICE, 'config.js'));
const { ouvrir: ouvrirBase } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const MIN = 60000, HEURE = 3600000;
const MDP = { alice: 'pw-alice-trajet01', bob: 'pw-bob-trajet0001', claire: 'pw-claire-trajet1', dora: 'pw-dora-trajet001', eve: 'pw-eve-trajet0001' };
const arr = (x) => Math.round(x * 1e4) / 1e4;
const codeDe = async (p) => { try { await p; return 'aucune erreur'; } catch (e) { return e && e.code; } };

/* un `fetch` du banc : il note chaque appel, et répond ce que `repondre` dit ({ status, corps }) */
function fauxFetch(repondre) {
  const appels = [];
  const f = async (url, opts) => {
    appels.push({ url, opts });
    const r = await repondre(url, opts);
    return { status: r.status, text: async () => typeof r.corps === 'string' ? r.corps : JSON.stringify(r.corps) };
  };
  f.appels = appels;
  return f;
}

(async () => {
  /* ══ 0. LE MODULE SEUL ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n0. Le module du trajet, seul');
  v('texteAdresse : espaces repliés, signes de tête retirés, de 3 à 200 signes, une chaîne seulement', [
    texteAdresse('  8   rue de  Rivoli '), texteAdresse('— 8 rue de Rivoli'), texteAdresse('ab'), texteAdresse('é'.repeat(200)).length, texteAdresse('é'.repeat(201)),
    texteAdresse('x\u0000\u0007yz'), texteAdresse(12), texteAdresse(null), texteAdresse('!!!'), texteAdresse(['8 rue de Rivoli'])],
  ['8 rue de Rivoli', '8 rue de Rivoli', null, 200, null, 'x yz', null, null, null, null]);
  const TJ = (o) => Object.assign({ minutes: 40, km: 31.2, mode: 'voiture', avance: 10, depart: 'domicile', depart_label: 'Domicile', vers_label: 'Clinique du Parc 69006 Lyon' }, o || {});
  v('validerTrajet : la forme rangée (km au dixième) et RIEN d\'autre — un point ou un identifiant envoyés avec ne sont pas gardés', validerTrajet(Object.assign({ lon: 2.1, lat: 48.8, uid: 'p_x', position: { lon: 1, lat: 2 } }, TJ({ km: 31.24 }))),
    { trajet: TJ() });
  v('validerTrajet(null) : aucun trajet', validerTrajet(null), { trajet: null });
  const mauvais = [undefined, [], 'oui', 12, TJ({ minutes: 0 }), TJ({ minutes: 1441 }), TJ({ minutes: 2.5 }), TJ({ minutes: '40' }), TJ({ km: -1 }), TJ({ km: 5001 }), TJ({ km: '3' }), TJ({ km: NaN }),
    TJ({ mode: 'velo' }), TJ({ mode: 'car' }), TJ({ avance: 7 }), TJ({ avance: '10' }), TJ({ avance: null }), TJ({ depart: 'bureau' }), TJ({ vers_label: '' }), TJ({ vers_label: '   ' }),
    TJ({ vers_label: 'x'.repeat(201) }), TJ({ vers_label: null }), TJ({ depart_label: 3 }), TJ({ depart_label: 'x'.repeat(201) })];
  v('validerTrajet : chaque forme fausse est refusée (trajet_invalide)', mauvais.map(t => validerTrajet(t).erreur), mauvais.map(() => 'trajet_invalide'));
  v('   les bornes passent : 1 et 1 440 minutes, 0 et 5 000 km, chaque avance, chaque départ', [validerTrajet(TJ({ minutes: 1, km: 0 })).erreur, validerTrajet(TJ({ minutes: 1440, km: 5000 })).erreur,
    [0, 5, 10, 15].map(a => !!validerTrajet(TJ({ avance: a })).trajet), ['position', 'domicile', 'travail', 'adresse'].map(d => !!validerTrajet(TJ({ depart: d })).trajet), validerTrajet(TJ({ depart_label: '' })).trajet.depart_label],
    [undefined, undefined, [true, true, true, true], [true, true, true, true], '']);
  v('avantDepart : le trajet plus l\'avance (null sans trajet)', [avantDepart(TJ()), avantDepart(TJ({ minutes: 12, avance: 0 })), avantDepart(null), avantDepart({})], [50, 12, null, null]);

  const ferme = creerTrajet({ cfg: null, fetch: fauxFetch(() => ({ status: 200, corps: {} })) });
  v('fermé : ouvert() faux, et le calcul se REFUSE (trajet_ferme) sans rien appeler', [ferme.ouvert(), await codeDe(ferme.geocoder('8 rue de Rivoli')), await codeDe(ferme.itineraire({ lon: 2, lat: 48 }, { lon: 2.1, lat: 48.1 }, 'voiture'))],
    [false, 'trajet_ferme', 'trajet_ferme']);

  let tps = 1.8e12; const horloge = () => tps;
  const journal = [];
  let force = null;                                // une réponse forcée ({ status, corps }), ou une fonction (url, opts)
  const normale = (url) => {
    const u = new URL(url);
    if (u.pathname === '/geocodage/search') return { status: 200, corps: { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: { type: 'Point', coordinates: [2.36, 48.85] }, properties: { label: 'Lieu ' + u.searchParams.get('q') } }] } };
    return { status: 200, corps: { duration: 12.2, distance: 8.04, start: u.searchParams.get('start'), end: u.searchParams.get('end') } };
  };
  const f = fauxFetch((url, opts) => force ? (typeof force === 'function' ? force(url, opts) : force) : normale(url));
  const CFG = { base: 'http://ign.invalid', delaiMs: 300, geocodageParSeconde: 2, itineraireParSeconde: 2, cacheMax: 50 };
  const M = creerTrajet({ cfg: CFG, fetch: f, horloge, journal: (x) => journal.push(x), attenteMaxMs: 0 });   // sans attente : le seau vide refuse tout de suite (le lissage est joué plus bas)
  const g1 = await M.geocoder('8 rue de Rivoli');
  v('géocoder : au plus quatre lieux { label, lon, lat }', g1, [{ label: 'Lieu 8 rue de Rivoli', lon: 2.36, lat: 48.85 }]);
  const a1 = f.appels[0];
  v('   ⛔ ce qui part : la question et le nombre de réponses — à l\'adresse configurée, sans redirection suivie, sans autre en-tête qu\'« Accept »', [a1.url, a1.opts.redirect, a1.opts.headers, a1.opts.signal instanceof AbortSignal],
    ['http://ign.invalid/geocodage/search?q=8+rue+de+Rivoli&limit=4', 'error', { Accept: 'application/json' }, true]);
  await M.geocoder('8 RUE DE RIVOLI');
  v('   la même adresse (en majuscules) : servie de mémoire, rien ne repart', f.appels.length, 1);
  tps += 24 * HEURE + 1;
  await M.geocoder('8 rue de Rivoli');
  v('   un jour plus tard : elle repart (la mémoire s\'efface)', f.appels.length, 2);
  /* le seau : deux par seconde, plein au départ ; le temps le remplit */
  tps += 10000;
  const seau = [await codeDe(M.geocoder('Adresse un')), await codeDe(M.geocoder('Adresse deux')), await codeDe(M.geocoder('Adresse trois'))];
  v('le seau des géocodages (deux par seconde) : la troisième demande de la même seconde est « occupé », et ne part pas', [seau, f.appels.length], [['aucune erreur', 'aucune erreur', 'trajet_occupe'], 4]);
  tps += 500;
  v('   une demi-seconde plus tard : une place (et une seule)', [await codeDe(M.geocoder('Adresse trois')), await codeDe(M.geocoder('Adresse quatre'))], ['aucune erreur', 'trajet_occupe']);
  tps += 5000;
  /* ⛔ une rafale se LISSE : seau vide, la demande réserve le jeton suivant et attend son tour (deux secondes au plus en service) ; au-delà, « occupé ». L'horloge du banc ne bouge pas : les
     tours s'additionnent (250 ms, puis 500…) et l'attente est réelle */
  const fL = fauxFetch((url) => normale(url));
  const L = creerTrajet({ cfg: Object.assign({}, CFG, { itineraireParSeconde: 4 }), fetch: fL, horloge, journal: () => {}, attenteMaxMs: 600 });
  const tL = Date.now();
  const rafale = await Promise.all(Array.from({ length: 10 }, (_, i) => L.itineraire({ lon: 2 + i / 100, lat: 48 }, { lon: 2.5, lat: 48.5 }, 'voiture').then(() => 'passé', (e) => e.code)));
  const dtL = Date.now() - tL;
  v('une rafale de dix (quatre par seconde, attente bornée à 0,6 s) : quatre tout de suite, deux qui ATTENDENT leur tour (0,25 et 0,5 s), quatre « occupé » — qui ne partent pas', [rafale, fL.appels.length, dtL >= 450 && dtL < 1500],
    [['passé', 'passé', 'passé', 'passé', 'passé', 'passé', 'trajet_occupe', 'trajet_occupe', 'trajet_occupe', 'trajet_occupe'], 6, true]);
  v('   en service, l\'attente est bornée à deux secondes', ATTENTE_MAX_MS, 2000);
  tps += 5000;
  const nU = f.appels.length;
  const deux = await Promise.all([M.geocoder('Adresse dix'), M.geocoder('adresse DIX')]);
  v('la même question posée deux fois à la fois ne part qu\'une fois — les deux ont la réponse', [f.appels.length - nU, deux[0] === deux[1], deux[0].length], [1, true, 1]);

  const DE = { lon: 2.2384627, lat: 48.8920334 }, VERS = { lon: 2.360909, lat: 48.855372 };
  const n0 = f.appels.length;
  const i1 = await M.itineraire(DE, VERS, 'voiture');
  v('itinéraire : les minutes arrondies AU-DESSUS (12,2 → 13), les km au dixième (8,04 → 8)', i1, { minutes: 13, km: 8 });
  const p1 = Object.fromEntries(new URL(f.appels[n0].url).searchParams);
  v('   ⛔ ce qui part : deux points ARRONDIS à 4 décimales (une dizaine de mètres), le profil, rien d\'autre', p1, { resource: 'bdtopo-osrm', start: arr(DE.lon) + ',' + arr(DE.lat), end: arr(VERS.lon) + ',' + arr(VERS.lat),
    profile: 'car', optimization: 'fastest', getSteps: 'false', getBbox: 'false', timeUnit: 'minute', distanceUnit: 'kilometer', geometryFormat: 'polyline' });
  await M.itineraire({ lon: DE.lon + 0.00001, lat: DE.lat }, VERS, 'voiture');
  v('   le même trajet à un mètre près (le même point arrondi) : servi de mémoire', f.appels.length, n0 + 1);
  await M.itineraire(DE, VERS, 'pied');
  v('   à pied : un autre trajet, le profil « pedestrian »', [f.appels.length, new URL(f.appels[f.appels.length - 1].url).searchParams.get('profile')], [n0 + 2, 'pedestrian']);
  tps += 6 * HEURE + 1;
  await M.itineraire(DE, VERS, 'voiture');
  v('   six heures plus tard : il repart', f.appels.length, n0 + 3);
  v('mode ou point faux : refusés AVANT de partir', [await codeDe(M.itineraire(DE, VERS, 'velo')), await codeDe(M.itineraire({ lon: 2, lat: 91 }, VERS, 'voiture')), await codeDe(M.itineraire(DE, { lon: NaN, lat: 1 }, 'voiture')),
    await codeDe(M.itineraire(null, VERS, 'voiture')), f.appels.length], ['mode_invalide', 'point_invalide', 'point_invalide', 'point_invalide', n0 + 3]);
  /* le point recollé : à 2,9 km de ce qu'on a demandé, il passe ; à 3,1 km (ou la mer), c'est un autre trajet */
  const recolle = (dLat, cote) => (url) => { const u = new URL(url); const [lon, lat] = u.searchParams.get(cote).split(',').map(Number);
    const autre = u.searchParams.get(cote === 'end' ? 'start' : 'end'); const p = lon + ',' + (lat + dLat);
    return { status: 200, corps: { duration: 30, distance: 20, start: cote === 'start' ? p : autre, end: cote === 'end' ? p : autre } }; };
  const ici = (k) => ({ lon: 2.2 + k / 1000, lat: 48.7 });
  tps += 5000; force = recolle(0.026, 'end');
  const proche = await codeDe(M.itineraire(ici(1), VERS, 'voiture'));
  tps += 5000; force = recolle(0.0281, 'end');
  const loin = await codeDe(M.itineraire(ici(2), VERS, 'voiture'));
  tps += 5000; force = recolle(0.0281, 'start');
  const loinDepart = await codeDe(M.itineraire(ici(3), VERS, 'voiture'));
  tps += 5000; force = (url) => ({ status: 200, corps: { duration: 30, distance: 20, start: 'quelque part', end: new URL(url).searchParams.get('end') } });
  const illisible = await codeDe(M.itineraire(ici(4), VERS, 'voiture'));
  v('⛔ un point « recollé » : à 2,9 km il passe ; à 3,1 km de l\'arrivée ou du départ, ou illisible, c\'est un AUTRE trajet (trajet_hors_reseau)', [RECOLLE_MAX_M, proche, loin, loinDepart, illisible],
    [3000, 'aucune erreur', 'trajet_hors_reseau', 'trajet_hors_reseau', 'trajet_hors_reseau']);
  const essai = async (k, rep) => { tps += 5000; force = rep; return codeDe(M.itineraire(ici(10 + k), VERS, 'voiture')); };
  const pts = (url) => { const u = new URL(url); return { start: u.searchParams.get('start'), end: u.searchParams.get('end') }; };
  v('une durée ou une distance absurdes : indisponible (jamais « partir à » sur un chiffre faux)', [
    await essai(1, (u) => ({ status: 200, corps: Object.assign({ duration: -1, distance: 3 }, pts(u)) })), await essai(2, (u) => ({ status: 200, corps: Object.assign({ duration: 'vite', distance: 3 }, pts(u)) })),
    await essai(3, (u) => ({ status: 200, corps: Object.assign({ duration: 7 * 24 * 60 + 1, distance: 3 }, pts(u)) })), await essai(4, (u) => ({ status: 200, corps: Object.assign({ duration: 3, distance: 5001 }, pts(u)) }))],
  ['trajet_indisponible', 'trajet_indisponible', 'trajet_indisponible', 'trajet_indisponible']);
  tps += 5000; force = (u) => ({ status: 200, corps: Object.assign({ duration: 0.2, distance: 0.04 }, pts(u)) });
  v('   un trajet de quelques secondes : une minute (jamais « 0 min »)', await M.itineraire(ici(20), VERS, 'voiture'), { minutes: 1, km: 0 });
  const jAvant = journal.length;
  v('les refus de l\'IGN : 429 → occupé, 4xx → impossible, 500 → indisponible ; un réseau coupé, une réponse illisible, ou trop lourde (un VRAI trajet, plus d\'1 Mo) → indisponible', [
    await essai(21, { status: 429, corps: {} }), await essai(22, { status: 404, corps: {} }), await essai(23, { status: 500, corps: {} }),
    await essai(24, () => { throw new TypeError('fetch failed'); }), await essai(25, { status: 200, corps: '<html>' }), await essai(26, (u) => ({ status: 200, corps: Object.assign({ duration: 12, distance: 8, bourrage: 'x'.repeat(1048577) }, pts(u)) }))],
  ['trajet_occupe', 'trajet_impossible', 'trajet_indisponible', 'trajet_indisponible', 'trajet_indisponible', 'trajet_indisponible']);
  /* un IGN qui ne répond pas : le délai coupe (300 ms ici) — l'horloge du seau est celle du banc, le délai celui du système */
  tps += 5000; force = (url, opts) => new Promise((ok, ko) => opts.signal.addEventListener('abort', () => ko(Object.assign(new Error('abandon'), { name: 'AbortError' }))));
  const t0 = Date.now(); const lent = await codeDe(M.itineraire(ici(30), VERS, 'voiture')); const dt = Date.now() - t0;
  v('un IGN qui se tait : le délai coupe (trajet_indisponible), sans attendre plus', [lent, dt >= 250 && dt < 2000], ['trajet_indisponible', true]);
  tps += 5000; force = { status: 400, corps: {} };
  v('géocoder : 400 → adresse refusée ; 500 ou une forme inconnue → indisponible ; une adresse que l\'IGN ne trouve pas → aucun lieu (pas une erreur)', [
    await codeDe(M.geocoder('Adresse cinq')), await (async () => { tps += 5000; force = { status: 500, corps: {} }; return codeDe(M.geocoder('Adresse six')); })(),
    await (async () => { tps += 5000; force = { status: 200, corps: { features: 'non' } }; return codeDe(M.geocoder('Adresse sept')); })(),
    await (async () => { tps += 5000; force = { status: 200, corps: { type: 'FeatureCollection', features: [] } }; return M.geocoder('Adresse huit'); })()],
  ['adresse_invalide', 'trajet_indisponible', 'trajet_indisponible', []]);
  tps += 5000;
  const bon = (lon, lat, label) => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [lon, lat] }, properties: { label } });
  force = { status: 200, corps: { type: 'FeatureCollection', features: [bon(200, 48, 'Hors du monde'), bon(2.3, 48.8, 'Premier'), bon(2.3, 48.8, ''), bon('2.4', '48.9', 'é'.repeat(250)), bon(2.5, 49, 'Cinquième'), bon(2.6, 49, 'Sixième')] } };
  const tri = await M.geocoder('Adresse neuf');
  v('géocoder : les quatre premières réponses seulement, sans point faux ni libellé vide, le libellé borné à 200 signes', tri.map(x => [x.label.length > 20 ? x.label.length : x.label, x.lon, x.lat]), [['Premier', 2.3, 48.8], [200, 2.4, 48.9]]);
  v('le journal du module : des ISSUES seulement (« occupe », « echec ») — jamais une adresse ni un point', [...new Set(journal)].sort(), ['echec', 'occupe']);
  vrai('   population : il a bien écrit (les refus d\'au-dessus)', journal.length > jAvant);
  const nInv = f.appels.length;
  v('   une adresse invalide ne part jamais', [await codeDe(M.geocoder('!!')), await codeDe(M.geocoder(42)), f.appels.length - nInv], ['adresse_invalide', 'adresse_invalide', 0]);
  force = null;

  /* ══ 0 bis. LA CONFIGURATION ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n0 bis. La configuration');
  v('par défaut : OUVERT, chez l\'IGN (sans clé ni compte)', trajetConfig({}, 'prod'), { base: 'https://data.geopf.fr', delaiMs: 6000, geocodageParSeconde: 20, itineraireParSeconde: 4, cacheMax: 2000 });
  v('`false` le ferme ; l\'adresse de l\'IGN écrite (même avec « / ») passe en production', [trajetConfig({ trajet: false }, 'prod'), trajetConfig({ trajet: { base: 'https://data.geopf.fr/' } }, 'prod').base], [null, 'https://data.geopf.fr']);
  v('un faux IGN de banc, sur la boucle locale, HORS production', trajetConfig({ trajet: { base: 'http://127.0.0.1:8099', delaiMs: 800 } }, 'beta'), { base: 'http://127.0.0.1:8099', delaiMs: 800, geocodageParSeconde: 20, itineraireParSeconde: 4, cacheMax: 2000 });
  const conf = (t, inst) => { try { trajetConfig({ trajet: t }, inst || 'beta'); return 'accepté'; } catch (e) { return e.code; } };
  const fautes = [[{ base: 'http://127.0.0.1:8099' }, 'prod'], [{ base: 'https://exemple.invalid' }], [{ base: 'http://localhost:8099' }], [{ base: 'http://127.0.0.1:8099/chemin' }], [{ base: 'https://data.geopf.fr.exemple.invalid' }, 'prod'],
    [null], [[]], ['oui'], [{ delaiMs: 100 }], [{ delaiMs: 30001 }], [{ itineraireParSeconde: 5 }], [{ itineraireParSeconde: 0 }], [{ geocodageParSeconde: 41 }], [{ cacheMax: -1 }], [{ cacheMax: 1.5 }], [{ delaiMs: '800' }]];
  v('⛔ refusé au démarrage : une autre adresse (en production, même la boucle locale), une forme fausse, une borne dépassée (l\'IGN borne à 5 itinéraires par seconde)', fautes.map(([t, i]) => conf(t, i)), fautes.map(() => 'CONFIG'));

  /* ══ LE SERVICE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true }, claire: { pass: MDP.claire, nom: 'Claire Roy', actif: true },
    dora: { pass: MDP.dora, nom: 'Dora Lenoir', actif: true }, eve: { pass: MDP.eve, nom: 'Eve Blanc', actif: true } });
  const ign = await fauxIgn();
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { reunions: { planificateurMs: 150, bailMs: 2000 }, trajet: { base: ign.url, delaiMs: 800 } } });
  let avance = 0; const avancer0 = svc.avancer.bind(svc); svc.avancer = (ms) => { avance += ms; avancer0(ms); };
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  const ecrire = (req, ...a) => { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(BASE); try { d.exec('PRAGMA busy_timeout = 2000'); return d.prepare(req).run(...a); } finally { d.close(); } };
  /* ⛔ un sceau se lit en OCTETS : chercher un mot dans le blob brut (un CAST en texte s'arrête au premier octet nul) */
  const octets = (b) => b instanceof Uint8Array || typeof b === 'string' ? Buffer.from(b) : null;
  const enClair = (req, mots, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).all(...a).some(r => Object.values(r).some(b => { const o = octets(b); return !!o && mots.some(m => o.includes(m)); })); } finally { d.close(); } };
  const p2 = (n) => String(n).padStart(2, '0');
  const debutLocal = (ms) => { const d = new Date(ms); return d.getUTCFullYear() + '-' + p2(d.getUTCMonth() + 1) + '-' + p2(d.getUTCDate()) + 'T' + p2(d.getUTCHours()) + ':' + p2(d.getUTCMinutes()); };
  const hm = (ms) => new Date(ms).toISOString().slice(11, 16);
  const maintenant = () => Date.now() + avance;
  const dans = (min) => Math.ceil((maintenant() + min * MIN) / MIN) * MIN;
  const C = (label) => ign.CARNET.find(c => c.label === label);
  const R1 = C('8 Rue de Rivoli 75004 Paris'), TE = C('Tour Eiffel 75007 Paris'), LI = C('12 Rue des Lilas 78000 Versailles'), GA = C('3 Avenue de la Gare 69003 Lyon'), CP = C('Clinique du Parc 69006 Lyon');
  const POS = { lon: 2.2384627, lat: 48.8920334 };                                         // La Défense : « ma position »
  const P = { type: 'position', lon: POS.lon, lat: POS.lat };
  /* ce que le faux annonce, recalculé ICI depuis les points ARRONDIS que le service envoie (pas une constante recopiée) */
  const attendu = (de, vers, mode) => { const a = { lon: arr(de.lon), lat: arr(de.lat) }, b = { lon: arr(vers.lon), lat: arr(vers.lat) };
    return { minutes: Math.max(1, Math.ceil(ign.dureeMinutes(a, b, mode === 'pied' ? 'pedestrian' : 'car'))), km: Math.round(ign.distanceKm(a, b) * 1.3 * 10) / 10 }; };
  const calc = (c, b) => c.post('/api/trajet', b);
  const depuisN = (n) => ign.etat.appels.slice(n);
  try {
    const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob);

    console.log('\n1. /api/config, et le calcul depuis « ma position »');
    const cf = await A.get('/api/config');
    v('/api/config : le calcul est ouvert — un booléen, jamais l\'adresse du service qui calcule', [cf.j.trajet, cf.txt.includes(ign.url), /geopf/.test(cf.txt)], [{ ouvert: true }, false, false]);
    let n = ign.etat.appels.length;
    const r1 = await calc(A, { vers: '8 rue de Rivoli', depuis: P, mode: 'voiture' });
    v('200 : la durée de l\'IGN (au-dessus), les km, le lieu TROUVÉ, d\'où l\'on part, et l\'autre adresse possible', [r1.code, r1.j.minutes, r1.j.km, r1.j.mode, r1.j.vers, r1.j.depuis, r1.j.autres],
      [200, attendu(POS, R1).minutes, attendu(POS, R1).km, 'voiture', { label: R1.label }, { type: 'position', label: 'Ma position' }, ['8 Rue de Rivoli 75001 Paris']]);
    vrai('   population : un vrai trajet (plus de dix minutes)', r1.j.minutes > 10, r1.j);
    let ap = depuisN(n);
    v('chez l\'IGN : UN géocodage (le lieu, tel que tapé) puis UN itinéraire — « ma position » n\'est pas géocodée', ap.map(x => x.chemin), ['/geocodage/search', '/navigation/itineraire']);
    v('   le géocodage : la question et le nombre de réponses, rien d\'autre', ap[0].params, { q: '8 rue de Rivoli', limit: '4' });
    v('   ⛔ l\'itinéraire : MA POSITION ARRONDIE à 4 décimales (une dizaine de mètres)', [ap[1].params.start, ap[1].params.end, ap[1].params.profile], [arr(POS.lon) + ',' + arr(POS.lat), arr(R1.lon) + ',' + arr(R1.lat), 'car']);
    v('   ses paramètres : ceux du calcul, rien d\'autre', Object.keys(ap[1].params).sort(), ['distanceUnit', 'end', 'geometryFormat', 'getBbox', 'getSteps', 'optimization', 'profile', 'resource', 'start', 'timeUnit']);
    v('   ⛔ aucun cookie, aucune session, aucun en-tête de la page (Origin, Referer, X-OPM)', ap.map(x => ['cookie', 'authorization', 'origin', 'referer', 'x-opm'].filter(k => x.entetes[k] !== undefined)), [[], []]);
    vrai('   ⛔ rien de la personne dans ce qui part (ni son nom, ni son identifiant)', !ap.some(x => JSON.stringify(x.params).includes(A.moi.id) || /Alice|Martin/.test(JSON.stringify(x.params))));
    v('⛔ la position du moment n\'est rangée NULLE PART (aucun lieu, et le point n\'est pas en base)', [(await A.get('/api/moi/lieux')).j.lieux, enClair('SELECT * FROM lieu_perso', ['2.2384', '48.892'])], [{ domicile: null, travail: null }, false]);
    n = ign.etat.appels.length;
    const r2 = await calc(A, { vers: '8 rue de Rivoli', depuis: P, mode: 'voiture' });
    v('le même calcul une seconde fois : la même réponse, et rien ne repart chez l\'IGN (le service s\'en souvient)', [r2.code, r2.j.minutes, ign.etat.appels.length - n], [200, r1.j.minutes, 0]);
    const rp = await calc(A, { vers: 'Tour Eiffel', depuis: P, mode: 'pied' });
    v('à pied : le profil « pedestrian », et sa durée (bien plus longue)', [rp.code, rp.j.minutes, rp.j.mode, ign.etat.appels[ign.etat.appels.length - 1].params.profile, rp.j.minutes > attendu(POS, TE).minutes],
      [200, attendu(POS, TE, 'pied').minutes, 'pied', 'pedestrian', true]);

    console.log('\n2. Domicile et Travail');
    const sansDom = await calc(A, { vers: 'Tour Eiffel', depuis: { type: 'domicile' }, mode: 'voiture' });
    v('partir de Domicile sans l\'avoir enregistré : 400 lieu_absent (quoi : domicile)', [sansDom.code, sansDom.j], [400, { error: 'lieu_absent', quoi: 'domicile' }]);
    const pd = await A.post('/api/moi/lieux', { cle: 'domicile', texte: '12 rue des Lilas, Versailles' });
    v('enregistrer son domicile : l\'adresse TROUVÉE', [pd.code, pd.j.lieux, pd.j.autres], [200, { domicile: { label: LI.label }, travail: null }, []]);
    v('⛔ la page ne reçoit JAMAIS le point d\'un domicile — ni à l\'enregistrement, ni à la relecture', [Object.keys(pd.j.lieux.domicile), pd.txt.includes(String(LI.lon)), (await A.get('/api/moi/lieux')).txt.includes(String(LI.lat))], [['label'], false, false]);
    v('⛔ en base : UNE ligne, SCELLÉE (ni l\'adresse ni le point en clair)', [Number(sql('SELECT COUNT(*) AS n FROM lieu_perso WHERE uid = ?', A.moi.id).n), enClair('SELECT donnees_ch FROM lieu_perso', ['Lilas', 'Versailles', '2.1301', '48.8049'])], [1, false]);
    n = ign.etat.appels.length;
    const rd = await calc(A, { vers: 'Tour Eiffel', depuis: { type: 'domicile' }, mode: 'voiture' });
    v('partir de Domicile : le trajet depuis SON point (Versailles → la tour Eiffel), et la réponse dit « Domicile »', [rd.code, rd.j.minutes, rd.j.depuis], [200, attendu(LI, TE).minutes, { type: 'domicile', label: 'Domicile' }]);
    ap = depuisN(n);
    v('   ⛔ chez l\'IGN : le point du domicile ARRONDI — son adresse ne repart pas (et la tour Eiffel, déjà cherchée, non plus)', [ap.map(x => x.chemin), ap[0] && ap[0].params.start], [['/navigation/itineraire'], arr(LI.lon) + ',' + arr(LI.lat)]);
    const pt = await A.post('/api/moi/lieux', { cle: 'travail', texte: '3 avenue de la Gare, Lyon' });
    v('enregistrer son travail : les deux lieux', [pt.code, pt.j.lieux], [200, { domicile: { label: LI.label }, travail: { label: GA.label } }]);
    const rt = await calc(A, { vers: 'Clinique du Parc', depuis: { type: 'travail' }, mode: 'pied' });
    v('partir du Travail, à pied', [rt.code, rt.j.minutes, rt.j.depuis, rt.j.vers], [200, attendu(GA, CP, 'pied').minutes, { type: 'travail', label: 'Travail' }, { label: CP.label }]);
    const amb = await A.post('/api/moi/lieux', { cle: 'travail', texte: '8 rue de Rivoli' });
    v('une adresse ambiguë : la première trouvée, et les AUTRES possibles (la page propose « Plutôt : … »)', [amb.j.lieux.travail, amb.j.autres], [{ label: R1.label }, ['8 Rue de Rivoli 75001 Paris']]);
    const choix = await A.post('/api/moi/lieux', { cle: 'travail', texte: '8 Rue de Rivoli 75001 Paris' });
    v('   renvoyer l\'autre libellé la choisit', [choix.code, choix.j.lieux.travail], [200, { label: '8 Rue de Rivoli 75001 Paris' }]);
    const refusL = [[{ cle: 'maison', texte: '12 rue des lilas' }, { error: 'champ_invalide' }], [{ texte: '12 rue des lilas' }, { error: 'champ_invalide' }], [{ cle: 'Domicile', texte: '12 rue des lilas' }, { error: 'champ_invalide' }],
      [{ cle: 'domicile' }, { error: 'adresse_invalide', quoi: 'domicile' }], [{ cle: 'domicile', texte: '' }, { error: 'adresse_invalide', quoi: 'domicile' }], [{ cle: 'domicile', texte: 'ab' }, { error: 'adresse_invalide', quoi: 'domicile' }],
      [{ cle: 'domicile', texte: 12 }, { error: 'adresse_invalide', quoi: 'domicile' }], [{ cle: 'travail', texte: 'x'.repeat(201) }, { error: 'adresse_invalide', quoi: 'travail' }],
      [{ cle: 'domicile', texte: 'Rue introuvable 99999' }, { error: 'adresse_introuvable', quoi: 'domicile' }]];
    const rl = []; for (const [b] of refusL) { const r = await A.post('/api/moi/lieux', b); rl.push([r.code, r.j]); }
    v('les refus se disent, chacun son code (une clé inconnue, une adresse vide, courte, pas un texte, trop longue, introuvable)', rl, refusL.map(([, j]) => [400, j]));
    v('   et rien n\'a changé (le domicile est celui d\'avant)', (await A.get('/api/moi/lieux')).j.lieux, { domicile: { label: LI.label }, travail: { label: '8 Rue de Rivoli 75001 Paris' } });
    const ret = await A.post('/api/moi/lieux', { cle: 'travail', texte: null });
    v('retirer le travail : null, et sa ligne PART de la base', [ret.code, ret.j.lieux, Number(sql('SELECT COUNT(*) AS n FROM lieu_perso WHERE uid = ? AND cle = ?', A.moi.id, 'travail').n)], [200, { domicile: { label: LI.label }, travail: null }, 0]);
    const sansT = await calc(A, { vers: 'Tour Eiffel', depuis: { type: 'travail' }, mode: 'voiture' });
    v('   partir du Travail retiré : 400 lieu_absent (quoi : travail)', [sansT.code, sansT.j], [400, { error: 'lieu_absent', quoi: 'travail' }]);
    v('⛔ Bob ne voit rien des lieux d\'Alice, et ne part pas de son domicile', [(await B.get('/api/moi/lieux')).j, (await calc(B, { vers: 'Tour Eiffel', depuis: { type: 'domicile' }, mode: 'voiture' })).j],
      [{ lieux: { domicile: null, travail: null } }, { error: 'lieu_absent', quoi: 'domicile' }]);
    ecrire('UPDATE lieu_perso SET uid = ? WHERE uid = ? AND cle = ?', B.moi.id, A.moi.id, 'domicile');
    v('⛔ la ligne d\'Alice recopiée au nom de Bob ne s\'ouvre pas (le sceau est lié à la personne) : Bob n\'a pas de domicile', [(await B.get('/api/moi/lieux')).j.lieux.domicile, (await calc(B, { vers: 'Tour Eiffel', depuis: { type: 'domicile' }, mode: 'voiture' })).j.error],
      [null, 'lieu_absent']);
    ecrire('UPDATE lieu_perso SET uid = ? WHERE uid = ? AND cle = ?', A.moi.id, B.moi.id, 'domicile');
    v('   rendue à Alice, elle se relit', (await A.get('/api/moi/lieux')).j.lieux.domicile, { label: LI.label });

    console.log('\n3. Partir d\'une adresse tapée');
    n = ign.etat.appels.length;
    const ra = await calc(A, { vers: 'Clinique du Parc, Lyon 6e', depuis: { type: 'adresse', texte: '3 avenue de la gare 69003' }, mode: 'voiture' });
    v('les deux adresses géocodées (le lieu, puis le départ), puis l\'itinéraire ; la réponse dit l\'adresse de départ TROUVÉE', [ra.code, ra.j.minutes, ra.j.depuis, depuisN(n).map(x => x.chemin + ' ' + (x.params.q || ''))],
      [200, attendu(GA, CP).minutes, { type: 'adresse', label: GA.label }, ['/geocodage/search Clinique du Parc, Lyon 6e', '/geocodage/search 3 avenue de la gare 69003', '/navigation/itineraire ']]);
    v('⛔ l\'adresse de départ tapée n\'est rangée nulle part (seuls Domicile et Travail le sont, à la demande)', [Number(sql('SELECT COUNT(*) AS n FROM lieu_perso').n), enClair('SELECT donnees_ch FROM lieu_perso', ['gare', 'Gare'])], [1, false]);

    console.log('\n4. Les refus du calcul');
    const refusC = [
      [{ vers: 'Tour Eiffel', depuis: P }, { error: 'mode_invalide' }], [{ vers: 'Tour Eiffel', depuis: P, mode: 'velo' }, { error: 'mode_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: P, mode: 'car' }, { error: 'mode_invalide' }],                                               // le nom de l'IGN n'est pas le nôtre
      [{ depuis: P, mode: 'voiture' }, { error: 'lieu_vide' }], [{ vers: '   ', depuis: P, mode: 'voiture' }, { error: 'lieu_vide' }], [{ vers: 12, depuis: P, mode: 'voiture' }, { error: 'lieu_vide' }],
      [{ vers: '!!', depuis: P, mode: 'voiture' }, { error: 'adresse_invalide', quoi: 'vers' }], [{ vers: 'x'.repeat(201), depuis: P, mode: 'voiture' }, { error: 'adresse_invalide', quoi: 'vers' }],
      [{ vers: 'Tour Eiffel', mode: 'voiture' }, { error: 'depart_invalide' }], [{ vers: 'Tour Eiffel', depuis: 'position', mode: 'voiture' }, { error: 'depart_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: [P], mode: 'voiture' }, { error: 'depart_invalide' }], [{ vers: 'Tour Eiffel', depuis: { type: 'bureau' }, mode: 'voiture' }, { error: 'depart_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'position' }, mode: 'voiture' }, { error: 'position_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'position', lon: '2.3', lat: '48.8' }, mode: 'voiture' }, { error: 'position_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'position', lon: 181, lat: 48 }, mode: 'voiture' }, { error: 'position_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'position', lon: 2, lat: -91 }, mode: 'voiture' }, { error: 'position_invalide' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'adresse' }, mode: 'voiture' }, { error: 'adresse_invalide', quoi: 'depart' }],
      [{ vers: 'Tour Eiffel', depuis: { type: 'adresse', texte: '..' }, mode: 'voiture' }, { error: 'adresse_invalide', quoi: 'depart' }]];
    n = ign.etat.appels.length;
    const rc = []; for (const [b] of refusC) { const r = await calc(A, b); rc.push([r.code, r.j]); }
    v('un mode inconnu (même celui de l\'IGN), un lieu vide ou illisible, un départ absent ou inconnu, une position fausse, une adresse de départ vide : 400, chacun SON code', rc, refusC.map(([, j]) => [400, j]));
    v('   ⛔ et rien n\'est parti chez l\'IGN', ign.etat.appels.length - n, 0);
    const ri = await calc(A, { vers: 'Rue introuvable', depuis: P, mode: 'voiture' });
    const rid = await calc(A, { vers: 'Tour Eiffel', depuis: { type: 'adresse', texte: 'Place introuvable' }, mode: 'voiture' });
    v('un lieu que l\'IGN ne trouve pas : 400 adresse_introuvable — et il dit LEQUEL (le lieu, ou le départ)', [ri.code, ri.j, rid.code, rid.j], [400, { error: 'adresse_introuvable', quoi: 'vers' }, 400, { error: 'adresse_introuvable', quoi: 'depart' }]);
    const rm = await calc(A, { vers: 'Ocean', depuis: P, mode: 'voiture' });
    const rmp = await calc(A, { vers: 'Tour Eiffel', depuis: { type: 'position', lon: -25.5, lat: 44.2 }, mode: 'voiture' });
    v('⛔ la mer (l\'IGN « recolle » le point à la pointe du Finistère) : 400 trajet_impossible — pour le lieu comme pour le départ', [rm.code, rm.j, rmp.code, rmp.j], [400, { error: 'trajet_impossible' }, 400, { error: 'trajet_impossible' }]);
    const rLong = await calc(A, { vers: 'Clinique du Parc', depuis: { type: 'domicile' }, mode: 'pied' });
    v('⛔ plus de vingt-quatre heures de route (de Versailles à Lyon, à pied : ' + attendu(LI, CP, 'pied').minutes + ' min) : 400 trajet_trop_long — l\'agenda n\'en rangerait pas',
      [attendu(LI, CP, 'pied').minutes > 1440, rLong.code, rLong.j], [true, 400, { error: 'trajet_trop_long' }]);
    const anon = T.client(svc.base);
    n = ign.etat.appels.length;
    v('⛔ sans session : 401 partout, et rien ne part chez l\'IGN', [(await anon.post('/api/trajet', { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' })).code, (await anon.get('/api/moi/lieux')).code,
      (await anon.post('/api/moi/lieux', { cle: 'domicile', texte: '12 rue des lilas' })).code, ign.etat.appels.length - n], [401, 401, 401, 0]);

    console.log('\n5. L\'IGN qui ne répond pas comme il faut');
    ign.etat.statut = 429;
    const o1 = await calc(A, { vers: '3 avenue de la gare, 69003 Lyon', depuis: P, mode: 'voiture' });
    v('« trop de demandes » (429) : 503 trajet_occupe, « réessaie dans 2 s »', [o1.code, o1.j, o1.h.get('retry-after')], [503, { error: 'trajet_occupe', retry: 2 }, '2']);
    ign.etat.statut = 500;
    const o2 = await calc(A, { vers: '3 avenue de la gare (Lyon)', depuis: P, mode: 'voiture' });
    v('en panne (500) : 503 trajet_indisponible', [o2.code, o2.j], [503, { error: 'trajet_indisponible' }]);
    ign.etat.statut = null; ign.etat.statuts['/navigation/itineraire'] = 400;
    const o3 = await calc(A, { vers: '3 avenue de la gare, Lyon 3e', depuis: P, mode: 'voiture' });
    ign.etat.statuts['/navigation/itineraire'] = 503;
    const o4 = await calc(A, { vers: '3 avenue de la gare, Lyon 3e', depuis: { type: 'position', lon: 2.24, lat: 48.89 }, mode: 'voiture' });
    v('le lieu trouvé mais l\'itinéraire refusé (400) : trajet_impossible ; l\'itinéraire en panne (503) : trajet_indisponible', [o3.code, o3.j, o4.code, o4.j],
      [400, { error: 'trajet_impossible' }, 503, { error: 'trajet_indisponible' }]);
    ign.etat.statuts = {}; ign.etat.lentMs = 2500;
    let t0 = Date.now();
    const o5 = await calc(A, { vers: '3 avenue de la gare Lyon troisième', depuis: P, mode: 'voiture' });
    const dt = Date.now() - t0;
    ign.etat.lentMs = 0;
    v('un IGN qui tarde (2,5 s ; le délai du service est de 0,8 s) : 503 trajet_indisponible, sans attendre l\'IGN', [o5.code, o5.j, dt < 2000], [503, { error: 'trajet_indisponible' }, true]);
    const o6 = await calc(A, { vers: '3 avenue de la gare (Lyon)', depuis: P, mode: 'voiture' });
    v('   ⛔ un échec n\'est pas gardé en mémoire : la même demande, l\'IGN revenu, réussit', [o6.code, o6.j.minutes], [200, attendu(POS, GA).minutes]);
    const E = await T.connecter(svc, og, 'eve', MDP.eve);
    await T.dort(1100);                                                                       // le seau se remplit (quatre itinéraires par seconde)
    n = ign.etat.appels.length;
    const lots = await Promise.all(Array.from({ length: 20 }, (_, i) => calc(E, { vers: 'Tour Eiffel', depuis: { type: 'position', lon: 2.3 + i * 0.001, lat: 48.85 }, mode: 'voiture' })));
    const occupes = lots.filter(r => r.code === 503 && r.j.error === 'trajet_occupe'), passes = lots.filter(r => r.code === 200);
    vrai('vingt itinéraires DIFFÉRENTS à la fois, quand le service n\'en demande que quatre par seconde : la rafale se LISSE (bien plus de quatre passent, en attendant leur tour)', passes.length >= 8, lots.map(r => r.code));
    vrai('   au-delà de deux secondes d\'attente : « occupé » (503, réessayer dans 2 s) — et rien d\'autre', occupes.length >= 1 && passes.length + occupes.length === 20 && occupes.every(r => r.h.get('retry-after') === '2'), lots.map(r => r.code));
    v('   ⛔ ce qui est refusé n\'est pas parti chez l\'IGN (un itinéraire par calcul passé, aucun autre)', depuisN(n).map(x => x.chemin).filter(c => c === '/navigation/itineraire').length, passes.length);
    await T.dort(2600);                                                                       // le seau se vide de ses réservations

    console.log('\n6. Trente calculs par heure et par personne');
    const Cl = await T.connecter(svc, og, 'claire', MDP.claire);
    const cinq = []; for (let i = 0; i < 5; i++) cinq.push((await calc(Cl, { vers: 'Tour Eiffel', depuis: P, mode: 'trottinette' })).code);
    const okq = []; for (let i = 0; i < 29; i++) okq.push((await calc(Cl, { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' })).code);
    const lp = await Cl.post('/api/moi/lieux', { cle: 'domicile', texte: '12 rue des lilas' });
    v('trente gestes (vingt-neuf calculs et un domicile) passent — les cinq refus d\'avant n\'ont rien compté', [cinq, okq.every(c => c === 200), lp.code], [[400, 400, 400, 400, 400], true, 200]);
    const q31 = await calc(Cl, { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' });
    const retry = Number(q31.h.get('retry-after'));
    v('le trente et unième : 429 quota_atteint, et le délai (une heure au plus)', [q31.code, q31.j.error, retry > 3500 && retry <= 3600, q31.j.retry === retry], [429, 'quota_atteint', true, true]);
    v('   enregistrer un lieu aussi (il calcule) ; retirer et lire passent toujours', [(await Cl.post('/api/moi/lieux', { cle: 'travail', texte: '3 avenue de la gare' })).code, (await Cl.post('/api/moi/lieux', { cle: 'domicile', texte: null })).code,
      (await Cl.get('/api/moi/lieux')).code], [429, 200, 200]);
    v('   ⛔ le plafond d\'une personne n\'est pas celui des autres : Bob calcule', (await calc(B, { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' })).code, 200);
    svc.avancer(3601 * 1000);
    v('une heure plus tard : le calcul repasse', (await calc(Cl, { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' })).code, 200);

    console.log('\n7. Le trajet d\'un rendez-vous : l\'heure de PARTIR');
    const notifs = async (titre) => ((await A.get('/api/notifications')).j.notifications || []).filter(x => x.type === 'agenda_rappel' && x.titre === titre);
    const rappelA = (id) => { const r = sql('SELECT rappel_a FROM evenement WHERE id = ?', id); return r.rappel_a === null ? null : Number(r.rappel_a); };
    const deb = dans(120);
    const c1 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Visite QXR', avec: 'Dr Roux', lieu: 'Clinique du Parc', debut: debutLocal(deb), tz: 'UTC', rappels: [15], trajet: TJ({ vers_label: CP.label }) });
    const E1 = c1.j && c1.j.evenement;
    v('201 : le rendez-vous range son trajet, tel quel', [c1.code, E1 && E1.trajet], [201, TJ({ vers_label: CP.label })]);
    v('⛔ l\'échéance qui attend est le DÉPART : le début, moins 40 min de trajet, moins 10 min d\'avance', [E1.rappelEnAttente, rappelA(E1.id)], [true, deb - 50 * MIN]);
    v('⛔ en base : le trajet est SCELLÉ (ni le lieu trouvé, ni d\'où l\'on part, ni les km en clair)', [enClair('SELECT trajet_ch FROM evenement WHERE id = ?', ['Clinique', 'Domicile', '31.2', 'voiture'], E1.id), !!sql('SELECT trajet_ch FROM evenement WHERE id = ?', E1.id).trajet_ch],
      [false, true]);
    v('la liste de l\'agenda le rend aussi', ((await A.get('/api/agenda?du=' + (deb - HEURE) + '&au=' + (deb + HEURE))).j.evenements || []).filter(e => e.id === E1.id).map(e => e.trajet), [TJ({ vers_label: CP.label })]);
    await T.dort(500);
    v('rien ne part avant l\'heure de partir', (await notifs('Visite QXR')).length, 0);
    svc.avancer(71 * MIN);
    vrai('l\'heure de partir arrive : une notification', await T.attendre(async () => (await notifs('Visite QXR')).length === 1, 8000, 100));
    const nd = (await notifs('Visite QXR'))[0];
    v('   « Il est temps de partir » : la durée, le mode, l\'heure d\'arrivée voulue, et avec qui', nd && nd.texte, 'Il est temps de partir · 40 min en voiture, arrivée ' + hm(deb - 10 * MIN) + ' · avec Dr Roux');
    v('   ⛔ l\'échéance passe au rappel SUIVANT (15 min avant), elle ne s\'efface pas', rappelA(E1.id), deb - 15 * MIN);
    await A.post('/api/notifications/lues', { toutes: true });
    svc.avancer(35 * MIN);
    vrai('15 min avant : le rappel ordinaire', await T.attendre(async () => (await notifs('Visite QXR')).length === 2, 8000, 100));
    const nr = (await notifs('Visite QXR')).find(x => !x.lue);
    vrai('   « Dans 1x minutes · avec Dr Roux »', nr && /^Dans 1[2-5] minutes · avec Dr Roux$/.test(nr.texte), nr && nr.texte);
    v('   et plus rien n\'attend', rappelA(E1.id), null);
    await A.post('/api/notifications/lues', { toutes: true });

    const deb2 = dans(60);
    const c2 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Banque QXR', lieu: 'Tour Eiffel', debut: debutLocal(deb2), tz: 'UTC', rappels: [15],
      trajet: TJ({ minutes: 10, avance: 5, mode: 'pied', depart: 'position', depart_label: 'Ma position', vers_label: TE.label }) });
    v('population : 10 min à pied + 5 d\'avance = le départ tombe à la minute du rappel de 15 min', [c2.code, rappelA(c2.j.evenement.id)], [201, deb2 - 15 * MIN]);
    svc.avancer(46 * MIN);
    vrai('⛔ UNE notification part — celle du départ, qui porte le rappel', await T.attendre(async () => (await notifs('Banque QXR')).length === 1, 8000, 100));
    v('   « Il est temps de partir · 10 min à pied, arrivée … » (sans « avec » : personne n\'est nommé)', (await notifs('Banque QXR'))[0].texte, 'Il est temps de partir · 10 min à pied, arrivée ' + hm(deb2 - 5 * MIN));
    await T.dort(800);
    v('   et rien d\'autre (une seule, plus rien n\'attend)', [(await notifs('Banque QXR')).length, rappelA(c2.j.evenement.id)], [1, null]);
    await A.post('/api/notifications/lues', { toutes: true });

    const deb3 = dans(45);
    const c3 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Coiffeur QXR', lieu: 'Tour Eiffel', debut: debutLocal(deb3), tz: 'UTC', trajet: TJ({ minutes: 20, avance: 0, vers_label: TE.label }) });
    v('sans rappel, le départ seul attend (le rendez-vous a un rappel en attente)', [c3.j.evenement.rappels, c3.j.evenement.rappelEnAttente, rappelA(c3.j.evenement.id)], [[], true, deb3 - 20 * MIN]);
    svc.avancer(26 * MIN);
    vrai('   il part', await T.attendre(async () => (await notifs('Coiffeur QXR')).length === 1, 8000, 100));
    v('   sans avance : « pour » l\'heure du rendez-vous', (await notifs('Coiffeur QXR'))[0].texte, 'Il est temps de partir · 20 min en voiture, pour ' + hm(deb3));
    await A.post('/api/notifications/lues', { toutes: true });

    const deb4 = dans(20);
    const c4 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Pharmacie QXR', lieu: 'Tour Eiffel', debut: debutLocal(deb4), tz: 'UTC', rappels: [5], trajet: TJ({ minutes: 30, avance: 0 }) });
    const c4b = await A.post('/api/agenda', { genre: 'rdv', titre: 'Poste QXR', lieu: 'Tour Eiffel', debut: debutLocal(deb4), tz: 'UTC', trajet: TJ({ minutes: 30, avance: 0 }) });
    v('le départ DÉJÀ passé à la création (30 min de trajet pour un rendez-vous dans 20) : il n\'attend pas ; le rappel ordinaire, si — et sans rappel, rien', [rappelA(c4.j.evenement.id), c4b.j.evenement.rappelEnAttente],
      [deb4 - 5 * MIN, false]);

    console.log('\n8. Modifier : le trajet se garde, se remplace, se retire — et suit le lieu');
    const deb5 = dans(3 * 24 * 60);
    const c5 = await A.post('/api/agenda', { genre: 'rdv', titre: 'Notaire QXR', lieu: 'Clinique du Parc', debut: debutLocal(deb5), tz: 'UTC', rappels: [60], trajet: TJ() });
    const id5 = c5.j.evenement.id, m = (b) => A.post('/api/agenda/' + id5 + '/maj', b);
    v('population : le rappel d\'1 h vient AVANT le départ (50 min avant) : c\'est lui qui attend', rappelA(id5), deb5 - 60 * MIN);
    const m1 = await m({ titre: 'Notaire (signature) QXR' });
    v('modifier le titre : le trajet reste, l\'échéance aussi', [m1.code, m1.j.evenement.trajet, rappelA(id5)], [200, TJ(), deb5 - 60 * MIN]);
    const m2 = await m({ lieu: 'Clinique du Parc', note: 'Apporter le RIB' });
    v('renvoyer le MÊME lieu (la page d\'avant renvoie tout) : le trajet reste', [m2.code, m2.j.evenement.trajet], [200, TJ()]);
    const m3 = await m({ trajet: TJ({ minutes: 70, avance: 15 }) });
    v('un trajet neuf (70 min + 15 d\'avance) : le départ (1 h 25 avant) passe AVANT le rappel d\'1 h', [m3.code, m3.j.evenement.trajet.minutes, rappelA(id5)], [200, 70, deb5 - 85 * MIN]);
    const m4 = await m({ lieu: '8 rue de Rivoli' });
    v('⛔ le lieu CHANGE sans trajet neuf : l\'ancien part (il menait ailleurs), l\'échéance redevient le rappel', [m4.code, m4.j.evenement.trajet, rappelA(id5), sql('SELECT trajet_ch FROM evenement WHERE id = ?', id5).trajet_ch],
      [200, null, deb5 - 60 * MIN, null]);
    const m5 = await m({ lieu: 'Tour Eiffel', trajet: TJ({ minutes: 70, avance: 15, vers_label: TE.label }) });
    v('le lieu ET un trajet neuf, ensemble : gardés', [m5.code, m5.j.evenement.lieu, m5.j.evenement.trajet], [200, 'Tour Eiffel', TJ({ minutes: 70, avance: 15, vers_label: TE.label })]);
    const deb6 = deb5 + 2 * HEURE;
    const m6 = await m({ debut: debutLocal(deb6), fin: debutLocal(deb6 + HEURE) });
    v('déplacer le rendez-vous de deux heures : le trajet reste, le départ SUIT', [m6.code, m6.j.evenement.trajet.minutes, rappelA(id5)], [200, 70, deb6 - 85 * MIN]);
    const m7 = await m({ trajet: null });
    v('retirer le trajet (null) : plus de départ, l\'échéance redevient le rappel d\'1 h', [m7.code, m7.j.evenement.trajet, rappelA(id5)], [200, null, deb6 - 60 * MIN]);
    await m({ trajet: TJ({ minutes: 70, avance: 15, vers_label: TE.label }) });
    const m8 = await m({ lieu: null });
    v('⛔ vider le lieu emporte le trajet', [m8.code, m8.j.evenement.lieu, m8.j.evenement.trajet, rappelA(id5)], [200, '', null, deb6 - 60 * MIN]);
    const m9 = await m({ trajet: TJ() });
    v('⛔ un trajet sans lieu : refusé (trajet_invalide)', [m9.code, m9.j.error], [400, 'trajet_invalide']);
    await m({ lieu: 'Tour Eiffel', trajet: TJ({ minutes: 70, avance: 15, vers_label: TE.label }) });
    const f1 = await A.post('/api/agenda/' + id5 + '/fait', { fait: true });
    const f1a = rappelA(id5);
    const f2 = await A.post('/api/agenda/' + id5 + '/fait', { fait: false });
    v('cocher « fait » : plus rien n\'attend ; décocher : le départ revient', [f1.code, f1a, f2.code, rappelA(id5), f2.j.evenement.trajet.minutes], [200, null, 200, deb6 - 85 * MIN, 70]);
    const mf = await A.post('/api/agenda/' + id5 + '/fait', { fait: true });
    const mfn = await m({ trajet: TJ({ minutes: 90, avance: 0, vers_label: TE.label }) });
    v('   ⛔ coché « fait », changer le trajet ne le fait pas sonner (le trajet change, rien ne s\'arme)', [mf.code, mfn.code, mfn.j.evenement.trajet.minutes, rappelA(id5)], [200, 200, 90, null]);
    await A.post('/api/agenda/' + id5 + '/fait', { fait: false });
    const rep = await A.post('/api/agenda/' + id5 + '/reporter', { dans: 'demain' });
    v('reporter à demain 9 h : le trajet reste, le départ suit le nouvel horaire', [rep.code, rep.j.evenement.trajet.minutes, rappelA(id5)], [200, 90, rep.j.evenement.debut - 90 * MIN]);
    const d0 = debutLocal(dans(2 * 24 * 60));
    const refusT = [
      [{ titre: 'X', debut: d0, lieu: 'Tour Eiffel', trajet: TJ() }, 'champ_invalide'],                                        // un événement n'a pas de trajet (un rendez-vous, si)
      [{ genre: 'rdv', titre: 'X', debut: d0, trajet: TJ() }, 'trajet_invalide'],                                                // sans lieu
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ minutes: 0 }) }, 'trajet_invalide'], [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ minutes: 1441 }) }, 'trajet_invalide'],
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ minutes: '40' }) }, 'trajet_invalide'], [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ km: -1 }) }, 'trajet_invalide'],
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ avance: 7 }) }, 'trajet_invalide'], [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ mode: 'velo' }) }, 'trajet_invalide'],
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ depart: 'bureau' }) }, 'trajet_invalide'], [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: TJ({ vers_label: '' }) }, 'trajet_invalide'],
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: [] }, 'trajet_invalide'], [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: 'oui' }, 'trajet_invalide'],
      [{ genre: 'rdv', titre: 'X', debut: d0, lieu: 'L', trajet: 25 }, 'trajet_invalide']];
    const avantN = Number(sql('SELECT COUNT(*) AS n FROM evenement').n);
    const rr = []; for (const [b, code] of refusT) { const r = await A.post('/api/agenda', Object.assign({ tz: 'UTC' }, b)); rr.push(r.code === 400 && r.j.error === code ? true : r.code + ' ' + (r.j && r.j.error)); }
    v('un trajet sur un événement, sans lieu, ou mal formé : 400, chacun son code', rr, refusT.map(() => true));
    v('   et aucun n\'a été créé', Number(sql('SELECT COUNT(*) AS n FROM evenement').n), avantN);
    const okn = await A.post('/api/agenda', { titre: 'Courses QXR', debut: d0, tz: 'UTC', trajet: null });
    v('un événement peut porter « trajet: null » (rien à retirer) ; il n\'a pas de trajet', [okn.code, okn.j.evenement.trajet], [201, null]);
    const okb = await A.post('/api/agenda', { genre: 'rdv', titre: 'Loin QXR', lieu: 'L', debut: d0, tz: 'UTC', trajet: Object.assign({ lon: 2.2384, lat: 48.892 }, TJ({ minutes: 1440, km: 5000 })) });
    v('les bornes (1 440 min, 5 000 km) passent ; ⛔ un point envoyé avec le trajet n\'est PAS rangé', [okb.code, okb.j.evenement.trajet, enClair('SELECT trajet_ch FROM evenement WHERE id = ?', ['2.2384', '48.892'], okb.j.evenement.id)],
      [201, TJ({ minutes: 1440, km: 5000 }), false]);
    const sansTr = await A.post('/api/agenda', { genre: 'rdv', titre: 'Sans trajet QXR', lieu: 'L', debut: d0, tz: 'UTC', rappels: [60] });
    ecrire('UPDATE evenement SET trajet_ch = (SELECT trajet_ch FROM evenement WHERE id = ?) WHERE id = ?', okb.j.evenement.id, sansTr.j.evenement.id);
    const copie = ((await A.get('/api/agenda?du=' + (dans(0) - HEURE) + '&au=' + (dans(4 * 24 * 60)))).j.evenements || []).find(e => e.id === sansTr.j.evenement.id) || {};
    v('⛔ le trajet scellé d\'un rendez-vous recopié sur un autre ne s\'ouvre pas : l\'autre n\'a PAS de trajet, et reste lisible', [copie.trajet, copie.titre], [null, 'Sans trajet QXR']);

    console.log('\n9. « Ajouter à mon calendrier » : le trajet et l\'alarme du départ');
    const ics = async (id) => { const r = await A.get('/api/agenda/' + id + '/ics'); return { code: r.code, lignes: r.txt.replace(/\r\n /g, '').split('\r\n').filter(Boolean) }; };
    const val = (l, k) => (l.find(x => x.startsWith(k + ':') || x.startsWith(k + ';')) || '').replace(/^[^:]*:/, '');
    const trig = (l) => l.filter(x => x.startsWith('TRIGGER:')).map(x => x.slice(8));
    const ki = await A.post('/api/agenda', { genre: 'rdv', titre: 'Kiné, Mme Roux', avec: 'Mme Roux', lieu: 'Clinique du Parc', debut: '2026-10-26T14:00', fin: '2026-10-26T14:45', tz: 'Europe/Paris', rappels: [60, 15], trajet: TJ({ vers_label: CP.label }) });
    const fk = await ics(ki.j.evenement.id);
    v('la description dit le trajet, d\'où l\'on part, et l\'heure de partir pour arriver en avance (14:00 à Paris, 40 min + 10 : partir à 13:10)', [fk.code, val(fk.lignes, 'DESCRIPTION')],
      [200, 'Avec : Mme Roux\\n\\nTrajet : 40 min en voiture depuis Domicile — partir à 13:10 pour arriver à 13:50.\\n\\nRendez-vous ajouté depuis OP MESSAGES.']);
    v('⛔ une alarme de plus, à l\'heure de PARTIR (-50 min), après les deux rappels', trig(fk.lignes), ['-PT15M', '-PT1H', '-PT50M']);
    v('   elle dit qu\'il est temps de partir, et combien de temps', fk.lignes.filter(x => x.startsWith('DESCRIPTION:Il est temps')), ['DESCRIPTION:Il est temps de partir : Kiné\\, Mme Roux (40 min en voiture)']);
    const bq = await A.post('/api/agenda', { genre: 'rdv', titre: 'Banque', lieu: 'Tour Eiffel', debut: '2026-10-26T14:00', tz: 'Europe/Paris', rappels: [15],
      trajet: TJ({ minutes: 10, avance: 5, mode: 'pied', depart: 'position', depart_label: 'Ma position', vers_label: TE.label }) });
    const fb = await ics(bq.j.evenement.id);
    v('⛔ le rappel qui tombe à l\'heure de partir (15 min) : UNE alarme, celle du départ (pas deux sonneries)', [trig(fb.lignes), fb.lignes.filter(x => x.startsWith('DESCRIPTION:Il est temps')).length, fb.lignes.filter(x => x.startsWith('DESCRIPTION:Rappel')).length],
      [['-PT15M'], 1, 0]);
    v('   à pied, depuis « Ma position »', val(fb.lignes, 'DESCRIPTION'), 'Trajet : 10 min à pied depuis Ma position — partir à 13:45 pour arriver à 13:55.\\n\\nRendez-vous ajouté depuis OP MESSAGES.');
    const sa = await A.post('/api/agenda', { genre: 'rdv', titre: 'Garage', lieu: 'Tour Eiffel', debut: '2026-10-26T09:30', tz: 'Europe/Paris', trajet: TJ({ minutes: 75, avance: 0, vers_label: TE.label }) });
    const fs2 = await ics(sa.j.evenement.id);
    v('sans avance : « partir à » seul ; sans rappel : l\'alarme du départ seule (1 h 15 avant)', [val(fs2.lignes, 'DESCRIPTION'), trig(fs2.lignes)],
      ['Trajet : 75 min en voiture depuis Domicile — partir à 08:15.\\n\\nRendez-vous ajouté depuis OP MESSAGES.', ['-PT75M']]);
    const st = await ics(sansTr.j.evenement.id);
    v('un rendez-vous sans trajet (ou au trajet illisible) : ni « Trajet », ni alarme de départ', [st.code, st.lignes.some(x => /Trajet :|Il est temps/.test(x)), trig(st.lignes)], [200, false, ['-PT1H']]);

    console.log('\n10. L\'export, l\'effacement du compte');
    const ex = await A.post('/api/compte/export', {});
    const X = ex.code === 200 ? JSON.parse(ex.txt) : {};
    v('l\'export porte le trajet de chaque rendez-vous (et null pour les autres)', [ex.code, ((X.agenda || []).find(e => e.id === E1.id) || {}).trajet, ((X.agenda || []).find(e => e.id === okn.j.evenement.id) || {}).trajet],
      [200, TJ({ vers_label: CP.label }), null]);
    v('⛔ et SES lieux, avec leur point — ce sont ses données (la page ne voit pas le point ; l\'export, si)', X.lieux, { domicile: { label: LI.label, lon: LI.lon, lat: LI.lat }, travail: null });
    const D = await T.connecter(svc, og, 'dora', MDP.dora);
    await D.post('/api/moi/lieux', { cle: 'domicile', texte: '12 rue des lilas' }); await D.post('/api/moi/lieux', { cle: 'travail', texte: 'Tour Eiffel' });
    vrai('population : deux lieux rangés pour Dora', Number(sql('SELECT COUNT(*) AS n FROM lieu_perso WHERE uid = ?', D.moi.id).n) === 2);
    const S2 = ouvrirBase({ chemin: BASE, scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
    S2.suppressionProgrammer(D.moi.id, Date.now() - 1000);
    const eff = S2.compteEffacer(D.moi.id); S2.fermer();
    v('⛔ l\'effacement du compte emporte son domicile et son travail — et rien de ceux des autres', [eff.effacee, Number(sql('SELECT COUNT(*) AS n FROM lieu_perso WHERE uid = ?', D.moi.id).n), Number(sql('SELECT COUNT(*) AS n FROM lieu_perso WHERE uid = ?', A.moi.id).n)],
      [true, 0, 1]);

    console.log('\n11. Le journal du service');
    const sortie = svc.sortie.texte();
    const lj = sortie.split('\n').filter(l => l.includes('"evt":"trajet"')).map(l => { try { return JSON.parse(l); } catch (e) { return null; } }).filter(Boolean);
    v('il dit les issues du calcul (« occupe », « echec ») — un état, rien d\'autre', [[...new Set(lj.map(l => l.etat))].sort(), [...new Set(lj.map(l => Object.keys(l).sort().join(',')))]], [['echec', 'occupe'], ['etat,evt,t']]);
    vrai('⛔ aucune adresse, aucun point, aucun titre dans toute la sortie du service', !/Rivoli|Lilas|Clinique|Eiffel|Versailles|Gare|2\.2385|48\.892|2\.1301|QXR|Dr Roux/.test(sortie), (sortie.match(/.{0,60}(Rivoli|Lilas|Clinique|Eiffel|Versailles|Gare|2\.2385|48\.892|2\.1301|QXR|Dr Roux).{0,60}/) || [])[0]);

    console.log('\n12. Le calcul fermé (`trajet: false`)');
    const svc2 = await T.lancerService({ urlGestion: og.url, config: { trajet: false } });
    try {
      const A2 = await T.connecter(svc2, og, 'alice', MDP.alice);
      n = ign.etat.appels.length;
      v('/api/config : fermé', (await A2.get('/api/config')).j.trajet, { ouvert: false });
      v('le calcul : 503 trajet_ferme (même une demande vide : rien n\'est lu)', [(await calc(A2, { vers: 'Tour Eiffel', depuis: P, mode: 'voiture' })).j, (await calc(A2, {})).code], [{ error: 'trajet_ferme' }, 503]);
      v('enregistrer un domicile : 503 trajet_ferme ; lire et retirer passent', [(await A2.post('/api/moi/lieux', { cle: 'domicile', texte: '12 rue des lilas' })).j, (await A2.get('/api/moi/lieux')).code,
        (await A2.post('/api/moi/lieux', { cle: 'domicile', texte: null })).code], [{ error: 'trajet_ferme' }, 200, 200]);
      const rf = await A2.post('/api/agenda', { genre: 'rdv', titre: 'Dentiste', lieu: 'Tour Eiffel', debut: debutLocal(Date.now() + 2 * 24 * HEURE), tz: 'UTC', trajet: TJ({ vers_label: TE.label }) });
      v('un rendez-vous s\'enregistre avec son trajet (le service ne recalcule rien)', [rf.code, rf.j.evenement.trajet], [201, TJ({ vers_label: TE.label })]);
      v('⛔ rien n\'est parti chez le faux IGN depuis ce service', ign.etat.appels.length - n, 0);
    } finally { await svc2.arreter(); }
  } catch (e) {
    console.log('  ✗ exception : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    await svc.arreter();
    await ign.fermer();
    await og.fermer();
  }
  fin();
})().catch((e) => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });      // ⛔ un banc qui meurt le DIT, avec ses comptes
