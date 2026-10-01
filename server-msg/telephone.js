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
 *   POST /api/contacts/ajouter  {id}                           V  l'ajoute, si elle vient d'être trouvée
 *   GET|POST /api/moi/confidentialite  {trouvable}             S  « qui peut me trouver par mon numéro » : tous | personne
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
const { cleReseau } = require('./quotas');

const JOUR = 86400000, H = 3600000;
const SESSION_TEL_MS = 90 * JOUR, APPAREIL_MS = 180 * JOUR;
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
  const hCode = (num_h, code) => scelleur.hmac('tel', 'code', num_h + '|' + code);
  const egal = (a, b) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
  const analyse = (n) => analyser(n, { interdits: cfg.interdits });
  const messageDe = (code) => 'Votre code OP MESSAGES : ' + code + (cfg.domaine ? '\n\n@' + cfg.domaine + ' #' + code : '');   // la 2e ligne : le format que Chrome et Safari savent remplir tout seul

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
      const ap = stockage.telAppareilLire(sha(vu));
      const p = ap ? stockage.telPersonneParNumero('tel:' + a.e164) : null;
      if (ap && p && p.id === ap.personne && p.etat === 'actif') {
        const q = essai('tel_appareil_reco', reseauSms(req.ip), { max: 120, fenetreMs: H });
        if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
        stockage.telAppareilToucher(sha(vu), APPAREIL_MS);
        ouvrirSession(res, p.id, b.appareil);
        return res.json({ ok: true, connecte: true, moi: stockage.personneParId(p.id) });
      }
    }

    if (sms.mode === 'inactif') { sms.refuser('sms_inactif'); return refus(res, 503, 'sms_indisponible', { portee: 'service' }); }

    /* ⛔ Un pays en emballement (ou forcé) : preuve de travail et délai AVANT tout plafond consommé. */
    if (sms.bouclierDe(a.pays)) {
      const d = b.defi && typeof b.defi === 'object' ? b.defi : null;
      if (!d || !sms.defiVerifier({ jeton: d.jeton, nonce: d.nonce, pays: a.pays, num_h })) {
        sms.refuser('defi_requis');
        const nd = sms.defiEmettre({ pays: a.pays, num_h });
        res.set('Retry-After', String(nd.attente_s));
        return refus(res, 428, 'defi_requis', { defi: nd });
      }
    }

    /* Les plafonds, dans l'ordre : réseau, appareil, numéro (60 s), numéro (jour). Un refus rend ceux déjà pris. */
    const dev = appareilDe(req, res);
    const portes = [
      ['tel_reseau', reseauSms(req.ip), { max: 10, fenetreMs: H }, 'reseau_plafond'],
      ['tel_appareil', dev.h, { max: 5, fenetreMs: JOUR }, 'appareil_plafond'],
      ['tel_num_60s', num_h, { max: 1, fenetreMs: cfg.renvoiMs }, 'renvoi_trop_tot'],
      ['tel_num_jour', num_h, { max: 5, fenetreMs: JOUR }, 'numero_plafond_jour'],
    ];
    const pris = [];
    for (const [nom, cle, def, code] of portes) {
      const q = essai(nom, cle, def);
      if (!q.ok) { rendre(pris); sms.refuser(code); return trop(res, code, q.retry); }
      pris.push(q.cle);
    }

    /* Le budget en euros : réservé ici, dans une transaction. Rien n'est écrit s'il est dépassé. */
    const r = sms.reserver({ pays: a.pays, cc: a.cc });
    if (!r.ok) {
      rendre(pris); sms.refuser(r.motif);
      res.set('Retry-After', '1800');
      return refus(res, 503, 'sms_indisponible', { portee: /pays/.test(r.motif) ? 'pays' : 'global' });
    }

    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    stockage.telCodePoser({ num_h, code_h: hCode(num_h, code), exp: horloge() + cfg.codeMs });
    const e = await sms.envoyer({ id: r.id, cout: r.cout, numero: a.e164, message: messageDe(code) });
    if (!e.ok) {
      stockage.telCodeSupprimer(num_h);
      if (e.genre !== 'incertain') rendre(pris);   // un refus franc ne coûte rien à la personne ; un doute garde ses plafonds
      sms.refuser('envoi_' + e.genre);
      if (e.genre === 'numero') return refus(res, 400, 'numero_invalide');
      return refus(res, 503, 'sms_indisponible', { portee: 'service' });
    }
    /* La porte de TEST (jamais en production, `config.js` refuse le démarrage) : le code en clair, dans un fichier à part. */
    if (config.testCodes) { try { fs.appendFileSync(config.testCodes, JSON.stringify({ n: a.e164, code }) + '\n'); } catch (er) { /* la porte de test ne casse pas le service */ } }
    res.json({ ok: true, delai_s: Math.ceil(cfg.renvoiMs / 1000), expire_s: Math.ceil(cfg.codeMs / 1000), longueur: 6 });
  };

  /* ══ 2. PROUVER LE CODE : CRÉER LE COMPTE OU CONNECTER ════════════════════════════════════════ */
  H_['tel.verifier'] = (req, res) => {
    const b = corps(req);
    const a = analyse(b.numero);
    if (!a.ok) return refus(res, 400, 'numero_invalide');
    if (typeof b.code !== 'string' || !CODE_RE.test(b.code)) return refus(res, 400, 'champ_invalide');
    const num_h = hNumero(a.e164);
    const q1 = essai('tel_verif_reseau', reseauSms(req.ip), { max: 60, fenetreMs: H });
    if (!q1.ok) return trop(res, 'reseau_plafond', q1.retry);
    const q2 = essai('tel_verif_num', num_h, { max: 10, fenetreMs: H });
    if (!q2.ok) { rendre([q1.cle]); return trop(res, 'numero_plafond_jour', q2.retry); }

    /* ⛔ Le MÊME travail que le numéro ait un code en attente ou non : on calcule toujours l'empreinte du code reçu et on compare. */
    const rec = stockage.telCodeEssayer(num_h, cfg.essaisCode);
    const recu = hCode(num_h, b.code);
    const attendu = rec ? rec.code_h : hCode(num_h, 'absent:' + crypto.randomBytes(8).toString('hex'));
    const juste = egal(recu, attendu) && !!rec;
    if (!juste) return refus(res, 401, 'code_invalide');
    stockage.telCodeSupprimer(num_h);   // usage unique

    const identifiant = 'tel:' + a.e164;
    let p = stockage.telPersonneParNumero(identifiant), nouveau = false;
    if (p) {
      if (p.etat !== 'actif') return refus(res, 401, 'code_invalide');
    } else {
      let prenom = '', nom = '';
      if (b.prenom !== undefined) { if (typeof b.prenom !== 'string') return refus(res, 400, 'champ_invalide'); prenom = nettoyerNom(b.prenom); if (prenom.length > 60) return refus(res, 400, 'champ_invalide'); }
      if (b.nom !== undefined) { if (typeof b.nom !== 'string') return refus(res, 400, 'champ_invalide'); nom = nettoyerNom(b.nom); if (nom.length > 60) return refus(res, 400, 'champ_invalide'); }
      p = stockage.personneCreer({ identifiant, prenom, nom, origine: 'telephone', verifie: true });
      nouveau = true;
    }
    rendre([q1.cle, q2.cle]);   // une réussite n'use pas le plafond des échecs
    const moi = stockage.personneParId(p.id);
    ouvrirSession(res, p.id, b.appareil);
    const dev = appareilDe(req, res);
    stockage.telAppareilLier({ h: dev.h, personne: p.id, nom: typeof b.appareil === 'string' ? nettoyerNom(b.appareil).slice(0, 40) : null, ttlMs: APPAREIL_MS });
    res.json({ ok: true, nouveau, moi });
  };

  /* ══ 3. SE RECONNECTER AVEC LE SEUL JETON D'APPAREIL ══════════════════════════════════════════ */
  H_['tel.appareil'] = (req, res) => {
    const q = essai('tel_appareil_reco', reseauSms(req.ip), { max: 120, fenetreMs: H });
    if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
    const v = lireCookie(req, nomAppareil);
    const ap = v && APPAREIL_RE.test(v) ? stockage.telAppareilLire(sha(v)) : null;
    const p = ap ? stockage.personneParId(ap.personne) : null;
    if (!p || p.etat !== 'actif') return refus(res, 401, 'appareil_inconnu');
    stockage.telAppareilToucher(sha(v), APPAREIL_MS);
    ouvrirSession(res, p.id, corps(req).appareil);
    res.json({ ok: true, moi: p });
  };

  /* La déconnexion couvre aussi le jeton d'appareil : sinon « se déconnecter » se déferait toute seule au prochain lancement. */
  const deconnexionDeBase = ctx.H && ctx.H['compte.deconnexion'];
  const deconnexion = (req, res) => {
    const v = lireCookie(req, nomAppareil);
    if (v && APPAREIL_RE.test(v)) stockage.telAppareilSupprimer(sha(v));
    res.append('Set-Cookie', cookieTexte(nomAppareil, '', 0));
    return deconnexionDeBase(req, res);
  };

  /* ══ 4. QUI PEUT ME TROUVER PAR MON NUMÉRO ════════════════════════════════════════════════════ */
  H_['moi.confidentialite.lire'] = (req, res) => res.json({ trouvable: stockage.telTrouvableLire(req.moi.id) });
  H_['moi.confidentialite'] = (req, res) => {
    const v = corps(req).trouvable;
    if (v !== 'tous' && v !== 'personne') return refus(res, 400, 'champ_invalide');
    const q = essai('moi_confidentialite', req.moi.id, { max: 30, fenetreMs: H });
    if (!q.ok) return trop(res, 'quota_atteint', q.retry);
    stockage.telTrouvableMaj(req.moi.id, v);
    res.json({ ok: true, trouvable: v });
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
    const visible = !!p && p.etat === 'actif' && p.id !== uid && p.trouvable === 'tous' && !bloque;
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

  H_['contacts.ajouter'] = (req, res) => {
    const id = corps(req).id;
    if (typeof id !== 'string' || !ID_PERS.test(id) || id === req.moi.id) return refus(res, 400, 'champ_invalide');
    const uid = req.moi.id;
    const q = essai('ajout_jour', uid, { max: cfg.ajoutJour, fenetreMs: JOUR }, jeune(req.moi) ? 1 / 3 : 1);
    if (!q.ok) return trop(res, 'ajouts_plafond', q.retry);
    const fin = trouves.get(uid + '|' + id);
    const p = fin && fin > horloge() ? stockage.personneParId(id) : null;
    const t = p ? stockage.telTrouvableLire(id) : null;
    /* Revérifié AU MOMENT de l'ajout : la personne a pu se rendre introuvable, ou nous bloquer, depuis la recherche. */
    if (!p || p.etat !== 'actif' || t !== 'tous' || stockage.contactBloque(uid, id)) { rendre([q.cle]); return refus(res, 404, 'introuvable'); }
    trouves.delete(uid + '|' + id);
    const deja = stockage.contactActif(uid, id);
    if (!deja) {
      stockage.contactLier(uid, id);
      try {
        stockage.notifCreer({ uid: id, type: 'contact_ajoute', titre: 'Nouveau contact', texte: ((req.moi.prenom + ' ' + req.moi.nom).trim() || 'Quelqu\'un') + ' est maintenant dans vos contacts.', cible: uid });
        hub.reveiller({ uids: [id] });
      } catch (e) { /* une notification ratée ne défait pas le geste */ }
    }
    res.json({ ok: true, deja, contact: { id: p.id, prenom: p.prenom, nom: p.nom } });
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

module.exports = { installerTelephone, creerTelephone, reseauSms, SESSION_TEL_MS, APPAREIL_MS };
