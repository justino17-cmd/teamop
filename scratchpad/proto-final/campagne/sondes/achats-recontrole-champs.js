// RECONTRÔLE ADVERSE « achats » (18 novembre 2026) : « chercher le même défaut partout » (achats-01). On OUVRE chaque fenêtre et chaque
// champ d'Achats et frais / Mes frais, on recense les <input> (type, clavier) et on TAPE UN DÉCIMAL AU CLAVIER (frappe réelle) dans chaque
// champ qui attend un nombre : la virgule ne doit jamais être avalée. Usage : node achats-recontrole-champs.js [profil=mac] [nuit]
const { L, ouvrirAchats, devenir, toast, CAP, PNG } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await ouvrirAchats({ profil, qui: 'marc', nuit }), p = c.p, E = (f, a) => p.evaluate(f, a);
  const champs = () => E(() => [...document.querySelectorAll('#calque .panneau input, #calque .panneau textarea, #contenu .ax-esti, #contenu input')].filter(e => e.offsetParent && e.type !== 'file' && e.type !== 'checkbox' && e.type !== 'radio' && e.type !== 'hidden').map(e => ({ id: e.id || e.className.slice(0, 20), type: e.type, mode: e.inputMode, ph: (e.placeholder || '').slice(0, 24) })));
  const ouvre = async (sel, nom) => { const ok = await L.toucher(c, sel, { delai: 4000 }); await L.calme(p, 400); const ch = await champs(); console.log('  ' + nom + ' :', JSON.stringify(ch)); return { ok, ch }; };
  const tousNombres = [];
  const verifier = (nom, ch) => { const num = ch.filter(x => x.type === 'number'); tousNombres.push(...num.map(x => nom + ':' + x.id)); v(nom + ' : aucun champ type=number (la virgule française s’avale)', num.length === 0, num); };
  await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats');
  let r = await ouvre('[data-axa="dem"]', 'Nouvelle demande (gérant)'); verifier('dem gérant', r.ch); await L.ranger(p);
  await E(() => { acOnglet = 'demandes'; rendre(); }); await L.calme(p, 300);
  // champ d'estimation SUR la carte (inline)
  const esti = await champs(); const eN = esti.filter(x => /ax-esti/.test(x.id)); console.log('  estimation sur carte :', JSON.stringify(eN));
  verifier('estimation de carte', eN);
  if (eN.length) {   // frappe réelle de « 380,50 »
    const sel = '.ax-esti'; await p.click(sel, { clickCount: 3 }); await p.keyboard.type('380,50', { delay: 15 }); await p.keyboard.press('Tab'); await L.calme(p, 400);
    const val = await E(() => ({ champ: document.querySelector('.ax-esti').value, est: DEM_ACHAT.find(d => d.etat === 'attente').est }));
    v('estimation « 380,50 » tapé : la demande garde 380,5 (pas 38050)', val.est === 380.5, val);
  }
  r = await ouvre('[data-axa^="budget|"]', 'Budget'); verifier('budget', r.ch);
  if (r.ch.some(x => x.id === 'ax-bud')) { await p.fill('#ax-bud', ''); await p.click('#ax-bud'); await p.keyboard.type('450,75', { delay: 15 }); await L.toucher(c, '[data-axa^="budgetok"]'); await L.calme(p, 400);
    const b = await E(() => JSON.stringify(AX.budget)); v('budget « 450,75 » enregistré 450,75', /450\.75/.test(b), b); }
  await L.ranger(p);
  await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 300);
  r = await ouvre(c.doigt && ['iphone', 'android', 'petit'].includes(profil) ? '[data-axa="reglages"]' : '[data-axa="kmtarif"]', 'Réglages / tarif km');
  if (['iphone', 'android', 'petit'].includes(profil)) { r = await ouvre('#calque [data-axa="kmtarif"]', 'Tarif km'); }
  verifier('tarif km', r.ch); await L.ranger(p);
  await devenir(p, 'sm', 'techfrais'); await L.calme(p, 500);
  r = await ouvre('[data-rl="ndf"]', 'Note de frais (technicienne)'); verifier('ndf technicienne', r.ch);
  // la note KM : distance décimale (« 12,5 km »)
  const km = await E(() => [...document.querySelectorAll('#calque .panneau input')].filter(e => e.offsetParent).map(e => e.id));
  console.log('  champs de la note :', JSON.stringify(km));
  await p.fill('#rn-m', ''); await p.click('#rn-m'); await p.keyboard.type('12,5 €', { delay: 15 }); const tape = await E(() => document.getElementById('rn-m').value);
  v('« 12,5 € » tapé au clavier dans « Montant payé » reste « 12,5 € » (le champ ne mange rien)', tape === '12,5 €', tape);
  await L.ranger(p);
  r = await ouvre('[data-axa="dem"]', 'Demande (technicienne)'); verifier('dem technicienne', r.ch);
  await p.fill('#ax-n', ''); await p.click('#ax-n'); await p.keyboard.type('1,5', { delay: 20 });
  v('« 1,5 » tapé au clavier dans « Combien ? » reste « 1,5 » (technicienne)', (await E(() => document.getElementById('ax-n').value)) === '1,5');
  // le technicien voit la même phrase d'erreur que le gérant pour « 1.500 »
  await p.fill('#ax-q', 'Gants de manutention'); await p.fill('#ax-n', ''); await p.click('#ax-n'); await p.keyboard.type('1.500', { delay: 10 });
  await L.toucher(c, '[data-axa^="demok"]'); await L.calme(p, 300); console.log('  « 1.500 » technicienne :', await toast(p));
  await L.ranger(p);
  v('population : des champs ont été recensés', true, tousNombres.length);
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
