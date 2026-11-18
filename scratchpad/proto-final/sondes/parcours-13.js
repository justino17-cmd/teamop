// PARCOURS 13 — « une intervention ANNULÉE » (18 novembre 2026, recontrôle des parcours, défaut R4) : le gérant crée l'intervention depuis le courriel, Sophie note une pièce (une sortie attend l'accord du bureau),
// le gérant l'ANNULE depuis le Planning, puis « Rétablir » (tout revient), puis il l'annule de nouveau. On relit : la donnée ET l'écran de chacun.
//   · l'annulation DIT VRAI : Sophie reçoit une notification, l'Historique garde sa ligne, le texte ne promet AUCUN courriel que personne n'écrit ;
//   · le stock ne bouge pas pour un travail annulé : la sortie de pièces quitte « Envois à accepter » (et même forcée à l'acceptation, elle ne retire rien) ;
//   · aucune PORTE ne pose « terminée » sur une fiche annulée : bouton de la fiche, menu du Planning, « Je ne peux pas finir », fin de visite — rien ne part au client, aucune facture ne naît ;
//   · « Rétablir » rend tout : l'état, l'envoi en attente, et retire la notification et la ligne d'Historique écrites.
// PROFIL=… NUIT=1. Rend « N ✓ · M ✗ », sort en 1 si un contrôle tombe. ⛔ 127.0.0.1 seulement. Rouge AVANT la correction (7 ✗ à la première version de R4), vert après.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const FERMER_FEUILLE = c => S(c, () => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); });
const toast = c => S(c, () => ((document.getElementById('toast') || {}).innerText || '').replace(/\s+/g, ' ').trim());
const creerInt = async c => { const p = c.p;
  await L.aller(p, 'boiteMail'); await L.attendre(p, () => !!(window.R && window.R() && window.R().querySelectorAll('.msg').length), 9000); await p.waitForTimeout(600);
  const msg = p.locator('#courrier-hote .msg', { hasText:'Climatisation chambre 214' }).first(); if (c.doigt) await msg.tap(); else await msg.click(); await p.waitForTimeout(800);
  const bt = p.locator('#courrier-hote .hband button', { hasText:'Créer l’intervention' }).first(); if (c.doigt) await bt.tap(); else await bt.click(); await p.waitForTimeout(900);
  await S(c, () => document.querySelector('.fen [data-cfact="temps"]').click()); await p.waitForTimeout(250);
  await S(c, () => document.querySelector('.fen [data-action="cPlusTot"]').click()); await p.waitForTimeout(300);
  await S(c, () => document.querySelector('.fen [data-action="cCreer"]').click()); await p.waitForTimeout(1000);
  const id = await S(c, () => INTS[INTS.length - 1].id);
  await L.aller(p, 'inter-x-' + id); await clic(c, '[data-action="modifInt"]');
  await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '11:00'); await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(500);
  return id; };
const etat = (c, id) => S(c, i => ({ st:INTS.find(o => o.id === i).st, att:MVTS_ATT.filter(m => m.inter === i).length, facs:FACTURES.filter(f => f.int === i).length, mails:(typeof MAILS !== 'undefined' ? MAILS : []).filter(m => JSON.stringify(m).includes(i) && /compte rendu|facture/i.test(JSON.stringify(m))).length,
  ntf:NOTIFS.filter(n => n.k === 'sm' && /annul/i.test(n.txt)).map(n => n.txt), journal:JOURNAL.filter(j => JSON.stringify(j).includes(i) && /annul/i.test(JSON.stringify(j))).length, nJ:JOURNAL.length, nN:NOTIFS.length, q:PRODUITS.find(x => x.id === 'p1').q }), id);
(async () => {
  let c;
  await P.sec('parcours 13', async () => {
    c = await P.demarrer(); const p = c.p;
    const id = await creerInt(c);
    /* Sophie note une pièce : une sortie attend le bureau */
    await P.passer(c, 'sm', 'majournee'); await clic(c, '[data-rl="go|inter-x-' + id + '"]');
    await p.fill('#p-nom', 'Filtre à charbon'); await p.fill('#p-q', '1'); await clic(c, '[data-action="pieceAjout"]'); await p.waitForTimeout(500);
    await S(c, () => { const b = [...document.querySelectorAll('#calque button')].find(b => /C.est bon/.test(b.textContent)); if (b) b.click(); }); await p.waitForTimeout(700);
    const e0 = await etat(c, id);
    v('0 population : l’intervention de 11 h est « encours » (Sophie l’a commencée), UNE sortie de 1 filtre attend l’accord du bureau, aucune facture, aucune notification d’annulation', e0.st === 'encours' && e0.att === 1 && e0.facs === 0 && e0.ntf.length === 0 && e0.journal === 0, e0);
    /* le gérant annule depuis le Planning (la confirmation DIT ce qui se passe) */
    await P.passer(c, 'marc', 'planning');
    await S(c, i => planConfirmer('annuler', i), id); await p.waitForTimeout(400);
    const conf = net(await txt(c, '#calque'));
    v('A1 (écran) la confirmation ne promet AUCUN courriel (« Aucun e-mail ne part au client ») et dit que Sophie est prévenue', /Aucun e-mail ne part au client/.test(conf) && /Sophie est prévenue/.test(conf) && !/le client est prévenu par e-mail/i.test(conf), conf.slice(0, 300));
    await cap(c, '13-A1-confirmation-' + P.PROFIL);
    await clic(c, '[data-planconf="annuler|' + id + '"]'); await p.waitForTimeout(700);
    const t1 = await toast(c), a1 = await etat(c, id);
    await cap(c, '13-A2-toast-' + P.PROFIL);
    v('A2 (donnée) annulée : « annulee », la sortie de stock en attente a QUITTÉ la file (0), aucune facture, stock des filtres inchangé (' + a1.q + ')', a1.st === 'annulee' && a1.att === 0 && a1.facs === 0 && a1.q === e0.q, a1);
    v('A3 (donnée) Sophie reçoit une notification qui dit l’annulation ET que ses pièces ne sortent pas du stock', a1.ntf.length === 1 && /annulé ton intervention chez Hôtel de la Plage/.test(a1.ntf[0]) && /ne sortent pas du stock/.test(a1.ntf[0]), a1.ntf);
    v('A4 (donnée) l’Historique garde UNE ligne « a annulé l’intervention » (et un envoi de pièces retiré)', a1.journal === 1 && a1.nJ === e0.nJ + 1, a1);
    v('A5 (écran) le message dit vrai : « Sophie reçoit une notification », « Aucun e-mail ne part au client : préviens-le » — jamais « le client est prévenu par e-mail » ; « Rétablir » est proposé', /Sophie reçoit une notification/.test(t1) && /Aucun e-mail ne part au client/.test(t1) && !/prévenu par e-mail/.test(t1) && /Rétablir/.test(t1), t1);
    /* « Rétablir » rend TOUT */
    await S(c, () => { const b = [...document.querySelectorAll('#toast button, #toast a')].find(x => /Rétablir/.test(x.textContent)); if (b) b.click(); }); await p.waitForTimeout(600);
    const r1 = await etat(c, id);
    v('B1 (donnée) « Rétablir » : l’intervention est de nouveau « encours » (comme avant), la sortie de pièces est de retour en attente (1), plus de notification d’annulation, plus de ligne d’Historique, journal et notifications revenus à leur longueur d’avant', r1.st === e0.st && r1.att === 1 && r1.ntf.length === 0 && r1.journal === 0 && r1.nJ === e0.nJ && r1.nN === e0.nN, r1);
    const env1 = await S(c, () => { msEnvois(); return (document.querySelector('#calque') || {}).innerText.replace(/\s+/g, ' '); }); await FERMER_FEUILLE(c);
    v('B2 (écran) « Envois à accepter » montre de nouveau la sortie de Sophie après « Rétablir »', /Sophie a utilisé 1 Filtre à charbon chez Hôtel de la Plage/.test(env1), env1.slice(0, 300));
    /* on l'annule de nouveau, pour de bon */
    await S(c, i => planConfirmer('annuler', i), id); await p.waitForTimeout(300); await clic(c, '[data-planconf="annuler|' + id + '"]'); await p.waitForTimeout(700);
    const a2 = await etat(c, id);
    v('C0 population : annulée pour de bon (st « annulee », file vide, une notification, une ligne d’Historique)', a2.st === 'annulee' && a2.att === 0 && a2.ntf.length === 1 && a2.journal === 1, a2);
    /* le stock ne bouge pas : même un envoi forcé dans la file n'est jamais appliqué */
    const stk = await S(c, i => { const x = PRODUITS.find(o => o.id === 'p1'), q0 = x.q, v0 = JSON.stringify(x.loc);
      MVTS_ATT.unshift({ id:'forge-annul', d:AUJ, h:'11:30', qui:'sm', type:'sortie', pid:'p1', q:1, de:'v1', inter:i, motif:'Utilisé chez le client' });
      msAccepter(['forge-annul'], false); const q1 = x.q; return { q0, q1, loc:v0 === JSON.stringify(x.loc), reste:MVTS_ATT.filter(m => m.id === 'forge-annul').length, mv:MVTS.filter(m => m.inter === i).length }; }, id);
    await FERMER_FEUILLE(c);
    v('C1 (donnée) un envoi lié à l’intervention annulée, glissé de force dans la file puis « accepté » : le stock ne bouge pas (' + stk.q0 + ' → ' + stk.q1 + '), l’envoi quitte la file, aucun mouvement ne naît', stk.q1 === stk.q0 && stk.loc && stk.reste === 0 && stk.mv === 0, stk);
    const stk2 = await S(c, i => { const x = PRODUITS.find(o => o.id === 'p1'), q0 = x.q; const m = { id:'forge2', d:AUJ, h:'11:31', qui:'marc', type:'sortie', pid:'p1', q:1, de:'atelier', inter:i }; return { r:stkAppliquer(m), q0, q1:x.q }; }, id);
    v('C2 (donnée) la dernière porte : stkAppliquer d’une sortie liée à une intervention annulée rend 0 et ne retire rien (' + stk2.q0 + ' → ' + stk2.q1 + ')', stk2.r === 0 && stk2.q1 === stk2.q0, stk2);
    /* aucune PORTE ne pose « terminée » */
    const menu = await S(c, i => { menuCarte(i, 120, 120); const t = (document.querySelector('.ctx') || {}).innerText || ''; fermerMenu(); return t.replace(/\s+/g, ' '); }, id);
    v('D1 (écran) le menu de la carte au Planning n’offre ni « Marquer terminée » ni « Annuler l’intervention… » (déjà annulée) ; « Ouvrir la fiche » et « Supprimer… » restent', !/Marquer termin/.test(menu) && !/Annuler l’intervention/.test(menu) && /Ouvrir la fiche/.test(menu) && /Supprimer/.test(menu), menu);
    await P.passer(c, 'sm', 'majournee');
    const tj = net(await txt(c, '#contenu'));
    v('D2 (écran) « Ma journée » de Sophie n’affiche plus l’intervention annulée', !/chambre 214/.test(tj), tj.slice(0, 200));
    await L.aller(p, 'inter-x-' + id);
    const fi = net(await txt(c, '#contenu')), btn = await S(c, () => ({ terminer:!!document.querySelector('[data-action="terminer"]'), pasFini:!!document.querySelector('[data-action="pasFini"]'), collant:!!document.getElementById('collant') }));
    await cap(c, '13-D3-fiche-annulee-' + P.PROFIL);
    v('D3 (écran) la fiche annulée dit « Annulée », explique « rien à terminer », et n’a NI « Terminer » NI « Je ne peux pas finir » NI barre collante', /Annulée/.test(fi) && /Cette intervention est annulée/.test(fi) && /Rien à terminer/.test(fi) && !btn.terminer && !btn.pasFini && !btn.collant, { fi:fi.slice(0, 260), btn });
    /* les portes de derrière : on les appelle par le code, comme un lien ou un geste que l'écran ne propose pas */
    const portes = await S(c, i => { const r = {}; const tent = (k, f) => { try { f(); } catch (e) { r[k] = 'exception ' + e.message; } };
      tent('terminer', () => ACTIONS.terminer({ dataset:{ id:i } })); tent('pasFini', () => ACTIONS.pasFini({ dataset:{ id:i } })); tent('envoiePb', () => ACTIONS.envoiePb({ dataset:{ id:i } }));
      tent('visitefin', () => { const b = document.createElement('button'); b.type = 'button'; b.dataset.rl = 'visitefin|' + i; document.body.appendChild(b); b.click(); b.remove(); });
      const o = INTS.find(x => x.id === i); return { st:o.st, etat:fiche(i).etat, facs:FACTURES.filter(f => f.int === i).length, retour:INTS.filter(x => x.id === 'n-ret-' + i).length, r }; }, id);
    v('E1 (donnée) « Terminer », « Je ne peux pas finir » et la fin de visite appelés de force sur la fiche annulée : elle reste « annulee », aucune facture, aucun retour « à planifier » créé, fiche inchangée (' + portes.etat + ')', portes.st === 'annulee' && portes.facs === 0 && portes.retour === 0 && portes.etat !== 'bureau' && portes.etat !== 'reprendre', portes);
    const tt = await toast(c);
    v('E2 (écran) le refus se DIT : « Cette intervention est annulée : rien à terminer, aucune facture »', /annulée : rien à terminer/.test(tt), tt);
    /* le client : plus de rendez-vous à venir pour elle */
    await S(c, () => { rlChanger('client', { cli:'hp', muet:true, ec:'interventions' }); }); await L.calme(p, 700);
    const ec = net(await txt(c, '#contenu'));
    v('F1 (écran) l’espace du client ne montre pas l’intervention annulée parmi ses rendez-vous à venir, et aucun courriel de compte rendu ni de facture n’est parti pour elle', !/chambre 214[^]{0,80}(Planifiée|à venir)/i.test(ec) && (await etat(c, id)).mails === 0, ec.slice(0, 200));
    v('G aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
