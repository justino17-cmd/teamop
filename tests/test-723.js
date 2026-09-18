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
  const c = S.pousser(T, [{ c: 'clients', id: 'c1', m: 1000, r: { nom: 'PIRATE' } }]).refus[0];
  v('à date égale, le serveur garde ce qu\'il a', [c.motif, c.serveur], ['conflit', 1000]);
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
  const ailleurs = fs.readdirSync(path.join(RACINE, 'server'))
    .filter(f => f.endsWith('.js') && f !== 'socle.js')
    .filter(f => /require\(['"]node:sqlite['"]\)/.test(fs.readFileSync(path.join(RACINE, 'server', f), 'utf8')));
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

try { fs.rmSync(DIR, { recursive: true, force: true }); } catch (e) {}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
