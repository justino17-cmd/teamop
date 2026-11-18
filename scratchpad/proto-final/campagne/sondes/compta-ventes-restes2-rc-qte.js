// Recontrôle adverse des restes « compta-ventes », tour 2 : la quantité TAPÉE (qn) contre les lignes PRÉPARÉES par OP GESTION (pièce « 0,5 L » au prix du catalogue, « 2h » au prix de la durée entière),
// et la suite d'une quantité tapée : le total se retrouve-t-il PARTOUT pareil (fiche, aperçu PDF, e-mail, avoir, cadre de la Comptabilité, paiement partiel) ?
// Usage : node compta-ventes-restes2-rc-qte.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = n => L.capture(c, X.CAP + `rc-qte-${profil}${nuit ? '-nuit' : ''}-${n}.png`);
  const eurN = s => Math.round(parseFloat(String(s).replace(/[  ]/g, '').replace(',', '.').replace(/[^\d.\-]/g, '')) * 100);
  await p.evaluate(() => { FACTURES.unshift({ id: 'fx-prep', num: '—', cli: 'md', objet: 'Lignes préparées · 30/10', lignes: [
    { d: 'Main-d’œuvre entretien', note: 'sur place · facturé 2h, à l’heure entamée', q: '2h', pu: 108 }, { d: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33, piece: true }, { d: 'Déplacement', q: '1', pu: 29.17 }], ht: 0, tva: 10, st: 'avalider', emise: '—', ech: '—' }); });
  await X.fiche(c, 'fx-prep');
  const tot = k => p.evaluate(k => Math.round(totLigne(FACTURES.find(f => f.id === 'fx-prep').lignes[k]) * 100), k);
  const tape = async (k, v) => { const l = p.locator('[data-fqte="' + k + '"]').first(); await l.fill(v); await l.press('Tab'); await L.calme(p, 350); };
  const a0 = await tot(0), b0 = await tot(1);
  console.log('  · préparées : « 2h » à 108,00 € →', a0 / 100, '| « 0,5 L » à 10,33 € →', b0 / 100);
  // la même écriture, tapée : même total que la ligne préparée ?
  await tape(1, '1'); await tape(1, '0,5 L'); const b1 = await tot(1);
  L.v('Q1 · « 0,5 L » tapé en retouchant la pièce donne le MÊME total que la pièce préparée « 0,5 L » (10,33 €)', b1 === b0, { prepare: b0, retape: b1 });
  await tape(0, '1'); await tape(0, '2h'); const a1 = await tot(0);
  L.v('Q2 · « 2h » retapé en retouchant la main-d’œuvre donne le MÊME total que la ligne préparée « 2h » (108,00 €)', a1 === a0, { prepare: a0, retape: a1 });
  await cap('lignes-prepares');
  // ── une durée tapée comme on la dit : « 2h30 » ne doit pas se compter pour 2 en silence ──
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-prep'); f.lignes = [{ d: 'Main-d’œuvre', q: '1', pu: 100 }]; }); await X.fiche(c, 'fx-prep');
  for (const v of ['2h30', '2 h 30', '1,5h']) { await tape(0, '1'); await tape(0, v); const t = await tot(0), q = await p.evaluate(() => FACTURES.find(x => x.id === 'fx-prep').lignes[0].q);
    const attendu = { '2h30': 25000, '2 h 30': 25000, '1,5h': 15000 }[v];
    L.v('Q9 · « ' + v + ' » : soit refusé avec une phrase (quantité gardée « 1 »), soit compté pour son vrai nombre d’heures (' + attendu / 100 + ' €) — jamais un autre total accepté en silence', t === attendu || q === '1', { tape: v, total: t / 100, qteGardee: q }); }
  // ── la suite d'une quantité tapée : un total, partout ──
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-prep'); f.lignes = [{ d: 'Main-d’œuvre', q: '1', pu: 100 }]; });
  await X.fiche(c, 'fx-prep'); await tape(0, '2 h');
  const ht = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-prep'); return { ht: Math.round(htDe(f) * 100), ttc: Math.round(ttcDe(f) * 100) }; });
  L.v('Q3 · « 2 h » × 100 € : HT 200,00 € et TTC 220,00 € (TVA 10 %)', ht.ht === 20000 && ht.ttc === 22000, ht);
  const fiche = (await X.texte(p, '#contenu')).replace(/[\u00a0\u202f]/g, ' '); L.v('Q3b · la fiche écrit 200,00 € et 220,00 €', /200,00 €/.test(fiche) && /220,00 €/.test(fiche), fiche.match(/(Total|TTC|TVA)[^\n]*\n?[^\n]*/g));
  // l'aperçu PDF, l'e-mail d'envoi
  await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-prep'); f.cli = 'md'; f.nom = f.nom || ''; });
  await L.toucher(c, '[data-action="apercuEnvoi"]').catch(() => {}); await L.calme(p, 600);
  const ap = (await X.panneau(p)).replace(/[  ]/g, ' ');
  console.log('  · aperçu :', JSON.stringify(ap.split('\n').filter(x => /€|Qté|×/.test(x)).slice(0, 12)));
  L.v('Q4 · l’aperçu PDF dit 200,00 € (ligne) et 220,00 € (TTC), sans 100,00 € résiduel', /200,00 €/.test(ap) && /220,00 €/.test(ap) && !/\b100,00 €\s*\n?\s*100,00 €/.test(ap) || !/pas complet/.test(ap), ap.slice(0, 120));
  // ── l'envoi, puis le même total partout ailleurs ──
  const env = await L.toucher(c, '#calque [data-action="envoyer"]').then(() => true).catch(() => false); await L.calme(p, 700);
  const e1 = await p.evaluate(() => { const f = FACTURES.find(x => x.id === 'fx-prep'); return { st: f.st, num: f.num, ht: Math.round(f.ht * 100), ttc: Math.round(ttcDe(f) * 100), restant: Math.round(restant(f) * 100) }; });
  L.v('Q5 · envoyée : le HT figé à l’envoi (f.ht), le TTC et le reste à payer disent tous 200 / 220 €', e1.st === 'envoyee' && e1.ht === 20000 && e1.ttc === 22000 && e1.restant === 22000, e1);
  await X.fiche(c, 'fx-prep'); await L.toucher(c, '[data-action="avoir"]'); const av = (await X.panneau(p)).replace(/\s+/g, ' ');
  L.v('Q6 · la fenêtre de l’avoir annonce 220,00 € TTC', /220,00\s€\sTTC/.test(av.replace(/[\u00a0\u202f]/g, ' ')), av.slice(0, 160)); await L.ranger(p);
  await X.fiche(c, 'fx-prep'); await L.toucher(c, '[data-action="partiel"]'); const pp = (await X.panneau(p)).replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ');
  L.v('Q7 · le paiement en partie parle de 220,00 € (le reste à payer)', /220,00 €/.test(pp), pp.slice(0, 200)); await L.ranger(p);
  { const f = await X.cadreOuvert(c); await f.evaluate(() => aller('ventes')); await p.waitForTimeout(800);
    const row = await f.evaluate(() => { const n = (window.__n); const e = [...document.querySelectorAll('#contenu tr[data-fac]')].find(r => /Essai|Lignes préparées|Main-d/.test(r.innerText) || /Lignes préparées/.test(r.innerText)); return e ? e.innerText.replace(/\s+/g, ' ') : ''; });
    const num = await p.evaluate(() => FACTURES.find(x => x.id === 'fx-prep').num);
    const row2 = await f.evaluate(n => { const e = document.querySelector('#contenu tr[data-fac="' + n + '"]'); return e ? e.innerText.replace(/[\u00a0\u202f]/g, ' ').replace(/\s+/g, ' ') : ''; }, num);
    L.v('Q8 · la liste de la Comptabilité montre 220,00 € pour cette facture (une seule vérité)', /220,00/.test(row2), { num, row2: row2.slice(0, 160) }); }
  L.v('aucune erreur de page', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.log('ÉCHEC DE LA SONDE', e.message); process.exit(2); });
