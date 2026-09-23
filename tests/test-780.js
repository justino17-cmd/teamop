/* ══ RIEN NE CHANGE DE TAILLE SOUS LE DOIGT (v731) ═════════════════════════════════════════════
   Vidéo de Justin, iPhone, 23 septembre 2026 à 13 h 02 — « j'ai toujours des petits bugs comme
   ça » : la carte des réglages du Planning BASCULAIT entre deux mises en page, de 346 à 300 px de
   haut et retour, pendant qu'il essayait de faire défiler.
   La cause, demandée au navigateur (`CSS.getMatchedStylesForNode`) et pas devinée :
   `html[data-refonte] .card{padding:22px 24px!important}`, de même force et écrite plus loin,
   écrasait `.pf-bar{padding:0}` — SAUF au survol, où `.card.pf-bar:hover`, plus spécifique,
   reprenait la main. Or sur un iPhone, poser le doigt déclenche le survol (et il reste collé).
   La même famille, trouvée en mesurant TOUTES les rubriques (`scratchpad/sonde-survol.js`) :
   · `border:0` au survol des cartes, des indicateurs et des demandes (un reste du dessin « sans
     bord ») : le liseré du verre partait, le contenu bougeait d'un pixel, et les cartes
     d'intervention perdaient leur bande de statut sous le doigt ;
   · `.plg-mh:hover{border-color}` repeignait en gris la bande de couleur du technicien.
   Mesuré au navigateur, 90 écrans × téléphone et bureau : 76 éléments sur 106 changeaient sur la
   v730, 0 sur la v731.

   ⛔ Une sonde qui PHOTOGRAPHIE un instant ne voit pas ce défaut : il n'existe que pendant un
   geste. D'où ce banc, qui garde la RÈGLE (toute règle de survol qui change une taille est
   nommée ici, avec sa raison — même mécanisme que « vu et pas surveillé » de `test-726`), et la
   sonde, qui provoque le survol élément par élément.                                          */
const fs = require('fs'), path = require('path');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* Toutes les feuilles <style>, commentaires retirés : un motif de banc vise du CODE. */
const CSS = [...SRC.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n').replace(/\/\*[\s\S]*?\*\//g, ' ');
const REGLES = [...CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(m => ({
  sel: m[1].trim().replace(/\s+/g, ' '),
  decl: m[2].split(';').map(x => x.trim()).filter(Boolean).map(x => { const i = x.indexOf(':'); return { p: x.slice(0, i).trim().toLowerCase(), v: x.slice(i + 1).trim() }; }),
}));
const SURVOL = REGLES.filter(r => /:hover/.test(r.sel));
/* Ce qui change une TAILLE ou une PLACE (la couleur d'un bord n'en fait pas partie : elle est
   traitée à part, pour les surfaces dont le bord porte une information). */
const TAILLE = /^(padding(-\w+)?|margin(-\w+)?|width|height|min-width|min-height|max-width|max-height|border|border-(top|right|bottom|left)|border(-(top|right|bottom|left))?-width|font-size|font-weight|line-height|letter-spacing|gap|row-gap|column-gap|display|position|flex|flex-basis|flex-grow|flex-shrink)$/;

console.log('\n── 780 · 0. la population ──');
vrai('la feuille est lue (plus de 2 000 règles)', REGLES.length > 2000, REGLES.length);
vrai('… dont plus de 150 règles de survol', SURVOL.length > 150, SURVOL.length);

console.log('\n── 780 · 1. toute règle de survol qui change une taille est NOMMÉE, avec sa raison ──');
const PERMIS = {
  '#suite-box:hover #suite-fly, #suite-box.open #suite-fly': 'le menu volant de la suite : il apparaît HORS du flux, rien ne bouge autour',
  '[data-tip]:hover::after': 'l’infobulle : un pseudo-élément en position absolue (et coupée au doigt par `(hover:none)`)',
  '[data-tip]:hover::before': 'la pointe de l’infobulle, même chose',
  '.plg-tete.clic:hover .plg-go': 'la flèche « voir ce technicien » de l’en-tête du planning : en position absolue',
  'html[data-refonte] [data-tip]:hover::after,html[data-refonte] [data-tip]:hover::before': 'au doigt, on ÉTEINT l’infobulle : c’est la garde, pas un saut',
};
const trouves = SURVOL.filter(r => r.decl.some(d => TAILLE.test(d.p)));
const inconnus = trouves.filter(r => !PERMIS[r.sel]).map(r => r.decl.filter(d => TAILLE.test(d.p)).map(d => d.p).join(',') + ' ⟵ ' + r.sel.slice(0, 140));
v('⛔⛔ aucune règle de survol NON NOMMÉE ne change une taille (sinon : la corriger, ou la nommer ici avec sa raison)', inconnus, []);
const perimes = Object.keys(PERMIS).filter(s => !trouves.some(r => r.sel === s));
v('… et la liste ne parle que de règles qui existent encore (une entrée périmée est une décision prise pour du vide)', perimes, []);
const go = REGLES.find(r => r.sel === '.plg-go');
vrai('la flèche de l’en-tête est bien hors du flux (position absolue)', go && go.decl.some(d => d.p === 'position' && d.v === 'absolute'));

console.log('\n── 780 · 2. la barre du Planning ne change plus au survol ──');
const barreSurvol = SURVOL.filter(r => r.sel.split(',').some(s => /\.pf-bar[^,]*:hover/.test(s) && !/:not\(\.pf-bar\)/.test(s)));
v('⛔⛔ plus AUCUNE règle `.pf-bar:hover` (c’est elle qui faisait sauter la barre de 46 px)', barreSurvol.map(r => r.sel), []);
const barreRefonte = REGLES.filter(r => r.sel.split(',').map(s => s.trim()).includes('html[data-refonte] .pf-bar'));
v('la règle de la refonte ne porte plus que l’espace sous la barre', barreRefonte.map(r => r.decl.map(d => d.p)), [['margin-bottom']]);
vrai('… la carte, elle, garde la marge de toutes les cartes (22/24 px) — dans les deux états',
  REGLES.some(r => r.sel === 'html[data-refonte] .card' && r.decl.some(d => d.p === 'padding' && /22px 24px/.test(d.v))));

console.log('\n── 780 · 3. le survol d’une surface change son FOND, jamais son BORD ──');
const SURFACES = /\.(kpi|card)\[onclick\]|\.(kpi|card)\.clickable|\.olsec summary|\.list-row|tr\[onclick\]/;
const bordsSurvol = SURVOL.filter(r => SURFACES.test(r.sel) && r.decl.some(d => /^border/.test(d.p)))
  .map(r => r.decl.filter(d => /^border/.test(d.p)).map(d => d.p + ':' + d.v).join(';') + ' ⟵ ' + r.sel.slice(0, 120));
v('⛔⛔ aucune règle de survol des cartes, indicateurs, sections et lignes ne touche au bord (liseré, bande de statut)', bordsSurvol, []);
vrai('… mais le fond, lui, se teinte toujours (le retour visuel reste)',
  SURVOL.some(r => SURFACES.test(r.sel) && r.decl.some(d => d.p === 'background' && /--hover/.test(d.v))));

console.log('\n── 780 · 4. la bande du technicien garde sa couleur au survol ──');
const mh = SURVOL.filter(r => r.sel === '.plg-mh:hover');
vrai('population : la règle de survol des cartes du planning semaine est trouvée', mh.length === 1, mh.length);
vrai('⛔ le liseré s’éclaire, la BANDE de gauche reste `var(--cc)` (le technicien)',
  mh.length === 1 && mh[0].decl.some(d => d.p === 'border-left-color' && d.v === 'var(--cc)'));
const base = REGLES.find(r => /^\.plg-mh$/.test(r.sel));
vrai('… et c’est bien la bande de gauche qui porte `--cc` dans la règle de base', base && base.decl.some(d => d.p === 'border-left' && /var\(--cc\)/.test(d.v)));

console.log('\n── 780 · 5. la mesure de bout en bout existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-survol.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-survol.js existe', !!SONDE);
vrai('… elle FORCE le survol élément par élément (un doigt posé), au lieu de photographier', /CSS\.forcePseudoState/.test(SONDE) && /forcedPseudoClasses:\['hover'\]/.test(SONDE));
vrai('… elle mesure la taille de MISE EN PAGE (offsetWidth/Height, transformations ignorées)', /offsetWidth/.test(SONDE) && /offsetHeight/.test(SONDE));
vrai('… au téléphone ET au bureau, le téléphone déclaré « sans survol » comme un iPhone', /iosweb/.test(SONDE) && /macweb/.test(SONDE) && /\(hover:none\)/.test(SONDE));
vrai('… elle compte sa population PAR FAMILLE (un zéro sur rien ne prouve rien)', /parFamille/.test(SONDE));
vrai('… elle va chercher les trois formes du planning et la fiche d’une intervention', /planning:semaine/.test(SONDE) && /planning:jour/.test(SONDE) && /detailIntervention\(/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-780 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
