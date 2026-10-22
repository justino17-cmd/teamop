/* ══ test-2853 · LES TROIS RESTES DE L'AUDIT APPLE-DESIGN (partie Z) ═══════════════════════════════════════════════════════════════
   1. Un champ « required » laissé vide : la bulle du navigateur arrêtait l'envoi avant notre code (54 champs, 30 formulaires).
      Le navigateur lève « invalid » sur chaque champ en défaut AVANT d'abandonner l'envoi : un écouteur en capture l'empêche,
      retient les champs du même essai et les passe d'un coup à champManque, le message nommé par le libellé du champ.
   2. Six gestes du tableau de bord appelaient views.dashboard() nu : la barre « Reprendre » disparaissait. Ils passent par
      tdbRedessiner — rendreVueSure, puis la place où l'on était.
   3. Deux menus écrits en ligne (le choix d'une box dans Mouvements, le menu du pied) posaient leur fond par onmouseover, que
      le toucher d'un iPhone déclenche et laisse collé. Une classe porte le survol (à la souris seulement) et l'appui.
   Ce banc EXÉCUTE les vraies fonctions d'app.html dans un bac à sable ; la preuve dans la page, au doigt et à la souris, jour
   et nuit : scratchpad/sonde-partie-z.js (41 ✓ sur iPhone et sur Mac ; sur la bêta d'avant, 16 ✗ et 18 ✗).                   */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
/* le code sans les commentaires qui commencent une ligne (la parade de CLAUDE.md : un motif vise du code, jamais une phrase) */
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const entre = (a, b) => { const i = CODE.indexOf(a), j = i < 0 ? -1 : CODE.indexOf(b, i + a.length); return i < 0 || j < 0 ? '' : CODE.slice(i, j); };

console.log('\n── 2853 · 1. un champ obligatoire vide passe par champManque, pas par la bulle du navigateur ──');
{
  const src = entre('function champInvalideMessage(', 'function champManque(');
  vrai('(population) le bloc de l’écouteur est trouvé', src.length > 300 && /addEventListener\('invalid'/.test(src), src.length);
  const ecouteurs = [], appels = [];
  const bac = { document: { addEventListener: (type, fn, capture) => ecouteurs.push({ type, fn, capture }) }, queueMicrotask,
    champManque: (msg, ...champs) => { appels.push({ msg, champs }); return false; } };
  vm.createContext(bac); vm.runInContext(src, bac);
  const e = ecouteurs.find(x => x.type === 'invalid');
  vrai('un écouteur « invalid » est posé sur le document, EN CAPTURE (« invalid » ne remonte pas)', !!e && e.capture === true, ecouteurs.map(x => [x.type, x.capture]));
  const champ = (o) => Object.assign({ nodeType: 1, placeholder: '', validationMessage: 'Veuillez renseigner ce champ.', validity: { valueMissing: true },
    getAttribute: (k) => (o.attrs || {})[k] || null, closest: (sel) => sel === '.field' && o.label !== undefined ? { querySelector: (q) => q === 'label' ? { textContent: o.label } : null } : null }, o);
  const evt = (cible) => { const x = { target: cible, empeche: false, preventDefault() { this.empeche = true; } }; return x; };
  const nom = champ({ label: 'Nom / Raison sociale *' }), mail = champ({ label: 'Email', validity: { valueMissing: false, typeMismatch: true }, validationMessage: 'Adresse incorrecte' });
  (async () => {
    const e1 = evt(nom), e2 = evt(mail);
    e.fn(e1); e.fn(e2);
    vrai('⛔ la bulle est empêchée sur CHAQUE champ en défaut (preventDefault)', e1.empeche && e2.empeche, [e1.empeche, e2.empeche]);
    vrai('rien n’est désigné tant que le navigateur n’a pas fini de lever ses « invalid »', appels.length === 0, appels.length);
    await Promise.resolve();
    vrai('⛔ puis champManque est appelé UNE fois, avec tous les champs du même essai', appels.length === 1 && appels[0].champs.length === 2 && appels[0].champs[0] === nom && appels[0].champs[1] === mail, appels.map(a => [a.msg, a.champs.length]));
    vrai('le message nomme le PREMIER champ par son libellé, sans l’astérisque : « « Nom / Raison sociale » est obligatoire »', appels[0] && appels[0].msg === '« Nom / Raison sociale » est obligatoire', appels[0] && appels[0].msg);
    appels.length = 0; e.fn(evt(mail)); await Promise.resolve();
    vrai('un champ mal rempli (pas vide) : son libellé et ce que dit le navigateur', appels.length === 1 && appels[0].msg === '« Email » : Adresse incorrecte', appels[0] && appels[0].msg);
    appels.length = 0; e.fn(evt(champ({ attrs: { 'aria-label': 'Code postal' } }))); await Promise.resolve();
    vrai('sans libellé : son nom accessible (aria-label)', appels[0] && appels[0].msg === '« Code postal » est obligatoire', appels[0] && appels[0].msg);
    appels.length = 0; e.fn(evt(champ({}))); await Promise.resolve();
    vrai('sans rien pour le nommer : le message du navigateur', appels[0] && appels[0].msg === 'Veuillez renseigner ce champ.', appels[0] && appels[0].msg);
    appels.length = 0; e.fn(evt(nom)); await Promise.resolve(); e.fn(evt(mail)); await Promise.resolve();
    vrai('deux essais successifs : deux désignations, chacune avec ses champs (le lot se vide)', appels.length === 2 && appels[0].champs.length === 1 && appels[1].champs.length === 1, appels.map(a => a.champs.length));
    const muet = evt({ nodeType: 3 }); e.fn(muet);
    vrai('un nœud qui n’est pas un élément est laissé au navigateur', !muet.empeche, muet.empeche);
    /* et la vraie champManque sait recevoir ce qu'on lui passe : elle désigne le premier et marque tous (test-2850 le joue) */
    vrai('champManque reçoit les champs à la suite du message (sa signature)', /function champManque\(msg,\.\.\.champs\)\{/.test(CODE));
    deux();
  })();
}

function deux() {
  console.log('\n── 2853 · 2. les six gestes du tableau de bord le redessinent par rendreVueSure, sur place ──');
  /* de tdbRedessiner jusqu'à la fin de la ligne de dashReset (les commentaires sont déjà retirés : une ancre en commentaire ne se trouverait pas) */
  const i0 = CODE.indexOf('function tdbRedessiner('), i1 = CODE.indexOf('function dashReset(', i0), i2 = i1 < 0 ? -1 : CODE.indexOf('\n', i1);
  const src = (i0 < 0 || i2 < 0 ? '' : CODE.slice(i0, i2)) + '\n' + (CODE.match(/function tdbPorteeSet\([^)]*\)\{[^\n]*\}/) || [''])[0];
  vrai('(population) tdbRedessiner, les cinq dash* et tdbPorteeSet sont trouvés', ['tdbRedessiner', 'dashToggleEdit', 'dashRemove', 'dashMove', 'dashAdd', 'dashReset', 'tdbPorteeSet'].every(n => src.includes('function ' + n + '(')), src.length);
  const journal = [];
  const content = { scrollTop: 340 };
  const bac = { $: (id) => id === 'content' ? content : null, window: { scrollY: 520, scrollTo: (x, y) => { bac.window.scrollY = y; journal.push('scrollTo ' + y); } },
    rendreVueSure: (v) => { journal.push('rendreVueSure ' + v); content.scrollTop = 120; bac.window.scrollY = 120; },
    views: { dashboard: () => journal.push('views.dashboard') }, save: () => journal.push('save'), localStorage: { setItem: () => {} },
    db: { dashLayout: ['a', 'b', 'c'] }, DASH_DEFAULT: ['a', 'b', 'c', 'd'], dashLayout: () => bac.db.dashLayout, dashEdit: false };
  vm.createContext(bac); vm.runInContext(src.replace(/^function dashLayout[^\n]*$/m, ''), bac);
  bac.tdbRedessiner();
  vrai('tdbRedessiner passe par rendreVueSure(\'dashboard\') — la seule fonction qui écrit l’écran (barre « Reprendre », segInit, kpiTailler)', journal[0] === 'rendreVueSure dashboard', journal);
  vrai('⛔ … puis rend la place où l’on était (la barre « Reprendre » rend le défilement du dernier départ : 120 au lieu de 520 / 340)', bac.window.scrollY === 520 && content.scrollTop === 340, [bac.window.scrollY, content.scrollTop]);
  for (const [nom, appel] of [['dashToggleEdit', 'dashToggleEdit()'], ['dashRemove', "dashRemove('b')"], ['dashMove', "dashMove('a',1)"], ['dashAdd', "dashAdd('d')"], ['dashReset', 'dashReset()'], ['tdbPorteeSet', "tdbPorteeSet('14')"]]) {
    journal.length = 0; vm.runInContext(appel, bac);
    vrai('⛔ ' + nom + ' redessine par tdbRedessiner, jamais par views.dashboard() nu', journal.includes('rendreVueSure dashboard') && !journal.includes('views.dashboard'), journal);
  }
  vrai('…et plus aucun appel nu dans le code (hors commentaires)', !/views\.dashboard\(\)\s*;/.test(CODE.replace(/views\.dashboard\s*=\s*function/g, '')), (CODE.match(/[^\n]{0,60}views\.dashboard\(\)\s*;[^\n]{0,20}/g) || []).slice(0, 3));
  trois();
}

function trois() {
  console.log('\n── 2853 · 3. les deux menus écrits en ligne : le survol à la souris seulement, l’appui partout ──');
  const n = (CODE.match(/\sonmouseover\s*=/g) || []).length;
  vrai('⛔ plus aucun onmouseover dans le code (il posait un fond que le toucher laissait collé)', n === 0, n);
  const rang = (CODE.match(/const rangBox=[^\n]*/) || [''])[0], pied = (CODE.match(/const it=\(ic,l,fn,danger\)=>[^\n]*/) || [''])[0];
  vrai('(population) les deux gabarits sont trouvés (le choix d’une box, le menu du pied)', rang.length > 100 && pied.length > 100, [rang.length, pied.length]);
  vrai('la ligne de box porte la classe ligne-choix (teinte, et « on » quand elle est choisie) et plus de fond en ligne', /class="ligne-choix teinte\$\{on\?' on':''\}"/.test(rang) && !/background:/.test(rang.split('>')[0]) && !/onmouseout/.test(rang), rang.slice(0, 200));
  vrai('la ligne du menu du pied porte la classe ligne-choix, et plus de fond en ligne', /class="ligne-choix"/.test(pied) && !/this\.style\.background/.test(pied), pied.slice(0, 200));
  const FEUILLE = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
  const R = C.regles(FEUILLE).filter(r => /\.ligne-choix/.test(r.sel));
  const survols = R.filter(r => /:hover/.test(r.sel)), appui = R.filter(r => /:active/.test(r.sel)), choisi = R.filter(r => /\.on\b/.test(r.sel) && !/:hover|:active/.test(r.sel));
  vrai('(population) les règles de la classe sont trouvées (' + R.length + ')', R.length >= 3, R.map(r => r.sel));
  vrai('⛔ chaque survol de ligne-choix vit sous (hover:hover) — un doigt ne le déclenche pas', survols.length >= 2 && survols.every(r => r.media.some(m => /hover\s*:\s*hover/.test(m))), survols.map(r => [r.sel, r.media]));
  vrai('… et ne touche pas la ligne choisie (:not(.on))', survols.every(r => /:not\(\.on\)/.test(r.sel)), survols.map(r => r.sel));
  vrai('l’appui se voit partout, tout de suite (voile de la teinte, --d-0), hors de tout média', appui.length >= 1 && appui.some(r => !r.media.length && r.decls.some(d => d.p === 'box-shadow' && /inset/.test(d.v)) && r.decls.some(d => d.p === 'transition-duration' && /--d-0/.test(d.v))), appui.map(r => [r.sel, r.media, r.decls]));
  vrai('la ligne choisie garde sa teinte (9 %), hors de tout média', choisi.some(r => !r.media.length && r.decls.some(d => /^background/.test(d.p) && /9%/.test(d.v))), choisi.map(r => r.decls));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
}
