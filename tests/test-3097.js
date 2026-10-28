/* ⛔ CE QUE CE FICHIER GARDE — `configurer-pont.js` : POSER LE PONT DES AGENTS SANS AFFICHER LE SECRET, NI LE RECOPIER (28 octobre 2026).

   Le pont tient sur UN secret et DEUX fichiers de la même machine : l'empreinte dans la configuration d'OP MESSAGES, le secret dans celle de la Tour. Justin recolle toutes ses sorties dans
   la conversation (CLAUDE.md : « on ne fait jamais afficher un secret sur le VPS ») — l'outil écrit donc les DEUX d'un geste, et le secret peut être fabriqué sur place sans que personne ne le voie.
   Joué comme `configurer-admin.js` l'est par `test-2691` : un VRAI processus, une entrée redirigée, la sortie lue en entier.
     · la pose, secret fabriqué ou collé : les deux fichiers jumeaux, 0600, les AUTRES clés intactes, le service accepterait le bloc — et le VRAI service démarré avec ce bloc s'ouvre au secret de
       l'AUTRE fichier ; jamais un secret ni son empreinte entière à l'écran ;
     · les refus (accès mal formé, secret faux, empreinte de l'administration, usage) : aucun des deux fichiers ne bouge d'un octet ;
     · ⛔ si le SECOND fichier ne s'écrit pas, le premier est REMIS comme il était ;
     · `--verifier` : jumelles ou DIFFÉRENTS, d'un seul côté, ou rien ; `--retirer` ferme le pont des deux côtés.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien n'a été affiché » est précédé de la preuve que l'outil a parlé. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v: v0, vrai, fin } = T.compteur();
const canon = (x) => Array.isArray(x) ? x.map(canon) : (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x);
const v = (t, a, b) => v0(t, canon(a), canon(b));
const PONT = require(path.join(T.SERVICE, 'pont-agents.js'));
setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const OUTIL = path.join(T.SERVICE, 'configurer-pont.js');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const SECRET = '5c2e8a1d7b0f4936e1a8c5d02b7f9e34a6c1d8057e3b92f4a0c6d1e85b3f7a29';
const ADMIN = '8d3b1f6a0c92e4575b0d8e1a3f67c2940e5a8b1d6c3f0927a4e8d51b0c6a39f2';
const ACCES = 'ba1b2c3d4e5';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3093-'));
const racine = process.getuid && process.getuid() === 0;   // en root, l'outil est joué sous un autre compte pour que « dossier en lecture seule » refuse vraiment
const compte = racine ? { uid: 65534, gid: 65534 } : {};
fs.chmodSync(bac, 0o777);
const dossierOpm = path.join(bac, 'opm'), dossierTour = path.join(bac, 'tour');
for (const d of [dossierOpm, dossierTour]) { fs.mkdirSync(d); fs.chmodSync(d, 0o777); }
const fOpm = path.join(dossierOpm, 'beta.json'), fTour = path.join(dossierTour, 'config.json');
const OPM0 = { origines: ['http://127.0.0.1:1'], marqueurOpm: 'GARDE-OPM', imbrique: { a: [1, { b: 'c' }] }, admin: { secret: ADMIN } };
const TOUR0 = { apiKey: 'banc', marqueurTour: 'GARDE-TOUR', agents: { cleApi: 'sk-ant-banc' }, messagesAdmin: { beta: ADMIN } };
const poser = (o, t) => { fs.writeFileSync(fOpm, JSON.stringify(o, null, 2), { mode: 0o666 }); fs.writeFileSync(fTour, JSON.stringify(t, null, 2), { mode: 0o666 }); fs.chmodSync(fOpm, 0o666); fs.chmodSync(fTour, 0o666); };
const octets = () => [fs.readFileSync(fOpm), fs.readFileSync(fTour)];
const lu = () => [JSON.parse(fs.readFileSync(fOpm, 'utf8')), JSON.parse(fs.readFileSync(fTour, 'utf8'))];
const restes = () => fs.readdirSync(dossierOpm).concat(fs.readdirSync(dossierTour)).filter(f => f.includes('.tmp-'));
const lancer = (args, lignes, env) => new Promise((resolve) => {
  const env2 = Object.assign({}, process.env, { OPMSG_CONFIG: fOpm, TEAMOP_CONFIG: fTour }, env); for (const k of Object.keys(env2)) if (env2[k] === undefined) delete env2[k];
  const enfant = spawn(process.execPath, [OUTIL].concat(args), Object.assign({ env: env2, stdio: ['pipe', 'pipe', 'pipe'] }, compte));
  let sortie = '', erreur = '';
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { erreur += d; });
  const minuteur = setTimeout(() => { try { enfant.kill('SIGKILL'); } catch (x) { /* déjà sorti */ } }, 30000);
  enfant.on('exit', (code) => { clearTimeout(minuteur); resolve({ code, sortie, erreur, tout: sortie + erreur }); });
  enfant.stdin.end(lignes === null ? '' : lignes.join('\n') + '\n');
});
const long64 = (x) => /[0-9a-f]{64}/i.test(x);
const jumeaux = (o, t) => !!o.pont && !!t.opmsgPont && sha(t.opmsgPont.secret) === o.pont.secretSha256;

(async () => {
  console.log('1. Poser, secret FABRIQUÉ ICI : les deux fichiers jumeaux, rien à l\'écran');
  poser(OPM0, TOUR0);
  const f = await lancer([], [ACCES, '']);
  const [o1, t1] = lu();
  v('⛔ la pose : sortie 0 ; l\'accès de Justin et l\'empreinte à OP MESSAGES ; le secret à la Tour ; JUMEAUX ; les deux fichiers en 0600 ; aucun temporaire',
    [f.code, o1.pont && o1.pont.actif, o1.pont && o1.pont.justin, /^[0-9a-f]{64}$/.test(o1.pont && o1.pont.secretSha256), /^[0-9a-f]{64}$/.test(t1.opmsgPont && t1.opmsgPont.secret), jumeaux(o1, t1), [fOpm, fTour].map(x => (fs.statSync(x).mode & 0o777).toString(8)), restes()],
    [0, true, ACCES, true, true, true, ['600', '600'], []]);
  v('⛔ les AUTRES clés sont intactes, des deux côtés (dont le secret d\'administration et la clé de relais)', [o1.marqueurOpm, o1.imbrique, o1.origines, o1.admin, t1.marqueurTour, t1.agents, t1.apiKey, t1.messagesAdmin], [OPM0.marqueurOpm, OPM0.imbrique, OPM0.origines, OPM0.admin, TOUR0.marqueurTour, TOUR0.agents, TOUR0.apiKey, TOUR0.messagesAdmin]);
  v('population : l\'outil a PARLÉ (l\'invite de l\'accès, celle du secret, les deux chemins, l\'empreinte courte, la consigne de redémarrage)',
    [/Accès bêta de Justin/.test(f.sortie), /Secret du pont/.test(f.sortie), f.sortie.includes(fOpm) && f.sortie.includes(fTour), f.sortie.includes(sha(t1.opmsgPont.secret).slice(0, 8)), /systemctl restart/.test(f.sortie), /fabriqué ICI/.test(f.sortie)], [true, true, true, true, true, true]);
  v('⛔⛔ RIEN de secret à l\'écran : ni le secret fabriqué, ni son empreinte entière, ni une suite de 64 hexadécimaux — sortie comme erreur', [f.tout.includes(t1.opmsgPont.secret), f.tout.includes(o1.pont.secretSha256), long64(f.tout)], [false, false, false]);
  v('le service accepterait ce bloc (la MÊME validation que le démarrage, avec l\'empreinte de l\'administration)', (() => { try { return Buffer.isBuffer(PONT.pontConfig(o1, 'beta', crypto.createHash('sha256').update(ADMIN).digest()).empreinte); } catch (e) { return e.message; } })(), true);
  /* la couture : le VRAI service démarré avec CE bloc s'ouvre au secret que l'outil a rangé de l'AUTRE côté */
  {
    const og = await T.fauxOpGestion({});
    const svc = await T.lancerService({ urlGestion: og.url, config: { admin: o1.admin, pont: o1.pont } });
    try {
      const c = T.client(svc.base);
      v('⛔ le VRAI service, démarré avec le bloc d\'OP MESSAGES, s\'ouvre au secret écrit dans la configuration de la TOUR (409 « pas installé » = la garde a laissé passer) et à aucun autre',
        [(await c.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': t1.opmsgPont.secret } })).code, (await c.get('/api/pont/nouveaux', { entetes: { 'X-OPM-Pont': ADMIN } })).code, (await c.get('/api/pont/nouveaux')).code], [409, 404, 404]);
    } finally { await svc.arreter(); await og.fermer(); }
  }

  console.log('\n2. Poser un secret COLLÉ (masqué) ; remplacer un pont déjà posé ; garder l\'accès (Entrée)');
  poser(OPM0, TOUR0);
  const c = await lancer([], [ACCES, SECRET.toUpperCase()]);
  const [o2, t2] = lu();
  v('le secret collé (en MAJUSCULES) est rangé en minuscules, des deux côtés, jumeaux', [c.code, t2.opmsgPont.secret, o2.pont.secretSha256, jumeaux(o2, t2)], [0, SECRET, sha(SECRET), true]);
  v('⛔⛔ le secret collé n\'est jamais réécrit à l\'écran (ni en majuscules, ni en minuscules, ni son empreinte)', [c.tout.includes(SECRET), c.tout.includes(SECRET.toUpperCase()), c.tout.includes(sha(SECRET)), /Secret du pont \(masqué/.test(c.sortie)], [false, false, false, true]);
  const r = await lancer([], ['', '']);
  const [o3, t3] = lu();
  v('un second passage REMPLACE le pont (« Entrée » garde l\'accès déjà posé) : nouveau secret, jumeaux, même accès, autres clés intactes', [r.code, /déjà posé/.test(r.sortie), o3.pont.justin, t3.opmsgPont.secret !== SECRET, jumeaux(o3, t3), t3.marqueurTour, o3.marqueurOpm], [0, true, ACCES, true, true, 'GARDE-TOUR', 'GARDE-OPM']);
  const t4 = (() => { const t = JSON.parse(fs.readFileSync(fTour, 'utf8')); t.opmsgPont.url = 'http://127.0.0.1:8099'; fs.writeFileSync(fTour, JSON.stringify(t)); return t; })();
  await lancer([], ['', SECRET]);
  v('…la clé `url` d\'un pont déjà posé à la Tour est CONSERVÉE (seul le secret change)', lu()[1].opmsgPont, { secret: SECRET, url: t4.opmsgPont.url });

  console.log('\n3. Les refus : aucun des deux fichiers ne bouge d\'un octet, la valeur n\'est pas citée');
  poser(OPM0, TOUR0);
  const intacts = octets();
  const REFUS = [
    ['un accès sans « b »', ['justin', ''], /commence par « b »/], ['un accès trop court', ['b12', ''], /commence par « b »/], ['un accès vide, aucun posé', ['', ''], /commence par « b »/],
    ['un secret de 63 caractères', [ACCES, SECRET.slice(0, 63)], /64 caractères hexadécimaux/], ['un secret non hexadécimal', [ACCES, 'zz' + SECRET.slice(2)], /64 caractères hexadécimaux/],
    ['un secret trop régulier (ab×32)', [ACCES, 'ab'.repeat(32)], /trop régulier/], ['⛔ le secret de l\'ADMINISTRATION (un secret par pouvoir)', [ACCES, ADMIN], /ne peut pas être celui de l'administration/],
  ];
  const rr = []; for (const [, l] of REFUS) rr.push(await lancer([], l));
  v('⛔ chaque refus : sortie 1, la phrase de CE refus, « Rien n\'a été modifié », les deux fichiers intacts', [rr.map((x, i) => x.code === 1 && REFUS[i][2].test(x.erreur) && /Rien n'a été modifié/.test(x.erreur)), octets().map((b, i) => b.equals(intacts[i])), restes()], [REFUS.map(() => true), [true, true], []]);
  v('…et aucune valeur collée n\'est citée dans l\'erreur', rr.map(x => long64(x.tout) || x.tout.includes('zz')), REFUS.map(() => false));
  v('l\'usage : OPMSG_CONFIG absent, TEAMOP_CONFIG absent, option inconnue, deux options', [(await lancer([], [], { OPMSG_CONFIG: undefined })).code, (await lancer([], [], { TEAMOP_CONFIG: undefined })).code, (await lancer(['--x'], [])).code, (await lancer(['--verifier', '--retirer'], [])).code], [1, 1, 1, 1]);
  const absent = await lancer([], [ACCES, ''], { TEAMOP_CONFIG: path.join(dossierTour, 'absent.json') });
  v('⛔ un fichier qui n\'existe pas : refusé, et l\'outil n\'en CRÉE jamais un (ni celui-là, ni la configuration d\'OP MESSAGES)', [absent.code, /introuvable/.test(absent.erreur), fs.existsSync(path.join(dossierTour, 'absent.json')), octets()[0].equals(intacts[0])], [1, true, false, true]);
  fs.writeFileSync(fTour, '{ pas du json');
  const abime = await lancer([], [ACCES, '']);
  v('…une configuration abîmée aussi : refusée, intacte (le fichier de la Tour comme celui d\'OP MESSAGES)', [abime.code, /JSON invalide/.test(abime.erreur), fs.readFileSync(fTour, 'utf8'), octets()[0].equals(intacts[0])], [1, true, '{ pas du json', true]);

  console.log('\n4. Si le SECOND fichier ne s\'écrit pas, le premier est REMIS comme il était');
  poser(OPM0, TOUR0);
  {
    const avant = octets();
    fs.chmodSync(dossierTour, 0o555);   // plus de fichier temporaire possible à côté de la configuration de la Tour
    let essai;
    try { essai = await lancer([], [ACCES, SECRET]); } finally { fs.chmodSync(dossierTour, 0o777); }
    const apres = octets();
    v('⛔ le fichier d\'OP MESSAGES, déjà renommé, est remis EXACTEMENT comme avant ; la Tour n\'a pas bougé ; l\'outil échoue et le dit', [essai.code, /Rien n'a été modifié/.test(essai.erreur), apres[0].equals(avant[0]), apres[1].equals(avant[1]), restes(), essai.tout.includes(SECRET), (fs.statSync(fOpm).mode & 0o777).toString(8)], [1, true, true, true, [], false, '600']);
  }

  console.log('\n5. --verifier : jumelles, DIFFÉRENTS, d\'un seul côté, ou rien');
  poser(OPM0, TOUR0);
  {
    const rien = await lancer(['--verifier'], ['']);
    v('rien de posé : « rien à vérifier », sortie 1', [rien.code, /rien à vérifier/.test(rien.erreur)], [1, true]);
    await lancer([], [ACCES, SECRET]);
    const ok = await lancer(['--verifier'], ['']);
    v('⛔ jumelles : sortie 0, l\'empreinte courte et l\'accès de Justin, JAMAIS le secret', [ok.code, /jumelles/.test(ok.sortie), ok.sortie.includes(sha(SECRET).slice(0, 8)), ok.sortie.includes(ACCES), long64(ok.tout)], [0, true, true, true, false]);
    const col = await lancer(['--verifier'], [SECRET]), faux = await lancer(['--verifier'], [ADMIN]), mal = await lancer(['--verifier'], ['pas-hex']);
    v('une valeur collée : « identique » si c\'est la posée ; « DIFFÉRENT » sinon (sortie 1, son empreinte courte) ; mal formée : refusée — rien de long à l\'écran', [col.code, /identique/.test(col.sortie), faux.code, /DIFFÉRENT/.test(faux.erreur), faux.erreur.includes(sha(ADMIN).slice(0, 8)), mal.code, [col, faux, mal].some(x => long64(x.tout))], [0, true, 1, true, true, 1, false]);
    const tour = JSON.parse(fs.readFileSync(fTour, 'utf8')); tour.opmsgPont.secret = ADMIN.replace(/8/, '9'); fs.writeFileSync(fTour, JSON.stringify(tour));
    const dif = await lancer(['--verifier'], ['']);
    v('⛔ deux secrets différents (une copie à la main qui a dérivé) : « DIFFÉRENTS », sortie 1, les deux empreintes courtes — pas les secrets', [dif.code, /DIFFÉRENTS/.test(dif.erreur), dif.erreur.includes(sha(tour.opmsgPont.secret).slice(0, 8)), long64(dif.tout)], [1, true, true, false]);
    const sansTour = Object.assign({}, tour); delete sansTour.opmsgPont; fs.writeFileSync(fTour, JSON.stringify(sansTour));
    const unCote = await lancer(['--verifier'], ['']);
    v('OP MESSAGES porte un pont et la Tour n\'a pas de secret : refusé, et le dit', [unCote.code, /la Tour n'a pas de secret valable/.test(unCote.erreur)], [1, true]);
    fs.writeFileSync(fTour, JSON.stringify(Object.assign({}, sansTour, { opmsgPont: { secret: SECRET } })));
    const o = JSON.parse(fs.readFileSync(fOpm, 'utf8')); delete o.pont; fs.writeFileSync(fOpm, JSON.stringify(o));
    const autreCote = await lancer(['--verifier'], ['']);
    v('la Tour porte un secret et OP MESSAGES n\'a pas de pont : refusé, et le dit', [autreCote.code, /pas de bloc `pont` actif/.test(autreCote.erreur)], [1, true]);
  }

  console.log('\n6. --retirer : le pont se ferme des deux côtés, le reste ne bouge pas');
  poser(OPM0, TOUR0);
  {
    await lancer([], [ACCES, SECRET]);
    const x = await lancer(['--retirer'], []);
    const [oo, tt] = lu();
    v('plus de bloc `pont`, plus de `opmsgPont`, les AUTRES clés intactes, fichiers en 0600', [x.code, oo.pont, tt.opmsgPont, oo.marqueurOpm, oo.admin, tt.marqueurTour, tt.messagesAdmin, [fOpm, fTour].map(f2 => (fs.statSync(f2).mode & 0o777).toString(8))], [0, undefined, undefined, 'GARDE-OPM', OPM0.admin, 'GARDE-TOUR', TOUR0.messagesAdmin, ['600', '600']]);
    const deux = await lancer(['--retirer'], []);
    v('le retirer deux fois : « déjà INERTE », sortie 1, rien ne bouge', [deux.code, /déjà INERTE/.test(deux.erreur)], [1, true]);
  }
  try { fs.chmodSync(dossierTour, 0o777); fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* le dossier temporaire */ }
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }).finally(() => fin());
