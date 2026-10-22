/* ══ test-2851 · RÉORGANISER LE TABLEAU DE BORD : LA CARTE SE SOULÈVE, LES AUTRES LUI FONT PLACE, ELLE SE POSE ═══════════════════
   Audit apple-design du 21 octobre 2026, point 35. La carte sautait à 1,06 en une image après l'appui long, on la tirait sur un
   contour pointillé pendant que rien ne bougeait, et au lâcher le tableau de bord se réécrivait : elle disparaissait du doigt et
   réapparaissait ailleurs.
   Ce banc EXÉCUTE dashDragInit extraite d'app.html sur quatre cartes en grille 2 × 2 (un document simulé : des cases fixes,
   les styles posés en ligne relus), à la souris puis au doigt : la prise (un ressort, pas un saut ; scale et translate séparés),
   le glissé (la carte suit 1:1, les autres glissent vers leur future case, la cible se lit sur les cases de départ), la dépose
   (la carte rejoint sa case, PUIS l'ordre est enregistré et la carte déplacée dans la grille — sans redessiner l'écran), le geste
   perdu (tout revient, rien n'est
   enregistré), les animations réduites. La preuve dans la page, au doigt : scratchpad/sonde-tdb-cartes.js.                 */
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
console.log('\n── 2851 · 0. la population ──');
const F = fonction('dashDragInit');
vrai('(population) dashDragInit est trouvée', F.length > 1500, F.length);

/* quatre cartes, 160 × 100, en 2 × 2 : a(0,0) b(170,0) / c(0,110) d(170,110) */
function monde(o) {
  o = o || {};
  const J = { minut: [], doc: {}, ordre: ['a', 'b', 'c', 'd', 'cachee'], saves: 0, redessins: 0 };
  const pos = { a: [0, 0], b: [170, 0], c: [0, 110], d: [170, 110] };
  /* o.enfoncee : cette carte est peinte à 0,97 autour de son centre (« :active », le doigt encore posé) — son rectangle peint est
     plus petit que sa case ; offsetWidth/offsetHeight (la mise en page) ne bougent pas */
  const carte = (k) => { const L = {}, f = k === o.enfoncee ? 0.97 : 1; const e = { dataset: { dk: k }, style: {}, L, offsetWidth: 160, offsetHeight: 100,
    addEventListener: (t, fn) => { (L[t] = L[t] || []).push(fn); },
    getBoundingClientRect: () => ({ left: pos[k][0] + 80 * (1 - f), top: pos[k][1] + 50 * (1 - f), width: 160 * f, height: 100 * f }) }; return e; };
  const C = ['a', 'b', 'c', 'd'].map(carte);
  /* l'ordre des cartes dans la grille : before/after déplacent un nœud, comme le DOM */
  C.forEach(e => { e.before = (n) => { C.splice(C.indexOf(n), 1); C.splice(C.indexOf(e), 0, n); J.deplacements = (J.deplacements || 0) + 1; };
    e.after = (n) => { C.splice(C.indexOf(n), 1); C.splice(C.indexOf(e) + 1, 0, n); J.deplacements = (J.deplacements || 0) + 1; }; });
  const wrap = { querySelectorAll: (s) => s === '.kpi[data-dk]' ? C : [] };
  const ctx = { console, Math,
    document: { querySelector: (s) => s === '.kpis' ? wrap : null, body: { style: {} },
      addEventListener: (t, f) => { (J.doc[t] = J.doc[t] || []).push(f); }, removeEventListener: (t, f) => { J.doc[t] = (J.doc[t] || []).filter(x => x !== f); } },
    navigator: {}, window: {}, animSobre: () => !!o.sobre, dashLayout: () => J.ordre, save: () => { J.saves++; }, current: 'dashboard',
    /* toute façon de redessiner l'écran est comptée : la pose ne doit en appeler AUCUNE */
    views: { dashboard: () => { J.redessins++; } }, go: () => { J.redessins++; }, rendreVueSure: () => { J.redessins++; }, rendreVueAnimee: () => { J.redessins++; },
    setTimeout: (f, ms) => { J.minut.push({ f, ms }); return J.minut.length; }, clearTimeout: (id) => { if (J.minut[id - 1]) J.minut[id - 1].annule = true; } };
  vm.createContext(ctx);
  try { vm.runInContext(F + '\ndashDragInit();', ctx); } catch (e) { J.err = e.message; }
  const tourner = () => { for (let n = 0; n < 4; n++) { const m = J.minut.splice(0); if (!m.length) break; m.filter(x => !x.annule).forEach(x => x.f()); } };
  const cible = { closest: () => null };
  const souris = {
    presse: (c, x, y) => (C.find(e => e.dataset.dk === c).L.mousedown || []).forEach(f => f({ button: 0, clientX: x, clientY: y, target: cible })),
    bouge: (x, y) => (J.doc.mousemove || []).slice().forEach(f => f({ clientX: x, clientY: y })),
    lache: () => (J.doc.mouseup || []).slice().forEach(f => f({})) };
  const doigt = {
    pose: (c, x, y) => (C.find(e => e.dataset.dk === c).L.touchstart || []).forEach(f => f({ touches: [{ clientX: x, clientY: y }], target: cible })),
    bouge: (c, x, y) => { const e = { touches: [{ clientX: x, clientY: y }], empeche: false, preventDefault() { e.empeche = true; } }; (C.find(q => q.dataset.dk === c).L.touchmove || []).forEach(f => f(e)); return e; },
    perdu: (c) => (C.find(e => e.dataset.dk === c).L.touchcancel || []).forEach(f => f({})),
    leve: (c) => (C.find(e => e.dataset.dk === c).L.touchend || []).forEach(f => f({})) };
  return { J, C, carte: (k) => C.find(e => e.dataset.dk === k), tourner, souris, doigt, ctx };
}

console.log('\n── 2851 · 1. la prise ──');
{ const M = monde(); vrai('le code s’exécute', !M.J.err, M.J.err);
  const a = M.carte('a');
  M.souris.presse('a', 80, 50); M.souris.bouge(84, 52);
  vrai('un mouvement de 4 px n’est pas une prise', !a.style.scale);
  M.souris.bouge(95, 55);
  vrai('⛔ prise : la carte se SOULÈVE sur un ressort (scale transitionné), au lieu de sauter à 1,06 en une image', a.style.scale === '1.04' && /scale var\(--d-2\) var\(--ressort\)/.test(a.style.transition || ''), [a.style.scale, a.style.transition]);
  vrai('… et l’enfoncement de « :active » (doigt encore posé) est levé DANS le même ressort (transform:none, transitionné), sinon 0,97 × 1,04 ≈ 1', a.style.transform === 'none' && /transform var\(--d-2\) var\(--ressort\)/.test(a.style.transition || ''), [a.style.transform, a.style.transition]);
  vrai('… au-dessus des autres, avec son ombre', a.style.zIndex === 50 && /rgba/.test(a.style.boxShadow || ''));
  vrai('… et elle suit le doigt 1:1 par translate (pas dans transform : scale le multiplierait)', a.style.translate === '15px 5px', a.style.translate);
  vrai('les autres cartes sont prêtes à glisser (transition de translate)', ['b', 'c', 'd'].every(k => /translate var\(--d-3\) var\(--ressort\)/.test(M.carte(k).style.transition || ''))); }

console.log('\n── 2851 · 2. les autres lui font place ──');
{ const M = monde(); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55);
  M.souris.bouge(250, 160);   // au-dessus de la case de « d »
  const t = k => M.carte(k).style.translate || '';
  vrai('la carte tenue est au doigt (170 px, 110 px)', t('a') === '170px 110px', t('a'));
  vrai('⛔ pendant le glissé, les autres glissent vers la case qu’elles AURONT : b → (0,0), c → (170,0), d → (0,110)', t('b') === '-170px 0px' && t('c') === '170px -110px' && t('d') === '-170px 0px', [t('b'), t('c'), t('d')]);
  M.souris.bouge(80, 160);    // revenir au-dessus de la case de « c »
  vrai('la cible se lit sur les cases de DÉPART (pas sur les cartes déplacées) : au-dessus de c, b et c montent, d reste', t('b') === '-170px 0px' && t('c') === '170px -110px' && t('d') === '0px 0px', [t('b'), t('c'), t('d')]); }

console.log('\n── 2851 · 2 bis. la carte tenue est encore enfoncée par « :active » ──');
{ const M = monde({ enfoncee: 'a' }); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55); M.souris.bouge(250, 160);
  const t = k => M.carte(k).style.translate || '';
  vrai('⛔ sa case se lit sans l’enfoncement : les autres visent les cases exactes (b → (0,0) à 0 px près, pas à 2,4 px)', t('b') === '-170px 0px' && t('c') === '170px -110px' && t('d') === '-170px 0px', [t('b'), t('c'), t('d')]);
  M.souris.lache();
  vrai('… et elle rejoint la case exacte (170,110)', M.carte('a').style.translate === '170px 110px', M.carte('a').style.translate); }

console.log('\n── 2851 · 3. la dépose ──');
{ const M = monde(); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55); M.souris.bouge(250, 160); M.souris.lache();
  const a = M.carte('a');
  vrai('⛔ au lâcher, la carte REJOINT sa case (170,110) sur le ressort, et se repose (scale 1, sans ombre)', a.style.translate === '170px 110px' && a.style.scale === '1' && !a.style.boxShadow && /translate var\(--d-3\) var\(--ressort\)/.test(a.style.transition), [a.style.translate, a.style.scale, a.style.transition]);
  vrai('… l’ordre n’est PAS encore enregistré, la grille pas encore réordonnée (sinon elle disparaîtrait du doigt)', M.J.saves === 0 && !M.J.deplacements);
  M.tourner();
  vrai('la pose finie : l’ordre est enregistré (a passe après d), et la carte déplacée dans la grille au même rang', M.J.ordre.join(',') === 'b,c,d,a,cachee' && M.J.saves === 1 && M.C.map(e => e.dataset.dk).join(',') === 'b,c,d,a', [M.J.ordre, M.J.saves, M.C.map(e => e.dataset.dk)]);
  vrai('⛔ … SANS redessiner l’écran (ni views.dashboard, ni go, ni rendreVueSure) : chaque redessin faisait sauter quelque chose — la barre « Reprendre » perdue (75 px), un défilement périmé (239 px)', M.J.redessins === 0, M.J.redessins);
  vrai('… et les styles en ligne sont rendus (rien ne reste soulevé ni décalé)', M.C.every(e => !e.style.translate && !e.style.scale && !e.style.transform && !e.style.transition && !e.style.zIndex)); }
{ const M = monde(); M.souris.presse('d', 250, 160); M.souris.bouge(260, 165); M.souris.bouge(20, 20); M.souris.lache(); M.tourner();
  vrai('vers l’arrière : d posée sur a passe en tête, dans l’ordre enregistré comme dans la grille', M.J.ordre.join(',') === 'd,a,b,c,cachee' && M.C.map(e => e.dataset.dk).join(',') === 'd,a,b,c', [M.J.ordre, M.C.map(e => e.dataset.dk)]); }
{ const M = monde(); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55); M.souris.bouge(80, 60); M.souris.lache(); M.tourner();
  vrai('reposée sur sa propre case : rien n’est enregistré, rien ne bouge dans la grille', M.J.saves === 0 && !M.J.deplacements && M.J.redessins === 0); }

console.log('\n── 2851 · 3 bis. reprendre une carte pendant que la précédente se pose (relecture adverse, partie X) ──');
{ const M = monde(); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55); M.souris.bouge(250, 160); M.souris.lache();
  vrai('(population) la carte lâchée est en train de se poser (rien d’enregistré encore)', M.J.saves === 0 && M.carte('a').style.translate === '170px 110px');
  M.souris.presse('b', 250, 50);
  vrai('⛔ reprendre une carte TERMINE d’abord la pose en cours : l’ordre est enregistré et la grille rangée avant la nouvelle prise', M.J.saves === 1 && M.J.ordre.join(',') === 'b,c,d,a,cachee' && M.C.map(e => e.dataset.dk).join(',') === 'b,c,d,a', [M.J.saves, M.J.ordre]);
  vrai('… et ses styles sont rendus (la nouvelle prise mesure des cases propres)', M.C.every(e => !e.style.translate && !e.style.scale && !e.style.transition));
  M.souris.bouge(262, 56);
  M.tourner();
  vrai('⛔ … et la fin de l’ancienne pose ne repasse pas : la carte tenue reste soulevée, rien n’est enregistré deux fois', M.carte('b').style.scale === '1.04' && M.J.saves === 1, [M.carte('b').style.scale, M.J.saves]);
  M.souris.lache(); M.tourner(); }

console.log('\n── 2851 · 4. au doigt ──');
{ const M = monde(); M.doigt.pose('b', 250, 50);
  const avant = M.doigt.bouge('b', 252, 51);
  vrai('avant l’appui long, le doigt reste au défilement (rien d’annulé, rien de soulevé)', !avant.empeche && !M.carte('b').style.scale);
  M.J.minut.filter(x => x.ms === 430).forEach(x => x.f());
  const e = M.doigt.bouge('b', 80, 160);
  vrai('après 430 ms d’appui : soulevée, et le glissé n’est plus un défilement', M.carte('b').style.scale === '1.04' && e.empeche);
  M.doigt.leve('b'); M.tourner();
  vrai('lâchée sur c : b passe après c, dans l’ordre comme dans la grille', M.J.ordre.join(',') === 'a,c,b,d,cachee' && M.C.map(e => e.dataset.dk).join(',') === 'a,c,b,d', [M.J.ordre, M.C.map(e => e.dataset.dk)]); }
{ const M = monde(); M.doigt.pose('b', 250, 50); M.J.minut.filter(x => x.ms === 430).forEach(x => x.f()); M.doigt.bouge('b', 80, 160);
  M.doigt.perdu('b');
  vrai('⛔ geste perdu (appel entrant, geste système) : la carte REVIENT à sa case, les autres aussi', M.carte('b').style.translate === '0px 0px' && ['a', 'c', 'd'].every(k => !M.carte(k).style.translate), [M.carte('b').style.translate, M.carte('c').style.translate]);
  M.tourner();
  vrai('… et rien n’est enregistré, rien ne bouge dans la grille', M.J.saves === 0 && !M.J.deplacements && M.J.ordre.join(',') === 'a,b,c,d,cachee'); }

console.log('\n── 2851 · 5. animations réduites ──');
{ const M = monde({ sobre: true }); M.souris.presse('a', 80, 50); M.souris.bouge(95, 55);
  vrai('pas de ressort à la prise', M.carte('a').style.transition === 'none' && ['b', 'c', 'd'].every(k => M.carte(k).style.transition === 'none'));
  M.souris.bouge(250, 160); M.souris.lache();
  vrai('lâchée : enregistrée et déplacée dans la grille tout de suite, sans pose animée', M.J.saves === 1 && M.J.ordre.join(',') === 'b,c,d,a,cachee' && M.C.map(e => e.dataset.dk).join(',') === 'b,c,d,a' && M.C.every(e => !e.style.translate && !e.style.scale), [M.J.saves, M.C.map(e => e.dataset.dk)]); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
