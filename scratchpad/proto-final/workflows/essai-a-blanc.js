// ESSAI À BLANC du lanceur des voies : charge voies.js comme le fait l'outil Workflow (corps dans une fonction asynchrone,
// « args », « agent », « log » fournis), avec un faux agent qui ne lance rien, et joue CHAQUE voie d'un bout à l'autre.
// Pourquoi : une constante lue avant sa déclaration, une virgule de trop ou une voie mal nommée tuent le script au
// chargement — et on ne le voit qu'au moment de lancer la voie, la nuit, quand une place se libère.
//   node scratchpad/proto-final/workflows/essai-a-blanc.js            # toutes les voies
//   node scratchpad/proto-final/workflows/essai-a-blanc.js artefact   # une voie, avec le début de chaque consigne
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, 'voies.js'), 'utf8');
const corps = src.replace(/^export const meta\b/m, 'const meta');
if (corps === src) { console.log('✗ « export const meta » introuvable en tête de voies.js'); process.exit(1); }
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
let fn;
try { fn = new AsyncFunction('args', 'agent', 'log', 'phase', 'parallel', 'pipeline', 'budget', corps); }
catch (e) { console.log('✗ voies.js ne se compile pas :', e.message); process.exit(1); }

// Les voies à table fixe, et celles qui se construisent à partir des arguments (avec un jeu d'arguments d'essai).
const ESSAIS = [
  ['materiel', {}], ['vehtemps', {}], ['mail', {}], ['menu', {}], ['double-auth', {}], ['compositeur', {}], ['securite', {}],
  ['entreprise', {}], ['artefact', {}], ['retour', {}], ['guide', {}],
  ['campagne', { cles: ['coque', 'accueil', 'planning', 'taches-absences', 'interventions', 'clients', 'contrats', 'compta-ventes', 'compta-reste', 'technicien', 'client', 'metier-3d', 'devis-atelier', 'mail', 'achats', 'materiel', 'vehicules-temps', 'equipe'], arbre: '/home/user/wt-x' }],
  ['final-rejeu', { familles: ['atelier', 'mail'], arbre: '/home/user/wt-x' }],
  ['final-regard', { role: 'gerant', rubriques: ['Accueil', 'Planning'], arbre: '/home/user/wt-x' }],
  ['restes', { noms: ['taches-absences', 'planning'], arbre: '/home/user/wt-x' }],
  ['final-parcours', { arbre: '/home/user/wt-x' }], ['final-mots', { arbre: '/home/user/wt-x' }], ['final-rapport', { arbre: '/home/user/wt-x' }],
];
const seule = process.argv[2];
(async () => {
  let ko = 0, voies = 0, etapes = 0;
  for (const [voie, a] of ESSAIS) {
    if (seule && voie !== seule) continue;
    const vus = [];
    const agent = async (texte, opts) => {
      // Ce que chaque consigne doit porter, quelle que soit la voie : sinon l'agent travaille sans règles ni sauvegarde.
      const manque = ['RÈGLES :', 'SAUVEGARDE OBLIGATOIRE', 'RAPPORT (ta valeur de retour', 'git fetch origin claude/op-gestion-interface-yb6p32'].filter(m => !texte.includes(m));
      if (/undefined|\[object Object\]|NaN/.test(texte)) manque.push('« undefined », « [object Object] » ou « NaN » dans la consigne');
      if (!opts || opts.model !== 'sonnet') manque.push('modèle autre que sonnet');
      if (!opts || !opts.label || opts.label.length > 60) manque.push('étiquette absente ou trop longue');
      vus.push({ label: opts && opts.label, n: texte.length, manque, debut: texte.split('\n').find(l => /^VOIE «/.test(l)) || '' , texte });
      return 'rapport d\'essai';
    };
    try {
      const r = await fn({ voie, ...a }, agent, () => {}, () => {}, async t => Promise.all(t.map(f => f())), async () => [], { total: null, spent: () => 0, remaining: () => Infinity });
      voies++; etapes += vus.length;
      const faux = vus.filter(v => v.manque.length);
      if (!vus.length || !Array.isArray(r) || r.length !== vus.length || faux.length) { ko++; console.log('✗', voie, ':', vus.length, 'étape(s)', faux.map(v => v.label + ' → ' + v.manque.join(', ')).join(' ; ')); }
      else console.log('✓', voie, ':', vus.length, 'étape(s) ·', vus.map(v => v.label.split(':').slice(2).join(':')).join(', ').slice(0, 150));
      if (seule) for (const v of vus) console.log('\n──', v.label, '(' + v.n + ' caractères)\n' + v.texte.slice(v.texte.indexOf('VOIE «'), v.texte.indexOf('VOIE «') + 700));
    } catch (e) { ko++; console.log('✗', voie, ': le script jette —', e.message); }
  }
  // Reprise : « depuis » et « jusqua » ne jouent que la tranche demandée.
  if (!seule) {
    const vus = []; await fn({ voie: 'mail', depuis: 2, jusqua: 3 }, async (t, o) => { vus.push(o.label); return 'x'; }, () => {});
    if (vus.length !== 2 || !/^mail:3:/.test(vus[0]) || !/^mail:4:/.test(vus[1])) { ko++; console.log('✗ reprise { depuis:2, jusqua:3 } :', vus.join(' | ')); } else console.log('✓ reprise { depuis:2, jusqua:3 } : 2 étapes,', vus.join(' | '));
    // Un arbre passé en argument remplace celui de la voie (deux tranches d'une même voie côte à côte).
    let vu = ''; await fn({ voie: 'securite', depuis: 2, jusqua: 2, arbre: '/home/user/wt-autre' }, async (t2, o) => { vu = t2; return 'x'; }, () => {});
    if (!vu.includes('Ton arbre de travail git : /home/user/wt-autre') || vu.includes('/home/user/wt-securite')) { ko++; console.log('✗ arbre en argument : la consigne ne porte pas le bon arbre'); } else console.log('✓ arbre en argument : la consigne porte /home/user/wt-autre et plus /home/user/wt-securite');
    let jete = false; try { await fn({ voie: 'inconnue' }, async () => 'x', () => {}); } catch (e) { jete = true; }
    if (!jete) { ko++; console.log('✗ une voie inconnue ne jette pas'); } else console.log('✓ une voie inconnue jette');
  }
  console.log(`\n${voies} voie(s) · ${etapes} étape(s) · ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})();
