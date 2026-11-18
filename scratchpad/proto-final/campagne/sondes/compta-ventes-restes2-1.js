// Restes compta-ventes, tour 2 (17 novembre 2026) : une quantité TAPÉE sur une facture à valider multiplie par son nombre.
// Avant : « 2 h » et « 1 000 » étaient acceptés puis comptés pour 1 (« 2 h × 100 € » = 100,00 €), sans un mot ; la nouvelle colonne « Total HT » le rendait visible.
// Contre-épreuve : « 0 », « -2 », « abc », vide, « 1e9 » restent refusés (la quantité d'avant est gardée) ; une ligne préparée par OP GESTION (« 1h30 », prix de la durée entière) garde sa règle.
// Usage : node compta-ventes-restes2-1.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP + `restes2-1-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  await p.evaluate(() => { FACTURES.unshift({ id: 'fx-val', num: '—', cli: 'md', objet: 'Essai quantités · 30/10', lignes: [{ d: 'Nettoyage des filtres', q: '1', pu: 100 }, { d: 'Main-d’œuvre', q: '1h30', pu: 81 }], ht: 0, tva: 10, st: 'avalider', emise: '—', ech: '—' }); });
  await X.fiche(c, 'fx-val');
  const pop = await p.evaluate(() => document.querySelectorAll('[data-fqte]').length);
  L.v('population : deux champs « Qté » sur la facture à valider', pop === 2, pop);
  const tape = async v => { const l = p.locator('[data-fqte="0"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 350); };
  const etat = () => p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-val'); return { q: f.lignes[0].q, qn: f.lignes[0].qn, tot: Math.round(totLigne(f.lignes[0]) * 100), ht: Math.round(htDe(f) * 100), champ: document.querySelector('[data-fqte="0"]').value }; });
  await tape('2 h'); let e = await etat(); L.v('« 2 h » : la ligne totalise 2 × 100 € = 200,00 € (le nombre multiplie, l’unité reste écrite)', e.tot === 20000 && e.q === '2 h', e);
  await tape('1 000'); e = await etat(); L.v('« 1 000 » : mille, pas un (100 000,00 €)', e.tot === 10000000 && e.qn === 1000, e);
  await tape('0,5 L'); e = await etat(); L.v('« 0,5 L » : 50,00 €', e.tot === 5000, e);
  await tape('3'); e = await etat(); L.v('« 3 » : 300,00 € et le total HT de la facture suit (300 + la main-d’œuvre préparée, 81 €)', e.tot === 30000 && e.ht === 30000 + 8100, e);
  for (const v of ['0', '-2', 'abc', '', '12 abc 5 7777777777', '99999999']) { await tape(v); e = await etat(); L.v('« ' + v + ' » est refusé : la quantité d’avant (3) est gardée', e.tot === 30000 && e.champ === '3', e); }
  await tape('1e9'); e = await etat(); L.v('« 1e9 » n’est jamais lu comme un milliard : refusé (une unité qui porte un chiffre est une faute de frappe), la quantité d’avant est gardée — tour 3', e.tot === 30000 && e.qn === 3 && e.q === '3', e);
  const t = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-val'); return Math.round(totLigne(f.lignes[1]) * 100); });
  L.v('la ligne « 1h30 » préparée par OP GESTION garde sa règle (le prix est déjà celui de la durée) : 81,00 €', t === 8100, t);
  await tape('2 h'); await p.evaluate(() => { const e = document.querySelector('.tableau'); e && e.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400);
  const lu = (await X.texte(p, '#contenu .tableau')) + ' ' + (await p.evaluate(() => [...document.querySelectorAll('#contenu .dv-tot')].map(x => x.textContent).join(' '))); L.v('l’écran montre 200,00 € pour « 2 h »', /200,00\s?€/.test(lu.replace(/[  ]/g, ' ')), lu.slice(0, 200).replace(/\n/g, ' | '));
  const dep = await L.deborde(c).catch(() => null); console.log('  débordement :', JSON.stringify(dep));
  await cap('fiche');
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
