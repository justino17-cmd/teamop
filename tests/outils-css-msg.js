/* ══ OUTIL DE BANC (n'est PAS une suite : il ne s'appelle pas `test-*.js`) — LA FEUILLE D'OP MESSAGES, REJOUÉE JOUR ET NUIT ════════════════════════════════════════════════
   Les bancs d'OP MESSAGES qui gardent un CONTRASTE ou une TAILLE de cible ne doivent pas garder du texte : « la règle écrit var(--accent) » ne dit rien de ce que l'œil voit
   (CLAUDE.md : un banc qui recopie des valeurs garde une croyance, un banc qui relit la source garde un accord). Cet outil lit la feuille RÉELLE de la page et la rejoue :
     · `lire(racine)`         la feuille sans commentaires, et les règles à plat, dans l'ordre, chacune avec sa CONDITION (nuit, tactile, ≥ 700 px…) ;
     · `jetons(mode)`         les jetons de `:root` (le jour), puis ceux du bloc `prefers-color-scheme: dark` posés par-dessus (la nuit) ;
     · `valeur(sel, prop, ctx)`  la dernière déclaration d'une propriété pour ce sélecteur EXACT dans ce contexte (mode, tactile, largeur) — l'ordre de la feuille décide ;
     · `couleur(texte, jetons)`  var(--x), #hex, rgb()/rgba(), `color-mix(in srgb, A p%, B)` → [r, g, b, a] ;  `sur(fg, fond)` compose ;  `ratio(a, b)` le contraste WCAG.
   Ce qu'il NE fait PAS : la spécificité entre deux sélecteurs différents (le sélecteur est cherché tel quel) — c'est le travail de la sonde au navigateur, citée par chaque banc. */
'use strict';
const fs = require('fs'), path = require('path');

/* découpe un texte CSS en blocs de premier niveau : [{ tete, corps }] (les accolades sont appariées, les chaînes ignorées) */
function blocs(css) {
  const out = []; let i = 0;
  while (i < css.length) {
    const o = css.indexOf('{', i); if (o < 0) break;
    const tete = css.slice(i, o).trim(); let n = 1, j = o + 1;
    while (j < css.length && n) { const c = css[j]; if (c === '{') n++; else if (c === '}') n--; j++; }
    out.push({ tete, corps: css.slice(o + 1, j - 1) }); i = j;
  }
  return out;
}

/* les règles à plat : { sels:[…], corps, cond } — cond = '' (toujours) ou la condition d'un @media, telle qu'écrite */
function regles(css) {
  const R = [];
  for (const b of blocs(css)) {
    if (/^@media/i.test(b.tete)) { const cond = b.tete.replace(/^@media\s*/i, '').replace(/\s+/g, ' ').trim(); for (const r of blocs(b.corps)) if (!/^@/.test(r.tete)) R.push({ sels: r.tete.split(',').map(s => s.trim().replace(/\s+/g, ' ')), corps: r.corps, cond }); }
    else if (!/^@/.test(b.tete)) R.push({ sels: b.tete.split(',').map(s => s.trim().replace(/\s+/g, ' ')), corps: b.corps, cond: '' });
  }
  return R;
}

/* une condition @media s'applique-t-elle dans ce contexte ? ctx = { nuit, tactile, largeur } — on ne sait lire que ce que la page emploie */
function applique(cond, ctx) {
  if (!cond) return true;
  return cond.split(/\s+and\s+/i).every(p => {
    p = p.replace(/^\(|\)$/g, '').replace(/\s+/g, ' ').trim();
    let m;
    if ((m = /^prefers-color-scheme\s*:\s*(dark|light)$/.exec(p))) return (m[1] === 'dark') === !!ctx.nuit;
    if ((m = /^pointer\s*:\s*(coarse|fine)$/.exec(p))) return (m[1] === 'coarse') === !!ctx.tactile;
    if ((m = /^min-width\s*:\s*(\d+)px$/.exec(p))) return (ctx.largeur || 390) >= +m[1];
    if ((m = /^max-width\s*:\s*(\d+)px$/.exec(p))) return (ctx.largeur || 390) <= +m[1];
    if (/^hover\s*:\s*hover$/.test(p)) return !ctx.tactile;
    return false; /* une condition qu'on ne sait pas lire n'applique rien : on ne devine pas */
  });
}

function lire(racine) {
  const page = fs.readFileSync(path.join(racine, 'apercu/opmessages/index.html'), 'utf8');
  const style = (/<style>([\s\S]*?)<\/style>/.exec(page) || [, ''])[1].replace(/\/\*[\s\S]*?\*\//g, ' ');
  return { page, css: style, regles: regles(style) };
}

const decl = corps => { const o = {}; for (const m of corps.matchAll(/(^|[;\s])(--?[a-z][a-z0-9-]*)\s*:\s*([^;]+)/gi)) o[m[2]] = m[3].trim().replace(/\s+/g, ' '); return o; };

/* les jetons de :root, dans un mode */
function jetons(L, nuit) {
  const J = {};
  for (const r of L.regles) if (r.sels.includes(':root') && applique(r.cond, { nuit })) Object.assign(J, decl(r.corps));
  return J;
}

/* la dernière valeur d'une propriété pour ce sélecteur exact, dans ce contexte ; null si aucune règle */
function valeur(L, sel, prop, ctx) {
  let v = null;
  for (const r of L.regles) if (r.sels.includes(sel) && applique(r.cond, ctx || {})) { const m = new RegExp('(?:^|[;\\s])' + prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*:\\s*([^;]+)').exec(r.corps); if (m) v = m[1].trim().replace(/\s+/g, ' '); }
  return v;
}

/* ── couleurs ── */
function decouper(s) { /* « a, b(c, d), e » → ['a','b(c, d)','e'] */
  const o = []; let n = 0, d = 0;
  for (let i = 0; i <= s.length; i++) { const c = s[i]; if (c === '(') n++; else if (c === ')') n--; if (i === s.length || (c === ',' && !n)) { o.push(s.slice(d, i).trim()); d = i + 1; } }
  return o;
}
function couleur(t, J, prof) {
  t = String(t).trim(); prof = (prof || 0) + 1; if (prof > 12) throw new Error('jetons en boucle : ' + t);
  let m;
  if ((m = /^var\(\s*(--[a-z0-9-]+)\s*(?:,\s*(.+))?\)$/i.exec(t))) { if (J[m[1]] != null) return couleur(J[m[1]], J, prof); if (m[2]) return couleur(m[2], J, prof); throw new Error('jeton absent : ' + m[1]); }
  if ((m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(t))) { let h = m[1]; if (h.length === 3) h = h.replace(/./g, '$&$&'); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), 1]; }
  if ((m = /^rgba?\(([^)]*)\)$/i.exec(t))) { const p = m[1].split(/[,\s/]+/).filter(Boolean).map(Number); return [p[0], p[1], p[2], p.length > 3 ? p[3] : 1]; }
  if (t === 'transparent') return [0, 0, 0, 0];
  if (t === 'white') return [255, 255, 255, 1];
  if (t === 'black') return [0, 0, 0, 1];
  if ((m = /^color-mix\(\s*in srgb\s*,(.*)\)$/i.exec(t))) {
    const [a, b] = decouper(m[1]); const pa = /\s(\d+(?:\.\d+)?)%\s*$/.exec(a), pb = /\s(\d+(?:\.\d+)?)%\s*$/.exec(b);
    const ca = couleur(pa ? a.slice(0, pa.index) : a, J, prof), cb = couleur(pb ? b.slice(0, pb.index) : b, J, prof);
    let wa = pa ? +pa[1] / 100 : (pb ? 1 - +pb[1] / 100 : .5), wb = pb ? +pb[1] / 100 : 1 - wa;
    const s = wa + wb; wa /= s; wb /= s; /* transparent compte comme son voisin non prémultiplié (CSS Color 5 : prémultiplié) */
    const al = ca[3] * wa + cb[3] * wb; if (!al) return [0, 0, 0, 0];
    return [0, 1, 2].map(k => (ca[k] * ca[3] * wa + cb[k] * cb[3] * wb) / al).concat([al * (s ? 1 : 1)]);
  }
  throw new Error('couleur non lue : ' + t);
}
/* fg (rgba) posé sur un fond opaque */
const sur = (fg, fond) => [0, 1, 2].map(k => fg[k] * fg[3] + fond[k] * (1 - fg[3])).concat([1]);
const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : ((x + .055) / 1.055) ** 2.4; }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ratio = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

module.exports = { lire, jetons, valeur, couleur, sur, ratio, lum, applique, regles, blocs };
