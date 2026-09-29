/* ══ LE JOUR ET LA NUIT SUIVENT L'APPAREIL — CE FICHIER N'A PLUS QU'UN RÔLE : EFFACER L'ANCIEN CHOIX ══════════════
   Justin, 29 septembre 2026, capture de son iPhone à l'appui : « Sur le site je veux pas le bouton jour nuit, je veux
   que ça soit automatique ». Le bouton ☀︎/☾ (27 septembre au soir) est retiré de toutes les pages ; la feuille suit
   l'appareil (`prefers-color-scheme`) et les pages n'appellent plus ce fichier.
   ⛔ POURQUOI IL EXISTE ENCORE : sw.js le met en cache à l'installation (sa liste ASSETS) — absent, l'installation du
   service worker de l'application échouerait, et sw.js ne se republie pas aujourd'hui (il part avec app.html). Et une
   page restée en cache (navigateur, service worker) le charge encore, avec sa vieille tête qui reposait le mode forcé :
   on retire ce qu'elle a posé, et le choix rangé sur l'appareil, pour que même elle suive l'appareil. */
(function () {
  'use strict';
  try { localStorage.removeItem('teamop_site_mode'); } catch (e) {}
  document.documentElement.removeAttribute('data-theme');
})();
