/* ⛔ CE QUE CE FICHIER GARDE — QUE `install-turn.sh` POSE UN RELAIS QUI FAIT CE QU'IL DOIT, SANS JAMAIS AFFICHER NI FAIRE FUIR LE SECRET, ET QU'IL ÉCHOUE FERMÉ.

   `server-msg/install-turn.sh` (le geste de Justin sur le VPS) est JOUÉ ici de bout en bout dans un bac à sable : une racine factice (`OPMSG_RACINE`), un PATH réduit à
   quelques outils réels (aucun `turnserver`, `nginx`, `ufw`, `certbot` du système de la machine : ce banc est le même ici et sur le runner de la CI) et de FAUX binaires —
   `apt-get`, `systemctl`, `certbot`, `nginx`, `ufw`, `chown`, `sleep` — qui NOTENT chaque appel (arguments ET environnement) et simulent juste ce qu'il faut. Un petit serveur
   HTTP du banc joue le `/health` de l'instance : il répond « j'ai un relais » à partir de la configuration que l'instance a LUE à son dernier « redémarrage » (celui du faux
   `systemctl`), pas de celle qui est sur le disque — c'est ce qui prouve que le script relance l'instance quand il le faut.

   Ce qu'on prouve, et pourquoi chaque ligne existe :
     1. ⛔ LE SECRET : tiré au hasard (un autre à chaque installation neuve), ÉCRIT dans les deux configurations (celle de l'instance, 0600 ; celle de coturn, 0640) — et ABSENT de
        la sortie du script, de chaque argument et de l'environnement de chaque binaire qu'il a lancé (les faux notent les deux). Le même, REPRIS, à la seconde exécution.
     2. ⛔ LA CONFIGURATION DE COTURN, ligne à ligne. Mesuré sur coturn 4.6.1 (voir l'en-tête du script) : un réglage inconnu, une plage illisible ou une valeur absurde ne l'empêchent
        PAS de démarrer ; la notation CIDR est ignorée EN SILENCE ; une plage IPv6 qui commence à « :: » avale les adresses IPv4. Donc : chaque nom d'option est un nom que coturn 4.6.1
        connaît, aucune plage n'a de « / », chaque plage est dans le bon ordre, aucune plage IPv6 ne commence à « :: », et CHAQUE réseau que le relais ne doit jamais atteindre
        (127/8, 10/8, 172.16/12, 192.168/16, 169.254/16, 100.64/10, 0/8, ::1, fc00::/7, fe80::/10, ::ffff:0:0/96, 64:ff9b::/96) est recouvert — calculé ICI, en BigInt, sans relire
        la liste du script. (L'EFFET, lui, est éprouvé contre un VRAI coturn par `tests/sonde-opmessages-relais.js`.)
     3. ⛔ ÉCHEC = FERMÉ : si coturn ne démarre pas, ou si le contrôle du relais échoue, coturn est ARRÊTÉ, la configuration de l'instance est remise OCTET POUR OCTET comme avant,
        le pare-feu n'est pas touché et l'instance n'est pas relancée. Et si le contrôle est ABSENT (une version d'avant les appels), pareil : on n'ouvre pas ce qu'on n'a pas éprouvé.
     4. ⛔ REJOUABLE : deux exécutions de suite donnent le même disque, et la seconde ne relance NI coturn NI l'instance, ne rappelle NI certbot NI nginx.
     5. SANS TLS quand le DNS ou nginx ne le permettent pas : le relais est posé quand même, la configuration le dit (`no-tls`, `portTls: null`), le script aussi.
     6. DEUX INSTANCES sur un relais : les deux secrets sont dans coturn, chacune garde le sien, et rejouer l'une ne retire pas l'autre.
     7. L'ORDRE : coturn démarré, PUIS le contrôle, PUIS le pare-feu, PUIS la relance de l'instance. Jamais un port ouvert avant la preuve. */
'use strict';
const fs = require('fs'), path = require('path');
const { banc, sansCommentaires, RACINE } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;

const { SCRIPT } = require('./bac-turn.js');
const { appelsConfig } = require(path.join(RACINE, 'server-msg', 'config.js'));
const lire = (p) => { try { return fs.readFileSync(p, 'utf8'); } catch (e) { return null; } };
console.log('\n── 982 · install-turn.sh, joué dans un bac à sable ──');

const { bac, reel, OPTIONS_COTURN, enBigInt, cidr, A_REFUSER, RE_SECRET, LIGNE_SECRET, secretDe, lignesConf, modeDe, index, compte, dernier } = require('./bac-turn.js');


(async () => {
  /* ═══════ 0. LE FICHIER LUI-MÊME ═══════ */
  vrai('le script existe', fs.existsSync(SCRIPT));
  {
    const code = sansCommentaires(lire(SCRIPT));
    vrai('population : le code du script n\'est pas vide une fois les commentaires retirés (sinon les motifs ci-dessous passeraient sur du néant)', code.split('\n').filter(l => l.trim()).length > 120);
    const plages = (code.match(/^\s*"[0-9a-f:.]+-[0-9a-f:.]+"/gm) || []);
    vrai('population : la liste des plages refusées du script est trouvée (' + plages.length + ' plages)', plages.length >= 15);
    v('⛔ aucune plage du script n\'est écrite en notation « /masque » (coturn 4.6.1 la prend pour un nom d\'hôte et ignore la règle, sans refuser de démarrer)', (code.match(/^\s*"[0-9a-f:.]+\/\d+"/gm) || []), []);
    vrai('⛔ le secret n\'est jamais dans un argument ni dans l\'environnement d\'une commande : le programme Node ne reçoit que des chemins, des ports et des noms', !/SECRET\s*=/.test(code.replace(/RE_SECRET\s*=/g, '')) && !/--secret|SECRET=/.test(code));
  }

  /* ═══════ 1. LA PREMIÈRE INSTALLATION (beta), TLS possible, pare-feu actif ═══════ */
  /* ═══════ ⛔ LE BAC LUI-MÊME : un port déjà pris ne le fait pas mourir ═══════
     9 octobre 2026 : 25525 était pris sur la machine de GitHub, test-959 est mort avant son total, et la porte a refusé le déploiement de la bêta — sans
     rien dire du script éprouvé. On occupe EXPRÈS le port tiré : le bac doit en tirer un autre, et tout ce qui le cite doit citer le nouveau. */
  console.log('\nLe bac : un port déjà pris');
  {
    const b = bac();
    try {
      b.instance('beta');
      const pris = b.ports.beta;
      const occupant = await new Promise((ok, ko) => { const s = require('net').createServer().once('error', ko).listen(pris, '127.0.0.1', () => ok(s)); });
      try { await b.serveur('beta'); } finally { occupant.close(); }
      v('⛔ le port tiré était pris : le bac en a tiré un autre (au moins un refus compté), et la configuration, sa copie « lue » et le .env citent le NOUVEAU', [b.ports.beta !== pris, (b.portsRetires || 0) >= 1, b.config('beta').port, JSON.parse(lire(path.join(b.E, 'config-lue-beta.json'))).port, (b.octets('etc/opmsg/beta.env') || '').trim()], [true, true, b.ports.beta, b.ports.beta, 'PORT=' + b.ports.beta]);
    } finally { b.fin(); }
  }

  console.log('\nLa première installation : coturn absent, certificat obtenu, pare-feu actif');
  {
    const b = bac();
    try {
      b.instance('beta');
      const avant = b.octets('etc/opmsg/beta.json');
      await b.serveur('beta');
      const r = await b.lancer(['beta']);
      v('le script réussit (sortie 0)', [r.status, r.err], [0, '']);
      const secret = secretDe(b, 'beta');
      vrai('⛔ un secret de 64 caractères [A-Za-z0-9_-] est dans la configuration de l\'instance (tiré par le script : l\'instance n\'en portait pas)', RE_SECRET.test(secret || '') && secret.length === 64);
      const cfg = b.config('beta');
      v('la configuration de l\'instance garde TOUT ce qu\'elle portait (le reste est intact) et gagne `appels.relais`', [Object.keys(JSON.parse(avant)).every(k => JSON.stringify(cfg[k]) === JSON.stringify(JSON.parse(avant)[k])), Object.keys(cfg.appels.relais).sort()], [true, ['hote', 'port', 'portTls', 'secret', 'ttlS']]);
      v('   hôte, ports et durée : turn.teamop.fr, 3478, 5349 (le certificat est là), quinze minutes (900 s)', [cfg.appels.relais.hote, cfg.appels.relais.port, cfg.appels.relais.portTls, cfg.appels.relais.ttlS], ['turn.teamop.fr', 3478, 5349, 900]);
      let valide = null; try { valide = appelsConfig(cfg, 'beta'); } catch (e) { valide = String(e.message); }
      vrai('⛔ la VRAIE validation du service (`appelsConfig`) accepte cette configuration : l\'instance démarrera avec', valide && typeof valide === 'object' && valide.relais && valide.relais.hote === 'turn.teamop.fr' && valide.relais.secret === secret);
      v('⛔ droits : la configuration de l\'instance est en 0600, celle de coturn en 0640 (elle porte le secret)', [modeDe(b, 'etc/opmsg/beta.json'), modeDe(b, 'etc/turnserver.conf')], ['600', '640']);
      const conf = lignesConf(b);
      const opt = conf.map(l => l.split('=')[0]);
      v('⛔ le secret de la configuration de l\'instance est celui de coturn : UNE ligne `static-auth-secret=`, la même valeur', conf.filter(l => l.startsWith(LIGNE_SECRET)), [LIGNE_SECRET + secret]);
      v('⛔ chaque nom d\'option de la configuration de coturn est un nom que coturn 4.6.1 CONNAÎT (une faute de frappe ne l\'empêcherait pas de démarrer — mesuré)', opt.filter(o => !OPTIONS_COTURN.has(o)), []);
      for (const o of ['use-auth-secret', 'no-cli', 'no-tcp-relay', 'no-multicast-peers', 'fingerprint', 'no-software-attribute', 'no-dtls', 'no-stdout-log', 'simple-log']) vrai('   réglage obligatoire présent : ' + o, opt.includes(o));
      const val = (k) => (conf.find(l => l.startsWith(k + '=')) || '').slice(k.length + 1);
      v('   les ports : écoute 3478, TLS 5349, relais UDP 49160-49999', [val('listening-port'), val('tls-listening-port'), val('min-port'), val('max-port')], ['3478', '5349', '49160', '49999']);
      v('   les plafonds sont posés (par identifiant, au total, débit par session, débit global) — des NOMBRES positifs', ['user-quota', 'total-quota', 'max-bps', 'bps-capacity'].map(k => /^[1-9][0-9]*$/.test(val(k))), [true, true, true, true]);
      /* ⛔ LA CAPACITÉ EST UN CHOIX ÉCRIT (relecture, I1) : huit appels relayés à la fois. Un appel relayé = deux personnes × DEUX adresses de relais (le service en donne deux : test-981) = 4 allocations ; coturn réserve `max-bps` par
         allocation, donc la capacité RÉELLE est `bps-capacity` ÷ `max-bps` (mesuré : 60 comptes × 8 allocations n'en tenaient que 25) — et `total-quota` dit le MÊME nombre, sinon le plus bas des deux décide sans que personne le sache. */
      const nbr = (k) => Number(val(k));
      v('⛔ les plafonds du relais : 6 allocations par personne (les cinq liaisons relayées d\'une salle de six, plus une relance ; un appel à deux en demande 4), 32 au total, 500 ko/s chacune, 16 Mo/s de capacité', [nbr('user-quota'), nbr('total-quota'), nbr('max-bps'), nbr('bps-capacity')], [6, 32, 500000, 16000000]);
      v('⛔ la capacité tient UN seul nombre : `bps-capacity` ÷ `max-bps` = `total-quota` (32 allocations = 8 appels relayés × 4), et une personne tient au moins les cinq liaisons d\'une salle de six plus une relance (`user-quota` ≥ 5 + 1)', [nbr('bps-capacity') / nbr('max-bps') === nbr('total-quota'), nbr('total-quota') / 4, nbr('user-quota') >= 5 + 1], [true, 8, true]);
      v('   le nom (realm) est celui du relais ; le certificat et la clé sont ceux que le script a rangés pour coturn', [val('realm'), val('cert'), val('pkey')], ['turn.teamop.fr', '/etc/coturn/certs/fullchain.pem', '/etc/coturn/certs/privkey.pem']);
      v('   TLS ≥ 1.2 (1.0 et 1.1 refusés)', [opt.includes('no-tlsv1'), opt.includes('no-tlsv1_1'), opt.includes('no-tls')], [true, true, false]);
      v('⛔ AUCUNE trace : le journal de coturn est envoyé à /dev/null, rien sur la sortie standard (il porte l\'adresse de chaque appareil et l\'identifiant de chaque personne)', [val('log-file'), opt.includes('no-stdout-log'), opt.includes('simple-log'), opt.includes('syslog'), opt.includes('verbose')], ['/dev/null', true, true, false, false]);
      /* les plages */
      const refus = conf.filter(l => l.startsWith('denied-peer-ip=')).map(l => l.slice('denied-peer-ip='.length));
      vrai('population : au moins 15 plages refusées dans la configuration (' + refus.length + ')', refus.length >= 15);
      v('⛔ aucune plage n\'est écrite en notation « /masque » (CIDR : ignorée en silence par coturn 4.6.1)', refus.filter(x => x.includes('/')), []);
      const lues = refus.map(x => { const [a, z] = x.split('-'); return { x, a: z === undefined ? null : enBigInt(a), z: z === undefined ? null : enBigInt(z) }; });
      v('⛔ chaque plage est « début-fin », du même type d\'adresse, dans le bon ordre (une plage inversée ne protège de rien — coturn la prend sans broncher)', lues.filter(p => !p.a || !p.z || p.a.v6 !== p.z.v6 || p.a.n > p.z.n).map(p => p.x), []);
      v('⛔ aucune plage IPv6 ne COMMENCE à « :: » (coturn 4.6.1 en fait une plage qui avale les adresses IPv4 publiques : le relais refuserait tout, mesuré)', lues.filter(p => p.a && p.a.v6 && p.a.n === 0n).map(p => p.x), []);
      for (const c of A_REFUSER) {
        const z = cidr(c);
        vrai('⛔ le réseau ' + c + ' est recouvert d\'un bout à l\'autre par une plage refusée', lues.some(p => p.a && p.a.v6 === z.v6 && p.a.n <= z.debut && z.fin <= p.z.n));
      }
      /* contre-épreuve du recouvrement : une adresse publique n'est dans AUCUNE plage */
      for (const pub of ['93.184.216.34', '8.8.8.8', '1.1.1.1', '2606:4700:4700::1111', '2a00:1450:4007:80f::200e']) {
        const a = enBigInt(pub);
        v('contre-épreuve : l\'adresse publique ' + pub + ' n\'est dans AUCUNE plage refusée (sinon le relais ne relaierait rien)', lues.filter(p => p.a.v6 === a.v6 && p.a.n <= a.n && a.n <= p.z.n).map(p => p.x), []);
      }
      /* les fichiers rangés */
      v('le certificat et la clé sont rangés pour coturn (copie en 0640), le crochet de renouvellement est posé en 0755', [b.octets('etc/coturn/certs/fullchain.pem'), modeDe(b, 'etc/coturn/certs/privkey.pem'), modeDe(b, 'etc/coturn/certs/fullchain.pem'), modeDe(b, 'etc/letsencrypt/renewal-hooks/deploy/opmsg-turn.sh')], ['CERT-FACTICE\n', '640', '640', '755']);
      const hook = b.octets('etc/letsencrypt/renewal-hooks/deploy/opmsg-turn.sh');
      vrai('le crochet de renouvellement nomme le relais et s\'adresse à coturn (SIGUSR2, repli sur un redémarrage)', hook.includes('turn.teamop.fr') && !hook.includes('@HOTE@') && /SIGUSR2 coturn \|\| systemctl restart coturn/.test(hook));
      {
        const tmp = path.join(b.d, 'crochet.sh'); fs.writeFileSync(tmp, hook);
        const r2 = require('child_process').spawnSync(reel('sh'), ['-n', tmp], { encoding: 'utf8' });
        v('   et il se parse (sh -n)', [r2.status, r2.stderr], [0, '']);
      }
      v('un drop-in systemd borne coturn (mémoire, priorité, nouveaux privilèges) sans toucher à son unité', [(b.octets('etc/systemd/system/coturn.service.d/opmsg.conf') || '').split('\n').filter(l => /^(MemoryMax|CPUWeight|IOWeight|NoNewPrivileges)=/.test(l)).length, b.octets('etc/systemd/system/coturn.service') === null], [4, true]);
      /* ═══ le PARE-FEU SORTANT du relais (relecture, I2) ═══ */
      {
        const di = (b.octets('etc/systemd/system/coturn.service.d/opmsg.conf') || '').split('\n');
        const PF = '/usr/local/sbin/opmsg-turn-pare-feu';
        v('⛔ le drop-in de coturn REJOUE le pare-feu avant chaque démarrage (`ExecStartPre=+` : en root, malgré l\'utilisateur sans privilège de l\'unité) et le retire à l\'arrêt (`ExecStopPost=+`)', [di.filter(l => /^ExecStartPre=/.test(l)), di.filter(l => /^ExecStopPost=/.test(l))], [['ExecStartPre=+' + PF + ' start'], ['ExecStopPost=+' + PF + ' stop']]);
        v('⛔ les ports que le pare-feu connaît sont ceux de la configuration de coturn (plage des relais, ports d\'écoute et leurs voisins) — une règle sur d\'autres ports laisserait les relais ou couperait l\'écouteur', [di.filter(l => /^Environment=/.test(l)).sort(), [val('min-port'), val('max-port'), val('listening-port'), val('tls-listening-port')]],
          [['Environment=OPMSG_TURN_PORTS_ECOUTE=3478,3479,5349,5350', 'Environment=OPMSG_TURN_PORT_MAX=49999', 'Environment=OPMSG_TURN_PORT_MIN=49160'], ['49160', '49999', '3478', '5349']]);
        v('⛔ le script est posé à un chemin STABLE (pas dans le dossier d\'une version), exécutable, et identique à celui du dépôt à l\'octet près', [modeDe(b, 'usr/local/sbin/opmsg-turn-pare-feu'), b.octets('usr/local/sbin/opmsg-turn-pare-feu') === lire(path.join(RACINE, 'server-msg', 'turn-pare-feu.sh'))], ['755', true]);
        const v4 = b.noyau('v4'), v6 = b.noyau('v6');
        const attendu = [
          'OPMSG-TURN|-p udp -m addrtype ! --dst-type LOCAL -j RETURN', 'OPMSG-TURN|-p udp --dport 49160:49999 -j RETURN', 'OPMSG-TURN|-p udp -m multiport --sports 3478,3479,5349,5350 -j RETURN', 'OPMSG-TURN|-p udp -j DROP',
        ];
        v('⛔ DANS LE NOYAU (IPv4) : le saut depuis OUTPUT pour l\'utilisateur de coturn — UN seul — et la chaîne : le trafic vers l\'extérieur passe, vers un port de relais passe, depuis un port d\'écoute passe, TOUT LE RESTE est refusé (dans cet ordre)',
          [v4.chaines, v4.regles.filter(l => l.startsWith('OUTPUT|')), v4.regles.filter(l => l.startsWith('OPMSG-TURN|'))], [['OPMSG-TURN'], ['OUTPUT|-m owner --uid-owner turnserver -j OPMSG-TURN'], attendu]);
        v('   et en IPv6 : les mêmes règles', [v6.chaines, v6.regles.filter(l => l.startsWith('OUTPUT|')), v6.regles.filter(l => l.startsWith('OPMSG-TURN|'))], [['OPMSG-TURN'], ['OUTPUT|-m owner --uid-owner turnserver -j OPMSG-TURN'], attendu]);
        const JP = b.journal();
        vrai('⛔ L\'ORDRE : le pare-feu est posé par systemd AVANT le démarrage de coturn (`ExecStartPre`), RELU dans le noyau (`-C`) et SEULEMENT ALORS le contrôle du relais et les ports de l\'hébergeur', index(JP, /^ExecStartPre /) >= 0 && index(JP, /^ExecStartPre /) < dernier(JP, /^iptables -C OUTPUT/) && dernier(JP, /^iptables -C OUTPUT/) < index(JP, /^verifier-relais/) && index(JP, /^verifier-relais/) < index(JP, /^ufw allow/));
      }
      const ngx = b.octets('etc/nginx/sites-available/opmsg-turn.conf');
      vrai('le bloc nginx ne sert QUE la preuve de Let\'s Encrypt sur le port 80 (aucun 443, aucun proxy, aucun journal d\'accès) et nomme le relais', ngx && /server_name turn\.teamop\.fr;/.test(ngx) && /\.well-known\/acme-challenge/.test(ngx) && !/443|proxy_pass|ssl_/.test(ngx) && /access_log off;/.test(ngx));
      vrai('   il est activé (lien dans sites-enabled)', fs.lstatSync(path.join(b.R, 'etc/nginx/sites-enabled/opmsg-turn.conf')).isSymbolicLink());
      /* aucun résidu */
      v('aucun fichier temporaire ne reste (.nouveau, .avant, .modele, .avant-turn)', Object.keys(b.etat()).filter(k => /\.(nouveau|avant|modele|avant-turn)$/.test(k)), []);
      /* les fuites */
      const J = b.journal(), env = b.env();
      for (const [quoi, texte] of [['la sortie du script', r.out + r.err], ['les arguments de chaque commande lancée', J.join('\n')], ['l\'environnement de chaque commande lancée', env], ['le contrôle du relais (sa sortie)', r.out]]) {
        vrai('⛔ le secret n\'est PAS dans ' + quoi + ' (population : ' + J.length + ' commandes notées, ' + env.length + ' octets d\'environnement)', J.length >= 10 && env.length > 1000 && !texte.includes(secret));
      }
      vrai('⛔ ni sous la forme de 40 caractères d\'identifiant ou plus (le masqueur ne laisse rien passer)', !/[A-Za-z0-9_-]{40,}/.test(r.out.replace(/\/[A-Za-z0-9_.\/-]+/g, '')));
      /* l'ordre */
      const iApt = index(J, /^apt-get install -y -qq coturn/), iCertbot = index(J, /^certbot certonly/), iNginxT = index(J, /^nginx -t/), iNginxR = index(J, /^systemctl reload nginx/);
      const iRestartC = index(J, /^systemctl restart coturn/), iVerif = index(J, /^verifier-relais beta config=oui/), iUfw = index(J, /^ufw allow/), iRestartI = index(J, /^systemctl restart teamop-msg@beta/);
      vrai('population : toutes les étapes ont eu lieu (apt, nginx, certbot, coturn, contrôle, pare-feu, instance)', [iApt, iCertbot, iNginxT, iNginxR, iRestartC, iVerif, iUfw, iRestartI].every(i => i >= 0));
      vrai('⛔ L\'ORDRE : coturn installé → bloc nginx validé (-t) PUIS rechargé → certbot → coturn démarré → CONTRÔLE → pare-feu → instance relancée', iApt < iNginxT && iNginxT < iNginxR && iNginxR < iCertbot && iCertbot < iRestartC && iRestartC < iVerif && iVerif < iUfw && iUfw < iRestartI);
      vrai('coturn est ARRÊTÉ juste après son installation (le paquet le démarre avec une configuration vide) et AVANT d\'écrire la sienne', index(J, /^systemctl stop coturn/) > iApt && index(J, /^systemctl stop coturn/) < iRestartC);
      v('le pare-feu : exactement les quatre ports du relais, une règle chacun (3478 UDP et TCP, 5349 TCP, 49160-49999 UDP)', J.filter(l => /^ufw allow/.test(l)).map(l => l.split(' ')[2]), ['3478/udp', '3478/tcp', '5349/tcp', '49160:49999/udp']);
      vrai('le dernier mot : l\'instance voit le relais (le script l\'a demandé à /health) et les ports à ouvrir chez l\'hébergeur sont rappelés', /✓ l'instance voit le relais/.test(r.out) && /TCP et UDP 3478, TCP 5349, UDP 49160-49999/.test(r.out) && /PANNEAU DE L'HÉBERGEUR/.test(r.out));
      v('⛔ rien d\'OP GESTION n\'a été touché : aucune commande ne nomme teamop-api, /opt/teamop ni /etc/teamop', J.filter(l => /teamop-api|\/opt\/teamop|\/etc\/teamop/.test(l)), []);

      /* ═══════ 2. LA SECONDE EXÉCUTION : même disque, rien de relancé ═══════ */
      console.log('\nLa seconde exécution : le même secret, le même disque, rien de relancé');
      const etat1 = b.etat(), n1 = b.journal().length;
      const r2 = await b.lancer(['beta']);
      v('la seconde exécution réussit', [r2.status, r2.err], [0, '']);
      v('⛔ le secret est REPRIS (jamais retiré au sort de nouveau : l\'autre instance et les appels en cours gardent le leur)', secretDe(b, 'beta'), secret);
      v('⛔ le disque est identique à l\'octet près (contenus et droits), hors du journal du banc', b.etat(), etat1);
      const J2 = b.journal().slice(n1);
      v('⛔ ni coturn ni l\'instance ne sont relancés, ni certbot ni nginx rappelés (une configuration inchangée ne dérange personne)', [compte(J2, /^systemctl restart/), compte(J2, /^certbot/), compte(J2, /^nginx/), compte(J2, /^apt-get/)], [0, 0, 0, 0]);
      vrai('   le contrôle est REJOUÉ (il ne coûte rien et il prouve que le relais tient encore)', compte(J2, /^verifier-relais/) === 1);
      vrai('⛔ le secret n\'est toujours pas dans la sortie (seconde exécution)', !(r2.out + r2.err).includes(secret) && !b.env().includes(secret));
      v('   et le script dit que c\'est une reprise (« cle=repris »)', /cle=repris instance=inchange coturn=inchange/.test(r2.out), true);

      /* ═══════ 2 bis. LE SCRIPT DE PARE-FEU LUI-MÊME, contre le faux noyau : rejouable, relu, retiré, et qui REFUSE plutôt que de laisser ouvert ═══════ */
      console.log('\nLe pare-feu sortant : rejouable (il ne s\'empile pas), relu dans le noyau, retiré à l\'arrêt, refusé plutôt que laissé ouvert');
      {
        const PFS = path.join(RACINE, 'server-msg', 'turn-pare-feu.sh');
        const jouer = (arg, env, drapeaux) => {
          for (const d of Object.keys(drapeaux || {})) b.drapeau(d, drapeaux[d]);
          const r = require('child_process').spawnSync(reel('bash'), [PFS, arg], { encoding: 'utf8', env: Object.assign({ PATH: b.bin, LC_ALL: 'C.UTF-8', BAC_ETAT: b.E }, env || {}) });
          for (const d of Object.keys(drapeaux || {})) b.drapeau(d, false);
          return { status: r.status, out: (r.stdout + r.stderr).trim() };
        };
        const n0 = b.noyau('v4').regles.length;
        const a = jouer('start'), a2 = jouer('start');
        v('⛔ REJOUER `start` ne change rien : toujours UN saut depuis OUTPUT et quatre règles dans la chaîne (les règles se remplacent, elles ne s\'empilent pas — IPv4 et IPv6)', [a.status, a2.status, b.noyau('v4').regles.length, b.noyau('v4').regles.filter(l => l.startsWith('OUTPUT|')).length, b.noyau('v6').regles.length, b.noyau('v6').regles.filter(l => l.startsWith('OUTPUT|')).length], [0, 0, n0, 1, n0, 1]);
        v('   `verifier` relit le noyau : en place → sortie 0', [jouer('verifier').status, /en place/.test(jouer('verifier').out)], [0, true]);
        const ar = jouer('stop');
        v('⛔ `stop` retire le saut ET la chaîne (IPv4 et IPv6), et `verifier` le DIT ensuite (sortie 1, « ABSENT ») — pas de règle orpheline', [ar.status, b.noyau('v4'), b.noyau('v6'), jouer('verifier').status, /ABSENT/.test(jouer('verifier').out)], [0, { chaines: [], regles: [] }, { chaines: [], regles: [] }, 1, true]);
        jouer('start');
        v('⛔ le saut supprimé à la main (ou par un autre outil) : `verifier` le voit (sortie 1) — le contrôle relit le noyau, il ne croit pas que `start` a réussi', (() => { const f = path.join(b.E, 'ipt-v4.regles'); fs.writeFileSync(f, fs.readFileSync(f, 'utf8').split('\n').filter(l => !l.startsWith('OUTPUT|')).join('\n')); return jouer('verifier').status; })(), 1);
        const noV6 = jouer('start', {}, { 'iptables-absent-v6': true });
        v('   un noyau SANS IPv6 : le pare-feu IPv4 se pose et le script le DIT (il ne refuse pas de démarrer pour un IPv6 qui n\'existe pas)', [noV6.status, /IPv4 ; IPv6 absent/.test(noV6.out)], [0, true]);
        const refuse = jouer('start', {}, { 'iptables-refuse-v4': true });
        v('⛔ UNE RÈGLE QUI NE SE POSE PAS : sortie 1, « le relais ne démarre pas » — systemd refusera alors de lancer coturn (un relais qui parle aux services de la machine est pire qu\'un relais éteint)', [refuse.status, /le relais ne démarre pas/.test(refuse.out)], [1, true]);
        const sans = jouer('start', { OPMSG_TURN_UTILISATEUR: 'inconnu-x' }), mauvais = jouer('start', { OPMSG_TURN_UTILISATEUR: 'a;rm -rf x' }), ports = jouer('start', { OPMSG_TURN_PORTS_ECOUTE: '3478;ls' });
        v('   un utilisateur qui n\'existe pas : sortie 1 ; un nom ou des ports qui ne ressemblent pas à ce qu\'ils sont : sortie 2, avant d\'écrire une règle', [sans.status, mauvais.status, ports.status], [1, 2, 2]);
        jouer('stop');
        const code = sansCommentaires(lire(PFS));
        vrai('population : le script de pare-feu n\'est pas vide une fois les commentaires retirés', code.split('\n').filter(l => l.trim()).length > 25);
        vrai('⛔ aucun secret, aucune adresse écrite en dur dans le pare-feu (il décide par type d\'adresse : « de cette machine »)', !/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/.test(code.replace(/0\.0\.0\.0/g, '')) && !/secret/i.test(code));
      }

      /* ═══════ 3. UN SECRET INVALIDE EST REMPLACÉ, UN SECRET VALIDE EST REPRIS ═══════ */
      console.log('\nUn secret trop court est remplacé ; le nom du relais qui change relance coturn mais garde le secret');
      {
        const c = b.config('beta'); c.appels.relais.secret = 'court'; fs.writeFileSync(path.join(b.R, 'etc/opmsg/beta.json'), JSON.stringify(c, null, 2) + '\n', { mode: 0o600 });
        const r3 = await b.lancer(['beta']);
        const s3 = secretDe(b, 'beta');
        vrai('un secret de 5 caractères est REMPLACÉ par un secret valide de 64 (et coturn reçoit le nouveau)', r3.status === 0 && RE_SECRET.test(s3) && s3 !== secret && lignesConf(b).includes(LIGNE_SECRET + s3) && !lignesConf(b).includes(LIGNE_SECRET + secret));
        const r4 = await b.lancer(['beta'], { OPMSG_TURN_HOTE: 'relais.exemple.invalid' });
        const c4 = b.config('beta');
        v('un autre nom de relais : le secret est REPRIS, le nom change dans l\'instance ET dans coturn, coturn est relancé', [r4.status, c4.appels.relais.secret === s3, c4.appels.relais.hote, lignesConf(b).includes('realm=relais.exemple.invalid')], [0, true, 'relais.exemple.invalid', true]);
      }
    } finally { b.fin(); }
  }

  /* ═══════ 4. ÉCHEC = FERMÉ ═══════ */
  console.log('\nÉchec = fermé : coturn ne démarre pas, le contrôle échoue, le contrôle est absent, l\'instance ne repart pas');
  {
    const cas = [
      ['coturn ne démarre pas', (b) => b.drapeau('coturn-refuse'), /coturn n'a pas démarré/, false],
      ['le contrôle du relais échoue (127.0.0.1 accepté)', (b) => b.drapeau('verifier-refuse'), /Le relais ne fait pas ce qu'il doit/, true],
      ['le contrôle est absent (une version d\'avant les appels)', (b) => fs.rmSync(path.join(b.R, 'opt/opmsg/beta/current/outils/verifier-relais.js')), /le contrôle du relais est absent/, false],
      ['⛔ une règle du PARE-FEU SORTANT ne se pose pas (iptables refuse) : systemd refuse de démarrer coturn', (b) => b.drapeau('iptables-refuse-v4'), /coturn n'a pas démarré/, false],
      ['⛔ le pare-feu sortant est « posé » mais ne se RELIT pas dans le noyau', (b) => b.drapeau('iptables-oublie-v4'), /le pare-feu sortant du relais n'est pas en place/, false],
    ];
    for (const [nom, preparer, dit, verifRun] of cas) {
      const b = bac();
      try {
        b.instance('beta'); await b.serveur('beta'); preparer(b);
        const avant = b.octets('etc/opmsg/beta.json');
        const r = await b.lancer(['beta']);
        const J = b.journal();
        v('⛔ [' + nom + '] le script échoue (sortie 1) et le DIT', [r.status, dit.test(r.out)], [1, true]);
        v('   la configuration de l\'instance est REMISE comme avant, octet pour octet', b.octets('etc/opmsg/beta.json'), avant);
        vrai('   coturn est ARRÊTÉ (fermé, pas laissé en route)', dernier(J, /^systemctl stop coturn/) > index(J, /^systemctl restart coturn/) && !fs.existsSync(path.join(b.E, 'coturn-actif')));
        v('   le pare-feu n\'est pas touché et l\'instance n\'est pas relancée', [compte(J, /^ufw allow/), compte(J, /^systemctl restart teamop-msg/)], [0, 0]);
        v('   le contrôle ' + (verifRun ? 'a bien été joué' : 'n\'a pas été joué (il n\'y avait pas lieu)'), compte(J, /^verifier-relais/) > 0, verifRun);
        v('   aucun fichier temporaire ne reste', Object.keys(b.etat()).filter(k => /\.(nouveau|avant|modele|avant-turn)$/.test(k)), []);
        const sec = lignesConf(b).find(l => l.startsWith(LIGNE_SECRET));
        vrai('   ⛔ et le secret, écrit dans la configuration de coturn, n\'est ni dans la sortie ni dans l\'environnement des commandes', !sec || (!(r.out + r.err).includes(sec.slice(LIGNE_SECRET.length)) && !b.env().includes(sec.slice(LIGNE_SECRET.length))));
      } finally { b.fin(); }
    }
    {
      /* ⛔ le script de pare-feu est livré avec la version en service : une version d'avant ne l'a pas — on s'arrête AVANT d'écrire quoi que ce soit (ni secret, ni configuration de coturn, ni drop-in) */
      const b = bac();
      try {
        b.instance('beta'); await b.serveur('beta');
        fs.rmSync(path.join(b.R, 'opt/opmsg/beta/current/turn-pare-feu.sh'));
        const avant = b.octets('etc/opmsg/beta.json'), etat0 = b.etat();
        const r = await b.lancer(['beta']);
        v('⛔ [le pare-feu du relais est absent de la version en service] le script refuse (sortie 1), le DIT, et n\'a RIEN écrit ni lancé (ni coturn, ni secret, ni drop-in)', [r.status, /le pare-feu du relais est absent/.test(r.out), b.octets('etc/opmsg/beta.json') === avant, b.etat(), compte(b.journal(), /^(systemctl|apt-get|certbot|nginx|ufw|verifier-relais)/)], [1, true, true, etat0, 0]);
      } finally { b.fin(); }
    }
    {
      /* ⛔ le pare-feu du relais veut `iptables` : une machine qui ne l'a pas l'installe AVANT d'écrire quoi que ce soit ; si elle ne peut pas, on s'arrête là, en le disant */
      const b = bac({ iptables: false });
      try {
        b.instance('beta'); await b.serveur('beta');
        const r = await b.lancer(['beta']);
        const iApt = index(b.journal(), /^apt-get install -y -qq iptables/), iCoturn = index(b.journal(), /^systemctl restart coturn/);
        v('⛔ [la machine n\'a pas iptables] il est installé (apt-get), AVANT le démarrage de coturn, et le pare-feu se pose : sortie 0, les règles sont dans le noyau', [r.status, compte(b.journal(), /^apt-get install -y -qq iptables/), iApt >= 0 && iCoturn > iApt, b.noyau('v4').regles.length > 0], [0, 1, true, true]);
      } finally { b.fin(); }
      const b2 = bac({ iptables: false });
      try {
        b2.instance('beta'); await b2.serveur('beta'); b2.drapeau('apt-refuse-iptables');
        const avant = b2.octets('etc/opmsg/beta.json'), etat0 = b2.etat();
        const r = await b2.lancer(['beta']);
        v('⛔ [iptables absent ET non installable] le script refuse (sortie 1), le DIT, et n\'a RIEN écrit (ni secret, ni configuration, ni drop-in) ni lancé (ni coturn — seul l\'arrêt que l\'installation du paquet appelle —, ni certbot, nginx, ufw, ni le contrôle)', [r.status, /iptables n'est pas installé après apt-get/.test(r.out), b2.octets('etc/opmsg/beta.json') === avant, b2.etat(), compte(b2.journal(), /^(systemctl (restart|start|reload|enable)|certbot|nginx|ufw|verifier-relais)/), compte(b2.journal(), /^systemctl stop coturn/)], [1, true, true, etat0, 0, 1]);
      } finally { b2.fin(); }
    }
    {
      /* l'instance ne repart pas avec la nouvelle configuration : la précédente est remise, et le script relance l'instance une seconde fois */
      const b = bac();
      try {
        b.instance('beta'); await b.serveur('beta'); b.drapeau('unite-refuse');
        const avant = b.octets('etc/opmsg/beta.json');
        const r = await b.lancer(['beta']);
        const J = b.journal();
        v('⛔ [l\'instance ne repart pas] le script échoue et le dit', [r.status, /l'instance ne repart pas/.test(r.out)], [1, true]);
        v('   la configuration d\'avant est remise, octet pour octet', b.octets('etc/opmsg/beta.json'), avant);
        vrai('   et l\'instance est relancée avec elle (OP MESSAGES doit tourner) : deux relances, la seconde réussit', compte(J, /^systemctl restart teamop-msg@beta/) === 2 && fs.existsSync(path.join(b.E, 'unite-actif')));
      } finally { b.fin(); }
    }
    {
      /* l'instance repart mais ne dit pas avoir de relais (une version d'avant les appels) */
      const b = bac();
      try {
        b.instance('beta'); await b.serveur('beta'); b.drapeau('health-sans-relais');
        const avant = b.octets('etc/opmsg/beta.json');
        const r = await b.lancer(['beta']);
        v('⛔ [l\'instance ne voit pas le relais] le script échoue, remet la configuration d\'avant et relance l\'instance', [r.status, /ne voit pas le relais/.test(r.out), b.octets('etc/opmsg/beta.json') === avant, compte(b.journal(), /^systemctl restart teamop-msg@beta/)], [1, true, true, 2]);
      } finally { b.fin(); }
    }
    {
      /* l'instance ne tourne pas : pas de relance, la configuration reste (elle sera lue au prochain démarrage) */
      const b = bac({ unite: false });
      try {
        b.instance('beta'); await b.serveur('beta');
        const r = await b.lancer(['beta']);
        v('l\'instance ne tourne pas : aucune relance, la configuration est posée, le script le dit et réussit', [r.status, compte(b.journal(), /^systemctl restart teamop-msg/), /ne tourne pas/.test(r.out), !!secretDe(b, 'beta')], [0, 0, true, true]);
      } finally { b.fin(); }
    }
  }

  /* ═══════ 5. SANS TLS ═══════ */
  console.log('\nSans TLS : le DNS ne répond pas, nginx refuse, un autre proxy tient le port 80, ou TLS écarté');
  {
    const cas = [
      ['certbot échoue (le DNS ne pointe pas ici)', { }, (b) => b.drapeau('certbot-refuse'), {}, /DNS de turn\.teamop\.fr pointe-t-il/],
      ['nginx refuse le bloc de preuve (nginx -t)', { }, (b) => b.drapeau('nginx-refuse'), {}, /le bloc nginx a été refusé/],
      ['nginx n\'est pas le proxy actif (un autre tient le port 80)', { nginx: false }, () => {}, {}, /il faut nginx actif et certbot/],
      ['TLS écarté par le geste (OPMSG_TURN_SANS_TLS=oui)', { }, () => {}, { OPMSG_TURN_SANS_TLS: 'oui' }, /TLS : écarté/],
    ];
    for (const [nom, opts, preparer, env, dit] of cas) {
      const b = bac(opts);
      try {
        b.instance('beta'); await b.serveur('beta'); preparer(b);
        const r = await b.lancer(['beta'], env);
        const conf = lignesConf(b), cfg = b.config('beta');
        v('[' + nom + '] le relais est posé quand même (sortie 0) et le script DIT « SANS TLS »', [r.status, dit.test(r.out), /TLS : non/.test(r.out)], [0, true, true]);
        v('   la configuration de coturn est sans TLS : `no-tls`, ni port TLS, ni certificat', [conf.includes('no-tls'), conf.some(l => /^(tls-listening-port|cert|pkey)=/.test(l))], [true, false]);
        v('   celle de l\'instance aussi : `portTls: null` (la page ne proposera pas turns:), et le service l\'accepte', [cfg.appels.relais.portTls, !!appelsConfig(cfg, 'beta').relais], [null, true]);
        v('   le pare-feu n\'ouvre PAS le port TLS', b.journal().filter(l => /^ufw allow/.test(l)).map(l => l.split(' ')[2]), ['3478/udp', '3478/tcp', '49160:49999/udp']);
        v('   aucun certificat ni crochet de renouvellement n\'est rangé', [b.octets('etc/coturn/certs/fullchain.pem'), b.octets('etc/letsencrypt/renewal-hooks/deploy/opmsg-turn.sh')], [null, null]);
        if (nom.startsWith('nginx refuse')) v('   le bloc refusé par nginx a été RETIRÉ (rien ne reste dans le proxy)', [b.octets('etc/nginx/sites-available/opmsg-turn.conf'), fs.existsSync(path.join(b.R, 'etc/nginx/sites-enabled/opmsg-turn.conf'))], [null, false]);
        if (nom.startsWith('nginx n\'est pas')) v('   et certbot n\'a pas été lancé, nginx pas touché', [compte(b.journal(), /^certbot/), compte(b.journal(), /^nginx/)], [0, 0]);
      } finally { b.fin(); }
    }
    {
      /* certbot absent : installé par apt-get ; refusé : sans TLS */
      const b = bac({ certbot: false });
      try {
        b.instance('beta'); await b.serveur('beta');
        const r = await b.lancer(['beta']);
        v('certbot absent : il est installé (apt-get), puis le certificat est demandé', [r.status, compte(b.journal(), /^apt-get install -y -qq certbot/), compte(b.journal(), /^certbot certonly/)], [0, 1, 1]);
      } finally { b.fin(); }
      const b2 = bac({ certbot: false });
      try {
        b2.instance('beta'); await b2.serveur('beta'); b2.drapeau('apt-refuse-certbot');
        const r = await b2.lancer(['beta']);
        v('certbot absent ET non installable : sans TLS, sans échec', [r.status, /SANS TLS/.test(r.out)], [0, true]);
      } finally { b2.fin(); }
    }
  }

  /* ═══════ 6. DEUX INSTANCES SUR UN RELAIS ═══════ */
  console.log('\nDeux instances sur un relais : chacune garde son secret, coturn les connaît toutes les deux');
  {
    const b = bac({ coturn: true });
    try {
      b.instance('beta'); b.instance('prod');
      await b.serveur('beta'); await b.serveur('prod');
      const r1 = await b.lancer(['beta']);
      const r2 = await b.lancer(['prod']);
      const sb = secretDe(b, 'beta'), sp = secretDe(b, 'prod');
      v('les deux installations réussissent', [r1.status, r2.status], [0, 0]);
      vrai('chaque instance a SON secret, valide, et ils sont différents', RE_SECRET.test(sb || '') && RE_SECRET.test(sp || '') && sb !== sp);
      v('⛔ coturn connaît les DEUX (deux lignes `static-auth-secret=`, une par instance)', lignesConf(b).filter(l => l.startsWith(LIGNE_SECRET)).sort(), [LIGNE_SECRET + sb, LIGNE_SECRET + sp].sort());
      const r3 = await b.lancer(['beta']);
      v('⛔ rejouer la bêta ne retire PAS le secret de la production, et ne change aucun des deux', [r3.status, secretDe(b, 'beta') === sb, secretDe(b, 'prod') === sp, lignesConf(b).filter(l => l.startsWith(LIGNE_SECRET)).length], [0, true, true, 2]);
      vrai('coturn était déjà installé : apt-get n\'est pas appelé pour lui', compte(b.journal(), /^apt-get install -y -qq coturn/) === 0);
      vrai('⛔ aucun des deux secrets n\'est dans une sortie, un argument ou un environnement', ![r1.out, r1.err, r2.out, r2.err, r3.out, b.journal().join('\n'), b.env()].some(x => x.includes(sb) || x.includes(sp)));
      v('le contrôle de chaque installation porte SON instance et SA configuration', [compte(b.journal(), /^verifier-relais beta config=oui/), compte(b.journal(), /^verifier-relais prod config=oui/)], [2, 1]);
    } finally { b.fin(); }
  }

  /* ═══════ 7. LES REFUS DU GESTE LUI-MÊME ═══════ */
  console.log('\nLes mauvais gestes : pas d\'instance, nom illisible, instance non installée');
  {
    const b = bac();
    try {
      b.instance('beta'); await b.serveur('beta');
      const sans = await b.lancer([]), mauvaise = await b.lancer(['staging']);
      v('sans instance, ou avec une instance inconnue : usage et sortie 2, rien n\'est lancé', [sans.status, mauvaise.status, /usage : bash install-turn\.sh/.test(sans.out), b.journal().length], [2, 2, true, 0]);
      for (const hote of ['a b', 'turn.exemple;touch', '../x', '-rf', 'TURN.EXEMPLE', 'ré.exemple']) {
        const r = await b.lancer(['beta'], { OPMSG_TURN_HOTE: hote });
        v('⛔ un nom de relais illisible (« ' + hote + ' ») est refusé avant tout (sortie 2, rien lancé, configuration intacte)', [r.status, b.journal().length, !!secretDe(b, 'beta')], [2, 0, false]);
      }
      const ip = await b.lancer(['beta'], { OPMSG_TURN_IP: '1.2.3.4; reboot' });
      v('⛔ une adresse publique illisible est refusée de la même façon', [ip.status, b.journal().length], [2, 0]);
      const ok = await b.lancer(['beta'], { OPMSG_TURN_IP: '203.0.113.7' });
      v('une adresse publique lisible devient `external-ip=` dans coturn (derrière une traduction d\'adresses)', [ok.status, lignesConf(b).includes('external-ip=203.0.113.7')], [0, true]);
      const b2 = bac();
      try {
        const r = await b2.lancer(['beta']);
        v('⛔ une instance non installée (pas de /etc/opmsg/beta.json) : sortie 1, le message dit de lancer install-msg.sh, RIEN n\'est lancé ni écrit', [r.status, /lancer d'abord install-msg\.sh beta/.test(r.out), b2.journal().length, Object.keys(b2.etat()).filter(k => !k.endsWith('/')).length], [1, true, 0, 0]);
      } finally { b2.fin(); }
    } finally { b.fin(); }
  }
})().then(() => t.fin(), (e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; });
