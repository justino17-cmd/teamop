/* ══ SERVEUR — UNE ENTREPRISE DE 15 APPAREILS NE S'ÉTRANGLE PLUS, ET UN REFUS SE VOIT ═════════════════
   Vérification de A à Z du 26 septembre 2026, famille « serveur », rejouée deux fois par un second agent :
   · « a: 20000 » attentes par espace et par heure ne tenaient pas 15 appareils — une écriture réveille TOUS
     les appareils à l'écoute, donc les attentes croissent comme N × écritures (27 600 projetées à l'heure,
     budget épuisé en 43 min, puis la synchro freinée jusqu'à la fin de l'heure) ;
   · et AUCUN de ces refus ne se voyait : ni le budget par espace (`documents.js`), ni le seau par IP
     (`tropDeRequetes`, index.js) n'étaient comptés, et `surveillance.js` ne lisait rien.
   Ce banc monte le VRAI module des documents avec une fonction de quota qui note ce qu'on lui demande
   et qui refuse sur commande : il joue un vrai 429, et lit le compteur que publie `/health`. */
const fs = require('fs'), os = require('os'), path = require('path'), http = require('http');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c) => v(t, !!c, true);
const NU = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
console.log('\n── 819 · le budget du document d\'équipe tient une entreprise, et un refus se compte ──');

/* ══ 1. CE QUE LE CODE DIT ════════════════════════════════════════════════════════════════════ */
const DOC = NU(fs.readFileSync(path.join(RACINE, 'server', 'documents.js'), 'utf8'));
const IDX = NU(fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8'));
const SURV = NU(fs.readFileSync(path.join(RACINE, '.github', 'scripts', 'surveillance.js'), 'utf8'));
vrai('⛔ /health publie les refus du seau par IP de la dernière heure (un nombre, jamais une adresse)',
  /limites: \{ refusIp1h: refus429\.filter\(t => t > Date\.now\(\) - 3600000\)\.length \}/.test(IDX));
vrai('⛔ chaque 429 du seau par IP est noté AVANT la réponse', /function tropDeRequetes\(res\) \{\s*refus429\.push\(Date\.now\(\)\);/.test(IDX));
vrai('⛔ la surveillance crie au premier refus de budget d\'un document d\'équipe', /j\.documents && j\.documents\.quotaRefus1h > 0/.test(SURV));
vrai('   et quand les refus par IP se comptent par centaines', /j\.limites && j\.limites\.refusIp1h > 300/.test(SURV));

(async () => {
  let express;
  try { express = require(path.join(RACINE, 'server', 'node_modules', 'express')); }
  catch (e) { console.log('  … partie exécutée SAUTÉE : server/node_modules absent (cd server && npm i)'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }

  /* ══ 2. LE VRAI MODULE, UNE FONCTION DE QUOTA QUI NOTE ET REFUSE SUR COMMANDE ══════════════════ */
  const DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'b819-'));
  const demandes = {}; let refuser = null;
  const quotaOk = (map, cle, max) => { demandes[cle.split(':')[0]] = max; return !(refuser && cle.startsWith(refuser + ':')); };
  const app = express(); app.use(express.json({ limit: '6mb' }));
  const d = require(path.join(RACINE, 'server', 'documents.js')).monterDocuments(app, {
    DATA_DIR, config: {}, quotaOk,
    sauvRefus: () => null, cleEstPublique: () => false, monStr: (x, n) => String(x == null ? '' : x).slice(0, n),
    versionMin: () => 0, fbLireDocument: null });
  const srv = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const post = (route, corps) => new Promise((res, rej) => {
    const b = JSON.stringify(corps);
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, path: route, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } },
      r => { let t = ''; r.on('data', c => t += c); r.on('end', () => res({ statut: r.statusCode, j: (() => { try { return JSON.parse(t); } catch (e) { return null; } })() })); });
    q.on('error', rej); q.end(b); });
  try {
    const T = 'ent-b819', KH = 'a'.repeat(64);
    await post('/api/doc/lire', { t: T, kh: KH });
    v('⛔ le budget de LECTURE d\'une entreprise est de 20 000 par heure', demandes.l, 20000);
    refuser = 'a';
    const r = await post('/api/doc/attendre', { t: T, kh: KH, v: 0 });
    v('⛔ une attente refusée rend 429 « quota »', [r.statut, r.j && r.j.motif], [429, 'quota']);
    v('⛔ le budget d\'ATTENTES demandé est de 100 000 par heure (plus 20 000)', demandes.a, 100000);
    v('⛔ ET LE REFUS SE COMPTE : /health le publiera (documents.quotaRefus1h)', d.sante().quotaRefus1h, 1);
    refuser = 'e';
    const w = await post('/api/doc/ecrire', { t: T, kh: KH, doc: { enc: 'QUJD', iv: 'SVY=', salt: 'U0FMVA==', writer: 'dev-819', ts: 1727000000000, ver: '751', verNum: 751 } });
    v('   une écriture refusée aussi (429), et comptée', [w.statut, d.sante().quotaRefus1h], [429, 2]);
    v('   le budget d\'écritures reste à 6 000 par heure', demandes.e, 6000);
    refuser = null;
    /* (la lecture tente ici une copie depuis Firebase, absent du banc : 503 — c'est l'absence de 429 qui compte) */
    const ok2 = await post('/api/doc/lire', { t: T, kh: KH });
    v('   sans refus de budget, rien ne se compte de plus', [ok2.statut !== 429, d.sante().quotaRefus1h], [true, 2]);
    /* la bêta (espaces techniques) garde ses budgets serrés : une équipe de développement */
    const TB = [...d.ESPACES_TECHNIQUES][0];
    if (TB) { await post('/api/doc/lire', { t: TB, kh: KH }); v('   les espaces techniques de la bêta gardent leur budget serré', demandes.l, 1500); }
  } finally { srv.close(); try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {} }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(2); });
