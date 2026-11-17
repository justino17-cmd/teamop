// « ‹ Retour » d'une fiche d'intervention, après un retour du navigateur : liste → fiche → retour navigateur → liste → fiche → « ‹ Retour ».
// Isolé des autres parcours : une session neuve (marc), aucun changement de personne.
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac'; const c = await L.ouvrir({ profil, qui: 'marc' }); const p = c.p, v = L.v; const tap = s => L.toucher(c, s, { delai: 4000 }); const ev = (f, a) => p.evaluate(f, a);
  const lire = async nom => { const e = await L.etat(p); const x = await ev(() => ({ histo: JSON.stringify(histo), label: (document.querySelector('[data-rl="retour"], [data-retour]') || {}).textContent, hist: history.length })); console.log('  ·', nom, JSON.stringify({ hash: e.hash, h1: e.h1.slice(0, 40), ...x })); return { e, x }; };
  await L.aller(p, 'interventions'); await tap('[data-filtreint="tout"]'); await lire('liste');
  await tap('[data-go="inter-x-i4"]'); await lire('fiche (1re ouverture)');
  await tap('[data-rl="retour"], [data-retour="1"]'); let r = await lire('après « Retour » (cas simple)'); v('« ‹ Retour » simple : ramène à la liste', r.e.h1 === 'Interventions', r.e);
  await tap('[data-go="inter-x-i4"]'); await p.goBack(); await L.calme(p, 600); r = await lire('après retour du NAVIGATEUR'); v('retour du navigateur : ramène à la liste', r.e.h1 === 'Interventions', r.e);
  await tap('[data-filtreint="tout"]'); await tap('[data-go="inter-x-i4"]'); const avant = await lire('fiche (2e ouverture, après retour navigateur)');
  await tap('[data-rl="retour"], [data-retour="1"]'); await p.waitForTimeout(900); r = await lire('après « Retour » (2e)');
  v('R6 « ‹ Retour » ramène à la liste après un retour du navigateur', r.e.h1 === 'Interventions', { avant: avant.x, apres: r.e.hash });
  console.log('erreurs', c.err.slice(0, 3)); const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('PLANTÉ', e.message); try { await L.fermer(); } catch (x) {} process.exit(2); });
