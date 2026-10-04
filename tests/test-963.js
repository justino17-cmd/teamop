/* ⛔ CE QUE CE FICHIER GARDE — LA CONFIGURATION DE STRIPE : UNE CLÉ RESTREINTE, DES TARIFS EN LISTE BLANCHE, ET L'OUTIL QUI LES POSE SANS RIEN AFFICHER (famille 2 et 5, étape 5, § 3.8).

   `server-msg/config.js` (`facturationConfig`, `formuleConfig`) et `server-msg/configurer-stripe.js` — l'outil que Justin lance SUR LE VPS, en saisie masquée :

     1. LA VALIDATION, la même au démarrage du service et dans l'outil : une clé secrète complète (`sk_…`) est refusée (elle donnerait tout le compte, celui d'OP GESTION compris), la bêta n'accepte
        qu'une clé de TEST, une clé sans tarif ou un tarif mal formé refuse le démarrage, la porte de test de Stripe est fermée en production, le drapeau de la bêta aussi ;
        ⛔ aucun message de refus ne CITE la valeur refusée (un secret qu'on a mal recopié ne doit pas se retrouver dans un journal) ;
     2. L'OUTIL, en entrée redirigée contre un faux Stripe : il ÉPROUVE la clé et chaque tarif (existe-t-il dans ce mode, actif, récurrent, au bon rythme, à l'unité ?) AVANT d'écrire ; au moindre refus
        le fichier reste intact, octet pour octet ; il avertit d'un montant qui n'est pas celui de l'écran, et REFUSE d'écrire un tarif dont le produit ne contient pas « messages »
        (l'autre application ne le rangerait pas en « OP MESSAGES » : relecture du gardien, 3 octobre 2026) ;
        dans son usage ordinaire il n'écrit que des LECTURES chez Stripe (aucun GET ne crée rien, aucun POST) — SEULE l'option `--creer-perso-plus` (mode test) crée le produit et les deux tarifs de Perso+ (test-993) ; le fichier est écrit 0600 puis renommé ; ce qu'il a écrit, le service le lit et démarre dessus ;
     3. ⛔ AUCUNE FUITE : la clé n'apparaît ni à l'écran, ni dans une erreur, ni même quand Stripe la répète dans son message ; sous un VRAI TERMINAL (pty), une faute corrigée, une flèche, un
        collage, Ctrl-U et Ctrl-C ne la réaffichent pas ;
     4. les gardes de CODE de l'outil (aucune clé générée, aucun secret en argument, le fichier écrit en 0600 dès sa création et relu avant d'être renommé).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « fichier intact » est précédé de la preuve que l'outil a tourné jusqu'au refus (sa sortie le dit), et chaque « aucune fuite »
   de la preuve que le détecteur trouve la clé quand elle y est. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { facturationConfig, formuleConfig, charger } = require(path.join(T.SERVICE, 'config.js'));
const CONFIGURER = path.join(T.SERVICE, 'configurer-stripe.js');
const code = (f) => T.sansCommentaires(fs.readFileSync(f, 'utf8'));

/* Des valeurs de banc (lettres hors de [0-9a-f]). Le préfixe `rk_test_` est de FORME : il se lit légitimement dans l'aide de l'outil ; ce qui ne doit paraître nulle part, c'est ce qui le suit. */
const CLE = ['rk', 'test', 'BancStripeZzQq9X'].join('_');
const SUITE = CLE.slice('rk_test_'.length);
const CLE_LIVE = ['rk', 'live', 'BancProdZzQq9XyW'].join('_');
const PRIX = { mensuel: 'price_BancMensuelAaZz01', annuel: 'price_BancAnnuelBbYy02' };
const fuites = (texte) => [CLE, SUITE, SUITE.slice(0, 8), SUITE.slice(-8)].filter(s => texte.includes(s));
const lance = (f) => { try { f(); return null; } catch (e) { return e.message; } };

(async () => {
  const fake = await fauxStripe();
  fake.poserTarif(PRIX.mensuel);
  fake.poserTarif(PRIX.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-963-'));
  process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } });
  try {
    /* ═══ 1. LA VALIDATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('La validation de la configuration : une clé restreinte, des tarifs, des portes de test fermées en production');
    {
      const f = (bloc, env, instance) => facturationConfig(bloc === undefined ? {} : { facturation: bloc }, env || {}, instance || 'beta');
      const d = f();
      v('sans bloc : la facturation est INERTE — pas de clé, mode « inerte », 15 € et 150 € affichés, relecture toutes les dix minutes', [d.cle, d.mode, d.prix, d.affichage, d.relectureMs, d.timeoutMs, d.testHote], [null, 'inerte', {}, { mensuel: 15, annuel: 150 }, 600000, 10000, null]);
      const t = f({ cle: CLE, prix: PRIX });
      v('une clé de test et deux tarifs : mode « test », tarifs gardés tels quels', [t.mode, t.cle === CLE, t.prix], ['test', true, PRIX]);
      v('⛔ en PRODUCTION une clé de test est permise (on éprouve avant d\'ouvrir) et une clé de production aussi ; sur la BÊTA, seulement la clé de test', [f({ cle: CLE, prix: PRIX }, {}, 'prod').mode, f({ cle: CLE_LIVE, prix: PRIX }, {}, 'prod').mode, lance(() => f({ cle: CLE_LIVE, prix: PRIX }, {}, 'beta'))], ['test', 'live', 'config: facturation.cle : la bêta n\'accepte qu\'une clé de TEST (rk_test_…) — pas de Stripe réel hors production']);
      const refus = [['sk_test_' + 'BancSecreteComplete99', 'une clé secrète complète'], ['pk_test_' + 'BancPubliableZz99', 'une clé publiable'], ['rk_test_court', 'une clé trop courte'], ['RK_TEST_BANCSTRIPE', 'les majuscules'], ['rk_test_' + 'Banc Stripe Zz 99', 'des espaces dedans'], [12345, 'un nombre'], [{ a: 1 }, 'un objet'], ['rk_prod_BancStripeZzQq9X', 'un autre mode']];
      const msgs = refus.map(([cle]) => lance(() => f({ cle, prix: PRIX })));
      v('⛔ une clé qui n\'est pas une clé RESTREINTE de Stripe refuse le démarrage — secrète complète, publiable, trop courte, majuscules, espaces, pas du texte, mode inconnu', msgs.map(m => /RESTREINTE de Stripe/.test(String(m))), Array(refus.length).fill(true));
      vrai('⛔ et AUCUN message ne CITE la clé refusée (un secret mal recopié ne se retrouve pas dans un journal)', msgs.every((m, i) => typeof refus[i][0] !== 'string' || !String(m).includes(refus[i][0])));
      v('⛔ une clé SANS tarif refuse le démarrage (rien à vendre) ; des tarifs SANS clé laissent l\'abonnement inerte', [lance(() => f({ cle: CLE })), f({ prix: PRIX }).mode, f({ prix: PRIX }).cle], ['config: facturation.cle sans facturation.prix : aucun tarif à vendre (au moins « mensuel » ou « annuel »)', 'inerte', null]);
      const mauvaisPrix = [{ mensuel: 'cher' }, { mensuel: 'price_' }, { mensuel: 'price_court' }, { hebdo: PRIX.mensuel }, { mensuel: 5 }, 'price_BancMensuelAaZz01', [PRIX.mensuel]];
      v('un tarif mal formé, un rythme inconnu ou un « prix » qui n\'est pas un objet refusent le démarrage', mauvaisPrix.map(p => lance(() => f({ cle: CLE, prix: p })) !== null), Array(mauvaisPrix.length).fill(true));
      v('le tarif de la configuration est le SEUL : un seul rythme suffit (annuel seul)', [f({ cle: CLE, prix: { annuel: PRIX.annuel } }).prix, f({ cle: CLE, prix: { annuel: PRIX.annuel } }).mode], [{ annuel: PRIX.annuel }, 'test']);
      v('les montants affichés se règlent, bornés (0 à 10 000), pour « mensuel » et « annuel » seulement', [f({ cle: CLE, prix: PRIX, affichage: { mensuel: 12.5 } }).affichage, [0, -1, 10001, '15', NaN, null].map(x => lance(() => f({ cle: CLE, prix: PRIX, affichage: { mensuel: x } })) !== null), lance(() => f({ cle: CLE, prix: PRIX, affichage: { hebdo: 3 } })) !== null], [{ mensuel: 12.5, annuel: 150 }, Array(6).fill(true), true]);
      v('le rythme de relecture (100 ms à une heure) et le délai (200 ms à une minute) sont bornés', [f({ relectureMs: 250 }).relectureMs, f({ timeoutMs: 3000 }).timeoutMs, [99, 3600001, 1.5, '250', null].map(x => lance(() => f({ relectureMs: x })) !== null), [199, 60001, 1.5, '250'].map(x => lance(() => f({ timeoutMs: x })) !== null)], [250, 3000, Array(5).fill(true), Array(4).fill(true)]);
      v('un « facturation » qui n\'est pas un objet (liste, texte, nombre) refuse le démarrage', [[], 'oui', 3].map(x => lance(() => f(x)) !== null), [true, true, true]);
      /* ⛔ la porte de test de Stripe */
      v('⛔ la porte de test de Stripe (un faux Stripe en boucle locale) : acceptée sur la bêta à l\'hôte et au port exacts', f({}, { OPMSG_TEST_STRIPE: '127.0.0.1:8123' }).testHote, '127.0.0.1:8123');
      v('⛔ … REFUSÉE en production (une variable oubliée dans une unité systemd ne doit pas faire de ce service un client HTTP vers un port local), et mal formée ailleurs', [lance(() => f({}, { OPMSG_TEST_STRIPE: '127.0.0.1:8123' }, 'prod')), ['localhost:8123', '127.0.0.1', 'evil.example:80', 'http://127.0.0.1:80', '127.0.0.1:8', '10.0.0.1:8123'].map(x => lance(() => f({}, { OPMSG_TEST_STRIPE: x })) !== null)], ['config: OPMSG_TEST_STRIPE (porte de test de Stripe) est refusée en production', Array(6).fill(true)]);
      /* ⛔ le drapeau de la bêta */
      const fo = (cfg, i) => formuleConfig(cfg, i);
      v('le drapeau de la bêta : vrai par défaut sur la bêta, faux en production', [fo({}, 'beta').toutOuvert, fo({}, 'prod').toutOuvert, fo({ formule: { toutOuvert: false } }, 'beta').toutOuvert], [true, false, false]);
      v('⛔ la production REFUSE de démarrer avec lui (une configuration copiée de la bêta ne doit pas offrir Messages Pro à tout le monde) ; un autre type aussi', [lance(() => fo({ formule: { toutOuvert: true } }, 'prod')), lance(() => fo({ formule: { toutOuvert: 'oui' } }, 'beta')) !== null, lance(() => fo({ formule: [] }, 'beta')) !== null, lance(() => fo({ formule: 7 }, 'beta')) !== null], ['config: formule.toutOuvert est refusé en production (tout y serait Pro, sans paiement)', true, true, true]);
      /* de bout en bout par `charger` : un fichier sur disque, l'environnement du service */
      const racine = fs.mkdtempSync(path.join(bac, 'charger-'));
      const cfgPath = path.join(racine, 'config.json'), data = path.join(racine, 'data'), cred = path.join(racine, 'cred');
      fs.mkdirSync(cred, { recursive: true }); fs.writeFileSync(path.join(cred, 'kek'), crypto.randomBytes(32).toString('hex'), { mode: 0o600 });
      const env = { OPMSG_CONFIG: cfgPath, OPMSG_DATA: data, OPMSG_INSTANCE: 'beta', CREDENTIALS_DIRECTORY: cred, PORT: '8099' };
      fs.writeFileSync(cfgPath, JSON.stringify({ facturation: { cle: CLE, prix: PRIX } }));
      const ch = charger(env);
      v('`charger` (ce que lit le service) rend la facturation validée, la formule de la bêta et la porte fermée', [ch.facturation.mode, ch.facturation.prix, ch.formule.toutOuvert, ch.facturation.testHote], ['test', PRIX, true, null]);
      fs.writeFileSync(cfgPath, JSON.stringify({ facturation: { cle: 'sk_test_' + 'BancSecreteComplete99', prix: PRIX } }));
      const m = lance(() => charger(env));
      v('⛔ un fichier avec une clé secrète complète fait REFUSER le démarrage, sans citer la clé', [/RESTREINTE/.test(String(m)), String(m).includes('BancSecreteComplete99')], [true, false]);
    }

    /* ═══ 2. L'OUTIL, EN ENTRÉE REDIRIGÉE ════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nconfigurer-stripe.js : la clé et chaque tarif sont éprouvés AVANT d\'écrire, le fichier reste intact au moindre refus');
    const chemin = path.join(bac, 'beta.json');
    const initial = () => JSON.stringify({ instance: 'beta', domaine: 'msg-beta.exemple', vapidPublicKey: 'vapid-conserve', sms: { budgetJour: 7 }, autre: { a: [1, 2, 3] } }, null, 2) + '\n';
    const poser = (texte) => fs.writeFileSync(chemin, texte === undefined ? initial() : texte, { mode: 0o640 });
    const outil = (lignes, o = {}) => new Promise((resolve) => {
      const env = Object.assign({}, process.env, { OPMSG_CONFIG: chemin, OPMSG_TEST_STRIPE: fake.hote }, o.env || {});
      if (o.sansConfig) delete env.OPMSG_CONFIG;
      const p = spawn(process.execPath, [CONFIGURER].concat(o.args || []), { env, stdio: ['pipe', 'pipe', 'pipe'] });
      let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
      const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, 60000);
      p.on('close', (c) => { clearTimeout(t); resolve({ code: c, sortie }); });
      p.stdin.end(lignes.join('\n') + '\n');
    });
    {
      poser();
      const avantOctets = fs.readFileSync(chemin);
      const n0 = fake.appels.length;
      const ok = await outil(['  ' + CLE + '  ', PRIX.mensuel, PRIX.annuel]);
      const ecrit = JSON.parse(fs.readFileSync(chemin, 'utf8'));
      const st = fs.statSync(chemin);
      v('⛔ la pose complète : sortie 0, la clé est éprouvée, chaque tarif relu (montant, rythme, produit), le fichier mis à jour', [ok.code, /✓ la clé répond, en mode test et lit les abonnements/.test(ok.sortie), /✓ tarif mensuel : 15,00 EUR par place et par mois — produit « OP MESSAGES Pro »/.test(ok.sortie), /✓ tarif annuel : 150,00 EUR par place et par an/.test(ok.sortie), /mis à jour \(chmod 600\)\. Mode test, mensuel et annuel/.test(ok.sortie)], [0, true, true, true, true]);
      v('… le fichier : la clé (sans les blancs du collage), les deux tarifs, et TOUT le reste intact — instance, domaine, clé VAPID, budget SMS, autre bloc', [ecrit.facturation, ecrit.instance, ecrit.domaine, ecrit.vapidPublicKey, ecrit.sms, ecrit.autre], [{ cle: CLE, prix: PRIX }, 'beta', 'msg-beta.exemple', 'vapid-conserve', { budgetJour: 7 }, { a: [1, 2, 3] }]);
      v('… en 0600, sans fichier temporaire resté à côté', [(st.mode & 0o777).toString(8), fs.readdirSync(bac).filter(x => /^beta\.json\.tmp/.test(x))], ['600', []]);
      const appels = fake.appels.slice(n0);
      v('⛔ l\'outil ne fait que LIRE chez Stripe : trois GET (les abonnements, les deux tarifs), aucun POST, rien de créé, la clé en Bearer à chaque appel', [appels.length, appels.every(a => a.m === 'GET'), appels.every(a => a.auth === 'Bearer ' + CLE), fake.sessions.size, appels.map(a => a.chemin)], [3, true, true, 0, ['/v1/subscriptions', '/v1/prices/' + PRIX.mensuel, '/v1/prices/' + PRIX.annuel]]);
      vrai('population du détecteur : il TROUVE la clé quand elle y est (sinon « aucune fuite » ne prouve rien)', fuites('voici ' + CLE + ' ici').length === 4 && fuites('xx ' + SUITE.slice(-8)).length === 1);
      v('⛔ AUCUNE fuite : ni la clé, ni sa suite, ni ses morceaux ne sont dans la sortie', fuites(ok.sortie), []);
      /* le service démarre avec ce que l'outil a écrit : « ce qui passe ici démarrera là » */
      const svc = await T.lancerService({ config: { facturation: Object.assign({}, ecrit.facturation, { relectureMs: 3600000 }) }, env: { OPMSG_TEST_STRIPE: fake.hote } });
      try {
        const o = await T.client(svc.base).get('/api/facturation/offres');
        const h = (await T.client(svc.base).get('/health')).j;
        v('⛔ le SERVICE démarre sur le fichier que l\'outil vient d\'écrire : les offres sont ouvertes, en mode test, /health le dit', [o.code, h.facturation.mode, h.stripeEchecMin], [200, 'test', 0]);
      } finally { await svc.arreter(); }

      /* un seul rythme */
      poser();
      const seul = await outil([CLE, PRIX.mensuel, '']);
      v('le tarif mensuel seul : la pose réussit et le bloc ne porte que lui', [seul.code, JSON.parse(fs.readFileSync(chemin, 'utf8')).facturation.prix], [0, { mensuel: PRIX.mensuel }]);

      /* les refus : le fichier reste INTACT, octet pour octet, et l'outil a tourné jusqu'au refus */
      const refuse = async (nom, lignes, attendu, o) => {
        poser(); const avant = fs.readFileSync(chemin);
        const nAvant = fake.appels.length;
        const r = await outil(lignes, o);
        const intact = fs.readFileSync(chemin).equals(avant) && fs.readdirSync(bac).filter(x => /^beta\.json\.tmp/.test(x)).length === 0;
        v('⛔ ' + nom + ' : sortie 1, il le DIT, le fichier est intact', [r.code, attendu.test(r.sortie), /Rien n'a été modifié/.test(r.sortie), intact, fuites(r.sortie)], [1, true, true, true, []]);
        return { r, appelsStripe: fake.appels.length - nAvant };
      };
      const sk = await refuse('une clé SECRÈTE COMPLÈTE (sk_…)', ['sk_test_' + 'BancSecreteComplete99', PRIX.mensuel, ''], /SECRÈTE COMPLÈTE/);
      v('… avant tout appel à Stripe', sk.appelsStripe, 0);
      await refuse('une clé PUBLIABLE (pk_…)', ['pk_test_' + 'BancPubliableZz99', PRIX.mensuel, ''], /PUBLIABLE/);
      await refuse('un texte qui n\'est pas une clé', ['pas-une-cle', PRIX.mensuel, ''], /Ce n'est pas une clé restreinte/);
      await refuse('aucune clé', ['', PRIX.mensuel, ''], /La clé manque/);
      await refuse('aucun tarif', [CLE, '', ''], /Aucun tarif/);
      await refuse('un tarif mal écrit', [CLE, 'cher', ''], /facturation\.prix\.mensuel doit être un identifiant de tarif/);
      await refuse('une clé de PRODUCTION sur la bêta', [CLE_LIVE, PRIX.mensuel, ''], /la bêta n'accepte qu'une clé de TEST/);
      fake.mode = 'refuse'; fake.echo = true;
      const rf = await refuse('une clé que Stripe REFUSE (401) — et même s\'il la répète dans son message', [CLE, PRIX.mensuel, ''], /LA CLÉ NE LIT PAS LES ABONNEMENTS — Stripe refuse la clé \(401\)/);
      v('… la sortie ne répète pas le message de Stripe', /Invalid API Key|Bearer/.test(rf.r.sortie), false);
      fake.mode = 'normal'; fake.echo = false;
      fake.sansDroits.add('abonnements');
      await refuse('une clé SANS le droit de lire les abonnements (403)', [CLE, PRIX.mensuel, ''], /la clé restreinte n'a pas le droit « Subscriptions — lecture »/);
      fake.sansDroits.delete('abonnements');
      await refuse('un tarif qui n\'existe pas dans ce mode (404) — un tarif de production avec une clé de test', [CLE, 'price_ProductionAaZz99', ''], /LE TARIF MENSUEL N'EXISTE PAS dans ce mode/);
      fake.poserTarif('price_BancArchiveAaZz03', { active: false });
      await refuse('un tarif ARCHIVÉ', [CLE, 'price_BancArchiveAaZz03', ''], /est ARCHIVÉ chez Stripe/);
      await refuse('le tarif ANNUEL donné comme tarif MENSUEL (il se renouvelle tous les 1 year)', [CLE, PRIX.annuel, ''], /n'est pas un tarif MENSUEL/);
      await refuse('le tarif MENSUEL donné comme tarif ANNUEL', [CLE, '', PRIX.mensuel], /n'est pas un tarif ANNUEL/);
      fake.poserTarif('price_BancUniqueAaZz04', { recurring: null, type: 'one_time' });
      await refuse('un tarif à paiement UNIQUE (il ne se renouvelle jamais)', [CLE, 'price_BancUniqueAaZz04', ''], /se renouvelle jamais/);
      fake.poserTarif('price_BancProdModeAaZz05', { livemode: true });
      await refuse('un tarif d\'un AUTRE mode que la clé', [CLE, 'price_BancProdModeAaZz05', ''], /est du mode production et la clé du mode test/);
      await fake.fermer();
      const mort = await fauxStripe();
      const portMort = mort.hote; await mort.fermer();
      await refuse('Stripe injoignable', [CLE, PRIX.mensuel, ''], /n'a pas répondu/, { env: { OPMSG_TEST_STRIPE: portMort } });
      /* le faux Stripe est refermé : on en relance un pour la suite */
    }
    const fake2 = await fauxStripe();
    fake2.poserTarif(PRIX.mensuel); fake2.poserTarif(PRIX.annuel, { unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
    const envF2 = { OPMSG_TEST_STRIPE: fake2.hote };
    {
      const refuse2 = async (nom, lignes, attendu, o) => {
        poser(); const avant = fs.readFileSync(chemin);
        const r = await outil(lignes, o);
        v('⛔ ' + nom + ' : sortie 1, le fichier est intact', [r.code, attendu.test(r.sortie), fs.readFileSync(chemin).equals(avant), fuites(r.sortie)], [1, true, true, []]);
        return r;
      };
      await refuse2('une option inconnue (la clé n\'est JAMAIS un argument)', [CLE], /option inconnue/, { args: [CLE], env: envF2 });
      await refuse2('sans OPMSG_CONFIG', [CLE], /OPMSG_CONFIG n'est pas posé/, { sansConfig: true, env: envF2 });
      poser('{pas du json');
      const ill = await outil([CLE, PRIX.mensuel, ''], { env: envF2 });
      v('un fichier illisible : refusé, il le dit — l\'outil MODIFIE une configuration existante, il n\'en crée pas', [ill.code, /illisible \(JSON invalide\)/.test(ill.sortie), fs.readFileSync(chemin, 'utf8')], [1, true, '{pas du json']);
      poser(JSON.stringify({ domaine: 'x' }));
      const sansInst = await outil([CLE, PRIX.mensuel, ''], { env: envF2 });
      v('un fichier qui ne dit pas de quelle instance il est : refusé', [sansInst.code, /ne dit pas de quelle instance/.test(sansInst.sortie)], [1, true]);
      poser();
      const confl = await outil([CLE, PRIX.mensuel, ''], { env: Object.assign({}, envF2, { OPMSG_INSTANCE: 'prod' }) });
      v('⛔ le fichier dit « beta » et l\'environnement « prod » : refusé (écrire la clé de la production dans le fichier de la bêta est la faute qu\'aucun nom ne rattrape)', [confl.code, /une des deux est fausse/.test(confl.sortie), fs.readFileSync(chemin, 'utf8') === initial()], [1, true, true]);
      poser(JSON.stringify({ instance: 'prod', domaine: 'msg.exemple' }));
      const prodTest = await outil([CLE, PRIX.mensuel, ''], { env: envF2 });
      v('⛔ la porte de test de Stripe est REFUSÉE en production, par l\'outil aussi (la même validation que le service)', [prodTest.code, /OPMSG_TEST_STRIPE \(porte de test de Stripe\) est refusée en production/.test(prodTest.sortie), JSON.parse(fs.readFileSync(chemin, 'utf8')).facturation], [1, true, undefined]);

      /* ⚠️ les avertissements : la pose réussit, l'outil dit ce qui cloche */
      fake2.poserTarif('price_BancVingtAaZz06', { unit_amount: 2000 });
      poser();
      const avert = await outil([CLE, 'price_BancVingtAaZz06', ''], { env: envF2 });
      v('⚠ un montant que Stripe facturera (20 €) et que l\'écran n\'annoncera pas (15 €) : la pose réussit, l\'avertissement le DIT', [avert.code, /LE MONTANT ANNONCÉ À L'ÉCRAN \(15 €\) N'EST PAS CELUI DE STRIPE \(20 €\)/.test(avert.sortie)], [0, true]);
      /* ⛔ le produit : REFUSÉ (avant : un avertissement, et la pose réussissait — le compte est commun avec OP GESTION, dont c'est ce nom qui range la ligne hors de ses paiements) */
      fake2.poserTarif('price_BancGestionAaZz07', { product: { id: 'prod_x', object: 'product', name: 'OP GESTION Premium' } });
      const gest = await refuse2('un produit dont le nom ne contient pas « messages » : OP GESTION, qui lit tous les abonnements du compte, ne le rangerait pas en « OP MESSAGES » — l\'outil REFUSE d\'écrire', [CLE, 'price_BancGestionAaZz07', ''], /NE CONTIENT PAS « messages » : refusé/, { env: envF2 });
      v('… il dit lequel des tarifs, quel produit, comment le réparer, et que rien n\'a été modifié', [/LE PRODUIT DU TARIF MENSUEL \(« OP GESTION Premium »\)/.test(gest.sortie), /Renomme le produit chez Stripe \(« OP MESSAGES Pro »\)/.test(gest.sortie), /Rien n'a été modifié/.test(gest.sortie)], [true, true, true]);
      fake2.poserTarif('price_BancGestionAnAaZz10', { product: { id: 'prod_z', object: 'product', name: 'OP GESTION Premium' }, unit_amount: 15000, recurring: { interval: 'year', interval_count: 1 } });
      await refuse2('… le tarif ANNUEL aussi (le mensuel, lui, est bon) : refusé — rien n\'est écrit à moitié', [CLE, PRIX.mensuel, 'price_BancGestionAnAaZz10'], /LE PRODUIT DU TARIF ANNUEL \(« OP GESTION Premium »\) NE CONTIENT PAS « messages » : refusé/, { env: envF2 });
      fake2.poserTarif('price_BancNomMinAaZz11', { product: { id: 'prod_y', object: 'product', name: 'abonnement messages (équipe)' } });
      poser();
      const minu = await outil([CLE, 'price_BancNomMinAaZz11', ''], { env: envF2 });
      v('… contre-épreuve : un nom qui contient « messages » en minuscules, au milieu d\'autres mots, passe (la comparaison ne tient ni à la casse ni à la place)', [minu.code, /refusé/.test(minu.sortie), JSON.parse(fs.readFileSync(chemin, 'utf8')).facturation.prix], [0, false, { mensuel: 'price_BancNomMinAaZz11' }]);
      fake2.poserTarif('price_BancDollarAaZz08', { currency: 'usd' });
      poser();
      const usd = await outil([CLE, 'price_BancDollarAaZz08', ''], { env: envF2 });
      v('⚠ un tarif en dollars : avertissement (l\'écran annonce des euros)', [usd.code, /n'est pas en euros \(USD\)/.test(usd.sortie)], [0, true]);
      fake2.poserTarif('price_BancPaliersAaZz09', { billing_scheme: 'tiered' });
      poser();
      const pal = await outil([CLE, 'price_BancPaliersAaZz09', ''], { env: envF2 });
      v('⚠ un tarif par paliers : avertissement (les places sont une quantité)', [pal.code, /pas facturé « à l'unité »/.test(pal.sortie)], [0, true]);
      fake2.sansDroits.add('tarifs');
      poser();
      const sansT = await outil([CLE, PRIX.mensuel, ''], { env: envF2 });
      v('⚠ une clé qui ne lit pas les tarifs (droit « Prices — lecture » absent) : la pose réussit, avertissement « non relu »', [sansT.code, /non relu \(droit « Prices — lecture » absent\)/.test(sansT.sortie), JSON.parse(fs.readFileSync(chemin, 'utf8')).facturation.cle === CLE], [0, true, true]);
      fake2.sansDroits.delete('tarifs'); fake2.sansDroits.add('produits');
      poser();
      const sansP = await outil([CLE, PRIX.mensuel, ''], { env: envF2 });
      v('⚠ une clé qui ne lit pas les produits : le tarif est relu, le nom du produit non — avertissement de vérifier à la main', [sansP.code, /✓ tarif mensuel : 15,00 EUR/.test(sansP.sortie), /nom du produit du tarif mensuel n'a pas pu être lu/.test(sansP.sortie)], [0, true, true]);
      fake2.sansDroits.delete('produits');

      /* remplacer une facturation qui existe : « oui » en toutes lettres */
      const bloc0 = { cle: CLE, prix: { mensuel: PRIX.mensuel }, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 300000, timeoutMs: 4000 };
      poser(JSON.stringify(Object.assign(JSON.parse(initial()), { facturation: bloc0 }), null, 2));
      const avantR = fs.readFileSync(chemin);
      const non = await outil([CLE, PRIX.mensuel, PRIX.annuel, 'non'], { env: envF2 });
      v('⛔ remplacer des TARIFS déjà posés demande « oui » en toutes lettres : « non » → abandon, fichier intact', [non.code, /Tu remplaces une facturation qui existe déjà/.test(non.sortie), /les TARIFS changent/.test(non.sortie), /Pas de « oui »/.test(non.sortie), fs.readFileSync(chemin).equals(avantR)], [1, true, true, true, true]);
      const oui = await outil([CLE, PRIX.mensuel, PRIX.annuel, 'oui'], { env: envF2 });
      const apres = JSON.parse(fs.readFileSync(chemin, 'utf8')).facturation;
      v('… « oui » : remplacée, et les montants affichés, le rythme de relecture et le délai déjà réglés sont CONSERVÉS', [oui.code, apres.prix, apres.relectureMs, apres.timeoutMs, apres.affichage], [0, PRIX, 300000, 4000, { mensuel: 15, annuel: 150 }]);
      const meme = await outil([CLE, PRIX.mensuel, PRIX.annuel], { env: envF2 });
      v('la même pose une seconde fois (rien ne change) ne demande rien', [meme.code, /Tu remplaces/.test(meme.sortie)], [0, false]);

      /* --verifier */
      poser(JSON.stringify(Object.assign(JSON.parse(initial()), { facturation: { cle: CLE, prix: PRIX } }), null, 2));
      const verif = await outil([], { args: ['--verifier'], env: envF2 });
      v('--verifier : relit la clé et les tarifs, ne demande rien, ne dit pas la clé — « tout est en ordre »', [verif.code, /la configuration du fichier est valide/.test(verif.sortie), /tout est en ordre/.test(verif.sortie), fuites(verif.sortie)], [0, true, true, []]);
      fake2.mode = 'refuse';
      const verifK = await outil([], { args: ['--verifier'], env: envF2 });
      fake2.mode = 'normal';
      v('--verifier avec une clé que Stripe refuse : sortie 1', [verifK.code, /Stripe refuse la clé \(401\)/.test(verifK.sortie)], [1, true]);
      poser();
      const verifS = await outil([], { args: ['--verifier'], env: envF2 });
      v('--verifier sans aucune clé posée : sortie 1, il le dit (rien à vérifier)', [verifS.code, /aucune clé Stripe n'est configurée/.test(verifS.sortie)], [1, true]);
      poser(JSON.stringify(Object.assign(JSON.parse(initial()), { facturation: { cle: CLE, prix: { mensuel: 'price_BancGestionAaZz07' } } }), null, 2));
      const verifN = await outil([], { args: ['--verifier'], env: envF2 });
      v('⛔ --verifier relit aussi le NOM du produit : renommé depuis la pose (« OP GESTION Premium »), c\'est la sortie 1 et il le dit — sans rien écrire', [verifN.code, /NE CONTIENT PAS « messages » : refusé/.test(verifN.sortie), fuites(verifN.sortie)], [1, true, []]);
    }

    /* ═══ 3. SOUS UN VRAI TERMINAL ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nconfigurer-stripe.js SOUS UN VRAI TERMINAL (pty) : une faute corrigée, une flèche, un collage, Ctrl-U, Ctrl-C — la clé ne s\'affiche jamais');
    {
      /* ⛔ LE HARNAIS TAPE QUAND L'INVITE EST À L'ÉCRAN, PAS APRÈS UN DÉLAI (voir test-951) : ce qu'on tape avant que le programme passe en mode brut est repris par le PILOTE du terminal,
         qui l'écrit à l'écran — secrets compris. Une personne ne tape pas avant l'invite ; le banc non plus. */
      const PTY_PY = `
import os, pty, sys, time, select, json
envx, node, script = sys.argv[1:4]
env = dict(os.environ); env.update(json.loads(envx))
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(node, [node, script] + json.loads(sys.argv[5]), env)
out = b''
fini = False
def lire(t):
    global out, fini
    fin = time.time() + t
    while time.time() < fin and not fini:
        r, _, _ = select.select([fd], [], [], 0.05)
        if r:
            try: d = os.read(fd, 4096)
            except OSError:
                fini = True; return
            if not d:
                fini = True; return
            out += d
def attendre(texte, t=20):
    fin = time.time() + t
    cible = texte.encode('utf8')
    while cible not in out and time.time() < fin and not fini:
        lire(0.05)
def envoyer(s, t=0.25):
    os.write(fd, s); lire(t)
for etape in json.loads(sys.argv[4]):
    if etape[2]: attendre(etape[2])
    envoyer(bytes.fromhex(etape[0]), etape[1])
fin = time.time() + 20
while not fini and time.time() < fin:
    lire(0.1)
lire(0.2)
try:
    _, statut = os.waitpid(pid, os.WNOHANG)
except Exception:
    statut = 0
print(json.dumps({'sortie': out.decode('utf8', 'replace'), 'statut': statut}))
`;
      const pty = (envx, etapes, args = []) => new Promise((resolve) => {
        const p = spawn('python3', ['-c', PTY_PY, JSON.stringify(envx), process.execPath, CONFIGURER, JSON.stringify(etapes.map(([txt, t, attente]) => [Buffer.from(txt, 'utf8').toString('hex'), t || 0.25, attente || ''])), JSON.stringify(args)], { stdio: ['ignore', 'pipe', 'pipe'] });
        let sortie = '', err = ''; p.stdout.on('data', x => { sortie += x; }); p.stderr.on('data', x => { err += x; });
        p.on('error', () => resolve({ introuvable: true, sortie: '' }));
        p.on('close', () => { try { resolve(JSON.parse(sortie)); } catch (e) { resolve({ illisible: true, sortie: sortie + err }); } });
        setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, 60000).unref();
      });
      poser();
      const etapes = [
        [CLE.slice(0, -3) + 'XYZ', 0, 'Clé restreinte Stripe'], ['\x7f'], ['\x7f'], ['\x7f'],                // une faute (trois lettres en trop), corrigée par RETOUR ARRIÈRE
        [CLE.slice(-3) + '', 0], ['\x1b[D'], ['\x1b[H'], ['\x1b[F'],                                        // les trois lettres justes, puis flèche gauche, Début, Fin : ignorées
        ['\x15'], [CLE + '\r', 0.4],                                                                        // Ctrl-U efface la ligne ; puis le COLLAGE entier
        [PRIX.mensuel + '\r', 0.3, 'Tarif MENSUEL'], ['\r', 0.3, 'Tarif ANNUEL'],
      ];
      const r = await pty({ OPMSG_CONFIG: chemin, OPMSG_TEST_STRIPE: fake2.hote }, etapes);
      if (r.introuvable || r.illisible) vrai('⛔ python3 est requis pour jouer la saisie sous un vrai terminal (' + (r.introuvable ? 'introuvable' : 'sortie illisible : ' + String(r.sortie).slice(0, 200)) + ')', false);
      else {
        const t = r.sortie;
        vrai('population : le terminal a affiché les invites et le verdict (' + t.length + ' caractères)', t.includes('Clé restreinte Stripe') && /mis à jour/.test(t) && t.includes(PRIX.mensuel));
        v('⛔ AUCUNE trace de la clé à l\'écran — ni à la frappe, ni après un retour arrière, une flèche, Ctrl-U ou un collage', fuites(t), []);
        const ecrit = JSON.parse(fs.readFileSync(chemin, 'utf8'));
        v('… et ce qui est rangé est la BONNE clé (la faute corrigée n\'est pas dedans, Ctrl-U a effacé, le collage est entier)', [ecrit.facturation && ecrit.facturation.cle === CLE, ecrit.facturation && ecrit.facturation.prix], [true, { mensuel: PRIX.mensuel }]);
      }
      poser(); const avantC = fs.readFileSync(chemin);
      const c = await pty({ OPMSG_CONFIG: chemin, OPMSG_TEST_STRIPE: fake2.hote }, [[CLE.slice(0, 12), 0, 'Clé restreinte Stripe'], ['\x03', 0.6]]);
      vrai('Ctrl-C au milieu de la saisie masquée : « Abandon », le fichier est intact, et ce qui était tapé n\'est pas affiché', !c.introuvable && /Abandon/.test(c.sortie || '') && fs.readFileSync(chemin).equals(avantC) && !(c.sortie || '').includes(CLE.slice(0, 12)));
    }

    /* ═══ 4. LES GARDES DE CODE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes gardes de code de l\'outil (commentaires retirés : un motif de banc vise du CODE)');
    {
      const c = code(CONFIGURER), saisie = code(path.join(T.SERVICE, 'saisie.js'));
      vrai('population : le code de l\'outil n\'est pas vide une fois ses commentaires retirés (' + c.split('\n').filter(l => l.trim()).length + ' lignes)', c.split('\n').filter(l => l.trim()).length > 80);
      vrai('⛔ aucune clé n\'est GÉNÉRÉE ici : ni randomBytes, ni openssl, ni generateKey', !/randomBytes|openssl|generateKey/.test(c));
      vrai('⛔ les seuls arguments de ligne de commande sont les TROIS options sans valeur (--verifier, --creer-perso-plus, --perso-plus), une à la fois — jamais un secret : `ps` le montrerait à toute la machine', (c.match(/process\.argv/g) || []).length === 1 && /ARGS\.includes\('--verifier'\)/.test(c) && /\['--verifier', '--creer-perso-plus', '--perso-plus'\]\.includes\(a\)/.test(c) && /ARGS\.length > 1/.test(c));
      vrai('⛔ la clé n\'est JAMAIS écrite à l\'écran : aucun `console.log` ni `console.error` ne porte la variable `cle` ni `valide.cle`', !/console\.(log|error)\([^;]*\b(cle|valide\.cle|bloc\.cle)\b/.test(c));
      vrai('⛔ la saisie est celle de `saisie.js` (mode brut, jamais `readline`), et la clé se demande MASQUÉE', /require\('\.\/saisie'\)/.test(c) && /demander\('Clé restreinte Stripe.*?', true\)/.test(c) && /setRawMode\(true\)/.test(saisie) && !/readline/.test(saisie) && !/readline/.test(c));
      vrai('⛔ le fichier est écrit en 0600 DÈS sa création, le propriétaire de l\'ancien est recopié, il est relu et revalidé (par `facturationConfig`) AVANT d\'être renommé', /mode: 0o600, flag: 'wx'/.test(c) && /chownSync\(tmp, st\.uid, st\.gid\)/.test(c) && c.indexOf('facturationConfig(relu') > 0 && c.indexOf('facturationConfig(relu') < c.indexOf('renameSync(tmp, CONFIG_PATH)'));
      vrai('⛔ l\'outil LIT chez Stripe par GET ; il n\'ÉCRIT qu\'en créant le produit et les deux tarifs de Perso+ (UN seul POST, dans `ecrireStripe`, appelé deux fois), jamais un DELETE, un PUT ni un PATCH — et seulement en mode TEST : la garde précède la première création', /method: 'GET'/.test(c) && (c.match(/method: 'POST'/g) || []).length === 1 && !/method: '(DELETE|PUT|PATCH)'/.test(c) && (c.match(/await ecrireStripe\(/g) || []).length === 2 && c.indexOf("valide.mode !== 'test'") > 0 && c.indexOf("valide.mode !== 'test'") < c.indexOf("await ecrireStripe(hote, valide.cle, '/v1/products'"));
      vrai('l\'adresse de Stripe est celle du service (`HOTE_STRIPE`), écrite à UN seul endroit', /require\('\.\/facturation'\)/.test(c) && !/api\.stripe\.com/.test(c));
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    process.exitCode = 1;
  }
  try { await fake.fermer(); } catch (e) { /* déjà fermé */ }
  fin();
})();
