/* ⛔ CE QUE CE FICHIER GARDE — la Tour AU TÉLÉPHONE (v2.68, 26 septembre 2026 au soir).
   Justin : « sur le téléphone il y a beaucoup de décalage d'écriture […] tu te connectes et tu me corriges ».
   Les vingt vues ont été relevées de haut en bas en iPhone, filets aux marges (scratchpad/sonde-tour-telephone.js),
   puis chaque décalage demandé au navigateur — QUELLE règle le posait (scratchpad/sonde-regles.js). Ce qu'on a
   trouvé, et que ce banc empêche de revenir :
     · en défilant, le titre de la page s'écrivait PAR-DESSUS « GESTION » dans l'en-tête : le nom devait être caché
       au téléphone, et une règle du thème, écrite plus loin, le remontrait ;
     · des textes qui partaient à 2, 4, 9, 16 ou 17 px de leur colonne ; une carte à 24 px entre des cartes à 16 ;
       un titre de groupe collé qui couvrait le tiers de l'écran en défilant ;
     · « Couper l'accès » coupé au bord de sa carte ; des menus déroulants SANS chevron — un raccourci
       `background:` écrit plus loin effaçait l'image (une moitié de règle survivait à l'autre) ;
     · des lignes qui commençaient par « : », « · » ou « » », un « € » séparé de son montant ;
     · « 3 problème(s) ouvert(s) », et une phrase qui commençait par une minuscule sous son bouton.

   Comment. ⛔ Ce n'est pas le TEXTE d'une règle qu'on garde, c'est ce qu'elle GAGNE : la cascade est rejouée ici
   comme le navigateur la fait — toutes les feuilles de la page, dans l'ordre, média, spécificité, !important —
   pour un élément décrit par sa balise, ses classes et la chaîne de ses ancêtres. Ce qu'on ne sait pas juger
   (un attribut, :not, :has, un frère) compte comme s'il s'appliquait : ce banc peut crier à tort, jamais se taire
   à tort. Et, dès que c'est possible, on garde une RELATION plutôt qu'un chiffre : « le titre du groupe part sur
   la colonne de l'en-tête de sa liste », pas « 16 px ».
   Les fonctions (typographie, titre de l'en-tête, remise à zéro, accords) sont extraites et EXÉCUTÉES.
   La preuve au pixel : scratchpad/sonde-tour-theme.js (MESURE_TEL, MESURE_ENTETE) et sonde-tour-telephone.js.
   TOUR_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + d : ''), !!c, true);
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE = sansCommentaires(SRC);
/* une fonction jusqu'à SA fin : accolades comptées hors chaînes et hors commentaires (même découpe que test-829) */
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
const ligne = (debut) => { const i = CODE.indexOf(debut); if (i < 0) return ''; return CODE.slice(i, CODE.indexOf('\n', i)); };
/* exécute un morceau de la page dans un bac à sable. Introuvable ou cassé, il fait tomber les contrôles qui en
   dépendent au lieu de faire mourir le banc : la contre-épreuve doit pouvoir lire TOUT le rapport. */
function executer(code, ctx) { try { vm.createContext(ctx); vm.runInContext(code, ctx); return true; } catch (e) { ctx.__erreur = String(e && e.message || e); return false; } }

/* ══ 0. LA CASCADE, REJOUÉE ═══════════════════════════════════════════════════════════════════════════════════ */
/* l'indice de la fermeture qui répond à l'ouverture posée en i — ( [ { — hors chaînes */
function apparier(s, i) {
  const ouv = s[i], fer = { '(': ')', '[': ']', '{': '}' }[ouv]; let prof = 0, q = null;
  for (let k = i; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") { q = c; continue; }
    if (c === ouv) prof++; else if (c === fer && !--prof) return k;
  }
  return -1;
}
/* découpe au premier niveau : hors parenthèses, crochets et chaînes */
function scinder(s, sep) {
  const out = []; let prof = 0, q = null, deb = 0;
  for (let k = 0; k < s.length; k++) {
    const c = s[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === '"' || c === "'") q = c;
    else if (c === '(' || c === '[') prof++;
    else if (c === ')' || c === ']') prof--;
    else if (c === sep && !prof) { out.push(s.slice(deb, k)); deb = k + 1; }
  }
  out.push(s.slice(deb)); return out;
}
/* Toutes les feuilles de la page, dans leur ordre. Les commentaires sont blanchis EN GARDANT les sauts de ligne :
   une règle se nomme par sa ligne dans tour.html. */
const FEUILLES = [];
function feuilles() {
  const regles = []; let ordre = 0;
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = re.exec(SRC))) {
    const base = m.index + m[0].indexOf('>') + 1, ligne0 = SRC.slice(0, base).split('\n').length;
    FEUILLES.push({ fin: SRC.slice(0, m.index + m[0].length).split('\n').length, n0: regles.length });
    const css = m[1].replace(/\/\*[\s\S]*?\*\//g, c => c.replace(/[^\n]/g, ' '));
    const nl = []; for (let k = 0; k < css.length; k++) if (css[k] === '\n') nl.push(k);
    const ligneDe = pos => { let lo = 0, hi = nl.length; while (lo < hi) { const mi = (lo + hi) >> 1; if (nl[mi] < pos) lo = mi + 1; else hi = mi; } return ligne0 + lo; };
    (function lire(i, fin, media) {
      while (i < fin) {
        let acc = -1, q = null, prof = 0;
        for (let k = i; k < fin; k++) {
          const c = css[k];
          if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
          if (c === '"' || c === "'") q = c; else if (c === '(') prof++; else if (c === ')') prof--;
          else if (c === '{' && !prof) { acc = k; break; }
        }
        if (acc < 0) break;
        const prelude = css.slice(i, acc).trim(), ferme = apparier(css, acc);
        if (ferme < 0) throw new Error('feuille mal fermée, ligne ' + ligneDe(acc));
        if (/^@media\b/i.test(prelude)) lire(acc + 1, ferme, media.concat([prelude.replace(/^@media\s*/i, '')]));
        else if (/^@supports\b/i.test(prelude)) lire(acc + 1, ferme, media);
        else if (!prelude.startsWith('@')) {
          const o = ordre++, lig = ligneDe(acc);
          const decls = scinder(css.slice(acc + 1, ferme), ';').map((d, n) => {
            const k = d.indexOf(':'); if (k < 0) return null;
            let val = d.slice(k + 1).trim(); const imp = /!\s*important\s*$/i.test(val);
            if (imp) val = val.replace(/!\s*important\s*$/i, '').trim();
            return { prop: d.slice(0, k).trim().toLowerCase(), val, imp, n };
          }).filter(x => x && x.prop);
          for (const sel of scinder(prelude, ',')) if (sel.trim()) regles.push({ sel: sel.trim().replace(/\s+/g, ' '), media, decls, ordre: o, ligne: lig });
        }
        i = ferme + 1;
      }
    })(0, css.length, []);
  }
  return regles;
}
const finIdent = (s, i) => { while (i < s.length && /[\w\- -￿\\]/.test(s[i])) i += s[i] === '\\' ? 2 : 1; return i; };
const cmp = (p, q) => (p[0] - q[0]) || (p[1] - q[1]) || (p[2] - q[2]);
function specificite(sel) {
  let a = 0, b = 0, c = 0;
  for (let i = 0; i < sel.length;) {
    const ch = sel[i];
    if (ch === '#') { a++; i = finIdent(sel, i + 1); }
    else if (ch === '.') { b++; i = finIdent(sel, i + 1); }
    else if (ch === '[') { b++; i = apparier(sel, i) + 1; }
    else if (ch === ':') {
      const pe = sel[i + 1] === ':', d = i + (pe ? 2 : 1), j = finIdent(sel, d), nom = sel.slice(d, j).toLowerCase();
      if (pe || ['before', 'after', 'first-line', 'first-letter'].includes(nom)) { c++; i = sel[j] === '(' ? apparier(sel, j) + 1 : j; }
      else if (sel[j] === '(') {
        const k = apparier(sel, j);
        if (['not', 'is', 'has', 'matches'].includes(nom)) {
          const m = scinder(sel.slice(j + 1, k), ',').map(x => specificite(x.trim())).reduce((p, q) => cmp(p, q) >= 0 ? p : q, [0, 0, 0]);
          a += m[0]; b += m[1]; c += m[2];
        } else if (nom !== 'where') b++;
        i = k + 1;
      } else { b++; i = j; }
    }
    else if (/[a-zA-Z]/.test(ch)) { c++; i = finIdent(sel, i); }
    else i++;
  }
  return [a, b, c];
}
/* un sélecteur en composés, de gauche à droite ; comb = le combinateur qui PRÉCÈDE le composé */
function composes(sel) {
  const out = []; let cur = '', comb = null;
  for (let k = 0; k < sel.length;) {
    const c = sel[k];
    if (c === '(' || c === '[') { const f = apparier(sel, k); cur += sel.slice(k, f + 1); k = f + 1; continue; }
    if (/[\s>+~]/.test(c)) {
      let j = k, op = ' ';
      while (j < sel.length && /[\s>+~]/.test(sel[j])) { if (sel[j] !== ' ') op = sel[j]; j++; }
      if (cur) { out.push({ txt: cur, comb }); cur = ''; }
      comb = op; k = j; continue;
    }
    cur += c; k++;
  }
  if (cur) out.push({ txt: cur, comb });
  return out;
}
/* les états qu'on sait juger ; les autres pseudo-classes (:not, :has, :nth-child…) peuvent s'appliquer */
const ETATS = ['hover', 'active', 'focus', 'focus-visible', 'focus-within', 'checked', 'disabled', 'visited', 'target'];
function compose(txt) {
  const r = { tag: null, ids: [], classes: [], pseudoEl: null, etats: [] };
  for (let i = 0; i < txt.length;) {
    const ch = txt[i];
    if (ch === '#') { const j = finIdent(txt, i + 1); r.ids.push(txt.slice(i + 1, j)); i = j; }
    else if (ch === '.') { const j = finIdent(txt, i + 1); r.classes.push(txt.slice(i + 1, j)); i = j; }
    else if (ch === '[') i = apparier(txt, i) + 1;
    else if (ch === ':') {
      const pe = txt[i + 1] === ':', d = i + (pe ? 2 : 1), j = finIdent(txt, d), nom = txt.slice(d, j).toLowerCase();
      if (pe || ['before', 'after', 'first-line', 'first-letter'].includes(nom)) r.pseudoEl = nom;
      else if (ETATS.includes(nom)) r.etats.push(nom);
      i = txt[j] === '(' ? apparier(txt, j) + 1 : j;
    }
    else { const j = finIdent(txt, i); if (j === i) { i++; continue; } r.tag = txt.slice(i, j).toLowerCase(); i = j; }
  }
  return r;
}
const convient = (c, el) => (c.pseudoEl || null) === (el.pseudoEl || null) && (!c.tag || c.tag === el.tag) &&
  c.ids.every(x => el.ids.includes(x)) && c.classes.every(x => el.classes.includes(x)) && c.etats.every(x => el.etats.includes(x));
/* ⚠️ « > » est lu comme un descendant : la chaîne qu'on décrit peut sauter des intermédiaires sans nom. Un frère
   (+ ~) n'est pas jugé. Les deux vont dans le même sens : une règle de plus peut s'appliquer, jamais une de moins. */
function peutViser(r, el, chaine) {
  const cs = r.cs || (r.cs = composes(r.sel).map(x => ({ comb: x.comb, c: compose(x.txt) })));
  if (!convient(cs[cs.length - 1].c, el)) return false;
  let k = chaine.length - 1;
  for (let j = cs.length - 1; j > 0; j--) {
    if (cs[j].comb === '+' || cs[j].comb === '~') continue;
    let t = -1; for (let a = k; a >= 0; a--) if (convient(cs[j - 1].c, chaine[a])) { t = a; break; }
    if (t < 0) return false;
    k = t - 1;
  }
  return true;
}
const TRAITS = {
  'max-width': (val, x) => x.largeur <= parseFloat(val), 'min-width': (val, x) => x.largeur >= parseFloat(val),
  'pointer': (val, x) => x.pointeur === val, 'hover': (val, x) => (val === 'hover') === x.survol,
  'prefers-reduced-motion': (val, x) => (val === 'reduce') === !!x.moinsMouv,
  'prefers-reduced-transparency': (val, x) => (val === 'reduce') === !!x.moinsTransp,
  'prefers-contrast': (val, x) => (val === 'more') === !!x.contraste,
  'prefers-color-scheme': (val, x) => (val === 'dark') === !!x.sombre,
};
function mediaVaut(q, x) {
  return scinder(q, ',').some(p => {
    p = p.trim().toLowerCase(); let non = false;
    if (/^not\s/.test(p)) { non = true; p = p.slice(4).trim(); }
    p = p.replace(/^only\s+/, '');
    let r = !/^print\b/.test(p);
    const traits = [...p.matchAll(/\(\s*([a-z-]+)\s*:\s*([^)]*?)\s*\)/g)];
    if (!traits.length && !/^(screen|print|all)\b/.test(p)) throw new Error('média illisible : ' + q);
    for (const [, nom, val] of traits) {
      const f = TRAITS[nom]; if (!f) throw new Error('trait de média inconnu de ce banc : ' + nom + ' (« ' + q + ' ») — l’ajouter à TRAITS');
      r = r && f(val.trim(), x);
    }
    return non ? !r : r;
  });
}
const REGLES = feuilles();
/* qui peut poser une propriété : elle-même, et les raccourcis qui la contiennent */
const SOURCES = {
  'padding-left': ['padding', 'padding-inline', 'padding-inline-start'], 'padding-right': ['padding', 'padding-inline', 'padding-inline-end'],
  'margin-left': ['margin', 'margin-inline', 'margin-inline-start'], 'margin-right': ['margin', 'margin-inline', 'margin-inline-end'],
  'top': ['inset', 'inset-block', 'inset-block-start'], 'left': ['inset', 'inset-inline', 'inset-inline-start'], 'right': ['inset', 'inset-inline', 'inset-inline-end'],
  'background-image': ['background'], 'background-position': ['background'], 'background-repeat': ['background'], 'background-color': ['background'],
  'grid-template-columns': ['grid-template', 'grid'], 'column-gap': ['gap', 'grid-gap', 'grid-column-gap'], 'flex-basis': ['flex'],
  'white-space': ['text-wrap-mode'],
  'border-left-width': ['border', 'border-left', 'border-width'], 'border-left-color': ['border', 'border-left', 'border-color'],
};
const plusFort = (a, b) => a.d.imp !== b.d.imp ? a.d.imp : (cmp(a.sp, b.sp) || (a.r.ordre - b.r.ordre) || (a.d.n - b.d.n)) > 0;
function gagnant(prop, el, chaine, x) {
  const srcs = [prop].concat(SOURCES[prop] || []); let best = null;
  for (const r of REGLES) {
    let d = null; for (const dd of r.decls) if (srcs.includes(dd.prop) && (!d || dd.imp || !d.imp)) d = dd;
    if (!d || !r.media.every(q => mediaVaut(q, x)) || !peutViser(r, el, chaine)) continue;
    const c = { r, d, sp: r.sp || (r.sp = specificite(r.sel)) };
    if (!best || plusFort(c, best)) best = c;
  }
  return best;
}
/* la valeur de la propriété LONGUE, même quand c'est un raccourci qui l'a posée */
function valeur(g, prop) {
  if (!g) return null;
  const d = g.d; if (d.prop === prop) return d.val;
  const t = scinder(d.val, ' ').map(s => s.trim()).filter(Boolean);
  if (/^(padding|margin|inset)$/.test(d.prop)) {
    const cote = prop.split('-').pop();
    return { top: t[0], right: t[1] ?? t[0], bottom: t[2] ?? t[0], left: t[3] ?? t[1] ?? t[0] }[cote];
  }
  if (/-inline$/.test(d.prop)) return /(left|start)$/.test(prop) ? t[0] : (t[1] ?? t[0]);
  if (d.prop === 'gap' || d.prop === 'grid-gap') return t[1] ?? t[0];
  if (d.prop === 'flex') return t.length === 3 ? t[2] : (t.length === 1 && /^[\d.]+$/.test(t[0]) ? '0%' : d.val);
  if (d.prop === 'border' || d.prop === 'border-left') {
    const epais = x => /^(-?[\d.]+(px|em|rem)?|thin|medium|thick)$/.test(x), style = x => /^(none|hidden|dotted|dashed|solid|double|groove|ridge|inset|outset)$/.test(x);
    if (prop === 'border-left-width') return t.find(epais) || (t.some(style) ? 'medium' : '0');
    if (prop === 'border-left-color') return t.find(x => !epais(x) && !style(x)) || 'currentcolor';
  }
  if (d.prop === 'border-width' || d.prop === 'border-color') return t[3] ?? t[1] ?? t[0];
  return d.val;
}
const elem = s => { const c = compose(s); return { tag: c.tag, ids: c.ids, classes: c.classes, pseudoEl: c.pseudoEl, etats: c.etats }; };
const TEL = L => ({ largeur: L, pointeur: 'coarse', survol: false });
const BUREAU = L => ({ largeur: L, pointeur: 'fine', survol: true });
const lire = (prop, cible, chaine, x) => { const g = gagnant(prop, elem(cible), chaine.map(elem), x); return { val: valeur(g, prop), g }; };
const px = s => { if (s == null || s === '0') return 0; const m = /^(-?[\d.]+)px$/.exec(String(s).trim()); return m ? +m[1] : NaN; };
const qui = g => g ? '« ' + g.r.sel + ' » (ligne ' + g.r.ligne + ')' : 'aucune règle';
/* le départ du texte d'un bloc : marge + retrait (les bordures de ces blocs sont nulles ou comptées à part) */
const depart = (cible, chaine, x) => { const m = lire('margin-left', cible, chaine, x), p = lire('padding-left', cible, chaine, x);
  return { n: px(m.val) + px(p.val), dit: 'marge ' + m.val + ' par ' + qui(m.g) + ', retrait ' + p.val + ' par ' + qui(p.g) }; };
/* un contrôle sur plusieurs largeurs à la fois : UNE ligne au rapport, qui nomme la première largeur fautive */
function partout(titre, cas, f) {
  const fautes = []; let n = 0;
  for (const c of cas) { n++; const e = f(c); if (e) fautes.push(e); }
  vrai(titre + ' (' + n + ' cas)', n > 0 && !fautes.length, fautes.length ? fautes.slice(0, 2).join(' ; ') + (fautes.length > 2 ? ' (+' + (fautes.length - 2) + ')' : '') : 'aucun cas');
}
const LARG_TEL = [320, 360, 390, 430, 600, 768, 899], LARG_BUREAU = [900, 1024, 1280, 1600];
const PAGE = (corps) => ['html', corps || 'body', 'div#app.on', 'main#vue'];
const HBAR = (corps) => ['html', corps || 'body', 'div#app.on', 'div.bandeau', 'div.hbar'];

console.log('\n0. La cascade est rejouée sur les vraies feuilles');
vrai('population : les deux feuilles de la page sont lues JUSQU’AU BOUT (une chaîne mal fermée arrêterait la lecture en silence)',
  FEUILLES.length === 2 && FEUILLES.every((f, i) => { const r = REGLES.slice(f.n0, i + 1 < FEUILLES.length ? FEUILLES[i + 1].n0 : REGLES.length);
    return r.length > 300 && f.fin - r[r.length - 1].ligne <= 3; }) && REGLES.length > 1500,
  FEUILLES.map(f => 'fin ' + f.fin).join(', ') + ', ' + REGLES.length + ' sélecteurs');
vrai('…dont la section « CHAQUE TEXTE SUR SA COLONNE », dans la DERNIÈRE feuille (elle passe après le thème)',
  (() => { const i = SRC.indexOf('CHAQUE TEXTE SUR SA COLONNE'), j = SRC.lastIndexOf('</style>'); return i > 0 && i < j && SRC.lastIndexOf('<style', i) === SRC.lastIndexOf('<style', j); })());
v('le banc sait lire une spécificité', [specificite('body.titre-cache .hnom'), specificite('select.sel-f'), specificite('.a:not(.b,#c)>p::before')],
  [[0, 2, 1], [0, 1, 1], [1, 1, 2]]);
vrai('…et un média (téléphone contre bureau)', mediaVaut('(max-width:899px)', TEL(390)) && !mediaVaut('(max-width:899px)', BUREAU(1280))
  && mediaVaut('(hover:hover) and (pointer:fine)', BUREAU(1280)) && !mediaVaut('(hover:hover) and (pointer:fine)', TEL(390))
  && mediaVaut('(pointer:coarse),(max-width:760px)', TEL(820)));

console.log('\n1. L’en-tête au téléphone : le titre de la page ne s’écrit plus sur « GESTION »');
const casEntete = [].concat(...LARG_TEL.map(L => ['body', 'body.jour'].map(c => ({ L, c }))));
partout('titre monté dans l’en-tête : le nom et la pastille d’application s’effacent', casEntete, ({ L, c }) => {
  const x = TEL(L), ch = HBAR(c + '.titre-cache');
  const n = lire('opacity', 'div.hnom', ch.concat(['div.hg']), x), p = lire('opacity', 'button#app-pill.app-pill', ch, x), t = lire('opacity', 'div#titre-court.titre-court', ch, x);
  if (t.val !== '1') return L + ' px : le titre court ne paraît pas (' + t.val + ', ' + qui(t.g) + ') — le contrôle n’a plus d’objet';
  if (n.val !== '0') return L + ' px, ' + c + ' : le nom reste (' + n.val + ', ' + qui(n.g) + ')';
  if (p.val !== '0') return L + ' px, ' + c + ' : la pastille reste (' + p.val + ', ' + qui(p.g) + ')';
});
partout('…et reviennent quand le titre de la page est de nouveau visible', casEntete, ({ L, c }) => {
  const x = TEL(L), ch = HBAR(c);
  const n = lire('opacity', 'div.hnom', ch.concat(['div.hg']), x), t = lire('opacity', 'div#titre-court.titre-court', ch, x);
  if (n.val === '0') return L + ' px : le nom reste effacé (' + qui(n.g) + ')';
  if (t.val !== '0') return L + ' px : le titre court reste affiché (' + t.val + ', ' + qui(t.g) + ')';
});
/* la relation qui a cassé : le seuil où le titre court PARAÎT et celui où le nom S'EFFACE doivent être le même */
partout('le titre court paraît exactement là où le nom s’efface — ni avant, ni après (320 → 1 600 px)',
  [320, 390, 600, 760, 768, 820, 899, 900, 901, 1024, 1280, 1600].map(L => ({ L })), ({ L }) => {
    const x = L < 900 ? TEL(L) : BUREAU(L), ch = HBAR('body.titre-cache');
    const t = lire('opacity', 'div#titre-court.titre-court', ch, x), td = lire('display', 'div#titre-court.titre-court', ch, x);
    const n = lire('opacity', 'div.hnom', ch.concat(['div.hg']), x);
    const court = t.val === '1' && td.val !== 'none', efface = n.val === '0';
    if (court !== efface) return L + ' px : titre court ' + (court ? 'affiché' : 'caché') + ', nom ' + (efface ? 'effacé' : 'visible') + ' (' + qui(n.g) + ')';
  });
/* la géométrie : centré, le titre court le plus large ne touche ni le logo ni l'avatar */
function longueur(s, cent) {
  s = String(s || '').trim(); let m;
  if (s === 'none' || s === '') return Infinity;
  if ((m = /^(-?[\d.]+)px$/.exec(s))) return +m[1];
  if ((m = /^(-?[\d.]+)%$/.exec(s))) return cent * m[1] / 100;
  if ((m = /^(-?[\d.]+)vw$/.exec(s))) return cent * m[1] / 100;   // l'en-tête fait toute la largeur : 100 % = 100vw
  if ((m = /^calc\((.+)\)$/.exec(s))) { const t = scinder(m[1], ' ').filter(Boolean); let r = longueur(t[0], cent); for (let i = 1; i < t.length; i += 2) r += (t[i] === '-' ? -1 : 1) * longueur(t[i + 1], cent); return r; }
  return NaN;
}
partout('centré dans l’en-tête, le titre le plus long garde 8 px d’air avec le logo et avec l’avatar', LARG_TEL.map(L => ({ L })), ({ L }) => {
  const x = TEL(L), ch = HBAR('body.titre-cache');
  const pos = lire('left', 'div#titre-court.titre-court', ch, x).val, W = longueur(lire('max-width', 'div#titre-court.titre-court', ch, x).val, L);
  const hbarG = px(lire('padding-left', 'div.hbar', HBAR().slice(0, -1), x).val), hbarD = px(lire('padding-right', 'div.hbar', HBAR().slice(0, -1), x).val);
  const hgG = px(lire('padding-left', 'div.hg', HBAR(), x).val), logo = px(lire('width', 'img.hlogo', HBAR().concat(['div.hg']), x).val);
  const puce = HBAR().concat(['div.hd']), chip = Math.max(px(lire('min-width', 'div.hchip', puce, x).val), px(lire('padding-left', 'div.hchip', puce, x).val) + px(lire('width', 'div#h-ini.hava', puce.concat(['div.hchip']), x).val));
  if (pos !== '50%' || !isFinite(W) || [hbarG, hbarD, hgG, logo, chip].some(isNaN)) return L + ' px : géométrie illisible (left ' + pos + ', largeur ' + W + ')';
  const g = (L - W) / 2, d = L - g, logoFin = hbarG + hgG + logo, avatar = L - hbarD - chip;
  if (g < logoFin + 8 || d > avatar - 8) return L + ' px : le titre va de ' + g + ' à ' + d + ', le logo finit à ' + logoFin + ', l’avatar commence à ' + avatar;
});
/* l'état ne survit pas à la page : observerTitre, exécuté avec un faux document */
function faireTitre(cas) {
  const classes = new Set(cas.cache ? ['titre-cache'] : []), court = { textContent: 'ANCIEN TITRE' }, journal = { observes: [], deconnexions: 0, cree: 0, marge: null };
  const noeuds = { '#vue .ttl-page': cas.ttl, '#vue .fiche-nom': cas.fiche, '#vue .inc-titre': cas.inc };
  class IO { constructor(f, o) { journal.cree++; journal.f = f; journal.marge = o && o.rootMargin; } observe(e) { journal.observes.push(e); } disconnect() { journal.deconnexions++; } }
  const ctx = { document: { body: { classList: { add: c => classes.add(c), remove: c => classes.delete(c), toggle: (c, f) => f ? classes.add(c) : classes.delete(c), contains: c => classes.has(c) } },
    querySelector: s => noeuds[s] || null }, $: id => id === 'titre-court' ? court : null, IntersectionObserver: IO, _obsTitre: cas.avant ? new IO() : null };
  if (cas.avant) journal.cree = 0;
  executer(fonction('observerTitre') + '\nobserverTitre();', ctx);
  return { classes, court, journal };
}
vrai('population : observerTitre est extraite', /_obsTitre\.observe\(t\)/.test(fonction('observerTitre')));
{
  const r = faireTitre({ cache: true, avant: true });
  v('une page sans titre : l’en-tête oublie la page d’avant (classe, texte, observateur)', [r.classes.has('titre-cache'), r.court.textContent, r.journal.deconnexions, r.journal.cree], [false, '', 1, 0]);
  const t = { textContent: '  Surveillance  ' }, f = { textContent: 'ELAN SERVICES' }, i = { textContent: 'Le dossier' };
  v('le titre de la page d’abord, puis celui d’une fiche, puis celui d’un dossier',
    [faireTitre({ ttl: t, fiche: f }).court.textContent, faireTitre({ fiche: f, inc: i }).court.textContent, faireTitre({ inc: i }).court.textContent],
    ['Surveillance', 'ELAN SERVICES', 'Le dossier']);
  const o = faireTitre({ fiche: f }), rappel = typeof o.journal.f === 'function' ? o.journal.f : () => {};
  rappel([{ isIntersecting: false }]); const cache = o.classes.has('titre-cache'); rappel([{ isIntersecting: true }]);
  v('le titre sort de l’écran → il monte dans l’en-tête ; il revient → il en redescend', [o.journal.observes[0] === f, cache, o.classes.has('titre-cache')], [true, true, false]);
  const barre = px(lire('min-height', 'div.hbar', HBAR().slice(0, -1), TEL(390)).val);
  v('…et il « sort » sous la barre du haut, pas sous le bord de l’écran (la marge vaut sa hauteur)', o.journal.marge, '-' + barre + 'px 0px 0px 0px');
  vrai('observerTitre est rappelée à CHAQUE rendu de vue', /observerTitre\(\)/.test(fonction('renderVue')));
}

console.log('\n2. Les titres de groupe partent sur leur colonne');
partout('dans une page : le texte du titre part du bord de la page', [...LARG_TEL.map(L => TEL(L)), ...LARG_BUREAU.map(L => BUREAU(L))], x => {
  const d = depart('div.reg-tete', PAGE().concat(['div.reg', 'div.reg-g']), x); if (d.n !== 0) return x.largeur + ' px : ' + d.n + ' px (' + d.dit + ')';
});
partout('au téléphone, il ne colle plus (sa phrase le suit, la bande couvrait le tiers de l’écran) ; au bureau, si', [...LARG_TEL.map(L => TEL(L)), ...LARG_BUREAU.map(L => BUREAU(L))], x => {
  const p = lire('position', 'div.reg-tete', PAGE().concat(['div.reg', 'div.reg-g']), x), attendu = x.largeur < 900 ? 'relative' : 'sticky';
  if (p.val !== attendu) return x.largeur + ' px : ' + p.val + ' par ' + qui(p.g);
});
partout('au téléphone, la bande ne se peint plus (ni fond, ni flou) — aussi en « moins de transparence »', [].concat(...LARG_TEL.map(L => [TEL(L), Object.assign(TEL(L), { moinsTransp: true })])), x => {
  for (const c of ['body', 'body.jour']) {
    const f = lire('background-color', 'div.reg-tete', PAGE(c).concat(['div.reg', 'div.reg-g']), x), b = lire('backdrop-filter', 'div.reg-tete', PAGE(c).concat(['div.reg', 'div.reg-g']), x);
    if (!/^rgba\(0, ?0, ?0, ?0\)$|^transparent$/.test(String(f.val).trim())) return x.largeur + ' px ' + c + (x.moinsTransp ? ' (moins de transparence)' : '') + ' : fond ' + f.val + ' par ' + qui(f.g);
    if (!x.moinsTransp && b.val !== 'none') return x.largeur + ' px : flou ' + b.val + ' par ' + qui(b.g);
  }
});
const LISTE = PAGE().concat(['div.deux.ac-deux', 'div.col-liste']);
partout('dans une liste encadrée : le titre part sur la colonne de l’en-tête de la liste', [TEL(390), TEL(768), BUREAU(1280)], x => {
  const t = depart('div.reg-tete', LISTE.concat(['div.reg', 'div.reg-g']), x), e = lire('padding-left', 'div.ac-tete', LISTE, x);
  if (t.n !== px(e.val)) return x.largeur + ' px : titre à ' + t.n + ' (' + t.dit + '), en-tête à ' + e.val + ' (' + qui(e.g) + ')';
});
partout('dans une liste encadrée, au bureau aussi, la bande ne se peint pas (elle débordait du cadre)', [TEL(390), BUREAU(1280)], x => {
  const f = lire('background-color', 'div.reg-tete', LISTE.concat(['div.reg', 'div.reg-g']), x);
  if (!/^rgba\(0, ?0, ?0, ?0\)$/.test(String(f.val))) return x.largeur + ' px : ' + f.val + ' par ' + qui(f.g);
});
const COURRIER = PAGE().concat(['div.carte', 'div.mail-rows']);
{
  const x = TEL(390), t = depart('div.reg-tete', COURRIER.concat(['div.reg', 'div.reg-g']), x);
  v('Courrier au téléphone : le titre d’un groupe suit ses lignes (16 px de retrait + le filet de 1 px)', t.n, 17);
}

console.log('\n3. Chaque texte sur sa colonne — lignes, notes, cartes');
const casTB = [TEL(390), TEL(600), BUREAU(1280)];
partout('les lignes de compte et les notes de bas de liste partent du bord (elles avaient 2 px de trop)', casTB, x => {
  for (const [c, ch] of [['div.svl-compte', PAGE()], ['div.jr-vide', PAGE()], ['div.jr-fin', PAGE()], ['div.abn-tete-code', PAGE()]]) {
    const d = depart(c, ch, x); if (d.n !== 0) return x.largeur + ' px, ' + c + ' : ' + d.n + ' (' + d.dit + ')';
  }
});
partout('« Ouvrir le journal → » : le TEXTE du lien est sur la colonne, son fond déborde comme celui d’une ligne', casTB, x => {
  const d = depart('button.ac-plus', PAGE().concat(['div.ac-aside', 'div.reg-g']), x); if (d.n !== 0) return x.largeur + ' px : ' + d.n + ' (' + d.dit + ')';
});
partout('Activité de la console : l’heure et le texte sont deux colonnes au téléphone, sur le bord partout', casTB, x => {
  const ch = PAGE().concat(['div.ac-jr']), d = depart('div', ch, x); if (d.n !== 0) return x.largeur + ' px : ' + d.n + ' (' + d.dit + ')';
  if (x.largeur < 900) { const g = lire('display', 'div', ch, x), c = lire('grid-template-columns', 'div', ch, x);
    if (g.val !== 'grid' || !/^auto minmax\(0, ?1fr\)$/.test(String(c.val))) return x.largeur + ' px : ' + g.val + ' / ' + c.val + ' par ' + qui(c.g); }
});
partout('« Le suivi » : la pastille, puis sa phrase — deux colonnes, alignées sur la première ligne', casTB, x => {
  const ch = PAGE().concat(['div.carte', 'div.expl-suivi']);
  const g = lire('display', 'div.expl-suivi', ch.slice(0, -1), x), l = lire('display', 'div.expl-l', ch, x), c = lire('grid-template-columns', 'div.expl-suivi', ch.slice(0, -1), x);
  if (g.val !== 'grid' || l.val !== 'contents' || !/^max-content minmax\(0, ?1fr\)$/.test(String(c.val))) return x.largeur + ' px : ' + g.val + ' / ' + l.val + ' / ' + c.val;
});
vrai('…et « Le suivi » est bien écrit dans ce conteneur, ses quatre pastilles dedans',
  /Le suivi<\/div><div class="expl-suivi">'\+\s*(?:'<div class="expl-l"><span class="past [^"]+">[^<]+<\/span><span>[^<]+<\/span><\/div>'\+\s*){3}'<div class="expl-l"><span class="past [^"]+">[^<]+<\/span><span>[^<]+<\/span><\/div><\/div><\/div>'/.test(CODE));
partout('Derniers paiements : la date tient sur une ligne, dans une colonne de treize signes (le nom part au même endroit)', casTB, x => {
  const ch = PAGE().concat(['div.abn-j']), b = lire('flex-basis', 'span.d', ch, x), w = lire('white-space', 'span.d', ch, x);
  if (b.val !== '13ch' || w.val !== 'nowrap') return x.largeur + ' px : ' + b.val + ' / ' + w.val + ' par ' + qui(b.g);
});
partout('au téléphone, une carte à 24 px a le même retrait que ses voisines', LARG_TEL.map(L => TEL(L)), x => {
  const a = lire('padding-left', 'div.carte.p24', PAGE(), x), b = lire('padding-left', 'div.carte', PAGE(), x);
  if (px(a.val) !== px(b.val)) return x.largeur + ' px : ' + a.val + ' (' + qui(a.g) + ') contre ' + b.val;
});
{
  const m = /'<div class="(carte[^"]*inc-tete[^"]*)">'/.exec(fonction('vueIncident')), cl = m ? m[1].split(/\s+/) : [];
  vrai('population : l’en-tête du dossier est trouvé', cl.length > 0);
  partout('le dossier d’un problème : sa carte d’en-tête a le retrait des cartes qui la suivent', [TEL(390), BUREAU(1280)], x => {
    const a = lire('padding-left', 'div.' + cl.join('.'), PAGE(), x), b = lire('padding-left', 'div.carte', PAGE(), x);
    if (px(a.val) !== px(b.val)) return x.largeur + ' px : ' + a.val + ' (' + qui(a.g) + ') contre ' + b.val;
  });
  partout('…et la barre « Suivi » part comme l’encadré « Ce que ça veut dire » posé au-dessus', [TEL(390), BUREAU(1280)], x => {
    const ch = PAGE().concat(['div.' + cl.join('.')]), a = lire('padding-left', 'div.barre-act', ch, x), b = lire('padding-left', 'div.encart.bloc', ch, x);
    if (px(a.val) !== px(b.val)) return x.largeur + ' px : barre ' + a.val + ' (' + qui(a.g) + '), encadré ' + b.val + ' (' + qui(b.g) + ')';
  });
}
partout('dans une carte, une liste sans cadre part sur la colonne de la carte, et son filet aussi', casTB, x => {
  const ch = PAGE().concat(['div.carte', 'div.reg-bloc']);
  const d = depart('div.reg-l.inerte', ch, x); if (d.n !== 0) return x.largeur + ' px : ligne à ' + d.n + ' (' + d.dit + ')';
  const f = lire('left', 'div.reg-l.inerte::before', ch, x); if (px(f.val) !== 0) return x.largeur + ' px : filet à ' + f.val + ' par ' + qui(f.g);
  const s = depart('div.item', PAGE().concat(['div.carte', 'div.sous-sec']), x); if (s.n !== 0) return x.largeur + ' px : « Son espace » à ' + s.n + ' (' + s.dit + ')';
});
/* de NUIT le cadre d'une surface reste (de jour, body.jour efface toutes les bordures) : une ligne posée sur la colonne
   de la carte ne doit toucher aucun cadre visible — mesuré le 26 septembre 2026, le texte collait au filet */
const transparent = c => /^(transparent|rgba\(0, ?0, ?0, ?0\))$/.test(String(c).trim());
partout('une liste dans une carte : ses lignes sur la colonne ne touchent aucun cadre, de jour comme de nuit', [].concat(...[TEL(390), BUREAU(1280)].map(x => ['body', 'body.jour'].map(c => ({ x, c })))), ({ x, c }) => {
  const ch = PAGE(c).concat(['div.carte']), w = lire('border-left-width', 'div.reg-bloc', ch, x), col = lire('border-left-color', 'div.reg-bloc', ch, x);
  const cadre = px(w.val) > 0 && !transparent(col.val), retrait = px(lire('padding-left', 'div.reg-l.inerte', ch.concat(['div.reg-bloc']), x).val);
  if (cadre && retrait < 8) return x.largeur + ' px, ' + (c === 'body' ? 'nuit' : 'jour') + ' : cadre ' + w.val + ' ' + col.val + ' (' + qui(w.g) + ') et lignes à ' + retrait + ' px';
});
partout('« Ce qui se passe chez eux » : le CHIFFRE est sur la colonne, le fond de son bouton déborde', casTB, x => {
  const r = lire('margin-left', 'div.dsr-rang', PAGE().concat(['div.carte']), x), p = lire('padding-left', 'button.dsr-p', PAGE().concat(['div.carte', 'div.dsr-rang']), x);
  if (px(r.val) + px(p.val) !== 0) return x.largeur + ' px : rangée ' + r.val + ' (' + qui(r.g) + ') + bouton ' + p.val + ' (' + qui(p.g) + ')';
});
partout('« En un coup d’œil » : le filet entre deux lignes part sous leur texte', casTB, x => {
  const ch = PAGE().concat(['div.ac-aside', 'div.reg-bloc']), f = lire('left', 'div.reg-l::before', ch, x), p = lire('padding-left', 'div.reg-l', ch, x);
  if (px(f.val) !== px(p.val)) return x.largeur + ' px : filet à ' + f.val + ' (' + qui(f.g) + '), texte à ' + p.val + ' (' + qui(p.g) + ')';
});
partout('« libellé : valeur » : au téléphone étroit le libellé passe au-dessus, au bureau ils restent côte à côte', [TEL(360), TEL(390), TEL(430), TEL(600), BUREAU(1280)], x => {
  const c = lire('grid-template-columns', 'div', PAGE().concat(['div.kv']), x), une = /^minmax\(0, ?1fr\)$/.test(String(c.val));
  if (une !== (x.largeur <= 600)) return x.largeur + ' px : ' + c.val + ' par ' + qui(c.g);
});
partout('Journal, au doigt : la pastille et l’heure partent sous le TEXTE (icône + écart), pas sous l’icône', [TEL(360), TEL(390), TEL(600)], x => {
  const ch = PAGE().concat(['div.reg-l.inerte.jr-l']), f = lire('padding-left', 'div.reg-fin', ch, x);
  const ic = lire('width', 'span.jr-ic', ch, x), gap = lire('column-gap', 'div.reg-l.inerte.jr-l', PAGE(), x);
  if (px(f.val) !== px(ic.val) + px(gap.val)) return x.largeur + ' px : ' + f.val + ' (' + qui(f.g) + ') contre icône ' + ic.val + ' + écart ' + gap.val;
});
vrai('…et les lignes du Journal portent bien cette classe (les deux fabriques)', /'<div class="reg-l inerte ko jr-l">/.test(CODE) && /'<div class="reg-l inerte jr-l">/.test(CODE));
partout('Équipe : les gestes partent sur la colonne du nom (avatar + écart), au téléphone deux par rangée', [TEL(360), TEL(390), TEL(430), TEL(768), BUREAU(1280)], x => {
  const ch = PAGE().concat(['div.carte', 'div.reg-bloc', 'div.reg-l.eqp-l']);
  const f = lire('padding-left', 'div.reg-fin', ch, x), av = lire('width', 'div.reg-av', ch, x), gap = lire('column-gap', 'div.reg-l.eqp-l', ch.slice(0, -1), x);
  if (px(f.val) !== px(av.val) + px(gap.val)) return x.largeur + ' px : ' + f.val + ' (' + qui(f.g) + ') contre avatar ' + av.val + ' + écart ' + gap.val + ' (' + qui(gap.g) + ')';
  if (x.largeur >= 900) return;
  const g = lire('display', 'div.eqp-actions', ch.concat(['div.reg-fin']), x), c = lire('grid-template-columns', 'div.eqp-actions', ch.concat(['div.reg-fin']), x);
  if (g.val !== 'grid' || c.val !== '1fr 1fr') return x.largeur + ' px : ' + g.val + ' / ' + c.val + ' par ' + qui(c.g);
});

console.log('\n4. Les menus déroulants ont leur chevron, à toutes les largeurs et dans tous les états');
const casMenus = [].concat(...[TEL(360), TEL(390), TEL(768), TEL(899), BUREAU(900), BUREAU(901), BUREAU(1280)].map(x =>
  [[], ['hover'], ['focus', 'focus-visible']].map(e => ({ x, e }))));
partout('le chevron gagne sur tous les raccourcis « background: » qui visent un menu', casMenus, ({ x, e }) => {
  for (const cible of ['select.sel-f', 'select.sel-f.large'])
    for (const ch of [PAGE(), PAGE('body.jour'), PAGE().concat(['div.filtres.svl-filtres'])]) {
      const c = cible + e.map(s => ':' + s).join(''), g = lire('background-image', c, ch, x);
      if (!/var\(--chevron\)/.test(String(g.val))) return x.largeur + ' px ' + (e.join('+') || 'au repos') + ' : ' + qui(g.g) + ' pose « ' + g.val + ' »';
    }
});
partout('…posé à droite, centré, une seule fois', casMenus, ({ x, e }) => {
  const c = 'select.sel-f' + e.map(s => ':' + s).join(''), p = lire('background-position', c, PAGE(), x), r = lire('background-repeat', c, PAGE(), x);
  if (!/(^|\s)right \d+px center(\s|$)/.test(String(p.val))) return x.largeur + ' px : position « ' + p.val + ' » par ' + qui(p.g);
  if (!/no-repeat/.test(String(r.val))) return x.largeur + ' px : répétition « ' + r.val + ' » par ' + qui(r.g);
});
vrai('le menu « Toutes les applications » est un menu LARGE (le libellé était coupé au téléphone)',
  /<select class="sel-f large" onchange="incF\(\\'app\\',this\.value\)">/.test(CODE));

console.log('\n5. La typographie française : on ne coupe plus avant « : ; ! ? » · — », ni après « «, ni entre un nombre et « € % »');
const TYPO = (() => { const ctx = {}; executer(ligne('var TYPO_RX=') + '\n' + fonction('typoTexte') + '\nthis.T=typoTexte; this.RX=TYPO_RX;', ctx); return ctx; })()
vrai('population : typoTexte et son filtre sont extraits', typeof TYPO.T === 'function' && typeof (TYPO.RX && TYPO.RX.test) === 'function');
if (typeof TYPO.T !== 'function') TYPO.T = () => '(typoTexte absente)'; if (!TYPO.RX || typeof TYPO.RX.test !== 'function') TYPO.RX = { test: () => false };
const NB = ' ';
const PAIRES = [['« ignoré »', '«' + NB + 'ignoré' + NB + '»'], ['Support · Surveillance', 'Support' + NB + '· Surveillance'], ['réglé — un e-mail', 'réglé' + NB + '— un e-mail'],
  ['Suivi : fait', 'Suivi' + NB + ': fait'], ['Vraiment ?', 'Vraiment' + NB + '?'], ['Stop !', 'Stop' + NB + '!'], ['a ; b', 'a' + NB + '; b'],
  ['12 €', '12' + NB + '€'], ['45 %', '45' + NB + '%'], ['1 200 € et 3 %', '1 200' + NB + '€ et 3' + NB + '%']];
v('chaque espace fautive devient insécable', PAIRES.map(p => TYPO.T(p[0])), PAIRES.map(p => p[1]));
const INTACTS = ['https://teamop.fr/tour.html', '22:37', 'v2.68', 'a:b', 'nom@exemple.fr', 'Rien à signaler', 'x?y=1', 'un tiret - simple', ''];
v('…et rien d’autre ne bouge (une adresse, une heure, une version, une URL)', INTACTS.map(s => TYPO.T(s)), INTACTS);
v('une seconde passe ne change rien (le rendu repasse sur ce qui est déjà corrigé)', PAIRES.map(p => TYPO.T(TYPO.T(p[0]))), PAIRES.map(p => p[1]));
v('le filtre ne laisse passer AUCUN texte qui avait besoin d’être corrigé', PAIRES.filter(p => !TYPO.RX.test(p[0])).map(p => p[0]), []);
/* typoFr, exécutée sur un faux document : jamais dans du code, un champ, une zone éditable */
{
  const txt = (data, parent) => ({ nodeType: 3, data, parentElement: parent });
  const el = (tag, attrs, parent) => ({ nodeType: 1, tagName: tag.toUpperCase(), attrs: attrs || {}, parentElement: parent || null,
    closest(s) { for (let e = this; e; e = e.parentElement) if (s.split(',').some(q => q.trim() === '[contenteditable]' ? 'contenteditable' in e.attrs : e.tagName === q.trim().toUpperCase())) return e; return null; } });
  const racine = el('div'), code = el('code', {}, racine), champ = el('textarea', {}, racine), edit = el('div', { contenteditable: '' }, racine), p = el('p', {}, racine);
  const textes = [txt('Suivi : fait', p), txt('Suivi : fait', code), txt('Suivi : fait', champ), txt('Suivi : fait', edit), txt('Rien', p)];
  const ctx = { document: { createTreeWalker: () => { let i = 0; return { nextNode: () => textes[i++] || null }; } }, NodeFilter: { SHOW_TEXT: 4 } };
  racine.ownerDocument = ctx.document;
  executer(ligne('var TYPO_RX=') + '\n' + fonction('typoTexte') + '\n' + fonction('typoFr') + '\ntypoFr(R);', Object.assign(ctx, { R: racine }));
  v('typoFr : le texte de la page est corrigé, pas le code, ni un champ, ni une zone éditable', textes.map(t => t.data),
    ['Suivi' + NB + ': fait', 'Suivi : fait', 'Suivi : fait', 'Suivi : fait', 'Rien']);
}
vrai('…et elle passe sur tout ce que la PAGE ajoute — toasts, panneaux et titre de l’en-tête vivent hors de #vue (relecture)',
  /new MutationObserver\(function\(ms\)\{[^]*?typoFr\(x\.nodeType===3\?x\.parentNode:x\);[^]*?\.observe\(v,\{childList:true,subtree:true\}\)/.test(CODE)
  && /\(function\(\)\{ var v=document\.body; if\(!v\|\|typeof MutationObserver!=='function'\) return;/.test(CODE));
vrai('la mémoire des groupes pliés ne dépend pas du moment où la typographie passe (la clé ignore les insécables)',
  /var cle=APP\+'\/'\+TAB\+'\/'\+nom\.replace\(\/\\u00A0\/g,' '\)\.trim\(\);/.test(fonction('regPliage')));
vrai('⛔ l’observateur ne regarde pas characterData : corriger un texte ne le fait pas repasser (pas de boucle)',
  !/observe\(v,\{[^}]*characterData/.test(CODE));

console.log('\n6. Les phrases : de vrais accords, une majuscule en tête');
const NMOT = (() => { const ctx = {}; executer(ligne('function nMot(') + '\nthis.f=nMot;', ctx); return typeof ctx.f === 'function' ? ctx.f : () => '(nMot absente)'; })();
v('nMot : zéro et un au singulier, le reste au pluriel, un vide vaut zéro', [0, 1, 2, 12, undefined, '3'].map(n => NMOT(n, 'problème', 'problèmes')),
  ['0 problème', '1 problème', '2 problèmes', '12 problèmes', '0 problème', '3 problèmes']);
/* plus un seul « mot(s) » dans une chaîne de la page : les chaînes sont relevées une à une (hors expressions régulières) */
function chaines(js) {
  const out = []; let i = 0, prec = '';
  while (i < js.length) {
    const c = js[i];
    if (c === '/' && js[i + 1] === '/') { i = js.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && js[i + 1] === '*') { i = js.indexOf('*/', i) + 2; continue; }
    if (c === "'" || c === '"' || c === '`') {
      let j = i + 1, s = '';
      while (j < js.length && js[j] !== c) {
        if (js[j] === '\\') { const e = js[j + 1], u = /^u[0-9a-fA-F]{4}/.test(js.slice(j + 1, j + 6));
          s += u ? String.fromCharCode(parseInt(js.slice(j + 2, j + 6), 16)) : ({ n: '\n', t: '\t', r: '\r' }[e] ?? e); j += u ? 6 : 2; continue; }
        s += js[j++]; }
      out.push(s); i = j + 1; prec = c; continue;
    }
    if (c === '/' && /[(,=:[!&|?{};+\-*%<>~^]$|^$|\breturn$|\btypeof$/.test(prec)) {
      let j = i + 1, cl = false; while (j < js.length && (js[j] !== '/' || cl)) { if (js[j] === '\\') j++; else if (js[j] === '[') cl = true; else if (js[j] === ']') cl = false; j++; }
      i = j + 1; prec = 'x'; continue;
    }
    if (!/\s/.test(c)) prec = /[\w$]/.test(c) ? (/[\w$]/.test(prec.slice(-1)) ? prec + c : c) : c;
    i++;
  }
  return out;
}
const SCRIPTS = [...SRC.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n');
const CH = chaines(SCRIPTS);
vrai('population : les chaînes de la page sont relevées (plus de 3 000)', CH.length > 3000, CH.length);
vrai('…et le relevé tient la route : on y trouve des phrases qu’on sait écrites', ['Remettre Surveillance à zéro ?\n\n', ' problèmes passent', 'Rien à classer'].every(s => CH.includes(s)));
v('⛔ plus aucun « mot(s) » : chaque nombre est accordé (nMot, ou un test du nombre)', CH.filter(s => /[a-zàâäéèêëîïôöùûüç]\((?:s|e|es|x)\)/i.test(s)).slice(0, 5), []);
v('…ni dans le HTML de la page', ((SRC.replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<!--[\s\S]*?-->/g, '')).match(/[a-zàâäéèêëîïôöùûüç]\((?:s|e|es|x)\)/gi) || []), []);
/* la remise à zéro : la question, exécutée */
function remise(cnt, apps, repondre) {
  const vu = { confirm: null, toast: null, post: 0 };
  const ctx = { INC: { cnt }, MYAPPS: apps, confirm: t => { vu.confirm = t; return repondre; }, toast: t => { vu.toast = t; },
    apiPost: () => { vu.post++; return { then: () => ({ catch: () => {} }) }; }, alert: () => {}, JR: { actions: [] }, MYNOM: 'x', chargerIncidents: () => {} };
  executer(ligne('function nMot(') + '\n' + fonction('incToutIgnorer') + '\nincToutIgnorer();', ctx);
  return vu;
}
{
  const un = remise({ nouveau: 1 }, ['gestion'], false), trois = remise({ nouveau: 2, encours: 1 }, ['gestion', 'messages'], false), rien = remise({}, ['gestion'], true), oui = remise({ nouveau: 1 }, ['gestion'], true);
  vrai('remise à zéro, un problème : « 1 problème passe », sans parler de deux consoles', /\n1 problème passe en « ignoré »\./.test(un.confirm) && !/deux consoles/.test(un.confirm), un.confirm);
  vrai('…trois, sur un compte à deux consoles : « 3 problèmes passent », et la question dit que les DEUX consoles sont touchées',
    /\n3 problèmes passent en « ignoré », dans les deux consoles \(OP GESTION et OP MESSAGES\)\./.test(trois.confirm), trois.confirm);
  v('…rien à classer : ni question, ni envoi ; « non » : rien d’envoyé ; « oui » : un envoi', [rien.confirm, rien.toast, rien.post, un.post, oui.post], [null, 'Rien à classer', 0, 0, 1]);
}
/* le bouton et sa phrase, évalués */
{
  const expr = (() => { const i = CODE.indexOf('var zeroBtn='), j = CODE.indexOf(": '';", i); return i < 0 || j < 0 ? '' : CODE.slice(i, j + 5); })();
  vrai('population : le bouton de remise à zéro est trouvé', expr.length > 100);
  const rendu = (n, apps) => { const ctx = { _aClasser: n, MYAPPS: apps }; executer(expr + '\nthis.h=zeroBtn;', ctx);
    return String(ctx.h).replace(/<[^>]+>/g, '|').split('|').map(s => s.trim()).filter(Boolean); };
  const a = rendu(1, ['gestion']), b = rendu(4, ['gestion', 'messages']);
  v('le bouton compte juste, au singulier comme au pluriel', [a[0], b[0]], ['↺ Tout remettre à zéro — 1 problème', '↺ Tout remettre à zéro — 4 problèmes']);
  vrai('…et sa phrase commence par une MAJUSCULE (au téléphone elle passe seule sous le bouton)', /^[A-ZÀ-Ý]/.test(a[1]) && /^[A-ZÀ-Ý]/.test(b[1]), a[1] + ' / ' + b[1]);
  vrai('…qui dit, sur un compte à deux consoles, que les deux sont touchées', /^Dans les deux consoles/.test(b[1]) && !/deux consoles/.test(a[1]));
  v('aucun bouton quand il n’y a rien à classer', rendu(0, ['gestion']), []);
}
/* « Ce qui se passe chez eux » : la phrase des problèmes ouverts */
{
  const l = ligne("var bugs='<div class=\"act-bugs\">'");
  vrai('population : la phrase des problèmes ouverts est trouvée', l.length > 50);
  const rendu = n => { const ctx = { d: { bugs: n } }; executer(l + '\nthis.h=bugs;', ctx); return String(ctx.h).replace(/<button[\s\S]*?<\/button>/g, '[bouton]').replace(/<[^>]+>/g, ''); };
  v('un vrai pluriel, et la phrase finit AVANT le bouton (plus de tiret orphelin en fin de ligne)', [rendu(1), rendu(3)],
    ['🐛 1 problème ouvert, signalé par leur application. [bouton]', '🐛 3 problèmes ouverts, signalés par leur application. [bouton]']);
  v('…et sans problème, une phrase qui le dit', rendu(0), '✅ Aucun problème ouvert signalé par leur application');
}

console.log('\n7. Ce que la relecture a trouvé en chemin');
{
  const f = fonction('rafraichirSiConcerne'); vrai('population : rafraichirSiConcerne est extraite', /function rafraichirSiConcerne\(\)/.test(f));
  const joue = tab => { const vu = { rendus: 0, jete: '' };
    const ctx = { TAB: tab, render: () => { vu.rendus++; }, renderVue: v => { if (typeof v === 'string') { vu.jete = 'renderVue(« ' + v + ' »)'; throw new TypeError('v.classList'); } vu.rendus++; } };
    executer(f + '\nrafraichirSiConcerne();', ctx); return vu.rendus + (vu.jete ? ' — ' + vu.jete : ''); };
  v('l’écran Accès se redessine quand ses données changent (renderVue recevait un texte, l’exception était avalée)',
    ['essais', 'entreprises', 'abonnements', 'accueil', 'journal'].map(joue), ['1', '1', '1', '1', '0']);
}
vrai('la note des copies de sauvegarde ne promet plus « la v621 » (toute la flotte est bien au-delà)',
  CH.some(s => /aucune encore \(elles se font toutes seules, au plus une par demi-heure et par appareil\)/.test(s)) && !CH.some(s => /arrivent avec la v\d/.test(s)));

console.log('\n══ test-830 : ' + ok + ' ✓ ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
