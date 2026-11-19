// Parcours D (technicienne Sophie, iPhone, au doigt) : Mes tâches — ce qu'elle voit, crée, termine ; ce que Marc lui confie arrive.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const liste = p => p.evaluate(() => [...document.querySelectorAll('#contenu [data-tmodif]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()));
(async () => {
  const profil = process.argv[2] || 'iphone';
  const c = await L.ouvrir({ profil, qui: 'sm', hash: 'taches' }); const p = c.p; await L.calme(p, 500);
  const base = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, intro: (document.querySelector('.tkx-intro') || {}).textContent, resume: (document.querySelector('.tkx-resume') || {}).textContent, onglets: [...document.querySelectorAll('[data-tonglet]')].map(b => b.textContent.replace(/\s+/g, ' ').trim()), qui: !!document.querySelector('[data-tqui]'), rang: !!document.querySelector('[data-tkxrang]'), sugg: !!document.querySelector('[data-tsuggs]'), pdf: !!document.querySelector('[data-texport]'), plus: !!document.querySelector('[data-tkxplus]'), me: ROLE }));
  console.log('base :', JSON.stringify(base)); await L.capture(c, O.CAP + `D0-sm-${profil}.png`, true);
  v('D0 : l’écran s’appelle « Mes tâches »', base.h1 === 'Mes tâches', base.h1);
  const l0 = await liste(p); console.log('lignes :', JSON.stringify(l0));
  v('D0 : elle ne voit QUE ses tâches (aucune de Julie ni Marc)', await p.evaluate(() => [...document.querySelectorAll('#contenu .t-l')].length > 0 && TACHES.filter(x => x.qui !== 'sm').every(x => ![...document.querySelectorAll('#contenu [data-tmodif]')].some(e => e.dataset.tmodif === x.id))));
  v('D0 : pas de choix « de qui », pas de propositions de l’entreprise', !base.qui && !base.sugg, base);
  // la fiche de sa tâche : liens permis seulement
  await p.evaluate(() => tDetail('t11')); await L.calme(p, 400); await L.capture(c, O.CAP + `D1-fiche-t11-${profil}.png`);
  const fiche = await p.evaluate(() => ({ btns: [...document.querySelectorAll('#calque .panneau button, #calque .panneau a')].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 40)), txt: document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' ').slice(0, 500) }));
  console.log('fiche t11 :', JSON.stringify(fiche));
  v('D1 : pas de « Confier à » pour une technicienne', await p.evaluate(() => !document.querySelector('#calque [data-tconfier]')));
  v('D1 : pas de montant de facture ni de lien Facture dans sa fiche', !/FAC-|€/.test(fiche.txt) && !fiche.btns.some(b => /facture/i.test(b)), fiche.txt);
  // créer par la phrase (doigt)
  await p.evaluate(() => { try { fermerPanneau(); } catch (e) {} }); await L.calme(p, 300);
  await p.fill('[data-tajout]', 'Racheter des cosses demain 8h'); await L.calme(p, 300);
  await p.keyboard.press('Enter'); await L.calme(p, 500);
  const cr = await p.evaluate(() => ({ dem: jour(1), x: TACHES[TACHES.length - 1], toast: (document.getElementById('toast') || {}).textContent }));
  v('D2 : la tâche créée est à elle (pas à Marc), demain 08:00', cr.x.qui === 'sm' && cr.x.h === '08:00' && cr.x.d === cr.dem, cr.x);
  console.log('toast création :', cr.toast);
  v('D2 : le toast ne parle pas de « Marc » ni de « la voit »', !/Marc|la voit/.test(cr.toast || ''), cr.toast);
  // terminer sa tâche : bouton rond / fiche
  await p.evaluate(() => tDetail('t11')); await L.calme(p, 300);
  await L.toucher(c, '#calque .panneau [data-tfait]'); await L.calme(p, 500);
  v('D3 : elle termine sa tâche', await p.evaluate(() => !!TACHES.find(x => x.id === 't11').fait));
  const post = await p.evaluate(() => ({ h: JOURNAL[JOURNAL.length - 1], resume: (document.querySelector('.tkx-resume') || {}).textContent }));
  v('D3 : l’historique garde le nom de Sophie, pas « Marc »', post.h && post.h.qui === 'sm', post.h);
  // la barre du bas : l'onglet Tâches de son menu
  const bar = await p.evaluate(() => [...document.querySelectorAll('#tabbar a, #tabbar button, .barre-bas a, .barre-bas button, [role=tablist] [role=tab]')].map(e => (e.getAttribute('aria-label') || e.textContent || '').replace(/\s+/g, ' ').trim()).filter(Boolean));
  console.log('barre du bas :', JSON.stringify(bar));
  // Marc lui confie une tâche : elle l'a dans « Mes tâches » avec l'avis
  await p.evaluate(() => { sessionOuvrir('marc'); }); await L.calme(p, 700); await L.aller(p, 'taches'); await L.calme(p, 400);
  await p.fill('[data-tajout]', 'Passer prendre le fluide R32 pour Sophie demain'); await L.calme(p, 300); await p.keyboard.press('Enter'); await L.calme(p, 400);
  const mx = await p.evaluate(() => TACHES[TACHES.length - 1]); console.log('tâche confiée :', JSON.stringify(mx));
  v('D4 : « pour Sophie » : la tâche est à Sophie', mx.qui === 'sm', mx);
  await p.evaluate(() => { sessionOuvrir('sm'); }); await L.calme(p, 700); await L.aller(p, 'taches'); await L.calme(p, 400);
  const avis = await p.evaluate(() => ({ av: (document.querySelector('.tkx-avis, [class*=avis]') || {}).textContent, lignes: [...document.querySelectorAll('#contenu [data-tmodif]')].map(e => e.textContent.replace(/\s+/g, ' ').trim().slice(0, 80)) }));
  console.log('côté Sophie :', JSON.stringify(avis)); await L.capture(c, O.CAP + `D4-sophie-recoit-${profil}.png`, true);
  v('D4 : Sophie la retrouve (dans « Aujourd’hui » ou « À venir »)', await p.evaluate(() => { const id = TACHES[TACHES.length - 1].id; return !!document.querySelector(`[data-tmodif="${id}"]`); }) || avis.lignes.some(t => /fluide R32/.test(t)), avis);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
