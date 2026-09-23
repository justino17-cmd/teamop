/* ══════════════════════════════════════════════════════════════════════════════════════
   test-773 — LES NEUF TEINTES, ÉCRAN PAR ÉCRAN : UNE ENCRE DE TEXTE, DES ENCRES D'APLAT

   22 septembre 2026, étape 3 de « 1 après 2 après 3 ». scratchpad/audit-teintes.js rend les
   42 rubriques ET sept fenêtres (pastilles cochées) sous les 9 teintes × 2 thèmes — 756 écrans
   et 126 fenêtres — et mesure chaque texte contre son VRAI fond (fonds translucides composés
   jusqu'à un fond opaque). Premier passage : 850 contrastes sous le seuil. Trois familles :

   1. 327 endroits écrivaient leur TEXTE en `var(--acc)` — la couleur d'un aplat, pas d'une
      lettre : l'indigo de nuit à 2,90:1, le bleu 3,95, l'orange de jour 2,95… Ils écrivent
      `--acc-txt`, et celle-ci est ramenée au-dessus de 4,5 partout, teintes comprises (de jour
      32 % de noir au lieu de 26 ; orange et cyan 46 ; de nuit, l'indigo 34 % de blanc).
   2. Le rouge et l'orange de NUIT sont des encres éclaircies — impropres à porter du blanc :
      2,69:1 pour la pastille de la cloche sur les 42 rubriques, 2,06 pour les méthodes et les
      indices cochés. D'où `--red-fill` / `--on-red` et `--org-fill` / `--on-org`.
   3. Des aplats d'accent écrivaient `#fff` en dur dans un ordre que la règle de rattrapage ne
      reconnaît pas (prestations, nuisibles) : 1,09:1 sur le graphite de nuit. Et les couleurs
      d'identité (technicien, « à répartir ») portaient du blanc sans le vérifier : l'encre se
      CALCULE désormais (`encreSur`).
   Troisième passage : voir REPRISE.md (les restes, s'il y en a, y sont nommés).

   4. Sous le verre (Mac, jour), une FENÊTRE laissait passer le voile de #overlay : son fond réel,
      lu au pixel, était un gris moyen (204,211,211). Elle prend la vitre dense de la barre.

   ⛔ `encreSur` est EXTRAITE de la page et EXÉCUTÉE sur la palette réelle des techniciens.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  /* ── 1. l'accent comme encre de texte ── */
  const encres = (SRC.match(/var\(--acc-txt\)/g) || []).length;
  vrai('population : l’encre de texte de l’accent est employée largement', encres > 250, encres + ' emplois');
  const restes = [...SRC.matchAll(/(?<![-\w])color:\s*var\(--acc\)(?=[;}\s!"'`])/g)].length;
  vrai('⛔ plus AUCUN texte écrit en var(--acc) (la couleur d’un aplat)', restes === 0, restes + ' restants');
  const ternaires = [...SRC.matchAll(/color:\$\{[^}]{0,40}'var\(--acc\)'/g)].length
                  + [...SRC.matchAll(/color:'\+\([^)]{0,30}'var\(--acc\)'/g)].length;
  vrai('⛔ … ni par un choix en ligne (color:${on?\'var(--acc)\'…})', ternaires === 0, ternaires + ' restants');
  vrai('⛔ de jour, l’encre descend à 32 % de noir (sur les teintes à 12–14 % aussi)',
    /html\[data-refonte\]\[data-theme="light"\]\[data-accent\]\{[\s\S]{0,300}--acc-txt:color-mix\(in srgb,#000 32%,var\(--acc-src\)\);/.test(SRC));
  vrai('⛔ l’orange et le cyan de jour (46 %, mesurés au pixel sous le verre), l’indigo de nuit : un cran de plus',
    /\[data-theme="light"\]\[data-accent="orange"\]\{ --acc-txt:color-mix\(in srgb,#000 46%,var\(--acc-src\)\); \}/.test(SRC)
    && /\[data-theme="light"\]\[data-accent="teal"\]  \{ --acc-txt:color-mix\(in srgb,#000 46%,var\(--acc-src\)\); \}/.test(SRC)
    && /\[data-theme="dark"\]\[data-accent="indigo"\] \{ --acc-txt:color-mix\(in srgb,#fff 34%,var\(--acc-src\)\); \}/.test(SRC));
  vrai('… et ces surcharges viennent APRÈS le bloc de jour qu’elles corrigent (même spécificité)',
    SRC.indexOf('[data-accent="orange"]{ --acc-txt:') > SRC.indexOf('html[data-refonte][data-theme="light"][data-accent]{'));

  /* ── 2. les aplats rouge et orange ont leur encre ── */
  vrai('⛔ les jetons d’aplat existent (rouge, orange) avec leur encre',
    /html\[data-refonte\]\{ --red-fill:var\(--red\); --on-red:#FFFFFF; --org-fill:var\(--org\); --on-org:#FFFFFF;[^}]*\}/.test(SRC));
  /* depuis le 23 septembre, l'aplat rouge de nuit se fonce depuis SA teinte d'origine (#EF7C72) :
     l'encre rouge, elle, a été éclaircie pour se lire, et un aplat qui la suivrait ne porterait
     plus le blanc (test-774) */
  vrai('⛔ de nuit : le rouge se FONCE pour le blanc, l’orange prend une encre sombre',
    /html\[data-refonte\]\[data-theme="dark"\]\{ --red-fill:color-mix\(in srgb,#000 30%,#EF7C72\); --on-org:#2A1304;[^}]*\}/.test(SRC));
  vrai('⛔ la pastille de la cloche (les 42 rubriques)', /\.bell-count\{[^}]*background:var\(--red-fill,var\(--red\)\);color:var\(--on-red,#fff\)/.test(SRC));
  vrai('⛔ plus aucun rouge plein avec du blanc en dur', !/background:var\(--red\)\s*(!important)?;\s*(border-color:var\(--red\)\s*!important;)?color:#fff/.test(SRC));
  vrai('⛔ le « Non » choisi des questionnaires (trois écritures + la fiche)',
    (SRC.match(/\(no\?'var\(--red-fill,var\(--red\)\)':'var\(--bg2\)'\)\+';color:'\+\(no\?'var\(--on-red,#fff\)'/g) || []).length === 3
    && /\(!on\?'var\(--red-fill,var\(--red\)\)':'var\(--bg2\)'\)\+';color:'\+\(!on\?'var\(--on-red,#fff\)'/.test(SRC));
  vrai('⛔ le niveau d’infestation : chaque niveau son aplat ET son encre',
    /const col=o==='Faible'\?'var\(--acc-fill\)':o==='Moyen'\?'var\(--org-fill,var\(--org\)\)':'var\(--red-fill,var\(--red\)\)'; const ink=o==='Faible'\?'var\(--on-fill\)':o==='Moyen'\?'var\(--on-org,#fff\)':'var\(--on-red,#fff\)';/.test(SRC)
    && /background:'\+\(on\?col:'var\(--bg2\)'\)\+';color:'\+\(on\?ink:'var\(--t2\)'\)/.test(SRC));
  vrai('⛔ les méthodes (pill) : l’orange et son encre',
    /function pill\(label,on,onclick\)\{[^\n]*color:\$\{on\?'var\(--on-org,#fff\)':'var\(--t2\)'\};background:\$\{on\?'var\(--org-fill,var\(--org\)\)'/.test(SRC));
  vrai('⛔ les indices du Compte-rendu : l’orange et son encre',
    /function renderRapIndices\(\)\{[\s\S]{0,500}color:\$\{on\?'var\(--on-org,#fff\)':'var\(--t2\)'\};background:\$\{on\?'var\(--org-fill,var\(--org\)\)'/.test(SRC));

  /* ── 3. les aplats d'accent en style direct ── */
  vrai('⛔ les prestations du Compte-rendu : aplat --acc-fill, encre --on-fill',
    /function renderRapPresta\(\)\{[\s\S]{0,900}color:\$\{on\?'var\(--on-fill\)':'var\(--t2\)'\};background:\$\{on\?'var\(--acc-fill\)'/.test(SRC));
  vrai('⛔ les nuisibles de l’Intervention : la pastille, son bouton et sa croix',
    /background:\$\{on\?'var\(--acc-fill\)':'var\(--bg2\)'\}"><button type="button" onclick="pickNuis\(/.test(SRC)
    && /onclick="pickNuis\('\$\{ne\}'\)" style="[^"]*color:\$\{on\?'var\(--on-fill\)':'var\(--t2\)'\}"/.test(SRC)
    && /unpickNuis\('\$\{ne\}'\)" style="[^"]*color:var\(--on-fill\);/.test(SRC));

  /* ── 4. la couleur d'une personne : l'encre se calcule ── */
  vrai('⛔ UNE SEULE définition d’encreSur (une seconde, ajoutée puis retirée le même jour, remplaçait l’autre pour toute la page)',
    (SRC.match(/function encreSur\(/g) || []).length === 1);
  const m = SRC.match(/function encreSur\(hex\)\{([\s\S]*?)\n\}/);
  vrai('population : encreSur est trouvée', !!m);
  if (m) {
    const encreSur = new Function('hex', m[1]);
    const pal = SRC.match(/const TECH_PALETTE16=\[([^\]]+)\]/);
    const P = pal ? pal[1].match(/#[0-9A-Fa-f]{6}/g) : [];
    vrai('population : la palette des techniciens est lue (16 teintes)', P.length === 16, P.length + '');
    const lum = h => { const n = parseInt(h.slice(1), 16), l = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); };
      return .2126 * l(n >> 16 & 255) + .7152 * l(n >> 8 & 255) + .0722 * l(n & 255); };
    const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
    const couleurs = P.concat(['#E8A33D']);
    const choix = couleurs.map(c => ({ c, e: encreSur(c), r: ctr(c, encreSur(c)), autre: ctr(c, encreSur(c) === '#FFFFFF' ? '#12202F' : '#FFFFFF') }));
    vrai('⛔ sur les 16 teintes ET l’orange « à répartir », l’encre choisie est la MEILLEURE des deux',
      choix.every(x => x.r >= x.autre), choix.filter(x => x.r < x.autre).map(x => x.c).join(', '));
    const sous = choix.filter(x => x.r < 4.5);
    vrai('   … et tient 4,5:1 partout, sauf le cyan #0891B2 (4,41 — aucune des deux encres n’y arrive mieux)',
      sous.length <= 1 && sous.every(x => x.c === '#0891B2' && x.r > 4.4), sous.map(x => x.c + ' ' + x.r.toFixed(2)).join(', '));
    vrai('   … l’orange « à répartir » prend l’encre SOMBRE (le blanc y tombait à 2,16)', encreSur('#E8A33D') === '#12202F');
    vrai('   … un vert profond garde le blanc', encreSur('#1E7A4E') === '#FFFFFF');
  }
  vrai('⛔ les cases du planning général posent leur encre (--ci) à côté de leur couleur',
    /const cc=planCardColor\(i\); cel\+=`<div class="pg-pt \$\{dense\?'mini':''\}" style="--cc:\$\{cc\};--ci:\$\{encreSur\(cc\)\}"/.test(SRC)
    && /\.pg-pt\{[^}]*color:var\(--ci,#fff\);/.test(SRC));
  vrai('⛔ les numéros de tournée aussi, « à répartir » compris',
    /<span class="pn" style="background:\$\{techColor\(t\.id\)\};color:\$\{encreSur\(techColor\(t\.id\)\)\}">/.test(SRC));

  /* ── 5. une fenêtre en verre, de jour : la vitre DENSE ── */
  vrai('⛔ de jour, la fenêtre en verre prend la vitre DENSE (le voile de #overlay passait à travers : texte secondaire à 3,56, pastille à 2,91)',
    /html\[data-verre="1"\]\[data-theme="light"\] \.modal\{\s*background:var\(--vr-reflet\),var\(--vr-fond-dense\)!important;\s*\}/.test(SRC));
  const dense = SRC.match(/--vr-fond-dense:color-mix\(in srgb,var\(--acc-src,#1E8450\) (\d+)%,rgba\(255,255,255,\.(\d+)\)\);/);
  vrai('   … et cette vitre dense de jour est bien un blanc épais (≥ 85 %), pas la vitre des cartes',
    !!dense && +('.' + dense[2]) >= .85, dense ? dense[0] : 'jeton introuvable');
  vrai('   … la nuit n’y touche pas (5,04 mesuré sous la vitre ordinaire)',
    !/html\[data-verre="1"\]\[data-theme="dark"\] \.modal\{\s*background:var\(--vr-reflet\),var\(--vr-fond-dense\)/.test(SRC));
}

console.log('\n═══ test-773 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
