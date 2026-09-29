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
  /* ⛔ DEPUIS LE 27 SEPTEMBRE 2026, L'APPEL PART AVEC LA SESSION DU COMPTE (Justin : « ils peuvent pas payer s'ils ont
     pas de compte créé »), et l'adresse du serveur se lit dans `API_TEAMOP` (vide sur 127.0.0.1, pour les sondes). */
  const iCo = PAGE.indexOf("fetch(API_TEAMOP + '/api/stripe/checkout'");
  vrai('   la page appelle bien la route de paiement', iCo > 0);
  const appel = PAGE.slice(iCo, iCo + 800);
  const mBody = /body: JSON\.stringify\((\{.*?\})\), signal/.exec(appel);
  vrai('   et le corps du paiement est trouvable', !!mBody);
  /* Les EN-TÊTES que la page envoie, évalués avec sa vraie lecture de session (`sessionPortail`) : c'est la couture qui a
     déjà cassé trois fois dans ce dépôt (`X-OP-Jeton` contre `Authorization: Bearer`, CLAUDE.md). */
  const mSess = /const CLE_SESSION = '([^']+)';\s*const sessionPortail = \(\) => \{[\s\S]*?\};/.exec(PAGE);
  vrai('la page sait lire la session du portail', !!mSess);
  const mEntetes = /headers: (\{[^}]*\}), body: JSON\.stringify/.exec(appel);
  vrai('   et les en-têtes du paiement sont trouvables', !!mEntetes);
  const SESSION = 'd'.repeat(64);
  /* un VRAI tarif public de la page (Business, mensuel) : la route n'admet plus que ceux-là (28 septembre 2026, nuit) */
  const PRIX_PAGE = (/business:\s*\{ mensuel: '(price_\w+)'/.exec(PAGE) || [])[1];
  vrai('le tarif Business de la page est lu', /^price_/.test(PRIX_PAGE || ''));
  let corps = null, entetes = null;
  if (mFn && mBody && mSess && mEntetes) {
    const stockage = (cle) => (cle === 'elan_sync_team' ? 'monclient-9f2a' : cle === mSess[1] ? SESSION : null);
    /* `compte.jeton` : la session que `lireCompte()` a lue pour CE compte (test-839 joue lireCompte lui-même) — la page
       ne paie qu'avec elle, jamais avec une session changée entre-temps dans un autre onglet. */
    const evaluer = (ls, expr) => new Function('localStorage', 'priceId', 'nbAbos',
      mFn[0] + '\n' + mSess[0] + '\nconst compte = { jeton: sessionPortail() };\nreturn ' + expr + ';')({ getItem: ls }, PRIX_PAGE, 3);
    corps = JSON.parse(evaluer(stockage, 'JSON.stringify(' + mBody[1] + ')'));
    entetes = evaluer(stockage, mEntetes[1]);
    v('⛔ le corps envoy\u00e9 par la page PORTE la r\u00e9f\u00e9rence de l\'espace', corps.ref, 'monclient-9f2a');
    v('   et garde le tarif et la quantit\u00e9', [corps.price, corps.quantity], [PRIX_PAGE, 3]);
    v('⛔ la page envoie la session du compte dans Authorization, sous la forme que le serveur lit', entetes.Authorization, 'Bearer ' + SESSION);
    v('   la session est celle du portail (espace.html la range sous cette clé)', mSess[1], 'teamop_portail_jeton');
    /* Un prospect qui paie AVANT d'avoir un espace : pas de référence, et c'est prévu — le
       serveur l'ignore, et l'adresse du COMPTE rattache à sa place. Ce n'est pas une panne, c'est le cas
       nominal du site public : le banc l'écrit pour qu'on ne le « répare » pas un jour. */
    const vide = JSON.parse(evaluer((cle) => (cle === mSess[1] ? SESSION : null), 'JSON.stringify(' + mBody[1] + ')'));
    v('un prospect sans espace envoie une r\u00e9f\u00e9rence vide, sans casser', vide.ref, '');
  }
  /* Et la page d'espace (`espace.html`, ses trois versions) accepte bien le retour que la page de paiement fabrique : sinon
     « Créer mon compte pour payer » ramènerait au portail… et jamais au paiement. */
  const mLien = /const lienPortail = \(\) => ([\s\S]*?\)\));/.exec(PAGE);
  vrai('la page fabrique le chemin vers le portail (lienPortail)', !!mLien);
  if (mLien) {
    const lien = new Function('formuleActive', 'nbUsersVoulu', 'cycleAnnuel', 'return ' + mLien[1] + ';')('business', 7, true);
    const retour = decodeURIComponent(lien.split('?retour=')[1] || '');
    v('   … vers le portail, avec la formule, le nombre et le cycle choisis', [lien.split('?')[0], retour], ['espace.html', 'recap-abonnement.html?formule=business&utilisateurs=7&cycle=annuel']);
    for (const e of ['espace.html', 'apercu/espace.html'].filter(x => fs.existsSync(path.join(__dirname, '..', x)))) {
      const E = fs.readFileSync(path.join(__dirname, '..', e), 'utf8');
      const mR = /const RETOUR_PAIEMENT=\(\(\)=>\{ try\{ const r=new URLSearchParams\(location\.search\)\.get\('retour'\)\|\|''; return (\/.*?\/)\.test\(r\)\?r:''; \}/.exec(E);
      vrai('   ' + e + ' : sa garde du retour est trouvée', !!mR);
      if (mR) vrai('⛔ ' + e + ' accepte le retour fabriqué par la page de paiement (sinon on ne revient jamais payer)',
        new Function('return ' + mR[1])().test(new URLSearchParams(lien.split('?')[1]).get('retour')));
    }
  }


  /* b) La VRAIE route, exécutée avec le corps que la PAGE a construit. On extrait le
        gestionnaire du fichier livré et on intercepte `fetch` : ce qu'on lit est littéralement
        ce qui partirait chez Stripe. */
  const iR = SRC.indexOf("app.post('/api/stripe/checkout'");
  let dR = 0, finR = -1;
  for (let k = SRC.indexOf('{', iR); k < SRC.length; k++) { if (SRC[k] === '{') dR++; else if (SRC[k] === '}') { dR--; if (!dR) { finR = k + 1; break; } } }
  finR = SRC.indexOf(');', finR) + 2;
  vrai('la route de paiement est trouvée dans le fichier réel', iR > 0 && finR > iR);
  /* `comptes`, un faux fidèle à `comptes.js` : la session de la page est celle d'un compte PROUVÉ. Les en-têtes passent
     tels qu'Express les rend (noms en minuscules). */
  const COMPTES = { parJeton: (j) => (j === SESSION ? 'paie@entreprise-banc.fr' : ''), verifie: (m) => m === 'paie@entreprise-banc.fr' };
  /* « B — on verrouille » (28 septembre 2026) : la route ne grave la référence que pour l'entreprise DU compte. L'annuaire
     du banc dit que « monclient-9f2a » est celle du compte prouvé ; les aides se prennent dans le fichier réel quand il les
     a (le serveur d'avant n'appelle pas `espacesDeRef`). */
  const aide = nom => { const d0 = SRC.indexOf('function ' + nom + '('); if (d0 < 0) return ''; let n = 0;
    for (let k = SRC.indexOf('{', d0); k < SRC.length; k++) { if (SRC[k] === '{') n++; else if (SRC[k] === '}') { n--; if (!n) return SRC.slice(d0, k + 1); } } return ''; };
  /* ⚠️ et les TARIFS (28 septembre 2026, nuit) : la route n'admet que ceux de la page ; elle lit le bloc des constantes des
     places (`STRIPE_PRIX_FORMULE`, `RANG_FORMULE`…). Le serveur d'avant ne l'a pas : on ne le fournit que s'il existe. */
  const iCst = SRC.indexOf('const PLACES_BASCULE ='), iPQ = SRC.indexOf('function placesQ(');
  /* ⚠️ et la FIN D'ESSAI (29 septembre 2026, « 2 oui » de Justin) : pour un tarif d'OP GESTION, la route demande
     `finEssaiPeriode` (et ce qu'elle lit : `periodeOfferte`, la formule du code, `promoUsages`, `espaceFerme`). Sans elles,
     la route jetait (« finEssaiPeriode is not defined ») et répondait 500 : ce banc est tombé ainsi le jour même — trois
     contrôles, et le job `bancs` du déploiement avec eux (`relecteur`). Le serveur d'avant ne les a pas : `aide` rend ''. */
  const AIDES_ROUTE = ['espaceT', 'espacesDeRef', 'espaceParT', 'finEssaiPeriode', 'periodeOfferte', 'formulePromo', 'formuleDuCode'].map(aide).join('\n') + '\n' + (iCst > 0 && iPQ > iCst ? SRC.slice(iCst, iPQ) : '');
  const ESPACES = { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'paie@entreprise-banc.fr' } };
  const appeler = async (body, hdr, espaces) => {
    let envoye = '', statut = 0, sortie = null;
    const faux = { post: (chemin, h) => { faux._h = h; } };
    new Function('app', 'config', 'fetch', 'URLSearchParams', 'comptes', 'espacesReg', 'promoUsages', 'espaceFerme', AIDES_ROUTE + '\n' + SRC.slice(iR, finR))(faux,
      { stripe: { secretKey: 'sk_de_banc' }, promos: [] },
      async (url, opts) => { envoye = String(opts && opts.body || ''); return { ok: true, json: async () => ({ url: 'https://checkout.stripe.com/x' }) }; },
      URLSearchParams, COMPTES, espaces === undefined ? ESPACES : espaces, {}, () => false);
    const headers = {}; for (const k of Object.keys(hdr || {})) headers[k.toLowerCase()] = hdr[k];
    await faux._h({ body, headers }, { status(c) { statut = c; return this; }, json(o) { sortie = o; return this; } });
    return { envoye, statut, sortie };
  };
  /* ⛔ ET C'EST LE CORPS DE LA PAGE QUI PART, PAS UN LITTÉRAL : sans lui, ce banc redeviendrait
     `test-727`, et la couture ne serait plus gardée par personne. */
  vrai('⛔ le corps éprouvé est bien celui de la PAGE', !!corps);
  /* ⚠️ LA PAGE PART AVANT LE SERVEUR : la route exige un compte depuis le 27 septembre 2026, mais elle ne part en service
     que sur « pousse le serveur ». Entre les deux (c'est `main`), la page doit tenir SEULE contre la route d'avant — le
     paiement s'ouvre avec ses en-têtes. La route elle-même est gardée, sans tolérance, par `test-727`. */
  const ROUTE_REGLE = /cm\.verifie\(payeur\)/.test(SRC.slice(iR, finR)) && /customer_email/.test(SRC.slice(iR, finR));
  if (corps && entetes) {
    const r = await appeler(corps, entetes);
    vrai('⛔ ce que la page envoie fait graver la référence sur l\'ABONNEMENT',
      /subscription_data%5Bmetadata%5D%5Bespace%5D=monclient-9f2a/.test(r.envoye));
    vrai('   et la page de paiement s\'ouvre', r.sortie && /checkout\.stripe\.com/.test(r.sortie.url || ''));
    if (ROUTE_REGLE) {
      v('⛔ la session envoyée par la PAGE est reconnue par la ROUTE : l\'abonnement part au nom du compte',
        new URLSearchParams(r.envoye).get('customer_email'), 'paie@entreprise-banc.fr');
      const sansEntete = await appeler(corps, { 'Content-Type': 'application/json' });
      v('   contre-épreuve : le même corps SANS la session de la page est refusé (401)', sansEntete.statut, 401);
      if (/compte_autre_entreprise/.test(SRC.slice(iR, finR))) {
        const autre = await appeler(corps, entetes, { monclient: { nom: 'Mon client', t: 'monclient-9f2a', email: 'patron@autre-banc.fr' } });
        v('⛔ « B » : le même corps, quand l\'entreprise de l\'appareil n\'est PAS celle du compte → 403 « compte_autre_entreprise »',
          [autre.statut, autre.sortie && autre.sortie.error, autre.envoye], [403, 'compte_autre_entreprise', '']);
      } else console.log('  ⚠️ route d\'avant « B » : la référence de l\'appareil passe sans vérification (le verrou part avec le serveur)');
    } else console.log('  ⚠️ route d\'avant (le serveur part sur « pousse le serveur ») : la page tient seule, et le paiement s\'ouvre');
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exitCode = ko ? 1 : 0;
})();
