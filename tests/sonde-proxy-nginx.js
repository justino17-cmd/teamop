/* ⛔ CE QUE CETTE SONDE GARDE — LE PROXY LAISSE PASSER LES PIÈCES, ET ELLES SEULES (le seul endroit où un VRAI nginx lit la configuration d'`install-msg.sh`).

   Ce fichier n'est PAS une suite : il lui faut un binaire nginx, que ni la CI ni la machine de travail n'installent. `test-931` exécute l'installeur dans un bac et relit le TEXTE de la
   configuration qu'il écrit — il ne peut pas dire qu'un vrai nginx l'accepte, ni quelles tailles il laisse passer. Or c'est le proxy, pas le service, qui refusait tout dépôt de plus de
   64 Ko : un 413 rendu par nginx, en HTML, avant que le service voie le corps (la page le lit « trop lourd »). Le correctif de l'étape 4 est un bloc `location = /api/pieces`
   à 26 Mo — et il ne part PAS avec le déploiement de la CI (`deployer.sh` n'écrit jamais dans nginx) : il faut rejouer `install-msg.sh` sur le VPS (SERVEUR.md § 4.4).

   Ce que la sonde fait : le VRAI `install-msg.sh` écrit sa configuration dans le bac de `test-931` ; un VRAI nginx la lit (`nginx -t`), puis se met devant le VRAI service
   (127.0.0.1 seulement, le bloc 443 rendu en clair sur un port local) ; on y dépose des fichiers de 1,5 / 20 / 24,9 / 25,5 / 27 Mo et un JSON de 70 Ko. Puis la MÊME configuration
   privée de son bloc des pièces — ce que porte le VPS tant que le geste n'est pas fait — doit refuser tout ce qui dépasse 64 Ko : sans cette contre-épreuve, « tout passe »
   pourrait venir d'un proxy qui ne limite rien.
   Elle exige aussi qu'un nginx qui lit une configuration FAUTIVE la refuse (sans cela, « nginx -t : code 0 » ne prouverait pas que le fichier a été lu).

   Obtenir un binaire sans rien installer (Ubuntu 24.04, la série du VPS) :
       apt-get download nginx && dpkg -x nginx_*.deb /chemin/extrait        puis  OPMSG_NGINX=/chemin/extrait/usr/sbin/nginx
   Lancer :   OPMSG_NGINX=/chemin/nginx node tests/sonde-proxy-nginx.js        (sans binaire : elle le dit et sort en 0, rien n'est vérifié)

   Deux limites de CETTE machine, pas de la configuration, contournées sur la copie lue : pas d'IPv6 (`listen [::]:…` est retiré — `nginx -t` essaie de lier la socket) et un
   nginx lancé en root qui écrit ses tampons de corps sous un autre utilisateur (`user root;`). Mesurée le 2 octobre 2026 avec nginx 1.24.0 (Ubuntu) : 13 ✓ 0 ✗ (et `mutations-pieces.js P47`, qui ramène le bloc à 1 Mo, la fait tomber). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
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
function ecrireConf(nom, conf) {
  const prefixe = path.join(brouillon, nom);
  for (const d of ['logs', 'tmp']) fs.mkdirSync(path.join(prefixe, d), { recursive: true });
  fs.writeFileSync(path.join(prefixe, 'opmsg.conf'), conf);
  fs.writeFileSync(path.join(prefixe, 'nginx.conf'), 'daemon off;\nuser root;\npid ' + prefixe + '/nginx.pid;\nerror_log ' + prefixe + '/logs/erreur.log;\nevents { worker_connections 64; }\nhttp {\n  access_log off;\n  client_body_temp_path ' + prefixe + '/tmp/c; proxy_temp_path ' + prefixe + '/tmp/p; fastcgi_temp_path ' + prefixe + '/tmp/f; uwsgi_temp_path ' + prefixe + '/tmp/u; scgi_temp_path ' + prefixe + '/tmp/s;\n  include ' + prefixe + '/opmsg.conf;\n}\n');
  return prefixe;
}
const tester = (prefixe) => spawnSync(NGINX, ['-t', '-p', prefixe, '-c', prefixe + '/nginx.conf'], { encoding: 'utf8' });
function lancer(prefixe) { const p = spawn(NGINX, ['-p', prefixe, '-c', prefixe + '/nginx.conf'], { stdio: 'ignore' }); return () => { try { p.kill('SIGTERM'); } catch (e) { /* déjà arrêté */ } }; }

/* un POST binaire vers nginx, avec le cookie de la personne ; rend le code, le type et le début du corps */
function poster(port, chemin, corps, cookie, origine, type) {
  return new Promise((ok) => {
    const req = http.request({ host: '127.0.0.1', port, path: chemin, method: 'POST', headers: { 'Content-Type': type || 'application/octet-stream', 'Content-Length': corps.length, 'X-OPM': '1', Origin: origine, Cookie: cookie } }, (res) => {
      let d = ''; res.on('data', (c) => { if (d.length < 300) d += c; }); res.on('end', () => ok({ code: res.statusCode, corps: d, type: res.headers['content-type'] || '' }));
    });
    req.on('error', (e) => ok({ code: 0, corps: String(e && e.code || e), type: '' }));
    req.end(corps);
  });
}

(async () => {
  const conf = rendre();
  const blocPieces = (/location = \/api\/pieces \{([^}]*)\}/.exec(conf) || [, ''])[1];
  vrai('population : la configuration rendue porte le bloc des pièces, à 26 Mo, avec son plafond de débit et d\'envois simultanés', /client_max_body_size 26m;/.test(blocPieces) && /limit_req zone=opmsg_beta/.test(blocPieces) && /limit_conn opmsg_conn_beta 12;/.test(blocPieces));
  const nets = enClair(conf, await T.portLibre(), await T.portLibre());
  const lecture = ecrireConf('lecture', nets);
  const t = tester(lecture);
  v('⛔ un VRAI nginx lit la configuration rendue par l\'installeur : `nginx -t` réussit', [t.status, /test is successful/.test(t.stderr)], [0, true]);
  const fautive = ecrireConf('fautive', nets.replace('limit_conn opmsg_conn_beta 12;', 'limit_conn zone_inconnue 12;'));
  const tf = tester(fautive);
  v('⛔ …et le même nginx REFUSE une configuration fautive (une zone inconnue) : la lecture ci-dessus comptait', [tf.status !== 0, /zone_inconnue/.test(tf.stderr)], [true, true]);

  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice Banc', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, config: {} });          // réglages par défaut : fichier 25 Mo, photo 12 Mo
  const arrets = [];
  try {
    const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234');
    const conv = (await A.post('/api/conversations/groupe', { nom: 'Proxy', membres: [] })).j.conversation.id, cookie = A.enteteCookie();
    const pn = await T.portLibre(), pa = await T.portLibre();
    /* l'ancienne configuration = la neuve privée de son bloc des pièces : ce que le VPS porte tant que `install-msg.sh` n'est pas rejoué */
    const sansPieces = conf.replace(/\n\s*#[^\n]*\n(?=\s*location = \/api\/pieces \{)/g, '\n').replace(/location = \/api\/pieces \{[^}]*\}\n/, '');
    vrai('population : l\'ancienne configuration est bien la neuve SANS son bloc des pièces', sansPieces !== conf && !/location = \/api\/pieces/.test(sansPieces));
    arrets.push(lancer(ecrireConf('neuve', enClair(conf, pn, svc.port))), lancer(ecrireConf('ancienne', enClair(sansPieces, pa, svc.port))));
    for (const p of [pn, pa]) await T.attendre(async () => { try { return (await fetch('http://127.0.0.1:' + p + '/health')).status === 200; } catch (e) { return false; } }, 8000, 100);
    const q = (nom) => '/api/pieces?' + new URLSearchParams({ conv, genre: 'fichier', nom }).toString();
    const fichier = (mo) => Buffer.alloc(Math.round(mo * Mo), 7);
    const html = (r) => /text\/html/.test(r.type);

    console.log('\nLa configuration NEUVE : 26 Mo sur la route des pièces, 64 Ko partout ailleurs');
    v('⛔ un fichier de 1,5 Mo traverse nginx ET le service : 201', (await poster(pn, q('un.bin'), fichier(1.5), cookie, svc.base)).code, 201);
    v('⛔ 20 Mo : 201', (await poster(pn, q('vingt.bin'), fichier(20), cookie, svc.base)).code, 201);
    v('⛔ 24,9 Mo (juste sous le maximum du service, 25 Mo) : 201', (await poster(pn, q('presque.bin'), fichier(24.9), cookie, svc.base)).code, 201);
    const n4 = await poster(pn, q('trop.bin'), fichier(27), cookie, svc.base);
    v('⛔ 27 Mo : 413 rendu par NGINX, en HTML — avant que le service voie le corps', [n4.code, html(n4)], [413, true]);
    const n5 = await poster(pn, q('limite.bin'), fichier(25.5), cookie, svc.base);
    v('⛔ 25,5 Mo : passe le proxy (26 Mo) et c\'est le SERVICE qui refuse, en JSON, avec son maximum', [n5.code, html(n5), JSON.parse(n5.corps).error, JSON.parse(n5.corps).max], [413, false, 'piece_trop_lourde', 25 * Mo]);
    v('⛔ les 64 Ko restent la règle partout ailleurs : un JSON de 70 Ko sur la route des messages : 413', (await poster(pn, '/api/conversations/' + conv + '/messages', Buffer.from(JSON.stringify({ cid: 'cid-gros', texte: 'x'.repeat(70000) })), cookie, svc.base, 'application/json')).code, 413);

    console.log('\nL\'ANCIENNE configuration (64 Ko partout) : ce que le VPS refuse tant que le geste n\'est pas fait');
    v('population : un petit fichier (30 Ko) passe encore', (await poster(pa, q('petit.bin'), fichier(0.03), cookie, svc.base)).code, 201);
    const a2 = await poster(pa, q('un.bin'), fichier(1.5), cookie, svc.base);
    v('⛔ 1,5 Mo : 413 rendu par NGINX, en HTML (la page le lit « trop lourd »)', [a2.code, html(a2)], [413, true]);
    v('⛔ 20 Mo : 413 aussi', (await poster(pa, q('vingt.bin'), fichier(20), cookie, svc.base)).code, 413);
  } catch (e) { console.log('  ✗ la sonde est morte : ' + (e && e.stack || e)); process.exitCode = 1; }
  for (const a of arrets) a();
  await svc.arreter(); await og.fermer();
  fs.rmSync(brouillon, { recursive: true, force: true });
  fin();
})();
