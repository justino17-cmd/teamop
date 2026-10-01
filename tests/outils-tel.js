/* ══ OUTILS COMMUNS DES BANCS DU COMPTE PAR TÉLÉPHONE (tests/test-912 à 918) ═══════════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il porte :
 *   · `fauxOvhService` — un FAUX OVHcloud local : il lit l'heure, REFUSE toute requête dont la signature « $1$ » ne se recalcule pas
 *     (avec SON calcul, écrit ici, jamais celui du module) et note chaque SMS demandé (numéro, texte) pour que le banc sache ce que le
 *     service a VRAIMENT envoyé — c'est la seule façon, sans prestataire, de lire un code ;
 *   · `lancerTel` — le VRAI service lancé isolé, configuré pour envoyer à ce faux OVH, avec la porte de TEST des codes (un fichier où
 *     le service écrit le code en clair — refusée en production) et une horloge décalable ;
 *   · de quoi fabriquer des numéros et des adresses DISTINCTS (chaque plafond compte par numéro, par réseau /24 et par appareil :
 *     un banc qui réutilise une adresse use le plafond du banc d'à côté).
 */
'use strict';
const http = require('http'), crypto = require('crypto'), fs = require('fs'), path = require('path');
const T = require('./outils-msg');

const APP = 'appkey-banc-1234', SECRET = 'secret-banc-ABCDEF123456', CONSUMER = 'consumer-banc-9876', SERVICE = 'sms-bb123456-1';
const sha1 = (s) => crypto.createHash('sha1').update(s).digest('hex');

async function fauxOvhService() {
  const etat = { jobs: [], mode: 'normal', credits: undefined, signaturesFausses: 0 };
  const srv = http.createServer((req, res) => {
    let b = ''; req.on('data', d => { b += d; });
    req.on('end', () => {
      const rep = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
      if (req.url === '/1.0/auth/time') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end(String(Math.floor(Date.now() / 1000))); }
      const ts = req.headers['x-ovh-timestamp'];
      const urlComplete = etat.base + req.url.replace(/^\/1\.0/, '');
      const attendue = '$1$' + sha1([SECRET, CONSUMER, req.method, urlComplete, b, ts].join('+'));
      if (req.headers['x-ovh-signature'] !== attendue || req.headers['x-ovh-application'] !== APP || req.headers['x-ovh-consumer'] !== CONSUMER) {
        etat.signaturesFausses++; return rep(401, { message: 'Invalid signature' });
      }
      if (req.method === 'GET' && req.url === '/1.0/sms/' + SERVICE) return rep(200, { name: SERVICE, creditsLeft: 4000, status: 'enable' });
      if (etat.mode === 'pend') return;
      if (etat.mode === '403') return rep(403, { message: 'This call has not been granted' });
      if (etat.mode === '500') return rep(500, { message: 'Internal error' });
      if (etat.mode === '503') return rep(503, { message: 'Service Unavailable' });       // le travail n'a pas commencé : rien n'est parti
      if (etat.mode === '400') return rep(400, { message: 'Bad request : not enough credits' }); // un refus franc d'OVH qui n'est PAS « numéro invalide » (crédits épuisés…)
      const m = /^\/1\.0\/sms\/([^/]+)\/jobs$/.exec(req.url);
      if (!m || req.method !== 'POST' || decodeURIComponent(m[1]) !== SERVICE) return rep(404, { message: 'route inconnue' });
      let j = {}; try { j = JSON.parse(b); } catch (e) { return rep(400, { message: 'JSON' }); }
      if (etat.mode === 'invalide') return rep(200, { totalCreditsRemoved: 0, validReceivers: [], invalidReceivers: j.receivers, ids: [] });
      etat.jobs.push({ numero: j.receivers && j.receivers[0], message: j.message, sender: j.sender, noStopClause: j.noStopClause });
      /* Sans `credits` posé, la réponse n'annonce AUCUN coût réel : le budget garde alors son estimation (c'est ce que les bancs de budget veulent mesurer). */
      rep(200, Object.assign({ validReceivers: j.receivers, invalidReceivers: [], ids: [1], creditsLeft: 4000 }, etat.credits === undefined ? {} : { totalCreditsRemoved: etat.credits }));
    });
  });
  const port = await T.portLibre();
  await new Promise(r => srv.listen(port, '127.0.0.1', r));
  etat.base = 'http://127.0.0.1:' + port + '/1.0';
  etat.fermer = () => new Promise(r => { try { srv.closeAllConnections(); } catch (e) {} srv.close(() => r()); });
  etat.identifiants = { appKey: APP, appSecret: SECRET, consumerKey: CONSUMER, serviceName: SERVICE, expediteur: 'OPMSG', urlBase: etat.base, timeoutMs: 2500 };
  return etat;
}

/* Le service, avec son faux OVH. `opts.sms` complète la configuration `sms.*` ; `opts.sansOvh` : aucun identifiant (mode « journal » en
   bêta, « inactif » en production) ; `opts.dossier` : un dossier partagé pour REDÉMARRER sur la même base. */
async function lancerTel(opts = {}) {
  const ovh = opts.ovh || (opts.sansOvh ? null : await fauxOvhService());
  const racine = opts.dossier || require('fs').mkdtempSync(path.join(require('os').tmpdir(), 'banc-tel-'));
  const fichierCodes = path.join(racine, 'codes-test.jsonl');
  const sms = Object.assign({}, ovh ? { ovh: ovh.identifiants } : {}, opts.sms || {});
  const env = Object.assign({}, opts.testCodes === false ? {} : { OPMSG_TEST_CODES: fichierCodes }, opts.env || {});
  const svc = await T.lancerService(Object.assign({ horloge: true, instance: 'beta' }, opts, { dossier: racine, config: Object.assign({}, opts.config || {}, { sms }), env }));
  svc.ovh = ovh; svc.fichierCodes = fichierCodes; svc.racineTel = racine;
  /* Le dernier code écrit pour un numéro (la porte de test) : on le SONDE, on ne dort pas. */
  svc.code = async (e164) => T.attendre(() => {
    let l = []; try { l = fs.readFileSync(fichierCodes, 'utf8').split('\n').filter(Boolean).map(x => JSON.parse(x)); } catch (e) { return null; }
    const m = l.filter(x => x.n === e164); return m.length ? m[m.length - 1].code : null;
  }, 4000, 10);
  const arreterBase = svc.arreter;
  svc.arreter = async (nettoyer = true) => { await arreterBase(false); if (ovh && !opts.ovh) await ovh.fermer(); if (nettoyer && !opts.dossier) { try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} } };
  return svc;
}

let cptNum = 0, cptIp = 0;
const aleaSuffixe = crypto.randomInt(0, 90);
/* Un numéro belge mobile NEUF (unique pour tout le banc). */
const numeroBE = () => '+32470' + String(100000 + aleaSuffixe * 1000 + (cptNum++)).slice(-6);
/* Une adresse dans un /24 NEUF (chaque banc a ses réseaux) ; `dans(ip)` en rend une autre du MÊME /24. */
const reseauNeuf = () => { const n = cptIp++; return '100.' + (64 + (n >> 8)) + '.' + (n & 255) + '.' + 10; };
const memeReseau = (ip, k) => ip.replace(/\.\d+$/, '.' + (20 + (k % 200)));

/* Inscrit un compte par numéro de bout en bout : demande, lit le code, prouve. Rend le client connecté. */
async function inscrire(svc, e164, prenom, opts = {}) {
  const ip = opts.ip || reseauNeuf();
  const c = T.client(svc.base, { xff: ip });
  const a = await c.post('/api/tel/code', { numero: e164 });
  if (a.code !== 200) throw new Error('inscription : /api/tel/code a répondu ' + a.code + ' ' + JSON.stringify(a.j));
  const code = await svc.code(e164);
  const b = await c.post('/api/tel/verifier', { numero: e164, code, prenom, nom: opts.nom === undefined ? 'Banc' : opts.nom, appareil: 'banc' });
  if (b.code !== 200) throw new Error('inscription : /api/tel/verifier a répondu ' + b.code + ' ' + JSON.stringify(b.j));
  c.moi = b.j.moi; c.numero = e164; c.ip = ip;
  return c;
}

/* Résout une preuve de travail : le plus petit nonce qui donne `bits` zéros en tête de SHA-256(jeton:nonce). */
function resoudre(jeton, bits) {
  const zeros = (buf) => { let n = 0; for (const o of buf) { if (o === 0) { n += 8; continue; } n += Math.clz32(o) - 24; break; } return n; };
  for (let i = 0; i < 5e7; i++) { const nonce = i.toString(36); if (zeros(crypto.createHash('sha256').update(jeton + ':' + nonce).digest()) >= bits) return nonce; }
  throw new Error('preuve de travail introuvable');
}

/* Tous les octets d'un dossier de données (base, journal WAL…) — pour chercher ce qui n'a rien à y faire. */
function octetsDe(dossier) {
  let b = Buffer.alloc(0);
  const aller = (d) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) aller(p); else { try { b = Buffer.concat([b, fs.readFileSync(p)]); } catch (e) {} } } };
  aller(dossier);
  return b;
}

const MIN = 60000, HEURE = 3600000, JOUR = 86400000;
module.exports = { fauxOvhService, lancerTel, numeroBE, reseauNeuf, memeReseau, inscrire, resoudre, octetsDe, MIN, HEURE, JOUR, APP, SECRET, CONSUMER, SERVICE };
