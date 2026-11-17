// Contrôle des corrections de la campagne « technicien » (17 novembre 2026) : 01 (pas de phrase « ne peut pas créer » sur les écrans personnels), 03 (confirmer SES heures, jamais celles d'un autre),
// 04 (« Voir mes frais »), 07 (rejoué ailleurs), 08 (nom accessible des deux grands champs). Usage : node technicien-corrections.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }), p = c.p;
  // 01 : aucune note de pied sur les cinq écrans personnels — et on prouve d'abord que la personne a bien une catégorie à moitié ouverte (sans quoi le zéro ne prouve rien)
  const demi = await p.evaluate(() => { const q = eqDe(acteur()); return { terrain: droitForme(q), cats: Object.entries(q.droits.cats).filter(([, d]) => d.v && !(d.c && d.m && d.s)).map(([k]) => k) }; });
  v('01 population : Sophie est un terrain, avec au moins une catégorie à moitié ouverte', demi.terrain === 'terrain' && demi.cats.length > 0, demi);
  for (const r of ['majournee', 'mesheures', 'moncamion', 'absences', 'techfrais']) { await L.aller(p, r); await L.calme(p, 500);
    const n = await p.evaluate(() => document.querySelectorAll('#contenu .droits-note').length);
    v(`01 ${r} : pas de note « ton compte ne peut pas… » (technicien-01)`, n === 0, n); }
  // 04 : le bouton de Ma journée s'appelle comme l'écran
  await L.aller(p, 'majournee'); await L.calme(p, 500);
  const bt = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-go="techfrais"]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  v('04 population : Ma journée a des boutons qui mènent aux frais', bt.length >= 1, bt);
  v('04 aucun « Voir mes notes » (l\'écran s\'appelle « Mes frais »)', !bt.some(t => /Voir mes notes/.test(t)) && bt.some(t => /Voir mes frais/.test(t)), bt);
  await L.capture(c, CAP + `corr-majournee-${profil}-${J}.png`);
  // 03 : confirmer SES heures passe, celles d'un autre jamais
  const r03 = await p.evaluate(() => { const av = JSON.stringify(PAIE.confirmes.tl || null); ttViaPaie('confirme|tl'); return { av, ap: JSON.stringify(PAIE.confirmes.tl || null) }; });
  v('03 contre-épreuve : Sophie ne confirme pas les heures de Thomas', r03.av === r03.ap, r03);
  const r03b = await p.evaluate(() => { delete PAIE.confirmes.sm; ttViaPaie('confirme|sm'); return JSON.stringify(PAIE.confirmes.sm || null); });
  v('03 Sophie confirme ses propres heures', r03b !== 'null', r03b);
  // 08 : le nom accessible des deux champs de la fiche
  await L.aller(p, 'majournee'); await L.toucher(c, '[data-rl="go|inter-x-i2"]'); await L.calme(p, 600);
  const ch = await p.evaluate(() => ['trouve', 'compte'].map(k => { const e = document.querySelector(`#contenu textarea[data-champ="${k}"]`); return e ? (e.getAttribute('aria-label') || '') : null; }));
  v('08 population : les deux champs sont là', ch.every(x => x !== null), ch);
  v('08 chacun porte son nom (Ce que j’ai trouvé / le titre du compte rendu)', /trouvé/.test(ch[0] || '') && (ch[1] || '').length > 3, ch);
  // 07 : rejoué par technicien-parcours-intervention.js (I11c : lien direct sur la fiche, puis « Retour » ; ✗ avant la correction, ✓ après)
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
