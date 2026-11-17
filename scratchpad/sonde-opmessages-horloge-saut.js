/* SONDE — l'horloge du service d'OP MESSAGES pendant qu'un banc l'avance : ce qui tuait test-981, rejoué À VOLONTÉ (17 novembre 2026).
 *
 * Ce fichier n'est pas un banc : c'est une ENVELOPPE, chargée dans le processus d'un banc par `NODE_OPTIONS=--require=…`. Elle rejoue, à un endroit choisi et en plus long, ce
 * qu'une machine chargée faisait par hasard — l'ordonnanceur qui interrompt le banc au mauvais moment. Elle n'agit que dans le processus du banc (pas dans le service).
 *
 * ── CONTRE L'OUTIL CORRIGÉ (`svc.avancer` écrit à côté puis renomme ; `lib-horloge-msg.js` garde le dernier décalage lu) ─────────────────────────────────────────────────
 *   SAUT_RANG=3 SAUT_MODE=vide NODE_OPTIONS=--require=$PWD/scratchpad/sonde-opmessages-horloge-saut.js node tests/test-981.js
 *       juste avant le renommage de la RANG-ième avance du service principal, le fichier d'horloge est laissé VIDE 1,3 s (ce que l'ancienne écriture laissait voir, en plus
 *       long : le balayeur du service passe toutes les secondes). Attendu : le banc reste VERT — mesuré aux neuf avances de test-981, 89 ✓ chaque fois.
 *   SAUT_RANG=3 SAUT_MODE=zero …
 *       le fichier porte « 0 » 1,3 s : l'heure RÉELLE, c'est-à-dire l'effet de l'ancien défaut, provoqué exprès. Le banc TOMBE — et c'est le but : on LIT ce que dit sa
 *       chute (« l'appel d'Ana à Ben, dans la base : « manque » … fini +45 s ; l'horloge du banc en est à +7.4 s »). Avances de test-981 : 1 (+10 min), 2 (+1 h), 3 (+6 s, avant
 *       « Ben répond »), 4 (+2 min, avant le débit), 5 (+61 s), 6 (+31 s), 7 (+20 s, avant « Ana raccroche »), 8 (+2 h), 9 (+1 h).
 *
 * ── CONTRE L'OUTIL D'AVANT (le commit a415080 : `svc.avancer` faisait `fs.writeFileSync` sur le fichier ; le banc calait le service APRÈS son démarrage) ───────────────────
 *   Dans un arbre à ce commit (`git worktree add /tmp/avant a415080`, `npm ci` dans `server-msg`), cette même enveloppe copiée à côté :
 *   LENT_RANG=4 NODE_OPTIONS=--require=…/sonde-opmessages-horloge-saut.js node tests/test-981.js
 *       la RANG-ième ÉCRITURE du fichier d'horloge du service principal tronque, attend 1,3 s, puis écrit. Mesuré : rang 4 (avant « Ben répond ») → « le banc est mort :
 *       TypeError: Cannot read properties of undefined (reading 'lie') », 39 ✓ 1 ✗ — la mort de la CI du 16 novembre, au contrôle près ; rang 5 → 81 ✓ 6 ✗ ; rang 6 → 82 ✓ 5 ✗
 *       (les cinq contrôles relevés en local le 16 novembre) ; rang 7 → 85 ✓ 2 ✗ ; rang 8 → 86 ✓ 1 ✗ ; rangs 1, 2, 3, 9, 10 → rien (aucun appel ne court à ces instants).
 *   TARDIF_SERVICE=3 NODE_OPTIONS=--require=… node tests/test-981.js
 *       le calage du service n° 3 (celui de la sonnerie échue) sur l'horloge du banc arrive 1,6 s après son démarrage : son balayeur est déjà passé « dans le futur ».
 *       Mesuré : 86 ✓ 1 ✗ (`age >= 46` faux). Le banc fait maintenant NAÎTRE ses services à l'heure du banc (`decalageInitial`) : il n'y a plus de calage à retarder. */
const fs = require('fs');
if (!process.env.OPMSG_HORLOGE_DECALAGE) {
  const attendre = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);       // la « préemption », rejouée : rien d'autre ne tourne dans le banc pendant ce temps
  const estHorloge = (p) => typeof p === 'string' && p.endsWith('decalage-horloge');
  const renommer = fs.renameSync, ecrire = fs.writeFileSync;

  if (process.env.SAUT_RANG !== undefined) {
    const rang = parseInt(process.env.SAUT_RANG, 10), mode = process.env.SAUT_MODE || 'vide', ms = parseInt(process.env.SAUT_MS || '1300', 10);
    let premier = null, n = 0;
    fs.renameSync = function (de, vers, ...r) {
      if (estHorloge(vers)) {
        if (premier === null) premier = vers;
        if (vers === premier && ++n === rang) {
          if (mode === 'vide') fs.truncateSync(vers, 0); else { ecrire.call(fs, vers + '.saut', '0'); renommer.call(fs, vers + '.saut', vers); }
          attendre(ms);
          console.log('  [SONDE] avance n° ' + n + ' du service principal : son fichier d\'horloge ' + (mode === 'vide' ? 'laissé VIDE' : 'mis à « 0 » (l\'heure réelle)') + ' ' + ms + ' ms');
        }
      }
      return renommer.call(this, de, vers, ...r);
    };
  }

  if (process.env.LENT_RANG !== undefined || process.env.TARDIF_SERVICE !== undefined) {
    const lent = process.env.LENT_RANG === undefined ? null : parseInt(process.env.LENT_RANG, 10), tardif = process.env.TARDIF_SERVICE === undefined ? null : parseInt(process.env.TARDIF_SERVICE, 10);
    const ms = parseInt(process.env.LENT_MS || '1300', 10), msTardif = parseInt(process.env.TARDIF_MS || '1600', 10), vus = new Map();
    fs.writeFileSync = function (p, d, ...r) {
      if (estHorloge(p)) {
        if (!vus.has(p)) vus.set(p, { service: vus.size, n: -1 });
        const e = vus.get(p); e.n++;
        if (lent !== null && e.service === 0 && e.n === lent) {
          fs.truncateSync(p, 0);                                                                // ce que fait l'ouverture avec troncature
          attendre(ms);
          console.log('  [SONDE] écriture n° ' + e.n + ' du fichier d\'horloge du service principal : laissé VIDE ' + ms + ' ms avant d\'écrire ' + String(d));
        }
        if (tardif !== null && e.service === tardif && e.n === 1) {
          attendre(msTardif);
          console.log('  [SONDE] le calage du service n° ' + tardif + ' sur l\'horloge du banc arrive ' + msTardif + ' ms après son démarrage');
        }
      }
      return ecrire.call(this, p, d, ...r);
    };
  }
}
