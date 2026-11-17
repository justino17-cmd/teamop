// achats-01 (« chercher les autres champs du même genre ») : les champs qui étaient de type « number » (la virgule décimale s'avalait :
// « 2 500,50 » devenait 250050). On joue les deux de la Comptabilité (seuil du compte, montant du « Et si… ») et la quantité de pièces d'une tâche.
// Usage : node achats-champs-virgule.js [profil=mac]
const X = require('./compta-reste-outils.js'), L = X.L, v = L.v, { CAP } = require('./achats-outils.js');
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  // ── Tâches : la quantité d'une pièce à commander
  await L.aller(p, 'taches'); await p.evaluate(() => tPanneau()); await L.calme(p, 300);
  const q = await p.evaluate(() => { const e = document.querySelector('.tp-q'); return e ? { type: e.type, mode: e.inputMode, val: e.value } : null; });
  v('T1 la quantité d’une pièce (Tâches) n’est plus un champ numérique', !!q && q.type === 'text' && q.mode === 'decimal', q);
  const lec = await p.evaluate(() => ['', '2', '1,5', '1.5', 'abc', '-2', '0', '12,5,6'].map(t => [t, tpQte(t)]));
  v('T2 tpQte : vide = 1, « 1,5 » = 1,5, « 1.5 » = 1,5, illisible/négatif/nul = refusé (NaN)', JSON.stringify(lec.map(x => Number.isNaN(x[1]) ? 'NaN' : x[1])) === JSON.stringify([1, 2, 1.5, 1.5, 'NaN', 'NaN', 'NaN', 'NaN']), lec);
  await p.evaluate(() => { document.getElementById('tk-t').value = 'Commander des filtres'; });
  await p.evaluate(() => { document.querySelector('.tp-nom').value = 'Filtre G4'; document.querySelector('.tp-q').value = 'douze'; });
  const nT = await p.evaluate(() => TACHES.length);
  await p.evaluate(() => document.querySelector('[data-tok]').click()); await L.calme(p, 300);
  const t1 = await p.evaluate(() => [TACHES.length, (document.getElementById('toast') || {}).textContent]);
  v('T3 une quantité illisible (« douze ») est refusée avec une phrase, rien n’est créé', t1[0] === nT && /Écris la quantité de pièces en chiffres/.test(t1[1] || ''), t1);
  await p.evaluate(() => { document.querySelector('.tp-q').value = '1,5'; document.querySelector('[data-tok]').click(); }); await L.calme(p, 400);
  const t2 = await p.evaluate(() => { const x = TACHES.find(o => o.t === 'Commander des filtres'); return x && x.pieces ? x.pieces[0].q : null; });
  v('T4 « 1,5 » est enregistré 1,5 (et non 15)', t2 === 1.5, t2);
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} });
  // ── Comptabilité : prévisions
  const f = await X.cadreCompta(c); v('C0 le cadre Comptabilité est ouvert', !!f);
  await f.evaluate(() => aller('previsions')); await p.waitForTimeout(900);
  const s0 = await f.evaluate(() => { const e = document.getElementById('cmpt-seuil-val'); return e ? { type: e.type, mode: e.inputMode, val: e.value } : null; });
  v('C1 le seuil du compte n’est plus un champ numérique', !!s0 && s0.type === 'text' && s0.mode === 'decimal', s0);
  for (const [saisie, attendu] of [['2 500,50', 2500.5], ['5000', 5000], ['1.234,56', 1234.56], ['0', 0]]) {
    await f.fill('#cmpt-seuil-val', saisie); await f.press('#cmpt-seuil-val', 'Tab'); await p.waitForTimeout(500);
    v('C2 seuil « ' + saisie + ' » se lit ' + attendu, (await f.evaluate(() => CMPT.seuil)) === attendu, await f.evaluate(() => CMPT.seuil));
  }
  await f.fill('#cmpt-seuil-val', '3 000'); await f.press('#cmpt-seuil-val', 'Tab'); await p.waitForTimeout(400);
  await f.fill('#cmpt-seuil-val', 'beaucoup'); await f.press('#cmpt-seuil-val', 'Tab'); await p.waitForTimeout(500);
  const r = await f.evaluate(() => [CMPT.seuil, (document.getElementById('toast') || {}).textContent, document.getElementById('cmpt-seuil-val').value]);
  v('C3 un seuil illisible est refusé avec une phrase, l’ancien seuil reste (3 000)', r[0] === 3000 && /en chiffres/.test(r[1] || ''), r);
  await f.evaluate(() => document.querySelector('[data-cmpt="sim"]').click()); await p.waitForTimeout(500);
  const m0 = await f.evaluate(() => { const e = document.getElementById('cmpt-sim-m'); return e ? { type: e.type, val: e.value } : null; });
  v('C4 le montant du « Et si… » n’est plus un champ numérique', !!m0 && m0.type === 'text', m0);
  await f.evaluate(() => { const t = document.getElementById('cmpt-sim-t'); t.value = 'depense'; t.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('cmpt-sim-d').value = ajoute(AUJ, 9); });
  await f.fill('#cmpt-sim-m', '2 500,50'); await f.evaluate(() => cmptSimOk()); await p.waitForTimeout(500);
  const sm = await f.evaluate(() => CMPT.sim && CMPT.sim.m);
  v('C5 « 2 500,50 » dans « Et si… » se lit 2500,5 (et non 250050)', sm === 2500.5, sm);
  await L.capture(c, CAP + 'champs-virgule-compta-' + profil + '.png');
  const err = c.err.filter(x => !/ERR_/.test(x)); v('aucune erreur JavaScript', err.length === 0, err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.error(e); try { await L.fermer(); } catch (x) {} process.exit(2); });
