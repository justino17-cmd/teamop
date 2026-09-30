/* ⛔ CE QUE CE FICHIER GARDE — LE RATTACHEMENT D'UN PAIEMENT À UN ESPACE.

   Un client paie, et son application reste bloquée. C'est la pire panne commerciale possible :
   il a donné son argent, il n'a rien reçu, et rien nulle part ne dit pourquoi.

   Elle était réelle, et sa cause tenait en une ligne : `espacePaye()` cherchait un abonnement
   Stripe dont l'adresse du client soit STRICTEMENT ÉGALE à celle de l'espace. Or sur la page
   Stripe, c'est l'adresse de FACTURATION qui est saisie — la comptable, ou l'adresse générique
   de la société. L'espace, lui, a été créé avec l'adresse de la personne qui avait demandé
   l'accès. Deux adresses différentes pour la même entreprise, et personne n'a jamais dit au
   client qu'elles devaient correspondre.

   ⛔ LA RÉFÉRENCE EXISTAIT DÉJÀ DANS LE CODE, ELLE NE VOYAGEAIT SIMPLEMENT PAS ASSEZ LOIN.
   `client_reference_id` vit sur la SESSION de paiement ; `espacePaye()` lit la liste des
   ABONNEMENTS, qui ne la portent pas. `subscription_data[metadata][espace]` la grave sur
   l'abonnement, où elle survit au renouvellement et à tout changement d'adresse.

   ⚠️ CE QUE CE BANC NE PEUT PAS RÉPARER, ET QU'IL CONSTATE QUAND MÊME : un abonnement souscrit
   AVANT ce correctif n'a aucune métadonnée. Si son adresse ne correspond pas, il n'est toujours
   pas rattaché — rien ne peut graver une référence après coup. Le contrôle correspondant est
   écrit en clair plus bas, en positif : c'est une limite connue, pas un oubli. Pour ces
   abonnements-là, il faut corriger l'adresse de l'espace ou régler `aboStatut` dans la Tour.

   Le repli par e-mail est donc GARDÉ, et c'est délibéré : le retirer couperait tous les
   clients qui paient aujourd'hui. */

const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');
/* ⛔ L'HEURE DU BANC N'EST PAS CELLE DU JOUR (relecture adverse du 29 septembre 2026, rejoué) : `placesDeFormule` date
   `formuleDepuis` de MAINTENANT et le compare à la bascule des places ; une horloge d'avant le 29/09 4 h UTC rendait le
   × 3 d'avant et faisait tomber un contrôle juste. La bascule du bac à sable est posée loin dans le passé : « d'avant »,
   ce sont les abonnements sans date (0 ou 1), « d'après », ceux du 1er octobre 2026 — quelle que soit l'horloge. */
process.env.TEAMOP_PLACES_BASCULE = '2001-01-01T00:00:00Z';

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

/* On extrait la VRAIE fonction du fichier livré, dans son texte, et on l'exécute. Rien n'est
   recopié : si elle change de dépendances, ce banc tombe — et c'est le comportement voulu. */
const i = SRC.indexOf('async function espacePaye(e, opts) {');
let d = 0, fin = -1;
for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) { fin = k + 1; break; } } }
vrai('espacePaye est trouvée dans le fichier réel', i > 0 && fin > i);

/* ⛔ ET SES AIDES, EXTRAITES ELLES AUSSI (24 septembre 2026). Le rattrapage d'`espacePaye` lit
   désormais `promoServiA` (« un code sert une fois par ENTREPRISE »), `promoAutreActif` et
   `promoEntree`. Un bac à sable qui ne les fournit pas fait jeter le rattrapage DANS son `try` —
   avalé en silence : c'est ainsi que ce banc est tombé le jour où la règle est arrivée. On extrait
   les VRAIES, par leur nom, avec la même découpe. */
function extraire(nom) {
  let d0 = SRC.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  if (SRC.slice(d0 - 6, d0) === 'async ') d0 -= 6;   // `espaceStripe` attend Stripe : sans son `async`, son `await` ne se lit plus
  let p = 0;
  for (let k = SRC.indexOf('{', d0); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(d0, k + 1); } }
  return '';
}
/* ⚠️ et `espaceT` (28 septembre 2026, `gardien`) : la référence gravée se compare à l'identifiant tel que l'annuaire le
   RANGE — en clair, ou dans le code des entrées les plus anciennes. Sans elle, le rattachement par référence jetterait
   dans son `try`, en silence, et seul le repli par adresse répondrait. */
const AIDES = ['promoAujourdhui', 'promoDateFr', 'promoEmpreinteMail', 'promoIdentite', 'promoServiA', 'promoAutreActif', 'promoEntree', 'espaceT'].map(extraire);
vrai('les sept aides du code promo et espaceT sont trouvées dans le fichier réel', AIDES.every(Boolean));
/* ⚠️ et le calcul des places (28 septembre 2026, nuit) : un paiement rattaché rend aussi `placesStripe`, ce que payent
   les abonnements de CETTE entreprise. Sans ses aides et ses constantes, l'appel jetait APRÈS le rattachement, dans le
   `try` — et le paiement le mieux prouvé se lisait « non payé ». Neuf contrôles de ce banc sont tombés ainsi. */
const iConst = SRC.indexOf('const PLACES_BASCULE ='), iPQ = SRC.indexOf('function placesQ(');
const CONSTS = (iConst > 0 && iPQ > iConst) ? SRC.slice(iConst, iPQ) : '';
const PLACES = ['placesQ', 'placesPromoDejaEu', 'placesStripe'].map(extraire);
vrai('le calcul des places et ses constantes sont trouvés dans le fichier réel', !!CONSTS && /STRIPE_PRIX_FORMULE/.test(CONSTS) && PLACES.every(Boolean));
/* ⛔ ET LA FORMULE SERVIE (Justin, 29 septembre 2026 : « ils choisissent le tarif qu'ils veulent »). Le rattachement Stripe
   est sorti d'`espacePaye` (`espaceStripe`, pour que la fiche « Gratuit » y passe aussi), et la formule que l'application
   reçoit se lit sur le tarif payé (`formulePayee`) ou sur le code d'une période offerte (`formulePromo`). Sans ces aides,
   `espacePaye` jetait dès le premier appel (« espaceStripe is not defined ») : tout ce banc est tombé ainsi. */
const iLig = SRC.indexOf('const prixDeLigne ='), iFP = SRC.indexOf('function formulePayee(');
const LIGNES = (iLig > 0 && iFP > iLig) ? SRC.slice(iLig, iFP) : '';
const LBL2 = (/^const FORMULE_LBL2 = .*$/m.exec(SRC) || [''])[0];
const SERVIE = ['formulePayee', 'formuleDuCode', 'formulePromo', 'placesDeFormule', 'formuleEtPlaces', 'espaceStripe', 'periodeOfferte', 'espaceStripeDans',
  'stripeListe', 'stripeVerdict'].map(extraire);
vrai('la formule servie, ses aides et le rattachement Stripe sont trouvés dans le fichier réel',
  /ligneMessages/.test(LIGNES) && /Business Premium/.test(LBL2) && SERVIE.every(Boolean) && /^async function espaceStripe/.test(SERVIE[5]));
/* ⚠️ la fenêtre du cache Stripe (29 septembre 2026, seconde relecture de `gardien`) : `espaceStripe` la lit, et sans elle
   son premier appel jetait dans son `try` — tout paiement se lisait « non payé » (43 contrôles de ce banc tombés ainsi) */
const CACHE_MS = (/^const STRIPE_CACHE_MS = .*$/m.exec(SRC) || [''])[0];
vrai('la fenêtre du cache Stripe est trouvée dans le fichier réel', /STRIPE_CACHE_MS = Math\.max/.test(CACHE_MS));
/* ⛔ et l'IMPAYÉ (Justin, 29 septembre 2026 : carte refusée = impayé, accès payant bloqué jusqu'au règlement) : les statuts
   qui comptent comme payés ou impayés, la relecture à la minute d'un impayé et son motif — sans eux, `espacePaye` jetait
   dès le premier appel (« stripeVerdict is not defined ») */
const IMPAYE = ['STATUTS_PAYES', 'STATUTS_IMPAYES', 'STRIPE_IMPAYE_FRAIS_MS', 'motifImpaye'].map(n => (new RegExp('^const ' + n + ' = .*$', 'm').exec(SRC) || [''])[0]);
vrai('les statuts payés et impayés, la relecture d\'un impayé et son motif sont trouvés dans le fichier réel', IMPAYE.every(Boolean)
  && /'active', 'trialing'/.test(IMPAYE[0]) && /'past_due', 'unpaid'/.test(IMPAYE[1]) && /aboDeGestion/.test(LIGNES) && /function impayesGestion/.test(LIGNES));
/* ⛔ et la règle UNIQUE du blocage (`impayeBloque`, lue par `espacePaye` ET le J-7) avec la forme qu'elle sert (`bloqueImpaye`,
   sur deux lignes : le motif d'une ligne ne la voyait pas) — relecture adverse du 29 septembre 2026 */
const BLOQUE = [extraire('impayeBloque'), (/^const bloqueImpaye = [\s\S]*?\}\);$/m.exec(SRC) || [''])[0]];
vrai('la règle du blocage (`impayeBloque`) et sa forme (`bloqueImpaye`) sont trouvées dans le fichier réel',
  /function impayeBloque\(e, s, imp\)/.test(BLOQUE[0]) && /bloque: true/.test(BLOQUE[1]) && /echeance:/.test(BLOQUE[1]));
/* ⛔ et l'abonnement réglé à la main (30 septembre 2026, plus de formule Gratuit) : `espacePaye` le lit par UNE définition,
   `aboManuelDe` — une fiche « Gratuit » d'avant réglée « active » n'a plus rien de payant à servir */
const MANUEL = extraire('aboManuelDe');
vrai('la règle de l\'abonnement réglé à la main (`aboManuelDe`) est trouvée dans le fichier réel', /function aboManuelDe\(e, jour\)/.test(MANUEL));
/* … et celle de la fiche « Gratuit » qu'un abonnement d'OP GESTION illisible paie (`gratuitPayeIllisible`, lue aussi par le J-7) */
const ILLISIBLE = extraire('gratuitPayeIllisible');
vrai('la règle de la fiche « Gratuit » payée par un abonnement illisible (`gratuitPayeIllisible`) est trouvée dans le fichier réel', /function gratuitPayeIllisible\(e, s, fp\)/.test(ILLISIBLE));
/* … et, depuis les relectures du 30 septembre 2026 : le DOUTE qui ne décide rien (`payeInconnu`), la règle unique de la
   suspension (`accesSuspenduPar`), le lendemain d'une période (`jourApres`), l'essai échu dit à la Tour (`aboEchuMotif`) et la
   formule d'une fiche Gratuit qu'un abonnement illisible paie (`formuleGratuitIllisible`) — sans elles, `espacePaye` jetait
   (« aboEchuMotif is not defined ») */
const RELECTURES = ['payeInconnu', 'accesSuspenduPar', 'jourApres', 'aboEchuMotif', 'formuleGratuitIllisible'].map(extraire);
vrai('le doute, la règle de suspension, le lendemain, l\'essai échu et la formule d\'une fiche Gratuit illisible sont trouvés dans le fichier réel',
  RELECTURES.every(Boolean) && /inconnu: true/.test(RELECTURES[0]) && /RANG_FORMULE\.includes\(f\)/.test(RELECTURES[1]));
/* … et la fiche SANS formule (Justin, 30 septembre 2026 : « Suspend ») : UNE définition, `ficheSansFormule`, lue par
   `espacePaye`, `impayeBloque`, `aboManuelDe`, `aboEchuMotif` et `gratuitPayeIllisible`, avec le libellé de son motif —
   sans elles, `espacePaye` jetait dès le premier appel (« ficheSansFormule is not defined ») */
const SANS_F = [extraire('ficheSansFormule'), (/^const ficheSansFormuleLbl = .*$/m.exec(SRC) || [''])[0]];
vrai('la fiche sans formule (`ficheSansFormule`) et le libellé de son motif sont trouvés dans le fichier réel',
  SANS_F.every(Boolean) && /!e\.formule \|\| e\.formule === 'gratuit'/.test(SANS_F[0]) && /aucune formule/.test(SANS_F[1]));
AIDES.push(CONSTS, ...PLACES, LIGNES, LBL2, CACHE_MS, ...IMPAYE, ...BLOQUE, ...SERVIE, MANUEL, ILLISIBLE, ...RELECTURES, ...SANS_F);
const PARAMS = ['config', 'espStripeCache', 'promoUsages', 'stripeAbosBruts', 'console', 'savePromoUsages', 'mailPromoActive', 'espacesReg', 'espaceParT', 'crypto', 'promosIllisible'];
const construire = () => new Function(...PARAMS, AIDES.join('\n') + '\n' + SRC.slice(i, fin) + '\nreturn espacePaye;');
const avec = (abos) => construire()(
  { stripe: { secretKey: 'sk_de_banc' }, promos: [] },
  { ts: Date.now(), data: abos }, {}, async () => abos, { error() {} }, () => true, () => {}, {}, () => null, require('crypto'), false);

/* la même, avec un ANNUAIRE, des codes, un cache et un Stripe à soi (adresse partagée, référence orpheline, période
   offerte, lecture partagée de Stripe) */
const avecTout = ({ abos = [], reg = {}, usages = {}, promos = [], cache = null, lire = null } = {}) => construire()(
  { stripe: { secretKey: 'sk_de_banc' }, promos }, cache || { ts: Date.now(), data: abos }, usages, lire || (async () => abos),
  { error() {}, log() {} }, () => true, () => {}, reg, () => null, require('crypto'), false);
const ABO = o => Object.assign({ status: 'active', current_period_end: 1800000000 }, o);
const ESP = o => Object.assign({ slug: 'monclient', t: 'ent-x', email: 'patron@client.fr', formule: 'premium' }, o);

(async () => {
  console.log('\n── 727 · le rattachement d\'un paiement, exécuté sur la vraie fonction ──');

  /* 1. L'ANCIEN MONDE DOIT CONTINUER DE MARCHER. C'est le contrôle le plus important du
     fichier : tous les abonnements souscrits jusqu'ici n'ont que leur adresse. */
  {
    const r = await avec([ABO({ customer: { email: 'patron@client.fr' } })])(ESP());
    v('⛔ adresse identique, sans métadonnée : TOUJOURS payé', r.paye, true);
    vrai('   et le motif dit par quoi', /adresse e-mail/.test(r.motif));
    v('   et les places payées se calculent — Business Premium payé d\'avant la bascule : 3, comme la v760 (le calcul a TOURNÉ)', r.placesStripe, 3);
  }

  /* 2. LE DÉFAUT, GRAVÉ EN POSITIF. Un abonnement ancien dont l'adresse diffère n'est pas
     rattachable : c'est une limite du monde réel, pas un oubli. L'écrire ici évite qu'on
     croie un jour l'avoir corrigé. */
  {
    const r = await avec([ABO({ customer: { email: 'compta@client.fr' } })])(ESP());
    v('⚠️ adresse différente ET sans métadonnée : PAS rattaché (limite connue)', r.paye, false);
  }

  /* 3. LE CORRECTIF. */
  {
    const r = await avec([ABO({ customer: { email: 'compta@client.fr' }, metadata: { espace: 'monclient' } })])(ESP());
    v('⛔ adresse différente mais RÉFÉRENCE : payé', r.paye, true);
    vrai('   et le motif le dit', /référence d'espace/.test(r.motif));
  }
  {
    const r = await avec([ABO({ customer: { email: 'compta@client.fr' }, metadata: { espace: 'ent-x' } })])(ESP({ email: '' }));
    v('⛔ espace SANS adresse, référence sur le `t` : payé', r.paye, true);
  }
  {
    /* ⛔ l'identifiant d'une entrée ANCIENNE ne vit que dans son code (`gardien`, 28 septembre 2026) : la route de paiement
       grave cet identifiant-là, `espacePaye()` doit le reconnaître — sinon seul le repli par adresse la rattache, et un
       changement d'adresse perd le paiement */
    const vieille = ESP({ t: undefined, email: 'patron@ailleurs.fr', code: Buffer.from(JSON.stringify({ t: 'vieille-8mq' })).toString('base64') });
    const r = await avec([ABO({ customer: { email: 'compta@client.fr' }, metadata: { espace: 'vieille-8mq' } })])(vieille);
    v('⛔ l\'identifiant rangé dans le CODE : la référence gravée paie, sans l\'adresse', [r.paye, /référence d'espace/.test(r.motif || '')], [true, true]);
    const r2 = await avec([ABO({ customer: { email: 'compta@client.fr' }, metadata: { espace: 'vieille-9zz' } })])(vieille);
    v('   contre-épreuve : un AUTRE identifiant ne paie rien', r2.paye, false);
  }

  /* 4. LES CONTRE-ÉPREUVES. Sans elles, « rattacher plus largement » voudrait dire
     « rattacher n'importe quoi » — et offrir l'abonnement d'une entreprise à une autre. */
  {
    const r = await avec([ABO({ customer: { email: 'compta@ailleurs.fr' }, metadata: { espace: 'une-autre' } })])(ESP());
    v('⛔ la référence d\'une AUTRE entreprise ne paie RIEN', r.paye, false);
  }
  {
    const r = await avec([ABO({ status: 'canceled', customer: { email: 'patron@client.fr' }, metadata: { espace: 'monclient' } })])(ESP());
    v('⛔ un abonnement ANNULÉ ne paie rien, même avec la bonne référence', r.paye, false);
  }
  {
    const r = await avec([ABO({ status: 'trialing', customer: { email: 'x@y.fr' }, metadata: { espace: 'monclient' } })])(ESP());
    v('un essai en cours paie, lui', r.paye, true);
  }

  /* 4 bis. ⛔ L'ADRESSE VIDE N'EST PAS UNE ADRESSE. C'est la régression exacte du
     19 septembre 2026 au soir, introduite en retirant `&& e.email` de la garde : le repli
     comparait `String(sb.customer.email || '').toLowerCase()` à `e.email`, donc `''` à `''`.
     Or `email: … || ''` est ce qu'écrit la Tour à CHAQUE ouverture d'espace, et un client
     Stripe peut très bien n'avoir aucune adresse (effacé, paiement par lien, saisie
     incomplète). Résultat mesuré sur le vrai serveur : l'abonnement d'une entreprise payait
     pour une autre, et le motif affiché disait tranquillement « par adresse e-mail ».
     Ces trois contrôles sont la raison d'être du `&& mel` : ne pas les perdre. */
  {
    const r = await avec([ABO({ customer: { email: null }, metadata: { espace: 'une-autre' } })])(ESP({ email: '' }));
    v('⛔ espace SANS adresse + client Stripe SANS adresse : ne paie RIEN', r.paye, false);
  }
  {
    const r = await avec([ABO({ customer: { deleted: true }, metadata: { espace: 'une-autre' } })])(ESP({ email: '' }));
    v('⛔ un client Stripe EFFACÉ ne paie pour personne', r.paye, false);
  }
  {
    const r = await avec([ABO({ customer: { email: '   ' }, metadata: { espace: 'une-autre' } })])(ESP({ email: '  ' }));
    v('⛔ deux adresses d\'espaces blanches ne se rattachent pas non plus', r.paye, false);
  }
  /* Et l'inverse, qui compte autant : resserrer ne doit pas COUPER un client qui paie. Une
     majuscule sur la page Stripe ou une espace colée en trop ne bloquent plus personne —
     l'adresse d'un espace n'est nulle part mise en minuscules à l'écriture. */
  {
    const r = await avec([ABO({ customer: { email: ' Patron@Client.FR ' } })])(ESP());
    v('une adresse à la casse ou aux espaces près paie quand même', r.paye, true);
  }

  /* 5. LA ROUTE DE PAIEMENT GRAVE LA RÉFÉRENCE SUR L'ABONNEMENT.
     ⛔ CES CONTRÔLES ÉTAIENT DES `grep` SUR LE TEXTE DU SERVEUR, ET LES MOTIFS APPARAISSAIENT
     DANS LE COMMENTAIRE qui explique le correctif : on pouvait supprimer le code et le banc
     restait vert. La route est donc EXÉCUTÉE, et on lit ce qui partirait chez Stripe.
     ⚠️ L'AUTRE MOITIÉ DU CHEMIN — la page `recap-abonnement.html` qui ENVOIE la référence — vit
     dans `test-797`, qui fait parler la vraie page à la vraie route. Elle a quitté ce fichier
     le 24 septembre 2026 pour que celui-ci ne garde que le SERVEUR : c'est lui que le
     déploiement du serveur seul lance sur `main`, où la page n'est pas encore publiée
     (`scripts/bancs-serveur.liste`). */
  /* b) La VRAIE route, exécutée. On extrait le gestionnaire du fichier livré et on intercepte
        `fetch` : ce qu'on lit est littéralement ce qui partirait chez Stripe. */
  const iR = SRC.indexOf("app.post('/api/stripe/checkout'");
  let dR = 0, finR = -1;
  for (let k = SRC.indexOf('{', iR); k < SRC.length; k++) { if (SRC[k] === '{') dR++; else if (SRC[k] === '}') { dR--; if (!dR) { finR = k + 1; break; } } }
  /* L'accolade ferme le corps de la fl\u00e8che, pas l'appel : `app.post(\u2026, async () => { \u2026 }` a
     encore sa parenth\u00e8se \u00e0 fermer. On prend donc jusqu'au `);` qui suit. */
  finR = SRC.indexOf(');', finR) + 2;
  vrai('la route de paiement est trouv\u00e9e dans le fichier r\u00e9el', iR > 0 && finR > iR);

  /* ⛔ ET DEPUIS LE 27 SEPTEMBRE 2026, PAS DE PAIEMENT SANS COMPTE (Justin : « ils peuvent pas payer s'ils ont pas de
     compte créé »). La route lit la session dans l'en-tête `Authorization` et demande à `comptes` QUI parle et si son
     adresse est PROUVÉE. `comptes` est un faux fidèle à `comptes.js` : `parJeton` rend l'adresse ou '', jamais un
     objet ; `verifie` dit si l'adresse a été prouvée. Trois sessions : une prouvée, une pas encore, une inconnue. */
  const JETON_PROUVE = 'a'.repeat(64), JETON_A_CONFIRMER = 'b'.repeat(64), JETON_INCONNU = 'c'.repeat(64);
  const COMPTES = {
    parJeton: (j) => ({ [JETON_PROUVE]: 'paie@entreprise-banc.fr', [JETON_A_CONFIRMER]: 'pas-encore@entreprise-banc.fr' }[j] || ''),
    verifie: (m) => m === 'paie@entreprise-banc.fr',
  };
  /* L'annuaire (« B », 28 septembre 2026) : la route ne grave une référence d'espace que si le compte qui paie est
     celui de l'entreprise. Elle lit les VRAIES `espaceT` et `espacesDeRef` du fichier, sur un annuaire de banc où
     « monclient-9f2a » est l'entreprise du compte prouvé. */
  /* ⚠️ et les TARIFS (28 septembre 2026, nuit) : la route n'admet que ceux de la page. Elle lit `STRIPE_PRIX_FORMULE`,
     `STRIPE_PRIX_MESSAGES` et `RANG_FORMULE` — le bloc des constantes des places, déjà extrait plus haut pour `espacePaye`.
     Sans lui, la route jetait (« RANG_FORMULE is not defined ») et répondait 500 : 32 contrôles de ce banc sont tombés
     ainsi. Le tarif du banc est un VRAI tarif public de la page. */
  /* ⚠️ et la FIN D'ESSAI (29 septembre 2026, « 2 oui » de Justin) : la route demande `finEssaiPeriode` pour un tarif
     d'OP GESTION — la vraie, avec `periodeOfferte` et la formule du code, qui lisent `promoUsages`, `espaceFerme` et
     `config.promos`. Sans elles, la route jetait (« finEssaiPeriode is not defined ») et répondait 500 : 30 contrôles de
     ce banc sont tombés ainsi, sur une route juste. */
  /* (et `aboManuelDe`, 30 septembre 2026 : `finEssaiPeriode` lit « réglé à la main » par la même définition qu'`espacePaye`
     — sans elle, elle jetait, et toute facturation différée retombait en immédiate) */
  const AIDES_ROUTE = ['espaceT', 'espacesDeRef', 'espaceParT', 'finEssaiPeriode', 'periodeOfferte', 'formulePromo', 'formuleDuCode', 'aboManuelDe', 'jourApres'].map(extraire).concat([CONSTS]);
  vrai('la route et ses aides (dont finEssaiPeriode et aboManuelDe) sont trouvées dans le fichier réel', AIDES_ROUTE.every(Boolean));
  const PRIX_PRO = (/^\s*pro: \['(price_\w+)'/m.exec(SRC) || [])[1], PRIX_PREMIUM = (/^\s*premium: \['(price_\w+)'/m.exec(SRC) || [])[1];
  vrai('les tarifs Pro et Business Premium du serveur sont lus', /^price_/.test(PRIX_PRO || '') && /^price_/.test(PRIX_PREMIUM || ''));
  const ESPACES_DEFAUT = { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr' } };
  const appeler = async (body, entetes, comptes, espaces, usages, fermes) => {
    let envoye = '', statut = 0, sortie = null, appels = 0;
    const faux = { post: (chemin, h) => { faux._h = h; } };
    new Function('app', 'config', 'fetch', 'URLSearchParams', 'comptes', 'espacesReg', 'promoUsages', 'espaceFerme', 'factureImpayeARegler',
      AIDES_ROUTE.join('\n') + '\n' + SRC.slice(iR, finR))(faux,
      { stripe: { secretKey: 'sk_de_banc' }, promos: [{ code: 'ESSAI-BANC-727', formule: 'premium', mois: 3 }] },
      async (url, opts) => { appels++; envoye = String(opts && opts.body || ''); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
      URLSearchParams, comptes === undefined ? COMPTES : comptes, espaces === undefined ? ESPACES_DEFAUT : espaces, usages || {}, t => (fermes || []).includes(t),
      /* un IMPAYÉ se règle sur sa facture (`factureImpayeARegler`, 29 septembre 2026) : ce bac à sable n'a pas de liste Stripe —
         la redirection se joue sur le VRAI serveur, avec un Stripe simulé qui connaît les impayés (`test-845`) */
      async () => null);
    await faux._h({ body, headers: entetes === undefined ? { authorization: 'Bearer ' + JETON_PROUVE } : entetes },
      { status(c) { statut = c; return this; }, json(o) { sortie = o; return this; } });
    return { envoye, statut, sortie, appels };
  };

  {
    const r = await appeler({ price: PRIX_PRO, quantity: 3, ref: 'monclient-9f2a' });
    vrai('⛔ ce qui part chez Stripe grave la r\u00e9f\u00e9rence sur l\'ABONNEMENT',
      /subscription_data%5Bmetadata%5D%5Bespace%5D=monclient-9f2a/.test(r.envoye));
    vrai('   et la garde sur la session, comme avant',
      /client_reference_id=monclient-9f2a/.test(r.envoye));
    vrai('   la page de paiement est bien rendue', r.sortie && /checkout\.stripe\.com/.test(r.sortie.url || ''));
  }
  {
    const r = await appeler({ price: PRIX_PRO, quantity: 1 });
    v('sans r\u00e9f\u00e9rence, la page de paiement s\'ouvre quand m\u00eame (prospect), sans r\u00e9f\u00e9rence d\'espace grav\u00e9e',
      /subscription_data%5Bmetadata%5D%5Bespace%5D/.test(r.envoye), false);
    vrai('   et elle s\'ouvre vraiment', r.sortie && !!r.sortie.url);
  }
  {
    const r = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'pas valide ; drop' });
    v('⛔ une r\u00e9f\u00e9rence mal form\u00e9e n\'est PAS grav\u00e9e', /subscription_data%5Bmetadata%5D%5Bespace%5D/.test(r.envoye), false);
  }

  /* b bis) ⛔ LE TARIF : ceux de la page seulement (28 septembre 2026, nuit) — et LE CLIENT CHOISIT LEQUEL (Justin,
     29 septembre 2026 : « ils choisissent le tarif qu'ils veulent »). Une nuit durant, la route a refusé un tarif SOUS la
     formule de la fiche (403 `tarif_formule`) : elle aurait bloqué le client qui, au bout d'un code promo Business Premium,
     prend Pro. C'est la formule SERVIE qui suit le tarif payé (`formulePayee`, section 8) : payer Pro donne Pro. */
  {
    const inconnu = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'monclient-9f2a' });
    v('⛔ un tarif qui n\'est pas sur la page : 400 tarif_inconnu, rien chez Stripe', [inconnu.statut, inconnu.sortie && inconnu.sortie.error, inconnu.appels], [400, 'tarif_inconnu', 0]);
    const PREM = { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr', formule: 'premium' } };
    const gravee = r => new URLSearchParams(r.envoye).get('subscription_data[metadata][espace]');
    const bas = await appeler({ price: PRIX_PRO, quantity: 4, ref: 'monclient-9f2a' }, undefined, undefined, PREM);
    v('⛔ le client choisit : fiche Business Premium, tarif Pro × 4 — le paiement s\'ouvre, au tarif Pro, référence gravée',
      [bas.statut || 200, bas.sortie && bas.sortie.error, bas.appels, new URLSearchParams(bas.envoye).get('line_items[0][price]'), new URLSearchParams(bas.envoye).get('line_items[0][quantity]'), gravee(bas)],
      [200, undefined, 1, PRIX_PRO, '4', 'monclient-9f2a']);
    const juste = await appeler({ price: PRIX_PREMIUM, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, PREM);
    v('   le tarif Business Premium passe aussi', [juste.statut || 200, juste.appels], [200, 1]);
    const sansRef = await appeler({ price: PRIX_PRO, quantity: 1 }, undefined, undefined, PREM);
    v('   sans référence (téléphone du patron, fenêtre privée) : le paiement s\'ouvre, rien n\'est gravé', [sansRef.statut || 200, sansRef.appels, gravee(sansRef)], [200, 1, null]);
    const refBidon = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'nimporte-quoi' }, undefined, undefined, PREM);
    v('   une référence inconnue : le paiement s\'ouvre, RIEN n\'est gravé', [refBidon.statut || 200, refBidon.appels, gravee(refBidon)], [200, 1, null]);
    const refNombre = await appeler({ price: PRIX_PRO, quantity: 1, ref: 12 }, undefined, undefined, PREM);
    v('   une référence qui n\'est pas du texte : ignorée, rien n\'est gravé', [refNombre.statut || 200, refNombre.appels, gravee(refNombre)], [200, 1, null]);
    const prospect = await appeler({ price: PRIX_PRO, quantity: 1 }, undefined, undefined, {});
    v('   un prospect (aucune entreprise à son adresse) choisit sa formule : le paiement s\'ouvre', [prospect.statut || 200, prospect.appels], [200, 1]);
    const tableau = await appeler({ price: [PRIX_PREMIUM], quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, PREM);
    v('⛔ un tarif qui n\'est pas du texte (tableau) : 400 tarif invalide, rien chez Stripe', [tableau.statut, tableau.appels], [400, 0]);
    const objet = await appeler({ price: { toString: 1 }, quantity: 1 }, undefined, undefined, PREM);
    v('⛔ … ni un objet (qui faisait jeter : 500)', [objet.statut, objet.appels], [400, 0]);
    const fiche = f => ({ monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr', formule: f } });
    const PRIX_BUSINESS = (/^\s*business: \['(price_\w+)'/m.exec(SRC) || [])[1], PRIX_MSG = (/^\s*msgpro: \['(price_\w+)'/m.exec(SRC) || [])[1];
    const proBiz = await appeler({ price: PRIX_BUSINESS, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, fiche('pro'));
    const bizPrem = await appeler({ price: PRIX_PREMIUM, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, fiche('business'));
    const bizPro = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, fiche('business'));
    const proMsg = await appeler({ price: PRIX_MSG, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, fiche('pro'));
    v('   au-dessus, en dessous, OP MESSAGES : les quatre tarifs de la page passent, quelle que soit la fiche',
      [proBiz.statut || 200, bizPrem.statut || 200, bizPro.statut || 200, proMsg.statut || 200, proBiz.appels + bizPrem.appels + bizPro.appels + proMsg.appels], [200, 200, 200, 200, 4]);
    /* ⛔ LE REFUS NE REVIENT PAS PAR UN AUTRE CHEMIN : aucune réponse de la route ne porte plus `tarif_formule` — c'est ce
       que la page de paiement ne sait plus dire (elle a retiré ce message) */
    const reponses = [bas, juste, sansRef, refBidon, refNombre, prospect, proBiz, bizPrem, bizPro, proMsg].map(r => r.sortie && r.sortie.error).filter(Boolean);
    v('⛔ aucune réponse ne porte plus « tarif_formule »', reponses, []);
    const DEUX = { recent: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr', formule: 'pro', ts: 3 },
      ancien: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr', formule: 'premium', ts: 1 } };
    const deux = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, DEUX);
    v('   deux noms d\'accès, deux formules : le tarif Pro passe, l\'identifiant est gravé', [deux.statut || 200, deux.appels, gravee(deux)], [200, 1, 'monclient-9f2a']);
  }

  /* c) ⛔ PAS DE PAIEMENT SANS COMPTE PROUVÉ — et rien ne part chez Stripe tant que ce n'est pas le cas. */
  {
    const ok = await appeler({ price: PRIX_PRO, quantity: 2, ref: 'monclient-9f2a' });
    v('un compte PROUVÉ ouvre la page de paiement', [ok.statut || 200, !!(ok.sortie && ok.sortie.url)], [200, true]);
    vrai('⛔ l\'adresse du compte est celle du client que Stripe crée (customer_email) — celle que la Tour affiche',
      new URLSearchParams(ok.envoye).get('customer_email') === 'paie@entreprise-banc.fr');
    vrai('⛔ … et gravée sur l\'ABONNEMENT (qui a payé ; survit si l\'adresse change chez Stripe)',
      new URLSearchParams(ok.envoye).get('subscription_data[metadata][compte]') === 'paie@entreprise-banc.fr');
    vrai('   … et sur la session', new URLSearchParams(ok.envoye).get('metadata[compte]') === 'paie@entreprise-banc.fr');
    vrai('   la référence d\'espace voyage toujours avec', new URLSearchParams(ok.envoye).get('subscription_data[metadata][espace]') === 'monclient-9f2a');

    const sans = await appeler({ price: PRIX_PRO, quantity: 1 }, {});
    v('⛔ sans session : 401 « compte_requis », et RIEN ne part chez Stripe', [sans.statut, sans.sortie && sans.sortie.error, sans.appels], [401, 'compte_requis', 0]);
    const inconnue = await appeler({ price: PRIX_PRO, quantity: 1 }, { authorization: 'Bearer ' + JETON_INCONNU });
    v('⛔ une session inconnue (expirée, brûlée) : 401, rien chez Stripe', [inconnue.statut, inconnue.appels], [401, 0]);
    const forme = await appeler({ price: PRIX_PRO, quantity: 1 }, { authorization: 'Bearer pas-une-session' });
    v('   un en-tête qui n\'a pas la forme d\'une session : 401', [forme.statut, forme.appels], [401, 0]);
    const nue = await appeler({ price: PRIX_PRO, quantity: 1 }, { authorization: JETON_PROUVE });
    v('   la session nue, sans « Bearer » (la lecture de comptes.js ne l\'accepte pas non plus) : 401', [nue.statut, nue.appels], [401, 0]);
    const aConfirmer = await appeler({ price: PRIX_PRO, quantity: 1 }, { authorization: 'Bearer ' + JETON_A_CONFIRMER });
    v('⛔ une adresse PAS ENCORE PROUVÉE : 403 « adresse_non_verifiee », rien chez Stripe', [aConfirmer.statut, aConfirmer.sortie && aConfirmer.sortie.error, aConfirmer.appels], [403, 'adresse_non_verifiee', 0]);
    /* Le corps ne décide de rien (CLAUDE.md : « une valeur du CORPS d'une requête ne décide jamais… ») : une adresse
       glissée dans le corps n'est ni lue ni envoyée. */
    const corps = await appeler({ price: PRIX_PRO, quantity: 1, email: 'autre@ailleurs.fr', compte: 'autre@ailleurs.fr', customer_email: 'autre@ailleurs.fr' });
    v('⛔ une adresse écrite dans le CORPS n\'est jamais celle envoyée à Stripe', [new URLSearchParams(corps.envoye).getAll('customer_email'), /ailleurs/.test(corps.envoye)], [['paie@entreprise-banc.fr'], false]);
    const eteints = await appeler({ price: PRIX_PRO, quantity: 1 }, undefined, null);
    v('les comptes du portail éteints : 503, et rien chez Stripe (jamais un paiement anonyme par défaut)', [eteints.statut, eteints.appels], [503, 0]);
  }

  /* d) ⛔ « B — ON VERROUILLE » (Justin, 28 septembre 2026) : SEUL UN COMPTE DE L'ENTREPRISE PAIE POUR ELLE. La référence
     d'espace vient de la page (le marqueur de l'appareil) : sans verrou, un compte confirmé rendait « payée » l'entreprise
     de son choix (`gardien`). Appartenir = l'adresse du compte EST celle de l'entreprise dans l'annuaire. */
  {
    vrai('les deux aides du verrou sont trouvées dans le fichier réel (espaceT, espacesDeRef)', AIDES_ROUTE.every(Boolean));
    const ANN = {
      monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: ' Paie@Entreprise-Banc.fr ' },
      voisine: { nom: 'La voisine', t: 'voisine-77xq', email: 'patron@voisine-banc.fr' },
      sansadresse: { nom: 'Sans adresse', t: 'vide-31kz', email: '' },
      ancienne: { nom: 'Ancienne', code: Buffer.from(JSON.stringify({ t: 'ancienne-5hw' })).toString('base64'), email: 'patron@ancienne-banc.fr' },
    };
    const gravee = r => new URLSearchParams(r.envoye).get('subscription_data[metadata][espace]');
    const sienne = await appeler({ price: PRIX_PRO, quantity: 2, ref: 'monclient-9f2a' }, undefined, undefined, ANN);
    v('le compte de l\'entreprise paie pour elle : la référence est gravée (casse et espaces de l\'adresse de l\'annuaire ignorés)',
      [sienne.statut || 200, gravee(sienne), sienne.appels], [200, 'monclient-9f2a', 1]);
    const casse = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'MONCLIENT-9F2A' }, undefined, undefined, ANN);
    v('   la même, en capitales (espacePaye la reconnaît sans casse) : c\'est l\'identifiant RANGÉ qui est gravé', [casse.statut || 200, gravee(casse), new URLSearchParams(casse.envoye).get('client_reference_id')], [200, 'monclient-9f2a', 'monclient-9f2a']);
    /* ⛔ on grave L'ENTREPRISE, pas le mot envoyé (`gardien`, rejoué) : un nom d'accès se libère et se reprend par une
       autre entreprise, qui hériterait de l'abonnement ; l'identifiant ne se réattribue pas */
    const parSonNom = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'MonClient' }, undefined, undefined, ANN);
    v('⛔ désignée par son NOM D\'ACCÈS : c\'est son IDENTIFIANT qui est gravé, jamais le nom', [parSonNom.statut || 200, gravee(parSonNom), /monclient(?!-)/i.test(new URLSearchParams(parSonNom.envoye).get('client_reference_id') || '')], [200, 'monclient-9f2a', false]);
    const MIENNES = {
      vieillemaison: { nom: 'Vieille maison', code: Buffer.from(JSON.stringify({ t: 'vieille-8mq' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      sansident: { nom: 'Sans identifiant', code: Buffer.from(JSON.stringify({ k: 'x' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      nomun: { nom: 'Nom un', t: 'meme-4pd', email: 'paie@entreprise-banc.fr' },
      nomdeux: { nom: 'Nom deux', t: 'meme-4pd', email: 'paie@entreprise-banc.fr' },
    };
    const dansCode = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'vieillemaison' }, undefined, undefined, MIENNES);
    v('⛔ la sienne, identifiant rangé dans le CODE, désignée par son nom : l\'identifiant du code est gravé', [dansCode.statut || 200, gravee(dansCode)], [200, 'vieille-8mq']);
    const sansIdent = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'SANSIDENT' }, undefined, undefined, MIENNES);
    /* ⛔ une entrée SANS identifiant n'a que son nom d'accès — qui se libère et se reprend (`gardien`) : on ne grave
       RIEN, l'abonnement suit l'adresse du compte, qui est la sienne (vérifiée) */
    v('⛔ une entrée SANS identifiant : le paiement s\'ouvre, RIEN n\'est gravé, il suit l\'adresse du compte',
      [sansIdent.statut || 200, gravee(sansIdent), new URLSearchParams(sansIdent.envoye).get('client_reference_id'), new URLSearchParams(sansIdent.envoye).get('customer_email')],
      [200, null, null, 'paie@entreprise-banc.fr']);
    const deuxNoms = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'meme-4pd' }, undefined, undefined, MIENNES);
    v('   deux noms pour la MÊME entreprise (même identifiant) : une identité, gravée', [deuxNoms.statut || 200, gravee(deuxNoms)], [200, 'meme-4pd']);
    /* une référence qui désigne DEUX entreprises distinctes, toutes deux au compte qui paie (le nom d'accès de l'une est
       l'identifiant, sans tiret, d'une ancienne) : on ne choisit pas pour le client laquelle il paie */
    const AMBI = { abc: { nom: 'Abc', t: 'abc-1x', email: 'paie@entreprise-banc.fr' }, zzz: { nom: 'Zzz', t: 'abc', email: 'paie@entreprise-banc.fr' } };
    const ambigue = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'abc' }, undefined, undefined, AMBI);
    v('⛔ deux entreprises distinctes derrière UNE référence, même au bon compte : 403 « reference_ambigue », rien chez Stripe',
      [ambigue.statut, ambigue.sortie && ambigue.sortie.error, ambigue.appels], [403, 'reference_ambigue', 0]);
    /* identité TYPÉE : un identifiant ancien sans tiret (« abc ») s'écrit comme le NOM d'une entrée sans identifiant —
       ce ne sont pas la même entreprise, même au même compte */
    const TYPE = { abc: { nom: 'Abc sans identifiant', code: Buffer.from(JSON.stringify({ k: 'x' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      zzz: { nom: 'Zzz', t: 'abc', email: 'paie@entreprise-banc.fr' } };
    const typee = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'abc' }, undefined, undefined, TYPE);
    v('⛔ un NOM et un IDENTIFIANT qui s\'écrivent pareil ne font pas une entreprise : 403 « reference_ambigue »', [typee.statut, typee.sortie && typee.sortie.error, typee.appels], [403, 'reference_ambigue', 0]);
    /* ⛔ L'ENTREPRISE, C'EST TOUS SES NOMS D'ACCÈS — la Tour en ouvre parfois SANS adresse. Exiger l'adresse sur CHAQUE
       nom refusait le vrai patron (« pas d'adresse ») dès qu'un de ses noms n'en portait pas. */
    const FAMILLE = { nomprincipal: { nom: 'Nom principal', t: 'fam-7kq', email: 'paie@entreprise-banc.fr' }, nomsecond: { nom: 'Nom second', t: 'fam-7kq', email: '' } };
    const famT = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'fam-7kq' }, undefined, undefined, FAMILLE);
    v('⛔ deux noms pour la même entreprise, l\'un SANS adresse : le patron paie, l\'identifiant est gravé', [famT.statut || 200, gravee(famT)], [200, 'fam-7kq']);
    const famNom = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'NomSecond' }, undefined, undefined, FAMILLE);
    v('   … même désignée par son nom SANS adresse : c\'est l\'entreprise entière qui est lue', [famNom.statut || 200, gravee(famNom)], [200, 'fam-7kq']);
    /* ⛔ LE CONTRÔLE DE SÉCURITÉ DE CETTE RÈGLE : un nom sans adresse ne donne la main à PERSONNE quand l'entreprise en
       porte une ailleurs — sinon viser ce nom-là suffirait à rendre « payée » l'entreprise d'un autre */
    const VICTIME = { victime: { nom: 'Victime', t: 'vict-2mw', email: 'patron@victime-banc.fr' }, victimebis: { nom: 'Victime bis', t: 'vict-2mw', email: '' } };
    const parSonNomVide = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'victimebis' }, undefined, undefined, VICTIME);
    v('⛔⛔ viser le nom SANS adresse de l\'entreprise d\'un autre : 403 « compte_autre_entreprise », rien chez Stripe',
      [parSonNomVide.statut, parSonNomVide.sortie && parSonNomVide.sortie.error, parSonNomVide.appels], [403, 'compte_autre_entreprise', 0]);
    /* deux adresses DIFFÉRENTES pour une même entreprise (un conflit de l'annuaire) : on ne tranche pas au moment de payer */
    const CONFLIT = { conflitun: { nom: 'Conflit un', t: 'conf-3xz', email: 'paie@entreprise-banc.fr' }, conflitdeux: { nom: 'Conflit deux', t: 'conf-3xz', email: 'autre@conflit-banc.fr' } };
    const conflit = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'conflitun' }, undefined, undefined, CONFLIT);
    v('⛔ deux adresses différentes pour une même entreprise, même visée par le nom du payeur : 403, rien chez Stripe',
      [conflit.statut, conflit.sortie && conflit.sortie.error, conflit.appels], [403, 'compte_autre_entreprise', 0]);
    /* une adresse qui n'est pas du TEXTE (aucune route ne l'écrit — une main sur le fichier) : `String(['x'])` vaudrait
       'x' et passerait ; elle compte comme une adresse étrangère (`gardien`) */
    const PASTEXTE = { tableau: { nom: 'Tableau', t: 'tab-9qw', email: ['paie@entreprise-banc.fr'] } };
    const pasTexte = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'tab-9qw' }, undefined, undefined, PASTEXTE);
    v('⛔ une adresse d\'annuaire qui n\'est pas du texte (un tableau) : 403, on échoue fermé', [pasTexte.statut, pasTexte.sortie && pasTexte.sortie.error, pasTexte.appels], [403, 'compte_autre_entreprise', 0]);
    /* l'identifiant TEL QUE L'ANNUAIRE LE RANGE, espaces compris : c'est la valeur qu'espacePaye() comparera */
    const ESPACES_T = { espa: { nom: 'Espa', t: ' esp-1 ', email: 'paie@entreprise-banc.fr' } };
    const espT = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'espa' }, undefined, undefined, ESPACES_T);
    v('   un identifiant rangé avec des espaces : gravé TEL QUEL (celui qu\'espacePaye lira)', [espT.statut || 200, gravee(espT)], [200, ' esp-1 ']);
    const autre = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'voisine-77xq' }, undefined, undefined, ANN);
    v('⛔ la référence d\'une AUTRE entreprise : 403 « compte_autre_entreprise », et RIEN chez Stripe',
      [autre.statut, autre.sortie && autre.sortie.error, autre.appels], [403, 'compte_autre_entreprise', 0]);
    const parNom = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'VOISINE' }, undefined, undefined, ANN);
    v('⛔ … désignée par son NOM D\'ACCÈS, casse changée (espacePaye la rattacherait ainsi) : 403, rien chez Stripe', [parNom.statut, parNom.appels], [403, 0]);
    const vide = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'vide-31kz' }, undefined, undefined, ANN);
    v('⛔ une entreprise SANS adresse : aucun compte ne prouve être le sien — 403 « entreprise_sans_adresse » (un refus qui DIT pourquoi), rien chez Stripe',
      [vide.statut, vide.sortie && vide.sortie.error, vide.appels], [403, 'entreprise_sans_adresse', 0]);
    const ancienne = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'ancienne-5hw' }, undefined, undefined, ANN);
    v('⛔ l\'identifiant rangé dans le CODE (les espaces les plus anciens) compte aussi : 403 « compte_autre_entreprise »', [ancienne.statut, ancienne.sortie && ancienne.sortie.error, ancienne.appels], [403, 'compte_autre_entreprise', 0]);
    const inconnue = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'personne-0000' }, undefined, undefined, ANN);
    v('une référence INCONNUE de l\'annuaire n\'est PAS gravée — l\'abonnement se rattache à l\'adresse du compte, à personne d\'autre',
      [inconnue.statut || 200, gravee(inconnue), new URLSearchParams(inconnue.envoye).get('client_reference_id'), new URLSearchParams(inconnue.envoye).get('customer_email')],
      [200, null, null, 'paie@entreprise-banc.fr']);
    /* une référence qui désigne DEUX entreprises (le nom d'accès de l'une est l'identifiant de l'autre) : espacePaye
       les rattacherait toutes les deux — le compte doit être celui de CHACUNE */
    const DEUX = { 'monclient-9f2a': { nom: 'Homonyme', t: 'homonyme-2c', email: 'autre@homonyme-banc.fr' }, monclient: ANN.monclient };
    const deux = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, DEUX);
    v('⛔ une référence qui désigne DEUX entreprises dont une n\'est pas la sienne : 403, rien chez Stripe', [deux.statut, deux.appels], [403, 0]);
    const corpsMail = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'voisine-77xq', email: 'patron@voisine-banc.fr', compte: 'patron@voisine-banc.fr' }, undefined, undefined, ANN);
    v('⛔ l\'adresse de l\'entreprise écrite dans le CORPS ne prouve rien : 403', [corpsMail.statut, corpsMail.appels], [403, 0]);
    const sansRef = await appeler({ price: PRIX_PRO, quantity: 1 }, undefined, undefined, ANN);
    v('sans référence (on paie avant d\'avoir son espace) : rien ne change, la page de paiement s\'ouvre', [sansRef.statut || 200, gravee(sansRef), sansRef.appels], [200, null, 1]);
  }

  /* 6. ⛔ ET LES TROIS APPELANTS DOIVENT VOIR LA MÊME ENTREPRISE.
     `espacePaye()` rattache par `[e.slug, e.t]`. Or l'entrée brute du registre NE PORTE PAS de
     champ `slug` : la ligne d'`/api/espaces/ouvrir` qui l'écrit ne le pose pas. Seul
     `/api/espaces/etat` passait une entrée enrichie (par `espaceParT()`) ; les deux appels de
     la Tour passaient l'entrée brute. Le commentaire « On compare le slug ET le `t` » était
     donc faux sur deux appels sur trois — et le jour où la référence gravée vaut le SLUG,
     l'application dirait « payé » et la Tour « impayé » sur la même entreprise, au même
     instant. On chercherait du côté de Stripe, qui n'y serait pour rien. */
  {
    /* On liste les APPELS (jamais la définition) et ce que chacun passe. Un appelant qui passe
       une variable nue doit tenir son entrée d'`espaceParT()`, la seule fonction qui pose le
       slug ; tous les autres doivent le recoller eux-mêmes. */
    /* ⛔ ON SCANNE LE CODE, PAS LES COMMENTAIRES. `espacePaye()` est citée huit fois dans des
       explications de ce fichier — et un motif qui les attrape rend huit faux appelants, donc
       un banc qui crie pour rien. C'est la troisième fois ce soir qu'un motif de banc tombe
       sur une phrase au lieu d'une ligne de code : les commentaires s'enlèvent d'abord. */
    const CODE = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const appels = [];
    const re = /(?<!function )espacePaye\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(CODE))) {
      const avant = CODE.slice(Math.max(0, m.index - 600), m.index);
      appels.push({ arg: m[1].trim(), parT: /espaceParT\(/.test(avant) });
    }
    vrai('   il y a bien plusieurs appelants à garder', appels.length >= 3);
    const sansSlug = appels.filter(a2 => !/slug/.test(a2.arg) && !a2.parT).map(a2 => a2.arg);
    v('⛔ aucun appelant ne passe l\'entrée BRUTE du registre (sans slug)', sansSlug, []);
    /* Et `espaceParT` doit vraiment le poser — c'est ce sur quoi la dérogation ci-dessus
       repose. Le jour où elle cesse, le contrôle d'au-dessus deviendrait une autorisation. */
    vrai('⛔ et espaceParT pose bien le slug (sinon la dérogation ne vaut rien)',
      /function espaceParT[\s\S]{0,800}?Object\.assign\(\{ slug \}/.test(SRC));
    /* Le rattachement par slug, exécuté : sans le champ, il ne marche pas — c'est ce que la
       Tour faisait. */
    const avecSlug = await avec([ABO({ customer: { email: 'compta@ailleurs.fr' }, metadata: { espace: 'monclient' } })])({ slug: 'monclient', t: 'ent-x', email: '', formule: 'premium' });
    v('⛔ une entrée AVEC slug se rattache par le slug', avecSlug.paye, true);
    const sans = await avec([ABO({ customer: { email: 'compta@ailleurs.fr' }, metadata: { espace: 'monclient' } })])({ t: 'ent-x', email: '', formule: 'premium' });
    v('   la même SANS slug ne se rattache pas (le défaut de la Tour)', sans.paye, false);
  }

  /* 7. ⛔⛔ UNE LECTURE N'ACTIVE AUCUN CODE PROMO (24 septembre 2026, relevé par `gardien`).
     Le rattrapage d'`espacePaye()` ÉCRIT (compteur, `promos-usages.json`) et ENVOIE un courriel
     au client. L'horloge de conservation balaie TOUTES les entreprises au démarrage, la Tour
     les liste toutes d'un coup : sans `lecture`, chaque code en attente s'activait tout seul.
     On joue la VRAIE fonction, avec un code FICTIF (jamais un vrai : règle du dépôt, et
     `scripts/verif-secrets.sh` refuse tout code qui y ressemble). */
  {
    const CODE = 'ESSAI-BANC-SIX';
    const monter = () => {
      const trace = { ecrit: 0, mails: [] };
      const usages = {};
      const f = construire()(
        { promos: [{ code: CODE, mois: 3, formule: 'premium', maxUtilisations: 2 }] },
        { ts: 0, data: null }, usages, async () => [], { log() {}, error() {} },
        () => { trace.ecrit++; }, (t, c) => { trace.mails.push(c); }, {}, () => null, require('crypto'), false);
      return { f, trace, usages };
    };
    const ENT = { slug: 'enattente', t: 'ent-attente-qk', email: 'patron@exemple.fr', formule: 'premium', codePromo: CODE };

    const L = monter();
    const rl = await L.f(ENT, { lecture: true });
    v('⛔⛔ en LECTURE : rien n\'est écrit', L.trace.ecrit, 0);
    v('⛔⛔ … aucun courriel ne part', L.trace.mails, []);
    v('   … et le compteur du code ne bouge pas', L.usages[CODE], undefined);
    v('⛔ un code valable en attente compte comme PAYÉ (« en cas de doute, ça paie »)', [rl.paye, rl.enAttente, rl.promoCode], [true, true, CODE]);
    const Lpro = monter();
    const rlPro = await Lpro.f(Object.assign({}, ENT, { formule: 'pro' }), { lecture: true });
    v('   … et la Tour y lit la formule que la période SERVIRA : celle du code (Business Premium), pas la fiche Pro', [rlPro.enAttente, rlPro.formuleServie, Lpro.trace.ecrit], [true, 'premium', 0]);
    vrai('   et le motif dit qu\'il est en attente', /en attente/.test(rl.motif));

    /* Le témoin : sans `lecture` — l'application de l'entreprise qui demande son état —
       le rattrapage fait son travail. Sans ce témoin, « rien n'est écrit » pourrait vouloir dire
       que le rattrapage ne tourne plus du tout. */
    const W = monter();
    const rw = await W.f(ENT);
    v('   sans `lecture` (l\'application) : le code s\'ACTIVE', [rw.paye, W.trace.ecrit, W.usages[CODE] && W.usages[CODE].n], [true, 1, 1]);
    v('   … et le courriel part, une fois', W.trace.mails, [CODE]);
    const rw2 = await W.f(ENT);
    v('   … une seule fois : un second appel ne recompte rien', [rw2.paye, W.trace.ecrit, W.usages[CODE].n], [true, 1, 1]);

    /* Et qui lit, qui active : la liste est courte et nommée. */
    const CODE_SRC = SRC.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    const appels = [...CODE_SRC.matchAll(/(?<!function )espacePaye\(([^\n]*)/g)].map(m => m[1]);
    vrai('   la population des appelants est là', appels.length >= 4);
    const actifs = appels.filter(a => !/\{ lecture: true \}/.test(a));
    v('⛔⛔ un SEUL appelant active : l\'application qui demande son état', actifs.length, 1);
    vrai('   … et c\'est bien `/api/espaces/etat` (espacePaye(e).then)', /^e\)\.then\(/.test(actifs[0] || ''));
  }

  /* 8. ⛔⛔ LA FORMULE SERVIE — CELLE QUE L'APPLICATION REÇOIT (Justin, 29 septembre 2026 : « ils choisissent le tarif
     qu'ils veulent » ; « le code promo, mets-le au plus gros forfait — c'est pour mieux montrer l'application »). La route de
     paiement ne refuse plus un tarif sous la fiche (b bis) : c'est ICI que payer Pro donne Pro. Sans ça, une fiche Business
     Premium payée au tarif Pro restait Business Premium — le trou que la relecture adverse avait rejoué.
     Les abonnements d'APRÈS la bascule des places portent `created` ; ceux du reste de ce banc n'en ont pas (d'avant). */
  {
    const APRES = Math.floor(Date.parse('2026-10-01T00:00:00Z') / 1000);
    const prixDe = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
    const P = { pro: prixDe('pro'), business: prixDe('business'), premium: prixDe('premium'), msg: prixDe('msgpro') };
    vrai('les quatre tarifs de la page sont lus dans le serveur', Object.values(P).every(x => /^price_/.test(x || '')));
    const L = (k, q) => ({ price: { id: P[k] }, quantity: q });
    const apres = (lignes, o) => ABO(Object.assign({ created: APRES, customer: { email: 'patron@client.fr' }, items: { data: lignes } }, o));
    const avant = (lignes, o) => ABO(Object.assign({ created: 1, customer: { email: 'patron@client.fr' }, items: { data: lignes } }, o));
    const lit = r => [r.paye, r.formuleServie, r.placesStripe];

    const bas = await avec([apres([L('pro', 4)])])(ESP());
    v('⛔⛔ fiche Business Premium, abonnement Pro × 4 : l\'application reçoit PRO, 4 places', lit(bas), [true, 'pro', 4]);
    vrai('   et le motif dit la formule payée', /formule payée : Pro\b/.test(bas.motif));
    const haut = await avec([apres([L('premium', 2)])])(ESP({ formule: 'pro' }));
    v('   fiche Pro, abonnement Business Premium × 2 : BUSINESS PREMIUM, 2 places', lit(haut), [true, 'premium', 2]);
    const pareil = await avec([apres([L('business', 3)])])(ESP({ formule: 'business' }));
    v('   fiche Business, abonnement Business × 3 : Business, 3 places — et le motif ne parle d\'aucun écart', [...lit(pareil), /formule payée/.test(pareil.motif)], [true, 'business', 3, false]);

    /* ⛔ UNE LISTE PÉRIMÉE NE DIT PAS QUI NE PAIE PAS (seconde relecture de `gardien`, 30 septembre 2026). La relecture a
       échoué : la dernière liste connue sert encore à SERVIR qui y paie ; mais une entreprise qui a payé depuis n'y est pas —
       son absence ne prouve rien (elle était suspendue sans sursis). Un impayé qu'on y lit, lui, bloque encore : c'est ce que
       Stripe a dit, et la page de paiement relit la facture en direct avant d'y envoyer. */
    const VIEUX = Date.now() - 10 * 60000;   // plus vieux que `STRIPE_CACHE_MS` (cinq minutes)
    const panne = async () => { throw new Error('Stripe en panne (banc 727)'); };
    const perimee = (abos, cache) => avecTout({ abos, cache: cache || { ts: VIEUX, data: abos, enCours: null, echecTs: 0, echecDepuis: 0 }, lire: panne });
    const absente = await perimee([apres([L('pro', 2)], { customer: { email: 'autre@ailleurs.fr' } })])(ESP({ formule: 'pro' }));
    v('⛔ liste PÉRIMÉE (la relecture a échoué), l\'entreprise n\'y est pas : on ne sait pas — ni suspendue, ni servie',
      [absente.paye, absente.inconnu, /liste Stripe périmée/.test(absente.motif || '')], [true, true, true]);
    const presente = await perimee([apres([L('pro', 2)])])(ESP({ formule: 'pro' }));
    v('   … elle y paie : servie (la dernière liste connue sert — on ne coupe pas le temps d\'une panne)',
      [presente.paye, presente.inconnu, presente.formuleServie], [true, undefined, 'pro']);
    const impPerimee = await perimee([apres([L('pro', 2)], { status: 'past_due' })])(ESP({ formule: 'pro' }));
    v('   ⛔ un IMPAYÉ lu dans la liste périmée bloque encore (Stripe l\'a dit ; la page de paiement relit la facture en direct)',
      [impPerimee.paye, impPerimee.bloque, impPerimee.inconnu], [false, true, undefined]);
    /* ⛔ … et trouvée dans la liste périmée SANS rien d'OP GESTION à elle (OP MESSAGES seul) : elle a pu acheter OP GESTION pendant
       la panne — on ne sait pas non plus, fiche Pro comme fiche « Gratuit » d'avant (troisième relecture de `gardien`) */
    const msgPro = await perimee([apres([L('msg', 1)])])(ESP({ formule: 'pro' }));
    const msgGra = await perimee([apres([L('msg', 1)])])(ESP({ formule: 'gratuit' }));
    v('⛔ liste PÉRIMÉE, seul OP MESSAGES y est payé : un doute — fiche Pro comme fiche « Gratuit » d\'avant',
      [msgPro.paye, msgPro.inconnu, msgGra.paye, msgGra.inconnu], [true, true, true, true]);
    const msgFrais = await avecTout({ abos: [apres([L('msg', 1)])] })(ESP({ formule: 'pro' }));
    const msgFraisG = await avecTout({ abos: [apres([L('msg', 1)])] })(ESP({ formule: 'gratuit' }));
    v('   (témoin) la même liste FRAÎCHE décide : OP GESTION n\'est pas payé — suspendue, les deux fiches',
      [msgFrais.paye, msgFrais.inconnu, msgFraisG.paye, msgFraisG.inconnu], [false, undefined, false, undefined]);
    const fraiche = await avecTout({ abos: [apres([L('pro', 2)], { customer: { email: 'autre@ailleurs.fr' } })] })(ESP({ formule: 'pro' }));
    v('   (témoin) la même absence dans une liste FRAÎCHE décide : pas payée', [fraiche.paye, fraiche.inconnu], [false, undefined]);
    /* la date du premier échec — ce que `/health` publie (`stripeEchecMin`) : posée au premier échec, gardée au suivant, remise
       à zéro par une lecture réussie */
    const cacheP = { ts: VIEUX, data: [], enCours: null, echecTs: 0, echecDepuis: 0 };
    await perimee([], cacheP)(ESP({ formule: 'pro' }));
    const premier = cacheP.echecDepuis;
    /* une minute a passé depuis le premier échec (la date recule d'autant) : le second échec la GARDE — sans ce recul, deux
       échecs dans la même milliseconde ne distingueraient pas « gardée » de « réécrite » */
    cacheP.echecTs = 0; cacheP.echecDepuis = premier - 60000;
    await perimee([], cacheP)(ESP({ formule: 'pro' }));
    const second = cacheP.echecDepuis;
    cacheP.echecTs = 0;
    await avecTout({ cache: cacheP, lire: async () => [] })(ESP({ formule: 'pro' }));
    v('⛔ la date du premier échec : posée, GARDÉE au second échec, remise à zéro par une lecture réussie',
      [premier > 0, second === premier - 60000, cacheP.echecDepuis], [true, true, 0]);
    /* ⛔ LE DOUTE DU REGISTRE SERT LA FORMULE DU CODE (seconde relecture de `gardien`) : une fiche Pro en période Business
       Premium, registre des codes illisible — la fiche seule la faisait retomber en Pro, `db.forfait` réécrit et synchronisé */
    const douteCode = await construire()({ stripe: { secretKey: 'sk_de_banc' }, promos: [{ code: 'ESSAI-DOUTE-SEPT', formule: 'premium', mois: 3 }] },
      { ts: Date.now(), data: [] }, {}, async () => [], { error() {}, log() {} }, () => true, () => {}, {}, () => null, require('crypto'), true)(
      ESP({ formule: 'pro', codePromo: 'ESSAI-DOUTE-SEPT' }));
    v('⛔ registre des codes illisible, une fiche Pro qui porte un code Business Premium : dans le doute, payée — au tarif du CODE',
      [douteCode.paye, douteCode.doute, douteCode.formuleServie], [true, true, 'premium']);
    /* ⛔ PLUSIEURS FORMULES PAYÉES : celle qui porte le PLUS d'abonnements, à égalité la plus BASSE (relecture adverse du
       29 septembre, rejoué : « la plus haute » donnait Business Premium avec UNE place à dix abonnements Pro et un Premium) */
    const deux = await avec([apres([L('pro', 2)]), apres([L('premium', 1)])])(ESP({ formule: 'business' }));
    v('⛔ deux abonnements (Pro × 2, Business Premium × 1) : PRO, celle qui en porte le plus — et les 3 places (Premium compte au-dessus)', lit(deux), [true, 'pro', 3]);
    const dix = await avec([apres([L('pro', 10)]), apres([L('premium', 1)])])(ESP({ formule: 'pro' }));
    v('⛔ fiche Pro, dix Pro et un Business Premium pour le patron : Pro, 11 places — pas Business Premium avec une seule', lit(dix), [true, 'pro', 11]);
    const egal = await avec([apres([L('pro', 1)]), apres([L('premium', 1)])])(ESP({ formule: 'business' }));
    v('   à égalité (Pro × 1, Business Premium × 1) : la plus BASSE, et ses 2 places — plus de places plutôt que moins', lit(egal), [true, 'pro', 2]);
    const majo = await avec([apres([L('pro', 1)]), apres([L('premium', 3)])])(ESP({ formule: 'pro' }));
    v('   et quand Business Premium porte le plus (Pro × 1, Premium × 3) : Business Premium, 3 places + la fiche Pro n\'en perd aucune (4)', lit(majo), [true, 'premium', 4]);

    /* ⛔ UNE FICHE « GRATUIT » QUI PAIE REÇOIT CE QU'ELLE PAIE : elle sortait avant Stripe, et payer sur la page la laissait
       en Gratuit jusqu'à un geste de la Tour */
    const gratuitePaie = await avec([apres([L('business', 2)])])(ESP({ formule: 'gratuit' }));
    v('⛔ fiche Gratuit, abonnement Business × 2 : BUSINESS, 2 places', lit(gratuitePaie), [true, 'business', 2]);
    /* ⛔⛔ v767 (Justin, 30 septembre 2026 : « si une entreprise ne paye plus, le service est suspendu tant que c'est pas
       réglé ») : le Gratuit n'existe plus — une fiche « Gratuit » qui ne paie rien n'est PAS payée (`/api/espaces/etat` la
       sert suspendue). Jusqu'au 30 septembre, ces deux contre-épreuves attendaient « payé, gratuit ». */
    const gratuiteRien = await avec([])(ESP({ formule: 'gratuit' }));
    v('   contre-épreuve : fiche Gratuit sans abonnement — PAS payée : suspendue jusqu\'au règlement (le Gratuit n\'existe plus)',
      [gratuiteRien.paye, /aucun paiement ni code promo : suspendue jusqu'au règlement/.test(gratuiteRien.motif), gratuiteRien.formuleServie], [false, true, undefined]);
    const gratuiteMsg = await avec([apres([L('msg', 1)])])(ESP({ formule: 'gratuit' }));
    v('   fiche Gratuit qui ne paie qu\'OP MESSAGES : PAS payée — OP MESSAGES ne sert pas OP GESTION, et le motif le dit',
      [gratuiteMsg.paye, /seul OP MESSAGES est payé/.test(gratuiteMsg.motif), gratuiteMsg.formuleServie], [false, true, undefined]);
    /* ⛔ … mais on ne coupe pas une entreprise qui paie : un abonnement d'OP GESTION SÛREMENT à elle qu'on ne sait pas lire
       (d'avant la bascule, ou une ligne à tarif fait à la main) sert la formule d'entrée, Pro — `gratuitPayeIllisible`, la
       même règle que le rappel J-7 rejoue (`test-844`) */
    const gratuiteAncien = await avec([avant([L('pro', 1)])])(ESP({ formule: 'gratuit' }));
    v('⛔ fiche Gratuit payée par un abonnement d\'AVANT la bascule (tarif illisible) : on ne coupe pas — Pro, et le motif le dit à la Tour',
      [gratuiteAncien.paye, gratuiteAncien.formuleServie, /abonnement illisible : Pro servi/.test(gratuiteAncien.motif)], [true, 'pro', true]);
    /* ⛔ … et son TARIF, quand il est connu (`gardien` A5, 30 septembre 2026) : un abonnement d'avant la bascule au tarif
       Business Premium reste Business Premium — Pro seulement quand le tarif ne se lit pas (`formuleGratuitIllisible`) */
    const gratuiteAncienPrem = await avec([avant([L('premium', 1)])])(ESP({ formule: 'gratuit' }));
    v('⛔ fiche Gratuit payée par un abonnement d\'AVANT la bascule au tarif Business Premium : Business Premium, pas Pro — et le motif le dit',
      [gratuiteAncienPrem.paye, gratuiteAncienPrem.formuleServie, /abonnement illisible : Business Premium servi/.test(gratuiteAncienPrem.motif)], [true, 'premium', true]);

    /* ⛔⛔ UN « ESSAI » OU UN « ACTIF » RÉGLÉ À LA MAIN ET ÉCHU NE DÉCIDE PLUS (`gardien` B1, 30 septembre 2026). « Essai offert
       jusqu'au … » — le geste que la Tour conseille — l'emportait encore APRÈS sa fin sur Stripe et sur la période offerte :
       l'entreprise qui avait payé entre-temps restait suspendue jusqu'à ce que la Tour efface le réglage. */
    const hier = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const echuStripe = await avec([apres([L('premium', 1)])])(ESP({ aboStatut: 'essai', aboFin: hier, aboPar: 'Banc' }));
    v('⛔⛔ « essai offert » réglé dans la Tour, ÉCHU, et un abonnement Stripe payé depuis : payée par Stripe — plus suspendue jusqu\'à ce que la Tour efface le réglage',
      [echuStripe.paye, echuStripe.formuleServie, /abonnement Stripe/.test(echuStripe.motif)], [true, 'premium', true]);
    const echuPeriode = await avecTout({ usages: { 'ESSAI-ECHU-727': { n: 1, equipes: { 'ent-x': { date: '2026-09-01', finLe: '2099-12-31' } } } },
      promos: [{ code: 'ESSAI-ECHU-727', formule: 'premium', mois: 3 }] })(ESP({ aboStatut: 'essai', aboFin: hier, aboPar: 'Banc' }));
    v('⛔ … et en pleine période offerte : servie par le code (« les codes n\'y touchent pas »)', [echuPeriode.paye, /code promo ESSAI-ECHU-727/.test(echuPeriode.motif)], [true, true]);
    const echuRien = await avec([])(ESP({ aboStatut: 'actif', aboFin: hier, aboPar: 'Banc' }));
    v('   … rien d\'autre : non payée, et le motif dit encore à la Tour que l\'abonnement réglé à la main est terminé',
      [echuRien.paye, /^abonnement terminé le \d{4}-\d{2}-\d{2} \(réglé par Banc\) — aucun paiement ni code promo$/.test(echuRien.motif)], [false, true]);
    const courant = await avec([])(ESP({ aboStatut: 'essai', aboFin: '2099-12-31', aboPar: 'Banc' }));
    v('   (témoin) un essai réglé à la main qui COURT encore décide toujours : payé, sans Stripe', [courant.paye, /^essai offert par Banc/.test(courant.motif)], [true, true]);
    const gratuiteMain = await avec([apres([L('msg', 1), { price: { id: 'price_cree_a_la_main' }, quantity: 2 }])])(ESP({ formule: 'gratuit' }));
    v('   … et un abonnement qui porte OP MESSAGES ET une ligne d\'OP GESTION à tarif fait à la main : Pro aussi (il paie OP GESTION)',
      [gratuiteMain.paye, gratuiteMain.formuleServie], [true, 'pro']);

    /* ⛔⛔ UNE FICHE SANS FORMULE PREND LE CHEMIN DE LA FICHE « GRATUIT » (Justin, 30 septembre 2026, à « les suspendre aussi ? » :
       « Suspend » — `ficheSansFormule`). Jusque-là, `espacePaye` sortait sur « aucune formule » AVANT de regarder la période
       offerte et Stripe, et `/api/espaces/etat` lui ouvrait tout. Elle reçoit désormais ce qu'elle paie, et rien de payé la
       suspend ; le motif garde « aucune formule » EN TÊTE — l'horloge de conservation y lit « jamais abonnée ». */
    const SANS = o => ESP(Object.assign({ formule: undefined }, o || {}));
    const sansRien = await avec([])(SANS());
    v('⛔⛔ fiche SANS formule, ni abonnement ni code : PAS payée — suspendue, et le motif commence par « aucune formule » (conservation)',
      [sansRien.paye, sansRien.formuleServie, /^aucune formule posée dans la Tour — aucun paiement ni code promo : suspendue jusqu'au règlement$/.test(sansRien.motif)], [false, undefined, true]);
    const sansPaie = await avec([apres([L('business', 2)])])(SANS());
    v('⛔ fiche sans formule, abonnement Business × 2 : BUSINESS, 2 places — elle reçoit ce qu\'elle paie', lit(sansPaie), [true, 'business', 2]);
    const sansMsg = await avec([apres([L('msg', 1)])])(SANS());
    v('   fiche sans formule qui ne paie qu\'OP MESSAGES : PAS payée, et le motif le dit',
      [sansMsg.paye, /^aucune formule posée dans la Tour — seul OP MESSAGES est payé/.test(sansMsg.motif)], [false, true]);
    const sansAncien = await avec([avant([L('pro', 1)])])(SANS());
    v('⛔ fiche sans formule payée par un abonnement d\'AVANT la bascule (illisible) : on ne coupe pas — Pro, et le motif le dit',
      [sansAncien.paye, sansAncien.formuleServie, /fiche sans formule, abonnement illisible : Pro servi/.test(sansAncien.motif)], [true, 'pro', true]);
    const sansPeriode = await avecTout({ promos: [{ code: 'ESSAI-BANC-SANSF', mois: 3 }], usages: { 'ESSAI-BANC-SANSF': { n: 1, equipes: { 'ent-x': { date: '2026-09-01', finLe: '2099-12-31' } } } } })(SANS());
    v('⛔⛔ fiche sans formule EN PÉRIODE OFFERTE : servie, à la formule du code (Business Premium) — les codes promo n\'y touchent pas',
      [sansPeriode.paye, sansPeriode.promoCode, sansPeriode.formuleServie], [true, 'ESSAI-BANC-SANSF', 'premium']);
    const sansImpaye = await avec([apres([L('pro', 1)], { status: 'past_due' })])(SANS());
    v('⛔ fiche sans formule, sa carte refusée : l\'impayé, comme partout (`bloque`)', [sansImpaye.paye, sansImpaye.bloque], [false, true]);
    /* … mais l'impayé SANS référence d'une AUTRE entreprise à la même adresse ne la dit pas « impayée » (`impayeBloque` : la
       règle de la fiche « Gratuit », qu'elle suit) — elle n'est pas payée pour autant : suspendue, motif « aucune formule » */
    const sansVoisine = { slug: 'sansvoisine', t: 'ent-sansvoisine', email: 'pat@acme.fr' };
    const sansImpVois = await avecTout({ abos: [apres([L('pro', 1)], { status: 'past_due', customer: { email: 'pat@acme.fr' } })],
      reg: { sansVoisine, grande: { slug: 'grande', t: 'ent-grande', email: 'pat@acme.fr', formule: 'premium' } } })(sansVoisine);
    v('⛔ fiche sans formule, l\'impayé SANS référence d\'une voisine d\'adresse : pas « impayée » (ce n\'est pas le sien) — suspendue, motif « aucune formule »',
      [sansImpVois.paye, sansImpVois.bloque, /^aucune formule posée dans la Tour/.test(sansImpVois.motif)], [false, undefined, true]);
    const sansManuel = await avec([])(SANS({ aboStatut: 'actif', aboPar: 'Banc' }));
    v('⛔ fiche sans formule réglée « active » à la main (une entrée d\'avant — la Tour exige une formule) : ce réglage ne sert rien, suspendue',
      [sansManuel.paye, /^aucune formule posée dans la Tour/.test(sansManuel.motif)], [false, true]);
    const sansManuelImp = await avec([])(SANS({ aboStatut: 'impaye', aboPar: 'Banc' }));
    v('   … un « impayé » posé à la main garde son sens : bloquée', [sansManuelImp.paye, sansManuelImp.bloque], [false, true]);
    const sansPerimee = await perimee([apres([L('msg', 1)])])(SANS());
    v('   ⛔ liste Stripe PÉRIMÉE, seul OP MESSAGES y est : un doute, comme pour une fiche « Gratuit » — ni suspendue, ni servie',
      [sansPerimee.paye, sansPerimee.inconnu], [true, true]);

    /* OP MESSAGES n'est pas une formule d'OP GESTION */
    const msgSeul = await avec([apres([L('msg', 3)])])(ESP());
    v('⛔ fiche Business Premium qui ne paie qu\'OP MESSAGES (abonnement d\'après) : OP GESTION n\'est PAS payé (suspendu — plus de Gratuit), et le motif le dit sans « formule payée »',
      [msgSeul.paye, msgSeul.formuleServie, /OP GESTION non payé \(seul OP MESSAGES l'est\)/.test(msgSeul.motif), /formule payée/.test(msgSeul.motif)], [false, undefined, true, false]);

    /* ⛔ CE QU'ON NE SAIT PAS LIRE GARDE LA FICHE : on ne coupe pas une entreprise qui paie */
    const ancien = await avec([avant([L('pro', 1)])])(ESP());
    v('⛔ un abonnement d\'AVANT la bascule (ancien lien, autre tarif) : la fiche reste — Business Premium, ses 3 places d\'avant', lit(ancien), [true, 'premium', 3]);
    const main = await avec([apres([{ price: { id: 'price_cree_a_la_main' }, quantity: 5 }])])(ESP({ formule: 'business' }));
    v('   un tarif créé à la main chez Stripe (après) : la fiche reste — Business', [main.paye, main.formuleServie], [true, 'business']);
    const rienALire = await avec([ABO({ customer: { email: 'patron@client.fr' } })])(ESP());
    v('   un abonnement sans ligne du tout : la fiche reste, payée', [rienALire.paye, rienALire.formuleServie], [true, 'premium']);

    /* ⛔ UNE FORMULE SERVIE QUI N'EST PAS LA FICHE EST UNE FORMULE CHANGÉE APRÈS LA BASCULE : ses abonnements d'avant ne
       prennent pas son multiplicateur (`placesDeFormule`, le même refus qu'une formule changée dans la Tour) */
    const monte = await avec([avant([L('business', 1)]), apres([L('premium', 2)])])(ESP({ formule: 'business' }));
    v('⛔ fiche Business, un Business d\'avant + deux Business Premium d\'après : Business Premium, 4 places — l\'ancien garde ses 2 places de Business (jamais le × 3 : ce serait 5), et monter n\'en retire aucune',
      lit(monte), [true, 'premium', 4]);
    const monteSeul = await avec([avant([L('business', 5)]), apres([L('premium', 1)])])(ESP({ formule: 'business', quantite: 5 }));
    v('⛔ fiche Business × 5 d\'avant (10 places) + UN Business Premium : Business (le plus d\'abonnements), 11 places — acheter plus cher n\'en retire pas 4',
      lit(monteSeul), [true, 'business', 11]);
    const reste = await avec([avant([L('business', 1)]), apres([L('business', 1)])])(ESP({ formule: 'business' }));
    v('   contre-épreuve : un Business d\'avant + un Business d\'après — Business, 2 + 1 = 3 places, comme hier', lit(reste), [true, 'business', 3]);

    /* ⛔⛔ LA FORMULE NE SE DÉCIDE PAS SUR CE QUI EST AMBIGU (relecture adverse du 29 septembre 2026, rejoué). Monter : sur
       ce qui est SÛREMENT à elle ; descendre : seulement sans doute. */
    const moi = { slug: 'monclient', t: 'ent-x', email: 'patron@client.fr', formule: 'premium' };
    const grave = (lignes, ref, o) => apres(lignes, Object.assign({ metadata: { espace: ref } }, o));
    const orph = await avecTout({ abos: [grave([L('premium', 3)], 'ent-ancien'), grave([L('msg', 1)], 'ent-x')], reg: { monclient: moi } })(ESP());
    v('⛔⛔ « repartie à neuf » : Business Premium × 3 gravé à l\'ANCIEN identifiant + OP MESSAGES gravé au neuf — Business Premium et ses 3 places (plus « Gratuit »)',
      lit(orph), [true, 'premium', 3]);
    const deuxNoms = await avecTout({ abos: [grave([L('premium', 3)], 'ent-ancien'), grave([L('msg', 1)], 'ent-x')],
      reg: { monclient: moi, ancien: { slug: 'ancien', t: 'ent-ancien', email: 'patron@client.fr', formule: 'premium' } } })(ESP());
    v('⛔ … et son autre nom garde l\'ancien identifiant (à la même adresse) : dans le doute, la fiche — Business Premium, jamais Gratuit',
      [deuxNoms.paye, deuxNoms.formuleServie], [true, 'premium']);
    const petite = { slug: 'petite', t: 'ent-petite', email: 'pat@acme.fr', formule: 'gratuit' };
    const partage = await avecTout({ abos: [apres([L('premium', 4)], { customer: { email: 'pat@acme.fr' } })],
      reg: { petite, grande: { slug: 'grande', t: 'ent-grande', email: 'pat@acme.fr', formule: 'premium' } } })(petite);
    /* ⛔ v767 : PAS payée, donc suspendue — et surtout PAS « Pro servi » : la branche « abonnement illisible » ne sert que
       ce qui est SÛREMENT à elle (`surs`). Sans cette condition, la voisine payait l'accès de la petite. */
    v('⛔ fiche Gratuit, et un abonnement SANS référence d\'une AUTRE entreprise à la même adresse : PAS payée (suspendue) — un paiement ne sert pas deux entreprises',
      [partage.paye, /pas sûrement le sien/.test(partage.motif), partage.formuleServie], [false, true, undefined]);
    /* ⛔ v767 : une période offerte dont le code a QUITTÉ la configuration ne dit plus sa formule — sur une fiche « Gratuit »
       d'avant, elle servait « gratuit », que `/api/espaces/etat` suspend désormais : une entreprise en pleine période offerte
       aurait été coupée. La formule d'un code par défaut (Business Premium), jamais « gratuit ». */
    const codeParti = await avecTout({ usages: { 'ESSAI-PARTI-727': { n: 1, equipes: { 'ent-petite': { date: '2026-09-01', finLe: '2099-12-31' } } } }, promos: [], reg: { petite } })(petite);
    v('⛔ période offerte en cours, code retiré de la configuration, fiche Gratuit : payée, Business Premium — jamais « gratuit »',
      [codeParti.paye, codeParti.formuleServie], [true, 'premium']);
    const seule = await avecTout({ abos: [apres([L('premium', 4)], { customer: { email: 'pat@acme.fr' } })], reg: { petite } })(petite);
    v('   contre-épreuve : la même, seule à son adresse — elle paie : Business Premium, 4 places', lit(seule), [true, 'premium', 4]);
    const b = { slug: 'bravo', t: 'ent-b', email: 'pat@acme.fr', formule: 'premium' };
    const regAB = { bravo: b, alpha: { slug: 'alpha', t: 'ent-a', email: 'pat@acme.fr', formule: 'premium' } };
    const doute = await avecTout({ abos: [grave([L('pro', 2)], 'ent-b', { customer: { email: 'pat@acme.fr' } }), grave([L('premium', 1)], 'ent-a', { customer: { email: 'pat@acme.fr' } })], reg: regAB })(b);
    v('   deux entreprises à la même adresse, chacune son abonnement gravé : celle qui paie Pro GARDE sa fiche — dans le doute on ne descend pas (limite : une adresse, une entreprise)',
      [doute.paye, doute.formuleServie], [true, 'premium']);
    const sansDoute = await avecTout({ abos: [grave([L('pro', 2)], 'ent-b', { customer: { email: 'pat@acme.fr' } })], reg: regAB })(b);
    v('   contre-épreuve : sans l\'abonnement de l\'autre, elle descend à ce qu\'elle paie — Pro, 2 places', lit(sansDoute), [true, 'pro', 2]);

    /* ⛔ UNE PÉRIODE OFFERTE SERT LA FORMULE DU CODE, FICHE « GRATUIT » COMPRISE (règle 3 ; `/api/promo/valider` enregistre
       la période sans toucher la fiche) — lue, jamais activée */
    const offert = await avecTout({ promos: [{ code: 'ESSAI-BANC-GRATUIT', mois: 3 }], usages: { 'ESSAI-BANC-GRATUIT': { n: 1, equipes: { 'ent-x': { date: '2026-09-01', finLe: '2099-12-31' } } } } })(ESP({ formule: 'gratuit' }));
    v('⛔ fiche Gratuit, code en cours (sans formule dite) : Business Premium, le plus gros forfait', [offert.paye, offert.formuleServie, offert.promoCode], [true, 'premium', 'ESSAI-BANC-GRATUIT']);

    /* ⛔ UNE SEULE LECTURE DE STRIPE À LA FOIS, ET PAS DE RAFALE PENDANT UNE PANNE (« Mon espace » lit aussi ce cache) */
    let lectures = 0;
    const cache = { ts: 0, data: null, enCours: null, echecTs: 0 };
    const lent = async () => { lectures++; await new Promise(r => setTimeout(r, 60)); return [apres([L('pro', 2)])]; };
    const ep = avecTout({ cache, lire: lent });
    const [r1, r2] = await Promise.all([ep(ESP()), ep(ESP())]);
    v('⛔ deux lectures en même temps : UN appel à Stripe, et les deux réponses le lisent', [lectures, r1.formuleServie, r2.formuleServie], [1, 'pro', 'pro']);
    let essais = 0;
    const cache2 = { ts: 0, data: null, enCours: null, echecTs: 0 };
    const ep2 = avecTout({ cache: cache2, lire: async () => { essais++; throw new Error('Stripe muet'); } });
    const p1 = await ep2(ESP()), p2 = await ep2(ESP());
    /* ⛔ v767 (relectures du 30 septembre 2026, `gardien` B3) : sans liste connue, « non payé » était une SUSPENSION complète de
       toute l'équipe pour une panne de Stripe au redémarrage du serveur. On ne sait pas : `inconnu` — `/api/espaces/etat` le
       sert `verificationImpossible`, et l'appareil garde ce qu'il savait. Rien d'inventé pour autant : ni formule, ni places. */
    v('⛔ Stripe en panne sans liste connue : un essai, puis une minute de pause — et DANS LE DOUTE rien n\'est décidé (ni « non payé », ni une formule)',
      [essais, p1.inconnu, p2.inconnu, p1.formuleServie, p2.formuleServie, 'placesStripe' in p1], [1, true, true, undefined, undefined, false]);
    cache2.echecTs = Date.now() - 61000;
    await ep2(ESP());
    v('   la minute passée, on réessaie', essais, 2);
    /* ⛔ une panne AVEC une liste déjà connue : l'appel qui attendait la lecture ratée rendait « non payé » — la liste d'avant
       sert, à lui comme aux suivants (on ne coupe pas une entreprise qui paie le temps d'une panne de Stripe) */
    let essais3 = 0;
    const cache3 = { ts: Date.now() - 6 * 60000, data: [apres([L('pro', 2)])], enCours: null, echecTs: 0 };
    const ep3 = avecTout({ cache: cache3, lire: async () => { essais3++; throw new Error('Stripe muet'); } });
    const [q1, q2] = await Promise.all([ep3(ESP()), ep3(ESP())]);
    const q3 = await ep3(ESP());
    v('⛔ Stripe en panne, une liste connue (périmée) : les appels qui attendaient la lecture ratée ET le suivant la lisent — payés, Pro, sur UN essai',
      [essais3, q1.paye, q1.formuleServie, q2.paye, q2.formuleServie, q3.paye, q3.formuleServie], [1, true, 'pro', true, 'pro', true, 'pro']);

    /* ⛔ CE QU'ON NE SAIT PAS LIRE NE COUPE PAS (relecture adverse du 29 septembre, rejoué) : un abonnement d'après SANS
       ligne disait « Gratuit » ; un abonnement d'avant interdit de descendre sous la fiche */
    const vide = await avec([apres([])])(ESP({ formule: 'pro' }));
    v('⛔ un abonnement d\'après dont la liste de lignes est VIDE : la fiche (Pro), jamais Gratuit', [vide.paye, vide.formuleServie], [true, 'pro']);
    const sansItems = await avec([ABO({ created: APRES, customer: { email: 'patron@client.fr' } })])(ESP({ formule: 'pro' }));
    v('   … et sans lignes du tout : la fiche', [sansItems.paye, sansItems.formuleServie], [true, 'pro']);
    const ancienEtPro = await avec([avant([L('business', 2)]), apres([L('pro', 3)])])(ESP());
    v('⛔ fiche Business Premium, deux abonnements d\'avant + trois Pro d\'après : Business Premium, 6 places — un abonnement d\'avant interdit de descendre (on ne sait pas lire ce qu\'il paie)',
      lit(ancienEtPro), [true, 'premium', 6]);
    const proPartage = { slug: 'proseule', t: 'ent-proseule', email: 'pat@acme.fr', formule: 'pro' };
    const hautAutre = await avecTout({ abos: [apres([L('premium', 2)], { customer: { email: 'pat@acme.fr' } })],
      reg: { proseule: proPartage, grande: { slug: 'grande', t: 'ent-grande', email: 'pat@acme.fr', formule: 'premium' } } })(proPartage);
    v('⛔ fiche Pro à la même adresse qu\'une entreprise qui paie Business Premium sans référence : Pro — la formule payée par l\'autre ne la fait pas monter',
      [hautAutre.paye, hautAutre.formuleServie], [true, 'pro']);

    /* ⛔ UNE DONNÉE DE STRIPE MAL FORMÉE NE COUPE PAS UNE ENTREPRISE QUI PAIE (`formuleEtPlaces`) */
    const casse = await avec([apres(null, { items: { data: 'pas-une-liste' } })])(ESP());
    v('⛔ des lignes illisibles chez Stripe : payée, à la formule de la fiche', [casse.paye, casse.formuleServie], [true, 'premium']);

    /* ⛔ UNE PÉRIODE OFFERTE SERT LA FORMULE DU CODE — Business Premium par défaut, jamais sous la fiche (`formulePromo`).
       Codes FICTIFS (règle du dépôt : aucun vrai code dans un fichier suivi). */
    const periode = (promos, fiche, abos) => {
      const usages = {}; for (const pr of promos.concat([{ code: 'ESSAI-BANC-RETIRE' }])) usages[pr.code] = { n: 1, equipes: {} };
      return (code) => {
        usages[code].equipes['ent-x'] = { date: '2026-09-01', finLe: '2099-12-31' };
        return construire()({ stripe: { secretKey: 'sk_de_banc' }, promos }, { ts: Date.now(), data: abos || [] }, usages,
          async () => abos || [], { log() {}, error() {} }, () => true, () => {}, {}, () => null, require('crypto'), false)(ESP({ formule: fiche }));
      };
    };
    const codeHaut = await periode([{ code: 'ESSAI-BANC-HAUT', formule: 'premium', mois: 3 }], 'pro')('ESSAI-BANC-HAUT');
    v('⛔⛔ fiche Pro, code Business Premium : pendant la période, l\'application reçoit BUSINESS PREMIUM', [codeHaut.paye, codeHaut.promoCode, codeHaut.formuleServie], [true, 'ESSAI-BANC-HAUT', 'premium']);
    const codeNu = await periode([{ code: 'ESSAI-BANC-NU', mois: 3 }], 'business')('ESSAI-BANC-NU');
    v('   un code qui ne dit pas sa formule : Business Premium (« le plus gros forfait »)', codeNu.formuleServie, 'premium');
    const codeBas = await periode([{ code: 'ESSAI-BANC-BAS', formule: 'pro', mois: 3 }], 'premium')('ESSAI-BANC-BAS');
    v('   fiche Business Premium, code Pro : jamais sous la fiche — Business Premium', codeBas.formuleServie, 'premium');
    const retire = await periode([], 'business')('ESSAI-BANC-RETIRE');
    v('   un code retiré de la configuration : la fiche garde sa formule — Business', [retire.paye, retire.formuleServie], [true, 'business']);
    const payeTot = await periode([{ code: 'ESSAI-BANC-TOT', formule: 'premium', mois: 3 }], 'premium', [apres([L('pro', 2)])])('ESSAI-BANC-TOT');
    v('⛔ payé Pro PENDANT la période : la période court jusqu\'à son terme — Business Premium, offert', [payeTot.promoCode, payeTot.formuleServie], ['ESSAI-BANC-TOT', 'premium']);
    const apresPeriode = await avec([apres([L('pro', 2)])])(ESP({ formule: 'premium' }));
    v('   … et la période finie, l\'abonnement prend le relais : Pro, 2 places', lit(apresPeriode), [true, 'pro', 2]);
  }

  /* 9. ⛔ « MON ESPACE » DIT LA FORMULE QUE LE CLIENT PAIE (`formuleServieDe`, 29 septembre 2026). Le portail la lit pour
     une adresse PROUVÉE (test-811) ; ici, la VRAIE fonction sur la VRAIE `espacePaye` : l'entreprise de l'adresse, sa formule
     servie — et rien quand ce n'est pas payé, quand l'adresse porte deux entreprises (une adresse = une entreprise, Justin),
     ou quand l'entreprise est fermée. */
  {
    const FSD = extraire('formuleServieDe'), EPT = extraire('espaceParT');
    vrai('formuleServieDe et espaceParT sont trouvées dans le fichier réel', !!FSD && !!EPT && /espacePaye\(e, \{ lecture: true \}\)/.test(FSD));
    const APRES = Math.floor(Date.parse('2026-10-01T00:00:00Z') / 1000);
    const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
    const abo = (mail, k, q) => ABO({ created: APRES, customer: { email: mail }, items: { data: [{ price: { id: prix(k) }, quantity: q }] } });
    const lecteur = (reg, abos, promos, usages, fermes, susp) => new Function(...PARAMS, 'espaceFerme', 'espaceEstSuspendu', 'sursisJoursDe', AIDES.join('\n') + '\n' + EPT + '\n' + SRC.slice(i, fin) + '\n' + FSD + '\nreturn formuleServieDe;')(
      { stripe: { secretKey: 'sk_de_banc' }, promos: promos || [] }, { ts: Date.now(), data: abos || [] }, usages || {}, async () => abos || [],
      { log() {}, error() {} }, () => true, () => {}, reg, null, require('crypto'), false, t => (fermes || []).includes(t),
      t => !!(susp && t in susp), t => (susp && t in susp) ? susp[t] : null);
    const REG = { alpha: { nom: 'Alpha', t: 'ent-alpha', email: ' Patron@Alpha.fr ', formule: 'premium', ts: 2 } };
    v('⛔ payée Pro sur une fiche Business Premium : « Mon espace » dit Pro (l\'adresse sans casse ni espaces)', await lecteur(REG, [abo('patron@alpha.fr', 'pro', 3)])('PATRON@alpha.fr'), 'Pro');
    /* ⛔ v767 : pas payée = l'application est SUSPENDUE ; « Mon espace » le dit (jusqu'au 30 septembre : rien, et le dossier
       gardait ce que la Tour avait posé — « Actif » à côté d'une application suspendue) */
    v('   pas payée : « Suspendu » — l\'application l\'est', await lecteur(REG, [])('patron@alpha.fr'), { statut: 'suspendu' });
    /* ⛔ … ET LA SUSPENSION POSÉE DANS LA TOUR, SURSIS ÉCOULÉ (seconde relecture de `gardien`, 30 septembre 2026) : payée, mais
       suspendue par la Tour depuis sept jours — l'application est suspendue (`sursisJours:0`), « Mon espace » le dit */
    v('⛔ payée Pro, suspendue dans la Tour, sursis écoulé : « Suspendu » — comme l\'application',
      await lecteur(REG, [abo('patron@alpha.fr', 'pro', 3)], null, null, null, { 'ent-alpha': 0 })('patron@alpha.fr'), { statut: 'suspendu' });
    v('   (témoin) suspendue dans la Tour, trois jours de sursis : sa formule — l\'application l\'est encore',
      await lecteur(REG, [abo('patron@alpha.fr', 'pro', 3)], null, null, null, { 'ent-alpha': 3 })('patron@alpha.fr'), 'Pro');
    v('   ⛔ une fiche « Gratuit » d\'avant réglée « active » à la main : « Suspendu » aussi — ce réglage ne paie rien (`aboManuelDe`)',
      await lecteur({ alpha: Object.assign({}, REG.alpha, { formule: 'gratuit', aboStatut: 'actif' }) }, [])('patron@alpha.fr'), { statut: 'suspendu' });
    /* ⛔ … MAIS PENDANT SA PÉRIODE OFFERTE, ELLE EST SERVIE : `aboManuelDe` la laisse à la règle du Gratuit, qui lit la période
       d'abord. Si le réglage à la main passait devant (la mutation M4), la période d'un code — ELAN en est une — serait
       SUSPENDUE en pleine période, et le rappel J-7 ne partirait plus. */
    v('   ⛔ la même fiche « Gratuit » réglée « active » à la main, EN PÉRIODE OFFERTE : la formule du code — pas suspendue',
      await lecteur({ alpha: Object.assign({}, REG.alpha, { formule: 'gratuit', aboStatut: 'actif' }) }, [], [{ code: 'ESSAI-BANC-NEUF', mois: 3 }],
        { 'ESSAI-BANC-NEUF': { n: 1, equipes: { 'ent-alpha': { date: '2026-09-01', finLe: '2099-12-31' } } } })('patron@alpha.fr'), 'Business Premium');
    v('   (témoin) la même, réglée « active » à la main en Business Premium : Business Premium',
      await lecteur({ alpha: Object.assign({}, REG.alpha, { aboStatut: 'actif' }) }, [])('patron@alpha.fr'), 'Business Premium');
    /* ⛔ Stripe illisible (muet, aucune liste connue — le cache froid d'un redémarrage) : « Mon espace » ne dit RIEN, ni
       « Suspendu » ni une formule — le dossier garde ce que la Tour y a posé (`payeInconnu`, 30 septembre 2026) */
    const lecteurMuet = (reg) => new Function(...PARAMS, 'espaceFerme', 'espaceEstSuspendu', 'sursisJoursDe', AIDES.join('\n') + '\n' + EPT + '\n' + SRC.slice(i, fin) + '\n' + FSD + '\nreturn formuleServieDe;')(
      { stripe: { secretKey: 'sk_de_banc' }, promos: [] }, { ts: 0, data: null, enCours: null, echecTs: 0 }, {}, async () => { throw new Error('Stripe muet (banc)'); },
      { log() {}, error() {} }, () => true, () => {}, reg, null, require('crypto'), false, () => false, () => false, () => null);
    v('⛔ Stripe illisible : « Mon espace » ne dit rien — ni « Suspendu », ni une formule', await lecteurMuet(REG)('patron@alpha.fr'), '');
    /* ⛔⛔ UNE FICHE SANS FORMULE (Justin, 30 septembre 2026 : « Suspend ») : « Mon espace » ne se taisait plus seulement
       parce que la Tour n'avait rien posé — il dit ce que l'application fait : suspendue si rien n'est payé, la formule payée
       ou offerte sinon, rien dans le doute */
    const SANSF = { alpha: Object.assign({}, REG.alpha, { formule: undefined }) };
    v('⛔⛔ fiche SANS formule, rien de payé : « Suspendu » — l\'application l\'est', await lecteur(SANSF, [])('patron@alpha.fr'), { statut: 'suspendu' });
    v('   fiche sans formule, payée Pro chez Stripe : « Pro »', await lecteur(SANSF, [abo('patron@alpha.fr', 'pro', 2)])('patron@alpha.fr'), 'Pro');
    v('   fiche sans formule, en période offerte : la formule du code', await lecteur(SANSF, [], [{ code: 'ESSAI-BANC-SANSF', mois: 3 }],
      { 'ESSAI-BANC-SANSF': { n: 1, equipes: { 'ent-alpha': { date: '2026-09-01', finLe: '2099-12-31' } } } })('patron@alpha.fr'), 'Business Premium');
    v('   fiche sans formule, Stripe illisible : rien — on ne sait pas', await lecteurMuet(SANSF)('patron@alpha.fr'), '');
    v('   une période offerte : la formule du code', await lecteur(REG, [], [{ code: 'ESSAI-BANC-NEUF', mois: 3 }],
      { 'ESSAI-BANC-NEUF': { n: 1, equipes: { 'ent-alpha': { date: '2026-09-01', finLe: '2099-12-31' } } } })('patron@alpha.fr'), 'Business Premium');
    const DEUX = Object.assign({}, REG, { beta: { nom: 'Beta', t: 'ent-beta', email: 'patron@alpha.fr', formule: 'pro', ts: 3 } });
    v('⛔ deux entreprises à la même adresse : rien — on ne choisit pas pour le client', await lecteur(DEUX, [abo('patron@alpha.fr', 'pro', 3)])('patron@alpha.fr'), '');
    const NOMS = Object.assign({}, REG, { alphaancien: { nom: 'Alpha', t: 'ent-alpha', email: 'patron@alpha.fr', formule: 'pro', ts: 1 } });
    v('   deux NOMS de la même entreprise (même identifiant) : c\'est une entreprise — sa fiche la plus récente', await lecteur(NOMS, [abo('patron@alpha.fr', 'business', 1)])('patron@alpha.fr'), 'Business');
    v('⛔ une entreprise fermée : rien', await lecteur(REG, [abo('patron@alpha.fr', 'pro', 3)], [], {}, ['ent-alpha'])('patron@alpha.fr'), '');
    v('   une adresse inconnue, ou vide : rien', [await lecteur(REG, [abo('patron@alpha.fr', 'pro', 3)])('autre@alpha.fr'), await lecteur(REG, [])('')], ['', '']);
  }

  /* 10. ⛔ PAYER PENDANT UNE PÉRIODE OFFERTE NE FACTURE RIEN AVANT SA FIN (Justin, 29 septembre 2026 : « oui » à « la
     facturation démarre à la fin du code »). La VRAIE route, la VRAIE `finEssaiPeriode` : ce qui part chez Stripe porte
     `subscription_data[trial_end]` = le lendemain de la fin, 0 h UTC — l'instant où l'application cesse de servir la
     formule du code (`periodeOfferte` : jusqu'au `finLe` inclus) — et le retour dit ce jour à la page de remerciement.
     Seulement pour OP GESTION, l'entreprise de la référence vérifiée ou la SEULE de l'adresse, entre 48 h et deux ans. */
  {
    const jour = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    const debutDe = d => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10) + 1);
    const iso = ms => new Date(ms).toISOString().slice(0, 10);
    const PERIODE = (finLe, t) => ({ 'ESSAI-BANC-727': { n: 1, equipes: { [t === undefined ? 'monclient-9f2a' : t]: { date: jour(-10), finLe, em: '' } } } });
    const env = r => new URLSearchParams(r.envoye);
    const essai = r => [env(r).get('subscription_data[trial_end]'), env(r).get('success_url')];
    const SANS = [null, 'https://teamop.fr/merci.html'];
    const AVEC = finLe => [String(debutDe(finLe) / 1000), 'https://teamop.fr/merci.html?debut=' + iso(debutDe(finLe))];
    const PRIX_BIZ = (/^\s*business: \['(price_\w+)'/m.exec(SRC) || [])[1], PRIX_MSGP = (/^\s*msgpro: \['(price_\w+)'/m.exec(SRC) || [])[1];
    vrai('(population) les tarifs Business et OP MESSAGES du serveur sont lus', /^price_/.test(PRIX_BIZ || '') && /^price_/.test(PRIX_MSGP || ''));
    const F30 = jour(30);
    const a = await appeler({ price: PRIX_PRO, quantity: 3, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(F30));
    v('⛔ période offerte en cours (fin dans 30 jours), référence vérifiée : la fin d\'essai = le lendemain de la fin, 0 h UTC, et le retour dit ce jour',
      [a.statut || 200, a.appels].concat(essai(a)), [200, 1].concat(AVEC(F30)));
    vrai('   (l\'instant est bien un lendemain à 0 h UTC, en secondes)', +essai(a)[0] % 86400 === 0 && iso(+essai(a)[0] * 1000) === iso(Date.parse(F30 + 'T00:00:00Z') + 86400000));
    v('   le reste de la page de paiement ne bouge pas (tarif, quantité, compte, référence gravée)',
      [env(a).get('line_items[0][price]'), env(a).get('line_items[0][quantity]'), env(a).get('customer_email'), env(a).get('subscription_data[metadata][espace]')],
      [PRIX_PRO, '3', 'paie@entreprise-banc.fr', 'monclient-9f2a']);
    const b = await appeler({ price: PRIX_BIZ, quantity: 1 }, undefined, undefined, undefined, PERIODE(F30));
    v('   sans référence (un autre appareil) : l\'adresse du compte désigne UNE entreprise — la même fin d\'essai', essai(b), AVEC(F30));
    const b2 = await appeler({ price: PRIX_PREMIUM, quantity: 2, ref: 'monclient' }, undefined, undefined, undefined, PERIODE(F30));
    v('   désignée par son NOM d\'accès : la même', essai(b2), AVEC(F30));
    const c = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' });
    v('⛔ sans période offerte : facturation immédiate, retour d\'origine', essai(c), SANS);
    const d = await appeler({ price: PRIX_MSGP, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(F30));
    v('⛔ OP MESSAGES : le code ne le couvre pas — facturation immédiate', [d.appels].concat(essai(d)), [1].concat(SANS));
    const passee = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(jour(-1)));
    v('   une période finie hier : rien à différer', essai(passee), SANS);
    const auj = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(jour(0)));
    const dem = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(jour(1)));
    v('⛔ la fin est à moins de 48 h (aujourd\'hui, demain) : Stripe refuserait l\'essai — facturation immédiate plutôt qu\'un paiement refusé',
      [auj.appels, dem.appels].concat(essai(auj), essai(dem)), [1, 1].concat(SANS, SANS));
    const F3 = jour(3);
    const trois = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(F3));
    v('   dans trois jours : différée', essai(trois), AVEC(F3));
    const loin = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(jour(800)));
    v('⛔ à plus de deux ans (Stripe n\'en accepte pas davantage) : facturation immédiate', [loin.appels].concat(essai(loin)), [1].concat(SANS));
    const DEUX_ENT = Object.assign({}, ESPACES_DEFAUT, { autre: { nom: 'Autre', t: 'autre-77aa', email: 'paie@entreprise-banc.fr' } });
    const deuxSans = await appeler({ price: PRIX_PRO, quantity: 1 }, undefined, undefined, DEUX_ENT, PERIODE(F30));
    v('⛔ deux entreprises à l\'adresse du compte, sans référence : on ne choisit pas pour le client — facturation immédiate', essai(deuxSans), SANS);
    const deuxAvec = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, DEUX_ENT, PERIODE(F30));
    /* ⛔ MÊME avec la référence de celle qui a la période (`gardien`, rejoué) : un abonnement en essai trouvé par l'adresse
       rendait l'AUTRE « payée » jusqu'à la fin de l'essai — il suffisait d'annuler avant, et personne n'avait rien payé */
    v('⛔ … même avec la référence de celle qui a la période : immédiate — un essai à l\'adresse rendrait l\'autre « payée » pour rien', essai(deuxAvec), SANS);
    const deuxAutre = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'autre-77aa' }, undefined, undefined, DEUX_ENT, PERIODE(F30));
    v('   … avec la référence de l\'AUTRE (sans période) : immédiate — la période d\'une entreprise ne couvre pas sa voisine', essai(deuxAutre), SANS);
    const inconnue = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'inconnue-00' }, undefined, undefined, undefined, PERIODE(F30));
    v('   une référence inconnue : l\'adresse décide (une seule entreprise) — différée', essai(inconnue), AVEC(F30));
    const fermee = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(F30), ['monclient-9f2a']);
    v('⛔ une entreprise fermée par TEAM OP : rien à différer', essai(fermee), SANS);
    const SANS_T = { monclient: { nom: 'Mon client', email: 'paie@entreprise-banc.fr' } };
    const sansT = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient' }, undefined, undefined, SANS_T, PERIODE(F30, ''));
    /* ⚠️ la période est inscrite sous l'identifiant VIDE : c'est le seul cas où la garde « sans identifiant » change quelque
       chose (mutation E11 : une période rangée sous la clé de personne ne se prête à aucune entrée sans identifiant) */
    v('   une entrée SANS identifiant : aucune période ne se rattache à elle, pas même une inscrite sous l\'identifiant vide — immédiate', [sansT.appels].concat(essai(sansT)), [1].concat(SANS));
    const autreT = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, undefined, PERIODE(F30, 'quelquun-dautre'));
    v('   la période d\'une AUTRE entreprise : immédiate', essai(autreT), SANS);
    /* ⛔ un abonnement réglé à la MAIN dans la Tour (`aboStatut`) : `espacePaye` s'arrête dessus AVANT la période offerte —
       la différer promettrait une période que l'application ne sert pas (`gardien`, rejoué) */
    const TOUR = st => ({ monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr', aboStatut: st } });
    const regles = [];
    for (const st of ['actif', 'essai', 'impaye', 'suspendu']) regles.push(essai(await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, TOUR(st), PERIODE(F30))));
    v('⛔ abonnement réglé dans la Tour (actif, essai, impayé, suspendu) : jamais différé', regles, [SANS, SANS, SANS, SANS]);
    const refuse = await appeler({ price: PRIX_PRO, quantity: 1, ref: 'monclient-9f2a' }, { authorization: 'Bearer ' + JETON_A_CONFIRMER }, undefined, undefined, PERIODE(F30));
    v('   (un compte non prouvé ne va toujours pas jusqu\'à Stripe)', [refuse.statut, refuse.appels], [403, 0]);

    /* les BORNES, sur la vraie fonction seule, à la milliseconde : 48 h + 10 min de marge (l'horloge de Stripe n'est pas la
       nôtre), deux ans au plus. `maintenant` s'injecte ; la période se lit, elle, à l'heure réelle (`periodeOfferte`). */
    const FEP = new Function('espacesReg', 'promoUsages', 'espaceFerme', 'config', AIDES_ROUTE.join('\n') + '\nreturn finEssaiPeriode;')(
      ESPACES_DEFAUT, PERIODE(F30), () => false, { promos: [] });
    const VISEE = [Object.assign({ slug: 'monclient' }, ESPACES_DEFAUT.monclient)];
    const D30 = debutDe(F30), MARGE = 48 * 3600000 + 10 * 60000, DEUX_ANS = 730 * 86400000;
    const PAYEUR = 'paie@entreprise-banc.fr';
    v('⛔ borne basse : la fin d\'essai à 48 h 10 min pile passe, une milliseconde de moins non',
      [!!FEP(VISEE, PAYEUR, D30 - MARGE), FEP(VISEE, PAYEUR, D30 - MARGE + 1)], [true, null]);
    v('⛔ borne haute : deux ans pile passent, une milliseconde de plus non',
      [!!FEP(VISEE, PAYEUR, D30 - DEUX_ANS), FEP(VISEE, PAYEUR, D30 - DEUX_ANS - 1)], [true, null]);
    v('   ce qu\'elle rend : la fin d\'essai en secondes, le jour du premier prélèvement, la fin de la période, l\'entreprise',
      FEP(VISEE, PAYEUR), { fin: D30 / 1000, debut: iso(D30), finLe: F30, t: 'monclient-9f2a' });
    v('⛔ sans l\'adresse du compte qui paie, rien — même avec la référence (la règle « une adresse = une entreprise » se lit sur elle)',
      [FEP(VISEE, ''), FEP(VISEE, 'autre@entreprise-banc.fr')], [null, null]);
    v('   par l\'adresse seule (sans casse ni espaces : la route la passe déjà réduite), et rien pour une adresse inconnue ou vide',
      [(FEP([], 'paie@entreprise-banc.fr') || {}).t, FEP([], 'autre@entreprise-banc.fr'), FEP([], ''), FEP(null, '')], ['monclient-9f2a', null, null, null]);
    const FEP_CASSE = new Function('espacesReg', 'promoUsages', 'espaceFerme', 'config', AIDES_ROUTE.join('\n') + '\nreturn finEssaiPeriode;')(
      { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: '  Paie@Entreprise-Banc.fr ' } }, PERIODE(F30), () => false, { promos: [] });
    v('   une adresse d\'annuaire écrite avec capitales et espaces se reconnaît', (FEP_CASSE([], 'paie@entreprise-banc.fr') || {}).t, 'monclient-9f2a');
    /* ⛔ DEUX GARDES QUE LA ROUTE N'ATTEINT PAS AUJOURD'HUI — le verrou « B » ne laisse payer pour une entreprise que son
       compte, dont l'adresse est la sienne, jamais vide. Elles tiennent le jour où une autre porte appellera cette fonction
       (les mutations N1 et N3 ne mordaient pas : la route seule ne pouvait pas les jouer). */
    const FEP_VOIS = new Function('espacesReg', 'promoUsages', 'espaceFerme', 'config', AIDES_ROUTE.join('\n') + '\nreturn finEssaiPeriode;')(
      Object.assign({}, ESPACES_DEFAUT, { voisine: { nom: 'Voisine', t: 'voisine-55bb', email: 'voisine@entreprise-banc.fr' },
        sansadresse: { nom: 'Sans adresse', t: 'sansadr-66cc', email: '' } }),
      { 'ESSAI-BANC-727': { n: 2, equipes: { 'monclient-9f2a': { date: jour(-10), finLe: F30, em: '' }, 'sansadr-66cc': { date: jour(-10), finLe: F30, em: '' } } } },
      () => false, { promos: [] });
    v('⛔ la référence d\'une entreprise, l\'adresse d\'une AUTRE (seule à son adresse) : rien — l\'adresse doit désigner celle de la référence',
      [FEP_VOIS(VISEE, 'voisine@entreprise-banc.fr'), (FEP_VOIS(VISEE, PAYEUR) || {}).t], [null, 'monclient-9f2a']);
    v('⛔ une entrée SANS adresse, appelée sans adresse : rien — une adresse vide ne désigne personne, même si l\'annuaire en porte une vide',
      [FEP_VOIS([Object.assign({ slug: 'sansadresse' }, { nom: 'Sans adresse', t: 'sansadr-66cc', email: '' })], ''), FEP_VOIS([], '')], [null, null]);
    /* le revenu mensuel de la Tour (`stripeAbosCalc`, la vraie) : un abonnement EN ESSAI compte parmi les abonnements, pas
       dans le revenu — payer pendant une période offerte le diffère jusqu'à la fin du code (`gardien`) */
    const ABC = ['stripeClient', 'stripePeriode', 'stripeAbosCalc'].map(extraire).concat([(/^const stripeEur = .*$/m.exec(SRC) || [''])[0]]);
    vrai('(population) stripeAbosCalc et ses aides sont trouvées dans le fichier réel', ABC.every(Boolean));
    const ligneAbo = (st, eur) => ({ id: 'sub_' + st, status: st, customer: { email: 'x@banc.fr' }, created: 1800000000,
      items: { data: [{ quantity: 1, price: { unit_amount: eur * 100, recurring: { interval: 'month', interval_count: 1 } } }] } });
    const calc = await new Function('stripeAbosBruts', 'monStr', ABC.join('\n') + '\nreturn stripeAbosCalc;')(
      async () => [ligneAbo('active', 50), ligneAbo('trialing', 25), ligneAbo('past_due', 15)], (x, n) => String(x == null ? '' : x).slice(0, n))('sk_de_banc');
    v('⛔ revenu mensuel : l\'abonnement payé seul (50 €) — l\'essai (25 €) compte parmi les abonnements, l\'impayé (15 €) parmi les impayés',
      [calc.mrr, calc.actifs, calc.impayes, calc.abos.map(a => a.statut)], [50, 2, 1, ['actif', 'essai', 'impaye']]);
    v('⛔ une fonction qui jette ne casse pas le paiement : `null`, et la page s\'ouvre (facturation immédiate)',
      new Function('espacesReg', 'promoUsages', 'espaceFerme', 'config', AIDES_ROUTE.join('\n') + '\nreturn finEssaiPeriode;')(
        ESPACES_DEFAUT, PERIODE(F30), () => { throw new Error('annuaire illisible'); }, { promos: [] })(VISEE, PAYEUR), null);
  }

  /* ══ 11. SECONDE RELECTURE DE `gardien` (30 septembre 2026) : la liste tronquée, la minute d'échec, le motif public ══ */
  console.log('\n── 11 · une liste tronquée, Stripe illisible durablement, ce que la réponse payée dit à tous ──');
  {
    /* ⛔ UNE LISTE TRONQUÉE N'EST PAS UNE LISTE : au plafond de dix pages, les PLUS ANCIENS abonnements disparaissaient sans
       un mot — une entreprise qui paie depuis le début aurait été suspendue */
    const SAB = extraire('stripeAbosBruts');
    vrai('stripeAbosBruts est trouvée dans le fichier réel', /async function stripeAbosBruts\(sk\)/.test(SAB));
    const pages = (combien) => { let k = 0; return async () => { k++; return { data: [{ id: 'sub_banc_' + k }], has_more: k < combien }; }; };
    const jouer = async (combien) => { const journal = [];
      try { const r = await new Function('stripeMonGet', 'stripeAbosDetail', 'console', SAB + '\nreturn stripeAbosBruts;')(pages(combien), null,
        { error: (...a) => journal.push(a.join(' ')), log() {} })('sk_de_banc'); return { n: r.length, journal }; }
      catch (e) { return { jete: String(e && e.message), journal }; } };
    const court = await jouer(3), long = await jouer(50);
    v('   (témoin) trois pages : les trois abonnements, rien au journal', [court.n, court.journal.length], [3, 0]);
    vrai('⛔ plus de dix pages : la liste JETTE (une lecture ratée : la dernière liste connue sert, sinon le doute), et le journal le dit',
      /tronquée/.test(long.jete || '') && long.journal.some(m => /TRONQUÉE/.test(m)));
    /* ⛔ DEPUIS COMBIEN DE MINUTES STRIPE NE SE LIT PLUS — ce que `/health` publie et ce sur quoi la surveillance crie */
    const SEM = extraire('stripeEchecMin');
    const echecMin = depuis => new Function('espStripeCache', SEM + '\nreturn stripeEchecMin;')({ echecDepuis: depuis })();
    v('⛔ `stripeEchecMin` : 95 minutes d\'échecs → 95 ; la dernière lecture a réussi → 0', [echecMin(Date.now() - 95 * 60000), echecMin(0)], [95, 0]);
    const SURV = fs.readFileSync(path.join(__dirname, '..', '.github', 'scripts', 'surveillance.js'), 'utf8')
      .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
    vrai('⛔ la surveillance CRIE quand Stripe ne se lit plus depuis 90 minutes (lu dans son code, commentaires retirés)',
      /if \(j\.stripeEchecMin >= 90\) \{\s*problems\.push\('⛔⛔ STRIPE ILLISIBLE DEPUIS ' \+ j\.stripeEchecMin/.test(SURV));
    /* ⛔ LE MOTIF DE LA RÉPONSE PAYÉE, À QUI CONNAÎT `t` : la seule forme que l'application lit (le code et la fin d'une période
       offerte) ; le reste — le nom de la personne de la Tour, le chemin Stripe, l'état d'un registre — devient « accès actif » */
    const MP = extraire('motifPublic');
    const mp = new Function(MP + '\nreturn motifPublic;')();
    v('⛔ le motif public : la période offerte passe telle quelle, tout le reste devient « accès actif »',
      [mp("code promo ESSAI-BANC-SEPT (jusqu'au 2026-12-31)"), mp("abonnement activé par Justin (jusqu'au 2026-12-31)"),
       mp('abonnement Stripe (active, par adresse e-mail)'), mp('code promo ESSAI-BANC-SEPT — registre des codes illisible, dans le doute on ne coupe pas'), mp('')],
      ["code promo ESSAI-BANC-SEPT (jusqu'au 2026-12-31)", 'accès actif', 'accès actif', 'accès actif', 'accès actif']);
    /* ⛔ UNE PANNE SE RELIT D'ELLE-MÊME (troisième relecture de `gardien`) : sans ça, un échec que personne ne relit ferait crier la
       surveillance toutes les heures, pour toujours, sur une panne finie */
    const SRP = extraire('stripeRelirePanne');
    vrai('stripeRelirePanne est trouvée dans le fichier réel', /function stripeRelirePanne\(\)/.test(SRP));
    const relire = cache => { let k = 0; const r = new Function('espStripeCache', 'stripeListe', SRP + '\nreturn stripeRelirePanne;')(cache, () => { k++; return Promise.resolve([]); })(); return [r, k]; };
    const T0 = Date.now();
    v('⛔ une panne se relit d\'elle-même : échec en cours, minute d\'attente passée → relue ; lecture en cours, échec de moins d\'une minute, aucun échec → rien',
      [relire({ echecDepuis: T0 - 3600000, echecTs: T0 - 120000, enCours: null }), relire({ echecDepuis: T0 - 3600000, echecTs: T0 - 120000, enCours: {} }),
       relire({ echecDepuis: T0 - 30000, echecTs: T0 - 30000, enCours: null }), relire({ echecDepuis: 0, echecTs: 0, enCours: null })],
      [[true, 1], [false, 0], [false, 0], [false, 0]]);
    vrai('   … et le serveur la lance toutes les cinq minutes (lu dans son code, commentaires retirés)',
      /\nsetInterval\(stripeRelirePanne, 5 \* 60000\)\.unref\(\);/.test(SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ')));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
