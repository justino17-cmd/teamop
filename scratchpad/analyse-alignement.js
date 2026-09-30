/* Lit le relevé de sonde-tour-telephone.js et cherche les DÉPARTS DE TEXTE PRESQUE ALIGNÉS : deux textes
   posés l'un sous l'autre (à moins de LIM_Y px), cadrés à gauche, dont les premières lignes commencent à
   moins de 6 px l'une de l'autre sans commencer au même endroit. C'est le décalage qui se voit : deux
   colonnes qui devraient n'en faire qu'une. Écart nul = aligné ; écart franc (≥ 6 px) = un retrait voulu.
   Usage : node scratchpad/analyse-alignement.js [releve.json] */
'use strict';
const fs = require('fs'), path = require('path');
const F = process.argv[2] || '/tmp/claude-0/-home-user-teamop/2b5579ae-09a0-571f-9bc9-ac0e61b4c7de/scratchpad/tour-tel/releve.json';
const R = JSON.parse(fs.readFileSync(F, 'utf8'));
const LIM_Y = +(process.env.LIM_Y || 90), MIN = +(process.env.MIN || 0.6), MAX = +(process.env.MAX || 6);
let total = 0, nTextes = 0;
for (const [vue, rel] of Object.entries(R)) {
  const T = rel.textes.filter(t => !t.rouleau && !/center|right|end/.test(t.ta)).sort((a, b) => a.y - b.y || a.x - b.x);
  nTextes += T.length;
  const vus = new Set(), sortie = [];
  for (let i = 0; i < T.length; i++) for (let j = i + 1; j < T.length; j++) {
    const a = T[i], b = T[j]; if (b.y - a.y > LIM_Y) break;
    if (b.y - a.y < 4) continue;                       // même ligne : côte à côte, pas l'un sous l'autre
    const dx = Math.abs(a.x - b.x); if (dx < MIN || dx > MAX) continue;
    const k = a.x.toFixed(0) + '/' + b.x.toFixed(0) + ' ' + a.chaine[0] + ' ~ ' + b.chaine[0]; if (vus.has(k)) continue; vus.add(k);
    sortie.push('  ' + a.x + ' « ' + a.t.slice(0, 30) + ' » (' + a.chaine.slice(0, 2).join(' < ') + ')\n    ' + b.x + ' « ' + b.t.slice(0, 30) + ' » (' + b.chaine.slice(0, 2).join(' < ') + ')  écart ' + dx.toFixed(1) + ' px, ' + Math.round(b.y - a.y) + ' px plus bas');
  }
  total += sortie.length;
  console.log('\n── ' + vue + ' · bord de page ' + rel.bordG.toFixed(1) + ' → ' + rel.bordD.toFixed(1) + ' · ' + T.length + ' textes · ' + sortie.length + ' presque-alignements');
  sortie.slice(0, 30).forEach(s => console.log(s));
}
console.log('\n══ ' + total + ' presque-alignements sur ' + nTextes + ' textes, ' + Object.keys(R).length + ' vues (écart ' + MIN + '–' + MAX + ' px, à moins de ' + LIM_Y + ' px l’un sous l’autre)');
if (!nTextes) { console.log('⛔ POPULATION VIDE'); process.exit(1); }
