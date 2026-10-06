/* ══ LE COMPTE PERSO PAR NUMÉRO DE TÉLÉPHONE — CODE SMS, APPAREIL RECONNU, RECHERCHE DE CONTACT ═
 *
 * Décision de Justin, 1er octobre 2026 au soir : « les liens de connexion c'est que pour le côté pro ; pour l'utilisateur classique
 * c'est avec leur numéro de téléphone » ; les contacts se retrouvent par numéro « comme WhatsApp » ; « une connexion pour tous les
 * pays » ; et surtout « le but c'est qu'on gagne de l'argent » : le Perso est gratuit, donc CHAQUE SMS EST UN COÛT.
 *
 * Les routes (toutes montées par le manifeste, comme les autres) :
 *   POST /api/tel/code          {numero}                       P  envoie UN code à 6 chiffres — ou reconnecte SANS SMS un appareil connu
 *   POST /api/tel/verifier      {numero, code, prenom?, nom?, appareil?}   P  crée le compte ou connecte ; pose session + jeton d'appareil
 *   POST /api/tel/appareil      {}                             P  se reconnecte avec le seul jeton d'appareil (aucun SMS)
 *   POST /api/contacts/chercher {numero}                       V  retrouve une personne par son numéro (plafonné, latence constante)
 *   POST /api/contacts/identifiant {identifiant}               V  retrouve une personne par son identifiant « Prénom#1234 » EXACT (mêmes plafonds, même latence)
 *   POST /api/contacts/demander {id}                           V  lui envoie une DEMANDE de contact, si elle vient d'être trouvée (par numéro ou identifiant)
 *   GET  /api/contacts/demandes · POST …/demandes/repondre {id, accepter} · POST …/demandes/annuler {id}   les demandes reçues et envoyées, la réponse, le retrait
 *   GET|POST /api/moi/confidentialite  {trouvable?, presence?, accuses?}  S  « qui peut me trouver par mon numéro ou mon identifiant » (tous | personne), « afficher quand je suis en ligne »,
 *                                                              « confirmations de lecture » — les deux interrupteurs sont RÉCIPROQUES (voir § 4)
 *
 * ⛔ MOINS DE SMS. Un SMS part à l'inscription et sur un NOUVEL appareil, JAMAIS à chaque connexion : la session dure 90 jours GLISSANTS
 * (renouvelée à l'usage), et un appareil déjà vérifié porte un jeton d'appareil (haché en base, 180 jours glissants) qui le reconnecte
 * sans SMS, même après la perte de la session. Le renvoi d'un code attend 60 s.
 * ⛔ AUCUN SMS EN MASSE. Avant l'envoi, dans cet ordre : le numéro est un MOBILE (`numero.js`) ; un pays en emballement exige une
 * preuve de travail (`sms-garde.js`) ; les plafonds par réseau (/24, /64), par appareil, par numéro (1 par 60 s, 5 par jour) ; enfin le
 * BUDGET EN EUROS, global et par pays, réservé dans une transaction. Un refus du budget n'écrit pas un SMS et rend les plafonds pris.
 * ⛔ DES RÉPONSES UNIFORMES. `/api/tel/code` répond pareil que le numéro ait un compte ou non (il envoie un SMS dans les deux cas), et
 * `/api/tel/verifier` répond `code_invalide` pour TOUT ce qui n'est pas un code juste et vivant — numéro inconnu, code périmé,
 * essais épuisés, code déjà utilisé. On ne dit jamais « ce numéro a un compte » avant la preuve du code.
 * ⛔ LE CODE : 6 chiffres tirés par `crypto.randomInt`, rangés HACHÉS (HMAC, jamais en clair), 10 minutes, 5 essais comptés AVANT d'être
 * jugés, usage unique, comparaison à temps constant, et le même travail que le numéro existe ou non.
 * ⛔ AUCUN NUMÉRO NI CODE DANS UN JOURNAL, UN /health OU UNE RÉPONSE : le numéro est scellé au repos (`tel:+…` dans `email_ch`, avec son
 * empreinte HMAC pour l'unicité), les plafonds ne gardent que son empreinte, le journal des SMS ne porte que date, pays, coût.
 * Le seul endroit où un code sort en clair est la porte de TEST (`OPMSG_TEST_CODES`), refusée au démarrage en production.
 */
const crypto = require('crypto'), fs = require('fs');
const { analyser } = require('./numero');
const { identLire, premierMot } = require('./stockage');
const { cleReseau } = require('./quotas');

const JOUR = 86400000, H = 3600000;
const SESSION_TEL_MS = 90 * JOUR, APPAREIL_MS = 180 * JOUR, APPAREIL_ABS_MS = 365 * JOUR;
const CODE_RE = /^\d{6}$/, APPAREIL_RE = /^opd_[A-Za-z0-9_-]{43}$/, ID_PERS = /^p_[0-9a-f]{32}$/;
const CTRL_NOM = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
const nettoyerNom = (s) => String(s).replace(CTRL_NOM, '').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
const dort = (ms) => new Promise(r => setTimeout(r, ms));

/* La clé de réseau d'un SMS : l'IPv4 par /24, l'IPv6 par /64 (un abonné en reçoit au moins un et en tourne les 2^64 adresses). */
function reseauSms(ip) {
  const r = cleReseau(ip);
  const m = /^(\d{1,3}\.\d{1,3}\.\d{1,3})\.\d{1,3}$/.exec(r);
  return m ? m[1] + '.0/24' : r;
}
/* ⛔ Et l'IPv6 se compte AUSSI par /48 : un abonné qui a un /48 en tourne les 65 536 /64, et le plafond par /64 seul ne l'arrêtait pas
   (14 SMS sur 14 acceptés vers la même victime, relecture adverse). → [{ cle, niveau }] du plus fin au plus large. */
function reseauxSms(ip) {
  const r = reseauSms(ip), g = /^([0-9a-f]{4}:[0-9a-f]{4}:[0-9a-f]{4}):[0-9a-f]{4}::\/64$/.exec(r);
  return g ? [{ cle: r, niveau: 'r64' }, { cle: g[1] + '::/48', niveau: 'r48' }] : [{ cle: r, niveau: 'r' }];
}

function creerTelephone(ctx) {
  const { config, stockage, quotas, hub, horloge, journaliser, scelleur, sms } = ctx;
  const cfg = sms.cfg;
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));

  /* Un plafond mémoire : { ok, cle } ; `config.quotas[nom]` le surcharge (bancs). */
  function essai(nom, cle, def, facteur = 1) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const max = Math.max(1, Math.floor(q.max * facteur));
    const k = nom + ':' + cle, r = quotas.essai(k, max, q.fenetreMs);
    return Object.assign({ cle: k }, r);
  }
  const rendre = (cles) => { for (const k of cles) quotas.rembourser(k); };
  const trop = (res, code, retry) => { res.set('Retry-After', String(retry)); return refus(res, 429, code, { retry }); };

  /* ── Les cookies : le jeton d'appareil (HttpOnly, Strict, __Host-, comme la session) ── */
  const nomAppareil = config.cookie.nom + 'a';
  const cookieTexte = (nom, valeur, maxAge) =>
    nom + '=' + valeur + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (config.cookie.secure ? '; Secure' : '');
  function lireCookie(req, nom) {
    const h = req.headers.cookie; if (!h) return null;
    for (const part of h.split(';')) {
      const i = part.indexOf('='); if (i < 0) continue;
      if (part.slice(0, i).trim() === nom) return part.slice(i + 1).trim();
    }
    return null;
  }
  /* L'appareil de la requête : le jeton présenté s'il est bien formé, sinon un jeton NEUF (posé dans la réponse). */
  function appareilDe(req, res) {
    const v = lireCookie(req, nomAppareil);
    if (v && APPAREIL_RE.test(v)) return { jeton: v, h: sha(v), neuf: false };
    const jeton = 'opd_' + crypto.randomBytes(32).toString('base64url');
    if (res) res.append('Set-Cookie', cookieTexte(nomAppareil, jeton, APPAREIL_MS / 1000));
    return { jeton, h: sha(jeton), neuf: true };
  }
  function ouvrirSession(res, personne, appareil) {
    const jeton = 'opm_' + crypto.randomBytes(32).toString('base64url');
    const evincees = stockage.sessionAjouter({ h: sha(jeton), personne, appareil: typeof appareil === 'string' ? nettoyerNom(appareil).slice(0, 40) : null, ttlMs: SESSION_TEL_MS });
    for (const h of evincees) hub.fermerSession(h);
    res.append('Set-Cookie', cookieTexte(config.cookie.nom, jeton, SESSION_TEL_MS / 1000));
  }

  const hNumero = (e164) => scelleur.hmac('tel', 'numero', e164);
  const hReseau = (cle) => scelleur.hmac('tel', 'reseau', cle);
  const hCode = (num_h, code) => scelleur.hmac('tel', 'code', num_h + '|' + code);
  const egal = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const analyse = (n) => analyser(n, { interdits: cfg.interdits });
  const messageDe = (code) => 'Votre code OP MESSAGES : ' + code + (cfg.domaine ? '\n\n@' + cfg.domaine + ' #' + code : '');   // la 2e ligne : le format que Chrome et Safari savent remplir tout seul

  /* La porte de TEST (jamais en production, `config.js` refuse le démarrage) : le code en clair, dans un fichier à part. */
  const codeDeTest = (n, code) => { if (config.testCodes) { try { fs.appendFileSync(config.testCodes, JSON.stringify({ n, code }) + '\n'); } catch (er) { /* la porte de test ne casse pas le service */ } } };

  const H_ = {};

  /* ══ 1. DEMANDER UN CODE ══════════════════════════════════════════════════════════════════════ */
  H_['tel.code'] = async (req, res) => {
    const b = corps(req);
    const a = analyse(b.numero);
    if (!a.ok) {
      const code = (a.raison === 'non_mobile' || a.raison === 'interdit') ? 'numero_non_mobile' : 'numero_invalide';
      sms.refuser(code);
      return refus(res, 400, code);
    }
    const num_h = hNumero(a.e164);

    /* Un appareil DÉJÀ vérifié pour ce numéro : on le reconnecte, sans SMS (le moins de SMS possible). */
    const vu = lireCookie(req, nomAppareil);
    if (vu && APPAREIL_RE.test(vu)) {
      const ap = stockage.telAppareilLire(sha(vu), APPAREIL_ABS_MS);
      const p = ap ? stockage.telPersonneParNumero('tel:' + a.e164) : null;
      /* ⛔ un compte dont la suppression est PROGRAMMÉE ne se reconnecte jamais « sur le seul appareil » : il faut un code, c'est lui qui prouve la ligne — et qui annule la suppression */
      if (ap && p && p.id === ap.personne && p.etat === 'actif' && p.suppression_le === null) {
        const q = essai('tel_appareil_reco', reseauSms(req.ip), { max: 120, fenetreMs: H });
        if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
        stockage.telAppareilToucher(sha(vu), APPAREIL_MS);
        ouvrirSession(res, p.id, b.appareil);
        return res.json({ ok: true, connecte: true, moi: stockage.personneParId(p.id) });
      }
    }

    if (sms.mode === 'inactif') { sms.refuser('sms_inactif'); return refus(res, 503, 'sms_indisponible', { portee: 'service' }); }

    /* ⛔ Un pays en emballement (ou forcé, ou dont l'argent a atteint sa part) : preuve de travail et délai AVANT tout plafond consommé. */
    if (sms.bouclierDe(a.pays)) {
      const d = b.defi && typeof b.defi === 'object' ? b.defi : null;
      if (!d || !sms.defiVerifier({ jeton: d.jeton, nonce: d.nonce, pays: a.pays, num_h })) {
        sms.refuser('defi_requis');
        const nd = sms.defiEmettre({ pays: a.pays, num_h });
        res.set('Retry-After', String(nd.attente_s));
        return refus(res, 428, 'defi_requis', { defi: nd });
      }
    }

    /* Les plafonds, dans l'ordre : réseau (/24, ou /64 puis /48), numéro (60 s), numéro (jour). ⛔ DURABLES et réservés dans la MÊME
       transaction que le budget (`sms.reserver`) : aucune table mémoire à saturer, un redémarrage ne les remet pas à zéro. Il n'y a PAS de
       plafond par appareil : le jeton d'appareil est tenu par celui qui le présente, un robot qui n'en renvoie pas reçoit un cookie neuf. */
    const dev = appareilDe(req, res);
    const lim = (nom, def) => Object.assign({}, def, config.quotas[nom] || {});
    const caps = [];
    for (const rs of reseauxSms(req.ip)) {
      const l = rs.niveau === 'r48' ? lim('tel_reseau48', { max: 40, fenetreMs: H }) : lim('tel_reseau', { max: 10, fenetreMs: H });
      caps.push({ code: 'reseau_plafond', k: 'r:' + hReseau(rs.cle), max: l.max, fenetreMs: l.fenetreMs });
    }
    const l60 = lim('tel_num_60s', { max: 1, fenetreMs: cfg.renvoiMs }), lj = lim('tel_num_jour', { max: 5, fenetreMs: JOUR });
    caps.push({ code: 'renvoi_trop_tot', k: 'n:' + num_h, max: l60.max, fenetreMs: l60.fenetreMs });
    caps.push({ code: 'numero_plafond_jour', k: 'n:' + num_h, max: lj.max, fenetreMs: lj.fenetreMs });

    const r = sms.reserver({ pays: a.pays, cc: a.cc, caps });
    if (!r.ok) {
      if (r.plafond) { sms.refuser(r.plafond); return trop(res, r.plafond, r.retry); }
      sms.refuser(r.motif);
      res.set('Retry-After', '1800');
      return refus(res, 503, 'sms_indisponible', { portee: /pays/.test(r.motif) ? 'pays' : 'global' });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    /* ⛔ Le code se POSE après l'envoi, jamais avant : un envoi qui échoue ne doit pas écraser — puis supprimer — le code valable d'un envoi
       précédent (la personne a reçu un SMS, redemande pendant une panne d'OVH, et son premier code ne marchait plus). Rien ne peut répondre
       entre l'envoi et la pose : tout est synchrone après l'`await`. */
    const poserCode = () => stockage.telCodePoser({ num_h, code_h: hCode(num_h, code), exp: horloge() + cfg.codeMs, ap_h: dev.h });
    const e = await sms.envoyer({ id: r.id, cout: r.cout, numero: a.e164, message: messageDe(code) });
    const reponse = { ok: true, delai_s: Math.ceil(cfg.renvoiMs / 1000), expire_s: Math.ceil(cfg.codeMs / 1000), longueur: 6 };
    if (!e.ok) {
      sms.refuser('envoi_' + e.genre);
      /* ⛔ « INCERTAIN » : le SMS est peut-être parti. On GARDE le code (s'il arrive, la personne doit pouvoir le taper : le supprimer la
         laissait avec un SMS valable et un « code invalide »), on GARDE le coût et les plafonds (on suppose le pire), et on répond comme
         pour un envoi réussi — avec `incertain`, pour que l'écran puisse dire « s'il n'arrive pas, redemandez dans une minute ». */
      if (e.genre === 'incertain') { poserCode(); codeDeTest(a.e164, code); return res.json(Object.assign(reponse, { incertain: true })); }
      /* ⛔ « Ce numéro n'existe pas » (OVH) NE REND PAS les plafonds : sinon un robot sonde la validité de numéros à plusieurs centaines par
         minute et par réseau, sur nos clés d'API. Tout le reste est une panne de NOTRE côté (rien n'est parti : clés, crédits, service
         injoignable) : le coût et les plafonds sont rendus, la personne n'a rien consommé. */
      if (e.genre === 'numero') return refus(res, 400, 'numero_invalide');
      sms.rendre(r.id);
      res.set('Retry-After', '60');
      return refus(res, 503, 'sms_indisponible', { portee: 'service' });
    }
    poserCode();
    codeDeTest(a.e164, code);
    res.json(reponse);
  };

  /* ══ 2. PROUVER LE CODE : CRÉER LE COMPTE OU CONNECTER ════════════════════════════════════════ */
  H_['tel.verifier'] = (req, res) => {
    const b = corps(req);
    const a = analyse(b.numero);
    if (!a.ok) return refus(res, 400, 'numero_invalide');
    /* Un code collé avec ses espaces (« 123 456 », la présentation de beaucoup de SMS) est le même code : l'écran n'a pas à le deviner. */
    const brut = typeof b.code === 'string' ? b.code.replace(/[\s\u00a0\u202f]/g, '') : b.code;
    if (typeof brut !== 'string' || !CODE_RE.test(brut)) return refus(res, 400, 'champ_invalide');
    const num_h = hNumero(a.e164);
    const dev = appareilDe(req, res);
    /* ⛔ LES ÉCHECS SE COMPTENT PAR (numéro, APPAREIL), PAS PAR NUMÉRO SEUL : dix faux codes par heure d'un inconnu verrouillaient la vérification
       du numéro de sa victime — qui, avec le BON code, recevait 429 pendant une heure (relecture adverse). Le compteur de l'inconnu est le sien. */
    const q1 = essai('tel_verif_reseau', reseauSms(req.ip), { max: 60, fenetreMs: H });
    if (!q1.ok) return trop(res, 'reseau_plafond', q1.retry);
    const q2 = essai('tel_verif_num', num_h + '|' + dev.h, { max: 10, fenetreMs: H });
    if (!q2.ok) { rendre([q1.cle]); return trop(res, 'numero_plafond_jour', q2.retry); }

    /* ⛔ Le MÊME travail que le numéro ait un code en attente ou non : on calcule toujours l'empreinte du code reçu et on compare. */
    const rec = stockage.telCodeEssayer(num_h, cfg.essaisCode, dev.h);
    const recu = hCode(num_h, brut);
    const attendu = rec ? rec.code_h : hCode(num_h, 'absent:' + crypto.randomBytes(8).toString('hex'));
    const juste = egal(recu, attendu) && !!rec;
    if (!juste) return refus(res, 401, 'code_invalide');

    const identifiant = 'tel:' + a.e164;
    let p = stockage.telPersonneParNumero(identifiant), nouveau = false;
    let prenom = '', nom = '';
    if (!p) {
      /* ⛔ Les champs se jugent AVANT de consommer le code : un prénom trop long ou mal typé répondait 400 APRÈS la suppression du code, et la
         personne devait redemander un SMS (relecture adverse). Le code juste reste valable pour un second essai avec un prénom correct. */
      if (b.prenom !== undefined) { if (typeof b.prenom !== 'string') return refus(res, 400, 'champ_invalide'); prenom = nettoyerNom(b.prenom); if (prenom.length > 60) return refus(res, 400, 'champ_invalide'); }
      if (b.nom !== undefined) { if (typeof b.nom !== 'string') return refus(res, 400, 'champ_invalide'); nom = nettoyerNom(b.nom); if (nom.length > 60) return refus(res, 400, 'champ_invalide'); }
    } else if (p.etat !== 'actif') { stockage.telCodeSupprimer(num_h); return refus(res, 401, 'code_invalide'); }
    stockage.telCodeSupprimer(num_h);   // usage unique
    if (!p) { p = stockage.personneCreer({ identifiant, prenom, nom, origine: 'telephone', verifie: true }); nouveau = true; }
    /* ⛔ SE RECONNECTER AVANT L'ÉCHÉANCE ANNULE LA SUPPRESSION du compte (J+14) : la preuve du code est celle de la ligne. La réponse le DIT (`suppression_annulee`), la page l'écrit. */
    const annulee = !nouveau && p.suppression_le !== null && stockage.suppressionAnnuler(p.id);
    /* … et son abonnement Perso+ se renouvelle de nouveau (sauf s'il avait été arrêté par elle avant sa demande) : noté dans la transaction de l'annulation, il part chez Stripe sans qu'on l'attende */
    if (annulee) { try { if (ctx.facturation) ctx.facturation.perso.annulationsTraiter(); } catch (e) { /* noté : la passe des dix minutes le rejoue */ } }
    rendre([q1.cle, q2.cle]);   // une réussite n'use pas le plafond des échecs
    /* ⛔ Un compte existant, un appareil qu'il ne connaît pas : l'ancien titulaire d'un numéro réattribué (ou d'une SIM échangée) garde ses
       appareils, et le nouveau entre dans SON compte. On PRÉVIENT les autres appareils (notification, tout de suite) ; « Déconnecter les
       autres appareils » les coupe d'un geste (`moi.appareils.deconnecter`). Et un appareil ne se reconnecte pas SANS SMS plus d'un an. */
    const connu = stockage.telAppareilLire(dev.h, APPAREIL_ABS_MS);
    const appareilNouveau = !nouveau && !(connu && connu.personne === p.id);
    const moi = stockage.personneParId(p.id);
    ouvrirSession(res, p.id, b.appareil);
    stockage.telAppareilLier({ h: dev.h, personne: p.id, nom: typeof b.appareil === 'string' ? nettoyerNom(b.appareil).slice(0, 40) : null, ttlMs: APPAREIL_MS });
    if (appareilNouveau) {
      try {
        const n = stockage.notifCreer({ uid: p.id, type: 'nouvel_appareil', titre: 'Nouvel appareil connecté', texte: 'Un appareil vient de se connecter à votre compte avec votre numéro de téléphone. Si ce n\'est pas vous, déconnectez les autres appareils.', cible: p.id });
        hub.reveiller({ uids: [p.id] });
        /* ⛔ LA SÉCURITÉ PASSE PAR LE PUSH : les autres appareils de la personne (celui-ci n'est pas encore abonné) reçoivent « Nouvel appareil connecté », sans nom ni lieu. Ce message EST la charge minimale. */
        if (ctx.push) ctx.push.pousser(p.id, { type: 'appareil', tag: 'appareil', url: '/', renotify: true, titre: 'Nouvel appareil connecté', corps: 'Si ce n\'est pas vous, déconnectez les autres appareils.' }, { gid: n.gid });
      } catch (e) { /* une notification ratée ne défait pas la connexion */ }
    }
    res.json(annulee ? { ok: true, nouveau, moi, suppression_annulee: true } : { ok: true, nouveau, moi });
  };

  /* ══ 3. SE RECONNECTER AVEC LE SEUL JETON D'APPAREIL ══════════════════════════════════════════ */
  H_['tel.appareil'] = (req, res) => {
    const q = essai('tel_appareil_reco', reseauSms(req.ip), { max: 120, fenetreMs: H });
    if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
    const v = lireCookie(req, nomAppareil);
    const ap = v && APPAREIL_RE.test(v) ? stockage.telAppareilLire(sha(v), APPAREIL_ABS_MS) : null;
    const p = ap ? stockage.personneParId(ap.personne) : null;
    if (!p || p.etat !== 'actif' || stockage.suppressionLe(p.id) !== null) return refus(res, 401, 'appareil_inconnu');   // ⛔ suppression programmée : pas de reconnexion sans code
    stockage.telAppareilToucher(sha(v), APPAREIL_MS);
    ouvrirSession(res, p.id, corps(req).appareil);
    res.json({ ok: true, moi: p });
  };

  /* « Déconnecter les autres appareils » : toutes les sessions et tous les jetons d'appareil de la personne SAUF ceux de l'appareil d'où l'on
     le demande. Le geste de qui a perdu un téléphone, ou vu « Nouvel appareil connecté » sans l'avoir fait.
     ⛔ LES NOTIFICATIONS DES AUTRES APPAREILS AUSSI : un téléphone perdu dont la session est coupée mais l'abonnement push gardé continuerait de recevoir « Nouveau message » (et le texte, si
     l'aperçu est activé). La page donne le point d'accès de CET appareil (`endpoint`, facultatif) : le sien reste, tous les autres partent. */
  H_['moi.appareils.deconnecter'] = (req, res) => {
    const q = essai('deco_autres', req.moi.id, { max: 10, fenetreMs: H });
    if (!q.ok) return trop(res, 'quota_atteint', q.retry);
    const hs = stockage.sessionsSupprimerAutres(req.moi.id, req.sessionH);
    for (const h of hs) hub.fermerSession(h);
    const v = lireCookie(req, nomAppareil);
    const appareils = stockage.telAppareilsSupprimerAutres(req.moi.id, v && APPAREIL_RE.test(v) ? sha(v) : '');
    const b = corps(req);
    const notifications = stockage.pushRetirerAutres(req.moi.id, typeof b.endpoint === 'string' ? b.endpoint : null);
    /* les appareils « connus » d'un compte par adresse aussi (relecture du gardien, R-a) : sinon celui d'un intrus resterait exempté du plafond d'essais, et sa reconnexion ne préviendrait personne */
    try { if (typeof stockage.appareilsMelOublier === 'function') stockage.appareilsMelOublier(req.moi.id, v && APPAREIL_RE.test(v) ? sha(v) : ''); } catch (e) { /* une base d'avant la migration 12 */ }
    res.json({ ok: true, sessions: hs.length, appareils, notifications });
  };

  /* La déconnexion couvre aussi le jeton d'appareil : sinon « se déconnecter » se déferait toute seule au prochain lancement. */
  const deconnexionDeBase = ctx.H && ctx.H['compte.deconnexion'];
  const deconnexion = (req, res) => {
    const v = lireCookie(req, nomAppareil);
    if (v && APPAREIL_RE.test(v)) stockage.telAppareilSupprimer(sha(v));
    res.append('Set-Cookie', cookieTexte(nomAppareil, '', 0));
    return deconnexionDeBase(req, res);
  };

  /* ══ 4. LA CONFIDENTIALITÉ : qui peut me trouver par mon numéro, ma présence, mes confirmations de lecture ═══════════════════
     ⛔ UNE SEULE ROUTE pour les trois réglages (Réglages > Confidentialité) : `trouvable` (tous | personne) et deux interrupteurs RÉCIPROQUES, comme chez WhatsApp —
     `presence` (« Afficher quand je suis en ligne » : coupé, personne ne voit la mienne ET je ne vois celle de personne) et `accuses` (« Confirmations de lecture » :
     coupé, mon « Lu » n'est rendu à personne ET je ne vois celui de personne). Ils sont rangés dans `personne.prefs` et APPLIQUÉS PAR LE SERVICE (`flux.js`, `routes.js`,
     `stockage.js`) : un réglage que seule la page respecterait ne protégerait personne. Les trois champs sont facultatifs, au moins un est obligatoire. */
  const etatConfidentialite = (id) => {
    const p = stockage.personneParId(id), prefs = (p && p.prefs) || {};
    return { trouvable: stockage.telTrouvableLire(id), presence: prefs.presence !== false, accuses: prefs.accuses !== false };
  };
  H_['moi.confidentialite.lire'] = (req, res) => res.json(etatConfidentialite(req.moi.id));
  H_['moi.confidentialite'] = (req, res) => {
    const b = corps(req), c = {};
    if (b.trouvable !== undefined) { if (b.trouvable !== 'tous' && b.trouvable !== 'personne') return refus(res, 400, 'champ_invalide'); c.trouvable = b.trouvable; }
    for (const k of ['presence', 'accuses']) if (b[k] !== undefined) { if (typeof b[k] !== 'boolean') return refus(res, 400, 'champ_invalide'); c[k] = b[k]; }
    if (!Object.keys(c).length) return refus(res, 400, 'champ_invalide');
    const q = essai('moi_confidentialite', req.moi.id, { max: 30, fenetreMs: H });
    if (!q.ok) return trop(res, 'quota_atteint', q.retry);
    if (c.trouvable !== undefined) stockage.telTrouvableMaj(req.moi.id, c.trouvable);
    if (c.presence !== undefined || c.accuses !== undefined) {
      const avant = req.moi.prefs || {}, prefs = Object.assign({}, avant);
      for (const k of ['presence', 'accuses']) if (c[k] !== undefined) prefs[k] = c[k];
      const moi = stockage.personneMaj(req.moi.id, { prefs });
      hub.reglagesChanges(req.moi.id, avant, moi.prefs);   // les autres l'apprennent tout de suite (présence), ou relisent les « Lu » (accusés)
    }
    res.json(Object.assign({ ok: true }, etatConfidentialite(req.moi.id)));
  };

  /* ══ 5. RETROUVER UNE PERSONNE PAR SON NUMÉRO — « comme WhatsApp », sans annuaire ═════════════ */
  /* Qui vient d'être trouvé par qui (10 minutes) : `ajouter` ne vaut que pour une personne qu'on vient de chercher — un identifiant
     deviné ou ramassé ailleurs n'ouvre pas un contact. Mémoire bornée. */
  const trouves = new Map();
  function noterTrouve(uid, id) {
    const t = horloge();
    if (trouves.size > 20000) for (const [k, fin] of trouves) { if (fin <= t) trouves.delete(k); if (trouves.size <= 15000) break; }
    if (trouves.size > 20000) trouves.clear();
    trouves.set(uid + '|' + id, t + 10 * 60000);
  }
  const jeune = (moi) => horloge() - moi.cree < JOUR;

  H_['contacts.chercher'] = async (req, res) => {
    const t0 = Date.now();
    const a = analyser(corps(req).numero);
    if (!a.ok) return refus(res, 400, 'numero_invalide');
    const uid = req.moi.id;
    /* ⛔ ANTI-ÉNUMÉRATION : un plafond DURABLE par compte et par jour (en base : un redémarrage ne le remet pas à zéro), plus bas pour un
       compte de moins de 24 h, et une rafale limitée. Le plafond se vérifie AVANT de savoir si le numéro existe. */
    const maxJour = jeune(req.moi) ? cfg.rechercheJourJeune : cfg.rechercheJour;
    if (stockage.rechercheCompter(uid, horloge() - JOUR) >= maxJour) return trop(res, 'recherches_plafond', 3600);
    const q = essai('chercher_minute', uid, { max: 5, fenetreMs: 60000 });
    if (!q.ok) return trop(res, 'recherches_plafond', q.retry);
    stockage.rechercheNoter(uid);

    const p = stockage.telPersonneParNumero('tel:' + a.e164);
    const bloque = p ? stockage.contactBloque(uid, p.id) : false;
    const visible = !!p && p.etat === 'actif' && p.suppression_le === null && p.id !== uid && p.trouvable === 'tous' && !bloque;   // ⛔ un compte qui va disparaître n'est plus trouvé par personne
    let rep = { trouve: false };
    if (visible) {
      const deja = stockage.contactActif(uid, p.id);
      noterTrouve(uid, p.id);
      rep = { trouve: true, id: p.id, prenom: p.prenom, deja_contact: deja, ajout_possible: !deja };
    }
    /* ⛔ LA MÊME LATENCE, trouvé ou non : une réponse plus rapide pour « personne » dirait quels numéros ont un compte, plafond ou pas. */
    const reste = cfg.rechercheLatenceMs - (Date.now() - t0);
    if (reste > 0) await dort(reste);
    res.json(rep);
  };

  /* ⛔ IL N'Y A PLUS D'« AJOUTER » : `contacts.ajouter` créait un contact MUTUEL sans l'accord de la personne trouvée — et l'API la gardait ouverte après l'arrivée des
     demandes, si bien qu'un refus se contournait en un appel (relecture du gardien, B1, 5 octobre 2026 : contact forcé, nom de famille lu, notification « est maintenant dans
     vos contacts »). Trouvée par numéro OU par identifiant, une personne ne devient un contact que par une DEMANDE qu'elle accepte (§ 6). */

  /* ══ 6. L'IDENTIFIANT « Prénom#1234 » ET LES DEMANDES DE CONTACT (Justin, 5 octobre 2026) ═════════
     Retrouver quelqu'un par son identifiant EXACT obéit aux MÊMES règles que le numéro, et partage SES plafonds : le compteur durable du jour (`recherche_tel`), la rafale de
     5 par minute, la même latence plancher, la même réponse neutre pour « personne », « m'a bloqué », « ne veut pas être trouvé », « c'est moi », « compte qui s'efface ». Un
     identifiant n'est pas un nom : « Camille » seul est refusé (400) avant même d'être compté.
     Trouver ne crée PAS de contact : `demander` crée une DEMANDE, que la personne accepte ou refuse (« demande à accepter », même jour). `demander` ne vaut, comme `ajouter`,
     que pour une personne qu'on vient de trouver (par identifiant OU par numéro) — un identifiant de personne ramassé ailleurs n'envoie rien. */
  const nomDe = (moi) => (moi.prenom + ' ' + moi.nom).trim() || 'Quelqu\'un';
  const relation = (uid, id) => stockage.demandesRecues(uid).some(d => d.id === id) ? 'recue' : stockage.demandesEnvoyees(uid).some(d => d.id === id) ? 'envoyee' : 'aucune';
  function prevenir(uid, type, titre, texte, auteur) {
    try {
      const n = stockage.notifCreer({ uid, type, titre, texte, cible: auteur, auteur });
      hub.reveiller({ uids: [uid] });
      if (ctx.push) ctx.push.pousser(uid, { type: 'contact', tag: 'contact', url: type === 'contact_demande' ? '/#contacts' : '/', titre: 'OP MESSAGES', corps: titre, detail: { titre, corps: texte } }, { gid: n.gid });
    } catch (e) { /* une notification ratée ne défait pas le geste */ }
  }

  H_['contacts.identifiant'] = async (req, res) => {
    const t0 = Date.now();
    const lu = identLire(corps(req).identifiant);
    if (!lu) return refus(res, 400, 'identifiant_invalide');
    const uid = req.moi.id;
    const maxJour = jeune(req.moi) ? cfg.rechercheJourJeune : cfg.rechercheJour;
    if (stockage.rechercheCompter(uid, horloge() - JOUR) >= maxJour) return trop(res, 'recherches_plafond', 3600);
    const q = essai('chercher_minute', uid, { max: 5, fenetreMs: 60000 });
    if (!q.ok) return trop(res, 'recherches_plafond', q.retry);
    stockage.rechercheNoter(uid);

    const p = stockage.personneParIdent(lu.base, lu.num);
    const bloque = p ? stockage.contactBloque(uid, p.id) : false;
    const visible = !!p && p.etat === 'actif' && p.suppression_le === null && p.id !== uid && p.trouvable === 'tous' && !bloque;
    let rep = { trouve: false };
    if (visible) {
      noterTrouve(uid, p.id);
      const deja = stockage.contactActif(uid, p.id);
      /* le PREMIER MOT du prénom : un compte bêta range son nom complet dans le prénom (le commentaire reste HORS de l'objet : test-918 lit ses clés) */
      rep = { trouve: true, id: p.id, prenom: premierMot(p.prenom), identifiant: stockage.identDe(p.id), deja_contact: deja, demande: deja ? 'aucune' : relation(uid, p.id) };
    }
    const reste = cfg.rechercheLatenceMs - (Date.now() - t0);
    if (reste > 0) await dort(reste);
    res.json(rep);
  };

  H_['contacts.demander'] = (req, res) => {
    const id = corps(req).id;
    if (typeof id !== 'string' || !ID_PERS.test(id) || id === req.moi.id) return refus(res, 400, 'champ_invalide');
    const uid = req.moi.id;
    const q = essai('ajout_jour', uid, { max: cfg.ajoutJour, fenetreMs: JOUR }, jeune(req.moi) ? 1 / 3 : 1);
    if (!q.ok) return trop(res, 'ajouts_plafond', q.retry);
    const fin = trouves.get(uid + '|' + id);
    const p = fin && fin > horloge() ? stockage.personneParId(id) : null;
    const t = p ? stockage.telTrouvableLire(id) : null;
    if (!p || p.etat !== 'actif' || t !== 'tous' || stockage.contactBloque(uid, id) || stockage.suppressionLe(id) !== null) { rendre([q.cle]); return refus(res, 404, 'introuvable'); }
    trouves.delete(uid + '|' + id);
    let r;
    try { r = stockage.demandeCreer(uid, id); } catch (e) { if (e && e.code === 'demandes_plafond') { rendre([q.cle]); return trop(res, 'demandes_plafond', 3600); } throw e; }
    /* une notification pour une demande NEUVE seulement : retirée puis redemandée, la même demande ne relance personne (relecture du gardien, A2) */
    if (r.neuve && r.resultat === 'envoyee') prevenir(id, 'contact_demande', 'Demande de contact', nomDe(req.moi) + ' veut vous ajouter à ses contacts.', uid);
    else if (r.neuve && r.resultat === 'acceptee') prevenir(id, 'contact_ajoute', 'Nouveau contact', nomDe(req.moi) + ' est maintenant dans vos contacts.', uid);
    /* le plafond se consomme sur ce que l'AUTEUR voit (« envoyee », « acceptee »), jamais sur ce que l'autre a répondu : refusée ou non, la même chose */
    if (r.resultat === 'deja' || r.resultat === 'deja_envoyee') rendre([q.cle]);
    res.json({ ok: true, resultat: r.resultat });
  };

  H_['contacts.demandes'] = (req, res) => {
    res.json({ recues: stockage.demandesRecues(req.moi.id), envoyees: stockage.demandesEnvoyees(req.moi.id), identifiant: stockage.identDe(req.moi.id) });
  };

  H_['contacts.repondre'] = (req, res) => {
    const b = corps(req), id = b.id;
    if (typeof id !== 'string' || !ID_PERS.test(id) || id === req.moi.id || typeof b.accepter !== 'boolean') return refus(res, 400, 'champ_invalide');
    const q = essai('demande_reponse', req.moi.id, { max: 60, fenetreMs: 60 * 60000 });
    if (!q.ok) return trop(res, 'quota_atteint', q.retry);
    let r;
    try { r = stockage.demandeRepondre(req.moi.id, id, b.accepter); } catch (e) { if (e && e.code === 'introuvable') return refus(res, 404, 'introuvable'); throw e; }
    if (r === 'acceptee') { prevenir(id, 'contact_ajoute', 'Demande acceptée', nomDe(req.moi) + ' a accepté votre demande : vous êtes maintenant en contact.', req.moi.id); hub.reveiller({ uids: [req.moi.id] }); }
    res.json({ ok: true, resultat: r });
  };

  H_['contacts.annuler'] = (req, res) => {
    const id = corps(req).id;
    if (typeof id !== 'string' || !ID_PERS.test(id) || id === req.moi.id) return refus(res, 400, 'champ_invalide');
    const q = essai('demande_reponse', req.moi.id, { max: 60, fenetreMs: 60 * 60000 });
    if (!q.ok) return trop(res, 'quota_atteint', q.retry);
    try { stockage.demandeAnnuler(req.moi.id, id); } catch (e) { if (e && e.code === 'introuvable') return refus(res, 404, 'introuvable'); throw e; }
    res.json({ ok: true });
  };

  return { handlers: H_, deconnexion, sante: () => sms.sante() };
}

/* Branche les gestionnaires dans le tableau de `routes.js` : une fonction par ligne du manifeste, et la déconnexion enrichie. */
function installerTelephone(H, ctx) {
  const t = creerTelephone(Object.assign({}, ctx, { H }));
  Object.assign(H, t.handlers);
  H['compte.deconnexion'] = t.deconnexion;
  return t;
}

/* Une session de compte par numéro qui sert prolonge AUSSI le jeton d'appareil du même navigateur (appelé par la garde de session) : un utilisateur actif
   pendant 160 jours puis absent 91 jours devait retaper un SMS, parce que seule une reconnexion sans SMS prolongeait le jeton. L'écriture reste
   limitée à une par heure (`telAppareilToucher`). Le plafond absolu (`APPAREIL_ABS_MS`, depuis la dernière preuve par SMS) ne bouge pas. */
function appareilToucherDe(req, config, stockage) {
  const h = req.headers.cookie; if (!h) return;
  const nom = config.cookie.nom + 'a';
  for (const part of h.split(';')) {
    const i = part.indexOf('='); if (i < 0) continue;
    if (part.slice(0, i).trim() !== nom) continue;
    const v = part.slice(i + 1).trim();
    if (APPAREIL_RE.test(v)) stockage.telAppareilToucher(sha(v), APPAREIL_MS);
    return;
  }
}

module.exports = { installerTelephone, creerTelephone, reseauSms, reseauxSms, appareilToucherDe, SESSION_TEL_MS, APPAREIL_MS, APPAREIL_ABS_MS };
