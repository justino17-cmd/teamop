/* ══ v738 — « REVOIS TOUTES LES RÈGLES DE CHAQUE CATÉGORIE, TOUS LES DROITS, CE QU'ON AURAIT OUBLIÉ,
   ET LE SYSTÈME DE VALIDATION DES RETOURS » ═══════════════════════════════════════════════════
   Justin, 23 septembre 2026, au lendemain de la v737. Cinq relectures (Stock et Achats, Clients et
   Ventes, Planification et Interventions, Communication / Équipe / Administration, circuit de
   validation DR), puis chaque constat JOUÉ dans la vraie page par `scratchpad/sonde-matrice-droits.js`
   : un compte qui a TOUT sauf la case essayée. Sur la v737 : 66 ✓ 66 ✗. Ce que ce banc garde :

   · DEUX DROITS GLOBAUX DOUBLAIENT LES CASES DE CATÉGORIE. Onze portes lisaient encore « Supprimer
     des éléments » ou « Créer / planifier des interventions » là où le reste lisait la catégorie :
     retirer « Interventions → Supprimer » laissait supprimer par le menu du planning, et la donner
     sans le droit global la refusait. Une action de catégorie qui n'est pas réglée SUIT désormais sa
     case de base, en direct, jusqu'à ce qu'on y touche (catDeduitRegle) ;
   · « GÉRER LES BOX » ÉTAIT UN DROIT SANS CASE, caché derrière « Supprimer des éléments » ;
   · DES GESTES ÉCRIVAIENT SANS LIRE LEUR CASE : envoyer / marquer payée / convertir (Ventes), le ✎
     de la fiche intervention, son menu de statut, dupliquer, prochain passage, Alt+glisser, 🔁 d'un
     contrat, les encaissements d'une enveloppe, la fusion des doublons, le panneau « Produits » d'une
     box, le fournisseur depuis un bon, l'Assistant devis, le devis xylophage, « Facturer cette
     intervention », et un client créé ou réécrit depuis une intervention ou un devis ;
   · LA VISIBILITÉ N'ÉTAIT QU'À L'ÉCRAN : la recherche du bandeau, la fiche client, la fiche
     intervention, les contrats, la carte, le registre, les listes de clients des formulaires, l'export
     CSV, les statistiques (chiffre d'affaires sans « Voir la comptabilité ») ;
   · LE CIRCUIT DR AVAIT DEUX PORTES DE CÔTÉ : la saisie de consommation et la quantité retapée dans
     « Modifier la box » écrivaient le stock sans validation (la seconde sans trace), et le valideur
     n'était borné à son périmètre qu'à l'écran ;
   · la création d'un chef d'équipe par l'écran Techniciens ne bornait rien (droitsBorner).
   Les gestes réservés à l'administrateur (export, import, copies, e-mails de l'entreprise, comptes,
   interrupteurs) n'étaient montrés qu'à lui — l'écran était juste, les fonctions ne vérifiaient
   rien : elles se gardent désormais elles-mêmes.

   ⛔ Les motifs visent du CODE (commentaires retirés), chaque garde doit précéder la première
   écriture de sa fonction, et les règles pures sont EXÉCUTÉES. La mesure dans une vraie page, sans et
   avec chaque case, est `scratchpad/sonde-matrice-droits.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ on ne retire que les blocs de commentaire qui COMMENCENT une ligne (voir CLAUDE.md) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i + debut.length - 1), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}
/* le corps d'une fonction par son NOM, quelle que soit sa signature (async ou non) */
function fonction(nom) {
  const m = new RegExp('(?:async\\s+)?function ' + nom + '\\(').exec(SRC); if (!m) return '';
  return bloc(SRC.slice(m.index, SRC.indexOf('{', m.index) + 1));
}
const ligne = debut => { const i = SRC.indexOf(debut); if (i < 0) return ''; return SRC.slice(i, SRC.indexOf('\n', i)); };
const compte = motif => SRC.split(motif).length - 1;

/* ─── la garde doit PRÉCÉDER la première écriture ─── */
const ECRITURES = ['save()', '.push(', '.unshift(', 'openModal(', 'srvMail(', '.splice('];
function gardeAvant(corps, garde) {
  const g = corps.indexOf(garde); if (g < 0) return { ok: false, pourquoi: 'garde absente' };
  const w = ECRITURES.map(x => corps.indexOf(x)).filter(x => x >= 0);
  const premiere = w.length ? Math.min(...w) : Infinity;
  return { ok: g < premiere, pourquoi: g < premiere ? '' : 'la garde vient après une écriture' };
}

console.log('\n── 790 · 0. la population ──');
const GARDES = [
  /* Ventes */
  ['factSetStatut', "permGarde('ventes','modifier'"], ['factEnvoyer', "permGarde('ventes','modifier'"], ['envoiDoc', "permGarde('ventes','modifier'"],
  ['factPayee', "permGarde('ventes','modifier'"], ['devisToFacture', "permGarde('ventes','ajouter'"], ['intGenererDoc', "permGarde('ventes','ajouter'"],
  ['formDevisXylo', "permGarde('ventes','ajouter'"], ['aiGenDevisXylo', "permGarde('ventes','ajouter'"], ['adCreerDevis', "permGarde('ventes','ajouter'"],
  ['devisIAModal', "permGarde('ventes','ajouter'"], ['adEnvoyer', "canCat('ventes','ajouter')"], ['delFacture', "canCat('ventes','supprimer')"],
  ['delTelecollecte', "canCat('ventes','supprimer')"], ['exportComptaTout', 'isFinanceMgr()'], ['factValider', 'isFinanceMgr()'],
  /* Interventions */
  ['genererInterventionContrat', "permGarde('int','ajouter'"], ['creerProchainPassage', "permGarde('int','ajouter'"],
  ['dupliquerIntervention', "permGarde('int','ajouter'"], ['planDup', "permGarde('int','ajouter'"],
  ['intSetClient', "permGarde('int','modifier'"], ['intPickClient', "permGarde('int','modifier'"], ['intAddDemande', "permGarde('int','modifier'"],
  ['intPushDemande', "permGarde('int','modifier'"], ['intSetStatut', 'intStatutPermis('], ['intDemarrerQuick', 'intStatutPermis('],
  ['intTerminerPrevu', 'intStatutPermis('], ['intEffectuer', 'intStatutPermis('], ['intAnnulerDo', "can('annuler')"],
  ['delIntDo', "canCat('int','supprimer')"], ['delSerieDo', "canCat('int','supprimer')"], ['intComDel', "canCat('int','supprimer')"],
  ['intDropDay', 'canPlan()'],
  /* Planification */
  ['delTache', "canCat('plan','supprimer')"], ['actDel', "canCat('plan','supprimer')"], ['delAbsence', "canCat('plan','supprimer')"],
  ['tacheToggle', "permGarde('plan','modifier'"],
  /* Stock */
  ['savePaiement', "permGarde('stock','modifier'"], ['delPaiement', "permGarde('stock','modifier'"], ['formPaiement', "permGarde('stock','modifier'"],
  ['produitsFusionnerDoublonsUI', "permGarde('stock','modifier'"], ['produitsFusionnerUnGroupe', "permGarde('stock','modifier'"],
  ['produitsDistinctsDeclarerUI', "permGarde('stock','modifier'"], ['doublonsApercu', "permGarde('stock','modifier'"],
  ['openBoxProduits', "permGarde('stock','modifier'"], ['addBoxProd', "permGarde('stock','modifier'"], ['bxpPoseEcrire', "permGarde('stock','modifier'"],
  ['bxpNouvAjouter', "permGarde('stock','modifier'"], ['bxpNouvEcarter', "permGarde('stock','modifier'"], ['bxpProposerANouveau', "permGarde('stock','modifier'"],
  ['boxRetirerCoches', "permGarde('stock','modifier'"], ['boxRetirerAnnuler', "permGarde('stock','modifier'"], ['delArrivage', "canCat('stock','supprimer')"],
  ['formBox', 'boxGererGarde('], ['saveBox', 'boxGererGarde('],
  /* Communication */
  ['fourQuickSave', "permGarde('com','modifier'"],
  /* réservé à l'administrateur */
  ['exportData', 'adminSeul()'], ['importData', 'adminSeul()'], ['sauvegardesModal', 'adminSeul()'], ['sauvegardeOuvrir', 'adminSeul()'],
  ['sauvegardeRemettre', 'adminSeul()'], ['sauvegardeRemettreStock', 'adminSeul()'], ['mailSimpleSave', 'adminSeul()'], ['mailBoxForm', 'adminSeul()'],
  ['mailBoxSave', 'adminSeul()'], ['mailBoxDel', 'adminSeul()'], ['mailAssignSet', 'adminSeul()'], ['resetPwd', 'adminSeul()'],
  ['delUser', 'adminSeul()'], ['delUserEnvoyer', 'adminSeul()'], ['delUserConfirme', 'adminSeul()'], ['validDRTousSet', 'adminSeul()'], ['bonsRemiseSet', 'adminSeul()'],
];
const introuvables = GARDES.filter(([n]) => !fonction(n)).map(([n]) => n);
v('les ' + GARDES.length + ' fonctions gardées sont trouvées dans le fichier réel', introuvables, []);
vrai('population : plus de 70 portes', GARDES.length > 70, GARDES.length);

console.log('\n── 790 · 1. ⛔⛔ chaque porte lit SA case, AVANT d\'écrire quoi que ce soit ──');
const fautes = [];
for (const [n, g] of GARDES) { const r = gardeAvant(fonction(n), g); if (!r.ok) fautes.push(n + ' : ' + r.pourquoi); }
v('aucune porte sans garde, ni garde après une écriture', fautes, []);
const ch = fonction('intEditField');
vrai('le ✎ de la fiche intervention : les champs de la FICHE lisent « Modifier » (INT_CHAMPS_FICHE)', /INT_CHAMPS_FICHE\.includes\(f\)&&!permGarde\('int','modifier'/.test(ch) && gardeAvant(ch, 'INT_CHAMPS_FICHE').ok, ch.slice(0, 200));
const CF = ligne('const INT_CHAMPS_FICHE=');
vrai('… et les champs du RAPPORT restent au terrain (matériel, zones, note interne, justification, non-travaillé)',
  ['date', 'heure', 'duree', 'titre', 'type', 'rapportModele', 'adresse', 'contactSurPlace'].every(x => CF.includes("'" + x + "'"))
  && !['materiel', 'zones', 'noteInterne', 'justifAppatage', 'nonTravaille'].some(x => CF.includes("'" + x + "'")), CF);
const va = bloc('views.assistantDevis=function(){');
vrai('l\'Assistant devis refuse son écran sans « Devis IA » ni « Ventes → Ajouter »', /if\(!can\('devisIA'\)\|\|!canCat\('ventes','ajouter'\)\)/.test(va) && va.indexOf("can('devisIA')") < va.indexOf('adCode()'), va.slice(0, 160));
/* ⛔ ce contexte part chez Anthropic (sous-traitance.html) : c'est la seule liste de clients
   envoyée à l'IA — les deux autres appels n'envoient qu'une intervention ou un PDF importé.
   Mutation « tous les clients partent » : aucun banc ne tombait avant ce contrôle. */
const ae = fonction('adEnvoyer'), aeCtx = ae.slice(ae.indexOf('contexte:'), ae.indexOf('contexte:') + 260);
vrai('… et n\'envoie à Anthropic que les clients qu\'on voit (visibleClients), jamais db.clients entier',
  ae.includes('contexte:') && /clients:visibleClients\(db\.clients\|\|\[\]\)/.test(aeCtx) && !/clients:\s*\(?\s*db\.clients/.test(aeCtx), aeCtx);

console.log('\n── 790 · 2. ⛔⛔ les deux droits globaux ne décident plus d\'aucune porte ──');
v("can('creerIntervention') : plus aucune lecture — c'est « Interventions → Ajouter »", compte("can('creerIntervention')"), 0);
v("can('supprimer') : une seule lecture, la catégorie-repli de delItem (collections sans catégorie)", compte("can('supprimer')"), 1);
vrai('… et c\'est bien delItem', /_grp \? !canCat\(_grp,'supprimer'\) : !can\('supprimer'\)/.test(SRC));
const menu = fonction('planCtxItemsCard');
vrai('le menu d\'une carte du planning : « Modifier » lit la modification, « Dupliquer » la création',
  /canCat\('int','modifier'\)\) items\.push\(\{ic:ico\('crayon'\),l:'Modifier'/.test(menu) && /if\(canCat\('int','ajouter'\)\)\{\s*items\.push\(\{ic:ico\('copie'\),l:'Dupliquer'/.test(menu), menu.slice(0, 300));
const creer = bloc('function creerDispo(){');
vrai('la feuille « Créer » ne propose que ce qu\'on peut créer (peut())', /canSee\(it\) && e\.peut\(\)/.test(creer));
const CE = SRC.slice(SRC.indexOf('const CREER_ENTREES=['), SRC.indexOf('];', SRC.indexOf('const CREER_ENTREES=[')));
v('… et chacune de ses six tuiles dit laquelle', (CE.match(/peut:\(\)=>/g) || []).length, 6);

console.log('\n── 790 · 3. la règle des actions de catégorie — EXÉCUTÉE ──');
const P = { catRegle: bloc('function catDeduitRegle(grp,droit){'), catDroit: bloc('function catDroit(u,grp,droit){'),
  capRegle: bloc('function capDeduitRegle(cap){'), userCap: bloc('function userCap(u,cap){'), can: bloc('function can(cap){'),
  canCat: bloc('function canCat(grp,droit){'), boxGerer: bloc('function boxGerer(droit){'), boxGarde: bloc('function boxGererGarde(droit){'),
  permGarde: bloc('function permGarde(grp,droit,quoi){'), statut: bloc('function intStatutPermis(i,st){'),
  proposes: bloc('function clientsProposes(garde){'), propose: bloc('function clientPropose(id,garde){') };
v('toutes les pièces sont trouvées', Object.keys(P).filter(k => !P[k]), []);
v('une seule définition de catDeduitRegle, de boxGerer, de clientsProposes', ['catDeduitRegle', 'boxGerer', 'clientsProposes'].map(n => compte('function ' + n + '(')), [1, 1, 1]);
function monde() {
  const ctx = { db: { users: [], permissions: {}, clients: [] }, currentUser: null, Object, JSON, Set, Array, __t: [] };
  vm.createContext(ctx);
  vm.runInContext('const CAPS={technicien:{supprimer:0,creerIntervention:0},chefEquipe:{supprimer:0,creerIntervention:0}};\nfunction toast(m){ __t.push(m); }\n'
    + [P.capRegle, P.userCap, P.can, P.catRegle, P.catDroit, P.canCat, P.permGarde, P.boxGerer, P.boxGarde, P.statut, P.proposes, P.propose].join('\n'), ctx);
  return ctx;
}
const W = monde();
const pers = (caps, role) => ({ id: 'u' + Math.random().toString(36).slice(2, 6), role: role || 'technicien', acces: { caps: caps || {}, modules: {} } });
const cat = (u, g, d) => { W.currentUser = u; return W.canCat(g, d); };
v('« 🗑 Supprimer » d\'une catégorie SUIT « Supprimer des éléments » tant qu\'il n\'est pas réglé',
  [cat(pers({ supprimer: true }), 'stock', 'supprimer'), cat(pers({ supprimer: false }), 'stock', 'supprimer')], [true, false]);
v('… et se RÈGLE à part, dans les deux sens',
  [cat(pers({ supprimer: false, cat_int_supprimer: true }), 'int', 'supprimer'), cat(pers({ supprimer: true, cat_int_supprimer: false }), 'int', 'supprimer')], [true, false]);
v('« Interventions → ＋ Ajouter » suit « Créer / planifier des interventions »',
  [cat(pers({ creerIntervention: true }), 'int', 'ajouter'), cat(pers({ creerIntervention: false }), 'int', 'ajouter'), cat(pers({ creerIntervention: false, cat_int_ajouter: true }), 'int', 'ajouter')], [true, false, true]);
v('… les autres actions restent ouvertes par défaut (rien ne change le jour de la mise à jour)',
  [cat(pers({}), 'stock', 'ajouter'), cat(pers({}), 'ventes', 'modifier'), cat(pers({}), 'plan', 'modifier')], [true, true, true]);
v('« Gérer les box » : par défaut, qui a « Supprimer des éléments » (la veille exacte)',
  [(W.currentUser = pers({ supprimer: true }), W.can('gererBoxes')), (W.currentUser = pers({ supprimer: false }), W.can('gererBoxes'))], [true, false]);
v('… et gérer une box demande LES DEUX cases (gérer + l\'action du Stock)',
  [(W.currentUser = pers({ gererBoxes: true }), W.boxGerer('modifier')), (W.currentUser = pers({ gererBoxes: true, cat_stock_modifier: false }), W.boxGerer('modifier')),
   (W.currentUser = pers({ gererBoxes: false }), W.boxGerer('ajouter'))], [true, false, false]);
W.__t.length = 0; W.currentUser = pers({ gererBoxes: false });
v('… et le refus se dit, en nommant la case', [W.boxGererGarde('modifier'), /Gérer les box/.test(W.__t[0] || '')], [false, true]);

console.log('\n── 790 · 4. le statut d\'une intervention — EXÉCUTÉ ──');
vm.runInContext('var __moi="tT"; function myTechId(){ return __moi; } function intTechIds(i){ return i.techIds||[]; }', W);
const miens = { techIds: ['tT'] }, autre = { techIds: ['tK'] };
const st = (u, i, s) => { W.currentUser = u; return W.intStatutPermis(i, s); };
v('sans « Modifier » : démarrer et terminer SA propre intervention restent possibles (travail de terrain)',
  [st(pers({ cat_int_modifier: false }), miens, 'encours'), st(pers({ cat_int_modifier: false }), miens, 'terminee')], [true, true]);
v('… mais pas la repasser « à planifier », ni toucher celle d\'un collègue',
  [st(pers({ cat_int_modifier: false }), miens, 'aplanifier'), st(pers({ cat_int_modifier: false }), autre, 'encours')], [false, false]);
v('avec « Modifier » : tout statut ; l\'annulation garde son droit à elle',
  [st(pers({}), autre, 'aplanifier'), st(pers({ annuler: false }), autre, 'annulee'), st(pers({ annuler: true }), autre, 'annulee')], [true, false, true]);

console.log('\n── 790 · 5. les listes de clients — EXÉCUTÉES ──');
vm.runInContext('var __vus=["c1"]; function visibleClients(l){ return (l||[]).filter(c=>__vus.includes(c.id)); }', W);
W.db.clients = [{ id: 'c1', nom: 'Vu' }, { id: 'c2', nom: 'Pas vu' }];
v('une liste de choix ne propose que les clients qu\'on voit', W.clientsProposes().map(c => c.id), ['c1']);
v('… plus celui déjà choisi, pour ne pas le perdre en réenregistrant', W.clientsProposes('c2').map(c => c.id), ['c1', 'c2']);
v('et l\'enregistrement le vérifie', [W.clientPropose('c1'), W.clientPropose('c2'), W.clientPropose('c2', 'c2'), W.clientPropose('')], [true, false, true, false]);
const selects = (SRC.match(/\$\{db\.clients\.map\(c=>`<option/g) || []).length;
v('aucun formulaire ne liste db.clients en entier dans un <select>', selects, 0);
for (const [n, attendu] of [['saveDoc', 'clientPropose('], ['saveContrat', 'clientPropose('], ['intSetClient', 'clientPropose('], ['cliFilter', 'clientsProposes()'], ['xcliFilter', 'clientsProposes()']])
  vrai(n + ' passe par ' + attendu, fonction(n).includes(attendu));

console.log('\n── 790 · 6. ⛔⛔ voir : la règle est dans la FONCTION, pas seulement dans la liste ──');
const g = fonction('gsearch'), rs = fonction('renderSearch');
vrai('la recherche du bandeau : clients, interventions et tâches par le filtre de leur écran',
  /rechVoit\('clients'\)\?visibleClients\(db\.clients\)/.test(g) && /rechVoit\('interventions'\)\?visibleInts\(db\.interventions\)/.test(g) && /rechVoit\('taches'\)\?mesTaches\(\)/.test(g), g.slice(0, 400));
vrai('« Rechercher partout » : aucune famille lue en entier',
  !/add\(db\.(clients|devis|factures|produits|fournisseurs|boxes|vehicules)\b/.test(rs) && /V\('devis',visibleDocs\(db\.devis\)\)/.test(rs) && /V\('clients',visibleClients\(db\.clients\)\)/.test(rs));
vrai('la fiche client refuse un client hors périmètre, et ne montre que ce qu\'on voit',
  gardeAvant(fonction('ficheClient'), 'visibleClients([c]).length').ok && /visibleInts\(db\.interventions\.filter/.test(fonction('ficheClient')) && /visibleDocs\(db\.devis\.filter/.test(fonction('ficheClient')));
vrai('la fiche intervention : refusée à l\'ouverture, et plus redessinée chez qui ne la voit plus',
  /visibleInts\(\[_v\]\)\.length/.test(fonction('detailIntervention')) && /if\(!visibleInts\(\[i\]\)\.length\)/.test(fonction('renderIntDetail')));
vrai('Contrats : visibleDocs, comme devis et factures', /const list=\[\.\.\.visibleDocs\(db\.contrats\)\]/.test(bloc('views.contrats=function(){')));
vrai('la carte des interventions : visibleInts', /return visibleInts\(db\.interventions\)\.filter\(i=>i\.date===day\)/.test(fonction('intPoints')));
vrai('l\'export CSV des clients : visibleClients', /visibleClients\(db\.clients\)\.map/.test(fonction('exportClientsCsv')));
vrai('le registre : on ne choisit que parmi ses clients', /const clientsAvecInts=visibleClients\(db\.clients\)/.test(bloc('views.registre=function(){')));
const stats = bloc('views.statistiques=function(){');
vrai('Statistiques : le chiffre d\'affaires n\'est ÉCRIT que pour « Voir la comptabilité », sur ce qu\'on voit',
  /const fin=isFinanceMgr\(\); const FA=fin\?visibleDocs\(db\.factures\|\|\[\]\):\[\]/.test(stats) && /const kpisArgent=fin\?`/.test(stats) && /\$\{fin\?`\s*<div class="card"><div class="card-head"><h3>Top clients/.test(stats), stats.slice(0, 300));
vrai('« dans toutes les box » : celles qu\'on voit', /if\(allBoxes&&pid\)\{ let n=0; visibleBoxes\(db\.boxes\)\.forEach/.test(fonction('saveProduit')));
vrai('visibleDocs : les clients qu\'on voit (et ceux qu\'on a créés), plus mesClientIds seul',
  /const ids=new Set\(visibleClients\(db\.clients\|\|\[\]\)\.map\(c=>c\.id\)\)/.test(bloc('function visibleDocs(list){')));
const creePar = ['saveDoc', 'devisToFacture', 'intGenererDoc', 'adCreerDevis', 'aiGenDevisXylo', 'devisIAGo', 'saveContrat'].filter(n => !/creePar:\(currentUser&&currentUser\.id\)/.test(fonction(n)));
v('… et chaque document neuf retient qui l\'a fait (sinon il disparaît de la liste de son auteur)', creePar, []);

console.log('\n── 790 · 7. ⛔⛔ le circuit DR : plus de porte de côté ──');
const ca = fonction('consoAdj');
vrai('la saisie de consommation : une box qu\'on voit, et la validation DR avant toute écriture',
  gardeAvant(ca, 'visibleBoxes([b]).length').ok && gardeAvant(ca, 'if(boxValidRequis()){ consoVersListe(').ok);
vrai('… la sortie rejoint la liste de la box (boxAdj, le chemin du « ± »)', /boxAdj\(pid,'u',delta\)/.test(fonction('consoVersListe')));
vrai('… et la liste de choix des box : visibleBoxes', /consoBox=this\.value;renderConso\(\)"><option value="">— Choisir une box —<\/option>\$\{visibleBoxes\(db\.boxes\)/.test(SRC));
const sb = fonction('saveBox');
vrai('« Modifier la box » : sous validation, la quantité retapée part au DR (un lot), le stock ne bouge pas',
  /const soumis=boxValidRequis\(\)/.test(sb) && /if\(soumis\)\{ if\(!vivant\[pid\]\) stock\[pid\]=\{ctn:0,u:0\};/.test(sb) && /boxMvtEnvoyer\(\{type:'ajustementLot',boxId:bid,lignes:lignesDR/.test(sb));
vrai('… sans validation, elle s\'écrit ET se trace (la différence réellement appliquée)', /traces\.forEach\(\(\[pid,d,u\]\)=>traceBox\(bb,pid,d,u,/.test(sb) && /const ru=\(\+ap\.u\|\|0\)-\(\+v\.u\|\|0\)/.test(sb));
vrai('le valideur est borné à son périmètre dans la FONCTION (mouvements)', gardeAvant(fonction('boxMvtValider'), 'visibleBoxMvts([m]).length').ok);
vrai('… et pour les demandes de commande', /if\(!visibleDemandes\(\[d\]\)\.length\)/.test(fonction('validerDemande')));
vrai('⚠️ pas de garde « sa propre demande » : un DR valide ses demandes de commande dans le circuit normal', !/chefId===currentUser\.id&&currentUser\.role!=='admin'/.test(fonction('validerDemande')));

console.log('\n── 790 · 8. ⛔ créer un compte ne donne pas plus qu\'on n\'a — par TOUTES les portes ──');
const tech = fonction('saveTech');
const iB = tech.indexOf('droitsBorner(nu,currentUser)'), iP = tech.indexOf('db.users.push(nu)');
vrai('l\'écran Techniciens borne le compte qu\'il crée, AVANT de l\'enregistrer', iB > 0 && iB < iP, [iB, iP]);
v('les deux portes de création de compte appellent droitsBorner', compte('droitsBorner(nu,currentUser)'), 2);

console.log('\n── 790 · 9. l\'écran des droits : une action déduite suit sa base, et ne s\'écrit que touchée ──');
const vd = fonction('usrDroitsValider'), pl = fonction('profilLireZone'), dz = fonction('usrDeduireZone');
vrai('la validation n\'écrit pas une action de catégorie déduite qu\'on n\'a pas touchée', /if\(!c\|\|c\.dataset\.deduit==='1'\) return; u\.acces\.caps\['cat_'\+g\+'_'\+d\]=!!c\.checked/.test(vd));
vrai('… un profil non plus', /if\(!c\|\|c\.dataset\.deduit==='1'\) return; caps\['cat_'\+g\+'_'\+d\]=!!c\.checked/.test(pl));
vrai('… et l\'écran la recalcule en direct depuis sa base (catDeduitRegle)', /d\.indexOf\('cat_'\)===0\)\{ const m=d\.split\('_'\); const r=catDeduitRegle\(m\[1\],m\[2\]\)/.test(dz));
v('« Gérer les box » a sa case, rangée dans le Stock', [/\['gererBoxes','Gérer les box',/.test(SRC), /stock:\['gererBoxes'\]/.test(ligne('const PERM_SPECIAUX={'))], [true, true]);

console.log(`\n════ test-790 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
