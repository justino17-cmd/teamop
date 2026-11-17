// Le cadre « OP COMPTABLE » et OP GESTION parlent-ils de la MÊME entreprise au même jour (31 octobre) ? On lit les chiffres du tableau de bord,
// de la TVA et de la Paie du cadre, et on les compare à ceux de la Comptabilité d'OP GESTION. « N ✓ · M ✗ ». Un ✗ porte le numéro du défaut.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
const num = t => { const m = String(t || '').replace(/[\s  ]/g, '').match(/[−-]?\d+(?:,\d+)?/); return m ? Math.round(parseFloat(m[0].replace('−', '-').replace(',', '.')) * 100) : null; };
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const H = await p.evaluate(() => { const K = cxChiffres(), tv = cpTva(), F = cxFournisseurs();
    return { banque: Math.round(K.soldeBq * 100), fournDu: Math.round(F.reduce((s, o) => s + o.du, 0) * 100), clientsDu: Math.round(FACTURES.filter(f => ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + restant(f), 0) * 100),
      tvaCol: Math.round(tv.col * 100), tvaDed: Math.round(tv.ded * 100), tvaPayer: Math.round(tv.aPayer * 100), ecritures: cpEcritures().length, coutPaie: Math.round(paieFiches().reduce((s, b) => s + b.cout, 0) * 100), netPaie: Math.round(paieFiches().reduce((s, b) => s + b.netPaye, 0) * 100) }; });
  console.log('OP GESTION :', JSON.stringify(H));
  const f = await X.cadreOuvert(c); v('CC0 le cadre OP COMPTABLE est ouvert', !!f); await p.waitForTimeout(1200);
  const tuile = async lib => f.evaluate(l => { const e = [...document.querySelectorAll('#contenu .kpi, #contenu .carte')].find(x => x.innerText.toLowerCase().includes(l.toLowerCase()) && x.innerText.length < 220); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; }, lib);
  const T = { banque: await tuile('Argent en banque'), fourn: await tuile('Tu dois aux fournisseurs'), clients: await tuile('Les clients te doivent'), tva: await tuile('TVA d’octobre') };
  console.log('CADRE accueil :', JSON.stringify(T)); await L.capture(c, X.CAP + `${profil}-cadre-coherence-accueil.png`);
  const bq = num(T.banque.replace(/Argent en banque/i, '')), fo = num(T.fourn.replace(/Tu dois aux fournisseurs/i, '')), cl = num(T.clients.replace(/Les clients te doivent/i, ''));
  v('CC1 « Les clients te doivent » du cadre = ce que doivent les clients dans OP GESTION (1 475,00 €)', cl === H.clientsDu, { cadre: cl, hote: H.clientsDu });
  v('CC2 « Tu dois aux fournisseurs » du cadre = les factures fournisseurs à payer d’OP GESTION', fo === H.fournDu, { cadre: fo, hote: H.fournDu });
  v('CC3 « Argent en banque » du cadre (banque + caisse) cohérent avec la banque d’OP GESTION (solde banque 9 792,95 €)', bq != null && Math.abs(bq - H.banque) < 100000, { cadre: bq, hote: H.banque });
  // TVA
  await f.evaluate(() => { try { aller('tva'); } catch (e) {} }); await p.waitForTimeout(900); const tt = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ')); await L.capture(c, X.CAP + `${profil}-cadre-coherence-tva.png`);
  const g = re => { const m = tt.match(re); return m ? num(m[1]) : null; };
  const col = g(/ventes payées ce mois-ci\s*([−-]?[\d\s .,]+€)/), ded = g(/TVA payée sur tes achats\s*([−-]?\s*[\d\s .,]+€)/), pay = g(/À payer à l.État\s*([\d\s .,]+€)/);
  console.log('CADRE TVA :', col, ded, pay);
  v('CC4 TVA collectée : le cadre dit la même que la Comptabilité d’OP GESTION (482,81 €)', col === H.tvaCol, { cadre: col, hote: H.tvaCol });
  v('CC5 TVA payée sur les achats : le cadre dit la même (320,06 €)', Math.abs(ded || 0) === H.tvaDed, { cadre: ded, hote: H.tvaDed });
  v('CC6 TVA « à payer à l’État » : même montant des deux côtés (162,75 €)', pay === H.tvaPayer, { cadre: pay, hote: H.tvaPayer });
  // Paie
  await f.evaluate(() => { try { aller('accueil'); } catch (e) {} }); await p.waitForTimeout(700); const ac = await f.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' '));
  const mp = ac.match(/paie d.octobre prévue \(([−-]?\s*[\d\s .,]+)\s*€/); const paieCad = mp ? Math.abs(num(mp[1])) : null; console.log('CADRE paie prévue :', paieCad, 'hôte coût', H.coutPaie, 'net', H.netPaie);
  v('CC7 la paie d’octobre du cadre (26 734,12 €) = le coût de la paie d’OP GESTION (24 592,69 €)', paieCad === H.coutPaie || paieCad === H.netPaie, { cadre: paieCad, coutHote: H.coutPaie, netHote: H.netPaie });
  const ec = ac.match(/(\d+) écritures/); v('CC8 le nombre d’écritures du mois : 51 des deux côtés', ec && +ec[1] === H.ecritures, { cadre: ec && ec[1], hote: H.ecritures });
  v('CC erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
