/* ══ test-2855 · L'ESPACE CLIENT NE PREND PLUS UN TROU ENTRE DEUX IMAGES POUR UN GEL ══════════════════════════════════════════
   22 octobre 2026, dossier de la Tour : « Interface figée pendant 10639 ms » — Espace client, écran Général, PC, Safari, un client.
   Safari n'a pas « longtask » : la sentinelle d'espace.html y mesure l'écart entre deux images (requestAnimationFrame), et Safari
   les suspend quand la fenêtre passe au second plan, se cache, que le Mac s'endort — ou qu'une boîte du navigateur (alert,
   confirm, prompt : l'espace en ouvre une vingtaine) attend qu'on la lise. Au retour, la page est « visible » et l'écart vaut
   tout le temps d'absence : un faux gel, qui envoie chercher une panne qui n'existe pas. app.html avait ce correctif depuis le
   15 septembre (test-679) ; l'espace l'avait gardé dans sa forme d'avant.
   Ce banc EXÉCUTE le vrai bloc d'espace.html, sur une horloge qu'il tient, et rejoue chaque cas : un vrai gel se signale ; une
   boîte lue, un second plan, un onglet caché, une fenêtre sans le focus, une veille ne se signalent pas. La preuve dans un vrai
   navigateur (le chemin de Safari forcé, une vraie boîte de 10,6 s) : scratchpad/sonde-espace-gel.js.                         */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.ESPACE_FICHIER || path.join(__dirname, '..', 'espace.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const i0 = SRC.indexOf("if(window.PerformanceObserver&&PerformanceObserver.supportedEntryTypes"), i1 = SRC.indexOf('requestAnimationFrame(tmTick);\n    }', i0);
const BLOC = i0 < 0 || i1 < 0 ? '' : SRC.slice(i0, i1 + 'requestAnimationFrame(tmTick);\n    }'.length);

/* un navigateur minimal : une horloge tenue par le banc, des images qu'on fait tomber à la main, le focus, la visibilité */
function monde(o) {
  o = o || {};
  const ev = { window: {}, document: {} }, signales = [];
  let t = 1000, image = null, observe = null;
  const S = {
    Date: { now: () => t }, Math,
    document: { visibilityState: 'visible', _focus: true, hasFocus() { return this._focus; },
      addEventListener(k, f) { (ev.document[k] = ev.document[k] || []).push(f); } },
    requestAnimationFrame: (f) => { image = f; },
    tmPush: (type, msg) => signales.push(type + ' : ' + msg), tmT: 1000,
    alert: () => {}, confirm: () => true, prompt: () => 'x',
  };
  S.window = S;
  S.addEventListener = (k, f) => { (ev.window[k] = ev.window[k] || []).push(f); };
  if (o.longtask) S.PerformanceObserver = Object.assign(function (fn) { this.observe = () => { observe = fn; }; }, { supportedEntryTypes: ['longtask'] });
  vm.createContext(S); vm.runInContext(BLOC, S);
  return {
    S, signales, ev,
    avance: (ms) => { t += ms; },
    image: () => { const f = image; image = null; if (f) f(); },
    images: (n, pas) => { for (let k = 0; k < n; k++) { t += pas; const f = image; image = null; if (f) f(); } },
    emet: (cote, k) => (ev[cote][k] || []).forEach(f => f()),
    longue: (d) => observe && observe({ getEntries: () => [{ duration: d }] }),
    set t(v) { t = v; }, get t() { return t; },
  };
}

console.log('\n── 2855 · 0. la population ──');
vrai('le bloc des lenteurs d’espace.html est trouvé (longtask, puis requestAnimationFrame)', BLOC.length > 500 && /tmTick/.test(BLOC) && /longtask/.test(BLOC), BLOC.length);

console.log('\n── 2855 · 1. Safari (requestAnimationFrame) : un vrai gel se signale, une absence ne se signale pas ──');
{ const m = monde(); m.images(30, 16);
  vrai('(population) trente images à 16 ms : rien n’est signalé', m.signales.length === 0, m.signales);
  m.avance(3000); m.image();
  vrai('un VRAI gel de 3 s, fenêtre visible et au premier plan : signalé « Interface figée pendant 3000 ms »', m.signales.length === 1 && /figée pendant 3000 ms/.test(m.signales[0]), m.signales); }
{ const m = monde(); m.images(5, 16);
  const env = m.S.window.alert;
  vrai('(population) le bloc a enveloppé alert, confirm et prompt (ce ne sont plus celles du navigateur)', typeof env === 'function' && !/=>\s*\{\s*\}/.test(String(env)) && typeof m.S.window.confirm === 'function' && typeof m.S.window.prompt === 'function', String(env).slice(0, 80)); }
{ /* la boîte qui « dure » : une boîte du navigateur qui fait avancer l'horloge de 10 639 ms pendant qu'elle attend */
  const ev = {}, signales = []; let t = 1000, image = null;
  const S = { Date: { now: () => t }, Math, tmPush: (ty, msg) => signales.push(msg), tmT: 1000,
    document: { visibilityState: 'visible', hasFocus: () => true, addEventListener() {} }, requestAnimationFrame: f => { image = f; },
    alert: () => { t += 10639; }, confirm: () => { t += 10639; return true; }, prompt: () => { t += 10639; return 'Pro'; } };
  S.window = S; S.addEventListener = () => {};
  vm.createContext(S); vm.runInContext(BLOC, S);
  const tomber = () => { t += 16; const f = image; image = null; f && f(); };
  tomber(); tomber();
  for (const [k, rend] of [['alert', undefined], ['confirm', true], ['prompt', 'Pro']]) {
    const r = S.window[k]('Message'); tomber();
    vrai('⛔ une boîte « ' + k + ' » lue 10,6 s : aucun gel signalé (le compteur repart à sa fermeture), et elle rend ce que rend le navigateur', signales.length === 0 && r === rend, { signales, r });
  }
  t += 3000; tomber();
  vrai('… et un vrai gel juste après se signale toujours', signales.length === 1 && /3016 ms/.test(signales[0]), signales); }
{ const m = monde(); m.images(3, 16);
  m.emet('window', 'blur'); m.avance(10639); m.emet('window', 'focus'); m.images(1, 16);
  vrai('⛔ la fenêtre au second plan 10,6 s (blur, puis focus) : rien', m.signales.length === 0, m.signales);
  m.S.document.visibilityState = 'hidden'; m.emet('document', 'visibilitychange'); m.avance(10639); m.S.document.visibilityState = 'visible'; m.emet('document', 'visibilitychange'); m.images(1, 16);
  vrai('⛔ l’onglet caché 10,6 s (visibilitychange) : rien', m.signales.length === 0, m.signales);
  m.avance(10639); m.emet('window', 'pageshow'); m.images(1, 16);
  vrai('la page rendue par le cache d’historique (pageshow) : rien', m.signales.length === 0, m.signales);
  m.S.document._focus = false; m.avance(3000); m.image();
  vrai('⛔ un trou de 3 s pendant que la fenêtre n’a pas le focus (une autre fenêtre devant) : rien', m.signales.length === 0, m.signales);
  m.S.document._focus = true; m.avance(20000); m.image();
  vrai('⛔ 20 s d’un coup, au premier plan : une veille, pas un gel — rien', m.signales.length === 0, m.signales);
  m.avance(2500); m.image();
  vrai('… et le premier vrai gel d’après se signale', m.signales.length === 1 && /figée pendant 2500 ms/.test(m.signales[0]), m.signales); }

console.log('\n── 2855 · 2. Chrome (longtask) : le même plafond ──');
{ const m = monde({ longtask: true });
  m.longue(3000); m.longue(20000); m.longue(1500);
  vrai('une tâche de 3 s se signale ; 20 s (une veille) et 1,5 s non', m.signales.length === 1 && /bloquée pendant 3000 ms/.test(m.signales[0]), m.signales); }

console.log('\n── 2855 · 3. ce qui reste écrit ──');
vrai('le commentaire dit le dossier qui a mené ici (10639 ms)', /Interface figée pendant 10639 ms/.test(SRC));
vrai('la sentinelle reste désactivable et ne fait jamais tomber la page (try/catch autour du bloc)', /top_monitor_off/.test(SRC) && /\}catch\(_\)\{ \}\n/.test(SRC.slice(i1, i1 + 80)), SRC.slice(i1, i1 + 80));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
