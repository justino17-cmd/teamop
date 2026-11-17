// RESTES de l'Accueil, tour 1 : ce que le recontrôle adverse a laissé ouvert.
//  A. l'argent reçu sur place par un technicien a SA ligne dans l'Historique (au chargement, à « Terminer », à l'envoi de la facture), une seule fois ;
//  B. le bilan du mois (PDF) dit pourquoi il compte 40 € de moins que l'Accueil (« reçus sur place ») — la tuile, le tableau, la page du mois ;
//  C. le graphique des 12 mois, quand il défile (téléphone, iPad portrait), ne coupe plus son premier mois net : fondu à gauche + marge au bout.
// node accueil-restes-1.js [profil] [nuit] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe. Chaque contrôle compte sa population.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv.includes('nuit'), tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', nuit }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const cap = async n => { try { await L.capture(c, O.CAP + `restes1-${n}-${tag}.png`, false); } catch (e) {} };
  const lignes = () => p.evaluate(() => JOURNAL.filter(j => j.action === 'a noté un paiement reçu sur place').map(j => ({ qui: j.qui, det: j.det, el: j.el && j.el.id })));
  const ordre = () => p.evaluate(() => JOURNAL.map(j => j.action));

  // ── A1. au chargement : l'argent déjà reçu sur place (la tuile de l'Accueil le compte) a sa ligne
  const terrain = await p.evaluate(() => cpPaieTerrain().map(e => ({ int: e.int, ttc: e.ttc, mode: e.mode, tech: (INTS.find(i => i.id === e.int) || {}).tech })));
  v('A1 · population : l’Accueil compte de l’argent reçu sur place', terrain.length >= 1, terrain);
  const l0 = await lignes();
  v('A1 · chaque reçu sur place compté a UNE ligne dans l’Historique, au nom du technicien', terrain.every(t => l0.filter(l => l.el === t.int && l.qui === t.tech).length === 1) && l0.length === terrain.length, { terrain, l0 });
  v('A1 · la ligne dit le montant et le moyen (« 40,00 € · Espèces »)', terrain.every(t => l0.some(l => l.el === t.int && l.det.includes(String(t.ttc.toFixed(2)).replace('.', ',')) && l.det.includes(t.mode))), l0);
  await p.evaluate("hQui='tous';hType='facture';hCli='tous';hCherche='';hMax=60;hJourSel='tous';hOuverts=new Set([AUJ]);"); await L.aller(p, 'historique'); await L.calme(p, 400);
  const h = await corps();
  v('A1 · le filtre « Factures et paiements » montre la ligne', /a noté un paiement reçu sur place/.test(h), (h.match(/.{30}reçu sur place.{50}/) || [''])[0]);
  await cap('historique');
  // la ligne mène à la fiche de l'intervention
  const hj = await p.evaluate(() => { const e = [...document.querySelectorAll('[data-hj]')].find(x => /reçu sur place/.test(x.innerText)); return e ? e.dataset.hj : null; });
  v('A1 · population : la ligne est touchable', !!hj, hj);
  if (hj) { const ok = await L.toucher(c, `[data-hj="${hj}"]`, { delai: 4000 }); await p.waitForTimeout(400);
    const pan = await p.evaluate(() => { const q = document.querySelector('#calque .panneau'); return q ? { t: q.innerText.replace(/\s+/g, ' ').slice(0, 300), b: [...q.querySelectorAll('button')].map(b => b.textContent.trim()) } : null; });
    v('A1 · toucher la ligne ouvre un volet qui nomme l’intervention', ok && !!pan && terrain.some(t => new RegExp(t.mode).test(pan.t)) && pan.b.some(b => /^Ouvrir/.test(b)), pan);
    await L.ranger(p); }

  // ── A2. la technicienne note un acompte et termine : UNE ligne, après « a terminé »
  await p.evaluate(() => { reglages.auto = false; });
  const avant = (await lignes()).length;
  await L.aller(p, 'accueil');
  await p.evaluate(() => { try { sessionFermer('essai'); } catch (e) {} route = 'accueil'; param = null; sessionOuvrir('sm'); });
  await L.aller(p, 'inter-x-i1'); await L.calme(p, 400);
  await p.evaluate(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Roulement du ventilateur remplacé.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Roulement ventilateur', q: '1', pu: 35.5 }]; F.paiement = { etat: 'acompte', mode: 'Chèque', montant: '40,50', ticket: false }; });
  await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 600); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
  const l1 = await lignes(), o1 = await ordre();
  v('A2 · à « Terminer » avec un acompte : une ligne de plus, au nom de la technicienne', l1.length === avant + 1 && l1[l1.length - 1].qui === 'sm', l1);
  v('A2 · la ligne dit « 40,50 € · Chèque »', /40,50 €/.test(l1[l1.length - 1].det.replace(/[\u00a0\u202f]/g, ' ')) && /Chèque/.test(l1[l1.length - 1].det), l1[l1.length - 1]);
  v('A2 · elle vient APRÈS « a terminé l’intervention »', o1.lastIndexOf('a terminé l’intervention') >= 0 && o1.lastIndexOf('a terminé l’intervention') < o1.lastIndexOf('a noté un paiement reçu sur place'), o1.slice(-4));
  v('A2 · un second appel pour la même intervention ne double pas la ligne', await p.evaluate(() => { const n = JOURNAL.length; journalPaieTerrain(INTS.find(i => i.id === 'i1'), fiche('i1').paiement, 40.5); return JOURNAL.length === n; }));
  // sans paiement noté : aucune ligne
  v('A2 · contre-épreuve : « Pas encore payé » ne fait pas de ligne', await p.evaluate(() => { const n = JOURNAL.length; journalPaieTerrain(INTS.find(i => i.id === 'i1'), { etat: 'rien', mode: 'Carte', montant: '' }, 0); return JOURNAL.length === n; }));

  // ── A3. envoi automatique + total sans montant : la ligne naît à l'envoi (le montant est celui de la facture), sans doublon
  await p.evaluate(() => { ACTIONS.recommencer(); reglages.auto = true; });
  await L.aller(p, 'inter-x-i1'); await L.calme(p, 400);
  await p.evaluate(() => { const F = fiche('i1'); tousControles(F).forEach(k => F.coches[k] = true); F.compte = 'Roulement du ventilateur remplacé.'; F.signature = 'signee'; F.suite = { entretien: false }; F.pieces = [{ nom: 'Roulement ventilateur', q: '1', pu: 35.5 }]; F.paiement = { etat: 'total', mode: 'Espèces', montant: '', ticket: false }; });
  const avant3 = (await lignes()).length;
  await L.toucher(c, '[data-action="terminer"]', { delai: 4000 }); await L.calme(p, 700); if ((await L.etat(p)).panneau) await L.toucher(c, p.getByRole('button', { name: /C’est bon/ }).first());
  const l3 = await lignes(), f3 = await p.evaluate(() => { const f = FACTURES.find(x => x.int === 'i1' && x.st !== 'annulee'); return f && { st: f.st, ttc: ttcDe(f), recu: f.recu }; });
  v('A3 · population : la facture est partie et payée sur place', !!f3 && f3.st === 'payee' && f3.recu > 0, f3);
  v('A3 · une seule ligne de plus (l’envoi automatique de la facture et la fin de l’intervention ne la doublent pas)', l3.length === avant3 + 1, l3.slice(avant3));
  v('A3 · le montant de la ligne est celui de la facture', !!f3 && l3.length > avant3 && l3[l3.length - 1].det.includes(f3.ttc.toFixed(2).replace('.', ',')), { l: l3[l3.length - 1], f3 });
  await p.evaluate(() => { reglages.auto = false; });

  // ── B. le bilan du mois (PDF) dit les reçus sur place (état de départ de la page : on rouvre pour des données propres)
  await p.reload(); await p.waitForTimeout(1200);
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 400);
  const surPlace = await p.evaluate(() => cpPaieTerrain().reduce((s, e) => s + e.ttc, 0));
  v('B · population : de l’argent reçu sur place existe à nouveau au chargement', surPlace > 0, surPlace);
  await L.toucher(c, '[data-stbilan="1"]', { delai: 4000 }); await p.waitForTimeout(700);
  const bil = await p.evaluate(() => (document.querySelector('#calque') || document.body).innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));
  const eur2 = n => n.toFixed(2).replace('.', ',') + ' €';
  v('B · le tableau dit « Non compris : 40,00 € reçus sur place, pas encore sur une facture »', bil.includes('Non compris : ' + eur2(surPlace) + ' reçus sur place, pas encore sur une facture'), (bil.match(/.{30}reçus sur place.{60}/) || [''])[0]);
  const nHors = (bil.match(/hors \d[\d ]* € reçus sur place/g) || []).length;   // la synthèse ET la page d'octobre portent chacune la tuile : deux occurrences
  v('B · la tuile « Encaissé » du bilan le dit aussi, sur la synthèse ET sur la page du mois (hors X € reçus sur place)', nHors >= 2, { nHors, extrait: (bil.match(/.{40}hors.{40}/) || [''])[0] });
  v('B · le nombre du bilan est toujours « l’encaissé » de la période (pas le total avec le terrain)', /Encaissé sur la période.{0,120}?3 045,00 €/.test(bil), (bil.match(/Encaissé sur la période.{0,120}/) || [''])[0]);
  await cap('bilan'); await L.ranger(p);

  // ── C. le graphique des 12 mois
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 600);
  const g = await p.evaluate(() => { const e = document.querySelector('.st-graph'); if (!e) return null; const cs = getComputedStyle(e), defile = e.scrollWidth > e.clientWidth + 1;
    const cols = [...e.querySelectorAll('.st-col')]; const fin = defile ? -(e.scrollWidth - e.clientWidth) : 0; if (defile) e.scrollLeft = fin;
    const r = e.getBoundingClientRect(), r0 = cols[0].getBoundingClientRect(), r1 = cols[cols.length - 1].getBoundingClientRect();
    return { defile, mask: cs.maskImage || cs.webkitMaskImage, pad: parseFloat(cs.paddingLeft), debut: Math.round(r0.left - r.left), fin: Math.round(r.right - r1.right), n: cols.length, w: Math.round(r.width) }; });
  v('C · population : le graphique existe avec ses 12 mois', !!g && g.n === 12, g);
  if (g && g.defile) {
    v('C · il défile : un fondu à gauche (masque) et 30 px de marge', /gradient/.test(g.mask) && g.pad === 30, g);
    v('C · au bout du défilement, le premier mois est ENTIER (son bord gauche est après la marge)', g.debut >= 29, g);
    await p.evaluate(() => { const e = document.querySelector('.st-graph'); e.scrollLeft = 0; }); await p.waitForTimeout(200);
    const dr = await p.evaluate(() => { const e = document.querySelector('.st-graph'), cols = [...e.querySelectorAll('.st-col')], r = e.getBoundingClientRect(), r1 = cols[cols.length - 1].getBoundingClientRect(); return Math.round(r.right - r1.right); });
    v('C · calé à droite, le dernier mois (octobre) reste entier', dr >= 0, dr);
    await p.evaluate(() => { document.querySelector('.st-graph').scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(300); await cap('graphique');
  } else v('C · il ne défile pas (ordinateur) : ni masque ni marge ajoutés', !!g && !g.defile && (!g.mask || g.mask === 'none') && g.pad !== 30, g);

  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
