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
 *
 * ⛔ UNE LECTURE QUI NE REND PAS UN ENTIER GARDE LE DERNIER DÉCALAGE LU — ELLE NE REMET JAMAIS L'HORLOGE À
 * L'HEURE RÉELLE (17 novembre 2026). Ce greffon faisait `parseInt(lu) || 0` : un fichier lu VIDE valait
 * « décalage nul », c'est-à-dire l'heure réelle — des semaines APRÈS l'horloge que le banc avait posée. Et
 * le fichier se lisait vide : `svc.avancer` le réécrivait par `fs.writeFileSync`, qui TRONQUE puis écrit ;
 * une minuterie du service (le balayeur d'appels passe toutes les secondes) qui demandait l'heure entre les
 * deux croyait que vingt-huit jours venaient de passer — toute sonnerie devenait « manquée », tout appel en
 * cours « perdu ». Relevé par un espion sur 120 passages de test-981 sous charge : 9 passages ont lu le
 * fichier vide, 1 en est tombé (la pile menait de `balayer` à `appelFinir`) ; rejoué à volonté en laissant
 * le fichier vide 1,3 s à chaque avance — c'est, au contrôle près, la mort de la CI du 16 novembre
 * (« Cannot read properties of undefined (reading 'lie') », 39 ✓), la même que celle du 5.
 * Deux gardes, et chacune tient seule : `svc.avancer` (`outils-msg.js`) remplace le fichier d'UN geste
 * (renommage : jamais vide), et ICI un contenu qui n'est pas un entier ne décide de rien.
 * `tests/test-947.js` joue les deux, et la course entière (un lecteur qui ne s'arrête pas, deux mille avances).
 * Ce fichier n'est chargé QUE par les bancs ; le service n'y fait référence nulle part. */
const fs = require('fs');
const f = process.env.OPMSG_HORLOGE_DECALAGE;
if (f) {
  const vrai = Date.now.bind(Date);
  let dernier = 0;   // avant toute lecture réussie : aucun décalage (le banc écrit le fichier AVANT de lancer le service)
  Date.now = () => {
    try { const lu = fs.readFileSync(f, 'utf8'); if (/^-?\d+\s*$/.test(lu)) dernier = parseInt(lu, 10); } catch (e) { /* illisible à cet instant : le dernier décalage lu vaut toujours */ }
    return vrai() + dernier;
  };
}
