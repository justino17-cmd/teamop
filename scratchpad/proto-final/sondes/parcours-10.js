// PARCOURS 10 — « le SIRET manque » : la fiche de l'entreprise perd son SIRET (une entreprise neuve) → « Mon entreprise » le dit → une facture préparée (Hôtel de la Plage, 109,17 € HT) ne PART pas :
// la page de la facture nomme le SIRET, l'aperçu refuse « Valider et envoyer » et propose « Compléter ma fiche » au gérant, et dit « demande à Marc » à la secrétaire → le gérant le tape
// (trois fautes refusées d'abord) → la facture part, porte le SIRET et son numéro, et la Comptabilité, l'Accueil et la fiche du client la comptent (17 novembre 2026).
// Chiffres recalculés ici : 109,17 × 20 % = 21,83 (21,834) ; TTC 131,00 ; « facturé en octobre (HT) » 2 071,44 → 2 180,61 € et 7 → 8 factures ; puis chèque de 60,01 € + carte de 70,99 €.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const toast = c => S(c, () => { const t = document.getElementById('toast'); return t ? (t.innerText || '').replace(/[  ]/g, ' ').replace(/\s+/g, ' ').trim() : ''; });
const SIRET = '123 456 789 00012';
// ⛔ valeurs INGRATES exprès (18 novembre 2026) : le technicien avait noté « 2,5 » de nettoyant (et non « 0,5 L ») → la ligne vaut 2,5 × 10,33 = 25,83 € (25,825 monte au centime) ; HT 109,17 − 10,33 + 25,83 = 109,17 ; TVA 20 % = 21,834 → 21,83 ; TTC 131,00 ;
// puis un chèque de 60,01 € au bureau et la carte du client pour le RESTE, 70,99 €. Avec des valeurs rondes, « 2,5 lu 2 » et « le client paie le TOTAL au lieu du reste » laissaient ce parcours vert.
const HT1 = 10917, TVA1 = 2183, TTC1 = 13100, CHQ = 6001, RESTE = TTC1 - CHQ;
const eurT = k => (k / 100).toFixed(2).replace('.', ',') + ' €';
const ctFin = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); if (!/facturé en octobre/.test(net(await txt(c, '#contenu')))) { await clic(c, '[data-cx="grp|pilotage"]'); await c.p.waitForTimeout(500); } const t = net(await txt(c, '#contenu'));
  const m = /([\d  ]+,\d\d) €\s*facturé en octobre \(HT\) · (\d+) factures?/.exec(t); return { ht:m ? L.cents(m[1]) : null, n:m ? +m[2] : null, t }; };
(async () => {
  let c;
  await P.sec('parcours 10', async () => {
    c = await P.demarrer({ qui:'marc' }); const p = c.p;
    const e0 = await S(c, () => ({ siret:ENTREPRISE.siret, manque:entrepriseManque().map(m => m.k), facs:FACTURES.length, hotel:Object.keys(CLIENTS).find(k => /Hôtel de la Plage/.test(CLIENTS[k].nom)) }));
    v('0 population : la fiche porte son SIRET (' + e0.siret + '), rien ne bloque, 8 factures, l’Hôtel de la Plage existe', e0.siret === SIRET && e0.manque.length === 0 && e0.facs === 8 && !!e0.hotel, e0);
    const f0 = await ctFin(c);
    v('0b population : la Comptabilité dit « 2 071,44 € facturé en octobre (HT) · 7 factures »', f0.ht === 207144 && f0.n === 7, { ht:f0.ht, n:f0.n });

    /* ── A. le SIRET ne s'efface pas par un champ vide ── */
    await L.aller(p, 'entreprise'); await clic(c, '[data-ent="carte|legal"]'); await p.waitForTimeout(500);
    await p.fill('#fl-siret', ''); await clic(c, '#calque [data-cx="ficheok"]'); await p.waitForTimeout(400);
    const a1 = await S(c, () => ({ siret:ENTREPRISE.siret, err:(document.getElementById('fl-siret-err') || {}).textContent || '', ouvert:!!document.getElementById('fl-siret') }));
    v('A1 (écran) vider le champ SIRET puis « Enregistrer » est REFUSÉ sous le champ (« Le SIRET a quatorze chiffres… ») : la fiche garde son SIRET', /Le SIRET a quatorze chiffres/.test(a1.err) && a1.siret === SIRET && a1.ouvert, a1);
    await p.fill('#fl-siret', '1234'); await clic(c, '#calque [data-cx="ficheok"]'); await p.waitForTimeout(300);
    v('A2 (écran) « 1234 » (4 chiffres) est refusé de même, rien n’est écrit', /quatorze chiffres/.test((await S(c, () => (document.getElementById('fl-siret-err') || {}).textContent)) || '') && (await S(c, () => ENTREPRISE.siret)) === SIRET, null);
    await S(c, () => fermerPanneau());
    /* la fiche d'une entreprise neuve : pas de SIRET */
    await S(c, () => { ENTREPRISE.siret = ''; rendre(); });
    await L.aller(p, 'entreprise'); const me = net(await txt(c, '#contenu'));
    v('B1 (écran) « Mon entreprise » dit « Il manque ton SIRET : une facture ne peut pas partir sans. » avec « Compléter »', /Il manque ton SIRET : une facture ne peut pas partir sans\./.test(me) && !!(await p.$('[data-ent="completer"]')), me.slice(0, 400));
    await cap(c, '10-B1-entreprise-' + P.PROFIL);

    /* ── C. la facture ne part pas ── */
    await L.aller(p, 'comptabilite'); await clic(c, '[data-cx="grp|pilotage"]'); await p.waitForTimeout(400);
    v('C1 population : « Facturer » (2 interventions terminées sans facture) existe', await clic(c, '[data-cx="dosf|afacturer"]')); await p.waitForTimeout(500);
    const qn = await S(c, () => { fiche('i50').pieces[0].q = '2,5'; return fiche('i50').pieces[0].q; });
    v('C1b population : le technicien avait noté « 2,5 » de nettoyant (une quantité décimale) sur la visite du 16/10', qn === '2,5', qn);
    const n0 = await S(c, () => { window.__avant = FACTURES.map(f => f.id); return FACTURES.length; });
    await S(c, () => [...document.querySelectorAll('#calque button')].find(b => /Préparer la facture/.test(b.textContent)).click()); await p.waitForTimeout(900);
    const fi = await S(c, () => { const f = FACTURES.find(x => !window.__avant.includes(x.id)) || FACTURES[FACTURES.length - 1]; return { id:f.id, st:f.st, num:f.num, n:FACTURES.length, cli:f.cli }; });
    const pf = net(await txt(c, '#contenu'));
    v('C2 (donnée) la facture est préparée « à valider », sans numéro (« — »), pour l’Hôtel de la Plage : ' + (fi.n - n0) + ' facture de plus', fi.n === n0 + 1 && fi.st === 'avalider' && fi.num === '—' && fi.cli === e0.hotel, fi);
    v('C3 (écran) la PAGE de la facture nomme le SIRET parmi ce qui manque (« Il manque sur cette facture : le SIRET, la forme juridique… ») — sans lui elle ne part pas', (c.largeur >= 700 ? /Il manque sur cette facture : le SIRET,/.test(pf) : /Il manque 4 mentions/.test(pf)), pf.slice(0, 500));   /* au téléphone la page compte au lieu de lister : 4 = le SIRET et les trois mentions légales */
    await cap(c, '10-C3-facture-' + P.PROFIL);
    await S(c, () => document.querySelector('[data-action="apercuEnvoi"]').click()); await p.waitForTimeout(700);
    const ap = await S(c, () => { const P_ = document.querySelector('#calque .panneau'); return { envoyer:!!P_.querySelector('[data-action="envoyer"]'), ban:((P_.querySelector('.ent-ban') || {}).innerText || '').replace(/\s+/g, ' '), boutons:[...P_.querySelectorAll('.ent-ban .btn')].map(b => b.textContent.trim()) }; });
    v('C4 (écran) l’aperçu n’offre PAS « Valider et envoyer » : « Il manque ton SIRET sur ta fiche : une facture doit le porter. Ça prend trente secondes. » et « Compléter ma fiche »', !ap.envoyer && /Il manque ton SIRET sur ta fiche : une facture doit le porter\. Ça prend trente secondes\./.test(ap.ban) && ap.boutons.join('|') === 'Compléter ma fiche', ap);
    await cap(c, '10-C4-apercu-' + P.PROFIL);
    await S(c, id => { ACTIONS.envoyer({ dataset:{ id } }); }, fi.id); await p.waitForTimeout(400);
    const fo = await S(c, id => { const f = FACTURES.find(x => x.id === id); return { st:f.st, num:f.num }; }, fi.id);
    v('C5 (donnée) un envoi forcé à la main ne part pas non plus : toujours « à valider », sans numéro (la garde est dans la fonction, pas dans le bouton)', fo.st === 'avalider' && fo.num === '—', fo);
    await S(c, () => fermerPanneau());

    /* ── D. la secrétaire voit le même manque, sans pouvoir le régler ── */
    await P.passer(c, 'julie', 'facture-x-' + fi.id); await p.waitForTimeout(500);
    await S(c, () => { const b = document.querySelector('[data-action="apercuEnvoi"]'); if (b) b.click(); }); await p.waitForTimeout(600);
    const ja = await S(c, () => { const P_ = document.querySelector('#calque .panneau'); return P_ ? { envoyer:!!P_.querySelector('[data-action="envoyer"]'), ban:((P_.querySelector('.ent-ban') || {}).innerText || '').replace(/\s+/g, ' '), boutons:[...P_.querySelectorAll('.ent-ban .btn')].length } : null; });
    v('D1 (écran) Julie lit « Il manque le SIRET sur la fiche de l’entreprise : demande à Marc de la compléter. » et n’a ni « Envoyer » ni « Compléter » (elle ne peut pas régler)', !!ja && !ja.envoyer && /Il manque le SIRET sur la fiche de l’entreprise : demande à Marc de la compléter\./.test(ja.ban) && ja.boutons === 0, ja);
    await cap(c, '10-D1-julie-' + P.PROFIL);
    await S(c, () => fermerPanneau());

    /* ── E. le gérant complète le SIRET ── */
    await P.passer(c, 'marc', 'facture-x-' + fi.id); await p.waitForTimeout(400);
    await S(c, () => document.querySelector('[data-action="apercuEnvoi"]').click()); await p.waitForTimeout(600);
    await clic(c, '#calque [data-ent="completer"]'); await p.waitForTimeout(700);
    const e1 = await S(c, () => ({ h:location.hash, champ:!!document.getElementById('fl-siret') }));
    v('E1 (écran) « Compléter ma fiche » ouvre Mon entreprise ET la carte du SIRET', e1.h === '#entreprise' && e1.champ, e1);
    for (const [val, lib] of [['abcdefghijklmn', 'des lettres'], ['123 456 789 0001', 'treize chiffres']]) {
      await p.fill('#fl-siret', val); await clic(c, '#calque [data-cx="ficheok"]'); await p.waitForTimeout(300);
      const r = await S(c, () => ({ err:(document.getElementById('fl-siret-err') || {}).textContent || '', siret:ENTREPRISE.siret }));
      v('E2 (écran) ' + lib + ' (« ' + val + ' ») : refusé, la raison est écrite sous le champ, rien n’est écrit', /quatorze chiffres/.test(r.err) && r.siret === '', r);
    }
    await p.fill('#fl-siret', 'a'); const eff = await S(c, () => (document.getElementById('fl-siret-err') || {}).hidden || !(document.getElementById('fl-siret-err') || {}).textContent);
    v('E3 (écran) retaper le champ efface son message d’erreur (le refus ne survit pas à la correction)', eff, null);
    await p.fill('#fl-siret', SIRET); await clic(c, '#calque [data-cx="ficheok"]'); await p.waitForTimeout(700);
    const s1 = await S(c, () => ({ siret:ENTREPRISE.siret, manque:entrepriseManque().map(m => m.k), ferme:!document.getElementById('fl-siret') }));
    v('E4 (donnée) le SIRET est enregistré (' + SIRET + '), plus rien ne bloque', s1.siret === SIRET && s1.manque.length === 0 && s1.ferme, s1);
    await L.aller(p, 'entreprise'); const me2 = net(await txt(c, '#contenu'));
    v('E5 (écran) « Mon entreprise » : « Tes factures peuvent partir », le SIRET est écrit sur sa carte', /Tes factures peuvent partir/.test(me2) && me2.includes(SIRET) && !/Il manque ton SIRET/.test(me2), me2.slice(0, 400));

    /* ── F. la facture part ── */
    await L.aller(p, 'facture-x-' + fi.id); await p.waitForTimeout(400); const pf2 = net(await txt(c, '#contenu'));
    v('F1 (écran) la page de la facture ne nomme plus le SIRET (il reste les mentions légales, qui ne bloquent pas)', !/le SIRET/.test(pf2.slice(0, 600)), pf2.slice(0, 400));
    await S(c, () => document.querySelector('[data-action="apercuEnvoi"]').click()); await p.waitForTimeout(700);
    const ap2 = net(await txt(c, '#calque'));
    v('F2 (écran) l’aperçu porte « SIRET ' + SIRET + ' », la facture FAC-2026-0146, HT 109,17 €, TVA 21,83 €, TTC 131,00 € (109,17 × 20 % = 21,83)', ap2.includes('SIRET ' + SIRET) && /Facture FAC-2026-0146/.test(ap2) && /Total HT 109,17 €/.test(ap2) && /TVA 20 % 21,83 €/.test(ap2) && /Total TTC 131,00 €/.test(ap2) && Math.round(10917 * 0.2) === 2183, ap2.slice(0, 500));
    await cap(c, '10-F2-apercu-' + P.PROFIL);
    const peut = await S(c, () => !!document.querySelector('#calque [data-action="envoyer"]'));
    v('F3 population : « Valider et envoyer » est revenu', peut, null);
    const ac0 = await S(c, () => document.querySelector('.kpis') ? 1 : 0);
    await S(c, () => document.querySelector('#calque [data-action="envoyer"]').click()); await p.waitForTimeout(900);
    const fe = await S(c, id => { const f = FACTURES.find(x => x.id === id); return { st:f.st, num:f.num }; }, fi.id);
    v('F4 (donnée) la facture est envoyée et numérotée : FAC-2026-0146', fe.st === 'envoyee' && fe.num === 'FAC-2026-0146', fe);
    const f1 = await ctFin(c);
    v('F5 (écran) la Comptabilité compte la facture : « facturé en octobre (HT) » 2 071,44 → 2 180,61 € et 7 → 8 factures', f1.ht === 207144 + 10917 && f1.n === 8, { ht:f1.ht, n:f1.n });
    await L.aller(p, 'client-x-' + e0.hotel); await p.waitForTimeout(700);
    const cf = net(await txt(c, '#contenu'));
    v('F6 (écran) la fiche de l’Hôtel de la Plage dit « 131,00 € à recevoir » et sa visite du 16/10 « Envoyée · en attente »', /131,00 € à recevoir/.test(cf) && /16\/10\/26 Entretien climatisation(?: · ?| ?)Karim[^]*?Envoyée · en attente/.test(cf), cf.slice(300, 1200));
    /* ── G. un chèque au bureau, puis la carte du client pour le RESTE ── */
    const lg = await S(c, id => { const f = FACTURES.find(x => x.id === id); return lignesDe(f).map(l => [l.d, Math.round(totLigne(l) * 100)]); }, fi.id);
    v('G0 (donnée) la ligne « Nettoyant échangeur × 2,5 » vaut 25,83 € (2,5 × 10,33, la moitié de centime monte) : le HT de la facture est 109,17 €', lg.some(l => /Nettoyant/.test(l[0]) && l[1] === 2583) && (await S(c, id => Math.round(htDe(FACTURES.find(x => x.id === id)) * 100), fi.id)) === HT1, lg);
    await L.aller(p, 'facture-x-' + fi.id); await clic(c, '[data-action="partiel"]'); await p.waitForTimeout(400);
    await p.fill('#pp-m', '60,01'); await p.selectOption('#pp-mode', 'Chèque'); await clic(c, '[data-action="partielOk"]'); await p.waitForTimeout(700);
    const g1 = await S(c, id => { const x = FACTURES.find(o => o.id === id); return { st:x.st, recu:Math.round((x.recu || 0) * 100), rest:Math.round(restant(x) * 100) }; }, fi.id);
    v('G1 (donnée) un chèque de 60,01 € : « partielle », reste ' + eurT(RESTE), g1.st === 'partielle' && g1.recu === CHQ && g1.rest === RESTE, g1);
    await S(c, h => { rlChanger('client', { cli:h, muet:true, ec:'factures' }); }, e0.hotel); await L.calme(p, 800);
    const gc = net(await txt(c, '#contenu'));
    v('G2 (écran client) le bouton dit « Payer ' + eurT(RESTE) + ' » (le reste), jamais « Payer ' + eurT(TTC1) + ' »', gc.includes('Payer ' + eurT(RESTE)) && !gc.includes('Payer ' + eurT(TTC1)), gc.slice(0, 500));
    await clic(c, '[data-ec^="payer|f-"], [data-ec^="payer|"]'); await p.waitForTimeout(800);
    const gp = net(await txt(c, '#calque'));
    v('G3 (écran client) la fenêtre de paiement demande « Montant ' + eurT(RESTE) + ' »', gp.includes('Montant ' + eurT(RESTE)) && !gp.includes('Montant ' + eurT(TTC1)), gp.slice(0, 200));
    await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123'); await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1500);
    const g4 = await S(c, id => { const x = FACTURES.find(o => o.id === id); return { st:x.st, recu:Math.round((x.recu || 0) * 100), enc:ENCAISSEMENTS.filter(e => e.fac === x.num).map(e => [Math.round(e.ttc * 100), e.mode]) }; }, fi.id);
    v('G4 (donnée) soldée : « payee », reçu ' + eurT(TTC1) + ', DEUX encaissements (chèque ' + eurT(CHQ) + ' puis carte ' + eurT(RESTE) + ')', g4.st === 'payee' && g4.recu === TTC1 && g4.enc.length === 2 && g4.enc.reduce((s, e) => s + e[0], 0) === TTC1 && g4.enc.some(e => e[0] === RESTE && e[1] === 'Carte'), g4);
    v('G aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
