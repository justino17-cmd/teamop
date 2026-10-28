/* 3076 — LES PETITS LIENS DU PORTAIL SE TOUCHENT AU DOIGT (audit des appareils, 26 octobre 2026). « Mot de passe oublié ? » et « Équipe TeamOP » (espace.html)
   répondaient sur 16 px de haut au téléphone ; « Espace client TeamOP » (connexion.html) est de la même famille. Au doigt seulement (`pointer:coarse`), la classe
   `lien-doigt` agrandit la zone à 44 px sans bouger la mise en page (marge négative égale au rembourrage). Mesure au navigateur : 16 → 44 et 50 px au téléphone, 16
   inchangé au bureau (scratchpad/sonde-liens-doigt.js). Ce banc lit le CODE (commentaires retirés), copies d'aperçu comprises. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? ' — ' + d : '')); } };
const code = f => fs.readFileSync(path.join(RACINE, f), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
console.log('\n── 3076 · les petits liens du portail se touchent au doigt ──');
for (const [f, liens] of [['espace.html', [/<a href="#" class="lien-doigt" onclick="motDePasseOublie\(\);return false"/, /<a href="#" class="lien-doigt" id="lnk-equipe"/]], ['connexion.html', [/<a href="\/espace\.html" class="lien-doigt"/]],
  ['apercu/espace.html', [/class="lien-doigt" onclick="motDePasseOublie/]], ['apercu/connexion.html', [/class="lien-doigt"/]]]) {
  const s = code(f);
  const m = /@media \(pointer:coarse\)\{\.lien-doigt\{display:inline-block;padding:(\d+)px (\d+)px;margin:-(\d+)px -(\d+)px\}\}/.exec(s);
  vrai(f + ' : la règle est posée au doigt seulement, en bloc en ligne', !!m);
  if (m) {
    vrai(f + ' : la zone atteint 44 px (rembourrage ≥ 15 px sur un texte de 12,5 à 14 px)', Number(m[1]) >= 15, m[1]);
    vrai(f + ' : la marge négative rend exactement le rembourrage (la mise en page ne bouge pas)', m[1] === m[3] && m[2] === m[4], m[0]);
  }
  for (const re of liens) vrai(f + ' : le lien porte la classe — ' + re.source.slice(0, 60), re.test(s));
}
console.log(`\ntest-3076 : ${ok} ✓ ${ko} ✗`);
process.exit(ko ? 1 : 0);
