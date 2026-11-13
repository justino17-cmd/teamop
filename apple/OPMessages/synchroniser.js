#!/usr/bin/env node
/* Fabrique la page que l'application embarque : OPMessages/Web/index.html.
 *
 * La source est `apercu/prototype-op-messages.html`, qui charge le module de courrier (`opcourrier.js`) à côté d'elle. Dans une application,
 * on veut UN seul fichier : ce script recopie la page et y met le module EN LIGNE, à la place de sa balise. Rien d'autre ne change.
 *
 *   node apple/OPMessages/synchroniser.js            écrit Web/index.html
 *   node apple/OPMessages/synchroniser.js --verifier  ne touche à rien ; sort en 1 si Web/index.html n'est plus à jour
 *
 * ⛔ Web/index.html ne se modifie JAMAIS à la main : on corrige le prototype, puis on relance ce script (tests/test-3299.js le vérifie). */
'use strict';
const fs = require('fs'), path = require('path');
const DEPOT = path.join(__dirname, '..', '..');
const SOURCE = path.join(DEPOT, 'apercu', 'prototype-op-messages.html');
const MODULE = path.join(DEPOT, 'apercu', 'opcourrier.js');
const SORTIE = path.join(__dirname, 'OPMessages', 'Web', 'index.html');
const BALISE = '<script src="opcourrier.js"></script>';

function fabriquer() {
  const page = fs.readFileSync(SOURCE, 'utf8'), module_ = fs.readFileSync(MODULE, 'utf8');
  if (page.split(BALISE).length !== 2) throw new Error('la page source doit charger opcourrier.js une fois, et une seule, par ' + BALISE);
  if (/<\/script/i.test(module_)) throw new Error('opcourrier.js contient « </script » : il ne peut pas être mis en ligne tel quel');
  const entete = '<!-- FABRIQUÉ par apple/OPMessages/synchroniser.js depuis apercu/prototype-op-messages.html : ne pas modifier ici. -->\n';
  return page.replace('<!doctype html>\n', '<!doctype html>\n' + entete).replace(BALISE, () => '<script>\n' + module_ + '\n</script>');
}
module.exports = { fabriquer, SORTIE };

if (require.main === module) {
  const neuf = fabriquer();
  if (process.argv.includes('--verifier')) {
    const actuel = fs.existsSync(SORTIE) ? fs.readFileSync(SORTIE, 'utf8') : '';
    if (actuel !== neuf) { console.error('Web/index.html n’est plus à jour : relancer « node apple/OPMessages/synchroniser.js ».'); process.exit(1); }
    console.log('Web/index.html est à jour (' + neuf.length + ' caractères).');
  } else {
    fs.mkdirSync(path.dirname(SORTIE), { recursive: true });
    fs.writeFileSync(SORTIE, neuf);
    console.log('écrit : ' + path.relative(DEPOT, SORTIE) + ' (' + neuf.length + ' caractères)');
  }
}
