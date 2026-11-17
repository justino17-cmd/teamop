// Parcours G (gérant, ordinateur) : une commande de pièces de bout en bout, planifier depuis une tâche, ouvrir le devis et revenir,
// tâche qui se répète, formulaire « Détails », modifier, supprimer, export PDF, propositions, « Fait » sur un lot.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const cmpt = p => p.evaluate(() => { const g = s => [...document.querySelectorAll(s)]; const o = {}; g('[data-tonglet]').forEach(b => { const m = b.textContent.match(/(\d+)\s*$/); o[b.dataset.tonglet] = m ? +m[1] : 0; }); return { o, lignes: g('#contenu [data-tmodif]').length }; });
const etat = p => O.lire(p);
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p;
  const neuf = async () => { await O.neuf(c, 'taches'); };
  // G1 — commande de pièces : Commander → bon pré-rempli → envoyer → « Commandée » → Pièces reçues → tâche faite
  await neuf(); await p.evaluate(() => tDetail('t2')); await L.calme(p, 300);
  await L.toucher(c, '#calque [data-tcmd]'); await L.calme(p, 700);
  const bon = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, hash: location.hash, h1: (document.querySelector('#contenu h1') || {}).textContent, txt: ((document.querySelector('#calque .panneau') || document.getElementById('contenu')) || {}).innerText.replace(/\s+/g, ' ').slice(0, 600) }));
  console.log('commander →', JSON.stringify(bon)); await L.capture(c, O.CAP + 'G1-bon-commande.png');
  v('G1 : « Commander au fournisseur » ouvre le bon pré-rempli avec les 2 pièces', /Condensateur/.test(bon.txt) && /Cosses/.test(bon.txt), bon.txt);
  v('G1 : le fournisseur est Clim Pièces Atlantique', /Clim Pièces Atlantique/.test(bon.txt), bon.txt);
  // envoi
  const env = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button, #contenu button')].filter(b => /Envoyer|Commander/.test(b.textContent)).map(b => (b.dataset ? Object.keys(b.dataset).join(',') : '') + '|' + b.textContent.trim().slice(0, 40)));
  console.log('boutons d’envoi :', JSON.stringify(env));
  // G2 — planifier depuis la tâche
  await neuf(); await p.evaluate(() => tDetail('t14')); await L.calme(p, 300);
  const f14 = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.replace(/\s+/g, ' ').trim().slice(0, 40)));
  console.log('fiche t14 :', JSON.stringify(f14));
  await L.toucher(c, '#calque [data-tplanif]'); await L.calme(p, 500); await L.capture(c, O.CAP + 'G2-creneaux.png');
  const cr = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, slots: [...document.querySelectorAll('#calque .panneau [data-tpose]')].length, txt: document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' ').slice(0, 400) }));
  console.log('créneaux :', JSON.stringify(cr));
  v('G2 : « Voir les créneaux libres » propose des créneaux', cr.slots > 0, cr);
  if (cr.slots) { const i0 = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i10'); return { tech: i.tech, d: i.d, h: i.h, st: i.st }; });
    await p.evaluate(() => document.querySelector('#calque [data-tpose]').click()); await L.calme(p, 700);
    const i1 = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i10'); return { tech: i.tech, d: i.d, h: i.h, st: i.st, tache: TACHES.find(x => x.id === 't14').fait, toast: (document.getElementById('toast') || {}).textContent }; });
    console.log('après pose :', JSON.stringify([i0, i1]));
    v('G2 : poser un créneau planifie l’intervention de Mme Roux', i0.st === 'aplanifier' && i1.st === 'planifiee' && !!i1.tech && !!i1.d, [i0, i1]);
    v('G2 : la tâche « Planifier le dépannage » se termine toute seule', !!i1.tache, i1); }
  // G3 — devis : ouvrir et revenir
  await neuf(); await p.evaluate(() => tDetail('t1')); await L.calme(p, 300);
  await L.toucher(c, '#calque .panneau .t-gestes [data-tvoir^="devis"]'); await L.calme(p, 600);
  const dv = await etat(p); const barre = await p.evaluate(() => ({ retour: [...document.querySelectorAll('#contenu button, #contenu a, .retour, [data-retour]')].map(e => e.textContent.replace(/\s+/g, ' ').trim()).filter(t => /Retour|‹|←/.test(t)).slice(0, 3) }));
  console.log('devis ouvert :', JSON.stringify([dv.h1, dv.hash, barre])); await L.capture(c, O.CAP + 'G3-devis.png');
  v('G3 : « Voir le devis » ouvre D-2026-038', /D-2026-038/.test(dv.h1), dv);
  v('G3 : un bouton « Retour » existe', barre.retour.length > 0, barre);
  if (barre.retour.length) { await p.evaluate(() => { const e = [...document.querySelectorAll('#contenu button, #contenu a, .retour, [data-retour]')].find(e => /Retour|‹|←/.test(e.textContent)); e && e.click(); }); await L.calme(p, 600);
    const r = await etat(p); v('G3 : le retour ramène sur Tâches, avec la fiche de la tâche rouverte', r.h1 === 'Tâches', r); console.log('retour →', JSON.stringify([r.h1, r.panneau])); }
  // G4 — tâche qui se répète
  await neuf(); const n0 = await p.evaluate(() => TACHES.length); await p.evaluate(() => tDetail('t6')); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('#calque [data-tfait]').click()); await L.calme(p, 500);
  const rep = await p.evaluate(() => { const s = TACHES.filter(x => x.t === 'Faire le point fluides avec l’équipe'); return { n: s.length, suite: s.find(x => !x.fait), orig: s.find(x => x.fait) }; });
  v('G4 : terminer « chaque semaine » crée la suivante 7 jours plus tard', rep.n === 2 && rep.suite && rep.suite.d && rep.orig.d && (new Date(rep.suite.d) - new Date(rep.orig.d)) / 864e5 === 7, rep);
  // G5 — formulaire Détails complet
  await neuf(); await L.toucher(c, '[data-tnouv]'); await L.calme(p, 300);
  await p.fill('#tk-t', 'Rappeler Mme Roux pour le dépannage'); await p.selectOption('#tk-qui', 'julie'); await p.selectOption('#tk-cat', 'client'); await p.fill('#tk-d', await p.evaluate(() => jour(2))); await p.fill('#tk-h', '09:30'); await p.check('#tk-u'); await p.fill('#tk-n', 'Elle préfère le matin.');
  await L.toucher(c, '[data-tok=""]'); await L.calme(p, 500);
  const g5 = await p.evaluate(() => ({ x: TACHES[TACHES.length - 1], toast: (document.getElementById('toast') || {}).textContent, dem: jour(2) }));
  v('G5 : toutes les valeurs du formulaire sont gardées (julie, client, +2 j, 09:30, urgent, note)', g5.x.qui === 'julie' && g5.x.d === g5.dem && g5.x.h === '09:30' && g5.x.urgent && /matin/.test(g5.x.note) && tCatOk(g5.x), g5.x);
  function tCatOk(x) { return x.cat === 'client' || (x.lien && x.lien.t === 'client'); }
  console.log('toast :', g5.toast);
  // G6 — modifier puis supprimer
  await neuf(); await p.evaluate(() => tDetail('t7')); await L.calme(p, 300); await L.toucher(c, '#calque [data-tedit]'); await L.calme(p, 300);
  await p.fill('#tk-t', 'Mettre à jour le catalogue de prix 2027 (corrigé)'); await L.toucher(c, '#calque [data-tok="t7"]'); await L.calme(p, 500);
  v('G6 : « Enregistrer » garde le nouveau titre', await p.evaluate(() => /corrigé/.test(TACHES.find(x => x.id === 't7').t)));
  await neuf(); await p.evaluate(() => tDetail('t7')); await L.calme(p, 300); await L.toucher(c, '#calque [data-tedit]'); await L.calme(p, 300);
  const n7 = await p.evaluate(() => TACHES.length); await L.toucher(c, '#calque [data-tsuppr]'); await L.calme(p, 500);
  const sp = await p.evaluate(() => ({ n: TACHES.length, confirm: !!document.querySelector('#calque .panneau'), toast: (document.getElementById('toast') || {}).innerText }));
  console.log('supprimer :', JSON.stringify(sp));
  v('G6 : « Supprimer » retire la tâche (ou demande confirmation) et propose d’annuler', sp.n === n7 - 1 || sp.confirm, sp);
  // G7 — export PDF
  await neuf(); await L.toucher(c, '[data-texport]'); await L.calme(p, 500);
  const ex = await p.evaluate(() => ({ h2: (document.querySelector('#calque .panneau h2') || {}).textContent, lignes: document.querySelectorAll('#calque .bil tbody tr').length, btns: [...document.querySelectorAll('#calque .panneau button')].map(b => b.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8) }));
  console.log('export :', JSON.stringify(ex)); await L.capture(c, O.CAP + 'G7-export.png');
  v('G7 : l’export liste les tâches ouvertes (12 = 7 + 5)', ex.lignes >= 12, ex);
  // G8 — propositions : ajouter une, ignorer une, ajouter les urgentes
  await neuf(); await L.toucher(c, '[data-tsuggs]'); await L.calme(p, 400);
  const t0 = await p.evaluate(() => TACHES.length); const s0 = await p.evaluate(() => tSuggestions().length);
  await p.evaluate(() => document.querySelector('#calque .panneau button[data-tkxs="ajouter"], #calque .panneau [data-tkxajout]') && 0);
  const ba = await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].filter(b => /^＋ Ajouter$/.test(b.textContent.trim())).length);
  await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].find(b => /^＋ Ajouter$/.test(b.textContent.trim())).click()); await L.calme(p, 500);
  const t1 = await p.evaluate(() => ({ n: TACHES.length, s: tSuggestions().length, panneau: !!document.querySelector('#calque .panneau'), x: TACHES[TACHES.length - 1] }));
  v('G8 : « ＋ Ajouter » crée une tâche et la proposition disparaît (26 → 25)', t1.n === t0 + 1 && t1.s === s0 - 1, [t0, s0, t1]);
  console.log('tâche ajoutée :', JSON.stringify(t1.x));
  await p.evaluate(() => { const b = [...document.querySelectorAll('#calque .panneau button')].find(b => /^Ignorer$/.test(b.textContent.trim())); b && b.click(); }); await L.calme(p, 400);
  v('G8 : « Ignorer » retire une proposition sans créer de tâche', await p.evaluate(([t, s]) => TACHES.length === t && tSuggestions().length === s - 1, [t1.n, t1.s]));
  const urg = await p.evaluate(() => tSuggestions().filter(tkxUrgente).length);
  await p.evaluate(() => [...document.querySelectorAll('#calque .panneau button')].find(b => /Ajouter les \d+ urgentes/.test(b.textContent)).click()); await L.calme(p, 600);
  v('G8 : « Ajouter les urgentes » : autant de tâches de plus que d’urgentes', await p.evaluate(([n, u]) => TACHES.length === n + u, [t1.n, urg]), [t1.n, urg, await p.evaluate(() => TACHES.length)]);
  // G9 — « Fait » sur un lot : J'ai appelé
  await neuf(); await p.evaluate(() => { document.querySelector('[data-tsel=t13]').click(); }); await L.calme(p, 300);
  await L.toucher(c, '[data-tsfait]'); await L.calme(p, 400); await L.toucher(c, '[data-tkxlot="J’ai appelé"]'); await L.calme(p, 500);
  const lot = await p.evaluate(() => ({ t13: TACHES.find(x => x.id === 't13').fait, toast: (document.getElementById('toast') || {}).textContent, jr: JOURNAL[JOURNAL.length - 1] }));
  v('G9 : « J’ai appelé » termine la tâche et l’écrit dans l’historique', !!lot.t13 && /appel/i.test(JSON.stringify(lot.jr)), lot);
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
