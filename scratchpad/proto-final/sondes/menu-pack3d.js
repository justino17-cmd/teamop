// Le pack 3D (hygiène anti-nuisibles) : coché → le groupe « Hygiène anti-nuisibles (3D) » (gérant : trois lignes ; technicien : Registre
// sanitaire) paraît au menu, dans la feuille et dans la recherche ; décoché → plus rien. Joué par le vrai sélecteur de métiers.
const { L, G3D, lireMenu } = require('./menu-commun.js'), v = L.v;
const noms = async p => (await lireMenu(p)).G.map(g => g.t + '=' + g.L.map(l => l.l).join('|'));
(async () => {
  for (const [qui, voulu] of [['marc', G3D + '=Registre sanitaire|Carte des box|Devis xylophage'], ['sm', G3D + '=Registre sanitaire']]) {
    const c = await L.ouvrir({ profil:'mac', qui }), tag = qui;
    let g0 = await noms(c.p); v(`${tag} : sans le pack 3D, aucun groupe « ${G3D} »`, !g0.some(x => x.startsWith(G3D)), g0);
    await c.p.evaluate(() => mchPoser([...PACKS_ENT, '3d'])); await L.calme(c.p, 500);
    let g1 = await noms(c.p); v(`${tag} : pack 3D coché → ${voulu}`, g1[g1.length - 1] === voulu, g1[g1.length - 1]);
    const r = await c.p.evaluate(() => rcRubriques().map(x => x.l)); v(`${tag} : la recherche et les raccourcis suivent`, r.includes('Registre sanitaire') && (qui === 'sm' || r.includes('Carte des box')), r.slice(-4));
    await L.toucher(c, '#menu a[href="#registre"]'); const e = await c.p.evaluate(() => ({ h1:(document.querySelector('#contenu h1') || {}).textContent, sur:(document.querySelector('#contenu .surtitre') || {}).textContent, on:(document.querySelector('#menu a.on .m-n') || {}).textContent }));
    v(`${tag} : Registre sanitaire s'ouvre, surtitre « ${G3D} », ligne surlignée`, e.h1 === 'Registre sanitaire' && e.sur === G3D && e.on === 'Registre sanitaire', e);
    await c.p.evaluate(() => mchPoser(PACKS_ENT.filter(k => k !== '3d'))); await L.calme(c.p, 500);
    let g2 = await noms(c.p); v(`${tag} : pack 3D décoché → le groupe disparaît du menu`, !g2.some(x => x.startsWith(G3D)), g2);
    const r2 = await c.p.evaluate(() => rcRubriques().map(x => x.l)); v(`${tag} : … et de la recherche`, !r2.includes('Registre sanitaire') && !r2.includes('Carte des box'), r2.slice(-3));
    v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 2)); await L.fin(c);
  }
  // téléphone : la feuille « Menu » du gérant porte le groupe quand le pack est pris
  { const c = await L.ouvrir({ profil:'iphone', qui:'marc' }); await c.p.evaluate(() => mchPoser([...PACKS_ENT, '3d'])); await L.calme(c.p, 400); await L.toucher(c, '#contenu .tt-menu');
    const t = await c.p.evaluate(() => [...document.querySelectorAll('#calque .plus-grp')].map(e => e.textContent.trim())); v('feuille Menu : le groupe 3D est le dernier', t[t.length - 1] === G3D, t);
    await L.ranger(c.p); await c.p.evaluate(() => mchPoser(PACKS_ENT.filter(k => k !== '3d'))); await L.calme(c.p, 400); await L.toucher(c, '#contenu .tt-menu');
    const t2 = await c.p.evaluate(() => [...document.querySelectorAll('#calque .plus-grp')].map(e => e.textContent.trim())); v('feuille Menu : décoché, il disparaît', !t2.includes(G3D), t2); await L.fin(c); }
  // le prototype nu : même chose par l'interrupteur de revue (« Métiers »)
  { const c = await L.ouvrir({ profil:'mac', app:false, qui:null }); await L.toucher(c, '[data-mch="ouvrir"]'); await c.p.evaluate(() => { const k = document.querySelector('[data-mchk="3d"]'); k.click(); }); await L.calme(c.p, 500);
    const g = await noms(c.p); v('prototype nu : « Métiers › 3D » fait paraître le groupe, comme dans l\'application', g[g.length - 1].startsWith(G3D), g[g.length - 1]); await L.fin(c); }
  await L.fermer(); const ko = L.bilan(); process.exit(ko ? 1 : 0);
})();
