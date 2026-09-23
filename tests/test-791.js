/* ══ v739 — LES DÉCISIONS DE JUSTIN SUR LES DROITS (23 septembre 2026, tard le soir) ══════════
   Réponses de Justin aux sept questions laissées par la v738 (REPRISE.md, section du 23 septembre) :

   · « réservés à l'admin, mais il peut donner le droit à la personne qu'il veut » — quatre gestes
     tenaient au NOM du rôle (`role==='admin'`, `adminSeul()`) : effacer les prix pré-remplis,
     supprimer une demande de l'historique, supprimer une commande de l'historique d'une box, revenir
     sur les « c'est normal » des doublons. Ce sont désormais des CASES, fermées par défaut ;
   · « si ce n'est pas le même technicien, il faut qu'il puisse modifier le plan » — le technicien
     reçoit « Modifier les plans » par défaut (CAPS_HERITE, posé par la reprise) ;
   · « ils ont tout le pouvoir de le faire, c'est normal » — une intervention SANS technicien
     n'entrait dans le périmètre de personne : qui peut planifier la voit désormais, pour l'affecter ;
     « Ma journée » ne la montre pas ;
   · « plus rien en hors ligne, que du en ligne » — c'est déjà le cas (« Connexion requise »), mais
     deux appareils EN LIGNE qui valident le même mouvement dans la même seconde écrivaient deux
     lignes d'historique (8 unités sorties pour 4 réelles). Une ligne née d'une validation porte
     désormais un identifiant tiré du mouvement : la synchro n'en garde qu'une.

   ⛔ Les fonctions sont EXTRAITES d'app.html et EXÉCUTÉES (l'extracteur est celui de test-639 : la
   fonction entière, bornée à la déclaration suivante). Les motifs de forme visent du CODE,
   commentaires retirés. La mesure dans une vraie page est `scratchpad/sonde-matrice-droits.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ on ne retire que les blocs de commentaire qui COMMENCENT une ligne (voir CLAUDE.md) */
const SRC = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function decoupe(h) { const d = APP.indexOf(h); if (d < 0) throw new Error('introuvable : ' + h);
  const suite = /\n(?=(?:function |const |let |var |class |async function |\/\* |views\.|document\.|window\.|try\{))/g;
  suite.lastIndex = d + h.length;
  const m = suite.exec(APP); const fin = m ? m.index : Math.min(APP.length, d + 80000);
  let bout = APP.slice(d, fin);
  for (;;) { const k = Math.max(bout.lastIndexOf('}'), bout.lastIndexOf(';')); if (k < 0) break;
    const t = bout.slice(0, k + 1);
    try { new Function(t); return t; } catch (e) { bout = bout.slice(0, k); } }
  throw new Error('fin introuvable : ' + h); }
/* le corps d'une fonction, commentaires retirés, pour les contrôles de FORME */
function corps(nom) { const m = new RegExp('(?:async\\s+)?function ' + nom + '\\(').exec(SRC); if (!m) return '';
  let i = SRC.indexOf('{', m.index), p = 0;
  for (let k = i; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) return SRC.slice(m.index, k + 1); } }
  return ''; }
const ECRITURES = ['save()', '.push(', '.unshift(', 'confirm(', '.splice(', '=[]'];
const gardeAvant = (c, g) => { const i = c.indexOf(g); if (i < 0) return false;
  const w = ECRITURES.map(x => c.indexOf(x)).filter(x => x >= 0); return i < (w.length ? Math.min(...w) : Infinity); };

console.log('── 791 · 1. les quatre gestes d\'administrateur sont des CASES, fermées par défaut ──');
const QUATRE = { effacerPrix: ['prixEffacer', 'stock'], supprimerHistoDemandes: ['demHistoSuppr', 'achats'],
  supprimerHistoCommandes: ['boxCmdSuppr', 'stock'], revoirDistincts: ['produitsDistinctsRevoir', 'stock'] };
/* la livraison sans bon (boxLivrSuppr) lit la même case que la commande : c'est le même historique de box */
const UC = decoupe('const USER_CAPS=['), PS = decoupe('const PERM_SPECIAUX=');
const W = { Object, JSON, Set, Array, String, db: { users: [], permissions: {} }, currentUser: null, __t: [] };
vm.createContext(W);
vm.runInContext([UC, PS, decoupe('const CAPS_HERITE = {'), decoupe('const CAPS = Object.fromEntries'),
  decoupe('function capDeduitRegle(cap){'), decoupe('function userCap(u,cap){'), decoupe('function can(cap){'),
  'function toast(m){ __t.push(m); }', decoupe('function caseGarde(cap,libelle){'),
  'this.USER_CAPS=USER_CAPS; this.PERM_SPECIAUX=PERM_SPECIAUX; this.CAPS_HERITE=CAPS_HERITE;'].join('\n'), W);
const cles = W.USER_CAPS.map(x => x[0]);
v('les quatre cases existent dans USER_CAPS, avec un libellé et ce qu\'elles ouvrent',
  Object.keys(QUATRE).map(k => { const c = W.USER_CAPS.find(x => x[0] === k); return !!(c && c[1] && c[2]); }), [true, true, true, true]);
v('… une seule fois chacune', Object.keys(QUATRE).map(k => cles.filter(x => x === k).length), [1, 1, 1, 1]);
v('… et chacune est rangée sous sa catégorie (elle paraît sur la ligne de la personne et dans les profils)',
  Object.entries(QUATRE).map(([k, [, g]]) => (W.PERM_SPECIAUX[g] || []).includes(k)), [true, true, true, true]);
const pers = (caps, role) => ({ id: 'u' + Math.random().toString(36).slice(2, 7), role: role || 'dr', acces: { caps: caps || {}, modules: {} } });
/* la reprise pose CAPS_HERITE dans les profils : c'est l'état réel d'une entreprise après la v737 */
for (const [r, c] of Object.entries(W.CAPS_HERITE)) if (r !== 'admin') W.db.permissions[r] = { caps: Object.fromEntries(Object.entries(c).map(([k, x]) => [k, !!x])) };
v('FERMÉES par défaut, même pour un DR ou un chef d\'équipe (profils repris)',
  Object.keys(QUATRE).flatMap(k => ['dr', 'chefEquipe', 'commercial', 'technicien'].map(r => W.userCap(pers({}, r), k))), Array(16).fill(false));
v('l\'administrateur les a toutes, d\'office', Object.keys(QUATRE).map(k => W.userCap({ role: 'admin' }, k)), [true, true, true, true]);
v('… et l\'administrateur les DONNE à qui il veut : la case cochée sur la personne suffit',
  Object.keys(QUATRE).map(k => W.userCap(pers({ [k]: true }, 'technicien'), k)), [true, true, true, true]);
W.__t.length = 0; W.currentUser = pers({}, 'dr');
v('le refus se dit, et nomme la case à demander', [W.caseGarde('effacerPrix', 'Effacer les prix pré-remplis du catalogue'), /Effacer les prix pré-remplis/.test(W.__t[0] || '')], [false, true]);
W.currentUser = pers({ revoirDistincts: true }, 'dr');
v('… et laisse passer qui l\'a reçue', W.caseGarde('revoirDistincts', 'x'), true);
for (const [k, [fn]] of Object.entries(QUATRE)) {
  const c = corps(fn);
  vrai(fn + ' : sa garde lit la case « ' + k + ' », AVANT toute écriture et toute question', gardeAvant(c, "caseGarde('" + k + "'"), c.slice(0, 160));
  vrai(fn + ' : plus aucune lecture du nom de rôle ni d\'adminSeul()', !/role\s*[!=]==?\s*'admin'|adminSeul\(\)/.test(c), c.slice(0, 160));
}
{ const c = corps('boxLivrSuppr');
  vrai('boxLivrSuppr (une livraison de l\'historique) : la même case que les commandes, AVANT toute question', gardeAvant(c, "caseGarde('supprimerHistoCommandes'") && !/adminSeul\(\)/.test(c), c.slice(0, 160)); }
vrai('le ✕ d\'une livraison lit la case', /\$\{can\('supprimerHistoCommandes'\)\?`<button type="button" class="dos-x" onclick="event\.stopPropagation\(\);boxLivrSuppr\(/.test(SRC));
{ const c = corps('boxCmdSuppr');
  vrai('⛔ une commande dont la réception ATTEND le DR ne s\'efface pas — même par l\'admin (le stock ne serait jamais crédité)',
    /if\(bonAttenteDR\(b\)\)\{ toast\(/.test(c) && c.indexOf('bonAttenteDR(b)') < c.indexOf('confirm('), c.slice(0, 300)); }
vrai('l\'éditeur des droits ne dit plus « ce n\'est pas une case à cocher »', !/n\\'est pas une case à cocher/.test(APP) && /Il peut confier chacun de ces gestes/.test(APP));
vrai('le bouton « Effacer les prix » lit la case', /\(_np&&can\('effacerPrix'\)\)\?/.test(SRC));
vrai('le ✕ d\'une demande de l\'historique lit la case', /\$\{can\('supprimerHistoDemandes'\)\?`<button type="button" class="dos-x" onclick="event\.stopPropagation\(\);demHistoSuppr\(/.test(SRC));
vrai('le ✕ d\'une commande de l\'historique d\'une box lit la case', /\$\{can\('supprimerHistoCommandes'\)\?`<button type="button" class="dos-x" onclick="event\.stopPropagation\(\);boxCmdSuppr\(/.test(SRC));
vrai('la ligne « paires acceptées comme distinctes » (et son bouton) lit la case', /if\(!L\.length\|\|!can\('revoirDistincts'\)\) return '';/.test(corps('produitsDistinctsLigne')));

console.log('\n── 791 · 2. « Modifier les plans » : le technicien l\'a par défaut ──');
v('CAPS_HERITE : le technicien reçoit modifierPlans (le commercial et la compta non)',
  [W.CAPS_HERITE.technicien.modifierPlans, W.CAPS_HERITE.commercial.modifierPlans, W.CAPS_HERITE.compta.modifierPlans], [1, 0, 0]);
{ const R = { Object, JSON, Set, db: { permissions: {} }, NAV: [{ items: [{ k: 'interventions' }] }], journal: [] };
  vm.createContext(R);
  vm.runInContext([decoupe('const CAPS_HERITE = {'), 'function moduleHeriteRole(){ return true; }', 'function logEvent(a){ journal.push(a); }',
    decoupe('function reprendreDroitsImplicites(){')].join('\n'), R);
  const fait = R.reprendreDroitsImplicites();
  v('la VRAIE reprise l\'écrit dans le profil Technicien d\'une entreprise qui ne l\'a pas encore faite',
    [fait, R.db.permissions.technicien.caps.modifierPlans, R.db.permissions.commercial.caps.modifierPlans], [true, true, false]);
  R.db.permsRepris = 0; R.db.permissions.technicien.caps.modifierPlans = false;
  R.reprendreDroitsImplicites();
  v('… sans jamais réécrire une case déjà posée (on ne change pas un droit au seul chargement)', R.db.permissions.technicien.caps.modifierPlans, false); }
W.db.permissions.technicien.caps.modifierPlans = true;
vrai('un technicien sans réglage personnel a donc le droit, et le perd si l\'admin le décoche',
  W.userCap(pers({}, 'technicien'), 'modifierPlans') === true && W.userCap(pers({ modifierPlans: false }, 'technicien'), 'modifierPlans') === false);

{ const c = corps('paDelPlan');
  vrai('⛔ supprimer un plan ENTIER lit aussi « Interventions → Supprimer » (le technicien modifie, il n\'efface pas un plan)',
    /if\(!canCat\('int','supprimer'\)\)\{ toast\(/.test(c) && c.indexOf("canCat('int','supprimer')") < c.indexOf('confirm('), c.slice(0, 300));
  vrai('… et son 🗑 ne s\'affiche qu\'avec ce droit', /\$\{canCat\('int','supprimer'\)\?`<button class="btn ghost sm" style="color:var\(--red\)" onclick="paDelPlan\(/.test(SRC)); }

console.log('\n── 791 · 3. une intervention SANS technicien : qui peut planifier la voit, pour l\'affecter ──');
{ const X = { Set, Array };
  vm.createContext(X);
  vm.runInContext(['var __caps={}, __perim=null, __moi="tMoi";',
    'function can(c){ return !!__caps[c]; }', 'function perimetreTechIds(){ return __perim; }', 'function myTechId(){ return __moi; }',
    decoupe('function intTechIds(i){'), decoupe('function canPlan(){'), decoupe('function visibleInts(list,aAffecter){')].join('\n'), X);
  const L = [{ id: 'moi', techIds: ['tMoi'] }, { id: 'equipe', techIds: ['tEq'] }, { id: 'autre', techIds: ['tAutre'] }, { id: 'libre', techIds: [] }, { id: 'libreAncien', techId: '' }];
  const vu = (caps, perim, aff) => { X.__caps = caps; X.__perim = perim ? new Set(perim) : null; return X.visibleInts(L, aff).map(i => i.id); };
  v('DR rattaché à une équipe ET qui planifie, dans un écran où l\'on affecte : son équipe, et les interventions à affecter', vu({ voirTout: 1, planifDeplacer: 1 }, ['tEq', 'tMoi'], true), ['moi', 'equipe', 'libre', 'libreAncien']);
  v('⛔⛔ … mais PARTOUT AILLEURS (clients, documents, compteurs, exports) : la règle d\'avant, sans elles', vu({ voirTout: 1, planifDeplacer: 1 }, ['tEq', 'tMoi']), ['moi', 'equipe']);
  v('… sans « Déplacer le planning » : son équipe seulement, même dans le planning', vu({ voirTout: 1 }, ['tEq', 'tMoi'], true), ['moi', 'equipe']);
  v('… et jamais l\'intervention d\'une AUTRE équipe', vu({ voirTout: 1, planifDeplacer: 1 }, ['tEq'], true).includes('autre'), false);
  v('« Tout voir » sans équipe : tout, comme avant', vu({ voirTout: 1 }, null), ['moi', 'equipe', 'autre', 'libre', 'libreAncien']);
  v('un technicien à qui l\'on donne « Déplacer le planning » : les siennes et celles à affecter, dans le planning', vu({ planifDeplacer: 1 }, null, true), ['moi', 'libre', 'libreAncien']);
  v('⛔⛔ … et ses CLIENTS restent les siens : l\'option n\'est pas passée hors du planning', vu({ planifDeplacer: 1 }, null), ['moi']);
  v('un technicien sans ce droit : les siennes seulement', vu({}, null, true), ['moi']); }
/* Où l'option est passée, et surtout où elle NE l'est PAS — la cascade qui ouvrait les clients. */
{ const fonc = n => corps(n) || (SRC.indexOf(n + '=function(){') >= 0 ? (() => { const i = SRC.indexOf(n + '=function(){'); let k = SRC.indexOf('{', i), p = 0; for (; k < SRC.length; k++) { if (SRC[k] === '{') p++; else if (SRC[k] === '}') { p--; if (!p) break; } } return SRC.slice(i, k + 1); })() : '');
  const AVEC = ['gsearch', 'pgPersOccupes', 'pgPersRender', 'views.planningGeneral', 'tdbDetail', 'tdbPlanning', 'planFilterSrc', 'planPeriodeInts', 'planTypesConnus', 'planJoursMenu', 'planCalHtml', 'views.interventions', 'renderSearch', 'ouvrables'];
  const SANS = ['mesClientIds', 'refreshBadges', 'tdbRetards', 'exportInterventionsCsv', 'exportClientsCsv', 'views.rapports', 'intPoints', 'views.factures', 'views.statistiques', 'computeNotifs'];
  v('les écrans où l\'on affecte passent l\'option (planning, liste, recherche, ouverture de la fiche)', AVEC.filter(n => !/visibleInts\(db\.interventions(\|\|\[\])?,true\)/.test(fonc(n))), []);
  v('⛔⛔ et AUCUN autre ne la passe : clients (mesClientIds), compteurs, exports, rapports, carte, factures, statistiques, notifications', SANS.filter(n => /visibleInts\([^)]*,true\)/.test(fonc(n)) || !fonc(n)), []);
  v('… en tout : 16 appels avec l\'option, pas un de plus', (SRC.match(/visibleInts\([^()]*(?:\([^()]*\))?[^()]*,true\)/g) || []).length, 16);
  const O = corps('ouvrables');
  vrai('ouvrables : la fiche d\'une intervention à affecter s\'ouvre, mais les CLIENTS restent ceux qu\'on voit (visibleClients, sans option)',
    /const clis=new Set\(visibleClients\(db\.clients\|\|\[\]\)/.test(O) && /const ints=new Set\(visibleInts\(db\.interventions\|\|\[\],true\)/.test(O), O); }
const TD = corps('renderIntTechDay');
vrai('« Ma journée » ne montre que SES interventions — pas celles à affecter',
  /\{ const tid=myTechId\(\); SRC=\(SRC\|\|\[\]\)\.filter\(i=>intTechIds\(i\)\.includes\(tid\)\); \}/.test(TD) && TD.indexOf('SRC=(SRC||[]).filter') < TD.indexOf('const act=SRC.filter'), TD.slice(0, 300));

console.log('\n── 791 · 4. deux validations du même mouvement : une seule ligne d\'historique ──');
const VAL = corps('boxMvtValider');
v('boxMvtValider : chaque ligne de mouvement qu\'elle écrit porte un identifiant tiré du mouvement (7 endroits)',
  (VAL.match(/'mvv:'\+m\.id\+':'/g) || []).length, 7);
v('… et celles qui parcourent des LIGNES (arrivage, lot) y mettent le rang de la ligne : deux lignes du même produit ne partagent pas un identifiant',
  (VAL.match(/'mvv:'\+m\.id\+':'\+kl\+':'/g) || []).length, 3);
vrai('l\'arrivage validé entre UNE fois dans l\'historique de la box (b.arrivages, réuni par identifiant)', /b\.arrivages\.unshift\(\{id:'mvv:'\+m\.id\+':arr',/.test(VAL));
vrai('le bon de remise né d\'une validation porte un identifiant tiré du mouvement (un seul bon, même validé deux fois)', /br=\{id:\(m&&m\.id\?'br:'\+m\.id:uid\(\)\),num:nextNum\('bonsRemise'/.test(corps('remiseAjoute')));
vrai('… traceBox le prend, et garde uid() pour tout le reste', /function traceBox\(b,pid,delta,unit,motif,par,validePar,donneA,idFixe\)\{[\s\S]{0,80}db\.mouvements\.unshift\(\{id:idFixe\|\|uid\(\),/.test(SRC));
vrai('… et le journal, lui, garde une ligne PAR PERSONNE qui a cliqué (une ligne par geste)', /logEvent\('Mouvement box validé'/.test(VAL) && !/logEvent\([^;]*'mvv:/.test(VAL));
{ /* Deux appareils, les VRAIES fonctions : traceBox, estampiller, ombreRelever, boxFusionFine, fusionnerBases. */
  const CODE = ['const COLLS_HORS_FUSION=', 'function collsFusion(d){', 'const COLLS_DICT=', 'function dictFusion(prio,autre){',
    'function recEmpreinte(r){', 'const stockEmpreinte=', 'const MS_MAX=', 'let _ombre={}, _ombreStock={};',
    'function ombreRelever(o,os){', 'const TOMBE_JOURS=', 'function estampiller(){', 'function msElaguer(ms,st,now){',
    'function boxFusionFine(gagnante,perdante){', 'function tombesElaguer(t,now){', 'function tombesUnion(a,b){', 'function numMaxUnion(a,b){',
    'function fusionnerBases(local,remote,prioriteLocale){', 'function traceBox(b,pid,delta,unit,motif,par,validePar,donneA,idFixe){'].map(decoupe).join('\n');
  const neuf = new Function('etat', `let db=etat.db; const syncEnabled=()=>true; let currentUser=null;
    const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8); const roleDeNom=()=>'';
    ${CODE}
    return { estampiller, ombreRelever, fusionnerBases, traceBox, getDb:()=>db };`);
  const copie = o => JSON.parse(JSON.stringify(o));
  const BASE = { boxes: [{ id: 'bx', nom: 'Cuisine', actif: true, stock: { P: { u: 5, ctn: 0 } } }], produits: [{ id: 'P', nom: 'ADVION' }],
    boxMvtAttente: [{ id: 'mvtX', statut: 'enAttente', type: 'ajustement', boxId: 'bx', produitId: 'P', du: -4, dc: 0, par: 'Tom' }], mouvements: [], journal: [], _tombes: {} };
  const appareil = base => { const g = neuf({ db: copie(base) }); g.ombreRelever(); return g; };
  const socle = appareil(BASE); socle.estampiller(); const commun = copie(socle.getDb());
  const valide = (g, qui, id) => { const d = g.getDb(), m = d.boxMvtAttente[0], b = d.boxes[0], cur = b.stock.P;
    const av = cur.u; cur.u = Math.max(0, av + m.du); const ru = cur.u - av;
    g.traceBox(b, 'P', ru, 'u', 'Ajustement (validé DR)', m.par, qui, '', id); m.statut = 'valide'; m.drNom = qui; g.estampiller(); };
  const scenario = ids => { const A = appareil(commun), B = appareil(commun);
    valide(A, 'DR Alexis', ids ? "mvv:mvtX:0:P:u" : ''); const t = Date.now(); while (Date.now() === t) {}
    valide(B, 'DR Justin', ids ? "mvv:mvtX:0:P:u" : '');
    const f = A.fusionnerBases(A.getDb(), B.getDb(), false), g = B.fusionnerBases(B.getDb(), A.getDb(), false);
    const sortis = d => d.mouvements.filter(x => x.produitId === 'P' && x.type === 'sortie').reduce((s, x) => s + x.qte, 0);
    return { stockA: f.boxes[0].stock.P.u, stockB: g.boxes[0].stock.P.u, sortisA: sortis(f), sortisB: sortis(g), lignes: f.mouvements.length }; };
  const avec = scenario(true), sans = scenario(false);
  v('le stock tombe juste des deux côtés : 5 − 4 = 1', [avec.stockA, avec.stockB], [1, 1]);
  v('⛔ l\'historique dit 4 unités sorties, pas 8 — une seule ligne, des deux côtés', [avec.sortisA, avec.sortisB, avec.lignes], [4, 4, 1]);
  v('contre-épreuve : avec deux identifiants au hasard (la v738), l\'historique disait 8 — le banc voit la différence', [sans.sortisA, sans.lignes], [8, 2]);
}

console.log(`\n════ test-791 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
