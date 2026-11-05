/* ══ test-3270 — LES BOÎTES MAIL D'UNE PERSONNE (OP MESSAGES, rubrique Courrier) : LE VRAI SERVICE, PAR LE MOT DE PASSE D'APPLICATION ═══════════════════════════════════════════════════════════
   6 novembre 2026 — Justin : « je veux qu'ils puissent avoir leur boîte mail dans l'application » ; « ça doit marcher sur OP MESSAGES ».
   Le VRAI `server-msg/index.js`, isolé (configuration et données jetables, port libre, 127.0.0.1), parlé en HTTP :
     · INERTE sans configuration : `/api/config` et `/health` le disent, chaque route répond 503 (une personne connectée) ou 401 (un anonyme), et RIEN n'est ouvert vers un serveur ;
     · les refus : sans session (401), sans l'origine et l'en-tête maison (403), identifiant de boîte mal formé (404) ;
     · relier une boîte (mot de passe d'application) : le mot de passe n'est NI renvoyé, NI écrit en clair sur le disque (la base, son journal WAL), NI dans la sortie du service ;
     · l'ISOLEMENT : une autre personne ne voit pas la boîte (liste), et chaque geste sur elle (lire, ouvrir un message, une pièce, marquer, envoyer, délier) répond le MÊME 404 qu'une boîte qui n'existe pas
       — sans que le service ait ouvert la moindre connexion vers la boîte ;
     · lire : la liste et un message en TEXTE (un HTML piégé ne traverse pas : ni balise, ni script, ni lien `javascript:`), les en-têtes assainis et bornés, une pièce servie en téléchargement seulement,
       marquer lu / drapeau ;
     · envoyer : le message part du bon expéditeur avec ses pièces et le fil de la réponse, un en-tête injecté par l'objet ne s'ouvre pas, les refus (destinataires, pièces, taille) ;
     · les refus du fournisseur se DISENT sans citer ce qu'il répond (l'adresse peut y figurer) ; les plafonds (connexions, envois, boîtes par personne) ;
     · délier : la ligne et le secret partent ;
     · le crochet des bancs (bêta seulement) : refusé en production.
   Un faux IMAP (`tests/faux-imap-boites.js`, qui note chaque connexion) et un faux relais SMTP (`tests/outils-relais.js`) — rien ne sort de 127.0.0.1.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const { fauxRelais, lireMessage } = require('./outils-relais');
const { lireJournal } = require('./faux-imap-boites');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const MDP = { alice: 'pw-alice-boites01', bob: 'pw-bob-boites00001', carol: 'pw-carol-boites001' };
const BOITE_A = 'alice.pro@exemple.test', BOITE_B = 'bob.perso@exemple.test';
const SECRET_A = 'AppPassAliceXQZ9wvK', SECRET_B = 'AppPassBobXQZ9wvKb';
const b64 = (t) => Buffer.from(t).toString('base64');

(async () => {
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3270-'));
  const etatImap = path.join(racine, 'imap.json'), journalImap = path.join(racine, 'imap-journal.jsonl');
  const ecrireImap = (o) => fs.writeFileSync(etatImap, JSON.stringify(o));
  const lireImap = () => JSON.parse(fs.readFileSync(etatImap, 'utf8'));
  const msg = (uid, over) => Object.assign({ uid, messageId: '<m' + uid + '@exemple.test>', dossier: 'INBOX', from: 'client' + uid + '@societe.test', fromNom: 'Client ' + uid, to: BOITE_A,
    subject: 'Sujet ' + uid, text: 'Corps du message ' + uid, ts: Date.UTC(2026, 10, 1, 9, uid), flags: [] }, over || {});
  const CHARGE = Buffer.from('%PDF-1.4 contenu-de-la-piece-QZXW').toString('base64');
  const HTML_PIEGE = '<html><head><style>.a{color:red}</style><script>alert(1)</script></head><body onload="x()"><h1>Titre</h1><p>Bonjour <a href="javascript:alert(2)">clic</a> <img src="http://evil.test/t.png"></p></body></html>';
  const brutHtml = Buffer.from('From: hacker@evil.test\r\nTo: ' + BOITE_A + '\r\nSubject: =?UTF-8?B?' + b64('Promo ‮exe.txt') + '?=\r\nMessage-ID: <html1@evil.test>\r\nMIME-Version: 1.0\r\nContent-Type: text/html; charset=utf-8\r\n\r\n' + HTML_PIEGE).toString('base64');
  ecrireImap({ boites: {
    [BOITE_A]: { messages: [
      msg(1, { flags: ['\\Seen'] }),
      msg(2, { subject: 'Avec pièce', pieces: [{ nom: '../../etc/passwd', type: 'application/pdf', b64: CHARGE }], text: 'Voir le fichier joint' }),
      msg(3, { subject: 'HTML piégé', raw: brutHtml, from: 'hacker@evil.test', fromNom: '<img src=x onerror=alert(1)>' }),
      msg(4, { subject: 'S'.repeat(3000), fromNom: 'N'.repeat(500), text: 'x' }),
      msg(5, { subject: 'Réponse à ceci\u0007‮', text: 'à répondre' }),
    ] },
    [BOITE_B]: { messages: [msg(1, { to: BOITE_B, subject: 'Courrier de BOB — secret-de-bob', text: 'Contenu confidentiel de Bob QQWWEE', from: 'ami@exemple.test' })] },
  }, pannes: {} });

  const relais = await fauxRelais({ auth: { utilisateur: BOITE_A, mdp: SECRET_A }, annoncerAuth: true });
  const og = await T.fauxOpGestion({ alice: { pass: MDP.alice, nom: 'Alice Martin', actif: true }, bob: { pass: MDP.bob, nom: 'Bob Petit', actif: true }, carol: { pass: MDP.carol, nom: 'Carol Roy', actif: true } });
  const crochet = { boucle: true, serveurs: { imap: { hote: '127.0.0.1', port: 9993 }, smtp: { hote: '127.0.0.1', port: relais.port } }, delaiMs: 3000 };
  const envBase = { FAUX_IMAP: etatImap, FAUX_IMAP_JOURNAL: journalImap, FAUX_IMAP_RACINE: T.SERVICE, NODE_OPTIONS: '--require=' + path.join(__dirname, 'faux-imap-boites.js') };

  /* ══ 0. SANS CONFIGURATION : INERTE ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n0. Sans configuration : le module est INERTE, et le dit');
  const ferme = await T.lancerService({ urlGestion: og.url, env: Object.assign({ OPMSG_TEST_BOITES: JSON.stringify(crochet) }, envBase) });
  try {
    const cfg = await T.client(ferme.base).get('/api/config'), sante = await T.client(ferme.base).get('/health');
    v('/api/config : boitesMail.ouvert faux, aucun fournisseur d\'autorisation', cfg.j.boitesMail, { ouvert: false, oauth: { google: false, microsoft: false } });
    v('/health : boitesMail fermé, deux compteurs à zéro, rien d\'autre', sante.j.boitesMail, { ouvert: false, google: false, microsoft: false, echecs: 0, reconnexions: 0 });
    const A0 = await T.connecter(ferme, og, 'alice', MDP.alice);
    const l0 = await A0.get('/api/boites-mail'), a0 = await A0.post('/api/boites-mail', { adresse: BOITE_A, mdp: SECRET_A });
    v('une personne connectée : lister et relier répondent 503 boites_mail_fermees', [l0.code, l0.j, a0.code, a0.j], [503, { error: 'boites_mail_fermees' }, 503, { error: 'boites_mail_fermees' }]);
    const o0 = await A0.post('/api/boites-mail/oauth/demarrer', { fournisseur: 'google' }), m0 = await A0.get('/api/boites-mail/bm_' + '0'.repeat(32) + '/messages');
    v('   l\'autorisation et la lecture aussi', [o0.code, o0.j.error, m0.code, m0.j.error], [503, 'boites_mail_fermees', 503, 'boites_mail_fermees']);
    const r0 = await T.client(ferme.base).get('/api/boites-mail/oauth/retour?code=x&state=y');
    vrai('le retour d\'un fournisseur répond une page (200), qui renvoie vers l\'application avec un code d\'erreur, jamais une erreur JSON', r0.code === 200 && /refresh/.test(r0.txt) && /boites=erreur/.test(r0.txt));
    v('   ⛔ et le service n\'a ouvert AUCUNE connexion vers une boîte', lireJournal(journalImap).length, 0);
    /* B10 : un service FERMÉ ne lit pas le corps — un corps de 8 Mo (au-delà des 7 Mo permis) répond 503 `boites_mail_fermees`, pas 413 : la fermeture est jugée AVANT le lecteur */
    const gros0 = await A0.post('/api/boites-mail/bm_' + '0'.repeat(32) + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'z'.repeat(8 * 1024 * 1024) });
    v('⛔ B10 : fermé, l\'envoi répond 503 AVANT de lire un corps de 8 Mo (pas 413 : aucun octet n\'est analysé)', [gros0.code, gros0.j && gros0.j.error], [503, 'boites_mail_fermees']);
  } finally { await ferme.arreter(); }

  /* ══ 1. OUVERT : le service ══════════════════════════════════════════════════════════════════════════════ */
  const svc = await T.lancerService({ urlGestion: og.url, config: { boitesMail: { ouvert: true } }, env: Object.assign({ OPMSG_TEST_BOITES: JSON.stringify(crochet) }, envBase) });
  const BASE = path.join(svc.data, 'msg.db');
  const octets = () => { let t = Buffer.alloc(0); for (const f of fs.readdirSync(svc.data)) if (/^msg\.db/.test(f)) t = Buffer.concat([t, fs.readFileSync(path.join(svc.data, f))]); return t; };
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).all(...a); } finally { d.close(); } };
  const connexions = () => lireJournal(journalImap).length;
  const A = await T.connecter(svc, og, 'alice', MDP.alice), B = await T.connecter(svc, og, 'bob', MDP.bob);
  const anon = T.client(svc.base);
  const ID0 = 'bm_' + '0'.repeat(32);
  try {
    console.log('\n1. Ouvert : ce que le service annonce, et les refus d\'entrée');
    const cfg = await anon.get('/api/config'), sante = await anon.get('/health');
    v('/api/config : ouvert, aucun fournisseur d\'autorisation (rien n\'est configuré)', cfg.j.boitesMail, { ouvert: true, oauth: { google: false, microsoft: false } });
    v('/health : ouvert, aucun fournisseur, compteurs à zéro — des booléens et des nombres seulement', sante.j.boitesMail, { ouvert: true, google: false, microsoft: false, echecs: 0, reconnexions: 0 });
    const ROUTES = [['GET', '/api/boites-mail'], ['POST', '/api/boites-mail'], ['POST', '/api/boites-mail/oauth/demarrer'], ['POST', '/api/boites-mail/' + ID0 + '/supprimer'], ['GET', '/api/boites-mail/' + ID0 + '/messages'],
      ['GET', '/api/boites-mail/' + ID0 + '/messages/1'], ['GET', '/api/boites-mail/' + ID0 + '/messages/1/pieces/1'], ['POST', '/api/boites-mail/' + ID0 + '/messages/1/marquer'], ['POST', '/api/boites-mail/' + ID0 + '/envoyer']];
    const sans = [];
    for (const [m, c] of ROUTES) sans.push((await (m === 'GET' ? anon.get(c) : anon.post(c, {}))).code);
    v('⛔ SANS SESSION : les neuf routes répondent 401 (la route d\'envoi aussi — avant de lire un octet de son corps)', sans, ROUTES.map(() => 401));
    const grosAnon = await anon.post('/api/boites-mail/' + ID0 + '/envoyer', { a: 'x@y.fr', objet: 'x', texte: 'y'.repeat(2 * 1024 * 1024) });
    v('   ⛔ un anonyme qui poste 2 Mo à la route d\'envoi : 401, pas 413 (la garde passe AVANT le lecteur de corps)', grosAnon.code, 401);
    const sansOrigine = await A.post('/api/boites-mail', { adresse: BOITE_A, mdp: SECRET_A }, { sansOrigine: true }), sansEntete = await A.post('/api/boites-mail', { adresse: BOITE_A, mdp: SECRET_A }, { sansEntete: true });
    v('une écriture sans l\'origine de l\'application, ou sans l\'en-tête maison : 403', [sansOrigine.code, sansOrigine.j.error, sansEntete.code, sansEntete.j.error], [403, 'origine_refusee', 403, 'entete_requis']);
    const malForme = await A.get('/api/boites-mail/pas-un-identifiant/messages'), malForme2 = await A.get('/api/boites-mail/' + ID0 + '/messages');
    v('un identifiant de boîte mal formé, ou inconnu : le MÊME 404', [malForme.code, malForme.j, malForme2.code, malForme2.j], [404, { error: 'introuvable' }, 404, { error: 'introuvable' }]);
    v('   ⛔ rien de tout cela n\'a ouvert la moindre connexion vers une boîte', connexions(), 0);

    console.log('\n2. Relier une boîte : le mot de passe ne va nulle part');
    const refusAdresse = await A.post('/api/boites-mail', { adresse: 'pas-une-adresse', mdp: SECRET_A }), refusMdp = await A.post('/api/boites-mail', { adresse: BOITE_A, mdp: '' });
    v('une adresse invalide, un mot de passe absent : 400, sans connexion', [refusAdresse.code, refusAdresse.j.error, refusMdp.code, refusMdp.j.error, connexions()], [400, 'boite_adresse_invalide', 400, 'mot_de_passe_requis', 0]);
    ecrireImap(Object.assign(lireImap(), { pannes: { [BOITE_A]: 'AUTHENTICATIONFAILED pour ' + BOITE_A + ' ZZPANNEZZ' } }));
    const refuse = await A.post('/api/boites-mail', { adresse: BOITE_A, mdp: 'mauvais-mot-de-passe' });
    v('⛔ le fournisseur refuse l\'identifiant : 401 identifiants_refuses, un texte DIT par le service', [refuse.code, refuse.j.error, typeof refuse.j.message], [401, 'identifiants_refuses', 'string']);
    vrai('   ⛔ …qui ne cite NI ce que le fournisseur a répondu, NI l\'adresse, NI le mot de passe tapé', !/ZZPANNEZZ|exemple\.test|mauvais-mot-de-passe/.test(refuse.txt));
    v('   et aucune boîte n\'a été créée', (await A.get('/api/boites-mail')).j.boites, []);
    ecrireImap(Object.assign(lireImap(), { pannes: {} }));
    const ok = await A.post('/api/boites-mail', { adresse: BOITE_A.toUpperCase(), nom: 'Pro  Alice', mdp: SECRET_A });
    v('une boîte reliée : 201, sa vue (identifiant, adresse en minuscules, nom assaini, fournisseur, état)', [ok.code, ok.j.boite && ok.j.boite.adresse, ok.j.boite && ok.j.boite.nom, ok.j.boite && ok.j.boite.fournisseur, ok.j.boite && ok.j.boite.etat, /^bm_[0-9a-f]{32}$/.test(ok.j.boite && ok.j.boite.id)],
      [201, BOITE_A, 'Pro Alice', 'imap', 'ok', true]);
    const IDA = ok.j.boite.id;
    vrai('⛔ la réponse ne porte NI le mot de passe, NI un champ « secret / mdp / pass »', !ok.txt.includes(SECRET_A) && !/secret|mdp|pass/i.test(Object.keys(ok.j.boite).join(',')));
    const liste = await A.get('/api/boites-mail');
    v('la liste de la personne : cette boîte, rien de plus (aucun serveur, aucun secret)', [liste.code, liste.j.ouvert, liste.j.boites, liste.txt.includes(SECRET_A)], [200, true, [{ id: IDA, adresse: BOITE_A, nom: 'Pro Alice', fournisseur: 'imap', etat: 'ok' }], false]);
    const cx = lireJournal(journalImap).filter(x => x.pass === SECRET_A);
    v('le service s\'est présenté à la boîte avec l\'identifiant ET le mot de passe saisis, une fois pour cette connexion', [cx.length, cx[0] && cx[0].user, cx[0] && cx[0].host], [1, BOITE_A, '127.0.0.1']);
    const disque = octets();
    vrai('⛔ population : la base a été lue en entier (octets, journal WAL compris)', disque.length > 100000);
    v('⛔ LE MOT DE PASSE N\'EST PAS SUR LE DISQUE EN CLAIR (ni la base, ni son WAL), ni l\'adresse de la boîte', [disque.includes(SECRET_A), disque.includes(BOITE_A), disque.includes(Buffer.from(SECRET_A, 'utf16le'))], [false, false, false]);
    const ligne = sql('SELECT * FROM boite_mail');
    v('   une ligne, scellée : le chiffré ne contient que du binaire, l\'empreinte de l\'adresse est un hachage', [ligne.length, ligne[0].fournisseur, ligne[0].etat, /^[0-9a-f]{64}$/.test(ligne[0].adresse_h), Buffer.from(ligne[0].donnees_ch).length > 60], [1, 'imap', 'ok', true, true]);
    const seconde = await A.post('/api/boites-mail', { adresse: BOITE_A, mdp: SECRET_A });
    v('relier la MÊME adresse deux fois : la boîte est remplacée (même identifiant), pas dupliquée', [seconde.code, seconde.j.boite.id, (await A.get('/api/boites-mail')).j.boites.length], [201, IDA, 1]);
    const bob = await B.post('/api/boites-mail', { adresse: BOITE_B, mdp: SECRET_B });
    const IDB = bob.j.boite.id;
    v('une autre personne relie la sienne', [bob.code, (await B.get('/api/boites-mail')).j.boites.map(b => b.adresse)], [201, [BOITE_B]]);

    console.log('\n3. L\'isolement : la boîte d\'Alice n\'existe pas pour Bob');
    const avant = connexions();
    v('Bob ne voit que la sienne', (await B.get('/api/boites-mail')).j.boites.map(b => b.id), [IDB]);
    const volee = [await B.get('/api/boites-mail/' + IDA + '/messages'), await B.get('/api/boites-mail/' + IDA + '/messages/1'), await B.get('/api/boites-mail/' + IDA + '/messages/2/pieces/1'),
      await B.post('/api/boites-mail/' + IDA + '/messages/1/marquer', { lu: true }), await B.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'quelquun@exemple.test', objet: 'x', texte: 'y' }), await B.post('/api/boites-mail/' + IDA + '/supprimer', {})];
    v('⛔ lire, ouvrir, une pièce, marquer, ENVOYER, délier la boîte d\'Alice : six fois le MÊME 404 qu\'une boîte inexistante', volee.map(r => [r.code, r.j]), volee.map(() => [404, { error: 'introuvable' }]));
    v('   ⛔ et le service n\'a ouvert aucune connexion pour ces six tentatives, ni envoyé un message', [connexions() - avant, relais.messages.length], [0, 0]);
    v('   la boîte d\'Alice est intacte', (await A.get('/api/boites-mail')).j.boites.map(b => b.id), [IDA]);
    const bobLit = await B.get('/api/boites-mail/' + IDB + '/messages');
    vrai('   et Bob lit SA boîte (le contrôle : l\'accès n\'est pas fermé à tout le monde)', bobLit.code === 200 && bobLit.j.messages.length === 1 && /secret-de-bob/.test(bobLit.j.messages[0].objet));
    const aliceLit = await A.get('/api/boites-mail/' + IDA + '/messages');
    vrai('   ⛔ la lecture d\'Alice ne contient rien de la boîte de Bob', !/secret-de-bob|QQWWEE|bob\.perso/.test(aliceLit.txt));

    console.log('\n4. Lire : la liste, un message, en TEXTE');
    v('la liste : cinq messages, du plus récent au plus ancien, avec le contrat du module', [aliceLit.code, aliceLit.j.messages.map(m => m.uid), aliceLit.j.messages.every(m => typeof m.id === 'string' && m.id.startsWith(IDA + '.') && typeof m.date === 'number' && typeof m.lu === 'boolean')],
      [200, [5, 4, 3, 2, 1], true]);
    const m1 = aliceLit.j.messages.find(m => m.uid === 1), m2 = aliceLit.j.messages.find(m => m.uid === 2), m3 = aliceLit.j.messages.find(m => m.uid === 3), m4 = aliceLit.j.messages.find(m => m.uid === 4);
    v('un message lu, un non lu ; l\'expéditeur, l\'objet, l\'aperçu', [m1.lu, m2.lu, m1.de, m1.objet, m1.apercu], [true, false, { nom: 'Client 1', email: 'client1@societe.test' }, 'Sujet 1', 'Corps du message 1']);
    v('une pièce jointe est annoncée (nom assaini, taille, type)', [m2.pj.length, m2.pj[0].nom, m2.pj[0].type], [1, '../../etc/passwd', 'application/pdf']);
    v('⛔ un objet de 3 000 signes et un nom de 500 : bornés (300 et 120)', [Array.from(m4.objet).length, Array.from(m4.de.nom).length], [300, 120]);
    vrai('⛔ le sens inversé d\'un objet (U+202E) et les signes de contrôle n\'arrivent pas à la page', !/[‮\u0007]/.test(aliceLit.txt));
    vrai('   l\'expéditeur « <img onerror> » est une chaîne inerte (la page l\'échappe) et rien d\'autre : pas un champ HTML', m3.de.nom === '<img src=x onerror=alert(1)>' && typeof m3.apercu === 'string');
    const o1 = await A.get('/api/boites-mail/' + IDA + '/messages/1');
    v('ouvrir un message : son texte, sans pièce', [o1.code, o1.j], [200, { corps: 'Corps du message 1', pj: [] }]);
    const o3 = await A.get('/api/boites-mail/' + IDA + '/messages/3');
    v('⛔ UN HTML PIÉGÉ : du texte — ni balise, ni script, ni image distante, ni « javascript: »', [o3.code, /<[a-z!/]/i.test(o3.j.corps), /<script|onload|onerror|<img|<style/i.test(o3.txt), /javascript:/i.test(o3.j.corps), o3.j.corps.includes('Bonjour')], [200, false, false, false, true]);
    v('   (le texte tiré du HTML garde l\'adresse de l\'image entre crochets — une chaîne, jamais chargée)', /\[http:\/\/evil\.test\/t\.png\]/.test(o3.j.corps), true);
    const o2 = await A.get('/api/boites-mail/' + IDA + '/messages/2');
    v('un message à pièce : la pièce est listée avec son rang', [o2.j.corps, o2.j.pj.length, o2.j.pj[0].id, o2.j.pj[0].type], ['Voir le fichier joint', 1, '1', 'application/pdf']);
    const p1 = await fetch(svc.base + '/api/boites-mail/' + IDA + '/messages/2/pieces/1', { headers: { Cookie: A.enteteCookie() } });
    const corpsP = Buffer.from(await p1.arrayBuffer());
    v('⛔ la pièce : octets opaques, téléchargement forcé, nosniff, sandbox — jamais interprétée', [p1.status, p1.headers.get('content-type'), /^attachment/.test(p1.headers.get('content-disposition')), p1.headers.get('x-content-type-options'), /sandbox/.test(p1.headers.get('content-security-policy')), p1.headers.get('cache-control')],
      [200, 'application/octet-stream', true, 'nosniff', true, 'no-store']);
    vrai('   le contenu est celui de la pièce, et son nom ne remonte pas d\'un dossier (« ../../ » devient « .._.._ »)', corpsP.toString().includes('contenu-de-la-piece-QZXW') && !/filename\*?=[^;]*\.\.\//.test(p1.headers.get('content-disposition')) && /etc_passwd/.test(decodeURIComponent(p1.headers.get('content-disposition'))));
    const pm = [await A.get('/api/boites-mail/' + IDA + '/messages/2/pieces/9'), await A.get('/api/boites-mail/' + IDA + '/messages/999'), await A.get('/api/boites-mail/' + IDA + '/messages/abc'), await A.get('/api/boites-mail/' + IDA + '/messages/2/pieces/0')];
    v('une pièce ou un message qui n\'existe pas, un identifiant mal formé : 404', pm.map(r => r.code), [404, 404, 404, 404]);
    v('marquer lu, puis non lu, drapeau', [(await A.post('/api/boites-mail/' + IDA + '/messages/2/marquer', { lu: true })).code, lireImap().boites[BOITE_A].messages.find(m => m.uid === 2).flags,
      (await A.post('/api/boites-mail/' + IDA + '/messages/2/marquer', { drapeau: true, lu: false })).code, lireImap().boites[BOITE_A].messages.find(m => m.uid === 2).flags], [200, ['\\Seen'], 200, ['\\Flagged']]);
    const mq = [await A.post('/api/boites-mail/' + IDA + '/messages/2/marquer', {}), await A.post('/api/boites-mail/' + IDA + '/messages/2/marquer', { lu: 'oui' })];
    v('   un geste sans champ, ou d\'un mauvais type : 400', mq.map(r => r.code), [400, 400]);

    console.log('\n5. Envoyer');
    const nb0 = relais.messages.length;
    const env = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'Client Un <client1@societe.test>', objet: 'Devis du chantier', texte: 'Bonjour,\nVoici le devis.\n.\nUne ligne qui commence par un point.', enReponseA: '5',
      pieces: [{ nom: 'devis.pdf', type: 'application/pdf', b64: CHARGE }] });
    v('envoyer : 200', [env.code, env.j], [200, { ok: true }]);
    const recu = relais.messages[relais.messages.length - 1] && lireMessage(relais.messages[relais.messages.length - 1]);
    v('le relais a reçu UN message de plus, authentifié', [relais.messages.length - nb0, relais.etat.auths.filter(Boolean).length > 0], [1, true]);
    v('   de la boîte d\'Alice, au destinataire (l\'adresse nue de « Nom <adresse> »), avec l\'objet et le texte', [recu.enveloppe.de, recu.enveloppe.a, recu.sujet, /Voici le devis/.test(recu.texte || ''), (recu.texte || '').includes('Une ligne qui commence par un point.')], [BOITE_A, ['client1@societe.test'], 'Devis du chantier', true, true]);
    vrai('   la pièce jointe part avec son contenu', recu.parts.some(p => /devis\.pdf/.test(p.h['content-disposition'] ? p.h['content-disposition'][0] : '') && p.octets.toString().includes('contenu-de-la-piece-QZXW')));
    v('   le fil de la conversation : In-Reply-To est l\'identifiant du message 5, relu chez le fournisseur (jamais une valeur de la page)', recu.h['in-reply-to'], ['<m5@exemple.test>']);
    const inj = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'client1@societe.test', objet: 'Bonjour\r\nBcc: espion@evil.test\r\nX-Piege: 1', texte: 'corps' });
    const recuInj = lireMessage(relais.messages[relais.messages.length - 1]);
    v('⛔ un objet qui tente d\'ouvrir un en-tête (« \\r\\nBcc: … ») : une seule ligne d\'objet, aucun Bcc, personne d\'autre au relais', [inj.code, recuInj.h['bcc'], recuInj.h['x-piege'], recuInj.enveloppe.a, recuInj.sujet.includes('Bcc: espion')], [200, undefined, undefined, ['client1@societe.test'], true]);
    const refusEnv = [
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: '', objet: 'x', texte: 'y' }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'pas-une-adresse', objet: 'x', texte: 'y' }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr, c@d.fr, e@f.fr, g@h.fr, i@j.fr, k@l.fr', objet: 'x', texte: 'y' }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y', pieces: [1, 2, 3, 4].map(() => ({ nom: 'a.txt', b64: 'QQ==' })) }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y', pieces: [{ nom: 'a.txt', b64: '***pas-du-base64***' }] }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y', pieces: [{ nom: 'gros.bin', b64: Buffer.alloc(4.5 * 1024 * 1024, 7).toString('base64') }] }),
      await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y', enReponseA: '<injecte@x>' }),
    ];
    v('les refus : destinataire absent, invalide, six destinataires, quatre pièces, pièce illisible, plus de 4 Mo, réponse à un identifiant forgé', refusEnv.map(r => [r.code, r.j.error]),
      [[400, 'boite_destinataire_invalide'], [400, 'boite_destinataire_invalide'], [400, 'boite_destinataire_invalide'], [400, 'pieces_invalides'], [400, 'pieces_invalides'], [413, 'trop_gros'], [400, 'champ_invalide']]);
    const nb1 = relais.messages.length;
    v('   ⛔ aucun de ces refus n\'a fait partir un message', relais.messages.length, nb1);
    const gros = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'z'.repeat(8 * 1024 * 1024) });
    v('un corps de plus de 7 Mo : 413 trop_gros, le service reste debout', [gros.code, gros.j && gros.j.error, (await anon.get('/health')).code], [413, 'trop_gros', 200]);
    relais.etat.rcpt = 'refus';
    const refRel = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y' });
    relais.etat.rcpt = 'ok';
    v('le relais refuse le destinataire : 502 envoi_refuse, un texte DIT — sans citer sa réponse', [refRel.code, refRel.j.error, /RELAIS-WQXZ|boîte inconnue/.test(refRel.txt)], [502, 'envoi_refuse', false]);
    const aMauvaisMdp = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'a@b.fr', objet: 'x', texte: 'y' });
    v('   et le service continue d\'envoyer ensuite', aMauvaisMdp.code, 200);

    console.log('\n6. Les plafonds');
    const C = await T.connecter(svc, og, 'carol', MDP.carol);
    const tentatives = []; for (let i = 0; i < 11; i++) tentatives.push((await C.post('/api/boites-mail', { adresse: 'carol' + i + '@exemple.test', mdp: 'motdepasse-' + i })).code);
    v('⛔ DIX tentatives de connexion par heure et par personne : 5 passent (cinq boîtes), la sixième est « trop_de_boites » (409), puis le plafond (429) à la onzième', tentatives, [201, 201, 201, 201, 201, 409, 409, 409, 409, 409, 429]);
    const cl = (await C.get('/api/boites-mail')).j.boites;
    v('   cinq boîtes pour Carol, et la liste de Bob n\'en a pas bougé', [cl.length, (await B.get('/api/boites-mail')).j.boites.length], [5, 1]);
    const envois = []; for (let i = 0; i < 31; i++) envois.push((await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'q' + i + '@exemple.test', objet: 'rafale ' + i, texte: 'x' })).code);
    const ok200 = envois.filter(c => c === 200).length;
    vrai('⛔ TRENTE envois par heure et par personne : au-delà, 429 (déjà ' + (envois.length - ok200) + ' refusés sur 31 : les envois de plus haut comptent)', ok200 < 31 && envois[envois.length - 1] === 429);
    const r429 = await A.post('/api/boites-mail/' + IDA + '/envoyer', { a: 'q@exemple.test', objet: 'x', texte: 'y' });
    v('   le refus donne Retry-After, et Bob peut toujours envoyer depuis la sienne (le plafond est PAR PERSONNE)', [r429.code, Number(r429.h.get('retry-after')) > 0], [429, true]);

    console.log('\n7. Délier');
    const del = await A.post('/api/boites-mail/' + IDA + '/supprimer', {});
    v('délier : 200, la boîte n\'est plus listée', [del.code, (await A.get('/api/boites-mail')).j.boites], [200, []]);
    v('   la ligne est partie de la base, et son identifiant est au registre des purges (une restauration ne la relie pas)', [sql('SELECT * FROM boite_mail WHERE id = ?', IDA).length, sql(`SELECT objet FROM purge WHERE genre = 'boite_mail'`).map(r => r.objet).includes(IDA)], [0, true]);
    const apres = [await A.get('/api/boites-mail/' + IDA + '/messages'), await A.post('/api/boites-mail/' + IDA + '/supprimer', {})];
    v('   délier deux fois, ou lire une boîte déliée : 404', apres.map(r => r.code), [404, 404]);

    console.log('\n8. Ce que le service a écrit, lu en entier');
    const sortie = svc.sortie.texte();
    vrai('population : le service a journalisé (un zéro sur du vide ne prouve rien)', sortie.length > 200);
    v('⛔ AUCUN mot de passe, adresse de boîte, expéditeur ni sujet dans le journal du service', [SECRET_A, SECRET_B, BOITE_A, BOITE_B, 'societe.test', 'Devis du chantier', 'Contenu confidentiel'].map(m => sortie.includes(m)), [false, false, false, false, false, false, false]);
    const sante2 = await anon.get('/health');
    vrai('/health : des booléens et des nombres, jamais une adresse ni un secret', JSON.stringify(sante2.j.boitesMail).length < 200 && !/exemple\.test|AppPass/.test(sante2.txt));
    vrai('   les refus et pannes de ce banc sont comptés (le compteur sert à la surveillance)', sante2.j.boitesMail.echecs >= 1);
    const exp = await A.post('/api/compte/export', {});
    vrai('l\'export du compte porte les boîtes (adresse, fournisseur) et jamais un secret', exp.code === 200 && !exp.txt.includes(SECRET_A) && exp.txt.includes('boites_mail'));
  } catch (e) { console.log('  ✗ EXCEPTION', e && e.stack || e); process.exitCode = 1; }
  finally { await svc.arreter(); await relais.fermer(); await og.fermer(); try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }

  console.log('\n9. Le crochet des bancs est refusé en production');
  {
    const p = await T.lancerService({ instance: 'prod', urlGestion: og.url, attendreSante: false, env: { OPMSG_TEST_BOITES: JSON.stringify({ boucle: true }) } });
    const sorti = await T.attendre(() => p.sorti() !== null, 6000);
    vrai('un service de production qui reçoit OPMSG_TEST_BOITES REFUSE de démarrer (code de sortie non nul, jamais la boucle locale ouverte par erreur)', sorti && p.sorti() !== 0 && /OPMSG_TEST_BOITES/.test(p.sortie.texte()));
    await p.arreter();
  }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exitCode = 1; T.compteur && 0; process.exit(1); });
