/* ══ h01 · UNE FICHE RENDUE DANS UNE FENÊTRE NE COMPTE QUE TANT QUE LA FENÊTRE EST OUVERTE (robustesse#7) ═══════════════
   `ficheClient` enregistre son redessin par `ecranDetail(...)` (« une synchro ne doit pas refermer la fiche ouverte »), et RIEN
   ne le défaisait à la fermeture de la fenêtre. Mesuré (beta.html, 17 octobre 2026, Chromium piloté) :
       openModal(fiche) → closeModal() → refreshEcran()  ⇒  #overlay.open = true.
   `refreshEcran()` est appelé à chaque synchro d'équipe et au remplacement d'une base en retard : la fiche que la personne venait
   de fermer se rouvrait toute seule par-dessus la liste. Et comme la fiche fermée restait « l'écran rendu », la règle de retour
   « fiche ouverte → retour à la liste » (lot g14, `retourFerme`) avalait le retour système suivant.

   Ce banc EXÉCUTE les vraies `ecranDetail`, `ecranFenetreFermee`, `refreshEcran` et `closeModal` d'app.html, et lit le CODE des
   trois appelants (fiche client = fenêtre ; fiche intervention et box = plein écran : elles ne changent pas).
   Le geste sur le vrai navigateur : scratchpad/gestion/correctifs/h01/sonde-fiche.js.                                      */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR (CLAUDE.md) : seuls les blocs qui COMMENCENT une ligne */
const NU = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut, src) {
  src = src || BRUT; const i = src.indexOf(debut); if (i < 0) return '';
  let j = src.indexOf('{', i), p = 0;
  for (let k = j; k < src.length; k++) { const c = src[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return src.slice(i, k + 1); } }
  return '';
}
const iE = BRUT.indexOf('let _ecranRendu=null;'), jE = BRUT.indexOf('/* Le sens imposé par un geste');
const ECRAN = iE > 0 && jE > iE ? BRUT.slice(iE, jE) : '';
const CLOSE = bloc('function closeModal(force){');

console.log('\n── 1401 · 0. la population ──');
vrai('le bloc ecranDetail / refreshEcran est trouvé', ECRAN.length > 300 && /function refreshEcran\(\)/.test(ECRAN) && /function ecranFenetreFermee\(\)/.test(ECRAN), ECRAN.length);
vrai('closeModal natif est trouvé', CLOSE.length > 100);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)', ['function ecranDetail(', 'function ecranFenetreFermee(', 'function refreshEcran(', 'function closeModal('].map(n => BRUT.split(n).length - 1), [1, 1, 1, 1]);

/* ── le bac à sable : les vraies fonctions, un overlay qui a une classList, des vues espionnes ── */
function monde() {
  const classes = new Set();
  const ov = { classList: { contains: c => classes.has(c), add: (...a) => a.forEach(c => classes.add(c)), remove: (...a) => a.forEach(c => classes.delete(c)) } };
  const ctx = { console, JSON, Set, Object, Array, __appels: [], __ov: ov, __classes: classes };
  vm.createContext(ctx);
  vm.runInContext(`
    var currentUser={id:'u1'}, current='clients', views={clients(){ __appels.push('liste'); }, intDetail(){ __appels.push('liste-int'); }};
    var $=id=>id==='overlay'?__ov:null, _modalForcee=false, _pp=null, scanTimer=null, scanStream=null;
    function stopBoxScanCamera(){} function clearInterval(){}
    ${ECRAN}
    ${CLOSE}
    function ouvrir(){ __ov.classList.add('open'); }
    function fiche(nom,opts){ opts=opts||{}; const f=()=>{ __appels.push(nom); if(opts.jette) throw new Error('x'); if(opts.reouvre) ouvrir(); }; return f; }
  `, ctx);
  return ctx;
}
const ex = (W, c) => vm.runInContext(c, W);
const appels = W => { const a = W.__appels.slice(); W.__appels.length = 0; return a; };

console.log('\n── 1401 · 1. la fiche client (fenêtre) ──');
let W = monde();
ex(W, "var F=fiche('fiche',{reouvre:true}); ecranDetail(F,true); ouvrir();");
ex(W, 'refreshEcran()');
v('fiche OUVERTE + synchro : la fiche est redessinée (c\'est le rôle d\'ecranDetail) et rien d\'autre', appels(W), ['fiche']);
ex(W, 'closeModal()');
v('⛔ la fenêtre est fermée', W.__classes.has('open'), false);
ex(W, 'refreshEcran()');
v('⛔⛔ fiche FERMÉE + synchro : la fiche n\'est PAS redessinée (donc pas rouverte), la liste l\'est', appels(W), ['liste']);
v('   et l\'écran rendu est levé', ex(W, '_ecranRendu'), null);
v('   la fenêtre reste fermée', W.__classes.has('open'), false);

console.log('\n── 1401 · 2. fermée sans passer par closeModal (classe retirée à la main) : le filet de refreshEcran ──');
W = monde();
ex(W, "ecranDetail(fiche('fiche',{reouvre:true}),true); ouvrir(); __ov.classList.remove('open');");
ex(W, 'refreshEcran()');
v('⛔ pas de fiche ressuscitée', appels(W), ['liste']);
W = monde();
ex(W, "ecranDetail(fiche('fiche',{reouvre:true}),true); ouvrir(); __ov.classList.add('ferme');");
ex(W, 'refreshEcran()');
v('⛔ fenêtre « en fermeture » (open ET ferme, la règle de g01) : pas redessinée non plus', appels(W), ['liste']);

console.log('\n── 1401 · 3. le détail PLEIN ÉCRAN ne change pas ──');
W = monde();
ex(W, "ecranDetail(fiche('intervention')); ouvrir();");
ex(W, 'closeModal(); refreshEcran()');
v('⛔ une fenêtre fermée (ex. la feuille de statut) NE lève PAS le détail plein écran', appels(W), ['intervention']);
ex(W, 'refreshEcran()');
v('   la synchro continue de le redessiner', appels(W), ['intervention']);

console.log('\n── 1401 · 4. la fiche client ouverte AU-DESSUS d\'un détail plein écran ──');
W = monde();
ex(W, "ecranDetail(fiche('intervention')); ecranDetail(fiche('fiche',{reouvre:true}),true); ouvrir();");
ex(W, 'refreshEcran()');
v('fiche ouverte : c\'est elle que la synchro redessine', appels(W), ['fiche']);
ex(W, 'closeModal(); refreshEcran()');
v('⛔ fiche refermée : la synchro redessine L\'INTERVENTION (ni liste, ni fiche rouverte)', appels(W), ['intervention']);
v('   la fenêtre reste fermée', W.__classes.has('open'), false);
W = monde();
ex(W, "ecranDetail(fiche('intervention')); ecranDetail(fiche('f1'),true); ecranDetail(fiche('f2'),true); ouvrir();");
ex(W, 'closeModal(); refreshEcran()');
v('⛔ une fiche redessinée par la synchro (nouveau closure) recouvre toujours LE MÊME détail dessous', appels(W), ['intervention']);

console.log('\n── 1401 · 5. gardes ──');
W = monde();
ex(W, "ecranDetail(fiche('intervention')); ecranDetail(fiche('fiche'),true); ouvrir(); _ecranRendu=null;");
ex(W, 'closeModal(); refreshEcran()');
v('⛔ un go() entre-temps (il met _ecranRendu à null) : fermer la fenêtre ne ressuscite PAS le détail d\'avant', appels(W), ['liste']);
W = monde();
ex(W, "ecranDetail(fiche('fiche'),true); ouvrir(); _modalForcee=true;");
ex(W, 'closeModal(); refreshEcran()');
v('une fenêtre OBLIGATOIRE refuse de se fermer : elle garde son redessin', appels(W), ['fiche']);
ex(W, 'closeModal(true); refreshEcran()');
v('   fermée de force, elle le lève', appels(W), ['liste']);
W = monde();
ex(W, "ecranDetail(fiche('fiche',{jette:true}),true); ouvrir();");
ex(W, 'refreshEcran()');
v('un redessin qui plante retombe sur la liste (comportement d\'avant, conservé)', appels(W), ['fiche', 'liste']);
v('   et l\'écran rendu est levé', ex(W, '_ecranRendu'), null);
W = monde();
ex(W, 'closeModal(); refreshEcran()');
v('aucune fiche : fermer une fenêtre ne casse rien', appels(W), ['liste']);

console.log('\n── 1401 · 6. les trois appelants dans le CODE d\'app.html ──');
const fc = bloc('function ficheClient(id){', NU);
vrai('la fiche client est trouvée', fc.length > 200);
vrai('⛔⛔ ficheClient se déclare comme détail de FENÊTRE : ecranDetail(…, true)', /ecranDetail\(\(\)=>ficheClient\(id\),\s*true\)/.test(fc));
const reste = NU.replace(fc, ' ');
const appelants = [...reste.matchAll(/ecranDetail\(([^;\n]*)\)/g)].map(m => m[1]).filter(a => !/^fn[,)]/.test(a));
vrai('les autres appelants (intervention, box) restent PLEIN ÉCRAN : aucun ne passe le drapeau', appelants.length >= 2 && appelants.every(a => !/,\s*true\s*$/.test(a)), appelants);
vrai('⛔ closeModal lève le détail de fenêtre (ecranFenetreFermee)', /ecranFenetreFermee\(\)/.test(bloc('function closeModal(force){', NU)));
vrai('go() lève toujours l\'écran rendu en changeant de rubrique', /_ecranRendu\s*=\s*null;\s*\/\/ on quitte le détail/.test(NU) || /_ecranRendu\s*=\s*null;/.test(bloc('function go(view){', NU)));

console.log('\n══ 1401 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
console.log(ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
