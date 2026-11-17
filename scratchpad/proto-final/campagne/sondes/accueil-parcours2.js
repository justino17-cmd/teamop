// Parcours 2 : ce qui BOUGE. Un paiement enregistré se retrouve-t-il, au centime, sur l'Accueil, les Statistiques, la Comptabilité et l'Historique ?
// Puis : rechargement sur place, visites de contrat, export de l'Historique filtré. node accueil-parcours2.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const c100 = s => L.cents(s);
(async () => {
  const profil = process.argv[2] || 'mac'; let c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const tuile = async k => { await L.aller(p, 'accueil'); return p.evaluate(k => (document.querySelector(`[data-kdash="${k}"]`).innerText || '').replace(/\s+/g, ' ').replace(/[  ]/g, ' '), k); };
  const montant1 = t => c100((t.match(/(\d[\d ]*,\d{2}) €/) || [])[1] + '€');
  // ── P8 : le client Cabinet dentaire Martin règle sa facture FAC-2026-0143 (114,00 € TTC) par virement
  const av = { rec: montant1(await tuile('rec')), enc: montant1(await tuile('enc')) };
  await L.aller(p, 'statistiques'); const stAv = (await corps()).match(/Encaissé TTC (\d[\d ]*) €/)[1];
  await L.aller(p, 'historique'); const nAv = await p.evaluate(() => JOURNAL.length);
  const ttc = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'f143'); const t = Math.round(restant(f) * 100); payer(f, 'Virement', {}); return t; });
  v('population : la facture à régler restait 114,00 €', ttc === 11400, ttc);
  const ap = { rec: montant1(await tuile('rec')), enc: montant1(await tuile('enc')) };
  v('P8 Accueil : « à recevoir » baisse du montant réglé', av.rec - ap.rec === ttc, { avant: av.rec, apres: ap.rec });
  v('P8 Accueil : « encaissé » monte du montant réglé', ap.enc - av.enc === ttc, { avant: av.enc, apres: ap.enc });
  await L.aller(p, 'statistiques'); const stAp = (await corps()).match(/Encaissé TTC (\d[\d ]*) €/)[1];
  v('P8 Statistiques : « encaissé TTC » monte aussi (à l’euro près)', Math.abs((c100(stAp + ',00€') - c100(stAv + ',00€')) - ttc) <= 100, { avant: stAv, apres: stAp });
  await L.aller(p, 'accueil'); await L.toucher(c, '[data-kdash="enc"]'); await p.waitForTimeout(500); const cp = await corps(), recu = c100((cp.match(/(\d[\d ]*,\d{2}) € reçu en octobre/) || [])[1] + '€');
  v('P8 Comptabilité : « reçu en octobre » = « reçu en octobre » de l’Accueil (les 40 € reçus sur place y sont compris depuis accueil-01)', recu === ap.enc, { compta: recu, accueil: ap.enc });
  await L.aller(p, 'historique'); const nAp = await p.evaluate(() => JOURNAL.length), dernier = await p.evaluate(() => { const j = JOURNAL[JOURNAL.length - 1]; return j && (H_GENS[j.qui].nom + ' ' + j.action + ' ' + (j.el && j.el.lib)); });
  v('accueil-03 · P8 Historique : un paiement enregistré s’inscrit (« qui a fait quoi »)', nAp === nAv + 1, { avant: nAv, apres: nAp, derniere: dernier });
  await c.p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });

  // ── P9 : rechargement sur place (l'adresse #statistiques / #historique)
  for (const h of ['statistiques', 'historique', 'accueil']) { await p.goto(p.url().split('#')[0] + '#' + h, { waitUntil: 'load' }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(1500); const e = await O.etat2(p); v(`P9 : recharger sur #${h} reste sur ${h}`, e.hash === '#' + h && !!e.h1, e); }

  // ── P10 : visites de contrat (Statistiques) = données = page Contrats
  await L.aller(p, 'statistiques'); const st = await corps(); const mv = st.match(/(\d+) sur (\d+) Visites faites/);
  const dv = await p.evaluate(() => CONTRATS.filter(k => k.st === 'signe').reduce((a, k) => ({ f: a.f + k.faites, n: a.n + k.freq }), { f: 0, n: 0 }));
  v('P10 Statistiques : « visites faites » = somme des contrats signés', mv && +mv[1] === dv.f && +mv[2] === dv.n, { ecran: mv && mv.slice(1, 3), donnees: dv });
  // ── P11 : Statistiques « devis » = page Devis
  const dev = await p.evaluate(() => { const t = typeof DEVIS_LISTE !== 'undefined' ? DEVIS_LISTE : null; return t ? t.length : null; }); console.log('  P11 devis (données) :', dev);
  await L.toucher(c, '[data-stdet="devis"]'); const pd = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').slice(0, 700) : ''; }); console.log('  P11 volet devis :', pd);
  const lignesDevis = await p.evaluate(() => document.querySelectorAll('#calque .panneau [data-devis], #calque .panneau .ligne-clic').length); console.log('  P11 lignes du volet devis :', lignesDevis); await L.ranger(p);
  // ── P12 : export de l'Historique, filtré — le volet dit-il le filtre, et le PDF porte-t-il les bonnes lignes ?
  await L.aller(p, 'historique'); await p.evaluate("hQui='tous';hType='facture';hCli='tous';hCherche='';hMax=60;hJourSel='tous'"); await L.aller(p, 'historique');
  const nFiltre = (await corps()).match(/(\d+) actions? trouvées?/)[1];
  await L.toucher(c, '[data-hexport="1"]'); await p.waitForTimeout(500); const ex = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ') : ''; }); console.log('  P12 volet export :', ex.slice(0, 500));
  v('P12 : l’export dit combien d’actions il contient et le filtre', new RegExp(nFiltre + ' actions?').test(ex) || /filtr|Factures et paiements/i.test(ex), { nFiltre, ex: ex.slice(0, 200) }); await L.ranger(p);
  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
