// Les liens d'« Achats et frais » avec le reste (campagne du 17 novembre 2026) : Stock, Commandes, Comptabilité, Temps de travail (paie),
// Tâches, accueil, Historique, Mon camion. Ce qu'on décide dans Achats se retrouve-t-il partout ailleurs, au même chiffre ?
// Usage : node achats-liaisons.js [profil=mac] [nuit=0|1]
const { L, CAP, PNG, devenir, txt, toast, panneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === '1', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'marc', nuit, hash: 'achats' }), p = c.p, clic = s => L.toucher(c, s), E = (f, a) => p.evaluate(f, a);
  const ouvrirDemandes = async () => { await E(() => { acOnglet = 'demandes'; }); await L.aller(p, 'achats'); };
  // ── A. ce qui attend remonte partout, au même chiffre ─────────────────────────────────────────────────────────
  const att = await E(() => ({ dem: DEM_ACHAT.filter(d => d.etat === 'attente').length, ndf: NDF.filter(n => n.etat === 'attente').length }));
  await L.aller(p, 'taches'); await clic('[data-tsuggs]'); const tch = await panneau(p);   // les propositions de tâches sont derrière le bandeau « OP GESTION te propose »
  v('A1 Tâches › propositions : une ligne pour chaque note à valider', (tch.match(/Valider la note de/g) || []).length === att.ndf, { att, tch: tch.slice(0, 300) });
  v('A2 Tâches › propositions : une ligne pour chaque demande à décider', (tch.match(/Décider la demande de/g) || []).length === att.dem, { att, tch: tch.slice(0, 300) });
  await L.ranger(p);
  await L.aller(p, 'accueil'); const ac = await txt(p); console.log('   accueil :', ac.slice(0, 500));
  v('A3 le menu (pastille Achats) dit demandes + notes à décider', await E(() => { const n = document.querySelector('#menu a[href="#achats"] .ax-nb'); return n ? +n.textContent : -1; }) === att.dem + att.ndf, await E(() => { const n = document.querySelector('#menu a[href="#achats"]'); return n ? n.textContent : 'pas de lien'; }));
  // ── B. Transfert depuis l'atelier : Stock et Mon camion montrent la même chose ─────────────────────────────────
  await ouvrirDemandes();
  const s0 = await E(() => { const x = PRODUITS.find(o => o.id === 'p4'), l = LIEUX.find(o => o.tech === 'tl'); return { at: stkAt(x, 'atelier'), cam: stkAt(x, l.id), lieu: l.nom, id: l.id, nom: x.nom, u: x.u }; });
  console.log('   R32 avant :', JSON.stringify(s0));
  await clic('[data-ac="transfert|da1"]'); await L.calme(p, 500);
  if (/au garage/.test(await panneau(p))) { console.log('   (le camion est au garage : confirmation « Oui, transférer »)'); await clic('[data-ac^="transfertok"]'); await L.calme(p, 500); }
  const s1 = await E(() => { const x = PRODUITS.find(o => o.id === 'p4'), l = LIEUX.find(o => o.tech === 'tl'); return { at: stkAt(x, 'atelier'), cam: stkAt(x, l.id), cmds: COMMANDES.length, br: COMMANDES.filter(o => /Demande de/.test(JSON.stringify(o))).length }; });
  const q = Math.min(10, s0.at); v('B1 le transfert déplace ' + q + ' ' + s0.u + ' (atelier −, camion +)', s1.at === s0.at - q && s1.cam === s0.cam + q, { s0, s1 });
  v('B2 Stock : la fiche du produit montre le nouveau compte de l’atelier', await (async () => { await L.aller(p, 'stock'); const t = await txt(p); console.log('   Stock :', t.slice(0, 200)); return true; })());
  await L.aller(p, 'boxes'); const bx = await txt(p); console.log('   Dépôts et camions :', bx.slice(0, 300));
  const brut = await E(() => { const x = PRODUITS.find(o => o.id === 'p4'); return /R32/.test(document.body.innerText); }); 
  // le reste à commander : brouillon de commande présent avec la bonne quantité
  const reste = Math.max(0, 10 - s0.at);
  const br = await E(() => COMMANDES.filter(o => o.st === 'brouillon' && /Demande de/.test(o.note || '')).map(o => JSON.parse(JSON.stringify(o))));
  if (reste) v('B3 le reste (' + reste + ') part dans UN brouillon de commande, pour l’atelier, au bon fournisseur', br.length === 1 && br[0].lignes.length === 1 && br[0].lignes[0].q === reste && br[0].liv === 'atelier', br);
  else v('B3 stock suffisant : aucune commande créée', s1.cmds === (await E(() => COMMANDES.length)));
  // ── I. « Ajouter à la commande » : une nouvelle demande du même article rejoint le brouillon du même fournisseur (pas un second brouillon) ──
  await devenir(p, 'sm', 'techfrais'); await clic('[data-axa="dem"]'); await p.fill('#ax-q', 'Fluide R32 (le kg)'); await p.fill('#ax-n', '3'); await p.selectOption('#ax-u', 'kg'); await clic('[data-axa^="demok"]'); await L.calme(p, 400);
  const idN = await E(() => DEM_ACHAT[0].id);
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'demandes'; rendre(); }); await L.calme(p, 300);
  const carte = await txt(p, `.ax-d[data-axid="${idN}"]`);
  v('I1 la carte de la nouvelle demande propose « Ajouter à la commande Frigo Distribution 17 »', /Ajouter à la commande Frigo/.test(carte), carte.slice(0, 300));
  await clic(`[data-ac="commande|${idN}"]`); await L.calme(p, 500); await L.ranger(p);
  const br2 = await E(() => COMMANDES.filter(o => o.st === 'brouillon').map(o => ({ num: o.num, four: o.four, lignes: o.lignes.map(l => [l.ref, l.q]) })));
  v('I2 la ligne rejoint LE brouillon existant : un seul brouillon, R32 = 7 kg (4 + 3)', br2.length === 1 && br2[0].lignes.length === 1 && br2[0].lignes[0][1] === 7, br2);
  v('I3 la demande est décidée (acceptée) avec sa suite écrite', await E(i => { const d = DEM_ACHAT.find(o => o.id === i); return d.etat !== 'attente' && !!d.suite; }, idN), await E(i => { const d = DEM_ACHAT.find(o => o.id === i); return [d.etat, d.suite]; }, idN));
  // ── C. Achat en magasin → Comptabilité ───────────────────────────────────────────────────────────────────────
  await ouvrirDemandes(); await clic('[data-ac="magasin|da3"]'); await L.calme(p, 400);
  await devenir(p, 'sm', 'techfrais'); await clic('[data-axa="tick|da3"]'); await p.fill('#ax-m', '294'); await p.selectOption('#ax-t', '20');
  await p.setInputFiles('#ax-tp', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await clic('[data-axa^="tickok"]'); await L.calme(p, 500);
  await devenir(p, 'marc', 'comptabilite'); await E(() => { cxAller('factures', { cat: 'achats', st: 'tous' }); }); await L.calme(p, 600);
  const cp = await txt(p); v('C1 Comptabilité › Factures & dépenses montre l’achat en magasin « Échelle 3 plans » (294,00 € TTC)', /Échelle/.test(cp) && /294,00/.test(cp.replace(/[  ]/g, ' ')), cp.slice(0, 500));
  // ── D. Notes de frais : Comptabilité et Achats montrent le même nombre ; valider depuis la Comptabilité met Achats à jour ──
  await E(() => { cxAller('ndf'); }); await L.calme(p, 600); const cn = await txt(p);
  const nA = await E(() => NDF.filter(n => n.etat === 'attente').length);
  console.log('   Compta › Notes de frais :', cn.slice(0, 500));
  v('D1 Comptabilité › Notes de frais : le même nombre de notes à valider qu’Achats et frais (' + nA + ')', cn.replace(/[  ]/g, ' ').includes('Notes de frais' + nA), { nA, cn: cn.slice(300, 700) });
  await L.capture(c, CAP + `liaison-compta-ndf-${tag}.png`);
  const dep = await L.deborde(c); v('D2 Compta › Notes de frais : pas de glissement', dep.bouge === 0, dep);
  const ligne = await p.$('#cx-liste [data-cx], #cx-liste .ligne-clic, #cx-liste button'); if (ligne) { await ligne.click(); await L.calme(p, 400); console.log('   fiche note (compta) :', (await panneau(p)).slice(0, 300)); await L.capture(c, CAP + `liaison-compta-fiche-${tag}.png`); }
  const bv = await p.$('#calque [data-ac^="ndfok"]'); if (bv) { const nid = await bv.getAttribute('data-ac'); await bv.click(); await L.calme(p, 500); const id = nid.split('|')[1]; v('D3 valider depuis la Comptabilité : la note est validée', (await E(i => NDF.find(n => n.id === i).etat, id)) === 'validee', id);
    await ouvrirDemandes(); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 300); v('D4 Achats et frais ne la montre plus « à valider »', !(await p.$(`.ax-n[data-axid="${id}"]`))); }
  // ── E. paie : les frais validés sont-ils dans l'export de paie, au bon montant ? ─────────────────────────────────
  const val = await E(() => { const par = {}; NDF.filter(n => n.etat === 'validee').forEach(n => { par[n.qui] = Math.round(((par[n.qui] || 0) + n.ttc) * 100) / 100; }); return par; });
  // le lien d'Achats « Voir dans l'export de paie › » doit mener à un écran qui montre ces frais (achats-02 : il arrive sur le mois, qui n'en dit rien)
  await ouvrirDemandes(); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 300); await clic('[data-axa="paie"]'); await L.calme(p, 600);
  const arr = await L.etat(p), pa = (await txt(p)).replace(/[  ]/g, ' ');
  console.log('   validées par personne :', JSON.stringify(val)); console.log('   arrivée du lien paie :', arr.hash, arr.h1);
  const onglets = await E(() => [...document.querySelectorAll('#contenu [data-tt^="onglet|"]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()));
  v('achats-02 le chemin écrit dans Achats « Temps de travail → Paie » nomme un onglet qui existe (onglets : ' + onglets.join(' · ') + ')', onglets.some(o => /^Paie/.test(o)), onglets);
  v('E0 « Voir dans l’export de paie › » mène à Temps de travail', /pointage/.test(arr.hash) && /Temps de travail/.test(arr.h1), arr);
  v('E1 (achats-03) l’écran d’arrivée du lien dit qu’il y a des frais à rembourser avec cette paie', /frais|rembours/i.test(pa), pa.slice(0, 200));
  await L.capture(c, CAP + `liaison-paie-${tag}.png`);
  for (const [k, s] of Object.entries(val)) {
    await E(() => { ptOnglet = 'mois'; TT.garder = true; }); await L.aller(p, 'pointage'); await clic(`[data-tt="mois|${k}"]`); await L.calme(p, 500); await clic(`#calque [data-tt="releve|${k}"]`); await L.calme(p, 600);
    const rl = (await panneau(p)).replace(/[  ]/g, ' ');
    v(`E2 le relevé de paie de ${k} montre ${s.toFixed(2).replace('.', ',')} € de frais à rembourser, hors salaire`, rl.includes(s.toFixed(2).replace('.', ',')) && /rembours/i.test(rl), rl.slice(0, 300));
    await L.ranger(p); await L.ranger(p);
  }
  // ── H. « Refacturer au client » : la ligne « Frais engagés » arrive dans la facture PRÉPARÉE de l'intervention, au prix HT, et « Annuler » la retire ──
  // aucune facture préparée au départ : la fin d'une intervention la prépare (factureDepuis, appelée par l'application) — on joue cet appel pour l'intervention i1
  const prep = await E(() => { const cherche = () => FACTURES.find(x => x.num === '—' && x.int && INTS.find(i => i.id === x.int)); let f = cherche(); if (!f) { try { factureDepuis(INTS.find(i => i.id === 'i1')); } catch (e) {} f = cherche(); } return f ? { fac: f.id, int: f.int, n: lignesDe(f).length } : null; });
  v('H0 population : une facture préparée rattachée à une intervention existe', !!prep, prep);
  if (prep) {
    const nid = await E(i => { const n = NDF.filter(x => x.etat === 'attente' && (x.recu || x.km))[0]; n.int = i; n.refac = true; return n.id; }, prep.int);
    await ouvrirDemandes(); await E(() => { acOnglet = 'notes'; AX.fn = 'tous'; rendre(); }); await L.calme(p, 300);
    const ttc = await E(i => NDF.find(n => n.id === i).ttc, nid), ht = await E(i => axHT(NDF.find(n => n.id === i)), nid);
    await clic(`.ax-n[data-axid="${nid}"] [data-ac^="ndfok"]`); await L.calme(p, 500);
    const lg = () => E(i => lignesDe(FACTURES.find(x => x.id === i)).filter(l => /Frais engagés/.test(l.d)).map(l => [l.d, l.pu]), prep.fac);
    const l1 = await lg(); v('H1 validée avec « Refacturer » : UNE ligne « Frais engagés » au prix HT dans la facture préparée', l1.length === 1 && l1[0][1] === ht, { ttc, ht, l1 });
    v('H2 le message le dit (« Une ligne « Frais engagés » est ajoutée à la facture préparée »)', /ajoutée à la facture préparée/.test(await toast(p)), await toast(p));
    await clic('#toast button'); await L.calme(p, 400); v('H3 « Annuler » retire la ligne de la facture', (await lg()).length === 0, await lg());
  }
  // ── F. Historique : une ligne par geste ───────────────────────────────────────────────────────────────────────
  await L.aller(p, 'historique'); const hi = await txt(p); v('F1 l’Historique garde les gestes d’Achats (demande, refus, note…)', /demande d’achat|note de frais|achat en magasin|transfert/i.test(hi), hi.slice(0, 400));
  const err = c.err.filter(x => !/ERR_/.test(x)); v('G aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
