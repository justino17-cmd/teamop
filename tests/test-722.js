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
v('coffre vide : rien à effacer', S.aElaguer([], 30), []);
v('null : rien à effacer (et pas d\'exception)', S.aElaguer(null, 30), []);
v('une seule copie, on en garde 30 : on n\'y touche pas', S.aElaguer(obj(A), 30), []);
v('quatre copies, on en garde 2 : les DEUX PLUS ANCIENNES partent', S.aElaguer(obj(A, B, C, D), 2), [B, A]);
v('… quel que soit l\'ordre d\'arrivée de la liste', S.aElaguer(obj(C, A, D, B), 2), [B, A]);
v('on garde exactement ce qu\'on a demandé', S.aElaguer(obj(A, B, C, D), 4), []);
/* ⛔ LES CAS QUI FONT PEUR — ET LA RÈGLE QUE CE BANC A CORRIGÉE. Au premier jet, ce test
   exigeait que `garder:0` ne laisse qu'UNE copie. C'était le mauvais réflexe : un zéro dans
   `config.json` est une faute de frappe, pas une instruction, et l'honorer coûterait tout
   l'historique d'un coup. La règle juste est l'inverse — un réglage absurde retombe sur le
   défaut, on efface MOINS quand on ne comprend pas. Le code était bon, le test avait tort. */
v('garder:0 (faute de frappe) → on retombe sur le défaut, rien n\'est effacé', S.aElaguer(obj(A, B, C), 0), []);
v('garder:-5 → idem', S.aElaguer(obj(A, B, C), -5), []);
v('garder:"trois" → idem, on n\'efface pas sur une valeur qu\'on ne comprend pas', S.aElaguer(obj(A, B, C), 'trois'), []);
v('… et au-delà du défaut de 30, l\'élagage reprend', S.aElaguer(Array.from({ length: 33 }, (_, i) => ({ cle: 'teamop/2026-09-' + String(i + 1).padStart(2, '0') + 'T03-00-00Z.tar.gz.chiffre', octets: 1 })), 0).length, 3);
vrai('⛔ … et jamais la plus récente', !S.aElaguer(obj(A, B, C, D), 1).includes(D));
/* ⛔ Et on ne touche à rien qui ne vienne pas de nous : le coffre peut contenir autre chose. */
v('un objet étranger au format n\'est jamais effacé',
  S.aElaguer(obj(A, B, C, 'teamop/notes-de-justin.txt', 'autre-chose.zip'), 1), [B, A]);
v('… même quand il n\'y a QUE des objets étrangers', S.aElaguer(obj('un.txt', 'deux.zip'), 1), []);

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
      async poserCle(k, corps) { if (c.pannes.poser) return { ok: false, statut: c.pannes.poser }; objets.set(k, Buffer.from(corps)); return { ok: true, octets: corps.length }; },
      async lireCle(k) {
        if (c.pannes.lire) return { ok: false, statut: c.pannes.lire };
        if (c.pannes.lireAbime && objets.has(k)) { const b = Buffer.from(objets.get(k)); b[10] ^= 0xFF; return { ok: true, corps: b }; }
        if (c.pannes.lireCourt && objets.has(k)) return { ok: true, corps: objets.get(k).subarray(0, 50) };
        if (!objets.has(k)) return { ok: false, absente: true };
        return { ok: true, corps: objets.get(k) };
      },
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
  v('… et le coffre en porte une', coffre._n(), 1);
  vrai('… l\'archive relue contenait des entrées', r.entrees >= 6);
  v('⛔ … et /health la dit fraîche', mod.sante().ok, true);
  v('⛔ … sans jamais donner son POIDS (c\'est le volume de données de tous les clients)', 'octets' in mod.sante(), false);
  v('… ni le nom du coffre', JSON.stringify(mod.sante()).includes('bucket'), false);

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
    vrai('⛔ la surveillance horaire lit ghJours', /j\.ghJours/.test(SURV));
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

  try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {}
  console.log('\n════ test-722 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('✗ exception : ' + e.stack); process.exit(1); });
