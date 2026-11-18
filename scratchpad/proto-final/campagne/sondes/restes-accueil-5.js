// RESTES DE L'ACCUEIL, tour 5 (18 novembre 2026) : l'argent retiré de l'Accueil emporte sa ligne de l'Historique, JOUÉ PAR LES VRAIS GESTES.
//  A. « Terminer », « Recommencer la mission », « Terminer » : UNE seule ligne « paiement reçu sur place », 50 € comptés une fois ;
//  B. même parcours avec la facture envoyée automatiquement : les 50 € sont comptés (le drapeau d'encaissement est effacé avec la facture), une ligne ;
//  C. « Remettre à faire » (menu de la carte) : la ligne part, l'Accueil ne compte plus rien, « Annuler » du toast remet les deux, re-« Terminer » repose UNE ligne.
// Compteur de population : chaque absence n'est comptée qu'après avoir prouvé que la ligne existait avant.
// node restes-accueil-5.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] && !/nuit/.test(process.argv[2]) ? process.argv[2] : 'mac', nuit = process.argv.includes('nuit');
const tag = profil + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `r5-${n}-${tag}.png`, false); } catch (e) {} };
  const etat = id => p.evaluate(id => { const P = (fiche(id) || {}).paiement || {};
    return { st: (INTS.find(o => o.id === id) || {}).st, recuLe: P.recuLe, journale: !!P.journale, encaisse: P.encaisse || null, tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0) + ENCAISSEMENTS.filter(e => e.int === id).reduce((s, e) => s + e.ttc, 0), encs: ENCAISSEMENTS.filter(e => e.int === id).length,
      lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id).map(j => j.det) }; }, id);
  const terminer = async (id, auto) => { await p.evaluate(([id, auto]) => { reglages.auto = auto; const F = fiche(id); tousControles(F).forEach(k => F.coches[k] = true); F.compte = F.compte || 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Roulement ventilateur', q: '1', pu: 35.5 }]; }, [id, auto]);
    await L.aller(p, 'inter-x-' + id); await L.calme(p, 400); await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first()); };
  // le bouton « Recommencer la mission (pour l'essai) » n'existe pas dans l'application (enApp) : on joue sa fonction réelle, comme les sondes d'avant
  const recommencer = async () => { await p.evaluate(() => ACTIONS.recommencer()); await L.calme(p, 600); };

  for (const auto of [false, true]) {
    const k = auto ? 'B(auto)' : 'A';
    await p.evaluate(() => { sessionFermer('essai'); }); await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => { route = 'accueil'; sessionOuvrir('sm'); });   // i1 est la mission de « sm »
    await p.evaluate(() => { fiche('i1').paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }; });
    const z = await etat('i1');
    await terminer('i1', auto); const t1 = await etat('i1');
    v(k + ' · population : i1 terminée, 50 € comptés, une ligne « 50,00 € »', t1.st === 'fait' && t1.lignes.length === 1 && /^50,00/.test(t1.lignes[0]) && t1.tout - z.tout === 50, { z, t1 });
    if (auto) v(k + ' · population : la facture est partie et l’encaissement est inscrit (drapeau posé)', !!t1.encaisse && t1.encs >= 1, t1);
    await cap(k + '-termine');
    await recommencer(); const r = await etat('i1');
    v(k + ' · « Recommencer » : la ligne est retirée (elle existait avant), plus de date, plus de drapeau, rien de compté', t1.lignes.length === 1 && r.lignes.length === 0 && !r.recuLe && !r.journale && !r.encaisse && r.tout === z.tout && r.st !== 'fait', { t1, r });
    await terminer('i1', auto); const t2 = await etat('i1');
    v(k + ' · « Terminer » de nouveau : UNE seule ligne, 50 € comptés (plus perdus)', t2.lignes.length === 1 && /^50,00/.test(t2.lignes[0]) && t2.tout - z.tout === 50, { z, t2 });
  }

  // ── C. « Remettre à faire » du menu de la carte (en bureau : le journal de l'équipe se lit à l'écran)
  await p.evaluate(() => { sessionFermer('essai'); }); await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => { route = 'accueil'; });
  const menu = async (id, re) => { await p.evaluate(id => { fermerMenu(); menuCarte(id, 300, 300); }, id); await p.waitForTimeout(250); await L.toucher(c, p.locator('.ctx button', { hasText: re }).first()); await L.calme(p, 400); };
  await p.evaluate(() => { fiche('i8').paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }; });
  const c0 = await etat('i8'); await menu('i8', /Marquer terminée/); const c1 = await etat('i8');
  v('C · population : i8 terminée par le menu, 50 € comptés, une ligne', c1.st === 'fait' && c1.lignes.length === 1 && c1.tout - c0.tout === 50, { c0, c1 });
  const ecran = async () => { await p.evaluate(() => { hQui = 'tous'; hType = 'tous'; hCli = 'tous'; hCherche = ''; hJourSel = 'tous'; }); await L.aller(p, 'historique'); await L.calme(p, 500);
    const r = await p.evaluate(() => ({ ecran: (document.querySelector('#contenu') || document.body).textContent.replace(/\s+/g, ' ').split('a noté un paiement reçu sur place').length - 1, journal: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place').length })); await L.aller(p, 'accueil'); await L.calme(p, 300); return r; };
  const h1 = await ecran(); v('C · population : l’Historique à l’écran montre la ligne (≥ 1) avant « Remettre à faire »', h1.ecran >= 1 && h1.ecran === h1.journal, h1); await cap('historique-avant');
  await menu('i8', /Remettre à faire/); const c2 = await etat('i8');
  v('C · « Remettre à faire » : plus compté ET la ligne de l’Historique est retirée (même verdict)', c2.st !== 'fait' && c2.tout === c0.tout && c2.lignes.length === 0 && !c2.journale, c2);
  await L.toucher(c, p.locator('#toast button', { hasText: /Annuler/ }).first()); await L.calme(p, 400); const c3 = await etat('i8');
  v('C · « Annuler » du toast remet tout : terminée, 50 € comptés, la ligne revient (une seule)', c3.st === 'fait' && c3.tout - c0.tout === 50 && c3.lignes.length === 1, c3);
  await menu('i8', /Remettre à faire/); const h2 = await ecran(); v('C · l’Historique à l’écran perd UNE ligne en même temps que l’Accueil', h2.journal === h1.journal - 1 && h2.ecran === h1.ecran - 1, { h1, h2 }); await cap('historique-apres');
  await menu('i8', /Marquer terminée/); const c4 = await etat('i8');
  v('C · re-« Marquer terminée » : 50 € comptés UNE fois, une seule ligne', c4.st === 'fait' && c4.lignes.length === 1 && c4.tout - c0.tout === 50, c4);
  await p.evaluate(() => { const i = INTS.find(o => o.id === 'i9'); fiche('i9').paiement = { etat: 'rien', mode: 'Espèces', montant: '', ticket: false }; i.st = 'fait'; });
  const e0 = await p.evaluate(() => JOURNAL.length); await menu('i9', /Remettre à faire/);
  v('C · sans paiement noté, « Remettre à faire » ne touche pas le journal', await p.evaluate(() => JOURNAL.length) === e0, e0);
  await L.aller(p, 'accueil'); await L.calme(p, 400); await cap('accueil-final');
  v('aucune erreur JavaScript pendant toute la sonde', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
