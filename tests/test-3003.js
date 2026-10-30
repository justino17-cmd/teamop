/* test-3003 — Chauffage / climatisation : l'ATTESTATION D'ENTRETIEN d'une pompe à chaleur ou d'une climatisation (25 octobre 2026).
   Arrêté du 24 juillet 2020 (systèmes thermodynamiques de 4 à 70 kW), annexes 1 à 3 relues sur aida.ineris.fr. Le VRAI bloc CVC (cvc-monter.js) :
   l'attestation passe par le chemin de celle des chaudières (`cvcAttestationForm`, `…Sauver`, `…Document`, `…Envoyer`) avec `genre:'thermo'` ; les points
   contrôlés sont ceux de l'annexe 1 pour le TYPE de l'appareil ; le PDF porte ce que l'annexe 3 exige ; un chauffe-eau thermodynamique (exclu de
   l'arrêté) n'en reçoit pas ; une chaudière garde son attestation (test-2896) et le certificat de ramonage reste réservé à la combustion. */
const vm = require('vm');
const { monter, formulaire, cdc, lirePdf } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const BASE = { clients: [{ id: 'c1', nom: 'Maison Martin', email: 'martin@exemple.test', adresse: '3 rue des Lilas' }],
  appareils: [{ id: 'a1', clientId: 'c1', type: 'pac_eau', marque: 'Atlantic', modele: 'Alféa', serie: 'SN-77', puissance: 11, fluide: 'R32', charge: 1.8, miseEnService: '2022-05-10', emplacement: 'Garage' },
    { id: 'a2', clientId: 'c1', type: 'clim_gainable', marque: 'Daikin', puissance: 9 },
    { id: 'a3', clientId: 'c1', type: 'cet', marque: 'Thermor' },
    { id: 'a4', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval' }],
  interventions: [{ id: 'i0', clientId: 'c1', statut: 'terminee', date: '2024-10-02', appareilIds: ['a1'], attestations: { a1: { genre: 'thermo', points: ['x'], etabliLe: '2024-10-02' } } },
    { id: 'i1', clientId: 'c1', statut: 'terminee', date: '2026-10-22', appareilIds: ['a1', 'a2', 'a3', 'a4'] },
    { id: 'i2', clientId: 'c1', statut: 'planifiee', date: '2026-10-30', appareilIds: ['a1'] }], contrats: [] };
(async () => {
  const W0 = monter({ db: cdc(BASE) });
  const P = W0.cvcThermoPoints(W0.db.appareils[0]), G = W0.cvcThermoPoints(W0.db.appareils[1]);
  vrai('(population) le référentiel de l’annexe 1 est là (19 points)', vm.runInContext('CVC_THERMO_POINTS.length', W0) === 19);
  vrai('une PAC air/eau : points communs, boucle d’eau et pilotage — pas les gaines', P.some(p => /embouage/.test(p.l)) && P.some(p => /vases d’expansion/.test(p.l)) && !P.some(p => /gaines/.test(p.l)) && P.some(p => /inversion de cycle/.test(p.l)));
  vrai('une clim gainable : unités et filtre, gaines et ventilateur — pas la boucle d’eau', G.some(p => /gaines accessibles/.test(p.l)) && G.some(p => /ventilateur/.test(p.l)) && !G.some(p => /embouage/.test(p.l)));
  vrai('⛔ un chauffe-eau thermodynamique (exclu de l’arrêté) n’a pas d’attestation', !W0.cvcEntretienAttestable(W0.db.appareils[2]) && W0.cvcEntretienAttestable(W0.db.appareils[0]) && W0.cvcEntretienAttestable(W0.db.appareils[3]));
  vrai('⛔ le certificat de ramonage reste à la combustion (une PAC n’en a pas)', !W0.cvcAttestable(W0.db.appareils[0]) && W0.cvcAttestable(W0.db.appareils[3]));
  vrai('la date du dernier entretien connu : la visite précédente qui porte son attestation', W0.cvcDerniereAttestationThermo(W0.db.interventions[1], 'a1') === '2024-10-02' && W0.cvcDerniereAttestationThermo(W0.db.interventions[1], 'a2') === '');

  const coches = n => Object.fromEntries(P.slice(0, n).map(p => ['pt' + p.n, true]));
  const FORM = o => formulaire(Object.assign({ genre: 'thermo', tInt: '21,5', tExt: '7', uStat: '231', uDyn: '228', pEntree: '9.1', pSortie: '26', voyant: 'Correct', instrument: 'Testo 557s',
    energie: 'Électricité', defauts: 'Filtre encrassé', actions: 'Filtre nettoyé', conseils: 'Faire désembouer le réseau' }, coches(5), o || {}));
  const mk = f => { const W = monter({ db: cdc(BASE) }); W.__form = f; vm.runInContext("document.getElementById=function(id){ return id==='cvc-att'?__form:null; }", W); return W; };
  { const W = mk(FORM());
    vrai('enregistrer : genre « thermo », les points cochés (libellés fermés), les mesures avec le point, la date du dernier entretien', W.cvcAttestationSauver('i1', 'a1') === true
      && (a => a.genre === 'thermo' && a.points.length === 5 && a.points[0] === P[0].l && a.tInt === '21.5' && a.pEntree === '9.1' && a.voyant === 'Correct' && a.dernier === '2024-10-02' && a.etabliPar === 'Test Admin')(W.db.interventions[1].attestations.a1));
    const d = await W.cvcAttestationDocument('i1', 'a1'); const L = lirePdf(d.pdf || ''); const t = (L.textes || []).map(x => x.u).join(' | ');
    vrai('le PDF est bien formé', !d.err && L.pb.length === 0 && L.pages >= 1, JSON.stringify(L.pb));
    vrai('   annexe 3 : le commanditaire et l’adresse, le système (marque, modèle, énergie, puissance, mise en service, n° de série), le local', /Maison Martin/.test(t) && /3 rue des Lilas/.test(t) && /Atlantic Alféa/.test(t) && /Électricité/.test(t) && /11 kW/.test(t) && /10 mai 2022/.test(t) && /SN-77/.test(t) && /Garage/.test(t), t.slice(0, 600));
    vrai('   la date du dernier entretien, et celle de la visite', /Dernier entretien/.test(t) && /2 octobre 2024/.test(t) && /22 octobre 2026/.test(t));
    vrai('   les points contrôlés, sous le titre de l’annexe 1', /Points contrôlés \(arrêté du 24 juillet 2020, annexe 1\)/.test(t) && t.includes(P[1].l.slice(0, 40)));
    vrai('   les mesures (températures, tensions, pressions du compresseur), le voyant et les appareils de mesure', /21,5 °C/.test(t) && /231 V/.test(t) && /9,1 bar/.test(t) && /Voyant de fluide/.test(t) && /Testo 557s/.test(t));
    vrai('   les défauts constatés, les actions menées et les conseils', /Filtre encrassé/.test(t) && /Filtre nettoyé/.test(t) && /désembouer/.test(t));
    vrai('   le pied cite l’arrêté et dit que ce n’est pas un formulaire officiel', /24 juillet 2020/.test(t) && /pas un formulaire officiel/.test(t));
    vrai('   rien des chaudières : ni CO, ni « Analyseur »', !/CO ambiant|Déclaration sur le CO|Analyseur/.test(t));
    await W.cvcAttestationEnvoyer('i1', 'a1');
    vrai('envoyer : le courriel part au client avec le PDF, et la trace s’écrit', W.__mails.length === 1 && W.__mails[0].to === 'martin@exemple.test' && !!W.db.interventions[1].attestations.a1.envoyeeLe);
  }
  { const W = mk(FORM(Object.fromEntries(P.map(p => ['pt' + p.n, false]))));
    vrai('⛔ sans aucun point contrôlé : rien n’est enregistré, et l’écran le dit', W.cvcAttestationSauver('i1', 'a1') === false && !(W.db.interventions[1].attestations || {}).a1 && W.__toasts.some(x => /au moins un point contrôlé/.test(x))); }
  { const W = mk(FORM({ voyant: 'Peut-être' }));
    W.cvcAttestationSauver('i1', 'a1');
    vrai('   un voyant hors liste n’est pas rangé', W.db.interventions[1].attestations.a1.voyant === undefined); }
  { const W = mk(FORM()); W.cvcAttestationSauver('i2', 'a1');
    vrai('⛔ une intervention qui n’est pas terminée : pas d’attestation', !(W.db.interventions[2].attestations || {}).a1); }
  { const W = mk(FORM()); W.cvcAttestationSauver('i1', 'a3');
    vrai('⛔ le chauffe-eau thermodynamique : refusé, même par la fonction qui écrit', !(W.db.interventions[1].attestations || {}).a3); }
  { const W = mk(formulaire({ genre: 'thermo', pt0: true })); W.cvcAttestationSauver('i1', 'a4');
    vrai('⛔ un formulaire « thermo » ne peut pas écrire sur une chaudière', !(W.db.interventions[1].attestations || {}).a4); }
  { const W = monter({ db: cdc(BASE) }); const h = W.cvcIntActions(W.db.interventions[1], W.db.appareils);
    vrai('les boutons : attestation pour la PAC, la clim et la chaudière ; pas pour le chauffe-eau ; ramonage pour la chaudière seule',
      ['a1', 'a2', 'a4'].every(id => h.includes("cvcAttestationForm('i1','" + id + "')")) && !h.includes("cvcAttestationForm('i1','a3')") && h.includes("cvcRamonageForm('i1','a4')") && !h.includes("cvcRamonageForm('i1','a1')"));
    W.cvcAttestationForm('i1', 'a1'); const f = W.__modals[W.__modals.length - 1] || '';
    vrai('le formulaire d’une PAC : ses points (annexe 1), ses mesures, et la phrase « celui de votre entreprise »', /name="genre" value="thermo"/.test(f) && /embouage/.test(f) && /Pression à l’entrée du compresseur/.test(f) && /celui de votre entreprise/.test(f) && /dernier entretien connu/.test(f)); }
  /* ⛔ une fonction déclarée deux fois : la seconde gagne PARTOUT, en silence (CLAUDE.md) — pris le jour même : un second `cvcDernierEntretien(i,aid)` remplaçait
     celui des échéances d'entretien, et faisait tomber test-2895 et test-2898 */
  { const APP = require('fs').readFileSync(require('path').join(__dirname, '..', 'app.html'), 'utf8');
    const noms = [...APP.matchAll(/^\s*(?:async\s+)?function\s+(cvc\w+)\s*\(/gm)].map(m => m[1]);
    const doubles = [...new Set(noms.filter((n, k) => noms.indexOf(n) !== k))];
    vrai('(population) les fonctions du chauffage et de la climatisation sont recensées : ' + noms.length, noms.length > 60);
    vrai('⛔ aucune fonction cvc… n’est déclarée deux fois', !doubles.length, doubles.join(', ')); }
  console.log(`\ntest-3003 : ${ok} ✓ ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
