/* ⛔ CE QUE CE FICHIER GARDE — LE PORTAIL CLIENT SANS FIRESTORE.

   `espace.html` est la dernière page à parler à Firestore en direct : `teamop_requests` (le
   dossier d'inscription), `teamop_threads/{uid}/msgs` (la conversation avec l'équipe) et
   `teamop_news`. La Tour, elle, n'a AUCUN Firebase — elle passe déjà par le serveur.

   Ce banc lance le VRAI `server/index.js` et exerce les routes en HTTP, côté CLIENT et côté
   TOUR, avec de vraies sessions des deux sortes.

   ⛔ LE CONTRÔLE QUI COMPTE LE PLUS EST CELUI DE L'ÉTAT ET DE LA PROMO. Ce dépôt a déjà payé
   exactement cette faute sur `/api/clients/sync` : une valeur du CORPS décidait de ce qu'une
   entreprise avait payé, et tout client du portail s'offrait l'abonnement à vie. Un dossier
   se remplit par son propriétaire ; son ÉTAT et sa PROMO ne se posent que depuis la Tour. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');

const RACINE = path.join(__dirname, '..');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules'))) {
  console.log('\n(sauté : server/node_modules absent)\n0 ✓  0 ✗'); process.exit(0);
}

let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++;
  console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '  → attendu ' + JSON.stringify(b) + ', reçu ' + JSON.stringify(a))); };
const vrai = (t, c) => v(t, !!c, true);

const MDP_ADMIN = 'mot-de-passe-du-banc-739';
const sha = k => crypto.createHash('sha256').update(k).digest('hex');
const dormir = ms => new Promise(r => setTimeout(r, ms));
const BANC = fs.mkdtempSync(path.join(os.tmpdir(), 'portail-739-'));
let enfant = null;

async function monter(actif) {
  const dir = path.join(BANC, 'srv' + (actif ? '1' : '0')), data = path.join(dir, 'data');
  fs.mkdirSync(data, { recursive: true });
  const cfgPath = path.join(dir, 'config.json');
  const webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(cfgPath, JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc',
    adminPassHash: sha(MDP_ADMIN), comptes: { actif: !!actif },
  }));
  const port = await new Promise(res => {
    const s = require('net').createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); });
  });
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfgPath, TEAMOP_DATA: data, PORT: String(port) }),
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let journal = '';
  enfant.stdout.on('data', d => { journal += d; });
  enfant.stderr.on('data', d => { journal += d; });
  const B = 'http://127.0.0.1:' + port;
  let vivant = false;
  for (let i = 0; i < 120 && !vivant; i++) { await dormir(100); try { vivant = (await fetch(B + '/health')).ok; } catch (e) {} }
  return { B, vivant, data, journal: () => journal };
}
const arreter = async () => {
  if (!enfant || enfant.exitCode !== null) return;
  await new Promise(res => { enfant.once('exit', res); try { enfant.kill('SIGKILL'); } catch (e) {} res(); });
};

async function appel(B, chemin, corps, jeton) {
  const o = { method: corps === undefined ? 'GET' : 'POST', headers: { 'Content-Type': 'application/json' } };
  if (corps !== undefined) o.body = JSON.stringify(corps);
  if (jeton) o.headers['Authorization'] = 'Bearer ' + jeton;
  const r = await fetch(B + chemin, o);
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j };
}
const emp = (mdp) => sha('teamop-portail:' + mdp);

(async () => {
  console.log('\n══ 1. LE PORTAIL NE SE MONTE PAS SANS LES COMPTES ══\n');
  {
    const S = await monter(false);
    vrai('   le serveur démarre', S.vivant);
    /* ⛔ La dépendance est EXPLICITE : sans identité, ces routes répondraient à n'importe qui.
       Un `if` oublié quelque part laisserait le portail ouvert le jour où les comptes refusent
       de se monter — et personne ne le verrait, puisque le reste du serveur tournerait. */
    v('⛔ sans les comptes, /api/portail/moi n\'existe pas', (await appel(S.B, '/api/portail/moi')).code, 404);
    v('   ni la liste des actus', (await appel(S.B, '/api/portail/actus')).code, 404);
    await arreter();
  }

  const S = await monter(true);
  if (!S.vivant) { console.log('  ✗ serveur non démarré\n' + S.journal().slice(0, 700) + '\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); await arreter(); process.exit(1); }
  const B = S.B;
  vrai('   avec les comptes, le portail est monté', /portail client : monté/.test(S.journal()));

  /* Deux clients et un patron : c'est le minimum pour qu'« un autre » veuille dire quelque chose. */
  await appel(B, '/api/compte/creer', { email: 'alice@exemple.fr', h: emp('mot-de-passe-alice'), prenom: 'Alice', nom: 'Martin' });
  await appel(B, '/api/compte/creer', { email: 'bob@exemple.fr', h: emp('mot-de-passe-bob'), prenom: 'Bob', nom: 'Durand' });
  const jA = (await appel(B, '/api/compte/connexion', { email: 'alice@exemple.fr', h: emp('mot-de-passe-alice') })).j.jeton;
  const jB = (await appel(B, '/api/compte/connexion', { email: 'bob@exemple.fr', h: emp('mot-de-passe-bob') })).j.jeton;
  const rTour = await appel(B, '/api/monitor/login', { nom: 'patron', pass: MDP_ADMIN });
  const jTour = rTour.j && rTour.j.token;
  vrai('   et on a bien un jeton de Tour', /^[a-f0-9]{48}$/.test(String(jTour)));

  console.log('\n══ 2. LE DOSSIER D\'INSCRIPTION ══\n');
  {
    v('   sans session, /moi refuse', (await appel(B, '/api/portail/moi')).code, 401);
    v('   avec session, il répond', (await appel(B, '/api/portail/moi', undefined, jA)).code, 200);
    v('   et le dossier est vide au départ', (await appel(B, '/api/portail/moi', undefined, jA)).j.dossier, null);
    const r = await appel(B, '/api/portail/demande', { prenom: 'Alice', nom: 'Martin', societe: 'Nettoyage Martin', apps: ['gestion'], formule: 'pro', users: 4 }, jA);
    v('   la demande s\'enregistre', r.code, 200);
    v('   et se relit', (await appel(B, '/api/portail/moi', undefined, jA)).j.dossier.societe, 'Nettoyage Martin');
    v('   avec ses applications', (await appel(B, '/api/portail/moi', undefined, jA)).j.dossier.apps, ['gestion']);
    /* ⛔ Bob ne doit RIEN voir d'Alice — c'est la seule chose qui rend un portail acceptable. */
    v('⛔ un autre client ne voit pas le dossier d\'Alice', (await appel(B, '/api/portail/moi', undefined, jB)).j.dossier, null);
  }

  console.log('\n══ 3. ⛔ UN CLIENT NE DÉCIDE PAS DE CE QU\'IL A PAYÉ ══\n');
  {
    /* ⛔ LA FAUTE DÉJÀ PAYÉE PAR CE DÉPÔT. Sur `/api/clients/sync`, une valeur du CORPS décidait
       de l'abonnement : `{promoCode:'PEU-IMPORTE', promoFin:'9999-12-31'}` offrait l'abonnement
       à vie. Le portail ne peut pas rouvrir cette porte par une autre entrée. */
    await appel(B, '/api/portail/demande', { etat: 'validee', promo: 'CADEAU-A-VIE' }, jA);
    const d = (await appel(B, '/api/portail/moi', undefined, jA)).j.dossier;
    v('⛔ l\'état reste celui que la Tour a posé, pas celui du corps', d.etat, 'nouvelle');
    v('⛔ et la promo reste vide', d.promo, '');
    /* La Tour, elle, peut. */
    const t = await appel(B, '/api/monitor/portail/etat', { email: 'alice@exemple.fr', etat: 'validee', promo: 'REEL' }, jTour);
    v('   la Tour pose l\'état', t.code, 200);
    v('   et il est visible du client', (await appel(B, '/api/portail/moi', undefined, jA)).j.dossier.etat, 'validee');
    v('⛔ mais sans jeton de Tour, la route refuse', (await appel(B, '/api/monitor/portail/etat', { email: 'alice@exemple.fr', etat: 'x' })).code, 401);
    v('⛔ et un jeton de CLIENT ne vaut pas un jeton de Tour', (await appel(B, '/api/monitor/portail/etat', { email: 'alice@exemple.fr', etat: 'x' }, jA)).code, 401);
  }

  console.log('\n══ 4. LA CONVERSATION ══\n');
  {
    await appel(B, '/api/portail/message', { texte: 'Bonjour, j\'ai une question' }, jA);
    const m1 = await appel(B, '/api/portail/messages', undefined, jA);
    v('   le message du client est là', m1.j.messages.length, 1);
    v('   et il est marqué « client »', m1.j.messages[0].de, 'client');
    await appel(B, '/api/monitor/portail/message', { email: 'alice@exemple.fr', texte: 'Bonjour Alice, je vous écoute' }, jTour);
    const m2 = await appel(B, '/api/portail/messages', undefined, jA);
    v('   la réponse de l\'équipe arrive dans le fil du client', m2.j.messages.length, 2);
    v('   et elle est marquée « admin »', m2.j.messages[1].de, 'admin');
    /* ⛔ Un client ne peut PAS se faire passer pour l'équipe : `de` n'est pas lu du corps. */
    await appel(B, '/api/portail/message', { texte: 'faux', de: 'admin' }, jA);
    const m3 = await appel(B, '/api/portail/messages', undefined, jA);
    v('⛔ un client ne peut pas écrire AU NOM de l\'équipe', m3.j.messages[2].de, 'client');
    v('⛔ et Bob ne voit rien du fil d\'Alice', (await appel(B, '/api/portail/messages', undefined, jB)).j.messages.length, 0);
    v('   la Tour, elle, lit le fil qu\'elle demande', (await appel(B, '/api/monitor/portail/fil?email=alice@exemple.fr', undefined, jTour)).j.messages.length, 3);
  }

  console.log('\n══ 5. LE FIL EST PLAFONNÉ — SINON IL EMPORTE LE FICHIER ENTIER ══\n');
  {
    /* ⛔ CE CONTRÔLE NE PEUT PAS SE FAIRE EN HTTP, ET LA RAISON EST UN RENSEIGNEMENT.
       Mesuré : 520 écritures d'affilée sur `/api/monitor/portail/message` rendent
       **94 fois 200 et 426 fois 429** — le budget anti-abus GLOBAL du serveur coupe bien avant
       le plafond du fil. ⚠ Autrement dit : la Tour elle-même est bornée à environ 94 écritures
       par heure sur `/api/monitor/*`, ce qu'il faut savoir avant d'imaginer une opération en
       lot depuis un écran de la Tour.
       On éprouve donc le plafond sur le MODULE, dépendances injectées — la famille de bancs
       `test-716`/`test-722` du dépôt. C'est la VRAIE fonction, sans le réseau devant. */
    const routes = {};
    const fauxApp = {
      get: (c, ...h) => { routes['GET ' + c] = h[h.length - 1]; },
      post: (c, ...h) => { routes['POST ' + c] = h[h.length - 1]; },
    };
    const bac = path.join(BANC, 'module');
    fs.mkdirSync(bac, { recursive: true });
    const M = require(path.join(RACINE, 'server', 'portail.js')).monterPortail(fauxApp, {
      dossier: bac, parJeton: () => 'zoe@exemple.fr', admin: (q, r, n) => n(), quotaOk: () => true,
      journal: () => {},
    });
    const poster = (texte) => new Promise(res => {
      routes['POST /api/portail/message']({ headers: { authorization: 'Bearer ' + 'a'.repeat(64) }, body: { texte } },
        { status: () => ({ json: () => res() }), json: () => res() });
    });
    for (let i = 0; i < 520; i++) await poster('message ' + i);
    const f = M._reg().f['zoe@exemple.fr'];
    v('⛔ le fil est tronqué à 500, pas 520', f.length, 500);
    /* ⛔ ET IL SE TRONQUE PAR LE DÉBUT : ce qu'on perd est le plus ANCIEN, jamais le plus
       récent. L'inverse rendrait la conversation inutile au moment où elle sert. */
    v('⛔ et c\'est le DÉBUT qui part, pas la fin', f[499].t, 'message 519');
    v('   le plus ancien gardé est bien le 20ᵉ', f[0].t, 'message 20');
  }

  console.log('\n══ 6. LES ANNONCES ══\n');
  {
    v('   la liste est publique — elle s\'affiche avant la connexion', (await appel(B, '/api/portail/actus')).code, 200);
    v('⛔ mais en POSER une exige la Tour', (await appel(B, '/api/monitor/portail/actu', { titre: 'x' }, jA)).code, 401);
    await appel(B, '/api/monitor/portail/actu', { titre: 'Nouvelle version', texte: 'Les box vont plus vite', tag: 'OP GESTION' }, jTour);
    const a = await appel(B, '/api/portail/actus');
    v('   l\'annonce est visible de tous', a.j.actus.length, 1);
    v('   avec son titre', a.j.actus[0].titre, 'Nouvelle version');
    const id = a.j.actus[0].id;
    v('⛔ la supprimer exige aussi la Tour', (await appel(B, '/api/monitor/portail/actu/supprimer', { id }, jA)).code, 401);
    await appel(B, '/api/monitor/portail/actu/supprimer', { id }, jTour);
    v('   et la Tour y arrive', (await appel(B, '/api/portail/actus')).j.actus.length, 0);
  }

  console.log('\n══ 7. L\'IMPORT DEPUIS FIRESTORE N\'ÉCRASE RIEN ══\n');
  {
    /* Sans clé d'administration Firebase (le cas de ce banc), l'import doit REFUSER proprement
       plutôt que de rendre « 0 repris » — qu'on prendrait pour « il n'y avait rien ». */
    const r = await appel(B, '/api/monitor/portail/importer', {}, jTour);
    v('⛔ sans Firebase, l\'import dit qu\'il ne peut PAS, il ne dit pas « rien à faire »', r.code, 503);
    v('   et il nomme la raison', r.j.error, 'firebase_off');
    v('⛔ et il exige la Tour', (await appel(B, '/api/monitor/portail/importer', {}, jA)).code, 401);

    /* ⛔ ET CE QUE L'EN-TÊTE DU MODULE PROMET, IL FAUT LE PROUVER. Il dit « on n'écrase jamais
       un dossier déjà local » — or en HTTP l'import refuse avant d'y arriver (pas de Firebase
       sur ce banc), donc rien ne le vérifiait. Une promesse écrite et non gardée est pire
       qu'une absence : on s'y fie. On l'éprouve donc sur le MODULE, avec un faux Firestore. */
    const routes2 = {};
    const fauxApp2 = { get: (c, ...h) => { routes2['GET ' + c] = h[h.length - 1]; },
      post: (c, ...h) => { routes2['POST ' + c] = h[h.length - 1]; } };
    const bac2 = path.join(BANC, 'import');
    fs.mkdirSync(bac2, { recursive: true });
    const M2 = require(path.join(RACINE, 'server', 'portail.js')).monterPortail(fauxApp2, {
      dossier: bac2, parJeton: () => 'locale@exemple.fr', admin: (q, r, n) => n(), quotaOk: () => true,
      journal: () => {},
      lireFirestore: async () => ([
        { email: 'locale@exemple.fr', prenom: 'VENU', nom: 'DE GOOGLE', company: 'ÉCRASÉE ?' },
        { email: 'neuve@exemple.fr', prenom: 'Neuve', nom: 'Reprise', company: 'À reprendre' },
        { email: '', prenom: 'Sans', nom: 'Adresse', company: 'Orpheline' },
      ]),
    });
    /* On pose d'abord un dossier LOCAL, comme si la personne l'avait saisi depuis la bascule. */
    await new Promise(res => routes2['POST /api/portail/demande'](
      { headers: { authorization: 'Bearer ' + 'b'.repeat(64) }, body: { prenom: 'Locale', societe: 'SAISIE ICI' } },
      { status: () => ({ json: () => res() }), json: () => res() }));
    const rep = await new Promise(res => routes2['POST /api/monitor/portail/importer']({ headers: {}, body: {} },
      { status: () => ({ json: (x) => res(x) }), json: (x) => res(x) }));
    v('   l\'import reprend le dossier absent', rep.repris, 1);
    v('⛔ et IGNORE celui qui existe d\'ej\'a en local', rep.ignores, 1);
    v('⛔ un dossier SANS adresse est rapporté, jamais rattaché au hasard', rep.sansAdresse, 1);
    v('⛔⛔ le dossier local n\'a pas bougé d\'un caractère', M2._reg().d['locale@exemple.fr'].so, 'SAISIE ICI');
    v('   et le dossier neuf est bien là', M2._reg().d['neuve@exemple.fr'].so, 'À reprendre');
  }

  console.log('\n══ 8. CE QUI EST SUR LE DISQUE ══\n');
  {
    const chemin = path.join(S.data, 'portail.json');
    vrai('   le fichier existe', fs.existsSync(chemin));
    const brut = fs.readFileSync(chemin, 'utf8');
    let jetable = false; try { JSON.parse(brut); } catch (e) { jetable = true; }
    vrai('   et c\'est du JSON valide — temporaire puis renommage', !jetable);
    vrai('⛔ aucun mot de passe ni empreinte de compte ne s\'y trouve',
      brut.indexOf('mot-de-passe-alice') < 0 && brut.indexOf(emp('mot-de-passe-alice')) < 0);
    vrai('⛔ ni un jeton de session', brut.indexOf(jA) < 0);
    vrai('   mais les dossiers, eux, y sont — sinon on ne cherche pas au bon endroit', brut.indexOf('Nettoyage Martin') >= 0);
  }

  await arreter();
  try { fs.rmSync(BANC, { recursive: true, force: true }); } catch (e) {}
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(async (e) => {
  console.error('\n✗ le banc est tombé : ' + (e && e.stack || e));
  await arreter();
  console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
  process.exit(1);
});
