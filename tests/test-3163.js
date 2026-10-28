/* ⛔ CE QUE CE FICHIER GARDE — LA PARITÉ : LES CHIFFRES DE MARGAUX SONT CEUX QUE LA TOUR AFFICHE (28 octobre 2026).
   Justin ouvre « Facturation » et « Abonnements » dans la Tour, puis demande « le point du mois » à Margaux : si les deux disent un chiffre différent pour la même chose, l'un des deux ment, et il ne saura pas lequel.
   Le chiffre « Encaissé ce mois » de la Tour n'est PAS calculé par le serveur : c'est le navigateur qui l'additionne (`vueFacturation`, `paieOk`, `factMois`), sur les 50 dernières factures. Margaux ne peut donc pas « lire la
   valeur du serveur » : elle refait le même calcul, paginé. Ce banc fait parler les VRAIES fonctions de `tour.html` (`chargerAbos`, `vueFacturation`, `vueAbonnements`, `paieOk`, `factMois`, `fmtEur`, extraites du fichier réel et
   exécutées) aux VRAIES routes du VRAI serveur, puis compare, sur les mêmes données, avec ce que Margaux écrit dans son fil :
     · l'encaissé de ce mois et son nombre de factures, l'encaissé du mois dernier et le sien ;
     · en attente, refusées, annulées ;
     · payants, en essai, en impayé, revenu mensuel (le MÊME `stripeAbosCalc`, le MÊME cache).
   Si la Tour change son calcul, ce banc tombe : c'est fait pour ça. ⚠️ Une seule différence est VOULUE, et ce banc la montre au lieu de la cacher : au-delà de 50 factures, la Tour compte les 50 dernières (et le dit),
   Margaux compte toutes celles de la période (lecture paginée). */
'use strict';
process.env.TZ = 'Europe/Paris';          // la Tour compte le mois du NAVIGATEUR : on le met à Paris, comme Justin
const fs = require('fs'), path = require('path'), vm = require('vm');
const { demarrer, dormir } = require('./banc-serveur-gestion');
const B = require('./banc-compta');
const { parisParties, tsParis } = require('../server/agents-horaires');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 500) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 240 s'); process.exit(1); }, 240000).unref();

/* ── les vraies fonctions de la Tour ── */
const CODE = B.CODE_TOUR;
function tourFonctions(API, TOKEN) {
  const prises = {}, ctx = { fetch, Promise, Math, Number, String, Object, Array, JSON, Date, parseInt, setTimeout, console };
  const noms = ['esc', 'fmtEur', 'fmtJour', 'fmtDate', 'factMois', 'paieOk', 'paieEchec', 'chargerAbos', 'vueFacturation', 'vueAbonnements', 'aboPast', 'jsq', 'sigle', 'abnEur', 'abnFormule', 'abnAEcart'];
  const src = [];
  for (const n of noms) { const f = B.blocTour(n); prises[n] = !!f; if (f) src.push(f); }
  /* tout le reste est de l'habillage : un morceau de page qui ne calcule rien */
  const bouchons = ['enTete', 'svg', 'acSquel', 'acErr', 'videTour', 'abnGroupe', 'factLigne', 'teteListe', 'blocPromos', 'blocEspaces', 'allerImpayes', 'render', 'chargerEspaces', 'rendreEnGardantLeFocus', 'fmtJour', 'fmtDate', 'jsq', 'sigle', 'abnEur', 'abnFormule', 'abnAEcart', 'aboPast'].filter(n => !prises[n]);
  vm.createContext(ctx);
  ctx.apiGet = u => fetch(API + u, { headers: { Authorization: 'Bearer ' + TOKEN } }).then(r => { if (!r.ok) throw new Error('http ' + r.status); return r.json(); });
  vm.runInContext('var ABO=' + B.valeurTour('ABO') + ', INJOIGNABLE="injoignable", TAB="abonnements", ESP={list:[]}, IC={cadenas:""}, ABN_F={};\n' + bouchons.map(n => 'function ' + n + '(){ return ""; }').join('\n') + '\nfunction acErr(){ return "ERREUR-ECRAN"; }\n' + src.join('\n') + '\nthis.chargerAbosPromise=function(){ return chargerAbos(); };', ctx);
  return { ctx, prises };
}
const normaliser = t => String(t).replace(/[  ]/g, ' ');
/* « 3 142,75 € » ou « 3 142 € » → des centimes */
const centimes = t => { const m = /(-?[\d  ]+)(?:,(\d{2}))? €/.exec(normaliser(t)); return m ? parseInt(m[1].replace(/\s/g, ''), 10) * 100 + (m[2] ? parseInt(m[2], 10) : 0) : NaN; };
const kpiTour = (html, libelle) => { const re = new RegExp('<div class="n"[^>]*>([^<]*)</div><div class="l">' + libelle + '[^<]*</div>'); const m = re.exec(html); return m ? normaliser(m[1]) : null; };
const compte = (html, libelle) => { const m = new RegExp(libelle + ' · (\\d+) (?:facture|payant)').exec(html); return m ? +m[1] : null; };

/* ── les données : toutes dans le mois courant et le mois dernier de Paris, en plein milieu (le banc ne dépend pas du jour où il tourne) ── */
const P = parisParties(Date.now());
const moisPrec = P.mois === 1 ? { annee: P.annee - 1, mois: 12 } : { annee: P.annee, mois: P.mois - 1 };
const isoMois = (m, jour, h) => new Date(tsParis(m.annee, m.mois, jour, h || 12, 0)).toISOString();
const ce = (jour, h) => isoMois(P, jour, h), avant = (jour, h) => isoMois(moisPrec, jour, h);
const jeu = () => [
  B.facture({ id: 'in_a1', cents: 199900, cree: ce(15, 8), payee: ce(15, 9) }), B.facture({ id: 'in_a2', cents: 114375, cree: ce(14, 8), payee: ce(14, 9) }), B.facture({ id: 'in_a3', cents: 1500, cree: ce(13, 8), payee: ce(13, 9) }),
  B.facture({ id: 'in_b1', cents: 2500, cree: avant(10, 8), payee: avant(10, 9) }), B.facture({ id: 'in_b2', cents: 5000, cree: avant(20, 8), payee: avant(20, 9) }),
  B.facture({ id: 'in_o1', status: 'open', cents: 1500, cree: ce(15, 10) }), B.facture({ id: 'in_o2', status: 'open', cents: 1500, cree: ce(15, 11) }),
  B.facture({ id: 'in_e1', status: 'open', attempted: true, cents: 1500, cree: ce(15, 12) }), B.facture({ id: 'in_e2', status: 'uncollectible', cents: 1500, cree: ce(15, 13) }), B.facture({ id: 'in_e3', status: 'open', attempted: true, cents: 1500, cree: ce(15, 14) }),
  B.facture({ id: 'in_v1', status: 'void', cents: 1500, cree: ce(15, 15) }),
  B.facture({ id: 'in_d1', status: 'draft', cents: 1500, cree: ce(15, 16) }),
];
const ABOS = () => [B.sub('active', 'OP GESTION Pro', 1500), B.sub('active', 'OP GESTION Pro', 1500), B.sub('active', 'OP GESTION Business', 2500), B.sub('active', 'OP GESTION Business Premium', 19625), B.sub('active', 'OP GESTION Business Premium', 19625),
  B.sub('trialing', 'OP GESTION Pro', 1500), B.sub('trialing', 'OP GESTION Business', 2500), B.sub('past_due', 'OP GESTION Pro', 1500), B.sub('unpaid', 'OP GESTION Business', 2500), B.sub('canceled', 'OP GESTION Pro', 1500)];
const CLAUDE = `(r, n) => {
  if (!/^Tu es Margaux,/.test(String(r.system || ''))) return 'Ok.';
  const msgs = r.messages || [];
  const dernier = String((msgs[msgs.length - 1] || {}).content || '').split('\\n').pop();
  const dits = ['C’est fait, regarde juste en dessous.', 'Voilà, c’est écrit plus bas.', 'Je te l’ai mis juste dessous.', 'C’est noté et affiché ci-dessous.'];
  return { texte: dits[n % dits.length], actions: [{ nom: 'point_compta', entree: { periode: /dernier/i.test(dernier) ? 'mois_dernier' : 'ce_mois' } }] };
}`;

(async () => {
  console.log('\n── 3163 · la parité : Margaux dit ce que la Tour affiche ──');
  const faute = B.manqueTour(['esc', 'fmtEur', 'factMois', 'paieOk', 'paieEchec', 'chargerAbos', 'vueFacturation', 'vueAbonnements']);
  v('(population) les vraies fonctions de la Tour ont été trouvées dans tour.html', faute, []);
  const S = await demarrer({ liste: jeu(), abos: ABOS(), claude: CLAUDE, modes: { margaux: 'auto' } });
  vrai('le serveur a démarré', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(-1500)); process.exit(1); }
  const T = tourFonctions(S.B, S.TP);
  vrai('(population) les vraies fonctions d’affichage sont chargées (pas des bouchons)', ['chargerAbos', 'vueFacturation', 'vueAbonnements', 'paieOk', 'factMois', 'fmtEur'].every(n => T.prises[n]), JSON.stringify(T.prises));
  /* la Tour charge ses données par SES fonctions, sur les VRAIES routes */
  await T.ctx.chargerAbosPromise();
  await S.attendre(async () => T.ctx.ABO.loaded === true, 15000);
  vrai('(population) la Tour a lu les factures et les abonnés du serveur', T.ctx.ABO.loaded && T.ctx.ABO.paiements.length === 11 && T.ctx.ABO.abos.length === 10 && !T.ctx.ABO.stripeErr, JSON.stringify({ n: T.ctx.ABO.paiements.length, abos: T.ctx.ABO.abos.length, err: T.ctx.ABO.stripeErr }));
  const fact = T.ctx.vueFacturation(), abon = T.ctx.vueAbonnements();
  vrai('(population) les deux écrans se sont dessinés (aucun message d’erreur)', !/ERREUR-ECRAN/.test(fact + abon) && /Encaissé ce mois/.test(fact) && /Revenu mensuel/.test(abon), (fact + abon).slice(0, 200));

  /* Margaux, deux fois : ce mois, puis le mois dernier */
  const lignes = async () => ((await S.get('/api/monitor/conversations/margaux')).j.messages || []).filter(m => m.de === 'systeme').map(m => normaliser(m.texte));
  await S.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, le point du mois' });
  await S.attendre(async () => (await lignes()).some(l => /Mes relances/.test(l)), 20000);
  const L1 = (await lignes()).join('\n');
  const n1 = (await lignes()).length;
  await S.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, et le point du mois dernier' });
  await S.attendre(async () => (await lignes()).length > n1 + 2, 20000);
  const L2 = (await lignes()).slice(n1).join('\n');

  console.log('\n1. L’encaissé : ce mois et le mois dernier');
  const tourCe = { eur: kpiTour(fact, 'Encaissé ce mois'), n: compte(fact, 'Encaissé ce mois') }, tourAvant = { eur: kpiTour(fact, 'Le mois dernier'), n: compte(fact, 'Le mois dernier') };
  vrai('(population) la Tour affiche un encaissé non nul, ce mois et le mois dernier', centimes(tourCe.eur) > 0 && centimes(tourAvant.eur) > 0 && tourCe.n > 0 && tourAvant.n > 0, JSON.stringify([tourCe, tourAvant]));
  v('la Tour : 3 157,75 € sur 3 factures (1999 + 1143,75 + 15) ce mois ; 75 € sur 2 le mois dernier', [centimes(tourCe.eur), tourCe.n, centimes(tourAvant.eur), tourAvant.n], [315775, 3, 7500, 2]);
  const m1 = /encaissé en [^:]+ \(mois en cours\) : ([^(]+) \((\d+) factures? payées?\)/.exec(L1), m2 = /encaissé en [^:]+ : ([^(]+) \((\d+) factures? payées?\)/.exec(L2);
  vrai('(population) Margaux a écrit son encaissé de ce mois et celui du mois dernier', !!m1 && !!m2, L1 + '\n--\n' + L2);
  v('⛔ ENCAISSÉ CE MOIS : le montant ET le nombre de factures de Margaux sont ceux de la Tour', [m1 && centimes(m1[1]), m1 && +m1[2]], [centimes(tourCe.eur), tourCe.n]);
  v('⛔ LE MOIS DERNIER : de même', [m2 && centimes(m2[1]), m2 && +m2[2]], [centimes(tourAvant.eur), tourAvant.n]);

  console.log('\n2. En attente, refusées, annulées');
  const attenteTour = +kpiTour(fact, 'En attente de règlement'), refuseesTour = +kpiTour(fact, 'Refusées');
  const annuleesTour = +/(\d+) factures? annulées?/.exec(fact)[1];
  v('la Tour : 2 en attente, 3 refusées (deux prélèvements refusés + une irrécouvrable), 1 annulée', [attenteTour, refuseesTour, annuleesTour], [2, 3, 1]);
  const ma = /en attente : (\d+) · refusées : (\d+) · annulées : (\d+)/.exec(L1);
  v('⛔ Margaux : les mêmes trois nombres', ma && [+ma[1], +ma[2], +ma[3]], [attenteTour, refuseesTour, annuleesTour]);
  vrai('…et le brouillon n’est compté nulle part (ni par l’une, ni par l’autre)', !/brouillon/.test(L1));

  console.log('\n3. Les abonnés : le même `stripeAbosCalc`, le même cache');
  const payantsTour = compte(abon, 'Revenu mensuel'), mrrTour = kpiTour(abon, 'Revenu mensuel'), essaisTour = +kpiTour(abon, 'En essai'), impayesTour = +kpiTour(abon, 'Impayés'), tuilePayants = +kpiTour(abon, 'Abonnements payants');
  v('la Tour : 5 payants, 2 en essai, 2 impayés, revenu mensuel 15 + 15 + 25 + 196,25 + 196,25 = 447,50 €', [payantsTour, tuilePayants, essaisTour, impayesTour, centimes(mrrTour)], [5, 5, 2, 2, 44750]);
  const mb = /Abonnés : (\d+) payants, (\d+) en essai, (\d+) en impayé · revenu mensuel récurrent : ([^(]+) \(/.exec(L1);
  vrai('(population) Margaux a écrit ses abonnés', !!mb, L1);
  v('⛔ Margaux : payants, essais, impayés et revenu mensuel sont ceux de la Tour', mb && [+mb[1], +mb[2], +mb[3], centimes(mb[4])], [payantsTour, essaisTour, impayesTour, centimes(mrrTour)]);

  console.log('\n4. La différence VOULUE : au-delà de 50 factures, la Tour compte les 50 dernières — pas Margaux');
  {
    const gros = []; let vrai_ = 0;
    for (let i = 0; i < 60; i++) { gros.push(B.facture({ id: 'in_g' + String(i).padStart(2, '0'), cents: 1000 + i, cree: ce(1 + (i % 14), 8 + (i % 8)), payee: ce(1 + (i % 14), 9 + (i % 8)) })); vrai_ += 1000 + i; }
    S.poserStripe(e => { e.liste = gros; });
    /* le cache des paiements de la Tour dure 5 minutes : on redémarre l'affichage sur un serveur frais */
    await S.fin();
    const S2 = await demarrer({ liste: gros, abos: ABOS(), claude: CLAUDE, modes: { margaux: 'auto' } });
    const T2 = tourFonctions(S2.B, S2.TP);
    await T2.ctx.chargerAbosPromise(); await S2.attendre(async () => T2.ctx.ABO.loaded === true, 15000);
    const f2 = T2.ctx.vueFacturation();
    await S2.post('/api/monitor/conversations/envoyer', { fil: 'margaux', texte: 'Margaux, le point du mois' });
    const l2 = async () => ((await S2.get('/api/monitor/conversations/margaux')).j.messages || []).filter(m => m.de === 'systeme').map(m => normaliser(m.texte)).join('\n');
    await S2.attendre(async () => /Mes relances/.test(await l2()), 20000);
    const M = /\(mois en cours\) : ([^(]+) \((\d+) factures? payées?\)/.exec(await l2());
    v('la Tour a lu 50 factures sur 60 et le DIT (« Calculé sur les 50 dernières factures »)', [T2.ctx.ABO.paiements.length, /Calculé sur les 50 dernières factures/.test(f2)], [50, true]);
    v('⛔ Margaux compte les 60 — le vrai total, par la lecture paginée', [M && +M[2], M && centimes(M[1])], [60, vrai_]);
    vrai('…et la Tour, qui n’en voit que 50, ne les additionne pas toutes (c’est PRÉCISÉMENT pourquoi Margaux ne lui emprunte pas son chiffre)', compte(f2, 'Encaissé ce mois') === 50 && centimes(kpiTour(f2, 'Encaissé ce mois')) < vrai_);
    await S2.fin();
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
