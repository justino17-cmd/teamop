/* ══ LA PAGE PUBLIQUE DU SIGNATAIRE — ROUTES ET FICHIERS ═══════════════════════════════════════════════════════════════
 * Le signataire n'a PAS de compte : son lien est son seul accès. Routes publiques (aucun jeton de la Tour) :
 *   GET  /signer/signer.js · /signer/signer.css      les deux fichiers de la page (aucun script en ligne : la politique de sécurité n'en admet pas)
 *   GET  /signer/:lien                               la page (le même HTML pour tous les liens : le lien n'y est jamais recopié, donc rien à injecter)
 *   GET  /api/signer/:lien                           l'état de SA demande, et le texte de consentement
 *   GET  /api/signer/:lien/documents/:n              le PDF à lire
 *   POST /api/signer/:lien/code                      envoie le code à usage unique (SMS ou e-mail)
 *   POST /api/signer/:lien/signer                    { code, consentement:true, version } : signe
 * ⛔ UN LIEN INCONNU, PÉRIMÉ OU MAL FORMÉ répond partout la MÊME chose (404 « introuvable ») : on ne devine pas quelle demande existe.
 * ⛔ Plafonds PAR ADRESSE RÉSEAU (req.ip, jamais un en-tête brut) : lectures, envois de code (un SMS coûte), essais de signature. Le moteur ajoute les siens
 * par signataire (60 s entre deux codes, 5 envois, 5 essais par code).
 * ⛔ Politique de sécurité de la page : rien de tiers, `frame-src blob:` pour la visionneuse du PDF, jamais encadrable.
 */
'use strict';
const fs = require('fs'), path = require('path');
const express = require('express');
const { Refus } = require('./demandes');

const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-src blob:; base-uri 'none'; form-action 'none'; frame-ancestors 'none'";
const RE_LIEN = /^[A-Za-z0-9_-]{43}$/;

function creerSignataire({ moteur, lim, q, journal }) {
  const lire = (f) => fs.readFileSync(path.join(__dirname, 'public', f));
  const fichiers = { html: lire('signer.html'), js: lire('signer.js'), css: lire('signer.css') };
  const r = express.Router();
  const sans = (res, type) => res.set({ 'Content-Type': type, 'Content-Security-Policy': CSP, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer' });
  const plafond = (nom) => (req, res, next) => {
    const l = lim.prendre(nom + ':' + req.ip, q(nom).max, q(nom).fenetreMs);
    if (!l.ok) return res.set('Retry-After', String(l.reessayerS)).status(429).json({ error: 'trop_de_requetes' });
    next();
  };
  const introuvable = (res) => res.status(404).json({ error: 'introuvable' });
  const sync = (f) => async (req, res) => {
    try { await f(req, res); }
    catch (e) {
      if (e instanceof Refus) return res.status(e.statut).json(Object.assign({ error: e.code }, e.plus || {}));
      journal('erreur', { route: 'signer', code: e && e.code || 'interne' }); res.status(500).json({ error: 'erreur_interne' });
    }
  };
  const lien = (req, res, next) => (RE_LIEN.test(req.params.lien) ? next() : introuvable(res));

  r.get('/signer/signer.js', (req, res) => sans(res, 'text/javascript; charset=utf-8').end(fichiers.js));
  r.get('/signer/signer.css', (req, res) => sans(res, 'text/css; charset=utf-8').end(fichiers.css));
  r.get('/signer/:lien', (req, res) => { if (!RE_LIEN.test(req.params.lien)) return sans(res, 'text/html; charset=utf-8').status(404).end(fichiers.html); sans(res, 'text/html; charset=utf-8').end(fichiers.html); });

  const api = express.Router();
  api.get('/:lien', lien, plafond('lecture'), sync(async (req, res) => { const v = await moteur.consulter(req.params.lien); if (!v) return introuvable(res); res.json(v); }));
  api.get('/:lien/documents/:n', lien, plafond('lecture'), sync((req, res) => {
    const d = moteur.document(req.params.lien, req.params.n); if (!d) return introuvable(res);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline', 'Content-Length': String(d.pdf.length) }).end(d.pdf);
  }));
  api.post('/:lien/code', lien, plafond('code'), express.json({ limit: '2kb' }), sync(async (req, res) => res.json(await moteur.envoyerCode(req.params.lien, { ip: req.ip, ua: req.get('user-agent') }))));
  api.post('/:lien/signer', lien, plafond('essai'), express.json({ limit: '2kb' }), sync(async (req, res) => res.json(await moteur.signer(req.params.lien, req.body, { ip: req.ip, ua: req.get('user-agent') }))));
  r.use('/api/signer', api);
  return r;
}
module.exports = { creerSignataire, CSP };
