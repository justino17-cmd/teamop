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
v('les trois routes existent', ['deposer', 'lire', 'etat'].every(r => MOD.indexOf("'/api/pieces/" + r + "'") > 0), true);
/* ⛔ `porte()` fait l'identité, `sauvRefus` et le quota. Une route qui l'oublierait s'ouvrirait
   sans preuve de clé — et le module entier deviendrait un dépôt public. */
v('⛔ chaque route commence par porte()', (MOD.match(/const p = porte\(req, res,/g) || []).length, 3);
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
  v('/health porte le poids des pièces', bloc.indexOf('pieces.total()') > 0, true);
  /* ⛔ `total()` ne rend que deux entiers. S'il rendait un détail par espace, /health dirait au
     monde quelles entreprises existent — la règle qui vaut déjà pour `mailRefus`. */
  const t = MOD.slice(MOD.indexOf('total()'), MOD.indexOf('total()') + 120);
  v('⛔ total() ne rend que des entiers, aucun nom d\'espace', /octets: peseTout\(\), plafond: maxTot/.test(t), true); }

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
    piecesMaxOctets: 6000 }));
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
    v('⛔ et c\'est bien le sha-256 de ce qui a été reçu',
      id, crypto.createHash('sha256').update(PIECE.iv + '.' + PIECE.enc, 'utf8').digest('hex'));
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
    v('A compte ses pièces', r.j && r.j.n, 3);
    v('… et pèse plus de 3 000 octets', (r.j && r.j.octets) > 3000, true);
    const h = await (await fetch(B + '/health')).json();
    v('/health porte le total', typeof h.pieces.octets, 'number');
    v('⛔ … et ne nomme AUCUNE entreprise', JSON.stringify(h.pieces).indexOf(TA) < 0 && JSON.stringify(h.pieces).indexOf(TB) < 0, true);

    console.log('\n── 711 · effacer une entreprise emporte ses pièces, et SEULEMENT les siennes ──');
    const mod = require(path.join(RACINE, 'server', 'pieces.js'));
    /* On appelle la fonction exportée sur le même dossier de données que le serveur : c'est
       exactement ce que font les trois portes de la Tour. */
    const faux = mod.monterPieces({ post() {}, get() {} }, { config: {}, DATA_DIR: path.join(banc, 'data'), sauvRefus: () => null, quotaOk: () => true, monStr: (x, n) => String(x == null ? '' : x).slice(0, n) });
    const n = faux.effacerEntreprise(TA);
    v('elle rend le nombre de pièces effacées', n, 3);
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
