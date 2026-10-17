/* ══ OP MESSAGES — LA BULLE ENVOYÉE NE SE CONFOND PAS AVEC LE FOND CHOISI, DE NUIT (lot m21) ═════════════════════════════════════════════════════════════════════════════════════
   Relevé du 17 octobre 2026 (testeurs, au pixel, iPhone, nuit) : « Fond et couleurs » offre 8 fonds × 9 bulles = 72 combinaisons. De jour, la plus faible fait 3,65:1 entre la bulle et le
   fond. De NUIT, 9 combinaisons sur 72 tombent sous 1,5:1 : la bulle Graphite (#3a3a3c) sur sept des huit fonds — Sable : 1,00 à 1,38, la bulle est presque invisible — et la bulle
   Bordeaux (#8e1b3a) sur Océan et Sable. Cause : les fonds de nuit sont `color-mix(teinte 14–24 %, var(--base))` sur un bleu nuit (#0b1633), donc sombres ; un graphite ou un bordeaux
   choisis pour le JOUR (où ils se lisent sur un fond clair) y sont aussi sombres que le décor.
   « Une surface élevée est PLUS CLAIRE que son fond » (CLAUDE.md, thème de nuit) : en nuit, ces deux couleurs s'éclaircissent — sans quitter leur nom — en gardant le BLANC lisible
   dessus (≥ 4,5:1, le texte du message). La pastille du choix (.theme-rond) partage la règle : elle suit.
   Ce banc REJOUE la feuille réelle (tests/outils-css-msg.js) : le dégradé de chaque fond (ses deux arrêts, mélangés au --base du mode), la couleur de chaque bulle, l'encre posée dessus.
   ⛔ Population comptée d'abord : 72 combinaisons par mode, sinon un zéro passerait sur un ensemble vide. Le pixel est mesuré par tests/sonde-opmessages-contrastes.js. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const C = require('./outils-css-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');

const L = C.lire(RACINE);
vrai('(population) la feuille est lue (' + L.css.length + ' caractères, ' + L.regles.length + ' règles)', L.css.length > 20000 && L.regles.length > 500);

/* les choix, tels que la PAGE les propose : on les lit dans son script, on ne les recopie pas */
const FONDS = [...L.page.matchAll(/const FONDS_CONV = \[(.*?)\];/g)].flatMap(m => [...m[1].matchAll(/\['([a-z]+)'/g)].map(x => x[1]));
const BULLES = [...L.page.matchAll(/const BULLES_CONV = \[(.*?)\];/g)].flatMap(m => [...m[1].matchAll(/\['([a-z]+)'/g)].map(x => x[1]));
v('(population) 8 fonds et 9 couleurs de bulle sont proposés', [FONDS.length, BULLES.length], [8, 9]);

const SEUIL_BULLE_FOND = 1.5, SEUIL_ENCRE = 4.5;
for (const nuit of [false, true]) {
  const J = C.jetons(L, nuit), mode = nuit ? 'nuit' : 'jour', ctx = { nuit };
  const base = C.couleur('var(--base)', J);
  /* les arrêts de chaque fond : les deux color-mix du linear-gradient */
  const arrets = {};
  for (const f of FONDS) {
    if (f === 'aucun') { arrets[f] = [base]; continue; }
    const bg = C.valeur(L, '.conv-ecran[data-fond="' + f + '"]', 'background-image', ctx) || '';
    const g = /linear-gradient\((.*)\)\s*$/.exec(bg);
    const parts = g ? (function (s) { const o = []; let n = 0, d = 0; for (let i = 0; i <= s.length; i++) { const c = s[i]; if (c === '(') n++; else if (c === ')') n--; if (i === s.length || (c === ',' && !n)) { o.push(s.slice(d, i).trim()); d = i + 1; } } return o; })(g[1]).slice(1) : [];
    arrets[f] = parts.map(p => C.sur(C.couleur(p, J), base));
  }
  vrai('(population) ' + mode + ' : chaque fond a ses arrêts lus (' + FONDS.map(f => f + ':' + arrets[f].length).join(' ') + ')', FONDS.every(f => arrets[f].length === (f === 'aucun' ? 1 : 2)));
  let n = 0; const faibles = [], illisibles = [];
  for (const b of BULLES) {
    const sel = b === 'defaut' ? '.envoyee' : '.conv-ecran[data-bulle="' + b + '"] .envoyee';
    const bg = C.valeur(L, sel, 'background', ctx), ink = C.valeur(L, sel, 'color', ctx);
    if (!bg || !ink) { illisibles.push(b + ' (règle absente)'); continue; }
    const cb = C.sur(C.couleur(bg, J), base), ci = C.sur(C.couleur(ink, J), cb);
    const rEncre = C.ratio(ci, cb);
    if (rEncre < SEUIL_ENCRE) illisibles.push(b + ' ' + rEncre.toFixed(2));
    for (const f of FONDS) { n++; const r = Math.min(...arrets[f].map(a => C.ratio(cb, a))); if (r < SEUIL_BULLE_FOND) faibles.push(b + ' sur ' + f + ' ' + r.toFixed(2)); }
  }
  v('(population) ' + mode + ' : ' + FONDS.length * BULLES.length + ' combinaisons bulle / fond mesurées', n, FONDS.length * BULLES.length);
  vrai(mode + ' : aucune bulle envoyée ne se confond avec son fond (< ' + SEUIL_BULLE_FOND + ':1) — ' + faibles.length + ' sur ' + n + (faibles.length ? ' : ' + faibles.join(' · ') : ''), !faibles.length);
  vrai(mode + ' : l\'encre de chaque bulle tient ≥ ' + SEUIL_ENCRE + ':1' + (illisibles.length ? ' — ' + illisibles.join(' · ') : ''), !illisibles.length);
}
fin();
