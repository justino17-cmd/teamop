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
  const d0 = SRC.indexOf('function ' + nom + '(');
  if (d0 < 0) return '';
  let p = 0;
  for (let k = SRC.indexOf('{', d0); k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(d0, k + 1); } }
  return '';
}
/* ⚠️ et `espaceT` (28 septembre 2026, `gardien`) : la référence gravée se compare à l'identifiant tel que l'annuaire le
   RANGE — en clair, ou dans le code des entrées les plus anciennes. Sans elle, le rattachement par référence jetterait
   dans son `try`, en silence, et seul le repli par adresse répondrait. */
const AIDES = ['promoAujourdhui', 'promoDateFr', 'promoEmpreinteMail', 'promoIdentite', 'promoServiA', 'promoAutreActif', 'promoEntree', 'espaceT'].map(extraire);
vrai('les sept aides du code promo et espaceT sont trouvées dans le fichier réel', AIDES.every(Boolean));
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
  const AIDES_ROUTE = ['espaceT', 'espacesDeRef'].map(extraire);
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
    const r = await appeler({ price: 'price_1Abc', quantity: 3, ref: 'monclient-9f2a' });
    vrai('⛔ ce qui part chez Stripe grave la r\u00e9f\u00e9rence sur l\'ABONNEMENT',
      /subscription_data%5Bmetadata%5D%5Bespace%5D=monclient-9f2a/.test(r.envoye));
    vrai('   et la garde sur la session, comme avant',
      /client_reference_id=monclient-9f2a/.test(r.envoye));
    vrai('   la page de paiement est bien rendue', r.sortie && /checkout\.stripe\.com/.test(r.sortie.url || ''));
  }
  {
    const r = await appeler({ price: 'price_1Abc', quantity: 1 });
    v('sans r\u00e9f\u00e9rence, la page de paiement s\'ouvre quand m\u00eame (prospect), sans r\u00e9f\u00e9rence d\'espace grav\u00e9e',
      /subscription_data%5Bmetadata%5D%5Bespace%5D/.test(r.envoye), false);
    vrai('   et elle s\'ouvre vraiment', r.sortie && !!r.sortie.url);
  }
  {
    const r = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'pas valide ; drop' });
    v('⛔ une r\u00e9f\u00e9rence mal form\u00e9e n\'est PAS grav\u00e9e', /subscription_data%5Bmetadata%5D%5Bespace%5D/.test(r.envoye), false);
  }

  /* c) ⛔ PAS DE PAIEMENT SANS COMPTE PROUVÉ — et rien ne part chez Stripe tant que ce n'est pas le cas. */
  {
    const ok = await appeler({ price: 'price_1Abc', quantity: 2, ref: 'monclient-9f2a' });
    v('un compte PROUVÉ ouvre la page de paiement', [ok.statut || 200, !!(ok.sortie && ok.sortie.url)], [200, true]);
    vrai('⛔ l\'adresse du compte est celle du client que Stripe crée (customer_email) — celle que la Tour affiche',
      new URLSearchParams(ok.envoye).get('customer_email') === 'paie@entreprise-banc.fr');
    vrai('⛔ … et gravée sur l\'ABONNEMENT (qui a payé ; survit si l\'adresse change chez Stripe)',
      new URLSearchParams(ok.envoye).get('subscription_data[metadata][compte]') === 'paie@entreprise-banc.fr');
    vrai('   … et sur la session', new URLSearchParams(ok.envoye).get('metadata[compte]') === 'paie@entreprise-banc.fr');
    vrai('   la référence d\'espace voyage toujours avec', new URLSearchParams(ok.envoye).get('subscription_data[metadata][espace]') === 'monclient-9f2a');

    const sans = await appeler({ price: 'price_1Abc', quantity: 1 }, {});
    v('⛔ sans session : 401 « compte_requis », et RIEN ne part chez Stripe', [sans.statut, sans.sortie && sans.sortie.error, sans.appels], [401, 'compte_requis', 0]);
    const inconnue = await appeler({ price: 'price_1Abc', quantity: 1 }, { authorization: 'Bearer ' + JETON_INCONNU });
    v('⛔ une session inconnue (expirée, brûlée) : 401, rien chez Stripe', [inconnue.statut, inconnue.appels], [401, 0]);
    const forme = await appeler({ price: 'price_1Abc', quantity: 1 }, { authorization: 'Bearer pas-une-session' });
    v('   un en-tête qui n\'a pas la forme d\'une session : 401', [forme.statut, forme.appels], [401, 0]);
    const nue = await appeler({ price: 'price_1Abc', quantity: 1 }, { authorization: JETON_PROUVE });
    v('   la session nue, sans « Bearer » (la lecture de comptes.js ne l\'accepte pas non plus) : 401', [nue.statut, nue.appels], [401, 0]);
    const aConfirmer = await appeler({ price: 'price_1Abc', quantity: 1 }, { authorization: 'Bearer ' + JETON_A_CONFIRMER });
    v('⛔ une adresse PAS ENCORE PROUVÉE : 403 « adresse_non_verifiee », rien chez Stripe', [aConfirmer.statut, aConfirmer.sortie && aConfirmer.sortie.error, aConfirmer.appels], [403, 'adresse_non_verifiee', 0]);
    /* Le corps ne décide de rien (CLAUDE.md : « une valeur du CORPS d'une requête ne décide jamais… ») : une adresse
       glissée dans le corps n'est ni lue ni envoyée. */
    const corps = await appeler({ price: 'price_1Abc', quantity: 1, email: 'autre@ailleurs.fr', compte: 'autre@ailleurs.fr', customer_email: 'autre@ailleurs.fr' });
    v('⛔ une adresse écrite dans le CORPS n\'est jamais celle envoyée à Stripe', [new URLSearchParams(corps.envoye).getAll('customer_email'), /ailleurs/.test(corps.envoye)], [['paie@entreprise-banc.fr'], false]);
    const eteints = await appeler({ price: 'price_1Abc', quantity: 1 }, undefined, null);
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
    const sienne = await appeler({ price: 'price_1Abc', quantity: 2, ref: 'monclient-9f2a' }, undefined, undefined, ANN);
    v('le compte de l\'entreprise paie pour elle : la référence est gravée (casse et espaces de l\'adresse de l\'annuaire ignorés)',
      [sienne.statut || 200, gravee(sienne), sienne.appels], [200, 'monclient-9f2a', 1]);
    const casse = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'MONCLIENT-9F2A' }, undefined, undefined, ANN);
    v('   la même, en capitales (espacePaye la reconnaît sans casse) : c\'est l\'identifiant RANGÉ qui est gravé', [casse.statut || 200, gravee(casse), new URLSearchParams(casse.envoye).get('client_reference_id')], [200, 'monclient-9f2a', 'monclient-9f2a']);
    /* ⛔ on grave L'ENTREPRISE, pas le mot envoyé (`gardien`, rejoué) : un nom d'accès se libère et se reprend par une
       autre entreprise, qui hériterait de l'abonnement ; l'identifiant ne se réattribue pas */
    const parSonNom = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'MonClient' }, undefined, undefined, ANN);
    v('⛔ désignée par son NOM D\'ACCÈS : c\'est son IDENTIFIANT qui est gravé, jamais le nom', [parSonNom.statut || 200, gravee(parSonNom), /monclient(?!-)/i.test(new URLSearchParams(parSonNom.envoye).get('client_reference_id') || '')], [200, 'monclient-9f2a', false]);
    const MIENNES = {
      vieillemaison: { nom: 'Vieille maison', code: Buffer.from(JSON.stringify({ t: 'vieille-8mq' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      sansident: { nom: 'Sans identifiant', code: Buffer.from(JSON.stringify({ k: 'x' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      nomun: { nom: 'Nom un', t: 'meme-4pd', email: 'paie@entreprise-banc.fr' },
      nomdeux: { nom: 'Nom deux', t: 'meme-4pd', email: 'paie@entreprise-banc.fr' },
    };
    const dansCode = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'vieillemaison' }, undefined, undefined, MIENNES);
    v('⛔ la sienne, identifiant rangé dans le CODE, désignée par son nom : l\'identifiant du code est gravé', [dansCode.statut || 200, gravee(dansCode)], [200, 'vieille-8mq']);
    const sansIdent = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'SANSIDENT' }, undefined, undefined, MIENNES);
    v('   une entrée SANS identifiant n\'a que son nom d\'accès : c\'est lui qui est gravé', [sansIdent.statut || 200, gravee(sansIdent)], [200, 'sansident']);
    const deuxNoms = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'meme-4pd' }, undefined, undefined, MIENNES);
    v('   deux noms pour la MÊME entreprise (même identifiant) : une identité, gravée', [deuxNoms.statut || 200, gravee(deuxNoms)], [200, 'meme-4pd']);
    /* une référence qui désigne DEUX entreprises distinctes, toutes deux au compte qui paie (le nom d'accès de l'une est
       l'identifiant, sans tiret, d'une ancienne) : on ne choisit pas pour le client laquelle il paie */
    const AMBI = { abc: { nom: 'Abc', t: 'abc-1x', email: 'paie@entreprise-banc.fr' }, zzz: { nom: 'Zzz', t: 'abc', email: 'paie@entreprise-banc.fr' } };
    const ambigue = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'abc' }, undefined, undefined, AMBI);
    v('⛔ deux entreprises distinctes derrière UNE référence, même au bon compte : 403 « reference_ambigue », rien chez Stripe',
      [ambigue.statut, ambigue.sortie && ambigue.sortie.error, ambigue.appels], [403, 'reference_ambigue', 0]);
    /* identité TYPÉE : un identifiant ancien sans tiret (« abc ») s'écrit comme le NOM d'une entrée sans identifiant —
       ce ne sont pas la même entreprise, même au même compte */
    const TYPE = { abc: { nom: 'Abc sans identifiant', code: Buffer.from(JSON.stringify({ k: 'x' })).toString('base64'), email: 'paie@entreprise-banc.fr' },
      zzz: { nom: 'Zzz', t: 'abc', email: 'paie@entreprise-banc.fr' } };
    const typee = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'abc' }, undefined, undefined, TYPE);
    v('⛔ un NOM et un IDENTIFIANT qui s\'écrivent pareil ne font pas une entreprise : 403 « reference_ambigue »', [typee.statut, typee.sortie && typee.sortie.error, typee.appels], [403, 'reference_ambigue', 0]);
    /* ⛔ L'ENTREPRISE, C'EST TOUS SES NOMS D'ACCÈS — la Tour en ouvre parfois SANS adresse. Exiger l'adresse sur CHAQUE
       nom refusait le vrai patron (« pas d'adresse ») dès qu'un de ses noms n'en portait pas. */
    const FAMILLE = { nomprincipal: { nom: 'Nom principal', t: 'fam-7kq', email: 'paie@entreprise-banc.fr' }, nomsecond: { nom: 'Nom second', t: 'fam-7kq', email: '' } };
    const famT = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'fam-7kq' }, undefined, undefined, FAMILLE);
    v('⛔ deux noms pour la même entreprise, l\'un SANS adresse : le patron paie, l\'identifiant est gravé', [famT.statut || 200, gravee(famT)], [200, 'fam-7kq']);
    const famNom = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'NomSecond' }, undefined, undefined, FAMILLE);
    v('   … même désignée par son nom SANS adresse : c\'est l\'entreprise entière qui est lue', [famNom.statut || 200, gravee(famNom)], [200, 'fam-7kq']);
    /* ⛔ LE CONTRÔLE DE SÉCURITÉ DE CETTE RÈGLE : un nom sans adresse ne donne la main à PERSONNE quand l'entreprise en
       porte une ailleurs — sinon viser ce nom-là suffirait à rendre « payée » l'entreprise d'un autre */
    const VICTIME = { victime: { nom: 'Victime', t: 'vict-2mw', email: 'patron@victime-banc.fr' }, victimebis: { nom: 'Victime bis', t: 'vict-2mw', email: '' } };
    const parSonNomVide = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'victimebis' }, undefined, undefined, VICTIME);
    v('⛔⛔ viser le nom SANS adresse de l\'entreprise d\'un autre : 403 « compte_autre_entreprise », rien chez Stripe',
      [parSonNomVide.statut, parSonNomVide.sortie && parSonNomVide.sortie.error, parSonNomVide.appels], [403, 'compte_autre_entreprise', 0]);
    /* deux adresses DIFFÉRENTES pour une même entreprise (un conflit de l'annuaire) : on ne tranche pas au moment de payer */
    const CONFLIT = { conflitun: { nom: 'Conflit un', t: 'conf-3xz', email: 'paie@entreprise-banc.fr' }, conflitdeux: { nom: 'Conflit deux', t: 'conf-3xz', email: 'autre@conflit-banc.fr' } };
    const conflit = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'conflitun' }, undefined, undefined, CONFLIT);
    v('⛔ deux adresses différentes pour une même entreprise, même visée par le nom du payeur : 403, rien chez Stripe',
      [conflit.statut, conflit.sortie && conflit.sortie.error, conflit.appels], [403, 'compte_autre_entreprise', 0]);
    const autre = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'voisine-77xq' }, undefined, undefined, ANN);
    v('⛔ la référence d\'une AUTRE entreprise : 403 « compte_autre_entreprise », et RIEN chez Stripe',
      [autre.statut, autre.sortie && autre.sortie.error, autre.appels], [403, 'compte_autre_entreprise', 0]);
    const parNom = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'VOISINE' }, undefined, undefined, ANN);
    v('⛔ … désignée par son NOM D\'ACCÈS, casse changée (espacePaye la rattacherait ainsi) : 403, rien chez Stripe', [parNom.statut, parNom.appels], [403, 0]);
    const vide = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'vide-31kz' }, undefined, undefined, ANN);
    v('⛔ une entreprise SANS adresse : aucun compte ne prouve être le sien — 403 « entreprise_sans_adresse » (un refus qui DIT pourquoi), rien chez Stripe',
      [vide.statut, vide.sortie && vide.sortie.error, vide.appels], [403, 'entreprise_sans_adresse', 0]);
    const ancienne = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'ancienne-5hw' }, undefined, undefined, ANN);
    v('⛔ l\'identifiant rangé dans le CODE (les espaces les plus anciens) compte aussi : 403 « compte_autre_entreprise »', [ancienne.statut, ancienne.sortie && ancienne.sortie.error, ancienne.appels], [403, 'compte_autre_entreprise', 0]);
    const inconnue = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'personne-0000' }, undefined, undefined, ANN);
    v('une référence INCONNUE de l\'annuaire n\'est PAS gravée — l\'abonnement se rattache à l\'adresse du compte, à personne d\'autre',
      [inconnue.statut || 200, gravee(inconnue), new URLSearchParams(inconnue.envoye).get('client_reference_id'), new URLSearchParams(inconnue.envoye).get('customer_email')],
      [200, null, null, 'paie@entreprise-banc.fr']);
    /* une référence qui désigne DEUX entreprises (le nom d'accès de l'une est l'identifiant de l'autre) : espacePaye
       les rattacherait toutes les deux — le compte doit être celui de CHACUNE */
    const DEUX = { 'monclient-9f2a': { nom: 'Homonyme', t: 'homonyme-2c', email: 'autre@homonyme-banc.fr' }, monclient: ANN.monclient };
    const deux = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'monclient-9f2a' }, undefined, undefined, DEUX);
    v('⛔ une référence qui désigne DEUX entreprises dont une n\'est pas la sienne : 403, rien chez Stripe', [deux.statut, deux.appels], [403, 0]);
    const corpsMail = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'voisine-77xq', email: 'patron@voisine-banc.fr', compte: 'patron@voisine-banc.fr' }, undefined, undefined, ANN);
    v('⛔ l\'adresse de l\'entreprise écrite dans le CORPS ne prouve rien : 403', [corpsMail.statut, corpsMail.appels], [403, 0]);
    const sansRef = await appeler({ price: 'price_1Abc', quantity: 1 }, undefined, undefined, ANN);
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

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
