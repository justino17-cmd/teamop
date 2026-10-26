/* 3023 — LES HEURES DE TRAVAIL DES AGENTS DANS LA TOUR (v2.112, 26 octobre 2026). Justin : « je voudrais pouvoir choisir les heures de travail des agents, comme une vraie entreprise ».
   Le serveur décide (server/agents-horaires.js) ; la Tour LIT `GET /api/monitor/agents/horaires` et ÉCRIT `POST …/horaires`, `…/ouvrir`, `…/fermer`. Ce banc EXÉCUTE les vraies fonctions de `tour.html`
   (jamais un motif sur leur texte) et garde :
     · la ligne d'état (« Ouverte jusqu'à 18 h », « Fermée — reprend lundi 26 octobre à 9 h », « exceptionnellement », « N en attente d'ouverture », « illisibles ») en HEURE DE PARIS, été comme hiver ;
     · « Hors heures » / « D'astreinte » sur la rangée d'un agent qui travaille, et nulle part ailleurs ;
     · ce que la page ENVOIE : la forme exacte du contrat (jours ouverts en booléens stricts, « 24:00 » pour minuit, `null` pour retirer les horaires d'un agent), jamais un champ de lecture ;
     · un seul envoi à la fois, le patron seul, un refus 400 affiché TEL QUEL (la modification reste), une relecture qui n'écrase pas une modification en cours ;
     · « Ouvrir maintenant » : 1 h, jusqu'à minuit de Paris (nuits de changement d'heure comprises), 24 h ;
     · trois états de lecture : 404 (serveur sans les horaires), 503 (illisibles : les agents restent à l'arrêt), échec ; tout ce qui vient du serveur est échappé. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0, fini = false;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? ' — ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), 'obtenu ' + JSON.stringify(a) + ' / attendu ' + JSON.stringify(b));
process.on('exit', () => { if (!fini) { console.log('  ✗ banc interrompu avant la fin (une attente n’a jamais abouti)'); process.exitCode = 1; } });
console.log('── test-3023 : les heures de travail des agents dans la Tour ──');
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
const FNS = ['agIllisible', 'paObj', 'agMode', 'agEnPause', 'hoNb', 'hoParis', 'hoLib', 'hoFin', 'hoPhrase', 'hoLigne', 'agHorsHeures', 'hoCopieJour', 'hoRepartir', 'hoHeure', 'hoVersServeur', 'hoEcrit', 'hoAgentConnu', 'hoCible', 'hoSet', 'hoHerite',
  'hoFeries', 'hoAstreinte', 'hoAgentOuvrir', 'hoAgentPropres', 'hoDuree', 'hoAnnuler', 'hoCorps', 'hoEnvoyer', 'hoEnregistrer', 'hoMinuit', 'hoOuvrir', 'hoFermer', 'hoResume', 'chargerHoraires', 'hoApres', 'hoJourHtml', 'hoVue'];
const FN = FNS.map(fonction);
const VARS = [ligne('var AG_MODES='), ligne('var HO_JOURS='), ligne('var HO_DUREES='), ligne('var INJOIGNABLE='), corps('var HO={') + ';'].join('\n');
vrai('(population) les ' + FNS.length + ' fonctions et les tables sont trouvées', FN.every(f => f.length > 30) && VARS.length > 200, FNS.filter((n, i) => FN[i].length <= 30).join(','));

/* ── le bac : une horloge qu'on règle, un apiGet/apiPost scripté, un DOM minimal ── */
let NOW = Date.UTC(2026, 9, 25, 21, 40);
class Horloge extends Date { static now() { return NOW; } constructor(...a) { if (a.length) super(...a); else super(NOW); } }
const appels = [], rendus = { n: 0, agents: 0 };
const bac = { JSON, Date: Horloge, Intl, String, Array, Math, Object, Number, Promise, Error, console, MYROLE: 'patron', TAB: 'agents', INJOIGNABLE_: 1,
  AG: { sec: 'horaires', agents: ['victor', 'camille', 'max', 'theo', 'lola'].map(id => ({ id, nom: id[0].toUpperCase() + id.slice(1), mode: id === 'lola' ? 'arret' : 'auto' })), pause: null, illisible: false, horaires: null },
  render: () => { rendus.n++; }, chargerAgents: () => { rendus.agents++; }, acSquel: () => '<sq>',
  apiGet: u => { appels.push(['GET', u]); return bac.__get(u); }, apiPost: (u, c) => { appels.push(['POST', u, c]); return new Promise(r => r(bac.__post(u, c))); } };
vm.createContext(bac);
vm.runInContext(ESC + '\n' + VARS + '\n' + FN.join('\n') + '\n' + FNS.concat(['HO', 'esc']).map(n => 'this.' + n + '=' + n + ';').join(''), bac);
const HO = bac.HO, AG = bac.AG;
const J = (o, d, f) => ({ ouvert: !!o, debut: d || '09:00', fin: f || '18:00' });
const jours = () => [J(1), J(1), J(1), J(1), J(1), J(0), J(0)];
const vue = (o) => Object.assign({ ok: true, fuseau: 'Europe/Paris', ts: NOW, illisible: false, entreprise: { jours: jours(), feries: true }, parAgent: { lola: { jours: [null, null, null, null, null, J(1, '09:00', '12:00'), null] } }, astreinte: ['max', 'theo'],
  ouvertJusqua: null, maintenant: { ouvert: false, raison: 'jour_ferme', prochaineOuverture: Date.UTC(2026, 9, 26, 8, 0), prochaineFermeture: null, libelleOuverture: 'lundi 26 octobre à 9 h' },
  agents: { victor: { ouvert: false, agit: false, astreinte: false }, camille: { ouvert: false, agit: false, astreinte: false }, max: { ouvert: false, agit: true, astreinte: true }, theo: { ouvert: false, agit: true, astreinte: true }, lola: { ouvert: false, agit: false, astreinte: false } },
  feriesAVenir: [{ date: '2026-11-01', nom: 'Toussaint' }, { date: '2026-11-11', nom: 'Armistice' }] }, o || {});
const charger = async (v, role) => { bac.MYROLE = role || 'patron'; bac.__get = () => Promise.resolve(v || vue()); HO.lec = 0; HO.d = null; HO.ed = null; HO.sale = false; HO.busy = false; HO.msg = ''; HO.enVol = null; appels.length = 0; await bac.chargerHoraires(); };
const sansBalise = h => { const bal = [...h.matchAll(/<([a-z0-9]+)([^>]*)>/gi)], mal = bal.filter(t => /^(img|script|svg|a|iframe|object|embed|link|form|style)$/i.test(t[1]) || /\s(href|src|action|srcdoc|style)\s*=/i.test(t[2])); return mal.length === 0 ? true : mal.slice(0, 3).map(t => t[0]); };

(async () => {
  console.log('\n1. L’heure de Paris, été comme hiver');
  egal('lundi 26 octobre 2026 à 8 h UTC = 9 h à Paris (hiver)', bac.hoLib(Date.UTC(2026, 9, 26, 8, 0)), 'lundi 26 octobre à 9 h');
  egal('vendredi 23 octobre à 7 h 30 UTC = 9 h 30 (été) — les minutes s’écrivent', bac.hoLib(Date.UTC(2026, 9, 23, 7, 30)), 'vendredi 23 octobre à 9 h 30');
  egal('une valeur qui n’est pas un instant : rien (jamais « NaN »)', [bac.hoLib(null), bac.hoLib('x'), bac.hoLib(NaN), bac.hoFin(undefined)], ['', '', '', '']);
  NOW = Date.UTC(2026, 9, 26, 10, 0);
  egal('une fin le jour même : « 18 h »', bac.hoFin(Date.UTC(2026, 9, 26, 17, 0)), '18 h');
  egal('…sinon la date entière', bac.hoFin(Date.UTC(2026, 9, 27, 8, 0)), 'mardi 27 octobre à 9 h');
  const minuitOk = (now, attendu, t) => { NOW = now; const r = bac.hoMinuit(), p = bac.hoParis(r); vrai(t, r === attendu && p.h === 0 && p.m === 0, [new Date(r).toISOString(), attendu && new Date(attendu).toISOString()]); };
  minuitOk(Date.UTC(2026, 9, 24, 18, 0), Date.UTC(2026, 9, 24, 22, 0), '« jusqu’à minuit » un soir d’été : minuit de Paris = 22 h UTC');
  minuitOk(Date.UTC(2026, 9, 25, 10, 0), Date.UTC(2026, 9, 25, 23, 0), '…le jour où l’heure d’hiver commence (journée de 25 h) : 23 h UTC, pas 22 h');
  minuitOk(Date.UTC(2026, 9, 24, 21, 0), Date.UTC(2026, 9, 24, 22, 0), '…la veille, à 23 h : minuit tombe dans l’heure suivante');
  minuitOk(Date.UTC(2027, 2, 28, 10, 0), Date.UTC(2027, 2, 28, 22, 0), '…le jour où l’heure d’été commence (journée de 23 h) : 22 h UTC');
  minuitOk(Date.UTC(2027, 2, 27, 20, 0), Date.UTC(2027, 2, 27, 23, 0), '…la veille, en hiver : 23 h UTC');
  minuitOk(Date.UTC(2026, 9, 25, 0, 30), Date.UTC(2026, 9, 25, 23, 0), '⛔ …LA NUIT du changement, avant qu’il ait lieu (02 h 30 d’été) : le changement tombe ENTRE maintenant et minuit, 23 h UTC et pas 22 h');
  minuitOk(Date.UTC(2027, 2, 28, 0, 30), Date.UTC(2027, 2, 28, 22, 0), '⛔ …la nuit du changement de printemps (01 h 30 d’hiver) : 22 h UTC et pas 23 h');

  console.log('\n2. La ligne d’état de l’onglet Équipe');
  NOW = Date.UTC(2026, 9, 26, 10, 0);
  const P = h => bac.hoPhrase(h);
  egal('ouverte : « Ouverte jusqu’à 18 h »', P({ actives: true, ouvert: true, raison: 'heures_ouvrees', prochaineFermeture: Date.UTC(2026, 9, 26, 17, 0), enAttente: 0 }), ['ouvert', 'Ouverte jusqu’à 18 h']);
  egal('ouverture forcée : « exceptionnellement jusqu’à … »', P({ actives: true, ouvert: true, raison: 'ouverture_forcee', prochaineFermeture: Date.UTC(2026, 9, 27, 10, 0) }), ['force', 'Ouverte exceptionnellement jusqu’à mardi 27 octobre à 11 h']);
  egal('fermée : « Fermée — reprend lundi 26 octobre à 9 h »', P({ actives: true, ouvert: false, raison: 'jour_ferme', prochaineOuverture: Date.UTC(2026, 9, 26, 8, 0) })[1], 'Fermée — reprend lundi 26 octobre à 9 h');
  egal('…avec ce qui attend l’ouverture', P({ actives: true, ouvert: false, prochaineOuverture: Date.UTC(2026, 9, 26, 8, 0), enAttente: 3 })[1], 'Fermée — reprend lundi 26 octobre à 9 h · 3 en attente d’ouverture');
  egal('fermée sans réouverture connue : le dit', P({ actives: true, ouvert: false, prochaineOuverture: null })[1], 'Fermée — aucune réouverture prévue');
  egal('⛔ registre illisible : « les agents restent à l’arrêt », jamais « ouverte »', P({ actives: true, illisible: true }), ['illisible', 'Horaires illisibles — les agents restent à l’arrêt']);
  egal('un serveur sans horaires (`actives:false`), un résumé absent ou de mauvaise forme : aucune ligne', [P({ actives: false }), P(null), P('x'), P([]), P({ actives: true })], [null, null, null, null, null]);
  AG.horaires = { actives: true, ouvert: false, prochaineOuverture: Date.UTC(2026, 9, 26, 8, 0), enAttente: 0 };
  vrai('la ligne se dessine avec la couleur de son état, et échappe', /^<span class="ag-hor" data-h="ferme">Fermée — reprend lundi 26 octobre à 9 h<\/span>$/.test(bac.hoLigne()), bac.hoLigne());
  AG.horaires = null; egal('sans résumé : rien', bac.hoLigne(), '');

  console.log('\n3. « Hors heures » et « D’astreinte » sur la rangée d’un agent');
  await charger();
  const hh = id => bac.agHorsHeures(AG.agents.filter(a => a.id === id)[0]);
  egal('Victor (auto, fermé) : « Hors heures » ; Max (astreinte, il agit) : « D’astreinte »', [hh('victor'), hh('max'), hh('theo')], ['Hors heures', 'D’astreinte', 'D’astreinte']);
  egal('⛔ un agent À L’ARRÊT n’a rien à dire (le mot « À l’arrêt » suffit)', hh('lola'), '');
  AG.pause = { actif: true }; egal('en pause générale : rien', hh('victor'), ''); AG.pause = null;
  HO.d.agents.victor.ouvert = true; egal('ouvert : rien', hh('victor'), ''); HO.d.agents.victor.ouvert = false;
  HO.lec = -3; egal('relevé des horaires illisible ou pas lu : rien (on ne devine pas)', hh('victor'), ''); HO.lec = 1;
  egal('un identifiant du prototype n’est pas un agent (`constructor`) : rien', bac.agHorsHeures({ id: 'constructor', mode: 'auto' }), '');

  console.log('\n4. La lecture : trois états, rien d’écrasé');
  await charger();
  vrai('lue : copie de travail faite, rien de modifié', HO.lec === 1 && HO.ed && !HO.sale && HO.ed.jours.length === 7 && HO.ed.astreinte.join() === 'max,theo' && HO.ed.parAgent.lola.jours[5].fin === '12:00' && HO.ed.parAgent.lola.jours[0] === null);
  vrai('…et le résumé de la barre suit la vue détaillée (enAttente gardé de la liste)', AG.horaires && AG.horaires.actives === true && AG.horaires.ouvert === false && AG.horaires.prochaineOuverture === Date.UTC(2026, 9, 26, 8, 0));
  bac.hoSet('e', 0, 'fin', '17:00');
  const avant = JSON.stringify(HO.ed); bac.__get = () => Promise.resolve(vue({ astreinte: ['max'] })); await bac.chargerHoraires();
  vrai('⛔ une relecture n’écrase PAS une modification en cours (la page garde la sienne)', JSON.stringify(HO.ed) === avant && HO.sale === true && HO.d.astreinte.join() === 'max', HO.ed.astreinte);
  bac.hoAnnuler(); vrai('« Annuler » reprend ce que le serveur a (astreinte : max)', HO.ed.astreinte.join() === 'max' && HO.sale === false && HO.ed.jours[0].fin === '18:00');
  let lacher; HO.enVol = null; bac.__get = () => new Promise(r => { lacher = () => r(vue()); }); appels.length = 0;
  const l1 = bac.chargerHoraires(), l2 = bac.chargerHoraires(); vrai('⛔ un seul appel de lecture à la fois', appels.length === 1 && l1 === l2 && appels[0][1] === '/api/monitor/agents/horaires', appels); lacher(); await l1;
  const err = async (e, t, v) => { HO.lec = 0; HO.d = null; HO.ed = null; HO.enVol = null; bac.__get = () => Promise.reject(e); await bac.chargerHoraires(); vrai(t, v(), [HO.lec, bac.hoVue()]); };
  await err(Object.assign(new Error('h'), { status: 404 }), '404 (serveur sans les horaires) : « ne connaît pas encore », les agents travaillent comme avant', () => HO.lec === -2 && /ne connaît pas encore/.test(bac.hoVue()));
  await err(Object.assign(new Error('h'), { status: 503, corps: '<b>fichier</b> illisible' }), '⛔ 503 : « illisibles… les agents restent à l’arrêt », la raison du serveur ÉCHAPPÉE', () => HO.lec === -3 && /restent à l’arrêt/.test(bac.hoVue()) && /&lt;b&gt;fichier/.test(bac.hoVue()) && !/<b>fichier/.test(bac.hoVue()));
  await err(new Error('réseau'), 'une coupure : « n’ont pas pu être lues » (on ne sait pas)', () => HO.lec === -1 && /n’ont pas pu être lues/.test(bac.hoVue()));
  bac.__get = () => Promise.resolve({ error: 'x' }); HO.lec = 0; HO.enVol = null; await bac.chargerHoraires(); vrai('une réponse sans `ok:true` ni `entreprise` n’est pas prise pour une vue', HO.lec === -1);
  await charger(); bac.MYROLE = 'inconnu'; appels.length = 0; HO.enVol = null; await bac.chargerHoraires(); vrai('un rôle inconnu ne lit rien', appels.length === 0); bac.MYROLE = 'patron';

  console.log('\n5. Ce que la page envoie');
  await charger();
  bac.hoSet('e', 0, 'fin', '17:30'); bac.hoSet('e', 5, 'ouvert', true); bac.hoSet('e', 5, 'fin', '00:00'); bac.hoFeries('e', false); bac.hoAstreinte('lola', true); bac.hoAstreinte('max', false);
  bac.hoSet('lola', 1, 'ouvert', false);
  bac.hoAgentPropres('camille', true); bac.hoHerite('camille', 2, false); bac.hoSet('camille', 2, 'debut', '10:00'); bac.hoFeries('camille', 'oui');
  const C = bac.hoCorps();
  egal('l’entreprise : sept jours, la fin « 17:30 », le samedi ouvert jusqu’à « 24:00 » (le champ d’heure dit 00:00), fériés ouverts', [C.entreprise.jours[0], C.entreprise.jours[5], C.entreprise.feries], [J(1, '09:00', '17:30'), J(1, '09:00', '24:00'), false]);
  egal('l’astreinte envoyée est la liste choisie', C.astreinte, ['theo', 'lola']);
  egal('un agent : ses jours (`null` = comme l’entreprise), ses fériés seulement s’il en a décidé', [C.parAgent.camille.jours.map(j => j && j.debut), C.parAgent.camille.feries, 'feries' in C.parAgent.lola], [[null, null, '10:00', null, null, null, null], true, false]);
  egal('l’horaire propre de Lola : un jour réglé (mardi fermé), les autres comme l’entreprise ou comme avant', C.parAgent.lola.jours.map(j => j && j.ouvert), [null, false, null, null, null, true, null]);
  vrai('⛔ chaque jour ne porte QUE { ouvert, debut, fin } (le serveur refuse un champ inconnu), `ouvert` est un vrai booléen', C.entreprise.jours.every(j => JSON.stringify(Object.keys(j)) === '["ouvert","debut","fin"]' && typeof j.ouvert === 'boolean'));
  vrai('⛔ rien qui vienne de la LECTURE (ok, maintenant, agents, ts, feriesAVenir…) ne repart', JSON.stringify(Object.keys(C)) === '["entreprise","parAgent","astreinte"]');
  bac.hoAgentPropres('lola', false); egal('retirer les horaires d’un agent : `null` (c’est ce que le serveur attend pour les retirer)', bac.hoCorps().parAgent.lola, null);
  bac.hoHerite('camille', 2, true); bac.hoSet('camille', 99, 'debut', '08:00'); bac.hoSet('constructor', 0, 'debut', '08:00'); bac.hoSet('e', 0, 'zzz', 'x');
  vrai('un jour, un champ ou un agent qui n’existent pas : ignorés (aucune écriture dans la copie)', JSON.stringify(bac.hoCorps()).indexOf('08:00') < 0 && !('zzz' in HO.ed.jours[0]));

  console.log('\n6. Écrire : un seul envoi, le patron seul, un refus affiché tel quel');
  await charger(); bac.hoSet('e', 0, 'debut', '19:00'); rendus.n = 0;
  bac.__post = () => ({ ok: false, status: 400, d: { error: 'entreprise (lundi) : l’ouverture (19:00) doit venir avant la fermeture (18:00)' } });
  const e1 = bac.hoEnregistrer(), e2 = bac.hoEnregistrer(); await e1;
  vrai('⛔ un double toucher n’envoie qu’UNE fois', appels.filter(a => a[0] === 'POST').length === 1 && (await e2) === null && appels[1][1] === '/api/monitor/agents/horaires', appels.map(a => a.slice(0, 2)));
  vrai('⛔ le refus 400 s’affiche TEL QUEL, la modification reste, rien n’est « enregistré »', HO.msg === 'entreprise (lundi) : l’ouverture (19:00) doit venir avant la fermeture (18:00)' && HO.ko === true && HO.sale === true && HO.ed.jours[0].debut === '19:00' && HO.busy === false && /doit venir avant la fermeture/.test(bac.hoVue()));
  bac.hoSet('e', 0, 'debut', '08:30'); appels.length = 0;
  const nouvelle = vue({ entreprise: { jours: jours().map((j, i) => i === 0 ? J(1, '08:30', '18:00') : j), feries: true } });
  bac.__post = () => ({ ok: true, status: 200, d: nouvelle }); await bac.hoEnregistrer();
  vrai('succès : la vue rendue REMPLACE celle de la page, la copie repart d’elle, « Heures enregistrées. », la liste des agents est relue', HO.d === nouvelle && HO.ed.jours[0].debut === '08:30' && HO.sale === false && HO.msg === 'Heures enregistrées.' && HO.ko === false && rendus.agents === 1, [HO.msg, HO.sale, rendus.agents]);
  bac.__post = () => ({ ok: false, status: 403, d: {} }); bac.hoSet('e', 1, 'fin', '17:00'); await bac.hoEnregistrer();
  vrai('un 403 sans texte : « Le serveur a refusé (403) »', HO.msg === 'Le serveur a refusé (403)' && HO.ko);
  await charger(); bac.hoSet('e', 0, 'fin', '17:00'); bac.__post = () => { throw new Error('réseau'); };
  await bac.hoEnregistrer();
  vrai('⛔ une coupure : « Serveur injoignable », la modification reste, le verrou d’envoi est levé', /^Serveur injoignable/.test(HO.msg) && HO.ko && HO.sale && HO.busy === false, [HO.msg, HO.busy]);
  await charger(null, 'collaborateur'); appels.length = 0; bac.hoSet('e', 0, 'fin', '17:00'); bac.hoAstreinte('lola', true); bac.hoFeries('e', false);
  const vc = bac.hoVue();
  vrai('⛔ un collaborateur lit seulement : aucune modification, aucun bouton d’écriture, champs éteints, « Lecture seule »', !HO.sale && !/hoEnregistrer|hoOuvrir|hoFermer|hoAgentPropres/.test(vc) && /Lecture seule/.test(vc) && !/<input type="time"[^>]*>/.test(vc.replace(/<input type="time"[^>]*disabled[^>]*>/g, '')) && (await bac.hoEnregistrer()) === null && (await bac.hoOuvrir()) === null && (await bac.hoFermer()) === null && appels.length === 0, appels);
  await charger(); const vp = bac.hoVue();
  vrai('le patron voit les boutons : Enregistrer (éteint tant que rien ne change), Ouvrir, 1 h / minuit / 24 h', /onclick="hoEnregistrer\(\)" disabled>Enregistrer/.test(vp) && /onclick="hoOuvrir\(\)"/.test(vp) && />1 h<\/button>/.test(vp) && />Jusqu’à minuit<\/button>/.test(vp) && />24 h<\/button>/.test(vp));
  const pas = [...vp.matchAll(/<input type="time"[^>]*aria-label="([^"]+)"[^>]*value="([^"]*)"/g)].map(m => m[1] + '=' + m[2]);
  vrai('sept jours dont cinq ouverts : dix champs d’heure nommés, « fermé » pour samedi et dimanche', pas.length === 10 && /Ouverture du lundi=09:00/.test(pas[0]) && /Fermeture du vendredi=18:00/.test(pas[9]) && (vp.match(/ho-ph">fermé</g) || []).length === 2, pas);

  console.log('\n7. Ouvrir maintenant, remettre aux heures normales');
  await charger(); NOW = Date.UTC(2026, 9, 26, 10, 0); appels.length = 0;
  bac.__post = (u, c) => ({ ok: true, status: 200, d: vue({ ouvertJusqua: c.jusqua, maintenant: { ouvert: true, raison: 'ouverture_forcee', prochaineOuverture: null, prochaineFermeture: c.jusqua } }) });
  await bac.hoOuvrir(); egal('1 h par défaut : POST …/ouvrir avec `jusqua` = maintenant + 1 h', [appels[0][1], appels[0][2]], ['/api/monitor/agents/horaires/ouvrir', { jusqua: NOW + 3600000 }]);
  vrai('…la vue rendue montre « exceptionnellement » dans la barre, et le bouton « Remettre aux heures normales »', AG.horaires.raison === 'ouverture_forcee' && /exceptionnellement/.test(bac.hoPhrase(AG.horaires)[1]) && /onclick="hoFermer\(\)"/.test(bac.hoVue()) && /Remettre aux heures normales/.test(bac.hoVue()) && HO.msg.startsWith('Équipe ouverte jusqu’à'), [HO.msg]);
  bac.hoDuree('24h'); appels.length = 0; await bac.hoOuvrir(); egal('24 h : maintenant + 86 400 000', appels[0][2], { jusqua: NOW + 86400000 });
  bac.hoDuree('minuit'); appels.length = 0; await bac.hoOuvrir(); egal('minuit : le prochain minuit de Paris (22 h UTC l’hiver, ici 23 h UTC)', appels[0][2], { jusqua: Date.UTC(2026, 9, 26, 23, 0) });
  bac.hoDuree('toutes-les-nuits'); egal('une durée inconnue ne change rien', HO.duree, 'minuit');
  bac.__post = () => ({ ok: true, status: 200, d: vue() }); appels.length = 0; await bac.hoFermer();
  egal('« Remettre aux heures normales » : POST …/fermer, corps vide', [appels[0][1], appels[0][2]], ['/api/monitor/agents/horaires/fermer', {}]);
  vrai('…et l’état redevient « Fermée »', /^Fermée/.test(bac.hoPhrase(AG.horaires)[1]));
  bac.__post = () => ({ ok: false, status: 400, d: { error: 'Une ouverture forcée dure une semaine au plus : choisis une fin plus proche' } }); await bac.hoOuvrir();
  vrai('un refus d’ouverture s’affiche tel quel', HO.msg === 'Une ouverture forcée dure une semaine au plus : choisis une fin plus proche' && HO.ko);

  console.log('\n8. Les horaires par agent, les fériés, l’astreinte');
  await charger(); AG.agents[1].nom = '<img src=x onerror=alert(1)>'; bac.hoAgentOuvrir('lola', true);
  const vh = bac.hoVue();
  vrai('un agent avec des horaires propres : « horaires propres » et ses sept jours ; les autres : « hérite de l’entreprise »', /<b>Lola<\/b><span class="ho-ph">horaires propres<\/span>/.test(vh) && (vh.match(/hérite de l’entreprise/g) || []).length === 4 && (vh.match(/comme l’entreprise/g) || []).length >= 6, (vh.match(/hérite de l’entreprise/g) || []).length);
  vrai('⛔ les 5 prochains fériés sont écrits (nom + date) et le serveur est échappé', /Toussaint \(1 nov\.\)/.test(vh) && /Armistice \(11 nov\.\)/.test(vh));
  HO.d.feriesAVenir = [{ date: '2026-11-01', nom: '<script>alert(2)</script>' }, { date: '"><b>', nom: 'x' }, null, 5]; HO.msg = '<img src=x onerror=alert(3)>'; HO.ko = true;
  const vx = bac.hoVue();
  vrai('⛔ un nom d’agent, de férié ou un message hostile : aucune balise de plus, aucun gestionnaire de plus', sansBalise(vx) === true && /&lt;img src=x onerror=alert\(1\)&gt;/.test(vx) && /&lt;script&gt;alert\(2\)&lt;\/script&gt;/.test(vx) && !/onerror=alert/.test(vx.replace(/&lt;[^&]*&gt;/g, '')), sansBalise(vx));
  const gest = [...vx.matchAll(/\son(?:click|change)="([^"]*)"/g)].map(m => m[1]);
  vrai('⛔ les gestionnaires ne portent que des identifiants du registre, des numéros de jour ou des valeurs fixes', gest.length > 40 && gest.every(a => /^(hoSet\('(e|victor|camille|max|theo|lola)',[0-6],'(ouvert|debut|fin)',this\.(checked|value)\)|hoHerite\('[a-z]+',[0-6],(true|false)\)|hoFeries\('(e|[a-z]+)',this\.(checked|value)\)|hoAstreinte\('[a-z]+',this\.checked\)|hoAgentOuvrir\('[a-z]+',(true|false)\)|hoAgentPropres\('[a-z]+',(true|false)\)|hoDuree\('(1h|minuit|24h)'\)|hoOuvrir\(\)|hoFermer\(\)|hoEnregistrer\(\)|hoAnnuler\(\))$/.test(a)), gest.filter(a => !/^(hoSet|hoHerite|hoFeries|hoAstreinte|hoAgentOuvrir|hoAgentPropres|hoDuree|hoOuvrir|hoFermer|hoEnregistrer|hoAnnuler)\(/.test(a)));
  vrai('(code) lecture et écriture par les bonnes routes, relue chaque minute tant que l’écran est ouvert', /apiGet\('\/api\/monitor\/agents\/horaires'\)/.test(CODE) && /apiPost\('\/api\/monitor\/agents\/horaires'\+route,corps\)/.test(CODE) && /hoEnvoyer\('\/ouvrir'/.test(CODE) && /hoEnvoyer\('\/fermer'/.test(CODE) && /setInterval\(function\(\)\{ if\(document\.visibilityState==='visible'&&TAB==='agents'&&\(AG\.sec==='horaires'\|\|AG\.sec==='equipe'\)&&!HO\.busy\) chargerHoraires\(\); \},60000\);/.test(CODE));
  fini = true;
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ banc mort : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); fini = true; process.exit(1); });
