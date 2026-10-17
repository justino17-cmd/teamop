/* ⛔ CE QUE CE FICHIER GARDE — LA MESSAGERIE DE LA TOUR, TRIÉE ENTRE LES DEUX CONSOLES, SUR LE VRAI SERVEUR.

   Justin, 17 octobre 2026 : la Tour a deux consoles, OP GESTION et OP MESSAGES, et pour le courrier « mêmes boîtes,
   triées ». Le moteur multi-boîtes existait (`server/mail.js`) ; il manquait six choses, et chacune se garde ici :

   1. LE TRI. Chaque message porte `console` : 'gestion', 'messages' ou 'atrier', décidé par l'adresse de
      l'INTERLOCUTEUR — l'expéditeur d'un message reçu, le premier destinataire d'un message envoyé. Une règle posée à la
      main passe avant tout (l'adresse exacte avant son domaine), puis l'annuaire d'OP GESTION (les espaces, les fiches
      clients), puis OP MESSAGES (un crochet qui rend faux : son serveur n'existe pas encore), sinon 'atrier'.
      `/mail/liste?console=x` rend les messages de x ET ceux à trier, jamais ceux de l'autre.
   2. L'ENVOI AVEC DE VRAIES PIÈCES. Le plafond global de 6 Mo refusait en 413 AVANT la route une promesse de 12 Mo.
      Les deux routes qui portent des pièces ont leur analyseur (20 Mo, monté APRÈS la session) ; toutes les autres
      gardent leurs 6 Mo ; et l'envoi a un budget : 60 messages par heure et par compte de la Tour.
   3. LES NON-LUS DE CHAQUE DOSSIER (IMAP STATUS), gardés quelques secondes et oubliés à chaque geste qui les change.
   4. AUCUNE ADRESSE DANS UNE ERREUR, ni dans le journal du serveur.
   5. LA RELÈVE DU SUPPORT NE MARQUE PLUS « LU » une boîte que la Messagerie relève : elle importe, elle ne touche
      pas un drapeau — sinon les non-lus de la Messagerie tombent à zéro sans que personne n'ait rien lu.
   6. UN FAUX IMAP RÉUTILISABLE (`tests/faux-imap.js`), sorti de `test-834`.

   ⛔ LE VRAI SERVEUR, isolé sur 127.0.0.1 : un facteur SMTP de banc, la fausse boîte IMAP glissée par `node -r`, des
   données et une configuration jetables. Rien ne sort d'ici. Ce fichier ne lit aucune page : il part avec le
   déploiement du serveur seul.

   ⛔ CHAQUE ABSENCE COMPTÉE PROUVE D'ABORD SA POPULATION. « Aucun message de l'autre console » ne vaut que si la liste
   en contient (« au moins N messages lus », puis chaque console représentée). Les attendus viennent d'un ORACLE écrit ici,
   à partir de l'état de la fausse boîte — jamais du serveur qu'on juge. Voir les mutations éprouvées dans le message du
   commit qui a posé ce fichier. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), net = require('net');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SERVEUR = process.env.SERVEUR_FICHIER ? path.resolve(process.env.SERVEUR_FICHIER) : path.join(RACINE, 'server', 'index.js');
const FAUX = path.join(__dirname, 'faux-imap.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const sha = x => crypto.createHash('sha256').update(x).digest('hex');
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b1012-'));
let enfant = null, facteurSrv = null;
const fin = () => { try { if (enfant) enfant.kill('SIGKILL'); } catch (e) {} try { if (facteurSrv) facteurSrv.s.close(); } catch (e) {}
  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} };
process.on('exit', fin);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 300 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fin(); process.exit(1); }, 300000).unref();

/* ── Le facteur : il garde chaque message reçu, et REFUSE un destinataire (l'erreur d'un vrai serveur d'e-mails recopie
      l'adresse refusée — c'est ce que l'envoi ne doit pas renvoyer à la Tour). Point doublé retiré (RFC 5321 §4.5.2). ── */
function facteur() {
  const f = { recus: [] };
  f.s = net.createServer(c => {
    c.on('error', () => {});
    let tampon = '', corps = false, msg = '';
    c.write('220 banc\r\n');
    c.on('data', d => {
      tampon += d.toString('utf8');
      let i;
      while ((i = tampon.indexOf('\r\n')) >= 0) {
        const l = tampon.slice(0, i); tampon = tampon.slice(i + 2);
        if (corps) { if (l === '.') { corps = false; f.recus.push(msg); msg = ''; c.write('250 ok\r\n'); } else msg += (l.startsWith('.') ? l.slice(1) : l) + '\n'; continue; }
        const h = l.toUpperCase();
        if (h.startsWith('EHLO') || h.startsWith('HELO')) c.write('250-banc\r\n250 AUTH PLAIN LOGIN\r\n');
        else if (h.startsWith('AUTH')) c.write('235 ok\r\n');
        else if (h.startsWith('RCPT') && h.includes('REJETE@')) c.write('550 5.1.1 <rejete@exemple-1012.fr> Recipient address rejected: user unknown\r\n');
        else if (h.startsWith('DATA')) { corps = true; c.write('354 go\r\n'); }
        else if (h.startsWith('QUIT')) { c.write('221 bye\r\n'); c.end(); }
        else c.write('250 ok\r\n');
      }
    });
  });
  return f;
}

console.log('\n── 1012 · la Messagerie de la Tour, triée entre OP GESTION et OP MESSAGES — sur le vrai serveur ──');
(async () => {
  let webpush, mailparser;
  try {
    webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
    mailparser = require(path.join(RACINE, 'server', 'node_modules', 'mailparser'));
    require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] });
  } catch (e) { console.log('  … SAUTÉ : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(0); }

  facteurSrv = facteur();
  const portSmtp = await new Promise(res => facteurSrv.s.listen(0, '127.0.0.1', () => res(facteurSrv.s.address().port)));

  /* ══ LES DONNÉES — trois boîtes, un annuaire, des messages de toutes les provenances ══════════════════════════ */
  const BA = 'contact@banc-1012.fr', BB = 'support2@banc-1012.fr', BC = 'casse@banc-1012.fr';
  const D = path.join(banc, 'data'); fs.mkdirSync(D, { recursive: true });
  const code64 = (t) => Buffer.from(JSON.stringify({ t, k: 'cle-propre-' + t })).toString('base64');
  /* L'annuaire d'OP GESTION : deux espaces qui portent une adresse, un qui n'en porte pas, une fiche client. */
  fs.writeFileSync(path.join(D, 'espaces.json'), JSON.stringify({
    espacea: { t: 't-a-1012', nom: 'Entreprise A', code: code64('t-a-1012'), ts: Date.now(), email: 'espace-a@exemple-1012.fr' },
    double: { t: 't-d-1012', nom: 'Entreprise D', code: code64('t-d-1012'), ts: Date.now(), email: 'Double@Exemple-1012.fr' },
    comptable: { t: 't-c-1012', nom: 'Cabinet', code: code64('t-c-1012'), ts: Date.now(), email: 'comptable@cabinet-1012.fr' },
    sansmail: { t: 't-s-1012', nom: 'Sans Adresse', code: code64('t-s-1012'), ts: Date.now() } }));
  fs.writeFileSync(path.join(D, 'clients.json'), JSON.stringify({
    'fiche-b@exemple-1012.fr': { email: 'fiche-b@exemple-1012.fr', entreprise: 'Fiche B', inscrit: Date.now() - 86400000 } }));
  const ANNUAIRE = ['espace-a@exemple-1012.fr', 'double@exemple-1012.fr', 'fiche-b@exemple-1012.fr', 'comptable@cabinet-1012.fr'];
  const MDP = 'mot-de-passe-du-banc-1012', MDP2 = 'mot-de-passe-agent-1012';
  const PROTEGE = '0123456789abcdef0123456789abcdef.securite@banc-1012.fr';
  fs.writeFileSync(path.join(D, 'mails-proteges.json'), JSON.stringify([PROTEGE]));
  fs.writeFileSync(path.join(banc, 'monitor.json'), JSON.stringify({ users: [
    { id: 'u-patron', nom: 'Patron', email: '', hash: sha(MDP), role: 'patron', actif: true, ts: Date.now() },
    { id: 'u-agent', nom: 'Agent', email: '', hash: sha(MDP2), role: 'collaborateur', actif: true, ts: Date.now() }] }));
  const boiteJ = (id, email) => ({ id, email, pass: 'x', imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, nom: 'TEAM OP', ts: Date.now(), par: 'banc' });
  fs.writeFileSync(path.join(D, 'mail-boites.json'), JSON.stringify([boiteJ('b-a', BA), boiteJ('b-b', BB), boiteJ('b-c', BC)]));
  /* La boîte du support d'AVANT est la boîte A : la Messagerie la relève aussi. */
  fs.writeFileSync(path.join(D, 'support-box.json'), JSON.stringify({ email: BA, pass: 'x', imapHost: '127.0.0.1', imapPort: 993, smtpHost: '127.0.0.1', smtpPort: portSmtp, ts: Date.now() }));

  const IMAP = path.join(banc, 'faux-imap.json');
  const etat = { boites: { [BA]: { messages: [], actions: [] }, [BB]: { messages: [], actions: [] } },
    pannes: { [BC]: 'Invalid credentials (Failure) pour ' + BC + ' — écrire à admin@banc-1012.fr' } };
  const T0 = Date.now() - 5 * 86400000, rang = {};
  /* Un message posé dans la fausse boîte : `de`, `objet`, `lu`, et au besoin `a`, `pieces`, `html`, `id`. */
  const poser = (boite, dossier, o) => {
    const k = boite + '|' + dossier; rang[k] = (rang[k] || 0) + 1; const n = rang[k];
    const m = { dossier, uid: n, messageId: o.mid || ('<' + (dossier.slice(0, 2).toLowerCase() + n + '-' + boite.slice(0, 3)) + '@banc-1012>'), from: o.de || 'inconnu@inconnu-1012.fr', fromNom: o.nom || '',
      to: o.a || boite, subject: o.objet || ('Message ' + n), text: 'Corps du message ' + n, ts: T0 + n * 600000, flags: o.drapeaux || (o.lu ? ['\\Seen'] : []) };
    if (o.pieces) m.pieces = o.pieces; if (o.html) m.html = o.html; if (o.cc) m.cc = o.cc;
    etat.boites[boite].messages.push(m); return m;
  };
  /* BOÎTE A · Réception : 16 messages choisis, puis 60 en vrac (de quoi paginer). */
  poser(BA, 'INBOX', { de: 'espace-a@exemple-1012.fr', objet: 'Facture mars' });                       // 1  gestion (espace)
  poser(BA, 'INBOX', { de: 'fiche-b@exemple-1012.fr', objet: 'Question abonnement' });                 // 2  gestion (fiche client)
  poser(BA, 'INBOX', { de: 'inconnu@inconnu-1012.fr', objet: 'Bonjour' });                             // 3  à trier
  poser(BA, 'INBOX', { de: 'paul@partenaire-1012.fr', objet: 'Collaboration' });                       // 4  règle exacte
  poser(BA, 'INBOX', { de: 'agent@societe-1012.fr', objet: 'Offre' });                                 // 5  règle de domaine
  poser(BA, 'INBOX', { de: 'double@exemple-1012.fr', objet: 'Re: devis', lu: true });                  // 6  espace ET règle : la règle gagne
  poser(BA, 'INBOX', { de: 'noreply@stripe-1012.fr', objet: 'Reçu de paiement', lu: true });           // 7  notification, à trier
  poser(BA, 'INBOX', { de: 'espace-a@exemple-1012.fr', objet: 'Devis signé', html: '<p>Voir <b>devis</b></p>', pieces: [{ nom: 'devis.pdf', type: 'application/pdf', taille: 2345 }] }); // 8
  poser(BA, 'INBOX', { de: 'ESPACE-A@Exemple-1012.FR', objet: 'Majuscules', lu: true });                // 9  même adresse, autre casse
  poser(BA, 'INBOX', { de: 'directeur@societe-1012.fr', objet: 'Suite', lu: true });                   // 10 règle de domaine
  poser(BA, 'INBOX', { de: 'autre-partenaire@partenaire-1012.fr', objet: 'Question' });                // 11 à trier (seul Paul a une règle)
  poser(BA, 'INBOX', { de: 'espace-a@exemple-1012.fr', nom: 'Anne Durand', objet: 'Avec un nom', lu: true }); // 12
  poser(BA, 'INBOX', { de: 'banc@teamop.fr', mid: '<' + PROTEGE + '>', objet: 'Avis de sécurité' });                // 13 protégé
  poser(BA, 'INBOX', { de: 'comptable@cabinet-1012.fr', objet: 'Bilan', lu: true });                      // 14 gestion (espace) ; le domaine aura une règle
  poser(BA, 'INBOX', { de: 'asso@cabinet-1012.fr', objet: 'Cotisation', lu: true });                     // 15 à trier ; une règle d'adresse la rangera
  poser(BA, 'INBOX', { de: 'tiers@cabinet-1012.fr', objet: 'Contrat', lu: true });                       // 16 à trier ; seule la règle du domaine la touche
  const VRAC = ['espace-a@exemple-1012.fr', 'agent@societe-1012.fr', 'autre@inconnu-1012.fr'];
  for (let i = 0; i < 60; i++) poser(BA, 'INBOX', { de: VRAC[i % 3], objet: 'En vrac ' + i, lu: i % 4 !== 0 });
  /* Envoyés : l'interlocuteur est le DESTINATAIRE — y compris pour un message écrit d'un alias de la boîte. */
  poser(BA, 'Envoyés', { de: BA, a: 'espace-a@exemple-1012.fr', objet: 'Votre facture', lu: true });
  poser(BA, 'Envoyés', { de: BA, a: 'paul@partenaire-1012.fr', cc: 'espace-a@exemple-1012.fr', objet: 'Notre collaboration', lu: true });
  poser(BA, 'Envoyés', { de: 'ancien-alias@banc-1012.fr', a: 'agent@societe-1012.fr', objet: 'Depuis un alias', lu: true });
  poser(BA, 'Brouillons', { de: BA, a: 'fiche-b@exemple-1012.fr', objet: 'Brouillon A', lu: true, drapeaux: ['\\Draft', '\\Seen'] });
  poser(BA, 'Brouillons', { de: BA, a: 'inconnu@inconnu-1012.fr', objet: 'Brouillon B', drapeaux: ['\\Draft'] });
  poser(BA, 'Archives', { de: 'espace-a@exemple-1012.fr', objet: 'Archive 1' });
  poser(BA, 'Archives', { de: 'espace-a@exemple-1012.fr', objet: 'Archive 2' });
  for (let i = 0; i < 3; i++) poser(BA, 'Indésirables', { de: 'pourriel' + i + '@inconnu-1012.fr', objet: 'Gagnez ' + i });
  poser(BA, 'Corbeille', { de: 'inconnu@inconnu-1012.fr', objet: 'Jeté (non lu)' });
  poser(BA, 'Corbeille', { de: 'inconnu@inconnu-1012.fr', objet: 'Jeté (lu)', lu: true });
  /* BOÎTE B · une petite réception, et des Archives de 1 600 messages lus (la fenêtre de tri est de 1 500). */
  poser(BB, 'INBOX', { de: 'espace-a@exemple-1012.fr', objet: 'B : gestion' });
  poser(BB, 'INBOX', { de: 'inconnu@inconnu-1012.fr', objet: 'B : à trier', lu: true });
  poser(BB, 'INBOX', { de: 'directeur@societe-1012.fr', objet: 'B : domaine' });
  for (let i = 0; i < 1600; i++) poser(BB, 'Archives', { de: 'espace-a@exemple-1012.fr', objet: 'Ancien ' + i, lu: true });
  fs.writeFileSync(IMAP, JSON.stringify(etat));
  const lireEtat = () => JSON.parse(fs.readFileSync(IMAP, 'utf8'));
  const partie0 = (f) => Object.values(JSON.parse(fs.readFileSync(f, 'utf8')).boites)[0];   // la boîte unique d'un état de banc du faux IMAP
  const ecrireEtat = (e) => { fs.writeFileSync(IMAP + '.tmp', JSON.stringify(e)); fs.renameSync(IMAP + '.tmp', IMAP); };
  const lireD = (f) => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (e) { return null; } };
  const messagesDe = (boite, dossier) => lireEtat().boites[boite].messages.filter(m => m.dossier === dossier);
  const nonLusOracle = (boite, dossier) => messagesDe(boite, dossier).filter(m => !(m.flags || []).includes('\\Seen')).length;

  /* ── L'ORACLE : ce qu'une règle, l'annuaire et la direction du message décident — écrit ici, sans le serveur ── */
  const domaineDe = a => a.slice(a.lastIndexOf('@'));
  const oracle = (adr, regles) => { const a = String(adr || '').toLowerCase(); if (!a) return 'atrier'; const r = regles[a] || regles[domaineDe(a)]; if (r) return r; return ANNUAIRE.includes(a) ? 'gestion' : 'atrier'; };
  const premier = (x) => String(x || '').split(/[,;]/)[0].trim().toLowerCase();
  const interlocuteurO = (m, boite) => (m.dossier === 'Envoyés' || m.dossier === 'Brouillons' || m.from.toLowerCase() === boite) ? (premier(m.to) || premier(m.cc)) : m.from.toLowerCase();
  const attendu = (boite, dossier, regles) => { const o = {}; messagesDe(boite, dossier).forEach(m => { o[m.uid] = oracle(interlocuteurO(m, boite), regles); }); return o; };

  /* ══ LE VRAI SERVEUR ═══════════════════════════════════════════════════════════════════════════════════════════ */
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    smtp: { host: '127.0.0.1', port: portSmtp, secure: false, user: 'x', pass: 'y', from: 'banc@teamop.fr' } }));
  const PORT = await new Promise(res => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); });
  const B = 'http://127.0.0.1:' + PORT;
  let journal = '';
  const demarrer = async () => {
    journal = '';
    enfant = spawn(process.execPath, ['-r', FAUX, SERVEUR], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: D, PORT: String(PORT),
        TEAMOP_FB_ADMIN: path.join(banc, 'absente.json'), TEAMOP_FB_OAUTH_URL: 'http://127.0.0.1:9/token', TEAMOP_FIRESTORE_URL: 'http://127.0.0.1:9',
        TEAMOP_IDTK_URL: 'http://127.0.0.1:9/idtk', TEAMOP_FB_CERTS_URL: 'http://127.0.0.1:9/certs',
        TEAMOP_MAIL_NONLUS_MS: '4000', FAUX_IMAP: IMAP, FAUX_IMAP_RACINE: path.join(RACINE, 'server') }),
      stdio: ['ignore', 'pipe', 'pipe'] });
    enfant.stdout.on('data', d => { journal += d; }); enfant.stderr.on('data', d => { journal += d; });
    let vivant = false;
    for (let i = 0; i < 100 && !vivant; i++) { try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} if (!vivant) await dormir(100); }
    return vivant;
  };
  /* Le budget global de 120 requêtes par minute et par adresse (`server/index.js`) existe ici aussi, et ce banc en fait
     plus de 200 : derrière nginx, le serveur lit l'adresse dans X-Forwarded-For (`trust proxy`), donc chaque appel part
     d'un « poste » différent — comme le font les autres bancs du serveur. Une réponse « trop de requêtes » reste
     filet : ce n'est pas celle de la route qu'on juge, on attend et on redemande. */
  let pauses = 0, nAdr = 0;
  const http = async (methode, route, jeton, corps) => {
    for (let essai = 0; essai < 60; essai++) {
      const r = await fetch(B + route, { method: methode, headers: Object.assign({ 'X-Forwarded-For': '10.101.' + ((++nAdr >> 8) & 255) + '.' + (nAdr & 255) }, corps !== undefined ? { 'Content-Type': 'application/json' } : {}, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
        body: corps === undefined ? undefined : (typeof corps === 'string' ? corps : JSON.stringify(corps)) });
      const txt = await r.text(); let j = null; try { j = JSON.parse(txt); } catch (e) {}
      if (r.status === 429 && j && j.error === 'trop de requêtes') { pauses++; await dormir(2500); continue; }
      return { s: r.status, j: j || {}, txt, h: r.headers };
    }
    return { s: 0, j: {}, txt: '', h: new Headers() };
  };
  let TP = '', TA = '';   // les sessions du patron et d'un collaborateur
  const get = (route, jeton) => http('GET', route, jeton === undefined ? TP : jeton);
  const post = (route, corps, jeton) => http('POST', route, jeton === undefined ? TP : jeton, corps === undefined ? {} : corps);
  const q = encodeURIComponent;
  const parUid = (r) => { const o = {}; (r.j.messages || []).forEach(m => { o[m.uid] = m; }); return o; };
  const consolesDe = (r) => { const o = {}; (r.j.messages || []).forEach(m => { o[m.uid] = m.console; }); return o; };

  vrai('le serveur démarre (fausse boîte IMAP glissée par `node -r`)', await demarrer());
  TP = (await http('POST', '/api/monitor/login', '', { nom: 'Patron', pass: MDP })).j.token;
  TA = (await http('POST', '/api/monitor/login', '', { nom: 'Agent', pass: MDP2 })).j.token;
  vrai('la Tour ouvre une session de patron et une de collaborateur', TP && TA);

  try {
    /* ══ 0. LA FAUSSE BOÎTE JOUE CE QU'ON LUI DEMANDE — un outil partagé se juge avant de juger avec ═════════════════ */
    console.log('\n0. Le faux IMAP (tests/faux-imap.js) : ce que les bancs lui demandent');
    {
      const FI = require(FAUX), f0 = path.join(banc, 'faux-imap-0.json'), U = 'essai@banc-1012.fr';
      const sv = { f: process.env.FAUX_IMAP, r: process.env.FAUX_IMAP_RACINE };
      process.env.FAUX_IMAP = f0; process.env.FAUX_IMAP_RACINE = path.join(RACINE, 'server');
      const mk = (uid, o) => Object.assign({ dossier: 'INBOX', uid, messageId: '<z' + uid + '@banc-1012>', from: 'a@exemple-1012.fr', to: U, subject: 'Sujet ' + uid, text: 'Texte ' + uid, ts: T0 + uid * 1000, flags: [] }, o);
      fs.writeFileSync(f0, JSON.stringify({ pannes: { 'casse@banc-1012.fr': 'refusé pour casse@banc-1012.fr' }, boites: { [U]: { messages: [
        mk(1, { subject: 'Facture mars', text: 'montant 120 euros' }), mk(2, { flags: ['\\Seen', '\\Flagged'], html: '<p>Bonjour</p>', pieces: [{ nom: 'a.txt', type: 'text/plain', b64: Buffer.from('bonjour').toString('base64') }] }),
        mk(3, { flags: ['\\Seen', '\\Answered'], subject: 'Re: facture', from: 'b@exemple-1012.fr' }), mk(4, { dossier: 'Corbeille' })], actions: [] } } }));
      const c = new FI.ImapFlow({ auth: { user: U } });
      await c.connect();
      const liste = await c.list();
      v('six dossiers par leur usage spécial, et un dossier « à ne pas ouvrir »', [liste.map(x => x.specialUse || x.path), liste.filter(x => x.flags.has('\\Noselect')).map(x => x.path)],
        [['INBOX', '\\Sent', '\\Drafts', '\\Archive', '\\Junk', '\\Trash', 'Dossiers'], ['Dossiers']]);
      let jeta = null; try { await c.search({ all: true }); } catch (e) { jeta = e.message; }
      vrai('comme imapflow : un geste sans boîte ouverte est refusé', /aucune boîte ouverte/.test(jeta || ''));
      jeta = null; try { await c.getMailboxLock('Inexistant'); } catch (e) { jeta = e.mailboxMissing; }
      vrai('… et ouvrir un dossier qui n\'existe pas aussi', jeta === true);
      const lock = await c.getMailboxLock('INBOX');
      v('recherche : tout / non lus / lus / marqués / répondus', [(await c.search({ all: true }, { uid: true })), (await c.search({ seen: false }, { uid: true })), (await c.search({ seen: true }, { uid: true })),
        (await c.search({ flagged: true }, { uid: true })), (await c.search({ answered: true }, { uid: true }))], [[1, 2, 3], [1], [2, 3], [2], [3]]);
      v('recherche par texte : objet, expéditeur, corps ; « ou » ; « non »', [(await c.search({ subject: 'FACTURE' }, { uid: true })), (await c.search({ from: 'b@' }, { uid: true })), (await c.search({ body: '120 euros' }, { uid: true })),
        (await c.search({ or: [{ subject: 'mars' }, { from: 'b@' }] }, { uid: true })), (await c.search({ not: { seen: true } }, { uid: true }))], [[1, 3], [3], [1], [1, 3], [1]]);
      const un = await c.fetchOne('2', { uid: true }, { uid: true });
      v('comme imapflow, ne rend que ce qui est demandé', [Object.keys(un).sort(), un.envelope], [['seq', 'uid'], undefined]);
      const deux = await c.fetchOne('2', { uid: true, envelope: true, flags: true, bodyStructure: true, size: true, source: { maxLength: 100000 } }, { uid: true });
      v('la structure : un texte, un HTML, une pièce jointe nommée (les feuilles seules portent `part`)',
        [deux.bodyStructure.type, deux.bodyStructure.part, deux.bodyStructure.childNodes[0].childNodes.map(x => x.part + ':' + x.type), deux.bodyStructure.childNodes[1].part, deux.bodyStructure.childNodes[1].disposition, deux.bodyStructure.childNodes[1].dispositionParameters.filename],
        ['multipart/mixed', undefined, ['1.1:text/plain', '1.2:text/html'], '2', 'attachment', 'a.txt']);
      const lu = await mailparser.simpleParser(deux.source);
      v('la source est une vraie source MIME que mailparser relit (texte, HTML, pièce)', [lu.text.trim(), /Bonjour/.test(lu.html), lu.attachments.map(x => x.filename + ':' + x.content.toString())], ['Texte 2', true, ['a.txt:bonjour']]);
      v('l\'enveloppe, les drapeaux, la taille', [deux.envelope.from[0].address, deux.envelope.subject, [...deux.flags].sort(), deux.size > 100], ['a@exemple-1012.fr', 'Sujet 2', ['\\Flagged', '\\Seen'], true]);
      await c.messageFlagsAdd('1', ['\\Seen'], { uid: true });
      await c.messageFlagsRemove('3', ['\\Answered'], { uid: true });
      v('drapeaux ajoutés et retirés', [(await c.search({ seen: false }, { uid: true })), (await c.search({ answered: true }, { uid: true }))], [[], []]);
      await c.messageMove('3', 'Archives', { uid: true });
      v('déplacer : le message quitte la Réception', (await c.search({ all: true }, { uid: true })), [1, 2]);
      lock.release();
      const st = await c.status('Archives', { unseen: true });
      v('STATUS compte dans le dossier d\'arrivée (le message y a un NOUVEL identifiant), et compte les questions posées',
        [st.unseen, (partie0(f0).statuts || {}).Archives, (partie0(f0).messages.find(x => x.dossier === 'Archives') || {}).uid], [0, 1, 1]);
      let inconnu = null; try { await c.status('Inexistant', { unseen: true }); } catch (e) { inconnu = e.mailboxMissing; }
      vrai('… et refuse un dossier qui n\'existe pas', inconnu === true);
      const l2 = await c.getMailboxLock('INBOX');
      await c.messageDelete('2', { uid: true }); l2.release();
      v('supprimer : le message disparaît de la Réception', partie0(f0).messages.filter(x => x.dossier === 'INBOX').map(x => x.uid), [1]);
      const brut = Buffer.from('Message-ID: <ajout@banc-1012>\r\nFrom: moi@banc-1012.fr\r\nTo: toi@exemple-1012.fr\r\nSubject: Ajouté\r\nContent-Type: multipart/mixed; boundary="X"\r\n\r\n--X\r\nContent-Type: text/plain\r\n\r\ncorps\r\n--X\r\nContent-Type: application/octet-stream; name="p.bin"\r\nContent-Disposition: attachment; filename="p.bin"\r\nContent-Transfer-Encoding: base64\r\n\r\nYWJj\r\n--X--\r\n');
      const ap = await c.append('Envoyés', brut, ['\\Seen']);
      const ajout = partie0(f0).messages.find(x => x.dossier === 'Envoyés') || {};
      v('append : le message existe ensuite, avec ses pièces et ses drapeaux', [ap.destination, ajout.subject, ajout.to.map(x => x.address), ajout.pieces.map(x => x.nom + ':' + x.sha), ajout.flags, partie0(f0).ajouts.length],
        ['Envoyés', 'Ajouté', ['toi@exemple-1012.fr'], ['p.bin:' + sha(Buffer.from('abc'))], ['\\Seen'], 1]);
      const cc = new FI.ImapFlow({ auth: { user: 'casse@banc-1012.fr' }}); let refuse = null; try { await cc.connect(); } catch (e) { refuse = e.message; }
      v('une boîte en panne refuse la connexion avec le message qu\'on lui a donné (l\'adresse dedans : c\'est ce que fait un vrai serveur)', refuse, 'refusé pour casse@banc-1012.fr');
      if (sv.f === undefined) delete process.env.FAUX_IMAP; else process.env.FAUX_IMAP = sv.f;
      if (sv.r === undefined) delete process.env.FAUX_IMAP_RACINE; else process.env.FAUX_IMAP_RACINE = sv.r;
    }

    /* ══ 1. LE TRI PAR CONSOLE — avant toute règle, l'annuaire seul ═════════════════════════════════════════════ */
    console.log('\n1. Le tri : l\'annuaire d\'OP GESTION décide, le reste est à trier');
    const bx = await get('/api/monitor/mail/boites');
    v('la Messagerie relève les trois boîtes (celle du support d\'avant n\'est pas doublée)', (bx.j.boites || []).map(b => b.id).sort(), ['b-a', 'b-b', 'b-c']);
    let regles = {};
    const lia = async (dossier, extra) => get('/api/monitor/mail/liste?boite=b-a&dossier=' + q(dossier) + (extra || ''));
    const p0 = await lia('INBOX');
    const att0 = attendu(BA, 'INBOX', regles);
    // 30 sur 76 : la première page. On lit les deux pages pour juger toute la Réception.
    const p1 = await lia('INBOX', '&page=1'), p2 = await lia('INBOX', '&page=2');
    const toutes0 = Object.assign({}, consolesDe(p0), consolesDe(p1), consolesDe(p2));
    vrai('POPULATION : la Réception de A est lue en entier (76 messages, 3 pages)', Object.keys(toutes0).length === 76 && p0.j.total === 76 && p0.j.pages === 3);
    const valeurs0 = new Set(Object.values(toutes0));
    vrai('POPULATION : l\'annuaire range des messages en gestion ET en « à trier » — rien encore en OP MESSAGES', valeurs0.has('gestion') && valeurs0.has('atrier') && !valeurs0.has('messages'));
    v('chaque message est rangé comme l\'oracle le décide (annuaire : espace, fiche client, casse ignorée ; le reste à trier)', toutes0, att0);
    v('   les cas nommés : espace, fiche client, inconnu, partenaire, domaine, espace « double », notification, majuscules',
      [1, 2, 3, 4, 5, 6, 7, 9].map(u => toutes0[u]), ['gestion', 'gestion', 'atrier', 'atrier', 'atrier', 'gestion', 'atrier', 'gestion']);
    v('   chaque ligne porte aussi l\'interlocuteur qui a servi à décider', [(parUid(p2)[1] || {}).interlocuteur, (parUid(p2)[4] || {}).interlocuteur, (parUid(p2)[9] || {}).interlocuteur], ['espace-a@exemple-1012.fr', 'paul@partenaire-1012.fr', 'espace-a@exemple-1012.fr']);
    v('   les cas du cabinet, avant toute règle : l\'espace est connu, ses voisins de domaine non', [14, 15, 16].map(u => toutes0[u]), ['gestion', 'atrier', 'atrier']);

    /* Les messages envoyés : l'interlocuteur est le DESTINATAIRE. */
    const env = await lia('Envoyés');
    v('POPULATION : trois messages envoyés lus', (env.j.messages || []).length, 3);
    const envU = parUid(env);
    v('⛔ un message ENVOYÉ se range par son PREMIER destinataire, pas par la boîte qui l\'écrit (ni par un destinataire en copie)',
      [envU[1].console, envU[1].interlocuteur, envU[2].console, envU[2].interlocuteur], ['gestion', 'espace-a@exemple-1012.fr', 'atrier', 'paul@partenaire-1012.fr']);
    v('⛔ … même écrit d\'un ALIAS de la boîte : le dossier Envoyés compte, pas seulement l\'adresse de l\'expéditeur',
      [envU[3].console, envU[3].interlocuteur, envU[3].de], ['atrier', 'agent@societe-1012.fr', 'ancien-alias@banc-1012.fr']);
    const bro = await lia('Brouillons');
    v('   un brouillon aussi (son destinataire : une fiche client, puis un inconnu)', [parUid(bro)[1].console, parUid(bro)[2].console], ['gestion', 'atrier']);

    /* ══ 1 bis. LE CROCHET D'OP MESSAGES — le vrai serveur le branche sur « faux » ; seul un module monté ICI peut le faire répondre ══ */
    console.log('\n1 bis. Le crochet d\'OP MESSAGES : le jour où il répond, l\'ordre est celui qu\'on a écrit');
    {
      const FI = require(FAUX); FI.installer(path.join(RACINE, 'server'));
      const f1 = path.join(banc, 'faux-imap-1.json'), D1 = path.join(banc, 'data-module'); fs.mkdirSync(D1, { recursive: true });
      const U1 = 'module@banc-1012.fr';
      fs.writeFileSync(path.join(D1, 'mail-boites.json'), JSON.stringify([boiteJ('bx', U1)]));
      const mk = (uid, de) => ({ dossier: 'INBOX', uid, messageId: '<k' + uid + '@banc-1012>', from: de, to: U1, subject: 'Crochet ' + uid, text: 'x', ts: T0 + uid * 1000, flags: [] });
      fs.writeFileSync(f1, JSON.stringify({ boites: { [U1]: { messages: [mk(1, 'a@msg-1012.fr'), mk(2, 'b@gst-1012.fr'), mk(3, 'c@autre-1012.fr'), mk(4, 'boom@msg-1012.fr'), mk(5, 'd@msg-1012.fr')], actions: [] } } }));
      const sv = process.env.FAUX_IMAP; process.env.FAUX_IMAP = f1; process.env.FAUX_IMAP_RACINE = path.join(RACINE, 'server');
      const routes = {};
      const app1 = { get: (p, ...h) => { routes['GET ' + p] = h[h.length - 1]; }, post: (p, ...h) => { routes['POST ' + p] = h[h.length - 1]; } };
      const appelles = [];
      require(path.join(RACINE, 'server', 'mail.js'))(app1, { DATA_DIR: D1, monAdmin: (a, b, n) => n(), monPatronStrict: (a, b, n) => n(), monStr: (x, n) => String(x == null ? '' : x).slice(0, n), pousseNotif: null, mailProtege: () => false,
        quotaOk: () => true, masqueMail: x => 'm***', sansAdresses: x => x, jsonGros: (a, b, n) => n(),
        adresseGestion: a => { appelles.push('G:' + a); if (a.startsWith('boom@')) throw new Error('annuaire illisible'); return a === 'b@gst-1012.fr'; },
        adresseMessages: a => { appelles.push('M:' + a); return a === 'a@msg-1012.fr' || a === 'b@gst-1012.fr' || a === 'd@msg-1012.fr' || a === 'boom@msg-1012.fr'; } });
      const res1 = () => ({ code: 200, corps: null, status(c) { this.code = c; return this; }, json(o) { this.corps = o; return this; }, setHeader() {} });
      const lister = async () => { const rs = res1(); await routes['GET /api/monitor/mail/liste']({ query: { boite: 'bx', dossier: 'INBOX' }, tourUser: { id: 'u1', nom: 'T' } }, rs); return rs; };
      let rs = await lister();
      const parU = {}; ((rs.corps || {}).messages || []).forEach(m => { parU[m.uid] = m.console; });
      v('⛔ OP MESSAGES répond : son adresse est rangée en OP MESSAGES ; une adresse que les DEUX réclament reste à OP GESTION (le crochet de GESTION passe en premier) ; une adresse inconnue reste à trier',
        [parU[1], parU[2], parU[3]], ['messages', 'gestion', 'atrier']);
      v('⛔ un annuaire qui JETTE ne fait pas tomber la liste ni ne range à sa place : l\'adresse reste à trier, OP MESSAGES est encore consulté', [rs.code, parU[4]], [200, 'messages']);
      const rg = res1(); await routes['POST /api/monitor/mail/regle']({ body: { adresse: 'd@msg-1012.fr', console: 'gestion' }, tourUser: { id: 'u1', nom: 'T' } }, rg);
      rs = await lister(); const apres = {}; (rs.corps.messages || []).forEach(m => { apres[m.uid] = m.console; });
      v('⛔ une règle posée à la main passe AVANT les deux crochets', [rg.code, apres[5], apres[1]], [200, 'gestion', 'messages']);
      appelles.length = 0; await lister();
      vrai('   et, devant une règle, on ne les interroge même plus pour cette adresse', !appelles.some(x => /d@msg-1012\.fr/.test(x)) && appelles.length > 0);
      if (sv === undefined) delete process.env.FAUX_IMAP; else process.env.FAUX_IMAP = sv;
    }

    /* ══ 2. LES RÈGLES — posées à la main, l'adresse avant son domaine, avant l'annuaire ═══════════════════════════ */
    console.log('\n2. Les règles de tri : POST /api/monitor/mail/regle');
    let r = await post('/api/monitor/mail/regle', { adresse: 'paul@partenaire-1012.fr', console: 'messages' }, '');
    v('sans session : 401, rien posé (le fichier des réglages n\'existe même pas)', [r.s, lireD('mail-reglages.json')], [401, null]);
    const refus = [
      ['adresse vide', { adresse: '', console: 'messages' }], ['pas une adresse', { adresse: 'paul', console: 'messages' }],
      ['sans point après l\'arobase', { adresse: 'paul@partenaire', console: 'messages' }], ['un domaine nu', { adresse: '@', console: 'messages' }],
      ['deux arobases', { adresse: 'a@b@partenaire-1012.fr', console: 'messages' }], ['une liste', { adresse: 'a@partenaire-1012.fr, b@partenaire-1012.fr', console: 'messages' }],
      ['trop longue', { adresse: 'x'.repeat(200) + '@partenaire-1012.fr', console: 'messages' }], ['un objet', { adresse: { a: 1 }, console: 'messages' }],
      ['une console inconnue', { adresse: 'paul@partenaire-1012.fr', console: 'autre' }], ['« à trier » n\'est pas une règle', { adresse: 'paul@partenaire-1012.fr', console: 'atrier' }],
      ['console absente', { adresse: 'paul@partenaire-1012.fr' }], ['console numérique', { adresse: 'paul@partenaire-1012.fr', console: 1 }]];
    const codes = []; for (const [, corps] of refus) codes.push((await post('/api/monitor/mail/regle', corps)).s);
    v('⛔ ' + refus.length + ' demandes invalides (' + refus.map(x => x[0]).join(' · ') + ') : 400 chacune', codes, refus.map(() => 400));
    v('   … et rien n\'a été posé', (lireD('mail-reglages.json') || {}).regles || {}, {});
    r = await post('/api/monitor/mail/regle', { adresse: '  Paul@Partenaire-1012.FR ', console: 'messages' });
    v('une règle sur une adresse (casse et espaces ignorés) : 200, adresse normalisée', [r.s, r.j.ok, r.j.adresse, r.j.console, r.j.regles], [200, true, 'paul@partenaire-1012.fr', 'messages', 1]);
    regles['paul@partenaire-1012.fr'] = 'messages';
    r = await post('/api/monitor/mail/regle', { adresse: '@societe-1012.fr', console: 'messages' }, TA);
    v('⛔ une règle sur un DOMAINE entier, posée par un collaborateur : 403 (elle déplacerait tout un pan du courrier, en silence) — rien posé',
      [r.s, /réservé au patron/.test(r.j.error || ''), '@societe-1012.fr' in (((lireD('mail-reglages.json') || {}).regles) || {})], [403, true, false]);
    r = await post('/api/monitor/mail/regle', { adresse: '@societe-1012.fr', console: null }, TA);
    v('   la RETIRER non plus', r.s, 403);
    r = await post('/api/monitor/mail/regle', { adresse: 'agent@societe-1012.fr', console: 'messages' }, TA);
    v('   une ADRESSE seule (ce que la Tour propose sous un message), le collaborateur la range : 200', [r.s, r.j.adresse], [200, 'agent@societe-1012.fr']);
    r = await post('/api/monitor/mail/regle', { adresse: 'agent@societe-1012.fr', console: null }, TA);
    r = await post('/api/monitor/mail/regle', { adresse: '@societe-1012.fr', console: 'messages' });
    v('une règle sur un DOMAINE, posée par le patron : 200', [r.s, r.j.adresse], [200, '@societe-1012.fr']);
    regles['@societe-1012.fr'] = 'messages';
    r = await post('/api/monitor/mail/regle', { adresse: 'double@exemple-1012.fr', console: 'messages' });
    regles['double@exemple-1012.fr'] = 'messages';
    r = await post('/api/monitor/mail/regle', { adresse: '@cabinet-1012.fr', console: 'messages' });
    regles['@cabinet-1012.fr'] = 'messages';
    r = await post('/api/monitor/mail/regle', { adresse: 'asso@cabinet-1012.fr', console: 'gestion' });
    regles['asso@cabinet-1012.fr'] = 'gestion';
    r = await post('/api/monitor/mail/regle', { adresse: '@inconnu-1012.fr', console: 'gestion' });
    r = await post('/api/monitor/mail/regle', { adresse: '@inconnu-1012.fr', console: null });
    v('un domaine posé puis RETIRÉ (`console: null`) : la règle n\'existe plus', [r.s, r.j.console, r.j.regles], [200, null, 5]);
    v('les règles sont rangées dans mail-reglages.json (clé `regles`), la signature et les modèles intacts',
      [(lireD('mail-reglages.json') || {}).regles, typeof (lireD('mail-reglages.json') || {}).signature], [{ 'paul@partenaire-1012.fr': 'messages', '@societe-1012.fr': 'messages', 'double@exemple-1012.fr': 'messages', '@cabinet-1012.fr': 'messages', 'asso@cabinet-1012.fr': 'gestion' }, 'string']);
    const gl = await get('/api/monitor/mail/regles');
    v('GET /mail/regles les rend, triées', (gl.j.regles || []).map(x => x.adresse + '=' + x.console),
      ['@cabinet-1012.fr=messages', '@societe-1012.fr=messages', 'asso@cabinet-1012.fr=gestion', 'double@exemple-1012.fr=messages', 'paul@partenaire-1012.fr=messages']);

    const a0 = await lia('INBOX'), a1 = await lia('INBOX', '&page=1'), a2 = await lia('INBOX', '&page=2');
    const toutes1 = Object.assign({}, consolesDe(a0), consolesDe(a1), consolesDe(a2));
    const att1 = attendu(BA, 'INBOX', regles);
    v('⛔ chaque message est rangé comme l\'oracle le décide, règles comprises', toutes1, att1);
    vrai('POPULATION : les trois consoles sont représentées, et la règle a DÉPLACÉ des messages (' + Object.keys(toutes1).filter(u => toutes1[u] !== toutes0[u]).length + ')',
      new Set(Object.values(toutes1)).size === 3 && Object.keys(toutes1).filter(u => toutes1[u] !== toutes0[u]).length >= 20);
    v('   la règle d\'une adresse passe avant l\'annuaire (« double » est un espace, la règle dit OP MESSAGES)', toutes1[6], 'messages');
    v('   la règle d\'un DOMAINE passe avant l\'annuaire (le cabinet est un espace connu, son domaine dit OP MESSAGES)', toutes1[14], 'messages');
    v('⛔ la règle d\'une ADRESSE passe avant celle de son DOMAINE (@cabinet-1012.fr → messages, « asso » → gestion, « tiers » suit le domaine)', [toutes1[15], toutes1[16]], ['gestion', 'messages']);
    v('   une règle de domaine range tout le domaine', [toutes1[5], toutes1[10]], ['messages', 'messages']);
    v('   une règle d\'adresse ne range pas le reste du domaine de l\'adresse', [toutes1[4], toutes1[11]], ['messages', 'atrier']);
    const env1 = parUid(await lia('Envoyés'));
    v('   les messages envoyés suivent les règles de leur destinataire', [env1[2].console, env1[3].console], ['messages', 'messages']);

    /* ══ 3. LE FILTRE — ma console et ce qui est à trier, jamais l'autre ════════════════════════════════════════ */
    console.log('\n3. /mail/liste?console= : la console demandée ET les messages à trier');
    const lot = async (cons, extra) => { const o = {}; let dern = null; for (let pg = 0; pg < 6; pg++) { const x = await get('/api/monitor/mail/liste?boite=b-a&dossier=INBOX&console=' + cons + '&page=' + pg + (extra || '')); dern = dern || x; (x.j.messages || []).forEach(m => { o[m.uid] = m; }); if (pg + 1 >= (x.j.pages || 1)) break; } return { premiere: dern, tout: o }; };
    for (const cons of ['gestion', 'messages']) {
      const autre = cons === 'gestion' ? 'messages' : 'gestion';
      const L = await lot(cons);
      const att = Object.keys(att1).filter(u => att1[u] === cons || att1[u] === 'atrier').map(Number).sort((a, b) => a - b);
      vrai('POPULATION · ' + cons + ' : ' + att.length + ' messages attendus, dont de l\'autre console en réserve (' + Object.values(att1).filter(c => c === autre).length + ')',
        att.length >= 31 && Object.values(att1).filter(c => c === autre).length >= 10);
      v('⛔ ' + cons + ' : exactement ses messages et ceux à trier — aucun de ' + autre, Object.keys(L.tout).map(Number).sort((a, b) => a - b), att);
      v('   aucun message de ' + autre + ' dans la liste', Object.values(L.tout).filter(m => m.console === autre).length, 0);
      v('   le total est celui de la console (pas celui du dossier), paginé par 30', [L.premiere.j.total, L.premiere.j.pages, L.premiere.j.console, L.premiere.j.tronque, (L.premiere.j.messages || []).length],
        [att.length, Math.ceil(att.length / 30), cons, false, 30]);
    }
    const sans = await lia('INBOX');
    v('sans `console` : tout, comme avant (la Tour d\'aujourd\'hui) — aucun champ en plus à la racine', [sans.j.total, Object.keys(sans.j).sort()], [76, ['messages', 'page', 'pages', 'total']]);
    r = await get('/api/monitor/mail/liste?boite=b-a&console=gestionnaire');
    v('une console inconnue : 400, pas la liste entière', r.s, 400);
    const e2 = await get('/api/monitor/mail/liste?boite=b-a&dossier=' + q('Envoyés') + '&console=gestion');
    v('le filtre vaut aussi pour un autre dossier : Envoyés / gestion = le message pour l\'espace + les « à trier » (aucun message vers OP MESSAGES)', (e2.j.messages || []).map(m => m.uid).sort(), [1]);
    const fus = await get('/api/monitor/mail/liste?console=messages');
    const fusAll = await get('/api/monitor/mail/liste');
    vrai('la vue « toutes les boîtes » filtre aussi (POPULATION : sans filtre elle porte les trois consoles)',
      fus.j.fusion === true && fusAll.j.fusion === true && new Set((fusAll.j.messages || []).map(m => m.console)).size === 3
      && (fus.j.messages || []).length > 0 && (fus.j.messages || []).every(m => m.console !== 'gestion'));
    const gros = await get('/api/monitor/mail/liste?boite=b-b&dossier=' + q('Archives') + '&console=gestion');
    v('⛔ la fenêtre de tri est de 1 500 messages : un dossier plus long le DIT (`tronque`), au lieu de rendre un total faux',
      [gros.j.total, gros.j.tronque, gros.j.pages, (gros.j.messages || []).length], [1500, true, 50, 30]);
    const recherche = await get('/api/monitor/mail/liste?boite=b-a&dossier=INBOX&console=messages&q=' + q('En vrac 1'));
    vrai('la recherche se combine avec le filtre (POPULATION : au moins un résultat, tous de la console ou à trier)',
      (recherche.j.messages || []).length >= 2 && (recherche.j.messages || []).every(m => /En vrac 1/.test(m.objet) && m.console !== 'gestion'));

    /* ══ 4. LIRE UN MESSAGE ═════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n4. /mail/message porte la console et l\'interlocuteur');
    let m = await get('/api/monitor/mail/message?boite=b-a&dossier=INBOX&uid=8');
    v('un message d\'un espace (avec HTML et une pièce jointe réelle)', [m.s, m.j.console, m.j.interlocuteur, (m.j.pieces || []).map(x => x.nom), /<b>devis<\/b>/.test(m.j.html || ''), m.j.protege], [200, 'gestion', 'espace-a@exemple-1012.fr', ['devis.pdf'], true, false]);
    m = await get('/api/monitor/mail/message?boite=b-a&dossier=INBOX&uid=5');
    v('un message d\'un domaine à qui une règle parle', [m.j.console, m.j.interlocuteur], ['messages', 'agent@societe-1012.fr']);
    m = await get('/api/monitor/mail/message?boite=b-a&dossier=' + q('Envoyés') + '&uid=2');
    v('⛔ un message ENVOYÉ : l\'interlocuteur est son premier destinataire', [m.j.console, m.j.interlocuteur, m.j.de], ['messages', 'paul@partenaire-1012.fr', BA]);
    const lp = await lia('INBOX', '&page=2');
    v('   (l\'avis de sécurité reste protégé et se range à trier)', [(parUid(lp)[13] || {}).protege, (parUid(lp)[13] || {}).console], [true, 'atrier']);

    /* ══ 5. LES NON-LUS DE CHAQUE DOSSIER ═══════════════════════════════════════════════════════════════════════ */
    console.log('\n5. /mail/dossiers : un compteur par dossier (IMAP STATUS), gardé puis oublié');
    // la relève du support passe 12 s après le démarrage : on attend qu'elle ait importé, pour juger les non-lus APRÈS elle (§ 8).
    for (let i = 0; i < 300 && !(lireD('support-mails.json') || []).length; i++) await dormir(100);
    vrai('la relève du support a passé (elle a rangé des messages dans son ancienne liste)', (lireD('support-mails.json') || []).length > 5);
    const dos = async (extra) => get('/api/monitor/mail/dossiers' + (extra || ''));
    const statuts = () => { const s = lireEtat().boites[BA].statuts || {}; return Object.keys(s).reduce((t, k) => t + s[k], 0); };
    let d = await dos('?frais=1');
    const bA = (d.j.boites || []).find(x => x.boite && x.boite.id === 'b-a') || {};
    v('six dossiers, dans l\'ordre de Mail, et le dossier « à ne pas ouvrir » n\'y est pas', (bA.dossiers || []).map(x => x.role), ['inbox', 'envoyes', 'brouillons', 'archives', 'indesirables', 'corbeille']);
    const parRole = (b) => { const o = {}; (b.dossiers || []).forEach(x => { o[x.role] = x.nonLus; }); return o; };
    const noms = ['INBOX', 'Envoyés', 'Brouillons', 'Archives', 'Indésirables', 'Corbeille'];
    const oraN = {}; ['inbox', 'envoyes', 'brouillons', 'archives', 'indesirables', 'corbeille'].forEach((ro, i) => { oraN[ro] = nonLusOracle(BA, noms[i]); });
    vrai('POPULATION : l\'oracle compte des non-lus dans CHAQUE dossier sauf Envoyés (' + JSON.stringify(oraN) + ')', Object.keys(oraN).filter(k => oraN[k] > 0).length === 5 && oraN.envoyes === 0);
    v('⛔ chaque dossier porte SON compteur — pas celui de la Réception', parRole(bA), oraN);
    v('   les chiffres attendus, écrits en dur : Brouillons 1, Archives 2, Indésirables 3, Corbeille 1, Envoyés 0',
      [oraN.brouillons, oraN.archives, oraN.indesirables, oraN.corbeille, oraN.envoyes], [1, 2, 3, 1, 0]);
    v('   `nonLus` de la boîte reste celui de la Réception (la Tour d\'avant le lit)', bA.nonLus, oraN.inbox);
    vrai('   chaque dossier garde son chemin, son nom et son rôle', (bA.dossiers || []).every(x => x.chemin && x.nom && x.role && Number.isInteger(x.nonLus)));
    const s0 = statuts();
    vrai('POPULATION : le serveur a posé une question STATUS par dossier (6)', s0 >= 6);
    d = await dos();
    v('⛔ un second appel dans les secondes qui suivent ne repose AUCUNE question à la boîte (le cache est réel)', [statuts() - s0, parRole((d.j.boites || []).find(x => x.boite.id === 'b-a'))], [0, oraN]);
    // une arrivée : le message entre dans la boîte, le cache ne le voit pas encore ; `frais` le force
    let e = lireEtat(); e.boites[BA].messages.push({ dossier: 'INBOX', uid: 1000, messageId: '<arrivee-1@banc-1012>', from: 'nouveau@inconnu-1012.fr', to: BA, subject: 'Arrivée', text: 'x', ts: Date.now(), flags: [] }); ecrireEtat(e);
    d = await dos();
    v('   un message arrive : le cache ne le voit pas encore…', (d.j.boites.find(x => x.boite.id === 'b-a')).nonLus, oraN.inbox);
    d = await dos('?frais=1');
    v('   … `frais=1` le force', [(d.j.boites.find(x => x.boite.id === 'b-a')).nonLus, statuts() - s0], [oraN.inbox + 1, 6]);
    e = lireEtat(); e.boites[BA].messages.push({ dossier: 'Archives', uid: 1001, messageId: '<arrivee-2@banc-1012>', from: 'nouveau@inconnu-1012.fr', to: BA, subject: 'Arrivée 2', text: 'x', ts: Date.now(), flags: [] }); ecrireEtat(e);
    await dormir(4400);
    d = await dos();
    v('⛔ … et le cache EXPIRE tout seul (4 s dans ce banc) : l\'arrivée dans les Archives se voit sans rien forcer', parRole(d.j.boites.find(x => x.boite.id === 'b-a')).archives, oraN.archives + 1);
    // un geste qui change les non-lus oublie le cache aussitôt
    const inboxApi = (x) => x.j.boites.find(y => y.boite.id === 'b-a').nonLus;
    let n1 = nonLusOracle(BA, 'INBOX');
    r = await post('/api/monitor/mail/flag', { boite: 'b-a', dossier: 'INBOX', uid: 6, lu: false });
    d = await dos();
    v('⛔ marquer « non lu » met le chiffre à jour AUSSITÔT (le geste oublie le cache)', [r.s, inboxApi(d), nonLusOracle(BA, 'INBOX')], [200, n1 + 1, n1 + 1]);
    n1 = nonLusOracle(BA, 'INBOX');
    m = await get('/api/monitor/mail/message?boite=b-a&dossier=INBOX&uid=2');
    d = await dos();
    v('⛔ ouvrir un message (il passe « lu ») aussi', [(d.j.boites.find(x => x.boite.id === 'b-a')).nonLus, nonLusOracle(BA, 'INBOX')], [n1 - 1, n1 - 1]);
    n1 = nonLusOracle(BA, 'INBOX');
    r = await post('/api/monitor/mail/supprimer', { boite: 'b-a', dossier: 'INBOX', uid: 3 });
    d = await dos();
    const rolesApres = parRole(d.j.boites.find(x => x.boite.id === 'b-a'));
    v('⛔ supprimer vers la corbeille : la Réception perd un non-lu, la Corbeille en gagne un', [r.s, rolesApres.inbox, rolesApres.corbeille], [200, n1 - 1, nonLusOracle(BA, 'Corbeille')]);
    r = await post('/api/monitor/mail/deplacer', { boite: 'b-a', dossier: 'INBOX', uid: 11, vers: 'Archives' });
    d = await dos();
    v('⛔ déplacer vers les Archives : idem', [r.s, parRole(d.j.boites.find(x => x.boite.id === 'b-a')).archives], [200, nonLusOracle(BA, 'Archives')]);
    v('POPULATION : les non-lus de la boîte B (Réception 2, Archives 0 sur 1 600 messages lus)', (() => { const b = d.j.boites.find(x => x.boite.id === 'b-b'); const o = parRole(b); return [o.inbox, o.archives]; })(), [nonLusOracle(BB, 'INBOX'), 0]);

    /* ══ 6. AUCUNE ADRESSE DANS UNE ERREUR ═══════════════════════════════════════════════════════════════════ */
    console.log('\n6. Les erreurs ne recopient aucune adresse');
    const ADRESSE = /(contact|support2|casse|admin|espace-a|rejete|paul|fiche-b|inconnu)@/i;
    const cD = (d.j.boites || []).find(x => x.boite.id === 'b-c') || {};
    vrai('POPULATION : la boîte C refuse la connexion (le faux serveur recopie son adresse ET celle de l\'administrateur dans l\'erreur)', cD.erreur && cD.dossiers.length === 0);
    vrai('⛔ /mail/dossiers : l\'erreur de la boîte C ne porte aucune adresse', !ADRESSE.test(cD.erreur || '') && /Invalid credentials/.test(cD.erreur || ''));
    const f2 = await get('/api/monitor/mail/liste');
    vrai('POPULATION : la vue fusionnée rend une erreur pour la boîte C', (f2.j.erreurs || []).length === 1);
    vrai('⛔ /mail/liste (toutes les boîtes) : l\'erreur nomme la boîte masquée, jamais l\'adresse entière', !ADRESSE.test((f2.j.erreurs || []).join(' ')) && /^c\*\*\*@banc-1012\.fr : /.test((f2.j.erreurs || [])[0] || ''));
    const cas = [['liste d\'une boîte', () => get('/api/monitor/mail/liste?boite=b-c')], ['lecture d\'un message', () => get('/api/monitor/mail/message?boite=b-c&uid=1')],
      ['déplacement', () => post('/api/monitor/mail/deplacer', { boite: 'b-c', uid: 1, vers: 'Archives' })], ['suppression', () => post('/api/monitor/mail/supprimer', { boite: 'b-c', uid: 1 })]];
    const res6 = []; for (const [, f] of cas) res6.push(await f());
    v('⛔ la boîte injoignable : 502 à chaque geste (' + cas.map(c => c[0]).join(' · ') + ')', res6.map(x => x.s), cas.map(() => 502));
    v('   … sans aucune adresse dans le texte rendu', res6.map(x => ADRESSE.test(x.txt)), cas.map(() => false));
    r = await post('/api/monitor/mail/boites', { email: BC, pass: 'x', imapHost: '127.0.0.1', smtpHost: '127.0.0.1', smtpPort: portSmtp });
    v('⛔ relier une boîte qui refuse la connexion : 400, et l\'erreur ne recopie aucune adresse', [r.s, /Connexion de réception \(IMAP\) refusée/.test(r.j.error || ''), ADRESSE.test(r.txt)], [400, true, false]);

    /* ══ 7. L'ENVOI AVEC DE VRAIES PIÈCES ═══════════════════════════════════════════════════════════════════════ */
    console.log('\n7. Envoyer : 20 Mo de JSON pour les deux routes, 6 Mo pour toutes les autres, 60 envois par heure');
    const recus0 = facteurSrv.recus.length;
    const bin = crypto.randomBytes(6500000);   // 6,5 Mo d'octets : ~8,7 Mo de JSON, au-dessus des 6 Mo d'avant
    const corpsEnvoi = (pj, a) => JSON.stringify({ boite: 'b-a', a: a || 'dest@exemple-1012.fr', objet: 'Envoi de banc', texte: 'Voir la pièce jointe.', pieces: pj });
    const gros1 = corpsEnvoi([{ nom: 'gros.bin', type: 'application/octet-stream', b64: bin.toString('base64') }]);
    vrai('POPULATION : le JSON de l\'envoi pèse plus que le plafond des autres routes (' + (gros1.length / 1e6).toFixed(1) + ' Mo > 6 Mo)', gros1.length > 6.2e6 && gros1.length < 20e6);
    r = await http('POST', '/api/monitor/mail/envoyer', TP, gros1);
    v('⛔ un envoi de 6,5 Mo de pièce jointe PART (il rendait 413 avant la route)', [r.s, r.j.ok, r.j.copieEnvoyes, r.j.par], [200, true, true, 'Patron']);
    let succesPatron = r.s === 200 ? 1 : 0;
    const arrive = facteurSrv.recus.slice(recus0).pop() || '';
    const lu = await mailparser.simpleParser(arrive);
    v('   le facteur a reçu la pièce, octet pour octet', [(lu.attachments || []).length, ((lu.attachments || [])[0] || {}).filename, sha((lu.attachments[0] || {}).content || ''), lu.subject], [1, 'gros.bin', sha(bin), 'Envoi de banc']);
    const aj = (lireEtat().boites[BA].ajouts || []).filter(x => x.dossier === 'Envoyés').pop() || {};
    v('   et la copie dans « Envoyés » la porte aussi (marquée lue)', [(aj.pieces || []).map(x => [x.nom, x.taille, x.sha]), aj.flags], [[['gros.bin', bin.length, sha(bin)]], ['\\Seen']]);
    r = await http('POST', '/api/monitor/mail/brouillon', TP, JSON.stringify({ boite: 'b-a', a: 'dest@exemple-1012.fr', objet: 'Brouillon de banc', texte: 'À finir', pieces: [{ nom: 'brouillon.bin', b64: bin.toString('base64') }] }));
    const ab = (lireEtat().boites[BA].ajouts || []).filter(x => x.dossier === 'Brouillons').pop() || {};
    v('⛔ un brouillon de 8,7 Mo s\'enregistre, AVEC sa pièce, marqué brouillon', [r.s, r.j.ok, (ab.pieces || []).map(x => x.sha), ab.flags], [200, true, [sha(bin)], ['\\Draft', '\\Seen']]);
    r = await http('POST', '/API/MONITOR/MAIL/BROUILLON/', TP, JSON.stringify({ boite: 'b-a', a: 'dest@exemple-1012.fr', objet: 'Casse et barre finale', texte: 'x', pieces: [{ nom: 'b.bin', b64: bin.toString('base64') }] }));
    v('⛔ … par un chemin en capitales avec sa barre finale (Express route sans tenir compte de la casse) : le même analyseur', [r.s, r.j.ok], [200, true]);
    // trop de pièces décodées pour la promesse (12 Mo), mais sous les 20 Mo de JSON : la route répond, avec ses mots
    const sept = crypto.randomBytes(7000000).toString('base64');
    r = await http('POST', '/api/monitor/mail/envoyer', TP, corpsEnvoi([{ nom: 'a.bin', b64: sept }, { nom: 'b.bin', b64: sept }]));
    v('14 Mo décodés (JSON : ' + ((sept.length * 2) / 1e6).toFixed(0) + ' Mo, sous les 20) : 400 avec les mots de la route — pas un 413 du plafond', [r.s, r.j.error], [400, 'pièces jointes trop lourdes (12 Mo au total)']);
    const monstre = JSON.stringify({ boite: 'b-a', a: 'dest@exemple-1012.fr', objet: 'x', texte: 'x', pieces: [{ nom: 'm.bin', b64: 'A'.repeat(21e6) }] });
    r = await http('POST', '/api/monitor/mail/envoyer', TP, monstre);
    v('au-delà de 20 Mo de JSON : 413, en texte brut', [r.s, r.txt], [413, 'requête trop lourde']);
    r = await http('POST', '/api/monitor/mail/reglages', TP, JSON.stringify({ signature: 'x'.repeat(6500000) }));
    v('⛔ UNE AUTRE ROUTE de la Tour garde ses 6 Mo : 413 pour 6,5 Mo (le plafond global n\'a pas été élargi)', [r.s, r.txt], [413, 'requête trop lourde']);
    r = await http('POST', '/api/monitor/mail/regle', TP, JSON.stringify({ adresse: 'x@exemple-1012.fr', console: 'gestion', bourrage: 'x'.repeat(6500000) }));
    v('   (et une autre du courrier de même)', r.s, 413);
    r = await http('POST', '/api/monitor/mail/envoyer', '', '{"boite":');
    v('⛔ la session est vérifiée AVANT de lire le corps : sans session, même un JSON cassé répond 401 (et pas 400)', r.s, 401);
    r = await http('POST', '/api/monitor/mail/brouillon', '', '{"boite":');
    v('   le brouillon de même', r.s, 401);
    // les contrôles d'avant l'envoi ne consomment pas le budget
    const refusEnvoi = [['aucun destinataire valide', { boite: 'b-a', a: 'pas-une-adresse', texte: 'x' }], ['message vide', { boite: 'b-a', a: 'dest@exemple-1012.fr', texte: '  ' }]];
    const cr = []; for (const [, c] of refusEnvoi) cr.push((await post('/api/monitor/mail/envoyer', c)).s);
    v('⛔ un envoi refusé AVANT de partir (' + refusEnvoi.map(x => x[0]).join(' · ') + ') : 400, et il ne consomme pas le budget', cr, [400, 400]);
    // l'erreur d'un destinataire refusé par le serveur d'e-mails ne recopie pas l'adresse
    r = await post('/api/monitor/mail/envoyer', { boite: 'b-a', a: 'rejete@exemple-1012.fr', objet: 'Refusé', texte: 'x' }, TA);
    v('⛔ un destinataire refusé par le serveur d\'e-mails : 500, et l\'adresse du refus n\'est pas renvoyée (masquée)', [r.s, /^envoi refusé : /.test(r.j.error || ''), /rejete@/i.test(r.txt), /r\*\*\*@exemple-1012\.fr/.test(r.j.error || '')], [500, true, false, true]);

    /* ══ 8. 60 ENVOIS PAR HEURE ET PAR COMPTE ═══════════════════════════════════════════════════════════════════ */
    console.log('\n8. Le budget d\'envoi : 60 par heure et par compte de la Tour');
    let refuse = null, premiersRefus = 0, enBoucle = 0;
    for (let i = 0; i < 70; i++) {
      r = await post('/api/monitor/mail/envoyer', { boite: 'b-a', a: 'dest' + i + '@exemple-1012.fr', objet: 'Envoi ' + i, texte: 'Message ' + i });
      if (r.s === 200) { succesPatron++; enBoucle++; } else if (r.s === 429) { refuse = r; premiersRefus = i; break; } else { vrai('un envoi de la boucle a répondu ' + r.s, false); break; }
    }
    v('⛔ le patron envoie 60 messages dans l\'heure, pas un de plus (' + enBoucle + ' dans la boucle, le premier envoi de banc compris)', [succesPatron, premiersRefus === enBoucle], [60, true]);
    vrai('   le 61ᵉ : 429, qui DIT la limite et quand réessayer', refuse && /trop d'envois/.test(refuse.j.error || '') && refuse.j.limite === 60 && Number(refuse.h.get('retry-after')) > 3000 && refuse.j.reessayerDans === Number(refuse.h.get('retry-after')));
    r = await post('/api/monitor/mail/envoyer', { boite: 'b-a', a: 'dest-agent@exemple-1012.fr', objet: 'Envoi de l\'agent', texte: 'Un autre compte' }, TA);
    v('⛔ le budget est PAR COMPTE : le collaborateur envoie encore', [r.s, r.j.ok, r.j.par], [200, true, 'Agent']);
    const depuis = facteurSrv.recus.slice(recus0);
    v('   et le facteur a reçu exactement ce qui est parti : 59 « Envoi N » (le 60ᵉ du patron est le gros envoi du début, le 61ᵉ n\'est pas parti)',
      [depuis.filter(x => /^Subject: Envoi \d+$/m.test(x)).length, depuis.filter(x => /^Subject: Envoi de l'agent$/m.test(x)).length], [59, 1]);

    /* ══ 8 bis. LES BROUILLONS ONT LEUR BUDGET : 30 PAR HEURE ET PAR COMPTE, À PART DES ENVOIS ═══════════════════ */
    console.log('\n8 bis. Le budget des brouillons : 30 par heure et par compte, à part des envois');
    let brOk = 2, brRefus = null;   // les deux brouillons de 8,7 Mo du § 7
    for (let i = 0; i < 40; i++) {
      r = await post('/api/monitor/mail/brouillon', { boite: 'b-a', a: 'dest@exemple-1012.fr', objet: 'Brouillon ' + i, texte: 'x' });
      if (r.s === 200) brOk++; else { brRefus = r; break; }
    }
    v('⛔ le patron — dont le budget d\'ENVOI est épuisé — range encore des brouillons, et 30 dans l\'heure, pas un de plus', [brOk, brRefus && brRefus.s], [30, 429]);
    vrai('   le 31ᵉ : 429, qui DIT la limite et quand réessayer', brRefus && /trop de brouillons/.test(brRefus.j.error || '') && brRefus.j.limite === 30 && brRefus.j.reessayerDans > 3000);
    r = await post('/api/monitor/mail/brouillon', { boite: 'b-a', a: 'dest@exemple-1012.fr', objet: 'Brouillon de l\'agent', texte: 'x' }, TA);
    v('   par compte : le collaborateur en range encore', [r.s, r.j.ok], [200, true]);
    r = await http('POST', '/api/monitor/mail/brouillon', TP, JSON.stringify({ boite: 'b-a', a: 'dest@exemple-1012.fr', texte: 'x', pieces: [{ nom: 'a.bin', b64: sept }, { nom: 'b.bin', b64: sept }] }));
    v('   un brouillon refusé pour ses pièces répond 400 AVANT le budget (le patron, budget épuisé, lit l\'erreur de forme)', [r.s, r.j.error], [400, 'pièces jointes trop lourdes (12 Mo au total)']);

    /* ══ 9. LA RELÈVE DU SUPPORT NE MARQUE PLUS « LU » UNE BOÎTE QUE LA MESSAGERIE RELÈVE ══════════════════════════ */
    console.log('\n9. La relève du support : elle importe, elle ne marque rien (boîte reliée) — et marque encore (boîte non reliée)');
    const sup = lireD('support-mails.json') || [];
    const mids = new Set(sup.map(x => x.mid));
    const touches = new Set([6, 1000]);   // marqué « non lu » par ce banc, arrivé après la relève : on ne juge que les non lus que personne n'a touchés
    const intacts = messagesDe(BA, 'INBOX').filter(x => !(x.flags || []).includes('\\Seen') && !touches.has(x.uid) && x.messageId !== '<' + PROTEGE + '>');
    vrai('POPULATION : au moins 10 messages non lus que personne n\'a ouverts, tous importés par la relève dans son ancienne liste (' + intacts.length + ')', intacts.length >= 10 && intacts.every(x => mids.has(x.messageId)));
    vrai('   l\'avis de sécurité n\'y est pas (protégé)', ![...mids].some(x => x.includes(PROTEGE)));
    const marques = (lireEtat().boites[BA].actions || []).filter(x => /^marque\+\\Seen/.test(x.action)).map(x => x.messageId);
    vrai('⛔ et elle n\'en a marqué AUCUN « lu » (les seuls drapeaux posés sont ceux des messages que ce banc a ouverts lui-même)',
      intacts.every(x => !marques.includes(x.messageId)) && !marques.includes('<' + PROTEGE + '>'));
    v('   les non-lus de la Réception sont toujours ceux de l\'oracle, APRÈS la relève', parRole((await dos('?frais=1')).j.boites.find(x => x.boite.id === 'b-a')).inbox, nonLusOracle(BA, 'INBOX'));
    // le cas inverse : on retire la boîte de la Messagerie, la relève la marque de nouveau — sauf l'avis de sécurité.
    // Deux chemins posent le drapeau : celui d'un message DÉJÀ rangé (les `intacts`) et celui d'un message qu'elle range à l'instant (les `neufs`).
    e = lireEtat();
    const neufs = [2000, 2001, 2002].map(uid => ({ dossier: 'INBOX', uid, messageId: '<neuf-' + uid + '@banc-1012>', from: 'neuf' + uid + '@inconnu-1012.fr', to: BA, subject: 'Arrivé ' + uid, text: 'x', ts: Date.now(), flags: [] }));
    neufs.forEach(x => e.boites[BA].messages.push(x));
    // … suivis de 30 messages LUS : à la reconnexion la relève importe d'abord les 30 derniers de la boîte, et les neufs n'en seraient pas — ils sont rangés par le second passage, celui des non lus
    for (let i = 0; i < 30; i++) e.boites[BA].messages.push({ dossier: 'INBOX', uid: 3000 + i, messageId: '<rempli-' + i + '@banc-1012>', from: 'rempli@inconnu-1012.fr', to: BA, subject: 'Rempli ' + i, text: 'x', ts: Date.now(), flags: ['\\Seen'] });
    ecrireEtat(e);
    r = await post('/api/monitor/mail/boites/retirer', { id: 'b-a' });
    v('la boîte A est retirée de la Messagerie (trois messages neufs, que la relève n\'a jamais vus, arrivent — puis trente lus)', [r.s, r.j.ok], [200, true]);
    const aMarquer = intacts.concat(neufs);
    const rangesApres = () => new Set((lireD('support-mails.json') || []).map(x => x.mid));
    const rangesNeufs = () => neufs.every(x => rangesApres().has(x.messageId));
    /* ⛔ ON REJOUE LA RELÈVE SEULEMENT QUAND ELLE N'A PAS PASSÉ (elle refuse de se lancer si une autre tourne), JAMAIS parce qu'un
       drapeau manque : une seconde relève marquerait par l'autre chemin ce que la première aurait oublié, et le défaut disparaîtrait. */
    for (let essai = 0; essai < 3 && !rangesNeufs(); essai++) {
      r = await post('/api/monitor/support/connect', { email: BA, pass: 'x', imapHost: '127.0.0.1', smtpHost: '127.0.0.1', smtpPort: portSmtp });
      for (let i = 0; i < 75 && !rangesNeufs(); i++) await dormir(200);   // la liste s'écrit à la FIN de la relève, drapeaux posés
    }
    await dormir(500);
    const marques2 = (lireEtat().boites[BA].actions || []).filter(x => /^marque\+\\Seen/.test(x.action)).map(x => x.messageId);
    const midsApres = rangesApres();
    vrai('⛔ boîte NON reliée : la relève marque « lu » ce qu\'elle avait déjà rangé, comme avant (' + intacts.filter(x => marques2.includes(x.messageId)).length + ' sur ' + intacts.length + ')', intacts.every(x => marques2.includes(x.messageId)));
    vrai('⛔ … et ce qu\'elle range à l\'instant (les trois messages neufs : importés ET marqués)', neufs.every(x => midsApres.has(x.messageId) && marques2.includes(x.messageId)));
    vrai('   … et jamais l\'avis de sécurité (qui doit se voir non lu chez le patron)', !marques2.includes('<' + PROTEGE + '>')
      && !(messagesDe(BA, 'INBOX').find(x => x.messageId === '<' + PROTEGE + '>').flags || []).includes('\\Seen'));

    /* ══ 10. LES JOURNAUX ═══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n10. Le journal du serveur');
    vrai('POPULATION : le serveur a écrit son journal (messagerie montée)', /messagerie : module chargé/.test(journal) && journal.length > 100);
    vrai('⛔ aucune adresse entière dans le journal du serveur, de bout en bout', !/[A-Za-z0-9._-]{2,}@[A-Za-z0-9.-]*1012\.fr/.test(journal));
    vrai('⛔ rien n\'a été journalisé de ce que contenaient les messages ni de leurs pièces', !/Corps du message|Voir la pièce jointe|devis\.pdf|gros\.bin/.test(journal));
  } catch (e) { ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  if (pauses) console.log('\n  (le budget global de 120 requêtes par minute a fait attendre ' + pauses + ' fois : attente, pas défaut)');
  if (ko) console.log('\n── journal du serveur (fin) ──\n' + journal.slice(-1500));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  fin();
  process.exit(ko ? 1 : 0);
})();
