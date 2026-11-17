// Exploration du CADRE plein écran de la Comptabilité côté ventes : ce que montre « Ventes et encaissements », ce que fait chaque ligne,
// et si les chiffres sont ceux d'OP GESTION. Ne conclut rien : sert à écrire la carte des écrans et les contrôles de la liaison.
// usage : node compta-ventes-cadre-explore.js [profil] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  const f = await X.cadreOuvert(c); if (!f) { console.log('cadre absent'); await L.fermer(); return; }
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-accueil.png`);
  const gAcc = await L.gestes(f, 'body'); console.log('gestes de l’accueil du cadre :', gAcc.length);
  await f.evaluate(() => { try { aller('ventes'); } catch (e) {} }); await p.waitForTimeout(700);
  await L.capture(c, X.CAP + `cadre-${profil}-${qui}-ventes.png`);
  const g = await L.gestes(f, '#contenu'); console.log('gestes de « Ventes et encaissements » :', g.length); g.forEach(x => console.log('  ', x.balise, '|', x.lib, '|', x.data, '|', x.l + '×' + x.h));
  const lignes = await f.evaluate(() => [...document.querySelectorAll('#contenu tbody tr')].map(tr => tr.innerText.replace(/\s+/g, ' ').trim()));
  console.log('lignes :'); lignes.forEach(l => console.log('  ', l));
  const kp = await f.evaluate(() => [...document.querySelectorAll('#contenu .kpi')].map(k => k.innerText.replace(/\s+/g, ' ').trim()));
  console.log('KPI :', kp);
  const codes = await f.evaluate(() => { const b = [...document.querySelectorAll('#contenu .kpi b')].map(e => e.textContent); return { kpi: b.map(t => [...t].map(ch => ch.charCodeAt(0) > 127 || ch === ' ' ? 'U+' + ch.charCodeAt(0).toString(16) : ch).join('')), eur1475: [...eur(1475)].map(ch => ch.charCodeAt(0).toString(16)).join(' '), eur3045: [...eur(3045)].map(ch => ch.charCodeAt(0).toString(16)).join(' ') }; });
  console.log('CODES :', JSON.stringify(codes));
  const hote = await p.evaluate(() => ({ du: FACTURES.filter(x => ['envoyee', 'retard', 'partielle'].includes(x.st)).reduce((s, x) => s + restant(x), 0), nb: FACTURES.length }));
  console.log('OP GESTION : à recevoir', hote.du, 'factures', hote.nb);
  // ouvre la première ligne
  const ligne = await f.$('#contenu tr[data-fac]'); if (ligne) { await ligne.click(); await p.waitForTimeout(700); await L.capture(c, X.CAP + `cadre-${profil}-${qui}-facture.png`);
    const pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim().slice(0, 700) : ''; }); console.log('panneau :', pan); }
  console.log('erreurs', c.err.slice(0, 5));
  await L.fin(c); await L.fermer();
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
