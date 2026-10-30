/* ══ test-2812 : LOT 1 DE LA REFONTE DE LA TOUR — (c) FACTURATION (21 octobre 2026) ══
   La page « Facturation » de la Tour lit les factures que Stripe tient, par la MÊME lecture que les Abonnements : aucune route neuve.
   La couture se joue de bout en bout, avec les VRAIES fonctions des deux côtés :
     · de fausses factures au format de Stripe passent par la VRAIE `stripePaiement` de server/index.js (ce que la route rend) ;
     · la VRAIE `chargerAbos` de tour.html les range dans `ABO` ;
     · la VRAIE `vueFacturation` en fait la page.
   Ce qu'elle garde :
     · refusées d'abord, puis en attente, puis l'encaissé mois par mois (six mois au plus), avec les bonnes sommes ;
     · ⛔ une facture ANNULÉE n'est ni un échec ni un encaissement : elle se compte à part ;
     · ⛔ un vide qui vient d'une panne de Stripe n'est jamais « aucune facture » ; une lecture périmée le DIT ;
     · un nom de client reçu de Stripe est ÉCHAPPÉ, un lien n'est posé que vers une vraie adresse https de Stripe ;
     · la page n'est plus « en construction », elle se charge à l'ouverture et se redessine quand Stripe répond. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
console.log('── test-2812 : la Tour, lot 1 (c) — Facturation ──');
const RAC = path.join(__dirname, '..');
const T = fs.readFileSync(path.join(RAC, 'tour.html'), 'utf8'), S = fs.readFileSync(path.join(RAC, 'server', 'index.js'), 'utf8');
const corps = (src, entete) => { const i = src.indexOf(entete); if (i < 0) return ''; let j = src.indexOf('{', i), p = 0; for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (!p) return src.slice(i, k + 1); } } return ''; };
const ligne = (src, debut) => { const i = src.indexOf(debut); return i < 0 ? '' : src.slice(i, src.indexOf('\n', i)); };

/* ── le serveur : la vraie fabrique d'une facture ── */
const SRV = [ligne(S, 'const monStr = '), ligne(S, 'const stripeEur = '), corps(S, 'function stripeClient('), corps(S, 'function stripePaiement(')];
const PAGE = ['function chargerAbos(', 'function vueFacturation(', 'function factLigne(', 'function factMois(', 'function abnGroupe(', 'function acErr(', 'function videTour(',
  'function esc(', 'function jsq(', 'function fmtEur(', 'function fmtJour(', 'function fmtDate(', 'function paieOk(', 'function paieEchec('].map(e => corps(T, e));
v('(population) les 4 pièces du serveur et les 14 fonctions de la page sont trouvées', [SRV.map(x => x.length > 10), PAGE.filter(x => x.length < 30).length], [[true, true, true, true], 0]);
const srv = vm.createContext({ parseInt, Number, String, Math }); vm.runInContext(SRV.join('\n') + '\nthis.stripePaiement=stripePaiement;', srv);
const now = new Date(), J = 86400000;
const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
const cust = (n) => ({ name: n, email: n.toLowerCase().replace(/\W+/g, '') + '@exemple-2812.fr' });
const s = x => Math.floor(x / 1000);
const FACT = [
  { id: 'in_a', status: 'paid', amount_paid: 4900, created: s(debutMois + 2 * J), status_transitions: { paid_at: s(debutMois + 2 * J) }, customer: cust('Société A'), hosted_invoice_url: 'https://invoice.stripe.com/i/a' },
  { id: 'in_b', status: 'paid', amount_paid: 2950, created: s(debutMois + 3 * J), status_transitions: { paid_at: s(debutMois + 3 * J) }, customer: cust('<b>Société B</b>'), hosted_invoice_url: 'javascript:alert(1)' },
  { id: 'in_c', status: 'paid', amount_paid: 9900, created: s(debutMois - 10 * J), status_transitions: { paid_at: s(debutMois - 10 * J) }, customer: cust('Société C') },
  { id: 'in_d', status: 'open', attempted: true, paid: false, amount_due: 1500, created: s(debutMois - 5 * J), customer: cust('Société D'), hosted_invoice_url: 'https://invoice.stripe.com/i/d' },
  { id: 'in_e', status: 'open', amount_due: 3000, created: s(Date.now() - J), customer: cust('Société E') },
  { id: 'in_f', status: 'void', amount_due: 7000, created: s(Date.now() - 2 * J), customer: cust('Société F') },
  { id: 'in_g', status: 'draft', amount_due: 100, created: s(Date.now()), customer: cust('Brouillon') }];
for (let k = 1; k <= 8; k++) FACT.push({ id: 'in_m' + k, status: 'paid', amount_paid: 1000, created: s(new Date(now.getFullYear(), now.getMonth() - k - 1, 15).getTime()), status_transitions: { paid_at: s(new Date(now.getFullYear(), now.getMonth() - k - 1, 15).getTime()) }, customer: cust('Ancienne ' + k) });
const paiements = FACT.map(f => srv.stripePaiement(f)).filter(Boolean);
v('le serveur écarte le brouillon et classe : payée, en attente (ouvert), refusée (échec), annulée', ['in_a', 'in_d', 'in_e', 'in_f', 'in_g'].map(id => (paiements.find(p => p.id === id) || {}).statut || null), ['paye', 'echec', 'ouvert', 'annule', null]);

/* ── la page : la vraie chargerAbos, puis la vraie vue ── */
let reponses = null, rendus = 0;
const page = { Promise, JSON, Date, String, Number, Math, Array, setTimeout: () => 0, chargerEspaces: () => {}, INJOIGNABLE: 'Serveur injoignable.', TAB: 'facturation',
  apiGet: u => /abos/.test(u) ? Promise.resolve(reponses.a) : Promise.resolve(reponses.p), render: () => { rendus++; }, rendreEnGardantLeFocus: () => {},
  enTete: (t, ph, ac) => '<h1>' + t + '</h1>' + (ac || ''), acSquel: () => '<squelette>', svg: n => '<svg data-ic="' + n + '"></svg>',
  ABO: { abos: [], paiements: [], mrr: 0, actifs: 0, impayes: 0, echecs: 0, configured: false, loaded: false, err: '', f: '' } };
vm.createContext(page); vm.runInContext(PAGE.join('\n') + '\nthis.chargerAbos=chargerAbos;this.vueFacturation=vueFacturation;', page);
const texte = h => h.replace(/<[^>]+>/g, ' ').replace(/&nbsp;| | /g, ' ').replace(/\s+/g, ' ');
v('avant la lecture : un squelette, pas un écran vide', /<squelette>/.test(page.vueFacturation()), true);
const charger = async (a, p) => { reponses = { a, p }; page.chargerAbos(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); };
await0();
async function await0() {
  await charger({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 1 }, { ok: true, configured: true, paiements, echecs: 1 });
  v('la vraie chargerAbos range les factures, et redessine la page ouverte', [page.ABO.loaded, page.ABO.paiements.length, rendus > 0], [true, paiements.length, true]);
  const H = page.vueFacturation(), X = texte(H);
  const XG = texte(H.slice(H.indexOf('<div class="reg abn-f"')));   // les groupes, sous les tuiles (qui portent aussi « Refusées »)
  const ordre = ['Refusées', 'En attente de règlement', 'Encaissé en'].map(t => XG.indexOf(t));
  v('refusées d\'abord, puis en attente, puis l\'encaissé', ordre.every((x, i) => x >= 0 && (!i || x > ordre[i - 1])), true);
  const eur = n => n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).replace(/ | /g, ' ') + ' €';
  vrai('le titre de chaque mois porte SON total (un mois replié le garde visible), son compteur le nombre de factures', new RegExp('Encaissé en [^<]+ · ' + eur(78.5).replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</span><span class="reg-n">2<').test(H.replace(/\u202f|\u00a0/g, ' ')), H.slice(H.indexOf('Encaissé en'), H.indexOf('Encaissé en') + 200));
  vrai('encaissé ce mois : 49 + 29,50 = ' + eur(78.5) + ', deux factures', X.indexOf(eur(78.5) + ' Encaissé ce mois · 2 factures') >= 0, X.slice(0, 400));
  vrai('le mois dernier : ' + eur(99) + ', une facture', X.indexOf(eur(99) + ' Le mois dernier · 1 facture') >= 0, X.slice(0, 400));
  vrai('une en attente, une refusée (tuiles)', /1 En attente de règlement 1 Refusées/.test(X), X.slice(0, 400));
  v('six mois encaissés au plus (dix au fichier)', (X.match(/Encaissé en /g) || []).length, 6);
  v('…les plus récents d\'abord', (H.match(/Encaissé en ([^<·]+) ·/g) || []).slice(0, 2).map(m => m.replace('Encaissé en ', '').replace(' ·', '')),
    [now, new Date(now.getFullYear(), now.getMonth() - 1, 1)].map(d => d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })));
  vrai('⛔ l\'annulée n\'est ni refusée ni encaissée : elle se compte à part', !/Société F/.test(X) && /1 facture annulée chez Stripe, non comptée ici/.test(X), X.slice(-200));
  vrai('la refusée mène aux abonnements impayés', /allerImpayes\(\)/.test(H));
  vrai('⛔ un nom reçu de Stripe est ÉCHAPPÉ', H.indexOf('<b>Société B</b>') < 0 && H.indexOf('&lt;b&gt;Société B&lt;/b&gt;') > 0);
  vrai('⛔ un lien n\'est posé que vers une vraie adresse https (la facture « javascript: » n\'en a pas)', H.indexOf('javascript:alert') < 0 && /window\.open\('https:\/\/invoice\.stripe\.com\/i\/a'/.test(H));
  vrai('une facture sans lien le dit (classe « mort », pas de clic)', (H.match(/class="abn-j mort"/g) || []).length >= 2);

  vrai('moins de 50 factures et aucun refus hors liste : aucune note de limite', !/dernières factures lues chez Stripe/.test(X) && !/factures refusées sur 30 jours/.test(X));
  /* ⛔ relecture du 22 octobre 2026 : le serveur ne lit que les 50 DERNIÈRES factures — passé ce nombre, la page le dit */
  const cinquante = paiements.concat(Array.from({ length: 50 }, (_, k) => ({ id: 'in_x' + k, clientNom: 'X', clientEmail: '', montant: 1, date: Date.now() - 3600000, statut: 'paye', url: '' })));
  await charger({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 1 }, { ok: true, configured: true, paiements: cinquante, echecs: 3 });
  const XL = texte(page.vueFacturation());
  vrai('⛔ 50 factures ou plus : « calculé sur les N dernières factures… les mois les plus anciens peuvent être incomplets »', /Calculé sur les \d+ dernières factures lues chez Stripe : les mois les plus anciens peuvent être incomplets/.test(XL), XL.slice(0, 500));
  vrai('⛔ Stripe compte plus de refus (3) que la liste n\'en montre (1) : la page le dit', /Stripe compte 3 factures refusées sur 30 jours ; seules celles de cette liste paraissent ici/.test(XL));
  await charger({ ok: true, configured: true, abos: [], mrr: 0, actifs: 0, impayes: 0, erreur: 'Stripe indisponible' }, { ok: true, configured: true, paiements: [], echecs: 0, erreur: 'Stripe indisponible' });
  const P1 = texte(page.vueFacturation());
  vrai('⛔ Stripe en panne, rien de lu : « Stripe ne répond pas » — jamais « aucune facture »', /Stripe ne répond pas/.test(P1) && !/Aucune facture/.test(P1), P1);
  await charger({ ok: true, configured: true, abos: [], perime: true, majTs: Date.now() - 3600000, erreur: 'Stripe indisponible' }, { ok: true, configured: true, paiements, perime: true, majTs: Date.now() - 3600000, erreur: 'Stripe indisponible' });
  const P2 = texte(page.vueFacturation());
  vrai('une liste périmée se montre, et le DIT (« la relecture a échoué »)', /la relecture a échoué/.test(P2) && /Refusées/.test(P2), P2.slice(0, 300));
  await charger({ ok: true, configured: false, abos: [] }, { ok: true, configured: false, paiements: [] });
  vrai('Stripe pas relié : la page le dit', /Stripe n’est pas relié au serveur/.test(texte(page.vueFacturation())));
  await charger({ ok: true, configured: true, abos: [] }, { ok: true, configured: true, paiements: [], echecs: 0 });
  vrai('Stripe relié, lu, et rien : « Aucune facture pour l’instant »', /Aucune facture pour l’instant/.test(texte(page.vueFacturation())));
  await charger(null, null);
  vrai('les deux lectures perdues : une erreur, avec « Réessayer »', /Stripe ne répond pas/.test(texte(page.vueFacturation())) && /chargerAbos\(\)/.test(page.vueFacturation()));

  const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
  const VB = corps(T, 'var VUES_BIENTOT=');
  vrai('la page n\'est plus « en construction » (hors de VUES_BIENTOT), elle a sa branche de rendu', !/\bfacturation:/.test(T.slice(T.indexOf('var VUES_BIENTOT='), T.indexOf('};', T.indexOf('var VUES_BIENTOT=')))) && /SOUS\.abonnements==='facturation'\?vueFacturation\(\)/.test(SANS));
  vrai('elle se charge à l\'ouverture (et se relit après une panne)', /if\(s==='facturation'&&\(!ABO\.loaded\|\|ABO\.err\)\) chargerAbos\(\);/.test(SANS) && /if\(t==='abonnements'\)\{ if\(!ABO\.loaded\|\|ABO\.err\) chargerAbos\(\);/.test(SANS));
  void VB;
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
}
