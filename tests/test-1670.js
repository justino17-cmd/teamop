/* ══ PLANNING — CE QUI SE DÉPOSE À LA SOURIS SE DÉPOSE AU DOIGT (campagne 2, lot c2-planning-doigt) ═════════
   La campagne 1 avait donné au glisser tactile les zones à fantôme (data-drop : Multi, Semaine, Jour). Restaient
   les zones qui acceptent la SOURIS (ondrop) sans porter de data-drop : les puces et les cases de jour
   (planDropDay, dans la liste de la semaine pour téléphone ET dans le Mois), les rangées de technicien de la
   liste du jour (planDropTech) et les puces de jour des Interventions (intDropDay). Le doigt n'y déposait rien :
   le touchend ne trouvait pas de zone, et les LIGNES de ces listes (planIntCard, la rangée des Interventions)
   ne portaient pas non plus de marque de source (data-drag-int est réservée aux cartes à fantôme).

   Ce banc EXÉCUTE le vrai bloc du glisser tactile d'app.html avec les VRAIS dépôts (planDropDay, planDropTech,
   intDropDay, et leurs contrôles : planAbsGate — congé validé, confirmation « obligation de travailler » —,
   planObligationLever, planEquipeApres…) dans un bac à sable, puis relit le fichier : toute zone ondrop porte son
   data-drop et chaque préfixe mène, au touchend, au MÊME dépôt que la souris.
   La preuve au navigateur (appui long CDP, mouvements > 15 px, iPhone / Android / iPad) est la sonde du
   scratchpad : correctifs-c2/c2-planning-doigt/sonde-doigt.js, citée dans le commit.                          */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
// un motif de banc vise du CODE, jamais une phrase : les blocs /* … */ qui COMMENCENT une ligne et les lignes // sont retirés avant de chercher
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}

console.log('— 0. la population');
const t0 = BRUT.indexOf('let _tpDrag=null;'), t1 = BRUT.indexOf('/* ═══════════════ PLANNING — traçabilité');
vrai('le bloc du glisser tactile est trouvé', t0 > 0 && t1 > t0, [t0, t1]);
const NOMS = ['planSnap', 'planStamp', 'absentOn', 'absStatut', 'absValidee', 'planAbsGate', 'planObligationLever', 'intTechIds', 'planEquipeApres',
  'planPoserEquipe', 'planDropDay', 'planDropTech', 'intDropDay'];
const FONC = {};
NOMS.forEach(n => { FONC[n] = bloc('function ' + n + '('); });
vrai('les treize fonctions réelles sont trouvées (chacune de plus de 40 signes)', NOMS.every(n => FONC[n].length > 40), NOMS.filter(n => FONC[n].length <= 40));
vrai('⛔ une seule définition de chaque dépôt (une seconde gagnerait partout, en silence)',
  ['planDropDay', 'planDropTech', 'intDropDay'].every(n => SRC.split('function ' + n + '(').length === 2));

function monter(opts) {
  const O = Object.assign({ peut: true, vue: 'planning', zone: 'day:2026-10-18', confirmer: true, oblig: true, source: 'tp', absence: null }, opts || {});
  const S = { timers: [], t: 0, ecout: {}, ajout: [], toasts: [], saves: 0, confirms: [], histo: [], vues: [] };
  const ecoute = (type, fn) => { (S.ecout[type] = S.ecout[type] || []).push(fn); };
  const zone = { classes: new Set(), classList: { add(c) { zone.classes.add(c); }, remove(c) { zone.classes.delete(c); } },
    getAttribute: k => k === 'data-drop' ? O.zone : '' };
  const carte = { getAttribute: k => (O.source === 'tp' ? (k === 'data-tp-int' ? 'i1' : '') : (k === 'data-drag-int' ? 'i1' : '')), offsetWidth: 100,
    getBoundingClientRect: () => ({ top: 100, height: 60 }),
    cloneNode() { const g = { style: {}, enleve: false, remove() { g.enleve = true; } }; S.fantome = g; return g; } };
  const db = { interventions: [{ id: 'i1', titre: 'Dératisation', date: '2026-10-16', heure: '10:00', duree: 60, techId: 'T1', techIds: ['T1'], statut: 'planifiee', histo: [] }],
    absences: O.absence ? [O.absence] : [], planJournal: [] };
  const W = { console, Object, Math, JSON, Set, parseInt, Date, isNaN, String, Number, Array,
    document: { addEventListener: ecoute, body: { appendChild(g) { S.ajout.push(g); } }, elementFromPoint: () => ({ closest: sel => sel === '[data-drop]' ? zone : null }) },
    navigator: {}, window: { _planDragging: false }, current: O.vue,
    canPlan: () => O.peut, can: c => c === 'planifObligerTravail' ? O.oblig : true,
    planLigneDe: () => 'T1', db, currentUser: { id: 'u1' }, fullName: () => 'Justine Admin',
    toast: m => S.toasts.push(String(m)), save() { S.saves++; }, intHisto: (i, m) => { S.histo.push(m); i.histo.push(m); },
    views: { planning() { S.vues.push('planning'); }, interventions() { S.vues.push('interventions'); } },
    fmtShort: iso => iso, techName: id => ({ T1: 'Karim', T2: 'Sofia', '': '' })[id] || id, techNames: i => (i.techIds || []).map(x => ({ T1: 'Karim', T2: 'Sofia' })[x] || x).join(', '),
    ABS_TYPES: { conges: 'congés' }, intConflictOf: () => null, serieShiftPropose() {}, confirm: m => { S.confirms.push(m); return O.confirmer; },
    planSel: '2026-10-16', intSelDay: '2026-10-16',
    setTimeout: (fn, ms) => { const id = S.timers.length + 1; S.timers.push({ id, fn, a: S.t + ms, vivant: true }); return id; },
    clearTimeout: id => { const t = S.timers.find(x => x.id === id); if (t) t.vivant = false; } };
  vm.createContext(W);
  // planSel / intSelDay sont des `let` du fichier : les dépôts les ÉCRIVENT, on les déclare donc dans le contexte
  vm.runInContext('var planSel="2026-10-16", intSelDay="2026-10-16";', W);
  vm.runInContext(BRUT.slice(t0, t1) + '\n' + NOMS.map(n => FONC[n]).join('\n'), W);
  const avance = ms => { S.t += ms; S.timers.filter(x => x.vivant && x.a <= S.t).forEach(x => { x.vivant = false; x.fn(); }); };
  const tire = (type, e) => { (S.ecout[type] || []).forEach(fn => fn(e)); };
  const doigt = (x, y) => ({ clientX: x, clientY: y });
  const touche = (type, x, y) => {
    const ev = { touches: type === 'touchend' || type === 'touchcancel' ? [] : [doigt(x, y)], changedTouches: [doigt(x, y)], cancelable: true, prevenu: false,
      target: { closest: sel => sel === '[data-drag-int]' ? (O.source === 'drag' ? carte : null) : sel === '[data-tp-int]' ? (O.source === 'tp' ? carte : null) : null },
      preventDefault() { ev.prevenu = true; } };
    tire(type, ev); return ev; };
  const glisse = (fin) => { touche('touchstart', 100, 130); avance(300); touche('touchmove', 140, 400); if (fin !== false) touche(fin || 'touchend', 140, 400); };
  const i1 = () => db.interventions[0];
  return { W, S, db, i1, avance, touche, glisse, zone };
}

console.log('— 1. une puce ou une case de jour (planDropDay) reçoit le doigt');
{ const m = monter({ zone: 'day:2026-10-18' });
  m.glisse();
  vrai('la ligne tenue du doigt change de jour (16 → 18 octobre)', m.i1().date === '2026-10-18', m.i1());
  vrai('…enregistrée une fois, et le planning est redessiné sur ce jour', m.S.saves === 1 && m.W.planSel === '2026-10-18' && m.S.vues.includes('planning'), [m.S.saves, m.W.planSel, m.S.vues]);
  vrai('…avec sa trace au journal du planning (qui a déplacé quoi)', m.db.planJournal.length === 1 && m.db.planJournal[0].vers.date === '2026-10-18', m.db.planJournal);
  vrai('…et le geste le dit (toast)', m.S.toasts.some(t => /déplacée/i.test(t)), m.S.toasts);
  vrai('le fantôme est retiré, rien ne reste allumé', (m.S.fantome || {}).enleve === true && !m.zone.classes.has('drop') && m.W.window._planDragging === false); }
{ const m = monter({ zone: 'day:2026-10-16' });
  m.glisse();
  vrai('déposée sur son propre jour : rien ne change, rien n\'est enregistré', m.i1().date === '2026-10-16' && m.S.saves === 0, [m.i1().date, m.S.saves]); }

console.log('— 2. la rangée d\'un technicien (planDropTech) reçoit le doigt');
{ const m = monter({ zone: 'tech:T2' });
  m.glisse();
  vrai('l\'intervention passe au technicien de la rangée visée', m.i1().techId === 'T2' && m.i1().techIds.join() === 'T2', m.i1());
  vrai('…enregistrée une fois, journal et historique tenus', m.S.saves === 1 && m.db.planJournal.length === 1 && m.S.histo.some(h => /Assignée à Sofia/.test(h)), [m.S.saves, m.db.planJournal.length, m.S.histo]); }
{ const m = monter({ zone: 'tech:' });
  m.glisse();
  vrai('la rangée « Non assigné » (identifiant vide) retire le technicien', m.i1().techId === '' && m.i1().techIds.length === 0, m.i1()); }

console.log('— 3. la puce de jour des Interventions (intDropDay) reçoit le doigt, depuis cette vue');
{ const m = monter({ zone: 'intday:2026-10-19', vue: 'interventions' });
  m.glisse();
  vrai('la rangée change de jour, la vue Interventions est redessinée', m.i1().date === '2026-10-19' && m.W.intSelDay === '2026-10-19' && m.S.vues.includes('interventions'), [m.i1().date, m.W.intSelDay, m.S.vues]);
  vrai('…enregistrée une fois', m.S.saves === 1, m.S.saves); }
{ const m = monter({ zone: 'day:2026-10-18', vue: 'dashboard' });
  m.glisse();
  vrai('hors Planning, Carte et Interventions, aucun glisser ne s\'arme (le tableau de bord défile)', m.S.ajout.length === 0 && m.i1().date === '2026-10-16' && m.S.saves === 0, m.S.ajout.length); }

console.log('— 4. les MÊMES contrôles qu\'à la souris : congé validé, confirmation, droit');
{ const abs = { id: 'a1', techId: 'T1', du: '2026-10-18', au: '2026-10-18', type: 'conges', statut: 'validee' };
  const refus = monter({ zone: 'day:2026-10-18', absence: abs, confirmer: false });
  refus.glisse();
  vrai('congé validé, confirmation REFUSÉE : la confirmation est posée et l\'intervention ne bouge pas', refus.S.confirms.length === 1 && /obligation/i.test(refus.S.confirms[0]) && refus.i1().date === '2026-10-16' && refus.S.saves === 0, [refus.S.confirms, refus.i1().date]);
  const oui = monter({ zone: 'day:2026-10-18', absence: abs, confirmer: true });
  oui.glisse();
  vrai('congé validé, confirmation ACCEPTÉE : déposée, avec la trace « obligation de travailler »', oui.i1().date === '2026-10-18' && oui.i1().histo.some(h => /Obligation de travailler/.test(h)) && oui.db.planJournal[0].oblig !== '' , [oui.i1().date, oui.i1().histo]);
  const sans = monter({ zone: 'day:2026-10-18', absence: abs, oblig: false });
  sans.glisse();
  vrai('congé validé, sans le droit « Obliger à travailler » : refus net, rien ne bouge', sans.i1().date === '2026-10-16' && sans.S.confirms.length === 0 && sans.S.toasts.some(t => /Impossible/.test(t)), [sans.i1().date, sans.S.toasts]);
  const attente = monter({ zone: 'day:2026-10-18', absence: Object.assign({}, abs, { statut: 'attente' }) });
  attente.glisse();
  vrai('une demande de congé encore EN ATTENTE ne bloque pas', attente.i1().date === '2026-10-18' && attente.S.confirms.length === 0, [attente.i1().date, attente.S.confirms]);
  const tech = monter({ zone: 'tech:T2', absence: { id: 'a2', techId: 'T2', du: '2026-10-16', au: '2026-10-16', type: 'conges', statut: 'validee' }, confirmer: false });
  tech.glisse();
  vrai('rangée d\'un technicien en congé ce jour-là : même contrôle, refusée, rien ne bouge', tech.S.confirms.length === 1 && tech.i1().techId === 'T1' && tech.S.saves === 0, [tech.S.confirms, tech.i1().techId]);
  const sansDroit = monter({ peut: false });
  sansDroit.glisse();
  vrai('sans le droit « Déplacer le planning » : aucun glisser tactile', sansDroit.S.ajout.length === 0 && sansDroit.i1().date === '2026-10-16'); }

console.log('— 5. un doigt perdu (touchcancel) défait le geste sans rien déposer');
{ ['day:2026-10-18', 'tech:T2', 'intday:2026-10-19'].forEach(z => {
    const m = monter({ zone: z, vue: z.startsWith('intday') ? 'interventions' : 'planning' });
    m.glisse('touchcancel');
    vrai('touchcancel sur « ' + z + ' » : rien déposé, rien enregistré', m.i1().date === '2026-10-16' && m.i1().techId === 'T1' && m.S.saves === 0, m.i1());
    vrai('…le fantôme est retiré, la zone n\'est plus allumée, _planDragging est faux', (m.S.fantome || {}).enleve === true && !m.zone.classes.has('drop') && m.W.window._planDragging === false);
    m.touche('touchend', 140, 400);
    vrai('…et un touchend tardif ne dépose rien', m.i1().date === '2026-10-16' && m.S.saves === 0); }); }

console.log('— 6. la zone survolée s\'allume, et la cible vit dans la LIGNE de départ');
{ const m = monter({ zone: 'tech:T2' });
  m.glisse(false);
  vrai('pendant le déplacement, la rangée survolée porte .drop', m.zone.classes.has('drop'));
  vrai('…et la feuille de style lui donne le contour (la souris le pose en ligne ; sans règle, le doigt déposerait sans voir où)',
    /\[data-drop\^="day:"\]\.drop,\[data-drop\^="tech:"\]\.drop,\[data-drop\^="intday:"\]\.drop\{outline:2px solid var\(--acc\)/.test(SRC)); }
{ const m = monter({ source: 'drag' });
  m.glisse();
  vrai('non-régression : une carte à fantôme (data-drag-int) arme toujours le glisser', m.i1().date === '2026-10-18', m.i1()); }

console.log('— 7. recensement du fichier : toute zone ondrop porte son data-drop, et chaque préfixe mène au MÊME dépôt');
{ const zones = [...SRC.matchAll(/<div\b[^<>]*\bondrop="[^"]*"[^<>]*>/g)].map(x => x[0]);
  vrai('population : les zones ondrop du fichier sont recensées (sept, plus aucune oubliée)', zones.length === 7, zones.length);
  const sans = zones.filter(z => !/\bdata-drop="/.test(z));
  vrai('⛔ aucune zone ondrop sans data-drop (elle ne recevrait rien du doigt)', sans.length === 0, sans.map(z => z.slice(0, 120)));
  const depots = { day: 'planDropDay', tech: 'planDropTech', intday: 'intDropDay', multi: 'planMultiDrop', cell: 'planWeekDrop', time: 'planDropTime' };
  let croise = 0;
  zones.forEach(z => {
    const px = (z.match(/\bdata-drop="(\w+):/) || [])[1];
    if (px && new RegExp('\\bondrop="[^"]*' + depots[px] + '\\(').test(z)) croise++; });
  vrai('chaque zone : son ondrop appelle le dépôt que le préfixe de son data-drop désigne', croise === zones.length, [croise, zones.length]);
  // l'identifiant du data-drop est celui de l'ondrop (jour ou technicien) — une puce ne doit pas déposer au jour d'à côté
  const memeId = zones.filter(z => /data-drop="(day|intday):\$\{iso\}"/.test(z)).every(z => /(planDropDay|intDropDay)\(event,'\$\{iso\}'\)/.test(z))
    && zones.filter(z => /data-drop="tech:\$\{g\.id\}"/.test(z)).every(z => /planDropTech\(event,'\$\{g\.id\}'\)/.test(z));
  vrai('…et le même jour / le même technicien que l\'ondrop', memeId);
  const code = BRUT.slice(t0, t1);
  const prefixes = [...new Set(zones.map(z => (z.match(/\bdata-drop="(\w+):/) || [])[1]))].filter(Boolean);
  vrai('population : six préfixes de zone (multi, cell, time, day, tech, intday)', prefixes.length === 6, prefixes);
  prefixes.forEach(px => vrai('préfixe « ' + px + ' » : routé dans touchend vers ' + depots[px], new RegExp("parts\\[0\\]==='" + px + "'(&&parts\\[3\\])?\\) " + depots[px] + '\\(').test(code) || (px === 'cell' && /planDropCell\(/.test(code)), px)); }

console.log('— 8. les lignes des listes sont des SOURCES, sans devenir des cartes à fantôme');
{ const pic = bloc('function planIntCard('), cardOrg = SRC.slice(SRC.indexOf('const cardOrg=i=>'), SRC.indexOf('const cardOrg=i=>') + 6000);
  vrai('la ligne du planning (planIntCard) porte data-tp-int', /<div class="pl-row lh" data-tp-int="\$\{i\.id\}"/.test(pic), pic.slice(0, 200));
  vrai('la rangée des Interventions porte data-tp-int', /<div class="tf-rangee" data-tp-int="\$\{i\.id\}"/.test(cardOrg));
  vrai('…et NI l\'une NI l\'autre ne prend data-drag-int (menu contextuel et mise en retrait de la recherche la lisent)', !/data-drag-int/.test(pic) && !/class="tf-rangee"[^>]*data-drag-int/.test(cardOrg));
  const ts = BRUT.slice(BRUT.indexOf("document.addEventListener('touchstart',e=>{ if(e.touches.length!==1"), BRUT.indexOf("document.addEventListener('touchmove'", t0));
  vrai('le touchstart lit les DEUX marques, dans les trois vues', /closest\('\[data-drag-int\]'\)\|\|e\.target\.closest\('\[data-tp-int\]'\)/.test(ts) && /current!=='interventions'/.test(ts), ts.slice(0, 200)); }

console.log('\n════ test-1670 : ' + ok + ' ✓ ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
