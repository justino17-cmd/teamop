/* ══ OP COURRIER — LE SERVEUR DE SIGNATURE ═══════════════════════════════════════════════════════════════════════════════════
 * Service À PART (décision de Justin, 18 octobre 2026) : ni `server/` (OP GESTION) ni `server-msg/` (OP MESSAGES). Il fait signer des documents
 * par Yousign pour le module OP Courrier (`opcourrier.js`, capacité `signature`). Première brique du serveur d'OP Courrier ; la lecture des
 * boîtes viendra à côté, dans le même service.
 *
 * Routes (toutes sous /api/signature, jeton de la Tour — voir auth.js) :
 *   POST   /demandes                          crée un brouillon { titre, type, niveau:'avance'|'simple', jours:7|15|30, relances, signataires:[{nom,email,telephone}], contresignature:{nom,email,telephone} }
 *   PUT    /demandes/:id/documents?nom=…      le PDF EN FLUX (Content-Type: application/pdf, ≤ 25 Mo, octets %PDF- vérifiés) — jusqu'à 5 par demande
 *   POST   /demandes/:id/activer              envoie chez Yousign : les signataires reçoivent leur lien
 *   GET    /demandes[/:id]                    l'état ; POST /demandes/:id/relancer ; POST /demandes/:id/annuler ; DELETE /demandes/:id (efface une demande finie)
 *   GET    /demandes/:id/documents/:n/signe   le PDF signé ; GET /demandes/:id/preuves/:i   le dossier de preuve du signataire i
 * Publiques : GET /health ; POST /webhook/yousign (HMAC SHA-256 vérifié sur le corps BRUT, identifiant d'événement retenu).
 */
'use strict';
const crypto = require('crypto');
const express = require('express');
const { charger } = require('./config');
const { creerScelle } = require('./scelle');
const { ouvrirStockage } = require('./stockage');
const { creerYousign } = require('./yousign');
const { creerAuth } = require('./auth');
const { creerLimiteur } = require('./limites');
const { creerDemandes, Refus, MAX_PDF } = require('./demandes');

const MIN = 60000, H = 3600000, JOUR = 24 * H;
const QUOTAS = {
  ip: { max: 300, fenetreMs: MIN },                 // toutes les requêtes d'une adresse
  echecAuth: { max: 20, fenetreMs: 15 * MIN },      // jetons refusés par adresse (ce service ne sert pas de relais de devinette)
  creation: { max: 20, fenetreMs: H },              // brouillons par personne
  depot: { max: 60, fenetreMs: H },                 // PDF déposés par personne
  activation: { max: 15, fenetreMs: H },            // envois chez Yousign par personne
  sms: { max: 50, fenetreMs: JOUR },                // SMS (signataires en niveau avancé) par personne et par jour
  relance: { max: 30, fenetreMs: JOUR },
  webhook: { max: 600, fenetreMs: MIN },
};

/* Une ligne de journal : un objet à clés BLANCHES (jamais une adresse, un nom, un téléphone, une IP). */
const CLES_JOURNAL = new Set(['id', 'etat', 'nom', 'etape', 'statut', 'code', 'route', 'ms', 'raison', 'n']);
function ecrireJournal(evt, champs) {
  const o = { t: new Date().toISOString(), evt };
  for (const k of Object.keys(champs || {})) if (CLES_JOURNAL.has(k) && (typeof champs[k] === 'string' || typeof champs[k] === 'number')) o[k] = String(champs[k]).slice(0, 80);
  process.stdout.write(JSON.stringify(o) + '\n');
}

function creerApp({ config, fetchImpl = fetch, horloge = Date.now, journal = ecrireJournal }) {
  const scelle = creerScelle(config.kek);
  const stockage = ouvrirStockage({ data: config.data, scelle, horloge });
  const yousign = config.yousign.cleApi ? creerYousign({ cleApi: config.yousign.cleApi, urlApi: config.yousign.urlApi, fetchImpl }) : null;
  const auth = creerAuth({ gestionUrl: config.gestion.url, timeoutMs: config.gestion.timeoutMs, fetchImpl, horloge });
  const lim = creerLimiteur(horloge);
  const q = (nom) => Object.assign({}, QUOTAS[nom], (config.quotas || {})[nom]);
  const demandes = creerDemandes({ stockage, yousign, config, horloge, journal });
  const secretWebhook = config.yousign.secretWebhook;

  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', 1);   // derrière nginx : req.ip est l'adresse que NGINX a vue, jamais un en-tête brut du client

  app.use((req, res, next) => {
    res.set({ 'X-Content-Type-Options': 'nosniff', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'", 'Referrer-Policy': 'no-referrer' });
    const o = req.headers.origin;
    if (o && config.origines.includes(o)) {
      res.set({ 'Access-Control-Allow-Origin': o, Vary: 'Origin', 'Access-Control-Allow-Headers': 'Authorization, Content-Type', 'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS', 'Access-Control-Max-Age': '600', 'Access-Control-Expose-Headers': 'Content-Disposition' });
    }
    if (req.method === 'OPTIONS') return res.status(204).end();
    const l = lim.prendre('ip:' + req.ip, q('ip').max, q('ip').fenetreMs);
    if (!l.ok) return res.set('Retry-After', String(l.reessayerS)).status(429).json({ error: 'trop_de_requetes' });
    next();
  });

  app.get('/health', (req, res) => {
    res.json({ ok: true, service: 'opcourrier', instance: config.instance, sha: config.sha, signature: { pret: !!(yousign && secretWebhook), sandbox: config.yousign.sandbox } });
  });

  /* ── Le webhook Yousign : corps BRUT (le HMAC se calcule sur les octets reçus), idempotent ── */
  app.post('/api/signature/webhook/yousign', express.raw({ type: () => true, limit: '256kb' }), async (req, res) => {
    const l = lim.prendre('wh:' + req.ip, q('webhook').max, q('webhook').fenetreMs);
    if (!l.ok) return res.status(429).json({ error: 'trop_de_requetes' });
    if (!secretWebhook) return res.status(503).json({ error: 'signature_non_configuree' });
    const corps = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
    const recu = String(req.headers['x-yousign-signature-256'] || '').replace(/^sha256=/i, '').trim().toLowerCase();
    const attendu = crypto.createHmac('sha256', secretWebhook).update(corps).digest();
    const obtenu = /^[0-9a-f]{64}$/.test(recu) ? Buffer.from(recu, 'hex') : Buffer.alloc(0);
    if (obtenu.length !== attendu.length || !crypto.timingSafeEqual(obtenu, attendu)) { journal('webhook_refuse', { raison: obtenu.length ? 'signature' : 'absente' }); return res.status(401).json({ error: 'signature_invalide' }); }
    let ev; try { ev = JSON.parse(corps.toString('utf8')); } catch (e) { return res.status(400).json({ error: 'json_invalide' }); }
    const eid = ev && typeof ev.event_id === 'string' ? ev.event_id : '';
    if (!eid || eid.length > 200) return res.status(400).json({ error: 'evenement_sans_identifiant' });
    if (!stockage.evenementNeuf(eid)) return res.json({ ok: true, deja: true });   // même événement reçu deux fois : traité une fois
    try { const r = await demandes.appliquerEvenement(ev); journal('webhook', { nom: String(ev.event_name || '').slice(0, 60), raison: r.raison || 'traite' }); res.json({ ok: true }); }
    catch (e) { stockage.evenementOter(eid); journal('webhook_echec', { nom: String(ev.event_name || '').slice(0, 60) }); res.status(500).json({ error: 'echec' }); }   // oublié : Yousign réessaiera
  });

  /* ── Tout le reste : la personne d'abord (avant d'avaler un seul octet de corps) ── */
  const api = express.Router();
  api.use(async (req, res, next) => {
    const v = await auth.verifier(req.headers.authorization);
    if (!v.ok) {
      if (v.statut !== 503) {
        const l = lim.prendre('echec:' + req.ip, q('echecAuth').max, q('echecAuth').fenetreMs);
        if (!l.ok) return res.set('Retry-After', String(l.reessayerS)).status(429).json({ error: 'trop_de_requetes' });
      }
      return res.status(v.statut).json({ error: v.code });
    }
    req.proprio = v.proprio; next();
  });
  const limiter = (nom, poids) => (req, res, next) => {
    const w = typeof poids === 'function' ? poids(req) : 1;
    const l = lim.prendre(nom + ':' + req.proprio, q(nom).max, q(nom).fenetreMs, w);
    if (!l.ok) return res.set('Retry-After', String(l.reessayerS)).status(429).json({ error: 'trop_de_demandes', quota: nom });
    next();
  };
  const sync = (f) => async (req, res) => {
    try { await f(req, res); }
    catch (e) {
      if (e instanceof Refus) return res.status(e.statut).json(Object.assign({ error: e.code }, e.plus || {}));
      if (process.env.OPCOURRIER_DEBUG) console.error(e); journal('erreur', { route: req.route && req.route.path, code: e && e.code || 'interne' }); res.status(500).json({ error: 'erreur_interne' });
    }
  };
  const json = express.json({ limit: '64kb' });

  api.get('/demandes', sync((req, res) => res.json({ demandes: demandes.lister(req.proprio) })));
  api.post('/demandes', limiter('creation'), json, sync((req, res) => res.status(201).json(demandes.creer(req.proprio, req.body))));
  api.get('/demandes/:id', sync((req, res) => res.json(demandes.lire(req.proprio, req.params.id))));
  api.put('/demandes/:id/documents', limiter('depot'), (req, res, next) => {
    demandes.lireBrut(req.proprio, req.params.id);   // la demande est bien à cette personne AVANT d'avaler 25 Mo (jette Refus)
    if (!/^application\/pdf(\s*;|$)/i.test(String(req.headers['content-type'] || ''))) throw new Refus(415, 'type_pdf_requis');
    const n = Number(req.headers['content-length']);
    if (n > MAX_PDF) throw new Refus(413, 'pdf_trop_gros');
    next();
  }, express.raw({ type: 'application/pdf', limit: MAX_PDF }), sync((req, res) => {
    res.status(201).json(demandes.ajouterDocument(req.proprio, req.params.id, req.query.nom, Buffer.isBuffer(req.body) ? req.body : null));
  }));
  api.post('/demandes/:id/activer', limiter('activation'), (req, res, next) => {
    try { const rec = demandes.lireBrut(req.proprio, req.params.id); req.poidsSms = demandes.poidsSms(rec); next(); }
    catch (e) { if (e instanceof Refus) return res.status(e.statut).json({ error: e.code }); next(e); }
  }, (req, res, next) => { if (!req.poidsSms) return next(); return limiter('sms', () => req.poidsSms)(req, res, next); }, sync(async (req, res) => res.json(await demandes.activer(req.proprio, req.params.id))));
  api.post('/demandes/:id/relancer', limiter('relance'), sync(async (req, res) => res.json(await demandes.relancer(req.proprio, req.params.id))));
  api.post('/demandes/:id/annuler', sync(async (req, res) => res.json(await demandes.annuler(req.proprio, req.params.id))));
  api.delete('/demandes/:id', sync((req, res) => res.json(demandes.effacer(req.proprio, req.params.id))));
  const envoyerPdf = (res, { nom, pdf }) => {
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': "attachment; filename*=UTF-8''" + encodeURIComponent(nom), 'Content-Length': String(pdf.length) }).end(pdf);
  };
  api.get('/demandes/:id/documents/:n/signe', sync(async (req, res) => envoyerPdf(res, await demandes.pdfSigne(req.proprio, req.params.id, req.params.n))));
  api.get('/demandes/:id/preuves/:i', sync(async (req, res) => envoyerPdf(res, await demandes.preuve(req.proprio, req.params.id, req.params.i))));
  app.use('/api/signature', api);

  app.use((req, res) => res.status(404).json({ error: 'introuvable' }));
  // eslint-disable-next-line no-unused-vars
  app.use((e, req, res, next) => {
    if (e instanceof Refus) return res.status(e.statut).json({ error: e.code });
    if (e && e.type === 'entity.too.large') return res.status(413).json({ error: 'trop_gros' });
    if (e && e.type === 'entity.parse.failed') return res.status(400).json({ error: 'json_invalide' });
    if (process.env.OPCOURRIER_DEBUG) console.error(e);
    journal('erreur', { code: e && e.code || 'interne' }); res.status(500).json({ error: 'erreur_interne' });
  });

  let minuterie = null;
  return {
    app, demandes, stockage, auth, limiteur: lim,
    demarrerMenage(ms = 10 * MIN) { minuterie = setInterval(() => { demandes.balayer().catch(() => journal('menage_echec', {})); }, ms); minuterie.unref(); },
    fermer() { if (minuterie) clearInterval(minuterie); stockage.fermer(); },
  };
}

if (require.main === module) {
  let config;
  try { config = charger(); } catch (e) { console.error('✗ démarrage refusé : ' + e.message); process.exit(1); }
  const s = creerApp({ config });
  s.demarrerMenage(); s.demandes.balayer().catch(() => {});
  const serveur = s.app.listen(config.port, '127.0.0.1', () => ecrireJournal('demarrage', { raison: config.instance, n: config.port }));
  const arret = () => { serveur.close(() => { s.fermer(); process.exit(0); }); setTimeout(() => process.exit(0), 5000).unref(); };
  process.on('SIGTERM', arret); process.on('SIGINT', arret);
}
module.exports = { creerApp, QUOTAS };
