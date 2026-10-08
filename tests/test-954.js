/* ⛔ CE QUE CE FICHIER GARDE — LES SALLES PAR LE SERVEUR DE VISIO, CÔTÉ SERVICE : le VRAI service (`server-msg/index.js`) parlé en HTTP, avec un FAUX LiveKit à côté (il répond à la sonde et note chaque
   commande). `test-952` éprouve le module seul, `test-953` le module contre le vrai LiveKit ; celui-ci dit ce que le SERVICE en fait :

     · une salle s'ouvre par la visio quand elle est configurée ET répond — la vue le dit (`visio: true`) et la capacité suit (`appels.visio.maxVideo`, `maxAudio`) ; un appel à deux n'y passe JAMAIS ;
     · LiveKit en panne : la salle NEUVE s'ouvre en maille, avec les capacités de la maille — rien ne se ferme ;
     · ⛔ le jeton d'entrée ne va qu'à qui est PRÉSENT, depuis l'appareil LIÉ, dans une salle par la visio ; il vaut pour CETTE salle (préfixée de l'instance) et CETTE personne, et une salle audio ne laisse
       publier que le micro ; un plafond par personne ;
     · ⛔ les AVIS de LiveKit ne s'acceptent que de la boucle locale SANS nginx (un `X-Forwarded-For` → 404) et signés sur le corps exact ; une ENTRÉE non admise (invitée qui sonne, retirée, autre instance)
       est retirée aussitôt, une entrée admise jamais ;
     · ⛔ retirer quelqu'un, le voir partir, terminer pour tous : LiveKit en est informé (RemoveParticipant, DeleteRoom) — sinon une personne retirée continuerait de voir et d'entendre ;
     · la salle pleine DIT sa capacité (`max`), quelle qu'elle soit ;
     · `/health` dit la visio par des compteurs, sans adresse ni clé ; la politique de la page nomme l'adresse de la visio, et elle seule. */
'use strict';
const path = require('path'), crypto = require('crypto'), http = require('http');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const V = require(path.join(T.SERVICE, 'visio.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (180 s)'); process.exit(1); }, 180000).unref();

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;
const dit = (rep) => [rep.code, rep.j && rep.j.error];
const CLE = 'APIbanc' + crypto.randomBytes(3).toString('hex'), SECRET = crypto.randomBytes(36).toString('base64url');
const charge = (j) => JSON.parse(Buffer.from(j.split('.')[1], 'base64url'));
const bienSigne = (j) => { const p = j.split('.'); return crypto.createHmac('sha256', SECRET).update(p[0] + '.' + p[1]).digest('base64url') === p[2]; };

/* Le faux LiveKit : `/` répond « OK » (ou non), chaque commande Twirp est notée avec son jeton. */
function fauxLiveKit(port) {
  const f = { sondeOk: true, commandes: [] };
  f.serveur = http.createServer((q, r) => {
    const m = []; q.on('data', c => m.push(c));
    q.on('end', () => {
      if (q.method === 'GET' && q.url === '/') { r.writeHead(f.sondeOk ? 200 : 503); return r.end(f.sondeOk ? 'OK' : 'non'); }
      const x = /^\/twirp\/livekit\.RoomService\/(\w+)$/.exec(q.url);
      if (!x) { r.writeHead(404); return r.end(); }
      let corps = null; try { corps = JSON.parse(Buffer.concat(m).toString('utf8')); } catch (e) { corps = null; }
      f.commandes.push({ methode: x[1], corps, jeton: String(q.headers.authorization || '').replace(/^Bearer /, '') });
      r.writeHead(200, { 'Content-Type': 'application/json' }); r.end('{}');
    });
  });
  return new Promise(ok => f.serveur.listen(port, '127.0.0.1', () => ok(f)));
}

(async () => {
  const portLk = await T.portLibre();
  const LK = await fauxLiveKit(portLk);
  const URL_VISIO = 'ws://127.0.0.1:' + portLk;
  /* la maille à 2 en vidéo et 6 en audio, la visio à 3 en vidéo et 7 en audio : la capacité se voit à quatre personnes, sans en inventer douze */
  const svc = await T.lancerService({ config: { appels: { maxVideo: 2, maxAudio: 6, balayageMs: 200, perduMs: 600000,
    visio: { url: URL_VISIO, interne: 'http://127.0.0.1:' + portLk, cle: CLE, secret: SECRET, maxVideo: 3, maxAudio: 7, sondeMs: 100, delaiMs: 1000 } } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: Date.now });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const avis = (corpsObj, entetes, secret) => {
    const corps = Buffer.from(JSON.stringify(corpsObj));
    const j = V.signer({ iss: CLE, exp: Math.floor(Date.now() / 1000) + 300, sha256: crypto.createHash('sha256').update(corps).digest('base64') }, secret || SECRET);
    return fetch(svc.base + '/api/visio/avis', { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/webhook+json', Authorization: j }, entetes || {}), body: corps }).then(async r => ({ code: r.status, txt: await r.text() }));
  };
  const commandesDe = (methode) => LK.commandes.filter(c => c.methode === methode);
  const attendreCommande = (pred) => T.attendre(() => LK.commandes.find(pred), 5000, 20);
  const sante = async () => (await (await fetch(svc.base + '/health')).json()).visio;
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
    for (const p of [ben, cleo, dan, eve]) S.contactLier(ana.id, p.id);
    const a1 = cl(ana), a2 = cl(ana), b1 = cl(ben), c1 = cl(cleo), d1 = cl(dan), e1 = cl(eve);
    const groupe = S.convCreerGroupe({ createur: ana.id, nom: 'Équipe', membres: [ben.id, cleo.id, dan.id], annonces_seules: false, ephemere_s: 0 }).id;
    const libere = async (...cs) => { for (const c of cs) { const r = await c.get('/api/appels'); if (r.j && r.j.actif) await c.post('/api/appels/' + r.j.actif.id + '/quitter', {}); } };

    console.log('La santé, la politique de la page');
    {
      const s = await T.attendre(async () => { const x = await sante(); return x && x.ok ? x : null; }, 5000, 50);
      v('⛔ /health : la visio est configurée et répond (sa sonde a vu « OK »)', s && [s.configuree, s.ok, s.echecs], [true, true, 0]);
      const brut = await (await fetch(svc.base + '/health')).text();
      vrai('⛔ /health ne dit ni la clé, ni le secret, ni l\'adresse de la visio', !brut.includes(CLE) && !brut.includes(SECRET) && !brut.includes(String(portLk)));
      const csp = (await fetch(svc.base + '/')).headers.get('content-security-policy') || '';
      v('la politique de la PAGE permet la visio (ws ET http de son adresse), et rien d\'autre qu\'elle et le service', /connect-src ([^;]+)/.exec(csp)[1].trim().split(/\s+/), ["'self'", URL_VISIO, 'http://127.0.0.1:' + portLk]);
    }

    let salleVideo;
    console.log('\nUne salle s\'ouvre par la visio : la vue le dit, la capacité suit');
    {
      const r = await a1.post('/api/appels', { conv: groupe, type: 'video' });
      salleVideo = r.j.appel;
      v('appel de groupe en vidéo : 201, `visio: true`, capacité 3 (celle de la visio, la maille en porterait 2)', [r.code, salleVideo.visio, salleVideo.capacite], [201, true, 3]);
      const un = await e1.post('/api/appels', { uid: ana.id, type: 'video' });
      v('un appel à DEUX (Eve appelle Ana, occupée) n\'est jamais une salle par la visio', [un.code, un.j && un.j.error], [409, 'occupe']);
    }

    console.log('\nLe jeton d\'entrée : présent, appareil lié, une salle, une personne');
    {
      const id = salleVideo.id;
      const r = await a1.post('/api/salles/' + id + '/visio', {});
      v('Ana (hôte, présente, appareil lié) : 200, l\'adresse de la visio et un jeton', [r.code, r.j && r.j.url, typeof (r.j && r.j.jeton)], [200, URL_VISIO, 'string']);
      const c = charge(r.j.jeton);
      v('⛔ le jeton : signé du secret, pour CETTE personne et CETTE salle (préfixée de l\'instance), sources vidéo, plafond de la salle', [bienSigne(r.j.jeton), c.iss, c.sub, c.video.room, c.video.canPublishSources, c.roomConfig && c.roomConfig.maxParticipants],
        [true, CLE, ana.id, 'beta-' + id, ['camera', 'microphone', 'screen_share', 'screen_share_audio'], 3]);
      v('⛔ Ben, qui SONNE encore (invité, pas présent) : 409 `appel_pas_en_cours`', dit(await b1.post('/api/salles/' + id + '/visio', {})), [409, 'appel_pas_en_cours']);
      v('⛔ Ana depuis un AUTRE appareil (session non liée à l\'appel) : 403 `appareil_non_lie`', dit(await a2.post('/api/salles/' + id + '/visio', {})), [403, 'appareil_non_lie']);
      v('⛔ Eve, qui n\'est pas dans la salle : le même 404 qu\'une salle qui n\'existe pas', dit(await e1.post('/api/salles/' + id + '/visio', {})), [404, 'introuvable']);
      await b1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const rb = await b1.post('/api/salles/' + id + '/visio', {});
      v('Ben a répondu : son jeton (sujet Ben, même salle)', [rb.code, charge(rb.j.jeton).sub, charge(rb.j.jeton).video.room], [200, ben.id, 'beta-' + id]);
    }

    console.log('\nLa porte : les avis de LiveKit');
    {
      const id = salleVideo.id, nom = 'beta-' + id;
      const n0 = LK.commandes.length;
      const ok = await avis({ event: 'participant_joined', room: { name: nom }, participant: { identity: ana.id } });
      v('une entrée ADMISE (Ana, présente) : 200, et aucune commande vers LiveKit', [ok.code, LK.commandes.length - n0], [200, 0]);
      const intrus = await avis({ event: 'participant_joined', room: { name: nom }, participant: { identity: cleo.id } });
      const retrait = await attendreCommande(c => c.methode === 'RemoveParticipant' && c.corps && c.corps.identity === cleo.id && c.corps.room === nom);
      v('⛔ une entrée NON admise (Cleo sonne, n\'est pas présente — un jeton rejoué) : 200, et RemoveParticipant aussitôt', [intrus.code, !!retrait], [200, true]);
      vrai('   la commande porte un jeton d\'administration de CETTE salle, signé du secret', retrait && bienSigne(retrait.jeton) && JSON.stringify(charge(retrait.jeton).video) === JSON.stringify({ roomAdmin: true, room: nom }));
      const autre = await avis({ event: 'participant_joined', room: { name: 'prod-' + id }, participant: { identity: ana.id } });
      v('⛔ la même personne dans une salle d\'une AUTRE instance (`prod-…`) : retirée', [autre.code, !!(await attendreCommande(c => c.methode === 'RemoveParticipant' && c.corps.room === 'prod-' + id))], [200, true]);
      v('⛔ un avis qui passe par nginx (`X-Forwarded-For`) : 404, comme une route qui n\'existe pas', (await avis({ event: 'participant_joined', room: { name: nom }, participant: { identity: cleo.id } }, { 'X-Forwarded-For': '203.0.113.9' })).code, 404);
      v('⛔ un avis signé d\'un autre secret : 401', (await avis({ event: 'participant_joined', room: { name: nom }, participant: { identity: cleo.id } }, null, crypto.randomBytes(36).toString('base64url'))).code, 401);
      const corps = Buffer.from(JSON.stringify({ event: 'participant_joined', room: { name: nom }, participant: { identity: cleo.id } }));
      const jVrai = V.signer({ iss: CLE, exp: Math.floor(Date.now() / 1000) + 300, sha256: crypto.createHash('sha256').update(Buffer.from('autre chose')).digest('base64') }, SECRET);
      v('⛔ un vrai jeton sur un AUTRE corps : 401', (await fetch(svc.base + '/api/visio/avis', { method: 'POST', headers: { 'Content-Type': 'application/webhook+json', Authorization: jVrai }, body: corps })).status, 401);
      v('⛔ sans jeton : 401 ; en JSON ordinaire, sans jeton : 401 aussi (le lecteur JSON ne prend pas le corps)', [
        (await fetch(svc.base + '/api/visio/avis', { method: 'POST', headers: { 'Content-Type': 'application/webhook+json' }, body: corps })).status,
        (await fetch(svc.base + '/api/visio/avis', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: corps })).status], [401, 401]);
      const s = await sante();
      vrai('la santé compte les avis refusés et les retraits forcés', s.avisRefuses >= 3 && s.retraitsForces >= 2);
    }

    console.log('\nRetirer, partir, terminer : LiveKit en est informé');
    {
      const id = salleVideo.id, nom = 'beta-' + id;
      await c1.post('/api/appels/' + id + '/repondre', { accepte: true });
      const plein = await d1.post('/api/appels/' + id + '/repondre', { accepte: true });
      v('⛔ la quatrième personne dans une salle de trois : 409 `appel_complet` AVEC sa capacité (la page dit « 3 personnes au plus »)', [dit(plein), plein.j && plein.j.max], [[409, 'appel_complet'], 3]);
      const n0 = commandesDe('RemoveParticipant').filter(c => c.corps.identity === cleo.id).length;
      const ex = await a1.post('/api/salles/' + id + '/exclure', { uid: cleo.id });
      const retire = await T.attendre(() => commandesDe('RemoveParticipant').filter(c => c.corps.identity === cleo.id && c.corps.room === nom).length > n0, 5000, 20);
      v('⛔ l\'hôte RETIRE Cleo : 200, et RemoveParticipant(Cleo) chez LiveKit (sa connexion s\'y coupe)', [ex.code, !!retire], [200, true]);
      const n1 = commandesDe('RemoveParticipant').filter(c => c.corps.identity === ben.id).length;
      await b1.post('/api/appels/' + id + '/quitter', {});
      vrai('Ben part (la salle continue) : RemoveParticipant(Ben)', !!(await T.attendre(() => commandesDe('RemoveParticipant').filter(c => c.corps.identity === ben.id).length > n1, 5000, 20)));
      const t = await a1.post('/api/salles/' + id + '/terminer', {});
      v('⛔ l\'hôte termine pour tous : 200, et DeleteRoom de CETTE salle (tout le monde est déconnecté)', [t.code, !!(await attendreCommande(c => c.methode === 'DeleteRoom' && c.corps.room === nom))], [200, true]);
      vrai('   la commande de fermeture porte le droit de création, et lui seul', JSON.stringify(charge(commandesDe('DeleteRoom').find(c => c.corps.room === nom).jeton).video) === JSON.stringify({ roomCreate: true }));
      await libere(a1, b1, c1, d1);
    }

    console.log('\nUne salle audio ; la dernière personne qui part ferme la salle chez LiveKit');
    {
      const r = await a1.post('/api/appels', { conv: groupe, type: 'audio' });
      const a = r.j.appel;
      v('appel de groupe en AUDIO : `visio: true`, capacité 7', [a.visio, a.capacite], [true, 7]);
      const j = await a1.post('/api/salles/' + a.id + '/visio', {});
      v('⛔ son jeton ne laisse publier QUE le micro (ni caméra ni écran dans une salle audio)', charge(j.j.jeton).video.canPublishSources, ['microphone']);
      await a1.post('/api/appels/' + a.id + '/quitter', {});
      vrai('Ana, seule, part : DeleteRoom (la salle est finie)', !!(await attendreCommande(c => c.methode === 'DeleteRoom' && c.corps.room === 'beta-' + a.id)));
      await libere(a1);
    }

    console.log('\nLiveKit en panne : une salle NEUVE s\'ouvre en maille');
    {
      LK.sondeOk = false;
      const hs = await T.attendre(async () => { const x = await sante(); return x && x.ok === false ? x : null; }, 5000, 50);
      v('/health : configurée, mais ne répond plus', hs && [hs.configuree, hs.ok], [true, false]);
      const r = await a1.post('/api/appels', { conv: groupe, type: 'video' });
      v('⛔ la salle neuve : `visio: false`, capacité de la MAILLE (2) — rien n\'est refusé', [r.code, r.j.appel.visio, r.j.appel.capacite], [201, false, 2]);
      v('⛔ et son jeton de visio n\'existe pas : 409 `pas_de_visio`', dit(await a1.post('/api/salles/' + r.j.appel.id + '/visio', {})), [409, 'pas_de_visio']);
      await libere(a1);
      LK.sondeOk = true;
      const re = await T.attendre(async () => { const x = await sante(); return x && x.ok ? x : null; }, 5000, 50);
      vrai('LiveKit revient : en service, la salle suivante repasse par la visio', !!re && (await (async () => { const x = await a1.post('/api/appels', { conv: groupe, type: 'video' }); await libere(a1); return x.j.appel.visio; })()));
    }

    console.log('\nLe plafond des jetons');
    {
      /* Dan n'a encore demandé AUCUN jeton : le plafond se compte par personne, toutes salles confondues (Ana en a déjà pris plus haut) */
      const r = await d1.post('/api/appels', { conv: groupe, type: 'video' });
      const id = r.j.appel.id;
      const codes = [];
      for (let i = 0; i < 31; i++) codes.push((await d1.post('/api/salles/' + id + '/visio', {})).code);
      v('trente jetons par dix minutes et par personne : le trente-et-unième est refusé (429)', [codes.filter(c => c === 200).length, codes[codes.length - 1]], [30, 429]);
      await libere(d1);
    }

    /* ⛔ LE CONTRÔLE DE L'INSTALLATION (`outils/verifier-visio.js`) CONTRE UN LIVEKIT QUI NE VÉRIFIE RIEN : le faux de ce banc répond 200 à toute commande, quelle que soit sa signature, et ne
       connaît pas la signalisation. C'est exactement le serveur que le contrôle doit REFUSER d'exposer — un contrôle qui rendrait toujours ✓ ne se verrait pas autrement (le vrai LiveKit, lui, est joué
       par test-953, qui ne tourne pas sans son binaire). */
    console.log('\nLe contrôle de l\'installation refuse un LiveKit qui ne vérifie rien');
    {
      const os = require('os'), fs = require('fs'), { spawn } = require('child_process');
      /* ⛔ un processus ENFANT asynchrone : le faux LiveKit vit dans CE processus — `spawnSync` le figerait, et le contrôle ne lirait que des délais dépassés */
      const lancer = (args, env) => new Promise((ok) => { const p = spawn(process.execPath, args, { env }); let out = '', err = ''; p.stdout.on('data', x => { out += x; }); p.stderr.on('data', x => { err += x; }); p.on('close', (status) => ok({ status, stdout: out, stderr: err })); });
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-verif-visio-'));
      const cfg = path.join(d, 'beta.json');
      fs.writeFileSync(cfg, JSON.stringify({ appels: { visio: { url: URL_VISIO, interne: 'http://127.0.0.1:' + portLk, cle: CLE, secret: SECRET } } }), { mode: 0o600 });
      LK.sondeOk = true;
      const r = await lancer([path.join(T.SERVICE, 'outils', 'verifier-visio.js'), 'beta'], Object.assign({}, process.env, { OPMSG_CONFIG: cfg }));
      v('⛔ sortie 1, et il NOMME ce qui ne va pas : une clé fausse ACCEPTÉE, une signalisation qui ne demande aucun jeton', [r.status, /✗ ⛔ une clé FAUSSE y est refusée/.test(r.stdout), /✗ ⛔ sa signalisation REFUSE qui n'a pas de jeton/.test(r.stdout)], [1, true, true]);
      vrai('   la sonde du faux, elle, répond « OK » (le contrôle ne tombe pas pour une autre raison : population)', /✓ LiveKit répond à sa sonde/.test(r.stdout));
      v('⛔ ni le secret ni un jeton dans sa sortie', [String(r.stdout + r.stderr).includes(SECRET), /eyJ[A-Za-z0-9_-]{10,}/.test(r.stdout + r.stderr)], [false, false]);
      fs.rmSync(d, { recursive: true, force: true });
    }
  } catch (e) {
    console.error(e); process.exitCode = 1;
  } finally {
    try { S.fermer(); } catch (e) { /* déjà fermé */ }
    await svc.arreter();
    LK.serveur.close();
  }
  fin();
})();
