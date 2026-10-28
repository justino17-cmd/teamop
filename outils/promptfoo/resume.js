#!/usr/bin/env node
/* LE RÉSUMÉ D'UNE ÉVALUATION (28 octobre 2026) — lit le JSON que promptfoo a écrit (`-o`) et dit, cas par cas, ce qui passe et ce qui tombe, en une ligne chacun.
 *
 * Usage : node resume.js <fichier.json> [--attendu bonne|mauvaise|libre]
 *   · bonne    — la réponse simulée BONNE : tout doit passer (sinon une assertion crie à tort) ;
 *   · mauvaise — la réponse simulée MAUVAISE : tout doit tomber, et sur les assertions que le cas nomme (`metadata.attrape`) — sinon l’assertion est aveugle à ce défaut ;
 *   · libre    — l’évaluation réelle : on rapporte, le code de sortie est 1 dès qu’un cas tombe.
 * Ne recopie de la réponse du modèle que la raison de l’assertion (quelques mots) — jamais la réponse entière. */
'use strict';
const fs = require('fs');

const fichier = process.argv[2];
const i = process.argv.indexOf('--attendu');
const attendu = i >= 0 ? process.argv[i + 1] : 'libre';
if (!fichier || !['bonne', 'mauvaise', 'libre'].includes(attendu)) { console.error('usage : node resume.js <fichier.json> [--attendu bonne|mauvaise|libre]'); process.exit(2); }

let j;
try { j = JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch (e) { console.error('résultat illisible : ' + fichier); process.exit(2); }
const lignes = (j.results && j.results.results) || [];
if (!lignes.length) { console.error('aucun résultat dans ' + fichier + ' : une évaluation vide ne prouve rien'); process.exit(2); }

let anormaux = 0, passes = 0, tombes = 0, erreurs = 0;
for (const r of lignes.slice().sort((x, y) => String(x.testCase.vars.id).localeCompare(String(y.testCase.vars.id)))) {
  const id = r.testCase.vars.id, titre = r.testCase.vars.agent + ' · ' + r.testCase.vars.titre;
  if (r.error && !(r.gradingResult && r.gradingResult.componentResults)) { erreurs++; anormaux++; console.log('  ! ' + id + ' ' + titre + ' — ERREUR : ' + String(r.error).slice(0, 200)); continue; }
  const comp = (r.gradingResult && r.gradingResult.componentResults) || [];
  const tombees = comp.filter(c => !c.pass);
  if (r.success) passes++; else tombes++;
  let note = '';
  if (attendu === 'bonne' && !r.success) { anormaux++; note = ' ← DEVRAIT PASSER'; }
  if (attendu === 'mauvaise') {
    const voulues = ((r.testCase.metadata && r.testCase.metadata.attrape) || []);
    const manque = voulues.filter(m => !tombees.some(c => c.assertion && c.assertion.metric === m));
    if (r.success) { anormaux++; note = ' ← LA MAUVAISE RÉPONSE PASSE'; }
    else if (manque.length) { anormaux++; note = ' ← AVEUGLE À : ' + manque.join(', '); }
  }
  console.log('  ' + (r.success ? '✓' : '✗') + ' ' + id + ' ' + titre + (tombees.length ? ' — ' + tombees.map(c => (c.assertion && c.assertion.metric) + ' : ' + String(c.reason).slice(0, 110)).join(' | ') : '') + note);
}
console.log('\n' + passes + ' ✓ passent · ' + tombes + ' ✗ tombent · ' + erreurs + ' erreurs sur ' + lignes.length + ' cas' + (attendu === 'libre' ? '' : ' (attendu : ' + (attendu === 'bonne' ? 'tout passe' : 'tout tombe, sur les assertions nommées') + ')'));
process.exit(attendu === 'libre' ? (tombes || erreurs ? 1 : 0) : (anormaux ? 1 : 0));
