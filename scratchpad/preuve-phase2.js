/* ══ PREUVE PHASE 2, AU NAVIGATEUR, SUR LE FICHIER LIVRÉ ═══════════════════════════════════
   On n'extrait rien, on ne recopie rien : on ouvre beta.html dans un vrai Chromium et on
   appelle SES fonctions — syncAllegerNuage → syncEncrypt → syncDecrypt — puis on compare le
   texte relu au texte de départ, caractère par caractère.
   ⛔ beta.html et pas app.html : c'est la règle du dépôt pour tout navigateur piloté.
   La base d'essai est un fichier LOCAL ; rien ne sort de la machine.
   Usage : node preuve-phase2.js <base.json> */
const { chromium } = require('playwright-core');
const http = require('http'), fs = require('fs'), path = require('path');
const R = '/home/user/teamop';
const BASE = process.argv[2];
const srv = http.createServer((q, r) => {
  if (q.url.startsWith('/base.json')) { r.writeHead(200, { 'Content-Type': 'application/json' }); fs.createReadStream(BASE).pipe(r); return; }
  const x = path.join(R, q.url.split('?')[0]);
  fs.readFile(x, (e, d) => e ? (r.writeHead(404), r.end())
    : (r.writeHead(200, { 'Content-Type': x.endsWith('.js') ? 'text/javascript' : 'text/html;charset=utf-8' }), r.end(d)));
}).listen(8181, '127.0.0.1');

(async () => {
  const nav = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const p = await nav.newPage();
  const err = []; p.on('pageerror', e => err.push(String(e)));
  await p.goto('http://127.0.0.1:8181/beta.html', { timeout: 60000, waitUntil: 'domcontentloaded' });
  await p.waitForFunction(() => typeof syncAllegerNuage === 'function' && typeof syncEncrypt === 'function'
    && typeof syncDecrypt === 'function' && typeof nuageDocOctets === 'function', { timeout: 30000 });

  const r = await p.evaluate(async () => {
    const txt = await (await fetch('/base.json')).text();
    let base = JSON.parse(txt);
    if (base && !Array.isArray(base.produits) && base.db) base = base.db;
    const clair = new TextEncoder().encode(JSON.stringify(base)).length;

    const t0 = performance.now();
    const alle = await syncAllegerNuage(base);
    const tMesure = performance.now() - t0;

    const t1 = performance.now();
    const e = await syncEncrypt(JSON.stringify(alle.copie));
    const tEcrit = performance.now() - t1;

    const t2 = performance.now();
    const relu = await syncDecrypt({ enc: e.enc, iv: e.iv, salt: e.salt, z: e.z });
    const tLu = performance.now() - t2;

    let parse = false, lignes = 0;
    try { const o = JSON.parse(relu); parse = true; lignes = Object.keys(o).reduce((n, k) => n + (Array.isArray(o[k]) ? o[k].length : 0), 0); } catch (_) {}

    /* Le document Firestore complet, champ par champ — c'est lui que la limite de 1 Mio vise. */
    const docv = { enc: e.enc, iv: e.iv, salt: e.salt, z: e.z, ts: Date.now(), writer: 'x'.repeat(24), at: new Date().toISOString(), by: 'Prénom Nom', ver: '677', verNum: 677 };
    const doc = new TextEncoder().encode(JSON.stringify(docv)).length;

    return {
      clair, z: e.z, enc: e.enc.length, doc,
      docPrevu: nuageDocOctets ? null : null,
      identique: relu === JSON.stringify(alle.copie),
      memeBase: alle.copie === base,
      retirees: alle.retirees, journalCoupe: alle.journalCoupe, impossible: alle.impossible,
      mesure: alle.doc, parse, lignes,
      ms: { mesure: Math.round(tMesure), ecrit: Math.round(tEcrit), lu: Math.round(tLu) },
    };
  });

  const ko = x => (x / 1024).toFixed(1) + ' Ko';
  console.log('\n  base d\'essai (texte clair)   : ' + ko(r.clair));
  console.log('  ─────────────────────────────');
  console.log('  drapeau z écrit              : ' + r.z + (r.z === 1 ? '  (compressé)' : '  ⛔ CLAIR'));
  console.log('  champ enc (base64)           : ' + ko(r.enc) + '   — mesuré d\'avance : ' + ko(r.mesure));
  console.log('  DOCUMENT Firestore complet   : ' + ko(r.doc) + '   pour 1024,0 Ko de limite dure');
  console.log('  marge                        : ' + ko(1048576 - r.doc));
  console.log('  ─────────────────────────────');
  console.log('  base poussée ENTIÈRE         : ' + (r.memeBase ? 'oui' : 'NON'));
  console.log('  pièces retirées              : ' + r.retirees);
  console.log('  lignes de journal coupées    : ' + r.journalCoupe);
  console.log('  écriture déclarée impossible : ' + r.impossible);
  console.log('  ─────────────────────────────');
  console.log('  relu IDENTIQUE au départ     : ' + (r.identique ? 'OUI, caractère par caractère' : '⛔ NON'));
  console.log('  JSON.parse du relu           : ' + (r.parse ? 'passe — ' + r.lignes + ' lignes' : '⛔ ÉCHOUE'));
  console.log('  ─────────────────────────────');
  console.log('  mesure ' + r.ms.mesure + ' ms · écriture ' + r.ms.ecrit + ' ms · lecture ' + r.ms.lu + ' ms');
  console.log('  erreurs de page              : ' + (err.length ? err.join(' | ') : 'aucune'));
  await nav.close(); srv.close();
  process.exit(r.identique && r.parse && r.z === 1 && !err.length ? 0 : 1);
})();
