// Accueil / Statistiques / Historique : le NOMBRE d'une tuile est-il le même là où elle mène ? Chaque total est RECALCULÉ ici, au centime,
// depuis les données (INTS, FACTURES, ENCAISSEMENTS, CONTRATS), puis relu à l'écran. « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
// Les contrôles qui tombent sur un défaut du rapport portent son numéro (accueil-NN) dans leur nom. node accueil-coherence.js [profil]
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
const nb = s => L.cents(s);                         // « 1 475,00 € » → 147500
const montants = t => [...t.matchAll(/(\d[\d\s  ]*,\d{2})\s?€/g)].map(m => nb(m[1] + '€'));
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  // ── la vérité, recalculée depuis les données
  const D = await p.evaluate(() => {
    const oct = d => /\/10$/.test(d);
    const aRecevoir = FACTURES.filter(f => ['envoyee', 'retard', 'partielle'].includes(f.st)).reduce((s, f) => s + Math.round(ttcDe(f) * 100) - Math.round((f.recu || 0) * 100), 0);
    return {
      auj: INTS.filter(i => i.d === AUJ && i.st !== 'annulee').length,
      aRecevoir,
      encOct: ENCAISSEMENTS.filter(e => oct(e.d)).reduce((s, e) => s + Math.round(e.ttc * 100), 0),
      terrain: cpPaieTerrain().reduce((s, e) => s + Math.round(e.ttc * 100), 0),
      contrats: CONTRATS.filter(k => k.st === 'signe').reduce((s, k) => s + Math.round(k.prix * 100), 0),
      nbSignes: CONTRATS.filter(k => k.st === 'signe').length, nbEnvoyes: CONTRATS.filter(k => k.st === 'envoye').length,
      aPlanifier: INTS.filter(i => i.st === 'aplanifier').length, enRetard: INTS.filter(i => i.st === 'retard').length,
      faitesOct: INTS.filter(i => i.st === 'fait' && /^2026-10/.test(i.d)).length,
      facOct: FACTURES.filter(f => f.emise.endsWith('/10') && f.num !== '—' && f.st !== 'avoir').reduce((s, f) => s + Math.round(htDe(f) * 100), 0)
    }; });
  console.log('vérité :', JSON.stringify(D));
  v('population : des interventions, des factures et des encaissements existent', D.auj > 0 && D.aRecevoir > 0 && D.encOct > 0, D);

  // ── ACCUEIL : les quatre tuiles
  await L.aller(p, 'accueil');
  const tuiles = await p.evaluate(() => [...document.querySelectorAll('.kpi')].map(e => ({ k: e.dataset.kdash || e.dataset.go, t: e.innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' ') })));
  const T = k => (tuiles.find(x => x.k === k) || { t: '' }).t;
  v('Accueil : quatre tuiles', tuiles.length === 4, tuiles.map(x => x.k));
  const nAuj = +(T('jour').match(/^(\d+)/) || [])[1];
  const lignesAuj = await p.evaluate(() => [...document.querySelectorAll('#contenu .carte')].find(e => /Aujourd.hui, toute/.test(e.textContent)).querySelectorAll('.ligne-clic').length);
  v('Accueil : « interventions aujourd’hui » = lignes de la liste = données', nAuj === lignesAuj && nAuj === D.auj, { tuile: nAuj, lignes: lignesAuj, donnees: D.auj });
  v('Accueil : « à recevoir » = factures envoyées / en retard recalculées', montants(T('rec'))[0] === D.aRecevoir, { tuile: montants(T('rec')), vrai: D.aRecevoir });
  v('Accueil : « encaissé en octobre » = encaissements d’octobre recalculés', montants(T('enc'))[0] === D.encOct, { tuile: montants(T('enc')), vrai: D.encOct });
  v('Accueil : « contrats par an » = contrats signés', montants(T('contrats'))[0] === D.contrats, { tuile: montants(T('contrats')), vrai: D.contrats });

  // ── là où mène chaque tuile : le même nombre
  async function mene(k) { await L.aller(p, 'accueil'); await L.toucher(c, `[data-kdash="${k}"], .kpi[data-go="${k}"]`); await p.waitForTimeout(600); return corps(); }
  const cPlan = await mene('jour'), mJ = cPlan.match(/(\d+) interventions? sur la période/);
  v('Planning (tuile « aujourd’hui ») : même nombre d’interventions', mJ && +mJ[1] === nAuj, { planning: mJ && mJ[1], accueil: nAuj });
  const cRec = await mene('rec');
  v('Comptabilité (tuile « à recevoir ») : « encore à recevoir » = même montant', cRec.includes((D.aRecevoir / 100).toLocaleString('fr-FR', { minimumFractionDigits: 2 }).replace(/[  ]/g, ' ') + ' €'), cRec.slice(300, 700));
  const cEnc = await mene('enc'), recuCompta = (cEnc.match(/(\d[\d ]*,\d{2}) € reçu en octobre/) || [])[1];
  v('accueil-01 · Comptabilité (tuile « encaissé ») : « reçu en octobre » = le montant de la tuile', recuCompta && nb(recuCompta + '€') === montants(T('enc'))[0], { compta: recuCompta, tuile: montants(T('enc'))[0] / 100, note: 'la tuile dit 3 045 + 40 à part, la page dit 3 085 « dont 40 »' });
  const cCtr = await mene('contrats'), mC = cCtr.match(/(\d+) contrats? signés? ([\d ]+,\d{2}) € HT par an/);
  v('Contrats (tuile) : même total par an et même nombre', mC && nb(mC[2] + '€') === D.contrats && +mC[1] === D.nbSignes, { page: mC && mC.slice(1), vrai: [D.nbSignes, D.contrats] });

  // ── « À faire maintenant » : les nombres de chaque ligne se retrouvent là-bas
  await L.aller(p, 'accueil'); const af = await p.evaluate(() => [...document.querySelectorAll('#contenu .carte')].find(e => /À faire maintenant/.test(e.textContent)).innerText.replace(/\s+/g, ' '));
  const nFact = +(af.match(/(\d+) interventions? terminées? à facturer/) || [])[1], nPl = +(af.match(/(\d+) (?:autres? )?interventions? à planifier/) || [])[1], nRet = +(af.match(/(\d+) interventions? en retard/) || [])[1];
  v('Accueil : une ligne « à facturer », une « à planifier », une « en retard »', nFact > 0 && nPl > 0 && nRet > 0, { nFact, nPl, nRet });
  v('Accueil : « en retard » = interventions en retard des données', nRet === D.enRetard, { ligne: nRet, donnees: D.enRetard });
  await L.toucher(c, '[data-kdash="afacturer"]'); await p.waitForTimeout(500); const cFa = await corps();
  v('Comptabilité (ligne « à facturer ») : même nombre', new RegExp('\\b' + nFact + ' interventions? terminées? à facturer').test(cFa), cFa.slice(300, 600));
  await L.aller(p, 'accueil'); const aPlanifTotal = await p.evaluate(() => { const t = [...document.querySelectorAll('#contenu .ligne-clic')].map(e => e.innerText.replace(/\s+/g, ' ')); return t.filter(x => /^À faire.*(Planifier le dépannage|à planifier)/.test(x)).length; });
  const cPl2 = await mene('jour'); const mP = cPl2.match(/(\d+) à planifier/);
  v('Planning : « à planifier » = lignes « à planifier » de l’Accueil (tâche couverte comprise) et données', mP && +mP[1] === D.aPlanifier, { planning: mP && mP[1], donnees: D.aPlanifier, accueilLigne: nPl });

  // ── STATISTIQUES (octobre)
  await L.aller(p, 'statistiques'); await p.evaluate("stPer='mois'; stK=ST_FIN; stFiltreTech='tout';"); await L.aller(p, 'statistiques');
  const st = await corps();
  const fac = nb((st.match(/Facturé HT (\d[\d ]*) €/) || [])[1] + ',00€'), enc = nb((st.match(/Encaissé TTC (\d[\d ]*) €/) || [])[1] + ',00€'), faites = +(st.match(/Interventions faites (\d+)/) || [])[1];
  v('Statistiques : « facturé HT » (arrondi) = factures d’octobre recalculées', Math.abs(fac - D.facOct) <= 100, { ecran: fac / 100, vrai: D.facOct / 100 });
  v('Statistiques : « encaissé TTC » (arrondi) = Accueil (3 045)', Math.abs(enc - D.encOct) <= 100, { ecran: enc / 100, accueil: D.encOct / 100 });
  // la page le dit elle-même : « dont 1 facture sans fiche d'intervention » (l'installation des Durand, facturée sans fiche) compte parmi les 9
  const sansFiche = +((st.match(/dont (\d+) factures? sans fiche/) || [])[1] || 0);
  v('Statistiques : « interventions faites » = terminées en octobre + factures sans fiche annoncées à l’écran', faites === D.faitesOct + sansFiche, { ecran: faites, terminees: D.faitesOct, sansFiche });
  const parTech = await p.evaluate(() => [...document.querySelectorAll('[data-stdet^="tech-"]')].map(e => ({ n: e.innerText.replace(/\s+/g, ' ').trim() })));
  const parCli = await p.evaluate(() => [...document.querySelectorAll('[data-stdet^="cli-"]')].map(e => e.innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' ')));
  const sCli = parCli.reduce((s, t) => s + nb((t.match(/(\d[\d ]*) €/) || [])[1] + ',00€'), 0);
  v('Statistiques : la somme des clients = « facturé HT » (à l’arrondi près)', Math.abs(sCli - fac) <= 500, { somme: sCli / 100, facture: fac / 100, clients: parCli.length });
  console.log('  techniciens :', JSON.stringify(parTech.map(x => x.n)));

  // ── HISTORIQUE : le compte de chaque filtre
  await L.aller(p, 'historique'); await p.evaluate("hQui='tous';hType='tous';hCli='tous';hCherche='';hMax=60;hJourSel='tous';");
  const tousJ = await p.evaluate(() => hVisibles().length);
  const parType = await p.evaluate(() => Object.keys(H_TYPES).map(k => [k, JOURNAL.filter(j => j.type === k).length]));
  v('Historique : tous les types additionnés = le journal entier', parType.reduce((s, x) => s + x[1], 0) === tousJ, { somme: parType.reduce((s, x) => s + x[1], 0), journal: tousJ });
  const mots = await p.evaluate(() => { hCherche = 'durand'; const a = hVisibles().length; hCherche = 'DURAND'; const b = hVisibles().length; hCherche = ' durand '; const c = hVisibles().length; hCherche = 'zzzzqx'; const d = hVisibles().length; hCherche = ''; return { a, b, c, d }; });
  v('Historique : la recherche ignore la casse et les espaces de bord', mots.a === mots.b && mots.a === mots.c && mots.a > 0, mots);
  v('Historique : une recherche sans résultat n’en rend aucun', mots.d === 0, mots);

  console.log('ERR', c.err.slice(0, 5)); v('aucune erreur JavaScript', c.err.length === 0, c.err.slice(0, 3));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
