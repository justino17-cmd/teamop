/* ══ test-2852 · UNE TRANSITION QUI ANIME UNE LARGEUR SE DÉCLARE, MESURE À L'APPUI ═════════════════════════════════════════════════
   Audit apple-design du 21 octobre 2026, point 36 : « huit transitions animent la largeur ou le rembourrage au lieu de transform
   — calcul de mise en page à chaque image ». Mesuré avant de corriger (scratchpad/sonde-largeurs.js, chemin CPU, la vraie page,
   chaque élément isolé, la transition telle quelle contre la même sans la largeur, médiane de trois) :
     · deux ne tournaient JAMAIS : la barre des statistiques (.bar-fill) naît à sa largeur, et rien ne change le rembourrage d'une
       icône d'onglet (.tab-ic) — retirées ;
     · les curseurs des segmentés, la pastille du menu et la bulle de la barre d'onglets sont des éléments ABSOLUS, de quelques
       dizaines de pixels : 0,06 à 0,10 ms de mise en page par image — gardées : passer en scaleX écraserait leurs bouts arrondis ;
     · le menu qu'on replie (Mac) remet toute la page en page : 0,37 à 0,99 ms par image sur Clients, Planning, Interventions,
       Stock, Factures — gardée (c'est la décision du point 23 : le menu se replie, il ne disparaît plus d'un coup) ;
     · la barre de la mise à jour : une seule passe de mise en page mesurée sur toute la transition — gardée.
   Ce banc recense TOUTES les transitions de la feuille et des styles écrits dans le code, et exige que chacune de celles qui
   animent une propriété de mise en page soit nommée ici, avec sa raison. Une nouvelle le fait tomber : on la mesure, puis on la
   déclare ou on l'écrit en transform. Une déclaration dont la règle a disparu le fait tomber aussi (une décision prise pour du
   vide, comme la liste « vu et pas surveillé » de test-726).                                                                  */
'use strict';
const fs = require('fs'), path = require('path');
const BRUT = fs.readFileSync(process.env.APP_FICHIER || path.join(__dirname, '..', 'app.html'), 'utf8');
const C = require('./outils-cascade-app.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const FEUILLE = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
const TOUT = C.regles(FEUILLE);
/* les propriétés qui coûtent une mise en page quand elles bougent (et « all », qui les emporte toutes) */
const MISE_EN_PAGE = ['width', 'height', 'min-width', 'max-width', 'min-height', 'max-height', 'padding', 'margin', 'top', 'left', 'right', 'bottom', 'inset',
  'gap', 'row-gap', 'column-gap', 'flex', 'flex-basis', 'flex-grow', 'grid-template-columns', 'grid-template-rows', 'font-size', 'line-height', 'border-width', 'all'];
const props = (v) => v.split(/,(?![^(]*\))/).map(x => x.trim().split(/\s+/)[0]).filter(Boolean);
const coute = (p) => MISE_EN_PAGE.some(m => p === m || p.startsWith(m + '-') && /^(padding|margin|border|inset)/.test(m));
/* les déclarées : sélecteur (ou « style: » + l'id d'un style écrit dans le code) → propriétés gardées, et pourquoi */
const DECLAREES = {
  '.nav-glisse': { p: ['width', 'height'], pourquoi: 'pastille ABSOLUE du menu ; toutes les rubriques ont la même taille, elle ne change que pour une rubrique plus haute — 0,09 ms par image' },
  'html[data-refonte] .nav-glisse': { p: ['width', 'height'], pourquoi: 'la même, au ressort de la refonte' },
  'html[data-refonte] .tdb-seg .seg-cur': { p: ['width'], pourquoi: 'curseur ABSOLU de la période du tableau de bord (segments de largeurs différentes) — 0,10 ms par image ; en scaleX ses bouts arrondis s’écraseraient' },
  'html[data-refonte] .filters.seg-on .seg-cur': { p: ['width'], pourquoi: 'curseur ABSOLU des segmentés de puces — 0,10 ms par image ; même raison' },
  '.tab-cur': { p: ['width'], pourquoi: 'bulle ABSOLUE de la barre d’onglets : sa largeur ne bouge que si le nombre d’onglets change — 0,06 ms par image' },
  'html[data-refonte] .sidebar': { p: ['width'], pourquoi: 'le menu qu’on replie (Mac, point 23) : toute la page se remet en page, 0,37 à 0,99 ms par image mesurés sur cinq écrans — à revoir sur un vrai Mac si ça accroche' },
  'style:maj-barre': { p: ['width'], pourquoi: 'la barre de la mise à jour : une seule passe de mise en page mesurée sur la transition' },
};

console.log('\n── 2852 · 1. le recensement ──');
const trouvees = [];
let nCss = 0;
for (const r of TOUT) for (const d of r.decls) {
  if (!/^transition(-property)?$/.test(d.p)) continue; nCss++;
  const c = props(d.v).filter(coute); if (c.length) trouvees.push({ cle: r.sel, p: c, v: d.v });
}
/* les styles écrits dans le code (gabarits, cssText) : rattachés à l'id de leur élément */
const CODE = BRUT.replace(/<style[^>]*>[\s\S]*?<\/style>/g, ' ');
let nCode = 0;
for (const m of CODE.matchAll(/transition\s*:\s*([^;"'`]*)/g)) {
  nCode++; const c = props(m[1]).filter(coute); if (!c.length) continue;
  const avant = CODE.slice(Math.max(0, m.index - 300), m.index), id = (avant.match(/id="([\w-]+)"[^<]*$/) || [])[1];
  trouvees.push({ cle: 'style:' + (id || '?' + m.index), p: c, v: m[1] });
}
/* … et les transitions posées par le JavaScript (el.style.transition = '…') */
/* toute chaîne de l'expression compte (« sobre ? 'none' : 'scale …' ») */
for (const m of CODE.matchAll(/\.transition\s*=\s*([^;\n]*)/g)) for (const q of m[1].matchAll(/(['"`])([^'"`]*)\1/g)) {
  nCode++; const c = props(q[2]).filter(coute); if (c.length) trouvees.push({ cle: 'js:' + CODE.slice(0, m.index).split('\n').length, p: c, v: q[2] });
}
vrai('(population) le recensement voit les transitions de la feuille (' + nCss + ') et du code (' + nCode + ')', nCss > 120 && nCode > 20, [nCss, nCode]);
vrai('(population) … et il trouve bien les transitions de mise en page qu’on garde (' + trouvees.length + ')', trouvees.length >= 6, trouvees.map(t => t.cle));

console.log('\n── 2852 · 2. chacune est déclarée ──');
for (const t of trouvees) {
  const d = DECLAREES[t.cle], hors = d ? t.p.filter(p => !d.p.includes(p)) : t.p;
  vrai((d ? 'déclarée' : '⛔ NON DÉCLARÉE') + ' : ' + t.cle + ' anime ' + t.p.join(', ') + (d ? ' — ' + d.pourquoi : ' (mesurer, puis la déclarer ici ou l’écrire en transform)'), !!d && !hors.length, { valeur: t.v, hors });
}
for (const k of Object.keys(DECLAREES))
  vrai('la déclaration « ' + k + ' » parle d’une transition qui existe encore', trouvees.some(t => t.cle === k), k);

console.log('\n── 2852 · 3. les deux qui ne tournaient pas sont retirées ──');
{ const b = TOUT.filter(r => r.sel === '.bar-fill').flatMap(r => r.decls).filter(d => /^transition/.test(d.p));
  vrai('la barre des statistiques (.bar-fill) n’a plus de transition (elle naît à sa largeur)', TOUT.some(r => r.sel === '.bar-fill') && !b.length, b);
  const t = TOUT.filter(r => r.sel === '.tab-ic' && !r.media.length).flatMap(r => r.decls).filter(d => /^transition/.test(d.p));   // hors « réduire les animations », qui la coupe
  vrai('l’icône d’onglet (.tab-ic) ne transitionne plus son rembourrage (rien ne le change) — et garde son échelle', t.length === 1 && !/padding/.test(t[0].v) && /transform/.test(t[0].v), t);
  const pad = TOUT.filter(r => /\.tab-ic\b/.test(r.sel) && r.decls.some(d => /^padding/.test(d.p)));
  vrai('… et c’est vrai : aucune règle ne pose de rembourrage sur l’icône d’onglet', pad.length === 0, pad.map(r => r.sel)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
