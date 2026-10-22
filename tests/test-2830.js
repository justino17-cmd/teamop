/* ══ test-2830 · « AUGMENTER LE CONTRASTE » : LES VITRES DEVIENNENT PLEINES ET LEURS BORDS SE VOIENT ══════════════════
   Audit apple-design du 21 octobre 2026 (Justin : « audite toute l'interface de mon app avec »), § 14 du skill :
   « prefers-contrast: more — near-solid backgrounds with a defined, contrasting border ».
   Mesuré au navigateur (scratchpad/sonde-apple-audit.js) : réglage demandé, les vitres restaient à 42 % de blanc avec un
   liseré blanc à 85 % — invisible sur une page claire. Cause : la règle du thème final (§ 20) visait
   html[data-marque][data-verre], un attribut de MOINS que les deux matières (§ 1 et 1 bis, …[data-theme="…"]) : elle
   ne prenait JAMAIS. Et elle ne touchait que deux jetons, quand la barre d'onglets, les tuiles chiffrées, la barre
   latérale et le toast tirent leur matière de jetons à eux (--tf-barre, --tf-kpi, --tf-cote, --vr-fond-dense) ;
   trois contrôles en verre n'ont même aucun bord (bouton fantôme, recherche, curseur d'un segmenté).
   Ce banc REJOUE LA CASCADE (tests/outils-cascade-app.js — média, spécificité, !important, ordre), avec un juge de
   médias qui sait ce que l'utilisateur a réglé, et RÉSOUT chaque jeton jusqu'à son opacité : il garde un SENS
   (« presque plein », « un trait », « la teinte du texte tertiaire »), pas un texte. Contre-épreuve à chaque pas :
   sans le réglage, la matière d'origine reste (le verre n'est pas éteint pour tout le monde).
   La preuve au pixel près — 39 à 55 vitres par passe, cinq écrans et une fenêtre, iPhone et Mac, jour et nuit, fond à
   90 % au moins et bord à 3:1 au moins contre la page : scratchpad/sonde-contraste-accru.js.                     */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const REGLES = C.regles(CSS);

/* le juge des médias : la largeur, et les RÉGLAGES de l'utilisateur ; ce qu'il ne connaît pas vaut « vrai » comme mediaVrai */
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
const W = 1440;
const HTML = (theme) => ({ tag: 'html', attrs: { 'data-marque': 'teamop', 'data-verre': '1', 'data-theme': theme, 'data-refonte': '1', 'data-kind': 'mobile', 'lang': 'fr' } });
const el = (tag, classes, attrs) => ({ tag, classes: classes || [], attrs: attrs || {} });

/* la valeur d'un jeton porté par <html>, et sa RÉSOLUTION (var() suivis, un repli compris) */
function jeton(theme, reglages, nom, prof) {
  const g = C.gagnant(REGLES, [HTML(theme)], W, nom, undefined, juge(reglages));
  return g ? g.v : undefined;
}
function resoudre(v, theme, reglages, prof) {
  prof = prof || 0; if (v === undefined || prof > 12) return v;
  return String(v).replace(/var\((--[\w-]+)(?:\s*,\s*([^()]*(?:\([^()]*\))?[^()]*))?\)/g, (m, n, repli) => {
    const x = jeton(theme, reglages, n); return resoudre(x !== undefined ? x : repli, theme, reglages, prof + 1);
  });
}
/* l'opacité d'une couleur écrite : rgba(), #hex, color-mix(in srgb, X p%, transparent), none = 0 */
function opacite(v) {
  const s = String(v || '').trim();
  if (!s || s === 'none' || s === 'transparent') return 0;
  let m = /^rgba?\(([^)]*)\)$/.exec(s); if (m) { const p = m[1].split(/[\s,/]+/).filter(Boolean); return p.length >= 4 ? parseFloat(p[3]) * (/%$/.test(p[3]) ? 0.01 : 1) : 1; }
  if (/^#[0-9a-f]{3,8}$/i.test(s)) return s.length === 9 ? parseInt(s.slice(7), 16) / 255 : 1;
  m = /^color-mix\(in srgb,\s*(.+?)\s+([\d.]+)%\s*,\s*transparent\)$/i.exec(s); if (m) return opacite(m[1]) * (+m[2] / 100);
  return NaN;
}

console.log('\n── 2830 · 0. la population ──');
vrai('des règles sont lues (la cascade n\'est pas rejouée sur du néant)', REGLES.length > 3000, REGLES.length);
const SOUS = REGLES.filter(r => r.media.some(m => /prefers-contrast:\s*more/.test(m)));
vrai('des règles vivent sous « contraste accru »', SOUS.length >= 8, SOUS.length);

/* les jetons de matière des surfaces en verre : chacun doit devenir presque plein sous le réglage, et rester tel quel sans */
const MATIERES = ['--vr-fond', '--vr-fond2', '--vr-fond-dense', '--tf-kpi', '--tf-barre', '--tf-cote'];
for (const theme of ['light', 'dark']) {
  console.log('\n── 2830 · 1. ' + (theme === 'light' ? 'de jour' : 'de nuit') + ' : la matière des vitres ──');
  const plus = { 'prefers-contrast': 'more', 'prefers-reduced-transparency': 'no-preference' };
  const sans = { 'prefers-contrast': 'no-preference', 'prefers-reduced-transparency': 'no-preference' };
  for (const n of MATIERES) {
    const avec = opacite(resoudre(jeton(theme, plus, n), theme, plus)), base = opacite(resoudre(jeton(theme, sans, n), theme, sans));
    vrai(n + ' : presque plein sous contraste accru (≥ 0,9), et la matière d’origine reste sans le réglage', avec >= 0.9 && base < 0.9,
      { avec: avec, sans: base, valeur: resoudre(jeton(theme, plus, n), theme, plus) });
  }
  const reflet = resoudre(jeton(theme, plus, '--vr-reflet'), theme, plus);
  vrai('le reflet décoratif disparaît sous contraste accru (aucun dégradé entre le texte et son fond)', reflet === 'none', reflet);
  vrai('… et reste sans le réglage', /gradient/.test(resoudre(jeton(theme, sans, '--vr-reflet'), theme, sans) || ''));
  const t3 = resoudre(jeton(theme, plus, '--t3'), theme, plus);
  for (const n of ['--vr-liseret', '--tf-filet']) {
    const avec = resoudre(jeton(theme, plus, n), theme, plus), base = resoudre(jeton(theme, sans, n), theme, sans);
    vrai(n + ' prend la teinte du texte tertiaire sous contraste accru (un trait qui se lit), et garde le sien sans', !!t3 && avec === t3 && base !== t3, { avec, base, t3 });
  }
}

console.log('\n── 2830 · 2. les contrôles en verre sans bord, et les en-têtes collants ──');
const plus = juge({ 'prefers-contrast': 'more' }), sans = juge({ 'prefers-contrast': 'no-preference' });
const RACINE = [HTML('light'), el('body'), el('div', ['app']), el('main', [], { id: 'content' })];
const CAS = [
  ['un bouton fantôme d’en-tête (« Qui a placé ou déplacé quoi »)', [el('div', ['ph-actions']), el('button', ['btn', 'ghost'])]],
  ['un bouton fantôme ailleurs', [el('div', ['card']), el('button', ['btn', 'ghost'])]],
  ['une recherche (#cli-recherche)', [el('input', ['search-inp'], { id: 'cli-recherche' })]],
  ['le curseur d’un segmenté de filtres', [el('div', ['filters', 'seg-on']), el('span', ['seg-cur'])]],
  ['le curseur du segmenté du tableau de bord', [el('div', ['tdb-seg']), el('span', ['seg-cur'])]],
];
for (const [nom, bout] of CAS) {
  const chaine = RACINE.concat(bout);
  const a = C.gagnant(REGLES, chaine, W, 'box-shadow', undefined, plus), b = C.gagnant(REGLES, chaine, W, 'box-shadow', undefined, sans);
  vrai(nom + ' : un trait intérieur de 1 px à la teinte du texte tertiaire sous contraste accru', !!a && /inset 0 0 0 1px var\(--t3\)/.test(a.v), a && { v: a.v, sel: a.sel });
  vrai('… et pas sans le réglage', !b || !/var\(--t3\)/.test(b.v), b && b.v);
}
/* « ‹ Tableau de bord » est un lien texte (aucun fond, aucun rembourrage) : vu au navigateur le 22 octobre 2026, un trait
   l'enfermait au ras de ses lettres — une pilule où le texte touche le bord */
const retour = C.gagnant(REGLES, RACINE.concat([el('div', ['ph']), el('button', ['btn', 'ghost', 'ph-back', 'sm'])]), W, 'box-shadow', undefined, plus);
vrai('le lien de retour (.ph-back) ne prend PAS de trait : ce n’est pas une surface', !retour || !/var\(--t3\)/.test(retour.v), retour && { v: retour.v, sel: retour.sel });
for (const [nom, bout] of [['un en-tête de colonne du planning', [el('div', ['plm-split']), el('div', ['plm-th', 'plg-tete'])]], ['un en-tête de tableau', [el('table', ['tbl']), el('thead'), el('tr'), el('th')]]]) {
  const chaine = RACINE.concat(bout);
  const f = C.gagnant(REGLES, chaine, W, 'border-bottom-color', undefined, plus), g = C.gagnant(REGLES, chaine, W, 'background', undefined, plus);
  vrai(nom + ' : filet du bas à la teinte du texte tertiaire et fond presque plein, sous contraste accru',
    !!f && f.v === 'var(--t3)' && !!g && opacite(resoudre(g.v, 'light', { 'prefers-contrast': 'more' })) >= 0.9, { filet: f && f.v, fond: g && g.v });
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
