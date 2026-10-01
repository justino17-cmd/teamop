/* Horloge DÉCALABLE pour le VRAI service d'OP MESSAGES lancé par un banc (`--require`).
 *
 * Pourquoi : l'échéance d'une session (30 jours), la fenêtre de modification d'un message (15 min), un
 * message éphémère (24 h au moins), un lien d'invitation — aucun ne se joue « au chronomètre » (un banc
 * qui attend 15 minutes ne tourne plus). On avance l'horloge DU PROCESSUS : le banc écrit un nombre de
 * millisecondes dans le fichier désigné par `OPMSG_HORLOGE_DECALAGE`, et `Date.now()` rend l'heure
 * réelle plus ce décalage. Le service capture `Date.now` au démarrage (`horloge: Date.now`) : le
 * greffon doit donc passer AVANT lui, ce que fait `--require`.
 * ⚠️ Les minuteries (`setInterval`) restent sur l'horloge MONOTONE : seules les dates avancent — c'est
 * exactement ce qu'on veut (le balayeur tourne, et trouve des messages « échus »).
 * Ce fichier n'est chargé QUE par les bancs ; le service n'y fait référence nulle part. */
const fs = require('fs');
const f = process.env.OPMSG_HORLOGE_DECALAGE;
if (f) {
  const vrai = Date.now.bind(Date);
  Date.now = () => { let d = 0; try { d = parseInt(fs.readFileSync(f, 'utf8'), 10) || 0; } catch (e) {} return vrai() + d; };
}
