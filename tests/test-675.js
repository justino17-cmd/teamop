/* ══ SUSPENDRE NE DOIT PAS POUVOIR VISER L'ESPACE PAR DÉFAUT — 14 septembre 2026 ══════════
   La SUPPRESSION d'une entreprise refuse `elan-gestion` depuis toujours (REFUS_INTOUCHABLE,
   deux routes). La SUSPENSION, non — et elle coupe pourtant les mêmes appareils, par le même
   fbRevoquerEquipe. Ce qui la retenait n'était pas une garde mais un accident : `elan-gestion`
   est hors annuaire en production, donc espaceAJour() rend null et la route répond 404 avant
   d'arriver au moindre contrôle. Le jour où un espace de ce nom entre à l'annuaire, l'accident
   disparaît et suspendre « une entreprise » coupe TOUS les appareils qui n'ont rejoint aucun
   espace — ce que REFUS_INTOUCHABLE décrit mot pour mot.

   C'est pour ça que ce banc INSCRIT `elan-gestion` à l'annuaire : il reproduit exactement le
   jour où l'accident ne protège plus. Sans cette inscription, le test passerait au vert sur un
   404 et ne prouverait rien.

   Il LANCE le vrai serveur, isolé (configuration, données et port à lui), et lui parle en HTTP —
   même méthode que test-641.js. ⚠️ Il ne vise JAMAIS api.teamop.fr. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
function v(nom, recu, attendu) {
  const bon = JSON.stringify(recu) === JSON.stringify(attendu);
  if (bon) { ok++; console.log('  ✓ ' + nom); }
  else { ko++; console.log('  ✗ ' + nom + '\n      attendu ' + JSON.stringify(attendu) + '\n      reçu    ' + JSON.stringify(recu)); }
}

const banc = path.join(require('os').tmpdir(), 'teamop-test-675-' + process.pid);
let enfant = null;
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }

console.log('\n── 675 · suspendre ne vise jamais l\'espace par défaut ──');

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  const MDP = 'banc-675-mot-de-passe';
  const monHash = p => crypto.createHash('sha256').update(String(p)).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: monHash(MDP) }));
  /* `elan-gestion` INSCRIT À L'ANNUAIRE : c'est tout l'intérêt du banc (voir l'en-tête).
     `entreprise-a` est le témoin — sans lui, une garde trop large passerait inaperçue. */
  /* ⚠️ LA CLÉ DE L'ANNUAIRE N'A PAS DE TIRET, l'identifiant d'équipe si. `espSlug` retire tout
     ce qui n'est pas [a-z0-9] — « elan-gestion » devient « elangestion ». Écrire la clé avec
     son tiret rendait 404 sur les deux espaces, et le banc passait au vert sans avoir
     seulement atteint la garde. C'est `t` que ESPACES_INTOUCHABLES compare, pas le slug. */
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    /* Un accès ouvert mais JAMAIS utilisé : code complet (« a » + « mh »), aucun annuaire.
       C'est l'état exact d'une entreprise à qui on a donné son lien la semaine dernière. */
    'entreprisea': { slug: 'entreprisea', nom: 'A', email: 'a@exemple.fr', t: 'ent-a-9x', code: b64({ t: 'ent-a-9x', k: 'CLE-PRIVEE-DE-A-2026', a: 'pierre', mh: crypto.createHash('sha256').update('Martin!!').digest('hex') }), ts: 1 },
    /* ⚠️ ET UN ESPACE ANCIEN DONT LE CODE N'A NI « a » NI « mh » : il ne PEUT PAS être semé,
       donc le code d'accès reste sa seule porte. C'est la population à traiter avant de retirer
       la route — le serveur la nomme au journal, ce test vérifie qu'on ne la sème pas en
       croyant l'avoir traitée. */
    'vieilespace': { slug: 'vieilespace', nom: 'Vieux', email: 'v@exemple.fr', t: 'ent-vieux-1', code: b64({ t: 'ent-vieux-1', k: 'CLE-VIEILLE-2025' }), ts: 1 },
    'elangestion': { slug: 'elangestion', nom: 'Repli', email: 'r@exemple.fr', t: 'elan-gestion', code: b64({ t: 'elan-gestion', k: 'ELAN-GESTION-7F3A9C2E-cloud-2026' }), ts: 2 } }));

  const PORT = 8900 + (process.pid % 600);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT), TEAMOP_RATTRAPAGE_MS: '300' }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 60; i++) {
    try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); }
  }

  const poste = async (c, corps, jeton) => {
    const r = await fetch(B + c, { method: 'POST',
      headers: Object.assign({ 'Content-Type': 'application/json' }, jeton ? { Authorization: 'Bearer ' + jeton } : {}),
      body: JSON.stringify(corps || {}) });
    const txt = await r.text(); let json = null; try { json = JSON.parse(txt); } catch (e) {}
    return { statut: r.status, txt, json };
  };
  /* Ce que le serveur a VRAIMENT écrit sur disque. Un 403 qui aurait quand même ajouté
     l'identifiant à entFermes serait le pire des cas : le patron lit un refus, et tous les
     appareils sans espace tombent quand même. On ne croit donc pas la réponse, on relit. */
  const fermes = () => { try { return JSON.parse(fs.readFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), 'utf8')); } catch (e) { return null; } };
  /* ⚠️ `null` et non `{}` en cas d'échec de lecture, et le témoin ci-dessous EXIGE que le
     fichier existe : avec `{}`, un nom de fichier faux rendait « ne contient pas » vrai pour
     tout, et les trois contrôles « rien n'a été écrit » passaient sans rien lire. C'est
     exactement ce qui est arrivé à la première écriture de ce banc (« fermes.json »). */
  const dansFermes = (champ, id) => { const f = fermes(); return f ? (f[champ] || []).includes(id) : 'FICHIER ILLISIBLE'; };

  try {
    const cx = await poste('/api/monitor/login', { nom: 'Patron', pass: MDP });
    v('connexion à la Tour en patron', !!(cx.json && cx.json.token), true);
    const jeton = (cx.json || {}).token;

    // ── témoin : une vraie entreprise se suspend toujours (la garde ne doit pas tout bloquer)
    const a = await poste('/api/monitor/espaces/suspendre', { slug: 'entreprisea' }, jeton);
    v('témoin : une entreprise ordinaire se suspend', a.statut, 200);
    v('témoin : elle est bien écrite sur disque (prouve que le fichier est lu)', dansFermes('espaces', 'ent-a-9x'), true);

    // ── le point du jour
    const r = await poste('/api/monitor/espaces/suspendre', { slug: 'elangestion' }, jeton);
    v('⛔ suspendre l\'espace par défaut est REFUSÉ', r.statut, 403);
    v('⛔ et le refus explique pourquoi (pas un 403 muet)', /espace par défaut de l'application/.test(r.txt), true);
    v('⛔ RIEN n\'a été écrit : entFermes ne le contient pas', dansFermes('espaces', 'elan-gestion'), false);
    v('⛔ ni la liste des suspendus', dansFermes('suspendus', 'elan-gestion'), false);

    /* La RÉOUVERTURE reste ouverte exprès : si l'identifiant se retrouvait un jour dans
       entFermes (fichier réparé à la main, état hérité d'avant cette garde), l'interdire des
       deux côtés rendrait la panne définitive. On empêche d'ENTRER dans l'état, jamais d'en
       sortir. 409 est la bonne réponse ici — « il n'a pas été suspendu depuis la Tour » —
       ce qui prouve que la demande a traversé la garde au lieu d'être renvoyée en 403. */
    const ro = await poste('/api/monitor/espaces/suspendre', { slug: 'elangestion', rouvrir: true }, jeton);
    v('✅ rouvrir n\'est PAS bloqué par la garde', ro.statut === 403, false);

    /* ══ « POURQUOI ELAN-GESTION EST DANS LA TOUR ? » — Justin, 14 septembre 2026 ═══════════
       Parce que /api/monitor/entreprises part de DEUX sources : l'annuaire, et tout espace qui
       s'est déjà connecté. L'espace par défaut de l'application s'y connecte comme les autres,
       il entrait donc dans la liste ET dans le total, sans que rien ne dise sa nature.
       Il RESTE dans la liste — la Tour a un pavé à part pour le nommer, le retirer le rendrait
       invisible au lieu de l'expliquer — mais il sort des compteurs. */
    const r2 = await fetch(B + '/api/monitor/entreprises', { headers: { Authorization: 'Bearer ' + jeton } });
    const d2 = await r2.json();
    const par = {}; for (const x of (d2.entreprises || [])) par[x.t] = x;
    v('l\'espace par défaut est bien DANS la liste (on le nomme, on ne le cache pas)', !!par['elan-gestion'], true);
    v('⛔ et il se déclare technique', (par['elan-gestion'] || {}).technique, true);
    v('une vraie entreprise, elle, ne l\'est pas', (par['ent-a-9x'] || {}).technique, false);
    v('⛔ « entreprises connues » ne compte QUE les vraies', d2.total, 2);   // entreprisea + vieilespace, pas elan-gestion
    v('et le nombre d\'espaces techniques est dit à part', d2.techniques, 1);
    /* Le piège de ce contrôle : si `technique` disparaissait, `total` vaudrait 2 et ce test
       le verrait. Mais si la LISTE se mettait à exclure les techniques, `total` vaudrait 1
       aussi — d'où le premier contrôle, qui exige sa présence. Les deux ensemble, pas un seul. */
    v('les autres compteurs excluent aussi le technique', d2.horsAnnuaire, 0);

    /* ══ MÊME RÈGLE SUR « CONNEXIONS CLIENTS » ═══════════════════════════════════════════
       Justin, 14 septembre : « je ne veux plus les autres connexions clients, ce ne sont pas
       des clients ». Cet écran-là part des mêmes DEUX sources (annuaire + tout espace qui
       s'est connecté) : l'espace par défaut y comptait parmi les entreprises actives.
       Il reste dans la liste — l'écran le montre à part, nommé — mais il sort du compteur.
       Les deux contrôles ensemble : un seul se satisferait d'une liste qui l'exclut. */
    const r3 = await fetch(B + '/api/monitor/connexions', { headers: { Authorization: 'Bearer ' + jeton } });
    const d3 = await r3.json();
    const parC = {}; for (const x of (d3.espaces || [])) parC[x.t] = x;
    v('connexions : l\'espace par défaut est DANS la liste', !!parC['elan-gestion'], true);
    v('⛔ connexions : et il s\'y déclare technique', (parC['elan-gestion'] || {}).technique, true);
    v('✅ connexions : une vraie entreprise ne l\'est pas', (parC['ent-a-9x'] || {}).technique, false);
    v('⛔ connexions : il est compté à part', (d3.global || {}).techniques, 1);

    /* ══ L'ADRESSE EST POSÉE À LA CRÉATION ET NE BOUGE PLUS ═══════════════════════════════
       « le lien une fois créé ne peut plus être changé » — Justin, 14 septembre 2026. Cette
       route DÉPLAÇAIT l'adresse : l'entreprise l'avait donnée à ses équipes, mise en favori,
       écrite sur ses devis, et un renommage la rendait morte le jour même.
       Le contrôle qui compte n'est pas la réponse de la route — elle peut dire ce qu'elle
       veut — mais le FICHIER : la clé d'annuaire EST l'adresse, elle doit être là après, et
       aucune clé nouvelle ne doit être apparue. */
    const espaces = () => { try { return JSON.parse(fs.readFileSync(path.join(banc, 'data', 'espaces.json'), 'utf8')); } catch (e) { return null; } };
    const avantR = espaces();
    v('le banc lit bien espaces.json', !!(avantR && avantR['entreprisea']), true);
    const rn = await poste('/api/monitor/espaces/renommer', { slug: 'entreprisea', nouveau: 'Nettoyage Durand & Fils' }, jeton);
    v('le renommage aboutit', rn.statut, 200);
    const apresR = espaces();
    v('⛔ l\'adresse est TOUJOURS LÀ après le renommage', !!(apresR && apresR['entreprisea']), true);
    v('⛔ et AUCUNE adresse nouvelle n\'est apparue',
      apresR ? Object.keys(apresR).sort().join(',') : '?', Object.keys(avantR).sort().join(','));
    v('la route le dit aussi', (rn.json || {}).adresse, 'https://teamop.fr/e/entreprisea');
    v('✅ mais le nom affiché, lui, a bien changé', (apresR['entreprisea'] || {}).nom, 'Nettoyage Durand & Fils');
    /* Le nom voyage AUSSI dans le code de l'espace (champ « n ») : c'est lui que l'écran de
       connexion affiche. Oublié, l'entreprise garderait l'ancien nom devant les yeux. */
    let nCode = ''; try { nCode = JSON.parse(Buffer.from(apresR['entreprisea'].code, 'base64').toString('utf8')).n || ''; } catch (e) {}
    v('et dans le code de l\'espace, que l\'écran de connexion montre', nCode, 'Nettoyage Durand & Fils');

    /* ══ UNE ENTREPRISE NEUVE ENTRE PAR SON ADRESSE, SANS CODE D'ACCÈS ════════════════════
       « je ne veux plus le code, je veux que tout passe par le lien » — Justin. L'obstacle
       était l'œuf et la poule : un espace neuf n'a pas d'annuaire (il se remplit quand
       l'application dépose sa liste, donc APRÈS la première connexion), donc
       /api/espaces/connexion répondait 409 « utilise son code d'accès une première fois ».
       annuaireSemer dérive le premier vérificateur de « mh », déjà porté par le code de
       l'espace. C'est ce qui rend le code retirable — donc le contrôle qui compte ici. */
    const MDP_PROV = 'Durand!!';
    const hProv = crypto.createHash('sha256').update(MDP_PROV).digest('hex');
    const codeNeuf = b64({ t: 'ent-neuf-1', k: 'CLE-PRIVEE-NEUVE-2026', n: 'Durand Neuf',
                           a: 'marc', mh: hProv, e: 'marc@durand.fr' });
    const cr = await poste('/api/monitor/espaces', { nom: 'Durand Neuf', code: codeNeuf, origine: 'tour' }, jeton);
    v('l\'espace neuf est inscrit', cr.statut, 200);
    /* Le semis est volontairement sans await côté serveur (~100 ms de PBKDF2 que personne
       n'attend). On lui laisse le temps, puis on RELIT — pas de sommeil aveugle. */
    let semé = false;
    for (let i = 0; i < 40 && !semé; i++) {
      await new Promise(r => setTimeout(r, 50));
      try { semé = !!JSON.parse(fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8'))['ent-neuf-1']; } catch (e) {}
    }
    v('⛔ le premier compte est semé', semé, true);
    const cx1 = await poste('/api/espaces/connexion', { nom: 'durandneuf', login: 'marc', h: hProv });
    v('⛔ elle entre par son ADRESSE seule, sans code d\'accès', cx1.statut, 200);
    v('⛔ et ce n\'est plus « utilise son code d\'accès »', /sans-annuaire/.test(cx1.txt), false);
    /* Le contre-test, sans lequel le précédent ne prouverait rien : un semis qui laisserait
       entrer n'importe quel mot de passe passerait le test ci-dessus tout aussi bien. */
    const cx2 = await poste('/api/espaces/connexion', { nom: 'durandneuf', login: 'marc',
      h: crypto.createHash('sha256').update('pas-le-bon').digest('hex') });
    v('✅ mais un mauvais mot de passe est refusé', cx2.statut, 403);
    const cx3 = await poste('/api/espaces/connexion', { nom: 'durandneuf', login: 'inconnu', h: hProv });
    v('✅ et un identifiant inconnu aussi', cx3.statut, 403);

    /* ══ LE RATTRAPAGE : LES ESPACES D'AVANT LE SEMIS ═══════════════════════════════════════
       Semer à la création ne suffit pas à retirer le code d'accès. `entreprisea` est inscrite
       dans espaces.json AVANT le démarrage, sans annuaire — exactement l'état d'une entreprise
       à qui on a ouvert un accès qu'elle n'a pas encore utilisé. Sans rattrapage, retirer le
       code l'enfermerait dehors définitivement.
       Le banc règle le délai à 300 ms (TEAMOP_RATTRAPAGE_MS) : un rattrapage qu'on ne peut pas
       éprouver est un rattrapage qu'on croit sur parole. */
    const cptes = () => { try { return JSON.parse(fs.readFileSync(path.join(banc, 'data', 'comptes.json'), 'utf8')); } catch (e) { return {}; } };
    let rattrape = false;
    for (let i = 0; i < 40 && !rattrape; i++) { await new Promise(r => setTimeout(r, 50)); rattrape = !!cptes()['ent-a-9x']; }
    v('⛔ un espace inscrit AVANT le semis est rattrapé au démarrage', rattrape, true);
    /* Et il ne rattrape PAS l'espace par défaut : lui semer un compte de départ donnerait une
       porte d'entrée nominative à un espace partagé par tout le monde. */
    v('⛔ mais JAMAIS l\'espace par défaut', !!cptes()['elan-gestion'], false);
    v('⚠️ un code sans « a » ni « mh » n\'est PAS semé — le code d\'accès reste sa seule porte',
      !!cptes()['ent-vieux-1'], false);
    /* Et il ne faut pas croire que c'est réglé pour lui : la connexion par adresse le refuse
       toujours, avec le message qui renvoie au code. C'est la preuve qu'il reste du travail
       AVANT de supprimer la route, pas après. */
    const cxV = await poste('/api/espaces/connexion', { nom: 'vieilespace', login: 'pierre', h: hProv });
    v('⚠️ et il répond encore « sans-annuaire »', /sans-annuaire/.test(cxV.txt), true);
  } finally { stop(); }

  /* ══ LA TOUR : LE CHAMP DU SERVEUR FAIT FOI, LE MIROIR RESTE EN REPLI ═════════════════
     entNature() est EXTRAITE du vrai tour.html et exécutée — pas relue. Ce qui compte ici
     n'est pas qu'elle classe bien `elan-gestion` (le miroir y suffisait), c'est qu'elle
     obéisse à un serveur qui nomme un espace technique que le miroir NE CONNAÎT PAS : le
     jour où un troisième espace par défaut existera, la Tour ne doit pas attendre une
     republication pour le savoir.
     ⚠️ Et le repli doit survivre : la Tour se publie par GitHub Pages, le serveur par le VPS.
     Entre les deux, une Tour neuve parle à un serveur d'avant le champ — si le miroir
     disparaissait, `elan-gestion` redeviendrait « inconnu », donc une entreprise. */
  const TOUR = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
  const mTech = TOUR.match(/var ESPACES_TECHNIQUES=\[[^\]]*\];/);
  const mNat = TOUR.match(/function entNature\(o\)\{[\s\S]*?\n\}/);
  v('entNature et sa liste sont bien extraites du vrai fichier', !!(mTech && mNat), true);
  if (mTech && mNat) {
    const entNature = new Function(mTech[0] + '\n' + mNat[0] + '\nreturn entNature;')();
    v('serveur : technique → technique', entNature({ t: 'peu-importe', technique: true }), 'technique');
    v('⛔ un espace technique INCONNU du miroir est quand même reconnu',
      entNature({ t: 'espace-defaut-futur-2027', technique: true, dansAnnuaire: false }), 'technique');
    v('✅ le repli tient quand le serveur ne dit rien (écart de déploiement)',
      entNature({ t: 'elan-gestion', dansAnnuaire: false }), 'technique');
    v('une vraie cliente reste une cliente', entNature({ t: 'ent-a-9x', technique: false, dansAnnuaire: true, origine: 'site' }), 'cliente');
    v('un espace hors annuaire reste inconnu', entNature({ t: 'orphelin-x', technique: false, dansAnnuaire: false }), 'inconnu');
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { stop(); console.error(e); process.exit(1); });
