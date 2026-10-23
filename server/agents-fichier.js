/* LE RANGEMENT DES AGENTS QUI ÉCRIVENT AU COURRIER (23 octobre 2026) — un fichier JSON par sujet, écrit en entier par un fichier
 * temporaire puis un renommage (la règle d'`espaces.json`), et JAMAIS par-dessus un fichier qu'on n'a pas pu lire.
 *
 * Même comportement que `charger`/`ecrire` d'`agents.js` (qui garde les siens : ce fichier-là est le socle, on n'y touche pas pour
 * si peu). Il existe pour que Léa, Camille et les brouillons n'en recopient pas une troisième, quatrième, cinquième version : un
 * registre illisible au démarrage doit se comporter pareil partout — plus rien ne s'écrit par-dessus, et l'appelant le SAIT
 * (`illisible`), parce qu'un « on n'a pas pu lire » n'est pas un « rien ».
 */
'use strict';
const fs = require('fs');
const path = require('path');

module.exports = function fichier(DATA_DIR) {
  const illisibles = new Set();
  function charger(nom, defaut) {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, nom), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return defaut; illisibles.add(nom); return defaut; }
    try {
      const j = JSON.parse(brut);
      if (j === null || typeof j !== 'object' || Array.isArray(j) !== Array.isArray(defaut)) throw new Error('forme');
      return j;
    } catch (e) { illisibles.add(nom); return defaut; }
  }
  function ecrire(nom, valeur) {
    if (illisibles.has(nom)) { console.error('⛔ ' + nom + ' NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
    try {
      const f = path.join(DATA_DIR, nom), tmp = f + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(valeur));
      fs.renameSync(tmp, f);
      return true;
    } catch (e) { console.error(nom + ' non écrit :', e.message); return false; }
  }
  return { charger, ecrire, illisible: nom => illisibles.has(nom) };
};
