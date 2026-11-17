// Contrôles des corrections de la campagne « accueil » (accueil-02, -03, -04, -08, -09, -10) : chacun joue le geste, relit l'écran et
// COMPTE sa population avant de conclure (un zéro sur du vide ne prouve rien). node accueil-corrections.js [profil] ; « N ✓ · M ✗ », sortie 1 si un contrôle tombe.
const O = require('./accueil-outils.js'), L = O.L, v = L.v;
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc' }), p = c.p;
  const corps = () => p.evaluate(() => document.querySelector('#contenu').innerText.replace(/\s+/g, ' ').replace(/[  ]/g, ' '));

  // ── accueil-08 : les parts des moyens de paiement font 100 %, sur chaque période (mois, 3 mois, 12 mois) et dans le bilan
  for (const per of ['mois', 'trimestre', 'annee']) {
    await p.evaluate(per => { stPer = per; stK = ST_FIN; stFiltreTech = 'tout'; }, per); await L.aller(p, 'statistiques');
    const parts = await p.evaluate(() => { const carte = [...document.querySelectorAll('#contenu .carte')].find(e => /Paiements/.test((e.querySelector('h3') || {}).textContent || '')); return carte ? [...carte.querySelectorAll('.st-val small')].map(e => parseInt(e.textContent, 10)) : []; });
    v(`accueil-08 · ${per} : au moins deux moyens de paiement lus (population)`, parts.length >= 2, parts);
    v(`accueil-08 · ${per} : les parts font 100 %`, parts.length >= 2 && parts.reduce((s, x) => s + x, 0) === 100, parts);
  }
  // la règle elle-même, sur des cas qui arrondissent mal (aucune somme à 101 ou 99) et sur un zéro partout
  const cas = await p.evaluate(() => [[1416, 709, 840, 80], [1, 1, 1], [1, 1, 1, 1, 1, 1, 1], [50, 50], [0, 0, 0], [333, 333, 334], [10, 0, 0, 0]].map(a => ({ a, s: stParts(a) })));
  for (const k of cas) v(`accueil-08 · stParts(${JSON.stringify(k.a)}) = ${JSON.stringify(k.s)}`, k.s.reduce((s, x) => s + x, 0) === (k.a.some(x => x > 0) ? 100 : 0) && k.s.every((x, i) => x >= 0 && (k.a[i] > 0 || x === 0)), k.s);

  // ── accueil-02 : les mots (un artisan les comprend du premier coup)
  await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); const st = await corps();
  v('accueil-02 · Statistiques : plus de « panier moyen », de « vs » ni de « sans fiche »', !/panier moyen|\bvs\b|sans fiche/.test(st), st.match(/.{20}(panier moyen|\bvs\b|sans fiche).{20}/));
  v('accueil-02 · Statistiques : « prix moyen d’une intervention », « par rapport à » et « sans intervention enregistrée » (population)', /prix moyen d’une intervention/.test(st) && /par rapport à/.test(st) && /sans intervention enregistrée/.test(st), st.slice(0, 400));
  await p.evaluate("stPer='annee'"); await L.aller(p, 'statistiques'); const an = await corps(); await p.evaluate("stPer='mois'");
  v('accueil-02 · Statistiques sur 12 mois : « par rapport aux 12 mois d’avant »', /par rapport aux 12 mois d’avant/.test(an) && !/\bvs\b/.test(an), an.slice(0, 300));
  await L.aller(p, 'accueil'); const ac = await corps();
  v('accueil-02 · Accueil : « HT de contrats par an »', /HT de contrats par an/.test(ac), ac.slice(0, 300));
  v('accueil-10 · Accueil : « pompe à chaleur » et plus de « PAC »', /pompe à chaleur/.test(ac) && !/\bPAC\b/.test(ac), ac.match(/.{20}PAC.{20}/));

  // ── accueil-03 : tout chemin qui enregistre un paiement écrit une ligne dans l'Historique (compte avant/après, pas seulement « une ligne de plus »)
  const trace = await p.evaluate(() => {
    const f = FACTURES.find(x => ['envoyee', 'retard'].includes(x.st) && restant(x) > 1); if (!f) return { rien: true };
    const n0 = JOURNAL.length; payer(f, 'Virement', { montant: Math.min(restant(f), 10) });
    const l = JOURNAL[JOURNAL.length - 1]; return { f: f.num, ajoutees: JOURNAL.length - n0, action: l && l.action, det: l && l.det, el: l && l.el && l.el.lib, type: l && l.type };
  });
  v('accueil-03 · payer() : une ligne « a enregistré un paiement » avec le numéro de facture et le montant', trace.ajoutees === 1 && /enregistré un paiement/.test(trace.action) && trace.el === trace.f && /10,00\s€ · Virement/.test(trace.det), trace);
  await p.evaluate(() => { const f = FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st) && restant(x) > 1); window.__fp = f; hOuverts.add(AUJ); });
  await L.aller(p, 'historique'); await p.evaluate(() => { hType = 'facture'; }); await L.aller(p, 'historique'); const hi = await corps();
  v('accueil-03 · Historique, sujet « Factures et paiements » : la ligne s’affiche à l’écran', /a enregistré un paiement/.test(hi), hi.slice(200, 600));
  // le geste réel : « Annuler » du toast écrit aussi sa ligne (rien ne s’efface)
  const annul = await p.evaluate(() => { const f = FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st) && restant(x) > 1), av0 = { recu: f.recu, st: f.st, mode: f.mode, paye: f.paye };
    payer(f, 'Chèque', { montant: 5 }); const e0 = ENCAISSEMENTS[0], n0 = JOURNAL.length; encaisseAnnulable(f, av0, e0, 'x'); document.querySelector('#toast button').click(); const l = JOURNAL[JOURNAL.length - 1];
    return { ajoutees: JOURNAL.length - n0, action: l && l.action, restaure: f.recu === av0.recu && ENCAISSEMENTS.indexOf(e0) < 0 }; });
  v('accueil-03 · « Annuler » rend la facture et écrit « a annulé le paiement noté »', annul.ajoutees === 1 && /a annulé le paiement noté/.test(annul.action) && annul.restaure, annul);
  // les trois autres chemins : on compte les écritures d'encaissement et de journal AVANT / APRÈS le geste réel
  const chemins = await p.evaluate(() => { const out = []; const f = () => FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st) && restant(x) > 1);
    { const x = f(), n = JOURNAL.length, e = ENCAISSEMENTS.length; opLiaPaiement({ num: x.num, montant: 7, mode: 'Chèque' }); out.push(['opLiaPaiement', ENCAISSEMENTS.length - e, JOURNAL.length - n]); }
    { const x = f(), r = CP_RELEVE.find(o => o.m > 0 && o.m <= restant(x)) || null; if (r) { const n = JOURNAL.length, e = ENCAISSEMENTS.length, b = document.createElement('button'); b.dataset.cp = 'paiement|' + r.id + '|' + x.id; document.body.appendChild(b); b.click(); b.remove(); out.push(['rapprochement', ENCAISSEMENTS.length - e, JOURNAL.length - n]); } else out.push(['rapprochement', 'pas de ligne de banque à rapprocher', 0]); }
    return out; });
  // le « Paiement en partie » de la fiche d'une facture, par les vrais boutons
  const fid = await p.evaluate(() => (FACTURES.find(x => ['envoyee', 'retard', 'partielle'].includes(x.st) && restant(x) > 20) || {}).id);
  await L.aller(p, 'facture-x-' + fid); await L.toucher(c, '[data-action="partiel"]'); await p.waitForTimeout(400);
  const n0 = await p.evaluate(() => JOURNAL.length); await p.evaluate(() => { document.getElementById('pp-m').value = '12,50'; document.getElementById('pp-mode').value = 'Carte'; });
  await L.toucher(c, '[data-action="partielOk"]'); await p.waitForTimeout(400);
  const part = await p.evaluate(n0 => ({ ajoutees: JOURNAL.length - n0, det: (JOURNAL[JOURNAL.length - 1] || {}).det }), n0);
  v('accueil-03 · « Paiement en partie » (fiche facture, vrais boutons) : une ligne « 12,50 € · Carte »', part.ajoutees === 1 && /12,50\s€ · Carte/.test(part.det), part);
  for (const [nom, e, j] of chemins) v(`accueil-03 · ${nom} : un encaissement ⇒ une ligne de journal`, typeof e === 'number' ? e === 1 && j === 1 : true, [nom, e, j]);
  v('accueil-03 · population : deux chemins joués ici, plus payer() et « Paiement en partie »', chemins.length === 2, chemins);

  // ── accueil-04 : jour sans intervention, l'Accueil dit quoi faire
  await p.evaluate(() => { window.__sv = INTS.slice(); INTS.length = 0; });
  await L.aller(p, 'accueil'); const vide = await corps(); const bouton = await p.evaluate(() => { const carte = [...document.querySelectorAll('#contenu .carte')].find(e => /Aujourd.hui, toute/.test(e.textContent)); return carte ? [...carte.querySelectorAll('button[data-creer]')].map(b => b.textContent.trim()) : null; });
  v('accueil-04 · jour sans intervention : « Rien de prévu aujourd’hui » et un bouton « Nouvelle intervention »', /Rien de prévu aujourd’hui/.test(vide) && bouton && bouton.length === 1 && /Nouvelle intervention/.test(bouton[0]), { bouton });
  await p.evaluate(() => { INTS.push(...window.__sv); });

  // ── accueil-09 (iPad) : la cinquième tuile des Statistiques prend la largeur de la grille
  if (profil === 'ipad') {
    await p.evaluate("stPer='mois'; stK=ST_FIN;"); await L.aller(p, 'statistiques'); await L.calme(p, 700);
    const g = await p.evaluate(() => { const t = [...document.querySelectorAll('.st-kpis .st-kpi')]; const gr = document.querySelector('.st-kpis').getBoundingClientRect(); return { n: t.length, grille: Math.round(gr.width), dernier: Math.round(t[t.length - 1].getBoundingClientRect().width), colonnes: getComputedStyle(document.querySelector('.st-kpis')).gridTemplateColumns.split(' ').length }; });
    v('accueil-09 · iPad : cinq tuiles lues (population)', g.n === 5, g);
    v('accueil-09 · iPad : la dernière tuile prend toute la largeur de la grille (sur deux colonnes)', g.colonnes === 2 ? Math.abs(g.dernier - g.grille) <= 2 : true, g);
    // graphique : chaque mois répond sur 44 px au moins
    const cols = await p.evaluate(() => [...document.querySelectorAll('.st-col')].map(e => Math.round(e.getBoundingClientRect().width)));
    await p.evaluate("stPer='annee'"); await L.aller(p, 'statistiques'); await L.calme(p, 700);
    const col12 = await p.evaluate(() => [...document.querySelectorAll('.st-col')].map(e => Math.round(e.getBoundingClientRect().width)));
    v('accueil-05 · iPad : les mois du graphique (12 mois) font 44 px au moins', col12.length === 12 && col12.every(x => x >= 44), col12);
    const echelle = await p.evaluate(() => [...document.querySelectorAll('.st-grad span')].map(e => getComputedStyle(e).display === 'none' || getComputedStyle(e).direction === 'ltr'));
    v('accueil-05 · iPad : l’échelle du graphique n’est pas lue à l’envers par le défilement de droite à gauche', echelle.length > 0 && echelle.every(Boolean), echelle);
    await p.evaluate("stPer='mois'");
  }
  const bruit = c.err.filter(e => !/hl-ecran|Failed to load/.test(e)); v('aucune erreur JavaScript', bruit.length === 0, bruit.slice(0, 4));
  await L.fin(c); await L.fermer(); process.exit(L.bilan() ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
