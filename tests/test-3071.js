/* ══ test-3071 · AUDIT DES APPAREILS DU 26 OCTOBRE 2026 — QUATRE DÉFAUTS « GÊNANTS » DE LA BÊTA ══════════════════════
   Mesuré au pixel et au doigt (SwiftShader, 12 profils) sur la bêta v775, puis corrigé en v776 :
   1. MENU DE JOUR, SUR VERRE — les titres de groupe, « BÊTA TESTE » (#brand-plan) et la phrase d'aide des favoris
      (.nav-fav-vide) sortaient à ~3,7:1 (seuil 4,5) : tous lisent `--side-mut`, qui valait 52 % de l'encre. UNE source
      corrigée (`--side-mut` = `--vr-encre3`, le second plan du thème), bornée au thème CLAIR : la nuit ne bouge pas.
   2. MENU AU DOIGT — « Modifier » des favoris répondait sur 18 px, la loupe sur 20 : 44 sous `(pointer:coarse)`.
   3. VUE DU TECHNICIEN — le résumé repliable « ▸ En retard · 1 » : 18 px ; « Ouvrir mon planning » : 40 px.
   4. FICHE D'INTERVENTION — les `label` Oui / Non : 18 px.
   ⛔ Ce banc ne garde pas le TEXTE d'une règle : il REJOUE LA CASCADE (tests/outils-cascade-app.js — média, spécificité,
   !important, ordre) pour un élément décrit par ses classes et ses ancêtres, et il juge ce que la règle GAGNE. Il lit
   beta.html, le fichier servi (le seul qui part sur main pour publier la bêta) ; app.html en est la source.
   Un doigt se joue par `(pointer:coarse)` ; la souris par son contraire — ce qui prouve que le bureau ne bouge pas.
   La preuve au pixel : scratchpad/corr/sonde.js (avant/après), citée dans le commit. */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const FICHIER = process.env.BETA_FICHIER || path.join(__dirname, '..', 'beta.html');
const BRUT = fs.readFileSync(FICHIER, 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* toutes les feuilles, dans l'ordre */
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const TOUTES = C.regles(CSS);
console.log('\n── 3071 · 0. la population ──');
vrai('des règles sont lues (plus de 3 000)', TOUTES.length > 3000, TOUTES.length);

const el = (tag, classes, id, attrs) => ({ tag, classes: classes || [], id: id || '', attrs: attrs || {} });
const html = (theme, plus) => el('html', [], '', Object.assign({ 'data-verre': '1', 'data-theme': theme, 'data-refonte': '', 'data-marque': 'teamop', 'data-os': 'ios' }, plus || {}));
const juge = coarse => (m, w) => /pointer:\s*coarse/i.test(m) ? coarse : /pointer:\s*fine/i.test(m) ? !coarse : C.mediaVrai(m, w);
/* Deux limites de l'outil de cascade, qui ferait gagner à tort une règle étrangère (mesuré : `[onclick^="intSelDay='"]`,
   puis un fragment « 1fr)"] » né d'une virgule dans une valeur d'attribut) : on écarte les sélecteurs mal coupés, et on
   applique `:not(.classe)` quand la cible porte cette classe — l'outil les tient pour vrais, ce qui peut crier à tort. */
const BIEN_COUPE = r => { const b = r.sel; let a = 0, c = 0; for (const x of b) { if (x === '[') a++; if (x === ']') a--; if (x === '(') c++; if (x === ')') c--; if (a < 0 || c < 0) return false; }
  return a === 0 && c === 0 && /^[a-z.#:\[*]/i.test(b); };
/* et `[onclick^=…]` : l'outil ne compare pas la valeur d'un `^=`, il le tient pour vrai dès que l'attribut existe */
const RECUES = TOUTES.filter(r => BIEN_COUPE(r) && !/\[onclick[\^*$]=/.test(r.sel));
const sansNot = (r, cible) => { for (const m of r.sel.matchAll(/:not\(\.([\w-]+)\)/g)) if ((cible.classes || []).includes(m[1])) return false; return true; };
const gagne = (chaine, prop, coarse, w) => { const cible = chaine[chaine.length - 1]; return C.gagnant(RECUES.filter(r => sansNot(r, cible)), chaine, w || 820, prop, undefined, juge(!!coarse)); };
const val = g => g ? g.v : null;
const sb = th => [html(th), el('div', ['sidebar'])];

/* ── 1. LE CONTRASTE DU MENU, DE JOUR ──────────────────────────────────────────────────────────────────────────── */
console.log('\n── 3071 · 1. menu de jour : une source, 4,5:1 ──');
const lum = h => { const [r, g, b] = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(c => c <= .03928 ? c / 12.92 : Math.pow((c + .055) / 1.055, 2.4)); return .2126 * r + .7152 * g + .0722 * b; };
const rapport = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mutJour = val(gagne(sb('light'), '--side-mut'));
vrai('de jour, `--side-mut` du menu sur verre prend le second plan du thème (--vr-encre3)', mutJour === 'var(--vr-encre3)', mutJour);
const mutNuit = val(gagne(sb('dark'), '--side-mut'));
vrai('de nuit, `--side-mut` reste le mélange d\'avant (rien ne bouge)', /color-mix\(in srgb,var\(--vr-encre\) 52%,transparent\)/.test(mutNuit || ''), mutNuit);
const encre3 = val(gagne([html('light')], '--vr-encre3'));
vrai('le second plan du thème clair est une couleur pleine', /^#[0-9a-f]{6}$/i.test(encre3 || ''), encre3);
/* le pire fond plausible sous le menu : le plus foncé des fonds de page du thème clair */
const fonds = ['--bg', '--bg3', '--deep'].map(n => val(gagne([html('light')], n))).filter(v => /^#[0-9a-f]{6}$/i.test(v || ''));
vrai('les fonds de page du thème clair sont lus (population non vide)', fonds.length >= 2, fonds);
const pire = Math.min.apply(null, fonds.map(f => rapport(encre3, f)));
vrai('le second plan tient 4,5:1 sur le plus foncé des fonds de page (' + pire.toFixed(2) + ')', pire >= 4.5, pire);
for (const os of ['ios', 'macos', 'windows']) {
  for (const [nom, chaine] of [
    ['titre de groupe', [html('light', { 'data-os': os }), el('div', ['sidebar']), el('div', ['nav-label'])]],
    ['« BÊTA TESTE »', [html('light', { 'data-os': os }), el('div', ['sidebar']), el('div', ['brand']), el('div', [], 'brand-plan')]],
    ['phrase d\'aide des favoris', [html('light', { 'data-os': os }), el('div', ['sidebar']), el('div', ['nav-fav-vide'])]]]) {
    const c = val(gagne(chaine, 'color'));
    vrai(nom + ' (' + os + ') lit --side-mut ou --t3, jamais une encre à 52 % écrite en dur', !!c && /var\(--(side-mut|t3)\)/.test(c) && !/--vr-encre\) *\d+%/.test(c), c);
  }
  const t3 = val(gagne([html('light', { 'data-os': os }), el('div', ['sidebar'])], '--t3'));
  vrai('dans le menu, `--t3` suit `--side-mut` (' + os + ')', t3 === 'var(--side-mut)', t3);
}

/* ── 2. LE MENU AU DOIGT ───────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 3071 · 2. menu au doigt : 44 px ──');
const px = g => g ? parseFloat(g.v) : NaN;
const edit = [html('light'), el('div', ['sidebar']), el('div', ['nav-label', 'nav-label-fav']), el('button', ['nav-fav-edit'])];
const loupe = [html('light'), el('div', ['sidebar']), el('div', ['nav-loupe'])];
const champ = loupe.concat([el('input', [], 'nav-loupe')]);
const croix = loupe.concat([el('button', [], 'nav-loupe-x')]);
vrai('« Modifier » (favoris) : 44 px de haut au doigt', px(gagne(edit, 'min-height', true)) >= 44, val(gagne(edit, 'min-height', true)));
vrai('« Modifier » : 44 px de large au doigt', px(gagne(edit, 'min-width', true)) >= 44, val(gagne(edit, 'min-width', true)));
vrai('la rangée « Favoris » est centrée au doigt (le bouton y tient sans déborder)', val(gagne(edit.slice(0, 3), 'align-items', true)) === 'center', val(gagne(edit.slice(0, 3), 'align-items', true)));
vrai('la loupe : la pilule monte à 44 px au doigt', px(gagne(loupe, 'min-height', true)) >= 44, val(gagne(loupe, 'min-height', true)));
vrai('la loupe : le champ lui-même répond sur 44 px au doigt', px(gagne(champ, 'min-height', true)) >= 44 && val(gagne(champ, 'align-self', true)) === 'stretch', [val(gagne(champ, 'min-height', true)), val(gagne(champ, 'align-self', true))]);
vrai('la loupe : la croix ✕ fait 44 px au doigt', px(gagne(croix, 'min-height', true)) >= 44 && px(gagne(croix, 'min-width', true)) >= 44, [val(gagne(croix, 'min-height', true)), val(gagne(croix, 'min-width', true))]);
console.log('  contre-épreuve : la souris garde le menu dessiné');
vrai('« Modifier » à la souris : pas de plancher (0)', !(px(gagne(edit, 'min-height', false)) >= 44), val(gagne(edit, 'min-height', false)));
vrai('la loupe à la souris : pas de plancher de 44 px', !(px(gagne(loupe, 'min-height', false)) >= 44) && !(px(gagne(champ, 'min-height', false)) >= 44), [val(gagne(loupe, 'min-height', false)), val(gagne(champ, 'min-height', false))]);

/* ── 3. LA VUE DU TECHNICIEN ───────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 3071 · 3. vue du technicien : 44 px ──');
const mj = [html('light'), el('div', [], 'content'), el('div', ['mj']), el('details'), el('summary', ['mj-resume'])];
vrai('le résumé « ▸ En retard · 1 » : 44 px de haut au doigt, ligne flex', px(gagne(mj, 'min-height', true)) >= 44 && val(gagne(mj, 'display', true)) === 'flex', [val(gagne(mj, 'min-height', true)), val(gagne(mj, 'display', true))]);
vrai('sa marge écrite EN LIGNE ne reprend pas la main (!important sur la marge)', !!(gagne(mj, 'margin', true) || {}).imp, gagne(mj, 'margin', true));
const omp = [html('light'), el('div', [], 'content'), el('div', ['card']), el('div', ['tdb-hd']), el('button', ['btn', 'ghost', 'sm'])];
vrai('« Ouvrir mon planning » : 44 px de haut au doigt', px(gagne(omp, 'min-height', true)) >= 44, val(gagne(omp, 'min-height', true)));
vrai('« Ouvrir mon planning » : la hauteur d\'avant (40) à la souris', px(gagne(omp, 'min-height', false)) < 44, val(gagne(omp, 'min-height', false)));
vrai('le résumé garde son rythme à la souris (pas de plancher de 44 px)', !(px(gagne(mj, 'min-height', false)) >= 44), val(gagne(mj, 'min-height', false)));
/* le balisage : la classe est bien posée par la fabrique */
vrai('la fabrique `secD` pose la classe mj-resume sur son <summary>', /const secD=[\s\S]{0,200}?<summary class="mj-resume" style=/.test(CODE));
vrai('une seule fabrique de ce résumé (population)', CODE.split('const secD=(title,color,arr,open,opts)=>').length === 2);

/* ── 4. LES CASES OUI / NON ────────────────────────────────────────────────────────────────────────────────────── */
console.log('\n── 3071 · 4. fiche d\'intervention : cases Oui / Non ──');
const lab = [html('light'), el('div', [], 'content'), el('div', ['card']), el('label', ['qoui'])];
vrai('le label Oui / Non : 44 px de haut et de large au doigt', px(gagne(lab, 'min-height', true)) >= 44 && px(gagne(lab, 'min-width', true)) >= 44, [val(gagne(lab, 'min-height', true)), val(gagne(lab, 'min-width', true))]);
vrai('le label devient une ligne flex centrée (le rond ne décale pas le texte)', val(gagne(lab, 'display', true)) === 'inline-flex' && val(gagne(lab, 'align-items', true)) === 'center', [val(gagne(lab, 'display', true)), val(gagne(lab, 'align-items', true))]);
vrai('à la souris, le label garde sa hauteur d\'avant', !(px(gagne(lab, 'min-height', false)) >= 44), val(gagne(lab, 'min-height', false)));
const nLab = (CODE.match(/<label class="qoui" style="[^"]*"><input type="radio" name="q-\$\{f\}"/g) || []).length;
vrai('les DEUX labels (Oui, Non) de la question portent la classe', nLab === 2, nLab);
const nu = (CODE.match(/<label style="[^"]*"><input type="radio" name="q-\$\{f\}"/g) || []).length;
vrai('aucun label de question n\'est resté sans la classe', nu === 0, nu);

console.log('\n════ test-3071 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
