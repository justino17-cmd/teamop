// PARCOURS 5 — « une note de frais » : Sophie photographie son ticket de carburant (58,40 € TTC, TVA 20 %) → le gérant est prévenu → il la VALIDE dans Achats et frais →
// Sophie est prévenue → la note est « à rembourser avec la paie de novembre » (hors salaire) → la Comptabilité (dépenses, TVA récupérable) et la paie du mois la comptent (17 novembre 2026).
// Chiffres recalculés ici : 58,40 ÷ 1,20 = 48,67 HT ; TVA = 58,40 − 48,67 = 9,73 € ; la note validée avec les deux autres notes avec ticket : 58,40 + 16,50 + 8,20 = 83,10 €.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
const ctFin = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1].replace('−', '-')) : null; };
  return { dep:n(/([\d  ]+,\d\d) €\s*dépenses d’octobre/), res:n(/(−?[\d  ]+,\d\d) €\s*résultat/), ndf:+((/(\d+) notes? de frais à valider/.exec(t) || [])[1] || 0), t }; };
(async () => {
  let c;
  await P.sec('parcours 5', async () => {
    c = await P.demarrer({ qui:'sm' }); const p = c.p;
    const e0 = await S(c, () => ({ n:NDF.length, att:NDF.filter(x => x.etat === 'attente').length, val:NDF.filter(x => x.etat === 'validee').length, ntf:NOTIFS.length }));
    v('0 population : 4 notes de frais, 3 « en attente » et 1 déjà validée (Karim : 14,90 €)', e0.n === 4 && e0.att === 3 && e0.val === 1, e0);
    await P.passer(c, 'marc', 'accueil');
    const f0 = await ctFin(c);
    v('0b population : la Comptabilité donne ses « dépenses d’octobre », son résultat, « 3 notes de frais à valider »', f0.dep > 0 && f0.res !== null && f0.ndf === 3, { dep:f0.dep, res:f0.res, ndf:f0.ndf });
    await P.passer(c, 'sm', 'majournee');

    /* ── A. Sophie fait sa note ── */
    v('A1 population : « ＋ Nouvelle note de frais » existe dans « Ma journée »', await clic(c, '[data-rl="ndf"]'));
    await p.waitForTimeout(500);
    const f1 = net(await txt(c, '#calque'));
    v('A2 (écran) la feuille : « Ce que tu as payé de ta poche », le ticket en photo, la liste des dépenses, « TVA sur le ticket », « Envoyer au bureau »', /Ce que tu as payé de ta poche/.test(f1) && /Prendre le ticket en photo/.test(f1) && /Carburant/.test(f1) && /TVA sur le ticket/.test(f1) && /Envoyer au bureau/.test(f1), f1.slice(0, 300));
    await clic(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(500);
    const r0 = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
    v('A3 sans rien dire, « Envoyer au bureau » refuse : la raison est écrite (aucune note n’est créée)', (await S(c, () => NDF.length)) === e0.n && r0.length > 5, r0);
    await p.selectOption('#rn-o', 'Carburant'); await p.fill('#rn-m', '58,40'); await p.setInputFiles('#rn-p', P.PNG); await p.waitForTimeout(500);
    await cap(c, '5-A3-note-' + P.PROFIL);
    await clic(c, '#calque [data-rl="ndfok"]'); await p.waitForTimeout(800);
    const n1 = await S(c, () => { const d = NDF.find(x => x.qui === 'sm' && /arbur/i.test(x.objet)); return d ? { id:d.id, objet:d.objet, ttc:d.ttc, tva:d.tva, recu:d.recu, etat:d.etat, n:NDF.length, ntfMarc:NOTIFS.filter(x => x.k === 'marc' && /Sophie envoie une note de frais : Carburant 58,40/.test(x.txt.replace(/[\u00a0\u202f]/g, ' '))).length } : null; });
    v('A4 (donnée) la note existe : Sophie, « Carburant · … », 58,40 € TTC, TVA 20 %, avec ticket, « attente » ; le gérant est notifié (« Sophie envoie une note de frais : Carburant 58,40 € »)', !!n1 && n1.ttc === 58.4 && n1.tva === 20 && n1.recu && n1.etat === 'attente' && n1.n === e0.n + 1 && n1.ntfMarc === 1, n1);
    v('A5 (écran) Sophie lit « Note envoyée au bureau, avec le ticket. »', /Note envoyée au bureau, avec le ticket/.test(net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''))));
    await L.aller(p, 'techfrais');
    const mf = net(await txt(c, '#contenu'));
    v('A6 (écran) « Mes frais » : sa note de 58,40 € est là, « en attente »', /Carburant/.test(mf) && /58,40 €/.test(mf) && /attente/i.test(mf), mf.slice(0, 400));
    await cap(c, '5-A6-mesfrais-' + P.PROFIL);

    /* ── B. le gérant valide ── */
    await P.passer(c, 'marc', 'achats');
    await clic(c, '[data-ac="onglet|notes"]:visible');   /* au téléphone, le compteur « notes à valider » du haut est masqué : c'est l'onglet visible qu'on touche */ await p.waitForTimeout(400);
    const ach = net(await txt(c, '#contenu'));
    v('B1 (écran) Achats et frais › Notes de frais : « 4 notes de frais à valider », la note de Sophie : « Carburant · GH-482-KL · 58,40 € », « TVA 9,73 € sur le ticket »', /(4 notes de frais à valider|À valider · 4)/.test(ach) && /Carburant · GH-482-KL · 58,40 €/.test(ach) && /TVA 9,73 € sur le ticket/.test(ach), ach.slice(ach.indexOf('À valider'), ach.indexOf('À valider') + 300));
    v('B1b (arithmétique) la TVA : 58,40 − 58,40 ÷ 1,20 = 9,73 ; « Valider les 3 notes avec ticket » = 58,40 + 16,50 + 8,20 = 83,10 €', Math.round(5840 - 5840 / 1.2) === 973 && 5840 + 1650 + 820 === 8310 && /Valider les 3 notes avec ticket · 83,10 €/.test(ach), ach.slice(ach.indexOf('Valider les'), ach.indexOf('Valider les') + 80));
    await cap(c, '5-B1-notes-' + P.PROFIL);
    await clic(c, '[data-ac="ndfok|' + n1.id + '"]'); await p.waitForTimeout(700);
    const v1 = await S(c, id => { const d = NDF.find(x => x.id === id); return { etat:d.etat, no:d.no, ntfSm:NOTIFS.filter(x => x.k === 'sm' && /Carburant/.test(x.txt) && /validée/.test(x.txt)).map(x => x.txt), toast:(document.getElementById('toast') || {}).innerText }; }, n1.id);
    v('B2 (donnée) validée (note n° 5), Sophie en est prévenue : « elle sera remboursée avec la paie, hors salaire »', v1.etat === 'validee' && v1.no === 5 && v1.ntfSm.length === 1 && /remboursée avec la paie, hors salaire/.test(v1.ntfSm[0]), v1);
    v('B3 (écran) le gérant lit « Validée : 58,40 € remboursés à Sophie avec la paie de novembre. »', /Validée : 58,40 € remboursés à Sophie avec la paie de novembre/.test(net(v1.toast)), v1.toast);
    const ach2 = net(await txt(c, '#contenu'));
    v('B4 (écran) la liste : « 3 notes à valider » ; sous « À rembourser avec la paie de novembre » : Sophie Martin · Carburant · GH-482-KL · 58,40 €', /À valider · 3/.test(ach2) && /À rembourser avec la paie de novembre[^]*?Sophie Martin\s*Carburant · GH-482-KL\s*58,40 €/.test(ach2), ach2.slice(ach2.indexOf('À rembourser'), ach2.indexOf('À rembourser') + 250));
    const remb = await S(c, () => NDF.filter(x => x.etat === 'validee').map(x => [x.qui, Math.round(x.ttc * 100)]));
    v('B5 (donnée) les notes validées à rembourser : Karim (14,90) et Sophie (58,40), au total 73,30 €', remb.length === 2 && remb.reduce((s, x) => s + x[1], 0) === 7330, remb);

    /* ── C. la Comptabilité et la paie ── */
    const f2 = await ctFin(c);
    v('C1 (écran) la Comptabilité compte la note validée : les « dépenses d’octobre » montent de 58,40 € (' + f0.dep + ' → ' + f2.dep + ') et « 2 notes de frais à valider » ne figure plus à 3', f2.dep - f0.dep === 5840 && f2.ndf === 3, { dep0:f0.dep, dep2:f2.dep, ndf:f2.ndf });
    await L.aller(p, 'pointage'); await clic(c, '[data-tt="onglet|mois"]'); await p.waitForTimeout(500);
    const pm = net(await txt(c, '#contenu'));
    v('C2 (écran) Temps de travail › Mois : la paie du mois dit le remboursement de Sophie (58,40 €), hors salaire', /58,40 €/.test(pm) && /(rembours|frais)/i.test(pm), pm.slice(0, 600));
    await P.passer(c, 'sm', 'techfrais');
    const mf2 = net(await txt(c, '#contenu'));
    v('C3 (écran) « Mes frais » de Sophie : sa note est « validée », à rembourser avec la paie', /Carburant/.test(mf2) && /valid/i.test(mf2) && /paie/i.test(mf2), mf2.slice(0, 500));
    await cap(c, '5-C3-mesfrais-' + P.PROFIL);
    v('C4 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
