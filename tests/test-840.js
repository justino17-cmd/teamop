/* ⛔ CE QUE CE FICHIER GARDE — LE RAPPEL DES 7 JOURS AVANT LA FIN D'UN CODE PROMO, SUR LE VRAI SERVEUR.

   Justin, 28 septembre 2026 : « à l'expiration du code, il faudra bien leur renvoyer un mail … des mails automatiques
   sept jours avant l'expiration : tant d'utilisateurs trouvés chez vous, si vous poursuivez votre abonnement, payer la
   somme de chaque utilisateur ». Le rappel EXISTAIT (`rappelsEcheances`, toutes les 6 heures) mais ne disait ni le
   nombre d'utilisateurs ni la somme : « choisissez votre abonnement », vers le portail. Aucun banc ne le jouait.
   Ce qu'on garde ici, en faisant tourner le vrai serveur contre un facteur SMTP de banc :
     · le NOMBRE : les utilisateurs actifs de l'entreprise — son annuaire de connexion (`comptes.json`), que
       l'application dépose en prouvant sa clé —, la FORMULE du code et la SOMME, par mois et à l'année ;
     · le lien de paiement prérempli (formule, nombre) ; sans annuaire, aucun nombre inventé ;
     · À QUI il ne part PAS : période encore loin ou déjà finie, entreprise sans adresse, entreprise fermée,
       entreprise dont l'abonnement réglé à la main dans la Tour court au-delà du code, entreprise déjà prévenue
       sous un autre de ses noms ;
     · une seule fois par échéance, même après un redémarrage — et un envoi REFUSÉ se retente au passage suivant
       (avant, la marque posée avant l'envoi le perdait pour toujours) ;
     · la grille de prix du serveur est celle de la page de paiement (`recap-abonnement.html`) : deux grilles
       finissent par dire deux prix ;
     · (`gardien`, même jour) un code retiré de la configuration n'annonce AUCUN prix (le repli sur Premium chiffrait
       50 € un code Pro) ; un client refusé par sa messagerie pendant que la copie passe n'est pas dit « prévenu » ; et
       le journal ne recopie jamais l'adresse qu'un serveur d'e-mails cite dans son refus.
   Rien ne sort d'ici : 127.0.0.1, un facteur de banc, des entreprises fictives. Ce fichier ne lit qu'une page, la page
   de paiement (pour sa grille) : il part avec le déploiement du serveur seul. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b840-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 120000).unref();

/* Le facteur du banc (celui de `test-833`, point doublé compris — RFC 5321 §4.5.2). Humeur `refuse` : un 550 à
   l'expéditeur, comme un serveur d'e-mails qui dit non — et qui CITE une adresse, comme le font les vrais (« 554 5.7.1
   <client@…> ») : c'est ce qui voit une adresse passer en clair dans le journal. Et en tout temps, une adresse dont la
   boîte n'existe pas (`…-inconnue@`) est refusée au RCPT : la copie cachée passe, le client non. */
function facteur() {
  const recus = [];
  const f = { recus, mode: 'normal' };
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
        else if (h.startsWith('MAIL FROM') && f.mode === 'refuse') c.write('550 5.7.1 <omicron@exemple-840.fr>: refusé par le facteur du banc\r\n');
        else if (h.startsWith('RCPT TO') && /-inconnue@/i.test(l)) c.write('550 5.1.1 <lambda-inconnue@exemple-840.fr>: boîte inconnue\r\n');
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
/* Le quoted-printable replié, décodé (le point doublé est déjà retiré par le facteur). */
const lisible = (m) => Buffer.from(String(m || '').replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
/* L'en-tête « To: » d'un message (les copies cachées n'y figurent pas). */
const destinataire = (m) => ((/^To: *(.+)$/m.exec(String(m || '')) || [])[1] || '').trim();
/* L'objet d'un message BRUT (pas passé par `lisible`, qui défait les « =XX » des mots encodés) : l'en-tête déplié, ses
   mots encodés (=?UTF-8?Q?…?= ou =?UTF-8?B?…?=) décodés et recollés — l'espace ENTRE deux mots encodés ne compte pas. */
function objet(brut) {
  const l = String(brut || '').split('\n'); let s = null;
  for (const x of l) { if (s === null) { if (/^Subject:/i.test(x)) s = x.replace(/^Subject: */i, ''); continue; } if (/^[ \t]/.test(x)) s += x; else break; }
  const mot = /=\?UTF-8\?([QB])\?([^?]*)\?=/gi;
  const dec = (e, x) => e.toUpperCase() === 'B' ? Buffer.from(x, 'base64').toString('utf8')
    : Buffer.from(x.replace(/_/g, ' ').replace(/=([0-9A-F]{2})/gi, (_, h) => String.fromCharCode(parseInt(h, 16))), 'latin1').toString('utf8');
  return String(s || '').replace(/\?=[ \t]+=\?/g, '?==?').replace(mot, (_, e, x) => dec(e, x));
}
/* Une adresse EN CLAIR du banc (la forme masquée du journal, « o***@… », n'en est pas une) */
const ADRESSE_EN_CLAIR = /\w@exemple-840\.fr/;

console.log('\n── 840 · le rappel des 7 jours : le nombre d\'utilisateurs, la somme, et à qui il ne part pas ──');
(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) { console.log('  … SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  /* ══ 0. LA GRILLE DE PRIX : celle du serveur est celle de la page de paiement ══════════════════════════════ */
  console.log('\n0. Une seule grille de prix');
  const sansCommentaires = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const SRV = sansCommentaires(fs.readFileSync(SERVEUR, 'utf8'));
  const RECAP = sansCommentaires(fs.readFileSync(path.join(RACINE, 'recap-abonnement.html'), 'utf8'));
  const grilleSrv = (() => { const m = /const PRIX_ABO_MOIS = \{ *pro: *(\d+), *business: *(\d+), *premium: *(\d+) *\};/.exec(SRV); return m ? { pro: +m[1], business: +m[2], premium: +m[3] } : null; })();
  const moisOffertsSrv = (() => { const m = /const MOIS_OFFERTS_ANNEE = (\d+);/.exec(SRV); return m ? +m[1] : null; })();
  const grillePage = {};
  for (const f of ['pro', 'business', 'premium']) { const m = new RegExp('\\n  ' + f + ': \\{[\\s\\S]*?prixMensuel: (\\d+),').exec(RECAP); grillePage[f] = m ? +m[1] : null; }
  const moisOffertsPage = (() => { const m = /const REMISE_ANNUELLE = (\d+);/.exec(RECAP); return m ? +m[1] : null; })();
  vrai('la grille du serveur est trouvée (population : trois formules et les mois offerts)', grilleSrv && moisOffertsSrv !== null);
  v('le prix d\'un abonnement, formule par formule, est celui de la page de paiement', grilleSrv, grillePage);
  v('les mois offerts à l\'année aussi', moisOffertsSrv, moisOffertsPage);

  /* ══ 1. LE FACTEUR ET LES DONNÉES ═════════════════════════════════════════════════════════════════════ */
  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const jour = (d) => new Date(Date.now() + d * 86400000).toISOString().slice(0, 10);
  const fr = (iso) => iso.split('-').reverse().join('/');
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  const MAINTENANT = Date.now();
  /* [identifiant, nom, adresse, code, fin de période (jours), réglages en plus] — des entreprises fictives */
  const ENT = {
    omicron: ['t-omicron-840', 'Omicron Hygiène', 'omicron@exemple-840.fr', 'ESSAI-PREMIUM-840', 5],
    pi: ['t-pi-840', 'Pi Nettoyage', 'pi@exemple-840.fr', 'ESSAI-BUSINESS-840', 2, { formule: 'business' }],   // la fiche porte la formule de son code
    rho: ['t-rho-840', 'Rho Services', 'rho@exemple-840.fr', 'ESSAI-PREMIUM-840', 6],       // sans annuaire
    sigma: ['t-sigma-840', 'Sigma Loin', 'sigma@exemple-840.fr', 'ESSAI-PREMIUM-840', 20],  // encore loin
    tau: ['t-tau-840', 'Tau Fini', 'tau@exemple-840.fr', 'ESSAI-PREMIUM-840', -1],          // déjà finie
    upsilon: ['t-upsilon-840', 'Upsilon Sans Adresse', '', 'ESSAI-PREMIUM-840', 3],        // sans adresse
    phi: ['t-phi-840', 'Phi Fermée', 'phi@exemple-840.fr', 'ESSAI-PREMIUM-840', 4],         // fermée par TEAM OP
    chi: ['t-chi-840', 'Chi Couverte', 'chi@exemple-840.fr', 'ESSAI-PREMIUM-840', 4, { aboStatut: 'actif', aboFin: '' }],
    psi: ['t-psi-840', 'Psi Essai Court', 'psi@exemple-840.fr', 'ESSAI-PREMIUM-840', 4, { aboStatut: 'essai', aboFin: jour(2) }],
    omega: ['t-omega-840', 'Omega Prévenue', 'omega@exemple-840.fr', 'ESSAI-PREMIUM-840', 4],
    mu: ['t-mu-840', 'Mu Code Retiré', 'mu@exemple-840.fr', 'ESSAI-RETIRE-840', 3, { formule: 'gratuit' }],   // code retiré, fiche sans formule payante
    nu: ['t-nu-840', 'Nu Code Retiré', 'nu@exemple-840.fr', 'ESSAI-RETIRE-840', 3],                   // code retiré, fiche Business Premium
    xi: ['t-xi-840', 'Xi Descendue', 'xi@exemple-840.fr', 'ESSAI-PREMIUM-840', 3, { formule: 'business' }],   // code Premium CONNU, fiche Business
    eta: ['t-eta-840', 'Eta Au-dessus', 'eta@exemple-840.fr', 'ESSAI-BUSINESS-840', 3],   // code Business CONNU, fiche Business Premium
    lambda: ['t-lambda-840', 'Lambda Boîte Inconnue', 'lambda-inconnue@exemple-840.fr', 'ESSAI-PREMIUM-840', 3] };   // refusée au RCPT
  const espaces = {}, usages = {};
  for (const [slug, [t, nom, email, code, d, plus]] of Object.entries(ENT)) {
    espaces[slug] = Object.assign({ t, nom, code: code64(t), ts: MAINTENANT - 1000, formule: 'premium' }, email ? { email } : {}, plus || {});
    const u = usages[code] = usages[code] || { n: 0, equipes: {} };
    u.n++; u.equipes[t] = { date: jour(-80), finLe: jour(d), em: '' };
  }
  /* omega a DEUX noms : l'ancien porte déjà la marque du rappel — elle est prévenue, sous un autre nom */
  espaces.omegaancien = { t: 't-omega-840', nom: 'Omega Ancien', code: code64('t-omega-840'), ts: MAINTENANT - 90000, email: 'omega@exemple-840.fr', rappelFin: jour(4) };
  /* kappa a DEUX noms et deux adresses : le rappel part à l'adresse du nom le plus RÉCENT (celui que l'application lit),
     et la marque se pose sur les deux */
  espaces.kappaancien = { t: 't-kappa-840', nom: 'Kappa Ancien', code: code64('t-kappa-840'), ts: MAINTENANT - 90000, email: 'kappa-ancien@exemple-840.fr' };
  espaces.kappa = { t: 't-kappa-840', nom: 'Kappa Récent', code: code64('t-kappa-840'), ts: MAINTENANT, email: 'kappa@exemple-840.fr' };
  usages['ESSAI-PREMIUM-840'].equipes['t-kappa-840'] = { date: jour(-80), finLe: jour(3), em: '' }; usages['ESSAI-PREMIUM-840'].n++;
  /* rho partage son adresse avec une AUTRE entreprise (sans code, jamais prévenue) : payer sans référence ne choisit pas entre
     les deux — facturation immédiate —, donc son rappel ne promet PAS de facturation différée */
  espaces.rhobis = { t: 't-rhobis-840', nom: 'Rho Bis', code: code64('t-rhobis-840'), ts: MAINTENANT - 1000, formule: 'premium', email: 'rho@exemple-840.fr' };
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(espaces));
  fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(usages));
  fs.writeFileSync(path.join(D, 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: ['t-phi-840'], suspendus: [] }));
  const compte = (n) => ({ s: crypto.randomBytes(16).toString('hex'), e: crypto.randomBytes(32).toString('hex'), n });
  const annuaire = (noms) => ({ maj: MAINTENANT, c: Object.fromEntries(noms.map(x => [x.toLowerCase(), compte(x)])) });
  fs.writeFileSync(path.join(D, 'comptes.json'), JSON.stringify({
    't-omicron-840': annuaire(['Alain', 'Berthe', 'Camille', 'Dora', 'Emile', 'Fanny', 'Gaston']),   // 7 utilisateurs actifs
    't-pi-840': annuaire(['Solo']),                                                                   // 1
    't-kappa-840': annuaire(['Kim', 'Karl']),                                                         // 2
    't-psi-840': annuaire(['Paul', 'Pia', 'Pat']),                                                    // 3
    't-mu-840': annuaire(['Marc', 'Mia', 'Max', 'Mona']) }));                                          // 4

  /* ══ 2. LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════════ */
  const kh = k => crypto.createHash('sha256').update(k).digest('hex');
  const vap = webpush.generateVAPIDKeys();
  const CONF = { vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: kh('mot-de-passe-840'),
    notifDemandes: 'patron@banc-840.fr',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' },
    promos: [{ code: 'ESSAI-PREMIUM-840', formule: 'premium', mois: 3 }, { code: 'ESSAI-BUSINESS-840', formule: 'business', mois: 1 }] };
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify(CONF));
  const PORT = 9300 + (process.pid % 300);
  let journal = '';
  const demarrer = async () => {
    journal = '';
    enfant = spawn(process.execPath, [SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_RAPPELS_DELAI_MS: '1000' }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch('http://127.0.0.1:' + PORT + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  const arreter = async () => { const e = enfant; enfant = null; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
  /* Le premier passage part 1 s après le démarrage (`TEAMOP_RAPPELS_DELAI_MS`) : on attend qu'il ait fini — la marque
     posée, les envois rendus — plutôt qu'une durée au hasard.
     ⛔ ET « FINI » VEUT DIRE : CHAQUE ENVOI A SON ISSUE AU JOURNAL (29 septembre 2026). L'attente guettait la PREMIÈRE ligne
     « rappel échéance » et bornait le tout à six secondes : mesuré sous un disque chargé (une copie du dépôt, un `dd`), le
     passage dépassait la borne, le banc tombait à 11 ✓ 34 ✗ sur un serveur juste — et un banc de la liste du déploiement
     qui tombe au hasard bloque le VPS, puis se fait ignorer. On compte les issues (« envoyé », « REFUSÉ », « non
     parti ») : un envoi, une ligne ; la borne large (20 s) ne sert que quand le serveur est vraiment en faute. */
  const issues = (motif) => (journal.match(motif || /rappel échéance (envoyé|REFUSÉ)/g) || []).length;
  const attendrePassage = async (n) => { for (let i = 0; i < 200; i++) { if (facteurSrv.recus.length >= n && issues() >= n) break; await dormir(100); } await dormir(500); };
  const lireEsp = () => JSON.parse(fs.readFileSync(path.join(D, 'espaces.json'), 'utf8'));

  try {
    /* ══ 3. UN SERVEUR D'E-MAILS QUI REFUSE : rien n'est perdu, la marque se retire ══════════════════════════ */
    console.log('\n1. Un serveur d\'e-mails qui refuse : le rappel se retente au passage suivant');
    facteurSrv.mode = 'refuse';
    vrai('le serveur démarre (1er passage 1 s après, facteur qui refuse)', await demarrer());
    /* les DIX refus (un par envoi) — pas le premier : les marques s'effacent refus par refus */
    for (let i = 0; i < 200 && issues(/rappel échéance non parti/g) < 10; i++) await dormir(100);
    const MARQUEES = ['omicron', 'pi', 'rho', 'psi', 'kappa', 'kappaancien', 'mu', 'nu', 'xi', 'eta', 'lambda'];
    /* l'effacement suit la ligne du journal dans le même bloc synchrone du serveur : on relit l'annuaire jusqu'à ce qu'il
       l'ait écrit (5 s au plus — au-delà, c'est la marque qui ne s'efface pas, et le contrôle le dit) */
    let e1 = lireEsp();
    for (let i = 0; i < 50 && MARQUEES.some(s => e1[s].rappelFin); i++) { await dormir(100); e1 = lireEsp(); }
    v('aucun e-mail n\'a été accepté par le facteur', facteurSrv.recus.length, 0);
    vrai('le journal dit que le rappel n\'est PAS parti, POURQUOI (le motif du facteur), et qu\'il sera retenté',
      /rappel échéance non parti \(.*refusé par le facteur du banc.*\) — nouvel essai au prochain passage/.test(journal));
    vrai('⛔ … sans recopier en clair l\'adresse que le facteur cite dans son refus (`sansAdresses`)', /o\*+@exemple-840\.fr/.test(journal) && !ADRESSE_EN_CLAIR.test(journal));
    v('la marque posée avant l\'envoi s\'est RETIRÉE partout (sinon le rappel était perdu pour toujours)',
      MARQUEES.map(s => e1[s].rappelFin || null), [null, null, null, null, null, null, null, null, null, null, null]);
    v('   (population) les dix envois ont bien été tentés — et refusés, un par un', issues(/rappel échéance non parti/g), 10);
    v('… et la marque d\'omega, déjà prévenue sous son ancien nom, n\'a pas bougé', e1.omegaancien.rappelFin, jour(4));
    await arreter();

    /* ══ 4. LE PASSAGE QUI ENVOIE ═════════════════════════════════════════════════════════════════════════ */
    console.log('\n2. Le rappel part — à qui il doit, et dit ce qu\'il faut');
    facteurSrv.mode = 'normal';
    vrai('le serveur redémarre (facteur normal)', await demarrer());
    await attendrePassage(10);
    const recus = facteurSrv.recus.map(lisible);
    const dest = recus.map(destinataire).sort();
    v('DIX rappels, aux bonnes adresses (omicron, pi, rho, psi, kappa — la plus récente des deux —, mu, nu, xi, eta, et lambda dont seule la copie cachée passe)',
      dest, ['eta@exemple-840.fr', 'kappa@exemple-840.fr', 'lambda-inconnue@exemple-840.fr', 'mu@exemple-840.fr', 'nu@exemple-840.fr', 'omicron@exemple-840.fr', 'pi@exemple-840.fr', 'psi@exemple-840.fr', 'rho@exemple-840.fr', 'xi@exemple-840.fr']);
    vrai('⛔ aucun rappel à sigma (période encore loin), tau (finie), upsilon (sans adresse), phi (fermée), chi (abonnement de la Tour au-delà), omega (déjà prévenue), ni à l\'ancienne adresse de kappa',
      !recus.some(m => /(sigma|tau|phi|chi|omega|kappa-ancien)@exemple-840\.fr/.test(destinataire(m))));
    const de = (qui) => recus.find(m => destinataire(m) === qui + '@exemple-840.fr') || '';
    const O = de('omicron');
    const Obrut = facteurSrv.recus.find(m => destinataire(m) === 'omicron@exemple-840.fr') || '';
    v('omicron — l\'objet dit la date de fin', objet(Obrut), '⏳ Votre période offerte se termine le ' + fr(jour(5)) + ' — TEAM OP');
    vrai('omicron — le NOMBRE : 7 utilisateurs actifs (son annuaire), la formule du code : Business Premium',
      /7 utilisateurs actifs dans votre espace/.test(O) && /Formule <b>Business Premium<\/b> · un abonnement par utilisateur/.test(O));
    vrai('omicron — la SOMME, par mois : 7 × 50 € = 350 € TTC', /7 × 50 € = 350 € TTC par mois/.test(O));
    vrai('omicron — et à l\'année : 7 × 500 € = 3 500 € TTC (2 mois offerts)', /7 × 500 € = 3 500 € TTC \(2 mois offerts\)/.test(O));
    vrai('omicron — le bouton de paiement porte la formule et le nombre, et dit combien d\'abonnements',
      /href="https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=premium&amp;utilisateurs=7"/.test(O) && /Continuer avec 7 abonnements/.test(O));
    vrai('omicron — la version TEXTE dit la même chose (nombre, somme, lien)',
      /Nous avons trouvé 7 utilisateurs actifs dans votre espace/.test(O) && /7 × 50 € = 350 € TTC par mois/.test(O)
      && /Continuer : https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=premium&utilisateurs=7/.test(O));
    vrai('omicron — ce qui se passe sans abonnement, et la phrase pour qui a déjà payé',
      /* (v767 : plus de formule Gratuit — sans abonnement, l'accès est SUSPENDU jusqu'au règlement, les données restent) */
      new RegExp('Sans abonnement, après le ' + fr(jour(5)).replace(/\//g, '\\/') + ', l\'accès à l\'application sera suspendu jusqu\'au règlement — vos données sont conservées').test(O)
      && !/formule Gratuit/.test(O)
      && /Déjà abonné \? Rien à faire : votre abonnement prend le relais/.test(O));
    vrai('omicron — payer se fait avec l\'adresse qui reçoit le message (celle de l\'entreprise : « B »)', /connectez-vous avec l'adresse qui reçoit ce message/.test(O));
    /* ⛔ LE CLIENT CHOISIT SA FORMULE, DANS CE COURRIEL (Justin, 29 septembre 2026 : « à la fin du code promo, s'ils veulent
       changer la version, ils pourront le faire dans le [courriel] des sept jours ») : la formule d'aujourd'hui d'abord, puis
       les deux autres, chacune avec son prix, le total pour l'équipe et son lien — la page de paiement les accepte toutes */
    vrai('omicron — « gardez votre formule ou choisissez-en une autre »', /Pour continuer sans coupure, gardez votre formule ou choisissez-en une autre/.test(O));
    vrai('omicron — Pro, avec son prix, le total pour 7 et SON lien (formule=pro&utilisateurs=7)',
      /<b>Ou une autre formule, si elle vous convient mieux<\/b>/.test(O)
      && /href="https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=pro&amp;utilisateurs=7"[^>]*>Pro<\/a> · 15\u00a0€ TTC par mois et par utilisateur<span[^>]*> · 7 utilisateurs : 105\u00a0€<\/span>/.test(O));
    vrai('omicron — Business, pareil (25 €, 175 € pour 7, formule=business&utilisateurs=7)',
      /href="https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=business&amp;utilisateurs=7"[^>]*>Business<\/a> · 25\u00a0€ TTC par mois et par utilisateur<span[^>]*> · 7 utilisateurs : 175\u00a0€<\/span>/.test(O));
    vrai('omicron — la formule d\'aujourd\'hui n\'est pas proposée deux fois (aucun lien « Business Premium » parmi les autres)', !/>Business Premium<\/a>/.test(O));
    /* ⛔ DE NUIT, UN LIEN DANS UN CADRE SE LIT : le vert du jour (#1E7A4E) tombe à 3,3:1 sur le cadre de nuit (#0F1830) ;
       les liens des autres formules portent `m-lien`, que la feuille du courriel éclaircit en mode sombre */
    /* ⛔ la règle DANS le bloc sombre, et nulle part ailleurs (relecture adverse du 29 septembre 2026, rejoué) : le motif
       d'avant traversait les accolades, et une règle posée APRÈS le bloc — donc appliquée de jour, vert clair sur blanc,
       des liens illisibles — le laissait vert. Le bloc se découpe en comptant ses accolades. */
    const blocSombre = (h) => { const i = h.indexOf('@media (prefers-color-scheme:dark){'); if (i < 0) return null;
      let p = 0; for (let k = h.indexOf('{', i); k < h.length; k++) { if (h[k] === '{') p++; else if (h[k] === '}') { p--; if (!p) return h.slice(i, k + 1); } } return null; };
    const REGLE_LIEN = '.m-lien{color:#4FD196!important}';
    const sombre = blocSombre(O);
    vrai('omicron — de nuit, les liens des autres formules s\'éclaircissent : classe m-lien, et sa règle DANS le bloc sombre — une fois, jamais hors de lui (de jour, elle rendrait les liens illisibles)',
      (O.match(/<a href="[^"]*formule=(pro|business)[^"]*" class="m-lien"/g) || []).length === 2
      && !!sombre && sombre.split(REGLE_LIEN).length === 2 && O.split(REGLE_LIEN).length === 2);
    vrai('omicron — la version TEXTE propose aussi les deux autres, avec leurs liens',
      /Ou une autre formule, si elle vous convient mieux \(un abonnement par utilisateur\) :\n· Pro : 15\u00a0€ TTC par mois et par utilisateur — 7 utilisateurs : 105\u00a0€ TTC par mois\n  https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=pro&utilisateurs=7\n· Business : 25\u00a0€ TTC par mois et par utilisateur — 7 utilisateurs : 175\u00a0€ TTC par mois\n  https:\/\/teamop\.fr\/recap-abonnement\.html\?formule=business&utilisateurs=7/.test(O));
    const P = de('pi');
    vrai('pi — 1 utilisateur actif (au singulier), formule Business : 1 × 25 € = 25 €, 1 × 250 € = 250 € à l\'année',
      /1 utilisateur actif dans votre espace/.test(P) && /Formule <b>Business<\/b>/.test(P) && /1 × 25 € = 25 € TTC par mois/.test(P) && /1 × 250 € = 250 € TTC \(2 mois offerts\)/.test(P));
    vrai('pi — « Continuer avec 1 abonnement » (singulier), lien formule=business&utilisateurs=1',
      /Continuer avec 1 abonnement</.test(P) && /recap-abonnement\.html\?formule=business&amp;utilisateurs=1"/.test(P));
    const R = de('rho');
    vrai('rho — SANS annuaire : aucun nombre inventé, le prix par utilisateur, « Choisir mon abonnement »',
      !/utilisateurs? actifs?/.test(R) && /50 € TTC par mois et par utilisateur/.test(R) && /Choisir mon abonnement/.test(R)
      && /recap-abonnement\.html\?formule=premium"/.test(R));
    vrai('psi — son essai réglé dans la Tour finit AVANT le code : le rappel part bien (3 utilisateurs)', /3 utilisateurs actifs/.test(de('psi')));
    vrai('kappa — 2 utilisateurs, envoyé à l\'adresse du nom le plus récent', /2 utilisateurs actifs/.test(de('kappa')));
    /* ⛔ RIEN N'EST PRÉLEVÉ AVANT LA FIN DE LA PÉRIODE (Justin, 29 septembre 2026, « 2 oui ») : la page de paiement diffère la
       facturation (`finEssaiPeriode`), et le rappel le dit — le jour limite pour s'abonner (l'avant-veille de la fin : Stripe
       exige 48 h d'essai) et le jour du premier prélèvement (le lendemain de la fin). Seulement quand c'est VRAI : pas à une
       adresse que partagent deux entreprises (rho), pas quand la limite est aujourd'hui ou passée (pi, fin dans 2 jours). */
    const L = d => fr(jour(d - 2)).slice(0, 5), DB = d => fr(jour(d + 1));
    const promesseTxt = d => 'En vous abonnant au plus tard le ' + L(d) + ', rien n\'est prélevé avant le ' + DB(d) + ' : votre période offerte va jusqu\'au bout.';
    const promesseHtml = d => '💳 En vous abonnant au plus tard le <b>' + L(d) + '</b>, rien n\'est prélevé avant le <b>' + DB(d) + '</b> : votre période offerte va jusqu\'au bout.';
    vrai('⛔ omicron (fin dans 5 jours) — la version TEXTE promet : au plus tard le ' + L(5) + ', rien n\'est prélevé avant le ' + DB(5) + ' — entre le devis et le lien',
      O.includes(promesseTxt(5)) && O.indexOf(promesseTxt(5)) > O.indexOf('(2 mois offerts).') && O.indexOf(promesseTxt(5)) < O.indexOf('Continuer : https://'));
    vrai('   … et le HTML aussi, DANS le cadre du devis (avant « Ou une autre formule »)',
      O.includes(promesseHtml(5)) && O.indexOf(promesseHtml(5)) > O.indexOf('(2 mois offerts)</span>') && O.indexOf(promesseHtml(5)) < O.indexOf('<b>Ou une autre formule'));
    vrai('   kappa (fin dans 3 jours) : au plus tard le ' + L(3) + ', premier prélèvement le ' + DB(3), de('kappa').includes(promesseTxt(3)) && de('kappa').includes(promesseHtml(3)));
    const promet = m => /rien n'est prélevé avant le/.test(m);
    /* ⛔ ET À PSI, DEPUIS LE 30 SEPTEMBRE 2026 (`gardien` B1) : son essai réglé à la MAIN dans la Tour finit AVANT le code —
       le jour où la facturation commencerait (le lendemain de la période), il ne décide plus (`aboManuelDe(e, jour)`), la page
       de paiement diffère bien jusque-là (`finEssaiPeriode`), donc le courriel peut le promettre. Avant, le réglage lu au jour
       d'AUJOURD'HUI l'emportait : ni promesse, et une facturation immédiate de jours que le code couvrait encore. (Un essai
       qui court AU-DELÀ du code ne reçoit aucun rappel : chi, plus haut.) */
    v('⛔ la promesse part à qui elle est VRAIE — ni à rho (son adresse porte deux entreprises), ni à pi (la limite serait aujourd\'hui) ; à psi, oui (son essai réglé dans la Tour finit avant le code)',
      recus.filter(promet).map(destinataire).sort(), ['eta@exemple-840.fr', 'kappa@exemple-840.fr', 'lambda-inconnue@exemple-840.fr', 'mu@exemple-840.fr', 'nu@exemple-840.fr', 'omicron@exemple-840.fr', 'psi@exemple-840.fr', 'xi@exemple-840.fr']);
    vrai('   (population) rho et pi ont bien reçu leur rappel — sans la promesse', !!R && !!P && !promet(R) && !promet(P));
    vrai('⛔ psi : la promesse porte la fin de SON code (au plus tard le ' + L(4) + ', rien n\'est prélevé avant le ' + DB(4) + ')', de('psi').includes(promesseTxt(4)));
    /* ⛔ UN CODE RETIRÉ DE LA CONFIGURATION : sa formule n'est plus connue — aucun prix inventé (le repli sur Premium
       chiffrait 50 € par utilisateur une entreprise dont le code était peut-être un Pro) */
    const M = de('mu');
    vrai('mu — code retiré de la configuration : le NOMBRE (4 utilisateurs), et aucune formule présentée comme la SIENNE',
      /Nous avons trouvé 4 utilisateurs actifs dans votre espace/.test(M) && /un abonnement par utilisateur, dans la formule de votre choix/i.test(M)
      && !/Formule <b>/.test(M) && !/gardez votre formule/.test(M) && /Pour continuer sans coupure, choisissez votre formule/.test(M));
    vrai('mu — « Choisir mon abonnement », son bouton sans formule imposée (utilisateurs=4)',
      /Choisir mon abonnement/.test(M) && !/Continuer avec/.test(M) && /href="https:\/\/teamop\.fr\/recap-abonnement\.html\?utilisateurs=4"/.test(M));
    vrai('mu — les TROIS formules proposées, chacune avec son prix, le total pour 4 et son lien — aucune n\'est dite « la vôtre »',
      /<b>Choisissez votre formule<\/b>/.test(M)
      && /formule=pro&amp;utilisateurs=4"[^>]*>Pro<\/a> · 15\u00a0€ TTC par mois et par utilisateur<span[^>]*> · 4 utilisateurs : 60\u00a0€/.test(M)
      && /formule=business&amp;utilisateurs=4"[^>]*>Business<\/a> · 25\u00a0€ TTC par mois et par utilisateur<span[^>]*> · 4 utilisateurs : 100\u00a0€/.test(M)
      && /formule=premium&amp;utilisateurs=4"[^>]*>Business Premium<\/a> · 50\u00a0€ TTC par mois et par utilisateur<span[^>]*> · 4 utilisateurs : 200\u00a0€/.test(M)
      && /Les formules \(un abonnement par utilisateur\) :\n· Pro : /.test(M));
    vrai('mu — le journal le dit : « formule inconnue »', /rappel échéance envoyé → m\*+@exemple-840\.fr \(fin [0-9-]+, 4 utilisateur\(s\), formule inconnue\)/.test(journal));
    /* ⛔ LA FORMULE QUE LA PÉRIODE SERT D'ABORD — celle que l'entreprise utilise aujourd'hui (`formulePromo` : le code,
       jamais sous la fiche ; relecture adverse du 28 septembre, nuit : celle du code SEULE décrivait une formule que
       personne n'avait). Code retiré, fiche Business Premium : le courriel la présente, son lien l'ouvre, et les deux
       autres suivent. */
    const N = de('nu');
    vrai('nu — code retiré, fiche Business Premium : « Formule Business Premium », 50 € par utilisateur, lien formule=premium',
      /<b>Formule Business Premium<\/b>/.test(N) && /50\u00a0€ TTC par mois et par utilisateur/.test(N) && /recap-abonnement\.html\?formule=premium"/.test(N) && !/dans la formule de votre choix/.test(N));
    vrai('   … puis Pro et Business, avec leurs liens', /formule=pro"[^>]*>Pro<\/a>/.test(N) && /formule=business"[^>]*>Business<\/a>/.test(N) && !/>Business Premium<\/a>/.test(N));
    /* … et quand le code CONNU et la fiche diffèrent, c'est la formule SERVIE qui parle : un code Business Premium sur une
       fiche Business a servi Business Premium toute la période (« le plus gros forfait ») — c'est elle que le courriel
       présente en premier ; un code Business sur une fiche Business Premium ne la fait pas descendre */
    const X = de('xi');
    vrai('xi — code Business Premium, fiche Business : la période a servi Business Premium — « Formule Business Premium », 50 €, lien formule=premium',
      /<b>Formule Business Premium<\/b>/.test(X) && /50\u00a0€ TTC par mois et par utilisateur/.test(X) && /recap-abonnement\.html\?formule=premium"/.test(X) && !/<b>Formule Business<\/b>/.test(X));
    vrai('   … et Business, sa formule d\'avant, reste à un geste : proposée avec son lien', /formule=business"[^>]*>Business<\/a> · 25\u00a0€/.test(X));
    const H = de('eta');
    vrai('eta — code Business, fiche Business Premium : jamais sous la fiche — « Formule Business Premium », lien formule=premium',
      /<b>Formule Business Premium<\/b>/.test(H) && /recap-abonnement\.html\?formule=premium"/.test(H) && !/<b>Formule Business<\/b>/.test(H));
    /* ⛔ LE CLIENT REFUSÉ PENDANT QUE LA COPIE PASSE : l'envoi « réussit » — le journal ne le dit pas prévenu */
    vrai('lambda — refusée au RCPT, copie cachée passée : le journal dit REFUSÉ (adresse masquée), jamais « envoyé » pour elle',
      /rappel échéance REFUSÉ par la messagerie du client → l\*+@exemple-840\.fr \(fin [0-9-]+\) — à prévenir autrement/.test(journal)
      && !/rappel échéance envoyé → l\*+@exemple-840\.fr/.test(journal));
    const e2 = lireEsp();
    v('la marque est posée sur TOUS les noms prévenus (kappa : les deux) — lambda aussi : une boîte inconnue ne se retente pas',
      ['omicron', 'pi', 'rho', 'psi', 'kappa', 'kappaancien', 'mu', 'nu', 'xi', 'eta', 'lambda'].map(s => e2[s].rappelFin), [jour(5), jour(2), jour(6), jour(4), jour(3), jour(3), jour(3), jour(3), jour(3), jour(3), jour(3)]);
    v('… et nulle part ailleurs', ['sigma', 'tau', 'upsilon', 'phi', 'chi'].map(s => e2[s].rappelFin || null), [null, null, null, null, null]);
    v('le journal compte neuf envois (eta compris) et un refus (population), sans écrire une adresse en clair',
      [(journal.match(/rappel échéance envoyé →/g) || []).length, (journal.match(/rappel échéance REFUSÉ/g) || []).length, ADRESSE_EN_CLAIR.test(journal)], [9, 1, false]);
    fs.writeFileSync(path.join(banc, 'apercu-rappel.eml'), recus[0]);   // pour qui veut le regarder (le banc s'efface en sortant)
    await arreter();

    /* ══ 5. UNE SEULE FOIS PAR ÉCHÉANCE, MÊME APRÈS UN REDÉMARRAGE ════════════════════════════════════════════ */
    console.log('\n3. Une seule fois par échéance');
    /* ⛔ UN ZÉRO NE PROUVE RIEN SANS SA POPULATION (29 septembre 2026). « Aucun rappel de plus » se lisait après 2,5 s fixes :
       un passage retardé (disque chargé) le faisait passer sans avoir rien regardé. Une entreprise NEUVE, entrée pendant
       l'arrêt, doit recevoir le sien : c'est la preuve que le passage a tourné — et les dix déjà prévenues, rien. */
    const eZ = lireEsp();
    eZ.zeta = { t: 't-zeta-840', nom: 'Zeta Nouvelle', code: code64('t-zeta-840'), ts: MAINTENANT - 1000, formule: 'premium', email: 'zeta@exemple-840.fr' };
    fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify(eZ));
    const uZ = JSON.parse(fs.readFileSync(path.join(D, 'promos-usages.json'), 'utf8'));
    uZ['ESSAI-PREMIUM-840'].equipes['t-zeta-840'] = { date: jour(-80), finLe: jour(3), em: '' }; uZ['ESSAI-PREMIUM-840'].n++;
    fs.writeFileSync(path.join(D, 'promos-usages.json'), JSON.stringify(uZ));
    const avant = facteurSrv.recus.length;
    vrai('le serveur redémarre encore', await demarrer());
    for (let i = 0; i < 200 && !(facteurSrv.recus.length > avant && issues() >= 1); i++) await dormir(100);
    await dormir(1500);   // un doublon, s'il y en avait un, aurait le temps d'arriver
    const neufs = facteurSrv.recus.slice(avant).map(lisible).map(destinataire);
    v('   (population) le passage a tourné : l\'entreprise NEUVE, entrée pendant l\'arrêt, reçoit le sien', neufs.filter(d => d === 'zeta@exemple-840.fr').length, 1);
    v('aucun rappel de plus pour les dix déjà prévenues : la marque a survécu au redémarrage', neufs.filter(d => d !== 'zeta@exemple-840.fr'), []);
  } finally { if (enfant) await arreter(); }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a planté : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
