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
const SERVIE = ['formulePayee', 'formuleDuCode', 'formulePromo', 'placesDeFormule', 'formuleEtPlaces', 'espaceStripe'].map(extraire);
vrai('la formule servie, ses aides et le rattachement Stripe sont trouvés dans le fichier réel',
  /ligneMessages/.test(LIGNES) && /Business Premium/.test(LBL2) && SERVIE.every(Boolean) && /^async function espaceStripe/.test(SERVIE[5]));
AIDES.push(CONSTS, ...PLACES, LIGNES, LBL2, ...SERVIE);
const PARAMS = ['config', 'espStripeCache', 'promoUsages', 'stripeAbosBruts', 'console', 'savePromoUsages', 'mailPromoActive', 'espacesReg', 'espaceParT', 'crypto', 'promosIllisible'];
const construire = () => new Function(...PARAMS, AIDES.join('\n') + '\n' + SRC.slice(i, fin) + '\nreturn espacePaye;');
const avec = (abos) => construire()(
  { stripe: { secretKey: 'sk_de_banc' }, promos: [] },
  { ts: Date.now(), data: abos }, {}, async () => abos, { error() {} }, () => true, () => {}, {}, () => null, require('crypto'), false);

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
  const AIDES_ROUTE = ['espaceT', 'espacesDeRef', 'espaceParT'].map(extraire).concat([CONSTS]);
  const PRIX_PRO = (/^\s*pro: \['(price_\w+)'/m.exec(SRC) || [])[1], PRIX_PREMIUM = (/^\s*premium: \['(price_\w+)'/m.exec(SRC) || [])[1];
  vrai('les tarifs Pro et Business Premium du serveur sont lus', /^price_/.test(PRIX_PRO || '') && /^price_/.test(PRIX_PREMIUM || ''));
  const ESPACES_DEFAUT = { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr' } };
  const appeler = async (body, entetes, comptes, espaces) => {
    let envoye = '', statut = 0, sortie = null, appels = 0;
    const faux = { post: (chemin, h) => { faux._h = h; } };
    new Function('app', 'config', 'fetch', 'URLSearchParams', 'comptes', 'espacesReg',
      AIDES_ROUTE.join('\n') + '\n' + SRC.slice(iR, finR))(faux,
      { stripe: { secretKey: 'sk_de_banc' } },
      async (url, opts) => { appels++; envoye = String(opts && opts.body || ''); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
      URLSearchParams, comptes === undefined ? COMPTES : comptes, espaces === undefined ? ESPACES_DEFAUT : espaces);
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
    const deux = await avec([apres([L('pro', 2)]), apres([L('premium', 1)])])(ESP({ formule: 'business' }));
    v('   deux abonnements (Pro × 2, Business Premium × 1) : la plus haute, et SEULS ses abonnements donnent des places', lit(deux), [true, 'premium', 1]);

    /* ⛔ UNE FICHE « GRATUIT » QUI PAIE REÇOIT CE QU'ELLE PAIE : elle sortait avant Stripe, et payer sur la page la laissait
       en Gratuit jusqu'à un geste de la Tour */
    const gratuitePaie = await avec([apres([L('business', 2)])])(ESP({ formule: 'gratuit' }));
    v('⛔ fiche Gratuit, abonnement Business × 2 : BUSINESS, 2 places', lit(gratuitePaie), [true, 'business', 2]);
    const gratuiteRien = await avec([])(ESP({ formule: 'gratuit' }));
    v('   contre-épreuve : fiche Gratuit sans abonnement — Gratuit, comme avant', [gratuiteRien.paye, gratuiteRien.motif, gratuiteRien.formuleServie], [true, 'gratuit', undefined]);
    const gratuiteMsg = await avec([apres([L('msg', 1)])])(ESP({ formule: 'gratuit' }));
    v('   fiche Gratuit qui ne paie qu\'OP MESSAGES : Gratuit', [gratuiteMsg.paye, gratuiteMsg.motif, gratuiteMsg.formuleServie], [true, 'gratuit', undefined]);

    /* OP MESSAGES n'est pas une formule d'OP GESTION */
    const msgSeul = await avec([apres([L('msg', 3)])])(ESP());
    v('⛔ fiche Business Premium qui ne paie qu\'OP MESSAGES (abonnement d\'après) : OP GESTION reçoit Gratuit', [msgSeul.paye, msgSeul.formuleServie], [true, 'gratuit']);

    /* ⛔ CE QU'ON NE SAIT PAS LIRE GARDE LA FICHE : on ne coupe pas une entreprise qui paie */
    const ancien = await avec([avant([L('pro', 1)])])(ESP());
    v('⛔ un abonnement d\'AVANT la bascule (ancien lien, autre tarif) : la fiche reste — Business Premium, ses 3 places d\'avant', lit(ancien), [true, 'premium', 3]);
    const main = await avec([apres([{ price: { id: 'price_cree_a_la_main' }, quantity: 5 }])])(ESP({ formule: 'business' }));
    v('   un tarif créé à la main chez Stripe (après) : la fiche reste — Business', [main.paye, main.formuleServie], [true, 'business']);
    const rienALire = await avec([ABO({ customer: { email: 'patron@client.fr' } })])(ESP());
    v('   un abonnement sans ligne du tout : la fiche reste, payée', [rienALire.paye, rienALire.formuleServie], [true, 'premium']);

    /* ⛔ UNE FORMULE SERVIE QUI N'EST PAS LA FICHE EST UNE FORMULE CHANGÉE APRÈS LA BASCULE : ses abonnements d'avant ne
       prennent pas son multiplicateur (`placesDeFormule`, le même refus qu'une formule changée dans la Tour) */
    const monte = await avec([avant([L('business', 1)]), apres([L('premium', 1)])])(ESP({ formule: 'business' }));
    v('⛔ fiche Business, un abonnement Business d\'avant + un Business Premium d\'après : Business Premium, 2 places — pas 4 (l\'ancien ne vaut pas 3)', lit(monte), [true, 'premium', 2]);
    const reste = await avec([avant([L('business', 1)]), apres([L('business', 1)])])(ESP({ formule: 'business' }));
    v('   contre-épreuve : un Business d\'avant + un Business d\'après — Business, 2 + 1 = 3 places, comme hier', lit(reste), [true, 'business', 3]);

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

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
