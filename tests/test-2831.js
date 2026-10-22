/* ══ test-2831 · « RÉDUIRE LA TRANSPARENCE » ÉTEINT TOUT LE VERRE, « RÉDUIRE LES ANIMATIONS » COUPE TOUS LES DÉFILEMENTS DOUX ══
   Audit apple-design du 21 octobre 2026, § 14 du skill. Deux réglages du système que l'application respectait À MOITIÉ :
   · TRANSPARENCE RÉDUITE — la règle du thème final (§ 20) listait ses surfaces une à une ; mesuré au navigateur, le curseur
     du segmenté du tableau de bord, le groupe de liste de la maquette (Interventions, Clients, Boxes), la recherche des
     Clients et le bouton de repli gardaient leur flou, les boutons fantômes et le toast restaient translucides ; et trois
     voiles écrits EN LIGNE par le JavaScript (roues d'heure, catalogue et PDF des bons) gardaient le leur. Le correctif
     éteint à la SOURCE : jetons de matière opaques, et aucun flou de fond ne survit au réglage, quel que soit l'élément ;
   · MOUVEMENT RÉDUIT — sept défilements doux écrits en JavaScript (`behavior:'smooth'`) l'emportaient sur la propriété
     CSS que le réglage pose : ils passent tous par `defilDoux()`.
   La cascade est rejouée (tests/outils-cascade-app.js — média, spécificité, !important, ordre, style en ligne) avec un
   juge de médias qui sait ce que l'utilisateur a réglé ; la fonction des défilements est EXÉCUTÉE.
   La preuve au navigateur (33 à 48 vitres suivies par passe, iPhone et Mac, jour et nuit) :
   scratchpad/sonde-transparence-reduite.js.                                                                         */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS);
const juge = (reglages) => (cond, w) => {
  const c = cond.toLowerCase();
  if (/\bprint\b/.test(c)) return false;
  for (const [nom, val] of Object.entries(reglages)) {
    const m = new RegExp('\\(' + nom + ':\\s*([a-z-]+)\\)').exec(c);
    if (m) { const neg = /^not\b/.test(c.trim()); if ((m[1] === val) === neg) return false; }
  }
  if (/hover:\s*none/.test(c)) return false;
  const parts = c.match(/\((?:min|max)-width:\s*[\d.]+px\)/g) || [];
  return parts.every(p => { const m = /\((min|max)-width:\s*([\d.]+)px\)/.exec(p); return m[1] === 'min' ? w >= +m[2] : w <= +m[2]; });
};
const REDUIT = juge({ 'prefers-reduced-transparency': 'reduce', 'prefers-contrast': 'no-preference', 'prefers-reduced-motion': 'no-preference' });
const NORMAL = juge({ 'prefers-reduced-transparency': 'no-preference', 'prefers-contrast': 'no-preference', 'prefers-reduced-motion': 'no-preference' });
const PLUS = juge({ 'prefers-reduced-transparency': 'reduce', 'prefers-contrast': 'more', 'prefers-reduced-motion': 'no-preference' });
const W = 1440;
const HTML = (theme) => ({ tag: 'html', attrs: { 'data-marque': 'teamop', 'data-verre': '1', 'data-theme': theme, 'data-refonte': '1', 'data-kind': 'mobile', 'lang': 'fr' } });
const el = (tag, classes, attrs) => ({ tag, classes: classes || [], attrs: attrs || {} });
const jeton = (theme, j, nom) => { const g = C.gagnant(REGLES, [HTML(theme)], W, nom, undefined, j); return g ? g.v : undefined; };
function resoudre(v, theme, j, prof) {
  prof = prof || 0; if (v === undefined || prof > 12) return v;
  return String(v).replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, n, repli) => { const x = jeton(theme, j, n); return resoudre(x !== undefined ? x : repli, theme, j, prof + 1); });
}
function opacite(v) {
  const s = String(v || '').trim();
  if (!s || s === 'none' || s === 'transparent') return 0;
  let m = /^rgba?\(([^)]*)\)$/.exec(s); if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length >= 4 ? parseFloat(p[3]) : 1; }
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.length === 9 ? parseInt(s.slice(7), 16) / 255 : 1;
  m = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\)$/i.exec(s); if (m) return opacite(m[1]) * (+m[2] / 100);
  return NaN;
}

console.log('\n── 2831 · 0. la population ──');
vrai('des règles sont lues', REGLES.length > 3000, REGLES.length);
const SOUS = REGLES.filter(r => r.media.some(m => /prefers-reduced-transparency:\s*reduce/.test(m)));
vrai('des règles vivent sous « transparence réduite »', SOUS.length >= 10, SOUS.length);

for (const theme of ['light', 'dark']) {
  console.log('\n── 2831 · 1. ' + (theme === 'light' ? 'de jour' : 'de nuit') + ' : les jetons de matière deviennent opaques ──');
  for (const n of ['--vr-fond', '--vr-fond2', '--vr-fond-dense', '--tf-kpi', '--tf-barre', '--tf-cote']) {
    const a = opacite(resoudre(jeton(theme, REDUIT, n), theme, REDUIT)), b = opacite(resoudre(jeton(theme, NORMAL, n), theme, NORMAL));
    vrai(n + ' : opaque sous transparence réduite, translucide sans', a === 1 && b < 1, { reduit: a, normal: b });
    const c = opacite(resoudre(jeton(theme, PLUS, n), theme, PLUS));
    vrai(n + ' : opaque aussi quand le contraste accru est posé EN MÊME TEMPS (l’opaque l’emporte)', c === 1, c);
  }
  vrai('le jeton du flou s’éteint (--vr-flou : none)', resoudre(jeton(theme, REDUIT, '--vr-flou'), theme, REDUIT) === 'none', jeton(theme, REDUIT, '--vr-flou'));
}

console.log('\n── 2831 · 2. aucun flou de fond ne survit au réglage, quelle que soit la surface ──');
const RACINE = [HTML('light'), el('body'), el('div', ['app']), el('main', [], { id: 'content' })];
const SURFACES = [
  ['le groupe de liste de la maquette (.tf-groupe)', [el('div', ['tf-groupe'])]],
  ['le curseur du segmenté du tableau de bord', [el('div', ['tdb-seg']), el('span', ['seg-cur'])]],
  ['la recherche des Clients', [el('input', ['search-inp'], { id: 'cli-recherche' })]],
  ['le bouton de repli de la barre du haut', [el('div', ['topbar']), el('button', ['rf-plier'])]],
  ['la barre du multitâche (.multi-bar)', [el('div', ['multi-bar'])]],
  ['une tuile chiffrée', [el('div', ['kpis']), el('div', ['kpi'])]],
  ['une carte', [el('div', ['card'])]],
  ['le toast', [el('div', ['toast'], { id: 'toast' })]],
  ['une fenêtre', [el('div', ['overlay', 'open'], { id: 'overlay' }), el('div', ['modal', 'full'], { id: 'modal' })]],
];
let vus = 0;
for (const [nom, bout] of SURFACES) {
  const chaine = RACINE.concat(bout);
  const avant = C.gagnant(REGLES, chaine, W, 'backdrop-filter', undefined, NORMAL);
  const g = C.gagnant(REGLES, chaine, W, 'backdrop-filter', undefined, REDUIT);
  if (avant && avant.v !== 'none') vus++;
  vrai(nom + ' : plus de flou sous le réglage', !!g && g.v === 'none' && g.imp, g && { v: g.v, sel: g.sel });
}
vrai('(population) au moins six de ces surfaces sont FLOUES sans le réglage — le contrôle ne passe pas sur du verre absent', vus >= 6, vus);
/* les voiles écrits EN LIGNE par le JavaScript : la feuille doit gagner en !important sur leur style */
const ENLIGNE = [...CODE.matchAll(/\.style\.cssText\s*=\s*'([^']*backdrop-filter:[^']*)'/g)].map(m => (/backdrop-filter:\s*([^;']+)/.exec(m[1]) || [])[1]);
vrai('(population) des voiles écrits en ligne portent un flou (roues d’heure, bons)', ENLIGNE.length >= 3, ENLIGNE);
for (const f of ENLIGNE) {
  const g = C.gagnant(REGLES, [HTML('dark'), el('body'), el('div', [], { id: 'roues-ov' })], W, 'backdrop-filter', f, REDUIT);
  vrai('un voile en ligne « backdrop-filter:' + f + ' » perd son flou sous le réglage', !!g && g.v === 'none', g && g.sel);
}

console.log('\n── 2831 · 3. les défilements doux écrits en JavaScript ──');
const appels = (CODE.match(/behavior\s*:\s*['"]smooth['"]/g) || []).length;
vrai('aucun « behavior:\'smooth\' » écrit en dur dans le code (le réglage ne le couperait pas)', appels === 0, appels);
const passes = (CODE.match(/behavior\s*:\s*defilDoux\(\)/g) || []).length;
vrai('(population) les défilements passent par defilDoux() — sept au moins', passes >= 7, passes);
const fn = (/function defilDoux\(\)\{[^\n]*\}/.exec(CODE) || [])[0];
vrai('defilDoux() est trouvée', !!fn);
const jouer = (reduit) => { const ctx = { window: {}, matchMedia: (q) => ({ matches: reduit && /prefers-reduced-motion:\s*reduce/.test(q) }) }; ctx.window.matchMedia = ctx.matchMedia; vm.createContext(ctx); vm.runInContext(fn + ';this.r=defilDoux();', ctx); return ctx.r; };
if (fn) {
  vrai('sous « réduire les animations », defilDoux() rend « auto » (un saut, pas un glissement)', jouer(true) === 'auto', jouer(true));
  vrai('sans le réglage, elle rend « smooth »', jouer(false) === 'smooth', jouer(false));
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
