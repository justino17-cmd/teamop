/* SONDE — deux services de banc d'OP MESSAGES sur le MÊME port (17 novembre 2026).
 *
 * `portLibre()` (`tests/outils-msg.js`) rend un port libre À L'INSTANT où on le demande ; le service ne l'écoute qu'un dixième de seconde plus tard. Deux bancs lancés en même
 * temps sur une machine peuvent donc recevoir le même. Avant la correction, `lancerService` rendait alors un service « vivant » dont le processus était MORT (`EADDRINUSE`) :
 * `/health` répondait quand même — c'était le service de l'AUTRE banc. Vu une fois sur 120 passages de test-981 à douze de front : 401 `session_requise` à chaque requête (la
 * session du banc n'existe pas dans la base de l'autre), et le service mort n'avait lu son horloge que quatre fois (ce que fait un service qui meurt sur un port pris).
 *
 * Ici on FORCE la collision : un service A, puis un second lancé sur le port de A.
 *   node scratchpad/sonde-opmessages-collision-port.js
 * Avant la correction : « lancerService a RENDU un service sur le port déjà pris : son processus est MORT (code 1) … et pourtant /health répond ».
 * Depuis : « lancerService a REFUSÉ : … le port … est tenu par un AUTRE service » pour un port imposé ; et pour un port TIRÉ qui se révèle pris, un second essai sur un autre port
 * (c'est `tests/test-947.js` § 4 qui le garde). */
'use strict';
const path = require('path');
const T = require(path.join(__dirname, '..', 'tests', 'outils-msg'));
T.sauterSiSansDependances();
(async () => {
  const A = await T.lancerService({ horloge: true });
  let B = null, refus = null;
  try { B = await T.lancerService({ horloge: true, port: A.port }); } catch (e) { refus = String(e && e.message).split('\n')[0]; }
  if (B) {
    await T.attendre(() => B.sorti() !== null, 5000);
    console.log('lancerService a RENDU un service sur le port déjà pris : son processus est ' + (B.sorti() === null ? 'vivant' : 'MORT (code ' + B.sorti() + ')'));
    console.log('ce que le processus mort a écrit : ' + B.sortie.texte().split('\n').filter(l => /EADDRINUSE|Error/.test(l)).slice(0, 2).join(' | ').slice(0, 300));
    const h = await (await fetch(B.base + '/health')).json();
    console.log('et pourtant `/health` répond ok=' + h.ok + ' sur ce port : c\'est le service A (port ' + A.port + ' = ' + B.port + ')');
    await B.arreter();
  } else console.log('lancerService a REFUSÉ : ' + refus);
  const C = await T.lancerService({ horloge: true, portsDabord: [A.port] });
  console.log('et un port TIRÉ qui se révèle pris (forcé : ' + A.port + ') : le service est relancé sur le port ' + C.port + ', `/health` y rend son identité : ' + ((await (await fetch(C.base + '/health')).json()).sha === C.sha));
  await C.arreter(); await A.arreter();
})();
