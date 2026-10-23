/* ══ test-2856 · UN APPAREIL SANS RÉSEAU N'EST PAS UN SERVEUR INJOIGNABLE ═════════════════════════════════════════════════════
   22 octobre 2026, deux dossiers de la Tour : « api.teamop.fr injoignable sur /api/mailboxes (Failed to fetch) » ×3 et « … sur
   /api/replies » ×1, la même minute (01 h 46-47), OP GESTION v768-beta, écran Messages, un PC sous Chrome. Le serveur, lui,
   tournait sans interruption depuis 48 h (`/health` : uptime) : c'était l'appareil — un ordinateur qui sort de veille, un wifi
   qui revient. La sentinelle ne signalait déjà qu'à la 2e fois en 3 minutes ; elle ne savait pas distinguer « l'appareil n'a
   pas de réseau » de « le serveur ne répond pas ».
   Ce banc EXÉCUTE le vrai bloc d'app.html (le relais de fetch et les écouteurs de retour) sur une horloge qu'il tient, et
   rejoue la nuit du 22 ; puis chaque garde, et ce qu'elles ne doivent PAS taire (une vraie panne, une réponse 5xx, une panne à
   l'ouverture de l'application).                                                                                              */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const i0 = SRC.indexOf('/* échecs réseau vers api.teamop.fr (hors sentinelle elle-même) */'), i1 = SRC.indexOf('try{ setInterval(tmFlush,35000);', i0);
const BLOC = i0 < 0 || i1 < 0 ? '' : SRC.slice(i0, i1);
const API = 'https://api.teamop.fr';

function monde() {
  const ev = { window: {}, document: {} }, signales = [];
  let t = 1_800_000_000_000;
  const S = {
    Date: { now: () => t }, Math, String, Promise, console,
    navigator: { onLine: true },
    document: { visibilityState: 'visible', addEventListener(k, f) { (ev.document[k] = ev.document[k] || []).push(f); } },
    tmPush: (type, msg) => signales.push(type + ' : ' + msg), tmFlush: () => {}, tmT: 0,
    /* le « vrai » fetch : il échoue (réseau) ou répond (statut), selon ce que le banc a décidé */
    fetch: (url) => S.__issue === 'echec' ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve({ status: S.__issue || 200 }),
    __issue: 200,
  };
  S.window = S; S.addEventListener = (k, f) => { (ev.window[k] = ev.window[k] || []).push(f); };
  vm.createContext(S); vm.runInContext(BLOC, S);
  const appel = async (route, issue) => { S.__issue = issue; try { await S.window.fetch(API + route); } catch (e) {} await new Promise(r => setImmediate(r)); };
  return { S, signales, appel, avance: (ms) => { t += ms; }, emet: (cote, k, arg) => (ev[cote][k] || []).forEach(f => f(arg)) };
}

console.log('\n── 2856 · 0. la population ──');
vrai('le bloc du relais réseau d’app.html est trouvé', BLOC.length > 800 && /window\.fetch=function/.test(BLOC) && /__tmRetour/.test(BLOC), BLOC.length);

(async () => {
  console.log('\n── 2856 · 1. la nuit du 22 octobre, rejouée ──');
  { const m = monde(); m.avance(10 * 60000);
    /* 01 h 46 : l'ordinateur revient — la page repasse au premier plan — et le réseau n'est pas encore là */
    m.S.document.visibilityState = 'visible'; m.emet('document', 'visibilitychange');
    for (const [s, route] of [[2, '/api/mailboxes'], [15, '/api/mailboxes'], [20, '/api/replies'], [15, '/api/mailboxes'], [5, '/api/replies']]) { m.avance(s * 1000); await m.appel(route, 'echec'); }
    vrai('⛔ cinq échecs dans la minute qui suit le retour (mailboxes ×3, replies ×2) : aucun dossier', m.signales.length === 0, m.signales);
    m.avance(30000); await m.appel('/api/mailboxes', 200);
    vrai('… et le réseau revenu, la Réception répond (rien de signalé)', m.signales.length === 0, m.signales); }

  console.log('\n── 2856 · 2. chaque garde ──');
  { const m = monde(); m.S.navigator.onLine = false;
    await m.appel('/api/mailboxes', 'echec'); m.avance(5000); await m.appel('/api/mailboxes', 'echec');
    vrai('⛔ l’appareil se sait hors ligne (navigator.onLine faux) : deux échecs, rien', m.signales.length === 0, m.signales); }
  { const m = monde(); m.avance(5 * 60000); m.emet('window', 'online');
    await m.appel('/api/mailboxes', 'echec'); m.avance(20000); await m.appel('/api/mailboxes', 'echec');
    vrai('⛔ le réseau vient de revenir (« online ») : deux échecs dans la minute, rien', m.signales.length === 0, m.signales);
    m.avance(61000); await m.appel('/api/mailboxes', 'echec'); m.avance(5000); await m.appel('/api/mailboxes', 'echec');
    vrai('… passé la minute, une panne qui dure se signale (« injoignable sur /api/mailboxes »)', m.signales.length === 1 && /injoignable sur \/api\/mailboxes \(Failed to fetch\)/.test(m.signales[0]), m.signales); }
  { const m = monde(); m.avance(5 * 60000); m.emet('window', 'pageshow', { persisted: true });
    await m.appel('/api/replies', 'echec'); m.avance(5000); await m.appel('/api/replies', 'echec');
    vrai('la page rendue par le cache d’historique (pageshow, persisted) : rien dans la minute', m.signales.length === 0, m.signales); }
  { const m = monde(); m.emet('window', 'pageshow', { persisted: false });
    await m.appel('/api/replies', 'echec'); m.avance(5000); await m.appel('/api/replies', 'echec');
    vrai('⛔ le PREMIER chargement n’est pas un retour : une panne à l’ouverture se signale tout de suite (2e échec)', m.signales.length === 1 && /injoignable sur \/api\/replies/.test(m.signales[0]), m.signales); }
  { const m = monde(); m.avance(5 * 60000); m.emet('window', 'online');
    await m.appel('/api/mailboxes', 503); m.avance(3000); await m.appel('/api/mailboxes', 503);
    vrai('⛔ une réponse 5xx juste après le retour se signale quand même (elle prouve le réseau)', m.signales.length === 1 && /a répondu 503 sur \/api\/mailboxes/.test(m.signales[0]), m.signales); }
  { const m = monde();
    await m.appel('/api/mailboxes', 'echec');
    vrai('un échec isolé ne se signale toujours pas (la règle d’avant tient)', m.signales.length === 0, m.signales);
    m.avance(4 * 60000); await m.appel('/api/mailboxes', 'echec');
    vrai('… ni deux échecs à plus de 3 minutes d’écart', m.signales.length === 0, m.signales);
    await m.appel('/api/monitor/report', 'echec'); await m.appel('/api/monitor/report', 'echec');
    vrai('… ni les appels « au mieux » (la sentinelle elle-même)', m.signales.length === 0, m.signales); }
  { const m = monde(); m.S.document.visibilityState = 'hidden'; m.emet('document', 'visibilitychange');
    await m.appel('/api/mailboxes', 'echec'); m.avance(5000); await m.appel('/api/mailboxes', 'echec');
    vrai('passer au second plan n’ouvre PAS la minute de grâce (seul le retour au premier plan l’ouvre)', m.signales.length === 1, m.signales); }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
