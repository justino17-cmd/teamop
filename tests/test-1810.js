/* ══ 1810 · « MA JOURNÉE » DU TECHNICIEN : « ▶ DÉMARRER » SUR LA PROCHAINE INTERVENTION (17 octobre 2026) ═══════════
   Rapport technicien#9 de la campagne de test : « Ma journée » n'avait aucun bouton « ▶ Démarrer » — `renderIntTechDay` calculait
   `nextId` sans le lire, `secD` forçait `startBtn:false`, la section « Aujourd'hui » n'envoyait pas `startBtn`, et
   `intDemarrerFiche` (une COPIE du menu de statut : `i.statut='encours'` écrit à la main) n'avait aucun appelant. Démarrer = ouvrir
   la fiche, toucher le statut, choisir « En cours » : trois gestes sur le téléphone du terrain.
   Décision de Justin, 17 octobre 2026 — « Oui, l'ajouter » : un bouton « ▶ Démarrer » sur la PROCHAINE intervention du jour non
   commencée (une seule), qui passe par la MÊME porte que le menu de statut (intSetStatut → intSetStatutDo : le droit, le journal,
   l'heure de début), disparaît une fois l'intervention commencée, et propose d'ouvrir celle qui est déjà en cours.

   Ce banc EXÉCUTE les vraies renderIntTechDay, intTechCard, intJourProchain, intDemarrerFiche, intSetStatut et intSetStatutDo
   (bac à sable tests/g05-monde.js, qui ne change pas) et relit l'écran qu'elles écrivent. Le toucher pour de vrai, jour et nuit,
   sur iPhone et Android, est mesuré au navigateur (scratchpad/decisions-c2/d-demarrer-ma-journee/sonde-demarrer.js).        */
const { monde, interv, cadre, SRC, fonction, ligne } = require('./g05-monde');
const { vrai, v, fin } = cadre('test-1810');

const AUJ = new Date().toLocaleDateString('sv-SE');
const DEMAIN = new Date(Date.now() + 86400000).toLocaleDateString('sv-SE');
const HIER = new Date(Date.now() - 86400000).toLocaleDateString('sv-SE');

const NOMS = ['renderIntTechDay', 'intTechCard', 'intJourProchain', 'intEnCoursFiche', 'intDemarrerFiche', 'intOuvrirFiche', 'intSetStatut', 'intSetStatutDo', 'intBadges', 'intCkBar', 'shiftDay'];
console.log('\n── 1810 · 0. la population ──');
v('⛔ chaque fonction est définie UNE fois (une seconde gagnerait partout, en silence)',
  NOMS.map(n => SRC.split('function ' + n + '(').length - 1), NOMS.map(() => 1));
vrai('… et trouvée dans le fichier réel', NOMS.every(n => fonction(n).length > 40), NOMS.filter(n => fonction(n).length <= 40));

/* le bac à sable : les vraies fonctions, un écran qu'on relit, les doubles de ce qui n'est que décor */
function jour(opts) {
  const o = opts || {};
  const W = monde({ moiTech: o.moiTech || 'tK', droits: o.droits || {}, moi: { id: 'uK', role: 'technicien', prenom: 'Karim', nom: 'Benali' } });
  W.__logs = []; W.__contenu = '';
  /* une fonction absente ou qui jette est un ✗ nommé, pas un banc qui meurt sans son total */
  const brut = W.exec; W.exec = code => { try { return brut(code); } catch (e) { vrai('exécution sans exception : ' + code.slice(0, 50).replace(/\s+/g, ' '), false, String(e.message)); } };
  W.exec(`
    var INT_STCOLOR={}; var views={}; var logEvent=function(a,b){ __logs.push([a,b]); };
    var typeColor=function(){ return ''; }, encreDonnee=function(c){ return c; }, planAvec=function(){ return ''; };
    var badge=function(m,s){ return '<span class="st">'+((m[s]||{}).l||s)+'</span>'; };
    var emptyState=function(a,b){ return '<div class="empty">'+b+'</div>'; }, setHeader=function(){};
    var $=function(id){ return id==='content' ? { set innerHTML(h){ __contenu=h; }, get innerHTML(){ return __contenu; } } : null; };
    var detailIntervention=function(id){ __go.push('fiche:'+id); };
    ${ligne('let _intDemarreTs')}
    ${NOMS.map(fonction).filter(Boolean).join('\n')}
    views.interventions=function(){ renderIntTechDay(db.interventions); };
  `);
  return W;
}
const i1 = (id, heure, extra) => interv(Object.assign({ id, num: 'INT-' + id, titre: 'Passage ' + id, date: AUJ, heure, techId: 'tK', techIds: ['tK'], moyenPaiement: '', montant: 0 }, extra || {}));
const peindre = W => { W.exec('views.interventions()'); return W.__contenu; };
/* les boutons « Démarrer » de l'écran : l'identifiant visé par chacun */
const demarrers = h => [...h.matchAll(/onclick="event\.stopPropagation\(\);intDemarrerFiche\('([^']+)'\)"[^>]*>([^<]*)</g)].map(m => [m[1], m[2].trim()]);
const ouvrirs = h => [...h.matchAll(/onclick="event\.stopPropagation\(\);intOuvrirFiche\('([^']+)'\)"/g)].map(m => m[1]);
const it = (W, id) => W.db.interventions.find(x => x.id === id);

console.log('\n── 1810 · 1. ⛔ le bouton paraît sur LA prochaine intervention du jour, et sur elle seule ──');
{ const W = jour();
  W.db.interventions.push(i1('b', '10:00'), i1('a', '08:00'), i1('c', '14:00'),
    i1('retard', '09:00', { date: HIER }), i1('dem', '08:00', { date: DEMAIN }),
    i1('autre', '07:00', { techId: 'tZ', techIds: ['tZ'] }),
    i1('fin', '06:00', { statut: 'terminee' }), i1('ann', '06:30', { statut: 'annulee' }));
  const h = peindre(W);
  v('un seul bouton, sur la première planifiée du jour (à l\'heure : 08:00), pas sur celles de 10:00 ni 14:00', demarrers(h).map(d => d[0]), ['a']);
  vrai('… son libellé dit « Démarrer »', /Démarrer/.test((demarrers(h)[0] || [])[1] || ''), demarrers(h));
  vrai('… ni sur une intervention EN RETARD, ni sur celle de demain, ni sur celle d\'un collègue, ni sur une terminée ou annulée',
    !demarrers(h).some(d => ['retard', 'dem', 'autre', 'fin', 'ann'].includes(d[0])), demarrers(h));
  vrai('… la section « Aujourd\'hui » est bien celle qui le porte (la carte de 08:00 est dans le fil du jour)', h.indexOf("intDemarrerFiche('a')") > h.indexOf('Aujourd'), h.length);
  vrai('population : l\'écran montre les trois cartes du jour', ["detailIntervention('a')", "detailIntervention('b')", "detailIntervention('c')"].every(x => h.includes(x)), h.length); }
{ const W = jour(); W.db.interventions.push(i1('a', '08:00', { debutReel: Date.now() - 600000 }), i1('b', '10:00'));
  v('⛔ une planifiée dont le chrono est déjà lancé (debutReel) n\'est pas « non commencée »', demarrers(peindre(W)).length, 0); }
{ const W = jour(); W.db.interventions.push(i1('a', '08:00', { statut: 'aplanifier' }));
  v('une intervention « À planifier » n\'est pas proposée', demarrers(peindre(W)).length, 0); }

console.log('\n── 1810 · 2. ⛔ le geste passe par la MÊME porte que le menu de statut ──');
{ const W = jour(), M = jour();
  W.db.interventions.push(i1('a', '08:00'), i1('b', '10:00')); M.db.interventions.push(i1('a', '08:00'), i1('b', '10:00'));
  const avant = Date.now();
  W.exec("intDemarrerFiche('a')");          // le bouton
  M.exec("intSetStatut('a','encours')");    // le menu de statut
  const a = it(W, 'a'), m = it(M, 'a');
  v('le bouton passe la fiche « en cours »', a.statut, 'encours');
  vrai('… avec l\'heure de début (debutReel), posée maintenant', typeof a.debutReel === 'number' && a.debutReel >= avant && a.debutReel <= Date.now(), a.debutReel);
  v('… UNE seule ligne de journal d\'intervention, la même que le menu (« Statut : En cours »)', [a.histo.map(h => h.txt), m.histo.map(h => h.txt)], [['Statut : En cours'], ['Statut : En cours']]);
  v('… UNE seule trace dans le journal de l\'application, la même que le menu', [W.__logs, M.__logs], [[['Intervention en cours', 'Passage a']], [['Intervention en cours', 'Passage a']]]);
  v('… UNE écriture (save), comme le menu', [W.__saves, M.__saves], [1, 1]);
  v('… le même toast que le menu', W.__toasts, M.__toasts);
  v('… et ce qui est écrit sur la fiche est identique au menu (hors horodatages)',
    JSON.stringify(Object.assign({}, a, { debutReel: 0, histo: 0 })), JSON.stringify(Object.assign({}, m, { debutReel: 0, histo: 0 })));
  v('… l\'écran qu\'on voit après est la LISTE (on ne rouvre pas la fiche : le menu, lui, y est déjà)', [W.__go, W.__rendus], [[], []]);
  vrai('… la liste a été repeinte (le menu, dans la fiche, repeint la fiche)', W.__contenu.length > 200 && /en cours/.test(W.__contenu), W.__contenu.length);
  v('… le menu, lui, repeint toujours la fiche (renderIntDetail)', M.__rendus, ['a']); }
{ const T = fonction('intDemarrerFiche');
  vrai('⛔ le code : intDemarrerFiche lit la case AVANT toute écriture (intStatutPermis en première instruction), puis passe par intSetStatut',
    /^function intDemarrerFiche\(id\)\{ const i=db\.interventions\.find\(x=>x\.id===id\); if\(!i\) return;\s*if\(!intStatutPermis\(i,'encours'\)\)/.test(T) && /intSetStatut\(id,'encours'/.test(T), T.slice(0, 260));
  vrai('… et n\'écrit plus le statut à la main (la copie du menu est partie)', !/\.statut\s*=/.test(T) && !/debutReel\s*=/.test(T) && !/intHisto\(/.test(T) && !/save\(\)/.test(T), T); }

console.log('\n── 1810 · 3. le bouton disparaît ; l\'intervention en cours propose de s\'ouvrir ──');
{ const W = jour(); W.db.interventions.push(i1('a', '08:00'), i1('b', '10:00'));
  W.exec("intDemarrerFiche('a')");
  const h = W.__contenu;
  v('⛔ plus aucun « ▶ Démarrer » (celui de 08:00 est parti, et celui de 10:00 ne paraît pas : une est déjà en cours)', demarrers(h), []);
  v('… la carte de l\'intervention commencée porte « Ouvrir la fiche »', ouvrirs(h), ['a']);
  vrai('… et dit « en cours »', /⏱ en cours/.test(h) && /<span class="st">En cours<\/span>/.test(h), h.slice(0, 200));
  W.exec("it_ = db.interventions.find(x=>x.id==='a'); it_.statut='terminee'; it_.finReel=Date.now();");
  v('… une fois la première terminée, la suivante reçoit le bouton', demarrers(peindre(W)).map(d => d[0]), ['b']); }

console.log('\n── 1810 · 4. ⛔ double toucher : un seul démarrage ──');
{ const W = jour(); W.db.interventions.push(i1('a', '08:00'));
  W.exec("intDemarrerFiche('a'); intDemarrerFiche('a'); intDemarrerFiche('a');");
  const a = it(W, 'a');
  v('une seule ligne de journal d\'intervention', a.histo.length, 1);
  v('… une seule écriture (save) et un seul toast', [W.__saves, W.__toasts.length], [1, 1]);
  v('… une seule trace dans le journal de l\'application', W.__logs.length, 1);
  const t0 = a.debutReel; W.exec("intDemarrerFiche('a')");
  v('… et l\'heure de début ne bouge pas', it(W, 'a').debutReel, t0);
  W.exec("intOuvrirFiche('a')");
  v('le second toucher tombe sur « Ouvrir la fiche » qui vient de prendre sa place : ignoré dans la demi-seconde (la fiche ne s\'ouvre pas)', W.__go, []);
  W.exec('_intDemarreTs=Date.now()-1000; intOuvrirFiche("a")');
  v('… un vrai toucher, plus tard, ouvre bien la fiche', W.__go, ['fiche:a']); }
{ const W = jour(); W.db.interventions.push(i1('a', '08:00', { statut: 'terminee', finReel: Date.now() }), i1('b', '08:00', { statut: 'annulee' }));
  W.exec("intDemarrerFiche('a'); intDemarrerFiche('b');");
  v('on ne « démarre » ni une terminée ni une annulée (aucune écriture)', [W.__saves, it(W, 'a').statut, it(W, 'b').statut], [0, 'terminee', 'annulee']); }

console.log('\n── 1810 · 5. ⛔ sans le droit de changer le statut : pas de bouton ET la fonction refuse ──');
{ /* Karim n'a pas « Interventions → Modifier » ; l'intervention n'est pas la sienne (affectée à un collègue). Il ne devrait pas y toucher. */
  const W = jour({ droits: { 'int.modifier': false } });
  W.db.interventions.push(i1('x', '08:00', { techId: 'tZ', techIds: ['tZ'] }), i1('a', '09:00'));
  v('la fonction qui choisit la prochaine ne retient pas l\'intervention d\'un collègue', W.exec("intJourProchain([db.interventions[0]])"), '');
  v('… ni pour qui a le droit global mais pas la sienne', jour({ droits: { 'int.modifier': true } }).exec("db.interventions.push(" + JSON.stringify(i1('x', '08:00')) + "); intJourProchain([db.interventions[0]])"), 'x');
  W.exec("intDemarrerFiche('x')");
  v('⛔ la FONCTION refuse (la case se lit dans la fonction qui écrit, pas seulement au bouton caché) : rien d\'écrit, un message', [it(W, 'x').statut, it(W, 'x').debutReel, W.__saves, it(W, 'x').histo.length], ['planifiee', undefined, 0, 0]);
  vrai('… et le dit à la personne', W.__toasts.some(t => /pas autorisé/.test(t)), W.__toasts);
  W.exec("intDemarrerFiche('a')");
  v('… la sienne, elle, démarre (le terrain démarre SA propre intervention sans « Modifier »)', it(W, 'a').statut, 'encours'); }

console.log('\n── 1810 · 6. ⛔ une intervention ne déduit rien du stock ──');
{ const W = jour();
  W.db.produits = [{ id: 'p1', nom: 'ADVION', qte: 7 }]; W.db.mouvements = []; W.db.boxes = [{ id: 'bx', nom: 'Nord', actif: true, techIds: ['tK'], stock: { p1: { u: 5, ctn: 0 } } }];
  W.db.interventions.push(i1('a', '08:00', { produitsUtilises: [{ produitId: 'p1', qte: 2 }] }));
  const avant = JSON.stringify([W.db.produits, W.db.mouvements, W.db.boxes]);
  W.exec("intDemarrerFiche('a')");
  v('démarrer ne touche ni le compteur, ni les mouvements, ni la box', JSON.stringify([W.db.produits, W.db.mouvements, W.db.boxes]), avant); }

console.log('\n── 1810 · 7. deux interventions « en cours » : ce que le code fait, et qu\'on garde ──');
{ const W = jour(); W.db.interventions.push(i1('a', '08:00'), i1('b', '10:00'));
  W.exec("intSetStatut('a','encours'); intSetStatut('b','encours');");
  v('le MENU de statut laisse passer deux « en cours » (aucun contrôle) : conservé, comme le « ▶ » de l\'historique et le GPS', [it(W, 'a').statut, it(W, 'b').statut], ['encours', 'encours']);
  const h = peindre(W);
  v('… « Ma journée » les montre toutes deux, chacune avec « Ouvrir la fiche », et ne propose aucun nouveau démarrage', [ouvrirs(h), demarrers(h)], [['a', 'b'], []]); }

console.log('\n── 1810 · 8. le code ──');
{ const R = fonction('renderIntTechDay'), K = fonction('intTechCard');
  vrai('⛔ `nextId` est LU (il n\'est plus du code mort) et vient de intJourProchain', /const nextId=intJourProchain\(auj\)/.test(R) && /startBtn:i\.id===nextId/.test(R), R.slice(R.indexOf('nextId') - 20, R.indexOf('nextId') + 120));
  vrai('… seule la section « Aujourd\'hui » le reçoit : les autres sections (secD) forcent toujours startBtn:false', /startBtn:false/.test(R) && (R.match(/startBtn:/g) || []).length === 2, (R.match(/startBtn:[^,}]*/g) || []));
  vrai('la carte : cible ≥ 44 px (min-height) sur « Démarrer » et sur « Ouvrir la fiche », bouton natif (doigt, clavier, lecteur d\'écran)',
    (K.match(/<button class="btn[^"]*" onclick="event\.stopPropagation\(\);int(?:Demarrer|Ouvrir)Fiche\([^)]*\)" style="[^"]*min-height:44px/g) || []).length === 2, K.slice(-900));
  vrai('… et un nom lisible : le texte « Démarrer » reste à côté du ▶ (l\'icône est aria-hidden), « Ouvrir la fiche » est du texte',
    />▶ Démarrer<\/button>/.test(K) && />Ouvrir la fiche<\/button>/.test(K));
  vrai('le menu passe toujours par intSetStatut sans rappel (la fiche se repeint), seul le bouton passe un rappel',
    /intSetStatutDo\(id,st,apres\)/.test(fonction('intSetStatut')) && /if\(typeof apres==='function'\) apres\(\); else renderIntDetail\(id\)/.test(fonction('intSetStatutDo'))); }

fin();
