/* ══ SONDE : LE RELAIS RÉEL — UN VRAI coturn, LA CONFIGURATION QUE `install-turn.sh` PRODUIT, LES IDENTIFIANTS QUE LE VRAI SERVICE FABRIQUE ═══════════════════════════════════════════════
   Ce n'est PAS un banc (`tests/test-*.js`) : il demande `turnserver` (coturn 4.6.1, le paquet d'Ubuntu 24.04) et `openssl`, absents du runner de la CI — un banc qui « se saute » fait tomber la CI.
   Sans eux la sonde le DIT et sort en 0 : « NON VÉRIFIÉ » n'est pas « vert ». Lancer :  node tests/sonde-opmessages-relais.js

   La chaîne jouée, de bout en bout :
     1. `install-turn.sh` tourne dans le bac à sable de `tests/bac-turn.js` (faux systemctl, apt, certbot…) et PRODUIT la configuration de coturn et celle de l'instance (le secret y est tiré) ;
     2. cette configuration est donnée à un VRAI coturn — avec SIX lignes changées, et seulement elles : les ports (écoute, TLS, plage des relais) et le certificat (un certificat de la sonde) ;
     3. le VRAI service d'OP MESSAGES démarre avec le secret de la configuration produite, et `GET /api/ice` rend les identifiants ;
     4. un client TURN écrit à la main (`server-msg/outils/verifier-relais.js`, messages STUN/TURN construits à la main) parle à coturn avec ces identifiants :
          · une allocation réussit ; un identifiant FAUX et un identifiant PÉRIMÉ (calculé ICI, avec `crypto`, indépendamment du service) sont refusés (401) ;
          · CreatePermission vers 127.0.0.1, le réseau privé, le lien local (169.254.169.254 : le service de métadonnées de l'hébergeur), 100.64/10, 0/8 est REFUSÉ (403) — sans cela le relais
            atteint OP GESTION sur 127.0.0.1:8080 — aux bornes exactes de chaque plage (dernière adresse refusée, première adresse permise) ; une adresse publique est ACCEPTÉE ;
          · UDP, TCP et TLS (certificat vérifié par le client) ; deux instances = deux secrets : les deux allouent ;
          · pas de relais TCP (RFC 6062), pas d'attribut SOFTWARE, un STUN anonyme répond (les pages en ont besoin), le quota par identifiant (8) est tenu ;
          · coturn n'écrit RIEN : ni le secret, ni l'identifiant d'une personne, ni un nom d'utilisateur dans sa sortie ;
     5. la VRAIE commande de contrôle de Justin (`outils/verifier-relais.js beta`) sort 0 sur ce relais — et sort 1, avec le ✗ qui dit pourquoi, sur trois relais DÉFAILLANTS :
        règles écrites en CIDR (ignorées en silence par coturn), règles absentes, plage IPv6 qui commence à « :: » (avale les IPv4) — les trois pièges mesurés sur coturn 4.6.1 ;
     6. ⛔ LE PARE-FEU SORTANT (relecture, I2 — mesuré sur coturn 4.6.1 : `denied-peer-ip` ne refuse pas l'adresse publique de la machine, donc une allocation atteint les services UDP de la machine ET le
        relais lui-même) : le VRAI `turn-pare-feu.sh` pose de vraies règles `iptables` pour l'utilisateur `turnserver`, un vrai coturn tourne SOUS cet utilisateur, et la commande de Justin prouve les deux moitiés —
        « relais ↔ relais » (le trafic d'un appel relayé des deux côtés) PASSE, « un service UDP de la machine » n'est PAS atteint ; la même commande, SANS les règles, est ROUGE. Cette partie demande d'être root, `iptables`,
        `setpriv` et l'utilisateur `turnserver` : sans eux elle le DIT (« NON VÉRIFIÉ »), jamais vert. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const { banc, RACINE } = require('./bac-messages.js');
const T = require('./outils-msg');
const { bac, reel, RE_SECRET, LIGNE_SECRET } = require('./bac-turn.js');
const V = require(path.join(RACINE, 'server-msg', 'outils', 'verifier-relais.js'));
const t = banc();
const { v, vrai } = t;

const coturn = reel('turnserver') || (fs.existsSync('/usr/bin/turnserver') ? '/usr/bin/turnserver' : null);
const openssl = reel('openssl') || (fs.existsSync('/usr/bin/openssl') ? '/usr/bin/openssl' : null);
if (!coturn || !openssl) {
  console.log('\n⚠️  NON VÉRIFIÉ : ' + (!coturn ? 'turnserver (coturn) est absent de cette machine' : 'openssl est absent de cette machine') + ' — la sonde du relais réel n\'a pas été jouée.');
  console.log('   (sur Ubuntu 24.04 :  apt-get install -y coturn)');
  process.exit(0);
}
const version = String(spawnSync(coturn, ['--version'], { encoding: 'utf8' }).stdout || '').trim();
console.log('\n── sonde du relais réel · coturn ' + version + ' ──');

const dort = (ms) => new Promise(r => setTimeout(r, ms));
const portLibre = () => new Promise((ok) => { const s = require('net').createServer().listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => ok(p)); }); });
const ip4 = (s) => s.split('.').reduce((a, o) => (a << 8n) + BigInt(o), 0n);
const ip4Texte = (n) => [24n, 16n, 8n, 0n].map(d => String((n >> d) & 255n)).join('.');

/* ── un VRAI coturn, démarré avec un texte de configuration ── */
async function demarrer(dir, nom, texte, sous) {
  const f = path.join(dir, nom + '.conf');
  fs.writeFileSync(f, texte, { mode: sous ? 0o644 : 0o600 });          // sous un autre utilisateur, la sonde doit pouvoir être LUE par lui (une configuration de sonde : son secret n'en est pas un)
  const proc = sous ? spawn('setpriv', ['--reuid=' + sous, '--regid=' + sous, '--clear-groups', coturn, '-c', f, '--pidfile='], { stdio: ['ignore', 'pipe', 'pipe'] })
    : spawn(coturn, ['-c', f, '--pidfile='], { stdio: ['ignore', 'pipe', 'pipe'] });
  let sortie = '', mort = null;
  proc.stdout.on('data', (d) => { sortie += d; }); proc.stderr.on('data', (d) => { sortie += d; });
  proc.on('exit', (c) => { mort = c; });
  const port = Number(/^listening-port=(\d+)$/m.exec(texte)[1]);
  const pret = await T.attendre(async () => {
    if (mort !== null) return 'mort';
    try {
      const l = await V.ouvrir({ hote: '127.0.0.1', port, transport: 'udp' });
      const m = await l.echange(V.message(0x0001, [], crypto.randomBytes(12), null), 600); l.fermer();
      return !!m && m.type === 0x0101;
    } catch (e) { return false; }
  }, 8000, 150);
  return {
    pret: pret === true, sortie: () => sortie, port,
    async arreter() { if (mort === null) { proc.kill('SIGTERM'); await T.attendre(() => mort !== null, 4000); if (mort === null) proc.kill('SIGKILL'); await dort(200); } },
  };
}

(async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-relais-'));
  const vivants = [];
  const b = bac({ coturn: true });
  let og = null, svc = null;
  try {
    /* ═══ 1. `install-turn.sh` PRODUIT la configuration ═══ */
    b.instance('beta'); b.instance('prod');
    await b.serveur('beta'); await b.serveur('prod');
    const r1 = await b.lancer(['beta'], { OPMSG_TURN_HOTE: '127.0.0.1' });
    const r2 = await b.lancer(['prod'], { OPMSG_TURN_HOTE: '127.0.0.1' });
    v('l\'installation (jouée avec de faux systemctl/apt/certbot) a produit les deux configurations', [r1.status, r2.status], [0, 0]);
    const confBrute = b.octets('etc/turnserver.conf');
    const cfgBeta = b.config('beta'), cfgProd = b.config('prod');
    const secretBeta = cfgBeta.appels.relais.secret, secretProd = cfgProd.appels.relais.secret;
    vrai('population : deux secrets valides et différents, tous deux dans la configuration de coturn',
      RE_SECRET.test(secretBeta) && RE_SECRET.test(secretProd) && secretBeta !== secretProd && confBrute.includes(LIGNE_SECRET + secretBeta) && confBrute.includes(LIGNE_SECRET + secretProd));

    /* un certificat de la sonde pour le TLS : vérifié par le client, pour 127.0.0.1 */
    const cert = path.join(dir, 'cert.pem'), cle = path.join(dir, 'cle.pem');
    const gen = spawnSync(openssl, ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', cle, '-out', cert, '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8' });
    v('le certificat de la sonde est fait (openssl)', [gen.status, fs.existsSync(cert), fs.existsSync(cle)], [0, true, true]);
    const caPem = fs.readFileSync(cert);

    /* ═══ 2. SIX lignes changées, et seulement elles ═══ */
    const portU = await portLibre(), portT = await portLibre();
    const adapter = (texte, min, max) => texte
      .replace(/^listening-port=.*$/m, 'listening-port=' + portU).replace(/^tls-listening-port=.*$/m, 'tls-listening-port=' + portT)
      .replace(/^min-port=.*$/m, 'min-port=' + min).replace(/^max-port=.*$/m, 'max-port=' + max)
      .replace(/^cert=.*$/m, 'cert=' + cert).replace(/^pkey=.*$/m, 'pkey=' + cle);
    const conf = adapter(confBrute, 49300, 49360);
    const avant = new Set(confBrute.split('\n')), apres = new Set(conf.split('\n'));
    const changees = [...avant].filter(l => !apres.has(l)), nouvelles = [...apres].filter(l => !avant.has(l));
    v('⛔ la configuration donnée à coturn ne diffère de celle du script que par SIX lignes (les trois ports, la plage des relais — deux lignes — et le certificat — deux lignes)', [changees.length, nouvelles.length], [6, 6]);
    vrai('   et ces six lignes sont bien celles-là (ports, plage, certificat, clé)', changees.every(l => /^(listening-port|tls-listening-port|min-port|max-port|cert|pkey)=/.test(l)) && nouvelles.every(l => /^(listening-port|tls-listening-port|min-port|max-port|cert|pkey)=/.test(l)));

    /* ═══ 3. LE VRAI coturn, LE VRAI SERVICE ═══ */
    const relais = Object.assign({}, cfgBeta.appels.relais, { hote: '127.0.0.1', port: portU, portTls: portT });
    const c = await demarrer(dir, 'relais', conf); vivants.push(c);
    vrai('le VRAI coturn démarre avec la configuration produite par le script et répond à un STUN anonyme', c.pret);
    og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true }, bob: { pass: 'pw-bob-1234', nom: 'Bob', actif: true } });
    svc = await T.lancerService({ urlGestion: og.url, config: { appels: { relais } } });
    const alice = await T.connecter(svc, og, 'alice', 'pw-alice-1234'), bob = await T.connecter(svc, og, 'bob', 'pw-bob-1234');
    /* ⛔ des identifiants de relais ne se donnent qu'à qui est DANS un appel (relecture, I1) : Alice appelle Bob, la sonnerie court */
    const lienC = (await alice.post('/api/contacts/lien', { max: 1, jours: 7 })).j;
    await bob.post('/api/liens/accepter', { code: lienC.code });
    const sansAppel = await alice.get('/api/ice');
    const lancement = await alice.post('/api/appels', { uid: bob.moi.id, type: 'audio' });
    v('⛔ SANS appel, le service ne donne AUCUN identifiant (404) ; avec un appel qui sonne, l\'appelante et l\'appelé en reçoivent', [sansAppel.code, lancement.code, (await bob.get('/api/ice')).code], [404, 201, 200]);
    const ice = (await alice.get('/api/ice')).j;
    const turn = (ice.serveurs || []).find(s => s.username);
    vrai('population : /api/ice rend un serveur TURN avec identifiants et un STUN', ice.relais === true && !!turn && (ice.serveurs || []).some(s => !s.username));
    const toutesLesUrls = (ice.serveurs || []).flatMap(s => s.urls);
    v('⛔ les adresses sont celles du relais SEUL (stun, turn en UDP, turns en TLS : DEUX adresses de relais, pas trois) — aucun serveur d\'un tiers', toutesLesUrls.sort(), ['stun:127.0.0.1:' + portU, 'turn:127.0.0.1:' + portU + '?transport=udp', 'turns:127.0.0.1:' + portT + '?transport=tcp']);
    const uid = turn.username.split(':')[1];
    /* ⛔ le calcul INDÉPENDANT : HMAC-SHA1 du secret sur le nom d'utilisateur, en base64 — sans passer par le code du service */
    const hmac = (secret, nom) => crypto.createHmac('sha1', secret).update(nom).digest('base64');
    v('⛔ le mot de passe que le service a fabriqué est BASE64(HMAC-SHA1(secret, nom)) recalculé ici', turn.credential, hmac(secretBeta, turn.username));
    const identifiants = (secret) => (age) => {
      const exp = Math.floor(Date.now() / 1000) + (age === 'perime' ? -3600 : 3600), nom = exp + ':' + uid;
      if (age === 'bon' && secret === secretBeta) return { username: turn.username, credential: turn.credential };   // ceux du SERVICE
      return { username: nom, credential: age === 'mauvais' ? crypto.randomBytes(20).toString('base64') : hmac(secret, nom) };
    };

    /* ═══ 4. LES CONTRÔLES : UDP, TCP, TLS ═══ */
    console.log('\nLes identifiants du service contre le vrai relais, en UDP, en TCP et en TLS');
    const res = await V.controles({ hote: '127.0.0.1', port: portU, portTls: portT, identifiants: identifiants(secretBeta), hoteTls: '127.0.0.1', optsTls: { ca: caPem } });
    vrai('population : ' + res.length + ' contrôles joués (UDP et TCP : allocation, 7 refus, 1 acceptation, 2 identifiants refusés ; TLS : 1)', res.length === 2 * (1 + 7 + 1 + 2) + 1);
    for (const r of res) v((r.ok ? '' : '[' + r.detail + '] ') + r.nom, r.ok, true);
    v('⛔ la seconde instance (autre secret) alloue aussi : coturn connaît les deux', (await V.controles({ hote: '127.0.0.1', port: portU, transports: ['udp'], identifiants: identifiants(secretProd) })).filter(r => !r.ok).map(r => r.nom), []);
    v('⛔ un identifiant calculé avec un secret que coturn ne connaît pas est refusé', (await V.controles({ hote: '127.0.0.1', port: portU, transports: ['udp'], identifiants: identifiants(crypto.randomBytes(36).toString('base64url')) })).filter(r => /ACCEPTE nos identifiants/.test(r.nom)).map(r => r.ok), [false]);

    /* les bornes exactes de chaque plage */
    console.log('\nLes bornes : la dernière adresse refusée, la première adresse permise');
    {
      const lien = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
      const s = V.session(lien);
      const a = await s.allouer(identifiants(secretBeta)('bon'));
      vrai('population : une allocation pour jouer les bornes', a.ok);
      const bornes = [
        ['0.0.0.0', 403], ['0.255.255.255', 403], ['1.0.0.0', 200],
        ['9.255.255.255', 200], ['10.0.0.0', 403], ['10.255.255.255', 403], ['11.0.0.0', 200],
        ['100.63.255.255', 200], ['100.64.0.0', 403], ['100.127.255.255', 403], ['100.128.0.0', 200],
        ['126.255.255.255', 200], ['127.0.0.0', 403], ['127.255.255.255', 403], ['128.0.0.0', 200],
        ['169.253.255.255', 200], ['169.254.0.0', 403], ['169.254.169.254', 403], ['169.254.255.255', 403], ['169.255.0.0', 200],
        ['172.15.255.255', 200], ['172.16.0.0', 403], ['172.31.255.255', 403], ['172.32.0.0', 200],
        ['192.0.0.0', 403], ['192.0.0.255', 403], ['192.0.1.0', 200],
        ['192.167.255.255', 200], ['192.168.0.0', 403], ['192.168.255.255', 403], ['192.169.0.0', 200],
        ['198.17.255.255', 200], ['198.18.0.0', 403], ['198.19.255.255', 403], ['198.20.0.0', 200],
        ['223.255.255.255', 200], ['224.0.0.0', 403], ['224.0.0.1', 403], ['239.255.255.255', 403], ['255.255.255.255', 403],
        ['93.184.216.34', 200], ['8.8.8.8', 200], ['1.1.1.1', 200],
      ];
      const faux = [];
      for (const [ip, attendu] of bornes) { const p = await s.permission(ip); if ((p.ok ? 200 : p.code) !== attendu) faux.push(ip + ' → ' + (p.ok ? 200 : p.code) + ' (attendu ' + attendu + ')'); }
      v('⛔ les ' + bornes.length + ' bornes : chaque adresse de la liste de refus est refusée (403) jusqu\'à sa dernière, chaque adresse voisine publique est permise (200) — sans écart', faux, []);
      const v6 = await s.permission('2606:4700:4700::1111');
      vrai('une adresse IPv6 sur une allocation IPv4 n\'est PAS permise (le relais n\'ouvre pas de côté IPv6 qu\'on ne lui a pas demandé) — code ' + v6.code, !v6.ok);
      await s.rendre(); s.fermer();
    }

    /* ce que le relais ne fait pas, et ce qu'il fait pour les pages */
    console.log('\nCe que le relais ne fait pas, et ce qu\'il fait pour les pages');
    {
      const tcp = await (async () => { const l = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' }); try { return await V.session(l).allouer(identifiants(secretBeta)('bon'), { protocole: 6 }); } finally { l.fermer(); } })();
      vrai('⛔ pas de relais TCP (RFC 6062, `no-tcp-relay`) : une allocation en transport TCP est refusée — code ' + tcp.code, !tcp.ok);
      const l = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
      const trans = Buffer.concat([Buffer.from([0x00, 0x19, 0x00, 0x04, 17, 0, 0, 0])]);
      const m401 = await l.echange(V.message(0x0003, [trans], crypto.randomBytes(12), null));
      const liste = [...m401.attrs.keys()];
      v('une demande sans identité reçoit 401 avec le domaine et le nonce, et SANS attribut SOFTWARE (`no-software-attribute` : la version de coturn ne se lit pas), AVEC l\'empreinte (`fingerprint`)', [V.codeErreur(m401), liste.includes(0x0014), liste.includes(0x0015), liste.includes(0x8022), liste.includes(0x8028)], [401, true, true, false, true]);
      const bind = await l.echange(V.message(0x0001, [], crypto.randomBytes(12), null));
      const mapped = bind.attrs.get(0x0020) ? V.lireAdresse(bind.attrs.get(0x0020), bind.txid) : null;
      v('un STUN anonyme répond avec l\'adresse vue du client (les pages découvrent ainsi leur adresse publique, sans serveur d\'un tiers)', [bind.type, mapped && mapped.ip], [0x0101, '127.0.0.1']);
      l.fermer();
    }
    {
      /* le quota par identifiant : huit allocations pour un même nom, la neuvième est refusée (486) — et toutes sont rendues ensuite.
         ⚠️ coturn libère une allocation rendue (Refresh de durée 0) au tour de son minuteur, une à deux secondes plus tard — mesuré : compter le quota juste après les contrôles
         précédents en voit encore une partie. On laisse donc finir ce qui a été rendu avant de compter, et de nouveau avant de vérifier que le quota se libère. */
      await dort(3000);
      const quota = Number(/^user-quota=(\d+)$/m.exec(conf)[1]);
      vrai('population : le quota de la configuration produite est un petit nombre positif (' + quota + ')', quota >= 2 && quota <= 16);
      const liens = [], sessions = [], codes = [];
      for (let i = 0; i < quota + 1; i++) {
        const lien = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
        const s = V.session(lien); liens.push(lien); sessions.push(s);
        const a = await s.allouer(identifiants(secretBeta)('bon'));
        codes.push(a.ok ? 200 : a.code);
      }
      v('⛔ `user-quota=' + quota + '` : ' + quota + ' allocations passent pour un même identifiant, la suivante est refusée (486, quota atteint)', [codes.slice(0, quota), codes[quota]], [new Array(quota).fill(200), 486]);
      for (let i = 0; i < quota; i++) { try { await sessions[i].rendre(); } catch (e) { /* déjà rendue */ } }
      for (const l of liens) l.fermer();
      await dort(3000);
      const lien = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
      const apresRendu = await V.session(lien).allouer(identifiants(secretBeta)('bon'));
      lien.fermer();
      vrai('   et une fois rendues, l\'identifiant peut de nouveau allouer (le quota se libère)', apresRendu.ok);
    }

    /* ═══ L'ÉCHÉANCE DES IDENTIFIANTS PENDANT QUE L'ALLOCATION VIT — la raison du renouvellement à 75 % de leur vie, MESURÉE sur coturn 4.6.1 ═══ */
    console.log('\nLes identifiants ÉCHOIENT pendant que l\'allocation vit : ce que le relais en fait');
    {
      const exp = Math.floor(Date.now() / 1000) + 3, nom = exp + ':' + uid, ids = { username: nom, credential: hmac(secretBeta, nom) };
      const lien = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
      const sess = V.session(lien);
      const a = await sess.allouer(ids);
      const avant = a.ok ? await sess.permission('93.184.216.34') : { ok: false, code: null };
      vrai('population : l\'allocation est faite avec des identifiants qui échoient dans 3 s, et une permission y est accordée AVANT l\'échéance', a.ok && avant.ok);
      await dort(4500);
      const apres = await sess.permission('93.184.216.34');
      const rafraichi = await sess.rendre();
      const lien2 = await V.ouvrir({ hote: '127.0.0.1', port: portU, transport: 'udp' });
      const neuve = await V.session(lien2).allouer(ids); lien2.fermer();
      lien.fermer();
      console.log('   MESURÉ : après l\'échéance, CreatePermission sur l\'allocation en place → ' + (apres.ok ? 'ACCEPTÉ' : 'refusé, code ' + apres.code) + ' ; Refresh → ' + (rafraichi.ok ? 'accepté' : 'refusé, code ' + rafraichi.code) + ' ; une NOUVELLE allocation avec les mêmes identifiants → ' + (neuve.ok ? 'ACCEPTÉE' : 'refusée, code ' + neuve.code));
      v('⛔ MESURÉ sur coturn 4.6.1 : une fois l\'échéance passée, une allocation DÉJÀ en place continue d\'être servie (permission, prolongation : coturn n\'authentifie qu\'à la création) mais AUCUNE nouvelle allocation ne se crée avec ces identifiants (401) — c\'est ce que le renouvellement à 75 % de leur vie protège : le redémarrage ICE d\'un long appel (le téléphone change de réseau) alloue de NOUVEAU', [apres.ok, rafraichi.ok, neuve.ok], [true, true, false]);
    }

    /* coturn n'écrit rien */
    {
      const sortie = c.sortie();
      const cherches = [['le secret de la bêta', secretBeta], ['le secret de la production', secretProd], ['l\'identifiant de la personne', uid], ['le nom d\'utilisateur', turn.username], ['le mot de passe fabriqué', turn.credential], ['une adresse de pair', '93.184.216.34']];
      v('⛔ coturn n\'écrit RIEN de tout cela dans sa sortie (' + sortie.length + ' octets, après des centaines de requêtes) : ni secret, ni identifiant de personne, ni nom d\'utilisateur, ni adresse', cherches.filter(([, x]) => sortie.includes(x)).map(([n]) => n), []);
      vrai('population : la sortie de coturn a bien été lue (ses messages de démarrage y sont, elle n\'est pas vide par accident)', sortie.length > 20);
    }

    /* ═══ 5. LA COMMANDE DE JUSTIN, sur ce relais et sur trois relais défaillants ═══ */
    console.log('\nLa commande de contrôle de Justin (outils/verifier-relais.js beta) : verte sur ce relais, rouge sur trois relais défaillants');
    const adresseLocale = () => { for (const l of Object.values(os.networkInterfaces())) for (const i of l || []) if (i.family === 'IPv4' && !i.internal) return i.address; return null; };
    const hotePublique = adresseLocale();
    const commande = (autre) => {
      const fcfg = path.join(dir, 'instance-' + crypto.randomBytes(3).toString('hex') + '.json');
      fs.writeFileSync(fcfg, JSON.stringify(Object.assign({}, cfgBeta, { appels: Object.assign({}, cfgBeta.appels, { relais: Object.assign({}, relais, autre || {}) }) }), null, 2), { mode: 0o600 });
      const r = spawnSync(process.execPath, [path.join(RACINE, 'server-msg', 'outils', 'verifier-relais.js'), 'beta'], { env: Object.assign({}, process.env, { OPMSG_CONFIG: fcfg }), encoding: 'utf8', timeout: 90000 });
      return { status: r.status, out: String(r.stdout) + String(r.stderr) };
    };
    if (!hotePublique) {
      console.log('  ⚠️  NON VÉRIFIÉ : cette machine n\'a aucune adresse hors boucle locale — la commande de contrôle, qui parle au relais par l\'adresse de la machine, n\'a pas été jouée.');
    } else {
      /* ⛔ SANS le pare-feu sortant, la commande est ROUGE — et ne l'est que d'un seul contrôle : « un service UDP de la machine n'est pas atteint ». C'est la preuve que ce contrôle PEUT échouer (un contrôle qui
         ne tombe jamais ne prouve rien) ; tout le reste est vert, « relais ↔ relais » compris. Le nom du relais donné à la commande est l'adresse de la machine : coturn alloue le relais sur l'adresse où la
         demande est ARRIVÉE (un client qui parle à 127.0.0.1 reçoit un relais sur 127.0.0.1, que `denied-peer-ip` refuse). */
      const r = commande({ hote: hotePublique });
      const rouges = r.out.split('\n').filter(l => /^\s*✗/.test(l));
      v('⛔ SANS pare-feu sortant, la commande SORT 1 et le DIT : un seul ✗, « le relais n\'atteint PAS un service UDP de la machine »', [r.status, rouges.length, /n'atteint PAS un service UDP de la machine/.test(rouges.join('\n')), /contrôle\(s\) en échec/.test(r.out)], [1, 1, true, true]);
      vrai('   « RELAIS ↔ RELAIS » passe (✓) : le trafic d\'un appel relayé des deux côtés est permis — et c\'est lui que le pare-feu ne doit pas casser', /✓ \(UDP\) RELAIS ↔ RELAIS/.test(r.out));
      vrai('   son TLS est un AVIS (⚠️), pas un échec : le certificat de la sonde est auto-signé pour 127.0.0.1, le relais est ici joint par l\'adresse de la machine', /⚠️ \(TLS\)/.test(r.out));
      vrai('⛔ rien de secret dans sa sortie : ni le secret, ni l\'identifiant, ni un mot de 40 caractères ou plus', !r.out.includes(secretBeta) && !r.out.includes(uid) && !/[A-Za-z0-9_-]{40,}/.test(r.out));
      vrai('population : la sortie compte ses ✓ (22 : onze par transport ; plus « relais ↔ relais » : 23)', (r.out.match(/✓ \((UDP|TCP)\)/g) || []).length === 23);
    }
    const defaillants = [
      ['des règles écrites en CIDR (ignorées en silence par coturn)', (x) => x.replace(/^denied-peer-ip=(\d+\.\d+\.\d+\.\d+)-.*$/mg, (m, a) => 'denied-peer-ip=' + a + '/8'), /REFUSE de relayer vers/],
      ['aucune règle de refus', (x) => x.replace(/^denied-peer-ip=.*\n/mg, ''), /REFUSE de relayer vers/],
      ['une plage IPv6 qui commence à « :: » (avale les adresses IPv4)', (x) => x + 'denied-peer-ip=::-::ffff:ffff:ffff\n', /ACCEPTE une adresse publique/],
    ];
    for (const [nom, muter, motif] of defaillants) {
      const portMuteU = await portLibre(), portMuteT = await portLibre();
      let texte = muter(conf).replace(/^listening-port=.*$/m, 'listening-port=' + portMuteU).replace(/^tls-listening-port=.*$/m, 'tls-listening-port=' + portMuteT).replace(/^min-port=.*$/m, 'min-port=49400').replace(/^max-port=.*$/m, 'max-port=49460');
      const m = await demarrer(dir, 'defaillant', texte); vivants.push(m);
      if (!m.pret) { v('[' + nom + '] le coturn défaillant DÉMARRE (coturn ne refuse pas une configuration absurde — mesuré)', m.pret, true); await m.arreter(); continue; }
      const fcfg = path.join(dir, 'defaillant-' + crypto.randomBytes(3).toString('hex') + '.json');
      fs.writeFileSync(fcfg, JSON.stringify(Object.assign({}, cfgBeta, { appels: Object.assign({}, cfgBeta.appels, { relais: Object.assign({}, relais, { port: portMuteU, portTls: portMuteT }) }) }), null, 2), { mode: 0o600 });
      const r = spawnSync(process.execPath, [path.join(RACINE, 'server-msg', 'outils', 'verifier-relais.js'), 'beta'], { env: Object.assign({}, process.env, { OPMSG_CONFIG: fcfg }), encoding: 'utf8', timeout: 90000 });
      const sortie = String(r.stdout) + String(r.stderr);
      vrai('⛔ [' + nom + '] coturn DÉMARRE quand même (aucun refus de démarrage)', m.pret);
      v('⛔ [' + nom + '] la commande SORT 1, et le ✗ dit CE QUI est faux', [r.status, motif.test(sortie.split('\n').filter(l => /✗/.test(l)).join('\n')), /contrôle\(s\) en échec/.test(sortie)], [1, true, true]);
      vrai('   sans rien de secret dans sa sortie', !sortie.includes(secretBeta) && !/[A-Za-z0-9_-]{40,}/.test(sortie));
      await m.arreter();
    }
    vrai('population : trois relais défaillants ont été joués', defaillants.length === 3);

    /* ═══ 6. LE PARE-FEU SORTANT, joué pour de vrai : coturn SOUS l'utilisateur `turnserver`, de vraies règles `iptables` ═══ */
    console.log('\nLe pare-feu sortant du relais : un vrai coturn sous son utilisateur, de vraies règles — relais ↔ relais passe, un service de la machine n\'est pas atteint');
    {
      const PF = path.join(RACINE, 'server-msg', 'turn-pare-feu.sh');
      const outil = (nom, args) => spawnSync(nom, args || ['-V'], { encoding: 'utf8' });
      const capable = typeof process.getuid === 'function' && process.getuid() === 0 && outil('iptables').status === 0 && outil('iptables', ['-S', 'OUTPUT']).status === 0 && outil('setpriv', ['--version']).status === 0 && outil('id', ['-u', 'turnserver']).status === 0 && !!hotePublique;
      if (!capable) {
        console.log('  ⚠️  NON VÉRIFIÉ : le pare-feu sortant demande d\'être root, `iptables`, `setpriv`, l\'utilisateur `turnserver` et une adresse de machine hors boucle locale — il n\'a pas été joué ici (INSTALLER-LE-SERVEUR.md : la commande de contrôle le joue sur le VPS).');
      } else {
        const jouerPF = (arg, env) => { const r = spawnSync('bash', [PF, arg], { encoding: 'utf8', env: Object.assign({}, process.env, env || {}) }); return { status: r.status, out: String(r.stdout) + String(r.stderr) }; };
        const portU6 = await portLibre(), portT6 = await portLibre();
        const ENV = { OPMSG_TURN_PORT_MIN: '49300', OPMSG_TURN_PORT_MAX: '49360', OPMSG_TURN_PORTS_ECOUTE: portU6 + ',' + portT6 };
        let c6 = null;
        try {
          jouerPF('stop', ENV);                                           // rien de laissé par une sonde précédente
          fs.chmodSync(dir, 0o755); fs.chmodSync(cle, 0o644); fs.chmodSync(cert, 0o644);          // lisibles par `turnserver` (des fichiers de sonde)
          const texte6 = adapter(confBrute, 49300, 49360).replace(/^listening-port=.*$/m, 'listening-port=' + portU6).replace(/^tls-listening-port=.*$/m, 'tls-listening-port=' + portT6);
          c6 = await demarrer(dir, 'sous-pare-feu', texte6, 'turnserver'); vivants.push(c6);
          vrai('population : le VRAI coturn démarre sous l\'utilisateur `turnserver` (celui que visent les règles)', c6.pret);
          const pose = jouerPF('start', ENV);
          v('⛔ le VRAI script pose de VRAIES règles (IPv4' + (/IPv6/.test(pose.out) ? ' et IPv6' : '') + ') et les relit dans le noyau', [pose.status, jouerPF('verifier', ENV).status, /en place/.test(jouerPF('verifier', ENV).out)], [0, 0, true]);
          const autre = { hote: hotePublique, port: portU6, portTls: portT6 };
          const verte = commande(autre);
          v('⛔ AVEC le pare-feu, la commande de Justin SORT 0 : « relais ↔ relais » passe ET le service de la machine n\'est pas atteint', [verte.status, /Le relais fait ce qu'il doit/.test(verte.out), /✓ \(UDP\) RELAIS ↔ RELAIS/.test(verte.out), /✓ \(UDP\) le relais n'atteint PAS un service UDP de la machine/.test(verte.out)], [0, true, true, true]);
          vrai('population : la sortie compte ses ✓ (22 + « relais ↔ relais » + « service non atteint » : 24)', (verte.out.match(/✓ \((UDP|TCP)\)/g) || []).length === 24);
          vrai('   rien de secret dans sa sortie', !verte.out.includes(secretBeta) && !verte.out.includes(uid) && !/[A-Za-z0-9_-]{40,}/.test(verte.out));
          /* le même relais, les règles RETIRÉES : la même commande redevient rouge (le contrôle ne passe pas tout seul) */
          jouerPF('stop', ENV);
          await dort(3500);                                               // coturn libère une allocation RENDUE une à deux secondes plus tard : la commande suivante ne doit pas buter sur le quota des précédentes
          const nue = commande(autre);
          if (!/✗ \(UDP\) le relais n'atteint PAS un service UDP de la machine/.test(nue.out)) console.log('   (✗ relevés : ' + nue.out.split('\n').filter(l => /^\s*✗/.test(l)).map(l => l.trim().slice(0, 140)).join(' | ') + ')');
          v('⛔ LE MÊME relais, les règles retirées : la commande SORT 1 (« n\'atteint PAS un service UDP de la machine » en ✗) — et `verifier` le dit aussi (ABSENT)', [nue.status, /✗ \(UDP\) le relais n'atteint PAS un service UDP de la machine/.test(nue.out), jouerPF('verifier', ENV).status], [1, true, 1]);
        } finally {
          jouerPF('stop', ENV);
          const reste = spawnSync('iptables', ['-S', 'OUTPUT'], { encoding: 'utf8' }).stdout;
          vrai('   la sonde ne laisse AUCUNE règle derrière elle (OUTPUT n\'a plus de saut vers la chaîne du relais)', !/OPMSG-TURN/.test(reste));
        }
      }
    }
    {
      const r = spawnSync(process.execPath, [path.join(RACINE, 'server-msg', 'outils', 'verifier-relais.js'), 'beta'], { env: Object.assign({}, process.env, { OPMSG_CONFIG: path.join(dir, 'absente.json') }), encoding: 'utf8' });
      v('la commande sans configuration lisible le dit sans rien afficher, et sort 1', [r.status, /illisible \(absente\)/.test(r.stdout)], [1, true]);
      const r2 = spawnSync(process.execPath, [path.join(RACINE, 'server-msg', 'outils', 'verifier-relais.js'), 'staging'], { encoding: 'utf8' });
      v('et sans instance connue : usage, sortie 2', [r2.status, /usage/.test(r2.stdout)], [2, true]);
    }
  } catch (e) {
    console.log('  ✗ la sonde est morte : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const x of vivants) { try { await x.arreter(); } catch (e) { /* arrêté */ } }
    if (svc) await svc.arreter();
    if (og) await og.fermer();
    b.fin();
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) { /* déjà parti */ }
  }
})().then(() => t.fin());
