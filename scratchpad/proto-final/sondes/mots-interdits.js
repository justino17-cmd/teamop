// MOTS INTERDITS (voie « final-mots », 17 novembre 2026) : rend chaque écran de chaque rôle dans le navigateur, relève tout le texte affiché
// (texte rendu, aria-label, title, placeholder, options ; cadres compris ; fenêtres et toasts ouverts par les gestes du premier niveau) et refuse
// les mots écartés (mots-regles.js : échafaudage, « patron », jargon, abréviations, « courriel », typographie, tutoiement, phrases trop longues).
// Compte les écrans et les textes lus (une population vide ne prouve rien) ; « N ✓ · M ✗ », sort en 1 au premier ✗.
//   node mots-interdits.js <marc|julie|sm|kb|client|tous> [profil]   : relève (≈ 4 à 6 minutes par rôle) puis contrôle
//   node mots-interdits.js --corpus [rôle…]                          : contrôle les relevés PROFONDS déjà faits (mots-releve.js), sans navigateur
const { spawnSync } = require('child_process'); const fs = require('fs'), path = require('path');
const A = require('./mots-analyse.js'), R = require('./mots-regles.js'); const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const args = process.argv.slice(2); const corpusSeul = args.includes('--corpus'); const reste = args.filter(a => !a.startsWith('--'));
const ROLES = (corpusSeul ? (reste.length ? reste : ['marc', 'julie', 'sm', 'kb', 'client', 'connexion', 'guide-marc', 'guide-julie', 'guide-sm', 'guide-kb', 'visite']) : (reste[0] === 'tous' || !reste[0] ? ['marc', 'julie', 'sm', 'kb', 'client'] : [reste[0]]));
const PROFIL = (!corpusSeul && reste[1]) || 'mac';
const MIN = { marc: [20, 1500], julie: [8, 600], sm: [5, 300], kb: [5, 300], client: [3, 150], connexion: [1, 15], 'guide-marc': [3, 30], 'guide-julie': [3, 30], 'guide-sm': [3, 30], 'guide-kb': [3, 30], visite: [20, 80] };   // [écrans, textes] au moins : la population
let ok = 0, ko = 0; const echecs = [];
const v = (nom, cond, detail) => { if (cond) { ok++; } else { ko++; echecs.push(nom + (detail ? ' :: ' + detail : '')); console.log('  ✗', nom, detail ? '→ ' + detail : ''); } return !!cond; };
for (const q of ROLES) {
  if (!corpusSeul) {   // un relevé NEUF (hors du relevé profond, qui garde son nom)
    const f = D + q + '-' + PROFIL + '-interdits.json'; try { fs.unlinkSync(f); } catch (e) {}
    const r = spawnSync('node', [path.join(__dirname, 'mots-releve.js'), q, PROFIL, '--nom', 'interdits', ...(q === 'client' ? ['--profondeur', '2', '--max', '40', '--temps', '45'] : ['--profondeur', '1', '--max', '8', '--temps', '11']), '--budget', '520']   /* l’espace client n’a pas de menu : ses écrans sont des onglets, que seuls les gestes ouvrent */, { encoding: 'utf8', timeout: 570000 });
    v(q + ' : le relevé s’est terminé', r.status === 0 && fs.existsSync(f), (r.stderr || r.stdout || '').slice(-200));
  }
  const fichiers = fs.readdirSync(D).filter(f => f.startsWith(q + '-') && f.endsWith('.json') && (corpusSeul ? !f.endsWith('-interdits.json') : f.endsWith('-interdits.json')));
  let ecrans = 0; const C = new Map(); const parEcran = {};
  for (const f of fichiers) { const r = JSON.parse(fs.readFileSync(D + f));
    if (q === 'visite') { (r.pas || []).forEach((x, i) => { const l = (parEcran['pas ' + i] = parEcran['pas ' + i] || []); if (x.morceaux) Object.values(x.morceaux).flat().forEach(t => l.push([t, 'visite'])); else l.push([x.texte, 'visite']); }); ecrans += (r.pas || []).length; continue; }
    for (const [nom, e] of Object.entries(r.ecrans || {})) { if (!nom.startsWith('(')) ecrans++; const lst = (parEcran[nom] = parEcran[nom] || []);
      const lire = o => { (o.lignes || []).forEach(l => lst.push([l, 'écran'])); (o.attrs || []).forEach(a => lst.push([a, 'attribut'])); };
      lire(e); for (const [k, cd] of Object.entries(e.cadres || {})) { lire(cd); (Array.isArray(cd.gestes) ? cd.gestes : []).forEach(g => gest(g, lst)); } (Array.isArray(e.gestes) ? e.gestes : []).forEach(g => gest(g, lst)); } }
  function gest(g, lst) { if (g.toast) lst.push([g.toast, 'toast']); (g.dialogue || []).forEach(d => lst.push([d, 'boîte'])); (g.lignes || []).forEach(l => lst.push([l, 'fenêtre'])); (g.attrs || []).forEach(a => lst.push([a, 'attribut'])); (g.nouveau || []).forEach(l => lst.push([l, 'écran'])); (g.nouveauCadre || []).forEach(l => lst.push([l, 'cadre'])); }
  for (const lst of Object.values(parEcran)) lst.forEach(([t]) => C.set(t, 1));
  const [minE, minT] = MIN[q] || [1, 10]; v(`${q} : population — ${ecrans} écrans, ${C.size} textes distincts relevés`, ecrans >= minE && C.size >= minT, `il en faut au moins ${minE} écrans et ${minT} textes`);
  const role = /^(marc|julie|sm|kb)$/.test(q) || q.startsWith('guide') || q === 'visite' || q === 'connexion' ? 'equipe' : 'client';
  for (const [ecran, lst] of Object.entries(parEcran)) { const vus = new Set(); const tombes = [];
    for (const [t, type] of lst) { if (vus.has(t)) continue; vus.add(t); for (const x of R.controler(t, { role: q === 'client' ? 'client' : 'equipe', type, ou: ecran })) tombes.push(`${x.regle} « ${x.extrait} » :: ${t.slice(0, 90)}`); }
    if (!lst.length) continue; v(`${q} › ${ecran} : aucun mot écarté (${vus.size} textes)`, tombes.length === 0, tombes.slice(0, 3).join(' | ')); }
}
console.log(`\n${ok} ✓ · ${ko} ✗`); if (ko) { console.log(echecs.slice(0, 40).join('\n')); process.exit(1); }
