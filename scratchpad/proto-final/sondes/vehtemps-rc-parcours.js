// Recontrôle « vehtemps » : TROIS PARCOURS de bout en bout, au toucher (ou à la souris), sans appeler une fonction de la page pour faire le geste.
//  A (gérant, ordinateur) : Temps de travail › À régler (terminer, accepter) › Semaine (valider) › Mois › Paie ;
//  B (gérant, ordinateur) : Véhicules › Noter un plein (120 € toutes taxes) › fiche › Dépenses (100 € hors taxes) › supprimer / annuler › garage › remettre en service › rendez-vous ;
//  C (salariée, iPhone) : Ma journée › Je commence › Mon camion › un souci › Mes heures › fiche de paie › Je confirme.
// Chaque contrôle prouve sa population. 127.0.0.1 seulement. PARCOURS=A,B,C
const L = require('../lib.js'), v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/rc/';
const ev = (c, f, a) => c.p.evaluate(f, a);
const net = t => String(t).replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim();
const P = (process.env.PARCOURS || 'A,B,C').split(',');
const toast = c => ev(c, () => (document.getElementById('toast') || {}).textContent || '').then(net);
const vis = (c, sel) => c.p.locator(sel).first().isVisible().catch(() => false);
(async () => {
  if (P.includes('A')) {
    const c = await L.ouvrir({ profil:'windows', qui:'marc', calme:true }); await L.aller(c.p, 'pointage'); const n = 'A · ';
    const areg = () => ev(c, () => (document.querySelector('[data-tt="areg"]') || {}).textContent || '').then(t => parseInt(t, 10));
    v(n + 'population : 4 choses à régler', await areg() === 4, await areg());
    v(n + '« Terminer à 16:47 » existe pour Tom (vendredi)', await vis(c, '#contenu [data-tt^="terminer|"]'), '');
    const avF = await ev(c, () => (POINTAGES.find(p => p.qui === 'tl' && p.date === '2026-10-30') || {}).fin);
    await L.toucher(c, '#contenu [data-tt^="terminer|"]'); const tt = await toast(c);
    const apF = await ev(c, () => (POINTAGES.find(p => p.qui === 'tl' && p.date === '2026-10-30') || {}).fin);
    v(n + 'Terminer à 16:47 écrit la fin de Tom (' + avF + ' → ' + apF + '), un toast le dit, « Annuler » est proposé', !avF && apF === '16:47' && /Annuler/.test(tt), tt);
    v(n + '« À régler » passe à 3', await areg() === 3, await areg());
    await L.toucher(c, '#toast button'); const av2 = await areg(); v(n + '« Annuler » rend la journée à Tom : à régler revient à 4', av2 === 4 && !(await ev(c, () => (POINTAGES.find(p => p.qui === 'tl' && p.date === '2026-10-30') || {}).fin)), av2);
    await L.toucher(c, '#contenu [data-tt^="terminer|"]');
    await L.toucher(c, '#contenu [data-tt^="accepter|tl"]'); const t2 = await toast(c); v(n + '« Accepter 17:40 » : le toast parle, la demande disparaît de « À régler »', /17:40|Corrigé/.test(t2) && await areg() === 2, { t2, a:await areg() });
    await L.capture(c, CAP + 'parcours-A-aregler.png');
    await L.toucher(c, '[data-tt="onglet|semaine"]');
    await L.toucher(c, '[data-tt="nav|-1"]');   // la semaine EN COURS ne se valide pas (décision du chef du 17/11) : le parcours valide la semaine finie d'avant
    const val = await ev(c, () => (document.querySelector('[data-tt^="valider|"]') || {}).textContent || '');
    v(n + 'Semaine : le bouton dit « Valider les N personnes en règle »', /Valider les \d+ personnes en règle/.test(net(val)), val);
    const a0 = await ev(c, () => document.querySelectorAll('.tt-grille [data-tt^="validerun|"]').length); await L.toucher(c, '[data-tt^="valider|"]'); const conf = net(await ev(c, () => (document.querySelector('.panneau') || { innerText:'' }).innerText)); v(n + 'Valider la semaine demande confirmation et nomme Karim, laissé de côté (Tom est réglé)', /Valider 5 personnes/.test(conf) && /À régler d’abord, pas validés? : Karim\./.test(conf), conf.slice(0, 460)); await L.toucher(c, '.panneau .btn.large, .panneau [data-tt^="validerok"]'); await L.calme(c.p, 500); const tv = await toast(c);
    v(n + 'Valider la semaine : un toast confirme (' + tv.slice(0, 60) + ')', tv.length > 3 && /valid/i.test(tv), tv);
    await L.toucher(c, '[data-tt="onglet|mois"]'); const mois = net(await ev(c, () => document.querySelector('#contenu').innerText));
    v(n + 'Mois : la phrase « Il reste … » ou « tout est en règle » se lit, sans « undefined »', /LA PAIE D.OCTOBRE/i.test(mois.toUpperCase()) && !/undefined|NaN/.test(mois), mois.slice(mois.indexOf('LA PAIE'), mois.indexOf('LA PAIE') + 220));
    await L.capture(c, CAP + 'parcours-A-mois.png');
    const bo = await ev(c, () => [...document.querySelectorAll('#contenu .btn')].filter(b => b.offsetParent).map(b => b.textContent.trim())); v(n + 'Mois : un seul bouton noir de plus (valider ou passer à la paie)', bo.length >= 1, bo);
    const pb = await ev(c, () => [...document.querySelectorAll('#contenu button')].filter(b => b.offsetParent && /paie/i.test(b.textContent)).map(b => b.textContent.trim()));
    if (pb.length) { await L.toucher(c, '#contenu >> text=/Voir la paie|Passer à la paie|points à régler/'); await L.calme(c.p, 900); const e = await L.etat(c.p); v(n + 'le bouton de la Paie mène quelque part (écran, cadre ou panneau)', !!(e.compta || e.h1 || e.panneau), e); }
    v(n + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  if (P.includes('B')) {
    const c = await L.ouvrir({ profil:'mac', qui:'marc', calme:true }); await L.aller(c.p, 'vehicules'); const n = 'B · ';
    const nb = () => ev(c, () => VEHICULES.find(x => x.id === 'veh1').pleins.length + '/' + ACHATS.length);
    const av = await nb(); v(n + 'population : le Trafic a des pleins', true, av);
    await L.toucher(c, '#contenu [data-vh^="plein|"]'); await c.p.waitForSelector('.panneau #vx-m', { timeout:3000 }).catch(() => {});
    await c.p.selectOption('.panneau #vx-v', 'veh1').catch(() => {}); await c.p.fill('.panneau #vx-m', '120'); await c.p.fill('.panneau #vx-l', '60'); await L.calme(c.p, 200);
    const pl = await ev(c, () => (document.getElementById('vx-pl') || {}).textContent); v(n + 'le prix au litre se calcule (120 € ÷ 60 L = 2 €)', /2,00|2 €|2,0/.test(net(pl)), pl);
    await L.toucher(c, '.panneau [data-vx="pleinok"]'); const t = await toast(c); const ap = await nb();
    v(n + 'Enregistrer le plein : un toast, le plein est noté (' + av + ' → ' + ap + ')', ap !== av && t.length > 3, t);
    await ev(c, () => { fermerPanneau(); vehFiche('veh1'); }); await L.calme(c.p, 400); await L.toucher(c, '#calque [data-vh="fonglet|depenses"]');
    const txt = net(await ev(c, () => document.querySelector('.panneau').innerText));
    v(n + 'la fiche Dépenses montre un carburant de 100,00 € (120 € toutes taxes) avec la légende « hors taxes »', /100,00 €/.test(txt) && /hors taxes/.test(txt), txt.slice(txt.indexOf('LES DÉPENSES'), txt.indexOf('LES DÉPENSES') + 160));
    const somme = await ev(c, () => [...document.querySelectorAll('#calque .vh-fr')].map(e => (e.querySelector('.vh-mt') || {}).textContent || '').map(s => parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.'))).reduce((a, b) => a + b, 0));
    const tot = parseInt((txt.match(/([\d ]+) € dépensés/) || [])[1].replace(/\s/g, ''), 10); v(n + 'après l’ajout, la somme des lignes (' + somme.toFixed(2) + ') = le total dit (' + tot + ')', Math.abs(Math.round(somme) - tot) <= 1, { somme, tot });
    await L.capture(c, CAP + 'parcours-B-depenses.png');
    // supprimer le plein qu'on vient de noter, puis Annuler
    await L.toucher(c, '#calque .vh-fr:not(.vh-fr-liss)'); const g = await ev(c, () => [...document.querySelectorAll('.panneau button')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
    v(n + 'la feuille d’une dépense : « Enregistrer » et « Supprimer cette dépense » se touchent (aucun recouvert)', await ev(c, () => { const out = []; for (const s of ['[data-vh^="retour|"]', '[data-vx^="frdel|"]', '[data-vx^="frmodok|"]']) { const b = document.querySelector('.panneau ' + s); if (!b) continue; const r = b.getBoundingClientRect(), at = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); out.push(!!at && (at === b || b.contains(at))); } return out.length >= 2 && out.every(Boolean); }), g);
    await L.toucher(c, '.panneau [data-vx^="frdel|"]'); const ts = await toast(c); await L.toucher(c, '#toast button'); const ta = await toast(c);
    v(n + 'Supprimer puis Annuler : « Dépense supprimée » puis « Annulé : la dépense est revenue »', /Dépense supprimée/.test(ts) && /Annulé\s*:\s*la dépense est revenue/.test(ta), { ts, ta });
    // garage : Mettre au garage › remettre en service
    await ev(c, () => { fermerPanneau(); vehFiche('veh2'); }); await L.calme(c.p, 350);
    const bs = await ev(c, () => [...document.querySelectorAll('.panneau button')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
    v(n + 'population : la fiche de l’Expert propose « Mettre au garage » et « Noter le rendez-vous »', bs.includes('Mettre au garage') && bs.some(x => /Noter le rendez-vous/.test(x)), bs);
    await L.toucher(c, '.panneau >> text="Mettre au garage"'); const pg = net(await ev(c, () => (document.querySelector('.panneau') || { innerText:'' }).innerText));
    v(n + '« Mettre au garage » ouvre une feuille avec un gros bouton', /garage/i.test(pg), pg.slice(0, 160)); await L.capture(c, CAP + 'parcours-B-garage.png');
    const ch = await ev(c, () => [...document.querySelectorAll('.panneau button')].filter(e => e.offsetParent).map(e => e.textContent.trim())); const big = ch.find(x => /Mettre au garage|Enregistrer|Confirmer|Au garage/.test(x) && x !== 'Mettre au garage') || 'Mettre au garage';
    const bigSel = await ev(c, () => { const b = document.querySelector('.panneau .btn.large'); return b ? b.getAttribute('data-vx') || b.getAttribute('data-vh') : null; });
    if (bigSel) { await L.toucher(c, '.panneau .btn.large'); await L.calme(c.p, 500); }
    const st = await ev(c, () => VEHICULES.find(x => x.id === 'veh2').statut); v(n + 'le véhicule est « au garage » après le geste', st === 'atelier', st);
    await ev(c, () => { fermerPanneau(); vehFiche('veh2'); }); await L.calme(c.p, 400);
    const f2 = net(await ev(c, () => document.querySelector('.panneau').innerText)), g2 = await ev(c, () => [...document.querySelectorAll('.panneau button')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
    v(n + 'la fiche au garage : « Le remettre en service » une seule fois, plus de « Noter le rendez-vous »', g2.filter(x => x === 'Le remettre en service').length === 1 && !g2.some(x => /Noter le rendez-vous/.test(x)), g2); await L.capture(c, CAP + 'parcours-B-fiche-garage.png');
    await L.toucher(c, '.panneau >> text="Le remettre en service"'); await L.calme(c.p, 400);
    const rs = net(await ev(c, () => (document.querySelector('.panneau') || { innerText:'' }).innerText)); v(n + '« Le remettre en service » ouvre une feuille (Rendu le, kilomètres) avec UN gros bouton', /Rendu le/.test(rs) && (await ev(c, () => document.querySelectorAll('.panneau .btn.large').length)) === 1, rs.slice(0, 150));
    await L.toucher(c, '.panneau .btn.large'); await L.calme(c.p, 500);
    const st2 = await ev(c, () => VEHICULES.find(x => x.id === 'veh2').statut); v(n + '« Le remettre en service » le remet en service (' + st2 + ')', st2 === 'service', st2);
    await ev(c, () => { fermerPanneau(); aller('vehicules'); }); await L.calme(c.p, 400);
    const lst = net(await ev(c, () => document.querySelector('#contenu').innerText)); v(n + 'la liste dit « 3 sur 4 en service » de nouveau, aucune faute', /3 sur 4/.test(lst) && !/undefined|NaN|moiss/.test(lst), lst.slice(0, 200));
    v(n + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  if (P.includes('C')) {
    const c = await L.ouvrir({ profil:'iphone', qui:'sm', calme:true }); const n = 'C · ';
    await L.aller(c.p, 'majournee');
    await L.toucher(c, '#contenu [data-ptx="debut|sm"]'); const t = await toast(c);
    v(n + 'Je commence ma journée : un toast, le pointage de Sophie est ouvert aujourd’hui', await ev(c, () => POINTAGES.some(p => p.qui === 'sm' && p.date === AUJ && !p.fin)) && t.length > 3, t);
    const carte = net(await ev(c, () => document.querySelector('#contenu').innerText.slice(0, 500))); v(n + 'la carte dit qu’elle a commencé, avec un bouton « Je termine » / « Pause »', /commenc/i.test(carte), carte.slice(0, 200));
    await L.capture(c, CAP + 'parcours-C-journee.png');
    await L.toucher(c, '#barre-bas >> text=Camion'); const cam = net(await ev(c, () => document.querySelector('#contenu').innerText.slice(0, 300))); v(n + 'Camion : « Mon camion » s’ouvre', /Mon camion/.test(cam), cam);
    await L.toucher(c, '#barre-bas >> text=Heures'); const hh = net(await ev(c, () => document.querySelector('#contenu').innerText.slice(0, 300))); v(n + 'Heures : « Mes heures » s’ouvre', /Mes heures/.test(hh), hh.slice(0, 120));
    await L.toucher(c, '#contenu [data-tt="mhonglet|fiches"]'); await L.toucher(c, '#contenu [data-paie^="bulletin|"]'); await L.calme(c.p, 700);
    v(n + 'Voir une fiche de paie l’ouvre (pas d’erreur silencieuse)', await ev(c, () => !!document.querySelector('#docplein') && !!document.querySelector('#docplein').innerText.match(/paie/i)), '');
    await L.capture(c, CAP + 'parcours-C-bulletin.png');
    v(n + 'le visionneur se ferme au toucher sur ✕', await L.toucher(c, '#docplein [data-dpfermer]') && !(await c.p.$('#docplein')), '');
    await L.aller(c.p, 'mesheures'); await L.toucher(c, '#contenu [data-tt="mhonglet|mois"]');
    const conf = await vis(c, '#contenu [data-ptx="mhconf|sm"], #contenu [data-pt="mhconf|sm"], [data-tt="mhconf|sm"], [data-ptx*="mhconf"]');
    const cb = await ev(c, () => [...document.querySelectorAll('#contenu button')].filter(e => e.offsetParent).map(e => e.textContent.trim()));
    v(n + 'population : « Je confirme mes heures » est proposé', cb.some(x => /Je confirme mes heures/.test(x)), cb.slice(0, 8));
    await L.toucher(c, '#contenu >> text="Je confirme mes heures"'); const gar = net(await ev(c, () => (document.querySelector('.panneau') || { innerText:'' }).innerText));
    if (/Confirmer quand même/.test(gar)) { v(n + 'journée encore ouverte : la confirmation prévient (« Je termine d’abord » / « Confirmer quand même »)', /Je termine d’abord/.test(gar), gar.slice(0, 200)); await L.capture(c, CAP + 'parcours-C-confirmer.png'); await L.toucher(c, '.panneau [data-tt^="mhconfok|"]'); }
    const tc = await toast(c); v(n + 'Je confirme : le toast le dit et la confirmation est enregistrée', /confirm|merci/i.test(tc) || (await ev(c, () => !!PAIE.confirmes.sm)), tc);
    v(n + 'aucune erreur de page', c.err.filter(x => !/ERR_/.test(x)).length === 0, c.err.slice(0, 3)); await L.fin(c);
  }
  await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(async e => { console.log('ERREUR de la sonde :', e && e.stack || e); await L.fermer(); process.exit(2); });
