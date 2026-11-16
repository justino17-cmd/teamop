// Parcours C (gérant, ordinateur) : Absences et congés — valider, refuser, proposer, poser une absence, annuler, soldes recalculés.
const O = require('./taches-absences-outils.js'), L = O.L, v = L.v;
const etat = p => p.evaluate(() => ({ dem: DEMANDES_ABS.map(d => d.id + ':' + d.etat), abs: ABSENCES.length, dec: DECISIONS_ABS.length, jr: JOURNAL.length,
  pastille: ((document.querySelector('[data-aonglet=valider]') || {}).textContent || '').replace(/\D+/g, ''), cartes: document.querySelectorAll('#contenu .a-dem').length }));
const solde = (p, tid, type) => p.evaluate(([t, ty]) => { const s = aSolde(t, ty); return { droit: s.droit, pris: s.pris, reste: s.reste }; }, [tid, type]);
// jours ouvrés recalculés SANS les fonctions de l'application : lundi-vendredi, hors fériés de A_FERIES
const ouvres = (p, du, au) => p.evaluate(([du, au]) => { let n = 0; for (let d = new Date(du + 'T12:00:00'); d <= new Date(au + 'T12:00:00'); d.setDate(d.getDate() + 1)) { const s = d.toISOString().slice(0, 10), w = d.getDay(); if (w !== 0 && w !== 6 && !A_FERIES[s]) n++; } return n; }, [du, au]);
(async () => {
  const c = await L.ouvrir({ profil: 'mac', qui: 'marc', hash: 'absences' }); const p = c.p;
  const neuf = async (onglet) => { await O.neuf(c, 'absences'); if (onglet) { await p.evaluate(o => document.querySelector(`[data-aonglet=${o}]`).click(), onglet); await L.calme(p, 300); } };
  // C0 — les soldes affichés = droit − jours ouvrés pris, recalculés ici
  await neuf('soldes'); await L.capture(c, O.CAP + 'C0-soldes.png', true);
  for (const [tid, type] of [['sm', 'Congé payé'], ['kb', 'Congé payé'], ['lr', 'Congé payé'], ['tl', 'RTT'], ['sm', 'RTT']]) {
    const r = await p.evaluate(([t, ty]) => { const prisCalc = ABSENCES.filter(a => a.tech === t && a.type === ty && a.du.startsWith('2026')).map(a => [a.du > '2026-01-01' ? a.du : '2026-01-01', a.au < '2026-12-31' ? a.au : '2026-12-31', a.demi && a.du === a.au]); return { prisCalc, droit: A_DROITS[ty], app: (() => { const s = aSolde(t, ty); return { pris: s.pris, reste: s.reste }; })() }; }, [tid, type]);
    let tot = 0; for (const [du, au, demi] of r.prisCalc) { const n = await ouvres(p, du, au); tot += demi ? n / 2 : n; }
    v(`C0 : solde ${type} de ${tid} : ${r.droit} − ${tot} pris = ${r.droit - tot} (l’écran dit ${r.app.reste})`, r.app.pris === tot && r.app.reste === r.droit - tot, r);
  }
  // C1 — valider Sophie (rien à régler)
  await neuf('valider'); const e0 = await etat(p);
  await p.evaluate(() => document.querySelector('[data-aok=d3]').click()); await L.calme(p, 500); let e1 = await etat(p);
  v('C1 : « Valider » : la demande quitte « À valider » (3→2)', e1.cartes === e0.cartes - 1 && e1.pastille === '2', [e0, e1]);
  v('C1 : elle devient une absence, une décision, une ligne d’historique', e1.abs === e0.abs + 1 && e1.dec === e0.dec + 1 && e1.jr > e0.jr, [e0, e1]);
  const toast = await p.evaluate(() => (document.getElementById('toast') || {}).textContent); console.log('toast :', toast);
  v('C1 : le message dit qui est prévenu', /Sophie est prévenue/.test(toast || ''), toast);
  await L.capture(c, O.CAP + 'C1-valide.png', true);
  // la technicienne voit sa demande validée
  await p.evaluate(() => { sessionOuvrir('sm'); }); await L.calme(p, 700); await L.aller(p, 'absences'); await L.calme(p, 500);
  const sm = await p.evaluate(() => ({ h1: (document.querySelector('#contenu h1') || {}).textContent, t: document.getElementById('contenu').innerText.replace(/\s+/g, ' ') }));
  v('C1 → Sophie : « Mes congés » montre « Validée » pour le vendredi 6 novembre matin', /Validée/.test(sm.t) && /6 novembre/.test(sm.t) && sm.h1 === 'Mes congés', sm.t.slice(0, 400));
  await L.capture(c, O.CAP + 'C1-sophie.png', true);
  // C2 — Tom : validation avec intervention à reprendre
  await neuf('valider'); const i11 = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i11'); return { tech: i.tech, d: i.d, h: i.h, st: i.st }; });
  const rtt0 = await solde(p, 'tl', 'RTT');
  await p.evaluate(() => document.querySelector('[data-aok=d2]').click()); await L.calme(p, 500);
  const i11b = await p.evaluate(() => { const i = INTS.find(o => o.id === 'i11'); return { tech: i.tech, d: i.d, h: i.h, st: i.st }; });
  const rtt1 = await solde(p, 'tl', 'RTT');
  v('C2 : l’intervention i11 passe de Tom à Karim, même jour, même heure', i11.tech === 'tl' && i11b.tech === 'kb' && i11b.d === i11.d && i11b.h === i11.h, [i11, i11b]);
  v('C2 : solde RTT de Tom : 10 → 9 (un jour ouvré)', rtt0.reste === 10 && rtt1.reste === 9, [rtt0, rtt1]);
  // le planning montre bien i11 chez Karim ce jour-là
  const pl = await p.evaluate(() => { plRef = '2026-11-03'; plVue = 'jour'; plMasques = new Set(); aller('planning'); return true; }); await L.calme(p, 800);
  const pj = await p.evaluate(() => { const e = document.querySelector('.pc[data-int="i11"]'); return { trouve: !!e, col: e ? (e.closest('[data-tech],[data-col]') || {}).dataset : null, txt: e ? e.textContent.replace(/\s+/g, ' ').slice(0, 80) : '', abs: [...document.querySelectorAll('#contenu .pl-abs, #contenu [class*=absent]')].map(x => x.textContent.replace(/\s+/g, ' ').slice(0, 60)).slice(0, 3) }; });
  console.log('planning 3 nov :', JSON.stringify(pj)); await L.capture(c, O.CAP + 'C2-planning.png');
  // C3 — refuser Karim : raison obligatoire
  await neuf('valider'); await p.evaluate(() => document.querySelector('[data-anon=d1]').click()); await L.calme(p, 300);
  await p.evaluate(() => document.querySelector('[data-anonok]').click()); await L.calme(p, 300);
  const sansRaison = await p.evaluate(() => ({ toast: (document.getElementById('toast') || {}).textContent, ouvert: !!document.querySelector('#calque .panneau'), n: DEMANDES_ABS.length }));
  v('C3 : refuser sans raison : le dit, ne refuse pas, la fenêtre reste', /pourquoi/i.test(sansRaison.toast || '') && sansRaison.ouvert && sansRaison.n === 3, sansRaison);
  await L.capture(c, O.CAP + 'C3-refus-vide.png');
  await p.fill('#an-raison', 'Trop d’interventions prévues cette semaine-là.'); await p.evaluate(() => document.querySelector('[data-anonok]').click()); await L.calme(p, 500);
  const refus = await p.evaluate(() => ({ n: DEMANDES_ABS.length, dec: DECISIONS_ABS[0], abs: ABSENCES.length }));
  v('C3 : refusée avec une raison : décision « refusée », aucune absence créée', refus.n === 2 && refus.dec.decision === 'refusee' && refus.dec.raison.length > 5, refus);
  await p.evaluate(() => { sessionOuvrir('kb'); }); await L.calme(p, 700); await L.aller(p, 'absences'); await L.calme(p, 500);
  const kb = await p.evaluate(() => document.getElementById('contenu').innerText.replace(/\s+/g, ' '));
  v('C3 → Karim : voit « Refusée » et la raison, et peut répondre', /Refusée/.test(kb) && /Trop d’interventions/.test(kb) && /Répondre/.test(kb), kb.slice(0, 500));
  await L.capture(c, O.CAP + 'C3-karim.png', true);
  // C4 — proposer d'autres dates (Sophie d3) ; fin avant début ; mêmes dates
  await neuf('valider'); await p.evaluate(() => document.querySelector('[data-amodif=d3]').click()); await L.calme(p, 300);
  await p.fill('#am-du', '2026-11-10'); await p.fill('#am-au', '2026-11-09'); await p.evaluate(() => document.getElementById('am-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 300);
  const apx = await p.evaluate(() => (document.getElementById('am-apercu') || {}).textContent);
  v('C4 : fin avant début : message clair', /fin est avant/.test(apx || ''), apx);
  await p.evaluate(() => document.querySelector('[data-amodifok]').click()); await L.calme(p, 300);
  v('C4 : et l’envoi est refusé', await p.evaluate(() => DEMANDES_ABS.find(d => d.id === 'd3').etat !== 'proposee'));
  await p.fill('#am-du', '2026-11-10'); await p.fill('#am-au', '2026-11-10'); await p.fill('#am-msg', 'La semaine d’après te va ?'); await p.evaluate(() => document.getElementById('am-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 200);
  await p.evaluate(() => document.querySelector('[data-amodifok]').click()); await L.calme(p, 500);
  v('C4 : proposition envoyée : « Proposition envoyée » et plus de boutons de décision', await p.evaluate(() => { const c = document.querySelector('[data-ademid=d3]'); return DEMANDES_ABS.find(d => d.id === 'd3').etat === 'proposee' && c && !c.querySelector('[data-aok]'); }));
  await L.capture(c, O.CAP + 'C4-proposee.png', true);
  await p.evaluate(() => { sessionOuvrir('sm'); }); await L.calme(p, 700); await L.aller(p, 'absences'); await L.calme(p, 500);
  v('C4 → Sophie : voit la proposition de Marc et « Accepter ces dates »', await p.evaluate(() => /Marc propose/.test(document.getElementById('contenu').innerText) && !!document.querySelector('[data-atrep$="|oui"]')));
  await p.evaluate(() => document.querySelector('[data-atrep$="|oui"]').click()); await L.calme(p, 600);
  const acc = await p.evaluate(() => ({ abs: ABSENCES.filter(a => a.tech === 'sm').map(a => a.du + '>' + a.au), dem: DEMANDES_ABS.some(d => d.id === 'd3') }));
  v('C4 : Sophie accepte : posée au 10 novembre, la demande disparaît', acc.abs.some(x => x.startsWith('2026-11-10')) && !acc.dem, acc);
  // C5 — poser une absence
  await neuf('calendrier'); await p.evaluate(() => document.querySelector('[data-anouv]').click()); await L.calme(p, 300);
  await L.capture(c, O.CAP + 'C5-nouvelle.png');
  const q = await p.evaluate(() => ({ qui: document.getElementById('an-t').value, du: document.getElementById('an-du').value, types: [...document.querySelectorAll('#an-ty option')].map(o => o.textContent) }));
  console.log('formulaire nouvelle absence :', JSON.stringify(q));
  await p.selectOption('#an-t', 'tl'); await p.selectOption('#an-ty', 'Congé payé'); await p.fill('#an-du', '2026-11-23'); await p.fill('#an-au', '2026-11-27'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 300);
  const ap = await p.evaluate(() => document.getElementById('an-apercu').textContent.replace(/\s+/g, ' '));
  v('C5 : l’aperçu dit « 5 jours ouvrés »', /5 jours ouvrés/.test(ap), ap);
  const cp0 = await solde(p, 'tl', 'Congé payé'); await p.evaluate(() => document.querySelector('[data-anouvok]').click()); await L.calme(p, 600);
  const cp1 = await solde(p, 'tl', 'Congé payé');
  v('C5 : « Enregistrer » : le solde de Tom baisse de 5 jours', cp0.reste - cp1.reste === 5, [cp0, cp1]);
  v('C5 : le calendrier s’ouvre sur le mois posé et montre l’absence', await p.evaluate(() => aOnglet === 'calendrier' && /novembre/i.test(document.getElementById('contenu').innerText)));
  await L.capture(c, O.CAP + 'C5-calendrier.png', true);
  // C5b — chevauchement et valeur absurde
  await p.evaluate(() => document.querySelector('[data-anouv]').click()); await L.calme(p, 300);
  await p.selectOption('#an-t', 'lr'); await p.fill('#an-du', '2026-11-02'); await p.fill('#an-au', '2026-11-02'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 300);
  const ov = await p.evaluate(() => document.getElementById('an-apercu').textContent.replace(/\s+/g, ' '));
  v('C5b : chevauchement avec l’absence de Léa : prévenu', /déjà/.test(ov), ov);
  await p.selectOption('#an-t', 'kb'); await p.selectOption('#an-ty', 'Congé payé'); await p.fill('#an-du', '2026-12-01'); await p.fill('#an-au', '2027-03-31'); await p.evaluate(() => document.getElementById('an-au').dispatchEvent(new Event('change', { bubbles: true }))); await L.calme(p, 300);
  const gros = await p.evaluate(() => document.getElementById('an-apercu').textContent.replace(/\s+/g, ' '));
  v('C5b : 4 mois de congés payés (solde 10 j) : l’écran prévient que ça dépasse le solde', /solde|dépasse/i.test(gros), gros);
  // C6 — annuler une absence validée : décision, solde, interventions
  await neuf('calendrier'); await p.evaluate(() => document.querySelector('[data-avoir]').click()); await L.calme(p, 300);
  const fa = await p.evaluate(() => document.querySelector('#calque .panneau').innerText.replace(/\s+/g, ' ')); console.log('fiche absence :', fa.slice(0, 300));
  await L.capture(c, O.CAP + 'C6-fiche-absence.png');
  v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error('PLANTÉ', e.message); process.exit(2); });
