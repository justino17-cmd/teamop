/* ══════════════════════════════════════════════════════════════════════════════════════
   test-774 — LES NEUF TEINTES, QUATRIÈME PASSE : TOUS LES TEXTES, PAS SEULEMENT L'ACCENT

   23 septembre 2026, suite de l'étape 3. Les trois premières passes de
   scratchpad/audit-teintes.js ne mesuraient que les textes ÉCRITS EN ACCENT. La teinte colore
   pourtant aussi les SURFACES : la page de jour est teintée à 7 % par l'accent, les vitres à
   4 %, les sélections à 14 %. La quatrième passe (FAM=tout) mesure les 61 571 textes des
   756 écrans et 126 fenêtres, avec et sans verre. Sans verre (composition exacte) : 2 349
   sous le seuil, en six familles, toutes gardées ici :

   1. le texte secondaire (--t3) posé sur la page teintée de jour : 4,14 à 4,48 selon la
      teinte — le sous-titre de CHAQUE rubrique ;
   2. les couleurs sémantiques de jour en pastille à 13 % sur cette page : l'orange à 3,98,
      le rouge à 3,62 (pire teinte : graphite) ;
   3. les couleurs de DONNÉES écrites en texte — catégories, fournisseurs, types, sources :
      1,64:1 de jour (« Désinfection »), 1,58:1 de nuit (« MABI ») ;
   4. du blanc posé sur une couleur qui peut être claire (états des postes d'appâtage, photos
      avant/après, histogramme, couleur d'entreprise dans les documents imprimés) ;
   5. l'accent passé comme encre de texte À TRAVERS UNE VARIABLE (const col='var(--acc)'),
      que le motif de la première passe ne pouvait pas voir ;
   6. des « pas encore » écrits en grisé (2,1:1 pour « Il reste 7 lignes à confirmer »), un ▼
      à 50 %, un astérisque en rouge écrit en dur.

   ⛔ `encreDonnee`, `aplatDe` et `encreSur` sont EXTRAITES de la page et EXÉCUTÉES ; les
   contrastes sont CALCULÉS depuis les jetons lus dans la page, pas recopiés.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
const lum = ([r, g, b]) => { const f = v => { v /= 255; return v <= .03928 ? v / 12.92 : Math.pow((v + .055) / 1.055, 2.4); }; return .2126 * f(r) + .7152 * f(g) + .0722 * f(b); };
const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };
const mix = (a, b, p) => a.map((v, i) => v * p + b[i] * (1 - p));          // p = part de a

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const BRUT = fs.readFileSync(path.join(RACINE, f), 'utf8');
  const SRC = nu(BRUT);
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  /* ── les jetons, lus dans la page ── */
  const srcJour = {};
  for (const m of SRC.matchAll(/html\[data-refonte\]\[data-accent="(\w+)"\]\s*\{ --acc-src:(#[0-9A-Fa-f]{6});/g)) srcJour[m[1]] = m[2];
  vrai('population : les neuf teintes et leur source sont lues', Object.keys(srcJour).length === 9, Object.keys(srcJour).join(','));
  const mBg = SRC.match(/html\[data-refonte\]\[data-theme="light"\]\{[\s\S]{0,1600}?--bg:color-mix\(in srgb,var\(--acc-src,#[0-9A-F]{6}\) (\d+)%,(#[0-9A-F]{6})\);/);
  vrai('population : la formule de la page de jour est lue (teinte × %, base)', !!mBg);
  const pages = mBg ? Object.values(srcJour).map(s => mix(hex(s), hex(mBg[2]), +mBg[1] / 100)) : [];

  /* ── 1. le texte secondaire sur la page teintée ── */
  const t3 = [...SRC.matchAll(/--t1:#0A1020; --t2:#39485E; --t3:(#[0-9A-F]{6});/g)].map(m => m[1]);
  vrai('les deux blocs de jour (explicite et automatique) portent le même --t3', t3.length === 2 && t3[0] === t3[1], t3.join(' / '));
  if (t3.length && pages.length) {
    const pire = Math.min(...pages.map(p => ctr(hex(t3[0]), p)));
    vrai('⛔ --t3 de jour tient 4,5:1 sur la page teintée, pour les NEUF teintes (pire : ' + pire.toFixed(2) + ')', pire >= 4.5);
  }
  vrai('   … et le chevron des listes déroulantes (écrit en dur, une URL ne lit pas de variable) suit la même valeur',
    t3.length && SRC.includes("stroke='%23" + t3[0].slice(1) + "'"));

  /* ── 2. les couleurs sémantiques de jour, en pastille à 13 % sur la page ── */
  /* le bloc de la REFONTE (<html data-refonte> est écrit dans la page) : les anciens blocs de
     jour, plus haut, portent d'autres valeurs et ne s'appliquent plus */
  const iJour = SRC.indexOf('html[data-refonte][data-theme="light"]{');
  const sem = iJour > 0 ? SRC.slice(iJour, iJour + 6000).match(/--org:(#[0-9A-F]{6}); --red:(#[0-9A-F]{6}); --green:(#[0-9A-F]{6}); --blue:(#[0-9A-F]{6}); --purple:(#[0-9A-F]{6});/) : null;
  vrai('population : la page est bien servie en refonte (<html data-refonte>)', /<html lang="fr" data-refonte>/.test(BRUT));
  vrai('population : les cinq encres sémantiques de jour sont lues', !!sem);
  if (sem && pages.length) {
    const noms = ['orange', 'rouge', 'vert', 'bleu', 'violet'];
    const res = sem.slice(1).map((c, i) => [noms[i], Math.min(...pages.map(p => Math.min(ctr(hex(c), p), ctr(hex(c), mix(hex(c), p, .13)))))]);
    vrai('⛔ chacune tient 4,5:1 en pastille à 13 % sur la page teintée, neuf teintes',
      res.every(([, v]) => v >= 4.5), res.map(([n, v]) => n + ' ' + v.toFixed(2)).join(', '));
    vrai('   … et porte encore du blanc quand elle devient un aplat',
      sem.slice(1).every(c => ctr(hex(c), [255, 255, 255]) >= 4.5));
  }

  /* ── la rubrique active et les aplats ── */
  vrai('⛔ l’encre de la rubrique active suit l’encre de texte de l’accent (jour ET nuit — ses exceptions comprises)',
    (SRC.match(/^  --side-active-ink:var\(--acc-txt\);$/gm) || []).length === 2);
  vrai('⛔ le bleu a son aplat et son encre (jour : blanc ; nuit : encre sombre)',
    /--blue-fill:var\(--blue\); --on-blue:#FFFFFF; \}/.test(SRC) && /\[data-theme="dark"\]\{[^}]*--on-blue:#0B1426; \}/.test(SRC));

  /* ── 3. encreDonnee, aplatDe, encreSur : extraites et exécutées ── */
  const mES = SRC.match(/function encreSur\(hex\)\{([\s\S]*?)\n\}/);
  const mED = SRC.match(/function encreDonnee\(c\)\{([\s\S]*?)\n\}/);
  const mAP = SRC.match(/const APLATS=(\{[\s\S]*?\});\nfunction aplatDe\(c\)\{ return APLATS\[c\]\|\|\[c,encreSur\(c\)\]; \}/);
  vrai('population : encreSur, encreDonnee et aplatDe sont trouvées', !!(mES && mED && mAP));
  if (mES && mED && mAP) {
    const encreSur = new Function('hex', mES[1]);
    const encreDonnee = new Function('c', mED[1]);
    const APLATS = eval('(' + mAP[1] + ')');
    const aplatDe = c => APLATS[c] || [c, encreSur(c)];
    vrai('encreDonnee : l’accent (un aplat) rend son encre de texte', encreDonnee('var(--acc)') === 'var(--acc-txt)');
    vrai('encreDonnee : une encre sémantique passe telle quelle', encreDonnee('var(--org)') === 'var(--org)' && encreDonnee('var(--t3)') === 'var(--t3)');
    vrai('encreDonnee : une couleur de donnée se mêle à moitié à l’encre du thème', encreDonnee('#EF9F27') === 'color-mix(in srgb,#EF9F27 50%,var(--t1))');
    vrai('encreDonnee : rien → le texte secondaire', encreDonnee('') === 'var(--t2)');
    /* le mélange réel, contre les deux thèmes, sur les huit catégories ET les fournisseurs */
    const CAT = SRC.match(/const CAT_COLORS=(\{[^}]+\});/), FOUR = SRC.match(/const FOUR_COLORS=(\{[^}]+\});/);
    vrai('population : les couleurs des catégories et des fournisseurs sont lues', !!(CAT && FOUR));
    if (CAT && FOUR) {
      const couleurs = [...Object.values(eval('(' + CAT[1] + ')')), ...Object.values(eval('(' + FOUR[1] + ')'))];
      const THEMES = { jour: { t1: '#0A1020', fond: '#FFFFFF' }, nuit: { t1: '#EFF2F7', fond: '#101A2E' } };
      for (const [nom, T] of Object.entries(THEMES)) {
        const pire = Math.min(...couleurs.map(c => { const ink = mix(hex(c), hex(T.t1), .5);
          return Math.min(ctr(ink, hex(T.fond)), ctr(ink, mix(hex(c), hex(T.fond), .18))); }));
        vrai('⛔ ' + nom + ' : le texte d’une catégorie ou d’un fournisseur tient 4,5:1, sur la carte ET sur sa pastille à 18 % (pire ' + pire.toFixed(2) + ')', pire >= 4.5);
      }
    }
    vrai('aplatDe : chaque jeton sémantique a son couple fond / encre',
      aplatDe('var(--acc)')[1] === 'var(--on-fill)' && aplatDe('var(--red)')[1] === 'var(--on-red,#fff)'
      && aplatDe('var(--org)')[1] === 'var(--on-org,#fff)' && aplatDe('var(--blue)')[1] === 'var(--on-blue,#fff)'
      && aplatDe('var(--acc-txt)')[0] === 'var(--acc-fill)');
    vrai('aplatDe : une couleur libre prend l’encre qui contraste le mieux (jaune → encre sombre)', aplatDe('#F2C94C')[1] === '#12202F');
    /* encreSur lit aussi hsl() : la couleur d'un département en est une */
    const e1 = encreSur('hsl(40 22% 55%)'), e2 = encreSur('hsl(220 80% 25%)');
    vrai('⛔ encreSur lit hsl() — un gris-beige moyen prend l’encre sombre, un bleu nuit le blanc', e1 === '#12202F' && e2 === '#FFFFFF', e1 + ' / ' + e2);
    vrai('   … et garde son comportement sur un hexadécimal', encreSur('#E8A33D') === '#12202F' && encreSur('#1E7A4E') === '#FFFFFF');
  }

  /* ── 4. plus de blanc en dur sur une couleur variable, hors pastilles d'avatar ── */
  const blancs = [...SRC.matchAll(/background:\$\{[^}]{1,80}\}[^"'`]{0,120}?color:#fff\b/gi)].map(m => SRC.slice(Math.max(0, m.index - 140), m.index + 10));
  const horsAvatar = blancs.filter(x => !/class="avatar"/.test(x));
  vrai('⛔ plus de « color:#fff » après un fond variable (les pastilles .avatar sont reprises par encreLisible)', horsAvatar.length === 0,
    horsAvatar.map(x => x.replace(/\s+/g, ' ').slice(0, 70)).join(' | '));
  vrai('⛔ les états d’un poste d’appâtage (pastille + deux fiches) prennent aplat ET encre',
    (SRC.match(/\$\{cur\.etat===k\?`background:\$\{aplatDe\(c\)\[0\]\}/g) || []).length === 2
    && /border-radius:50%;background:\$\{aplatDe\(col\)\[0\]\};color:\$\{aplatDe\(col\)\[1\]\}/.test(SRC));
  vrai('⛔ les documents imprimés : le blanc sur la couleur d’entreprise devient l’encre qui contraste',
    /th\{background:\$\{CO\};color:\$\{encreSur\(CO\)\};/.test(SRC) && /\.ttc\{[^}]*background:\$\{acc\};color:\$\{encreSur\(acc\)\};/.test(SRC));

  /* ── 5. l'accent comme encre, à travers une variable ── */
  vrai('⛔ « terminée » écrit son statut en encre de texte (il sert de liseré ET de libellé)',
    /const INT_STCOLOR = \{[^}]*terminee:'var\(--acc-txt\)'/.test(SRC) && !/terminee:'var\(--acc\)'/.test(SRC));
  const styleAcc = (SRC.match(/\.style\.color=[^;\n]{0,90}'var\(--acc\)'/g) || []);
  vrai('⛔ plus aucun .style.color qui reçoit l’accent', styleAcc.length === 0, styleAcc.join(' | '));
  vrai('⛔ les couleurs de catégorie et de fournisseur ne sont plus écrites telles quelles en texte',
    !/color:\$\{col\}">\$\{esc\(cat\)\}/.test(SRC) && !/function fourBadge\(f\)\{ const c=fourColor\(f\); return `<span style="font-size:10px;font-weight:700;color:\$\{c\};/.test(SRC));

  /* ── 6. le grisé, le ▼, l'astérisque ── */
  vrai('⛔ « Il reste N lignes à confirmer » n’est plus grisé à 45 % : c’est un bouton secondaire lisible',
    !/env\.style\.opacity=reste\?'\.45'/.test(SRC) && /env\.classList\.toggle\('ghost',!!reste\);/.test(SRC)
    && !/class="btn" style="width:100%;margin-top:10px;opacity:\.45;cursor:not-allowed"/.test(SRC));
  vrai('⛔ le ▼ des filtres n’est plus à 50 % d’opacité', !/opacity:\.5;font-size:9px">▼/.test(SRC));
  vrai('⛔ l’astérisque des champs obligatoires suit le rouge du thème', !/color:#EF4444">\*/.test(SRC) && !/req='color:#EF4444/.test(SRC));
}

console.log('\n═══ test-774 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
