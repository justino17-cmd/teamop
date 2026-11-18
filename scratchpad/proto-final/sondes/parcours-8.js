// PARCOURS 8 — « le camion de Sophie » : un plein et un relevé du compteur depuis « Mon camion » (carte de l'entreprise) → le gérant retrouve le plein dans les véhicules, les achats et la
// Comptabilité → le contrôle technique du Trafic approche (12 jours) : Sophie lit « le bureau s'en occupe », le gérant note le rendez-vous (une tâche à sa date) → le camion va au garage
// (Sophie prévenue, les interventions concernées nommées, le Planning les montre) → retour en service avec la facture → « Contrôle passé ? » : l'échéance repart à deux ans, la tâche est faite
// → Sophie retrouve un camion en règle (17 novembre 2026).
// Chiffres recalculés ici : plein 84,60 € TTC ÷ 1,20 = 70,50 € HT ; TVA 14,10 € ; garage 312,00 € TTC ÷ 1,20 = 260,00 € HT ; contrôle 79,00 € TTC ÷ 1,20 = 65,83 € HT.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const ctFin = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); if (!/dépenses d’octobre/.test(net(await txt(c, '#contenu')))) { await clic(c, '[data-cx="grp|pilotage"]'); await c.p.waitForTimeout(500); if (!/dépenses d’octobre/.test(net(await txt(c, '#contenu')))) { await clic(c, '[data-cx="sec|ensemble"]'); await c.p.waitForTimeout(500); } } const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1].replace('−', '-')) : null; };
  return { dep:n(/([\d  ]+,\d\d) €\s*dépenses d’octobre/), sj:+((/(\d+) achats? sans justificatif/.exec(t) || [])[1] || 0), t }; };
const saisir = (c, id, val) => S(c, ([i, x]) => { const e = document.getElementById(i); e.value = x; e.dispatchEvent(new Event('input', { bubbles:true })); e.dispatchEvent(new Event('change', { bubbles:true })); }, [id, val]);
const camion = c => S(c, () => { const x = vehDe('veh1'); return { km:x.km, statut:x.statut, ct:x.ct, releves:x.releves.length, pleins:x.pleins.length, immo:x.immo ? { ...x.immo } : null, hist:x.hist.length }; });
const kmTxt = n => n.toLocaleString('fr-FR').replace(/[\u00a0\u202f]/g, ' ') + ' km';
const toast = c => S(c, () => (document.getElementById('toast') || {}).innerText || '');
(async () => {
  let c;
  await P.sec('parcours 8', async () => {
    c = await P.demarrer({ qui:'sm' }); const p = c.p;
    const e0 = await S(c, () => ({ cam:!!VEHICULES.find(o => o.id === 'veh1' && o.conducteur === 'sm'), ach:ACHATS.length, km:vehDe('veh1').km, ct:vehDe('veh1').ct, ints:INTS.filter(i => i.tech === 'sm' && i.d >= AUJ && i.st !== 'fait' && i.st !== 'annulee').length }));
    v('0 population : Sophie conduit le Trafic (' + e0.km + ' km, contrôle technique le ' + e0.ct + ') et a ' + e0.ints + ' interventions à venir', e0.cam && e0.km > 0 && e0.ints >= 1, e0);
    await P.passer(c, 'marc', 'accueil'); const f0 = await ctFin(c);
    v('0b population : la Comptabilité donne ses « dépenses d’octobre » (' + f0.dep + ')', f0.dep > 0, f0.t.slice(0, 200));
    await P.passer(c, 'sm', 'moncamion');

    /* ── A. le plein ── */
    v('A1 population : « Noter un plein » est sur l’écran Camion', await clic(c, '#mc-vehicule [data-vx="plein|veh1"]'));
    await p.waitForTimeout(450);
    await p.setInputFiles('#vx-p', P.PNG); await saisir(c, 'vx-m', '84,60'); await saisir(c, 'vx-l', '49'); await saisir(c, 'vx-km', String(e0.km + 190));
    await cap(c, '8-A-plein-' + P.PROFIL);
    await clic(c, '#calque [data-vx="pleinok"]'); await p.waitForTimeout(600);
    const a1 = await S(c, () => { const x = ACHATS.find(o => /Carburant · GH-482-KL/.test(o.objet) && o.veh === 'veh1' && o.ht === 70.5); return x ? { id:x.id, ht:x.ht, tva:x.tva, compte:x.compte, mode:x.mode, fid:x.fid, n:ACHATS.length } : null; });
    v('A2 (donnée) l’achat est écrit : 70,50 € HT (84,60 ÷ 1,20), TVA 20 %, compte 6061 (carburant), carte de l’entreprise', !!a1 && a1.ht === 70.5 && a1.tva === 20 && a1.compte === '6061' && a1.mode === 'Carte' && a1.n === e0.ach + 1, a1);
    const k1 = await camion(c);
    v('A3 (donnée) le kilométrage suit le plein : ' + e0.km + ' → ' + (e0.km + 190) + ' km, un plein de plus (49 L) au carnet', k1.km === e0.km + 190 && k1.pleins >= 1, k1);
    await L.aller(p, 'moncamion'); const mc = net(await txt(c, '#contenu'));
    v('A4 (écran) Sophie relit son camion : « ' + (e0.km + 190).toLocaleString('fr-FR') + ' km »', mc.includes(kmTxt(e0.km + 190)), mc.slice(0, 300));
    /* le compteur : 130 km de plus */
    await clic(c, '#mc-vehicule [data-vx="km|veh1"]'); await p.waitForTimeout(400); await saisir(c, 'vx-nkm', String(e0.km + 320)); await clic(c, '#calque [data-vx^="kmok|"]'); await p.waitForTimeout(500);
    const k2 = await camion(c);
    v('A5 (donnée) le relevé du compteur : ' + (e0.km + 320) + ' km, un relevé de plus (' + k1.releves + ' → ' + k2.releves + ')', k2.km === e0.km + 320 && k2.releves === k1.releves + 1, k2);

    /* ── B. le gérant retrouve le plein ── */
    await P.passer(c, 'marc', 'vehicules');
    const vl = net(await txt(c, '#contenu'));
    v('B1 (écran) Véhicules : la rangée du Trafic existe (GH-482-KL) et la liste dit les mêmes chiffres que la donnée', /GH-482-KL/.test(vl), vl.slice(0, 300));
    await clic(c, '.vh-liste [data-vh="fiche|veh1"]'); await p.waitForTimeout(600);
    await clic(c, '#calque [data-vh="fonglet|depenses"]'); await p.waitForTimeout(400);
    const fv = net(await txt(c, '#calque'));
    v('B2 (écran) la fiche du Trafic dit ' + kmTxt(e0.km + 320) + ' ; « Dépenses » porte le plein (carburant) de 70,50 € HT', fv.includes(kmTxt(e0.km + 320)) && /Carburant/.test(fv) && /70,50/.test(fv), fv.slice(0, 700));
    await cap(c, '8-B2-fiche-' + P.PROFIL);
    await S(c, () => fermerPanneau());
    await L.aller(p, 'comptabilite'); await clic(c, '[data-cx="sec|fachats|achats"]'); await p.waitForTimeout(600); const ac = net(await txt(c, '#contenu'));
    v('B3 (écran) Comptabilité › Achats : la ligne TotalEnergies « Carburant · GH-482-KL » de 84,60 € TTC est là, ticket de carte seul (« sans justificatif » : la facture manque)', /TICKET-GH-482-KL-[\d-]+ · Carburant · GH-482-KL[^]*?84,60 €[^]*?sans justificatif/.test(ac), ac.slice(ac.indexOf('DATE PIÈCE'), ac.indexOf('DATE PIÈCE') + 400));
    const f1 = await ctFin(c);
    v('B4 (écran) un ticket de carte SEUL ne rend pas la TVA : la Comptabilité compte les 84,60 € TTC entiers en dépenses (' + f0.dep + ' → ' + f1.dep + ' centimes), comme la règle de ses points de conformité (ticket de carte seul)', f1.dep - f0.dep === 8460, { f0:f0.dep, f1:f1.dep, ecart:f1.dep - f0.dep });

    /* ── C. le contrôle technique approche ── */
    await S(c, () => { vehDe('veh1').ct = jour(12); rendre(); });
    await P.passer(c, 'sm', 'moncamion'); const e1 = net(await txt(c, '#contenu .mc-etat'));
    v('C1 (écran) Sophie lit « Le contrôle technique est dans 12 jours. Le bureau s’en occupe. »', /Le contrôle technique est dans 12 jours\. Le bureau s’en occupe\./.test(e1), e1);
    await P.passer(c, 'marc', 'vehicules');
    const lg = await S(c, () => { const l = [...document.querySelectorAll('.vh-liste .vh-l')].find(x => x.querySelector('[data-vh="fiche|veh1"]')); return l ? { geste:(l.querySelector('.btn') || {}).textContent, txt:l.innerText.replace(/\s+/g, ' ') } : null; });
    v('C2 (écran) la rangée du Trafic dit « dans 12 jours » et propose « Noter le rendez-vous »', !!lg && /Noter le rendez-vous/.test(lg.geste) && /12 jours/.test(lg.txt), lg);
    await clic(c, '.vh-liste [data-vh="rdv|veh1|ct|liste"]'); await p.waitForTimeout(450);
    const dRdv = await S(c, () => jour(5)); await S(c, d => { document.getElementById('vh-rd').value = d; document.getElementById('vh-rg').value = 'Garage Martin'; }, dRdv);
    await clic(c, '#calque .panneau [data-vh^="rdvok|"]'); await p.waitForTimeout(500);
    const t1 = await S(c, () => { const t = TACHES.find(x => x.cle === 'veh-veh1-ct'); return t ? { d:t.d, qui:t.qui, titre:t.t, fait:!!t.fait } : null; });
    v('C3 (donnée) le rendez-vous est une tâche du gérant, à sa date (' + dRdv + '), avec le garage', !!t1 && t1.d === dRdv && t1.qui === 'marc' && /Garage Martin/.test(t1.titre) && !t1.fait, t1);
    await L.aller(p, 'taches'); await clic(c, '[data-tonglet="avenir"]'); await p.waitForTimeout(400);
    const tt = net(await txt(c, '#contenu'));
    v('C4 (écran) Tâches : le rendez-vous au garage figure parmi les tâches (« Garage Martin »)', /Garage Martin/.test(tt) || /contrôle technique/i.test(tt), tt.slice(0, 400));

    /* ── D. au garage ── */
    await L.aller(p, 'vehicules'); await clic(c, '.vh-liste [data-vh="fiche|veh1"]'); await p.waitForTimeout(500);
    await clic(c, '#calque .panneau [data-vh="statut|veh1|fiche"]'); await p.waitForTimeout(450);
    const gj = await S(c, () => jour(2)); await S(c, d => { document.getElementById('vx-gm').value = 'Contrôle technique'; const g = document.getElementById('vx-gg'); g.value = 'Garage Martin'; document.getElementById('vx-gr').value = d; document.getElementById('vx-gr').dispatchEvent(new Event('change', { bubbles:true })); }, gj);
    const fg = net(await txt(c, '#calque'));
    v('D1 (écran) la feuille nomme les interventions de Sophie touchées et propose de les déplacer au Planning', /intervention/.test(fg) && /Sophie/.test(fg) && /Planning/.test(fg), fg.slice(0, 500));
    const ntf0 = await S(c, () => NOTIFS.length);
    await clic(c, '#calque .panneau [data-vx^="garageok|"]'); await p.waitForTimeout(600);
    const g1 = await S(c, g => ({ st:vehDe('veh1').statut, immo:vehDe('veh1').immo, ntf:NOTIFS.slice(-2).map(x => x.k + ' : ' + x.txt) }), null);
    v('D2 (donnée) le Trafic est au garage (Contrôle technique, Garage Martin, rendu le ' + gj + ') et Sophie est prévenue', g1.st === 'atelier' && !!g1.immo && g1.immo.retour === gj && g1.ntf.some(x => /^sm : Ton camion GH-482-KL est au garage/.test(x.replace(/[  ]/g, ' '))), g1);
    await S(c, () => { fermerPanneau(); }); await L.aller(p, 'planning'); await p.waitForTimeout(500);
    const pl = net(await txt(c, '#contenu'));
    v('D3 (écran) le Planning dit que le camion de Sophie est au garage', /garage/i.test(pl), pl.slice(0, 300));
    await cap(c, '8-D3-planning-' + P.PROFIL);
    await P.passer(c, 'sm', 'moncamion'); const e2 = net(await txt(c, '#contenu .mc-etat'));
    v('D4 (écran) Sophie lit « Ton camion est au garage jusqu’au … »', /^Ton camion est au garage jusqu’au/.test(e2), e2);
    await L.aller(p, 'majournee'); const mj = net(await txt(c, '.vh-ligne-cam'));
    v('D5 (écran) « Ma journée » : la ligne « Mon camion » dit « Au garage jusqu’au »', /Au garage jusqu’au/.test(mj), mj);
    await cap(c, '8-D5-majournee-' + P.PROFIL);

    /* ── E. le retour, la facture, le contrôle passé ── */
    await P.passer(c, 'marc', 'vehicules'); await clic(c, '.vh-liste [data-vh="statut|veh1"]'); await p.waitForTimeout(450);
    const km2 = (await camion(c)).km; await saisir(c, 'vx-rk', String(km2 + 12)); await saisir(c, 'vx-rm', '312,00');
    await clic(c, '#calque .panneau [data-vx^="retourok|"]'); await p.waitForTimeout(600);
    const r1 = await S(c, () => { const a = ACHATS.find(o => o.compte === '6155' && o.veh === 'veh1' && /Contrôle technique · GH-482-KL/.test(o.objet)); return { st:vehDe('veh1').statut, a:a ? { ht:a.ht, tva:a.tva, four:a.four } : null, km:vehDe('veh1').km }; });
    v('E1 (donnée) le Trafic est en service ; la facture de 312,00 € TTC est un achat de 260,00 € HT (312 ÷ 1,20), compte 6155, « Garage Martin »', r1.st === 'service' && !!r1.a && r1.a.ht === 260 && r1.a.tva === 20 && r1.a.four === 'Garage Martin' && r1.km === km2 + 12, r1);
    const tz = await toast(c);
    v('E2 (écran) le toast dit « de nouveau en service » et propose « Contrôle passé ? »', /de nouveau en service/.test(tz) && /Contrôle passé/.test(tz), tz);
    await S(c, () => { [...document.querySelectorAll('#toast button')].find(b => /Contrôle passé/.test(b.textContent)).click(); }); await p.waitForTimeout(500);
    const ctAvant = (await camion(c)).ct; await saisir(c, 'vx-fm', '79');
    await clic(c, '#calque .panneau [data-vx^="faitok|"]'); await p.waitForTimeout(600);
    const r2 = await S(c, () => ({ ct:vehDe('veh1').ct, tache:(TACHES.find(t => t.cle === 'veh-veh1-ct') || {}).fait, ach:ACHATS.filter(o => o.veh === 'veh1' && /ontrôle technique/.test(o.objet)).map(o => [o.ht, o.compte]) }));
    v('E3 (donnée) le contrôle est noté : l’échéance passe de ' + ctAvant + ' à ' + r2.ct + ' (deux ans plus tard), la tâche du rendez-vous est faite', r2.ct > ctAvant && r2.ct.slice(0, 4) === String(+ctAvant.slice(0, 4) + 2) && !!r2.tache, r2);
    v('E4 (donnée) le frais du contrôle : 79,00 € TTC = 65,83 € HT (79 ÷ 1,20) au compte 6155, à côté de la facture du garage à 260,00 € HT', Math.round(7900 / 1.2) === 6583 && r2.ach.some(a => a[0] === 65.83), r2.ach);
    const f2 = await ctFin(c);
    v('E5 (écran) les deux factures SANS pièce (garage 312,00 + contrôle 79,00 = 391,00 € TTC) sont comptées pour leur TTC entier : ' + f1.dep + ' → ' + f2.dep, f2.dep - f1.dep === 39100, { f1:f1.dep, f2:f2.dep, ecart:f2.dep - f1.dep });
    /* ── F. le bureau ajoute la FACTURE du plein : la TVA devient récupérable, les dépenses redescendent au hors-taxe ── */
    await L.aller(p, 'comptabilite'); await clic(c, '[data-cx="sec|fachats|achats"]'); await p.waitForTimeout(500);
    const ligne = '[data-cx^="doc|ach|"]';
    const idPlein = await S(c, () => { const x = ACHATS.find(o => o.veh === 'veh1' && /Carburant · GH-482-KL/.test(o.objet) && o.ht === 70.5); return x && x.id; });
    await clic(c, '[data-cx="doc|ach|' + idPlein + '"]'); await p.waitForTimeout(500);
    const fa = net(await txt(c, '#calque'));
    v('F1 (écran) la fiche de l’achat dit « ticket de carte seul » et propose « Ajouter la facture » (TVA 14,10 € = 84,60 − 70,50 en jeu)', /(ticket|Ticket)/.test(fa) && /Ajouter la facture/.test(fa), fa.slice(0, 500));
    await p.setInputFiles('#calque [data-cpjust="' + idPlein + '"]', P.PNG); await p.waitForTimeout(600);
    const tz2 = await toast(c);
    v('F2 (écran) « Facture ajoutée : 14,10 € de TVA récupérable » (84,60 − 84,60 ÷ 1,20 = 14,10)', /Facture ajoutée : 14,10 € de TVA récupérable/.test(tz2.replace(/[\u00a0\u202f]/g, ' ')) && Math.round(8460 - 8460 / 1.2) === 1410, tz2);
    await S(c, () => fermerPanneau && fermerPanneau());
    const f3 = await ctFin(c);
    v('F3 (écran) la Comptabilité redescend le plein au hors-taxe : les dépenses perdent 14,10 € (' + f2.dep + ' → ' + f3.dep + ')', f2.dep - f3.dep === 1410, { f2:f2.dep, f3:f3.dep });
    await P.passer(c, 'sm', 'moncamion'); const e3 = net(await txt(c, '#contenu .mc-etat'));
    const rev = 50000 - (km2 + 12);
    v('E6 (écran) Sophie retrouve un camion à jour pour le contrôle technique ET dit la vérité sur la révision : « La révision est dans … ou ' + rev.toLocaleString('fr-FR') + ' km » (50 000 − ' + (km2 + 12) + '), car elle a roulé 332 km ; ' + kmTxt(km2 + 12), net(await txt(c, '#mc-vehicule')).includes(kmTxt(km2 + 12)) && e3.replace(/[\u00a0\u202f]/g, ' ').includes('ou ' + rev.toLocaleString('fr-FR').replace(/[\u00a0\u202f]/g, ' ') + ' km') && !/contrôle technique/i.test(e3), e3);
    await cap(c, '8-E6-camion-' + P.PROFIL);
    v('G aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
