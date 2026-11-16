/* ══ L'HORLOGE ESPIONNE : QUAND LE SERVICE D'OP MESSAGES LIT-IL UN DÉCALAGE QUI N'EST PAS UN NOMBRE ? (16 novembre 2026) ══════════
 *
 * C'est `tests/lib-horloge-msg.js` TELLE QU'ELLE ÉTAIT (une lecture illisible valait « pas de décalage »), plus une ligne de journal
 * à chaque lecture du fichier de décalage qui ne rend pas un nombre : l'heure, le processus, ce qui a été lu, et qui demandait l'heure.
 * Elle a établi la cause des chutes de `test-981` sous charge : 30 lectures VIDES sur 80 passages (entre la troncature et l'écriture
 * du `writeFileSync` d'`avancer()`), presque toutes depuis le balayeur des appels — qui finissait alors l'appel en cours.
 * Depuis que le décalage se pose par renommage : 0 lecture vide sur 80 passages, même charge.
 *
 * Mode d'emploi (un MIROIR de l'arbre, pour ne rien toucher au dépôt) :
 *   M=$(mktemp -d) && mkdir $M/tests && ln -s "$PWD/server-msg" $M/server-msg \
 *     && cp tests/outils-msg.js tests/test-981.js $M/tests/ && cp scratchpad/horloge-espion-msg.js $M/tests/lib-horloge-msg.js
 *   ESPION_JOURNAL=$M/espion.jsonl bash scratchpad/charge-banc.sh $M/tests/test-981.js 4 20 12 ; wc -l $M/espion.jsonl
 * Pour REVOIR le défaut : remettre dans `$M/tests/outils-msg.js` l'écriture directe (`fs.writeFileSync(fichierDecalage, …)`). */
const fs = require('fs');
const f = process.env.OPMSG_HORLOGE_DECALAGE;
if (f) {
  const vrai = Date.now.bind(Date);
  Date.now = () => {
    let d = 0, brut = null, err = null;
    try { brut = fs.readFileSync(f, 'utf8'); d = parseInt(brut, 10) || 0; } catch (e) { err = String(e.code || e); }
    if (err || !/^-?\d+$/.test(String(brut).trim())) {
      const qui = new Error().stack.split('\n').slice(2, 6).map(l => l.trim().replace(/^at /, '').replace(/\(.*\/(server-msg\/[^)]*)\)/, '($1)')).join(' < ');
      try { fs.appendFileSync(process.env.ESPION_JOURNAL, JSON.stringify({ t: vrai(), pid: process.pid, brut, err, qui }) + '\n'); } catch (e) { /* pas de journal : on n'espionne pas */ }
    }
    return vrai() + d;
  };
}
