/* ══ LES COMMANDES DES TABLEAUX GARDENT LEUR PLANCHER, LES CHIFFRES DES FICHES TIENNENT (v734) ══
   Trouvé le 23 septembre 2026 en préparant les captures de l'écran « Équipe » pour Justin :

   1. Le ✎ d'une ligne de tableau mesurait 16 px de haut au téléphone — Techniciens, Devis,
      Contrats. L'exception `html[data-refonte] #content .tbl button{min-height:0}` (et sa jumelle
      dans les fenêtres) avait été écrite pour défaire le plancher des boutons NUS dans un tableau ;
      mais un identifiant pèse plus que trois classes, et elle retirait aussi leur plancher aux
      `.btn.sm`. Aucun audit ne pouvait le voir : tous écartaient `.tbl` de leur population.
   2. Les chiffres compacts des fiches Client et Technicien étaient écrits à 22 px EN LIGNE et
      portés à 34 px par le `!important` de la refonte : « 1540h30 » et « 10 288,06 € » sortaient
      de leur carte.

   Ce banc relit le CSS et le HTML réels d'app.html ET de beta.html. La mesure au navigateur est
   `scratchpad/sonde-boutons-tableaux.js` (11 contrôles, contre-épreuve sur la bêta d'avant :
   10 commandes à 16 px, deux chiffres qui sortent).                                            */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* Spécificité d'un sélecteur simple (sans virgule) : [identifiants, classes/attributs/pseudo-classes, éléments].
   `:not(x)` compte comme x — c'est la règle CSS. Assez pour les sélecteurs de ce fichier. */
function specificite(sel) {
  let s = sel, a = 0, b = 0, c = 0;
  s = s.replace(/:not\(([^()]*)\)/g, (m, x) => { const r = specificite(x); a += r[0]; b += r[1]; c += r[2]; return ' '; });
  a += (s.match(/#[\w-]+/g) || []).length;
  b += (s.match(/\.[\w-]+|\[[^\]]*\]|:(?!:)[\w-]+/g) || []).length;
  c += (s.replace(/\[[^\]]*\]/g, ' ').match(/(^|[\s>+~])[a-z][\w-]*/gi) || []).length;
  return [a, b, c];
}
const plusFort = (x, y) => x[0] !== y[0] ? x[0] > y[0] : x[1] !== y[1] ? x[1] > y[1] : x[2] > y[2];

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══');
  const BRUT = fs.readFileSync(path.join(RACINE, f), 'utf8');
  const SRC = nu(BRUT);
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  console.log('\n── 785 · 1. ⛔⛔ l’exception des tableaux ne défait QUE le plancher des boutons nus ──');
  /* toutes les règles qui remettent min-height à 0 sur un bouton de tableau */
  const regles = [...SRC.matchAll(/([^{}]*\.tbl button[^{}]*)\{([^}]*)\}/g)].filter(m => /min-height:0/.test(m[2]));
  vrai('population : les deux exceptions (contenu, fenêtres) sont trouvées', regles.length === 2, regles.map(m => m[1].trim().slice(-90)));
  const selecteurs = regles.flatMap(m => m[1].split(',').map(x => x.trim()).filter(x => /\.tbl button/.test(x)));
  vrai('… et elles portent sur #content et sur .modal', selecteurs.some(x => /#content \.tbl button/.test(x)) && selecteurs.some(x => /\.modal \.tbl button/.test(x)), selecteurs);
  const EXCLUS = [':not(.btn)', ':not(.chip)', ':not(.tab)', ':not(.pf-b)'];
  const sansExclusion = selecteurs.filter(x => !EXCLUS.every(e => x.includes(e)));
  vrai('⛔⛔ chacune écarte `.btn`, `.chip`, `.tab`, `.pf-b` — ceux qui ont leur propre plancher', sansExclusion.length === 0, sansExclusion);
  /* le plancher qu'elles défont : même liste d'exclusions, mot pour mot */
  const plancher = (SRC.match(/html\[data-refonte\] #content button(:not\([^)]*\))+/) || [''])[0];
  vrai('population : le plancher des boutons nus de #content est trouvé', !!plancher, plancher);
  vrai('… et l’exception exclut au moins ce qu’il exclut (hors `.tabbar *`, qui n’est jamais dans un tableau)',
    (plancher.match(/:not\([^)]*\)/g) || []).filter(x => x !== ':not(.tabbar *)').every(x => selecteurs.every(s => s.includes(x))));
  /* ⛔ une exception pèse un identifiant : sans les exclusions, elle battait le plancher de .btn.sm */
  const pBtnSm = specificite('html[data-refonte] .btn.sm');
  const excContenu = selecteurs.find(x => /#content/.test(x)) || '';
  vrai('la raison du défaut, gardée : l’exception de #content pèse plus que `html[data-refonte] .btn.sm`', plusFort(specificite(excContenu), pBtnSm), specificite(excContenu));

  console.log('\n── 785 · 2. ⛔ les chiffres des fiches Client et Technicien : leur taille, et la place ──');
  const helpers = [...SRC.matchAll(/const k=\(ic,bg,val,lbl\)=>`([^`]*)`;/g)].map(m => m[1]);
  vrai('population : les deux fabriques de chiffres compacts sont trouvées', helpers.length === 2, helpers.length);
  vrai('⛔ toutes deux posent la classe `kpi kpi-fiche`', helpers.every(h => /<div class="kpi kpi-fiche"/.test(h)));
  vrai('… et plus aucune taille EN LIGNE sur le chiffre (un style en ligne ne gagne pas contre un `!important`)', helpers.every(h => /<div class="kpi-val">\$\{val\}<\/div>/.test(h)));
  const regleVal = (SRC.match(/html\[data-refonte\] \.kpi\.kpi-fiche \.kpi-val\{([^}]*)\}/) || [])[1] || '';
  vrai('⛔ la règle des chiffres compacts existe, à 22 px et en `!important`', /font-size:22px!important/.test(regleVal), regleVal);
  vrai('… elle bat la règle générale de la refonte (34 px)', plusFort(specificite('html[data-refonte] .kpi.kpi-fiche .kpi-val'), specificite('html[data-refonte] .kpi-val')));
  vrai('… et ce qui dépasserait encore passe à la ligne au lieu d’être coupé', /overflow-wrap:anywhere/.test(regleVal));
  vrai('la carte peut rétrécir dans sa grille (min-width:0)', /html\[data-refonte\] \.kpi\.kpi-fiche\{min-width:0\}/.test(SRC));
  for (const [nom, debut] of [['ficheTech', 'function ficheTech('], ['ficheClient', 'function ficheClient(']]) {
    const i = SRC.indexOf(debut), j = SRC.indexOf('\nfunction ', i + 10);
    const corps = i >= 0 ? SRC.slice(i, j > i ? j : i + 8000) : '';
    vrai('population : ' + nom + ' est trouvée', corps.length > 500, corps.length);
    const grille = (corps.match(/<div class="kpis" style="grid-template-columns:repeat\(auto-fit,minmax\((\d+)px,1fr\)\)/) || [])[1];
    vrai('⛔ ' + nom + ' : la grille donne au moins 140 px par chiffre (« 10 288,06 € » à 22 px en demande 139)', +grille >= 140, grille);
    vrai('… et ' + nom + ' fabrique ses chiffres par la fabrique compacte', /\$\{k\('/.test(corps));
  }
}

console.log('\n── 785 · 3. la mesure dans une vraie page existe ──');
const P = path.join(RACINE, 'scratchpad', 'sonde-boutons-tableaux.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-boutons-tableaux.js existe', !!SONDE);
vrai('… elle mesure les boutons des tableaux au doigt ET à la souris', /#content \.tbl button/.test(SONDE) && /TÉLÉPHONE/.test(SONDE) && /BUREAU/.test(SONDE));
vrai('… avec des valeurs longues, et elle compte sa population', /\\d\{4\}h\\d\{2\}/.test(SONDE) && /population/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-785 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
