/* ══ RELIER UNE BOÎTE MAIL PAR AUTORISATION (OAuth 2.0) — GOOGLE ET MICROSOFT, POUR UNE PERSONNE ══════════════════════════
 *
 * « Continuer avec Google / Microsoft » dans la rubrique Courrier d'OP MESSAGES. Même parcours que celui d'OP GESTION
 * (`server/boite-oauth.js`), RECOPIÉ et adapté — ce service n'importe jamais `server/` (`tests/test-900.js`) — avec UNE différence qui
 * compte : là-bas le `state` lie une ENTREPRISE (`t`), ici il lie une PERSONNE (`uid`, le compte OP MESSAGES qui a demandé la connexion).
 *
 * ⛔ INERTE SANS CONFIGURATION. Sans `boitesMail.oauth.<fournisseur>` = { clientId, clientSecret } (`configurer-boites-mail.js`, saisie masquée),
 * rien n'est proposé pour ce fournisseur et `demarrer` refuse (503 `oauth_non_configure`).
 *
 * ⛔ LE JETON DE RENOUVELLEMENT EST UN MOT DE PASSE : il est rangé scellé avec le reste de la boîte (`stockage.boiteMailCreer`), jamais renvoyé
 * à une page, jamais journalisé. Le jeton d'ACCÈS (une heure) ne vit qu'en mémoire.
 *
 * ⛔ LE `state` EST LIÉ AU NAVIGATEUR QUI A DEMANDÉ LA CONNEXION (gardien, 6 novembre 2026, A1). Un `state` signé prouve qu'il vient de nous, pas QUI le présente : Mallory démarre une
 * connexion, envoie l'adresse de Google à une victime, la victime accepte — et SA boîte aurait été reliée au compte de Mallory. Au départ, le service pose donc dans le navigateur de celui
 * qui demande un cookie dédié (`boites-mail.js` : HttpOnly, SameSite=Lax, limité au chemin du retour) dont seule l'EMPREINTE est gardée ici ; au retour, le cookie présenté doit
 * correspondre. Sans lui, ou avec un autre, rien n'est relié.
 * ⛔ LE `state` EST LA SEULE PREUVE QUE LE RETOUR VIENT DE NOUS. Le retour arrive par le navigateur, SANS cookie de session (le cookie est
 * `SameSite=Strict` : une navigation qui vient de Google ne le porte pas) — c'est donc le `state` signé (HMAC, clé tirée au démarrage) qui dit QUI
 * a demandé la connexion. Il est à USAGE UNIQUE (le nonce s'efface au premier retour, même sur un échec), valable dix minutes, et il porte le
 * vérificateur PKCE (S256) : un code intercepté ne s'échange pas sans lui. Un `state` fabriqué, rejoué ou périmé ne relie rien à personne.
 *
 * Tout ce qui parle au réseau est injecté (`fetch`) ; les adresses des fournisseurs ne se remplacent QUE par le crochet des bancs (bêta
 * seulement, `index.js`) : les bancs jouent le parcours entier contre de faux fournisseurs sur 127.0.0.1.
 */
'use strict';
const crypto = require('crypto');

const FOURNISSEURS = {
  microsoft: {
    nom: 'Microsoft',
    base: 'https://login.microsoftonline.com/common/oauth2/v2.0',
    autoriser: '/authorize', jeton: '/token',
    portees: 'offline_access https://outlook.office.com/SMTP.Send https://outlook.office.com/IMAP.AccessAsUser.All openid email',
    extra: { prompt: 'select_account', response_mode: 'query' },
    serveurs: { imapHost: 'outlook.office365.com', imapPort: 993, smtpHost: 'smtp.office365.com', smtpPort: 587 },
  },
  google: {
    nom: 'Google',
    base: 'https://accounts.google.com/o/oauth2/v2',
    jetonBase: 'https://oauth2.googleapis.com',
    autoriser: '/auth', jeton: '/token',
    portees: 'https://mail.google.com/ openid email',
    /* `offline` + `consent` : sans eux, Google ne rend PAS de jeton de renouvellement à une seconde connexion — la boîte marcherait une heure puis mourrait. */
    extra: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    serveurs: { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 },
  },
};
const DUREE_STATE = 10 * 60 * 1000;
const MARGE_JETON = 5 * 60 * 1000;
const ATTENTE_MAX = 500;
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');
const RE_ADRESSE = /^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/;

/* Lit les revendications d'un id_token SANS vérifier sa signature : il arrive DIRECTEMENT du point d'échange du fournisseur, en TLS, en réponse à NOTRE code et à NOTRE secret — il ne
   transite pas par le navigateur. On n'en tire que l'adresse, qui sera de toute façon éprouvée par le premier relevé. */
function revendications(idToken) {
  try { const p = String(idToken || '').split('.')[1]; return p ? JSON.parse(deB64u(p).toString('utf8')) : {}; } catch (e) { return {}; }
}

function creer(o) {
  const cfg = o.config || null;                       // `config.boitesMail` (ou null : inerte)
  const fetchFn = o.fetch || ((...a) => fetch(...a));
  const maintenant = o.maintenant || (() => Date.now());
  const surcharges = o.surcharges || {};              // le crochet des bancs : { google: 'http://127.0.0.1:…', microsoft: … }
  const redirection = (cfg && cfg.redirection) || '';
  const cleState = crypto.randomBytes(32);            // en mémoire : un redémarrage invalide les connexions EN COURS, pas les boîtes
  const attente = new Map();                          // nonce -> { verificateur, exp, uid, f }
  const cache = new Map();                            // id de boîte -> { jeton, exp }

  const reglage = (f) => { const c = cfg && cfg.oauth && cfg.oauth[f]; return (c && c.clientId && c.clientSecret) ? c : null; };
  const adresses = (f) => {
    const F = FOURNISSEURS[f];
    if (surcharges[f]) return { autoriser: surcharges[f] + '/authorize', jeton: surcharges[f] + '/token' };
    return { autoriser: F.base + F.autoriser, jeton: (F.jetonBase || F.base) + F.jeton };
  };
  const serveurs = (f) => Object.assign({}, FOURNISSEURS[f].serveurs);
  const disponibles = () => ({ google: !!reglage('google'), microsoft: !!reglage('microsoft') });
  const signer = (txt) => b64u(crypto.createHmac('sha256', cleState).update(txt).digest());

  function erreur(code, message, statut) { const e = new Error(message); e.code = code; e.statut = statut || 400; e.nous = true; return e; }
  const empreinte = (x) => crypto.createHash('sha256').update(String(x)).digest();

  /* ── 1. Démarrer : l'adresse d'autorisation, avec un `state` signé qui lie la PERSONNE ── */
  function demarrer({ fournisseur, uid, email }) {
    const F = FOURNISSEURS[fournisseur];
    if (!F) throw erreur('fournisseur_inconnu', 'Fournisseur inconnu (microsoft ou google).');
    const R = reglage(fournisseur);
    if (!R) throw erreur('oauth_non_configure', 'La connexion ' + F.nom + ' n\'est pas encore disponible.', 503);
    if (!uid) throw erreur('compte_requis', 'Compte manquant.');
    const now = maintenant();
    for (const [n, a] of attente) if (a.exp < now) attente.delete(n);   // ménage
    if (attente.size > ATTENTE_MAX) throw erreur('trop_de_connexions', 'Trop de connexions en cours — réessaie dans quelques minutes.', 429);
    const nonce = b64u(crypto.randomBytes(18));
    const verificateur = b64u(crypto.randomBytes(48));
    const defi = b64u(crypto.createHash('sha256').update(verificateur).digest());
    const navigateur = b64u(crypto.randomBytes(24));          // le secret du NAVIGATEUR : il part dans un cookie, seule son empreinte reste ici
    attente.set(nonce, { verificateur, exp: now + DUREE_STATE, uid: String(uid), f: fournisseur, nav: empreinte(navigateur) });
    const corps = b64u(JSON.stringify({ f: fournisseur, u: String(uid), n: nonce, exp: now + DUREE_STATE }));
    const state = corps + '.' + signer(corps);
    const q = new URLSearchParams(Object.assign({
      client_id: R.clientId, response_type: 'code', redirect_uri: redirection, scope: F.portees,
      state, code_challenge: defi, code_challenge_method: 'S256',
    }, F.extra));
    if (typeof email === 'string' && RE_ADRESSE.test(email) && email.length <= 160) q.set('login_hint', email);   // pré-remplit le compte chez le fournisseur
    return { url: adresses(fournisseur).autoriser + '?' + q.toString(), navigateur };
  }

  /* ── 2. Le retour : vérifier le `state` (signature, échéance, usage unique), échanger le code ── */
  async function retour({ code, state, navigateur }) {
    const s = String(state || '').slice(0, 2000); const i = s.lastIndexOf('.');
    if (i < 1) throw erreur('state_invalide', 'Lien de connexion invalide.');
    const corps = s.slice(0, i), sig = s.slice(i + 1);
    const attendu = signer(corps);
    if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) throw erreur('state_invalide', 'Lien de connexion invalide.');
    let d; try { d = JSON.parse(deB64u(corps).toString('utf8')); } catch (e) { throw erreur('state_invalide', 'Lien de connexion invalide.'); }
    const a = attente.get(d && d.n);
    if (d && d.n) attente.delete(d.n);                       // usage unique : même un échec plus bas le consomme
    if (!a || a.uid !== d.u || a.f !== d.f) throw erreur('state_rejoue', 'Ce lien de connexion a déjà servi ou a expiré — recommence depuis OP MESSAGES.');
    if (maintenant() > d.exp || maintenant() > a.exp) throw erreur('state_expire', 'Ce lien de connexion a expiré — recommence depuis OP MESSAGES.');
    /* ⛔ le navigateur qui REVIENT doit être celui qui est PARTI : son cookie, comparé à l'empreinte posée au départ */
    if (typeof navigateur !== 'string' || !navigateur || !crypto.timingSafeEqual(empreinte(navigateur), a.nav)) throw erreur('navigateur_inconnu', 'Cette connexion doit se terminer dans le navigateur où tu l\'as commencée — recommence depuis OP MESSAGES.');
    const F = FOURNISSEURS[d.f], R = reglage(d.f);
    if (!F || !R) throw erreur('oauth_non_configure', 'Connexion indisponible.', 503);
    if (!code) throw erreur('code_absent', 'Connexion annulée.');
    let r;
    try {
      r = await fetchFn(adresses(d.f).jeton, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'authorization_code', code: String(code).slice(0, 4000), redirect_uri: redirection,
          client_id: R.clientId, client_secret: R.clientSecret, code_verifier: a.verificateur }).toString() });
    } catch (e) { throw erreur('fournisseur_injoignable', F.nom + ' ne répond pas — réessaie dans un instant.', 502); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.access_token) throw erreur('echange_refuse', F.nom + ' a refusé la connexion.', 502);
    if (!j.refresh_token) throw erreur('sans_renouvellement', F.nom + ' n\'a pas accordé l\'accès durable (« accès hors connexion ») — recommence et accepte toutes les autorisations.', 502);
    const c = revendications(j.id_token);
    let email = String(c.email || c.preferred_username || c.upn || '').trim().toLowerCase();
    if (d.f === 'google' && c.email_verified === false) email = '';
    if (!RE_ADRESSE.test(email) || email.length > 160) throw erreur('adresse_inconnue', F.nom + ' n\'a pas donné l\'adresse de la boîte.', 502);
    return { uid: d.u, fournisseur: d.f, email, refresh: String(j.refresh_token), acces: String(j.access_token), exp: maintenant() + Math.max(60, +j.expires_in || 3600) * 1000 };
  }

  /* ── 3. Un jeton d'accès frais pour une boîte OAuth (cache mémoire, marge de cinq minutes) ──
     `quandRotation(nouveauJeton)` : Microsoft rend parfois un NOUVEAU jeton de renouvellement — il faut le garder, l'ancien finit par mourir. `invalid_grant` (autorisation retirée, mot de passe
     changé, 90 jours sans usage chez Microsoft) : la boîte est « à reconnecter » — on le dit, on ne réessaie pas en boucle. */
  async function jeton(boite, quandRotation) {
    const id = String(boite.id);
    const c = cache.get(id);
    if (c && c.exp - MARGE_JETON > maintenant()) return c.jeton;
    const R = reglage(boite.fournisseur);
    if (!R) throw erreur('oauth_non_configure', 'Connexion ' + ((FOURNISSEURS[boite.fournisseur] || {}).nom || '') + ' indisponible.', 503);
    if (!boite.secret) throw erreur('a_reconnecter', 'Ta boîte mail doit être reconnectée.', 409);
    let r;
    try {
      r = await fetchFn(adresses(boite.fournisseur).jeton, { method: 'POST', signal: AbortSignal.timeout(15000), headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: boite.secret, client_id: R.clientId, client_secret: R.clientSecret }).toString() });
    } catch (e) { throw erreur('fournisseur_injoignable', 'Le fournisseur de ta boîte mail ne répond pas — réessaie dans un instant.', 502); }
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.access_token) {
      cache.delete(id);
      if (j.error === 'invalid_grant' || r.status === 400 || r.status === 401) throw erreur('a_reconnecter', 'Ta boîte mail doit être reconnectée (l\'autorisation a expiré ou a été retirée).', 409);
      throw erreur('fournisseur_injoignable', 'Le fournisseur de ta boîte mail ne répond pas — réessaie dans un instant.', 502);
    }
    if (j.refresh_token && j.refresh_token !== boite.secret && typeof quandRotation === 'function') { try { quandRotation(String(j.refresh_token)); } catch (e) {} }
    cache.set(id, { jeton: String(j.access_token), exp: maintenant() + Math.max(60, +j.expires_in || 3600) * 1000 });
    return String(j.access_token);
  }
  function oublier(boiteId) { cache.delete(String(boiteId)); }
  /* Le jeton tiré à la connexion sert tout de suite (premier relevé) sans refaire un échange. */
  function amorcer(boiteId, acces, exp) { cache.set(String(boiteId), { jeton: acces, exp }); }

  return { disponibles, demarrer, retour, jeton, oublier, amorcer, serveurs, enAttente: () => attente.size };
}

module.exports = { creer, FOURNISSEURS, revendications };
