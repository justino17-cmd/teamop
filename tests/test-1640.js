/* ══ test-1640 · PARAMÈTRES À 320 PX : « MON ENTREPRISE » NE FAIT PLUS DÉFILER LA PAGE DE CÔTÉ ══
   Lot k02, bug r5#0 (retest i01) : sur une fenêtre de 320 px, Paramètres → Mon entreprise (forfait Business Premium)
   poussait le document à 342 px (22 px de défilement latéral RÉEL, demandé à la page : scrollTo puis scrollX).
   À 360 px, rien. Deux éléments seulement, mesurés :
     · le bouton « ＋ Choisir la couleur de l'entreprise » : un `.btn` est `white-space:nowrap` (feuille), 302 px de large
       dans une colonne de 288 → il sortait à right 342 ;
     · le libellé « Toute sortie de stock passe par la validation » : `.frow .frow-lbl{white-space:nowrap}`, 279 px insécables
       dans une rangée de 260 → right 333, et l'interrupteur n'avait aucune place à lui rendre.
   Contre-épreuve de la mesure (sonde du scratchpad, style modifié en direct) : les DEUX corrections suffisent, une seule
   ne suffit pas (342 → 333 avec le bouton seul).

   Ce banc ne garde pas un texte : il REJOUE LA CASCADE (tests/outils-cascade-app.js — média, spécificité, !important,
   ordre) pour les trois éléments tels que le balisage de views.parametres les écrit, ancêtres compris. Il garde ce que
   la feuille GAGNE (`white-space`), pas la ligne qui l'écrit. Et la contre-épreuve : un libellé COURT (« N° ») reste
   insécable — la règle n'est pas devenue générale.
   La preuve au navigateur : scratchpad/gestion/correctifs/k02/sonde-params-large.js (320 à 1440 px, jour et nuit : 12
   mesures, barre verticale présente 12 fois, défilement latéral réel 0 ; avant : 320 → 22 px).                      */
'use strict';
const fs = require('fs'), path = require('path');
const C = require('./outils-cascade-app.js');
const BRUT = fs.readFileSync(path.resolve(__dirname, '..', process.env.APP_FICHIER || 'app.html'), 'utf8');
/* ⛔ seuls les blocs qui COMMENCENT une ligne sont des commentaires (CLAUDE.md : un nettoyage naïf avale 107 Ko d'app.html) */
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

const CSS = [...BRUT.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m => m[1]).join('\n');
/* ⚠️ l'outil découpe les listes de sélecteurs sur CHAQUE virgule, y compris dans `[style*="repeat(3,1fr)"]` : il en sort des
   « sélecteurs » fantômes (`1fr)"]`) qu'il croit vrais pour tout élément. On écarte ce qui ne commence pas comme un sélecteur. */
const REGLES = C.regles(CSS).filter(r => /^[a-z.#\[*]/i.test(r.sel));
/* ⚠️ le second défaut de l'outil : il traite `A > B` comme `A B`. Sur la fiche Mon entreprise, le bouton est dans un <div>
   flex, PAS enfant direct de la carte : `html[data-refonte] #content .card > .btn{white-space:normal}` ne le vise pas, et
   l'outil le lui donnait quand même (le banc passait sur le code d'AVANT). On rend le `>` strict pour le dernier
   combinateur : le composé avant `>` doit viser le PARENT immédiat. */
function dernierEnfant(sel) {
  let prof = 0, k = -1;
  for (let i = 0; i < sel.length; i++) { const c = sel[i]; if (c === '(' || c === '[') prof++; else if (c === ')' || c === ']') prof--; else if (c === '>' && !prof) k = i; }
  return k;
}
function reglesPour(chaine) {
  return REGLES.filter(r => {
    const k = dernierEnfant(r.sel); if (k < 0) return true;
    const tete = r.sel.slice(0, k).trim(), queue = r.sel.slice(k + 1).trim();
    if (!tete || /\s/.test(queue.replace(/\([^)]*\)|\[[^\]]*\]/g, ''))) return true;   // queue complexe : on garde (l'outil peut crier à tort, jamais se taire)
    return C.selecteurVise(tete, chaine.slice(0, -1));
  });
}
const gagne = (chaine, w, prop, enL) => C.gagnant(reglesPour(chaine), chaine, w, prop, enL);
console.log('\n── 1640 · 0. la population ──');
vrai('des règles sont lues (la cascade rejouée n\'est pas sur du néant)', REGLES.length > 3000, REGLES.length);
vrai('des règles visent .frow-lbl', REGLES.filter(r => /frow-lbl/.test(r.sel)).length >= 3, REGLES.filter(r => /frow-lbl/.test(r.sel)).length);

/* le balisage, lu dans le CODE de la vue (pas dans un commentaire) */
const i0 = CODE.indexOf('views.parametres=function');
vrai('views.parametres est trouvée', i0 > 0, i0);
const VUE = CODE.slice(i0);
const attrs = s => { const o = {}; for (const m of s.matchAll(/([\w-]+)="([^"]*)"/g)) o[m[1]] = m[2]; return o; };
const enLigne = (a, prop) => { const m = new RegExp('(?:^|;)\\s*' + prop + ':\\s*([^;]+)').exec(a.style || ''); return m ? m[1].trim() : undefined; };

const bouton = /<button ([^>]*onclick="document\.getElementById\('ent-couleur-in'\)\.click\(\)"[^>]*)>/.exec(VUE);
vrai('le bouton « Choisir la couleur de l\'entreprise » est trouvé dans le balisage', !!bouton);
const libs = ['Toute sortie de stock passe par la validation', 'Bons de remise à la sortie de stock'].map(t => {
  const m = new RegExp('<span ([^>]*class="frow-lbl[^"]*"[^>]*)>' + t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '</span>').exec(VUE);
  return { t, m };
});
for (const l of libs) vrai('le libellé « ' + l.t + ' » est trouvé dans le balisage', !!l.m);

/* les ancêtres : la fiche Mon entreprise est une carte de #content ; un libellé de rangée vit dans <label class="frow"> */
const html = { tag: 'html', attrs: { 'data-refonte': '1', 'data-kind': 'mobile' }, classes: [] };
const base = [html, { tag: 'body', classes: ['rf-onglets'], attrs: {} }, { tag: 'main', id: 'content', classes: ['content'], attrs: {} }, { tag: 'div', classes: ['card'], attrs: {} }];
const el = (tag, a) => ({ tag, classes: (a.class || '').split(/\s+/).filter(Boolean), attrs: a, id: a.id });

/* le bouton n'est PAS enfant direct de la carte : il vit dans <div display:flex;gap:8px;flex-wrap:wrap> (lui-même dans la rangée du sélecteur) */
const RANGEE = el('div', { style: 'display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:8px' });
const PHONES = [320, 360, 390, 430];
console.log('\n── 1640 · 1. le bouton « ＋ Choisir la couleur de l\'entreprise » peut passer à la ligne ──');
if (bouton) {
  const a = attrs(bouton[1]);
  for (const w of PHONES) {
    const g = gagne(base.concat(RANGEE, el('button', a)), w, 'white-space', enLigne(a, 'white-space'));
    vrai(w + ' px : la valeur gagnante de white-space est « normal » (un .btn est nowrap par défaut, 302 px insécables dans 288)', !!g && g.v === 'normal', g && { v: g.v, sel: g.sel });
  }
}
console.log('\n── 1640 · 2. les libellés-phrases de « Contrôle des mouvements de stock » passent à la ligne ──');
for (const l of libs) {
  if (!l.m) continue;
  const a = attrs(l.m[1]);
  const chaine = base.concat(el('label', { class: 'frow', style: 'cursor:pointer' }), el('span', a));
  for (const w of PHONES) {
    const g = gagne(chaine, w, 'white-space'), mw = gagne(chaine, w, 'min-width');
    vrai(w + ' px · « ' + l.t.slice(0, 20) + '… » : white-space gagnant = normal', !!g && g.v === 'normal', g && { v: g.v, sel: g.sel });
    vrai(w + ' px · « ' + l.t.slice(0, 20) + '… » : min-width:0 (sinon un flex-item ne rétrécit pas sous son contenu)', !!mw && mw.v === '0', mw && { v: mw.v, sel: mw.sel });
  }
}
console.log('\n── 1640 · 3. contre-épreuve : un libellé COURT reste insécable (la règle n\'est pas devenue générale) ──');
{
  const court = base.concat(el('label', { class: 'frow' }), el('span', { class: 'frow-lbl' }));
  for (const w of [320, 390]) {
    const g = gagne(court, w, 'white-space');
    vrai(w + ' px : « N° » (frow-lbl nu) garde white-space:nowrap', !!g && g.v === 'nowrap', g && g.v);
  }
  const btnAutre = base.concat(RANGEE, el('button', { class: 'btn ghost sm' }));
  const g = gagne(btnAutre, 320, 'white-space');
  vrai('un autre .btn.sm (sans style en ligne) reste nowrap : on n\'a pas libéré tous les boutons', !!g && g.v === 'nowrap', g && g.v);
}

console.log('\n══ test-1640 : ' + ok + ' ✓ ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
