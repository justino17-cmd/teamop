/* ══ LES ROUTES DES RÉUNIONS PROGRAMMÉES — L'AGENDA, PROGRAMMER, INVITER, RÉPONDRE, LES RAPPELS, LE FICHIER .ICS ═══════════════════════════════════════════
 *
 *   GET  /api/reunions?du=&au=                  S   mes réunions qui touchent la fenêtre (62 jours au plus), avec leurs occurrences : de quoi dessiner la semaine
 *   POST /api/reunions   {titre,lieu?,debut,fin,tz?,repetition?,jusqua?,n?,invites?,rappels?,notifier?}   V PRO  programmer — la fonction Pro (la bêta ouvre tout)
 *   GET  /api/reunions/:id                      R   la fiche : l'horaire, la répétition, les invités et leur réponse, MES rappels, la prochaine occurrence
 *   POST /api/reunions/:id/modifier  {…champs…, notifier?}   H   seuls les champs passés changent ; un changement d'HORAIRE remet les réponses « en attente »
 *   POST /api/reunions/:id/annuler              H   la réunion reste (annulée), plus aucun rappel ; prévient les invités — toujours
 *   POST /api/reunions/:id/supprimer {notifier?} H   la réunion part avec sa conversation ; prévient d'abord les invités d'une réunion à venir
 *   POST /api/reunions/:id/inviter   {uids,notifier?}  H   des contacts ou des membres de MON espace seulement (comme un groupe) ; les autres sont rendus (`non_ajoutes`)
 *   POST /api/reunions/:id/retirer   {uid}      H   l'hôte ne se retire pas
 *   POST /api/reunions/:id/reponse   {statut}   R   accepte · decline · peutetre — l'hôte n'a pas à répondre
 *   POST /api/reunions/:id/rappels   {rappels}  R   MES rappels (5, 15, 60, 1440 minutes avant) ; `null` rend la main au réglage de la réunion
 *   GET  /api/reunions/:id/ics?serie=1|occurrence=<début>  R   le fichier pour l'agenda de la personne (une occurrence, ou toute la série)
 *   POST /api/reunions/:id/courriel {destinataire,occurrence?}  H   l'invitation par COURRIEL à quelqu'un qui n'a pas OP MESSAGES (le .ics en pièce jointe) — inerte sans relais SMTP, 503 qui le dit
 *
 * Une fonction par ligne du manifeste (`manifeste.js`), branchée par `routes.js`. Le SQL est dans `stockage.js`, l'heure dans `calendrier.js`, le fichier dans `ics.js`, les notifications dans
 * `reunions-outils.js`, les rappels dans `planificateur.js`.
 *
 * ⛔ LA RÉUNION, LA PERSONNE ET LE RÔLE VIENNENT DE LA SESSION ET DE LA BASE, jamais du corps : un `{hote, uid, role}` envoyé pour s'attribuer une réunion est ignoré. Une réunion dont on n'est
 * pas invité répond 404, la MÊME réponse qu'une réunion qui n'existe pas : un non-invité ne voit RIEN (ni le titre, ni les invités, ni l'existence).
 * ⛔ « INVITÉS : DES CONTACTS OU DES MEMBRES DE SON ESPACE » : `peutEcrire` est la SEULE définition (la même que pour un groupe). Jamais une recherche par nom hors de l'espace, jamais un
 * identifiant inconnu qui répondrait autrement qu'un identifiant refusé : les deux sont rendus dans `non_ajoutes`/`non_invites`, indistinctement.
 * ⛔ L'HEURE SE DIT DANS UN FUSEAU, ET C'EST LE SERVICE QUI FAIT AUTORITÉ : la page peut envoyer des instants (millisecondes UTC) ou une heure LOCALE « 2026-10-26T14:00 » avec son fuseau ; une
 * heure locale qui n'existe pas (le trou du changement d'heure) est REFUSÉE (`heure_inexistante`), jamais décalée sans le dire. La série garde son heure locale de part et d'autre d'un
 * changement d'heure (`calendrier.js`).
 */
'use strict';
const cal = require('./calendrier');
const ics = require('./ics');
const { nettoyerNom, ID_PERS } = require('./routes');
const { serieDe, nomAffiche, texteInvitation, texteModification, texteAnnulation, creerNotifieur } = require('./reunions-outils');
const { adresseValide } = require('./courriel');

const JOUR = 86400000;
const TITRE_MAX = 120, LIEU_MAX = 300, INVITES_MAX = 100, UIDS_PAR_APPEL = 50, RAPPELS_MAX = 4;
const N_MAX = 1000, DUREE_MAX = 30 * JOUR, FENETRE_MAX = 62 * JOUR, OCCURRENCES_MAX = 1000;
const STATUTS = ['accepte', 'decline', 'peutetre'];
const FUSEAU_DEFAUT = 'Europe/Paris';

function installerReunions(H, ctx) {
  const { config, stockage, quotas, hub, horloge } = ctx;
  const notif = creerNotifieur(ctx);
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
  /* Les codes de refus du stockage, traduits : tous des chaînes courtes que la page sait dire (`public/api.js`, `MESSAGES`). Un code inconnu est une vraie panne : il part à `next`. */
  const CODES = { introuvable: [404, 'introuvable'], interdit: [403, 'interdit'], reunion_annulee: [409, 'reunion_annulee'], trop_d_invites: [409, 'trop_d_invites'], trop_de_reunions: [409, 'trop_de_reunions'],
    hote_non_retirable: [409, 'hote_non_retirable'], hote_reponse: [409, 'hote_reponse'], groupe_plein: [409, 'trop_d_invites'],
    /* le courriel (`courriel.js`) : un plafond atteint est un 429 qui dit LEQUEL, un relais qui refuse un 502 — jamais le texte de sa réponse. (Un relais absent et une adresse fausse sont dits par la
       route elle-même, AVANT de toucher au plafond par minute : ils n'arrivent jamais ici.) */
    courriel_quota_compte: [429, 'courriel_quota_compte'], courriel_quota_destinataire: [429, 'courriel_quota_destinataire'], courriel_echec: [502, 'courriel_echec'], occurrence_inconnue: [404, 'occurrence_inconnue'] };
  const garder = (f) => (req, res, next) => {
    const traduire = (e) => { const c = e && CODES[e.code]; if (c) return refus(res, c[0], c[1]); return next(e); };
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
  const effacer = (ids) => { if (ids && ids.length && typeof ctx.effacerPieces === 'function') ctx.effacerPieces(ids); };

  /* ── la lecture d'un corps ── */
  /* Une heure : des millisecondes UTC (un entier), ou une heure locale « 2026-10-26T14:00 » dans le fuseau `tz`. → { t } ou { erreur } */
  function instantDe(valeur, tz) {
    if (Number.isInteger(valeur)) return valeur >= cal.T_MIN && valeur < cal.T_MAX ? { t: valeur } : { erreur: 'heure_invalide' };
    if (typeof valeur !== 'string') return { erreur: 'heure_invalide' };
    const p = cal.lireLocal(valeur);
    if (!p) return { erreur: 'heure_invalide' };
    const t = cal.instantLocal(p, tz);
    if (t < cal.T_MIN || t >= cal.T_MAX) return { erreur: 'heure_invalide' };
    if (cal.formaterLocal(t, tz) !== valeur) return { erreur: 'heure_inexistante' };   // le trou du changement d'heure : 02:30 le jour du passage à l'heure d'été n'existe pas
    return { t };
  }
  const rappelsDe = (v) => {
    if (!Array.isArray(v) || v.length > RAPPELS_MAX || !v.every(x => cal.RAPPELS_PERMIS.includes(x))) return null;
    return Array.from(new Set(v)).sort((a, b) => a - b);
  };
  /* Valide le corps d'une création (`base` nul : tout est requis ou a un défaut) ou d'une modification (`base` : la réunion telle qu'elle est ; seuls les champs passés changent).
     → { erreur } ou { champs (ce que le stockage doit changer), serie (la série COMPLÈTE après changement), titre, lieu, rappels } */
  function valider(b, base, tzDefaut) {
    const champs = {};
    const present = (k) => b[k] !== undefined;
    let titre = base ? base.titre : null, lieu = base ? base.lieu : '';
    if (present('titre') || !base) {
      if (typeof b.titre !== 'string') return { erreur: present('titre') ? 'champ_invalide' : 'titre_vide' };
      const t = nettoyerNom(b.titre);
      if (!t) return { erreur: 'titre_vide' };
      if (Array.from(t).length > TITRE_MAX) return { erreur: 'champ_invalide' };
      titre = champs.titre = t;
    }
    if (present('lieu')) {
      if (b.lieu !== null && typeof b.lieu !== 'string') return { erreur: 'champ_invalide' };
      const l = b.lieu === null ? '' : nettoyerNom(b.lieu);
      if (Array.from(l).length > LIEU_MAX) return { erreur: 'champ_invalide' };
      lieu = champs.lieu = l;
    } else if (!base) champs.lieu = '';
    let tz = base ? base.tz : (cal.tzValide(tzDefaut) || FUSEAU_DEFAUT);
    if (present('tz')) { const z = cal.tzValide(b.tz); if (!z) return { erreur: 'fuseau_inconnu' }; tz = z; }
    let rep = base ? base.repetition : 'aucune';
    if (present('repetition')) { if (!cal.REPETITIONS.includes(b.repetition)) return { erreur: 'repetition_invalide' }; rep = b.repetition; }
    let n = base ? base.n : null, jusqua = base ? base.jusqua : null;
    if (present('n')) { if (b.n !== null && !(Number.isInteger(b.n) && b.n >= 2 && b.n <= N_MAX)) return { erreur: 'fin_repetition_invalide' }; n = b.n; }
    if (present('jusqua')) { if (b.jusqua !== null && !cal.lireDate(b.jusqua)) return { erreur: 'fin_repetition_invalide' }; jusqua = b.jusqua; }
    if (rep === 'aucune') { n = null; jusqua = null; }
    /* l'horaire : les instants donnés, sinon ceux de la réunion */
    let debut = base ? base.debut : null, fin = base ? base.fin : null;
    if (present('debut') || !base) { if (!present('debut')) return { erreur: 'heure_invalide' }; const x = instantDe(b.debut, tz); if (x.erreur) return x; debut = x.t; }
    if (present('fin') || !base) { if (!present('fin')) return { erreur: 'heure_invalide' }; const x = instantDe(b.fin, tz); if (x.erreur) return x; fin = x.t; }
    if (!(fin > debut)) return { erreur: 'fin_avant_debut' };
    if (fin - debut > DUREE_MAX) return { erreur: 'reunion_trop_longue' };
    const horaire = !base || ['debut', 'fin', 'tz', 'repetition', 'n', 'jusqua'].some(present);
    if (rep !== 'aucune') {
      /* une série est définie par son HEURE LOCALE : son premier instant est celui que cette heure locale désigne (pour une heure vécue deux fois, la première — comme l'agenda de la personne) */
      const nr = cal.normaliserSerie({ debut, fin, tz, rep });
      debut = nr.debut; fin = nr.fin;
      if (jusqua) {
        const d0 = cal.champsLocaux(debut, tz), dl = cal.lireDate(jusqua);
        if (cal.numeroJour(dl) < cal.numeroJour(d0) || dl.a > d0.a + 10) return { erreur: 'fin_repetition_invalide' };
      }
    }
    if (horaire) Object.assign(champs, { debut, fin, tz, rep, n, jusqua });
    let rappels = base ? base.rappels : [15];
    if (present('rappels')) { const r = rappelsDe(b.rappels); if (!r) return { erreur: 'rappel_invalide' }; rappels = champs.rappels = r; }
    else if (!base) champs.rappels = rappels;
    return { champs, serie: { debut, fin, tz, rep, n, jusqua }, titre, lieu, rappels, horaire };
  }
  /* La prochaine occurrence non commencée (l'index du planificateur), ou null. */
  const prochainDe = (serie, t) => { const p = cal.premiereApres(serie, t, true); return p ? p.debut : null; };

  /* La fiche telle que la voit `uid`, avec la prochaine occurrence. */
  function vue(uid, id) {
    const r = stockage.reunionPourMembre(id, uid); if (!r) return null;
    const p = r.reunion.annulee ? null : cal.premiereApres(serieDe(r.reunion), horloge(), true);
    r.prochaine = p ? { debut: p.debut, fin: p.fin } : null;
    return r;
  }
  const personne = (uid) => stockage.personneParId(uid);
  /* « Notifier les invités » : un booléen, vrai par défaut. */
  const notifierVoulu = (b) => b.notifier === undefined ? true : b.notifier === true;
  const listeUids = (v, max) => Array.isArray(v) && v.length >= 1 && v.length <= max && v.every(x => typeof x === 'string' && ID_PERS.test(x)) ? Array.from(new Set(v)) : null;

  /* ── l'agenda ── */
  H['reunions.liste'] = garder((req, res) => {
    const q = req.query || {}, ent = (x) => /^\d{1,15}$/.test(String(x)) ? parseInt(x, 10) : null;
    const du = q.du === undefined ? horloge() - JOUR : ent(q.du);
    const au = q.au === undefined ? (du === null ? null : du + 14 * JOUR) : ent(q.au);
    if (du === null || au === null || !(au > du) || au - du > FENETRE_MAX) return refus(res, 400, 'fenetre_invalide');
    const sortie = [];
    let total = 0;
    for (const r of stockage.reunionsDe(req.moi.id, du, au)) {
      const duree = r.fin - r.debut;
      const occ = (r.repetition === 'aucune' ? [{ debut: r.debut, fin: r.fin }] : cal.occurrences(serieDe(r), du - duree, au, 200)).filter(o => o.fin > du && o.debut < au);
      if (!occ.length) continue;
      total += occ.length;
      if (total > OCCURRENCES_MAX) break;
      sortie.push(Object.assign({}, r, { occurrences: occ.map(o => ({ debut: o.debut, fin: o.fin })) }));
    }
    res.json({ du, au, reunions: sortie });
  });

  /* ── programmer ── */
  H['reunions.creer'] = garder((req, res) => {
    const b = corps(req), hote = req.moi;
    if (b.notifier !== undefined && typeof b.notifier !== 'boolean') return refus(res, 400, 'champ_invalide');
    const v = valider(b, null, hote.tz);
    if (v.erreur) return refus(res, 400, v.erreur);
    let voulus = [];
    if (b.invites !== undefined) {
      if (!Array.isArray(b.invites) || !b.invites.every(x => typeof x === 'string' && ID_PERS.test(x))) return refus(res, 400, 'champ_invalide');
      voulus = Array.from(new Set(b.invites)).filter(u => u !== hote.id);
      if (voulus.length > INVITES_MAX) return refus(res, 409, 'trop_d_invites');
    }
    if (!plafond(res, 'reunion', hote.id, { max: 30, fenetreMs: 3600000 })) return;
    const ok = voulus.filter(u => stockage.peutEcrire(hote.id, u)), non_invites = voulus.filter(u => !ok.includes(u));
    const prochain = prochainDe(v.serie, horloge());
    const r = stockage.reunionCreer({ hote: hote.id, titre: v.titre, lieu: v.lieu, debut: v.serie.debut, fin: v.serie.fin, tz: v.serie.tz, rep: v.serie.rep, n: v.serie.n, jusqua: v.serie.jusqua, rappels: v.rappels, invites: ok, prochain });
    hub.reveiller({ conv: r.conv });
    if (notifierVoulu(b)) {
      const quand = prochain !== null ? prochain : v.serie.debut, desc = { titre: v.titre, tz: v.serie.tz, repetition: v.serie.rep };
      for (const u of r.invites) notif.notifier({ uid: u, type: 'reunion_invitation', reunion: r.id, titre: v.titre, texte: texteInvitation(hote, desc, personne(u), quand), auteur: hote.id });
    }
    res.status(201).json(Object.assign({ non_invites }, vue(hote.id, r.id)));
  });

  H['reunions.lire'] = garder((req, res) => res.json(vue(req.moi.id, req.reunion.id)));

  /* ── modifier, annuler, supprimer ── */
  H['reunions.modifier'] = garder((req, res) => {
    const b = corps(req), id = req.reunion.id, hote = req.moi;
    if (b.notifier !== undefined && typeof b.notifier !== 'boolean') return refus(res, 400, 'champ_invalide');
    const courant = stockage.reunionPourMembre(id, hote.id).reunion;
    const v = valider(b, courant, courant.tz);
    if (v.erreur) return refus(res, 400, v.erreur);
    const prochain = v.horaire ? prochainDe(v.serie, horloge()) : undefined;
    const r = stockage.reunionModifier(Object.assign({ id, par: hote.id }, v.champs, v.horaire ? { prochain } : {}));
    if (r.gid) hub.reveiller({ conv: courant.conv });
    /* on prévient quand quelque chose que les invités VOIENT a changé : l'horaire, le titre, le lieu — pas un simple réglage de rappel */
    if (r.change && (r.horaire || r.titre || r.lieu) && notifierVoulu(b)) {
      const apres = stockage.reunionPourMembre(id, hote.id).reunion, quand = prochainDe(serieDe(apres), horloge());
      for (const u of stockage.reunionParticipants(id)) {
        if (u === hote.id) continue;
        notif.notifier({ uid: u, type: 'reunion_modifiee', reunion: id, titre: apres.titre, texte: texteModification(hote, apres, personne(u), quand !== null ? quand : apres.debut, r.horaire), auteur: hote.id });
      }
    }
    res.json(vue(hote.id, id));
  });

  /* Prévient les invités (hors l'hôte) qu'une réunion est annulée : le texte dit la prochaine occurrence, ou la première. */
  function prevenirAnnulation(hote, reunion, participants) {
    const quand = prochainDe(serieDe(reunion), horloge());
    for (const u of participants) {
      if (u === hote.id) continue;
      notif.notifier({ uid: u, type: 'reunion_annulee', reunion: reunion.id, titre: reunion.titre, texte: texteAnnulation(hote, reunion, personne(u), quand !== null ? quand : reunion.debut), auteur: hote.id });
    }
  }
  H['reunions.annuler'] = garder((req, res) => {
    const id = req.reunion.id, hote = req.moi;
    const avant = stockage.reunionPourMembre(id, hote.id).reunion;
    const r = stockage.reunionAnnuler({ id, par: hote.id });
    if (r.change) {
      hub.reveiller({ conv: avant.conv });
      prevenirAnnulation(hote, avant, stockage.reunionParticipants(id));
    }
    res.json(vue(hote.id, id));
  });

  H['reunions.supprimer'] = garder((req, res) => {
    const b = corps(req), id = req.reunion.id, hote = req.moi;
    if (b.notifier !== undefined && typeof b.notifier !== 'boolean') return refus(res, 400, 'champ_invalide');
    const avant = stockage.reunionPourMembre(id, hote.id).reunion;
    const aVenir = !avant.annulee && prochainDe(serieDe(avant), horloge()) !== null;
    const r = stockage.reunionSupprimer({ id, par: hote.id });
    effacer(r.pieces);
    hub.reveiller({ uids: r.participants });
    /* une réunion À VENIR que l'hôte efface sans l'avoir annulée : ses invités l'apprennent (sinon elle disparaît de leur agenda sans un mot) */
    if (aVenir && notifierVoulu(b)) prevenirAnnulation(hote, avant, r.participants);
    res.json({ ok: true });
  });

  /* ── les invités ── */
  H['reunions.inviter'] = garder((req, res) => {
    const b = corps(req), id = req.reunion.id, hote = req.moi;
    if (b.notifier !== undefined && typeof b.notifier !== 'boolean') return refus(res, 400, 'champ_invalide');
    const u = listeUids(b.uids, UIDS_PAR_APPEL); if (!u) return refus(res, 400, 'champ_invalide');
    const ok = u.filter(x => stockage.peutEcrire(hote.id, x)), non_ajoutes = u.filter(x => !ok.includes(x));
    const r = ok.length ? stockage.reunionInviter({ id, par: hote.id, uids: ok }) : { ajoutes: [], gid: 0 };
    if (r.gid) hub.reveiller({ conv: req.reunion.conv });
    if (notifierVoulu(b) && r.ajoutes.length) {
      const courante = stockage.reunionPourMembre(id, hote.id).reunion, quand = prochainDe(serieDe(courante), horloge());
      for (const x of r.ajoutes) notif.notifier({ uid: x, type: 'reunion_invitation', reunion: id, titre: courante.titre, texte: texteInvitation(hote, courante, personne(x), quand !== null ? quand : courante.debut), auteur: hote.id });
    }
    res.json(Object.assign({ ajoutes: r.ajoutes, non_ajoutes }, vue(hote.id, id)));
  });

  H['reunions.retirer'] = garder((req, res) => {
    const id = req.reunion.id, u = corps(req).uid;
    if (typeof u !== 'string' || !ID_PERS.test(u)) return refus(res, 400, 'champ_invalide');
    stockage.reunionRetirer({ id, par: req.moi.id, uid: u });
    hub.reveiller({ conv: req.reunion.conv, uids: [u] });
    res.json(vue(req.moi.id, id));
  });

  /* ── ma réponse, mes rappels ── */
  H['reunions.reponse'] = garder((req, res) => {
    const s = corps(req).statut, id = req.reunion.id;
    if (!STATUTS.includes(s)) return refus(res, 400, 'champ_invalide');
    const r = stockage.reunionRepondre({ id, uid: req.moi.id, statut: s });
    if (r.gid) hub.reveiller({ conv: req.reunion.conv });
    res.json(vue(req.moi.id, id));
  });

  H['reunions.rappels'] = garder((req, res) => {
    const b = corps(req), id = req.reunion.id;
    if (b.rappels === undefined) return refus(res, 400, 'champ_invalide');
    const r = b.rappels === null ? null : rappelsDe(b.rappels);
    if (b.rappels !== null && r === null) return refus(res, 400, 'rappel_invalide');
    stockage.reunionRappelsPoser({ id, uid: req.moi.id, rappels: r });
    hub.reveiller({ uids: [req.moi.id] });
    res.json(vue(req.moi.id, id));
  });

  /* ── le fichier .ics ── */
  H['reunions.ics'] = garder((req, res) => {
    if (!plafond(res, 'ics', req.moi.id, { max: 60, fenetreMs: 60000 })) return;
    const q = req.query || {}, rr = stockage.reunionPourMembre(req.reunion.id, req.moi.id), r = rr.reunion;
    const opts = { maintenant: horloge(), rappels: rr.moi.rappels };
    if (q.occurrence !== undefined) {
      if (!/^\d{1,15}$/.test(String(q.occurrence))) return refus(res, 400, 'champ_invalide');
      opts.occurrence = parseInt(q.occurrence, 10);
    } else if (q.serie !== undefined && q.serie !== '1' && q.serie !== '0') return refus(res, 400, 'champ_invalide');
    const texte = ics.fichier({ id: r.id, titre: r.titre, lieu: r.lieu, debut: r.debut, fin: r.fin, tz: r.tz, rep: r.repetition, n: r.n, jusqua: r.jusqua, annulee: r.annulee, version: r.version }, opts);
    if (texte === null) return refus(res, 404, 'occurrence_inconnue');
    res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + ics.nom(r) + '"', 'Cache-Control': 'no-store' });
    res.send(texte);
  });

  /* ── le courriel ── */
  /* L'hôte écrit l'adresse de quelqu'un qui n'a pas OP MESSAGES ; le service envoie UN message au gabarit fixe, le .ics en pièce jointe (`courriel.js`). Dans cet ordre : le relais est-il ouvert
     (sinon 503, avant de rien lire), la demande est-elle bien formée, le plafond par minute, la réunion vit-elle encore (une annulée ou finie ne s'envoie pas), puis les plafonds durables
     (dix par jour et par compte, deux par destinataire et par semaine) dans `courriel.envoyer`. L'adresse n'est NI rangée, NI journalisée, NI rendue. */
  H['reunions.courriel'] = garder(async (req, res) => {
    const courriel = ctx.courriel, hote = req.moi, b = corps(req);
    if (!courriel || !courriel.ouvert()) return refus(res, 503, 'courriel_non_ouvert');
    if (typeof b.destinataire !== 'string' || !adresseValide(b.destinataire)) return refus(res, 400, 'courriel_invalide');
    let occurrence;
    if (b.occurrence !== undefined && b.occurrence !== null) { if (!Number.isInteger(b.occurrence) || b.occurrence < 0) return refus(res, 400, 'champ_invalide'); occurrence = b.occurrence; }
    if (!plafond(res, 'courriel', hote.id, { max: 5, fenetreMs: 60000 })) return;
    const reunion = stockage.reunionPourMembre(req.reunion.id, hote.id).reunion;
    if (reunion.annulee) return refus(res, 409, 'reunion_annulee');
    if (occurrence === undefined && prochainDe(serieDe(reunion), horloge()) === null) return refus(res, 409, 'reunion_passee');
    await courriel.envoyer({ uid: hote.id, hote, destinataire: b.destinataire, reunion, occurrence });
    res.json({ ok: true });
  });
}

module.exports = { installerReunions };
