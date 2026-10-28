/* ══ h05 · appareils#5 — L'ÉTAT VIDE DES ABSENCES AVAIT UNE PASTILLE SANS ICÔNE ═══════════════════
   Rejoué au navigateur : `emptyState('','Aucune absence dans ce filtre.',…)` rendait un `.e-ico` vide
   (aucun <svg>) quand celui des Tâches en porte un. Un seul appel du fichier passait '' en premier
   argument. L'icône d'un état vide est un ÉMOJI que `icones()` remplace ensuite par un trait : pour
   qu'il y ait un <svg>, l'émoji doit figurer dans la table EMO ET son trait dans TRAITS.

   Ce banc EXÉCUTE la vraie `emptyState` et la vraie table EMO/TRAITS, puis RECENSE tous les appels
   du fichier : le premier argument littéral de chacun doit contenir un émoji que `icones()` sait
   remplacer. La population est comptée d'abord (une assertion sur du vide ne prouve rien).        */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ES = bloc('function emptyState(ico,txt,btn,fn)'), EMO_T = bloc('var EMO={'), TR_T = bloc('var TRAITS={');
vrai('emptyState, EMO et TRAITS sont trouvées', !!(ES && EMO_T && TR_T));
const sb = {}; vm.createContext(sb);
vm.runInContext('var boxTxt = function (s) { return s; };\n' + ES + '\n' + EMO_T + ';\n' + TR_T + ';', sb);
const EMO = sb.EMO, TRAITS = sb.TRAITS, emptyState = sb.emptyState;

console.log('\n── 1440 · 1. la population des appels ──');
const appels = [];
const re = /emptyState\(\s*(['"`])((?:\\.|(?!\1).)*)\1/g; let m;
while ((m = re.exec(SRC))) appels.push(m[2]);
vrai('au moins 40 appels littéraux recensés (population non vide)', appels.length >= 40, appels.length);
const vides = appels.filter(a => !a.trim());
vrai('aucun appel littéral ne passe une icône VIDE (un émoji hors table reste au moins un signe)', vides.length === 0, vides);

console.log('\n── 1440 · 2. l\'état vide des Absences ──');
const idx = SRC.indexOf('Aucune absence dans ce filtre.');
vrai('l\'appel des Absences est trouvé', idx > 0);
const avant = SRC.slice(Math.max(0, idx - 80), idx);
const mm = /emptyState\(\s*'([^']*)'\s*,\s*'$/.exec(avant);
vrai('son premier argument se lit', !!mm, avant);
const ico = mm ? mm[1] : '';
vrai('l\'icône n\'est pas vide', ico.length > 0, ico);
const html = emptyState(ico, 'Aucune absence dans ce filtre.', '＋ Absence', 'formAbsence()');
const clef = Object.keys(EMO).find(k => html.indexOf(k) >= 0);
vrai('le carré .e-ico porte un émoji que icones() remplacera par un <svg>', !!clef && !!TRAITS[EMO[clef]], html);
const nav = /\{k:'absences',ic:'([^']*)'/.exec(SRC);
vrai('c\'est l\'icône de la rubrique (celle du menu NAV)', !!nav && nav[1] === ico, ico);

console.log('\n' + ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
