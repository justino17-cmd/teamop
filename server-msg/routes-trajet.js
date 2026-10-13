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
 * Trente calculs par heure et par personne (les géocodages de Domicile/Travail comptent aussi) : assez pour régler un agenda, pas pour vider le seau de tout le monde.
 */
'use strict';
const { texteAdresse, MODES } = require('./trajet');

const LIEUX = ['domicile', 'travail'];
const NOM_LIEU = { domicile: 'Domicile', travail: 'Travail' };
const QUOTA = 30, QUOTA_MS = 3600000;

function installerTrajet(H, ctx) {
  const { stockage, quotas, trajet } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const ouvert = () => !!(trajet && trajet.ouvert());
  const plafond = (req, res) => {
    const q = quotas.essai('trajet:' + req.moi.id, QUOTA, QUOTA_MS);
    if (q.ok) return true;
    res.set('Retry-After', String(q.retry)); refus(res, 429, 'quota_atteint', { retry: q.retry }); return false;
  };
  /* une erreur du calcul → sa réponse (jamais une exception qui remonte) */
  const repondreErreur = (res, e, quoi) => {
    const c = e && e.code;
    if (c === 'trajet_occupe') { res.set('Retry-After', '2'); return refus(res, 503, 'trajet_occupe', { retry: 2 }); }
    if (c === 'trajet_ferme') return refus(res, 503, 'trajet_ferme');
    if (c === 'adresse_invalide') return refus(res, 400, 'adresse_invalide', quoi ? { quoi } : {});
    if (c === 'trajet_hors_reseau' || c === 'trajet_impossible') return refus(res, 400, 'trajet_impossible');
    return refus(res, 503, 'trajet_indisponible');
  };
  const vueLieux = (uid) => { const l = stockage.lieuxLire(uid); return { domicile: l.domicile ? { label: l.domicile.label } : null, travail: l.travail ? { label: l.travail.label } : null }; };

  H['trajet.calcul'] = async (req, res) => {
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
    if (!plafond(req, res)) return;
    try {
      const cands = await trajet.geocoder(vers);
      if (!cands.length) return refus(res, 400, 'adresse_introuvable', { quoi: 'vers' });
      if (departTexte) {
        const dc = await trajet.geocoder(departTexte);
        if (!dc.length) return refus(res, 400, 'adresse_introuvable', { quoi: 'depart' });
        depuis = { lon: dc[0].lon, lat: dc[0].lat, label: dc[0].label };
      }
      const r = await trajet.itineraire(depuis, cands[0], b.mode);
      /* ⛔ plus de vingt-quatre heures de route (à pied jusqu'à Lyon) : ce n'est pas un trajet de rendez-vous — et l'agenda n'en rangerait pas (`validerTrajet` : 1 440 minutes au plus) */
      if (r.minutes > 1440) return refus(res, 400, 'trajet_trop_long');
      res.json({ minutes: r.minutes, km: r.km, mode: b.mode, vers: { label: cands[0].label }, depuis: { type: d.type, label: depuis.label }, autres: cands.slice(1, 4).map(c => c.label) });
    } catch (e) { return repondreErreur(res, e, departTexte ? null : 'vers'); }
  };

  H['moi.lieux'] = (req, res) => res.json({ lieux: vueLieux(req.moi.id) });

  H['moi.lieux.poser'] = async (req, res) => {
    const b = corps(req);
    if (!LIEUX.includes(b.cle)) return refus(res, 400, 'champ_invalide');
    if (b.texte === null) { stockage.lieuPoser(req.moi.id, b.cle, null); return res.json({ lieux: vueLieux(req.moi.id), autres: [] }); }
    if (!ouvert()) return refus(res, 503, 'trajet_ferme');
    const texte = texteAdresse(b.texte);
    if (!texte) return refus(res, 400, 'adresse_invalide', { quoi: b.cle });
    if (!plafond(req, res)) return;
    try {
      const cands = await trajet.geocoder(texte);
      if (!cands.length) return refus(res, 400, 'adresse_introuvable', { quoi: b.cle });
      stockage.lieuPoser(req.moi.id, b.cle, { label: cands[0].label, lon: cands[0].lon, lat: cands[0].lat });
      res.json({ lieux: vueLieux(req.moi.id), autres: cands.slice(1, 4).map(c => c.label) });
    } catch (e) { return repondreErreur(res, e, b.cle); }
  };
}

module.exports = { installerTrajet, QUOTA, QUOTA_MS };
