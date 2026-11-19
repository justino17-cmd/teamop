// Parcours D « compta-reste » : la Banque (expliquer chaque ligne), puis la TVA, le Journal, la Balance, le Grand livre, le Résultat — cohérence au centime.
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const B = () => p.evaluate(() => { const rap = cpRapprocher(), E = cpEcritures(); return { exp: rap.aExpliquer.length, att: rap.attente.length, s512: Math.round(cpSolde(E, '512') * 100), bq: Math.round((CP_SOLDE_01 + CP_RELEVE.reduce((s, r) => s + r.m, 0)) * 100),
    durand: (() => { const f = FACTURES.find(x => x.num === 'FAC-2026-0128'); return { st: f.st, recu: f.recu || 0, reste: restant(f) }; })() }; });
  await X.compta(c, 'banque'); const b0 = await B();
  v('D0 trois lignes de la banque sont à expliquer', b0.exp === 3, b0); v('D0 l’écart affiché = comptabilité − banque = −285,66 €', b0.s512 - b0.bq === -28566, { s512: b0.s512, bq: b0.bq });
  const tx0 = await X.texte(p); v('D0 l’écran dit l’écart en clair', /Écart de .*285,66/.test(tx0), tx0.match(/Écart[^\n]*/) && tx0.match(/Écart[^\n]*/)[0]);
  const boutons = await p.evaluate(() => [...document.querySelectorAll('#contenu .cp-act button')].map(b => b.textContent.trim())); v('D0 chaque ligne à expliquer propose une réponse (3 boutons)', boutons.length === 3, boutons);
  await L.capture(c, X.CAP + `${profil}-parcours-d-banque.png`);
  // 1) le virement de M. Durand : « C'est un paiement de FAC-2026-0128 »
  await L.toucher(c, '[data-cp^="paiement|"]'); const b1 = await B(), t1 = await X.toasts(p);
  v('D1 le virement de 300 € s’attache à la facture Durand : elle reste due pour 940 € (300 € reçus)', (b1.durand.st === 'partielle' || b1.durand.st === 'retard') && Math.abs(b1.durand.reste - 940) < .01, b1.durand);
  v('D1 le toast dit 300,00 € et le reste dû', /300,00/.test(t1) && /940,00/.test(t1), t1); v('D1 il ne reste que 2 lignes à expliquer', b1.exp === 2, b1);
  // 2) les deux frais bancaires, par deux gestes
  await L.toucher(c, '[data-cp^="frais|"]'); await L.toucher(c, '[data-cp^="frais|"]'); const b2 = await B();
  v('D2 les frais de banque sont expliqués : « Tout le relevé est expliqué »', b2.exp === 0 && /Tout le relevé est expliqué/.test(await X.texte(p)), b2);
  v('D2 l’écart tombe à 0,00 € (les deux soldes sont égaux)', b2.s512 === b2.bq, { s512: b2.s512, bq: b2.bq }); v('D2 l’écran le dit : « Les deux soldes sont égaux »', /Les deux soldes sont égaux/.test(await X.texte(p)));
  await L.capture(c, X.CAP + `${profil}-parcours-d-banque-ok.png`);
  // D3 l'étape « La banque est expliquée » de la clôture suit
  await X.compta(c, 'cloture'); const cl = await X.texte(p); v('D3 la clôture ne cite plus de ligne de banque à expliquer', !/lignes à expliquer/.test(cl) || /Les \d+ lignes du relevé correspondent/.test(cl), cl.slice(0, 400));
  // E) TVA au centime, recalculée depuis les paiements et les achats
  await X.compta(c, 'tva'); const T = await p.evaluate(() => { const tv = cpTva(), E = cpEncOct(); const par = {}; E.forEach(e => { par[e.tva] = (par[e.tva] || 0) + Math.round(e.ttc * 100); });
    const taux = Object.entries(par).map(([t, ttc]) => { const ht = Math.round(ttc / (1 + t / 100)); return { t: +t, ht: ht / 100, tva: (ttc - ht) / 100 }; });
    const ded = ACHATS.filter(cpDedOct).reduce((s, a) => s + Math.round(cpTVA(a) * 100), 0) / 100; return { tv: { col: tv.col, ded: tv.ded, aPayer: tv.aPayer }, moi: { col: Math.round(taux.reduce((s, x) => s + x.tva, 0) * 100) / 100, ded }, nbEnc: E.length }; });
  v('E1 TVA collectée = somme des TVA des paiements d’octobre (recalculée à part), à 1 centime', Math.abs(T.tv.col - T.moi.col) <= .011, T);
  v('E1 TVA déductible = somme des achats avec facture, à 1 centime', Math.abs(T.tv.ded - T.moi.ded) <= .011, T);
  v('E1 TVA à payer = collectée − déductible, à 1 centime', Math.abs(T.tv.aPayer - (T.tv.col - T.tv.ded)) <= .011, T);
  const txt = await X.texte(p); v('E1 l’écran affiche ce même « à payer »', txt.replace(/[\s  ]/g, '').includes(String(T.tv.aPayer.toFixed(2)).replace('.', ',') + '€'), T.tv.aPayer);
  const lib = await p.evaluate(() => { const B = cxSoldes(cpEcritures()); return { c44571: B['44571'] ? B['44571'].cr : 0, c44574: B['44574'] ? B['44574'].cr : 0, ecart658: B['658'] ? B['658'].de : 0 }; });
  v('compta-reste-12 · E1b la TVA collectée de l’écran TVA = celle de la balance (compte 44571), au centime', Math.abs(T.tv.col - lib.c44571) < .005, { ecranTVA: T.tv.col, balance44571: lib.c44571, ecartArrondi658: lib.ecart658 });
  // la balance : débits = crédits, par classe ; le résultat = produits − charges
  await X.compta(c, 'balance'); const bal = await p.evaluate(() => { const E = cpEcritures(), B = cxSoldes(E); const K = Object.keys(B); const d = K.reduce((s, k) => s + Math.round(B[k].de * 100), 0), cr = K.reduce((s, k) => s + Math.round(B[k].cr * 100), 0);
    const prod = K.filter(k => k[0] === '7').reduce((s, k) => s + Math.round((B[k].cr - B[k].de) * 100), 0), ch = K.filter(k => k[0] === '6').reduce((s, k) => s + Math.round((B[k].de - B[k].cr) * 100), 0); return { d, cr, prod, ch, n: K.length }; });
  v('E2 la balance est équilibrée au centime', Math.abs(bal.d - bal.cr) <= 1, bal); v('E2 la balance compte des comptes (population)', bal.n > 15, bal.n);
  await X.compta(c, 'resultat'); const rt = await X.texte(p); const r = (bal.prod - bal.ch) / 100; const aff = rt.replace(/[\s  ]/g, '');
  v('E3 le résultat provisoire = produits − charges (recalculé)', aff.includes(r.toFixed(2).replace('.', ',').replace('-', '−') + '€') || aff.includes(r.toFixed(2).replace('.', ',') + '€'), { r, extrait: rt.slice(0, 200) });
  // grand livre : le solde du compte 512 au pied = le solde de la banque en comptabilité
  await X.compta(c, 'grandlivre'); await p.selectOption('[data-cxgl]', '512'); await p.waitForTimeout(250); const gl = await p.evaluate(() => { const t = [...document.querySelectorAll('.cx-gl-l.cx-bal-tot .n b')].pop(); return t ? t.textContent : ''; });
  v('E4 le grand livre du 512 finit sur le solde du compte 512', L.cents(gl) === (await B()).s512, gl);
  await L.capture(c, X.CAP + `${profil}-parcours-d-grandlivre.png`);
  // journal : chaque écriture équilibrée, une ligne cliquable mène à la pièce
  await X.compta(c, 'ecritures'); const ej = await p.evaluate(() => { const E = cpEcritures(); return { n: E.length, faux: E.filter(e => Math.round(e.lignes.reduce((s, l) => s + (l.de || 0) * 100, 0)) !== Math.round(e.lignes.reduce((s, l) => s + (l.cr || 0) * 100, 0))).length }; });
  v('E5 le journal : aucune écriture déséquilibrée', ej.faux === 0 && ej.n > 20, ej);
  v('D erreurs JavaScript : aucune', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC', e.message); process.exit(2); });
