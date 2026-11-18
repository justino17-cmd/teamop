// RESTES DE L'ACCUEIL, tour 4 (18 novembre 2026) : les deux casses que le recontrôle du tour 3 a trouvées, JOUÉES PAR LES VRAIS GESTES (pas en posant i.st à la main) :
//  A. « Marquer terminée » (menu de la carte) avec un paiement déjà noté par le technicien, sur une intervention prévue APRÈS octobre : l'argent compte aujourd'hui, il a sa ligne dans
//     l'Historique ; « Annuler » du toast défait tout (date, ligne, état) ;
//  B. le registre biocide (autre porte qui passe une intervention « terminée » sans « Terminer ») : même règle, même annulation ;
//  C. « Remettre à faire », le technicien retape un autre montant, « Terminer » : l'Accueil compte 80 € et la ligne de l'Historique dit 80 € (une seule ligne) ;
//  D. rien ne se double : « Marquer terminée » sur une intervention SANS paiement noté n'écrit aucune ligne ni aucune date ; une intervention déjà terminée par « Terminer » (date posée) garde sa date.
// node restes-accueil-4.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] && !/nuit/.test(process.argv[2]) ? process.argv[2] : 'mac', nuit = process.argv.includes('nuit');
const tag = profil + (nuit ? '-nuit' : '-jour');
const argent = id => ({ id });
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `r4-${n}-${tag}.png`, false); } catch (e) {} };
  const etat = id => p.evaluate(id => { const P = (fiche(id) || {}).paiement || {};
    return { st: (INTS.find(o => o.id === id) || {}).st, recuLe: P.recuLe, journale: !!P.journale, tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), terrain: cpPaieTerrain().filter(e => e.int === id).map(e => ({ d: e.d, ttc: e.ttc })),
      lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id).map(j => j.det) }; }, id);
  const poser = (id, P) => p.evaluate(([id, P]) => { fiche(id).paiement = P; }, [id, P]);
  const menu = async id => { await p.evaluate(id => { fermerMenu(); menuCarte(id, 300, 300); }, id); await p.waitForTimeout(250);
    await L.toucher(c, p.locator('.ctx button', { hasText: /Marquer terminée/ }).first()); await L.calme(p, 400); };
  const annulerToast = async () => { await L.toucher(c, p.locator('#toast button', { hasText: /Annuler/ }).first()); await L.calme(p, 400); };

  // ── A. « Marquer terminée » avec un paiement noté, intervention prévue après octobre
  await poser('i8', { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false });
  const a0 = await etat('i8'); v('A · population : i8 est prévue après octobre, pas encore terminée, aucune ligne', await p.evaluate(() => INTS.find(o => o.id === 'i8').d) > '2026-10-31' && a0.st !== 'fait' && a0.lignes.length === 0, a0);
  await menu('i8'); const a1 = await etat('i8');
  v('A · « Marquer terminée » : les 50 € sont comptés (reçus aujourd’hui, pas le jour prévu)', a1.st === 'fait' && a1.tout - a0.tout === 50 && a1.terrain.length === 1 && a1.terrain[0].ttc === 50 && a1.recuLe === '2026-10-31', { a0, a1 });
  v('A · une ligne dans l’Historique : « 50,00 € · Espèces »', a1.lignes.length === 1 && /^50,00\s€ · Espèces$/.test(a1.lignes[0].replace(/[  ]/g, ' ')), a1.lignes);
  await L.aller(p, 'accueil'); await L.calme(p, 500); await cap('accueil-apres-menu');
  const histo = await p.evaluate(() => { hQui = 'tous'; hType = 'tous'; hCli = 'tous'; hCherche = ''; hJourSel = 'tous'; return true; }); await L.aller(p, 'historique'); await L.calme(p, 500);
  const txt = await p.evaluate(() => (document.querySelector('#contenu') || document.body).textContent.replace(/\s+/g, ' '));
  v('A · l’Historique à l’écran montre la ligne « a noté un paiement reçu sur place »', /a noté un paiement reçu sur place/.test(txt), txt.slice(0, 160));
  await cap('historique-apres-menu');
  // « Annuler » du toast juste après le geste : tout revient (état, date, ligne), puis on refait le geste : l'argent est recompté UNE fois
  await L.aller(p, 'accueil'); await L.calme(p, 300); await p.evaluate(() => { fermerMenu(); });
  await p.evaluate(id => { const i = INTS.find(o => o.id === id); i.st = 'planifiee'; const P = fiche(id).paiement; delete P.recuLe; delete P.recuH; delete P.journale; JOURNAL.splice(0, JOURNAL.length, ...JOURNAL.filter(j => !(j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id))); }, 'i8');
  await menu('i8'); const a2 = await etat('i8'); v('A · (rejeu propre) « Marquer terminée » : 50 € comptés, une ligne', a2.st === 'fait' && a2.lignes.length === 1 && a2.tout - a0.tout === 50, a2);
  await annulerToast(); const a3 = await etat('i8');
  v('A · « Annuler » du toast défait tout : plus terminée, plus comptée, la date n’est plus posée, la ligne de l’Historique est retirée', a3.st !== 'fait' && a3.tout === a0.tout && !a3.recuLe && a3.lignes.length === 0 && !a3.journale, a3);
  await menu('i8'); const a4 = await etat('i8'); v('A · refait après « Annuler » : 50 € comptés UNE fois, une seule ligne', a4.st === 'fait' && a4.lignes.length === 1 && a4.tout - a0.tout === 50 && a4.terrain.length === 1, a4);

  // ── D. rien ne se double / rien n'est écrit sans paiement
  await poser('i9', { etat: 'rien', mode: 'Espèces', montant: '', ticket: false });
  const d0 = await etat('i9'); await menu('i9'); const d1 = await etat('i9');
  v('D · « Marquer terminée » sans paiement noté : aucune ligne, aucune date, rien de compté', d1.st === 'fait' && d1.lignes.length === 0 && !d1.recuLe && d1.tout === d0.tout, { d0, d1 });
  await poser('i12', { etat: 'total', mode: 'Chèque', montant: '', ticket: false, recuLe: '2026-10-29', recuH: '09:12' });
  const d2 = await etat('i12'); await menu('i12'); const d3 = await etat('i12');
  v('D · un paiement déjà daté (29/10) garde sa date : « Marquer terminée » ne la remplace pas par aujourd’hui', d3.recuLe === '2026-10-29', { d2, d3 });
  await annulerToast(); const d4 = await etat('i12'); v('D · « Annuler » ne retire pas une date posée avant (29/10 reste)', d4.recuLe === '2026-10-29' && d4.st !== 'fait', d4);

  // ── B. le registre biocide (n'existe que pour une entreprise du métier 3D : on l'ouvre, c'est la même page)
  const b = await p.evaluate(() => { PACKS_ENT.push('3d'); rgdSync(); const i = INTS.find(o => o.id === 'rg-i1'); if (!i) return null; i.st = 'planifiee'; fiche(i.id).paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false };
    const av = cpPaieTerrain().reduce((s, e) => s + e.ttc, 0); rgSaisieOuvrir(i.rg, i.id); const S = rgSaisie; D3_POSTES[S.k].filter(x => x.actif).forEach(x => S.etats[x.id] = 0); S.sig = true; rgSaisieOk();
    const P = fiche(i.id).paiement; return { av, ap: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), st: i.st, rec: P.recuLe, lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === i.id).map(j => j.det), passages: JOURNAL.filter(j => j.action === 'a saisi un passage au registre').length }; });
  v('B · population : l’intervention du registre existe et le passage a été enregistré', !!b && b.st === 'fait' && b.passages >= 1, b);
  v('B · registre biocide : le paiement noté (50 €) est compté aujourd’hui et a sa ligne', !!b && b.ap - b.av === 50 && b.rec === '2026-10-31' && b.lignes.length === 1, b);
  await L.toucher(c, p.locator('#toast button', { hasText: /Annuler/ }).first()); await L.calme(p, 400);
  const b2 = await etat('rg-i1'); v('B · « Annuler » le passage défait aussi l’argent : plus terminée, plus comptée, plus de ligne, plus de date', b2.st !== 'fait' && b2.tout === b.av && !b2.recuLe && b2.lignes.length === 0, b2);

  // ── C. « Remettre à faire », montant retapé, « Terminer » : la ligne dit ce que l'Accueil compte
  await p.evaluate(() => { sessionFermer('essai'); }); await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => { reglages.auto = false; route = 'accueil'; sessionOuvrir('kb'); });
  await L.aller(p, 'inter-x-i3'); await L.calme(p, 400);
  const terminer = async () => { await p.evaluate(() => { const F = fiche('i3'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Pièce', q: '1', pu: 35.5 }]; });
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first()); };
  await p.evaluate(() => { fiche('i3').paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }; });
  await terminer(); const c1 = await etat('i3');
  v('C · population : i3 terminée avec 50 € — une ligne « 50,00 € »', c1.st === 'fait' && c1.lignes.length === 1 && /^50,00/.test(c1.lignes[0]), c1);
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i3'), F = fiche('i3'); i.st = 'planifiee'; F.etat = 'enCours'; F.paiement.montant = '80'; });
  await L.aller(p, 'inter-x-i3'); await L.calme(p, 400); await terminer(); const c2 = await etat('i3');
  v('C · re-terminée avec 80 € : l’Accueil compte 80 € de plus', c2.tout - c1.tout === 30 && c2.terrain.reduce((s, x) => s + x.ttc, 0) === 80, { c1, c2 });
  v('C · la ligne de l’Historique dit 80 € (pas encore 50 €), et il n’y en a toujours qu’une', c2.lignes.length === 1 && /^80,00/.test(c2.lignes[0]), c2.lignes);
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i3'), F = fiche('i3'); i.st = 'planifiee'; F.etat = 'enCours'; });
  await L.aller(p, 'inter-x-i3'); await L.calme(p, 400); await terminer(); const c3 = await etat('i3');
  v('C · « Terminer » une troisième fois sans rien changer : toujours une ligne, toujours 80 €', c3.lignes.length === 1 && /^80,00/.test(c3.lignes[0]) && c3.tout === c2.tout, c3);
  v('aucune erreur JavaScript pendant toute la sonde', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
