/* ══ L'AGENDA PERSONNEL — DES ÉVÉNEMENTS À SOI, AVEC UN RAPPEL ═══════════════════════════════════════════════════════════════════════════════════
 *
 * Demandé le 6 octobre 2026 (le chantier qui prépare l'agent « Pro Assistant » : il lui faut un agenda à gérer). Un ÉVÉNEMENT est à une personne seule — « dentiste jeudi 14 h » —, sans
 * invités, sans conversation, sans salle : ce n'est PAS une réunion (`routes-reunions.js`, qui demande Pro pour programmer). Il est GRATUIT : un agenda qui se paierait ne
 * servirait à personne, et c'est l'agent qui s'appuiera dessus qui se vendra.
 *
 *   GET  /api/agenda?du=<ms>&au=<ms>                      S  les événements qui touchent la fenêtre (90 jours au plus, 500 au plus)
 *   POST /api/agenda                                      S  {titre, lieu?, note?, debut, fin, journee?, tz?, rappel?} → 201 {evenement}
 *   POST /api/agenda/:id/maj                              S  les mêmes champs, chacun facultatif
 *   POST /api/agenda/:id/supprimer                        S
 *   POST /api/agenda/:id/fait                             S  {fait: true|false} — coché, il ne sonne plus ; décoché, son rappel se recalcule
 *   POST /api/agenda/:id/reporter                         S  {dans: 10 | 60 | 'demain'} — plus tard (10 min, 1 h) ou demain 9 h dans son fuseau, décoché, et il sonnera à l'heure
 *   GET  /api/agenda/:id/ics                              S  le fichier .ics de l'événement (ses rappels compris) : « Ajouter à mon calendrier »
 *
 * ⛔ LE RENDEZ-VOUS (13 octobre 2026 : « dans Perso, à la place de réunion tu mets rendez-vous… avec des rappels et tout », « ils peuvent aussi l'ajouter à leur agenda, comme Apple fait ») est
 *    un événement de `genre` 'rdv' : il a TOUJOURS une heure (jamais « toute la journée »), un « avec qui » (`avec`, facultatif, scellé comme le titre) et, comme tout événement, une LISTE de
 *    rappels (`rappels` : trois au plus, parmi ceux de `RAPPELS`). Le genre se choisit à la création et ne change pas. `rappel` (un seul) reste accepté — la page d'avant l'envoie.
 *    Chaque rappel part une fois, dans l'ordre : quand l'un part, l'échéance passe au SUIVANT (`prochaine`), calculée ici, jamais par la page.
 * ⛔ LE TRAJET D'UN RENDEZ-VOUS (13 octobre 2026 : « à quelle heure il doit partir s'il veut arriver 5 ou 10 minutes avant ») : `trajet` (`trajet.js`, calculé par `POST /api/trajet`, rangé scellé)
 *    ajoute UNE échéance à la liste — l'heure de partir (le début, moins le trajet, moins l'avance voulue) — et son rappel dit « Il est temps de partir ». Le service ne recalcule rien à
 *    l'enregistrement : la durée est celle que la personne a fait calculer, et un rendez-vous s'enregistre même quand le calcul est indisponible.
 *
 * ⛔ UN RAPPEL QUI VIENT D'UN MESSAGE (« Me le rappeler », 8 octobre 2026 : « voir le message ») garde un POINTEUR (`source` : {conv, seq}), posé à la création seulement et à une
 *    condition : la personne est membre de la conversation et le message y existe. Lire le message redemande d'en être membre : le pointeur ne donne rien d'autre que le chemin.
 *
 * ⛔ L'HEURE EST LOCALE ET SON FUSEAU EST DIT (`debut`, `fin` : « 2026-10-26T14:00 » ; `tz` : « Europe/Paris », par défaut celui de la personne) — le service les convertit par
 *    `calendrier.js`, qui connaît les changements d'heure. Une journée entière (`journee`) va de minuit à minuit, dans son fuseau.
 * ⛔ UN ÉVÉNEMENT N'EXISTE QUE POUR SA PERSONNE : celui d'un autre répond 404, le même qu'un événement qui n'existe pas.
 * ⛔ LE TITRE, LE LIEU ET LA NOTE SONT SCELLÉS en base (comme le titre d'une réunion) ; ils n'entrent dans aucun journal.
 * ⛔ LE RAPPEL PART UNE FOIS : son échéance (`rappel_a`) s'efface dans la même transaction que la notification s'écrit (`stockage.evenementRappelEnvoyer`). Il part par le planificateur des
 *    réunions (UNE instance, un bail) ; un rappel dû pendant un arrêt part au retour si l'événement n'a pas commencé, sinon il est abandonné — et compté.
 * ⛔ DES PLAFONDS : 2 000 événements par personne, 120 écritures par heure.
 */
'use strict';
const cal = require('./calendrier');
const ics = require('./ics');
const { validerTrajet, avantDepart, texteDepart } = require('./trajet');

const JOUR = 86400000, MIN = 60000;
const FENETRE_MAX = 92 * JOUR, LISTE_MAX = 500, EVENEMENTS_MAX = 2000;
const TITRE_MAX = 120, LIEU_MAX = 300, NOTE_MAX = 2000, DUREE_MAX = 31 * JOUR;
const RAPPELS = [0, 5, 15, 30, 60, 1440];            // à l'heure, 5 min, 15 min, 30 min, 1 h, la veille (même heure locale)
const RAPPELS_MAX = 3, AVEC_MAX = 120, GENRES = ['evenement', 'rdv'];
const ID_EVT = /^e_[0-9a-f]{32}$/, ID_CONV = /^c_[0-9a-f]{32}$/;
const REPORTS = [10, 60, 'demain'];                 // « Reporter » : dans 10 min, dans 1 h, demain 9 h (heure locale de l'événement)
const FUSEAU_DEFAUT = 'Europe/Paris';
const CTRL = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f​-‏‪-‮⁦-⁩﻿]/g;
const ligne = (s) => String(s).replace(CTRL, '').replace(/[\r\n\t]+/g, ' ').replace(/\s+/g, ' ').trim();
const texte = (s) => String(s).replace(CTRL, '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
const corps = (req) => (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) ? req.body : {};
const longueur = (s) => Array.from(s).length;

/* L'échéance du rappel : « la veille » est la même heure LOCALE la veille (`echeanceRappel`), les autres des durées exactes. Une échéance passée n'est pas posée (on ne rappelle pas après coup). */
function echeance(debut, rappel, tz, maintenant) {
  if (rappel === null || rappel === undefined) return null;
  const e = rappel === 0 ? debut : cal.echeanceRappel(debut, rappel, tz);
  return e > maintenant ? e : null;
}
/* La PROCHAINE échéance d'une liste de rappels : la plus proche qui n'est pas passée (null s'il n'y en a plus). Un rappel qui vient de partir est passé : c'est le suivant qui vient.
   `depart` : les minutes avant le début où il faut PARTIR (le trajet et l'avance — `avantDepart`), une échéance de plus ; null sans trajet. */
function prochaine(debut, rappels, tz, maintenant, depart) {
  let p = null;
  for (const m of rappels || []) { const e = echeance(debut, m, tz, maintenant); if (e !== null && (p === null || e < p)) p = e; }
  if (Number.isSafeInteger(depart) && depart > 0) { const e = debut - depart * MIN; if (e > maintenant && (p === null || e < p)) p = e; }
  return p;
}

function creerAgenda({ stockage, quotas, config, horloge, journaliser }) {
  const refus = (res, statut, code, extra) => res.status(statut).json(Object.assign({ error: code }, extra || {}));
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  function plafond(res, uid) {
    const q = Object.assign({ max: 120, fenetreMs: 3600000 }, (config.quotas || {}).agenda || {});
    const r = quotas.essai('agenda:' + uid, q.max, q.fenetreMs);
    if (r.ok) return true;
    res.set('Retry-After', String(r.retry)); refus(res, 429, 'quota_atteint', { retry: r.retry });
    return false;
  }

  /* Les champs reçus → { champs } ou { erreur }. `base` : l'événement qu'on modifie (les champs absents en viennent). */
  function valider(b, base, tzPersonne) {
    const present = (k) => b[k] !== undefined;
    const v = {};
    if (present('titre') || !base) {
      if (typeof b.titre !== 'string') return { erreur: present('titre') ? 'champ_invalide' : 'titre_vide' };
      const t = ligne(b.titre);
      if (!t) return { erreur: 'titre_vide' };
      if (longueur(t) > TITRE_MAX) return { erreur: 'champ_invalide' };
      v.titre = t;
    } else v.titre = base.titre;
    for (const [k, max, f] of [['lieu', LIEU_MAX, ligne], ['note', NOTE_MAX, texte]]) {
      if (present(k)) {
        if (b[k] !== null && typeof b[k] !== 'string') return { erreur: 'champ_invalide' };
        const x = b[k] === null ? '' : f(b[k]);
        if (longueur(x) > max) return { erreur: 'champ_invalide' };
        v[k] = x;
      } else v[k] = base ? base[k] : '';
    }
    let tz = base ? base.tz : (cal.tzValide(tzPersonne) || FUSEAU_DEFAUT);
    if (present('tz')) { const z = cal.tzValide(b.tz); if (!z) return { erreur: 'fuseau_inconnu' }; tz = z; }
    v.tz = tz;
    if (present('journee') && typeof b.journee !== 'boolean') return { erreur: 'champ_invalide' };
    v.journee = present('journee') ? b.journee : (base ? base.journee : false);
    /* l'horaire : en heure LOCALE (« 2026-10-26T14:00 »), ou une date seule pour une journée entière (« 2026-10-26 ») ; sinon ceux de l'événement (convertis dans le nouveau fuseau s'il change) */
    const instant = (brut, finJournee) => {
      if (v.journee) {
        const d = cal.lireDate(typeof brut === 'string' ? brut.slice(0, 10) : '');
        if (!d) return null;
        const j = finJournee ? cal.ajouterJours(d, 1) : d;            // une journée entière finit au minuit SUIVANT, dans son fuseau
        return cal.instantLocal({ a: j.a, m: j.m, j: j.j, h: 0, mi: 0 }, tz);
      }
      const p = cal.lireLocal(brut);
      return p ? cal.instantLocal(p, tz) : null;
    };
    const horaire = !base || ['debut', 'fin', 'tz', 'journee'].some(present);
    if (horaire) {
      const db = present('debut') ? b.debut : (base ? cal.formaterLocal(base.debut, tz) : undefined);
      const fb = present('fin') ? b.fin : (base ? (v.journee ? cal.formaterLocal(base.fin - 1, tz) : cal.formaterLocal(base.fin, tz)) : undefined);
      if (db === undefined) return { erreur: 'heure_invalide' };
      const d = instant(db, false);
      if (d === null) return { erreur: 'heure_invalide' };
      let f;
      if (fb === undefined || fb === null) f = v.journee ? instant(db, true) : d + 3600000;
      else f = instant(fb, true);
      if (f === null) return { erreur: 'heure_invalide' };
      if (!(f > d) && !(v.journee && f >= d)) return { erreur: 'fin_avant_debut' };
      if (f - d > DUREE_MAX) return { erreur: 'evenement_trop_long' };
      v.debut = d; v.fin = f;
    } else { v.debut = base.debut; v.fin = base.fin; }
    /* le genre : choisi à la création (un événement par défaut), il ne change pas ensuite — un rendez-vous n'est jamais « toute la journée » */
    if (present('genre') && (!GENRES.includes(b.genre) || (base && b.genre !== base.genre))) return { erreur: 'champ_invalide' };
    v.genre = base ? base.genre : (present('genre') ? b.genre : 'evenement');
    if (v.genre === 'rdv' && v.journee) return { erreur: 'champ_invalide' };
    if (present('avec')) {
      if (b.avec !== null && typeof b.avec !== 'string') return { erreur: 'champ_invalide' };
      const x = b.avec === null ? '' : ligne(b.avec);
      if (longueur(x) > AVEC_MAX) return { erreur: 'champ_invalide' };
      v.avec = x;
    } else v.avec = base ? base.avec : '';
    if (v.genre !== 'rdv' && v.avec) return { erreur: 'champ_invalide' };           // « avec qui » est celui d'un rendez-vous : un événement n'en a pas
    /* le trajet : celui d'un rendez-vous seulement (un rendez-vous a toujours une heure) ; null le retire, absent le garde */
    if (present('trajet')) {
      if (b.trajet !== null && v.genre !== 'rdv') return { erreur: 'champ_invalide' };
      const t = validerTrajet(b.trajet);
      if (t.erreur) return { erreur: t.erreur };
      v.trajet = t.trajet;
    } else v.trajet = base ? (base.trajet || null) : null;
    /* ⛔ un trajet va VERS le lieu du rendez-vous : sans lieu, il n'en a pas (refusé s'il arrive, retiré s'il restait) ; et un lieu qui CHANGE sans trajet neuf emporte l'ancien — il menait
       ailleurs (la page d'avant, qui ne connaît pas le trajet, renvoie le lieu corrigé : « Il est temps de partir » compterait le trajet d'une autre adresse) */
    if (v.trajet && !v.lieu) { if (present('trajet')) return { erreur: 'trajet_invalide' }; v.trajet = null; }
    if (base && base.trajet && !present('trajet') && present('lieu') && v.lieu !== base.lieu) v.trajet = null;
    const trajetChange = present('trajet') || !!(base && base.trajet && !v.trajet);
    /* les rappels : une LISTE (trois au plus, sans doublon, parmi `RAPPELS`), rangée la plus éloignée d'abord ; ou le rappel seul de la page d'avant. Les deux à la fois : refusé. */
    if (present('rappels') && present('rappel')) return { erreur: 'champ_invalide' };
    if (present('rappels')) {
      const l = b.rappels;
      if (!Array.isArray(l) || l.length > RAPPELS_MAX || !l.every(m => RAPPELS.includes(m)) || new Set(l).size !== l.length) return { erreur: 'rappel_invalide' };
      v.rappels = l.slice().sort((x, y) => y - x);
    } else if (present('rappel')) {
      if (b.rappel !== null && !RAPPELS.includes(b.rappel)) return { erreur: 'rappel_invalide' };
      /* ⛔ une page d'AVANT renvoie `rappel` à CHAQUE enregistrement (corriger la note d'un rendez-vous suffit) : le MÊME premier rappel garde la liste qu'elle ne voit pas, un autre la remplace */
      v.rappels = b.rappel === null ? [] : (base && base.rappels.length > 1 && base.rappels[0] === b.rappel ? base.rappels : [b.rappel]);
    } else v.rappels = base ? base.rappels : [];
    v.rappel = v.rappels.length ? v.rappels[0] : null;
    /* le côté (8 octobre 2026, « bien séparer l'agenda perso et pro ») : 'perso' ou 'pro' ; null rend le côté déduit (celui de la conversation d'origine, sinon Perso). Absent à la création : déduit ;
       absent à une modification : inchangé. Rien d'autre n'est accepté. */
    if (present('cote')) {
      if (b.cote !== null && b.cote !== 'perso' && b.cote !== 'pro') return { erreur: 'champ_invalide' };
      v.cote = b.cote;
    }
    return { champs: v, horaire, trajetChange };
  }

  const H = {};
  H['agenda.lister'] = (req, res) => {
    const du = Number(req.query.du), au = Number(req.query.au);
    if (!Number.isSafeInteger(du) || !Number.isSafeInteger(au) || au <= du || au - du > FENETRE_MAX) return refus(res, 400, 'fenetre_invalide');
    res.json({ evenements: stockage.evenementsDe(req.moi.id, du, au, LISTE_MAX) });
  };
  H['agenda.creer'] = (req, res) => {
    if (!plafond(res, req.moi.id)) return;
    const moi = stockage.personneParId(req.moi.id);
    const r = valider(corps(req), null, moi && moi.tz);
    if (r.erreur) return refus(res, 400, r.erreur);
    if (stockage.evenementsCompter(req.moi.id) >= EVENEMENTS_MAX) return refus(res, 409, 'agenda_plein');
    const c = r.champs;
    /* le message d'origine : membre de sa conversation, et le message y existe — sinon la demande est refusée (jamais un pointeur posé sur ce qu'on ne peut pas lire) */
    let source = null;
    const sb = corps(req).source;
    if (sb !== undefined && sb !== null) {
      if (typeof sb !== 'object' || Array.isArray(sb) || !ID_CONV.test(String(sb.conv)) || !Number.isSafeInteger(sb.seq) || sb.seq < 1) return refus(res, 400, 'source_invalide');
      if (!stockage.convPourMembre(sb.conv, req.moi.id) || !stockage.messageExiste(sb.conv, sb.seq)) return refus(res, 400, 'source_invalide');
      source = { conv: sb.conv, seq: sb.seq };
    }
    const e = stockage.evenementCreer({ uid: req.moi.id, titre: c.titre, lieu: c.lieu, note: c.note, debut: c.debut, fin: c.fin, journee: c.journee, tz: c.tz, rappel: c.rappel,
      rappelA: prochaine(c.debut, c.rappels, c.tz, horloge(), avantDepart(c.trajet)), source, cote: c.cote === undefined ? null : c.cote, genre: c.genre, avec: c.avec, rappels: c.rappels, trajet: c.trajet });
    res.status(201).json({ evenement: e });
  };
  H['agenda.maj'] = (req, res) => {
    const id = req.params.id;
    if (!ID_EVT.test(id)) return refus(res, 404, 'introuvable');
    if (!plafond(res, req.moi.id)) return;
    const base = stockage.evenementLire(req.moi.id, id);
    if (!base) return refus(res, 404, 'introuvable');
    const r = valider(corps(req), base, null);
    if (r.erreur) return refus(res, 400, r.erreur);
    const c = r.champs;
    /* le rappel se recalcule quand l'horaire ou le rappel changent ; sinon il garde son état (déjà parti : il ne repart pas). ⛔ Coché « fait », il ne se réarme pas : corriger la note
       d'un rendez-vous fait ne le fait pas sonner (le décocher ou le reporter le fait). */
    const recalcul = !base.fait && (r.horaire || corps(req).rappel !== undefined || corps(req).rappels !== undefined || r.trajetChange);
    const e = stockage.evenementMaj(req.moi.id, id, { titre: c.titre, lieu: c.lieu, note: c.note, debut: c.debut, fin: c.fin, journee: c.journee, tz: c.tz, rappel: c.rappel,
      rappelA: recalcul ? prochaine(c.debut, c.rappels, c.tz, horloge(), avantDepart(c.trajet)) : undefined, cote: c.cote, avec: c.avec, rappels: c.rappels,
      trajet: r.trajetChange ? c.trajet : undefined });
    if (!e) return refus(res, 404, 'introuvable');
    res.json({ evenement: e });
  };
  H['agenda.supprimer'] = (req, res) => {
    const id = req.params.id;
    if (!ID_EVT.test(id)) return refus(res, 404, 'introuvable');
    if (!plafond(res, req.moi.id)) return;
    if (!stockage.evenementSupprimer(req.moi.id, id)) return refus(res, 404, 'introuvable');
    res.json({ ok: true });
  };

  /* cocher / décocher : coché, il ne sonne plus ; décoché, son rappel se recalcule (une échéance passée n'est pas reposée) */
  H['agenda.fait'] = (req, res) => {
    const id = req.params.id, b = corps(req);
    if (!ID_EVT.test(id)) return refus(res, 404, 'introuvable');
    if (typeof b.fait !== 'boolean') return refus(res, 400, 'champ_invalide');
    if (!plafond(res, req.moi.id)) return;
    const base = stockage.evenementLire(req.moi.id, id);
    if (!base) return refus(res, 404, 'introuvable');
    const t = horloge();
    const e = stockage.evenementFait(req.moi.id, id, b.fait ? t : null, b.fait ? null : prochaine(base.debut, base.rappels, base.tz, t, avantDepart(base.trajet)));
    if (!e) return refus(res, 404, 'introuvable');
    res.json({ evenement: e });
  };
  /* reporter : le nouvel horaire se CALCULE ici (jamais une heure venue de la page), la durée est gardée ; un événement sans rappel en reçoit un « à l'heure » — on reporte pour qu'il sonne */
  H['agenda.reporter'] = (req, res) => {
    const id = req.params.id, b = corps(req);
    if (!ID_EVT.test(id)) return refus(res, 404, 'introuvable');
    if (!REPORTS.includes(b.dans)) return refus(res, 400, 'champ_invalide');
    if (!plafond(res, req.moi.id)) return;
    const base = stockage.evenementLire(req.moi.id, id);
    if (!base) return refus(res, 404, 'introuvable');
    if (base.journee && b.dans !== 'demain') return refus(res, 400, 'champ_invalide');           // une journée entière ne se reporte que d'un jour
    const t = horloge(), duree = base.fin - base.debut;
    let debut;
    if (b.dans === 'demain') {
      const auj = cal.champsLocaux(t, base.tz), dem = cal.ajouterJours({ a: auj.a, m: auj.m, j: auj.j }, 1);
      debut = cal.instantLocal({ a: dem.a, m: dem.m, j: dem.j, h: base.journee ? 0 : 9, mi: 0 }, base.tz);
    } else debut = Math.ceil((t + b.dans * MIN) / MIN) * MIN;
    const rappels = base.rappels.length ? base.rappels : [0];
    const e = stockage.evenementReporter(req.moi.id, id, { debut, fin: debut + duree, journee: base.journee, rappel: rappels[0], rappelA: prochaine(debut, rappels, base.tz, t, avantDepart(base.trajet)), rappels });
    if (!e) return refus(res, 404, 'introuvable');
    res.json({ evenement: e });
  };

  /* « Ajouter à mon calendrier » : le fichier .ics de l'événement, ses rappels compris (Calendrier d'Apple, Google Agenda, Outlook l'ouvrent). Un événement d'un autre : 404, comme un inconnu.
     Une lecture : elle ne prend rien au plafond des écritures, mais garde le sien (60 par minute). */
  H['agenda.ics'] = (req, res) => {
    const id = req.params.id;
    if (!ID_EVT.test(id)) return refus(res, 404, 'introuvable');
    const q = quotas.essai('agenda-ics:' + req.moi.id, 60, 60000);
    if (!q.ok) { res.set('Retry-After', String(q.retry)); return refus(res, 429, 'quota_atteint', { retry: q.retry }); }
    const e = stockage.evenementLire(req.moi.id, id);
    if (!e) return refus(res, 404, 'introuvable');
    const texte = ics.fichierEvenement(e, { maintenant: horloge() });
    if (texte === null) return refus(res, 404, 'introuvable');
    res.set({ 'Content-Type': 'text/calendar; charset=utf-8', 'Content-Disposition': 'attachment; filename="' + ics.nomEvenement(e) + '"', 'Cache-Control': 'no-store' });
    res.send(texte);
  };

  /* ── Les rappels, appelés par le planificateur (qui tient le bail) : → { envoyes, abandonnes, passes }. `budget` : le nombre de rappels au plus pour ce tour. `depuis` : l'instant de la
     dernière RESTAURATION (0 : aucune) — ⛔ une échéance qui le précède est tenue pour traitée, comme celles des réunions : la copie restaurée ramène l'échéance d'un rappel déjà parti
     (avec plusieurs rappels, celle d'un rappel plus ancien) ; on passe au suivant sans rien envoyer, plutôt que de le faire sonner une seconde fois. ── */
  function rappelsTour(t, budget, notifier, depuis) {
    const bilan = { envoyes: 0, abandonnes: 0, passes: 0 };
    for (const x of stockage.evenementsRappelsDus(t, Math.max(1, budget))) {
      if (x.debut <= t - MIN) { if (stockage.evenementRappelAbandonner(x.id)) bilan.abandonnes++; continue; }   // il a commencé : un rappel après coup ne sert à rien
      const dep = avantDepart(x.trajet);
      if (depuis > 0 && Number.isSafeInteger(x.rappelA) && x.rappelA <= depuis) { if (stockage.evenementRappelPasser(x.id, prochaine(x.debut, x.rappels, x.tz, t, dep))) bilan.passes++; continue; }
      const reste = Math.max(0, Math.round((x.debut - t) / MIN));
      const c = cal.champsLocaux(x.debut, x.tz), heure = String(c.h).padStart(2, '0') + ':' + String(c.mi).padStart(2, '0');
      const demain = cal.numeroJour(c) > cal.numeroJour(cal.champsLocaux(t, x.tz));
      const quand = x.journee ? (demain ? 'Demain, toute la journée' : 'Aujourd\'hui, toute la journée') : reste <= 0 ? 'Maintenant' : reste < 60 ? 'Dans ' + reste + ' minute' + (reste > 1 ? 's' : '') : (demain ? 'Demain à ' : 'Aujourd\'hui à ') + heure;
      /* l'échéance qui part est-elle celle du DÉPART ? (le trajet et l'avance avant le début, à la minute) — son rappel le dit, avec le trajet et l'heure d'arrivée voulue */
      const hm = (ms) => { const c2 = cal.champsLocaux(ms, x.tz); return String(c2.h).padStart(2, '0') + ':' + String(c2.mi).padStart(2, '0'); };
      const depart = dep !== null && x.rappelA === x.debut - dep * MIN;
      /* le texte du départ (en retard aussi) : le même qu'une réunion — `texteDepart`, une seule fois (`trajet.js`) */
      const quand2 = depart ? texteDepart(x.trajet, x.debut, x.rappelA, t, hm) : quand;
      const texte = x.genre === 'rdv' && x.avec ? quand2 + ' · avec ' + x.avec : quand2;
      const n = stockage.evenementRappelEnvoyer(x.id, { titre: x.titre, texte, suivant: prochaine(x.debut, x.rappels, x.tz, t, dep) });
      /* le côté du rappel (le sien, sinon celui de la conversation d'où il vient, sinon Perso — la règle de la page) : « OP MESSAGES PRO » pour un rappel de l'agenda Pro */
      if (n) { bilan.envoyes++; try { notifier(x.uid, n, x.titre, texte, x.id, { cote: x.cote, conv: x.source ? x.source.conv : null }); } catch (e) { /* la notification est écrite : le push est un plus */ } }
    }
    if (bilan.abandonnes) journal('agenda_rappel_abandonne', { n: bilan.abandonnes });
    if (bilan.passes) journal('agenda_rappel_restauration', { n: bilan.passes });      // un nombre, jamais un événement
    return bilan;
  }

  return { handlers: H, rappelsTour, valider, RAPPELS };
}

module.exports = { creerAgenda, echeance, prochaine, RAPPELS, RAPPELS_MAX, AVEC_MAX, GENRES, REPORTS, ID_EVT, FENETRE_MAX, LISTE_MAX, EVENEMENTS_MAX, TITRE_MAX, LIEU_MAX, NOTE_MAX, DUREE_MAX };
