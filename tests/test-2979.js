/* ⛔ CE QUE CE FICHIER GARDE — LE SERVEUR DE TEST NE TOUCHE NI À LA CLÉ DE PRODUCTION, NI AU SITE DE PRODUCTION (23 octobre 2026, relecture adverse de l'espace de test).

   Deux défauts que les cinq autres bancs de l'espace de test ne voyaient pas, parce qu'ils masquaient la configuration que l'installeur produira :
     A. LA CLÉ D'ADMINISTRATION FIREBASE. `index.js` lisait `TEAMOP_FB_ADMIN || '/opt/teamop/firebase-admin.json'` : « ne pas définir la variable » dans l'unité du
        serveur de test, c'était charger la clé de PRODUCTION (fiches de vrais clients, coupure de sessions, jetons signés pour `elan-gestion`) derrière un `/api/` joignable
        d'Internet. Le banc commun posait toujours `TEAMOP_FB_ADMIN` sur un fichier absent : il ne rejouait jamais ce cas. Ici une sonde préchargée dans le VRAI serveur
        redirige le chemin de production vers un fichier-sentinelle et NOTE chaque tentative de lecture :
          · production (sans `espaceTest`), variable absente : le chemin est lu, la clé est chargée (`cleAdmin: true`) — la CONTRE-ÉPREUVE, sans elle « jamais lu » ne prouverait rien ;
          · test (`espaceTest`), variable absente : le chemin n'est JAMAIS lu, `cleAdmin: false`, aucune route Firebase ne répond autrement que `firebase_off` ;
          · test, variable posée exprès : la clé de test est chargée (une clé de test reste possible, mais seulement voulue).
     B. LES ADRESSES QUE LE SERVEUR RENDS. `success_url` / `cancel_url` du paiement Stripe, le lien d'un espace (`/api/espaces/lien`) étaient écrits en `https://teamop.fr` : payer en
        test (carte 4242) ramenait le client sur la PRODUCTION, la Tour de test offrait le lien d'une application où l'espace n'existe pas. Le faux Stripe, préchargé, garde le corps du
        POST /v1/checkout/sessions : en test les deux adresses sont sur l'origine de test, en production elles sont sur teamop.fr (au caractère près, comme avant).
   Le vrai serveur, 127.0.0.1, un Stripe simulé DANS le processus du serveur, des comptes fictifs. Jamais `api.teamop.fr`, jamais le vrai Stripe. */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), os = require('os');
const B2 = require('./banc-essais');
const { RACINE, dormir, attendre } = B2;
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const vivants = [];
const fin = () => { for (const s of vivants) { try { s.enfant() && s.enfant().kill('SIGKILL'); } catch (e) {} try { s.smtp.s.close(); } catch (e) {} try { fs.rmSync(s.banc, { recursive: true, force: true }); } catch (e) {} } };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 150000).unref();
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const CHEMIN_PROD = '/opt/teamop/firebase-admin.json';
const PRIX_PRO = 'price_1TwV4RFKFKIrVWLDfGwAHMMh';   // le premier tarif Pro de STRIPE_PRIX_FORMULE (celui que la page de paiement envoie)

/* La sonde préchargée : (1) toute lecture du chemin de production est NOTÉE puis redirigée vers une clé-sentinelle ; (2) tout appel à api.stripe.com est gardé et répond au plus court. */
function sondes(dossier) {
  const sentinelle = path.join(dossier, 'sentinelle-fb.json'), lectures = path.join(dossier, 'lectures.log'), stripe = path.join(dossier, 'stripe.log');
  fs.writeFileSync(sentinelle, JSON.stringify({ client_email: 'sentinelle@exemple-essai.invalid', private_key: 'pas-une-vraie-cle' }));
  const pre = path.join(dossier, 'sonde.js');
  fs.writeFileSync(pre, `const fs = require('fs');
const lire = fs.readFileSync;
fs.readFileSync = function (f, ...r) { if (String(f) === ${JSON.stringify(CHEMIN_PROD)}) { fs.appendFileSync(${JSON.stringify(lectures)}, 'lu\\n'); return lire.call(this, ${JSON.stringify(sentinelle)}, ...r); } return lire.call(this, f, ...r); };
const vrai = globalThis.fetch;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (!u.startsWith('https://api.stripe.com/')) return vrai.apply(this, arguments);
  fs.appendFileSync(${JSON.stringify(stripe)}, JSON.stringify({ u, corps: String((opts && opts.body) || '') }) + '\\n');
  const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
  if (u.startsWith('https://api.stripe.com/v1/checkout/sessions')) return json({ id: 'cs_banc_2979', url: 'https://checkout.stripe.com/c/pay/banc-2979' });
  return json({ data: [], has_more: false });
};\n`);
  return { pre, lectures: () => { try { return fs.readFileSync(lectures, 'utf8').split('\n').filter(Boolean).length; } catch (e) { return 0; } },
    sessions: () => { try { return fs.readFileSync(stripe, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)).filter(x => /\/v1\/checkout\/sessions$/.test(x.u)).map(x => new URLSearchParams(x.corps)); } catch (e) { return []; } } };
}

/* Un monde minimal, posé AVANT le démarrage : un compte du portail CONFIRMÉ avec sa session, et une entreprise dont le lien se redemande (`/api/espaces/lien`). */
function monde(D) {
  const MAINT = Date.now(), jeton = crypto.randomBytes(32).toString('hex'), email = 'payeur@exemple-essai.fr', t = 't-banc-2979', k = 'cle-propre-2979';
  fs.writeFileSync(path.join(D, 'comptes-portail.json'), JSON.stringify({ c: { [email]: { v: true, pr: 'Banc', no: 'Essai', so: 'Banc' } }, j: { [sha(jeton)]: { m: email, g: 'session', exp: MAINT + 86400000 } } }));
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ bancessai: { nom: 'Banc essai', t, code: Buffer.from(JSON.stringify({ t, k })).toString('base64'), ts: MAINT - 1000, email: 'autre@exemple-essai.fr', formule: 'pro', quantite: 1 } }));
  return { jeton, t, kh: sha(k) };
}

(async () => {
  console.log('\n── test-2979 : le serveur de test ne touche ni à la clé ni au site de production ──');
  if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) { console.log('  … SAUTÉE : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  const cas = async (nom, o) => {
    const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2979-'));
    const sd = sondes(banc), D = path.join(banc, 'data');
    fs.mkdirSync(D, { recursive: true });
    const m = monde(D);
    const S = await B2.lancer(Object.assign({ banc, dossier: D, requis: [sd.pre], config: { mailPreuveExigee: false, stripe: { secretKey: 'sk_de_banc_2979' } } }, o)); vivants.push(S);
    vrai(nom + ' : le serveur démarre', S.vivant);
    const T = await S.tour();
    const versions = (await S.appel('/api/monitor/version', undefined, T)).j;
    const payer = await S.appel('/api/stripe/checkout', { price: PRIX_PRO, quantity: 1, metier: 'chauffage' }, m.jeton);
    const lien = await S.appel('/api/espaces/lien', { t: m.t, kh: m.kh });
    return { S, sd, versions, payer, lien, m };
  };

  console.log('\nA. La clé d\'administration Firebase');
  const prod = await cas('production', { essai: false, sansFbAdmin: true });
  v('(contre-épreuve) PRODUCTION, variable absente : le chemin de production EST lu, la clé est chargée', [prod.sd.lectures() >= 1, prod.versions.cleAdmin], [true, true]);
  await prod.S.nettoyer();
  const test = await cas('test', { essai: true, sansFbAdmin: true });
  v('⛔ TEST, `TEAMOP_FB_ADMIN` NON posée : le chemin de production n\'est JAMAIS lu, aucune clé chargée (`cleAdmin: false`)', [test.sd.lectures(), test.versions.cleAdmin], [0, false]);
  const rFb = await test.S.appel('/api/mdp/lien', { email: 'quelquun@exemple-essai.fr' });
  v('   et la route qui a besoin de la clé répond `firebase_off` (503), elle ne signe rien', [rFb.s, rFb.j.error], [503, 'firebase_off']);
  await test.S.nettoyer();
  {
    const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2979c-')), sd = sondes(banc), D = path.join(banc, 'data');
    fs.mkdirSync(D, { recursive: true }); monde(D);   // un dossier non vierge : pas de semis, la connexion de la Tour est celle du banc
    const S = await B2.lancer({ essai: true, banc, dossier: D, requis: [sd.pre], env: { TEAMOP_FB_ADMIN: path.join(banc, 'sentinelle-fb.json') }, config: { mailPreuveExigee: false } }); vivants.push(S);
    const T = await S.tour();
    v('   `TEAMOP_FB_ADMIN` posée EXPRÈS en test : la clé de test est chargée (le chemin de production, lui, reste non lu)', [(await S.appel('/api/monitor/version', undefined, T)).j.cleAdmin, sd.lectures()], [true, 0]);
    await S.nettoyer();
  }

  console.log('\nB. Les adresses que le serveur rend');
  const dernier = (c) => c.sd.sessions().slice(-1)[0];
  vrai('(population) en production, une session de paiement est partie chez le faux Stripe (200 et une adresse)', prod.payer.s === 200 && !!prod.payer.j.url && !!dernier(prod));
  v('PRODUCTION : retour de paiement et abandon sont sur teamop.fr, comme avant', [dernier(prod).get('success_url'), dernier(prod).get('cancel_url')], ['https://teamop.fr/merci.html', 'https://teamop.fr/recap-abonnement.html']);
  vrai('(population) en test aussi', test.payer.s === 200 && !!dernier(test));
  v('⛔ TEST : retour de paiement et abandon sont sur l\'ORIGINE DE TEST (une carte 4242 ne ramène pas le client en production)', [dernier(test).get('success_url'), dernier(test).get('cancel_url')], ['https://test.teamop.fr/merci.html', 'https://test.teamop.fr/recap-abonnement.html']);
  v('PRODUCTION : le lien d\'un espace ouvre l\'application de production', [prod.lien.s, /^https:\/\/teamop\.fr\/app\.html#entreprise=/.test(prod.lien.j.lien || '')], [200, true]);
  v('⛔ TEST : le lien d\'un espace ouvre l\'application de TEST', [test.lien.s, /^https:\/\/test\.teamop\.fr\/app\.html#entreprise=/.test(test.lien.j.lien || '')], [200, true]);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
