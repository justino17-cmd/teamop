/* Le service gelé (SIGSTOP) pendant qu'il attend OP GESTION : la porte ferme-t-elle (503) quand le gel dépasse son budget ?
   Même réglage que test-944 (relecture 250 ms), budget 800 ms puis 5000 ms. Le gel tombe pendant l'appel à OP GESTION (rendu lent de 300 ms). */
const T = require(require('path').join(__dirname, '..', 'tests', 'outils-msg'));
(async () => {
  for (const budget of [800, 5000]) {
    const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Martin', actif: true } });
    const svc = await T.lancerService({ urlGestion: og.url, config: { pulsationMs: 400, presenceGraceMs: 300, balayageMs: 150, beta: { relectureMs: 250, timeoutMs: budget } } });
    const res = [];
    try {
      const c0 = T.client(svc.base); const r0 = await c0.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' }); res.push('sans gel ' + r0.code);
      for (let k = 0; k < 3; k++) {
        og.delaiMs = 300;
        const c = T.client(svc.base);
        const p = c.post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-1234' });
        await T.dort(120);
        process.kill(svc.enfant.pid, 'SIGSTOP');
        await T.dort(1200);
        process.kill(svc.enfant.pid, 'SIGCONT');
        const r = await p; res.push('gel 1,2 s : ' + r.code + (r.j && r.j.error ? ' ' + r.j.error : ''));
        og.delaiMs = 0;
      }
    } finally { try { process.kill(svc.enfant.pid, 'SIGCONT'); } catch (e) {} await svc.arreter(); await og.fermer(); }
    console.log('budget ' + budget + ' ms → ' + res.join(' · '));
  }
})().catch(e => { console.error('mort :', e); process.exit(1); });
