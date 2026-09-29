/* ══ LE JOUR ET LA NUIT SUIVENT L'APPAREIL — CE FICHIER N'A PLUS QU'UN RÔLE : EFFACER L'ANCIEN CHOIX ══════════════
   Justin, 29 septembre 2026, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux
   que ça soit automatique ». Le bouton ☀︎/☾ (27 septembre au soir) est retiré de toutes les pages ; la feuille suit
   l'appareil (`prefers-color-scheme`) et les pages n'appellent plus ce fichier.
   ⛔ POURQUOI IL EXISTE ENCORE : une page restée en cache (navigateur, service worker) le demande encore. Le service
   worker de l'application sert sa copie d'abord et ne la remplace QUE par une réponse réussie (un 404 ne se range
   jamais) ; à chaque nouvelle version, il reprend de l'ancien cache tout ce qui manque. Supprimer ce fichier, c'est
   donc garder POUR TOUJOURS l'ancienne copie, celle qui démasquait le bouton ; tant qu'il existe, la première demande la
   remplace par celle-ci, qui retire le mode forcé posé par la vieille tête et le choix rangé sur l'appareil.
   ⚠️ Ce n'est PAS l'installation du service worker qui en dépend (sa liste ASSETS se charge ressource par ressource : un
   fichier absent n'empêche rien) — c'était écrit ici à tort le 29 septembre (relecture adverse du soir). Et la garde qui
   ne dépend d'aucun cache est dans les feuilles : `.mode, .coin-mode { display: none !important }`. */
(function () {
  'use strict';
  try { localStorage.removeItem('teamop_site_mode'); } catch (e) {}
  document.documentElement.removeAttribute('data-theme');
})();
