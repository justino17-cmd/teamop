/* 3024 — LA COUTURE DES HEURES DE TRAVAIL : LA TOUR (ses vraies fonctions) CONTRE LE VRAI SERVEUR (v2.112, 26 octobre 2026).
   `test-3023` joue les vraies fonctions de la page contre un serveur SCRIPTÉ ; `test-3021` joue le vrai module contre des clients de banc. Aucun des deux ne voit un défaut de COUTURE
   (CLAUDE.md : « dès qu'une page appelle une route neuve, un banc fait parler la VRAIE fonction de la page au VRAI serveur »). Ici : les vraies `apiGet`, `apiPost`, `chargerHoraires`,
   `hoEnregistrer`, `hoOuvrir`, `hoFermer`, `hoPhrase`, `hoVue` de `tour.html` contre le vrai `server/index.js` (127.0.0.1, `tests/banc-serveur-gestion.js`).
   Le serveur lit l'HORLOGE RÉELLE : rien ici ne suppose « il est lundi 10 h » — l'état d'ouverture se force (`ouvrir`) ou se compare à ce que le serveur dit de lui-même.
   Il garde : la vue lue (sept jours, fériés à venir, astreinte par défaut Max et Théo) ; un enregistrement relu à l'identique ; un refus 400 affiché tel quel ; ouvrir / fermer ;
   le 403 d'un collaborateur ; un registre ILLISIBLE (503) dit « les agents restent à l'arrêt » et le résumé de la liste des agents aussi. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0, fini = false;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), 'obtenu ' + JSON.stringify(a) + ' / attendu ' + JSON.stringify(b));
process.on('exit', () => { if (!fini) { console.log('  ✗ banc interrompu avant la fin'); process.exitCode = 1; } });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 150 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fini = true; process.exit(1); }, 150000).unref();
console.log('── test-3024 : la Tour contre le vrai serveur — les heures de travail ──');
if (!fs.existsSync(path.join(RACINE, 'server', 'node_modules', 'express'))) { console.log('  (hors service : server/node_modules absent)\n\n0 ✓  0 ✗'); fini = true; process.exit(0); }
if (!fs.existsSync(path.join(RACINE, 'server', 'agents-horaires.js'))) { console.log('  (en attente : le serveur des heures de travail (server/agents-horaires.js) n’est pas encore sur cette branche — ce banc joue dès qu’il y est)\n\n0 ✓  0 ✗'); fini = true; process.exit(0); }
const BRUT = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8');
const CODE = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
function corps(entete) {
  const i = CODE.indexOf(entete); if (i < 0) return '';
  let k = CODE.indexOf('{', i), prof = 0, prev = '';
  for (; k < CODE.length; k++) {
    const c = CODE[k], n = CODE[k + 1];
    if (c === '/' && n === '/') { k = CODE.indexOf('\n', k) - 1; continue; }
    if (c === '/' && n === '*') { k = CODE.indexOf('*/', k + 2) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') { const q = c; for (k++; k < CODE.length; k++) { if (CODE[k] === '\\') { k++; continue; } if (CODE[k] === q) break; } prev = 'x'; continue; }
    if (c === '/' && /[(,=:\[!&|?{};]/.test(prev)) { let cl = false; for (k++; k < CODE.length; k++) { const d = CODE[k]; if (d === '\\') { k++; continue; } if (d === '[') cl = true; else if (d === ']') cl = false; else if (d === '/' && !cl) break; } prev = 'x'; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(i, k + 1); }
    if (!/\s/.test(c)) prev = c;
  }
  return '';
}
const fonction = nom => corps('\nfunction ' + nom + '(').trim();
const ligne = deb => { const i = CODE.indexOf(deb); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
const ESC = (/\nfunction esc\(s\)\{.*\n/.exec(CODE) || [''])[0];
const FNS = ['apiGet', 'apiPost', 'agIllisible', 'paObj', 'agMode', 'agEnPause', 'hoNb', 'hoParis', 'hoLib', 'hoFin', 'hoPhrase', 'hoLigne', 'agHorsHeures', 'hoCopieJour', 'hoRepartir', 'hoHeure', 'hoVersServeur', 'hoEcrit', 'hoAgentConnu', 'hoCible', 'hoSet', 'hoHerite',
  'hoFeries', 'hoAstreinte', 'hoAgentOuvrir', 'hoAgentPropres', 'hoDuree', 'hoAnnuler', 'hoPerm', 'hoPermActif', 'hoPermAgent', 'hoPermPilier', 'hoPermHeure', 'hoBinome', 'hoSamedi', 'hoPermanenceHtml', 'agDeGarde', 'agAvatar', 'hoCorps', 'hoEnvoyer', 'hoEnregistrer', 'hoMinuit', 'hoOuvrir', 'hoFermer', 'hoResume', 'chargerHoraires', 'hoApres', 'hoJourHtml', 'hoVue'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_PHOTOS='), ligne('var AG_MODES='), ligne('var HO_JOURS='), ligne('var HO_DUREES='), ligne('var INJOIGNABLE='), corps('var HO={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions de la page sont trouvées', FN.every(f => f.length > 30) && VARS.length > 200, FNS.filter((n, i) => FN[i].length <= 30).join(','));
let jeton = '';
const bac = { JSON, Date, Intl, String, Array, Math, Object, Number, Promise, Error, console, fetch, MYROLE: 'patron', TAB: 'agents', API: '',
  AG: { sec: 'horaires', agents: [], pause: null, illisible: false, horaires: null }, hAuth: () => ({ Authorization: 'Bearer ' + jeton, 'Content-Type': 'application/json' }), srvRepond: r => r, srvMuet: e => { throw e; }, doLogout: () => {},
  render: () => {}, chargerAgents: () => {}, acSquel: () => '<sq>' };
vm.createContext(bac);
vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + FNS.concat(['HO', 'esc']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
const HO = bac.HO, AG = bac.AG;
const sansBalise = h => [...h.matchAll(/<([a-z0-9]+)([^>]*)>/gi)].filter(t => /^(img|script|svg|a|iframe|object|embed|link|form|style)$/i.test(t[1]) || /\s(href|src|action|srcdoc)\s*=/i.test(t[2])).length === 0;

(async () => {
  const { demarrer } = require('./banc-serveur-gestion.js');
  console.log('\n1. Le vrai serveur : lire, écrire, ouvrir, fermer');
  /* les bancs du serveur écrivent un registre « toujours ouvert » (`banc-horaires.js`) : ici on veut un réglage qui FERME quelque chose — l'ANCIEN réglage (lundi – vendredi, 9 h – 18 h, fériés fermés, Max et Théo d'astreinte,
     permanence active), que Justin a laissé jusqu'au 28 octobre 2026 : le défaut du code est devenu « tous les jours 8 h – 24 h » (Justin, 28 octobre), et `test-3125` le garde. La page, elle, se joue sur n'importe quel réglage. */
  const d0 = D => fs.writeFileSync(path.join(D, 'agents-horaires.json'), JSON.stringify(require('./banc-horaires.js').ancien()));
  const S = await demarrer({ avant: d0 });
  vrai('le serveur démarre, une session de patron et une de collaborateur', S.vivant && S.TP && S.TA, S.journal().slice(-300));
  if (!S.vivant) { fini = true; console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  bac.API = S.B; jeton = S.TP;
  const liste = await S.get('/api/monitor/agents');
  AG.agents = liste.j.agents;
  AG.horaires = liste.j.horaires;
  vrai('la liste des agents porte le résumé des horaires (`horaires.actives`) et la page en tire une phrase', liste.j.horaires && liste.j.horaires.actives === true && Array.isArray(bac.hoPhrase(liste.j.horaires)) && /^(Ouverte|Fermée)/.test(bac.hoPhrase(liste.j.horaires)[1]), [liste.j.horaires, bac.hoPhrase(liste.j.horaires)]);
  await bac.chargerHoraires();
  vrai('la vraie `chargerHoraires` lit la vue du vrai serveur : sept jours lundi → dimanche, fériés fermés, astreinte Max et Théo', HO.lec === 1 && HO.ed.jours.length === 7 && HO.ed.jours.slice(0, 5).every(j => j.ouvert) && HO.ed.jours[0].ouvert === true && HO.ed.jours[0].debut === '09:00' && HO.ed.jours[0].fin === '18:00' && HO.ed.jours[5].ouvert === false && HO.ed.feries === true && HO.ed.astreinte.slice().sort().join() === 'max,theo', [HO.lec, JSON.stringify(HO.ed.jours), HO.ed.feries, HO.ed.astreinte]);
  vrai('…cinq fériés à venir, écrits dans la page', HO.d.feriesAVenir.length === 5 && bac.hoVue().indexOf(HO.d.feriesAVenir[0].nom) > 0);
  vrai('…les rangées des agents savent qui est « hors heures » ou « d’astreinte » à CET instant (cohérent avec ce que le serveur dit de chacun)', AG.agents.every(a => { const x = HO.d.agents[a.id], h = bac.agHorsHeures(Object.assign({}, a, { mode: 'auto' })); return x.ouvert ? h === '' : (x.agit && x.astreinte ? h === 'D’astreinte' : h === 'Hors heures'); }));
  egal('(population) le serveur connaît les seize agents du registre', Object.keys(HO.d.agents).length, AG.agents.length);

  bac.hoSet('e', 0, 'debut', '08:30'); bac.hoSet('e', 5, 'ouvert', true); bac.hoSet('e', 5, 'debut', '10:00'); bac.hoSet('e', 5, 'fin', '00:00'); bac.hoFeries('e', false); bac.hoAstreinte('lola', true);
  bac.hoAgentPropres('lola', true); bac.hoHerite('lola', 5, false); bac.hoSet('lola', 5, 'fin', '12:00'); bac.hoFeries('lola', 'non');
  const r1 = await bac.hoEnregistrer();
  v1(r1, 'Enregistrer : le vrai serveur accepte la forme exacte que la page envoie (200)');
  function v1(r, t) { vrai(t, r && r.status === 200 && r.d.ok === true, r && [r.status, r.d]); }
  vrai('…la vue rendue remplace celle de la page : lundi 8 h 30, samedi 10 h → minuit (« 24:00 » rendu par le serveur, « 00:00 » dans le champ), fériés ouverts, astreinte + Lola', HO.d.entreprise.jours[0].debut === '08:30' && HO.d.entreprise.jours[5].fin === '24:00' && HO.ed.jours[5].fin === '24:00' && /id="ho-e-5"/.test(bac.hoVue()) && HO.d.entreprise.feries === false && HO.d.astreinte.includes('lola'), [HO.d.entreprise.jours[5], HO.d.astreinte]);
  vrai('…le champ d’heure du samedi affiche « 00:00 » pour minuit', /Fermeture du samedi" value="00:00"/.test(bac.hoVue()));
  vrai('…Lola a ses horaires propres : samedi 9 h – 12 h, ses fériés « ouverts », les autres jours comme l’entreprise (null)', JSON.stringify(HO.d.parAgent.lola.jours.map(j => j && j.fin)) === '[null,null,null,null,null,"12:00",null]' && HO.d.parAgent.lola.feries === false, HO.d.parAgent);
  const relu = (await S.get('/api/monitor/agents/horaires')).j;
  vrai('⛔ relu chez le serveur : IDENTIQUE à ce que la page affiche (rien de perdu en route)', JSON.stringify([relu.entreprise, relu.parAgent, relu.astreinte]) === JSON.stringify([HO.d.entreprise, HO.d.parAgent, HO.d.astreinte]));
  vrai('…et le registre est écrit sur le disque du serveur', S.fichier('agents-horaires.json').entreprise.jours[0].debut === '08:30');
  bac.hoAgentPropres('lola', false); await bac.hoEnregistrer();
  vrai('« Revenir à l’entreprise » : la page envoie `null`, le serveur retire les horaires propres de Lola', !('lola' in HO.d.parAgent), HO.d.parAgent);

  bac.hoSet('e', 0, 'debut', '19:00'); const r2 = await bac.hoEnregistrer();
  vrai('⛔ un début après la fin : le vrai serveur refuse (400) et la page affiche SA phrase, la modification reste', r2.status === 400 && HO.msg === r2.d.error && /doit venir avant la fermeture/.test(HO.msg) && HO.sale === true && HO.ed.jours[0].debut === '19:00', [r2.status, HO.msg]);
  bac.hoAnnuler();
  for (let i = 0; i < 5; i++) bac.hoSet('e', i, 'ouvert', false); bac.hoSet('e', 5, 'ouvert', false); bac.hoSet('e', 6, 'ouvert', false);
  const r3 = await bac.hoEnregistrer(); vrai('aucun jour ouvert : refusé (400), le serveur renvoie vers la pause générale, la page le dit telle quelle', r3.status === 400 && /pause générale/.test(HO.msg), [r3.status, HO.msg]); bac.hoAnnuler();

  /* ⛔ le serveur lit l'HORLOGE RÉELLE : pour forcer une ouverture il faut que l'équipe soit FERMÉE à cet instant, quelle que soit l'heure où le banc tourne (en heures ouvrées, « ouverte » l'emporte sur « ouverture forcée »).
     On règle donc chaque jour sur une fenêtre de 30 minutes, douze heures plus loin que Paris maintenant : fermée, à coup sûr. */
  const hp = bac.hoParis(Date.now()).h, hh = ('0' + ((hp + 12) % 24)).slice(-2);
  for (let i = 0; i < 7; i++) { bac.hoSet('e', i, 'ouvert', true); bac.hoSet('e', i, 'debut', hh + ':00'); bac.hoSet('e', i, 'fin', hh + ':30'); }
  const rf = await bac.hoEnregistrer(); vrai('une fenêtre de 30 minutes, 12 h plus loin : acceptée, l’équipe est fermée maintenant', rf.status === 200 && HO.d.maintenant.ouvert === false && HO.d.maintenant.raison !== 'heures_ouvrees', [rf.status, HO.d.maintenant]);
  const o1 = await bac.hoOuvrir();
  vrai('« Ouvrir maintenant » 1 h : le vrai serveur ouvre (ouverture forcée), la page dit « exceptionnellement » et propose de remettre aux heures normales', o1.status === 200 && HO.d.maintenant.raison === 'ouverture_forcee' && /exceptionnellement/.test(bac.hoPhrase(AG.horaires)[1]) && /hoFermer/.test(bac.hoVue()), [o1.status, HO.d.maintenant]);
  vrai('…la fin forcée vaut maintenant + 1 h (à la minute près)', Math.abs(HO.d.ouvertJusqua - (Date.now() + 3600000)) < 120000, HO.d.ouvertJusqua - Date.now());
  const liste2 = await S.get('/api/monitor/agents');
  vrai('…la liste des agents l’a aussi (résumé `horaires.raison`) : tous les agents agissent', liste2.j.horaires.raison === 'ouverture_forcee' && liste2.j.horaires.ouvert === true && Object.values((await S.get('/api/monitor/agents/horaires')).j.agents).every(a => a.ouvert && a.agit));
  const f1 = await bac.hoFermer();
  vrai('« Remettre aux heures normales » : le vrai serveur ferme l’ouverture forcée, la page ne dit plus « exceptionnellement »', f1.status === 200 && HO.d.ouvertJusqua === null && HO.d.maintenant.raison !== 'ouverture_forcee' && !/exceptionnellement/.test(bac.hoPhrase(AG.horaires)[1]), [f1.status, HO.d.maintenant.raison]);
  bac.hoDuree('24h'); const o2 = await bac.hoOuvrir(); vrai('24 h : accepté, fin = maintenant + 24 h', o2.status === 200 && Math.abs(HO.d.ouvertJusqua - (Date.now() + 86400000)) < 120000);
  bac.hoDuree('minuit'); const o3 = await bac.hoOuvrir(); vrai('jusqu’à minuit : accepté, et c’est minuit à Paris', o3.status === 200 && (p => p.h === 0 && p.m === 0)(bac.hoParis(HO.d.ouvertJusqua)) && HO.d.ouvertJusqua > Date.now() + 60000 && HO.d.ouvertJusqua <= Date.now() + 25 * 3600000 + 60000, new Date(HO.d.ouvertJusqua).toISOString());
  await bac.hoFermer();

  /* la permanence du week-end : jouée dès que le serveur la porte (PR n° 197) ; un serveur d'avant n'en parle pas, et la page ne montre alors aucune section */
  await bac.chargerHoraires();
  if (!('permanence' in HO.d)) { console.log('  (la permanence du week-end n’est pas encore sur ce serveur : ses contrôles jouent dès qu’il la porte)'); vrai('sans permanence côté serveur : la page n’en dessine aucune et n’en envoie aucune', !/Permanence du week-end/.test(bac.hoVue()) && !('permanence' in bac.hoCorps())); }
  else {
    const pm = HO.d.permanence, nomsDe = ids => ids.map(id => (AG.agents.filter(a => a.id === id)[0] || {}).nom);
    vrai('le serveur rend la permanence par défaut : active, rotation Camille · Hugo · Margaux · Léa, piliers Camille et Hugo, 9 h – 18 h', pm.actif === true && pm.agents.slice().sort().join() === 'camille,hugo,lea,margaux' && pm.piliers.slice().sort().join() === 'camille,hugo' && pm.debut === '09:00' && pm.fin === '18:00', pm);
    const gardes = Object.keys(HO.d.agents).filter(id => HO.d.agents[id].deGarde === true).sort();
    vrai('⛔ le binôme de « ce week-end » est le même chez `permanence.ceWeekEnd` et chez `agents[id].deGarde` ; il compte un pilier ; le suivant est un AUTRE binôme', pm.ceWeekEnd.agents.length === 2 && gardes.join() === pm.ceWeekEnd.agents.slice().sort().join() && pm.ceWeekEnd.agents.some(x => pm.piliers.includes(x)) && pm.suivant.agents.slice().sort().join() !== gardes.join(), [pm.ceWeekEnd, pm.suivant, gardes]);
    const vp = bac.hoVue(), noms = nomsDe(pm.ceWeekEnd.agents);
    vrai('la page l’écrit : « Ce week-end : » avec leurs noms et leurs photos, la date du samedi', new RegExp('Ce week-end : [\\s\\S]*?' + noms[0] + '[\\s\\S]*?' + noms[1]).test(vp) && /ho-av/.test(vp) && bac.hoSamedi(pm.ceWeekEnd.samedi).length > 8 && vp.indexOf(bac.hoSamedi(pm.ceWeekEnd.samedi)) > 0);
    vrai('…et les rangées des agents de garde le savent (`agDeGarde` ⇔ ce que dit le serveur)', AG.agents.every(a => bac.agDeGarde(a) === (HO.d.agents[a.id].deGarde === true)));
    bac.hoPermAgent('lea', false); bac.hoPermPilier('camille', false); bac.hoPermHeure('debut', '08:00'); bac.hoPermHeure('fin', '00:00');
    const rp = await bac.hoEnregistrer();
    vrai('Enregistrer : le vrai serveur accepte les cinq champs que la page envoie (200) ; « 00:00 » est devenu « 24:00 »', rp.status === 200 && HO.d.permanence.agents.slice().sort().join() === 'camille,hugo,margaux' && HO.d.permanence.piliers.join() === 'hugo' && HO.d.permanence.debut === '08:00' && HO.d.permanence.fin === '24:00', [rp.status, HO.d.permanence]);
    vrai('…le binôme de ce week-end vient de la NOUVELLE rotation, et contient Hugo (le seul pilier)', HO.d.permanence.ceWeekEnd.agents.every(x => HO.d.permanence.agents.includes(x)) && HO.d.permanence.ceWeekEnd.agents.includes('hugo'), HO.d.permanence.ceWeekEnd);
    const rel = (await S.get('/api/monitor/agents/horaires')).j.permanence;
    vrai('⛔ relu chez le serveur : IDENTIQUE à ce que la page affiche', JSON.stringify(rel) === JSON.stringify(HO.d.permanence));
    bac.hoPermAgent('margaux', false); bac.hoPermAgent('camille', false); const r1 = await bac.hoEnregistrer();
    vrai('⛔ une rotation de moins de deux agents : refusée (400), la phrase du serveur s’affiche telle quelle, les cases restent', r1.status === 400 && HO.msg === r1.d.error && /deux agents/.test(HO.msg) && HO.ed.perm.agents.join() === 'hugo', [r1.status, HO.msg]);
    bac.hoAnnuler(); bac.hoPermActif(false); const r2 = await bac.hoEnregistrer();
    vrai('désactiver : accepté ; plus de binôme annoncé, plus aucun agent « de garde »', r2.status === 200 && HO.d.permanence.actif === false && HO.d.permanence.ceWeekEnd.agents.length === 0 && Object.values(HO.d.agents).every(a => !a.deGarde) && /Désactivée/.test(bac.hoVue()), [r2.status, HO.d.permanence]);
    bac.hoPermActif(true); await bac.hoEnregistrer();
  }

  console.log('\n2. Un collaborateur lit, il n’écrit pas');
  const tp = jeton; jeton = S.TA;
  const lectureCollab = await bac.apiGet('/api/monitor/agents/horaires').catch(e => ({ erreur: e.status }));
  vrai('le serveur laisse LIRE un collaborateur', lectureCollab.ok === true && Array.isArray(lectureCollab.entreprise.jours), lectureCollab.erreur);
  const fin1 = HO.d.entreprise.jours[1].fin; bac.MYROLE = 'patron'; HO.sale = false; bac.hoSet('e', 1, 'fin', fin1 === '17:00' ? '17:15' : '17:00');
  const rc = await bac.hoEnregistrer();
  vrai('⛔ si la page croyait (à tort) qu’il est patron : le vrai serveur refuse (403), la page affiche un refus sans rien inventer', rc.status === 403 && HO.ko === true && HO.msg.length > 3 && HO.d.entreprise.jours[1].fin === fin1, [rc.status, HO.msg]);
  const oc = await bac.hoOuvrir(); const fc = await bac.hoFermer();
  vrai('…ni ouvrir ni fermer (403 et 403)', oc.status === 403 && fc.status === 403, [oc.status, fc.status]);
  jeton = tp; bac.MYROLE = 'patron';
  const a403 = (await fetch(S.B + '/api/monitor/agents/horaires')).status;
  vrai('sans session : 401 ou 403, rien ne sort', a403 === 401 || a403 === 403, a403);
  await S.fin();

  console.log('\n3. Un registre ILLISIBLE : les agents restent à l’arrêt, la page le DIT');
  const S2 = await demarrer({ avant: D => fs.writeFileSync(path.join(D, 'agents-horaires.json'), '{ cassé') });
  vrai('le serveur démarre malgré le fichier cassé', S2.vivant, S2.journal().slice(-300));
  if (S2.vivant) {
    bac.API = S2.B; jeton = S2.TP; HO.lec = 0; HO.d = null; HO.ed = null; HO.enVol = null;
    await bac.chargerHoraires();
    vrai('⛔ la vraie `chargerHoraires` : 503 → « illisibles… les agents restent à l’arrêt », avec la phrase du serveur échappée', HO.lec === -3 && /restent à l’arrêt/.test(bac.hoVue()) && /illisibles/.test(bac.hoVue()) && sansBalise(bac.hoVue()), [HO.lec, HO.err]);
    const l = await S2.get('/api/monitor/agents');
    vrai('⛔ la liste des agents dit `horaires.illisible` et la barre dit « Horaires illisibles — les agents restent à l’arrêt » (jamais « ouverte »)', l.j.horaires.illisible === true && bac.hoPhrase(l.j.horaires)[0] === 'illisible', l.j.horaires);
    const ecr = await bac.apiPost('/api/monitor/agents/horaires', { astreinte: ['max'] });
    vrai('écrire un registre illisible : 503, rien n’est modifié', ecr.status === 503 && fs.readFileSync(path.join(S2.D, 'agents-horaires.json'), 'utf8') === '{ cassé', ecr.status);
  }
  await S2.fin();
  fini = true;
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fini = true; process.exit(1); });
