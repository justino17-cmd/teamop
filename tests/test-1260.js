/* test-1260 · FORMULAIRES PRÉREMPLIS — case du planning, fiche client, duplication, notes de devis (lot g09)
   Cinq défauts, UN mécanisme : le second argument de formIntervention est un préremplissage GÉNÉRAL
   (un objet de champs, ou une date comme avant).
   · planning#5      le double-clic d'une case vide emportait la date et PERDAIT la personne et l'heure
                     (formIntervention('',iso,techId,heure) pour une fonction à deux paramètres) ;
   · clients#7       « ＋ Intervention » / « ＋ Devis » de la fiche client n'emportaient pas le client ;
   · technicien#11   … et « ＋ Intervention » se proposait à qui n'a pas la case (le refus ne venait
                     qu'après la saisie) ;
   · interventions#13 « Dupliquer » poussait la copie ET sauvegardait AVANT d'ouvrir le formulaire :
                     « Annuler » laissait la copie et un numéro consommé — ouvrir un écran n'écrit pas ;
   · ventes#6        le champ Notes d'un devis était un <input> : il supprime les retours à la ligne.
   Ce banc EXÉCUTE les vraies fonctions d'app.html (planWeekVide, planMultiVide, formIntervention,
   saveIntervention, dupliquerIntervention, ficheClient, formDoc, saveDoc) dans un bac à sable et lit
   le HTML qu'elles rendent. La mesure au navigateur : scratchpad/gestion/correctifs/g09/.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* Seuls les blocs qui COMMENCENT une ligne sont retirés (CLAUDE.md : le motif naïf avale du vrai code). */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const F = n => bloc('function ' + n + '(');

console.log('\n── 1260 · 0. la population ──');
const NOMS = ['planWeekVide', 'planMultiVide', 'formIntervention', 'saveIntervention', 'dupliquerIntervention', '_copieInt', 'ficheClient',
  'formDoc', 'saveDoc', 'intTechIds', 'intNum', 'intHisto', 'clockFromMin', 'toMin', 'addMin', 'docNum', 'clientsProposes', 'clientPropose'];
const CODE = {}; NOMS.forEach(n => CODE[n] = F(n));
v('toutes les fonctions sont trouvées (une tranche vide passerait au vert sur tout)', NOMS.filter(n => CODE[n].length < 40), []);
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)',
  ['formIntervention', 'dupliquerIntervention', 'ficheClient', 'formDoc', 'planWeekVide', 'planMultiVide'].map(n => SRC.split('function ' + n + '(').length - 1), [1, 1, 1, 1, 1, 1]);

const ESC = ligne('const esc = s =>'), DOCNUM = CODE.docNum;

/* ── le bac à sable ───────────────────────────────────────────────────────────────────────── */
function monde(opt) {
  opt = opt || {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, RegExp, parseInt, parseFloat,
    __modales: [], __toasts: [], __saves: 0, __droits: opt.droits || { int: ['ajouter', 'modifier'], ventes: ['ajouter', 'modifier'], crm: ['modifier'] },
    db: JSON.parse(JSON.stringify(opt.db || {})), currentUser: { id: 'u1', prenom: 'Admin', nom: 'Test' } };
  ctx.window = ctx; ctx.document = { getElementById: id => (ctx.__champs && ctx.__champs[id]) || null, querySelectorAll: s => (s === '.int-tech.active' ? (ctx.__techsActifs || []) : []), querySelector: () => null };
  vm.createContext(ctx);
  vm.runInContext(`
    /* v773 : ce banc joue la 3D (aucun métier réglé) — les autres métiers sont joués par test-2951 */
    function estMetier3D(){ return true; }
    ${ESC}
    var __f={}; function FormData(t){ return Object.entries(__f); }
    var __id=0; function uid(){ return 'n'+(++__id); }
    function numPlafond(){ return 0; }
    function toast(m){ __toasts.push(String(m)); } function save(){ __saves++; } function go(){} function logEvent(){}
    var current='interventions';
    function canCat(g,d){ return (__droits[g]||[]).indexOf(d)>=0; }
    function can(){ return false; }
    function permGarde(g,d,q){ if(canCat(g,d)) return true; toast((d==='ajouter'?'Créer':'Modifier')+' '+q+' n\\'est pas autorisé'); return false; }
    function openModal(h){ __modales.push(String(h)); } function closeModal(){ __fermee=(typeof __fermee==='number'?__fermee:0)+1; }
    var __fermee=0;
    var intNuis=new Set(), intMeth=new Set(), intTrait={};
    function renderIntNuis(){} function renderIntMeth(){} function renderIntCliInfo(){}
    function clientName(id){ var c=(db.clients||[]).find(function(x){return x.id===id;}); return c?c.nom:''; }
    function intTypes(){ return ['Dératisation','Désinsectisation']; }
    function intDureeChips(){ return ''; } function entSocUnique(){ return ''; } function intSocDefaut(){ return 'Modèle générique'; }
    var VISITE_TECH=['Non','Oui']; var PRIO={normale:{l:'Normale'},haute:{l:'Haute'}}; var MOYENS_PAIEMENT=['Carte','Chèque']; function moyensPaiementOptions(){ return ''; }
    var INT_RECUR={aucune:'Aucune',mensuelle:'Mensuelle'}; var STATUT_INT={planifiee:{l:'Planifiée'},aplanifier:{l:'À planifier'},terminee:{l:'Terminée'}};
    function techForClient(){ return null; } function keyForClient(){ return null; } function techForKey(){ return null; }
    function absentOn(){ return null; } function intConflictOf(){ return null; } function techName(id){ return id; } function fmtShort(x){ return x; }
    function planStamp(){} function notifyTechNewInt(){} function syncFactureFromIntervention(){}
    function fullName(u){ return (u.prenom||'')+' '+(u.nom||''); } function garCheckBanner(){}
    function ouvrables(){ return {cli:function(){return true;}}; } function ecranDetail(){}
    function visibleDocs(l){ return l; } function visibleClients(l){ return l; }
    function docTot(){ return {ttc:0}; } function eur(x){ return x+' €'; } function fmtD(x){ return x; }
    function cliIsPro(){ return false; } function garSectionHtml(){ return ''; } function techName2(){ return ''; }
    function techPuces(){ return ''; } function badge(){ return ''; } function norm(s){ return String(s||'').toLowerCase(); }
    function entSocietes(){ return ['Modèle générique']; } function todayISO(){ return '2026-10-15'; }
    function docCliBlock(c){ return '<span class="cli-bloc">'+esc((c&&c.nom)||'')+'</span>'; }
    function renderLignes(){} function renderLignes2(){}
    var formLignes=[]; var DOC={devis:{coll:'devis',un:'devis',titre:'Devis',st:{brouillon:{l:'Brouillon'},envoye:{l:'Envoyé'}}}, factures:{coll:'factures',un:'facture',titre:'Facture',st:{brouillon:{l:'Brouillon'}}}};
    function docListView(){}
    function clientPropose(id,garde){ return !!id&&clientsProposes(garde).some(function(c){return c.id===id;}); }
    function docNum(){ return 'DEV-2026-001'; }
    ${CODE.clockFromMin}\n${CODE.toMin}\n${CODE.addMin}\n${CODE.intTechIds}\n${CODE.intNum}\n${CODE.intHisto}\n${CODE.clientsProposes}
    ${ligne('let _intReport')}
    ${CODE.planWeekVide}\n${CODE.planMultiVide}\n${CODE.formIntervention}\n${CODE.saveIntervention}\n${CODE._copieInt}\n${CODE.dupliquerIntervention}\n${CODE.ficheClient}\n${CODE.formDoc}\n${CODE.saveDoc}
  `, ctx);
  return ctx;
}

/* ── lire le HTML du formulaire ── */
const attr = (h, re) => { const m = re.exec(h); return m ? m[1] : null; };
const champ = (h, nom) => attr(h, new RegExp('<input[^>]*name="' + nom + '"[^>]*value="([^"]*)"')) ;
const techsChoisis = h => (h.match(/class="chip int-tech active" data-tid="([^"]+)"/g) || []).map(x => x.replace(/.*data-tid="([^"]+)"/, '$1'));
const idClient = h => attr(h, /id="cli-id" value="([^"]*)"/);
const nomClient = h => attr(h, /id="cli-search"[^>]*value="([^"]*)"/);
const select = (h, nom) => { const m = new RegExp('<select name="' + nom + '"[^>]*>([\\s\\S]*?)</select>').exec(h); if (!m) return null;
  const o = /<option value="([^"]*)"[^>]*selected/.exec(m[1]) || /<option[^>]*selected[^>]*>([^<]*)</.exec(m[1]); return o ? o[1] : null; };
/* Ce que le navigateur enverrait si on validait tel quel : tous les champs nommés du formulaire. */
function envoi(h) {
  const f = {};
  (h.match(/<input[^>]*name="[^"]+"[^>]*>/g) || []).forEach(t => { const n = /name="([^"]+)"/.exec(t)[1]; const m = /value="([^"]*)"/.exec(t); if (/type="(checkbox|radio)"/.test(t)) return; f[n] = m ? m[1].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&') : ''; });
  (h.match(/<select name="[^"]+"[\s\S]*?<\/select>/g) || []).forEach(t => { const n = /name="([^"]+)"/.exec(t)[1]; const o = /<option value="([^"]*)"[^>]*selected/.exec(t); f[n] = o ? o[1] : ((/<option[^>]*selected[^>]*>([^<]*)</.exec(t) || [])[1] || ((/<option value="([^"]*)"/.exec(t) || [])[1] || '')); });
  (h.match(/<textarea[^>]*name="[^"]+"[^>]*>[\s\S]*?<\/textarea>/g) || []).forEach(t => { const n = /name="([^"]+)"/.exec(t)[1]; f[n] = t.replace(/^<textarea[^>]*>/, '').replace(/<\/textarea>$/, '').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&'); });
  return f;
}
const evt = champs => ({ preventDefault() {}, target: champs });
const jouerSave = (W, h, extra, id) => {
  const f = Object.assign(envoi(h), extra || {});
  W.__f = f;
  W.__techsActifs = techsChoisis(h).map(t => ({ dataset: { tid: t } }));
  W.__champs = { 'cli-search': { value: nomClient(h) || '' } };
  W.saveIntervention(evt(f), id || '');
};

const CLI = [{ id: 'c1', nom: 'Hôtel du Parc', adresse: '12 rue des Lilas 75011 Paris', tel: '0102030405', email: 'parc@ex.fr' }, { id: 'c2', nom: 'Boulangerie Soleil' }];
const TECH = [{ id: 't1', nom: 'Karim Benali' }, { id: 't2', nom: 'Léa Roux' }];
const base = () => ({ clients: CLI, techniciens: TECH, contrats: [], devis: [], factures: [], interventions: [], societes: [], enveloppes: [] });

/* ═══════════════════ 1. planning#5 : la case vide emporte la personne et l'heure ═══════════════════ */
console.log('\n── 1260 · 1. planning#5 : double-clic sur une case vide ──');
{ const W = monde({ db: base() });
  const el = { getBoundingClientRect: () => ({ top: 0 }) };
  // Semaine : h0 = 8, 46 px par heure ; y = 5 h * 46 = 230 px -> 13:00
  W.planWeekVide({ target: el, currentTarget: el, clientY: 230 }, '2026-10-15', 't2', 8, 46);
  const h = W.__modales[W.__modales.length - 1] || '';
  vrai('population : le formulaire s\'est ouvert', h.indexOf('id="intform"') > 0);
  v('Semaine : la date de la case', champ(h, 'date'), '2026-10-15');
  v('Semaine : la personne de la case (Léa Roux) est cochée', techsChoisis(h), ['t2']);
  v('Semaine : l\'heure de la case (13:00) et non 09:00', champ(h, 'heure'), '13:00');
  vrai('Semaine : le début affiché dit 13:00', /id="deb-aff"[^>]*>13:00</.test(h));
  // Multi : y relatif à la colonne
  const W2 = monde({ db: base() });
  W2.planMultiVide({ currentTarget: { getBoundingClientRect: () => ({ top: 100 }) }, clientY: 100 + 230 }, '2026-10-16', 't1', 8, 46);
  const h2 = W2.__modales[W2.__modales.length - 1] || '';
  v('Multi : date, personne et heure de la case', [champ(h2, 'date'), techsChoisis(h2), champ(h2, 'heure')], ['2026-10-16', ['t1'], '13:00']);
  // case sans personne (colonne « non affecté »)
  const W3 = monde({ db: base() });
  W3.planWeekVide({ target: el, currentTarget: el, clientY: 0 }, '2026-10-15', '', 8, 46);
  const h3 = W3.__modales[0] || '';
  v('contre-épreuve : une case sans personne ne coche personne, et garde l\'heure de la case (08:00)', [techsChoisis(h3), champ(h3, 'heure')], [[], '08:00']);
  // Ancienne forme : une chaîne de date reste comprise (l'agenda d'une journée, le menu « Intervention »)
  const W4 = monde({ db: base() });
  W4.formIntervention('', '2026-11-02');
  const h4 = W4.__modales[0] || '';
  v('rétro-compatibilité : formIntervention(\'\', date) prérempli la date, rien d\'autre', [champ(h4, 'date'), techsChoisis(h4), champ(h4, 'heure'), idClient(h4)], ['2026-11-02', [], '09:00', '']);
  const W5 = monde({ db: base() }); W5.formIntervention();
  v('formIntervention() sans rien reste un formulaire vide', [champ(W5.__modales[0], 'date'), champ(W5.__modales[0], 'heure')], ['', '09:00']);
  // sans le droit « ajouter », la case n'ouvre rien (déjà gardé : on le garde)
  const W6 = monde({ db: base(), droits: { int: ['modifier'] } });
  W6.planWeekVide({ target: el, currentTarget: el, clientY: 0 }, '2026-10-15', 't1', 8, 46);
  v('sans la case « Créer », la case du planning n\'ouvre rien', W6.__modales.length, 0);
}

/* ═══════════════════ 2. clients#7 + technicien#11 : la fiche client ═══════════════════ */
console.log('\n── 1260 · 2. clients#7 / technicien#11 : « ＋ Intervention » et « ＋ Devis » de la fiche client ──');
{ const ouvrirFiche = droits => { const W = monde({ db: base(), droits }); W.ficheClient('c1'); return { W, h: W.__modales[W.__modales.length - 1] || '' }; };
  const { W, h } = ouvrirFiche({ int: ['ajouter', 'modifier'], ventes: ['ajouter'], crm: ['modifier'] });
  vrai('population : la fiche est ouverte, avec son pied de fenêtre', h.indexOf('modal-foot') > 0 && /Dossier client/.test(h));
  const clic = (W, h, libelle) => { const m = new RegExp('onclick="([^"]*)">' + libelle).exec(h); return m ? m[1].replace(/&quot;/g, '"') : null; };
  const cInt = clic(W, h, '＋ Intervention'), cDev = clic(W, h, '＋ Devis');
  vrai('population : les deux boutons existent pour qui a les deux cases', !!cInt && !!cDev, [cInt, cDev]);
  // « ＋ Intervention » : on clique pour de vrai (le code du bouton s'exécute dans le bac à sable)
  if (cInt) { W.__modales.length = 0; vm.runInContext(cInt, W);
    const hi = W.__modales[W.__modales.length - 1] || '';
    vrai('Intervention : le formulaire s\'ouvre', hi.indexOf('id="intform"') > 0);
    v('Intervention : le client de la fiche est choisi (identifiant ET nom affiché)', [idClient(hi), nomClient(hi)], ['c1', 'Hôtel du Parc']);
    v('Intervention : son adresse est reprise (comme quand on le choisit dans la liste)', champ(hi, 'adresse'), '12 rue des Lilas 75011 Paris'); }
  if (cDev) { W.__modales.length = 0; vm.runInContext(cDev, W);
    const hd = W.__modales[W.__modales.length - 1] || '';
    vrai('Devis : le formulaire s\'ouvre', /saveDoc\(event,'devis',''\)/.test(hd));
    vrai('Devis : le client de la fiche est sélectionné', /<option value="c1" selected>Hôtel du Parc/.test(hd), (hd.match(/<select name="clientId"[\s\S]*?<\/select>/) || [''])[0]);
    vrai('Devis : le bloc d\'infos du client (docCliInfo) est rempli', /cli-bloc">Hôtel du Parc/.test(hd)); }
  // technicien#11 : sans la case, le bouton n'est pas proposé
  { const t = ouvrirFiche({ int: [], ventes: ['ajouter'], crm: [] });
    vrai('technicien : sans « Créer une intervention », « ＋ Intervention » n\'est PAS proposé', !/＋ Intervention/.test(t.h));
    vrai('… mais « ＋ Devis » l\'est (il a la case ventes)', /＋ Devis/.test(t.h));
    const t2 = ouvrirFiche({ int: ['ajouter'], ventes: [], crm: [] });
    vrai('sans « Créer un devis », « ＋ Devis » n\'est PAS proposé', !/＋ Devis/.test(t2.h));
    vrai('… mais « ＋ Intervention » l\'est', /＋ Intervention/.test(t2.h));
    vrai('contre-épreuve : le reste du pied de fenêtre est intact (Modifier, Étiquettes, Dossier client)', /Modifier<\/button>/.test(t.h) && /Étiquettes/.test(t.h) && /Dossier client/.test(t.h)); }
}

/* ═══════════════════ 3. interventions#13 : Dupliquer puis Annuler ═══════════════════ */
console.log('\n── 1260 · 3. interventions#13 : « Dupliquer » n\'écrit rien avant la validation ──');
{ const orig = { id: 'i1', num: 'INT-2026-001', titre: 'Dératisation cuisine', type: 'Dératisation', clientId: 'c1', techId: 't2', techIds: ['t2'], adresse: '12 rue des Lilas', date: '2026-10-20', heure: '14:30', duree: 90, prio: 'haute', statut: 'terminee', recurrence: 'mensuelle', desc: 'Passer par la cour', montant: 120, rapportModele: 'Modèle générique', nuisibles: ['Rats'], nuisible: 'Rats', methodes: ['Appâtage'], traitementNuis: { Rats: { produit: 'X' } }, checklist: [{ t: 'Fermer le portail', done: true }, { t: 'Photos', done: true }], compteRendu: 'Fait' };
  const D = () => { const d = base(); d.interventions = [JSON.parse(JSON.stringify(orig))]; return d; };
  const W = monde({ db: D() });
  const n0 = W.db.interventions.length, s0 = W.__saves;
  W.dupliquerIntervention('i1');
  const h = W.__modales[W.__modales.length - 1] || '';
  vrai('population : le formulaire de la copie est ouvert', h.indexOf('id="intform"') > 0);
  v('⛔ ouvrir n\'écrit rien : aucune intervention de plus en base', W.db.interventions.length, n0);
  v('⛔ … et aucune sauvegarde n\'a eu lieu', W.__saves, s0);
  // « Annuler » : le bouton ne fait que fermer
  vrai('« Annuler » ne fait que fermer la fenêtre', /<button type="button" class="btn ghost sm" onclick="closeModal\(\)">Annuler<\/button>/.test(h));
  v('Annuler = rien en base, aucun numéro consommé (le prochain numéro est encore le 002)', vm.runInContext('intNum()', W).replace(/\d{4}/, 'AAAA'), 'INT-AAAA-002');
  // le formulaire porte la copie
  v('la copie reprend titre, client, personne, date, heure, durée, prix, priorité', [champ(h, 'titre'), idClient(h), techsChoisis(h), champ(h, 'date'), champ(h, 'heure'), champ(h, 'duree'), champ(h, 'montant'), select(h, 'prio')],
    ['Dératisation cuisine', 'c1', ['t2'], '2026-10-20', '14:30', '90', '120', 'haute']);
  v('… statut « planifiée » (pas « terminée »), comme une copie neuve', select(h, 'statut'), 'planifiee');
  // Valider : la copie naît à ce moment-là, avec ce que le formulaire n'a pas
  jouerSave(W, h, {}, '');
  v('Valider crée UNE intervention', W.db.interventions.length, n0 + 1);
  const cp = W.db.interventions[W.db.interventions.length - 1];
  vrai('… avec un numéro posé à la validation (INT-…-002) et un identifiant neuf', /^INT-\d{4}-002$/.test(cp.num || '') && cp.id !== 'i1', [cp.num, cp.id]);
  v('… la liste de contrôle est reportée, décochée', cp.checklist, [{ t: 'Fermer le portail', done: false }, { t: 'Photos', done: false }]);
  v('… nuisibles, méthodes et fiche de traitement sont reportés', [cp.nuisibles, cp.methodes, cp.traitementNuis], [['Rats'], ['Appâtage'], { Rats: { produit: 'X' } }]);
  v('… le compte rendu de l\'original n\'est PAS recopié', cp.compteRendu, '');
  vrai('… et l\'historique dit « Dupliquée depuis INT-2026-001 »', (cp.histo || []).some(x => /Dupliquée depuis INT-2026-001/.test(x.txt)), cp.histo);
  v('l\'original est intact', W.db.interventions[0].num + '|' + W.db.interventions[0].checklist[0].done + '|' + W.db.interventions[0].statut, 'INT-2026-001|true|terminee');
  vrai('une validation n\'en laisse pas pour la suivante : un formulaire neuf ne reporte rien', (() => {
    const W2 = monde({ db: D() }); W2.dupliquerIntervention('i1'); W2.formIntervention('', '2026-12-01'); // on a changé d'avis : un autre formulaire
    jouerSave(W2, W2.__modales[W2.__modales.length - 1], { titre: 'Autre', clientId: 'c1' }, '');
    const x = W2.db.interventions[W2.db.interventions.length - 1];
    return x.titre === 'Autre' && x.id !== 'i1' && !x.checklist && !(x.histo || []).some(y => /Dupliquée/.test(y.txt)); })());
  // sans le droit de créer : rien ne s'ouvre
  const W3 = monde({ db: D(), droits: { int: ['modifier'] } }); W3.dupliquerIntervention('i1');
  v('sans la case « Créer », Dupliquer n\'ouvre rien et le dit', [W3.__modales.length, W3.__toasts.length], [0, 1]);
}

/* ═══════════════════ 4. ventes#6 : les notes d'un devis gardent leurs retours à la ligne ═══════════════════ */
console.log('\n── 1260 · 4. ventes#6 : le champ Notes d\'un devis ──');
{ const notes = 'Traitement xylophage — 50 m²\n\nGarantie : 10 ans (pièces et main-d\'œuvre)';
  const d = base(); d.devis = [{ id: 'd1', num: 'DEV-2026-007', clientId: 'c1', date: '2026-10-15', tva: 20, statut: 'brouillon', notes, lignes: [{ designation: 'Traitement', qte: 1, pu: 100 }], rapportModele: 'Modèle générique', xylo: true }];
  const W = monde({ db: d });
  W.formDoc('devis', 'd1');
  const h = W.__modales[W.__modales.length - 1] || '';
  vrai('population : le formulaire de modification est ouvert', /saveDoc\(event,'devis','d1'\)/.test(h));
  vrai('le champ Notes est un <textarea> (un <input> supprime les retours à la ligne)', /<textarea[^>]*name="notes"/.test(h) && !/<input[^>]*name="notes"/.test(h));
  const f = envoi(h);
  v('la valeur du champ est exactement les notes (deux retours à la ligne)', f.notes, notes);
  v('… dont deux retours à la ligne', (f.notes.match(/\n/g) || []).length, 2);
  // Enregistrer sans rien changer : les notes sont inchangées
  W.__f = f; W.__champs = {};
  W.saveDoc(evt(f), 'devis', 'd1');
  v('Enregistrer sans rien changer : les notes sont inchangées', W.db.devis[0].notes, notes);
  // un fichier de notes à guillemets et chevrons ne casse pas le champ
  const d2 = base(); d2.devis = [{ id: 'd2', num: 'DEV-2', clientId: 'c1', date: '2026-10-15', tva: 20, statut: 'brouillon', notes: 'a "b" <c> & d\nsuite', lignes: [] }];
  const W2 = monde({ db: d2 }); W2.formDoc('devis', 'd2');
  v('contre-épreuve : guillemets, chevrons et « & » restent intacts dans le champ', envoi(W2.__modales[0]).notes, 'a "b" <c> & d\nsuite');
  const W3 = monde({ db: base() }); W3.formDoc('devis');
  vrai('un devis neuf : le champ Notes est vide, et c\'est un textarea', /<textarea[^>]*name="notes"[^>]*><\/textarea>/.test(W3.__modales[0]));
}

console.log('\n══ test-1260 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
process.exit(ko ? 1 : 0);
