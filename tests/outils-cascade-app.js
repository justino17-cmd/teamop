/* Outil des bancs 1420 et 1421 : rejouer la CASCADE CSS d'app.html pour un élément décrit par sa chaîne d'ancêtres.
   ⛔ Ce n'est pas le TEXTE d'une règle qu'on garde, c'est ce qu'elle GAGNE (même principe que test-830 pour la Tour) :
   média, spécificité, !important, ordre. C'est ce qui voit « une moitié de règle survit à l'autre » — ici, une hauteur
   écrite en ligne et deux règles de la feuille qui ne retranchent pas la barre d'onglets.
   Limites assumées : combinateur descendant seulement (un `>` est traité comme un descendant), `:has(` et `:not(` comptent
   comme s'ils s'appliquaient (ce banc peut crier à tort, jamais se taire à tort), les autres pseudo-classes
   (:hover, :active…) ne s'appliquent pas, les @keyframes et @supports sont ignorés. */
'use strict';

/* le texte de la feuille : commentaires blanchis (on ne cherche pas dans une explication) */
function sansCommentaires(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ' '); }

/* l'indice de l'accolade fermante qui répond à l'ouvrante posée en i */
function fermer(s, i) {
  let p = 0, q = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === '{') p++; else if (c === '}' && !--p) return k;
  }
  return -1;
}

function declarations(corps) {
  const out = []; let q = null, prof = 0, deb = 0;
  const fin = (a, b) => {
    const d = corps.slice(a, b); const i = d.indexOf(':'); if (i < 0) return;
    let v = d.slice(i + 1).trim(), imp = false;
    if (/!important\s*$/i.test(v)) { imp = true; v = v.replace(/\s*!important\s*$/i, '').trim(); }
    out.push({ p: d.slice(0, i).trim().toLowerCase(), v, imp });
  };
  for (let k = 0; k < corps.length; k++) {
    const c = corps[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(') prof++; else if (c === ')') prof--;
    else if (c === ';' && !prof) { fin(deb, k); deb = k + 1; }
  }
  fin(deb, corps.length);
  return out;
}

/* [{media:[«(max-width:959px)»…], sel, decls, ordre}] — les @media sont aplatis avec leur condition */
function regles(css) {
  const txt = sansCommentaires(css); const out = []; let ordre = 0;
  (function parcourir(s, media) {
    let i = 0;
    while (i < s.length) {
      const o = s.indexOf('{', i); if (o < 0) break;
      const tete = s.slice(i, o).trim(); const f = fermer(s, o); if (f < 0) break;
      const corps = s.slice(o + 1, f);
      if (/^@media/i.test(tete)) parcourir(corps, media.concat(tete.replace(/^@media\s*/i, '').trim()));
      else if (!/^@/.test(tete)) tete.split(',').forEach(sel => out.push({ media, sel: sel.trim(), decls: declarations(corps), ordre: ordre++ }));
      i = f + 1;
    }
  })(txt, []);
  return out;
}

/* une condition de média, pour une fenêtre de largeur w : min/max-width seulement ; le reste est « ne sait pas » = vrai */
function mediaVrai(cond, w) {
  const c = cond.toLowerCase();
  if (/\bprint\b/.test(c) || /prefers-reduced-motion|hover:\s*none/.test(c)) return false;
  const parts = c.match(/\((?:min|max)-width:\s*[\d.]+px\)/g) || [];
  return parts.every(p => { const m = /\((min|max)-width:\s*([\d.]+)px\)/.exec(p); return m[1] === 'min' ? w >= +m[2] : w <= +m[2]; });
}

/* un composé (balise, #id, .classe, [attr], [attr=v], [attr^=v]…) contre un élément { tag, id, classes, attrs } */
function composeVrai(comp, el) {
  // :has( et :not( comptent comme vraies (on les retire) ; toute autre pseudo-classe ou pseudo-élément (:hover, ::after…) : jamais vraie ici
  const sans = comp.replace(/:(has|not)\((?:[^()]|\([^()]*\))*\)/g, '');
  if (/:[a-z-]+/i.test(sans.replace(/\[[^\]]*\]/g, ''))) return false;
  const tag = /^[a-z][a-z0-9-]*/i.exec(sans); if (tag && tag[0].toLowerCase() !== el.tag) return false;
  for (const m of sans.matchAll(/#([\w-]+)/g)) if (el.id !== m[1]) return false;
  for (const m of sans.matchAll(/\.([\w-]+)/g)) if (!(el.classes || []).includes(m[1])) return false;
  for (const m of sans.matchAll(/\[([\w-]+)(?:([~|^$*]?=)["']?([^\]"']*)["']?)?\]/g)) {
    const a = (el.attrs || {})[m[1]]; if (a === undefined) return false;
    if (m[2] === '=' && String(a) !== m[3]) return false;
  }
  return true;
}

function decouperSel(sel) {
  const out = []; let cur = '', prof = 0;
  for (const c of sel.replace(/\s*([>+~])\s*/g, ' $1 ')) {
    if (c === '(' || c === '[') prof++; if (c === ')' || c === ']') prof--;
    if (/\s/.test(c) && !prof) { if (cur) out.push(cur); cur = ''; } else cur += c;
  }
  if (cur) out.push(cur);
  return out.filter(x => !/^[>+~]$/.test(x));
}

/* la chaîne [racine … cible] : le dernier composé vise la cible, les autres cherchent leurs ancêtres dans l'ordre */
function selecteurVise(sel, chaine) {
  const comps = decouperSel(sel); if (!comps.length) return false;
  let k = chaine.length - 1;
  if (!composeVrai(comps[comps.length - 1], chaine[k])) return false;
  k--;
  for (let c = comps.length - 2; c >= 0; c--) {
    while (k >= 0 && !composeVrai(comps[c], chaine[k])) k--;
    if (k < 0) return false; k--;
  }
  return true;
}

function specificite(sel) {
  const s = sel.replace(/:(has|not)\(((?:[^()]|\([^()]*\))*)\)/g, ' $2 ').replace(/\[[^\]]*\]/g, '.a');
  return [(s.match(/#[\w-]+/g) || []).length, (s.match(/\.[\w-]+|:[a-z-]+/g) || []).length,
    (s.match(/(^|[\s>+~])[a-z][a-z0-9-]*/gi) || []).length];
}
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/* ce que la cascade donne à `prop` pour la cible (dernier élément de `chaine`), fenêtre de largeur w.
   `enLigne` : valeur d'un style écrit dans le balisage (gagne sur la feuille sauf devant un !important).
   `media` (facultatif) : un juge des conditions @media à la place de `mediaVrai` — pour jouer un RÉGLAGE de
   l'utilisateur (contraste accru, transparence réduite), que `mediaVrai` tient toujours pour vrai. */
function gagnant(toutes, chaine, w, prop, enLigne, media) {
  let best = null; const juge = media || mediaVrai;
  for (const r of toutes) {
    if (!r.media.every(m => juge(m, w))) continue;
    if (!selecteurVise(r.sel, chaine)) continue;
    for (const d of r.decls) {
      if (d.p !== prop) continue;
      const cand = { v: d.v, imp: d.imp, spec: specificite(r.sel), ordre: r.ordre, sel: r.sel };
      if (!best || (cand.imp !== best.imp ? cand.imp : (cmp(cand.spec, best.spec) || cand.ordre - best.ordre) > 0)) best = cand;
    }
  }
  if (enLigne !== undefined && enLigne !== null && (!best || !best.imp)) return { v: enLigne, imp: false, sel: '(style en ligne)' };
  return best;
}

/* une longueur calc()/px/vh/dvh en pixels ; `vars` donne les variables (--tabh…). NaN si on ne sait pas. */
function px(v, ctx) {
  if (v === undefined || v === null) return NaN;
  let e = String(v).trim().replace(/var\((--[\w-]+)\)/g, (m, n) => (ctx.vars && ctx.vars[n] !== undefined ? ctx.vars[n] + 'px' : 'NaN'));
  e = e.replace(/(-?[\d.]+)d?vh/g, (m, n) => '(' + (+n * ctx.hauteur / 100) + ')').replace(/(-?[\d.]+)px/g, '($1)');
  e = e.replace(/\bcalc\(/g, '(').replace(/\bmin\(/g, 'Math.min(').replace(/\bmax\(/g, 'Math.max(');
  if (/[^\d.\s()+\-*/,A-Za-z]/.test(e) || /[A-Za-z]/.test(e.replace(/Math\.(min|max)|NaN/g, ''))) return NaN;
  try { return Function('"use strict";return (' + e + ')')(); } catch (x) { return NaN; }
}

module.exports = { sansCommentaires, regles, gagnant, px, fermer, mediaVrai, selecteurVise, specificite };
