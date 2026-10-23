/* Range chaque règle :hover d'app.html sous @media (hover:hover), À SA PLACE (l'ordre de la cascade ne bouge pas).
   Une liste de sélecteurs mêlée (« .a:hover, .a.on ») est coupée en deux règles au même endroit : la partie sans survol
   reste pour tous, la partie survol passe sous le média. Les règles déjà sous (hover:hover) ne bougent pas. Le bloc
   @media (hover:none) qui ANNULAIT les survols un par un est retiré (il n'a plus rien à annuler, et ses !important
   forçaient le fond d'origine sur des éléments qui en ont un autre). Usage : node gater-survols.js app.html */
const fs = require('fs');
const F = process.argv[2]; let B = fs.readFileSync(F, 'utf8');
const edits = [];
const GATE_O = '@media (hover:hover){ ', GATE_F = ' }';
function finBloc(css, i) { let p = 1, k = i + 1, q = null;
  for (; k < css.length; k++) { const d = css[k];
    if (css.startsWith('/*', k)) { k = css.indexOf('*/', k + 2) + 1; continue; }
    if (q) { if (d === '\\') { k++; continue; } if (d === q) q = null; continue; }
    if (d === '"' || d === "'") { q = d; continue; }
    if (d === '{') p++; else if (d === '}') { if (!--p) return k; } }
  return -1; }
function couper(sel) { const out = []; let p = 0, b = 0, q = null, deb = 0;
  for (let k = 0; k < sel.length; k++) { const c = sel[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c; else if (c === '(') p++; else if (c === ')') p--; else if (c === '[') b++; else if (c === ']') b--;
    else if (c === ',' && !p && !b) { out.push(sel.slice(deb, k)); deb = k + 1; } }
  out.push(sel.slice(deb)); return out.map(s => s.trim()).filter(Boolean); }
let nRegles = 0, nCoupees = 0, nSautees = 0, blocNone = null;
function parcourir(css, base, media) {
  let i = 0, deb = 0, q = null;
  while (i < css.length) {
    const c = css[i];
    if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? css.length : j + 2; continue; }
    if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
    if (c === '"' || c === "'") { q = c; i++; continue; }
    if (c === '{') {
      /* le début réel du sélecteur : après les blancs et les commentaires qui le précèdent */
      let s = deb; for (;;) { while (s < i && /\s/.test(css[s])) s++; if (css.startsWith('/*', s)) { s = css.indexOf('*/', s + 2) + 2; continue; } break; }
      const prelude = css.slice(s, i), net = prelude.replace(/\/\*[\s\S]*?\*\//g, ' ').trim();
      const k = finBloc(css, i);
      if (net.startsWith('@')) {
        if (/^@media\s*\(\s*hover\s*:\s*none\s*\)\s*$/.test(net)) {
          /* le commentaire qui le présente part avec lui (la note le remplace) */
          let s0 = deb; while (s0 < s && /\s/.test(css[s0])) s0++;
          blocNone = { a: base + (css.startsWith('/*', s0) ? s0 : s), b: base + k + 1 };
        }
        else if (/^@(media|supports|layer|container)/.test(net)) parcourir(css.slice(i + 1, k), base + i + 1, media.concat([net]));
      } else if (/:hover/.test(net)) {
        if (media.some(m => /\(\s*hover\s*:\s*hover\s*\)/.test(m))) nSautees++;
        else if (!media.some(m => /\(\s*hover\s*:\s*none\s*\)/.test(m))) {
          nRegles++;
          const corps = css.slice(i, k + 1), parts = couper(net), H = parts.filter(p => /:hover/.test(p)), N = parts.filter(p => !/:hover/.test(p));
          let rep;
          if (!N.length) rep = GATE_O + prelude + corps + GATE_F;
          else { nCoupees++; rep = N.join(',') + corps + GATE_O + H.join(',') + corps + GATE_F; }
          edits.push({ a: base + s, b: base + k + 1, rep });
        }
      }
      i = k + 1; deb = i; continue;
    }
    if (c === '}' || c === ';') deb = i + 1;
    i++;
  }
}
const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
while ((m = re.exec(B))) parcourir(m[1], m.index + m[0].indexOf('>') + 1, []);
if (!blocNone) { console.error('⛔ le bloc @media (hover:none) est introuvable'); process.exit(1); }
const NOTE = `/* ── SANS VRAI SURVOL ── (audit apple-design du 21 octobre 2026, § 10) Ce bloc annulait les survols UN PAR UN quand le
   pointeur ne survole pas : sur un écran tactile, :hover se déclenche à l'appui et RESTE COLLÉ jusqu'au toucher suivant.
   Mesuré au doigt, 38 familles lui échappaient (« ＋ Créer », retour, onglets, cloche, tuiles, lignes…) — toute règle de
   survol écrite après lui. La règle est désormais à la SOURCE : chaque :hover de cette page vit sous @media (hover:hover),
   à sa place dans la cascade (tests/test-2836.js le recense et refuse un survol nu). La réponse à la PRESSION (:active)
   reste pour tous : c'est la seule qui ait un sens au doigt. */`;
edits.push({ a: blocNone.a, b: blocNone.b, rep: NOTE });
edits.sort((x, y) => y.a - x.a);
for (let k = 1; k < edits.length; k++) if (edits[k].b > edits[k - 1].a) { console.error('⛔ deux réécritures se chevauchent', edits[k], edits[k - 1].a); process.exit(1); }
for (const e of edits) B = B.slice(0, e.a) + e.rep + B.slice(e.b);
fs.writeFileSync(F, B);
console.log('règles rangées sous (hover:hover) : ' + nRegles + ' (dont ' + nCoupees + ' listes coupées en deux) · déjà rangées : ' + nSautees + ' · bloc (hover:none) retiré');
