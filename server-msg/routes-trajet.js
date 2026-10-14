/* ══ LE TRAJET : LE CALCUL, ET DOMICILE / TRAVAIL (13 octobre 2026) ═════════════════════════════════════════════════════════════════════════════════════════════════════
 *   POST /api/trajet          S  { vers: '<le lieu>', depuis: { type: 'position', lon, lat } | { type: 'domicile' } | { type: 'travail' } | { type: 'adresse', texte }, mode: 'voiture'|'pied' }
 *                                → { minutes, km, mode, vers: { label }, depuis: { type, label }, autres: ['<un autre lieu possible>'…] }
 *   GET  /api/moi/lieux       S  → { lieux: { domicile: { label } | null, travail: { label } | null } }
 *   POST /api/moi/lieux       S  { cle: 'domicile'|'travail', texte: '<adresse>' | null } → { lieux, autres }   (null retire)
 *
 * La page ne parle à AUCUN tiers : c'est le service qui demande à l'IGN (`trajet.js`). ⛔ La position du moment (« Ma position ») sert à CE calcul et n'est rangée nulle part ; Domicile et
 * Travail se rangent scellés (`lieu_perso`), et le point d'un domicile ne revient jamais à la page (elle n'en a pas besoin : elle dit « Domicile », le service sait où c'est).
 * Les refus se disent par leur code : le lieu vide ou illisible, une adresse introuvable (`quoi` dit laquelle : « vers » ou « depart »), Domicile ou Travail pas encore enregistrés, un trajet
 * impossible (hors de France, la mer), trop long (plus de 24 heures : `trajet_trop_long`), le calcul indisponible (l'IGN ne répond pas — 503, réessayer) ou occupé (503, `retry`).
 * Trente calculs par heure et par personne (les géocodages de Domicile/Travail comptent aussi) : assez pour régler un agenda, pas pour vider le seau de tout le monde. ⛔ Ne compte que ce qui
 * a ABOUTI ou ATTEINT l'IGN : un « occupé » (notre seau, ou l'IGN qui dit 429) ou un trajet fermé rendent leur essai. Et deux calculs EN COURS au plus par personne (`trajet_en_cours`, 429) :
 * une page ouverte dix fois ne prend pas dix places dans le seau de tous (relecture du gardien, 13 octobre 2026).
 * ⛔ Chaque gestionnaire est ENVELOPPÉ : sur ce service, un rejet de promesse que personne ne rattrape arrête le processus (`index.js`, `unhandledRejection`) — une base occupée pendant un
 * calcul ne coupe pas les messages de tout le monde, elle rend 500 `erreur_interne` à cette demande-là.
 */
'use strict';
const { texteAdresse, MODES } = require('./trajet');

const LIEUX = ['domicile', 'travail'];
const NOM_LIEU = { domicile: 'Domicile', travail: 'Travail' };
const QUOTA = 30, QUOTA_MS = 3600000;
const EN_VOL_MAX = 2;

function installerTrajet(H, ctx) {
  const { stockage, quotas, trajet } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const ouvert = () => !!(trajet && trajet.ouvert());
  const cleQuota = (req) => 'trajet:' + req.moi.id;
  const plafond = (req, res) => {
    const q = quotas.essai(cleQuota(req), QUOTA, QUOTA_MS);
    if (q.ok) return true;
    res.set('Retry-After', String(q.retry)); refus(res, 429, 'quota_atteint', { retry: q.retry }); return false;
  };
  /* les calculs EN COURS, par personne (en mémoire : un compte, rien d'autre) */
  const enVol = new Map();
  const prendre = (uid) => { const n = enVol.get(uid) || 0; if (n >= EN_VOL_MAX) return false; enVol.set(uid, n + 1); return true; };
  const rendre = (uid) => { const n = (enVol.get(uid) || 1) - 1; if (n > 0) enVol.set(uid, n); else enVol.delete(uid); };
  /* une erreur du calcul → sa réponse (jamais une exception qui remonte). Ce qui n'a pas atteint l'IGN (occupé, fermé) rend son essai au plafond horaire. */
  const repondreErreur = (req, res, e, quoi) => {
    const c = e && e.code;
    if (c === 'trajet_occupe' || c === 'trajet_ferme') quotas.rembourser(cleQuota(req));
    if (c === 'trajet_occupe') { res.set('Retry-After', '2'); return refus(res, 503, 'trajet_occupe', { retry: 2 }); }
    if (c === 'trajet_ferme') return refus(res, 503, 'trajet_ferme');
    if (c === 'adresse_invalide') return refus(res, 400, 'adresse_invalide', quoi ? { quoi } : {});
    if (c === 'trajet_hors_reseau' || c === 'trajet_impossible') return refus(res, 400, 'trajet_impossible');
    return refus(res, 503, 'trajet_indisponible');
  };
  /* ⛔ l'enveloppe : une exception (la base occupée, un bogue) rend 500 à CETTE demande, jamais un rejet qui arrête le service */
  const enveloppe = (f) => async (req, res) => {
    try { await f(req, res); }
    catch (e) { if (!res.headersSent) refus(res, 500, 'erreur_interne'); }
  };
  /* un calcul qui part chez l'IGN : au plus `EN_VOL_MAX` à la fois par personne, la place rendue quoi qu'il arrive */
  const enCalcul = async (req, res, f) => {
    const uid = req.moi.id;
    if (!prendre(uid)) { res.set('Retry-After', '2'); return refus(res, 429, 'trajet_en_cours', { retry: 2 }); }
    try { return await f(); } finally { rendre(uid); }
  };
  const vueLieux = (uid) => { const l = stockage.lieuxLire(uid); return { domicile: l.domicile ? { label: l.domicile.label } : null, travail: l.travail ? { label: l.travail.label } : null }; };

  H['trajet.calcul'] = enveloppe(async (req, res) => {
    const b = corps(req);
    if (!ouvert()) return refus(res, 503, 'trajet_ferme');
    if (!MODES[b.mode]) return refus(res, 400, 'mode_invalide');
    if (typeof b.vers !== 'string' || !b.vers.trim()) return refus(res, 400, 'lieu_vide');
    const vers = texteAdresse(b.vers);
    if (!vers) return refus(res, 400, 'adresse_invalide', { quoi: 'vers' });
    const d = b.depuis && typeof b.depuis === 'object' && !Array.isArray(b.depuis) ? b.depuis : null;
    if (!d || !['position', 'domicile', 'travail', 'adresse'].includes(d.type)) return refus(res, 400, 'depart_invalide');
    let depuis = null, departTexte = null;
    if (d.type === 'position') {
      const lon = d.lon, lat = d.lat;
      if (typeof lon !== 'number' || typeof lat !== 'number' || !Number.isFinite(lon) || !Number.isFinite(lat) || lon < -180 || lon > 180 || lat < -90 || lat > 90) return refus(res, 400, 'position_invalide');
      depuis = { lon, lat, label: 'Ma position' };
    } else if (d.type === 'adresse') {
      departTexte = texteAdresse(d.texte);
      if (!departTexte) return refus(res, 400, 'adresse_invalide', { quoi: 'depart' });
    } else {
      const l = stockage.lieuxLire(req.moi.id)[d.type];
      if (!l) return refus(res, 400, 'lieu_absent', { quoi: d.type });
      depuis = { lon: l.lon, lat: l.lat, label: NOM_LIEU[d.type] };
    }
    const uid = req.moi.id;
    return enCalcul(req, res, async () => {
      if (!plafond(req, res)) return;
      try {
        const cands = await trajet.geocoder(vers, uid);
        if (!cands.length) return refus(res, 400, 'adresse_introuvable', { quoi: 'vers' });
        if (departTexte) {
          const dc = await trajet.geocoder(departTexte, uid);
          if (!dc.length) return refus(res, 400, 'adresse_introuvable', { quoi: 'depart' });
          depuis = { lon: dc[0].lon, lat: dc[0].lat, label: dc[0].label };
        }
        const r = await trajet.itineraire(depuis, cands[0], b.mode, uid);
        /* ⛔ plus de vingt-quatre heures de route (à pied jusqu'à Lyon) : ce n'est pas un trajet de rendez-vous — et l'agenda n'en rangerait pas (`validerTrajet` : 1 440 minutes au plus) */
        if (r.minutes > 1440) return refus(res, 400, 'trajet_trop_long');
        res.json({ minutes: r.minutes, km: r.km, mode: b.mode, vers: { label: cands[0].label }, depuis: { type: d.type, label: depuis.label }, autres: cands.slice(1, 4).map(c => c.label) });
      } catch (e) { return repondreErreur(req, res, e, departTexte ? null : 'vers'); }
    });
  });

  H['moi.lieux'] = enveloppe(async (req, res) => res.json({ lieux: vueLieux(req.moi.id) }));

  H['moi.lieux.poser'] = enveloppe(async (req, res) => {
    const b = corps(req);
    if (!LIEUX.includes(b.cle)) return refus(res, 400, 'champ_invalide');
    /* `false` : la personne n'est plus active (son compte s'efface pendant la demande) — rien n'est écrit, et la réponse est celle de la garde (401) */
    if (b.texte === null) { if (!stockage.lieuPoser(req.moi.id, b.cle, null)) return refus(res, 401, 'session_requise'); return res.json({ lieux: vueLieux(req.moi.id), autres: [] }); }
    if (!ouvert()) return refus(res, 503, 'trajet_ferme');
    const texte = texteAdresse(b.texte);
    if (!texte) return refus(res, 400, 'adresse_invalide', { quoi: b.cle });
    const uid = req.moi.id;
    return enCalcul(req, res, async () => {
      if (!plafond(req, res)) return;
      let cands;
      try { cands = await trajet.geocoder(texte, uid); } catch (e) { return repondreErreur(req, res, e, b.cle); }
      if (!cands.length) return refus(res, 400, 'adresse_introuvable', { quoi: b.cle });
      if (!stockage.lieuPoser(uid, b.cle, { label: cands[0].label, lon: cands[0].lon, lat: cands[0].lat })) return refus(res, 401, 'session_requise');
      res.json({ lieux: vueLieux(uid), autres: cands.slice(1, 4).map(c => c.label) });
    });
  });
}

module.exports = { installerTrajet, QUOTA, QUOTA_MS, EN_VOL_MAX };
