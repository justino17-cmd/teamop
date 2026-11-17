// GARDE de l'audit de sécurité (étape 7 sur 8, 17 novembre 2026) : S13 (la Comptabilité ne reçoit son rôle que de SA page hôte) et S14 (un client
// simulé ne lit et ne touche que ses propres documents). Chaque contrôle a sa population (le geste a bien eu lieu) et son témoin (le geste LÉGITIME
// marche encore : sinon la garde refuserait tout).
//   S13 : la Comptabilité ouverte SEULE n'accepte aucun message ; une AUTRE fenêtre (window.open, même origine) ne peut pas la déclarer « patron » ;
//         dans son cadre (OP GESTION), le rôle arrive toujours.
//   S14 : en rôle « client » sur le client « vp » : le contrat, la facture, le devis, l'intervention d'un AUTRE client, ouverts par leur adresse, ne
//         s'affichent pas ; les gestes de l'espace client (payer, payer pour de bon, facture en PDF, compte rendu, signer un devis, lire un contrat)
//         lancés avec l'identifiant d'un document d'un autre ne font rien — les mêmes gestes sur SES documents marchent.
// ⛔ 127.0.0.1 seulement, entreprise fictive. « N ✓ · M ✗ », sortie 1 si un contrôle tombe. RACINE=<copie> rejoue la sonde sur une copie mutée.
const L = require('../lib.js');
(async () => {
  // ═══ S13 ═══
  let c = await L.ouvrir({ qui: null, app: false, page: 'prototype-comptabilite.html', requete: '', attente: 1500 });
  const seule = await c.p.evaluate(async () => { window.postMessage({ opc_role: { role: 'patron', paie: true, droits: null } }, '*'); await new Promise(r => setTimeout(r, 400)); return { role: CMPT.role, paie: CMPT.paie === true, hote: window.parent !== window }; });
  L.v('S13 (population) la Comptabilité est ouverte seule (aucune page hôte)', !seule.hote, seule);
  L.v('S13 ouverte seule, elle n\'accepte AUCUN message de rôle (même envoyé de la page elle-même)', seule.role !== 'patron' && !seule.paie, seule);
  // une AUTRE fenêtre de la même origine : elle ouvre la Comptabilité puis lui envoie le message de rôle
  const [autre] = await Promise.all([c.ctx.waitForEvent('page', { timeout: 8000 }), c.p.evaluate(() => { window.__w = window.open(location.href); })]);
  await autre.waitForLoadState('load'); await autre.waitForTimeout(1200);
  await c.p.evaluate(() => { window.__w.postMessage({ opc_role: { role: 'patron', paie: true, droits: null } }, '*'); window.__w.postMessage({ opc_aller: { r: 'paie' } }, '*'); }); await c.p.waitForTimeout(700);
  const fen = await autre.evaluate(() => ({ role: CMPT.role, paie: CMPT.paie === true, hote: window.parent !== window, opener: !!window.opener })).catch(e => ({ erreur: e.message.slice(0, 80) }));
  L.v('S13 (population) la fenêtre ouverte par une autre page a bien reçu le message (elle a un opener)', !!fen.opener, fen);
  L.v('S13 une AUTRE fenêtre ne peut pas se déclarer patron de la Comptabilité ni lui faire ouvrir la Paie', fen.role !== 'patron' && !fen.paie, fen);
  await autre.close().catch(() => {}); await L.fin(c);
  // témoin : dans son cadre (OP GESTION), la Comptabilité reçoit toujours son rôle
  c = await L.ouvrir({ qui: 'marc', app: true, attente: 1100 });
  await c.p.evaluate(() => aller('comptabilite')); await c.p.waitForTimeout(3500);
  const cad = L.cadre(c.p, /prototype-comptabilite\.html/);
  const role = cad ? await cad.evaluate(() => ({ role: CMPT.role, paie: CMPT.paie === true, hote: window.parent !== window })).catch(e => ({ erreur: e.message.slice(0, 80) })) : null;
  L.v('S13 témoin : dans son cadre, la Comptabilité d\'un gérant reçoit le rôle « patron » (population : le cadre est là)', !!cad && !!role && role.role === 'patron' && role.hote, role);
  await L.fin(c);

  // ═══ S14 ═══
  c = await L.ouvrir({ qui: null, app: false, attente: 1000 }); const p = c.p;
  p.on('dialog', d => d.accept().catch(() => {}));
  const att = ms => p.waitForTimeout(ms);
  const D = await p.evaluate(async () => { rlChanger('client', { cli: 'vp', muet: true }); await new Promise(r => setTimeout(r, 500));
    const autre = CONTRATS.find(x => x.cli !== 'vp'), mien = CONTRATS.find(x => x.cli === 'vp'), fa = FACTURES.find(f => f.cli !== 'vp' && ['envoyee', 'retard', 'partielle'].includes(f.st)), fm = FACTURES.find(f => f.cli === 'vp' && ['envoyee', 'retard', 'partielle'].includes(f.st)),
      dv = (dvInit(), DV.find(d => d.cli !== 'vp')), dm = DV.find(d => d.cli === 'vp'), it = INTS.find(i => i.cli !== 'vp'), im = INTS.find(i => i.cli === 'vp');
    return { moi: RL_CLI.cli, autre: autre && { id: autre.id, titre: autre.titre, cli: autre.cli }, mien: mien && { id: mien.id }, fa: fa && fa.id, fm: fm && fm.id, dv: dv && dv.num, dm: dm && dm.num, it: it && it.id, im: im && im.id }; });
  L.v('S14 (population) on est le client « vp » et les documents des deux côtés existent (contrat, facture, devis, intervention)', D.moi === 'vp' && !!(D.autre && D.fa && D.dv && D.it && D.fm), D);
  // les adresses
  const lit = async h => { await p.evaluate(h => { location.hash = h; }, h); await att(700); return p.evaluate(() => ({ route, texte: document.getElementById('contenu').innerText.replace(/\s+/g, ' ') })); };
  const rc = await lit('signer-x-' + D.autre.id);
  L.v('S14 le client ne lit pas le contrat d\'un AUTRE client par son adresse (titre lu : ' + rc.texte.toLowerCase().includes(D.autre.titre.toLowerCase()) + ')', !rc.texte.toLowerCase().includes(D.autre.titre.toLowerCase()) && !/Lire le contrat en entier/.test(rc.texte), rc.texte.slice(0, 100));
  if (D.mien) { const rm = await lit('signer-x-' + D.mien.id); L.v('S14 témoin : son propre contrat s\'ouvre (population)', /Lire le contrat en entier|déjà signé/.test(rm.texte), rm.texte.slice(0, 100)); }
  // les gestes de l'espace client avec l'identifiant d'un document d'un autre
  await p.evaluate(() => { location.hash = 'espaceclient'; }); await att(700);
  const geste = async (data, attr) => p.evaluate(async ([data, attr]) => { try { fermerPanneau(); } catch (e) {} const b = document.createElement('button'); b.setAttribute(attr || 'data-ec', data); b.textContent = 'essai'; document.body.appendChild(b); b.click(); await new Promise(r => setTimeout(r, 450)); b.remove();
    return { panneau: !!document.querySelector('#calque .panneau'), texte: ((document.querySelector('#calque .panneau') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 80), pdf: !!document.querySelector('.docplein, #docplein, .doc-plein') }; }, [data, attr]);
  const refus = [['payer|' + D.fa, 'payer (facture d\'un autre)'], ['fpdf|' + D.fa, 'facture en PDF (d\'un autre)'], ['cr|' + D.it, 'compte rendu (d\'un autre)'], ['signer|' + D.dv, 'signer un devis (d\'un autre)']];
  for (const [d, lib] of refus) { const r = await geste(d); L.v('S14 « ' + lib + ' » lancé avec l\'identifiant d\'un autre client ne fait rien', !r.panneau && !r.pdf, r); }
  const c1 = await p.evaluate(async id => { try { fermerPanneau(); } catch (e) {} const b = document.createElement('button'); b.setAttribute('data-action', 'lireContrat'); b.setAttribute('data-id', id); document.body.appendChild(b); b.click(); await new Promise(r => setTimeout(r, 450)); b.remove(); return !!document.querySelector('#calque .panneau'); }, D.autre.id);
  L.v('S14 « Lire le contrat » lancé avec l\'identifiant du contrat d\'un autre ne l\'ouvre pas', !c1, c1);
  // témoins : les mêmes gestes sur SES documents
  const tp = await geste('payer|' + D.fm); L.v('S14 témoin : « Payer » sur sa propre facture ouvre le paiement (population : ' + D.fm + ')', tp.panneau, tp);
  if (D.dm) { const ts = await geste('signer|' + D.dm); L.v('S14 témoin : « Lire et signer » sur son propre devis ouvre le devis', ts.panneau, ts); }
  if (D.im) { const tc = await p.evaluate(async id => { try { fermerPanneau(); } catch (e) {} const b = document.createElement('button'); b.setAttribute('data-ec', 'cr|' + id); document.body.appendChild(b); b.click(); await new Promise(r => setTimeout(r, 450)); b.remove(); return !!document.querySelector('#calque .panneau'); }, D.im); L.v('S14 témoin : le compte rendu de sa propre intervention s\'ouvre', tc, tc); }
  console.log('erreurs page :', c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
