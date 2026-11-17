// Parcours I : les gestes maladroits d'un vrai utilisateur dans « Tâches » et « Absences et congés » — double toucher sur chaque bouton
// qui crée ou décide, retour du navigateur, rechargement au milieu, secrétariat (Julie) devant les absences.
// Chaque contrôle compte d'abord ce qu'il compare (une population vide passerait au vert).
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'taches' }); const p = c.p; await L.calme(p, 600);
  const neuf = async h => { await O.neuf(c, h); };
  // I1 — double toucher sur « Créer la tâche » : UNE seule tâche
  await neuf('taches'); const n0 = await p.evaluate(() => TACHES.length);
  await L.toucher(c, '[data-tnouv]'); await L.calme(p, 300); await p.fill('#tk-t', 'Tâche du double toucher');
  await p.evaluate(() => { const b = document.querySelector('[data-tok=""]'); b.click(); b.click(); }); await L.calme(p, 500);
  const k1 = await p.evaluate(() => TACHES.filter(x => x.t === 'Tâche du double toucher').length);
  v('I1 : un double toucher sur « Créer la tâche » ne crée qu’UNE tâche (' + k1 + ' créée(s), population ' + n0 + ')', k1 === 1 && n0 > 5, k1);
  // I2 — double toucher sur « Valider » : une décision, une absence, un solde
  await neuf('absences'); const av = await p.evaluate(() => ({ abs: ABSENCES.length, dec: DECISIONS_ABS.length, s: aSolde('tl', 'RTT').reste }));
  await p.evaluate(() => { const b = document.querySelector('[data-aok=d2]'); b.click(); b.click(); }); await L.calme(p, 600);
  const ap = await p.evaluate(() => ({ abs: ABSENCES.length, dec: DECISIONS_ABS.length, s: aSolde('tl', 'RTT').reste }));
  v('I2 : un double toucher sur « Valider » ne pose qu’UNE absence et ne décompte qu’UN jour', ap.abs === av.abs + 1 && ap.dec === av.dec + 1 && av.s - ap.s === 1, [av, ap]);
  // I3 — double toucher sur « Enregistrer l'absence »
  await neuf('absences'); await p.evaluate(() => document.querySelector('[data-anouv]').click()); await L.calme(p, 300);
  await p.selectOption('#an-t', 'tl'); await p.selectOption('#an-ty', 'Congé payé'); await p.fill('#an-du', '2026-12-07'); await p.fill('#an-au', '2026-12-08'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 200);
  const a0 = await p.evaluate(() => ABSENCES.length);
  await p.evaluate(() => { const b = document.querySelector('[data-anouvok]'); b.click(); b.click(); }); await L.calme(p, 600);
  const a1 = await p.evaluate(() => ({ n: ABSENCES.length, tl: ABSENCES.filter(x => x.tech === 'tl' && x.du === '2026-12-07').length, err: 0 }));
  v('I3 : un double toucher sur « Enregistrer l’absence » ne pose qu’UNE absence', a1.n === a0 + 1 && a1.tl === 1 && a0 > 3, [a0, a1]);
  // I4 — « Refuser » : deux touchers sur le bouton rouge de la fenêtre ne créent qu'UNE décision
  await neuf('absences'); await p.evaluate(() => document.querySelector('[data-anon=d2]').click()); await L.calme(p, 300);
  const d0 = await p.evaluate(() => DECISIONS_ABS.length);
  await p.fill('#calque textarea', 'Trop de monde ce jour-là');
  await p.evaluate(() => { const b = document.querySelector('[data-anonok]'); b.click(); b.click(); }); await L.calme(p, 500);
  v('I4 : un double toucher sur « Refuser » ne crée qu’UNE décision', await p.evaluate(d => DECISIONS_ABS.length === d + 1, d0), d0);
  // I5 — le retour du navigateur : Tâches → Absences → retour = Tâches (on ne sort pas de l'application)
  await neuf('taches'); await p.evaluate(() => { aller('absences'); }); await L.calme(p, 500);
  await p.goBack(); await L.calme(p, 600);
  const h = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, hash: location.hash, url: location.pathname.slice(-30) }));
  v('I5 : le retour du navigateur ramène sur « Tâches », dans l’application', h.h1 === 'Tâches' && /prototype-op-gestion/.test(h.url), h);
  // I6 — la fiche d'une tâche ouverte puis retour : la fenêtre se ferme, on reste sur Tâches
  await neuf('taches'); await p.evaluate(() => tDetail('t3')); await L.calme(p, 400); await p.goBack(); await L.calme(p, 500);
  const h6 = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, fenetre: !!document.querySelector('#calque .panneau'), url: location.pathname.slice(-30) }));
  v('I6 (tâches-absences-12) : « retour » depuis une fiche de tâche ferme la fiche sans quitter l’écran', /prototype-op-gestion/.test(h6.url) && h6.h1 === 'Tâches' && !h6.fenetre, h6);
  // I7 — rechargement sur #absences : la même page revient
  await p.evaluate(() => { location.hash = 'absences'; }); await p.reload({ waitUntil: 'load' }); await p.waitForTimeout(900); await L.calme(p, 400);
  const h7 = await p.evaluate(() => (document.querySelector('#contenu h1') || {}).textContent);
  v('I7 : un rechargement sur #absences rouvre « Absences et congés »', /Absences/.test(h7), h7);
  v('I* : aucune erreur JavaScript (gérant)', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c);
  // I8 — le secrétariat (Julie) : voit-elle « Absences et congés » ? Peut-elle décider ?
  const j = await L.ouvrir({ profil: 'mac', qui: 'julie', hash: 'absences' }); await L.calme(j.p, 700);
  const r = await j.p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, valider: document.querySelectorAll('[data-aok],[data-anon]').length, nouvelle: !!document.querySelector('[data-anouv]'), menu: [...document.querySelectorAll('[data-go]')].map(e => e.textContent.trim().slice(0, 24)).filter(Boolean).slice(0, 40), longueur: (document.getElementById('contenu') || {}).textContent.length }));
  console.log('Julie / #absences :', JSON.stringify(r));
  v('I8 : Julie n’a aucun bouton « Valider » / « Refuser » (c’est le gérant qui décide)', r.valider === 0, r);
  v('I8b : Julie sur #absences ne reste pas devant une page vide', r.longueur > 40, r);
  await L.capture(j, O.CAP + 'I8-julie-absences.png');
  v('I* : aucune erreur JavaScript (Julie)', j.err.length === 0, j.err.slice(0, 3));
  await L.fin(j); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
