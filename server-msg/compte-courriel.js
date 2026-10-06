/* ══ LE COMPTE PAR ADRESSE E-MAIL — « COMME DISCORD » : LE NUMÉRO DE TÉLÉPHONE DEVIENT FACULTATIF ═════════════════════════════════════════════════════════
 *
 * Décision de Justin, 6 octobre 2026 (« comme Discord, pas de numéro pour le perso ») : on s'inscrit avec une ADRESSE E-MAIL et un MOT DE PASSE, l'adresse se prouve par un CODE à six
 * chiffres reçu par courriel (pas un lien : sur un iPhone, un lien ouvert depuis Mail part dans Safari, jamais dans l'application installée — le code se tape là où l'on s'inscrit). Le compte
 * par numéro (`telephone.js`) reste possible ; on se retrouve ensuite par l'identifiant « Prénom#1234 ».
 *
 *   POST /api/mel/inscrire  {courriel, mdp, prenom, nom?, conditions:true}   P  envoie le code (la réponse est LA MÊME que l'adresse ait un compte ou non)
 *   POST /api/mel/confirmer {courriel, code}                                  P  crée le compte, ouvre la session
 *   POST /api/mel/connexion {courriel, mdp}                                   P  ouvre la session
 *   POST /api/mel/oubli     {courriel}                                        P  envoie un code pour choisir un nouveau mot de passe (même réponse dans tous les cas)
 *   POST /api/mel/reinit    {courriel, code, mdp}                             P  pose le nouveau mot de passe, COUPE toutes les autres sessions, ouvre la sienne
 *
 * ⛔ LES INSCRIPTIONS SONT FERMÉES PAR DÉFAUT (`config.inscriptionCourriel`) et n'existent pas sans relais SMTP : 503 `inscription_fermee`. La connexion, elle, marche dès qu'un compte existe.
 * ⛔ PERSONNE NE SAIT, PAR CES ROUTES, SI UNE ADRESSE A UN COMPTE : `inscrire` et `oubli` répondent pareil, font le MÊME travail (scrypt dans les deux branches d'`inscrire`), et le courriel
 *    part EN ARRIÈRE-PLAN (le temps du relais ne se mesure pas). À une adresse qui a déjà un compte, `inscrire` envoie « cette adresse a déjà un compte » au lieu d'un code ; `oubli` n'envoie
 *    rien à une adresse sans compte. `connexion` répond 401 `identifiants` dans tous les cas d'échec, avec le même coût (`verifierInconnu`).
 * ⛔ UN CODE N'EST JAMAIS EN CLAIR (une empreinte liée à l'adresse), il vit quinze minutes, cinq essais, et il est lié à l'APPAREIL qui l'a demandé : un inconnu qui connaît l'adresse ne peut ni
 *    le deviner ni le brûler (comme `code_tel`). Le mot de passe d'une inscription en attente est rangé DÉJÀ HACHÉ et scellé, jamais en clair, même quinze minutes.
 * ⛔ L'ADRESSE n'est rangée que là où vit déjà celle d'un compte (`personne.email_ch`, scellé ; `email_h` pour la retrouver) — jamais dans un journal, `/health`, ni une réponse.
 * ⛔ DES PLAFONDS DURABLES (`courrier_envoi`, un redémarrage ne les remet pas à zéro) : cinq demandes par adresse et par heure, dix par jour ; vingt par réseau et par jour. Sinon ce service
 *    servirait à remplir la boîte de quelqu'un, et la réputation de notre adresse d'expédition le paierait.
 * ⛔ CHANGER DE MOT DE PASSE COUPE TOUTES LES SESSIONS : celui qui avait pris le compte (le mot de passe deviné ou volé) en sort au moment où la personne le reprend.
 */
'use strict';
const crypto = require('crypto');
const { adresseValide, normalisee } = require('./courriel');
const { creerMdp } = require('./mdp');
const { cleReseau } = require('./quotas');

const MIN = 60000, H = 3600000, JOUR = 86400000;
const SESSION_MS = 90 * JOUR, APPAREIL_MS = 180 * JOUR;
const CODE_MS = 15 * MIN, CODE_ESSAIS = 5, RENVOI_MS = MIN;
const ADRESSE_HEURE = 5, ADRESSE_JOUR = 10, RESEAU_JOUR = 20, INCONNUS_JOUR = 50;
const CGU_V = '2026-10';
const CODE_RE = /^\d{6}$/, APPAREIL_RE = /^opd_[A-Za-z0-9_-]{43}$/;
const CTRL_NOM = /[\u0000-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
const nettoyerNom = (s) => String(s).replace(CTRL_NOM, '').replace(/\s+/g, ' ').trim();
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};

/* Les gabarits : FIXES, du texte simple, aucun lien ; seul le code (six chiffres que nous avons tirés) y entre. */
const SUJETS = { inscription: 'Ton code OP MESSAGES', existe: 'Ton adresse a déjà un compte OP MESSAGES', reinit: 'Ton code pour un nouveau mot de passe OP MESSAGES', change: 'Ton mot de passe OP MESSAGES a changé' };
const TEXTES = {
  inscription: (c) => 'Bonjour,\n\nTon code pour confirmer ton adresse sur OP MESSAGES : ' + c + '\n\nIl est valable 15 minutes. Tape-le là où tu crées ton compte.\n\n' +
    'Si tu n\'as pas demandé à créer un compte, ignore ce message : rien ne sera créé.\n\n— OP MESSAGES',
  existe: () => 'Bonjour,\n\nQuelqu\'un — peut-être toi — a voulu créer un compte OP MESSAGES avec cette adresse, qui en a déjà un.\n\n' +
    'Pour te connecter, utilise ton mot de passe. Si tu l\'as oublié, choisis « Mot de passe oublié ? » sur l\'écran de connexion.\n\n' +
    'Si ce n\'était pas toi, tu n\'as rien à faire : ton compte n\'a pas changé.\n\n— OP MESSAGES',
  reinit: (c) => 'Bonjour,\n\nTon code pour choisir un nouveau mot de passe OP MESSAGES : ' + c + '\n\nIl est valable 15 minutes. ' +
    'Choisir un nouveau mot de passe déconnecte tous tes appareils.\n\nSi tu n\'as rien demandé, ignore ce message : ton mot de passe ne change pas.\n\n— OP MESSAGES',
  change: () => 'Bonjour,\n\nLe mot de passe de ton compte OP MESSAGES vient d\'être changé, et tous les autres appareils ont été déconnectés.\n\n' +
    'Si c\'était toi, tu n\'as rien à faire. Si ce n\'était pas toi, choisis tout de suite « Mot de passe oublié ? » sur l\'écran de connexion : un nouveau code partira à cette adresse.\n\n— OP MESSAGES',
};

/* ⛔ UN MOT DE PASSE QUI SE DEVINE NE PROTÈGE RIEN (relecture du gardien, C4) : au-delà de la règle commune (`mdp.mdpRecevable` : 10 caractères, hors mots courants), on refuse un caractère
   répété, une suite (0123…, abcd…, azerty, qwerty), et ce qui CONTIENT la partie locale de l'adresse ou le prénom. */
const SUITES = ['0123456789', '9876543210', 'abcdefghijklmnopqrstuvwxyz', 'zyxwvutsrqponmlkjihgfedcba', 'azertyuiop', 'qwertyuiop', 'qsdfghjklm', 'asdfghjkl', 'wxcvbn', 'zxcvbnm'];
const COURANTS = ['motdepasse', 'password', 'azerty', 'qwerty', 'soleil', 'bonjour', 'jetaime', 'doudou', 'loulou', 'chouchou', 'marseille', 'football', 'opmessages', 'teamop', 'admin', 'iloveyou', 'monkey', 'dragon', 'princesse', 'nicolas', 'julien', 'camille', 'thomas', 'motdepass'];
function mdpDevinable(mdp, { adresse, prenom }) {
  const m = String(mdp).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (new Set(m).size < 4) return true;                                   // « 1111111111 », « abababab12 »
  const alnum = m.replace(/[^a-z0-9]/g, '');
  for (const s of SUITES) for (let i = 0; i + 6 <= s.length; i++) if (alnum.includes(s.slice(i, i + 6))) return true;
  const sansChiffres = alnum.replace(/[0-9]+$/, '').replace(/^[0-9]+/, '');
  if (COURANTS.some(c => sansChiffres === c || (sansChiffres.length <= c.length + 2 && sansChiffres.includes(c)))) return true;
  const local = String(adresse || '').split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  if (local.length >= 4 && alnum.includes(local)) return true;
  const p = String(prenom || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  if (p.length >= 4 && alnum.includes(p)) return true;
  return false;
}

function creerCompteCourriel(ctx) {
  const { config, stockage, quotas, hub, horloge, journaliser, scelleur, courriel } = ctx;
  const mdp = ctx.mdp || creerMdp();
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const trop = (res, code, retry) => { res.set('Retry-After', String(retry)); return refus(res, 429, code, { retry }); };
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  function essai(nom, cle, def) {
    const q = Object.assign({}, def, config.quotas[nom] || {});
    const k = nom + ':' + cle, r = quotas.essai(k, Math.max(1, Math.floor(q.max)), q.fenetreMs);
    return Object.assign({ cle: k }, r);
  }
  const rendre = (cles) => { for (const k of cles) quotas.rembourser(k); };
  /* Chaque gestionnaire est protégé (relecture du gardien, C7) : une exception ou un rejet devient une réponse 500 propre, jamais un processus qui tombe — comme `routes-push.js`. */
  const garder = (f) => (req, res, next) => { try { const r = f(req, res, next); if (r && typeof r.catch === 'function') r.catch(next); } catch (e) { next(e); } };
  const mdpAccepte = (m, ctxMdp) => typeof m === 'string' && mdp.mdpRecevable(m) && !mdpDevinable(m, ctxMdp);

  /* ── Les inscriptions sont-elles ouvertes ? (lu par `/api/config`, qui ne dit qu'un booléen) ── */
  const inscriptionOuverte = () => config.inscriptionCourriel === true && !!courriel && courriel.ouvert();

  /* ── Les cookies : la session (comme `telephone.js`) et le jeton d'APPAREIL, qui lie un code à l'appareil qui l'a demandé ── */
  const nomAppareil = config.cookie.nom + 'a';
  const cookieTexte = (nom, valeur, maxAge) => nom + '=' + valeur + '; Path=/; HttpOnly; SameSite=Strict; Max-Age=' + maxAge + (config.cookie.secure ? '; Secure' : '');
  function lireCookie(req, nom) {
    const h = req.headers.cookie; if (!h) return null;
    for (const part of h.split(';')) { const i = part.indexOf('='); if (i < 0) continue; if (part.slice(0, i).trim() === nom) return part.slice(i + 1).trim(); }
    return null;
  }
  function appareilDe(req, res) {
    const v = lireCookie(req, nomAppareil);
    if (v && APPAREIL_RE.test(v)) return sha(v);
    const jeton = 'opd_' + crypto.randomBytes(32).toString('base64url');
    res.append('Set-Cookie', cookieTexte(nomAppareil, jeton, APPAREIL_MS / 1000));
    return sha(jeton);
  }
  function ouvrirSession(res, personne, appareil) {
    const jeton = 'opm_' + crypto.randomBytes(32).toString('base64url');
    const evincees = stockage.sessionAjouter({ h: sha(jeton), personne, appareil: typeof appareil === 'string' ? nettoyerNom(appareil).slice(0, 40) : null, ttlMs: SESSION_MS });
    for (const h of evincees) hub.fermerSession(h);
    res.append('Set-Cookie', cookieTexte(config.cookie.nom, jeton, SESSION_MS / 1000));
  }

  /* ── L'adresse : telle que tapée (validée), son identifiant de compte (minuscules), son empreinte de plafond (sans « +étiquette », points de Gmail) ── */
  function adresseDe(brut) {
    const a = adresseValide(brut);
    if (!a) return null;
    const ident = 'mel:' + a.toLowerCase();
    /* ⛔ `quota` : une empreinte PROPRE aux codes de compte (relecture du gardien, R1) — avec celle des invitations de réunion, deux demandes de code anonymes bloquaient toute invitation
       vers cette boîte pendant sept jours, et une invitation donnait une minute de « code récent » */
    return { a, ident, h: scelleur.hmac('mel', 'adresse', ident), quota: scelleur.hmac('courrier', 'destinataire-mel', normalisee(a)) };
  }
  const hCode = (adr_h, but, ap_h, code) => scelleur.hmac('mel', 'code', adr_h + '|' + but + '|' + ap_h + '|' + code);
  const egal = (x, y) => { const a = Buffer.from(x), b = Buffer.from(y); return a.length === b.length && crypto.timingSafeEqual(a, b); };
  const tirerCode = () => String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const reseauH = (ip) => 'mel:res:' + scelleur.hmac('mel', 'reseau', cleReseau(ip));

  /* Les plafonds DURABLES : → null si la demande passe, sinon { code, retry }. ⛔ ILS COMPTENT LES DEMANDES, PAS LES COURRIELS PARTIS : `oubli` n'envoie rien à une adresse sans compte, et
     un plafond qui ne compterait que les envois répondrait 429 à la quatrième demande pour une adresse qui a un compte, 200 pour une autre — il dirait qui est inscrit. Même chose pour
     le délai entre deux demandes (`renvoiMs`). Les seuils se surchargent par `config.quotas.mel_envoi` (bancs). */
  const seuils = () => Object.assign({ renvoiMs: RENVOI_MS, parHeure: ADRESSE_HEURE, parJour: ADRESSE_JOUR, reseauJour: RESEAU_JOUR }, config.quotas.mel_envoi || {});
  function plafondDemande(adr, ip) {
    const t = horloge(), uidR = reseauH(ip), S = seuils();
    const recent = stockage.courrierCompter({ uid: uidR, destH: adr.quota, depuis: { compte: t - JOUR, destinataire: t - S.renvoiMs } });
    if (recent.compte >= S.reseauJour) return { code: 'reseau_plafond', retry: 3600 };
    if (recent.destinataire > 0) return { code: 'code_recent', retry: Math.max(1, Math.ceil(S.renvoiMs / 1000)) };
    const heure = stockage.courrierCompter({ uid: uidR, destH: adr.quota, depuis: { compte: t - JOUR, destinataire: t - H } }).destinataire;
    const jour = stockage.courrierCompter({ uid: uidR, destH: adr.quota, depuis: { compte: t - JOUR, destinataire: t - JOUR } }).destinataire;
    if (jour >= S.parJour) return { code: 'courriel_plafond', retry: 86400 };
    if (heure >= S.parHeure) return { code: 'courriel_plafond', retry: 3600 };
    return null;
  }
  /* La demande se NOTE (qu'un courriel parte ou non) ; l'envoi part en ARRIÈRE-PLAN (la réponse n'attend pas le relais : son temps dirait si l'adresse a un compte). Un refus du relais
     se journalise sans adresse ; la demande reste comptée (la rendre ne se ferait que pour un compte existant, donc se verrait). */
  const noterDemande = (adr, ip) => stockage.courrierNoter({ uid: reseauH(ip), destH: adr.quota });   // → l'identifiant de la ligne (pour la rendre)
  function envoyerPlusTard(adr, gabarit, code) {
    Promise.resolve().then(() => courriel.envoyerTexte({ a: adr.a, sujet: SUJETS[gabarit], texte: TEXTES[gabarit](code) }))
      .then(() => journal('compte_courriel', { etat: 'envoye', gabarit }), () => journal('compte_courriel', { etat: 'echec', gabarit }));
  }
  const compteDe = (adr) => { const p = stockage.personneParIdentifiant(adr.ident); return p && p.etat === 'actif' ? p : null; };

  const H_ = {};

  /* ══ 1. S'INSCRIRE : le code part (ou « cette adresse a déjà un compte ») — la même réponse dans les deux cas ══ */
  H_['mel.inscrire'] = async (req, res) => {
    if (!inscriptionOuverte()) return refus(res, 503, 'inscription_fermee');
    const b = corps(req);
    const adr = adresseDe(b.courriel);
    if (!adr) return refus(res, 400, 'courriel_invalide');
    if (typeof b.prenom !== 'string') return refus(res, 400, 'champ_invalide');
    const prenom = nettoyerNom(b.prenom), nom = typeof b.nom === 'string' ? nettoyerNom(b.nom) : '';
    if (!prenom || prenom.length > 60 || nom.length > 60 || (b.nom !== undefined && typeof b.nom !== 'string')) return refus(res, 400, 'champ_invalide');
    if (!mdpAccepte(b.mdp, { adresse: adr.a, prenom })) return refus(res, 400, 'mdp_faible');
    if (b.conditions !== true) return refus(res, 400, 'conditions_requises');
    const q = essai('mel_inscrire_reseau', cleReseau(req.ip), { max: 30, fenetreMs: H });
    if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
    const p = plafondDemande(adr, req.ip);
    if (p) return trop(res, p.code, p.retry);
    const ap_h = appareilDe(req, res);
    /* ⛔ LA DEMANDE SE NOTE AVANT L'ATTENTE (relecture du gardien, C1) : notée après le hachage, trente demandes SIMULTANÉES passaient toutes le plafond (« trois par heure ») et trente courriels
       partaient vers la même boîte. Un hachage refusé (file pleine) rend la place — pour toutes les adresses pareil. */
    const note = noterDemande(adr, req.ip);
    /* ⛔ LE MÊME TRAVAIL dans les deux branches : le mot de passe est toujours haché (≈ 80 ms), même pour une adresse qui a déjà un compte. */
    let h;
    try { h = await mdp.hacher(b.mdp); } catch (e) { if (e && e.message === 'file_pleine') { stockage.courrierRetirer(note); return trop(res, 'service_occupe', 5); } throw e; }
    if (compteDe(adr)) { envoyerPlusTard(adr, 'existe', null); return res.json({ ok: true }); }
    const code = tirerCode();
    const pose = stockage.melCodePoser({ adr_h: adr.h, but: 'inscription', code_h: hCode(adr.h, 'inscription', ap_h, code), exp: horloge() + CODE_MS, ap_h,
      donnees: { prenom, nom, sel: h.sel.toString('base64'), hash: h.hash.toString('base64'), params: h.params } });
    if (pose) envoyerPlusTard(adr, 'inscription', code);      // un code vivant d'un AUTRE appareil n'est pas écrasé : rien ne part (la réponse est la même)
    res.json({ ok: true });
  };

  /* Un code proposé : → les données de la ligne, ou null. Les échecs se comptent par (adresse, APPAREIL) et par réseau ; une réussite rend ses plafonds. */
  function prouver(req, res, adr, but, brut) {
    const code = typeof brut === 'string' ? brut.replace(/[\s  ]/g, '') : brut;
    if (typeof code !== 'string' || !CODE_RE.test(code)) { refus(res, 400, 'champ_invalide'); return null; }
    const ap_h = appareilDe(req, res);
    const q1 = essai('mel_code_reseau', cleReseau(req.ip), { max: 60, fenetreMs: H });
    if (!q1.ok) { trop(res, 'reseau_plafond', q1.retry); return null; }
    const q2 = essai('mel_code_adresse', adr.h + '|' + ap_h, { max: 10, fenetreMs: H });
    if (!q2.ok) { rendre([q1.cle]); trop(res, 'code_plafond', q2.retry); return null; }
    const rec = stockage.melCodeEssayer(adr.h, but, CODE_ESSAIS, ap_h);
    const attendu = rec ? rec.code_h : hCode(adr.h, but, ap_h, 'absent:' + crypto.randomBytes(8).toString('hex'));
    if (!(egal(hCode(adr.h, but, ap_h, code), attendu) && rec)) { refus(res, 401, 'code_invalide'); return null; }
    rendre([q1.cle, q2.cle]);
    return rec;
  }

  /* ══ 2. CONFIRMER : le compte naît ICI, adresse prouvée ══ */
  H_['mel.confirmer'] = (req, res) => {
    if (!inscriptionOuverte()) return refus(res, 503, 'inscription_fermee');
    const b = corps(req);
    const adr = adresseDe(b.courriel);
    if (!adr) return refus(res, 400, 'courriel_invalide');
    const rec = prouver(req, res, adr, 'inscription', b.code);
    if (!rec) return;
    stockage.melCodeSupprimer(adr.h, 'inscription');   // usage unique
    const d = rec.donnees;
    if (!d || typeof d.prenom !== 'string' || !d.sel || !d.hash || !d.params) return refus(res, 401, 'code_invalide');
    if (stockage.personneParIdentifiant(adr.ident)) return refus(res, 401, 'code_invalide');   // une course : le compte existe déjà (l'autre onglet l'a créé)
    const p = stockage.personneCreer({ identifiant: adr.ident, prenom: d.prenom, nom: d.nom || '', origine: 'compte', verifie: true });
    stockage.mdpPoser(p.id, { sel: Buffer.from(d.sel, 'base64'), hash: Buffer.from(d.hash, 'base64'), params: d.params });
    stockage.personneConsentir(p.id, CGU_V);
    stockage.appareilMelNoter(appareilDe(req, res), p.id);
    ouvrirSession(res, p.id, b.appareil);
    journal('compte_courriel', { etat: 'cree' });
    res.json({ ok: true, nouveau: true, moi: stockage.personneParId(p.id) });
  };

  /* ══ 3. SE CONNECTER ══ */
  H_['mel.connexion'] = async (req, res) => {
    const b = corps(req);
    const adr = adresseDe(b.courriel);
    if (!adr || typeof b.mdp !== 'string' || !b.mdp || b.mdp.length > 200) return refus(res, 401, 'identifiants');
    const ap_h = appareilDe(req, res);
    const q1 = essai('mel_cnx_reseau', cleReseau(req.ip), { max: 30, fenetreMs: H });
    if (!q1.ok) return trop(res, 'reseau_plafond', q1.retry);
    /* ⛔ PAR (adresse, APPAREIL) : dix faux mots de passe d'un inconnu ne verrouillent pas le compte de sa victime (qui, avec le bon, entrerait quand même) */
    const q2 = essai('mel_cnx_adresse', adr.h + '|' + ap_h, { max: 10, fenetreMs: H });
    if (!q2.ok) { rendre([q1.cle]); return trop(res, 'identifiants_plafond', q2.retry); }
    /* ⛔ UN PLAFOND PAR ADRESSE, POUR LES SEULS APPAREILS INCONNUS (relecture du gardien, C3) : jeter son cookie renouvelle « l'appareil », donc dix essais par appareil ne retiennent personne ;
       ce plafond-ci arrête un essai réparti sur mille appareils — et l'appareil où le propriétaire s'est DÉJÀ connecté n'y est jamais soumis : un inconnu ne lui ferme pas la porte. */
    const p = compteDe(adr), connu = !!p && stockage.appareilMelConnu(ap_h, p.id);
    const q3 = connu ? { ok: true, cle: null } : essai('mel_cnx_inconnus_jour', adr.h, { max: INCONNUS_JOUR, fenetreMs: JOUR });
    if (!q3.ok) { rendre([q1.cle, q2.cle]); return trop(res, 'identifiants_plafond', q3.retry); }
    const rec = p ? stockage.mdpLire(p.id) : null;
    let juste = false;
    try { juste = rec ? await mdp.verifier(b.mdp, rec) : await mdp.verifierInconnu(b.mdp); }
    catch (e) { rendre([q1.cle, q2.cle, q3.cle].filter(Boolean)); if (e && e.message === 'file_pleine') return trop(res, 'service_occupe', 5); throw e; }
    if (!juste || !p) return refus(res, 401, 'identifiants');
    rendre([q1.cle, q2.cle, q3.cle].filter(Boolean));
    /* ⛔ SE RECONNECTER AVANT L'ÉCHÉANCE ANNULE LA SUPPRESSION du compte (J+14), comme par numéro : la réponse le DIT, la page l'écrit. */
    const annulee = stockage.suppressionLe(p.id) !== null && stockage.suppressionAnnuler(p.id);
    if (annulee) { try { if (ctx.facturation) ctx.facturation.perso.annulationsTraiter(); } catch (e) { /* noté : la passe des dix minutes le rejoue */ } }
    ouvrirSession(res, p.id, b.appareil);
    stockage.appareilMelNoter(ap_h, p.id);
    /* ⛔ UN APPAREIL INCONNU PRÉVIENT LES AUTRES (relecture du gardien, C6), comme une connexion par numéro : une prise de compte par mot de passe deviné ne reste pas invisible */
    if (!connu) prevenirNouvelAppareil(p.id);
    const moi = stockage.personneParId(p.id);
    res.json(annulee ? { ok: true, moi, suppression_annulee: true } : { ok: true, moi });
  };
  function prevenirNouvelAppareil(uid) {
    try {
      const n = stockage.notifCreer({ uid, type: 'nouvel_appareil', titre: 'Nouvel appareil connecté', texte: 'Un appareil vient de se connecter à votre compte avec votre mot de passe. Si ce n\'est pas vous, choisissez « Mot de passe oublié ? » pour en changer : tous les autres appareils seront déconnectés.' });
      hub.reveiller({ uids: [uid] });
      if (ctx.push) ctx.push.pousser(uid, { type: 'appareil', tag: 'appareil', url: '/', renotify: true, titre: 'Nouvel appareil connecté', corps: 'Si ce n\'est pas vous, changez votre mot de passe.' }, { gid: n.gid });
    } catch (e) { /* une notification ratée ne défait pas la connexion */ }
  }

  /* ══ 4. MOT DE PASSE OUBLIÉ : un code, si l'adresse a un compte (la réponse est la même sinon) ══ */
  H_['mel.oubli'] = (req, res) => {
    if (!courriel || !courriel.ouvert()) return refus(res, 503, 'courriel_non_ouvert');
    const adr = adresseDe(corps(req).courriel);
    if (!adr) return refus(res, 400, 'courriel_invalide');
    const q = essai('mel_oubli_reseau', cleReseau(req.ip), { max: 30, fenetreMs: H });
    if (!q.ok) return trop(res, 'reseau_plafond', q.retry);
    const p = plafondDemande(adr, req.ip);
    if (p) return trop(res, p.code, p.retry);
    const ap_h = appareilDe(req, res);
    noterDemande(adr, req.ip);
    /* ⛔ TOUT compte par adresse (relecture du gardien, N2) : aussi celui dont le mot de passe a été EFFACÉ par le rejeu d'une restauration — « mot de passe oublié » est alors sa seule porte */
    const compte = compteDe(adr);
    if (compte) {
      const code = tirerCode();
      if (stockage.melCodePoser({ adr_h: adr.h, but: 'reinit', code_h: hCode(adr.h, 'reinit', ap_h, code), exp: horloge() + CODE_MS, ap_h })) envoyerPlusTard(adr, 'reinit', code);
    }
    res.json({ ok: true });
  };

  /* ══ 5. LE NOUVEAU MOT DE PASSE : toutes les autres sessions tombent ══ */
  H_['mel.reinit'] = async (req, res) => {
    if (!courriel || !courriel.ouvert()) return refus(res, 503, 'courriel_non_ouvert');
    const b = corps(req);
    const adr = adresseDe(b.courriel);
    if (!adr) return refus(res, 400, 'courriel_invalide');
    /* le mot de passe se juge AVANT de consommer le code : un mot de passe trop court ne doit pas obliger à redemander un courriel */
    /* ⛔ AVANT la preuve, rien qui vienne du COMPTE (relecture du gardien, N1) : juger « contient le prénom » ici disait, sans plafond, si l'adresse avait un compte — et le prénom par
       dictionnaire. Avant : la règle commune et l'adresse TAPÉE (connue de l'appelant). Le prénom se juge APRÈS le code, avant de le consommer : seul qui a le code voit ce refus. */
    if (!mdpAccepte(b.mdp, { adresse: adr.a })) return refus(res, 400, 'mdp_faible');
    const rec = prouver(req, res, adr, 'reinit', b.code);
    if (!rec) return;
    const p = compteDe(adr);
    if (p && mdpDevinable(b.mdp, { prenom: p.prenom })) return refus(res, 400, 'mdp_faible');   // le code n'est pas consommé : un second essai avec un autre mot de passe passe
    stockage.melCodeSupprimer(adr.h, 'reinit');
    if (!p) return refus(res, 401, 'code_invalide');
    let h;
    try { h = await mdp.hacher(b.mdp); } catch (e) { if (e && e.message === 'file_pleine') return trop(res, 'service_occupe', 5); throw e; }
    stockage.mdpPoser(p.id, h, { change: true });
    const hs = stockage.sessionsSupprimerAutres(p.id, '');
    for (const x of hs) hub.fermerSession(x);
    try { stockage.telAppareilsSupprimerAutres(p.id, ''); } catch (e) { /* un compte sans appareil lié */ }
    /* ⛔ LES NOTIFICATIONS PUSH AUSSI (relecture du gardien, B1) : l'appareil de celui qui avait pris le compte, sa session coupée, recevait encore « Nouveau message » (et le texte, aperçu activé).
       Celles de la personne partent avec : elle se réabonne d'un geste. Et les appareils « connus » sont oubliés, sauf celui-ci. */
    stockage.pushSupprimerPersonne(p.id);
    const ap = appareilDe(req, res);
    stockage.appareilsMelOublier(p.id, ap);
    stockage.appareilMelNoter(ap, p.id);
    envoyerPlusTard(adr, 'change', null);
    const annulee = stockage.suppressionLe(p.id) !== null && stockage.suppressionAnnuler(p.id);
    if (annulee) { try { if (ctx.facturation) ctx.facturation.perso.annulationsTraiter(); } catch (e) { /* rejoué plus tard */ } }
    ouvrirSession(res, p.id, b.appareil);
    journal('compte_courriel', { etat: 'mdp_change', n: hs.length });
    const moi = stockage.personneParId(p.id);
    res.json(annulee ? { ok: true, moi, sessions: hs.length, suppression_annulee: true } : { ok: true, moi, sessions: hs.length });
  };

  for (const k of Object.keys(H_)) H_[k] = garder(H_[k]);
  return { handlers: H_, inscriptionOuverte, mdp, mdpDevinable };
}

function installerCompteCourriel(H, ctx) {
  const c = creerCompteCourriel(ctx);
  Object.assign(H, c.handlers);
  return c;
}

module.exports = { installerCompteCourriel, creerCompteCourriel, mdpDevinable, CODE_MS, CODE_ESSAIS, RENVOI_MS, ADRESSE_HEURE, ADRESSE_JOUR, RESEAU_JOUR, INCONNUS_JOUR, SUJETS, CGU_V };
