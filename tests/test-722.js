/* ══ test-722 — LA SAUVEGARDE HORS SITE SE PROUVE, ELLE NE SE RELIT PAS ══════════════════════
 *
 * `REPRISE.md`, 16 septembre 2026 : la sauvegarde de Google est « JAMAIS RESTAURÉE PAR NOUS ».
 * Ce banc existe pour que la phrase ne puisse pas se réécrire à l'identique avec la nôtre. Il
 * ne lit pas le code : il FABRIQUE une archive depuis de vrais fichiers, la dépose dans un
 * coffre en mémoire, la relit, la déchiffre, la décompresse et la déballe — puis il l'abîme de
 * quatre façons différentes et exige que chacune soit refusée.
 *
 * ⛔ CE QU'IL CHERCHE VRAIMENT, ce sont les pannes SILENCIEUSES, celles qui laissent croire
 * qu'on est sauvegardé :
 *   · un dépôt qui répond 200 mais rend autre chose quand on relit (coffre qui perd des octets) ;
 *   · une archive qui s'ouvre mais qui est vide ;
 *   · une rétention qui efface la dernière copie, ou celle de quelqu'un d'autre ;
 *   · une clé fausse qui « marche » parce que personne ne vérifie l'étiquette d'authentification.
 * Chacune de ces quatre ne fait AUCUN bruit en production. C'est ici, et seulement ici, qu'on
 * peut les voir.
 */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const RACINE = path.join(__dirname, '..');
const S = require(path.join(RACINE, 'server', 'sauvegarde.js'));

let ok = 0, ko = 0;
const v = (nom, obtenu, attendu) => {
  if (JSON.stringify(obtenu) === JSON.stringify(attendu)) ok++;
  else { ko++; console.log('  ✗ ' + nom + '\n      obtenu  : ' + JSON.stringify(obtenu) + '\n      attendu : ' + JSON.stringify(attendu)); }
};
const vrai = (nom, c) => { if (c) ok++; else { ko++; console.log('  ✗ ' + nom); } };

const CLE = 'a'.repeat(64);
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'test-722-'));
const DATA = path.join(banc, 'data');
const CONFIG = path.join(banc, 'config.json');

/* ── 1. La clé : ce qui est accepté, et surtout ce qui ne l'est pas ────────────────────── */
console.log('\n── 722 · la clé de chiffrement ──');
vrai('64 caractères hexadécimaux : acceptée', !!S.cleDepuis(CLE));
v('… et elle fait bien 32 octets', S.cleDepuis(CLE).length, 32);
v('vide : refusée', S.cleDepuis(''), null);
v('absente : refusée', S.cleDepuis(undefined), null);
/* ⛔ Un mot de passe « qu'on retiendra » est exactement ce qu'il ne faut pas : une sauvegarde
   chiffrée avec un secret devinable est une sauvegarde en clair qui se croit protégée. */
v('mot de passe humain : refusé', S.cleDepuis('motdepasse-de-sauvegarde-2026'), null);
v('63 caractères : refusée', S.cleDepuis('a'.repeat(63)), null);
v('65 caractères : refusée', S.cleDepuis('a'.repeat(65)), null);
v('64 caractères non hexadécimaux : refusée', S.cleDepuis('z'.repeat(64)), null);
vrai('majuscules acceptées (une clé se recopie à la main un jour de panne)', !!S.cleDepuis('A'.repeat(64)));
vrai('espaces de bord tolérés (copier-coller depuis un gestionnaire de mots de passe)', !!S.cleDepuis('  ' + CLE + '\n'));

/* ── 2. Le nom d'archive : il doit se TRIER dans l'ordre du temps ──────────────────────── */
console.log('\n── 722 · le nom porte l\'ordre chronologique ──');
const n1 = S.nomArchive(new Date('2026-09-17T03:00:00.000Z'));
const n2 = S.nomArchive(new Date('2026-09-18T03:00:00.000Z'));
const n3 = S.nomArchive(new Date('2026-10-01T03:00:00.000Z'));
v('pas de deux-points (interdits sur certains systèmes)', /:/.test(n1), false);
vrai('le tri alphabétique EST le tri chronologique', n1 < n2 && n2 < n3);
/* C'est ce sur quoi la rétention s'appuie : si ça cassait, elle effacerait les mauvaises. */
vrai('… y compris au passage de mois', S.nomArchive(new Date('2026-09-30T23:00:00Z')) < S.nomArchive(new Date('2026-10-01T01:00:00Z')));

/* ── 3. La rétention — le SEUL endroit qui efface ──────────────────────────────────────── */
console.log('\n── 722 · la rétention n\'efface que ce qu\'il faut ──');
const obj = (...noms) => noms.map(c => ({ cle: c, octets: 10, modifie: '' }));
const A = 'teamop/2026-09-10T03-00-00Z.tar.gz.chiffre';
const B = 'teamop/2026-09-11T03-00-00Z.tar.gz.chiffre';
const C = 'teamop/2026-09-12T03-00-00Z.tar.gz.chiffre';
const D = 'teamop/2026-09-13T03-00-00Z.tar.gz.chiffre';
v('coffre vide : rien à effacer', S.aElaguer([], 30, 'teamop/'), []);
v('null : rien à effacer (et pas d\'exception)', S.aElaguer(null, 30, 'teamop/'), []);
v('une seule copie, on en garde 30 : on n\'y touche pas', S.aElaguer(obj(A), 30, 'teamop/'), []);
v('quatre copies, on en garde 2 : les DEUX PLUS ANCIENNES partent', S.aElaguer(obj(A, B, C, D), 2, 'teamop/'), [B, A]);
v('… quel que soit l\'ordre d\'arrivée de la liste', S.aElaguer(obj(C, A, D, B), 2, 'teamop/'), [B, A]);
v('on garde exactement ce qu\'on a demandé', S.aElaguer(obj(A, B, C, D), 4, 'teamop/'), []);
/* ⛔ LES CAS QUI FONT PEUR — ET LA RÈGLE QUE CE BANC A CORRIGÉE. Au premier jet, ce test
   exigeait que `garder:0` ne laisse qu'UNE copie. C'était le mauvais réflexe : un zéro dans
   `config.json` est une faute de frappe, pas une instruction, et l'honorer coûterait tout
   l'historique d'un coup. La règle juste est l'inverse — un réglage absurde retombe sur le
   défaut, on efface MOINS quand on ne comprend pas. Le code était bon, le test avait tort. */
v('garder:0 (faute de frappe) → on retombe sur le défaut, rien n\'est effacé', S.aElaguer(obj(A, B, C), 0, 'teamop/'), []);
v('garder:-5 → idem', S.aElaguer(obj(A, B, C), -5, 'teamop/'), []);
v('garder:"trois" → idem, on n\'efface pas sur une valeur qu\'on ne comprend pas', S.aElaguer(obj(A, B, C), 'trois', 'teamop/'), []);
v('… et au-delà du défaut de 30, l\'élagage reprend', S.aElaguer(Array.from({ length: 33 }, (_, i) => ({ cle: 'teamop/2026-09-' + String(i + 1).padStart(2, '0') + 'T03-00-00Z.tar.gz.chiffre', octets: 1 })), 0, 'teamop/').length, 3);
vrai('⛔ … et jamais la plus récente', !S.aElaguer(obj(A, B, C, D), 1, 'teamop/').includes(D));
/* ⛔ Et on ne touche à rien qui ne vienne pas de nous : le coffre peut contenir autre chose. */
v('un objet étranger au format n\'est jamais effacé',
  S.aElaguer(obj(A, B, C, 'teamop/notes-de-justin.txt', 'autre-chose.zip'), 1, 'teamop/'), [B, A]);
v('… même quand il n\'y a QUE des objets étrangers', S.aElaguer(obj('un.txt', 'deux.zip'), 1, 'teamop/'), []);
/* ⛔⛔ ET LA RÈGLE AJOUTÉE LE 20 SEPTEMBRE 2026, QUI VIENT D'UN VRAI DÉFAUT. Cette fonction ne
   filtrait QUE sur le suffixe. `lister('teamop/')` rend aussi le contenu des SOUS-DOSSIERS —
   donc la copie mensuelle, rangée sous `teamop/mensuel/`, serait tombée sous la rétention du
   JOUR. Et le détail qui rend la chose vicieuse : le tri est alphabétique, et `teamop/mensuel/`
   passe APRÈS `teamop/2026-…` — les mensuelles auraient donc squatté les premières places du
   « plus récent d'abord », poussant dehors de vraies sauvegardes du jour AVANT de se faire
   effacer à leur tour. Un dossier de conservation longue qui mange l'historique court. */
const M1 = 'teamop/mensuel/2026-08-01T03-00-00Z.tar.gz.chiffre';
const M2 = 'teamop/mensuel/2026-09-01T03-00-00Z.tar.gz.chiffre';
v('⛔ la rétention du JOUR ne voit pas le dossier mensuel',
  S.aElaguer(obj(A, B, C, D, M1, M2), 2, 'teamop/'), [B, A]);
v('⛔ … et celle du MOIS ne voit pas les archives du jour',
  S.aElaguer(obj(A, B, C, D, M1, M2), 1, 'teamop/mensuel/'), [M1]);
/* ⚠️ La contre-épreuve du tri : sans l'ancrage, `M2` serait classée « la plus récente » de tout
   le coffre alors qu'elle date d'un mois. C'est bien `D` qui doit survivre. */
vrai('⛔ … donc la plus récente du jour survit, pas la mensuelle',
  !S.aElaguer(obj(A, B, C, D, M1, M2), 1, 'teamop/').includes(D));
v('⛔ sans préfixe, on n\'efface RIEN — dans le doute, on efface moins',
  S.aElaguer(obj(A, B, C, D), 1), []);
v('   ni avec un préfixe vide', S.aElaguer(obj(A, B, C, D), 1, ''), []);
v('   ni avec un préfixe qui ne désigne rien', S.aElaguer(obj(A, B, C, D), 1, 'ailleurs/'), []);

/* ── 3 bis. LA MINUTERIE : UNE SAUVEGARDE PAR NUIT, À L'HEURE DITE ─────────────────────────
   ⛔ Relevé dans le vrai coffre le 24 septembre 2026 : 14:30, 10:31, 06:41, 03:01, 23:11, 19:21,
   15:31, 11:41 — une archive toutes les 20 h 10, qui reculait de quatre heures par jour. La règle
   (« l'heure est passée ET la dernière a plus de vingt heures ») ne s'ancrait à 3 h que par
   hasard. On fait donc TOURNER la minuterie sur des jours simulés, un réveil toutes les dix
   minutes comme en production, et on regarde QUAND elle lance. */
console.log('\n── 722 · la minuterie : une par nuit, à l\'heure dite ──');
{
  const H = 3600000, M10 = 600000;
  const t = (jour, h, m) => Date.UTC(2026, 8, 20 + jour, h, m || 0);
  const hm = ts => new Date(ts).toISOString().slice(11, 16);
  /* Un réveil toutes les dix minutes de `debut` à `fin` ; `regle` décide, comme `tic`. */
  const simuler = (regle, histo0, debut, fin, o) => {
    o = o || {};
    const histo = histo0.slice(), lancees = [];
    for (let ts = debut; ts <= fin; ts += M10) {
      if (o.panne && o.panne(ts)) continue;
      if (!regle(ts, histo, o.heure == null ? 3 : o.heure)) continue;
      const reussie = !(o.echoue && o.echoue(ts));
      histo.unshift({ ts, ok: reussie });
      lancees.push({ ts, ok: reussie });
    }
    return lancees;
  };
  /* L'ancienne règle, recopiée pour la contre-épreuve : si le simulateur ne la voyait pas
     dériver, il ne prouverait rien de la nouvelle. */
  const ancienne = (ts, histo, heure) => {
    if (new Date(ts).getUTCHours() < heure) return false;
    const d = histo[0];
    if (d && d.ok && ts - d.ts < 20 * H) return false;
    if (d && !d.ok && ts - d.ts < H) return false;
    return true;
  };
  const debut = [{ ts: t(0, 14, 30), ok: true }];   // la sauvegarde du 20 à 14:30, comme au coffre
  const avant = simuler(ancienne, debut, t(0, 14, 40), t(5, 14, 30));
  vrai('contre-épreuve : l\'ancienne règle DÉRIVE dans le simulateur (' + avant.map(x => hm(x.ts)).join(', ') + ')',
    avant.some(x => new Date(x.ts).getUTCHours() !== 3));

  const apres = simuler(S.sauvegardeDue, debut, t(0, 14, 40), t(5, 14, 30));
  v('⛔ cinq jours : cinq sauvegardes, une par nuit', apres.length, 5);
  v('⛔ … toutes à 03:00, pas une seconde de plus qu\'un réveil', apres.map(x => hm(x.ts)), ['03:00', '03:00', '03:00', '03:00', '03:00']);
  v('   … et chacune un jour différent', new Set(apres.map(x => new Date(x.ts).getUTCDate())).size, 5);

  /* Une sauvegarde à la main dans la journée (« Lancer » dans la Tour) ne décale plus rien. */
  const main = simuler(S.sauvegardeDue, [{ ts: t(1, 11, 41), ok: true }, { ts: t(1, 3, 0), ok: true }], t(1, 11, 50), t(3, 12, 0));
  v('⛔ une sauvegarde lancée à 11:41 ne décale pas la nuit suivante', main.map(x => hm(x.ts)), ['03:00', '03:00']);

  /* Serveur arrêté pendant l'échéance : rattrapage au premier réveil, puis retour à 3 h. */
  const coupe = simuler(S.sauvegardeDue, [{ ts: t(0, 3, 0), ok: true }], t(0, 3, 10), t(2, 12, 0),
    { panne: ts => ts >= t(1, 2, 0) && ts < t(1, 9, 0) });
  v('⛔ une nuit manquée se rattrape au premier réveil, puis on revient à 3 h', coupe.map(x => hm(x.ts)), ['09:00', '03:00']);

  /* Un échec se retente au bout d'une heure — pas toutes les dix minutes. */
  const rate = simuler(S.sauvegardeDue, [{ ts: t(0, 3, 0), ok: true }], t(0, 3, 10), t(1, 12, 0),
    { echoue: ts => ts < t(1, 4, 0) });
  v('⛔ un échec à 03:00 se retente à 04:00, et une fois réussie on s\'arrête',
    rate.map(x => hm(x.ts) + (x.ok ? ' ok' : ' échec')), ['03:00 échec', '04:00 ok']);
  v('   … et la nuit suivante repart à 3 h', simuler(S.sauvegardeDue, [{ ts: t(1, 4, 0), ok: true }, { ts: t(1, 3, 0), ok: false }], t(1, 4, 10), t(2, 12, 0)).map(x => hm(x.ts)), ['03:00']);

  vrai('jamais sauvegardé : on lance tout de suite, quelle que soit l\'heure', S.sauvegardeDue(t(0, 1, 0), [], 3));
  v('l\'heure dite se règle — 23 h', simuler(S.sauvegardeDue, [{ ts: t(0, 23, 0), ok: true }], t(0, 23, 10), t(2, 23, 30), { heure: 23 }).map(x => hm(x.ts)), ['23:00', '23:00']);
  v('l\'heure dite se règle — minuit', simuler(S.sauvegardeDue, [{ ts: t(0, 0, 0), ok: true }], t(0, 0, 10), t(2, 0, 30), { heure: 0 }).map(x => hm(x.ts)), ['00:00', '00:00']);

  /* ⛔ ET LA MINUTERIE S'EN SERT VRAIMENT. Lu dans le CODE (commentaires retirés), dans le corps
     de `tic` : une fonction juste et jamais appelée est la panne type de ce dépôt. */
  const SRC = fs.readFileSync(path.join(RACINE, 'server', 'sauvegarde.js'), 'utf8')
    .replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const i0 = SRC.indexOf('const tic = () => {'), i1 = SRC.indexOf('minuterie = setInterval(tic', i0);
  vrai('le corps de la minuterie est trouvé', i0 > 0 && i1 > i0);
  const TIC = i0 > 0 && i1 > i0 ? SRC.slice(i0, i1) : '';
  vrai('⛔ la minuterie décide par sauvegardeDue(maintenant, histo, HEURE)', /sauvegardeDue\(Date\.now\(\), histo, HEURE\)/.test(TIC));
  vrai('   et elle ne porte plus la règle des vingt heures', !/20 \* 3600000/.test(TIC));
  vrai('   … et se réveille toutes les dix minutes, comme le simulateur le suppose', /setInterval\(tic, 600000\)/.test(SRC));
}

/* ── 4. LA CHAÎNE COMPLÈTE, sur de vrais fichiers ──────────────────────────────────────── */
(async () => {
  console.log('\n── 722 · fabriquer, relire, déballer (vrais fichiers, vrai tar) ──');
  fs.mkdirSync(path.join(DATA, 'pieces', 'ent-a'), { recursive: true });
  fs.writeFileSync(path.join(DATA, 'espaces.json'), JSON.stringify({ a: { slug: 'a', t: 'ent-a' } }));
  fs.writeFileSync(path.join(DATA, 'comptes.json'), JSON.stringify({ n: 1 }));
  fs.writeFileSync(path.join(DATA, 'bugs.jsonl'), '{"m":"un"}\n{"m":"deux"}\n');
  fs.writeFileSync(path.join(DATA, 'pieces', 'ent-a', 'photo1.bin'), crypto.randomBytes(4096));
  fs.writeFileSync(CONFIG, JSON.stringify({ vapidPublicKey: 'PUB', vapidPrivateKey: 'PRIV', sauvegarde: { cle: CLE } }));

  const cle = S.cleDepuis(CLE);
  const archive = path.join(banc, 'archive.bin');
  const faite = await S.fabriquer(archive, cle, [DATA, CONFIG]);
  vrai('l\'archive a été écrite et pèse quelque chose', faite.octets > 100);
  v('… et son poids annoncé EST celui du fichier', fs.statSync(archive).size, faite.octets);
  v('… son empreinte fait 64 caractères', faite.empreinte.length, 64);
  /* ⛔ L'archive part chez un hébergeur tiers et contient config.json : si les secrets s'y
     lisaient en clair, tout ce module serait une fuite organisée. On cherche donc les valeurs
     elles-mêmes dans les octets du fichier. */
  const brut = fs.readFileSync(archive);
  v('⛔ la clé VAPID privée n\'apparaît NULLE PART en clair', brut.includes(Buffer.from('PRIV')), false);
  v('⛔ le contenu d\'un fichier de données non plus', brut.includes(Buffer.from('espaces.json')), false);
  vrai('… mais l\'en-tête de format, lui, est lisible (on doit pouvoir identifier le fichier)', brut.subarray(0, S.ENTETE.length).equals(S.ENTETE));

  const relu = await S.relire(archive, cle, null);
  vrai('relecture : l\'archive s\'ouvre et contient des entrées', relu.entrees >= 6);

  const sortie = path.join(banc, 'sortie'); fs.mkdirSync(sortie);
  await S.relire(archive, cle, sortie);
  vrai('déballée : data/ est là', fs.existsSync(path.join(sortie, 'data', 'espaces.json')));
  vrai('déballée : config.json est là', fs.existsSync(path.join(sortie, 'config.json')));
  vrai('déballée : les pièces jointes aussi', fs.existsSync(path.join(sortie, 'data', 'pieces', 'ent-a', 'photo1.bin')));
  v('⛔ le contenu est IDENTIQUE à l\'original (c\'est tout ce qui compte)',
    fs.readFileSync(path.join(sortie, 'data', 'pieces', 'ent-a', 'photo1.bin')).equals(fs.readFileSync(path.join(DATA, 'pieces', 'ent-a', 'photo1.bin'))), true);
  v('… y compris le journal ligne à ligne', fs.readFileSync(path.join(sortie, 'data', 'bugs.jsonl'), 'utf8'), '{"m":"un"}\n{"m":"deux"}\n');

  /* ── 4 bis. ⛔ L'ARCHIVE NE S'AVALE PAS ELLE-MÊME, ET NE RÉAVALE PAS SES RESTES ──────────
     Mesuré par `gardien` sur la première version : un temporaire de 5 Mo resté dans le dossier
     source faisait passer une archive de 200 Ko à 5,2 Mo — et chaque nuit ré-archivait le reste
     de la veille, en cumulant. Le temporaire vit désormais À CÔTÉ de `DATA_DIR`, et l'ancien nom
     est exclu pour qu'un reste d'une version antérieure ne voyage pas à vie. */
  console.log('\n── 722 · un reste de sauvegarde n\'entre pas dans l\'archive ──');
  {
    fs.writeFileSync(path.join(DATA, '.sauvegarde-999.tmp'), crypto.randomBytes(400000));
    const avec = path.join(banc, 'avec-reste.bin');
    const sans = await S.fabriquer(avec, cle, [DATA], ['.sauvegarde-*.tmp', '.sauvegarde-*.tmp.relu']);
    const brut2 = path.join(banc, 'sans-exclusion.bin');
    const tout = await S.fabriquer(brut2, cle, [DATA]);
    vrai('⛔ sans exclusion, le reste de 400 Ko gonfle bien l\'archive (le défaut existe)', tout.octets > sans.octets + 300000);
    vrai('⛔ avec exclusion, l\'archive retrouve sa taille utile', sans.octets < 100000);
    const ou = path.join(banc, 'sortie-exclue'); fs.mkdirSync(ou);
    await S.relire(avec, cle, ou);
    v('⛔ … et le reste n\'est PAS dans ce qu\'on déballe', fs.existsSync(path.join(ou, 'data', '.sauvegarde-999.tmp')), false);
    vrai('… alors que les vraies données y sont', fs.existsSync(path.join(ou, 'data', 'espaces.json')));
    fs.unlinkSync(path.join(DATA, '.sauvegarde-999.tmp'));
  }

  /* ── 5. LES QUATRE FAÇONS DE L'ABÎMER, et le refus attendu à chaque fois ─────────────── */
  console.log('\n── 722 · une archive abîmée doit être REFUSÉE, jamais acceptée à moitié ──');
  const echoue = async (nom, fn) => { try { await fn(); ko++; console.log('  ✗ ' + nom + ' — ACCEPTÉE alors qu\'elle aurait dû être refusée'); } catch (e) { ok++; } };

  await echoue('clé fausse : refusée', () => S.relire(archive, S.cleDepuis('b'.repeat(64)), null));

  const abime = path.join(banc, 'abimee.bin');
  const cpy = Buffer.from(brut); cpy[Math.floor(cpy.length / 2)] ^= 0xFF;   // un seul octet retourné, au milieu
  fs.writeFileSync(abime, cpy);
  /* ⛔ C'est LE cas qui justifie GCM plutôt qu'un simple chiffrement : un octet corrompu par le
     réseau ou le disque doit faire ÉCHOUER la relecture, pas produire une archive « presque
     bonne » qu'on croirait restaurable. */
  await echoue('un seul octet retourné : refusée', () => S.relire(abime, cle, null));

  const tronq = path.join(banc, 'tronquee.bin');
  fs.writeFileSync(tronq, brut.subarray(0, brut.length - 200));
  await echoue('archive tronquée (transfert coupé) : refusée', () => S.relire(tronq, cle, null));

  const faux = path.join(banc, 'pasunearchive.bin');
  fs.writeFileSync(faux, Buffer.concat([Buffer.from('CECI N\'EST PAS UNE ARCHIVE TEAMOP'), crypto.randomBytes(500)]));
  await echoue('fichier étranger : refusé sur l\'en-tête', () => S.relire(faux, cle, null));

  const vide = path.join(banc, 'vide.bin'); fs.writeFileSync(vide, Buffer.alloc(0));
  await echoue('fichier vide : refusé', () => S.relire(vide, cle, null));
  await echoue('fichier inexistant : refusé sans exception non gérée', () => S.relire(path.join(banc, 'jamais.bin'), cle, null));

  /* ⛔ ET LE CAS QUI TUAIT LE SERVEUR. `fs.createWriteStream` n'avait AUCUN écouteur d'erreur :
     un disque plein, un droit manquant, une erreur d'entrée-sortie, et Node 22 transforme
     l'événement sans écouteur en ARRÊT DU PROCESSUS — reproduit, code de sortie 9. L'API
     tombait donc pour tous les clients au milieu de la nuit, et repartait en boucle toutes les
     dix minutes puisque l'échec n'était même pas enregistré. Relevé par `gardien`, confirmé par
     la mesure. Ici on exige un REJET, c'est-à-dire quelque chose qu'un appelant peut attraper. */
  await echoue('⛔ écriture impossible : REJET propre, jamais un arrêt du processus',
    () => S.fabriquer('/nexistepas/impossible/archive.bin', cle, [DATA]));

  /* ── 6. LE MODULE ENTIER, avec un coffre en mémoire qui sait aussi tomber en panne ───── */
  console.log('\n── 722 · le cycle complet : déposer, relire, élaguer ──');
  const coffreNeuf = () => {
    const objets = new Map();
    const c = {
      pannes: {},
      /* ⛔ `poserCle`/`lireCle`/`effacerCle`, PAS `poser`/`lire`/`effacer` — et ce n'est pas un
         détail de nommage. Les seconds sont faits pour les pièces jointes : deux segments
         (entreprise, identifiant) encodés CHACUN EN ENTIER. La sauvegarde range sous
         `teamop/<date>`, donc sa clé contient une barre oblique : passée à `lire('', cle)`
         elle devenait `%2F`, donc une clé DIFFÉRENTE de celle déposée. Mesuré le 17 septembre
         en faisant tourner la chaîne pour de vrai : le dépôt réussissait, la liste montrait
         l'archive, et le téléchargement répondait « objet absent ». Une sauvegarde quotidienne
         IMPOSSIBLE À RESTAURER — la panne même que ce chantier existe pour empêcher. Ce coffre
         n'expose donc QUE les verbes « clé complète » : si quelqu'un revenait aux autres, tout
         ce bloc rougirait au lieu de laisser passer. */
      /* Les verbes EN FLUX : ce sont ceux que `lancer()` emploie depuis que l'archive ne tient
         plus en mémoire. Le coffre du banc n'expose qu'eux — revenir à une lecture en bloc
         ferait rougir tout ce qui suit au lieu de passer inaperçu. */
      async poserCleFlux(k, chemin, octets, empreinte) {
        if (c.pannes.poser) return { ok: false, statut: c.pannes.poser };
        objets.set(k, fs.readFileSync(chemin)); return { ok: true, octets };
      },
      async lireCleVers(k, sortie) {
        if (c.pannes.lire) return { ok: false, statut: c.pannes.lire };
        /* Abîmer la copie MENSUELLE seule : la nuit doit rester un succès pendant que la copie
           longue durée, elle, est recalée. Deux sorts différents pour le même octet source. */
        if (c.pannes.mensuelAbime && String(k).indexOf('mensuel/') >= 0) return { ok: true, octets: 1, empreinte: 'ff' };
        if (!objets.has(k)) return { ok: false, absente: true };
        let b = objets.get(k);
        if (c.pannes.lireAbime) { b = Buffer.from(b); b[10] ^= 0xFF; }
        if (c.pannes.lireCourt) b = b.subarray(0, 50);
        fs.writeFileSync(sortie, b);
        return { ok: true, octets: b.length, empreinte: crypto.createHash('sha256').update(b).digest('hex') };
      },
      async poserCle(k, corps) { if (c.pannes.poser) return { ok: false, statut: c.pannes.poser }; objets.set(k, Buffer.from(corps)); return { ok: true, octets: corps.length }; },
      async effacerCle(k) { objets.delete(k); return { ok: true }; },
      async lister() { return { ok: true, objets: [...objets.keys()].map(k => ({ cle: k, octets: objets.get(k).length, modifie: '' })) }; },
      _n: () => objets.size, _cles: () => [...objets.keys()],
    };
    return c;
  };

  const monter = (client, extra) => S.monterSauvegarde(null, {
    config: { sauvegarde: Object.assign({ cle: CLE, endpoint: 'x', bucket: 'b', accessKey: 'a', secretKey: 's', garder: 3 }, extra || {}) },
    DATA_DIR: DATA, CONFIG_PATH: CONFIG, client,
  });

  let coffre = coffreNeuf();
  let mod = monter(coffre);
  vrai('le module est actif quand la configuration est complète', mod.actif);
  let r = await mod.lancer('banc');
  v('une sauvegarde complète réussit', r.ok, true);
  /* ⛔ DEUX OBJETS, PAS UN : l'archive du jour ET la copie du mois. La copie mensuelle est le
     MÊME fichier déposé sous une seconde clé — ni second `tar`, ni second chiffrement, ni second
     passage sur les bases. Le coût d'une nuit de mensuel est un envoi de plus, pas une
     sauvegarde de plus. */
  v('… et le coffre en porte DEUX : celle du jour et celle du mois', coffre._n(), 2);
  vrai('⛔ la copie du mois est rangée à part', coffre._cles().some(c => c.indexOf('teamop/mensuel/') === 0));
  vrai('   et celle du jour reste à la racine', coffre._cles().some(c => c.indexOf('teamop/') === 0 && c.indexOf('mensuel/') < 0));
  vrai('   la nuit le dit', !!(r.mensuel && r.mensuel.fait === true));
  vrai('… l\'archive relue contenait des entrées', r.entrees >= 6);
  v('⛔ … et /health la dit fraîche', mod.sante().ok, true);
  v('⛔ … sans jamais donner son POIDS (c\'est le volume de données de tous les clients)', 'octets' in mod.sante(), false);
  /* ⛔ NI LE MOTIF D'ÉCHEC : « la dernière a raté, motif depot-403 » dit à qui interroge cette
     route publique si la plateforme saurait se relever. Il est servi à la Tour, sous le patron. */
  v('⛔ … ni le motif de l\'échec', 'motif' in mod.sante(), false);
  v('… ni le nom du coffre', JSON.stringify(mod.sante()).includes('bucket'), false);

  /* ⛔ UNE FOIS PAR MOIS, PAS UNE PAR NUIT — sinon le dossier de conservation longue devient
     une seconde sauvegarde quotidienne, et la facture double pour rien. La deuxième nuit du
     même mois dépose bien son archive du jour, et rien de plus. */
  const clesApres1 = coffre._n();
  const r2 = await mod.lancer('banc');
  v('la deuxième nuit réussit aussi', r2.ok, true);
  v('⛔ mais elle ne redépose PAS de mensuelle ce mois-ci', (r2.mensuel || {}).fait, false);
  v('   et elle le dit', (r2.mensuel || {}).motif, 'deja');
  v('   toujours une seule copie mensuelle', coffre._cles().filter(c => c.indexOf('teamop/mensuel/') === 0).length, 1);
  /* ⚠️ On ne compte PAS les objets du coffre ici : les deux lancements tombent dans la même
     seconde, donc `nomArchive()` rend le même nom et l'archive du jour s'écrase elle-même.
     C'est sans importance en production (une par nuit) et ça ferait un contrôle qui mesure
     l'horloge du banc plutôt que la règle. Ce qui compte est au-dessus : UNE mensuelle. */
  void clesApres1;

  /* ⛔⛔ ET UNE COPIE MENSUELLE QU'ON NE SAIT PAS ROUVRIR NE RESTE PAS DANS LE COFFRE. C'est la
     copie qu'on emporte sur une autre machine et qu'on garde deux ans : la laisser là occuper
     une place de rétention pendant qu'elle est illisible, c'est fabriquer la mauvaise surprise
     du jour où le VPS n'est plus là. On l'efface, `etat.mensuel` reste sans `ok`, et la nuit
     suivante réessaie pour ce mois-là — ce que le contrôle suivant prouve.
     ⚠️ Et la sauvegarde du JOUR, elle, reste bonne : la jeter parce qu'une SECONDE copie n'est
     pas partie serait absurde. */
  /* ⛔⛔ ET ON REPART D'UN ÉTAT VIERGE — CE QUE LE BANC A APPRIS EN TOMBANT. `etat.mensuel` vit
     dans `DATA_DIR/sauvegardes-hors-site.json`, donc il SURVIT au changement de coffre : le
     module suivant relisait « septembre : déjà fait » et sautait le dépôt, si bien que la
     section ci-dessous mesurait un `deja` en croyant mesurer une relecture ratée. La
     persistance est le bon comportement (en production il n'y a qu'un coffre, et un redémarrage
     ne doit pas redéposer) ; c'est le banc qui doit dire « installation neuve » explicitement. */
  try { fs.unlinkSync(path.join(DATA, 'sauvegardes-hors-site.json')); } catch (e) {}
  coffre = coffreNeuf(); coffre.pannes.mensuelAbime = true; mod = monter(coffre);
  r = await mod.lancer('banc');
  v('⛔ mensuelle illisible : la nuit reste un SUCCÈS', r.ok, true);
  vrai('   mais la mensuelle est marquée ratée', (r.mensuel || {}).fait === false && /relecture/.test(String((r.mensuel || {}).motif)));
  v('⛔ et elle a été RETIRÉE du coffre', coffre._cles().filter(c => c.indexOf('teamop/mensuel/') === 0).length, 0);
  v('   /health ne prétend donc pas qu\'une mensuelle existe', mod.sante().mensuelJ, null);
  coffre.pannes.mensuelAbime = false;
  r = await mod.lancer('banc');
  v('⛔ la nuit suivante la RETENTE pour le même mois', (r.mensuel || {}).fait, true);
  v('   /health la voit maintenant', mod.sante().mensuelJ, 0);


  /* ⛔ LA PANNE LA PLUS TRAÎTRE : le dépôt répond OK, mais ce qu'on relit n'est pas ce qu'on a
     envoyé. Sans relecture, elle passerait pour un succès — et on découvrirait le jour de la
     restauration que trente sauvegardes d'affilée sont illisibles. */
  coffre = coffreNeuf(); coffre.pannes.lireAbime = true; mod = monter(coffre);
  r = await mod.lancer('banc');
  v('coffre qui rend un octet différent : ÉCHEC', r.ok, false);
  v('… et le motif le nomme', r.motif, 'empreinte-differente');
  v('⛔ … donc /health n\'annonce PAS une sauvegarde saine', mod.sante().ok, false);

  coffre = coffreNeuf(); coffre.pannes.lireCourt = true; mod = monter(coffre);
  r = await mod.lancer('banc');
  v('coffre qui rend une archive plus courte : ÉCHEC', r.ok, false);
  v('… motif', r.motif, 'taille-differente');

  coffre = coffreNeuf(); coffre.pannes.poser = 503; mod = monter(coffre);
  r = await mod.lancer('banc');
  v('coffre en panne au dépôt : ÉCHEC', r.ok, false);
  v('… motif', r.motif, 'depot-503');

  coffre = coffreNeuf(); coffre.pannes.lire = 403; mod = monter(coffre);
  r = await mod.lancer('banc');
  v('dépôt accepté mais relecture refusée (droits en écriture seule) : ÉCHEC', r.ok, false);
  v('… motif', r.motif, 'relecture-403');

  /* ⛔ ET SURTOUT : UNE SAUVEGARDE RATÉE N'EFFACE RIEN. C'est la règle qui protège contre le
     pire scénario — un coffre qui tombe en panne et emporte l'historique avec lui. */
  coffre = coffreNeuf(); mod = monter(coffre, { garder: 1 });
  v('une première sauvegarde réussit', (await mod.lancer('banc')).ok, true);
  const gardee = coffre._cles()[0];
  coffre.pannes.poser = 500;
  v('la suivante échoue', (await mod.lancer('banc')).ok, false);
  v('⛔ … et l\'ancienne est TOUJOURS LÀ', coffre._cles(), [gardee]);

  /* La rétention en vrai : quatre sauvegardes, on en garde deux. Les noms portant la seconde,
     on force des instants différents en déposant à la main entre deux. */
  coffre = coffreNeuf(); mod = monter(coffre, { garder: 2 });
  for (const j of ['2026-09-01', '2026-09-02', '2026-09-03']) coffre.poserCle('teamop/' + j + 'T03-00-00Z.tar.gz.chiffre', Buffer.from('vieille'));
  v('trois vieilles copies déposées à la main', coffre._n(), 3);
  r = await mod.lancer('banc');
  v('la nouvelle sauvegarde réussit', r.ok, true);
  v('⛔ le coffre est ramené à 2 copies', coffre._n(), 2);
  vrai('⛔ … et celle qu\'on vient d\'écrire en fait partie', coffre._cles().includes(r.cle));
  vrai('⛔ … c\'est bien la PLUS ANCIENNE qui est partie', !coffre._cles().some(k => k.includes('2026-09-01')));

  /* ── 7. INERTE PAR DÉFAUT — un serveur sans configuration ne parle à personne ────────── */
  console.log('\n── 722 · sans configuration, rien ne s\'allume ──');
  let inerte = S.monterSauvegarde(null, { config: {}, DATA_DIR: DATA, CONFIG_PATH: CONFIG });
  v('pas de bloc sauvegarde : module inactif', inerte.actif, false);
  v('… /health le dit', inerte.sante().active, false);
  v('… et lancer() refuse poliment', (await inerte.lancer('banc')).motif, 'inactive');
  v('… aucune minuterie n\'a été posée', inerte._minuterie(), null);
  inerte = S.monterSauvegarde(null, { config: { sauvegarde: { cle: 'trop-court', endpoint: 'x', bucket: 'b', accessKey: 'a', secretKey: 's' } }, DATA_DIR: DATA, CONFIG_PATH: CONFIG });
  v('⛔ clé mal formée : INACTIF plutôt que de chiffrer avec n\'importe quoi', inerte.actif, false);
  inerte = S.monterSauvegarde(null, { config: { sauvegarde: { cle: CLE } }, DATA_DIR: DATA, CONFIG_PATH: CONFIG });
  v('⛔ clé bonne mais coffre absent : inactif aussi', inerte.actif, false);

  /* ── 8. Le fichier d'état survit à un redémarrage ────────────────────────────────────── */
  console.log('\n── 722 · l\'état se relit après un redémarrage ──');
  coffre = coffreNeuf(); mod = monter(coffre);
  await mod.lancer('banc');
  const apres = monter(coffreNeuf());
  vrai('⛔ un serveur qui redémarre sait quand remonte la dernière sauvegarde',
    apres.etat().derniere && apres.etat().derniere.ok === true);
  vrai('… et ne la rejoue donc pas à chaque déploiement', apres.sante().ageH === 0);
  const surLeDisque = JSON.parse(fs.readFileSync(path.join(DATA, 'sauvegardes-hors-site.json'), 'utf8'));
  vrai('l\'historique est gardé', (surLeDisque.histo || []).length >= 1);
  v('⛔ l\'état ne porte aucun secret', /[0-9a-f]{64}/.test(JSON.stringify(surLeDisque).replace(/"empreinte":"[0-9a-f]{16}"/g, '')), false);

  /* ── 8 bis. ⛔ LA FORME DE L'URL D'UNE CLÉ COMPLÈTE — le défaut qui rendait la restauration
     impossible, et qu'aucune relecture n'avait vu. Ce bloc vise `server/s3.js` directement :
     une clé de sauvegarde contient une barre oblique, et elle doit rester une barre dans
     l'URL, sinon la clé relue n'est pas la clé déposée. */
  console.log('\n── 722 · l\'URL d\'une clé de sauvegarde ──');
  {
    const s3 = require(path.join(RACINE, 'server', 's3.js'));
    const cl = s3.client({ endpoint: 'https://coffre.example', bucket: 'teamop-sauvegardes', accessKey: 'a', secretKey: 'b' });
    const u = cl._urlCle('teamop/2026-09-17T03-00-00Z.tar.gz.chiffre');
    v('⛔ la barre oblique RESTE une barre (pas de %2F)', /%2F/i.test(u), false);
    v('⛔ aucune double barre dans le chemin (le segment vide de l\'ancienne forme)', /[^:]\/\//.test(u), false);
    v('l\'URL est exactement celle attendue', u, 'https://coffre.example/teamop-sauvegardes/teamop/2026-09-17T03-00-00Z.tar.gz.chiffre');
    v('une barre de tête est retirée, pas encodée', cl._urlCle('/teamop/x.bin'), 'https://coffre.example/teamop-sauvegardes/teamop/x.bin');
    /* Et ce qui n'est PAS une barre reste bel et bien encodé : on n'a pas ouvert la porte en
       grand pour régler un cas particulier. */
    vrai('un espace reste encodé', cl._urlCle('teamop/a b.bin').includes('a%20b'));
    vrai('⛔ une tentative de remonter d\'un cran n\'est pas interprétée par nous', cl._urlCle('teamop/../x').includes('..'));
    /* La forme des pièces jointes, elle, n'a pas bougé — c'est `test-716` qui la tient, mais
       une confusion entre les deux est exactement ce qui vient d'arriver. */
    v('la forme « pièce jointe » encode TOUJOURS ses deux segments en entier',
      cl._url('ent-a', 'id/avec/barres'), 'https://coffre.example/teamop-sauvegardes/ent-a/id%2Favec%2Fbarres');
  }

  /* ── 8 ter. ⛔ L'OUTIL DE CONFIGURATION DOIT REFUSER CE QU'UN HUMAIN TAPE VRAIMENT ───────
     Appris en direct le 18 septembre 2026, première mise en service : « Object Storage » (le
     nom du MENU de l'hébergeur) donné comme nom de coffre, et l'adresse complète donnée comme
     région. Le programme allait jusqu'au bout, récoltait un HTTP 400 nu, et listait trois
     causes dont AUCUNE n'était la bonne — on cherche alors du côté des droits et des clés
     pendant que le nom porte simplement un espace. Un refus qui ne nomme pas la vraie cause
     est presque pire qu'un refus muet. */
  console.log('\n── 722 · l\'outil de configuration refuse une saisie de travers ──');
  {
    const src = fs.readFileSync(path.join(RACINE, 'server', 'configurer-sauvegarde.js'), 'utf8');
    vrai('⛔ le nom de coffre est vérifié AVANT tout appel au coffre', /\[a-z0-9\]\[a-z0-9\.-\]\{1,61\}\[a-z0-9\]/.test(src));
    vrai('⛔ la région aussi', /\[a-z\]\{2\}-\[a-z\]\+-\\d\+/.test(src));
    /* Et les deux contrôles doivent tomber AVANT `poserCle` : après, le coffre a déjà été
       dérangé et le message est déjà celui d'un HTTP nu. */
    vrai('⛔ … et les deux passent avant le premier appel réseau',
      Math.max(src.indexOf('n\'est pas un nom de coffre valable'), src.indexOf('n\'est pas une région')) < src.indexOf('poserCle('));
    vrai('le message du dépôt refusé explique aussi le 400', /400 : la requête a déplu/.test(src));
    /* La forme exacte, éprouvée sur les valeurs qui ont VRAIMENT été tapées ce jour-là. */
    const nomOk = n => /^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$/.test(n);
    v('⛔ « Object Storage » refusé', nomOk('Object Storage'), false);
    v('⛔ un nom avec majuscule refusé', nomOk('TeamOP-Sauvegardes'), false);
    v('⛔ un nom avec accent refusé', nomOk('sauvegardés'), false);
    v('un nom valable accepté', nomOk('teamop-sauvegardes'), true);
    v('… avec des chiffres et des points aussi', nomOk('teamop.sauv-2026'), true);
    const regOk = r => /^[a-z]{2}-[a-z]+-\d+$/.test(r);
    v('⛔ une adresse donnée comme région : refusée', regOk('https://s3.eu-central-4.ionoscloud.com'), false);
    v('la vraie région acceptée', regOk('eu-central-4'), true);
    v('… une autre région aussi', regOk('eu-south-2'), true);
  }

  /* ── 9. L'ÉCHÉANCE DU JETON GITHUB, extraite du fichier réel ─────────────────────────
     La fonction vit dans `server/index.js` et n'est pas exportée : on l'extrait du fichier
     LIVRÉ et on l'exécute, comme les autres bancs de ce dépôt le font depuis `app.html`.
     Recopier sa logique ici ne prouverait que la recopie. */
  console.log('\n── 722 · l\'échéance du jeton GitHub ──');
  {
    const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    const i = SRV.indexOf('function ghJoursRestants()');
    vrai('la fonction est bien dans le fichier livré', i > 0);
    const corps = SRV.slice(i, SRV.indexOf('\n}', i) + 2);
    const fab = cfg => new Function('config', corps + ' return ghJoursRestants();')(cfg);
    const jours = n => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
    v('⛔ pas de date → null, JAMAIS 0 (0 voudrait dire « expire aujourd\'hui »)', fab({}), null);
    v('⛔ bloc github absent → null aussi', fab({ github: {} }), null);
    v('date illisible → null', fab({ github: { expire: 'le mois prochain' } }), null);
    v('dans 30 jours → 30', fab({ github: { expire: jours(30) } }), 30);
    v('⛔ dans 14 jours → 14, donc sous le seuil de 15 : la surveillance prévient', fab({ github: { expire: jours(14) } }) <= 15, true);
    v('⛔ expiré depuis 3 jours → nombre négatif, pas null', fab({ github: { expire: jours(-3) } }) < 0, true);
    /* Et la surveillance doit VRAIMENT le lire : un champ ajouté dans /health que personne
       ne regarde ne prévient personne. */
    const SURV = fs.readFileSync(path.join(RACINE, '.github', 'scripts', 'surveillance.js'), 'utf8');
    /* ⛔ Ce que /health PUBLIE n'est plus le nombre de jours mais un booléen : le nombre exact
       datait un identifiant interne pour qui interroge une route publique. La surveillance doit
       donc lire le booléen — et surtout, les deux noms doivent CONCORDER : une faute de frappe
       entre ce que le serveur écrit et ce que la surveillance lit rendrait l'alarme muette pour
       toujours, sans que rien ne le signale. C'est pour ça que ce banc compare les deux fichiers. */
    const IDX = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
    vrai('⛔ /health publie un booléen, pas le nombre de jours', /ghExpireBientot:/.test(IDX) && !/\bghJours:/.test(IDX));
    vrai('⛔ la surveillance lit EXACTEMENT ce nom', /j\.ghExpireBientot/.test(SURV));
    vrai('⛔ … et le rappel « pas encore branchée » ne part qu\'une fois par jour', /getUTCHours\(\) === 9/.test(SURV));
    vrai('⛔ … alors qu\'un ÉCHEC reste horaire', /sauvegarde\.ok === false/.test(SURV));
    vrai('⛔ … et l\'état de la sauvegarde', /j\.sauvegarde/.test(SURV));
    vrai('⛔ … et elle échoue quand la sauvegarde est inactive', /sauvegarde\.active === false/.test(SURV));
  }

  /* ── 10. La configuration qu'`install.sh` écrit doit être RELISIBLE ──────────────────
     Une réinstallation qui produit un `config.json` invalide donne un serveur qui ne démarre
     pas — c'est arrivé le 17 septembre 2026, accolade manquante, service à l'arrêt. On ne
     relit donc pas le script des yeux : on substitue ses variables et on parse. */
  console.log('\n── 722 · le config.json d\'install.sh se reparse ──');
  {
    const sh = fs.readFileSync(path.join(RACINE, 'server', 'install.sh'), 'utf8');
    const bloc = sh.slice(sh.indexOf("cat > /opt/teamop/config.json <<EOF") + 36, sh.indexOf('\nEOF', sh.indexOf('cat > /opt/teamop/config.json')));
    const rendu = bloc.replace(/\$PUB/g, 'p').replace(/\$PRIV/g, 'v').replace(/\$KEY/g, 'k').replace(/\$SECRET_DEVIS/g, 'd').replace(/\$SAUV/g, 'a'.repeat(64));
    let cfg = null;
    try { cfg = JSON.parse(rendu); ok++; } catch (e) { ko++; console.log('  ✗ le config.json d\'install.sh est un JSON INVALIDE : ' + e.message); }
    if (cfg) {
      vrai('⛔ une clé de sauvegarde est générée à l\'installation', !!S.cleDepuis(cfg.sauvegarde && cfg.sauvegarde.cle));
      v('⛔ … mais le coffre reste VIDE : une installation neuve n\'écrit chez personne', (cfg.sauvegarde || {}).bucket, '');
      v('… et la rétention a une valeur par défaut', (cfg.sauvegarde || {}).garder, 30);
      v('le champ d\'échéance du jeton existe, vide', (cfg.github || {}).expire, '');
      v('⛔ la preuve de clé courrier reste FERMÉE par défaut', cfg.mailPreuveExigee, true);
      vrai('⛔ et install.sh ne porte AUCUN secret en dur', !/(gh[pousr]_|github_pat_|sk-ant-)[A-Za-z0-9_]{10,}/.test(sh));
    }
    /* ⛔ Deux clés différentes d'une installation à l'autre : `openssl rand` doit être DANS le
       script, pas une valeur figée qu'on aurait recopiée. */
    vrai('⛔ la clé de sauvegarde est tirée au hasard, pas écrite dans le script', /SAUV=\$\(openssl rand -hex 32\)/.test(sh));
  }

  /* ⛔⛔ TROIS ÉTATS, PAS DEUX — la MÊME confusion que `configuree`, refaite un cran plus bas.
     Un `"mensuel": false` dans `config.json` rendait `mensuelJ: null`, donc la surveillance
     criait « aucune copie MENSUELLE n'a jamais été déposée » tous les jours à 9 h UTC, pour
     toujours, sur une plateforme réglée exactement comme on l'a voulu. Une alarme qui crie faux
     se fait ignorer, puis désactiver : c'est comme ça qu'on perd un garde-fou. */
  try { fs.unlinkSync(path.join(DATA, 'sauvegardes-hors-site.json')); } catch (e) {}
  {
    const c2 = coffreNeuf(), m2 = monter(c2, { mensuel: false });
    const r2 = await m2.lancer('banc');
    v('mensuel éteint : la nuit réussit quand même', r2.ok, true);
    v('⛔ et aucune copie mensuelle n\'est déposée', c2._cles().filter(k => k.indexOf('mensuel/') >= 0).length, 0);
    v('⛔ /health dit ÉTEINT (false), pas « jamais faite » (null)', m2.sante().mensuelJ, false);
    v('   et le dit aussi en clair', m2.sante().mensuelActif, false);
  }
  /* ⚠️ Le contre-test : allumé et jamais faite doit TOUJOURS rendre `null`, sinon on vient de
     rendre l'alarme muette pour tout le monde. */
  try { fs.unlinkSync(path.join(DATA, 'sauvegardes-hors-site.json')); } catch (e) {}
  {
    const c3 = coffreNeuf(), m3 = monter(c3);
    v('⛔ allumé et jamais faite : toujours null', m3.sante().mensuelJ, null);
    v('   et actif', m3.sante().mensuelActif, true);
  }

  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
  console.log('\n════ test-722 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ exception : ' + e.stack); process.exit(1); });
