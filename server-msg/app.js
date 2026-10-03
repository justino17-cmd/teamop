/* ══ L'APPLICATION EXPRESS D'OP MESSAGES — MIDDLEWARES, GARDES, MONTAGE DU MANIFESTE ═════════
 *
 * Ce fichier assemble : les en-têtes de sécurité, le contrôle d'origine, les gardes de session
 * et d'appartenance, les routes du manifeste, le front statique. Aucune route n'est déclarée
 * ailleurs que dans la boucle de montage en bas (`tests/test-900.js` le compte).
 *
 * ⛔ PAS DE CORS. Le front est servi PAR ce service, donc de même origine : aucune réponse ne
 * porte `Access-Control-*`, et une page d'un autre site ne peut rien lire. Une écriture exige
 * en plus l'en-tête `Origin` de l'application ET un en-tête maison (`X-OPM: 1`) — un formulaire
 * envoyé depuis un autre site ne peut pas poser l'en-tête, un script de ce site ne passe pas
 * l'origine. Le cookie est `SameSite=Strict` par-dessus.
 * ⛔ `trust proxy 1` ET `req.ip` SEULEMENT. Un en-tête `X-Forwarded-For` lu à la main se falsifie :
 * avec `trust proxy 1`, Express ne retient que l'entrée posée par NOTRE proxy (la dernière).
 * ⛔ CORPS JSON ≤ 64 Ko. Les pièces (étape 4) passent en flux binaire, par `POST /api/pieces` (`routes-pieces.js`) : `express.json` ne lit que
 * les corps JSON, il laisse donc le flux d'une pièce à la route, qui le lit au fil de l'eau et s'arrête au maximum du genre.
 * ⛔ UN 404 NE DIT PAS POURQUOI : une conversation inexistante et une conversation dont on n'est
 * pas membre se confondent (garde M), un `:id` mal formé aussi.
 * ⛔ RIEN D'INTÉRIEUR DANS UNE ERREUR : le gestionnaire final répond `{error:'erreur_interne'}`
 * et ne journalise que le nom de l'erreur — jamais son message (il peut citer une requête, un
 * nom, un texte).
 */
const path = require('path'), crypto = require('crypto');
const express = require('express');
const { MANIFESTE } = require('./manifeste');
const { creerHandlers, ID_CONV } = require('./routes');
const { cleReseau } = require('./quotas');
const { installerTelephone, appareilToucherDe, SESSION_TEL_MS } = require('./telephone');
const { installerPieces } = require('./routes-pieces');
const { ID_PIECE } = require('./pieces');

const NOM_ENTETE = 'x-opm';
const SHA = (x) => crypto.createHash('sha256').update(x).digest('hex');
const JETON = /^opm_[A-Za-z0-9_-]{43}$/;

function construireApp(ctx) {
  const { config, stockage, quotas, journaliser } = ctx;
  const app = express();
  app.disable('x-powered-by');
  app.disable('etag');   // l'API ne sert jamais de 304 ; le statique réactive le sien plus bas
  app.set('trust proxy', 1);
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));

  /* ── En-têtes de sécurité, sur TOUTES les réponses ───────────────────────────────────── */
  /* ⛔ TOUT CE QUI SORT DE `/api/pieces*` PORTE LA `sandbox`, erreurs et refus compris (relecture du gardien, remarque 1). La pièce qu'on sert (`routes-pieces.js`) la posait déjà ; mais un
     refus de la garde, du plafond ou du routeur répondait avec la politique de la PAGE (`script-src 'self'`) : le préfixe entier est un endroit où l'on ne veut jamais qu'une réponse, ouverte
     à la main dans un onglet, exécute quoi que ce soit. Le routeur d'Express ne distingue pas la casse (`/API/PIECES/…` répond) : le motif non plus. */
  const CSP_PAGE = "default-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; media-src 'self' blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
  const CSP_PIECE = "sandbox; default-src 'none'";
  app.use((req, res, next) => {
    res.set({
      'Content-Security-Policy': /^\/api\/pieces/i.test(req.path) ? CSP_PIECE : CSP_PAGE,
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      /* le MICRO est permis à la page elle-même (`self`, le message vocal de l'étape 4) et à personne d'autre ; la CAMÉRA reste fermée jusqu'aux appels (étape 7) */
      'Permissions-Policy': 'camera=(), microphone=(self)',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    });
    /* HSTS seulement quand le service parle HTTPS (derrière le proxy) : un bac d'essai en HTTP
       local ne doit pas apprendre à un navigateur à refuser le HTTP pour 127.0.0.1. */
    if (config.cookie.secure) res.set('Strict-Transport-Security', 'max-age=86400');
    next();
  });

  /* ── L'état du processus (pour /health et le plancher de disque) ─────────────────────── */
  /* ⛔ le routeur d'Express ne distingue pas la casse (`/API/moi` répond) : `no-store` se pose donc sur le PRÉFIXE monté, jamais sur un `startsWith` sensible à la casse
     (relecture du gardien : `/Api/conversations` rendait les données du compte sans l'en-tête). */
  app.use('/api', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });

  /* ── Plafond général par adresse (le flux et /health n'y sont pas : un seul flux par onglet) ── */
  app.use('/api', (req, res, next) => {
    if (req.path === '/flux') return next();
    const q = Object.assign({ max: 600, fenetreMs: 60000 }, config.quotas.ip || {});
    const r = quotas.essai('ip:' + cleReseau(req.ip), q.max, q.fenetreMs);   // ⛔ par réseau (/64 en IPv6), jamais par adresse complète
    if (r.ok) return next();
    res.set('Retry-After', String(r.retry));
    journaliser('quota_refuse', { quota: 'ip' });
    return refus(res, 429, 'quota_atteint', { retry: r.retry });
  });

  /* ⛔ le lecteur JSON ne touche JAMAIS au dépôt d'une pièce : son corps est un flux binaire que la route lit elle-même, au fil de l'eau. Sans cette exception, un client qui
     annonce « application/json » sur ce chemin ferait lire (et rejeter) son corps par un autre lecteur que celui qui juge le type et le poids. Le chemin se compare sans égard à la
     casse ni à la barre oblique finale, comme le routeur d'Express (`/API/pieces/` y mène aussi). */
  const lecteurJson = express.json({ limit: '64kb', strict: true });
  app.use((req, res, next) => (req.method === 'POST' && /^\/api\/pieces\/?$/i.test(req.path)) ? next() : lecteurJson(req, res, next));

  /* ── Une écriture : l'origine de l'application ET l'en-tête maison ────────────────────── */
  function origineOk(req) {
    const o = req.headers.origin;
    if (!o || o === 'null') return false;
    if (config.origines) return config.origines.includes(o);
    /* Sans liste configurée : même origine que l'hôte demandé. Un navigateur ne peut pas
       falsifier `Origin` ; une page d'un autre site y met SON origine. */
    try { return new URL(o).host === req.headers.host; } catch (e) { return false; }
  }
  app.use((req, res, next) => {
    if (req.method === 'GET' || req.method === 'HEAD') return next();
    if (!origineOk(req)) return refus(res, 403, 'origine_refusee');
    if (req.headers[NOM_ENTETE] !== '1') return refus(res, 403, 'entete_requis');
    next();
  });

  /* ── Plancher d'espace disque : les écritures refusent, la lecture continue ───────────── */
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD' && ctx.disque.bas() && req.path !== '/api/compte/deconnexion') return refus(res, 503, 'disque_plein');
    next();
  });

  /* ── Les gardes ───────────────────────────────────────────────────────────────────────── */
  function lireCookie(req) {
    const h = req.headers.cookie; if (!h) return null;
    for (const part of h.split(';')) {
      const i = part.indexOf('='); if (i < 0) continue;
      if (part.slice(0, i).trim() === config.cookie.nom) return part.slice(i + 1).trim();
    }
    return null;
  }
  const garde = {};
  garde.P = [];
  garde.B = [(req, res, next) => config.instance === 'beta' ? next() : refus(res, 404, 'introuvable')];
  garde.S = [(req, res, next) => {
    const j = lireCookie(req);
    if (!j || !JETON.test(j)) return refus(res, 401, 'session_requise');
    const h = SHA(j);
    const s = stockage.sessionLire(h);
    const p = s && stockage.personneParId(s.personne);
    if (!p || p.etat !== 'actif') return refus(res, 401, 'session_requise');
    /* Un compte par numéro : 90 jours glissants (le moins de SMS possible) ; les autres, 30. */
    stockage.sessionToucher(h, p.origine === 'telephone' ? SESSION_TEL_MS : 30 * 86400000);
    if (p.origine === 'telephone') appareilToucherDe(req, config, stockage);   // l'usage prolonge aussi le jeton d'appareil du même navigateur
    req.moi = p; req.sessionH = h;
    next();
  }];
  garde.V = garde.S.concat([(req, res, next) => req.moi.verifie ? next() : refus(res, 403, 'adresse_non_confirmee')]);
  /* ⛔ M ET A : « n'existe pas » et « tu n'es pas membre » se confondent — 404 dans les deux cas. */
  const membre = (req, res, next) => {
    const id = req.params.id;
    const r = ID_CONV.test(id) ? stockage.convPourMembre(id, req.moi.id) : null;
    if (!r) return refus(res, 404, 'introuvable');
    req.conv = r; next();
  };
  garde.M = garde.S.concat([membre]);
  /* ⛔ J : une PIÈCE que cette personne a le droit de lire. Pas de pièce, identifiant mal formé, pas de droit : le MÊME 404 (on ne dit pas si une pièce existe à qui n'y a pas droit). */
  garde.J = garde.S.concat([(req, res, next) => {
    const p = ID_PIECE.test(String(req.params.id)) ? stockage.pieceVisible(req.moi.id, req.params.id) : null;
    if (!p) return refus(res, 404, 'introuvable');
    req.piece = p; next();
  }]);
  garde.A = garde.M.concat([(req, res, next) => req.conv.moi.role === 'admin' ? next() : refus(res, 403, 'interdit')]);

  /* ── Les routes : UNIQUEMENT depuis le manifeste ─────────────────────────────────────── */
  const H = creerHandlers(ctx);
  H['health'] = (req, res) => res.json(ctx.sante());
  installerTelephone(H, ctx);   // le compte PERSO par numéro : ses gestionnaires et la déconnexion qui coupe aussi le jeton d'appareil
  installerPieces(H, ctx);      // les pièces : déposer, lire, photo de profil, espace utilisé
  /* Les écritures authentifiées ont un plafond propre, par compte (en plus de celui de l'adresse). */
  const limiteEcriture = (req, res, next) => {
    const q = Object.assign({ max: 300, fenetreMs: 60000 }, config.quotas.ecriture || {});
    const r = quotas.essai('ecr:' + req.moi.id, q.max, q.fenetreMs);
    if (r.ok) return next();
    res.set('Retry-After', String(r.retry));
    return refus(res, 429, 'quota_atteint', { retry: r.retry });
  };
  for (const r of MANIFESTE) {
    const h = H[r.id];
    if (typeof h !== 'function') throw new Error('route sans gestionnaire : ' + r.id);
    const g = garde[r.garde];
    if (!g) throw new Error('garde inconnue : ' + r.garde);
    const chaine = g.slice();
    if (r.m === 'POST' && r.garde !== 'P' && r.garde !== 'B') chaine.push(limiteEcriture);
    app[r.m.toLowerCase()](r.p, ...chaine, h);
  }

  /* ── Front statique, servi par le service lui-même (même origine → ni CORS ni localStorage partagé) ── */
  app.use('/api', (req, res) => refus(res, 404, 'introuvable'));
  app.use(express.static(path.join(__dirname, 'public'), {
    dotfiles: 'ignore', index: 'index.html', redirect: false, etag: true, lastModified: true, maxAge: 0,
    setHeaders: (res) => res.set('Cache-Control', 'no-cache'),
  }));
  app.use((req, res) => refus(res, 404, 'introuvable'));

  /* ── Le filet : jamais de pile, jamais de message intérieur ─────────────────────────────── */
  // eslint-disable-next-line no-unused-vars
  app.use((err, req, res, next) => {
    if (err && err.type === 'entity.too.large') return refus(res, 413, 'trop_gros');
    if (err && (err.type === 'entity.parse.failed' || err.type === 'encoding.unsupported' || err.type === 'charset.unsupported')) return refus(res, 400, 'json_invalide');
    /* Une erreur de la CLIENTÈLE que le routeur a déjà classée 4xx (un chemin mal encodé, par exemple)
       n'est pas une panne : 400, sans journal d'erreur ni pile. */
    if (err && Number.isInteger(err.status) && err.status >= 400 && err.status < 500) return refus(res, 400, 'requete_invalide');
    journaliser('erreur', { nom: String((err && (err.code || err.name)) || 'Erreur').slice(0, 40) });
    if (res.headersSent) { try { res.end(); } catch (e) {} return; }
    refus(res, 500, 'erreur_interne');
  });
  return app;
}

module.exports = { construireApp, NOM_ENTETE };
