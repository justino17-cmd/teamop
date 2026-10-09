/* ⛔ CE QUE CE FICHIER GARDE — QUE `install-sfu.sh` POSE UN SERVEUR DE VISIO QUI FAIT CE QU'IL DOIT, SANS JAMAIS AFFICHER NI FAIRE FUIR LE SECRET, ET QU'IL ÉCHOUE FERMÉ.

   `server-msg/install-sfu.sh` (le geste de Justin sur le VPS) est JOUÉ ici de bout en bout dans un bac à sable (`bac-visio.js`) : une racine factice, un PATH réduit, de FAUX binaires
   qui notent chaque appel (arguments ET environnement), un faux noyau pour le pare-feu, une archive FACTICE de LiveKit, un faux /health de l'instance. Le VRAI binaire et le VRAI
   contrôle (`outils/verifier-visio.js`) sont joués à part, contre un vrai LiveKit et le vrai service (`test-953`).

   Ce qu'on prouve, et pourquoi chaque ligne existe :
     1. ⛔ LE SECRET : tiré au hasard, ÉCRIT dans les deux configurations (l'instance 0600, LiveKit 0640) — la MÊME paire des deux côtés — et ABSENT de la sortie du script, de chaque
        argument et de l'environnement de chaque binaire qu'il a lancé. Le même, REPRIS, à la seconde exécution.
     2. ⛔ L'ARCHIVE : son empreinte est vérifiée AVANT d'être ouverte ; une archive qui ne correspond pas n'installe RIEN (ni binaire, ni configuration, ni unité).
     3. ⛔ CE QUE LIVEKIT ÉCOUTE ET DIT : la signalisation en boucle locale seulement, deux ports publics, l'adresse publique POSÉE (pas de STUN extérieur), aucun serveur STUN de
        Google ni de Twilio donné aux pages, un journal au niveau « error », l'avis vers le service en boucle locale.
     4. ⛔ LE PARE-FEU SORTANT est dans le (faux) noyau, posé par systemd AVANT LiveKit : l'UDP vers la machine elle-même et vers les réseaux privés est refusé.
     5. ⛔ NGINX : trois lignes entre deux marques, juste après la clé TLS du bloc HTTPS de l'instance ; le chemin /rtc seul (ni /twirp ni la page d'accueil), sans journal d'accès, sans
        l'adresse des participants ; validé (nginx -t) AVANT d'être rechargé ; une configuration refusée remet le fichier OCTET POUR OCTET.
     6. ⛔ L'ORDRE : LiveKit démarré → son pare-feu relu → contrôle local → /rtc posé → contrôle public → instance relancée → contrôle des avis → ports ouverts (ufw). Jamais un port
        ouvert avant la dernière preuve.
     7. ⛔ ÉCHEC = FERMÉ, à CHAQUE étape : la visio est retirée (unité, configuration de LiveKit, chemin /rtc, `appels.visio`), l'instance relancée sans elle, aucun port ouvert.
     8. ⛔ REJOUABLE : deux exécutions de suite laissent le MÊME disque, et la seconde ne relance NI LiveKit NI l'instance, ne recharge pas nginx, ne retélécharge rien.
     9. « retirer » défait tout ; deux INSTANCES ont deux paires de clés, deux comptes, deux chaînes, deux jeux de ports. */
'use strict';
const fs = require('fs'), path = require('path');
const { banc, sansCommentaires } = require('./bac-messages.js');
const t = banc();
const { v, vrai } = t;
const { bac, SCRIPT, RE_SECRET, visioDe, index, compte, modeDe, lire } = require('./bac-visio.js');
console.log('\n── 959 · install-sfu.sh, joué dans un bac à sable ──');

const ANCRE_B = '    ssl_certificate_key /etc/letsencrypt/live/msg-beta.teamop.fr/privkey.pem;';
const NGX_B = 'etc/nginx/sites-available/opmsg-beta.conf';
const sansVisio = (b, nom) => { const c = b.config(nom); return c && c.appels ? !('visio' in c.appels) : true; };

(async () => {
  /* ═══════ 0. LE FICHIER LUI-MÊME ═══════ */
  vrai('le script existe', fs.existsSync(SCRIPT));
  {
    const code = sansCommentaires(lire(SCRIPT));
    vrai('population : le code du script n\'est pas vide une fois les commentaires retirés', code.split('\n').filter(l => l.trim()).length > 150);
    const emp = Array.from(code.matchAll(/\[(amd64|arm64)\]="([0-9a-f]{64})"/g)).map(m => m[1] + '=' + m[2]);
    v('⛔ les empreintes des archives publiées sont ÉPINGLÉES (amd64 et arm64, celles du checksums.txt de la v1.13.7)', emp, ['amd64=6634aeeb2fb1366b6723708ae4320b9d5408106a4c63457c5e845ae3979c90e2', 'arm64=5d167fdf52cf43c0c72972f25325364479f41f854bfef651056eab2504da5de9']);
    vrai('⛔ la porte des bancs (une autre empreinte) ne s\'ouvre QU\'AVEC une racine factice : sur le VPS, OPMSG_RACINE est vide et elle ne fait rien', /if \[ -n "\$R" \] && \[ -n "\$\{OPMSG_VISIO_EMPREINTE_BANC:-\}" \]; then EMPREINTE_ATTENDUE=/.test(code));
    vrai('⛔ le secret n\'est jamais dans un argument ni dans l\'environnement : le programme Node ne reçoit que des chemins, des ports et un mode', !/SECRET\s*=/.test(code.replace(/RE_SECRET\s*=/g, '')) && !/--secret/.test(code));
    vrai('⛔ le téléchargement passe par un FICHIER vérifié, jamais par un tuyau vers un interpréteur', /curl -fsSL --proto '=https' --tlsv1\.2[^\n]*-o "\$TMPD\/livekit\.tar\.gz"/.test(code) && !/curl[^\n|]*\|\s*(ba)?sh/.test(code));
  }

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
      vrai('   … et le bloc nginx de l\'instance mène au nouveau port, plus à l\'ancien', (b.octets(NGX_B) || '').includes('127.0.0.1:' + b.ports.beta) && !(b.octets(NGX_B) || '').includes('127.0.0.1:' + pris + ';'));
    } finally { b.fin(); }
  }

  /* ═══════ 1. LA PREMIÈRE INSTALLATION (beta) : nginx actif, ufw actif ═══════ */
  console.log('\nLa première installation');
  {
    const b = bac();
    try {
      b.instance('beta');
      await b.serveur('beta');
      const ngxAvant = b.octets(NGX_B);
      const r = await b.lancer(['beta']);
      v('le script réussit (sortie 0)', [r.status, r.err], [0, '']);
      const vi = visioDe(b, 'beta');
      vrai('⛔ la configuration de l\'instance porte la visio : son adresse (wss + le domaine de l\'instance), LiveKit en boucle locale, une clé et un secret de 64 caractères', !!vi && vi.url === 'wss://msg-beta.teamop.fr' && vi.interne === 'http://127.0.0.1:7880' && /^OP[0-9a-f]{16}$/.test(vi.cle) && RE_SECRET.test(vi.secret) && vi.secret.length === 64);
      v('   0600 (le service seul la lit)', modeDe(b, 'etc/opmsg/beta.json'), '600');
      const y = b.octets('etc/opmsg/visio-beta.yaml') || '';
      v('⛔ la configuration de LiveKit porte LA MÊME paire, et l\'avis va au service EN BOUCLE LOCALE', [y.includes('"' + vi.cle + '": "' + vi.secret + '"'), y.includes('api_key: "' + vi.cle + '"'), y.includes('- "http://127.0.0.1:' + b.ports.beta + '/api/visio/avis"')], [true, true, true]);
      v('   0640 (root et le compte de la visio)', modeDe(b, 'etc/opmsg/visio-beta.yaml'), '640');
      const lignes = y.split('\n').filter(l => l.trim() && !/^\s*#/.test(l));
      for (const [nom, re] of [
        ['la signalisation n\'écoute QU\'EN boucle locale (port 7880, bind 127.0.0.1)', /^port: 7880$[\s\S]*^bind_addresses:\n  - "127\.0\.0\.1"$/m],
        ['deux ports publics : TCP 7881, UDP 7882', /^  tcp_port: 7881$[\s\S]*^  udp_port: 7882$/m],
        ['⛔ l\'adresse publique est POSÉE (pas de découverte par un STUN extérieur)', /^  use_external_ip: false$[\s\S]*^  node_ip: "203\.0\.113\.7"$/m],
        ['⛔ les serveurs STUN donnés aux pages : ceux de l\'instance, jamais Google ni Twilio', /^  stun_servers:\n    - "msg-beta\.teamop\.fr:3478"$/m],
        ['le plafond de la machine (20 Mo/s)', /^limit:\n  bytes_per_sec: 20000000$/m],
        ['⛔ un journal au niveau « error » (ni identité, ni salle, ni adresse en fonctionnement normal)', /^logging:\n  level: error\n  pion_level: error$/m],
      ]) vrai('   ' + nom, re.test(lignes.join('\n')));
      vrai('⛔ aucune trace de Google ni de Twilio dans la configuration de LiveKit', !/google|twilio/i.test(y));
      vrai('⛔ et pas de TURN intégré (aucune section « turn: »)', !/^turn:/m.test(y));
      /* le secret : nulle part ailleurs */
      const toutes = r.out + r.err + b.journal().join('\n') + b.env();
      v('⛔ le secret n\'apparaît ni dans la sortie, ni dans un argument, ni dans l\'environnement d\'un binaire lancé', toutes.includes(vi.secret), false);
      vrai('   population : les binaires notés ont bien été appelés (le contrôle ci-dessus porte sur du réel)', b.journal().length > 15 && b.env().length > 1000);
      /* l'archive et le binaire */
      vrai('le binaire est installé, exécutable, avec l\'empreinte de son archive et la sienne', b.existe('opt/opmsg/livekit/1.13.7/livekit-server') && modeDe(b, 'opt/opmsg/livekit/1.13.7/livekit-server') === '755' && (b.octets('opt/opmsg/livekit/1.13.7/archive.sha256') || '').trim() === b.empreinte && /^[0-9a-f]{64}$/.test((b.octets('opt/opmsg/livekit/1.13.7/livekit-server.sha256') || '').trim()));
      vrai('   téléchargé une fois, en https, depuis la page de publication de LiveKit', compte(b.journal(), /^curl .*https:\/\/github\.com\/livekit\/livekit\/releases\/download\/v1\.13\.7\/livekit_1\.13\.7_linux_amd64\.tar\.gz/) === 1);
      vrai('un compte système à lui, sans shell ni dossier', b.journal().some(l => /^useradd --system --no-create-home --home-dir \/nonexistent --shell \/usr\/sbin\/nologin --user-group opmsg-visio-beta$/.test(l)));
      /* l'unité */
      const u = b.octets('etc/systemd/system/opmsg-visio-beta.service') || '';
      for (const [nom, re] of [
        ['elle tourne sous SON compte', /^User=opmsg-visio-beta$/m],
        ['⛔ le pare-feu est posé AVANT chaque démarrage (en root) et retiré à l\'arrêt', /^ExecStartPre=\+\/usr\/local\/sbin\/opmsg-visio-pare-feu start$[\s\S]*^ExecStopPost=\+\/usr\/local\/sbin\/opmsg-visio-pare-feu stop$/m],
        ['   avec SON compte et SA chaîne', /^Environment=OPMSG_VISIO_UTILISATEUR=opmsg-visio-beta$[\s\S]*^Environment=OPMSG_VISIO_CHAINE=OPMSG-VISIO-BETA$/m],
        ['LiveKit lit SA configuration', /^ExecStart=\/opt\/opmsg\/livekit\/1\.13\.7\/livekit-server --config \/etc\/opmsg\/visio-beta\.yaml$/m],
        ['et ploie avant OP GESTION (poids, mémoire bornée, sans privilège de plus)', /^NoNewPrivileges=true$[\s\S]*^MemoryMax=1G$[\s\S]*^CPUWeight=20$/m],
      ]) vrai('   unité : ' + nom, re.test(u));
      /* le pare-feu dans le noyau */
      const k4 = b.noyau('v4'), k6 = b.noyau('v6');
      vrai('⛔ le pare-feu est dans le noyau : le saut depuis OUTPUT pour le compte de la visio', k4.regles.includes('OUTPUT|-m owner --uid-owner opmsg-visio-beta -j OPMSG-VISIO-BETA') && k6.regles.includes('OUTPUT|-m owner --uid-owner opmsg-visio-beta -j OPMSG-VISIO-BETA'));
      const chaine4 = k4.regles.filter(l => l.startsWith('OPMSG-VISIO-BETA|')).map(l => l.slice('OPMSG-VISIO-BETA|'.length));
      v('   ⛔ l\'UDP vers la machine elle-même est refusé (le résolveur local excepté), puis chaque réseau privé', chaine4, ['-p udp --dport 53 -m addrtype --dst-type LOCAL -j RETURN', '-p udp -m addrtype --dst-type LOCAL -j DROP', '-p udp -d 0.0.0.0/8 -j DROP', '-p udp -d 10.0.0.0/8 -j DROP', '-p udp -d 100.64.0.0/10 -j DROP', '-p udp -d 127.0.0.0/8 -j DROP', '-p udp -d 169.254.0.0/16 -j DROP', '-p udp -d 172.16.0.0/12 -j DROP', '-p udp -d 192.168.0.0/16 -j DROP']);
      vrai('   et en IPv6 (la boucle, les réseaux privés et de lien local, l\'IPv4 écrite en IPv6, NAT64)', ['::1/128', 'fc00::/7', 'fe80::/10', '::ffff:0:0/96', '64:ff9b::/96'].every(p => k6.regles.includes('OPMSG-VISIO-BETA|-p udp -d ' + p + ' -j DROP')));
      /* nginx */
      const ngx = b.octets(NGX_B);
      const L = ngx.split('\n'), iA = L.indexOf(ANCRE_B);
      vrai('⛔ nginx : trois lignes entre deux marques, JUSTE APRÈS la clé TLS du bloc HTTPS de l\'instance', iA > 0 && /^    # >>> opmsg-visio/.test(L[iA + 1]) && L[iA + 2] === '    include /etc/nginx/opmsg/visio-beta.locations;' && L[iA + 3] === '    # <<< opmsg-visio');
      v('   et RIEN d\'autre ne change dans le fichier de l\'instance', L.filter((l, i) => i < iA + 1 || i > iA + 3).join('\n'), ngxAvant);
      const ex = b.octets('etc/nginx/opmsg/visio-beta.locations') || '';
      const exCode = ex.split('\n').filter(l => !/^\s*#/.test(l)).join('\n');
      for (const [nom, re, attendu] of [
        ['le chemin /rtc SEUL (et /rtc/v1, …/validate) — ni /twirp, ni la page d\'accueil de LiveKit', /location ~ \^\/rtc\(\/v1\)\?\(\/validate\)\?\$ \{/, true],
        ['⛔ AUCUN journal d\'accès (le jeton voyage dans l\'adresse)', /^\s*access_log off;$/m, true],
        ['vers LiveKit, en boucle locale, en WebSocket', /proxy_pass http:\/\/127\.0\.0\.1:7880;[\s\S]*proxy_set_header Upgrade \$http_upgrade;[\s\S]*proxy_set_header Connection \$http_connection;/, true],
        ['⛔ SANS l\'adresse des participants (aucun X-Forwarded-For, aucun X-Real-IP)', /X-Forwarded-For|X-Real-IP/i, false],
        ['le plafond de débit de l\'instance (par réseau)', /limit_req zone=opmsg_beta burst=20 nodelay;/, true],
        ['ni /twirp, ni « location / »', /twirp|location \/ /, false],
      ]) v('   extrait : ' + nom, re.test(exCode), attendu);
      /* l'ordre */
      const j = b.journal();
      const etapes = [/^systemctl restart opmsg-visio-beta$/, /^ExecStartPre \/usr\/local\/sbin\/opmsg-visio-pare-feu start$/, /^verifier-visio beta config=oui$/, /^nginx -t$/, /^systemctl reload nginx$/, /^verifier-visio beta --public config=oui$/, /^systemctl restart teamop-msg@beta$/, /^verifier-visio beta --avis \d+ config=oui$/, /^ufw allow 7881\/tcp comment opmsg-visio-beta$/, /^ufw allow 7882\/udp comment opmsg-visio-beta$/].map(re => index(j, re));
      vrai('⛔ L\'ORDRE : LiveKit (et son pare-feu) → contrôle local → nginx validé puis rechargé → contrôle public → instance relancée → contrôle des avis → ports ouverts', etapes.every((p, k) => p >= 0 && (k === 0 || p > etapes[k - 1])));
      v('   le contrôle des avis vise le port du SERVICE de l\'instance', j.some(l => l === 'verifier-visio beta --avis ' + b.ports.beta + ' config=oui'), true);
      vrai('   le /health relu dit bien la visio (la configuration LUE par l\'instance relancée la porte)', !!(JSON.parse(lire(path.join(b.E, 'config-lue-beta.json'))).appels || {}).visio);
      vrai('ce qu\'il faut ouvrir dans le panneau de l\'hébergeur est dit à la fin', /TCP 7881 et UDP 7882/.test(r.out) && /bash install-sfu\.sh beta retirer/.test(r.out));

      /* ═══════ 2. REJOUÉ TEL QUEL ═══════ */
      console.log('\nRejoué tel quel');
      const etat1 = b.etat(), n1 = b.journal().length;
      const r2 = await b.lancer(['beta']);
      v('le script réussit encore', r2.status, 0);
      v('⛔ le même disque, fichier pour fichier (empreinte et droits)', b.etat(), etat1);
      const j2 = b.journal().slice(n1);
      v('⛔ rien n\'est relancé ni rechargé ni retéléchargé, et les contrôles sont rejoués', [compte(j2, /^systemctl restart/), compte(j2, /^systemctl reload nginx/), compte(j2, /^curl /), compte(j2, /^verifier-visio /), compte(j2, /^useradd/)], [0, 0, 0, 3, 0]);
      v('   la paire de clés est REPRISE', visioDe(b, 'beta').secret, vi.secret);
      v('   l\'include nginx n\'est pas dupliqué', (b.octets(NGX_B).match(/include \/etc\/nginx\/opmsg\/visio-beta\.locations;/g) || []).length, 1);

      /* ═══════ 3. LES RÉGLAGES POSÉS À LA MAIN SONT GARDÉS ═══════ */
      const c = b.config('beta'); c.appels.visio.maxVideo = 9; fs.writeFileSync(path.join(b.R, 'etc', 'opmsg', 'beta.json'), JSON.stringify(c, null, 2) + '\n', { mode: 0o600 });
      const r3 = await b.lancer(['beta']);
      v('un maxVideo posé à la main survit à une réinstallation (le script ne pose que l\'adresse et la paire)', [r3.status, visioDe(b, 'beta').maxVideo, visioDe(b, 'beta').secret], [0, 9, vi.secret]);

      /* ═══════ 4. RETIRER ═══════ */
      console.log('\nRetirer');
      const n4 = b.journal().length;
      const r4 = await b.lancer(['beta', 'retirer']);
      v('« retirer » réussit', r4.status, 0);
      vrai('⛔ l\'instance n\'a plus de visio, et elle est relancée sans', sansVisio(b, 'beta') && compte(b.journal().slice(n4), /^systemctl restart teamop-msg@beta$/) === 1 && !(JSON.parse(lire(path.join(b.E, 'config-lue-beta.json'))).appels || {}).visio);
      v('⛔ nginx : le fichier de l\'instance est REVENU octet pour octet, l\'extrait est parti', [b.octets(NGX_B), b.existe('etc/nginx/opmsg/visio-beta.locations')], [ngxAvant, false]);
      v('⛔ l\'unité et la configuration de LiveKit (qui porte le secret) sont parties', [b.existe('etc/systemd/system/opmsg-visio-beta.service'), b.existe('etc/opmsg/visio-beta.yaml')], [false, false]);
      vrai('   ses ports sont refermés dans ufw', b.journal().slice(n4).some(l => l === 'ufw delete allow 7881/tcp') && b.journal().slice(n4).some(l => l === 'ufw delete allow 7882/udp'));
      vrai('   et le pare-feu de la visio est retiré du noyau à l\'arrêt', !b.noyau('v4').regles.some(l => /OPMSG-VISIO-BETA/.test(l)));
      const r5 = await b.lancer(['beta', 'retirer']);
      v('« retirer » deux fois : sans effet, sans erreur', [r5.status, sansVisio(b, 'beta')], [0, true]);
    } finally { b.fin(); }
  }

  /* ═══════ 5. ÉCHEC = FERMÉ, à chaque étape ═══════ */
  console.log('\nÉchec = fermé, à chaque étape');
  for (const [cas, drapeau, attendu] of [
    ['LiveKit ne démarre pas', 'visio-refuse', /LiveKit n'a pas démarré/],
    ['⛔ le pare-feu ne se pose pas (le noyau refuse une règle) : systemd ne démarre pas LiveKit', 'iptables-refuse-v4', /LiveKit n'a pas démarré/],
    ['⛔ le pare-feu se dit posé mais n\'est pas dans le noyau', 'iptables-oublie-v4', /pare-feu sortant de la visio n'est pas dans le noyau/],
    ['le contrôle local échoue', 'verifier-refuse-local', /LiveKit ne fait pas ce qu'il doit/],
    ['nginx refuse le chemin /rtc', 'nginx-refuse', /nginx refuse/],
    ['le contrôle public échoue', 'verifier-refuse-public', /ne mène pas à LiveKit/],
    ['l\'instance ne voit pas la visio', 'health-visio-ko', /ne voit pas la visio/],
    ['les avis n\'arrivent pas', 'verifier-refuse-avis', /les avis de LiveKit n'arrivent pas/],
  ]) {
    const b = bac();
    try {
      const f = b.instance('beta');
      await b.serveur('beta');
      const avant = fs.readFileSync(f, 'utf8'), ngxAvant = b.octets(NGX_B);
      b.drapeau(drapeau);
      const r = await b.lancer(['beta']);
      const j = b.journal();
      v('[' + cas + '] sortie 1, et le DIT', [r.status, attendu.test(r.out)], [1, true]);
      v('[' + cas + '] ⛔ la configuration de l\'instance est revenue OCTET POUR OCTET', fs.readFileSync(f, 'utf8'), avant);
      v('[' + cas + '] ⛔ nginx est revenu octet pour octet, ni unité ni configuration de LiveKit ne restent', [b.octets(NGX_B), b.existe('etc/nginx/opmsg/visio-beta.locations'), b.existe('etc/systemd/system/opmsg-visio-beta.service'), b.existe('etc/opmsg/visio-beta.yaml')], [ngxAvant, false, false, false]);
      v('[' + cas + '] ⛔ aucun port ouvert', compte(j, /^ufw allow/), 0);
      vrai('[' + cas + '] ⛔ l\'instance ne garde pas la visio (relancée sans, si elle avait été relancée avec)', !(JSON.parse(lire(path.join(b.E, 'config-lue-beta.json'))).appels || {}).visio);
    } finally { b.fin(); }
  }

  /* ═══════ 6. RIEN N'EST ÉCRIT QUAND UNE CONDITION MANQUE ═══════ */
  console.log('\nRien n\'est écrit quand une condition manque');
  for (const [cas, prep, env, attendu, opts] of [
    ['⛔ une archive qui n\'a PAS l\'empreinte attendue', null, { OPMSG_VISIO_EMPREINTE_BANC: '0'.repeat(64) }, /n'a PAS l'empreinte attendue/],
    ['GitHub injoignable', (b) => b.drapeau('curl-refuse'), null, /téléchargement de LiveKit a échoué/],
    ['une adresse de route PRIVÉE (un hébergeur qui traduit)', (b) => b.drapeau('ip-privee'), null, /n'est pas publique[\s\S]*OPMSG_VISIO_IP/],
    ['un processeur que LiveKit ne publie pas', (b) => b.ecrireEtat('arch', 'riscv64\n'), null, /processeur non pris en charge/],
    ['nginx inactif (Caddy)', (b) => b.drapeau('nginx-actif', false), null, /nginx n'est pas actif/],
    ['un binaire qui ne dit pas la bonne version', null, null, /ne se dit pas « livekit-server version 1\.13\.7 »/, { version: '1.12.0' }],
    ['une version du service d\'avant la visio (ni contrôle, ni pare-feu)', null, null, /antérieure au serveur de visio/, { version_service: 'ancienne' }],
  ]) {
    const b = bac(opts || {});
    try {
      const f = b.instance('beta');
      await b.serveur('beta');
      if (prep) prep(b);
      const avant = b.etat();
      const r = await b.lancer(['beta'], env);
      v('[' + cas + '] sortie 1, et le DIT', [r.status, attendu.test(r.out)], [1, true]);
      const apres = b.etat();
      v('[' + cas + '] ⛔ RIEN n\'a changé sur le disque', Object.keys(apres).filter(k => apres[k] !== avant[k]).concat(Object.keys(avant).filter(k => !(k in apres))), []);
      v('[' + cas + '] ⛔ aucun service relancé, aucun port ouvert', compte(b.journal(), /^systemctl (restart|reload)|^ufw allow/), 0);
      void f;
    } finally { b.fin(); }
  }
  {
    const b = bac();
    try {
      b.instance('beta');
      await b.serveur('beta');
      b.drapeau('ip-privee');
      const r = await b.lancer(['beta'], { OPMSG_VISIO_IP: '198.51.100.20' });
      v('OPMSG_VISIO_IP corrige une route privée : l\'adresse posée est celle-là', [r.status, /node_ip: "198\.51\.100\.20"/.test(b.octets('etc/opmsg/visio-beta.yaml') || '')], [0, true]);
      const r2 = await b.lancer(['beta'], { OPMSG_VISIO_IP: '10.9.9.9' });
      v('   mais une adresse PRIVÉE donnée à la main est refusée', r2.status, 1);
    } finally { b.fin(); }
  }

  /* ═══════ 7. DEUX INSTANCES : deux paires, deux comptes, deux chaînes, deux jeux de ports ═══════ */
  console.log('\nDeux instances côte à côte');
  {
    const b = bac();
    try {
      b.instance('beta'); b.instance('prod');
      await b.serveur('beta'); await b.serveur('prod');
      const rb = await b.lancer(['beta']), rp = await b.lancer(['prod']);
      v('les deux réussissent', [rb.status, rp.status], [0, 0]);
      const vb = visioDe(b, 'beta'), vp = visioDe(b, 'prod');
      vrai('⛔ deux paires DIFFÉRENTES (la bêta ne peut rien sur la production)', vb.cle !== vp.cle && vb.secret !== vp.secret);
      v('deux jeux de ports', [vb.interne, vp.interne, /tcp_port: 7891/.test(b.octets('etc/opmsg/visio-prod.yaml')), /udp_port: 7892/.test(b.octets('etc/opmsg/visio-prod.yaml'))], ['http://127.0.0.1:7880', 'http://127.0.0.1:7890', true, true]);
      vrai('deux comptes, deux chaînes dans le noyau', b.noyau('v4').regles.includes('OUTPUT|-m owner --uid-owner opmsg-visio-beta -j OPMSG-VISIO-BETA') && b.noyau('v4').regles.includes('OUTPUT|-m owner --uid-owner opmsg-visio-prod -j OPMSG-VISIO-PROD'));
      const rr = await b.lancer(['beta', 'retirer']);
      v('⛔ retirer la bêta laisse la production ENTIÈRE (sa paire, son unité, sa chaîne)', [rr.status, visioDe(b, 'prod').secret, b.existe('etc/systemd/system/opmsg-visio-prod.service'), b.noyau('v4').regles.includes('OUTPUT|-m owner --uid-owner opmsg-visio-prod -j OPMSG-VISIO-PROD')], [0, vp.secret, true, true]);
    } finally { b.fin(); }
  }

  /* ═══════ 8. L'ARGUMENT ═══════ */
  {
    const b = bac();
    try {
      const r = await b.lancer(['production']), r2 = await b.lancer(['beta', 'tout']);
      v('une instance ou un geste inconnu : usage, sortie 2, rien d\'écrit', [r.status, r2.status, /usage/.test(r.out), Object.keys(b.etat())], [2, 2, true, ['etc/', 'etc/nginx/', 'etc/nginx/sites-available/', 'etc/opmsg/']]);
    } finally { b.fin(); }
  }
})().then(() => t.fin(), (e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; });
