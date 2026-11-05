/* ══ test-3254 · UNE COUPURE QUE LA SYNCHRO RENOUE TOUTE SEULE N'EST PAS UN INCIDENT (v800, 4 novembre 2026) ══════════════════
   Justin : « cette erreur-là, il faut vraiment la corriger. Ce message revient beaucoup trop souvent de beaucoup de clients. »
   Les dossiers « Réseau » de la Tour portaient tous la synchro — « api.teamop.fr injoignable sur /api/doc/attendre | lire |
   ecrire | /health » —, sur des iPhone et des Safari, serveur sain. La règle d'avant (2e échec du même appel en 3 minutes)
   prenait pour une panne ce qu'un téléphone de terrain fait vingt fois par jour :
     · l'écran verrouillé coupe l'écoute en cours, et iOS rend l'échec AU RETOUR — avant l'événement qui ouvrait la minute de grâce ;
     · un passage wifi → 4G perd UNE connexion pendant que les autres répondent ;
     · un redémarrage du serveur (une mise en ligne) coupe tout quelques secondes, et la boucle relit dans la seconde.
   Ce banc EXÉCUTE le vrai bloc d'app.html (le relais de fetch et ses écouteurs) sur une horloge qu'il tient, avec des appels qui
   se terminent quand il le décide. Il rejoue chaque cas, puis ce qui doit TOUJOURS se signaler : une vraie panne (2 min sans
   aucune réponse, page au premier plan), une réponse 5xx.
   Contre-épreuve : `APP_FICHIER=<app.html d'avant> node tests/test-3254.js` doit tomber sur les cas 1 à 3.            */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const i0 = SRC.indexOf('/* échecs réseau vers api.teamop.fr (hors sentinelle elle-même) */'), i1 = SRC.indexOf('try{ setInterval(tmFlush,35000);', i0);
const BLOC = i0 < 0 || i1 < 0 ? '' : SRC.slice(i0, i1);
const API = 'https://api.teamop.fr';
const tick = () => new Promise(r => setImmediate(r));

function monde() {
  const ev = { window: {}, document: {} }, signales = [];
  let t = 1_800_000_000_000;
  const S = {
    Date: { now: () => t }, Math, String, Promise, console,
    navigator: { onLine: true },
    document: { visibilityState: 'visible', addEventListener(k, f) { (ev.document[k] = ev.document[k] || []).push(f); } },
    tmPush: (type, msg) => signales.push(type + ' : ' + msg), tmFlush: () => {}, tmT: 0,
    /* le « vrai » fetch : une promesse que le banc tient, et qu'il termine quand il veut */
    fetch: () => { let res, rej; const p = new Promise((a, b) => { res = a; rej = b; }); S.__enVol.push({ res, rej }); return p; },
    __enVol: [],
  };
  S.window = S; S.addEventListener = (k, f) => { (ev.window[k] = ev.window[k] || []).push(f); };
  vm.createContext(S); vm.runInContext(BLOC, S);
  /* lance un appel et rend une poignée pour le terminer : .ok(statut), .coupe(message), .delai(ms) */
  const lance = (route, init) => {
    const pr = S.window.fetch(API + route, init || {}); pr.catch(() => {});
    const h = S.__enVol[S.__enVol.length - 1];
    return {
      ok: async (statut) => { h.res({ status: statut || 200 }); await tick(); await tick(); },
      coupe: async (msg) => { h.rej(new TypeError(msg || 'Load failed')); await tick(); await tick(); },
      abandon: async () => { const e = new Error('Fetch is aborted'); e.name = 'AbortError'; h.rej(e); await tick(); await tick(); },
    };
  };
  const appel = async (route, issue) => { const h = lance(route); if (issue === 'coupe') await h.coupe(); else await h.ok(issue); };
  return { S, signales, lance, appel, avance: (ms) => { t += ms; }, emet: (cote, k, arg) => (ev[cote][k] || []).forEach(f => f(arg)) };
}

console.log('\n── 3254 · 0. la population ──');
vrai('le bloc du relais réseau d’app.html est trouvé', BLOC.length > 800 && /window\.fetch=function/.test(BLOC), BLOC.length);

(async () => {
  console.log('\n── 3254 · 1. l’écran verrouillé : l’échec arrive AU RETOUR, avant l’événement « visible » ──');
  { const m = monde(); m.avance(10 * 60000);
    for (let k = 0; k < 3; k++) {
      const ecoute = m.lance('/api/doc/attendre');
      m.avance(8000);
      m.S.document.visibilityState = 'hidden'; m.emet('document', 'visibilitychange');      // la personne verrouille son iPhone
      m.avance(45000);
      await ecoute.coupe('Load failed');                                                     // iOS rend l'échec en se réveillant…
      m.S.document.visibilityState = 'visible'; m.emet('document', 'visibilitychange');     // … PUIS dit que la page est revenue
      m.avance(20000);
    }
    vrai('trois verrouillages en trois minutes, chacun coupant l’écoute : aucun dossier', m.signales.length === 0, m.signales); }

  console.log('\n── 3254 · 2. une connexion perdue pendant que les autres répondent ──');
  { const m = monde(); m.avance(10 * 60000);
    for (let k = 0; k < 4; k++) {
      const ecoute = m.lance('/api/doc/attendre');
      m.avance(5000); await m.appel('/api/espaces/etat', 200);                              // le serveur répond à l'appareil…
      m.avance(10000); await ecoute.coupe('Load failed');                                    // … et l'écoute, elle, se perd (wifi → 4G)
      m.avance(15000);
    }
    vrai('quatre écoutes perdues en deux minutes, d’autres réponses entre-temps : aucun dossier', m.signales.length === 0, m.signales); }

  console.log('\n── 3254 · 3. un redémarrage du serveur (une mise en ligne) : quelques secondes ──');
  { const m = monde(); m.avance(10 * 60000);
    for (const [s, route] of [[0, '/api/doc/attendre'], [1, '/api/doc/lire'], [2, '/api/doc/lire'], [4, '/api/doc/lire']]) { m.avance(s * 1000); await m.appel(route, 'coupe'); }
    m.avance(8000); await m.appel('/api/doc/lire', 200);
    vrai('quatre échecs en sept secondes, puis le serveur répond : aucun dossier (la règle d’avant en ouvrait un)', m.signales.length === 0, m.signales); }

  console.log('\n── 3254 · 4. une VRAIE panne se signale : 2 min sans aucune réponse, page au premier plan ──');
  { const m = monde(); m.avance(10 * 60000);
    for (let k = 0; k < 8; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('huit échecs en 1 min 45 : pas encore de dossier (la panne n’a pas 2 min)', m.signales.length === 0, m.signales);
    await m.appel('/api/doc/lire', 'coupe'); m.avance(15000);
    vrai('le neuvième, à 2 min sans aucune réponse : UN dossier, qui dit la durée et l’appel', m.signales.length === 1 && /^reseau : api\.teamop\.fr injoignable depuis plus de 2 min sur cet appareil — \/api\/doc\/lire \(Load failed\)$/.test(m.signales[0]), m.signales);
    for (let k = 0; k < 6; k++) { await m.appel(k % 2 ? '/api/doc/attendre' : '/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('… la panne qui continue, sur d’autres appels, n’ouvre pas d’autre dossier', m.signales.length === 1, m.signales);
    await m.appel('/api/doc/lire', 200); m.avance(5000);
    for (let k = 0; k < 4; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('… une réponse remet l’horloge à zéro : une minute de nouvelle coupure ne rouvre rien', m.signales.length === 1, m.signales);
    for (let k = 0; k < 6; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('… et une nouvelle panne de plus de 2 min ouvre son propre dossier', m.signales.length === 2, m.signales); }
  { const m = monde(); m.avance(10 * 60000);
    const sg = () => { const s = { __opDelai: 52000 }; return { signal: s }; };
    for (let k = 0; k < 4; k++) { const h = m.lance('/api/doc/ecrire', sg()); m.avance(52000); await h.abandon(); m.avance(1000); }
    vrai('des envois qui dépassent leur délai, sans aucune réponse pendant 2 min : « ne répond plus… pas de réponse en 52 s »', m.signales.length === 1 && /api\.teamop\.fr ne répond plus à cet appareil depuis plus de 2 min — \/api\/doc\/ecrire \(pas de réponse en 52 s\)/.test(m.signales[0]), m.signales); }

  console.log('\n── 3254 · 4 bis. au retour sur l’application, la panne se chronomètre APRÈS la minute de grâce ──');
  { const m = monde(); m.avance(10 * 60000);
    m.S.document.visibilityState = 'hidden'; m.emet('document', 'visibilitychange'); m.avance(5 * 60000);
    const ecoute = m.lance('/api/doc/attendre');
    m.S.document.visibilityState = 'visible';              // l'iPhone se réveille : l'état a changé…
    await ecoute.coupe('Load failed');                      // … l'écoute rend son échec…
    m.emet('document', 'visibilitychange');                 // … puis l'événement arrive (l'ordre vu chez Safari)
    for (let k = 0; k < 9; k++) { m.avance(15000); await m.appel('/api/doc/lire', 'coupe'); }
    vrai('2 min 15 de coupure juste après le retour : pas encore de dossier (la minute de grâce, puis 2 min de panne)', m.signales.length === 0, m.signales);
    for (let k = 0; k < 4; k++) { m.avance(15000); await m.appel('/api/doc/lire', 'coupe'); }
    vrai('… à 3 min 15, la panne qui dure se signale : un dossier', m.signales.length === 1, m.signales); }

  console.log('\n── 3254 · 5. une réponse 5xx prouve le réseau : elle se signale toujours ──');
  { const m = monde(); m.avance(10 * 60000); m.emet('window', 'online');
    await m.appel('/api/doc/lire', 502); m.avance(3000); await m.appel('/api/doc/lire', 502);
    vrai('deux 502 en trois secondes, même juste après le retour du réseau : un dossier « a répondu 502 »', m.signales.length === 1 && /a répondu 502 sur \/api\/doc\/lire/.test(m.signales[0]), m.signales); }

  console.log('\n── 3254 · 6. ce qui n’est jamais le serveur ──');
  { const m = monde(); m.avance(10 * 60000);
    const sv = { __opVolontaire: 1 };
    for (let k = 0; k < 8; k++) { const h = m.lance('/api/doc/attendre', { signal: sv }); m.avance(20000); await h.abandon(); }
    vrai('l’écoute coupée EXPRÈS (retour sur l’application, arrêt de la synchro) : jamais', m.signales.length === 0, m.signales); }
  { const m = monde(); m.avance(10 * 60000); m.S.navigator.onLine = false;
    for (let k = 0; k < 10; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('l’appareil se sait hors ligne pendant 2 min 30 : rien', m.signales.length === 0, m.signales); }
  { const m = monde(); m.avance(10 * 60000); m.S.document.visibilityState = 'hidden'; m.emet('document', 'visibilitychange');
    for (let k = 0; k < 10; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(15000); }
    vrai('la page au second plan pendant 2 min 30 (iOS coupe le réseau d’une page cachée) : rien', m.signales.length === 0, m.signales); }
  { const m = monde(); m.avance(10 * 60000);
    for (let k = 0; k < 4; k++) { await m.appel('/api/doc/lire', 'coupe'); m.avance(100000); }
    vrai('des échecs espacés de plus de 90 s (un ordinateur qui dort et se réveille) : chacun repart de zéro, rien', m.signales.length === 0, m.signales); }
  { const m = monde(); m.avance(10 * 60000);
    for (let k = 0; k < 6; k++) { await m.appel('/api/monitor/report', 'coupe'); m.avance(30000); }
    vrai('les appels « au mieux » (la sentinelle elle-même) restent hors du compte', m.signales.length === 0, m.signales); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ' + (e && e.stack)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
