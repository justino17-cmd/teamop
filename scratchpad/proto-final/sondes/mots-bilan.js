// Compte ce que le relevé a LU (écrans, gestes joués, fenêtres, toasts, textes distincts) et l'écrit dans final/mots.json (champs textesLus et parRole).
// Les corrections viennent de final/mots-corrections.py ; les synonymes et les laisses sont écrits à la main dans mots.json (un jugement, pas une mesure).
// usage : node mots-bilan.js
const fs = require('fs'), path = require('path'); const A = require('./mots-analyse.js'); const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const J = path.join(__dirname, '..', 'final', 'mots.json'); const d = fs.existsSync(J) ? JSON.parse(fs.readFileSync(J, 'utf8')) : {};
const parRole = {}; let total = 0; const tousTextes = new Set();
for (const q of ['marc', 'julie', 'sm', 'kb', 'client', 'connexion', 'guide-marc', 'guide-julie', 'guide-sm', 'guide-kb', 'visite']) {
  let C; try { C = A.corpus(q); } catch (e) { continue; } if (!C.size) continue;
  const fichiers = fs.readdirSync(D).filter(f => f.startsWith(q + '-') && f.endsWith('.json') && !f.endsWith('-interdits.json') && !/-tel|iphone/.test(f)); let ecrans = new Set(), gestes = 0, fenetres = 0, toasts = 0, cadres = new Set();
  for (const f of fichiers) { const r = JSON.parse(fs.readFileSync(D + f)); if (q === 'visite') { ecrans = new Set((r.pas || []).map((_, i) => 'pas ' + i)); continue; }
    for (const [nom, e] of Object.entries(r.ecrans || {})) { if (!nom.startsWith('(')) ecrans.add(nom); const g = Array.isArray(e.gestes) ? e.gestes : []; gestes += g.length; g.forEach(x => { if (x.panneau) fenetres++; if (x.toast) toasts++; });
      for (const [k, cd] of Object.entries(e.cadres || {})) { const gg = Array.isArray(cd.gestes) ? cd.gestes : []; if (gg.length || (cd.lignes || []).length) cadres.add(k); gestes += gg.length; gg.forEach(x => { if (x.panneau) fenetres++; if (x.toast) toasts++; }); } } }
  const types = {}; for (const [t, o] of C) { types[o.type] = (types[o.type] || 0) + 1; tousTextes.add(t); }
  parRole[q] = { ecrans: ecrans.size, gestesJoues: gestes, fenetresOuvertes: fenetres, toastsLus: toasts, cadresLus: [...cadres], textesDistincts: C.size, parType: types }; total += C.size; }
d.textesLus = tousTextes.size; d.parRole = parRole; d.relevé = { date: '2026-11-17', profil: 'mac (ordinateur)', methode: 'mots-releve.js : le navigateur ouvre chaque rubrique du rôle puis joue chaque geste visible, trois niveaux, et lit le texte rendu, les aria-label, title, placeholder et options ; mots-hors-rubriques.js : connexion et guide des nouveautés ; mots-visite.js : la visite parlée' };
fs.writeFileSync(J, JSON.stringify(d, null, 1)); console.log('textes distincts (tous rôles confondus) :', tousTextes.size); console.log(JSON.stringify(parRole, null, 0).slice(0, 900));
