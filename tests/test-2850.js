/* ══ test-2850 · UN CHAMP QUI MANQUE SE DÉSIGNE ════════════════════════════════════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 33. Une validation disait « Date et heure obligatoires » dans un toast posé en bas
   de l'écran, que le clavier ouvert recouvre, et le formulaire restait tel quel : rien ne disait QUEL champ manquait.
   champManque(message, champs…) marque les champs (aria-invalid, bord rouge), écrit le message juste sous le premier (relié par
   aria-describedby), l'amène au centre et lui donne le focus ; la première frappe efface la marque.
   Ce banc EXÉCUTE champManque extraite d'app.html dans un document simulé, recense TOUTES ses utilisations (chaque champ nommé
   existe dans la page), vérifie qu'aucune de ces validations ne retombe sur le toast seul, et rejoue la cascade du style. La
   preuve dans la page (formulaires réels, au doigt, jour et nuit) : scratchpad/sonde-champ-manque.js.                       */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const C = require('./outils-cascade-app.js');
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
console.log('\n── 2850 · 1. champManque, exécutée ──');
const F = fonction('champManque');
vrai('(population) champManque est trouvée, une seule fois', F.length > 300 && (CODE.match(/\nfunction champManque\(/g) || []).length === 1, F.length);
function monde() {
  const J = { toasts: [], insere: [], focus: null, defile: null };
  function el(nom, attrs) {
    const a = Object.assign({}, attrs || {}), L = {};
    const e = { nodeType: 1, nom, isConnected: true, a, L,
      setAttribute: (k, v) => { a[k] = String(v); }, getAttribute: (k) => (k in a ? a[k] : null), removeAttribute: (k) => { delete a[k]; },
      addEventListener: (t, f) => { (L[t] = L[t] || []).push(f); }, removeEventListener: (t, f) => { L[t] = (L[t] || []).filter(x => x !== f); },
      insertAdjacentElement: (pos, n) => { J.insere.push({ apres: nom, pos, n }); n.isConnected = true; n.remove = () => { n.isConnected = false; J.insere = J.insere.filter(x => x.n !== n); }; },
      scrollIntoView: (o) => { J.defile = { nom, o }; }, focus: (o) => { J.focus = { nom, o }; },
      tape: () => (L.input || []).slice().forEach(f => f({})) };
    return e;
  }
  const ctx = { document: { createElement: () => ({ className: '', id: '', textContent: '', isConnected: false }) }, Math, Date, String, console,
    toast: (m, ms, g) => J.toasts.push([m, g]), defilDoux: () => 'smooth' };
  vm.createContext(ctx); try { vm.runInContext(F, ctx); } catch (e) { J.err = e.message; }
  return { ctx, J, el };
}
{ const M = monde(); vrai('le code s’exécute', !M.J.err, M.J.err);
  const date = M.el('date', { 'aria-describedby': 'aide-date' }), heure = M.el('heure');
  const r = M.ctx.champManque('Date et heure obligatoires', false, date, null, heure);   // un « faux » en tête : le message va sous le premier VRAI champ
  vrai('les champs reçus sont marqués aria-invalid ; les « faux » (false, null) ignorés', date.a['aria-invalid'] === 'true' && heure.a['aria-invalid'] === 'true' && r === false);
  const n = M.J.insere[0] && M.J.insere[0].n;
  vrai('le message est écrit JUSTE SOUS le premier champ, une seule fois', M.J.insere.length === 1 && M.J.insere[0].apres === 'date' && M.J.insere[0].pos === 'afterend' && n.textContent === 'Date et heure obligatoires' && n.className === 'champ-manque-note', M.J.insere.map(x => [x.apres, x.pos]));
  vrai('… relié au champ par aria-describedby, sans perdre la description qu’il avait', date.a['aria-describedby'] === 'aide-date ' + n.id && /^mq-/.test(n.id), date.a['aria-describedby']);
  vrai('le premier champ vient au centre de l’écran (défilement doux, ou sec sous « réduire les animations »), puis prend le focus sans redéfiler', M.J.defile && M.J.defile.nom === 'date' && M.J.defile.o.block === 'center' && M.J.focus && M.J.focus.nom === 'date' && M.J.focus.o.preventScroll === true, [M.J.defile, M.J.focus]);
  vrai('le toast annonce le refus (habillé en erreur, assertif)', M.J.toasts.length === 1 && M.J.toasts[0][1] === 'erreur', M.J.toasts);
  M.ctx.champManque('Date et heure obligatoires', date, heure);
  vrai('une seconde tentative ne double ni le message ni les écouteurs', M.J.insere.length === 1 && (date.L.input || []).length === 1, [M.J.insere.length, (date.L.input || []).length]);
  date.tape();
  vrai('la première frappe dans un champ efface SA marque et son message, et rend sa description d’origine', !('aria-invalid' in date.a) && M.J.insere.length === 0 && date.a['aria-describedby'] === 'aide-date' && !(date.L.input || []).length, [date.a, M.J.insere.length]);
  vrai('… l’autre champ reste marqué tant qu’on ne l’a pas rempli', heure.a['aria-invalid'] === 'true'); }
{ const M = monde();
  /* un champ CACHÉ (la période d'une absence) : on désigne le contrôle visible de son .field (le bouton « Période ») */
  const bouton = M.el('periode'); bouton.tagName = 'BUTTON';
  const cache = M.el('du'); cache.type = 'hidden'; cache.closest = (q) => q === '.field' ? { querySelector: (sel) => /button/.test(sel) ? bouton : null } : null;
  M.ctx.champManque('Personne et dates requises', false, cache);
  vrai('un champ caché : la marque, le message et le focus vont au contrôle visible de son champ (le bouton « Période »)', bouton.a['aria-invalid'] === 'true' && !('aria-invalid' in cache.a) && M.J.insere[0] && M.J.insere[0].apres === 'periode' && M.J.focus && M.J.focus.nom === 'periode', [bouton.a, cache.a, M.J.focus]);
  (bouton.L.click || []).slice().forEach(f => f({}));
  vrai('… et toucher ce bouton (on y répond) efface la marque', !('aria-invalid' in bouton.a) && !M.J.insere.length); }
{ const M = monde(); M.ctx.champManque('Indique un client');
  vrai('sans champ (le formulaire n’en a pas), le toast seul : rien ne jette', !M.J.err && M.J.toasts.length === 1 && !M.J.insere.length); }

console.log('\n── 2850 · 2. toutes les validations désignent leur champ ──');
const APPELS = [...CODE.matchAll(/champManque\('((?:[^'\\]|\\.)*)'((?:,[^;]*?)?)\);/g)].map(m => ({ msg: m[1], args: m[2] || '' }));
vrai('(population) au moins 25 validations passent par champManque', APPELS.length >= 25, APPELS.length);
const ids = APPELS.flatMap(a => [...a.args.matchAll(/\$\('([\w-]+)'\)/g)].map(m => m[1]));
const noms = APPELS.flatMap(a => [...a.args.matchAll(/champDe\(\w+(?:\.target)?,'(\w+)'\)/g)].map(m => m[1]));
const idsAbsents = [...new Set(ids)].filter(i => CODE.indexOf('id="' + i + '"') < 0);
/* un champ fabriqué par l'aide `inp(nom, libellé, …)` d'un formulaire (la fiche fluides) : son nom n'est pas écrit en clair — il compte s'il est APPELÉ
   ainsi ET que l'aide écrit bien `name="${n}"` (lue dans le code, pas supposée) */
const AIDE_INP = /const inp=\(n,[^=]*=>`[^`]*<input name="\$\{n\}"/.test(CODE);
const nomsAbsents = [...new Set(noms)].filter(n => CODE.indexOf('name="' + n + '"') < 0 && !(AIDE_INP && CODE.indexOf("inp('" + n + "',") >= 0));
vrai('chaque champ désigné par son identifiant existe dans la page (' + new Set(ids).size + ')', ids.length > 10 && !idsAbsents.length, idsAbsents);
vrai('chaque champ désigné par son nom de formulaire existe dans la page (' + new Set(noms).size + ')', noms.length > 10 && !nomsAbsents.length, nomsAbsents);
vrai('chaque appel désigne au moins un champ', APPELS.every(a => /\$\(|champDe\(|,sel\b/.test(a.args)), APPELS.filter(a => !/\$\(|champDe\(|,sel\b/.test(a.args)).map(a => a.msg));
const ANCIENS = ['Date et heure obligatoires', 'Technicien, date et heures obligatoires', 'Le titre de la tâche est obligatoire', 'Personne et dates requises', 'Indique un client',
  'Remplis tous les champs : le prénom et le nom sont obligatoires', 'La date est obligatoire', 'Le prénom et le nom du conducteur sont obligatoires', 'Indique le mot de passe de la boîte',
  'Indique les deux dates', 'Indique le montant encaissé', 'Mot de passe provisoire obligatoire (8 caractères minimum)', 'Indique un montant supérieur à 0 €'];
const restes = ANCIENS.filter(m => CODE.indexOf("toast('" + m + "'") >= 0);
vrai('aucune de ces validations ne retombe sur le toast seul', !restes.length, restes);

console.log('\n── 2850 · 2 bis. la garde générale (un champ requis fait d’espaces) désigne son champ aussi ──');
{ const SG = fonction('saisieGardeInstaller');
  vrai('(population) la garde des champs requis est trouvée', SG.length > 400, SG.length);
  const appels = [], toasts = [], ecouteurs = [];
  const el = { tagName: 'INPUT', type: 'text', name: 'nom', value: '     ', required: true, disabled: false, focus() { el.focused = true; }, select() { el.selected = true; },
    getAttribute: (a) => a === 'name' ? 'nom' : null, closest: (q) => q === '.field' ? { querySelector: () => ({ textContent: 'Nom' }) } : null };
  const doc = { addEventListener: (t, f, cap) => ecouteurs.push({ t, f, cap }) };
  let err = null; try { new Function('toast', 'champManque', SG + '\nsaisieGardeInstaller(arguments[2]);')((m) => toasts.push(m), (m, ...c) => appels.push([m, c]), doc); } catch (e) { err = e.message; }
  const form = { querySelectorAll: (q) => q === 'input[required],textarea[required]' ? [el] : [] }, ev = { target: form, preventDefault() { ev.bloque = true; }, stopImmediatePropagation() { ev.arrete = true; } };
  ecouteurs.filter(l => l.t === 'submit').forEach(l => l.f(ev));
  vrai('un nom fait d’espaces : l’envoi est arrêté', !err && ev.bloque && ev.arrete, err);
  vrai('… et le champ est désigné par champManque (pas seulement un toast)', appels.length === 1 && appels[0][0] === 'Le champ « Nom » est obligatoire' && appels[0][1][0] === el && toasts.length === 0, [appels.map(a => a[0]), toasts]);
  vrai('… ses espaces sont sélectionnés, prêts à être remplacés', el.selected === true);
  /* deux champs faits d'espaces : les DEUX désignés d'un coup, le message les nomme */
  const mk = (nom, lib) => ({ tagName: 'INPUT', type: 'text', name: nom, value: '   ', required: true, disabled: false, focus() {}, select() {}, getAttribute: (a) => a === 'name' ? nom : null, closest: (q) => q === '.field' ? { querySelector: () => ({ textContent: lib }) } : null });
  const p = mk('prenom', 'Prénom *'), n = mk('nom', 'Nom *'); appels.length = 0;
  const f2 = { querySelectorAll: (q) => q === 'input[required],textarea[required]' ? [p, n] : [] }, ev2 = { target: f2, preventDefault() {}, stopImmediatePropagation() {} };
  ecouteurs.filter(l => l.t === 'submit').forEach(l => l.f(ev2));
  vrai('deux champs faits d’espaces : les DEUX désignés d’un coup, et le message les nomme (« Prénom » et « Nom »)', appels.length === 1 && appels[0][1].length === 2 && appels[0][1][0] === p && appels[0][1][1] === n && appels[0][0] === 'Les champs « Prénom » et « Nom » sont obligatoires', appels.map(a => [a[0], a[1].length])); }

console.log('\n── 2850 · 3. la marque se voit, même au focus ──');
{ const TOUT = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const juge = (m, w) => !/prefers-|hover:\s*none|\bprint\b/.test(m.toLowerCase()) && C.mediaVrai(m, w);
  for (const theme of ['light', 'dark']) {
    const ch = [{ tag: 'html', classes: [], attrs: { 'data-refonte': '1', 'data-theme': theme, 'data-marque': 'teamop', 'data-verre': '1' } }, { tag: 'body', classes: [], attrs: {} },
      { tag: 'div', classes: ['field'], attrs: {} }, { tag: 'input', classes: [], attrs: { 'aria-invalid': 'true', type: 'text' } }];
    const b = C.gagnant(TOUT, ch, 390, 'border-color', undefined, juge), s = C.gagnant(TOUT, ch, 390, 'box-shadow', undefined, juge);
    vrai('(' + (theme === 'light' ? 'jour' : 'nuit') + ') un champ marqué : bord et halo rouges', !!b && /var\(--red\)/.test(b.v) && !!s && /var\(--red\)/.test(s.v), [b && b.v, s && s.v]);
    /* par sa FORCE, pas seulement par sa place : le bord de filet des champs (html[data-refonte] .field input) est écrit avec la
       même force qu'une règle sans .field — un jour déplacée plus haut dans la feuille, la marque perdrait en silence */
    const sb = b ? C.specificite(b.sel) : [0, 0, 0], sf = C.specificite('html[data-refonte] .field input');
    vrai('(' + (theme === 'light' ? 'jour' : 'nuit') + ') … et elle l’emporte par sa force sur le bord des champs (' + sb.join(',') + ' contre ' + sf.join(',') + ')', sb[0] > sf[0] || (sb[0] === sf[0] && (sb[1] > sf[1] || (sb[1] === sf[1] && sb[2] > sf[2]))), [sb, sf]);
  }
  const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const sp = () => CSS.indexOf('html[data-refonte] .field input[aria-invalid="true"]:focus');
  const focusRegle = CSS.indexOf('html[data-refonte] .field input:focus,html[data-refonte] .field select:focus');
  vrai('… et au focus (le champ l’a, on le lui donne) : la marque est plus forte que l’anneau du focus (.field … :focus, un attribut de plus), et vient après lui', sp() > focusRegle && focusRegle > 0, [sp(), focusRegle]);
  vrai('le message sous le champ : en rouge, en texte (pas la couleur seule)', /\.champ-manque-note\{color:var\(--red\);font-size:12\.5px/.test(CSS)); }

console.log('\n── 2850 · le message va SOUS la rangée quand le champ est dans une rangée flex (relecture adverse, partie X) ──');
/* le mot de passe provisoire et son 🎲, le nom et la référence d'un équipement, la date et l'heure de « Planifier » : le message
   inséré juste après le champ devenait un élément de la rangée — coincé entre deux champs, la rangée débordait au téléphone */
/* … mais une rangée qui PASSE À LA LIGNE (.frow : le montant d'un encaissement, le prénom d'un conducteur) garde le message
   juste après le champ, sur une ligne à lui : sorti de .frow, il perdait le retrait de la rangée (relecture de la partie X) */
for (const [disp, dir, wrap, attendu, quoi] of [['flex', 'row', 'nowrap', 'rangee', 'rangée flex qui ne passe pas à la ligne'], ['inline-flex', 'row', 'nowrap', 'rangee', 'rangée inline-flex'],
  ['flex', 'row', 'wrap', 'pwd', 'rangée qui passe à la ligne (.frow)'], ['flex', 'column', 'nowrap', 'pwd', 'colonne flex'], ['block', '', '', 'pwd', 'bloc']]) {
  const M = monde(); const rangee = M.el('rangee'), pwd = M.el('pwd'); pwd.parentElement = rangee;
  M.ctx.getComputedStyle = (x) => x === rangee ? { display: disp, flexDirection: dir, flexWrap: wrap } : { display: 'block', flexDirection: '', flexWrap: '' };
  M.ctx.champManque('Mot de passe provisoire obligatoire', pwd);
  const ins = M.J.insere[0];
  vrai((attendu === 'rangee' ? '⛔ ' : '') + quoi + ' : le message va après ' + (attendu === 'rangee' ? 'la RANGÉE (sous elle)' : 'le champ'), !!ins && ins.apres === attendu && ins.pos === 'afterend', ins && ins.apres);
  vrai('… et reste relié au CHAMP (aria-invalid, aria-describedby), effacé à sa première frappe', pwd.a['aria-invalid'] === 'true' && /^mq-/.test(pwd.a['aria-describedby'] || '') && (pwd.tape(), M.J.insere.length === 0)); }

{ const CSSN = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  const regle = (/\.champ-manque-note\{([^}]*)\}/.exec(CSSN) || [])[1] || '';
  vrai('dans une rangée qui passe à la ligne, le message prend une ligne à lui (flex:0 0 100 %, ses marges en rembourrage : il ne déborde pas)', /flex:0 0 100%/.test(regle) && /box-sizing:border-box/.test(regle) && /margin:6px 0 0/.test(regle), regle); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
