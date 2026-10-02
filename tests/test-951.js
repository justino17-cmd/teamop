/* ⛔ CE QUE CE FICHIER GARDE — LA SAUVEGARDE HORS SITE D'OP MESSAGES, BRANCHÉE : LE VRAI SERVICE, UN FAUX COFFRE S3, ET LES DEUX OUTILS DE JUSTIN.

   `test-950` monte le module seul. Celui-ci dit que TOUT EST BRANCHÉ — la couture qu'un banc de module ne peut pas voir (la panne du
   19 septembre 2026 sur `server/index.js` : une seule expression en zone morte avait éteint la sauvegarde hors site pendant que le banc
   du module passait au vert). Le VRAI `server-msg/index.js` tourne dans un processus isolé, sa base est la vraie, son coffre est un
   serveur HTTP qui recalcule les signatures S3 (`tests/outils-sauvegarde.js`) — jamais le vrai IONOS, jamais le réseau.

     1. LE SERVICE : la sauvegarde part TOUTE SEULE (sans qu'on la lance), l'archive est au coffre, chiffrée, relue ; `/health` dit vrai
        — exactement quatre champs, sans nom de bucket ni chemin ni motif — et la surveillance les lit tous ;
     2. LA RESTAURATION, EN PROCESSUS : `restaurer.js essai` rend une base lisible et met `essaiJours` à 0 ; une mauvaise clé ne
        touche pas la date ; `restaurer --vers` ne remplace jamais une base sans `--ecraser` ;
     3. LE REFUS AU DÉMARRAGE : une clé de sauvegarde égale à la clé maître, un coffre en http, une rétention de 0 — le service
        refuse de démarrer, dit pourquoi sans citer la valeur, et n'a créé aucun dossier ;
     4. LA PANNE : un coffre qui refuse fait monter `echecs` (et fait crier la surveillance), le service reste debout, l'archive non
        relue est retirée du coffre, et le retour à la normale remet le compteur à zéro ;
     5. `configurer-sauvegarde.js`, joué en entrée redirigée ET sous un vrai terminal : rien de secret à l'écran, le coffre éprouvé
        (dépôt, relecture, liste, effacement, sous le vrai préfixe) AVANT d'écrire, le fichier intact au moindre refus, une clé égale
        à la clé maître refusée, deux saisies différentes refusées, `--verifier`.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « aucun secret » est précédé de la population qu'il aurait pu
   compter (les mêmes chaînes SONT dans le fichier de configuration), et chaque « fichier intact » d'une preuve que le script a bien
   tourné jusqu'au refus. ⛔ ET UN DÉTECTEUR SE PROUVE SUR UN CAS QU'IL DOIT TROUVER. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const T = require('./outils-msg');
const O = require('./outils-sauvegarde');
const S = require('../.github/scripts/surveillance-messages.js');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const SM = T.SERVICE;
const CONFIGURER = path.join(SM, 'configurer-sauvegarde.js');
const RESTAURER = path.join(SM, 'outils', 'restaurer.js');
const code = (f) => T.sansCommentaires(fs.readFileSync(f, 'utf8'));

/* Un processus à part, ASYNCHRONE : le faux coffre vit dans CE processus-ci, et un `spawnSync` figerait sa boucle (le processus
   enfant attendrait un coffre qui ne peut plus répondre). */
function processus(args, { env, entree, delaiMs = 90000 } = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { env: Object.assign({}, process.env, env || {}), stdio: ['pipe', 'pipe', 'pipe'] });
    let sortie = ''; p.stdout.on('data', d => { sortie += d; }); p.stderr.on('data', d => { sortie += d; });
    const t = setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, delaiMs);
    p.on('close', (c) => { clearTimeout(t); resolve({ code: c, sortie }); });
    p.stdin.end(entree === undefined ? '' : entree);
  });
}
/* Ce qui, d'un secret, ne doit apparaître nulle part : lui, ses huit premiers et ses huit derniers caractères. */
const fuites = (texte, secrets) => secrets.filter(s => texte.includes(s) || texte.includes(s.slice(0, 8)) || texte.includes(s.slice(-8)));
const sante = async (svc) => { const r = await T.client(svc.base).get('/health'); return r.j; };

(async () => {
  const coffre = await O.coffreFaux();
  const kek = crypto.randomBytes(32), kekHex = kek.toString('hex');
  const cleSauv = O.cleHex();
  const SECRETS = [coffre.accessKey, coffre.secretKey, cleSauv, kekHex];
  const CANARI = 'CanariPrenomService951K9';
  const base = O.creerBase({ kek });
  let svc = null;
  try {
    /* ══ 1. LE SERVICE — la sauvegarde part toute seule ═════════════════════════════════════════════════════════════════════ */
    console.log('\n── 951 · le VRAI service : la sauvegarde part toute seule, au coffre, chiffrée et relue ──');
    const rempli = O.remplir(base, 30);
    base.pers(CANARI);
    const compte = (b, t) => b.prepare('SELECT COUNT(*) AS n FROM ' + t).get().n;
    const avantService = { personne: 0, conversation: 0, message: 0, membre: 0 };
    {
      const lecteur = T.lireBase(base.chemin);
      for (const t of Object.keys(avantService)) avantService[t] = compte(lecteur, t);
      lecteur.close();
    }
    base.S.fermer();
    /* Une pièce, posée là où le service range les siennes : le premier passage doit l'envoyer. */
    const idPiece = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync(path.join(base.dataDir, 'pieces', idPiece.slice(0, 2)), { recursive: true });
    const contenuPiece = crypto.randomBytes(1500);
    fs.writeFileSync(path.join(base.dataDir, 'pieces', idPiece.slice(0, 2), idPiece), contenuPiece);
    vrai('population : la base porte le canari EN CLAIR (sinon « absent de l\'archive » ne prouverait rien), ' + avantService.personne + ' personnes, ' + avantService.message + ' messages',
      fs.readFileSync(base.chemin).includes(Buffer.from(CANARI)) && avantService.personne >= 3 && avantService.message >= 30);
    void rempli;

    svc = await T.lancerService({ dossier: base.dossier, cle: kekHex, config: { sauvegarde: coffre.conf({ cle: cleSauv, intervalleMs: 1200 }) } });
    const h1 = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.ageH !== null ? h : null; }, 25000, 100);
    vrai('⛔ la sauvegarde PART TOUTE SEULE : sans qu\'on la lance, /health dit qu\'une passe a réussi (ageH non nul) au bout de quelques secondes', !!h1);
    const hs = h1 ? h1.sauvegarde : {};
    v('⛔ /health publie EXACTEMENT quatre champs : configuree, ageH, essaiJours, echecs', Object.keys(hs).sort(), ['ageH', 'configuree', 'echecs', 'essaiJours']);
    v('   configurée, une passe réussie très récente, aucun exercice de restauration, aucun échec', [hs.configuree, typeof hs.ageH, hs.ageH < 1, hs.essaiJours, hs.echecs], [true, 'number', true, null, 0]);
    const brutHealth = JSON.stringify(h1 || {});
    const cfgTexte = fs.readFileSync(svc.cfgPath, 'utf8');
    vrai('population : les chaînes qu\'on cherche SONT dans le fichier de configuration (le bucket, les clés, l\'adresse du coffre)',
      [coffre.bucket, coffre.accessKey, coffre.secretKey, cleSauv, coffre.base].every(x => cfgTexte.includes(x)));
    v('⛔ /health ne publie ni le nom du bucket, ni une clé, ni l\'adresse du coffre, ni un préfixe, ni un nom d\'archive',
      [coffre.bucket, coffre.accessKey, coffre.secretKey, cleSauv, kekHex, coffre.base, 'beta/', '.msgbak', 'base/'].filter(x => brutHealth.includes(x)), []);

    const archives = coffre.cles('beta/base/');
    vrai('⛔ l\'archive de la base est AU COFFRE, sous le préfixe de l\'instance (« beta/base/…msgbak ») : ' + archives.length + ' archive(s)',
      archives.length >= 1 && archives.every(c => /^beta\/base\/\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.msgbak$/.test(c)));
    v('⛔ la pièce est au coffre aussi, sous « beta/pieces/ », de la bonne taille, et son contenu est identique',
      [coffre.cles('beta/pieces/'), (coffre.objets.get('beta/pieces/' + idPiece.slice(0, 2) + '/' + idPiece) || Buffer.alloc(0)).equals(contenuPiece)], [['beta/pieces/' + idPiece.slice(0, 2) + '/' + idPiece], true]);
    v('⛔ chaque requête reçue par le coffre était SIGNÉE JUSTE, et chaque corps portait l\'empreinte qu\'il annonçait (le coffre recalcule les deux)',
      [coffre.vus.length >= 4, coffre.vus.every(x => x.sigOk), coffre.etat.signaturesFausses, coffre.etat.empreintesFausses], [true, true, 0, 0]);
    const archive = coffre.objets.get(archives[archives.length - 1]) || Buffer.alloc(0);
    v('contre-épreuve du détecteur : sur la base elle-même il trouve le canari et la signature SQLite', O.enClair(fs.readFileSync(base.chemin), [CANARI]).length >= 2, true);
    v('⛔ AUCUN canari ni signature SQLite dans l\'archive du coffre — ni brute, ni après décompression (elle est CHIFFRÉE)', [archive.length > 1000, O.enClair(archive, [CANARI])], [true, []]);

    /* La surveillance lit ces champs : un champ publié que personne ne lit est du code mort qui a l'air d'une garde. */
    v('⛔ chaque champ `sauvegarde.*` du /health VIVANT est surveillé ou nommé « vu et pas surveillé »', S.nonClasses(h1 || {}).filter(c => /^sauvegarde\./.test(c)), []);
    const publies = Object.keys(hs).map(k => 'sauvegarde.' + k).sort();
    v('⛔ les champs publiés sont exactement ceux que la surveillance connaît — ni un de plus, ni un de moins',
      publies, S.CHAMPS_SURVEILLES.concat(Object.keys(S.CHAMPS_VUS)).filter(c => /^sauvegarde\./.test(c)).sort());
    v('un /health sain, tel que le service le publie, ne fait rien crier sur la sauvegarde',
      S.evaluer({ ok: true, instance: 'beta', sha: 'a'.repeat(40), sauvegarde: hs }, 'beta').filter(m => /sauvegarde/i.test(m)), []);

    const journal = svc.sortie.texte();
    const lignesSauv = journal.split('\n').filter(l => /"evt":"sauvegarde"/.test(l));
    vrai('population : le journal du service dit ses passes (' + lignesSauv.length + ' ligne(s) « sauvegarde », au moins une « ok »)', lignesSauv.length >= 1 && lignesSauv.some(l => /"etat":"ok"/.test(l)));
    v('⛔ AUCUN secret dans le journal du service (clés du coffre, clé de sauvegarde, clé maître — complets, ni leurs huit premiers/derniers caractères)', fuites(journal, SECRETS), []);
    v('   ni le nom du bucket, ni l\'adresse du coffre', [coffre.bucket, coffre.base].filter(x => journal.includes(x)), []);

    /* ══ 2. LA RESTAURATION, EN PROCESSUS ═══════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 951 · restaurer.js, lancé comme Justin le lancera : liste, essai, vraie restauration ──');
    const bacEssai = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-essai-'));
    const kekFichier = path.join(svc.cred, 'kek');
    const envOutil = { OPMSG_CONFIG: svc.cfgPath, OPMSG_INSTANCE: 'beta', OPMSG_DATA: svc.data, OPMSG_KEK_FILE: kekFichier, OPMSG_ESSAI_DIR: bacEssai, OPMSG_SYSTEMCTL: '/chemin/qui/n/existe/pas' };
    {
      const l = await processus([RESTAURER, 'liste'], { env: envOutil });
      v('`liste` : sortie 0, les archives et les pièces du coffre sont dites', [l.code, /archive\(s\) de base/.test(l.sortie), /pièces au coffre : 1 /.test(l.sortie)], [0, true, true]);
      v('⛔ et rien de secret n\'y figure (ni clé, ni nom de bucket, ni adresse du coffre, ni chemin de configuration)', [fuites(l.sortie, SECRETS), [coffre.bucket, coffre.base, svc.cfgPath].filter(x => l.sortie.includes(x))], [[], []]);

      const avantEssai = fs.existsSync(path.join(svc.data, 'sauvegarde-essai.json'));
      const e = await processus([RESTAURER, 'essai'], { env: envOutil });
      v('population : aucun exercice n\'avait encore été fait (le fichier de la date n\'existait pas), et l\'essai sort en 0', [avantEssai, e.code], [false, 0]);
      vrai('   l\'essai dit ce qu\'il a contrôlé (la sortie a de la substance : ' + e.sortie.length + ' caractères)', e.sortie.length > 200);
      v('⛔ rien de secret dans la sortie de l\'essai', [fuites(e.sortie, SECRETS), [coffre.bucket, coffre.base, svc.cfgPath, kekFichier].filter(x => e.sortie.includes(x))], [[], []]);
      const apres = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.essaiJours !== null ? h : null; }, 5000, 50);
      v('⛔ APRÈS l\'essai, /health dit `essaiJours: 0` — la date que la surveillance lit vient bien du fichier que l\'outil écrit', apres && apres.sauvegarde.essaiJours, 0);
      v('   le dossier jetable de l\'essai a été effacé (rien ne traîne dans le dossier temporaire)', fs.readdirSync(bacEssai), []);
      const lireMarqueur = () => { try { return JSON.parse(fs.readFileSync(path.join(svc.data, 'sauvegarde-essai.json'), 'utf8')); } catch (e) { return {}; } };   // absent : {} (le banc ne meurt pas, il tombe)
      const marqueur = lireMarqueur();
      vrai('   le fichier de la date ne contient que des nombres et des noms d\'archive (aucun secret) : ' + Object.keys(marqueur).sort().join(', '),
        fuites(JSON.stringify(marqueur), SECRETS).length === 0 && Number.isFinite(marqueur.okTs));

      /* Une MAUVAISE clé de sauvegarde : l'essai échoue, dit pourquoi sans citer de clé, et ne touche pas la date du dernier réussi. */
      const autre = O.cleHex();
      const mauvaise = await processus([RESTAURER, 'essai'], { env: Object.assign({}, envOutil, { OPMSG_SAUV_CLE: autre, OPMSG_SAUV_COFFRE: [coffre.base, coffre.bucket, coffre.accessKey, coffre.secretKey, coffre.region].join(',') }) });
      v('⛔ avec une MAUVAISE clé de sauvegarde : sortie 1, le message nomme le déchiffrement, et la date du dernier exercice réussi n\'a pas bougé',
        [mauvaise.code, /déchiffrement impossible/.test(mauvaise.sortie), marqueur.okTs !== undefined && lireMarqueur().okTs === marqueur.okTs], [1, true, true]);
      v('   et la mauvaise clé n\'est pas affichée', fuites(mauvaise.sortie, [autre]), []);

      /* Une MAUVAISE clé maître : l'archive s'ouvre, mais la base ne s'ouvre pas — l'exercice ne doit pas passer pour réussi. */
      const faux = path.join(bacEssai, 'faux.kek'); fs.writeFileSync(faux, O.cleHex() + '\n');
      const horsClef = await processus([RESTAURER, 'essai'], { env: Object.assign({}, envOutil, { OPMSG_KEK_FILE: faux }) });
      vrai('⛔ avec une autre clé MAÎTRE : l\'essai ÉCHOUE (une base qu\'aucune clé de ce serveur n\'ouvre n\'est pas une sauvegarde) et le dit', horsClef.code !== 0 && /clé maître/.test(horsClef.sortie));
      fs.rmSync(faux, { force: true });
    }

    /* La VRAIE restauration, vers un dossier jetable. */
    {
      const dest = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-restauration-'));
      const r = await processus([RESTAURER, 'restaurer', '--vers', dest], { env: envOutil });
      v('`restaurer --vers <dossier neuf>` : sortie 0, la base et la pièce sont là, la base est en 0600',
        [r.code, fs.existsSync(path.join(dest, 'msg.db')), fs.existsSync(path.join(dest, 'pieces', idPiece.slice(0, 2), idPiece)), (fs.statSync(path.join(dest, 'msg.db')).mode & 0o777).toString(8)], [0, true, true, '600']);
      const lecteur = T.lireBase(path.join(dest, 'msg.db'));
      const restaure = {}; for (const t of Object.keys(avantService)) restaure[t] = compte(lecteur, t);
      const canari = lecteur.prepare('SELECT COUNT(*) AS n FROM personne WHERE prenom = ?').get(CANARI).n;
      lecteur.close();
      v('⛔ la base restaurée a les MÊMES lignes que celle du service (personnes, conversations, messages, membres) et la personne-canari y est', [restaure, canari], [avantService, 1]);
      vrai('   et la pièce restaurée est identique à l\'originale', fs.readFileSync(path.join(dest, 'pieces', idPiece.slice(0, 2), idPiece)).equals(contenuPiece));
      v('⛔ rien de secret dans la sortie de la restauration', fuites(r.sortie, SECRETS), []);
      const empreinte = crypto.createHash('sha256').update(fs.readFileSync(path.join(dest, 'msg.db'))).digest('hex');
      const encore = await processus([RESTAURER, 'restaurer', '--vers', dest], { env: envOutil });
      v('⛔ une seconde restauration vers le MÊME dossier est REFUSÉE sans `--ecraser`, et la base n\'a pas bougé d\'un octet',
        [encore.code !== 0, crypto.createHash('sha256').update(fs.readFileSync(path.join(dest, 'msg.db'))).digest('hex') === empreinte, fs.readdirSync(dest).filter(f => /avant-restauration/.test(f))], [true, true, []]);
      /* `--ecraser` : jamais tant que le service TOURNE, et même alors l'ancienne base est mise de côté, pas effacée. */
      const bacOutils = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-systemctl-'));
      const actif = path.join(bacOutils, 'systemctl-actif.sh'); fs.writeFileSync(actif, '#!/bin/sh\nexit 0\n', { mode: 0o755 });
      const arrete = path.join(bacOutils, 'systemctl-arrete.sh'); fs.writeFileSync(arrete, '#!/bin/sh\nexit 3\n', { mode: 0o755 });
      const hashBase = () => crypto.createHash('sha256').update(fs.readFileSync(path.join(dest, 'msg.db'))).digest('hex');
      const surActif = await processus([RESTAURER, 'restaurer', '--vers', dest, '--ecraser'], { env: Object.assign({}, envOutil, { OPMSG_SYSTEMCTL: actif }) });
      v('⛔ `--ecraser` ne suffit pas tant que le service TOURNE : refusé, la base n\'a pas bougé et rien n\'a été mis de côté', [surActif.code !== 0, hashBase() === empreinte, fs.readdirSync(dest).filter(f => /avant-restauration/.test(f))], [true, true, []]);
      const surArrete = await processus([RESTAURER, 'restaurer', '--vers', dest, '--ecraser'], { env: Object.assign({}, envOutil, { OPMSG_SYSTEMCTL: arrete }) });
      v('⛔ service arrêté ET `--ecraser` : la base est remplacée, et l\'ancienne est MISE DE CÔTÉ (jamais effacée)',
        [surArrete.code, fs.readdirSync(dest).filter(f => /^msg\.db\.avant-restauration-/.test(f)).length, fs.existsSync(path.join(dest, 'msg.db'))], [0, 1, true]);
      fs.rmSync(bacOutils, { recursive: true, force: true });
      fs.rmSync(dest, { recursive: true, force: true });
    }
    fs.rmSync(bacEssai, { recursive: true, force: true });

    /* ══ 4. LA PANNE DU COFFRE — se dit, ne fait pas tomber le service, s'efface au retour ═════════════════════════════════ */
    console.log('\n── 951 · un coffre qui refuse : l\'échec se dit dans /health, le service reste debout, le retour à la normale remet à zéro ──');
    {
      const avantArchives = coffre.cles('beta/base/').length;
      coffre.regler('refus-depot');
      const h2 = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.echecs >= 2 ? h : null; }, 25000, 100);
      vrai('⛔ un coffre qui refuse les dépôts : `echecs` monte à 2 au moins (la surveillance crie à 2 de suite)', !!h2);
      v('   et le service est TOUJOURS debout : /health répond, configurée, le processus n\'est pas mort', [!!h2 && h2.ok, !!h2 && h2.sauvegarde.configuree, svc.sorti()], [true, true, null]);
      vrai('   la surveillance CRIE sur ce /health-là (échecs de suite) et son message ne cite aucune valeur', (() => { const m = S.evaluer(h2 || {}, 'beta').filter(x => /sauvegarde/i.test(x)); return m.length >= 1 && fuites(m.join(' '), SECRETS).length === 0; })());
      v('   aucune archive de plus n\'est restée au coffre (rien n\'a été déposé)', coffre.cles('beta/base/').length, avantArchives);
      coffre.normal();
      const h3 = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.echecs === 0 && h.sauvegarde.ageH !== null && coffre.cles('beta/base/').length > avantArchives ? h : null; }, 25000, 100);
      vrai('⛔ le coffre revient : `echecs` retombe à 0 et une nouvelle archive est déposée', !!h3);

      /* Une archive qui NE SE RELIT PAS (le coffre rend un octet de travers) : retirée du coffre, l'échec est compté. */
      const avantCorrompu = coffre.cles('beta/base/').length;
      const n4 = coffre.vus.length;
      coffre.regler('corrompt-relecture');
      const h4 = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.echecs >= 1 ? h : null; }, 25000, 100);
      vrai('⛔ un coffre qui rend l\'archive ABÎMÉE à la relecture : la passe est un échec (`echecs` monte), même si le dépôt avait répondu 200', !!h4);
      coffre.regler('corrompt-relecture', 'refus-depot');   // on fige le coffre pour compter : plus aucun dépôt, et une passe en cours relit encore de travers
      const releve = () => {
        const vus = coffre.vus.slice(n4);
        const dep = vus.filter(x => x.m === 'PUT' && /^beta\/base\//.test(x.cle)).map(x => x.cle), eff = vus.filter(x => x.m === 'DELETE' && /^beta\/base\//.test(x.cle)).map(x => x.cle);
        return { dep, eff, orphelines: dep.filter(c => !eff.includes(c)) };
      };
      /* Au geste, pas au chronomètre : on attend que chaque archive déposée soit effacée (ou, si l'archive recalée est LAISSÉE au coffre, qu'on le constate au bout de dix secondes). */
      await T.attendre(async () => { const r = releve(); return r.dep.length >= 1 && r.orphelines.length === 0 ? true : null; }, 10000, 50);
      const depots = releve().dep, effaces = releve().eff;
      vrai('population : au moins une archive abîmée a été déposée pendant la panne (' + depots.length + ' dépôt(s), ' + effaces.length + ' effacement(s))', depots.length >= 1);
      v('⛔ chaque archive déposée puis NON RELUE a été RETIRÉE du coffre, la même clé (sinon la rétention la compterait comme une copie saine)', depots.filter(c => !effaces.includes(c)), []);
      v('   et le coffre n\'a pas une archive de plus qu\'avant la panne', coffre.cles('beta/base/').length, avantCorrompu);
      coffre.normal();
      const h5 = await T.attendre(async () => { const h = await sante(svc); return h && h.sauvegarde && h.sauvegarde.echecs === 0 ? h : null; }, 25000, 100);
      vrai('   retour à la normale : `echecs` à 0', !!h5);
    }

    await svc.arreter(false);
    v('⛔ un arrêt propre (SIGTERM) : le service sort en 0 AVANT les 4 secondes que laisse le banc (la sauvegarde ne retient pas l\'arrêt)', svc.sorti(), 0);
    svc = null;

    /* ══ 3. LE REFUS AU DÉMARRAGE ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 951 · une configuration de sauvegarde invalide REFUSE le démarrage — avant tout dossier créé, sans citer la valeur ──');
    {
      const cas = [
        ['⛔ une clé de sauvegarde ÉGALE à la clé maître', { cle: 'maitre' }, /clé maître/],
        ['un coffre en http:// vers Internet (la signature ne doit pas voyager en clair)', { endpoint: 'http://coffre.exemple.org' }, /endpoint/],
        ['⛔ une rétention de 0 jour (le coffre serait vidé à chaque passe)', { retentionJours: 0 }, /retentionJours/],
        ['une clé de sauvegarde qui n\'a pas 64 caractères hexadécimaux', { cle: 'abc123' }, /cle doit faire 64/],
        ['un préfixe qui est celui de l\'autre instance (la bêta écrirait chez la production)', { prefixe: 'prod/' }, /prefixe/],
      ];
      for (const [nom, extra, motif] of cas) {
        const cle = O.cleHex();   // la clé maître de CE service
        const bloc = coffre.conf(Object.assign({ cle: cleSauv }, extra, extra.cle === 'maitre' ? { cle } : {}));
        const s = await T.lancerService({ cle, config: { sauvegarde: bloc }, attendreSante: false });
        const mort = await T.attendre(() => s.sorti() !== null, 8000, 25);
        const texte = s.sortie.texte();
        vrai(nom + ' → le service REFUSE de démarrer (code ' + s.sorti() + ') et le dit', mort && s.sorti() !== 0 && motif.test(texte));
        v('   ⛔ sans citer aucune valeur (clés, bucket, adresse du coffre) et sans avoir créé le dossier des données', [fuites(texte, [cle, cleSauv, coffre.accessKey, coffre.secretKey]), [coffre.bucket, coffre.base].filter(x => texte.includes(x)), fs.existsSync(s.data)], [[], [], false]);
        await s.arreter();
      }
    }

    /* ══ 5. configurer-sauvegarde.js ════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 951 · configurer-sauvegarde.js : saisie, épreuve du coffre AVANT d\'écrire, écriture atomique, aucun secret affiché ──');
    {
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cfgsauv-'));
      const chemin = path.join(d, 'beta.json');
      const kekChemin = path.join(d, 'beta.kek');
      const kekConf = O.cleHex(); fs.writeFileSync(kekChemin, kekConf + '\n', { mode: 0o600 });
      const cfgBase = { instance: 'beta', domaine: 'msg-beta.exemple', origine: 'https://msg-beta.exemple', port: 18091, contactEmail: 'contact@exemple', vapidPublicKey: 'vapid-conserve', vapidPrivateKey: 'vapid-privee-conservee', budgetJour: 7, sms: { budgetPaysJour: 2, interdits: ['+2519'] } };
      const poser = (extra) => fs.writeFileSync(chemin, JSON.stringify(Object.assign({}, cfgBase, extra || {}), null, 2), { mode: 0o640 });
      const env = { OPMSG_CONFIG: chemin, OPMSG_KEK_FILE: kekChemin };
      const cle = O.cleHex();
      const SEC = [coffre.accessKey, coffre.secretKey, cle, kekConf];
      const bons = [coffre.base, coffre.bucket, '', coffre.accessKey, coffre.secretKey, cle, cle];
      const configurer = (lignes, extraEnv, args) => processus([CONFIGURER].concat(args || []), { env: Object.assign({}, env, extraEnv || {}), entree: lignes.join('\n') + '\n', delaiMs: 30000 });
      const octets = () => fs.readFileSync(chemin);
      const vusAvant = () => coffre.vus.length;
      const reste = () => fs.readdirSync(d).filter(f => f.includes('.tmp-'));
      try {
        poser();
        const avant = octets();
        const n0 = vusAvant();
        const r = await configurer(bons);
        v('les bonnes valeurs : sortie 0', r.code, 0);
        vrai('population : le script a imprimé de quoi examiner (' + r.sortie.length + ' caractères)', r.sortie.length > 500);
        v('⛔ AUCUN des trois secrets n\'est affiché — ni complet, ni en gros morceau (sortie standard ET d\'erreur) : c\'est la règle « on ne fait jamais afficher un secret sur le VPS »', fuites(r.sortie, SEC), []);
        vrai('   mais les valeurs qui ne sont pas des secrets le sont (l\'adresse et le nom du bucket : Justin vérifie qu\'il a tapé les bons)', r.sortie.includes(coffre.base) && r.sortie.includes(coffre.bucket));
        const vus = coffre.vus.slice(n0).map(x => x.m + (x.liste !== undefined ? ' LISTE ' + x.liste : ' ' + String(x.cle).replace(/-[0-9a-f]{12}\.tmp$/, '-XXXX.tmp')));
        v('⛔ le coffre est ÉPROUVÉ avant d\'écrire : un dépôt, une relecture, une liste, un effacement — tous sous le VRAI préfixe de l\'instance (« beta/ »)',
          vus, ['PUT beta/essai-configuration-XXXX.tmp', 'GET beta/essai-configuration-XXXX.tmp', 'GET LISTE beta/', 'DELETE beta/essai-configuration-XXXX.tmp']);
        vrai('   et l\'objet d\'essai n\'est plus au coffre (la population de départ : une archive ou une pièce n\'a pas été touchée) ; aucune requête n\'était mal signée', coffre.cles('beta/').every(c => !/essai-configuration/.test(c)) && coffre.etat.signaturesFausses === 0 && coffre.vus.slice(n0).every(x => x.sigOk));
        const ecrit = JSON.parse(octets().toString('utf8'));
        const { sauvegarde: bloc, ...autres } = ecrit;
        v('⛔ TOUTES les autres clés de la configuration sont CONSERVÉES (VAPID, origine, budgets, SMS) ; seule `sauvegarde` s\'ajoute', autres, cfgBase);
        v('   les cinq valeurs du coffre et la clé sont rangées, la région prend son défaut',
          [bloc.endpoint, bloc.bucket, bloc.region, bloc.accessKey === coffre.accessKey, bloc.secretKey === coffre.secretKey, bloc.cle === cle], [coffre.base, coffre.bucket, 'eu-central-4', true, true, true]);
        v('⛔ le fichier est en 0600 (les secrets ne sont lisibles que du service) et aucun fichier temporaire n\'est resté', [(fs.statSync(chemin).mode & 0o777).toString(8), reste()], ['600', []]);
        vrai('   et il a changé (la population : « intact » ci-dessous ne vaut que si le fichier PEUT changer)', !octets().equals(avant));

        /* La configuration écrite fait démarrer le VRAI service, sauvegarde configurée. */
        const clePourService = O.cleHex();
        const s = await T.lancerService({ cle: clePourService, config: { sauvegarde: Object.assign({}, bloc) } });
        try {
          const h = await sante(s);
          v('⛔ la configuration écrite par le script fait démarrer le service avec la sauvegarde CONFIGURÉE (la même validation, des deux côtés)', [h.sauvegarde.configuree, h.sauvegarde.echecs], [true, 0]);
        } finally { await s.arreter(); }

        /* La propriété du fichier suit l'ancien (root : le service tourne sous un autre utilisateur). */
        if (typeof process.getuid === 'function' && process.getuid() === 0) {
          poser(); fs.chownSync(chemin, 12345, 12345);
          const c = await configurer(bons);
          const st = fs.statSync(chemin);
          v('⛔ lancé en root, le fichier garde son PROPRIÉTAIRE d\'avant (sinon le service, sous un autre utilisateur, ne pourrait plus le lire)', [c.code, st.uid, st.gid], [0, 12345, 12345]);
        } else {
          const st = fs.statSync(chemin);
          vrai('(hors root : le propriétaire est celui qui lance — vérifié : ' + st.uid + ' = ' + process.getuid() + ')', st.uid === process.getuid());
        }

        /* ── L'ÉPREUVE REFUSE ⇒ le fichier reste OCTET POUR OCTET le même ── */
        const refus = [
          ['⛔ un dépôt REFUSÉ (403 : clé fausse, ou pas le droit d\'écrire)', ['refus-depot-403'], /DÉPÔT REFUSÉ[\s\S]*403/],
          ['un dépôt refusé par une panne du coffre (500)', ['refus-depot'], /DÉPÔT REFUSÉ/],
          ['⛔ un coffre où le dépôt passe mais pas la LECTURE (une sauvegarde qu\'on ne pourrait jamais restaurer)', ['lecture-refusee-essai'], /RELECTURE IMPOSSIBLE/],
          ['⛔ un coffre qui rend un AUTRE contenu (un octet de travers)', ['corrompt-essai'], /RELECTURE DIFFÉRENTE/],
          ['⛔ un coffre où la LISTE est refusée (ni la rétention ni la restauration ne sauraient quoi faire)', ['liste-refusee'], /LISTE REFUSÉE/],
          ['une liste qui n\'a pas l\'objet qu\'on vient de déposer', ['liste-sans-essai'], /LISTE INCOMPLÈTE/],
          ['⛔ un coffre où l\'EFFACEMENT est refusé (la rétention ne pourrait jamais retirer une archive)', ['efface-refuse'], /EFFACEMENT REFUSÉ/],
        ];
        poser();
        const intact = octets();
        for (const [nom, pannes, motif] of refus) {
          coffre.regler(...pannes);
          const n1 = vusAvant();
          const x = await configurer(bons);
          coffre.normal();
          v(nom + ' → sortie 1, le message nomme la cause, rien n\'est écrit', [x.code, motif.test(x.sortie), octets().equals(intact), reste()], [1, true, true, []]);
          vrai('      le script est allé JUSQU\'AU COFFRE (' + (vusAvant() - n1) + ' requête(s) reçues : le refus vient du coffre, pas d\'une garde amont) ; aucun secret n\'est affiché', vusAvant() - n1 >= 1 && fuites(x.sortie, SEC).length === 0);
          /* Il range derrière lui : plus d'objet d'essai au coffre — sauf quand c'est l'effacement lui-même qui est refusé, et le script NOMME alors l'objet à retirer. */
          const restes = coffre.cles('beta/').filter(c => /essai-configuration/.test(c));
          const attendu = pannes.includes('efface-refuse') ? 1 : 0;
          v('      et le coffre est rangé : ' + attendu + ' objet d\'essai resté (' + (attendu ? 'le script le nomme pour qu\'on le retire' : 'il l\'a effacé lui-même') + ')', [restes.length, attendu ? x.sortie.includes(restes[0] || '?') : true], [attendu, true]);
          for (const c of restes) coffre.objets.delete(c);
        }

        /* Une clé secrète fausse : le coffre recalcule la signature et refuse. */
        const faux = await configurer([coffre.base, coffre.bucket, '', coffre.accessKey, 'une-cle-secrete-fausse-0123', cle, cle]);
        v('⛔ une clé secrète FAUSSE : le coffre refuse la signature (403), sortie 1, fichier intact, et la fausse clé n\'est pas affichée',
          [faux.code, /403/.test(faux.sortie), octets().equals(intact), fuites(faux.sortie, ['une-cle-secrete-fausse-0123'])], [1, true, true, []]);
        const mauvaisBucket = await configurer([coffre.base, 'un-autre-bucket', '', coffre.accessKey, coffre.secretKey, cle, cle]);
        v('un bucket inconnu du coffre : sortie 1, « 404 », fichier intact', [mauvaisBucket.code, /404/.test(mauvaisBucket.sortie), octets().equals(intact)], [1, true, true]);
        const injoignable = await configurer(['http://127.0.0.1:1', coffre.bucket, '', coffre.accessKey, coffre.secretKey, cle, cle]);
        v('un coffre injoignable (rien n\'écoute) : sortie 1, il le dit, fichier intact', [injoignable.code, /n'a pas répondu/.test(injoignable.sortie), octets().equals(intact)], [1, true, true]);

        /* ── Les refus AVANT le coffre : forme, clé, deux saisies ── */
        const avantCoffre = [
          ['⛔ une clé de sauvegarde ÉGALE à la clé maître', [coffre.base, coffre.bucket, '', coffre.accessKey, coffre.secretKey, kekConf, kekConf], /clé MAÎTRE/, [kekConf]],
          ['⛔ deux saisies DIFFÉRENTES de la clé (une copie est fausse : rien ne se pose avant de savoir laquelle)', [coffre.base, coffre.bucket, '', coffre.accessKey, coffre.secretKey, cle, cle.slice(0, 30) + (cle[30] === 'a' ? 'b' : 'a') + cle.slice(31)], /ne sont pas identiques[\s\S]*caractère n° 31/, [cle]],
          ['une clé qui n\'a pas 64 caractères', [coffre.base, coffre.bucket, '', coffre.accessKey, coffre.secretKey, cle.slice(0, 63), cle.slice(0, 63)], /64 caractères/, [cle.slice(0, 40)]],
          ['une clé trop régulière (« 0000… »)', [coffre.base, coffre.bucket, '', coffre.accessKey, coffre.secretKey, '0'.repeat(64), '0'.repeat(64)], /trop régulière/, []],
          ['« Object Storage » (le nom du MENU de l\'hébergeur) tapé comme nom de bucket', [coffre.base, 'Object Storage', '', coffre.accessKey, coffre.secretKey, cle, cle], /nom de bucket/, []],
          ['l\'adresse du coffre tapée comme région', [coffre.base, coffre.bucket, 'https://s3.exemple.org', coffre.accessKey, coffre.secretKey, cle, cle], /région/, []],
          ['une adresse de coffre en http:// vers Internet', ['http://exemple.org', coffre.bucket, '', coffre.accessKey, coffre.secretKey, cle, cle], /https/, []],
          ['une valeur manquante (la clé secrète)', [coffre.base, coffre.bucket, '', coffre.accessKey, '', cle, cle], /manque/, []],
          ['une clé d\'accès avec une espace au milieu', [coffre.base, coffre.bucket, '', 'a b c', coffre.secretKey, cle, cle], /accessKey/, []],
        ];
        for (const [nom, lignes, motif, secrets] of avantCoffre) {
          const n2 = vusAvant();
          const x = await configurer(lignes);
          v(nom + ' → sortie 1, refusé AVANT d\'aller déranger le coffre (aucune requête), fichier intact', [x.code, motif.test(x.sortie), vusAvant() - n2, octets().equals(intact)], [1, true, 0, true]);
          v('      et aucun secret saisi n\'est affiché', fuites(x.sortie, SEC.concat(secrets)), []);
        }

        /* ── Le fichier de configuration lui-même ── */
        const sansFichier = await configurer(bons, { OPMSG_CONFIG: path.join(d, 'absent.json') });
        v('⛔ un fichier de configuration qui n\'existe pas : refusé (le script MODIFIE une configuration, il n\'en crée pas)', [sansFichier.code, fs.existsSync(path.join(d, 'absent.json'))], [1, false]);
        const sansVar = await configurer(bons, { OPMSG_CONFIG: '' });
        v('sans OPMSG_CONFIG : refusé', sansVar.code, 1);
        fs.writeFileSync(chemin, '{ pas du json'); const casse = octets();
        const rc = await configurer(bons);
        v('un fichier qui n\'est pas du JSON : refusé, non touché', [rc.code, octets().equals(casse)], [1, true]);
        poser({ instance: undefined });
        const sansInstance = await configurer(bons, { OPMSG_INSTANCE: '' });
        v('⛔ un fichier qui ne dit pas de quelle instance il est (et aucune dans l\'environnement) : refusé', sansInstance.code, 1);
        poser({ instance: 'beta' });
        const contradiction = await configurer(bons, { OPMSG_INSTANCE: 'prod' });
        v('⛔ le fichier dit « beta », l\'environnement dit « prod » : refusé (la sauvegarde de l\'une dans le fichier de l\'autre)', [contradiction.code, /une des deux est fausse/.test(contradiction.sortie)], [1, true]);
        const sansKek = await configurer(bons, { OPMSG_KEK_FILE: path.join(d, 'absente.kek') });
        v('⛔ la clé maître illisible : refusé (on ne peut pas garantir que la clé de sauvegarde en est différente — et le service refuserait de démarrer)', [sansKek.code, /clé maître n'est pas lisible/.test(sansKek.sortie)], [1, true]);
        const optionInconnue = await configurer(bons, {}, ['--generer']);
        v('une option inconnue : refusée (le script ne GÉNÈRE aucune clé, et ne l\'affiche pas)', [optionInconnue.code, /option inconnue/.test(optionInconnue.sortie)], [1, true]);

        /* ── Remplacer une sauvegarde qui existe déjà ── */
        const ancienne = O.cleHex();
        poser({ sauvegarde: { endpoint: coffre.base, bucket: coffre.bucket, region: 'eu-central-4', accessKey: 'ANCIENNE-ACCES-1234', secretKey: 'ancienne-secrete-1234', cle: ancienne, retentionJours: 21, intervalleMin: 30 } });
        const avecAncienne = octets();
        const n3 = vusAvant();
        const non = await configurer(bons.concat(['non']));
        v('⛔ remplacer une sauvegarde par une clé DIFFÉRENTE demande « oui » : à « non », sortie 1, fichier intact, et le coffre n\'a pas été dérangé',
          [non.code, /DIFFÉRENTE[\s\S]*ANCIENNE clé/.test(non.sortie), octets().equals(avecAncienne), vusAvant() - n3, fuites(non.sortie, SEC.concat([ancienne]))], [1, true, true, 0, []]);
        const rien = await configurer(bons);
        v('   sans réponse du tout (fin de l\'entrée) : on s\'arrête aussi — jamais « oui » par défaut', [rien.code, octets().equals(avecAncienne)], [1, true]);
        const oui = await configurer(bons.concat(['oui']));
        const apresOui = JSON.parse(octets().toString('utf8')).sauvegarde;
        v('à « oui » : remplacée (nouvelle clé et nouveaux identifiants), et le rythme et la rétention déjà réglés sont CONSERVÉS',
          [oui.code, apresOui.cle === cle, apresOui.accessKey === coffre.accessKey, apresOui.retentionJours, apresOui.intervalleMin], [0, true, true, 21, 30]);
        v('   la sortie ne contient ni l\'ancienne clé, ni la nouvelle', fuites(oui.sortie, SEC.concat([ancienne])), []);
        const memeCle = await configurer(bons);
        v('la MÊME clé et le même coffre (on change seulement une clé d\'accès) : aucun « oui » demandé', [memeCle.code, /Tape « oui »/.test(memeCle.sortie)], [0, false]);

        /* ── Le fichier temporaire est créé en 0600 DÈS L'ÉCRITURE ── */
        {
          poser(); fs.chmodSync(chemin, 0o644);
          const journalModes = path.join(d, 'modes.txt'), precharge = path.join(d, 'precharge.js');
          fs.writeFileSync(precharge, "const fs = require('fs'), ecrire = fs.writeFileSync; fs.writeFileSync = function (f, ...r) { const x = ecrire.call(this, f, ...r); if (String(f).includes('.tmp-')) fs.appendFileSync(" + JSON.stringify(journalModes) + ", (fs.statSync(f).mode & 0o777).toString(8) + '\\n'); return x; };");
          const x = await configurer(bons, { NODE_OPTIONS: '--require ' + precharge });
          const modes = fs.existsSync(journalModes) ? fs.readFileSync(journalModes, 'utf8').trim().split('\n') : [];
          vrai('la population : le fichier temporaire a été écrit au moins une fois (' + modes.length + ') et le script a réussi (' + x.code + ')', modes.length >= 1 && x.code === 0);
          v('⛔ chaque écriture du fichier temporaire (les trois secrets) le crée en 0600 : aucun instant où il est lisible par tous', modes.filter(m => m !== '600'), []);
        }

        /* ── --verifier : relire une copie de la clé, sans l'afficher ── */
        poser(); await configurer(bons);
        const verif = (saisie) => configurer([saisie], {}, ['--verifier']);
        const identique = await verif(cle.toUpperCase());
        v('--verifier : la copie IDENTIQUE (même en majuscules) → sortie 0, « identique »', [identique.code, /✓ identique/.test(identique.sortie), /longueur : 64 \(attendu 64\)/.test(identique.sortie)], [0, true, true]);
        v('   ⛔ et la clé n\'est pas affichée (ni elle, ni ses extrémités)', fuites(identique.sortie, [cle]), []);
        const espaces = await verif(cle.slice(0, 16) + ' ' + cle.slice(16, 40) + '  ' + cle.slice(40));
        v('   une copie recopiée à la main, par groupes (espaces) → identique aussi', [espaces.code, /✓ identique/.test(espaces.sortie)], [0, true]);
        const fautive = await verif(cle.slice(0, 20) + (cle[20] === 'f' ? '0' : 'f') + cle.slice(21));
        v('⛔ une copie fausse (un caractère) → sortie 1 et la POSITION du premier écart, jamais le caractère', [fautive.code, /✗ différente — première différence : caractère n° 21/.test(fautive.sortie), fuites(fautive.sortie, [cle])], [1, true, []]);
        const courte = await verif(cle.slice(0, 50));
        v('   une copie tronquée → sortie 1, la longueur dit pourquoi', [courte.code, /longueur : 50 \(attendu 64\)/.test(courte.sortie), /caractère n° 51/.test(courte.sortie)], [1, true, true]);
        const maitre = await verif(kekConf);
        v('⛔ la copie de la clé MAÎTRE donnée à la place : sortie 1, et le script dit que c\'est l\'autre clé', [maitre.code, /clé MAÎTRE/.test(maitre.sortie), fuites(maitre.sortie, [kekConf, cle])], [1, true, []]);
        poser();
        const sansBloc = await verif(cle);
        v('--verifier sans aucune sauvegarde configurée : sortie 1, il le dit (rien à comparer)', [sansBloc.code, /aucune sauvegarde n'est configurée/.test(sansBloc.sortie)], [1, true]);
      } finally { fs.rmSync(d, { recursive: true, force: true }); }
    }

    /* ── Le terminal : une faute corrigée, une flèche, un collage, Ctrl-C — RIEN de secret ne doit s'afficher ── */
    console.log('\n── 951 · configurer-sauvegarde.js SOUS UN VRAI TERMINAL (pty) : une faute corrigée, une flèche, un collage, Ctrl-C ──');
    {
      /* ⛔ LE HARNAIS TAPE QUAND L'INVITE EST À L'ÉCRAN, PAS APRÈS UN DÉLAI : sur une machine chargée, Node met plus d'une seconde à démarrer, et ce
         qu'on tape avant que le programme passe en mode brut est repris par le PILOTE du terminal — qui l'écrit à l'écran (l'écho du mode
         ligne), secrets compris. Une personne ne tape pas avant l'invite ; le banc non plus. Il attend aussi que le programme SORTE (au plus vingt secondes). */
      const PTY_PY = `
import os, pty, sys, time, select, json
envx, node, script = sys.argv[1:4]
env = dict(os.environ); env.update(json.loads(envx))
pid, fd = pty.fork()
if pid == 0:
    os.execvpe(node, [node, script] + json.loads(sys.argv[5]), env)
out = b''
fini = False
def lire(t):
    global out, fini
    fin = time.time() + t
    while time.time() < fin and not fini:
        r, _, _ = select.select([fd], [], [], 0.05)
        if r:
            try: d = os.read(fd, 4096)
            except OSError:
                fini = True; return
            if not d:
                fini = True; return
            out += d
def attendre(texte, t=20):
    fin = time.time() + t
    cible = texte.encode('utf8')
    while cible not in out and time.time() < fin and not fini:
        lire(0.05)
def envoyer(s, t=0.25):
    os.write(fd, s); lire(t)
for etape in json.loads(sys.argv[4]):
    if etape[2]: attendre(etape[2])
    envoyer(bytes.fromhex(etape[0]), etape[1])
fin = time.time() + 20
while not fini and time.time() < fin:
    lire(0.1)
lire(0.2)
try:
    _, statut = os.waitpid(pid, os.WNOHANG)
except Exception:
    statut = 0
print(json.dumps({'sortie': out.decode('utf8', 'replace'), 'statut': statut}))
`;
      const configurerPty = (envx, etapes, args = []) => new Promise((resolve) => {
        const p = spawn('python3', ['-c', PTY_PY, JSON.stringify(envx), process.execPath, CONFIGURER, JSON.stringify(etapes.map(([txt, t, attente]) => [Buffer.from(txt, 'utf8').toString('hex'), t || 0.25, attente || ''])), JSON.stringify(args)], { stdio: ['ignore', 'pipe', 'pipe'] });
        let sortie = '', err = ''; p.stdout.on('data', x => { sortie += x; }); p.stderr.on('data', x => { err += x; });
        p.on('error', () => resolve({ introuvable: true, sortie: '' }));
        p.on('close', () => { try { resolve(JSON.parse(sortie)); } catch (e) { resolve({ illisible: true, sortie: sortie + err }); } });
        setTimeout(() => { try { p.kill('SIGKILL'); } catch (e) { /* déjà parti */ } }, 60000).unref();
      });
      const d = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-cfgsauv-pty-'));
      const chemin = path.join(d, 'beta.json'), kekChemin = path.join(d, 'beta.kek');
      const kekConf = O.cleHex(); fs.writeFileSync(kekChemin, kekConf + '\n', { mode: 0o600 });
      const initial = JSON.stringify({ instance: 'beta', domaine: 'msg-beta.exemple', vapidPublicKey: 'vapid-conserve' });
      fs.writeFileSync(chemin, initial, { mode: 0o640 });
      const cle = O.cleHex(), secrets = [coffre.accessKey, coffre.secretKey, cle, kekConf];
      try {
        const etapes = [
          [coffre.base + '\r', 0, 'Adresse du coffre'], [coffre.bucket + '\r', 0, 'Nom du bucket'], ['\r', 0, 'Région'],   // adresse, bucket, région par défaut : visibles
          [coffre.accessKey + 'X', 0, 'Clé d\'accès du coffre'], ['\x7f'], ['\r', 0.4],                                       // clé d'accès : une lettre en trop, corrigée par RETOUR ARRIÈRE
          [coffre.secretKey.slice(0, -1), 0, 'Clé secrète du coffre'], ['\x1b[D'], ['\x1b[H'], ['\x1b[F'], [coffre.secretKey.slice(-1)], ['\r', 0.4],   // clé secrète : flèche gauche, Début, Fin
          [cle + '\r', 0.4, 'Clé de sauvegarde (masquée)'],                                                                   // clé de sauvegarde : un COLLAGE d'un bloc
          [cle.slice(0, 30), 0, 'La même, RELUE'], ['\x15'], [cle + '\r', 0.4],                                                // la même : trente caractères, Ctrl-U efface la ligne, puis le collage entier
        ];
        const n0 = coffre.vus.length;
        const r = await configurerPty({ OPMSG_CONFIG: chemin, OPMSG_KEK_FILE: kekChemin }, etapes);
        if (r.introuvable || r.illisible) vrai('⛔ python3 est requis pour jouer la saisie sous un vrai terminal (' + (r.introuvable ? 'introuvable' : 'sortie illisible : ' + String(r.sortie).slice(0, 200)) + ')', false);
        else {
          const t = r.sortie;
          vrai('la population : le terminal a affiché les invites et le nom du bucket (' + t.length + ' caractères)', t.includes('Clé de sauvegarde') && t.includes(coffre.bucket));
          v('⛔ AUCUN secret, ni complet ni en gros morceau (8 premiers et 8 derniers caractères), n\'apparaît à l\'écran — ni à la frappe, ni après un retour arrière, une flèche, Ctrl-U ou un collage',
            fuites(t, secrets), []);
          const ecrit = JSON.parse(fs.readFileSync(chemin, 'utf8'));
          v('   et les valeurs rangées sont les BONNES (la faute corrigée n\'est pas dedans ; la flèche n\'a pas déplacé le texte ; Ctrl-U a bien effacé les trente caractères)',
            [ecrit.sauvegarde && ecrit.sauvegarde.accessKey === coffre.accessKey, ecrit.sauvegarde && ecrit.sauvegarde.secretKey === coffre.secretKey, ecrit.sauvegarde && ecrit.sauvegarde.cle === cle], [true, true, true]);
          v('   le coffre a été éprouvé (dépôt, relecture, liste, effacement) et la sortie le dit', [coffre.vus.length - n0, /coffre joignable/.test(t)], [4, true]);
          vrai('   le terminal est rendu en état normal (le script a quitté, le curseur est revenu à la ligne)', /mis à jour/.test(t));
        }
        /* Ctrl-C au milieu d'une saisie masquée : rien n'est écrit. */
        fs.writeFileSync(chemin, initial); const avant = fs.readFileSync(chemin);
        const c = await configurerPty({ OPMSG_CONFIG: chemin, OPMSG_KEK_FILE: kekChemin }, [[coffre.base + '\r', 0, 'Adresse du coffre'], [coffre.bucket + '\r', 0, 'Nom du bucket'], ['\r', 0, 'Région'], [coffre.accessKey.slice(0, 5), 0, 'Clé d\'accès du coffre'], ['\x03', 0.6]]);
        vrai('Ctrl-C au milieu d\'une saisie masquée : « Abandon », le fichier est intact, et ce qui était tapé n\'est pas affiché',
          !c.introuvable && /Abandon/.test(c.sortie || '') && fs.readFileSync(chemin).equals(avant) && !(c.sortie || '').includes(coffre.accessKey.slice(0, 5)));
        /* --verifier sous terminal : la copie se tape (une faute corrigée par retour arrière) et rien ne s'affiche. */
        fs.writeFileSync(chemin, JSON.stringify(Object.assign(JSON.parse(initial), { sauvegarde: { endpoint: coffre.base, bucket: coffre.bucket, region: 'eu-central-4', accessKey: coffre.accessKey, secretKey: coffre.secretKey, cle } })), { mode: 0o600 });
        const vv = await configurerPty({ OPMSG_CONFIG: chemin, OPMSG_KEK_FILE: kekChemin }, [[cle + 'X', 0, 'Colle (ou tape)'], ['\x7f'], ['\r', 0.4]], ['--verifier']);
        v('--verifier SOUS TERMINAL : la copie tapée (une faute corrigée) est dite identique, et elle n\'apparaît pas à l\'écran',
          [!vv.introuvable && /✓ identique/.test(vv.sortie || ''), fuites(vv.sortie || '', secrets)], [true, []]);
      } finally { fs.rmSync(d, { recursive: true, force: true }); }
    }

    /* ══ 6. LES GARDES DE CODE — le texte lu SANS ses commentaires ═════════════════════════════════════════════════════════ */
    console.log('\n── 951 · les gardes de code (commentaires retirés : un motif de banc vise du CODE, jamais la phrase qui l\'explique) ──');
    {
      const conf = code(CONFIGURER), saisie = code(path.join(SM, 'saisie.js')), index = code(path.join(SM, 'index.js'));
      vrai('population : le code du configurateur n\'est pas vide une fois ses commentaires retirés (' + conf.split('\n').filter(l => l.trim()).length + ' lignes)', conf.split('\n').filter(l => l.trim()).length > 80);
      vrai('⛔ aucune clé n\'est GÉNÉRÉE ici (OP GESTION l\'imprimait ; la règle du 24 septembre l\'interdit) : ni randomBytes(32), ni openssl, ni crypto.generateKey', !/randomBytes\(\s*32\s*\)|openssl|generateKey|generateKeySync/.test(conf));
      vrai('⛔ le seul argument de ligne de commande lu est l\'option --verifier (jamais un secret : `ps` le montrerait à toute la machine)', (conf.match(/process\.argv/g) || []).length === 1 && /ARGS\.includes\('--verifier'\)/.test(conf) && /a !== '--verifier'/.test(conf));
      vrai('⛔ la saisie est en MODE BRUT (`setRawMode`), sans `readline` (qui redessine la ligne — et les secrets — à chaque correction), et une valeur masquée n\'est JAMAIS réécrite, même redirigée', /setRawMode\(true\)/.test(saisie) && !/readline/.test(saisie) && /\(masque \? '' : r\)/.test(saisie) && /require\('\.\/saisie'\)/.test(conf));
      vrai('⛔ le fichier est écrit en 0600 DÈS sa création (`mode`, flag `wx`), le propriétaire de l\'ancien est recopié, et il est relu et revalidé AVANT d\'être renommé', /mode: 0o600, flag: 'wx'/.test(conf) && /chownSync\(tmp, st\.uid, st\.gid\)/.test(conf) && conf.indexOf('lireConfigSauvegarde(relu.sauvegarde') > 0 && conf.indexOf('lireConfigSauvegarde(relu.sauvegarde') < conf.indexOf('renameSync(tmp, CONFIG_PATH)'));
      vrai('⛔ il valide avec la MÊME fonction que le démarrage du service (`lireConfigSauvegarde`), avant ET après l\'écriture', (conf.match(/lireConfigSauvegarde\(/g) || []).length >= 3 && /lireConfigSauvegarde\b/.test(index));
      const iEpreuve = conf.indexOf('await eprouverCoffre(valide)'), iEcrire = conf.search(/^\s*ecrire\(config, bloc,/m);   // l'APPEL (la définition, `function ecrire(`, vient plus haut)
      vrai('⛔ l\'épreuve du coffre précède l\'écriture du fichier (' + iEpreuve + ' < ' + iEcrire + ')', iEpreuve > 0 && iEcrire > iEpreuve);
      const iKek = conf.indexOf('if (!kek) echec'), iSaisie = conf.indexOf("await demander('Adresse du coffre");   // la première question du programme (celles de `verifier` viennent plus haut)
      vrai('   la clé maître est lue (et son absence refusée) AVANT de demander quoi que ce soit', iKek > 0 && iSaisie > iKek);
      vrai('   la clé maître est comparée à la clé saisie en octets (`.equals(kek)`) et la comparaison ne dépend pas d\'un affichage', /\.equals\(kek\)/.test(conf));
      vrai('⛔ aucun `console.` du configurateur n\'imprime une valeur secrète par son nom de variable (accessKey, secretKey, cle1, cle2, posee, saisie)',
        !/console\.(log|error)\([^;\n]*\b(accessKey|secretKey|cle1|cle2|posee|saisie)\b(?!\.length)/.test(conf.replace(/'[^'\n]*'/g, "''")));
      vrai('   et le service dépend du module de sauvegarde : validé AVANT tout dossier créé, démarré après les minuteries, arrêté avant la base',
        /lireConfigSauvegarde\(config\.sauvegarde/.test(index) && /sauvegarde\.demarrer\(\)/.test(index) && /await sauvegarde\.arreter\(\)/.test(index) && index.indexOf('lireConfigSauvegarde(config.sauvegarde') < index.indexOf('mkdirSync(config.dataDir') && index.indexOf('await sauvegarde.arreter()') < index.indexOf('stockage.fermer()'));
      vrai('   /health publie `sauvegarde.sante()`', /sauvegarde: sauvegarde\.sante\(\)/.test(index));

      /* ── Le MODE D'EMPLOI de Justin dit ce que le code fait : un guide qui cite un écran qui n'existe plus est pire que pas de guide ── */
      const guide = fs.readFileSync(path.join(O.RACINE, 'design', 'opmessages', 'INSTALLER-LE-SERVEUR.md'), 'utf8');
      const iDeb = guide.indexOf('## 10 ter.'), iFin = guide.indexOf('## 11.');
      const sect = iDeb > 0 && iFin > iDeb ? guide.slice(iDeb, iFin) : '';
      vrai('population : la section « 10 ter » du guide est trouvée (' + sect.length + ' caractères)', sect.length > 4000);
      const scripts = [...sect.matchAll(/node \/opt\/opmsg\/beta\/current\/(\S+)/g)].map(m => m[1]);
      vrai('population : le guide fait lancer ' + scripts.length + ' commandes node', scripts.length >= 4);
      v('⛔ chaque script que le guide fait lancer EXISTE dans server-msg/', scripts.filter(f => !fs.existsSync(path.join(SM, f))), []);
      v('⛔ les quatre refus du coffre que le guide cite sont ceux que le script écrit', ['DÉPÔT REFUSÉ', 'RELECTURE IMPOSSIBLE', 'LISTE REFUSÉE', 'EFFACEMENT REFUSÉ'].filter(m => !sect.includes(m) || !conf.includes(m)), []);
      vrai('⛔ la phrase de réussite que le guide cite est celle de l\'outil de restauration', sect.includes('CETTE SAUVEGARDE EST RESTAURABLE') && code(RESTAURER).includes('CETTE SAUVEGARDE EST RESTAURABLE'));
      const restau = code(RESTAURER);
      vrai('⛔ les options que le guide fait taper existent dans le code (--verifier ; --ecraser, --date, --vers)', /--verifier/.test(sect) && /--verifier/.test(conf) && ['--ecraser', '--date', '--vers'].every(o => sect.includes(o) && restau.includes("'" + o + "'")));
      const questions = conf.slice(conf.indexOf("await demander('Adresse du coffre"), conf.indexOf('if (!endpoint ||'));
      v('⛔ le guide annonce « sept choses » et le script en demande sept (hors la confirmation « oui »)', [/Il demande sept choses/.test(sect), (questions.match(/await demander\(/g) || []).length], [true, 7]);
      const modele = /`("sauvegarde":\{[^`]*\})`/.exec(sect);
      v('⛔ l\'exemple de /health du guide a EXACTEMENT les champs, dans l\'ordre, que le service publie', modele ? Object.keys(JSON.parse('{' + modele[1] + '}').sauvegarde) : null, Object.keys(hs));
      const env = [...sect.matchAll(/\b(OPMSG_[A-Z_]+)=/g)].map(m => m[1]);
      v('⛔ chaque variable d\'environnement que le guide fait poser est lue par le code (configurateur ou outil de restauration)', [...new Set(env)].filter(e => !conf.includes(e) && !restau.includes(e)), []);
    }
  } finally {
    if (svc) await svc.arreter();
    await coffre.fermer();
    base.nettoyer();
  }
  fin();
})().catch((e) => { console.error('✗ banc interrompu : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; fin(); });
