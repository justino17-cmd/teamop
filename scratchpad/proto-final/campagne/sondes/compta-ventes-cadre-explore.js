// Exploration du CADRE plein écran de la Comptabilité côté ventes : ce que montre « Ventes et encaissements », ce que fait chaque ligne,
// et si les chiffres sont ceux d'OP GESTION. Ne conclut rien : sert à écrire la carte des écrans et les contrôles de la liaison.
// usage : node compta-ventes-cadre-explore.js [profil] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L, v = L.v;
// montant lu dans un texte français (« 3 045,00 € ») -> centimes ; null si rien ne se lit
const cts = t => { const m = String(t || '').replace(/[\s\u00a0\u202f]/g, '').match(/(\d+)(?:,(\d+))?/); return m ? parseInt(m[1], 10) * 100 + Math.round(parseFloat('0.' + (m[2] || '0')) * 100) : null; };
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const f = await X.cadreOuvert(c); v('V0 le cadre de la Comptabilité est ouvert', !!f); if (!f) { await L.fermer(); process.exit(L.bilan() ? 1 : 2); }
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-accueil.png`);
  const gAcc = await L.gestes(f, 'body'); console.log('gestes de l’accueil du cadre :', gAcc.length); v('V1 population : l’accueil du cadre offre des gestes (' + gAcc.length + ')', gAcc.length > 0);
  await f.evaluate(() => { try { aller('ventes'); } catch (e) {} }); await p.waitForTimeout(700);
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-ventes.png`);
  const g = await L.gestes(f, '#contenu'); console.log('gestes de « Ventes et encaissements » :', g.length); g.forEach(x => console.log('  ', x.balise, '|', x.lib, '|', x.data, '|', x.l + '×' + x.h));
  v('V2 population : « Ventes et encaissements » offre des gestes (' + g.length + ')', g.length > 0);
  v('V3 chaque geste porte un nom (' + g.filter(x => !String(x.lib || '').trim()).length + ' sans nom)', g.every(x => String(x.lib || '').trim()));
  const lignes = await f.evaluate(() => [...document.querySelectorAll('#contenu tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
  console.log('lignes :'); lignes.forEach(l => console.log('  ', l));
  const kp = await f.evaluate(() => [...document.querySelectorAll('#contenu .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
  console.log('KPI :', kp);
  const codes = await f.evaluate(() => { const b = [...document.querySelectorAll('#contenu .kpi b')].map(e => e.textContent); return { kpi: b.map(t => [...t].map(ch => ch.charCodeAt(0) > 127 || ch === ' ' ? 'U+' + ch.charCodeAt(0).toString(16) : ch).join('')), eur1475: [...eur(1475)].map(ch => ch.charCodeAt(0).toString(16)).join(' '), eur3045: [...eur(3045)].map(ch => ch.charCodeAt(0).toString(16)).join(' ') }; });
  console.log('CODES :', JSON.stringify(codes));
  const hote = await p.evaluate(() => ({ du: FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0), nb: FACTURES.length }));
  console.log('OP GESTION : à recevoir', hote.du, 'factures', hote.nb);
  // OP GESTION fait foi : on relit ses factures et on compare chaque chiffre du cadre (population comptée avant de croire un zéro)
  const H = await p.evaluate(() => { const a = FACTURES.filter(x => x.num !== '—' && x.st !== 'annulee' && x.st !== 'avoir');
    const n = st => a.filter(x => (Array.isArray(st) ? st : [st]).includes(x.st)).length;
    return { nums: a.map(x => x.num).sort(), reste: Math.round(FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0) * 100),
      enc: Math.round(ENCAISSEMENTS.filter(e => cpOct(e.d)).reduce((s, e) => s + e.ttc, 0) * 100), ht: Math.round(FACTURES.filter(x => cpOct(x.emise) && x.num !== '—').reduce((s, x) => s + (x.st === 'avoir' ? -x.ht : htDe(x)), 0) * 100),
      payees: n('payee'), encaisser: n(['envoyee', 'partielle']), retard: n('retard') }; });
  const rows = await f.evaluate(() => [...document.querySelectorAll('#contenu tr[data-fac]')].map(tr => tr.getAttribute('data-fac')).sort());
  v('V4 population : le cadre liste des factures (' + rows.length + ') et OP GESTION en a ' + H.nums.length, rows.length > 0 && H.nums.length > 0);
  v('V5 le cadre liste exactement les factures d’OP GESTION (mêmes numéros)', JSON.stringify(rows) === JSON.stringify(H.nums), { cadre: rows, hote: H.nums });
  const kpi = k => (kp.find(t => t.toLowerCase().startsWith(k.toLowerCase())) || '');
  v('V6 « Reste à encaisser » du cadre = ce que doivent les clients dans OP GESTION', cts(kpi('Reste à encaisser').replace(/^Reste à encaisser/i, '')) === H.reste, { cadre: kpi('Reste à encaisser'), hote: H.reste });
  v('V7 « Encaissé en octobre » du cadre = les encaissements d’octobre d’OP GESTION', cts(kpi('Encaissé en octobre').replace(/^Encaissé en octobre/i, '')) === H.enc, { cadre: kpi('Encaissé en octobre'), hote: H.enc });
  v('V8 « Facturé en octobre » du cadre = le hors taxes émis en octobre dans OP GESTION', cts(kpi('Facturé en octobre').replace(/^Facturé en octobre/i, '')) === H.ht, { cadre: kpi('Facturé en octobre'), hote: H.ht });
  const pil = await f.evaluate(() => [...document.querySelectorAll('#contenu button[data-cmpt^="vf|"]')].map(b => b.innerText.replace(/\s+/g, ' ').trim()));
  const nb = lib => { const m = pil.find(t => t.startsWith(lib) && /\(\d+\)/.test(t));   /* la tuile « En retard 1 touche pour les voir » commence par le même mot : seul le filtre porte un nombre entre parenthèses */ const r = m && /\((\d+)\)/.exec(m); return r ? +r[1] : null; };
  v('V9 les filtres comptent comme OP GESTION (« À encaisser » du cadre = envoyées + en retard, « Payées » = payées, « Toutes » = leur somme)', nb('Payées') === H.payees && nb('À encaisser') === H.encaisser + H.retard && nb('En retard') === H.retard && nb('Toutes') === H.nums.length && nb('Payées') + nb('À encaisser') === nb('Toutes'), { cadre: pil, hote: { payees: H.payees, envoyees: H.encaisser, retard: H.retard, toutes: H.nums.length } });
  // ouvre la première ligne
  const ligne = await f.$('#contenu tr[data-fac]'); if (ligne) { await ligne.click(); await p.waitForTimeout(700); await L.capture(c, X.CAP + `cadre-${profil}-${qui}-facture.png`);
    const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 700) : ''; }); console.log('panneau :', pan);
    v('V10 la première ligne ouvre le panneau de SA facture', pan.includes(await ligne.getAttribute('data-fac')), pan.slice(0, 120)); }
  else v('V10 une ligne de facture existe pour l’ouvrir', false);
  console.log('erreurs', c.err.slice(0, 5));
  v('V11 aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
