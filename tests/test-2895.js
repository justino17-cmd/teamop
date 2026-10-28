/* ══ test-2895 · CVC 1 — LE PARC D'APPAREILS D'UN CLIENT ═══════════════════════════════════════
   Justin, 23 octobre 2026 : « Chauffage / climatisation, fais-le aussi ». Première partie : chaque client a un PARC
   (chaudière, pompe à chaleur, split…), une intervention cite les appareils visités, et l'échéance d'entretien se
   déduit — elle ne se recopie pas.

   Ce banc EXÉCUTE le vrai bloc CVC d'app.html (tests/cvc-monter.js) — les vraies fonctions, avec des doubles pour l'écran
   et les droits — et lit les registres de la collection dans le fichier livré :
     1. la collection `appareils` est déclarée à TOUS ses registres (synchro, classement du socle, migrate, garde, droits) ;
     2. ⛔ un autre métier (3D, plomberie…) ne voit RIEN : chaque pièce rend '' (section, carte, tâches, tableau de bord) ;
     3. l'écriture d'un appareil : champs, bornes, droits, client visible, fluide effacé quand le type n'en a pas ;
     4. l'échéance d'entretien SE DÉDUIT : dernier entretien terminé, mise en service, période du type, période de l'appareil ;
        un dépannage ne remet pas l'horloge à zéro, une intervention annulée non plus ;
     5. les propositions : dans les 30 jours, ni déjà planifiées, ni chez un client qu'on ne voit pas ;
     6. « Planifier » PRÉ-REMPLIT le formulaire et n'écrit RIEN (l'écriture attend le tap de validation) ;
     7. la carte « Appareils visités » : cocher / décocher, droit lu dans la fonction qui écrit, appareil d'un autre client refusé ;
     8. ⛔ ouvrir un écran n'écrit pas : toutes les lectures, base inchangée, zéro save().
   La preuve au navigateur (jour/nuit, 1440 / 1100 / 390 px, valeurs longues) est scratchpad/sonde-cvc.js. */
const { monter, formulaire, APP, cdc } = require('./cvc-monter.js');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* ⛔ Seuls les blocs de commentaire qui COMMENCENT une ligne se retirent (CLAUDE.md : le motif naïf avale du vrai code). */
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

const BASE = {
  clients: [{ id: 'c1', nom: 'Boulangerie Élise' }, { id: 'c2', nom: 'Mme Durand' }, { id: 'c3', nom: 'Société hors périmètre' }],
  appareils: [
    { id: 'a1', clientId: 'c1', type: 'chaudiere_gaz', marque: 'Saunier Duval', modele: 'Thema 24', puissance: 24, emplacement: 'Chaufferie', nom: 'x' },
    { id: 'a2', clientId: 'c1', type: 'pac_air', marque: 'Daikin', modele: 'Altherma', puissance: 8, fluide: 'R32', charge: 1.2, miseEnService: '2024-11-10', emplacement: 'Salon' },
    { id: 'a3', clientId: 'c2', type: 'chaudiere_fioul', emplacement: 'Garage' },
    { id: 'a4', clientId: 'c3', type: 'chaudiere_gaz', miseEnService: '2020-01-01' }],
  interventions: [
    { id: 'i1', clientId: 'c1', statut: 'terminee', date: '2025-10-30', heure: '09:00', type: 'Entretien annuel chaudière', appareilIds: ['a1'] },
    { id: 'i2', clientId: 'c1', statut: 'terminee', date: '2026-03-01', heure: '09:00', type: 'Dépannage chauffage', appareilIds: ['a1'] },
    { id: 'i3', clientId: 'c1', statut: 'annulee', date: '2026-06-01', type: 'Entretien annuel chaudière', appareilIds: ['a1'] }],
  contrats: []
};

console.log('\n── 2895 · 1. la collection est déclarée à TOUS ses registres ──');
{
  const liste = nom => { const m = new RegExp('const ' + nom + '=\\[([^\\]]*)\\]').exec(CODE); return m ? m[1] : ''; };
  vrai('COLLECTIONS_DONNEES porte appareils', /'appareils'/.test(liste('COLLECTIONS_DONNEES')));
  vrai('COLLS_GARDEES porte appareils (garde-fou du rétrécissement)', /'appareils'/.test(liste('COLLS_GARDEES')));
  const iC = CODE.indexOf('const OP_CLASSES = {'); const fin = CODE.indexOf('\n};', iC);
  vrai('OP_CLASSES classe appareils en « liste » (socle)', /\bappareils: 'liste'/.test(CODE.slice(iC, fin)));
  const mig = /function migrate\(d\)\{\s*const cols = \[([^\]]*)\]/.exec(CODE);
  vrai('migrate() pose la collection (une base ancienne la reçoit vide)', !!mig && /'appareils'/.test(mig[1]));
  vrai('COL_GRP : les droits de la catégorie Clients', /const COLL_GRP=\{[^}]*appareils:'crm'/.test(CODE));
  vrai('COLL_QUOI : le message de refus sait nommer un appareil', /const COLL_QUOI=\{[^}]*appareils:'un appareil'/.test(CODE));
  vrai('DEL_NOMS : la suppression nomme « l’appareil »', /const DEL_NOMS=\{[^}]*appareils:'l’appareil'/.test(CODE));
  vrai('la remise à zéro des données de test vide aussi les appareils', /'fournisseurs','registres','appareils','cahiers','plansPrevention','docsMetier'\]\.forEach\(k=>\{ db\[k\]=\[\]; \}\)/.test(CODE));
  vrai('« Effacer les clients » emporte leur parc (sinon des appareils sans client)', /if\(c\.clients\)\{ db\.clients=\[\]; db\.appareils=\[\];/.test(CODE));
  vrai('supprimer un client DIT combien d’appareils restent', /appareils:n\('appareils'\)/.test(CODE) && /liensPluriel\(l\.appareils,'appareil'\)/.test(CODE));
  vrai('une seule ligne de code pousse dans db.appareils (saveAppareil)', (CODE.match(/db\.appareils\.push\(/g) || []).length === 1);
}

console.log('\n── 2895 · 2. ⛔ un autre métier ne voit RIEN de neuf ──');
for (const metier of ['3d', 'plomberie', 'electricite', 'serrurerie', 'nettoyage', 'autre']) {
  const W = monter({ db: BASE, metier });
  const c = W.db.clients[0], i = W.db.interventions[0];
  vrai(metier + ' : metierGereParc() = false', W.metierGereParc() === false);
  v(metier + ' : section de la fiche client, carte d’intervention, bloc Tâches, carte du tableau de bord = rien',
    [W.cvcSectionClient(c), W.cvcIntCard(i, true), W.cvcTachesBloc(), W.cvcDashSection(() => true)], ['', '', '', '']);
}
for (const metier of ['chauffage', 'froid', 'energies']) vrai(metier + ' : metierGereParc() = true', monter({ db: BASE, metier }).metierGereParc() === true);

console.log('\n── 2895 · 3. écrire un appareil ──');
{
  const W = monter({ db: BASE });
  const f = formulaire({ clientId: 'c1', type: 'clim_split', marque: 'Mitsubishi', modele: 'MSZ-AP25', serie: 'SN-9', puissance: '2,5', emplacement: 'Chambre 2', miseEnService: '2025-06-01',
    fluide: 'R32', charge: '0,75', prp: '', periodeMois: '', note: 'Filtre lavable', detection: false, scelle: true });
  W.saveAppareil({ preventDefault() {}, target: f }, '');
  const n = W.db.appareils.find(a => a.marque === 'Mitsubishi');
  vrai('un appareil est créé', !!n && W.db.appareils.length === 5);
  vrai('champs numériques lus avec la virgule (2,5 kW · 0,75 kg)', n && n.puissance === 2.5 && n.charge === 0.75, n);
  vrai('le nom lisible est rangé (la suppression le nomme)', n && n.nom === 'Climatiseur split · Mitsubishi MSZ-AP25', n && n.nom);
  vrai('creePar / creeLe posés, un seul save(), la fiche client rouverte', n && n.creePar === 'u1' && n.creeLe === '2026-10-23' && W.__saves === 1 && W.__fiches[0] === 'c1');
  vrai('hermétiquement scellé retenu, détection non', n && n.scelle === true && n.detection === false);
  /* modifier : même id, la fiche existante est complétée */
  W.saveAppareil({ preventDefault() {}, target: formulaire({ clientId: 'c1', type: 'chaudiere_gaz', marque: 'Frisquet', modele: '', serie: '', puissance: '24', emplacement: '', miseEnService: '', fluide: 'R32', charge: '2', prp: '', periodeMois: '10', note: '', detection: true, scelle: true }) }, n.id);
  const m = W.db.appareils.find(a => a.id === n.id);
  vrai('modifier garde l’identifiant et le client, n’ajoute rien', m && W.db.appareils.length === 5 && m.clientId === 'c1');
  vrai('⛔ une chaudière n’emporte PAS le fluide d’un ancien type (sa périodicité serait fausse)', m && m.fluide === '' && m.charge === '' && m.detection === false && m.scelle === false, m);
  vrai('la période de l’appareil est lue (10 mois)', m && W.cvcPeriodeEntretien(m) === 10);
  /* refus */
  const avant = W.db.appareils.length, sv = W.__saves;
  const base = { clientId: 'c1', type: 'chaudiere_gaz', marque: '', modele: '', serie: '', puissance: '', emplacement: '', miseEnService: '', fluide: '', charge: '', prp: '', periodeMois: '', note: '' };
  const essai = (nom, patch, attendu) => { const t0 = W.__toasts.length; W.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base, patch)) }, '');
    vrai('refus : ' + nom, W.db.appareils.length === avant && W.__saves === sv && (!attendu || W.__toasts.slice(t0).some(x => attendu.test(x))), W.__toasts.slice(t0)); };
  essai('type inconnu', { type: 'lave-linge' }, /type d’appareil/);
  essai('puissance négative', { puissance: '-3' }, /Puissance/);
  essai('puissance absurde', { puissance: '1e9' }, /Puissance/);
  essai('charge négative', { type: 'pac_air', charge: '-1' }, /Charge/);
  essai('période hors bornes (0)', { periodeMois: '0' }, /Entretien/);
  essai('période hors bornes (121)', { periodeMois: '121' }, /Entretien/);
  essai('date de mise en service invalide', { miseEnService: '31/12/2025' }, /mise en service/);
  essai('client inconnu', { clientId: 'cX' }, /ne te concerne pas/);
  const W2 = monter({ db: BASE, clientsVisibles: ['c2'] });
  const t1 = W2.__toasts.length; W2.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base, { clientId: 'c1' })) }, '');
  vrai('refus : client que la personne ne voit pas', W2.db.appareils.length === 4 && W2.__saves === 0 && /ne te concerne pas/.test(W2.__toasts.slice(t1).join('|')));
  const W3 = monter({ db: BASE, droits: { 'crm.ajouter': false } });
  W3.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base)) }, '');
  vrai('⛔ la case « Clients → Ajouter » est lue DANS la fonction qui écrit', W3.db.appareils.length === 4 && W3.__saves === 0 && /pas autorisé/.test(W3.__toasts.join('|')), W3.__toasts);
  const W4 = monter({ db: BASE, droits: { 'crm.modifier': false } });
  W4.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base, { marque: 'Piraté' })) }, 'a1');
  vrai('⛔ la case « Clients → Modifier » est lue pour modifier', W4.db.appareils[0].marque === 'Saunier Duval' && W4.__saves === 0);
  const W5 = monter({ db: BASE });
  W5.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base, { clientId: 'c2' })) }, 'a1');
  vrai('un appareil ne change pas de client', W5.db.appareils[0].clientId === 'c1' && W5.__saves === 0 && /ne change pas de client/.test(W5.__toasts.join('|')));
  W5.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base)) }, 'zzz');
  vrai('modifier un appareil disparu se dit', /n’existe plus/.test(W5.__toasts.join('|')) && W5.__saves === 0);
  /* valeurs longues plausibles : coupées aux bornes */
  const W6 = monter({ db: BASE });
  W6.saveAppareil({ preventDefault() {}, target: formulaire(Object.assign({}, base, { marque: 'M'.repeat(300), emplacement: 'E'.repeat(500), note: 'N'.repeat(2000) })) }, '');
  const l = W6.db.appareils[W6.db.appareils.length - 1];
  vrai('marque / emplacement / note coupées (80 / 120 / 500)', l.marque.length === 80 && l.emplacement.length === 120 && l.note.length === 500);
}

console.log('\n── 2895 · 4. l’échéance d’entretien se DÉDUIT ──');
{
  const W = monter({ db: BASE });
  const ap = id => W.db.appareils.find(a => a.id === id);
  v('chaudière : dernier entretien TERMINÉ (30/10/2025) + 12 mois', W.cvcEntretienEcheance(ap('a1')), { date: '2026-10-30', base: 'intervention', depuis: '2025-10-30', mois: 12 });
  vrai('un dépannage plus récent ne remet PAS l’horloge à zéro', W.cvcDernierEntretien(ap('a1')).id === 'i1');
  vrai('mais c’est bien la « dernière intervention » affichée', W.cvcDerniereIntervention(ap('a1')).id === 'i2');
  vrai('une intervention ANNULÉE ne compte pour rien', W.cvcIntsDe(ap('a1')).every(i => i.statut !== 'annulee'));
  v('pompe à chaleur sans entretien : mise en service + 24 mois (le minimum légal des PAC)', W.cvcEntretienEcheance(ap('a2')), { date: '2026-11-10', base: 'miseEnService', depuis: '2024-11-10', mois: 24 });
  v('rien d’enregistré : PAS d’échéance inventée', W.cvcEntretienEcheance(ap('a3')), null);
  ap('a2').periodeMois = 12;
  vrai('la période de l’appareil remplace celle du type', W.cvcEntretienEcheance(ap('a2')).date === '2025-11-10');
  vrai('31 janvier + 1 mois = 28 février (pas le 3 mars)', W.cvcAddMois('2026-01-31', 1) === '2026-02-28' && W.cvcAddMois('2028-02-29', 12) === '2029-02-28' && W.cvcAddMois('2026-11-30', 3) === '2027-02-28');
  vrai('cvcJours : différence de jours entière, sans dérive d’heure d’été', W.cvcJours('2026-10-25', '2026-10-23') === 2 && W.cvcJours('2026-03-30', '2026-03-28') === 2 && W.cvcJours('2026-10-20', '2026-10-23') === -3);
  /* ⛔ la période par défaut de CHAQUE type, écrite en dur : lire la table contre elle-même ne garderait rien */
  const PERIODES = { chaudiere_gaz: 12, chaudiere_fioul: 12, chaudiere_bois: 12, pac_eau: 24, pac_air: 24, clim_split: 24, clim_multi: 24, clim_gainable: 24, cet: 12, vmc: 12, autre: 12 };
  v('période d’entretien par défaut de chacun des 11 types', Object.keys(PERIODES).map(k => W.cvcPeriodeEntretien({ type: k })), Object.keys(PERIODES).map(k => PERIODES[k]));
  vrai('un type inconnu retombe sur « Autre appareil » (12 mois)', W.cvcPeriodeEntretien({ type: 'inconnu' }) === 12 && W.cvcPeriodeEntretien(null) === 12);
  vrai('⛔ le nombre de types est connu : un type de plus doit entrer dans ce tableau', W.cvcType({ type: 'cet' }).k === 'cet' && W.cvcType({ type: 'vmc' }).k === 'vmc' && /const CVC_TYPES=\[([\s\S]*?)\n\];/.exec(require('./cvc-monter.js').APP)[1].match(/\{k:'/g).length === Object.keys(PERIODES).length);
  v('période de l’appareil : bornes 1 et 120 acceptées, 0 et 121 retombent sur le type', [W.cvcPeriodeEntretien({ type: 'vmc', periodeMois: 1 }), W.cvcPeriodeEntretien({ type: 'vmc', periodeMois: 120 }), W.cvcPeriodeEntretien({ type: 'vmc', periodeMois: 0 }), W.cvcPeriodeEntretien({ type: 'vmc', periodeMois: 121 })], [1, 120, 12, 12]);
  /* ⛔ seule une visite TERMINÉE remet l'horloge à zéro */
  ['planifiee', 'encours', 'aplanifier'].forEach(st => { const X = monter({ db: cdc(BASE) }); X.db.interventions.push({ id: 'ip', clientId: 'c1', statut: st, date: '2026-10-01', type: 'Entretien annuel chaudière', appareilIds: ['a1'] });
    vrai('⛔ une visite d’entretien seulement « ' + st + ' » ne compte pas comme entretien fait', X.cvcDernierEntretien(X.db.appareils[0]).id === 'i1'); });
  vrai('une visite née d’un contrat compte comme entretien, même sans le mot', W.cvcEstEntretien({ contratId: 'k1', type: 'Visite' }) && !W.cvcEstEntretien({ type: 'Dépannage chauffage' }));
}

console.log('\n── 2895 · 5. les propositions ──');
{
  const W = monter({ db: BASE, today: '2026-10-23' });
  const P = W.cvcPropositions();
  v('visibles : a1 (dans 7 j) et a2 (dans 18 j) ; a3 sans date, a4 trop loin dans le passé ? voir ci-dessous', P.map(p => p.appareilIds[0]), ['a4', 'a1', 'a2']);
  const a4 = P.find(p => p.appareilIds[0] === 'a4');
  vrai('a4 (mise en service 2020, jamais entretenu) est en retard : j négatif', a4 && a4.j < 0);
  v('triées : le plus en retard d’abord', P.map(p => p.j).slice().sort((a, b) => a - b), P.map(p => p.j));
  const a1 = P.find(p => p.appareilIds[0] === 'a1');
  v('une proposition porte le client, le titre, le type, la date', [a1.clientId, a1.titre, a1.type, a1.date, a1.j], ['c1', 'Entretien — Chaudière gaz · Saunier Duval Thema 24', 'Entretien annuel chaudière', '2026-10-30', 7]);
  vrai('la clé change avec l’échéance (un entretien fait repart à zéro)', /^ent:a1:2026-10-30$/.test(a1.cle));
  vrai('type de visite choisi selon l’appareil (PAC → Entretien pompe à chaleur)', P.find(p => p.appareilIds[0] === 'a2').type === 'Entretien pompe à chaleur');
  const W2 = monter({ db: BASE, clientsVisibles: ['c1'] });
  v('⛔ jamais chez un client qu’on ne voit pas', W2.cvcPropositions().map(p => p.appareilIds[0]), ['a1', 'a2']);
  const W3 = monter({ db: cdc(BASE) });
  W3.db.interventions.push({ id: 'i9', clientId: 'c1', statut: 'planifiee', date: '2026-10-29', type: 'Entretien annuel chaudière', appareilIds: ['a1'] });
  v('déjà planifiée (une visite d’ENTRETIEN) : plus proposée', W3.cvcPropositions().map(p => p.appareilIds[0]), ['a4', 'a2']);
  /* ⛔ « Changer le client » d'une intervention ne vide pas appareilIds : elle ne compte alors plus pour l'appareil de l'autre client */
  const W3e = monter({ db: cdc(BASE) });
  W3e.db.interventions.push({ id: 'i8', clientId: 'c2', statut: 'terminee', date: '2026-10-20', type: 'Entretien annuel chaudière', appareilIds: ['a1'] });
  v('⛔ une visite terminée d’un AUTRE client qui cite a1 ne repousse pas son échéance (a1 reste proposé)', [W3e.cvcPropositions().some(p => p.appareilIds[0] === 'a1'), W3e.cvcIntsDe(W3e.db.appareils.find(a => a.id === 'a1')).some(i => i.id === 'i8')], [true, false]);
  const W3f = monter({ db: cdc(BASE) });
  W3f.db.interventions.push({ id: 'i8', clientId: 'c2', statut: 'terminee', date: '2026-10-20', type: 'Entretien annuel chaudière', appareilIds: ['a1'] });
  v('… de même par l’index (le tableau de bord et les Tâches)', W3f.cvcAvecIndex(() => W3f.cvcPropositions().some(p => p.appareilIds[0] === 'a1') ), true);
  const W3b = monter({ db: cdc(BASE) });
  W3b.db.interventions.push({ id: 'i9', clientId: 'c1', statut: 'planifiee', date: '2026-10-29', type: 'Dépannage chauffage', appareilIds: ['a1'] });
  v('⛔ un DÉPANNAGE planifié qui cite l’appareil n’est pas un entretien : l’entretien reste proposé', W3b.cvcPropositions().map(p => p.appareilIds[0]), ['a4', 'a1', 'a2']);
  const W3g = monter({ db: cdc(BASE) });
  W3g.db.interventions.push({ id: 'i9', clientId: 'c1', statut: 'planifiee', date: '2026-10-29', type: 'Visite', contratId: 'k1', appareilIds: ['a1'] });
  v('une visite née d’un CONTRAT, quel que soit son type, fait taire l’entretien de l’appareil qu’elle cite', W3g.cvcPropositions().map(p => p.appareilIds[0]), ['a4', 'a2']);
  const W3c = monter({ db: cdc(BASE) });
  W3c.db.interventions.push({ id: 'i9', clientId: 'c1', statut: 'planifiee', date: '2026-10-29', type: '', titre: 'Entretien — Chaudière gaz', appareilIds: ['a1'] });
  v('une visite SANS type, intitulée « Entretien — … » (née de « Planifier » sans type voulu) : plus proposée', W3c.cvcPropositions().map(p => p.appareilIds[0]), ['a4', 'a2']);
  const W4 = monter({ db: cdc(BASE), today: '2026-08-01' });
  vrai('à plus de 30 jours : rien', W4.cvcPropositions().every(p => p.j <= 30) && !W4.cvcPropositions().some(p => p.appareilIds[0] === 'a1'));
  const html = W.cvcTachesBloc();
  vrai('le bloc Tâches nomme le client, la date, un bouton Planifier', /Entretiens à planifier/.test(html) && /Boulangerie Élise/.test(html) && /cvcPlanifier\('ent:a1:2026-10-30'\)/.test(html));
  const W5 = monter({ db: BASE, droits: { 'int.ajouter': false } });
  vrai('sans « Interventions → Ajouter », la liste se lit mais le bouton Planifier n’est pas servi', /Entretiens à planifier/.test(W5.cvcTachesBloc()) && !/cvcPlanifier/.test(W5.cvcTachesBloc()));
  vrai('le tableau de bord n’affiche la carte qu’à qui voit les Interventions', W.cvcDashSection(() => true).length > 50 && W.cvcDashSection(k => k !== 'interventions') === '');
  const W6 = monter({ db: { clients: BASE.clients, appareils: [], interventions: [], contrats: [] } });
  v('aucun appareil : ni bloc Tâches ni carte (pas de cadre vide)', [W6.cvcTachesBloc(), W6.cvcDashSection(() => true)], ['', '']);
  /* longueur : 40 propositions, le bloc en montre 12 et dit combien en restent */
  const gros = cdc(BASE); gros.appareils = []; for (let k = 0; k < 40; k++) gros.appareils.push({ id: 'g' + k, clientId: 'c1', type: 'chaudiere_gaz', miseEnService: '2020-01-01', marque: 'Marque très longue ' + k });
  vrai('40 échéances : 12 lignes et « + 28 autre(s) »', (/\+ 28 autre\(s\)/.test(monter({ db: gros }).cvcTachesBloc())) && (monter({ db: gros }).cvcTachesBloc().match(/cvcPlanifier\(/g) || []).length === 12);
}

console.log('\n── 2895 · 6. « Planifier » PRÉ-REMPLIT et n’écrit RIEN ──');
{
  const W = monter({ db: BASE });
  const avant = JSON.stringify(W.db);
  W.cvcPlanifier('ent:a1:2026-10-30');
  vrai('le formulaire d’intervention s’ouvre', W.__interForm.length === 1 && W.__interForm[0].id === '');
  const pre = W.__interForm[0].pre;
  v('pré-rempli : client, titre, date, type, appareils', [pre.clientId, pre.titre, pre.date, pre.type, pre.appareilIds], ['c1', 'Entretien — Chaudière gaz · Saunier Duval Thema 24', '2026-10-30', 'Entretien annuel chaudière', ['a1']]);
  vrai('⛔ rien n’est écrit : base identique, zéro save()', JSON.stringify(W.db) === avant && W.__saves === 0);
  W.cvcPlanifier('ent:a4:2021-01-01');
  vrai('une échéance dépassée se planifie AUJOURD’HUI, pas dans le passé', W.__interForm[1].pre.date === '2026-10-23');
  const n = W.__interForm.length; W.cvcPlanifier('ent:inconnu:2026-01-01');
  vrai('une échéance déjà traitée se dit, sans formulaire', W.__interForm.length === n && /déjà traitée/.test(W.__toasts.join('|')));
  const W2 = monter({ db: BASE, droits: { 'int.ajouter': false } });
  W2.cvcPlanifier('ent:a1:2026-10-30');
  vrai('⛔ sans « Interventions → Ajouter », rien ne s’ouvre', W2.__interForm.length === 0 && /pas autorisé/.test(W2.__toasts.join('|')));
  /* le formulaire sait porter les appareils, l’enregistrement les range en liste (et seulement ceux du client choisi) */
  v('champ caché du formulaire', W.cvcInputForm({ appareilIds: ['a1', 'a2'] }), '<input type="hidden" name="cvcAppareils" value="a1,a2">');
  v('pas de champ caché sans appareil', W.cvcInputForm({}), '');
  v('un identifiant tordu n’entre pas dans l’attribut', W.cvcInputForm({ appareilIds: ['a1', '"><script>'] }), '<input type="hidden" name="cvcAppareils" value="a1">');
  const d = { clientId: 'c1', cvcAppareils: 'a1,a3,zzz' }; W.cvcFormLire(d);
  v('enregistrement : seuls les appareils DU client choisi (a3 est chez c2) sont gardés', d, { clientId: 'c1', appareilIds: ['a1'] });
  const d2 = { clientId: 'c2', cvcAppareils: 'a1' }; W.cvcFormLire(d2);
  v('client changé dans le formulaire : aucun appareil étranger', d2, { clientId: 'c2' });
  const d3 = { clientId: 'c1' }; W.cvcFormLire(d3);
  v('formulaire sans champ (modification) : rien ne bouge', d3, { clientId: 'c1' });
}

console.log('\n── 2895 · 7. la carte « Appareils visités » ──');
{
  const W = monter({ db: BASE });
  const i = W.db.interventions.find(x => x.id === 'i2');
  W.cvcIntToggle('i2', 'a2');
  vrai('cocher ajoute l’appareil et enregistre', i.appareilIds.join() === 'a1,a2' && W.__saves === 1 && W.__go.includes('det:i2'));
  W.cvcIntToggle('i2', 'a2');
  vrai('re-toucher le retire', i.appareilIds.join() === 'a1' && W.__saves === 2);
  const s = W.__saves; W.cvcIntToggle('i2', 'a3');
  vrai('⛔ l’appareil d’un AUTRE client est refusé', i.appareilIds.join() === 'a1' && W.__saves === s && /pas chez le client/.test(W.__toasts.join('|')));
  const W2 = monter({ db: BASE, droits: { 'int.modifier': false } });
  W2.cvcIntToggle('i2', 'a2');
  vrai('⛔ la case « Interventions → Modifier » est lue DANS la fonction qui écrit', W2.db.interventions[1].appareilIds.join() === 'a1' && W2.__saves === 0);
  const edit = W.cvcIntCard(i, true), lect = W.cvcIntCard(i, false);
  vrai('en édition : tous les appareils du client en puces cliquables', (edit.match(/cvcIntToggle\(/g) || []).length === 2 && /Daikin/.test(edit));
  vrai('en lecture : seuls les appareils cités, sans geste', /Saunier Duval/.test(lect) && !/Daikin/.test(lect) && !/cvcIntToggle/.test(lect));
  vrai('en édition sans le droit de modifier : pas de puce cliquable', !/cvcIntToggle/.test(W2.cvcIntCard(W2.db.interventions[1], true)));
  const vide = monter({ db: { clients: BASE.clients, appareils: [], interventions: BASE.interventions } });
  vrai('client sans appareil : le dit et propose d’en ajouter', /pas encore d’appareil/.test(vide.cvcIntCard(vide.db.interventions[0], true)) && /formAppareil\('','c1'\)/.test(vide.cvcIntCard(vide.db.interventions[0], true)));
}

console.log('\n── 2895 · 8. la fiche client ──');
{
  const W = monter({ db: BASE });
  const h = W.cvcSectionClient(W.db.clients[0]);
  vrai('deux appareils de c1, comptés', /Appareils <span class="tag">2<\/span>/.test(h) && /Saunier Duval/.test(h) && /Daikin/.test(h) && !/Garage/.test(h));
  vrai('chaque ligne : dernière intervention (30/10 → le dépannage du 01/03) et prochain entretien', /Dernière intervention : 01\/03/.test(h) && /prochain entretien 30\/10/.test(h));
  vrai('la pastille d’échéance est colorée (orange dans les 30 jours)', /st-org/.test(h));
  vrai('« ＋ Appareil » servi à qui peut ajouter', /formAppareil\('','c1'\)/.test(h) && !/formAppareil\('','c1'\)/.test(monter({ db: BASE, droits: { 'crm.ajouter': false } }).cvcSectionClient(BASE.clients[0])));
  vrai('un client sans appareil : une phrase, pas un cadre vide', /Aucun appareil enregistré/.test(W.cvcSectionClient({ id: 'cZ', nom: 'Z' })));
  vrai('⛔ une valeur longue ne casse pas la ligne (overflow-wrap)', (W.cvcLigneAppareil(Object.assign({}, W.db.appareils[0], { marque: 'M'.repeat(80), emplacement: 'E'.repeat(120) })).match(/overflow-wrap:anywhere/g) || []).length >= 2);
  vrai('le HTML est échappé (un nom piégé ne devient pas du balisage)', !/<img/.test(W.cvcLigneAppareil(Object.assign({}, W.db.appareils[0], { marque: '<img src=x onerror=1>' }))));
}

console.log('\n── 2895 · 9. règle d’étanchéité : seuils, aux frontières ──');
{
  const W = monter({ db: BASE });
  const R = (fluide, charge, extra) => W.cvcEtancheiteRegle(Object.assign({ fluide, charge }, extra || {}));
  const mois = r => (r.requis === true ? r.mois : r.requis);
  v('R32 1,2 kg = 0,81 t : sous 5 t, pas de contrôle périodique', mois(R('R32', 1.2)), false);
  v('R410A 3 kg = 6,26 t : tous les 12 mois', mois(R('R410A', 3)), 12);
  v('… 24 avec détection permanente de fuite', mois(R('R410A', 3, { detection: true })), 24);
  v('R404A 20 kg = 78,4 t : 6 mois', mois(R('R404A', 20)), 6);
  v('R404A 150 kg = 588 t : 3 mois, détection OBLIGATOIRE', [mois(R('R404A', 150)), R('R404A', 150).detectionObligatoire], [3, true]);
  v('… 6 mois avec détection', mois(R('R404A', 150, { detection: true })), 6);
  const F = (kg, prp, extra) => W.cvcEtancheiteRegle(Object.assign({ fluide: 'R410A', charge: kg, prp }, extra || {}));
  v('frontière 4,999 t : non', mois(F(4.999, 1000)), false);
  v('⛔ le tonnage n’est PAS arrondi : 4,9996 t (4999,6 kg·PRP) reste sous la frontière', mois(F(4.9996, 1000)), false);
  v('frontière 5 t pile : oui, 12 mois', mois(F(5, 1000)), 12);
  v('frontière 49,999 t : 12 mois', mois(F(49.999, 1000)), 12);
  v('frontière 50 t pile : 6 mois', mois(F(50, 1000)), 6);
  v('frontière 499,999 t : 6 mois', mois(F(499.999, 1000)), 6);
  v('frontière 500 t pile : 3 mois', mois(F(500, 1000)), 3);
  v('⛔ détection permanente OBLIGATOIRE à 500 t pile, pas à 499,999 t', [F(500, 1000).detectionObligatoire, F(499.999, 1000).detectionObligatoire], [true, false]);
  v('le PRP de la plaque l’emporte sur le tableau (R32 à 2088 : 3 kg = 6,3 t)', mois(R('R32', 3, { prp: 2088 })), 12);
  v('équipement hermétiquement scellé : seuil 10 t (7 t → non)', mois(F(7, 1000, { scelle: true })), false);
  v('… et 10 t pile → oui', mois(F(10, 1000, { scelle: true })), 12);
  const H = (kg, extra) => W.cvcEtancheiteRegle(Object.assign({ fluide: 'R1234yf', charge: kg }, extra || {}));
  v('HFO 0,9 kg : sous le seuil de 1 kg', mois(H(0.9)), false);
  v('HFO 1 kg : 12 mois', mois(H(1)), 12);
  v('HFO 9,99 kg : 12 mois', mois(H(9.99)), 12);
  v('HFO 10 kg : 6 mois', mois(H(10)), 6);
  v('HFO 99,9 kg : 6 mois', mois(H(99.9)), 6);
  v('HFO 100 kg : 3 mois', mois(H(100)), 3);
  v('HFO avec détection : intervalle doublé (10 kg → 12)', mois(H(10, { detection: true })), 12);
  v('R290 (naturel) : pas de contrôle F-gaz', mois(R('R290', 0.4)), false);
  v('R22 (HCFC) : hors tableau, on ne tranche pas', mois(R('R22', 5)), null);
  v('fluide ou charge manquants : on ne tranche pas', [mois(R('', 3)), mois(R('R32', 0)), mois(R('R32', 'abc'))], [null, null, null]);
  vrai('le motif DIT la durée et la charge en t éq. CO₂ (virgule française)', /6,26 t éq\. CO₂ → contrôle d’étanchéité tous les 12 mois/.test(R('R410A', 3).motif), R('R410A', 3).motif);
  vrai('l’aide au calcul n’est PAS un avis réglementaire (écrit à l’écran)', /pas un avis réglementaire/.test(W.cvcRegleTexte({ fluide: 'R410A', charge: 3 })));
  /* les PRP du tableau : ceux du règlement 517/2014 que le code déclare */
  const PRP = { R32: 675, R410A: 2088, R134a: 1430, R407C: 1774, R404A: 3922 };
  v('PRP du tableau (R32 675, R410A 2088, R134a 1430, R407C 1774, R404A 3922)', Object.keys(PRP).map(k => W.cvcFluide(k).prp), Object.values(PRP));
}

console.log('\n── 2895 · 10. ⛔ ouvrir un écran n’écrit pas ──');
{
  const W = monter({ db: BASE });
  const avant = JSON.stringify(W.db);
  W.cvcSectionClient(W.db.clients[0]); W.cvcIntCard(W.db.interventions[0], true); W.cvcIntCard(W.db.interventions[0], false);
  { const F = monter({ db: BASE }); F.formAppareil('a2'); const html = F.__modals[0] || '';
    const cases = html.match(/<label style="[^"]*">\s*<input type="checkbox" name="(detection|scelle)"/g) || [];
    vrai('⛔ les deux cases qui décident de la périodicité légale gardent une cible tactile de 44 px (le plancher du dépôt)', cases.length === 2 && cases.every(c => /min-height:44px/.test(c)), cases); }
  W.cvcTachesBloc(); W.cvcDashSection(() => true); W.cvcPropositions(); W.formAppareil('a2'); W.formAppareil('', 'c1');
  W.db.appareils.forEach(a => { W.cvcEntretienEcheance(a); W.cvcEtancheiteRegle(a); W.cvcLigneAppareil(a); });
  vrai('base identique après toutes les lectures', JSON.stringify(W.db) === avant);
  vrai('zéro save(), zéro journal', W.__saves === 0 && W.__logs.length === 0);
  vrai('le formulaire d’un appareil s’ouvre (2 fois) sans rien écrire', W.__modals.length === 2 && /cvc-form/.test(W.__modals[0]));
  const W2 = monter({ db: BASE, clientsVisibles: ['c2'] });
  W2.formAppareil('a2');
  vrai('⛔ l’appareil d’un client qu’on ne voit pas ne s’ouvre pas (visibleX à l’ouverture)', W2.__modals.length === 0 && /ne te concerne pas/.test(W2.__toasts.join('|')));
}

console.log('\n══ test-2895 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
