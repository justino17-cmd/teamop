/* ⛔ CE QUE CE FICHIER GARDE — LA RÉFÉRENCE D'ESPACE VOYAGE DE LA PAGE DE PAIEMENT JUSQU'À STRIPE.

   `/api/stripe/checkout` ne grave la référence de l'espace sur l'abonnement
   (`subscription_data[metadata][espace]`) que si la PAGE la lui envoie — et
   `recap-abonnement.html`, la seule page du site qui ouvre une page de paiement, ne l'envoyait
   pas. Tout le correctif du serveur (`test-727`) était donc inerte, et personne ne pouvait le
   voir : chacune des deux moitiés était juste, et elles ne se parlaient pas. C'est la règle
   de `CLAUDE.md` — dès qu'une page appelle une route, un banc fait parler la VRAIE fonction de
   la page à la VRAIE route.

   Ce banc vivait dans `test-727` jusqu'au 24 septembre 2026. Il en est sorti pour que 727 ne
   garde que le serveur : le déploiement du serveur seul lance 727 sur `main`, où cette page
   n'est pas encore publiée. Celui-ci tourne dans la suite complète, sur la branche. */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'server', 'index.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

(async () => {
  console.log('\n── 797 · la page de paiement envoie la référence, la route la grave ──');
  /* a) Le corps que la page construit vraiment, évalué avec un `localStorage` simulé. */
  const PAGE = fs.readFileSync(path.join(__dirname, '..', 'recap-abonnement.html'), 'utf8');

  /* a) Le corps de la page. On extrait l'expression littérale et la fonction qu'elle appelle,
        puis on les exécute — aucune recopie : si la page change de forme, ce banc tombe. */
  const mFn = /const espaceRattacheRef = \(\) => \{[\s\S]*?\};/.exec(PAGE);
  vrai('la page sait lire l\'espace rattach\u00e9', !!mFn);
  /* ⚠️ Ancré sur L'APPEL DE PAIEMENT, pas sur le premier `JSON.stringify` de la page : elle
     en compte plusieurs (la validation du code promo en fait un aussi), et prendre le premier
     venu faisait évaluer le mauvais corps. */
  /* ⛔ ANCRÉ SUR L'APPEL, PAS SUR LA CHAÎNE : le chemin est aussi cité dans le commentaire
     qui explique le correctif, vingt lignes plus haut. Chercher `/api/stripe/checkout` tout
     court tombait dessus et évaluait le mauvais corps — la même faute que celle qu'on vient
     de corriger ici. Un motif de banc doit viser du CODE, jamais une phrase. */
  const iCo = PAGE.indexOf("fetch('https://api.teamop.fr/api/stripe/checkout'");
  vrai('   la page appelle bien la route de paiement', iCo > 0);
  const mBody = /body: JSON\.stringify\((\{.*?\})\), signal/.exec(PAGE.slice(iCo, iCo + 800));
  vrai('   et le corps du paiement est trouvable', !!mBody);
  let corps = null;
  if (mFn && mBody) {
    corps = new Function('localStorage', 'priceId', 'nbAbos',
      mFn[0] + '\nreturn JSON.stringify(' + mBody[1] + ');')(
      { getItem: (k) => (k === 'elan_sync_team' ? 'monclient-9f2a' : null) }, 'price_1Abc', 3);
    corps = JSON.parse(corps);
    v('⛔ le corps envoy\u00e9 par la page PORTE la r\u00e9f\u00e9rence de l\'espace', corps.ref, 'monclient-9f2a');
    v('   et garde le tarif et la quantit\u00e9', [corps.price, corps.quantity], ['price_1Abc', 3]);
    /* Un prospect qui paie AVANT d'avoir un espace : pas de référence, et c'est prévu — le
       serveur l'ignore, le repli par adresse reste. Ce n'est pas une panne, c'est le cas
       nominal du site public : le banc l'écrit pour qu'on ne le « répare » pas un jour. */
    const vide = new Function('localStorage', 'priceId', 'nbAbos',
      mFn[0] + '\nreturn JSON.stringify(' + mBody[1] + ');')(
      { getItem: () => null }, 'price_1Abc', 1);
    v('un prospect sans espace envoie une r\u00e9f\u00e9rence vide, sans casser', JSON.parse(vide).ref, '');
  }


  /* b) La VRAIE route, exécutée avec le corps que la PAGE a construit. On extrait le
        gestionnaire du fichier livré et on intercepte `fetch` : ce qu'on lit est littéralement
        ce qui partirait chez Stripe. */
  const iR = SRC.indexOf("app.post('/api/stripe/checkout'");
  let dR = 0, finR = -1;
  for (let k = SRC.indexOf('{', iR); k < SRC.length; k++) { if (SRC[k] === '{') dR++; else if (SRC[k] === '}') { dR--; if (!dR) { finR = k + 1; break; } } }
  finR = SRC.indexOf(');', finR) + 2;
  vrai('la route de paiement est trouvée dans le fichier réel', iR > 0 && finR > iR);
  const appeler = async (body) => {
    let envoye = '', statut = 0, sortie = null;
    const faux = { post: (chemin, h) => { faux._h = h; } };
    new Function('app', 'config', 'fetch', 'URLSearchParams', SRC.slice(iR, finR))(faux,
      { stripe: { secretKey: 'sk_de_banc' } },
      async (url, opts) => { envoye = String(opts && opts.body || ''); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
      URLSearchParams);
    await faux._h({ body }, { status(c) { statut = c; return this; }, json(o) { sortie = o; return this; } });
    return { envoye, statut, sortie };
  };
  /* ⛔ ET C'EST LE CORPS DE LA PAGE QUI PART, PAS UN LITTÉRAL : sans lui, ce banc redeviendrait
     `test-727`, et la couture ne serait plus gardée par personne. */
  vrai('⛔ le corps éprouvé est bien celui de la PAGE', !!corps);
  if (corps) {
    const r = await appeler(corps);
    vrai('⛔ ce que la page envoie fait graver la référence sur l\'ABONNEMENT',
      /subscription_data%5Bmetadata%5D%5Bespace%5D=monclient-9f2a/.test(r.envoye));
    vrai('   et la page de paiement s\'ouvre', r.sortie && /checkout\.stripe\.com/.test(r.sortie.url || ''));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
