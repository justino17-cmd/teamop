// BILAN DU PASSAGE DU 18 NOVEMBRE : compte ce que mots-tout.sh vient de relire (écrans, textes distincts, par rôle) et l'écrit dans final/mots.json,
// champ « passage18nov ». Le relevé PROFOND du 17 novembre (« textesLus », « parRole ») reste tel quel : ses fichiers bruts vivent hors du dépôt et se perdent au redémarrage.
// usage : node mots-bilan-passage.js (après mots-tout.sh)
const fs = require('fs'), path = require('path');
const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const J = path.join(__dirname, '..', 'final', 'mots.json'); const d = JSON.parse(fs.readFileSync(J, 'utf8'));
function textes(v) { const l = []; if (!v) return l; (v.lignes || []).forEach(t => l.push(t)); (v.attrs || []).forEach(t => l.push('attribut : ' + t));
  const g = Array.isArray(v.gestes) ? v.gestes : Object.values(v.gestes || {});
  for (const x of g) { ['nouveau', 'nouveauCadre', 'lignes', 'dialogue'].forEach(k => (x[k] || []).forEach(t => l.push(t))); (x.attrs || []).forEach(t => l.push('attribut : ' + t)); if (x.toast) l.push('toast : ' + x.toast); }
  for (const c of Object.values(v.cadres || {})) if (Array.isArray(c)) c.forEach(t => l.push(t)); return l; }
const parRole = {}; const tous = new Set();
for (const q of ['marc', 'julie', 'sm', 'kb', 'client']) { const f = D + q + '-mac-interdits.json'; if (!fs.existsSync(f)) continue; const j = JSON.parse(fs.readFileSync(f)); const C = new Set(); let ecrans = 0, gestes = 0;
  for (const [e, v] of Object.entries(j.ecrans)) { if (!e.startsWith('(')) ecrans++; textes(v).forEach(t => { if (typeof t === 'string') { C.add(t); tous.add(t); } }); gestes += Array.isArray(v.gestes) ? v.gestes.length : Object.keys(v.gestes || {}).length; }
  parRole[q] = { ecrans, gestes, textesDistincts: C.size }; }
{ const f = D + 'visite-mac.json'; if (fs.existsSync(f)) { const j = JSON.parse(fs.readFileSync(f)); const C = new Set(); (j.pas || []).forEach(p => Object.values(p.morceaux || { t: [p.texte] }).flat().forEach(t => { C.add(t); tous.add(t); })); parRole.visite = { pas: (j.pas || []).length, textesDistincts: C.size }; } }
for (const q of ['connexion', 'guide-marc', 'guide-julie', 'guide-sm', 'guide-kb']) { const f = D + q + '-mac.json'; if (!fs.existsSync(f)) continue; const C = new Set(); (function w(o) { if (typeof o === 'string') { C.add(o); tous.add(o); } else if (Array.isArray(o)) o.forEach(w); else if (o && typeof o === 'object') Object.values(o).forEach(w); })(JSON.parse(fs.readFileSync(f))); parRole[q] = { textesDistincts: C.size }; }
d.passage18nov = { date: '2026-11-18', profil: 'mac (ordinateur)', methode: 'mots-tout.sh : mots-interdits.js relève chaque rubrique de chaque rôle par le navigateur (texte rendu, aria-label, title, placeholder, options, cadres compris ; les gestes du premier niveau ouvrent fenêtres et toasts ; l’espace client en trois niveaux), puis mots-hors-rubriques.js (connexion et guide des nouveautés) et mots-visite.js (la visite parlée, en morceaux), et applique mots-regles.js', textesDistincts: tous.size, parRole };
fs.writeFileSync(J, JSON.stringify(d, null, 1)); console.log('passage18nov :', tous.size, 'textes distincts', JSON.stringify(parRole));
