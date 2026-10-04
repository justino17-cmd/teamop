/* ══ CE QUE LES ROUTES ET LE PLANIFICATEUR DES RÉUNIONS PARTAGENT — LES NOTIFICATIONS, LEURS TEXTES, LA SÉRIE D'UNE LIGNE ═══════════════════════════════
 *
 * Une notification de réunion (invitation, modification, annulation, rappel) naît à deux endroits : une ROUTE (l'hôte vient d'agir) et le PLANIFICATEUR (l'heure vient). Les deux la
 * composent ici, une seule fois :
 *   · le TEXTE s'écrit dans le fuseau de CELUI QUI LE REÇOIT (« mardi 27 octobre à 14:00 » n'est pas la même heure à Paris et à New York) et dans sa langue d'interface — le français pour
 *     l'instant ;
 *   · l'événement dans l'application part TOUJOURS (le flux, la liste des notifications) ; le PUSH suit les règles du lot 3 (`push.js`) : une personne JOIGNABLE, avec un appareil, jamais
 *     l'auteur du geste, la charge minimale par défaut (le titre et la date ne partent que pour qui a activé l'aperçu), et la charge est RE-JUGÉE à l'instant de partir (`valide`) ;
 *   · ⛔ LA SOURDINE d'une réunion (sa conversation mise en sourdine) coupe les notifications de ses MODIFICATIONS — jamais un rappel que la personne a elle-même choisi, jamais une annulation
 *     (aller à une réunion annulée coûte plus cher que d'être dérangé) ;
 *   · ⛔ un rappel dont l'occurrence a COMMENCÉ ne part pas en push (`valide`), et son `ttl` ne dépasse pas ce qui reste avant le début : un téléphone éteint ne sonne pas à midi pour
 *     une réunion de dix heures.
 * Rien d'ici n'écrit un nom ni un titre dans un journal : `ctx.journaliser` ne reçoit que des nombres.
 */
'use strict';
const cal = require('./calendrier');

const ID_REUNION = /^r_[0-9a-f]{32}$/;
const PUSH_CORPS = {
  reunion_invitation: 'Invitation à une réunion', reunion_modifiee: 'Réunion modifiée', reunion_annulee: 'Réunion annulée', reunion_rappel: 'Rappel de réunion',
};
const REPETE = { quotidienne: 'chaque jour', hebdomadaire: 'chaque semaine', mensuelle: 'chaque mois' };

/* La série d'une ligne de réunion (la forme de `calendrier.js`), que la ligne vienne du stockage (`repetition`) ou du planificateur (`rep`). */
const serieDe = (r) => ({ debut: r.debut, fin: r.fin, tz: r.tz, rep: r.repetition !== undefined ? r.repetition : r.rep, n: r.n || null, jusqua: r.jusqua || null });
const nomAffiche = (p) => (p && ((p.prenom + ' ' + p.nom).trim())) || 'Quelqu\'un';
/* Le fuseau d'une personne (son réglage), sinon celui de la réunion — jamais un nom que `Intl` ne connaît pas. */
const fuseauDe = (personne, repli) => (personne && cal.tzValide(personne.tz)) || cal.tzValide(repli) || 'Europe/Paris';

/* Les textes. `r` : { titre, debut, repetition, tz } ; `p` : la personne qui REÇOIT ; `t` : l'instant dont on parle (la prochaine occurrence, ou la première). */
const texteInvitation = (hote, r, p, t) => nomAffiche(hote) + ' vous a invité à une réunion : ' + cal.dire(t, fuseauDe(p, r.tz)) + '.' + (REPETE[r.repetition] ? ' Elle se répète ' + REPETE[r.repetition] + '.' : '');
const texteModification = (hote, r, p, t, horaire) => horaire
  ? nomAffiche(hote) + ' a changé l\'horaire de la réunion : ' + cal.dire(t, fuseauDe(p, r.tz)) + '.'
  : nomAffiche(hote) + ' a modifié la réunion.';
const texteAnnulation = (hote, r, p, t) => nomAffiche(hote) + ' a annulé la réunion du ' + cal.dire(t, fuseauDe(p, r.tz)) + '.';
/* Un rappel dit CE QUI RESTE à courir, d'après l'horloge — pas le délai choisi : un rappel rattrapé après un arrêt dit la vérité (« dans 9 minutes »), et un rappel d'un jour avant dit « demain »
   quand c'est demain, dans le fuseau de celui qui le lit. */
function texteRappel(r, p, debut, maintenant) {
  const tz = fuseauDe(p, r.tz), reste = debut - maintenant, quand = cal.dire(debut, tz);
  if (reste < 90 * 1000) return 'La réunion commence maintenant — ' + quand + '.';
  if (reste < 3600 * 1000) { const m = Math.max(1, Math.round(reste / 60000)); return 'Commence dans ' + m + ' minute' + (m > 1 ? 's' : '') + ' — ' + quand + '.'; }
  const lj = cal.champsLocaux(maintenant, tz), dj = cal.champsLocaux(debut, tz);
  const demain = cal.formaterDate(cal.ajouterJours(lj, 1)) === cal.formaterDate(dj);
  if (demain) return 'Commence demain — ' + quand + '.';
  if (cal.formaterDate(lj) === cal.formaterDate(dj)) { const h = Math.round(reste / 3600000); return 'Commence dans ' + h + ' heure' + (h > 1 ? 's' : '') + ' — ' + quand + '.'; }
  return 'Commence ' + quand + '.';
}

function creerNotifieur(ctx) {
  const { stockage, hub, horloge } = ctx;
  /* Le push d'une notification déjà créée : la charge est minimale, re-jugée à l'instant de partir. Ne rejette JAMAIS. */
  function pousser({ uid, type, reunion, titre, texte, gid, occurrence }) {
    try {
      if (!ctx.push) return;
      const valide = () => {
        if (type === 'reunion_annulee') return true;   // une annulation part même si la réunion a été supprimée depuis
        if (!stockage.reunionEncore({ id: reunion, uid, occurrence: type === 'reunion_rappel' ? occurrence : undefined, sourdine: type === 'reunion_modifiee' })) return false;
        return type === 'reunion_rappel' ? { ttl: Math.max(0, Math.floor((occurrence - horloge()) / 1000)) } : true;
      };
      ctx.push.pousser(uid, { type: 'reunion', tag: 'reunion:' + reunion, url: '/#reunions/' + reunion, renotify: type === 'reunion_rappel', titre: 'OP MESSAGES', corps: PUSH_CORPS[type] || 'Réunion',
        detail: { titre, corps: texte }, valide }, { gid });
    } catch (e) { /* un push raté ne défait rien */ }
  }
  /* Une notification dans l'application, puis son push. `auteur` : la personne que le texte NOMME (l'hôte) — l'effacement de son compte réécrit alors la notification. → la notification, ou null
     ⛔ RIEN D'UN AUTEUR QUE LE DESTINATAIRE A BLOQUÉ (ou qui l'a bloqué) : la même définition que la messagerie (`contactBloque`, dans les deux sens) — un blocage est personnel, et celui qui harcèle ne
     doit pas continuer par la réunion. Bloquer ne retire PERSONNE de la réunion (la réunion reste dans l'agenda, son flux se met à jour) : « Quitter » est la sortie. Un rappel n'a pas d'auteur, il
     ne passe pas par ici. ⛔ UNE SEULE `reunion_modifiee` non lue par personne et par réunion : la nouvelle remplace l'ancienne (deux cents modifications ne font pas deux cents notifications). */
  function notifier({ uid, type, reunion, titre, texte, auteur }) {
    try {
      if (auteur && stockage.contactBloque(auteur, uid)) return null;
      const n = stockage.notifCreer({ uid, type, titre, texte, cible: reunion, auteur, remplacer: type === 'reunion_modifiee' });
      hub.reveiller({ uids: [uid] });
      pousser({ uid, type, reunion, titre, texte, gid: n.gid });
      return n;
    } catch (e) { return null; }
  }
  return { notifier, pousser };
}

module.exports = { ID_REUNION, PUSH_CORPS, serieDe, nomAffiche, fuseauDe, texteInvitation, texteModification, texteAnnulation, texteRappel, creerNotifieur };
