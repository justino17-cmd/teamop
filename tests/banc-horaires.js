/* ⛔ L'ÉQUIPE OUVERTE 24 H SUR 24, POUR LES BANCS QUI JOUENT LE TRAVAIL DES AGENTS ET NON LEURS HEURES (26 octobre 2026).
 *
 * Depuis les heures de travail (`server/agents-horaires.js`), un serveur neuf n'a plus d'agent qui agisse la nuit, le week-end ou un jour férié — c'est le réglage par défaut voulu
 * par Justin. Un banc qui démarre le VRAI serveur pour voir un agent répondre, proposer ou relire Stripe ne doit pas dépendre de l'heure à laquelle il tourne (la CI tourne la
 * nuit, le vendredi soir, le dimanche) : il pose CE registre dans son dossier de données AVANT de lancer le serveur. C'est exactement ce que ferait Justin depuis la Tour en
 * réglant « tous les jours, de 00:00 à 24:00, fériés compris ». Les heures elles-mêmes sont gardées par `test-3011`, et par lui seul.
 */
'use strict';
const fs = require('fs'), path = require('path');

const toujours = () => ({ entreprise: { jours: [0, 1, 2, 3, 4, 5, 6].map(() => ({ ouvert: true, debut: '00:00', fin: '24:00' })), feries: false }, parAgent: {}, astreinte: ['max', 'theo'], ouvertJusqua: null, maj: { ts: 0, par: 'banc' } });
/* Pose le registre dans le dossier de données `D` d'un serveur qui n'a pas encore démarré. */
function toujoursOuvert(D) { fs.writeFileSync(path.join(D, 'agents-horaires.json'), JSON.stringify(toujours())); }
module.exports = { toujoursOuvert, toujours };
