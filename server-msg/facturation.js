/* ══ MESSAGES PRO — LA FACTURATION STRIPE (MODE TEST D'ABORD), SANS BIBLIOTHÈQUE ET SANS WEBHOOK ══════════════════════════════════════════════
 *
 * SERVEUR.md § 3.8. Messages Pro est un abonnement PAR ESPACE (une entreprise, toutes ses places dans un seul abonnement : 15 € par place et par mois). Stripe est appelé par `fetch`
 * vers `api.stripe.com`, comme OP GESTION — une bibliothèque de moins à maintenir et à auditer. Pas de webhook en v1 : le verdict est TOUJOURS relu chez Stripe (au retour du paiement,
 * à la demande de l'administrateur, et toutes les dix minutes pour les espaces abonnés).
 *
 *   offres()      ce qui se vend (aucun secret : ni tarif Stripe, ni clé)           paiement()  une session de paiement Stripe Checkout pour CET espace
 *   etat()        ce que Stripe a dit de l'espace, SANS réseau                       portail()   le portail de facturation (changer les places, la carte, résilier)
 *   relire()      relit Stripe pour UN espace                                         relireTous()  la passe des dix minutes
 *
 * ⛔ LE CORPS D'UNE REQUÊTE NE DÉCIDE JAMAIS DE CE QUI A ÉTÉ PAYÉ.
 *   · le TARIF vient de la configuration (liste blanche `facturation.prix`) — le corps ne nomme qu'un rythme (« mensuel », « annuel ») et un nombre de places ;
 *   · l'ESPACE vient du chemin et de la base (propriétaire de l'espace, adresse confirmée — gardes EP + V) ; Stripe le reçoit en `client_reference_id = opmsg:<espace>` ET en
 *     métadonnées de l'abonnement, et NOUS le revérifions quand on relit (la session cite-t-elle bien cet espace ? l'abonnement aussi ? ses lignes sont-elles NOS tarifs ?) ;
 *   · l'ABONNEMENT d'un espace est celui que la session de paiement que NOUS avons ouverte désigne — jamais un identifiant donné par la page ;
 *   · l'adresse (`customer_email`) vient de la SESSION de la personne, quand elle en a une de confirmée ; jamais du corps (voir `adresseDe`).
 * ⛔ UNE PANNE NE SUSPEND PERSONNE. Stripe muet, clé refusée, réponse illisible : l'état connu reste, `echecMin` (minutes d'échec de suite) monte, la surveillance le lit (`/health`,
 *   `stripeEchecMin`), rien n'est décidé sur une lecture ratée. Le sursis d'un impayé (sept jours) se compte entre deux LECTURES, pas sur l'horloge (`formule.js`).
 * ⛔ UN SEUL ABONNEMENT VIVANT PAR ESPACE : en payer un second serait un second prélèvement. S'il y en a un, `paiement` répond `abonnement_existant` AVEC le lien du portail ;
 *   une session de paiement encore ouverte est RÉUTILISÉE (même lien), pas doublée.
 * ⛔ LA CLÉ est une clé RESTREINTE propre à OP MESSAGES (jamais celle d'OP GESTION), lue de la configuration, jamais journalisée ni publiée ; `/health` ne dit que le mode.
 * ⛔ LES ABONNEMENTS DE CE COMPTE STRIPE SONT PARTAGÉS avec OP GESTION, qui lit TOUTE la liste : un abonnement de Messages Pro ne porte donc JAMAIS la métadonnée `espace` (celle
 *   qu'OP GESTION lit pour rattacher un abonnement à une entreprise) — la nôtre s'appelle `opmsg_espace` — et son tarif doit être l'un de ceux qu'OP GESTION classe « OP MESSAGES »
 *   (`design/opmessages/INSTALLER-LE-SERVEUR.md`, § Stripe) : `tests/test-965.js` joue les deux services l'un contre l'autre.
 * Sans clé configurée, tout est INERTE et le dit (`offres().ouvert === false`, 503 `abonnement_non_ouvert`).
 */
'use strict';
const { STATUTS_PAYES, STATUTS_IMPAYES, STATUTS_VIVANTS } = require('./formule');

const HOTE_STRIPE = 'https://api.stripe.com';
const PLACES_MIN = 1, PLACES_MAX = 500;
const SESSION_VIE_MS = 24 * 3600000;          // une session Checkout vit 24 h chez Stripe
const STATUTS_FINAUX = ['canceled', 'incomplete_expired'];
const ID_SESSION = /^cs_[A-Za-z0-9_]{6,200}$/, ID_ABO = /^sub_[A-Za-z0-9_]{4,200}$/, ID_CLIENT = /^cus_[A-Za-z0-9_]{4,200}$/;
const ID_ESPACE = /^e_[0-9a-f]{32}$/;
const erreur = (code, extra) => Object.assign(new Error(code), { code }, extra || {});

function creerFacturation({ stockage, config, formule, journaliser = () => {}, horloge = Date.now, fetchImpl = (...a) => fetch(...a) }) {
  const cfg = config.facturation;
  const actif = () => !!cfg.cle;
  const defaut = cfg.prix.mensuel ? 'mensuel' : 'annuel';
  let echecDepuis = null, derniereLecture = null, passeEnCours = false, minuteur = null, premier = null, arrete = false;
  const enCours = new Map();                     // espace → la relecture en cours (deux relectures de suite se partagent la même)

  /* ── le client Stripe : un appel, un verdict. Rend le JSON, ou lève { code } : `reseau`, `stripe_panne` (5xx), `cle_refusee` (401, 403), `trop_de_demandes` (429),
        `reponse_illisible`, `introuvable` (404 : Stripe ne connaît pas l'objet), `refus` (les autres 4xx : NOTRE demande est fausse). Seuls les cinq premiers disent « Stripe illisible ». ── */
  const PANNES = ['reseau', 'stripe_panne', 'cle_refusee', 'trop_de_demandes', 'reponse_illisible'];
  const noterEchec = (motif) => { if (echecDepuis === null) echecDepuis = horloge(); journaliser('stripe_echec', { motif }); };
  const noterSucces = () => { echecDepuis = null; derniereLecture = horloge(); };
  async function stripe(methode, chemin, paires) {
    const base = cfg.testHote ? 'http://' + cfg.testHote : HOTE_STRIPE;
    const init = { method: methode, headers: { Authorization: 'Bearer ' + cfg.cle, Accept: 'application/json' }, signal: AbortSignal.timeout(cfg.timeoutMs), redirect: 'error' };
    let url = base + chemin;
    const corps = paires && paires.length ? new URLSearchParams(paires).toString() : '';
    if (methode === 'GET') { if (corps) url += '?' + corps; }
    else { init.headers['Content-Type'] = 'application/x-www-form-urlencoded'; init.body = corps; }
    let r;
    try { r = await fetchImpl(url, init); } catch (e) { noterEchec('reseau'); throw erreur('reseau'); }
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (!r.ok) {
      const code = r.status === 404 ? 'introuvable' : r.status === 401 || r.status === 403 ? 'cle_refusee' : r.status === 429 ? 'trop_de_demandes' : r.status >= 500 ? 'stripe_panne' : 'refus';
      if (PANNES.includes(code)) noterEchec(code); else noterSucces();     // un 404 ou un refus est une RÉPONSE de Stripe : il se lit, donc il n'est pas muet
      throw erreur(code, { statut: r.status });
    }
    if (!j || typeof j !== 'object') { noterEchec('reponse_illisible'); throw erreur('reponse_illisible'); }
    noterSucces();
    return j;
  }
  const id = (x) => typeof x === 'string' ? x : (x && typeof x === 'object' && typeof x.id === 'string' ? x.id : '');

  /* ── ce que Stripe dit d'un abonnement, ramené à ce qu'on range — ou `null` s'il n'est PAS le nôtre ──
     Il est le nôtre si la métadonnée que NOUS y avons gravée désigne cet espace ET qu'au moins une de ses lignes est un tarif de notre liste blanche. Les places sont la somme des
     quantités de NOS lignes (une ligne d'un autre produit ajoutée par quelqu'un ne donne aucune place). L'échéance est lue à l'ancienne place (l'abonnement) puis à la nouvelle
     (la ligne) : le compte Stripe fixe la version de son API, pas nous. */
  const PRIX = Object.values(cfg.prix);
  function lireAbonnement(sb, espace) {
    if (!sb || sb.object !== 'subscription' || !ID_ABO.test(String(sb.id))) return null;
    if (!sb.metadata || sb.metadata.opmsg_espace !== espace || sb.metadata.produit !== 'opmsg') return null;
    const lignes = sb.items && Array.isArray(sb.items.data) ? sb.items.data : [];
    const nos = lignes.filter(it => it && it.price && PRIX.includes(id(it.price)));
    if (!nos.length) return null;
    const places = nos.reduce((a, it) => a + (Number.isInteger(it.quantity) && it.quantity > 0 ? it.quantity : 1), 0);
    const fin = Number.isFinite(sb.current_period_end) ? sb.current_period_end : (Number.isFinite(nos[0].current_period_end) ? nos[0].current_period_end : null);
    const client = id(sb.customer);
    return { client: ID_CLIENT.test(client) ? client : null, abonnement: sb.id, statut: String(sb.status || ''), places: Math.min(places, 100000), fin_periode: fin === null ? null : fin * 1000,
      annule: sb.cancel_at_period_end === true, impaye: STATUTS_IMPAYES.includes(sb.status) };
  }

  /* ── relire un espace ──
     1. une session de paiement ouverte par NOUS attend-elle ? Terminée, elle désigne l'abonnement (après avoir vérifié qu'elle cite bien CET espace) ; expirée, on l'oublie ;
     2. l'abonnement connu : son statut, ses places, son échéance. Stripe qui ne connaît plus l'abonnement (404) = résilié. */
  async function relireImpl(espace) {
    let a = stockage.abonnementLire(espace), adopte = false;
    if (a && a.session) {
      if (!ID_SESSION.test(a.session) || (a.session_le !== null && horloge() - a.session_le > SESSION_VIE_MS)) stockage.abonnementSessionOubliee(espace);
      else {
        let cs; try { cs = await stripe('GET', '/v1/checkout/sessions/' + a.session); } catch (e) { if (e.code === 'introuvable') { stockage.abonnementSessionOubliee(espace); cs = null; } else throw e; }
        if (cs && cs.status === 'expired') stockage.abonnementSessionOubliee(espace);
        else if (cs && cs.status === 'complete') {
          const sid = id(cs.subscription);
          if (cs.mode !== 'subscription' || cs.client_reference_id !== 'opmsg:' + espace || !ID_ABO.test(sid)) { stockage.abonnementSessionOubliee(espace); journaliser('facturation', { motif: 'session_incoherente' }); }
          else {
            let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + sid); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }
            const l = lireAbonnement(sb, espace);
            if (!l) { stockage.abonnementSessionOubliee(espace); journaliser('facturation', { motif: 'abonnement_non_reconnu' }); }
            else { stockage.abonnementPoser(espace, l, { adopter: true }); adopte = true; journaliser('facturation', { etat: 'adopte' }); }
          }
        }
      }
      a = stockage.abonnementLire(espace);
    }
    if (a && a.abonnement && !adopte && !STATUTS_FINAUX.includes(a.statut)) {
      if (!ID_ABO.test(a.abonnement)) return;
      let sb; try { sb = await stripe('GET', '/v1/subscriptions/' + a.abonnement); } catch (e) { if (e.code === 'introuvable') sb = null; else throw e; }
      if (sb === null) stockage.abonnementPoser(espace, { client: a.client, abonnement: a.abonnement, statut: 'canceled', places: 0, fin_periode: a.fin_periode, annule: false, impaye: false });
      else {
        const l = lireAbonnement(sb, espace);
        /* un abonnement qui n'est plus reconnu comme le nôtre (tarif retiré de la liste blanche, métadonnée modifiée) ne donne plus rien — mais on ne le dit pas « résilié » : on garde le dernier état */
        if (l) stockage.abonnementPoser(espace, l);
        else journaliser('facturation', { motif: 'abonnement_non_reconnu' });
      }
    }
  }
  function relire(espace) {
    if (!actif()) return Promise.reject(erreur('abonnement_non_ouvert'));
    if (enCours.has(espace)) return enCours.get(espace);
    const p = relireImpl(espace).then(() => etat(espace)).finally(() => { enCours.delete(espace); });
    enCours.set(espace, p);
    return p;
  }

  /* ── la passe des dix minutes : les espaces abonnés (et ceux dont une session attend), un par un. Stripe qui ne répond pas arrête la passe après trois échecs de suite (inutile de
        faire attendre deux cents espaces dix secondes chacun) ; rien à lire = rien ne dépend de Stripe = plus d'échec en cours. ── */
  async function relireTous() {
    const ids = stockage.abonnementsARelire(200);
    let ok = 0, ko = 0, suite = 0;
    for (const e of ids) {
      if (arrete) break;
      try { await relire(e); ok++; suite = 0; }
      catch (x) { ko++; if (PANNES.includes(x && x.code) && ++suite >= 3) break; }
    }
    if (!ids.length) echecDepuis = null;
    return { ok, ko, total: ids.length };
  }
  function demarrer() {
    if (!actif() || minuteur) return;
    const passe = async () => { if (passeEnCours || arrete) return; passeEnCours = true; try { await relireTous(); } catch (e) { journaliser('stripe_echec', { motif: 'passe' }); } finally { passeEnCours = false; } };
    premier = setTimeout(passe, Math.min(5000, cfg.relectureMs)); premier.unref();      // un redémarrage ne laisse pas dix minutes un état périmé
    minuteur = setInterval(passe, cfg.relectureMs); minuteur.unref();
  }
  function arreter() { arrete = true; if (premier) clearTimeout(premier); if (minuteur) clearInterval(minuteur); premier = minuteur = null; }

  /* ── ce que l'écran montre : l'état LOCAL (dernier dit par Stripe), sans réseau ── */
  function etat(espace) {
    const a = stockage.abonnementLire(espace), v = formule.formuleDe({ espace }), places = formule.placesDe(espace), n = stockage.espaceMembresN(espace);
    const vivant = !!(a && a.abonnement && STATUTS_VIVANTS.includes(a.statut));
    return {
      ouvert: actif(), mode: cfg.mode, tout_ouvert: formule.toutOuvert(),
      abonnement: a && a.abonnement ? { statut: a.statut, places: a.places, fin_periode: a.fin_periode, annule: a.annule, relu_le: a.relu_le } : null,
      formule: v.formule, motif: v.motif, sursis_jusqua: v.sursis_jusqua || null,
      places: Number.isFinite(places) ? places : null, membres: n, places_depassees: Number.isFinite(places) && vivant && n > places,
      paiement_en_attente: !!(a && a.session && a.session_le !== null && horloge() - a.session_le <= SESSION_VIE_MS),
      stripe_muet: echecDepuis !== null,
    };
  }

  function offres() {
    if (!actif()) return { ouvert: false, motif: 'abonnement_pas_ouvert', tout_ouvert: formule.toutOuvert(), offres: [] };
    return { ouvert: true, mode: cfg.mode, tout_ouvert: formule.toutOuvert(), places: { min: PLACES_MIN, max: PLACES_MAX }, defaut,
      offres: Object.keys(cfg.prix).map(k => ({ id: k, libelle: 'Messages Pro', par: k === 'annuel' ? 'an' : 'mois', euros_par_place: cfg.affichage[k] })) };
  }

  const url = (x) => typeof x === 'string' && /^https?:\/\/[^\s]{4,2000}$/.test(x) ? x : null;
  /* Le portail de facturation : changer les places, la carte, résilier. Il faut un client Stripe (donc un paiement déjà fait). */
  async function portail({ espace, origine }) {
    if (!actif()) throw erreur('abonnement_non_ouvert');
    const a = stockage.abonnementLire(espace);
    if (!a || !a.client || !ID_CLIENT.test(a.client)) throw erreur('pas_d_abonnement');
    const ps = await stripe('POST', '/v1/billing_portal/sessions', [['customer', a.client], ['return_url', origine + '/?abo=portail&e=' + espace + '#reglages']]);
    const u = url(ps.url);
    if (!u) throw erreur('reponse_illisible');
    return { url: u };
  }

  /* Une session de paiement pour CET espace. `adresse` : l'adresse confirmée de la personne de la session (ou null). `origine` : l'origine de la page qui demande, déjà vérifiée par
     `app.js` (une écriture n'arrive jamais ici d'une autre origine). */
  async function paiement({ espace, places, cycle, origine, adresse }) {
    if (!actif()) throw erreur('abonnement_non_ouvert');
    const rythme = cycle === undefined ? defaut : cycle;
    if (typeof rythme !== 'string' || !cfg.prix[rythme]) throw erreur('offre_inconnue');
    const membres = stockage.espaceMembresN(espace), min = Math.max(PLACES_MIN, membres);
    if (!Number.isInteger(places) || places < min || places > PLACES_MAX) throw erreur('places_invalides', { min, max: PLACES_MAX });
    /* ⛔ en production (clé de production), pas d'adresse confirmée = pas de paiement : une facture n'est pas envoyée à personne. En mode test, Checkout la demande lui-même. */
    if (!adresse && cfg.mode === 'live') throw erreur('adresse_requise');
    let a = stockage.abonnementLire(espace);
    /* un seul abonnement vivant : on vérifie chez Stripe qu'il vit encore (Stripe muet : le dernier état connu décide). « Vivant » est plus large que « payé » : un abonnement en attente de
       paiement (`incomplete`) ou en pause existe encore chez Stripe, en ouvrir un second serait le prélever deux fois le jour où l'autre repart. */
    const existe = (x) => !!(x && x.abonnement && !STATUTS_FINAUX.includes(x.statut));
    if (existe(a)) {
      try { await relire(espace); } catch (e) { /* Stripe muet : on se fie à ce qu'on sait */ }
      a = stockage.abonnementLire(espace);
      if (existe(a)) {
        let lien = null; try { lien = (await portail({ espace, origine })).url; } catch (e) { lien = null; }
        throw erreur('abonnement_existant', { portail: lien });
      }
    }
    /* une session encore ouverte est réutilisée : un clic de plus ne fait pas un second abonnement */
    if (a && a.session && ID_SESSION.test(a.session) && a.session_le !== null && horloge() - a.session_le <= SESSION_VIE_MS) {
      let cs = null; try { cs = await stripe('GET', '/v1/checkout/sessions/' + a.session); } catch (e) { if (e.code !== 'introuvable') throw e; }
      if (cs && cs.status === 'open' && url(cs.url) && cs.client_reference_id === 'opmsg:' + espace) return { url: cs.url, reprise: true };
      if (cs && cs.status === 'complete') {
        await relire(espace); a = stockage.abonnementLire(espace);
        if (existe(a)) { let lien = null; try { lien = (await portail({ espace, origine })).url; } catch (e) { lien = null; } throw erreur('abonnement_existant', { portail: lien }); }
      }
    }
    const paires = [
      ['mode', 'subscription'],
      ['line_items[0][price]', cfg.prix[rythme]], ['line_items[0][quantity]', String(places)],
      ['client_reference_id', 'opmsg:' + espace],
      ['metadata[produit]', 'opmsg'], ['metadata[opmsg_espace]', espace],
      ['subscription_data[metadata][produit]', 'opmsg'], ['subscription_data[metadata][opmsg_espace]', espace],
      ['success_url', origine + '/?abo=retour&e=' + espace + '#reglages'], ['cancel_url', origine + '/?abo=annule&e=' + espace + '#reglages'],
      ['locale', 'fr'],
    ];
    if (adresse) paires.push(['customer_email', adresse]);
    const cs = await stripe('POST', '/v1/checkout/sessions', paires);
    const u = url(cs.url);
    if (!ID_SESSION.test(String(cs.id)) || !u) throw erreur('reponse_illisible');
    stockage.abonnementSession(espace, cs.id);
    return { url: u };
  }

  /* minutes depuis lesquelles Stripe est illisible (0 : il l'est, ou rien n'en dépend) — c'est `stripeEchecMin` de /health, que la surveillance lit */
  const echecMin = () => echecDepuis === null ? 0 : Math.max(0, Math.floor((horloge() - echecDepuis) / 60000));
  return { ouvert: actif, mode: () => cfg.mode, offres, etat, paiement, portail, relire, relireTous, demarrer, arreter, echecMin, derniereLecture: () => derniereLecture, lireAbonnement };
}

/* ══ LES ROUTES — `/api/facturation/offres` et `/api/espaces/:id/facturation/*` ═══════════════════════════════════════════════════════════════════
 * Comme `routes-espaces.js` : une fonction par ligne du manifeste, branchées par `installerFacturation`. Les gardes (EA pour l'état, EP pour payer, ouvrir le portail et relire)
 * sont posées par `app.js`. Chaque refus est une chaîne courte que la page sait dire.
 *   503 `abonnement_non_ouvert`  pas de clé configurée (hors bêta : « l'abonnement n'est pas encore ouvert »)   400 `places_invalides` {min, max}   400 `offre_inconnue`
 *   409 `abonnement_existant` {portail}   409 `adresse_requise` (clé de production sans adresse confirmée)       409 `pas_d_abonnement` (portail sans paiement)
 *   502 `stripe_muet` (Stripe ne répond pas : l'état connu reste)   502 `paiement_indisponible` (Stripe a refusé NOTRE demande : tarif, portail non configuré)   */
function installerFacturation(H, ctx) {
  const { config, quotas, facturation } = ctx;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => {
      switch (e && e.code) {
        case 'abonnement_non_ouvert': return refus(res, 503, 'abonnement_non_ouvert');
        case 'places_invalides': return refus(res, 400, 'places_invalides', { min: e.min, max: e.max });
        case 'offre_inconnue': return refus(res, 400, 'offre_inconnue');
        case 'adresse_requise': return refus(res, 409, 'adresse_requise');
        case 'abonnement_existant': return refus(res, 409, 'abonnement_existant', { portail: e.portail || null });
        case 'pas_d_abonnement': return refus(res, 409, 'pas_d_abonnement');
        case 'abonnement_pris': return refus(res, 409, 'abonnement_pris');
        case 'reseau': case 'stripe_panne': case 'cle_refusee': case 'trop_de_demandes': case 'reponse_illisible': return refus(res, 502, 'stripe_muet');
        case 'refus': case 'introuvable': return refus(res, 502, 'paiement_indisponible');
        default: return next(e);
      }
    };
    try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(traduire); }
    catch (e) { traduire(e); }
  };
  function plafond(res, nom, cle, def) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const r = quotas.essai(nom + ':' + cle, q.max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry));
    refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }
  /* ⛔ L'adresse d'une personne qui en a une CONFIRMÉE (un compte à adresse courriel, `origine: 'compte'`) — jamais celle d'un numéro de téléphone ni d'un accès bêta (leur identifiant n'est
     pas une adresse, et un numéro n'est rendu à personne). Aucune des deux portes d'entrée d'aujourd'hui n'en fournit : c'est la place que prendra la connexion Pro (lien créé par TEAM OP). */
  function adresseDe(moi) {
    if (!moi || moi.origine !== 'compte' || !moi.verifie) return null;
    const idf = ctx.stockage.personneIdentifiant(moi.id);
    return typeof idf === 'string' && /^[^\s@:<>]{1,64}@[^\s@:<>]{1,200}\.[^\s@:<>]{2,40}$/.test(idf) ? idf : null;
  }

  H['facturation.offres'] = garder((req, res) => res.json(facturation.offres()));
  H['facturation.etat'] = garder((req, res) => res.json(facturation.etat(req.espace.espace.id)));
  H['facturation.paiement'] = garder(async (req, res) => {
    const b = corps(req);
    if (!plafond(res, 'paiement', req.moi.id, { max: 20, fenetreMs: 3600000 })) return;
    const r = await facturation.paiement({ espace: req.espace.espace.id, places: b.places, cycle: b.cycle, origine: req.headers.origin, adresse: adresseDe(req.moi) });
    res.status(201).json(r);
  });
  H['facturation.portail'] = garder(async (req, res) => {
    if (!plafond(res, 'portail', req.moi.id, { max: 30, fenetreMs: 3600000 })) return;
    res.json(await facturation.portail({ espace: req.espace.espace.id, origine: req.headers.origin }));
  });
  /* « J'ai réglé — vérifier » : un clic relit Stripe pour CET espace, une fois toutes les dix secondes au plus (Stripe n'est pas un compteur à tourner en boucle) */
  H['facturation.relire'] = garder(async (req, res) => {
    if (!facturation.ouvert()) return refus(res, 503, 'abonnement_non_ouvert');
    if (!plafond(res, 'relire', req.espace.espace.id, { max: 1, fenetreMs: 10000 })) return;
    res.json(await facturation.relire(req.espace.espace.id));
  });
}

module.exports = { creerFacturation, installerFacturation, PLACES_MIN, PLACES_MAX, ID_ESPACE, STATUTS_PAYES };
