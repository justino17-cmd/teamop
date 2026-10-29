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

const PORTES = ['metierSet', 'metierComboSet', 'metierPlusSet', 'metierPlus2Set', 'metiersAssociesPoser'];
const NOMS = ['metierCle', 'metierRecu', 'metierVerrouille', 'metierVerrouRefus', 'metierServeurAppliquer'].concat(PORTES);

function monde(o) {
  o = o || {};
  const rangement = Object.assign({}, o.rangement || {});
  const toasts = [], saves = [];
  const db = Object.assign({ metier: 'plomberie', metierPlus: '', metierPlus2: '' }, o.db || {});
  const METIERS = { plomberie: { nom: 'Plomberie', ic: '🔧' }, nettoyage: { nom: 'Nettoyage', ic: '🧽' }, climatisation: { nom: 'Climatisation', ic: '❄️' }, chauffage: { nom: 'Chauffage', ic: '🔥' }, '3d': { nom: '3D', ic: '🐀' } };
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
  W.fn.metierServeurAppliquer({ metier: 'plomberie' });
  vrai('la base portait déjà le métier : la marque est quand même posée', W.rangement[CLE] === 'plomberie', W.rangement);
  vrai('… sans écrire la base (aucun save, aucune clé de plus dans db)', W.saves.length === 0 && Object.keys(W.db).sort().join(',') === av, [W.saves.length, Object.keys(W.db)]);
  vrai('… et le verrou est actif', W.fn.metierVerrouille() === true); }
{ const W = monde(); W.fn.metierServeurAppliquer({ metier: 'nettoyage' });
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
  const W = monde(); W.fn.metierServeurAppliquer(j);
  vrai('réponse ' + JSON.stringify(j) + ' : aucune marque, aucun verrou', !(CLE in W.rangement) && W.fn.metierVerrouille() === false, W.rangement);
}
{ const W = monde({ rangement: { [CLE]: 'plomberie' } });
  W.B.scope.localStorage.getItem = () => { throw new Error('rangement refusé'); };
  W.B.scope._metierRecu = undefined;
  vrai('rangement illisible (navigation privée) : la page tourne, pas de verrou fantôme', W.fn.metierVerrouille() === false); }
{ const { N } = lire('app.html');
  const i = N.indexOf('function espaceQuitter('); vrai('espaceQuitter est trouvé', i > 0);
  const corps = N.slice(i, N.indexOf('\nfunction ', i + 10));
  vrai('⛔ espaceQuitter retire la marque du métier de l\'entreprise quittée', /localStorage\.removeItem\(P\+'metier_serveur'\)/.test(corps) && /_metierRecu=undefined/.test(corps)); }

console.log(`\n════ test-3194 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
