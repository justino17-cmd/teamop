/* ══ « VOIR SUR LA CARTE » MONTRE LA CARTE, ET NE FLOTTE PLUS SUR LE PLANNING (v732) ════════════
   Vidéo de Justin, iPhone, 23 septembre 2026 à 13 h 02 — « j'ai toujours des petits bugs comme
   ça ici ». Au-delà de la barre qui sautait (test-780), les images montraient deux boutons
   flottants EMPILÉS au bord droit : la bulle d'assistance posée sur la flèche « jours suivants »
   du bandeau des jours, et « Voir sur la carte » au-dessus d'elle, au milieu de l'écran.
   Mesuré en rejouant l'écran (`scratchpad/sonde-flottants.js`, iPhone de 815 px) : le zoom
   « − 100 % + » avait son centre SOUS « Voir sur la carte ». Et en le touchant pour de vrai, un
   défaut plus grave : la carte s'ouvrait SOUS tout le planning — à 2 187 px du haut pour un écran
   de 874 (vues semaine, jour et mois). À l'écran, rien ne se passait, sauf le bouton qui
   disparaissait.
   Trois gestes, gardés ici :
   1. en une colonne (sous 1 100 px), la carte passe EN TÊTE du planning (colonne flex + `order`,
      la forme que « Carte en grand » a déjà éprouvée dans Safari) ;
   2. demander la carte l'amène sous les yeux si elle n'y est pas entièrement (`planCarteMontrer`),
      et ne fait rien au bureau, où elle est collée à droite ;
   3. au téléphone, « Voir sur la carte » QUITTE le calque flottant : il rejoint « Journal » dans
      les actions de l'écran. Au-dessus de 780 px, il flotte comme avant.
   Ce banc EXÉCUTE les vraies fonctions (`planDispSet`, `planCarteMontrer`, `planDispBar`) et relit
   les règles à leur place. Le comportement de bout en bout — le vrai toucher, la carte entre les
   deux barres — est dans `scratchpad/sonde-flottants.js` (16 ✓ ; 5 ✓ 11 ✗ sur la bêta v731).   */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* Découpe par ACCOLADES appariées, à partir d'une ouverture donnée. */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); }
  }
  return '';
}
/* Le bloc @media qui CONTIENT une position donnée (par ses accolades), ou '' au premier niveau. */
function mediaDe(i) {
  let prof = 0;
  for (let j = i; j > 0; j--) { const c = SRC[j]; if (c === '}') prof++; else if (c === '{') { if (prof === 0) { const d = SRC.lastIndexOf('\n', j); const tete = SRC.slice(d + 1, j).trim();
    if (/^@(media|container)/.test(tete)) return tete; continue; } prof--; } }
  return '';
}
function regle(sel) { const i = SRC.indexOf(sel); return i < 0 ? null : { i, media: mediaDe(i) }; }

console.log('\n── 781 · 0. la population ──');
const fSet = bloc('function planDispSet(v){'), fMontrer = bloc('function planCarteMontrer(){'), fBar = bloc('function planDispBar(){');
const lDispos = (SRC.match(/const PLAN_DISPOS=\[[\s\S]*?\]\];/) || [''])[0];
vrai('planDispSet, planCarteMontrer, planDispBar et PLAN_DISPOS sont trouvés',
  fSet.length > 200 && fMontrer.length > 400 && fBar.length > 300 && lDispos.length > 100,
  [fSet.length, fMontrer.length, fBar.length, lDispos.length]);

console.log('\n── 781 · 1. en une colonne, la carte passe EN TÊTE ──');
const colonne = regle('.plm-split{ display:flex; flex-direction:column; gap:12px; align-items:stretch; }');
vrai('⛔ sous 1 100 px, la disposition est une colonne FLEX (pas la grille : « order » s’y comportait mal dans Safari)',
  !!colonne && /max-width:1100px/.test(colonne.media), colonne && colonne.media);
const tete = regle('.plm-split > .plm-carte{ order:-1; }');
vrai('⛔ … et la carte y passe AVANT le planning', !!tete && tete.media === (colonne && colonne.media), tete && tete.media);
const retrecit = regle('.plm-split > *{ min-width:0; width:100%; }');
vrai('… chaque enfant peut rétrécir sous son contenu (la grille des techniciens défile dans son cadre)',
  !!retrecit && retrecit.media === (colonne && colonne.media));
vrai('… et plus aucune règle de GRILLE ne vise la colonne unique (elle serait morte sous le flex)',
  !/\.plm-split\{\s*grid-template-columns:minmax\(0,1fr\);\s*\}/.test(SRC));
const ico = regle('.pf-disp .di.b{ flex-direction:column; } .pf-disp .di.b s:last-child{ order:-1; }');
vrai('l’icône « côte à côte » dessine, en une colonne, une petite carte AU-DESSUS du planning', !!ico && /max-width:1100px/.test(ico.media), ico && ico.media);

console.log('\n── 781 · 2. demander la carte l’amène sous les yeux — JOUÉ ──');
/* planDispSet, exécutée : ce qu'elle écrit, et QUAND elle demande à montrer la carte. */
function jouerSet(v, mode) {
  const ctx = { appels: [], rendus: 0, ls: {}, planMode: mode || 'semaine', planZoom: 'x', planCarteOn: false, planCarteAutre: false };
  ctx.localStorage = { setItem: (k, x) => { ctx.ls[k] = String(x); }, getItem: k => ctx.ls[k] ?? null };
  ctx.views = { planning: () => { ctx.rendus++; } };
  ctx.planCarteMontrer = () => { ctx.appels.push(ctx.rendus); };
  vm.createContext(ctx);
  vm.runInContext('function planDispCle(){ return "elan_plan_disp_"+(planMode||"jour"); }\n' + fSet + '\nplanDispSet(' + JSON.stringify(v) + ');', ctx);
  return ctx;
}
const cCote = jouerSet('cote'), cPlan = jouerSet('plan'), cCarte = jouerSet('carte'), cMulti = jouerSet('cote', 'multi');
v('« côte à côte » : la disposition est écrite, la vue redessinée une fois', [cCote.ls.elan_plan_disp_semaine, cCote.rendus], ['cote', 1]);
v('⛔ … PUIS la carte est montrée — après le rendu, pas avant', cCote.appels, [1]);
v('« carte en grand » : montrée aussi', cCarte.appels, [1]);
v('⛔ « planning seul » : on ne va chercher aucune carte', cPlan.appels, []);
v('la vue multi garde son propre réglage, et montre la carte pareil', [cMulti.ls.elan_plan_cartem, cMulti.appels], ['1', [1]]);

/* planCarteMontrer, exécutée sur des géométries fabriquées. Barre du haut : 0 → 114 ; barre
   d'onglets : 766 → 824 ; écran de 874. */
function jouerMontrer({ etroit = true, carte, map, reduit = false, onglets = [766, 824], scrollY = 400 }) {
  const ctx = { appels: [], innerHeight: 874 };
  const rect = (t, b) => ({ top: t, bottom: b, height: b - t, left: 0, right: 100, width: 100 });
  ctx.window = { scrollY, scrollTo: o => ctx.appels.push(o), matchMedia: q => ({ matches: /max-width:1100px/.test(q) ? etroit : /reduced-motion/.test(q) ? reduit : false }) };
  ctx.matchMedia = ctx.window.matchMedia;
  ctx.requestAnimationFrame = f => f();
  ctx.document = {
    querySelector: s => s === '.plm-carte' ? (carte ? { getBoundingClientRect: () => rect(...carte) } : null) : s === '.topbar' ? { getBoundingClientRect: () => rect(0, 114) } : null,
    getElementById: id => id === 'plm-map' ? (map ? { getBoundingClientRect: () => rect(...map) } : null) : id === 'tabbar' ? (onglets ? { getBoundingClientRect: () => rect(...onglets) } : null) : null,
  };
  vm.createContext(ctx);
  vm.runInContext(fMontrer + '\nplanCarteMontrer();', ctx);
  return ctx.appels;
}
v('⛔ carte SOUS l’écran (la v731 : 2 187 px) → on défile jusqu’à elle, juste sous la barre du haut',
  jouerMontrer({ carte: [2100, 2600], map: [2187, 2527] }), [{ top: 400 + 2100 - 114 - 8, behavior: 'smooth' }]);
v('carte ENTIÈREMENT visible → on ne bouge pas', jouerMontrer({ carte: [300, 800], map: [340, 700] }), []);
v('carte à moitié dans l’écran (son bas passe sous la barre d’onglets) → on l’amène', jouerMontrer({ carte: [560, 1100], map: [605, 945] }).length, 1);
/* Le cas qui départage : le bas de la carte est DANS l'écran (800 < 874) mais SOUS la barre
   d'onglets (800 > 766). Sans ce cas, un calcul qui oublie la barre passait au vert — mesuré par
   mutation : c'était la seule des treize à ne rien faire tomber. */
v('⛔ le bas de la carte caché SOUS la barre d’onglets (mais dans l’écran) → on l’amène quand même', jouerMontrer({ carte: [380, 850], map: [425, 800] }).length, 1);
v('carte passée AU-DESSUS (page défilée plus bas) → on remonte jusqu’à elle',
  jouerMontrer({ carte: [-500, 0], map: [-455, -115], scrollY: 1800 }), [{ top: 1800 - 500 - 114 - 8, behavior: 'smooth' }]);
v('⛔ « réduire les animations » → le même saut, sans glissé', jouerMontrer({ carte: [2100, 2600], map: [2187, 2527], reduit: true }).map(o => o.behavior), ['auto']);
v('⛔ au bureau (plus d’une colonne), on ne touche à rien — la carte y est collée à droite', jouerMontrer({ etroit: false, carte: [2100, 2600], map: [2187, 2527] }), []);
v('sans barre d’onglets (tablette), c’est le bas de l’écran qui borne', jouerMontrer({ carte: [300, 870], map: [345, 860], onglets: [0, 0] }), []);
v('pas de carte rendue (hors ligne, vue sans carte) → rien, et aucune erreur', jouerMontrer({ carte: null, map: null }), []);

console.log('\n── 781 · 3. le nom dit ce que fait le bouton — JOUÉ ──');
function jouerBar(etroit) {
  const ctx = { window: { matchMedia: q => ({ matches: /max-width:1100px/.test(q) ? etroit : false }) } };
  ctx.matchMedia = ctx.window.matchMedia; ctx.esc = s => String(s); ctx.planDisp = () => 'plan';
  vm.createContext(ctx);
  return vm.runInContext(lDispos + '\n' + fBar + '\nplanDispBar();', ctx);
}
const nomsEtroit = [...jouerBar(true).matchAll(/data-tip="([^"]*)"/g)].map(m => m[1]);
const nomsLarge = [...jouerBar(false).matchAll(/data-tip="([^"]*)"/g)].map(m => m[1]);
vrai('population : trois dispositions dans les deux cas', nomsEtroit.length === 3 && nomsLarge.length === 3, [nomsEtroit.length, nomsLarge.length]);
v('⛔ en une colonne, « côte à côte » s’appelle ce qu’il fait (nommer() en fait l’aria-label)', nomsEtroit[1], 'Carte au-dessus — La carte au-dessus du planning');
v('… au bureau, il garde son nom', nomsLarge[1], 'Côte à côte — Le planning à gauche, la carte à droite');
v('… et les deux autres ne bougent pas', [nomsEtroit[0], nomsEtroit[2]], [nomsLarge[0], nomsLarge[2]]);

console.log('\n── 781 · 4. au téléphone, « Voir sur la carte » ne flotte plus ──');
const cache = regle('html[data-refonte] body .plm-fab{display:none!important}');
vrai('⛔ sous 780 px, le bouton flottant est retiré', !!cache && /max-width:780px/.test(cache.media), cache && cache.media);
const montre = regle('html[data-refonte] .ph-actions .plan-carte-tete{display:inline-flex!important}');
vrai('⛔ … et sa commande est dans les actions de l’écran, au même palier', !!montre && montre.media === (cache && cache.media), montre && montre.media);
const ailleurs = regle('.ph-actions .plan-carte-tete{display:none!important}');
vrai('… qu’on ne montre QU’au téléphone : ailleurs le bouton flottant la porte (deux fois la même commande, c’est une de trop)',
  !!ailleurs && ailleurs.media === '', ailleurs && ailleurs.media);
/* Les deux règles portent !important : c'est la SPÉCIFICITÉ qui départage (0,3,1 contre 0,2,0).
   Une troisième règle sur ce bouton pourrait les renverser en silence — il n'y en a que deux. */
/* ⚠️ Recensement LINÉAIRE, par indexOf : une expression `[^{}]*\.plan-carte-tete[^{}]*\{` sur les
   3,5 Mo du fichier prenait 51 s sur une mutation (et quelques ms sur le fichier normal) — le
   retour arrière de `[^{}]*` à chaque position. Un banc qui se fige sur une mutation se fait
   couper, puis désactiver. */
const surBouton = [];
for (let i = SRC.indexOf('.plan-carte-tete'); i >= 0; i = SRC.indexOf('.plan-carte-tete', i + 1)) {
  const d = Math.max(SRC.lastIndexOf('}', i), SRC.lastIndexOf('{', i)) + 1, o = SRC.indexOf('{', i), f = SRC.indexOf('}', o);
  if (o < 0 || f < 0) continue;
  surBouton.push(SRC.slice(d, o).trim().replace(/\s+/g, ' ') + '{' + SRC.slice(o + 1, f).trim() + '}');
}
v('… et ce sont les SEULES règles qui visent ce bouton (une troisième pourrait les renverser)', surBouton.sort(),
  ['.ph-actions .plan-carte-tete{display:none!important}', 'html[data-refonte] .ph-actions .plan-carte-tete{display:inline-flex!important}'].sort());
vrai('plus AUCUNE règle ne monte le bouton au-dessus de la bulle AU TÉLÉPHONE (elle serait morte)',
  !/body\.rf-onglets(:has\(#assistant > \.fab\))? \.plm-fab\{\s*bottom:/.test(SRC));
/* La bulle d'aide Leia a été retirée le 23 septembre 2026 : au-dessus de 780 px le bouton flotte
   toujours, mais SEUL dans son coin — plus rien à éviter, donc plus de règle qui le monte. */
vrai('au-dessus de 780 px, il flotte toujours, seul dans son coin (plus de bulle à éviter)',
  /<button class="plm-fab" onclick="planDispSet\('cote'\)"/.test(SRC) && !/#assistant/.test(SRC) && !regle('.plm-fab{bottom:calc(24px + 58px'));

const iP = SRC.indexOf('views.planning=function(){');
const planning = iP > 0 ? SRC.slice(iP, SRC.indexOf('let body=', iP)) : '';
vrai('population : l’en-tête de l’écran Planning est trouvé', planning.length > 300, planning.length);
vrai('⛔ l’en-tête porte « Voir sur la carte » quand la carte est repliée, et le touche comme le bouton flottant',
  /\$\{planCarteActive\(\)\?'':`<button class="btn ghost plan-carte-tete" onclick="planDispSet\('cote'\)">Voir sur la carte<\/button>`\}/.test(planning));
vrai('… entre « Journal » et « ＋ Intervention » — un bouton SECONDAIRE (la ligne des gris, pas celle du bouton plein)',
  /Journal<\/button> \$\{planCarteActive\(\)[\s\S]*?\+ Intervention|Journal<\/button> \$\{planCarteActive\(\)[\s\S]*?＋ Intervention/.test(planning) && /btn ghost plan-carte-tete/.test(planning));
const sites = (SRC.match(/<button class="plm-fab" onclick="planDispSet\('cote'\)"/g) || []).length;
vrai('les deux boutons flottants existent toujours (vue multi et autres vues) : c’est le CSS qui décide où', sites === 2, sites);

console.log('\n── 781 · 5. l’en-tête de la carte tient au téléphone ──');
const env = regle('html[data-refonte] .plm-mbar .filters{ padding:0; -webkit-mask-image:none; mask-image:none; overflow:visible; }');
vrai('⛔ « Satellite » n’hérite plus du rembourrage NI du fondu des rangées de filtres qui défilent', !!env && /max-width:780px/.test(env.media), env && env.media);
const sp = regle('.plm-mbar .plm-mb-sp{ display:none; }');
vrai('… l’écarteur ne pousse plus une rangée qui passe de toute façon à la ligne', !!sp && sp.media === (env && env.media));
const serre = regle('html[data-refonte] .plm-mbar .btn.sm{ padding:0 10px!important; }');
vrai('… et les boutons se serrent d’un cran (une vraie marge de 390 à 430 px)', !!serre && serre.media === (env && env.media));

console.log('\n── 781 · 6. la mesure de bout en bout existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-flottants.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-flottants.js existe', !!SONDE);
vrai('… elle TOUCHE pour de vrai (Input.dispatchTouchEvent), elle n’appelle pas la fonction', /Input\.dispatchTouchEvent/.test(SONDE) && /touchStart/.test(SONDE));
vrai('… elle exige la carte ENTIÈRE entre la barre du haut et la barre d’onglets', /q\.top>=h-1 && q\.bottom<=b\+1/.test(SONDE));
vrai('… dans les vues semaine, jour et mois', /\['semaine','jour','mois'\]/.test(SONDE));
vrai('… elle regarde l’ouverture ET le bas de page, et compte sa population', /window\.scrollTo\(0,1e6\)/.test(SONDE) && /regardeesBas/.test(SONDE) && /population/.test(SONDE));
/* Leia retirée le 23 septembre 2026 : la bulle n'est plus « connue et comptée à part », son compte
   DOIT être zéro — et la sonde vérifie qu'il n'y a plus de bulle du tout dans la page. */
vrai('⛔ … la bulle d’assistance n’est plus tolérée : zéro commande cachée par elle, et plus de bulle dans la page',
  /c\.par!=='bulle'/.test(SONDE) && /!parBulle\.length/.test(SONDE) && /document\.querySelector\('#assistant, \.fab'\)/.test(SONDE));
vrai('⛔ … et pas la barre du HAUT (`.creer-btn`) : du contenu qui défile sous une barre fixe n’est pas caché',
  !/const FLOTTANTS='[^']*creer-btn/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-781 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
