// Les écrans que les gestes ont fait découvrir (fiche d'intervention, de client, de devis, de facture…) : un par FAMILLE d'adresse (les chiffres
// deviennent #), deux au plus, hors rubriques du menu. Sert de liste de routes à mots-releve.js --nom decouvertes. usage : node mots-decouvertes.js <rôle> [profil] [par famille]
const fs = require('fs'); const D = '/tmp/claude-0/-home-user-teamop/8050f26e-cdde-5a38-bb11-ba578db16f81/scratchpad/cap/final-mots/';
const q = process.argv[2] || 'marc', prof = process.argv[3] || 'mac', par = +(process.argv[4] || 2);
const fam = {}; const menu = new Set();
for (const f of fs.readdirSync(D).filter(f => f.startsWith(q + '-' + prof) && !f.includes('decouvertes') && f.endsWith('.json'))) { const r = JSON.parse(fs.readFileSync(D + f));
  for (const [nom, e] of Object.entries(r.ecrans)) { if (!nom.startsWith('(')) menu.add(nom);
    const vus = g => { if (g.hash) { const h = g.hash.replace(/^#/, ''); const k = h.replace(/[0-9]+/g, '#'); (fam[k] = fam[k] || new Set()).add(h); } };
    (Array.isArray(e.gestes) ? e.gestes : []).forEach(vus); for (const c of Object.values(e.cadres || {})) (c.gestes || []).forEach(vus); } }
const sortie = []; for (const [k, hs] of Object.entries(fam)) { if (menu.has(k)) continue; const tous = [...hs].filter(h => !menu.has(h)); sortie.push(...tous.slice(0, par)); }
console.log([...new Set(sortie)].join(','));
