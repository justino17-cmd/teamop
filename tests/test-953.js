/* ⛔ CE QUE CE FICHIER GARDE — `server-msg/visio.js` CONTRE UN VRAI LIVEKIT. `test-952` éprouve le module contre un faux ; ici, la version épinglée (v1.13.7) dit elle-même si nos
   jetons faits main sont les siens, si nos commandes sont celles qu'elle comprend, et si les AVIS qu'elle signe passent notre vérification — la couture qu'aucun faux ne peut
   prouver : un faux reproduit ce qu'on CROIT du format, LiveKit applique ce qu'il EST.

   Le binaire : `LIVEKIT_SERVER_BIN`, sinon `livekit-server` dans le PATH. Absent, le banc le DIT et sort en succès sans ✓ (le plancher de la porte le rattrape) — il se construit
   depuis les sources épinglées : `go mod download github.com/livekit/livekit-server@v1.13.7` puis `go build ./cmd/server` dans une copie du module (le `replace` de son go.mod
   interdit `go install …@v1.13.7`). Tout se passe sur 127.0.0.1, ports libres, configuration jetable.

   Les contrôles marqués ⛔ :
     · un jeton d'entrée fait main est ACCEPTÉ par LiveKit, et le même signé d'un autre secret est REFUSÉ (sinon la signature serait décorative) ;
     · les avis que LiveKit envoie passent `avisLire` — leur forme réelle : jeton NU dans `Authorization`, empreinte base64 du corps exact ;
     · un avis rejoué avec un corps modifié est refusé, même porté par le vrai jeton de LiveKit ;
     · la sonde voit LiveKit tomber (deux ratées) et revenir. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto');
const { spawn, execFileSync } = require('child_process');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const V = require(path.join(T.SERVICE, 'visio.js'));

function binaire() {
  if (process.env.LIVEKIT_SERVER_BIN && fs.existsSync(process.env.LIVEKIT_SERVER_BIN)) return process.env.LIVEKIT_SERVER_BIN;
  try { const p = execFileSync('sh', ['-c', 'command -v livekit-server'], { encoding: 'utf8' }).trim(); if (p) return p; } catch (e) { }
  return null;
}
const BIN = binaire();
if (!BIN) { console.log('  — livekit-server absent (LIVEKIT_SERVER_BIN, ou dans le PATH) : banc non exécuté'); console.log('\n0 ✓  0 ✗'); process.exit(0); }

(async () => {
  const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-visio-'));
  const port = await T.portLibre(), portTcp = await T.portLibre(), portUdp = await T.portLibre(), portAvis = await T.portLibre();
  const CLE = 'APIbanc' + crypto.randomBytes(4).toString('hex'), SECRET = crypto.randomBytes(32).toString('base64url');
  /* Le récepteur des avis : ce que LiveKit envoie VRAIMENT (en-têtes et corps bruts). */
  const avis = [];
  const recepteur = http.createServer((q, r) => { const m = []; q.on('data', c => m.push(c)); q.on('end', () => { avis.push({ auth: q.headers.authorization, type: q.headers['content-type'], corps: Buffer.concat(m) }); r.end('ok'); }); });
  await new Promise(r => recepteur.listen(portAvis, '127.0.0.1', r));
  const conf = ['port: ' + port, 'bind_addresses: ["127.0.0.1"]', 'rtc:', '  tcp_port: ' + portTcp, '  udp_port: ' + portUdp, '  use_external_ip: false', '  node_ip: 127.0.0.1',
    'keys:', '  ' + CLE + ': ' + SECRET, 'webhook:', '  api_key: ' + CLE, '  urls:', '    - http://127.0.0.1:' + portAvis + '/avis', 'room:', '  empty_timeout: 30', 'logging:', '  level: warn'].join('\n');
  fs.writeFileSync(path.join(dossier, 'livekit.yaml'), conf, { mode: 0o600 });
  let lk = null;
  const lancer = () => { lk = spawn(BIN, ['--config', path.join(dossier, 'livekit.yaml')], { stdio: ['ignore', 'ignore', 'pipe'] }); lk.stderr.on('data', () => { }); };
  const arreter = () => new Promise(r => { if (!lk || lk.exitCode !== null) return r(); lk.once('exit', r); lk.kill('SIGTERM'); });
  lancer();
  const interne = 'http://127.0.0.1:' + port;
  const pret = await T.attendre(async () => { try { return (await fetch(interne + '/')).ok; } catch (e) { return false; } }, 20000, 100);
  vrai('LiveKit démarre (version épinglée) et répond sur la boucle locale', !!pret);
  const version = execFileSync(BIN, ['--version'], { encoding: 'utf8' }).trim();
  v('la version qui répond est celle qu\'on épingle', version, 'livekit-server version 1.13.7');

  const visio = { url: 'ws://127.0.0.1:' + port, interne, cle: CLE, ttlS: 120, sondeMs: 1000, delaiMs: 2000 };
  Object.defineProperty(visio, 'secret', { value: SECRET, enumerable: false });
  const vi = V.creerVisio({ visio });

  console.log('\nLa sonde');
  await vi.sonder();
  v('« OK » de LiveKit : en service', vi.actif(), true);

  console.log('\nLes jetons faits main, jugés par LiveKit lui-même');
  {
    const j = vi.jetonEntree({ salle: 'S-banc', identite: 'u1', nom: 'Camille', audioSeul: false, maxParticipants: 12 });
    const r = await fetch(interne + '/rtc/validate?access_token=' + encodeURIComponent(j));
    v('⛔ jeton d\'entrée accepté (200 « success »)', [r.status, (await r.text()).trim()], [200, 'success']);
    const faux = V.creerVisio({ visio: Object.defineProperty(Object.assign({}, visio), 'secret', { value: crypto.randomBytes(32).toString('base64url') }) });
    const r2 = await fetch(interne + '/rtc/validate?access_token=' + encodeURIComponent(faux.jetonEntree({ salle: 'S-banc', identite: 'u1', nom: 'X' })));
    v('⛔ le même, signé d\'un autre secret : refusé (401)', r2.status, 401);
    const echu = V.signer({ iss: CLE, sub: 'u1', exp: Math.floor(Date.now() / 1000) - 120, video: { roomJoin: true, room: 'S-banc' } }, SECRET);
    v('échu depuis deux minutes : refusé', (await fetch(interne + '/rtc/validate?access_token=' + encodeURIComponent(echu))).status, 401);
  }

  console.log('\nLes commandes et les avis');
  {
    /* Créer une salle par LiveKit déclenche l'avis `room_started` : c'est le vrai format d'avis qu'on attrape ici. */
    const adm = V.signer({ iss: CLE, exp: Math.floor(Date.now() / 1000) + 60, video: { roomCreate: true } }, SECRET);
    const cr = await fetch(interne + '/twirp/livekit.RoomService/CreateRoom', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + adm }, body: JSON.stringify({ name: 'S-avis' }) });
    v('une salle se crée (pour provoquer un avis)', cr.status, 200);
    const recu = await T.attendre(() => avis.find(a => { try { return JSON.parse(a.corps).event === 'room_started'; } catch (e) { return false; } }), 15000, 50);
    vrai('LiveKit a envoyé l\'avis room_started', !!recu);
    if (recu) {
      v('sa forme réelle : jeton NU (sans « Bearer »), type application/webhook+json', [/^Bearer /.test(recu.auth || ''), recu.type], [false, 'application/webhook+json']);
      const lu = vi.avisLire(recu.auth, recu.corps);
      v('⛔ notre vérification l\'accepte et le lit', lu && [lu.event, lu.room && lu.room.name], ['room_started', 'S-avis']);
      const change = Buffer.from(recu.corps.toString('utf8').replace('S-avis', 'S-autr'));
      v('⛔ le vrai jeton de LiveKit sur un corps modifié : refusé', vi.avisLire(recu.auth, change), null);
    }
    v('RemoveParticipant d\'une personne absente : 404 « déjà parti » = réussite', (await vi.retirer('S-avis', 'personne')).ok, true);
    const f = await vi.fermer('S-avis');
    v('DeleteRoom : la salle est fermée', f.ok, true);
    const fin2 = await T.attendre(() => avis.find(a => { try { const x = JSON.parse(a.corps); return x.event === 'room_finished' && x.room.name === 'S-avis'; } catch (e) { return false; } }), 15000, 50);
    vrai('et LiveKit le confirme par l\'avis room_finished, que notre vérification accepte', !!fin2 && vi.avisLire(fin2.auth, fin2.corps) !== null);
  }

  console.log('\nLiveKit tombe, puis revient');
  {
    await arreter();
    await vi.sonder(); await vi.sonder();
    v('deux sondes ratées : hors service', vi.actif(), false);
    lancer();
    const revenu = await T.attendre(async () => { await vi.sonder(); return vi.actif(); }, 20000, 200);
    vrai('relancé : de retour en service', !!revenu);
  }
  await arreter();
  recepteur.close();
  fs.rmSync(dossier, { recursive: true, force: true });
  fin();
})().catch(e => { console.error(e); process.exitCode = 1; fin(); });
