/* ══ test-2845 · LE JOUR ET LA NUIT SE FONDENT, PAR TOUS LES CHEMINS ═══════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 24. Seul le bouton de la barre du haut (toggleTheme, son cercle) passait par
   une transition : « Sombre » choisi dans la fenêtre Apparence, le passage automatique du téléphone à la nuit, un réglage
   changé sur un autre appareil inversaient TOUTE l'interface en une image.
   Ce banc EXÉCUTE themeCible, themeFondu, setThemePref(Nu), tcMode et prefAppliquer extraits d'app.html, avec une transition
   de vue simulée (on la voit partir, son rappel s'exécute plus tard, comme dans le navigateur) ; il relit le branchement du
   système, de la synchro, de l'ouverture et du bouton, puis la feuille. La preuve au pixel (la page arrêtée à mi-fondu est
   là où la courbe la met, aux cinq chemins) : scratchpad/sonde-theme-fondu.js.                                            */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; } }
  return CODE.slice(m.index + 1, k + 1);
}
console.log('\n── 2845 · 0. la population ──');
const NOMS = ['themeCible', 'themeFondu', 'setThemePrefNu', 'setThemePref', 'tcMode', 'prefAppliquer', 'vtTaire'];
const F = NOMS.map(fonction);
vrai('les sept fonctions sont trouvées', F.every(x => x.length > 30), NOMS.map((n, i) => n + ':' + F[i].length));

function monde(o) {
  o = o || {};
  const J = { vt: [], applique: [], journal: [], prefs: { elan_theme: o.pref || 'light' } };
  const cl = new Set(o.classes || []), attrs = { 'data-theme': o.affiche || 'light' };
  const racine = { classList: { add: (c) => cl.add(c), remove: (c) => cl.delete(c), contains: (c) => cl.has(c) }, getAttribute: (k) => attrs[k], setAttribute: (k, v) => { attrs[k] = v; } };
  const promesse = () => { let res; const p = new Promise(r => { res = r; }); p.res = res; return p; };
  const doc = { documentElement: racine, visibilityState: o.cache ? 'hidden' : 'visible' };
  if (!o.sansVT) doc.startViewTransition = (f) => { const vt = { f, ready: promesse(), finished: promesse(), updateCallbackDone: promesse(), classes: [...cl].join(' ') }; J.vt.push(vt); return vt; };
  const ctx = { document: doc, console, String, Object, Promise, window: {}, current: 'dashboard', THEME_ICO: { light: '☀', dark: '☾', auto: '◐' }, THEME_LBL: { light: 'Clair', dark: 'Sombre', auto: 'Auto' },
    PREF_CLES: { theme: 'elan_theme' }, _vtEnCours: null,
    systemDark: () => !!o.systemeNuit, effectiveTheme: () => { const p = J.prefs.elan_theme; return p === 'auto' ? (o.systemeNuit ? 'dark' : 'light') : p; },
    prefLocal: (k, v) => { J.prefs[k] = v; }, prefLocalLire: (k) => J.prefs[k], prefGarder: (k, v) => J.journal.push('garder ' + k + '=' + v),
    applyTheme: () => { const p = J.prefs.elan_theme; attrs['data-theme'] = p === 'auto' ? (o.systemeNuit ? 'dark' : 'light') : (p === 'light' ? 'light' : 'dark'); J.applique.push(attrs['data-theme']); },
    toast: (m) => J.journal.push('toast ' + m), views: { parametres: () => J.journal.push('parametres') }, themeCouleur: () => J.journal.push('themeCouleur'), avatarAccentSync: () => {} };
  vm.createContext(ctx);
  try { vm.runInContext(F.join('\n') + '\nthis.__vt=()=>_vtEnCours;', ctx); } catch (e) { J.err = e.message; }
  for (const n of NOMS) if (typeof ctx[n] !== 'function') ctx[n] = () => {};
  return { ctx, J, racine, cl, attrs };
}

console.log('\n── 2845 · 1. un vrai changement se fond ──');
{ const M = monde({ affiche: 'light' }); vrai('le code s’exécute', !M.J.err, M.J.err);
  M.ctx.setThemePref('dark');
  vrai('« Sombre » sur un écran clair : une transition de vue part, la page marquée theme-fondu', M.J.vt.length === 1 && M.J.vt[0].classes === 'theme-fondu', M.J.vt.map(v => v.classes));
  vrai('… et rien n’est encore appliqué : le navigateur filme d’abord l’ancien écran', M.J.applique.length === 0 && M.attrs['data-theme'] === 'light');
  if (M.J.vt[0]) M.J.vt[0].f();
  vrai('le rappel applique tout, d’un bloc (réglage rangé, thème posé, réglage gardé, toast)', M.attrs['data-theme'] === 'dark' && M.J.prefs.elan_theme === 'dark' && M.J.journal.includes('garder theme=dark') && M.J.journal.some(x => /^toast /.test(x)), M.J.journal);
  vrai('un toucher peut terminer le fondu (_vtEnCours, comme une navigation)', M.ctx.__vt() === M.J.vt[0]); }
{ const M = monde({ affiche: 'light' }); M.ctx.setThemePref('dark'); const vt = M.J.vt[0] || { f() {}, finished: { res() {} } }; vt.f(); vt.finished.res();
  setTimeout(() => { vrai('la transition finie, la marque theme-fondu est retirée et _vtEnCours libéré', !M.cl.has('theme-fondu') && M.ctx.__vt() === null, [...M.cl]); }, 0); }

console.log('\n── 2845 · 2. ce qui ne doit PAS se fondre ──');
{ const M = monde({ affiche: 'dark', pref: 'dark' }); M.ctx.setThemePref('dark');
  vrai('le thème DÉJÀ affiché : aucune transition, appliqué tout de suite', M.J.vt.length === 0 && M.J.applique.length === 1); }
{ const M = monde({ affiche: 'light', sansVT: true }); M.ctx.setThemePref('dark');
  vrai('un navigateur sans transition de vue : appliqué tout de suite', M.attrs['data-theme'] === 'dark'); }
{ const M = monde({ affiche: 'light', cache: true }); M.ctx.setThemePref('dark');
  vrai('une page cachée (en arrière-plan) : appliqué tout de suite, sans transition', M.J.vt.length === 0 && M.attrs['data-theme'] === 'dark'); }
{ const M = monde({ affiche: 'light', classes: ['theme-vt'] }); M.ctx.setThemePref('dark');
  vrai('pendant le cercle du bouton (theme-vt) : pas de second fondu par-dessus', M.J.vt.length === 0 && M.attrs['data-theme'] === 'dark'); }
{ const M = monde({ affiche: 'light', systemeNuit: false }); M.ctx.setThemePref('auto');
  vrai('« Auto » quand le système est de jour, sur un écran clair : rien ne change, rien ne se fond', M.J.vt.length === 0); }
{ const M = monde({ affiche: 'light', systemeNuit: true }); M.ctx.setThemePref('auto');
  vrai('« Auto » quand le système est de nuit : c’est un vrai changement, il se fond', M.J.vt.length === 1); }

console.log('\n── 2845 · 3. la fenêtre Apparence, la synchro, l’ouverture ──');
{ const M = monde({ affiche: 'light' }); M.ctx.tcMode('dark');
  vrai('Apparence → « Sombre » : une transition part, rien n’est appliqué avant son rappel', M.J.vt.length === 1 && M.J.applique.length === 0 && !M.J.journal.length);
  if (M.J.vt[0]) M.J.vt[0].f();
  vrai('… le rappel pose le thème ET redessine la fenêtre Apparence (dans le nouvel écran, pas l’ancien)', M.attrs['data-theme'] === 'dark' && M.J.journal.includes('themeCouleur') && M.J.journal.includes('garder theme=dark'), M.J.journal); }
{ const M = monde({ affiche: 'light' }); M.ctx.prefAppliquer({ pref: { theme: 'dark' } }, true);
  vrai('un réglage arrivé d’un autre appareil (prefAppliquer(u, true)) se fond', M.J.vt.length === 1 && M.attrs['data-theme'] === 'light');
  if (M.J.vt[0]) M.J.vt[0].f(); vrai('… et le rappel le pose', M.attrs['data-theme'] === 'dark'); }
{ const M = monde({ affiche: 'light' }); const r = M.ctx.prefAppliquer({ pref: { theme: 'dark' } });
  vrai('⛔ à l’ouverture (prefAppliquer(u), enterApp) : posé TOUT DE SUITE, avant de dessiner — aucune transition', M.J.vt.length === 0 && M.attrs['data-theme'] === 'dark' && r === true); }
{ const appels = [...CODE.matchAll(/prefAppliquer\(([^)]*)\)/g)].map(m => m[1]).filter(a => !/^u,fondu$/.test(a));
  const avecFondu = appels.filter(a => /,true$/.test(a)), sans = appels.filter(a => !/,true$/.test(a));
  vrai('les deux réceptions de la synchro demandent le fondu ; l’ouverture (enterApp) ne le demande pas', avecFondu.length === 2 && sans.length === 1 && sans[0] === 'u' && /function enterApp\(u\)\{[\s\S]{0,400}prefAppliquer\(u\);/.test(CODE), appels); }

console.log('\n── 2845 · 4. le système qui passe à la nuit, et le bouton de la barre ──');
vrai('l’écouteur du système (prefers-color-scheme) passe par themeFondu', /matchMedia\('\(prefers-color-scheme: dark\)'\)\.addEventListener\('change',\(\)=>\{ if\(getThemePref\(\)==='auto'\) themeFondu\(applyTheme,systemDark\(\)\?'dark':'light'\); \}\)/.test(CODE));
{ const t = fonction('toggleTheme');
  vrai('le cercle du bouton applique SANS fondu (il est déjà sa propre transition) — setThemePrefNu dans son rappel et son repli', /startViewTransition\(\(\)=>setThemePrefNu\(suivant\)\)/.test(t) && /catch\(e\)\{[^}]*setThemePrefNu\(suivant\); \}/.test(t), t.slice(0, 80));
  vrai('sous « réduire les animations » ou sans transition de vue, le bouton passe par le fondu (setThemePref)', /if\(!document\.startViewTransition\|\|sobre\)\{ setThemePref\(suivant\); return; \}/.test(t)); }
vrai('le thème choisi ne s’écrit qu’à deux endroits (setThemePrefNu, tcMode) : un troisième chemin, peut-être sans fondu, fait tomber ce compte', (() => {
  const l = [...CODE.matchAll(/prefLocal\('elan_theme',/g)].length; return l === 2; })(), [...CODE.matchAll(/prefLocal\('elan_theme',/g)].length);

console.log('\n── 2845 · 5. la feuille : un fondu enchaîné pur ──');
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
vrai('l’ancien écran reste (aucune animation), le nouveau monte en opacité sur --d-3', /:root\.theme-fondu::view-transition-old\(root\)\{animation:none\}/.test(CSS) && /:root\.theme-fondu::view-transition-new\(root\)\{animation:opFondu var\(--d-3\) ease both\}/.test(CSS) && /@keyframes opFondu\{from\{opacity:0\}to\{opacity:1\}\}/.test(CSS));
vrai('les barres (menu, haut, onglets) sont filmées avec la page, et les couleurs ne transitent pas deux fois', /:root\.theme-fondu \.sidebar,:root\.theme-fondu \.topbar,:root\.theme-fondu \.tabbar\{view-transition-name:none\}/.test(CSS) && /:root\.theme-fondu \*\{transition:none!important\}/.test(CSS));
{ const blocs = [...CSS.matchAll(/@media \(prefers-reduced-motion: reduce\)\{/g)].map(m => { let k = m.index + m[0].length, p = 1; for (; k < CSS.length && p; k++) { if (CSS[k] === '{') p++; else if (CSS[k] === '}') p--; } return CSS.slice(m.index, k); });
  const ici = blocs.find(b => /theme-fondu/.test(b)), general = CSS.indexOf('::view-transition-old(root),::view-transition-new(root){animation:none!important}');
  vrai('« réduire les animations » garde le fondu (une opacité n’est pas un mouvement), plus court (--d-2), en !important et plus fort que l’extinction générale', !!ici && /:root\.theme-fondu::view-transition-new\(root\)\{animation:opFondu var\(--d-2\) ease both!important\}/.test(ici) && general > 0 && CSS.indexOf(ici) > general, !!ici); }

setTimeout(() => { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }, 20);
