/* Outil des bancs qui JOUENT un envoi d'OP GESTION (mailSend, envoiDoc, orgaEnvoyer) : le code de la garde d'envoi, lu
   dans app.html — `boutonDuGeste`, `_envoisEnCours`, `envoiGarde`, `btnOccupe`. Audit apple-design du 21 octobre 2026 :
   ces trois envois passent désormais par `envoiGarde` (un bouton « Envoi… », pas de second départ). Un bac à sable qui
   exécute l'un d'eux doit fournir la garde — la VRAIE, extraite ici en un seul endroit, jamais recopiée dans chaque banc
   (règle du dépôt : « toute garde ajoutée à une fonction qu'un banc extrait doit être fournie à ce banc »).
   Hors d'un clic, `boutonDuGeste()` rend null et `btnOccupe(null)` ne fait rien : la garde n'a besoin d'aucun DOM. */
'use strict';
function blocFonction(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  const j = src.indexOf('\n}\n', i); return j < 0 ? '' : src.slice(i, j + 2);
}
function gardeEnvoi(src) {
  const a = src.indexOf('function boutonDuGeste(');
  const fin = blocFonction(src, 'function envoiGarde(');
  if (a < 0 || !fin) return '';
  const b = src.indexOf(fin, a) + fin.length;
  return src.slice(a, b) + '\n' + blocFonction(src, 'function btnOccupe(el,texte){') + '\n';
}
module.exports = { gardeEnvoi };
