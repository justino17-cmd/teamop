// Constat pas à pas : aperçu d'un PDF joint dans le composeur de la Boîte mail et le bouton Retour (couche du module non comptée dans l'historique : #pdfv n'est pas #overlay).
// PROFIL, NUIT. Rend les états entre chaque geste et une capture (dossier cap/retour-restes3-recontrole).
const M = require('../../sondes/mail-commun.js'), C = require('../../sondes/retour-commun.js'), L = C.L, v = C.v;
const PROFIL = process.env.PROFIL || 'iphone', NUIT = !!process.env.NUIT;
const fs = require('fs'), path = require('path');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/retour-restes3-recontrole'; fs.mkdirSync(CAP, { recursive: true });
const E = p => p.evaluate(() => { const r = window.R(); const a = r.querySelector('.app'); const o = r.querySelector('#overlay'); return { h: location.hash, n: history.length, st: history.state, ov: o ? o.className + ' | ' + (o.textContent || '').replace(/\s+/g, ' ').slice(0, 80) : null, pdf: !!r.querySelector('#pdfv'), vue: a && a.getAttribute('data-view') }; });
(async () => {
  const c = await M.entrer({ profil: PROFIL, nuit: NUIT, qui: 'marc' }), p = c.p;
  await L.aller(p, 'clients'); await L.aller(p, 'boiteMail'); await M.pret(p, 6000);
  await p.evaluate(() => window.R().querySelector('#btnCompose').click()); await p.waitForTimeout(700);
  const pdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF');
  const [fc] = await Promise.all([p.waitForEvent('filechooser', { timeout: 4000 }), p.evaluate(() => window.R().querySelector('#cAttBtn').click())]);
  await fc.setFiles({ name: 'devis-test.pdf', mimeType: 'application/pdf', buffer: pdf }); await p.waitForTimeout(900);
  await p.evaluate(() => window.R().querySelector('.att-pv').click()); await p.waitForTimeout(900);
  console.log('0 aperçu ouvert', JSON.stringify(await E(p))); await M.cap(c, 'pdf-' + PROFIL + (NUIT ? '-nuit' : '') + '-0-apercu');
  await C.retour(p); console.log('1 Retour', JSON.stringify(await E(p))); await M.cap(c, 'pdf-' + PROFIL + (NUIT ? '-nuit' : '') + '-1-retour');
  await C.retour(p); console.log('2 Retour', JSON.stringify(await E(p))); await M.cap(c, 'pdf-' + PROFIL + (NUIT ? '-nuit' : '') + '-2-retour');
  await C.retour(p); console.log('3 Retour', JSON.stringify(await E(p)));
  await M.fin(c); await L.fermer(); process.exit(0);
})().catch(async e => { console.log('ÉCHEC', e && e.stack || e); try { await L.fermer(); } catch (x) {} process.exit(2); });
