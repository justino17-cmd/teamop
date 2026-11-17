// Le RENOUVELLEMENT et la FIN d'un contrat : ce que le gérant voit à l'approche de l'échéance (Statistiques « À renouveler », Tâches
// « Proposer le renouvellement », la fiche du contrat), l’e-mail proposé, et ce qui change une fois envoyé.
// usage : node contrats-renouvellement.js [profil]
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'statistiques' }); const p = c.p; await L.calme(p, 500);
  // E1 — Statistiques
  const lig = await p.evaluate(() => [...document.querySelectorAll('.st-ctr-l, .st-ctr')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  console.log('  · lignes de contrats dans Statistiques :', JSON.stringify(lig));
  v('E1 : Statistiques annonce le contrat CTR-2026-004 à renouveler (fin le 31/12/2026, dans 61 j)', lig.some(t => /CTR-2026-004/.test(t) && /61 j/.test(t)), lig);
  v('E1 : Statistiques annonce aussi le contrat en attente de signature, avec « Relancer la signature »', lig.some(t => /CTR-2026-011/.test(t) && /Relancer la signature/.test(t)), lig);
  await L.capture(c, O.CAP + `E1-statistiques-renouveler-${profil}.png`);
  const nb = await p.evaluate(() => [...document.querySelectorAll('[data-strelctr]')].map(b => b.innerText.trim() + '|' + b.dataset.strelctr)); console.log('  · boutons :', JSON.stringify(nb));
  // E2 — « Proposer le renouvellement » : l’e-mail
  const sel = '[data-strelctr="c1"]'; await L.toucher(c, sel); await L.calme(p, 400); const e2 = await O.lire(p);
  console.log('  · panneau :', JSON.stringify(e2.panneau));
  v('E2 : « Proposer le renouvellement » ouvre l’e-mail', /renouvellement/i.test(e2.panneau), e2);
  const mail = await p.evaluate(() => { const g = s => { const e = document.querySelector('#calque ' + s); return e ? (e.value !== undefined && e.tagName !== 'BUTTON' ? e.value : e.innerText) : ''; }; return { a: [...document.querySelectorAll('#calque input')].map(i => i.value).join(' | '), corps: [...document.querySelectorAll('#calque textarea')].map(t => t.value).join('\n'), pj: document.querySelector('#calque').innerText.match(/CTR-\S+\.pdf/) }; });
  console.log('  · e-mail :', JSON.stringify(mail).slice(0, 700));
  v('E2 : l’e-mail dit « passés 2 fois sur les 4 visites » (chiffres du contrat)', /2 fois sur les 4 visites/.test(mail.corps), mail.corps.slice(0, 300));
  v('E2 : l’e-mail cite le prix 1 400,00 € HT, soit 1 680,00 € TTC, et 4 visites', /1.400,00 € HT, soit 1.680,00 € TTC par an, 4 visites/.test(mail.corps.replace(/[\s\u202f\u00a0]+/g, ' ')), mail.corps.slice(0, 400));
  await L.capture(c, O.CAP + `E2-e-mail-renouvellement-${profil}.png`);
  const bts = await p.evaluate(() => [...document.querySelectorAll('#calque button')].map(b => b.innerText.trim()).filter(Boolean)); console.log('  · boutons de l’e-mail :', JSON.stringify(bts));
  const env = bts.find(t => /^Envoyer/.test(t)); const av = await p.evaluate(() => ({ j: JOURNAL.length, relance: CONTRATS[0].relance || '' }));
  if (env) { await p.evaluate(() => [...document.querySelectorAll('#calque button')].find(b => /^Envoyer/.test(b.innerText.trim())).click()); await L.calme(p, 600); }
  const ap = await p.evaluate(() => ({ j: JOURNAL.length, relance: CONTRATS[0].relance || '', der: JOURNAL[JOURNAL.length - 1] || JOURNAL[0] })); const e3 = await O.lire(p);
  console.log('  · après l’envoi :', JSON.stringify(ap), JSON.stringify(e3.toast));
  v('E2 : l’envoi se dit (message) et s’inscrit à l’Historique', !!e3.toast && ap.j > av.j, [av, ap, e3.toast]);
  const lig2 = await p.evaluate(() => [...document.querySelectorAll('.st-ctr-l')].map(x => x.innerText.replace(/\s+/g, ' ').trim()));
  v('contrats-07 · E2 : après l’envoi, Statistiques se souvient qu’on a proposé le renouvellement (« proposé le … »)', lig2.some(t => /CTR-2026-004/.test(t) && /propos|relanc|envoy/i.test(t.replace(/Proposer le renouvellement/, ''))), lig2);
  // E3 — la fiche du contrat : fin, renouveler, mettre fin ?
  await L.aller(p, 'contrat-x-c1'); const f = await p.evaluate(() => ({ texte: document.getElementById('contenu').innerText.replace(/\s+/g, ' '), boutons: [...document.querySelectorAll('#contenu button')].map(b => b.innerText.trim()).filter(Boolean) }));
  console.log('  · boutons de la fiche :', JSON.stringify(f.boutons));
  v('contrats-07 · E3 : la fiche du contrat dit quand il se termine (« fin le 31/12/2026 »)', /fin le 31\/12\/2026|jusqu’au 31\/12\/2026|échéance/i.test(f.texte.replace(/Chaque partie peut y mettre fin par écrit au moins un mois avant l’échéance\./, '')), f.texte.slice(0, 200));
  v('contrats-07 · E3 : la fiche propose de renouveler le contrat', f.boutons.some(t => /renouvel/i.test(t)), f.boutons);
  v('contrats-07 · E3 : la fiche permet de mettre fin au contrat', f.boutons.some(t => /mettre fin|résilier|clôturer|arrêter/i.test(t)), f.boutons);
  // E4 — Tâches
  await L.aller(p, 'taches'); await L.toucher(c, '[data-tsuggs]'); await L.calme(p, 500);
  const sug = await p.evaluate(() => (document.getElementById('calque') ? document.getElementById('calque').innerText : '').replace(/\s+/g, ' ')); const mr = sug.match(/Proposer le renouvellement du contrat[^.]{0,140}/g) || [];
  console.log('  · suggestions de Tâches (renouvellement) :', JSON.stringify(mr));
  v('E4 : Tâches propose « Proposer le renouvellement du contrat CTR-2026-004 » (fin dans 61 jours)', mr.some(t => /CTR-2026-004/.test(t)), mr);
  v('E4 : Tâches ne propose pas de renouveler un contrat à 150 jours (CTR-2026-007)', !mr.some(t => /CTR-2026-007/.test(t)), mr);
  await L.capture(c, O.CAP + `E4-taches-${profil}.png`);
  console.log('err', c.err.length, c.err.slice(0, 5));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
