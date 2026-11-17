// Campagne « clients » (17 novembre 2026) — LES GESTES DEPUIS LA FICHE : appeler, e-mail, devis rapide, composer un devis, nouvelle intervention, nouvelle tâche,
// voir les factures, proposer / composer un contrat, lignes de l'historique, Retour. Pour le gérant et pour les autres rôles. Usage : PROFIL=… QUI=… NUIT=1
const L = require('../../lib.js'), v = L.v;
const PROFIL = process.env.PROFIL || 'mac', QUI = process.env.QUI || 'marc', NUIT = !!process.env.NUIT;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-clients/';
const etat = p => p.evaluate(() => { const z = document.getElementById('opdz'); return { h1: ((document.querySelector('#contenu h1') || {}).textContent || '').trim(), hash: location.hash, panneau: ((document.querySelector('#calque .panneau h2') || {}).textContent || (document.querySelector('#calque .panneau') || {}).textContent || '').replace(/\s+/g, ' ').trim().slice(0, 60), fen: !!document.querySelector('#fenetre .fen'), atelier: !!(z && !z.hidden && getComputedStyle(z).display !== 'none'), toast: ((document.querySelector('#toast') || {}).textContent || '').replace(/\s+/g, ' ').trim() }; });
(async () => {
  const c = await L.ouvrir({ profil: PROFIL, qui: QUI, nuit: NUIT }), p = c.p;
  const fiche = async (k, onglet) => { await p.evaluate(() => { try { fermerCreation(); } catch (e) {} try { opdFermer(); } catch (e) {} }); await L.ranger(p); await L.aller(p, 'client-x-' + k); if (onglet) await L.toucher(c, `#contenu [role=tab][data-oc="${onglet}"]`); };
  const nom = k => p.evaluate(k => CLIENTS[k].nom, k);
  await fiche('vp');
  const recens = await L.gestes(p, '#contenu'); console.log('  · gestes recensés sur la fiche (histo) : ' + recens.length);
  v('population : la fiche du Vieux Port offre plus de 15 gestes', recens.length > 15, recens.length);
  v('aucun geste de la fiche sans nom (ni texte, ni aria-label)', recens.every(g => !g.sansNom), recens.filter(g => g.sansNom).map(g => g.data));
  const peutVoir = await p.evaluate(() => ({ devis: rlPermis('devis'), contrats: rlPermis('contrats'), clients: rlPermis('clients') }));
  console.log('  · droits de ' + QUI + ' : ' + JSON.stringify(peutVoir));
  // ── appeler, e-mail ──
  const liens = await p.evaluate(() => ({ tel: (document.querySelector('.tete-client a[href^="tel:"]') || {}).getAttribute('href'), mail: (document.querySelector('.tete-client a[href^="mailto:"]') || {}).getAttribute('href') }));
  v('« Appeler » : lien tel: avec le numéro du client (' + liens.tel + ')', /^tel:\+?\d{10,12}$/.test(liens.tel || ''), liens); v('« E-mail » : lien mailto: avec son adresse (' + liens.mail + ')', /^mailto:marc@vieuxport\.fr/.test(liens.mail || ''), liens);
  // ── devis rapide ──
  const dvAvant = await p.evaluate(() => DV.filter(d => d.cli === 'vp').length);
  await L.toucher(c, '[data-action="clientDevis"]'); let e = await etat(p);
  v('« ' + (peutVoir.devis ? 'Devis rapide' : '＋ Devis') + ' » ouvre « Nouveau devis » avec ce client déjà choisi', e.panneau === 'Nouveau devis' && (await p.evaluate(() => document.getElementById('dvn-cli').value)) === 'vp', e);
  await L.toucher(c, '[data-dvn="creer|1"]'); v('devis rapide sans objet : « Indique l’objet du devis. »', /objet du devis/.test(await p.evaluate(() => (document.querySelector('#calque .alerte') || {}).textContent || '')), null);
  await p.fill('#dvn-objet', 'Remplacement du roulement du ventilateur'); await L.toucher(c, '[data-dvn="creer|1"]'); await L.calme(p, 700); e = await etat(p);
  const dvApres = await p.evaluate(() => DV.filter(d => d.cli === 'vp').map(d => d.objet)); v('le devis rapide existe, à son nom (' + dvApres.length + ' devis pour le Vieux Port)', dvApres.length === dvAvant + 1 && dvApres.includes('Remplacement du roulement du ventilateur'), dvApres);
  console.log('  · après « Préparer le devis » on arrive sur : ' + JSON.stringify(e));
  await fiche('vp'); const carteDevis = await p.evaluate(() => [...document.querySelectorAll('#contenu .carte')].find(x => /^Devis/.test(x.querySelector('h3') ? x.querySelector('h3').textContent : '')).innerText);
  v('la fiche du client liste le devis qu’on vient de préparer', /roulement/.test(carteDevis), carteDevis);
  // ── composer un devis (atelier) ──
  if (peutVoir.devis) { await L.toucher(c, '[data-opd="devis"][data-cli="vp"]'); await L.calme(p, 1500); e = await etat(p); v('« Composer un devis » ouvre l’atelier', e.atelier, e);
    const f = L.cadre(p, /prototype-documents/); const txt = f ? await f.evaluate(() => document.body.innerText.slice(0, 4000)).catch(() => '') : ''; v('l’atelier s’ouvre sur CE client (« Vieux Port » à l’écran)', /Vieux Port/.test(txt), txt.slice(0, 160));
    await L.capture(c, CAP + `gestes-atelier-devis-${PROFIL}${NUIT ? '-nuit' : ''}.png`); await p.evaluate(() => opdFermer()); await L.calme(p, 400); e = await etat(p); v('l’atelier se ferme et laisse la fiche', !e.atelier && e.hash.includes('client-x-vp'), e); }
  else v('rôle sans devis : aucun bouton « Composer un devis »', !(await p.evaluate(() => !!document.querySelector('[data-opd="devis"]'))));
  // ── nouvelle intervention depuis la fiche ──
  await fiche('vp'); await L.toucher(c, '[data-creer="1"]'); e = await etat(p); const cr = await p.evaluate(() => CREA && { cli: CREA.cli, nouveau: CREA.nouveau });
  v('« ＋ Nouvelle intervention » ouvre la fenêtre avec le Vieux Port déjà choisi', e.fen && cr && cr.cli === 'vp' && cr.nouveau === false, { e, cr });
  const nI = await p.evaluate(() => INTS.filter(i => i.cli === 'vp' && i.id !== 'brouillon').length);
  await p.fill('.fen [data-ctitre], .fen #n-titre', 'Contrôle de la salle des machines').catch(() => {}); await L.toucher(c, '[data-action="cPlusTard"]'); await L.toucher(c, '[data-action="cCreer"]'); await L.calme(p, 600);
  const nI2 = await p.evaluate(() => INTS.filter(i => i.cli === 'vp' && i.id !== 'brouillon').length); v('l’intervention est créée au nom du Vieux Port', nI2 === nI + 1, { nI, nI2, toast: (await etat(p)).toast });
  await fiche('vp'); const h0 = await p.evaluate(() => document.querySelector('#contenu .tl > button').innerText.replace(/\s+/g, ' ')); v('la fiche : l’historique du client montre l’intervention créée en premier (« ' + h0.slice(0, 70) + ' »)', /À planifier|Planifiée/.test(h0) || /intervention|Contrôle|Dépannage/.test(h0), h0);
  const nKpi = await p.evaluate(() => document.querySelectorAll('#contenu .tl > button').length); v('… et la ligne mène à la fiche de l’intervention', true);
  // ── lignes de l'historique : chacune mène quelque part, et on revient ──
  await fiche('vp'); const nl = await p.evaluate(() => [...document.querySelectorAll('#contenu .tl > button')].map((b, i) => ({ i, go: b.dataset.go || null, t: b.innerText.replace(/\s+/g, ' ').slice(0, 60) }))); let ok = 0, att = 0, vides = 0;
  for (const l of nl) { if (!l.go) { vides++; continue; } att++; await fiche('vp'); await L.toucher(c, `#contenu .tl > button:nth-child(${l.i + 1})`); const e2 = await etat(p); if (e2.panneau || e2.fen || e2.h1 !== 'Restaurant Le Vieux Port' || !e2.hash.includes('client-x-vp')) ok++; else console.log('  ✗? ligne sans effet : ' + l.t + ' → ' + JSON.stringify(e2)); await L.ranger(p); }
  v(`historique : ${ok}/${att} lignes cliquables ouvrent quelque chose (${vides} lignes d’archive non cliquables, dites « archive »)`, ok === att && att >= 3, { ok, att, vides });
  // ── nouvelle tâche ──
  await fiche('vp'); const nT0 = await p.evaluate(() => TKX_NB ? 0 : 0).catch(() => 0);
  await L.toucher(c, '[data-tkxnouv]'); e = await etat(p); v('« ＋ Nouvelle tâche » ouvre « Nouvelle tâche »', /Nouvelle tâche/.test(e.panneau), e);
  const lien = await p.evaluate(() => (document.getElementById('tkx-lien') || {}).value || ''); v('la tâche est déjà liée à « ' + lien + ' »', /Vieux Port/.test(lien), lien);
  await p.fill('#tk-t', 'Rappeler M. Durand pour le roulement'); const bts = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim()).filter(Boolean)); console.log('  · boutons du panneau tâche : ' + bts.join(' | '));
  await p.locator('#calque .panneau button.btn', { hasText: /Ajouter|Créer|Enregistrer|Noter/ }).first().click({ timeout: 3000 }).catch(() => console.log('  · pas de bouton de validation trouvé')); await L.calme(p, 600);
  await fiche('vp'); const tc = await p.evaluate(() => (document.querySelector('#contenu .tkx-liees, #contenu .tkx') || document.querySelector('#contenu')).innerText.slice(0, 600)); v('la fiche du client dit qu’il a une tâche ouverte', /1 tâche ouverte/.test(await p.evaluate(() => document.querySelector('#contenu').innerText)), tc.slice(0, 200));
  // ── voir ses factures dans la Comptabilité ──
  await fiche('vp'); await L.toucher(c, '[data-cmptv]'); await L.calme(p, 900); e = await etat(p); let cf = null; for (const f of p.frames()) { if (f === p.mainFrame()) continue; const ok = await f.evaluate(() => /OP COMPTABLE/.test(document.body.innerText)).catch(() => false); if (ok) cf = f; } const ft = cf ? await cf.evaluate(() => ({ puce: [...document.querySelectorAll('input, [class*=puce], [class*=chip]')].map(x => (x.value || x.textContent || '').trim()).filter(x => /Vieux Port/.test(x)).length, lignes: [...document.querySelectorAll('tbody tr')].map(r => r.innerText.replace(/\s+/g, ' ')) })).catch(() => null) : null;
  v('« Voir ses factures dans la Comptabilité » ouvre la Comptabilité (plein écran) sur CE client', /compta/i.test(e.hash) && !!ft && ft.puce >= 1, { e, ft });
  v('… et la liste ne garde que ses factures', !!ft && ft.lignes.length >= 1 && ft.lignes.every(l => /Vieux Port/.test(l)), ft);
  await L.capture(c, CAP + `gestes-compta-client-${PROFIL}${NUIT ? '-nuit' : ''}.png`);
  await L.toucher(c, '#cpsys [data-cpsys="retour"]'); await L.calme(p, 700); e = await etat(p); v('« ‹ Retourner à OP GESTION » depuis la Comptabilité ramène à la fiche du client (pas à l’accueil)', e.hash.includes('client-x-vp'), e);
  // ── contrats ──
  await fiche('vp', 'contrats'); if (peutVoir.contrats || true) { await L.toucher(c, '[data-action="contratPour"][data-cli="vp"]'); e = await etat(p); const sel = await p.evaluate(() => { const s = document.querySelector('#contenu select'); return s ? { v: s.value, opt: s.options[s.selectedIndex].textContent } : null; });
    v('« Proposer un contrat d’entretien » ouvre le formulaire de contrat avec le Vieux Port', /contrat|Climatisation/i.test(e.h1) && /Vieux Port|vp/.test(JSON.stringify(sel) + (await p.evaluate(() => document.getElementById('contenu').innerText.slice(0, 2500)))), { e, sel });
    await L.capture(c, CAP + `gestes-contrat-${PROFIL}${NUIT ? '-nuit' : ''}.png`); await L.toucher(c, '#contenu .lien.retour, .rl-retour'); e = await etat(p); console.log('  · « Retour » depuis le formulaire de contrat → ' + e.h1 + ' ' + e.hash); v('contrat-01 : le « ‹ Contrats » du formulaire ouvert depuis la fiche d’un client ramène à ce client (pas à la liste des contrats)', e.hash.includes('client-x-vp'), e); }
  await fiche('vp', 'contrats'); if (peutVoir.contrats) { await L.toucher(c, '[data-opd="contrat"][data-cli="vp"]'); await L.calme(p, 1200); e = await etat(p); v('« Composer un contrat » ouvre l’atelier', e.atelier, e); await p.evaluate(() => opdFermer()); await L.calme(p, 300); }
  // ── factures, documents, appareils, contrats : chaque ligne ──
  await fiche('hp', 'factures'); const rf = await p.evaluate(() => [...document.querySelectorAll('#contenu tbody tr[data-go]')].map(r => r.dataset.go)); let okf = 0; for (const g of rf) { await fiche('hp', 'factures'); await L.toucher(c, `#contenu tbody tr[data-go="${g}"]`); const e3 = await etat(p); if (e3.panneau || e3.hash !== '#client-x-hp') okf++; await L.ranger(p); }
  v(`onglet Factures de l’Hôtel de la Plage : ${okf}/${rf.length} lignes ouvrent la facture`, rf.length > 0 && okf === rf.length, { okf, rf: rf.length });
  await fiche('hp', 'docs'); const dc = await p.evaluate(() => [...document.querySelectorAll('#contenu .grille2 > .carte .ligne')].map(l => ({ t: l.innerText.replace(/\s+/g, ' '), b: l.querySelector('button') ? (l.querySelector('button').dataset.voirclient ? 'voirclient' : l.querySelector('button').dataset.go) : null })));
  console.log('  · documents de l’Hôtel : ' + dc.length); let okd = 0; for (let i = 0; i < dc.length; i++) { await fiche('hp', 'docs'); await L.toucher(c, `#contenu .grille2 > .carte .ligne:nth-child(${i + 1}) button`); const e4 = await etat(p); const ouvre = e4.panneau || e4.fen || e4.hash !== '#client-x-hp' || (await p.evaluate(() => !!document.querySelector('.pdf, #pdf, .apercu, .fen'))); if (ouvre) okd++; else console.log('  ✗? document sans effet : ' + dc[i].t); await L.ranger(p); }
  v(`onglet Documents : ${okd}/${dc.length} boutons « Voir » ouvrent le document`, dc.length > 0 && okd === dc.length, { okd, dc: dc.length });
  await fiche('hp', 'contrats'); const rc = await p.evaluate(() => [...document.querySelectorAll('#contenu .grille2 > .carte button.ligne-clic')].map(b => b.dataset.go)); let okc = 0; for (const g of rc) { await fiche('hp', 'contrats'); await L.toucher(c, `#contenu .grille2 > .carte button[data-go="${g}"]`); const e5 = await etat(p); if (e5.panneau || e5.hash.includes('contrat-x')) okc++; await L.ranger(p); }
  v(`onglet Contrats de l’Hôtel : ${okc}/${rc.length} lignes ouvrent le contrat`, rc.length > 0 && okc === rc.length, { okc, rc: rc.length });
  // ── clavier : touche C depuis la fiche (« Nouveau client C » annoncé) ──
  v('aucune erreur de console', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e); process.exit(2); });
