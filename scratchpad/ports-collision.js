/* ══ DEUX BANCS REÇOIVENT-ILS LE MÊME PORT « LIBRE » ? (16 novembre 2026) ═══════════════════════════════════════════════════════════
 *
 * N processus tirent chacun K ports par la fonction `portLibre` du fichier d'outils donné, comme autant de bancs lancés ensemble, et
 * RESTENT EN VIE jusqu'à ce que tous aient fini (leurs réservations avec eux). Combien de ports sont tenus par DEUX processus ?
 *   avant (`git show a415080:tests/outils-msg.js`, le port du système sans réservation) : 246 sur 2 000, et 11 processus sur 20 tirent deux fois le même ;
 *   après (`portLibre` réserve) : 0 et 0.
 *   node scratchpad/ports-collision.js "$PWD/tests/outils-msg.js" [N=20] [K=100] */
const { spawn } = require('child_process');
const [, , outils, N = '20', K = '100', role] = process.argv;
if (role === 'enfant') {
  const T = require(outils);
  (async () => { const l = []; for (let i = 0; i < Number(K); i++) { l.push(await T.portLibre()); await new Promise(r => setTimeout(r, 2)); } console.log(JSON.stringify(l)); setInterval(() => {}, 1000); process.on('SIGTERM', () => process.exit(0)); })();   // reste EN VIE (ses réservations avec lui) jusqu'à ce que le parent ait toutes les listes
} else {
  const jobs = [], enfants = [];
  for (let i = 0; i < Number(N); i++) jobs.push(new Promise(res => { let s = ''; const e = spawn(process.execPath, [__filename, outils, N, K, 'enfant'], { stdio: ['ignore', 'pipe', 'inherit'] }); enfants.push(e); e.stdout.on('data', d => { s += d; if (s.includes('\n')) res(JSON.parse(s.trim().split('\n').pop())); }); }));
  Promise.all(jobs).then(listes => {
    for (const e of enfants) e.kill('SIGTERM');
    const vu = new Map(); let partages = 0, memes = 0;
    listes.forEach((l, i) => { if (new Set(l).size !== l.length) memes++; for (const p of new Set(l)) { if (vu.has(p) && vu.get(p) !== i) partages++; else vu.set(p, i); } });
    console.log(N + ' processus × ' + K + ' ports : ' + listes.flat().length + ' ports tirés, ' + partages + ' tirés par DEUX processus différents, ' + memes + ' processus ont tiré deux fois le même');
  });
}
