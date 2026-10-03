/* ⛔ CE QUE CE FICHIER GARDE — LA SAUVEGARDE HORS SITE D'OP MESSAGES, MODULE SEUL (famille 11 de SERVEUR.md § 3.11, étape 3).

   `server-msg/sauvegarde.js` monté lui-même : horloge, coffre et base injectés. Le coffre est un VRAI serveur HTTP qui parle S3
   (`tests/outils-sauvegarde.js` : il recalcule la signature et l'empreinte du corps, il sait refuser, corrompre, tronquer) ; la base
   est la VRAIE (`stockage.js`, fichier SQLite, WAL). Pas de service ici — c'est `test-951` qui dit que tout est branché. Celui-ci dit
   que ce qui est SAUVEGARDÉ est juste :

     · le client S3 est la copie EXACTE de celui d'OP GESTION (octet pour octet) ;
     · la configuration est validée, et une clé de sauvegarde égale à la clé maître est refusée ;
     · l'archive est CHIFFRÉE (aucun canari en clair, aucune signature SQLite), liée à son instance et à sa date (une archive modifiée
       d'un octet, une mauvaise clé, une archive rebaptisée sont refusées) ;
     · l'instantané est COHÉRENT pendant que le service écrit, et la restauration rend les MÊMES lignes ;
     · une archive qui ne se relit pas est RETIRÉE du coffre et l'échec se compte ;
     · la rétention efface ce qu'elle doit et jamais ce qu'elle ne doit pas ;
     · les pièces partent une fois (un second passage n'envoie rien) et la copie miroir ne vide pas le coffre ;
     · le registre des purges est REJOUÉ sur une copie restaurée ;
     · `/health` (sante) dit vrai et ne publie ni nom de bucket, ni chemin, ni motif ;
     · aucun secret dans les journaux.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait
   pu compter. ⛔ ET UN DÉTECTEUR SE PROUVE SUR UN CAS QU'IL DOIT TROUVER : le canari « en clair » est d'abord cherché là où il EST. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const O = require('./outils-sauvegarde');
const { v, vrai, fin } = O.compteur();
const SM = O.SERVICE;
const SAUV = require(path.join(SM, 'sauvegarde.js'));
const STOCK = require(path.join(SM, 'stockage.js'));
/* Le schéma de la base d'aujourd'hui (la dernière migration) : une copie saine doit le porter. Lu dans le module, jamais écrit en dur —
   la migration des pièces (3) l'a fait bouger une fois, la suivante le refera. */
const SCHEMA = Math.max(...STOCK.MIGRATIONS.map(m => m.v));
const RESTAURER = require(path.join(SM, 'outils', 'restaurer.js'));
const dormir = (ms) => new Promise(r => setTimeout(r, ms));
const lance = (f) => { try { f(); return null; } catch (e) { return e; } };
/* Un identifiant de pièce de la FORME du service (`f_` + 32 hexadécimaux dont les deux premiers nomment le dossier) et son chemin relatif : le miroir
   de la sauvegarde ne prend plus que cela (gardien A5, 3 octobre 2026 — les dépôts en cours partaient au coffre). */
const idPiece = (dir, tag) => 'f_' + dir + crypto.createHash('sha256').update(String(tag)).digest('hex').slice(0, 30);
const relPiece = (dir, tag) => dir + '/' + idPiece(dir, tag);
const lanceAsync = async (f) => { try { await f(); return null; } catch (e) { return e; } };
const code = (f) => O.sansCommentaires(fs.readFileSync(f, 'utf8'));
/* Le contrôle des copies, EN PROCESSUS ici (rapide) : le processus enfant est éprouvé à part, plus bas. */
const controlerIci = async (chemin) => STOCK.ouvrir.copie.controlerFichier(chemin);
const horlogeFixe = (h) => () => h.t;

(async () => {
  /* ══ 1. LE CLIENT S3 EST LA COPIE EXACTE ═══════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · lib/s3.js : la copie exacte du client S3 d\'OP GESTION ──');
  {
    const a = path.join(O.RACINE, 'server', 's3.js'), b = path.join(SM, 'lib', 's3.js');
    vrai('les deux fichiers existent (population : un fichier absent rendrait « identique » vrai de deux erreurs)', fs.existsSync(a) && fs.existsSync(b) && fs.statSync(a).size > 5000);
    v('⛔ server-msg/lib/s3.js est IDENTIQUE octet pour octet à server/s3.js (aucun code partagé à l\'exécution, mais une seule définition de la signature)',
      Buffer.compare(fs.readFileSync(a), fs.readFileSync(b)), 0);
    v('   même empreinte', crypto.createHash('sha256').update(fs.readFileSync(a)).digest('hex') === crypto.createHash('sha256').update(fs.readFileSync(b)).digest('hex'), true);
    const m = require(b);
    v('   et il exporte bien ce que le module de sauvegarde utilise (client, signer, uriEncode, sha256hex)', ['client', 'signer', 'uriEncode', 'sha256hex'].map(k => typeof m[k]), ['function', 'function', 'function', 'function']);
    const src = code(path.join(SM, 'sauvegarde.js')), srcCoffre = code(path.join(SM, 'coffre.js'));
    vrai('   le transport du coffre (`coffre.js`) charge le client depuis ./lib/s3, le module de sauvegarde passe par `./coffre` — rien ne vient de server/', /require\('\.\/lib\/s3'\)/.test(srcCoffre) && /require\('\.\/coffre'\)/.test(src) && !/\.\.\/server|server\//.test(src + srcCoffre));
  }

  /* ══ 2. LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · la configuration : validée au démarrage, et la clé de sauvegarde n\'est JAMAIS la clé maître ──');
  {
    const kek = crypto.randomBytes(32), cle = O.cleHex();
    const bloc = { endpoint: 'https://s3.exemple.invalid', region: 'eu-central-4', bucket: 'opmsg-sauvegardes', accessKey: 'ACCESSBANC123', secretKey: 'SECRETBANC456xyz', cle };
    const lire = (c, o) => SAUV.lireConfigSauvegarde(c, Object.assign({ instance: 'beta', kek }, o || {}));
    v('absent → null (le module est inerte : rien ne part, rien n\'est écrit)', [lire(undefined), lire(null)], [null, null]);
    const ok = lire(bloc);
    vrai('une configuration valide est acceptée, gelée, et la clé devient 32 octets', !!ok && Object.isFrozen(ok) && Buffer.isBuffer(ok.cle) && ok.cle.length === 32 && ok.cle.toString('hex') === cle);
    v('   les défauts : préfixe « beta/ », 14 jours, une heure, 3 essais de reprise espacés de dix minutes au plus',
      [ok.prefixe, ok.retentionJours, ok.intervalleMs, ok.retryMs, ok.coffre.region], ['beta/', 14, 3600000, 600000, 'eu-central-4']);
    v('   en production, le préfixe par défaut est « prod/ »', lire(bloc, { instance: 'prod' }).prefixe, 'prod/');
    v('   une clé en MAJUSCULES est la même clé', lire(Object.assign({}, bloc, { cle: cle.toUpperCase() })).cle.toString('hex'), cle);
    v('   la barre finale de l\'adresse est retirée', lire(Object.assign({}, bloc, { endpoint: 'https://s3.exemple.invalid///' })).coffre.endpoint, 'https://s3.exemple.invalid');
    vrai('   http:// est admis pour la boucle locale seulement (un coffre sur la machine, les bancs)', !lance(() => lire(Object.assign({}, bloc, { endpoint: 'http://127.0.0.1:9000' }))) && !lance(() => lire(Object.assign({}, bloc, { endpoint: 'http://localhost:9000' }))));
    vrai('   la clé maître peut ne pas être donnée (l\'outil de restauration lit la configuration sur une machine qui n\'a plus la clé)', !lance(() => lire(bloc, { kek: null })));

    const refus = [
      ['un bloc qui n\'est pas un objet', 'texte', /sauvegarde doit être un objet/],
      ['un tableau', [], /sauvegarde doit être un objet/],
      ['sans adresse de coffre', { endpoint: '' }, /endpoint/],
      ['http:// vers Internet (la signature ne voyage pas en clair)', { endpoint: 'http://exemple.org' }, /endpoint/],
      ['une adresse avec un chemin', { endpoint: 'https://exemple.org/chemin' }, /endpoint/],
      ['un nom de bucket avec une majuscule et un espace (le nom du MENU de l\'hébergeur)', { bucket: 'Object Storage' }, /bucket/],
      ['une région qui est une adresse', { region: 'https://s3.exemple.org' }, /region/],
      ['sans clé d\'accès', { accessKey: '' }, /accessKey/],
      ['une clé secrète qui porte un espace', { secretKey: 'a b c' }, /secretKey/],
      ['une clé de sauvegarde trop courte', { cle: 'abc' }, /cle doit faire 64/],
      ['une clé de sauvegarde qui n\'est pas hexadécimale', { cle: 'z'.repeat(64) }, /cle doit faire 64/],
      ['une clé de sauvegarde « 0000… » (faute de frappe, exemple recopié)', { cle: '0'.repeat(64) }, /trop régulière/],
      ['une clé de sauvegarde « abab… »', { cle: 'ab'.repeat(32) }, /trop régulière/],
      ['⛔ une clé de sauvegarde ÉGALE à la clé maître', { cle: kek.toString('hex') }, /clé maître/],
      ['⛔ la clé maître écrite en majuscules (comparaison sur les octets, pas sur le texte)', { cle: kek.toString('hex').toUpperCase() }, /clé maître/],
      ['⛔ une rétention de 0 jour (« vide le coffre »)', { retentionJours: 0 }, /jamais 0/],
      ['une rétention négative', { retentionJours: -5 }, /retentionJours/],
      ['une rétention en texte', { retentionJours: '14' }, /retentionJours/],
      ['une rétention décimale', { retentionJours: 14.5 }, /retentionJours/],
      ['une rétention d\'un siècle', { retentionJours: 36500 }, /retentionJours/],
      ['une sauvegarde toutes les minutes (le coffre serait martelé)', { intervalleMin: 1 }, /intervalleMin/],
      ['un intervalle de zéro', { intervalleMin: 0 }, /intervalleMin/],
      ['⛔ le préfixe de l\'AUTRE instance (la bêta écrirait — et effacerait — sous la production)', { prefixe: 'prod/' }, /autre instance/],
      ['   et sous un dossier de l\'autre instance', { prefixe: 'prod/ma-copie/' }, /autre instance/],
      ['un préfixe qui remonte (..)', { prefixe: 'a/../b/' }, /prefixe/],
      ['un préfixe sans barre finale', { prefixe: 'beta' }, /prefixe/],
      ['un préfixe qui commence par une barre', { prefixe: '/beta/' }, /prefixe/],
    ];
    vrai('la population : ' + refus.length + ' refus à examiner', refus.length >= 25);
    for (const [nom, c, motif] of refus) {
      const cfg = (c && typeof c === 'object' && !Array.isArray(c)) ? Object.assign({}, bloc, c) : c;
      const e = lance(() => lire(cfg));
      vrai(nom + ' → refusé : ' + (e ? e.message : '(accepté !)'), !!e && e.code === 'CONFIG' && motif.test(e.message));
      /* ⛔ AUCUN message de refus ne cite une VALEUR : ce texte part dans le journal du démarrage, que Justin recolle. */
      if (e && typeof cfg === 'object' && !Array.isArray(cfg)) vrai('   … et le message ne contient aucun secret de la configuration', ![cfg.secretKey, cfg.accessKey, cfg.cle, kek.toString('hex')].some(s => s && String(s).length > 5 && e.message.includes(String(s))));
    }
    const eProd = lance(() => lire(Object.assign({}, bloc, { intervalleMs: 500 }), { instance: 'prod' }));
    vrai('⛔ le rythme des bancs (intervalleMs) est refusé en PRODUCTION : il martèlerait le coffre', !!eProd && /intervalleMs/.test(eProd.message));
    v('   et admis en bêta (c\'est ce qui permet de jouer une passe en une fraction de seconde)', lire(Object.assign({}, bloc, { intervalleMs: 500 })).intervalleMs, 500);
    const eInst = lance(() => lire(bloc, { instance: 'autre' }));
    vrai('une instance inconnue est refusée', !!eInst && eInst.code === 'CONFIG');
  }

  /* ══ 3. LES NOMS ET LA RÉTENTION (fonctions pures) ═════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · les noms d\'archive et la rétention : dans le doute, on efface MOINS ──');
  {
    const t = Date.UTC(2026, 9, 2, 14, 3, 0, 123);
    v('le nom porte l\'instant, millisecondes comprises (deux passes dans la même seconde ne s\'écrasent pas)', SAUV.nomDe(t), '2026-10-02T14-03-00-123Z');
    v('   et se relit : l\'aller-retour est exact', [SAUV.dateDeNom(SAUV.nomDe(t)), SAUV.isoDeNom(SAUV.nomDe(t))], [t, '2026-10-02T14:03:00.123Z']);
    v('   un mois 13 et un 31 février ne sont pas des dates (Date.UTC les « normaliserait »)', [SAUV.dateDeNom('2026-13-02T14-03-00-123Z'), SAUV.dateDeNom('2026-02-31T14-03-00-123Z'), SAUV.dateDeNom('n\'importe quoi')], [null, null, null]);
    v('   la clé d\'une archive est <préfixe>base/<nom>.msgbak', SAUV.cleBase('beta/', t), 'beta/base/2026-10-02T14-03-00-123Z.msgbak');
    const pre = 'beta/';
    const bonne = SAUV.cleBase(pre, t);
    v('archiveDeCle : la clé d\'une archive est reconnue', (SAUV.archiveDeCle(pre, bonne) || {}).ts, t);
    v('⛔ ce qui n\'est pas EXACTEMENT <préfixe>base/<date>.msgbak n\'est pas à nous : un sous-dossier, un autre suffixe, un autre préfixe, une date fausse',
      ['beta/base/mensuel/2026-10-02T14-03-00-123Z.msgbak', 'beta/base/2026-10-02T14-03-00-123Z.tar.gz', 'prod/base/2026-10-02T14-03-00-123Z.msgbak', 'beta/base/2026-99-02T14-03-00-123Z.msgbak', 'beta/pieces/ab/cd', 'beta/base/'].map(k => SAUV.archiveDeCle(pre, k)), [null, null, null, null, null, null]);

    const J = 86400000, maintenant = Date.UTC(2026, 9, 20, 12, 0, 0, 0);
    const obj = (jours) => ({ cle: SAUV.cleBase(pre, maintenant - jours * J), octets: 1000 });
    const ages = [1, 2, 5, 13.9, 14.1, 15, 40];
    const objets = ages.map(obj);
    const sup = SAUV.aElaguer(objets, { prefixe: pre, maintenant, jours: 14 });
    vrai('la population : ' + objets.length + ' archives, de 1 à 40 jours', objets.length === 7);
    v('⛔ la rétention de 14 jours efface ce qui a plus de 14 jours — et rien d\'autre', sup.sort(), [14.1, 15, 40].map(a => obj(a).cle).sort());
    v('   13,9 jours reste (le seuil est « plus de 14 jours », pas « presque »)', sup.includes(obj(13.9).cle), false);
    v('⛔ les TROIS plus récentes ne sont jamais effacées, même vieilles : cinq archives toutes de plus de 30 jours → deux effacées, trois gardées',
      SAUV.aElaguer([30, 31, 32, 33, 34].map(obj), { prefixe: pre, maintenant, jours: 14 }).sort(), [33, 34].map(a => obj(a).cle).sort());
    v('   deux archives seulement, toutes deux vieilles : rien (c\'est peut-être tout ce qui existe)', SAUV.aElaguer([40, 50].map(obj), { prefixe: pre, maintenant, jours: 14 }), []);
    v('   aucune archive : rien', SAUV.aElaguer([], { prefixe: pre, maintenant, jours: 14 }), []);
    const etranger = [{ cle: 'beta/base/mensuel/' + SAUV.nomDe(maintenant - 90 * J) + '.msgbak' }, { cle: 'prod/base/' + SAUV.nomDe(maintenant - 90 * J) + '.msgbak' }, { cle: 'beta/pieces/ab/cd' }, { cle: 'beta/base/notes.txt' }, null, {}];
    v('⛔ un objet étranger n\'est jamais compté ni effacé (sous-dossier, autre instance, pièce, texte, objet sans clé)', SAUV.aElaguer(etranger.concat([1, 2, 3, 4].map(obj)), { prefixe: pre, maintenant, jours: 14 }), []);
    const attendu = SAUV.aElaguer(objets, { prefixe: pre, maintenant, jours: 14 }).sort();
    for (const absurde of [0, -3, NaN, undefined, 'quinze', null, 0.5]) {
      v('⛔ un réglage absurde (' + String(absurde) + ') retombe sur 14 jours — il ne veut PAS dire « vide le coffre »', SAUV.aElaguer(objets, { prefixe: pre, maintenant, jours: absurde }).sort(), attendu);
    }
    v('   sans préfixe, on ne sait pas de quel dossier on parle : rien', SAUV.aElaguer(objets, { maintenant, jours: 14 }), []);
    v('   sans heure fiable (NaN), rien', SAUV.aElaguer(objets, { prefixe: pre, maintenant: NaN, jours: 14 }), []);
    v('⛔ si la plus récente est datée du FUTUR (l\'horloge de cette machine retarde ou a sauté), on n\'efface rien : on ne sait plus quelle heure il est',
      SAUV.aElaguer(objets.concat([{ cle: SAUV.cleBase(pre, maintenant + 5 * 3600000) }]), { prefixe: pre, maintenant, jours: 14 }), []);
    vrai('   une avance de moins d\'une heure est tolérée (deux horloges qui diffèrent de quelques minutes)', SAUV.aElaguer(objets.concat([{ cle: SAUV.cleBase(pre, maintenant + 600000) }]), { prefixe: pre, maintenant, jours: 14 }).length === 3);
    v('   une rétention de 30 jours efface moins', SAUV.aElaguer(objets, { prefixe: pre, maintenant, jours: 30 }), [obj(40).cle]);
    v('   une rétention d\'un jour garde quand même les trois plus récentes', SAUV.aElaguer(objets, { prefixe: pre, maintenant, jours: 1 }).length, 4);
  }

  /* ══ 4. LE FORMAT D'ARCHIVE ═══════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · l\'archive : chiffrée, liée à son instance et à sa date, refusée à la moindre altération ──');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-fmt-'));
    try {
      const CANARIS = ['CANARI-ARCHIVE-7Q3Z-un', 'CANARI-ARCHIVE-7Q3Z-deux'];
      const source = path.join(bac, 'source.bin');
      /* Une source en partie compressible (du texte, avec les canaris) et en partie du hasard (comme des chiffrés) : ~3 Mo, plusieurs blocs de flux. */
      const morceaux = [];
      for (let i = 0; i < 3000; i++) morceaux.push(Buffer.from('SQLite format 3\u0000 ligne ' + i + ' ' + CANARIS[i % 2] + ' ' + 'abc'.repeat(40) + '\n'));
      morceaux.push(crypto.randomBytes(1500000));
      fs.writeFileSync(source, Buffer.concat(morceaux));
      const cle = crypto.randomBytes(32), meta = { instance: 'beta', date: '2026-10-02T14:03:00.123Z', schema: 2 };
      const sortie = path.join(bac, 'archive.bin');
      const f = await SAUV.fabriquer({ source, sortie, cle, meta });
      const brut = fs.readFileSync(sortie);
      v('l\'archive a la taille annoncée et l\'empreinte du fichier écrit (calculée en passant, pas en le relisant)', [f.octets, f.octets === brut.length, f.empreinte === crypto.createHash('sha256').update(brut).digest('hex')], [brut.length, true, true]);
      vrai('elle commence par le magique versionné, puis une ligne JSON qui dit de quelle instance, à quelle date, de quel schéma',
        brut.subarray(0, SAUV.MAGIQUE.length).toString() === SAUV.MAGIQUE && JSON.parse(brut.subarray(SAUV.MAGIQUE.length, brut.indexOf(0x0a, SAUV.MAGIQUE.length)).toString()).instance === 'beta');
      const h = SAUV.lireEntete(sortie);
      v('   l\'en-tête se lit SANS clé', h.meta, { v: 1, instance: 'beta', date: '2026-10-02T14:03:00.123Z', schema: 2 });
      vrai('   elle est PLUS PETITE que la source (compressée avant d\'être chiffrée : du texte de base compresse, du chiffré non)', f.octets < fs.statSync(source).size);

      /* ⛔ LE DÉTECTEUR D'ABORD : il doit TROUVER les canaris et la signature SQLite là où ils sont. */
      v('contre-épreuve du détecteur : sur la source en clair il trouve les canaris et la signature SQLite', O.enClair(fs.readFileSync(source), CANARIS).length >= 3, true);
      v('   et sur la source seulement COMPRESSÉE (gzip, sans chiffrement) il les trouve aussi — c\'est le cas d\'une archive non chiffrée', O.enClair(require('zlib').gzipSync(fs.readFileSync(source)), CANARIS).length >= 1, true);
      v('⛔ AUCUN canari ni signature SQLite dans l\'archive — ni dans les octets, ni dans ce qui se décompresse à partir d\'un point de l\'en-tête', O.enClair(brut, CANARIS), []);
      const f2 = await SAUV.fabriquer({ source, sortie: path.join(bac, 'archive2.bin'), cle, meta });
      const brut2 = fs.readFileSync(path.join(bac, 'archive2.bin'));
      vrai('⛔ deux archives de la MÊME source ne se ressemblent pas (vecteur d\'initialisation tiré au hasard, jamais deux fois le même avec une même clé)', !SAUV.lireEntete(path.join(bac, 'archive2.bin')).iv.equals(h.iv) && !brut.equals(brut2) && f.empreinte !== f2.empreinte);

      const rendu = path.join(bac, 'rendu.bin');
      const o = await SAUV.ouvrirArchive(sortie, cle, rendu, { instance: 'beta', date: meta.date });
      v('⛔ l\'archive rouverte avec la bonne clé rend la source OCTET POUR OCTET', [Buffer.compare(fs.readFileSync(rendu), fs.readFileSync(source)), o.octets, o.meta.instance], [0, fs.statSync(source).size, 'beta']);

      /* Les altérations : chacune est refusée, et ne laisse AUCUN fichier qui aurait l'air d'une base. */
      const altere = async (nom, octets, attendu, extra) => {
        const p = path.join(bac, 'alt-' + nom.replace(/\W+/g, '_') + '.bin'), vers = p + '.rendu';
        fs.writeFileSync(p, octets);
        const e = await lanceAsync(() => SAUV.ouvrirArchive(p, (extra && extra.cle) || cle, vers, extra && extra.attendu));
        const reste = fs.existsSync(vers) || fs.existsSync(vers + '.partiel');
        vrai('⛔ ' + nom + ' → refusée (' + (e ? e.code : 'ACCEPTÉE !') + ')' + (reste ? ' ET un fichier est resté' : ''), !!e && e.code === attendu && !reste);
      };
      const flip = (b, i) => { const c = Buffer.from(b); c[i] ^= 0x01; return c; };
      const iMeta = brut.indexOf(Buffer.from('"beta"'));
      await altere('une mauvaise clé', brut, 'dechiffrement-impossible', { cle: crypto.randomBytes(32) });
      await altere('un octet retourné au MILIEU du chiffré', flip(brut, Math.floor(brut.length / 2)), 'dechiffrement-impossible');
      await altere('un octet retourné dans l\'ÉTIQUETTE (les 16 derniers octets)', flip(brut, brut.length - 5), 'dechiffrement-impossible');
      await altere('un octet retourné dans le vecteur d\'initialisation', flip(brut, h.debutChiffre - 3), 'dechiffrement-impossible');
      await altere('l\'archive amputée d\'un octet', brut.subarray(0, brut.length - 1), 'dechiffrement-impossible');
      await altere('l\'archive allongée d\'un octet', Buffer.concat([brut, Buffer.from([0])]), 'dechiffrement-impossible');
      await altere('l\'instance réécrite dans l\'en-tête (beta → prod, même longueur : l\'en-tête est AUTHENTIFIÉ, sinon une archive de la bêta se ferait passer pour celle de la production)',
        Buffer.concat([brut.subarray(0, iMeta + 1), Buffer.from('prod'), brut.subarray(iMeta + 5)]), 'dechiffrement-impossible');
      await altere('la date réécrite dans l\'en-tête (une vieille archive rebaptisée avec la date d\'aujourd\'hui)', Buffer.from(brut.toString('latin1').replace('2026-10-02T14:03:00.123Z', '2026-10-09T14:03:00.123Z'), 'latin1'), 'dechiffrement-impossible');
      await altere('le schéma réécrit dans l\'en-tête', Buffer.from(brut.toString('latin1').replace('"schema":2', '"schema":9'), 'latin1'), 'dechiffrement-impossible');
      await altere('un fichier qui n\'est pas une archive', Buffer.from('ceci est un fichier quelconque, assez long pour dépasser la taille d\'un en-tête d\'archive valable'), 'entete-absent');
      await altere('un fichier vide', Buffer.alloc(0), 'entete-absent');
      await altere('un en-tête sans fin de ligne', Buffer.concat([Buffer.from(SAUV.MAGIQUE), Buffer.alloc(3000, 0x41)]), 'entete-illisible');
      await altere('un en-tête dont le JSON est cassé', Buffer.concat([Buffer.from(SAUV.MAGIQUE), Buffer.from('{pas du json\n'), Buffer.alloc(100, 1)]), 'entete-illisible');
      await altere('une version inconnue du format', Buffer.concat([Buffer.from(SAUV.MAGIQUE), Buffer.from('{"v":2,"instance":"beta","date":"x","schema":2}\n'), Buffer.alloc(100, 1)]), 'version-inconnue');
      await altere('une archive trop courte pour porter un chiffré', Buffer.concat([brut.subarray(0, h.debutChiffre + 5)]), 'trop-courte');
      await altere('l\'archive d\'une AUTRE instance, à qui on demande celle de la bêta', brut, 'instance-differente', { attendu: { instance: 'prod' } });
      await altere('une archive dont la date n\'est pas celle de son NOM (rebaptisée)', brut, 'date-differente', { attendu: { instance: 'beta', date: '2026-10-09T14:03:00.123Z' } });
      const eAbs = await lanceAsync(() => SAUV.ouvrirArchive(path.join(bac, 'absente.bin'), cle, path.join(bac, 'x.db')));
      vrai('une archive qui n\'existe pas : une erreur nommée, pas une exception brute', !!eAbs && eAbs.code === 'archive-introuvable');

      /* ⛔ LE PLAFOND DE GCM : au-delà de ~64 Gio par message le chiffrement n'est plus sûr — le module REFUSE. (Fichier creux : instantané.) */
      const gros = path.join(bac, 'gros.bin');
      let creux = true;
      try { const fd = fs.openSync(gros, 'w'); fs.ftruncateSync(fd, SAUV.MAX_OCTETS_GCM + 1); fs.closeSync(fd); } catch (e) { creux = false; }
      if (creux) {
        const e = await lanceAsync(() => SAUV.fabriquer({ source: gros, sortie: path.join(bac, 'gros.sortie'), cle, meta }));
        vrai('⛔ une base de plus de 32 Gio est refusée (« trop-volumineuse ») avant d\'écrire un octet', !!e && e.code === 'trop-volumineuse' && !fs.existsSync(path.join(bac, 'gros.sortie')));
        fs.rmSync(gros, { force: true });
      } else vrai('(ce système de fichiers ne sait pas faire un fichier creux de 32 Gio : le plafond de GCM n\'est pas joué ici)', true);
    } finally { fs.rmSync(bac, { recursive: true, force: true }); }
  }

  /* ══ 5. L'INSTANTANÉ EST COHÉRENT PENDANT QUE LE SERVICE ÉCRIT ════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · l\'instantané : cohérent PENDANT que le service écrit (API de sauvegarde, lecteur à part, un pas) ──');
  /* L'empreinte du CONTENU de chaque table d'une base (lue à part, en lecture seule) : « mêmes lignes » se prouve ligne à ligne. */
  const empreinteTables = (chemin) => {
    const d = new DatabaseSync(chemin, { readOnly: true });
    try {
      const out = {};
      const tables = d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' ORDER BY name").all().map(r => r.name);
      for (const t of tables) {
        const h = crypto.createHash('sha256'); let n = 0;
        for (const r of d.prepare('SELECT * FROM "' + t + '" ORDER BY rowid').all()) { h.update(JSON.stringify(r, (k, x) => (x instanceof Uint8Array ? Buffer.from(x).toString('base64') : (typeof x === 'bigint' ? Number(x) : x)))); n++; }
        out[t] = n + ':' + h.digest('hex').slice(0, 16);
      }
      return out;
    } finally { d.close(); }
  };
  {
    /* Une base ASSEZ GROSSE pour que la copie dure : on la bourre d'événements de journal par une connexion à part, en UNE transaction
       (cinq mille `messageEnvoyer`, chacun synchrone et durable, prendraient des dizaines de secondes). Les invariants restent justes :
       le journal compte autant de lignes que son compteur automatique en a numérotées. */
    const bourrer = (b, lignes) => {
      const d = new DatabaseSync(b.chemin);
      try {
        d.exec('PRAGMA busy_timeout=5000; BEGIN IMMEDIATE');
        const ins = d.prepare("INSERT INTO journal(genre, conv, uid, ref, ts) VALUES('bourrage', NULL, NULL, ?, 1)");
        const rembourrage = 'x'.repeat(180);
        for (let i = 0; i < lignes; i++) ins.run(rembourrage + i);
        d.exec('COMMIT');
      } finally { d.close(); }
    };
    const sousCharge = async ({ moteur, lignes }) => {
      const b = O.creerBase({ moteur });
      const { a, c, conv } = O.remplir(b, 300);
      bourrer(b, lignes);
      let ecritures = 0, stop = false, i = 0, refusEcrivain = '';
      /* L'écrivain du service : des transactions EXPLICITES (BEGIN IMMEDIATE … COMMIT, en plusieurs appels), une à chaque tour de boucle.
         ⛔ Si la copie le BLOQUE (« database is locked »), c'est le service qui ne peut plus écrire pendant la sauvegarde : on le note, on ne meurt pas. */
      const ecrire = () => {
        if (stop) return;
        try { b.S.messageEnvoyer({ conv, auteur: i % 2 ? c.id : a.id, cid: 'vivant-' + (i++), texte: 'écrit PENDANT la copie ' + i }); }
        catch (e) { refusEcrivain = String(e && e.message).slice(0, 60); stop = true; return; }
        ecritures++; setImmediate(ecrire);
      };
      b.S.messageEnvoyer({ conv, auteur: a.id, cid: 'dernier-avant', texte: 'le dernier écrit avant la copie' });   // une écriture que seul le journal WAL porte encore
      const avant = b.S.sonde(), e0 = ecritures;
      ecrire();
      const vers = path.join(b.dossier, 'copie.db');
      /* ⛔ UNE COPIE QUI NE FINIT JAMAIS DOIT FAIRE TOMBER LE BANC, PAS LE FAIRE PENDRE : copiée par petits pas sous un écrivain, la copie
         recommence à chaque écriture et ne se termine pas (mesuré). Sans borne, ce banc ne rendrait jamais la main — et la CI attendrait ses six heures. */
      let r;
      try { r = await Promise.race([b.S.instantane(vers).catch((e) => ({ methode: 'échec : ' + String(e && e.message).slice(0, 60) })), new Promise((res) => { const m = setTimeout(() => res({ methode: 'interminable (plus de 30 s)' }), 30000); m.unref(); })]); }
      finally { stop = true; }
      const apres = b.S.sonde();
      return { b, r, avant, apres, ecritures: ecritures - e0, vers, refusEcrivain };
    };
    /* ⛔ UNE COURSE DE BANC SE JOUE AU GESTE, JAMAIS AU CHRONOMÈTRE. Combien d'écritures tombent PENDANT une copie qui dure quelques dizaines
       de millisecondes dépend de la charge de la machine (mesuré sous deux lots de bancs en parallèle : 1 à 19 écritures au lieu de 40 ou plus).
       Un essai qui n'a vu passer aucune écriture concurrente ne prouve rien — il n'est donc ni un échec ni un succès : il ne COMPTE pas, on en
       refait un autre, jusqu'à cinq essais VIVANTS. Chaque essai, vivant ou non, doit rendre une copie saine ; le verdict est agrégé pour que
       le nombre de vérifications ne dépende pas du nombre de tentatives. */
    const essais = [];
    for (let tentative = 1; tentative <= 40 && essais.filter(e => e.vivant).length < 5 && !essais.some(e => e.methode !== 'backup' || !e.ecrivain); tentative++) {   // une copie qui n'a pas la bonne méthode, qui ne finit pas, ou qui bloque l'écrivain : inutile d'en refaire
      const x = await sousCharge({ lignes: 60000 });
      try {
        const k = STOCK.ouvrir.copie.controlerFichier(x.vers);
        let d = null;
        try { d = new DatabaseSync(x.vers, { readOnly: true }); } catch (e) { d = null; }   // une copie interminable n'a pas de fichier : l'essai tombe, le banc ne meurt pas
        if (!d) { essais.push({ ecritures: x.ecritures, vivant: x.ecritures >= 5, methode: x.r.methode, ecrivain: x.refusEcrivain === '', saine: false, horloge: false, instantane: false }); continue; }
        try {
          const somme = d.prepare('SELECT COALESCE(SUM(dernier_seq), 0) AS n FROM conversation').get().n, lignes = d.prepare('SELECT COUNT(*) AS n FROM message').get().n;
          const trous = d.prepare('SELECT COUNT(*) AS n FROM conversation c WHERE c.dernier_seq <> (SELECT COALESCE(MAX(seq), 0) FROM message WHERE conv = c.id)').get().n;
          const journal = d.prepare('SELECT COUNT(*) AS n FROM journal').get().n;
          essais.push({
            ecritures: x.ecritures, vivant: x.ecritures >= 5, methode: x.r.methode, ecrivain: x.refusEcrivain === '',
            saine: k.ok === true && k.temoin === true && k.schema === SCHEMA,
            horloge: k.journalMax >= x.avant.journalMax && k.journalMax <= x.apres.journalMax,
            instantane: Number(somme) === Number(lignes) && Number(lignes) >= 300 && Number(trous) === 0 && Number(journal) === k.journalMax && Number(journal) > 60000,
          });
        } catch (e) {
          /* Une copie abandonnée en route laisse un fichier à moitié écrit, que SQLite refuse de lire (« database is locked ») : l'essai tombe, le banc ne meurt pas. */
          essais.push({ ecritures: x.ecritures, vivant: x.ecritures >= 5, methode: x.r.methode, ecrivain: x.refusEcrivain === '', saine: false, horloge: false, instantane: false });
        } finally { d.close(); }
      } finally { x.b.nettoyer(); }
    }
    const vivants = essais.filter(e => e.vivant);
    vrai('⛔ population : ' + vivants.length + ' essais VIVANTS (au moins 5 écritures du service PENDANT la copie ; ' + vivants.map(e => e.ecritures).join(', ') + ') sur ' + essais.length + ' tentative(s) — sinon « cohérent pendant les écritures » ne prouverait rien', vivants.length === 5);
    v('l\'API de sauvegarde de Node est celle qui sert, et chaque copie a réussi (pas de « not an error » : le pas ne se joue pas sur la connexion du service)', essais.filter(e => e.methode !== 'backup').length, 0);
    v('⛔ le service continue d\'ÉCRIRE pendant la copie : aucune écriture refusée (« database is locked » voudrait dire que la sauvegarde empêche les gens d\'envoyer leurs messages)', essais.filter(e => !e.ecrivain).length, 0);
    v('chaque copie est saine (quick_check : ok) et c\'est une base d\'OP MESSAGES (témoin de clé)', essais.filter(e => !e.saine).length, 0);
    v('⛔ l\'horloge du journal de chaque copie tombe ENTRE les deux sondes de la base vivante', essais.filter(e => !e.horloge).length, 0);
    v('⛔ chaque copie est un instantané, pas un mélange de deux états : chaque conversation sait combien de messages elle porte, et le journal en a un par événement', essais.filter(e => !e.instantane).length, 0);
    const { DatabaseSync: DB } = require('node:sqlite');
    const y = await sousCharge({ moteur: { DatabaseSync: DB }, lignes: 2000 });
    try {
      const k = STOCK.ouvrir.copie.controlerFichier(y.vers);
      v('le repli : sans l\'API de sauvegarde (une version de Node qui ne l\'a pas), `VACUUM INTO` rend une copie saine et à jour', [y.r.methode, k.ok, k.journalMax >= y.avant.journalMax], ['vacuum', true, true]);
    } finally { y.b.nettoyer(); }

    /* ⛔ LA CONTRE-ÉPREUVE : ce qu'on ne doit PAS faire — copier le fichier vivant. Le même contrôle doit la refuser (elle perd le journal WAL). */
    const b = O.creerBase();
    try {
      const { a, conv } = O.remplir(b, 300);
      b.S.messageEnvoyer({ conv, auteur: a.id, cid: 'seulement-dans-le-wal', texte: 'la dernière écriture' });
      const avant = b.S.sonde();
      const brute = path.join(b.dossier, 'brute.db');
      fs.copyFileSync(b.chemin, brute);
      const kb = STOCK.ouvrir.copie.controlerFichier(brute);
      vrai('contre-épreuve · une copie BRUTE du fichier vivant (sans son journal WAL) a un journal en retard sur la base vivante (' + (kb.ok ? kb.journalMax : 'illisible') + ' < ' + avant.journalMax + ') — c\'est exactement ce que le module refuse', !kb.ok || kb.journalMax < avant.journalMax);
    } finally { b.nettoyer(); }
  }

  /* ══ 6. LA PASSE : dépôt, relecture, échec compté, archive recalée retirée ═════════════════════════════════════════════════ */
  console.log('\n── 950 · une passe de sauvegarde : l\'archive est relue, et ce qui ne se relit pas est RETIRÉ du coffre ──');
  const monter = async (o = {}) => {
    const coffre = await O.coffreFaux();
    const b = O.creerBase({ moteur: o.moteur });
    const peuple = o.vide ? null : O.remplir(b, o.n === undefined ? 200 : o.n);
    const cle = O.cleHex(), h = { t: 1790000000000 };
    const instance = o.instance || 'beta';
    /* Le coffre a SON horloge (`LastModified`) : par défaut celle du banc, ou celle qu'on donne au module (un banc en temps réel). `o.decalage.ms`
       décale la seule horloge de la MACHINE — c'est ce qu'un saut d'horloge fait, et ce que le coffre, lui, ne subit pas. */
    coffre.horloge = o.horlogeCoffre || o.horloge || (() => h.t);
    if (o.etatInitial) fs.writeFileSync(path.join(b.dataDir, SAUV.NOM_ETAT), JSON.stringify(o.etatInitial));
    const cfg = SAUV.lireConfigSauvegarde(coffre.conf(Object.assign({ cle }, instance === 'beta' ? { intervalleMs: 60000 } : {}, o.conf)), { instance, kek: b.kek });
    const evts = [];
    const sortie = [];
    const sauv = SAUV.creerSauvegarde({
      cfg, instance, dataDir: b.dataDir,
      base: o.base || { instantane: (vers, opts) => b.S.instantane(vers, opts), sonde: () => b.S.sonde() },
      controler: o.controler || controlerIci, horloge: o.horloge || (() => h.t + (o.decalage ? o.decalage.ms : 0)), disqueLibre: o.disqueLibre, disqueMinOctets: o.disqueMinOctets, client: typeof o.client === 'function' ? o.client(coffre) : o.client,
      journaliser: (e, c) => evts.push([e, c]),
    });
    return { coffre, b, h, cfg, cle, sauv, evts, peuple, instance, sortie, fermer: async () => { await sauv.arreter(); await coffre.fermer(); b.nettoyer(); } };
  };
  const cles = (m) => m.coffre.cles(m.cfg.prefixe + 'base/');
  {
    /* ⛔ Régression de la fusion des pièces et de la sauvegarde (gardien, 3 octobre 2026) : la sonde exigeait des lignes `piece`, la copie
       n'en comptait pas — dès la PREMIÈRE pièce, chaque passe tombait en « copie-vide-piece » et plus rien ne partait au coffre. Aucun banc
       ne sauvegardait une base qui porte une pièce. */
    const m = await monter({ n: 60 });
    try {
      const { a, conv } = m.peuple;
      m.b.S.pieceCreer({ id: 'f_' + 'ab'.repeat(16), proprio: a.id, conv, genre: 'fichier', taille: 3, mime: 'application/octet-stream', nom: 'banc.txt', ttlMs: 86400000 });
      vrai('population : la base vivante porte une pièce (la sonde le voit)', m.b.S.sonde().nonVides.piece === true);
      const r = await m.sauv.lancer('banc');
      v('⛔ une base qui porte une PIÈCE se sauvegarde : la passe réussit, l\'archive est au coffre', [r.ok, r.motif, cles(m).length], [true, '', 1]);
      v('   la santé : âge zéro, aucun échec', m.sauv.sante(), { configuree: true, ageH: 0, essaiJours: null, echecs: 0 });
    } finally { await m.fermer(); }
  }
  {
    const m = await monter({ n: 250 });
    try {
      v('avant toute passe : actif, rien au coffre, rien de sain à annoncer', [m.sauv.actif, cles(m).length, m.sauv.sante()], [true, 0, { configuree: true, ageH: null, essaiJours: null, echecs: 0 }]);
      const r = await m.sauv.lancer('banc');
      v('⛔ une passe réussie : ok, base relue, un objet au coffre dont le nom est la date de la passe', [r.ok, r.baseOk, r.motif, cles(m)], [true, true, '', [SAUV.cleBase('beta/', m.h.t)]]);
      vrai('   l\'archive pèse ce que la passe annonce, et la passe sait combien de lignes elle a sauvegardées (' + r.lignes + ') et par quelle méthode (' + r.methode + ')', m.coffre.objets.get(cles(m)[0]).length === r.octets && r.lignes > 500 && r.methode === 'backup');
      v('   le coffre a vu des requêtes SIGNÉES et JUSTES (signature recalculée), au corps vérifié (SHA-256 recalculé) — ni fausse ni sans signature',
        [m.coffre.etat.signaturesFausses, m.coffre.etat.empreintesFausses, m.coffre.etat.sansSignature, m.coffre.vus.length >= 3, m.coffre.vus.every(x => x.sigOk)], [0, 0, 0, true, true]);
      vrai('   le dépôt est un PUT en flux, puis la RELECTURE est un GET du même objet (et la liste sert la rétention)',
        m.coffre.compter('PUT', 'beta/base/') === 1 && m.coffre.compter('GET', 'beta/base/') === 1);
      v('   la santé : configurée, âge zéro, aucun échec', m.sauv.sante(), { configuree: true, ageH: 0, essaiJours: null, echecs: 0 });
      v('   rien ne traîne dans le dossier temporaire (la copie en clair de la base ne reste JAMAIS sur le disque)', fs.readdirSync(path.join(m.b.dataDir, SAUV.NOM_TMP)), []);
      vrai('   l\'état est rangé en 0600 (UMask du service) par fichier temporaire puis renommage', (fs.statSync(path.join(m.b.dataDir, SAUV.NOM_ETAT)).mode & 0o777) === 0o600 && !fs.readdirSync(m.b.dataDir).some(f => /\.tmp$/.test(f)));

      /* La restauration est ÉQUIVALENTE : mêmes lignes, table par table. */
      const brut = m.coffre.objets.get(cles(m)[0]), rendu = path.join(m.b.dossier, 'rendu.db'), arch = path.join(m.b.dossier, 'archive.bin');
      fs.writeFileSync(arch, brut);
      const h = SAUV.lireEntete(arch);
      v('l\'en-tête de l\'archive du coffre dit de quelle instance, à quelle date, de quel schéma', h.meta, { v: 1, instance: 'beta', date: new Date(m.h.t).toISOString(), schema: SCHEMA });
      await SAUV.ouvrirArchive(arch, m.cle.length === 64 ? Buffer.from(m.cle, 'hex') : m.cle, rendu, { instance: 'beta', date: new Date(m.h.t).toISOString() });
      const vivant = empreinteTables(m.b.chemin), restaure = empreinteTables(rendu);
      vrai('population : ' + Object.keys(vivant).length + ' tables comparées, dont ' + vivant.message.split(':')[0] + ' messages', Object.keys(vivant).length >= 15 && Number(vivant.message.split(':')[0]) > 200);
      v('⛔ la base restaurée a EXACTEMENT les mêmes lignes que la base vivante, table par table, colonne par colonne (chiffrés compris)', restaure, vivant);
    } finally { await m.fermer(); }
  }
  {
    /* ⛔ AUCUN CANARI EN CLAIR AU COFFRE — sur la vraie base : le prénom d'une personne est rangé EN CLAIR dans `personne` (seuls les corps le
       sont scellés), c'est donc le canari que la sauvegarde doit cacher. */
    const m = await monter({ n: 120 });
    try {
      const canari = 'CanariPrenomSauvegardeZ7K2';
      m.b.pers(canari);
      const vers = path.join(m.b.dossier, 'clair.db');
      await m.b.S.instantane(vers);
      vrai('population : la base elle-même porte le canari EN CLAIR (sinon « absent de l\'archive » ne prouverait rien)', fs.readFileSync(vers).includes(Buffer.from(canari)));
      const r = await m.sauv.lancer('banc');
      const archive = m.coffre.objets.get(cles(m)[0]);
      v('⛔ l\'archive déposée n\'a ni le canari, ni la signature d\'un fichier SQLite — ni brute, ni après gunzip', [r.ok, O.enClair(archive, [canari])], [true, []]);
      vrai('   et le coffre n\'a reçu NI la clé de sauvegarde, NI la clé maître, NI les clés d\'accès dans un corps (un PUT ne porte que l\'archive chiffrée)',
        [m.cle, m.b.kek.toString('hex'), m.coffre.secretKey].every(s => !archive.includes(Buffer.from(s))));
    } finally { await m.fermer(); }
  }

  /* ══ 7. CE QUI ÉCHOUE — et ce que l'échec doit faire ═══════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · une archive qui ne se relit pas : RETIRÉE du coffre, échec COMPTÉ, reprise à zéro ──');
  {
    const m = await monter({ n: 150 });
    try {
      const cas = [
        ['corrompt-relecture', 'empreinte-differente', 'un OCTET retourné à la relecture (la taille est bonne : seule l\'empreinte peut le voir)'],
        ['tronque-relecture', 'taille-differente', 'une relecture TRONQUÉE'],
        ['absent-relecture', 'relecture-absente', 'un objet déposé puis « introuvable »'],
        ['lecture-refusee', 'relecture-403', 'une lecture REFUSÉE (droits en écriture seule : la sauvegarde partirait tous les jours sans jamais pouvoir être restaurée)'],
      ];
      let compte = 0;
      for (const [panne, motif, nom] of cas) {
        m.coffre.regler(panne); m.h.t += 1000;
        const r = await m.sauv.lancer('banc');
        compte++;
        v('⛔ ' + nom + ' → échec « ' + motif + ' »', [r.ok, r.motif, r.baseOk], [false, motif, false]);
        v('   l\'archive recalée n\'est PAS restée au coffre (la rétention la compterait comme une copie valable)', cles(m), []);
        v('   l\'échec est compté dans la santé, et l\'âge ne bouge pas (aucune sauvegarde réussie)', [m.sauv.sante().echecs, m.sauv.sante().ageH], [compte, null]);
        v('   plus de marqueur de dépôt en attente (l\'archive a été retirée)', m.sauv.etat().depot, null);
      }
      vrai('   et rien ne traîne sur le disque après un échec (la copie en clair de la base est effacée sur TOUS les chemins, pas seulement le succès)', fs.readdirSync(path.join(m.b.dataDir, SAUV.NOM_TMP)).length === 0);
      m.coffre.normal(); m.h.t += 1000;
      const bon = await m.sauv.lancer('banc');
      v('⛔ une passe qui réussit remet les échecs à ZÉRO et rend un âge', [bon.ok, m.sauv.sante().echecs, m.sauv.sante().ageH, cles(m).length], [true, 0, 0, 1]);

      /* Le coffre refuse AUSSI l'effacement : l'archive recalée reste, et la passe le DIT ; la suivante la retire en premier. */
      m.coffre.regler('corrompt-relecture', 'efface-refuse'); m.h.t += 1000;
      const r2 = await m.sauv.lancer('banc');
      v('⛔ si le coffre refuse aussi l\'effacement, l\'archive recalée RESTE — et la passe le dit (retire:false) et garde le marqueur', [r2.ok, r2.retire, cles(m).length, !!m.sauv.etat().depot], [false, false, 2, true]);
      const orpheline = m.sauv.etat().depot.cle;
      m.coffre.normal(); m.h.t += 1000;
      const r3 = await m.sauv.lancer('banc');
      v('⛔ la passe suivante retire d\'abord le dépôt orphelin, puis dépose le sien : il ne reste que des archives relues', [r3.ok, cles(m).includes(orpheline), cles(m).length, m.sauv.etat().depot], [true, false, 2, null]);
    } finally { await m.fermer(); }
  }
  console.log('\n── 950 · le dépôt refusé, l\'instantané défaillant, le disque trop plein : rien ne part, et le motif est DIT ──');
  {
    const m = await monter({ n: 150 });
    try {
      let compte = 0;
      for (const [panne, motif] of [['refus-depot', 'depot-500'], ['refus-depot-403', 'depot-403'], ['coupure-depot', 'depot-0']]) {
        m.coffre.regler(panne); m.h.t += 1000;
        const r = await m.sauv.lancer('banc'); compte++;
        v('⛔ un dépôt qui échoue (' + panne + ') → « ' + motif + ' », rien au coffre, l\'échec compté', [r.ok, r.motif, cles(m).length, m.sauv.sante().echecs], [false, motif, 0, compte]);
      }
      m.coffre.normal();
    } finally { await m.fermer(); }

    /* L'instantané qui ment : chaque cas est une FAUSSE base injectée, et le module doit la refuser AVANT d'envoyer un octet. */
    const faux = async (nom, base, motifs) => {
      const m = await monter({ n: 150, base });
      try {
        const r = await m.sauv.lancer('banc');
        v('⛔ ' + nom + ' → refusé (' + r.motif + '), et RIEN n\'est parti vers le coffre (aucune requête)', [r.ok, motifs.includes(r.motif), m.coffre.vus.length, cles(m).length], [false, true, 0, 0]);
        vrai('   l\'échec est compté', m.sauv.sante().echecs === 1);
      } finally { await m.fermer(); }
    };
    const vive = () => O.creerBase();
    {
      const b0 = vive(); O.remplir(b0, 150);
      await faux('un instantané qui LÈVE', { instantane: async () => { throw new Error('boum'); }, sonde: () => b0.S.sonde() }, ['instantane-echec']);
      await faux('un instantané qui écrit un fichier de ZÉRO octet (le disque s\'est rempli pendant la copie)', { instantane: async (vers) => { fs.writeFileSync(vers, ''); return { methode: 'backup' }; }, sonde: () => b0.S.sonde() }, ['instantane-illisible']);
      await faux('un instantané qui écrit du TEXTE (une copie qui n\'est pas une base)', { instantane: async (vers) => { fs.writeFileSync(vers, 'ceci n\'est pas une base de données'.repeat(100)); return { methode: 'backup' }; }, sonde: () => b0.S.sonde() }, ['instantane-illisible']);
      /* Une base BIEN FORMÉE mais VIDE (neuve), prise pour la copie : l'horloge de son journal est en retard sur la base vivante. */
      await faux('la copie d\'une base NEUVE et vide, bien formée (un mauvais chemin, une base recréée)', { instantane: async (vers) => { const n = O.creerBase(); try { await n.S.instantane(vers); } finally { n.nettoyer(); } return { methode: 'backup' }; }, sonde: () => b0.S.sonde() }, ['copie-horloge']);
      /* Une VIEILLE copie de la même base : elle est saine, mais d'avant ce que le service vient d'écrire. */
      const vieille = path.join(b0.dossier, 'vieille.db');
      await b0.S.instantane(vieille);
      const { a: a0, conv: c0 } = { a: b0.S.personneParIdentifiant('beta:alice'), conv: b0.S.convListe(b0.S.personneParIdentifiant('beta:alice').id)[0].id };
      for (let i = 0; i < 5; i++) b0.S.messageEnvoyer({ conv: c0, auteur: a0.id, cid: 'apres-la-vieille-' + i, texte: 'écrit après la vieille copie' });
      await faux('la copie d\'une base saine mais DATÉE D\'AVANT l\'instant (un instantané rangé ailleurs, rejoué)', { instantane: async (vers) => { fs.copyFileSync(vieille, vers); return { methode: 'backup' }; }, sonde: () => b0.S.sonde() }, ['copie-horloge']);
      /* Le piège le plus sournois : une copie qui a TOUT de juste (schéma, horloge du journal, témoin de clé, quick_check) sauf qu'une table
         pleine a été vidée. Seul le jugement contre la base vivante, sondée juste avant et juste après, la voit. */
      await faux('la copie de la base VIVANTE dont la table des MESSAGES a été vidée (schéma, horloge et témoin de clé sont bons)',
        { instantane: async (vers) => { await b0.S.instantane(vers); const d = new DatabaseSync(vers); d.exec('DELETE FROM reaction; DELETE FROM message;'); d.close(); return { methode: 'backup' }; }, sonde: () => b0.S.sonde() }, ['copie-vide-message']);
      b0.nettoyer();
    }
    const m2 = await monter({ n: 150, disqueLibre: () => 1000 });
    try {
      const r = await m2.sauv.lancer('banc');
      v('⛔ un disque presque plein : la passe n\'est pas tentée (« disque-insuffisant »), rien n\'est copié, rien ne part — ce service ne prive JAMAIS les gens de leurs messages pour se sauvegarder',
        [r.ok, r.motif, m2.coffre.vus.length, fs.readdirSync(path.join(m2.b.dataDir, SAUV.NOM_TMP)).length], [false, 'disque-insuffisant', 0, 0]);
    } finally { await m2.fermer(); }
    const m3 = await monter({ n: 150, disqueLibre: () => { throw new Error('mesure impossible'); } });
    try {
      const r = await m3.sauv.lancer('banc');
      v('   une mesure de disque IMPOSSIBLE ne coupe pas la sauvegarde (on ne se prive pas d\'une copie sur une panne de mesure)', r.ok, true);
    } finally { await m3.fermer(); }

    /* ⛔ LE PLANCHER D'ESPACE DU SERVICE COMPTE AUSSI (gardien, remarque 1) : sous lui, le SERVICE refuse d'écrire (503). La passe ne se lance pas si
       elle le franchirait à elle seule — le précontrôle ne regardait que « 2,5 fois la base + 64 Mio », jamais ce plancher. */
    {
      let libreMs = Infinity;
      const mp = await monter({ n: 150, disqueLibre: () => libreMs, disqueMinOctets: 10 * 1048576 });
      try {
        const poids = ['', '-wal'].reduce((a, sfx) => { try { return a + fs.statSync(mp.b.chemin + sfx).size; } catch (e) { return a; } }, 0);
        const besoin = poids * 2.5 + 64 * 1048576;
        libreMs = besoin + 1048576;                  // assez pour la passe, PAS pour la passe plus le plancher de dix Mio du service
        const refus = await mp.sauv.lancer('banc');
        v('⛔ assez de place pour la passe mais pas pour la passe PLUS le plancher d\'espace du service (10 Mio) : refusée, rien ne part (population : la base pèse ' + Math.round(poids / 1024) + ' Kio)',
          [refus.ok, refus.motif, mp.coffre.vus.length, poids > 100000], [false, 'disque-insuffisant', 0, true]);
        libreMs = besoin + 11 * 1048576;
        mp.h.t += 1000;
        const passe = await mp.sauv.lancer('banc');
        v('   et avec ce qu\'il faut pour les deux, la même passe réussit (contre-épreuve : ce n\'est pas la taille de la base qui refusait)', [passe.ok, cles(mp).length], [true, 1]);
      } finally { await mp.fermer(); }
    }
    /* ⛔ LE PIC DE DISQUE D'UNE PASSE EST DE DEUX FOIS LA BASE, pas trois : on retire chaque fichier dès qu'il ne sert plus (l'instantané une fois
       l'archive faite, l'archive une fois au coffre, la relue une fois rouverte). Mesuré par ce qui est SUR LE DISQUE à chaque étape. */
    {
      let mt; const trace = [];
      const ls = () => fs.readdirSync(path.join(mt.b.dataDir, SAUV.NOM_TMP)).sort();
      const COFFREMOD = require(path.join(SM, 'coffre.js'));
      mt = await monter({
        n: 150,
        client: (cf) => {
          const c = COFFREMOD.client(cf.conf());
          return Object.assign({}, c, {
            poserCleFlux: async (cle, chemin, o, e, t) => { if (/\/base\//.test(cle)) trace.push(['avant-depot', ls()]); return c.poserCleFlux(cle, chemin, o, e, t); },
            lireCleVers: async (cle, sortie, t) => { const r = await c.lireCleVers(cle, sortie, t); if (/\/base\//.test(cle)) trace.push(['apres-relecture', ls()]); return r; },
          });
        },
        controler: async (chemin) => { trace.push(['controle ' + path.basename(chemin), ls()]); return controlerIci(chemin); },
      });
      try {
        const r = await mt.sauv.lancer('banc');
        v('⛔ ce qui est sur le disque à chaque étape : l\'instantané SEUL au premier contrôle, l\'archive SEULE au dépôt, la relue SEULE après la relecture, sa base SEULE au second contrôle',
          [r.ok, trace.map(x => x[0] + ' → ' + x[1].join('+'))], [true, ['controle instantane.db → instantane.db', 'avant-depot → archive.bin', 'apres-relecture → relue.bin', 'controle relue.db → relue.db']]);
      } finally { await mt.fermer(); }
    }

    /* L'archive relue est comptée contre l'instantané : tout le reste identique, UNE ligne de moins → « comptes-differents », retirée du coffre. */
    {
      let appels = 0;
      const m5 = await monter({ n: 150, controler: async (chemin) => {
        const v0 = await controlerIci(chemin); appels++;
        return appels === 2 ? Object.assign({}, v0, { lignes: Object.assign({}, v0.lignes, { message: v0.lignes.message - 1 }), total: v0.total - 1 }) : v0;
      } });
      try {
        const r = await m5.sauv.lancer('banc');
        v('⛔ l\'archive RELUE a une ligne de moins que l\'instantané (tout le reste identique) → « comptes-differents », retirée du coffre, l\'échec compté',
          [appels, r.ok, r.motif, cles(m5).length, m5.sauv.sante().echecs], [2, false, 'comptes-differents', 0, 1]);
      } finally { await m5.fermer(); }
    }

    const m4 = await monter({ n: 150 });
    try {
      m4.coffre.latenceMs = 400;
      const p1 = m4.sauv.lancer('banc'), p2 = m4.sauv.lancer('banc');
      const r2 = await p2;
      v('⛔ deux passes en même temps : la seconde se retire (« deja-en-cours »), la première réussit — jamais deux copies qui s\'écrasent', [r2.ok, r2.motif, (await p1).ok, cles(m4).length], [false, 'deja-en-cours', true, 1]);
    } finally { await m4.fermer(); }
  }

  /* ══ 8. LA RÉTENTION, DE BOUT EN BOUT ═══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · la rétention, de bout en bout : seulement après une archive relue ──');
  {
    const J = 86400000;
    const m = await monter({ n: 100 });
    try {
      m.h.t = Date.UTC(2026, 9, 20, 12, 0, 0);
      const age = (j) => m.h.t - j * J;
      for (const j of [40, 20, 15, 14.5, 10, 3]) m.coffre.poser(SAUV.cleBase('beta/', age(j)), Buffer.from('ancienne archive de ' + j + ' jours'));
      m.coffre.poser('beta/base/notes.txt', Buffer.from('à nous pas'));
      m.coffre.poser('prod/base/' + SAUV.nomDe(age(90)) + '.msgbak', Buffer.from('celle de la production'));
      vrai('la population : 6 archives anciennes + 2 objets étrangers au coffre', m.coffre.cles().length === 8);
      const r = await m.sauv.lancer('banc');
      const restent = m.coffre.cles();
      v('⛔ la passe réussie efface les archives de plus de 14 jours (40, 20, 15, 14,5) — et SEULEMENT elles', [r.ok, r.elaguees], [true, 4]);
      v('   restent : celles de 10 et 3 jours, la nouvelle, et les objets qui ne sont pas à nous (un texte, la production)', restent.length, 5);
      vrai('   la production n\'a pas été touchée par la bêta', restent.includes('prod/base/' + SAUV.nomDe(age(90)) + '.msgbak') && restent.includes('beta/base/notes.txt'));
      vrai('   les trois plus récentes sont gardées quoi qu\'il arrive', restent.includes(SAUV.cleBase('beta/', age(3))) && restent.includes(SAUV.cleBase('beta/', age(10))) && restent.includes(SAUV.cleBase('beta/', m.h.t)));
    } finally { await m.fermer(); }

    /* ⛔ Une archive qui NE SE RELIT PAS ne déclenche JAMAIS la rétention : on n'efface pas une ancienne copie sur la foi d'une nouvelle qu'on n'a pas pu rouvrir. */
    const n = await monter({ n: 100 });
    try {
      n.h.t = Date.UTC(2026, 9, 20, 12, 0, 0);
      for (const j of [40, 30, 20, 3]) n.coffre.poser(SAUV.cleBase('beta/', n.h.t - j * J), Buffer.from('ancienne ' + j));
      n.coffre.regler('corrompt-relecture');
      const r = await n.sauv.lancer('banc');
      v('⛔ une passe dont la relecture échoue n\'efface AUCUNE ancienne copie (les quatre anciennes sont là)', [r.ok, n.coffre.cles('beta/base/').length], [false, 4]);
    } finally { await n.fermer(); }

    /* Une rétention qui ne peut pas tourner (pas le droit de LISTER, ou d'EFFACER) ne retire pas l'archive du jour — mais la passe n'est pas « réussie ». */
    const o = await monter({ n: 100 });
    try {
      o.h.t = Date.UTC(2026, 9, 20, 12, 0, 0);
      for (const j of [40, 30, 20, 3]) o.coffre.poser(SAUV.cleBase('beta/', o.h.t - j * J), Buffer.from('ancienne ' + j));
      o.coffre.regler('liste-refusee');
      const r = await o.sauv.lancer('banc');
      v('⛔ sans le droit de LISTER, la rétention ne peut pas tourner : l\'archive du jour reste (elle est relue), mais la passe est notée en échec (le coffre grossirait sans bruit)',
        [r.ok, r.baseOk, r.motif, o.coffre.cles('beta/base/').length, o.sauv.sante().echecs], [false, true, 'elagage-liste-403', 5, 1]);
      o.coffre.regler('efface-refuse'); o.h.t += 1000;
      const r2 = await o.sauv.lancer('banc');
      vrai('⛔ sans le droit d\'EFFACER, idem : la passe dit ce qu\'elle n\'a pas pu faire (« ' + r2.motif + ' »)', r2.ok === false && r2.baseOk === true && /^elagage-efface-/.test(r2.motif));
    } finally { await o.fermer(); }
  }

  /* ══ 8 bis. L'HORLOGE DE LA MACHINE N'EST PAS CELLE DU COFFRE ══════════════════════════════════════════════════════════════════
     Rejoué par le gardien le 3 octobre 2026 : un saut d'horloge de +20 jours élaguait l'historique (3 archives sur 5), bloquait les sauvegardes
     pendant vingt jours (la dernière « datée » de dans vingt jours) et `ageH` restait à 0 (écrêté) pendant que `echecs` restait à 0 aussi — rien ne
     criait. Le coffre, lui, a sa propre horloge (`LastModified`) : c'est elle qu'on croit. */
  console.log('\n── 950 · un saut d\'horloge vers l\'avant n\'efface pas l\'historique, ne bloque pas les sauvegardes, et se VOIT ──');
  {
    const J = 86400000;
    const dec = { ms: 0 };
    const m = await monter({ n: 60, decalage: dec });
    try {
      m.h.t = Date.UTC(2026, 9, 20, 12, 0, 0);
      let toutesOk = true;
      for (let i = 0; i < 5; i++) { m.h.t += 3600000; const r = await m.sauv.lancer('banc'); toutesOk = toutesOk && r.ok; }
      v('population : cinq archives, une par heure, la machine et le coffre d\'accord — aucune élaguée, aucun échec', [toutesOk, cles(m).length, m.sauv.sante().echecs], [true, 5, 0]);
      dec.ms = 20 * J;                                    // la machine croit être vingt jours plus tard ; le coffre non
      m.h.t += 3600000;
      const r = await m.sauv.lancer('banc');
      v('⛔ UN SAUT D\'HORLOGE de +20 jours : la passe se dit en échec (« horloge-ecart », 20 jours), la base est partie quand même, et RIEN n\'est élagué (avant : trois archives sur six effacées d\'un coup)',
        [r.ok, r.baseOk, r.motif, r.ecartHorlogeJ, r.elaguees, cles(m).length], [false, true, 'horloge-ecart', 20, undefined, 6]);
      v('   /health le dit : un échec compté', m.sauv.sante().echecs, 1);
      dec.ms = 0;                                         // l'horloge se recale
      m.h.t += 3600000;
      v('⛔ l\'horloge revenue à l\'heure, une sauvegarde est DUE tout de suite (avant : la dernière « datée » de dans vingt jours, `due` faux pendant vingt jours — plus aucune sauvegarde)', m.sauv.due(), true);
      const apres = await m.sauv.lancer('banc');
      v('   elle part, réussit, et remet les échecs à zéro ; la rétention, voyant une archive « du futur », ne touche à rien', [apres.ok, m.sauv.sante().echecs, m.sauv.sante().ageH, cles(m).length], [true, 0, 0, 7]);
    } finally { await m.fermer(); }

    /* Un état laissé par une horloge en avance : la dernière réussite est « dans le futur ». L'âge est NÉGATIF — il ne s'écrête plus à 0. */
    const FUT = 1790000000000 + 20 * J;
    const ligneFuture = { ts: FUT, ms: 5, ok: true, baseOk: true, motif: '', raison: 'banc' };
    const f = await monter({ n: 60, etatInitial: { v: 1, derniere: ligneFuture, dernierSucces: ligneFuture, baseTs: FUT, echecs: 0, histo: [ligneFuture], depot: null, pieces: { absentes: {} } } });
    try {
      v('⛔ la dernière réussite est datée de dans vingt jours : l\'âge est NÉGATIF (-480 h), pas écrêté à 0 qui ferait croire à une sauvegarde toute fraîche', f.sauv.sante().ageH, -480);
      v('   et une sauvegarde est due tout de suite', f.sauv.due(), true);
      const r = await f.sauv.lancer('banc');
      v('   elle part, et l\'âge redevient 0', [r.ok, f.sauv.sante().ageH], [true, 0]);
    } finally { await f.fermer(); }
    /* Et un ÉCHEC daté du futur : le délai de reprise se comptait depuis cette date — négatif, donc jamais écoulé. */
    const echecFutur = { ts: FUT, ms: 5, ok: false, baseOk: false, motif: 'depot-500', raison: 'banc' };
    const g = await monter({ n: 60, etatInitial: { v: 1, derniere: echecFutur, dernierSucces: null, baseTs: null, echecs: 1, histo: [echecFutur], depot: null, pieces: { absentes: {} } } });
    try {
      v('⛔ un échec daté de dans vingt jours ne retient pas la reprise : une sauvegarde est due tout de suite', g.sauv.due(), true);
    } finally { await g.fermer(); }
  }

  /* ══ 9. LE RYTHME, LA MINUTERIE, L'ARRÊT, L'ÉTAT ════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · le rythme (une base toutes les heures), la minuterie, l\'arrêt sans fausse alerte, l\'état qui survit ──');
  {
    const m = await monter({ n: 100, conf: { intervalleMs: 3600000 } });
    try {
      v('jamais sauvegardé : la passe est due', m.sauv.due(), true);
      await m.sauv.lancer('banc');
      v('juste après un succès : pas due', m.sauv.due(), false);
      m.h.t += 3599000; v('59 min 59 s plus tard : pas due', m.sauv.due(), false);
      m.h.t += 1500; v('une heure plus tard : due', m.sauv.due(), true);
      m.coffre.regler('refus-depot'); await m.sauv.lancer('banc');
      v('⛔ après un échec de la BASE : pas avant 10 minutes (une panne du coffre ne remplit pas le journal et ne martèle pas l\'hébergeur)', m.sauv.due(), false);
      m.h.t += 599000; v('   9 min 59 s : pas encore', m.sauv.due(), false);
      m.h.t += 2000; v('   dix minutes passées : de nouveau due', m.sauv.due(), true);
      m.coffre.normal();
      await m.sauv.lancer('banc');
      m.h.t += 1000;
      v('   et reçue : le rythme repart de cette archive', m.sauv.due(), false);
    } finally { await m.fermer(); }

    /* L'ÉTAT SURVIT à un redémarrage : un second module sur le même dossier connaît la dernière passe, ses échecs, son rythme. */
    const e = await monter({ n: 100, conf: { intervalleMs: 3600000 } });
    try {
      await e.sauv.lancer('banc');
      e.coffre.regler('refus-depot'); e.h.t += 1000; await e.sauv.lancer('banc'); e.coffre.normal();
      const avant = e.sauv.sante();
      const deux = SAUV.creerSauvegarde({ cfg: e.cfg, instance: 'beta', dataDir: e.b.dataDir, base: { instantane: (x) => e.b.S.instantane(x), sonde: () => e.b.S.sonde() }, controler: controlerIci, horloge: () => e.h.t });
      v('⛔ un redémarrage ne perd pas la mémoire : même santé (âge, échecs), et le rythme tient compte de la dernière archive relue', [deux.sante(), deux.due()], [avant, false]);
      fs.writeFileSync(path.join(e.b.dataDir, SAUV.NOM_ETAT), '{ ceci n\'est pas du json');
      const trois = SAUV.creerSauvegarde({ cfg: e.cfg, instance: 'beta', dataDir: e.b.dataDir, base: { instantane: (x) => e.b.S.instantane(x), sonde: () => e.b.S.sonde() }, controler: controlerIci, horloge: () => e.h.t });
      v('un état illisible ne fait rien tomber : on repart de zéro, la passe est due', [trois.sante(), trois.due()], [{ configuree: true, ageH: null, essaiJours: null, echecs: 0 }, true]);
      fs.writeFileSync(path.join(e.b.dataDir, SAUV.NOM_ETAT), JSON.stringify({ v: 1, echecs: -4, baseTs: 'hier', pieces: 'x', histo: 'y' }));
      const quatre = SAUV.creerSauvegarde({ cfg: e.cfg, instance: 'beta', dataDir: e.b.dataDir, base: { instantane: (x) => e.b.S.instantane(x), sonde: () => e.b.S.sonde() }, controler: controlerIci, horloge: () => e.h.t });
      vrai('   et un état aux types fantaisistes (échecs négatifs, date en texte) est assaini, pas obéi', quatre.sante().echecs === 0 && typeof quatre.due() === 'boolean');
    } finally { await e.fermer(); }

    /* La MINUTERIE : des passes qui partent toutes seules, et qui s'arrêtent quand on les arrête. */
    const t = await monter({ n: 100, horloge: Date.now, conf: { intervalleMs: 400 } });
    try {
      t.sauv.demarrer();
      const deuxArchives = await new Promise((res) => { const debut = Date.now(); const iv = setInterval(() => { if (cles(t).length >= 2 || Date.now() - debut > 15000) { clearInterval(iv); res(cles(t).length); } }, 50); });
      vrai('⛔ la minuterie lance des passes TOUTE SEULE, à son rythme (' + deuxArchives + ' archives au coffre, sans que personne n\'ait appelé `lancer`)', deuxArchives >= 2);
      await t.sauv.arreter();
      const figé = cles(t).length;
      await dormir(1300);
      v('   et après `arreter()` plus rien ne part (un service qui s\'arrête ne laisse pas une passe fantôme)', cles(t).length, figé);
      v('   une passe demandée à un module arrêté se retire', (await t.sauv.lancer('banc')).motif, 'arret');
    } finally { await t.fermer(); }

    /* ⛔ ARRÊTER LE SERVICE PENDANT UNE PASSE (chaque déploiement) : ce n'est pas un échec, et le dépôt à moitié fait se nettoie à la passe suivante. */
    const a = await monter({ n: 100 });
    try {
      a.coffre.latenceMs = 600;
      const passe = a.sauv.lancer('banc');
      /* Au GESTE, pas au chronomètre : on arrête quand le coffre a REÇU le dépôt (la réponse, elle, tarde 600 ms) — « 200 ms » tombait avant
         le dépôt sur une machine chargée, et le marqueur de dépôt n'existait pas encore. */
      for (const debutAttente = Date.now(); !a.coffre.vus.some(x => x.m === 'PUT') && Date.now() - debutAttente < 15000;) await dormir(10);
      vrai('population : le coffre a reçu le dépôt avant l\'arrêt (sans lui, « arrêter pendant l\'envoi » ne prouverait rien)', a.coffre.vus.some(x => x.m === 'PUT'));
      const t0 = Date.now();
      await a.sauv.arreter();
      const r = await passe;
      vrai('⛔ arrêter pendant l\'envoi : `arreter()` rend la main en moins de 2,5 s (le service n\'a que cinq secondes) — ' + (Date.now() - t0) + ' ms', Date.now() - t0 < 2500);
      v('   la passe se retire en disant « arret », SANS être comptée comme un échec (sinon la surveillance crierait à chaque mise en ligne)', [r.ok, r.motif, a.sauv.sante().echecs], [false, 'arret', 0]);
      vrai('   mais l\'objet envoyé n\'a pas été relu : le marqueur de dépôt est rangé dans l\'état', !!a.sauv.etat().depot && a.sauv.etat().depot.cle === SAUV.cleBase('beta/', a.h.t));
      const orpheline = a.sauv.etat().depot.cle;
      vrai('   et il est bien au coffre (c\'est lui, l\'orphelin)', a.coffre.cles().includes(orpheline));
      a.coffre.latenceMs = 0;
      const suite = SAUV.creerSauvegarde({ cfg: a.cfg, instance: 'beta', dataDir: a.b.dataDir, base: { instantane: (x) => a.b.S.instantane(x), sonde: () => a.b.S.sonde() }, controler: controlerIci, horloge: () => a.h.t + 5000 });
      const r2 = await suite.lancer('redemarrage');
      v('⛔ au redémarrage, la première passe retire d\'abord l\'archive jamais relue, puis dépose la sienne', [r2.ok, a.coffre.cles().includes(orpheline), a.coffre.cles().length], [true, false, 1]);
      await suite.arreter();
    } finally { await a.fermer(); }
  }

  /* ══ 10. INERTE ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · sans configuration, le module est INERTE : aucun réseau, aucun fichier, aucune minuterie ──');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-inerte-'));
    try {
      const inerte = SAUV.creerSauvegarde({ cfg: null, instance: 'beta', dataDir: bac, base: { instantane: async () => { throw new Error('ne doit pas être appelé'); }, sonde: () => { throw new Error('ne doit pas être appelé'); } } });
      v('inactif, et la passe se retire sans rien tenter', [inerte.actif, await inerte.lancer('banc')], [false, { ok: false, motif: 'inactive' }]);
      v('⛔ la santé dit « jamais branchée » (un CHOIX, pas une panne) : configurée:false, des zéros et des null', inerte.sante(), { configuree: false, ageH: null, essaiJours: null, echecs: 0 });
      inerte.demarrer(); await inerte.arreter();
      v('   ni état, ni dossier temporaire n\'ont été créés (un banc, une installation neuve, le serveur d\'un développeur ne touchent à rien)', fs.readdirSync(bac), []);
      v('   `due` est faux : rien n\'est jamais dû', inerte.due(), false);
    } finally { fs.rmSync(bac, { recursive: true, force: true }); }
  }

  /* ══ 11. LES PIÈCES ═══════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · les pièces : un miroir INCRÉMENTAL (un second passage n\'envoie rien) qui ne vide jamais le coffre ──');
  {
    const m = await monter({ n: 100 });
    try {
      const racine = path.join(m.b.dataDir, 'pieces');
      const ecrire = (rel, buf) => { const p = path.join(racine, ...rel.split('/')); fs.mkdirSync(path.dirname(p), { recursive: true }); fs.writeFileSync(p, buf); return p; };
      const efface = (rel) => fs.rmSync(path.join(racine, ...rel.split('/')), { force: true });
      const passe = async () => { m.h.t += 1000; return m.sauv.lancer('banc'); };
      const pre = 'beta/pieces/';

      const r0 = await passe();
      v('sans dossier `pieces/` (l\'étape 4 n\'est pas là) : rien ne casse, et le coffre n\'est même pas interrogé pour des pièces', [r0.ok, r0.pieces, m.coffre.listes(pre)], [true, undefined, 0]);

      /* Douze pièces scellées (du hasard), sur trois dossiers, une plus profonde ; et des fichiers qui ne sont PAS des pièces. */
      const pieces = {};
      for (let i = 0; i < 12; i++) { const rel = relPiece(['ab', 'cd', 'ef'][i % 3], 'p' + i); pieces[rel] = crypto.randomBytes(500 + i * 37); ecrire(rel, pieces[rel]); }
      ecrire(relPiece('ab', 'vide'), Buffer.alloc(0)); ecrire('ab/.cache', Buffer.from('x')); ecrire('cd/f_en_cours.tmp', Buffer.from('x'));
      const profonde = 'aa/bb/' + idPiece('aa', 'profonde'); ecrire(profonde, crypto.randomBytes(300));
      const enCours = 'tmp/' + crypto.randomBytes(12).toString('hex'); ecrire(enCours, crypto.randomBytes(400));   // ⛔ un dépôt EN COURS du service : ce n'est pas une pièce
      const lienRel = relPiece('ef', 'lien'); fs.symlinkSync('/etc/hostname', path.join(racine, ...lienRel.split('/')));
      const malRange = 'cd/' + idPiece('ab', 'malrange'); ecrire(malRange, crypto.randomBytes(250));   // un nom de pièce, mais pas dans SON dossier : le service ne la trouverait jamais
      const N = Object.keys(pieces).length;
      vrai('la population : ' + N + ' pièces, plus une pièce vide, un fichier caché, un `.tmp`, un lien symbolique, un fichier trop profond, un nom de pièce rangé dans le MAUVAIS dossier et un DÉPÔT EN COURS (`tmp/…`) — tous présents sur le disque', N === 12 && [enCours, profonde, malRange, 'ab/.cache', 'cd/f_en_cours.tmp'].every(r => fs.existsSync(path.join(racine, ...r.split('/')))) && fs.lstatSync(path.join(racine, ...lienRel.split('/'))).isSymbolicLink());
      const vuLocal = {};
      const lp = await SAUV.parcourirPieces(racine, vuLocal);
      v('parcourirPieces : à plat, trié, avec des « / », rien que des pièces (la vide comprise) — ni le caché, ni le `.tmp`, ni le lien (qu\'il ne suit pas), ni le trop profond, ni le mal rangé, ni le dépôt en cours', [lp.length, lp.every(x => !x.rel.includes('\\')), lp.map(x => x.rel).sort().join() === lp.map(x => x.rel).join(), lp.every(x => SAUV.pieceRelOk(x.rel))], [13, true, true, true]);
      v('   et ce qu\'il laisse se COMPTE (six : le caché, le `.tmp`, le lien, « aa/bb », le mal rangé, le dossier `tmp`) — une absence se compte, elle ne se suppose pas', vuLocal.ignorees, 6);
      const n0 = m.coffre.vus.length;
      const r1 = await passe();
      const ordre = m.coffre.vus.slice(n0).filter(x => x.m === 'PUT').map(x => /\/pieces\//.test(x.cle) ? 'piece' : /\/base\//.test(x.cle) ? 'base' : '?');
      v('⛔ les pièces partent AVANT l\'archive de base (population : ' + ordre.filter(x => x === 'piece').length + ' dépôts de pièces, ' + ordre.filter(x => x === 'base').length + ' de base) — une archive posée sans ses pièces se restaure en photos qui ne s\'ouvrent pas',
        [ordre.indexOf('base') === ordre.length - 1, ordre.filter(x => x === 'piece').length, ordre.filter(x => x === 'base').length, ordre.includes('?')], [true, N, 1, false]);
      v('⛔ la première passe envoie les ' + N + ' pièces (et seulement elles : la pièce vide est comptée à part)', [r1.ok, r1.pieces.envoyees, r1.pieces.dejaLa, r1.pieces.vides], [true, N, 0, 1]);
      v('   chacune est au coffre, OCTET POUR OCTET, sous <préfixe>pieces/<chemin relatif>', Object.keys(pieces).every(rel => m.coffre.objets.has(pre + rel) && m.coffre.objets.get(pre + rel).equals(pieces[rel])), true);
      v('   rien d\'autre : ni le fichier caché, ni le `.tmp`, ni le lien, ni la pièce vide, ni le fichier trop profond, ni le mal rangé', m.coffre.cles(pre).length, N);
      v('⛔ ET AUCUN DÉPÔT EN COURS (`tmp/…`) : il est sur le disque du service, il n\'est PAS au coffre (il y restait, puis REVENAIT à la restauration)', [fs.existsSync(path.join(racine, ...enCours.split('/'))), m.coffre.cles(pre).filter(c => /\/tmp\//.test(c))], [true, []]);
      v('   et la passe dit ce qu\'elle a laissé (six entrées ignorées)', r1.pieces.ignorees, 6);
      v('   chaque pièce est RELUE après son dépôt (autant de lectures que de dépôts)', [m.coffre.compter('PUT', pre), m.coffre.compter('GET', pre)], [N, N]);

      const r2 = await passe();
      v('⛔ un SECOND passage n\'envoie RIEN : elles sont immuables, ce qui est au coffre ne repart pas (ni dépôt, ni relecture)', [r2.ok, r2.pieces.envoyees, r2.pieces.dejaLa, m.coffre.compter('PUT', pre), m.coffre.compter('GET', pre)], [true, 0, N, N, N]);

      const neuve = relPiece('ab', 'neuve'); ecrire(neuve, crypto.randomBytes(777));
      const r3 = await passe();
      v('une pièce nouvelle : UN dépôt de plus, pas treize', [r3.pieces.envoyees, m.coffre.compter('PUT', pre)], [1, N + 1]);
      const [premiere] = Object.keys(pieces);
      const autre = crypto.randomBytes(999); ecrire(premiere, autre);
      const r4 = await passe();
      v('   une pièce dont la TAILLE a changé (abîmée, remplacée) est renvoyée — le coffre garde ce qui est ici', [r4.pieces.envoyees, m.coffre.objets.get(pre + premiere).equals(autre)], [1, true]);

      /* ⛔ LA COPIE MIROIR EFFACE — donc deux passes de suite, jamais une. */
      const victime = Object.keys(pieces)[2];
      efface(victime);
      const r5 = await passe();
      v('⛔ une pièce disparue d\'ici n\'est PAS retirée du coffre à la première passe (une panne de disque, un montage raté, ressemblent à ça)', [r5.pieces.retirees, m.coffre.objets.has(pre + victime)], [0, true]);
      const r6 = await passe();
      v('   elle l\'est à la SECONDE, et les autres ne bougent pas', [r6.pieces.retirees, m.coffre.objets.has(pre + victime), m.coffre.cles(pre).length, m.coffre.compter('DELETE', pre)], [1, false, N, 1]);
      /* ⛔ LE MIROIR N'EFFACE QU'APRÈS LA BASE RELUE. Une pièce supprimée depuis la dernière archive saine est encore réclamée par elle : la retirer du coffre
         alors que la nouvelle archive n'est pas posée la rendrait irrécupérable pour la seule copie qui la porte. La base refusée → rien n'est effacé. */
      const victime2 = Object.keys(pieces)[3];
      efface(victime2);
      const rv1 = await passe();                                   // première absence : observée
      m.coffre.regler('refus-depot-base');
      const rv2 = await passe();                                   // seconde absence : due — mais la base n'est pas partie
      m.coffre.normal();
      v('⛔ la pièce absente DEUX fois reste au coffre tant que l\'archive de base de cette passe n\'est pas posée (le dépôt de base est refusé)', [rv2.ok, rv2.baseOk, m.coffre.objets.has(pre + victime2)], [false, false, true]);
      const rv3 = await passe();
      v('   la passe suivante, la base posée, la retire (une pièce supprimée finit par quitter le coffre)', [rv3.ok, rv3.pieces.retirees, m.coffre.objets.has(pre + victime2)], [true, 1, false]);
      void rv1;
      const revenante = Object.keys(pieces)[4], contenu = pieces[revenante];
      efface(revenante); await passe(); ecrire(revenante, contenu); await passe(); efface(revenante); const r7 = await passe();
      v('⛔ une pièce qui REVIENT entre deux passes remet le compte à zéro (« absente deux fois de suite », pas « absente deux fois »)', [r7.pieces.retirees, m.coffre.objets.has(pre + revenante)], [0, true]);

      /* Le dossier VIDE, alors que le coffre en porte : un disque monté de travers. Trois passes, rien de retiré. */
      for (const rel of Object.keys(pieces)) efface(rel); efface(neuve);
      const avant = m.coffre.cles(pre).length;
      let retirees = 0; for (let i = 0; i < 3; i++) retirees += (await passe()).pieces.retirees;
      v('⛔ le dossier des pièces est VIDE alors que le coffre en porte ' + avant + ' : trois passes, AUCUNE pièce retirée (un montage raté ressemble à ça)', [retirees, m.coffre.cles(pre).length], [0, avant]);
      fs.rmSync(racine, { recursive: true, force: true });
      for (let i = 0; i < 2; i++) await passe();
      v('   et le dossier ABSENT : rien non plus', m.coffre.cles(pre).length, avant);
    } finally { await m.fermer(); }

    /* ⛔ LA FORME QUE LE MIROIR ATTEND EST CELLE QUE `pieces.js` ÉCRIT VRAIMENT — les deux sont écrites à la main, chacune juste, et si l'une change l'autre
       cesse de voir les pièces (un miroir qui ne voit plus rien envoie ZÉRO pièce, sans une erreur). On joue donc le VRAI module des pièces : des dépôts
       terminés, et un dépôt EN COURS laissé ouvert dans `tmp/`. */
    {
      const PIECES = require(path.join(SM, 'pieces.js'));
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-forme-'));
      try {
        const P = PIECES.creerPieces({ dossier: d, cle: () => Buffer.alloc(32, 7) });
        const finis = [];
        for (let i = 0; i < 4; i++) { const id = 'f_' + crypto.randomBytes(16).toString('hex'); const w = await P.ouvrirEcriture(id); await w.ajouter(crypto.randomBytes(700 + i)); await w.finir(); finis.push(id); }
        const ouvert = await P.ouvrirEcriture('f_' + crypto.randomBytes(16).toString('hex')); await ouvert.ajouter(crypto.randomBytes(500));
        const dansTmp = fs.existsSync(path.join(d, 'tmp')) ? fs.readdirSync(path.join(d, 'tmp')).length : 0;
        const vus = await SAUV.parcourirPieces(d);
        v('⛔ le miroir voit EXACTEMENT les pièces que le vrai module des pièces a terminées — et pas le dépôt en cours qu\'il laisse dans `tmp/` (population : ' + dansTmp + ' fichier en cours)',
          [dansTmp, vus.map(x => x.rel.split('/')[1]).sort(), vus.every(x => x.rel === path.relative(d, P.chemin(x.rel.split('/')[1])).split(path.sep).join('/'))], [1, finis.slice().sort(), true]);
        await ouvert.abandonner();
      } finally { fs.rmSync(d, { recursive: true, force: true }); }
    }

    /* La garde de proportion : un défaut de logique qui ferait croire que TOUT a disparu s'arrête là, et le DIT. */
    for (const [vieilles, attendu, nom] of [[150, true, '150 pièces en trop (sous le plancher de 200) : retirées à la seconde passe'], [1000, false, '1 000 pièces en trop sur 1 100 : REFUSÉ (« pieces-suppression-massive »), le coffre reste intact']]) {
      const g = await monter({ n: 60 });
      try {
        const racine = path.join(g.b.dataDir, 'pieces'); fs.mkdirSync(path.join(racine, 'ab'), { recursive: true });
        for (let i = 0; i < 100; i++) fs.writeFileSync(path.join(racine, 'ab', idPiece('ab', 'g' + i)), crypto.randomBytes(64));
        for (let i = 0; i < vieilles; i++) g.coffre.poser('beta/pieces/zz/vieille_' + i, Buffer.from('v' + i));
        g.h.t += 1000; const p1 = await g.sauv.lancer('banc');
        g.h.t += 1000; const p2 = await g.sauv.lancer('banc');
        const reste = g.coffre.cles('beta/pieces/zz/').length;
        if (attendu) v('⛔ ' + nom, [p2.ok, p2.pieces.retirees, reste], [true, vieilles, 0]);
        else v('⛔ ' + nom, [p1.ok, p2.ok, p2.motif, p2.baseOk, reste], [true, false, 'pieces-suppression-massive', true, vieilles]);
      } finally { await g.fermer(); }
    }

    /* Un dépôt de pièce refusé, une pièce abîmée à la relecture : la sauvegarde est INCOMPLÈTE, et ça se dit — sans jeter l'archive de la base. */
    const q = await monter({ n: 60 });
    try {
      const racine = path.join(q.b.dataDir, 'pieces'); fs.mkdirSync(path.join(racine, 'ab'), { recursive: true });
      for (let i = 0; i < 4; i++) fs.writeFileSync(path.join(racine, 'ab', idPiece('ab', 'q' + i)), crypto.randomBytes(200));
      q.coffre.regler('refus-depot-pieces');
      const r = await q.sauv.lancer('banc');
      v('⛔ des pièces qui ne partent pas : la passe est en ÉCHEC (« pieces-envoi-4 »), mais l\'archive de la BASE, relue, reste au coffre', [r.ok, r.baseOk, r.motif, cles(q).length, q.coffre.cles('beta/pieces/').length], [false, true, 'pieces-envoi-4', 1, 0]);
      v('   la santé le dit (un échec, pas d\'âge) et le rythme de la base ne s\'emballe pas : pas de nouvelle base avant l\'heure (sinon six archives à l\'heure)', [q.sauv.sante().echecs, q.sauv.sante().ageH, q.sauv.due()], [1, null, false]);
      q.coffre.regler('corrompt-pieces'); q.h.t += 1000;
      const r2 = await q.sauv.lancer('banc');
      v('⛔ une pièce abîmée À LA RELECTURE est retirée du coffre (comme l\'archive de base) et comptée', [r2.ok, r2.motif, q.coffre.cles('beta/pieces/').length], [false, 'pieces-envoi-4', 0]);
      q.coffre.normal(); q.h.t += 1000;
      const r3 = await q.sauv.lancer('banc');
      v('   le coffre rétabli, tout part, et les échecs retombent à zéro', [r3.ok, r3.pieces.envoyees, q.sauv.sante().echecs], [true, 4, 0]);
    } finally { await q.fermer(); }

    /* Le budget d'une passe : cinq pièces par passe, le reste suit — sans échec. */
    const w = await monter({ n: 60, conf: { piecesParPasse: 5 } });
    try {
      const racine = path.join(w.b.dataDir, 'pieces'); fs.mkdirSync(path.join(racine, 'ab'), { recursive: true });
      for (let i = 0; i < 12; i++) fs.writeFileSync(path.join(racine, 'ab', idPiece('ab', 'w' + i)), crypto.randomBytes(100));
      const suite = [], sante = [];
      for (let i = 0; i < 4; i++) { w.h.t += 1000; const r = await w.sauv.lancer('banc'); suite.push([r.ok, r.pieces.envoyees, r.pieces.restantes, r.motif, r.baseOk]); sante.push([w.sauv.sante().echecs, w.sauv.sante().ageH]); }
      v('⛔ un budget de cinq pièces par passe : 5, 5, 2, 0 — les restantes se comptent, et TANT QU\'IL EN RESTE la passe n\'est PAS réussie (« pieces-arriere-N »), même si la base, elle, est partie', suite,
        [[false, 5, 7, 'pieces-arriere-7', true], [false, 5, 2, 'pieces-arriere-2', true], [true, 2, 0, '', true], [true, 0, 0, '', true]]);
      v('⛔ et /health ne dit pas « tout va bien » pendant l\'arriéré : les échecs montent (1, 2), l\'âge reste inconnu tant qu\'aucune passe n\'a été COMPLÈTE, puis tout retombe à zéro', sante, [[1, null], [2, null], [0, 0], [0, 0]]);
    } finally { await w.fermer(); }
  }

  /* ══ 12. LA SANTÉ ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · /health : des nombres et un booléen, jamais un nom de bucket, un chemin ou un motif ──');
  {
    const m = await monter({ n: 100 });
    try {
      await m.sauv.lancer('banc');
      const s = m.sauv.sante(), txt = JSON.stringify(s);
      v('exactement quatre champs : configuree, ageH, essaiJours, echecs (chacun est lu par la surveillance, ou nommé)', Object.keys(s).sort(), ['ageH', 'configuree', 'echecs', 'essaiJours']);
      v('   des nombres, un booléen, ou null — jamais un texte', Object.values(s).every(x => x === null || typeof x === 'number' || typeof x === 'boolean'), true);
      vrai('⛔ rien ne permet de deviner le coffre : ni le nom du bucket, ni l\'adresse, ni un chemin, ni la clé d\'accès, ni le préfixe', ![m.coffre.bucket, m.coffre.base, '127.0.0.1', m.coffre.accessKey, 'beta/', '/'].some(x => txt.includes(x)));
      m.h.t += 3 * 3600000 + 5 * 60000;
      v('l\'âge se compte en heures, avec une décimale (3 h 05 → 3,1)', m.sauv.sante().ageH, 3.1);
      const essai = path.join(m.b.dataDir, SAUV.NOM_ESSAI);
      v('essaiJours : jamais d\'exercice → null', m.sauv.sante().essaiJours, null);
      fs.writeFileSync(essai, JSON.stringify({ v: 1, okTs: m.h.t - 3 * 86400000 - 1000 }));
      v('   un exercice réussi il y a 3 jours et quelques secondes → 3', m.sauv.sante().essaiJours, 3);
      fs.writeFileSync(essai, JSON.stringify({ v: 1, okTs: m.h.t - 34.9 * 86400000 }));
      v('   34,9 jours → 34 (le jour entier révolu)', m.sauv.sante().essaiJours, 34);
      fs.writeFileSync(essai, JSON.stringify({ v: 1, okTs: m.h.t + 5 * 86400000 }));
      v('   une date dans le futur (horloge qui a sauté) → 0, jamais un nombre négatif', m.sauv.sante().essaiJours, 0);
      fs.writeFileSync(essai, JSON.stringify({ v: 1, echecTs: m.h.t, echecMotif: 'x' }));
      v('⛔ un exercice RATÉ n\'est pas un exercice réussi : seul `okTs` compte → null', m.sauv.sante().essaiJours, null);
      fs.writeFileSync(essai, '{ pas du json');
      v('   un fichier illisible → null, sans lever', m.sauv.sante().essaiJours, null);
      fs.rmSync(essai);
    } finally { await m.fermer(); }
  }

  /* ══ 13. LE REJEU DE LA TABLE `purge` ET L'OUTIL DE RESTAURATION ═════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · le registre des purges est REJOUÉ sur une copie restaurée : un message effacé depuis ne REVIENT pas ──');
  const m = await monter({ n: 80 });
  const ids = {};
  const pieceRel = relPiece('ab', 'purgee');
  try {
    const { a, c } = m.peuple;
    const E = m.b.S.convCreerGroupe({ createur: a.id, nom: 'Éphémère', membres: [c.id], ephemere_s: 600 }).id;
    const M1 = m.b.S.messageEnvoyer({ conv: E, auteur: a.id, cid: 'e1', texte: 'premier éphémère' });
    const M2 = m.b.S.messageEnvoyer({ conv: E, auteur: c.id, cid: 'e2', texte: 'second éphémère' });
    m.b.S.messageReagir({ conv: E, seq: M1.seq, uid: c.id, emoji: '👍' });
    m.b.h.t += 700000;
    const M3 = m.b.S.messageEnvoyer({ conv: E, auteur: a.id, cid: 'e3', texte: 'troisième, encore vivant' });
    Object.assign(ids, { M1: M1.id, M2: M2.id, M3: M3.id, E, seq1: M1.seq });
    /* Une pièce, pour qu'elle soit au coffre dans l'archive A (et purgée ensuite). */
    const racinePieces = path.join(m.b.dataDir, 'pieces');
    fs.mkdirSync(path.join(racinePieces, 'ab'), { recursive: true });
    fs.writeFileSync(path.join(racinePieces, ...pieceRel.split('/')), crypto.randomBytes(321));
    fs.writeFileSync(path.join(racinePieces, ...relPiece('ab', 'gardee').split('/')), crypto.randomBytes(222));
    /* Les LIGNES que la base réclame : la gardée (fichier au coffre), la purgée (le registre l'emportera), et une FANTÔME dont le fichier n'a jamais
       existé nulle part — ce que laisse un arriéré d'envoi, un échec isolé, une pièce supprimée entre l'instantané et l'envoi. */
    for (const tag of ['purgee', 'gardee', 'fantome']) m.b.S.pieceCreer({ id: idPiece('ab', tag), proprio: a.id, conv: m.peuple.conv, genre: 'fichier', taille: 10, mime: 'application/octet-stream', ttlMs: 30 * 86400000 });
    /* Deux sessions OUVERTES au moment de l'archive : la restauration doit les vider (un cookie d'avant ne revient pas). */
    m.b.S.sessionAjouter({ h: 'session-banc-a', personne: a.id, appareil: 'ordinateur', ttlMs: 30 * 86400000 }); m.b.S.sessionAjouter({ h: 'session-banc-c', personne: c.id, appareil: 'telephone', ttlMs: 30 * 86400000 });

    m.h.t = Date.UTC(2026, 8, 21, 6, 0, 0);
    const T0 = m.h.t;
    const rA = await m.sauv.lancer('banc');                       // L'ARCHIVE A : M1 et M2 ont expiré, mais le balayeur n'est pas encore passé
    const cleA = rA.cle;
    const purge = m.b.S.purgerExpires(500);
    m.h.t += 3600000;
    const rB = await m.sauv.lancer('banc');                       // L'ARCHIVE B : le registre porte les deux purges
    const cleB = rB.cle;
    vrai('la population : deux archives au coffre (A avant la purge, B après), ' + purge.n + ' messages purgés entre les deux (les deux éphémères et le message système de la conversation, éphémère comme elle)', rA.ok && rB.ok && purge.n === 3 && cles(m).length === 2);
    /* L'archive C : une pièce a été purgée depuis (son fichier est parti d'ici, le registre le dit) — mais le coffre la porte encore (deux passes avant de retirer). */
    fs.rmSync(path.join(racinePieces, ...pieceRel.split('/')));
    { const d = new DatabaseSync(m.b.chemin); d.exec('PRAGMA busy_timeout=5000'); d.prepare("INSERT INTO purge(objet, genre, quand) VALUES(?, 'piece', 5)").run(idPiece('ab', 'purgee')); d.close(); }
    m.h.t += 3600000;
    const rC = await m.sauv.lancer('banc');
    const cleC = rC.cle;
    vrai('   puis une archive C (la pièce purgée est au registre, et encore au coffre)', rC.ok && cles(m).length === 3 && m.coffre.objets.has('beta/pieces/' + pieceRel));

    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-purge-'));
    try {
      const rouvrir = async (cle, vers) => { const f = path.join(bac, 'a.bin'); fs.writeFileSync(f, m.coffre.objets.get(cle)); await SAUV.ouvrirArchive(f, Buffer.from(m.cle, 'hex'), vers); return vers; };
      const dA = await rouvrir(cleA, path.join(bac, 'A.db')), dB = await rouvrir(cleB, path.join(bac, 'B.db'));
      const compte = (chemin, sql, ...p) => { const d = new DatabaseSync(chemin, { readOnly: true }); try { return Number(d.prepare(sql).get(...p).n); } finally { d.close(); } };
      const existe = (chemin, id) => compte(chemin, 'SELECT COUNT(*) AS n FROM message WHERE id = ?', id);
      v('⛔ l\'archive A, restaurée telle quelle, FAIT REVENIR les deux messages éphémères (c\'est le défaut que le rejeu corrige)', [existe(dA, ids.M1), existe(dA, ids.M2), existe(dA, ids.M3)], [1, 1, 1]);
      v('   la réaction du premier avec eux', compte(dA, 'SELECT COUNT(*) AS n FROM reaction WHERE seq = ? AND conv = ?', ids.seq1, ids.E), 1);
      v('   l\'archive B ne les a pas, et son registre en porte la trace (trois lignes)', [existe(dB, ids.M1), existe(dB, ids.M2), existe(dB, ids.M3), compte(dB, 'SELECT COUNT(*) AS n FROM purge')], [0, 0, 1, 3]);
      const registre = STOCK.ouvrir.copie.purgeLire(dB);
      v('purgeLire rend le registre tel quel : {objet, genre, quand}', [registre.length, [...new Set(registre.map(r => r.genre))].join(), registre.some(r => r.objet === ids.M1) && registre.some(r => r.objet === ids.M2) && !registre.some(r => r.objet === ids.M3)], [3, 'message_ephemere', true]);

      const bilan = STOCK.ouvrir.copie.rejouerPurge(dA, registre);
      v('⛔ le registre de B rejoué sur A : les messages purgés repartent (les deux éphémères et le message système), le troisième reste', [bilan.messagesRetires, existe(dA, ids.M1), existe(dA, ids.M2), existe(dA, ids.M3)], [3, 0, 0, 1]);
      v('   leurs réactions suivent (la cascade de la base, clés étrangères allumées)', compte(dA, 'SELECT COUNT(*) AS n FROM reaction WHERE conv = ?', ids.E), 0);
      v('   la copie SE SOUVIENT désormais de ces purges (la sauvegarde suivante les portera)', [bilan.ajoutees, compte(dA, 'SELECT COUNT(*) AS n FROM purge')], [3, 3]);
      const encore = STOCK.ouvrir.copie.rejouerPurge(dA, registre);
      v('⛔ rejouer deux fois ne change rien : rien à retirer, rien à recopier (un second passage, la leçon d\'opIdDerive)', [encore.messagesRetires, encore.ajoutees, encore.lues], [0, 0, 3]);
      vrai('   et la copie reste saine après le rejeu', STOCK.ouvrir.copie.controlerFichier(dA).ok === true);

      /* Les autres genres, joués sur des copies fraîches de A. */
      const copieDeA = async (nom) => { const p = path.join(bac, nom); fs.copyFileSync(path.join(bac, 'A.db'), p); return p; };
      await rouvrir(cleA, path.join(bac, 'A0.db'));
      const frais = async () => { const p = path.join(bac, 'frais-' + Math.random().toString(36).slice(2) + '.db'); fs.copyFileSync(path.join(bac, 'A0.db'), p); return p; };
      void copieDeA;
      {
        const p = await frais();
        const r = STOCK.ouvrir.copie.rejouerPurge(p, [{ objet: ids.M3, genre: 'message_supprime', quand: 1234 }]);
        const d = new DatabaseSync(p, { readOnly: true });
        const l = d.prepare('SELECT corps_ch, meta_ch, supprime_le FROM message WHERE id = ?').get(ids.M3); d.close();
        v('un message « supprimé pour tous » depuis l\'archive perd son corps et GARDE sa pierre tombale (la ligne reste, le texte non)', [r.messagesBlanchis, l.corps_ch, l.meta_ch, Number(l.supprime_le)], [1, null, null, 1234]);
        const encore2 = STOCK.ouvrir.copie.rejouerPurge(p, [{ objet: ids.M3, genre: 'message_supprime', quand: 9999 }]);
        v('   rejoué, il ne change pas la date de suppression déjà posée', [encore2.messagesBlanchis, Number(new DatabaseSync(p, { readOnly: true }).prepare('SELECT supprime_le AS n FROM message WHERE id = ?').get(ids.M3).n)], [0, 1234]);
      }
      {
        const p = await frais();
        const r = STOCK.ouvrir.copie.rejouerPurge(p, [{ objet: ids.M3, genre: 'genre_que_personne_ne_connait', quand: 1 }, { objet: 'x', genre: '', quand: 1 }]);
        v('⛔ un genre INCONNU n\'efface RIEN (dans le doute, on efface moins) : compté « ignoré » et recopié', [r.ignorees, r.messagesRetires, existe(p, ids.M3), compte(p, 'SELECT COUNT(*) AS n FROM purge WHERE genre = ?', 'genre_que_personne_ne_connait')], [2, 0, 1, 1]);
      }
      {
        const p = await frais();
        /* Une archive d'AVANT les pièces (schéma 2) n'a pas la table : on la retire d'une copie pour jouer ce cas-là. */
        const dAvant = new DatabaseSync(p); dAvant.exec('DROP TABLE IF EXISTS piece'); dAvant.close();
        const r0 = STOCK.ouvrir.copie.rejouerPurge(p, [{ objet: 'f_p1', genre: 'piece', quand: 1 }]);
        v('une pièce purgée : son identifiant est RENDU (pour retirer le fichier), même quand la table des pièces n\'existe pas (une archive d\'avant l\'étape 4)', [r0.pieces, r0.messagesRetires], [['f_p1'], 0]);
        const p2 = await frais();
        const d = new DatabaseSync(p2); d.exec('DELETE FROM piece'); d.exec("INSERT INTO piece(id, proprio, conv, genre, taille, mime, cree) VALUES ('f_p2', (SELECT id FROM personne ORDER BY id LIMIT 1), NULL, 'avatar', 1, 'image/png', 1), ('f_p3', (SELECT id FROM personne ORDER BY id LIMIT 1), NULL, 'avatar', 2, 'image/png', 2)"); d.close();
        const r1 = STOCK.ouvrir.copie.rejouerPurge(p2, [{ objet: 'f_p2', genre: 'piece_expiree', quand: 2 }]);
        v('   et quand la table existe (la base d\'aujourd\'hui), la ligne en part aussi (les autres restent)', [r1.pieces, compte(p2, 'SELECT COUNT(*) AS n FROM piece'), compte(p2, 'SELECT COUNT(*) AS n FROM piece WHERE id = ?', 'f_p3')], [['f_p2'], 1, 1]);
      }
      {
        const p = await frais();
        const avant = fs.readFileSync(p);
        const e = lance(() => STOCK.ouvrir.copie.rejouerPurge(p, [{ objet: ids.M3, genre: 'message', quand: 1 }, { objet: 'y', genre: 'message', quand: Symbol('boum') }]));
        v('⛔ tout ou rien : un registre dont une ligne fait lever défait aussi les lignes d\'avant (une seule transaction)', [!!e, existe(p, ids.M3)], [true, 1]);
        void avant;
      }

      /* ══ L'OUTIL, jusqu'au bout : essai, liste, restauration ═════════════════════════════════════════════════════════════ */
      console.log('\n── 950 · outils/restaurer.js : l\'exercice, la liste, la vraie restauration — et rien de secret à l\'écran ──');
      const outil = async (args, extra, nomConfig) => {
        const lignes = [];
        const cfgChemin = path.join(m.b.dossier, nomConfig || 'beta.json');
        if (!fs.existsSync(cfgChemin)) fs.writeFileSync(cfgChemin, JSON.stringify({ instance: 'beta', sauvegarde: m.coffre.conf({ cle: m.cle }) }));
        const kekFichier = path.join(m.b.dossier, 'beta.kek');
        if (!fs.existsSync(kekFichier)) fs.writeFileSync(kekFichier, m.b.kek.toString('hex'));
        const env = Object.assign({ OPMSG_CONFIG: cfgChemin, OPMSG_DATA: m.b.dataDir, OPMSG_KEK_FILE: kekFichier, OPMSG_SYSTEMCTL: '/chemin/qui/n/existe/pas' }, extra || {});
        let code = 0, erreur = null;
        try { code = await RESTAURER.main(args, env, (l) => lignes.push(l)); } catch (e) { code = e.sortie || 99; erreur = e.message; }
        const r = { code, erreur, sortie: lignes.join('\n') };
        tout.push(r.sortie + '\n' + (erreur || ''));
        return r;
      };
      const tout = [];
      const marqueur = () => { try { return JSON.parse(fs.readFileSync(path.join(m.b.dataDir, SAUV.NOM_ESSAI), 'utf8')); } catch (e) { return null; } };

      const l = await outil(['liste']);
      vrai('liste : les trois archives (la plus récente en tête, marquée) et les pièces, sans autre chose', l.code === 0 && /3 archive\(s\) de base/.test(l.sortie) && /→ base\//.test(l.sortie) && /pièces au coffre : 2 /.test(l.sortie));
      const ess = await outil(['essai']);
      v('⛔ l\'essai sur la plus récente : sortie 0, base saine, clé maître vérifiée, pièces relues, registre rejoué', [ess.code, /RESTAURABLE/.test(ess.sortie), /quick_check : ok/.test(ess.sortie), /clé maître : la base restaurée s'ouvre/.test(ess.sortie), /2 au coffre, 2 relue\(s\) sur 2/.test(ess.sortie), /purge rejouée : 4 ligne/.test(ess.sortie)], [0, true, true, true, true, true]);
      const mq = marqueur();
      vrai('   la date de l\'exercice est ÉCRITE (un nombre, le nom de l\'archive, des comptes — rien de secret) et /health la lit', !!mq && Number.isFinite(mq.okTs) && mq.archive === 'base/' + SAUV.archiveDeCle('beta/', cleC).nom + SAUV.SUFFIXE && mq.cleMaitreVerifiee === true && m.sauv.sante().essaiJours === 0);
      vrai('   l\'exercice ne laisse RIEN derrière lui : le dossier jetable est effacé', fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('opmsg-essai-')).length === 0);
      vrai('   et l\'essai joue aussi le vidage des sessions sur sa copie jetable (les deux de l\'archive : « sessions retirées : 2 »)', /sessions retirées : 2 /.test(ess.sortie));
      v('⛔ l\'essai COMPARE les lignes de pièces de la base aux fichiers du coffre : 2 lignes (la purgée est partie avec le registre), dont UNE sans fichier — dit, et noté — alors qu\'avant il ne les comparait jamais',
        [/lignes de pièces dans la base : 2 — ⚠ 1 SANS fichier au coffre/.test(ess.sortie), /mais 1 pièce\(s\) de la base n'ont PAS de fichier au coffre/.test(ess.sortie), mq.piecesSansFichier], [true, true, 1]);

      const okTsAvant = (marqueur() || {}).okTs;
      await dormir(5);
      const ancien = await outil(['essai', '--date', new Date(T0).toISOString().slice(0, 19)]);
      v('⛔ l\'essai sur l\'archive A (PAS la plus récente) rejoue le registre de C : les trois messages purgés repartent — et la date de /health ne bouge pas', [ancien.code, /PAS la plus récente/.test(ancien.sortie), /3 message\(s\) retiré\(s\)/.test(ancien.sortie), (marqueur() || {}).okTs === okTsAvant], [0, true, true, true]);
      const introuvable = await outil(['essai', '--date', '2020-01-01']);
      v('une date d\'avant la première archive : refus clair', [introuvable.code, /aucune archive à cette date/.test(introuvable.erreur)], [1, true]);
      const malDate = await outil(['essai', '--date', 'hier']);
      v('une date mal écrite : sortie 2 (usage)', [malDate.code, /AAAA-MM-JJ/.test(malDate.erreur)], [2, true]);

      /* Les échecs de l'exercice : chacun sort en 1, ne touche pas la date du dernier exercice RÉUSSI, et dit pourquoi. */
      fs.writeFileSync(path.join(m.b.dossier, 'mauvaise-cle.json'), JSON.stringify({ instance: 'beta', sauvegarde: m.coffre.conf({ cle: O.cleHex() }) }));
      const mc = await outil(['essai'], null, 'mauvaise-cle.json');
      v('⛔ une MAUVAISE clé de sauvegarde : sortie 1, « déchiffrement impossible », la date du dernier exercice réussi intacte, l\'échec noté à côté', [mc.code, /déchiffrement impossible/.test(mc.erreur), (marqueur() || {}).okTs === okTsAvant, typeof (marqueur() || {}).echecTs], [1, true, true, 'number']);
      const mauvaiseMaitre = path.join(m.b.dossier, 'autre.kek'); fs.writeFileSync(mauvaiseMaitre, O.cleHex());
      const mm = await outil(['essai'], { OPMSG_KEK_FILE: mauvaiseMaitre });
      v('⛔ une MAUVAISE clé maître sur le serveur : sortie 1 — l\'archive est intacte, mais rien ne serait lisible', [mm.code, /n'ouvre PAS cette base/.test(mm.erreur), (marqueur() || {}).okTs === okTsAvant], [1, true, true]);
      /* ⛔ Un exercice qui n'a pas pu ouvrir la base avec la clé maître prouve l'INTÉGRITÉ, pas la restauration : il ne remet pas la date à zéro (sinon
         /health passe à « essaiJours: 0 » et éteint la seule alarme qui réclame un vrai exercice). On vieillit la date, on joue, on relit. */
      RESTAURER.ecrireEssai(m.b.dataDir, { okTs: Date.now() - 40 * 86400000 });
      const vieilleDate = (marqueur() || {}).okTs;
      const sansMaitre = await outil(['essai'], { OPMSG_KEK_FILE: path.join(m.b.dossier, 'absente.kek') });
      v('⛔ un fichier de clé maître ABSENT : l\'exercice DIT qu\'il ne prouve que l\'intégrité, et N\'ENREGISTRE PAS de nouvelle date (la date de 40 jours reste, le partiel est noté à côté)',
        [sansMaitre.code, /clé maître NON vérifiée/.test(sansMaitre.sortie), /n'est PAS enregistré, \/health ne bouge pas/.test(sansMaitre.sortie), (marqueur() || {}).okTs === vieilleDate, typeof (marqueur() || {}).partielTs], [0, true, true, true, 'number']);
      RESTAURER.ecrireEssai(m.b.dataDir, { okTs: okTsAvant });

      /* Une archive qui n'est pas la bonne : une autre instance, ou rebaptisée. */
      const brutC = m.coffre.objets.get(cleC);
      const autreInstance = await monter({ n: 40, instance: 'prod' });
      try {
        await autreInstance.sauv.lancer('banc');
        const clePr = autreInstance.coffre.cles('prod/base/')[0];
        m.coffre.poser('beta/base/' + SAUV.nomDe(m.h.t + 7200000) + SAUV.SUFFIXE, autreInstance.coffre.objets.get(clePr));
      } finally { await autreInstance.fermer(); }
      const mauvaiseInstance = await outil(['essai']);
      v('⛔ une archive de la PRODUCTION rangée sous le préfixe de la bêta est refusée (« autre instance »)', [mauvaiseInstance.code, /AUTRE instance/.test(mauvaiseInstance.erreur)], [1, true]);
      for (const k of m.coffre.cles('beta/base/').filter(k => k !== cleA && k !== cleB && k !== cleC)) m.coffre.objets.delete(k);
      m.coffre.poser('beta/base/' + SAUV.nomDe(m.h.t + 7200000) + SAUV.SUFFIXE, brutC);
      const rebaptisee = await outil(['essai']);
      v('⛔ une vieille archive rebaptisée avec une date plus récente est refusée (la date écrite dedans n\'est pas celle du nom)', [rebaptisee.code, /rebaptisée|date écrite/.test(rebaptisee.erreur)], [1, true]);
      for (const k of m.coffre.cles('beta/base/').filter(k => k !== cleA && k !== cleB && k !== cleC)) m.coffre.objets.delete(k);
      const vide = await monter({ n: 10 });
      try {
        const cfg2 = path.join(vide.b.dossier, 'vide.json'); fs.writeFileSync(cfg2, JSON.stringify({ instance: 'beta', sauvegarde: vide.coffre.conf({ cle: vide.cle }) }));
        const lignes = []; let code = 0, erreur = '';
        try { code = await RESTAURER.main(['essai'], { OPMSG_CONFIG: cfg2, OPMSG_DATA: vide.b.dataDir }, (x) => lignes.push(x)); } catch (e) { code = e.sortie; erreur = e.message; }
        v('un coffre VIDE : sortie 1, et le dit (jamais « tout va bien » sur du néant)', [code, /VIDE/.test(erreur)], [1, true]);
      } finally { await vide.fermer(); }

      /* La vraie restauration. */
      const vers = path.join(bac, 'restauree');
      const r1 = await outil(['restaurer', '--vers', vers]);
      const vivantC = empreinteTables(path.join(bac, 'B.db'));
      v('⛔ restaurer dans un dossier neuf : sortie 0, la base posée, saine, et les mêmes messages que la base vivante', [r1.code, fs.existsSync(path.join(vers, 'msg.db')), STOCK.ouvrir.copie.controlerFichier(path.join(vers, 'msg.db')).ok, empreinteTables(path.join(vers, 'msg.db')).message === vivantC.message], [0, true, true, true]);
      v('⛔ les pièces reviennent octet pour octet — SAUF celle que le registre a emportée depuis l\'archive, qui est encore au coffre mais NE REVIENT PAS', [fs.existsSync(path.join(vers, 'pieces', ...relPiece('ab', 'gardee').split('/'))) && fs.readFileSync(path.join(vers, 'pieces', ...relPiece('ab', 'gardee').split('/'))).equals(m.coffre.objets.get('beta/pieces/' + relPiece('ab', 'gardee'))), fs.existsSync(path.join(vers, 'pieces', ...pieceRel.split('/'))), /1 retirée\(s\) par la purge/.test(r1.sortie)], [true, false, true]);
      vrai('   aucun dossier de chantier ne reste (`.restauration-…`)', !fs.readdirSync(vers).some(f => f.startsWith('.restauration-')));
      vrai('⛔ la restauration COMPTE les lignes de pièces sans fichier et le DIT (2 lignes, une sans fichier) — une base qui réclame des fichiers que le coffre n\'a pas ouvre des photos qui ne s\'ouvrent pas',
        /lignes de pièces dans la base : 2 — ⚠ 1 SANS fichier/.test(r1.sortie));
      { const dR = new DatabaseSync(path.join(vers, 'msg.db'), { readOnly: true }); const nSess = Number(dR.prepare('SELECT COUNT(*) AS n FROM session').get().n), drap = Number(dR.prepare("SELECT COUNT(*) AS n FROM meta WHERE k = 'rejeu_service'").get().n); dR.close();
        v('⛔ la base restaurée n\'a AUCUNE session (les deux de l\'archive sont retirées : un cookie révoqué depuis ne revient pas), le drapeau du rejeu par le service est levé, et l\'outil le dit',
          [nSess, drap, /sessions retirées : 2/.test(r1.sortie), /conversation\(s\), 0 appareil\(s\)/.test(r1.sortie)], [0, 1, true, true]); }
      const avantRefus = crypto.createHash('sha256').update(fs.readFileSync(path.join(vers, 'msg.db'))).digest('hex');
      const r2 = await outil(['restaurer', '--vers', vers]);
      v('⛔ une SECONDE restauration au même endroit est REFUSÉE sans le drapeau — la base existante n\'a pas bougé d\'un octet, rien ne traîne', [r2.code, /--ecraser/.test(r2.erreur), crypto.createHash('sha256').update(fs.readFileSync(path.join(vers, 'msg.db'))).digest('hex') === avantRefus, fs.readdirSync(vers).filter(f => f.startsWith('.restauration-')).length], [1, true, true, 0]);
      const actif = path.join(bac, 'systemctl-actif.sh'); fs.writeFileSync(actif, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      const r3 = await outil(['restaurer', '--vers', vers, '--ecraser'], { OPMSG_SYSTEMCTL: actif });
      v('⛔ même avec --ecraser, tant que le SERVICE TOURNE, c\'est refusé : on n\'écrase pas une base qui vit', [r3.code, /tourne encore/.test(r3.erreur), crypto.createHash('sha256').update(fs.readFileSync(path.join(vers, 'msg.db'))).digest('hex') === avantRefus], [1, true, true]);
      const arrete = path.join(bac, 'systemctl-arrete.sh'); fs.writeFileSync(arrete, '#!/bin/sh\nexit 3\n', { mode: 0o755 });
      const r4 = await outil(['restaurer', '--vers', vers, '--ecraser', '--date', new Date(T0).toISOString().slice(0, 19), '--sans-pieces'], { OPMSG_SYSTEMCTL: arrete });
      const misDeCote = fs.readdirSync(vers).filter(f => /^msg\.db\.avant-restauration-/.test(f));
      v('⛔ avec --ecraser et le service arrêté : l\'ancienne base est MISE DE CÔTÉ (jamais effacée), la nouvelle prend sa place', [r4.code, misDeCote.length, misDeCote[0] ? crypto.createHash('sha256').update(fs.readFileSync(path.join(vers, misDeCote[0]))).digest('hex') === avantRefus : null, fs.existsSync(path.join(vers, 'msg.db')) && STOCK.ouvrir.copie.controlerFichier(path.join(vers, 'msg.db')).ok], [0, 1, true, true]);
      v('   et la restauration d\'une archive ANCIENNE rejoue le registre de la plus récente : les messages purgés depuis ne reviennent pas', [existe(path.join(vers, 'msg.db'), ids.M1), existe(path.join(vers, 'msg.db'), ids.M2), existe(path.join(vers, 'msg.db'), ids.M3)], [0, 0, 1]);

      /* Un nom de pièce malveillant dans le coffre : refusé, jamais écrit hors du dossier. */
      m.coffre.poser('beta/pieces/ab/../../evasion', Buffer.from('pas ici'));
      m.coffre.poser('beta/pieces/ab/..\\evasion2', Buffer.from('pas ici non plus'));
      const enCoursCoffre = 'beta/pieces/tmp/' + crypto.randomBytes(12).toString('hex'); m.coffre.poser(enCoursCoffre, Buffer.from('un dépôt en cours, resté au coffre'));
      const malRangeCoffre = 'beta/pieces/cd/' + idPiece('ab', 'malrange'); m.coffre.poser(malRangeCoffre, Buffer.from('mauvais dossier'));
      const listeEtrangere = await outil(['liste']);
      vrai('⛔ `liste` ne compte PAS ces objets comme des pièces, et dit qu\'ils n\'ont pas la forme d\'une pièce (4 objets étrangers, 2 vraies pièces)', /pièces au coffre : 2 /.test(listeEtrangere.sortie) && /plus 4 objet\(s\) qui n'ont pas la forme d'une pièce/.test(listeEtrangere.sortie));
      /* Une archive dont le NOM est daté du futur (l'horloge de la machine avançait quand elle a été posée) : `liste` le marque et donne la vraie date, celle du coffre. */
      const cleFutur = 'beta/base/' + SAUV.nomDe(m.h.t + 40 * 86400000) + SAUV.SUFFIXE; m.coffre.poser(cleFutur, Buffer.from('archive datée du futur'));
      const listeFutur = await outil(['liste']);
      m.coffre.objets.delete(cleFutur);
      v('⛔ `liste` MARQUE l\'archive dont le nom est daté du futur (une seule des quatre) et donne la date du coffre — après un saut d\'horloge, la plus récente par le nom n\'est plus la plus fraîche',
        [(listeFutur.sortie.match(/⚠ nom daté du futur/g) || []).length, /4 archive\(s\) de base/.test(listeFutur.sortie), /datée du futur/.test(listeFutur.sortie), new RegExp('le coffre la date du ' + new Date(m.h.t).toISOString().slice(0, 10)).test(listeFutur.sortie)], [1, true, true, true]);
      const vers2 = path.join(bac, 'restauree2');
      const umaskAvant = process.umask(0o022);   // un umask ordinaire : ce sont les droits que l'OUTIL pose qui font 0700 / 0600, pas ceux de la machine du banc
      const r5 = await outil(['restaurer', '--vers', vers2]);
      process.umask(umaskAvant);
      vrai('⛔ un nom de pièce qui remonte (« .. »), porte une barre arrière, ou est un DÉPÔT EN COURS (`tmp/…`) ou un nom rangé dans le mauvais dossier est REFUSÉ et compté — rien n\'est écrit hors du dossier, rien d\'autre qu\'une pièce ne revient', r5.code === 0 && /4 REFUSÉE/.test(r5.sortie) && !fs.existsSync(path.join(vers2, 'pieces', 'cd')) && !fs.existsSync(path.join(bac, 'evasion')) && !fs.existsSync(path.join(vers2, 'evasion')) && !fs.existsSync(path.join(vers2, 'pieces', 'evasion')) && !fs.existsSync(path.join(vers2, 'pieces', 'tmp')));
      v('   et les droits des pièces remises sont posés par l\'outil : dossiers en 0700, fichiers en 0600 (pas ceux de l\'umask)', (() => {
        const modes = new Set(); const parcourir = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const c = path.join(d, e.name); modes.add((e.isDirectory() ? 'd' : 'f') + (fs.statSync(c).mode & 0o777).toString(8)); if (e.isDirectory()) parcourir(c); } };
        parcourir(path.join(vers2, 'pieces')); return [...modes].sort();
      })(), ['d700', 'f600']);
      /* Ces deux noms ne sont pas des pièces : le coffre ne les rend pas sous cette clé (le chemin se normalise), et ils feraient échouer l'échantillon de pièces de tout ce qui suit. */
      m.coffre.objets.delete('beta/pieces/ab/../../evasion'); m.coffre.objets.delete('beta/pieces/ab/..\\evasion2'); m.coffre.objets.delete(enCoursCoffre); m.coffre.objets.delete(malRangeCoffre);

      /* ══ B2 — LA PLUS RÉCENTE ARCHIVE EST ABÎMÉE : ON RESTAURE UNE AUTRE (le geste que le guide § 9 annonce) ═══════════════════════
         Le 3 octobre 2026 (gardien), l'outil rouvrait TOUJOURS la plus récente pour lire son registre des purges et s'arrêtait sur
         « déchiffrement impossible » avant de poser quoi que ce soit — le jour même où le sinistre était celui-là. On abîme un octet de
         C (la plus récente) ; A et B s'ouvrent. Le registre vient de la plus récente QUI S'OUVRE, et quand aucune ne s'ouvre, l'outil
         refuse et nomme la conséquence jusqu'à un `--sans-purge` explicite. */
      console.log('\n── 950 · la plus récente archive est ABÎMÉE : restaurer une autre marche, le registre vient de la plus récente qui s\'ouvre ──');
      {
        const sainC = Buffer.from(m.coffre.objets.get(cleC)), sainB = Buffer.from(m.coffre.objets.get(cleB));
        const abimer = (b) => { const x = Buffer.from(b); x[Math.floor(x.length / 2)] ^= 0xff; return x; };
        const nomDeCle = (cle) => SAUV.archiveDeCle('beta/', cle).nom;
        const quand = (ts) => new Date(ts).toISOString().slice(0, 19);
        const nomA = nomDeCle(cleA), nomB = nomDeCle(cleB), nomC = nomDeCle(cleC);
        const aucunChantier = (d) => !fs.existsSync(d) || fs.readdirSync(d).every(f => !f.startsWith('.restauration-'));
        m.coffre.objets.set(cleC, abimer(sainC));
        try {
          const okAvant = (marqueur() || {}).okTs;
          const d0 = path.join(bac, 'b2-defaut');
          const surLaPlusRecente = await outil(['restaurer', '--vers', d0, '--sans-pieces']);
          v('population : la plus récente est bien abîmée (restaurer SANS date échoue, « déchiffrement impossible »), et rien n\'est posé ni laissé derrière', [surLaPlusRecente.code, /déchiffrement impossible/.test(surLaPlusRecente.erreur), fs.existsSync(d0)], [1, true, false]);
          const essaiC = await outil(['essai']);
          v('   l\'essai sur la plus récente échoue aussi, et la date du dernier exercice RÉUSSI n\'a pas bougé', [essaiC.code, /déchiffrement impossible/.test(essaiC.erreur), (marqueur() || {}).okTs === okAvant], [1, true, true]);

          /* ── cible A (T0) : C est abîmée, B s'ouvre → le registre est celui de B, et il retire les trois messages purgés ── */
          const dA = path.join(bac, 'b2-A');
          const rA2 = await outil(['restaurer', '--vers', dA, '--date', quand(T0), '--sans-pieces']);
          v('⛔ restaurer l\'archive A quand C est abîmée : sortie 0 (avant : « déchiffrement impossible », rien de restauré)', [rA2.code, fs.existsSync(path.join(dA, 'msg.db')), STOCK.ouvrir.copie.controlerFichier(path.join(dA, 'msg.db')).ok], [0, true, true]);
          vrai('   la sortie DIT que C ne s\'ouvre pas (son nom et son motif) et d\'où vient le registre (B)',
            new RegExp('⚠ base/' + nomC + '[^\\n]*ne s\'ouvre pas \\(déchiffrement impossible').test(rA2.sortie) && new RegExp('registre des purges : celui de base/' + nomB).test(rA2.sortie));
          v('⛔ et le registre de B EST rejoué : les messages purgés depuis A ne reviennent pas (les deux éphémères et le message système), le troisième reste',
            [existe(path.join(dA, 'msg.db'), ids.M1), existe(path.join(dA, 'msg.db'), ids.M2), existe(path.join(dA, 'msg.db'), ids.M3), /3 message\(s\) retiré\(s\)/.test(rA2.sortie)], [0, 0, 1, true]);
          vrai('   aucun dossier de chantier ne reste', aucunChantier(dA));
          const essaiA = await outil(['essai', '--date', quand(T0)]);
          v('   le même cas à l\'essai : sortie 0, « CETTE ARCHIVE EST RESTAURABLE », la date de /health ne bouge pas', [essaiA.code, /CETTE ARCHIVE EST RESTAURABLE/.test(essaiA.sortie), /ne s'ouvre pas/.test(essaiA.sortie), (marqueur() || {}).okTs === okAvant], [0, true, true, true]);

          /* ── cible B : la seule archive plus récente (C) est abîmée → le registre des purges faites depuis est INCONNU → refus ── */
          const dB = path.join(bac, 'b2-B');
          const sansDrapeau = await outil(['restaurer', '--vers', dB, '--date', quand(T0 + 3600000), '--sans-pieces']);
          v('⛔ restaurer B quand la SEULE archive plus récente est abîmée : REFUSÉ — le registre des purges faites depuis est inconnu, l\'outil nomme la conséquence et le drapeau',
            [sansDrapeau.code, /REVIENDRAIENT/.test(sansDrapeau.erreur), /--sans-purge/.test(sansDrapeau.erreur), /Rien n'a été touché/.test(sansDrapeau.erreur)], [1, true, true, true]);
          v('   et ce refus ne laisse RIEN : ni base, ni chantier, ni même le dossier de destination qu\'il avait créé', fs.existsSync(dB), false);
          const essaiSans = await outil(['essai', '--date', quand(T0 + 3600000)]);
          v('   l\'essai joue la même règle (une répétition qui passerait là où le vrai geste refuse mentirait)', [essaiSans.code, /--sans-purge/.test(essaiSans.erreur)], [1, true]);
          const avecDrapeau = await outil(['restaurer', '--vers', dB, '--date', quand(T0 + 3600000), '--sans-pieces', '--sans-purge']);
          v('⛔ avec `--sans-purge` : restaurée, et la sortie redit ce qui est accepté', [avecDrapeau.code, fs.existsSync(path.join(dB, 'msg.db')), /--sans-purge : seul le registre de CETTE archive est rejoué/.test(avecDrapeau.sortie)], [0, true, true]);
          const essaiAvec = await outil(['essai', '--date', quand(T0 + 3600000), '--sans-purge']);
          v('   l\'essai accepte aussi le drapeau, sans toucher la date de /health', [essaiAvec.code, (marqueur() || {}).okTs === okAvant], [0, true]);

          /* ── B ET C abîmées, cible A : sans drapeau refus ; avec, les trois messages purgés REVIENNENT — la conséquence est réelle ── */
          m.coffre.objets.set(cleB, abimer(sainB));
          const dA2 = path.join(bac, 'b2-A2');
          const deuxAbimees = await outil(['restaurer', '--vers', dA2, '--date', quand(T0), '--sans-pieces']);
          v('⛔ A visée, B et C abîmées : refus (« 2 essayée(s) »), rien de posé', [deuxAbimees.code, /2 essayée\(s\)/.test(deuxAbimees.erreur), /--sans-purge/.test(deuxAbimees.erreur), fs.existsSync(dA2)], [1, true, true, false]);
          const accepte = await outil(['restaurer', '--vers', dA2, '--date', quand(T0), '--sans-pieces', '--sans-purge']);
          v('   avec `--sans-purge` : restaurée, et la conséquence annoncée est BIEN réelle — les messages éphémères purgés depuis reviennent (c\'est ce que le refus protégeait)',
            [accepte.code, existe(path.join(dA2, 'msg.db'), ids.M1), existe(path.join(dA2, 'msg.db'), ids.M2), existe(path.join(dA2, 'msg.db'), ids.M3)], [0, 1, 1, 1]);
          m.coffre.objets.set(cleB, sainB);

          /* ── le plafond : dix archives illisibles de suite sont un incident, pas une usure — on s'arrête au lieu de télécharger sans fin ── */
          const bidons = [];
          for (let k = 1; k <= 12; k++) { const cle = 'beta/base/' + SAUV.nomDe(T0 + (2 + k) * 3600000) + SAUV.SUFFIXE; m.coffre.poser(cle, Buffer.from('pas une archive, juste des octets ' + k)); bidons.push(cle); }
          const avantVus = m.coffre.vus.length;
          const dPlafond = path.join(bac, 'b2-plafond');
          const plafond = await outil(['restaurer', '--vers', dPlafond, '--date', quand(T0), '--sans-pieces']);
          const lus = m.coffre.vus.slice(avantVus).filter(x => x.m === 'GET' && x.cle);
          const lusBidons = lus.filter(x => bidons.includes(x.cle)).length;
          v('⛔ douze archives illisibles plus récentes : l\'outil en essaie DIX, pas une de plus (chacune coûte un téléchargement entier), et il le dit', [lusBidons, plafond.code, /10 essayée\(s\)/.test(plafond.erreur), /4 autre\(s\) non essayée\(s\)/.test(plafond.erreur)], [10, 1, true, true]);
          v('   et B (saine) n\'a pas été téléchargée pour son registre : on s\'est arrêté avant', lus.filter(x => x.cle === cleB).length, 0);
          for (const k of bidons) m.coffre.objets.delete(k);
        } finally { m.coffre.objets.set(cleC, sainC); m.coffre.objets.set(cleB, sainB); }
        const retour = await outil(['essai']);
        v('contre-épreuve : C remise saine, l\'essai sur la plus récente repasse (sortie 0) — ce qui a échoué plus haut, c\'était bien l\'octet abîmé', retour.code, 0);
      }

      /* ══ remarque 5 : une archive d'un schéma PLUS RÉCENT que ce code n'est pas ouverte ══════════════════════════════════════════════
         L'archive vient d'une version du service qui a migré la base plus loin que ce code ne sait aller. L'ouvrir de force, c'est lire des tables
         qu'il ne connaît pas. Elle compte comme illisible : à l'essai elle échoue, et pour lire un registre on remonte à la précédente. */
      {
        const ts = m.h.t + 5 * 3600000, cleN = 'beta/base/' + SAUV.nomDe(ts) + SAUV.SUFFIXE, sortieN = path.join(bac, 'schema-futur.bin');
        await SAUV.fabriquer({ source: path.join(bac, 'A.db'), sortie: sortieN, cle: Buffer.from(m.cle, 'hex'), meta: { instance: 'beta', date: new Date(ts).toISOString(), schema: SCHEMA + 1 } });
        m.coffre.poser(cleN, fs.readFileSync(sortieN));
        const essN = await outil(['essai']);
        v('⛔ une archive de schéma ' + (SCHEMA + 1) + ' (ce code connaît le ' + SCHEMA + ') n\'est PAS ouverte : l\'essai échoue en disant les deux numéros',
          [essN.code, new RegExp('version PLUS RÉCENTE du service \\(schéma ' + (SCHEMA + 1) + ', ce code ne connaît que le ' + SCHEMA + '\\)').test(essN.erreur)], [1, true]);
        const dN = path.join(bac, 'b2-schema');
        const rN = await outil(['restaurer', '--vers', dN, '--date', new Date(T0).toISOString().slice(0, 19), '--sans-pieces']);
        v('   restaurer A quand la plus récente est de schéma futur : réussie, la sautée est dite avec son motif, et le registre vient de C',
          [rN.code, /ne s'ouvre pas \(cette archive vient d'une version PLUS RÉCENTE/.test(rN.sortie), /registre des purges : celui de base\//.test(rN.sortie)], [0, true, true]);
        m.coffre.objets.delete(cleN);
      }

      /* ══ remarque 9 : un dossier temporaire trop petit se DIT, avant de télécharger ══════════════════════════════════════════════════
         Sans cela, un /tmp de 2 Go devant une base de 3 Go faisait mourir l'exercice sur « échec inattendu (ENOSPC) », sans dire quel dossier. */
      {
        const petitDossier = path.join(bac, 'petit-disque-banc'); fs.mkdirSync(petitDossier);
        const vraiStatfs = fs.statfsSync;
        fs.statfsSync = (chemin, opts) => (String(chemin).includes('petit-disque-banc') ? { bavail: 1, bsize: 4096 } : vraiStatfs(chemin, opts));
        try {
          const trop = await outil(['essai'], { OPMSG_ESSAI_DIR: petitDossier });
          v('⛔ un dossier temporaire de 4 Kio : l\'essai refuse AVANT de télécharger, dit « pas assez de place », nomme la variable qui déplace le travail, et ne crée rien',
            [trop.code, /pas assez de place pour cet exercice/.test(trop.erreur), /OPMSG_ESSAI_DIR/.test(trop.erreur), fs.readdirSync(petitDossier)], [1, true, true, []]);
          const dPetit = path.join(petitDossier, 'dest');
          const tropR = await outil(['restaurer', '--vers', dPetit]);
          v('   la restauration vers un disque trop petit : refusée de même, rien de posé (pas même le dossier de destination)', [tropR.code, /pas assez de place pour cette restauration/.test(tropR.erreur), fs.existsSync(dPetit)], [1, true, false]);
        } finally { fs.statfsSync = vraiStatfs; }
        const eu = lance(() => RESTAURER.verifierPlace(os.tmpdir(), 1e18, 'ce test', 'Aide.'));
        v('   et la mesure elle-même : exiger un pétaoctet est refusé, avec les deux nombres en Mio', [!!eu, /pas assez de place pour ce test/.test(String(eu && eu.message)), /Mio/.test(String(eu && eu.message))], [true, true, true]);
      }

      /* ══ remarque 1, côté restauration : le pic est TROIS fois l'archive, et il se re-mesure avant de télécharger la suivante ═══════════════
         Pour lire le registre des purges d'une archive plus récente, la base restaurée reste sur le disque pendant que la suivante arrive : base + archive
         + sa base déchiffrée. Le premier contrôle (« 2,5 fois ») était plus bas que ce pic ; et il ne pouvait de toute façon pas connaître la taille
         DÉCHIFFRÉE (une base très compressible). Le second, posé avant chaque téléchargement de plus, se fait avec les nombres qu'on a alors. */
      {
        const vraiStatfs = fs.statfsSync;
        const octetsC = m.coffre.objets.get(cleC).length;               // la plus récente : la PREMIÈRE dont le registre est lu quand on vise A
        const lecturesDeC = () => m.coffre.vus.filter(x => x.m === 'GET' && x.cle === cleC).length;
        const disque = { mode: 'reel', libre: 0, delta: 0 };
        const dossierDeTravail = /(opmsg-essai-|\.restauration-)/;
        fs.statfsSync = (chemin, opts) => {
          const c = String(chemin);
          if (disque.mode === 'fixe' && c.includes('limite-pic-banc')) return { bavail: disque.libre, bsize: 1 };
          const aUneBase = dossierDeTravail.test(c) && fs.existsSync(path.join(c, 'msg.db'));
          if (disque.mode === 'apres-base' && aUneBase) return { bavail: 1, bsize: 4096 };
          /* la limite exacte : l'archive suivante + SA base déchiffrée (de la taille de celle qu'on vient de descendre) + 64 Mio, à l'octet près */
          if (disque.mode === 'limite-registre' && aUneBase) return { bavail: octetsC + fs.statSync(path.join(c, 'msg.db')).size + 64 * 1048576 + disque.delta, bsize: 1 };
          return vraiStatfs(chemin, opts);
        };
        try {
          /* (a) la limite exacte du premier contrôle, sur la plus récente (pas de registre à lire : il n'y a pas de second contrôle) */
          const besoin = 3 * octetsC + 64 * 1048576;
          const dLim = path.join(bac, 'limite-pic-banc'); fs.mkdirSync(dLim);
          disque.mode = 'fixe'; disque.libre = besoin - 1;
          const sous = await outil(['essai'], { OPMSG_ESSAI_DIR: dLim });
          disque.libre = besoin;
          const juste = await outil(['essai'], { OPMSG_ESSAI_DIR: dLim });
          disque.mode = 'reel';
          v('⛔ le premier contrôle demande TROIS fois l\'archive plus 64 Mio : un octet de moins est refusé, le compte juste passe (avant : 2,5 fois — plus bas que le pic)',
            [octetsC > 0, sous.code, /pas assez de place pour cet exercice/.test(sous.erreur), juste.code, /RESTAURABLE/.test(juste.sortie)], [true, 1, true, 0, true]);
          vrai('   et il dit le nombre qu\'il exige (en Mio) et le dossier', new RegExp('il faut environ ' + (besoin / 1048576).toFixed(1).replace('.', '\\.') + ' Mio').test(sous.erreur) && sous.erreur.includes(dLim));

          /* (b) le second contrôle : la cible n'est pas la plus récente, la base est descendue, et il ne reste rien pour la suivante */
          const quandT0 = new Date(T0).toISOString().slice(0, 19);
          const l0 = lecturesDeC();
          const temoin = await outil(['essai', '--date', quandT0]);
          const l1 = lecturesDeC();
          v('population : sans manque de place, l\'essai de l\'archive A TÉLÉCHARGE la plus récente pour lire son registre (sinon les refus ci-dessous ne prouveraient rien)', [temoin.code, l1 - l0], [0, 1]);
          disque.mode = 'apres-base';
          const echecAvant = (marqueur() || {}).echecTs;
          const reg = await outil(['essai', '--date', quandT0]);
          const l2 = lecturesDeC();
          v('⛔ l\'essai de A, la base descendue et plus de place pour l\'archive suivante : refusé AVANT de la télécharger (aucune lecture de plus au coffre), avec « pas assez de place », la variable à déplacer — et PAS « aucune archive ne s\'ouvre »',
            [reg.code, /pas assez de place pour lire le registre des purges de base\//.test(reg.erreur), /OPMSG_ESSAI_DIR/.test(reg.erreur), /aucune des archives plus récentes/.test(reg.erreur), /--sans-purge/.test(reg.erreur), l2 - l1], [1, true, true, false, false, 0]);
          vrai('   le dossier jetable est effacé, et un essai sur une archive qui n\'est pas la plus récente ne note pas d\'échec', fs.readdirSync(os.tmpdir()).filter(f => f.startsWith('opmsg-essai-')).length === 0 && (marqueur() || {}).echecTs === echecAvant);
          const dRegR = path.join(bac, 'registre-pic-banc');
          const regR = await outil(['restaurer', '--vers', dRegR, '--date', quandT0, '--sans-pieces']);
          v('   la restauration de A de même : refusée avant de télécharger la suivante, elle nomme --vers, et ne pose RIEN (ni dossier de destination, ni chantier)',
            [regR.code, /pas assez de place pour lire le registre des purges de base\//.test(regR.erreur), /--vers/.test(regR.erreur), /OPMSG_ESSAI_DIR/.test(regR.erreur), fs.existsSync(dRegR), lecturesDeC() - l2], [1, true, true, false, false, 0]);

          /* le compte exact du second contrôle : l'archive suivante PLUS sa base déchiffrée, plus 64 Mio */
          disque.mode = 'limite-registre'; disque.delta = -1;
          const sousReg = await outil(['essai', '--date', quandT0]);
          disque.delta = 0;
          const justeReg = await outil(['essai', '--date', quandT0]);
          disque.mode = 'reel';
          v('⛔ le second contrôle demande l\'archive suivante PLUS sa base déchiffrée (plus 64 Mio) : un octet de moins est refusé, le compte juste passe',
            [sousReg.code, /pas assez de place pour lire le registre/.test(sousReg.erreur), justeReg.code, /RESTAURABLE/.test(justeReg.sortie)], [1, true, 0, true]);
        } finally { fs.statfsSync = vraiStatfs; }
      }

      const inconnue = await outil(['danser']);
      v('une commande inconnue : sortie 2 et la liste des commandes', [inconnue.code, /commandes :/.test(inconnue.erreur)], [2, true]);

      /* ⛔ RIEN DE CE QUE L'OUTIL AFFICHE N'EST UN SECRET. */
      const ecran = tout.join('\n');
      vrai('la population : ' + tout.length + ' sorties examinées, ' + ecran.length + ' caractères', tout.length >= 15 && ecran.length > 2000);
      v('⛔ ni la clé de sauvegarde, ni la clé maître, ni les clés du coffre, ni le nom du bucket, ni l\'adresse du coffre ne figurent à l\'écran ni dans un message d\'erreur',
        [m.cle, m.b.kek.toString('hex'), m.coffre.accessKey, m.coffre.secretKey, m.coffre.bucket, m.coffre.base, '127.0.0.1:' + m.coffre.port].filter(s => ecran.includes(s)), []);
    } finally { fs.rmSync(bac, { recursive: true, force: true }); }
  } finally { await m.fermer(); }

  /* ══ 13 bis. CHAQUE TABLE DU SCHÉMA EST COMPTÉE PAR LA COPIE, OU DÉCLARÉE TRANSITOIRE ═══════════════════════════════════════════════
     `TABLES_COMPTEES` (stockage.js) dit quelles tables la copie compte ligne à ligne et dont la sonde de la base vivante vérifie qu'elles ne
     sont pas vides. Une table ajoutée par une étape suivante (les pièces, les réglages) et oubliée de cette liste ne serait JAMAIS vérifiée :
     une copie qui la perdrait en entier passerait. Même règle que les champs de `/health` — en ajouter un oblige à trancher, une fois, par écrit. */
  console.log('\n── 950 · chaque table du schéma est comptée par la copie, ou déclarée transitoire (une table neuve oblige à trancher) ──');
  {
    const b = O.creerBase();
    try {
      const d = new DatabaseSync(b.chemin, { readOnly: true });
      const tables = d.prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r => r.name);
      d.close();
      const comptees = STOCK.ouvrir.copie.TABLES_COMPTEES;
      /* Ce qui ne se compte pas, et pourquoi : une vie courte ou un état technique. Une table qui porte les DONNÉES d'une personne n'a rien à faire ici. */
      const TRANSITOIRES = {
        code_tel: 'codes de connexion par SMS (quelques minutes)', jeton: 'jetons à usage unique', meta: 'témoin de clé et version du schéma (contrôlés à part)',
        recherche_tel: 'compteurs anti-énumération (une fenêtre de temps)', session: 'sessions (recréées à la reconnexion)',
        sms_bouclier: 'état du bouclier SMS (recalculé)', sms_tentative: 'tentatives de saisie d\'un code (une fenêtre de temps)',
      };
      vrai('population : ' + tables.length + ' tables dans le schéma, ' + comptees.length + ' comptées par la copie, ' + Object.keys(TRANSITOIRES).length + ' déclarées transitoires', tables.length >= 15 && comptees.length >= 12);
      v('⛔ toute table du schéma est comptée par la copie ou déclarée transitoire avec sa raison — une table NEUVE oblige à trancher ici (et à l\'ajouter dans `TABLES_COMPTEES` ET dans `sonde()`)',
        tables.filter(t => !comptees.includes(t) && !(t in TRANSITOIRES)), []);
      v('   et chaque table comptée, chaque déclaration, parle d\'une table qui existe (une décision prise sur du vide n\'en est pas une)',
        [comptees.filter(t => !tables.includes(t)), Object.keys(TRANSITOIRES).filter(t => !tables.includes(t))], [[], []]);
      v('   aucune table n\'est à la fois comptée et déclarée transitoire', comptees.filter(t => t in TRANSITOIRES), []);
      v('⛔ la sonde de la base vivante nomme exactement les mêmes tables que la copie (deux listes écrites à la main, une seule vérité)',
        Object.keys(b.S.sonde().nonVides).sort(), comptees.slice().sort());
      /* La TROISIÈME liste : ce que la copie compte ligne à ligne (`lignesDe`, lue par `controlerFichier`). Son oubli de `piece` faisait
         tomber chaque passe dès la première pièce (gardien, 3 octobre 2026) pendant que les deux autres étaient d'accord. */
      const versCompte = path.join(b.dossier, 'compte.db');
      await b.S.instantane(versCompte);
      const kc = STOCK.ouvrir.copie.controlerFichier(versCompte);
      v('⛔ et le comptage de la COPIE nomme exactement les mêmes tables (trois listes écrites à la main, une seule vérité)',
        [kc.ok, Object.keys(kc.lignes || {}).sort()], [true, comptees.slice().sort()]);
    } finally { b.nettoyer(); }
  }

  /* ══ 13 ter. LE VERDICT DE quick_check DÉCIDE ═══════════════════════════════════════════════════════════════════════════════════════
     Une page abîmée se lit parfois sans erreur (un index qui ne correspond plus à sa table, une page libre) : seul `quick_check` la voit, et
     on ne sait pas fabriquer à la main une corruption que les comptes de lignes laisseraient passer. On joue donc le verdict lui-même, par
     un moteur de poche qui rend ce que SQLite rend — « ok », un diagnostic de page, deux lignes — pour une base d'ailleurs bien formée. */
  console.log('\n── 950 · le verdict de `quick_check` décide : seul « ok » passe ──');
  {
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-qc-'));
    try {
      const fichier = path.join(bac, 'copie.db'); fs.writeFileSync(fichier, Buffer.alloc(4096, 1));   // assez grand pour passer la garde de taille : c'est le MOTEUR qu'on éprouve
      const moteur = (verdict) => ({ DatabaseSync: class { prepare(sql) { return { all: () => (/quick_check/.test(sql) ? verdict : []), get: () => ({ user_version: 2, n: 3, seq: 9 }) }; } close() {} } });
      const sain = STOCK.ouvrir.copie.controlerFichier(fichier, { moteur: moteur([{ quick_check: 'ok' }]) });
      const abime = STOCK.ouvrir.copie.controlerFichier(fichier, { moteur: moteur([{ quick_check: '*** in database main ***\nPage 7: btreeInitPage() returns error code 11' }]) });
      const deux = STOCK.ouvrir.copie.controlerFichier(fichier, { moteur: moteur([{ quick_check: 'ok' }, { quick_check: 'ok' }]) });
      v('⛔ « ok » seul passe (contre-épreuve : le moteur de poche rend bien une copie saine) ; un diagnostic de page abîmée est refusé et nommé ; plus d\'une ligne aussi',
        [sain.ok, sain.schema, abime.ok, /quick_check/.test(String(abime.motif)), deux.ok], [true, 2, false, true, false]);
    } finally { fs.rmSync(bac, { recursive: true, force: true }); }
  }

  /* ══ 13 quater. LES GENRES DE PURGE — chaque effacement noté dans le registre est rejoué par qui il désigne ════════════════════════════════
     Rejoué par le gardien le 3 octobre 2026 : une restauration ressuscitait les sessions révoquées (l'ancien cookie répondait de nouveau 200) et les conversations
     supprimées (seules leurs pièces étaient notées) ; un appareil « déconnecté » aurait suivi. Un effacement qu'aucune restauration ne rejoue est un effacement qui
     REVIENT. Le registre a donc trois pièces qui se tiennent : ce qui s'écrit (`INSERT INTO purge`), ce qui se déclare (`GENRES_PURGE`), ce qui se rejoue
     (`rejouerPurge` hors ligne pour 'copie', `rejeu.js` au démarrage du service pour 'service'). Le banc les compare, pour qu'un genre neuf — le compte qu'on efface au
     bout de quatorze jours — oblige à trancher, une fois, par écrit. */
  console.log('\n── 950 · chaque effacement noté est REJOUÉ : la conversation supprimée, l\'appareil déconnecté, la session fermée ne reviennent pas ──');
  {
    const REJEU = require(path.join(SM, 'rejeu.js'));
    const GENRES = STOCK.ouvrir.copie.GENRES_PURGE;
    const copies = Object.keys(GENRES).filter(g => GENRES[g] === 'copie'), services = Object.keys(GENRES).filter(g => GENRES[g] === 'service');

    /* 1. LA GARDE DE CODE — ce qui s'écrit dans `purge` est déclaré, ce qui est déclaré s'écrit. */
    const src = code(path.join(SM, 'stockage.js'));
    const ecrits = new Set(); let sites = 0;
    for (const x of src.matchAll(/INSERT INTO purge[^;]*;/g)) { sites++; for (const g of x[0].matchAll(/'([a-z_]{3,})'/g)) ecrits.add(g[1]); }
    vrai('population : ' + sites + ' sites d\'écriture dans `purge` (code, sans commentaires), ' + ecrits.size + ' genres écrits (' + [...ecrits].sort().join(', ') + '), ' + Object.keys(GENRES).length + ' déclarés', sites >= 6 && ecrits.size >= 5 && Object.keys(GENRES).length >= 6);
    v('⛔ TOUT genre écrit dans le registre est DÉCLARÉ dans `GENRES_PURGE` (« copie » ou « service ») — un genre neuf oblige à dire qui le rejoue : sans cela, l\'effacement revient à la prochaine restauration',
      [...ecrits].filter(g => !(g in GENRES) && !(g.startsWith('piece') && 'piece' in GENRES)).sort(), []);
    const REJEU_SEUL = { message: 'genre de compatibilité : rejoué hors ligne, plus écrit par le service' };
    v('   et tout genre déclaré est écrit quelque part (une déclaration pour du vide n\'est pas une décision), hors ceux qu\'on nomme',
      Object.keys(GENRES).filter(g => !ecrits.has(g) && !(g in REJEU_SEUL)), []);
    v('   les valeurs permises sont « copie » et « service », rien d\'autre', Object.values(GENRES).filter(x => x !== 'copie' && x !== 'service'), []);
    v('⛔ chaque genre « service » a sa fonction dans `rejeu.js`, et chaque fonction de `rejeu.js` porte un genre déclaré « service »',
      [services.filter(g => typeof REJEU.GENRES_SERVICE[g] !== 'function'), Object.keys(REJEU.GENRES_SERVICE).filter(g => GENRES[g] !== 'service')], [[], []]);

    /* 2. CHAQUE genre « copie » est RECONNU par le rejeu hors ligne (un genre inconnu est compté « ignoré » — c'est ce qui le trahit). */
    const b0 = O.creerBase(); O.remplir(b0, 5); b0.S.fermer();
    const copieDe = (src0, nom) => { const dst = path.join(b0.dossier, nom); fs.copyFileSync(src0, dst); return dst; };
    try {
      const inconnu = STOCK.ouvrir.copie.rejouerPurge(copieDe(b0.chemin, 'inconnu.db'), [{ objet: 'x', genre: 'genre_que_personne_ne_connait', quand: 1 }]);
      v('contre-épreuve du détecteur : un genre inventé est compté « ignoré »', inconnu.ignorees, 1);
      const reconnus = copies.map(g => [g, STOCK.ouvrir.copie.rejouerPurge(copieDe(b0.chemin, 'g-' + g + '.db'), [{ objet: 'inexistant-' + g, genre: g, quand: 1 }]).ignorees]);
      v('⛔ chacun des ' + copies.length + ' genres « copie » est RECONNU par le rejeu hors ligne (aucun n\'est compté « ignoré »)', reconnus.filter(([, n]) => n !== 0).map(([g]) => g), []);
    } finally { b0.nettoyer(); }

    /* 3. LES EFFACEMENTS SE NOTENT — la conversation, les appareils révoqués (explicites ou chassés par le onzième). */
    const b = O.creerBase();
    try {
      const { a, c } = O.remplir(b, 6);
      const solo = b.S.convCreerGroupe({ createur: a.id, nom: 'Solo à supprimer', membres: [] }).id;
      b.S.messageEnvoyer({ conv: solo, auteur: a.id, cid: 'solo-1', texte: 'ce message ne doit pas revenir' });
      for (let i = 1; i <= 12; i++) { b.h.t += 1000; b.S.telAppareilLier({ h: 'app' + String(i).padStart(2, '0'), personne: a.id, nom: 'téléphone', ttlMs: 100 * 86400000 }); }
      const registre = () => STOCK.ouvrir.copie.purgeLire(b.chemin);
      const d1 = registre().filter(e => e.genre === 'appareil').map(e => e.objet).sort();
      v('⛔ le onzième et le douzième appareil chassent les deux plus anciens, et cette révocation SE NOTE (genre « appareil », l\'empreinte du jeton)', d1, ['app01', 'app02']);
      for (const h of ['capp1', 'capp2']) { b.h.t += 1000; b.S.telAppareilLier({ h, personne: c.id, nom: 'tablette', ttlMs: 100 * 86400000 }); }
      b.S.sessionAjouter({ h: 'sess1', personne: a.id, appareil: 'x', ttlMs: 30 * 86400000 }); b.S.sessionAjouter({ h: 'sess2', personne: c.id, appareil: 'y', ttlMs: 30 * 86400000 });
      b.h.t += 1000;
      const avant = path.join(b.dossier, 'avant.db'); await b.S.instantane(avant);                  // l'archive d'AVANT les effacements : elle porte la conversation, dix appareils, deux sessions
      b.h.t += 1000;
      b.S.convSupprimer(solo);
      b.S.telAppareilSupprimer('app12');
      b.S.telAppareilsSupprimerAutres(a.id, 'app10');
      b.S.telAppareilsSupprimerPersonne(c.id);
      b.S.sessionSupprimer('sess1');
      const apres = registre();
      v('⛔ supprimer une conversation SE NOTE (genre « conversation »), une fois ; supprimer une conversation qui n\'existe plus n\'écrit rien',
        [apres.filter(e => e.genre === 'conversation').map(e => e.objet), (b.S.convSupprimer('c_inexistante'), registre().filter(e => e.genre === 'conversation').length)], [[solo], 1]);
      v('   chaque appareil révoqué se note : app12 (un seul), tous les autres sauf app10 (app03 à app09, app11), puis les deux de la seconde personne d\'un coup — treize lignes avec les deux chassés d\'avant, jamais app10',
        [registre().filter(e => e.genre === 'appareil').map(e => e.objet).sort()], [['app01', 'app02', 'app03', 'app04', 'app05', 'app06', 'app07', 'app08', 'app09', 'app11', 'app12', 'capp1', 'capp2']]);

      /* 4. LE REJEU — la copie d'AVANT reçoit le registre d'APRÈS. */
      const lire = (chemin, sql, ...pp) => { const dd = new DatabaseSync(chemin, { readOnly: true }); try { return Number(dd.prepare(sql).get(...pp).n); } finally { dd.close(); } };
      const copieB = (src0, nom) => { const dst = path.join(b.dossier, nom); fs.copyFileSync(src0, dst); return dst; };
      const sur = copieB(avant, 'restauree.db');
      vrai('population : la copie d\'avant porte la conversation et ses messages, douze appareils et deux sessions',
        lire(sur, 'SELECT COUNT(*) AS n FROM conversation WHERE id = ?', solo) === 1 && lire(sur, 'SELECT COUNT(*) AS n FROM message WHERE conv = ?', solo) >= 1 && lire(sur, 'SELECT COUNT(*) AS n FROM appareil_tel') === 12 && lire(sur, 'SELECT COUNT(*) AS n FROM session') === 2);
      const r = STOCK.ouvrir.copie.rejouerPurge(sur, registre());
      v('⛔ le registre rejoué : la conversation SUPPRIMÉE repart avec ses messages (avant : elle revenait entière), onze appareils sont retirés — il ne reste que celui qu\'on avait gardé',
        [r.conversationsRetirees, lire(sur, 'SELECT COUNT(*) AS n FROM conversation WHERE id = ?', solo), lire(sur, 'SELECT COUNT(*) AS n FROM message WHERE conv = ?', solo), r.appareilsRetires, lire(sur, 'SELECT COUNT(*) AS n FROM appareil_tel'), lire(sur, 'SELECT COUNT(*) AS n FROM appareil_tel WHERE h = ?', 'app10'), r.ignorees],
        [1, 0, 0, 11, 1, 1, 0]);
      v('   les autres conversations n\'ont pas bougé (la population de départ : le groupe du banc et ses messages)', lire(sur, 'SELECT COUNT(*) AS n FROM conversation'), lire(avant, 'SELECT COUNT(*) AS n FROM conversation') - 1);
      const encore = STOCK.ouvrir.copie.rejouerPurge(sur, registre());
      v('   rejouer deux fois ne change rien (idempotent)', [encore.conversationsRetirees, encore.appareilsRetires, encore.ajoutees], [0, 0, 0]);
      /* Un appareil RELIÉ après sa révocation est un autre appareil : le registre ne l'emporte pas. */
      b.h.t += 1000; b.S.telAppareilLier({ h: 'app12', personne: c.id, nom: 'rebranché', ttlMs: 100 * 86400000 });
      const relie = path.join(b.dossier, 'relie.db'); await b.S.instantane(relie);
      const r2 = STOCK.ouvrir.copie.rejouerPurge(relie, registre());
      v('⛔ un jeton révoqué puis RELIÉ plus tard n\'est pas retiré (la révocation ne vise que l\'appareil qui existait alors)', [lire(relie, 'SELECT COUNT(*) AS n FROM appareil_tel WHERE h = ?', 'app12'), r2.appareilsRetires], [1, 0]);

      /* 5. LES SESSIONS — aucun registre ne note une session fermée : la restauration les vide toutes, et lève le drapeau du rejeu par le service. */
      const ap = STOCK.ouvrir.copie.apresRestauration(sur);
      const dd = new DatabaseSync(sur, { readOnly: true });
      const drapeau = dd.prepare("SELECT v FROM meta WHERE k = 'rejeu_service'").get(); dd.close();
      v('⛔ après la restauration, AUCUNE session ne reste (l\'ancien cookie d\'une déconnexion ne revient pas), et le drapeau du rejeu par le service est levé',
        [ap.sessions, lire(sur, 'SELECT COUNT(*) AS n FROM session'), !!drapeau], [2, 0, true]);
      v('   la table des appareils, elle, n\'est pas touchée (ils évitent le SMS, et leurs révocations sont dans le registre)', lire(sur, 'SELECT COUNT(*) AS n FROM appareil_tel'), 1);
      v('   et rejouer cette étape ne casse rien (0 session la seconde fois)', STOCK.ouvrir.copie.apresRestauration(sur).sessions, 0);
      vrai('   la copie reste saine', STOCK.ouvrir.copie.controlerFichier(sur).ok === true);

      /* Le magasin lit le drapeau, rend le registre, et le baisse. */
      const { creerScelleur } = require(path.join(SM, 'scelle.js'));
      const S2 = STOCK.ouvrir({ chemin: sur, scelleur: creerScelleur(b.kek), horloge: () => b.h.t });
      try {
        v('⛔ le magasin ouvert sur la base restaurée voit le drapeau, rend le registre (genre « conversation » compris), et le baisse', [S2.rejeuAFaire(), S2.purgeLignes().some(e => e.genre === 'conversation' && e.objet === solo), (S2.rejeuTermine(), S2.rejeuAFaire())], [true, true, false]);
      } finally { S2.fermer(); }
    } finally { b.nettoyer(); }

    /* 6. LE REJEU PAR LE SERVICE (`rejeu.js`) — joué sur un magasin de poche : le démarrage ordinaire n'exécute RIEN, et un échec laisse le drapeau. */
    {
      const L = [{ objet: 'a', genre: 'g1', quand: 1 }, { objet: 'b', genre: 'inconnu', quand: 2 }, { objet: 'c', genre: 'g1', quand: 3 }, { objet: 'd', genre: 'constructor', quand: 4 }, { objet: 'e', genre: 'g2', quand: 5 }];
      const faux = (drapeau, lignes) => { const e = { drapeau, baisse: 0 }; return Object.assign({ e }, { rejeuAFaire: () => e.drapeau, purgeLignes: () => lignes, rejeuTermine: () => { e.drapeau = false; e.baisse++; } }); };
      const appels = [], journal = [];
      const g = { g1: (st, ent, ctx) => { appels.push(ent.objet + ':' + typeof ctx.horloge); }, g2: (st, ent) => { appels.push(ent.objet); } };
      const jr = (e, c) => journal.push([e, c.etat, c.n, c.motif].join('|'));
      const sans = REJEU.rejouerAuDemarrage({ stockage: faux(false, L), contexte: { horloge: Date.now }, genres: g, journaliser: jr });
      v('⛔ SANS drapeau (tout démarrage ordinaire) le rejeu n\'exécute rien et n\'écrit rien au journal', [sans.fait, appels, journal], [false, [], []]);
      const st = faux(true, L);
      const bon = REJEU.rejouerAuDemarrage({ stockage: st, contexte: { horloge: Date.now }, genres: g, journaliser: jr });
      v('⛔ AVEC le drapeau : seules les entrées des genres connus sont rejouées, dans l\'ordre du registre, avec le contexte — un genre inconnu et un nom hérité (« constructor ») ne sont jamais appelés',
        [bon, appels, st.e.drapeau, journal], [{ fait: true, rejouees: 3, echecs: 0 }, ['a:function', 'c:function', 'e'], false, ['rejeu|ok|3|']]);
      appels.length = 0; journal.length = 0;
      const st2 = faux(true, L); let leve = 0;
      const casse = REJEU.rejouerAuDemarrage({ stockage: st2, genres: { g1: () => { leve++; throw new Error('boum'); }, g2: (stk, ent) => { appels.push(ent.objet); } }, journaliser: jr });
      v('⛔ une fonction qui LÈVE : l\'échec est compté et dit au journal, les autres entrées sont quand même rejouées, le drapeau RESTE levé (le démarrage suivant recommence) — et le démarrage ne meurt pas',
        [casse, leve, appels, st2.e.drapeau, journal.filter(x => /echec/.test(x))], [{ fait: true, rejouees: 1, echecs: 2 }, 2, ['e'], true, ['rejeu|echec||g1', 'rejeu|echec||g1', 'rejeu|echec|1|']]);
      const asynchrone = REJEU.rejouerAuDemarrage({ stockage: faux(true, L), genres: { g1: async () => {} }, journaliser: () => {} });
      v('   une fonction ASYNCHRONE est refusée (le démarrage est synchrone : une promesse perdue serait un effacement qu\'on croirait fait)', [asynchrone.rejouees, asynchrone.echecs], [0, 2]);
      const illisible = REJEU.rejouerAuDemarrage({ stockage: Object.assign(faux(true, L), { purgeLignes: () => { throw new Error('x'); } }), genres: g, journaliser: jr });
      v('   un registre illisible : échec dit, drapeau levé, aucun appel', [illisible.echecs, illisible.rejouees], [1, 0]);
    }
  }

  /* ══ 14. LE CONTRÔLE DANS UN PROCESSUS ENFANT ═════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · le contrôle de la copie se fait dans un PROCESSUS ENFANT : la boucle d\'événements du service n\'est pas figée ──');
  {
    const b = O.creerBase();
    try {
      O.remplir(b, 200);
      const copie = path.join(b.dossier, 'c.db'); await b.S.instantane(copie);
      const ici = STOCK.ouvrir.copie.controlerFichier(copie), la = await SAUV.controlerEnProcessus(copie);
      vrai('population : la copie est saine et porte des lignes (' + ici.total + ')', ici.ok && ici.total > 200);
      v('⛔ le processus enfant rend EXACTEMENT le verdict de la fonction (même schéma, même horloge, mêmes lignes)', la, ici);
      v('un fichier absent, un texte et un fichier vide : ok:false avec un motif', [(await SAUV.controlerEnProcessus(path.join(b.dossier, 'absent.db'))).ok, (() => { fs.writeFileSync(path.join(b.dossier, 't.db'), 'x'.repeat(2000)); return null; })(), (await SAUV.controlerEnProcessus(path.join(b.dossier, 't.db'))).ok], [false, null, false]);
      const gros = path.join(b.dossier, 'gros.db'); fs.copyFileSync(copie, gros);
      { const d = new DatabaseSync(gros); d.exec('BEGIN'); const ins = d.prepare("INSERT INTO journal(genre, conv, uid, ref, ts) VALUES('bourrage', NULL, NULL, ?, 1)"); for (let i = 0; i < 60000; i++) ins.run('x'.repeat(200) + i); d.exec('COMMIT'); d.close(); }
      let ticks = 0, tourne = true;
      const boucle = () => { if (!tourne) return; ticks++; setImmediate(boucle); };
      boucle();
      const t0 = Date.now(); const verdict = await SAUV.controlerEnProcessus(gros); const ms = Date.now() - t0;
      tourne = false;
      vrai('⛔ pendant le contrôle d\'une base de ' + Math.round(fs.statSync(gros).size / 1048576) + ' Mio (' + ms + ' ms), la boucle d\'événements a continué de tourner (' + ticks + ' tours) — un contrôle fait dans le service l\'aurait figée', verdict.ok && ticks > 100);
      const delai = await SAUV.controlerEnProcessus(gros, 1);
      v('un contrôle qui dépasse son délai est abandonné et le DIT (« controle-delai »), il ne reste pas pendu', [delai.ok, delai.motif], [false, 'controle-delai']);
    } finally { b.nettoyer(); }
    const m = await monter({ n: 120, controler: SAUV.controlerEnProcessus });
    try {
      const r = await m.sauv.lancer('banc');
      v('une passe COMPLÈTE avec le contrôle par défaut (deux processus enfants : la copie, puis l\'archive relue) réussit', [r.ok, cles(m).length], [true, 1]);
    } finally { await m.fermer(); }
  }

  /* ══ 15. AUCUN SECRET DANS LES JOURNAUX ═══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 950 · aucun secret dans les journaux : ni clé, ni nom de bucket, ni adresse du coffre — sur des passes réussies ET ratées ──');
  {
    const m = await monter({ n: 80 });
    const volee = [];
    const ow = process.stdout.write, ew = process.stderr.write;
    const capte = (c, ...r) => { volee.push(String(c)); const cb = r.find(x => typeof x === 'function'); if (cb) cb(); return true; };
    try {
      const racine = path.join(m.b.dataDir, 'pieces'); fs.mkdirSync(path.join(racine, 'ab'), { recursive: true });
      for (let i = 0; i < 3; i++) fs.writeFileSync(path.join(racine, 'ab', 'f_' + i), crypto.randomBytes(100));
      process.stdout.write = capte; process.stderr.write = capte;
      const scenario = [[], ['refus-depot'], ['refus-depot-403'], ['coupure-depot'], ['corrompt-relecture'], ['lecture-refusee'], ['liste-refusee'], ['efface-refuse'], ['refus-depot-pieces'], ['corrompt-pieces']];
      for (const pannes of scenario) { m.coffre.regler(...pannes); m.h.t += 1000; await m.sauv.lancer('banc'); }
      m.coffre.normal(); m.h.t += 1000; await m.sauv.lancer('banc');
      m.coffre.latenceMs = 300; const p = m.sauv.lancer('banc'); await dormir(100); await m.sauv.arreter(); await p;
    } finally { process.stdout.write = ow; process.stderr.write = ew; }
    const secrets = [m.cle, m.b.kek.toString('hex'), m.coffre.accessKey, m.coffre.secretKey, m.coffre.bucket, m.coffre.base, '127.0.0.1:' + m.coffre.port];
    const journal = JSON.stringify(m.evts), ecran = volee.join('');
    vrai('la population : ' + m.evts.length + ' évènements de journal et ' + ecran.length + ' caractères écrits par le client S3 pendant ' + 11 + ' passes (réussies et ratées)', m.evts.length >= 10 && ecran.length > 100);
    v('⛔ aucun secret dans le journal du service (clé de sauvegarde, clé maître, clés du coffre, bucket, adresse)', secrets.filter(s => journal.includes(s)), []);
    v('⛔ ni dans ce que le client S3 écrit sur la sortie d\'erreur (des codes HTTP, rien d\'autre)', secrets.filter(s => ecran.includes(s)), []);
    v('   le journal du service n\'a que trois champs : l\'état, un motif machine, un nombre — la liste blanche de `journaliser` n\'a rien à retirer',
      [...new Set(m.evts.flatMap(([, c]) => Object.keys(c)))].sort(), ['etat', 'motif', 'n']);
    vrai('   chaque motif est un mot machine court (jamais une phrase, un chemin, un nom)', m.evts.every(([, c]) => c.motif === undefined || /^[a-z0-9-]{0,40}$/.test(c.motif)));
    v('   les évènements ne portent que le nom « sauvegarde »', [...new Set(m.evts.map(([e]) => e))], ['sauvegarde']);
    await m.coffre.fermer(); m.b.nettoyer();
  }

  /* ══ 15 bis. LA MÉMOIRE D'UNE GROSSE ARCHIVE EST BORNÉE — l'envoi et la lecture gardent la contre-pression ═══════════════════════════════
     Le 3 octobre 2026 (gardien A4) : une base de 300 Mo faisait monter le service à 328 Mo de mémoire anonyme pendant l'envoi, 700 Mo à 827, contre
     `MemoryMax=1G`. Cause établie en isolant le client dans un processus à part, devant un serveur qui ne garde rien : `fetch` tient le corps
     entier avant de l'envoyer (ni `Readable.toWeb`, ni un générateur, ni un `ReadableStream` tiré à la main n'y changent rien). `coffre.js` envoie
     par `node:http` et `pipeline`. Le banc mesure la mémoire ANONYME d'un processus client (`/proc/self/status`, `RssAnon`) — celle du coffre de
     banc, qui garde tout pour recalculer l'empreinte, est dans l'autre processus. */
  console.log('\n── 950 · une grosse archive ne tient JAMAIS en mémoire : l\'envoi et la lecture gardent la contre-pression ──');
  {
    const COFFRE_MOD = path.join(SM, 'coffre.js');
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-memoire-'));
    const coffre = await O.coffreFaux();
    try {
      const MO = 160;
      const fichier = path.join(bac, 'grosse.bin');
      { const b = crypto.randomBytes(1 << 20); const fd = fs.openSync(fichier, 'w'); for (let i = 0; i < MO; i++) fs.writeSync(fd, b); fs.closeSync(fd); }
      const h = await SAUV.empreinteFichier(fichier);
      if (!fs.existsSync('/proc/self/status')) console.log('  (sauté : /proc absent — la mémoire d\'un processus n\'est pas mesurable ici)');
      else {
        const script = `
          const fs = require('fs');
          const C = require(process.env.COFFRE_MOD);
          const anon = () => { const m = /RssAnon:\\s+(\\d+)/.exec(fs.readFileSync('/proc/self/status', 'utf8')); return m ? Math.round(parseInt(m[1], 10) / 1024) : -1; };
          const base = anon(); let pic = base;
          const t = setInterval(() => { pic = Math.max(pic, anon()); }, 10);
          (async () => {
            const c = C.client(JSON.parse(process.env.CONF));
            const p = await c.poserCleFlux('beta/base/grosse.msgbak', process.env.FICHIER, +process.env.OCTETS, process.env.EMPREINTE);
            const picPut = pic - base;
            const l = await c.lireCleVers('beta/base/grosse.msgbak', process.env.FICHIER + '.relu');
            clearInterval(t);
            console.log(JSON.stringify({ p: p.ok, l: l.ok, octets: l.octets, empreinte: l.empreinte, base, picPut, picTotal: pic - base }));
          })();`;
        const mesurer = (mod) => new Promise((resolve) => {
          const p = require('child_process').spawn(process.execPath, ['-e', script], { env: Object.assign({}, process.env, { COFFRE_MOD: mod, CONF: JSON.stringify(coffre.conf()), FICHIER: fichier, OCTETS: String(h.octets), EMPREINTE: h.hex }), stdio: ['ignore', 'pipe', 'pipe'] });
          let o = ''; p.stdout.on('data', d => { o += d; }); p.stderr.on('data', d => { o += d; });
          const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, 120000);
          p.on('close', () => { clearTimeout(t); let m0 = null; try { m0 = JSON.parse(o.trim().split('\n').pop()); } catch (e) { m0 = null; } resolve({ m: m0, brut: o }); });
        });
        /* LE TÉMOIN, pour voir l'AVANT : le client d'origine (`lib/s3.js`, par `fetch`) devant le même serveur, le même fichier. Montré, pas exigé — un Node futur qui corrigerait `fetch`
           ne doit pas faire tomber la CI ; c'est la mutation S30 qui prouve que le banc voit le défaut. */
        const avantLeCorrectif = await mesurer(path.join(SM, 'lib', 's3.js'));
        if (avantLeCorrectif.m) console.log('  ℹ avant (client d\'origine, `fetch`) : pic +' + avantLeCorrectif.m.picPut + ' Mo à l\'envoi, +' + avantLeCorrectif.m.picTotal + ' Mo sur le cycle, pour ' + MO + ' Mo de fichier');
        const apres = await mesurer(COFFRE_MOD);
        const m = apres.m, sortie = apres.brut;
        vrai('population : le processus client a tourné jusqu\'au bout — ' + MO + ' Mo envoyés puis relus, empreinte identique (' + (m ? 'départ ' + m.base + ' Mo, pic à l\'envoi +' + m.picPut + ' Mo, pic total +' + m.picTotal + ' Mo' : 'sortie illisible : ' + sortie.slice(0, 120)) + ')',
          !!m && m.p === true && m.l === true && m.octets === h.octets && m.empreinte === h.hex && m.base > 0);
        v('⛔ l\'ENVOI de ' + MO + ' Mo ne fait pas monter le client de plus de la MOITIÉ du fichier (avant : ≈ ' + MO + ' Mo, tout le fichier — `fetch` tient le corps entier)', !!m && m.picPut < MO / 2, true);
        v('⛔ ni l\'envoi puis la LECTURE de la même archive (le pic de tout le cycle)', !!m && m.picTotal < MO / 2, true);
      }
      fs.rmSync(fichier + '.relu', { force: true });
    } finally { await coffre.fermer(); fs.rmSync(bac, { recursive: true, force: true }); }
  }

  /* ══ 15 ter. LE TRANSPORT DU COFFRE : les statuts, la coupure, et le coffre MUET ═════════════════════════════════════════════════════════════
     Un coffre qui n'avance plus depuis trois minutes est en panne, pas lent : le client d'origine attendait jusqu'à UNE HEURE (envoi) ou une heure
     (lecture), la sauvegarde en cours, sans rien dire. `coffre.js` coupe sur le silence de la ligne, pas sur la durée totale. */
  console.log('\n── 950 · le transport du coffre : statuts rendus comme le client d\'origine, coffre muet coupé au silence ──');
  {
    const COFFRE = require(path.join(SM, 'coffre.js'));
    const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-950-transport-'));
    const coffre = await O.coffreFaux();
    const originel = require(path.join(SM, 'lib', 's3.js')).client(coffre.conf());
    const mien = COFFRE.client(coffre.conf());
    try {
      const f = path.join(bac, 'petite.bin'); const contenu = crypto.randomBytes(5000); fs.writeFileSync(f, contenu);
      const h = crypto.createHash('sha256').update(contenu).digest('hex');
      const enSilence = (f2) => { const e = console.error; console.error = () => {}; return f2().finally(() => { console.error = e; }); };   // les deux clients écrivent « objet non posé : HTTP 500 » : c'est le comportement, pas le sujet
      const p0 = await mien.poserCleFlux('beta/base/a.msgbak', f, contenu.length, h);
      v('un dépôt réussi rend { ok:true, octets } comme le client d\'origine, et le coffre l\'a reçu SIGNÉ JUSTE et dont l\'empreinte est la bonne', [p0, coffre.objets.get('beta/base/a.msgbak').equals(contenu), coffre.etat.signaturesFausses, coffre.etat.empreintesFausses], [{ ok: true, octets: 5000 }, true, 0, 0]);
      const g = await mien.lireCleVers('beta/base/a.msgbak', path.join(bac, 'relu.bin'));
      v('   et se relit : { ok:true, octets, empreinte } — la même que celle du client d\'origine', [g.ok, g.octets, g.empreinte === h, (await originel.lireCleVers('beta/base/a.msgbak', path.join(bac, 'relu2.bin'))).empreinte === g.empreinte, fs.readFileSync(path.join(bac, 'relu.bin')).equals(contenu)], [true, 5000, true, true, true]);
      const a404 = await mien.lireCleVers('beta/base/absente.msgbak', path.join(bac, 'x.bin'));
      v('une clé absente : { ok:false, absente:true }, et aucun fichier partiel ne reste', [a404, fs.existsSync(path.join(bac, 'x.bin'))], [{ ok: false, absente: true }, false]);
      coffre.regler('refus-depot');
      const r500 = await enSilence(() => mien.poserCleFlux('beta/base/b.msgbak', f, contenu.length, h));
      coffre.regler('lecture-refusee');
      const r403 = await enSilence(() => mien.lireCleVers('beta/base/a.msgbak', path.join(bac, 'y.bin')));
      coffre.normal();
      v('un dépôt refusé (500) → { ok:false, statut:500 } ; une lecture refusée (403) → { ok:false, statut:403 }, sans fichier partiel', [r500, r403, fs.existsSync(path.join(bac, 'y.bin'))], [{ ok: false, statut: 500 }, { ok: false, statut: 403 }, false]);
      coffre.regler('coupure-depot');
      const coupe = await enSilence(() => mien.poserCleFlux('beta/base/c.msgbak', f, contenu.length, h));
      coffre.normal();
      v('⛔ une connexion COUPÉE en plein dépôt → { ok:false, statut:0 } (la passe en tire « depot-0 » et retire ce que le coffre aurait gardé)', coupe, { ok: false, statut: 0 });
      const mauvaiseTaille = await enSilence(() => mien.poserCleFlux('beta/base/d.msgbak', f, contenu.length, h.replace(/.$/, h.endsWith('0') ? '1' : '0')));
      v('une empreinte fausse : le coffre la refuse (400), le client rend le statut', [mauvaiseTaille.ok, mauvaiseTaille.statut], [false, 400]);
      const absent = await enSilence(() => mien.poserCleFlux('beta/base/e.msgbak', path.join(bac, 'nexiste-pas.bin'), 10, h));
      v('un fichier local absent → { ok:false, statut:0 }, sans lever', absent, { ok: false, statut: 0 });

      /* Le coffre MUET : il accepte la ligne et ne répond jamais. Avec un silence toléré de 300 ms, le client rend la main aussitôt. */
      const bref = COFFRE.client(coffre.conf(), { muetMs: 300 });
      coffre.regler('muet');
      const t0 = Date.now();
      const borne = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r({ borne: true }), ms))]);   // un client qui ne coupe pas le silence ne doit pas figer le banc : il tombe
      const [mutDepot, mutLecture] = await enSilence(() => Promise.all([borne(bref.poserCleFlux('beta/base/f.msgbak', f, contenu.length, h), 10000), borne(bref.lireCleVers('beta/base/a.msgbak', path.join(bac, 'z.bin')), 10000)]));
      const ecoule = Date.now() - t0;
      coffre.normal();
      v('⛔ un coffre MUET (la ligne reste ouverte, rien ne répond) : dépôt et lecture rendent { ok:false, statut:0 } au silence toléré, pas au bout d\'une heure', [mutDepot, mutLecture, ecoule < 5000, fs.existsSync(path.join(bac, 'z.bin'))], [{ ok: false, statut: 0 }, { ok: false, statut: 0 }, true, false]);
      v('   et la valeur par défaut du silence toléré est de trois minutes (assez pour qu\'un coffre qui vérifie 300 Mo réponde, trop peu pour une heure)', COFFRE.MUET_MS, 180000);
      void originel;
    } finally { await coffre.fermer(); fs.rmSync(bac, { recursive: true, force: true }); }
  }

  /* ══ 16. LES GARDES DE CODE — le texte est lu SANS ses commentaires ═══════════════════════════════════════════════════════════ */
  console.log('\n── 950 · les gardes de code : du CODE, jamais une phrase ──');
  {
    const S1 = code(path.join(SM, 'sauvegarde.js')), R1 = code(path.join(SM, 'outils', 'restaurer.js')), C1 = code(path.join(SM, 'outils', 'controler.js')), ST = code(path.join(SM, 'stockage.js'));
    for (const [nom, c] of [['sauvegarde.js', S1], ['restaurer.js', R1], ['controler.js', C1]]) vrai('population : ' + nom + ' garde du code une fois ses commentaires retirés (' + c.split('\n').filter(l => l.trim()).length + ' lignes)', c.split('\n').filter(l => l.trim()).length > 5);
    v('⛔ aucun `console.` dans le module (il ne parle que par `journaliser`, qui filtre ses champs)', /\bconsole\./.test(S1), false);
    v('⛔ aucun Math.random : un vecteur d\'initialisation ne se tire pas d\'un générateur prévisible', [S1, R1].filter(c => /Math\.random/.test(c)).length, 0);
    vrai('le vecteur d\'initialisation vient de `crypto.randomBytes`, tiré à chaque archive', /const iv = crypto\.randomBytes\(TAILLE_IV\)/.test(S1));
    vrai('AES-256-GCM, et les DEUX premières lignes de l\'archive sont les données associées — à la fabrication ET à l\'ouverture, et l\'étiquette est vérifiée', /createCipheriv\('aes-256-gcm'/.test(S1) && /chiffreur\.setAAD\(entete\)/.test(S1) && /dechiffreur\.setAAD\(h\.entete\)/.test(S1) && /dechiffreur\.setAuthTag\(tag\)/.test(S1));
    vrai('⛔ l\'archive est chiffrée avec la clé de SAUVEGARDE (`cfg.cle`)', /fabriquer\(\{ source: instantaneDb, sortie: archive, cle: cfg\.cle,/.test(S1));
    const debutCfg = S1.indexOf('function lireConfigSauvegarde'), finCfg = S1.indexOf('const nomDe');
    vrai('population : la tranche de la validation de la configuration est trouvée (' + (finCfg - debutCfg) + ' caractères)', debutCfg > 0 && finCfg > debutCfg + 1000);
    v('⛔ la clé MAÎTRE n\'est lue qu\'à UN endroit : la comparaison qui refuse une clé de sauvegarde égale (jamais pour chiffrer, jamais pour le journal)', [(S1.match(/\bkek\b/g) || []).length, (S1.slice(debutCfg, finCfg).match(/\bkek\b/g) || []).length], [(S1.slice(debutCfg, finCfg).match(/\bkek\b/g) || []).length, (S1.slice(debutCfg, finCfg).match(/\bkek\b/g) || []).length]);
    vrai('   et cette comparaison est à temps constant', /crypto\.timingSafeEqual\(cle, kek\)/.test(S1));
    v('⛔ aucun SQL ni accès à la base hors de stockage.js — y compris dans outils/, que test-901 ne parcourt pas', [S1, R1, C1].map(c => /node:sqlite|DatabaseSync|\.prepare\(|\bSELECT\b[^;'"`]{0,60}\bFROM\b|INSERT INTO|DELETE FROM/.test(c)), [false, false, false]);
    const lignesAffichees = R1.split('\n').filter(l => /\bdire\(|\bechec\(|\bconsole\./.test(l));
    vrai('population : ' + lignesAffichees.length + ' lignes de l\'outil de restauration qui AFFICHENT quelque chose', lignesAffichees.length >= 30);
    v('⛔ aucune ne cite la clé de sauvegarde, la clé maître, les clés du coffre, le bucket ou l\'adresse (des noms de variables, oui ; leurs valeurs, jamais)',
      lignesAffichees.filter(l => /cfg\.cle|cfg\.coffre|\.accessKey|\.secretKey|\.bucket|\.endpoint|kekChemin|\bhex\b/.test(l)), []);
    vrai('   l\'outil n\'écrit qu\'UN fichier de contrôle (la date de l\'exercice), puis la base et les pièces restaurées — jamais la configuration', (R1.match(/writeFileSync\(/g) || []).length === 1 && /writeFileSync\(tmp, JSON\.stringify\(Object\.assign\(\{\}, actuel, patch/.test(R1));
    vrai('⛔ la restauration vérifie que le service est ARRÊTÉ avant de mettre une base de côté, et ne supprime jamais l\'ancienne (renommage)', /spawnSync\(ctx\.systemctl/.test(R1) && /fs\.renameSync\(path\.join\(dest, f\), path\.join\(dest, f \+ marque\)\)/.test(R1) && !/unlinkSync\(path\.join\(dest, 'msg\.db'\)\)/.test(R1));
    vrai('⛔ le chantier de la restauration est DANS le dossier cible (même système de fichiers : la mise en place est un renommage, atomique)', /mkdtempSync\(path\.join\(dest, '\.restauration-'\)\)/.test(R1));
    vrai('le contrôle enfant ne reçoit AUCUN secret : le script ne lit ni l\'environnement ni la configuration', !/process\.env|OPMSG_|readFileSync/.test(C1));
    vrai('stockage.js : l\'instantané passe par l\'API de sauvegarde de Node sur une connexion LECTRICE à part, en un pas — et `VACUUM INTO` reste le repli', /new sqlite\.DatabaseSync\(chemin\)/.test(ST) && /sqlite\.backup\(lecteur, vers, \{ rate: PAS_UNIQUE \}\)/.test(ST) && /Q\('VACUUM INTO \?'\)\.run\(vers\)/.test(ST));
    vrai('   jamais sur la connexion du service (`backup(db, …)` : le pas se jouerait entre un BEGIN et un COMMIT du service, et échouerait en « not an error »)', !/sqlite\.backup\(db,/.test(ST));
  }

  /*FIN*/
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
