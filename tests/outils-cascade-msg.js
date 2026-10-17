/* ══ LA CASCADE CSS D'OP MESSAGES, REJOUÉE (outil des bancs 1490 à 1499 — ce n'est pas une suite) ═══════════════════════════════════
 *
 * Un banc qui cherche « opacity: 1 » dans la feuille garde une phrase ; ce qui compte est ce qu'une règle GAGNE sur un élément. Le défaut de la barre « Appel en cours »
 * (le combiné du rond rouge invisible) est exactement celui-là : la règle des cases de contact `.rond .ic { opacity: 0 }` atteignait un rond qui n'a rien d'une case — et
 * aucune lecture d'une seule règle ne le montre.
 *
 * Ce que cet outil sait : des sélecteurs faits de classes (et d'une balise) séparés par des espaces (descendants) — c'est tout ce que les règles qu'il garde emploient. Tout
 * autre sélecteur (pseudo-classe, attribut, enfant direct, identifiant) est IGNORÉ et compté (`ignores`) : il ne gagne jamais ici, et un banc qui en dépend le DIT.
 * Il ne lit que les règles de premier niveau (celles d'un `@media` ne sont pas rejouées : le banc qui les vise les lit à part).
 *
 * Usage :  const C = require('./outils-cascade-msg.js');  const R = C.regles(css);
 *          C.gagne(R, [{ classes: ['appel-barre-raccrocher'], tag: 'button' }, { classes: ['rond'], tag: 'span' }, { classes: ['ic'], tag: 'svg' }], 'opacity')  → '1' | undefined
 *          (la chaîne va de l'ancêtre le plus lointain à l'élément mesuré)
 */
'use strict';
const sansCommentaires = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ');

/* découpe le premier niveau de la feuille : { sel, corps } pour une règle ordinaire, et saute les blocs `@…` (leur contenu n'est pas rejoué) */
function regles(css) {
  const s = sansCommentaires(css), out = []; let i = 0, ordre = 0, ignores = 0;
  while (i < s.length) {
    const o = s.indexOf('{', i); if (o < 0) break;
    const tete = s.slice(i, o).trim();
    let prof = 1, j = o + 1;
    while (j < s.length && prof > 0) { if (s[j] === '{') prof++; else if (s[j] === '}') prof--; j++; }
    const corps = s.slice(o + 1, j - 1);
    i = j;
    if (!tete || tete[0] === '@') continue;
    const decl = {};
    for (const d of corps.split(';')) { const k = d.indexOf(':'); if (k < 0) continue; const p = d.slice(0, k).trim().toLowerCase(), v = d.slice(k + 1).trim(); if (p) decl[p] = v; }
    for (const sel of tete.split(',')) {
      const t = sel.trim(); if (!t) continue;
      if (!/^[A-Za-z0-9_.\- ]+$/.test(t)) { ignores++; continue; }
      const compos = t.split(/\s+/).map(c => { const m = /^([A-Za-z][A-Za-z0-9]*)?((?:\.[A-Za-z0-9_-]+)*)$/.exec(c); return m ? { tag: m[1] || null, classes: m[2] ? m[2].split('.').slice(1) : [] } : null; });
      if (compos.some(c => !c)) { ignores++; continue; }
      out.push({ sel: t, compos, decl, ordre: ordre++, spec: compos.reduce((n, c) => n + c.classes.length * 10 + (c.tag ? 1 : 0), 0) });
    }
  }
  out.ignores = ignores;
  return out;
}
const colle = (c, e) => (!c.tag || c.tag === e.tag) && c.classes.every(k => (e.classes || []).includes(k));
/* le sélecteur (liste de compositions) vise-t-il le bout de la chaîne ? les compositions précèdent par descendance (pas forcément contiguës) */
function vise(compos, chaine) {
  const n = compos.length - 1; if (!colle(compos[n], chaine[chaine.length - 1])) return false;
  let k = n - 1;
  for (let a = chaine.length - 2; a >= 0 && k >= 0; a--) if (colle(compos[k], chaine[a])) k--;
  return k < 0;
}
/* la valeur gagnante d'une propriété sur l'élément : la plus spécifique, à égalité la dernière écrite (`!important` passe devant tout) */
function gagne(R, chaine, prop) {
  let best = null;
  for (const r of R) {
    if (!(prop in r.decl) || !vise(r.compos, chaine)) continue;
    const imp = /!important\s*$/i.test(r.decl[prop]);
    const cle = [imp ? 1 : 0, r.spec, r.ordre];
    if (!best || cle[0] > best.cle[0] || (cle[0] === best.cle[0] && (cle[1] > best.cle[1] || (cle[1] === best.cle[1] && cle[2] > best.cle[2])))) best = { cle, v: r.decl[prop].replace(/\s*!important\s*$/i, '').trim(), sel: r.sel };
  }
  return best ? best.v : undefined;
}

/* ── lire le SCRIPT de la page (sans commentaires) : une déclaration entière, ou une ligne ── */
const sansCommJs = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/(^|\s)\/\/\s.*$/gm, ' ');      // ⛔ seulement les blocs qui COMMENCENT une ligne (CLAUDE.md, 21 septembre 2026)
function decl(JS, debut) {
  const i = JS.indexOf(debut); if (i < 0) return '';
  let j = JS.indexOf('{', i + debut.length - 1), n = 0, q = null;
  for (; j < JS.length; j++) {
    const ch = JS[j];
    if (q) { if (ch === '\\') { j++; continue; } if (ch === q) q = null; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { q = ch; continue; }
    if (ch === '{') n++;
    else if (ch === '}') { n--; if (n === 0) return JS.slice(i, j + 1) + (JS[j + 1] === ';' ? ';' : ''); }
  }
  return '';
}
const ligne = (JS, debut) => { const i = JS.indexOf(debut); return i < 0 ? '' : JS.slice(i, JS.indexOf('\n', i)); };
module.exports = { regles, gagne, vise, sansCommentaires, sansCommJs, decl, ligne };
