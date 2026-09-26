/* ══ AVANT / APRÈS, EN TEMPS — plusieurs passages de perf-lenteur.js par version, médianes ═══════════════════════
   Un chrono seul ment (la machine, le ramasse-miettes, l'ordre) : on alterne les versions (A, B, A, B…) pour que la
   charge de la machine pèse pareil des deux côtés, et on garde la médiane de chaque mesure.
   ⛔ Machine CALME exigée (règle du dépôt : un navigateur fantôme à 85 % fait tomber les bancs de temps) — la charge
   est relevée avant chaque passage et imprimée.
   Usage : node scratchpad/perf-avant-apres.js <base.json> <avant.html> <après.html> [passages=3] [ralenti=4] */
const path = require('path'), fs = require('fs'), os = require('os'), { spawnSync } = require('child_process');
const [BASE, AV, AP, N_, R_] = process.argv.slice(2); const N = +(N_ || 3), R = +(R_ || 4);
const med = a => { const b = a.filter(x => x != null && !isNaN(x)).sort((x, y) => x - y); return b.length ? b[Math.floor(b.length / 2)] : null; };
const res = { avant: [], apres: [] };
for (let i = 0; i < N; i++) for (const [cle, src] of [['avant', AV], ['apres', AP]]) {
  const charge = os.loadavg()[0].toFixed(2);
  const etiq = `${cle}-${i}`;
  const r = spawnSync('node', [path.join(__dirname, 'perf-lenteur.js'), BASE, String(R), etiq], { env: { ...process.env, SOURCE: src }, encoding: 'utf8', timeout: 600000 });
  const f = (r.stdout.match(/→ (\S+resultat-[^\s]+\.json)/) || [])[1];
  if (!f || !fs.existsSync(f)) { console.log(`passage ${etiq} : MORT (${(r.stderr || '').slice(0, 200)})`); continue; }
  const j = JSON.parse(fs.readFileSync(f, 'utf8')); j.charge = charge; res[cle].push(j);
  console.log(`passage ${etiq} (charge ${charge}) : premier écran ${Math.round(j.ouverture.premierEcran)} ms · save ${Math.round(j.save.save)} · fiche ${Math.round(j.intervention.ouvrir)} · clore ${Math.round(j.intervention.clore)}`);
}
const lignes = [['premier écran', j => j.ouverture.premierEcran], ['styles à l’ouverture', j => j.ouverture.styles], ['mise en page à l’ouverture', j => j.ouverture.miseEnPage],
  ['save()', j => j.save.save], ['ouvrir une intervention', j => j.intervention.ouvrir], ['clore une intervention', j => j.intervention.clore]];
const vues = Object.keys((res.avant[0] || res.apres[0] || { ecrans: {} }).ecrans);
for (const v of vues) lignes.push(['écran ' + v, j => (j.ecrans[v] || {}).t]);
console.log(`\n══ médianes sur ${res.avant.length} + ${res.apres.length} passages, processeur ×${R} ══`);
for (const [nom, f] of lignes) {
  const a = med(res.avant.map(f)), b = med(res.apres.map(f));
  const pct = a && b ? Math.round((b - a) / a * 100) : null;
  console.log(`  ${nom.padEnd(30)} ${String(a == null ? '—' : Math.round(a)).padStart(6)} ms → ${String(b == null ? '—' : Math.round(b)).padStart(6)} ms  ${pct == null ? '' : (pct > 0 ? '+' : '') + pct + ' %'}`);
}
fs.writeFileSync(path.join(path.dirname(BASE), `avant-apres-x${R}.json`), JSON.stringify(res, null, 1));
