/* ══ LE TRAJET — L'HEURE À LAQUELLE IL FAUT PARTIR (13 octobre 2026) ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * Justin : « dans rendez-vous il faudrait pouvoir ajouter une adresse que ça calcule le temps de trajet pour dire à la personne à quelle heure il doit partir s'il veut arriver 5 ou 10 minutes
 * avant » ; puis « il accepte de donner sa localisation, on demande s'il part bien de là où il est ou ailleurs […] et c'est à nous, l'application, de tout bien calculer ».
 *
 * Le calcul passe par NOTRE service, jamais par la page : la page n'appelle aucun tiers. Le service demande au service PUBLIC de l'IGN (la Géoplateforme, hébergée en France, gratuite, sans
 * clé ni compte) : le géocodage (une adresse → un point) et le calcul d'itinéraire (voiture ou à pied, France seulement, vitesses moyennes — pas de trafic en temps réel).
 *
 * ⛔ CE QUI PART CHEZ L'IGN, ET RIEN D'AUTRE : le texte d'une adresse TEL QU'IL A ÉTÉ TAPÉ (le lieu du rendez-vous, un départ, Domicile ou Travail), et des coordonnées ARRONDIES à
 *    4 décimales (une dizaine de mètres — assez pour un itinéraire, pas plus). Jamais un nom, un identifiant, un titre. Le journal ne reçoit que des ISSUES (`echec`, `occupe`,
 *    `hors_reseau`, `invraisemblable`, `trop_lourd`), jamais une adresse ni un point.
 * ⛔ L'IGN « recolle » un point au réseau routier le plus proche — un point dans la mer devient la pointe du Finistère. Un départ ou une arrivée recollés à plus de `RECOLLE_MAX_M` de ce qu'on
 *    a demandé sont refusés (`trajet_hors_reseau`) : sinon on dirait « parte à 9 h 12 » pour un trajet qui n'existe pas. Et une réponse dont la VITESSE n'est pas celle d'une voiture ou d'un
 *    piéton (`VITESSES`, sur plus d'un kilomètre) n'est pas crue non plus : une heure de départ fausse est pire que pas d'heure du tout.
 * ⛔ L'IGN borne chaque adresse IP (cinq itinéraires et cinquante géocodages par seconde) — et toutes les personnes passent par la MÊME adresse : le service s'impose des seaux en dessous
 *    (`parSeconde`), garde en mémoire ce qu'il a déjà demandé (`cache`), ne pose qu'UNE fois la même question à la fois (`enCours`), et fait ATTENDRE son tour à une demande qui trouve
 *    le seau vide (au plus `attenteMaxMs`, deux secondes : une rafale se lisse) ; au-delà, `trajet_occupe` (503, à réessayer) — plutôt que de faire refuser tout le monde par l'IGN.
 * ⛔ LA MÉMOIRE EST CELLE D'UNE PERSONNE (`qui`, son identifiant, dans chaque clé — relecture du gardien, 13 octobre 2026) : partagée, une réponse servie de mémoire (immédiate, sans toucher
 *    au seau) aurait dit à quelqu'un qu'une AUTRE personne venait de demander ce trajet ou cette adresse — le domicile d'un collègue se devine en essayant des adresses.
 * ⛔ UNE RÉPONSE SE LIT EN COMPTANT : plus d'`REPONSE_MAX` octets (annoncés par `content-length`, ou comptés au fil de la lecture), la lecture s'ARRÊTE et la demande est coupée — jamais une
 *    réponse entière en mémoire avant de la juger trop lourde.
 *
 *   creerTrajet({ cfg, fetch, horloge, journal, attenteMaxMs }) → { ouvert(), geocoder(texte, qui), itineraire(de, vers, mode, qui) }
 *   cfg : null (fermé) | { base, delaiMs, geocodageParSeconde, itineraireParSeconde, cacheMax }
 */
'use strict';

const MODES = { voiture: 'car', pied: 'pedestrian' };
const RECOLLE_MAX_M = 3000;
const REPONSE_MAX = 1048576;               // une réponse de l'IGN plus lourde qu'1 Mo n'est pas lue
const CACHE_GEO_MS = 24 * 3600000, CACHE_ITI_MS = 6 * 3600000;
const ATTENTE_MAX_MS = 2000;               // une demande attend son tour au plus deux secondes (le seau vide) ; au-delà, « occupé »
const VITESSES = { voiture: [1, 200], pied: [0.5, 10] };
/* les signes de contrôle ET les invisibles (bidi, largeur nulle, marque d'ordre) : la même règle que les champs de l'agenda (`routes-agenda.js`) — un libellé ne retourne pas le texte d'une notification */
const INVISIBLES = /[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g;
const nettoyer = (x) => x.normalize('NFC').replace(INVISIBLES, ' ').replace(/\s+/g, ' ').trim();   // km/h, sur un trajet de plus d'un kilomètre : en dehors, ce n'est pas une voiture ni un piéton (une réponse qui ne va pas)

const erreur = (code) => Object.assign(new Error(code), { code });
/* le corps d'une réponse, lu en COMPTANT : au-delà de `max` octets — annoncés ou lus —, la lecture s'arrête et la demande est coupée (`trop_lourd`) */
async function lireBorne(r, ctrl, max, journal) {
  const trop = () => { try { ctrl.abort(); } catch (e) { /* déjà coupée */ } journal('trop_lourd'); return erreur('trajet_indisponible'); };
  const annonce = r.headers && typeof r.headers.get === 'function' ? Number(r.headers.get('content-length')) : NaN;
  if (Number.isFinite(annonce) && annonce > max) throw trop();
  if (!r.body || typeof r.body.getReader !== 'function') { const t = await r.text(); if (Buffer.byteLength(t) > max) throw trop(); return t; }
  const lecteur = r.body.getReader(), morceaux = [];
  let total = 0;
  for (;;) {
    const { done, value } = await lecteur.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) { try { await lecteur.cancel(); } catch (e) { /* rien à défaire */ } throw trop(); }
    morceaux.push(value);
  }
  return Buffer.concat(morceaux).toString('utf8');
}
const arrondi = (x) => Math.round(x * 1e4) / 1e4;
const pointValide = (p) => !!p && Number.isFinite(p.lon) && Number.isFinite(p.lat) && p.lon >= -180 && p.lon <= 180 && p.lat >= -90 && p.lat <= 90;
/* la distance à vol d'oiseau, en mètres (la formule de haversine — assez juste pour dire « recollé trop loin ») */
function distanceM(a, b) {
  const R = 6371000, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
const lirePoint = (s) => { const m = /^(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(String(s || '')); return m ? { lon: Number(m[1]), lat: Number(m[2]) } : null; };
/* le texte d'une adresse, tel que l'IGN l'accepte : de 3 à 200 signes, qui commence par une lettre ou un chiffre */
function texteAdresse(t) {
  if (typeof t !== 'string') return null;
  const x = nettoyer(t).replace(/^[^\p{L}\p{N}]+/u, '');
  return x.length >= 3 && x.length <= 200 ? x : null;
}

function creerTrajet({ cfg, fetch: chercher = globalThis.fetch, horloge = Date.now, journal = () => {}, attenteMaxMs = ATTENTE_MAX_MS } = {}) {
  const ouvert = () => !!cfg;
  /* un seau par service : `parSeconde` jetons, qui se remplissent avec le temps. Seau vide, la demande RÉSERVE le jeton suivant (le compte passe sous zéro) et rend le temps à attendre son
     tour ; la suivante attend derrière elle. Rend -1 (occupé) quand ce tour viendrait au-delà de `attenteMaxMs`. */
  const seau = (parSeconde) => {
    let jetons = parSeconde, dernier = horloge();
    return () => {
      const t = horloge();
      jetons = Math.min(parSeconde, jetons + Math.max(0, t - dernier) * parSeconde / 1000); dernier = t;
      const attente = jetons >= 1 ? 0 : Math.ceil((1 - jetons) * 1000 / parSeconde);
      if (attente > attenteMaxMs) return -1;
      jetons -= 1;
      return attente;
    };
  };
  const seauGeo = cfg ? seau(cfg.geocodageParSeconde) : null, seauIti = cfg ? seau(cfg.itineraireParSeconde) : null;
  /* ce qu'on a déjà demandé (en mémoire seulement, jamais sur disque) : la même adresse ne repart pas chez l'IGN pendant un jour, le même trajet pendant six heures */
  const cache = new Map();
  const cacheLire = (k) => { const e = cache.get(k); if (!e) return undefined; if (e.jusqua <= horloge()) { cache.delete(k); return undefined; } cache.delete(k); cache.set(k, e); return e.v; };
  const cachePoser = (k, v, ms) => { cache.set(k, { v, jusqua: horloge() + ms }); while (cache.size > (cfg ? cfg.cacheMax : 0)) cache.delete(cache.keys().next().value); };
  /* la même question posée deux fois à la fois (un double toucher, deux personnes vers le même lieu) ne part qu'une fois : la seconde attend la réponse de la première */
  const enCours = new Map();
  const uneFois = (k, f) => { const p0 = enCours.get(k); if (p0) return p0; const p = f().finally(() => enCours.delete(k)); enCours.set(k, p); return p; };

  async function appeler(chemin, params, leSeau) {
    if (!cfg) throw erreur('trajet_ferme');
    const attente = leSeau();
    if (attente < 0) { journal('occupe'); throw erreur('trajet_occupe'); }
    if (attente > 0) await new Promise((ok) => setTimeout(ok, attente));
    const ctrl = new AbortController(), minuteur = setTimeout(() => ctrl.abort(), cfg.delaiMs);
    try {
      const r = await chercher(cfg.base + chemin + '?' + new URLSearchParams(params).toString(), { signal: ctrl.signal, headers: { Accept: 'application/json' }, redirect: 'error' });
      if (r.status === 429) { try { ctrl.abort(); } catch (e) { /* déjà coupée */ } journal('occupe'); throw erreur('trajet_occupe'); }   // le corps n'est pas lu : la demande est coupée (la connexion ne reste pas prise)
      const texte = await lireBorne(r, ctrl, REPONSE_MAX, journal);
      let j = null; try { j = JSON.parse(texte); } catch (e) { j = null; }
      return { statut: r.status, j };
    } catch (e) {
      if (e && (e.code === 'trajet_occupe' || e.code === 'trajet_indisponible' || e.code === 'trajet_ferme')) throw e;
      journal('echec'); throw erreur('trajet_indisponible');           // délai dépassé, réseau coupé, réponse illisible : un refus qui se dit, jamais une exception qui remonte
    } finally { clearTimeout(minuteur); }
  }

  /* une adresse → au plus quatre points, le meilleur d'abord : [{ label, lon, lat }] (vide : introuvable). `qui` : la personne qui demande (sa mémoire, à elle seule) */
  async function geocoder(t, qui = '') {
    const texte = texteAdresse(t);
    if (!texte) throw erreur('adresse_invalide');
    const cle = 'g:' + String(qui) + ':' + texte.toLowerCase();
    const deja = cacheLire(cle); if (deja) return deja;
    return uneFois(cle, async () => {
      const r = await appeler('/geocodage/search', { q: texte, limit: '4' }, seauGeo);
      if (r.statut === 400) throw erreur('adresse_invalide');
      if (r.statut !== 200 || !r.j || !Array.isArray(r.j.features)) { journal('echec'); throw erreur('trajet_indisponible'); }
      const l = [];
      for (const f of r.j.features.slice(0, 4)) {
        const c = f && f.geometry && Array.isArray(f.geometry.coordinates) ? f.geometry.coordinates : null;
        const label = f && f.properties && typeof f.properties.label === 'string' ? nettoyer(f.properties.label).slice(0, 200) : '';
        const p = c ? { lon: Number(c[0]), lat: Number(c[1]) } : null;
        if (label && pointValide(p)) l.push({ label, lon: p.lon, lat: p.lat });
      }
      cachePoser(cle, l, CACHE_GEO_MS);
      return l;
    });
  }

  /* de → vers (deux points), en voiture ou à pied → { minutes, km } (minutes entières, arrondies au-dessus : on ne promet pas d'arriver plus tôt que le trajet) */
  async function itineraire(de, vers, mode, qui = '') {
    if (!MODES[mode]) throw erreur('mode_invalide');
    if (!pointValide(de) || !pointValide(vers)) throw erreur('point_invalide');
    const a = { lon: arrondi(de.lon), lat: arrondi(de.lat) }, b = { lon: arrondi(vers.lon), lat: arrondi(vers.lat) };
    const cle = 'i:' + String(qui) + ':' + mode + ':' + a.lon + ',' + a.lat + '>' + b.lon + ',' + b.lat;
    const deja = cacheLire(cle); if (deja) return deja;
    return uneFois(cle, async () => {
      const r = await appeler('/navigation/itineraire', {
        resource: 'bdtopo-osrm', start: a.lon + ',' + a.lat, end: b.lon + ',' + b.lat, profile: MODES[mode], optimization: 'fastest',
        getSteps: 'false', getBbox: 'false', timeUnit: 'minute', distanceUnit: 'kilometer', geometryFormat: 'polyline',
      }, seauIti);
      if (r.statut !== 200 || !r.j) { if (r.statut >= 400 && r.statut < 500) throw erreur('trajet_impossible'); journal('echec'); throw erreur('trajet_indisponible'); }
      const duree = Number(r.j.duration), km = Number(r.j.distance);
      if (!Number.isFinite(duree) || duree < 0 || duree > 7 * 24 * 60 || !Number.isFinite(km) || km < 0 || km > 5000) { journal('echec'); throw erreur('trajet_indisponible'); }
      /* ⛔ un point recollé trop loin de ce qu'on a demandé : ce n'est pas le trajet qu'on cherchait (la mer, l'étranger) */
      const sa = lirePoint(r.j.start), sb = lirePoint(r.j.end);
      if (!sa || !sb || distanceM(a, sa) > RECOLLE_MAX_M || distanceM(b, sb) > RECOLLE_MAX_M) { journal('hors_reseau'); throw erreur('trajet_hors_reseau'); }
      /* ⛔ une vitesse qui n'est ni celle d'une voiture ni celle d'un piéton (sur plus d'un kilomètre) : la réponse ne va pas — on ne promet pas une heure de départ dessus */
      const kmh = km / (Math.max(duree, 0.01) / 60), [vMin, vMax] = VITESSES[mode];
      if (km > 1 && (kmh < vMin || kmh > vMax)) { journal('invraisemblable'); throw erreur('trajet_indisponible'); }
      const v = { minutes: Math.max(1, Math.ceil(duree)), km: Math.round(km * 10) / 10 };
      cachePoser(cle, v, CACHE_ITI_MS);
      return v;
    });
  }

  return { ouvert, geocoder, itineraire };
}

/* ── CE QU'UN RENDEZ-VOUS RANGE DE SON TRAJET (la page l'envoie avec le rendez-vous, après l'avoir fait calculer) ──────────────────────────────────────────────────────
   { minutes: 1…1440, km: 0…5000, mode: 'voiture'|'pied', avance: 0|5|10|15 (arriver en avance), depart: 'position'|'domicile'|'travail'|'adresse', depart_label, vers_label } — ou null (aucun).
   ⛔ Ce sont les données de la personne, pour SA notification : le service ne recalcule rien à l'enregistrement (un rendez-vous s'enregistre même quand l'IGN ne répond pas). */
const AVANCES = [0, 5, 10, 15], DEPARTS = ['position', 'domicile', 'travail', 'adresse'], LABEL_MAX = 200;
function validerTrajet(t) {
  if (t === null) return { trajet: null };
  if (!t || typeof t !== 'object' || Array.isArray(t)) return { erreur: 'trajet_invalide' };
  const minutes = t.minutes, km = t.km;
  if (!Number.isSafeInteger(minutes) || minutes < 1 || minutes > 1440) return { erreur: 'trajet_invalide' };
  if (typeof km !== 'number' || !Number.isFinite(km) || km < 0 || km > 5000) return { erreur: 'trajet_invalide' };
  if (!MODES[t.mode] || !AVANCES.includes(t.avance) || !DEPARTS.includes(t.depart)) return { erreur: 'trajet_invalide' };
  const label = (x) => typeof x === 'string' ? nettoyer(x) : null;
  const dl = label(t.depart_label), vl = label(t.vers_label);
  if (dl === null || vl === null || !vl || dl.length > LABEL_MAX || vl.length > LABEL_MAX) return { erreur: 'trajet_invalide' };
  return { trajet: { minutes, km: Math.round(km * 10) / 10, mode: t.mode, avance: t.avance, depart: t.depart, depart_label: dl, vers_label: vl } };
}
/* combien de minutes AVANT le début faut-il partir (le trajet, plus l'avance voulue) — null sans trajet */
const avantDepart = (t) => t && Number.isSafeInteger(t.minutes) ? t.minutes + (Number.isSafeInteger(t.avance) ? t.avance : 0) : null;

module.exports = { creerTrajet, validerTrajet, avantDepart, texteAdresse, distanceM, MODES, AVANCES, DEPARTS, RECOLLE_MAX_M, ATTENTE_MAX_MS, REPONSE_MAX, VITESSES };
