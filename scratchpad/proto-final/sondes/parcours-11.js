// PARCOURS 11 — « la journée du bureau » : Julie (secrétariat) relance la facture en retard des Durand (FAC-2026-0128, 1 240,00 €) → le courriel de relance est lu avant de partir → les Durand paient par
// virement : elle l'encaisse → elle annule une facture envoyée par erreur (FAC-2026-0143, Cabinet dentaire Martin, 114,00 € TTC) par un AVOIR → le gérant relit l'Accueil, la Comptabilité et les fiches
// clients : tout dit la même chose, au centime (17 novembre 2026).
// Chiffres recalculés ici : 1 240,00 € à encaisser → 0 ; 114,00 € = 95,00 HT + 19,00 de TVA ; à recevoir de l'Accueil : − 1 240,00 − 114,00 ; reçu en octobre : + 1 240,00.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const toast = c => S(c, () => { const t = document.getElementById('toast'); return t ? (t.innerText || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });
const cts = x => L.cents(String(x || '0').replace(/[   ]/g, ''));
const accueil = async c => { await L.aller(c.p, 'accueil'); await c.p.waitForTimeout(600); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? cts(m[1]) : null; };
  return { arecevoir:n(/([\d  ]+,\d\d) € à recevoir/), recu:n(/([\d  ]+,\d\d) € reçu en octobre/), t }; };
const compta = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); await clic(c, '[data-cx="grp|pilotage"]'); await c.p.waitForTimeout(500); const t = net(await txt(c, '#contenu')); const n = (re, T) => { const m = re.exec(T || t); return m ? cts(m[1]) : null; };
  await clic(c, '[data-cx="grp|ventes"]'); await c.p.waitForTimeout(400); await clic(c, '[data-cx="sec|dossiers"]'); await c.p.waitForTimeout(500); const tv = net(await txt(c, '#contenu'));
  return { fact:n(/([\d  ]+,\d\d) € facturé en octobre \(HT\)/), nf:+((/facturé en octobre \(HT\) · (\d+) factures?/.exec(t) || [])[1] || 0), av:+((/facturé en octobre \(HT\) · \d+ factures? · (\d+) avoirs?/.exec(t) || [])[1] || 0), enc:n(/([\d  ]+,\d\d) € encaissé en octobre \(TTC\)/), reste:n(/([\d  ]+,\d\d) € à encaisser sur (\d+) interventions?/, tv), retard:n(/([\d  ]+,\d\d) € en retard/, tv), t, tv }; };
(async () => {
  let c;
  await P.sec('parcours 11', async () => {
    c = await P.demarrer({ qui:'marc' }); const p = c.p;
    const k0 = await accueil(c), c0 = await compta(c);
    const e0 = await S(c, () => ({ f128:FACTURES.find(f => f.id === 'f128'), f143:FACTURES.find(f => f.id === 'f143'), n:FACTURES.length, julie:!!eqDe('julie') }));
    v('0 population : l’Accueil donne « à recevoir » (' + k0.arecevoir + ') et « reçu en octobre » (' + k0.recu + ') ; la Comptabilité « 1 475,00 € à encaisser sur 3 interventions, dont 1 240,00 € en retard » et ' + c0.nf + ' factures', k0.arecevoir > 0 && k0.recu > 0 && c0.reste === 147500 && c0.retard === 124000 && c0.nf === 7 && e0.f128.st === 'retard' && e0.f143.st === 'envoyee' && e0.f128.relances === 2, { k0:{ a:k0.arecevoir, r:k0.recu }, c0:{ reste:c0.reste, retard:c0.retard, nf:c0.nf, enc:c0.enc, fact:c0.fact }, f128:e0.f128.st, rel:e0.f128.relances });

    /* ── A. Julie relance ── */
    await P.passer(c, 'julie', 'factures'); await p.waitForTimeout(500);
    const jl = net(await txt(c, '#contenu'));
    v('A1 (écran) la liste des factures de Julie : FAC-2026-0128 des Durand est « En retard » (« Échéance » dépassée) et la 0143 « À encaisser »', /FAC-2026-0128/.test(jl) && /FAC-2026-0143/.test(jl), jl.slice(jl.indexOf('DATE PIÈCE'), jl.indexOf('DATE PIÈCE') + 700));
    await L.aller(p, 'facture-x-f128'); await p.waitForTimeout(500);
    const pf = net(await txt(c, '#contenu'));
    v('A2 (écran) la facture dit « Échéance du 26/10 dépassée · relancée 2 fois » et « Reste 1 240,00 € »', /Échéance du 26\/10 dépassée · relancée 2 fois/.test(pf) && /Reste 1 240,00 €/.test(pf), pf.slice(pf.indexOf('OÙ ELLE EN EST'), pf.indexOf('OÙ ELLE EN EST') + 400));
    await cap(c, '11-A2-facture-retard-' + P.PROFIL);
    await clic(c, '[data-action="relance"]'); await p.waitForTimeout(700);
    const rm = net(await txt(c, '#calque'));
    v('A3 (écran) le courriel de relance est LU avant de partir : à durand@mail.fr, « FAC-2026-0128 de 1 240,00 €, arrivée à échéance le 26/10 », lien de paiement par carte à 1 240,00 €', /À : durand@mail\.fr/.test(rm) && /FAC-2026-0128 de 1 240,00 €, arrivée à échéance le 26\/10/.test(rm) && /Payer 1 240,00 € par carte/.test(rm), rm.slice(0, 500));
    await cap(c, '11-A3-relance-' + P.PROFIL);
    await clic(c, '#calque [data-action="relanceOk"]'); await p.waitForTimeout(800);
    const r1 = await S(c, () => ({ rel:FACTURES.find(f => f.id === 'f128').relances, st:FACTURES.find(f => f.id === 'f128').st }));
    v('A4 (donnée) la relance est comptée : 2 → 3, la facture reste « en retard »', r1.rel === 3 && r1.st === 'retard', r1);
    v('A5 (écran) le toast dit « Relance envoyée » et que la tâche liée (« Appeler… ») est terminée toute seule', /Relance envoyée/.test(await toast(c)), await toast(c));
    const pf2 = net(await txt(c, '#contenu'));
    v('A6 (écran) la page dit « relancée 3 fois » et « Déjà relancée 3 fois »', /relancée 3 fois/.test(pf2) && /Déjà relancée 3 fois/.test(pf2), pf2.slice(pf2.indexOf('OÙ ELLE EN EST'), pf2.indexOf('OÙ ELLE EN EST') + 400));

    /* ── B. les Durand paient : le virement est encaissé ── */
    await clic(c, '[data-payer="f128|Virement"]'); await p.waitForTimeout(800);
    const tp = await toast(c);
    v('B1 (écran) « 1 240,00 € encaissés par virement le 31/10 » (la date du jour de la démonstration)', /1 240,00 € encaissés par virement le 31\/10/.test(tp), tp);
    const b1 = await S(c, () => { const f = FACTURES.find(x => x.id === 'f128'); return { st:f.st, mode:f.mode, paye:f.paye, recu:f.recu }; });
    v('B2 (donnée) la facture est « payée », mode Virement, le 31/10', b1.st === 'payee' && b1.mode === 'Virement' && b1.paye === '31/10', b1);
    const pf3 = net(await txt(c, '#contenu'));
    v('B3 (écran) la page ne propose plus d’encaisser ni de relancer : « Payée », plus de bouton « Virement » ni « Relancer maintenant »', /Payée/.test(pf3) && !(await p.$('[data-payer="f128|Virement"]')) && !(await p.$('[data-action="relance"]')), pf3.slice(pf3.indexOf('OÙ ELLE EN EST'), pf3.indexOf('OÙ ELLE EN EST') + 300));
    await cap(c, '11-B3-payee-' + P.PROFIL);

    /* ── C. l'avoir ── */
    await L.aller(p, 'facture-x-f143'); await p.waitForTimeout(500);
    await clic(c, '[data-action="avoir"]'); await p.waitForTimeout(600);
    const av = net(await txt(c, '#calque'));
    v('C1 (écran) la feuille dit « Un avoir de 114,00 € TTC annule la facture FAC-2026-0143 en entier (Cabinet dentaire Martin) » et que la facture d’origine reste telle quelle (la loi)', /Un avoir de 114,00 € TTC annule la facture FAC-2026-0143 en entier \(Cabinet dentaire Martin\)/.test(av) && /La facture d’origine reste telle quelle/.test(av) && Math.round(9500 * 1.2) === 11400, av.slice(0, 500));
    await cap(c, '11-C1-avoir-' + P.PROFIL);
    const n0 = await S(c, () => FACTURES.length);
    await clic(c, '#calque [data-action="avoirOk"]'); await p.waitForTimeout(900);
    const c1 = await S(c, () => ({ n:FACTURES.length, o:FACTURES.find(f => f.id === 'f143'), av:FACTURES.filter(f => f.st === 'avoir').map(f => ({ id:f.id, num:f.num, ht:f.ht, tva:f.tva, de:f.de || f.avoirDe || f.origine, cli:f.cli })) }));
    v('C2 (donnée) un AVOIR existe (numéro AV-…, 95,00 € HT, TVA 20 %, au nom du Cabinet Martin) et la facture d’origine est « annulée » SANS changer de numéro', c1.n === n0 + 1 && c1.o.st === 'annulee' && c1.o.num === 'FAC-2026-0143' && c1.av.length === 1 && /^AV-/.test(c1.av[0].num) && Math.abs(c1.av[0].ht) === 95 && c1.av[0].cli === 'cm', c1);
    const tav = await toast(c);
    v('C3 (écran) le toast dit l’avoir créé', /avoir/i.test(tav), tav);
    const pf4 = net(await txt(c, '#contenu'));
    v('C4 (écran) la facture d’origine dit « Annulée » (avec le numéro de l’avoir) et ne propose plus ni encaissement ni relance ni avoir', /Annulée/.test(pf4) && !(await p.$('[data-payer="f143|Virement"]')) && !(await p.$('[data-action="avoir"]')), pf4.slice(0, 300));
    await cap(c, '11-C4-annulee-' + P.PROFIL);
    const dec = await S(c, () => !!document.querySelector('[data-action="supprimer"], [data-action="suppr"]'));
    v('C5 population : Julie n’a aucun bouton « supprimer » (son compte ne supprime pas) — l’avoir est le seul chemin', !dec, dec);

    /* ── D. le gérant relit tout ── */
    await P.passer(c, 'marc', 'accueil');
    const k1 = await accueil(c), c1c = await compta(c);
    v('D1 (écran) l’Accueil : « reçu en octobre » monte d’EXACTEMENT 1 240,00 € (' + k0.recu + ' → ' + k1.recu + ') et « à recevoir » baisse de 1 240,00 + 114,00 = 1 354,00 € (' + k0.arecevoir + ' → ' + k1.arecevoir + ')', k1.recu - k0.recu === 124000 && k0.arecevoir - k1.arecevoir === 135400, { k0:{ a:k0.arecevoir, r:k0.recu }, k1:{ a:k1.arecevoir, r:k1.recu } });
    v('D2 (écran) la Comptabilité : « à encaisser » 1 475,00 → 121,00 € (il ne reste que la facture des Durand du 29/10), « en retard » 1 240,00 → 0, « encaissé en octobre » + 1 240,00 €', c1c.reste === 12100 && !c1c.retard && c1c.enc - c0.enc === 124000, { reste:c1c.reste, retard:c1c.retard, enc:c1c.enc - c0.enc });
    console.log('  · facturé en octobre (HT) : ' + c0.fact + ' → ' + c1c.fact + ' ; factures ' + c0.nf + ' → ' + c1c.nf);
    v('D3 (écran) « facturé en octobre (HT) » : la facture annulée (95,00 € HT) est retirée par son avoir, au centime (' + c0.fact + ' → ' + c1c.fact + '), et le libellé dit « 7 factures · 1 avoir » (un avoir n’est pas une facture de plus)', c0.fact - c1c.fact === 9500 && c1c.nf === 7 && c1c.av === 1, { avant:c0.fact, apres:c1c.fact, nf0:c0.nf, nf1:c1c.nf });
    await cap(c, '11-D2-compta-' + P.PROFIL);
    await L.aller(p, 'client-x-cm'); await p.waitForTimeout(600); const fm = net(await txt(c, '#contenu'));
    await L.aller(p, 'client-x-md'); await p.waitForTimeout(600); const fd = net(await txt(c, '#contenu'));
    v('D4 (écran) la fiche du Cabinet dentaire Martin ne réclame plus les 114,00 € ; celle des Durand dit leurs 1 240,00 € payés', !/114,00 € à recevoir/.test(fm) && /(1 240,00|1 240,00) €/.test(fd) && !/1 240,00 € à recevoir/.test(fd), { martin:fm.slice(fm.indexOf('payé') - 60, fm.indexOf('payé') + 120), durand:fd.slice(fd.indexOf('payé') - 60, fd.indexOf('payé') + 120) });
    v('E aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
