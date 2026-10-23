/* ══ test-2846 · UNE SEULE FAMILLE : LA POLICE DU SYSTÈME, ET PLUS AUCUNE POLICE TÉLÉCHARGÉE ═══════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 25. Le socle impose la police du système (« c'est elle qui fait Apple »), mais
   Space Mono restait appliquée au journal des mouvements de stock (quantité, heure), à l'heure de la liste du planning, aux
   montants des barres de Statistiques, au clavier du code, aux dates du planning, à l'avatar à initiales — une police de
   machine à écrire au milieu d'une interface en SF, deux hauteurs d'x sur une même ligne. Et la page demandait à Google Fonts,
   en bloquant son affichage, trois familles (Space Mono, Archivo, DM Sans) : la requête part chez Google avec l'adresse de
   l'appareil, et en cave ou en sous-sol l'écran attend une feuille qu'il n'utilise presque plus.
   Ce banc relit la page SANS ses commentaires (aucune de ces polices, aucun lien vers Google Fonts), REJOUE LA CASCADE pour
   chaque élément qui les portait (la famille qui gagne, et les chiffres tabulaires là où des nombres s'alignent), puis EXÉCUTE
   makeAvatar avec un canevas simulé. La preuve dans la page (aucun élément rendu dans ces polices, aucune requête vers
   Google) : scratchpad/sonde-polices.js.                                                                                   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

console.log('\n── 2846 · 1. plus rien de téléchargé ──');
vrai('aucun lien vers Google Fonts (fonts.googleapis / fonts.gstatic) dans la page', !/fonts\.(googleapis|gstatic)\.com/.test(CODE));
const POLICES = /Space[ +]Mono|['"]Archivo['"]|font-family:\s*Archivo|DM[ +]Sans/g;
const restes = [...CODE.matchAll(POLICES)].map(m => CODE.slice(Math.max(0, m.index - 50), m.index + 30).replace(/\s+/g, ' '));
vrai('plus aucune règle, aucun style en ligne, aucun canevas en Space Mono, Archivo ou DM Sans', !restes.length, restes.slice(0, 4));
vrai('(contre-mesure) le motif sait les voir : il trouve « Space Mono » dans une ligne écrite pour lui', (`x{font-family:'Space Mono',monospace}`.match(POLICES) || []).length === 1 && !('Archivos mensuales'.match(POLICES)));

console.log('\n── 2846 · 2. ce qui les portait prend la police du système (la cascade rejouée) ──');
const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
const ATTR = /\[([\w-]+)\s*([~|^$*]?=)\s*(?:"((?:[^"\\]|\\.)*)"|'((?:[^'\\]|\\.)*)'|([^\]\s]*))\s*\]/g;
const entier = (x) => { let a = 0, b = 0; for (const c of x) { if (c === '[') a++; else if (c === ']') a--; else if (c === '(') b++; else if (c === ')') b--; if (a < 0 || b < 0) return false; } return !a && !b; };
const tenus = (sel, ch) => [...sel.replace(/:not\((?:[^()]|\([^()]*\))*\)/g, '').matchAll(ATTR)].every(m => { const v = m[3] !== undefined ? m[3] : m[4] !== undefined ? m[4] : m[5];
  return ch.some(e => { const x = (e.attrs || {})[m[1]]; if (x === undefined) return false; return m[2] === '=' ? x === v : m[2] === '^=' ? x.startsWith(v) : m[2] === '$=' ? x.endsWith(v) : m[2] === '*=' ? x.includes(v) : true; }); });
const juge = (m, w) => !/prefers-|hover:\s*none|\bprint\b/.test(m.toLowerCase()) && C.mediaVrai(m, w);
const gg = (ch, prop) => { const g = C.gagnant(TOUT.filter(r => entier(r.sel) && tenus(r.sel, ch)), ch, 390, prop, undefined, juge); return g ? g.v.replace(/\s*!important\s*$/, '').trim() : null; };
const html = { tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': 'light', 'data-marque': 'teamop', 'data-verre': '1', lang: 'fr' } }, body = { tag: 'body', classes: [], attrs: {} };
const el = (tag, cl, parents) => [html, body].concat(parents || []).concat([{ tag, classes: cl, attrs: {} }]);
const CAS = [
  ['l’heure de la liste du planning (.pl-time)', el('div', ['pl-time']), true],
  ['les montants des barres de Statistiques (.bar-val)', el('div', ['bar-val']), true],
  ['le clavier du code (.pin-key)', el('button', ['pin-key']), true],
  ['les dates du planning (.planning-date)', el('div', ['planning-date']), false],
  ['la pastille de la marque (.brand-icon)', el('div', ['brand-icon']), false],
  ['les chiffres clés (.kpi-val)', el('div', ['kpi-val']), false],
  ['le titre d’une fenêtre (.modal-head h3)', el('h3', [], [{ tag: 'div', classes: ['modal-head'], attrs: {} }]), false],
  ['le titre de connexion (.login-box h2)', el('h2', [], [{ tag: 'div', classes: ['login-box'], attrs: {} }]), false],
  ['le corps de la page', [html, body], false],
  ['les boutons (.btn)', el('button', ['btn']), false],
  ['les étiquettes du menu (.nav-label)', el('div', ['nav-label']), false],
];
for (const [nom, ch, tab] of CAS) {
  const f = gg(ch, 'font-family');
  vrai(nom + ' : la police du système (var(--fs))', f === 'var(--fs)', f);
  if (tab) { const n = gg(ch, 'font-variant-numeric'); vrai(nom + ' : … et ses chiffres sont tabulaires (une colonne de nombres ne tremble pas)', n === 'tabular-nums', n); }
}
{ const f = gg(el('span', ['mono']), 'font-family'); vrai('.mono garde la chasse fixe du système (var(--mono)), pas Space Mono', f === 'var(--mono)', f); }

console.log('\n── 2846 · 3. les styles écrits en ligne ──');
{ const i = CODE.indexOf("${e?'＋':'−'}${m.qte}"), bloc = i > 0 ? CODE.slice(i - 400, i + 900) : '';
  vrai('(population) le journal des mouvements de stock est trouvé', i > 0);
  vrai('la quantité et l’heure d’un mouvement : chiffres tabulaires, dans la police de la ligne', (bloc.match(/font-variant-numeric:tabular-nums/g) || []).length >= 2, (bloc.match(/font-variant-numeric:tabular-nums/g) || []).length); }

console.log('\n── 2846 · 4. l’avatar à initiales (un canevas ne lit pas var()) ──');
{ const m = /\nfunction makeAvatar\(quiet\)\{[\s\S]*?\n  if\(!quiet\)[^\n]*\n/.exec(CODE);
  vrai('(population) makeAvatar est trouvée', !!m);
  const essai = (fsVal) => { const J = { font: null };
    const g = { createLinearGradient: () => ({ addColorStop() {} }), fillRect() {}, strokeRect() {}, fillText() {}, set font(v) { J.font = v; }, get font() { return J.font; } };
    const ctx = { document: { createElement: () => ({ getContext: () => g, toDataURL: () => 'data:' }), documentElement: {} }, currentUser: { prenom: 'Léa', nom: 'Roux' },
      getComputedStyle: () => ({ getPropertyValue: (k) => k === '--fs' ? fsVal : '' }), accentDark: () => '#000', accentHex: () => '#111', initials: () => 'LR', fullName: () => 'Léa Roux',
      closeModal() {}, setProfilePhoto() {} };
    vm.createContext(ctx); try { vm.runInContext((m ? m[0] : '') + '\nmakeAvatar(true);', ctx); } catch (e) { J.err = e.message; } return J; };
  const a = essai(' -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",system-ui,sans-serif');
  vrai('les initiales sont dessinées dans la police du système de la plateforme (le jeton --fs résolu)', !a.err && a.font === '700 100px -apple-system,BlinkMacSystemFont,"SF Pro Text","Helvetica Neue",system-ui,sans-serif', a.err || a.font);
  const b = essai('');
  vrai('… et sans jeton lisible, la police du système quand même (jamais la police par défaut de 10 px du canevas)', !b.err && b.font === '700 100px system-ui,sans-serif', b.err || b.font); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
