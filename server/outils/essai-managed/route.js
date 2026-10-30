/* LA ROUTE DE L'OUTIL MAISON DE L'ESSAI (30 octobre 2026) — `GET /api/essai-managed/faits`, lue par `lancer.js` sur le VPS lui-même.
 *
 * ⛔ ELLE N'EXISTE QUE SI `config.agents.essaiManaged` est allumé (au démarrage du service) : interrupteur coupé ou absent, `monter` ne touche pas à `app` et le
 *    serveur est strictement celui d'avant.
 * ⛔ GARDÉE PAR UN JETON, À PART : 48 hexadécimaux dans `<données>/essai-managed/jeton` (mode 600, créé par `poser.js`, jamais affiché), comparés en temps constant.
 *    Tout refus rend le même 404 — la route ne se dénonce pas. Une requête qui est passée par nginx porte `X-Forwarded-For` : elle est refusée aussi (le lanceur
 *    parle en direct à 127.0.0.1), et au plus 30 lectures par heure.
 * ⛔ ELLE NE REND QUE `faitsMax` : des nombres, des booléens, des clés de NOS tables, des phrases de NOTRE code. Aucune donnée de client, aucune écriture.
 *    Elle lit `santeCorps(false)` — jamais `/health`, qui vide la fenêtre des temps de réponse de la surveillance horaire.
 */
'use strict';
const crypto = require('crypto');
const C = require('./commun');
const { faitsMax } = require('./faits');

const PAR_HEURE = 30;

function monter(app, ctx) {
  ctx = ctx || {};
  if (!app || typeof app.get !== 'function') return false;
  if (!C.reglage(ctx.config).actif) return false;
  const p = C.chemins({ TEAMOP_DATA: ctx.DATA_DIR });
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const lectures = [];
  const empreinte = s => crypto.createHash('sha256').update(String(s)).digest();
  app.get('/api/essai-managed/faits', (req, res) => {
    const non = () => res.status(404).type('text/plain').send('Not found');
    try {
      if (req.headers['x-forwarded-for']) return non();
      const attendu = C.lireJeton(p);
      const m = /^Bearer\s+([a-f0-9]{48})$/.exec(String(req.headers.authorization || ''));
      if (!attendu || !m || !crypto.timingSafeEqual(empreinte(m[1]), empreinte(attendu))) return non();
      const now = maintenant();
      while (lectures.length && now - lectures[0] > 3600000) lectures.shift();
      if (lectures.length >= PAR_HEURE) return non();
      lectures.push(now);
      const j = typeof ctx.sante === 'function' ? JSON.parse(JSON.stringify(ctx.sante())) : null;
      res.set('Cache-Control', 'no-store');
      res.json(faitsMax(j, now, req.query && req.query.zone));
    } catch (e) { return non(); }
  });
  return true;
}

module.exports = { monter, PAR_HEURE };
