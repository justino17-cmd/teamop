// Parcours « Mes tâches » et « Mes congés » du technicien (campagne du 17 novembre 2026), de bout en bout, puis le gérant qui reçoit la demande.
// Usage : node technicien-parcours-taches-conges.js [profil] [nuit=0|1]
const L = require('../../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/campagne-technicien/';
const devenir = async (p, k, h) => { await p.evaluate(([k, h]) => { if (SESSION) sessionFermer('deconnexion'); sessionOuvrir(k); aller(h); }, [k, h]); await L.calme(p, 800); };   // changer de personne comme le fait l'application : se déconnecter, puis ouvrir la session de l'autre (les données restent en mémoire)
const txt = (p, s) => p.evaluate(s => { const e = document.querySelector(s || '#contenu'); return e ? e.textContent.replace(/\s+/g, ' ').trim() : ''; }, s);
(async () => {
  const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === '1', J = nuit ? 'nuit' : 'jour';
  const c = await L.ouvrir({ profil, qui: 'sm', nuit, hash: 'taches' }), p = c.p;
  const toast = () => p.evaluate(() => { const e = document.getElementById('toast'); return e ? e.textContent.trim() : ''; });
  const mesT = () => p.evaluate(() => TACHES.filter(t => t.qui === rlQui() && !t.fait).length);
  await L.aller(p, 'taches');
  // ── TÂCHES ──
  v('T0 « Mes tâches » : titre et un compteur « Aujourd’hui »', /Mes tâches/.test(await txt(p, '#contenu h1')) && /Aujourd’hui\s*\d/.test(await txt(p)), await txt(p, '#contenu h1'));
  const t0 = await mesT();
  // T1 : Entrée à vide
  await p.focus('[data-tajout],[data-tkxajout]'); await p.keyboard.press('Enter'); await L.calme(p, 200);
  v('T1 Entrée sur une ligne vide ne crée rien', (await mesT()) === t0, { n: await mesT(), t0 });
  // T2 : phrase comme on parle
  await p.fill('[data-tajout],[data-tkxajout]', 'Racheter des cosses demain'); await p.keyboard.press('Enter'); await L.calme(p, 400);
  v('T2a « Racheter des cosses demain » crée une tâche (+1) à MON nom', (await mesT()) === t0 + 1, { n: await mesT(), toast: await toast() });
  v('T2b la tâche part dans « À venir » (demain) et pas « Aujourd’hui »', await p.evaluate(() => { const t = TACHES.find(x => /cosses/.test(x.t)); return !!t && t.d > AUJ && t.qui === rlQui(); }), await p.evaluate(() => JSON.stringify(TACHES.find(x => /cosses/.test(x.t)) || null)));
  // T3 : nom très long
  const LONG = 'Rappeler le fournisseur pour le condensateur permanent 5 µF 450 V et vérifier la référence exacte avant de passer commande chez Climatech';
  await p.fill('[data-tajout],[data-tkxajout]', LONG); await p.keyboard.press('Enter'); await L.calme(p, 400);
  const d1 = await L.deborde(c); v('T3a nom de tâche de 135 signes : pas de glissement latéral', d1.bouge === 0, d1);
  await p.evaluate(() => { const b = document.querySelector('[data-tonglet="auj"]'); b && b.click(); }); await L.calme(p, 300);
  await L.capture(c, CAP + `taches-long-${profil}-${J}.png`);
  // T4 : terminer la tâche du jour : le rond « Choisir » puis « Fait » dans la barre (le rond de Mes tâches ne termine pas d’un seul geste)
  await L.toucher(c, '[data-tonglet="auj"]');
  const avantAuj = await p.evaluate(() => (document.querySelector('[data-tonglet="auj"]') || {}).textContent);
  await L.toucher(c, '[data-tsel="t11"]'); await L.calme(p, 300);
  v('T4a toucher le rond d’une tâche fait apparaître la barre « ✓ Fait · Annuler »', await p.evaluate(() => !!document.querySelector('[data-tsfait]')), await txt(p, 'body').then(t => t.slice(-120)));
  await L.capture(c, CAP + `taches-barre-choix-${profil}-${J}.png`);
  await L.toucher(c, '[data-tsfait]'); await L.calme(p, 400);
  v('T4b « Fait » : le message « Tâche faite » propose « Annuler »', /faite/i.test(await toast()), await toast());
  const apres = await p.evaluate(() => (document.querySelector('[data-tonglet="auj"]') || {}).textContent);
  v('T4c le compteur « Aujourd’hui » baisse', apres !== avantAuj, { avantAuj, apres });
  await p.evaluate(() => { const b = document.querySelector('[data-tonglet="faites"]'); b && b.click(); }); await L.calme(p, 300);
  v('T4d la tâche terminée se retrouve dans « Faites »', /Prévenir M. Durand/.test(await txt(p)), (await txt(p)).slice(0, 200));
  await L.capture(c, CAP + `taches-faites-${profil}-${J}.png`);
  await p.evaluate(() => { const b = document.querySelector('[data-tonglet="auj"]'); b && b.click(); }); await L.calme(p, 300);
  // T5 : Ma journée relit la même liste
  await L.aller(p, 'majournee');
  v('T5 « Ma journée » : la carte « Mes tâches » n’affiche plus la tâche faite (cohérence entre écrans)', !/Prévenir M. Durand 30 min/.test(await txt(p, '#contenu .carte:has([data-tkxajout])') || await txt(p)) , (await txt(p)).slice(0, 100));
  // T6 : ce que le technicien NE voit PAS dans ses tâches
  await L.aller(p, 'taches'); await L.toucher(c, '[data-tonglet="auj"]');
  const cats = await p.evaluate(() => TACHES.filter(t => t.qui === rlQui()).map(t => (t.lien && t.lien.t) || 'libre'));
  const txtT = await txt(p); v('T6 aucune tâche de facture, de devis ou de contrat chez le technicien', !/FAC-|Relancer .* facture|devis|Devis/.test(txtT.replace(/Détails/g, '')), txtT.slice(0, 300));
  // T6b : la fiche d'une tâche du technicien : pas de facture à payer, pas de montant
  await L.toucher(c, '[data-tmodif]'); await L.calme(p, 400);
  const fiche = await p.evaluate(() => { const e = document.querySelector('#calque .panneau'); if (!e) return ''; e.scrollTop = 99999; return e.textContent.replace(/\s+/g, ' ').trim(); });
  v('T6b fiche d’une tâche : ni facture à payer, ni numéro de facture, ni montant', fiche.length > 40 && !/FAC-\d|À payer|€/.test(fiche), fiche.slice(0, 400));
  await L.capture(c, CAP + `taches-fiche-${profil}-${J}.png`);
  await L.ranger(p);
  // T7 : « Détails » = fiche de création
  await L.toucher(c, '[data-tnouv]'); await L.calme(p, 400);
  const pan = await txt(p, '#calque .panneau'); v('T7a « Détails » ouvre « Nouvelle tâche »', /Nouvelle tâche/.test(pan), pan.slice(0, 150));
  v('T7b la fenêtre n’a pas de champ prix / facture / devis (le technicien ne chiffre pas)', !/(Facture|Devis|Prix|Montant)/.test(await txt(p, '#calque .panneau label, #calque .panneau .champ')), pan.slice(0, 400));
  await L.capture(c, CAP + `taches-nouvelle-${profil}-${J}.png`);
  const dpan = await L.doigts(p, '#calque'); v('T7c fenêtre « Nouvelle tâche » : cibles ≥ 44 px et champs ≥ 16 px', dpan.petits.length === 0 && dpan.champs.length === 0 || !c.doigt, { petits: dpan.petits.slice(0, 5), champs: dpan.champs.slice(0, 5) });
  await p.keyboard.press('Escape'); await L.calme(p, 300);
  v('T7d Échap ferme la fenêtre', !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))));
  // ── CONGÉS ──
  await L.aller(p, 'absences');
  v('C0 « Mes congés » : soldes de Sophie, pas ceux d’un autre', /Sophie/.test(await txt(p)) && /Congés payés/.test(await txt(p)), (await txt(p)).slice(0, 160));
  const d0 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'sm').length);
  await L.toucher(c, '[data-atdem]'); await L.calme(p, 400);
  v('C1a « Demande de congé » ouvre la fenêtre', /Demande de congé/.test(await txt(p, '#calque .panneau h2')), await txt(p, '#calque .panneau h2'));
  await L.capture(c, CAP + `conges-demande-${profil}-${J}.png`);
  const dc = await L.doigts(p, '#calque'); v('C1b fenêtre de demande : cibles ≥ 44 px, champs ≥ 16 px', !c.doigt || (dc.petits.length === 0 && dc.champs.length === 0), { petits: dc.petits.slice(0, 6), champs: dc.champs.slice(0, 6) });
  // C2 : fin avant début
  await p.fill('#ad-du', '2026-11-12'); await p.fill('#ad-au', '2026-11-10'); await L.calme(p, 200);
  v('C2a fin avant début : « La date de fin est avant la date de début » et envoi grisé', /fin est avant/.test(await txt(p, '#ad-apercu')) && await p.evaluate(() => document.querySelector('[data-atenvoi]').disabled), await txt(p, '#ad-apercu'));
  // C3 : week-end
  await p.fill('#ad-du', '2026-11-14'); await p.fill('#ad-au', '2026-11-15'); await L.calme(p, 200);
  v('C2b week-end : « Ces jours ne sont pas travaillés »', /pas travaillés/.test(await txt(p, '#ad-apercu')), await txt(p, '#ad-apercu'));
  // C4 : chevauchement avec la demande déjà posée (6 nov matin)
  await p.fill('#ad-du', '2026-11-06'); await p.fill('#ad-au', '2026-11-06'); await L.calme(p, 200);
  console.log('   aperçu chevauchement :', await txt(p, '#ad-apercu'));
  v('C2c une demande qui chevauche la demande déjà envoyée le dit', /déjà|chevauche|même jour|demande en cours/i.test(await txt(p, '#ad-apercu')), await txt(p, '#ad-apercu'));
  // C5 : demande normale, avec un long motif
  await p.fill('#ad-du', '2026-11-16'); await p.fill('#ad-au', '2026-11-18'); await p.selectOption('#ad-ty', 'Congé payé');
  await p.fill('#ad-m', 'Vacances en famille chez mes beaux-parents à Biarritz, retour le mercredi soir, je reste joignable par téléphone en cas d’urgence sur un chantier de la semaine'); await L.calme(p, 200);
  console.log('   aperçu normal :', await txt(p, '#ad-apercu'));
  await L.capture(c, CAP + `conges-demande-remplie-${profil}-${J}.png`);
  await L.toucher(c, '[data-atenvoi]'); await L.calme(p, 500);
  v('C3a la demande est enregistrée (+1) et la fenêtre se ferme', (await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'sm').length)) === d0 + 1 && !(await p.evaluate(() => !!document.querySelector('#calque .panneau'))), { toast: await toast() });
  const pg = await txt(p);
  v('C3b elle est dans « Mes demandes » : dates 16–18 novembre, « En attente de la décision de Marc »', /16.*18 novembre|du 16 nov/i.test(pg) && /En attente/.test(pg), pg.slice(0, 500));
  v('C3c le toast dit ce qui s’est passé', /demande|envoy/i.test(await toast()), await toast());
  await L.capture(c, CAP + `conges-apres-${profil}-${J}.png`);
  v('C3d aucun glissement latéral', (await L.deborde(c)).bouge === 0);
  // C6 : le gérant la voit-il, la valide ?
  await devenir(p, 'marc', 'absences');
  let pgm = await txt(p);
  v('C4a le gérant voit une demande de Sophie à valider', /Sophie/.test(pgm) && /(16|18)/.test(pgm) && /valider|Valider|demande/.test(pgm), pgm.slice(0, 400));
  await L.capture(c, CAP + `conges-gerant-${profil}-${J}.png`);
  // C7 : le technicien retire sa demande
  await devenir(p, 'sm', 'absences');
  const btnR = await p.$('[data-atretire]'); v('C5a « Retirer ma demande » est proposé', !!btnR);
  if (btnR) { const n1 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'sm').length); await L.toucher(c, '[data-atretire]'); await L.calme(p, 400);
    const conf = await txt(p, '#calque .panneau'); console.log('   après « Retirer » :', conf.slice(0, 200), '| toast:', await toast());
    const n2 = await p.evaluate(() => DEMANDES_ABS.filter(d => d.tech === 'sm').length);
    v('C5b « Retirer » : la demande disparaît ou une confirmation s’affiche (jamais rien)', n2 < n1 || !!conf, { n1, n2 }); }
  v('Z aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
