/* ⛔ CE QUE CE FICHIER GARDE — LE VRAI SERVEUR, REDÉMARRÉ SUR SES PROPRES FICHIERS, LIT ENCORE LES BOÎTES MAIL QUE `test-2970` A CHIFFRÉES (23 octobre 2026).

   `test-2970` monte le module de chiffrement : il ne voit pas un défaut de CÂBLAGE (CLAUDE.md : « test-726 passait au vert pendant que le serveur ne branchait pas la pièce »). Ici le VRAI
   `server/index.js` (donc `mail.js` et la boîte support) tourne dans son processus, avec la clé maître du banc, sur trois fichiers d'AVANT (mots de passe en clair), et :
     · au démarrage les trois fichiers sont réécrits chiffrés — aucun mot de passe dans leurs octets ;
     · une boîte de chaque famille PRÉSENTE ENCORE LE BON MOT DE PASSE à un vrai serveur SMTP de banc (qui refuse tout autre) : OP GESTION (`/api/sendmail`), la Messagerie de la Tour
       (`/api/monitor/mail/envoyer`), la boîte support (`/api/monitor/support/envoyer`) ; la relève IMAP (module `imapflow` de banc, glissé par `node -r`) reçoit le bon mot de passe aussi ;
     · une boîte CONNECTÉE par la route (`/api/mailbox/connect`) s'écrit chiffrée, et survit à un redémarrage ;
     · aucune route ne rend un mot de passe ni son chiffré (`/api/mailboxes`, `/api/monitor/mail/boites`, `/api/monitor/support/box`, `/health`), et le journal du serveur non plus ;
     · ⛔ REDÉMARRÉ SANS LA CLÉ : le serveur démarre, les boîtes sont listées, AUCUN mot de passe n'est perdu — après une écriture (une boîte connectée sans clé), les chiffrés d'origine sont
       OCTET POUR OCTET ceux d'avant, et rien d'illisible (le chiffré lui-même) n'a été présenté à un serveur de messagerie ; la clé revenue, tout marche comme avant.
   Mutations jouées sur ce banc et sur `test-2970` (voir REPRISE.md) : écrire en clair ; ne plus savoir lire le clair ; perdre le chiffré d'une boîte illisible ; oublier de passer
   `support-box.json` par le coffre dans `mail.js` (le chiffré serait recopié comme mot de passe). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));

let webpush;
try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
catch (e) {
  console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0);
}

const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'coffre-2976-'));
const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
const KEK = crypto.randomBytes(32).toString('hex');
/* des mots de passe à lettres hors de [0-9a-f], et distincts par boîte : un mot de passe présenté à la mauvaise boîte se verrait */
const MDP = { gest: 'Wvq-Zk.2976/gestion', gest2: 'Pjx-Hn.2976/connectee', tour: 'Rkz-Yd.2976/tour', tour2: 'Fgt-Mw.2976/tour-deux', supp: 'Bhn-Qx.2976/support' };
const ADR = { gest: 'gestion@banc-2976.fr', gest2: 'connectee@banc-2976.fr', tour: 'tour@banc-2976.fr', tour2: 'tour2@banc-2976.fr', supp: 'aide@banc-2976.fr' };
MDP.sans = 'Xtq-sans-cle-2976'; ADR.sans = 'sanscle@banc-2976.fr';
const ATTENDU = {}; for (const k of Object.keys(ADR)) ATTENDU[ADR[k]] = MDP[k];

/* ── le SMTP de banc : il n'accepte QUE le bon mot de passe de chaque adresse, et note tout ce qu'on lui présente ── */
const smtp = { auths: [], recus: [] };
smtp.s = net.createServer(c => {
  c.on('error', () => {});
  let tampon = '', corps = false, msg = '', etat = '', user = '';
  const verdict = (u, p) => { const bon = ATTENDU[u] === p; smtp.auths.push({ user: u, pass: p, bon }); c.write(bon ? '235 ok\r\n' : '535 5.7.8 refuse\r\n'); };
  c.write('220 banc\r\n');
  c.on('data', d => {
    tampon += d.toString('utf8'); let i;
    while ((i = tampon.indexOf('\r\n')) >= 0) {
      const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
      if (corps) { if (l === '.') { corps = false; smtp.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
      if (etat === 'login-user') { user = Buffer.from(l, 'base64').toString('utf8'); etat = 'login-pass'; c.write('334 UGFzc3dvcmQ6\r\n'); continue; }
      if (etat === 'login-pass') { etat = ''; verdict(user, Buffer.from(l, 'base64').toString('utf8')); continue; }
      if (etat === 'plain') { etat = ''; const p = Buffer.from(l, 'base64').toString('utf8').split('\0'); verdict(p[1], p[2]); continue; }
      const h = l.toUpperCase();
      if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
      else if (h.startsWith('AUTH PLAIN ')) { const p = Buffer.from(l.slice(11), 'base64').toString('utf8').split('\0'); verdict(p[1], p[2]); }
      else if (h === 'AUTH PLAIN') { etat = 'plain'; c.write('334 \r\n'); }
      else if (h.startsWith('AUTH LOGIN')) { etat = 'login-user'; c.write('334 VXNlcm5hbWU6\r\n'); }
      else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
      else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
      else c.write('250 ok\r\n');
    }
  });
});

/* ── la fausse boîte IMAP : elle accepte la connexion et NOTE le mot de passe présenté ── */
const TRACE = path.join(banc, 'imap-trace.jsonl');
const PRE = path.join(banc, 'faux-imapflow.js');
fs.writeFileSync(PRE, `const Module = require('module'), fs = require('fs');
const cible = require.resolve('imapflow', { paths: [${JSON.stringify(path.join(RACINE, 'server'))}] });
class ImapFlow {
  constructor(o) { this.o = o || {}; }
  on() {}
  async connect() { fs.appendFileSync(${JSON.stringify(TRACE)}, JSON.stringify({ user: String(this.o.auth && this.o.auth.user), pass: String(this.o.auth && this.o.auth.pass) }) + '\\n'); }
  async logout() {}
  close() {}
  async getMailboxLock() { throw new Error('banc : aucun dossier'); }
  async list() { throw new Error('banc : aucun dossier'); }
}
const m = new Module(cible); m.filename = cible; m.loaded = true; m.exports = { ImapFlow }; require.cache[cible] = m;
/* /api/mailbox/connect choisit les serveurs d'après le DOMAINE de l'adresse (ssl0.ovh.net:465 ici) : on les détourne vers le SMTP de banc, sans toucher au reste. */
const nm = require(require.resolve('nodemailer', { paths: [${JSON.stringify(path.join(RACINE, 'server'))}] }));
const creer = nm.createTransport.bind(nm);
nm.createTransport = (o, ...r) => creer(o && o.host === 'ssl0.ovh.net' ? Object.assign({}, o, { host: '127.0.0.1', port: Number(process.env.FAUX_SMTP_PORT), secure: false }) : o, ...r);\n`);
const traces = () => { try { return fs.readFileSync(TRACE, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; } };

const CLE_ENT = 'CLE-PRIVEE-2976', T = 'ent-2976-x';
const kh = k => sha(k);
const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
const MDP_TOUR = 'mot-de-passe-du-banc-2976';
const PORT = 9100 + (process.pid % 700), B = 'http://127.0.0.1:' + PORT;
let enfant = null, journal = '';
const lireF = (nom) => fs.readFileSync(path.join(D, nom));
const lireJ = (nom) => { try { return JSON.parse(lireF(nom).toString('utf8')); } catch (e) { return null; } };
const toutesFormes = (mdp) => { const b = Buffer.from(mdp); return [b, Buffer.from(b.toString('base64')), Buffer.from(b.toString('hex'))]; };
const absent = (nom, mdp) => toutesFormes(mdp).every(x => !lireF(nom).includes(x));

async function demarrer(avecCle, portSmtp) {
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc' }));
  const env = Object.assign({}, process.env, { FAUX_SMTP_PORT: String(portSmtp), TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT) });
  delete env.TEAMOP_KEK; delete env.CREDENTIALS_DIRECTORY;
  if (avecCle) env.TEAMOP_KEK = KEK;
  journal = '';
  enfant = spawn(process.execPath, ['-r', PRE, path.join(RACINE, 'server', 'index.js')], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
  for (let i = 0; i < 120; i++) { try { if ((await fetch(B + '/health')).ok) { await dormir(300); return true; } } catch (e) {} await dormir(100); }
  return false;
}
const arreter = async () => { const e = enfant; enfant = null; if (!e) return; await new Promise(r => { e.once('exit', r); e.kill('SIGKILL'); }); };
const req = async (route, o) => { o = o || {}; const r = await fetch(B + route, { method: o.corps ? 'POST' : 'GET', headers: Object.assign(o.corps ? { 'Content-Type': 'application/json' } : {}, o.h || {}), body: o.corps ? JSON.stringify(o.corps) : undefined, signal: AbortSignal.timeout(30000) });
  const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {} return { s: r.status, txt, j: j || {} }; };
const H_ENT = { 'x-teamop-kh': kh(CLE_ENT) };

(async () => {
  const portSmtp = await new Promise(res => smtp.s.listen(0, '127.0.0.1', () => res(smtp.s.address().port)));
  const boite = (id, email, pass, plus) => Object.assign({ id, email, pass, imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, ts: Date.now() }, plus || {});
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({ 'entreprise-x': { slug: 'entreprise-x', nom: 'X', email: 'x@exemple-2976.fr', t: T, code: b64({ t: T, k: CLE_ENT }), ts: 1 } }));
  /* LES TROIS FICHIERS D'AVANT : mots de passe en clair */
  fs.writeFileSync(path.join(D, 'mailboxes.json'), JSON.stringify({ mb1: boite('mb1', ADR.gest, MDP.gest, { teamId: T, name: 'Gestion', histoDone: true }) }));
  fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify([boite('bt1', ADR.tour, MDP.tour, { nom: 'TEAM OP', par: 'Justin' }), boite('bt2', ADR.tour2, MDP.tour2, { nom: 'Deux', par: 'Justin' })]));
  fs.writeFileSync(path.join(D, 'support-box.json'), JSON.stringify(boite(undefined, ADR.supp, MDP.supp)).replace('"id":undefined,', ''));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [{ id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP_TOUR), role: 'patron', actif: true, ts: Date.now() }] }));
  const departClair = ['mailboxes.json', 'mail-boites.json', 'support-box.json'].every(f => Object.values(MDP).some(m => lireF(f).includes(Buffer.from(m))));
  vrai('(population) les trois fichiers de départ portent des mots de passe EN CLAIR', departClair);

  let jeton = '';
  const tour = (route, corps) => req(route, { corps, h: { Authorization: 'Bearer ' + jeton } });
  const sendmail = (id) => req('/api/sendmail', { corps: { teamId: T, to: 'client@exemple-2976.fr', subject: 'Banc 2976', text: 'Bonjour', useMailbox: { id } }, h: H_ENT });
  /* La boîte support REPRISE par la Messagerie de la Tour (`mail.js` lit `support-box.json` à son démarrage) : son identifiant est tiré au sort, on la retrouve par son adresse. */
  const envoyerReprise = async () => { const l = await tour('/api/monitor/mail/boites'); const b = (l.j.boites || []).find(x => x.email === ADR.supp);
    return b ? (await tour('/api/monitor/mail/envoyer', { boite: b.id, a: 'client@exemple-2976.fr', objet: 'Banc 2976', texte: 'Bonjour' })).s : 'boîte reprise introuvable'; };
  const aSecret = (txt) => Object.values(MDP).some(m => txt.includes(m));
  let scelles = {};

  try {
    /* ═════════════════ 1. DÉMARRAGE AVEC LA CLÉ SUR DES FICHIERS D'AVANT ═════════════════ */
    console.log('\n1. Le vrai serveur démarre sur des fichiers d\'avant, avec la clé');
    vrai('le serveur démarre', await demarrer(true, portSmtp));
    for (const [f, mdps] of [['mailboxes.json', [MDP.gest]], ['mail-boites.json', [MDP.tour, MDP.tour2, MDP.supp]], ['support-box.json', [MDP.supp]]]) {
      vrai(f + ' : plus AUCUN mot de passe dans ses octets (brut, base64, hexadécimal)', mdps.every(m => absent(f, m)));
      vrai(f + ' : il porte des `passScelle`', /"passScelle":"/.test(lireF(f).toString()));
    }
    vrai('(population) mail-boites.json porte AUSSI la boîte support reprise (3 boîtes : le chiffré du support n\'a pas été recopié comme mot de passe)', (lireJ('mail-boites.json') || []).length === 3);
    scelles = { gest: lireJ('mailboxes.json').mb1.passScelle, tour: lireJ('mail-boites.json')[0].passScelle, tour2: lireJ('mail-boites.json')[1].passScelle, supp: lireJ('support-box.json').passScelle };
    vrai('(population) quatre chiffrés distincts', new Set(Object.values(scelles)).size === 4 && Object.values(scelles).every(Boolean));

    /* ═════════════════ 2. CHAQUE FAMILLE PRÉSENTE ENCORE LE BON MOT DE PASSE ═════════════════ */
    console.log('\n2. Chaque famille de boîtes présente encore son bon mot de passe (SMTP qui refuse tout autre, IMAP qui note)');
    jeton = (await req('/api/monitor/login', { corps: { nom: 'Patron', pass: MDP_TOUR } })).j.token;
    vrai('la Tour ouvre une session de patron', jeton);
    let r = await sendmail('mb1');
    v('OP GESTION : /api/sendmail par la boîte connectée → 200 (le SMTP a reçu le bon mot de passe)', r.s, 200);
    r = await tour('/api/monitor/mail/envoyer', { boite: 'bt1', a: 'client@exemple-2976.fr', objet: 'Banc 2976', texte: 'Bonjour' });
    v('la Tour : /api/monitor/mail/envoyer par la boîte bt1 → 200', r.s, 200);
    r = await tour('/api/monitor/mail/envoyer', { boite: 'bt2', a: 'client@exemple-2976.fr', objet: 'Banc 2976', texte: 'Bonjour' });
    v('la Tour : par la boîte bt2 (autre adresse, autre mot de passe) → 200', r.s, 200);
    r = await tour('/api/monitor/support/envoyer', { to: 'client@exemple-2976.fr', subject: 'Banc 2976', text: 'Bonjour' });
    v('la boîte support : /api/monitor/support/envoyer → 200', r.s, 200);
    v('⛔ la boîte support REPRISE dans la Messagerie de la Tour (mail.js lit support-box.json par le coffre) envoie avec le bon mot de passe → 200', await envoyerReprise(), 200);
    const bonnes = smtp.auths.filter(a => a.bon).map(a => a.user).sort();
    vrai('(population) le SMTP a reçu au moins cinq authentifications', smtp.auths.length >= 5);
    v('chaque authentification présentée était la bonne (aucun refus 535) — aucun chiffré ni mot de passe vide n\'est parti vers un serveur de messagerie', smtp.auths.filter(a => !a.bon), []);
    v('les quatre adresses ont été authentifiées', Array.from(new Set(bonnes)), [ADR.supp, ADR.gest, ADR.tour2, ADR.tour].sort());
    await dormir(500);
    const t1 = traces();
    vrai('la relève IMAP (boîtes de la Tour, support) a présenté de vrais mots de passe (' + t1.length + ' connexions notées)', t1.length > 0 && t1.every(x => ATTENDU[x.user] === x.pass));

    /* ═════════════════ 3. AUCUN MOT DE PASSE NE SORT, NI SON CHIFFRÉ ═════════════════ */
    console.log('\n3. Aucune route ne rend un mot de passe, ni son chiffré ; le journal non plus');
    const reponses = [
      (await req('/api/mailboxes?teamId=' + T, { h: H_ENT })).txt,
      (await tour('/api/monitor/mail/boites')).txt,
      (await tour('/api/monitor/support/box')).txt,
      (await req('/health')).txt,
      (await tour('/api/monitor/mail/dossiers')).txt];
    vrai('(population) /api/mailboxes rend bien la boîte de l\'entreprise (sans quoi « rien ne fuit » serait creux)', reponses[0].includes(ADR.gest));
    vrai('(population) la Tour rend bien ses trois boîtes', reponses[1].includes(ADR.tour) && reponses[1].includes(ADR.tour2));
    vrai('aucune réponse ne contient un mot de passe', reponses.every(t => !aSecret(t)));
    vrai('aucune réponse ne contient un chiffré, ni le nom du champ', reponses.every(t => !Object.values(scelles).some(s => t.includes(s)) && !/passScelle/.test(t)));
    vrai('le journal du serveur ne contient ni mot de passe ni chiffré', !aSecret(journal) && !Object.values(scelles).some(s => journal.includes(s)));

    /* ═════════════════ 4. UNE BOÎTE CONNECTÉE PAR LA ROUTE S'ÉCRIT CHIFFRÉE ═════════════════ */
    console.log('\n4. Une boîte connectée par /api/mailbox/connect s\'écrit chiffrée et survit à un redémarrage');
    r = await req('/api/mailbox/connect', { corps: { teamId: T, email: ADR.gest2, pass: MDP.gest2, name: 'Connectée' }, h: H_ENT });
    v('la connexion d\'une boîte neuve est acceptée', r.s, 200);
    vrai('son mot de passe n\'est PAS dans mailboxes.json', absent('mailboxes.json', MDP.gest2) && absent('mailboxes.json', MDP.gest));
    const id2 = r.j.id; vrai('(population) elle porte un identifiant', !!id2);
    r = await req('/api/mailboxes?teamId=' + T, { h: H_ENT });
    v('(population) la liste de l\'entreprise a maintenant deux boîtes', (r.j.mailboxes || []).length, 2);
    scelles.gest2 = (lireJ('mailboxes.json')[id2] || {}).passScelle;
    await arreter();
    vrai('le serveur redémarre sur ses propres fichiers (avec la clé)', await demarrer(true, portSmtp));
    jeton = (await req('/api/monitor/login', { corps: { nom: 'Patron', pass: MDP_TOUR } })).j.token;
    smtp.auths.length = 0;
    v('après redémarrage : la boîte d\'avant se relit (SMTP content)', (await sendmail('mb1')).s, 200);
    v('après redémarrage : la boîte connectée par la route aussi', (await sendmail(id2)).s, 200);
    v('après redémarrage : la Tour (bt2)', (await tour('/api/monitor/mail/envoyer', { boite: 'bt2', a: 'client@exemple-2976.fr', objet: 'Banc 2976', texte: 'Bonjour' })).s, 200);
    v('après redémarrage : le support', (await tour('/api/monitor/support/envoyer', { to: 'client@exemple-2976.fr', subject: 'Banc 2976', text: 'Bonjour' })).s, 200);
    v('après redémarrage : la boîte support reprise par la Tour', await envoyerReprise(), 200);
    v('après redémarrage : aucun refus du SMTP', smtp.auths.filter(a => !a.bon), []);
    vrai('(population) quatre authentifications après redémarrage', smtp.auths.length >= 4);

    /* ═════════════════ 5. REDÉMARRÉ SANS LA CLÉ : RIEN N'EST PERDU ═════════════════ */
    console.log('\n5. Redémarré SANS la clé maître : rien n\'est perdu, rien d\'illisible n\'est présenté');
    scelles.gest = lireJ('mailboxes.json').mb1.passScelle; scelles.gest2 = lireJ('mailboxes.json')[id2].passScelle;   // les chiffrés D'AVANT cet arrêt (chaque écriture en pose de neufs)
    const avantFichiers = { m: lireF('mailboxes.json'), t: lireF('mail-boites.json'), s: lireF('support-box.json') };
    await arreter();
    const nTrace = traces().length;
    vrai('le serveur démarre sans la clé', await demarrer(false, portSmtp));
    jeton = (await req('/api/monitor/login', { corps: { nom: 'Patron', pass: MDP_TOUR } })).j.token;
    r = await req('/api/mailboxes?teamId=' + T, { h: H_ENT });
    v('les deux boîtes de l\'entreprise sont toujours listées', (r.j.mailboxes || []).map(b => b.email).sort(), [ADR.gest2, ADR.gest].sort());
    r = await tour('/api/monitor/mail/boites');
    v('les trois boîtes de la Tour aussi', (r.j.boites || []).map(b => b.email).sort(), [ADR.supp, ADR.tour2, ADR.tour].sort());
    vrai('le serveur DIT que des mots de passe sont illisibles (un nombre, aucune adresse)', /mot\(s\) de passe illisible/.test(journal) && !journal.includes('banc-2976.fr'));
    vrai('démarrer sans clé n\'a RIEN réécrit (octets identiques)', avantFichiers.m.equals(lireF('mailboxes.json')) && avantFichiers.t.equals(lireF('mail-boites.json')) && avantFichiers.s.equals(lireF('support-box.json')));
    /* une écriture SANS clé : on connecte une nouvelle boîte (réécrit mailboxes.json) */
    smtp.auths.length = 0;
    r = await sendmail('mb1');
    vrai('une boîte illisible ne peut pas envoyer (500) — et personne ne lui prête un autre mot de passe', r.s !== 200);
    v('… le SMTP n\'a reçu AUCUN mot de passe qui ne soit pas le bon (soit rien, soit un refus sans chiffré)', smtp.auths.filter(a => /^v1:|^djE6/.test(a.pass) || Object.values(scelles).some(s => a.pass.includes(s))), []);
    r = await req('/api/mailbox/connect', { corps: { teamId: T, email: ADR.sans, pass: MDP.sans, name: 'Sans clé' }, h: H_ENT });
    v('(population) connecter une boîte neuve sans clé réussit : le fichier est donc RÉÉCRIT par un serveur qui ne peut pas déchiffrer les autres', r.s, 200);
    {
      const apres = lireJ('mailboxes.json');
      v('⛔ mailboxes.json réécrit sans clé : les deux chiffrés d\'origine sont OCTET POUR OCTET ceux d\'avant', [apres.mb1.passScelle, apres[id2].passScelle], [scelles.gest, scelles.gest2]);
      vrai('… et les boîtes illisibles n\'ont pas gagné de mot de passe vide dans le fichier', !('pass' in apres.mb1) && !('pass' in apres[id2]));
      v('(population) le fichier porte bien trois boîtes', Object.keys(apres).length, 3);
    }
    vrai('aucun chiffré dans les traces IMAP de ce démarrage (rien d\'illisible présenté)', traces().slice(nTrace).every(x => !/^v1:|^djE6/.test(x.pass) && !Object.values(scelles).some(s => x.pass.includes(s))));

    /* ═════════════════ 6. LA CLÉ REVIENT ═════════════════ */
    console.log('\n6. La clé revient : tout marche comme avant');
    await arreter();
    vrai('le serveur redémarre avec la clé', await demarrer(true, portSmtp));
    jeton = (await req('/api/monitor/login', { corps: { nom: 'Patron', pass: MDP_TOUR } })).j.token;
    smtp.auths.length = 0;
    v('la boîte d\'origine marche de nouveau', (await sendmail('mb1')).s, 200);
    v('la boîte connectée par la route aussi', (await sendmail(id2)).s, 200);
    v('la Tour (bt1)', (await tour('/api/monitor/mail/envoyer', { boite: 'bt1', a: 'client@exemple-2976.fr', objet: 'Banc 2976', texte: 'Bonjour' })).s, 200);
    v('le support', (await tour('/api/monitor/support/envoyer', { to: 'client@exemple-2976.fr', subject: 'Banc 2976', text: 'Bonjour' })).s, 200);
    v('la boîte support reprise par la Tour', await envoyerReprise(), 200);
    v('aucun refus du SMTP', smtp.auths.filter(a => !a.bon), []);
    vrai('la boîte écrite en clair faute de clé est migrée dès que la clé revient : plus aucun mot de passe en clair dans aucun des trois fichiers', Object.values(MDP).every(m => ['mailboxes.json', 'mail-boites.json', 'support-box.json'].every(f => absent(f, m))));
    vrai('le journal complet du dernier démarrage ne contient aucun mot de passe', !aSecret(journal));
  } finally {
    await arreter();
    try { smtp.s.close(); } catch (e) {}
    try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
  }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); try { if (enfant) enfant.kill('SIGKILL'); } catch (_) {} process.exit(1); });
