// Une visite d'un contrat facturé « par an » : sa fiche d'intervention dit « Sans facture · comprise dans le contrat », sans bouton « Préparer la
// facture » ; et la facture d'une visite « à chaque visite » (contrat c1) se prépare au prix du contrat. Captures à REGARDER (jour, nuit).
// usage : node contrats-visite-comprise.js [profil] [nuit]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p;
  await p.evaluate(() => { const k = CONTRATS.find(x => x.id === 'c3'); k.st = 'signe'; k.signe = '02/11/2026';
    INTS.push({ id:'x-an', d:'2026-10-30', h:'09:00', dur:60, tech:'tl', cli:'cm', titre:'Contrat — visite 1 sur 1', type:'Contrat', st:'fait', ctr:'c3' }); });
  await L.aller(p, 'inter-x-x-an'); await L.calme(p, 600);
  const e = await p.evaluate(() => { const t = document.getElementById('contenu').textContent; return { sansFacture: /Sans facture/.test(t), compris: /comprise dans le contrat CTR-2026-011/.test(t), bouton: !!document.querySelector('[data-action="prepFacture"]') }; });
  v('visite d\'un contrat par an : « Sans facture » et « comprise dans le contrat »', e.sansFacture && e.compris, e);
  v('…et aucun bouton « Préparer la facture »', !e.bouton, e);
  await L.capture(c, O.CAP + `comprise-${tag}.png`);
  // le contrat c1 (à chaque visite) : la visite i22 est terminée, sa facture se prépare au prix du contrat (1 400 ÷ 4 = 350)
  await L.aller(p, 'inter-x-i22'); await L.calme(p, 400);
  const f = await p.evaluate(() => { FACTURES.splice(0, FACTURES.length, ...FACTURES.filter(x => x.int !== 'i22')); factureDepuis(INTS.find(o => o.id === 'i22')); const g = FACTURES.find(x => x.int === 'i22'); return g ? { lignes: g.lignes.map(l => [l.d, l.pu]), tva: g.tva } : null; });
  v('visite terminée d\'un contrat « à chaque visite » : ligne « Visite 2 sur 4 » à 350 € HT (les pièces posées s’ajoutent), ni main-d’œuvre ni déplacement', f && f.lignes.length >= 1 && !f.lignes.some(l => /Déplacement|Main-d/.test(l[0])) && /Visite 2 sur 4 · contrat CTR-2026-004/.test(f.lignes[0][0]) && f.lignes[0][1] === 350, f);
  const k = await p.evaluate(() => ({ faites: ctrFaites(CONTRATS.find(x => x.id === 'c1')) }));
  v('le contrat c1 compte toujours 2 visites faites (départ 2, la visite 2 terminée ne se compte pas deux fois)', k.faites === 2, k);
  await L.aller(p, 'contrat-x-c1'); const tx = await p.evaluate(() => document.getElementById('contenu').textContent);
  v('la fiche du contrat c1 dit « 2 sur 4 faites »', /2 sur 4 faites/.test(tx), tx.slice(0, 200));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
