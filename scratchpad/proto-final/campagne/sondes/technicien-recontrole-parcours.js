// Recontrôle ADVERSE de la partie « technicien » : trois parcours de bout en bout par KARIM (chef d'équipe) — le technicien fait, le gérant décide, le technicien relit la décision.
//   P1 congé : demande → le gérant REFUSE (avec un motif) → Karim lit le refus → nouvelle demande → le gérant VALIDE → Karim lit « acceptée »
//   P2 frais : note sans ticket + note avec ticket → le gérant valide l'une, demande le ticket de l'autre → Karim voit l'état de chacune
//   P3 journée : Commencer → fiche → compte rendu → Terminer → le gérant voit l'intervention terminée et le compte rendu
// Usage : node technicien-recontrole-parcours.js [profil] [nuit=0|1] [parcours=P1,P2,P3]
const L = require('../../lib.js'), v = L.v, I = require('./interventions-outils.js');
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien-recontrole/';
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour', P = (process.argv[4] || 'P1,P2,P3').split(',');
  const c = await L.ouvrir({ profil, qui: 'kb', nuit, hash: 'majournee' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  const panneau = () => txt(p, '#calque .panneau');
  const cap = n => L.capture(c, CAP + `${n}-${profil}-${J}.png`);
  const sans = async nom => { const d = await L.deborde(c); v(`${nom} : pas de glissement latéral`, d.bouge === 0, d); };

  if (P.includes('P1')) {
    await L.aller(p, 'absences');
    const d0 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'kb').length);
    await L.toucher(c, '[data-atdem]'); await L.calme(p, 400);
    await p.fill('#ad-du', '2026-12-14'); await p.fill('#ad-au', '2026-12-15'); await p.selectOption('#ad-ty', 'Congé payé'); await p.fill('#ad-m', 'Rendez-vous médical à Poitiers lundi, retour le mardi matin'); await L.calme(p, 250);
    const ap = await txt(p, '#ad-apercu'); console.log('   aperçu :', ap);
    await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 500);
    v('P1a Karim : la demande de congé est enregistrée (+1)', (await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'kb').length)) === d0 + 1, { t: await toast() });
    const id1 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'kb').slice(-1)[0].id);
    await cap('p1-attente');
    // le gérant refuse, avec un motif
    await devenir(p, 'marc', 'absences'); await p.evaluate(() => document.querySelector('[data-aonglet="valider"]').click()); await L.calme(p, 400);
    const aTrouve = await p.$(`[data-anon="${id1}"]`); v('P1b le gérant voit la demande de Karim à valider (« Refuser… »)', !!aTrouve, (await txt(p)).slice(0, 200));
    if (aTrouve) { await L.toucher(c, `[data-anon="${id1}"]`); await L.calme(p, 400);
      const pn = await panneau(); console.log('   fenêtre Refuser :', pn.slice(0, 260));
      const champ = await p.$('#calque .panneau textarea, #calque .panneau input[type=text]'); if (champ) await champ.fill('Période de forte charge : deux départs la même semaine.');
      const bt = await p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Refuser|Envoyer|Confirmer/.test(x.textContent) && !/Annuler/.test(x.textContent)); if (!b) return ''; b.click(); return b.textContent.trim(); });
      await L.calme(p, 500); console.log('   bouton touché :', bt, '| toast :', await toast()); }
    // Karim lit le refus
    await devenir(p, 'kb', 'absences'); const pk = await txt(p); console.log('   Karim relit :', pk.slice(0, 600));
    v('P1c Karim lit que sa demande est refusée, et pourquoi', /refus/i.test(pk) && /forte charge|deux départs/.test(pk), pk.slice(0, 300));
    await cap('p1-refus'); await sans('P1c');
    // seconde demande, validée
    await L.toucher(c, '[data-atdem]'); await L.calme(p, 400); await p.fill('#ad-du', '2026-12-07'); await p.fill('#ad-au', '2026-12-07'); await p.fill('#ad-m', 'Déménagement'); await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 500);
    const id2 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'kb').slice(-1)[0].id);
    const soldeAvant = await p.evaluate(() => (typeof soldeDe === 'function' ? JSON.stringify(soldeDe('kb')) : ''));
    await devenir(p, 'marc', 'absences'); await p.evaluate(() => document.querySelector('[data-aonglet="valider"]').click()); await L.calme(p, 400);
    const ok = await p.$(`[data-aok="${id2}"]`); v('P1d le gérant voit la seconde demande avec « Valider »', !!ok);
    if (ok) { await L.toucher(c, `[data-aok="${id2}"]`); await L.calme(p, 500); console.log('   Valider : toast', await toast(), '| fenêtre', (await panneau()).slice(0, 160)); }
    await devenir(p, 'kb', 'absences'); const pk2 = await txt(p); console.log('   Karim relit :', pk2.slice(0, 500));
    v('P1e Karim lit que la demande du 7 décembre est acceptée', /accept|valid/i.test(pk2) && /7 d[ée]c/i.test(pk2), pk2.slice(0, 300));
    await cap('p1-accepte');
    const lib = await p.evaluate(() => [...document.querySelectorAll('#contenu button')].filter(b => b.offsetParent).map(b => b.textContent.trim().slice(0, 30)).slice(0, 14)); console.log('   boutons de Mes congés :', lib.join(' | '));
  }

  if (P.includes('P2')) {
    await L.aller(p, 'techfrais');
    const nb = () => p.evaluate(() => NDF.filter(n => n.qui === 'kb').length), n0 = await nb();
    await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); await p.fill('#rn-pr', 'Péage A10 Saintes-Niort, aller-retour pour le dépannage de la copropriété'); await p.fill('#rn-m', '8,40'); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 500);
    await L.toucher(c, '[data-rl="ndf"]'); await L.calme(p, 300); await p.fill('#rn-pr', 'Gants et chiffons'); await p.fill('#rn-m', '23,10');
    await p.setInputFiles('#rn-p', { name: 'ticket-bricolage.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200); await L.toucher(c, '[data-rl="ndfok"]'); await L.calme(p, 500);
    await p.evaluate(() => { const b = document.querySelector('#rn-dbl [data-axa="dblautre"]'); if (b) b.click(); }); await L.calme(p, 300);
    v('P2a Karim a créé deux notes (+2)', (await nb()) === n0 + 2, { n0, n: await nb(), t: await toast() });
    /* la liste des notes est triée par date : on retrouve les deux nôtres par ce qu'on y a écrit, jamais par leur rang */
    const ids = await p.evaluate(() => ['Péage A10 Saintes-Niort', 'Gants et chiffons'].map(o => (NDF.filter(n => n.qui === 'kb' && n.objet.includes(o))[0] || {}).id)); await cap('p2-liste');
    await devenir(p, 'marc', 'achats'); await p.evaluate(() => document.querySelector('[data-ac="onglet|notes"]').click()); await L.calme(p, 500);
    const tm = await txt(p); v('P2b le gérant voit les deux notes de Karim (8,40 € et 23,10 €)', /8,40/.test(tm) && /23,10/.test(tm) && /Karim/.test(tm), tm.slice(0, 300));
    await cap('p2-gerant');
    // note sans ticket : « Demander le ticket » ; note avec ticket : « Valider »
    console.log('   ids des deux notes :', JSON.stringify(ids), '| gestes de Marc :', (await L.gestes(p, '#contenu')).filter(g => /ndf/.test(g.data)).map(g => g.data.slice(0, 40)).join(' ; '));
    const sansT = await p.$(`[data-ac="ndfticket|${ids[0]}"]`), avecT = await p.$(`[data-ac="ndfok|${ids[1]}"]`);
    v('P2c le gérant peut demander le ticket (sans ticket) et valider (avec ticket)', !!sansT && !!avecT);
    if (sansT) { await p.evaluate(x => document.querySelector(`[data-ac="ndfticket|${x}"]`).click(), ids[0]); await L.calme(p, 500); console.log('   Demander le ticket :', await toast(), '|', (await panneau()).slice(0, 160)); const b = await p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(x => /Demander|Envoyer|Confirmer/.test(x.textContent) && !/Annuler/.test(x.textContent)); if (!b) return ''; b.click(); return b.textContent.trim(); }); await L.calme(p, 400); console.log('   confirmé :', b, '|', await toast()); }
    if (avecT) { await p.evaluate(x => document.querySelector(`[data-ac="ndfok|${x}"]`).click(), ids[1]); await L.calme(p, 500); console.log('   Valider :', await toast()); }
    await devenir(p, 'kb', 'techfrais'); const tk = await txt(p); console.log('   Karim relit :', tk.slice(0, 700));
    v('P2d Karim voit la note à 23,10 € validée / à rembourser', /23,10/.test(tk) && /valid|rembours|accept/i.test(tk), tk.slice(0, 300));
    v('P2e Karim voit qu’on lui demande le ticket de la note à 8,40 €', /8,40/.test(tk) && /ticket/i.test(tk), tk.slice(0, 300));
    await cap('p2-karim'); await sans('P2');
  }

  if (P.includes('P3')) {
    await L.aller(p, 'majournee');
    await L.toucher(c, '[data-rl="go|inter-x-i3"]'); await L.calme(p, 700);
    v('P3a « Commencer » ouvre la fiche de la récupération de fluide', /Récupération/.test(await txt(p, '#contenu h1')), await txt(p, '#contenu h1'));
    // le nom du client est un lien « › » : il ouvre la fiche du client par-dessus (appareils, derniers passages), jamais rien
    const route0 = await p.evaluate(() => route), lien = await p.$('#contenu [data-go^="client-x"]');
    if (lien) { await p.evaluate(() => document.querySelector('#contenu [data-go^="client-x"]').click()); await L.calme(p, 600);
      const pan = await p.evaluate(() => (document.querySelector('.panneau') || {}).textContent || ''); v('P3b le nom du client ouvre sa fiche par-dessus, avec « Retour »', /Retour/.test(pan) && /appareils/i.test(pan), pan.replace(/\s+/g, ' ').slice(0, 120));
      await cap('p3-fiche-client'); await L.ranger(p); await L.calme(p, 300); }
    await p.fill('textarea[data-champ="trouve"]', 'Local technique accessible, fluide R32 récupéré sur le split du sous-sol, pas de fuite visible.'); await L.calme(p, 250);
    const compte = await p.$('textarea[data-champ="compte"]'); if (compte) await p.fill('textarea[data-champ="compte"]', 'Nous avons récupéré le fluide de l’ancien split, avec la bouteille notée au registre.');
    await p.evaluate(() => document.querySelector('[data-action="terminer"]').click()); await L.calme(p, 600);
    const manque = await panneau(); v('P3c « Terminer » trop tôt dit ce qui manque (les contrôles, la signature), sans rien terminer', /il manque/i.test(manque) && /signature/.test(manque) && (await p.evaluate(() => INTS.find(i => i.id === 'i3').st)) !== 'fait', manque.slice(0, 200));
    await cap('p3-manque'); await L.ranger(p); await L.calme(p, 300);
    // on fait ce qui manque : chaque contrôle, la signature au doigt (ou à la souris), puis « Terminer »
    const ctrl = await p.evaluate(() => [...document.querySelectorAll('[data-ctrl]')].map(e => e.dataset.ctrl));
    for (const k of ctrl) { await p.evaluate(x => { const e = [...document.querySelectorAll('[data-ctrl]')].find(y => y.dataset.ctrl === x); if (e && e.type === 'checkbox') { if (!e.checked) e.click(); } else if (e) e.click(); }, k); await L.calme(p, 120); }
    await I.signer(c, '#signe'); const F = await I.F(p, 'i3'); v('P3d les contrôles et la signature sont pris (le manque est vide ou ne parle que du paiement)', !F.manque.some(m => /contrôle|signature|alimentation|ventilateur|fuite|charge|filtres|essai/i.test(m)), F.manque);
    await cap('p3-pret');
    await p.evaluate(() => document.querySelector('[data-action="terminer"]').click()); await L.calme(p, 700);
    const apres = await panneau(), tt = await toast(), st = await p.evaluate(() => INTS.find(i => i.id === 'i3').st); console.log('   après « Terminer » : st =', st, '|', apres.slice(0, 300), '|', tt);
    if (st !== 'fait') { const rest = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim().slice(0, 40))); console.log('   boutons :', rest.join(' | ')); }
    v('P3e l’intervention est terminée (statut « fait ») ou la fenêtre dit précisément ce qui manque encore', st === 'fait' || /il manque|manque/i.test(apres + tt), { st, apres: apres.slice(0, 160), tt });
    await cap('p3-apres');
    await devenir(p, 'marc', 'inter-x-i3'); const tm = await txt(p);
    v('P3f le gérant ouvre l’intervention : « Terminée » et le compte rendu de Karim', st !== 'fait' || (/Termin/.test(tm) && /fluide de l’ancien split|Local technique accessible/.test(tm)), tm.slice(0, 300));
    await cap('p3-gerant');
    await devenir(p, 'kb', 'majournee'); const tj = await txt(p), aCommencer = await p.evaluate(() => !!document.querySelector('[data-rl="go|inter-x-i3"]') && /Commencer|Continuer/.test(document.querySelector('[data-rl="go|inter-x-i3"]').textContent));
    v('P3g Karim retrouve l’intervention terminée dans sa journée, sans « Commencer » ni « Continuer »', st !== 'fait' || (!aCommencer && /Récupération du fluide/.test(tj)), { aCommencer, tj: tj.slice(0, 200) });
    await cap('p3-journee'); await sans('P3');
  }
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
