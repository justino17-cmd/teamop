/* ══ test-2840 · LE TOAST SE DIT AUX LECTEURS D'ÉCRAN, ET UNE ERREUR NE S'HABILLE PAS EN SUCCÈS ══════════════════════════════
   Audit apple-design du 21 octobre 2026, points 18 et 34. Le toast est le seul retour de quelque 845 gestes : il n'était
   annoncé à aucun lecteur d'écran (ni role, ni aria-live), son « ↩︎ Annuler » était un <span> inatteignable au clavier, son
   texte restait dans le document une fois parti, et un refus (« Droit requis », « Serveur injoignable ») portait exactement
   l'habillage d'une confirmation.
   Ce banc EXÉCUTE toastHabiller, toastCacher, toast et toastAnnuler extraits d'app.html (horloge simulée), passe le
   classement sur TOUS les messages écrits en dur dans la page, et relit le balisage et la feuille. La preuve dans la page
   (arbre d'accessibilité du navigateur, captures jour et nuit) : scratchpad/sonde-toast.js.                            */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
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
console.log('\n── 2840 · 0. la population ──');
const RE = (/\nconst TOAST_ERREUR=(\/.*\/i);/.exec(CODE) || [])[1];
const F = ['toastHabiller', 'toastCacher', 'toast', 'toastAnnuler'].map(fonction);
vrai('le motif des refus (TOAST_ERREUR) et les quatre fonctions du toast sont trouvés', !!RE && F.every(x => x.length > 60), [!!RE, F.map(x => x.length)]);

console.log('\n── 2840 · 1. le balisage : une région vivante ──');
const TAG = (/<div class="toast" id="toast"[^>]*>/.exec(BRUT) || [''])[0];
vrai('#toast est role="status", aria-live et aria-atomic', /role="status"/.test(TAG) && /aria-live="polite"/.test(TAG) && /aria-atomic="true"/.test(TAG), TAG);
vrai('… sans aria-hidden (une région retirée de l’arbre n’est plus écoutée)', !/aria-hidden/.test(TAG), TAG);

function monde() {
  const J = { minut: [] };
  const attrs = {}; const cl = new Set();
  const t = { textContent: '', innerHTML: '', _t: 0, _v: 0, setAttribute: (k, v) => { attrs[k] = String(v); }, getAttribute: (k) => attrs[k], removeAttribute: (k) => { delete attrs[k]; },
    classList: { add: (c) => cl.add(c), remove: (c) => cl.delete(c), contains: (c) => cl.has(c), toggle: (c, on) => { if (on) cl.add(c); else cl.delete(c); } } };
  const ctx = { console, String, boxTxt: (s) => s, $: (id) => id === 'toast' ? t : null, esc: (x) => String(x).replace(/</g, '&lt;'), window: {},
    setTimeout: (f, ms) => { J.minut.push({ f, ms }); return J.minut.length; }, clearTimeout: (id) => { if (J.minut[id - 1]) J.minut[id - 1].annule = true; } };
  vm.createContext(ctx);
  try { vm.runInContext('const TOAST_ERREUR=' + RE + ';\n' + F.join('\n'), ctx); } catch (e) { J.err = e.message; }
  for (const n of ['toast', 'toastAnnuler']) if (typeof ctx[n] !== 'function') ctx[n] = () => {};
  const tourner = () => { const m = J.minut.splice(0); m.filter(x => !x.annule).forEach(x => x.f()); };
  return { ctx, J, t, attrs, cl, tourner };
}

console.log('\n── 2840 · 2. une confirmation, un refus ──');
{ const M = monde(); vrai('le code s’exécute', !M.J.err, M.J.err);
  M.ctx.toast('Client ajouté');
  vrai('une confirmation : annoncée poliment, sans l’habillage d’alerte', M.attrs['aria-live'] === 'polite' && !M.cl.has('tst-err') && M.t.textContent === 'Client ajouté', M.attrs);
  M.ctx.toast('Droit « Déplacer le planning » requis');
  vrai('un refus : annoncé tout de suite (assertive) et habillé en alerte (.tst-err)', M.attrs['aria-live'] === 'assertive' && M.cl.has('tst-err'), M.attrs);
  M.ctx.toast('Mouvement refusé', 0, 'ok');
  vrai('« Mouvement refusé » qui CONFIRME le refus qu’on vient de faire : l’appel tranche (ok), pas d’alerte', !M.cl.has('tst-err') && M.attrs['aria-live'] === 'polite');
  M.ctx.toast('Tout est enregistré', 0, 'erreur');
  vrai('… et inversement, un appel peut déclarer une erreur', M.cl.has('tst-err')); }

console.log('\n── 2840 · 3. parti, il ne reste rien à lire ──');
{ const M = monde(); M.ctx.toast('Serveur injoignable'); M.tourner();
  vrai('à la fin de son temps, le toast se cache', !M.cl.has('show'));
  M.tourner();
  vrai('… puis son texte est retiré (un lecteur d’écran ne le retrouve pas hors contexte)', M.t.textContent === '', M.t.textContent); }
{ const M = monde(); M.ctx.toast('Premier'); M.tourner(); M.ctx.toast('Second');
  /* la minuterie du précédent est annulée (clearTimeout) ; on la fait tout de même partir, comme une minuterie déjà
     échue au moment où le toast revient : la garde « encore affiché ? » doit tenir seule */
  M.J.minut.filter(x => x.ms === 450).forEach(x => x.f());
  vrai('un toast qui revient pendant l’effacement n’est pas vidé par la minuterie du précédent (même échue)', M.t.textContent === 'Second', M.t.textContent); }

console.log('\n── 2840 · 4. « Annuler » est un vrai bouton ──');
{ const M = monde(); M.ctx.toastAnnuler('Intervention déplacée', 'annulerDeplacement()');
  vrai('« ↩︎ Annuler » est un <button type="button"> (clavier, lecteur d’écran)', /<button type="button" class="tst-an" onclick="[^"]*annulerDeplacement\(\)"/.test(M.t.innerHTML), M.t.innerHTML.slice(0, 160));
  { const oc = (/onclick="([^"]*)"/.exec(M.t.innerHTML) || [])[1] || '';
    vrai('⛔ … qui CACHE le toast d’abord, puis agit : le toast que pose l’annulation (« Rétabli »…) se voit (relecture adverse, partie X)', oc.indexOf('toastCacher') > -1 && oc.indexOf('toastCacher') < oc.indexOf('annulerDeplacement()'), oc); }
  vrai('… et le message qui le porte n’est pas une alerte', !M.cl.has('tst-err')); }

console.log('\n── 2840 · 5. le classement, sur tous les messages de la page ──');
let R = /$^/; try { if (RE) R = eval(RE); } catch (e) { /* motif illisible : rien n'est reconnu, les contrôles tombent */ }
const MSG = [...new Set([...CODE.matchAll(/toast\((['`"])((?:(?!\1)[^\\]|\\.)*)\1(\s*,\s*[^,)]*\s*,\s*'(ok|erreur)')?/g)].map(m => ({ m: m[2], g: m[4] })))];
vrai('(population) plus de 500 messages écrits en dur', MSG.length > 500, MSG.length);
const erreurs = MSG.filter(x => x.g !== 'ok' && R.test(x.m));
vrai('(population) au moins 80 d’entre eux sont des refus ou des erreurs', erreurs.length >= 80, erreurs.length);
const FAMILLES = [/requis/i, /^impossible|impossible\b/i, /injoignable/i, /introuvable/i, /non autoris/i, /^réservé/i, /invalide/i, /illisible/i, /^⚠/, /^❌/];
for (const f of FAMILLES) { const l = MSG.filter(x => f.test(x.m)); vrai('toute la famille ' + f + ' (' + l.length + ') est reconnue comme un refus', l.length > 0 && l.every(x => x.g === 'ok' || R.test(x.m)), l.filter(x => !R.test(x.m)).map(x => x.m).slice(0, 3)); }
const succes = MSG.filter(x => /^(✓|✅|🧾|📨|🔁|Mis à jour|Enregistr|Client ajout|Copié)/.test(x.m) && R.test(x.m) && x.g !== 'erreur');
vrai('aucune confirmation (✓, Enregistré, Mis à jour, Copié…) n’est prise pour une erreur', !succes.length, succes.map(x => x.m).slice(0, 4));
vrai('« Mouvement refusé » et « Demande refusée » (des confirmations) déclarent « ok »', ['Mouvement refusé', 'Demande refusée'].every(t => MSG.some(x => x.m === t) && MSG.filter(x => x.m === t).every(x => x.g === 'ok')), MSG.filter(x => /^(Mouvement|Demande) refusée?$/.test(x.m)));

vrai('« ⛔ Demande refusée » d’une absence (le validateur confirme SA décision) déclare « ok »', /toast\(ok\?'✅ Demande validée':'⛔ Demande refusée',0,'ok'\)/.test(CODE));

console.log('\n── 2840 · 6. la feuille : l’alerte ne tient pas qu’à la couleur ──');
const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
/* ce qui GAGNE, pas le texte d'une règle : sous le verre, une règle plus forte pose l'ombre de la capsule (cascade rejouée) */
{ const C = require('./outils-cascade-app.js'); const REG = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  for (const verre of [true, false]) for (const theme of ['light', 'dark']) {
    const html = { tag: 'html', classes: [], attrs: Object.assign({ 'data-refonte': '1', 'data-theme': theme, 'data-marque': 'teamop', lang: 'fr' }, verre ? { 'data-verre': '1' } : {}) };
    const g = C.gagnant(REG, [html, { tag: 'body', classes: [], attrs: {} }, { tag: 'div', classes: ['toast', 'tst-err', 'show'], attrs: { id: 'toast' }, id: 'toast' }], 390, 'box-shadow');
    vrai('un refus porte un liseré rouge qui GAGNE la cascade (' + (verre ? 'verre' : 'sans verre') + ', ' + theme + ')', !!g && /inset 0 0 0 [\d.]+px var\(--red\)/.test(g.v), g && g.sel);
  } }
vrai('… et une pastille « ! » (un signe, pas seulement une teinte), aplat et encre appariés', /\.toast\.tst-err::before\{content:'!'[^}]*background:var\(--red-fill[^}]*color:var\(--on-red/.test(CSS));
vrai('« Annuler » garde l’encre de la capsule (plus de liseré blanc invisible sur une capsule claire)', /\.tst-an\{[^}]*border:1px solid currentColor;[^}]*background:none;[^}]*color:inherit/.test(CSS));

console.log('\n── 2840 · une erreur porte UN signe (partie X) ──');
{ const M = monde();
  M.ctx.toast('⚠️ Toutes les quantités sont à 0 — règle les cartons', 0, 'erreur');
  vrai('⛔ une erreur qui commençait par « ⚠️ » : la pastille « ! » la marque, l’émoji s’efface (deux signes côte à côte)', M.t.classList.contains('tst-err') && M.t.textContent === 'Toutes les quantités sont à 0 — règle les cartons', M.t.textContent);
  M.ctx.toast('❌ Échec de l’envoi');
  vrai('… de même pour « ❌ » (reconnue comme erreur par son signe)', M.t.classList.contains('tst-err') && M.t.textContent === 'Échec de l’envoi', M.t.textContent);
  M.ctx.toast('📶 Hors connexion — enregistré sur l’appareil');
  vrai('« 📶 » reste : il dit « réseau », pas « attention »', /^📶/.test(M.t.textContent), M.t.textContent);
  M.ctx.toast('⚠️ Pensez à valider', 0, 'ok');
  vrai('un message qui n’est pas une erreur garde son émoji (pas de pastille, rien à remplacer)', !M.t.classList.contains('tst-err') && /^⚠️/.test(M.t.textContent), M.t.textContent); }

console.log('\n── 2840 · le toast passe au-dessus des panneaux plein écran (relecture adverse, partie X) ──');
/* « Ma commande » des bons (410), leur catalogue (400), le volet du téléphone (350) : à 320, un refus des bons (« Toutes les
   quantités sont à 0 ») partait SOUS le panneau ouvert — le bouton « ✓ Valider » avait l'air de ne rien faire. La visionneuse
   de photo (420) et l'écran hors ligne restent au-dessus. */
{ const C = require('./outils-cascade-app.js'); const REG = C.regles([...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n'));
  const g = C.gagnant(REG.filter(r => !/[\[:]/.test(r.sel)), [{ tag: 'html', classes: [], attrs: {} }, { tag: 'body', classes: [], attrs: {} }, { tag: 'div', classes: ['toast', 'show'], attrs: { id: 'toast' }, id: 'toast' }], 390, 'z-index');
  const zt = g ? parseInt(g.v, 10) : NaN;
  const SRCJ = BRUT.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
  const panneaux = [...SRCJ.matchAll(/position:fixed;inset:0;z-index:(\d+)/g)].map(m => +m[1]).filter(z => z < 420);
  const zv = (/\.vph\{[^}]*z-index:(\d+)/.exec(CSS) || [])[1];
  vrai('(population) les panneaux plein écran écrits dans le code sont trouvés (' + panneaux.join(', ') + ')', panneaux.length >= 3 && panneaux.includes(410), panneaux);
  vrai('⛔ le toast (' + zt + ') passe au-dessus de chacun', zt > Math.max(...panneaux), [zt, panneaux]);
  vrai('… et du volet du téléphone (#splitpane, 350)', zt > 350);
  vrai('… mais reste sous la visionneuse de photo (' + zv + ')', !!zv && zt < +zv, [zt, zv]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
