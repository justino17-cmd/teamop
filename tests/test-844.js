/* ⛔ CE QUE CE FICHIER GARDE — LE RAPPEL DES SEPT JOURS À UNE ENTREPRISE DÉJÀ ABONNÉE, SUR LE VRAI SERVEUR.

   Justin, 29 septembre 2026 : « oui » à « la facturation démarre à la fin du code ». Payer pendant une période offerte ne
   prélève plus rien avant sa fin (`finEssaiPeriode`) : rien sur le relevé, donc rien qui rappelle au client qu'il a déjà
   payé. `gardien` l'a rejoué : le courriel des sept jours lui mettait sous les yeux « Continuer avec N abonnements » et
   la promesse « rien n'est prélevé avant… » — un second paiement, c'était un second abonnement, prélevé EN DOUBLE à la
   fin de l'essai. Puis sa seconde relecture : décider « abonnée » sur l'état d'AUJOURD'HUI disait « rien à faire » à des
   entreprises que l'application repasserait en Gratuit. La décision est celle qu'`espacePaye` prendra LE LENDEMAIN DE LA
   FIN, sur les seuls abonnements vivants ce jour-là. Ce qu'on garde ici, en faisant tourner le vrai serveur contre un
   facteur SMTP de banc ET un Stripe simulé DANS son processus (ce qu'on lit est littéralement ce que le serveur lirait) :
     · une entreprise ABONNÉE à OP GESTION (en essai, active) reçoit « votre abonnement prend le relais » : sans AUCUN lien
       de paiement, avec la date du premier prélèvement (en essai, et ce qui arrive s'il n'aboutit pas) ou de la prochaine
       échéance ;
     · ⛔ EN IMPAYÉ (Justin, 29 septembre 2026 : carte refusée = impayé, « leur accès sont bloqués le temps que c'est pas
       payé ») : ni « prend le relais », ni lien vers la page de paiement (un second abonnement, prélevé en double le jour où
       Stripe réussit sa nouvelle tentative), ni promesse — « un prélèvement est à régler », le jour où les fonctions payantes
       seront bloquées, et la FACTURE EN ATTENTE relue chez Stripe (la dernière, sinon la liste des factures ouvertes ; aucune :
       le support). Réglé depuis la liste : « prend le relais ». Un impayé PARMI des abonnements payés : « prend le relais »,
       et les places du refusé suspendues. Stripe muet à la relecture : le rappel attend tant que la promesse aurait un délai ;
     · OP MESSAGES seul, ou aucun abonnement : le courriel habituel, avec la promesse ;
     · ⛔ un abonnement RÉSILIÉ qui s'arrête avant la fin de la période ne compte pas — le sien (payé puis résilié pendant
       l'essai), celui d'une AUTRE entreprise à la même adresse qui la rendait « payée », ou celui qui faisait seul monter
       une fiche Gratuit : le courriel habituel. Résilié mais courant au-delà : « jusqu'au JJ/MM/AAAA » (et le prélèvement
       d'avant, s'il est en essai), sans lien ;
     · ⛔ les dates sont celles de SES abonnements OP GESTION (pas d'OP MESSAGES trouvé le premier, pas de l'entreprise
       voisine) ; plusieurs : le plus durable (actif, puis en essai, puis en impayé) ;
     · la règle de la formule servie (`formulePayee`) : OP MESSAGES d'AVANT la bascule garde la fiche servie — abonnée ; une
       fiche GRATUIT que rien ne fait monter n'est plus servie (30 septembre 2026 : le Gratuit n'existe plus, elle est
       suspendue) — le courriel habituel ; ⛔ mais un abonnement d'OP GESTION SÛREMENT à elle qu'on ne sait pas lire (d'avant
       la bascule) la sert en Pro (`gratuitPayeIllisible`, la même règle qu'`espacePaye`) — abonnée, SANS lien de paiement
       (un second abonnement serait prélevé en double) ;
     · ⛔ réglée à la main dans la Tour (`aboStatut`) : Stripe ne décide rien — le courriel habituel, comme avant, sans
       promesse ;
     · ⛔ Stripe illisible, ou sa liste PÉRIMÉE (la dernière connue sert pendant une panne) : on ne sait pas s'il a payé —
       le rappel attend le passage suivant, sans marque, tant que la promesse aurait un délai ; ensuite il part, SANS elle ;
     · une seule fois par échéance ;
     · ⛔ l'attente de Stripe rend la main au serveur : une entreprise SUPPRIMÉE depuis la Tour pendant cette attente ne
       reçoit rien, et les suivantes reçoivent le leur ; une entreprise dont la Tour RÈGLE l'abonnement pendant ce temps
       attend le passage suivant (la décision prise avant ne vaut plus).
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
  const P_PREMIUM = prix('premium'), P_MSG = prix('msgpro'), P_PRO = prix('pro');
  vrai('(population) les tarifs Business Premium, Pro et OP MESSAGES du serveur sont lus', [P_PREMIUM, P_MSG, P_PRO].every(x => /^price_/.test(x || '')));

  /* ══ LES DONNÉES ═══════════════════════════════════════════════════════════════════════════════════ */
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const jour = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const fr = (iso) => iso.split('-').reverse().join('/');
  const secondes = iso => Math.floor(Date.parse(iso + 'T00:00:00Z') / 1000);
  const FIN = jour(5), DEBUT = jour(6);   // la période finit dans 5 jours : premier prélèvement le lendemain, 0 h UTC
  const MAINTENANT = Date.now();
  /* [identifiant, nom, adresse] — des entreprises fictives en période offerte ; sauf mention, chacune SEULE à son adresse */
  const ENT = {
    alpha: ['t-alpha-844', 'Alpha Essai', 'alpha@exemple-844.fr'],          // abonnée, en ESSAI (a payé pendant la période)
    beta: ['t-beta-844', 'Beta Active', 'beta@exemple-844.fr'],              // abonnée, ACTIVE (payait déjà)
    epsilon: ['t-epsilon-844', 'Epsilon Impayé', 'epsilon@exemple-844.fr'], // abonnée, en IMPAYÉ
    gamma: ['t-gamma-844', 'Gamma Messages', 'gamma@exemple-844.fr'],      // OP MESSAGES seul : OP GESTION n'est pas payé
    delta: ['t-delta-844', 'Delta Rien', 'delta@exemple-844.fr'],          // aucun abonnement
    iota: ['t-iota-844', 'Iota Résiliée', 'iota@exemple-844.fr'],          // a payé pendant la période, puis RÉSILIÉ pendant l'essai
    kappa: ['t-kappa-844', 'Kappa Résiliée', 'kappa@exemple-844.fr'],      // active, résiliée : court jusqu'au jour(20)
    mu: ['t-mu-844', 'Mu Deux', 'mu@exemple-844.fr'],                      // OP MESSAGES (trouvé le 1er) ET OP GESTION en essai
    nu: ['t-nu-844', 'Nu Ancienne', 'nu@exemple-844.fr'],                  // OP MESSAGES seul, souscrit AVANT la bascule
    xi: ['t-xi-844', 'Xi Partagée', 'partage@exemple-844.fr'],             // son adresse est aussi celle d'omicron, abonnée
    pi: ['t-pi-844', 'Pi Gratuite', 'pi@exemple-844.fr'],                  // fiche GRATUIT, un abonnement d'avant la bascule
    upsilon: ['t-upsilon-844', 'Upsilon Deux', 'upsilon@exemple-844.fr'],  // DEUX abonnements OP GESTION : un résilié (1er), un actif
    phi: ['t-phi-844', 'Phi Voisine', 'voisins@exemple-844.fr'],           // son adresse est celle de chi, dont l'abonnement est RÉSILIÉ
    psi: ['t-psi-844', 'Psi Gratuite', 'psi@exemple-844.fr'],              // fiche GRATUIT : un ancien abonnement + un Pro RÉSILIÉ
    omega: ['t-omega-844', 'Omega Tour', 'omega@exemple-844.fr'],          // réglée à la main dans la Tour (impayé), abonnée chez Stripe
    lambda: ['t-lambda-844', 'Lambda Essai Résilié', 'lambda@exemple-844.fr'], // en essai, résiliée APRÈS l'essai (un prélèvement, puis la fin)
    theta: ['t-theta-844', 'Theta Deux', 'theta@exemple-844.fr'],          // DEUX abonnements OP GESTION : en essai (1er), actif
    rho: ['t-rho-844', 'Rho Sans Date', 'rho@exemple-844.fr'],             // résiliée « à la fin de la période » SANS aucune date lisible
    sampi: ['t-sampi-844', 'Sampi Impayée', 'sampi@exemple-844.fr'],       // IMPAYÉE (unpaid) : sa facture ouverte n'est que dans la liste des factures
    qoppa: ['t-qoppa-844', 'Qoppa Sans Facture', 'qoppa@exemple-844.fr'],  // IMPAYÉE (past_due), et AUCUNE facture ouverte chez Stripe
    jota: ['t-jota-844', 'Jota Réglée', 'jota@exemple-844.fr'],            // en impayé dans la liste, RÉGLÉE depuis (la relecture la dit active)
    heta: ['t-heta-844', 'Heta Mixte', 'heta@exemple-844.fr'],             // un abonnement actif ET un autre en impayé
    chet: ['t-chet-844', 'Chet Messages', 'chet@exemple-844.fr'],          // OP MESSAGES payé, OP GESTION en impayé
    xenia: ['t-xenia-844', 'Xenia Voisine', 'voisine@exemple-844.fr'] };   // fiche GRATUIT : l'impayé SANS référence de yod, à la même adresse
  const espaces = {}, usages = { 'ESSAI-BANC-844': { n: 0, equipes: {} } };
  const periode = t => { usages['ESSAI-BANC-844'].n++; usages['ESSAI-BANC-844'].equipes[t] = { date: jour(-80), finLe: FIN, em: '' }; };
  for (const [slug, [t, nom, email]] of Object.entries(ENT)) { espaces[slug] = { t, nom, email, ts: MAINTENANT - 1000, formule: 'premium' }; periode(t); }
  espaces.pi.formule = 'gratuit'; espaces.psi.formule = 'gratuit'; espaces.xenia.formule = 'gratuit';
  Object.assign(espaces.omega, { aboStatut: 'impaye', aboPar: 'Banc' });
  /* omicron et chi : SANS période offerte (pas de rappel), chacune abonnée à son nom, à l'adresse d'une entreprise qui en a une */
  espaces.omicron = { t: 't-omicron-844', nom: 'Omicron Abonnée', email: 'partage@exemple-844.fr', ts: MAINTENANT - 2000, formule: 'premium' };
  espaces.chi = { t: 't-chi-844', nom: 'Chi Résiliée', email: 'voisins@exemple-844.fr', ts: MAINTENANT - 2000, formule: 'premium' };
  /* yod : sans période, à l'adresse de xenia ; son abonnement refusé ne porte AUCUNE référence (l'adresse seule) */
  espaces.yod = { t: 't-yod-844', nom: 'Yod Refusée', email: 'voisine@exemple-844.fr', ts: MAINTENANT - 2000, formule: 'premium' };
  const ecrire = () => { fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces)); fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(usages)); };
  ecrire();

  /* Stripe, simulé DANS le processus serveur (`fetch` remplacé avant le chargement d'`index.js`) : la liste des
     abonnements, telle que `stripeAbosBruts` la demande. `STRIPE_BANC` : `panne` (500, toujours), `puis-panne` (le premier
     appel répond, les suivants 500 : une liste qui devient PÉRIMÉE), `retenu` (la lecture que fait le PASSAGE DES RAPPELS
     attend que le banc la relâche : la course se joue au geste du banc, jamais au chronomètre — voir la phase 3). */
  const creation = Math.floor(MAINTENANT / 1000) - 3600;
  const abo = (t, email, statut, tarif, plus) => Object.assign({ id: 'sub_' + t, object: 'subscription', status: statut, created: creation,
    metadata: { espace: t, compte: email }, customer: { id: 'cus_' + t, email },
    items: { data: [{ price: { id: tarif, unit_amount: 5000, recurring: { interval: 'month', interval_count: 1 } }, quantity: 2 }] } }, plus || {});
  const autre = (x, id) => Object.assign(x, { id });
  const ABOS = [
    abo('t-alpha-844', 'alpha@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }),
    /* renouvelé à 23 h 30 UTC la veille : c'est déjà le jour d'après à Paris — le courriel dit le jour du client */
    abo('t-beta-844', 'beta@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)) - 1800 }),
    abo('t-epsilon-844', 'epsilon@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-gamma-844', 'gamma@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(20)) }),
    /* résilié pendant l'essai : Stripe pose `cancel_at_period_end` ET `cancel_at` (la fin de la période en cours = de l'essai) */
    abo('t-iota-844', 'iota@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT),
      cancel_at_period_end: true, cancel_at: secondes(DEBUT) }),
    abo('t-kappa-844', 'kappa@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)), cancel_at_period_end: true,
      cancel_at: secondes(jour(20)) }),
    /* deux abonnements : OP MESSAGES d'abord dans la liste (c'est lui que la recherche trouve en premier), OP GESTION ensuite */
    autre(abo('t-mu-844', 'mu@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(12)) }), 'sub_t-mu-844-msg'),
    abo('t-mu-844', 'mu@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }),
    /* souscrit le 1er décembre 2025 : AVANT la bascule du banc (1er janvier 2026) — on ne sait pas lire ce qu'il paie */
    abo('t-nu-844', 'nu@exemple-844.fr', 'active', P_MSG, { created: secondes('2025-12-01'), current_period_end: secondes(jour(15)) }),
    abo('t-omicron-844', 'partage@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(9)) }),
    abo('t-pi-844', 'pi@exemple-844.fr', 'active', P_PREMIUM, { created: secondes('2025-12-01'), current_period_end: secondes(jour(15)) }),
    /* un abonnement de plus acheté plus tard : le premier (résilié) est trouvé d'abord, le second (actif) dure */
    autre(abo('t-upsilon-844', 'upsilon@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(30)), cancel_at_period_end: true,
      cancel_at: secondes(jour(30)) }), 'sub_t-upsilon-844-a'),
    abo('t-upsilon-844', 'upsilon@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(18)) }),
    /* chi (voisine de phi, sans période) : abonnée à son nom, mais RÉSILIÉE avant la fin de la période de phi */
    abo('t-chi-844', 'voisins@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(3)), cancel_at_period_end: true,
      cancel_at: secondes(jour(3)) }),
    /* psi (fiche Gratuit) : OP MESSAGES (lisible : il ne sert pas OP GESTION), et un Pro payé pendant la période puis résilié.
       (Jusqu'au 30 septembre 2026, c'était un ancien abonnement illisible : il sert désormais Pro — voir pi.) */
    abo('t-psi-844', 'psi@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(15)) }),
    autre(abo('t-psi-844', 'psi@exemple-844.fr', 'trialing', P_PRO, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT),
      cancel_at_period_end: true, cancel_at: secondes(DEBUT) }), 'sub_t-psi-844-pro'),
    abo('t-omega-844', 'omega@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)) }),
    /* lambda : en essai, résiliée pour une date APRÈS l'essai — un prélèvement à la fin de l'essai, puis la fin */
    abo('t-lambda-844', 'lambda@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT),
      cancel_at: secondes(jour(40)) }),
    /* theta : l'essai trouvé d'abord, l'actif ensuite — l'actif décide (déjà prélevé : pas de « premier prélèvement ») */
    autre(abo('t-theta-844', 'theta@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }), 'sub_t-theta-844-e'),
    abo('t-theta-844', 'theta@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(22)) }),
    /* rho : `cancel_at_period_end` sans aucune date (ni fin de période, ni essai, ni `cancel_at`) : on ne sait pas quand il
       s'arrête — il ne prend aucun relais */
    Object.assign(abo('t-rho-844', 'rho@exemple-844.fr', 'active', P_PREMIUM, { cancel_at_period_end: true }), { current_period_end: undefined }),
    /* vieux (phase 2 bis) : en essai — une liste fraîche la dirait abonnée */
    abo('t-vieux-844', 'vieux@exemple-844.fr', 'trialing', P_PREMIUM, { trial_end: secondes(DEBUT), current_period_end: secondes(DEBUT) }),
    /* mutee (phase 4) : active chez Stripe — abonnée, jusqu'à ce que la Tour règle son abonnement à la main pendant l'attente */
    abo('t-mutee-844', 'mutee@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(20)) }),
    /* les impayés (carte refusée) — leurs factures sont dans FACTURES, que seule la relecture voit */
    abo('t-sampi-844', 'sampi@exemple-844.fr', 'unpaid', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-qoppa-844', 'qoppa@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-jota-844', 'jota@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-heta-844', 'heta@exemple-844.fr', 'active', P_PREMIUM, { current_period_end: secondes(jour(21)) }),
    autre(abo('t-heta-844', 'heta@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }), 'sub_t-heta-844-refus'),
    /* chet : OP MESSAGES payé (trouvé le premier), OP GESTION en impayé */
    autre(abo('t-chet-844', 'chet@exemple-844.fr', 'active', P_MSG, { current_period_end: secondes(jour(12)) }), 'sub_t-chet-844-msg'),
    abo('t-chet-844', 'chet@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    /* wau et fau (phase 2 ter) : en impayé — la liste se lit, la RELECTURE de l'abonnement échoue */
    abo('t-wau-844', 'wau@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    abo('t-fau-844', 'fau@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    /* yod : refusé, sans référence (voir plus bas) */
    abo('t-yod-844', 'voisine@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }),
    /* stigma (phase 5) : en impayé — la Tour la supprime PENDANT la lecture de sa facture */
    abo('t-stigma-844', 'stigma@exemple-844.fr', 'past_due', P_PREMIUM, { current_period_end: secondes(jour(25)) }) ];
  delete ABOS.find(x => x.id === 'sub_t-yod-844').metadata.espace;
  /* Ce que rend la RELECTURE d'un abonnement (`/v1/subscriptions/{id}?expand[]=latest_invoice`) — sa dernière facture, son
     statut s'il a changé depuis la liste — et la liste de ses factures ouvertes (`/v1/invoices?subscription=…&status=open`).
     Des adresses de factures FICTIVES : rien ne sort d'ici. */
  const FACT = x => 'https://invoice.stripe.com/i/banc-844-' + x;
  const FACTURES = {
    'sub_t-epsilon-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('epsilon') } },
    'sub_t-sampi-844': { latest_invoice: { object: 'invoice', status: 'paid', hosted_invoice_url: FACT('sampi-ancienne') },
      ouvertes: [{ object: 'invoice', status: 'open', hosted_invoice_url: FACT('sampi') }] },
    'sub_t-qoppa-844': { latest_invoice: null, ouvertes: [] },
    'sub_t-jota-844': { status: 'active', latest_invoice: { object: 'invoice', status: 'paid', hosted_invoice_url: FACT('jota') } },
    'sub_t-heta-844-refus': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('heta') } },
    'sub_t-chet-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('chet') } },
    'sub_t-wau-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('wau') } },
    'sub_t-fau-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('fau') } },
    'sub_t-yod-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('yod') } },
    'sub_t-stigma-844': { latest_invoice: { object: 'invoice', status: 'open', hosted_invoice_url: FACT('stigma') } } };
  const PRECHARGE = path.join(banc, 'stripe-simule.js');
  fs.writeFileSync(PRECHARGE, `const vrai = globalThis.fetch; const ABOS = ${JSON.stringify(ABOS)}; const FACTURES = ${JSON.stringify(FACTURES)}; let appels = 0, retenus = 0;
globalThis.fetch = async function (url, opts) {
  const u = String(url && url.url || url);
  if (u.startsWith('https://api.stripe.com/')) {
    appels++;
    process.stdout.write('banc-stripe: appel\\n');   // (dans le gabarit : l'antislash est doublé)
    /* RETENU : la lecture que fait le PASSAGE DES RAPPELS (reconnu à sa pile d'appels) attend que le banc la relâche, en
       écrivant son numéro dans STRIPE_PORTE ; les autres lecteurs (l'horloge de conservation, au démarrage) passent */
    if (process.env.STRIPE_BANC === 'retenu') {
      const lim = Error.stackTraceLimit; Error.stackTraceLimit = 60; const pile = String(new Error().stack); Error.stackTraceLimit = lim;
      if (/\\brappelsEcheances\\b/.test(pile)) {
        const n = ++retenus, fin = Date.now() + 60000;   // jamais figé : le banc a ses propres bornes
        process.stdout.write('banc-stripe: retenu ' + n + ' ' + u.slice('https://api.stripe.com'.length).split('?')[0] + '\\n');
        for (;;) {
          let o = 0; try { o = Number(require('fs').readFileSync(process.env.STRIPE_PORTE, 'utf8')) || 0; } catch (e) {}
          if (o >= n || Date.now() > fin) break;
          await new Promise(r => setTimeout(r, 20));
        }
        process.stdout.write('banc-stripe: relâché ' + n + '\\n');
      }
    }
    if (process.env.STRIPE_BANC === 'panne' || (process.env.STRIPE_BANC === 'puis-panne' && appels > 1))
      return new Response('{"error":{"message":"panne du banc"}}', { status: 500, headers: { 'content-type': 'application/json' } });
    const json = (c, st) => new Response(JSON.stringify(c), { status: st || 200, headers: { 'content-type': 'application/json' } });
    /* la RELECTURE d'un abonnement : lui, sa dernière facture (développée), son statut d'aujourd'hui */
    const r1 = /^https:\\/\\/api\\.stripe\\.com\\/v1\\/subscriptions\\/([^?]+)/.exec(u);
    if (r1) {
      const id = decodeURIComponent(r1[1]);
      process.stdout.write('banc-stripe: relecture ' + id + '\\n');
      if (process.env.STRIPE_BANC === 'relecture-panne') return json({ error: { message: 'panne du banc (relecture)' } }, 500);
      const sb = ABOS.find(x => x.id === id), f = FACTURES[id] || {};
      if (!sb) return json({ error: { message: 'inconnu' } }, 404);
      return json(Object.assign({}, sb, f.status ? { status: f.status } : {}, { latest_invoice: f.latest_invoice === undefined ? null : f.latest_invoice }));
    }
    if (u.startsWith('https://api.stripe.com/v1/invoices')) {
      const id = new URL(u).searchParams.get('subscription');
      process.stdout.write('banc-stripe: factures ' + id + '\\n');
      return json({ data: ((FACTURES[id] || {}).ouvertes || []).slice(0, 1), has_more: false });
    }
    return json(u.startsWith('https://api.stripe.com/v1/subscriptions') ? { data: ABOS, has_more: false } : { data: [], has_more: false });
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
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  const demarrer = async (stripeBanc, envPlus) => {
    journal = '';
    enfant = spawn(process.execPath, ['--require', PRECHARGE, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_RAPPELS_DELAI_MS: '1000', TEAMOP_PLACES_BASCULE: '2026-01-01T00:00:00Z',
        STRIPE_BANC: stripeBanc || '' }, envPlus || {}),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  const arreter = async () => { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  /* « fini » = chaque rappel a son issue au journal (la leçon de `test-840`) — la borne large ne sert que si le serveur est en faute */
  const issues = () => (journal.match(/rappel échéance (envoyé|REFUSÉ|reporté)/g) || []).length;
  const attendre = async (n) => { for (let i = 0; i < 200 && issues() < n; i++) await dormir(100); await dormir(700); };
  const PROMESSE = /rien n'est prélevé avant le/;
  const PAIEMENT = /recap-abonnement\.html|Continuer avec|Choisir mon abonnement/;
  const RELAIS = /prend le relais : vous n'avez rien à faire/;
  const HABITUEL = m => /Plus que quelques jours/.test(m) && PAIEMENT.test(m) && !RELAIS.test(m);
  const marques = () => { const e = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8')); return s => (e[s] || {}).rappelFin; };
  const lus = (depuis) => facteurSrv.recus.slice(depuis || 0).map(m => ({ a: destinataire(m), m: lisible(m), brut: m }));
  /* les rappels seuls (les entreprises du banc) : l'avis de suppression de la Tour part aussi par le facteur */
  const rappels = (depuis) => lus(depuis).filter(x => /@exemple-844\.fr$/.test(x.a));
  /* ⛔ LA PORTE DU STRIPE DU BANC (phases 3 à 5) : on y écrit le numéro du dernier appel RETENU qu'on relâche. Un cache
     court (300 ms) fait lire Stripe au passage lui-même : sinon il attend la lecture que l'horloge de conservation fait au
     démarrage, et rien ne dit alors qu'il attend. */
  const PORTE = path.join(banc, 'porte-stripe');
  const porte = n => fs.writeFileSync(PORTE, String(n));
  const RETENU = { STRIPE_PORTE: PORTE, TEAMOP_STRIPE_CACHE_MS: '300' };
  const relache = n => new RegExp('banc-stripe: relâché ' + n + '(?!\\d)').test(journal);
  /* relâche un à un les appels retenus, jusqu'à celui qu'on veut TENIR — rendu : son numéro (0 : il n'est pas venu) */
  const tenir = async (motif) => {
    for (let i = 0; i < 300; i++) {
      const r = [...journal.matchAll(/banc-stripe: retenu (\d+) (\S+)/g)];
      const cible = r.find(x => motif.test(x[2]));
      if (cible) return +cible[1];
      if (r.length) porte(Math.max(...r.map(x => +x[1])));
      await dormir(50);
    }
    return 0;
  };

  try {
    console.log('\n1. Stripe lisible : chacune reçoit le courriel de ce que l\'application fera le lendemain de la fin');
    vrai('le serveur démarre (Stripe simulé dans son processus, 1er passage 1 s après)', await demarrer(''));
    const N1 = Object.keys(ENT).length;
    await attendre(N1);
    const R1 = lus();
    const de = (adr) => (R1.find(x => x.a === adr + '@exemple-844.fr') || {}).m || '';
    v('(population) un rappel par entreprise en période (' + N1 + ' ; omicron et chi n\'en ont pas)', R1.map(x => x.a).sort(),
      Object.values(ENT).map(x => x[2]).sort());
    const A = de('alpha');
    v('⛔ alpha (a payé pendant la période : en essai) — l\'objet dit que l\'abonnement prend le relais',
      objet((R1.find(x => x.a === 'alpha@exemple-844.fr') || {}).brut), '⏳ Votre période offerte se termine le ' + fr(FIN) + ' — votre abonnement prend le relais');
    vrai('   « Votre abonnement prend le relais : vous n\'avez rien à faire », et le jour du premier prélèvement (' + fr(DEBUT) + ')',
      RELAIS.test(A) && A.includes('Le premier prélèvement de votre abonnement aura lieu le ' + fr(DEBUT) + '.'));
    vrai('⛔   AUCUN lien de paiement (ni la page de paiement, ni « Continuer avec… ») — un second paiement serait un second abonnement', !!A && !PAIEMENT.test(A));
    vrai('⛔   et pas la promesse « rien n\'est prélevé avant… » (elle invite à payer)', !!A && !PROMESSE.test(A));
    vrai('   son seul bouton ouvre l\'application', /href="https:\/\/teamop\.fr\/app\.html"[^>]*>Ouvrir mon application</.test(A));
    vrai('⛔   et ce qui arrive si ce premier prélèvement n\'aboutit pas (carte refusée = impayé : les fonctions payantes bloquées jusqu\'au règlement)',
      A.includes('S\'il n\'aboutit pas, les fonctions payantes seront bloquées jusqu\'au règlement — vos données ne bougent pas.'));
    const Bt = de('beta');
    vrai('⛔ beta (abonnée active, renouvelée à 23 h 30 UTC : le ' + fr(jour(20)) + ' à Paris) — le même courriel, avec la prochaine échéance au jour de Paris, sans lien de paiement',
      RELAIS.test(Bt) && Bt.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(20)) + '.') && !PAIEMENT.test(Bt) && !PROMESSE.test(Bt));
    /* ⛔ LES IMPAYÉS (carte refusée) : ni « prend le relais », ni page de paiement, ni promesse — la facture en attente */
    const IMPAYE = m => m.includes('Le dernier prélèvement de votre abonnement n\'a pas abouti. À partir du ' + fr(DEBUT)
      + ', les fonctions payantes seront bloquées tant qu\'il n\'est pas réglé. Vos données ne bougent pas, et tout revient dès le règlement.')
      && !/prend le relais/.test(m) && !PAIEMENT.test(m) && !PROMESSE.test(m);
    const objetDe = adr => objet((R1.find(x => x.a === adr + '@exemple-844.fr') || {}).brut);
    const E = de('epsilon');
    v('⛔ epsilon (en impayé : past_due) — l\'objet dit qu\'un prélèvement est à régler', objetDe('epsilon'),
      '⏳ Votre période offerte se termine le ' + fr(FIN) + ' — un prélèvement est à régler');
    vrai('⛔   le jour où les fonctions payantes seront bloquées (le lendemain de la fin : ' + fr(DEBUT) + '), que rien n\'est perdu — ni « prend le relais », ni page de paiement, ni promesse', IMPAYE(E));
    vrai('⛔   sa FACTURE EN ATTENTE (la dernière facture de l\'abonnement, relue chez Stripe) : dans le texte, et sur le seul bouton',
      E.includes('Réglez votre facture en attente (vous pouvez changer de carte) : ' + FACT('epsilon'))
      && new RegExp('href="' + FACT('epsilon').replace(/[./]/g, '\\$&') + '"[^>]*>Régler ma facture<').test(E) && !/Ouvrir mon application/.test(E));
    vrai('   (population) la relecture a bien eu lieu chez Stripe', /banc-stripe: relecture sub_t-epsilon-844/.test(journal));
    const Sa = de('sampi');
    vrai('⛔ sampi (unpaid : la dernière facture est PAYÉE, l\'ouverte n\'est que dans la liste des factures) — la facture ouverte, pas l\'ancienne',
      IMPAYE(Sa) && Sa.includes(FACT('sampi')) && !Sa.includes(FACT('sampi-ancienne')) && /banc-stripe: factures sub_t-sampi-844/.test(journal));
    const Q = de('qoppa');
    vrai('⛔ qoppa (en impayé, AUCUNE facture ouverte) — le même avertissement, et à qui écrire ; aucun lien de facture, le bouton ouvre l\'application',
      IMPAYE(Q) && Q.includes('Pour le régler, écrivez-nous à contact@teamop.fr.') && !/invoice\.stripe\.com/.test(Q) && /Ouvrir mon application/.test(Q));
    const J = de('jota');
    vrai('⛔ jota (en impayé dans la liste, RÉGLÉE depuis : la relecture la dit active) — « prend le relais », ni facture ni lien de paiement',
      RELAIS.test(J) && !/n'a pas abouti/.test(J) && !/invoice\.stripe\.com/.test(J) && !PAIEMENT.test(J) && !PROMESSE.test(J));
    const Ch = de('chet');
    vrai('⛔ chet (OP MESSAGES payé, OP GESTION en impayé) — l\'impayé, et la facture d\'OP GESTION : OP MESSAGES ne prend pas le relais',
      IMPAYE(Ch) && Ch.includes(FACT('chet')) && !/Plus que quelques jours/.test(Ch));
    const Xe = de('voisine');
    vrai('⛔ xenia (fiche GRATUIT, l\'impayé SANS référence d\'une voisine à la même adresse) — le courriel habituel : on ne réclame pas à une entreprise la dette d\'une autre',
      HABITUEL(Xe) && !/n'a pas abouti|prélèvement est à régler/.test(Xe) && !Xe.includes(FACT('yod')));
    const H = de('heta');
    vrai('⛔ heta (un abonnement actif, un AUTRE en impayé) — l\'actif prend le relais, mais les places du refusé sont suspendues : pas « rien à faire »',
      H.includes('Votre abonnement prend le relais. Mais le dernier prélèvement d\'un autre de vos abonnements n\'a pas abouti : les places qu\'il paie sont suspendues jusqu\'au règlement.')
      && H.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(21)) + '.') && !/vous n'avez rien à faire/.test(H) && !PAIEMENT.test(H) && !PROMESSE.test(H));
    const G = de('gamma');
    vrai('⛔ gamma (OP MESSAGES seul : OP GESTION n\'est pas payé) — le courriel habituel, lien de paiement ET promesse', HABITUEL(G) && PROMESSE.test(G));
    const Dl = de('delta');
    vrai('   delta (aucun abonnement) — le courriel habituel, lien de paiement et promesse (au plus tard le ' + fr(jour(3)).slice(0, 5) + ')',
      HABITUEL(Dl) && Dl.includes('En vous abonnant au plus tard le ' + fr(jour(3)).slice(0, 5) + ', rien n\'est prélevé avant le ' + fr(DEBUT)));
    const I = de('iota');
    vrai('⛔ iota (payé pendant la période, RÉSILIÉ pendant l\'essai : il s\'arrête avec la période) — le courriel habituel, lien de paiement et promesse',
      HABITUEL(I) && PROMESSE.test(I));
    const K = de('kappa');
    vrai('⛔ kappa (résiliée, court jusqu\'au ' + fr(jour(20)) + ') — « jusqu\'au » et la suite, ni « rien à faire », ni lien de paiement, ni promesse',
      K.includes('Votre abonnement prend le relais jusqu\'au ' + fr(jour(20)) + '.') && K.includes('Votre abonnement a été résilié : il s\'arrête le ' + fr(jour(20)) + '.')
      && /l'accès à l'application sera suspendu jusqu'au règlement/.test(K) && !/formule Gratuit/.test(K)
      && !/vous n'avez rien à faire/.test(K) && !/Prochaine échéance/.test(K) && !PAIEMENT.test(K) && !PROMESSE.test(K));
    const Mu = de('mu');
    vrai('⛔ mu (OP MESSAGES trouvé en premier, OP GESTION en essai) — la date du premier prélèvement d\'OP GESTION (' + fr(DEBUT) + '), pas l\'échéance d\'OP MESSAGES',
      Mu.includes('Le premier prélèvement de votre abonnement aura lieu le ' + fr(DEBUT) + '.') && !Mu.includes(fr(jour(12))) && !PAIEMENT.test(Mu) && !PROMESSE.test(Mu));
    const Nu = de('nu');
    vrai('   nu (OP MESSAGES seul, souscrit AVANT la bascule : la fiche reste servie) — abonnée, prochaine échéance ' + fr(jour(15)) + ', sans lien de paiement',
      RELAIS.test(Nu) && Nu.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(15)) + '.') && !PAIEMENT.test(Nu));
    const Xi = de('partage');
    vrai('⛔ xi (adresse partagée avec omicron, abonnée et qui dure) — abonnée comme le dira `espacePaye`, mais SANS les dates d\'omicron (' + fr(jour(9)) + ')',
      RELAIS.test(Xi) && !Xi.includes(fr(jour(9))) && !/Prochaine échéance|premier prélèvement/.test(Xi) && !PAIEMENT.test(Xi));
    const Pi = de('pi');
    /* ⛔ v767 : le Gratuit n'existe plus. Un abonnement d'OP GESTION d'avant la bascule, SÛREMENT à elle, la sert en Pro le
       lendemain (`gratuitPayeIllisible`) : le courriel ne lui propose PAS de payer — un second abonnement serait prélevé en
       double. Jusqu'au 30 septembre, elle recevait « le courriel habituel » : servie Gratuit, on l'invitait à payer. */
    vrai('⛔ pi (fiche GRATUIT, un abonnement d\'avant la bascule SÛREMENT à elle : `espacePaye` lui servira Pro) — abonnée : « prend le relais », prochaine échéance ' + fr(jour(15)) + ', sans lien de paiement ni promesse',
      RELAIS.test(Pi) && Pi.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(15)) + '.') && !PAIEMENT.test(Pi) && !PROMESSE.test(Pi));
    const Up = de('upsilon');
    vrai('   upsilon (deux abonnements, le résilié trouvé d\'abord) — le plus durable décide : prochaine échéance ' + fr(jour(18)) + ', pas « résilié »',
      RELAIS.test(Up) && Up.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(18)) + '.') && !/résilié/.test(Up));
    const Ph = de('voisins');
    vrai('⛔ phi (sa voisine chi, abonnée, est RÉSILIÉE avant la fin de la période : le lendemain, rien ne la rend « payée ») — le courriel habituel, sans promesse (adresse partagée)',
      HABITUEL(Ph) && !PROMESSE.test(Ph));
    const Ps = de('psi');
    vrai('⛔ psi (fiche GRATUIT, OP MESSAGES à côté : son Pro, résilié avec la période, la faisait seul monter) — le courriel habituel, pas « prend le relais »', HABITUEL(Ps));
    const Om = de('omega');
    vrai('⛔ omega (réglée à la main dans la Tour, en impayé : Stripe ne décide rien) — le courriel habituel, comme avant, SANS la promesse',
      HABITUEL(Om) && !PROMESSE.test(Om));
    const La = de('lambda');
    vrai('⛔ lambda (en essai, résiliée APRÈS l\'essai) — le prélèvement du ' + fr(DEBUT) + ', puis la fin au ' + fr(jour(40)) + ', sans lien',
      La.includes('Le premier prélèvement de votre abonnement aura lieu le ' + fr(DEBUT) + '. S\'il n\'aboutit pas, les fonctions payantes seront bloquées jusqu\'au règlement — vos données ne bougent pas. Il a été résilié : il s\'arrête le ' + fr(jour(40)) + '.')
      && La.includes('Votre abonnement prend le relais jusqu\'au ' + fr(jour(40)) + '.') && !PAIEMENT.test(La) && !PROMESSE.test(La));
    const Th = de('theta');
    vrai('   theta (en essai trouvé d\'abord, actif ensuite) — l\'actif décide : prochaine échéance ' + fr(jour(22)) + ', pas de « premier prélèvement »',
      RELAIS.test(Th) && Th.includes('Prochaine échéance de votre abonnement : le ' + fr(jour(22)) + '.') && !/premier prélèvement/.test(Th));
    const Rh = de('rho');
    vrai('   rho (résiliée sans aucune date lisible : on ne sait pas quand elle s\'arrête) — pas de « prend le relais » : le courriel habituel', HABITUEL(Rh));
    vrai('   le journal les distingue (« déjà abonnée », « en impayé », « résiliée au »), sans adresse en clair',
      /rappel échéance envoyé → a\*+@exemple-844\.fr \(fin [0-9-]+, déjà abonnée\)/.test(journal) && /e\*+@exemple-844\.fr \(fin [0-9-]+, en impayé, facture à régler\)/.test(journal)
      && /q\*+@exemple-844\.fr \(fin [0-9-]+, en impayé, sans facture lisible : écrire au support\)/.test(journal)
      && /h\*+@exemple-844\.fr \(fin [0-9-]+, déjà abonnée, dont un abonnement en impayé\)/.test(journal)
      && /j\*+@exemple-844\.fr \(fin [0-9-]+, déjà abonnée\)/.test(journal)
      && new RegExp('k\\*+@exemple-844\\.fr \\(fin [0-9-]+, déjà abonnée, résiliée au ' + jour(20) + '\\)').test(journal)
      && /i\*+@exemple-844\.fr \(fin [0-9-]+, \d+ utilisateur\(s\), [^)]+\)/.test(journal)
      && !/\w@exemple-844\.fr/.test(journal.replace(/\*+@exemple-844\.fr/g, '')));
    const m1 = marques();
    v('   la marque « prévenue » est posée sur les ' + N1 + ' (une seule fois par échéance)', Object.keys(ENT).map(m1), Object.keys(ENT).map(() => FIN));
    await arreter();

    console.log('\n2. Stripe illisible : le rappel attend, puis part SANS la promesse quand il ne peut plus attendre');
    /* deux entreprises neuves (entrées pendant l'arrêt) : zeta a encore le temps (fin dans 5 jours), yota non (fin dans 2 jours :
       la limite de la promesse, l'avant-veille, c'est aujourd'hui) */
    espaces.zeta = { t: 't-zeta-844', nom: 'Zeta Panne', email: 'zeta@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    espaces.yota = { t: 't-yota-844', nom: 'Yota Panne', email: 'yota@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    for (const s of Object.keys(ENT)) espaces[s].rappelFin = FIN;   // prévenues au passage d'avant
    periode('t-zeta-844'); usages['ESSAI-BANC-844'].equipes['t-yota-844'] = { date: jour(-80), finLe: jour(2), em: '' }; usages['ESSAI-BANC-844'].n++;
    ecrire();
    const avant2 = facteurSrv.recus.length;
    vrai('le serveur redémarre, Stripe en panne (500 à chaque appel)', await demarrer('panne'));
    await attendre(2);
    const R2 = lus(avant2);
    v('(population) un seul courriel : yota (fin dans 2 jours) — zeta attend, les ' + N1 + ' déjà prévenues, rien', R2.map(x => x.a), ['yota@exemple-844.fr']);
    const Y = (R2[0] || {}).m || '';
    vrai('⛔ yota : le courriel habituel (on ne sait pas si elle a payé : on ne lui dit pas qu\'elle est abonnée)', /Plus que quelques jours/.test(Y) && PAIEMENT.test(Y));
    vrai('⛔   SANS la promesse « rien n\'est prélevé avant… » (elle a peut-être déjà payé)', !!Y && !PROMESSE.test(Y));
    vrai('   le journal le dit : « Stripe illisible : sans la promesse »', /y\*+@exemple-844\.fr \(fin [0-9-]+, \d+ utilisateur\(s\), [^)]+, Stripe illisible : sans la promesse\)/.test(journal));
    vrai('⛔ zeta : rien — « reporté » au journal, et PAS de marque (le passage suivant réessaie)',
      /rappel échéance reporté → z\*+@exemple-844\.fr \(fin [0-9-]+, Stripe illisible : nouvel essai au prochain passage\)/.test(journal) && !marques()('zeta'));
    await arreter();

    console.log('\n2 bis. Une liste Stripe PÉRIMÉE (la dernière connue, pendant une panne) ne décide rien');
    /* vieux (en essai chez Stripe : une liste fraîche la dirait abonnée). La liste est lue une fois (état d'omicron, sans
       période : `espacePaye` va jusqu'à Stripe), puis Stripe tombe ; le passage (3 s après) la trouve vieille de plus d'une
       seconde (la fenêtre du banc) : on ne sait plus rien, le rappel attend. */
    espaces.vieux = { t: 't-vieux-844', nom: 'Vieux Cache', email: 'vieux@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    espaces.zeta.rappelFin = FIN; espaces.yota.rappelFin = jour(2);   // hors de cette phase
    periode('t-vieux-844');
    ecrire();
    const avant2b = facteurSrv.recus.length;
    vrai('le serveur redémarre (Stripe répond une fois, puis 500 ; fenêtre du cache 1 s, passage 3 s après)',
      await demarrer('puis-panne', { TEAMOP_STRIPE_CACHE_MS: '1000', TEAMOP_RAPPELS_DELAI_MS: '3000' }));
    const etat = await fetch(B + '/api/espaces/etat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ t: 't-omicron-844' }) })
      .then(r => r.json()).catch(() => ({}));
    vrai('(population) la liste est lue une fois, fraîche : omicron se lit « payé » par Stripe', etat.paye === true && /abonnement Stripe/.test(String(etat.motif || '')));
    await attendre(1);
    vrai('⛔ vieux : rien — la liste a plus d\'une seconde (la fenêtre), un paiement fait depuis n\'y serait pas',
      lus(avant2b).length === 0 && /rappel échéance reporté → v\*+@exemple-844\.fr/.test(journal) && !marques()('vieux'));
    await arreter();

    console.log('\n2 ter. Un impayé dont Stripe ne répond pas à la RELECTURE : on attend, puis on part sans lien');
    /* la liste se lit (elle dit « impayé »), la relecture de l'abonnement échoue (500) : on ne sait ni s'il a été réglé depuis,
       ni où est sa facture. wau a encore le temps (fin dans 5 jours) : elle attend. fau non (fin dans 2 jours) : elle part,
       sans lien de facture — et SURTOUT pas vers la page de paiement. */
    espaces.vieux.rappelFin = FIN;
    espaces.wau = { t: 't-wau-844', nom: 'Wau Relecture', email: 'wau@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    espaces.fau = { t: 't-fau-844', nom: 'Fau Relecture', email: 'fau@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    periode('t-wau-844'); usages['ESSAI-BANC-844'].equipes['t-fau-844'] = { date: jour(-80), finLe: jour(2), em: '' }; usages['ESSAI-BANC-844'].n++;
    ecrire();
    const avant2t = facteurSrv.recus.length;
    vrai('le serveur redémarre (la liste Stripe se lit, la relecture d\'un abonnement rend 500)', await demarrer('relecture-panne'));
    await attendre(2);
    const R2t = lus(avant2t);
    vrai('(population) les deux relectures ont été tentées', /banc-stripe: relecture sub_t-wau-844/.test(journal) && /banc-stripe: relecture sub_t-fau-844/.test(journal));
    v('(population) un seul courriel : fau (fin dans 2 jours) — wau attend', R2t.map(x => x.a), ['fau@exemple-844.fr']);
    vrai('⛔ wau : rien — « reporté » au journal, et PAS de marque (le passage suivant relit)',
      /rappel échéance reporté → w\*+@exemple-844\.fr \(fin [0-9-]+, impayé : facture illisible, nouvel essai au prochain passage\)/.test(journal) && !marques()('wau'));
    const Fa = (R2t[0] || {}).m || '';
    vrai('⛔ fau : l\'avertissement de l\'impayé et à qui écrire — ni facture devinée, ni page de paiement, ni promesse',
      /un prélèvement est à régler/.test(objet((R2t[0] || {}).brut)) && /n'a pas abouti/.test(Fa) && Fa.includes('Pour le régler, écrivez-nous à contact@teamop.fr.')
      && !/invoice\.stripe\.com/.test(Fa) && !PAIEMENT.test(Fa) && !PROMESSE.test(Fa) && !/prend le relais/.test(Fa));
    await arreter();
    espaces.wau.rappelFin = FIN; espaces.fau.rappelFin = jour(2);   // hors des phases suivantes

    console.log('\n3. Une entreprise supprimée depuis la Tour PENDANT que le serveur attend Stripe');
    /* sigma d'abord, tau ensuite (l'ordre du registre des codes) : c'est pendant l'attente de sigma qu'on la supprime ; toutes
       les autres sont marquées « prévenues », pour que sigma soit la première à attendre.
       ⛔ LA COURSE SE JOUE AU GESTE DU BANC, JAMAIS AU CHRONOMÈTRE. Jusqu'au 29 septembre 2026, Stripe « lent » répondait en
       3 s et le banc pariait que la connexion de la Tour et la suppression tiendraient dedans. Mesuré ce soir-là : l'horloge
       de conservation lit Stripe dès le démarrage (0,25 s), le passage attendait CETTE lecture, et la suppression — qui
       appelle vraiment Google — rendait à 3,03 s pour une fenêtre fermée à 3,24 s. Sur GitHub, elle est passée derrière
       (run 518 de « Vérification des pages », sur main) : le serveur était juste, le banc pariait. Le Stripe du banc RETIENT
       désormais la lecture du passage jusqu'à ce que le banc la relâche (`tenir`, `porte`). */
    espaces.sigma = { t: 't-sigma-844', nom: 'Sigma Supprimée', email: 'sigma@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    espaces.tau = { t: 't-tau-844', nom: 'Tau Suivante', email: 'tau@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    periode('t-sigma-844'); periode('t-tau-844');
    ecrire();
    const avant3 = facteurSrv.recus.length;
    porte(0);
    vrai('le serveur redémarre, Stripe RETENU par le banc pour le passage des rappels', await demarrer('retenu', RETENU));
    const n3 = await tenir(/^\/v1\/subscriptions$/);
    vrai('(population) le passage attend Stripe — sa lecture est retenue par le banc, rien n\'est encore parti', n3 > 0 && issues() === 0);
    const appel = async (chemin, corps, jeton) => { const r = await fetch(B + chemin, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}), body: JSON.stringify(corps) });
      return { s: r.status, j: await r.json().catch(() => ({})) }; };
    const PATRON = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-844' })).j.token;
    const sup = await appel('/api/monitor/entreprise/supprimer', { t: 't-sigma-844', confirme: true }, PATRON);
    v('la Tour supprime sigma pendant l\'attente', sup.s, 200);
    vrai('   Stripe n\'a toujours pas répondu (la lecture attend le banc) — aucun rappel n\'est parti', n3 > 0 && !relache(n3) && issues() === 0);
    porte(1e6);
    for (let i = 0; i < 150 && !lus(avant3).some(x => x.a === 'tau@exemple-844.fr'); i++) await dormir(100);
    await dormir(1500);
    const R3 = lus(avant3);
    v('(population) ce passage ne prévient que tau : sigma était la première à attendre, et la seule avant elle', rappels(avant3).map(x => x.a), ['tau@exemple-844.fr']);
    vrai('⛔ sigma, supprimée pendant l\'attente, ne reçoit PAS le rappel', !R3.some(x => x.a === 'sigma@exemple-844.fr'));
    vrai('⛔ tau, la suivante, reçoit le sien (le passage ne s\'est pas arrêté sur l\'entrée disparue)', R3.some(x => x.a === 'tau@exemple-844.fr' && /Plus que quelques jours/.test(x.m)));
    vrai('   aucune erreur de la boucle au journal', !/rappelsEcheances/.test(journal));
    await arreter();

    console.log('\n4. La Tour règle l\'abonnement à la main PENDANT que le serveur attend Stripe');
    /* mutee, active chez Stripe : la décision prise avant l'attente dit « abonnée ». Pendant l'attente, la Tour pose
       « impayé » (`/api/monitor/espaces/abonnement`, qui modifie la fiche sur place) : Stripe ne décide plus rien pour elle,
       la décision d'avant ne vaut plus — elle attend le passage suivant, sans marque. Un TÉMOIN la suit dans le registre des
       codes : son rappel prouve que le passage est allé au-delà de mutee (sans lui, « mutee ne reçoit rien » passait aussi
       sur un passage qui n'avait pas fini). */
    espaces.mutee = { t: 't-mutee-844', nom: 'Mutee', email: 'mutee@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    espaces.temoin4 = { t: 't-temoin4-844', nom: 'Témoin Quatre', email: 'temoin4@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    const e4 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    for (const k of Object.keys(e4)) if (!e4[k].rappelFin && k !== 'mutee') e4[k].rappelFin = FIN;   // tau, et les autres : prévenues
    e4.mutee = espaces.mutee; e4.temoin4 = espaces.temoin4;
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(e4));
    const u4 = JSON.parse(fs.readFileSync(path.join(D, 'promos-usages.json'), 'utf8'));
    u4['ESSAI-BANC-844'].equipes['t-mutee-844'] = { date: jour(-80), finLe: FIN, em: '' }; u4['ESSAI-BANC-844'].n++;
    u4['ESSAI-BANC-844'].equipes['t-temoin4-844'] = { date: jour(-80), finLe: FIN, em: '' }; u4['ESSAI-BANC-844'].n++;   // APRÈS mutee
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(u4));
    const avant4 = facteurSrv.recus.length;
    porte(0);
    vrai('le serveur redémarre, Stripe RETENU par le banc pour le passage des rappels', await demarrer('retenu', RETENU));
    const n4 = await tenir(/^\/v1\/subscriptions$/);
    vrai('(population) le passage attend Stripe — mutee est en cours de traitement, rien n\'est encore parti', n4 > 0 && issues() === 0);
    const PATRON4 = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-844' })).j.token;
    const regle = await appel('/api/monitor/espaces/abonnement', { nom: 'mutee', formule: 'premium', statut: 'impaye' }, PATRON4);
    vrai('la Tour pose « impayé » sur mutee pendant l\'attente (200)', regle.s === 200 && regle.j.statut === 'impaye');
    vrai('   Stripe n\'a toujours pas répondu (la lecture attend le banc) — aucun rappel n\'est parti', n4 > 0 && !relache(n4) && issues() === 0);
    porte(1e6);
    for (let i = 0; i < 150 && !lus(avant4).some(x => x.a === 'temoin4@exemple-844.fr'); i++) await dormir(100);
    await dormir(1000);
    v('(population) le passage est allé au bout : le témoin, qui suit mutee, a son rappel — et lui seul', rappels(avant4).map(x => x.a), ['temoin4@exemple-844.fr']);
    vrai('⛔ mutee ne reçoit PAS « votre abonnement prend le relais » (décidé avant le réglage de la Tour) — rien à ce passage, ni marque',
      !lus(avant4).some(x => x.a === 'mutee@exemple-844.fr') && !marques()('mutee'));
    vrai('   aucune erreur de la boucle au journal', !/rappelsEcheances/.test(journal));
    await arreter();

    console.log('\n5. La Tour supprime une entreprise en impayé PENDANT que le serveur lit sa facture');
    /* stigma, en impayé : la liste se lit (le banc la relâche), puis sa facture se relit (le banc la TIENT). On la supprime
       pendant cette relecture : l'attente de la facture rend la main au serveur, et la décision prise avant ne vaut plus —
       elle ne reçoit rien, et rien n'est marqué. Un témoin la suit, comme en 4. */
    const e5 = JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));
    for (const k of Object.keys(e5)) if (!e5[k].rappelFin) e5[k].rappelFin = FIN;   // mutee et les autres : prévenues
    e5.stigma = { t: 't-stigma-844', nom: 'Stigma Supprimée', email: 'stigma@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    e5.temoin5 = { t: 't-temoin5-844', nom: 'Témoin Cinq', email: 'temoin5@exemple-844.fr', ts: MAINTENANT - 1000, formule: 'premium' };
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(e5));
    const u5 = JSON.parse(fs.readFileSync(path.join(D, 'promos-usages.json'), 'utf8'));
    u5['ESSAI-BANC-844'].equipes['t-stigma-844'] = { date: jour(-80), finLe: FIN, em: '' }; u5['ESSAI-BANC-844'].n++;
    u5['ESSAI-BANC-844'].equipes['t-temoin5-844'] = { date: jour(-80), finLe: FIN, em: '' }; u5['ESSAI-BANC-844'].n++;   // APRÈS stigma
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(u5));
    const avant5 = facteurSrv.recus.length;
    porte(0);
    vrai('le serveur redémarre, Stripe RETENU par le banc pour le passage des rappels', await demarrer('retenu', RETENU));
    const n5 = await tenir(/^\/v1\/subscriptions\/sub_t-stigma-844$/);   // la liste est relâchée, la relecture de SA facture tenue
    vrai('(population) le passage lit la facture de stigma (tenue par le banc, après la liste) — rien n\'est encore parti', n5 > 1 && issues() === 0);
    const PATRON5 = (await appel('/api/monitor/login', { nom: 'Patron', pass: 'mot-de-passe-844' })).j.token;
    const sup5 = await appel('/api/monitor/entreprise/supprimer', { t: 't-stigma-844', confirme: true }, PATRON5);
    v('la Tour supprime stigma pendant la lecture de sa facture', sup5.s, 200);
    vrai('   la facture n\'est toujours pas lue (la relecture attend le banc) — aucun rappel n\'est parti', n5 > 1 && !relache(n5) && issues() === 0);
    porte(1e6);
    for (let i = 0; i < 150 && !lus(avant5).some(x => x.a === 'temoin5@exemple-844.fr'); i++) await dormir(100);
    await dormir(1000);
    vrai('(population) la facture a bien été relue', /banc-stripe: relecture sub_t-stigma-844/.test(journal));
    v('(population) le passage est allé au bout : le témoin, qui suit stigma, a son rappel — et lui seul', rappels(avant5).map(x => x.a), ['temoin5@exemple-844.fr']);
    vrai('⛔ stigma, supprimée pendant la lecture de sa facture, ne reçoit PAS le rappel (ni la facture d\'une entreprise qui n\'existe plus)',
      !lus(avant5).some(x => x.a === 'stigma@exemple-844.fr'));
    vrai('   aucune erreur de la boucle au journal', !/rappelsEcheances/.test(journal));
  } finally { if (enfant) await arreter(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a planté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
