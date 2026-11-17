// PARCOURS 2 — « un devis » de bout en bout : composé en grand, envoyé, signé par le client, acompte facturé et payé, intervention « à planifier »,
// planifiée, faite par un technicien, SOLDE facturé (l'acompte déduit) et payé. Tout dans la MÊME page, la main passe de rôle en rôle (17 novembre 2026).
//   A. le gérant COMPOSE le devis en grand (atelier « Devis composés ») : totaux recalculés ici, liste, quatre chiffres, espace du client.
//      ⚠ un devis composé n'a pas (encore) de suite dans le prototype : il ne va pas dans l'espace du client et n'ouvre ni acompte ni intervention
//      (limite CONSTATÉE par le contrôle A5 et reportée au chef de chantier : la voie « devis-atelier » en est chargée) → la suite de la chaîne se joue avec le DEVIS RAPIDE (B…), qui a tout le circuit.
//   B. devis rapide : 189 + 195 (3 h) + 29,17 = 413,17 € HT ; TVA 10 % (particulier, logement de plus de 2 ans) 41,32 € ; TTC 454,49 € ; acompte 30 % = 136,35 € ;
//      solde = 318,14 € (HT 289,22 + TVA 28,92) : 136,35 + 318,14 = 454,49 € AU CENTIME.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const A = require('./atelier-outils.js');
const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
const kpis = async c => { await L.aller(c.p, 'accueil'); await c.p.waitForTimeout(600); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1]) : null; };
  return { arecevoir:n(/([\d  ]+,\d\d) € à recevoir/), recu:n(/([\d  ]+,\d\d) € reçu en octobre/) }; };
const compta = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); const t = net(await txt(c, '#contenu')); return cts((/([\d  ]+,\d\d) € trésorerie/.exec(t) || [])[1]); };
const dvKpi = async c => { await L.aller(c.p, 'devis'); await c.p.waitForTimeout(500); const t = net(await txt(c, '#contenu')); const n = re => { const m = re.exec(t); return m ? L.cents(m[1]) : null; };
  return { attente:n(/([\d  ]+,\d\d) € en attente de réponse/), acceptes:n(/([\d  ]+,\d\d) € acceptés/) }; };
const FERMER = c => S(c, () => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); });
(async () => {
  let c;
  await P.sec('parcours 2', async () => {
    c = await P.demarrer(); const p = c.p;
    const set = async (sel, val) => { await p.fill(sel, val); await p.locator(sel).dispatchEvent('change'); };
    const e0 = await S(c, () => ({ dv:dvInit().length, facs:FACTURES.length, ints:INTS.length, enc:ENCAISSEMENTS.length }));
    const k0 = await kpis(c), t0 = await compta(c), d0 = await dvKpi(c);
    v('0 population : des devis, des factures, des interventions, un solde de trésorerie, les deux chiffres de l’Accueil et des Devis', e0.dv >= 8 && e0.facs === 8 && k0.arecevoir > 0 && k0.recu > 0 && t0 > 0 && d0.attente > 0 && d0.acceptes > 0, { e0, k0, t0, d0 });

    /* ── A. le devis composé en grand ── */
    const f = await A.ouvrirAtelier(c, 'devis', 'devis');
    v('A1 « Composer un devis » ouvre l’atelier (cadre « Nouveau devis »)', !!f && /Nouveau devis/.test(await f.evaluate(() => (document.querySelector('.fenetre') || {}).textContent || '')));
    await A.composerDevis(c, f, { client:'md', objet:'Remplacement du circulateur (devis composé)', articles:[{ ref:'CIRC-A', qte:1 }, { ref:'MO-H', qte:3 }, { ref:'DEP-Z1', qte:1 }] });
    await f.locator('[data-vv="ac"][data-v="30"]').first().click().catch(() => {}); await p.waitForTimeout(300);
    const doc = net(await f.evaluate(() => document.body.innerText));
    v('A2 (écran, atelier) le document : HT 413,17 €, TVA 10 % sur 195,00 € = 19,50 €, TVA 20 % sur 218,17 € = 43,63 €, TTC 476,30 € (recalculé : 41317 + 1950 + 4363)', /Total HT 413,17 €/.test(doc) && /TVA 10 % \(sur 195,00 €\) 19,50 €/.test(doc) && /TVA 20 % \(sur 218,17 €\) 43,63 €/.test(doc) && /Total TTC 476,30 €/.test(doc), doc.slice(doc.indexOf('Désignation'), doc.indexOf('Désignation') + 500));
    v('A3 (écran, atelier) acompte 30 % = 142,89 € (30 % de 476,30 = 142,89), reste à payer 333,41 € : 142,89 + 333,41 = 476,30', /Acompte à la commande \(30 %\) 142,89 €/.test(doc) && /Reste à payer 333,41 €/.test(doc) && 14289 + 33341 === 47630, doc.slice(doc.indexOf('Acompte à la commande') - 30, doc.indexOf('Acompte à la commande') + 120));
    const num = (/DEVIS N° (D-2026-\d+)/.exec(doc) || [])[1];
    await f.locator('[data-act="envoyer"]').first().click(); await p.waitForTimeout(500); await f.locator('[data-act="env-go"]').first().click(); await p.waitForTimeout(1000);
    await f.locator('[data-act="retour"]').first().click(); await p.waitForTimeout(900);
    await L.aller(c.p, 'devis'); await clic(c, '.seg [data-dvf="attente"]'); await p.waitForTimeout(400);
    const lig = await S(c, () => [...document.querySelectorAll('#contenu .opd-l')].map(e => e.innerText.replace(/\s+/g, ' ').trim())), dk1 = await dvKpi(c);
    v('A4 (écran) la liste « Devis composés » montre ' + num + ', M. et Mme Durand, 476,30 €, « En attente » ; « en attente de réponse » monte de 476,30 € (' + d0.attente + ' → ' + dk1.attente + ')', lig.some(t => t.includes(num) && /Durand/.test(t) && /476,30/.test(t)) && dk1.attente - d0.attente === 47630 && dk1.acceptes === d0.acceptes, { lig, d0, dk1 });
    await cap(c, '2-A4-devis-composes-' + P.PROFIL);
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'devis' }); }); await L.calme(p, 700);
    const ecA = net(await txt(c, '#contenu'));
    /* ⚠ limite connue : un devis composé reste dans l'atelier. On le DIT par un contrôle qui tombe tant que ce n'est pas branché : il est reporté (parcours.json, défaut 1) */
    v('A5 (constat · défaut 1 « à soumettre ») le client ne voit PAS le devis composé ' + num + ' dans son espace : il n’a ni « Lire et signer », ni suite (acompte, intervention). Le jour où c’est branché, ce contrôle doit passer à « présent »', !ecA.includes(num), ecA.slice(0, 300));
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);

    /* ── B. le devis rapide, avec acompte : le circuit complet ── */
    await L.aller(p, 'devis'); await clic(c, '[data-dv="nouveau"]'); await p.waitForTimeout(900);
    await p.selectOption('#dvn-cli', 'md'); await p.fill('#dvn-objet', 'Remplacement du circulateur');
    await clic(c, '[data-dvn="modele|3"]'); await clic(c, '[data-dvn="creer|1"]'); await p.waitForTimeout(1200);
    const id = await S(c, () => location.hash.split('-x-')[1]);
    v('B1 le brouillon s’ouvre (identifiant BR…) chez M. et Mme Durand', /^BR/.test(id) && await S(c, i => DEVIS_REG[i].cli === 'md', id), id);
    await clic(c, '[data-dv="ligneSup|' + id + '|0"]');
    await p.selectOption('[data-dvcat]', 'Circulateur classe A'); await p.waitForTimeout(400);
    await set('#contenu input[data-dvl="' + id + '|0|0"]', 'Main-d’œuvre (3 h)'); await set('#contenu input[data-dvl="' + id + '|0|2"]', '195');
    await p.selectOption('[data-dvacompte]', '30'); await p.waitForTimeout(400);
    const ed = net(await txt(c, '#contenu'));
    v('B2 (écran) le devis : Total HT 413,17 €, TVA 10 % = 41,32 €, Total TTC 454,49 € (recalculé : 41317 × 1,10 = 45448,7 → 454,49)', /Total HT 413,17 €/.test(ed) && /41,32 €/.test(ed) && /Total TTC 454,49 €/.test(ed), ed.slice(ed.indexOf('Total HT'), ed.indexOf('Total HT') + 200));
    await clic(c, '[data-dv="envoyer|' + id + '"]'); await p.waitForTimeout(700);
    v('B3 population : la fenêtre d’envoi propose « Envoyer »', await clic(c, '[data-mailenvoi="1"]'));
    await p.waitForTimeout(900);
    const dv = await S(c, () => { const d = dvInit().find(x => x.cli === 'md' && x.objet === 'Remplacement du circulateur'); return d ? { num:d.num, e:dvEtat(d), acompte:d.acompte, tva:d.tva, id:d.id } : null; });
    const numB = dv && dv.num;
    v('B4 (donnée) envoyé : il reçoit son numéro (' + numB + ', différent du composé ' + num + '), « attente », acompte 30 %, TVA 10 %', !!dv && /^D-2026-\d+$/.test(numB) && numB !== num && dv.e === 'attente' && dv.acompte === 30 && dv.tva === 10, dv);
    const dk2 = await dvKpi(c);
    v('B5 (écran) Devis : « en attente de réponse » monte de 454,49 € de plus (' + dk1.attente + ' → ' + dk2.attente + ')', dk2.attente - dk1.attente === 45449, { dk1, dk2 });

    /* le client signe en ligne */
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'devis' }); }); await L.calme(p, 700);
    const ecB = net(await txt(c, '#contenu'));
    v('C1 (écran client) « ' + numB + ' » : « Remplacement du circulateur », 454,49 €, « À signer »', ecB.includes(numB) && /454,49 €/.test(ecB) && /À signer/.test(ecB), ecB.slice(0, 400));
    await clic(c, '[data-ec="signer|' + numB + '"]'); await p.waitForTimeout(700);
    const fen = net(await txt(c, '#calque'));
    v('C2 (écran client) la fenêtre « Votre devis » dit le total TTC 454,49 € et l’acompte de 136,35 €, sans tutoyer le client', /Votre devis/i.test(fen) && /454,49 €/.test(fen) && /136,35 €/.test(fen) && !/\b(ton|tu|ta|tes)\b/i.test(fen), fen.slice(0, 700));
    await cap(c, '2-C2-signer-' + P.PROFIL);
    await S(c, () => { document.getElementById('dv-ok').checked = true; }); await p.fill('#dv-nom', 'M. Durand');
    const sg = await P.signer(c, '#dv-signe');
    v('C3 la signature se trace dans le cadre', sg);
    await S(c, () => { document.querySelector('.panneau [data-dv^="signer|"]').click(); }); await L.calme(p, 800);
    const acc = await S(c, n => { const d = dvInit().find(x => x.num === n); return { e:dvEtat(d), par:d.signePar, via:d.via, int:d.int, fa:d.facAcompte, aht:d.acompteHT, nInt:INTS.length, nFac:FACTURES.length }; }, numB);
    v('C4 (donnée) accepté « en ligne » par M. Durand : une intervention « à planifier » et UNE facture d’acompte sont nées', acc.e === 'accepte' && acc.via === 'en ligne' && acc.par === 'M. Durand' && acc.int === 'i-' + numB && acc.fa === 'fa-' + numB && acc.nInt === e0.ints + 1 && acc.nFac === e0.facs + 1, acc);
    v('C5 (donnée) l’acompte HT est 123,95 € (30 % de 413,17 = 123,95) : TTC 136,35 €', acc.aht === 123.95, acc);
    const ecC = net(await txt(c, '#contenu'));
    const ligC = (new RegExp('Devis ' + numB + '[^]*?(?=Devis D-2026|Clim Services 17 ·|$)').exec(ecC) || [''])[0];
    v('C6 (écran client) la ligne de ' + numB + ' dit « Accepté » (et plus « À signer ») ; l’autre devis, D-2026-031, reste à signer', /Accepté/.test(ligC) && !/À signer/.test(ligC) && /D-2026-031[^]*?À signer/.test(ecC), ligC);
    await S(c, () => { EC.tab = 'interventions'; rendre(); }); await L.calme(p, 400);
    const ecI = net(await txt(c, '#contenu'));
    v('C7 (écran client) « Rendez-vous à fixer : Remplacement du circulateur » dans ses interventions à venir', /Rendez-vous à fixer/.test(ecI) && /Remplacement du circulateur/.test(ecI), ecI.slice(0, 300));

    /* le gérant : la facture d'acompte, envoyée */
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'facture-x-fa-' + numB);
    const fa0 = net(await txt(c, '#contenu'));
    v('D1 (écran) la facture d’acompte « À valider » : HT 123,95 €, TTC 136,35 € ; sa ligne dit « Acompte de 30 % sur le devis ' + numB + ' »', /À valider/.test(fa0) && /Total HT 123,95 €/.test(fa0) && /Total TTC 136,35 €/.test(fa0) && await S(c, n => /Acompte de 30 % sur le devis/.test(FACTURES.find(o => o.id === 'fa-' + n).lignes[0].d), numB), fa0.slice(0, 900));
    await clic(c, '[data-action="apercuEnvoi"]'); await p.waitForTimeout(500); await clic(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(900);
    const fa1 = await S(c, n => { const f = FACTURES.find(o => o.id === 'fa-' + n); return { num:f.num, st:f.st, ttc:ttcDe(f), ht:f.ht }; }, numB);
    v('D2 (donnée) envoyée : numéro FAC-2026-0146, « envoyee », TTC 136,35', /^FAC-2026-0\d+$/.test(fa1.num) && fa1.st === 'envoyee' && Math.round(fa1.ttc * 100) === 13635, fa1);
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'factures' }); }); await L.calme(p, 700);
    const ecF = net(await txt(c, '#contenu'));
    v('D3 (écran client) la facture d’acompte : 136,35 €, « À régler », bouton « Payer 136,35 € »', /136,35 €/.test(ecF) && /À régler/.test(ecF) && /Payer 136,35 €/.test(ecF), ecF.slice(0, 400));
    await clic(c, '[data-ec^="payer|fa-"]'); await p.waitForTimeout(800);
    await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123');
    await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1300);
    const pa = await S(c, n => { const f = FACTURES.find(o => o.id === 'fa-' + n); return { st:f.st, recu:f.recu, enc:ENCAISSEMENTS.filter(e => e.fac === f.num).map(e => [e.ttc, e.tva]) }; }, numB);
    v('D4 (donnée) l’acompte est payé : 136,35 € reçus, un encaissement de 136,35 € à 10 % de TVA', pa.st === 'payee' && Math.round(pa.recu * 100) === 13635 && JSON.stringify(pa.enc) === '[[136.35,10]]', pa);

    /* le gérant planifie l'intervention née de l'accord : Tom, aujourd'hui 15 h */
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'inter-x-i-' + numB);
    const i0 = net(await txt(c, '#contenu'));
    v('E1 (écran) l’intervention « à planifier » : « Remplacement du circulateur », « Devis ' + numB + ' accepté le … », M. et Mme Durand', /Remplacement du circulateur/.test(i0) && new RegExp('Devis ' + numB + ' accepté').test(i0) && /Durand/.test(i0), i0.slice(0, 300));
    /* depuis la fiche « à planifier » : le vrai geste « Planifier » (jour, heure, durée, personne) ; un week-end se refuse, le premier jour ouvré est lundi 2 novembre */
    await p.evaluate(() => { const e = document.getElementById('pl-d'); if (e) e.scrollIntoView({ block:'center' }); });
    const champs = await S(c, () => ['pl-d', 'pl-h', 'pl-u', 'pl-t'].map(k => { const e = document.getElementById(k); return e ? [k, e.tagName, e.value] : [k, null]; }));
    v('E1b population : le formulaire « Planifier » (jour, heure, durée, personne) est là', champs.every(x => x[1]), champs);
    await p.fill('#pl-d', '2026-10-31'); await clic(c, '[data-rl="placer|i-' + numB + '"]'); await p.waitForTimeout(400);
    const refusWE = net(await S(c, () => (document.getElementById('toast') || {}).innerText || ''));
    v('E1c un samedi se refuse : « C’est un week-end : choisis un jour de semaine. » (rien n’est posé)', /week-end/.test(refusWE) && await S(c, n => INTS.find(o => o.id === 'i-' + n).st === 'aplanifier', numB), refusWE);
    await p.fill('#pl-d', '2026-11-02'); await p.selectOption('#pl-h', '08:00'); await p.selectOption('#pl-u', { value:'180' }).catch(() => p.fill('#pl-u', '180')); await p.selectOption('#pl-t', 'tl');
    await clic(c, '[data-rl="placer|i-' + numB + '"]'); await p.waitForTimeout(700);
    const i1 = await S(c, n => { const i = INTS.find(o => o.id === 'i-' + n); return { st:i.st, tech:i.tech, d:i.d, h:i.h, dur:i.dur }; }, numB);
    v('E2 (donnée) planifiée : Tom, lundi 2 novembre 08:00, 3 h (les « 3 h » de la ligne du devis), « planifiee »', i1.st === 'planifiee' && i1.tech === 'tl' && i1.d === '2026-11-02' && i1.h === '08:00' && i1.dur === 180, i1);
    /* le client a écrit « aujourd'hui » : le gérant la ramène à aujourd'hui 15 h (✎ Modifier existe maintenant) */
    await L.aller(p, 'inter-x-i-' + numB);
    v('E3 population : la fiche planifiée propose ✎ Modifier', await clic(c, '[data-action="modifInt"]'));
    await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '15:00'); await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(600);
    const i2 = await S(c, n => { const i = INTS.find(o => o.id === 'i-' + n); return { d:i.d, h:i.h, nt:NOTIFS.filter(x => x.k === 'tl' && /Durand/.test(x.txt)).length }; }, numB);
    v('E4 (donnée) aujourd’hui 15:00 ; Tom en est prévenu (un message du bureau)', i2.d === '2026-10-31' && i2.h === '15:00' && i2.nt === 1, i2);

    /* Tom fait l'intervention */
    const mt = await P.passer(c, 'tl', 'majournee');
    const tj = net(await txt(c, '#contenu'));
    v('F1 (écran) « Ma journée » de Tom contient l’intervention de 15:00 chez M. et Mme Durand', mt.ROLE === 'tech' && /15:00\s*Planifiée\s*M\. et Mme Durand\s*Remplacement du circulateur/.test(tj), tj.slice(0, 600));
    await clic(c, '[data-rl="go|inter-x-i-' + numB + '"]'); await p.waitForTimeout(600);
    const ctrls = await S(c, () => [...document.querySelectorAll('input[data-ctrl]')].map(e => e.dataset.ctrl));
    v('F2 population : des contrôles à cocher (' + ctrls.length + ')', ctrls.length >= 4, ctrls);
    for (const k of ctrls) await S(c, k => { const e = document.querySelector('input[data-ctrl="' + k + '"]'); e.scrollIntoView({ block:'center' }); e.click(); }, k);
    await p.fill('textarea[data-champ=compte]', 'Circulateur remplacé, purge faite, essai de chauffe concluant.');
    await P.signer(c, 'canvas#signe');
    await clic(c, '[data-action="terminer"]'); await p.waitForTimeout(900);
    const so = await S(c, n => { const i = INTS.find(o => o.id === 'i-' + n), f = FACTURES.find(o => o.int === 'i-' + n), d = dvInit().find(x => x.num === n); return { st:i.st, f:f && { id:f.id, st:f.st, ht:f.ht, tva:f.tva, lignes:f.lignes.map(l => [l.d, l.q, l.pu]) }, facSolde:d.facSolde }; }, numB);
    v('F3 (donnée) terminée : la facture du SOLDE est préparée, liée au devis (facSolde), 4 lignes dont « Acompte de 30 % déjà facturé » à −123,95', so.st === 'fait' && !!so.f && so.facSolde === so.f.id && so.f.lignes.length === 4 && so.f.lignes.some(l => /Acompte de 30 % déjà facturé/.test(l[0]) && l[2] === -123.95), so);
    await FERMER(c);

    /* le gérant envoie le solde ; le client paie ; tout est payé AU CENTIME */
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'facture-x-f-i-' + numB);
    const fs = net(await txt(c, '#contenu'));
    v('G1 (écran) la facture du solde : HT 289,22 €, TVA 10 % 28,92 €, TTC 318,14 € (413,17 − 123,95 ; 289,22 × 1,10 = 318,142)', /Total HT 289,22 €/.test(fs) && /28,92 €/.test(fs) && /Total TTC 318,14 €/.test(fs), fs.slice(fs.indexOf('Total HT') - 40, fs.indexOf('Total HT') + 220));
    v('G2 (arithmétique) l’acompte TTC + le solde TTC = le devis TTC : 136,35 + 318,14 = 454,49', 13635 + 31814 === 45449);
    await clic(c, '[data-action="apercuEnvoi"]'); await p.waitForTimeout(500); await clic(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(900);
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'factures' }); }); await L.calme(p, 700);
    const ecG = net(await txt(c, '#contenu'));
    v('G3 (écran client) le solde : 318,14 € « À régler », et l’acompte « Payée »', /318,14 €[^]*?À régler/.test(ecG) && /136,35 €[^]*?Payée/.test(ecG), ecG.slice(0, 500));
    await clic(c, '[data-ec^="payer|f-"]'); await p.waitForTimeout(800);
    await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123');
    await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1300);
    const tot = await S(c, n => { const a = FACTURES.find(o => o.id === 'fa-' + n), b = FACTURES.find(o => o.id === 'f-i-' + n); return { a:[a.st, a.recu], b:[b.st, b.recu], enc:ENCAISSEMENTS.filter(e => e.fac === a.num || e.fac === b.num).reduce((s, e) => s + Math.round(e.ttc * 100), 0) }; }, numB);
    v('G4 (donnée) les deux factures sont payées, les encaissements totalisent 454,49 € = le devis', tot.a[0] === 'payee' && tot.b[0] === 'payee' && tot.enc === 45449, tot);
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    const k1 = await kpis(c), t1 = await compta(c), d1 = await dvKpi(c);
    v('H1 (écran) la Comptabilité : la trésorerie monte d’EXACTEMENT 454,49 € (' + t0 + ' → ' + t1 + ')', t1 - t0 === 45449, { t0, t1 });
    v('H2 (écran) l’Accueil : « reçu en octobre » + 454,49 €, « à recevoir » revenu à son niveau d’avant', k1.recu - k0.recu === 45449 && k1.arecevoir === k0.arecevoir, { k0, k1 });
    v('H3 (écran) Devis : « acceptés » monte de 454,49 € (le devis rapide) : ' + d0.acceptes + ' → ' + d1.acceptes, d1.acceptes - d0.acceptes === 45449, { d0, d1 });
    await cap(c, '2-H3-devis-' + P.PROFIL);
    v('H4 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
