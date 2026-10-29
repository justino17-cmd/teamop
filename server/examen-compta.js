/* LA COMPTA DE MARGAUX À L'EXAMEN (28 octobre 2026) — les VRAIS modules, une source de factures INVENTÉE.
 *
 * Le scénario 1 de l'examen (« Margaux, sur la compta, tu en es où ? ») attend maintenant le POINT RÉEL : l'outil `point_compta`, dont le code écrit les chiffres dans le fil de Margaux. L'équipe d'essai n'a ni Stripe ni
 * client : le point vient d'ici — des factures et des abonnés INVENTÉS (aucun nom, aucune adresse), des montants qu'aucun prompt ne contient, et le vrai `compta-stripe.js` / `agent-compta.js` par-dessus. La conversion
 * d'une facture est une version fictive de celle du serveur : l'examen ne mesure pas la conversion (c'est `test-3163`, la parité avec la Tour), il mesure ce que le MODÈLE fait de l'outil.
 * Les CHIFFRES du point sont distinctifs (`CHIFFRES`) : le scénario vérifie qu'ils ne se trouvent ni dans ce que Margaux dit, ni dans ce que Claude reçoit.
 * Rien ne sort : aucun appel réseau, aucune clé.
 */
'use strict';
const { parisParties, tsParis } = require('./agents-horaires');

const CHIFFRES = ['4 217,50', '4217,50', '4217.5', '362,50', '362,5'];

/* `o` : { agents, conversations, dir, maintenant } → { outilsEquipe, passer } */
module.exports = function comptaPourExamen(o) {
  const maintenant = typeof o.maintenant === 'function' ? o.maintenant : Date.now;
  const p = parisParties(maintenant());
  const sec = (jour, h) => Math.floor(tsParis(p.annee, p.mois, jour, h, 0) / 1000);
  const f = (id, cents, jour, status) => ({ id, status: status || 'paid', currency: 'eur', created: sec(jour, 8), amount_paid: (status || 'paid') === 'paid' ? cents : 0, amount_due: cents, attempted: false,
    status_transitions: (status || 'paid') === 'paid' ? { paid_at: sec(jour, 9) } : {} });
  const liste = [f('in_ex1', 250000, 3), f('in_ex2', 150000, 9), f('in_ex3', 21750, 12), f('in_ex4', 1500, 14, 'open'), f('in_ex5', 1500, 15, 'void')];
  const abos = [], mk = (statut, formule) => ({ id: 'sub_ex' + abos.length, clientNom: '', clientEmail: '', formule, montant: 0, periodicite: 'mois', statut, debut: 0, prochaine: 0 });
  for (let i = 0; i < 9; i++) abos.push(mk('actif', i < 5 ? 'OP GESTION Pro' : i < 8 ? 'OP GESTION Business' : 'OP GESTION Business Premium'));
  abos.push(mk('essai', 'OP GESTION Pro'), mk('impaye', 'OP GESTION Pro'));
  const lire = async chemin => {
    const q = new URLSearchParams(chemin.slice(chemin.indexOf('?') + 1)), gte = +q.get('created[gte]'), lt = +q.get('created[lt]');
    return { data: liste.filter(x => x.created >= gte && x.created < lt), has_more: false };
  };
  const convertir = x => (x.status === 'draft' ? null : { statut: x.status === 'paid' ? 'paye' : x.status === 'open' ? 'ouvert' : x.status === 'void' ? 'annule' : 'autre', montant: (x.amount_paid || x.amount_due) / 100,
    date: ((x.status_transitions && x.status_transitions.paid_at) || x.created) * 1000 });
  const abonnements = async () => ({ ok: true, configured: true, abos, mrr: 362.5, actifs: 10, impayes: 1 });
  return require('./agent-compta')({ agents: o.agents, conversations: o.conversations, fichier: require('./agents-fichier')(o.dir), maintenant,
    periodes: () => ({ ok: true, nombre: 2, prochaine: '' }), relances: () => ({ impayesSuivis: 1, relancesParties: 2, misesEnDemeurePreparees: 0 }),
    stripe: require('./compta-stripe')({ lire, convertir, abonnements, configure: () => true, maintenant }) });
};
module.exports.CHIFFRES = CHIFFRES;
