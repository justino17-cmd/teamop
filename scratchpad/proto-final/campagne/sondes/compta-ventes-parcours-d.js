// Parcours D « compta-ventes » : la LIAISON entre OP GESTION et le cadre plein écran de la Comptabilité. Une facture payée ici l'est-elle là-bas, au même
// montant ? Une relance faite dans le cadre arrive-t-elle sur la fiche ? « Ouvrir la facture » mène-t-il à la bonne fiche, et « ‹ OP GESTION » ramène-t-il où l'on était ?
// usage : node compta-ventes-parcours-d.js [profil] [qui]
const X = require('./compta-ventes-outils.js'), L = X.L;
const cts = n => Math.round(n * 100);
const lire = f => f.evaluate(() => { const L = {}; document.querySelectorAll('#contenu tr[data-fac]').forEach(tr => { L[tr.dataset.fac] = tr.innerText.replace(/\s+/g, ' ').trim(); });
  const k = [...document.querySelectorAll('#contenu .kpi')].map(e => e.innerText.replace(/\s+/g, ' ').trim()); return { lignes: L, kpi: k }; });
const etatHote = f => (f.st === 'payee' ? 'Payée' : f.st === 'retard' ? 'En retard' : f.st === 'partielle' ? 'Payée en partie' : 'À encaisser');
(async () => {
  const profil = process.argv[2] || 'mac', qui = process.argv[3] || 'marc';
  const c = await L.ouvrir({ profil, qui }), p = c.p;
  let f = await X.cadreOuvert(c); L.v('le cadre plein écran s’ouvre depuis le menu Comptabilité', !!f);
  if (!f) { await L.fermer(); process.exit(1); }
  const barre = await p.evaluate(() => [...document.querySelectorAll('#cpsys .cpsys-barre button, #cpsys .cpsys-barre b')].map(e => e.textContent.trim()));
  L.v('la barre du cadre propose de revenir à OP GESTION (premier bouton) et « Factures et paiements » (dernier)', barre.length >= 3 && /OP GESTION/.test(barre[0]) && /Factures et paiements/.test(barre[barre.length - 1]), barre);
  // ── 1. les ventes du cadre = les factures d'OP GESTION ──
  await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800);
  let hote = await X.donnees(p), cad = await lire(f);
  const emises = hote.F.filter(x => x.num !== '—' && x.st !== 'avoir');
  L.v('population : le cadre liste des factures', Object.keys(cad.lignes).length >= 7, Object.keys(cad.lignes).length);
  for (const x of emises.filter(y => y.paye === '' || /\/10$/.test(y.paye) || y.st !== 'payee')) {
    const ligne = cad.lignes[x.num]; const ok = ligne && ligne.includes(etatHote(x).replace(' en partie', '')) ;
    L.v(`la facture ${x.num} est dans le cadre avec l’état « ${etatHote(x)} »`, !!ok, ligne);
  }
  const du = (await X.du(p)) / 100, fmt = n => n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const kpiReste = cad.kpi.find(k => /Reste à encaisser/.test(k)) || '';
  L.v('« Reste à encaisser » du cadre = « à recevoir » d’OP GESTION (1 475,00 €) au centime', L.cents((kpiReste.match(/[\d\s  ]+,\d\d/) || [''])[0]) === cts(du), { kpiReste, du });
  await L.capture(c, X.CAP + `d-${profil}-${qui}-cadre-ventes.png`);
  // ── 2. une facture dans le cadre : où elle en est, relancer, PDF, ouvrir dans OP GESTION ──
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(600);
  let pan = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('le panneau d’une facture dit « Où en est cette facture » avec la relance et le reste dû', /Où en est cette facture/i.test(pan) && /relancée 2 fois/i.test(pan) && /1\s240,00/.test(pan), pan.slice(0, 200));
  await L.capture(c, X.CAP + `d-${profil}-${qui}-cadre-facture.png`);
  await f.evaluate(() => document.querySelector('[data-cmpt="relancer"]').click()); await p.waitForTimeout(500);
  await f.evaluate(() => document.querySelector('[data-cmpt="relancer-ok"]').click()); await p.waitForTimeout(600);
  hote = await X.donnees(p); L.v('une relance envoyée DANS le cadre arrive sur la facture d’OP GESTION (3 relances)', hote.F.find(x => x.id === 'f128').relances === 3, hote.F.find(x => x.id === 'f128').relances);
  // le PDF vu depuis le cadre : le MÊME document que celui d'OP GESTION (pas un aperçu de démonstration)
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(500);
  await f.evaluate(() => { const b = document.querySelector('[data-cmpt="pdf"]'); if (b) b.click(); }); await p.waitForTimeout(500);
  const pdfTxt = await f.evaluate(() => { const e = document.querySelector('#calque .panneau'); return e ? e.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('compta-ventes-13 · « Voir le PDF » du cadre montre le vrai document, sans la phrase « Aperçu de démonstration »', /FAC-2026-0128/.test(pdfTxt) && !/démonstration/i.test(pdfTxt), pdfTxt.slice(0, 200));
  await L.capture(c, X.CAP + `d-${profil}-${qui}-cadre-pdf.png`);
  await f.evaluate(() => { try { fermer(); } catch (e) {} }); await p.waitForTimeout(300);
  // ouvrir la facture dans OP GESTION
  await f.evaluate(() => document.querySelector('#contenu tr[data-fac="FAC-2026-0128"]').click()); await p.waitForTimeout(500);
  const bouton = await f.evaluate(() => { const b = document.querySelector('[data-cmpt="ouvrir|facture"]'); return b && !b.hidden ? b.textContent.trim() : ''; });
  L.v('« Ouvrir la facture » est proposé sur une facture qui existe des deux côtés', /Ouvrir la facture/.test(bouton), bouton);
  await f.evaluate(() => { const b = document.querySelector('[data-cmpt="ouvrir|facture"]'); if (b) b.click(); }); await p.waitForTimeout(900);
  const st = await p.evaluate(() => ({ route, param, cadre: !!document.querySelector('#cpsys') && !document.querySelector('#cpsys').hidden, h1: (document.querySelector('#contenu h1') || {}).textContent }));
  L.v('« Ouvrir la facture » mène à la fiche FAC-2026-0128 d’OP GESTION, cadre fermé', st.route === 'facture' && st.param === 'f128' && !st.cadre, st);
  const retourLib = await p.evaluate(() => { const b = document.querySelector('[data-retourva]'); return b ? b.textContent.trim() : ''; });
  L.v('le bouton Retour de la fiche dit où il ramène (« la Comptabilité »)', /Comptabilité/.test(retourLib), retourLib);
  await L.toucher(c, '[data-retourva]'); await p.waitForTimeout(900);
  const st2 = await p.evaluate(() => ({ route, cadre: !!document.querySelector('#cpsys') && !document.querySelector('#cpsys').hidden }));
  L.v('« Retour » rouvre le cadre de la Comptabilité', st2.route === 'comptabilite' && st2.cadre, st2);
  // ── 3. payer ici → payé là-bas ──
  await p.evaluate(() => { cpSysteme = false; rendre(); }); await X.fiche(c, 'f144'); await L.toucher(c, '[data-payer="f144|Carte"]'); await p.waitForTimeout(400);
  await p.evaluate(() => { cpSysteme = true; cpSysDe = 'accueil'; aller('comptabilite'); }); await p.waitForTimeout(1500); f = L.cadre(p);
  await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900); cad = await lire(f);
  L.v('payée dans OP GESTION par carte : le cadre dit « Payée · carte » sur FAC-2026-0144', /Payée.*carte/i.test(cad.lignes['FAC-2026-0144'] || ''), cad.lignes['FAC-2026-0144']);
  const du2 = (await X.du(p)) / 100, kp2 = (cad.kpi.find(k => /Reste à encaisser/.test(k)) || '');
  L.v('« Reste à encaisser » du cadre baisse de 121,00 € comme dans OP GESTION', L.cents((kp2.match(/[\d\s  ]+,\d\d/) || [''])[0]) === cts(du2), { kp2, du2 });
  // l'accueil du cadre
  await f.evaluate(() => aller('accueil')); await p.waitForTimeout(700);
  const kAcc = await f.evaluate(() => { const b = document.querySelector('[data-a="aller"][data-r="ventes"]'); return b ? b.innerText.replace(/\s+/g, ' ').trim() : ''; });
  L.v('l’accueil du cadre : « Les clients te doivent » = à recevoir d’OP GESTION', L.cents((kAcc.match(/[\d\s  ]+,\d\d/) || [''])[0]) === cts(du2), { kAcc, du2 });
  // ── 4. une facture NEUVE envoyée dans OP GESTION arrive dans le cadre, même numéro ──
  await p.evaluate(() => { cpSysteme = false; rendre(); });
  const nouv = await p.evaluate(() => { FACTURES.unshift({ id: 'fz1', num: '—', cli: 'cm', objet: 'Forfait liaison', lignes: [{ d: 'Forfait liaison', q: '1', pu: 200 }], ht: 0, tva: 20, st: 'avalider', emise: '—', ech: '—' }); return numSuiv; });
  await X.fiche(c, 'fz1'); await L.toucher(c, '[data-action="apercuEnvoi"]'); await L.toucher(c, '#calque [data-action="envoyer"]'); await p.waitForTimeout(500);
  const num = (await X.donnees(p)).F.find(x => x.id === 'fz1').num;
  L.v('la facture neuve prend le numéro attendu (le suivant)', num === 'FAC-2026-0' + nouv, { num, nouv });
  await p.evaluate(() => { cpSysteme = true; cpSysDe = 'accueil'; aller('comptabilite'); }); await p.waitForTimeout(1500); f = L.cadre(p);
  await f.evaluate(() => aller('ventes')); await p.waitForTimeout(900); cad = await lire(f);
  L.v('la facture neuve est dans le cadre, « À encaisser », 240,00 € TTC', !!cad.lignes[num] && /À encaisser/.test(cad.lignes[num]) && /240,00/.test(cad.lignes[num]), cad.lignes[num]);
  // ── 5. le retour ──
  await L.toucher(c, '#cpsys [data-cpsys="retour"]'); await p.waitForTimeout(700);
  const apres = await p.evaluate(() => ({ route, cadre: !!document.querySelector('#cpsys') && !document.querySelector('#cpsys').hidden }));
  L.v('« ‹ OP GESTION » ferme le cadre et ramène à l’écran d’où l’on venait (l’accueil)', apres.route === 'accueil' && !apres.cadre, apres);
  await L.toucher(c, '#menu a[href="#comptabilite"]'); await p.waitForTimeout(1200); await p.keyboard.press('Escape'); await p.waitForTimeout(600);
  const esc = await p.evaluate(() => ({ route, cadre: !!document.querySelector('#cpsys') && !document.querySelector('#cpsys').hidden }));
  L.v('Échap ferme le cadre', !esc.cadre, esc);
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
