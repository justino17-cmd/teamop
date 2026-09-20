/* Ce que coûte un message reçu, selon la taille de la base. Mesuré sur le VRAI op-fs.js.
   ⛔ L'ASSERTION EN TÊTE N'EST PAS DÉCORATIVE : la première version de cette sonde remplissait
   `_miroir` en direct, donc contournait l'index par collection. Les requêtes rendaient ZÉRO
   document et la sonde annonçait 0,00 ms — une amélioration de 200 ms obtenue en ne faisant
   rien. Une mesure de performance qui ne vérifie pas qu'elle mesure quelque chose ment
   toujours dans le sens qui fait plaisir. */
const opFs = require('/home/user/teamop/op-fs.js');

async function mesurer(canaux, parCanal) {
  const F = opFs({ base: 'http://127.0.0.1:1', jeton: 'x', appId: 's' });
  let n = 0;
  for (let c = 0; c < canaux; c++) for (let m = 0; m < parCanal; m++) {
    F._poser('messages\u0000op_companies/ent1/channels/ch' + c + '/messages/m' + m,
      { m: 1000 + m, r: { txt: 'message ' + m, ts: 1000 + m, par: 'u' + (m % 30) } }); n++;
  }
  const q = F.collection('op_companies/ent1/channels/ch0/messages').orderBy('ts', 'asc').limitToLast(300);
  const test = await q.get();
  if (test.size !== Math.min(300, parCanal)) throw new Error('la sonde ne mesure RIEN : ' + test.size + ' documents');
  await q.get();
  const T = 30, t = process.hrtime.bigint();
  for (let i = 0; i < T; i++) await q.get();
  const une = Number(process.hrtime.bigint() - t) / 1e6 / T;
  return { n, une, quinze: une * 15 };
}

(async () => {
  console.log('  documents   1 requête   × 15 écouteurs');
  for (const [c, p] of [[12, 300], [40, 300], [120, 300], [400, 300]]) {
    const r = await mesurer(c, p);
    console.log('  ' + String(r.n).padStart(7) + '   ' + r.une.toFixed(2).padStart(7) + ' ms   '
      + r.quinze.toFixed(0).padStart(5) + ' ms  ' + (r.quinze > 50 ? '⛔ l\'écran se fige' : '✅'));
  }
})();
