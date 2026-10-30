/* ══ test-3194 · LE MÉTIER CHOISI SUR LE SITE SE VERROUILLE DANS L'APPLICATION ═══════════════════════════════════════════════════════════════════════
   Justin, 29 octobre 2026 : « j'ai pas envie que les clients sélectionnent leur métier. Je veux qu'ils sélectionnent du site et ça bloque directement
   sur OP Gestion ». Le site range le choix, `/api/espaces/etat` le rend (`metier`), `metierServeurAppliquer` le pose. Ce banc EXÉCUTE les vraies
   fonctions d'app.html (extraites par `bac`) :
   1. un métier REÇU du serveur se retient sur l'appareil (clé d'appareil, jamais dans `db`), même quand la base le portait déjà ;
   2. ⛔ les CINQ portes qui changent le métier refusent alors, et ne touchent ni `db` ni `save()` ;
   3. sans métier reçu (serveur d'avant, entreprise sans choix), rien n'est verrouillé : l'administrateur règle comme avant ;
   4. ⛔ la bêta et l'équipe TEAM OP ne sont JAMAIS verrouillées (elles choisissent un métier pour le juger) ;
   5. une réponse illisible ne pose aucun verrou ; quitter un espace emporte la marque (texte d'`espaceQuitter`, lu sans commentaires). */
'use strict';
const { bac, lire } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };

const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);
const PORTES = ['metierSet', 'metierComboSet', 'metierPlusSet', 'metierPlus2Set', 'metiersAssociesPoser'];
const NOMS = ['metiersDuServeur', 'metiersReponseMulti', 'metiersRecus', 'metiersPlusDe', 'metierCle', 'metierRecu', 'metierVerrouille', 'metierVerrouRefus', 'metierServeurRetenir', 'metierServeurAppliquer'].concat(PORTES);

function monde(o) {
  o = o || {};
  const rangement = Object.assign({}, o.rangement || {});
  const toasts = [], saves = [];
  const db = Object.assign({ metier: 'plomberie', metierPlus: '', metierPlus2: '' }, o.db || {});
  const METIERS = { plomberie: { nom: 'Plomberie', ic: '🔧' }, nettoyage: { nom: 'Nettoyage', ic: '🧽' }, climatisation: { nom: 'Climatisation', ic: '❄️' }, chauffage: { nom: 'Chauffage', ic: '🔥' }, '3d': { nom: '3D', ic: '🐀' }, electricite: { nom: 'Électricité', ic: '⚡' } };
  const init = {
    STORE_KEY: 'elan_db', BETA_ESSAI: !!o.beta, _metierRecu: undefined, db, METIERS,
    currentUser: { role: o.role || 'admin' }, current: '',
    equipeTeamOP: () => !!o.teamop,
    localStorage: { getItem: k => (k in rangement ? rangement[k] : null), setItem: (k, v) => { rangement[k] = String(v); }, removeItem: k => { delete rangement[k]; } },
    toast: t => toasts.push(t), toastAnnuler: t => toasts.push(t), save: () => saves.push(1), logEvent: () => {}, renderNav: () => {},
    views: { parametres: () => {} }, metierId: () => db.metier, metierResidu: () => null, metierResiduRetirer: () => {},
    metierComboDe: k => (k === 'cvc' ? { k: 'cvc', nom: 'CVC', liste: ['chauffage', 'climatisation'] } : null), metierComboCourant: () => '',
    confirm: () => true,
  };
  const B = bac('app.html', NOMS, init);
  return { B, fn: B.fn, db, rangement, toasts, saves };
}
const CLE = 'elan_metier_serveur';
const etat = (W) => JSON.stringify([W.db.metier, W.db.metierPlus, W.db.metierPlus2]);

console.log('── 1. un métier reçu se retient sur l\'appareil, jamais dans db ──');
{ const W = monde(); const av = Object.keys(W.db).sort().join(',');
  W.fn.metierServeurAppliquer({ metier: 'plomberie' }); W.fn.metierServeurRetenir({ metier: 'plomberie' });
  vrai('la base portait déjà le métier : la marque est quand même posée', W.rangement[CLE] === 'plomberie', W.rangement);
  vrai('… sans écrire la base (aucun save, aucune clé de plus dans db)', W.saves.length === 0 && Object.keys(W.db).sort().join(',') === av, [W.saves.length, Object.keys(W.db)]);
  vrai('… et le verrou est actif', W.fn.metierVerrouille() === true); }
{ const W = monde(); W.fn.metierServeurAppliquer({ metier: 'nettoyage' }); W.fn.metierServeurRetenir({ metier: 'nettoyage' });
  vrai('un métier différent : posé dans la base ET retenu', W.db.metier === 'nettoyage' && W.rangement[CLE] === 'nettoyage' && W.saves.length === 1, [W.db.metier, W.rangement[CLE]]); }

console.log('── 2. ⛔ les cinq portes refusent une fois verrouillé ──');
for (const [porte, arg] of [['metierSet', ['nettoyage']], ['metierSet', ['combo:cvc']], ['metierComboSet', ['cvc']], ['metierPlusSet', ['climatisation']], ['metierPlus2Set', ['chauffage']], ['metiersAssociesPoser', ['climatisation', 'chauffage']]]) {
  const W = monde({ rangement: { [CLE]: 'plomberie' }, db: porte === 'metierPlus2Set' ? { metierPlus: 'climatisation' } : {} });
  const av = etat(W);
  W.fn[porte].apply(null, arg);
  vrai(porte + '(' + arg.join(', ') + ') : rien ne change, rien ne s\'enregistre', etat(W) === av && W.saves.length === 0, [etat(W), W.saves.length]);
  vrai('… et l\'écran DIT pourquoi (support@teamop.fr)', W.toasts.some(t => /choisi sur le site/.test(t) && /support@teamop\.fr/.test(t)), W.toasts);
}

console.log('── 3. sans métier reçu, rien n\'est verrouillé ──');
{ const W = monde(); vrai('aucune marque : pas de verrou', W.fn.metierVerrouille() === false);
  W.fn.metierSet('nettoyage'); vrai('… l\'administrateur change le métier comme avant', W.db.metier === 'nettoyage' && W.saves.length === 1, etat(W));
  W.fn.metierPlusSet('climatisation'); vrai('… et règle « fait aussi »', W.db.metierPlus === 'climatisation', etat(W)); }
{ const W = monde({ role: 'technicien' }); W.fn.metierSet('nettoyage'); vrai('un technicien, lui, ne change toujours rien', W.db.metier === 'plomberie'); }

console.log('── 4. ⛔ la bêta et l\'équipe TEAM OP ne sont jamais verrouillées ──');
for (const [nom, o] of [['bêta', { beta: true }], ['équipe TEAM OP', { teamop: true }]]) {
  const W = monde(Object.assign({ rangement: { [CLE]: 'plomberie' } }, o));
  vrai(nom + ' : marque présente, pas de verrou', W.fn.metierVerrouille() === false);
  W.fn.metierSet('nettoyage'); vrai(nom + ' : le métier se change pour le juger', W.db.metier === 'nettoyage', etat(W));
}

console.log('── 5. une réponse illisible ne pose rien ; quitter emporte la marque ──');
for (const j of [null, {}, { metier: '' }, { metier: 42 }, { metier: 'inconnu' }, { metier: '__proto__' }]) {
  const W = monde(); W.fn.metierServeurRetenir(j);
  vrai('réponse ' + JSON.stringify(j) + ' : aucune marque, aucun verrou', !(CLE in W.rangement) && W.fn.metierVerrouille() === false, W.rangement);
}
{ const W = monde({ rangement: { [CLE]: 'plomberie' } });
  W.B.scope.localStorage.getItem = () => { throw new Error('rangement refusé'); };
  W.B.scope._metierRecu = undefined;
  vrai('rangement illisible (navigation privée) : la page tourne, pas de verrou fantôme', W.fn.metierVerrouille() === false); }
{ const W = monde(); W.fn.metierServeurAppliquer({ metier: 'nettoyage' });
  vrai('⛔ metierServeurAppliquer SEUL (démonstration, bêta) ne verrouille rien', !(CLE in W.rangement) && W.fn.metierVerrouille() === false, W.rangement); }
{ const { N } = lire('app.html');
  const k = N.indexOf('try{ metierServeurAppliquer(j); }catch(e){}');
  vrai('⛔ la réponse du serveur (forfaitServeurSync) retient le métier juste après l\'avoir appliqué', k > 0 && /^\s*try\{ metierServeurRetenir\(j\); \}catch\(e\)\{\}/.test(N.slice(k + 43, k + 120)), N.slice(k, k + 140));
  const i = N.indexOf('function espaceQuitter('); vrai('espaceQuitter est trouvé', i > 0);
  const corps = N.slice(i, N.indexOf('\nfunction ', i + 10));
  vrai('⛔ espaceQuitter retire la marque du métier de l\'entreprise quittée', /localStorage\.removeItem\(P\+'metier_serveur'\)/.test(corps) && /_metierRecu=undefined/.test(corps)); }


console.log('── 6. v782 — plusieurs métiers choisis sur le site : la correspondance (fonction pure) ──');
{
  const W = monde(); const M = (j) => W.fn.metiersDuServeur(j);
  vrai('(population) la fonction est bien celle d\'app.html et rend une liste', Array.isArray(M({ metier: 'plomberie' })), M({ metier: 'plomberie' }));
  egal('métier seul : comme avant', M({ metier: 'plomberie' }), ['plomberie']);
  egal('principal + deux autres, dans l\'ordre du site', M({ metier: 'plomberie', metiers: ['plomberie', 'electricite', 'nettoyage'] }), ['plomberie', 'electricite', 'nettoyage']);
  egal('la carte du site « Chauffage / Climatisation » (clé chauffage), variante « deux » : chauffage + climatisation', M({ metier: 'chauffage', variante: 'deux' }), ['chauffage', 'climatisation']);
  egal('… variante « chauffage » ou absente : le chauffage seul', [M({ metier: 'chauffage', variante: 'chauffage' }), M({ metier: 'chauffage' })], [['chauffage'], ['chauffage']]);
  egal('… variante « climatisation » : la climatisation SEULE (pas de chauffage)', M({ metier: 'chauffage', variante: 'climatisation' }), ['climatisation']);
  egal('plomberie + chauffage/clim « climatisation seulement »', M({ metier: 'plomberie', metiers: ['plomberie', 'chauffage'], variante: 'climatisation' }), ['plomberie', 'climatisation']);
  egal('plomberie + chauffage/clim « les deux » : trois métiers', M({ metier: 'plomberie', metiers: ['plomberie', 'chauffage'], variante: 'deux' }), ['plomberie', 'chauffage', 'climatisation']);
  egal('⛔ « les deux » + deux autres métiers : COUPÉ à trois, le dernier choisi tombe (le principal et le « les deux » restent)', M({ metier: 'chauffage', metiers: ['chauffage', 'plomberie', 'nettoyage'], variante: 'deux' }), ['chauffage', 'climatisation', 'plomberie']);
  egal('… et en troisième position, « les deux » est coupé APRÈS le chauffage (jamais avant)', M({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage', 'chauffage'], variante: 'deux' }), ['plomberie', 'nettoyage', 'chauffage']);
  egal('quatre métiers reçus : trois au plus', M({ metier: 'plomberie', metiers: ['plomberie', 'electricite', 'nettoyage', 'chauffage'] }), ['plomberie', 'electricite', 'nettoyage']);
  egal('une clé inconnue, un doublon, un type faux sont ignorés', M({ metier: 'plomberie', metiers: ['plomberie', 'zzz', 42, null, 'plomberie', '__proto__', 'constructor', 'nettoyage'] }), ['plomberie', 'nettoyage']);
  egal('⛔ la 3D n\'est jamais « en plus »', M({ metier: 'plomberie', metiers: ['plomberie', '3d', 'nettoyage'] }), ['plomberie', 'nettoyage']);
  egal('… et principale, elle est seule (l\'application ne combine rien avec la 3D)', M({ metier: '3d', metiers: ['3d', 'plomberie'] }), ['3d']);
  egal('le nom d\'un pack combiné (cvc) se déplie par sa liste', M({ metier: 'cvc' }), ['chauffage', 'climatisation']);
  egal('metiers sans metier : le premier est le principal', M({ metiers: ['nettoyage', 'plomberie'] }), ['nettoyage', 'plomberie']);
  egal('une variante hors liste ne dit rien', M({ metier: 'chauffage', variante: '<script>' }), ['chauffage']);
  egal('⛔ rien d\'utilisable : liste vide (l\'appelant ne touche à rien)', [null, undefined, 'x', {}, { metier: 'zzz' }, { metiers: 'plomberie' }, { metier: 42 }].map(M), [[], [], [], [], [], [], []]);
}

console.log('── 7. v782 — metierServeurAppliquer / Retenir posent aussi metierPlus et metierPlus2 ──');
{
  let W = monde({ db: { metier: 'plomberie' } });
  vrai('plomberie + électricité + nettoyage : posés, UN save, une ligne de journal', W.fn.metierServeurAppliquer({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage', '3d', 'chauffage'] }) === true && etat(W) === JSON.stringify(['plomberie', 'nettoyage', 'chauffage']) && W.saves.length === 1, [etat(W), W.saves.length]);
  W.fn.metierServeurAppliquer({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage', 'chauffage'] });
  vrai('⛔ rien ne change : pas de save de plus (ouvrir l\'application n\'écrit pas)', W.saves.length === 1, W.saves.length);
  W = monde({ db: { metier: 'plomberie' } });
  W.fn.metierServeurAppliquer({ metier: 'chauffage', variante: 'deux' });
  vrai('chauffage « deux » : chauffage + climatisation', etat(W) === JSON.stringify(['chauffage', 'climatisation', '']), etat(W));
  W.fn.metierServeurAppliquer({ metier: 'chauffage', variante: 'climatisation' });
  vrai('… puis « climatisation seulement » : la climatisation, le chauffage associé est RETIRÉ', etat(W) === JSON.stringify(['climatisation', '', '']), etat(W));
  W.fn.metierServeurAppliquer({ metier: 'chauffage', variante: 'chauffage' });
  vrai('… puis « chauffage seulement »', etat(W) === JSON.stringify(['chauffage', '', '']), etat(W));
  W = monde({ db: { metier: 'plomberie', metierPlus: 'nettoyage', metierPlus2: 'chauffage' } });
  W.fn.metierServeurAppliquer({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage'] });
  vrai('le serveur ne donne plus que deux métiers : le troisième est retiré', etat(W) === JSON.stringify(['plomberie', 'nettoyage', '']), etat(W));
  console.log('   (une réponse SANS metiers ni variante : exactement comme avant)');
  W = monde({ db: { metier: 'plomberie', metierPlus: 'nettoyage', metierPlus2: 'chauffage' } });
  vrai('même métier principal, pas de metiers : rien ne bouge, associés intacts, aucun save', W.fn.metierServeurAppliquer({ metier: 'plomberie' }) === false && etat(W) === JSON.stringify(['plomberie', 'nettoyage', 'chauffage']) && W.saves.length === 0, etat(W));
  W.fn.metierServeurAppliquer({ metier: 'climatisation' });
  vrai('un autre principal, pas de metiers : le principal change, les associés d\'avant sont gardés (sauf doublon)', etat(W) === JSON.stringify(['climatisation', 'nettoyage', 'chauffage']), etat(W));
  W = monde({ db: { metier: 'plomberie', metierPlus: 'nettoyage' } });
  vrai('une variante qui ne concerne pas le chauffage (plomberie + « deux ») : traitée comme avant, rien ne bouge', W.fn.metierServeurAppliquer({ metier: 'plomberie', variante: 'deux' }) === false && etat(W) === JSON.stringify(['plomberie', 'nettoyage', '']), etat(W));
  for (const j of [{ metiers: [] }, { metiers: ['zzz'] }, { metier: 'plomberie', metiers: 'nettoyage' }]) {
    W = monde(); const av = etat(W); W.fn.metierServeurAppliquer(j);
    vrai('réponse inutilisable ' + JSON.stringify(j) + ' : rien ne change', etat(W) === av && W.saves.length === 0, etat(W));
  }

  console.log('── 8. v782 — le verrou retient la liste et couvre les trois ──');
  W = monde(); W.fn.metierServeurAppliquer({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage', 'chauffage'] }); W.fn.metierServeurRetenir({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage', 'chauffage'] });
  vrai('la marque porte les trois, le principal en tête', W.rangement[CLE] === 'plomberie,nettoyage,chauffage' && JSON.stringify(W.fn.metiersRecus()) === '["plomberie","nettoyage","chauffage"]' && W.fn.metierVerrouille() === true, W.rangement);
  const av = etat(W), sv = W.saves.length;
  W.fn.metierPlus2Set('climatisation'); W.fn.metierPlusSet(''); W.fn.metiersAssociesPoser('', ''); W.fn.metierSet('nettoyage');
  vrai('⛔ le verrou couvre le principal ET les deux associés : rien ne change, rien ne s\'enregistre', etat(W) === av && W.saves.length === sv, [etat(W), W.saves.length]);
  W = monde({ rangement: { [CLE]: 'plomberie,nettoyage' } });
  vrai('relue au démarrage (autre page) : principal et liste', W.fn.metierRecu() === 'plomberie' && JSON.stringify(W.fn.metiersRecus()) === '["plomberie","nettoyage"]' && W.fn.metierVerrouille() === true);
  for (const marque of ['plomberie,zzz,nettoyage', ',plomberie', 'zzz,plomberie', 'plomberie,plomberie']) {
    W = monde({ rangement: { [CLE]: marque } });
    vrai('marque abîmée « ' + marque + ' » : jamais un verrou sur un métier inconnu', W.fn.metiersRecus().every(k => ['plomberie', 'nettoyage'].includes(k)) && (marque[0] === 'z' || marque[0] === ',' ? W.fn.metierRecu() === '' : W.fn.metierRecu() === 'plomberie'), [W.fn.metierRecu(), W.fn.metiersRecus()]);
  }
  W = monde(); W.fn.metierServeurRetenir({ metier: 'chauffage', variante: 'deux' });
  vrai('chauffage « deux » : la marque dit les deux métiers de l\'application', W.rangement[CLE] === 'chauffage,climatisation', W.rangement);
  W = monde(); W.fn.metierServeurRetenir({ metier: 'plomberie' });
  vrai('⛔ un seul métier : la marque d\'avant, un seul mot', W.rangement[CLE] === 'plomberie' && JSON.stringify(W.fn.metiersRecus()) === '["plomberie"]', W.rangement);
  W = monde(); W.fn.metierServeurRetenir({ metiers: ['zzz'], variante: '<x>' });
  vrai('réponse inutilisable : aucune marque', !(CLE in W.rangement) && W.fn.metierVerrouille() === false, W.rangement);
  W = monde({ beta: true }); W.fn.metierServeurAppliquer({ metier: 'plomberie', metiers: ['plomberie', 'nettoyage'] });
  vrai('la bêta pose les associés sans rien verrouiller', etat(W) === JSON.stringify(['plomberie', 'nettoyage', '']) && W.fn.metierVerrouille() === false);
  { const { N } = lire('app.html');
    const k = N.indexOf('try{ metierServeurAppliquer(j); }catch(e){}');
    vrai('(câblage) forfaitServeurSync passe la RÉPONSE ENTIÈRE (j), pas seulement j.metier', k > 0 && !/metierServeur(Appliquer|Retenir)\(j\.metier\)/.test(N)); }
}

console.log(`\n════ test-3194 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
