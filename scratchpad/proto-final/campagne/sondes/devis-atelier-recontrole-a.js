// RECONTRÔLE ADVERSE (étape 3) de la partie « Devis et atelier » — passe A : l'argent (défaut 01) et ses voisins.
// Le correcteur a prouvé UN cas (0,5 × 29,17 + 1,5 × 29,17). Ici on cherche ce que « un seul total de ligne » n'a pas couvert :
// d'autres quantités, d'autres taux de TVA, une remise (prix négatif), un prix à 0, l'acompte (affiché / facturé), le message d'envoi,
// la fenêtre « Ce que voit le client », la liste, les statistiques.
// usage : node devis-atelier-recontrole-a.js [profil] — « N ✓ · M ✗ », code 1 si un contrôle tombe.
const O = require('./devis-atelier-outils.js'), L = O.L, v = L.v;
// on retire les dates (31/10 160,22 € se lirait « 10 160,22 »), puis on prend le DERNIER montant
const cents = s => { const t = String(s).replace(/\d{1,2}\/\d{1,2}(\/\d{2,4})?/g, ' ').replace(/[\u00a0\u202f]/g, ' '); const m = t.match(/(?:−|-)?\d[\d ]*,\d\d/g); return m ? L.cents(m[m.length - 1]) : NaN; };
(async () => {
  const profil = process.argv[2] || 'mac';
  const c = await L.ouvrir({ profil, qui: 'marc', hash: 'devis' }), p = c.p; await L.calme(p, 600);
  // ── 1. cent cas aléatoires, en mémoire : les fonctions de la page contre un calcul entier indépendant ─────────────────
  const r = await p.evaluate(() => {
    let graine = 12345; const alea = () => (graine = (graine * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff; const mal = [];
    const rd = (n, d) => Math.floor((2 * n + d) / (2 * d));   // arrondi « commercial » en entiers, indépendant de la page
    for (let i = 0; i < 4000; i++) {
      const nl = 1 + Math.floor(alea() * 4), tva = [0, 2.1, 5.5, 8.5, 10, 20][Math.floor(alea() * 6)], lignes = [];
      for (let j = 0; j < nl; j++) lignes.push(['L' + j, Math.round(alea() * 3000) / 100 || 0.25, Math.round(alea() * 200000) / 100]);
      let ht = 0; lignes.forEach(l => { ht += rd(Math.round(l[1] * 100) * Math.round(l[2] * 100), 100); });   // cents, entier
      const tv = rd(ht * Math.round(tva * 10), 1000), ttc = ht + tv;
      const x = { lignes, tva };
      const aff = [Math.round(dvHT(x) * 100), Math.round(dvTvaDe(dvHT(x), tva) * 100), Math.round(dvTtcDe(dvHT(x), tva) * 100)];
      if (aff[0] !== ht || aff[1] !== tv || aff[2] !== ttc) mal.push({ lignes, tva, attendu: [ht, tv, ttc], page: aff });
    }
    return { n: 4000, mal: mal.length, ex: mal.slice(0, 3) };
  });
  v('population : 4 000 devis tirés au sort comparés à un calcul entier', r.n === 4000, r.n);
  v('devis-atelier-01 : HT, TVA, TTC de la page = calcul entier indépendant, au centime, sur 4 000 devis (taux 0 / 2,1 / 5,5 / 8,5 / 10 / 20)', r.mal === 0, r);

  // ── 2. une remise (prix négatif) : la page ne laisse pas la saisir (dvLireNb refuse le signe) — on le prouve, l'arrondi miroir est sans objet ──
  await p.evaluate(() => { CLIENTS.zn = Object.assign({}, CLIENTS.mr, { nom:'Essai Négatif' }); dvCreer({ cli:'zn', objet:'Essai négatif', lignes:[['x', 1, 10]], source:'essai' }); window.__kn = location.hash.replace('#devis-x-', ''); });
  const kn = await p.evaluate(() => window.__kn); await L.calme(p, 400);
  await p.fill('[data-dvl="' + kn + '|0|2"]', '-10'); await p.press('[data-dvl="' + kn + '|0|2"]', 'Tab'); await L.calme(p, 400);
  const pu = await p.evaluate(k => DEVIS_REG[k].lignes[0][2], kn); v('un prix négatif ne se saisit pas (le prix reste 10) : l’arrondi des remises n’a pas à être miroir', pu === 10, pu);
  // ── 3. un brouillon vrai, toutes les surfaces ────────────────────────────────────────────────────────────────────────
  await p.evaluate(() => { CLIENTS.zz = Object.assign({}, CLIENTS.mr, { nom:'Essai Arrondi', mail:'arrondi@exemple.fr' }); dvCreer({ cli:'zz', objet:'Essai des arrondis', lignes:[['Câble', 0.333, 3.33], ['Gaine', 2.5, 19.99], ['Main-d’œuvre', 1.5, 29.17], ['Pièce', 7, 8.145]], source:'essai' }); window.__k = location.hash.replace('#devis-x-', ''); });
  const cle = await p.evaluate(() => window.__k); await L.calme(p, 500);
  await p.selectOption('[data-dvtva="' + cle + '"]', '5.5').catch(() => {}); await p.selectOption('[data-dvacompte="' + cle + '"]', '30'); await L.calme(p, 400);
  const att = await p.evaluate(k => { const x = DEVIS_REG[k]; return { ht: Math.round(dvHT(x) * 100), tva: Math.round(dvTvaDe(dvHT(x), x.tva) * 100), ttc: Math.round(dvTTC(x) * 100), tvaTaux: x.tva, lignes: x.lignes.map(l => Math.round(dvLigneHT(l) * 100)) }; }, cle);
  const fiche = await p.evaluate(() => ({ lg: [...document.querySelectorAll('#contenu .dv-lgs .dv-lg:not(.dv-lg-t) .dv-tot')].map(e => e.textContent), tot: [...document.querySelectorAll('#contenu .dv-totaux .ligne')].map(l => l.innerText.replace(/\s+/g, ' ').trim()), pdf: [...document.querySelectorAll('#contenu .pdf tfoot td')].map(x => x.innerText.replace(/\s+/g, ' ')), pdfl: [...document.querySelectorAll('#contenu .pdf tbody tr')].map(t => t.innerText.replace(/\s+/g, ' ')) }));
  v('fiche : chaque total de ligne = le calcul au centime', fiche.lg.length === 4 && fiche.lg.every((s, i) => cents(s) === att.lignes[i]), [fiche.lg, att.lignes]);
  v('fiche : la somme des lignes AFFICHÉES = HT affiché', fiche.lg.reduce((s, t) => s + cents(t), 0) === cents(fiche.tot[0]), [fiche.lg, fiche.tot]);
  v('fiche : TTC = HT + TVA (affichés), TVA à 5,5 % sur le HT', cents(fiche.tot[2]) === cents(fiche.tot[0]) + cents(fiche.tot[1]) && cents(fiche.tot[1]) === Math.floor((cents(fiche.tot[0]) * 55 + 500) / 1000), fiche.tot);
  v('PDF : HT, TVA, TTC = ceux de la fiche', fiche.pdf.length >= 6 && cents(fiche.pdf[1]) === cents(fiche.tot[0]) && cents(fiche.pdf[3]) === cents(fiche.tot[1]) && cents(fiche.pdf[5]) === cents(fiche.tot[2]), fiche.pdf);
  const lignesPdf = fiche.pdfl.map(s => (s.match(/−?[\d\s  ]+,\d\d\s*€/g) || []).pop()).filter(Boolean);
  v('PDF : le total de chaque ligne imprimée = celui de la fiche', lignesPdf.length >= 4 && lignesPdf.slice(0, 4).every((s, i) => cents(s) === att.lignes[i]), [lignesPdf, att.lignes]);
  const acompteAff = fiche.tot.find(s => /Acompte/.test(s));
  console.log('  · acompte affiché sur la fiche :', acompteAff, '· TTC', att.ttc / 100);
  // la liste
  await L.aller(p, 'devis'); await p.evaluate(() => { dvFiltre = 'tous'; rendre(); }); await L.calme(p, 400);
  const lst = await O.liste(p); const ligne = lst.find(t => /Essai des arrondis|Essai Arrondi/.test(t)) || '';
  v('la liste : le TTC du brouillon = celui de la fiche', cents(ligne) === att.ttc, ligne);
  // l'envoi : message et numéro
  await L.aller(p, 'devis-x-' + cle); await L.toucher(c, '[data-dv="envoyer|' + cle + '"]'); await L.calme(p, 500);
  const msg = await p.evaluate(() => (document.getElementById('ml-m') || {}).value || '');
  const mMsg = (/d’un montant de (−?[\d\s  ]+,\d\d)/.exec(msg) || [])[1];
  v('le message d’envoi annonce le TTC de la fiche', mMsg && cents(mMsg) === att.ttc, msg.slice(0, 220));
  await L.toucher(c, '[data-mailenvoi]'); await L.calme(p, 700);
  const num = await p.evaluate(k => DEVIS_REG[k] && DEVIS_REG[k].num, cle); v('le devis a pris son numéro à l’envoi', /^D-2026-\d+$/.test(num || ''), num);
  const cle2 = await p.evaluate(k => dvCle(DEVIS_REG[k]), cle); await L.aller(p, 'devis-x-' + cle2);
  // « Ce que voit le client »
  await L.toucher(c, '[data-dv="client|' + cle2 + '"]'); await L.calme(p, 400);
  const cl = await p.evaluate(() => (document.querySelector('#calque .panneau') || {}).innerText || '');
  const montantsClient = cl.match(/−?[\d\s  ]+,\d\d\s*€/g) || [];
  v('« Ce que voit le client » : le TTC du devis et le total de chaque ligne y figurent, aux mêmes centimes que la fiche', montantsClient.some(s => cents(s) === att.ttc) && att.lignes.every(l => montantsClient.some(s => cents(s) === l)), [montantsClient, att]);
  await L.ranger(p);

  // accord signé → facture d'acompte
  await O.signer(c, cle2); await L.calme(p, 600);
  const fa = await p.evaluate(k => { const x = DEVIS_REG[k] || DV.find(o => dvCle(o) === k), f = FACTURES.find(o => o.id === x.facAcompte); return { e: x.e, ac: x.acompte, f: f && { ht: f.ht, tva: f.tva, st: f.st, ttc: Math.round(f.ht * (1 + f.tva / 100) * 100) } }; }, cle2);
  v('l’accord crée la facture d’acompte', fa.e === 'accepte' && fa.f, fa);
  if (fa.f) {
    const promis = Math.floor((2 * att.ttc * 30 + 100) / 200);
    v('la facture d’acompte (TTC) est à 1 centime au plus de la part de 30 % promise au devis', Math.abs(fa.f.ttc - promis) <= 1, { facture: fa.f.ttc, promis });
    const ac = cents(acompteAff || ''); v('l’acompte AFFICHÉ sur la fiche = l’acompte FACTURÉ (le client lit un montant, reçoit l’autre sinon)', ac === fa.f.ttc, { affiche: ac, facture: fa.f.ttc, promis });
  }
  // ── 4. la fiche d'un devis accepté et la facture du solde ────────────────────────────────────────────────────────────
  await L.aller(p, 'devis-x-' + cle2); const fiche2 = await p.evaluate(() => ({ tot: [...document.querySelectorAll('#contenu .dv-totaux .ligne')].map(l => l.innerText.replace(/\s+/g, ' ').trim()), txt: document.querySelector('#contenu').innerText.replace(/\s+/g, ' ') }));
  v('devis accepté : la fiche garde le même HT, TVA, TTC', fiche2.tot.length >= 3 && cents(fiche2.tot[0]) === att.ht && cents(fiche2.tot[2]) === att.ttc, fiche2.tot);
  console.log('err', c.err.length, c.err.slice(0, 4));
  v('aucune erreur JavaScript pendant la passe', c.err.length === 0, c.err.slice(0, 4));
  const ko = L.bilan(); await L.fin(c); await L.fermer(); process.exit(ko ? 1 : 0);
})().catch(async e => { console.log('ÉCHEC', e.stack); await L.fermer(); process.exit(2); });
