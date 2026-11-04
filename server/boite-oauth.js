/* ══ CONNECTER UNE BOÎTE PAR AUTORISATION (OAuth 2.0) — MICROSOFT ET GOOGLE ═══════════════════════
 *
 * Justin, 4 novembre 2026 : « fais tout ce qu'il faut pour tout type de boîte mail ». Depuis 2024, Microsoft refuse
 * le mot de passe dans toutes les applications (Hotmail, Outlook, Live, Microsoft 365) : `/api/mailbox/connect` ne
 * pouvait donc rien pour ces entreprises. Google, lui, exige un « mot de passe d'application » que peu de gens savent
 * créer. Ce module fait l'autre chemin : l'entreprise AUTORISE OP GESTION chez son fournisseur (le bouton « Se
 * connecter avec Microsoft / Google »), on garde un jeton de renouvellement, et l'envoi (SMTP) comme la relève (IMAP)
 * passent en XOAUTH2 — aucun mot de passe ne nous est jamais confié.
 *
 * ⛔ INERTE SANS CONFIGURATION. Sans `config.oauth.microsoft` (ou `.google`) = { clientId, clientSecret }, rien n'est
 * proposé et les routes rendent 503 `oauth_non_configure`. Les secrets se posent sur le VPS par
 * `server/configurer-oauth.js`, en saisie masquée — jamais dans une conversation, jamais dans le dépôt.
 *
 * ⛔ LE JETON DE RENOUVELLEMENT EST UN MOT DE PASSE. Il est rangé dans le champ `pass` de la boîte : `coffre-boites.js`
 * le chiffre donc au repos, exactement comme un mot de passe IMAP, et toutes les règles qui protègent `pass` (jamais
 * dans une réponse, jamais dans un journal, effacé avec l'entreprise) le protègent sans une ligne de plus.
 * Le jeton d'ACCÈS (une heure) ne vit qu'en mémoire.
 *
 * ⛔ LE `state` EST LA SEULE PREUVE QUE LE RETOUR VIENT DE NOUS. Le retour du fournisseur arrive par le navigateur, sans
 * clé d'équipe : c'est le `state` signé (HMAC, clé tirée au démarrage) qui dit quel espace a demandé la connexion. Il est
 * à USAGE UNIQUE (le nonce s'efface au premier retour), valable dix minutes, et il porte le vérificateur PKCE (S256) :
 * un code intercepté ne s'échange pas sans lui.
 *
 * Tout ce qui parle au réseau est injecté (`fetch`), et les adresses des fournisseurs se remplacent par variables
 * d'environnement (`TEAMOP_OAUTH_MS_URL`, `TEAMOP_OAUTH_GOOGLE_URL`, `TEAMOP_OAUTH_SERVEURS`) : les bancs jouent tout le
 * parcours contre de faux fournisseurs, sur 127.0.0.1.
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
    env: 'TEAMOP_OAUTH_MS_URL'
  },
  google: {
    nom: 'Google',
    base: 'https://accounts.google.com/o/oauth2/v2',
    jetonBase: 'https://oauth2.googleapis.com',
    autoriser: '/auth', jeton: '/token',
    portees: 'https://mail.google.com/ openid email',
    /* `offline` + `consent` : sans eux, Google ne rend PAS de jeton de renouvellement à une seconde connexion — la boîte
       marcherait une heure puis mourrait. */
    extra: { access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true' },
    serveurs: { imapHost: 'imap.gmail.com', imapPort: 993, smtpHost: 'smtp.gmail.com', smtpPort: 465 },
    env: 'TEAMOP_OAUTH_GOOGLE_URL'
  }
};
const DUREE_STATE = 10 * 60 * 1000;
const MARGE_JETON = 5 * 60 * 1000;
const b64u = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const deB64u = (s) => Buffer.from(String(s).replace(/-/g, '+').replace(/_/g, '/'), 'base64');

/* Lit les revendications d'un id_token SANS vérifier sa signature : il arrive DIRECTEMENT du point d'échange du
   fournisseur, en TLS, en réponse à NOTRE code et à NOTRE secret — il ne transite pas par le navigateur. On n'en tire que
   l'adresse, qui sera de toute façon éprouvée par le premier envoi. */
function revendications(idToken) {
  try { const p = String(idToken || '').split('.')[1]; return p ? JSON.parse(deB64u(p).toString('utf8')) : {}; } catch (e) { return {}; }
}

function creer(o) {
  const config = o.config || {};
  const fetchFn = o.fetch || ((...a) => fetch(...a));
  const maintenant = o.maintenant || (() => Date.now());
  const env = o.env || process.env;
  const redirection = o.redirection || 'https://api.teamop.fr/api/mailbox/oauth/retour';
  const cleState = crypto.randomBytes(32);          // en mémoire : un redémarrage invalide les connexions EN COURS, pas les boîtes
  const attente = new Map();                        // nonce -> { verificateur, exp }
  const cache = new Map();                          // id de boîte -> { jeton, exp }

  const reglage = (f) => { const c = (config.oauth || {})[f]; return (c && c.clientId && c.clientSecret) ? c : null; };
  const adresses = (f) => {
    const F = FOURNISSEURS[f]; const surcharge = env[F.env];
    if (surcharge) return { autoriser: surcharge + '/authorize', jeton: surcharge + '/token' };
    return { autoriser: F.base + F.autoriser, jeton: (F.jetonBase || F.base) + F.jeton };
  };
  const serveurs = (f) => {
    try { const s = JSON.parse(env.TEAMOP_OAUTH_SERVEURS || 'null'); if (s && s[f]) return Object.assign({}, FOURNISSEURS[f].serveurs, s[f]); } catch (e) {}
    return Object.assign({}, FOURNISSEURS[f].serveurs);
  };
  const disponibles = () => ({ microsoft: !!reglage('microsoft'), google: !!reglage('google') });
  const signer = (txt) => b64u(crypto.createHmac('sha256', cleState).update(txt).digest());

  function erreur(code, message, statut) { const e = new Error(message); e.code = code; e.statut = statut || 400; return e; }

  /* ── 1. Démarrer : l'adresse d'autorisation, avec un `state` signé qui lie l'ESPACE ── */
  function demarrer({ fournisseur, t }) {
    const F = FOURNISSEURS[fournisseur];
    if (!F) throw erreur('fournisseur_inconnu', 'Fournisseur inconnu (microsoft ou google).');
    const R = reglage(fournisseur);
    if (!R) throw erreur('oauth_non_configure', 'La connexion ' + F.nom + ' n\'est pas encore disponible.', 503);
    if (!t) throw erreur('espace_requis', 'Espace manquant.');
    const now = maintenant();
    for (const [n, a] of attente) if (a.exp < now) attente.delete(n);   // ménage
    if (attente.size > 500) throw erreur('trop_de_connexions', 'Trop de connexions en cours — réessaie dans quelques minutes.', 429);
    const nonce = b64u(crypto.randomBytes(18));
    const verificateur = b64u(crypto.randomBytes(48));
    const defi = b64u(crypto.createHash('sha256').update(verificateur).digest());
    attente.set(nonce, { verificateur, exp: now + DUREE_STATE, t: String(t), f: fournisseur });
    const corps = b64u(JSON.stringify({ f: fournisseur, t: String(t), n: nonce, exp: now + DUREE_STATE }));
    const state = corps + '.' + signer(corps);
    const q = new URLSearchParams(Object.assign({
      client_id: R.clientId, response_type: 'code', redirect_uri: redirection, scope: F.portees,
      state, code_challenge: defi, code_challenge_method: 'S256'
    }, F.extra));
    return { url: adresses(fournisseur).autoriser + '?' + q.toString() };
  }

  /* ── 2. Le retour : vérifier le `state` (signature, échéance, usage unique), échanger le code ── */
  async function retour({ code, state }) {
    const s = String(state || ''); const i = s.lastIndexOf('.');
    if (i < 1) throw erreur('state_invalide', 'Lien de connexion invalide.');
    const corps = s.slice(0, i), sig = s.slice(i + 1);
    const attendu = signer(corps);
    if (sig.length !== attendu.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(attendu))) throw erreur('state_invalide', 'Lien de connexion invalide.');
    let d; try { d = JSON.parse(deB64u(corps).toString('utf8')); } catch (e) { throw erreur('state_invalide', 'Lien de connexion invalide.'); }
    const a = attente.get(d.n);
    attente.delete(d.n);                                   // usage unique : même un échec plus bas le consomme
    if (!a || a.t !== d.t || a.f !== d.f) throw erreur('state_rejoue', 'Ce lien de connexion a déjà servi ou a expiré — recommence depuis OP GESTION.');
    if (maintenant() > d.exp || maintenant() > a.exp) throw erreur('state_expire', 'Ce lien de connexion a expiré — recommence depuis OP GESTION.');
    const F = FOURNISSEURS[d.f], R = reglage(d.f);
    if (!F || !R) throw erreur('oauth_non_configure', 'Connexion indisponible.', 503);
    if (!code) throw erreur('code_absent', 'Connexion annulée.');
    const r = await fetchFn(adresses(d.f).jeton, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', code: String(code).slice(0, 4000), redirect_uri: redirection,
        client_id: R.clientId, client_secret: R.clientSecret, code_verifier: a.verificateur }).toString() });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.access_token) throw erreur('echange_refuse', F.nom + ' a refusé la connexion' + (j.error ? ' (' + String(j.error).slice(0, 40) + ')' : '') + '.', 502);
    if (!j.refresh_token) throw erreur('sans_renouvellement', F.nom + ' n\'a pas accordé l\'accès durable (« accès hors connexion ») — recommence et accepte toutes les autorisations.', 502);
    const c = revendications(j.id_token);
    let email = String(c.email || c.preferred_username || c.upn || '').trim().toLowerCase();
    if (d.f === 'google' && c.email_verified === false) email = '';
    if (!/^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$/.test(email)) throw erreur('adresse_inconnue', F.nom + ' n\'a pas donné l\'adresse de la boîte.', 502);
    return { t: d.t, fournisseur: d.f, email: email.slice(0, 160), refresh: String(j.refresh_token), acces: String(j.access_token),
      exp: maintenant() + Math.max(60, +j.expires_in || 3600) * 1000 };
  }

  /* ── 3. Un jeton d'accès frais pour une boîte OAuth (cache mémoire, marge de cinq minutes) ──
     `quandRotation(boite, nouveau)` : Microsoft rend parfois un NOUVEAU jeton de renouvellement — il faut le garder, l'ancien
     finit par mourir. `invalid_grant` (autorisation retirée, mot de passe changé, 90 jours sans usage chez Microsoft) : la
     boîte est « à reconnecter » — on le dit, on ne réessaie pas en boucle. */
  async function jeton(boite, quandRotation) {
    const id = String(boite.id || boite.email);
    const c = cache.get(id);
    if (c && c.exp - MARGE_JETON > maintenant()) return c.jeton;
    const R = reglage(boite.fournisseur);
    if (!R) throw erreur('oauth_non_configure', 'Connexion ' + ((FOURNISSEURS[boite.fournisseur] || {}).nom || '') + ' indisponible.', 503);
    if (!boite.pass) throw erreur('a_reconnecter', 'Ta boîte mail doit être reconnectée.', 409);
    const r = await fetchFn(adresses(boite.fournisseur).jeton, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: boite.pass, client_id: R.clientId, client_secret: R.clientSecret }).toString() });
    let j = {}; try { j = await r.json(); } catch (e) {}
    if (!r.ok || !j.access_token) {
      cache.delete(id);
      if (j.error === 'invalid_grant' || r.status === 400 || r.status === 401) throw erreur('a_reconnecter', 'Ta boîte mail doit être reconnectée (l\'autorisation a expiré ou a été retirée).', 409);
      throw erreur('fournisseur_injoignable', 'Le fournisseur de ta boîte mail ne répond pas — réessaie dans un instant.', 502);
    }
    if (j.refresh_token && j.refresh_token !== boite.pass && typeof quandRotation === 'function') { try { quandRotation(boite, String(j.refresh_token)); } catch (e) {} }
    cache.set(id, { jeton: String(j.access_token), exp: maintenant() + Math.max(60, +j.expires_in || 3600) * 1000 });
    return String(j.access_token);
  }
  /* La forme d'authentification que chaque bibliothèque attend. */
  async function authSmtp(boite, rot) { return { type: 'OAuth2', user: boite.email, accessToken: await jeton(boite, rot) }; }
  async function authImap(boite, rot) { return { user: boite.email, accessToken: await jeton(boite, rot) }; }
  function oublier(boite) { cache.delete(String(boite.id || boite.email)); }
  /* Le jeton tiré à la connexion sert tout de suite (vérification SMTP/IMAP, import d'historique) sans refaire un échange. */
  function amorcer(boite, acces, exp) { cache.set(String(boite.id || boite.email), { jeton: acces, exp }); }

  return { disponibles, demarrer, retour, jeton, authSmtp, authImap, oublier, amorcer, serveurs, _attente: attente };
}

module.exports = { creer, FOURNISSEURS };
