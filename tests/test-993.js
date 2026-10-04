/* ⛔ CE QUE CE FICHIER GARDE — LES DEUX TARIFS DE PERSO+ : QUI LES CRÉE, QUI LES RANGE, ET CE QU'AUCUN GESTE NE PEUT FAIRE EN PRODUCTION (étape 9, 4 octobre 2026).

   `server-msg/configurer-stripe.js`, l'outil que Justin lance SUR LE VPS, en saisie masquée, a deux options neuves — c'est le SEUL endroit du dépôt qui ÉCRIT chez Stripe :

     1. `--creer-perso-plus` CRÉE le produit « OP MESSAGES Perso+ » et ses deux tarifs (500 centimes par mois, 5 000 par an, TTC) — EN MODE TEST ET NULLE PART AILLEURS —, les relit par la même épreuve que les tarifs de
        Messages Pro, puis les range dans `facturation.perso.prix` du fichier (0600, tout le reste intact). Il demande « oui » ; relancé, il rend les MÊMES objets (clé d'idempotence tirée d'une empreinte, jamais de la clé) ;
     2. `--perso-plus` range deux tarifs que Justin a créés LUI-MÊME dans le tableau de bord (c'est ainsi qu'on les pose en production) : lecture seule, mêmes épreuves, mêmes refus.

   Les refus, tous prouvés par « le fichier est resté intact, octet pour octet » ET « la sortie dit pourquoi » (sans la deuxième moitié, un banc qui ne lance jamais l'outil passerait aussi) : une clé de PRODUCTION (rien de
   payant n'est créé par ce script), des tarifs Perso+ DÉJÀ posés (les remplacer ferait perdre leur lecture aux abonnements pris), un « non », une clé sans le droit d'écrire, un fichier sans clé de Messages Pro, une option
   inconnue ou deux à la fois, un tarif qui n'existe pas / du mauvais rythme / dont le produit ne contient pas « messages » (le compte Stripe est COMMUN avec OP GESTION), le tarif de Messages Pro réemployé.
   ⛔ AUCUNE fuite : ni la clé, ni sa suite ne paraissent à l'écran ni dans les clés d'idempotence. Et ce que l'outil a écrit est ce que le SERVICE lit : un abonné paie au tarif qu'il a créé.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « aucun POST » est précédé de la preuve que le détecteur compte les POST quand il y en a (la création en fait trois). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { charger } = require(path.join(T.SERVICE, 'config.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const CONFIGURER = path.join(T.SERVICE, 'configurer-stripe.js');
const code = (f) => T.sansCommentaires(fs.readFileSync(f, 'utf8'));

/* Des valeurs de banc (lettres hors de [0-9a-f]) — et dont les morceaux ne ressemblent à rien d'autre de ce banc (un préfixe de huit lettres commun avec un identifiant de tarif accuserait l'outil d'une fuite qui n'existe pas). */
const CLE = ['rk', 'test', 'ZxCleOutilSecretQq9X'].join('_');
const SUITE = CLE.slice('rk_test_'.length);
const CLE_LIVE = ['rk', 'live', 'ZwCleProdSecretQq9W'].join('_');
const PRO = { mensuel: 'price_BancProMensuelAaZz01', annuel: 'price_BancProAnnuelBbYy02' };
const MAIN = { mensuel: 'price_BancPersoMainMensZzQ1', annuel: 'price_BancPersoMainAnnuYyW2' };       // « créés à la main dans le tableau de bord »
const fuites = (texte) => [CLE, CLE_LIVE, SUITE, SUITE.slice(0, 8), SUITE.slice(-8)].filter(s => texte.includes(s));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRO.mensuel); fake.poserTarif(PRO.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const produitMain = { id: 'prod_banc_main_pp', object: 'product', name: 'OP MESSAGES Perso+ (tableau de bord)' };
  fake.poserTarif(MAIN.mensuel, { unit_amount: 500, product: produitMain });
  fake.poserTarif(MAIN.annuel, { unit_amount: 5000, recurring: { interval: 'year', interval_count: 1 }, product: produitMain });
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-993-'));
  process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } });
  const chemin = path.join(bac, 'beta.json');
  const base = (extra, sansPro) => Object.assign({ instance: 'beta', domaine: 'msg-beta.exemple', vapidPublicKey: 'vapid-conserve', sms: { budgetJour: 7 }, autre: { a: [1, 2, 3] } },
    sansPro ? {} : { facturation: { cle: CLE, prix: PRO } }, extra || {});
  const poser = (objet) => fs.writeFileSync(chemin, JSON.stringify(objet === undefined ? base() : objet, null, 2) + '\n', { mode: 0o640 });
  const lire = () => JSON.parse(fs.readFileSync(chemin, 'utf8'));
  const outil = (lignes, o = {}) => new Promise((resolve) => {
    const env = Object.assign({}, process.env, { OPMSG_CONFIG: chemin, OPMSG_TEST_STRIPE: fake.hote }, o.env || {});
    delete env.OPMSG_INSTANCE;
    const p = spawn(process.execPath, [CONFIGURER].concat(o.args || []), { env, stdio: ['pipe', 'pipe', 'pipe'] });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, 60000);
    p.on('close', (c) => { clearTimeout(t); resolve({ code: c, sortie }); });
    p.stdin.end(lignes.join('\n') + '\n');
  });
  const posts = () => fake.appels.filter(a => a.m === 'POST' && /^\/v1\/(products|prices)$/.test(a.chemin));
  const paire = (a, k) => (a.paires.find(x => x[0] === k) || [])[1];
  /* un refus : l'outil est allé jusqu'au refus (sa sortie le dit), le fichier est resté intact octet pour octet, et rien n'a été créé chez Stripe */
  async function refuse(nom, lignes, motif, o, tentes) {
    const avant = fs.readFileSync(chemin), n0 = posts().length, prod0 = fake.produits.size, tar0 = fake.tarifs.size;
    const r = await outil(lignes, o || { args: ['--creer-perso-plus'] });
    v('⛔ ' + nom + ' : refusé — sortie 1 et la sortie dit pourquoi', [r.code, motif.test(r.sortie)], [1, true]);
    v('… le fichier est resté intact, octet pour octet, et rien n\'a été créé chez Stripe (ni produit, ni tarif' + (tentes ? ' — un seul POST a été TENTÉ, et refusé' : ', ni POST') + ')', [fs.readFileSync(chemin).equals(avant), posts().length - n0, fake.produits.size - prod0, fake.tarifs.size - tar0], [true, tentes || 0, 0, 0]);
    v('… et aucune fuite de la clé', fuites(r.sortie), []);
    return r;
  }

  try {
    /* ═══ 1. CRÉER LES DEUX TARIFS EN MODE TEST ══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('--creer-perso-plus : le produit et les deux tarifs sont créés en mode TEST, relus, rangés — le reste du fichier ne bouge pas');
    let ids;
    {
      poser();
      const avantFichier = lire();
      const n0 = posts().length;
      const ok = await outil(['oui'], { args: ['--creer-perso-plus'] });
      const cree = posts().slice(n0);
      v('population : la création fait TROIS POST chez Stripe — le produit, puis un tarif par rythme (le détecteur de « aucun POST » des refus compte donc quelque chose)', cree.map(a => a.chemin), ['/v1/products', '/v1/prices', '/v1/prices']);
      v('⛔ la création : sortie 0, le produit, les deux tarifs, puis l\'ÉPREUVE des tarifs créés (5,00 € par mois, 50,00 € par an), le fichier mis à jour',
        [ok.code, /✓ produit créé : « OP MESSAGES Perso\+ »/.test(ok.sortie), /✓ tarif mensuel créé \(5,00 € TTC\)/.test(ok.sortie), /✓ tarif annuel créé \(50,00 € TTC\)/.test(ok.sortie),
          /✓ tarif Perso\+ mensuel : 5,00 EUR par mois — produit « OP MESSAGES Perso\+ »/.test(ok.sortie), /✓ tarif Perso\+ annuel : 50,00 EUR par an — produit « OP MESSAGES Perso\+ »/.test(ok.sortie), /✅ .* mis à jour \(chmod 600\)/.test(ok.sortie)],
        [0, true, true, true, true, true, true]);
      v('… le produit : un nom qui contient « messages » (le compte Stripe est commun avec OP GESTION), marqué OP MESSAGES / perso_plus', [paire(cree[0], 'name'), paire(cree[0], 'metadata[produit]'), paire(cree[0], 'metadata[forfait]')], ['OP MESSAGES Perso+', 'opmsg', 'perso_plus']);
      v('⛔ … les tarifs : 500 centimes par MOIS et 5 000 par AN, en euros, TTC (« inclusive »), rattachés au produit créé', cree.slice(1).map(a => [paire(a, 'unit_amount'), paire(a, 'recurring[interval]'), paire(a, 'currency'), paire(a, 'tax_behavior'), paire(a, 'product') === Array.from(fake.produits.keys())[0]]),
        [['500', 'month', 'eur', 'inclusive', true], ['5000', 'year', 'eur', 'inclusive', true]]);
      const ecrit = lire(), st = fs.statSync(chemin);
      ids = ecrit.facturation && ecrit.facturation.perso && ecrit.facturation.perso.prix;
      v('… le fichier : les deux identifiants des tarifs CRÉÉS (et eux seuls), la clé et les tarifs de Messages Pro INTACTS, tout le reste intact — instance, domaine, clé VAPID, budget SMS, autre bloc',
        [Object.keys(ids || {}), ids && fake.tarifs.has(ids.mensuel), ids && fake.tarifs.has(ids.annuel), ecrit.facturation.cle === CLE, ecrit.facturation.prix, ecrit.instance, ecrit.domaine, ecrit.vapidPublicKey, ecrit.sms, ecrit.autre],
        [['mensuel', 'annuel'], true, true, true, PRO, 'beta', 'msg-beta.exemple', 'vapid-conserve', { budgetJour: 7 }, { a: [1, 2, 3] }]);
      v('… en 0600, sans fichier temporaire resté à côté', [(st.mode & 0o777).toString(8), fs.readdirSync(bac).filter(x => /^beta\.json\.tmp/.test(x))], ['600', []]);
      vrai('population du détecteur de fuite : il TROUVE la clé quand elle y est', fuites('voici ' + CLE + ' ici').length >= 3 && fuites('xx ' + SUITE.slice(-8)).length === 1);
      v('⛔ AUCUNE fuite : ni la clé, ni sa suite, ni ses morceaux dans la sortie', fuites(ok.sortie), []);
      const clesIdem = Array.from(fake.idem.keys());
      v('⛔ chaque création porte une clé d\'idempotence tirée d\'une EMPREINTE (jamais de la clé elle-même) : trois, de la forme `opmsg-perso-plus-<16 hexa>-(produit|mensuel|annuel)`', [clesIdem.length, clesIdem.every(k => /^opmsg-perso-plus-[0-9a-f]{16}-(produit|mensuel|annuel)$/.test(k)), clesIdem.some(k => fuites(k).length > 0), clesIdem.every(k => k.includes(sha(CLE).slice(0, 16)))], [3, true, false, true]);
      void avantFichier;
      /* ce que l'outil a écrit est ce que le SERVICE lit — par `charger`, le code même du démarrage */
      const racine = fs.mkdtempSync(path.join(bac, 'charger-')), cred = path.join(racine, 'cred');
      fs.mkdirSync(cred, { recursive: true }); fs.writeFileSync(path.join(cred, 'kek'), crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
      const cfgCharger = path.join(racine, 'config.json'); fs.writeFileSync(cfgCharger, JSON.stringify({ facturation: lire().facturation }));   // le bloc de facturation seul : `charger` exige la paire VAPID entière, que ce banc n'a pas à fabriquer
      const ch = charger({ OPMSG_CONFIG: cfgCharger, OPMSG_DATA: path.join(racine, 'data'), OPMSG_INSTANCE: 'beta', CREDENTIALS_DIRECTORY: cred, PORT: '8099' });
      v('le service (`charger`, ce que lit le démarrage) lit les tarifs de Messages Pro ET ceux de Perso+, et le montant annoncé de Perso+ est celui des tarifs créés', [ch.facturation.prix, ch.facturation.perso.prix, ch.facturation.perso.affichage], [PRO, ids, { mensuel: 5, annuel: 50 }]);

      /* — relancé après avoir RETIRÉ `perso.prix` (c'est ce que la sortie d'un refus recommande) : les MÊMES objets, rien de recréé — */
      const sans = lire(); delete sans.facturation.perso; poser(sans);
      const prod1 = fake.produits.size, tar1 = fake.tarifs.size, p1 = posts().length;
      const encore = await outil(['oui'], { args: ['--creer-perso-plus'] });
      const idsBis = lire().facturation.perso.prix;
      v('⛔ relancé le même jour : trois POST de plus partent, mais la clé d\'idempotence rend LES MÊMES objets — même produit, mêmes tarifs, rien de recréé, et le fichier reçoit les mêmes identifiants', [encore.code, posts().length - p1, fake.produits.size - prod1, fake.tarifs.size - tar1, idsBis], [0, 3, 0, 0, ids]);
      /* — et un abonné paie AU tarif créé : le service lit le fichier que l'outil a écrit — */
      const svc = await T.lancerService({ horloge: true, config: { formule: { toutOuvert: false }, facturation: Object.assign({}, lire().facturation, { relectureMs: 3600000, timeoutMs: 3000 }), quotas: { paiement: { max: 1000, fenetreMs: 3600000 } } }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      try {
        const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: Date.now });
        const p = S.personneCreer({ identifiant: 'beta:outil' + crypto.randomBytes(2).toString('hex'), prenom: 'Outil', nom: 'Banc', origine: 'beta', verifie: true });
        const c = T.client(svc.base), j = 'opm_' + crypto.randomBytes(32).toString('base64url'); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 * 60 }); c.poserCookie(j);
        const etat = (await c.get('/api/moi/perso-plus')).j;
        const n = posts().length;
        const pay = await c.post('/api/moi/perso-plus/paiement', { cycle: 'annuel' });
        const sess = fake.derniereSession();
        v('⛔ de bout en bout : le service démarré sur le fichier de l\'outil propose Perso+ (`ouvert`), et la session de paiement ANNUEL est ouverte au tarif ANNUEL que l\'outil a créé', [etat.ouvert, pay.code, (sess.paires.find(x => x[0] === 'line_items[0][price]') || [])[1] === ids.annuel, posts().length - n], [true, 201, true, 0]);
        try { S.fermer(); } catch (e) { /* déjà fermé */ }
      } finally { await svc.arreter(); }
    }

    /* ═══ 2. LES REFUS DE LA CRÉATION ════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n--creer-perso-plus : ce qu\'il refuse — la production, des tarifs déjà posés, un « non », une clé sans droit d\'écrire, un fichier sans clé de Messages Pro');
    {
      /* LA PRODUCTION : ni création ni appel — la porte de test de Stripe n'existe pas dans cette instance */
      poser(base({ instance: 'prod', facturation: { cle: CLE_LIVE, prix: PRO } }));
      await refuse('une clé de PRODUCTION', ['oui'], /LA CLÉ N'EST PAS UNE CLÉ DE TEST : ce script ne CRÉE rien en production/, { args: ['--creer-perso-plus'], env: { OPMSG_TEST_STRIPE: undefined } });
      poser(base({ facturation: { cle: CLE, prix: PRO, perso: { prix: { mensuel: 'price_BancDejaPoseMens01', annuel: 'price_BancDejaPoseAnnu02' } } } }));
      await refuse('des tarifs Perso+ DÉJÀ posés', ['oui'], /des tarifs Perso\+ sont DÉJÀ posés dans ce fichier \(mensuel et annuel\)/);
      poser();
      await refuse('l\'utilisateur ne tape pas « oui » (« non »)', ['non'], /Pas de « oui » : abandon/);
      await refuse('l\'utilisateur ne tape rien (Entrée)', [''], /Pas de « oui » : abandon/);
      fake.sansDroits.add('ecriture');
      try {
        const r = await refuse('la clé n\'a pas le droit d\'ÉCRIRE les produits (Stripe répond 403) — le script le dit, et nomme le droit à ajouter', ['oui'], /LE PRODUIT N'A PAS PU ÊTRE CRÉÉ — Stripe refuse ce droit à la clé \(403\) : la clé restreinte n'a pas le droit « Products — écriture »/, undefined, 1);
        void r;
      } finally { fake.sansDroits.delete('ecriture'); }
      poser(base({}, true));
      await refuse('un fichier SANS clé de Messages Pro (Perso+ s\'ajoute à Messages Pro)', ['oui'], /aucune clé Stripe n'est configurée dans ce fichier : Perso\+ s'ajoute à Messages Pro/);
      poser();
      await refuse('une option inconnue', [], /option inconnue/, { args: ['--perso'] });
      await refuse('deux options à la fois', [], /une seule option à la fois/, { args: ['--creer-perso-plus', '--perso-plus'] });
      /* contre-épreuve : le refus d'avant venait bien de ce qu'on a mis — le même fichier, le même Stripe, « oui » : ça crée */
      const n0 = posts().length;
      const bon = await outil(['oui'], { args: ['--creer-perso-plus'] });
      v('contre-épreuve : le même fichier, le même faux Stripe, sans le défaut — « oui » crée bien (0, et trois POST)', [bon.code, posts().length - n0], [0, 3]);
    }

    /* ═══ 3. RANGER DES TARIFS CRÉÉS À LA MAIN ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n--perso-plus : deux tarifs créés dans le tableau de bord — lecture seule, mêmes épreuves, mêmes refus');
    {
      poser();
      const n0 = posts().length, tar0 = fake.tarifs.size;
      const ok = await outil([MAIN.mensuel, MAIN.annuel], { args: ['--perso-plus'] });
      const ecrit = lire();
      v('⛔ la pose à la main : sortie 0, chaque tarif relu (montant, rythme, produit), le fichier reçoit EXACTEMENT ces deux identifiants — et l\'outil n\'a RIEN écrit chez Stripe', [ok.code, /✓ tarif Perso\+ mensuel : 5,00 EUR par mois — produit « OP MESSAGES Perso\+ \(tableau de bord\) »/.test(ok.sortie), /✓ tarif Perso\+ annuel : 50,00 EUR par an/.test(ok.sortie), ecrit.facturation.perso.prix, posts().length - n0, fake.tarifs.size - tar0],
        [0, true, true, MAIN, 0, 0]);
      v('… la clé et les tarifs de Messages Pro, et le reste du fichier, intacts', [ecrit.facturation.cle === CLE, ecrit.facturation.prix, ecrit.autre, ecrit.sms], [true, PRO, { a: [1, 2, 3] }, { budgetJour: 7 }]);
      v('⛔ AUCUNE fuite dans la sortie', fuites(ok.sortie), []);
      /* un seul rythme suffit */
      poser();
      const un = await outil([MAIN.mensuel, ''], { args: ['--perso-plus'] });
      v('un seul rythme suffit (le mensuel seul) : sortie 0, le fichier ne porte que lui', [un.code, lire().facturation.perso.prix], [0, { mensuel: MAIN.mensuel }]);
      /* le montant annoncé n'est pas celui de Stripe : on écrit, mais le script AVERTIT (l'écran annonce 5 €) */
      fake.poserTarif('price_BancPersoSeptEurosZ3', { unit_amount: 700, product: produitMain });
      poser();
      const sept = await outil(['price_BancPersoSeptEurosZ3', ''], { args: ['--perso-plus'] });
      v('⚠ un tarif à 7 € alors que l\'écran annonce 5 € : écrit, mais l\'outil AVERTIT (« LE MONTANT ANNONCÉ À L\'ÉCRAN (5 €) N\'EST PAS CELUI DE STRIPE (7 €) »)', [sept.code, /LE MONTANT ANNONCÉ À L'ÉCRAN \(5 €\) N'EST PAS CELUI DE STRIPE \(7 €\)/.test(sept.sortie)], [0, true]);
      /* les refus */
      poser();
      const A = { args: ['--perso-plus'] };
      await refuse('aucun tarif donné (Entrée, Entrée)', ['', ''], /Aucun tarif : il faut au moins le tarif mensuel ou le tarif annuel/, A);
      await refuse('un tarif qui N\'EXISTE PAS dans ce mode', ['price_BancInconnuPersoZz9', ''], /LE TARIF MENSUEL N'EXISTE PAS dans ce mode/, A);
      await refuse('le tarif ANNUEL donné à la place du MENSUEL', [MAIN.annuel, ''], /Le tarif mensuel n'est pas un tarif MENSUEL \(une fois par mois\)/, A);
      fake.poserTarif('price_BancPersoMauvaisProdZ4', { unit_amount: 500, product: { id: 'prod_banc_autre', object: 'product', name: 'Abonnement Atelier' } });
      await refuse('un tarif dont le produit NE CONTIENT PAS « messages » (le compte Stripe est commun avec OP GESTION)', ['price_BancPersoMauvaisProdZ4', ''], /LE PRODUIT DU TARIF MENSUEL \(« Abonnement Atelier »\) NE CONTIENT PAS « messages »/, A);
      await refuse('le tarif de MESSAGES PRO réemployé pour Perso+ (la configuration serait refusée au démarrage, l\'outil le voit avant d\'écrire)', [PRO.mensuel, ''], /facturation\.perso\.prix\.mensuel est aussi un tarif de Messages Pro : un tarif ne sert qu'à un forfait/, A);
      const deja = (() => { const c = base(); c.facturation.perso = { prix: { mensuel: MAIN.mensuel } }; return c; })();
      poser(deja);
      await refuse('des tarifs Perso+ déjà posés (la pose à la main aussi)', [MAIN.annuel, ''], /des tarifs Perso\+ sont DÉJÀ posés/, A);
    }

    /* ═══ 4. --verifier RELIT AUSSI PERSO+ ═══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n--verifier : relit Messages Pro ET Perso+, sans rien écrire');
    {
      poser();
      const n0 = posts().length;
      const sans = await outil([], { args: ['--verifier'] });
      v('sans tarif Perso+ posé : le script le dit (« aucun tarif posé … le forfait d\'une personne est inerte ») et relit Messages Pro', [sans.code, /· Perso\+ : aucun tarif posé \(le forfait d'une personne est inerte/.test(sans.sortie), /✓ tarif mensuel : 15,00 EUR par place et par mois/.test(sans.sortie)], [0, true, true]);
      await outil(['oui'], { args: ['--creer-perso-plus'] });
      const n1 = posts().length;
      const avec = await outil([], { args: ['--verifier'] });
      v('avec les tarifs Perso+ : ils sont relus aussi (5,00 € par mois, 50,00 € par an), sortie 0, « tout est en ordre » — et la vérification n\'ÉCRIT rien', [avec.code, /✓ tarif Perso\+ mensuel : 5,00 EUR par mois/.test(avec.sortie), /✓ tarif Perso\+ annuel : 50,00 EUR par an/.test(avec.sortie), /✅ tout est en ordre/.test(avec.sortie), posts().length - n1], [0, true, true, true, 0]);
      void n0;
      v('⛔ AUCUNE fuite dans la sortie de la vérification', fuites(avec.sortie), []);
    }

    /* ═══ 5. LES GARDES DE CODE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes gardes de code de l\'outil : le mode test AVANT toute écriture, un seul endroit qui écrit, l\'idempotence sans la clé');
    {
      const c = code(CONFIGURER);
      const iGarde = c.indexOf("valide.mode !== 'test'"), iEcrit = c.indexOf('await ecrireStripe(hote');
      vrai('la garde « mode test seulement » est TROUVÉE et précède la première écriture chez Stripe', iGarde > 0 && iEcrit > 0 && iGarde < iEcrit);
      vrai('⛔ `ecrireStripe` est la SEULE fonction qui ÉCRIT chez Stripe (un seul `method: \'POST\'`, aucun DELETE/PUT/PATCH), et elle ne vise que les produits et les tarifs', (c.match(/method: 'POST'/g) || []).length === 1 && !/method: '(DELETE|PUT|PATCH)'/.test(c) && /'\/v1\/products'/.test(c) && /'\/v1\/prices'/.test(c) && !/\/v1\/(subscriptions|customers|checkout)[^']*',\s*\[/.test(c));
      vrai('⛔ la clé d\'idempotence est une EMPREINTE de la clé (sha256 tronqué), jamais la clé : `Idempotency-Key` ne reçoit que `idem`, tiré de `marque`', /const marque = 'opmsg-perso-plus-' \+ require\('crypto'\)\.createHash\('sha256'\)\.update\(valide\.cle\)\.digest\('hex'\)\.slice\(0, 16\)/.test(c) && /'Idempotency-Key': idem/.test(c));
      vrai('l\'outil ne génère aucune clé et ne prend aucun secret en argument (les seules options sont sans valeur : --verifier, --creer-perso-plus, --perso-plus)', (c.match(/process\.argv/g) || []).length === 1 && !/randomBytes|randomUUID/.test(c));
    }
  } finally { await fake.fermer(); }
  fin();
})().catch(e => { console.error('✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });
