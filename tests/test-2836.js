/* ══ test-2836 · AUCUN SURVOL NU : CHAQUE :hover VIT SOUS @media (hover:hover) ══════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, § 10 (« gate hover styles behind (hover: hover) »). Sur un iPhone, :hover se
   déclenche à l'appui et RESTE COLLÉ jusqu'au toucher suivant : le bouton reste soulevé, la ligne teintée, l'infobulle
   plantée. La page l'annulait règle par règle dans un bloc @media (hover:none) — mesuré au doigt, 38 familles lui
   échappaient (« ＋ Créer », retour, onglets, cloche, tuiles, lignes…), c'est-à-dire tout survol écrit après lui. Et ses
   !important forçaient le fond d'origine sur des éléments qui en ont un autre.
   La règle est désormais à la SOURCE, et ce banc la tient : il recense TOUTES les règles :hover des feuilles d'app.html et
   exige qu'elles vivent sous (hover:hover) ; un survol qui dévoile quelque chose garde un chemin au toucher.
   Preuves : scratchpad/equivalence-survols.js (à la souris, 3 255 groupes de règles identiques avant/après) et
   scratchpad/sonde-survol-colle.js (toutes les rubriques, au doigt et à la souris, survol forcé commande par commande). */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* les règles des feuilles, avec leur chaîne de médias (commentaires et chaînes respectés, blocs imbriqués suivis) */
function regles(B) {
  const out = [];
  const finBloc = (css, i) => { let p = 1, k = i + 1, q = null; for (; k < css.length; k++) { const d = css[k];
    if (css.startsWith('/*', k)) { k = css.indexOf('*/', k + 2) + 1; continue; } if (q) { if (d === '\\') { k++; continue; } if (d === q) q = null; continue; }
    if (d === '"' || d === "'") { q = d; continue; } if (d === '{') p++; else if (d === '}') { if (!--p) return k; } } return -1; };
  const parcourir = (css, base, media) => { let i = 0, deb = 0, q = null;
    while (i < css.length) { const c = css[i];
      if (css.startsWith('/*', i)) { const j = css.indexOf('*/', i + 2); i = j < 0 ? css.length : j + 2; continue; }
      if (q) { if (c === '\\') { i += 2; continue; } if (c === q) q = null; i++; continue; }
      if (c === '"' || c === "'") { q = c; i++; continue; }
      if (c === '{') { const net = css.slice(deb, i).replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/\s+/g, ' ').trim(), k = finBloc(css, i);
        if (net.startsWith('@')) { if (/^@(media|supports|layer|container)/.test(net)) parcourir(css.slice(i + 1, k), base + i + 1, media.concat([net])); }
        else out.push({ sel: net, media, corps: css.slice(i + 1, k).replace(/\s+/g, ' ').trim(), pos: base + deb });
        i = k + 1; deb = i; continue; }
      if (c === '}' || c === ';') deb = i + 1; i++; } };
  const re = /<style[^>]*>([\s\S]*?)<\/style>/g; let m;
  while ((m = re.exec(B))) parcourir(m[1], m.index + m[0].indexOf('>') + 1, []);
  return out;
}
const R = regles(BRUT);
const ligne = (pos) => BRUT.slice(0, pos).split('\n').length;
const sousSouris = (r) => r.media.some(m => /^@media\s*\(\s*hover\s*:\s*hover\s*\)/.test(m) && !/\bnot\b/.test(m));
const SURVOLS = R.filter(r => /:hover/.test(r.sel));

console.log('\n── 2836 · 0. la population ──');
vrai('les feuilles sont lues (plus de 3 000 règles)', R.length > 3000, R.length);
vrai('… dont plus de 150 règles de survol', SURVOLS.length > 150, SURVOLS.length);

console.log('\n── 2836 · 1. chaque survol vit sous (hover:hover) ──');
const nus = SURVOLS.filter(r => !sousSouris(r) && !r.media.some(m => /\(\s*hover\s*:\s*none\s*\)/.test(m)));
vrai('⛔ aucune règle :hover hors de @media (hover:hover) — au doigt, elle resterait collée', !nus.length, nus.slice(0, 8).map(r => ligne(r.pos) + ' ' + r.sel.slice(0, 90)));
/* la seule exception : la feuille de Leaflet, chargée à part (unpkg) — on ne range pas une feuille qu'on ne sert pas */
const tiers = (r) => r.sel.split(',').every(p => /\.leaflet-/.test(p));
const annule = R.filter(r => r.media.some(m => /\(\s*hover\s*:\s*none\s*\)/.test(m)) && /:hover/.test(r.sel));
vrai('aucune règle n’ANNULE plus un de NOS survols au doigt (le bloc « @media (hover:none) » qui en oubliait 38 familles)', !annule.filter(r => !tiers(r)).length, annule.filter(r => !tiers(r)).slice(0, 5).map(r => ligne(r.pos) + ' ' + r.sel.slice(0, 80)));
vrai('… seule la feuille de Leaflet (survols nus, qu’on ne sert pas) est ramenée au repos au doigt : boutons de zoom ET attribution', ['.leaflet-bar a:hover', '.leaflet-control-attribution a:hover'].every(x => annule.some(r => tiers(r) && r.sel.includes(x))), annule.filter(tiers).map(r => r.sel));
const listes = SURVOLS.filter(r => r.sel.split(',').some(p => !/:hover/.test(p)));
vrai('une liste mêlée est coupée : la partie sans survol reste pour tous (aucune liste « survol + autre chose » sous le média)', !listes.length, listes.slice(0, 5).map(r => ligne(r.pos) + ' ' + r.sel.slice(0, 90)));

console.log('\n── 2836 · 2. ce que le survol dévoile garde un chemin au toucher ──');
/* un survol qui fait PARAÎTRE un descendant ; au doigt, il faut un état posé par le toucher (.open, .active…) */
const DEVOILE = SURVOLS.filter(r => /:hover\S*\s+\S/.test(r.sel) && /(^|;)\s*(display\s*:\s*(block|flex|grid|inline)|visibility\s*:\s*visible|opacity\s*:\s*1\b)/.test(r.corps));
vrai('(population) les survols qui dévoilent sont recensés', DEVOILE.length >= 2, DEVOILE.map(r => r.sel));
const AU_TOUCHER = {
  '#suite-box:hover #suite-fly': '#suite-box.open #suite-fly',          // le toucher sur la rangée pose .open
  '.nav-item:hover .ico': '.nav-item.active .ico',                      // l'icône pleine de la rubrique ouverte
  '.plg-tete.clic:hover .plg-go': null,                                  // l'étiquette « voir le jour » : décorative, l'en-tête entier se touche
};
for (const r of DEVOILE) {
  const cle = Object.keys(AU_TOUCHER).find(k => r.sel.replace(/\s+/g, ' ').includes(k));
  vrai('« ' + r.sel.slice(0, 70) + ' » est NOMMÉ ici, avec son chemin au toucher', !!cle, ligne(r.pos));
  if (cle && AU_TOUCHER[cle]) vrai('… et ce chemin existe, hors du média, pour tous', R.some(x => !sousSouris(x) && x.sel.split(',').map(s => s.trim()).includes(AU_TOUCHER[cle]) && x.corps === r.corps), AU_TOUCHER[cle]);
}

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
