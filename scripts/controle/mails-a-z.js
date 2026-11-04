/* ESSAI DES MAILS DE A À Z — Justin, 4 novembre 2026 : « rien ne passe par nous […] teste tout, vérifie tout, il faut que ça marche ».

   Ce qui est RÉEL :
     · le serveur `server/index.js` (celui qu'on lui donne : SERVEUR=…), lancé isolé, avec ses vraies routes et son vrai stockage
       (dossier jetable) ;
     · la PAGE : `app.html` de la bêta en cours (APP_NEUVE=…) et celui de la production (APP_PROD=…), ouverts dans Chromium SOUS
       LEUR VRAIE ADRESSE (https://teamop.fr/app.html), qui appellent https://api.teamop.fr — Playwright détourne ces deux hôtes vers
       les fichiers locaux et vers le serveur local ; tout le reste du web est COUPÉ, et compté ;
     · les VRAIES fonctions d'envoi de la page (`envoiDoc`, `rapportVia`, `mailClientRdv`, `envoiBonEmail`, `factureMailPayee`,
       `mailConnect`/`mailDoConnect`, la rubrique « E-mails à tes clients »), appelées et cliquées dans la page.
   Ce qui est IMITÉ, et seulement ça :
     · le SMTP de TEAM OP : un « facteur » local qui garde l'ENVELOPPE (MAIL FROM, chaque RCPT TO — donc les copies cachées) et le
       message ; config.smtp pointe dessus ;
     · le SMTP de la BOÎTE DE L'ENTREPRISE : un second facteur, avec AUTH PLAIN vérifiée (mauvais mot de passe → 535), qui peut
       refuser un envoi (550). La connexion d'une boîte vise l'hôte du FOURNISSEUR (ssl0.ovh.net…), qui se déduit de l'adresse : un
       préchargement (`-r`) redirige tout `nodemailer.createTransport` vers un hôte autre que 127.0.0.1 sur ce facteur ;
     · l'IMAP de la boîte : `tests/faux-imap.js` (le module des bancs de la messagerie) ;
     · les appels au modèle (Anthropic) : comptés par le même préchargement — il ne doit y en avoir AUCUN.
   ⛔ 127.0.0.1 seulement, entreprise et adresses fictives, jamais teamop.fr ni api.teamop.fr pour de vrai.

   Usage : node scripts/controle/mails-a-z.js            (serveur et app.html du dépôt)
           SERVEUR=/chemin/server/index.js APP_PROD=/chemin/app.html node scripts/controle/mails-a-z.js
           CAPTURES=/dossier node …                       (captures 390/1440, jour/nuit) */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const DEPOT = path.join(__dirname, '..', '..');
const SERVEUR = path.resolve(process.env.SERVEUR || path.join(DEPOT, 'server', 'index.js'));
const RACINE_SRV = path.dirname(SERVEUR);
const APP_NEUVE = path.resolve(process.env.APP_NEUVE || path.join(DEPOT, 'app.html'));
const APP_PROD = process.env.APP_PROD ? path.resolve(process.env.APP_PROD) : null;
const CAPTURES = process.env.CAPTURES ? path.resolve(process.env.CAPTURES) : null;
const dormir = ms => new Promise(r => setTimeout(r, ms));
const borne = (p, ms, quoi) => Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error('FIGÉ : ' + quoi + ' sans réponse en ' + ms + ' ms')), ms))]);

let ok = 0, ko = 0; const lignes = [];
const v = (t, a, b) => { const r = JSON.stringify(a) === JSON.stringify(b); r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); return r; };
const vrai = (t, a, det) => { const r = !!a; r ? ok++ : ko++; console.log((r ? '  ✓ ' : '  ✗ ') + t + (r || det === undefined ? '' : '\n      détail : ' + JSON.stringify(det).slice(0, 600))); return r; };
const scen = {}; const scenario = (n, titre) => { console.log('\n── ' + n + '. ' + titre + ' ──'); const avant = ko; return (preuve) => { scen[n] = { titre, ok: ko === avant, preuve }; }; };

/* ── les fictifs : des jetons avec des lettres hors [0-9a-f] (CLAUDE.md : un jeton court tombe au hasard dans une empreinte) ── */
const T = 'clim-fictive-zqx', CLE = 'CLE-PRIVEE-ZQX-' + crypto.randomBytes(6).toString('hex');
const ENT = { nom: 'Clim Fictive Zqx', email: 'patron@clim-fictive-zqx.fr', adresse: '7 rue du Banc', cp: '17000', ville: 'Zqxville', siret: '12345678900011', tel: '0500000000' };
const BOITE = { email: 'contact@clim-fictive-zqx.fr', pass: 'bon-mot-de-passe-Zqx!' };
const CLIENT = { nom: 'Madame Kwazulu Zyx', email: 'mme-kwzyx@client-wkzyx.fr' };
const FOURN = { nom: 'Fournisseur Wyzk', email: 'commandes@fournisseur-wyzk.fr' };
const JETONS = ['kwzyx', 'Kwazulu', 'wkzyx', 'Wyzk', 'wyzk', 'DV-ZQX', 'FAC-ZQX', 'Rapport ZQX', 'Klimatiseur Zyxw', 'motZyxSecret'];
const ADRESSES_TEAMOP = ['contact@teamop.fr', 'support@teamop.fr', 'controle@teamop.fr', 'equipe@exemple.fr'];

/* ── un facteur SMTP : garde l'enveloppe, l'en-tête et le corps ; AUTH vérifiée si demandée ; refus d'envoi à la demande ── */
function facteur(o) {
  const f = { recus: [], refuser: false, authEchecs: 0 };
  f.s = net.createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '', de = '', a = [], authOk = !o.auth, attenteLogin = 0, userLogin = '';
    c.write('220 facteur\r\n');
    const verifier = (u, p) => { if (o.auth && u === o.auth.user && p === o.auth.pass) return true; f.authEchecs++; return false; };
    c.on('data', d => {
      tampon += d.toString('utf8'); let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        let l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) {
          if (l === '.') { corps = false; if (f.refuser) { c.write('550 5.7.1 Envoi refuse par le fournisseur (banc)\r\n'); } else { f.recus.push({ de, a: a.slice(), brut: msg }); c.write('250 ok\r\n'); } msg = ''; a = []; }
          else { if (l.startsWith('..')) l = l.slice(1); msg += l + '\n'; }
          continue;
        }
        if (attenteLogin === 1) { userLogin = Buffer.from(l, 'base64').toString(); attenteLogin = 2; c.write('334 UGFzc3dvcmQ6\r\n'); continue; }
        if (attenteLogin === 2) { attenteLogin = 0; const p = Buffer.from(l, 'base64').toString(); if (verifier(userLogin, p)) { authOk = true; c.write('235 ok\r\n'); } else c.write('535 5.7.8 Authentication failed: invalid credentials\r\n'); continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-facteur\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH PLAIN')) { const parts = Buffer.from(l.slice(11).trim(), 'base64').toString().split('\0'); if (!o.auth || verifier(parts[1], parts[2])) { authOk = true; c.write('235 ok\r\n'); } else c.write('535 5.7.8 Authentication failed: invalid credentials\r\n'); }
        else if (h.startsWith('AUTH LOGIN')) { attenteLogin = 1; c.write('334 VXNlcm5hbWU6\r\n'); }
        else if (h.startsWith('MAIL FROM')) { if (!authOk) { c.write('530 auth required\r\n'); continue; } de = l.slice(10).replace(/[<>]/g, '').split(' ')[0].trim(); c.write('250 ok\r\n'); }
        else if (h.startsWith('RCPT TO')) { a.push(l.slice(8).replace(/[<>]/g, '').trim().toLowerCase()); c.write('250 ok\r\n'); }
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}
const enTete = (brut, nom) => { const m = new RegExp('^' + nom + ':\\s*(.*(?:\\n[ \\t].*)*)', 'im').exec(brut.split('\n\n')[0] || ''); return m ? m[1].replace(/\n[ \t]+/g, ' ').trim() : ''; };
const adresseDe = s => { const m = /<([^>]+)>/.exec(s || ''); return (m ? m[1] : String(s || '')).trim().toLowerCase(); };
const libre = () => new Promise(r => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => r(p)); }); });

(async () => {
  const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'mails-a-z-'));
  const DATA = path.join(BANC, 'data'); fs.mkdirSync(DATA, { recursive: true });
  const enfants = [];
  const fin = () => { for (const e of enfants) try { e.kill('SIGKILL'); } catch (x) {} try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (x) {} };
  process.on('exit', fin);
  setTimeout(() => { console.log('  ✗ essai FIGÉ au-delà de 12 min'); process.exit(1); }, 12 * 60000).unref();

  let webpush, chromium;
  try { webpush = require(path.join(RACINE_SRV, 'node_modules', 'web-push')); } catch (e) { console.log('SAUTÉ : node_modules absent près du serveur'); process.exit(0); }
  try { ({ chromium } = require('playwright')); } catch (e) { console.log('SAUTÉ : playwright absent'); process.exit(0); }

  /* ── 1. facteurs, préchargement, configuration ── */
  const fTeam = facteur({}), fBoite = facteur({ auth: { user: BOITE.email, pass: BOITE.pass } });
  await new Promise(r => fTeam.s.listen(0, '127.0.0.1', r)); await new Promise(r => fBoite.s.listen(0, '127.0.0.1', r));
  const PT = fTeam.s.address().port, PB = fBoite.s.address().port;
  const MODELE = path.join(BANC, 'appels-modele.jsonl'); fs.writeFileSync(MODELE, '');
  const PRELOAD = path.join(BANC, 'prechargement.js');
  fs.writeFileSync(PRELOAD, `'use strict';
const nm = require(${JSON.stringify(path.join(RACINE_SRV, 'node_modules', 'nodemailer'))});
const vrai = nm.createTransport;
/* la boîte d'un FOURNISSEUR (son hôte se déduit de l'adresse) → le facteur « boîte de l'entreprise » du banc */
nm.createTransport = function (o) {
  if (o && typeof o === 'object' && o.host && o.host !== '127.0.0.1') o = Object.assign({}, o, { host: '127.0.0.1', port: ${PB}, secure: false, ignoreTLS: true, connectionTimeout: 4000 });
  return vrai.call(nm, o, ...Array.prototype.slice.call(arguments, 1));
};
const f0 = globalThis.fetch;
globalThis.fetch = async function (u, o) { const s = String(u && u.url || u);
  if (/anthropic\\.com|claude\\.ai/i.test(s)) { require('fs').appendFileSync(${JSON.stringify(MODELE)}, JSON.stringify({ ts: Date.now(), url: s.slice(0, 80) }) + '\\n'); throw new Error('banc : modèle coupé'); }
  if (!/^https?:\\/\\/(127\\.0\\.0\\.1|localhost)/.test(s)) throw new Error('banc : réseau coupé');
  return f0.apply(this, arguments); };`);
  const IMAP = path.join(BANC, 'imap.json'); fs.writeFileSync(IMAP, JSON.stringify({ boites: {} }));
  const vap = webpush.generateVAPIDKeys();
  const MDP_TOUR = 'tour-' + crypto.randomBytes(5).toString('hex'), sha = x => crypto.createHash('sha256').update(x).digest('hex');
  const API_KEY = 'cle-api-banc-' + crypto.randomBytes(16).toString('hex');
  fs.writeFileSync(path.join(BANC, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: API_KEY,
    adminPassHash: sha(MDP_TOUR), smtp: { host: '127.0.0.1', port: PT, secure: false, user: 'contact@teamop.fr', pass: 'x', from: '"TeamOP" <contact@teamop.fr>' },
    notifDemandes: 'contact@teamop.fr', documents: { copieFirebase: false } }));
  fs.writeFileSync(path.join(BANC, 'monitor.json'), JSON.stringify({ users: [{ id: 'upatronzq', nom: 'Patron', hash: sha(MDP_TOUR), role: 'patron', actif: true, ts: 1 }], issues: [], archive: [], journal: [], actions: [] }));
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  fs.writeFileSync(path.join(DATA, 'espaces.json'), JSON.stringify({ 'clim-fictive': { slug: 'clim-fictive', nom: ENT.nom, email: ENT.email, t: T, code: b64({ t: T, k: CLE }), formule: 'pro', quantite: 3, aboStatut: 'actif', aboPar: 'Banc', ts: Date.now() } }));

  const PORT = await libre();
  let journalSrv = '';
  const srv = spawn(process.execPath, ['-r', path.join(DEPOT, 'tests', 'faux-imap.js'), '-r', PRELOAD, SERVEUR], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(BANC, 'config.json'), TEAMOP_DATA: DATA, PORT: String(PORT),
      FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: RACINE_SRV, TEAMOP_FB_ADMIN: path.join(BANC, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:1/t',
      TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:1', TEAMOP_IDTK_URL: 'http://127.0.0.1:1/i', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:1/c',
      TEAMOP_MSG_BETA_URL: 'http://127.0.0.1:1', TEAMOP_MSG_PROD_URL: 'http://127.0.0.1:1' }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfants.push(srv); srv.stdout.on('data', d => journalSrv += d); srv.stderr.on('data', d => journalSrv += d);
  const B = 'http://127.0.0.1:' + PORT;
  let vivant = false; for (let i = 0; i < 150 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
  if (!vrai('le vrai serveur démarre, isolé', vivant)) { console.log(journalSrv.slice(-1500)); process.exit(1); }

  /* ── 2. le navigateur : teamop.fr et api.teamop.fr détournés, le reste coupé et compté ── */
  const browser = await chromium.launch();
  const horsBanc = [];
  const ouvrir = async (o) => {
    const ctx = await browser.newContext({ serviceWorkers: 'block', viewport: { width: o.w || 1440, height: o.h || 900 }, deviceScaleFactor: 1, colorScheme: o.nuit ? 'dark' : 'light',
      isMobile: !!o.tel, hasTouch: !!o.tel, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    const erreurs = [], appelsSendmail = [];
    page.on('pageerror', e => erreurs.push(e.message));
    page.on('dialog', d => { (page._dialogues = page._dialogues || []).push(d.message());
      if (d.type() === 'confirm') (page._confirmer ? d.accept() : d.dismiss()).catch(() => {}); else d.accept(o.prompt || '').catch(() => {}); });
    await ctx.route('**/*', async r => {
      const u = new URL(r.request().url());
      if (u.protocol === 'mailto:' || u.protocol === 'sms:') return r.abort();
      if (u.host === 'teamop.fr') {
        let f = u.pathname === '/app.html' ? o.app : path.join(DEPOT, decodeURIComponent(u.pathname));
        if (fs.existsSync(f) && fs.statSync(f).isFile()) return r.fulfill({ path: f });
        return r.fulfill({ status: 404, body: '' });
      }
      if (u.host === 'api.teamop.fr') {
        if (u.pathname === '/api/sendmail') appelsSendmail.push(r.request().postDataJSON());
        if (o.panneMailboxes && u.pathname === '/api/mailboxes') return r.fulfill({ status: 502, body: 'panne' });
        try { const resp = await r.fetch({ url: B + u.pathname + u.search }); return r.fulfill({ response: resp }); }
        catch (e) { return r.abort(); }
      }
      horsBanc.push(u.host); return r.abort();
    });
    await page.goto('https://teamop.fr/app.html', { timeout: 60000 });
    await page.waitForFunction(() => typeof db !== 'undefined' && document.getElementById('login'), null, { timeout: 30000 });
    await page.waitForTimeout(800);
    /* l'appareil rattaché à l'entreprise (synchro coupée : on éprouve les envois, pas la synchro), ses données posées */
    await page.evaluate(({ T, CLE, ENT, CLIENT, FOURN, role, sansAdresse }) => {
      localStorage.setItem('elan_sync_team', T); localStorage.setItem('elan_sync_secret', CLE); localStorage.setItem('elan_sync_on', '0');
      window.horsLigneDebut = function () {}; try { _horsLigne = false; } catch (e) {}
      const aujourdhui = new Date().toISOString().slice(0, 10);
      db.entreprise = Object.assign(db.entreprise || {}, ENT); if (sansAdresse) delete db.entreprise.email;
      const admin = db.users.find(u => u.role === 'admin'); admin.prenom = 'Paul'; admin.nom = 'Patron'; admin.email = ENT.email;
      if (!db.users.some(u => u.id === 'techzq')) db.users.push({ id: 'techzq', login: 'tech', prenom: 'Tom', nom: 'Technik', role: 'technicien', actif: true, pass: 'x' });
      db.clients = [{ id: 'cliZQ', nom: CLIENT.nom, contact: 'Madame Kwazulu', email: CLIENT.email, adresse: '1 rue Kwazulu', ville: 'Zqxville', tel: '0600000000' }];
      db.devis = [{ id: 'devZQ', num: 'DV-ZQX-001', clientId: 'cliZQ', date: aujourdhui, statut: 'brouillon', tva: 20, notes: 'Klimatiseur Zyxw', lignes: [{ designation: 'Klimatiseur Zyxw', qte: 1, pu: 900 }] }];
      db.factures = [{ id: 'facZQ', num: 'FAC-ZQX-001', clientId: 'cliZQ', devisId: '', date: aujourdhui, statut: 'brouillon', tva: 20, notes: 'Pose', lignes: [{ designation: 'Pose Klimatiseur Zyxw', qte: 1, pu: 300 }] },
                    { id: 'facZQ2', num: 'FAC-ZQX-002', clientId: 'cliZQ', devisId: '', date: aujourdhui, statut: 'payee', tva: 20, notes: 'Auto', lignes: [{ designation: 'Entretien', qte: 1, pu: 120 }] }];
      db.interventions = [{ id: 'intZQ', clientId: 'cliZQ', titre: 'Rapport ZQX entretien', type: 'Entretien', date: aujourdhui, heure: '09:00', statut: 'terminee', techIds: ['techzq'], adresse: '1 rue Kwazulu', constat: 'Rapport ZQX : filtres nettoyés', produitsUtilises: [] }];
      db.fournisseurs = [{ id: 'fouZQ', nom: FOURN.nom, email: FOURN.email }];
      db.bons = [{ id: 'bonZQ', num: 'BC-ZQX-001', fournisseurId: 'fouZQ', date: aujourdhui, statut: 'brouillon', lignes: [{ designation: 'Gaz R32 Wyzk', qte: 2, unite: 'u' }] }];
      db.mailBoxes = []; db.mailFrom = ''; db.mailReply = '';
      /* les comptes sont « en règle » : la campagne mot de passe / adresse (une fenêtre FORCÉE, que rien ne ferme) n'a rien à voir ici */
      db.users.forEach(u => { u.pwdHash = u.pwdHash || 'banc'; u.secu = SECU_MDP; u.mustChangePwd = false; u.email = u.email || (u.login + '@clim-fictive-zqx.fr'); });
      save();
      const u = role === 'admin' ? admin : db.users.find(x => x.id === 'techzq');
      enterApp(u);
    }, { T, CLE, ENT, CLIENT, FOURN, role: o.role || 'admin', sansAdresse: !!o.sansAdresse });
    await page.waitForTimeout(1200);
    return { ctx, page, erreurs, appelsSendmail };
  };
  /* ferme toute fenêtre ouverte et attend la fin d'un geste asynchrone */
  const ferme = async page => { await page.evaluate(() => { try { closeModal(); } catch (e) {} }); await page.waitForTimeout(250); };
  const modalTexte = page => page.evaluate(() => { const m = document.querySelector('#overlay.open .modal, #overlay.open'); return m ? m.innerText : ''; });
  const toastTexte = page => page.evaluate(() => Array.from(document.querySelectorAll('.toast, #toast, [class*=toast]')).map(x => x.innerText).join(' | '));
  const nTeam = () => fTeam.recus.length, nBoite = () => fBoite.recus.length;
  const recusPour = (f, adr) => f.recus.filter(m => m.a.includes(adr));

  try {
    /* ═══ 1. sans boîte : l'étape, et rien ne part ═══ */
    let fin1 = scenario(1, 'ni boîte ni adresse dans Mon entreprise : « Envoyer » un devis n\'envoie rien');
    let A = await ouvrir({ app: APP_NEUVE, sansAdresse: true });
    vrai('la page neuve est chargée (v796 ou plus) sans erreur', /^79[6-9]|^8/.test(await A.page.evaluate(() => APP_VERSION)) && !A.erreurs.length, A.erreurs);
    let t0 = nTeam(), b0 = nBoite();
    const p1 = A.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email'));
    await A.page.waitForSelector('#overlay.open', { timeout: 15000 }).catch(() => {});
    const etape = await modalTexte(A.page);
    vrai('l\'étape s\'ouvre avec les deux choix : l\'adresse de mon entreprise, ou connecter ma boîte', /adresse e-mail de ton entreprise/i.test(etape) && /où tes clients te répondront/.test(etape) && /Enregistrer et envoyer/.test(etape) && /Connecter ma boîte mail/.test(etape), etape.slice(0, 400));
    await ferme(A.page); const r1 = await borne(p1, 20000, 'envoiDoc après l\'étape');
    v('envoiDoc rend « non parti »', r1, false);
    v('aucun appel /api/sendmail', A.appelsSendmail.length, 0);
    v('le facteur TEAM OP n\'a rien reçu', nTeam() - t0, 0); v('… ni la boîte', nBoite() - b0, 0);
    v('le devis reste en brouillon (rien n\'est marqué envoyé)', await A.page.evaluate(() => db.devis[0].statut), 'brouillon');
    fin1('étape affichée, 0 appel /api/sendmail, 0 courriel aux deux facteurs, devis resté brouillon');

    /* ═══ 2. connecter la boîte : mauvais mot de passe refusé et dit, bon accepté, Paramètres « Connectée ✓ » ═══ */
    let fin2 = scenario(2, 'connecter la boîte de l\'entreprise');
    await A.page.evaluate(() => mailConnect());
    await A.page.fill('#mb-email', BOITE.email); await A.page.fill('#mb-pass', 'mauvais-mot-de-passe');
    await A.page.click('#mb-btn'); await A.page.waitForTimeout(2500);
    const refusTxt = (await modalTexte(A.page)) + ' ' + (await toastTexte(A.page)) + ' ' + (A.page._dialogues || []).join(' ');
    vrai('mauvais mot de passe : refusé, et l\'écran le dit', /refus|mot de passe|identifiant|Authentication/i.test(refusTxt), refusTxt.slice(0, 400));
    v('aucune boîte enregistrée au serveur', fs.existsSync(path.join(DATA, 'mailboxes.json')) ? Object.keys(JSON.parse(fs.readFileSync(path.join(DATA, 'mailboxes.json'), 'utf8') || '{}')).length : 0, 0);
    await ferme(A.page);
    await A.page.evaluate(() => mailConnect());
    await A.page.fill('#mb-email', BOITE.email); await A.page.fill('#mb-pass', BOITE.pass);
    await A.page.click('#mb-btn'); await A.page.waitForTimeout(2500);
    const boites = await A.page.evaluate(() => Array.isArray(_mailboxes) ? _mailboxes.map(b => b.email) : _mailboxes);
    v('bon mot de passe : la boîte est connectée (le serveur la liste)', boites, [BOITE.email]);
    await A.page.evaluate(() => go('parametres')); await A.page.waitForTimeout(1500);
    await A.page.evaluate(() => { try { envoiBoiteCarteMaj(); } catch (e) {} }); await A.page.waitForTimeout(1200);
    const carte = await A.page.evaluate(() => (document.getElementById('envoi-boite-etat') || {}).innerText || '');
    vrai('les Paramètres disent « Connectée : contact@… » (la coche est une icône : « ✓ » devient un SVG, CLAUDE.md)', /Connectée : contact@clim-fictive-zqx\.fr/.test(carte), carte);
    fin2('mot de passe faux → 400 et message à l\'écran, aucune boîte ; bon → boîte listée, Paramètres « Connectée ✓ »');

    /* ═══ 3. cinq documents, tous par la boîte de l'entreprise ═══ */
    let fin3 = scenario(3, 'devis, facture, rapport, rappel de RDV, bon de commande : par la boîte de l\'entreprise, sans copie');
    await A.page.evaluate(() => go('dashboard')); await A.page.waitForTimeout(600);
    t0 = nTeam(); b0 = nBoite();
    const gestes = [
      ['devis', () => A.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email')), CLIENT.email, true],
      ['facture', () => A.page.evaluate(() => envoiDoc('factures', 'facZQ', 'email')), CLIENT.email, true],
      ['rapport d\'intervention', () => A.page.evaluate(() => rapportVia('intZQ', 'email')), CLIENT.email, true],
      ['rappel de RDV', () => A.page.evaluate(() => { mailClientRdv('intZQ', 'rappel'); }), CLIENT.email, false],
      ['bon de commande fournisseur', () => A.page.evaluate(() => envoiBonEmail('bonZQ')), FOURN.email, true]];
    for (const [nom, geste, dest, pdf] of gestes) {
      const avant = nBoite();
      await borne(geste(), 40000, nom); for (let i = 0; i < 60 && nBoite() === avant; i++) await dormir(200);
      await A.page.waitForTimeout(300); await ferme(A.page);
      const m = fBoite.recus[fBoite.recus.length - 1];
      if (!vrai(nom + ' : un courriel est parti par la boîte de l\'entreprise', nBoite() === avant + 1, { recus: nBoite() - avant, toast: await toastTexte(A.page) })) continue;
      v(nom + ' : enveloppe — UN seul destinataire, le bon', m.a, [dest]);
      v(nom + ' : expéditeur = l\'adresse de la boîte de l\'entreprise', adresseDe(enTete(m.brut, 'From')), BOITE.email);
      v(nom + ' : MAIL FROM = la boîte', m.de.toLowerCase(), BOITE.email);
      vrai(nom + ' : aucune adresse TEAM OP nulle part (enveloppe, To, Cc, Bcc)', !ADRESSES_TEAMOP.some(x => m.a.includes(x) || new RegExp(x.replace('.', '\\.'), 'i').test(['To', 'Cc', 'Bcc', 'Reply-To'].map(h => enTete(m.brut, h)).join(' '))), m.a);
      if (pdf) vrai(nom + ' : le PDF est joint', /Content-Type: application\/pdf/i.test(m.brut) || /filename=.*\.pdf/i.test(m.brut));
    }
    v('le facteur TEAM OP n\'a RIEN reçu pendant ces cinq envois', nTeam() - t0, 0);
    vrai('le serveur a bien été prié d\'envoyer PAR LA BOÎTE à chaque fois (useMailbox)', A.appelsSendmail.length >= 5 && A.appelsSendmail.every(p => p.useMailbox && p.useMailbox.id && !p.smtp), A.appelsSendmail.map(p => Object.keys(p)));
    v('le devis est marqué envoyé (il est parti)', await A.page.evaluate(() => db.devis[0].statut), 'envoye');
    fin3((nBoite() - b0) + ' courriels par la boîte de l\'entreprise, 1 destinataire chacun, PDF joints, 0 au facteur TEAM OP');

    /* ═══ 4. la boîte refuse : l'écran le dit, aucun repli par TEAM OP ═══ */
    let fin4 = scenario(4, 'la boîte de l\'entreprise refuse un envoi');
    await A.page.evaluate(e => { entPose('email', e); save(); }, ENT.email);   // une adresse dans Mon entreprise : la reprise peut être PROPOSÉE
    fBoite.refuser = true; t0 = nTeam(); b0 = nBoite(); A.page._confirmer = false; A.page._dialogues = [];
    await A.page.evaluate(() => { db.devis[0].statut = 'brouillon'; save(); });
    const r4 = await A.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email')); await A.page.waitForTimeout(600);
    const t4 = await toastTexte(A.page);
    fBoite.refuser = false;
    v('envoiDoc rend « non parti »', r4, false);
    vrai('l\'écran dit que la boîte a refusé', /ta boîte mail a refusé/i.test(t4), t4);
    const apresRefus = fTeam.recus.slice(t0);
    v('le document n\'est pas reparti par la plateforme : aucun courriel de TEAM OP vers le client', apresRefus.filter(m => m.a.includes(CLIENT.email)).length, 0);
    vrai('seul part l\'avis INTERNE de la vigie (à contact@), et il ne nomme pas le client', apresRefus.every(m => m.a.every(x => ADRESSES_TEAMOP.includes(x)) && !JETONS.some(j => m.brut.includes(j))), apresRefus.map(m => ({ a: m.a, fuite: JETONS.filter(j => m.brut.includes(j)) })));
    v('rien n\'est arrivé chez le client', nBoite() - b0, 0);
    v('le devis reste en brouillon', await A.page.evaluate(() => db.devis[0].statut), 'brouillon');
    vrai('la reprise par OP GESTION a été PROPOSÉE (jamais faite en silence), en disant où iront les réponses', (A.page._dialogues || []).some(m => /Envoyer quand même depuis OP GESTION/.test(m) && m.includes(ENT.email)), A.page._dialogues);
    /* la personne ACCEPTE : le document part au nom de l'entreprise, réponses vers Mon entreprise, sans copie */
    fBoite.refuser = true; A.page._confirmer = true; t0 = nTeam();
    const r4c = await A.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email')); for (let i = 0; i < 40 && !fTeam.recus.slice(t0).some(m => m.a.includes(CLIENT.email)); i++) await dormir(150);
    fBoite.refuser = false; A.page._confirmer = false;
    const m4c = fTeam.recus.slice(t0).find(m => m.a.includes(CLIENT.email));
    v('acceptée : le devis part', r4c, true);
    vrai('… au seul client, sans copie, Reply-To = l\'adresse de Mon entreprise', m4c && JSON.stringify(m4c.a) === JSON.stringify([CLIENT.email]) && adresseDe(enTete(m4c.brut, 'Reply-To')) === ENT.email, m4c && { a: m4c.a, rt: enTete(m4c.brut, 'Reply-To') });
    await A.page.evaluate(() => { db.devis[0].statut = 'brouillon'; save(); });
    /* la boîte DÉCONNECTÉE AILLEURS (autre appareil, Tour) alors que l'appareil la croit encore là : le serveur ne se rabat pas sur la plateforme */
    const mbId4 = await A.page.evaluate(() => _mailboxes[0].id);
    await fetch(B + '/api/mailbox/disconnect', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-teamop-kh': sha(CLE) }, body: JSON.stringify({ teamId: T, id: mbId4 }) });
    t0 = nTeam(); b0 = nBoite();
    const r4b = await A.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email')); await A.page.waitForTimeout(600);
    const t4b = await toastTexte(A.page);
    v('boîte déconnectée ailleurs : envoiDoc rend « non parti »', r4b, false);
    v('… rien au client, ni par la boîte ni par la plateforme', [fTeam.recus.slice(t0).filter(m => m.a.includes(CLIENT.email)).length, nBoite() - b0], [0, 0]);
    vrai('… et l\'écran dit de reconnecter la boîte', /boîte mail introuvable/.test(t4b), t4b);
    v('… et l\'appareil oublie la liste périmée (elle se relira)', await A.page.evaluate(() => _mailboxes), null);
    fin4('message « ta boîte mail a refusé l\'envoi », rien ne part sans le dire ; reprise PROPOSÉE (refusée : rien ; acceptée : 1 courriel, Reply-To = Mon entreprise, sans copie) ; boîte déconnectée ailleurs → 409 « boîte mail introuvable »');

    /* ═══ 7. envoi AUTOMATIQUE d'une facture sans boîte (on retire la boîte d'abord) ═══ */
    let fin7 = scenario(7, 'facture envoyée automatiquement, ni boîte ni adresse');
    await A.page.evaluate(() => { _mailboxes = null; delete db.entreprise.email; save(); try { localStorage.removeItem('elan_boite_alerte_' + syncTeam()); } catch (e) {} });
    const notifsAvant = await A.page.evaluate(() => { window.__notifs = []; const o = window.pushNotify; window.pushNotify = function () { window.__notifs.push([...arguments].slice(0, 2)); }; return 0; });
    t0 = nTeam(); b0 = nBoite(); const appelsAvant = A.appelsSendmail.length;
    await A.page.evaluate(() => factureMailPayee(db.factures[1], db.interventions[0])); await A.page.waitForTimeout(2500);
    const modal7 = await modalTexte(A.page), notifs7 = await A.page.evaluate(() => window.__notifs), toast7 = await toastTexte(A.page);
    v('aucune fenêtre ne s\'ouvre (envoi automatique)', modal7, '');
    v('aucun appel /api/sendmail', A.appelsSendmail.length - appelsAvant, 0);
    v('rien au facteur TEAM OP, rien chez le client', [nTeam() - t0, nBoite() - b0], [0, 0]);
    vrai('l\'administrateur est prévenu (notification « Boîte mail à connecter »)', notifs7.length === 1 && /Boîte mail à connecter/.test(notifs7[0][0]), notifs7);
    vrai('et l\'écran dit pourquoi la facture n\'est pas partie', /boîte mail de l'entreprise n'est pas connectée/.test(toast7), toast7);
    await A.page.evaluate(() => factureMailPayee(db.factures[1], db.interventions[0])); await A.page.waitForTimeout(1500);
    v('une seconde facture le même jour ne reprévient pas (pas de boucle)', (await A.page.evaluate(() => window.__notifs)).length, 1);
    fin7('0 fenêtre, 0 appel, 0 courriel ; 1 notification à l\'administrateur, pas de seconde le même jour');
    await A.ctx.close();

    /* ═══ 5. /api/mailboxes en panne : « impossible de vérifier », rien ne part ═══ */
    let fin5 = scenario(5, 'route des boîtes en panne (on ne sait pas)');
    let P = await ouvrir({ app: APP_NEUVE, panneMailboxes: true, sansAdresse: true });
    t0 = nTeam(); b0 = nBoite();
    const p5 = P.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email'));
    await P.page.waitForSelector('#overlay.open', { timeout: 15000 }).catch(() => {});
    const m5 = await modalTexte(P.page);
    vrai('le message dit « impossible de vérifier » et « rien n\'est parti »', /Impossible de vérifier/.test(m5) && /Rien n.est parti/.test(m5), m5.slice(0, 300));
    vrai('et ne propose PAS de connecter une boîte', !/Connecter ma boîte/.test(m5), m5.slice(0, 300));
    await ferme(P.page); v('rend « non parti »', await borne(p5, 20000, 'envoiDoc en panne'), false);
    v('aucun appel /api/sendmail, rien aux facteurs', [P.appelsSendmail.length, nTeam() - t0, nBoite() - b0], [0, 0, 0]);
    await P.page.evaluate(() => go('parametres')); await P.page.waitForTimeout(1500);
    const carte5 = await P.page.evaluate(() => (document.getElementById('envoi-boite-etat') || {}).innerText || '');
    vrai('les Paramètres disent « Impossible de vérifier pour l\'instant »', /Impossible de vérifier/.test(carte5), carte5);
    fin5('« Impossible de vérifier… Rien n\'est parti », pas de bouton de connexion, 0 appel, 0 courriel');
    await P.ctx.close();

    /* ═══ 6. un employé non administrateur ═══ */
    let fin6 = scenario(6, 'un employé non administrateur, sans boîte connectée');
    let E = await ouvrir({ app: APP_NEUVE, role: 'technicien', sansAdresse: true });
    t0 = nTeam(); b0 = nBoite();
    const p6 = E.page.evaluate(() => mailClientRdv('intZQ', 'rappel'));
    await E.page.waitForSelector('#overlay.open', { timeout: 15000 }).catch(() => {});
    const m6 = await modalTexte(E.page);
    vrai('il lit « Demande à ton administrateur de connecter la boîte mail de l\'entreprise »', /Demande à ton administrateur de connecter la boîte mail/.test(m6), m6.slice(0, 300));
    vrai('sans bouton de connexion', !/Connecter ma boîte/.test(m6));
    await ferme(E.page); await borne(p6, 20000, 'rappel du technicien');
    v('rien ne part', [E.appelsSendmail.length, nTeam() - t0, nBoite() - b0], [0, 0, 0]);
    fin6('« Demande à ton administrateur… », pas de bouton, 0 appel, 0 courriel');
    await E.ctx.close();

    /* ═══ 13. adresse dans Mon entreprise, pas de boîte : part par le serveur, Reply-To = l'adresse, aucune copie ═══ */
    let fin13 = scenario(13, 'adresse dans Mon entreprise, pas de boîte : le document part au nom de l\'entreprise');
    let K = await ouvrir({ app: APP_NEUVE });
    t0 = nTeam(); b0 = nBoite();
    const r13 = await borne(K.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email')), 30000, 'devis par Mon entreprise');
    for (let i = 0; i < 40 && nTeam() === t0; i++) await dormir(150);
    const m13 = fTeam.recus.slice(t0).find(m => m.a.includes(CLIENT.email));
    v('aucune étape, le devis part', [r13, /Enregistrer et envoyer|Connecte ta boîte/.test(await modalTexte(K.page))], [true, false]);
    vrai('l\'application l\'a demandé AU NOM de l\'entreprise, avec l\'adresse de Mon entreprise en Reply-To', K.appelsSendmail.length === 1 && !K.appelsSendmail[0].useMailbox && !K.appelsSendmail[0].smtp && K.appelsSendmail[0].brand && K.appelsSendmail[0].brand.replyTo === ENT.email, K.appelsSendmail.map(q => ({ brand: q.brand, mb: q.useMailbox })));
    if (vrai('le courriel est arrivé', !!m13)) {
      v('enveloppe : le seul client — aucune copie à TEAM OP', m13.a, [CLIENT.email]);
      v('Reply-To = l\'adresse de Mon entreprise', adresseDe(enTete(m13.brut, 'Reply-To')), ENT.email);
      vrai('le nom affiché est celui de l\'entreprise', /Clim Fictive Zqx/.test(enTete(m13.brut, 'From')), enTete(m13.brut, 'From'));
      vrai('le PDF est joint', /application\/pdf/i.test(m13.brut)); }
    /* l'étape, choix (a) : sans adresse, on la tape dans l'étape et l'envoi REPREND */
    await K.page.evaluate(() => { delete db.entreprise.email; save(); });
    t0 = nTeam();
    const p13 = K.page.evaluate(() => envoiDoc('factures', 'facZQ', 'email'));
    await K.page.waitForSelector('#overlay.open #boite-etape-email', { timeout: 15000 }).catch(() => {});
    await K.page.fill('#boite-etape-email', 'mauvaise-adresse@'); await K.page.click('#boite-etape-ok'); await K.page.waitForTimeout(400);
    vrai('(a) une adresse mal formée tapée dans l\'étape est refusée : rien d\'enregistré, l\'étape reste', (await K.page.evaluate(() => !db.entreprise.email)) && /Enregistrer et envoyer/.test(await modalTexte(K.page)));
    await K.page.fill('#boite-etape-email', ENT.email); await K.page.click('#boite-etape-ok');
    const r13b = await borne(p13, 30000, 'facture après l\'étape');
    for (let i = 0; i < 40 && nTeam() === t0; i++) await dormir(150);
    const m13b = fTeam.recus.slice(t0).find(m => m.a.includes(CLIENT.email));
    v('(a) une adresse valide s\'enregistre dans Mon entreprise, et la facture REPART toute seule', [r13b, await K.page.evaluate(() => db.entreprise.email)], [true, ENT.email]);
    vrai('(a) … au seul client, Reply-To = cette adresse', m13b && JSON.stringify(m13b.a) === JSON.stringify([CLIENT.email]) && adresseDe(enTete(m13b.brut, 'Reply-To')) === ENT.email, m13b && m13b.a);
    v('(a) l\'adresse est DATÉE (elle voyage à la synchro)', await K.page.evaluate(() => !!(db.entreprise._ms && db.entreprise._ms.email)), true);
    fin13('aucune étape ; 1 courriel au seul client, Reply-To = Mon entreprise, nom de l\'entreprise, PDF ; étape (a) : adresse tapée → enregistrée, envoi repris');

    /* ═══ 14. Mon entreprise : l'adresse est obligatoire pour les envois, une adresse mal formée est refusée ═══ */
    let fin14 = scenario(14, 'Mon entreprise : le champ e-mail, obligatoire et vérifié');
    await K.page.evaluate(() => go('parametres')); await K.page.waitForTimeout(1500);
    const lbl = await K.page.evaluate(() => { const i = document.getElementById('ent-email'); const f = i && i.closest('.field'); return f ? f.innerText : ''; });
    vrai('le champ « E-mail de l\'entreprise » est marqué obligatoire, avec « C\'est l\'adresse où tes clients te répondront »', /obligatoire pour tes envois/.test(lbl) && /où tes clients te répondront/.test(lbl), lbl);
    await K.page.fill('#ent-email', 'pas une adresse'); await K.page.evaluate(() => entSave()); await K.page.waitForTimeout(300);
    v('une adresse mal formée n\'est PAS enregistrée', await K.page.evaluate(() => db.entreprise.email), ENT.email);
    vrai('… et l\'écran le dit', /Adresse e-mail invalide/.test(await toastTexte(K.page)), await toastTexte(K.page));
    await K.page.fill('#ent-email', 'factures@clim-fictive-zqx.fr'); await K.page.evaluate(() => entSave()); await K.page.waitForTimeout(300);
    v('une adresse valide est enregistrée (datée)', await K.page.evaluate(() => [db.entreprise.email, !!(db.entreprise._ms && db.entreprise._ms.email)]), ['factures@clim-fictive-zqx.fr', true]);
    await K.page.evaluate(() => { envoiBoiteCarteMaj(); }); await K.page.waitForTimeout(1200);
    vrai('« E-mails à tes clients » dit que les envois partent à son nom, réponses vers cette adresse', /réponses vont à factures@clim-fictive-zqx\.fr/.test(await K.page.evaluate(() => (document.getElementById('envoi-boite-etat') || {}).innerText || '')));
    fin14('champ marqué obligatoire avec sa phrase ; adresse mal formée refusée et dite ; valide enregistrée et datée');
    await K.ctx.close();

    /* ═══ 11. la PRODUCTION (v795) contre le serveur corrigé : le mode simple ne laisse plus rien chez TEAM OP ═══ */
    let fin11 = scenario(11, 'la production d\'aujourd\'hui (v795, mode simple) contre le serveur corrigé');
    let idEnvoi = null;
    if (!APP_PROD) { vrai('APP_PROD fourni (app.html de main)', false); fin11('non joué : APP_PROD absent'); }
    else {
      let Q = await ouvrir({ app: APP_PROD });
      vrai('la page de production est chargée', !Q.erreurs.length, Q.erreurs);
      t0 = nTeam(); b0 = nBoite();
      await Q.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email'));
      for (let i = 0; i < 60 && nTeam() === t0; i++) await dormir(200);
      const m = fTeam.recus[fTeam.recus.length - 1];
      if (vrai('le devis est parti (par la plateforme, comme en production)', nTeam() === t0 + 1)) {
        v('enveloppe : UN destinataire, le client — aucune copie cachée vers contact@', m.a, [CLIENT.email]);
        v('Reply-To = l\'adresse de l\'entreprise dans l\'annuaire', adresseDe(enTete(m.brut, 'Reply-To')), ENT.email);
        vrai('le nom affiché est celui de l\'entreprise', /Clim Fictive Zqx/.test(enTete(m.brut, 'From')), enTete(m.brut, 'From'));
        idEnvoi = enTete(m.brut, 'Message-ID');
        vrai('le Message-ID est retenu (pour que Camille ignore la réponse)', idEnvoi && fs.readFileSync(path.join(DATA, 'envois-entreprises.json'), 'utf8').includes(idEnvoi.replace(/[<>]/g, '')), idEnvoi);
      }
      fin11('1 seul RCPT (le client), Reply-To = l\'annuaire, Message-ID retenu');
      await Q.ctx.close();
    }

    /* ═══ 8. la réponse du client final ne nourrit pas Camille ═══ */
    let fin8 = scenario(8, 'la réponse du client final à un envoi d\'entreprise n\'atteint pas Camille ni le modèle');
    try {
      const out = execFileSync(process.execPath, [[path.join(RACINE_SRV, '..', 'tests', 'test-3245.js'), path.join(DEPOT, 'tests', 'test-3245.js')].find(f => fs.existsSync(f))], { encoding: 'utf8', timeout: 120000 });
      const tot = (out.match(/(\d+) ✓\s+(\d+) ✗/g) || []).pop() || '';
      vrai('test-3245 (Camille sur les vrais modules) est vert : ' + tot, / 0 ✗/.test(tot), out.slice(-600));
    } catch (e) { vrai('test-3245 passe', false, String(e.stdout || e.message).slice(-600)); }
    v('aucun appel au modèle pendant tout l\'essai', fs.readFileSync(MODELE, 'utf8').trim().split('\n').filter(Boolean).length, 0);
    fin8('test-3245 vert (une réponse portant le Message-ID retenu est sautée, rien n\'est envoyé au modèle) ; 0 appel au modèle dans le jumeau');

    /* ═══ 10. TEAM OP à ses propres clients : la copie cachée voulue reste ═══ */
    let fin10 = scenario(10, 'les courriels de TEAM OP à ses propres clients partent, avec leur copie');
    t0 = nTeam();
    const r10 = await fetch(B + '/api/email', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ key: API_KEY, to: 'abonne-qzx@exemple-abonne.fr', subject: 'Bienvenue chez TEAM OP', text: 'Bonjour' }) });
    for (let i = 0; i < 40 && nTeam() === t0; i++) await dormir(100);
    const m10 = fTeam.recus[fTeam.recus.length - 1];
    v('la route répond 200', r10.status, 200);
    vrai('le courriel part à l\'abonné AVEC la copie cachée vers contact@teamop.fr', m10 && m10.a.includes('abonne-qzx@exemple-abonne.fr') && m10.a.includes('contact@teamop.fr'), m10 && m10.a);
    t0 = nTeam();
    const r10b = await fetch(B + '/api/site/demande', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ entreprise: 'Prospect Qzx', prenom: 'Pia', nom: 'Prospect', equipe: '2', email: 'prospect-qzx@exemple-prospect.fr', tel: '0611111111', metiers: ['nettoyage'] }) });
    const corps10b = await r10b.text();
    for (let i = 0; i < 40 && nTeam() < t0 + 2; i++) await dormir(100);
    const accuse = fTeam.recus.slice(t0).find(m => m.a.includes('prospect-qzx@exemple-prospect.fr'));
    vrai('une demande du site : l\'accusé part au prospect, avec la copie à TEAM OP (statut ' + r10b.status + ')', accuse && accuse.a.includes('contact@teamop.fr'), { recus: fTeam.recus.slice(t0).map(m => m.a), corps: corps10b.slice(0, 200) });
    fin10('/api/email et l\'accusé d\'une demande du site partent, copie cachée à contact@ comprise');

    /* ═══ 9. ce que garde le serveur : rien du client final ═══ */
    let fin9 = scenario(9, 'ce que le serveur garde et montre : aucune donnée du client final');
    const PATRON = (await (await fetch(B + '/api/monitor/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ nom: 'Patron', pass: MDP_TOUR }) })).json()).token;
    vrai('la Tour s\'ouvre', PATRON);
    const tourMails = await (await fetch(B + '/api/monitor/mails', { headers: { Authorization: 'Bearer ' + PATRON } })).text();
    const tourSupport = await (await fetch(B + '/api/monitor/support/mails', { headers: { Authorization: 'Bearer ' + PATRON } })).text();
    await dormir(1200);
    const fichiers = {};
    for (const f of fs.readdirSync(DATA)) { const p = path.join(DATA, f); if (fs.statSync(p).isFile()) fichiers[f] = fs.readFileSync(p, 'utf8'); }
    const sources = Object.assign({ 'journal du processus': journalSrv, 'Tour : /api/monitor/mails': tourMails, 'Tour : /api/monitor/support/mails': tourSupport }, fichiers);
    const fuites = [];
    for (const [nom, txt] of Object.entries(sources)) for (const j of JETONS) if (txt.includes(j)) fuites.push(nom + ' ← « ' + j + ' »');
    v('aucun jeton du client final, du fournisseur ni d\'un document (' + JETONS.length + ' jetons) dans ' + Object.keys(sources).length + ' sources', fuites, []);
    vrai('population : le journal des envois existe et a une trace par envoi d\'entreprise (on regarde au bon endroit)', fichiers['mails-envoyes.json'] && JSON.parse(fichiers['mails-envoyes.json']).length >= 1, Object.keys(fichiers));
    v('sentmap.jsonl n\'est pas écrit (pas de config.imap)', fs.existsSync(path.join(DATA, 'sentmap.jsonl')), false);
    vrai('aucun mot de passe de boîte en clair dans les fichiers lisibles hors mailboxes.json', !Object.entries(fichiers).some(([n, t]) => n !== 'mailboxes.json' && t.includes(BOITE.pass)));
    fin9('0 jeton dans ' + Object.keys(sources).length + ' sources (fichiers de données, journal, deux vues de la Tour) ; sentmap absent');

    /* ═══ 12. au navigateur : l'étape et les Paramètres, 390 / 1440, jour / nuit ═══ */
    let fin12 = scenario(12, 'l\'étape et les Paramètres au téléphone et au bureau, de jour et de nuit');
    const bilan = [];
    for (const [nom, o] of [['390-jour', { w: 390, h: 844, tel: true }], ['390-nuit', { w: 390, h: 844, tel: true, nuit: true }], ['1440-jour', { w: 1440, h: 900 }], ['1440-nuit', { w: 1440, h: 900, nuit: true }]]) {
      const X = await ouvrir(Object.assign({ app: APP_NEUVE, sansAdresse: true }, o));
      await X.page.evaluate(() => go('parametres')); await X.page.waitForTimeout(1500);
      await X.page.evaluate(() => { const el = document.getElementById('envoi-boite-etat'); if (el) el.scrollIntoView({ block: 'center' }); }); await X.page.waitForTimeout(800);
      const deb1 = await X.page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); void document.body.offsetWidth; window.scrollTo(9999, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x; });
      if (CAPTURES) { fs.mkdirSync(CAPTURES, { recursive: true }); await X.page.screenshot({ path: path.join(CAPTURES, 'parametres-' + nom + '.png') }); }
      const p = X.page.evaluate(() => envoiDoc('devis', 'devZQ', 'email'));
      await X.page.waitForSelector('#overlay.open', { timeout: 15000 }).catch(() => {}); await X.page.waitForTimeout(500);
      const deb2 = await X.page.evaluate(async () => { await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); window.scrollTo(9999, window.scrollY); const x = window.scrollX; window.scrollTo(0, window.scrollY); return x; });
      const etapeVue = /Enregistrer et envoyer/.test(await modalTexte(X.page));
      if (CAPTURES) await X.page.screenshot({ path: path.join(CAPTURES, 'etape-' + nom + '.png') });
      await ferme(X.page); await borne(p, 20000, 'envoiDoc ' + nom);
      const carteVue = await X.page.evaluate(() => !!document.getElementById('envoi-boite-etat'));
      bilan.push({ nom, erreurs: X.erreurs.length, debordement: [deb1, deb2], etapeVue, carteVue });
      vrai(nom + ' : rubrique « E-mails à tes clients » présente, étape affichée, 0 erreur JavaScript, 0 px de défilement latéral',
        !X.erreurs.length && deb1 === 0 && deb2 === 0 && etapeVue && carteVue, { erreurs: X.erreurs.slice(0, 3), deb1, deb2, etapeVue, carteVue });
      await X.ctx.close();
    }
    fin12(bilan.map(x => x.nom + (x.erreurs || x.debordement.some(Boolean) ? ' ✗' : ' ✓')).join(', ') + (CAPTURES ? ' — captures dans ' + CAPTURES : ''));

    v('aucun hôte hors du banc n\'a été atteint (le reste du web est coupé et compté)', [...new Set(horsBanc)].filter(h => !/fonts\.|gstatic|googleapis|firebase|gstatic/.test(h)), []);
  } catch (e) { vrai('l\'essai va au bout sans exception', false, e.stack); }
  finally { try { await browser.close(); } catch (e) {} }

  console.log('\n══ BILAN DES SCÉNARIOS ══');
  for (const n of Object.keys(scen).sort((a, b) => a - b)) console.log((scen[n].ok ? '✓ ' : '✗ ') + n + '. ' + scen[n].titre + ' — ' + scen[n].preuve);
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + e.stack); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
