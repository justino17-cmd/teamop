// Pour chaque tuile de l'Accueil : où mène-t-elle, et le nombre est-il le même là-bas ? Captures dans le dossier temporaire.
const O = require('./accueil-outils.js'), L = O.L;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' });
  const cas = [
    ['creer', '[data-creer="1"]'], ['kjour', '[data-kdash="jour"]'], ['krec', '[data-kdash="rec"]'], ['kenc', '[data-kdash="enc"]'], ['kcontrats', '.kpi[data-go="contrats"]'],
    ['pans', '[data-pdx="achat|pans|"]'], ['demande1', '[data-axa="goach|demandes|da1"]'], ['notes', '[data-axa="goach|notes"]'], ['afact', '[data-kdash="afacturer"]'], ['aplan', '.ligne-clic[data-go="planning"]'], ['stock', '.ligne-clic[data-go="stock"]'] ];
  for (const [nom, sel] of cas) {
    await L.aller(c.p, 'accueil'); await L.calme(c.p, 300);
    const ok = await L.toucher(c, sel, { delai: 5000 }); await c.p.waitForTimeout(700);
    const e = await O.etat2(c.p);
    const txt = await c.p.evaluate(() => { const m = document.querySelector('#contenu'); return (m ? m.innerText : '').replace(/\s+/g, ' ').slice(0, 500); });
    console.log('\n##', nom, 'ok=' + ok, JSON.stringify(e)); console.log('   ', txt);
    await L.capture(c, O.CAP + `dest-${nom}-${profil}.png`, false);
    await L.ranger(c.p);
  }
  console.log('ERR', c.err); await L.fin(c); await L.fermer();
})().catch(e => { console.error(e); process.exit(1); });
