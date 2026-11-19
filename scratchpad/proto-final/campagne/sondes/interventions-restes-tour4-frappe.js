// Frappe RÉELLE, caractère par caractère, dans un relevé numérique : une plage tapée ne doit jamais s'enregistrer comme un seul nombre (« 10 - 12 » → 1012).
// usage : node interventions-restes-tour4-frappe.js <profil> [nuit] → « N ✓ · M ✗ »
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  await p.evaluate(() => { fiche('i1').metier = 'clim'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  const S = '[data-releve="Soufflage"]';
  const lire = () => p.evaluate(s => { const e = document.querySelector(s); return { champ: e.value, mem: (fiche(e.dataset.id).releves || {}).Soufflage }; }, S);
  const frappe = async t => { await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = ''; e.dispatchEvent(new Event('input', { bubbles: true })); }, S); await p.locator(S).click(); await p.keyboard.type(t, { delay: 30 }); return lire(); };
  const refus = ['10 - 12', '10-12', '10 – 12', '10 à 12', '3 sur 18', '12x3', '1 2 3'];
  for (const t of refus) { const r = await frappe(t); console.log('  · frappe', JSON.stringify(t), '→', JSON.stringify(r)); v(`frappe « ${t} » : jamais fondu en un seul nombre`, !(/^\d+$/.test(r.champ) && r.champ.replace(/\D/g, '') === t.replace(/\D/g, '') && t.replace(/\D/g, '').length > 2), r); }
  for (const [t, att] of [['-5', '-5'], ['12,5', '12,5'], ['1200', '1200']]) { const r = await frappe(t); v(`frappe « ${t} » → ${att}`, r.champ === att, r); }
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
