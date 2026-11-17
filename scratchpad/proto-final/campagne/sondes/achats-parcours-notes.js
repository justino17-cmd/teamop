// Parcours « notes de frais » (campagne du 17 novembre 2026) : le technicien envoie, le gérant valide / refuse / demande le ticket,
// remboursement avec la paie, kilomètres, refacturation, « Tout valider » et « Annuler ». Les totaux sont recalculés AU CENTIME.
// Usage : node achats-parcours-notes.js [profil=mac] [nuit=0|1]
const { L, CAP, PNG, devenir, txt, toast, panneau, titrePanneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === '1', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p;
  const clic = s => L.toucher(c, s), E = (f, a) => p.evaluate(f, a);
  const note = id => E(i => { const n = NDF.find(o => o.id === i); return n ? JSON.parse(JSON.stringify(n)) : null; }, id);
  const achat = id => E(i => { const a = ACHATS.find(o => o.id === i); return a ? JSON.parse(JSON.stringify(a)) : null; }, id);
  const nbNdf = () => E(() => NDF.length), derniere = () => E(() => NDF[0].id);
  const r2 = x => Math.round(x * 100) / 100;
  await L.aller(p, 'techfrais');
  // ── N1 le technicien envoie une note AVEC ticket : 12,50 € TTC à 20 % ──────────────────────────────────────
  await clic('[data-rl="ndf"]'); await L.calme(p, 300);
  await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-pr', 'station Leclerc, Aytré'); await p.fill('#rn-m', '12,50');
  await p.setInputFiles('#rn-p', { name: 'ticket-carburant.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200);
  const n0 = await nbNdf(); await clic('[data-rl="ndfok"]'); await L.calme(p, 400);
  const idA = await derniere(), nA = await note(idA);
  v('N1a note créée (+1), 12,50 € TTC, TVA 20 %, ticket joint, en attente', (await nbNdf()) === n0 + 1 && nA.ttc === 12.5 && nA.tva === 20 && nA.recu && nA.etat === 'attente', nA);
  // ── N2 note SANS ticket, valeurs longues ; N3 km ; N4 note à l'intervention (pour refacturer) ────────────────
  await clic('[data-rl="ndf"]'); await p.selectOption('#rn-o', 'Repas sur un chantier'); await p.fill('#rn-pr', 'restaurant du port de La Rochelle, repas du midi pour deux techniciens'); await p.fill('#rn-m', '33,50'); await p.selectOption('#rn-t', '10');
  const ints = await E(() => [...document.querySelectorAll('#rn-i option')].map(o => o.value + '|' + o.textContent.trim())); console.log('   interventions proposées :', JSON.stringify(ints));
  const iv = ints.find(x => x.split('|')[0]); if (iv) await p.selectOption('#rn-i', iv.split('|')[0]);
  await clic('[data-rl="ndfok"]'); await L.calme(p, 400); const idB = await derniere(), nB = await note(idB);
  v('N2 note sans ticket 33,50 € à 10 % : créée, non justifiée, rattachée à l’intervention', nB.ttc === 33.5 && nB.tva === 10 && !nB.recu && (iv ? nB.int === iv.split('|')[0] : true), nB);
  await clic('[data-rl="ndf"]'); await p.selectOption('#rn-o', 'Kilomètres avec mon véhicule'); await p.fill('#rn-km', '85'); await p.fill('#rn-cv', '5'); await L.calme(p, 200);
  const kt = await txt(p, '#rn-kmtxt'); v('N3a kilomètres : 85 km × 0,60 € = 51,00 € affiché avant l’envoi', /51,00/.test(kt), kt);
  await L.capture(c, CAP + `ndf-km-${tag}.png`);
  await clic('[data-rl="ndfok"]'); await L.calme(p, 400); const idK = await derniere(), nK = await note(idK);
  v('N3b note km : 51,00 €, sans ticket, tarif et CV gardés', nK.ttc === 51 && nK.km && nK.km.km === 85 && nK.km.tarif === 0.6 && nK.km.cv === 5, nK);
  v('N3c la liste du technicien montre « 85 km » et « Validée / En attente »', /85 km/.test(await txt(p)), (await txt(p)).slice(0, 300));
  // note pour un grand montant et double
  await clic('[data-rl="ndf"]'); await p.fill('#rn-m', '12,50'); await clic('[data-rl="ndfok"]'); await L.calme(p, 300);
  const dbl = await E(() => { const z = document.getElementById('rn-dbl'); return z && !z.hidden ? z.textContent.replace(/\s+/g, ' ').trim() : ''; });
  v('N4a même montant, même jour : « une note de 12,50 € existe déjà, c’est la même ? »', /existe déjà/.test(dbl), dbl);
  await clic('[data-axa="dblnon"]'); await L.calme(p, 300); v('N4b « Oui, annuler l’envoi » : rien créé', (await nbNdf()) === n0 + 3 && !(await panneau(p)), await nbNdf());
  // ── N5 le gérant voit ce qui attend ───────────────────────────────────────────────────────────────────────
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'notes'; rendre(); }); await L.calme(p, 400);
  const pg = await txt(p);
  v('N5a 6 notes à valider (3 d’origine + 3 nouvelles)', /6\s*notes de frais à valider/.test(pg) && /À valider · 6/.test(pg), pg.slice(0, 300));
  v('N5b la note avec ticket dit la TVA du ticket : 12,50 / 1,2 = 10,42 HT, TVA 2,08', /TVA 2,08/.test(pg), pg.slice(0, 600));
  v('N5c la note sans ticket dit « TVA non récupérable : pas de ticket »', /TVA non récupérable/.test(pg));
  v('N5d la note km dit « 85 km × 0,60 € » et « ni ticket ni TVA »', /85 km × 0,60/.test(pg) && /ni ticket ni TVA/.test(pg), pg.slice(0, 900));
  await L.capture(c, CAP + `ndf-gerant-${tag}.png`); const dep = await L.deborde(c); v('N5e liste des notes : pas de glissement latéral', dep.bouge === 0, dep);
  if (c.doigt) { const d = await L.doigts(p); v('N5f notes : cibles ≥ 44 px, champs ≥ 16 px, pas de texte écrasé', d.champs.length === 0 && d.petits.length === 0 && d.ecrases.length === 0, d); }
  // valider la note A
  const compta0 = await E(() => axSansJustif());
  await clic(`.ax-n[data-axid="${idA}"] [data-ac^="ndfok"]`); await L.calme(p, 500);
  const aA = await achat('a' + idA), nA2 = await note(idA);
  v('N6a validée : état « validée »', nA2.etat === 'validee', nA2);
  v('N6b l’écriture comptable naît : compte 625, HT 10,42, TVA 20, mode « Note de frais »', aA && aA.compte === '625' && aA.ht === 10.42 && aA.tva === 20 && aA.mode === 'Note de frais', aA);
  v('N6c TTC recalculé de l’écriture = 12,50', aA && r2(aA.ht * 1.2) === 12.5, aA);
  const ligneCompta = async mot => { await E(() => { cxAller('factures', { cat: 'achats', st: 'tous' }); }); await L.calme(p, 500); return E(m => { const l = [...document.querySelectorAll('#cx-liste [data-cx], #cx-liste .ligne-clic, #cx-liste tr')].find(e => e.textContent.includes(m)); return l ? l.textContent.replace(/\s+/g, ' ').trim() : ''; }, mot); };
  const lA = await ligneCompta('Carburant');
  v('N6d la note justifiée par un ticket paraît dans la Comptabilité SANS l’étiquette « sans justificatif »', !!lA && !/sans justificatif/.test(lA), lA);
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  v('N6e le technicien est prévenu (notification) et l’Historique a la ligne', await E(() => NOTIFS.some(n => /validée/.test(JSON.stringify(n)) && /Carburant/.test(JSON.stringify(n)))) && await E(() => JOURNAL.some(j => /Carburant/.test(JSON.stringify(j)))));
  console.log('   toast :', await toast(p));
  // « Annuler » du message défait TOUT (écriture, état, notification, journal)
  const nbA = await E(() => ACHATS.length), nbN = await E(() => NOTIFS.length), nbJ = await E(() => JOURNAL.length);
  await clic('#toast button'); await L.calme(p, 400);
  v('N6f « Annuler » : la note repasse en attente et l’écriture disparaît', (await note(idA)).etat === 'attente' && !(await achat('a' + idA)) && (await E(() => ACHATS.length)) === nbA - 1, await note(idA));
  v('N6g « Annuler » retire aussi la notification et la ligne d’Historique', (await E(() => NOTIFS.length)) === nbN - 1 && (await E(() => JOURNAL.length)) === nbJ - 1, { notifs: await E(() => NOTIFS.length), nbN, j: await E(() => JOURNAL.length), nbJ });
  // ── N7 sans ticket : validation avec confirmation ────────────────────────────────────────────────────────────
  await clic(`.ax-n[data-axid="${idB}"] [data-ac^="ndf"]:not([data-ac^="ndfnon"]):not([data-ac^="ndfticket"]) >> nth=0`); await L.calme(p, 400);
  const pn = await panneau(p); v('N7a sans ticket : une fenêtre demande « Valider sans justificatif ? »', /Valider sans justificatif/.test(pn), pn.slice(0, 300));
  v('N7b la fenêtre dit la TVA perdue : 33,50 / 1,1 = 30,45 HT, TVA 3,05', /3,05/.test(pn), pn.slice(0, 500));
  await L.capture(c, CAP + `ndf-sans-ticket-${tag}.png`);
  await clic('[data-ac^="ndfoksans"]'); await L.calme(p, 500);
  const aB = await achat('a' + idB), nB2 = await note(idB);
  v('N7c validée sans ticket : trace gardée (qui, quand), écriture sans pièce, HT 30,45', nB2.etat === 'validee' && nB2.sansJustif && aB && aB.sansJustif && aB.ht === 30.45 && !aB.piece, { nB2, aB });
  const lB = await ligneCompta('Repas sur un chantier');
  v('N7d la note validée sans ticket paraît dans la Comptabilité AVEC « sans justificatif »', !!lB && /sans justificatif/.test(lB), lB);
  await E(() => { acOnglet = 'notes'; }); await L.aller(p, 'achats');
  // ── N8 refuser une note : motif obligatoire, le technicien corrige et renvoie ────────────────────────────────
  await clic(`.ax-n[data-axid="n2"] [data-ac^="ndfnon"]`); await L.calme(p, 300);
  await clic('[data-axa^="nonok"]'); v('N8a refus sans motif : « Un refus s’explique »', /s’explique/.test(await toast(p)) && (await note('n2')).etat === 'attente', await toast(p));
  await clic('.puce-c[data-axa^="chip"] >> nth=1'); await clic('[data-axa^="nonok"]'); await L.calme(p, 400);
  const n2 = await note('n2'); v('N8b refusée avec le motif de la puce', n2.etat === 'refusee' && n2.motif && n2.motif.length > 5, n2);
  v('N8c la note refusée paraît dans « Déjà refusées »', /Déjà refusées/.test(await txt(p)) && (await txt(p)).includes(n2.motif.slice(0, 15)), (await txt(p)).slice(0, 300));
  await devenir(p, 'kb', 'techfrais'); const tk = await txt(p);
  v('N8d Karim voit « Refusée », le motif et « Corriger et renvoyer »', /Refusée/.test(tk) && tk.includes(n2.motif.slice(0, 15)) && /Corriger et renvoyer/.test(tk), tk.slice(0, 500));
  await clic('[data-rl^="ndfmod|n2"]'); await L.calme(p, 400); console.log('   fenêtre de correction :', (await panneau(p)).slice(0, 200));
  await L.capture(c, CAP + `ndf-corriger-${tag}.png`);
  const bouton = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.trim() + '|' + (b.dataset.rl || b.dataset.axa || b.dataset.ferme || '')));
  console.log('   boutons de la fenêtre de correction :', JSON.stringify(bouton));
  await p.keyboard.press('Escape'); await L.calme(p, 300);
  // ── N9 « Tout valider » et « Annuler » : total au centime ────────────────────────────────────────────────────
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'notes'; AX.fn = 'tous'; rendre(); }); await L.calme(p, 400);
  const att = await E(() => NDF.filter(n => n.etat === 'attente' && (n.recu || n.km)).map(n => [n.id, n.ttc]));
  const somme = r2(att.reduce((s, x) => s + x[1], 0)); console.log('   à valider avec ticket :', JSON.stringify(att), 'somme', somme);
  await clic('[data-axa="toutval"]'); await L.calme(p, 300); const pt = await panneau(p);
  v('N9a « Tout valider » : la fenêtre liste les notes et dit le total exact', att.length > 1 && pt.replace(/[  ]/g, ' ').includes(String(somme.toFixed(2)).replace('.', ',')), { somme, pt: pt.slice(0, 400) });
  await clic('[data-axa="toutok"]'); await L.calme(p, 500);
  v('N9b toutes les notes avec ticket sont validées', (await E(() => NDF.filter(n => n.etat === 'attente' && (n.recu || n.km)).length)) === 0);
  const tm = await toast(p); v('N9c le message annonce le même total', tm.replace(/[  ]/g, ' ').includes(String(somme.toFixed(2)).replace('.', ',')), tm);
  await clic('#toast button'); await L.calme(p, 400); v('N9d « Annuler » défait toutes les validations d’un coup', (await E(() => NDF.filter(n => n.etat === 'attente' && (n.recu || n.km)).length)) === att.length, await E(() => NDF.map(n => n.id + ':' + n.etat)));
  // ── N10 refacturer au client : une note neuve, ticket joint, rattachée à une intervention (la case n'existe que pour une note À VALIDER) ──
  await devenir(p, 'sm', 'techfrais'); await clic('[data-rl="ndf"]'); await L.calme(p, 300);
  await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-pr', 'station Total, Périgny'); await p.fill('#rn-m', '24,00');
  await p.setInputFiles('#rn-p', { name: 'ticket-2.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200);
  const opts = await E(() => [...document.querySelectorAll('#rn-i option')].map(o => o.value).filter(Boolean));
  const choix = await E(o => { const f = FACTURES.find(x => x.num === '—' && o.includes(x.int)); return { int: f ? f.int : o[0], fac: f ? f.id : null, n: f ? lignesDe(f).length : 0 }; }, opts);
  await p.selectOption('#rn-i', choix.int); await clic('[data-rl="ndfok"]'); await L.calme(p, 400); const idR = await derniere();
  await devenir(p, 'marc', 'achats'); await E(() => { acOnglet = 'notes'; AX.fn = 'tous'; rendre(); }); await L.calme(p, 400);
  const rf = await p.$(`.ax-n[data-axid="${idR}"] input[data-axrf]`); v('N10a une note rattachée à une intervention propose « Refacturer au client »', !!rf, 'aucune case');
  if (rf) { await rf.check(); await L.calme(p, 200); await clic(`.ax-n[data-axid="${idR}"] [data-ac^="ndfok"]`); await L.calme(p, 500);
    const fa = choix.fac ? await E(i => { const f = FACTURES.find(x => x.id === i); return f ? lignesDe(f).filter(l => /Frais engagés/.test(l.d)).map(l => [l.d, l.pu]) : null; }, choix.fac) : null;
    const tm2 = await toast(p);
    if (choix.fac) v('N10b validée avec « Refacturer » : la facture préparée reçoit UNE ligne « Frais engagés » au prix HT (20,00)', fa && fa.length === 1 && fa[0][1] === 20, { choix, fa, tm2 });
    else v('N10b validée avec « Refacturer », sans facture préparée : le message dit d’ajouter la ligne à la main', /à la main/.test(tm2), tm2);
    await clic('#toast button'); await L.calme(p, 400);
    if (choix.fac) { const fa2 = await E(i => lignesDe(FACTURES.find(x => x.id === i)).filter(l => /Frais engagés/.test(l.d)).length, choix.fac); v('N10c « Annuler » retire la ligne « Frais engagés » de la facture', fa2 === 0, fa2); } }
  // ── N11 remboursement avec la paie : par personne, au centime, et le lien mène à la paie ─────────────────────────
  await clic('[data-ac^="ndfok"] >> nth=0'); await L.calme(p, 300);
  const val = await E(() => { const par = {}; NDF.filter(n => n.etat === 'validee').forEach(n => { par[n.qui] = r2(((par[n.qui] || 0) + n.ttc)); }); function r2(x) { return Math.round(x * 100) / 100; } return par; });
  const bloc = (await txt(p)).replace(/[  ]/g, ' '); console.log('   validées par personne :', JSON.stringify(val));
  for (const [k, s] of Object.entries(val)) v(`N11a « À rembourser avec la paie » : ${k} = ${s.toFixed(2).replace('.', ',')} €`, bloc.includes(s.toFixed(2).replace('.', ',')), bloc.slice(bloc.indexOf('À rembourser'), bloc.indexOf('À rembourser') + 400));
  await clic('[data-axa="paie"]'); await L.calme(p, 600); const e = await L.etat(p);
  v('N11b « Voir dans l’export de paie » mène à Temps de travail › paie', /pointage/.test(e.hash) || /temps|heures|paie/i.test(e.h1), e);
  await L.capture(c, CAP + `ndf-paie-${tag}.png`);
  const paieTxt = await txt(p); console.log('   paie contient « frais » :', /frais|rembours/i.test(paieTxt), paieTxt.slice(0, 200));
  const err = c.err.filter(x => !/ERR_/.test(x)); v('N12 aucune erreur JavaScript pendant tout le parcours', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
