/* ══ g15 · accueil#14 — « ACTIVER SUR CET APPAREIL » NE DISAIT RIEN QUAND L'AUTORISATION ÉTAIT REFUSÉE ═══════
   `pushSubscribe(quiet)` sortait par `if(p!=='granted') return false` sans un mot : le navigateur refusait (ou la
   personne fermait la demande), le bouton restait « Activer sur cet appareil » et rien n'expliquait pourquoi.
   Seul le cas DÉJÀ « denied » parlait. Une action demandée par un geste doit dire pourquoi elle n'a pas abouti ;
   en revanche l'appel au lancement (`quiet`) reste muet — il n'est pas un geste.

   Ce banc EXÉCUTE la vraie `pushSubscribe` (et `pushSupported`) avec un `Notification`, un service worker et un
   `fetch` de bac à sable : il lit les toasts de chaque issue de la demande, geste par geste puis en mode silencieux. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
console.log('\n── 1283 · 0. la population ──');
const PS = bloc('async function pushSubscribe(quiet){'), SUP = bloc('function pushSupported(){');
vrai('pushSubscribe et pushSupported sont trouvées', PS.length > 300 && SUP.length > 40, [PS.length, SUP.length]);
vrai('⛔ une seule définition de pushSubscribe', SRC.split('function pushSubscribe(').length - 1 === 1);

function monde({ permission, reponse, supporte = true }) {
  const ctx = { console, JSON, Math, Date, Uint8Array, Promise, __toasts: [], __fetch: 0, __abonne: 0, __demandes: 0, __ls: {},
    currentUser: { id: 'u1', prenom: 'A', nom: 'B' }, current: 'dashboard', views: {}, PUSH_API: 'https://x', PUSH_VAPID: 'AAAA' };
  ctx.localStorage = { getItem: k => ctx.__ls[k] || null, setItem: (k, v) => { ctx.__ls[k] = v; } };
  ctx.Notification = { permission, requestPermission: async () => { ctx.__demandes++; ctx.Notification.permission = reponse === 'granted' ? 'granted' : reponse === 'denied' ? 'denied' : 'default'; return reponse; } };
  const swOk = { ready: Promise.resolve({ pushManager: { subscribe: async () => { ctx.__abonne++; return { toJSON: () => ({ endpoint: 'e' }) }; } } }) };
  ctx.navigator = supporte ? { serviceWorker: swOk } : {};
  ctx.window = supporte ? { PushManager: function () {}, Notification: ctx.Notification } : {};
  ctx.fetch = async () => { ctx.__fetch++; return {}; };
  vm.createContext(ctx);
  vm.runInContext(`var window=this.window; function toast(m){ __toasts.push(String(m)); }
    async function enteteEquipe(h){ return h; } function syncTeam(){ return 't'; } function fullName(u){ return 'A B'; } function _vapidArr(k){ return new Uint8Array(1); }
    ${SUP}\n${PS}`, ctx);
  // pushSupported lit 'PushManager' in window et 'Notification' in window : le bac à sable les expose sur window
  return ctx;
}

(async () => {
  console.log('\n── 1283 · 1. le geste (quiet faux) : chaque issue de la demande est DITE ──');
  { const W = monde({ permission: 'default', reponse: 'denied' }); const r = await W.pushSubscribe();
    vrai('la demande a bien été posée (sinon le banc ne regarde rien)', W.__demandes === 1, W.__demandes);
    vrai('refus du navigateur : rend false', r === false, r);
    vrai('⛔ … et un toast DIT qu\'elles sont refusées et où les réactiver', W.__toasts.length === 1 && /refus/i.test(W.__toasts[0]) && /réglages/i.test(W.__toasts[0]), W.__toasts);
    vrai('… sans rien envoyer au serveur', W.__fetch === 0 && W.__abonne === 0); }
  { const W = monde({ permission: 'default', reponse: 'default' }); const r = await W.pushSubscribe();
    vrai('demande fermée sans réponse : rend false', r === false, r);
    vrai('⛔ … et un toast DIT que l\'autorisation n\'a pas été donnée et comment relancer', W.__toasts.length === 1 && /pas (été )?donn|fermé|non donn/i.test(W.__toasts[0]) && /Activer/.test(W.__toasts[0]), W.__toasts); }
  { const W = monde({ permission: 'denied' }); const r = await W.pushSubscribe();
    vrai('déjà bloquées : le message existant reste', r === false && W.__toasts.length === 1 && /bloqu/i.test(W.__toasts[0]) && W.__demandes === 0, [r, W.__toasts]); }
  { const W = monde({ permission: 'default', reponse: 'granted' }); const r = await W.pushSubscribe();
    vrai('contre-épreuve : accordées, abonnement posé, un seul toast de succès', r === true && W.__abonne === 1 && W.__fetch === 1 && W.__toasts.length === 1 && /activées/i.test(W.__toasts[0]), [r, W.__toasts]); }
  { const W = monde({ permission: 'default', reponse: 'denied', supporte: false }); const r = await W.pushSubscribe();
    vrai('navigateur sans notifications : le geste le DIT aussi (au lieu du silence)', r === false && W.__toasts.length === 1 && /ne g[eè]re pas|pas pris en charge|non pris en charge/i.test(W.__toasts[0]) && W.__demandes === 0, [r, W.__toasts]); }

  console.log('\n── 1283 · 2. au lancement (quiet vrai) : toujours muet — ce n\'est pas un geste ──');
  for (const cas of [{ permission: 'default', reponse: 'denied' }, { permission: 'default', reponse: 'default' }, { permission: 'denied' }, { permission: 'default', reponse: 'denied', supporte: false }]) {
    const W = monde(cas); const r = await W.pushSubscribe(true);
    vrai('quiet (' + cas.permission + (cas.reponse ? ' → ' + cas.reponse : '') + (cas.supporte === false ? ', non géré' : '') + ') : false et aucun toast', r === false && W.__toasts.length === 0, W.__toasts); }
  { const W = monde({ permission: 'granted' }); const r = await W.pushSubscribe(true);
    vrai('quiet + déjà accordées : s\'abonne en silence', r === true && W.__abonne === 1 && W.__toasts.length === 0, [r, W.__toasts]); }

  console.log('\n══ test-1283 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
  process.exit(ko ? 1 : 0);
})();
