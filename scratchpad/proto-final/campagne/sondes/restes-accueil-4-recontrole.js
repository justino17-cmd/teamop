// RECONTRÔLE ADVERSE des restes de l'accueil, tour 4 (18 novembre 2026). Le correcteur a branché argentSurPlaceCompter sur le menu « Marquer terminée » et sur le registre biocide, et fait
// réécrire par journalPaieTerrain la ligne de l'Historique. On cherche ce que ça casse À CÔTÉ :
//  E. trois moyens de paiement et un montant à virgule, par le VRAI menu : Accueil, Comptabilité (Encaissements), fiche du client et Historique disent le même montant, au même jour ;
//  F. « Remettre à faire » (menu) après « Marquer terminée » : l'argent quitte l'Accueil — et la ligne de l'Historique ? puis « Marquer terminée » de nouveau : UNE ligne, UNE fois l'argent ;
//  G. « Recommencer la mission (pour l'essai) » (démo, i1) : une ligne par terminaison ou une seule ? l'argent d'une facture partie est-il recompté ? (porte jumelle : elle efface le drapeau `journale` sans effacer la ligne)
//  H. la ligne de l'Historique réécrite par « Terminer » ne change pas le texte d'une AUTRE intervention ; « Annuler » du toast n'efface pas la ligne d'une autre ;
//  I. un paiement déjà noté et « Annuler » du menu enchaînés avec un second geste du menu (Marquer terminée sur deux cartes de suite, Annuler = seulement la dernière).
// ⚠️ G tombe tant que « Recommencer la mission » (démo, hors application) n'efface pas la ligne d'Historique, la date et la marque d'encaissement de la mission qu'il recommence (défaut d'avant, constaté le 18/11 : 2 lignes ; avec facture partie, 50 € perdus).
// node restes-accueil-4-recontrole.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const profil = process.argv[2] && !/nuit/.test(process.argv[2]) ? process.argv[2] : 'mac', nuit = process.argv.includes('nuit');
const tag = profil + (nuit ? '-nuit' : '-jour');
(async () => {
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const cap = async n => { try { await L.capture(c, O.CAP + `r4rc-${n}-${tag}.png`, false); } catch (e) {} };
  const etat = id => p.evaluate(id => { const P = (fiche(id) || {}).paiement || {};
    return { st: (INTS.find(o => o.id === id) || {}).st, recuLe: P.recuLe, journale: !!P.journale, encaisse: P.encaisse, tout: cpPaieTerrain().reduce((s, e) => s + e.ttc, 0), terrain: cpPaieTerrain().filter(e => e.int === id).map(e => ({ d: e.d, ttc: e.ttc })),
      lignes: JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place' && j.el && j.el.id === id).map(j => j.det.replace(/[  ]/g, ' ')) }; }, id);
  const poser = (id, P) => p.evaluate(([id, P]) => { fiche(id).paiement = P; }, [id, P]);
  const menu = async (id, re) => { await p.evaluate(id => { fermerMenu(); menuCarte(id, 300, 300); }, id); await p.waitForTimeout(250);
    await L.toucher(c, p.locator('.ctx button', { hasText: re || /Marquer terminée/ }).first()); await L.calme(p, 400); };
  const toastAnnuler = async () => { await L.toucher(c, p.locator('#toast button', { hasText: /Annuler/ }).first()); await L.calme(p, 400); };
  const texteVue = async vue => { await L.aller(p, vue); await L.calme(p, 600); return p.evaluate(() => (document.querySelector('#contenu') || document.body).textContent.replace(/[  ]/g, ' ').replace(/\s+/g, ' ')); };
  const hReset = () => p.evaluate(() => { hQui = 'tous'; hType = 'tous'; hCli = 'tous'; hCherche = ''; hJourSel = 'tous'; });

  // ── E. trois moyens, une virgule, par le vrai menu
  const cas = [['i9', { etat: 'acompte', mode: 'Carte', montant: '35,5', ticket: false }, 35.5, /^35,50\s€ · Carte$/], ['i11', { etat: 'acompte', mode: 'Chèque', montant: '120', ticket: false }, 120, /^120,00\s€ · Chèque$/], ['i13', { etat: 'acompte', mode: 'Virement', montant: '7', ticket: false }, 7, /^7,00\s€ · Virement$/]];
  const e0 = await etat('i9'); let cumul = 0;
  for (const [id, P, m, re] of cas) { await poser(id, P); const av = await etat(id);
    v(`E · ${id} : population (pas terminée, pas comptée, aucune ligne)`, av.st !== 'fait' && av.terrain.length === 0 && av.lignes.length === 0, av);
    await menu(id); const ap = await etat(id); cumul += m;
    v(`E · ${id} (${P.mode}, « ${P.montant} ») : ${m} € comptés aujourd’hui, une ligne « ${re.source.replace(/[\\^$]/g, '')} »`, ap.st === 'fait' && Math.abs(ap.tout - av.tout - m) < 0.005 && ap.terrain.length === 1 && ap.recuLe === '2026-10-31' && ap.lignes.length === 1 && re.test(ap.lignes[0]), ap); }
  const eT = await etat('i9');
  v('E · population : trois paiements comptés ensemble (162,50 €)', Math.abs(eT.tout - e0.tout - cumul) < 0.005 && cumul === 162.5, { e0: e0.tout, eT: eT.tout, cumul });
  // ce que dit l'écran, pas l'état : Comptabilité (Encaissements)
  await p.evaluate(() => { CP.onglet = 'paiements'; CX.cat = 'tous'; CX.st = 'tous'; CX.psens = 'tous'; CX.pmode = 'tous'; }); const texCp = await texteVue('comptabilite');
  v('E · la Comptabilité (écran) cite les trois sommes reçues sur place (35,50 · 120,00 · 7,00)', /35,50\s€/.test(texCp) && /120,00\s€/.test(texCp) && /7,00\s€/.test(texCp), texCp.slice(0, 200));
  await cap('compta');
  await hReset(); const texH = await texteVue('historique');
  v('E · l’Historique (écran) montre les trois lignes « a noté un paiement reçu sur place »', (texH.match(/a noté un paiement reçu sur place/g) || []).length >= 3, (texH.match(/a noté un paiement reçu sur place/g) || []).length);
  await cap('historique');

  // ── F. « Remettre à faire » puis « Marquer terminée » de nouveau
  const f0 = await etat('i9');
  await menu('i9', /Remettre à faire/); const f1 = await etat('i9');
  v('F · « Remettre à faire » : l’argent de i9 ne compte plus à l’Accueil', f1.st !== 'fait' && Math.abs(f0.tout - f1.tout - 35.5) < 0.005 && f1.terrain.length === 0, { f0: f0.tout, f1: f1.tout });
  const texHF = await (async () => { await hReset(); return texteVue('historique'); })();
  v('F · (constat) la ligne « 35,50 € · Carte » reste dans l’Historique : c’est ce qui s’est passé, ce n’est pas un argent compté', f1.lignes.length === 1, f1.lignes);
  await menu('i9'); const f2 = await etat('i9');
  v('F · « Marquer terminée » de nouveau : 35,50 € comptés UNE fois, une seule ligne', f2.st === 'fait' && Math.abs(f2.tout - f1.tout - 35.5) < 0.005 && f2.lignes.length === 1 && f2.terrain.length === 1, f2);
  // le technicien change le montant entre-temps (fiche), puis le bureau re-« Marquer terminée » : la ligne dit le montant compté
  await menu('i9', /Remettre à faire/); await p.evaluate(() => { fiche('i9').paiement.montant = '50'; }); await menu('i9'); const f3 = await etat('i9');
  v('F · montant corrigé à 50 € entre-temps : l’Accueil compte 50 € ET la ligne dit 50,00 € (une ligne)', f3.terrain.length === 1 && f3.terrain[0].ttc === 50 && f3.lignes.length === 1 && /^50,00\s€ · Carte$/.test(f3.lignes[0]), f3);

  // ── H/I. deux cartes de suite : « Annuler » ne défait que la dernière ; la ligne d'une autre intervention est intacte
  const h0 = await etat('i11'); await poser('i14', { etat: 'acompte', mode: 'Espèces', montant: '20', ticket: false });
  await menu('i14'); const h1 = await etat('i14'); await toastAnnuler(); const h2 = await etat('i14'), h3 = await etat('i11');
  v('I · « Annuler » après la seconde carte défait i14 seulement', h2.st !== 'fait' && h2.lignes.length === 0 && !h2.recuLe && h3.st === 'fait' && h3.lignes.length === 1 && h3.terrain.length === 1 && h3.recuLe === '2026-10-31', { h1, h2, h3 });
  v('I · l’Accueil total = avant la seconde carte (i11 toujours comptée)', Math.abs(h2.tout - (h1.tout - 20)) < 0.005, { h1: h1.tout, h2: h2.tout });

  // ── G. « Recommencer la mission » (démo i1) : terminer, recommencer, terminer
  await p.evaluate(() => { sessionFermer('essai'); }); await p.reload(); await p.waitForTimeout(1200); await p.evaluate(() => { reglages.auto = false; route = 'accueil'; sessionOuvrir('sm'); });
  const terminer = async () => { await L.aller(p, 'inter-x-i1'); await L.calme(p, 400);
    await p.evaluate(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Fait.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Pièce', q: '1', pu: 35.5 }]; });
    await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first()); await L.calme(p, 400); };
  await p.evaluate(() => { fiche('i1').paiement = { etat: 'acompte', mode: 'Espèces', montant: '50', ticket: false }; });
  await terminer(); const g1 = await etat('i1');
  v('G · population : i1 terminée avec 50 € notés — une ligne', g1.st === 'fait' && g1.lignes.length === 1 && g1.terrain.length === 1 || (g1.st === 'fait' && g1.lignes.length === 1), g1);
  const encAvant = await p.evaluate(() => ({ enc: ENCAISSEMENTS.filter(e => e.int === 'i1').map(e => e.ttc), fact: FACTURES.filter(f => f.int === 'i1').map(f => f.num + ':' + f.st + ':' + (f.recu || 0)) }));
  await p.evaluate(() => ACTIONS.recommencer()); await L.calme(p, 400); const g2 = await etat('i1');
  await p.evaluate(() => { const F = fiche('i1'); F.paiement = { ...F.paiement }; });
  await terminer(); const g3 = await etat('i1');
  const encApres = await p.evaluate(() => ({ enc: ENCAISSEMENTS.filter(e => e.int === 'i1').map(e => e.ttc), fact: FACTURES.filter(f => f.int === 'i1').map(f => f.num + ':' + f.st + ':' + (f.recu || 0)) }));
  v('G · « Recommencer » puis « Terminer » : toujours UNE ligne « a noté un paiement » pour i1 (pas deux)', g3.lignes.length === 1, { g1: g1.lignes, g2: g2.lignes, g3: g3.lignes });
  v('G · et l’argent de i1 est compté une fois, ni perdu ni doublé (Accueil + encaissements)', (g3.terrain.reduce((s, x) => s + x.ttc, 0) + encApres.enc.reduce((s, x) => s + x, 0)) === 50, { g1, g3, encAvant, encApres });

  v('aucune erreur JavaScript pendant toute la sonde', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); const ko = L.bilan(); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
