/* ⛔ CE QUE CETTE SONDE PROUVE — et c'est l'hypothèse sur laquelle repose TOUTE la refonte :
   le SERVEUR (Node, sans navigateur) peut déchiffrer le document d'une entreprise, seul.

   Justin, 15 septembre 2026 : « pourquoi c'est à eux de convertir les données et pas à nous ? ».
   Je lui avais répondu que c'était impossible. C'était faux, et cette sonde le mesure au lieu
   de le supposer :
   — la clé de chaque entreprise est sur le VPS, en clair, dans espaces.json (e.code porte `k`,
     relu par cleEquipeVerdict, server/index.js:3161) ;
   — le serveur atteint déjà les documents Firestore elan_teams/<t> avec sa clé d'administration
     (server/index.js:5040).
   Reste à établir que la CRYPTO est refaisable côté Node. C'est ce qu'on fait ici : on chiffre
   avec exactement le chemin du navigateur (WebCrypto, comme app.html), et on déchiffre avec le
   `crypto` natif de Node, comme le ferait le serveur. Deux implémentations différentes : si
   elles se rejoignent, la migration est faisable sans toucher un seul téléphone.

   ⛔ La sonde LIT SYNC_SECRET_DEFAULT et SYNC_SALT dans app.html et n'y écrit rien. Elle ne
   contacte aucun serveur, ne touche aucune donnée de client, et fabrique sa propre base. */
const fs = require('fs');
const crypto = require('crypto');
const zlib = require('zlib');

const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
const SECRET = (APP.match(/SYNC_SECRET_DEFAULT='([^']+)'/) || [])[1];
const SALT_B64 = (APP.match(/SYNC_SALT='([^']+)'/) || [])[1];
const ITER = parseInt((APP.match(/iterations:(\d+)/) || [])[1], 10);
if (!SECRET || !SALT_B64 || !ITER) { console.error('spécification introuvable dans app.html'); process.exit(1); }
console.log('Spécification lue dans le fichier livré : PBKDF2-SHA256 ×' + ITER.toLocaleString('fr-FR') + ', sel ' + SALT_B64.length + ' caractères base64');

/* ── une base aux proportions d'ELAN : 18 box, 220 produits, 13 comptes ──
   ⛔ PREMIER JET TROP GENTIL, corrigé : 233 Ko au lieu de 621, et compressé à −97 % au lieu
   des −89 % mesurés chez ELAN. Une base d'essai trop répétitive flatte la mesure — elle
   compresse mieux et se déchiffre plus vite que la vraie. On vise donc la taille réelle et on
   casse la répétition avec un remplissage DÉTERMINISTE (pas de Math.random : une mesure doit
   se rejouer à l'identique). */
function bruit(n, graine) {
  let x = graine, s = '';
  const abc = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 ';
  for (let i = 0; i < n; i++) { x = (x * 1103515245 + 12345) & 0x7fffffff; s += abc[x % abc.length]; }
  return s;
}
function baseSynthetique() {
  const produits = [];
  for (let i = 0; i < 220; i++) produits.push({ id: 'prod_' + i, nom: 'Produit ' + bruit(28, i + 1), ref: 'REF-' + bruit(10, i + 7), categorie: 'Rodenticides', unite: 'L', fournisseur: 'Fournisseur ' + (i % 5), notes: bruit(420, i + 13) });
  const boxes = [];
  for (let b = 0; b < 18; b++) {
    const stock = {}, ms = {};
    for (let i = 0; i < 200; i++) { stock['prod_' + i] = { ctn: i % 4, u: (i * 7) % 60 }; ms['prod_' + i] = 1789000000000 + i; }
    boxes.push({ id: 'box_' + b, nom: 'Box de mesure ' + b, ville: 'Ville ' + b, stock, _ms: ms, techIds: ['tech_' + (b % 6)], _m: 1789000000000 });
  }
  const users = [];
  for (let u = 0; u < 13; u++) users.push({ id: 'usr_' + u, prenom: 'Prénom' + u, nom: 'Nom' + u, role: u ? 'technicien' : 'admin', techId: 'tech_' + (u % 6) });
  /* Le journal est plafonné à 500 entrées dans la vraie application : on le remplit, il pèse. */
  const journal = [];
  for (let j = 0; j < 500; j++) journal.push({ id: 'log_' + j, ts: 1789000000000 + j, titre: bruit(34, j + 101), detail: bruit(190, j + 211), cat: 'sync' });
  const mouvements = [];
  for (let m = 0; m < 1200; m++) mouvements.push({ id: 'mvt_' + m, ts: 1789000000000 + m, box: 'box_' + (m % 18), produit: 'prod_' + (m % 220), q: (m % 9) - 4, par: 'usr_' + (m % 13), note: bruit(60, m + 307) });
  return { produits, boxes, users, journal, mouvements };
}

(async () => {
  const clair = JSON.stringify(baseSynthetique());
  console.log('Base fabriquée : ' + Math.round(clair.length / 1024) + ' Ko en clair (ELAN mesuré : 621 Ko)');

  /* ── CÔTÉ NAVIGATEUR : exactement ce que fait app.html ── */
  const sel = Buffer.from(SALT_B64, 'base64');
  const t0 = process.hrtime.bigint();
  const base = await crypto.webcrypto.subtle.importKey('raw', new TextEncoder().encode(SECRET), 'PBKDF2', false, ['deriveKey']);
  const cleWeb = await crypto.webcrypto.subtle.deriveKey({ name: 'PBKDF2', salt: sel, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const t1 = process.hrtime.bigint();
  const gz = zlib.gzipSync(Buffer.from(clair, 'utf8'));
  const iv = crypto.randomBytes(12);
  const ct = Buffer.from(await crypto.webcrypto.subtle.encrypt({ name: 'AES-GCM', iv }, cleWeb, gz));
  const doc = { enc: ct.toString('base64'), iv: iv.toString('base64'), salt: SALT_B64, z: 1 };
  console.log('Document chiffré comme le ferait un téléphone : ' + Math.round(doc.enc.length / 1024) + ' Ko en base64 (gzip : ' + Math.round(gz.length / 1024) + ' Ko, −' + Math.round(100 - gz.length * 100 / clair.length) + ' %)');
  console.log('Dérivation de clé (×' + ITER.toLocaleString('fr-FR') + ') : ' + Number((t1 - t0) / 1000000n) + ' ms');

  /* ── CÔTÉ SERVEUR : Node pur, aucune WebCrypto, comme server/index.js le ferait ── */
  const t2 = process.hrtime.bigint();
  const cleNode = crypto.pbkdf2Sync(Buffer.from(SECRET, 'utf8'), sel, ITER, 32, 'sha256');
  const t3 = process.hrtime.bigint();
  const brut = Buffer.from(doc.enc, 'base64');
  const corps = brut.subarray(0, brut.length - 16), tag = brut.subarray(brut.length - 16);
  const dec = crypto.createDecipheriv('aes-256-gcm', cleNode, Buffer.from(doc.iv, 'base64'));
  dec.setAuthTag(tag);
  const pt = Buffer.concat([dec.update(corps), dec.final()]);
  const relu = (doc.z ? zlib.gunzipSync(pt) : pt).toString('utf8');
  const t4 = process.hrtime.bigint();

  const ok = relu === clair;
  const obj = ok ? JSON.parse(relu) : null;
  console.log('');
  console.log(ok ? '✓ LE SERVEUR A DÉCHIFFRÉ LE DOCUMENT, octet pour octet' : '✗ échec : le déchiffrement ne rend pas le clair d’origine');
  if (ok) {
    console.log('  il lit : ' + obj.boxes.length + ' box, ' + obj.produits.length + ' produits, ' + obj.users.length + ' comptes');
    console.log('  première box : « ' + obj.boxes[0].nom + ' » — ' + Object.keys(obj.boxes[0].stock).length + ' lignes de stock');
  }
  console.log('');
  console.log('Temps côté serveur :');
  console.log('  dérivation de la clé  : ' + Number((t3 - t2) / 1000000n) + ' ms   (une fois par entreprise, et se met en cache)');
  console.log('  déchiffrer + dézipper : ' + Number((t4 - t3) / 1000000n) + ' ms');
  console.log('  TOTAL par entreprise  : ' + Number((t4 - t2) / 1000000n) + ' ms');
  process.exitCode = ok ? 0 : 1;
})();
