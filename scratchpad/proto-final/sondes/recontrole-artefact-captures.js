// RECONTRÔLE — CAPTURES À REGARDER (17 novembre 2026) : l'entrée réelle de l'artefact (sans ?app=1, dans un cadre), puis le message « le téléchargement n'est pas
// disponible ici » avec le texte à copier (pont absent), sur ordinateur et téléphone, jour et nuit. Les images vont hors dépôt.
const P = require('./recontrole-artefact-pose.js'), { lib: L, v } = P;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/recontrole-artefact';
(async () => {
  for (const [profil, nuit] of [['mac', false], ['iphone', true], ['ipad', false], ['android', true]]) {
    const c = await P.ouvrirHote({ profil, app: false, nuit }, { pont: false });
    await L.calme(c.p, 800); await c.hote.screenshot({ path: `${CAP}/entree-${profil}-${nuit ? 'nuit' : 'jour'}.png` });
    await c.p.evaluate(() => vhCsvFlotte()); await c.p.waitForTimeout(700);
    const z = await c.p.evaluate(() => { const q = document.getElementById('sortie-carte'); if (!q) return null; const r = q.getBoundingClientRect(); const b = document.getElementById('barre-bas'), rb = b && getComputedStyle(b).display !== 'none' ? b.getBoundingClientRect() : null; return { r: [r.left, r.top, r.right, r.bottom].map(Math.round), barre: rb ? Math.round(rb.top) : null, W: innerWidth, H: innerHeight, texte: q.innerText.replace(/\s+/g, ' ').slice(0, 120), choisi: String(getSelection()).length }; });
    v(`${profil} ${nuit ? 'nuit' : 'jour'} : la carte « pas disponible » est là, dans l'écran, sans recouvrir la barre du bas, texte sélectionné`, !!z && z.r[0] >= 0 && z.r[2] <= z.W && z.r[3] <= z.H && (!z.barre || z.r[3] <= z.barre + 1) && z.choisi > 20, z);
    await c.hote.screenshot({ path: `${CAP}/pasdispo-${profil}-${nuit ? 'nuit' : 'jour'}.png` });
    await L.fin(c);
  }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ERREUR SONDE', e); try { await L.fermer(); } catch (x) {} process.exit(2); });
