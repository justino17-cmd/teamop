// RECONTRÔLE ADVERSE des restes des contrats, tour 2 : ce que les corrections du tour 2 (ctrFigerVisites, ctrTTC, prix en centimes, visites
// sorties sans date, ligne .ctr-vl) auraient pu casser à côté. usage : node restes-contrats-2-recontrole.js [profil] [nuit] → « N ✓ · M ✗ »
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-rec2/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  let c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); let p = c.p; await L.calme(p, 400);
  // ── P : le prix tapé, l'aperçu et le prix rangé disent le MÊME nombre
  await L.aller(p, 'contrat-nouveau'); await L.calme(p, 300);
  for (const [saisie, attendu] of [['1000.005', null], ['1000,01', 1000.01], ['0.995', null], ['1.005', null], ['2.675', null], ['12,5€', 'refus'], ['abc', 'refus'], ['99,99', 99.99]]) {
    await p.fill('[data-b="prix"]', saisie); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 1400);   // la garde du double-clic (1,2 s) de creerContrat refuse sinon la création suivante
    const apercu = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h ? h.nextElementSibling.textContent.replace(/\s+/g, ' ').trim().slice(0, 140) : null; });
    const rangé = await p.evaluate(() => { const n = CONTRATS.length; const pf = document.querySelector('[data-b="prix"]'); try { ACTIONS.creerContrat(); } catch (e) { return 'ERR ' + e.message; } const k = CONTRATS.length > n ? CONTRATS[CONTRATS.length - 1] : null; if (k) { CONTRATS.pop(); INTS.splice(0, 0); return k.prix; } return 'refus'; });
    console.log('  · saisie', JSON.stringify(saisie), '→ aperçu :', apercu, '→ rangé :', rangé);
    v('prix ' + saisie + ' : pas de « NaN » dans l’aperçu', !/NaN/.test(apercu || ''), apercu);
    if (attendu === 'refus') v('prix ' + saisie + ' : refusé à la création (rien n’est rangé)', rangé === 'refus', rangé);
    else if (typeof rangé === 'number') { const m = (apercu || '').match(/^([\d\s  .,]+)\s*€ HT/); const ap = m ? parseFloat(m[1].replace(/[\s  ]/g, '').replace(',', '.')) : NaN; v('prix ' + saisie + ' : l’aperçu (' + ap + ') dit le prix rangé (' + rangé + ')', ap === rangé, { ap, rangé }); }
    await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250);
  }
  await L.fin(c);
  // ── S1 : Mettre fin puis un nouveau contrat du même client, et TOUS les écrans qui lisent la même règle
  c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); p = c.p; await L.calme(p, 400);
  const avant = await p.evaluate(() => CONTRATS.filter(k => k.st === 'signe').map(k => ({ id: k.id, cli: k.cli, freq: k.freq, faites: ctrFaites(k) })));
  v('population : des contrats signés existent (' + avant.length + ')', avant.length >= 2, avant);
  // chaque contrat signé de départ : Mettre fin, puis un NOUVEAU contrat du même client, même fréquence
  const rap = [];
  for (const a of avant.slice(0, 4)) {
    const r = await p.evaluate(a => { const k = CONTRATS.find(x => x.id === a.id); const dep = INTS.filter(i => i.type === 'Contrat' && ctrDeVisite(i) === k).map(i => i.id + ':' + i.st); ACTIONS.finContratOk({ dataset: { id: k.id } }); const apres = INTS.filter(i => i.type === 'Contrat' && i.ctr === k.id).length; const sansCtr = INTS.filter(i => i.type === 'Contrat' && !i.ctr && i.cli === k.cli).length; return { dep: dep.length, apres, sansCtr, termine: k.st, faitesApres: ctrFaites(k), faitesAvant: a.faites }; }, a);
    rap.push(Object.assign({ id: a.id }, r));
    v('contrat ' + a.id + ' : les visites faites restent comptées après « Mettre fin » (' + r.faitesAvant + ' → ' + r.faitesApres + ')', r.faitesApres === r.faitesAvant, r);
  }
  const nvx = await p.evaluate(avant => avant.slice(0, 4).map(a => { const k0 = CONTRATS.find(x => x.id === a.id); const k = { id: 'cz' + a.id, num: ctrNum(), cli: k0.cli, modele: k0.modele, titre: k0.titre, freq: k0.freq, prix: k0.prix, fact: k0.fact, st: 'signe', signe: '31/10/2026', debut: ctrFr(AUJ), fin: ctrFinDe(ctrFr(AUJ)), faites: 0 }; CONTRATS.push(k); ctrPoserVisites(k); return { id: k.id, freq: k.freq, faites: ctrFaites(k), passe: visitesDe(k).filter(x => !x.fait && x.d < AUJ).length, doublons: INTS.filter(i => i.cli === k.cli && i.st !== 'annulee' && i.type === 'Contrat' && ctrDeVisite(i) === k).length }; }), avant);
  nvx.forEach(n => v('nouveau contrat ' + n.id + ' : « 0 sur ' + n.freq + ' faites », aucune visite dans le passé, ' + n.freq + ' visites à lui', n.faites === 0 && n.passe === 0 && n.doublons === n.freq, n));
  // les écrans qui lisent ces visites
  const pages = ['accueil', 'planning', 'interventions', 'taches', 'statistiques', 'contrats', 'historique', 'comptabilite', 'clients'];
  for (const h of pages) { await L.aller(p, h); await L.calme(p, 350); const t = await p.evaluate(() => document.getElementById('contenu').innerText); v('écran ' + h + ' : ni NaN, ni undefined, ni « 1 jours »', !/NaN|undefined|\b1 jours\b|\[object/.test(t), (t.match(/.{30}(NaN|undefined|\[object).{20}/) || [])[0]); }
  for (const a of avant.slice(0, 2)) { await L.aller(p, 'client-x-' + (await p.evaluate(id => CONTRATS.find(x => x.id === id).cli, a.id))); await L.calme(p, 400); const t = await p.evaluate(() => document.getElementById('contenu').innerText); v('fiche client du contrat ' + a.id + ' : ni NaN ni undefined', !/NaN|undefined|\[object/.test(t)); await L.aller(p, 'contrat-x-' + a.id); await L.calme(p, 300); const f = await p.evaluate(() => document.getElementById('contenu').innerText); v('fiche contrat terminé ' + a.id + ' : dit « Terminé », ni NaN ni undefined', /Terminé/.test(f) && !/NaN|undefined|\[object/.test(f)); }
  // le doublon de titre au planning : jamais deux « visite N sur M » vivantes d'un même client dans le passé
  const dbl = await p.evaluate(() => { const r = []; const m = {}; INTS.filter(i => i.type === 'Contrat' && i.st !== 'annulee').forEach(i => { const k = i.cli + '|' + i.titre; (m[k] = m[k] || []).push(i); }); Object.keys(m).forEach(k => { const l = m[k]; const vivants = l.filter(i => i.st !== 'fait'); if (l.length > 1 && vivants.length && vivants.some(i => i.d < AUJ)) r.push(k); }); return r; });
  v('aucune visite de contrat « à planifier » ou planifiée dans le passé, en double d\'une autre', dbl.length === 0, dbl.slice(0, 4));
  // ── S2 : Renouveler puis Mettre fin au renouvelé : l'ancien contrat garde ses visites ; Mettre fin au renouvelé ne touche pas l'ancien
  c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); p = c.p; await L.calme(p, 400);
  const s2 = await p.evaluate(() => { const k = CONTRATS.find(x => x.st === 'signe' && !x.renouvele); const fa0 = ctrFaites(k), dep0 = INTS.filter(i => i.type === 'Contrat' && ctrDeVisite(i) === k).length;
    ACTIONS.renouvelerOk({ dataset: { id: k.id } }); const n = CONTRATS.find(x => x.id === k.renouvele); const fa1 = ctrFaites(k), faN = ctrFaites(n); const dep1 = INTS.filter(i => i.type === 'Contrat' && ctrDeVisite(i) === k).length;
    ACTIONS.finContratOk({ dataset: { id: n.id } }); return { ancien: k.id, nouveau: n.id, fa0, fa1, faN, dep0, dep1, faAncienApres: ctrFaites(k), stAncien: k.st, stNouveau: n.st, ancienVisitesVivantes: INTS.filter(i => i.type === 'Contrat' && i.ctr === k.id && ['aplanifier', 'planifiee'].includes(i.st)).length }; });
  v('Renouveler : l’ancien garde ses visites faites (' + s2.fa0 + ' → ' + s2.fa1 + '), le renouvelé repart à 0 (' + s2.faN + ')', s2.fa1 === s2.fa0 && s2.faN === 0, s2);
  v('Renouveler puis Mettre fin au renouvelé : l’ancien contrat garde ses visites et ses faites', s2.faAncienApres === s2.fa0 && s2.dep1 >= s2.dep0 - 0, s2);
  await L.aller(p, 'contrat-x-' + s2.ancien); await L.calme(p, 400); const ft = await p.evaluate(() => document.getElementById('contenu').innerText); v('fiche de l’ancien après renouvellement et fin du renouvelé : ni NaN ni undefined', !/NaN|undefined|\[object/.test(ft));
  // ── S3 : l'ordre de fin de plusieurs contrats du même client (deux signés, même fréquence)
  const s3 = await p.evaluate(() => { const cli = CONTRATS.find(x => x.st === 'signe').cli; const k1 = CONTRATS.find(x => x.cli === cli && x.st === 'signe'); const n = { id: 'cy1', num: ctrNum(), cli, modele: k1.modele, titre: k1.titre, freq: k1.freq, prix: k1.prix, fact: k1.fact, st: 'signe', signe: '31/10/2026', debut: ctrFr(AUJ), fin: ctrFinDe(ctrFr(AUJ)), faites: 0 }; CONTRATS.push(n); ctrPoserVisites(n);
    const f0 = ctrFaites(k1); ACTIONS.finContratOk({ dataset: { id: n.id } }); const f1 = ctrFaites(k1); return { k1: k1.id, f0, f1, st: k1.st, n: n.st }; });
  v('deux contrats signés du même client : finir le SECOND ne déplace pas les visites du premier', s3.f0 === s3.f1 && s3.st === 'signe', s3);
  // ── S4 : l'espace du client et le technicien lisent un contrat terminé sans erreur
  await L.fin(c);
  c = await L.ouvrir({ profil, app: false, nuit }); p = c.p; await L.calme(p, 400);
  v('espace client ouvert sans erreur', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  c = await L.ouvrir({ profil, qui: 'sm', hash: 'majournee', nuit }); p = c.p; await L.calme(p, 500);
  const tj = await p.evaluate(() => { ACTIONS.finContratOk && CONTRATS.filter(k => k.st === 'signe').forEach(k => { try { ACTIONS.finContratOk({ dataset: { id: k.id } }); } catch (e) {} }); return document.getElementById('contenu').innerText; });
  await L.aller(p, 'majournee'); await L.calme(p, 400); const tj2 = await p.evaluate(() => document.getElementById('contenu').innerText);
  v('technicien : « Ma journée » après la fin de tous les contrats sans NaN ni undefined', !/NaN|undefined|\[object/.test(tj2));
  v('aucune erreur de page (technicien)', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
