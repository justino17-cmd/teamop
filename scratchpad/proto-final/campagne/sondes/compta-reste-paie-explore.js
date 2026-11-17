// Exploration de la Paie (Comptabilité › Paie) : jusqu'où une personne peut-elle aller en n'utilisant QUE les boutons ? Imprime l'état à chaque pas.
const X = require('./compta-reste-outils.js'), L = X.L;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', qui: 'marc' }), p = c.p;
  const etat = () => p.evaluate(() => ({ verrou: !!PAIE.verrou, calc: !!PAIE.calc, valide: !!PAIE.valide, distribue: !!PAIE.distribue, compta: !!PAIE.compta, dsn: !!PAIE.dsn, ouverts: PT_GENS.reduce((s, k) => s + paieVariables(k).ouverts.length, 0), nonVal: PT_GENS.reduce((s, k) => s + paieVariables(k).nonValidees, 0), sig: Object.keys(PAIE.signales), etapes: paieEtapes(PT_GENS.map(paieVariables)).map(e => (e.ok ? '✓' : '·') + e.k) }));
  const dit = async lib => { console.log('—', lib, JSON.stringify(await etat()), '| toast:', await X.toasts(p)); };
  await X.compta(c, 'paiemois'); await dit('départ');
  await L.toucher(c, '[data-paie="verrouiller"]'); await dit('Verrouiller octobre (trop tôt)');
  await L.toucher(c, '[data-paie="validertout"]'); await dit('Valider ce qui est en règle');
  // le relevé de Tom (erreur signalée)
  await L.toucher(c, '[data-paie="releve|tl"]'); console.log('relevé Tom :', (await X.panneau(p)).replace(/\n/g, ' · ').slice(0, 700));
  const bt = await p.evaluate(() => [...document.querySelectorAll('#calque button')].map(b => b.dataset.paie || b.dataset.pt || b.dataset.ptc || b.textContent.trim().slice(0, 30)));
  console.log('boutons du relevé :', JSON.stringify(bt));
  await L.toucher(c, '#calque [data-paie="corriger|tl"]'); console.log('corriger :', (await X.panneau(p)).replace(/\n/g, ' · ').slice(0, 600));
  console.log('boutons :', JSON.stringify(await p.evaluate(() => [...document.querySelectorAll('#calque button, #calque input, #calque textarea')].map(b => (b.id || '') + ':' + (b.dataset.paie || b.dataset.pt || b.dataset.ptc || b.textContent.trim().slice(0, 30))))));
  await L.capture(c, X.CAP + 'mac-paie-corriger.png');
  console.log('erreurs', c.err.slice(0, 3));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
