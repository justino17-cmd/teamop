/* ══ v737 — « C'EST JUSTE DES NOMS, C'EST PAS DES RÔLES : TOUT DOIT ÊTRE SÉLECTIONNÉ » ══════════════
   Justin, 23 septembre 2026 : « technicien, DR… qu'on avait pré-enregistrés, c'est juste des noms,
   c'est pas des rôles ; tout doit être sélectionné — ce qu'il voit, ce qu'il ne voit pas, ce qu'il
   peut faire, ce qu'il ne peut pas faire. Oublie pas d'ajouter aussi toutes les nouvelles règles
   dans les paramètres utilisateur. »

   Ce que la relecture a trouvé, et que ce banc garde :
   · TROIS règles des v735-736 (voir les fiches de son équipe, corriger des heures, régler les
     champs de gestion d'une fiche) se DÉDUISAIENT de « Tout voir » / « Voir les pointages » sans
     case à elles — on ne pouvait ni les donner ni les retirer à quelqu'un ;
   · DIX décisions tenaient encore au NOM du rôle (`role==='dr'`, `['admin','dr','chefEquipe',
     'commercial'].includes(role)`…) : gérer les groupes de discussion, l'e-mail pro, la carte
     « Ta journée », l'onglet « Supprimées », cinq familles de notifications, et la création de
     comptes (« un chef ne crée pas de DR » — par son NOM, alors que le socle d'un autre rôle ou
     un rôle maison pouvait ouvrir la validation) ;
   · la création d'un compte par quelqu'un qui n'est pas administrateur ne bornait RIEN : le
     nouveau compte pouvait recevoir des droits que son créateur n'avait pas.

   ⛔ Ce banc EXÉCUTE les vraies fonctions extraites d'app.html (userCap, capDeduitRegle, can,
   catDroit, droitsBorner, usrDeduireZone, usrDroitsValider, profilLireZone) — une règle se mesure
   à ce qu'elle laisse passer, pas au texte qui la nomme. La mesure dans une vraie page est
   `scratchpad/sonde-droits.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ on ne retire que les blocs de commentaire qui COMMENCENT une ligne (voir CLAUDE.md) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), prof = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k];
    if (c === '{') prof++; else if (c === '}') { prof--; if (prof === 0) return SRC.slice(i, k + 1); } }
  return '';
}
/* une constante tableau/objet : de sa déclaration jusqu'à la fermeture en début de ligne */
function constante(debut, fin) { const i = SRC.indexOf(debut); if (i < 0) return ''; const j = SRC.indexOf(fin, i); return j < 0 ? '' : SRC.slice(i, j + fin.length); }
const ligne = debut => { const i = SRC.indexOf(debut); if (i < 0) return ''; return SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 789 · 0. la population ──');
const P = {
  regle: bloc('function capDeduitRegle(cap){'), userCap: bloc('function userCap(u,cap){'), can: bloc('function can(cap){'),
  catRegle: bloc('function catDeduitRegle(grp,droit){'), catDroit: bloc('function catDroit(u,grp,droit){'), borner: bloc('function droitsBorner(nu,par){'),
  zone: bloc('function usrDeduireZone(z){'), deduire: bloc('function usrDeduire(el){'),
  valider: bloc('function usrDroitsValider(uid,btn){'), lire: bloc('function profilLireZone(zone){'),
  USER_CAPS: constante('const USER_CAPS=[', '\n];'), PERM_GRPS: ligne('const PERM_GRPS=['), PERM_SPECIAUX: ligne('const PERM_SPECIAUX={'),
  CAPS_HERITE: constante('const CAPS_HERITE = {', '\n};'), CAPS: ligne('const CAPS = Object.fromEntries('),
};
v('toutes les pièces sont trouvées dans le fichier réel', Object.keys(P).filter(k => !P[k]), []);
for (const n of ['capDeduitRegle', 'userCap', 'droitsBorner', 'usrDeduireZone'])
  v('… une seule définition de ' + n, SRC.split('function ' + n + '(').length - 1, 1);

/* Le monde : les vraies fonctions, la reprise RÉELLE (db.permissions[rôle].caps = CAPS_HERITE,
   exactement ce que reprendreDroitsImplicites écrit), et des menus simples. */
function monde(opts) {
  const o = opts || {};
  const ctx = { db: { users: [], permissions: {}, boxes: [], vehicules: [] }, currentUser: null, Object, JSON, String, Set, Array };
  vm.createContext(ctx);
  vm.runInContext([P.USER_CAPS, P.PERM_GRPS, P.PERM_SPECIAUX, P.CAPS_HERITE, P.CAPS, P.regle, P.userCap, P.can, P.catRegle, P.catDroit, P.borner].join('\n')
    + '\nthis.USER_CAPS=USER_CAPS; this.PERM_GRPS=PERM_GRPS; this.PERM_SPECIAUX=PERM_SPECIAUX; this.CAPS_HERITE=CAPS_HERITE;', ctx);
  if (o.reprise !== false) for (const [r, c] of Object.entries(ctx.CAPS_HERITE)) if (r !== 'admin')
    ctx.db.permissions[r] = { caps: Object.fromEntries(Object.entries(c).map(([k, x]) => [k, !!x])) };
  /* menus : ce que chaque rôle voit d'office (le vrai userSeesModule dépend de NAV, du forfait,
     du métier — hors sujet ici : on lui donne une table, et droitsBorner la lit comme l'autre) */
  const MENUS = o.menus || { technicien: ['interventions', 'planning'], chefEquipe: ['interventions', 'planning', 'equipe'],
    dr: ['interventions', 'planning', 'equipe', 'comptabilite', 'validations'], commercial: ['interventions', 'clients'], compta: ['comptabilite'] };
  ctx.NAV = [{ items: ['interventions', 'planning', 'equipe', 'comptabilite', 'clients', 'validations'].map(k => ({ k, l: k })) }];
  ctx.avecSousCats = x => x; ctx.t = x => x;
  /* v742 : le défaut de « Se servir dans le stockage » lit le périmètre (qui voit tout SANS équipe) */
  ctx.perimetreTechIds = u => (o.perim && u && o.perim[u.id]) ? new Set(o.perim[u.id]) : null;
  ctx.userSeesModule = (u, k) => { if (!u) return false; if (u.role === 'admin') return true;
    const ov = u.acces && u.acces.modules; if (ov && Object.prototype.hasOwnProperty.call(ov, k)) return ov[k] !== false;
    if (k === 'validations' && (ctx.userCap(u, 'validerDR') || u.boxValidDR)) return true;
    return (MENUS[u.role] || []).includes(k); };
  return ctx;
}
const M0 = monde();
vrai('population : la reprise porte les six rôles d’origine, et USER_CAPS plus de quinze cases', Object.keys(M0.CAPS_HERITE).length === 6 && M0.USER_CAPS.length > 15, [Object.keys(M0.CAPS_HERITE), M0.USER_CAPS.length]);

console.log('\n── 789 · 1. ⛔⛔ les règles sont des CASES, rangées dans leur catégorie ──');
const NEUVES = { voirEquipe: 'equipe', corrigerPointages: 'equipe', gererFiches: 'equipe', gererGroupes: 'com', mailPro: 'com' };
for (const [k, g] of Object.entries(NEUVES)) {
  const c = M0.USER_CAPS.find(x => x[0] === k);
  vrai('⛔ « ' + k + ' » est une case, avec son nom et ce qu’elle ouvre', !!c && c[1].length > 10 && (c[2] || '').length > 40, c);
  v('   … rangée dans « ' + g + ' » (et nulle part ailleurs)', Object.keys(M0.PERM_SPECIAUX).filter(x => M0.PERM_SPECIAUX[x].includes(k)), [g]);
}
const tous = [].concat(...Object.values(M0.PERM_SPECIAUX));
v('aucune case n’est rangée deux fois', tous.filter((k, i) => tous.indexOf(k) !== i), []);
v('toute case rangée existe dans USER_CAPS (sinon l’éditeur montre un nom de code)', tous.filter(k => !M0.USER_CAPS.some(x => x[0] === k)), []);

console.log('\n── 789 · 2. ⛔⛔ le DÉFAUT reproduit la veille — déduit d’autres cases, jamais du nom ──');
{ const M = monde(), cap = (role, k, acces) => M.userCap({ role, acces }, k);
  const ROLES = ['dr', 'chefEquipe', 'commercial', 'compta', 'technicien'];
  /* ce que chaque règle donnait LA VEILLE, par nom de rôle, sur la reprise réelle */
  const avant = {
    gererGroupes: r => ['dr', 'chefEquipe', 'commercial'].includes(r),                 // views.messagerie
    mailPro: r => ['dr', 'commercial', 'compta'].includes(r),                           // la carte des Paramètres
    voirEquipe: r => !!(M0.CAPS_HERITE[r].voirTout),                                    // voirTout||voirPointages (v735)
  };
  v('⛔⛔ « Gérer les groupes » : exactement les mêmes comptes que la liste de noms d’hier', ROLES.map(r => cap(r, 'gererGroupes')), ROLES.map(avant.gererGroupes));
  v('⛔ « Voir les fiches de son équipe » : exactement la règle de la v735', ROLES.map(r => cap(r, 'voirEquipe')), ROLES.map(avant.voirEquipe));
  v('   « Corriger les pointages » et « Régler les fiches » : la même', ROLES.map(r => [cap(r, 'corrigerPointages'), cap(r, 'gererFiches')]), ROLES.map(r => [avant.voirEquipe(r), avant.voirEquipe(r)]));
  /* ⚠️ le SEUL écart, voulu et écrit : le chef d'équipe voit la carte de SON adresse e-mail pro */
  v('⚠️ « E-mail pro » : la veille sauf le chef d’équipe, qui gagne la carte de SA propre adresse (écart écrit dans REPRISE)',
    ROLES.map(r => cap(r, 'mailPro')), ROLES.map(r => avant.mailPro(r) || r === 'chefEquipe'));
  v('⛔⛔ un rôle MAISON (juste un nom) n’ouvre aucune des cinq', Object.keys(NEUVES).map(k => cap('r_technicien3d_ab12', k)), [false, false, false, false, false]);
  v('   … ni un rôle d’origine dont l’entreprise n’a pas la reprise (le nom seul ne donne rien)', Object.keys(NEUVES).map(k => monde({ reprise: false }).userCap({ role: 'dr' }, k)), [false, false, false, false, false]);
  v('l’administrateur a les cinq', Object.keys(NEUVES).map(k => cap('admin', k)), [true, true, true, true, true]);
  /* le défaut SUIT ses bases : ce n'est pas une photo prise au chargement */
  v('⛔ le défaut suit ses cases de base : un technicien à qui l’on coche « Voir les pointages »', ['voirEquipe', 'corrigerPointages', 'gererFiches', 'gererGroupes'].map(k => cap('technicien', k, { caps: { voirPointages: true } })), [true, true, true, false]);
  v('   … et « Tout voir » + « Créer des interventions » font un coordinateur', ['gererGroupes', 'mailPro'].map(k => cap('technicien', k, { caps: { voirTout: true, creerIntervention: true } })), [true, true]);
}

console.log('\n── 789 · 3. ⛔⛔ une case réglée à part l’emporte, dans les deux sens ──');
{ const M = monde(), cap = (role, k, caps) => M.userCap({ role, acces: { caps } }, k);
  v('⛔⛔ un DR à qui l’on retire chacune des cinq', Object.keys(NEUVES).map(k => cap('dr', k, { [k]: false })), [false, false, false, false, false]);
  v('⛔⛔ un technicien à qui l’on donne chacune des cinq', Object.keys(NEUVES).map(k => cap('technicien', k, { [k]: true })), [true, true, true, true, true]);
  v('⛔ retirer « Voir les fiches » ne retire pas « Tout voir » (chaque case est indépendante)', [cap('dr', 'voirTout', { voirEquipe: false }), cap('dr', 'voirEquipe', { voirEquipe: false })], [true, false]);
  v('contre-épreuve : l’administrateur ne se voit rien retirer (il n’a rien à cocher)', Object.keys(NEUVES).map(k => M.userCap({ role: 'admin', acces: { caps: { [k]: false } } }, k)), [true, true, true, true, true]);
}

console.log('\n── 789 · 4. ⛔⛔ l’éditeur : une case déduite suit ses bases EN DIRECT, tant qu’on n’y touche pas ──');
/* Une zone de l'écran Utilisateurs, telle que usrDroitsHtml la dessine : un interrupteur par case,
   data-deduit="1" sur les cases déduites que rien n'a encore réglées. */
function zoneFactice(etat) {
  const ins = Object.entries(etat).map(([k, x]) => ({ checked: !!x.on, dataset: Object.assign({ d: 'cap_' + k }, x.deduit ? { deduit: x.deduit } : {}), disabled: false }));
  const z = { ins, closest: () => z,
    querySelectorAll: sel => sel === 'input[data-d^="cap_"]' ? ins.filter(i => i.dataset.d.startsWith('cap_'))
      : sel === 'input[data-deduit="1"]' ? ins.filter(i => i.dataset.deduit === '1') : [],
    querySelector: sel => { const m = /\[data-d="([^"]+)"\]/.exec(sel); return m ? ins.find(i => i.dataset.d === m[1]) || null : null; } };
  ins.forEach(i => { i.closest = () => z; });
  z.get = k => ins.find(i => i.dataset.d === 'cap_' + k);
  return z;
}
function mondeEditeur() {
  const M = monde();
  vm.runInContext(P.zone + '\n' + P.deduire + '\n' + P.valider + '\n' + P.lire, M);
  return M;
}
{ const M = mondeEditeur();
  const z = zoneFactice({ voirTout: { on: false }, voirPointages: { on: false }, creerIntervention: { on: true },
    voirEquipe: { on: false, deduit: '1' }, gererGroupes: { on: false, deduit: '1' }, mailPro: { on: false, deduit: '1' },
    corrigerPointages: { on: false, deduit: '0' } });
  z.get('voirTout').checked = true; M.usrDeduire(z.get('voirTout'));
  v('⛔⛔ cocher « Tout voir » coche aussitôt les cases qui en découlent', ['voirEquipe', 'gererGroupes', 'mailPro'].map(k => z.get(k).checked), [true, true, true]);
  v('⛔ … mais pas une case déjà RÉGLÉE à part (c’est une décision)', z.get('corrigerPointages').checked, false);
  M.usrDeduire(z.get('voirEquipe'));
  v('⛔ toucher une case déduite en fait une décision', z.get('voirEquipe').dataset.deduit, '0');
  z.get('voirEquipe').checked = true; z.get('voirTout').checked = false; M.usrDeduire(z.get('voirTout'));
  v('⛔ décocher « Tout voir » : les cases non touchées suivent, celle qu’on a touchée reste', ['voirEquipe', 'gererGroupes', 'mailPro'].map(k => z.get(k).checked), [true, false, false]);
}
console.log('\n── 789 · 5. ⛔⛔ « Valider » n’écrit pas une case déduite qu’on n’a pas touchée ──');
{ const M = mondeEditeur();
  const u = { id: 'uK', role: 'technicien', login: 'karim' };
  const z = zoneFactice({ voirTout: { on: true }, voirPointages: { on: false }, creerIntervention: { on: true },
    voirEquipe: { on: true, deduit: '1' }, gererGroupes: { on: true, deduit: '1' }, mailPro: { on: true, deduit: '1' },
    corrigerPointages: { on: false, deduit: '0' }, gererFiches: { on: true } });
  Object.assign(M, { currentUser: { id: 'uA', role: 'admin' }, document: { getElementById: id => id === 'usr-d-uK' ? z : null },
    NAV: [], avecSousCats: x => x, userBoxVoit: () => {}, userVehiculeVoit: () => {}, logEvent: () => {}, save: () => {}, toast: () => {},
    fullName: x => x.login, btnFait: () => false, views: { utilisateurs: () => {} }, setTimeout: f => f() });
  M.db.users = [u];
  M.usrDroitsValider('uK');
  const w = u.acces.caps;
  v('⛔⛔ les cases touchées ou non déduites s’écrivent', [w.voirTout, w.creerIntervention, w.corrigerPointages, w.gererFiches], [true, true, false, true]);
  v('⛔⛔ les cases déduites NON touchées ne s’écrivent pas — elles suivront leurs bases', ['voirEquipe', 'gererGroupes', 'mailPro'].filter(k => Object.prototype.hasOwnProperty.call(w, k)), []);
  v('… et se lisent quand même comme on les a vues à l’écran', ['voirEquipe', 'gererGroupes', 'mailPro'].map(k => M.userCap(u, k)), [true, true, true]);
  u.acces.caps.voirTout = false;
  v('⛔ la preuve qu’elles suivent : « Tout voir » retiré plus tard, elles s’éteignent avec lui', ['voirEquipe', 'gererGroupes'].map(k => M.userCap(u, k)), [false, false]);
  const pr = M.profilLireZone(z);
  v('⛔ un PROFIL enregistré depuis cette ligne ne fige pas non plus les cases déduites', ['voirEquipe', 'gererGroupes', 'mailPro'].filter(k => Object.prototype.hasOwnProperty.call(pr.caps, k)), []);
  vrai('   … mais garde les décisions', pr.caps.corrigerPointages === false && pr.caps.gererFiches === true, pr.caps);
}

console.log('\n── 789 · 6. ⛔⛔ PERSONNE NE DONNE UN DROIT QU’IL N’A PAS (droitsBorner, exécuté) ──');
{ const M = monde();
  const chef = { id: 'uR', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true } } };
  const nu = { id: 'nu', role: 'dr', acces: { caps: {}, modules: {} } };
  vrai('population : avant, le nouveau « DR » aurait validé et vu la comptabilité', M.userCap(nu, 'validerDR') && M.userCap(nu, 'voirCompta') && M.userSeesModule(nu, 'comptabilite'));
  const ret = M.droitsBorner(nu, chef);
  v('⛔⛔ un chef crée un « DR » : ni validation, ni comptabilité, ni leur menu', [M.userCap(nu, 'validerDR'), M.userCap(nu, 'voirCompta'), M.userSeesModule(nu, 'comptabilite')], [false, false, false]);
  const trop = M.USER_CAPS.map(c => c[0]).filter(k => k !== 'bonsLectureSeule' && M.userCap(nu, k) && !M.userCap(chef, k));
  v('⛔⛔ AUCUNE case du nouveau compte n’excède celles de son créateur', trop, []);
  const tropCat = [].concat(...M.PERM_GRPS.map(([g]) => ['ajouter', 'modifier', 'supprimer'].filter(d => M.catDroit(nu, g, d) && !M.catDroit(chef, g, d)).map(d => g + '/' + d)));
  v('⛔ … ni aucune action de catégorie', tropCat, []);
  vrai('⛔ et le créateur apprend ce qui a été retenu', ret.length >= 2 && ret.some(x => /Valider/.test(x)), ret);
  vrai('… ce qu’il a lui-même passe (Tout voir, planifier…)', M.userCap(nu, 'voirTout') && M.userCap(nu, 'creerIntervention'));
}
{ const M = monde();
  const tech = { id: 'uT', role: 'technicien', acces: { caps: { creerUtilisateurs: true } } };
  const nu = { id: 'nu', role: 'dr', acces: { caps: {}, modules: {} } };
  M.droitsBorner(nu, tech);
  v('⛔ les bases sont bornées (« Tout voir » écrit à NON)…', nu.acces.caps.voirTout, false);
  v('⛔⛔ … et les cases DÉDUITES ne sont pas figées : leur défaut, bases bornées, est déjà NON', ['voirEquipe', 'corrigerPointages', 'gererFiches', 'gererGroupes', 'mailPro'].filter(k => Object.prototype.hasOwnProperty.call(nu.acces.caps, k)), []);
  v('   … et se lisent bien NON', ['voirEquipe', 'gererGroupes'].map(k => M.userCap(nu, k)), [false, false]);
}
{ const M = monde();
  /* ⚠️ la SECONDE passe a sa propre raison d'être : un créateur qui a « Tout voir » mais à qui l'on a
     retiré « Voir les fiches » À PART. Ses bases passent, sa case déduite non — sans la seconde
     passe, le nouveau compte recevrait ce que son créateur s'est vu retirer. */
  const chef = { id: 'uR', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true, voirEquipe: false } } };
  const nu = { id: 'nu', role: 'dr', acces: { caps: {}, modules: {} } };
  M.droitsBorner(nu, chef);
  v('⛔⛔ une case DÉDUITE retirée à part au créateur l’est aussi au nouveau compte (ses bases, elles, passent)', [M.userCap(nu, 'voirTout'), M.userCap(nu, 'voirEquipe'), nu.acces.caps.voirEquipe], [true, false, false]);
}
{ const M = monde();
  /* ⚠️ « Validations » : un créateur qui ne la voit pas crée un compte SOUMIS à la validation DR
     (la case du formulaire) — ce compte doit voir où en sont ses demandes. */
  const chef = { id: 'uR', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true } } };
  const nu = { id: 'nu', role: 'technicien', boxValidDR: true, acces: { caps: {}, modules: {} } };
  vrai('population : le créateur ne voit pas « Validations », le nouveau compte soumis la verrait', !M.userSeesModule(chef, 'validations') && M.userSeesModule(nu, 'validations'));
  M.droitsBorner(nu, chef);
  v('⛔ … et la garde la lui laisse (le contenu y est filtré à SES demandes)', [M.userSeesModule(nu, 'validations'), Object.prototype.hasOwnProperty.call(nu.acces.modules, 'validations')], [true, false]);
}
{ const M = monde();
  const lecteur = { id: 'uB', role: 'technicien', acces: { caps: { creerUtilisateurs: true, bonsLectureSeule: true } } };
  const nu = { id: 'nu', role: 'technicien', acces: { caps: {}, modules: {} } };
  M.droitsBorner(nu, lecteur);
  v('⛔ la « consultation seule » des bons se TRANSMET (droit écrit à l’envers)', M.userCap(nu, 'bonsLectureSeule'), true);
}
{ const M = monde();
  const soumis = { id: 'uS', role: 'chefEquipe', boxValidDR: true, acces: { caps: { creerUtilisateurs: true } } };
  const nu = { id: 'nu', role: 'technicien', boxValidDR: false, acces: { caps: {}, modules: {} } };
  M.droitsBorner(nu, soumis);
  v('⛔⛔ qui est soumis à la validation DR ne crée pas un compte qui y échappe', nu.boxValidDR, true);
  v('   … et ce compte voit « Validations » (où en sont SES demandes — le contenu y est filtré)', M.userSeesModule(nu, 'validations'), true);
}
{ const M = monde();
  const sansStock = { id: 'uX', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true, cat_stock_ajouter: false } } };
  const nu = { id: 'nu', role: 'chefEquipe', acces: { caps: {}, modules: {} } };
  M.droitsBorner(nu, sansStock);
  v('⛔ « Stock → Ajouter » retiré au créateur l’est au nouveau compte', [M.catDroit(nu, 'stock', 'ajouter'), nu.acces.caps.cat_stock_ajouter], [false, false]);
}
{ const M = monde();
  const admin = { id: 'uA', role: 'admin' }, nu = { id: 'nu', role: 'dr', acces: { caps: {}, modules: {} } };
  v('contre-épreuve : un administrateur ne borne rien', [M.droitsBorner(nu, admin), nu.acces.caps], [[], {}]);
  const dr = { id: 'uL', role: 'dr', acces: { caps: { creerUtilisateurs: true } } }, nu2 = { id: 'nu2', role: 'technicien', acces: { caps: {}, modules: {} } };
  v('contre-épreuve : un créateur qui a TOUT ce que le nouveau rôle ouvre ne retient rien', M.droitsBorner(nu2, dr), []);
}

console.log('\n── 789 · 7. ⛔ la création de comptes : plus de nom interdit, des droits bornés ──');
const fu = bloc('function formUser(id){'), su = bloc('async function saveUser(e,id){');
vrai('population : formUser et saveUser sont trouvés', fu.length > 3000 && su.length > 3000, [fu.length, su.length]);
vrai('⛔⛔ plus aucune liste de noms de rôles dans formUser ni saveUser', !/\['admin','dr'\]/.test(fu + su), (fu + su).match(/\[[^\]]*'dr'[^\]]*\]/g));
vrai('⛔ le menu des rôles ne retire que l’Administrateur (ROLE_PROTEGE)', /rolesTous\(u\.role\)\.filter\(d=>currentUser\.role==='admin'\|\|d\.cle!==ROLE_PROTEGE\)/.test(fu));
vrai('⛔ l’enregistrement le refuse aussi', /if\(currentUser\.role!=='admin' && d\.role===ROLE_PROTEGE\)\{ toast\(/.test(su));
const iB = su.indexOf('droitsBorner(nu,currentUser)'), iP = su.indexOf('db.users.push(nu)');
vrai('⛔⛔ les droits sont bornés AVANT que le compte n’entre dans la base', iB > 0 && iP > iB, [iB, iP]);
vrai('⛔ un profil ne se pose qu’à la création par un administrateur', /if\(!id && d\.profil && currentUser\.role==='admin'\)\{/.test(su));
vrai('⛔ les box et véhicules proposés à un créateur qui n’est pas administrateur sont les siens',
  /if\(currentUser&&currentUser\.role!=='admin'\) bs=visibleBoxes\(bs\);/.test(SRC) && /if\(currentUser&&currentUser\.role!=='admin'\) vs=visibleVehicules\(vs\);/.test(SRC));
vrai('… et la boucle de création le vérifie (test-710 l’exécute)', /if\(currentUser\.role!=='admin'&&!visibleBoxes\(\[b\]\)\.length\) return;/.test(su) && /if\(currentUser\.role!=='admin'&&!visibleVehicules\(\[v\]\)\.length\) return;/.test(su));

/* « …et les rôles dans les paramètres utilisateur » : la liste des rôles ne s'atteignait que par un
   lien au milieu du formulaire d'un compte. Elle a désormais son bouton dans l'en-tête d'Utilisateurs,
   à côté des profils — pour l'administrateur seul, comme rolesGerer elle-même. */
const vu = bloc('views.utilisateurs=function(){');
vrai('⛔ « 🏷 Rôles » est dans l’en-tête d’Utilisateurs, réservé à l’administrateur',
  /\(currentUser&&currentUser\.role==='admin'\?`<button class="btn ghost" onclick="rolesGerer\(\)"[^>]*>🏷 Rôles<\/button>/.test(vu), vu.slice(0, 120));
vrai('… et rolesGerer se garde elle-même', /function rolesGerer\(\)\{\n  if\(!currentUser\|\|currentUser\.role!=='admin'\)\{ toast\('Réservé aux administrateurs'\); return; \}/.test(SRC));

console.log('\n── 789 · 8. ⛔⛔ plus AUCUNE décision prise sur le nom d’un rôle ──');
/* Recensement sur tout le fichier, commentaires retirés : `role==='dr'`, `['admin','dr',…].includes(…role)`…
   Deux lectures restent, NOMMÉES : ce sont des DÉFAUTS, pas des décisions — et elles ne donnent
   aucun droit d'action. */
const PERMIS = {
  moduleReglage: 'le gabarit de menus par défaut d’un rôle sans réglage (un rôle maison part de celui du technicien)',
  moduleHeriteRole: 'la reprise de la v585 : ce que chaque rôle voyait d’office AVANT que le rôle devienne un nom',
};
const fns = [...SRC.matchAll(/(?:async\s+)?function\s+([A-Za-z0-9_$]+)\s*\(|views\.([A-Za-z0-9_]+)\s*=\s*function/g)].map(x => ({ nom: x[1] || ('views.' + x[2]), i: x.index }));
const RX = /role\s*[!=]==?\s*["'](dr|chefEquipe|commercial|compta|technicien)["']|\[[^\]\n]*["'](dr|chefEquipe|commercial|compta)["'][^\]\n]*\]\.includes\([^)]*role/g;
const trouves = []; let m;
while ((m = RX.exec(SRC))) { let f = null; for (const x of fns) { if (x.i < m.index) f = x; else break; } trouves.push((f ? f.nom : '?') + ' : ' + m[0]); }
vrai('population : le recensement trouve bien les deux lectures permises (il regarde au bon endroit)', trouves.some(x => x.startsWith('moduleReglage')) && trouves.some(x => x.startsWith('moduleHeriteRole')), trouves);
v('⛔⛔ aucune AUTRE décision sur un nom de rôle', trouves.filter(x => !PERMIS[x.split(' : ')[0]]), []);
/* les dix endroits d'hier, un par un, lisent leur case */
const accueil = bloc('function accueilJournee(){');
vrai('⛔ « Ta journée » : qui ne voit que ses interventions (« Tout voir »), plus « admin, dr, chefEquipe »', /if\(can\('voirTout'\)\) return false;/.test(accueil));
vrai('⛔ l’onglet « Supprimées » des interventions : la case « Interventions → Supprimer »', /const canDelF=catDroit\(currentUser,'int','supprimer'\);/.test(SRC));
vrai('⛔ la carte « Mon e-mail professionnel » : la case', /if\(!can\('mailPro'\)\) return '';/.test(BRUT));
vrai('⛔ … et l’adresse pro ne sert plus à l’envoi quand la case est retirée', /currentUser\.mailBox\.pass&&can\('mailPro'\)\)\?currentUser\.mailBox:null/.test(SRC));
vrai('⛔ … ni ne se règle', /function userMailForm\(\)\{ if\(!can\('mailPro'\)\)/.test(SRC) && /function userMailSave\(e\)\{ e\.preventDefault\(\); if\(!can\('mailPro'\)\)/.test(SRC));
vrai('⛔ la Messagerie : la case « Gérer les groupes »', /const isMgr=can\('gererGroupes'\);/.test(SRC));
vrai('⛔ les alertes de box : le droit de valider, plus le nom « dr »', /function notifBoxConcerne\(b\)\{[\s\S]{0,400}if\(can\('validerDR'\)\)\{/.test(SRC));
vrai('⛔ stock bas, enveloppes, secteurs sans technicien : le droit de valider', /const estDir=can\('validerDR'\);/.test(SRC));
vrai('⛔ « Travail terminé » : le valideur, et le commercial NOMMÉ sur l’intervention quel que soit son rôle', /const forMe=\(can\('validerDR'\)\|\|\(!!com&&[^;]*\)&&OUV\(\)\.int\(i\);/.test(SRC));
vrai('⛔ « Matériel pris dans une box » : qui valide ou voit tout', /if\(vBox && currentUser && \(can\('validerDR'\)\|\|can\('voirTout'\)\)\)\{/.test(SRC));

console.log('\n── 789 · 10. ⛔⛔ « Se servir dans le stockage » est une CASE (v742) ──');
/* Justin, 24 septembre 2026 : « l'accès au stockage est une permission ». En v741 il se donnait comme
   l'accès d'une box, depuis une liste posée sur le stockage : invisible dans les droits de la personne,
   absent des profils. On JOUE ici les vraies fonctions de droits : la case existe, est rangée dans le
   Stock, n'est à PERSONNE tant qu'on ne la coche pas — sauf l'administrateur (v743, Justin : « l'administrateur
   seul ») —, et ne se donne pas sans l'avoir. */
{ const M = monde();
  const K = M.USER_CAPS.find(c => c[0] === 'stockage');
  vrai('la case existe, nommée pour ce qu’elle ouvre', !!K && /Se servir dans le stockage/.test(K[1]) && /Me servir/.test(K[2]), K);
  vrai('… rangée dans la catégorie Stock (elle paraît d’elle-même sur la ligne de chaque personne et dans les profils)', (M.PERM_SPECIAUX.stock || []).includes('stockage'), M.PERM_SPECIAUX.stock);
  const bureau = { id: 'uB', role: 'compta', acces: { caps: { voirTout: true } } };
  const dr = { id: 'uD', role: 'dr', acces: { caps: { voirTout: true } } };
  const tech = { id: 'uT', role: 'technicien', acces: { caps: { voirTout: false } } };
  const M2 = monde({ perim: { uD: ['t1', 't2'] } });
  /* v743 : la v742 la donnait d'office à qui « voit tout » sans équipe — le bureau, mais aussi un chef ou un DR
     créé sans personne rattaché. Justin : « l'administrateur seul ». Donner l'accès est un geste. */
  const chefSeul = { id: 'uC', role: 'chefEquipe', acces: { caps: { voirTout: true } } };
  v('⛔⛔ v743 — défaut (rien de réglé) : l’administrateur SEUL — ni le bureau, ni un chef sans équipe, ni un DR, ni un technicien',
    [M2.userCap({ id: 'uA', role: 'admin' }, 'stockage'), M2.userCap(bureau, 'stockage'), M2.userCap(chefSeul, 'stockage'), M2.userCap(dr, 'stockage'), M2.userCap(tech, 'stockage')], [true, false, false, false, false]);
  v('⛔ … et plus aucun défaut DÉDUIT d’autres cases (l’éditeur ne la fait plus suivre « Tout voir »)', M2.capDeduitRegle('stockage'), null);
  tech.acces.caps.stockage = true; bureau.acces.caps.stockage = true; dr.acces.caps.stockage = false;
  v('⛔⛔ la case RÉGLÉE décide, dans les deux sens (on la donne au technicien et au bureau, on la retire à un DR)', [M2.userCap(tech, 'stockage'), M2.userCap(bureau, 'stockage'), M2.userCap(dr, 'stockage')], [true, true, false]);
  const chef = { id: 'uR', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true, voirTout: true } } };
  const M3 = monde({ perim: { uR: ['t9'] } });
  const nu = { id: 'nu', role: 'technicien', acces: { caps: { stockage: true }, modules: {} } };
  const ret = M3.droitsBorner(nu, chef);
  v('⛔⛔ personne ne donne le stockage sans l’avoir : un chef à équipe (sans la case) crée un compte coché → retenu', [M3.userCap(nu, 'stockage'), ret.some(x => /stockage/.test(x))], [false, true]);
  const chef2 = { id: 'uR2', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true, stockage: true } } };
  const nu2 = { id: 'nu2', role: 'technicien', acces: { caps: { stockage: true }, modules: {} } };
  M3.droitsBorner(nu2, chef2);
  v('contre-épreuve : un créateur qui l’a la transmet', M3.userCap(nu2, 'stockage'), true); }

console.log('\n── 789 · 9. la mesure dans une vraie page existe ──');
const PS = path.join(__dirname, '..', 'scratchpad', 'sonde-droits.js');
const SONDE = fs.existsSync(PS) ? fs.readFileSync(PS, 'utf8') : '';
vrai('scratchpad/sonde-droits.js existe', !!SONDE);
vrai('… elle déplie la ligne d’une personne dans Utilisateurs et y cherche les cinq cases', /usrDeplier\(/.test(SONDE) && /voirEquipe/.test(SONDE) && /mailPro/.test(SONDE));
vrai('… elle crée un compte en chef d’équipe (pas en administrateur) et relit ses droits', /saveUser\(/.test(SONDE) && /chefEquipe/.test(SONDE));
vrai('… elle sait tourner sur une bêta d’avant (contre-épreuve)', /process\.env\.SOURCE/.test(SONDE));
vrai('… sur la BÊTA, jamais sur app.html', !/app\.html/.test(SONDE));

console.log(`\n════ test-789 : ${ok} ✓ ${ko} ✗ ════\n`);
process.exit(ko ? 1 : 0);
