/* ══ LES DEMANDES DE SIGNATURE — LA LOGIQUE, SANS HTTP ═══════════════════════════════════════════════════════════════════════
 * Le parcours du module OP Courrier : documents, signataires (nom, e-mail, mobile), contre-signature (l'expéditeur, TOUJOURS le dernier),
 * niveau « Code SMS » (signature avancée) ou « Code e-mail » (simple), délai 7/15/30 jours, relances tous les 2 jours (Yousign n'accepte que 1, 2, 7 ou 14).
 * États rendus au module : brouillon · en_attente · ouvert · a_contresigner · signe · refuse · annule · expire.
 *
 * ⛔ UNE DEMANDE APPARTIENT À UNE PERSONNE. Chaque porte passe par `charger(proprio, id)`, qui répond « introuvable » dans les deux cas
 * (elle n'existe pas / elle est à quelqu'un d'autre) : un second compte ne peut pas savoir qu'un identifiant existe.
 * ⛔ AUCUNE DONNÉE PERSONNELLE DANS LE JOURNAL : `journal(evt, champs)` ne reçoit que des identifiants internes, des états et des statuts HTTP.
 * ⛔ Ce que Yousign nous APPREND (webhook) ne sert qu'à avancer l'état ; les PDF signés sont TÉLÉCHARGÉS chez Yousign (jamais crus sur parole).
 */
'use strict';
const crypto = require('crypto');
const J = 86400000;

class Refus extends Error { constructor(statut, code, plus) { super(code); this.statut = statut; this.code = code; this.plus = plus || null; } }

const TERMINAUX = new Set(['signe', 'refuse', 'annule', 'expire']);
const RE_ID = /^[0-9a-f]{24}$/;
const RE_MAIL = /^[^\s@,;<>"]+@[^\s@,;<>"]+\.[^\s@,;<>"]+$/;
const MAX_SIGNATAIRES = 10, MAX_DOCS = 5, MAX_PDF = 25 * 1024 * 1024;

/* Un mobile devient E.164 (ce que Yousign attend) : « 06 12 34 56 78 » → « +33612345678 ». Autre chose qu'un mobile lisible : null. */
function telNormalise(t) {
  const s = String(t || '').replace(/[\s.\-()]/g, '');
  let e;
  if (/^\+[1-9]\d{7,14}$/.test(s)) e = s;
  else if (/^00[1-9]\d{7,14}$/.test(s)) e = '+' + s.slice(2);
  else if (/^0[1-9]\d{8}$/.test(s)) e = '+33' + s.slice(1);
  else return null;
  return e;
}
const decouperNom = (nom) => { const m = String(nom).trim().split(/\s+/); return m.length === 1 ? { prenom: m[0], nom: m[0] } : { prenom: m[0], nom: m.slice(1).join(' ') }; };
const net = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

function pdfValide(buf) {
  return Buffer.isBuffer(buf) && buf.length > 64 && buf.subarray(0, 5).toString('latin1') === '%PDF-' && buf.subarray(Math.max(0, buf.length - 4096)).includes('%%EOF');
}

function creerDemandes({ stockage, yousign, config, horloge = Date.now, journal = () => {} }) {
  const jr = (evt, rec, plus) => journal(evt, Object.assign({ id: rec && rec.id, etat: rec && rec.etat }, plus || {}));

  function charger(proprio, id) {
    if (!RE_ID.test(String(id))) throw new Refus(404, 'introuvable');
    const rec = stockage.lire(id);
    if (!rec || rec.proprio !== proprio) throw new Refus(404, 'introuvable');
    return rec;
  }
  const exigerYousign = () => { if (!yousign) throw new Refus(503, 'signature_non_configuree'); return yousign; };
  const ecrire = (rec) => stockage.ecrire(rec);
  const trace = (rec, x) => { rec.evenements.push({ t: horloge(), x: net(x, 200) }); if (rec.evenements.length > 100) rec.evenements.splice(0, rec.evenements.length - 100); };
  const nomDe = (rec, s) => s.contre ? 'vous (contre-signature)' : (s.nom || s.email);

  function vue(rec) {
    return {
      id: rec.id, titre: rec.titre, type: rec.type, niveau: rec.niveau, etat: rec.etat, jours: rec.jours, relances: rec.relances, contresignature: rec.signataires.some((s) => s.contre),
      cree: rec.cree, echeance: rec.echeance || 0,
      signataires: rec.signataires.map((s) => ({ n: s.n, nom: s.nom, email: s.email, contre: !!s.contre, etat: s.etat })),
      documents: rec.documents.map((d) => ({ n: d.n, nom: d.nom, taille: d.taille, signe: !!rec.recupere })),
      preuves: rec.recupere ? rec.preuves || 0 : 0,
      evenements: rec.evenements.map((e) => ({ t: e.t, x: e.x })),
    };
  }

  function creer(proprio, b) {
    b = b || {};
    const titre = net(b.titre, 200);
    if (!titre) throw new Refus(400, 'titre_requis');
    const niveau = b.niveau === 'avance' || b.niveau === 'adv' ? 'avance' : b.niveau === 'simple' ? 'simple' : null;
    if (!niveau) throw new Refus(400, 'niveau_invalide');
    const jours = Number(b.jours);
    if (![7, 15, 30].includes(jours)) throw new Refus(400, 'delai_invalide');
    if (!Array.isArray(b.signataires) || b.signataires.length < 1 || b.signataires.length > MAX_SIGNATAIRES) throw new Refus(400, 'signataires_invalides');
    const liste = b.signataires.slice(), contre = b.contresignature ? Object.assign({}, b.contresignature, { contre: true }) : null;
    if (contre) liste.push(contre);
    if (liste.length > MAX_SIGNATAIRES) throw new Refus(400, 'signataires_invalides');
    const vus = new Set();
    const signataires = liste.map((x, i) => {
      x = x || {};
      const nom = net(x.nom, 100), email = net(x.email, 254).toLowerCase();
      if (!nom) throw new Refus(400, 'signataire_invalide', { n: i + 1, champ: 'nom' });
      if (!RE_MAIL.test(email)) throw new Refus(400, 'signataire_invalide', { n: i + 1, champ: 'email' });
      if (vus.has(email)) throw new Refus(400, 'signataire_en_double', { n: i + 1 });
      vus.add(email);
      let telephone = '';
      if (niveau === 'avance') { telephone = telNormalise(x.telephone); if (!telephone) throw new Refus(400, 'signataire_invalide', { n: i + 1, champ: 'telephone' }); }
      return { n: i + 1, nom, email, telephone, contre: !!x.contre, ysId: null, etat: 'pending' };
    });
    const now = horloge();
    const rec = {
      id: crypto.randomBytes(12).toString('hex'), proprio, ysId: null, etat: 'brouillon', cree: now, purge: now + config.brouillonJours * J,
      titre, type: net(b.type, 60) || 'Autre', niveau, jours, relances: b.relances !== false, ordonne: !!contre, echeance: 0,
      documents: [], signataires, evenements: [], relancesFaites: 0, derniereRelance: 0, recupere: false, preuves: 0,
    };
    trace(rec, 'Demande préparée'); ecrire(rec); jr('demande_creee', rec);
    return vue(rec);
  }

  function ajouterDocument(proprio, id, nom, pdf) {
    const rec = charger(proprio, id);
    if (rec.etat !== 'brouillon') throw new Refus(409, 'deja_activee');
    if (rec.documents.length >= MAX_DOCS) throw new Refus(409, 'trop_de_documents');
    if (!Buffer.isBuffer(pdf) || !pdf.length) throw new Refus(400, 'pdf_requis');
    if (pdf.length > MAX_PDF) throw new Refus(413, 'pdf_trop_gros');
    if (!pdfValide(pdf)) throw new Refus(415, 'pdf_invalide');
    const n = rec.documents.length ? rec.documents[rec.documents.length - 1].n + 1 : 1;
    let fichier = net(nom, 120).replace(/[\\/:*?"<>|]/g, '_') || 'document.pdf';
    if (!/\.pdf$/i.test(fichier)) fichier += '.pdf';
    stockage.pieceEcrire(rec.id, 'src' + n, pdf);
    rec.documents.push({ n, nom: fichier, taille: pdf.length, ysId: null, pages: 1 });
    ecrire(rec); jr('document_ajoute', rec);
    return vue(rec);
  }

  /* Combien de SMS cette activation fait partir (pour le plafond anti-abus). */
  const poidsSms = (rec) => rec.niveau === 'avance' ? rec.signataires.length : 0;

  async function activer(proprio, id) {
    const y = exigerYousign();
    const rec = charger(proprio, id);
    if (rec.etat !== 'brouillon') throw new Refus(409, 'deja_activee');
    if (!rec.documents.length) throw new Refus(400, 'document_requis');
    rec.etat = 'activation'; ecrire(rec);   // verrou : un second « activer » pendant l'aller-retour est refusé ci-dessus
    try {
      const d = await y.creerDemande({ nom: rec.titre, jours: rec.jours, relances: rec.relances, ordonne: rec.ordonne });
      rec.ysId = d.id; ecrire(rec);
      for (const doc of rec.documents) {
        const pdf = stockage.pieceLire(rec.id, 'src' + doc.n);
        if (!pdf) throw new Error('pièce absente');
        const r = await y.ajouterDocument(rec.ysId, { nom: doc.nom, pdf }); doc.ysId = r.id; doc.pages = r.pages;
      }
      // les zones de signature : dernière page de chaque document, deux colonnes, du haut vers le bas, dans l'ordre des signataires (contre-signature en dernier)
      for (const s of rec.signataires) {
        const i = s.n - 1, nm = decouperNom(s.nom);
        const zones = rec.documents.map((doc) => ({ document: doc.ysId, page: doc.pages, x: 40 + (i % 2) * 270, y: 640 - Math.floor(i / 2) * 80, largeur: 200, hauteur: 60 }));
        s.ysId = (await y.ajouterSignataire(rec.ysId, { prenom: nm.prenom, nom: nm.nom, email: s.email, telephone: s.telephone, niveau: rec.niveau, zones })).id;
      }
      await y.activer(rec.ysId);
    } catch (e) {
      jr('activation_echec', rec, { etape: e && e.etape, statut: e && e.statut, champ: e && e.champ || undefined });
      if (rec.ysId) { try { await y.supprimerBrouillon(rec.ysId); } catch (e2) { /* brouillon Yousign laissé : sans effet, personne n'est prévenu */ } }
      rec.ysId = null; rec.etat = 'brouillon'; rec.signataires.forEach((s) => { s.ysId = null; }); rec.documents.forEach((d) => { d.ysId = null; });
      ecrire(rec);
      throw new Refus(502, 'yousign_refuse', { etape: e && e.etape, statut: e && e.statut || 0, champ: e && e.champ || undefined, raison: e && e.raison || undefined });
    }
    const now = horloge();
    rec.etat = 'en_attente'; rec.echeance = now + rec.jours * J; rec.purge = rec.echeance + config.retentionAnnuleJours * J;
    trace(rec, 'Envoyé à ' + rec.signataires.filter((s) => !s.contre).map((s) => s.nom).join(', '));
    ecrire(rec); jr('activee', rec);
    return vue(rec);
  }

  function recalculer(rec) {
    if (TERMINAUX.has(rec.etat) || rec.etat === 'brouillon' || rec.etat === 'activation') return;
    const autres = rec.signataires.filter((s) => !s.contre), contre = rec.signataires.find((s) => s.contre);
    if (contre && autres.length && autres.every((s) => s.etat === 'signed') && contre.etat !== 'signed') rec.etat = 'a_contresigner';
    else if (rec.signataires.some((s) => s.etat === 'viewed' || s.etat === 'signed')) rec.etat = 'ouvert';
    else rec.etat = 'en_attente';
  }

  function terminer(rec, etat, jours) {
    rec.etat = etat; rec.purge = horloge() + jours * J;
    if (etat !== 'signe') stockage.piecesEffacer(rec.id, 'src');   // annulée, refusée, expirée : le document à signer ne reste pas
  }

  async function recuperer(rec) {
    const y = exigerYousign();
    for (const doc of rec.documents) {
      const buf = await y.telechargerSigne(rec.ysId, doc.ysId);
      if (!pdfValide(buf)) throw new Error('pdf signé illisible');
      stockage.pieceEcrire(rec.id, 'sig' + doc.n, buf);
    }
    let p = 0;
    for (const s of rec.signataires) {
      const buf = await y.telechargerPreuve(rec.ysId, s.ysId);
      if (!pdfValide(buf)) throw new Error('preuve illisible');
      p++; stockage.pieceEcrire(rec.id, 'preuve' + p, buf);
    }
    rec.preuves = p; rec.recupere = true;
    stockage.piecesEffacer(rec.id, 'src');   // le signé est gardé ; l'original à signer n'a plus d'usage
    trace(rec, 'Document signé et dossier de preuve archivés');
    ecrire(rec); jr('pieces_recuperees', rec);
  }

  /* Un événement Yousign DÉJÀ authentifié (HMAC) et DÉJÀ noté comme neuf. Rend { traite }. Jette si l'état n'a pas pu être écrit (le webhook oublie alors l'événement et répond 500 : Yousign réessaiera). */
  async function appliquerEvenement(ev) {
    const nom = String(ev && ev.event_name || ''), data = (ev && ev.data) || {};
    const ysId = data.signature_request && data.signature_request.id;
    const id = ysId ? stockage.idParYs(ysId) : null;
    if (!id) return { traite: false, raison: 'inconnue' };
    const rec = stockage.lire(id);
    if (!rec) return { traite: false, raison: 'inconnue' };
    const sid = data.signer && data.signer.id;
    const s = sid ? rec.signataires.find((x) => x.ysId === String(sid)) : null;
    const deja = TERMINAUX.has(rec.etat);
    let aRecuperer = false;
    switch (nom) {
      case 'signature_request.activated': if (rec.etat === 'activation' || rec.etat === 'brouillon') break; return { traite: true };
      case 'signer.link_opened': if (s && s.etat === 'pending' && !deja) { s.etat = 'viewed'; trace(rec, 'Document ouvert par ' + nomDe(rec, s)); } break;
      case 'signer.signed': if (s && s.etat !== 'signed' && !deja) { s.etat = 'signed'; trace(rec, 'Signé par ' + nomDe(rec, s)); } break;
      case 'signer.declined': case 'signature_request.declined':
        if (!deja) { if (s) s.etat = 'declined'; terminer(rec, 'refuse', config.retentionAnnuleJours); trace(rec, s ? 'Refusé par ' + nomDe(rec, s) : 'Demande refusée'); }
        break;
      case 'signature_request.done':
        if (!deja) { rec.signataires.forEach((x) => { x.etat = 'signed'; }); terminer(rec, 'signe', config.retentionJours); trace(rec, 'Tous les signataires ont signé'); aRecuperer = true; }
        break;
      case 'signature_request.expired': if (!deja) { terminer(rec, 'expire', config.retentionAnnuleJours); trace(rec, 'Demande expirée'); } break;
      case 'signature_request.canceled': case 'signature_request.cancelled': if (!deja) { terminer(rec, 'annule', config.retentionAnnuleJours); trace(rec, 'Demande annulée'); } break;
      default: return { traite: false, raison: 'ignoree' };
    }
    recalculer(rec); ecrire(rec); jr('evenement', rec, { nom });
    if (aRecuperer) { try { await recuperer(rec); } catch (e) { jr('recuperation_echec', rec, { statut: e && e.statut || 0 }); } }   // le balayage et le téléchargement réessaient
    return { traite: true };
  }

  async function relancer(proprio, id) {
    const y = exigerYousign();
    const rec = charger(proprio, id);
    if (!['en_attente', 'ouvert', 'a_contresigner'].includes(rec.etat)) throw new Refus(409, 'pas_en_cours');
    const now = horloge();
    if (now - rec.derniereRelance < 10 * 60000) throw new Refus(429, 'relance_trop_proche');
    const restants = rec.signataires.filter((s) => s.etat !== 'signed' && s.etat !== 'declined');
    const cibles = rec.ordonne ? restants.slice(0, 1) : restants;
    if (!cibles.length) throw new Refus(409, 'pas_en_cours');
    rec.derniereRelance = now;
    try { for (const s of cibles) await y.relancer(rec.ysId, s.ysId); }
    catch (e) { ecrire(rec); jr('relance_echec', rec, { statut: e && e.statut || 0 }); throw new Refus(502, 'yousign_refuse', { etape: 'relancer', statut: e && e.statut || 0 }); }
    rec.relancesFaites++; trace(rec, 'Relance envoyée à ' + cibles.map((s) => nomDe(rec, s)).join(', '));
    ecrire(rec); jr('relancee', rec);
    return vue(rec);
  }

  async function annuler(proprio, id) {
    const rec = charger(proprio, id);
    if (rec.etat === 'activation') throw new Refus(409, 'activation_en_cours');
    if (rec.etat === 'brouillon') { stockage.supprimer(rec.id); jr('brouillon_supprime', rec); return { id: rec.id, supprime: true }; }
    if (TERMINAUX.has(rec.etat)) throw new Refus(409, 'deja_terminee');
    const y = exigerYousign();
    try { await y.annuler(rec.ysId); }
    catch (e) { jr('annulation_echec', rec, { statut: e && e.statut || 0 }); throw new Refus(502, 'yousign_refuse', { etape: 'annuler', statut: e && e.statut || 0 }); }   // pas annulée chez eux : on ne ment pas
    terminer(rec, 'annule', config.retentionAnnuleJours); trace(rec, 'Demande annulée — le lien de signature ne fonctionne plus');
    ecrire(rec); jr('annulee', rec);
    return vue(rec);
  }

  function effacer(proprio, id) {   // efface maintenant : brouillon ou demande finie, jamais une demande en cours
    const rec = charger(proprio, id);
    if (!(rec.etat === 'brouillon' || TERMINAUX.has(rec.etat))) throw new Refus(409, 'en_cours');
    stockage.supprimer(rec.id); jr('efface', rec);
    return { id: rec.id, supprime: true };
  }

  async function pdfSigne(proprio, id, n) {
    const rec = charger(proprio, id);
    if (rec.etat !== 'signe') throw new Refus(409, 'pas_signee');
    if (!rec.recupere) { try { await recuperer(rec); } catch (e) { throw new Refus(503, 'pieces_en_cours'); } }
    const doc = rec.documents.find((d) => d.n === Number(n));
    const buf = doc && stockage.pieceLire(rec.id, 'sig' + doc.n);
    if (!buf) throw new Refus(404, 'introuvable');
    return { nom: doc.nom.replace(/\.pdf$/i, '') + ' (signé).pdf', pdf: buf };
  }
  async function preuve(proprio, id, i) {
    const rec = charger(proprio, id);
    if (rec.etat !== 'signe') throw new Refus(409, 'pas_signee');
    if (!rec.recupere) { try { await recuperer(rec); } catch (e) { throw new Refus(503, 'pieces_en_cours'); } }
    const k = Number(i);
    const buf = Number.isInteger(k) && k >= 1 && k <= rec.preuves ? stockage.pieceLire(rec.id, 'preuve' + k) : null;
    if (!buf) throw new Refus(404, 'introuvable');
    return { nom: 'Dossier de preuve ' + k + '.pdf', pdf: buf };
  }

  /* Le ménage : demandes échues effacées (une demande ENCORE en cours chez Yousign y est annulée d'abord), pièces signées non récupérées reprises, événements anciens oubliés. */
  async function balayer() {
    const now = horloge();
    for (const id of stockage.echues(now)) {
      let rec; try { rec = stockage.lire(id); } catch (e) { rec = null; }
      if (rec && yousign && rec.ysId && !TERMINAUX.has(rec.etat) && rec.etat !== 'brouillon') { try { await yousign.annuler(rec.ysId); } catch (e) { /* échue côté Yousign aussi */ } }
      try { stockage.supprimer(id); jr('purge', { id, etat: rec && rec.etat }); } catch (e) { journal('purge_echec', { id }); }
    }
    for (const id of stockage.signees()) {
      let rec; try { rec = stockage.lire(id); } catch (e) { continue; }
      if (rec && !rec.recupere && yousign) { try { await recuperer(rec); } catch (e) { jr('recuperation_echec', rec, { statut: e && e.statut || 0 }); } }
    }
    stockage.evenementsPurger(now - 30 * J);
  }

  return {
    creer, ajouterDocument, activer, relancer, annuler, effacer, pdfSigne, preuve, appliquerEvenement, balayer, poidsSms, telNormalise,
    lire: (proprio, id) => vue(charger(proprio, id)),
    lireBrut: (proprio, id) => charger(proprio, id),
    lister: (proprio) => stockage.lister(proprio).map(vue),
  };
}
module.exports = { creerDemandes, Refus, telNormalise, pdfValide, MAX_PDF };
