/* ══ UN SEUL ACCUEIL LE MATIN (v730) ════════════════════════════════════════════════════════
   Justin, 23 septembre 2026 : « chaque matin pour tes techniciens, fais ce qui est le mieux ».

   Jusque-là un technicien qui avait des interventions recevait DEUX accueils à 200 ms d'écart :
   le panneau de Leia s'ouvrait sur « Petits rappels du jour » (« 3 intervention(s) prévue(s)
   aujourd'hui »…) ET le bandeau « Ta journée » montait en bas. La même nouvelle deux fois, dont
   une qui couvre l'écran. La sonde « Ma journée » devait elle-même fermer Leia pour pouvoir
   photographier le bandeau — c'est ce qui l'a trahi.

   La règle, une fois par jour et par personne (`accueilJournee`) :
   · un TECHNICIEN qui a des interventions aujourd'hui → « Ta journée », ses retards compris ;
   · tous les autres (un responsable : administrateur, DR, chef d'équipe ; un technicien sans
     intervention ce jour-là) → les rappels de Leia, comme avant ;
   · la toute première fois → la bienvenue, rien d'autre.
   Rien n'est perdu : « Rappels » reste dans la bulle 💬, à la demande.

   Ce banc EXÉCUTE la vraie `accueilJournee` extraite du fichier livré — une règle se mesure à ce
   qu'elle laisse passer, pas au texte qui la nomme. Le comportement de bout en bout (vrai
   `enterApp`, minuteries comprises, cinq matins) est dans `scratchpad/sonde-accueil.js`, qui
   voit les deux accueils sur la bêta d'avant (7 ✗) et un seul sur celle-ci (18 ✓).          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* Découpe par ACCOLADES appariées, à partir d'une ouverture donnée. */
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) {
    const c = SRC[k];
    if (c === '{') prof++;
    else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); }
  }
  return '';
}

console.log('\n── 778 · 1. la règle, extraite et JOUÉE ──');
const fAcc = bloc('function accueilJournee(){'), fTech = bloc('function intTechIds(i){'), fMy = bloc('function myTechId(){');
vrai('population : accueilJournee, intTechIds et myTechId sont trouvés', fAcc.length > 150 && fTech.length > 40 && fMy.length > 60,
  [fAcc.length, fTech.length, fMy.length]);
v1: {
  if (!fAcc) break v1;
  const AUJ = '2026-09-23';
  const jouer = (user, interventions) => {
    const bac = { currentUser: user, db: { interventions, techniciens: [] }, todayISO: () => AUJ,
                  fullName: u => ((u.prenom || '') + ' ' + (u.nom || '')).trim() };
    vm.createContext(bac);
    vm.runInContext(fTech + '\n' + fMy + '\n' + fAcc + '\nthis.r = accueilJournee();', bac);
    return bac.r;
  };
  const tech = { id: 'u1', role: 'technicien', techId: 't1' };
  const jour = [{ date: AUJ, techIds: ['t1'], statut: 'planifiee' }];
  vrai('⛔ un technicien qui a une intervention aujourd’hui → « Ta journée »', jouer(tech, jour) === true);
  vrai('… même quand elle ne porte que l’ancien champ `techId`', jouer(tech, [{ date: AUJ, techId: 't1', statut: 'encours' }]) === true);
  vrai('⛔ une intervention ANNULÉE ne fait pas une journée', jouer(tech, [{ date: AUJ, techIds: ['t1'], statut: 'annulee' }]) === false);
  vrai('⛔ rien aujourd’hui (seulement du retard) → Leia, pas le bandeau', jouer(tech, [{ date: '2026-09-22', techIds: ['t1'], statut: 'planifiee' }]) === false);
  vrai('⛔ la journée d’un AUTRE technicien ne compte pas', jouer(tech, [{ date: AUJ, techIds: ['t2'], statut: 'planifiee' }]) === false);
  for (const r of ['admin', 'dr', 'chefEquipe'])
    vrai(`⛔ un responsable (${r}), même technicien et occupé → Leia`, jouer({ id: 'u2', role: r, techId: 't1' }, jour) === false);
  vrai('un compte sans technicien lié → Leia', jouer({ id: 'u3', role: 'technicien' }, jour) === false);
  vrai('personne de connecté → rien', jouer(null, jour) === false);
}

console.log('\n── 778 · 2. le câblage : jamais les deux ──');
const fEnter = bloc('function enterApp(u){');
vrai('population : enterApp est trouvé', fEnter.length > 2000, fEnter.length);
const plat = fEnter.replace(/\s*\n\s*/g, ' ');
vrai('⛔⛔ Leia ne s’ouvre QUE quand « Ta journée » n’est pas l’accueil du jour',
  /if\(!maybeWelcome\(\)\)\{ if\(accueilJournee\(\)\) setTimeout\(\(\)=>\{ try\{ planFdrCheck\(\); \}catch\(e\)\{\} \},\d+\);[^{}]{0,120}? else maybeRappels\(\); \}/.test(plat));
vrai('⛔ … et le bandeau n’est plus programmé HORS de ce choix (sinon il revient à côté de Leia)',
  (plat.match(/planFdrCheck\(\)/g) || []).length === 1);
vrai('⛔ … ni maybeRappels appelé ailleurs dans enterApp', (plat.match(/maybeRappels\(\)/g) || []).length === 1);
const fFdr = bloc('function planFdrCheck(){');
vrai('population : planFdrCheck est trouvé', fFdr.length > 400, fFdr.length);
vrai('⛔ planFdrCheck porte la même règle (un autre appelant ne la contourne pas)', /if\(!accueilJournee\(\)\) return;/.test(fFdr));
vrai('⛔ le bandeau dit les retards DU technicien (pas ceux de l’entreprise)',
  /const retard=\(db\.interventions\|\|\[\]\)\.filter\(i=>i\.date<todayISO\(\)&&intTechIds\(i\)\.includes\(tid\)/.test(fFdr) && /en retard/.test(fFdr));
vrai('les rappels restent accessibles à la demande dans la bulle', /if\(c==='Rappels'\)\{ asstRappels\(\); return; \}/.test(SRC));
v('une seule définition de accueilJournee', (SRC.match(/function accueilJournee\(/g) || []).length, 1);
function v(t, a, b) { vrai(t, JSON.stringify(a) === JSON.stringify(b), a); }

console.log('\n── 778 · 3. la mesure de bout en bout existe ──');
const P = path.join(__dirname, '..', 'scratchpad', 'sonde-accueil.js');
const SONDE = fs.existsSync(P) ? fs.readFileSync(P, 'utf8') : '';
vrai('scratchpad/sonde-accueil.js existe', !!SONDE);
vrai('… elle passe par le VRAI enterApp', /enterApp\(u\)/.test(SONDE));
vrai('… elle COMPTE les accueils affichés (bandeau + Leia)', /accueils\(/.test(SONDE));
vrai('… elle joue le responsable ET le premier lancement', /ADMINISTRATEUR/.test(SONDE) && /PREMIER LANCEMENT/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-778 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
