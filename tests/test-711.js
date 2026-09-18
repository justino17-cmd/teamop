/* ══ ÉTAPE 0 DU SOCLE — LES PIÈCES JOINTES SORTENT DU DOCUMENT, ET NE SE MÉLANGENT PAS ══════

   Justin, 16 septembre 2026 : « bon aller ont commence go », après le relevé des concurrents
   (`COMMENT-FONT-LES-AUTRES.md`). Organilog VEND le stockage — 100 Go à 19 €, 400 Go à 35 €,
   600 Go à 59 € par utilisateur et par mois. Chez nous `syncAlleger` (`app.html:7102`) RETIRE
   les pièces de la copie poussée pour tenir sous le plafond de 1 Mio d'un document Firestore :
   un technicien photographie un poste d'appâtage, son collègue ne verra jamais la photo.

   ⛔ CE QUE CE BANC GARDE, ET POURQUOI IL LANCE LE VRAI SERVEUR.
   Ce module crée un stockage NEUF sur le VPS, alimenté par des appareils de terrain. Trois
   choses peuvent mal tourner, et aucune ne se voit en relisant le code :
     1. LE CLOISONNEMENT. Une entreprise qui lit la pièce d'une autre, c'est la fuite de photos
        de sites de clients. Le dossier par entreprise le rend structurel — encore faut-il
        l'avoir ÉPROUVÉ, en présentant la clé de A pour demander la pièce de B.
     2. LA TRAVERSÉE DE CHEMIN. `id` finit dans un nom de fichier. Un `../../` non filtré et la
        route lit n'importe quoi sur le disque du VPS.
     3. L'EFFACEMENT. Un stockage neuf qu'on oublie d'effacer à la fermeture d'une entreprise
        laisse des photos de clients sur le disque, sous un identifiant que plus rien ne
        référence. C'est la leçon des quatre portes de `fbRevoquerEquipe` (`CLAUDE.md`) :
        une porte oubliée rend le geste aléatoire.

   Il lance donc le VRAI serveur, isolé (configuration, données et port à lui), et lui parle en
   HTTP — comme `tests/test-641.js`. ⚠️ Il ne vise JAMAIS `api.teamop.fr`.
   Il saute de lui-même sa partie exécutée si `server/node_modules` manque, et le dit avec le
   mot SAUTÉE, que la CI cherche. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { spawn } = require('child_process');
const RACINE = path.join(__dirname, '..');
const SRV = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
const MOD = fs.readFileSync(path.join(RACINE, 'server', 'pieces.js'), 'utf8');

let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };

/* ══ 1. CE QUI SE LIT DANS LE FICHIER ═══════════════════════════════════════════════════════ */
console.log('\n── 711 · aucune porte neuve : tout passe par la garde des copies ──');
v('les quatre routes existent', ['deposer', 'lire', 'supprimer', 'etat'].every(r => MOD.indexOf("'/api/pieces/" + r + "'") > 0), true);
/* ⛔ `porte()` fait l'identité, `sauvRefus` et le quota. Une route qui l'oublierait s'ouvrirait
   sans preuve de clé — et le module entier deviendrait un dépôt public. */
v('⛔ chaque route commence par porte()', (MOD.match(/const p = porte\(req, res,/g) || []).length, 4);
v('⛔ et porte() appelle sauvRefus — pas une garde réécrite à sa façon', /sauvRefus\(t, kh/.test(MOD), true);
v('⛔ sauvRefus n\'est PAS redéfinie dans ce module', /function sauvRefus/.test(MOD), false);
v('un identifiant est 64 hexadécimaux, rien d\'autre', /\^\[0-9a-f\]\{64\}\$/.test(MOD), true);
v('⛔ l\'identifiant est CALCULÉ à la réception, jamais reçu', /createHash\('sha256'\)/.test(MOD) && !/monStr\(p\.b\.id[^)]*\)[^;]*;\s*[^]{0,80}fichier\(p\.t, id\)\s*\)\s*;\s*\n\s*fs\.writeFile/.test(MOD), true);

console.log('\n── 711 · les portes qui effacent une entreprise effacent ses pièces ──');
/* ⛔ TROIS portes effacent vraiment les données d'une entreprise : « repartir à neuf » (qui
   efface le document de l'ANCIEN espace), « retirer un client » et « supprimer l'entreprise ».
   Les trois doivent emporter les pièces. */
v('⛔ trois appels à effacerEntreprise, pas moins', (SRV.match(/pieces\.effacerEntreprise\(/g) || []).length, 3);
['espaces/renaitre', 'clients/retirer', 'entreprise/supprimer'].forEach(r => {
  const i = SRV.indexOf("app.post('/api/monitor/" + r + "'");
  const fin = SRV.indexOf("\napp.", i + 10);
  v('⛔ ' + r + ' efface les pièces', i > 0 && SRV.slice(i, fin > i ? fin : SRV.length).indexOf('pieces.effacerEntreprise') > 0, true);
});
/* ⚠️ ET SUSPENDRE N'EFFACE RIEN. Une suspension se lève ; si elle effaçait les photos, rouvrir
   rendrait une entreprise amputée — sans que rien ne le dise. Le contre-test compte autant que
   le test : un effacement qui part trop large est une perte de données, pas une sécurité. */
{ const i = SRV.indexOf("app.post('/api/monitor/espaces/suspendre'"); const fin = SRV.indexOf("\napp.", i + 10);
  v('⚠️ suspendre n\'efface AUCUNE pièce (une suspension se lève)',
    i > 0 && SRV.slice(i, fin > i ? fin : SRV.length).indexOf('effacerEntreprise') < 0, true); }
v('effacerEntreprise rend un NOMBRE, jamais true', /return n;\s*\n\s*\},/.test(MOD), true);

console.log('\n── 711 · /health reste agrégé (il est public) ──');
{ const i = SRV.indexOf("app.get('/health'"); const bloc = SRV.slice(i, i + 3000);
  v('/health passe par sante(), pas par le total exact', bloc.indexOf('pieces.sante()') > 0, true);
  v('⛔ et surtout PAS par total() — il est publique', bloc.indexOf('pieces.total()') < 0, true);
  /* ⛔ `sante()` ne rend qu'un palier arrondi. Le poids exact des pièces est un journal de
     l'activité de terrain de tous les clients : il monte quand les techniciens photographient,
     il stagne le dimanche. Même règle que `mailRefus`. */
  const t = MOD.slice(MOD.indexOf('sante()'), MOD.indexOf('sante()') + 200);
  v('⛔ sante() arrondit à 5 %', /Math\.round\(\(total\(\) \/ maxTot\) \* 20\) \* 5/.test(t), true);
  /* Sur l'objet RENDU, pas sur un voisinage de texte : un premier jet découpait 200 caractères
     et attrapait la fonction `total()` qui suit, donc le contrôle rougissait pour rien. */
  const ret = /return \{ remplissage: pct, plafond: maxTot \};/.exec(t);
  v('⛔ … et ne rend QUE le palier et le plafond, aucun compte d\'octets', !!ret, true); }

/* ══ 2. LE VRAI SERVEUR ═════════════════════════════════════════════════════════════════════ */
const banc = path.join(require('os').tmpdir(), 'teamop-test-711-' + process.pid);
let enfant = null;
function stop() { try { if (enfant && enfant.pid) process.kill(enfant.pid); } catch (e) {} try { fs.rmSync(banc, { recursive: true, force: true }); } catch (e) {} }

(async () => {
  let webpush;
  try { webpush = require(path.join(RACINE, 'server', 'node_modules', 'web-push')); }
  catch (e) {
    console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)');
    console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0);
  }

  const sha = x => crypto.createHash('sha256').update(String(x)).digest('hex');
  const b64 = o => Buffer.from(JSON.stringify(o)).toString('base64');
  const CLE_A = 'CLE-DE-A-2026', CLE_B = 'CLE-DE-B-2026';
  const TA = 'ent-a', TB = 'ent-b', TF = 'ent-fermee';
  const KHA = sha(CLE_A), KHB = sha(CLE_B);

  fs.mkdirSync(path.join(banc, 'data'), { recursive: true });
  const vap = webpush.generateVAPIDKeys();
  fs.writeFileSync(path.join(banc, 'config.json'), JSON.stringify({
    vapidPublicKey: vap.publicKey, vapidPrivateKey: vap.privateKey, adminPassHash: sha('mdp-du-banc'),
    /* Un plafond minuscule : on veut EXERCER le refus « plein », pas écrire 512 Mio sur le
       disque d'un banc d'essai. C'est le réglage réel, pas un chemin de test à part. */
    piecesMaxOctets: 6000, piecesMaxNombre: 5, piecesPlancherDisque: 1 }));
  fs.writeFileSync(path.join(banc, 'data', 'espaces.json'), JSON.stringify({
    a: { slug: 'a', nom: 'A', email: 'a@exemple.fr', t: TA, code: b64({ t: TA, k: CLE_A }), ts: 1 },
    b: { slug: 'b', nom: 'B', email: 'b@exemple.fr', t: TB, code: b64({ t: TB, k: CLE_B }), ts: 1 },
    f: { slug: 'f', nom: 'F', email: 'f@exemple.fr', t: TF, code: b64({ t: TF, k: CLE_A }), ts: 1 } }));
  fs.writeFileSync(path.join(banc, 'data', 'entreprises-fermees.json'), JSON.stringify({ emails: [], espaces: [TF], suspendus: [] }));

  const PORT = 8800 + (process.pid % 90);
  enfant = spawn(process.execPath, [path.join(RACINE, 'server', 'index.js')], {
    env: Object.assign({}, process.env, { TEAMOP_CONFIG: path.join(banc, 'config.json'), TEAMOP_DATA: path.join(banc, 'data'), PORT: String(PORT) }),
    stdio: 'ignore' });
  const B = 'http://127.0.0.1:' + PORT;
  for (let i = 0; i < 80; i++) { try { await fetch(B + '/health'); break; } catch (e) { await new Promise(r => setTimeout(r, 100)); } }

  const post = async (c, corps) => {
    const r = await fetch(B + c, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });
    let j = null; try { j = await r.json(); } catch (e) {}
    return { statut: r.status, j };
  };
  /* Ce que l'appareil enverra vraiment : un IV et un corps déjà chiffrés. Le serveur n'en
     comprend rien — c'est le point. */
  const PIECE = { iv: Buffer.from('012345678901').toString('base64'), enc: Buffer.from('photo-chiffree-du-poste-3').toString('base64') };

  try {
    console.log('\n── 711 · sans la preuve de la clé, rien n\'entre ──');
    let r = await post('/api/pieces/deposer', Object.assign({ t: TA }, PIECE));
    v('sans kh, refus', r.statut, 403);
    v('… et le refus porte un motif que l\'écran peut dire', r.j && r.j.motif, 'cle');
    r = await post('/api/pieces/deposer', Object.assign({ t: TA, kh: KHB }, PIECE));
    v('avec la clé d\'une AUTRE entreprise, refus', r.statut, 403);
    r = await post('/api/pieces/deposer', Object.assign({ t: 'inexistante', kh: KHA }, PIECE));
    v('espace inconnu, refus', r.statut, 404);
    v('… motif « inconnu »', r.j && r.j.motif, 'inconnu');
    r = await post('/api/pieces/deposer', Object.assign({ t: TF, kh: KHA }, PIECE));
    v('⛔ une entreprise FERMÉE ne dépose plus rien', r.statut, 403);
    v('… motif « ferme »', r.j && r.j.motif, 'ferme');
    r = await post('/api/pieces/deposer', Object.assign({ t: 'elan-gestion', kh: KHA }, PIECE));
    v('⛔ l\'espace de repli est refusé (sa clé est écrite en clair dans app.html)', r.statut, 403);

    console.log('\n── 711 · déposer, relire, et le nom du fichier prouve son contenu ──');
    r = await post('/api/pieces/deposer', Object.assign({ t: TA, kh: KHA }, PIECE));
    v('le dépôt passe', r.statut, 200);
    const id = r.j && r.j.id;
    v('il rend un identifiant de 64 hexadécimaux', /^[0-9a-f]{64}$/.test(String(id)), true);
    /* ⛔ LE SERVEUR RECALCULE : l'identifiant n'est pas un nom donné par l'appareil, c'est
       l'empreinte de ce qui est arrivé. Un corps rangé sous un faux nom n'a pas d'endroit
       où naître. */
    /* ⛔ L'IDENTIFIANT PORTE L'ENTREPRISE. Recalculé à la réception, il prouve le contenu ET le
       propriétaire : un identifiant émis pour A ne peut plus, même par accident, nommer un
       fichier du dossier de B. */
    v('⛔ c\'est le sha-256 de l\'entreprise ET de ce qui a été reçu',
      id, crypto.createHash('sha256').update(TA + '.' + PIECE.iv + '.' + PIECE.enc, 'utf8').digest('hex'));
    v('⛔ … donc PAS calculable sans l\'entreprise',
      id === crypto.createHash('sha256').update(PIECE.iv + '.' + PIECE.enc, 'utf8').digest('hex'), false);
    v('le fichier est dans le dossier de SON entreprise',
      fs.existsSync(path.join(banc, 'data', 'pieces', TA, id + '.bin')), true);
    r = await post('/api/pieces/lire', { t: TA, kh: KHA, id });
    v('on la relit', r.statut, 200);
    v('… octet pour octet', [r.j.iv, r.j.enc], [PIECE.iv, PIECE.enc]);
    /* ⛔ LE DRAPEAU DE COMPRESSION REVIENT AVEC LA PIÈCE. `syncEncrypt` (app.html) compresse
       avant de chiffrer et pose `z:1`. Perdu en route, l'appareil déchiffre parfaitement puis
       passe des octets gzip à `TextDecoder` : du charabia, pas une erreur — une photo revient
       illisible sans que rien ne dise pourquoi. Le même piège a déjà été payé une fois sur les
       copies de sauvegarde ; son commentaire est encore dans `server/index.js`. */
    v('⛔ le drapeau de compression est rendu tel qu'+"'"+'il a été déposé', r.j.z, 0);
    { const rz = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: Buffer.from('compressee').toString('base64'), z: 1 });
      const rl = await post('/api/pieces/lire', { t: TA, kh: KHA, id: rz.j.id });
      v('⛔ … et `z:1` revient bien à 1', rl.j.z, 1);
      /* Le dépôt rejoué écrit le MÊME fichier : l'identifiant est l'empreinte du contenu. */
      const rz2 = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: Buffer.from('compressee').toString('base64'), z: 1 });
      v('un dépôt rejoué rend le même identifiant (pas un doublon)', rz2.j.id, rz.j.id); }
    /* ⛔ Le serveur n'a RIEN pour l'ouvrir : il a rangé un bloc, il rend le même bloc. */
    v('⛔ le fichier sur le disque ne contient pas le clair',
      fs.readFileSync(path.join(banc, 'data', 'pieces', TA, id + '.bin'), 'utf8').indexOf('photo-chiffree') < 0, true);

    console.log('\n── 711 · LE CLOISONNEMENT : B ne lit pas la pièce de A ──');
    /* ⛔ LE CONTRE-TEST DE L'IDENTIFIANT : le MÊME contenu déposé par deux entreprises doit
       donner DEUX identifiants. Sinon B pourrait, en devinant un contenu, nommer un fichier
       de A — et le jour où quelqu'un déplace la lecture hors du dossier par entreprise, la
       fuite serait immédiate. */
    { const ra = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: Buffer.from('meme-contenu').toString('base64'), z: 0 });
      const rb = await post('/api/pieces/deposer', { t: TB, kh: KHB, iv: PIECE.iv, enc: Buffer.from('meme-contenu').toString('base64'), z: 0 });
      v('⛔ le même contenu chez A et chez B donne DEUX identifiants', ra.j.id === rb.j.id, false); }
    r = await post('/api/pieces/lire', { t: TB, kh: KHB, id });
    v('⛔ B présente SA clé et demande l\'identifiant de A → introuvable', r.statut, 404);
    r = await post('/api/pieces/lire', { t: TA, kh: KHB, id });
    v('⛔ B présente son propre kh sur l\'espace de A → refus', r.statut, 403);

    console.log('\n── 711 · un identifiant ne sort pas de son dossier ──');
    for (const mauvais of ['../../../etc/passwd', '..%2f..%2fespaces.json', 'AAAA', '', 'z'.repeat(64)]) {
      r = await post('/api/pieces/lire', { t: TA, kh: KHA, id: mauvais });
      v('« ' + (mauvais || '(vide)').slice(0, 22) + ' » est refusé', r.statut === 400 || r.statut === 404, true);
    }
    v('⛔ et rien n\'est sorti du dossier : espaces.json est toujours là',
      fs.existsSync(path.join(banc, 'data', 'espaces.json')), true);

    console.log('\n── 711 · les plafonds, et un refus qui se DIT ──');
    r = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: 'A'.repeat(5 * 1024 * 1024) });
    v('une pièce au-dessus de la limite est refusée', r.statut, 413);
    v('… motif « trop-gros », pas « erreur »', r.j && r.j.motif, 'trop-gros');
    /* Le plafond du banc est à 6 000 octets : trois blocs de 3 000 le dépassent. */
    r = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: 'B'.repeat(3000) });
    v('une deuxième pièce entre encore', r.statut, 200);
    r = await post('/api/pieces/deposer', { t: TA, kh: KHA, iv: PIECE.iv, enc: 'C'.repeat(3000) });
    v('⛔ la troisième dépasse le plafond de l\'entreprise', r.statut, 507);
    v('… motif « plein »', r.j && r.j.motif, 'plein');
    v('… et le refus dit combien il reste de place', typeof (r.j && r.j.plafond), 'number');
    /* ⚠️ ET B N'EST PAS AFFECTÉE. Un plafond par entreprise qui se déclencherait globalement
       arrêterait tous les clients dès que l'un d'eux remplit le sien. */
    r = await post('/api/pieces/deposer', Object.assign({ t: TB, kh: KHB }, PIECE));
    v('⚠️ pendant ce temps B dépose normalement (le plafond est PAR entreprise)', r.statut, 200);

    console.log('\n── 711 · l\'état, et /health ──');
    r = await post('/api/pieces/etat', { t: TA, kh: KHA });
    v('A compte ses pièces', r.j && r.j.n, 4);
    v('… et pèse plus de 3 000 octets', (r.j && r.j.octets) > 3000, true);
    const h = await (await fetch(B + '/health')).json();
    /* ⛔ /health EST PUBLIQUE. Le poids exact des pièces est un journal de l'activité de
       terrain de tous les clients : il monte quand les techniciens photographient. On ne
       publie qu'un palier arrondi à 5 %. */
    v('/health porte un pourcentage de remplissage', typeof h.pieces.remplissage, 'number');
    v('⛔ … arrondi à 5 %, jamais un compte d\'octets', [h.pieces.remplissage % 5, h.pieces.octets], [0, undefined]);
    v('⛔ … et ne nomme AUCUNE entreprise', JSON.stringify(h.pieces).indexOf(TA) < 0 && JSON.stringify(h.pieces).indexOf(TB) < 0, true);

    /* ⛔ LA SAUVEGARDE HORS SITE EST INERTE SANS CONFIGURATION — vérifié sur le VRAI serveur,
       pas sur le module isolé (c'est `tests/test-722.js` qui l'éprouve pièce par pièce). Ce
       banc démarre avec une configuration qui ne porte AUCUN bloc `sauvegarde` : si le montage
       allumait quoi que ce soit par défaut, un serveur de développement — ou ce banc — partirait
       écrire chez un hébergeur d'objets. Le champ doit donc exister (la surveillance le lit)
       et dire `false`. */
    v('/health porte l\'état de la sauvegarde hors site', typeof h.sauvegarde, 'object');
    v('⛔ … inactive tant que rien n\'est configuré', h.sauvegarde.active, false);
    v('⛔ … et /health ne publie NI le poids NI le coffre (elle est publique)',
      ['octets' in h.sauvegarde, JSON.stringify(h.sauvegarde).includes('bucket')], [false, false]);
    /* L'échéance du jeton GitHub : `null` quand la date n'est pas renseignée — on ne prétend pas
       savoir ce qu'on ignore, et `false` laisserait croire « tout va bien ».
       ⛔ ET C'EST UN BOOLÉEN, PAS UN NOMBRE DE JOURS : /health est publique et sans identité,
       et « expire dans 30 jours » date un identifiant interne pour qui passe. */
    v('⛔ échéance non renseignée → null (ni 0, ni false)', h.ghExpireBientot, null);
    v('⛔ … et le nombre exact de jours n\'est PAS publié', 'ghJours' in h, false);
    v('⛔ … et /health ne laisse échapper aucun jeton', /gh[pousr]_|github_pat_/.test(JSON.stringify(h)), false);

    console.log('\n── 711 · supprimer une pièce — sans ça, le stockage est un cliquet ──');
    /* ⛔ Une pièce retirée d'une intervention resterait sur le VPS pour toujours, alors que
       `sous-traitance.html` annonce une durée de conservation. C'est une obligation. */
    { const dep = await post('/api/pieces/deposer', { t: TB, kh: KHB, iv: PIECE.iv, enc: Buffer.from('a-supprimer').toString('base64'), z: 0 });
      v('une pièce de B est déposée', dep.statut, 200);
      let r2 = await post('/api/pieces/supprimer', { t: TA, kh: KHA, id: dep.j.id });
      v('⛔ A ne supprime PAS une pièce de B', r2.statut, 404);
      r2 = await post('/api/pieces/supprimer', { t: TB, kh: KHB, id: dep.j.id });
      v('B supprime la sienne', r2.statut, 200);
      r2 = await post('/api/pieces/lire', { t: TB, kh: KHB, id: dep.j.id });
      v('… et elle n\'est plus lisible', r2.statut, 404);
      r2 = await post('/api/pieces/supprimer', { t: TB, kh: KHB, id: dep.j.id });
      /* ⛔ Un 200 sur une pièce déjà absente ferait croire à un ménage qui n'a pas eu lieu. */
      v('⛔ resupprimer rend 404, pas un 200 rassurant', r2.statut, 404);
      v('… avec le motif « absente »', r2.j && r2.j.motif, 'absente'); }

    console.log('\n── 711 · le plafond en NOMBRE, séparé du plafond en octets ──');
    /* ⚠️ Un quota en octets ne voit pas ce que coûtent des milliers de fichiers minuscules sur
       un système de fichiers à blocs. L'amplification n'a PAS pu être reproduite dans l'atelier
       (facteur ×1, ce conteneur n'a pas le plancher de bloc) — elle reste plausible sur l'ext4
       du VPS, et ce plafond coûte trois lignes. Le banc est réglé à 5 pièces. */
    { let n200 = 0, dernier = null;
      for (let k = 0; k < 12; k++) { const r3 = await post('/api/pieces/deposer', { t: TB, kh: KHB, iv: PIECE.iv, enc: Buffer.from('petite-' + k).toString('base64'), z: 0 }); if (r3.statut === 200) n200++; dernier = r3; }
      v('⛔ au-delà du plafond en nombre, on refuse', dernier.statut, 507);
      v('… avec le motif « trop-nombreuses », pas « plein »', dernier.j && dernier.j.motif, 'trop-nombreuses');
      v('… et le compte n\'a jamais dépassé le plafond', (await post('/api/pieces/etat', { t: TB, kh: KHB })).j.n <= 5, true); }

    console.log('\n── 711 · le poids est TENU, jamais recalculé sur le chemin d\'une requête ──');
    /* ⛔ LE CORRECTIF QUI A DEMANDÉ UNE MESURE. La première version balayait le dossier (un
       readdirSync + un statSync par fichier) DEUX FOIS par dépôt, en synchrone, sur la boucle
       d'événements : 100 fichiers → 0,9 ms, 1 000 → 5,9 ms, 5 000 → 17,6 ms,
       21 000 → 73 ms, donc 146 ms par photo, tout le serveur gelé pour toutes les entreprises.
       Ce banc épingle la propriété dans le SOURCE : aucun balayage depuis une route. */
    { const MOD = fs.readFileSync(path.join(RACINE, 'server', 'pieces.js'), 'utf8');
      const routes = MOD.slice(MOD.indexOf("app.post('/api/pieces/deposer'"), MOD.indexOf('return {'));
      v('⛔ aucune route n\'appelle balayer()', routes.indexOf('balayer(') < 0, true);
      v('⛔ ni readdirSync', routes.indexOf('readdirSync') < 0, true);
      v('⛔ le total de /health ne balaie pas non plus (il est tenu)', /function total\(\) \{\s*if \(totalOctets === null\)/.test(MOD), true); }

    console.log('\n── 711 · le plancher sur le disque RÉEL ──');
    /* ⛔ Les plafonds comptent des octets LOGIQUES ; le disque perd des blocs et peut se
       remplir pour une raison sans rapport. `statfsSync` est le seul contrôle qui voie la
       vérité — et il lit `bavail`, pas `bfree` (qui compterait la réserve du superutilisateur
       et laisserait accepter des écritures qui échouent). */
    { const MOD = fs.readFileSync(path.join(RACINE, 'server', 'pieces.js'), 'utf8');
      v('⛔ il lit bavail, pas bfree', /s\.bavail/.test(MOD) && !/s\.bfree/.test(MOD), true);
      v('⛔ il est dans un try/catch — une exception ne doit pas casser le service', /try \{ const s = fs\.statfsSync/.test(MOD), true);
      v('⛔ et son échec se DIT au journal, il ne passe pas en silence', /le plancher disque est INACTIF/.test(MOD), true);
      /* ⚠️ Il n'est PAS dans porte() : sinon un disque plein empêcherait aussi de RELIRE une
         pièce déjà déposée — précisément au moment où on en a besoin. */
      const pt = MOD.slice(MOD.indexOf('function porte('), MOD.indexOf("app.post('/api/pieces/deposer'"));
      v('⚠️ le plancher n\'est PAS dans porte() : lire reste possible sur un disque plein', pt.indexOf('disqueLibre') < 0, true); }

    console.log('\n── 711 · effacer une entreprise emporte ses pièces, et SEULEMENT les siennes ──');
    /* ⛔ MESURÉ : avec un `.tmp` laissé par un renameSync interrompu, `rmdirSync` échouait en
       ENOTEMPTY, le dossier SURVIVAIT avec la pièce dedans, et la fonction annonçait quand
       même « 1 effacée ». Sur une fermeture d'entreprise, c'est de la donnée de client qui
       reste. On sabote donc le dossier exprès avant d'effacer. */
    try { fs.writeFileSync(path.join(banc, 'data', 'pieces', TA, 'c'.repeat(64) + '.bin.tmp'), '{}'); } catch (e) {}
    const mod = require(path.join(RACINE, 'server', 'pieces.js'));
    /* On appelle la fonction exportée sur le même dossier de données que le serveur : c'est
       exactement ce que font les trois portes de la Tour. */
    const faux = mod.monterPieces({ post() {}, get() {} }, { config: {}, DATA_DIR: path.join(banc, 'data'), sauvRefus: () => null, quotaOk: () => true, monStr: (x, n) => String(x == null ? '' : x).slice(0, n) });
    const n = faux.effacerEntreprise(TA);
    v('elle rend le nombre de pièces effacées', n, 4);
    v('⛔ le dossier de A a disparu', fs.existsSync(path.join(banc, 'data', 'pieces', TA)), false);
    v('⚠️ celui de B est intact', fs.existsSync(path.join(banc, 'data', 'pieces', TB)), true);
    v('effacer une entreprise sans pièce rend 0, pas true', faux.effacerEntreprise('jamais-vue'), 0);
    r = await post('/api/pieces/lire', { t: TA, kh: KHA, id });
    v('… et la pièce n\'est plus lisible', r.statut, 404);
  } catch (e) {
    ko++; console.log('  ✗ le banc a levé : ' + e.message);
  }
  stop();
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
