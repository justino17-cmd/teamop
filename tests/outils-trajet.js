/* ══ UN FAUX SERVICE DE L'IGN POUR LES BANCS DU TRAJET (13 octobre 2026) ══════════════════════════════════════════════════════════════════════════════════════════════════
   Le service calcule les trajets chez la Géoplateforme de l'IGN (`server-msg/trajet.js`) ; aucun banc ne sort sur Internet. Ce faux répond aux deux mêmes chemins, avec les mêmes formes :
     · GET /geocodage/search?q=…&limit=…  → une FeatureCollection (le carnet d'adresses ci-dessous ; « introuvable » dans la question : aucune) ;
     · GET /navigation/itineraire?start=lon,lat&end=lon,lat&profile=car|pedestrian  → { duration (minutes), distance (km), start, end } — la durée se déduit de la distance à vol d'oiseau
       (voiture 40 km/h, à pied 5 km/h), pour que le banc la RECALCULE et ne la recopie pas ; un point « dans la mer » est recollé à la pointe du Finistère, comme le fait l'IGN.
   `etat` : `statut` (forcer une réponse : 429, 500…), `statuts` (la forcer sur UN chemin : { '/navigation/itineraire': 500 }), `lentMs` (répondre en retard), `appels` (chaque question
   reçue — le banc y vérifie ce qui part, et ce qui ne part pas). */
'use strict';
const http = require('http');

const CARNET = [
  { cle: '8 rue de rivoli', label: '8 Rue de Rivoli 75004 Paris', lon: 2.360909, lat: 48.855372 },
  { cle: '8 rue de rivoli', label: '8 Rue de Rivoli 75001 Paris', lon: 2.34004, lat: 48.86003 },
  { cle: 'clinique du parc', label: 'Clinique du Parc 69006 Lyon', lon: 4.852, lat: 45.7735 },
  { cle: '12 rue des lilas', label: '12 Rue des Lilas 78000 Versailles', lon: 2.1301, lat: 48.8049 },
  { cle: '3 avenue de la gare', label: '3 Avenue de la Gare 69003 Lyon', lon: 4.8597, lat: 45.7606 },
  { cle: 'tour eiffel', label: 'Tour Eiffel 75007 Paris', lon: 2.2945, lat: 48.8584 },
  { cle: 'ocean', label: 'Océan Atlantique', lon: -30, lat: 45 },
];
function distanceKm(a, b) {
  const R = 6371, rad = (d) => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}
/* la durée que le faux annonce — le banc la recalcule de son côté avec la MÊME formule (ce n'est pas une constante recopiée) */
const dureeMinutes = (a, b, profil) => distanceKm(a, b) / (profil === 'pedestrian' ? 5 : 40) * 60;
const FINISTERE = { lon: -4.719789, lat: 48.033694 };

async function fauxIgn() {
  const etat = { statut: null, statuts: {}, lentMs: 0, appels: [] };
  const serveur = http.createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x');
    etat.appels.push({ chemin: u.pathname, params: Object.fromEntries(u.searchParams), entetes: req.headers });
    if (etat.lentMs) await new Promise(r => setTimeout(r, etat.lentMs));
    const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
    const force = etat.statuts[u.pathname] || etat.statut;
    if (force) return json(force, { code: force, message: 'forcé par le banc' });
    if (u.pathname === '/geocodage/search') {
      const q = (u.searchParams.get('q') || '').toLowerCase();
      if (q.length < 3) return json(400, { code: 400, message: 'Failed parsing query' });
      const lim = Math.min(10, Number(u.searchParams.get('limit')) || 10);
      /* l'adresse EXACTE d'abord (l'IGN la classe en tête : c'est ainsi qu'on choisit « Plutôt : … » en renvoyant son libellé), puis celles qui contiennent la question */
      const exactes = CARNET.filter(c => c.label.toLowerCase() === q), proches = CARNET.filter(c => q.includes(c.cle) && !exactes.includes(c));
      const f = /introuvable/.test(q) ? [] : exactes.concat(proches).slice(0, lim)
        .map(c => ({ type: 'Feature', geometry: { type: 'Point', coordinates: [c.lon, c.lat] }, properties: { label: c.label, score: 0.9 } }));
      return json(200, { type: 'FeatureCollection', features: f, query: q });
    }
    if (u.pathname === '/navigation/itineraire') {
      const p = (s) => { const [lon, lat] = String(s || '').split(',').map(Number); return { lon, lat }; };
      const a = p(u.searchParams.get('start')), b = p(u.searchParams.get('end')), profil = u.searchParams.get('profile');
      if (![a.lon, a.lat, b.lon, b.lat].every(Number.isFinite)) return json(400, { code: 400, message: 'bad points' });
      const recolle = (x) => x.lon < -20 ? FINISTERE : x;                         // la mer : recollé loin, comme l'IGN
      const sa = recolle(a), sb = recolle(b);
      return json(200, { resource: 'bdtopo-osrm', profile: profil, start: sa.lon + ',' + sa.lat, end: sb.lon + ',' + sb.lat, duration: dureeMinutes(sa, sb, profil),
        distance: distanceKm(sa, sb) * 1.3, timeUnit: 'minute', distanceUnit: 'kilometer', geometry: 'abc' });
    }
    json(404, { code: 404 });
  });
  await new Promise(r => serveur.listen(0, '127.0.0.1', r));
  const url = 'http://127.0.0.1:' + serveur.address().port;
  return { url, etat, CARNET, dureeMinutes, distanceKm, fermer: () => new Promise(r => serveur.close(() => r())) };
}

module.exports = { fauxIgn, CARNET, dureeMinutes, distanceKm };
