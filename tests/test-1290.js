/* ══ g18 · ÉQUIPE : POINTAGE (NUIT, CORRECTION, CLÔTURE), VÉHICULES, CONDUCTEURS ═══════════════════
   Sept défauts remontés par les testeurs du navigateur (16 octobre 2026), rejoués ici sur les VRAIES
   fonctions d'app.html, horloge en main (aucun navigateur) :

     equipe#0  « Ma journée » à 00:00:00 et sans ligne pour un pointage commencé la veille et encore ouvert
               (équipe de nuit) — `date` est le jour d'EMBAUCHE, pas « aujourd'hui »
     equipe#1  corriger le début d'un pointage EN COURS le clôturait à 17:00 (dans le futur)
     equipe#9  clôturer un oubli à une heure antérieure au début : 0h00 enregistré, sans un mot
     equipe#8  validations : pause > durée, date vidée ; plaque vide / en double, km négatif ; conducteur sans nom
     equipe#3  vehName ne lisait pas `plaque` : le véhicule s'appelait « Véhicule » dans les dons et le bon de remise
     equipe#5  un technicien qui crée un véhicule ne le voit plus
     equipe#6  l'interrupteur « Actif » du conducteur est invisible (appearance:none sans habillage)

   Le rendu au pixel de l'interrupteur (#6) est mesuré par la sonde du scratchpad
   (gestion/correctifs/g18/sonde-actif.js) ; ici on garde la règle : la fiche utilise l'interrupteur de
   l'application (.switch + piste + curseur), jamais une case nue dans une rangée.                         */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ nettoyage SÛR : seuls les blocs qui COMMENCENT une ligne (CLAUDE.md) — un motif vise du code. */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const fn = nom => bloc('function ' + nom + '(');

console.log('\n── 1290 · 0. la population ──');
const PT = ['minutes', 'pt2', 'ptHM', 'ptHMS', 'ptJourDe', 'ptJour', 'ptOuvert', 'ptOubli', 'ptSecs', 'ptDuree', 'ptChrono', 'ptHoraires',
  'ptEstAMoi', 'ptMesPointages', 'ptOuverteMoi', 'ptNom', 'ptCle', 'ptDit', 'ptPauseEntre', 'ptTotal', 'ptBoutonJour', 'pointerDebut', 'pointerFin',
  'ptFermer', 'ptMaJournee', 'ptTickStart', 'ptTickStop', 'formPointage', 'savePointage', 'ptCloreOubliOk'];
const manquent = PT.filter(n => !fn(n));
v('les ' + PT.length + ' fonctions du pointage sont trouvées', manquent, []);
const MAXH = (SRC.match(/const PT_MAX_H = (\d+);/) || [])[1];
vrai('… et le plafond PT_MAX_H', !!MAXH, MAXH);
/* Les ajouts de ce lot : s'ils existent, le bac à sable les reçoit (le banc doit aussi tourner sur l'AVANT). */
const PT_NEUFS = ['ptDuJour', 'ptFinRefus'].filter(n => !!fn(n));
const CODE_PT = PT.concat(PT_NEUFS).map(fn).join('\n');

function monde({ tid = null, moi = 'uA', users = [{ id: 'uA', prenom: 'Justin', nom: 'Biret' }], droit = true } = {}) {
  const ctx = { db: { pointages: [], users, techniciens: [{ id: 't1', nom: 'Marc' }] }, currentUser: moi ? { id: moi } : null,
    toasts: [], saves: 0, rendus: 0, clore: [], fermes: 0, modales: [], current: 'pointage', navigator: {}, ticks: [], els: {} };
  vm.createContext(ctx);
  vm.runInContext(`
    let __t = 0; Date.now = () => __t; var setT = t => { __t = t; };
    var myTechId = () => __tid; var __tid = null;
    var techName = id => 'Fiche ' + id;
    var fullName = u => ((u.prenom||'') + ' ' + (u.nom||'')).trim();
    var __n = 0; var uid = () => 'p' + (++__n);
    var save = () => { saves++; }; var toast = m => { toasts.push(m); }; var logEvent = () => {};
    var views = { pointage: () => { rendus++; } };
    var ptCloreOubli = id => { clore.push(id); };
    var closeModal = () => { fermes++; }; var openModal = h => { modales.push(h); };
    var esc = x => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    var fmtShort = iso => iso;
    var ptPeutCorriger = () => ${droit}; var can = () => ${droit}; var ptTechsVisibles = () => db.techniciens;
    var setInterval = f => { ticks.push(f); return ticks.length; }; var clearInterval = () => {};
    var $ = id => els[id] || null; var document = { querySelectorAll: () => [] };
    var _ptTick = null;
    function FormData(t) { return Object.entries(t); }
    const PT_MAX_H = ${MAXH};
    ${CODE_PT}
    var todayISO = () => ptJour(Date.now());
  `, ctx);
  ctx.__tid = tid; vm.runInContext('__tid = ' + JSON.stringify(tid), ctx);
  ctx.a = (jour, h, m = 0) => { const d = new Date(jour + 'T00:00:00'); d.setHours(h, m, 0, 0); vm.runInContext('setT(' + d.getTime() + ')', ctx); return d.getTime(); };
  ctx.run = js => vm.runInContext(js, ctx);
  return ctx;
}
const chrono = h => (String(h).match(/id="pt-jour-sec"[^>]*>([^<]*)</) || [])[1];
const nbSeg = h => (String(h).match(/class="pt-seg"/g) || []).length;
const J1 = '2026-10-15', J2 = '2026-10-16';

console.log('\n── 1290 · 1. ⛔⛔ equipe#0 · l\'équipe de nuit : « Ma journée » compte le pointage commencé HIER ──');
{ const W = monde();
  W.a(J1, 22, 0); W.run('pointerDebut()');
  vrai('population : un pointage ouvert, daté d\'hier au passage de minuit', W.db.pointages.length === 1 && !W.db.pointages[0].finTs && W.db.pointages[0].date === J1, W.db.pointages[0]);
  W.a(J2, 1, 0);
  vrai('population : on est bien le lendemain de sa date', W.run('todayISO()') === J2 && W.db.pointages[0].date === J1);
  const h = W.run('ptMaJournee(Date.now())');
  v('⛔ le compteur dit 03:00:00 (pas 00:00:00)', chrono(h), '03:00:00');
  v('⛔ … et la période 1 est listée, en cours', [nbSeg(h), /en cours — depuis 22:00:00/.test(h), /Période 1, depuis 22:00:00, en cours/.test(h)], [1, true, true]);
  vrai('… la carte ne dit pas « pas encore commencée »', !/pas encore commencée/.test(h));
  // le chrono qui tourne : ptTickStart écrit dans #pt-jour-sec
  W.els['pt-jour-sec'] = { textContent: '' };
  W.run('ptTickStart()'); W.ticks.at(-1)();
  v('⛔ la minuterie ptTickStart écrit 03:00:00 aussi (pas 00:00:00)', W.els['pt-jour-sec'].textContent, '03:00:00');
  W.a(J2, 6, 0); W.run('pointerFin()');
  const h2 = W.run('ptMaJournee(Date.now())');
  v('⛔ après la fin (06:00) : 08:00:00 travaillées, la période est listée — pas « pas encore commencée »', [chrono(h2), nbSeg(h2), /pas encore commencée/.test(h2)], ['08:00:00', 1, false]);
  W.a(J2, 8, 0);
  const h3 = W.run('ptMaJournee(Date.now())');
  v('… et la nuit terminée à 06:00 figure encore dans la carte de 08:00 (elle chevauche aujourd\'hui)', [nbSeg(h3), chrono(h3)], [1, '08:00:00']);
}
{ const W = monde();   // contre-épreuve : ce qui NE doit PAS compter aujourd'hui
  W.db.pointages.push({ id: 'h1', userId: 'uA', techId: '', date: J1, debut: '08:00', fin: '17:00', debutTs: new Date(J1 + 'T08:00:00').getTime(), finTs: new Date(J1 + 'T17:00:00').getTime() });
  W.db.pointages.push({ id: 'h2', userId: 'uA', techId: '', date: J1, debut: '22:00', fin: '23:59', debutTs: new Date(J1 + 'T22:00:00').getTime(), finTs: new Date(J1 + 'T23:59:00').getTime() });
  W.db.pointages.push({ id: 'h3', userId: 'uA', techId: '', date: J1, debut: '20:00', fin: '00:00', debutTs: new Date(J1 + 'T20:00:00').getTime(), finTs: new Date(J2 + 'T00:00:00').getTime() });
  W.a(J2, 9, 0);
  const h = W.run('ptMaJournee(Date.now())');
  vrai('population : trois journées d\'hier, closes, dont une qui finit pile à minuit', W.db.pointages.length === 3);
  v('⛔ une journée d\'HIER close (même celle qui finit pile à minuit) n\'est pas dans celle d\'aujourd\'hui', [nbSeg(h), chrono(h), /pas encore commencée/.test(h)], [0, '00:00:00', true]);
  W.db.pointages.push({ id: 'a1', userId: 'uA', techId: '', date: J2, debut: '08:00', fin: '09:00', debutTs: new Date(J2 + 'T08:00:00').getTime(), finTs: new Date(J2 + 'T09:00:00').getTime() });
  const h2 = W.run('ptMaJournee(Date.now())');
  v('… un pointage d\'aujourd\'hui, lui, est compté seul', [nbSeg(h2), chrono(h2)], [1, '01:00:00']);
}
{ const W = monde();   // un oubli de 26 h : ouvert, donc listé (plafonné et signalé par ailleurs)
  W.a(J1, 8, 0); W.run('pointerDebut()'); W.a(J2, 10, 0);
  const h = W.run('ptMaJournee(Date.now())');
  v('⛔ un pointage resté ouvert depuis 26 h est listé, plafonné à PT_MAX_H (16 h)', [nbSeg(h), chrono(h)], [1, '16:00:00']);
}

console.log('\n── 1290 · 2. ⛔ equipe#1 · corriger un pointage EN COURS ne le clôture pas ──');
{ const W = monde();
  W.a(J2, 8, 0); W.run('pointerDebut()'); W.a(J2, 10, 0);
  const id = W.db.pointages[0].id;
  W.run('formPointage("' + id + '")');
  const f = W.modales.at(-1) || '';
  const champFin = (f.match(/<input type="time" name="fin"[^>]*>/) || [''])[0];
  vrai('population : la fenêtre de correction est ouverte', /name="fin"/.test(f), f.length);
  v('⛔ « Fin » est VIDE pour un pointage en cours (pas 17:00)', (champFin.match(/value="([^"]*)"/) || [])[1], '');
  vrai('⛔ … et facultatif (pas required) : vide = reste en cours', !/required/.test(champFin) && /vide = en cours/.test(f), champFin);
  W.run('savePointage({preventDefault(){},target:{techId:"",date:"' + J2 + '",debut:"08:30",fin:"",pause:"0",note:""}},"' + id + '")');
  const p = W.db.pointages[0];
  v('⛔ le début passe à 08:30 et le pointage reste OUVERT (ni fin, ni finTs)', [p.debut, ptHMdeTs(p.debutTs), p.fin || '', p.finTs || null, W.run('ptOuvert(db.pointages[0])')], ['08:30', '08:30', '', null, true]);
  vrai('… « Fin de journée » est toujours proposé', /pointerFin\(\)/.test(W.run('ptBoutonJour()')));
  v('… 1h30 comptées à 10:00, pas 8h30', W.run('ptDuree(ptSecs(db.pointages[0], Date.now()))'), '1h30');
  vrai('… et la correction est dite', /mis à jour/.test(W.toasts.at(-1)), W.toasts.at(-1));
}
{ const W = monde();   // les contre-épreuves : un pointage CLOS garde sa fin obligatoire et préremplie
  W.a(J2, 18, 0);
  W.db.pointages.push({ id: 'c1', userId: 'uA', techId: '', date: J2, debut: '08:00', fin: '12:00', debutTs: new Date(J2 + 'T08:00:00').getTime(), finTs: new Date(J2 + 'T12:00:00').getTime() });
  W.run('formPointage("c1")');
  const champ = (W.modales.at(-1).match(/<input type="time" name="fin"[^>]*>/) || [''])[0];
  vrai('un pointage clos : « Fin » vaut 12:00 et reste obligatoire', /value="12:00"/.test(champ) && /required/.test(champ), champ);
  W.run('formPointage("")');
  const champN = (W.modales.at(-1).match(/<input type="time" name="fin"[^>]*>/) || [''])[0];
  vrai('un pointage NEUF (saisie à la main) : fin obligatoire, préremplie à 17:00', /value="17:00"/.test(champN) && /required/.test(champN), champN);
  const n0 = W.db.pointages.length;
  W.run('savePointage({preventDefault(){},target:{techId:"t1",date:"' + J2 + '",debut:"08:00",fin:"",pause:"0",note:""}},"")');
  v('⛔ un pointage NEUF sans fin est refusé (il ne naît pas ouvert par la saisie)', [W.db.pointages.length, /heure de fin/.test(W.toasts.at(-1))], [n0, true]);
  W.a(J2, 10, 0);
  W.run('savePointage({preventDefault(){},target:{techId:"",date:"' + J2 + '",debut:"08:00",fin:"17:00",pause:"0",note:""}},"c1")');
  v('⛔ une fin dans le FUTUR (17:00 à 10:00) est refusée, le pointage garde sa fin d\'avant', [/futur/.test(W.toasts.at(-1)), W.db.pointages.find(x => x.id === 'c1').fin], [true, '12:00']);
  W.run('savePointage({preventDefault(){},target:{techId:"",date:"' + J2 + '",debut:"08:00",fin:"09:30",pause:"15",note:""}},"c1")');
  const c1 = W.db.pointages.find(x => x.id === 'c1');
  v('une fin passée est acceptée : DEUX horodatages réécrits ensemble (fin ET finTs)', [c1.fin, ptHMdeTs(c1.finTs), c1.pause], ['09:30', '09:30', 15]);
  W.a(J2, 1, 0);
  W.run('savePointage({preventDefault(){},target:{techId:"t1",date:"' + J1 + '",debut:"22:00",fin:"06:00",pause:"0",note:""}},"")');
  vrai('la nuit saisie à la main (22:00 → 06:00) bascule toujours au lendemain… sauf qu\'à 01:00 elle est dans le futur et est refusée', W.db.pointages.length === 1 && /futur/.test(W.toasts.at(-1)), [W.db.pointages.length, W.toasts.at(-1)]);
  W.a(J2, 7, 0);
  W.run('savePointage({preventDefault(){},target:{techId:"t1",date:"' + J1 + '",debut:"22:00",fin:"06:00",pause:"0",note:""}},"")');
  const nuit2 = W.db.pointages.at(-1);
  vrai('… à 07:00 elle passe : 8h00 comptées', W.db.pointages.length === 2 && W.run('ptDuree(ptSecs(db.pointages[1]))') === '8h00', nuit2);
}
function ptHMdeTs(ts) { const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

console.log('\n── 1290 · 3. ⛔ equipe#9 · clôturer un oubli AVANT son début est refusé, pas effacé ──');
{ const W = monde();
  W.a(J1, 8, 0); W.run('pointerDebut()'); W.a(J2, 10, 0);   // 26 h d'ouverture
  const id = W.db.pointages[0].id;
  const clore = (jour, heure) => W.run('ptCloreOubliOk({preventDefault(){},target:{jour:"' + jour + '",heure:"' + heure + '"}},"' + id + '")');
  const fermes0 = W.fermes;
  clore(J1, '07:00');
  const p = W.db.pointages[0];
  v('⛔ 07:00 pour un début à 08:00 : le pointage reste OUVERT (pas de journée de 0h00)', [!!p.finTs, !!p.fin, W.run('ptOuvert(db.pointages[0])')], [false, false, true]);
  vrai('⛔ … et le refus est DIT (la fin est avant le début)', /avant le début/.test(W.toasts.at(-1)) && /07:00/.test(W.toasts.at(-1)) && /08:00/.test(W.toasts.at(-1)), W.toasts.at(-1));
  v('… la fenêtre n\'est pas fermée (on corrige sans tout retaper)', W.fermes, fermes0);
  clore(J2, '23:00');
  vrai('⛔ une fin dans le futur est refusée aussi', W.run('ptOuvert(db.pointages[0])') && /futur/.test(W.toasts.at(-1)), W.toasts.at(-1));
  clore(J1, '17:00');
  const q = W.db.pointages[0];
  v('contre-épreuve : 17:00 le jour du début clôture à 17:00 — 9h00 (l\'oubli se clôture à l\'heure qu\'on dit)', [q.fin, ptHMdeTs(q.finTs), W.run('ptDuree(ptSecs(db.pointages[0]))')], ['17:00', '17:00', '9h00']);
  vrai('… et la fenêtre se ferme alors', W.fermes === fermes0 + 1, W.fermes);
}
{ const W = monde();   // le chemin direct de ptFermer(id, ts) refuse aussi
  W.a(J2, 8, 0); W.run('pointerDebut()'); W.a(J2, 12, 0);
  const id = W.db.pointages[0].id;
  W.run('ptFermer("' + id + '", ' + new Date(J2 + 'T07:00:00').getTime() + ')');
  vrai('ptFermer(id, ts) avec une fin avant le début ne ferme rien', W.run('ptOuvert(db.pointages[0])') && /avant le début/.test(W.toasts.at(-1)), W.toasts.at(-1));
  W.run('pointerFin()');
  vrai('contre-épreuve : « Fin de journée » (maintenant) ferme normalement à 12:00', W.db.pointages[0].fin === '12:00' && !W.run('ptOuvert(db.pointages[0])'));
}

console.log('\n── 1290 · 4. ⛔ equipe#8 · pointage : pause plus longue que la durée, date vidée ──');
{ const W = monde();
  W.a(J2, 18, 0);
  W.db.pointages.push({ id: 'c1', userId: 'uA', techId: '', date: J1, debut: '09:00', fin: '09:30', pause: 0, debutTs: new Date(J1 + 'T09:00:00').getTime(), finTs: new Date(J1 + 'T09:30:00').getTime() });
  const avant = JSON.stringify(W.db.pointages);
  const sauve = (champs) => W.run('savePointage({preventDefault(){},target:' + JSON.stringify(Object.assign({ techId: '', date: J1, debut: '09:00', fin: '09:30', pause: '0', note: '' }, champs)) + '},"c1")');
  sauve({ pause: '120' });
  v('⛔ une pause de 120 min sur un pointage de 30 min est refusée, rien n\'est écrit', [JSON.stringify(W.db.pointages) === avant, /pause/i.test(W.toasts.at(-1)), /dépasse/.test(W.toasts.at(-1))], [true, true, true]);
  sauve({ date: '' });
  v('⛔ une date vidée est refusée (le pointage du 15 ne devient pas celui d\'aujourd\'hui), rien n\'est écrit', [JSON.stringify(W.db.pointages) === avant, /date/i.test(W.toasts.at(-1))], [true, true]);
  sauve({ pause: '-5' });
  vrai('une pause négative est refusée', JSON.stringify(W.db.pointages) === avant && /négative/.test(W.toasts.at(-1)), W.toasts.at(-1));
  sauve({ pause: '30' });
  vrai('contre-épreuve : une pause égale à la durée (30 min sur 30) passe — c\'est le seuil exact', W.db.pointages[0].pause === 30 && /mis à jour/.test(W.toasts.at(-1)), W.toasts.at(-1));
  sauve({ pause: '10', debut: '09:00', fin: '09:30' });
  vrai('contre-épreuve : une pause normale passe', W.db.pointages[0].pause === 10 && W.db.pointages[0].date === J1);
  vrai('le formulaire marque la date obligatoire (required)', /<input type="date" name="date" required/.test(bloc('function formPointage(')));
}

console.log('\n── 1290 · 5. ⛔ equipe#3 · vehName lit la plaque ──');
{ const ctx = { db: { vehicules: [{ id: 'v1', plaque: 'AB-123-CD' }, { id: 'v2', immat: 'ZZ-999-ZZ' }, { id: 'v3', nom: 'Camionnette' }, { id: 'v4' }, { id: 'v5', plaque: 'NEW-1', immat: 'OLD-1' }] } };
  vm.createContext(ctx);
  vm.runInContext(ligne('const vehName =').replace('const ', 'var '), ctx);
  const nom = id => vm.runInContext('vehName(' + JSON.stringify(id) + ')', ctx);
  v('⛔ un véhicule créé par le formulaire (plaque) porte sa plaque', nom('v1'), 'AB-123-CD');
  v('l\'ancien champ immat reste lu', nom('v2'), 'ZZ-999-ZZ');
  v('… puis le nom, puis « Véhicule »', [nom('v3'), nom('v4')], ['Camionnette', 'Véhicule']);
  v('un véhicule supprimé se dit « — »', nom('vX'), '—');
  v('la plaque passe avant l\'ancien immat (même ordre que vPlaque)', nom('v5'), 'NEW-1');
  v('une seule définition de vehName (une seconde gagnerait partout, en silence)', SRC.split('const vehName =').length - 1, 1);
}

console.log('\n── 1290 · 6. ⛔ equipe#8 / equipe#5 · véhicules ──');
const CODE_VEH = [ligne('const vPlaque='), ligne('const vKm='), ligne('const vehExclu='), fn('vehiculeAuto'), fn('userVehiculeVoitIl'), fn('visibleVehicules'), fn('saveVehicule')];
vrai('population : les fonctions véhicule sont trouvées', CODE_VEH.every(x => x.length > 20), CODE_VEH.map(x => x.length));
function monde2({ moi, voirTout = false, vehicules = [], peutAjouter = true }) {
  const ctx = { db: { vehicules, techniciens: [] }, currentUser: moi, toasts: [], saves: 0, rendus: 0, voirTout, peutAjouter };
  vm.createContext(ctx);
  vm.runInContext(`
    function FormData(t) { return Object.entries(t); }
    var vehPhotos = {}; var __n = 0; var uid = () => 'n' + (++__n);
    var toast = m => { toasts.push(m); }; var save = () => { saves++; }; var closeModal = () => {}; var logEvent = () => {};
    var views = { vehicules: () => { rendus++; } };
    var permGarde = () => peutAjouter;
    var can = c => c === 'voirTout' ? voirTout : false; var perimetreTechIds = () => null;
    ${CODE_VEH.map(x => x.replace(/^const /, 'var ')).join('\n')}
  `, ctx);
  ctx.creer = champs => vm.runInContext('saveVehicule({preventDefault(){},target:' + JSON.stringify(Object.assign({ plaque: 'AB-123-CD', marque: '', modele: '', annee: '2020', kilometrage: '1000', statut: 'service' }, champs)) + '},"")', ctx);
  ctx.modif = (id, champs) => vm.runInContext('saveVehicule({preventDefault(){},target:' + JSON.stringify(Object.assign({ plaque: 'AB-123-CD', marque: '', modele: '', annee: '2020', kilometrage: '1000', statut: 'service' }, champs)) + '},' + JSON.stringify(id) + ')', ctx);
  ctx.visibles = () => vm.runInContext('visibleVehicules(db.vehicules).map(v => v.id)', ctx);
  return ctx;
}
{ const W = monde2({ moi: { id: 'uAdm' }, voirTout: true });
  W.creer({ plaque: 'AB-123-CD' });
  v('population : un premier véhicule valide est créé (plaque rangée tel quel)', W.db.vehicules.map(x => x.plaque), ['AB-123-CD']);
  const n = () => W.db.vehicules.length;
  W.creer({ plaque: 'ab-123-cd' });
  v('⛔ la même plaque en minuscules est refusée (doublon)', [n(), /existe déjà/.test(W.toasts.at(-1))], [1, true]);
  W.creer({ plaque: ' AB 123 CD ' });
  v('⛔ … avec des espaces au lieu de tirets, aussi', n(), 1);
  W.creer({ plaque: 'ab123cd' });
  v('⛔ … sans séparateur, aussi (comparaison normalisée casse / tirets / espaces)', n(), 1);
  W.creer({ plaque: '   ' });
  v('⛔ une plaque d\'espaces est refusée, sans fiche', [n(), /plaque.*obligatoire/.test(W.toasts.at(-1))], [1, true]);
  W.creer({ plaque: 'KM-1', kilometrage: '-500' });
  v('⛔ un kilométrage négatif est refusé', [n(), /négatif/.test(W.toasts.at(-1))], [1, true]);
  W.creer({ plaque: '  XY-456-ZT  ', kilometrage: '0' });
  v('contre-épreuve : une autre plaque, km 0, passe — et se range SANS ses espaces de bord', [n(), W.db.vehicules.at(-1).plaque, W.db.vehicules.at(-1).kilometrage], [2, 'XY-456-ZT', 0]);
  const id1 = W.db.vehicules[0].id, id2 = W.db.vehicules[1].id;
  W.modif(id1, { plaque: 'AB-123-CD', marque: 'Citroën' });
  v('contre-épreuve : modifier une fiche SANS changer sa plaque ne se compare pas à elle-même', [W.db.vehicules[0].marque, /mis à jour/.test(W.toasts.at(-1))], ['Citroën', true]);
  W.modif(id2, { plaque: 'ab 123 cd' });
  v('⛔ renommer une fiche vers la plaque d\'une autre est refusé', [W.db.vehicules[1].plaque, /existe déjà/.test(W.toasts.at(-1))], ['XY-456-ZT', true]);
  W.modif(id2, { plaque: 'XY-456-ZT', kilometrage: '-1' });
  v('⛔ … et un kilométrage négatif aussi à la modification', [W.db.vehicules[1].kilometrage, /négatif/.test(W.toasts.at(-1))], [0, true]);
}
{ // un doublon d'AVANT la règle : on peut encore corriger une autre donnée
  const W = monde2({ moi: { id: 'uAdm' }, voirTout: true, vehicules: [{ id: 'a', plaque: 'DD-111-DD' }, { id: 'b', plaque: 'dd-111-dd' }] });
  W.modif('b', { plaque: 'dd-111-dd', marque: 'Renault' });
  v('un doublon d\'avant la règle reste modifiable (la plaque ne change pas)', W.db.vehicules[1].marque, 'Renault');
}
{ // equipe#5 : le créateur garde son véhicule
  const tech = { id: 'uT', techId: 't1' };
  const W = monde2({ moi: tech, voirTout: false, vehicules: [{ id: 'autre', plaque: 'ZZ-000-ZZ', techId: 't9' }] });
  v('population : avant la création, le technicien ne voit rien (rien ne lui est attribué)', W.visibles(), []);
  W.creer({ plaque: 'TE-001-CH', marque: 'Citroën' });
  const cree = W.db.vehicules.at(-1);
  v('⛔ le véhicule porte son créateur', cree.creePar, 'uT');
  v('⛔ le technicien qui vient de créer son véhicule le VOIT', W.visibles(), [cree.id]);
  v('… sans voir celui d\'un autre', W.visibles().includes('autre'), false);
  const W2 = monde2({ moi: { id: 'uT2', techId: 't2' }, voirTout: false, vehicules: W.db.vehicules });
  v('un AUTRE technicien ne voit pas le véhicule créé par le premier', W2.visibles(), []);
  W.db.vehicules.at(-1).userIdsExclus = ['uT'];
  v('une exclusion posée par l\'administrateur s\'applique aussi au créateur (c\'est une règle, pas un passe-droit)', W.visibles(), []);
  const W3 = monde2({ moi: { id: 'uAdm' }, voirTout: true });
  W3.creer({ plaque: 'AD-111-MN' });
  v('l\'administrateur voit tout (rien ne change pour lui)', [W3.visibles().length, W3.db.vehicules[0].creePar], [1, 'uAdm']);
}
{ // L'état vide de la vue : « Ajouter » offert à qui a le bouton ＋
  const vue = bloc('views.vehicules=function(){');
  vrai('population : la vue Véhicules est trouvée', vue.length > 500, vue.length);
  const rendre = ({ toutVoir, ajouter }) => {
    const ctx = { out: '', actions: null, db: { vehicules: [] } };
    vm.createContext(ctx);
    vm.runInContext(`
      var views = {}; var can = c => c === 'voirTout' ? ${toutVoir} : false; var canCat = () => ${ajouter};
      var perimetreTechIds = () => null; var visibleVehicules = l => l;
      var setHeader = (a, b, act) => { actions = act; };
      var $ = () => ({ set innerHTML(x) { out = x; } });
      var emptyState = (ico, txt, btn, fn) => '[' + txt + '|' + (btn || '') + '|' + (fn || '') + ']';
      var esc = x => x; var badge = () => ''; var assurEtat = () => ''; var vPlaque = () => ''; var vKm = () => 0; var vConducteur = () => ''; var VEH = {};
      ${vue}
      views.vehicules();`, ctx);
    return ctx;
  };
  const t1 = rendre({ toutVoir: false, ajouter: true });
  vrai('⛔ un technicien qui PEUT ajouter : bouton ＋ en tête ET « Ajouter » dans l\'état vide', /＋ Véhicule/.test(t1.actions) && /\|Ajouter\|formVehicule\(\)\]/.test(t1.out), [t1.actions, t1.out]);
  vrai('… son état vide garde le texte « ne t\'est attribué »', /ne t'est attribué/.test(t1.out), t1.out);
  const t2 = rendre({ toutVoir: false, ajouter: false });
  vrai('⛔ sans le droit : ni bouton ＋, ni « Ajouter » (les deux disent la même chose)', t2.actions === '' && !/Ajouter/.test(t2.out), [t2.actions, t2.out]);
  const t3 = rendre({ toutVoir: true, ajouter: false });
  vrai('l\'administrateur voit « Aucun véhicule. » avec « Ajouter »', /Aucun véhicule\.\|Ajouter\|formVehicule\(\)/.test(t3.out) && /＋ Véhicule/.test(t3.actions), [t3.actions, t3.out]);
}

console.log('\n── 1290 · 7. ⛔ equipe#8 / equipe#6 · conducteurs ──');
const CODE_COND = [fn('formConducteur'), fn('saveConducteur')];
vrai('population : formConducteur et saveConducteur sont trouvées', CODE_COND.every(x => x.length > 100), CODE_COND.map(x => x.length));
function monde3(conducteurs = []) {
  const ctx = { db: { conducteurs }, toasts: [], saves: 0, modales: [] };
  vm.createContext(ctx);
  vm.runInContext(`
    function FormData(t) { return Object.entries(t); }
    var __n = 0; var uid = () => 'c' + (++__n); var toast = m => { toasts.push(m); }; var save = () => { saves++; }; var closeModal = () => {};
    var logEvent = () => {}; var views = { conducteurs: () => {} }; var permGarde = () => true; var todayISO = () => '2026-10-16';
    var openModal = h => { modales.push(h); }; var esc = x => String(x == null ? '' : x);
    ${CODE_COND.join('\n')}`, ctx);
  ctx.creer = (prenom, nom) => vm.runInContext('saveConducteur({preventDefault(){},target:{prenom:' + JSON.stringify(prenom) + ',nom:' + JSON.stringify(nom) + ',telephone:"",actif:{checked:true}}},"")', ctx);
  return ctx;
}
{ const W = monde3();
  W.creer(' ', '   ');
  v('⛔ un conducteur dont le prénom ET le nom sont des espaces est refusé', [W.db.conducteurs.length, /obligatoires/.test(W.toasts.at(-1))], [0, true]);
  W.creer('Paul', ' ');
  v('⛔ … un nom d\'espaces aussi', W.db.conducteurs.length, 0);
  W.creer('', 'Durand');
  v('⛔ … un prénom vide aussi', W.db.conducteurs.length, 0);
  W.creer('  Paul ', ' Durand  ');
  v('contre-épreuve : un vrai nom passe, rangé SANS ses espaces de bord', W.db.conducteurs.map(c => [c.prenom, c.nom]), [['Paul', 'Durand']]);
}
{ const W = monde3([{ id: 'k1', prenom: 'Paul', nom: 'Durand', actif: true }]);
  W.run = js => vm.runInContext(js, W);
  W.run('formConducteur("k1")');
  const h = W.modales.at(-1);
  const ligneActif = (h.match(/<label class="frow"[^>]*>\s*<span class="frow-lbl">Actif<\/span>[\s\S]*?<\/label>/) || [''])[0];
  vrai('population : la rangée « Actif » est dans la fiche d\'un conducteur existant', ligneActif.length > 50, h.length);
  vrai('⛔ « Actif » est un INTERRUPTEUR de l\'application : piste + curseur, la case reste dans le formulaire',
    /class="switch"/.test(ligneActif) && /<span class="track"><\/span><span class="knob"><\/span>/.test(ligneActif) && /<input type="checkbox" name="actif" checked/.test(ligneActif), ligneActif);
  vrai('⛔ … plus de case nue de 38×24 dans une rangée (appearance:none la rendait invisible)', !/name="actif"[^>]*style="width:38px/.test(h), h);
  vrai('… la rangée entière est cliquable (label) et la case a un nom pour le lecteur d\'écran', /^<label class="frow"/.test(ligneActif) && /aria-label="Conducteur actif"/.test(ligneActif), ligneActif);
  const W2 = monde3([{ id: 'k2', prenom: 'Léa', nom: 'Roux', actif: false }]);
  vm.runInContext('formConducteur("k2")', W2);
  vrai('un conducteur INACTIF s\'ouvre décoché', !/name="actif" checked/.test(W2.modales.at(-1)) && /name="actif"/.test(W2.modales.at(-1)));
  vrai('un conducteur NEUF n\'a pas de ligne « Actif » (il naît actif)', !/name="actif"/.test((() => { const W3 = monde3(); vm.runInContext('formConducteur("")', W3); return W3.modales.at(-1); })()));
}
{ // la feuille : l'interrupteur dessine bien deux états différents (piste qui change de teinte, curseur qui se décale)
  vrai('la feuille de style dessine la piste ET le curseur de .switch, coché / décoché',
    /\.switch input\{display:none;\}/.test(SRC.replace(/\s+/g, ' ').replace(/\{ /g, '{').replace(/ \}/g, '}')) || /\.switch input\{display:none/.test(SRC),
    'règle .switch input');
  vrai('… .switch input:checked + .track change la teinte et :checked + .track + .knob décale le curseur',
    /\.switch input:checked \+ \.track\{background:var\(--acc\)/.test(SRC) && /\.switch input:checked \+ \.track \+ \.knob\{transform:translateX\(20px\)/.test(SRC));
}

console.log('\n── 1290 · 8. ⛔ equipe#3 (relecture) · les AUTRES lecteurs de la plaque ──');
{ /* vehName n'était pas seul : la recherche du journal et la fiche technicien ne lisaient que `immat`. */
  const lecteurs = SRC.split('\n').filter(l => /\.immat\b/.test(l) && !/^const vPlaque=/.test(l) && !/^const vehName =/.test(l));
  v('⛔ aucune lecture de `.immat` seul hors vPlaque et vehName (un nouveau lecteur isolé fait tomber ce banc)', lecteurs.map(l => l.trim().slice(0, 90)), []);
  const ctx = { gos: [], ouverts: [], db: new Proxy({ vehicules: [{ id: 'v1', plaque: 'AB-123-CD' }, { id: 'v2', immat: 'ZZ-999-ZZ' }, { id: 'v3', nom: 'Camionnette' }],
    journal: [] }, { get: (o, k) => (k in o ? o[k] : []) }), current: 'dashboard' };
  vm.createContext(ctx);
  vm.runInContext(`
    var norm = s => String(s == null ? '' : s).normalize('NFD').replace(/[\\u0300-\\u036f]/g, '').toLowerCase();
    var go = v => { gos.push(v); }; var toast = () => {}; var visibleBoxes = l => l; var visibleTechniciens = l => l;
    var detailIntervention = () => {}; var ficheClient = () => {}; var ficheTech = () => {}; var openBox = () => {}; var formDoc = () => {};
    ${ligne('const vPlaque=')}
    ${fn('journalGo')}`, ctx);
  const clic = detail => { ctx.gos.length = 0; ctx.db.journal.length = 0; ctx.db.journal.push({ id: 'j1', detail, action: '' }); vm.runInContext('journalGo("j1")', ctx); return ctx.gos.slice(); };
  v('une entrée de journal qui cite la plaque d\'un véhicule créé par l\'écran (plaque) ouvre Véhicules', clic('Véhicule AB-123-CD modifié'), ['vehicules']);
  v('… la casse ne compte pas', clic('véhicule ab-123-cd modifié'), ['vehicules']);
  v('l\'ancien champ immat est toujours retrouvé', clic('Entretien ZZ-999-ZZ'), ['vehicules']);
  v('contre-épreuve : un véhicule sans plaque (« — ») ne fait pas ouvrir Véhicules sur n\'importe quelle ligne', clic('Quelque chose — sans rapport'), []);
  /* la ligne « Véhicule » de la fiche technicien */
  const fiche = bloc('function ficheTech(');
  vrai('la fiche technicien écrit la plaque par vPlaque (et non veh.immat, vide pour un véhicule créé par l\'écran)', /\$\{veh\?esc\(vPlaque\(veh\)\):'—'\}/.test(fiche), fiche.length);
}

console.log('\n══ test-1290 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
