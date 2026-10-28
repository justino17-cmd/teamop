/* ══ test-3131 · LES MÉTIERS COMBINÉS (OP GESTION v779) — PLOMBERIE + CLIM, SANS SURFACTURATION, ET LA 3D D'ELAN NE CHANGE EN RIEN ═════════
   Justin, 28 octobre 2026, 21 h 50 : « plomberie, chauffage/clim : que je puisse choisir les deux en même temps et que ça les combine […]
   sans que ça fasse une surfacturation ; généralement, ceux qui font de la plomberie ne font pas que de la plomberie ». Une entreprise
   plomberie + clim voit OP GESTION le lendemain.

   Ce banc EXÉCUTE les vraies fonctions d'app.html (extraites du fichier livré, jamais une phrase) : la combinaison des packs, le setter,
   la liste effective, la fusion de deux appareils (le vrai `fusionnerBases`), `metierServeurAppliquer` quand la Tour change le principal,
   le planning de démonstration, la carte « Mon métier ». Cinq garanties, et chacune a sa mutation (scratchpad/mutations-multi-metiers.py) :
   · UN SEUL MÉTIER ≡ L'ANCIEN PACK, EN PROFONDEUR (le même objet) — c'est la preuve qu'ELAN, en 3D, ne change en rien ;
   · RIEN DE CHAQUE PACK NE SE PERD, RIEN NE SE CONFOND : union sans doublon, principal d'abord ; le masque est une INTERSECTION ; deux
     relevés de même clé mais de mesure différente (`volume` : pompé ou coulé) restent DEUX champs ;
   · LE PRIX N'EN DÉPEND PAS : aucun code de facturation, côté application comme côté serveur, ne lit `metiersAssocies` ;
   · RIEN ne s'écrit au chargement ; la clé ne naît que d'un geste de l'administrateur, et elle se FUSIONNE (deux appareils : les deux
     ajouts survivent ; ajout contre retrait : le plus récent gagne) ;
   · la Tour garde la main sur le PRINCIPAL : un associé devenu principal sort de la liste SANS écriture.
   Population comptée avant chaque absence : une assertion sur un ensemble vide passe et ne prouve rien. */
'use strict';
const fs = require('fs'), path = require('path');
const { lire, litteral, evalue, fonction, bac } = require('./metiers-outils.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 400) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

const { SRC, N } = lire('app.html');
const METIERS = evalue(litteral(N, 'const METIERS={'));
const INT_TYPES = evalue(litteral(N, 'const INT_TYPES = ['));
const CAT_LIST = evalue(litteral(N, 'const CAT_LIST=['));
const METIERS_ORDRE = evalue(litteral(N, 'const METIERS_ORDRE=['));
const CATALOGUE = evalue(litteral(N, 'const CATALOGUE=['));
const FOURNISSEURS_3D = evalue(litteral(N, 'const FOURNISSEURS_3D=['));
const CATALOGUE_NETT = evalue(litteral(N, 'const CATALOGUE_NETT=['));
const FOURNISSEURS_NETT = evalue(litteral(N, 'const FOURNISSEURS_NETT=['));
METIERS['3d'].catalogue = CATALOGUE; METIERS['3d'].fournisseurs = FOURNISSEURS_3D;
METIERS['nettoyage'].catalogue = CATALOGUE_NETT; METIERS['nettoyage'].fournisseurs = FOURNISSEURS_NETT;
const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const CVC_METIERS = evalue(litteral(N, 'const CVC_METIERS=[')), NETT_METIERS = evalue(litteral(N, 'const NETT_METIERS=['));
const IDS = Object.keys(METIERS);
const copie = o => JSON.parse(JSON.stringify(o));

/* Les vraies fonctions de la combinaison, dans un espace où l'on maîtrise l'état (db, utilisateur courant) et où l'on note ce qui s'écrit. */
function monde(db0, user) {
  const sortie = { saves: 0, toasts: [], journal: [], navs: 0, annuler: [], parametres: 0 };
  const init = { METIERS, METIERS_ORDRE, INT_TYPES, CAT_LIST, norm, CVC_METIERS, NETT_METIERS, METIERS_ASSOC_MAX: 4, _packsCombines: new Map(),
    db: db0, currentUser: user === undefined ? { id: 'u1', role: 'admin' } : user, current: 'parametres', BETA_ESSAI: false,
    DEMO_CLIENTS_3D: [['Boulangerie', 'a', 'La Rochelle', 1, 1, 'pro']], DEMO_PLAN_3D: [[0, '08:00', 60, 'Dératisation — passage 2/3', 'Dératisation', 0, 0, ''], [0, '09:00', 60, 'Nid de frelons', 'Désinsectisation guêpes / frelons', 1, 0, ''], [1, '10:00', 60, 'Contrôle', 'Contrat anti nuisibles (HACCP)', 2, 0, '']],
    DEMO_NETT: { clients: [['Bureaux A', 'a', 'La Rochelle', 1, 1, 'pro']], planning: [[0, '08:00', 60, 'Nettoyage de bureaux', 'Nettoyage régulier', 0, 0, ''], [0, '09:00', 60, 'Décapage des sols', 'Décapage & protection des sols', 1, 0, ''], [1, '10:00', 60, 'Contrôle qualité', 'Contrôle qualité chez le client', 2, 0, '']], checklist: ['Aspiration des sols', 'Lavage des sols'], arepartir: ['À répartir — contrôle qualité', 'Contrôle qualité chez le client'] },
    save: () => { sortie.saves++; }, toast: m => { sortie.toasts.push(String(m)); }, toastAnnuler: (m, f) => { sortie.annuler.push([String(m), f]); },
    logEvent: (a, b) => { sortie.journal.push([a, b]); }, renderNav: () => { sortie.navs++; },
    views: { parametres: () => { sortie.parametres++; } }, esc: s => String(s == null ? '' : s) };
  const noms = ['metiersActifsDe', 'metiersActifs', 'metiersAssocies', 'metiersAssociesEnvoi', '_packListe', '_releveMeme', 'metierPackCombine', '_cleNom', 'metierPackDe', 'metierId', 'metierPack',
    'metierAssocSet', 'metierSet', 'metierServeurAppliquer', 'estMetier3D', 'est3DPrincipal', 'intAffiche3D', 'metierGereParc', 'metierGereSites', 'metierBloque',
    'intTypes', 'libZones', 'exemple', 'sansBox', 'demoSemisPour', 'demoPlanGenerique', 'demoSemisCombine', 'demoSemisDe', 'metiersAssociesBloc'];
  const b = bac('app.html', noms, init);
  return Object.assign({ sortie, init, vus: b.vus }, b.fn);
}

console.log('\n══ 0. LA POPULATION : de quoi parle-t-on ══\n');
vrai('23 packs métier', IDS.length === 23, IDS.length);
vrai('METIERS_ORDRE les range tous, une fois chacun', METIERS_ORDRE.length === 23 && new Set(METIERS_ORDRE).size === 23 && IDS.every(k => METIERS_ORDRE.includes(k)));
vrai('la 3D porte bien `types:null`, `produits:null`, `presta:null`, `releves:null` (les null à résoudre)', ['types', 'produits', 'presta', 'releves'].every(c => METIERS['3d'][c] === null));
vrai('le catalogue 3D est le gros (plus de 100 références), le nettoyage a le sien', CATALOGUE.length > 100 && CATALOGUE_NETT.length > 5);
const m0 = monde({});
vrai('le bac a trouvé toutes les fonctions (aucune dépendance muette inattendue : ' + [...m0.vus].slice(0, 6).join(', ') + ')', [...m0.vus].every(n => ['views', 'sortie', 'DEMO_CLIENTS_3D'].indexOf(n) < 0));

console.log('\n══ 1. ⛔ UN SEUL MÉTIER ≡ L\'ANCIEN PACK, EN PROFONDEUR — la 3D d\'ELAN ne change EN RIEN ══\n');
{
  const g = monde({});
  vrai('sans métier réglé : la 3D, le MÊME objet que METIERS[\'3d\']', g.metierPack() === METIERS['3d']);
  for (const base of [{ metier: '3d' }, { metier: '3d', metiersAssocies: {} }, { metier: '3d', metiersAssocies: { plomberie: { on: 0, _m: 5 } } }, { metiersAssocies: { '3d': { on: 1, _m: 1 } } }, { metier: 'inconnu' }])
    vrai('3D seule (' + JSON.stringify(base) + ') : metierPackDe rend METIERS[\'3d\'] LUI-MÊME', g.metierPackDe(base) === METIERS['3d']);
  vrai('   donc `types:null`, `produits:null`… intacts (l\'application retombe sur INT_TYPES et CAT_LIST)', g.metierPackDe({}).types === null && g.metierPackDe({}).produits === null);
  let tous = 0, memes = 0;
  for (const k of IDS) { tous++; if (g.metierPackDe({ metier: k }) === METIERS[k]) memes++; }
  vrai('chacun des 23 métiers SEUL rend son propre objet (' + memes + '/' + tous + ')', tous === 23 && memes === 23);
  const plomb = monde({ metier: 'plomberie' }); const chauf = monde({ metier: 'chauffage' });
  vrai('plomberie seule = METIERS.plomberie, chauffage seul = METIERS.chauffage', plomb.metierPack() === METIERS.plomberie && chauf.metierPack() === METIERS.chauffage);
  vrai('   et la liste effective n\'est que le principal', JSON.stringify(plomb.metiersActifs()) === '["plomberie"]' && plomb.metiersAssocies().length === 0);
  egal('estMetier3D() / est3DPrincipal() d\'ELAN : vrais tous les deux', [g.estMetier3D(), g.est3DPrincipal()], [true, true]);
  egal('metierGereParc() / metierGereSites() d\'ELAN : faux', [g.metierGereParc(), g.metierGereSites()], [false, false]);
  egal('intTypes() d\'ELAN : INT_TYPES', g.intTypes(), INT_TYPES);
}

console.log('\n══ 2. PLOMBERIE + CHAUFFAGE / CLIM — le cas de demain ══\n');
const PLOMB_CLIM = { metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 10 } } };
{
  const g = monde(copie(PLOMB_CLIM)); const P = METIERS.plomberie, C = METIERS.chauffage, K = g.metierPack();
  vrai('la liste effective : plomberie puis chauffage', JSON.stringify(g.metiersActifs()) === '["plomberie","chauffage"]');
  vrai('le pack combiné n\'est PAS l\'un des deux objets', K !== P && K !== C);
  egal('le nom dit les deux (il nourrit le compte rendu IA et l\'écran)', K.nom, P.nom + ' + ' + C.nom);
  egal('l\'icône et le sous-titre sont ceux du principal', [K.ic, K.sous], [P.ic, P.sous]);
  const sansPlace = (l, a, b) => l.filter(x => a.includes(x) || b.includes(x)).length;
  for (const champ of ['types', 'presta', 'documents', 'produits', 'rubriques']) {
    const att = [...new Set([...P[champ], ...C[champ]])];
    egal(champ + ' : l\'union, sans doublon, le principal d\'abord', K[champ], att);
    vrai('   population : ' + att.length + ' éléments (' + P[champ].length + ' + ' + C[champ].length + ')', att.length > 3);
  }
  vrai('   « Contrat d\'entretien » (partagé) n\'apparaît qu\'UNE fois, « Mise en service et essai » aussi', K.types.filter(t => t === 'Contrat d’entretien').length === 1 && K.presta.filter(t => t === 'Mise en service et essai').length === 1);
  const cles = K.releves.map(r => r.k);
  vrai('relevés : aucune clé en double, aucun relevé perdu (' + cles.length + ')', new Set(cles).size === cles.length && cles.length === P.releves.length + C.releves.length);
  egal('   dans l\'ordre : ceux de la plomberie, puis ceux du chauffage', K.releves.map(r => r.k), P.releves.concat(C.releves).map(r => r.k));
  vrai('   aucune clé commune entre ces deux-là : AUCUN relevé n\'est renommé', K.releves.every(r => r.k.indexOf('~') < 0));
  egal('masque : l\'INTERSECTION des deux (la 3D masque 6 rubriques, ici les deux masquent les mêmes)', K.masque, P.masque.filter(m => C.masque.includes(m)));
  vrai('   population : l\'intersection n\'est pas vide', K.masque.length > 0);
  vrai('origine : chaque type, prestation et relevé dit de QUEL métier il vient', K.origine.types['Dépannage fuite'] === 'plomberie' && K.origine.presta['Remplacement de pièce'] === 'plomberie' && K.origine.releves.pression === 'plomberie' && K.origine.releves.co === 'chauffage');
  vrai('   le partagé est au premier métier de l\'ordre (le principal)', K.origine.types['Contrat d’entretien'] === 'plomberie');
  vrai('catalogue / fournisseurs : ni l\'un ni l\'autre pack n\'en porte — le combiné non plus (rien d\'inventé)', !K.catalogue && !K.fournisseurs);
  egal('intTypes() : les types des deux métiers', g.intTypes(), K.types);
  egal('estMetier3D() faux (aucune 3D là-dedans) ; metierGereParc() VRAI (le parc d\'appareils : la clim)', [g.estMetier3D(), g.metierGereParc()], [false, true]);
  egal('metierGereSites() faux', g.metierGereSites(), false);
  vrai('le menu : une rubrique n\'est fermée que si LES DEUX la ferment (« boxes » : oui ; « registre » : oui)', g.metierBloque('boxes') && g.metierBloque('registre'));
  vrai('metierPack() est mémoïsé (même objet à deux appels)', g.metierPack() === g.metierPack());
  const c2 = monde(copie(PLOMB_CLIM));
  vrai('   … et le MÊME objet d\'un monde à l\'autre (clé = les identifiants, pas l\'identité de db)', c2.metierPack() === K || JSON.stringify(c2.metierPack()) === JSON.stringify(K));
}

console.log('\n══ 3. TOUTES LES PAIRES (506 ordonnées), DES TRIPLETS ET DES QUINTUPLETS : rien ne se perd, rien ne se confond ══\n');
{
  const g = monde({});
  let paires = 0, defauts = [], conflits = [], conflitsVus = new Set(), triplets = 0;
  const verifier = (principal, assoc) => {
    const base = { metier: principal, metiersAssocies: Object.fromEntries(assoc.map(k => [k, { on: 1, _m: 1 }])) };
    const ids = [principal, ...METIERS_ORDRE.filter(k => assoc.includes(k))], K = g.metierPackDe(base), nom = ids.join('+');
    const liste = (k, c) => Array.isArray(METIERS[k][c]) ? METIERS[k][c] : (c === 'types' ? INT_TYPES : c === 'produits' ? CAT_LIST : []);
    const manque = [];
    for (const c of ['types', 'presta', 'documents', 'produits', 'rubriques']) {
      const att = [...new Set(ids.flatMap(k => liste(k, c)))];
      if (JSON.stringify(K[c]) !== JSON.stringify(att)) manque.push(c);
      if (new Set(K[c]).size !== K[c].length) manque.push(c + ' en double');
    }
    const cles = K.releves.map(r => r.k);
    if (new Set(cles).size !== cles.length) manque.push('clé de relevé en double');
    /* aucun relevé perdu : chaque (libellé, unité) de chaque pack est présent */
    ids.forEach(k => (METIERS[k].releves || []).forEach(r => { if (!K.releves.some(x => x.l === r.l || x.l === r.l + ' (' + METIERS[k].nom + ')')) manque.push('relevé perdu ' + k + '/' + r.k); }));
    /* un relevé renommé reste lisible et ne confond pas deux mesures */
    K.releves.filter(r => r.k.indexOf('~') >= 0).forEach(r => { const [kk, mm] = r.k.split('~'); conflitsVus.add(kk + ' (' + mm + ')');
      const orig = METIERS[mm].releves.find(x => x.k === kk); if (!orig || !r.l.startsWith(orig.l + ' (') || (orig.u || '') !== (r.u || '')) manque.push('conflit mal rangé ' + r.k); });
    const masque = METIERS[principal].masque.filter(m => ids.every(k => METIERS[k].masque.includes(m)));
    if (JSON.stringify(K.masque) !== JSON.stringify(masque)) manque.push('masque');
    if (K.types.length < Math.max(...ids.map(k => liste(k, 'types').length))) manque.push('types plus courts');
    if (!K.nom.startsWith(METIERS[principal].nom)) manque.push('nom');
    if (g.metierPackDe({ metier: principal, metiersAssocies: Object.fromEntries([...assoc].reverse().map(k => [k, { on: 1, _m: 1 }])) }) !== K) manque.push('l\'ordre de cochage compte');
    if (manque.length) defauts.push(nom + ' : ' + manque.join(', '));
    return K;
  };
  for (const a of IDS) for (const b of IDS) if (a !== b) { paires++; verifier(a, [b]); }
  vrai('la population : 506 paires ordonnées examinées (' + paires + ')', paires === 506);
  vrai('⛔ aucune paire ne perd ni ne confond rien' + (defauts.length ? ' — ' + defauts.slice(0, 3).join(' | ') : ''), defauts.length === 0);
  defauts = [];
  for (let a = 0; a < IDS.length; a += 2) for (let b = 1; b < IDS.length; b += 3) for (let c = 2; c < IDS.length; c += 5) {
    const t = [IDS[a], IDS[b], IDS[c]]; if (new Set(t).size < 3) continue; triplets++; verifier(t[0], [t[1], t[2]]); }
  vrai('la population : ' + triplets + ' triplets examinés', triplets > 30);
  vrai('⛔ aucun triplet ne perd ni ne confond rien' + (defauts.length ? ' — ' + defauts.slice(0, 3).join(' | ') : ''), defauts.length === 0);
  defauts = [];
  verifier('3d', ['plomberie', 'chauffage', 'electricite', 'nettoyage']); verifier('plomberie', ['3d', 'chauffage', 'froid', 'energies']);
  vrai('cinq métiers à la fois : rien ne se perd', defauts.length === 0, defauts);
  vrai('⛔ des conflits de relevé existent vraiment dans les 23 packs (sinon la règle n\'est jamais jouée) : ' + conflitsVus.size + ' séparés, dont `volume`', conflitsVus.size >= 5 && [...conflitsVus].some(x => x.startsWith('volume')), [...conflitsVus].slice(0, 8));
  /* un conflit précis, lu en entier */
  const rv = k => (METIERS[k].releves || []).find(r => r.k === 'volume');
  const paireVol = IDS.flatMap(a => IDS.filter(b => a !== b).map(b => [a, b])).find(([a, b]) => rv(a) && rv(b) && rv(a).l !== rv(b).l);
  vrai('une paire dont `volume` ne dit pas la même mesure existe', !!paireVol, paireVol);
  if (paireVol) { const K = g.metierPackDe({ metier: paireVol[0], metiersAssocies: { [paireVol[1]]: { on: 1, _m: 1 } } });
    const v1 = K.releves.find(r => r.k === 'volume'), v2 = K.releves.find(r => r.k === 'volume~' + paireVol[1]);
    vrai('   « ' + paireVol.join(' + ') + ' » : DEUX champs, le second sous `volume~' + paireVol[1] + '` et nommé du métier', !!v1 && !!v2 && v1.l === rv(paireVol[0]).l && v2.l.endsWith('(' + METIERS[paireVol[1]].nom + ')'), [v1, v2]); }
}

console.log('\n══ 4. LA 3D ASSOCIÉE — la traçabilité légale ne disparaît pas, le vocabulaire reste celui du principal ══\n');
{
  const g = monde({ metier: 'plomberie', metiersAssocies: { '3d': { on: 1, _m: 1 } } });
  const K = g.metierPack();
  egal('estMetier3D() VRAI (registre biocide, AMM, dossier sanitaire : un plombier qui dératise en a l\'obligation) ; est3DPrincipal() FAUX', [g.estMetier3D(), g.est3DPrincipal()], [true, false]);
  vrai('les `null` de la 3D sont RÉSOLUS : ses types (INT_TYPES) et ses catégories (CAT_LIST) figurent dans le combiné', INT_TYPES.every(t => K.types.includes(t)) && CAT_LIST.every(t => K.produits.includes(t)) && METIERS.plomberie.types.every(t => K.types.includes(t)));
  vrai('   aucun `null` dans le combiné', ['types', 'produits', 'presta', 'releves', 'documents', 'rubriques', 'masque'].every(c => Array.isArray(K[c])));
  egal('le masque : vide (la 3D ne masque rien → l\'intersection est vide → « Boxes » reste OUVERT)', K.masque, []);
  egal('libZones() : « Zones concernées » (le vocabulaire du principal)', g.libZones(), 'Zones concernées');
  vrai('exemple() : les exemples de la plomberie, pas des pièges à glu', !/glu|dératis|Pest/i.test(g.exemple('materiel') + g.exemple('entreprise') + g.exemple('devis1')), [g.exemple('materiel'), g.exemple('entreprise'), g.exemple('devis1')]);
  vrai('le catalogue 3D (160 références) est dans le combiné, sans doublon, avec les fournisseurs 3D', K.catalogue && K.catalogue.length === new Set(K.catalogue.map(x => norm(x[0]).replace(/\s+/g, ' ').trim())).size && K.catalogue.length > 100 && K.fournisseurs.length >= FOURNISSEURS_3D.length);
  const intPlomb = { type: 'Dépannage fuite' }, int3d = { type: 'Dératisation' }, intSans = {}, intDonnee = { type: 'Dépannage fuite', nuisibles: ['Rats'] };
  egal('blocs 3D sur une intervention : fuite → non ; dératisation → oui ; sans type → oui ; fuite avec des nuisibles déjà saisis → oui', [g.intAffiche3D(intPlomb), g.intAffiche3D(int3d), g.intAffiche3D(intSans), g.intAffiche3D(intDonnee)], [false, true, true, true]);
  const e = monde({}); vrai('3D seule : toujours (à l\'identique d\'avant)', e.intAffiche3D(intPlomb) === true && e.intAffiche3D(int3d) === true);
  const p3 = monde({ metier: '3d', metiersAssocies: { plomberie: { on: 1, _m: 1 } } });
  egal('3D PRINCIPALE + plomberie : estMetier3D et est3DPrincipal vrais ; libZones « Zones traitées »', [p3.estMetier3D(), p3.est3DPrincipal(), p3.libZones()], [true, true, 'Zones traitées']);
  vrai('   et ses prestations viennent de la plomberie (la 3D seule n\'en a pas)', p3.metierPack().presta.includes('Remplacement de pièce') && !!p3.metierPack().origine);
  const nu = monde({ metier: 'plomberie', metiersAssocies: { nettoyage: { on: 1, _m: 1 } } });
  egal('nettoyage associé : metierGereSites() vrai ; metierGereParc() faux', [nu.metierGereSites(), nu.metierGereParc()], [true, false]);
  const fr = monde({ metier: 'plomberie', metiersAssocies: { froid: { on: 1, _m: 1 } } }), en = monde({ metier: 'plomberie', metiersAssocies: { energies: { on: 1, _m: 1 } } });
  egal('froid et énergies associés : le parc aussi', [fr.metierGereParc(), en.metierGereParc()], [true, true]);
}

console.log('\n══ 5. LA LISTE EFFECTIVE : filtres, ordre, plafond de quatre ══\n');
{
  const g = monde({});
  const act = (metier, assoc) => g.metiersActifsDe({ metier, metiersAssocies: assoc });
  egal('l\'ordre est celui de METIERS_ORDRE, jamais celui du cochage', act('plomberie', { nettoyage: { on: 1, _m: 1 }, chauffage: { on: 1, _m: 2 } }), ['plomberie', 'chauffage', 'nettoyage']);
  egal('un associé égal au principal est ignoré', act('plomberie', { plomberie: { on: 1, _m: 1 }, chauffage: { on: 1, _m: 2 } }), ['plomberie', 'chauffage']);
  egal('`on:0` : retiré', act('plomberie', { chauffage: { on: 0, _m: 2 } }), ['plomberie']);
  egal('un identifiant inconnu est ignoré (un serveur plus récent, une base abîmée)', act('plomberie', { zorglub: { on: 1, _m: 1 }, chauffage: { on: 1, _m: 2 } }), ['plomberie', 'chauffage']);
  egal('une entrée qui n\'est pas un objet n\'ouvre rien', act('plomberie', { chauffage: 1, froid: null, energies: 'oui' }), ['plomberie']);
  egal('un tableau à la place du dictionnaire : ignoré, sans erreur', act('plomberie', ['chauffage']), ['plomberie']);
  egal('`__proto__` / `constructor` ne passent pas', act('plomberie', JSON.parse('{"__proto__":{"on":1},"constructor":{"on":1}}')), ['plomberie']);
  const six = Object.fromEntries(IDS.filter(k => k !== 'plomberie').slice(0, 8).map((k, i) => [k, { on: 1, _m: i + 1 }]));
  const A = act('plomberie', six);
  vrai('⛔ au plus 4 associés (5 métiers au total), même si la base en porte 8', A.length === 5 && A[0] === 'plomberie', A);
  egal('   et les quatre gardés sont les quatre premiers de METIERS_ORDRE (déterministe sur tous les appareils)', A.slice(1), METIERS_ORDRE.filter(k => k !== 'plomberie' && six[k]).slice(0, 4));
  const e = monde({ metier: 'plomberie' }); vrai('sans la clé : aucune erreur, le principal seul', JSON.stringify(e.metiersActifs()) === '["plomberie"]');
  vrai('une base nulle ou absente : la 3D, sans erreur', JSON.stringify(g.metiersActifsDe(null)) === '["3d"]' && JSON.stringify(g.metiersActifsDe(undefined)) === '["3d"]');
}

console.log('\n══ 6. LE SETTER — réservé à l\'administrateur, il REMPLACE l\'objet, il date la seule clé touchée ══\n');
{
  const db = { metier: 'plomberie', clients: [] };
  const g = monde(db); const s = g.sortie;
  const av = JSON.stringify(db);
  vrai('⛔ rien n\'est écrit tant qu\'on n\'a rien coché : la base est identique après lecture du pack', (g.metierPack(), g.metiersActifs(), JSON.stringify(db) === av) && !('metiersAssocies' in db));
  const tech = monde({ metier: 'plomberie' }, { id: 'u2', role: 'technicien' });
  vrai('un technicien ne peut pas associer', tech.metierAssocSet('chauffage', true) === false && !tech.init.db.metiersAssocies && tech.sortie.saves === 0 && /administrateur/.test(tech.sortie.toasts[0] || ''));
  const sans = monde({ metier: 'plomberie' }, null); vrai('sans utilisateur : refusé', sans.metierAssocSet('chauffage', true) === false && !sans.init.db.metiersAssocies);
  vrai('un identifiant inconnu : refusé sans écrire', g.metierAssocSet('zorglub', true) === false && !('metiersAssocies' in db) && s.saves === 0);
  vrai('le principal ne peut pas être son propre associé', g.metierAssocSet('plomberie', true) === false && s.toasts.length === 1 && !('metiersAssocies' in db));
  const t0 = Date.now();
  vrai('administrateur : associer la clim', g.metierAssocSet('chauffage', true) === true);
  const d1 = db.metiersAssocies;
  egal('   la clé naît : { on:1, _m } — un seul champ neuf', Object.keys(d1), ['chauffage']);
  vrai('   avec une date de maintenant', d1.chauffage.on === 1 && d1.chauffage._m >= t0 && d1.chauffage._m <= Date.now() + 5);
  egal('   un save, un menu redessiné, une ligne de journal, un « Annuler » proposé, l\'écran Paramètres redessiné', [s.saves, s.navs, s.journal.length, s.annuler.length, s.parametres], [1, 1, 1, 1, 1]);
  vrai('   le pack est celui du combiné', g.metierPack().nom === 'Plomberie + Chauffage / Climatisation');
  g.metierAssocSet('froid', true); const d2 = db.metiersAssocies;
  vrai('⛔ l\'objet est REMPLACÉ, jamais muté (l\'ancien objet n\'a pas bougé)', d2 !== d1 && !('froid' in d1) && 'froid' in d2);
  egal('   la clé déjà là n\'est pas re-datée (seule la clé touchée l\'est)', d2.chauffage, d1.chauffage);
  vrai('   deux fois la même action : rien (pas de save de plus)', (() => { const n = s.saves; const r = g.metierAssocSet('froid', true); return r === false && s.saves === n; })());
  const av2 = db.metiersAssocies;
  g.metierAssocSet('froid', false);
  vrai('⛔ le retrait écrit `on:0` avec un `_m` plus récent, il NE supprime PAS la clé (sinon il ressusciterait à la synchro)', db.metiersAssocies.froid && db.metiersAssocies.froid.on === 0 && db.metiersAssocies.froid._m > av2.froid._m && db.metiersAssocies !== av2);
  egal('   et le pack redevient plomberie + chauffage', g.metiersActifs(), ['plomberie', 'chauffage']);
  vrai('   « Annuler » rejoue le setter dans l\'autre sens', /metierAssocSet\('froid',true\)/.test(s.annuler[s.annuler.length - 1][1]));
  const avant = s.saves;
  /* le plafond */
  const g2 = monde({ metier: 'plomberie' }); ['chauffage', 'froid', 'electricite', 'nettoyage'].forEach(k => g2.metierAssocSet(k, true));
  egal('quatre associés posés', g2.metiersAssocies().length, 4);
  const sv = g2.sortie.saves;
  vrai('⛔ le cinquième est REFUSÉ et le dit', g2.metierAssocSet('peinture', true) === false && g2.sortie.saves === sv && /Au plus 4/.test(g2.sortie.toasts[g2.sortie.toasts.length - 1]) && !('peinture' in g2.init.db.metiersAssocies));
  vrai('   retirer en libère un', g2.metierAssocSet('froid', false) === true && g2.metierAssocSet('peinture', true) === true);
  /* l'horloge ne recule jamais : un retrait juste après un ajout garde un _m strictement plus grand même à la même milliseconde */
  const g3 = monde({ metier: 'plomberie' }); g3.metierAssocSet('chauffage', true); const m1 = g3.init.db.metiersAssocies.chauffage._m; g3.metierAssocSet('chauffage', false);
  vrai('   le retrait est TOUJOURS plus récent que l\'ajout qu\'il défait (même milliseconde)', g3.init.db.metiersAssocies.chauffage._m > m1);
}

console.log('\n══ 7. LA FUSION — le vrai `fusionnerBases`, deux appareils ══\n');
{
  function decoupe(h) { const d = SRC.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
    const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g; suite.lastIndex = d + h.length;
    const m = suite.exec(SRC); const fin = m ? m.index : Math.min(SRC.length, d + 80000); let bout = SRC.slice(d, fin);
    for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break; const t = bout.slice(0, k + 1); try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
    throw new Error('fin introuvable : ' + h); }
  const CODE = ['const COLLS_HORS_FUSION=', 'function collsFusion(d){', 'const COLLS_DICT=', 'function dictFusion(prio,autre){', 'function recEmpreinte(r){', 'const stockEmpreinte=', 'const MS_MAX=',
    'let _ombre={}, _ombreStock={};', 'function ombreRelever(o,os){', 'const TOMBE_JOURS=', 'function estampiller(){', 'function msElaguer(ms,st,now){', 'function boxFusionFine(gagnante,perdante){',
    'function tombesElaguer(t,now){', 'function tombesUnion(a,b){', 'function numMaxUnion(a,b){', 'function plansFusionFine(', 'function plansSiteFusion(', 'function fusionnerBases(local,remote,prioriteLocale){',
    'function baseSignature(d){'].map(decoupe).join('\n');
  const neuf = base => new Function('etat', `let db=etat.db; const syncEnabled=()=>true; function toast(){} function save(){}
    ${CODE}
    return { estampiller, ombreRelever, fusionnerBases, baseSignature, getDb:()=>db, setDb:d=>{db=d;} };`)({ db: copie(base) });
  const T = 1790000000000;
  const socle = { metier: 'plomberie', interventions: [{ id: 'i1', titre: 'Fuite', _m: T }], clients: [{ id: 'c1', nom: 'Dupont', _m: T }], _tombes: {} };
  const A = Object.assign(copie(socle), { metiersAssocies: { chauffage: { on: 1, _m: T + 100 } } });
  const B = Object.assign(copie(socle), { metiersAssocies: { froid: { on: 1, _m: T + 200 } } });
  const fus = (a, b, prio) => neuf(a).fusionnerBases(a, b, prio);
  egal('⛔ deux appareils ajoutent chacun un métier : les DEUX survivent', Object.keys(fus(A, B, true).metiersAssocies).sort(), ['chauffage', 'froid']);
  egal('   dans les deux sens de la fusion', Object.keys(fus(B, A, true).metiersAssocies).sort(), ['chauffage', 'froid']);
  const R = Object.assign(copie(socle), { metiersAssocies: { chauffage: { on: 0, _m: T + 300 } } });
  egal('ajout contre retrait du MÊME métier : le plus récent gagne (le retrait)', fus(A, R, true).metiersAssocies.chauffage, { on: 0, _m: T + 300 });
  egal('   … y compris quand le retrait arrive du côté non prioritaire', fus(A, R, true).metiersAssocies.chauffage.on, 0);
  const R2 = Object.assign(copie(socle), { metiersAssocies: { chauffage: { on: 0, _m: T + 50 } } });
  egal('   un retrait plus VIEUX que l\'ajout perd : l\'ajout reste', fus(A, R2, false).metiersAssocies.chauffage, { on: 1, _m: T + 100 });
  const sans = copie(socle);
  egal('une base SANS la clé ne plante pas, et reçoit celle de l\'autre', fus(sans, A, true).metiersAssocies, { chauffage: { on: 1, _m: T + 100 } });
  vrai('   deux bases sans la clé : la fusion n\'en invente pas', !('metiersAssocies' in fus(sans, copie(socle), true)));
  vrai('le principal (`db.metier`) voyage toujours comme un réglage : la fusion ne le perd pas', fus(A, B, true).metier === 'plomberie');
  /* la signature voit le dictionnaire : une fusion qui ramène un métier associé est repoussée */
  const g = neuf(A);
  vrai('⛔ `baseSignature` VOIT les associés (sans ça, une fusion qui ramène la clim d\'un collègue passerait pour un non-événement)', g.baseSignature(A) !== g.baseSignature(B) && g.baseSignature(A) !== g.baseSignature(R) && g.baseSignature(A) === g.baseSignature(copie(A)));
  /* au repos : trois save() sans changement ne posent aucun _m ; deux appareils au repos n'écrivent pas */
  const E = neuf(A); E.ombreRelever(); const av = JSON.stringify(E.getDb());
  E.estampiller(); E.estampiller(); E.estampiller();
  vrai('⛔ trois save() sans changement : la base est IDENTIQUE (aucun _m posé — la garde anti-boucle)', JSON.stringify(E.getDb()) === av);
  vrai('   population : la base portait des enregistrements à estampiller et le dictionnaire', E.getDb().interventions.length > 0 && Object.keys(E.getDb().metiersAssocies).length === 1);
  const d1 = neuf(A), d2 = neuf(B); d1.ombreRelever(); d2.ombreRelever();
  const m1 = d1.fusionnerBases(d1.getDb(), d2.getDb(), true); d1.setDb(m1); d1.ombreRelever();
  const m2 = d2.fusionnerBases(d2.getDb(), d1.getDb(), true); d2.setDb(m2); d2.ombreRelever();
  const s1 = d1.baseSignature(d1.getDb()), s2 = d2.baseSignature(d2.getDb());
  vrai('deux appareils après échange : même signature, donc plus rien à renvoyer', s1 === s2);
  const a1 = JSON.stringify(d1.getDb()), a2 = JSON.stringify(d2.getDb());
  d1.estampiller(); d2.estampiller();
  vrai('   et AU REPOS, un save() de chaque côté ne change rien (pas de boucle de synchro)', JSON.stringify(d1.getDb()) === a1 && JSON.stringify(d2.getDb()) === a2);
  /* la base d'ELAN : 3D, sans la clé — identique avant et après estampiller */
  const elan = neuf({ metier: '3d', clients: [{ id: 'c1', nom: 'Bar', _m: T }], produits: [{ id: 'p1', nom: 'Gel', _m: T }], _tombes: {} }); elan.ombreRelever(); const ae = JSON.stringify(elan.getDb()); elan.estampiller();
  vrai('⛔ la base 3D d\'ELAN (sans la clé) est identique après un save(), et la clé n\'y naît pas', JSON.stringify(elan.getDb()) === ae && !('metiersAssocies' in elan.getDb()));
}

console.log('\n══ 8. LA TOUR POSE LE PRINCIPAL — l\'application range le reste sans rien écrire ══\n');
{
  const db = { metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 10 }, froid: { on: 1, _m: 11 } } };
  const g = monde(db); const s = g.sortie;
  egal('départ : plomberie + chauffage + froid', g.metiersActifs(), ['plomberie', 'chauffage', 'froid']);
  vrai('même principal : rien ne s\'écrit (pas de save à chaque ouverture)', g.metierServeurAppliquer({ metier: 'plomberie' }) === false && s.saves === 0);
  vrai('métier vide ou inconnu : rien', g.metierServeurAppliquer({}) === false && g.metierServeurAppliquer({ metier: 'zorglub' }) === false && g.metierServeurAppliquer({ metier: '__proto__' }) === false && s.saves === 0);
  const avant = JSON.stringify(db.metiersAssocies);
  vrai('la Tour change le principal pour « chauffage » (déjà associé) : appliqué', g.metierServeurAppliquer({ metier: 'chauffage' }) === true && db.metier === 'chauffage');
  egal('⛔ le chauffage SORT de la liste des associés, sans aucune écriture dans le dictionnaire', g.metiersActifs(), ['chauffage', 'froid']);
  vrai('   le dictionnaire est octet pour octet le même (l\'entrée dort)', JSON.stringify(db.metiersAssocies) === avant);
  vrai('   un seul save (celui du principal), un menu redessiné', s.saves === 1 && s.navs === 1);
  g.metierServeurAppliquer({ metier: 'plomberie' });
  egal('   la Tour revient en arrière : le chauffage REPARAÎT (le choix de l\'administrateur est intact)', g.metiersActifs(), ['plomberie', 'chauffage', 'froid']);
  egal('   l\'ancien principal ne devient pas associé tout seul', Object.keys(db.metiersAssocies).sort(), ['chauffage', 'froid']);
  const w = monde({ metier: 'plomberie' }); w.metierServeurAppliquer({ metier: 'chauffage' });
  vrai('sans associé : la Tour pose le principal comme avant, la clé ne naît pas', w.init.db.metier === 'chauffage' && !('metiersAssocies' in w.init.db));
}

console.log('\n══ 9. ⛔ LE PRIX N\'EN DÉPEND PAS ══\n');
{
  const FACT = ['forfait', 'planBloque', 'planPlaces', 'planPlaceLibre', 'catBloque', 'suspensionBloque', 'accesSuspendu', 'accesSuspenduPar', 'placesSrvActives', 'essaiCouvreEquipe', 'forfaitServeurSync', 'formulePayee'];
  const vus = []; let lus = 0;
  FACT.forEach(n => { const f = fonction(N, n); if (!f) return; vus.push(n); lus += f.length; });
  vrai('la population : au moins sept fonctions de facturation trouvées dans le code (' + vus.join(', ') + ')', vus.length >= 7 && lus > 2000, vus);
  const lit = vus.filter(n => /metiersAssocies|metiersActifs|metierAssoc|metierPack|metierId|METIERS\b/.test(fonction(N, n)));
  vrai('⛔ AUCUNE ne lit un métier — ni le principal, ni les associés' + (lit.length ? ' : ' + lit.join(', ') : ''), lit.length === 0);
  /* …et la seule chose que le métier touche est le MASQUE de rubriques, jamais la porte payante */
  const usm = fonction(N, 'userSeesModule');
  vrai('userSeesModule : forfait ET métier ET catégories de la Tour, trois portes distinctes (le combiné ne peut que démasquer)', /planBloque\(k,horsSusp\)/.test(usm) && /metierBloque\(k\)/.test(usm) && /catBloque\(k\)/.test(usm));
  const gb = monde({ metier: 'plomberie' }), gc = monde({ metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 1 } } });
  const demasque = METIERS.plomberie.masque.filter(m => !gc.metierBloque(m)).concat(METIERS.chauffage.masque.filter(m => !gc.metierBloque(m)));
  egal('   le combiné ne ferme AUCUNE rubrique de plus que le principal seul', IDS.every(() => true) && METIERS.plomberie.masque.filter(m => gc.metierBloque(m) && !gb.metierBloque(m)), []);
  /* côté serveur : aucun code de facturation ne lit le champ */
  const serveur = path.join(__dirname, '..', 'server');
  const fichiers = fs.existsSync(serveur) ? fs.readdirSync(serveur).filter(f => f.endsWith('.js')) : [];
  vrai('la population : les fichiers du serveur sont lus (' + fichiers.length + ')', fichiers.length > 5);
  const hors = fichiers.filter(f => !/^(agent-devis|devis-metier)\.js$/.test(f)).filter(f => /metiersAssocies|metiersActifs/.test(fs.readFileSync(path.join(serveur, f), 'utf8')));
  vrai('⛔ aucun fichier du serveur (index.js, la facturation, les espaces…) ne lit `metiersAssocies`, hors l\'assistant devis' + (hors.length ? ' : ' + hors.join(', ') : ''), hors.length === 0);
  const index = fs.readFileSync(path.join(serveur, 'index.js'), 'utf8');
  const FS = ['espacePaye', 'formuleServie', 'formulePayee', 'formuleEtPlaces', 'facturationDe', 'impayeBloque', 'accesSuspenduPar', 'abonnementGestion', 'finEssaiPeriode'];
  const trouvees = FS.filter(n => fonction(index, n));
  vrai('la population : ' + trouvees.length + ' fonctions de facturation du serveur trouvées (' + trouvees.join(', ') + ')', trouvees.length >= 5, trouvees);
  vrai('⛔ aucune ne lit le métier (ni `metier`, ni `metiersAssocies`) : le prix se tire de la formule et des places' , trouvees.every(n => !/\.metier\b|metiers?Assoc/.test(fonction(index, n))), trouvees.filter(n => /\.metier\b|metiers?Assoc/.test(fonction(index, n))));
}

console.log('\n══ 10. ⛔ RIEN NE S\'ÉCRIT AU CHARGEMENT — les seuls endroits qui touchent `metiersAssocies` ══\n');
{
  const occ = (N.match(/metiersAssocies/g) || []).length;
  vrai('la population : le mot est utilisé dans le code (' + occ + ' occurrences)', occ >= 8);
  const LIEUX = ['load', 'migrate', 'seed', 'boot'].filter(n => fonction(N, n).length > 200);
  vrai('   la population : load, migrate, seed et boot sont trouvées (' + LIEUX.join(', ') + ')', LIEUX.length === 4, LIEUX);
  const ecrit = LIEUX.filter(n => /metiersAssocies|metierAssocSet/.test(fonction(N, n)));
  vrai('   load(), migrate(), seed(), boot() : aucune mention', ecrit.length === 0, ecrit);
  const assign = [...N.matchAll(/[\w.]*metiersAssocies\s*=[^=]/g)].map(x => x[0]);
  vrai('   la seule AFFECTATION de `db.metiersAssocies` est dans le setter' + (assign.length ? ' (' + assign.join(' ; ') + ')' : ''), assign.length === 1 && /db\.metiersAssocies=/.test(assign[0]) && /db\.metiersAssocies=nouv/.test(fonction(N, 'metierAssocSet')));
  vrai('   la clé est classée au socle (OP_CLASSES) comme dictionnaire, et dans COLLS_DICT', /metiersAssocies: 'dict'/.test(N) && /const COLLS_DICT=\[[^\]]*'metiersAssocies'/.test(N));
}

console.log('\n══ 11. LE PLANNING DE DÉMONSTRATION alterne les métiers ══\n');
{
  const g = monde({ metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 1 } } });
  const D = g.demoSemisDe(), a = ['plomberie', 'chauffage'];
  vrai('les créneaux restent fixes : autant d\'interventions que le jeu d\'avant', D.planning.length === g.demoSemisPour('plomberie').planning.length && D.planning.length === DEMO_LONGUEUR(g));
  function DEMO_LONGUEUR(w) { return w.init.DEMO_NETT.planning.length; }
  const typesJoues = D.planning.map(r => r[4]);
  const T = { plomberie: METIERS.plomberie.types, chauffage: METIERS.chauffage.types };
  vrai('⛔ le métier d\'un créneau alterne (k mod 2) : pair → plomberie, impair → chauffage', typesJoues.every((t, k) => T[a[k % 2]].includes(t)), typesJoues);
  vrai('   les deux métiers sont joués (population)', typesJoues.some(t => T.plomberie.includes(t) && !T.chauffage.includes(t)) && typesJoues.some(t => T.chauffage.includes(t) && !T.plomberie.includes(t)));
  vrai('   jour, heure, durée, technicien et client sont ceux du créneau d\'avant', D.planning.every((r, k) => [0, 1, 2, 5, 6, 7].every(c => r[c] === g.demoSemisPour('plomberie').planning[k][c])));
  const s = monde({ metier: 'plomberie' });
  egal('un seul métier : le jeu d\'avant, tel quel', JSON.stringify(s.demoSemisDe()), JSON.stringify(s.demoSemisPour('plomberie')));
  const d3 = monde({}); vrai('3D seule : DEMO_PLAN_3D tel quel', d3.demoSemisDe().planning === d3.init.DEMO_PLAN_3D);
  const n = monde({ metier: 'nettoyage' }); vrai('nettoyage seul : DEMO_NETT tel quel', n.demoSemisDe() === n.init.DEMO_NETT);
  const m3 = monde({ metier: 'plomberie', metiersAssocies: { '3d': { on: 1, _m: 1 }, nettoyage: { on: 1, _m: 1 } } });
  const D3 = m3.demoSemisDe(); const ids3 = ['plomberie', '3d', 'nettoyage'];
  const st = m3.init;
  vrai('trois métiers dont la 3D et le nettoyage : chacun prend le jeu DÉDIÉ qu\'il a (créneau 0 plomberie, 1 la 3D, 2 le nettoyage)', METIERS.plomberie.types.includes(D3.planning[0][4]) && st.DEMO_PLAN_3D.some(r => r[4] === D3.planning[1][4]) && st.DEMO_NETT.planning.some(r => r[4] === D3.planning[2][4]), D3.planning.map(r => r[4]));
}

console.log('\n══ 12. PARAMÈTRES › MON MÉTIER ══\n');
{
  const rendu = (db, user) => { const g = monde(db, user); return g.metiersAssociesBloc(); };
  const adm = rendu({ metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 1 } } });
  vrai('l\'administrateur voit le bloc, 23 cases', (adm.match(/type="checkbox"/g) || []).length === 23, (adm.match(/type="checkbox"/g) || []).length);
  vrai('   la phrase fixe, telle quelle : « Ça ne change pas ton abonnement »', /Tu peux associer jusqu'à 4 autres métiers/.test(adm) && /Ça ne change pas ton abonnement<\/b> : le prix dépend de ta formule et du nombre d'utilisateurs, pas du métier\./.test(adm));
  vrai('   le métier principal est grisé : « (ton métier principal) »', /data-metier="plomberie"[^>]*disabled[\s\S]{0,200}ton métier principal/.test(adm));
  vrai('   la clim est cochée, les autres non', /data-metier="chauffage" checked/.test(adm) && !/data-metier="froid" checked/.test(adm));
  const plein = rendu({ metier: 'plomberie', metiersAssocies: Object.fromEntries(['chauffage', 'froid', 'electricite', 'nettoyage'].map(k => [k, { on: 1, _m: 1 }])) });
  vrai('à quatre associés : les cases non cochées sont désactivées, les cochées restent libres', /data-metier="peinture"[^>]*disabled/.test(plein) && !/data-metier="chauffage" checked [^>]*disabled/.test(plein) && /data-metier="chauffage" checked/.test(plein));
  const tech = rendu({ metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 1 } } }, { id: 'u2', role: 'technicien' });
  vrai('un non-administrateur ne voit aucune case, seulement la liste', !/type="checkbox"/.test(tech) && /Chauffage/.test(tech));
  vrai('   et rien du tout quand il n\'y en a pas', rendu({ metier: 'plomberie' }, { id: 'u2', role: 'technicien' }) === '');
}

console.log('\n══ 13. L\'ASSISTANT DEVIS ET LE COMPTE RENDU : les associés partent, rien d\'autre ══\n');
{
  const code = N;
  vrai('les deux appels (`/api/devis/agent` et `/api/devis/generer`) envoient `metiersAssocies`', (code.match(/metiersAssocies:metiersAssociesEnvoi\(\)/g) || []).length === 2);
  const elan = monde({}), seul = monde({ metier: 'plomberie' });
  egal('   ELAN et tout métier seul : `metiersAssociesEnvoi()` rend `undefined` — JSON.stringify l\'omet, le corps de la requête est celui d\'avant, octet pour octet', [elan.metiersAssociesEnvoi(), seul.metiersAssociesEnvoi(), JSON.stringify({ team: 't', metiersAssocies: seul.metiersAssociesEnvoi() })], [undefined, undefined, '{"team":"t"}']);
  const g = monde({ metier: 'plomberie', metiersAssocies: { chauffage: { on: 1, _m: 1 }, froid: { on: 0, _m: 2 } } });
  egal('   ce qui part : les identifiants des seuls associés ACTIFS', g.metiersAssocies(), ['chauffage']);
  vrai('   le nom du métier du compte rendu IA dit les deux', /\(\(metierPack\(\)\|\|\{\}\)\.nom\|\|'dépannage et entretien'\)/.test(code) && g.metierPack().nom.indexOf(' + ') > 0);
}

console.log('\n══ 14. LA FICHE D\'UNE INTERVENTION : les blocs 3D lisent `intAffiche3D(i)`, pas `estMetier3D()` (trouvé par la sonde navigateur) ══\n');
{
  /* La sonde a montré « Nuisibles & méthodes » sur la fiche d'une FUITE chez un plombier à 3D associée : l'écran lisait encore la
     capacité. On lit ici le CODE de renderIntDetail (commentaires retirés), jamais une phrase. */
  const a = N.indexOf('function renderIntDetail(id){'), z = N.indexOf('\nfunction ', a + 30);
  const F = N.slice(a, z);
  vrai('(population) renderIntDetail est trouvée, tranche réelle', a > 0 && F.length > 20000, F.length);
  vrai('l\'onglet « Plan d\'appâtage » est gardé par intAffiche3D(i)', /if\(intAffiche3D\(i\)&&\(!_cliTab\|\|cliIsPro\(_cliTab\)\)\) tabs\.push\(\['planApp'/.test(F));
  vrai('le bloc « Nuisibles & méthodes » est gardé par intAffiche3D(i)', /\$\{!intAffiche3D\(i\)\?'':`<div class="card"><div class="card-head" style="margin-bottom:8px"><h3>Nuisibles & méthodes<\/h3>/.test(F));
  vrai('« Type de traitement », véhicule et matériel sont gardés par intAffiche3D(i)', /\(intAffiche3D\(i\)\?oui\('qTypeTraitement'/.test(F) && /\(intAffiche3D\(i\)\?oui\('qCtrlVehicule'/.test(F));
  vrai('   et la 3D seule garde `estMetier3D()` pour ses seuls textes (plans, stock) : rien de ces trois ne lit la capacité', !/!estMetier3D\(\)\?'':`<div class="card"><div class="card-head" style="margin-bottom:8px"><h3>Nuisibles/.test(F));
}

console.log('\n── 3131 : ' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
