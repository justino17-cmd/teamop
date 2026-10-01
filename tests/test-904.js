/* ⛔ CE QUE CE FICHIER GARDE — LA PORTE BÊTA CONTRE LE VRAI OP GESTION (la couture réelle, famille 3).

   `test-903` joue la porte contre un OP GESTION de poche : il prouve que le service dit ce qu'il doit.
   Celui-ci lance le VRAI `server/index.js` (config, données et port isolés, sur 127.0.0.1) et ouvre les
   accès COMME LA TOUR LE FAIT (`POST /api/monitor/beta`) : la seule couture qui existe entre les deux
   services est ainsi mesurée avec ses deux moitiés réelles — c'est la leçon de `CLAUDE.md` (« les deux
   moitiés avaient chacune leurs bancs, chacune était JUSTE, et elles ne se parlaient pas »).

   Ce qu'il tient que le faux ne peut pas tenir :
     · la VRAIE forme des réponses d'OP GESTION (`{ok, login, nom}`, le message « coupé », le 429 de
       son verrou) est celle que le service lit ;
     · couper, rouvrir, SUPPRIMER un accès depuis la Tour ferme la session et le flux d'OP MESSAGES ;
     · le VERROU d'OP GESTION (5 échecs → 15 min) se répercute en 429 côté OP MESSAGES ;
     · un jeton d'OP MESSAGES n'ouvre RIEN chez OP GESTION, et un jeton de la Tour n'ouvre rien chez
       OP MESSAGES : deux formes, deux mondes ;
     · aucun fichier en commun (OP MESSAGES n'écrit pas dans les données d'OP GESTION) ;
     · une PANNE d'OP GESTION ferme la porte mais n'éjecte personne, et la reprise la rouvre.
   Il saute de lui-même sans `server/node_modules` (comme `test-641`) : rien à lancer. */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();

if (!fs.existsSync(path.join(T.RACINE, 'server', 'node_modules'))) {
  console.log('  — server/node_modules absent : banc non exécuté (npm i dans server/)');
  console.log('\n0 ✓  0 ✗');
  process.exit(0);
}

const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
let ipN = 10; const ip = () => '198.51.100.' + (ipN++);
const MDP_TOUR = 'mot-de-passe-de-la-tour-banc';

/* Le VRAI serveur d'OP GESTION, isolé : un dossier à lui, un port libre, la clé Firebase absente. */
async function lancerOpGestion(dossier, port) {
  fs.mkdirSync(path.join(dossier, 'data'), { recursive: true });
  const webpush = require(path.join(T.RACINE, 'server', 'node_modules', 'web-push'));
  const vap = webpush.generateVAPIDKeys();
  const cfg = path.join(dossier, 'config.json');
  if (!fs.existsSync(cfg)) fs.writeFileSync(cfg, JSON.stringify({ vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, apiKey: 'banc', adminPassHash: sha(MDP_TOUR) }));
  let sortie = '';
  const enfant = spawn(process.execPath, [path.join(T.RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: cfg, TEAMOP_DATA: path.join(dossier, 'data'), PORT: String(port) }), stdio: ['ignore', 'pipe', 'pipe'] });
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
  const base = 'http://127.0.0.1:' + port;
  const vivant = await T.attendre(async () => { try { return (await fetch(base + '/health')).ok; } catch (e) { return false; } }, 15000, 100);
  if (!vivant) { try { enfant.kill('SIGKILL'); } catch (e) {} throw new Error('OP GESTION n\'a pas démarré\n' + sortie.slice(0, 800)); }
  return { base, enfant, dossier, tuer: () => { try { enfant.kill('SIGKILL'); } catch (e) {} }, sortie: () => sortie };
}
const json = async (base, methode, chemin, corps, entetes) => {
  const r = await fetch(base + chemin, { method: methode, headers: Object.assign({ 'Content-Type': 'application/json' }, entetes || {}), body: corps === undefined ? undefined : JSON.stringify(corps) });
  let j = null; try { j = await r.json(); } catch (e) {}
  return { code: r.status, j };
};

(async () => {
  const dossierOg = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-904-og-'));
  const portOg = await T.portLibre();
  let og = await lancerOpGestion(dossierOg, portOg), svc = null;
  try {
    // La Tour ouvre les accès (la VRAIE route, le VRAI format de stockage).
    const tour = await json(og.base, 'POST', '/api/monitor/login', { nom: 'Patron', pass: MDP_TOUR });
    vrai('population : la Tour se connecte (jeton de 48 hexadécimaux)', tour.code === 200 && /^[0-9a-f]{48}$/.test(tour.j.token));
    const H = { Authorization: 'Bearer ' + tour.j.token };
    const creer = async (login, pass, nom) => (await json(og.base, 'POST', '/api/monitor/beta', { login, pass, nom, chantier: 'banc 904' }, H));
    const a1 = await creer('alice', 'pw-alice-reel1', 'Alice Réelle'), a2 = await creer('bob', 'pw-bob-reel12', 'Bob Réel'), a3 = await creer('carl', 'pw-carl-reel1', 'Carl');
    vrai('population : trois accès bêta ouverts depuis la Tour', a1.code === 200 && a2.code === 200 && a3.code === 200 && a1.j.compte.id);

    svc = await T.lancerService({ urlGestion: og.base, config: { beta: { relectureMs: 250, timeoutMs: 1500 } } });

    console.log('Un accès ouvert par la Tour entre par la porte d\'OP MESSAGES');
    {
      const c = T.client(svc.base, { xff: ip() });
      const r = await c.post('/api/beta/entrer', { login: 'Alice', pass: 'pw-alice-reel1' });
      v('la VRAIE réponse d\'OP GESTION ({ok, login, nom}) est lue : la personne porte le nom de l\'accès', [r.code, r.j.moi.prenom, r.j.moi.origine, r.j.moi.verifie], [200, 'Alice Réelle', 'beta', true]);
      v('un mauvais mot de passe : 401 identifiants (OP GESTION répond 403, le service ne le copie pas)', (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'alice', pass: 'faux-faux-faux' })).j.error, 'identifiants');
      v('un accès inconnu : la même réponse', (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'inconnu', pass: 'faux-faux-faux' })).j.error, 'identifiants');
    }

    console.log('\nLe verrou d\'OP GESTION (5 échecs, 15 min) se répercute en 429 — même avec le bon mot de passe');
    {
      const codes = [];
      for (let i = 0; i < 5; i++) codes.push((await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'bob', pass: 'faux-' + i + '-faux-faux' })).code);
      v('cinq échecs successifs → cinq 401', codes, [401, 401, 401, 401, 401]);
      const bon = await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'bob', pass: 'pw-bob-reel12' });
      v('⛔ le sixième essai, avec le BON mot de passe, est verrouillé chez OP GESTION : 429 verrouille + Retry-After', [bon.code, bon.j.error, bon.h.get('retry-after')], [429, 'verrouille', '900']);
      const alice = await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-reel1' });
      v('le verrou est PAR IDENTIFIANT : Alice, elle, entre toujours', alice.code, 200);
    }

    console.log('\nCouper, rouvrir, supprimer un accès depuis la Tour ferme la session ET le flux d\'OP MESSAGES');
    {
      const c = await T.connecter(svc, {}, 'carl', 'pw-carl-reel1', ip());
      const f = await T.flux(c);
      v('population : Carl est connecté, son flux est ouvert', [(await c.get('/api/moi')).code, f.statut], [200, 200]);
      const tog = await json(og.base, 'POST', '/api/monitor/beta/toggle', { id: a3.j.compte.id }, H);
      v('la Tour COUPE l\'accès (la vraie route)', [tog.code, tog.j.actif], [200, false]);
      const fn = await f.attendre(e => e.event === 'fin', 8000);
      vrai('⛔ le flux de Carl reçoit « fin (session) » puis se ferme — sans qu\'il fasse quoi que ce soit', fn && fn.data.motif === 'session' && await f.attendreFerme(3000));
      v('⛔ sa session ne sert plus', (await c.get('/api/moi')).code, 401);
      const rentre = await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'carl', pass: 'pw-carl-reel1' });
      v('⛔ rentrer avec le bon mot de passe : 403 acces_coupe (le VRAI message d\'OP GESTION est reconnu)', [rentre.code, rentre.j.error], [403, 'acces_coupe']);
      await json(og.base, 'POST', '/api/monitor/beta/toggle', { id: a3.j.compte.id }, H);
      v('rouvert depuis la Tour, il rentre', (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'carl', pass: 'pw-carl-reel1' })).code, 200);

      const c2 = await T.connecter(svc, {}, 'carl', 'pw-carl-reel1', ip());
      const f2 = await T.flux(c2);
      const sup = await json(og.base, 'POST', '/api/monitor/beta/delete', { id: a3.j.compte.id }, H);
      v('la Tour SUPPRIME l\'accès', sup.code, 200);
      vrai('⛔ supprimé (et non seulement coupé), le flux se ferme aussi : OP GESTION répond « ouvert:false » pour un accès inconnu', !!(await f2.attendre(e => e.event === 'fin', 8000)) && (await c2.get('/api/moi')).code === 401);
      v('et il ne rentre plus (accès inconnu : 401)', (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'carl', pass: 'pw-carl-reel1' })).code, 401);
      f.fermer(); f2.fermer();
    }

    console.log('\nDeux formes de jeton, deux mondes : aucun ne passe chez l\'autre');
    {
      const c = await T.connecter(svc, {}, 'alice', 'pw-alice-reel1', ip());
      const opm = c.cookie();
      vrai('population : le jeton d\'OP MESSAGES a sa forme (opm_ + 43)', /^opm_[A-Za-z0-9_-]{43}$/.test(opm));
      const chez = [];
      for (const [m, p] of [['GET', '/api/monitor/moi'], ['GET', '/api/monitor/beta'], ['POST', '/api/op/session']]) {
        const r = await json(og.base, m, p, m === 'POST' ? {} : undefined, { Authorization: 'Bearer ' + opm });
        chez.push(r.code === 401 || r.code === 403 || r.code === 400 || r.code === 404);
      }
      v('⛔ le jeton d\'OP MESSAGES présenté à OP GESTION (3 routes de la Tour et du socle) n\'ouvre rien', chez, [true, true, true]);
      const vol = T.client(svc.base, { xff: ip() });
      vol.poserCookie(tour.j.token);
      v('⛔ le jeton de la Tour (48 hexadécimaux) présenté comme cookie à OP MESSAGES : 401', (await vol.get('/api/moi')).code, 401);
      vol.poserCookie(sha('x'));
      v('et un hexadécimal de 64 (la forme des jetons du portail) : 401', (await vol.get('/api/moi')).code, 401);
    }

    console.log('\nAucun fichier en commun : OP MESSAGES n\'écrit pas dans les données d\'OP GESTION');
    {
      const donneesOg = fs.readdirSync(path.join(dossierOg, 'data'));
      vrai('population : OP GESTION a bien écrit ses fichiers (beta-comptes.json…)', donneesOg.includes('beta-comptes.json'));
      v('⛔ aucun fichier de messagerie chez OP GESTION', donneesOg.filter(f => /^msg|opmsg|messages\.db/.test(f)), []);
      vrai('⛔ la base d\'OP MESSAGES est ailleurs, hors du dossier d\'OP GESTION', fs.existsSync(path.join(svc.data, 'msg.db')) && !svc.data.startsWith(dossierOg));
      vrai('⛔ et OP GESTION n\'a rien dit de plus dans ses journaux (il ne sait pas qui est OP MESSAGES)', !/opmsg|OP MESSAGES|msg\.db/i.test(og.sortie()));
      const h = await json(og.base, 'GET', '/health');
      v('/health d\'OP GESTION est intact', h.code, 200);
    }

    console.log('\nUne PANNE d\'OP GESTION ferme la porte sans éjecter personne, et la reprise la rouvre');
    {
      const c = await T.connecter(svc, {}, 'alice', 'pw-alice-reel1', ip());
      const f = await T.flux(c);
      og.tuer();
      await new Promise(r => og.enfant.once('exit', r));
      const nouv = await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-reel1' });
      v('⛔ OP GESTION arrêté : la porte répond 503 porte_indisponible (fermée par défaut)', [nouv.code, nouv.j.error], [503, 'porte_indisponible']);
      const echecs = await T.attendre(async () => (await T.client(svc.base, { xff: ip() }).get('/health')).j.porte.relecturesEchec >= 2, 8000);
      vrai('population : au moins deux relectures ont échoué (la panne est vue)', !!echecs);
      v('⛔ pendant la panne, la session d\'Alice et son flux vivent encore', [(await c.get('/api/moi')).code, f.ferme], [200, false]);
      og = await lancerOpGestion(dossierOg, portOg);
      const retour = await T.attendre(async () => (await T.client(svc.base, { xff: ip() }).post('/api/beta/entrer', { login: 'alice', pass: 'pw-alice-reel1' })).code === 200, 8000);
      vrai('OP GESTION revenu (mêmes données sur disque) : la porte se rouvre, Alice rentre', !!retour);
      vrai('et la relecture reprend (relecturesEchec retombe à 0)', !!(await T.attendre(async () => (await T.client(svc.base, { xff: ip() }).get('/health')).j.porte.relecturesEchec === 0, 8000)));
      f.fermer();
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    if (svc) console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  if (svc) await svc.arreter();
  og.tuer();
  try { fs.rmSync(dossierOg, { recursive: true, force: true }); } catch (e) {}
  fin();
})();
