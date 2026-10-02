/* ══ OUTILS COMMUNS DES BANCS DE LA SAUVEGARDE D'OP MESSAGES (tests/test-950, test-951 et mutations-sauvegarde) ═════════════════
 *
 * Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Il porte :
 *   · `coffreFaux` — UN VRAI SERVEUR HTTP QUI PARLE S3, sur 127.0.0.1. Il ne se contente pas de vouloir une signature « bien formée »
 *     (c'est ce que faisait le coffre de `test-726`) : il la RECALCULE avec le signeur de `lib/s3.js` et rend 403 si elle diffère, et
 *     il recalcule le SHA-256 du corps et rend 400 s'il diffère de celui que le client a signé — ce que fait un vrai S3. Un client
 *     qui signerait de travers, ou dont l'empreinte précalculée ne serait pas celle du fichier envoyé, échoue donc ICI et pas à 3 h
 *     du matin chez l'hébergeur.
 *     Il sait aussi tomber en panne comme un vrai coffre un mauvais jour : refuser un dépôt, rendre un objet corrompu à la
 *     relecture, tronqué, absent, refuser la liste ou l'effacement, couper la connexion — et, pour l'épreuve que fait
 *     `configurer-sauvegarde.js` AVANT d'écrire, refuser la lecture de l'objet d'essai, le corrompre, ou l'oublier dans la liste.
 *     ⚠️ Ce qu'il ne prouve PAS : qu'IONOS accepte. Il prouve que le module signe comme AWS le documente (`test-716` rejoue les
 *     vecteurs publiés par AWS) ; l'épreuve du vrai coffre est un geste de Justin (`configurer-sauvegarde.js` la fait avant d'écrire).
 *   · de quoi bâtir une VRAIE base (`stockage.js`) remplie, des clés, et chercher un canari « en clair » dans une archive.
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http'), crypto = require('crypto'), zlib = require('zlib');
const RACINE = path.join(__dirname, '..');
const SERVICE = path.join(RACINE, 'server-msg');
const { signer } = require(path.join(SERVICE, 'lib', 's3.js'));

const BUCKET = 'coffre-du-banc', ACCESS = 'AKIABANCSAUVEGARDE1234', SECRET = 'secret-du-banc-sauvegarde-9f8e7d6c5b4a', REGION = 'eu-central-4';
const cleHex = () => crypto.randomBytes(32).toString('hex');
const portLibre = () => new Promise((res, rej) => { const s = require('net').createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); });

const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/* ══ LE COFFRE ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
async function coffreFaux(opts = {}) {
  const o = Object.assign({ bucket: BUCKET, accessKey: ACCESS, secretKey: SECRET, region: REGION, pageTaille: 1000 }, opts);
  const objets = new Map();          // clé → Buffer
  const modifies = new Map();        // clé → ISO
  const vus = [];                    // chaque requête : { m, cle, sigOk, hashOk, ts }
  const pannes = new Set();
  const etat = { signaturesFausses: 0, empreintesFausses: 0, sansSignature: 0 };

  function signatureJuste(q) {
    const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(String(q.headers.authorization || ''));
    if (!m) { etat.sansSignature++; return false; }
    if (m[1] !== o.accessKey || m[3] !== o.region) return false;
    const iso = String(q.headers['x-amz-date'] || '');
    const mm = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z$/.exec(iso);
    if (!mm) return false;
    const enTetes = {};
    for (const h of m[4].split(';')) if (!['host', 'x-amz-content-sha256', 'x-amz-date'].includes(h)) enTetes[h] = q.headers[h];
    const attendu = signer({
      methode: q.method, url: 'http://' + q.headers.host + q.url, region: o.region, accessKey: o.accessKey, secretKey: o.secretKey,
      empreinteCorps: String(q.headers['x-amz-content-sha256'] || ''), enTetes,
      quand: new Date(Date.UTC(+mm[1], +mm[2] - 1, +mm[3], +mm[4], +mm[5], +mm[6])),
    });
    return attendu.signature === m[5];
  }

  const srv = http.createServer((q, r) => {
    const u = new URL(q.url, 'http://127.0.0.1');
    const chemin = decodeURIComponent(u.pathname);
    const racine = '/' + o.bucket;
    const cle = chemin === racine ? '' : (chemin.startsWith(racine + '/') ? chemin.slice(racine.length + 1) : null);
    const ligne = { m: q.method, cle, sigOk: false, hashOk: null, ts: Date.now() };
    vus.push(ligne);
    const fin = (code, corps, entetes) => { r.writeHead(code, Object.assign({ 'content-length': String(corps ? Buffer.byteLength(corps) : 0) }, entetes || {})); r.end(corps || undefined); };
    ligne.sigOk = signatureJuste(q);
    if (!ligne.sigOk) { etat.signaturesFausses++; q.resume(); return fin(403, '<Error><Code>SignatureDoesNotMatch</Code></Error>'); }
    if (cle === null) { q.resume(); return fin(404, '<Error><Code>NoSuchBucket</Code></Error>'); }

    if (q.method === 'GET' && !cle) {                     // ListObjectsV2
      if (pannes.has('liste-refusee')) return fin(403, '<Error><Code>AccessDenied</Code></Error>');
      const p = u.searchParams.get('prefix') || '';
      ligne.liste = p;
      const toutes = [...objets.keys()].filter(k => k.startsWith(p) && !(pannes.has('liste-sans-essai') && /essai-configuration/.test(k))).sort();
      const debut = u.searchParams.get('continuation-token') ? parseInt(u.searchParams.get('continuation-token'), 10) : 0;
      const page = toutes.slice(debut, debut + o.pageTaille);
      const tronquee = debut + o.pageTaille < toutes.length;
      const contenu = page.map(k => '<Contents><Key>' + xml(k) + '</Key><LastModified>' + modifies.get(k) + '</LastModified><Size>' + objets.get(k).length + '</Size></Contents>').join('');
      return fin(200, '<?xml version="1.0" encoding="UTF-8"?><ListBucketResult>' + contenu + '<IsTruncated>' + tronquee + '</IsTruncated>' + (tronquee ? '<NextContinuationToken>' + (debut + o.pageTaille) + '</NextContinuationToken>' : '') + '</ListBucketResult>', { 'content-type': 'application/xml' });
    }
    if (q.method === 'PUT') {
      const bouts = [];
      q.on('data', c => bouts.push(c));
      q.on('end', () => {
        const repondre = () => {
          if (pannes.has('refus-depot')) return fin(500, 'refus du banc');
          if (pannes.has('refus-depot-403')) return fin(403, '<Error><Code>AccessDenied</Code></Error>');
          if (pannes.has('coupure-depot')) { q.socket.destroy(); return; }
          if (pannes.has('refus-depot-pieces') && /\/pieces\//.test(cle)) return fin(500, 'refus du banc');
          const corps = Buffer.concat(bouts);
          const dit = String(q.headers['x-amz-content-sha256'] || '');
          ligne.hashOk = crypto.createHash('sha256').update(corps).digest('hex') === dit;
          if (!ligne.hashOk) { etat.empreintesFausses++; return fin(400, '<Error><Code>XAmzContentSHA256Mismatch</Code></Error>'); }
          objets.set(cle, corps); modifies.set(cle, new Date().toISOString());
          fin(200);
        };
        if (coffre.latenceMs > 0) setTimeout(repondre, coffre.latenceMs); else repondre();
      });
      return;
    }
    if (q.method === 'GET') {
      if (!objets.has(cle)) return fin(404, '<Error><Code>NoSuchKey</Code></Error>');
      let b = objets.get(cle);
      const estBase = /\/base\//.test(cle), estPiece = /\/pieces\//.test(cle), estEssai = /essai-configuration/.test(cle);   // l'objet d'essai de `configurer-sauvegarde.js`
      if (pannes.has('lecture-refusee-essai') && estEssai) return fin(403, '<Error><Code>AccessDenied</Code></Error>');
      if (pannes.has('corrompt-essai') && estEssai) { b = Buffer.from(b); b[Math.floor(b.length / 2)] ^= 0xff; }
      if (pannes.has('absent-relecture') && estBase) return fin(404, '<Error><Code>NoSuchKey</Code></Error>');
      if (pannes.has('lecture-refusee') && (estBase || estPiece)) return fin(403, '<Error><Code>AccessDenied</Code></Error>');
      /* ⛔ UN OCTET RETOURNÉ, PAS UNE TAILLE CHANGÉE : le contrôle de taille est le moins cher et le plus facile à satisfaire ; c'est
         l'EMPREINTE qui doit attraper ce cas, et elle seule. */
      if ((pannes.has('corrompt-relecture') && estBase) || (pannes.has('corrompt-pieces') && estPiece)) { b = Buffer.from(b); b[Math.floor(b.length / 2)] ^= 0xff; }
      if (pannes.has('tronque-relecture') && estBase) b = b.subarray(0, b.length - 7);
      return fin(200, b);
    }
    if (q.method === 'DELETE') {
      if (pannes.has('efface-refuse')) return fin(403, '<Error><Code>AccessDenied</Code></Error>');
      objets.delete(cle); modifies.delete(cle);
      return fin(204);
    }
    q.resume(); fin(405);
  });
  const port = await portLibre();
  await new Promise(res => srv.listen(port, '127.0.0.1', res));
  const base = 'http://127.0.0.1:' + port;
  const coffre = {
    base, port, objets, vus, etat, bucket: o.bucket, accessKey: o.accessKey, secretKey: o.secretKey, region: o.region,
    latenceMs: 0,                     // un coffre lent à répondre à un dépôt (pour arrêter le service pendant une passe)
    regler: (...modes) => { pannes.clear(); for (const m of modes) pannes.add(m); },
    normal: () => pannes.clear(),
    /* Pose un objet directement (un reste d'une passe interrompue, une archive d'un autre âge, une pièce qu'on n'a jamais envoyée). */
    poser: (cle, buf, modifie) => { objets.set(cle, Buffer.from(buf)); modifies.set(cle, modifie || new Date().toISOString()); },
    cles: (prefixe) => [...objets.keys()].filter(k => !prefixe || k.startsWith(prefixe)).sort(),
    compter: (m, prefixeCle) => vus.filter(x => x.m === m && (!prefixeCle || (x.cle || '').startsWith(prefixeCle))).length,
    /* Les LISTES demandées sous un préfixe (ListObjectsV2 n'a pas de clé : le préfixe est un paramètre). */
    listes: (prefixe) => vus.filter(x => x.m === 'GET' && x.liste !== undefined && x.liste.startsWith(prefixe)).length,
    /* Le bloc `sauvegarde` de la configuration du service qui parle à CE coffre. */
    conf: (extra) => Object.assign({ endpoint: base, region: o.region, bucket: o.bucket, accessKey: o.accessKey, secretKey: o.secretKey }, extra || {}),
    fermer: () => new Promise(res => { try { srv.closeAllConnections(); } catch (e) { /* déjà fermées */ } srv.close(() => res()); }),
  };
  return coffre;
}

/* ══ UN CANARI EN CLAIR, DANS UNE ARCHIVE ? ═════════════════════════════════════════════════════════════════════════════════
   « Aucun canari en clair » ne se prouve pas par un `includes` sur les octets seuls : une base COMPRESSÉE sans être chiffrée ne
   laisse pas son texte lisible tel quel (gzip le tasse). On cherche donc le canari dans les octets, ET dans tout ce qui se
   décompresse à partir d'un point quelconque de l'en-tête, ET la signature d'un fichier SQLite. Une archive non chiffrée tombe ici. */
function enClair(buf, canaris) {
  const trouves = new Set();
  const cherche = (b, etiquette) => {
    for (const c of canaris) if (b.includes(Buffer.from(c))) trouves.add(etiquette + ':' + c);
    if (b.includes(Buffer.from('SQLite format 3'))) trouves.add(etiquette + ':sqlite');
  };
  cherche(buf, 'brut');
  for (let k = 0; k < Math.min(buf.length - 10, 400); k++) {
    if (buf[k] !== 0x1f || buf[k + 1] !== 0x8b) continue;
    try { cherche(zlib.gunzipSync(buf.subarray(k)), 'gzip'); } catch (e) { /* ce n'est pas un début de gzip */ }
  }
  return [...trouves];
}

/* ══ UNE VRAIE BASE, REMPLIE ════════════════════════════════════════════════════════════════════════════════════════════════ */
function creerBase(opts = {}) {
  const { ouvrir } = require(path.join(SERVICE, 'stockage.js'));
  const { creerScelleur } = require(path.join(SERVICE, 'scelle.js'));
  const dossier = opts.dossier || fs.mkdtempSync(path.join(os.tmpdir(), 'banc-sauv-'));
  const dataDir = path.join(dossier, 'data');
  fs.mkdirSync(dataDir, { recursive: true });
  const kek = opts.kek || crypto.randomBytes(32);
  const h = { t: opts.t || 1790000000000 };
  const S = ouvrir({ chemin: path.join(dataDir, 'msg.db'), scelleur: creerScelleur(kek), horloge: opts.horloge || (() => h.t), moteur: opts.moteur });
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom, prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  return { S, dossier, dataDir, kek, h, pers, chemin: path.join(dataDir, 'msg.db'), nettoyer: () => { try { S.fermer(); } catch (e) { /* fermée */ } fs.rmSync(dossier, { recursive: true, force: true }); } };
}

/* Remplit la base : deux personnes, un groupe, `n` messages (le texte porte un numéro, pour retrouver chaque ligne). */
function remplir(b, n, prefixe = 'm') {
  const a = b.pers('alice'), c = b.pers('carole');
  const g = b.S.convCreerGroupe({ createur: a.id, nom: 'Groupe du banc', membres: [c.id] });
  const conv = g.id || g.conv || g;
  for (let i = 0; i < n; i++) b.S.messageEnvoyer({ conv, auteur: i % 2 ? c.id : a.id, cid: prefixe + '-' + i, texte: 'message ' + prefixe + ' numéro ' + i + ' ' + 'x'.repeat(120) });
  return { a, c, conv };
}

/* Enlève les commentaires d'un fichier source : un banc qui cherche un motif vise du CODE, pas la phrase qui l'explique. Seuls les blocs
   qui COMMENCENT une ligne et les lignes entièrement commentées sont retirés — le motif naïf avale du vrai code (CLAUDE.md). */
function sansCommentaires(src) {
  return String(src).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
}

/* Le compteur de vérifications (même forme que les autres suites du dépôt). */
function compteur() {
  const c = { ok: 0, ko: 0 };
  c.v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { c.ok++; console.log('  ✓ ' + t); } else { c.ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
  c.vrai = (t, a) => c.v(t, !!a, true);
  c.fin = () => { if (process.exitCode) c.ko++; console.log('\n' + c.ok + ' ✓  ' + c.ko + ' ✗'); process.exit(c.ko ? 1 : 0); };
  return c;
}

module.exports = { RACINE, SERVICE, BUCKET, ACCESS, SECRET, REGION, cleHex, portLibre, coffreFaux, enClair, creerBase, remplir, compteur, sansCommentaires };
