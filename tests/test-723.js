/* ⛔ CE QUE CE FICHIER GARDE — le socle (`server/socle.js`), étape 1 de la sortie de Firestore.

   Comme `test-641.js`, il vise `server/` et pas `app.html` ; contrairement à lui, il n'a pas
   besoin de lancer le serveur : le socle est un module, on l'exerce directement, isolé
   (TEAMOP_DATA et TEAMOP_KEK à lui, dans un dossier temporaire effacé à la fin). Rien n'est
   simulé — c'est le VRAI fichier qui sera déployé qui écrit, chiffre, relit et efface.

   Les six contrôles marqués ⛔ gardent des défauts CONSTATÉS le 18 septembre 2026 en exerçant
   le fichier, pas déduits en le lisant :

     1. `a.b` et `a_b` retombaient sur le MÊME `socle/a_b/base.db`. Deux entreprises, un
        fichier — tout le cloisonnement structurel percé par une fonction de « nettoyage »
        qui rapprochait deux identifiants distincts. On refuse un identifiant sale.
     2. Une SEULE ligne dont `maj_le` avait été trafiqué faisait jeter `depuis()` : l'entreprise
        ne synchronisait plus jamais, ni ses 20 000 autres lignes, ni sa Réception, et sans
        moyen de savoir laquelle. L'AAD doit rendre une ligne VISIBLE, pas murer un client.
     3. Le curseur se prenait sur les lignes RENDUES. Une ligne illisible en fin de page et
        l'appareil redemandait la même page pour toujours.
     4. Un refus d'écriture consommait quand même un rang.
     5. `effacerEntreprise` rendait un compte de `unlink` réussis — qui ne dit rien, parce que
        `close()` fait déjà disparaître `-wal` et `-shm`. On veut un VERDICT constaté.
     6. Le WAL restait à 4,3 Mo après son point de reprise, pour une base de 4,2 Mo : chaque
        entreprise occupait le double sur le seul disque du VPS.

   ⚠️ Le contre-test compte autant que le test : un identifiant RÉEL (`elan-34oc`,
   `opgestion-beta`) doit passer. Un contrôle qui refuse tout est un contrôle qui ne sert
   à rien, et il ferait tomber la production le jour où on l'allume. */

const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { execFileSync } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SOCLE_JS = path.join(RACINE, 'server', 'socle.js');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);

const DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'socle-banc-'));
const KEK = crypto.randomBytes(32).toString('hex');
process.env.TEAMOP_DATA = DIR;
process.env.TEAMOP_KEK = KEK;
delete process.env.CREDENTIALS_DIRECTORY;
const S = require(SOCLE_JS);
const T = 'elan-34oc';
const baseDe = t => path.join(DIR, 'socle', t, 'base.db');
/* Trafiquer la base par une AUTRE connexion : c'est ce que ferait un script de rangement,
   une restauration mal ciblée ou un intrus — jamais le socle lui-même. */
const trafiquer = (t, sql) => { const db = new (require('node:sqlite').DatabaseSync)(baseDe(t)); db.exec(sql); db.close(); };

/* ══ 1. L'ALLER-RETOUR — ce qu'on écrit est ce qu'on relit ═════════════════════════════ */
console.log('Un enregistrement écrit se relit à l\'identique, chiffré au repos');
{
  const r = S.pousser(T, [
    { c: 'clients', id: 'c1', m: 1000, r: { nom: 'Boulangerie', ville: 'La Rochelle' }, e: 'h1' },
    { c: 'clients', id: 'c2', m: 1001, r: { nom: 'Mairie' }, e: 'h2' },
    { c: 'produits', id: 'p1', m: 1002, r: { nom: 'Gel', stock: 12 }, e: 'h3' },
  ], { app_id: 'app-A', utilisateur: 'jean', ver: '723' });
  v('trois lignes acceptées', [r.acceptes, r.refus.length], [3, 0]);

  const d = S.depuis(T, 0, 400);
  v('trois lignes relues', d.enr.length, 3);
  v('le corps est identique', d.enr[0].r, { nom: 'Boulangerie', ville: 'La Rochelle' });
  v('aucune ligne illisible', d.illisibles.length, 0);
  /* ⛔ `seq` est un rang SERVEUR. Dans le corps, il entrerait dans l'empreinte du client, donc
     re-tamponnerait chaque enregistrement à chaque enregistrement — le défaut que
     `tests/test-639.js` surveille déjà sur `_ms`. */
  v('⛔ le rang serveur n\'entre jamais dans le corps', Object.keys(d.enr[0].r).sort(), ['nom', 'ville']);

  /* Le fichier sur le disque ne doit PAS contenir le texte en clair. */
  const brut = fs.readFileSync(baseDe(T));
  v('⛔ « Boulangerie » n\'apparaît nulle part en clair sur le disque', brut.includes(Buffer.from('Boulangerie')), false);
}

/* ══ 2. LES REFUS — motivés, jamais silencieux, et sans brûler de rang ═════════════════ */
console.log('\nUn refus porte un motif que l\'écran peut dire');
{
  const avant = S.etat(T).seq;
  v('sans collection ni identifiant', S.pousser(T, [{ c: '', id: 'x', m: 5, r: {} }]).refus[0].motif, 'identite');
  /* La règle d'écartement par tombe du client est `tombe >= (enr._m || 0)` : un enregistrement
     daté 0 est tuable par n'importe quelle tombe de n'importe quelle époque. */
  v('daté 0 — tuable par n\'importe quelle tombe', S.pousser(T, [{ c: 'clients', id: 'y', m: 0, r: {} }]).refus[0].motif, 'non_date');
  v('corps manquant hors suppression', S.pousser(T, [{ c: 'clients', id: 'z', m: 5 }]).refus[0].motif, 'corps_absent');
  /* ⛔ LE REFUS PORTE LA VERSION DU SERVEUR, PAS SEULEMENT SA DATE. Sans le corps, l'appareil
     ne pourrait qu'effacer le sien ou ignorer le refus : il ADOPTE celle-ci et met la sienne
     de côté. On ne détruit jamais ce qu'on refuse d'écrire, et on dit où le retrouver.
     (L'arbitrage complet du §2.6 est éprouvé plus bas, section 11.) */
  const c = S.pousser(T, [{ c: 'clients', id: 'c1', m: 1000, r: { nom: 'PIRATE' } }]).refus[0];
  v('à date égale, le serveur garde ce qu\'il a', [c.motif, c.serveur.m], ['conflit', 1000]);
  v('   et il rend SA version, pas seulement sa date', c.serveur.r, { nom: 'Boulangerie', ville: 'La Rochelle' });
  v('le refusé n\'a rien écrasé', S.depuis(T, 0, 400).enr.find(e => e.id === 'c1').r.nom, 'Boulangerie');
  /* ⛔ 18 septembre 2026 : un refus `corps_absent` faisait quand même monter `meta.seq`. */
  v('⛔ quatre refus n\'ont brûlé aucun rang', S.etat(T).seq, avant);
}

/* ══ 3. LA TOMBE ══════════════════════════════════════════════════════════════════════ */
console.log('\nUne suppression voyage comme une tombe, sans corps');
{
  S.pousser(T, [{ c: 'clients', id: 'c2', m: 2000, sup: 2000 }]);
  const e = S.depuis(T, 0, 400).enr.find(x => x.id === 'c2');
  v('la tombe se relit, sans corps', [e.sup, e.r], [2000, null]);
  v('elle sort du comptage vivant', S.etat(T).parColl.clients.n, 1);
}

/* ══ 4. ⛔ L'AAD — une ligne trafiquée se VOIT, et ne mure pas l'entreprise ════════════ */
console.log('\n⛔ Une ligne trafiquée cesse de se déchiffrer — et elle SEULE');
{
  const lot = [];
  for (let i = 0; i < 300; i++) lot.push({ c: 'produits', id: 'px' + i, m: 3000 + i, r: { nom: 'Produit ' + i, stock: i } });
  S.pousser(T, lot);
  const nAvant = S.depuis(T, 0, 400).enr.length;

  /* Ce que GCM ne garantit PAS : la FRAÎCHEUR. Sans `maj_le` dans l'AAD, un
     `UPDATE enr SET maj_le=<dans dix ans>` ferait gagner la ligne à toutes les fusions,
     pour toujours, sans que rien ne se voie. */
  trafiquer(T, "UPDATE enr SET maj_le=9999999999999 WHERE coll='produits' AND id='px150'");
  let jete = false, d = null;
  try { d = S.depuis(T, 0, 400); } catch (e) { jete = true; }
  v('⛔ la lecture NE TOMBE PAS (elle tombait le 18 septembre au matin)', jete, false);
  v('la ligne trafiquée est écartée et nommée', d.illisibles, [{ c: 'produits', id: 'px150', s: d.illisibles[0] && d.illisibles[0].s }]);
  v('⛔ toutes les autres sont servies', d.enr.length, nAvant - 1);
  v('⛔ un corps douteux n\'est JAMAIS servi', d.enr.some(e => e.id === 'px150'), false);
  const ver = S.verifier(T);
  v('verifier() la trouve et le dit', [ver.ok, ver.illisibles.length], [false, 1]);
}

/* ══ 5. ⛔ LE CURSEUR — pris sur la base, jamais sur ce qu'on rend ════════════════════ */
console.log('\n⛔ Une ligne illisible en fin de page ne fait pas piétiner l\'appareil');
{
  trafiquer(T, 'UPDATE enr SET maj_le=8888888888888 WHERE seq=(SELECT MAX(seq) FROM enr)');
  const p = S.depuis(T, 0, 400);
  v('⛔ le curseur dépasse la ligne illisible', p.curseur, S.etat(T).seq);
  v('⛔ il ne reste rien à relire (sinon : boucle infinie)', p.reste, 0);
  v('la page suivante est vide', S.depuis(T, p.curseur, 400).enr.length, 0);
}

/* ══ 6. ⛔ L'IDENTIFIANT D'ENTREPRISE — refusé, jamais nettoyé ════════════════════════ */
console.log('\n⛔ Deux entreprises ne peuvent pas partager un fichier');
{
  /* 18 septembre 2026, MESURÉ : `a.b` et `a_b` retombaient sur `socle/a_b/base.db`. */
  const refuse = x => { try { S.pousser(x, [{ c: 'x', id: '1', m: 1, r: {} }]); return false; } catch (e) { return true; } };
  for (const mauvais of ['a.b', 'a_b/../a-b', '../evil', '', 'elan/34', '-abc', 'a'.repeat(65), 'élan'])
    v('⛔ refusé : ' + JSON.stringify(mauvais), refuse(mauvais), true);
  /* ⚠️ LE CONTRE-TEST. Un contrôle qui refuse tout ferait tomber la production. */
  for (const bon of ['elan-34oc', 'opgestion-beta', 'elan_gestion', 'elan-gestion-beta', 'a'])
    v('⚠️ accepté (identifiant réel) : ' + bon, refuse(bon), false);
  v('un seul dossier par identifiant accepté', fs.existsSync(path.join(DIR, 'socle', 'a_b')), false);
}

/* ══ 7. ⛔ EFFACER — un verdict constaté, pas un compte ═══════════════════════════════ */
console.log('\n⛔ Effacer une entreprise se CONSTATE');
{
  const cible = 'a-effacer';
  S.pousser(cible, [{ c: 'clients', id: 'c1', m: 1, r: { nom: 'X' } }]);
  vrai('les trois fichiers WAL existent avant', ['', '-wal', '-shm'].every(s => fs.existsSync(baseDe(cible) + s)));
  const r = S.effacerEntreprise(cible);
  /* ⛔ « ok » est la SEULE chose sur quoi un appelant a le droit d'annoncer une entreprise
     effacée. Croire une entreprise coupée quand elle ne l'est pas est la panne type. */
  v('⛔ le verdict est constaté sur le disque ET dans l\'annuaire', r, { ok: true, dossier: false, restes: [], annuaire: 0 });
  v('plus aucun des trois fichiers', ['', '-wal', '-shm'].filter(s => fs.existsSync(baseDe(cible) + s)), []);
}

/* ══ 8. LA CLÉ MAÎTRE — le témoin, dans un VRAI autre processus ═══════════════════════ */
console.log('\nUne clé qui ne correspond pas refuse d\'ouvrir, et le dit');
{
  S.pousser('temoin-x', [{ c: 'a', id: '1', m: 1, r: { v: 'secret' } }]);
  const lecteur = path.join(DIR, 'lire.js');
  fs.writeFileSync(lecteur, "try{const d=require(" + JSON.stringify(SOCLE_JS) + ").depuis('temoin-x',0,10);"
    + "console.log('LU '+JSON.stringify(d.enr[0].r));}catch(e){console.log('REFUS '+e.message.split('\\n')[0]);}");
  const lire = env => execFileSync('node', [lecteur], { env, encoding: 'utf8' }).trim();
  const base = { ...process.env, TEAMOP_DATA: DIR };

  v('avec la même clé, la ligne se lit', lire({ ...base, TEAMOP_KEK: KEK }), 'LU {"v":"secret"}');
  /* ⛔ Sans le témoin, une réinstallation qui tire une clé neuve démarre VERT : /health répond,
     SQLite ouvre, et l'échec ne se voit qu'au déchiffrement, où il ressemble à de la corruption. */
  const neuve = lire({ ...base, TEAMOP_KEK: crypto.randomBytes(32).toString('hex') });
  vrai('⛔ une clé neuve REFUSE d\'ouvrir une base existante', /^REFUS .*la clé maître ne correspond PAS/.test(neuve));
  const sans = { ...base }; delete sans.TEAMOP_KEK; delete sans.CREDENTIALS_DIRECTORY;
  vrai('⛔ pas de clé + des bases existantes = un INCIDENT, dit comme tel', /^REFUS .*INCIDENT/.test(lire(sans)));
  vrai('   et il dit de ne PAS en générer une neuve', /REFUS/.test(lire(sans)));
}

/* ══ 9. PLUSIEURS APPAREILS À LA FOIS ════════════════════════════════════════════════ */
console.log('\nTrois appareils qui écrivent en même temps ne se perdent pas');
{
  const ecrivain = path.join(DIR, 'ecrire.js');
  fs.writeFileSync(ecrivain, "const S=require(" + JSON.stringify(SOCLE_JS) + ");const n=process.argv[2];"
    + "const l=[];for(let i=0;i<200;i++)l.push({c:'lot'+n,id:'x'+i,m:1700000000000+i,r:{v:i}});"
    + "process.stdout.write(String(S.pousser('concurrent',l).acceptes));");
  S.pousser('concurrent', [{ c: 'amorce', id: '0', m: 1, r: {} }]);
  const env = { ...process.env, TEAMOP_DATA: DIR, TEAMOP_KEK: KEK };
  const { spawnSync } = require('child_process');
  const faits = [1, 2, 3].map(n => spawnSync('node', [ecrivain, String(n)], { env, encoding: 'utf8' }).stdout);
  v('les trois ont tout écrit', faits, ['200', '200', '200']);
  v('le rang est exact — rien n\'est perdu ni compté deux fois', S.etat('concurrent').seq, 601);
  v('tout se relit', S.verifier('concurrent').ok, true);
}

/* ══ 10. CE QUE LE FICHIER PROMET — relu dans son texte ══════════════════════════════ */
console.log('\nLes invariants de structure');
{
  const src = fs.readFileSync(SOCLE_JS, 'utf8');
  /* ⛔ UNE SEULE PORTE POUR LE SQL. Même discipline que `espacesEcrire()` : un cloisonnement
     qui n'a qu'une porte se surveille — et si `node:sqlite` change (le module est marqué
     expérimental par Node), l'adaptation tient à un seul endroit. */
  /* ⚠️ ON RETIRE LES COMMENTAIRES AVANT DE CHERCHER. Ce contrôle a d'abord mis au rouge un
     fichier parfaitement conforme, parce qu'un COMMENTAIRE y disait « pas par un
     `require('node:sqlite')` local » — c'est-à-dire qu'il échouait sur la phrase qui explique
     la règle. Un banc qui punit un bon commentaire est un banc qu'on finit par affaiblir ;
     celui-ci regarde le code. */
  const sansCommentaires = src => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  const ailleurs = fs.readdirSync(path.join(RACINE, 'server'))
    .filter(f => f.endsWith('.js') && f !== 'socle.js')
    .filter(f => /require\(['"]node:sqlite['"]\)/.test(sansCommentaires(fs.readFileSync(path.join(RACINE, 'server', f), 'utf8'))));
  v('⛔ `node:sqlite` n\'est requis QUE par socle.js', ailleurs, []);
  /* ⛔ L'AAD lie le bloc à sa place ET à sa fraîcheur. La retirer se voit ici. */
  vrai('⛔ l\'AAD d\'un corps porte t, coll, id, maj_le et supprime_le',
    /aadCorps = \(t, coll, id, majLe, supprimeLe\) =>\s*t \+ '\|' \+ coll \+ '\|' \+ id \+ '\|' \+ majLe \+ '\|' \+ supprimeLe/.test(src));
  /* ⛔ La clé maître n'est pas un fichier de /opt : un instantané IONOS est une image de
     VOLUME, et ranger la clé dans l'arborescence qu'elle protège ne protège de rien. */
  v('⛔ la clé maître ne se lit jamais dans /opt', /['"]\/opt\/teamop\/[^'"]*(kek|cle|key)/i.test(src), false);
  vrai('⛔ elle vient de l\'environnement ou de $CREDENTIALS_DIRECTORY',
    /process\.env\.TEAMOP_KEK/.test(src) && /CREDENTIALS_DIRECTORY/.test(src));
  /* ⛔ Le WAL tronqué : sans la limite, chaque entreprise occupe le double sur le disque. */
  v('⛔ le WAL est plafonné (deux bases, deux PRAGMA)', (src.match(/journal_size_limit=\d+/g) || []).length, 2);
  /* ⛔ /health est publique : elle ne dit jamais quelles entreprises existent. */
  const sante = S.sante();
  v('sante() ne nomme aucune entreprise', Object.keys(sante).sort(), ['actif', 'bases', 'cle']);
  v('   et ne rend que des nombres et des booléens', Object.values(sante).every(x => typeof x !== 'string' && typeof x !== 'object'), true);
  /* La table s'appelle `diagnostic`, PAS `acces` : `acces.json` désigne déjà les codes
     d'accès d'espace, et ce dépôt a déjà supprimé quelque chose sur la foi d'un nom. */
  v('⛔ la table de diagnostic ne s\'appelle pas `acces`', /CREATE TABLE IF NOT EXISTS acces\b/.test(src), false);
  vrai('⛔ elle s\'appelle `diagnostic`', /CREATE TABLE IF NOT EXISTS diagnostic\b/.test(src));
}

/* ══ 11. L'ARBITRAGE DU §2.6 — QUATRE CAS, PAS UN ═══════════════════════════════════ */
console.log('\n⛔ Le serveur ne tranche jamais une égalité en silence');
{
  const A = 'arbitrage';
  const p = l => S.pousser(A, [l]);
  p({ c: 'box', id: 'b1', m: 5000, e: 'ENTIERE', r: { nom: 'Cave', photos: ['p1', 'p2', 'p3', 'p4'] } });

  v('plus récent → accepté', p({ c: 'box', id: 'b1', m: 5001, e: 'B', r: { nom: 'Cave 2' } }).acceptes, 1);
  const noop = p({ c: 'box', id: 'b1', m: 5001, e: 'B', r: { nom: 'Cave 2' } });
  v('même date + même empreinte → renvoi gratuit', [noop.acceptes, noop.refus.length], [1, 0]);
  v('   et le rang n\'a pas bougé', S.etat(A).seq, 2);

  /* ⛔ LE CAS QUI COÛTE DES PHOTOS. `syncAlleger` marque `horsNuage`/`photosHorsNuage` des
     enregistrements qui portent le MÊME id et le MÊME `_m` avec deux contenus différents —
     l'un avec ses quatre photos, l'autre amputé. Un départage alphabétique sur l'appareil
     ferait gagner la version amputée une fois sur deux, et les PDF signés comme les photos
     de chantier disparaîtraient de TOUS les appareils à la fois, sans un message. */
  p({ c: 'box', id: 'b2', m: 6000, e: 'ENTIERE', r: { nom: 'Cuisine', photos: ['p1', 'p2', 'p3', 'p4'] } });
  const conf = p({ c: 'box', id: 'b2', m: 6000, e: 'AMPUTEE', r: { nom: 'Cuisine', photos: [] } });
  v('⛔ même date + empreinte différente → conflit', conf.refus[0].motif, 'conflit');
  v('⛔ et le serveur rend SA version, entière', conf.refus[0].serveur.r.photos.length, 4);
  v('   la base garde la version entière', S.depuis(A, 0, 10).enr.find(e => e.id === 'b2').r.photos.length, 4);

  const per = p({ c: 'box', id: 'b2', m: 5999, e: 'VIEILLE', r: { nom: 'vieux' } });
  v('plus ancien → perime, avec la version serveur', [per.refus[0].motif, per.refus[0].serveur.m], ['perime', 6000]);

  /* Sans empreinte des deux côtés, on ne SAIT pas que les contenus sont les mêmes. « Je ne
     sais pas » se tranche vers le conflit — qui coûte un aller-retour — jamais vers
     l'acceptation, qui coûte une donnée. */
  p({ c: 'x', id: 'y', m: 7000, r: { a: 1 } });
  v('sans empreinte, l\'égalité est un conflit', p({ c: 'x', id: 'y', m: 7000, r: { a: 1 } }).refus[0].motif, 'conflit');
  v('une tombe rejouée à l\'identique est un renvoi gratuit',
    (p({ c: 'x', id: 'y', m: 8000, sup: 8000 }), p({ c: 'x', id: 'y', m: 8000, sup: 8000 })).acceptes, 1);

  /* ⛔ UNE HORLOGE DE TÉLÉPHONE EST FAUSSE PLUS SOUVENT QU'ON NE CROIT, et une date en avance
     gagne TOUS les arbitrages jusqu'à ce qu'elle soit rattrapée — des mois si l'écart est de
     six mois. Aujourd'hui c'est totalement invisible. */
  const hor = p({ c: 'box', id: 'b3', m: Date.now() + 600000, e: 'E', r: {} });
  v('⛔ horloge en avance → refusée, avec l\'écart', [hor.refus[0].motif, hor.refus[0].ecartMin], ['horlogeAvancee', 10]);
  v('   deux minutes d\'avance restent tolérées', p({ c: 'box', id: 'b4', m: Date.now() + 120000, e: 'E', r: {} }).acceptes, 1);
  /* ⛔ Le compteur vit dans `meta`, pas dans une Map en mémoire : celle-ci repart à zéro à
     chaque redémarrage, donc à chaque déploiement — plusieurs fois par jour les jours chargés. */
  v('⛔ le compteur d\'horloge survit et remonte à la Tour', S.etat(A).horlogeAvancee, 1);
}

/* ══ 12. LES SESSIONS D'APPAREIL ════════════════════════════════════════════════════ */
console.log('\n⛔ L\'identité d\'un appareil est allouée par le serveur');
{
  const E = 'sessions-x', sha = x => crypto.createHash('sha256').update(x).digest('hex');
  const a = S.sessionOuvrir(E, { jetonSha: sha('j1'), nom: 'iPhone de Jean' });
  vrai('un app_id est alloué', /^[0-9a-f]{32}$/.test(a.app_id));
  v('le jeton retrouve son entreprise', S.sessionParJeton(sha('j1')).t, E);
  v('un jeton inconnu ne retrouve rien', S.sessionParJeton(sha('inconnu')), null);

  /* ⛔ Trois raisons, toutes payantes : un appareil révoqué qui invente un app_id reprendrait
     une session (la Tour afficherait « révoqué » pendant qu'il lit) ; un appareil qui se
     nomme `zzzz` gagnerait toutes les égalités ; et se déclarer avec l'app_id d'un collègue
     remplacerait son jeton_sha et le déconnecterait sans un mot. */
  const pirate = S.sessionOuvrir(E, { jetonSha: sha('j2'), appId: 'ff'.repeat(16) });
  v('⛔ un app_id inventé n\'est pas honoré', pirate.app_id === 'ff'.repeat(16), false);
  v('⛔ le premier appareil reste connecté', !!S.sessionParJeton(sha('j1')), true);

  const renouv = S.sessionOuvrir(E, { jetonSha: sha('j3'), appId: a.app_id });
  v('un app_id CONNU se renouvelle sur la même ligne', [renouv.app_id === a.app_id, renouv.nouveau], [true, false]);
  v('   et l\'ancien jeton ne vaut plus rien', S.sessionParJeton(sha('j1')), null);

  S.sessionOuvrir(E, { jetonSha: sha('vieux'), exp: Date.now() - 1 });
  v('un jeton périmé est refusé', S.sessionParJeton(sha('vieux')), null);

  /* ⛔ COUPER DOIT COUPER, ET NE COUPER QUE LÀ. Croire une entreprise coupée alors qu'elle ne
     l'est pas est la panne silencieuse type de ce dépôt — d'où un nombre rendu, pas un
     booléen : l'appelant doit pouvoir le REMONTER. */
  S.sessionOuvrir('voisine', { jetonSha: sha('voisine') });
  const n = S.sessionsCouper(E);
  v('⛔ la coupure rend un NOMBRE, pas un booléen', typeof n, 'number');
  v('   les sessions de l\'entreprise sont coupées', S.sessionParJeton(sha('j3')), null);
  v('⛔ celles de la voisine sont intactes', !!S.sessionParJeton(sha('voisine')), true);
  v('   recouper ne coupe rien de plus', S.sessionsCouper(E), 0);
  const revenu = S.sessionOuvrir(E, { jetonSha: sha('j4'), appId: a.app_id });
  v('⛔ un appareil révoqué ne reprend pas sa ligne', revenu.app_id === a.app_id, false);
}

/* ══ 13. LE JOURNAL CHAÎNÉ ══════════════════════════════════════════════════════════ */
console.log('\n⛔ Un journal écrit par celui qu\'il surveille doit être vérifiable');
{
  const J = 'journal-x';
  for (let i = 0; i < 5; i++) S.diagnostic(J, { qui: 'justin', motif: 'dépannage ' + i, portee: 'box', n: i, ipH: 'h'.repeat(32) });
  /* ⛔ LE PIÈGE MESURÉ : la chaîne était d'abord ordonnée par (ts, id). Cinq lignes écrites
     dans la MÊME milliseconde se relisaient dans l'ordre de leurs id tirés au hasard, donc
     pas dans l'ordre où elles avaient été chaînées — `ancreVerifier()` criait au loup sur un
     journal intact. Un journal qui crie au loup en permanence est un journal qu'on débranche. */
  v('⛔ un journal intact se vérifie (il criait au loup le 18 au matin)', S.ancreVerifier().ok, true);
  v('l\'ancre porte le dernier maillon', [S.ancre().lignes, S.ancre().rang], [5, 5]);
  v('⛔ le journal rendu au client ne porte aucune adresse', 'ip_h' in S.diagnosticsDe(J, 1)[0], false);

  const chemin = path.join(DIR, 'socle-annuaire.db');
  const modifier = sql => { const db = new (require('node:sqlite').DatabaseSync)(chemin); db.exec(sql); db.close(); };
  modifier("UPDATE diagnostic SET motif='rien du tout' WHERE n=2");
  const cassee = S.ancreVerifier();
  v('⛔ une ligne réécrite casse la chaîne', [cassee.ok, cassee.motif], [false, 'empreinte']);
  vrai('   et elle est NOMMÉE', !!cassee.casse);

  /* ⛔ Une ligne EFFACÉE ne casserait aucune empreinte : chaque maillon ne connaît que son
     prédécesseur immédiat. C'est le rang manquant qui la trahit — sans ce second contrôle,
     « chaîné » ne voudrait rien dire contre qui efface plutôt que de réécrire. */
  /* ⚠️ On efface une ligne AVANT celle qu'on vient de réécrire : la vérification s'arrête au
     PREMIER maillon cassé, donc effacer après ne prouverait rien — c'est le contrôle
     d'empreinte qui répondrait, et on croirait tester le rang. */
  modifier("DELETE FROM diagnostic WHERE n=0");
  v('⛔ une ligne EFFACÉE est vue aussi', S.ancreVerifier().motif, 'rang manquant');
}

/* ══ 14. LES INVARIANTS DE L'ANNUAIRE ET DE LA PREUVE DE CLÉ ═══════════════════════ */
console.log('\nLes invariants qui tiennent le cloisonnement');
{
  const src = fs.readFileSync(SOCLE_JS, 'utf8');
  /* ⛔ L'annuaire est LE point faible par construction : c'est la seule table qui porte une
     colonne `t`, donc le seul endroit où un `WHERE t=?` peut manquer. On compte les requêtes
     qui la visent sans `t` et on en exige UNE SEULE — la recherche par jeton, qui ne peut pas
     en avoir puisque c'est elle qui FAIT NAÎTRE `t`. Une seconde, écrite un jour « pour aller
     plus vite », rouvrirait la porte. */
  const requetes = (src.match(/'[^']*\b(FROM|INTO|UPDATE)\s+(appareil|entreprise)\b[^']*'/g) || [])
    .concat(src.match(/`[^`]*\b(FROM|INTO|UPDATE)\s+(appareil|entreprise)\b[^`]*`/g) || []);
  const sansT = requetes.filter(q => !/\bt\s*=\s*\?/.test(q) && !/\(t\s*,/.test(q));
  v('⛔ UNE SEULE requête d\'annuaire sans `t` — celle du jeton', sansT.length, 1);
  vrai('⛔ et c\'est bien la recherche par jeton', /jeton_sha\s*=\s*\?/.test(sansT[0] || ''));
  vrai('   elle est nommée comme l\'exception dans le fichier', /L'EXCEPTION, NOMMÉE/.test(src));

  /* ⛔ Le serveur portait DEUX implémentations de la preuve de clé — `espaceCleOk` en `!==`,
     `cleEquipeVerdict` en `timingSafeEqual` — et elles avaient DÉJÀ divergé (l'une acceptait
     un kh en majuscules, l'autre non). Le socle s'appuie sur `sauvRefus`, donc sur la
     première : on unifie AVANT d'ouvrir une cinquième porte dessus, pas après. */
  const idx = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  const bloc = idx.slice(idx.indexOf('function espaceCleOk('), idx.indexOf('function cleEtat('));
  vrai('⛔ espaceCleOk DÉLÈGUE la comparaison', /cleEquipeVerdict\(t, kh\) === 'valide'/.test(bloc));
  v('⛔ elle ne compare plus de hachage elle-même', /createHash\('sha256'\)/.test(bloc), false);
  vrai('⛔ et la comparaison est en temps constant', /timingSafeEqual/.test(idx.slice(idx.indexOf('function cleEquipeVerdict('), idx.indexOf('function cleEquipeVerdict(') + 900)));
}

/* ══ 15. ⛔ CE QUE LA VÉRIFICATION DU 18 SEPTEMBRE A TROUVÉ ═════════════════════════
   Douze bloquants, tous prouvés par sonde avant d'être retenus. Ce bloc les empêche de
   revenir — chacun a coûté assez cher pour mériter sa ligne. */
console.log('\n⛔ Les douze bloquants de la vérification du 18 septembre');
{
  const V = 'verif-x';
  /* ⛔ 1. Un annuaire plus ancien que les bases ne doit PAS faire fabriquer une clé neuve.
     Sans ce refus, toutes les données d'une entreprise devenaient illisibles d'un coup, le
     serveur restait VERT, et les écritures suivantes empêchaient tout retour en arrière. */
  S.pousser(V, [{ c: 'p', id: '1', m: 1700000000000, e: 'h', r: { v: 'secret' } }]);
  S.fermer();
  const annu = path.join(DIR, 'socle-annuaire.db');
  { const db = new (require('node:sqlite').DatabaseSync)(annu); db.exec("DELETE FROM entreprise WHERE t='" + V + "'"); db.close(); }
  delete require.cache[require.resolve(SOCLE_JS)];
  const S2 = require(SOCLE_JS);
  let refus = '';
  try { S2.depuis(V, 0, 10); } catch (e) { refus = e.message; }
  vrai('⛔ annuaire désynchronisé → REFUS, pas une clé neuve', /sa clé n'est PAS dans l'annuaire/.test(refus));
  vrai('   et il dit de ne rien écrire', /Ne rien écrire/.test(refus));
  let ecrit = false;
  try { S2.pousser(V, [{ c: 'p', id: '2', m: 1700000009999, e: 'h', r: {} }]); ecrit = true; } catch (e) {}
  v('⛔ et l\'écriture par-dessus est refusée AUSSI', ecrit, false);
  /* ⚠️ Le contre-test : une entreprise vraiment neuve doit toujours pouvoir naître. */
  v('⚠️ une entreprise neuve naît toujours', S2.pousser('neuve-ok', [{ c: 'x', id: '1', m: 1700000000000, e: 'h', r: {} }]).acceptes, 1);

  /* ⛔ 2. Un refus de taille ne consomme PAS de rang. Le rang consommé faisait répondre
     `/api/op/flux` « du neuf » à chaque sondage, sans jamais rien livrer : la boucle serrée
     épuisait le quota horaire de toute l'entreprise, irréversiblement. */
  const av = S2.etat('neuve-ok').seq;
  const gros = S2.pousser('neuve-ok', [{ c: 'p', id: 'g', m: 1700000000001, e: 'h', r: { n: crypto.randomBytes(900000).toString('hex') } }]);
  v('⛔ un corps trop gros est refusé', gros.refus[0].motif, 'corps_trop_gros');
  v('⛔ et il ne brûle AUCUN rang (le flux tournerait en boucle)', S2.etat('neuve-ok').seq, av);

  /* ⛔ 3. Le plafond compte ce que le DISQUE porte, journal compris — il en comptait le
     vingtième sur une base qui change souvent. */
  for (let i = 0; i < 20; i++) S2.pousser('poids', [{ c: 'p', id: 'x', m: 1700000000000 + i, e: 'h' + i, r: { n: 'y'.repeat(3000), i } }]);
  const pz = S2.etat('poids');
  v('⛔ le total compté = vivant + journal', pz.octets, pz.octetsVivants + pz.octetsJournal);
  vrai('⛔ et le journal pèse lourd (ici ×10 au moins)', pz.octetsJournal > pz.octetsVivants * 10);
  v('⛔ la purge rend la place au compteur', (S2.purgerJournal('poids', Date.now() + 1000), S2.etat('poids').octets), pz.octetsVivants);

  /* ⛔ 4. `existe()` ne crée rien, et `etat()` remonte ce qui était écrit-jamais-lu. */
  v('⛔ existe() sur un inconnu ne crée pas de base', S2.existe('jamais-vue-du-tout'), false);
  S2.echecEnrolement('poids'); S2.echecEnrolement('poids');
  v('⛔ le compteur d\'échecs d\'enrôlement est LISIBLE', S2.etat('poids').echecsEnrolement, 2);

  /* ⛔ 5. Fermer et ROUVRIR. Une fermeture sans réouverture n'est pas une suspension. */
  S2.entrepriseOuvrir('poids', false);
  v('⛔ fermée', S2.entrepriseEtat('poids').etat, 'ferme');
  S2.entrepriseOuvrir('poids', true);
  v('⛔ et REOUVRABLE (sinon un client qui repaie reste bloqué pour toujours)', S2.entrepriseEtat('poids').etat, 'actif');

  /* ⛔ 6. L'instantané de sauvegarde : cohérent, sans WAL, et relisible.
     MESURÉ le 18 septembre : l'ancien chemin (tar sur les fichiers vivants) rendait 5 bases
     corrompues sur 6 pendant des écritures concurrentes, et la relecture les déclarait
     bonnes parce qu'elle comptait des NOMS DE FICHIERS. */
  const inst = path.join(DIR, 'inst-banc');
  const r = S2.instantanerVers(inst);
  vrai('⛔ l\'instantané prend l\'annuaire et les bases', r.bases >= 2 && r.fichiers.includes('socle-annuaire.db'));
  v('⛔ aucun -wal ni -shm à côté (c\'est ça qui cassait)', fs.readdirSync(inst).filter(f => /-wal$|-shm$/.test(f)).length, 0);
  const ctl = S2.controlerFichier(path.join(inst, 'poids.db'));
  v('⛔ et chaque base s\'OUVRE et se parcourt vraiment', ctl.ok, true);
  v('⛔ une base abîmée est VUE (pas juste comptée)',
    (fs.writeFileSync(path.join(inst, 'casse.db'), Buffer.alloc(9000, 3)), S2.controlerFichier(path.join(inst, 'casse.db')).ok), false);
  const cible = path.join(DIR, 'cible'); fs.mkdirSync(cible, { recursive: true });
  vrai('⛔ et le chemin de retour remet les bases en place', S2.restaurerDepuis(inst, cible) >= 2);

  /* ⛔ 7. Le réglage qui survit au redémarrage — une minuterie de 24 h sur un serveur qui
     redémarre plusieurs fois par jour ne se déclenche JAMAIS. */
  S2.reglagePoser('ancre_envoyee_le', 1234567890);
  v('⛔ un réglage se relit après coup', S2.reglageLire('ancre_envoyee_le'), '1234567890');
}

/* ══ 16. ⛔ LA TROISIÈME VÉRIFICATION — CE QUE LES CORRECTIFS DE LA VEILLE AVAIENT CASSÉ ══ */
console.log('\n⛔ Les bloquants de la troisième vérification');
{
  const T3 = 'tour3';
  delete require.cache[require.resolve(SOCLE_JS)];
  const S3 = require(SOCLE_JS);

  /* ⛔ 1. UN REFUS D'OUVERTURE NE FUIT PLUS DE DESCRIPTEUR. Le témoin de clé ajouté la veille
     s'exécutait APRÈS `new DatabaseSync` : chaque refus emportait le descripteur, et la base
     n'étant pas encore dans le cache, personne ne pouvait plus la fermer. MESURÉ avant
     correction : 277 descripteurs pour 200 requêtes refusées. La limite systemd est à 1 024 —
     quelques centaines de synchros retentées par une entreprise mal restaurée, et c'est EMFILE,
     donc PLUS AUCUNE route ne répond, pour tous les clients. */
  S3.pousser(T3, [{ c: 'p', id: '1', m: 1700000000000, e: 'h', r: { v: 1 } }]);
  S3.fermer();
  { const db = new (require('node:sqlite').DatabaseSync)(path.join(DIR, 'socle-annuaire.db')); db.exec("DELETE FROM entreprise WHERE t='" + T3 + "'"); db.close(); }
  delete require.cache[require.resolve(SOCLE_JS)];
  const S4 = require(SOCLE_JS);
  const fds = () => { try { return fs.readdirSync('/proc/self/fd').length; } catch (e) { return -1; } };
  let refus = 0;
  const base0 = (() => { for (let i = 0; i < 50; i++) { try { S4.ouvrir(T3); } catch (e) { refus++; } } return fds(); })();
  for (let i = 0; i < 300; i++) { try { S4.ouvrir(T3); } catch (e) { refus++; } }
  v('les 350 ouvertures sont bien refusées', refus, 350);
  v('⛔ et AUCUN descripteur ne fuit (277 fuyaient pour 200 refus)', fds(), base0);
  v('   ni aucun -wal laissé à côté', fs.existsSync(path.join(DIR, 'socle', T3, 'base.db-wal')), false);

  /* ⛔ 2. LE POIDS D'UNE RÉPONSE EST BORNÉ — SUR LE CLAIR, PAS SUR LE SCELLÉ. La borne de
     décompression était PAR LIGNE (16 Mo) et la réponse en porte 400 : 6,4 Go possibles en
     synchrone. Et la première borne totale comptait les octets SCELLÉS : MESURÉ, 400 lignes de
     400 Ko de texte répété pèsent presque rien compressées, la borne ne se déclenchait jamais,
     et la requête gelait quand même le serveur 1 396 ms. On compte donc ce qu'on décompresse. */
  const lourd = [];
  for (let i = 0; i < 400; i++) lourd.push({ c: 'p', id: 'z' + i, m: 1700000000000 + i, e: 'h' + i, r: { n: 'A'.repeat(400000), i } });
  S4.pousser('lourde', lourd);
  const p1 = S4.depuis('lourde', 0, 400);
  v('⛔ la page est TRONQUÉE par le poids', p1.tronquee, true);
  vrai('⛔ et elle rend beaucoup moins que 400 lignes', p1.enr.length < 100);
  /* ⚠️ RIEN N'EST PERDU : c'est à ça que sert la pagination. Une borne qui perdrait des
     enregistrements serait pire que l'absence de borne. */
  let cur = p1.curseur, tot = p1.enr.length, pages = 1;
  while (pages < 60) { const p = S4.depuis('lourde', cur, 400); if (!p.enr.length) break; cur = p.curseur; tot += p.enr.length; pages++; }
  v('⛔ et la base entière se relit quand même, page par page', tot, 400);
  /* ⚠️ LE CONTRE-TEST : une base NORMALE ne doit jamais être tronquée, sinon on a fabriqué
     une pagination inutile sur le dos de tous les clients. */
  const normal = [];
  for (let i = 0; i < 400; i++) normal.push({ c: 'p', id: 'n' + i, m: 1700000000000 + i, e: 'h' + i, r: { nom: 'Produit ' + i, notes: 'terrain '.repeat(20) } });
  S4.pousser('normale', normal);
  const pn = S4.depuis('normale', 0, 400);
  v('⚠️ une base normale n\'est PAS tronquée', [pn.enr.length, pn.tronquee], [400, false]);

  /* ⛔ 3. LE REFUS SMTP NE PORTE PLUS D'ADRESSE. `/health` est PUBLIQUE et publie `lastRefus` :
     un refus de serveur de messagerie porte presque toujours l'adresse concernée. Deux points
     d'appel y mettaient `e.message` tel quel — DEUX LIGNES sous le commentaire qui l'interdit.
     C'est le seul défaut de cette série qui touchait une exposition RÉELLE en production. */
  const idx = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
  const sansCom2 = x => x.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/[^\n]*/g, '$1');
  v('⛔ plus aucun message SMTP brut dans `lastRefus`', /lastRefus = \{[^}]*'SMTP: ' \+ String\(e\.message/.test(sansCom2(idx)), false);
  vrai('⛔ il passe par `refusSmtp`, qui ne rend qu\'une famille et un code', /lastRefus = \{ ts: Date\.now\(\), raison: refusSmtp\(e\) \}/.test(idx));
  {
    const f = new Function('e', sansCom2(idx).match(/function refusSmtp[\s\S]*?\n\}/)[0] + '\nreturn refusSmtp(e);');
    const sortie = f({ message: '550 5.1.1 <client-reel@exemple.fr>: Recipient address rejected', responseCode: 550 });
    v('⛔ et l\'adresse du client n\'y est PAS', /exemple\.fr|client-reel/.test(sortie), false);
    v('   mais le motif reste utile au dépannage', sortie, 'SMTP: destinataire refusé (550)');
  }
}

/* ══ LES GARDES DE DERNIER RECOURS, QUE RIEN N'ÉPROUVAIT ══════════════════════════════════
   ⛔ Relevé par la cinquième vérification : l'AAD n'était gardée que par une EXPRESSION
   RÉGULIÈRE SUR LE TEXTE (plus haut dans ce fichier). Remplacer l'AAD par une constante ne
   faisait donc tomber aucun banc — et l'AAD est ce qui lie la clé d'une entreprise à SON
   IDENTIFIANT, c'est-à-dire le dernier verrou du cloisonnement quand tout le reste a cédé :
   un annuaire trafiqué, une ligne déplacée d'une base à l'autre, une restauration mal ciblée.
   On l'EXERCE maintenant, dans les deux sens. */
console.log('\n⛔ Le cloisonnement cryptographique, exercé et non relu');
{
  const K = crypto.randomBytes(32);
  const dek = crypto.randomBytes(32);

  /* 1. LA CLÉ D'UNE ENTREPRISE, SCELLÉE SOUS SON IDENTITÉ. */
  const scelle = S.sceller(K, dek, 'entreprise-a');
  v('la clé se rouvre sous la BONNE entreprise', S.desceller(K, scelle, 'entreprise-a').equals(dek), true);
  {
    /* ⛔ LE CONTRÔLE QUI MANQUAIT. Présenter la clé de A en disant « je suis B » doit ÉCHOUER.
       Sans l'AAD, l'annuaire devient un simple sac de clés : qui peut y écrire une ligne peut
       donner la clé de n'importe qui à n'importe qui. */
    let jete = false;
    try { S.desceller(K, scelle, 'entreprise-b'); } catch (e) { jete = true; }
    vrai('⛔ la clé de A ne s\'ouvre PAS sous l\'identité de B', jete);
  }
  {
    let jete = false;
    try { S.desceller(crypto.randomBytes(32), scelle, 'entreprise-a'); } catch (e) { jete = true; }
    vrai('   ni sous une autre clé maître', jete);
  }

  /* 2. LE CORPS D'UN ENREGISTREMENT, LIÉ À SA PLACE EXACTE. */
  const corps = S.sceller_corps(dek, 'entreprise-a', 'produits', 'p1', 1700000000000, 0, { nom: 'Gel' });
  v('le corps se rouvre à sa place', S.desceller_corps(dek, 'entreprise-a', 'produits', 'p1', 1700000000000, 0, corps).nom, 'Gel');
  /* ⛔ CINQ DÉPLACEMENTS, CINQ REFUS. Chacun est un scénario réel : une ligne recopiée dans la
     base d'une autre entreprise, rangée sous une autre collection, réétiquetée avec un autre
     identifiant, redatée pour gagner un arbitrage, ou ressuscitée en effaçant sa tombe. */
  const deplacements = [
    ['une autre entreprise', ['entreprise-b', 'produits', 'p1', 1700000000000, 0]],
    ['une autre collection', ['entreprise-a', 'factures', 'p1', 1700000000000, 0]],
    ['un autre identifiant', ['entreprise-a', 'produits', 'p2', 1700000000000, 0]],
    ['une autre date', ['entreprise-a', 'produits', 'p1', 1700000000001, 0]],
    ['une tombe effacée', ['entreprise-a', 'produits', 'p1', 1700000000000, 1]],
  ];
  for (const [quoi, args] of deplacements) {
    /* ⚠️ UN SEUL APPEL, ET BIEN FORMÉ. Le premier jet en faisait deux, dont un à la mauvaise
       arité : il jetait pour une raison qui n'avait rien à voir, donc le contrôle passait
       QUOI QU'IL ARRIVE — précisément le défaut de banc que ce fichier existe pour traquer. */
    let jete = false, rendu;
    try { rendu = S.desceller_corps(dek, args[0], args[1], args[2], args[3], args[4], corps); }
    catch (e) { jete = true; }
    v('⛔ un corps déplacé vers ' + quoi + ' est REFUSÉ', [jete, rendu], [true, undefined]);
  }
}

/* ══ RESTAURER : LE JOUR OÙ ON EN A BESOIN, ON NE RÉPÈTE PAS L'ESSAI ══════════════════════
   ⛔ Ni la reprise des copies `.brut` ni le nettoyage des `-wal` orphelins n'était gardé, et
   le code lui-même nomme les deux comme le PIRE résultat possible d'une restauration :
   faire repartir à vide, en silence, précisément l'entreprise déjà en difficulté ; et
   fabriquer la corruption qu'on répare en laissant SQLite rejouer le journal de l'ancienne
   base par-dessus la neuve. */
console.log('\n⛔ La restauration : les deux pièges que le code nomme lui-même');
{
  const src = path.join(DIR, 'inst-banc'), cible = path.join(DIR, 'cible-banc');
  fs.rmSync(src, { recursive: true, force: true }); fs.rmSync(cible, { recursive: true, force: true });
  fs.mkdirSync(src, { recursive: true }); fs.mkdirSync(cible, { recursive: true });
  fs.writeFileSync(path.join(src, 'socle-annuaire.db'), Buffer.alloc(4096, 1));
  fs.writeFileSync(path.join(src, 'ent-saine.db'), Buffer.alloc(4096, 2));
  /* Une entreprise dont l'instantané a ÉCHOUÉ : elle part en copie brute. */
  fs.writeFileSync(path.join(src, 'ent-abimee.db.brut'), Buffer.alloc(4096, 3));
  /* Et une base vivante qui traîne un `-wal` de l'ANCIENNE version. */
  fs.mkdirSync(path.join(cible, 'socle', 'ent-saine'), { recursive: true });
  fs.writeFileSync(path.join(cible, 'socle', 'ent-saine', 'base.db'), Buffer.alloc(100, 9));
  fs.writeFileSync(path.join(cible, 'socle', 'ent-saine', 'base.db-wal'), Buffer.alloc(512, 9));

  const n = S.restaurerDepuis(src, cible);
  v('les trois fichiers sont remis', n, 3);
  vrai('l\'annuaire est là', fs.existsSync(path.join(cible, 'socle-annuaire.db')));
  vrai('l\'entreprise saine est là', fs.existsSync(path.join(cible, 'socle', 'ent-saine', 'base.db')));
  /* ⛔ LA COPIE BRUTE AUSSI. L'ignorer ferait repartir À VIDE l'entreprise déjà en difficulté —
     le pire résultat possible d'une restauration, et le plus silencieux. */
  vrai('⛔ l\'entreprise en copie BRUTE est restaurée elle aussi',
    fs.existsSync(path.join(cible, 'socle', 'ent-abimee', 'base.db')));
  /* ⚠️ ON LIT DÉFENSIVEMENT. La première version faisait un `readFileSync` nu : quand la
     reprise des `.brut` était retirée, le banc S'ÉCROULAIT sur un ENOENT au lieu d'ÉCHOUER, et
     une suite qui plante ne dit pas ce qu'elle gardait. Même leçon que dans `test-726`. */
  const lire1 = (c) => { try { return fs.readFileSync(c); } catch (e) { return null; } };
  v('   et c\'est bien son contenu', (lire1(path.join(cible, 'socle', 'ent-abimee', 'base.db')) || [])[0], 3);
  /* ⛔ ET LE JOURNAL ORPHELIN A DISPARU. Laissé là, SQLite le rejoue par-dessus la base
     restaurée et rend « database disk image is malformed » : la restauration FABRIQUE la
     corruption qu'elle répare. */
  v('⛔ le `-wal` orphelin de l\'ancienne base est effacé',
    fs.existsSync(path.join(cible, 'socle', 'ent-saine', 'base.db-wal')), false);
  v('   et la base restaurée a bien remplacé l\'ancienne',
    (lire1(path.join(cible, 'socle', 'ent-saine', 'base.db')) || { length: -1 }).length, 4096);
}

/* ══ L'ANCRE NE SE DÉCLARE PAS ENVOYÉE SI ELLE N'EST PAS SORTIE ═══════════════════════════
   ⛔ Le journal `diagnostic` est chaîné par empreinte, et le fichier le dit lui-même : la
   chaîne rend une MODIFICATION détectable, seule l'ancre sortie de la machine rend une
   RÉÉCRITURE COMPLÈTE détectable. C'est donc la seule moitié opposable du dispositif.
   `ancre_envoyee_le` était pourtant posé INCONDITIONNELLEMENT, après le `catch` : un envoi qui
   jette, ou aucun courriel configuré du tout, laissait quand même « envoyée aujourd'hui » sur
   le disque. Un dispositif qui se déclare vivant sans l'être est pire que pas de dispositif —
   on cesse de le surveiller. Relevé par la cinquième vérification.
   On monte donc le VRAI module de routes, avec un faux `app` et un `mailerEnvoi` qu'on fait
   réussir, jeter, ou manquer, et on regarde ce qui est écrit sur le disque. */
console.log('\n⛔ L\'ancre du journal chaîné : envoyée, ou pas ?');
{
  const OP = require(path.join(__dirname, '..', 'server', 'op-socle.js'));
  const fauxApp = { get() {}, post() {} };
  const TA = 'ent-ancre';
  /* ⛔ L'IDENTIFIANT EST VOLONTAIREMENT NON HEXADÉCIMAL, ET C'EST UN CORRECTIF DE BANC.
     Il valait `a1`, et le contrôle plus bas cherchait `a1` dans le texte du courriel — qui
     porte une empreinte SHA-256 en hexadécimal. Deux caractères hexa ont environ 22 % de
     chances d'apparaître dans 64 : le banc tombait donc UNE FOIS SUR CINQ, au hasard, en
     accusant le serveur de fuiter une donnée de client qu'il n'a jamais écrite. Un banc qui
     crie faux se fait ignorer, puis désactiver — c'est comme ça qu'on perd un garde-fou.
     Le jeton porte donc maintenant des lettres hors de `[0-9a-f]`, il ne peut plus coïncider
     avec une empreinte. */
  S.pousser(TA, [{ c: 'produits', id: 'zz-fiche-client-zz', m: 1700000000000, e: 'ea', r: { nom: 'A' } }]);

  const monter = (mailerEnvoi, dest) => OP.monterOpSocle(fauxApp, {
    config: { socle: { actif: true }, notifDemandes: dest, smtp: { from: 'moi@exemple.fr' } },
    socle: S, sauvRefus: () => null, cleEstPublique: () => false,
    quotaOk: () => true, monStr: (x, n) => String(x == null ? '' : x).slice(0, n),
    garde: (q, r, n) => n(), mailerEnvoi,
  });
  const lireDate = (c) => { try { return parseInt(S.reglageLire(c), 10) || 0; } catch (e) { return 0; } };
  const oublier = () => { S.reglagePoser('ancre_envoyee_le', ''); S.reglagePoser('ancre_tentee_le', ''); };

  /* 1. AUCUN COURRIEL CONFIGURÉ — rien ne sort, donc rien ne doit se dire sorti. */
  oublier();
  monter(null, '').ancreEnvoyer(true);
  v('⛔ sans courriel : « envoyée » n\'est PAS posé', lireDate('ancre_envoyee_le'), 0);
  vrai('   mais la tentative est datée (sinon on réessaie toutes les heures)', lireDate('ancre_tentee_le') > 0);

  /* 2. L'ENVOI JETTE — le cas qui a motivé le constat. */
  oublier();
  monter(() => { throw new Error('smtp mort'); }, 'moi@exemple.fr').ancreEnvoyer(true);
  v('⛔ envoi qui JETTE : « envoyée » n\'est PAS posé', lireDate('ancre_envoyee_le'), 0);
  vrai('   et la tentative est datée quand même', lireDate('ancre_tentee_le') > 0);

  /* 3. L'ENVOI RÉUSSIT — la contre-épreuve, sans laquelle « jamais posé » passerait au vert. */
  oublier();
  let vu = null;
  monter((m) => { vu = m; return { then: (ok2) => { ok2(); return { then() {} } } }; }, 'moi@exemple.fr').ancreEnvoyer(true);
  vrai('⛔ envoi réussi : « envoyée » EST posé', lireDate('ancre_envoyee_le') > 0);
  vrai('   et le message part bien au destinataire réglé', vu && vu.to === 'moi@exemple.fr');
  const FUITE = /produits|ent-ancre|zz-fiche-client-zz/;
  v('⛔ et il ne porte AUCUNE donnée de client', FUITE.test(String(vu && vu.text)), false);
  /* Et la preuve que le contrôle ci-dessus n'est pas vide : le même motif, sur un texte où
     la fuite EST présente, la trouve. Sans cette ligne, un motif cassé passerait au vert
     pour toujours — exactement ce qu'on vient de reprocher à ce banc. */
  vrai('   (et le motif saurait la voir : contrôle du contrôle)',
    FUITE.test('empreinte : 0123 \u2014 zz-fiche-client-zz'));
}

/* ══ ⛔ QUELLE LIGNE RÉFÉRENCE QUELLE PIÈCE — ÉTAPE 3 DU SOCLE ══════════════════════
   Sans ce registre, une pièce ne disparaît du disque du VPS que sur un geste du client
   (`pieceSupprimer`). Un onglet fermé au mauvais moment, une coupure réseau, une suppression
   faite depuis un AUTRE appareil — et le fichier reste là POUR TOUJOURS. Le dossier grossit
   sans fin, et c'est `pieces.remplissage` de `/health` qui finit par crier, trop tard, quand
   les dépôts sont déjà refusés sur le terrain. */
console.log('\n⛔ Les références aux pièces jointes : ce qui est encore cité, et ce qui ne l\'est plus');
{
  const TF = 'ent-fichiers';
  const A = 'a'.repeat(64), B = 'b'.repeat(64), C = 'c'.repeat(64);
  S.pousser(TF, [{ c: 'interventions', id: 'i1', m: 1000, e: 'h1', r: { titre: 'Deux photos' }, f: [A, B] }]);
  S.pousser(TF, [{ c: 'interventions', id: 'i2', m: 1001, e: 'h2', r: { titre: 'Une photo' }, f: [B] }]);
  S.pousser(TF, [{ c: 'clients', id: 'c1', m: 1002, e: 'h3', r: { nom: 'Sans pièce' } }]);
  v('⛔ les trois pièces citées sont connues', [...S.fichiersReferences(TF)].sort(), [A, B]);
  v('   et on sait lesquelles pour une ligne donnée', S.fichiersDeLigne(TF, 'interventions', 'i1'), [A, B]);
  v('   une ligne sans pièce n\'en référence aucune', S.fichiersDeLigne(TF, 'clients', 'c1'), []);

  /* ⛔ LES RÉFÉRENCES SE REMPLACENT EN BLOC, JAMAIS EN AJOUT. Retirer une photo d'une
     intervention doit LUI FAIRE PERDRE cette référence : n'ajouter que les nouvelles
     laisserait l'ancienne à jamais, donc la pièce indélébile, donc le ménage impossible —
     c'est précisément ce qu'on est en train de réparer. */
  S.pousser(TF, [{ c: 'interventions', id: 'i1', m: 2000, e: 'h4', r: { titre: 'Une seule, plus C' }, f: [C] }]);
  v('⛔ la ligne réécrite PERD ses anciennes références', S.fichiersDeLigne(TF, 'interventions', 'i1'), [C]);
  v('   A n\'est plus citée par personne, B l\'est encore par i2', [...S.fichiersReferences(TF)].sort(), [B, C]);

  /* ⛔ ET UNE TOMBE QUI PORTERAIT UN `f` N'EN ENREGISTRE AUCUN. Un appareil peut très bien
     envoyer la liste avec la suppression — c'est même naturel, il sait ce que l'enregistrement
     citait. L'accepter ferait référencer des pièces par une ligne MORTE : elles ne seraient
     plus jamais collectées, alors que la suppression est exactement le moment où elles
     devraient l'être. Le contrôle existe parce que la mutation qui retire `!supprimeLe` ne
     cassait RIEN sans lui : aucun banc ne poussait de tombe avec un `f`. */
  S.pousser(TF, [{ c: 'clients', id: 'c9', m: 5000, sup: 5000, f: [A, B, C] }]);
  v('⛔ une tombe qui porte un `f` n\'enregistre aucune référence', S.fichiersDeLigne(TF, 'clients', 'c9'), []);

  /* Une tombe efface toutes les siennes : un enregistrement supprimé ne retient plus rien. */
  S.pousser(TF, [{ c: 'interventions', id: 'i2', m: 3000, sup: 3000 }]);
  v('⛔ une ligne SUPPRIMÉE ne référence plus rien', [...S.fichiersReferences(TF)].sort(), [C]);

  /* ⚠️ LE SENS DE LA COMPARAISON N'EST PAS INDIFFÉRENT, et c'est écrit dans la fonction : on
     liste ce qui EST référencé, jamais « ce qui est orphelin ». Si elle échoue, l'appelant
     garde des fichiers en trop — un coût de disque ; dans l'autre sens il effacerait des
     photos de terrain. Une fonction qui peut se tromper doit se tromper du côté qui ne
     détruit rien. Sur une entreprise inconnue, elle rend donc un ensemble VIDE. */
  v('⛔ sur une entreprise inconnue, elle rend vide (donc le ménage n\'efface rien)',
    [...S.fichiersReferences('ent-qui-nexiste-pas')], []);

  /* Le plafond : la liste vient du réseau. Ce qui dépasse est ignoré, mais la LIGNE passe —
     on ne refuse pas du travail pour un registre de ménage. */
  const trop = []; for (let i = 0; i < 300; i++) trop.push(String(i).padStart(64, '0'));
  const r = S.pousser(TF, [{ c: 'clients', id: 'c2', m: 4000, e: 'h5', r: { nom: 'Trop de pièces' }, f: trop }]);
  v('⛔ une liste démesurée ne fait PAS refuser la ligne', [r.acceptes, r.refus.length], [1, 0]);
  v('   mais elle est bornée', S.fichiersDeLigne(TF, 'clients', 'c2').length, 200);
  /* Et ce qui n'est pas un sha n'entre pas : la chaîne vient du réseau. */
  S.pousser(TF, [{ c: 'clients', id: 'c3', m: 4001, e: 'h6', r: { nom: 'Sale' }, f: ['../../etc/passwd', 'PAS-UN-SHA', A] }]);
  v('⛔ seul ce qui EST un sha est enregistré', S.fichiersDeLigne(TF, 'clients', 'c3'), [A]);
}

/* ══ ⛔ LE PONT : CE QUE LE SERVEUR SIGNE EST CE QUE L'APPAREIL A POUSSÉ ══════════════
   `tests/test-734.js` prouve que les deux implantations du CALCUL rendent la même valeur sur
   un corpus. Ce contrôle-ci prouve autre chose, et les deux ne se remplacent pas : que les
   lignes RÉELLEMENT ÉCRITES dans la base redonnent la signature de ce qu'on a envoyé.
   Entre les deux il y a un aller-retour complet — sérialisation, chiffrement, colonnes,
   relecture — et c'est là que se perd une empreinte, pas dans l'arithmétique. */
console.log('\n⛔ La signature du serveur et celle de l\'appareil, sur les MÊMES lignes');
{
  const TS = 'ent-signature';
  const SIG = require(path.join(__dirname, '..', 'server', 'op-signature.js'));
  const lignes = [
    { c: 'clients', id: 'c1', m: 1700000000000, e: 'emp-c1', r: { nom: 'Boulangerie' } },
    { c: 'clients', id: 'c2', m: 1700000000001, e: 'emp-c2', r: { nom: 'Mairie' } },
    { c: 'box_stock', id: 'bx1|p1', m: 1700000000002, e: 'emp-p1', r: { ctn: 1, u: 2 } },
    { c: 'interventions', id: 'i-accentué-éàç', m: 1700000000003, e: 'emp-i', r: { titre: 'Café' } },
  ];
  const r = S.pousser(TS, lignes);
  v('les quatre lignes sont acceptées', [r.acceptes, r.refus.length], [4, 0]);

  /* Ce que l'appareil calculerait sur ce qu'il vient d'envoyer. */
  const cote = SIG.opSignature(lignes);
  const serveur = S.signatureCanonique(TS);
  v('⛔ le serveur signe EXACTEMENT ce que l\'appareil a poussé', serveur.sig, cote.sig);
  v('   et le détail par collection concorde', serveur.par, cote.par);

  /* ⛔ ET LA TOMBE COMPTE. Un enregistrement supprimé reste une LIGNE : l'oublier d'un côté
     ferait diverger les deux tous les soirs, sur une entreprise qui ne fait rien de mal. */
  const avecTombe = lignes.concat([{ c: 'clients', id: 'c2', m: 1700000000500, sup: 1700000000500 }]);
  S.pousser(TS, [{ c: 'clients', id: 'c2', m: 1700000000500, sup: 1700000000500 }]);
  const attendu = SIG.opSignature(avecTombe.filter(l => !(l.c === 'clients' && l.id === 'c2' && !l.sup)));
  v('⛔ après une suppression, les deux concordent encore', S.signatureCanonique(TS).sig, attendu.sig);

  /* ⛔ LE CONTRE-TEST : le serveur ne doit PAS signer la même chose quand il n'a pas la même
     chose. Sans lui, une fonction qui rendrait une constante passerait tout ce qui précède. */
  S.pousser(TS, [{ c: 'clients', id: 'c3', m: 1700000000600, e: 'emp-c3', r: { nom: 'De plus' } }]);
  vrai('⛔ une ligne de plus change la signature du serveur', S.signatureCanonique(TS).sig !== attendu.sig);
  /* Et sur une entreprise qui n'a rien, elle rend une signature de rien — pas une erreur : la
     double écriture commence forcément par là, et crier au premier soir serait absurde. */
  v('   une entreprise vide signe le vide, sans jeter', S.signatureCanonique('ent-vide-signature').par, {});
}

/* ══ ⛔ LA MARCHE ARRIÈRE DE L'ÉTAPE 4 : UN DRAPEAU PAR ESPACE, ÉTEINT PAR DÉFAUT ═══════
   Pendant la double écriture, l'appareil écrit Firestore COMME AUJOURD'HUI et pousse EN PLUS
   ses lignes ici. Si quelque chose va mal, couper la seconde écriture doit coûter UNE REQUÊTE.
   Un drapeau côté client demanderait de publier une version et d'attendre que vingt téléphones
   se mettent à jour : ce n'est pas un retour arrière, c'est une panne longue. */
console.log('\n⛔ La double écriture s\'allume espace par espace, et jamais toute seule');
{
  const TD = 'ent-double';
  S.pousser(TD, [{ c: 'clients', id: 'c1', m: 1700000000000, e: 'h', r: { nom: 'X' } }]);
  v('⛔ un espace qui vient de naître n\'est PAS en double écriture', S.entrepriseEtat(TD).double, false);
  /* ⛔ ET UN ESPACE INCONNU NON PLUS. Le défaut inverse ferait pousser les données d'un espace
     que l'annuaire ne connaît pas — c'est-à-dire exactement le cas où on ne doit rien écrire. */
  v('⛔ un espace INCONNU non plus', S.entrepriseEtat('ent-jamais-vu').double, false);

  const on = S.entrepriseDouble(TD, true);
  v('on l\'allume, et la fonction rend l\'ÉTAT OBTENU', [on.connue, on.double], [true, true]);
  v('   l\'état le dit', S.entrepriseEtat(TD).double, true);
  const off = S.entrepriseDouble(TD, false);
  v('⛔ on la coupe, et ça coupe vraiment', [off.connue, off.double], [true, false]);
  v('   l\'état le dit aussi', S.entrepriseEtat(TD).double, false);

  /* ⛔ RÉGLER UN ESPACE QUI N'EXISTE PAS NE DOIT PAS LE FAIRE NAÎTRE. Un `INSERT` ici créerait
     une ligne d'annuaire ET UNE CLÉ pour un `t` mal tapé : un espace fantôme avec sa propre
     DEK. C'est le défaut qu'`entrepriseOuvrir` a déjà payé. */
  /* ⚠️ `try/catch` : un banc qui PLANTE en dit moins qu'un banc qui ÉCHOUE. La mutation qui
     faisait passer un espace inconnu pour connu faisait jeter la fonction, et les vingt
     contrôles suivants ne rendaient plus rien — on voyait une trace de pile au lieu de savoir
     ce qui marchait encore. Même défaut que celui corrigé dans `test-733` le 20 septembre. */
  let inconnu = null;
  try { inconnu = S.entrepriseDouble('ent-faute-de-frappe', true); } catch (e) { inconnu = { jete: e.message }; }
  v('⛔ un `t` inconnu le DIT au lieu de créer une entreprise', inconnu, { connue: false, double: false });
  v('   et il n\'est toujours pas dans l\'annuaire', S.entrepriseEtat('ent-faute-de-frappe').double, false);
  v('   ni sur le disque', fs.existsSync(path.join(DIR, 'socle', 'ent-faute-de-frappe')), false);   // ⚠️ `faux()` n'existe pas dans ce banc — CLAUDE.md le note

  /* La coupure de l'entreprise et la double écriture sont deux choses : fermer un espace ne
     doit pas se confondre avec couper sa seconde écriture, ni l'inverse. */
  S.entrepriseDouble(TD, true);
  S.entrepriseOuvrir(TD, false);
  v('⛔ fermer un espace ne touche pas au drapeau de double écriture', S.entrepriseEtat(TD).double, true);
  vrai('   (mais l\'espace est bien fermé, et c\'est ça qui l\'empêche d\'écrire)', S.entrepriseEtat(TD).etat !== 'actif');
  S.entrepriseOuvrir(TD, true); S.entrepriseDouble(TD, false);

  /* ══ ÉTAPE 5 — LE DRAPEAU DE LECTURE, ET LE SENS DE SON DÉFAUT ═════════════════════════
     ⛔ CES CONTRÔLES EXISTENT PARCE QUE DEUX MUTATIONS N'ONT RIEN CASSÉ DANS `test-735`.
     Inverser le défaut de `lecture` (« socle sauf si firestore ») n'y faisait tomber aucun des
     94 contrôles : ce banc-là passe par HTTP, donc l'espace existe toujours et sa colonne est
     toujours renseignée. Le défaut ne se voit que sur un espace INCONNU ou une colonne vide —
     exactement les cas qu'un banc de câblage ne peut pas fabriquer. C'est ici qu'ils vivent. */
  console.log('\n⛔ Le drapeau de LECTURE — étape 5');
  v('⛔ un espace qui vient de naître LIT Firestore, pas le socle', S.entrepriseEtat(TD).lecture, 'firestore');
  /* ⛔ ET UN ESPACE INCONNU AUSSI. C'est le sens du défaut qui compte : servir le socle à une
     entreprise dont personne n'a décidé la bascule, ce serait lui donner une base peut-être
     incomplète à la place de la sienne. */
  v('⛔ un espace INCONNU aussi', S.entrepriseEtat('ent-jamais-vu-lecture').lecture, 'firestore');
  v('la bascule rend l\'état OBTENU', S.entrepriseLecture(TD, 'socle'), { connue: true, lecture: 'socle' });
  v('   et elle se relit', S.entrepriseEtat(TD).lecture, 'socle');
  /* `source` décide de la source de vérité d'une entreprise : seule la chaîne EXACTE bascule. */
  for (const mauvais of ['SOCLE', 'oui', 1, true, {}, null]) {
    v('⛔ `' + JSON.stringify(mauvais) + '` retombe sur firestore', S.entrepriseLecture(TD, mauvais).lecture, 'firestore');
    S.entrepriseLecture(TD, 'socle');
  }
  v('⛔ elle ne fait naître AUCUNE entreprise', S.entrepriseLecture('ent-jamais-vu-lecture', 'socle'), { connue: false, lecture: 'firestore' });
  v('   et l\'espace inconnu le reste', S.entrepriseEtat('ent-jamais-vu-lecture').lecture, 'firestore');
  /* Les deux drapeaux sont indépendants : couper la double écriture ne rebascule pas la
     lecture, et l'inverse non plus. Les confondre un jour coûterait une bascule non voulue. */
  S.entrepriseDouble(TD, true);
  v('couper la double écriture ne touche pas à la lecture', (S.entrepriseDouble(TD, false), S.entrepriseEtat(TD).lecture), 'socle');
  S.entrepriseLecture(TD, 'firestore');

  /* ══ ÉTAPE 5 — LA CONDITION (d) : SEPT JOURS MUETS NE VALENT PAS SEPT JOURS IDENTIQUES ═══
     ⛔ Deuxième mutation qui n'avait rien cassé : retirer l'exigence de COUVERTURE quotidienne
     (ne garder que « aucun échec ») laissait `test-735` tout vert, parce que son espace porte
     déjà un verdict EN ÉCHEC — la condition tombait de toute façon. Le cas qui discrimine est
     l'autre : aucun échec, et presque aucun contrôle. C'est précisément le piège que ce dépôt
     a déjà payé deux fois : « vide » et « on n'a pas pu savoir » ne sont pas le même état. */
  console.log('\n⛔ La condition (d) de l\'étape 5 — la couverture, pas seulement l\'absence d\'échec');
  {
    const TC = 'ent-controles';
    S.pousser(TC, [{ c: 'clients', id: 'c1', m: Date.now(), r: { id: 'c1' }, e: 'zz' }], { origine: 'appareil' });
    v('sans aucun verdict, la condition est FAUSSE', S.controleSuite(TC, 7).ok, false);
    v('   et les sept jours sont muets', S.controleSuite(TC, 7).joursMuets, 7);

    S.controleNoter(TC, { app_id: 'a1z', ok: true, ecarts: [] });
    const un = S.controleSuite(TC, 7);
    v('⛔ UN SEUL jour contrôlé sur sept ne suffit pas', un.ok, false);
    v('   il reste six jours muets', un.joursMuets, 6);
    v('   et aucun en échec — c\'est bien la COUVERTURE qui manque', un.joursEnEchec, 0);

    /* ⛔ ET LE CONTRE-TEST COMPTE AUTANT : une condition qui ne peut JAMAIS être vraie finit
       par être ignorée, et ce dépôt sait exactement comment ça se termine. On ne peut pas
       reculer l'horloge — `controleNoter` date de maintenant, et lui ajouter une entrée pour
       les besoins d'un banc mettrait un levier de banc dans du code de production. Mais la
       FENÊTRE, elle, est un paramètre : sur un jour, un verdict d'aujourd'hui couvre tout. */
    const unJour = S.controleSuite(TC, 1);
    v('⛔ une fenêtre COUVERTE et sans échec passe la condition', unJour.ok, true);
    v('   aucun jour muet', unJour.joursMuets, 0);

    S.controleNoter(TC, { app_id: 'a1z', ok: false, ecarts: [{ coll: 'clients', appareil: 3, serveur: 2 }] });
    v('⛔ un seul verdict en échec suffit à la faire tomber', S.controleSuite(TC, 1).ok, false);
    v('   et il est compté comme tel', S.controleSuite(TC, 1).joursEnEchec, 1);

    /* ⛔ CE QUI EST GARDÉ NE CONTIENT NI IDENTIFIANT NI CONTENU. Un verdict vient d'un
       appareil : c'est une entrée non fiable, et elle finit dans la base d'un client. */
    const der = S.controlesDe(TC)[0];
    v('le verdict garde le NOM de la collection', der.ecarts[0].coll, 'clients');
    v('   et les deux nombres', [der.ecarts[0].a, der.ecarts[0].s], [3, 2]);
    const sale = S.controleNoter(TC, { app_id: 'x'.repeat(99), ok: false,
      ecarts: [{ coll: 'clients<script>; DROP', appareil: 'beaucoup', serveur: null }] });
    const net = S.controlesDe(TC)[0];
    v('⛔ un nom de collection est nettoyé, jamais repris tel quel', net.ecarts[0].coll, 'clientsscriptDROP');
    v('   et un nombre qui n\'en est pas vaut zéro', [net.ecarts[0].a, net.ecarts[0].s], [0, 0]);
    v('   l\'identifiant d\'appareil est borné', net.app.length <= 32, true);
    vrai('   la liste reste plafonnée', sale <= 60);
  }
}

try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
