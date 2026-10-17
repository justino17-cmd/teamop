/* Contre-épreuve du CONTRÔLE client mystère (scripts/controle/) : un contrôle qui passe ne prouve rien tant qu'on ne
   l'a pas vu ÉCHOUER (CLAUDE.md). Chaque mutation remet un vrai défaut dans une COPIE du dépôt (git archive de HEAD —
   rien n'est touché ici), lance le contrôle de cette copie, et exige le constat attendu.

   ⛔ Ordre du dépôt : correctif → banc → commit → mutation. Ce script part de HEAD : ce qui n'est pas commité n'est
   pas éprouvé (et ne peut pas être effacé non plus).
   Usage : node scratchpad/mutations-controle.js            (toutes)
           SEULES=M2,M5 node scratchpad/mutations-controle.js */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const { execSync, spawnSync } = require('child_process');
const DEPOT = path.join(__dirname, '..');

const MUTATIONS = [
  { id: 'TEMOIN', quoi: 'aucune mutation : le parcours entier passe', fichier: null,
    attendu: r => r.resume.reussies === r.resume.etapes && r.resume.bloquants === 0 },
  { id: 'M1', quoi: 'une rubrique de l\'application jette (Stock)', fichier: 'app.html',
    avant: 'views.stock=function(){\n', apres: 'views.stock=function(){ throw new Error("mutation-controle-M1");\n',
    attendu: r => r.constats.some(c => /Erreur JavaScript/.test(c.titre) && /mutation-controle-M1/.test(c.detail)) || r.etapes.some(e => /rubrique/.test(e.nom) && e.statut === 'échouée') },
  { id: 'M2', quoi: 'la route de paiement plante (500)', fichier: 'server/index.js',
    avant: '    const { price, quantity, ref, options } = req.body || {};\n', apres: '    const { price, quantity, ref, options } = req.body || {}; throw new Error("mutation-controle-M2");\n',
    attendu: r => r.constats.some(c => c.gravite === 'bloquant' && /Paiement/.test(c.titre)) && r.constats.some(c => /répond 500/.test(c.titre) && /stripe\/checkout/.test(c.titre)) },
  { id: 'M3', quoi: 'le courriel de confirmation perd son lien', fichier: 'server/comptes.js',
    avant: "'/reinit.html?mode=verifyEmail&jeton='", apres: "'/reinit.html?jeton='",
    attendu: r => r.constats.some(c => c.gravite === 'bloquant' && /Confirmez votre adresse/.test(c.titre)) },
  { id: 'M4', quoi: 'le serveur écrit l\'adresse du client dans son journal', fichier: 'server/comptes.js',
    avant: "  app.post('/api/compte/creer', async (req, res) => {\n    const b = req.body || {};\n    const mail = normMail(b.email);\n",
    apres: "  app.post('/api/compte/creer', async (req, res) => {\n    const b = req.body || {};\n    const mail = normMail(b.email); console.log('compte demandé par ' + mail);\n",
    attendu: r => r.constats.some(c => /Donnée personnelle/.test(c.titre) && /adresse e-mail/.test(c.detail)) },
  { id: 'M5', quoi: '« undefined » s\'affiche sur la page de paiement', fichier: 'recap-abonnement.html',
    avant: '<h1 class="titre-page">Votre formule en détail</h1>', apres: '<h1 class="titre-page">Votre formule undefined</h1>',
    attendu: r => r.constats.some(c => /Texte suspect/.test(c.titre) && /undefined/.test(c.titre)) },
];

const seules = process.env.SEULES ? process.env.SEULES.split(',') : null;
let ok = 0, ko = 0;
for (const m of MUTATIONS) {
  if (seules && !seules.includes(m.id)) continue;
  const copie = fs.mkdtempSync(path.join(os.tmpdir(), 'mut-controle-'));
  try {
    execSync('git -C ' + JSON.stringify(DEPOT) + ' archive HEAD | tar -x -C ' + JSON.stringify(copie));
    fs.symlinkSync(path.join(DEPOT, 'server', 'node_modules'), path.join(copie, 'server', 'node_modules'));
    if (m.fichier) {
      const f = path.join(copie, m.fichier), s = fs.readFileSync(f, 'utf8'), n = s.split(m.avant).length - 1;
      if (n !== 1) { console.log('  ✗ ' + m.id + ' : le point d\'injection apparaît ' + n + ' fois (attendu 1) — mutation mal visée'); ko++; continue; }
      fs.writeFileSync(f, s.replace(m.avant, m.apres));
    }
    const sortie = path.join(copie, 'sortie');
    const t0 = Date.now();
    const x = spawnSync(process.execPath, [path.join(copie, 'scripts', 'controle', 'controle.js'), sortie], { encoding: 'utf8', timeout: 400000 });
    let r = null; try { r = JSON.parse(fs.readFileSync(path.join(sortie, 'rapport.json'), 'utf8')); } catch (e) {}
    const vu = !!r && m.attendu(r);
    vu ? ok++ : ko++;
    console.log('  ' + (vu ? '✓' : '✗') + ' ' + m.id + ' — ' + m.quoi + ' : ' + (r ? r.resume.reussies + '/' + r.resume.etapes + ' étapes, ' + r.resume.bloquants + ' bloquant(s), ' + r.resume.defauts + ' défaut(s)' : 'pas de rapport (code ' + x.status + ')') + ' · ' + Math.round((Date.now() - t0) / 1000) + ' s');
    if (!vu && r) console.log('      constats : ' + r.constats.map(c => c.gravite + ' « ' + c.titre + ' »').join(' | ').slice(0, 900));
  } finally { fs.rmSync(copie, { recursive: true, force: true }); }
}
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
