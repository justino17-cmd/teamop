/* ══ DEUX SORTES D'ORDRES DE LA TOUR — ET LA PREMIÈRE EFFACE DES COMPTES ═══════════════════

   Justin, 15 septembre 2026, cinq comptes bloqués chez ELAN : « je veux un bouton MOI dans la
   tour de contrôle s'il y a des erreurs comme ça. C'est à nous de gérer ces problèmes-là. »
   Refaire un mot de passe demande d'écrire dans la base CHIFFRÉE d'une entreprise, que ce
   serveur ne peut ni lire ni écrire. On réemploie donc `ordres.json` : la Tour ORDONNE, le
   premier appareil de l'entreprise qui s'ouvre EXÉCUTE.

   ⛔ ET C'EST EXACTEMENT LÀ QUE C'EST DANGEREUX. Jusqu'à ce jour, `ordres.json` ne portait
   qu'une chose — « supprime ce compte » — et les cinq fonctions qui le lisent filtraient par
   IDENTIFIANT SEUL. Y glisser un ordre d'une autre nature sans les typer produisait trois
   catastrophes silencieuses :
     1. `ordresServis` rend la liste que l'application SUPPRIME. Une application déjà déployée
        (v690 et avant) ne connaît pas les types : elle aurait effacé le compte dont on voulait
        seulement refaire le mot de passe — avec sa pierre tombale, donc partout dans l'équipe.
     2. `ordreBanni` ferme la porte de l'annuaire : le compte se serait retrouvé DEHORS, soit
        l'exact contraire de ce que le bouton promet.
     3. Un acquittement de suppression marquait « fait » tout ordre du même identifiant : le
        mot de passe aurait été classé sans avoir jamais été posé, sans que rien ne le signale.

   Ce banc lance le VRAI serveur, isolé (sa configuration, ses données, son port), et lui parle
   en HTTP — comme `tests/test-641.js`, et pour la même raison : ce qui répond est
   `server/index.js` tel qu'il sera déployé. ⚠️ Jamais api.teamop.fr.

   ⚠️ LES ORDRES SONT SEMÉS À LA MAIN DANS `ordres.json`, pas posés par la route de la Tour.
   C'est VOULU : on éprouve ce que le serveur FAIT d'un ordre déjà là — c'est le seul état qui
   compte pour un appareil de client. La route, elle, est éprouvée juste après, avec sa vraie
   authentification de patron. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ══ 1. LE TYPAGE, LU DANS LE FICHIER — une seule définition, et tous les lecteurs la passent ══ */
console.log('\n── 702 · « cet ordre est une suppression » n\'a qu\'UNE définition ──');
v('estSuppr existe et n\'est définie qu\'une fois',
  (SRV.match(/function estSuppr\(/g) || []).length, 1);
v('… et un ordre SANS type est une suppression (les lignes déjà écrites se lisent sans migration)',
  /function estSuppr\(o\) \{ return !!o && o\.type !== 'mdp'; \}/.test(SRV), true);
/* ⛔ Les cinq lecteurs. Si l'un d'eux cesse de filtrer, un ordre de mot de passe redevient un
   ordre de suppression pour lui — et c'est le compte du client qui part. */
[['ordreBanni', 'ferme la porte de l\'annuaire'],
 ['ordresServis', 'donne à l\'application la liste qu\'elle SUPPRIME'],
 ['ordreAttente', 'dit « suppression en attente » à la Tour'],
 ['ordreFait', 'dit « supprimé » à la Tour']].forEach(([nom, quoi]) => {
  const m = new RegExp('function ' + nom + '\\(t, login\\) \\{[^\\n]*\\}|function ' + nom + '\\(t\\) \\{[^\\n]*\\}').exec(SRV);
  v(nom + ' est trouvée (' + quoi + ')', !!m, true);
  v('⛔ ' + nom + ' ne voit QUE les suppressions', !!m && /estSuppr\(o\)/.test(m[0]), true);
});
v('⛔ et « réautoriser un ancien ordre » ne touche que les suppressions',
  (SRV.match(/estSuppr\(o\) && o\.login === login\) o\.banni = false/g) || []).length, 2);
/* ⛔ RÉEXPRIMÉ, PAS AFFAIBLI. Cette ligne épinglait la forme d'un `filter` sur UNE ligne ; la
   purge en compte maintenant trois cas (empreinte invalide, ordre périmé, secret d'un ordre déjà
   acquitté) et elle réécrit le fichier. Épingler une écriture, c'est se condamner à la rouvrir à
   chaque amélioration — on demande donc les trois garanties, et le banc les éprouve pour de vrai
   plus bas, sur le VRAI serveur. */
v('la durée de vie d\'un ordre de mot de passe est nommée une fois',
  (SRV.match(/const ORDRE_MDP_VIE = /g) || []).length, 1);
v('⛔ une empreinte invalide est jetée au chargement',
  /if \(!\/\^\[0-9a-f\]\{64\}\$\/\.test\(String\(o\.h \|\| ''\)\)\) return false;/.test(SRV), true);
v('⛔ un ordre acquitté perd son secret', /if \(o\.fait\) \{ delete o\.h; return true; \}/.test(SRV), true);
v('⛔ et la purge RÉÉCRIT le fichier — sinon les secrets périmés dorment sur le disque',
  /if \(jete\) \{ ordresSave\(\);/.test(SRV), true);
/* Le nom du champ ne change pas : une application d'avant aujourd'hui lit `suppressions` et
   ignore le reste. Le renommer casserait tout le parc en silence. */
v('la réponse garde le champ `suppressions` (rétrocompatibilité du parc)',
  /suppressions: ordresServis\(t\), mdp: /.test(SRV), true);
/* ⛔ Et la moitié qui porte un secret ne part pas sur une clé que tout le monde peut lire — mais
   la moitié « suppressions », elle, continue exactement comme avant : fermer la route entière
   aurait changé le comportement d'une entreprise restée sur la clé partagée, le jour du
   déploiement, pour une raison sans rapport avec ce qu'on ajoute. */
v('⛔ sur une clé partagée, `mdp` est vide — et les suppressions passent quand même',
  /mdp: secretOk \? ordresMdp\(t\) : \[\]/.test(SRV) && /const secretOk = !cleEstPublique\(t\);/.test(SRV), true);
v('… et on refuse même de POSER un tel ordre sur une clé partagée',
  /clé d\\'équipe partagée[\s\S]{0,40}|encore sur la clé d\\'équipe partagée/.test(SRV), true);
/* ⛔ Le serveur ne doit JAMAIS voir le mot de passe en clair : il ne reçoit que l'empreinte. */
v('⛔ la route ne lit aucun mot de passe en clair — seulement `h`',
  /const h = monStr\(x && x\.h, 64\)\.toLowerCase\(\);/.test(SRV) && !/b\.motdepasse|b\.pass\b|x\.mdp\b/.test(SRV.slice(SRV.indexOf('/api/monitor/comptes/mdp'), SRV.indexOf('/api/monitor/comptes/mdp') + 5000)), true);

/* ══ 2. LA MOITIÉ APPLICATION — lue dans le fichier livré ══════════════════════════════════
   `ordresVerifier` est asynchrone, parle au réseau et écrit dans `db` : on lit donc le contrat
   dans le fichier réel plutôt que d'exécuter un substitut. La preuve fonctionnelle vit dans
   `scratchpad/sonde-ordre-mdp.js`, jouée au navigateur sur beta.html. */
const APP = fs.readFileSync(path.join(RACINE, 'app.html'), 'utf8');
console.log('\n── 702 · ce que l\'application fait des deux sortes ──');
{
  const i = APP.indexOf('async function ordresVerifier(');
  let j = APP.indexOf('{', i), n = 0, k = j;
  for (; k < APP.length; k++) { if (APP[k] === '{') n++; else if (APP[k] === '}') { n--; if (!n) break; } }
  const OV = i < 0 ? '' : APP.slice(i, k + 1);
  v('ordresVerifier est trouvée dans app.html', OV.length > 400, true);
  /* ⛔ L'empreinte est re-vérifiée CÔTÉ APPLICATION, même si le serveur l'a déjà fait : c'est
     nous qui écrivons `pwdHash`, et `pwdHash: undefined` rendrait le compte inconnectable. */
  v('⛔ l\'empreinte reçue est re-vérifiée avant d\'être posée',
    /\/\^\[0-9a-f\]\{64\}\$\/\.test\(x\.h\)/.test(OV), true);
  v('le mot de passe neuf remplace l\'ancien', /u\.pwdHash=o\.h/.test(OV), true);
  v('… et relance la campagne sécurité (choix du mot de passe + adresse)',
    /u\.mustChangePwd=true/.test(OV) && /delete u\.secu/.test(OV), true);
  /* ⛔ Sans ça, un ancien PIN continuerait d'ouvrir le compte en parallèle : refaire le mot de
     passe sans fermer la porte d'à côté ne serait pas le refaire. */
  v('⛔ l\'ancien PIN et le « sans mot de passe » sont retirés en même temps',
    /delete u\.pinHash/.test(OV) && /delete u\.sansMdp/.test(OV), true);
  /* Un ordre déjà appliqué s'acquitte sans réécrire : sinon chaque passage re-tamponnerait la
     fiche et la ferait gagner toutes les fusions sans que personne n'ait rien fait. */
  v('un ordre déjà posé s\'acquitte sans réécrire la fiche',
    /if\(u\.pwdHash===o\.h\)\{ faitsMdp\.push\(o\.login\); return; \}/.test(OV), true);
  v('l\'acquittement distingue les deux sortes', /logins:faits,mdp:faitsMdp/.test(OV), true);
  /* Si c'est MON mot de passe qui vient de changer, ma session ne vaut plus. */
  v('⛔ la personne concernée est déconnectée', /if\(moi\|\|moiMdp\)\{/.test(OV), true);
  v('… et rien n\'est écrit quand il n\'y a rien à faire',
    /if\(!faits\.length&&!faitsMdp\.length\) return;/.test(OV), true);
}

/* ══ 3. LE VRAI SERVEUR ══ */
const banc = path.join(require('os').tmpdir(), 'teamop-test-702-' + process.pid);
let enfant = null;
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  const CLE = 'CLE-PRIVEE-DU-BANC-2026';
  const MDP_TOUR = 'motdepasse-du-banc';
  const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const T = 'ent-banc-1';

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha(MDP_TOUR) }));
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    'banc': { slug: 'banc', nom: 'Banc', email: 'banc@exemple.fr', t: T, code: b64({ t: T, k: CLE }), ts: 1 } }));

  /* L'annuaire tel que la Tour vient de l'écrire : `mireille` porte l'empreinte NEUVE. */
  const EMP_TOUR = { s: 'a'.repeat(32), e: 'b'.repeat(64), n: 'Mireille', p: 1, m: 1 };
  fs.writeFileSync(path.join(banc, 'data', 'comptes.json'), JSON.stringify({
    [T]: { c: { mireille: EMP_TOUR, partant: { s: 'c'.repeat(32), e: 'd'.repeat(64), n: 'Partant', p: 0, m: 1 } }, maj: 1 } }));

  const H_NEUF = 'e'.repeat(64);
  const MAINTENANT = Date.now();
  fs.writeFileSync(path.join(banc, 'data', 'ordres.json'), JSON.stringify({
    [T]: [
      { login: 'partant', ts: 1, par: 'banc', fait: 0 },                          // suppression (sans type : l'ancien format)
      { login: 'mireille', type: 'mdp', h: H_NEUF, ts: MAINTENANT, par: 'banc', fait: 0 },   // mot de passe, frais
      { login: 'cassee', type: 'mdp', h: 'pas-une-empreinte', ts: MAINTENANT, fait: 0 },     // à jeter : sans empreinte
      /* ⛔ Celui-ci date de 40 jours. Il DOIT disparaître au chargement : c'est le seul chose
         qui empêche un ordre jamais exécuté d'enfermer un compte à vie entre un annuaire gelé
         et une fiche jamais mise à jour. Défaut trouvé par `gardien` avant déploiement. */
      { login: 'oubliee', type: 'mdp', h: '7'.repeat(64), ts: MAINTENANT - 40 * 86400000, fait: 0 },
    ] }));

  const PORT = 8900 + (process.pid % 90);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 60; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

  const post = async (c, corps, hdr) => {
    const r = await fetch(B + c, { method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, hdr || {}), body: JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { statut: r.status, j };
  };
  const KH = sha(CLE);

  try {
    console.log('\n── 702 · ce que l\'application reçoit ──');
    let r = await post('/api/espaces/ordres', { t: T, kh: KH });
    v('la route répond', r.statut, 200);
    /* ⛔ LE CONTRÔLE QUI COMPTE LE PLUS DE TOUT CE FICHIER. Si « mireille » apparaît ici, une
       application déjà déployée EFFACE son compte, avec sa pierre tombale — et la fusion
       répand l'effacement dans toute l'entreprise. */
    v('⛔ `suppressions` ne contient QUE la suppression', (r.j && r.j.suppressions) || [], ['partant']);
    v('… et le mot de passe voyage à part, avec son empreinte',
      (r.j && r.j.mdp) || [], [{ login: 'mireille', h: H_NEUF }]);
    v('⛔ l\'ordre à empreinte cassée n\'est servi nulle part',
      JSON.stringify(r.j).indexOf('cassee') < 0, true);
    /* ⛔ LE GEL A UNE FIN. Un ordre que personne n'a exécuté en trente jours disparaît : sans ça,
       les appareils déjà déployés (qui ne savent pas acquitter un ordre de ce type) laissaient
       l'annuaire gelé POUR TOUJOURS, et la personne coincée entre une page d'entrée qui veut le
       mot de passe neuf et une application qui veut l'ancien. Sans issue. */
    v('⛔ un ordre de plus de 30 jours a disparu — le gel expire tout seul',
      JSON.stringify(r.j).indexOf('oubliee') < 0, true);
    const surDisque = fs.readFileSync(path.join(banc, 'data', 'ordres.json'), 'utf8');
    v('… et il ne dort même plus dans le fichier', surDisque.indexOf('oubliee') < 0, true);

    console.log('\n── 702 · un dépôt d\'annuaire ne défait pas ce que la Tour vient d\'écrire ──');
    /* L'application redépose SES fiches — donc l'ANCIENNE empreinte de mireille. Sans garde,
       le mot de passe que le patron vient de dicter au téléphone disparaîtrait de l'annuaire,
       et personne ne le verrait. */
    const VIEUX = { login: 'mireille', s: '1'.repeat(32), e: '2'.repeat(64), n: 'Mireille', p: 0, m: 1 };
    r = await post('/api/espaces/comptes', { t: T, kh: KH, ver: '690', comptes: [
      VIEUX, { login: 'partant', s: '3'.repeat(32), e: '4'.repeat(64), n: 'Partant', p: 0, m: 1 } ] });
    v('le dépôt est accepté', r.statut, 200);
    const annu = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8'))[T].c;
    v('⛔ l\'entrée de la Tour est CONSERVÉE tant que l\'ordre est en attente',
      [annu.mireille.s, annu.mireille.e], [EMP_TOUR.s, EMP_TOUR.e]);
    v('⛔ et le compte supprimé depuis la Tour reste banni de l\'annuaire',
      Object.prototype.hasOwnProperty.call(annu, 'partant'), false);

    console.log('\n── 702 · on n\'acquitte que ce qu\'on a fait, et chaque sorte à part ──');
    /* Une application d'avant aujourd'hui n'envoie que `logins`. Si cet acquittement classait
       aussi l'ordre de mot de passe, celui-ci serait perdu sans avoir été posé. */
    r = await post('/api/espaces/ordre-fait', { t: T, kh: KH, logins: ['mireille'] });
    v('un acquittement de SUPPRESSION ne classe pas un mot de passe', (r.j && r.j.nm) || 0, 0);
    r = await post('/api/espaces/ordres', { t: T, kh: KH });
    v('… l\'ordre de mot de passe est donc toujours servi', ((r.j && r.j.mdp) || []).length, 1);
    r = await post('/api/espaces/ordre-fait', { t: T, kh: KH, mdp: ['mireille'] });
    v('l\'acquittement de MOT DE PASSE, lui, le classe', (r.j && r.j.nm) || 0, 1);
    /* ⛔ `h` N'EST PAS UN IDENTIFIANT, C'EST LE MOT DE PASSE : `/api/espaces/connexion` le lit
       directement du corps de la requête. Le garder après usage ferait d'`ordres.json` — un
       fichier qui ne portait que des identifiants — une réserve de secrets utilisables, et le
       rediffuser sept jours de plus en ferait un distributeur. Un appareil qui dormait ne perd
       rien : la fiche lui arrive par la SYNCHRO, comme tout le reste. */
    r = await post('/api/espaces/ordres', { t: T, kh: KH });
    v('⛔ une fois acquitté, l\'ordre n\'est PLUS servi', ((r.j && r.j.mdp) || []).length, 0);
    const apresAcq = fs.readFileSync(path.join(banc, 'data', 'ordres.json'), 'utf8');
    v('⛔ et l\'empreinte a été EFFACÉE du fichier', apresAcq.indexOf(H_NEUF) < 0, true);
    v('… mais la trace du geste reste (qui, quand)', /"login":"mireille"[^}]*"par":"banc"/.test(apresAcq), true);
    /* L'ordre exécuté libère l'annuaire : le prochain dépôt fait de nouveau autorité. */
    r = await post('/api/espaces/comptes', { t: T, kh: KH, ver: '690', comptes: [VIEUX] });
    const annu2 = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8'))[T].c;
    v('une fois l\'ordre exécuté, l\'application reprend la main sur l\'annuaire',
      annu2.mireille.e, VIEUX.e);

    console.log('\n── 702 · la route de la Tour, avec sa vraie porte ──');
    r = await post('/api/monitor/comptes/mdp', { t: T, comptes: [{ login: 'mireille', h: H_NEUF }] });
    v('⛔ sans jeton de patron : refusé', r.statut, 403);
    const lg = await post('/api/monitor/login', { nom: 'Banc', pass: MDP_TOUR });
    v('connexion à la Tour du banc', lg.statut, 200);
    const AUTH = { authorization: 'Bearer ' + (lg.j && lg.j.token) };

    /* ⛔ LES APPAREILS D'ABORD, LA PORTE ENSUITE — éprouvé, pas commenté. Le banc démarre sans
       version minimale : la route doit REFUSER, parce qu'un ordre posé maintenant ne serait
       exécuté par aucun appareil et bloquerait la personne jusqu'à sa péremption. */
    r = await post('/api/monitor/comptes/mdp', { t: T, comptes: [{ login: 'mireille', h: H_NEUF }] }, AUTH);
    v('⛔ parc trop ancien : la route refuse', r.statut, 409);
    v('… et elle dit QUOI FAIRE', /publie la v691 et exige-la/.test((r.j && r.j.error) || ''), true);
    const relev = await post('/api/monitor/version-min', { min: 691 }, AUTH);
    v('on relève le minimum exigé', relev.statut, 200);
    /* ⛔ Un corps hostile ne doit RIEN écrire. Chaque cas ci-dessous a une façon propre de
       casser l'annuaire s'il passait : une empreinte qui n'en est pas une rendrait le compte
       inconnectable, `__proto__` empoisonnerait la table, un identifiant inconnu créerait une
       entrée qui n'appartient à personne. */
    const cas = [
      ['comptes n\'est pas un tableau', { t: T, comptes: 'mireille' }],
      ['comptes vide', { t: T, comptes: [] }],
      ['espace inconnu', { t: 'nexiste-pas', comptes: [{ login: 'mireille', h: H_NEUF }] }],
    ];
    for (const [nom, corps] of cas) {
      const x = await post('/api/monitor/comptes/mdp', corps, AUTH);
      v('refusé — ' + nom, x.statut >= 400, true);
    }
    const hostile = await post('/api/monitor/comptes/mdp', { t: T, comptes: [
      { login: 'mireille', h: 'zzzz' },                     // empreinte invalide
      { login: '__proto__', h: H_NEUF },                    // clé empoisonnée
      { login: 'inconnu-au-bataillon', h: H_NEUF } ] }, AUTH);
    v('⛔ aucun de ces trois comptes n\'est retenu', hostile.statut, 409);
    v('… et chacun est refusé avec sa raison', ((hostile.j && hostile.j.refuses) || []).length, 3);
    const avant = fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8');
    v('⛔ RIEN n\'a été écrit dans l\'annuaire', avant.indexOf('__proto__') < 0 && avant.indexOf('zzzz') < 0, true);

    console.log('\n── 702 · le geste complet, et ses portes de sortie ──');
    /* Premier temps : le code part par courriel. Pas de SMTP sur le banc, donc la route rend 503
       — ce qui prouve déjà qu'elle EXIGE le code avant d'écrire quoi que ce soit. */
    const H2 = 'a'.repeat(64);
    r = await post('/api/monitor/comptes/mdp', { t: T, comptes: [{ login: 'mireille', h: H2 }] }, AUTH);
    v('⛔ sans code, rien n\'est écrit — le courriel est obligatoire', r.statut, 503);
    v('… et l\'annuaire n\'a pas bougé',
      fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8').indexOf(H2) < 0, true);

    /* On sème un ordre vivant à la main pour éprouver les portes de sortie, comme plus haut. */
    const ord = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'ordres.json'), 'utf8'));
    ord[T].push({ login: 'mireille', type: 'mdp', h: H2, ts: Date.now(), par: 'banc', fait: 0 });
    fs.writeFileSync(path.join(banc, 'data', 'ordres.json'), JSON.stringify(ord));
    /* Le serveur a l'ancien contenu en mémoire : on le relance pour qu'il relise le fichier. */
    try { process.kill(enfant.pid); } catch (e) {}
    enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
      env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }),
      stdio: 'ignore' });
    for (let i = 0; i < 60; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(x => setTimeout(x, 100)); } }
    const lg2 = await post('/api/monitor/login', { nom: 'Banc', pass: MDP_TOUR });
    const AUTH2 = { authorization: 'Bearer ' + (lg2.j && lg2.j.token) };

    r = await post('/api/espaces/ordres', { t: T, kh: KH });
    v('l\'ordre semé est bien vivant', ((r.j && r.j.mdp) || []).length, 1);
    /* ⛔ #4 : un ordre de mot de passe n'est PAS un ban. La route de réautorisation doit dire
       « aucun ban » — sinon la Tour annonce « réautorisé » sur une opération qui n'a rien fait. */
    r = await post('/api/monitor/compte/reautoriser', { t: T, login: 'mireille' }, AUTH2);
    v('⛔ « réautoriser » ne prétend pas agir sur un mot de passe', r.statut, 404);
    /* ⛔ #1 : LA PORTE DE SORTIE. Tant que l'ordre vit, l'annuaire est gelé ; il faut pouvoir
       l'abandonner tout de suite, sans attendre trente jours. */
    r = await post('/api/monitor/compte/mdp-annuler', { t: T, login: 'mireille' }, AUTH2);
    v('le patron peut ANNULER un mot de passe ordonné', r.statut, 200);
    r = await post('/api/espaces/ordres', { t: T, kh: KH });
    v('… l\'ordre n\'est plus servi', ((r.j && r.j.mdp) || []).length, 0);
    v('… et son empreinte a disparu du fichier',
      fs.readFileSync(path.join(banc, 'data', 'ordres.json'), 'utf8').indexOf(H2) < 0, true);
    /* Le gel tombe : l'entreprise reprend la main sur son annuaire dès son prochain dépôt. */
    const NEUF = { login: 'mireille', s: '5'.repeat(32), e: '6'.repeat(64), n: 'Mireille', p: 0, m: 1 };
    await post('/api/espaces/comptes', { t: T, kh: KH, ver: '691', comptes: [NEUF] });
    const annu3 = JSON.parse(fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8'))[T].c;
    v('⛔ le gel est levé — l\'entreprise redevient maîtresse de son annuaire', annu3.mireille.e, NEUF.e);
    r = await post('/api/monitor/compte/mdp-annuler', { t: T, login: 'mireille' }, AUTH2);
    v('annuler deux fois ne prétend rien faire', r.statut, 404);

    console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
    stop(); process.exit(ko ? 1 : 0);
  } catch (e) {
    console.log('  ✗ banc interrompu : ' + e.message);
    console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗');
    stop(); process.exit(1);
  }
})();
process.on('exit', stop);
