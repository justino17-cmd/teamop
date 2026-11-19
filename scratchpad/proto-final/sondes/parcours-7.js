// PARCOURS 7 — « une journée oubliée » : Tom a commencé vendredi 30 octobre à 07:55 et n'a jamais terminé (Ma journée le lui redemande) → le gérant la TERMINE à 17:20 (« Choisir une
// autre heure ») → traite la demande de correction de Tom (mercredi 28 : 17:40 au lieu de 16:42) → Tom confirme ses heures → le gérant corrige encore une heure AVEC UN MOTIF → Tom doit
// RECONFIRMER (et le sait) → son relevé, celui du gérant et le Mois disent les mêmes heures, à la minute (17 novembre 2026).
// Chiffres recalculés ici : vendredi 07:55 → 17:20 = 9 h 25 − 1 h de pause = 8 h 25 ; mercredi 07:42 → 17:40 = 9 h 58 − 1 h = 8 h 58 (avant : 8 h 00, soit + 58 min) ;
// vendredi 17:20 → 17:30 = + 10 min. Semaine du 26 octobre : 32 h 00 → 40 h 25 (dont 5 h 25 au-dessus de 35 h) → 41 h 23 → 41 h 33. Mois de Tom : 154 h 55 → 163 h 20 → 164 h 18 → 164 h 28.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const mn = h => { const m = /^(\d+)\s*h\s*(\d\d)$/.exec(String(h).replace(/\s/g, '')); return m ? +m[1] * 60 + +m[2] : null; };   // « 154h55 » → minutes
const hh = n => Math.floor(n / 60) + 'h' + String(n % 60).padStart(2, '0');
const heure = async (c, sel, h, m) => { await clic(c, sel); try { await c.p.waitForSelector('#dtpop', { timeout:3000 }); } catch (e) { console.log('   (sélecteur d’heure absent après ' + sel + ') ' + net(await c.p.evaluate(() => (document.querySelector('#calque') || {}).innerText || '')).slice(0, 300)); throw e; } await clic(c, '#dtpop [data-dth="' + h + '"]'); await clic(c, '#dtpop [data-dtmn="' + m + '"]'); if (await c.p.$('#dtpop [data-dtok]')) await clic(c, '#dtpop [data-dtok]'); await L.calme(c.p, 250); };
const moisGerant = async c => { await L.aller(c.p, 'pointage'); await clic(c, '[data-tt="onglet|mois"]'); await c.p.waitForTimeout(400); const t = net(await txt(c, '#contenu'));
  const ligne = (/TL Tom Leroy (\d+h\d\d) dont (\d+h\d\d) en plus ([^]*?)(?= JP | JP|$)/.exec(t) || []); return { tot:mn(ligne[1]), plus:mn(ligne[2]), etat:(ligne[3] || '').trim().slice(0, 40), total:(/([\d  ]+h\d\d) travaillées/.exec(t) || [])[1] }; };
const moisTom = async c => { await L.aller(c.p, 'mesheures'); await c.p.waitForTimeout(400); const t = net(await txt(c, '#contenu')); return { tot:mn((/(\d+h\d\d) ce mois-ci/.exec(t) || [])[1]), plus:mn((/(\d+h\d\d) en plus ce mois-ci/.exec(t) || [])[1]), sem:mn((/(\d+h\d\d) cette semaine/.exec(t) || [])[1]), t }; };
(async () => {
  let c;
  await P.sec('parcours 7', async () => {
    c = await P.demarrer({ qui:'tl' }); const p = c.p;
    const e0 = await S(c, () => ({ ouverte:POINTAGES.find(x => x.id === 'ptl2026-10-30'), mer:POINTAGES.find(x => x.id === 'ptl2026-10-28'), tr:PT_TRACE.length, ntf:NOTIFS.filter(n => n.k === 'tl').length }));
    v('0 population : le vendredi 30 de Tom est ouvert (07:55, sans fin) ; le mercredi 28 va de 07:42 à 16:42 (pause 1 h)', !!e0.ouverte && e0.ouverte.fin === null && e0.ouverte.debut === '07:55' && e0.mer.fin === '16:42' && e0.mer.pause === 60, e0);

    /* ── A. Tom : sa journée est restée ouverte ── */
    const m0t = await moisTom(c);
    await L.aller(p, 'majournee');
    const mj = net(await txt(c, '#contenu'));
    v('A1 (écran) « Ma journée » de Tom : « Ta journée du vendredi 30 octobre est restée ouverte (depuis 07:55). À quelle heure as-tu fini ? » avec 16:47 proposé et « Une autre heure »', /Ta journée du vendredi 30 octobre est restée ouverte \(depuis 07:55\)\. À quelle heure as-tu fini \?\s*16:47\s*Une autre heure/.test(mj), mj.slice(0, 400));
    await cap(c, '7-A1-ouverte-' + P.PROFIL);
    /* « oubliée » : Tom ne répond pas */
    await P.passer(c, 'marc', 'pointage');
    const m0g = await moisGerant(c);
    v('A2 (écran) Mes heures de Tom et le Mois du gérant disent la même chose avant toute correction : 154h55 ce mois-ci, dont 18h05 en plus (la journée ouverte ne compte pas)', m0t.tot === 154 * 60 + 55 && m0t.plus === 18 * 60 + 5 && m0g.tot === m0t.tot && m0g.plus === m0t.plus && /Erreur signalée/.test(m0g.etat), { m0t:[m0t.tot, m0t.plus], m0g });
    await L.aller(p, 'pointage'); await clic(c, '[data-tt="onglet|auj"]'); await p.waitForTimeout(400);
    const aj = net(await txt(c, '#contenu'));
    v('A3 (écran) le gérant lit « Tom n’a pas terminé sa journée du vendredi 30 octobre. Il a commencé à 07:55. » et une demande de correction de Tom (mercredi 28 : 17:40 et non 16:42)', /Tom n’a pas terminé sa journée du vendredi 30 octobre\. Il a commencé à 07:55/.test(aj) && /Tom demande une correction : mercredi 28 octobre, il a fini à 17:40 et non à 16:42/.test(aj), aj.slice(aj.indexOf('À régler'), aj.indexOf('À régler') + 400));

    /* ── B. le gérant termine la journée à 17:20 ── */
    v('B1 population : « Choisir une autre heure » existe pour le vendredi de Tom', await clic(c, '[data-tt="fin|ptl2026-10-30"]'));
    await p.waitForTimeout(400);
    await heure(c, '#calque [data-dtpour="1"]', 17, 20);
    const fe = net(await txt(c, '#calque'));
    v('B2 (écran) la feuille dit « Il a commencé à 07:55. À quelle heure a-t-il fini ? », « Fin 17:20 », « Jamais l’heure qu’il est »', /Il a commencé à 07:55\. À quelle heure a-t-il fini \?/.test(fe) && /Fin 17:20/.test(fe) && /Jamais l’heure qu’il est/.test(fe), fe.slice(0, 300));
    await clic(c, '[data-tt="termineok|ptl2026-10-30"]'); await p.waitForTimeout(700);
    const b1 = await S(c, () => ({ p:POINTAGES.find(x => x.id === 'ptl2026-10-30'), tr:PT_TRACE.filter(t => t.pid === 'ptl2026-10-30').map(t => [t.champ, t.avant, t.apres, t.par]), ntf:NOTIFS.filter(n => n.k === 'tl').slice(-1).map(n => n.txt), toast:(document.getElementById('toast') || {}).innerText }));
    v('B3 (donnée) terminée à 17:20 (pause 1 h), trace « journée pas terminée → 17:20 par marc », Tom prévenu (« Ta journée du vendredi 30 octobre a été terminée à 17:20 par le bureau »)', b1.p.fin === '17:20' && b1.p.pause === 60 && JSON.stringify(b1.tr) === '[["fin","journée pas terminée","17:20","marc"]]' && /terminée à 17:20 par le bureau/.test(b1.ntf[0] || ''), b1);
    v('B4 (écran) « Journée de Tom terminée à 17:20 (8h25). Il la verra dans ses heures. » : 07:55 → 17:20 = 9 h 25, moins 1 h de pause = 8 h 25', /Journée de Tom terminée à 17:20 \(8h25\)\. Il la verra dans ses heures/.test(net(b1.toast)) && (17 * 60 + 20) - (7 * 60 + 55) - 60 === 8 * 60 + 25, b1.toast);
    const m1g = await moisGerant(c);
    v('B5 (écran) le Mois du gérant : Tom passe de 154h55 à 163h20 (+ 8h25) ; « en plus » reste à 18h05 : les 5h25 de la semaine du 26 oct. au 1er nov. sont « payées avec novembre » (la semaine finit en novembre)', m1g.tot - m0g.tot === 8 * 60 + 25 && m1g.plus === m0g.plus, { m0g, m1g });
    await cap(c, '7-B5-mois-' + P.PROFIL);
    await clic(c, '[data-tt="onglet|semaine"]'); await p.waitForTimeout(400);
    const sem = net(await txt(c, '#contenu'));
    v('B6 (écran) la Semaine du 26 oct. : « Tom Leroy Technicien 8h00 07:40–16:40 … 8h25 07:55–17:20 … 40h25 dont 5h25 en plus » (au téléphone, une ligne par personne : « Tom Leroy Technicien 40h25 dont 5h25 en plus »)', (c.largeur >= 700 ? /Tom Leroy Technicien 8h00 07:40–16:40 8h00 07:41–16:41 8h00 07:42–16:42 8h00 07:43–16:43 8h25 07:55–17:20/.test(sem) && /40h25 dont 5h25 en plus/.test(sem) : /Tom Leroy Technicien 40h25 dont 5h25 en plus/.test(sem)), (/Tom Leroy Technicien[^]{0,160}/.exec(sem) || [''])[0]);

    /* ── C. Tom lit sa journée corrigée (le gérant a choisi l'heure) ── */
    await P.passer(c, 'tl', 'mesheures');
    const m1t = await moisTom(c);
    v('C1 (écran) Mes heures : « 40h25 cette semaine », « 163h20 ce mois-ci », « 23h30 en plus ce mois-ci » — les mêmes chiffres que le gérant', m1t.sem === 40 * 60 + 25 && m1t.tot === m1g.tot && m1t.plus === m1g.plus, { m1t:[m1t.sem, m1t.tot, m1t.plus], m1g });
    v('C2 (écran) le vendredi 30 porte « 07:55–17:20 corrigée par le bureau 8h25 »', /ven\. 30 07:55–17:20 corrigée par le bureau 8h25/.test(m1t.t), m1t.t.slice(m1t.t.indexOf('MES JOURNÉES'), m1t.t.indexOf('MES JOURNÉES') + 400));
    await cap(c, '7-C1-mesheures-' + P.PROFIL);
    v('C3 (écran) il a « Ton message est parti au bureau » (la demande du mercredi 28 n’est pas encore traitée)', /Ton message est parti au bureau/.test(m1t.t), m1t.t.slice(0, 300));

    /* ── D. le gérant accepte la demande de Tom : mercredi 28 17:40 ── */
    await P.passer(c, 'marc', 'pointage');
    v('D1 population : « Accepter 17:40 » est proposé', await clic(c, '[data-tt="accepter|tl"]'));
    await p.waitForTimeout(700);
    const d1 = await S(c, () => ({ mer:POINTAGES.find(x => x.id === 'ptl2026-10-28'), tr:PT_TRACE.filter(t => t.pid === 'ptl2026-10-28').slice(-1).map(t => [t.champ, t.avant, t.apres, t.par, t.motif]), ntf:NOTIFS.filter(n => n.k === 'tl').slice(-1).map(n => n.txt) }));
    v('D2 (donnée) le mercredi 28 finit à 17:40 ; trace « 16:42 → 17:40 par marc » qui dit « signalé par Tom, 30/10 »', d1.mer.fin === '17:40' && d1.tr.length === 1 && d1.tr[0][1] === '16:42' && d1.tr[0][2] === '17:40' && d1.tr[0][3] === 'marc' && /signalé par Tom/.test(d1.tr[0][4] || ''), d1);
    const m2g = await moisGerant(c);
    v('D3 (écran) le Mois : Tom + 58 min (07:42 → 17:40 = 9 h 58, − 1 h = 8 h 58, au lieu de 8 h 00) : ' + hh(m1g.tot) + ' → ' + hh(m2g.tot) + ' ; « Erreur signalée » devient « N’a pas encore confirmé »', m2g.tot - m1g.tot === 58 && m2g.plus === m1g.plus && !/Erreur signalée/.test(m2g.etat) && /N’a pas encore confirmé/.test(m2g.etat), { m1g, m2g });
    await P.passer(c, 'tl', 'mesheures');
    const m2t = await moisTom(c);
    v('D4 (écran) Tom : « 164h18 ce mois-ci », « Tes heures d’octobre sont prêtes » avec « Je confirme mes heures » ; son message d’erreur a disparu', m2t.tot === m2g.tot && /Tes heures d’octobre sont prêtes/.test(m2t.t) && /Je confirme mes heures/.test(m2t.t) && !/Ton message est parti au bureau/.test(m2t.t), m2t.t.slice(0, 500));
    await clic(c, '[data-tt^="mhconf|"]'); await p.waitForTimeout(500);
    const cf = await S(c, () => ({ conf:PAIE.confirmes.tl, panneau:(document.querySelector('#calque h2') || {}).textContent || '' }));
    if (cf.panneau) await S(c, () => { const b = [...document.querySelectorAll('#calque .actions button')].find(x => /Confirmer/.test(x.textContent)); if (b) b.click(); });
    await p.waitForTimeout(500);
    const cf2 = await S(c, () => ({ conf:PAIE.confirmes.tl, bloc:(document.querySelector('#contenu .ok-bloc') || {}).innerText || '' }));
    v('E1 (donnée) Tom confirme : « Tu as confirmé tes heures d’octobre le 31/10 » (un journal de la confirmation existe)', !!cf2.conf && /Tu as confirmé tes heures d’octobre le 31\/10/.test(net(cf2.bloc)), cf2);
    await P.passer(c, 'marc', 'pointage');
    const m3g = await moisGerant(c);
    v('E2 (écran) le gérant lit « Confirmé le 31/10 » sur la ligne de Tom (au lieu d’« Erreur signalée »)', /Confirmé le 31\/10/.test(m3g.etat), m3g);

    /* ── F. une correction AVEC MOTIF : Tom doit reconfirmer ── */
    await clic(c, '[data-tt="onglet|semaine"]'); await clic(c, '[data-tt="sem|tl|2026-10-26"]:visible'); await p.waitForTimeout(400);
    await clic(c, '#calque [data-tt="jour|tl|2026-10-30"]'); await p.waitForTimeout(500);
    await heure(c, '#calque [data-ptc="ptl2026-10-30|fin"] + .dt-btn', 17, 30);
    const fm = await S(c, () => ({ motif:!!document.getElementById('pt-motif'), btn:(document.getElementById('tt-enr') || {}).disabled }));
    v('F1 (écran) changer une heure demande « Pourquoi changes-tu cette heure ? » : le bouton « Enregistrer » est grisé tant que le motif est vide', fm.motif && fm.btn === true, fm);
    await p.fill('#pt-motif', 'Fin de journée confirmée par téléphone : 17:30'); await S(c, () => document.getElementById('pt-motif').dispatchEvent(new Event('input', { bubbles:true })));
    await clic(c, '#tt-enr'); await p.waitForTimeout(700);
    const f1 = await S(c, () => ({ p:POINTAGES.find(x => x.id === 'ptl2026-10-30').fin, conf:!!PAIE.confirmes.tl, tr:PT_TRACE.filter(t => t.pid === 'ptl2026-10-30').slice(-1).map(t => [t.champ, t.avant, t.apres, t.motif]), ntf:NOTIFS.filter(n => n.k === 'tl').slice(-1).map(n => n.txt) }));
    v('F2 (donnée) le vendredi finit à 17:30 ; trace « 17:20 → 17:30 » avec le motif ; la confirmation de Tom est RETIRÉE ; Tom est prévenu (« confirme de nouveau »)', f1.p === '17:30' && !f1.conf && f1.tr.length === 1 && f1.tr[0][1] === '17:20' && f1.tr[0][2] === '17:30' && /confirmée par téléphone/.test(f1.tr[0][3]) && /confirme de nouveau/.test(f1.ntf[0] || ''), f1);
    const m4g = await moisGerant(c);
    v('F3 (écran) le Mois : Tom + 10 min (' + hh(m3g.tot) + ' → ' + hh(m4g.tot) + '), et la ligne dit qu’il n’a plus confirmé', m4g.tot - m3g.tot === 10 && /pas encore confirmé/.test(m4g.etat), { m3g, m4g });
    await P.passer(c, 'tl', 'mesheures');
    const m4t = await moisTom(c);
    v('F4 (écran) Tom : « 164h28 ce mois-ci » (comme le gérant) et le bouton « Je confirme mes heures » est revenu', m4t.tot === m4g.tot && /Je confirme mes heures/.test(m4t.t), m4t.t.slice(0, 400));
    await clic(c, '[data-tt="mhjour|tl|2026-10-30"]'); await p.waitForTimeout(500);
    const j30 = net(await txt(c, '#calque'));
    v('F5 (écran) Tom ouvre son vendredi : les DEUX corrections (« journée pas terminée → 17:20 » puis « 17:20 → 17:30 ») avec leur motif, et « 8h35 travaillées » (07:55 → 17:30 = 9 h 35 − 1 h)', /Fin : journée pas terminée → 17:20 par Marc Leblanc/.test(j30) && /Fin : 17:20 → 17:30 par Marc Leblanc[^«]*« Fin de journée confirmée par téléphone : 17:30 »/.test(j30) && /8h35 travaillées/.test(j30), j30.slice(0, 700));
    await cap(c, '7-F5-journee-' + P.PROFIL);
    await S(c, () => fermerPanneau());
    await clic(c, '[data-tt^="mhconf|"]'); await p.waitForTimeout(400); await S(c, () => { const b = [...document.querySelectorAll('#calque .actions button')].find(x => /Confirmer/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(500);
    await P.passer(c, 'marc', 'pointage');
    const m5g = await moisGerant(c);
    v('F6 (écran) Tom reconfirme : le gérant lit « Confirmé le 31/10 » et les mêmes 164h28', /Confirmé le 31\/10/.test(m5g.etat) && m5g.tot === m4g.tot, m5g);
    v('G aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
