// Tour 5 : un relevé numérique TAPÉ touche par touche suit la même règle que le collage, à la sortie du champ et à l'enregistrement ; plus, deux plafonds de ligne de facture armés par des cas dédiés.
// usage : node interventions-restes-tour5-frappe.js <profil> [nuit] → « N ✓ · M ✗ », code 1 si un contrôle tombe
const I = require('./interventions-outils.js'), L = I.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit }); const p = c.p, v = L.v;
  await p.evaluate(() => { fiche('i1').metier = 'clim'; }); await I.devenir(c, 'sm', 'inter-x-i1');
  const S = '[data-releve="Soufflage"]';
  v('population : le champ Soufflage existe', (await p.locator(S).count()) === 1, 0);
  const lire = () => p.evaluate(s => { const e = document.querySelector(s); return { champ: e.value, mem: (fiche(e.dataset.id).releves || {}).Soufflage, toast: (document.getElementById('toast') || {}).textContent || '' }; }, S);
  const poser = async av => { await p.evaluate(([s, a]) => { const e = document.querySelector(s); e.value = a; e.dispatchEvent(new Event('change', { bubbles: true })); const T = document.getElementById('toast'); if (T) T.textContent = ''; }, [S, av]); };
  const frappe = async t => { await p.locator(S).click({ clickCount: 3 }); await p.keyboard.press('Delete'); await p.keyboard.type(t, { delay: 25 }); const pendant = await lire(); await p.keyboard.press('Tab'); await L.calme(p, 200); return { pendant, apres: await lire() }; };
  await poser('14');
  // frappe réelle : rien n'est retiré pendant la saisie, et ce qui n'est pas UN nombre est refusé à la sortie
  for (const t of ['10 - 12', '10-12', '10 – 12', '10 à 12', '3 sur 18', '12x3', '1 2 3', '10-', '10 -', '12 / 14']) {
    const r = await frappe(t);
    v(`« ${t} » : le champ garde ce qu'on tape pendant la frappe`, r.pendant.champ === t && r.pendant.mem === '14', r.pendant);
    v(`« ${t} » : refusé à la sortie, ancienne valeur 14 rendue au champ et à la fiche`, r.apres.champ === '14' && r.apres.mem === '14', r.apres);
    v(`« ${t} » : une phrase le dit`, /Un seul nombre/.test(r.apres.toast), r.apres.toast);
  }
  for (const [t, att] of [['-5', '-5'], ['12,5', '12,5'], ['1200', '1200'], ['−5,5', '-5,5']]) { const r = await frappe(t); v(`frappe « ${t} » → ${att}`, r.apres.champ === att && r.apres.mem === att, r.apres); }
  { const r = await frappe('1 200'); v('frappe « 1 200 » → 1200, DIT', r.apres.champ === '1200' && r.apres.mem === '1200' && /Lu 1 200/.test(r.apres.toast.replace(/[  ]/g, ' ')), r.apres); }
  { const r = await frappe('12 kg'); v('frappe « 12 kg » → 12, DIT', r.apres.champ === '12' && r.apres.mem === '12' && /un nombre/.test(r.apres.toast), r.apres); }
  await poser('14');
  // la fonction qui enregistre valide aussi : le champ n'a pas encore perdu le focus, on termine par le code (sans change)
  await p.evaluate(s => { const e = document.querySelector(s); e.focus(); e.value = '10-12'; e.dispatchEvent(new Event('input', { bubbles: true })); }, S);
  v('saisie en cours (sans change) : rien d\'enregistré', (await lire()).mem === '14', await lire());
  await p.evaluate(() => { ACTIONS.terminer(document.querySelector('[data-action="terminer"]')); }); await L.calme(p, 400);
  const fin = await p.evaluate(() => (fiche('i1').releves || {}).Soufflage);
  v('« Terminer » avec « 10-12 » en cours : jamais 1012 ni 10-12 enregistré', fin === '14', fin);
  await L.capture(c, I.CAP + `tour5-frappe-${profil}${nuit ? '-nuit' : ''}.png`);
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
