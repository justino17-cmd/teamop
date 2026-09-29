/* ⛔ CE QUE CE FICHIER GARDE — LE RAPPEL DES SEPT JOURS À UNE ENTREPRISE DÉJÀ ABONNÉE, SUR LE VRAI SERVEUR.

   Justin, 29 septembre 2026 : « oui » à « la facturation démarre à la fin du code ». Payer pendant une période offerte ne
   prélève plus rien avant sa fin (`finEssaiPeriode`) : rien sur le relevé, donc rien qui rappelle au client qu'il a déjà
   payé. `gardien` l'a rejoué : le courriel des sept jours lui mettait sous les yeux « Continuer avec N abonnements » et
   la promesse « rien n'est prélevé avant… » — un second paiement, c'était un second abonnement, prélevé EN DOUBLE à la
   fin de l'essai. Ce qu'on garde ici, en faisant tourner le vrai serveur contre un facteur SMTP de banc ET un Stripe
   simulé DANS son processus (ce qu'on lit est littéralement ce que le serveur lirait chez Stripe) :
     · une entreprise ABONNÉE à OP GESTION (en essai, active, ou en impayé) reçoit le courriel « votre abonnement prend
       le relais » : sans AUCUN lien de paiement, avec la date du premier prélèvement (en essai) ou de la prochaine
       échéance ; en impayé, il dit que le dernier prélèvement n'a pas abouti ;
     · une entreprise abonnée à OP MESSAGES SEUL, ou sans abonnement, reçoit le courriel habituel, avec la promesse ;
     · ⛔ un abonnement RÉSILIÉ qui s'arrête avant la fin de la période (payé pendant, puis résilié pendant l'essai) ne
       prend aucun relais : le courriel habituel. Résilié mais courant au-delà : « jusqu'au JJ/MM/AAAA », sans lien ;
     · ⛔ les dates sont celles de l'abonnement OP GESTION, pas du premier trouvé (qui peut être celui d'OP MESSAGES) ;
     · Stripe illisible (panne, clé refusée) : le courriel habituel, SANS la promesse — on ne sait pas s'il a déjà payé ;
     · une seule fois par échéance, comme l'autre.
   Rien ne sort d'ici : 127.0.0.1, un facteur de banc, un Stripe simulé, des entreprises fictives, un code fictif. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b844-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* Le facteur du banc (celui de `test-840`, point doublé compris — RFC 5321 §4.5.2) */
function facteur() {
  const recus = [];
  const f = { recus };
  const s = require('net').createServer(c => {
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
    c.on('error', () => {});
  });
  f.s = s;
  return f;
}
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
const destinataire = (m) => ((/^To: *(.+)$/m.exec(String(m || '')) || [])[1] || '').trim();
function objet(brut) {
  const l = String(brut || '').split('\n'); let s = null;
  for (const x of l) { if (s === null) { if (/^Subject:/i.test(x)) s = x.replace(/^Subject: */i, ''); continue; } if (/^[ \t]/.test(x)) s += x; else break; }
  const mot = /=\?UTF-8\?([QB])\?([^?]*)\?=/gi;
  const dec = (e, x) => e.toUpperCase() === 'B' ? Buffer.from(x, 'base64').toString('utf8')
    : Buffer.from(x.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
  return String(s || '').replace(/\?=[ \t]+=\?/g, '?==?').replace(mot, (_, e, x) => dec(e, x));
}

console.log('\n── 844 · le rappel des 7 jours à une entreprise déjà abonnée ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* les tarifs RÉELS du serveur (publics : ceux de la page de paiement) */
  const SRC = fs.readFileSync(SERVEUR, 'utf8');
  const prix = k => (new RegExp('^\\s*' + k + ": \\['(price_\\w+)'", 'm').exec(SRC) || [])[1];
  const P_PREMIUM = prix('premium'), P_MSG = prix('msgpro');
  vrai('(population) les tarifs Business Premium et OP MESSAGES du serveur sont lus', /^price_/.test(P_PREMIUM || '') && /^price_/.test(P_MSG || ''));

  /* ══ LES DONNÉES ═══════════════════════════════════════════════════════════════════════════════════ */
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const jour = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const fr = (iso) => iso.split('-').reverse().join('/');
  const secondes = iso => Math.floor(Date.parse(iso + 'T00:00:00Z') / 1000);
  const FIN = jour(5), DEBUT = jour(6);   // la période finit dans 5 jours : premier prélèvement le lendemain, 0 h UTC
  const MAINTENANT = Date.now();
  /* [identifiant, nom, adresse] — des entreprises fictives, chacune SEULE à son adresse, toutes en période offerte */
  const ENT = {
    alpha: ['t-alpha-844', 'Alpha Essai', 'alpha@exemple-844.fr'],          // abonnée, en ESSAI (a payé pendant la période)
    beta: ['t-beta-844', 'Beta Active', 'beta@exemple-844.fr'],              // abonnée, ACTIVE (payait déjà)
    epsilon: ['t-epsilon-844', 'Epsilon Impayé', 'epsilon@exemple-844.fr'], // abonnée, en IMPAYÉ
    gamma: ['t-gamma-844', 'Gamma Messages', 'gamma@exemple-844.fr'],      // OP MESSAGES seul : OP GESTION n'est pas payé
    delta: ['t-delta-844', 'Delta Rien', 'delta@exemple-844.fr'],          // aucun abonnement
    iota: ['t-iota-844', 'Iota Résiliée', 'iota@exemple-844.fr'],          // a payé pendant la période, puis RÉSILIÉ pendant l'essai
    kappa: ['t-kappa-844', 'Kappa Résiliée', 'kappa@exemple-844.fr'],      // active, résiliée : court jusqu'au jour(20)
    mu: ['t-mu-844', 'Mu Deux', 'mu@exemple-844.fr'] };                    // OP MESSAGES (trouvé le 1er) ET OP GESTION en essai
  const espaces = {}, usages = { 'ESSAI-BANC-844': { n: 0, equipes: {} } };
  for (const [slug, [t, nom, email]] of Object.entries(ENT)) {
    espaces[slug] = { t, nom, email, ts: MAINTENANT - 1000, formule: 'premium' };
    usages['ESSAI-BANC-844'].n++; usages['ESSAI-BANC-844'].equipes[t] = { date: jour(-80), finLe: FIN, em: '' };
  }
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(usages));

  /* Stripe, simulé DANS le processus serveur (`fetch` remplacé avant le chargement d'`index.js`) : la liste des
     abonnements, telle que `stripeAbosBruts` la demande. `STRIPE_BANC=panne` : Stripe répond 500, toujours. */
  const creation = Math.floor(MAINTENANT / 1000) - 3600;
  const abo = (t, email, statut, tarif, plus) => Object.assign({ id: 'sub_' + t, object: 'subscription', status: statut, created: creation,
    metadata: { espace: t, compte: email }, customer: { id: 'cus_' + t, email },
    items: { data: [{ price: { id: tarif, unit_amount: 5000, recurring: { interval: 'month', interval_count: 1 } }, quantity: 2 }] } }, plus || {});
  const ABOS = [
    abo('t-alpha-844', 'alpha@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }),
    abo('t-beta-844', 'beta@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)) }),
    abo('t-epsilon-844', 'epsilon@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-gamma-844', 'gamma@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(20)) }),
    /* résilié pendant l'essai : Stripe pose `cancel_at_period_end` ET `cancel_at` (la fin de la période en cours = de l'essai) */
    abo('t-iota-844', 'iota@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT),
      cancel_at_period_end: true, cancel_at: secondes(DEBUT) }),
    abo('t-kappa-844', 'kappa@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)), cancel_at_period_end: true,
      cancel_at: secondes(jour(20)) }),
    /* deux abonnements : OP MESSAGES d'abord dans la liste (c'est lui que la recherche trouve en premier), OP GESTION ensuite */
    Object.assign(abo('t-mu-844', 'mu@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(12)) }), { id: 'sub_t-mu-844-msg' }),
    abo('t-mu-844', 'mu@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }) ];
  const PRECHARGE = path.join(banc, 'stripe-simule.js');
  fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch; const ABOS = ${JSON.stringify(ABOS)};
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) {
    if (process.env.STRIPE_BANC === 'panne') return new Response('{"error":{"message":"panne du banc"}}', { status: 500, headers: { 'content-type': 'application/json' } });
    const corps = u.startsWith('https://api.stripe.com/v1/subscriptions') ? { data: ABOS, has_more: false } : { data: [], has_more: false };
    return new Response(JSON.stringify(corps), { status: 200, headers: { 'content-type': 'application/json' } });
  }
  return vrai.apply(this, arguments);
};\n`);

  /* ══ LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: kh('mot-de-passe-844'), notifDemandes: 'patron@banc-844.fr', stripe: { secretKey: 'sk_de_banc_844' },
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
    promos: [{ code: 'ESSAI-BANC-844', formule: 'premium', mois: 3 }] }));
  const PORT = 9600 + (process.pid % 300);
  let journal = '';
  const demarrer = async (stripeBanc) => {
    journal = '';
    enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_RAPPELS_DELAI_MS: '1000', TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z',
        STRIPE_BANC: stripeBanc || '' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  const arreter = async () => { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  /* « fini » = chaque envoi a son issue au journal (la leçon de `test-840`) — la borne large ne sert que si le serveur est en faute */
  const issues = () => (journal.match(/rappel échéance (envoyé|REFUSÉ)/g) || []).length;
  const attendrePassage = async (n) => { for (let i = 0; i < 200; i++) { if (facteurSrv.recus.length >= n && issues() >= n) break; await dormir(100); } await dormir(500); };
  const PROMESSE = /rien n'est prélevé avant le/;
  const PAIEMENT = /recap-abonnement\.html|Continuer avec|Choisir mon abonnement/;

  try {
    console.log('\n1. Stripe lisible : chacune reçoit le courriel qui la concerne');
    vrai('le serveur démarre (Stripe simulé dans son processus, 1er passage 1 s après)', await demarrer(''));
    await attendrePassage(8);
    const recus = facteurSrv.recus.map(lisible);
    const de = (qui) => recus.find(m => destinataire(m) === qui + '@exemple-844.fr') || '';
    const brut = (qui) => facteurSrv.recus.find(m => destinataire(m) === qui + '@exemple-844.fr') || '';
    v('(population) huit rappels, un par entreprise', recus.map(destinataire).sort(),
      ['alpha@exemple-844.fr', 'beta@exemple-844.fr', 'delta@exemple-844.fr', 'epsilon@exemple-844.fr', 'gamma@exemple-844.fr',
        'iota@exemple-844.fr', 'kappa@exemple-844.fr', 'mu@exemple-844.fr']);
    const A = de('alpha');
    v('⛔ alpha (a payé pendant la période : en essai) — l\'objet dit que l\'abonnement prend le relais', objet(brut('alpha')),
      '⏳ Votre période offerte se termine le ' + fr(FIN) + ' — votre abonnement prend le relais');
    vrai('   « Votre abonnement prend le relais : vous n\'avez rien à faire », et le jour du premier prélèvement (' + fr(DEBUT) + ')',
      /Votre abonnement prend le relais : vous n'avez rien à faire\./.test(A) && A.includes('Le premier prélèvement de votre abonnement aura lieu le ' + fr(DEBUT) + '.'));
    vrai('⛔   AUCUN lien de paiement (ni la page de paiement, ni « Continuer avec… ») — un second paiement serait un second abonnement',
      !!A && !PAIEMENT.test(A));
    vrai('⛔   et pas la promesse « rien n\'est prélevé avant… » (elle invite à payer)', !!A && !PROMESSE.test(A));
    vrai('   son seul bouton ouvre l\'application', /href="https:\/\/teamop\.fr\/app\.html"[^>]*>Ouvrir mon application</.test(A));
    const Bt = de('beta');
    vrai('⛔ beta (abonnée active) — le même courriel, avec la prochaine échéance (' + fr(jour(20)) + '), sans lien de paiement',
      /prend le relais : vous n'avez rien à faire/.test(Bt) && Bt.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(20)) + '.') && !PAIEMENT.test(Bt) && !PROMESSE.test(Bt));
    const E = de('epsilon');
    vrai('⛔ epsilon (en impayé) — il ne dit pas « rien à faire » : le dernier prélèvement n\'a pas abouti, et à qui écrire',
      /son dernier prélèvement n'a pas abouti/.test(E) && /contact@teamop\.fr/.test(E) && !/vous n'avez rien à faire/.test(E) && !PAIEMENT.test(E));
    const G = de('gamma');
    vrai('⛔ gamma (OP MESSAGES seul : OP GESTION n\'est pas payé) — le courriel habituel, lien de paiement ET promesse',
      /Plus que quelques jours/.test(G) && PAIEMENT.test(G) && PROMESSE.test(G) && !/prend le relais : vous n'avez rien à faire/.test(G));
    const Dl = de('delta');
    vrai('   delta (aucun abonnement) — le courriel habituel, lien de paiement et promesse (au plus tard le ' + fr(jour(3)).slice(0, 5) + ')',
      /Plus que quelques jours/.test(Dl) && PAIEMENT.test(Dl) && Dl.includes('En vous abonnant au plus tard le ' + fr(jour(3)).slice(0, 5) + ', rien n\'est prélevé avant le ' + fr(DEBUT)));
    const I = de('iota');
    vrai('⛔ iota (payé pendant la période, RÉSILIÉ pendant l\'essai : il s\'arrête avec la période) — le courriel habituel, lien de paiement et promesse',
      /Plus que quelques jours/.test(I) && PAIEMENT.test(I) && PROMESSE.test(I) && !/prend le relais : vous n'avez rien à faire/.test(I));
    const K = de('kappa');
    vrai('⛔ kappa (résiliée, court jusqu\'au ' + fr(jour(20)) + ') — « jusqu\'au » et la suite, ni « rien à faire », ni lien de paiement, ni promesse',
      K.includes('Votre abonnement prend le relais jusqu\'au ' + fr(jour(20)) + '.') && K.includes('Votre abonnement a été résilié : il s\'arrête le ' + fr(jour(20)) + '.')
      && /repassera en formule Gratuit/.test(K) && !/vous n'avez rien à faire/.test(K) && !/Prochaine échéance/.test(K) && !PAIEMENT.test(K) && !PROMESSE.test(K));
    const Mu = de('mu');
    vrai('⛔ mu (OP MESSAGES trouvé en premier, OP GESTION en essai) — la date du premier prélèvement d\'OP GESTION (' + fr(DEBUT) + '), pas l\'échéance d\'OP MESSAGES',
      Mu.includes('Le premier prélèvement de votre abonnement aura lieu le ' + fr(DEBUT) + '.') && !Mu.includes(fr(jour(12))) && !PAIEMENT.test(Mu) && !PROMESSE.test(Mu));
    vrai('   le journal les distingue (« déjà abonnée », « en impayé », « résiliée au »), sans adresse en clair',
      /rappel échéance envoyé → a\*+@exemple-844\.fr \(fin [0-9-]+, déjà abonnée\)/.test(journal) && /e\*+@exemple-844\.fr \(fin [0-9-]+, déjà abonnée, en impayé\)/.test(journal)
      && new RegExp('k\\*+@exemple-844\\.fr \\(fin [0-9-]+, déjà abonnée, résiliée au ' + jour(20) + '\\)').test(journal)
      && /i\*+@exemple-844\.fr \(fin [0-9-]+, \d+ utilisateur\(s\), [^)]+\)/.test(journal)
      && !/\w@exemple-844\.fr/.test(journal.replace(/\*+@exemple-844\.fr/g, '')));
    const e1 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    v('   la marque « prévenue » est posée sur les huit (une seule fois par échéance)', Object.keys(ENT).map(s => e1[s].rappelFin), Object.keys(ENT).map(() => FIN));
    await arreter();

    console.log('\n2. Stripe illisible : le courriel habituel, SANS la promesse');
    /* une entreprise neuve (entrée pendant l'arrêt) : elle seule doit recevoir son rappel à ce passage */
    const e2 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    e2.zeta = { t: 't-zeta-844', nom: 'Zeta Panne', email: 'zeta@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(e2));
    const u2 = JSON.parse(fs.readFileSync(path.join(D, 'promos-usages.json'), 'utf8'));
    u2['ESSAI-BANC-844'].equipes['t-zeta-844'] = { date: jour(-80), finLe: FIN, em: '' }; u2['ESSAI-BANC-844'].n++;
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(u2));
    const avant = facteurSrv.recus.length;
    vrai('le serveur redémarre, Stripe en panne (500 à chaque appel)', await demarrer('panne'));
    for (let i = 0; i < 200 && !(facteurSrv.recus.length > avant && issues() >= 1); i++) await dormir(100);
    await dormir(1500);   // un doublon, s'il y en avait un, aurait le temps d'arriver
    const neufs = facteurSrv.recus.slice(avant).map(lisible);
    v('(population) un seul rappel : zeta, la neuve — les huit déjà prévenues, rien', neufs.map(destinataire), ['zeta@exemple-844.fr']);
    const Z = neufs[0] || '';
    vrai('⛔ zeta : le courriel habituel (on ne sait pas si elle a payé : on ne lui dit pas qu\'elle est abonnée)', /Plus que quelques jours/.test(Z) && PAIEMENT.test(Z));
    vrai('⛔   SANS la promesse « rien n\'est prélevé avant… » (elle a peut-être déjà payé)', !!Z && !PROMESSE.test(Z));
    vrai('   le journal le dit : « Stripe illisible : sans la promesse »', /z\*+@exemple-844\.fr \(fin [0-9-]+, \d+ utilisateur\(s\), [^)]+, Stripe illisible : sans la promesse\)/.test(journal));
  } finally { if (enfant) await arreter(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a planté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
