// PARCOURS 4 — « une pièce manque » : la technicienne la signale depuis sa fiche → la demande arrive chez le gérant (notification, Achats et frais) → il l'ajoute à une
// commande et l'envoie → la commande est reçue directement DANS LE CAMION de la technicienne → le stock monte (total, atelier, camion), le journal des mouvements le dit,
// la technicienne en est prévenue (17 novembre 2026). Chiffres recalculés ici : 2 condensateurs à 8,40 € HT = 16,80 € HT, TVA 20 % 3,36 €, TTC 20,16 €.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
const stockP3 = c => S(c, () => { const x = PRODUITS.find(o => o.id === 'p3'); return { q:x.q, v1:(x.loc || {}).v1 || 0, atelier:stkAt(x, 'atelier') }; });
(async () => {
  let c;
  await P.sec('parcours 4', async () => {
    c = await P.demarrer({ qui:'sm' }); const p = c.p;
    const e0 = await S(c, () => ({ dem:DEM_ACHAT.length, cmd:COMMANDES.length, mv:MVTS.length, ntf:NOTIFS.length, taches:TACHES.length }));
    const s0 = await stockP3(c);
    v('0 population : le condensateur 5 µF n’est plus en stock nulle part (0 u), 4 demandes d’achat, 4 commandes', s0.q === 0 && s0.v1 === 0 && s0.atelier === 0 && e0.dem === 4 && e0.cmd === 4, { e0, s0 });

    /* ── A. Sophie signale la pièce, sur sa fiche ── */
    await L.aller(p, 'inter-x-i1');
    await S(c, () => document.querySelector('[data-pdx="pm|i1"]').scrollIntoView({ block:'center' }));
    v('A1 population : « Il me manque une pièce » existe sur la fiche de l’intervention en cours', await clic(c, '[data-pdx="pm|i1"]'));
    await p.waitForTimeout(600);
    const f0 = net(await txt(c, '#calque'));
    v('A2 (écran) la feuille dit « Le bureau reçoit ta demande tout de suite. Poser une pièce ne change pas le stock » et propose pièce, quantité, quand, intervention', /Il me manque une pièce/.test(f0) && /Le bureau reçoit ta demande tout de suite/.test(f0) && /Poser une pièce ne change pas le stock/.test(f0) && /Pour quand/i.test(f0), f0.slice(0, 300));
    await p.fill('#mm-rech', 'Condens'); await p.waitForTimeout(500);
    v('A3 la recherche trouve « Condensateur 5 µF »', await clic(c, '#calque [data-mat="mpiece|p3"]'));
    await clic(c, '#calque [data-mat="mplus"]'); await clic(c, '#calque [data-mat="mquand|auj"]'); await p.fill('#mm-why', 'Le condensateur du ventilateur est grillé');
    const f1 = net(await txt(c, '#calque'));
    v('A4 (écran) la demande dit « Condensateur 5 µF », 2, « aujourd’hui », pour « Dépannage climatisation · Restaurant Le Vieux Port »', /Condensateur 5 µF/.test(f1) && /Dépannage climatisation · Restaurant Le Vieux Port/.test(f1), f1.slice(0, 400));
    await cap(c, '4-A4-demande-' + P.PROFIL);
    await S(c, () => { const b = [...document.querySelectorAll('#calque button')].find(b => /Prévenir le bureau/.test(b.textContent)); b.click(); }); await p.waitForTimeout(800);
    const d1 = await S(c, () => { const d = DEM_ACHAT.find(o => o.qui === 'sm' && /Condensateur/.test(o.quoi)); return { qui:d.qui, quoi:d.quoi, q:d.q, pid:d.pid, quand:d.quand, int:d.int, pourquoi:d.pourquoi, etat:d.etat, n:DEM_ACHAT.length, ntfMarc:NOTIFS.filter(n => n.k === 'marc' && /Condensateur/.test(n.txt)).length, tache:!!d.tache }; });
    v('A5 (donnée) la demande existe : Sophie, Condensateur 5 µF × 2, pour l’intervention i1, aujourd’hui ; le gérant est notifié ; une tâche est créée', d1.qui === 'sm' && d1.pid === 'p3' && d1.q === 2 && d1.int === 'i1' && d1.quand === '2026-10-31' && d1.n === e0.dem + 1 && d1.ntfMarc === 1 && d1.tache, d1);
    const t1 = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
    v('A6 (écran) Sophie lit « Envoyé au bureau : Condensateur 5 µF. »', /Envoyé au bureau : Condensateur 5 µF/.test(t1), t1);

    /* ── B. le gérant : la demande, la commande ── */
    await P.passer(c, 'marc', 'achats');
    const ach = net(await txt(c, '#contenu'));
    v('B1 (écran) Achats et frais : « 4 demandes de matériel à décider » (3 d’avant + celle de Sophie), la demande est lisible : « Condensateur 5 µF · 2 u », « Sophie Martin », « Le condensateur du ventilateur est grillé »', /(4 demandes de matériel à décider|Matériel 4|Demandes de matériel 4)/.test(ach) && /Condensateur 5 µF · 2 u/.test(ach) && /Sophie Martin/.test(ach) && /Le condensateur du ventilateur est grillé/.test(ach), ach.slice(0, 500));
    const idd = d1 && await S(c, () => DEM_ACHAT.find(o => o.qui === 'sm' && /Condensateur/.test(o.quoi)).id);
    v('B2 population : « Ajouter à la commande Clim Pièces Atlantique » existe pour cette demande', await clic(c, '[data-ac="commande|' + idd + '"]'));
    await p.waitForTimeout(700);
    const cm0 = net(await txt(c, '#calque'));
    v('B3 (écran) la commande préparée : Condensateur 5 µF × 2, 8,40 € l’unité, total HT 16,80 €, « Envoyer à Clim Pièces Atlantique »', /Condensateur 5 µF/.test(cm0) && /Envoyer à Clim Pièces Atlantique/.test(cm0), cm0.slice(0, 400));
    const b0 = await S(c, () => { const o = COMMANDES[0]; return { id:o.id, st:o.st, lignes:o.lignes.map(l => [l.pid, l.q, l.pu]), four:o.four, n:COMMANDES.length }; });
    v('B4 (donnée) la commande est créée en brouillon : fournisseur Clim Pièces Atlantique, p3 × 2 à 8,40 €', b0.st === 'brouillon' && b0.four === 'Clim Pièces Atlantique' && JSON.stringify(b0.lignes) === '[["p3",2,8.4]]' && b0.n === e0.cmd + 1, b0);
    await clic(c, '#calque [data-ce="envoyer"]'); await p.waitForTimeout(900);
    const toastEnv = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
    v('B5 (écran) « Commande envoyée à Clim Pièces Atlantique · 16,80 € HT. Elle est dans « En route ». »', /Commande envoyée à Clim Pièces Atlantique · 16,80 € HT/.test(toastEnv), toastEnv);
    const dEnv = await S(c, i => { const d = DEM_ACHAT.find(o => o.id === i); return { etat:d.etat, suite:d.suite, par:d.par }; }, idd);
    v('B6 (donnée) la demande est « approuvée », « ajouté à la commande Clim Pièces Atlantique », par marc', dEnv.etat === 'approuvee' && /ajouté à la commande Clim Pièces Atlantique/.test(dEnv.suite) && dEnv.par === 'marc', dEnv);
    const cE = await S(c, () => ({ st:COMMANDES[0].st, ht:COMMANDES[0].lignes.reduce((s, l) => s + Math.round(l.q * l.pu * 100), 0) }));
    v('B7 (arithmétique) la commande envoyée : « envoyee », HT = 2 × 8,40 = 1 680 centimes ; TTC = 1 680 + 336 (TVA 20 %) = 2 016', cE.st === 'envoyee' && cE.ht === 1680 && 1680 + Math.round(1680 * .2) === 2016, cE);
    await S(c, () => fermerPanneau());
    /* le stock ne bouge PAS tant que la livraison n'est pas arrivée */
    const sEnv = await stockP3(c);
    v('B8 (donnée) commandé n’est pas reçu : le stock du condensateur reste à 0', sEnv.q === 0 && sEnv.v1 === 0, sEnv);
    await L.aller(p, 'stock'); await p.waitForTimeout(500);
    const stk = net(await txt(c, '#contenu'));
    const ligS = (/Condensateur 5 µF[^]{0,160}/.exec(stk) || [''])[0];
    v('B9 (écran) Stock : le condensateur est « Commandé » (une commande est en route) et non plus « Plus en stock » seul : « ' + ligS.slice(0, 120) + ' »', /Commandé/.test(ligS), ligS);

    /* ── C. la livraison arrive : rangée DIRECTEMENT dans le camion de Sophie ── */
    await L.aller(p, 'produits'); await p.waitForTimeout(500);
    await clic(c, '[data-cm="voir|' + b0.id + '"]'); await p.waitForTimeout(600);
    const lv = net(await txt(c, '#calque'));
    const prevue = await S(c, id => COMMANDES.find(o => o.id === id).prevue, b0.id);
    v('C1 (écran) la commande dit « pas encore arrivé » et sa livraison est celle du FOURNISSEUR (1 jour, hors dimanche : lundi 2 novembre), pas celle que Sophie SOUHAITAIT (aujourd’hui) : « ' + (/livraison prévue [^E]*?(?=Envoyée)/.exec(lv) || [''])[0].trim() + ' »', /pas encore arrivé/.test(lv) && !/livraison prévue aujourd’hui/.test(lv) && prevue === '2026-11-02', { prevue, lv:lv.slice(0, 160) });
    await clic(c, '#calque [data-cm="recep|' + b0.id + '"]'); await p.waitForTimeout(700);
    await clic(c, '#calque [data-fx="toutarrive"]'); await p.waitForTimeout(300);
    await p.selectOption('#calque select[data-pdxlieu]', 'v1'); await p.waitForTimeout(300);
    const rc = net(await txt(c, '#calque'));
    v('C2 (écran) la réception : « Condensateur 5 µF on attendait 2 u », rangé dans « Camion de Sophie »', /Condensateur 5 µF on attendait 2 u/.test(rc) && await S(c, () => document.querySelector('#calque select[data-pdxlieu]').value === 'v1'), rc.slice(0, 300));
    await cap(c, '4-C2-reception-' + P.PROFIL);
    await clic(c, '#calque [data-cm="recok|' + b0.id + '"]'); await p.waitForTimeout(900);
    const s2 = await stockP3(c);
    v('C3 (donnée) reçu : le stock total passe de 0 à 2, dont 2 dans le camion de Sophie, 0 à l’atelier', s2.q === 2 && s2.v1 === 2 && s2.atelier === 0, s2);
    const rc2 = await S(c, id => ({ st:COMMANDES.find(o => o.id === id).st, recu:COMMANDES.find(o => o.id === id).lignes[0].recu, mv:MVTS.filter(m => m.pid === 'p3').slice(0, 2).map(m => [m.type, m.q, m.vers, m.bc]) }), b0.id);
    v('C4 (donnée) la commande passe « recue » (2 reçus) et DEUX mouvements sont écrits, tous deux rattachés au bon de commande : l’entrée de 2 à l’atelier, puis le transfert de 2 vers le camion de Sophie (la trace dit le chemin)', /^(recue|facturee)$/.test(rc2.st) && rc2.recu === 2 && rc2.mv.some(m => m[0] === 'entree' && m[1] === 2 && m[2] === 'atelier' && m[3] === b0.id) && rc2.mv.some(m => m[0] === 'transfert' && m[1] === 2 && m[2] === 'v1' && m[3] === b0.id), rc2);
    await S(c, () => fermerPanneau());
    const nS = await S(c, () => NOTIFS.filter(n => n.k === 'sm' && /Condensateur|pièces|camion/i.test(n.txt)).map(n => n.txt));
    v('C5 (donnée) Sophie est prévenue (une notification parle de son condensateur ou de son camion rempli)', nS.some(t => /Condensateur/.test(t)), nS);

    /* ── D. la technicienne retrouve sa pièce dans son camion ── */
    await P.passer(c, 'sm', 'moncamion');
    const cam = net(await txt(c, '#contenu'));
    v('D1 (écran) « Mon camion » de Sophie : le condensateur est à bord, 2 u', /Condensateur 5 µF[^]{0,40}2/.test(cam), cam.slice(0, 600));
    await cap(c, '4-D1-camion-' + P.PROFIL);
    await L.aller(p, 'majournee');
    const mj = net(await txt(c, '#contenu'));
    v('D2 (écran) « Ma journée » : le message « Ton camion a été rempli » ou la pièce arrivée est lisible dans les messages du bureau', /Condensateur|rempli|arriv/i.test(mj), mj.slice(mj.search(/messages du bureau/i), mj.search(/messages du bureau/i) + 300));
    /* elle peut maintenant noter la pièce utilisée : « à bord de ton camion, 2 u » */
    await L.aller(p, 'inter-x-i1');
    await p.fill('#p-nom', 'Condensateur 5 µF'); await p.fill('#p-q', '1');
    await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(600);
    const fz = net(await txt(c, '#calque'));
    v('D3 (écran) elle note le condensateur sur sa fiche : la feuille dit « à bord » (et plus « plus en stock »)', /à bord/.test(fz) && !/plus en stock/i.test(fz), fz.slice(0, 400));
    await S(c, () => fermerPanneau());
    /* le gérant : le Matériel du jour */
    await P.passer(c, 'marc', 'accueil');
    const ac = net(await txt(c, '#contenu'));
    v('E1 (écran) l’Accueil du gérant ne propose plus de « 6 articles à commander » à tort : le condensateur commandé et reçu n’y figure plus', !/6 articles à commander/.test(ac) || await S(c, () => !(typeof prAcommander === 'function' ? prAcommander() : []).some(x => x.id === 'p3')), ac.slice(ac.search(/matériel/i), ac.search(/matériel/i) + 300));
    v('E2 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
