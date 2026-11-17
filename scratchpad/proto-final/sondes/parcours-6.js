// PARCOURS 6 — « un congé » : Sophie le demande AU TÉLÉPHONE (lundi 9 et mardi 10 novembre, congés payés) → la demande arrive chez le gérant → il l'accorde → Sophie est prévenue,
// son solde passe de 3 à 1 jour restant → le Planning la montre « Absente · Congé payé » les deux jours → Temps de travail la compte « en congé » la semaine du 9 (17 novembre 2026).
// Chiffres : du lundi 9 au mardi 10 = 2 jours ouvrés (le mercredi 11 est férié et ne se compte pas) ; solde congés payés 3 j → 1 j ; pris 22 → 24 sur 25.
// PROFIL=… (téléphone par défaut) NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
(async () => {
  let c;
  await P.sec('parcours 6', async () => {
    c = await P.demarrer({ qui:'sm', profil:process.env.PROFIL || 'iphone' }); const p = c.p;
    const e0 = await S(c, () => ({ dem:DEMANDES_ABS.length, abs:ABSENCES.length, dec:DECISIONS_ABS.length, ntfSm:NOTIFS.filter(n => n.k === 'sm').length }));

    /* ── A. Sophie demande ── */
    await L.aller(p, 'absences');
    const mc = net(await txt(c, '#contenu'));
    v('0 population : « Mes congés » de Sophie : congés payés « 3 j restants sur 25 » (22 pris), RTT « 9 j restants sur 10 »', /Mes congés/.test(mc) && /Congés payés\s*3 j restants sur 25\s*22 pris cette année/.test(mc) && /RTT\s*9 j restants sur 10/.test(mc), mc.slice(0, 400));
    v('A1 population : le bouton « ＋ Demande de congé » existe', await clic(c, '[data-atdem]'));
    await p.waitForTimeout(500);
    const fm = net(await txt(c, '#calque'));
    v('A2 (écran) le formulaire : « Elle part à Marc », les types avec leur solde (« Congé payé · 3 jours disponibles »), « Envoyer la demande à Marc »', /Elle part à Marc/.test(fm) && /Congé payé · 3 jours disponibles/.test(fm) && /RTT · 9 jours disponibles/.test(fm) && /Envoyer la demande à Marc/.test(fm), fm.slice(0, 300));
    await S(c, () => { document.getElementById('ad-du').value = '2026-11-09'; document.getElementById('ad-au').value = '2026-11-11'; ['ad-du', 'ad-au'].forEach(i => document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true }))); }); await L.calme(p, 300);
    const f11 = net(await txt(c, '#calque'));
    v('A3 (écran) du 9 au 11 : le mercredi 11 novembre (férié) ne se compte pas — « 2 jours ouvrés à poser », solde « 3 jours disponibles → 1 jour après cette demande »', /2 jours ouvrés à poser/.test(f11) && /3 jours disponibles → 1 jour après cette demande/.test(f11), f11.slice(f11.indexOf('Du lundi'), f11.indexOf('Du lundi') + 220));
    await S(c, () => { document.getElementById('ad-au').value = '2026-11-10'; document.getElementById('ad-m').value = 'Vacances en famille'; ['ad-au', 'ad-m'].forEach(i => document.getElementById(i).dispatchEvent(new Event('input', { bubbles:true }))); }); await L.calme(p, 300);
    await cap(c, '6-A3-demande-' + P.PROFIL);
    await clic(c, '[data-atenvoi]'); await p.waitForTimeout(700);
    const d1 = await S(c, () => { const d = DEMANDES_ABS.find(x => x.tech === 'sm' && x.du === '2026-11-09'); return d ? { id:d.id, au:d.au, type:d.type, etat:d.etat, motif:d.motif, n:DEMANDES_ABS.length } : null; });
    v('A4 (donnée) la demande est à son nom : du 2026-11-09 au 2026-11-10, « Congé payé », « Vacances en famille », « attente »', !!d1 && d1.au === '2026-11-10' && d1.type === 'Congé payé' && d1.etat === 'attente' && d1.motif === 'Vacances en famille' && d1.n === e0.dem + 1, d1);
    v('A5 (écran) Sophie lit « Demande envoyée à Marc. On te préviendra de sa décision. »', /Demande envoyée à Marc\. On te préviendra de sa décision/.test(net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''))));
    const mc2 = net(await txt(c, '#contenu'));
    v('A6 (écran) « Mes demandes » : « Congé payé — En attente de la décision de Marc — Du lundi 9 novembre 2026 au mardi 10 novembre 2026 — 2 jours ouvrés » et « 2 demandés, en attente » sur le solde', /Congé payé\s*En attente de la décision de Marc\s*Du lundi 9 novembre 2026 au mardi 10 novembre 2026\s*2 jours ouvrés/.test(mc2) && /22 pris cette année · 2 demandés, en attente/.test(mc2), mc2.slice(0, 700));
    await cap(c, '6-A6-mesconges-' + P.PROFIL);

    /* ── B. le gérant accorde ── */
    await P.passer(c, 'marc', 'absences');
    const ab = net(await txt(c, '#contenu'));
    v('B1 (écran) Absences et congés : « À valider 4 » (3 d’avant + Sophie), la demande : « Sophie Martin — Congé payé — Du lundi 9 novembre … — Vacances en famille »', /À valider 4/.test(ab) && /Sophie Martin\s*demandé le 31\/10\s*(🌴 )?Congé payé/.test(ab) && /Vacances en famille/.test(ab), ab.slice(ab.indexOf('À valider'), ab.indexOf('À valider') + 120));
    const carte = net(await S(c, id => { const b = document.querySelector('[data-aok="' + id + '"]'); const k = b && b.closest('.at-d, .carte, [data-ademid]'); return k ? k.innerText : ''; }, d1.id));
    v('B2 (écran) la carte de la demande dit « Solde congés payés : 3 jours disponibles → 1 jour après cette absence » et ne signale aucun conflit (« À régler avant de valider » absent)', /3 jours (aujourd’hui|disponibles) → 1 jour après cette absence/.test(carte) && !/À régler avant de valider/.test(carte), carte.slice(0, 400));
    await cap(c, '6-B2-valider-' + P.PROFIL);
    await clic(c, '[data-aok="' + d1.id + '"]'); await p.waitForTimeout(800);
    const b1 = await S(c, id => ({ abs:ABSENCES.filter(a => a.tech === 'sm' && a.du === '2026-11-09').map(a => [a.au, a.type, a.statut, a.decidePar]), dem:DEMANDES_ABS.some(x => x.id === id), dec:DECISIONS_ABS.filter(x => x.tech === 'sm' && x.du === '2026-11-09').map(x => [x.decision, x.par]), ntf:NOTIFS.filter(n => n.k === 'sm').slice(-1).map(n => n.txt), toast:(document.getElementById('toast') || {}).innerText }), d1.id);
    v('B3 (donnée) l’absence est posée : Sophie, du 9 au 10 novembre, « Congé payé », « validee » par marc ; la demande a quitté la file ; la décision est gardée', JSON.stringify(b1.abs) === '[["2026-11-10","Congé payé","validee","marc"]]' && !b1.dem && JSON.stringify(b1.dec) === '[["validee","marc"]]', b1);
    v('B4 (écran) le gérant lit « Absence de Sophie validée. Sophie est prévenue. » ; (donnée) l’avis « Marc a validé ta demande » est bien posé pour Sophie', /Absence de Sophie validée\. Sophie est prévenue/.test(net(b1.toast)) && await S(c, () => A_AVIS.some(a => a.pour === 'sm' && /Marc a validé ta demande/.test(a.titre))), b1);
    const ab2 = net(await txt(c, '#contenu'));
    v('B5 (écran) la liste du gérant : « À valider 3 » (Sophie n’y est plus)', /À valider 3/.test(ab2) && !/demandé le 31\/10\s*(🌴 )?Congé payé\s*Du lundi 9 novembre/.test(ab2), ab2.slice(ab2.indexOf('À valider'), ab2.indexOf('À valider') + 40));

    /* ── C. le Planning et Temps de travail ── */
    await L.aller(p, 'planning'); await clic(c, '[data-plvue="semaine"]'); await clic(c, '[data-plnav="1"]'); await clic(c, '[data-plnav="1"]'); await p.waitForTimeout(500);
    const pl = net(await txt(c, '#contenu'));
    const nAbs = (pl.match(/Absente · Congé payé/g) || []).length;
    v('C1 (écran) Planning, semaine du 9 au 14 novembre : « Absente · Congé payé » le lundi ET le mardi (2 cases) dans la colonne de Sophie, rien le mercredi', /Semaine du 9 nov\. au 14 nov\./.test(pl) && nAbs === 2, { nAbs, entete:pl.slice(pl.indexOf('Semaine du'), pl.indexOf('Semaine du') + 40) });
    await cap(c, '6-C1-planning-' + P.PROFIL);
    /* Temps de travail ne montre que les semaines déjà vécues (l'horloge du prototype est au samedi 31 octobre) : la semaine du 9 novembre n'y est PAS atteignable — on le constate, puis on lit les soldes */
    await L.aller(p, 'pointage'); await clic(c, '[data-tt="onglet|semaine"]'); await p.waitForTimeout(400);
    v('C2 (constat) Temps de travail › Semaine : on ne peut pas aller dans le futur (pas de « Semaine suivante » au-delà de la semaine en cours) : la paie ne compte que ce qui a eu lieu', (await S(c, () => { const b = document.querySelector('[data-tt="nav|1"]'); return !b || b.disabled || b.getAttribute('aria-disabled') === 'true' || b.hidden; })));
    await L.aller(p, 'absences'); await clic(c, '[data-aonglet="soldes"]'); await p.waitForTimeout(400);
    const so = net(await txt(c, '#contenu'));
    v('C3 (écran) Absences et congés › Soldes : « Sophie 1 / 25 » (3 → 1) et « presque plus de congés », RTT 9 / 10 inchangé, « En attente 0,5 j » (le rendez-vous médical du 6 novembre) ; les autres lignes ne bougent pas', /Sophie( Martin)? 1 \/ 25 9 \/ 10 0,5 j presque plus de congés/.test(so) && /Karim( Benali)? 10 \/ 25 9 \/ 10 5 j/.test(so) && /Léa( Roux)? 2 \/ 25 9 \/ 10/.test(so) && /Tom( Leroy)? 6 \/ 25 10 \/ 10 1 j/.test(so), so.slice(so.indexOf('PERSONNE'), so.indexOf('PERSONNE') + 260));

    /* ── D. Sophie retrouve sa réponse et son solde ── */
    await P.passer(c, 'sm', 'absences');
    const mc3 = net(await txt(c, '#contenu'));
    v('D1 (écran) « Mes congés » : « Congés payés 1 j restants sur 25 », « 24 pris cette année » ; la demande est « Validée » dans « Décisions de Marc »', /Congés payés\s*1 j restants sur 25\s*24 pris cette année/.test(mc3) && /Validée · Congé payé\s*Du lundi 9 novembre 2026 au mardi 10 novembre 2026/.test(mc3), mc3.slice(0, 800));
    v('D2 (écran) « Mes congés » lui dit en toutes lettres que Marc a validé : « Marc a validé ta demande »', /Marc a validé ta demande/.test(mc3), mc3.slice(0, 400));
    v('D3 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
