/* ══ v756 — LA FEUILLE NE FAIT PLUS RESTYLER TOUTE LA PAGE ══════════════════════════════════════════════════
   Justin, 26 septembre 2026 : « fais-le » — la lenteur sur une grosse base, avec un téléphone lent. Mesuré sur la
   bêta (base « façon ELAN » de 696 Ko, processeur ralenti ×4) : le code d'un écran coûte 20 à 30 ms, le NAVIGATEUR
   qui recalcule les styles en coûte deux à cinq fois plus. Le tableau de bord n'a que 118 éléments et coûtait 67 ms
   de styles par dessin — autant que Factures avec 700 : c'est la page ENTIÈRE qu'on restylait.
   La cause, prouvée règle par règle (scratchpad/perf-has-glouton.js : chaque règle `:has()` neutralisée à son tour,
   les éléments restylés comptés sur des gestes réels, au téléphone puis au bureau) :
   1. `body.rf-onglets:has(#msg-flot[style*="flex"]) …` — un `:has()` qui lit un attribut `style`, ancré sur `body` :
      CHAQUE écriture de style en ligne, n'importe où, faisait restyler la page. Mesuré (perf-ecriture-style.js) :
      31,7 ms et 605 éléments par écriture ; sans lui, 1,4 ms et 69. La bulle de la barre d'onglets écrit un style
      à chaque mouvement du doigt. Et la règle ne s'appliquait JAMAIS (OP MESSAGES fermée). → une CLASSE, posée par
      renderMsgFlottant(), le seul écrivain de ce style, avec le même booléen.
   2. L'ancienne liste des interventions en cartes (`.card[draggable][style*="padding:15px 16px;…"]`) et les
      « lignes de liste à avatar » (`.card[onclick]:has(> div > .avatar)`) : plus AUCUN gabarit ne les produit — 0
      élément visé sur 44 écrans — mais leurs `:has()` coûtaient 1 617 (bureau) et ~2 000 (téléphone) restylages.
      Règles mortes, retirées.
   3. La carte d'accueil du courrier : les règles dont la cible est DANS la carte portaient `:has()` pour rien (viser
      un élément de la carte, c'est déjà dire qu'elle est là) — la plus lourde visait `.rf-ic`, posée partout.
   Au total, sur huit gestes au téléphone : 8 595 éléments restylés → voir REPRISE.md pour l'après, mesuré.
   ⛔ Ce banc lit le CODE (commentaires retirés par la forme sûre — seuls les blocs qui commencent une ligne) et
   EXÉCUTE renderMsgFlottant. La preuve que l'écran n'a pas bougé d'un pixel est au navigateur :
   scratchpad/sonde-styles-identiques.js compare le style calculé de CHAQUE élément, ancienne bêta contre nouvelle. */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* les sélecteurs de toutes les feuilles <style>, commentaires CSS retirés (dans une feuille, un commentaire n'avale
   rien : il n'y a pas de gabarit JavaScript à l'intérieur) */
function selecteurs(page) {
  const css = [...page.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
  return [...css.matchAll(/([^{}]+)\{/g)].map(m => m[1].trim().replace(/\s+/g, ' ')).filter(s => s && !s.startsWith('@'));
}
/* les arguments de chaque :has( … ), parenthèses imbriquées comprises */
function argumentsHas(sel) {
  const out = []; let i = 0;
  for (;;) { const j = sel.indexOf(':has(', i); if (j < 0) break;
    let k = j + 5, d = 1; while (k < sel.length && d) { if (sel[k] === '(') d++; else if (sel[k] === ')') d--; k++; }
    out.push(sel.slice(j + 5, k - 1)); i = k; }
  return out;
}

for (const f of ['app.html', 'beta.html']) {
  const BRUT = fs.readFileSync(path.join(RACINE, f), 'utf8'), CODE = nu(BRUT), SEL = selecteurs(BRUT);
  console.log(`\n── 823 · 1. ${f} — aucun :has() ne lit un attribut « style » ──`);
  const avecHas = SEL.filter(s => s.includes(':has('));
  vrai('population : la feuille est lue en entier (plus de 3 000 sélecteurs, dont des :has())', SEL.length > 3000 && avecHas.length >= 30, { sel: SEL.length, has: avecHas.length });
  const lisentStyle = avecHas.filter(s => argumentsHas(s).some(a => /\[style/.test(a)));
  v('⛔⛔ aucun `:has(… [style…] …)` : il se réévalue à CHAQUE écriture de style en ligne de la page', lisentStyle, []);

  console.log(`\n── 823 · 2. ${f} — le message et le rappel du matin suivent le bouton d’OP MESSAGES par une classe ──`);
  v('⛔ plus de `:has(#msg-flot` dans la feuille', SEL.filter(s => s.includes(':has(#msg-flot')), []);
  vrai('la règle vit : `body.rf-onglets.msg-flot-on` remonte le message ET le rappel (+80 px)',
    /html\[data-refonte\] body\.rf-onglets\.msg-flot-on \.toast,\s*html\[data-refonte\] body\.rf-onglets\.msg-flot-on #fdr-banner\{bottom:calc\(var\(--tabh\) \+ 80px\)!important\}/.test(BRUT));
  vrai('… et la place d’ordinaire reste à +10 px (le trou de 56 px ne revient pas)',
    /body\.rf-onglets \.toast\{bottom:calc\(var\(--tabh\) \+ 10px\)!important/.test(BRUT) && /body\.rf-onglets #fdr-banner\{bottom:calc\(var\(--tabh\) \+ 10px\)!important\}/.test(BRUT));
  const i0 = CODE.indexOf('function renderMsgFlottant(){'), corps = i0 < 0 ? '' : CODE.slice(i0, CODE.indexOf('\n}', i0) + 2);
  vrai('population : renderMsgFlottant est trouvée', corps.length > 60, corps.length);
  /* on l'EXÉCUTE : un faux document, les deux états du bouton */
  const jouer = on => { const cls = new Set(), b = { style: {} };
    const document = { getElementById: id => id === 'msg-flot' ? b : null, body: { classList: { toggle: (c, x) => { if (x) cls.add(c); else cls.delete(c); } } } };
    new Function('document', 'msgFlottantOn', corps + '\nrenderMsgFlottant();')(document, () => on);
    return { display: b.style.display, classe: cls.has('msg-flot-on') }; };
  v('⛔ bouton affiché : display flex ET la classe posée', jouer(true), { display: 'flex', classe: true });
  v('⛔ bouton caché : display none ET la classe retirée (le même booléen, jamais deux décisions)', jouer(false), { display: 'none', classe: false });
  v('   le style de #msg-flot n’a qu’UN écrivain (sinon la classe pourrait mentir)',
    (CODE.match(/getElementById\('msg-flot'\)|\$\('msg-flot'\)/g) || []).length, 1);

  console.log(`\n── 823 · 3. ${f} — les familles mortes ne reviennent pas, et on sait pourquoi elles étaient mortes ──`);
  v('⛔ plus de `:has(> div > .avatar)` (les lignes de liste à avatar)', SEL.filter(s => s.includes(':has(> div > .avatar)')), []);
  v('⛔ plus de règle sur `.card[draggable]` au style en ligne de l’ancienne liste', SEL.filter(s => /\.card\[draggable\]/.test(s)), []);
  /* la preuve qu'elles ne peignaient rien : aucun gabarit ne produit ces structures. Le jour où un écran les
     refabrique, ce banc le dit — et il faudra réécrire la règle SANS le :has() qui coûtait. */
  vrai('   aucun gabarit n’écrit le style en ligne « padding:15px 16px;margin-bottom:12px »',
    !/style="padding:15px 16px;margin-bottom:12px/.test(CODE));
  vrai('   aucun gabarit ne fabrique une carte cliquable avec un avatar en petit-enfant',
    !/class="card[^"]*"[^>]*onclick[^>]{0,300}>\s*<div[^>]*>\s*(?:<[^>]+>\s*)?<(?:span|div) class="avatar/.test(CODE)
    && !/<div\b[^>]*\bonclick=[^>]*\bclass="card\b[^"]*"[^>]{0,300}>\s*<div[^>]*>\s*(?:<[^>]+>\s*)?<(?:span|div) class="avatar/.test(CODE));

  console.log(`\n── 823 · 4. ${f} — la carte d’accueil du courrier : :has() seulement pour ses ancêtres ──`);
  const dansCarte = SEL.filter(s => /#mail-list > \.card/.test(s) && !/^html\[data-refonte\] #mail-app:has\(#mail-list > \.card\)$/.test(s));
  const internes = dansCarte.filter(s => /#mail-app(:has\([^)]*\))? #mail-list > \.card/.test(s));
  vrai('population : les sept règles de l’intérieur de la carte sont là', internes.length >= 7, internes.length);
  v('⛔ aucune ne porte plus `:has()` (viser la carte, c’est déjà dire qu’elle est là)', internes.filter(s => s.includes(':has(')), []);
  vrai('   leurs déclarations n’ont pas bougé (l’icône à 31 px, le titre à 21 px, le bouton à 48 px)',
    /#mail-app #mail-list > \.card > div:first-child \.rf-ic\{\s*width:31px;height:31px;stroke-width:1\.5\}/.test(BRUT)
    && /#mail-app #mail-list > \.card > div:nth-child\(2\)\{\s*font-size:21px!important/.test(BRUT)
    && /#mail-app #mail-list > \.card \.btn\{\s*min-height:48px/.test(BRUT));
  const ancetres = SEL.filter(s => /^html\[data-refonte\] #mail-app:has\(#mail-list > \.card\)( #mail-(side|pane|mid)( > div:first-child)?)?$/.test(s.split(',')[0].trim()));
  vrai('   les ancêtres (le volet, ses colonnes) gardent leur :has() — lui seul voit la carte depuis au-dessus', ancetres.length >= 4, ancetres.length);
}

console.log('\n── 823 · 5. la preuve au navigateur existe ──');
for (const s of ['perf-has-glouton.js', 'perf-ecriture-style.js', 'sonde-styles-identiques.js', 'sonde-selecteurs-equivalents.js', 'perf-lenteur.js'])
  vrai('scratchpad/' + s, fs.existsSync(path.join(RACINE, 'scratchpad', s)));

console.log(`\n════ test-823 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
