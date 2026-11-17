// Recontrôle adverse (17 novembre 2026) — parcours 2 : chaque tâche qui mène à autre chose (devis, facture, contrat, intervention, commande, client) : la fiche, le lien, l'arrivée, le retour.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v, CAP = O.CAP + 'recontrole/';
const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
(async () => {
  const c0 = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'taches' }); await L.calme(c0.p, 500);
  const ids = await c0.p.evaluate(() => TACHES.filter(x => x.lien || x.type === 'commande' || x.inter).map(x => ({ id: x.id, t: x.t.slice(0, 40), lien: x.lien ? x.lien.t : x.type, fait: !!x.fait }))); 
  console.log('population :', ids.length, JSON.stringify(ids));
  v(`E2 ${profil}: il y a des tâches liées à regarder (${ids.length})`, ids.length >= 6);
  let c = c0;
  for (const it of ids) {
    await O.neuf(c, 'taches'); const p = c.p;
    await p.evaluate(id => { const t = TACHES.find(x => x.id === id); if (t.fait) document.querySelector('[data-tonglet=faites]').click(); tDetail(id); }, it.id); await L.calme(p, 400);
    const f = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, liens: [...document.querySelectorAll('#calque [data-tvoir]')].map(b => b.dataset.tvoir + ' | ' + b.textContent.replace(/\s+/g, ' ').trim().slice(0, 50)) }));
    if (!f.liens.length) { console.log(`  · ${it.id} (${it.lien}) : aucun lien « Ouvrir » dans la fiche`, f.h2); v(`E2 ${profil} ${it.id} : la fiche s'ouvre`, !!f.h2); continue; }
    const cible = f.liens[0].split(' | ')[0];
    await p.evaluate(() => document.querySelector('#calque [data-tvoir]').click()); await L.calme(p, 700);
    const a = await p.evaluate(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent, long: document.getElementById('contenu').innerText.length, retour: [...document.querySelectorAll('#contenu a, #contenu button, #contenu .retour')].filter(e => /^‹|Retour|Tâches/.test((e.textContent || '').trim())).map(e => e.textContent.trim().slice(0, 40)).slice(0, 3) }));
    console.log(`  · ${it.id} ${it.lien} → ${cible} : ${JSON.stringify(a)}`);
    v(`E2 ${profil} ${it.id} (${it.lien}) : le lien arrive sur une page qui a un contenu`, a.long > 80 && !!a.h1, a);
    await L.capture(c, CAP + `e2-${profil}${nuit ? '-nuit' : ''}-${it.id}.png`);
    // le retour
    const r = await p.evaluate(() => { const b = [...document.querySelectorAll('[data-retour], #ret, .tete-tel a, a.logo, button')].find(e => /^‹ ?(Retour|Tâches)|Retour aux tâches|‹ Tâches/i.test((e.textContent || '').trim()) && e.offsetParent); if (b) { b.click(); return b.textContent.trim().slice(0, 40); } return null; }); await L.calme(p, 600);
    const b = await p.evaluate(() => ({ hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent }));
    console.log(`      retour par « ${r} » : ${JSON.stringify(b)}`);
    v(`E2 ${profil} ${it.id} : un retour est offert et ramène à « Tâches » (${r})`, !!r && /Tâches/.test(b.h1 || ''), { r, b });
  }
  v(`E2 ${profil} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
