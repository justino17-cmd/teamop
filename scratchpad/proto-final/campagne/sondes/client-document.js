// Espace client : le document plein écran (facture, devis) — « Lire en grand », « Télécharger », fermeture, pas d'« Envoyer » pour le client.
// node client-document.js [profil]  → « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./client-outils.js'), L = O.L, v = L.v, fs = require('fs');
const profil = process.argv[2] || 'iphone';
(async () => {
  const c = await O.client({ profil, cli: 'md', ec: 'factures' }); const p = c.p;
  await L.toucher(c, '[data-ec="fpdf|f144"]'); let d = await O.dessus(p);
  v('le document FAC-2026-0144 s’ouvre en plein écran', /FAC-2026-0144|Facture/i.test(d.doc), d.doc);
  const barre = await p.evaluate(() => [...document.querySelectorAll('#docplein .dp-barre button')].map(b => (b.getAttribute('aria-label') || b.textContent).trim()));
  v('le client n’a pas le bouton « Envoyer » (c’est le bureau qui envoie)', !barre.some(x => /Envoyer/.test(x)), JSON.stringify(barre));
  v('le client a « Télécharger » et une croix de fermeture', barre.some(x => /Télécharger/.test(x)) && barre.some(x => /Fermer/.test(x)), JSON.stringify(barre));
  const z0 = await p.evaluate(() => document.querySelector('#docplein .doc-feuille').style.zoom);
  await L.toucher(c, '#docplein .dp-zoom'); const z1 = await p.evaluate(() => ({ z: document.querySelector('#docplein .doc-feuille').style.zoom, t: document.querySelector('#docplein .dp-zoom').textContent, w: document.querySelector('#docplein').scrollWidth, cw: document.querySelector('#docplein').clientWidth }));
  v('« Lire en grand » change le zoom et le libellé du bouton', c.doigt ? (z1.z !== z0 && /entière/.test(z1.t)) : true, JSON.stringify({ z0, z1 }));
  await L.toucher(c, '#docplein .dp-zoom');
  let tel = null; p.once('download', dl => { tel = dl; }); await L.toucher(c, '#docplein [data-pdfdl]'); await p.waitForTimeout(900);
  const nom = tel ? tel.suggestedFilename() : '';
  v('« Télécharger » produit un fichier PDF nommé d’après la facture', !!tel && /\.pdf$/i.test(nom) && /FAC-2026-0144/.test(nom), nom || 'aucun téléchargement');
  if (tel) { const f = O.CAP + 'tel-' + nom; await tel.saveAs(f); const o = fs.readFileSync(f); v('le PDF téléchargé est un vrai PDF (%PDF, > 1 Ko)', o.slice(0, 4).toString() === '%PDF' && o.length > 1000, o.length + ' octets'); }
  await L.capture(c, O.CAP + `doc-${profil}-facture.png`);
  await L.toucher(c, '#docplein [data-dpfermer]'); d = await O.dessus(p); v('la croix ferme le document', !d.doc, d.doc);
  // un devis déjà accepté : « Voir »
  await p.evaluate(() => { RL_CLI.cli = 'vp'; EC.tab = 'devis'; rendre(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-dv^="pdf|"]'); d = await O.dessus(p); v('« Voir » le devis accepté ouvre le document', /D-2026-034|Devis/i.test(d.doc), d.doc); await O.nettoyer(p);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3)); await L.fin(c);
  const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
