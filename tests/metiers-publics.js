/* ══ LES MÉTIERS QUE L'APPLICATION CONNAÎT ET QUE LE SITE N'OUVRE PAS ENCORE ═══════════════════════════════════════════════
   23 octobre 2026 : l'application passe de treize à vingt-trois métiers (`METIERS_ORDRE`, généré depuis
   metiers.json). Le site, le serveur (`METIERS_OK`), la Tour (`MET_L`) et le portail (`METIER_L`) en
   connaissent treize : un autre chantier ouvre les dix nouveaux, pages comprises. En attendant, les bancs qui comparent ces
   pièces à `METIERS_ORDRE` ne doivent ni tomber (la comparaison n'a pas changé de sens) ni se taire (une différence
   inattendue doit continuer de les faire tomber).

   Donc UNE liste NOMMÉE (déclarée dans tests/beta-en-avance.js, qui la rend VÉRIFIABLE : `test-2956`), et une règle : un métier de cette liste est TOLÉRÉ absent des autres pièces — il n'est jamais
   exigé. Le jour où l'autre chantier les ouvre, ils entrent dans les pièces et cette liste se vide ; un métier de la liste
   que TOUTES les pièces connaissent déjà est un oubli, et `ouvertsPartout` le signale.
   ⚠️ Ce n'est pas une exemption générale : tout métier ABSENT de la liste doit être partout, dans le même ordre.            */
'use strict';
const fs = require('fs'), path = require('path');

/* La liste est DÉCLARÉE à un seul endroit : tests/beta-en-avance.js (avec les deux autres écarts de la bêta, et le geste de publication). */
const { PAS_ENCORE_OUVERTS } = require('./beta-en-avance.js');

/* La liste attendue d'une pièce, dans l'ordre de l'application : tous les métiers qu'elle DOIT connaître, plus ceux de la liste
   qu'elle connaît déjà (tolérés, jamais exigés). */
function attendu(ordreApp, piece) {
  return ordreApp.filter(k => PAS_ENCORE_OUVERTS.indexOf(k) < 0 || piece.indexOf(k) >= 0);
}
/* Les métiers de la liste que toutes les pièces connaissent déjà : la liste doit alors s'en défaire. */
function ouvertsPartout(pieces) {
  return PAS_ENCORE_OUVERTS.filter(k => pieces.every(p => p.indexOf(k) >= 0));
}

/* `scripts/site-marine.js` lit `METIERS_ORDRE` dans app.html AU CHARGEMENT pour décider quels packs il dit « prêts » et
   combien il en compte. Les pages du site sont des sorties COMMITTÉES de ce générateur : tant que le site n'ouvre pas les dix
   nouveaux, il doit les voir comme l'application d'hier — sinon « 22 packs préconfigurés » et une page qui diverge du fichier
   publié. Le générateur est donc chargé avec une lecture d'app.html qui retire les métiers de la liste, et RIEN d'autre. */
function chargerGenerateur(racine) {
  const lire = fs.readFileSync;
  const cible = path.join(racine, 'app.html');
  fs.readFileSync = function (p, ...reste) {
    const r = lire.call(fs, p, ...reste);
    if (typeof r === 'string' && path.resolve(String(p)) === cible) {
      return r.replace(/const METIERS_ORDRE=\[([^\]]*)\]/, (m, l) => 'const METIERS_ORDRE=[' + l.split(',').map(x => x.trim()).filter(x => x && PAS_ENCORE_OUVERTS.indexOf(x.replace(/'/g, '')) < 0).join(',') + ']');
    }
    return r;
  };
  try { return require(path.join(racine, 'scripts', 'site-marine.js')); }
  finally { fs.readFileSync = lire; }
}

module.exports = { PAS_ENCORE_OUVERTS, attendu, ouvertsPartout, chargerGenerateur };
