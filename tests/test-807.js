/* ══ LE THÈME « LOGO OP GESTION » — LE TROISIÈME CHOIX ════════════════════════════════════════
   Justin, 24 septembre 2026 au soir, le logo OP GESTION à l'appui : « montre-moi un thème avec ce
   style en couleur du logo, mais ne l'applique pas » ; puis, sur les captures, le troisième choix
   (« montre-moi les thèmes en lien, que je voie — 2 et 3 on voit après »). Il vit à côté de
   TEAM OP et d'OP GESTION dans « Thème et couleur », et ne change rien pour qui ne le choisit pas.

   Ce banc garde quatre accords, et il les RELIT dans la feuille — aucune couleur n'est recopiée
   ici : un banc qui recopie des valeurs garde une croyance, un banc qui relit la source garde un
   accord (CLAUDE.md, `test-759`).
   1. Le thème PART d'OP GESTION : les deux blocs du § 3 portent son sélecteur, et le § 3 bis vient
      APRÈS eux (à force égale, c'est le dernier écrit qui parle).
   2. Chaque encre tient sur ce qu'elle touche — page, vitre, barre d'onglets, bulle, et les deux
      moitiés de la tuile d'en-tête — de jour comme de nuit. Calculé ici ; au pixel, sous le vrai
      flou, par `scratchpad/audit-pixel.js` (MARQUE=logo).
   3. La tuile d'en-tête : la découpe n'existe que si le navigateur sait la peindre (`@supports`),
      la date a sa propre coupe, recalée sur celle de la tuile, et la tuile prend toute la rangée
      d'un téléphone — sur un iPhone de 430 px, la règle du § 12 la serrait à 238 px et le titre
      passait sur deux lignes (mesuré le 25 septembre 2026).
   4. ⛔ LA COUPE PASSE DANS L'ESPACE AVANT LE DERNIER MOT — MESURÉE. En pixels fixes, elle
      dépendait de la police : « bord » commençait à 235 px dans le navigateur de test, une
      trentaine de pixels plus tôt avec une police de la famille d'Helvetica comme le SF Pro de
      l'iPhone. `logoCoupe()` la mesure sur le vrai titre ; on l'EXÉCUTE ici contre une page
      simulée, et `scratchpad/sonde-logo.js` la mesure au navigateur, sur cinq largeurs. */
const fs = require('fs');
const APP = fs.readFileSync(__dirname + '/../app.html', 'utf8');
/* nettoyage SÛR (blocs qui commencent une ligne) : un motif ne doit jamais viser un commentaire */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (lib, c, det) => { if (c) { ok++; console.log('  ✓ ' + lib); } else { ko++; console.log('  ✗ ' + lib + (det !== undefined ? '  → ' + det : '')); } };

/* Toutes les règles d'un sélecteur EXACT (suivi de « { »), dans l'ordre de la feuille. */
const regles = sel => { const out = []; let i = -1; while ((i = NU.indexOf(sel + '{', i + 1)) >= 0) out.push({ i, corps: NU.slice(i + sel.length + 1, NU.indexOf('}', i)) }); return out; };
/* la dernière déclaration d'une règle n'a pas toujours son « ; » : on s'arrête aussi en fin de corps */
const jetons = corps => { const o = {}; corps.replace(/(--[\w-]+)\s*:\s*([^;]+)(?:;|$)/g, (_, k, v) => { o[k] = v.trim(); }); return o; };
const fusion = sel => regles(sel).reduce((o, r) => Object.assign(o, jetons(r.corps)), {});

/* Couleurs : #hex, rgba(), et var(--x) résolu dans un dictionnaire de jetons. */
const resoudre = (v, env) => { let n = 0; while (/var\(--[\w-]+\)/.test(v) && n++ < 10) v = v.replace(/var\((--[\w-]+)\)/g, (_, k) => env[k] || ''); return v.trim(); };
const couleur = v => {
  let m = /^#([0-9a-f]{6})$/i.exec(v); if (m) { const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 1]; }
  m = /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+))?\s*\)$/.exec(v); if (m) return [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]];
  return null; };
const sur = (h, b) => [0, 1, 2].map(k => h[k] * h[3] + b[k] * (1 - h[3])).concat(1);
const lum = c => { const f = x => { x /= 255; return x <= .03928 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4); }; return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2]); };
const ctr = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); };

console.log('\n── 1. Le thème est déclaré, et part d’OP GESTION');
const mi = NU.indexOf('const MARQUES = {'), mf = NU.indexOf('\n};', mi);
vrai('la liste des thèmes est trouvée', mi > 0 && mf > mi);
const MARQUES = new Function('return ' + NU.slice(mi + 'const MARQUES = '.length, mf + 2))();
vrai('⛔ trois thèmes : TEAM OP, OP GESTION et Logo', JSON.stringify(Object.keys(MARQUES)) === '["teamop","opgestion","logo"]', Object.keys(MARQUES).join(','));
const L = MARQUES.logo || {};
vrai('   … Logo porte un nom, une ligne d’explication, ses deux couleurs', !!L.l && !!L.sous && /^#[0-9A-F]{6}$/i.test(L.clair) && /^#[0-9A-F]{6}$/i.test(L.fonce), JSON.stringify(L));
const ai = NU.indexOf('const ACCENTS = {'), ACCENTS = new Function('return ' + NU.slice(ai + 'const ACCENTS = '.length, NU.indexOf('};', ai) + 1))();
vrai('⛔ sa teinte est une teinte qui EXISTE (sinon --acc-src vide : treize jetons morts)', !!ACCENTS[L.accent], L.accent);
const fa = (NU.match(/function marqueApercu\(M\)\{[^\n]*\n/) || [''])[0];
vrai('la pastille d’un thème vient d’UNE fonction', fa.length > 30 && (NU.match(/function marqueApercu\(/g) || []).length === 1);
const marqueApercu = new Function(fa + '\nreturn marqueApercu;')();
vrai('   … Logo a la coupe de son logo (122°), pas celle d’OP GESTION', /^linear-gradient\(122deg/.test(marqueApercu(L)) && /158deg/.test(marqueApercu(MARQUES.opgestion)));
vrai('   … et les deux écrans qui la montrent passent par elle (Thème et couleur, Paramètres)',
  (NU.match(/class="tc-apercu" style="background:\$\{marqueApercu\(/g) || []).length === 2 && !/class="tc-apercu" style="background:linear-gradient/.test(NU));
const s3j = NU.indexOf('html[data-marque="logo"][data-verre][data-theme="light"],\nhtml[data-marque="opgestion"][data-verre][data-theme="light"]{');
const s3n = NU.indexOf('html[data-marque="logo"][data-verre][data-theme="dark"],\nhtml[data-marque="opgestion"][data-verre][data-theme="dark"]{');
vrai('⛔ les deux blocs d’OP GESTION (§ 3) servent aussi Logo', s3j > 0 && s3n > 0, s3j + ' / ' + s3n);
const bj = regles('html[data-marque="logo"][data-verre][data-theme="light"]'), bn = regles('html[data-marque="logo"][data-verre][data-theme="dark"]');
vrai('   … et le § 3 bis vient APRÈS eux (à force égale, c’est lui qui parle)', bj.length === 1 && bn.length === 1 && bj[0].i > s3j && bn[0].i > s3n);
vrai('les encres éclaircies sous la vitre verte de nuit valent aussi pour Logo',
  /html\[data-marque="logo"\]\[data-verre\]\[data-theme="dark"\]\[data-accent\],\nhtml\[data-marque="opgestion"\]\[data-verre\]\[data-theme="dark"\]\[data-accent\]\{/.test(NU)
  && /html\[data-marque="logo"\]\[data-verre\]\[data-theme="dark"\]\[data-accent="indigo"\],\nhtml\[data-marque="opgestion"\]\[data-verre\]\[data-theme="dark"\]\[data-accent="indigo"\]\{/.test(NU));

console.log('\n── 2. Chaque encre tient sur ce qu’elle touche (calculé ; au pixel : audit-pixel.js)');
const ENV0 = fusion('html[data-marque="logo"]');
const J = Object.assign({}, ENV0, jetons(bj[0] ? bj[0].corps : ''));
const N = Object.assign({}, ENV0, jetons(bn[0] ? bn[0].corps : ''));
const BARRE = jetons((regles('html[data-marque="logo"][data-refonte] .tabbar')[0] || {}).corps || '');
vrai('les jetons sont lus (population)', Object.keys(J).length > 20 && Object.keys(N).length > 15 && Object.keys(BARRE).length >= 3, Object.keys(J).length + ' / ' + Object.keys(N).length + ' / ' + Object.keys(BARRE).length);
const pages = v => (resoudre(v || '', ENV0).match(/#[0-9A-Fa-f]{6}/g) || []).map(couleur);
for (const [nom, T] of [['jour', J], ['nuit', N]]) {
  const P = pages(T['--vr-page']);
  vrai(nom + ' — la page porte les deux moitiés de la coupe (122°)', P.length === 2 && /122deg/.test(resoudre(T['--vr-page'], ENV0)), T['--vr-page']);
  const vitre = couleur(T['--vr-fond']);
  vrai(nom + ' — la vitre est lue', !!vitre, T['--vr-fond']);
  for (const k of ['--t1', '--t2', '--t3']) {
    const enc = couleur(T[k]);
    const pire = Math.min(...P.map(p => ctr(enc, p)), ...P.map(p => ctr(enc, sur(vitre, p))));
    vrai(nom + ' — ' + k + ' sur la page ET sur la vitre ≥ 4,5', pire >= 4.5, pire.toFixed(2));
  }
  /* la barre d'onglets : une île sombre, ses encres posées sur elle (§ 22) */
  const barre = couleur(T['--tf-barre']);
  const fondB = P.map(p => sur(barre, p));
  for (const k of ['--t1', '--t3']) {
    const enc = couleur(BARRE[k]); const pire = enc ? Math.min(...fondB.map(f => ctr(enc, f))) : 0;
    vrai(nom + ' — libellé d’onglet (' + k + ' de la barre) sur la barre ≥ 4,5', pire >= 4.5, pire.toFixed(2));
  }
  const bulle = couleur(resoudre(T['--tf-bulle'], ENV0)), onglet = couleur(resoudre(BARRE['--tf-onglet'] || '', ENV0));
  vrai(nom + ' — l’onglet choisi sur sa bulle ≥ 4,5', bulle && onglet && ctr(onglet, bulle) >= 4.5, bulle && onglet ? ctr(onglet, bulle).toFixed(2) : 'non lu');
}
/* la tuile d'en-tête : chaque moitié porte son encre */
const TJ = fusion('html[data-marque="logo"]'), TN = Object.assign({}, TJ, fusion('html[data-marque="logo"][data-theme="dark"]'));
for (const [nom, T] of [['jour', TJ], ['nuit', TN]]) {
  const c = k => couleur(resoudre(T[k] || '', T));
  const paires = [['--lg-encre-a', '--lg-tuile-a', 'le titre, côté clair'], ['--lg-encre-b', '--lg-tuile-b', 'le titre, côté foncé'],
    ['--lg-date-a', '--lg-tuile-a', 'la date, côté clair'], ['--lg-date-b', '--lg-tuile-b', 'la date, côté foncé']];
  for (const [e, f, lib] of paires) {
    const r = c(e) && c(f) ? ctr(c(e), c(f)) : 0;
    vrai(nom + ' — tuile : ' + lib + ' ≥ 4,5', r >= 4.5, r ? r.toFixed(2) : e + ' / ' + f + ' non lus');
  }
}
vrai('⛔ l’onglet choisi s’écrit en forêt QUELLE QUE SOIT la teinte, après les teintes',
  (() => { const i = NU.indexOf('html[data-marque="logo"][data-accent]{ --tf-onglet:var(--lg-foret); }'), d = NU.lastIndexOf('html[data-marque][data-accent="'); return i > 0 && i > d; })());

console.log('\n── 3. La tuile d’en-tête : taillée comme le logo, lisible partout');
const TUILE = 'html[data-marque="logo"] #page-head:has(.ph-surtitre) .ph-row > div:first-child';
const t0 = regles(TUILE);
vrai('la tuile est trouvée', t0.length >= 2, t0.length);
vrai('⛔ elle prend toute la rangée d’un téléphone, à force supérieure au § 12', /flex:1 1 100%!important/.test(t0[0] ? t0[0].corps : ''));
vrai('   … et sur un écran large, la place du titre plus le coin foncé', /@media \(min-width:600px\)\{\s*html\[data-marque="logo"\] #page-head:has\(\.ph-surtitre\) \.ph-row > div:first-child\{flex:0 0 auto!important; width:fit-content; padding-right:150px\}/.test(NU));
vrai('⛔ le repli sans découpe : une tuile claire, le texte à l’encre du côté clair', /background:var\(--lg-tuile-a\)/.test(t0[0] ? t0[0].corps : '')
  && /\.ph-row > div:first-child :is\(\.ph-title,\.ph-sub,\.ph-surtitre\)\{\s*color:var\(--lg-encre-a\)!important/.test(NU));
const sup = NU.indexOf('@supports ((-webkit-background-clip:text,border-box) or (background-clip:text,border-box)){');
const supF = sup > 0 ? NU.indexOf('\n}\n', sup) : -1, SUP = sup > 0 ? NU.slice(sup, supF) : '';
vrai('⛔ la découpe n’existe que si le navigateur sait la peindre (@supports à deux couches)', SUP.length > 400, SUP.length);
vrai('   … deux couches, même angle, même coupe : l’encre (au texte) puis la surface (au bord)',
  /linear-gradient\(var\(--lg-angle\),var\(--lg-encre-a\) 0 var\(--lg-coupe-titre\),var\(--lg-encre-b\) var\(--lg-coupe-titre\) 100%\) border-box,\s*linear-gradient\(var\(--lg-angle\),var\(--lg-tuile-a\) 0 var\(--lg-coupe-titre\),var\(--lg-tuile-b\) var\(--lg-coupe-titre\) 100%\) border-box;\s*-webkit-background-clip:text,border-box; background-clip:text,border-box;/.test(SUP));
vrai('   … le titre et l’entreprise laissent voir la couche d’encre', /:is\(\.ph-title,\.ph-sub\)\{\s*color:transparent!important; -webkit-text-fill-color:transparent!important;/.test(SUP));
vrai('⛔ la date a sa PROPRE couche, sur sa propre coupe', /\.ph-surtitre\{\s*background:linear-gradient\(var\(--lg-angle\),var\(--lg-date-a\) 0 var\(--lg-coupe-date\),var\(--lg-date-b\) var\(--lg-coupe-date\) 100%\);\s*-webkit-background-clip:text; background-clip:text;/.test(SUP));
/* la coupe de la date est celle de la tuile, recalée de la place de la date (bord + rembourrage),
   projetée sur l'angle : on la RECALCULE ici et on la compare à la formule écrite */
const cd = (t0[0] ? t0[0].corps : '').match(/--lg-coupe-date:calc\(var\(--lg-coupe-titre\) - \(1px \+ var\(--lg-pad-h\)\) \* ([\d.]+) - \(1px \+ var\(--lg-pad-v\)\) \* ([\d.]+)\);/);
const ang = parseFloat(resoudre(ENV0['--lg-angle'] || '', ENV0)) * Math.PI / 180;
vrai('   … recalée sur la tuile : sin et −cos de l’angle, à 0,001 près', !!cd && Math.abs(+cd[1] - Math.sin(ang)) < .001 && Math.abs(+cd[2] + Math.cos(ang)) < .001, cd ? cd[1] + ' / ' + cd[2] + ' pour ' + Math.sin(ang).toFixed(4) + ' / ' + (-Math.cos(ang)).toFixed(4) : 'formule absente');
vrai('en couleurs forcées, le système peint (pas de texte transparent)', /@media \(forced-colors: active\)\{[\s\S]{0,420}color:CanvasText!important; -webkit-text-fill-color:CanvasText!important;/.test(NU));

console.log('\n── 4. La coupe passe dans l’espace avant le dernier mot — logoCoupe(), exécutée');
const lc = (NU.match(/function logoCoupe\(\)\{[\s\S]*?\n\}\n/) || [''])[0];
vrai('logoCoupe existe, une seule fois', lc.length > 300 && (NU.match(/function logoCoupe\(/g) || []).length === 1);
const sh = NU.slice(NU.indexOf('function setHeader('), NU.indexOf('function logoCoupe('));
vrai('⛔ setHeader la refait à chaque en-tête', /logoCoupe\(\); \}\s*$/.test(sh.trimEnd() + ' '), sh.slice(-80));
const at = NU.slice(NU.indexOf('function applyTheme(){'), NU.indexOf('function setThemePref('));
vrai('⛔ applyTheme la refait (entrer dans Logo, ou en sortir)', /try\{ logoCoupe\(\); \}catch\(e\)\{\}/.test(at));
vrai('   … et un changement de taille aussi', /window\.addEventListener\('resize',\(\)=>\{ clearTimeout\(_lgT\); _lgT=setTimeout\(logoCoupe,150\); \}\)/.test(NU));
/* Une page simulée : une tuile à (100,200) en coordonnées d'écran, un titre sur une ligne ; l'espace
   avant « bord » est au point (100+230, 200+65) — la coupe doit valoir 230×,848 + 65×,53. */
function page(o) {
  const props = {};
  const tuile = { offsetWidth: 400 * (o.echelle ? 1 / o.echelle : 1),
    getBoundingClientRect: () => ({ left: 100, top: 200, width: 400, height: 130 }),
    style: { setProperty: (k, v) => { props[k] = v; }, removeProperty: k => { delete props[k]; } },
    querySelector: s => s === '.ph-title' ? ti : s === '.ph-surtitre' ? (o.sansDate ? null : {}) : null };
  const n = { nodeType: 3, textContent: o.titre };
  const ti = { childNodes: [n], getBoundingClientRect: () => ({ height: o.lignes === 2 ? 82 : 41 }) };
  const ph = { querySelector: () => tuile };
  const doc = { documentElement: { getAttribute: () => o.marque || 'logo' },
    createRange: () => { let a = 0; return { setStart: (_, i) => { a = i; }, setEnd: () => {},
      getBoundingClientRect: () => { const x = 100 + (o.espaceX || 230) * (o.echelle || 1), y = 200 + 65 * (o.echelle || 1); return { left: x - 5, right: x + 5, top: y - 20, bottom: y + 20, width: 10, height: 40, i: a }; } }; } };
  const f = new Function('$', 'document', 'getComputedStyle', lc + '\nreturn logoCoupe;')(id => id === 'page-head' ? ph : null, doc, () => ({ lineHeight: '41px' }));
  f(); return props;
}
const attendu = (230 * .848 + 65 * .53).toFixed(1) + 'px';
vrai('⛔ la coupe passe au milieu de l’espace avant le dernier mot', page({ titre: 'Tableau de bord' })['--lg-coupe-titre'] === attendu, JSON.stringify(page({ titre: 'Tableau de bord' })) + ' pour ' + attendu);
vrai('   … la tuile réduite par une animation (échelle ,9) ne la fausse pas', page({ titre: 'Tableau de bord', echelle: .9 })['--lg-coupe-titre'] === attendu, JSON.stringify(page({ titre: 'Tableau de bord', echelle: .9 })));
vrai('   … un titre d’un seul mot : la feuille garde sa valeur', !('--lg-coupe-titre' in page({ titre: 'Dashboard' })));
vrai('   … un titre sur deux lignes : la feuille garde sa valeur', !('--lg-coupe-titre' in page({ titre: 'Tableau de bord', lignes: 2 })));
vrai('   … hors du thème Logo : rien ne se mesure (graisse et interlettrage autres)', !('--lg-coupe-titre' in page({ titre: 'Tableau de bord', marque: 'opgestion' })));
vrai('   … un en-tête sans date n’est pas la tuile : rien', !('--lg-coupe-titre' in page({ titre: 'Tableau de bord', sansDate: true })));
vrai('la preuve au navigateur existe (cinq largeurs, jour et nuit, l’écran des thèmes)', fs.existsSync(__dirname + '/../scratchpad/sonde-logo.js'));

console.log('\n── 5. La barre d’onglets reste une île sombre quand le verre s’éteint');
/* ⛔ on découpe le § 20 dans le texte BRUT (son titre est un commentaire), on nettoie après ; et
   on prouve qu'on l'a trouvé — une tranche vide passe au vert sur tout */
const a20 = APP.indexOf('/* ── 20. LES RÉGLAGES SYSTÈME'), f20 = APP.indexOf('</style>', a20);
const S20 = APP.slice(a20, f20).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
vrai('le § 20 est trouvé', a20 > 0 && S20.length > 800, S20.length);
const rt = S20.slice(S20.indexOf('@media (prefers-reduced-transparency: reduce){'), S20.indexOf('@supports not ((-webkit-backdrop-filter:blur(1px))'));
vrai('⛔ transparence réduite : la barre de Logo passe au forêt plein (pas au blanc, libellés à 1,5:1)', /html\[data-marque="logo"\]\[data-verre\]\[data-kind="mobile"\] \.tabbar\{background:var\(--lg-foret\)!important\}\s*\}$/.test(rt.trimEnd()), rt.slice(-160));
const sb = S20.slice(S20.indexOf('@supports not ((-webkit-backdrop-filter:blur(1px))'), S20.indexOf('@media (prefers-contrast: more){'));
vrai('   … et sans flou du tout, pareil', /html\[data-marque="logo"\]\[data-verre\]\[data-kind="mobile"\] \.tabbar\{background:var\(--lg-foret\)!important\}\s*\}\s*$/.test(sb.trimEnd() + '\n'), sb.slice(-160));
vrai('les tuiles d’icône : les deux tons du logo, mêmes sélecteurs que le § 11, écrits APRÈS',
  (() => { const i = NU.indexOf('html[data-marque="logo"][data-refonte] .kpis .kpi:first-child .kpi-ico{background:var(--lg-menthe)!important'), d = NU.indexOf('html[data-marque][data-refonte] .kpis .kpi:first-child .kpi-ico{'); return i > 0 && d > 0 && i > d; })());

console.log('\n═══ test-807 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
