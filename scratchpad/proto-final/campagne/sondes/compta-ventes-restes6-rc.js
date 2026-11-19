// Recontrôle adverse des restes compta-ventes, tour 6 : ce que les quatre corrections (acompte verrouillé, unités refusées, commande arrondie, « forfait » hors durée)
// ont pu casser à côté. (A) saisies de quantité tordues (« 2. », « 2h60 », « １ »…) : un refus dit une phrase lisible et garde l'ancienne valeur ; (B) l'acompte fabriqué par
// la VRAIE porte (devis → factureDepuis) porte son drapeau ; (C) la commande à trois décimales : la Boîte mail (facture fournisseur lue) dit le même total que la commande ;
// (D) un prix de la commande retapé reste lisible aussi sur téléphone. Usage : node compta-ventes-restes6-rc.js [profil] [nuit]
const X = require('./compta-ventes-outils.js'), L = X.L;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit';
  const c = await L.ouvrir({ profil, nuit, qui: 'marc' }), p = c.p;
  await p.evaluate(() => { const i = INTS.find(o => o.cli && o.st !== 'annulee' && !o.fact) || INTS[0], F = fiche(i.id);
    FACTURES.filter(f => f.int === i.id).forEach(f => { f.id = 'old-' + f.id; }); i.fact = { mode: 'temps', tva: 10 }; F.debut = '08:00'; F.fin = '09:50';
    F.pieces = [{ nom: 'Nettoyant échangeur', q: '0,5 L', pu: 10.33 }]; factureDepuis(i); FACTURES.find(f => f.id === 'f-' + i.id).id = 'fx-rc6';
    const f = FACTURES.find(x => x.id === 'fx-rc6'); f.lignes = lignesDe(f);
    f.lignes.push({ d: 'Déplacement', q: '1', pu: 65 }); f.lignes.push({ d: 'Pièce libre', q: '1', pu: 20 }); rendre(); });
  await X.fiche(c, 'fx-rc6');
  const lg = () => p.evaluate(() => lignesDe(FACTURES.find(x => x.id === 'fx-rc6')).map(l => ({ d: l.d, q: l.q, pu: l.pu, total: totLigne(l) })));
  const attendre = () => p.waitForFunction(() => { const t = document.getElementById('toast'); return !t || t.hidden || !t.textContent.trim(); }, null, { timeout: 6000 }).catch(() => {});
  const ch = async (a, k, v) => { await attendre(); const e = p.locator('[data-' + a + '="' + k + '"]').first(); await e.fill(v); await e.press('Tab'); await L.calme(p, 350); return { t: await X.toasts(p), champ: await p.locator('[data-' + a + '="' + k + '"]').first().inputValue().catch(() => null) }; };
  const L0 = await lg(); const kP = L0.findIndex(l => /Nettoyant/.test(l.d)), kD = L0.findIndex(l => l.d === 'Déplacement'), kL = L0.findIndex(l => l.d === 'Pièce libre');
  L.v('population : pièce, déplacement et pièce libre présents', kP >= 0 && kD >= 0 && kL >= 0 && L0.length >= 5, JSON.stringify(L0.map(l => l.d)));
  // A. saisies tordues sur le déplacement : refus, phrase lisible, ancienne valeur dans le champ et dans la ligne
  const refus = ['2h60', '2 x', '１', '1e3', '-2', '0', '2 kg', '3 forfait', '12abc', '2/3', '2 + 1', '٣'];
  for (const v of refus) { const r = await ch('fqte', kD, v), l = (await lg())[kD];
    L.v('« ' + v + ' » sur le déplacement : refusé ou sans effet, quantité « 1 », total 65 €, champ revenu à « 1 » (toast : ' + r.t.slice(0, 90) + ')', l.q === '1' && l.total === 65 && r.champ === '1', l.q + ' · ' + l.total + ' · champ=' + r.champ + ' · ' + r.t);
    L.v('« ' + v + ' » : la phrase du refus ne cite pas une unité vide ou une ponctuation (« . », « , », « »)', !/« *[.,;:!?  ]* »/.test(r.t) && r.t.length > 20, r.t); }
  // le champ vidé
  { const r = await ch('fqte', kD, ''), l = (await lg())[kD]; L.v('quantité effacée : « 1 » gardé, phrase lisible', l.q === '1' && l.total === 65 && r.t.length > 20, l.q + ' · ' + r.t); }
  // B. acceptations limites : ce qu'on accepte doit multiplier comme on le dit
  const accepte = [['2', 'déplacement', kD, 130], ['2.', 'déplacement', kD, 130], ['2,', 'déplacement', kD, 130], ['2 ,', 'déplacement', kD, 130], ['2 u', 'déplacement', kD, 130], ['2 pcs', 'déplacement', kD, 130], ['2pièces', 'déplacement', kD, 130], ['1 000 u', 'pièce libre', kL, 20000], ['1,5', 'pièce libre', kL, 30]];
  for (const [v, nom, k, att] of accepte) { const r = await ch('fqte', k, v), l = (await lg())[k]; L.v('« ' + v + ' » sur la ' + nom + ' : lu, total ' + att + ' €', Math.abs(l.total - att) < .006, l.q + ' · ' + l.total + ' · ' + r.t); await ch('fqte', k, '1'); }
  // une durée en heures tapée sur une ligne qui n'est PAS à l'heure : doute à noter, pas un verdict — on mesure ce que ça fait
  for (const v of ['2 h', '1,5 h', '2h30']) { const r = await ch('fqte', kL, v), l = (await lg())[kL]; console.log('  · DOUTE « ' + v + ' » sur une pièce libre à 20 € : q=' + l.q + ' total=' + l.total + ' toast=« ' + r.t + ' »'); await ch('fqte', kL, '1'); }
  // C. acompte fabriqué par la vraie porte
  const a = await p.evaluate(() => { const dv = Object.values(DEVIS).find(d => d && d.acompte && d.facAcompte); return dv ? { dv: true, num: dv.num, acompte: dv.acompte, facAcompte: dv.facAcompte } : { dv: false }; });
  console.log('  · devis avec acompte facturé :', JSON.stringify(a));
  const src = await p.evaluate(() => String(factureDepuis));
  L.v('la porte qui écrit la ligne d’acompte pose le drapeau (code de factureDepuis)', /acompte\s*:\s*true/.test(src), src.slice(0, 80));
  // D. la Boîte mail : facture fournisseur lue d'une commande à 3 décimales = même total que la commande
  const m = await p.evaluate(() => { const lignes = [{ pid: 'x1', q: 3, pu: 12.345, recu: 3 }, { pid: 'x2', q: 3, pu: 12.345, recu: 3 }];
    const cm = { lignes, facLue: { num: 'FA-TEST', pu: { x1: 12.345, x2: 12.345 }, q: { x1: 3, x2: 3 } } };
    const T = mbxFacLue(cm); return { ht: T.ht, att: T.att, conforme: Math.abs(T.ht - T.att) < .01 }; });
  L.v('commande à 3 décimales : la facture lue (mêmes quantités, mêmes prix) est « conforme » au total de la commande, pas « écart de 0,01 € »', m.conforme, JSON.stringify(m));
  // E. la commande retapée : un prix à 3 décimales tapé dans l'éditeur se relit identique
  await p.evaluate(() => { cmdEdOuvrir(); CMD_ED.lignes = [{ nom: 'Filtre test', ref: 'T-1', q: 3, pu: 12.345 }]; cmdEdVue(); }); await L.calme(p, 600);
  const e1 = p.locator('[data-cedl$="|pu"]').first(); await e1.fill('12,3456'); await e1.press('Tab'); await L.calme(p, 400);
  const e2 = await p.evaluate(() => ({ pu: document.querySelector('[data-cedl$="|pu"]').value, st: CMD_ED.lignes[0].pu, tot: (document.querySelector('.fx-et') || {}).textContent, deb: document.documentElement.scrollWidth > innerWidth + 1 }));
  console.log('  · « 12,3456 » retapé :', JSON.stringify(e2));
  L.v('prix à 4 décimales retapé : ni NaN ni « undefined », pas de débordement', !/NaN|undefined/.test(e2.pu + e2.tot) && !e2.deb, JSON.stringify(e2));
  await L.capture(c, '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/r6rc/rc-commande-' + profil + (nuit ? '-nuit' : '') + '.png');
  await L.fermer(c); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
