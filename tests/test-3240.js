/* test-3240 — LA COULEUR DES DOCUMENTS SURVIT À LA SYNCHRO (v788, 3 novembre 2026).
 *
 * Justin, sur la bêta : « j'ai essayé et ça marche pas au niveau des changements de couleur ». Mesuré dans la vraie page
 * (scratchpad/sonde-coul/s2.js) : la couleur choisie dans Paramètres arrivait bien dans le PDF, puis la copie d'un AUTRE appareil
 * de l'équipe (qui ne la connaît pas) l'effaçait — `fusionnerBases` prenait `db.entreprise` EN BLOC du côté distant.
 * Ce banc EXÉCUTE les vraies `entFusion` et `entPose`, puis vérifie que la fusion, la signature et les gestes passent par elles. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, a) => v(t, !!a, true);
const fn = (nom) => { const i = SRC.indexOf('function ' + nom + '('); if (i < 0) return ''; const j = SRC.indexOf('\nfunction ', i + 10); return SRC.slice(i, j); };

console.log('\n── 3240 · 1. la fusion de la fiche de l’entreprise, réglage par réglage ──');
const code = fn('entFusion') + '\n' + fn('entPose');
vrai('entFusion et entPose sont trouvées', code.length > 300);
const bac = { db: { entreprise: { nom: 'Toka Clim' } }, Date, Object };
vm.createContext(bac); vm.runInContext(code, bac);
bac.entPose('couleurDoc', '#8B1E3F');
const ici = JSON.parse(JSON.stringify(bac.db.entreprise));
vrai('entPose écrit la couleur ET sa date', ici.couleurDoc === '#8B1E3F' && ici._ms && ici._ms.couleurDoc > 0);
const autre = { nom: 'Toka Clim', tel: '0102030405' };   // l'autre appareil : ne connaît pas la couleur, a changé le téléphone
let f = bac.entFusion(autre, ici);                           // à la réception : le distant est prioritaire
v('⛔ la couleur choisie ici survit à la copie d’un autre appareil', f.couleurDoc, '#8B1E3F');
v('…et le téléphone changé là-bas aussi', f.tel, '0102030405');
f = bac.entFusion(ici, autre);
v('dans l’autre sens aussi (priorité locale)', [f.couleurDoc, f._ms.couleurDoc > 0], ['#8B1E3F', true]);
const vieux = { nom: 'Toka Clim', couleurDoc: '#2458C5', _ms: { couleurDoc: 1 } };
v('une couleur plus ANCIENNE d’en face ne revient pas', bac.entFusion(vieux, ici).couleurDoc, '#8B1E3F');
const neuf = { nom: 'Toka Clim', couleurDoc: '#0F6E6E', _ms: { couleurDoc: Date.now() + 60000 } };
v('une couleur plus RÉCENTE d’en face gagne', bac.entFusion(ici, neuf).couleurDoc, '#0F6E6E');
bac.db.entreprise = JSON.parse(JSON.stringify(ici)); bac.entPose('couleurDoc', null);
const retire = JSON.parse(JSON.stringify(bac.db.entreprise));
v('⛔ revenir au marine (retrait daté) n’est pas annulé par la copie d’avant', Object.prototype.hasOwnProperty.call(bac.entFusion(ici, retire), 'couleurDoc'), false);
v('deux fiches sans date : l’ancienne règle (le prioritaire gagne)', bac.entFusion({ nom: 'A' }, { nom: 'B' }).nom, 'A');

console.log('\n── 3240 · 2. la fusion, la signature et les gestes passent par là ──');
vrai('fusionnerBases fusionne l’entreprise par entFusion', /out\.entreprise=entFusion\(prio&&prio\.entreprise,autre&&autre\.entreprise\)/.test(fn('fusionnerBases')));
vrai('la signature voit les dates des réglages (une couleur reprise fait repartir la copie)', /'§E'\+JSON\.stringify\(\(d&&d\.entreprise&&d\.entreprise\._ms\)\|\|\{\}\)/.test(fn('baseSignature')));
vrai('« Couleur des documents » passe par entPose', /entPose\('couleurDoc'/.test(fn('docCouleurSet')));
vrai('le logo de l’entreprise aussi (ajout et retrait)', /entPose\('logo',cv\.toDataURL/.test(fn('entLogoPick')) && /entPose\('logo',null\)/.test(fn('entLogoDel')));
vrai('le PDF lit la couleur de l’entreprise (docEntete → docCouleurEnt)', /couleur: hex\(st\.couleur\)\|\|docCouleurEnt\(\)/.test(fn('docEntete')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
