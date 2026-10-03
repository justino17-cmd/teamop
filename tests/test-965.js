/* ⛔ CE QUE CE FICHIER GARDE — LA COUTURE ENTRE MESSAGES PRO ET OP GESTION : UN ABONNEMENT D'OP MESSAGES NE CHANGE JAMAIS CE QU'OP GESTION DÉCIDE (famille 3 de SERVEUR.md § 3.11, étape 5).

   Les deux services lisent UN SEUL compte Stripe. OP GESTION liste TOUS les abonnements du compte (`status=all`, jusqu'à ~1 000) et rattache à une entreprise ceux qui portent sa référence — ou, à défaut,
   la MÊME ADRESSE e-mail que la sienne. Un abonnement de Messages Pro, payé avec l'adresse du dirigeant d'une entreprise d'OP GESTION, est donc VU par OP GESTION. Ce qui compte, c'est qu'il soit RANGÉ
   en « OP MESSAGES » (son tarif est connu d'OP GESTION, ou le nom de son produit contient « messages ») : alors aucune décision d'OP GESTION — payé, formule, places, impayé, suspension — ne le lit.
   Chacune des deux moitiés avait ses bancs et ils étaient justes ; celui-ci fait parler les DEUX VRAIS SERVICES à UN faux Stripe (la leçon de `CLAUDE.md` : « elles ne se parlaient pas ») :

     · le VRAI `server/index.js` d'OP GESTION (config, données et port isolés, 127.0.0.1) dont le `fetch` vers `api.stripe.com` est REDIRIGÉ vers le faux Stripe par un fichier préchargé — le code
       d'OP GESTION n'est pas touché d'une ligne ; le VRAI service d'OP MESSAGES, qui fait payer une personne par la VRAIE route, contre le même faux Stripe ;
     · chaque entreprise d'OP GESTION partage son adresse avec un dirigeant d'OP MESSAGES : c'est la situation qui pose le problème ;
     · pour chaque état que Stripe peut dire d'un abonnement Messages Pro (active, trialing, past_due, unpaid, incomplete, paused, canceled), la réponse COMPLÈTE de `/api/espaces/etat` — ce que
       l'application d'une entreprise OBÉIT — est comparée, mot pour mot, à celle d'AVANT que l'abonnement existe. Cinq entreprises : payée par sa référence, payée par son adresse seule (un
       abonnement d'avant la référence), en impayé, sans rien de payé, fiche « Gratuit » d'avant ;
     · ⛔ « avant » ne se lit pas dans le vide : la dernière page de la liste qu'OP GESTION a lue contenait l'abonnement DANS l'état jugé (sans quoi l'égalité serait vraie de n'importe quoi), et les
       réponses d'avant sont différentes entre elles (payée, payée autrement, suspendue) ;
     · le sens inverse : OP MESSAGES ne liste jamais les abonnements du compte, ne lit que ceux que SA session désigne, et un abonnement d'OP GESTION à la même adresse ne le rend ni abonné ni bloqué ;
     · ⛔ LE PLAFOND, PARTAGÉ : OP GESTION ne lit que 1 000 abonnements (10 pages de 100, résiliés compris) et refuse de décider sur une liste tronquée. Chaque espace de Messages Pro en prend UN dans cette
       limite : le 1 001ᵉ de tout le compte met OP GESTION en « vérification impossible ». Le plafond est LU dans le code d'OP GESTION, pas recopié.

   ⚠️ LIMITE CONNUE, ÉCRITE ICI ET NON DEVINÉE (section 8) : un tarif de Messages Pro INCONNU d'OP GESTION, dont le produit ne contient pas « messages », est lu par OP GESTION comme une ligne d'OP GESTION. Le
   banc mesure ce que cela fait, état par état, et le fige : si OP GESTION change, il tombe, et dit quoi retirer. `configurer-stripe.js` en prévient (test-963) ; `INSTALLER-LE-SERVEUR.md` dit le geste.

   Rien ne sort d'ici : 127.0.0.1, un faux Stripe, des entreprises et des adresses fictives. Il saute de lui-même sans `server/node_modules` (comme test-904) : rien à lancer. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const { fauxStripe } = require('./outils-stripe');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

if (!fs.existsSync(path.join(T.RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const dort = T.dort;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');

/* Des valeurs de banc : des lettres hors de [0-9a-f], aucune ne ressemble à une clé réelle. */
const CLE_OG = ['sk', 'de', 'banc', 'CoutureNeufCinq'].join('_');           // la clé d'OP GESTION (entière, comme en service)
const CLE_MSG = ['rk', 'test', 'BancCoutureZzQq9X'].join('_');              // celle d'OP MESSAGES (restreinte)
const AUTH_OG = 'Bearer ' + CLE_OG, AUTH_MSG = 'Bearer ' + CLE_MSG;
/* trois tarifs que le compte de Stripe pourrait porter pour Messages Pro : l'un est connu d'OP GESTION (ses `msgpro`, lus dans son code), l'autre ne l'est pas mais son produit s'appelle « messages »,
   le troisième (et son jumeau annuel) ne l'est pas et son produit ne dit rien */
const PRIX_NOMME = 'price_BancMessagesNommeAa01', PRIX_INCONNU = 'price_BancProMensuelBb02', PRIX_INCONNU2 = 'price_BancProAnnuelCc03';

/* ══ CE QUE LE CODE D'OP GESTION DIT — lu, pas recopié ══════════════════════════════════════════════════════════════════════════════════════════════ */
const SRC = fs.readFileSync(path.join(T.RACINE, 'server', 'index.js'), 'utf8');
const prixDe = (k) => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
const P = { pro: prixDe('pro'), business: prixDe('business'), premium: prixDe('premium'), msgpro: prixDe('msgpro') };
const iBruts = SRC.indexOf('async function stripeAbosBruts(');
const corpsBruts = iBruts > 0 ? SRC.slice(iBruts, iBruts + 3500) : '';
const nPages = +((/\+\+pages\s*<\s*(\d+)/.exec(corpsBruts) || [])[1] || 0), parPage = +((/limit=(\d+)/.exec(corpsBruts) || [])[1] || 0);
const PLAFOND = nPages * parPage;

console.log('\n── 965 · la couture : un abonnement d\'OP MESSAGES ne change jamais ce qu\'OP GESTION décide ──');
console.log('Ce que le code d\'OP GESTION dit (lu dans son fichier, pas recopié)');
vrai('(population) les tarifs de formule et ceux d\'OP MESSAGES d\'OP GESTION sont lus', Object.values(P).every(x => /^price_/.test(x || '')));
vrai('(population) le plafond de la liste est lu : ' + nPages + ' pages de ' + parPage + ' = ' + PLAFOND + ' abonnements', nPages >= 1 && parPage === 100 && PLAFOND >= 100);
vrai('(population) une ligne est « OP MESSAGES » pour OP GESTION par son TARIF connu OU par « messages » dans le nom de son produit — la règle que ce banc éprouve existe encore',
  /const ligneMessages = [^\n]*STRIPE_PRIX_MESSAGES\.includes\([^\n]*\/messages\/i/.test(SRC));
if (!Object.values(P).every(x => /^price_/.test(x || '')) || !PLAFOND) { console.log('\n' + 0 + ' ✓  1 ✗'); process.exit(1); }

/* ══ LES ENTREPRISES D'OP GESTION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
const MAINT = Date.now();
const cree = Math.floor(MAINT / 1000) - 3600;          // après la bascule des places (posée au 1er janvier 2026 pour le banc)
const mail = (k) => 'dirigeant-' + k + '@exemple-965.fr';
const KINDS = ['paie', 'ancien', 'imp', 'nue', 'gra'];
const ENT = {
  paie:   { formule: 'premium',  og: { statut: 'active',   prix: P.premium,  q: 2, ref: true  } },   // paie Business Premium × 2, abonnement GRAVÉ à son identifiant
  ancien: { formule: 'business', og: { statut: 'active',   prix: P.business, q: 2, ref: false } },   // paie Business × 2, abonnement d'AVANT la référence : retrouvé par l'ADRESSE seule
  imp:    { formule: 'premium',  og: { statut: 'past_due', prix: P.premium,  q: 1, ref: true  } },   // carte refusée
  nue:    { formule: 'premium',  og: null },                                                          // rien de payé
  gra:    { formule: 'gratuit',  og: null },                                                          // fiche « Gratuit » d'avant, rien de payé
};
for (const k of KINDS) ENT[k].t = 't-' + k + '-965';
const ETATS = ['active', 'trialing', 'active', 'past_due', 'unpaid', 'active', 'incomplete', 'active', 'paused', 'active', 'canceled'];
const FORMULES_MSG = ['pro', 'pro', 'pro', 'pro', 'pro', 'pro', 'perso', 'pro', 'perso', 'pro', 'perso'];   // ce que MESSAGES en conclut, état par état (le sursis de sept jours compris)
const FORME_B = (j) => j.ok === true && j.paye === false && j.suspendu === true && j.sursisJours === 0 && !('formule' in j) && !('places' in j) && j.motif === 'accès suspendu';

/* Ce qui diffère entre deux réponses d'OP GESTION : champ par champ, `null` si elles sont identiques. */
const diff = (a, b) => { const d = {}; for (const k of new Set([].concat(Object.keys(a || {}), Object.keys(b || {})))) if (JSON.stringify((a || {})[k]) !== JSON.stringify((b || {})[k])) d[k] = [(a || {})[k], (b || {})[k]]; return Object.keys(d).length ? d : null; };

(async () => {
  const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-965-'));
  const processus = [], services = [];
  let F = null, og = null;
  const nettoyer = () => { for (const p of processus) { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } } try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } };
  process.on('exit', nettoyer);

  try {
    F = await fauxStripe({ prix: [P.msgpro, PRIX_NOMME, PRIX_INCONNU, PRIX_INCONNU2] });
    /* les tarifs du compte et le NOM de leur produit (ce que `expand[]=data.items.data.price.product` montre à OP GESTION) */
    const produit = (id, nom) => ({ id, object: 'product', name: nom });
    F.poserTarif(P.pro, { product: produit('prod_og_pro', 'OP GESTION Pro') });
    F.poserTarif(P.business, { product: produit('prod_og_business', 'OP GESTION Business') });
    F.poserTarif(P.premium, { product: produit('prod_og_premium', 'OP GESTION Business Premium') });
    F.poserTarif(P.msgpro, { product: produit('prod_og_msgpro', 'Abonnement Pro') });                          // un nom NEUTRE : reconnu par son seul identifiant
    F.poserTarif(PRIX_NOMME, { product: produit('prod_msg_nomme', 'OP MESSAGES Pro (par place)') });          // inconnu d'OP GESTION, mais le produit dit « messages »
    F.poserTarif(PRIX_INCONNU, { product: produit('prod_msg_sans', 'Pro mensuel') });                           // inconnu d'OP GESTION, et le produit ne dit rien
    F.poserTarif(PRIX_INCONNU2, { product: produit('prod_msg_sans', 'Pro mensuel') });

    /* ── les données d'OP GESTION : l'annuaire et, chez Stripe, l'abonnement de chaque entreprise ── */
    const dossierOg = path.join(banc, 'og'), D = path.join(dossierOg, 'data');
    fs.mkdirSync(D, { recursive: true });
    const annuaire = {};
    for (const k of KINDS) {
      const e = ENT[k];
      annuaire[k] = { t: e.t, nom: 'Banc ' + k, email: mail(k), ts: MAINT - 1000, formule: e.formule, quantite: 1, formuleTs: MAINT - 1000, formulePar: 'Banc' };
      if (!e.og) continue;
      F.poser({ id: 'sub_og_' + k, object: 'subscription', status: e.og.statut, created: cree, metadata: e.og.ref ? { espace: e.t, compte: mail(k) } : {},
        customer: { id: 'cus_og_' + k, object: 'customer', email: mail(k) }, cancel_at_period_end: false, current_period_end: Math.floor(MAINT / 1000) + 20 * 86400,
        items: { object: 'list', data: [{ id: 'si_og_' + k, quantity: e.og.q, price: { id: e.og.prix, object: 'price', product: 'prod_og_' + k } }] } });
    }
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(annuaire));
    /* le fichier préchargé : TOUT ce qu'OP GESTION adresse à `https://api.stripe.com/` part vers le faux Stripe, au même chemin et avec les mêmes en-têtes */
    const PRECHARGE = path.join(banc, 'vers-le-faux-stripe.js');
    fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch;
globalThis.fetch = function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  return vrai.call(this, ${JSON.stringify('http://' + F.hote)} + u.slice('https://api.stripe.com'.length), opts);
};\n`);

    /* ── le VRAI serveur d'OP GESTION (redémarrable : sa mémoire de la liste de Stripe est celle d'un processus) ── */
    const webpush = require(path.join(T.RACINE, 'server', 'node_modules', 'web-push'));
    const vap = webpush.generateVAPIDKeys();
    fs.writeFileSync(path.join(dossierOg, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha('mot-de-la-tour-965'), stripe: { secretKey: CLE_OG } }));
    /* `ttl` : combien de temps OP GESTION garde la liste de Stripe (en service : cinq minutes). Le banc la relit à CHAQUE réponse en attendant un peu plus que cela entre deux appels. ⛔ Pas 1 ms : OP GESTION
       dit « liste périmée » (donc ne décide pas, ou n'annonce pas les options) quand sa lecture a plus que ce délai au moment de répondre — avec 1 ms, la moindre lenteur de la machine suffisait à changer la réponse. */
    async function demarrerOG({ ttl = 40 } = {}) {
      const port = await T.portLibre();
      let journal = '';
      const debut = F.listes.length;                          // les pages servies à CE processus seulement (un OP GESTION redémarré repart de zéro) — dès son démarrage : il lit la liste avant qu'on lui parle
      const enfant = spawn(process.execPath, ['--require', PRECHARGE, path.join(T.RACINE, 'server', 'index.js')], {
        env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(dossierOg, 'config.json'), TEAMOP_DATA: D, PORT: String(port), TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'),
          TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z', TEAMOP_STRIPE_CACHE_MS: String(ttl), TEAMOP_STRIPE_IMPAYE_MS: String(ttl) }), stdio: ['ignore', 'pipe', 'pipe'] });
      processus.push(enfant);
      enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
      const base = 'http://127.0.0.1:' + port;
      const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 15000, 100);
      if (!vivant) { try { enfant.kill('SIGKILL'); } catch (e) { /* rien */ } throw new Error('OP GESTION n\'a pas démarré\n' + journal.slice(0, 800)); }
      const og = { base, journal: () => journal, tuer: () => { try { enfant.kill('SIGKILL'); } catch (e) { /* déjà parti */ } } };
      /* chaque appel part d'un « bureau » différent (derrière nginx, OP GESTION lit l'adresse de l'appelant dans X-Forwarded-For) : le budget global de 120 requêtes par minute et par adresse n'est pas ce que ce banc mesure */
      let bureau = 0;
      og.appel = async (route, corps) => {
        const r = await fetch(base + route, { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': '198.51.100.' + (1 + (bureau++ % 250)) }, body: JSON.stringify(corps) });
        let j = null; try { j = await r.json(); } catch (e) { /* illisible */ }
        return { code: r.status, j: j || {} };
      };
      /* ⛔ un état FRAIS : la liste de Stripe est relue pour CETTE réponse (le cache d'OP GESTION est réglé court ; on le vérifie au faux Stripe plutôt que de le croire) */
      og.listes = () => F.listes.slice(debut).filter(l => l.auth === AUTH_OG);
      og.derniereListe = () => og.listes().slice(-1)[0] || null;
      /* ⚠️ Une réponse « vérification impossible », ou « payée » sans le champ `options`, est ce qu'OP GESTION dit d'une liste qu'il juge PÉRIMÉE (plus vieille que son cache au moment de répondre) : sur
         une machine qui rame entre la fin de la lecture et la réponse, elle se produit sans que rien soit faux. Aucune des entreprises de ce banc n'est dans le doute — on repose la question (une lecture
         neuve) au lieu de comparer ce qui n'est pas une décision. Une VRAIE différence, elle, revient à chaque essai et reste dite : au sixième essai le banc s'arrête en la montrant. */
      const nonDecide = (j) => j.verificationImpossible === true || (j.paye === true && !('options' in j));
      og.etatFrais = async (k) => {
        let derniere = null, essais = 0;
        for (let i = 0; i < 60; i++) {
          const avant = og.listes().length;
          await dort(ttl + 10);
          const r = await og.appel('/api/espaces/etat', { t: ENT[k].t });
          derniere = r;
          if (og.listes().length > avant) {
            if (!nonDecide(r.j) || ++essais >= 6) return r.j;
            continue;
          }
          await dort(10);
        }
        throw new Error('OP GESTION n\'a pas relu la liste de Stripe pour ' + k + ' (dernière réponse : ' + JSON.stringify(derniere) + ' ; pages servies : ' + og.listes().length + ')');
      };
      return og;
    }
    og = await demarrerOG();
    vrai('le VRAI serveur d\'OP GESTION démarre, isolé, avec une clé Stripe (celle du banc) — son Stripe est redirigé vers le faux, rien ne sort de la machine', (await (await fetch(og.base + '/health')).json()).stripe === true);

    /* ── le VRAI service d'OP MESSAGES, deux fois : un tarif connu d'OP GESTION (A), un tarif qu'il ne connaît pas (B) ── */
    const cfgMsg = (prix) => ({ formule: { toutOuvert: false }, facturation: { cle: CLE_MSG, prix, affichage: { mensuel: 15, annuel: 150 }, relectureMs: 3600000, timeoutMs: 3000 },
      quotas: { relire: { max: 1000, fenetreMs: 10000 }, paiement: { max: 1000, fenetreMs: 3600000 } } });
    const svcA = await T.lancerService({ config: cfgMsg({ mensuel: P.msgpro, annuel: PRIX_NOMME }), env: { OPMSG_TEST_STRIPE: F.hote } });
    services.push(svcA);
    const svcB = await T.lancerService({ config: cfgMsg({ mensuel: PRIX_INCONNU, annuel: PRIX_INCONNU2 }), env: { OPMSG_TEST_STRIPE: F.hote } });
    services.push(svcB);
    const monde = (svc) => {
      const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
      const M = { svc, S, gens: {}, clients: {}, espaces: {} };
      for (const k of KINDS) {
        /* le dirigeant d'OP MESSAGES : un compte à l'adresse CONFIRMÉE de l'entreprise d'OP GESTION — c'est cette adresse que le service envoie à Stripe, et OP GESTION qui la lit */
        M.gens[k] = S.personneCreer({ identifiant: mail(k), prenom: 'Dirigeant', nom: k, origine: 'compte', verifie: true });
        const c = T.client(svc.base); const j = jeton();
        S.sessionAjouter({ h: sha(j), personne: M.gens[k].id, appareil: null, ttlMs: 86400000 }); c.poserCookie(j);
        M.clients[k] = c;
      }
      return M;
    };
    const MA = monde(svcA), MB = monde(svcB);
    const form = (appel) => Object.fromEntries(appel.paires);
    const sousMessages = new Set();                    // chaque abonnement que le service d'OP MESSAGES a fait naître (la contre-épreuve du sens inverse)
    /* un dirigeant PAIE Messages Pro, par la vraie route, puis « paie » chez le faux Stripe : l'abonnement qui naît est celui que le service a DEMANDÉ */
    async function payerPro(M, k, cycle, places = 2) {
      const cle = k + ':' + cycle;
      if (!M.espaces[cle]) M.espaces[cle] = M.S.espaceCreer({ nom: 'Entreprise ' + k + ' ' + cycle, proprio: M.gens[k].id }).id;
      const id = M.espaces[cle], cli = M.clients[k];
      const r = await cli.post('/api/espaces/' + id + '/facturation/paiement', { places, cycle });
      if (r.code !== 201) throw new Error('le paiement de ' + k + ' est refusé : ' + r.code + ' ' + r.txt);
      const sb = F.payer(F.derniereSession().id, { statut: 'active' });
      sousMessages.add(sb.id);
      const rl = await cli.post('/api/espaces/' + id + '/facturation/relire', {});
      return { id, sb, rl, cli };
    }

    /* ═══ 1. AVANT : ce qu'OP GESTION décide de chaque entreprise sans aucun abonnement d'OP MESSAGES ══════════════════════════════════════════════════ */
    console.log('\nAvant tout abonnement d\'OP MESSAGES : ce qu\'OP GESTION décide de chaque entreprise');
    const base = {};
    for (const k of KINDS) base[k] = await og.etatFrais(k);
    const l0 = og.derniereListe();
    vrai('(population) OP GESTION a lu la liste du faux Stripe — trois abonnements à lui, aucun d\'OP MESSAGES — et la décision en dépend', !!l0 && Object.keys(l0.statuts).sort().join() === 'sub_og_ancien,sub_og_imp,sub_og_paie');
    vrai('(population) paie — payée Business Premium, avec ses places', base.paie.paye === true && base.paie.formule === 'premium' && Number.isInteger(base.paie.places) && base.paie.places >= 2 && base.paie.suspendu === false);
    vrai('(population) ancien — payée Business, retrouvée par son adresse seule', base.ancien.paye === true && base.ancien.formule === 'business' && Number.isInteger(base.ancien.places) && base.ancien.places >= 2);
    vrai('(population) imp, nue, gra — suspendues (la forme sans formule, que l\'application grise sans rien écrire)', FORME_B(base.imp) && FORME_B(base.nue) && FORME_B(base.gra));
    vrai('(population) les réponses d\'avant sont DIFFÉRENTES entre elles : une égalité plus bas ne peut pas être celle d\'un banc qui regarde partout la même chose',
      new Set([JSON.stringify(base.paie), JSON.stringify(base.ancien), JSON.stringify(base.imp)]).size === 3 && JSON.stringify(base.imp) === JSON.stringify(base.nue));

    /* ═══ 2. LES SEPT ÉTATS D'UN ABONNEMENT MESSAGES PRO, PAR UN TARIF CONNU D'OP GESTION ══════════════════════════════════════════════════════════════ */
    /* Un dirigeant paie Messages Pro ; l'abonnement traverse tous les états que Stripe peut dire ; après CHACUN, la réponse complète d'OP GESTION est comparée à celle d'avant. */
    async function derouler(ogx, M, k, cycle) {
      const { id, sb, cli } = await payerPro(M, k, cycle);
      const ecarts = [], vus = [], cote = [];
      for (const st of ETATS) {
        F.statut(sb.id, st);
        const rl = await cli.post('/api/espaces/' + id + '/facturation/relire', {});
        const ap = await ogx.etatFrais(k);
        vus.push((ogx.derniereListe() || { statuts: {} }).statuts[sb.id] || null);
        const d = diff(base[k], ap); if (d) ecarts.push([st, d]);
        cote.push(rl.j && rl.j.formule);
      }
      F.oublier(sb.id);
      return { id, sb, ecarts, vus, cote, retour: diff(base[k], await ogx.etatFrais(k)) };
    }
    const NOM = { paie: 'payée par sa référence', ancien: 'payée par son adresse seule', imp: 'en impayé', nue: 'sans rien de payé', gra: 'fiche « Gratuit »' };
    console.log('\nLes états d\'un abonnement Messages Pro, son tarif CONNU d\'OP GESTION (ses `msgpro`) : la réponse d\'OP GESTION ne change pas d\'un mot');
    let premier = true;
    for (const k of KINDS) {
      const r = await derouler(og, MA, k, 'mensuel');
      if (premier) {
        premier = false;
        const f1 = form(F.dernier('POST', /^\/v1\/checkout\/sessions$/));
        v('(population) le paiement part avec l\'ADRESSE de la personne — celle de l\'entreprise d\'OP GESTION — et la référence de SON espace ; le tarif est un `msgpro` d\'OP GESTION', [f1.customer_email, /^opmsg:e_/.test(f1.client_reference_id), f1['line_items[0][price]'] === P.msgpro], [mail(k), true, true]);
      }
      v('⛔ ' + k + ' (' + NOM[k] + ') — pour AUCUN des ' + ETATS.length + ' états la réponse d\'OP GESTION ne diffère de celle d\'avant', r.ecarts, []);
      v('      OP GESTION a VU l\'abonnement dans chacun des états (sans cela l\'égalité ne prouverait rien)', r.vus, ETATS);
      v('      côté Messages le même abonnement : Pro payé, Pro en sursis (retard), Perso quand il ne paie plus', r.cote, FORMULES_MSG);
      v('      l\'abonnement oublié par Stripe : la réponse d\'OP GESTION est celle d\'avant, mot pour mot', r.retour, null);
    }

    /* ═══ 3. LE MÊME PAR UN TARIF QUE LE COMPTE NE DÉCLARE PAS À OP GESTION, MAIS DONT LE PRODUIT S'APPELLE « MESSAGES » ═════════════════════════════════ */
    console.log('\nLe même, par un tarif INCONNU d\'OP GESTION dont le produit s\'appelle « OP MESSAGES Pro » : reconnu par le NOM du produit');
    for (const k of KINDS) {
      const r = await derouler(og, MA, k, 'annuel');
      v('⛔ ' + k + ' (' + NOM[k] + ') — aucun des ' + ETATS.length + ' états ne change la réponse d\'OP GESTION', [r.ecarts, r.vus, r.retour], [[], ETATS, null]);
    }

    /* ═══ 4. L'ABONNEMENT D'OP GESTION EST LE PLUS RÉCENT DE LA LISTE (Stripe liste du plus récent au plus ancien) ════════════════════════════════════════ */
    console.log('\nL\'ordre de la liste : l\'abonnement d\'OP GESTION est le plus RÉCENT, celui de Messages le suit — la même réponse');
    {
      const sbOg = F.abonnements.get('sub_og_ancien');
      sbOg.created = Math.floor(Date.now() / 1000) + 3600;
      const r = await derouler(og, MA, 'ancien', 'mensuel');
      sbOg.created = cree;
      v('⛔ ancien (payée par son adresse seule) — l\'abonnement trouvé EN PREMIER par l\'adresse est celui d\'OP GESTION : aucun état ne change la réponse', [r.ecarts, r.vus, r.retour], [[], ETATS, null]);
    }

    /* ═══ 5. DEUX ABONNEMENTS MESSAGES PRO EN MÊME TEMPS (deux espaces, un seul dirigeant) ════════════════════════════════════════════════════════════ */
    console.log('\nDeux abonnements Messages Pro à la même adresse, en même temps');
    {
      const CAS = [['les deux actifs', ['active', 'active']], ['l\'un en retard', ['past_due', 'active']], ['les deux en retard', ['past_due', 'unpaid']], ['l\'un résilié', ['canceled', 'active']], ['les deux inachevés', ['incomplete', 'incomplete']]];
      for (const k of KINDS) {
        const a = await payerPro(MA, k, 'mensuel'), b = await payerPro(MA, k, 'annuel');
        const ecarts = [], vus = [];
        for (const [nom, [sa, sb2]] of CAS) {
          F.statut(a.sb.id, sa); F.statut(b.sb.id, sb2);
          const ap = await og.etatFrais(k);
          const l = og.derniereListe();
          vus.push([l.statuts[a.sb.id], l.statuts[b.sb.id]]);
          const d = diff(base[k], ap); if (d) ecarts.push([nom, d]);
        }
        F.oublier(a.sb.id); F.oublier(b.sb.id);
        v('⛔ ' + k + ' (' + NOM[k] + ') — cinq combinaisons de deux abonnements Messages : la réponse d\'OP GESTION ne bouge pas, et les deux abonnements y étaient dans l\'état jugé',
          [ecarts, vus, diff(base[k], await og.etatFrais(k))], [[], CAS.map(c => c[1]), null]);
      }
    }

    /* ═══ 6. LE SENS INVERSE : OP MESSAGES NE VOIT PAS LES ABONNEMENTS D'OP GESTION ═══════════════════════════════════════════════════════════════════ */
    console.log('\nLe sens inverse : OP MESSAGES ne lit que les abonnements que SA session désigne');
    {
      const k = 'paie', cli = MA.clients[k];
      const Er = MA.S.espaceCreer({ nom: 'Sans paiement', proprio: MA.gens[k].id }).id;
      const avant = F.appels.length;
      const rl = await cli.post('/api/espaces/' + Er + '/facturation/relire', { abonnement: 'sub_og_' + k, subscription: 'sub_og_' + k, session: 'cs_bancInconnue', customer: 'cus_og_' + k });
      const et = await cli.get('/api/espaces/' + Er + '/facturation/etat');
      v('⛔ un abonnement d\'OP GESTION payé à la MÊME adresse ne rend pas l\'espace d\'OP MESSAGES abonné — même si le corps de la requête le nomme : Perso, aucun abonnement, et Stripe n\'a reçu aucune lecture',
        [rl.code, et.j.formule, et.j.abonnement, F.appels.slice(avant).filter(a => a.auth === AUTH_MSG).length], [200, 'perso', null, 0]);
      const pa = await cli.post('/api/espaces/' + Er + '/facturation/paiement', { places: 1, cycle: 'mensuel' });
      v('… et il ne le BLOQUE pas non plus : l\'espace peut payer (une session neuve, pas de 409 « déjà abonné » à cause de l\'abonnement d\'OP GESTION)', [pa.code, pa.j.error === undefined, /^https:\/\/checkout\.stripe\.test\//.test(pa.j.url || '')], [201, true, true]);
      const aMsg = F.appels.filter(a => a.auth === AUTH_MSG), aOg = F.appels.filter(a => a.auth === AUTH_OG);
      vrai('(population) le faux Stripe a reçu beaucoup d\'appels des DEUX services, reconnus à leur clé', aMsg.length > 100 && aOg.length > 50);
      v('⛔ OP MESSAGES ne LISTE jamais les abonnements du compte (il lit une session, puis l\'abonnement qu\'elle désigne : jamais « tous »)', aMsg.filter(a => a.m === 'GET' && a.chemin === '/v1/subscriptions').length, 0);
      const lus = aMsg.filter(a => a.m === 'GET' && /^\/v1\/subscriptions\/[^/]+$/.test(a.chemin)).map(a => decodeURIComponent(a.chemin.split('/').pop()));
      vrai('(population) OP MESSAGES a lu des abonnements un par un', lus.length > 40);
      v('⛔ chacun de ces abonnements est un de CEUX QU\'IL A FAIT NAÎTRE — jamais l\'un des trois d\'OP GESTION', lus.filter(id => !sousMessages.has(id)), []);
      v('⛔ et la clé restreinte d\'OP MESSAGES ne sert qu\'à lire des sessions et des abonnements, en créer une, ouvrir un portail — rien d\'autre (pas d\'écriture sur un abonnement)',
        aMsg.filter(a => !(a.m === 'POST' && a.chemin === '/v1/checkout/sessions') && !(a.m === 'GET' && /^\/v1\/(checkout\/sessions|subscriptions)\/[^/]+$/.test(a.chemin)) && !(a.m === 'POST' && a.chemin === '/v1/billing_portal/sessions')).map(a => a.m + ' ' + a.chemin), []);
      v('⛔ OP GESTION, lui, ne fait que LIRE la liste (aucun POST chez Stripe en répondant à l\'application)', aOg.filter(a => !(a.m === 'GET' && a.chemin === '/v1/subscriptions')).map(a => a.m + ' ' + a.chemin), []);
      vrai('   (population) ses lectures demandent le client et le produit des lignes — c\'est ainsi qu\'il range une ligne en « OP MESSAGES »', aOg.every(a => /expand%5B%5D=data\.customer|expand\[\]=data\.customer/.test(a.requete) && /data\.items\.data\.price\.product/.test(decodeURIComponent(a.requete))));
    }

    /* ═══ 7. LE PLAFOND DE 1 000 ABONNEMENTS, PARTAGÉ ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLe plafond de ' + PLAFOND + ' abonnements : chaque espace de Messages Pro en prend un dans la limite d\'OP GESTION');
    {
      og.tuer();                                                    // la mémoire de la liste est celle d'un processus : un OP GESTION neuf la lit à froid
      for (const id of Array.from(F.abonnements.keys())) if (sousMessages.has(id)) F.oublier(id);
      for (let i = F.abonnements.size; i < PLAFOND; i++) F.poser({ id: 'sub_ancien_rempli_' + i, object: 'subscription', status: 'canceled', created: cree - 1000 - i, metadata: {}, customer: 'cus_rempli',
        cancel_at_period_end: false, current_period_end: cree, items: { object: 'list', data: [{ id: 'si_r' + i, quantity: 1, price: { id: P.pro, object: 'price', product: 'prod_og_pro' } }] } });
      og = await demarrerOG({ ttl: 5000 });        // une seule lecture à froid : la liste de 1 000 abonnements n'a pas à se relire pour que la réponse soit celle qu'on compare
      const plein = (await og.appel('/api/espaces/etat', { t: ENT.paie.t })).j;
      const lus = new Set(); for (const l of og.listes()) for (const id of Object.keys(l.statuts)) lus.add(id);
      v('population : le compte porte EXACTEMENT ' + PLAFOND + ' abonnements, résiliés compris — OP GESTION les a TOUS lus (' + nPages + ' pages) et décide comme avant', [F.abonnements.size, lus.size, diff(base.paie, plein)], [PLAFOND, PLAFOND, null]);
      /* le mille-et-unième : un dirigeant paie Messages Pro (la vraie route) */
      og.tuer();
      const tip = await payerPro(MA, 'paie', 'mensuel');
      v('le mille-et-unième abonnement du compte est celui d\'un espace de Messages Pro — payé par la vraie route', [F.abonnements.size, F.abonnements.has(tip.sb.id), tip.rl.j.formule], [PLAFOND + 1, true, 'pro']);
      og = await demarrerOG({ ttl: 5000 });
      const reps = {};
      for (const k of KINDS) reps[k] = (await og.appel('/api/espaces/etat', { t: ENT[k].t })).j;
      v('⛔ UN SEUL abonnement de trop, et OP GESTION ne décide plus rien : « vérification impossible » pour TOUTES les entreprises — ni formule, ni suspension (l\'application garde ce qu\'elle savait)',
        KINDS.map(k => [k, reps[k].verificationImpossible === true && !('formule' in reps[k]) && !('paye' in reps[k]) && reps[k].suspendu === false]), KINDS.map(k => [k, true]));
      vrai('   et il le DIT dans son journal : la liste est tronquée au plafond (ce n\'est pas une panne muette)', /liste Stripe TRONQUÉE au plafond/.test(og.journal()));
      og.tuer();
    }

    /* ═══ 8. ⚠️ LIMITE CONNUE : UN TARIF INCONNU D'OP GESTION, DONT LE PRODUIT NE DIT PAS « MESSAGES » ═══════════════════════════════════════════════════ */
    console.log('\n⚠️ LIMITE CONNUE — un tarif de Messages Pro inconnu d\'OP GESTION, produit sans « messages » : mesurée, figée, dite par l\'outil de configuration');
    {
      // le compte revient à ses trois abonnements d'OP GESTION (le mille-et-unième et les résiliés partent)
      for (const [id] of Array.from(F.abonnements.entries())) if (!/^sub_og_/.test(id)) F.oublier(id);
      og = await demarrerOG();
      const bas = {}; for (const k of KINDS) bas[k] = diff(base[k], await og.etatFrais(k));
      v('(population) le compte est revenu à ses trois abonnements d\'OP GESTION : les réponses d\'avant sont celles d\'avant', bas, { paie: null, ancien: null, imp: null, nue: null, gra: null });
      const changent = {}, servi = {};
      for (const k of KINDS) {
        const r = await derouler(og, MB, k, 'mensuel');
        changent[k] = r.ecarts.map(e => e[0]).filter((x, i, t) => t.indexOf(x) === i);
        const d = r.ecarts.length ? r.ecarts[0][1] : null;               // ce que la première réponse qui change dit de plus : la formule servie et ses places
        servi[k] = d ? [(d.formule || [])[1] || null, (d.places || [])[1] || null, (d.paye || [])[1] === true] : null;
        v('      ' + k + ' : OP GESTION a bien VU l\'abonnement dans chacun des états, et — oublié de Stripe — la réponse redevient celle d\'avant', [r.vus, r.retour], [ETATS, null]);
      }
      const LEVEE = ' (si ceci tombe parce qu\'OP GESTION range désormais ce cas : la limite est levée — retirer cette section, la phrase « produit sans messages » de INSTALLER-LE-SERVEUR.md et l\'avertissement de configurer-stripe.js)';
      v('⚠️ LIMITE CONNUE : un tarif inconnu d\'OP GESTION, produit sans « messages », est lu COMME UN PAIEMENT D\'OP GESTION — une entreprise qui ne paie rien d\'OP GESTION (en impayé, jamais abonnée, fiche « Gratuit ») est SERVIE tant que cet abonnement est actif ou d\'essai, et jamais autrement' + LEVEE,
        changent, { paie: [], ancien: [], imp: ['active', 'trialing'], nue: ['active', 'trialing'], gra: ['active', 'trialing'] });
      v('⚠️ … servie au rang de sa fiche (Business Premium), Pro quand la fiche n\'a pas de formule, pour UNE place — et un impayé d\'OP GESTION en est levé' + LEVEE,
        servi, { paie: null, ancien: null, imp: ['premium', 1, true], nue: ['premium', 1, true], gra: ['pro', 1, true] });
      v('⚠️ mais ce n\'est JAMAIS une coupure : une entreprise qui paie OP GESTION (par sa référence, par son adresse) garde sa réponse, quel que soit l\'état de l\'abonnement mal rangé — même en retard ou résilié',
        [changent.paie, changent.ancien], [[], []]);
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    for (const s of services) console.log(s.sortie.texte().slice(-800));
    if (og) console.log('--- journal d\'OP GESTION (fin) ---\n' + og.journal().slice(-1500) + '\n--- dernières pages de la liste servies à OP GESTION ---\n' + JSON.stringify(F.listes.slice(-3)).slice(0, 1200));
    process.exitCode = 1;
  }
  for (const s of services) { try { await s.arreter(); } catch (e) { /* déjà arrêté */ } }
  try { await F.fermer(); } catch (e) { /* déjà fermé */ }
  nettoyer();
  fin();
})();
