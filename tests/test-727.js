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
const AIDES = ['promoAujourdhui', 'promoDateFr', 'promoEmpreinteMail', 'promoIdentite', 'promoServiA', 'promoAutreActif', 'promoEntree'].map(extraire);
vrai('les sept aides du code promo sont trouvées dans le fichier réel', AIDES.every(Boolean));
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

  const appeler = async (body) => {
    let envoye = '', statut = 0, sortie = null;
    const faux = { post: (chemin, h) => { faux._h = h; } };
    new Function('app', 'config', 'fetch', 'URLSearchParams',
      SRC.slice(iR, finR))(faux,
      { stripe: { secretKey: 'sk_de_banc' } },
      async (url, opts) => { envoye = String(opts && opts.body || ''); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
      URLSearchParams);
    await faux._h({ body }, { status(c) { statut = c; return this; }, json(o) { sortie = o; return this; } });
    return { envoye, statut, sortie };
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
    v('sans r\u00e9f\u00e9rence, la page de paiement s\'ouvre quand m\u00eame (prospect)',
      /subscription_data/.test(r.envoye), false);
    vrai('   et elle s\'ouvre vraiment', r.sortie && !!r.sortie.url);
  }
  {
    const r = await appeler({ price: 'price_1Abc', quantity: 1, ref: 'pas valide ; drop' });
    v('⛔ une r\u00e9f\u00e9rence mal form\u00e9e n\'est PAS grav\u00e9e', /subscription_data/.test(r.envoye), false);
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
