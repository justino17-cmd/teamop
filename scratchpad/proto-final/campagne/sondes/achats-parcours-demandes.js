// Parcours « demandes d'achat » (campagne du 17 novembre 2026) : le technicien demande, le gérant décide (transférer, magasin, refuser,
// demander une précision), le technicien voit la réponse, le ticket referme l'achat. On vérifie la COHÉRENCE d'un écran à l'autre.
// Usage : node achats-parcours-demandes.js [profil=mac] [nuit=0|1]
const { L, CAP, PNG, devenir, txt, toast, panneau, titrePanneau } = require('./achats-outils.js'), v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === '1', tag = `${profil}-${nuit ? 'nuit' : 'jour'}`;
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'techfrais' }), p = c.p;
  const clic = s => L.toucher(c, s), E = (f, a) => p.evaluate(f, a);
  const dem = id => E(i => { const d = DEM_ACHAT.find(o => o.id === i); return d ? JSON.parse(JSON.stringify(d)) : null; }, id);
  const nbDem = () => E(() => DEM_ACHAT.length);
  const notifs = k => E(k => NOTIFS.filter(n => n.k === k || n.pour === k || n.qui === k).length, k);
  await L.aller(p, 'techfrais');
  // ── P1 le technicien demande ───────────────────────────────────────────────────────────────────────────────
  v('P1a Mes frais : le bouton « Demande d’achat » est là et nomme son geste', /Demande d’achat/.test(await txt(p)), (await txt(p)).slice(0, 200));
  await clic('[data-axa="dem"]'); await L.calme(p, 300);
  v('P1b la fenêtre « Il me faut… » s’ouvre', /Il me faut/.test(await titrePanneau(p)), await titrePanneau(p));
  const n0 = await nbDem();
  await clic('[data-axa^="demok"]');
  v('P1c envoi à vide : « Dis ce qu’il faut. », rien créé', /Dis ce qu’il faut/.test(await toast(p)) && (await nbDem()) === n0, await toast(p));
  await p.fill('#ax-q', 'Rallonge électrique 25 m'); await p.fill('#ax-n', '0');
  await clic('[data-axa^="demok"]'); v('P1d quantité 0 refusée', /Indique combien/.test(await toast(p)) && (await nbDem()) === n0, await toast(p));
  await p.fill('#ax-n', '1,5'); await clic('[data-axa^="demok"]');
  v('P1e « 1,5 u » refusé avec une explication claire (entier, ou changer l’unité)', /nombre entier/.test(await toast(p)) && (await nbDem()) === n0, await toast(p));
  await p.fill('#ax-n', '2'); await clic('[data-axa^="quand|"] >> nth=1'); await L.calme(p, 200);
  v('P1f la puce « Demain » remplit la date', (await p.inputValue('#ax-qd')) !== '', await p.inputValue('#ax-qd'));
  await L.capture(c, CAP + `dem-formulaire-${tag}.png`);
  const dep = await L.deborde(c); v('P1g formulaire sans glissement latéral', dep.bouge === 0, dep);
  const d1 = await L.doigts(p, '#calque .panneau'); if (c.doigt) v('P1h formulaire : champs ≥ 16 px et cibles ≥ 44 px', d1.champs.length === 0 && d1.petits.length === 0, d1);
  await p.evaluate(() => { const b = document.querySelector('[data-axa^="demok"]'); b.click(); b.click(); }); await L.calme(p, 500);   // double toucher
  v('P1i double toucher sur « Envoyer au bureau » : UNE seule demande', (await nbDem()) === n0 + 1, { delta: (await nbDem()) - n0 });
  const nouvelle = await E(() => DEM_ACHAT[0].id), dn = await dem(nouvelle);
  v('P1j la demande est complète (qui = sm, 2 u, pour demain, en attente)', dn && dn.qui === 'sm' && dn.q === 2 && dn.u === 'u' && !!dn.quand && dn.etat === 'attente', dn);
  v('P1k elle paraît dans « Mes demandes », « En attente »', /Rallonge électrique/.test(await txt(p)) && /En attente/.test(await txt(p)), (await txt(p)).slice(0, 300));
  v('P1l le bureau est prévenu (notification)', await E(() => NOTIFS.some(n => /Rallonge/.test(n.txt || n.t || JSON.stringify(n)))));
  v('P1m l’Historique a une ligne « demande d’achat »', await E(() => JOURNAL.some(j => /Rallonge/.test(JSON.stringify(j)))));
  // quantité extrême : confirmation, valeurs longues
  await clic('[data-axa="dem"]'); await p.fill('#ax-q', 'Câble de raccordement électrique triphasé renforcé, section 5 × 16 mm², longueur 25 m, avec embouts'); await p.fill('#ax-n', '1523,5'); await p.selectOption('#ax-u', 'kg');
  await p.fill('#ax-p', 'Pour le gros chantier de la zone industrielle de Périgny : trois groupes de toiture à raccorder avant le 28, le fournisseur habituel est en rupture.');
  await clic('[data-axa^="demok"]'); await L.calme(p, 300);
  v('P1n 1523,5 kg : demande de confirmation avant d’envoyer (> 500)', /Vraiment/.test(await toast(p)), await toast(p));
  await clic('[data-axa^="demok"]'); await L.calme(p, 400);
  v('P1o confirmée : créée', (await nbDem()) === n0 + 2);
  const longue = await E(() => DEM_ACHAT[0].id);
  await L.capture(c, CAP + `dem-tech-liste-${tag}.png`); const dep2 = await L.deborde(c); v('P1p liste « Mes demandes » avec valeurs longues : pas de glissement', dep2.bouge === 0, dep2);
  // ── P2 le gérant voit arriver la demande ────────────────────────────────────────────────────────────────
  await devenir(p, 'marc', 'achats'); await L.calme(p, 500);
  const page = await txt(p);
  v('P2a Achats et frais : titre et sous-titre se comprennent seuls', /Achats et frais/.test(await txt(p, '#contenu h1')) && /Le matériel que ton équipe demande/.test(page), page.slice(0, 160));
  v('P2b le compteur « demandes à décider » = 5 (3 d’origine + 2 nouvelles)', /5\s*demandes de matériel à décider/.test(page), page.slice(0, 260));
  v('P2c les deux nouvelles demandes sont là, avec leur nom', /Rallonge électrique 25 m/.test(page) && /Câble de raccordement/.test(page));
  v('P2d la pastille du menu / cloche compte ce qui attend (demandes + notes)', await E(() => axTotalAttente()) === 8, await E(() => axTotalAttente()));
  await L.capture(c, CAP + `dem-gerant-${tag}.png`); const dep3 = await L.deborde(c); v('P2e écran Achats avec valeurs longues : pas de glissement', dep3.bouge === 0, dep3);
  if (c.doigt) { const d3 = await L.doigts(p); v('P2f Achats : cibles ≥ 44 px, champs ≥ 16 px, pas de texte écrasé', d3.champs.length === 0 && d3.petits.length === 0 && d3.ecrases.length === 0, d3); }
  // ── P3 transférer depuis l'atelier (da1 : R32 10 kg) ───────────────────────────────────────────────────
  const st = () => E(() => { const x = PRODUITS.find(o => o.id === 'p4'), l = LIEUX.find(o => o.tech === 'tl'); return { atelier: stkAt(x, 'atelier'), camion: l ? stkAt(x, l.id) : null, nom: x.nom, u: x.u, cmds: COMMANDES.length, mvts: MVTS.length }; });
  const s0 = await st(); console.log('   stock R32 avant :', JSON.stringify(s0));
  const carte1 = await txt(p, '.ax-d[data-axid="da1"]'); console.log('   carte da1 :', carte1.slice(0, 500));
  const bt = await p.evaluate(() => [...document.querySelectorAll('.ax-d[data-axid="da1"] button')].map(b => b.textContent.trim()));
  console.log('   boutons da1 :', JSON.stringify(bt));
  await clic('[data-ac="transfert|da1"]'); await L.calme(p, 500);
  const s1 = await st(), d1b = await dem('da1');
  const q = Math.min(10, s0.atelier);
  v('P3a transfert : l’atelier perd exactement ce qu’il a donné', s1.atelier === s0.atelier - q, { s0, s1, q });
  v('P3b le camion de Léo reçoit exactement la même quantité', s1.camion === (s0.camion || 0) + q, { s0, s1, q });
  v('P3c un mouvement de stock est écrit (+1)', s1.mvts === s0.mvts + 1, { s0, s1 });
  v('P3d la demande est décidée (approuvée) avec sa suite écrite', d1b.etat === 'approuvee' && !!d1b.suite, d1b);
  v('P3e s’il manque du stock, la commande reçoit le reste', s0.atelier >= 10 ? s1.cmds === s0.cmds : /commandés|commande/.test(d1b.suite), { suite: d1b.suite, c0: s0.cmds, c1: s1.cmds });
  console.log('   toast :', await toast(p), '| panneau :', (await panneau(p)).slice(0, 120));
  await L.capture(c, CAP + `dem-transfert-${tag}.png`);
  await p.keyboard.press('Escape'); await L.calme(p, 300);
  // ── P4 achat en magasin : le technicien rapporte son ticket ─────────────────────────────────────────────
  await clic('[data-ac="magasin|da3"]'); await L.calme(p, 400);
  const d3 = await dem('da3');
  v('P4a magasin : la demande passe « à acheter », rien n’est écrit en comptabilité', d3.etat === 'aacheter' && !(await E(() => ACHATS.some(a => a.id === 'ada3'))), d3);
  await devenir(p, 'sm', 'techfrais');
  v('P4b le technicien voit « À acheter » et le bouton « J’ai acheté »', /À acheter/.test(await txt(p)) && /J’ai acheté/.test(await txt(p)), (await txt(p)).slice(0, 300));
  await clic('[data-axa="tick|da3"]'); await L.calme(p, 300);
  await clic('[data-axa^="tickok"]'); v('P4c envoyer sans montant : « Indique le montant payé. »', /montant/.test(await toast(p)), await toast(p));
  await p.fill('#ax-m', '-5'); await clic('[data-axa^="tickok"]'); v('P4d montant négatif refusé', /montant/.test(await toast(p)) && (await dem('da3')).etat === 'aacheter', await toast(p));
  await p.fill('#ax-m', '12 345,67'); await p.selectOption('#ax-t', '20');
  await p.setInputFiles('#ax-tp', { name: 'ticket.png', mimeType: 'image/png', buffer: PNG }); await L.calme(p, 200);
  await L.capture(c, CAP + `dem-ticket-${tag}.png`);
  await clic('[data-axa^="tickok"]'); await L.calme(p, 500);
  const A = await E(() => { const a = ACHATS.find(o => o.id === 'ada3'); return a && { ht: a.ht, tva: a.tva, compte: a.compte, piece: a.piece, objet: a.objet }; });
  v('P4e la dépense est née : HT = 12 345,67 / 1,2 = 10 288,06 au centime', A && Math.abs(A.ht - 10288.06) < 0.006, A);
  v('P4f au-dessus de 500 € HT, la dépense est classée en immobilisation (2154)', A && A.compte === '2154', A);
  v('P4g le ticket joint est noté', A && A.piece === 'ticket', A);
  const d3b = await dem('da3'); v('P4h la demande est « achetée », montant TTC réel gardé', d3b.etat === 'achetee' && d3b.reel && d3b.reel.ttc === 12345.67, d3b);
  await devenir(p, 'marc', 'achats');
  const decid = await txt(p); v('P4i côté gérant : « Déjà décidées » dit le montant payé et « ticket joint »', /12 345,67/.test(decid.replace(/[  ]/g, ' ')) && /ticket joint/.test(decid), decid.slice(-500));
  v('P4j « plus cher que prévu » est signalé (245 € estimés)', /plus cher que prévu/.test(decid), decid.slice(-400));
  // ── P5 refuser avec un motif ────────────────────────────────────────────────────────────────────────────
  await clic('[data-ac="refuser|da2"]'); await L.calme(p, 300);
  v('P5a la fenêtre « Refuser la demande » propose des motifs en un toucher', /Refuser la demande/.test(await titrePanneau(p)) || /Refuser la demande/.test(await panneau(p)), (await panneau(p)).slice(0, 300));
  await clic('[data-ac^="refok"]'); v('P5b refus sans motif : « Un refus s’explique »', /s’explique/.test(await toast(p)) && (await dem('da2')).etat === 'attente', await toast(p));
  await clic('.puce-c[data-axa^="chip"] >> nth=0'); const mo = await p.inputValue('#ac-motif'); v('P5c une puce de motif remplit le champ', mo.length > 5, mo);
  await L.capture(c, CAP + `dem-refus-${tag}.png`);
  await clic('[data-ac^="refok"]'); await L.calme(p, 400);
  const d2 = await dem('da2'); v('P5d refusée, motif gardé, décidée par Marc', d2.etat === 'refusee' && d2.motif === mo && d2.par === 'marc', d2);
  await devenir(p, 'kb', 'techfrais');
  const tk = await txt(p); v('P5e Karim voit « Refusée » et le motif', /Refusée/.test(tk) && tk.includes(mo.slice(0, 20)), tk.slice(0, 400));
  // ── P6 demander une précision, le technicien répond ──────────────────────────────────────────────────────
  await devenir(p, 'marc', 'achats');
  await clic(`[data-axa="prec|${longue}"]`); await L.calme(p, 300);
  await clic('[data-axa^="precok"]'); v('P6a question vide : « Écris ta question. »', /Écris ta question/.test(await toast(p)), await toast(p));
  await p.fill('#ax-mo', 'Quelle section exactement ?'); await clic('[data-axa^="precok"]'); await L.calme(p, 400);
  await devenir(p, 'sm', 'techfrais'); const tq = await txt(p);
  v('P6b le technicien voit « Question du bureau » et un bouton « Répondre »', /Question du bureau/.test(tq) && /Répondre/.test(tq), tq.slice(0, 300));
  await clic(`[data-axa="precrep|${longue}"]`); await p.fill('#ax-mo', '5 × 16 mm², la même qu’au dernier chantier.'); await clic('[data-axa^="precrepok"]'); await L.calme(p, 400);
  await devenir(p, 'marc', 'achats'); const tr = await txt(p);
  v('P6c le gérant lit la réponse sur la demande', /5 × 16 mm², la même/.test(tr), tr.slice(0, 400));
  // ── P7 annuler une demande (technicien) ; le toast « Annuler » défait un refus ────────────────────────────
  await devenir(p, 'sm', 'techfrais'); const nb1 = await nbDem();
  await clic('[data-axa^="demannul|"] >> nth=0'); await L.calme(p, 300);
  v('P7a « Annuler la demande » retire la demande (et le dit)', (await nbDem()) === nb1 - 1 && /annulée/.test(await toast(p)), await toast(p));
  await clic('#toast button'); await L.calme(p, 300); v('P7b « Annuler » dans le message la remet', (await nbDem()) === nb1, await nbDem());
  const err = c.err.filter(e => !/ERR_/.test(e)); v('P8 aucune erreur JavaScript pendant tout le parcours', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
