/* ESPION — le service d'OP MESSAGES lit-il parfois son fichier d'horloge ILLISIBLE (vide, absent, autre chose qu'un entier) ? Chargé par `NODE_OPTIONS=--require=…` AVANT
 * `tests/lib-horloge-msg.js` (c'est `scratchpad/charge-banc-opmessages.sh` qui le pose, par passage, quand on lui donne ESPION=…).
 *
 * C'est lui qui a établi la cause de l'instabilité de test-981 (17 novembre 2026). `svc.avancer` réécrivait le fichier par `fs.writeFileSync` (qui tronque PUIS écrit) et le
 * greffon faisait `parseInt(lu) || 0` : un fichier lu vide valait l'heure RÉELLE. Sur 120 passages à douze de front, neuf ont lu le fichier vide, et pour celui qui est tombé la
 * pile disait tout : `balayer` (appels.js) → `appelFinir` — le balayeur croyait que vingt-huit jours venaient de passer et finissait l'appel « perdu ».
 * Depuis la correction (le fichier est remplacé d'un geste, un contenu illisible garde le dernier décalage) : 0 lecture illisible sur 78 089, en 60 passages sous la même charge.
 *
 * Il ne change RIEN à ce que le service lit : il enveloppe `fs.readFileSync` (le greffon l'appelle par `fs.readFileSync(...)`, donc il voit l'enveloppe), rend la valeur du vrai,
 * et note dans `ESPION_JOURNAL` chaque lecture du fichier d'horloge qui n'est pas un entier — avec la pile de QUI demandait l'heure — puis, à la sortie du processus, combien de
 * lectures il a vues (un service tué avant sa fin n'écrit pas cette ligne : le total est un minimum, les lectures illisibles, elles, sont écrites sur le coup). */
const fs = require('fs'), path = require('path');
const f = process.env.OPMSG_HORLOGE_DECALAGE, j = process.env.ESPION_JOURNAL;
if (f && j) {
  const lire = fs.readFileSync, ajouter = fs.appendFileSync, racine = path.join(__dirname, '..') + path.sep;
  let lectures = 0;
  fs.readFileSync = function (p, ...r) {
    let v, leve = null;
    try { v = lire.call(this, p, ...r); } catch (e) { leve = e; }
    if (p === f) {
      lectures++;
      if (leve || !/^-?\d+\s*$/.test(String(v))) {
        const pile = String(new Error().stack).split('\n').slice(2, 12).map(s => s.trim().replace(/^at /, '').split(racine).join('').replace(/node:internal[^)]*/, 'interne')).join(' < ');
        try { ajouter.call(fs, j, JSON.stringify({ pid: process.pid, lectures, lu: leve ? '(' + (leve.code || 'illisible') + ')' : String(v).slice(0, 40), reel: new Date().toISOString(), pile }) + '\n'); } catch (e) { /* le diagnostic ne casse rien */ }
      }
    }
    if (leve) throw leve;
    return v;
  };
  process.on('exit', () => { try { ajouter.call(fs, j, JSON.stringify({ pid: process.pid, fin: true, lectures }) + '\n'); } catch (e) { /* rien */ } });
}
