/* ⛔ CE QUE CE FICHIER GARDE — LES LECTURES DE LA COMPTA : UN CHIFFRE ILLISIBLE SE DIT, IL NE DEVIENT JAMAIS UN ZÉRO (28 octobre 2026, Margaux comptable de la Tour, étape 1).
   `server/compta-stripe.js` joué seul, avec les VRAIES fonctions de conversion de `server/index.js` (`stripePaiement` extraite du fichier réel) et un faux Stripe de factures qui parle comme l'API
   (`created[gte]`, `created[lt]`, `limit`, `starting_after`, `has_more`). Ce que ce fichier prouve :
     · la période : « ce mois », « le mois dernier », « AAAA-MM » (les douze derniers mois) au fuseau de PARIS — la frontière est celle de Paris (31 octobre 23 h 30 à Paris est le 31 en octobre ; 1er novembre 00 h 30,
       le mois suivant), passage à l'heure d'hiver compris ; le futur et le plus vieux que douze mois sont refusés ;
     · la lecture PAGINÉE (250 factures = 3 pages), sans compter deux fois une facture vue sur deux pages ;
     · ⛔ UNE LISTE TRONQUÉE EST JETÉE : au plafond de pages il en reste, on ne somme pas un morceau ;
     · ⛔ Stripe muet, en erreur, sans clé, réponse de forme inattendue : `ok:false` — et la réponse n'a même pas de champ « payees » qui ressemblerait à zéro ; un mois sans facture, lui, est un VRAI zéro ;
     · la conversion et la règle « payé » sont celles de la Tour : la somme du module égale la somme des lignes rendues par la VRAIE `stripePaiement` ;
     · les abonnés : `erreur` et `perime` du cache de la Tour sont « je ne sais pas » (jamais `mrr:0`) ; payants = actifs − essais, comme l'écran ;
     · le cumul de l'année (une facture émise en décembre et réglée en janvier est de janvier) et le bilan des mentions (des NOMBRES : ni nom de client, ni numéro de facture). */
'use strict';
const path = require('path');
const B = require('./banc-compta');
const COMPTA = require(path.join(B.RACINE, 'server', 'compta-stripe.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();

const R = B.reel();
const NOW = Date.parse('2026-10-28T10:00:00Z');           // mercredi 28 octobre 2026, 11 h à Paris (heure d'hiver depuis le 25)
const module_ = (S, o) => COMPTA(Object.assign({ lire: S.lire, convertir: R.stripePaiement, abonnements: async () => ({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0 }), configure: () => true, maintenant: () => NOW }, o || {}));

(async () => {
  console.log('\n── 3160 · les lectures de la compta : jamais un zéro pour un « je ne sais pas » ──');

  console.log('\n0. (population) les vraies fonctions de l’index ont été trouvées');
  v('monStr, stripeEur, stripeClient, stripePaiement extraites de server/index.js', R.manque, []);
  vrai('…et la conversion réelle rend bien une ligne de paiement', (() => { const l = R.stripePaiement(B.facture({ cents: 1500, status: 'paid' })); return l && l.statut === 'paye' && l.montant === 15; })());

  console.log('\n1. La période, au fuseau de Paris');
  {
    const M = module_(B.fauxStripe([]));
    const oct = M.periodeDe('ce_mois', NOW);
    v('« ce mois » = octobre 2026 : du 1er 00 h (Paris, heure d’été) au 1er novembre 00 h (Paris, heure d’hiver)', [oct.ok, oct.debut, oct.fin, oct.libelle, oct.cle, oct.enCours], [true, Date.UTC(2026, 8, 30, 22), Date.UTC(2026, 9, 31, 23), 'octobre 2026', '2026-10', true]);
    const sep = M.periodeDe('mois_dernier', NOW);
    v('« le mois dernier » = septembre 2026', [sep.ok, sep.debut, sep.fin, sep.libelle, sep.enCours], [true, Date.UTC(2026, 7, 31, 22), Date.UTC(2026, 8, 30, 22), 'septembre 2026', false]);
    const jan = M.periodeDe('mois_dernier', Date.parse('2026-01-15T10:00:00Z'));
    v('en janvier, « le mois dernier » est décembre de l’année d’avant', [jan.ok, jan.cle, jan.libelle], [true, '2025-12', 'décembre 2025']);
    const dec = M.periodeDe('2025-12', NOW);
    v('« 2025-12 » : la fin de décembre est le 1er janvier 00 h de Paris (mois + 1 = 13 ne casse rien)', [dec.ok, dec.fin], [true, Date.UTC(2025, 11, 31, 23)]);
    v('« 2025-11 » (le douzième mois en arrière) est permis', M.periodeDe('2025-11', NOW).ok, true);
    for (const mauvais of ['2025-10', '2026-11', '2026-13', '2026-00', '2026-1', 'octobre', '', 'ce_mois ', null, 12, {}]) v('refusé : ' + JSON.stringify(mauvais), M.periodeDe(mauvais, NOW), { ok: false, raison: 'periode' });
    const permis = M.moisPermis(NOW);
    v('les mois offerts à l’outil : douze, du plus récent au plus ancien', [permis.length, permis[0], permis[11]], [12, '2026-10', '2025-11']);
    vrai('…et chacun est accepté par la période (le schéma de l’outil et le code disent la même chose)', permis.every(m => M.periodeDe(m, NOW).ok));
  }

  console.log('\n2. La frontière de mois est celle de PARIS, pas celle d’UTC');
  {
    const S = B.fauxStripe([
      B.facture({ id: 'in_a', cents: 1000, cree: '2026-10-31T21:00:00Z', payee: '2026-10-31T22:30:00Z' }),   // 23 h 30 à Paris le 31 octobre : octobre
      B.facture({ id: 'in_b', cents: 2000, cree: '2026-10-31T22:00:00Z', payee: '2026-10-31T23:30:00Z' }),   // 00 h 30 à Paris le 1er novembre : novembre
      B.facture({ id: 'in_c', cents: 4000, cree: '2026-09-30T21:00:00Z', payee: '2026-09-30T21:30:00Z' }),   // 23 h 30 à Paris le 30 septembre : septembre
      B.facture({ id: 'in_d', cents: 8000, cree: '2026-09-30T22:00:00Z', payee: '2026-09-30T22:30:00Z' }),   // 00 h 30 à Paris le 1er octobre : octobre
      B.facture({ id: 'in_e', cents: 16000, cree: '2026-10-25T00:30:00Z', payee: '2026-10-25T00:45:00Z' }),  // la nuit du passage à l’heure d’hiver : octobre
    ]);
    const M = module_(S, { maintenant: () => Date.parse('2026-11-02T10:00:00Z') });
    const oct = await M.pointArgent('2026-10'), nov = await M.pointArgent('ce_mois'), sep = await M.pointArgent('2026-09');
    v('octobre : 10 € (23 h 30 le 31) + 80 € (00 h 30 le 1er) + 160 € (nuit du changement d’heure) = 250 €, 3 factures', [oct.ok, oct.centimes, oct.payees], [true, 25000, 3]);
    v('novembre : seulement la facture de 00 h 30 le 1er novembre (Paris) — 20 €', [nov.ok, nov.centimes, nov.payees], [true, 2000, 1]);
    v('septembre : la facture de 23 h 30 le 30 septembre — 40 €', [sep.ok, sep.centimes, sep.payees], [true, 4000, 1]);
  }

  console.log('\n3. La lecture paginée');
  {
    const liste = []; let total = 0;
    for (let i = 0; i < 250; i++) { const c = 100 + i; total += c; liste.push(B.facture({ id: 'in_p' + String(i).padStart(3, '0'), cents: c, cree: '2026-10-' + String(1 + (i % 27)).padStart(2, '0') + 'T08:00:00Z', payee: '2026-10-' + String(1 + (i % 27)).padStart(2, '0') + 'T09:00:00Z' })); }
    const S = B.fauxStripe(liste), M = module_(S);
    const r = await M.pointArgent('ce_mois');
    v('250 factures payées : trois pages, la somme exacte, rien de compté deux fois', [r.ok, r.payees, r.centimes, S.appels.length], [true, 250, total, 3]);
    vrai('…chaque page demande 100 factures, la suivante part de la dernière vue', S.appels.every(c => /limit=100/.test(c)) && /starting_after=in_p/.test(S.appels[1]) && !/starting_after/.test(S.appels[0]), S.appels.join(' | '));
    vrai('…et il n’y a QUE des lectures de factures (aucun autre chemin)', S.appels.every(c => /^\/v1\/invoices\?/.test(c)));
    /* une facture vue sur deux pages (Stripe en bouge une pendant la lecture) ne compte qu’une fois */
    const S2 = B.fauxStripe([]);
    const f1 = B.facture({ id: 'in_x1', cents: 500, cree: '2026-10-05T08:00:00Z', payee: '2026-10-05T08:30:00Z' }), f2 = B.facture({ id: 'in_x2', cents: 700, cree: '2026-10-04T08:00:00Z', payee: '2026-10-04T08:30:00Z' });
    S2.reponse = (chemin) => (/starting_after/.test(chemin) ? { data: [f1, f2], has_more: false } : { data: [f1], has_more: true });
    const r2 = await module_(S2).pointArgent('ce_mois');
    v('une facture vue deux fois (deux pages qui se recouvrent) ne compte qu’une fois', [r2.ok, r2.payees, r2.centimes], [true, 2, 1200]);
  }

  console.log('\n4. ⛔ Une liste TRONQUÉE est jetée');
  {
    const S = B.fauxStripe([]);
    let n = 0;
    S.reponse = () => { n++; const data = [B.facture({ id: 'in_t' + n, cents: 100, cree: '2026-10-05T08:00:00Z', payee: '2026-10-05T08:30:00Z' })]; return { data, has_more: n < 35 }; };   // 35 pages : au-delà du plafond de 30
    const r = await module_(S).pointArgent('ce_mois');
    v('au plafond de pages il en reste : ok:false « tronquee »', [r.ok, r.raison], [false, 'tronquee']);
    v('…après EXACTEMENT 30 pages lues (on ne lit pas jusqu’à la fin du monde, et on ne rend pas un morceau)', n, COMPTA.PAGES_MAX);
    vrai('…et la réponse ne porte aucun champ de somme qui ressemblerait à un zéro', !('payees' in r) && !('centimes' in r), JSON.stringify(r));
    const A = B.fauxStripe([]); let m = 0;
    A.reponse = () => { m++; return { data: [B.facture({ id: 'in_u' + m, cree: '2026-10-05T08:00:00Z', payee: '2026-10-05T08:30:00Z' })], has_more: m < COMPTA.PAGES_MAX }; };
    const ra = await module_(A).pointArgent('ce_mois');
    v('exactement 30 pages et la dernière dit « plus rien » : ce n’est PAS tronqué', [ra.ok, ra.payees], [true, 30]);
    const T = B.fauxStripe([]); T.reponse = () => ({ data: [B.facture({ id: 'in_fixe' })], has_more: true });
    const rt = await module_(T).pointArgent('ce_mois');
    v('« il en reste » avec toujours la même dernière facture : forme inattendue, pas une boucle', [rt.ok, rt.raison], [false, 'forme']);
  }

  console.log('\n5. ⛔ Stripe muet, en erreur, sans clé, réponse inattendue : JAMAIS un zéro');
  {
    const S = B.fauxStripe([]); S.panne = true;
    const r = await module_(S).pointArgent('ce_mois');
    v('Stripe en panne (500)', [r.ok, r.raison], [false, 'stripe']);
    vrai('…aucun champ « payees » / « centimes » : un appelant distrait ne peut pas lire 0', !('payees' in r) && !('centimes' in r) && !('ouvertes' in r), JSON.stringify(r));
    const S2 = B.fauxStripe([]); S2.reponse = { data: 'rien', has_more: false };
    v('« data » n’est pas une liste', (await module_(S2).pointArgent('ce_mois')).raison, 'forme');
    const S3 = B.fauxStripe([]); S3.reponse = { data: [], has_more: 'peut-être' };
    v('« has_more » n’est pas un booléen', (await module_(S3).pointArgent('ce_mois')).raison, 'forme');
    const S4 = B.fauxStripe([]); S4.reponse = { data: [{ status: 'paid' }], has_more: false };
    v('une facture sans identifiant', (await module_(S4).pointArgent('ce_mois')).raison, 'forme');
    const S5 = B.fauxStripe([]); S5.reponse = null;
    S5.lire = async () => null;
    v('une réponse vide (null)', (await COMPTA({ lire: S5.lire, convertir: R.stripePaiement, abonnements: async () => ({}), configure: () => true, maintenant: () => NOW }).pointArgent('ce_mois')).raison, 'forme');
    const S6 = B.fauxStripe([B.facture({})]);
    const M6 = COMPTA({ lire: S6.lire, convertir: () => { throw new Error('conversion cassée'); }, abonnements: async () => ({}), configure: () => true, maintenant: () => NOW });
    v('la conversion jette : forme inattendue', (await M6.pointArgent('ce_mois')).raison, 'forme');
    const S7 = B.fauxStripe([B.facture({})]);
    const M7 = module_(S7, { configure: () => false });
    const r7 = await M7.pointArgent('ce_mois');
    v('clé absente : « pas_de_cle », et Stripe n’est même pas interrogé', [r7.ok, r7.raison, S7.appels.length], [false, 'pas_de_cle', 0]);
    const M8 = COMPTA({ configure: () => true, maintenant: () => NOW });
    v('rien de branché : « pas_branche » (jamais un zéro)', (await M8.pointArgent('ce_mois')).raison, 'pas_branche');
    v('une période refusée ne lit rien', await (async () => { const S9 = B.fauxStripe([]); const r9 = await module_(S9).pointArgent('2019-01'); return [r9.raison, S9.appels.length]; })(), ['periode', 0]);
  }

  console.log('\n6. Un mois SANS facture est un vrai zéro — seulement quand la lecture a réussi');
  {
    const S = B.fauxStripe([B.facture({ cree: '2026-08-10T09:00:00Z', payee: '2026-08-10T09:30:00Z' })]);
    const r = await module_(S).pointArgent('ce_mois');
    v('octobre sans facture payée ni émise : ok:true, 0 payée, 0 euro (la facture d’août est lue dans la marge de 62 jours, et ne compte nulle part)', [r.ok, r.payees, r.centimes, r.ouvertes, r.refusees, r.annulees, r.lues], [true, 0, 0, 0, 0, 0, 1]);
  }

  console.log('\n7. La conversion et la règle « payé » sont celles de la Tour');
  {
    const jeu = [
      B.facture({ id: 'in_1', status: 'paid', cents: 1500, cree: '2026-10-02T08:00:00Z', payee: '2026-10-02T08:05:00Z' }),
      B.facture({ id: 'in_2', status: 'paid', cents: 2550, cree: '2026-10-03T08:00:00Z', payee: '2026-10-03T08:05:00Z' }),
      B.facture({ id: 'in_3', status: 'open', cents: 1500, cree: '2026-10-04T08:00:00Z' }),
      B.facture({ id: 'in_4', status: 'open', cents: 1500, cree: '2026-10-05T08:00:00Z', attempted: true }),                // prélèvement tenté et refusé : « refusée »
      B.facture({ id: 'in_5', status: 'uncollectible', cents: 1500, cree: '2026-10-06T08:00:00Z' }),                          // irrécouvrable : « refusée »
      B.facture({ id: 'in_6', status: 'void', cents: 1500, cree: '2026-10-07T08:00:00Z' }),                                    // annulée
      B.facture({ id: 'in_7', status: 'draft', cents: 1500, cree: '2026-10-08T08:00:00Z' }),                                   // brouillon : pas un paiement
      B.facture({ id: 'in_8', status: 'open', cents: 1500, cree: '2026-09-20T08:00:00Z' }),                                    // ouverte mais émise en septembre : pas dans octobre
      B.facture({ id: 'in_9', status: 'paid', cents: 3000, cree: '2026-09-28T08:00:00Z', payee: '2026-10-02T08:00:00Z' }),    // émise en septembre, réglée en octobre : de l’encaissé d’octobre
      B.facture({ id: 'in_10', status: 'paid', cents: 9900, cree: '2026-10-09T08:00:00Z', payee: '2026-10-09T08:00:00Z', currency: 'usd' }),   // une autre devise : jamais additionnée
    ];
    const S = B.fauxStripe(jeu), M = module_(S);
    const r = await M.pointArgent('ce_mois');
    /* ce que la Tour compterait : les lignes de la VRAIE stripePaiement, filtrées par la règle de la Tour (paieOk) */
    const lignes = jeu.map(f => R.stripePaiement(f)).filter(Boolean);
    const payeesTour = lignes.filter(l => l.statut === 'paye' && l.date >= Date.UTC(2026, 8, 30, 22) && l.date < Date.UTC(2026, 9, 31, 23));
    v('l’encaissé = la somme des lignes « payées » de la vraie conversion (hors autre devise)', r.centimes, Math.round(payeesTour.filter(l => l.montant !== 99).reduce((t, l) => t + l.montant, 0) * 100));
    v('payées 3 (15 € + 25,50 € + 30 €), en attente 1, refusées 2, annulées 1, une facture hors euro non comptée', [r.ok, r.payees, r.centimes, r.ouvertes, r.refusees, r.annulees, r.horsEuro], [true, 3, 7050, 1, 2, 1, 1]);
    vrai('…le brouillon n’est nulle part, la facture ouverte de septembre non plus', r.ouvertes === 1);
    const gte = +/created\[gte\]=(\d+)/.exec(S.appels[0])[1], lt = +/created\[lt\]=(\d+)/.exec(S.appels[0])[1];
    v('la lecture remonte de 62 jours avant la période (une facture émise fin septembre, réglée en octobre)', [gte * 1000, lt * 1000], [Date.UTC(2026, 8, 30, 22) - 62 * 86400000, Date.UTC(2026, 9, 31, 23)]);
  }

  console.log('\n8. Les abonnés : les chiffres de l’écran Abonnements — et « je ne sais pas » quand le cache dit l’erreur');
  {
    const abos = [B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Pro'), B.abo('actif', 'OP GESTION Business'), B.abo('actif', 'OP GESTION Business Premium', 50), B.abo('essai', 'OP GESTION Pro'),
      B.abo('essai', 'OP GESTION Business'), B.abo('impaye', 'OP GESTION Pro'), B.abo('annule', 'OP GESTION Pro'), B.abo('actif', 'OP MESSAGES')];
    const normal = { ok: true, configured: true, abos, mrr: 145.5, actifs: 6 + 2, impayes: 1 };
    const M = (d, o) => module_(B.fauxStripe([]), Object.assign({ abonnements: typeof d === 'function' ? d : async () => d }, o || {}));
    const r = await M(normal).abonnes();
    v('payants = actifs − essais (comme l’écran), essais, impayés, revenu mensuel du cache', [r.ok, r.payants, r.essais, r.impayes, r.mrr], [true, 6, 2, 1, 145.5]);
    v('…par formule : on classe le NOM du produit (Pro, Business, Business Premium, autres)', r.parFormule, { pro: 2, business: 1, premium: 1, autres: 1 });
    const vide = await M({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0 }).abonnes();
    v('aucun abonnement ET une lecture réussie : un vrai zéro', [vide.ok, vide.payants, vide.mrr], [true, 0, 0]);
    const panne = await M({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0, erreur: 'Connexion à Stripe impossible pour le moment' }).abonnes();
    v('⛔ le cache de la Tour rend `erreur` avec des listes vides et mrr:0 : « stripe », pas un zéro', [panne.ok, panne.raison], [false, 'stripe']);
    vrai('…et aucun champ de chiffre dans la réponse', !('mrr' in panne) && !('payants' in panne), JSON.stringify(panne));
    const vieux = await M(Object.assign({}, normal, { perime: true, majTs: Date.parse('2026-10-27T13:05:00Z'), erreur: 'Connexion à Stripe impossible' })).abonnes();
    v('⛔ des chiffres PÉRIMÉS ne sont pas des chiffres : « perime », avec la date de la dernière lecture (sans les chiffres)', [vieux.ok, vieux.raison, vieux.derniere, 'mrr' in vieux], [false, 'perime', Date.parse('2026-10-27T13:05:00Z'), false]);
    v('clé non configurée côté route', (await M({ ok: true, configured: false, abos: [], mrr: 0, actifs: 0, impayes: 0 }).abonnes()).raison, 'pas_de_cle');
    v('la lecture jette', (await M(async () => { throw new Error('boum'); }).abonnes()).raison, 'stripe');
    v('forme inattendue : abos pas une liste', (await M({ ok: true, abos: 'x', mrr: 1, actifs: 1, impayes: 0 }).abonnes()).raison, 'forme');
    v('forme inattendue : mrr pas un nombre', (await M({ ok: true, abos: [], mrr: 'beaucoup', actifs: 0, impayes: 0 }).abonnes()).raison, 'forme');
    v('sans clé du tout : « pas_de_cle »', (await M(normal, { configure: () => false }).abonnes()).raison, 'pas_de_cle');
  }

  console.log('\n9. Le cumul de l’année (le seuil de la franchise)');
  {
    const S = B.fauxStripe([
      B.facture({ id: 'in_y1', cents: 1500, cree: '2026-02-10T09:00:00Z', payee: '2026-02-10T09:30:00Z' }),
      B.facture({ id: 'in_y2', cents: 2500, cree: '2025-12-28T09:00:00Z', payee: '2026-01-03T09:30:00Z' }),   // émise en 2025, réglée en 2026 : de 2026
      B.facture({ id: 'in_y3', cents: 5000, cree: '2025-12-20T09:00:00Z', payee: '2025-12-31T22:30:00Z' }),   // réglée à 23 h 30 à Paris le 31 décembre 2025 : de 2025
      B.facture({ id: 'in_y4', cents: 7000, cree: '2026-05-10T09:00:00Z', status: 'open' }),                    // en attente : pas de l’encaissé
      B.facture({ id: 'in_y5', cents: 4000, cree: '2026-06-10T09:00:00Z', payee: '2026-06-10T10:00:00Z', currency: 'gbp' }),
    ]);
    const r = await module_(S).cumulAnnee();
    v('encaissé 2026 = 15 € + 25 € ; les autres devises et les factures ouvertes n’y sont pas', [r.ok, r.annee, r.centimes, r.payees, r.horsEuro], [true, 2026, 4000, 2, 1]);
    const S2 = B.fauxStripe([]); S2.panne = true;
    v('Stripe muet : « stripe », pas un cumul à zéro', await (async () => { const x = await module_(S2).cumulAnnee(); return [x.ok, x.raison, 'centimes' in x]; })(), [false, 'stripe', false]);
  }

  console.log('\n10. Le bilan des mentions : des NOMBRES, ni nom de client ni numéro de facture');
  {
    const E = B.facture;
    const liste = [
      E({ id: 'in_v1', number: 'ABCD1234-0001', cree: '2026-03-01T09:00:00Z', nom: 'Dupont Entreprise SARL', courriel: 'dupont.secret@exemple-banc.fr', tvaClient: [{ type: 'eu_vat', value: 'FR12345678901' }], taxes: [] }),
      E({ id: 'in_v2', number: 'ABCD1234-0002', cree: '2026-03-02T09:00:00Z', nom: 'Martin Nettoyage', footer: null, custom: [{ name: 'Mention', value: 'TVA non applicable, art. L. 223 et s. du CIBS' }], adresse: null, taxes: [{ amount: 0 }] }),
      E({ id: 'in_v3', number: 'ABCD1234-0004', cree: '2026-03-03T09:00:00Z', footer: 'Merci de votre confiance', pdf: null, brut: { total_taxes: undefined, tax: null, total_tax_amounts: undefined }, taxes: undefined }),
      E({ id: 'in_v4', number: null, status: 'open', cree: '2026-03-04T09:00:00Z', footer: 'TVA non applicable, article 293 B', periode: { start: 0, end: undefined } }),
      E({ id: 'in_v5', number: 'ABCD1234-0005', status: 'draft', cree: '2026-03-05T09:00:00Z' }),                              // brouillon : exclu
      E({ id: 'in_v6', number: 'ABCD1234-0006', cree: '2025-12-30T09:00:00Z', payee: '2026-01-02T09:00:00Z' }),                 // émise en 2025 : pas dans les factures de 2026
    ];
    for (const f of liste) { if (f.total_taxes === undefined) delete f.total_taxes; if (f.total_tax_amounts === undefined) delete f.total_tax_amounts; }
    liste[1].total_taxes = [{ amount: 0 }];
    liste[2].tax = null;
    const M = module_(B.fauxStripe(liste));
    const r = await M.verifierFactures();
    v('quatre factures émises en 2026 (le brouillon et celle de 2025 sont exclus)', [r.ok, r.annee, r.n.total], [true, 2026, 4]);
    v('numéro 3 sur 4 · PDF 3 · pied de page 3 (un pied est null) · champs personnalisés 1', [r.n.numero, r.n.pdf, r.n.pied, r.n.champs], [3, 3, 3, 1]);
    v('mention de franchise : 293 B (pied de la 4ᵉ) + CIBS (champ de la 2ᵉ) + le pied de la 1ʳᵉ = 3 ; « Merci de votre confiance » n’en est pas une', r.n.mention, 3);
    v('adresse du client 3 sur 4 · identifiant de TVA du client 1 · période lisible sur les lignes : 3 sur 4 lues', [r.n.adresse, r.n.tvaClient, r.n.periode, r.n.periodeLue], [3, 1, 3, 4]);
    v('⛔ la TVA : lisible sur 3 factures (la troisième ne la montre pas — jamais comptée pour 0), total 0 centime, aucune facturée', [r.n.taxeLue, r.n.taxeCts, r.n.taxeFacturees], [3, 0, 0]);
    v('numérotation : une seule série pour le compte, avec UN trou (0003 manque) — le brouillon et le numéro vide ne comptent pas', r.numerotation, { genre: 'compte', trous: 1, doublons: 0 });
    const brut = JSON.stringify(r);
    vrai('⛔ aucun nom de client, aucune adresse, aucun numéro de facture dans le bilan', !/Dupont|Martin|dupont\.secret|exemple-banc|ABCD1234|FR12345678901/.test(brut), brut);
    const taxee = module_(B.fauxStripe([E({ id: 'in_w1', cree: '2026-03-01T09:00:00Z', taxes: [{ amount: 300 }, { amount: 30 }] }), E({ id: 'in_w2', cree: '2026-03-02T09:00:00Z', taxes: [] })]));
    const rt = await taxee.verifierFactures();
    v('de la TVA facturée (3,30 €) : le total ET le nombre de factures concernées sont rendus', [rt.n.taxeCts, rt.n.taxeFacturees], [330, 1]);
    const ancien = module_(B.fauxStripe([E({ id: 'in_w3', cree: '2026-03-01T09:00:00Z', brut: { total_taxes: undefined }, taxes: undefined })].map(f => { delete f.total_taxes; f.tax = 120; return f; })));
    v('l’ancienne forme de l’API (le champ `tax`) est lue aussi', (await ancien.verifierFactures()).n.taxeCts, 120);
    const parClient = module_(B.fauxStripe([E({ id: 'in_z1', number: 'AAAA1111-0001', cree: '2026-03-01T09:00:00Z' }), E({ id: 'in_z2', number: 'BBBB2222-0001', cree: '2026-03-02T09:00:00Z' }), E({ id: 'in_z3', number: 'CCCC3333-0001', cree: '2026-03-03T09:00:00Z' })]));
    v('plusieurs préfixes : une séquence PAR CLIENT (la valeur par défaut de Stripe), à voir avec l’expert-comptable', (await parClient.verifierFactures()).numerotation, { genre: 'client', sequences: 3 });
    const vide = await module_(B.fauxStripe([])).verifierFactures();
    v('aucune facture en 2026 (lecture réussie) : total 0, c’est un vrai zéro', [vide.ok, vide.n.total, vide.numerotation.genre], [true, 0, 'aucune']);
    const S = B.fauxStripe([]); S.panne = true;
    const panne = await module_(S).verifierFactures();
    v('Stripe en panne : « stripe », et aucun compteur', [panne.ok, panne.raison, 'n' in panne], [false, 'stripe', false]);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
