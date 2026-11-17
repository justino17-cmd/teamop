// RECONTRÔLE ADVERSE de l'accueil — trois parcours de bout en bout, joués par les VRAIS gestes (souris sur ordinateur, toucher sur téléphone), avec les NOMBRES lus
// à l'écran avant et après (jamais seulement l'état des données) :
//   A. un client règle une facture : Accueil (« à recevoir », « reçu en octobre ») → Comptabilité → fiche → « Chèque » → Accueil, Statistiques, Comptabilité, Historique → ligne → fiche → Retour
//   B. un jour sans intervention : Accueil → « ＋ Nouvelle intervention » → fenêtre → « Plus tard » → Créer → l'Accueil la range dans « à planifier », l'Historique la note
//   C. Statistiques → un technicien → une intervention → Retour (la période demandée est gardée) ; Historique filtré → ligne → fiche → Retour (le filtre est gardé)
// node accueil-recontrole-parcours.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const hash = () => p.evaluate(() => location.hash);
  const num = s => s == null ? NaN : parseFloat(String(s).replace(/[\s  €]/g, '').replace(',', '.'));
  const cap = async n => { try { await L.capture(c, O.CAP + `rc-parcours-${n}-${tag}.png`, false); } catch (e) {} };
  const retour = async () => { const ok = await L.toucher(c, p.locator('#contenu button, #contenu a').filter({ hasText: /^‹\s*Retour/ }).first(), { delai: 3000 }); await p.waitForTimeout(500); return ok; };
  const tuile = k => p.evaluate(k => { const b = document.querySelector(`[data-kdash="${k}"] b`); return b ? b.textContent : null; }, k);

  // ─────────────── A. un règlement, de bout en bout
  await L.aller(p, 'accueil');
  const f = await p.evaluate(() => { const x = FACTURES.filter(o => ['envoyee', 'retard'].includes(o.st) && restant(o) > 30).sort((a, b) => restant(a) - restant(b))[0]; return x ? { id: x.id, num: x.num, rest: restant(x) } : null; });
  v('A · population : une facture à régler existe', !!f, f);
  const rec0 = num(await tuile('rec')), enc0 = num(await tuile('enc'));
  const compta0 = await (async () => { await L.toucher(c, '[data-kdash="enc"]'); await p.waitForTimeout(500); const t = await corps(); const m = t.match(/(\d[\d ]*,\d{2}) € reçu en octobre/); return m ? num(m[1]) : NaN; })();
  v('A · avant : « reçu en octobre » de Comptabilité = tuile de l’Accueil', Math.abs(compta0 - enc0) < 0.01, { enc0, compta0 });
  // ouvrir la facture comme une personne : par la ligne de Comptabilité si elle y est, sinon par l'adresse
  await L.aller(p, 'facture-x-' + f.id);
  v('A · la fiche s’ouvre pour CETTE facture', (await corps()).includes(f.num), await hash());
  const jA = await p.evaluate(() => JOURNAL.length);
  await L.toucher(c, `[data-payer="${f.id}|Chèque"]`); await p.waitForTimeout(600);
  const apA = await p.evaluate(() => ({ n: JOURNAL.length, der: JOURNAL[JOURNAL.length - 1] }));
  v('A · le geste écrit UNE ligne dans l’Historique, au nom de la bonne facture', apA.n - jA === 1 && apA.der.el && apA.der.el.lib === f.num && /paiement/.test(apA.der.action), { avant: jA, apres: apA.n, der: apA.der && apA.der.action });
  const toast = await p.evaluate(() => (document.querySelector('#toast') || {}).textContent || '');
  v('A · le toast dit « encaissés » et le moyen de paiement', /encaiss/.test(toast) && /chèque/i.test(toast), toast);
  await cap('A-apres-paiement');
  await L.aller(p, 'accueil');
  const rec1 = num(await tuile('rec')), enc1 = num(await tuile('enc'));
  v('A · l’Accueil : « à recevoir » baisse du montant exact', Math.abs((rec0 - rec1) - f.rest) < 0.01, { rec0, rec1, rest: f.rest });
  v('A · l’Accueil : « reçu en octobre » monte du montant exact', Math.abs((enc1 - enc0) - f.rest) < 0.01, { enc0, enc1, rest: f.rest });
  await L.toucher(c, '[data-kdash="enc"]'); await p.waitForTimeout(500); const t1 = await corps(); const mc = t1.match(/(\d[\d ]*,\d{2}) € reçu en octobre/);
  v('A · Comptabilité dit le même nombre que l’Accueil', mc && Math.abs(num(mc[1]) - enc1) < 0.01, { compta: mc && mc[1], enc1 });
  await p.evaluate("stPer='mois'; stK=ST_FIN; stFiltreTech='tout';"); await L.aller(p, 'statistiques'); const ts = await corps();
  const ms = ts.match(/Encaissé TTC\s*([\d ]+) €/) || ts.match(/([\d ]+) € ?Encaissé/);
  const attendu = Math.round(enc1 - 40);   // les 40 € reçus sur place sont HORS de l'encaissé des Statistiques (dit à l'écran)
  v('A · Statistiques : « Encaissé TTC » = reçu en octobre moins les reçus sur place (arrondi à l’euro)', !!ms && Math.abs(num(ms[1]) - attendu) <= 1, { lu: ms && ms[1], attendu });
  // Historique : la ligne, puis la fiche
  await p.evaluate("hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique');
  await p.fill('[data-hcherche]', f.num); await p.waitForTimeout(500);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('.h-l')].map(e => e.innerText.replace(/\s+/g, ' ').slice(0, 140)));
  v('A · Historique : une recherche par numéro de facture rend la ligne « enregistré un paiement » (population ≥ 1)', lignes.length >= 1 && lignes.some(l => /enregistré un paiement/.test(l) && l.includes(String(f.rest.toFixed(2)).replace('.', ','))), lignes);
  await cap('A-historique');
  const hj = await p.evaluate(() => { const l = [...document.querySelectorAll('[data-hj]')].find(e => /paiement/.test(e.innerText)); return l ? l.dataset.hj : null; });
  await L.toucher(c, `[data-hj="${hj}"]`); await p.waitForTimeout(500);
  const ouvrir = p.locator('#calque .panneau button').filter({ hasText: /^Ouvrir/ }).first(); await L.toucher(c, ouvrir); await p.waitForTimeout(600);
  const pl = p.locator('#calque [data-plein]').first(); if (await pl.count()) { await L.toucher(c, pl); await p.waitForTimeout(500); }
  v('A · la ligne du règlement ouvre la fiche de la MÊME facture', (await hash()) === '#facture-x-' + f.id && (await corps()).includes(f.num), await hash());
  v('A · « Retour » ramène à l’Historique, recherche gardée', (await retour()) && (await hash()) === '#historique' && (await p.evaluate(() => (document.querySelector('[data-hcherche]') || {}).value)) === f.num, { h: await hash(), val: await p.evaluate(() => (document.querySelector('[data-hcherche]') || {}).value) });

  // ─────────────── B. un jour sans intervention, créer depuis l'Accueil
  await p.evaluate(() => { window.__sv = INTS.slice(); INTS.length = 0; }); await L.aller(p, 'accueil');
  v('B · l’Accueil vide dit « Rien de prévu aujourd’hui »', /Rien de prévu aujourd’hui/.test(await corps()));
  await cap('B-vide');
  const plan0 = await p.evaluate(() => (document.body.innerText.match(/(\d+) à planifier/) || [])[1] || null);
  const n0 = await p.evaluate(() => INTS.length), j0 = await p.evaluate(() => JOURNAL.length);
  await L.toucher(c, '#contenu [data-creer="1"]'); await p.waitForTimeout(700);
  const fen = await p.evaluate(() => !!document.querySelector('#fenetre .fen'));
  v('B · « ＋ Nouvelle intervention » ouvre la fenêtre de création', fen);
  await cap('B-fenetre');
  await L.toucher(c, '#fenetre [data-ccli="hp"]'); await L.toucher(c, '#fenetre [data-ctype="Entretien"]'); await L.toucher(c, '#fenetre [data-cdur="90"]');
  await L.toucher(c, '#fenetre [data-action="cPlusTard"]'); await L.toucher(c, '#fenetre [data-action="cCreer"]'); await p.waitForTimeout(700);
  const n1 = await p.evaluate(() => INTS.length), j1 = await p.evaluate(() => JOURNAL.length);
  v('B · « Créer l’intervention » : une intervention de plus, une ligne de journal de plus', n1 - n0 === 1 && j1 - j0 >= 1, { n0, n1, j0, j1 });
  await L.ranger(p); await L.aller(p, 'accueil');
  const ac = await corps();
  v('B · l’Accueil range la nouvelle intervention parmi celles à planifier', /à planifier/.test(ac), ac.slice(0, 300));
  await cap('B-apres');
  await p.evaluate(() => { window.__sv.forEach(x => INTS.push(x)); });   // on rend les interventions mises de côté SANS retirer celle qui vient d'être créée : la ligne du journal qui la nomme doit garder sa fiche

  // ─────────────── C. retours : la période des Statistiques, le filtre de l'Historique
  await p.evaluate("stPer='trimestre'; stK=ST_FIN; stFiltreTech='tout';"); await L.aller(p, 'statistiques');
  const per0 = await p.evaluate(() => { const b = document.querySelector('[data-stnav="-1"]'); return b ? b.parentElement.innerText.replace(/\s+/g, ' ').trim() : ''; });
  const tid = await p.evaluate(() => { const b = document.querySelector('[data-stdet^="tech-"]'); return b ? b.dataset.stdet : null; });
  v('C · population : une ligne technicien existe', !!tid, tid);
  await L.toucher(c, `[data-stdet="${tid}"]`); await p.waitForTimeout(600);
  const ou = p.locator('#calque .panneau button').filter({ hasText: /Ouvrir l’interven/ }).first();
  const ok1 = await ou.count() ? await L.toucher(c, ou) : false; await p.waitForTimeout(600);
  const pl2 = p.locator('#calque [data-plein]').first(); if (await pl2.count()) { await L.toucher(c, pl2); await p.waitForTimeout(500); }
  v('C · « Ouvrir l’intervention » du volet d’un technicien mène à une fiche d’intervention', ok1 && /^#inter-x-/.test(await hash()), await hash());
  v('C · « Retour » ramène aux Statistiques', (await retour()) && (await hash()) === '#statistiques', await hash());
  const per1 = await p.evaluate(() => { const b = document.querySelector('[data-stnav="-1"]'); return b ? b.parentElement.innerText.replace(/\s+/g, ' ').trim() : ''; });
  v('C · la période demandée (3 mois) est gardée au retour', !!per0 && per0 === per1, { per0, per1 });
  await p.evaluate("stPer='mois'");
  await p.evaluate("hQui='tous';hType='inter';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique');
  const nb0 = (await corps()).match(/(\d+) actions? trouvées?/);
  const hj2 = await p.evaluate(() => { const l = document.querySelector('[data-hj]'); return l ? l.dataset.hj : null; });
  v('C · population : le filtre « Interventions » rend au moins une ligne', !!hj2 && !!nb0, { hj2, nb0: nb0 && nb0[1] });
  await L.toucher(c, `[data-hj="${hj2}"]`); await p.waitForTimeout(500);
  const ou2 = p.locator('#calque .panneau button').filter({ hasText: /^Ouvrir/ }).first(); if (await ou2.count()) { await L.toucher(c, ou2); await p.waitForTimeout(600); }
  const pl3 = p.locator('#calque [data-plein]').first(); if (await pl3.count()) { await L.toucher(c, pl3); await p.waitForTimeout(500); }
  const h2 = await hash();
  v('C · une ligne d’intervention ouvre une fiche', /^#(inter-x|facture-x|client-x|devis-x|contrat-x)/.test(h2) || h2 !== '#historique', h2);
  v('C · « Retour » ramène à l’Historique', (await retour()) && (await hash()) === '#historique', await hash());
  const nb1 = (await corps()).match(/(\d+) actions? trouvées?/);
  v('C · le filtre « Interventions » est gardé au retour (même nombre)', !!nb0 && !!nb1 && nb0[1] === nb1[1], { nb0: nb0 && nb0[1], nb1: nb1 && nb1[1] });
  await cap('C-histo');

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
