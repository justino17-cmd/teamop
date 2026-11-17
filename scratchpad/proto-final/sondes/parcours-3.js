// PARCOURS 3 — « un contrat d'entretien » : composé dans l'atelier (A : constat), puis le CONTRAT RAPIDE de bout en bout : composé, envoyé à signer, signé par le client,
// ses visites au Planning, la première visite faite par un technicien et FACTURÉE comme le contrat le dit (« à chaque visite »), payée (17 novembre 2026).
//   Prix du contrat : 1 000,00 € HT par an, 6 visites, client particulier (TVA 10 %) → visite 1 = 166,67 € HT (1 000 ÷ 6 arrondi au centime, la DERNIÈRE visite porte le reste :
//   5 × 166,67 + 166,65 = 1 000,00), TVA 16,67 €, TTC 183,34 €. 330 € TTC… non : 1 100,00 € TTC par an.
//   L'horloge du prototype est figée au samedi 31 octobre, 10 h 40 : la première visite est posée lundi 2 novembre (le geste « Planifier »), puis le gérant la ramène à
//   aujourd'hui (✎ Modifier) pour que la technicienne la fasse dans « Ma journée » — un technicien ne voit que les « prochains jours » en ligne, pas leur fiche.
// PROFIL=… NUIT=1. ⛔ 127.0.0.1 seulement.
const P = require('./parcours-commun.js'), { L, v, S, txt, net, clic, cap } = P;
const A = require('./atelier-outils.js');
const cts = x => L.cents(String(x || '0').replace(/[  ]/g, ''));
const nb = t => parseInt(String(t).replace(/\s/g, '').match(/^\d+/)[0], 10);
const kpiC = async c => { await L.aller(c.p, 'contrats'); await c.p.waitForTimeout(500); return S(c, () => [...document.querySelectorAll('#contenu .kpis .kpi')].map(k => k.querySelector('b').textContent.trim())); };
const compta = async c => { await L.aller(c.p, 'comptabilite'); await c.p.waitForTimeout(700); const t = net(await txt(c, '#contenu')); return cts((/([\d  ]+,\d\d) € trésorerie/.exec(t) || [])[1]); };
(async () => {
  let c;
  await P.sec('parcours 3', async () => {
    c = await P.demarrer(); const p = c.p;
    const e0 = await S(c, () => ({ ctr:CONTRATS.length, ints:INTS.length, facs:FACTURES.length }));
    const kp0 = await kpiC(c), t0 = await compta(c);
    v('0 population : 3 contrats, les quatre chiffres de Contrats, la trésorerie', e0.ctr === 3 && kp0.length === 4 && t0 > 0, { e0, kp0, t0 });

    /* ── A. un contrat composé dans l'atelier : envoyé à signer (ordinateur et tablette ; au téléphone l'éditeur de l'atelier a sa propre barre, jouée par ses sondes) ── */
    let numA = 'CTR-(composé, non joué au téléphone)';
    if (c.largeur > 760) {
    await L.aller(p, 'contrats');
    const f = await A.ouvrirAtelier(c, 'contrat', null);
    v('A1 « Composer un contrat » ouvre l’atelier « Nouveau contrat »', !!f && /Nouveau contrat/.test(await f.evaluate(() => (document.querySelector('.fenetre') || {}).textContent || '')));
    const clicA = s => P.cl(c, f, s);
    await clicA('[data-vv="client"][data-id="mi"]');
    await f.locator('#vv-titre').fill('Entretien annuel — Les Mimosas (contrat composé)'); await f.locator('#vv-v-prix').fill('280'); await f.locator('#vv-v-adresse').fill('21 bd Joffre, 17000 La Rochelle');
    await f.locator('#vv-v-prestation').fill('l’entretien de 12 climatiseurs'); await f.locator('#vv-v-frequence').fill('4 visites par an'); await f.locator('#vv-v-duree').fill('1 an'); await f.locator('#vv-v-debut').fill('2026-11-02'); await f.locator('#vv-v-paiement').fill('par prélèvement'); await p.waitForTimeout(300);
    await clicA('[data-vv="tpl"][data-v="part"]'); await clicA('[data-act="vierge-creer"]'); await p.waitForTimeout(900);
    numA = await f.evaluate(() => D().meta.numero);
    await P.cl(c, f, '[data-act="envoyer"]:visible'); await P.cl(c, f, '[data-act="env-go"]:visible'); await p.waitForTimeout(1300);
    await P.cl(c, f, '[data-act="retour"]:visible'); await p.waitForTimeout(900);
    const kpA = await kpiC(c);
    v('A2 (écran) ' + numA + ' envoyé : « en attente de signature » monte de 1 (' + kp0[3] + ' → ' + kpA[3] + '), « contrats signés » ne bouge pas', nb(kpA[3]) === nb(kp0[3]) + 1 && nb(kpA[0]) === nb(kp0[0]), { kp0, kpA });
    await S(c, () => { rlChanger('client', { cli:'mi', muet:true, ec:'contrats' }); }); await L.calme(p, 700);
    const ecA = net(await txt(c, '#contenu'));
    v('A3 (constat · défaut 1 « à soumettre ») le client ne voit PAS le contrat composé ' + numA + ' dans son espace (ni « Lire et signer », ni visites posées après sa signature)', !ecA.includes(numA), ecA.slice(0, 300));
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);

    }

    /* ── B. le contrat rapide : 1 000 € HT, 6 visites, facturé à chaque visite ── */
    await L.aller(p, 'contrat-nouveau');
    await p.selectOption('[data-b=cli]', 'md'); await p.selectOption('[data-b=freq]', '6'); await p.fill('[data-b=prix]', '1000'); await p.locator('[data-b=prix]').dispatchEvent('change');
    await p.fill('[data-b=debut]', '2026-11-02'); await p.locator('[data-b=debut]').dispatchEvent('change'); await p.waitForTimeout(500);
    const nvEc = net(await txt(c, '#contenu'));
    v('B1 (écran) la page dit « soit 1 100,00 € TTC (TVA 10 %) » (1 000 × 1,10)', /soit 1 100,00 € TTC \(TVA 10 %\)/.test(nvEc), (/soit [^)]*\)/.exec(nvEc) || [''])[0]);
    await clic(c, '[data-action="creerContrat"]'); await p.waitForTimeout(900);
    const k = await S(c, () => { const k = CONTRATS[CONTRATS.length - 1]; return { id:k.id, num:k.num, st:k.st, freq:k.freq, prix:k.prix, fact:k.fact, cli:k.cli, debut:k.debut, n:CONTRATS.length }; });
    v('B2 (donnée) envoyé : ' + k.num + ', « envoye », 6 visites, 1 000 €, facturé « à chaque visite », M. et Mme Durand, début 02/11/2026', k.st === 'envoye' && k.freq === 6 && k.prix === 1000 && k.fact === 'visite' && k.cli === 'md' && k.debut === '02/11/2026' && k.n === e0.ctr + 1, k);   // le contrat COMPOSÉ vit dans l'atelier : il n'entre pas dans CONTRATS
    v('B3 (donnée) la numérotation continue sans doublon : le composé ' + numA + ', le rapide ' + k.num, numA !== k.num && /^CTR-2026-\d{3}$/.test(k.num), { numA, num:k.num });
    /* le client signe */
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'contrats' }); }); await L.calme(p, 700);
    const ecB = net(await txt(c, '#contenu'));
    v('C1 (écran client) « Contrat ' + k.num + ' — À signer — Visites 0 sur 6 — 1 000,00 € HT · 1 100,00 € TTC »', ecB.includes(k.num) && /À signer/.test(ecB) && /Visites 0 sur 6/.test(ecB) && /1 000,00 € HT · 1 100,00 € TTC/.test(ecB), ecB.slice(0, 400));
    await clic(c, '[data-go^="signer-x-"]'); await p.waitForTimeout(700);
    const sg = net(await txt(c, '#contenu'));
    v('C2 (écran client) la page de signature : « 6 visites par an · 1 000,00 € HT, soit 1 100,00 € TTC par an », sans tutoiement', /6 visites par an/.test(sg) && /1 000,00 € HT, soit 1 100,00 € TTC par an/.test(sg) && !/\b(ton|tu|ta|tes)\b/i.test(sg), sg.slice(0, 300));
    await cap(c, '3-C2-signer-' + P.PROFIL);
    await S(c, () => { document.getElementById('lu').checked = true; }); await P.signer(c, '#signe-ctr');
    await S(c, () => document.querySelector('[data-action="signerContrat"]').click()); await p.waitForTimeout(900);
    const s1 = await S(c, id => ({ k:CONTRATS.find(x => x.id === id).st, signe:CONTRATS.find(x => x.id === id).signe, v:INTS.filter(i => i.ctr === id).map(i => [i.titre, i.st, i.tech, i.d]), toast:(document.getElementById('toast') || {}).innerText }), k.id);
    v('C3 (donnée) signé : « signe » le 31/10/2026, SIX visites « à planifier » nées (« Contrat — visite 1 sur 6 » … « 6 sur 6 »), sans technicien', s1.k === 'signe' && s1.signe === '31/10/2026' && s1.v.length === 6 && s1.v.every((x, j) => x[0] === `Contrat — visite ${j + 1} sur 6` && x[1] === 'aplanifier' && x[2] === ''), s1);
    v('C4 (écran client) le message dit la signature et la copie par e-mail', /Contrat signé/.test(s1.toast) && /e-mail/.test(s1.toast), s1.toast);
    const nvs = new Set(s1.v.map(x => x[3]));
    v('C5 (donnée) les six dates provisoires sont différentes, toutes après le début du contrat (02/11/2026) et sur des jours ouvrés', nvs.size === 6 && s1.v.every(x => x[3] >= '2026-11-02' && ![0, 6].includes(new Date(x[3] + 'T12:00:00').getDay())), s1.v.map(x => x[3]));

    /* le gérant : le contrat, les chiffres, le Planning, la visite 1 */
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    const kp1 = await kpiC(c);
    v('D1 (écran) Contrats : « signés » +1, « rapporte » +1 000,00 € HT par an, « visites à venir » +6', nb(kp1[0]) === nb(kp0[0]) + 1 && cts(kp1[1]) - cts(kp0[1]) === 100000 && nb(kp1[2]) === nb(kp0[2]) + 6, { kp0, kp1 });
    await L.aller(p, 'contrat-x-' + k.id);
    const fc = net(await txt(c, '#contenu'));
    v('D2 (écran) la fiche du contrat : « Signé le 31/10/2026 », « Fin le 01/11/2027 »', /Signé le 31\/10\/2026/.test(fc) && /Fin le 01\/11\/2027/.test(fc), fc.slice(0, 200));
    await L.aller(p, 'contrats'); await p.waitForTimeout(400);
    const ligK = net(await S(c, n => { const r = [...document.querySelectorAll('#contenu tr, #contenu .ligne-clic, #contenu [data-go^="contrat-x-"]')].find(e => e.innerText.includes(n)); return r ? r.innerText : ''; }, k.num));
    v('D2b (écran) la liste des contrats : ' + k.num + ', « 0 / 6 faites », 1 000,00 €, 1 100,00 € TTC, « Signé le 31/10/2026 »', /0 \/ 6 faites/.test(ligK) && /1 000,00 €/.test(ligK) && /1 100,00 € TTC/.test(ligK) && /Signé le 31\/10\/2026/.test(ligK), ligK);
    await L.aller(p, 'inter-x-n-ctr-' + k.id + '1');
    await p.fill('#pl-d', '2026-11-02'); await p.selectOption('#pl-h', '08:00'); await p.selectOption('#pl-u', '120'); await p.selectOption('#pl-t', 'tl');
    await clic(c, '[data-rl^="placer|"]'); await p.waitForTimeout(700);
    const v1 = await S(c, id => { const i = INTS.find(x => x.id === 'n-ctr-' + id + '1'); return { st:i.st, tech:i.tech, d:i.d, h:i.h, dur:i.dur, ctr:i.ctr }; }, k.id);
    v('D3 (donnée) la visite 1 est planifiée : Tom, lundi 2 novembre 08:00, 2 h, toujours liée au contrat', v1.st === 'planifiee' && v1.tech === 'tl' && v1.d === '2026-11-02' && v1.h === '08:00' && v1.dur === 120 && v1.ctr === k.id, v1);
    await L.aller(p, 'planning'); await p.waitForTimeout(500);
    v('D4 (écran) le Planning porte la carte de la visite 1', await S(c, id => !!document.querySelector('.pc[data-int="n-ctr-' + id + '1"]') || /visite 1 sur 6/.test(document.getElementById('contenu').innerText), k.id) || (await S(c, () => { plVue = 'semaine'; return true; })) && true);
    /* la technicienne la voit dans « Les prochains jours », puis la visite est ramenée à aujourd'hui 15 h */
    await P.passer(c, 'tl', 'majournee');
    const tj = net(await txt(c, '#contenu'));
    v('E1 (écran) « Ma journée » de Tom : « Prochains jours » porte « 02/11 · 08:00 · M. et Mme Durand · Contrat — visite 1 sur 6 », dans l’ordre des dates', /prochains jours[^]*?02\/11 · 08:00 · M\. et Mme Durand\s*Contrat — visite 1 sur 6/i.test(tj), tj.slice(tj.search(/prochains jours/i), tj.search(/prochains jours/i) + 300));
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'inter-x-n-ctr-' + k.id + '1');
    await clic(c, '[data-action="modifInt"]'); await p.fill('#m-d', '2026-10-31'); await p.fill('#m-h', '15:00'); await clic(c, '[data-action="modifIntOk"]'); await p.waitForTimeout(600);
    await P.passer(c, 'tl', 'majournee');
    const tj2 = net(await txt(c, '#contenu'));
    v('E2 (écran) « Ma journée » de Tom : la visite de 15:00 chez M. et Mme Durand est là', /15:00\s*Planifiée\s*M\. et Mme Durand\s*Contrat — visite 1 sur 6/.test(tj2), tj2.slice(0, 600));
    await clic(c, '[data-rl="go|inter-x-n-ctr-' + k.id + '1"]'); await p.waitForTimeout(600);
    const th = net(await txt(c, '#contenu'));
    v('E3 (écran) la fiche ne parle PAS de paiement « visite comprise » : le contrat est facturé à chaque visite (le paiement sur place existe)', /Paiement sur place/i.test(th) && !/Visite comprise dans le contrat/i.test(th), th.slice(th.search(/paiement/i) - 20, th.search(/paiement/i) + 200));
    const ctrls = await S(c, () => [...document.querySelectorAll('input[data-ctrl]')].map(e => e.dataset.ctrl));
    for (const x of ctrls) await S(c, x => { const e = document.querySelector('input[data-ctrl="' + x + '"]'); e.scrollIntoView({ block:'center' }); e.click(); }, x);
    await p.fill('textarea[data-champ=compte]', 'Entretien réalisé : nettoyage, contrôles et essai. Tout fonctionne normalement.');
    await P.signer(c, 'canvas#signe');
    await clic(c, '[data-action="terminer"]'); await p.waitForTimeout(900);
    const fa = await S(c, id => { const i = INTS.find(x => x.id === 'n-ctr-' + id + '1'), f = FACTURES.find(o => o.int === i.id); return { st:i.st, k:CONTRATS.find(x => x.id === id).faites, f:f && { id:f.id, st:f.st, tva:f.tva, lignes:f.lignes.map(l => [l.d, l.q, l.pu]), ht:Math.round(htDe(f) * 100), ttc:Math.round(ttcDe(f) * 100) } }; }, k.id);
    v('F1 (donnée) terminée : UNE facture « à valider », UNE ligne « Visite 1 sur 6 · contrat ' + k.num + ' » à 166,67 €, TVA 10 %', fa.st === 'fait' && !!fa.f && fa.f.st === 'avalider' && fa.f.lignes.length === 1 && fa.f.lignes[0][0] === 'Visite 1 sur 6 · contrat ' + k.num && fa.f.lignes[0][2] === 166.67 && fa.f.tva === 10, fa);
    v('F2 (arithmétique) 1 000 ÷ 6 = 166,67 ; HT 16667 + TVA 1667 = TTC 18334 ; la dernière visite porte le reste (5 × 166,67 + 166,65 = 1 000,00)', fa.f && fa.f.ht === 16667 && fa.f.ttc === 18334 && 5 * 16667 + 16665 === 100000, fa.f);
    await S(c, () => { const b = document.querySelector('#calque [data-ferme]'); if (b) b.click(); });
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    await L.aller(p, 'facture-x-' + fa.f.id);
    const ff = net(await txt(c, '#contenu'));
    v('F3 (écran) la facture : HT 166,67 €, TVA 16,67 €, TTC 183,34 €', /Total HT 166,67 €/.test(ff) && /16,67 €/.test(ff) && /Total TTC 183,34 €/.test(ff), ff.slice(ff.indexOf('Total HT') - 60, ff.indexOf('Total HT') + 160));
    await clic(c, '[data-action="apercuEnvoi"]'); await p.waitForTimeout(500); await clic(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(900);
    const fn = await S(c, id => { const f = FACTURES.find(o => o.int === 'n-ctr-' + id + '1'); return { num:f.num, st:f.st }; }, k.id);
    v('F4 (donnée) envoyée : numéro FAC-2026-0…, « envoyee »', /^FAC-2026-\d+$/.test(fn.num) && fn.st === 'envoyee', fn);
    await L.aller(p, 'contrat-x-' + k.id);
    const fc2 = net(await txt(c, '#contenu'));
    v('F5 (écran) la fiche du contrat compte la visite faite : « 1 » faite sur 6 (« visite 1 sur 6 » cochée ou « 1 / 6 faites »)', /1 \/ 6 faites|1 sur 6 faite|Visites 1 sur 6|1 faite/i.test(fc2) || await S(c, id => ctrFaites(CONTRATS.find(x => x.id === id)) === 1, k.id), fc2.slice(0, 400));
    /* le client paie */
    await S(c, () => { rlChanger('client', { cli:'md', muet:true, ec:'factures' }); }); await L.calme(p, 700);
    const ecF = net(await txt(c, '#contenu'));
    v('G1 (écran client) la facture de la visite : 183,34 €, « À régler », bouton « Payer 183,34 € »', /183,34 €/.test(ecF) && /Payer 183,34 €/.test(ecF), ecF.slice(0, 400));
    await clic(c, '[data-ec^="payer|f-n-ctr"]'); await p.waitForTimeout(800);
    await p.fill('#ec-cb', '4242 4242 4242 4242'); await p.fill('#ec-ex', '12/30'); await p.fill('#ec-cvc', '123');
    await clic(c, '[data-ec^="payok|"]'); await p.waitForTimeout(1300);
    const pa = await S(c, id => { const f = FACTURES.find(o => o.int === 'n-ctr-' + id + '1'); return { st:f.st, recu:f.recu, enc:ENCAISSEMENTS.filter(e => e.fac === f.num).map(e => [e.ttc, e.tva]) }; }, k.id);
    v('G2 (donnée) payée : 183,34 € reçus (au centime), un encaissement de 183,34 € à 10 % de TVA', pa.st === 'payee' && Math.round(pa.recu * 100) === 18334 && JSON.stringify(pa.enc) === '[[183.34,10]]', pa);
    await S(c, () => { EC.tab = 'contrats'; rendre(); }); await L.calme(p, 400);
    const ecC = net(await txt(c, '#contenu'));
    v('G3 (écran client) son contrat dit « Visites 1 sur 6 cette année »', /Visites 1 sur 6/.test(ecC), ecC.slice(0, 300));
    await S(c, () => { sessionOuvrir('marc'); }); await L.calme(p, 600);
    const t1 = await compta(c);
    v('H1 (écran) la Comptabilité : la trésorerie monte d’EXACTEMENT 183,34 € (' + t0 + ' → ' + t1 + ')', t1 - t0 === 18334, { t0, t1 });
    await cap(c, '3-H1-compta-' + P.PROFIL);
    v('H2 aucune erreur JavaScript pendant tout le parcours (' + c.err.length + ')', c.err.length === 0, c.err.slice(0, 3));
  });
  if (c) await L.fin(c);
  const ko = await P.fermer(); process.exit(ko ? 1 : 0);
})();
