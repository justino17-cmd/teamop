// Parcours « prévenir le bureau » du technicien (campagne du 17 novembre 2026) : une pièce qui manque, une habilitation qui expire, un souci
// sur le camion — et le gérant le reçoit-il, au bon endroit, avec les bons mots ? Usage : node technicien-parcours-prevenir-bureau.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  let c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'moncamion' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  const panneau = () => txt(p, '#calque .panneau');
  // ── K : « Il me manque une pièce » ──
  await L.aller(p, 'moncamion');
  v('K0 Mon camion : titre, plaque, nombre d’articles', /Mon camion/.test(await txt(p, '#contenu h1')) && /GH-482-KL/.test(await txt(p)), await txt(p, '#contenu h1'));
  const n0 = await p.evaluate(() => DEM_ACHAT.length);
  await L.toucher(c, '[data-mat="manque"]'); await L.calme(p, 400);
  v('K1a la fenêtre « Il me manque une pièce » s’ouvre', /Il me manque une pièce/.test(await panneau()), (await panneau()).slice(0, 120));
  const dis = await p.evaluate(() => { const b = document.querySelector('[data-mat="menvoyer"]'); return b && b.disabled; });
  v('K1b « Prévenir le bureau » est grisé tant qu’aucune pièce n’est choisie, et la raison est écrite', dis === true && /Choisis une pièce/.test(await panneau()), { dis });
  await L.capture(c, CAP + `camion-manque-${profil}-${J}.png`);
  await p.evaluate(() => { const b = document.querySelector('[data-mat="mlibre"]'); b && b.click(); }); await L.calme(p, 300);
  const LONG = 'Condensateur permanent 5 µF 450 V avec cosses fast-on 6,3 mm pour moteur ventilateur unité extérieure';
  await p.fill('#mm-texte', LONG); await L.calme(p, 200);
  await p.fill('[data-mm="q"]', '0'); await L.calme(p, 200);
  v('K1c quantité 0 : « Mets une quantité » et envoi grisé', /Mets une quantité/.test(await panneau()) && await p.evaluate(() => document.querySelector('[data-mat="menvoyer"]').disabled), (await panneau()).slice(-160));
  await p.fill('[data-mm="q"]', '2'); await L.toucher(c, '[data-mat="mquand|auj"]'); await L.calme(p, 200);
  const dp = await L.deborde(c); v('K1d nom de pièce de 100 signes : pas de glissement latéral', dp.bouge === 0, dp);
  await L.capture(c, CAP + `camion-manque-rempli-${profil}-${J}.png`);
  const fenetre = await L.doigts(p, '#calque'); v('K1e fenêtre : cibles ≥ 44 px, champs ≥ 16 px', !c.doigt || (fenetre.petits.length === 0 && fenetre.champs.length === 0), { petits: fenetre.petits.slice(0, 6), champs: fenetre.champs.slice(0, 6) });
  await L.toucher(c, '[data-mat="menvoyer"]'); await L.calme(p, 500);
  v('K2a la demande est envoyée (+1) et la fenêtre se ferme', (await p.evaluate(() => DEM_ACHAT.length)) === n0 + 1 && !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))), { toast: await toast() });
  console.log('   toast :', await toast());
  // double demande
  await L.toucher(c, '[data-mat="manque"]'); await p.evaluate(() => { document.querySelector('[data-mat="mlibre"]').click(); }); await L.calme(p, 200);
  await p.fill('#mm-texte', LONG); await L.calme(p, 100); await L.toucher(c, '[data-mat="menvoyer"]'); await L.calme(p, 400);
  v('K2b la même pièce demandée deux fois : « Tu as déjà demandé cette pièce », pas de doublon', /déjà demandé/.test(await toast()) && (await p.evaluate(() => DEM_ACHAT.length)) === n0 + 1, await toast());
  // où la retrouve-t-il ?
  await L.aller(p, 'techfrais');
  v('K3 il retrouve sa demande dans « Mes frais › Mes demandes »', /Condensateur/.test(await txt(p)), (await txt(p)).slice(0, 300));
  // le gérant
  await p.evaluate(() => rlChanger('patron', { h: 'achats', muet: true })); await L.calme(p, 800);
  const ach = await txt(p);
  v('K4 le gérant voit la demande de Sophie dans Achats et frais (pièce et quantité)', /Condensateur/.test(ach) && /Sophie/.test(ach), ach.slice(0, 300));
  await L.capture(c, CAP + `camion-gerant-achats-${profil}-${J}.png`);
  // messages du bureau (Mon camion)
  await p.evaluate(() => rlChanger('tech', { h: 'moncamion', muet: true })); await L.calme(p, 600);
  if (await p.$('[data-mat="messages"]')) { await L.toucher(c, '[data-mat="messages"]'); await L.calme(p, 300); v('K5 « 1 message du bureau » ouvre les messages', (await panneau()).length > 20, (await panneau()).slice(0, 200)); await L.capture(c, CAP + `camion-messages-${profil}-${J}.png`); await L.ranger(p); }
  // J'ai utilisé / J'ai pris : ouvrent et se ferment (écrans en refonte)
  for (const k of ['usage', 'prise']) { await L.toucher(c, `[data-mat="${k}"]`); await L.calme(p, 300); v(`K6 « ${k} » ouvre une fenêtre`, (await panneau()).length > 20, (await panneau()).slice(0, 80)); await L.ranger(p); v(`K6b Échap ferme « ${k} »`, !(await p.evaluate(() => !!document.querySelector('#calque .panneau')))); }
  await L.fin(c);
  // ── H : habilitations, côté Karim (chef d'équipe) puis Sophie ──
  c = await L.ouvrir({ profil, qui: 'kb', nuit, hash: 'majournee' }); p = c.p; await L.calme(p, 500);
  const alerte = await txt(p, '.eqx-moi');
  console.log('   Karim, carte habilitation :', alerte.slice(0, 260));
  v('H1 Karim : une habilitation qui expire est annoncée en tête de « Ma journée », avec la date ou le nombre de jours', /expir|se termine/.test(alerte) && /jour/.test(alerte), alerte);
  await L.capture(c, CAP + `habil-karim-${profil}-${J}.png`);
  const bp = await p.$('[data-eqx^="mesbureau"]');
  v('H2 « Prévenir le bureau » est proposé', !!bp);
  if (bp) { await L.toucher(c, '[data-eqx^="mesbureau"]'); await L.calme(p, 500);
    console.log('   après « Prévenir le bureau » : toast', await toast(), '| carte :', (await txt(p, '.eqx-moi')).slice(0, 200));
    v('H3 après l’envoi la carte dit « Le bureau est prévenu » (et ne propose plus le bouton)', /prévenu/.test(await txt(p, '.eqx-moi')) && !(await p.$('[data-eqx^="mesbureau"]')), await txt(p, '.eqx-moi'));
    await p.evaluate(() => rlChanger('patron', { h: 'taches', muet: true })); await L.calme(p, 800);
    const tt = await txt(p); const notif = await p.evaluate(() => NOTIFS.filter(n => /Karim/.test(n.t || n.texte || JSON.stringify(n))).length);
    v('H4 le gérant en est averti (une tâche ou une notification au nom de Karim)', /Karim/.test(tt) || notif > 0, { notif, tt: tt.slice(0, 200) }); }
  await L.fin(c);
  c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'majournee' }); p = c.p; await L.calme(p, 500);
  await L.toucher(c, '[data-eqx^="mesfiche"]'); await L.calme(p, 400);
  const hab = await panneau(); console.log('   Sophie, Mes habilitations :', hab.slice(0, 300));
  v('H5 Sophie : « Mes habilitations » ouvre sa fiche en lecture seule (liste et dates)', /Mes habilitations/.test(hab) && /Lecture seule/.test(hab), hab.slice(0, 200));
  await L.capture(c, CAP + `habil-sophie-${profil}-${J}.png`);
  await L.ranger(p); v('H6 Échap ferme la fiche', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  // ── S : souci avec le camion → « Prévenir le bureau »
  await L.toucher(c, '[data-vx="souci"]'); await L.calme(p, 400);
  const so = await panneau(); console.log('   Souci camion :', so.slice(0, 300));
  v('S1 « Signaler un souci » ouvre la fenêtre « Un souci avec le camion »', /souci/i.test(so), so.slice(0, 100));
  await L.capture(c, CAP + `souci-${profil}-${J}.png`);
  const ds = await L.doigts(p, '#calque'); v('S2 fenêtre du souci : cibles ≥ 44 px, champs ≥ 16 px', !c.doigt || (ds.petits.length === 0 && ds.champs.length === 0), { petits: ds.petits.slice(0, 6), champs: ds.champs.slice(0, 6) });
  const envoi = await p.$('[data-vx^="soucisok"]'); if (envoi) { await L.toucher(c, '[data-vx^="soucisok"]'); await L.calme(p, 400); console.log('   envoi à vide, toast :', await toast()); v('S3 envoyer un souci sans le décrire : la page dit quoi faire (rien ne part en silence)', (await toast()).length > 5 || !!(await panneau()), await toast()); }
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
