// Recontrôle ADVERSE : un bouton ne se tait jamais. Sur chaque écran du technicien (et chaque fiche d'intervention qui est la sienne), chaque lien « data-go » qui mène à un écran
// que sa personne n'a PAS le droit d'ouvrir est relevé, puis touché pour de vrai : il doit mener quelque part ou DIRE pourquoi pas — jamais rien.
// Usage : node technicien-recontrole-liens.js [profil] [nuit=0|1] [qui=sm|kb]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien-recontrole/';
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', qui = process.argv[4] || 'sm', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui, nuit, hash: 'majournee' }), p = c.p;
  const ecrans = ['majournee', 'taches', 'techfrais', 'mesheures', 'moncamion', 'absences'];
  const miennes = await p.evaluate(qui => INTS.filter(i => i.tech === qui).map(i => i.id), qui);
  v('L0 population : la personne a des interventions à elle', miennes.length >= 3, miennes.length);
  for (const i of miennes) ecrans.push('inter-x-' + i);
  let total = 0; const muets = [], vus = new Set();
  for (const r of ecrans) {
    await L.aller(c.p, r); await L.calme(p, 450);
    const liens = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-go], #contenu [data-plein], .barre-bas [data-go]')].filter(e => e.offsetParent).map(e => ({ cible: e.dataset.go || e.dataset.plein, lib: e.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) })));
    for (const l of liens) { total++; const base = l.cible.split('-x-')[0];
      const ferme = await p.evaluate(b => { try { return !droitVoit(b); } catch (e) { return false; } }, base); if (!ferme) continue;
      const cle = r.split('-x-')[0] + '>' + l.cible; if (vus.has(cle)) continue; vus.add(cle);
      await L.aller(c.p, r); await L.calme(p, 300);
      const av = await p.evaluate(() => ({ route, hash: location.hash, toast: (document.getElementById('toast') || {}).textContent || '', pan: !!document.querySelector('#calque .panneau, .panneau') }));
      await p.evaluate(x => { const e = [...document.querySelectorAll('#contenu [data-go], #contenu [data-plein]')].find(y => (y.dataset.go || y.dataset.plein) === x); e && e.click(); }, l.cible); await L.calme(p, 500);
      const ap = await p.evaluate(() => ({ route, hash: location.hash, toast: (document.getElementById('toast') || {}).textContent || '', pan: !!document.querySelector('#calque .panneau, .panneau'), txt: ((document.querySelector('.panneau') || {}).textContent || '').replace(/\s+/g, ' ').trim() }));
      const fait = ap.route !== av.route || ap.hash !== av.hash || (ap.toast && ap.toast !== av.toast) || (ap.pan && !av.pan);
      if (ap.pan && !av.pan) { const m = ap.txt.match(/(.{30})(\d[\d  .,]*\s?€|\bTVA\b|facture|devis|FAC-|DEV-)(.{30})/gi) || []; v(`L3 ${r.split('-x-')[0]} › « ${l.lib} » ouvre une fiche : aucun prix, facture ni devis dedans`, m.length === 0, m.slice(0, 3)); }
      console.log(`   ${r} › « ${l.lib} » (${l.cible}) : écran fermé ; touché → ${fait ? 'RÉPOND ' + JSON.stringify({ route: ap.route, toast: ap.toast, pan: ap.pan, txt: ap.txt.slice(0, 160) }) : 'RIEN'}`);
      if (!fait) muets.push({ ecran: r, lib: l.lib, cible: l.cible }); } }
  console.log('   liens relevés :', total, '| liens vers un écran fermé testés :', vus.size);
  v('L1 population : des liens ont été relevés', total >= 8, total);
  v('L2 aucun lien vers un écran fermé ne reste muet (il mène quelque part ou dit pourquoi pas)', muets.length === 0, muets.slice(0, 6));
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
