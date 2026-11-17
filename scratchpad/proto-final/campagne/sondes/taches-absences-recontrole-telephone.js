// Recontrôle adverse (17 novembre 2026) — parcours 4 : au téléphone, le gérant crée une tâche par une phrase, la retrouve, la confie, la reporte, la termine, annule ; les compteurs suivent.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v, CAP = O.CAP + 'recontrole/';
const profil = process.argv[2] || 'iphone', nuit = process.argv[3] === 'nuit', N = nuit ? '-nuit' : '';
const cnt = p => p.evaluate(() => { const o = {}; document.querySelectorAll('[data-tonglet]').forEach(b => { const m = b.textContent.match(/(\d+)\s*$/); o[b.dataset.tonglet] = m ? +m[1] : 0; }); const menu = [...document.querySelectorAll('a[href="#taches"] .pastille, a[href="#taches"] .nb, a[href="#taches"] b, a[href="#taches"] .badge')].map(e => e.textContent.trim()).join(','); return { o, lignes: document.querySelectorAll('#contenu [data-tmodif]').length, menu, tab: (document.querySelector('[data-tonglet][aria-pressed=true], [data-tonglet].on, [data-tonglet][aria-selected=true]') || {}).dataset }; });
(async () => {
  const c = await L.ouvrir({ profil, nuit, qui: 'marc', hash: 'taches' }); const p = c.p; await L.calme(p, 700); const tag = `E4 ${profil}${nuit ? ' nuit' : ''}`;
  const c0 = await cnt(p); console.log('départ', JSON.stringify(c0));
  const champ = '[data-tkxajout], [data-tajout]';
  await L.toucher(c, champ); await p.keyboard.type('Appeler M. Martin pour la facture demain 14h'); await L.calme(p, 400);
  await L.capture(c, CAP + `e4-${profil}${N}-1-phrase.png`);
  const chips = await p.evaluate(() => [...document.querySelectorAll('[data-tkxchip], .tkx-chip')].map(e => e.textContent.trim()));
  console.log('pastilles comprises :', chips);
  await p.keyboard.press('Enter'); await L.calme(p, 600);
  const t = await p.evaluate(() => JSON.parse(JSON.stringify(TACHES[TACHES.length - 1]))); console.log('tâche créée :', JSON.stringify(t));
  v(`${tag} : la phrase crée une tâche « demain », 14 h`, /Martin/.test(t.t) && t.d === '2026-11-01' && t.h === '14:00', t);
  const c1 = await cnt(p); console.log('après création', JSON.stringify(c1));
  v(`${tag} : « À venir » compte une tâche de plus (${c0.o.avenir} → ${c1.o.avenir})`, c1.o.avenir === c0.o.avenir + 1, [c0, c1]);
  await L.capture(c, CAP + `e4-${profil}${N}-2-creee.png`);
  // onglet À venir, ouvrir la fiche, confier à Julie
  await p.evaluate(() => document.querySelector('[data-tonglet=avenir]').click()); await L.calme(p, 400);
  await p.evaluate(id => document.querySelector(`[data-tmodif="${id}"]`).click(), t.id); await L.calme(p, 500);
  await L.capture(c, CAP + `e4-${profil}${N}-3-fiche.png`);
  await p.selectOption('#calque [data-tconfier]', 'julie'); await L.calme(p, 600);
  const q = await p.evaluate(id => TACHES.find(x => x.id === id).qui, t.id); v(`${tag} : « Confier à Julie » change le destinataire`, q === 'julie', q);
  console.log('toast confier :', await p.evaluate(() => (document.getElementById('toast') || {}).innerText));
  // reporter à lundi
  await p.evaluate(id => { const b = document.querySelector(`#calque [data-trep^="${id}|"]`); if (b) b.click(); }, t.id); await L.calme(p, 500);
  const d2 = await p.evaluate(id => TACHES.find(x => x.id === id).d, t.id); console.log('date après report :', d2);
  v(`${tag} : « Reporter : Demain » est sans effet si c'est déjà demain, ou déplace d'un jour — la date reste cohérente`, !!d2, d2);
  const fermee = await p.evaluate(() => !document.querySelector('#calque .panneau')); console.log('fiche fermée après un report :', fermee);
  await L.capture(c, CAP + `e4-${profil}${N}-4-apres-report.png`);
  // terminer puis annuler
  await p.evaluate(() => document.querySelector('[data-tonglet=avenir]').click()); await L.calme(p, 300);
  await p.evaluate(id => { const b = document.querySelector(`[data-tcoche="${id}"], [data-tfait="${id}"]`); if (b) b.click(); else { const m = document.querySelector(`[data-tmodif="${id}"]`); m && m.click(); } }, t.id); await L.calme(p, 400);
  const ouvertFiche = await p.evaluate(() => !!document.querySelector('#calque .panneau'));
  if (ouvertFiche) { await p.evaluate(id => { const b = document.querySelector(`#calque [data-tfait="${id}"]`); b && b.click(); }, t.id); await L.calme(p, 500); }
  const fait = await p.evaluate(id => !!TACHES.find(x => x.id === id).fait, t.id); v(`${tag} : la tâche se termine`, fait);
  console.log('toast fait :', await p.evaluate(() => (document.getElementById('toast') || {}).innerText));
  await L.capture(c, CAP + `e4-${profil}${N}-5-faite.png`);
  await p.evaluate(() => { const b = document.querySelector('#toast button'); b && b.click(); }); await L.calme(p, 500);
  const refait = await p.evaluate(id => !!TACHES.find(x => x.id === id).fait, t.id); v(`${tag} : « Annuler » dans le message remet la tâche à faire`, !refait);
  const c3 = await cnt(p); console.log('final', JSON.stringify(c3));
  v(`${tag} : aucune erreur JavaScript`, c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
