// Recontrôle : le texte DU BULLETIN de paie de chaque salarié (paieBulletinDoc, ce que « Fiche » affiche en plein écran et ce qu'on remet au salarié) porte-t-il des mots d'échafaudage ?
// Le correcteur a laissé en l'état le pied « Prototype : taux d'exemple… » (décision 06, à soumettre) ; ici on lit TOUT le bulletin, y compris la ligne d'absence maladie (« non simulées »).
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const ECHAF = /prototype|vraie version|pour l.essai|d.exemple|taux d.exemple|\(exemple\)|fictif|fictive|simul[ée]|non simul|démonstration|factice/i;
(async () => {
  const c = await L.ouvrir({ profil: process.argv[2] || 'mac', nuit: process.argv[3] === 'nuit', qui: 'marc' }), p = c.p;
  await X.compta(c, 'fiches'); await L.toucher(c, '[data-paie="calculer"], [data-paie="calc"]'); await p.waitForTimeout(400);
  const res = await p.evaluate(() => PT_GENS.map(k => { let h = ''; try { h = paieBulletinDoc(k); } catch (e) { return { k, erreur: String(e.message) }; } const d = document.createElement('div'); d.innerHTML = h; return { k, n: d.textContent.length, txt: d.textContent.replace(/\s+/g, ' ') }; }));
  console.log('bulletins lus :', res.map(r => r.k + ':' + (r.n || r.erreur)).join(' '));
  for (const r of res) { const m = r.txt ? [...new Set([...r.txt.matchAll(new RegExp(ECHAF.source, 'gi'))].map(x => '…' + r.txt.slice(Math.max(0, x.index - 70), x.index + 90) + '…'))] : []; v(`BUL · bulletin de ${r.k} (${r.n} car.) : aucun mot d’échafaudage`, r.n > 300 && m.length === 0, r.erreur || m); }
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
