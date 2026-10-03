/* ⛔ CE QUE CETTE SONDE GARDE — CE QUE LE PROXY FAIT DES PIÈCES (le seul endroit où un VRAI nginx lit la configuration d'`install-msg.sh`).

   Ce fichier n'est PAS une suite : il lui faut un binaire nginx, que ni la CI ni la machine de travail n'installent. `test-931` exécute l'installeur dans un bac et relit le TEXTE de la
   configuration qu'il écrit — il ne peut pas dire qu'un vrai nginx l'accepte, ni quelles tailles il laisse passer, ni ce qu'il écrit dans ses journaux, ni sur quoi il compte ses plafonds.
   Cinq choses seulement se voient ICI, et chacune a sa contre-épreuve (la MÊME configuration privée de la ligne qu'on garde : sans elle, « rien ne se passe » pourrait venir d'un nginx qui ne
   fait rien) :
     1. LES TAILLES : c'est le proxy, pas le service, qui refusait tout dépôt de plus de 64 Ko (un 413 en HTML avant que le service voie le corps). Le bloc `location = /api/pieces` à 26 Mo
        laisse passer 24,9 Mo et refuse 27 Mo ; sans ce bloc, 1,5 Mo est refusé. Il ne part PAS avec le déploiement de la CI (`deployer.sh` n'écrit jamais dans nginx) : il faut rejouer
        `install-msg.sh` sur le VPS (SERVEUR.md § 4.4).
     2. LE JOURNAL D'ACCÈS (B2, relecture du gardien) : avec un journal d'accès ACTIF au niveau http, qui écrit tout — adresse, ligne de requête, nom de fichier de l'en-tête, cookie —, nos
        blocs n'écrivent RIEN ; privés de leur `access_log off`, le journal contient les canaris (le nom, l'identifiant de la conversation, celui de la pièce, l'adresse). Et les refus de débit
        ne laissent rien dans le journal d'erreurs (`limit_req_log_level warn`).
     3. LA CLÉ DES PLAFONDS (A3) : le réseau, pas l'adresse. La table `map` rend l'adresse entière pour l'IPv4 et les 64 premiers bits pour l'IPv6 ; cent cinquante adresses d'un même /64
        partagent le plafond de débit (avec l'ancienne clé, aucune n'est refusée) ; treize dépôts de treize adresses d'un même /64 s'arrêtent au douzième ; vingt-cinq dépôts de vingt-cinq
        réseaux différents s'arrêtent au vingt-quatrième (plafond GLOBAL — le disque de nginx est aussi celui d'OP GESTION). Les adresses sont simulées par `real_ip` : aucune IPv6 ici.
     4. LA LECTURE SANS TAMPON (A2) : un client qui ne lit plus un fichier de 25 Mo ne fait écrire AUCUN fichier temporaire à nginx ; sans le bloc de la lecture, il en écrit des Mo.
     5. QU'UN NGINX QUI LIT UNE CONFIGURATION FAUTIVE LA REFUSE (sans cela, « nginx -t : code 0 » ne prouverait pas que le fichier a été lu).

   Obtenir un binaire sans rien installer (Ubuntu 24.04, la série du VPS) :
       apt-get download nginx && dpkg -x nginx_*.deb /chemin/extrait        puis  OPMSG_NGINX=/chemin/extrait/usr/sbin/nginx
   Lancer :   OPMSG_NGINX=/chemin/nginx node tests/sonde-proxy-nginx.js        (sans binaire : elle le dit et sort en 0, rien n'est vérifié)

   Deux limites de CETTE machine, pas de la configuration, contournées sur la copie lue : pas d'IPv6 (`listen [::]:…` est retiré — `nginx -t` essaie de lier la socket) et un
   nginx lancé en root qui écrit ses tampons de corps sous un autre utilisateur (`user root;`). Les mutations de `tests/mutations-pieces.js` qui touchent `install-msg.sh` la jouent. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), net = require('net');
const { spawn, spawnSync } = require('child_process');
const T = require('./outils-msg');
const { bac } = require('./bac-messages.js');

const Mo = 1024 * 1024;
const NGINX = process.env.OPMSG_NGINX || (spawnSync('bash', ['-c', 'command -v nginx'], { encoding: 'utf8' }).stdout || '').trim();
if (!NGINX || !fs.existsSync(NGINX)) { console.log('Sonde non lançable : aucun binaire nginx (OPMSG_NGINX=/chemin/nginx). Rien n\'est vérifié.'); process.exit(0); }
T.sauterSiSansDependances();

const CLE = 'c0ffee' + 'ab12'.repeat(14) + '0f';
const PUB = 'ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIGq6Fake0Fake0Fake0Fake0Fake0Fake0Fake0Fake0 deploy@mac';
const { v, vrai, fin } = T.compteur();
const brouillon = fs.mkdtempSync(path.join(os.tmpdir(), 'sonde-nginx-'));

/* la configuration, telle que l'installeur l'écrit pour la bêta */
function rendre() {
  const b = bac(); b.proxy('nginx');
  try {
    const r = b.installer('beta', CLE + '\n' + CLE + '\n' + PUB + '\n');
    if (r.rc !== 0) throw new Error('l\'installation dans le bac a échoué (code ' + r.rc + ')');
    return b.lire('etc/nginx/sites-available/opmsg-beta.conf') || '';
  } finally { b.fin(); }      // le faux « déploiement » du bac a lancé un service factice : on le tue et on efface le bac, sinon il survit à la sonde
}
/* les zones (niveau http) puis le bloc 443, rendu en clair sur un port local : sans TLS, sans IPv6, le service sur son vrai port */
function enClair(conf, portNginx, portService) {
  const zones = conf.slice(0, conf.indexOf('server {'));
  const debut = conf.lastIndexOf('server {', conf.indexOf('listen 443'));
  if (debut < 0) throw new Error('le bloc 443 est introuvable dans la configuration rendue');
  return zones + conf.slice(debut)
    .replace(/^\s*listen \[::\]:443[^\n]*\n/m, '').replace(/^\s*listen 443[^\n]*\n/m, '    listen 127.0.0.1:' + portNginx + ';\n')
    .replace(/^\s*http2 on;\n/m, '').replace(/^\s*ssl_certificate(_key)?[^\n]*\n/gm, '')
    .replace(/http:\/\/127\.0\.0\.1:\d+/g, 'http://127.0.0.1:' + portService);
}
/* Le nginx d'essai. `accesActif` : un journal d'accès ACTIF au niveau http, dans un format qui écrit TOUT (adresse, requête, nom de fichier de l'en-tête, cookie) — c'est lui que nos blocs doivent faire taire.
   `realip` : l'adresse du client est celle de `X-Real-IP` (la seule façon de simuler des adresses ici). */
function ecrireConf(nom, conf, { accesActif = false } = {}) {
  const prefixe = path.join(brouillon, nom);
  for (const d of ['logs', 'tmp']) fs.mkdirSync(path.join(prefixe, d), { recursive: true });
  fs.writeFileSync(path.join(prefixe, 'opmsg.conf'), conf);
  const acces = accesActif
    ? 'log_format toutvoit \'$remote_addr "$request" $status nom="$http_x_opm_nom" cookie="$http_cookie"\';\n  access_log ' + prefixe + '/logs/acces.log toutvoit;\n'
    : 'access_log off;\n';
  fs.writeFileSync(path.join(prefixe, 'nginx.conf'), 'daemon off;\nuser root;\npid ' + prefixe + '/nginx.pid;\nerror_log ' + prefixe + '/logs/erreur.log;\nevents { worker_connections 1024; }\nhttp {\n  ' + acces
    + '  set_real_ip_from 127.0.0.1;\n  real_ip_header X-Real-IP;\n'
    + '  client_body_temp_path ' + prefixe + '/tmp/c; proxy_temp_path ' + prefixe + '/tmp/p; fastcgi_temp_path ' + prefixe + '/tmp/f; uwsgi_temp_path ' + prefixe + '/tmp/u; scgi_temp_path ' + prefixe + '/tmp/s;\n  include ' + prefixe + '/opmsg.conf;\n}\n');
  return prefixe;
}
const tester = (prefixe) => spawnSync(NGINX, ['-t', '-p', prefixe, '-c', prefixe + '/nginx.conf'], { encoding: 'utf8' });
function lancer(prefixe) { const p = spawn(NGINX, ['-p', prefixe, '-c', prefixe + '/nginx.conf'], { stdio: 'ignore' }); return () => { try { p.kill('SIGTERM'); } catch (e) { /* déjà arrêté */ } }; }
const lire = (prefixe, fichier) => { try { return fs.readFileSync(path.join(prefixe, 'logs', fichier), 'utf8'); } catch (e) { return ''; } };
/* ⛔ LES FICHIERS TEMPORAIRES DE NGINX SONT ANONYMES : il les supprime à l'instant où il les ouvre (`ngx_open_tempfile`, sans « persistent »), donc aucun `readdir` ne les voit — seul le journal d'erreurs, au niveau
   « warn », dit « an upstream response is buffered to a temporary file ». On les compte par les DESCRIPTEURS OUVERTS des processus de nginx (le maître et ses ouvriers) qui pointent sous notre dossier temporaire. */
function octetsTemporaires(prefixe) {
  let maitre; try { maitre = parseInt(fs.readFileSync(path.join(prefixe, 'nginx.pid'), 'utf8'), 10); } catch (e) { return -1; }
  const pids = [maitre];
  for (const d of fs.readdirSync('/proc')) {
    if (!/^\d+$/.test(d)) continue;
    try { if (new RegExp('^PPid:\\s+' + maitre + '$', 'm').test(fs.readFileSync('/proc/' + d + '/status', 'utf8'))) pids.push(Number(d)); } catch (e) { /* le processus a disparu */ }
  }
  let n = 0;
  for (const pid of pids) {
    let fds; try { fds = fs.readdirSync('/proc/' + pid + '/fd'); } catch (e) { continue; }
    for (const fd of fds) {
      try { if (fs.readlinkSync('/proc/' + pid + '/fd/' + fd).startsWith(path.join(prefixe, 'tmp') + '/')) n += fs.statSync('/proc/' + pid + '/fd/' + fd).size; } catch (e) { /* le descripteur a disparu */ }
    }
  }
  return n;
}

/* un POST binaire vers nginx, avec le cookie de la personne ; rend le code, le type et le début du corps */
function poster(port, chemin, corps, cookie, origine, type, entetes) {
  return new Promise((ok) => {
    const req = http.request({ host: '127.0.0.1', port, path: chemin, method: 'POST', headers: Object.assign({ 'Content-Type': type || 'application/octet-stream', 'Content-Length': corps.length, 'X-OPM': '1', Origin: origine, Cookie: cookie }, entetes || {}) }, (res) => {
      let d = ''; res.on('data', (c) => { if (d.length < 300) d += c; }); res.on('end', () => ok({ code: res.statusCode, corps: d, type: res.headers['content-type'] || '' }));
    });
    req.on('error', (e) => ok({ code: 0, corps: String(e && e.code || e), type: '' }));
    req.end(corps);
  });
}
/* un GET, depuis une adresse SIMULÉE (X-Real-IP) ; rend le code et les en-têtes */
function obtenir(port, chemin, adresse, entetes) {
  return new Promise((ok) => {
    const req = http.get({ host: '127.0.0.1', port, path: chemin, agent: false, headers: Object.assign({ 'X-Real-IP': adresse }, entetes || {}) }, (res) => { res.resume(); res.on('end', () => ok({ code: res.statusCode, h: res.headers })); });
    req.on('error', () => ok({ code: 0, h: {} }));
  });
}
/* une connexion brute qui TIENT : les en-têtes d'un dépôt de `taille` octets venant de `adresse`, quelques octets de corps, puis plus rien. Rend { sock, reponse() }. */
function tenir(port, adresse, cookie, origine, conv, nom) {
  const sock = net.connect(port, '127.0.0.1'); let rep = '';
  sock.on('data', (d) => { rep += d; }); sock.on('error', () => {});
  sock.write('POST /api/pieces?' + new URLSearchParams({ conv, genre: 'fichier' }) + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nX-Real-IP: ' + adresse + '\r\nOrigin: ' + origine + '\r\nX-OPM: 1\r\nX-OPM-Nom: ' + (nom || 'tient.bin') + '\r\nCookie: ' + cookie + '\r\nContent-Type: application/octet-stream\r\nContent-Length: 1000000\r\n\r\n');
  sock.write(Buffer.alloc(20, 1));
  return { sock, reponse: () => rep };
}
const code = (rep) => (/^HTTP\/1\.1 (\d{3})/.exec(rep) || [])[1] || null;

(async () => {
  const conf = rendre();
  const blocPieces = (/location = \/api\/pieces \{([^}]*)\}/.exec(conf) || [, ''])[1];
  vrai('population : la configuration rendue porte le bloc des pièces, à 26 Mo, avec son plafond de débit et ses plafonds d\'envois simultanés', /client_max_body_size 26m;/.test(blocPieces) && /limit_req zone=opmsg_beta/.test(blocPieces) && /limit_conn opmsg_conn_beta/.test(blocPieces) && /limit_conn opmsg_depots_beta/.test(blocPieces));
  const nets = enClair(conf, await T.portLibre(), await T.portLibre());
  const lecture = ecrireConf('lecture', nets);
  const t = tester(lecture);
  v('⛔ un VRAI nginx lit la configuration rendue par l\'installeur : `nginx -t` réussit', [t.status, /test is successful/.test(t.stderr)], [0, true]);
  const fautive = ecrireConf('fautive', nets.replace('limit_conn opmsg_conn_beta 12;', 'limit_conn zone_inconnue 12;'));
  const tf = tester(fautive);
  v('⛔ …et le même nginx REFUSE une configuration fautive (une zone inconnue) : la lecture ci-dessus comptait', [tf.status !== 0, /zone_inconnue/.test(tf.stderr)], [true, true]);

  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Banc', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: { quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });          // réglages par défaut : fichier 25 Mo, photo 12 Mo
  const arrets = [];
  /* monte un nginx d'essai devant le vrai service et rend son port, son préfixe et son arrêt */
  const monter = async (nom, texte, opts) => {
    const port = await T.portLibre(), prefixe = ecrireConf(nom, ((opts && opts.apres) || ((x) => x))(enClair(texte, port, svc.port)), opts);
    const arret = lancer(prefixe); arrets.push(arret);
    await T.attendre(async () => { try { return (await fetch('http://127.0.0.1:' + port + '/health')).status === 200; } catch (e) { return false; } }, 8000, 100);
    return { port, prefixe, arret };
  };
  try {
    const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234');
    const conv = (await A.post('/api/conversations/groupe', { nom: 'Proxy', membres: [] })).j.conversation.id, cookie = A.enteteCookie();
    /* ⛔ le nom du fichier voyage dans un EN-TÊTE, jamais dans l'adresse (B2) */
    const q = () => '/api/pieces?' + new URLSearchParams({ conv, genre: 'fichier' }).toString();
    const fichier = (mo) => Buffer.alloc(Math.round(mo * Mo), 7);
    const html = (r) => /text\/html/.test(r.type);
    const nom = (n) => ({ 'X-OPM-Nom': encodeURIComponent(n) });

    /* ═══ 1. LES TAILLES ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
    const pn = await T.portLibre(), pa = await T.portLibre();
    /* l'ancienne configuration = la neuve privée de son bloc des pièces : ce que le VPS porte tant que `install-msg.sh` n'est pas rejoué */
    const sansBloc = (texte, motif) => texte.replace(new RegExp('\\n(?:[ \\t]*#[^\\n]*\\n)*[ \\t]*' + motif + ' \\{[^}]*\\}\\n'), '\n');
    const sansPieces = sansBloc(sansBloc(conf, 'location = \\/api\\/pieces'), 'location \\^~ \\/api\\/pieces\\/');
    vrai('population : l\'ancienne configuration est bien la neuve SANS ses deux blocs des pièces (le dépôt ET la lecture : nginx redirige « /api/pieces » vers « /api/pieces/ » dès qu\'il ne reste que le second)', sansPieces !== conf && !/location = \/api\/pieces \{/.test(sansPieces) && !/location \^~ \/api\/pieces\//.test(sansPieces));
    arrets.push(lancer(ecrireConf('neuve', enClair(conf, pn, svc.port))), lancer(ecrireConf('ancienne', enClair(sansPieces, pa, svc.port))));
    for (const p of [pn, pa]) await T.attendre(async () => { try { return (await fetch('http://127.0.0.1:' + p + '/health')).status === 200; } catch (e) { return false; } }, 8000, 100);

    console.log('\nLa configuration NEUVE : 26 Mo sur la route des pièces, 64 Ko partout ailleurs');
    v('⛔ un fichier de 1,5 Mo traverse nginx ET le service : 201', (await poster(pn, q(), fichier(1.5), cookie, svc.base, null, nom('un.bin'))).code, 201);
    v('⛔ 20 Mo : 201', (await poster(pn, q(), fichier(20), cookie, svc.base, null, nom('vingt.bin'))).code, 201);
    v('⛔ 24,9 Mo (juste sous le maximum du service, 25 Mo) : 201', (await poster(pn, q(), fichier(24.9), cookie, svc.base, null, nom('presque.bin'))).code, 201);
    const n4 = await poster(pn, q(), fichier(27), cookie, svc.base, null, nom('trop.bin'));
    v('⛔ 27 Mo : 413 rendu par NGINX, en HTML — avant que le service voie le corps', [n4.code, html(n4)], [413, true]);
    const n5 = await poster(pn, q(), fichier(25.5), cookie, svc.base, null, nom('limite.bin'));
    v('⛔ 25,5 Mo : passe le proxy (26 Mo) et c\'est le SERVICE qui refuse, en JSON, avec son maximum', [n5.code, html(n5), JSON.parse(n5.corps).error, JSON.parse(n5.corps).max], [413, false, 'piece_trop_lourde', 25 * Mo]);
    v('⛔ les 64 Ko restent la règle partout ailleurs : un JSON de 70 Ko sur la route des messages : 413', (await poster(pn, '/api/conversations/' + conv + '/messages', Buffer.from(JSON.stringify({ cid: 'cid-gros', texte: 'x'.repeat(70000) })), cookie, svc.base, 'application/json')).code, 413);

    console.log('\nL\'ANCIENNE configuration (64 Ko partout) : ce que le VPS refuse tant que le geste n\'est pas fait');
    v('population : un petit fichier (30 Ko) passe encore', (await poster(pa, q(), fichier(0.03), cookie, svc.base, null, nom('petit.bin'))).code, 201);
    const a2 = await poster(pa, q(), fichier(1.5), cookie, svc.base, null, nom('un.bin'));
    v('⛔ 1,5 Mo : 413 rendu par NGINX, en HTML (la page le lit « trop lourd »)', [a2.code, html(a2)], [413, true]);
    v('⛔ 20 Mo : 413 aussi', (await poster(pa, q(), fichier(20), cookie, svc.base, null, nom('vingt.bin'))).code, 413);

    /* ═══ 2. LE JOURNAL D'ACCÈS ET LE JOURNAL D'ERREURS (B2) ═════════════════════════════════════════════════════════════════ */
    console.log('\nLe journal d\'accès : un journal ACTIF qui écrit tout, des canaris dans le nom, la conversation, la pièce — et nos blocs n\'écrivent RIEN');
    const CAN = { nom: 'ZXCANARIQNOMFICHIER', url: 'ZXCANARIQURL', ip: '198.51.100.77' };
    /* la même série de gestes, jouée contre une configuration donnée ; rend les identifiants et les codes vus par le CLIENT */
    const serie = async (cible) => {
      const d = await poster(cible.port, q() + '&x=' + CAN.url, Buffer.alloc(3000, 9), cookie, svc.base, null, Object.assign(nom(CAN.nom + '.pdf'), { 'X-Real-IP': CAN.ip }));
      const id = d.corps && /"id":"(f_[0-9a-f]{32})"/.exec(d.corps) ? /"id":"(f_[0-9a-f]{32})"/.exec(d.corps)[1] : null;
      const l = id ? await obtenir(cible.port, '/api/pieces/' + id + '?y=' + CAN.url, CAN.ip, { Cookie: cookie }) : { code: 0 };
      const m = await obtenir(cible.port, '/api/conversations/' + conv + '/messages', CAN.ip, { Cookie: cookie });
      return { depot: d.code, lecture: l.code, messages: m.code, id };
    };
    const priv = await monter('acces-neuf', conf, { accesActif: true });
    const s1 = await serie(priv);
    await T.dort(300);
    const acc1 = lire(priv.prefixe, 'acces.log');
    v('population : les gestes ont vraiment traversé nginx jusqu\'au service (dépôt 201, lecture 200, messages 200)', [s1.depot, s1.lecture, s1.messages], [201, 200, 200]);
    v('⛔ le journal d\'accès est ACTIF au niveau http, et nos blocs le font taire : il est VIDE (' + acc1.length + ' octet)', acc1, '');
    const sansAcces = conf.replace(/^\s*access_log off;\n/gm, '');
    vrai('population : la contre-épreuve retire bien les deux lignes « access_log off » de nos blocs', (conf.match(/access_log off;/g) || []).length === 2 && !/access_log/.test(sansAcces));
    const bavard = await monter('acces-ancien', sansAcces, { accesActif: true });
    const s2 = await serie(bavard);
    await T.dort(300);
    const acc2 = lire(bavard.prefixe, 'acces.log');
    v('⛔ contre-épreuve : SANS « access_log off » le même journal écrit le nom du fichier, l\'identifiant de la pièce, celui de la conversation, l\'adresse et le cookie', [acc2.includes(CAN.nom), s2.id ? acc2.includes(s2.id) : null, acc2.includes(conv), acc2.includes(CAN.ip), acc2.includes(CAN.url), /cookie="[^"]*opm/.test(acc2)], [true, true, true, true, true, true]);

    console.log('\nLe journal d\'erreurs : un refus de débit n\'y laisse ni adresse ni requête');
    const inonder = async (cible, n, adresse) => { let refus = 0; for (let k = 0; k < n; k++) if ((await obtenir(cible.port, '/health', adresse)).code === 429) refus++; return refus; };
    const r429 = await inonder(priv, 120, '203.0.113.9');
    await T.dort(200);
    const erreurs1 = lire(priv.prefixe, 'erreur.log');
    vrai('population : le plafond de débit a bien refusé (' + r429 + ' fois sur 120, depuis une seule adresse)', r429 >= 30);
    vrai('⛔ …et le journal d\'erreurs de nginx n\'a gardé AUCUNE de ces lignes (« limiting requests… client: … request: … ») — ni l\'adresse, ni la requête', !/limiting requests|203\.0\.113\.9/.test(erreurs1));
    const sansNiveau = conf.replace(/^\s*limit_(req|conn)_log_level warn;\n/gm, '');
    vrai('population : la contre-épreuve retire bien les quatre lignes de niveau', (conf.match(/limit_(req|conn)_log_level warn;/g) || []).length === 4 && !/_log_level/.test(sansNiveau));
    const bruyant = await monter('erreurs-ancien', sansNiveau);
    await inonder(bruyant, 120, '203.0.113.10');
    await T.dort(200);
    const erreurs2 = lire(bruyant.prefixe, 'erreur.log');
    vrai('⛔ contre-épreuve : SANS ces lignes le journal d\'erreurs écrit « limiting requests » avec l\'adresse du client et la requête', /limiting requests/.test(erreurs2) && /203\.0\.113\.10/.test(erreurs2) && /request: "GET \/health/.test(erreurs2));
    priv.arret(); bavard.arret(); bruyant.arret();

    /* ═══ 3. LA CLÉ DES PLAFONDS : LE RÉSEAU (A3) ═══════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa clé des plafonds est le RÉSEAU : l\'IPv4 entière, le /64 d\'une IPv6 — la table lue par un vrai nginx');
    const montrer = (texte) => texte.replace(/location \/ \{/, 'location / {\n        add_header X-Reseau $opmsg_reseau_beta always;');   // sur le bloc 443 seulement : l'autre est écarté par `enClair`
    const cle = await monter('cle', conf, { apres: montrer });
    const reseau = async (adresse) => (await obtenir(cle.port, '/health', adresse)).h['x-reseau'] || null;
    const table = [
      ['192.0.2.7', '192.0.2.7', 'une IPv4 est gardée entière'],
      ['2001:db8:1:2:3:4:5:6', '2001:db8:1:2', 'une IPv6 : ses quatre premiers groupes'],
      ['2001:db8:1:2:ffff:ffff:ffff:ffff', '2001:db8:1:2', 'une AUTRE adresse du même /64 : la même clé'],
      ['2001:db8:1:2::9', '2001:db8:1:2', '« :: » après quatre groupes'],
      ['2001:db8:1:3:3:4:5:6', '2001:db8:1:3', 'un /64 voisin : une autre clé'],
      ['2001:db8:1::5:6', '2001:db8:1:0', '« :: » après trois groupes (le quatrième est nul)'],
      ['2001:db8:1:0:aaaa:bbbb:cccc:dddd', '2001:db8:1:0', 'la même adresse écrite sans « :: » : la même clé'],
      ['2001:db8::5', '2001:db8:0:0', '« :: » après deux groupes'],
      ['2001:db8:0:0:1:2:3:4', '2001:db8:0:0', 'la même adresse écrite sans « :: » : la même clé'],
      ['::1', '::1', 'la boucle locale garde son adresse'],
    ];
    const vus = []; for (const [a] of table) vus.push(await reseau(a));
    vrai('population : la table est lue sur ' + table.length + ' adresses simulées (X-Real-IP)', vus.every(x => x !== null));
    for (let i = 0; i < table.length; i++) v('⛔ ' + table[i][0] + ' → ' + table[i][1] + ' (' + table[i][2] + ')', vus[i], table[i][1]);
    cle.arret();

    console.log('\nCent cinquante adresses d\'un MÊME /64 partagent le plafond de débit — avec l\'ancienne clé, aucune n\'est refusée');
    const flot = async (cible, adresses) => { let refus = 0; for (const a of adresses) if ((await obtenir(cible.port, '/health', a)).code === 429) refus++; return refus; };
    const memeReseau = Array.from({ length: 150 }, (_, i) => '2001:db8:9:9:' + (i + 1).toString(16) + ':0:0:1');
    const autresReseaux = Array.from({ length: 150 }, (_, i) => '198.51.100.' + (i + 1));
    const neufD = await monter('debit-neuf', conf);
    const refusMeme = await flot(neufD, memeReseau);
    const refusIpv4 = await flot(neufD, autresReseaux);
    v('⛔ 150 adresses d\'un même /64 en moins d\'une seconde : le plafond (60 de rafale) en refuse plus de 50', refusMeme >= 50, true);
    v('⛔ contre-épreuve : 150 adresses IPv4 DIFFÉRENTES ne se partagent rien — aucune n\'est refusée (le réseau d\'une IPv4 est elle-même)', refusIpv4, 0);
    neufD.arret();
    const ancienneCle = await monter('debit-ancien', conf.replace('limit_req_zone $opmsg_reseau_beta', 'limit_req_zone $binary_remote_addr'));
    const refusAncien = await flot(ancienneCle, Array.from({ length: 150 }, (_, i) => '2001:db8:9:9:' + (i + 200).toString(16) + ':0:0:1'));
    v('⛔ contre-épreuve : avec l\'ANCIENNE clé ($binary_remote_addr) les mêmes 150 adresses d\'un /64 ne sont JAMAIS refusées — c\'est ce que contournait un client à 2^64 adresses', refusAncien, 0);
    ancienneCle.arret();

    console.log('\nLes dépôts SIMULTANÉS : douze par réseau, vingt-quatre pour tout le monde');
    const tenus = [];
    const ouvrir = (neuf, adresse, nomf) => { const h = tenir(neuf.port, adresse, cookie, svc.base, conv, nomf); tenus.push(h); return h; };
    const patienter = async (h, ms) => { await T.attendre(async () => code(h.reponse()) !== null, ms, 50).catch(() => {}); return code(h.reponse()); };
    const dep = await monter('depots', conf);
    for (let i = 1; i <= 12; i++) ouvrir(dep, '2001:db8:7:7:' + i.toString(16) + ':0:0:1');
    await T.dort(400);
    const treizieme = ouvrir(dep, '2001:db8:7:7:ff:0:0:1');
    v('⛔ douze dépôts en cours depuis douze adresses d\'un même /64 : le TREIZIÈME (une treizième adresse du même /64) reçoit 429 tout de suite — nginx, avant tout octet de corps', await patienter(treizieme, 1500), '429');
    const autreReseau = ouvrir(dep, '2001:db8:8:8:1:0:0:1');
    v('…alors qu\'un dépôt venu d\'un AUTRE /64 est accepté (nginx attend son corps : pas de réponse)', await patienter(autreReseau, 700), null);
    for (const h of tenus.splice(0)) h.sock.destroy();
    await T.dort(500);
    for (let i = 1; i <= 23; i++) ouvrir(dep, '198.51.100.' + i);              // vingt-trois réseaux IPv4, un dépôt chacun, + l'autre /64 ci-dessus fermé : 23 en cours
    ouvrir(dep, '198.51.100.100');                                              // le vingt-quatrième
    await T.dort(500);
    const vingtCinq = ouvrir(dep, '198.51.100.101');
    v('⛔ vingt-quatre dépôts en cours depuis vingt-quatre RÉSEAUX différents (aucun n\'atteint le plafond par réseau) : le VINGT-CINQUIÈME reçoit 429 — le plafond global protège le disque de nginx', await patienter(vingtCinq, 1500), '429');
    const premiers = tenus.slice(0, 24).filter(h => code(h.reponse()) === null).length;
    vrai('population : les vingt-quatre premiers tiennent (aucune réponse) — c\'est bien le global qui a refusé', premiers === 24);
    for (const h of tenus.splice(0)) h.sock.destroy();
    dep.arret();
    const sansGlobal = await monter('depots-sans-global', conf.replace(/^\s*limit_conn opmsg_depots_beta \d+;\n/m, ''));
    for (let i = 1; i <= 24; i++) ouvrir(sansGlobal, '198.51.100.' + i);
    await T.dort(500);
    const vingtCinqBis = ouvrir(sansGlobal, '198.51.100.101');
    v('⛔ contre-épreuve : SANS le plafond global, le vingt-cinquième est accepté (il attend son corps) — chaque réseau reste sous ses douze', await patienter(vingtCinqBis, 700), null);
    for (const h of tenus.splice(0)) h.sock.destroy();
    sansGlobal.arret();

    /* ═══ 4. LA LECTURE SANS TAMPON (A2) ═══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn client qui ne lit plus un fichier de 25 Mo ne fait écrire AUCUN fichier temporaire à nginx');
    const lecture1 = await monter('lecture-neuf', conf);
    const dep25 = await poster(lecture1.port, q(), fichier(24.9), cookie, svc.base, null, nom('gros.bin'));
    const id25 = /"id":"(f_[0-9a-f]{32})"/.exec(dep25.corps || '') && /"id":"(f_[0-9a-f]{32})"/.exec(dep25.corps)[1];
    vrai('population : le fichier de 24,9 Mo est déposé (' + dep25.code + ')', dep25.code === 201 && !!id25);
    const gele = (cible) => { const s = net.connect(cible.port, '127.0.0.1'); s.on('error', () => {}); s.write('GET /api/pieces/' + id25 + ' HTTP/1.1\r\nHost: 127.0.0.1\r\nCookie: ' + cookie + '\r\nConnection: close\r\n\r\n'); return s; };
    /* la population : une lecture ORDINAIRE du même fichier, par le même nginx, rend les 24,9 Mo — sinon « aucun fichier temporaire » ne prouverait rien (une réponse vide n'en écrit pas) */
    const entiere = async (cible) => { const r = await fetch('http://127.0.0.1:' + cible.port + '/api/pieces/' + id25, { headers: { Cookie: cookie } }); const b = Buffer.from(await r.arrayBuffer()); return [r.status, b.length]; };
    v('population : une lecture ordinaire par le nginx de la configuration neuve rend le fichier entier (200, 24,9 Mo)', await entiere(lecture1), [200, Math.round(24.9 * Mo)]);
    const g1 = gele(lecture1);
    await T.dort(1500);
    const tmp1 = octetsTemporaires(lecture1.prefixe);
    v('⛔ un lecteur gelé sur la route de la lecture (sans tampon) : nginx n\'a écrit AUCUN octet de fichier temporaire (' + tmp1 + ')', tmp1, 0);
    g1.destroy(); lecture1.arret();
    const sansLecture = sansBloc(conf, 'location \\^~ \\/api\\/pieces\\/');
    vrai('population : la contre-épreuve retire bien le bloc de la lecture', sansLecture !== conf && !/location \^~/.test(sansLecture));
    const lecture2 = await monter('lecture-ancien', sansLecture);
    v('population : …et par celui de la configuration SANS ce bloc', await entiere(lecture2), [200, Math.round(24.9 * Mo)]);
    const g2 = gele(lecture2);
    await T.dort(1500);
    const tmp2 = octetsTemporaires(lecture2.prefixe);
    vrai('⛔ contre-épreuve : SANS le bloc de la lecture (la route générale tamponne), le même lecteur gelé fait écrire ' + Math.round(tmp2 / Mo) + ' Mo de fichier temporaire à nginx', tmp2 > 5 * Mo);
    g2.destroy(); lecture2.arret();
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  for (const a of arrets) a();
  await svc.arreter(); await og.fermer();
  fs.rmSync(brouillon, { recursive: true, force: true });
  fin();
})();
