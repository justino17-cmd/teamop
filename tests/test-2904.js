/* ══ test-2904 · LE MENU DE BUREAU TIENT SUR UNE LIGNE — LE PLUS LONG LIBELLÉ, DANS LES TROIS LANGUES, PLUS UNE VRAIE MARGE ═══════════
   23 octobre 2026. « Validations DR » est devenu « Validation des mouvements » : 181,6 px en français pour 171 de place à 258 px —
   deux lignes (59 px au lieu de 44) sur toute la barre latérale. La règle du dépôt (« on ÉLARGIT : tronquer cache une information,
   rapetisser descend sous le plancher de lisibilité ») : le menu de bureau passe à 284 px, soit 197 de place — quinze de marge (mesurés : 15,4 en français, 20,7 en espagnol, 39,4 en anglais).
   Ce banc ne mesure pas du texte (c'est le travail de `scratchpad/metiers/sonde-e.js`, au navigateur : chaque entrée, 1440 et 1100 px,
   FR / EN / ES, jour et nuit, la largeur NATURELLE du libellé contre la place qu'il a). Il garde ce qu'une relecture ne voit pas :
   · le menu de bureau est assez large pour le PLUS LONG libellé de `NAV` dans chaque langue, marge comprise — le plus long est
     désigné sur les métriques Helvetica d'app.html (`_PDF_L`) calées sur la mesure de la sonde (« Validation des mouvements » = 181,6 px) :
     un libellé plus long demain fait tomber ce banc, et on refait la mesure au navigateur ;
   · les règles qui se mesurent sur cette largeur la SUIVENT : la fenêtre plein écran commence au bord du menu, au bureau comme au doigt ;
   · aucune règle d'un palier plus étroit ne ramène le menu de bureau en dessous (la largeur n'est écrite qu'une fois, hors `@media`) ;
   · le libellé du champ « Valideur responsable » parle comme tout le circuit (« valideur »), sans toucher au nom du rôle.
   Population comptée avant chaque absence.                                                                                        */
'use strict';
const { lire, litteral, evalue } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

/* ── LA MESURE DE LA SONDE (scratchpad/metiers/sonde-e.js, 23 octobre 2026, Chromium, 258 px) — l'ancre du calage ── */
const ANCRE = { libelle: 'Validation des mouvements', px: 181.6 };
const PLACE_PERDUE = 87;     // largeur du menu − place du libellé : mesuré 258 − 171 = 87 (rembourrage, tuile d'icône, écart)
const MARGE_MIN = 8;         // « deux pixels de marge ne sont pas une marge » : huit, comme le bureau s'en impose depuis le 23 septembre 2026

for (const fichier of ['app.html', 'beta.html']) {
  console.log('\n══ ' + fichier + ' ══');
  const { N } = lire(fichier);
  const NAV = evalue(litteral(N, 'const NAV = ['));
  const I18N = evalue(litteral(N, 'const I18N={'));
  const i0 = N.indexOf('const _PDF_L=['), i1 = N.indexOf("].map(l=>l.split(' ').map(Number));", i0);
  const PDF_L = i0 > 0 && i1 > i0 ? evalue(N.slice(i0 + 'const _PDF_L='.length, i1 + 1) + ".map(l=>l.split(' ').map(Number))") : [];
  const largeur = (txt, gras) => { const t = PDF_L[gras ? 1 : 0]; let w = 0;
    for (const ch of String(txt).normalize('NFD')) { const c = ch.codePointAt(0); if (c >= 0x300 && c <= 0x36f) continue; w += (c >= 32 && c <= 126) ? t[c - 32] : 556; } return w; };

  console.log('\n1. Le plus long libellé tient, dans chaque langue, marge comprise');
  const libelles = NAV.flatMap(g => g.items).map(i => i.l);
  vrai('(population) le menu a ses rubriques et les métriques de calage sont lues dans le CODE', libelles.length >= 38 && PDF_L.length === 2 && PDF_L[0].length === 95, [libelles.length, PDF_L.length]);
  const m = (N.match(/html\[data-kind="desktop"\] \.sidebar\{width:(\d+)px\}/) || [, ''])[1];
  vrai('(population) la largeur du menu de bureau est lue : ' + m + ' px', +m > 200, m);
  const k = ANCRE.px / largeur(ANCRE.libelle);
  const mesures = { fr: libelles, en: libelles.map(l => (I18N.en[l] != null ? I18N.en[l] : l)), es: libelles.map(l => (I18N.es[l] != null ? I18N.es[l] : l)) };
  const place = +m - PLACE_PERDUE;
  const trop = [];
  for (const langue of Object.keys(mesures)) mesures[langue].forEach(l => { const px = largeur(l) * k; if (px > place - MARGE_MIN) trop.push(langue + ' « ' + l + ' » ≈ ' + px.toFixed(1) + ' px pour ' + place + ' (marge ' + (place - px).toFixed(1) + ')'); });
  egal('⛔ aucun libellé (français, anglais, espagnol) n\'a moins de ' + MARGE_MIN + ' px de marge dans le menu de bureau (' + place + ' px de place)', trop, []);
  const classes = Object.keys(mesures).map(l => mesures[l].map(x => [x, largeur(x) * k]).sort((a, b) => b[1] - a[1])[0]);
  vrai('   le plus long est celui de la mesure (« ' + ANCRE.libelle + ' » en français) — sinon on a changé le palmarès : refaire la mesure au navigateur (sonde-e.js) et déplacer l\'ancre',
    classes[0][0] === ANCRE.libelle && classes.every(c => c[1] <= classes[0][1] + 0.01), classes.map(c => c[0] + ' ' + c[1].toFixed(1)));
  vrai('   la marge réelle du plus long est d\'au moins ' + MARGE_MIN + ' px, et le menu n\'est pas démesuré (≤ 300 px : tronquer ou rapetisser sont pires, mais gaspiller la page aussi)', place - classes[0][1] >= MARGE_MIN && +m <= 300, [place - classes[0][1], m]);

  console.log('\n2. Les règles qui se mesurent sur cette largeur la suivent');
  const profondeur = idx => { let p = 0; for (let i = 0; i < idx; i++) { const c = N[i]; if (c === '{') p++; else if (c === '}') p--; } return p; };
  const regle = (re) => { const x = re.exec(N); return x ? { texte: x[0], valeur: x[1], profondeur: profondeur(x.index) } : null; };
  const sb = regle(/html\[data-kind="desktop"\] \.sidebar\{width:(\d+)px\}/), ov = regle(/html\[data-kind="desktop"\] \.overlay\.full\{left:(\d+)px\}/);
  const sbm = regle(/html\[data-kind="mobile"\] \.sidebar\{width:(\d+)px\}/), ovm = regle(/html\[data-kind="mobile"\] \.overlay\.full\{left:(\d+)px\}/);
  vrai('(population) les quatre règles (menu et fenêtre plein écran, bureau et doigt) sont trouvées', !!(sb && ov && sbm && ovm));
  egal('⛔ la fenêtre plein écran commence au bord du menu : au bureau', [ov && ov.valeur], [sb && sb.valeur]);
  egal('⛔ … et au doigt', [ovm && ovm.valeur], [sbm && sbm.valeur]);
  vrai('⛔ la largeur du bureau n\'est écrite qu\'UNE fois, hors de toute @media (un palier plus étroit ne la ramène pas sous 197 px de place)', !!sb && sb.profondeur === 0 && N.split('html[data-kind="desktop"] .sidebar{width:').length === 2, sb && sb.profondeur);
  /* le palier tablette de la feuille de base (226 px) est battu par `html[data-kind="desktop"]` (spécificité) : on le vérifie, sinon la mesure à 1100 px serait fausse */
  vrai('   le palier 781–1100 px de la feuille de base écrit `.sidebar{width:226px}` — plus faible (0,1,0) que la règle du bureau (0,2,1) : à 1100 px le menu fait la même largeur qu\'à 1440', /@media\(min-width:781px\) and \(max-width:1100px\)\{\s*\.sidebar\{width:226px;\}/.test(N));

  console.log('\n3. Le champ « Valideur responsable »');
  vrai('⛔ le champ qui désigne qui valide s\'appelle « Valideur responsable » (tout le circuit dit « valideur »)', /<label>Valideur responsable<\/label>/.test(N) && !/<label>Directeur régional responsable<\/label>/.test(N));
  vrai('   le nom du RÔLE ne change pas : « Directeur Régional » reste le nom du rôle `dr` (ROLE), et la donnée reste `drId`', /dr:'Directeur Régional'/.test(N) && /name="drId"/.test(N) && /valideursDR\(\)/.test(N));
}

console.log('\n── 2904 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
