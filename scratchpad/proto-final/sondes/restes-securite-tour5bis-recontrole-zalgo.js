// RECONTRÔLE ADVERSE du tour 5 bis — le bourrage de signes combinants (le plafond compte des signes, pas des unités) : un titre d'intervention 'T' + 3000 accents, collé dans le champ, enregistré, VU au planning.
// ⛔ 127.0.0.1 seulement.
const L = require('../lib.js'), v = L.v, fs = require('fs'); const OUT = process.env.SORTIE || '/tmp/claude-0/r5/zalgo/'; fs.mkdirSync(OUT, { recursive: true });
(async () => {
  const c = await L.ouvrir({ profil: process.env.PROFIL || 'mac', nuit: false, qui: 'marc', attente: 1500 }), p = c.p; p.on('dialog', d => d.accept().catch(() => {}));
  const pause = ms => L.calme(p, ms);
  await p.evaluate(() => panneauCreer('sm', AUJ, '09:00')); await pause(350);
  await p.locator('#n-titre').click(); await p.keyboard.insertText('Tuyau' + '̸́҉'.repeat(1500) + ' percé'); await pause(200);
  const f = await p.evaluate(() => { const e = document.querySelector('#n-titre'); return { g: nbSignes(e.value), u: e.value.length }; });
  console.log('  · champ : ' + f.g + ' signes, ' + f.u + ' unités');
  await p.locator('[data-action="creerOk"]').first().click(); await pause(700);
  const r = await p.evaluate(() => { const i = INTS[INTS.length - 1]; return { g: nbSignes(i.titre), u: i.titre.length }; });
  v('Z le titre rangé garde un nombre d’unités raisonnable (≤ 1 000)', r.u <= 1000, r);
  const h = await p.evaluate(() => { const cartes = [...document.querySelectorAll('#contenu *')].filter(e => /Tuyau/.test(e.textContent) && !([...e.children].some(x => /Tuyau/.test(x.textContent)))); const e = cartes[0]; if (!e) return null; const r = e.getBoundingClientRect(); return { n: cartes.length, h: Math.round(r.height), w: Math.round(r.width), haut: Math.round(r.top), sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }; });
  console.log('  · carte du titre au planning :', JSON.stringify(h));
  await p.screenshot({ path: OUT + 'planning-zalgo.png' });
  v('Z la ligne du titre ne dépasse pas 120 px de haut', !h || h.h <= 120, h);
  L.bilan(); await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.stack.slice(0, 500)); process.exit(1); });
