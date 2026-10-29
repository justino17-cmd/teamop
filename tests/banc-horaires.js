/* ⛔ L'ÉQUIPE OUVERTE 24 H SUR 24, POUR LES BANCS QUI JOUENT LE TRAVAIL DES AGENTS ET NON LEURS HEURES (26 octobre 2026).
 *
 * Depuis les heures de travail (`server/agents-horaires.js`), un serveur neuf n'a plus d'agent qui agisse la nuit, le week-end ou un jour férié — c'est le réglage par défaut voulu
 * par Justin. Un banc qui démarre le VRAI serveur pour voir un agent répondre, proposer ou relire Stripe ne doit pas dépendre de l'heure à laquelle il tourne (la CI tourne la
 * nuit, le vendredi soir, le dimanche) : il pose CE registre dans son dossier de données AVANT de lancer le serveur. C'est exactement ce que ferait Justin depuis la Tour en
 * réglant « tous les jours, de 00:00 à 24:00, fériés compris ». Les heures elles-mêmes sont gardées par `test-3021`, et par lui seul.
 */
'use strict';
const fs = require('fs'), path = require('path');

const toujours = () => ({ regle: require('../server/agents-horaires').REGLE, entreprise: { jours: [0, 1, 2, 3, 4, 5, 6].map(() => ({ ouvert: true, debut: '00:00', fin: '24:00' })), feries: false }, parAgent: {}, astreinte: ['max', 'theo'], ouvertJusqua: null, maj: { ts: 0, par: 'banc' } });
/* Pose le registre dans le dossier de données `D` d'un serveur qui n'a pas encore démarré. */
function toujoursOuvert(D) { fs.writeFileSync(path.join(D, 'agents-horaires.json'), JSON.stringify(toujours())); }

/* ⛔ L'ANCIEN RÉGLAGE (jusqu'au 28 octobre 2026), POUR LES BANCS QUI JOUENT LES HEURES ET NON LEURS DÉFAUTS. Justin, 28 octobre 2026 : « les agents vont travailler de 8 h à minuit », tous les jours, fériés
 * compris — le défaut du code a changé (`test-3125` le garde). Mais ce que `test-3021`, `test-3122` et leurs voisins gardent est le MÉCANISME (le calendrier de Paris, un férié, un samedi fermé, l'astreinte,
 * la permanence) : il se joue sur un réglage qui FERME quelque chose. C'est exactement le registre qu'un Justin d'avant aurait laissé dans la Tour, avec la règle courante (`regle`) pour qu'aucune migration ne
 * le touche : lundi – vendredi 9 h – 18 h, fériés fermés, Max et Théo d'astreinte, permanence du week-end active. */
const ancien = () => ({ regle: require('../server/agents-horaires').REGLE,
  entreprise: { jours: [0, 1, 2, 3, 4, 5, 6].map(i => ({ ouvert: i < 5, debut: '09:00', fin: '18:00' })), feries: true }, parAgent: {}, astreinte: ['max', 'theo'],
  permanence: { actif: true, agents: ['camille', 'hugo', 'margaux', 'lea'], piliers: ['camille', 'hugo'], debut: '09:00', fin: '18:00' }, ouvertJusqua: null, maj: { ts: 0, par: 'banc' } });
/* Monte les VRAIS horaires sur l'ancien réglage quand le dossier n'en porte pas déjà un (un registre posé par le banc, abîmé ou non, reste tel quel). */
function horairesAncien(HOR, o) {
  const f = path.join(o.DATA_DIR, 'agents-horaires.json');
  if (!fs.existsSync(f)) fs.writeFileSync(f, JSON.stringify(ancien()));
  return HOR(o);
}
module.exports = { toujoursOuvert, toujours, ancien, horairesAncien };
