// Compréhension : relève le TEXTE de chaque écran, volet et fenêtre de l'Accueil, des Statistiques et de l'Historique, et cherche les restes d'échafaudage
// (« prototype », « pour l'essai », « exemple », « démo »), l'anglais et les sigles. Le texte complet va dans le dossier temporaire, pour être LU.
// node accueil-mots.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v, fs = require('fs');
const ECHAFAUDAGE = /prototype|pour l.essai|dans ce prototype|exemple|d.démo|démo\b|fictif|lorem|todo|test\b/i;
const ANGLAIS = /\b(dashboard|download|loading|submit|cancel|save|undefined|null|NaN|\[object)\b/i;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p, tout = [];
  const lire = async (nom) => { const t = await p.evaluate(() => { const z = document.querySelector('#calque .panneau'); return { page: document.querySelector('#contenu').innerText, volet: z ? z.innerText : '' }; }); tout.push({ nom, ...t }); return t; };
  await L.aller(p, 'accueil'); await lire('accueil');
  await L.toucher(c, '[data-creer="1"]'); await p.waitForTimeout(700); const fen = await p.evaluate(() => { const f = [...document.querySelectorAll('#calque [role=dialog], #calque > *')].filter(e => e.offsetParent || getComputedStyle(e).position === 'fixed').map(e => e.innerText).join('\n'); return f; }); tout.push({ nom: 'fenêtre « Nouvelle intervention »', page: '', volet: fen }); await L.ranger(p);
  await L.toucher(c, '[data-tache="t1"]'); await lire('accueil › volet tâche'); await L.ranger(p);
  await L.aller(p, 'statistiques'); await p.evaluate("stPer='mois'; stK=ST_FIN; stFiltreTech='tout';"); await L.aller(p, 'statistiques'); await lire('statistiques');
  for (const d of ['fac', 'enc', 'ints', 'devis', 'paie', 'tech-kb', 'cli-md']) { await L.aller(p, 'statistiques'); await L.toucher(c, `[data-stdet="${d}"]`); await lire('statistiques › ' + d); await L.ranger(p); }
  await L.aller(p, 'statistiques'); await L.toucher(c, '[data-stbilan="1"]'); await lire('statistiques › bilan PDF'); await L.ranger(p);
  await L.aller(p, 'statistiques'); await L.toucher(c, '[data-strelctr="c1"]'); await lire('statistiques › renouvellement'); await L.ranger(p);
  await p.evaluate("stPer='annee'"); await L.aller(p, 'statistiques'); await lire('statistiques 12 mois'); await p.evaluate("stPer='mois'");
  await L.aller(p, 'historique'); await lire('historique'); await L.toucher(c, '[data-hj="j45"]'); await lire('historique › volet'); await L.ranger(p);
  await L.toucher(c, '[data-hexport="1"]'); await lire('historique › export'); await L.ranger(p);
  fs.writeFileSync(O.CAP + `mots-${profil}.txt`, tout.map(x => `\n######## ${x.nom}\n${x.page.replace(/\n{2,}/g, '\n')}\n---- volet/fenêtre ----\n${x.volet.replace(/\n{2,}/g, '\n')}`).join('\n'));
  v('population : au moins 12 textes relevés', tout.length >= 12, tout.length);
  for (const x of tout) { const t = x.page + '\n' + x.volet; const e = t.match(ECHAFAUDAGE), a = t.match(ANGLAIS); v(`${x.nom} : aucun reste d'échafaudage${e ? ' → « ' + t.slice(Math.max(0, e.index - 50), e.index + 60).replace(/\s+/g, ' ') + ' »' : ''}`, !e); v(`${x.nom} : aucun mot anglais / technique visible`, !a, a && a[0]); }
  v('aucune erreur JavaScript', c.err.filter(e => !/hl-ecran|Failed to load/.test(e)).length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
