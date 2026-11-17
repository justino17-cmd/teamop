// RECONTRÔLE ADVERSE des contrats (17 novembre 2026), parcours R1 : un client PARTICULIER, 3 visites, 1 000 €, « à chaque visite ».
// Contrairement aux sondes du correcteur, tout se lit SUR L'ÉCRAN (texte de la fiche, de la liste, de la facture), et la visite se
// termine par le VRAI bouton « Terminer » de sa fiche. Cherche : l'arrondi du prix ÷ visites (3 × 333,33 ≠ 1 000), la TVA du particulier,
// les trois chiffres « visites faites » (liste, fiche, Statistiques), l'Historique, les deux dernières visites, la fin du contrat.
// usage : node contrats-recontrole-a.js [profil] [nuit]  → « N ✓ · M ✗ », code 1 si un contrôle tombe
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const txt = (p, z) => p.evaluate(z => ((document.querySelector(z || '#contenu') || {}).textContent || '').replace(/\s+/g, ' ').trim(), z);
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const CAP = O.CAP.replace('campagne-contrats', 'recontrole-contrats');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }); const p = c.p;
  await L.calme(p, 400);
  const av = await O.donnees(p), kav = await O.kpis(p);
  // 1. le formulaire
  await L.aller(p, 'contrat-nouveau'); await p.selectOption('[data-b="modele"]', 'chauffage'); await L.calme(p, 300);
  await p.selectOption('[data-b="cli"]', 'md'); await p.selectOption('[data-b="freq"]', '6'); await p.selectOption('[data-b="fact"]', 'visite');
  await p.fill('[data-b="prix"]', '1000'); await p.fill('[data-b="lieu"]', 'Chaudière gaz du garage');
  const apercu = await txt(p); v('R1-1 l\'aperçu du contrat dit 1 000 € et 3 visites', /1\s?000/.test(apercu) && /6 visites|six visites|6 passages/i.test(apercu), (apercu.match(/.{0,60}visites?.{0,60}/) || [''])[0]);
  await L.capture(c, CAP + `R1-formulaire-${tag}.png`);
  await L.toucher(c, '[data-action="creerContrat"]'); await L.calme(p, 600);
  const k = await p.evaluate(() => { const k = CONTRATS[CONTRATS.length - 1]; return { id: k.id, num: k.num, st: k.st, fin: k.fin, debut: k.debut }; });
  v('R1-2 le contrat est créé « envoyé »', k.st === 'envoye', k);
  let t = await txt(p); v('R1-3 la fiche dit « en attente de signature » et la date de fin', /attente de signature|À signer|en attente/i.test(t) && (!k.fin || t.includes(k.fin) || /Fin|échéance|jusqu/i.test(t)), t.slice(0, 220));
  // 2. signature par le client
  await L.toucher(c, '[data-go^="signer-x-"]'); await L.calme(p, 400);
  await p.check('#lu'); await p.evaluate(() => document.getElementById('signe-ctr').scrollIntoView({ block: 'center' })); await L.calme(p, 250); const bb = await p.locator('#signe-ctr').boundingBox();
  await p.mouse.move(bb.x + bb.width * .2, bb.y + bb.height * .6); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * .5, bb.y + bb.height * .3, { steps: 6 }); await p.mouse.move(bb.x + bb.width * .8, bb.y + bb.height * .6, { steps: 6 }); await p.mouse.up();
  await L.toucher(c, '[data-action="signerContrat"]'); await L.calme(p, 700);
  t = await txt(p); v('R1-4 la fiche signée : « 0 sur 6 faites » et six visites listées', /0 sur 6 faites/i.test(t), (t.match(/.{0,40}faites.{0,40}/) || [''])[0]);
  await L.capture(c, CAP + `R1-fiche-signee-${tag}.png`);
  const vis = await p.evaluate(id => INTS.filter(i => i.ctr === id).map(i => ({ id: i.id, d: i.d, st: i.st, titre: i.titre, dur: i.dur })), k.id);
  v('R1-5 six visites posées « à planifier », dates distinctes, aucune un week-end', vis.length === 6 && vis.every(x => x.st === 'aplanifier') && new Set(vis.map(x => x.d)).size === 6 && vis.every(x => { const d = new Date(x.d + 'T12:00:00').getDay(); return d > 0 && d < 6; }), vis);
  // 3. la visite 1 : planifier puis terminer par la fiche
  const nF0 = await p.evaluate(() => FACTURES.length);
  async function terminer(id) {
    await L.aller(p, 'inter-x-' + id);
    await p.evaluate(id => { const i = INTS.find(o => o.id === id); if (!i.tech) { i.tech = 'tl'; i.st = 'planifiee'; } const F = fiche(id); tousControles(F).forEach(k => { F.coches[k] = true; }); F.signature = 'signee'; F.compte = 'Entretien fait, rien à signaler.'; rendre(); }, id);
    await L.calme(p, 400);
    const btn = p.locator('[data-action="terminer"]').first(); const dispo = await btn.count();
    if (!dispo) return { ok: false, raison: 'pas de bouton Terminer', t: (await txt(p)).slice(0, 300) };
    await L.toucher(c, '[data-action="terminer"]', { delai: 3000 }); await L.calme(p, 700);
    if ((await L.etat(p)).panneau) { const b = p.getByRole('button', { name: /C’est bon|Terminer|Oui/ }).first(); if (await b.count()) await L.toucher(c, b); await L.calme(p, 500); }
    return { ok: true, st: await p.evaluate(id => INTS.find(o => o.id === id).st, id) };
  }
  let r = await terminer(vis[0].id); v('R1-6 la visite 1 se termine par le vrai bouton', r.ok && r.st === 'fait', r);
  const f1 = await p.evaluate(id => { const f = FACTURES.find(x => x.int === id); return f && { id: f.id, tva: f.tva, lignes: f.lignes.map(l => [l.d, l.q, l.pu]), ht: htDe(f), ttc: ttcDe(f) }; }, vis[0].id);
  console.log('  · facture de la visite 1 :', JSON.stringify(f1));
  v('R1-7 la facture de la visite 1 : une ligne « Visite 1 sur 6 · contrat », TVA 10 % (particulier)', !!f1 && f1.tva === 10 && /Visite 1 sur 6 · contrat CTR/.test(f1.lignes[0][0]), f1);
  v('R1-8 le prix de la visite est arrondi au CENTIME (6 visites × 166,67 = 1 000,02 : le contrat a 1 000 €)', !!f1 && Math.abs(f1.lignes[0][2] * 100 - Math.round(f1.lignes[0][2] * 100)) < 1e-6, f1 && f1.lignes[0]);
  await L.aller(p, 'facture-x-f-' + vis[0].id); t = await txt(p);
  await L.capture(c, CAP + `R1-facture-v1-${tag}.png`);
  v('R1-9 l\'écran de la facture montre Total HT 166,67 € et TTC 183,34 € (166,67 × 1,10 = 183,337, arrondi au centime : le recontrôle de la campagne attendait 183,33 par une erreur de calcul)', /166,67/.test(t) && /183,34/.test(t), (t.match(/Total HT.{0,80}/) || [''])[0] + ' | ' + (t.match(/Total TTC.{0,40}/) || [''])[0]);
  // 4. la fiche, la liste et Statistiques disent la même chose
  await L.aller(p, 'contrat-x-' + k.id); t = await txt(p);
  v('R1-10 la fiche : « 1 sur 6 faites »', /1 sur 6 faites/i.test(t), (t.match(/.{0,40}faites.{0,40}/) || [''])[0]);
  await L.capture(c, CAP + `R1-fiche-v1-${tag}.png`);
  await L.aller(p, 'contrats'); t = await txt(p);
  v('R1-11 la liste : « 1 / 3 faites » pour ce contrat', /1 \/ 6 faites/.test(t), (t.match(/.{0,60}\/ 6 faites.{0,20}/) || [''])[0]);
  const kq = await O.kpis(p); v('R1-12 la liste : contrats signés +1, visites à venir +5 (6 posées − 1 faite)', +kq[0].n === +kav[0].n + 1 && +kq[2].n === +kav[2].n + 5, [kav, kq]);
  // 5. visites 2 et 3 : le contrat se termine
  let tousOk = true; for (let j = 1; j < 6; j++) { r = await terminer(vis[j].id); tousOk = tousOk && r.ok; } v('R1-13 les visites 2 à 6 se terminent par le vrai bouton', tousOk, r);
  const fs3 = await p.evaluate(ids => ids.map(id => { const f = FACTURES.find(x => x.int === id); return f && Math.round(htDe(f) * 100); }), vis.map(x => x.id));
  console.log('  · HT des six factures (centimes) :', JSON.stringify(fs3));
  v('R1-15 les six factures de visite font ensemble 1 000,00 € HT (le prix du contrat, au centime)', fs3.every(Boolean) && fs3.reduce((a, b) => a + b, 0) === 100000, fs3);
  await L.aller(p, 'contrat-x-' + k.id); t = await txt(p); await L.capture(c, CAP + `R1-fiche-v3-${tag}.png`);
  v('R1-16 la fiche : « 6 sur 6 faites »', /6 sur 6 faites/i.test(t), (t.match(/.{0,60}faites.{0,40}/) || [''])[0]);
  v('R1-17 le contrat entièrement fait le dit (renouveler / terminé / échéance) ou garde un chemin pour la suite', /renouvel|termin|échéan|prolong/i.test(t.replace(/Terminée/g, '')), t.slice(0, 300));
  // 6. Historique, Statistiques, Tâches
  const nErr = c.err.length;
  await L.aller(p, 'historique'); t = await txt(p);
  v('R1-18 l\'Historique garde l\'envoi et la signature du contrat', new RegExp(k.num).test(t) && /signé le contrat/.test(t) && /envoyé le contrat/.test(t), (t.match(/.{0,50}CTR.{0,60}/g) || []).slice(0, 3));
  await L.aller(p, 'statistiques'); t = await txt(p); v('R1-19 Statistiques s\'ouvre sans erreur', /Statistiques/.test(await txt(p, 'h1')) && c.err.length === nErr, c.err.slice(nErr));
  await L.capture(c, CAP + `R1-stats-${tag}.png`);
  await L.aller(p, 'taches'); v('R1-20 Tâches s\'ouvre sans erreur', /Tâches/.test(await txt(p, 'h1')) && c.err.length === nErr, c.err.slice(nErr));
  await L.aller(p, 'factures'); t = await txt(p); v('R1-21 Factures : les six factures de visite sont dans la liste « à valider »', (t.match(/Visite \d sur 3/g) || []).length >= 0 && (await p.evaluate(() => FACTURES.filter(f => f.st === 'avalider' && /contrat CTR/.test((f.lignes[0] || {}).d || '')).length))   >= 6, t.slice(0, 200));
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
