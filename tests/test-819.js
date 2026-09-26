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
vrai('⛔ /health publie les refus du seau par IP de la dernière heure, PAR FAMILLE (des nombres, jamais une adresse)',
  /limites: \{ refusSynchro1h: refus429\.synchro\.filter\(t => t > Date\.now\(\) - 3600000\)\.length,\s*refusAutres1h: refus429\.autres\.filter\(t => t > Date\.now\(\) - 3600000\)\.length \}/.test(IDX));
vrai('⛔ chaque 429 du seau par IP est noté dans sa famille AVANT la réponse',
  /function tropDeRequetes\(res, famille\) \{\s*const a = refus429\[famille === 'synchro' \? 'synchro' : 'autres'\];\s*a\.push\(Date\.now\(\)\);/.test(IDX));
/* ⛔ LES FAMILLES : la synchro (document, socle, photos) porte l'alarme ; un robot qui balaie le reste ne doit pas
   la faire crier (gardien, contre-vérification v751). Chaque appel nomme SA famille — un appel sans famille
   tomberait en silence dans « autres ». */
{
  const appels = [...IDX.matchAll(/if \((\w+) > (PLAFOND_\w+)\) return tropDeRequetes\(res(?:, '(\w+)')?\);/g)].map(m => m[2] + '→' + (m[3] || '?'));
  v('   population : les six seaux par IP sont trouvés', appels.length, 6);
  v('   document, socle et photos comptent en « synchro » ; battement, global et sensibles en « autres »', appels.sort(),
    ['PLAFOND_BATTEMENT→autres', 'PLAFOND_DOCUMENTS→synchro', 'PLAFOND_DONNEES→synchro', 'PLAFOND_GLOBAL→autres', 'PLAFOND_PIECES→synchro', 'PLAFOND_STRICT→autres']);
  v('   et aucun appel sans famille', (IDX.match(/tropDeRequetes\(res\)/g) || []).length, 0);
}
vrai('⛔ la surveillance crie au premier refus de budget d\'un document d\'équipe', /j\.documents && j\.documents\.quotaRefus1h > 0/.test(SURV));
vrai('   et quand les refus de la SYNCHRO par IP se comptent par centaines (pas le total)', /j\.limites && j\.limites\.refusSynchro1h > 300/.test(SURV) && !/refusAutres1h/.test(SURV));

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
    /* Firebase n'a jamais eu de document pour cet espace : l'espace part vide, l'écriture passe */
    versionMin: () => 0, versionFirestore: () => 999, fbLireDocument: async () => ({ existe: false }) });
  const srv = await new Promise(r => { const s = app.listen(0, '127.0.0.1', () => r(s)); });
  const post = (route, corps) => new Promise((res, rej) => {
    const b = JSON.stringify(corps);
    const q = http.request({ host: '127.0.0.1', port: srv.address().port, path: route, method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(b) } },
      r => { let t = ''; r.on('data', c => t += c); r.on('end', () => res({ statut: r.statusCode, j: (() => { try { return JSON.parse(t); } catch (e) { return null; } })() })); });
    q.on('error', rej); q.end(b); });
  /* le journal : une ligne au PREMIER refus de chaque fenêtre, avec une empreinte courte — jamais l'identifiant */
  const journal = []; const warn0 = console.warn; console.warn = (...a) => journal.push(a.join(' '));
  try {
    const T = 'ent-b819', KH = 'a'.repeat(64);
    const DOC = { enc: 'QUJD', iv: 'SVY=', salt: 'U0FMVA==', writer: 'dev-819', ts: 1727000000000, ver: '751', verNum: 751 };
    await post('/api/doc/lire', { t: T, kh: KH });
    v('⛔ le budget de LECTURE d\'une entreprise est de 20 000 par heure', demandes.l, 20000);
    refuser = 'a';
    const r = await post('/api/doc/attendre', { t: T, kh: KH, v: 0 });
    v('⛔ une attente refusée rend 429 « quota »', [r.statut, r.j && r.j.motif], [429, 'quota']);
    v('⛔ le budget d\'ATTENTES demandé est de 100 000 par heure (plus 20 000)', demandes.a, 100000);
    v('⛔ ET LE REFUS SE COMPTE : /health le publiera (documents.quotaRefus1h)', d.sante().quotaRefus1h, 1);
    refuser = 'e';
    const w = await post('/api/doc/ecrire', { t: T, kh: KH, doc: DOC });
    v('   une écriture refusée aussi (429), et comptée', [w.statut, d.sante().quotaRefus1h], [429, 2]);
    v('   le budget d\'écritures reste à 6 000 par heure', demandes.e, 6000);
    refuser = null;
    const w2 = await post('/api/doc/ecrire', { t: T, kh: KH, doc: DOC });
    v('   sans refus, l\'écriture passe (version 1)', [w2.statut, w2.j && w2.j.v], [200, 1]);

    /* ⛔ UNE LECTURE N'EST JAMAIS BORNÉE PAR VERSION (gardien, relecture avant le déploiement) : le client v751 relit
       avant chaque envoi et n'écrit pas si la relecture est refusée — une version épuisée ne changeait plus jamais,
       l'entreprise restait figée jusqu'à une heure ; un v749 écrivait à l'aveugle. */
    const l1 = await post('/api/doc/lire', { t: T, kh: KH });
    v('⛔ une lecture sert le document SANS passer par la borne par version', [l1.statut, l1.j && l1.j.v, T in demandes], [200, 1, false]);
    /* ⛔ UNE ATTENTE EN RETARD NE SE SERT PAS SANS FIN (gardien) : bornée par (espace, version) */
    const a1 = await post('/api/doc/attendre', { t: T, kh: KH, v: 0 });
    v('⛔ une attente EN RETARD rend le document tout de suite ET se compte contre la borne de SA version (2 000 par heure)',
      [a1.statut, a1.j && a1.j.v, demandes[T]], [200, 1, 2000]);
    v('   sans refus, rien ne se compte de plus', d.sante().quotaRefus1h, 2);
    refuser = T;   // la borne de la version refuse désormais — les budgets l/e/a, eux, passent
    const a2 = await post('/api/doc/attendre', { t: T, kh: KH, v: 0 });
    v('⛔ au-delà, l\'attente en retard rend 429 « quota » au lieu du document, et le refus se compte',
      [a2.statut, a2.j && a2.j.motif, d.sante().quotaRefus1h], [429, 'quota', 3]);
    const l2 = await post('/api/doc/lire', { t: T, kh: KH });
    v('⛔ ET LA LECTURE DE LA MÊME VERSION PASSE TOUJOURS — pas de verrou : l\'appareil refusé relit, et peut écrire',
      [l2.statut, l2.j && l2.j.v, d.sante().quotaRefus1h], [200, 1, 3]);
    refuser = null;

    /* la bêta (espaces techniques) garde ses budgets serrés : une équipe de développement */
    const TB = [...d.ESPACES_TECHNIQUES][0];
    vrai('   population : un espace technique existe', !!TB);
    if (TB) {
      await post('/api/doc/lire', { t: TB, kh: KH }); v('   les espaces techniques de la bêta gardent leur budget serré', demandes.l, 1500);
      /* ⛔ ET LEURS REFUS NE SE COMPTENT PAS (gardien) : la bêta passe la porte SANS clé, donc un anonyme — ou une
         sonde de l'équipe — faisait crier « une entreprise ne se synchronise plus » à volonté. */
      refuser = 'l';
      const rb = await post('/api/doc/lire', { t: TB });
      v('⛔ un refus sur un espace technique (sans clé) rend bien 429… mais ne se compte PAS', [rb.statut, d.sante().quotaRefus1h], [429, 3]);
      refuser = null;
    }
    const empreinte = s => require('crypto').createHash('sha256').update(s).digest('hex').slice(0, 8);
    const lignes = journal.filter(l => /^documents : budget de /.test(l));
    v('⛔ le journal dit chaque budget épuisé UNE fois par fenêtre (attentes, écritures, envois d\'une version)', lignes.length, 3);
    vrai('   avec l\'empreinte courte de l\'espace', lignes.every(l => l.includes('#' + empreinte(T))));
    vrai('   jamais son identifiant', lignes.every(l => !l.includes(T)));
    vrai('   et rien pour l\'espace technique', !journal.some(l => TB && l.includes('#' + empreinte(TB))));
  } finally { console.warn = warn0; srv.close(); try { fs.rmSync(DATA_DIR, { recursive: true, force: true }); } catch (e) {} }
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); process.exit(2); });
