// RESTES contrats, tour 4 : (1) le prix PAR VISITE et le TTC de l'aperçu lisent le prix RANGÉ (au centime), comme la fiche ;
// (2) le plafond de 1 000 000 € se juge sur le prix rangé (« 1000000.004 » s'écrit 1 000 000,00 € : accepté, comme l'aperçu le dit) ;
// (3) la liste des Contrats : tableau remplacé par des cartes quand la CARTE est étroite (iPad portrait), compteur à sept chiffres entier.
// usage : node restes-contrats-4.js [profil] [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  const txt = () => p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h ? h.nextElementSibling.textContent.replace(/[\s  ]+/g, ' ').trim() : ''; });
  const nb = t => (t.match(/([\d ]+,\d\d) €/g) || []).map(x => x.replace(/[^\d,]/g, ''));
  let n = 0;
  // (1) aperçu et fiche : mêmes HT, TTC, prix par visite
  for (const [s, freq] of [['12,345', '4'], ['99.995', '2'], ['10.0049', '6'], ['1.005', '12'], ['100.005', '4'], ['100.005', '2']]) {   // 100.005 sur 2 visites : 50,0025 sur la saisie brute (50,00), 50,005 sur le prix rangé 100,01 (50,01) : le cas qui départage
    await L.calme(p, 1200);
    await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250); await p.selectOption('[data-b="freq"]', freq); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 400);
    const ap = nb(await txt());   // [HT par an, TTC, HT par visite]
    const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: +freq, prix: s, fact: 'visite', signer: false }); if (!k) { v('saisie ' + s + ' : créé', false, s); continue; } n++;
    await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 400);
    const fi = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); return h ? h.parentElement.textContent.replace(/[\s  ]+/g, ' ').trim() : ''; });
    const fN = nb(fi);
    console.log('  ·', s, 'x', freq, '→ aperçu', ap.join(' / '), '→ fiche', fN.join(' / '));
    v(s + ' : le HT de l’aperçu est celui de la fiche', ap[0] && fN.includes(ap[0]), { ap, fN });
    v(s + ' : le TTC de l’aperçu est celui de la fiche', ap[1] && fN.includes(ap[1]), { ap, fN });
    v(s + ' : le prix par visite de l’aperçu est celui de la fiche (« à chaque visite »)', ap[2] && fN[0] === ap[2], { ap, fN });
  }
  v('population : des contrats créés (' + n + ')', n >= 5, n);
  // (2) plafond sur le prix rangé
  await L.calme(p, 1200); const k2 = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 1, prix: '1000000.004', fact: 'an', signer: false });
  v('« 1000000.004 » (1 000 000,00 € rangé) n’est pas refusé comme trop grand', !!k2, k2);
  await L.calme(p, 1200); const k3 = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 1, prix: '1000000.006', fact: 'an', signer: false });
  v('« 1000000.006 » (1 000 000,01 € rangé) est refusé', !k3, k3);
  // (3) liste : compteur et tableau avec des prix à sept chiffres
  await p.evaluate(() => { CONTRATS.filter(k => k.st === 'signe').forEach(k => { k.prix = 999999.99; }); });
  await L.aller(p, 'accueil'); await L.aller(p, 'contrats'); await L.calme(p, 600);
  const r = await p.evaluate(() => ({ kp: [...document.querySelectorAll('#contenu .kpis .kpi b')].map(b => ({ t: b.textContent, coupe: b.scrollWidth > b.clientWidth + 1, de: b.getBoundingClientRect().right > b.closest('.kpi').getBoundingClientRect().right + 1 })),
    th: [...document.querySelectorAll('#contenu table thead th')].map(h => [h.textContent, Math.round(h.getBoundingClientRect().width)]), larg: document.documentElement.scrollWidth }));
  v('population : 4 compteurs', r.kp.length === 4, r.kp);
  v('aucun compteur coupé ni sorti de sa carte', !r.kp.some(k => k.coupe || k.de), r.kp);
  const cl = r.th.find(h => h[0] === 'Client');
  v('colonne Client : au moins 100 px, ou tableau remplacé par des cartes', !!cl && (cl[1] >= 100 || r.th.some(h => h[1] === 0)), r.th);
  v('la page ne déborde pas de la largeur du profil', r.larg <= (await p.evaluate(() => window.innerWidth)) + 1, r.larg);
  await p.evaluate(() => { const t = document.getElementById('toast'); if (t) t.style.display = 'none'; const k = document.querySelector('#contenu .kpis'); if (k) k.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400);   // la bulle du refus du plafond couvrait la capture
  await p.screenshot({ path: '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-4/liste-' + profil + (nuit ? '-nuit' : '-jour') + '.png' });
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
