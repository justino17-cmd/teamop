// Parcours 15 : de Tâches vers Devis (« Ouvrir dans Devis »), la carte « Choisis dans Tâches », la tâche qui se coche toute seule quand le geste est fait.
// usage : node devis-atelier-parcours-h.js [profil]
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'taches' }), p = c.p; await L.calme(p, 700);
  const dv = await p.evaluate(() => TACHES.filter(t => !t.fait && tCat(t) === 'devis').map(t => ({ id: t.id, t: t.t, lien: t.lien && t.lien.id, but: tBut(t) })));
  console.log('  · tâches « devis » ouvertes :', JSON.stringify(dv));
  v('P15 : population : au moins 2 tâches de la catégorie devis', dv.length >= 2, dv);
  await p.evaluate(() => { document.querySelectorAll('.t-sel').forEach(b => { if (b.getAttribute('aria-pressed') === 'true') b.click(); }); });
  let n = 0; for (const t of dv) { if (await L.toucher(c, `[data-tsel="${t.id}"]`)) n++; }
  v('P15 : on peut choisir chaque tâche de devis (case touchée)', n === dv.length, [n, dv.length]);
  const btn = await p.evaluate(() => { const b = document.querySelector('[data-tsdevis]'); return b ? b.textContent.trim() : ''; });
  v('P15 : la barre de sélection propose « Ouvrir dans Devis »', /Ouvrir dans Devis/.test(btn), btn);
  await L.toucher(c, '[data-tsdevis]'); await L.calme(p, 500);
  const e = await O.lire(p); const carte = await p.evaluate(() => { const k = document.querySelector('.dv-focus'); return k ? { t: k.querySelector('h3').textContent, n: k.querySelectorAll('.dv-tache').length, ouvrir: [...k.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
  v('P15 : on arrive sur Devis avec la carte « Choisis dans Tâches · n » (une ligne par tâche choisie)', e.h1 === 'Devis' && carte && carte.n === dv.length, [e.h1, carte]);
  const l = await O.liste(p); v('P15 : la liste sous la carte montre « Tous » les devis (pas un onglet vide)', l.length >= 3, l.length);
  await L.capture(c, O.CAP + `P15-choisis-dans-taches-${profil}.png`);
  // ouvrir un devis depuis la carte, relancer, revenir : la tâche se coche
  const ouv = await p.evaluate(() => [...document.querySelectorAll('.dv-focus [data-go]')].map(b => b.dataset.go));
  console.log('  · boutons « Ouvrir » de la carte :', JSON.stringify(ouv));
  if (ouv.length) { await L.toucher(c, `.dv-focus [data-go="${ouv[0]}"]`); await L.calme(p, 400); const h = await p.evaluate(() => location.hash); v('P15 : « Ouvrir » mène à la fiche du devis de la tâche', h === '#' + ouv[0], h); }
  await L.aller(p, 'devis'); await L.toucher(c, '[data-dv="focusFin"]'); await L.calme(p, 300); v('P15 : « Fermer » ferme la carte', !(await p.evaluate(() => !!document.querySelector('.dv-focus'))));
  // la relance du devis D-2026-031 coche la tâche « Relancer M. Durand »
  const avant = await p.evaluate(() => TACHES.filter(t => t.lien && t.lien.id === 'D-2026-031').map(t => ({ id: t.id, t: t.t, fait: !!t.fait })));
  await L.aller(p, 'devis-x-D-2026-031'); await L.toucher(c, '[data-dv="relancer|D-2026-031"]'); await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 600);
  const apres = await p.evaluate(() => TACHES.filter(t => t.lien && t.lien.id === 'D-2026-031').map(t => ({ id: t.id, t: t.t, fait: !!t.fait, quand: typeof tQuand === 'function' ? tQuand(t) : '' })));
  console.log('  · tâches liées avant :', JSON.stringify(avant), ' après :', JSON.stringify(apres));
  v('P15 : la tâche « Relancer … » est cochée par la relance (puis une nouvelle, dans 7 jours)', apres.some(t => t.fait) && apres.some(t => !t.fait), apres);
  await L.aller(p, 'taches'); const tt = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
  v('P15 : Tâches dit que la tâche est faite (rien d’ancien resté « en retard »)', !/Relancer M\. Durand pour le devis de la pompe de relevage[^·]{0,40}en retard/.test(tt), tt.slice(0, 300));
  // Échap et la croix ferment chaque fenêtre de la partie
  for (const [nom, route, prep] of [['rapide', 'devis', 'dvNouveau()'], ['dicter', 'devis', 'dvDicter()'], ['client-voit', 'devis-x-D-2026-031', 'dvClient(DEVIS_REG["D-2026-031"])'], ['réponse', 'devis-x-D-2026-031', 'dvReponse(DEVIS_REG["D-2026-031"])'], ['relance', 'devis-x-D-2026-031', 'dvRelancer(DEVIS_REG["D-2026-031"])'], ['envoi', 'devis-x-BR1', 'DEVIS_REG["BR1"].lignes[0][2] = 1500; dvEnvoyer(DEVIS_REG["BR1"])']]) {
    await L.aller(p, route); await p.evaluate(prep); await L.calme(p, 400); const ouv = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
    await p.keyboard.press('Escape'); await L.calme(p, 400); const ferme = !(await p.evaluate(() => !!document.querySelector('#calque .panneau')));
    v('P15 : Échap ferme la fenêtre « ' + nom + ' »', ouv && ferme, [ouv, ferme]);
    await p.evaluate(prep); await L.calme(p, 400); await L.toucher(c, '#calque .x'); await L.calme(p, 300);
    v('P15 : la croix ferme la fenêtre « ' + nom + ' »', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  }
  console.log('err', c.err.length, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
