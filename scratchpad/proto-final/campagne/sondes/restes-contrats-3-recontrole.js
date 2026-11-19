// RECONTRÔLE ADVERSE des restes des contrats, tour 3 : ce que ctrCentimes (prix rangé au centime) et la classe .ctr-fact (carte « Facturation »)
// auraient pu casser à côté. usage : node restes-contrats-3-recontrole.js [profil] [nuit] → « N ✓ · M ✗ »
//  P : le prix HT ET le TTC que l'aperçu annonce sont ceux que la fiche du contrat montre (saisies à 3 et 4 décimales, ni « NaN », ni centime perdu)
//  F : la carte « Facturation » avec les valeurs longues, dans les trois modes, en contrat envoyé comme signé ; sur ordinateur libellé et montant côte à côte
//  A : les autres écrans qui lisent le prix d'un contrat (liste, fiche client, page de signature, factures) ne débordent pas
const O = require('./contrats-outils.js'), L = O.L, v = L.v;
const CAP = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/restes-contrats-rec3/';
(async () => {
  const profil = process.argv[2] || 'mac', nuit = process.argv[3] === 'nuit', tag = profil + (nuit ? '-nuit' : '-jour');
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'contrats', nuit }), p = c.p; await L.calme(p, 400);
  // ── P : l'aperçu et la fiche disent les mêmes montants
  const saisies = ['1.005', '10.0049', '10.0051', '99.995', '12,345', '2.675', '1000.005', '0.995'];
  let creeCount = 0;
  for (const s of saisies) {
    await L.calme(p, 1300);
    const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 4, prix: s, fact: 'an', signer: false });
    if (!k) { v('saisie ' + s + ' : le contrat est créé (ou refusé en connaissance de cause)', s === '0.995' ? false : false, s); continue; }
    creeCount++;
    // l'aperçu avait été lu avant la création : on le rejoue sur un brouillon neuf, puis on lit la fiche
    await L.aller(p, 'contrat-nouveau'); await L.calme(p, 250); await p.fill('[data-b="prix"]', s); await p.dispatchEvent('[data-b="prix"]', 'change'); await L.calme(p, 400);
    const ap = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h6')].find(x => /Prix et facturation/.test(x.textContent)); return h ? h.nextElementSibling.textContent.replace(/\s+/g, ' ').replace(/ /g, ' ').trim() : ''; });
    await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 400);
    const fi = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); return h ? h.parentElement.textContent.replace(/\s+/g, ' ').replace(/ /g, ' ').trim() : ''; });
    const nb = t => (t.match(/([\d ]+,\d\d) €/g) || []).map(x => x.replace(/[^\d,]/g, ''));
    const aN = nb(ap), fN = nb(fi);
    console.log('  · saisie', s, '→ aperçu', aN.slice(0, 2).join(' / '), '→ fiche', fN.slice(0, 4).join(' / '));
    v('saisie ' + s + ' : le HT de l’aperçu est celui de la fiche', aN[0] && fN.includes(aN[0]), { aN, fN });
    v('saisie ' + s + ' : le TTC de l’aperçu est celui de la fiche', aN[1] && fN.includes(aN[1]), { aN, fN });
    v('saisie ' + s + ' : ni NaN ni undefined', !/NaN|undefined/.test(ap + fi), { ap, fi });
  }
  v('population : des contrats ont été créés (' + creeCount + ')', creeCount >= 6, creeCount);
  // ── F : carte Facturation, valeurs longues, deux états (envoyé / signé), trois modes
  for (const [fact, prix, signer] of [['visite', 12345.67, true], ['mois', 98765.43, false], ['an', 999999.99, true], ['visite', 999999.99, false]]) {
    await L.calme(p, 1300);
    const k = await O.creerSigner(c, { modele: 'clim', cli: 'hp', freq: 12, prix, fact, lieu: 'les locaux techniques du sous-sol de la tour nord', signer });
    v('contrat ' + fact + ' ' + prix + (signer ? ' signé' : ' envoyé') + ' créé', !!k, k); if (!k) continue;
    await L.aller(p, 'contrat-x-' + k.id); await L.calme(p, 450);
    await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); h && h.scrollIntoView({ block: 'center' }); }); await L.calme(p, 400);
    const m = await p.evaluate(() => { const h = [...document.querySelectorAll('#contenu h3')].find(x => /^Facturation/.test(x.textContent)); if (!h) return null; const car = h.parentElement.getBoundingClientRect();
      return { carte: { l: car.left, r: car.right }, lignes: [...h.parentElement.querySelectorAll('.ligne')].map(l => ({ cls: l.className, kids: [...l.children].map(e => { const r = e.getBoundingClientRect(); const lh = parseFloat(getComputedStyle(e).lineHeight) || 18; return { t: e.textContent.slice(0, 40), w: Math.round(r.width), l: r.left, r: r.right, top: Math.round(r.top), lignes: Math.round(r.height / lh) }; }) })) }; });
    v('population : la carte Facturation a 2 lignes de 2 éléments (' + fact + ')', !!m && m.lignes.length === 2 && m.lignes.every(l => l.kids.length === 2 && /ctr-fact/.test(l.cls)), m);
    if (m) {
      const tousDedans = m.lignes.every(l => l.kids.every(e => e.l >= m.carte.l - 1 && e.r <= m.carte.r + 1));
      v('rien ne sort de la carte (' + fact + ' ' + prix + ')', tousDedans, m);
      const ecrase = m.lignes.flatMap(l => l.kids).filter(e => e.w < 100 && e.lignes >= 3);
      v('aucun libellé écrasé (' + fact + ' ' + prix + ')', ecrase.length === 0, ecrase);
      // le montant reste collé à droite de la carte, passé dessous ou non
      const droite = m.lignes.every(l => Math.abs(l.kids[1].r - m.carte.r) < 24);
      v('le montant reste à droite de la carte (' + fact + ')', droite, m);
      /* seuil 1 300 et non 1 000 (tour 6) : à 1 280 px la carte « Facturation » de la fiche ne fait que 374 px ; avec « 1 199 999,99 € TTC / an » le montant passe SOUS son libellé (repli voulu, rien n'est coupé : les contrôles ci-dessus le disent) */
      if (c.largeur >= 1300) v('sur grand écran libellé et montant restent côte à côte (' + fact + ')', m.lignes.every(l => l.kids[1].l >= l.kids[0].r - 1), m);
    }
    const d = await L.deborde(c); v('rien ne déborde du profil (' + c.largeur + ' px) (' + fact + ')', d.bouge === 0 && d.seconde <= c.largeur + 1, d);
    await L.capture(c, CAP + 'fiche-' + fact + '-' + prix + '-' + (signer ? 'signe' : 'envoye') + '-' + tag + '.png');
  }
  // ── A : les autres écrans qui montrent ces contrats longs
  const ecrans = ['contrats', 'client-x-hp', 'factures', 'comptabilite', 'accueil'];
  for (const e of ecrans) {
    await L.aller(p, e); await L.calme(p, 600);
    const pop = await p.evaluate(() => document.querySelector('#contenu') ? document.querySelector('#contenu').innerText.length : 0);
    const d = await L.deborde(c);
    v('écran ' + e + ' : lu (' + pop + ' signes) et ne déborde pas du profil (' + c.largeur + ' px)', pop > 100 && d.bouge === 0 && d.seconde <= c.largeur + 1, { pop, d });
    await L.capture(c, CAP + 'ecran-' + e + '-' + tag + '.png');
  }
  const k2 = await p.evaluate(() => CONTRATS.filter(k => k.prix > 90000).map(k => k.id));
  for (const id of k2.slice(0, 2)) { await L.aller(p, 'signer-x-' + id); await L.calme(p, 500); const d = await L.deborde(c); const t = await p.evaluate(() => document.body.innerText); v('page de signature de ' + id + ' : sans NaN et sans débordement', !/NaN|undefined/.test(t) && d.bouge === 0 && d.seconde <= c.largeur + 1, d); }
  const dg = await L.doigts(p); v('pas de texte écrasé ni de champ < 16 px sur la dernière page', !dg.champs.length && !dg.ecrases.length, { c: dg.champs.slice(0, 2), e: dg.ecrases.slice(0, 2) });
  v('aucune erreur de la page', c.err.length === 0, c.err.slice(0, 3));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
