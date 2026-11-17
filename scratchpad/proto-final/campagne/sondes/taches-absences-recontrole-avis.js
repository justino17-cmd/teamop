// Recontrôle adverse (17 novembre 2026) : l'avis « Marc a validé / refusé ta demande » que la technicienne lit dans « Mes congés »
// reste lisible sur tous les téléphones. Le texte partageait la ligne avec « Voir au planning › » et « Vu » (196 px, qui ne rétrécissent pas) :
// 12 px de large à 320, un mot par ligne (1 544 px de haut). Aucun écran déjà sondé n'ouvrait cet avis : il faut qu'une décision existe.
// usage : node taches-absences-recontrole-avis.js [profil]   — jour ET nuit ; « N ✓ · M ✗ », sort en 1 si un contrôle tombe.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  for (const profil of (process.argv[2] ? [process.argv[2]] : ['petit', 'android', 'iphone', 'ipad'])) for (const nuit of [false, true]) {
    const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'absences' }); const p = c.p; await L.calme(p, 600); const tag = `${profil}${nuit ? ' nuit' : ' jour'}`;
    // le gérant accorde la demande de Sophie, puis on rouvre l'espace de Sophie (même page : aucun serveur dans le prototype)
    await p.evaluate(() => { const d = DEMANDES_ABS.find(x => x.tech === 'sm'); document.querySelector(`[data-aok="${d.id}"]`).click(); }); await L.calme(p, 500);
    await p.evaluate(() => { sessionFermer(); sessionOuvrir('sm'); aller('absences'); const t = document.getElementById('toast'); if (t) t.remove(); }); await L.calme(p, 700);
    const m = await p.evaluate(() => { const a = document.querySelector('#contenu .a-avis'); if (!a) return null; const b = a.querySelector('.a-avis-c'), r = a.getBoundingClientRect(); return { carte: Math.round(r.width), texte: Math.round(b.getBoundingClientRect().width), haut: Math.round(r.height) }; });
    v(`${tag} : l'avis de décision existe (population)`, !!m, m);
    if (m) { v(`${tag} : le texte de l'avis a au moins 150 px (${m.texte})`, m.texte >= 150, m); v(`${tag} : l'avis ne dépasse pas 220 px de haut (${m.haut})`, m.haut <= 220, m); }
    await L.capture(c, O.CAP + `recontrole-avis-${profil}${nuit ? '-nuit' : ''}.png`);
    await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
