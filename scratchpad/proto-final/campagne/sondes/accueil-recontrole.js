// RECONTRÔLE ADVERSE de la partie « accueil » : rejoue, d'un œil neuf et par les VRAIS boutons, les défauts annoncés corrigés, puis cherche ce que
// les corrections ont cassé à côté. node accueil-recontrole.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Chaque contrôle compte sa population.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const cap = async n => { try { await L.capture(c, O.CAP + `recontrole-${n}-${tag}.png`, false); } catch (e) {} };
  const eur2 = n => n.toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' €';

  // ── accueil-01 : la tuile de l'Accueil, la page où elle mène, et le calcul fait ICI depuis les données (pas depuis la page)
  await L.aller(p, 'accueil'); await L.calme(p, 500);
  const calc = await p.evaluate(() => { const oct = ENCAISSEMENTS.filter(e => /\/10$/.test(e.d)); const terrain = cpPaieTerrain(); return { n: oct.length, somme: oct.reduce((s, e) => s + e.ttc, 0) + terrain.reduce((s, e) => s + e.ttc, 0), nTerrain: terrain.length }; });
  const ac = await corps();
  const m1 = ac.match(/(\d[\d ]*,\d{2}) € reçu en octobre/);
  v('accueil-01 · la tuile « reçu en octobre » existe et le nombre est lu (population : des encaissements d’octobre existent)', !!m1 && calc.n >= 3, { m1: m1 && m1[0], calc });
  await cap('accueil-haut');
  await L.toucher(c, '[data-kdash="enc"]'); await p.waitForTimeout(600);
  const cp = await corps(); const m2 = cp.match(/(\d[\d ]*,\d{2}) € reçu en octobre/);
  v('accueil-01 · la tuile mène à Comptabilité, qui dit le même nombre avec les mêmes mots', !!m2 && !!m1 && m1[1].replace(/\s/g, '') === m2[1].replace(/\s/g, ''), { accueil: m1 && m1[1], compta: m2 && m2[1], hash: await p.evaluate(() => location.hash) });
  v('accueil-01 · et ce nombre est la somme RECALCULÉE des encaissements d’octobre des données', !!m2 && Math.abs(parseFloat(m2[1].replace(/\s/g, '').replace(',', '.')) - calc.somme) < 0.02, { compta: m2 && m2[1], recalc: calc.somme });
  await cap('compta-arrivee');
  // les Statistiques : leur « encaissé » ne contredit pas
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); const st = await corps();
  const sm = st.match(/(\d[\d ]*) € TTC.{0,60}hors (\d[\d ]*,?\d*) €/) || st.match(/encaissé.{0,80}/i);
  v('accueil-01 · Statistiques : l’encaissé du mois est dit, avec son « hors … reçus sur place »', /hors \d[\d ]* € reçus sur place/.test(st), st.slice(0, 500));

  // ── accueil-03 : un règlement par le VRAI bouton « Virement » de la fiche facture, puis ce que l'Historique montre ET où mène la ligne
  const fid = await p.evaluate(() => (FACTURES.find(x => ['envoyee', 'retard'].includes(x.st) && restant(x) > 30) || {}).id);
  v('accueil-03 · population : une facture à régler existe', !!fid, fid);
  await L.aller(p, 'facture-x-' + fid); await L.calme(p, 400);
  const av = await p.evaluate(id => { const f = FACTURES.find(x => x.id === id); return { j: JOURNAL.length, e: ENCAISSEMENTS.length, num: f.num, rest: restant(f) }; }, fid);
  await L.toucher(c, `[data-payer="${fid}|Virement"]`); await p.waitForTimeout(700);
  const ap = await p.evaluate(() => ({ j: JOURNAL.length, e: ENCAISSEMENTS.length, der: JOURNAL[JOURNAL.length - 1], etat: location.hash }));
  v('accueil-03 · « Virement » de la fiche : un encaissement ET une seule ligne de journal', ap.e - av.e === 1 && ap.j - av.j === 1, { av, ap: { j: ap.j, e: ap.e } });
  v('accueil-03 · la ligne dit qui, quoi, quelle facture, combien', /enregistré un paiement/.test(ap.der.action) && ap.der.el.lib === av.num && /Virement/.test(ap.der.det), ap.der);
  await cap('facture-apres-virement');
  // le toast « Annuler » est là, et l'annulation écrit sa ligne
  const annule = await p.evaluate(() => { const b = document.querySelector('#toast button'); return b ? b.textContent.trim() : null; });
  v('accueil-03 · le toast propose « Annuler »', annule === 'Annuler', annule);
  const j1 = await p.evaluate(() => JOURNAL.length); await L.toucher(c, '#toast button'); await p.waitForTimeout(500);
  const an = await p.evaluate(() => ({ j: JOURNAL.length, der: JOURNAL[JOURNAL.length - 1] }));
  v('accueil-03 · « Annuler » : une ligne de plus, « a annulé le paiement », la facture est de nouveau à régler', an.j - j1 === 1 && /annulé le paiement/.test(an.der.action) && await p.evaluate(id => restant(FACTURES.find(x => x.id === id)) > 0, fid), an.der);
  // un paiement DEUX fois de suite (double clic) : deux lignes, pas trois, pas zéro
  // ── les écritures d'encaissement ne sont écrites que par des fonctions qui journalisent : recensement dans le CODE de la page (population des chemins)
  const chemins = await p.evaluate(async () => { const r = await fetch(location.pathname).then(x => x.text()); const lignes = r.split('\n'); const out = [];
    lignes.forEach((l, i) => { if (/ENCAISSEMENTS\.(unshift|push)\(/.test(l) && !/^\s*(\/\/|\/\*)/.test(l)) { const fenetre = lignes.slice(i, i + 3).join('\n'); out.push({ ligne: i + 1, journalise: /journalPaiement\(/.test(fenetre), extrait: l.trim().slice(0, 70) }); } }); return out; });
  console.log('  · écrivains d’encaissement :', JSON.stringify(chemins.map(x => [x.ligne, x.journalise])));
  v('accueil-03 · recensement : cinq écrivains d’encaissement lus dans le code', chemins.length >= 5, chemins.length);
  v('accueil-03 · tous journalisent, sauf l’envoi de facture du technicien (dit exprès)', chemins.filter(x => !x.journalise).length <= 1, chemins.filter(x => !x.journalise));

  // l'encaissement du technicien à l'envoi de sa facture : apparaît-il QUELQUE PART dans l'Historique ?
  const tech = await p.evaluate(() => { const f = FACTURES.find(x => x.st === 'brouillon' || x.num === '—'); return f ? f.id : null; });
  console.log('  · facture brouillon pour l’essai du technicien :', tech);

  // ── Historique : la ligne neuve s'affiche ET mène à la facture
  await p.evaluate(() => { hQui = 'tous'; hType = 'facture'; hCli = 'tous'; hCherche = ''; hMax = 40; hOuverts.add(AUJ); }); await L.aller(p, 'historique'); await L.calme(p, 400);
  const lignes = await p.evaluate(() => [...document.querySelectorAll('#contenu [data-hl], #contenu [data-hligne], #contenu .h-ligne')].length);
  const hi = await corps();
  v('accueil-03 · l’Historique, sujet « Factures et paiements », montre la ligne du règlement fait ici', /enregistré un paiement|payé en ligne/.test(hi), hi.slice(0, 400));
  await cap('historique-paiement');

  // ── accueil-08 : les parts à 100 dans le bilan PDF aussi
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques');
  const bil = await p.evaluate(() => { const b = document.querySelector('[data-stbilan]'); if (!b) return null; b.click(); return true; }); await p.waitForTimeout(700);
  const txtBilan = await p.evaluate(() => (document.querySelector('#calque')||document.body).innerText.replace(/\s+/g, ' '));
  const parts = [...txtBilan.matchAll(/(Virement|Carte|Chèque|Espèces)[^%]{0,40}?(\d+) ?%/g)].map(m => +m[2]);
  v('accueil-08 · bilan du mois : au moins deux parts lues (population) et leur somme fait 100', parts.length >= 2 && parts.reduce((s, x) => s + x, 0) === 100, { parts, extrait: txtBilan.slice(0, 200) });
  await cap('bilan'); await L.ranger(p);

  // ── accueil-10 : plus de sigle dans les trois écrans ni leurs volets
  const sigles = [];
  for (const vue of ['accueil', 'statistiques', 'historique']) { await L.aller(p, vue); const t = await corps(); const m = t.match(/\b(PAC|DR|BL|TVA intra|KPI|CA|ETP)\b/g); if (m) sigles.push([vue, m.slice(0, 4)]); }
  v('accueil-10 · aucun sigle de métier (PAC, KPI, CA, DR…) sur les trois écrans', sigles.length === 0, sigles);

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
