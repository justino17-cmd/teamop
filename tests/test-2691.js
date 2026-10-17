/* ⛔ CE QUE CE FICHIER GARDE — `configurer-admin.js` : POSER LE SECRET D'ADMINISTRATION SANS L'AFFICHER, NI LE RECOPIER (17 octobre 2026).

   Le secret qui ouvre `/api/admin/*` (`admin.js`, éprouvé par `test-2690`) se pose sur le VPS, et Justin recolle toutes ses sorties dans la conversation (CLAUDE.md : « on ne fait jamais afficher un secret sur le VPS »).
   L'outil est donc joué ici comme `configurer-courriel.js` l'est par `test-975` : un VRAI processus, une entrée redirigée (le seul moyen de l'éprouver avant de le confier), la sortie lue en entier.

     · la pose : le secret collé va de l'entrée au fichier — jamais à l'écran (ni lui, ni une suite de 64 hexadécimaux, ni en erreur), le fichier est écrit en 0600 sans fichier temporaire, les AUTRES clés
       sont intactes, le service accepterait le bloc (même validation) — et ce fichier-là suffit à ouvrir les routes d'un vrai service ;
     · le refus : un secret trop court, non hexadécimal ou trop régulier ne touche pas au fichier, et ne le cite pas ;
     · la fabrication : une invite vide fabrique un secret au hasard, ne le montre à personne, et le dit ;
     · `--verifier` compare une valeur collée à celle qui est posée SANS rien afficher (« identique » ou « différent ») ; `--retirer` ferme l'administration ;
     · les erreurs d'usage : une option inconnue, pas de fichier, un fichier qui n'existe pas (l'outil n'en CRÉE jamais un).

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien n'a été affiché » est précédé de la preuve que l'outil a parlé (l'invite, le chemin, l'empreinte courte y sont). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v: v0, vrai, fin } = T.compteur();
const canon = (x) => Array.isArray(x) ? x.map(canon) : (x && typeof x === 'object' ? Object.fromEntries(Object.keys(x).sort().map(k => [k, canon(x[k])])) : x);
const v = (t, a, b) => v0(t, canon(a), canon(b));
const ADMIN = require(path.join(T.SERVICE, 'admin.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

const OUTIL = path.join(T.SERVICE, 'configurer-admin.js');
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const SECRET = '9e1d4b7a02c8f35e6a90d1b4c7e2f83a5d06b9c1e4a7f20d3b8c5e1a96f4d702';
const AUTRE = '3b8f0c6d1e92a47b5c0d8e3f61a29b74c5e08d1f3a6b92c4d7e05f18a3b6c9d1';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-2691-'));

const lancerOutil = (args, lignes, env) => new Promise((resolve) => {
  const env2 = Object.assign({}, process.env, env); for (const k of Object.keys(env2)) if (env2[k] === undefined) delete env2[k];
  const enfant = spawn(process.execPath, [OUTIL].concat(args), { env: env2, stdio: ['pipe', 'pipe', 'pipe'] });
  let sortie = '', erreur = '';
  enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { erreur += d; });
  const minuteur = setTimeout(() => { try { enfant.kill('SIGKILL'); } catch (x) { /* déjà sorti */ } }, 30000);
  enfant.on('exit', (code) => { clearTimeout(minuteur); resolve({ code, sortie, erreur, tout: sortie + erreur }); });
  enfant.stdin.end(lignes === null ? '' : lignes.join('\n') + '\n');
});
const fichier = path.join(bac, 'config.json');
const INITIAL = { origines: ['http://127.0.0.1:1'], marqueur: 'GARDE-WQXZ', imbrique: { a: [1, 2, { b: 'c' }] }, courriel: { timeoutMs: 5000 } };
const ecrire = (obj) => fs.writeFileSync(fichier, JSON.stringify(obj, null, 2), { mode: 0o640 });
const octets = () => fs.readFileSync(fichier);
const lu = () => JSON.parse(octets().toString('utf8'));
const ENV = { OPMSG_CONFIG: fichier };
const long64 = (x) => /[0-9a-f]{64}/i.test(x);              // une suite de 64 hexadécimaux : le secret, ou un autre
const restes = () => fs.readdirSync(bac).filter(f => f.includes('.tmp-'));

(async () => {
  /* ═══ 1. POSER ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('Poser : le secret va du clavier au fichier, jamais à l\'écran');
  ecrire(INITIAL);
  const avant = Buffer.from(octets());
  const ok = await lancerOutil([], [SECRET], ENV);
  const ecrit = lu();
  v('⛔ la pose : sortie 0 ; le secret est rangé (en minuscules) ; le fichier est en 0600 ; aucun fichier temporaire ne reste ; les AUTRES clés sont intactes (le délai du courriel déjà posé aussi)',
    [ok.code, ecrit.admin, (fs.statSync(fichier).mode & 0o777).toString(8), restes(), ecrit.origines, ecrit.marqueur, ecrit.imbrique, ecrit.courriel], [0, { secret: SECRET }, '600', [], INITIAL.origines, INITIAL.marqueur, INITIAL.imbrique, INITIAL.courriel]);
  v('population : l\'outil a PARLÉ (l\'invite masquée, le chemin du fichier, la consigne de redémarrage, l\'empreinte courte) — le secret n\'y est pas', [/Secret d'administration \(masqué\)/.test(ok.sortie), ok.sortie.includes(fichier), /systemctl restart teamop-msg@/.test(ok.sortie), ok.sortie.includes(sha(SECRET).slice(0, 8))], [true, true, true, true]);
  v('⛔⛔ RIEN de secret à l\'écran : ni le secret, ni sa version majuscule, ni son empreinte entière, ni une suite de 64 hexadécimaux — sur la sortie comme sur l\'erreur', [ok.tout.includes(SECRET), ok.tout.includes(SECRET.toUpperCase()), ok.tout.includes(sha(SECRET)), long64(ok.tout)], [false, false, false, false]);
  v('le service accepterait ce bloc (la MÊME validation que le démarrage)', (() => { try { return Buffer.isBuffer(ADMIN.adminConfig(ecrit, null).empreinte); } catch (e) { return e.message; } })(), true);
  v('la sortie dit de poser la MÊME valeur côté relais, et ne mentionne aucun nom de domaine (le banc de séparation en refuserait un dans le code)', [/MÊME valeur/.test(ok.sortie), /teamop\.fr/.test(fs.readFileSync(OUTIL, 'utf8').split('\n').filter(l => !/^\s*(\*|\/\*|\/\/)/.test(l)).join('\n'))], [true, false]);

  const maj = await lancerOutil([], [SECRET.toUpperCase()], ENV);
  v('un secret collé en MAJUSCULES est rangé en minuscules (le même secret)', [maj.code, lu().admin.secret, long64(maj.tout)], [0, SECRET, false]);

  /* ═══ 2. LES REFUS ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLes refus : le fichier ne bouge pas d\'un octet, et la valeur n\'est pas citée');
  ecrire(INITIAL);
  const intact = Buffer.from(octets());
  const REFUS = [
    ['63 caractères', SECRET.slice(0, 63), /64 caractères hexadécimaux/], ['65 caractères', SECRET + '0', /64 caractères hexadécimaux/], ['non hexadécimal', 'zz' + SECRET.slice(2), /64 caractères hexadécimaux/],
    ['trop régulier (ab×32)', 'ab'.repeat(32), /trop régulier/], ['trop régulier (zéros)', '0'.repeat(64), /trop régulier/],
  ];
  const rr = []; for (const [, s] of REFUS) rr.push(await lancerOutil([], [s], ENV));
  v('⛔ chaque secret faux : sortie 1, la phrase de CE refus, « Rien n\'a été modifié », le fichier intact, aucune fuite de la valeur collée', [rr.map((r, i) => r.code === 1 && REFUS[i][2].test(r.erreur) && /Rien n'a été modifié/.test(r.erreur)), rr.filter((r, i) => r.tout.includes(REFUS[i][1].slice(2, 30))).length, Buffer.compare(octets(), intact), restes()], [REFUS.map(() => true), 0, 0, []]);

  /* ═══ 3. FABRIQUER ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nFabriquer : une invite vide fabrique un secret au hasard et ne le montre à personne');
  ecrire(INITIAL);
  const fab = await lancerOutil([], [''], ENV);
  const fabrique = lu().admin && lu().admin.secret;
  v('sortie 0 ; un secret valide est rangé (64 hexadécimaux, assez irrégulier) ; l\'outil dit qu\'il a été fabriqué ICI et que la porte reste fermée de fait', [fab.code, /^[0-9a-f]{64}$/.test(fabrique), (() => { try { ADMIN.adminConfig(lu(), null); return true; } catch (e) { return false; } })(), /fabriqué ICI/.test(fab.sortie), /fermées de fait/.test(fab.sortie)], [0, true, true, true, true]);
  v('⛔⛔ le secret fabriqué n\'est PAS à l\'écran (population : l\'outil a parlé et donné l\'empreinte courte, qui est bien celle du secret rangé)', [fab.tout.includes(fabrique), long64(fab.tout), fab.sortie.includes(sha(fabrique).slice(0, 8))], [false, false, true]);
  const fab2 = await lancerOutil([], [''], ENV);
  v('deux fabrications donnent deux secrets différents (au hasard)', lu().admin.secret !== fabrique, true);

  /* ═══ 4. --verifier ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n`--verifier` : comparer sans rien afficher');
  ecrire(Object.assign({}, INITIAL, { admin: { secret: SECRET } }));
  const posee = Buffer.from(octets());
  const idem = await lancerOutil(['--verifier'], [SECRET], ENV), idemMaj = await lancerOutil(['--verifier'], [SECRET.toUpperCase()], ENV);
  v('une valeur JUMELLE : sortie 0, « identique », rien de secret à l\'écran (population : l\'empreinte courte et l\'invite y sont)', [idem.code, /identique/.test(idem.sortie), idem.sortie.includes(sha(SECRET).slice(0, 8)), /Valeur à comparer/.test(idem.sortie), idem.tout.includes(SECRET), long64(idem.tout), idemMaj.code], [0, true, true, true, false, false, 0]);
  const diff = await lancerOutil(['--verifier'], [AUTRE], ENV);
  v('⛔ une valeur DIFFÉRENTE : sortie 1, « DIFFÉRENT » (avec l\'empreinte courte de la valeur collée, pour la reconnaître), ni l\'une ni l\'autre à l\'écran', [diff.code, /DIFFÉRENT/.test(diff.erreur), diff.erreur.includes(sha(AUTRE).slice(0, 8)), diff.tout.includes(SECRET), diff.tout.includes(AUTRE), long64(diff.tout)], [1, true, true, false, false, false]);
  const mal = await lancerOutil(['--verifier'], ['pas un secret'], ENV);
  v('une valeur qui n\'est pas 64 hexadécimaux : sortie 1, la phrase le dit, la valeur n\'est pas citée', [mal.code, /64 caractères hexadécimaux/.test(mal.erreur), mal.tout.includes('pas un secret')], [1, true, false]);
  const relire = await lancerOutil(['--verifier'], [''], ENV);
  v('une invite vide : seulement relire la configuration — sortie 0, « le service l\'accepterait », l\'empreinte courte', [relire.code, /le service l'accepterait/.test(relire.sortie), relire.sortie.includes(sha(SECRET).slice(0, 8)), long64(relire.tout)], [0, true, true, false]);
  v('⛔ `--verifier` n\'écrit rien : le fichier n\'a pas bougé d\'un octet, aucun fichier temporaire', [Buffer.compare(octets(), posee), restes()], [0, []]);
  ecrire(INITIAL);
  const inerte = await lancerOutil(['--verifier'], [SECRET], ENV);
  v('sans secret posé : sortie 1, « INERTE » (rien à vérifier — et le dit)', [inerte.code, /INERTE/.test(inerte.erreur)], [1, true]);
  ecrire(Object.assign({}, INITIAL, { admin: { secret: 'zz' } }));
  const casse = await lancerOutil(['--verifier'], [''], ENV);
  v('un bloc que le service REFUSERAIT : sortie 1, « REFUSÉE par le service », la valeur n\'est pas citée', [casse.code, /REFUSÉE par le service/.test(casse.erreur), casse.tout.includes('"zz"')], [1, true, false]);

  /* ═══ 5. --retirer ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n`--retirer` : fermer l\'administration');
  ecrire(Object.assign({}, INITIAL, { admin: { secret: SECRET } }));
  const ret = await lancerOutil(['--retirer'], null, ENV);
  v('sortie 0 ; le bloc a disparu ; les AUTRES clés sont intactes ; 0600 ; aucun fichier temporaire ; l\'outil dit que les routes répondent 404', [ret.code, lu().admin, lu().marqueur, lu().imbrique, (fs.statSync(fichier).mode & 0o777).toString(8), restes(), /répondent 404/.test(ret.sortie), long64(ret.tout)], [0, undefined, INITIAL.marqueur, INITIAL.imbrique, '600', [], true, false]);
  const retDeux = await lancerOutil(['--retirer'], null, ENV);
  v('un second retrait : sortie 1, « déjà INERTE », rien de modifié', [retDeux.code, /déjà INERTE/.test(retDeux.erreur)], [1, true]);

  /* ═══ 6. L'USAGE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLes erreurs d\'usage : sortie 1, et l\'outil ne CRÉE jamais un fichier de configuration');
  ecrire(INITIAL);
  const stable = Buffer.from(octets());
  const sansEnv = await lancerOutil([], [SECRET], { OPMSG_CONFIG: undefined });
  const inconnue = await lancerOutil(['--x'], [SECRET], ENV);
  const deux = await lancerOutil(['--verifier', '--retirer'], [SECRET], ENV);
  const absent = path.join(bac, 'absent.json');
  const introuvable = await lancerOutil([], [SECRET], { OPMSG_CONFIG: absent });
  fs.writeFileSync(path.join(bac, 'casse.json'), '{pas du json', { mode: 0o600 });
  const illisible = await lancerOutil([], [SECRET], { OPMSG_CONFIG: path.join(bac, 'casse.json') });
  fs.writeFileSync(path.join(bac, 'tableau.json'), '[1,2]', { mode: 0o600 });
  const tableau = await lancerOutil([], [SECRET], { OPMSG_CONFIG: path.join(bac, 'tableau.json') });
  v('sans OPMSG_CONFIG, une option inconnue, deux modes à la fois, un fichier qui n\'existe pas, du JSON cassé, un tableau : sortie 1 à chaque fois', [sansEnv.code, inconnue.code, deux.code, introuvable.code, illisible.code, tableau.code], [1, 1, 1, 1, 1, 1]);
  v('⛔ la phrase de chaque cas, « Rien n\'a été modifié », le fichier absent n\'est PAS créé, les autres n\'ont pas bougé, et le secret collé n\'est cité nulle part', [
    /OPMSG_CONFIG n'est pas posé/.test(sansEnv.erreur), /option inconnue/.test(inconnue.erreur), /ne vont pas ensemble/.test(deux.erreur), /introuvable/.test(introuvable.erreur), /JSON invalide/.test(illisible.erreur), /objet JSON/.test(tableau.erreur),
    fs.existsSync(absent), Buffer.compare(octets(), stable), fs.readFileSync(path.join(bac, 'casse.json'), 'utf8'), fs.readFileSync(path.join(bac, 'tableau.json'), 'utf8'),
    [sansEnv, inconnue, deux, introuvable, illisible, tableau].filter(r => r.tout.includes(SECRET)).length],
    [true, true, true, true, true, true, false, 0, '{pas du json', '[1,2]', 0]);
  vrai('population : les six cas ont parlé (chacun a une phrase)', [sansEnv, inconnue, deux, introuvable, illisible, tableau].every(r => r.erreur.length > 20));

  /* ═══ 7. LE FICHIER ÉCRIT PAR L'OUTIL OUVRE LES ROUTES D'UN VRAI SERVICE ═══════════════════════════════════════════════════════════════════ */
  console.log('\nLe bloc écrit par l\'outil, donné tel quel à un vrai service, ouvre les routes — et seulement avec ce secret');
  ecrire(INITIAL);
  await lancerOutil([], [SECRET], ENV);
  const bloc = lu().admin;
  const svc = await T.lancerService({ config: { admin: bloc } });
  try {
    const avecSecret = await fetch(svc.base + '/api/admin/sante', { headers: { 'X-OPM-Admin': SECRET } });
    const autre = await fetch(svc.base + '/api/admin/sante', { headers: { 'X-OPM-Admin': AUTRE } });
    const sans = await fetch(svc.base + '/api/admin/sante');
    const j = await avecSecret.json();
    v('le secret posé par l\'outil : 200 ; un autre secret : 404 ; sans secret : 404', [avecSecret.status, j.instance, j.reglages.admin_configuree, autre.status, sans.status], [200, 'beta', true, 404, 404]);
  } finally { await svc.arreter(); }

  /* ═══ 8. LE CODE DE L'OUTIL ══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe code de l\'outil (commentaires retirés)');
  {
    const code = T.sansCommentaires(fs.readFileSync(OUTIL, 'utf8'));
    v('⛔ le secret se SAISIT masqué (`demander(…, true)`) et ne vient jamais d\'un argument de la ligne de commande (`ps` le montrerait)', [/demander\('Secret d\\'administration \(masqué\) : ', true\)/.test(code), /process\.argv\.slice\(2\)/.test(code), /a !== '--verifier' && a !== '--retirer'/.test(code), /process\.argv\[[3-9]\]/.test(code)], [true, true, true, false]);
    v('⛔ le fichier est créé en 0600 DÈS L\'ÉCRITURE (`mode` et `wx`), jamais écrit puis `chmod`, et le propriétaire de l\'ancien est conservé', [/mode: 0o600, flag: 'wx'/.test(code), /chownSync/.test(code)], [true, true]);
    /* aucune ligne `console.*` ne nomme une variable qui porte un secret — hors l'EMPREINTE COURTE (huit signes d'un SHA-256) et les phrases (les chaînes sont retirées avant de chercher) */
    const parlent = code.split('\n').filter(l => /console\.(log|error)\(/.test(l));
    const nues = parlent.filter(l => /\b(secret|colle|secretMinuscule|brut)\b/.test(l.replace(/courte\([^)]*\)/g, '').replace(/valide\.empreinte\.toString\('hex'\)\.slice\(0, 8\)/g, '').replace(/'(?:\\.|[^'\\])*'/g, "''")));
    vrai('population : l\'outil parle par plus de dix lignes `console.*` (' + parlent.length + ')', parlent.length > 10);
    v('⛔ aucune ligne `console.*` ne nomme la valeur d\'un secret : seules l\'empreinte COURTE et des phrases sortent', nues, []);
  }
  try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* tant pis */ }
  fin();
})().catch((e) => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
