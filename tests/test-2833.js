/* ══ test-2833 · CHANGER D'ÉCRAN NE REND PLUS LA PAGE SOURDE, ET UN ENREGISTREMENT NE REJOUE PAS L'ENTRÉE ══════════════════════
   Audit apple-design du 21 octobre 2026, § 1 (réponse) et § 3 (« never lock out input during a transition »).
   · Pendant une transition de vue, le navigateur rend TOUT le document inerte : un toucher va à <html> (et
     `::view-transition{pointer-events:none}` n'y change rien, essayé). Mesuré au vrai doigt : 40, 120 et 220 ms après un
     changement de rubrique, aucun toucher n'atteignait l'écran. Changer de rubrique n'a pas de sens de déplacement : il n'a
     plus de transition (l'écran est posé tout de suite, vivant, avec sa cascade d'entrée). Entrer dans une fiche ou en sortir
     garde sa poussée (§ 7) — et un appui pendant la poussée la TERMINE (skipTransition), sans déclencher de geste à l'aveugle.
   · Vingt-sept gestes rappellent go(current) pour redessiner après un enregistrement : chacun rejouait toute l'entrée (fondu,
     cascade, chiffres des tuiles repartis de zéro). Un rafraîchissement se redessine désormais SUR PLACE.
   · La classe d'entrée était retirée par une minuterie jamais annulée : une navigation rapide coupait net celle d'après.
   Ce banc EXÉCUTE rendreVueAnimee, rendreDirige, vtTaire et l'écouteur d'appui, extraits d'app.html, dans un bac à sable.
   La preuve au vrai doigt : scratchpad/sonde-taps-transition.js (origine 3 ✓ 7 ✗, corrigée 10 ✓).                         */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
/* une fonction jusqu'à SA fin : accolades comptées hors chaînes */
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1);
}
const i0 = CODE.indexOf('var _vtEnCours=null;'), i1 = CODE.indexOf('},true);', i0);
const APPUI = i0 > 0 && i1 > i0 ? CODE.slice(i0, i1 + 8) : '';

console.log('\n── 2833 · 0. la population ──');
const SRC = ['rendreVueAnimee', 'rendreDirige', 'vtTaire'].map(fonction);
vrai('les trois fonctions de la navigation sont trouvées', SRC.every(x => x.length > 50), SRC.map(x => x.length));
vrai('l’écouteur d’appui des transitions est trouvé', APPUI.length > 60 && /pointerdown/.test(APPUI), APPUI.length);

function monde(o) {
  o = o || {};
  const J = { sure: [], kpi: 0, vt: [], minut: [], annule: [], ecoute: {} };
  const classes = () => { const s = new Set(); return { add: (c) => s.add(c), remove: (c) => s.delete(c), contains: (c) => s.has(c) }; };
  const content = { classList: classes() };
  const fini = Promise.resolve();
  const doc = {
    documentElement: { classList: classes() },
    addEventListener: (t, f, cap) => { (J.ecoute[t] = J.ecoute[t] || []).push(f); },
    startViewTransition: o.sansVT ? undefined : (cb) => { const vt = { cb, saute: 0, finished: new Promise(() => {}), ready: new Promise(() => {}), updateCallbackDone: new Promise(() => {}), skipTransition() { vt.saute++; } }; J.vt.push(vt); cb(); return vt; },
  };
  const ctx = { document: doc, window: {}, console,
    $: (id) => id === 'content' ? content : null,
    matchMedia: () => ({ matches: !!o.sobre }),
    rendreVueSure: (v, r) => J.sure.push([v, r]), compterKpi: () => { J.kpi++; },
    setTimeout: (f, ms) => { J.minut.push(f); return J.minut.length; }, clearTimeout: (id) => J.annule.push(id) };
  ctx.window.matchMedia = ctx.matchMedia;
  vm.createContext(ctx);
  try { vm.runInContext(SRC.join('\n') + '\n' + APPUI, ctx); } catch (e) { ctx.__err = e.message; }
  /* un code qui ne s'exécute pas fait tomber les contrôles qui en dépendent, il ne fait pas MOURIR le banc :
     la contre-épreuve doit pouvoir lire tout le rapport */
  for (const f of ['rendreVueAnimee']) if (typeof ctx[f] !== 'function') ctx[f] = () => {};
  return { ctx, J, content };
}

console.log('\n── 2833 · 1. un rafraîchissement se redessine sur place ──');
{
  const M = monde();
  vrai('le code s’exécute', !M.ctx.__err, M.ctx.__err);
  M.ctx.rendreVueAnimee('interventions', undefined, false);   // go(current) : remonter vaut faux
  vrai('go(current) : la vue se redessine une fois, sans remonter', JSON.stringify(M.J.sure) === JSON.stringify([['interventions', false]]), M.J.sure);
  vrai('… sans transition de vue (le document reste vivant)', M.J.vt.length === 0, M.J.vt.length);
  vrai('… sans cascade d’entrée ni chiffres recomptés', !M.content.classList.contains('entre') && M.J.kpi === 0, { entre: M.content.classList.contains('entre'), kpi: M.J.kpi });
}

console.log('\n── 2833 · 2. changer de rubrique : pas de transition, l’écran arrive vivant ──');
{
  const M = monde();
  M.ctx.rendreVueAnimee('clients', undefined, true);
  vrai('aucune transition de vue pour un changement de rubrique (pas de sens de déplacement)', M.J.vt.length === 0, M.J.vt.length);
  vrai('… mais l’écran arrive avec son entrée : rendu, cascade, chiffres', M.J.sure.length === 1 && M.content.classList.contains('entre') && M.J.kpi === 1, { sure: M.J.sure, kpi: M.J.kpi });
  M.ctx.rendreVueAnimee('stock', undefined, true);
  vrai('une seconde navigation ANNULE la minuterie de la première (la cascade suivante n’est pas coupée net)', M.J.annule.includes(1), M.J.annule);
}

console.log('\n── 2833 · 3. entrer dans une fiche garde sa poussée, et un appui la termine ──');
{
  const M = monde();
  M.ctx.rendreVueAnimee('intDetail', 'avant', true);
  vrai('la fiche entre par une transition (la poussée qui porte un sens)', M.J.vt.length === 1, M.J.vt.length);
  const appui = (M.J.ecoute.pointerdown || [])[0];
  vrai('un écouteur d’appui veille sur les transitions', typeof appui === 'function');
  if (appui) appui({ clientX: 10, clientY: 10 });
  vrai('un appui pendant la poussée la TERMINE (skipTransition)', M.J.vt[0] && M.J.vt[0].saute === 1, M.J.vt[0] && M.J.vt[0].saute);
  if (appui) appui({ clientX: 10, clientY: 10 });
  vrai('… une seule fois (la transition terminée n’est plus suivie)', M.J.vt[0] && M.J.vt[0].saute === 1);
  vrai('⛔ aucun clic n’est « rendu » à ce qui est sous le doigt (un toucher à 120 ms visait un filtre, essayé)', !(M.J.ecoute.click || []).length && !/\.click\(\)/.test(APPUI), (M.J.ecoute.click || []).length);
}

console.log('\n── 2833 · 4. animations réduites : rien ne change ──');
{
  const M = monde({ sobre: true });
  M.ctx.rendreVueAnimee('clients', undefined, true); M.ctx.rendreVueAnimee('intDetail', 'avant', true);
  vrai('sous « réduire les animations », aucune transition et aucune cascade', M.J.vt.length === 0 && !M.content.classList.contains('entre'), { vt: M.J.vt.length });
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
