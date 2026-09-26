/* ══ TROIS POINTS DES DROITS, CORRIGÉS (v753) ═══════════════════════════════════════════════════
   Justin, 26 septembre 2026, sur les trois points relevés en écrivant le guide des droits : « Fait ce
   qu'il faut faire pour ça ».
   1. LE TEXTE DE LA CRÉATION DE COMPTE MENTAIT. Le choix « aucun profil » disait « le compte partira
      sans droits » ; l'aide du rôle et la fenêtre « 🏷 Rôles » disaient « le rôle n'ouvre aucun
      droit ». Or un compte sans profil reçoit la liste de son rôle. Le banc prouve le comportement
      (un compte neuf sans réglage voit exactement la liste de son rôle) ET que les textes le disent.
   2. « VALIDATIONS DR » NE S'OUVRAIT PAS AVEC LA CASE DE VALIDATION. La règle « une validation se voit
      des deux côtés » existait depuis la v585, mais APRÈS la liste du rôle (`validations:false` chez le
      technicien, le commercial, la compta) : elle ne jouait jamais. Cocher « Valider les mouvements… »
      ne donnait ni l'écran ni les alertes « à valider » (notifVoitModule lit ce menu), et une personne
      soumise à la validation ne voyait jamais où en étaient ses mouvements. Désormais : ouvert d'office
      aux deux bouts, AVANT tout réglage, sauf si le forfait l'exclut ; la ligne de la personne le montre
      ouvert et verrouillé, suit la case en direct, et n'enregistre jamais l'ouverture d'office comme
      une décision (usrMenuLu).
   3. UN RÔLE CRÉÉ À LA MAIN AVAIT LES MENUS DU TECHNICIEN, MAIS AUCUN DE SES DROITS. `moduleReglage`
      se repliait sur la liste du technicien, `userCap` et `catDroit` non. Une seule définition
      désormais (`tableDuRole`), lue par les trois.
   Tout est EXÉCUTÉ : les vraies fonctions du fichier livré, les vraies listes (NAV, USER_CAPS, la liste
   de départ, la reprise). Le rendu dans la vraie page est mesuré par `scratchpad/sonde-droits-v753.js`. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* le texte servi, commentaires de bloc en début de ligne retirés (la règle du dépôt : un motif vise du code) */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

function bloc(debut) {
  const i = BRUT.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = BRUT.indexOf('{', i); k < BRUT.length; k++) {
    if (BRUT[k] === '{') p++; else if (BRUT[k] === '}') { p--; if (!p) return BRUT.slice(i, k + 1); } }
  return '';
}
const constante = (debut, fin) => { const i = BRUT.indexOf(debut); if (i < 0) return ''; const j = BRUT.indexOf(fin, i); return j < 0 ? '' : BRUT.slice(i, j + fin.length); };
const ligne = debut => { const i = BRUT.indexOf(debut); return i < 0 ? '' : BRUT.slice(i, BRUT.indexOf('\n', i)); };
const compte = s => BRUT.split(s).length - 1;

console.log('\n── 821 · 0. la population ──');
const P = {
  NAV: constante('const NAV = [', '\n];'), SOUS_CATS: ligne('const SOUS_CATS=['), avecSousCats: bloc('function avecSousCats(items){'),
  USER_CAPS: constante('const USER_CAPS=[', '\n];'), PERM_GRPS: ligne('const PERM_GRPS=['), PERM_GRP_OF: ligne('const PERM_GRP_OF='),
  PERM_SPECIAUX: ligne('const PERM_SPECIAUX={'), CAPS_HERITE: constante('const CAPS_HERITE = {', '\n};'), CAPS: ligne('const CAPS = Object.fromEntries('),
  defaultPerms: bloc('function defaultPerms(){'), moduleHeriteRole: bloc('function moduleHeriteRole(role,k){'), reprise: bloc('function reprendreDroitsImplicites(){'),
  tableDuRole: bloc('function tableDuRole(role){'), moduleReglage: bloc('function moduleReglage(u,k){'), userSeesModule: bloc('function userSeesModule(u,k){'),
  capDeduitRegle: bloc('function capDeduitRegle(cap){'), userCap: bloc('function userCap(u,cap){'), can: bloc('function can(cap){'),
  catDeduitRegle: bloc('function catDeduitRegle(grp,droit){'), catDroit: bloc('function catDroit(u,grp,droit){'),
  valideSoumis: bloc('function valideSoumis(u){'), validationsOuvertes: bloc('function validationsOuvertes(u){'), validationsNote: bloc('function validationsNote(valideur){'),
  boxValidRequis: bloc('function boxValidRequis(){'), notifVoitModule: bloc('function notifVoitModule(k){'), droitsBorner: bloc('function droitsBorner(nu,par){'),
  esc: ligne('const esc = s =>'), boxExclu: ligne('const boxExclu='), navLabel: bloc('function navLabel(k){'),
  profilsDroits: bloc('function profilsDroits(){'), profilCompte: bloc('function profilCompte(pr){'), profilNomSw: ligne('const profilNomSw='),
  usrMenuLu: bloc('function usrMenuLu(zone,k){'), profilLireZone: bloc('function profilLireZone(zone){'), profilPoserZone: bloc('function profilPoserZone(zone,pr){'),
  usrDeduireZone: bloc('function usrDeduireZone(z){'), usrDeduire: bloc('function usrDeduire(el){'), usrVoirTout: bloc('function usrVoirTout(cb){'),
  usrDroitsValider: bloc('function usrDroitsValider(uid,btn){'), usrDroitsHtml: bloc('function usrDroitsHtml(u,admin){'),
};
v('toutes les pièces sont trouvées dans le fichier réel', Object.keys(P).filter(k => !P[k]), []);
v('une seule définition de chaque règle neuve (deux copies divergent toujours)',
  ['tableDuRole', 'valideSoumis', 'validationsOuvertes', 'validationsNote', 'usrMenuLu', 'boxValidRequis'].map(n => compte('function ' + n + '(')), [1, 1, 1, 1, 1, 1]);
vrai('⛔ la liste d’un rôle ne se lit plus qu’à un endroit : plus aucune lecture directe de db.permissions[rôle] ailleurs',
  (SRC.match(/db\.permissions\s*(&&\s*db\.permissions)?\[\s*u\.role\s*\]/g) || []).length === 0 && (SRC.match(/\(db\.permissions\|\|\{\}\)\[u\.role\]/g) || []).length === 0,
  SRC.match(/db\.permissions\s*(&&\s*db\.permissions)?\[\s*u\.role\s*\]|\(db\.permissions\|\|\{\}\)\[u\.role\]/g));

/* Le monde : les vraies fonctions, une entreprise NEUVE (la vraie liste de départ puis la vraie reprise). */
function monde(opts) {
  const o = opts || {};
  const ctx = { Object, JSON, String, Set, Array, Math, console: { log() {}, warn() {}, error() {} },
    localStorage: { getItem: () => null }, __plan: o.plan || [], currentUser: null, document: null };
  vm.createContext(ctx);
  vm.runInContext(`
    var db = { users: [], boxes: [], vehicules: [], profilsDroits: [] };
    function planBloque(k){ return __plan.includes(k); } function metierBloque(){ return false; }
    function logEvent(){} function save(){} function toast(){} function t(x){ return x; }
    function estStockage(){ return false; } function showAside(){ return false; }
    function userBoxVoit(){} function userVehiculeVoit(){} function fullName(u){ return ((u.prenom||'')+' '+(u.nom||'')).trim()||u.login||''; }
    function btnFait(){ return false; } var views = { utilisateurs(){} };
    ${P.NAV}
    ${P.SOUS_CATS}
    ${P.avecSousCats}
    ${P.USER_CAPS}
    ${P.PERM_GRPS}
    ${P.PERM_GRP_OF}
    ${P.PERM_SPECIAUX}
    ${P.CAPS_HERITE}
    ${P.CAPS}
    ${P.esc}
    ${P.boxExclu}
    ${[P.defaultPerms, P.moduleHeriteRole, P.reprise, P.tableDuRole, P.moduleReglage, P.userSeesModule, P.capDeduitRegle, P.userCap, P.can,
       P.catDeduitRegle, P.catDroit, P.valideSoumis, P.validationsOuvertes, P.validationsNote, P.boxValidRequis, P.notifVoitModule, P.droitsBorner,
       P.navLabel, P.profilsDroits, P.profilCompte].join('\n')}
    ${P.profilNomSw}
    ${[P.usrMenuLu, P.profilLireZone, P.profilPoserZone, P.usrDeduireZone, P.usrDeduire, P.usrVoirTout, P.usrDroitsValider, P.usrDroitsHtml].join('\n')}
    db.permissions = defaultPerms(); reprendreDroitsImplicites();
    this.db = db; this.NAV = NAV; this.SOUS_CATS = SOUS_CATS; this.USER_CAPS = USER_CAPS; this.PERM_GRPS = PERM_GRPS;
    this.defaultPerms = defaultPerms; this.tableDuRole = tableDuRole; this.userSeesModule = userSeesModule; this.userCap = userCap;
    this.catDroit = catDroit; this.valideSoumis = valideSoumis; this.validationsOuvertes = validationsOuvertes; this.validationsNote = validationsNote;
    this.boxValidRequis = boxValidRequis; this.notifVoitModule = notifVoitModule; this.droitsBorner = droitsBorner;
    this.usrMenuLu = usrMenuLu; this.profilLireZone = profilLireZone; this.profilPoserZone = profilPoserZone; this.usrDeduireZone = usrDeduireZone;
    this.usrDeduire = usrDeduire; this.usrDroitsValider = usrDroitsValider; this.usrDroitsHtml = usrDroitsHtml;
    this.poser = (k, x) => { if (k === 'currentUser') currentUser = x; if (k === 'document') document = x; };
  `, ctx);
  return ctx;
}
let M = null;
try { M = monde(); } catch (e) { console.log('      (montage : ' + e.message + ')'); }
vrai('⛔ les vraies fonctions s’exécutent ensemble (liste de départ, reprise, menu, droits, éditeur)', !!M);
if (!M) { console.log(`\n════ test-821 : ${ok} ✓ ${ko} ✗ ════`); process.exit(1); }
const CLES = M.NAV.flatMap(g => g.items).flatMap(it => [it.k].concat(M.SOUS_CATS.filter(s => s.parent === it.k).map(s => s.k)));
const LT = M.db.permissions.technicien;
vrai('population : une entreprise neuve, cinq listes de rôle, ' + CLES.length + ' rubriques',
  ['technicien', 'commercial', 'compta', 'dr', 'chefEquipe'].every(r => !!M.db.permissions[r]) && CLES.length >= 40);
vrai('population : la liste du technicien FERME « Validations DR » et OUVRE « Modifier les plans d’appâtage » (sinon ce banc ne mesure rien)',
  LT.validations === false && !!(LT.caps && LT.caps.modifierPlans === true), { validations: LT.validations, modifierPlans: LT.caps && LT.caps.modifierPlans });

console.log('\n── 821 · 1. le texte de la création de compte dit ce qui se passe ──');
{ const nu = { id: 'n1', role: 'technicien', acces: { caps: {}, modules: {} } };   // ce que saveUser pose sans profil
  v('⛔ un compte créé SANS profil voit exactement la liste de son rôle (menus)', CLES.filter(k => M.userSeesModule(nu, k) !== (LT[k] === true)), []);
  v('⛔ … et en a les droits spéciaux', M.USER_CAPS.map(c => c[0]).filter(k => LT.caps && k in LT.caps && M.userCap(nu, k) !== !!LT.caps[k]), []);
  vrai('le choix « aucun profil » le dit', SRC.includes('<option value="">— aucun : il suit la liste de son rôle —</option>'));
  vrai('⛔ plus aucun texte « partira sans droits » ni « n’ouvre aucun droit » dans ce que l’application affiche',
    !/partira sans droits|n\\?'ouvre aucun droit/.test(SRC), SRC.match(/.{40}(partira sans droits|n\\?'ouvre aucun droit).{20}/g));
  vrai('l’aide du rôle dit « un nom, et un point de départ »', /<b>Le rôle est un nom, et un point de départ<\/b> : sans profil, le compte suit la liste de son rôle/.test(SRC));
  vrai('la fenêtre « 🏷 Rôles » dit qu’un rôle créé à la main part de la liste du technicien', /un compte sans profil suit la liste de son rôle — un rôle créé ici part de celle du technicien/.test(SRC));
  vrai('l’aide sans profil enregistré le dit aussi', /Aucun profil pour l\\'instant : le compte suivra la liste de son rôle\./.test(SRC));
}

console.log('\n── 821 · 2. ⛔⛔ « Validations DR » s’ouvre avec la case de validation, et pour qui est soumis ──');
{ const tech = { id: 't', role: 'technicien' };
  const val = { id: 'tv', role: 'technicien', acces: { caps: { validerDR: true } } };
  const valFerme = { id: 'tvf', role: 'technicien', acces: { caps: { validerDR: true }, modules: { validations: false } } };
  const soumis = { id: 'ts', role: 'technicien', boxValidDR: true };
  vrai('population : un technicien ordinaire ne voit pas « Validations DR »', M.userSeesModule(tech, 'validations') === false);
  vrai('⛔ la case « Valider les mouvements… » l’ouvre (v752 : fermé, la case ne servait à rien)', M.userSeesModule(val, 'validations') === true);
  vrai('⛔ … même si un réglage à part avait écrit « fermé » (l’éditeur écrit tous les menus à chaque validation)', M.userSeesModule(valFerme, 'validations') === true);
  vrai('⛔ la personne soumise à la validation (case de sa fiche) le voit : elle y suit ses mouvements', M.userSeesModule(soumis, 'validations') === true);
  M.db.validDRTous = true;
  v('⛔ « Toute sortie de stock passe par le DR » : technicien, commercial et compta le voient',
    ['technicien', 'commercial', 'compta'].map(r => M.userSeesModule({ id: 'x' + r, role: r }, 'validations')), [true, true, true]);
  vrai('… et un valideur n’est jamais « soumis » (il se validerait lui-même)', M.valideSoumis(val) === false && M.validationsOuvertes(val) === true);
  M.db.validDRTous = false;
  const chefFerme = { id: 'c', role: 'chefEquipe', acces: { modules: { validations: false } } };
  vrai('un réglage à part est respecté quand rien n’ouvre d’office (chef d’équipe ni valideur ni soumis, menu fermé)', M.userSeesModule(chefFerme, 'validations') === false);
  vrai('l’administrateur l’a toujours', M.userSeesModule({ id: 'a', role: 'admin' }, 'validations') === true);
  const Mp = monde({ plan: ['validations'] });
  vrai('⛔ le forfait passe avant : hors forfait, ni le valideur ni le soumis ne l’ont', Mp.userSeesModule(val, 'validations') === false && Mp.userSeesModule(soumis, 'validations') === false);
  /* les alertes « à valider » partent à qui voit ce menu (notifVoitModule) : la case les ouvre enfin */
  M.poser('currentUser', val);
  vrai('⛔ les alertes « à valider » : notifVoitModule répond oui au technicien valideur', M.notifVoitModule('validations') === true);
  M.poser('currentUser', tech);
  vrai('… et non au technicien ordinaire', M.notifVoitModule('validations') === false);
  /* boxValidRequis lit la même règle qu'avant, désormais à un seul endroit : on la compare à la v752, cas par cas */
  const avant = (u, tous) => { if (!u || M.userCap(u, 'validerDR')) return false; if (tous) return true; return !!u.boxValidDR; };
  const cas = []; for (const tous of [false, true]) for (const bv of [false, true]) for (const vd of [false, true]) for (const role of ['technicien', 'commercial', 'dr', 'admin'])
    cas.push({ tous, u: { id: role + bv + vd, role, boxValidDR: bv, acces: { caps: vd ? { validerDR: true } : {} } } });
  const ecarts = cas.filter(c => { M.db.validDRTous = c.tous; M.poser('currentUser', c.u); return M.boxValidRequis() !== avant(c.u, c.tous); });
  M.db.validDRTous = false; M.poser('currentUser', null);
  v('⛔ boxValidRequis décide EXACTEMENT comme la v752, sur ' + cas.length + ' cas (qui attend le DR ne change pas)', ecarts.map(c => c.u.id + (c.tous ? '+tous' : '')), []);
  vrai('… et personne connecté : aucune validation exigée', M.boxValidRequis() === false);
}

console.log('\n── 821 · 3. ⛔ un compte créé par un non-administrateur : le menu ouvert d’office n’est pas « retenu » ──');
{ const par = { id: 'p', role: 'chefEquipe', acces: { caps: { creerUtilisateurs: true }, modules: { validations: false } } };
  const nu = { id: 'n', role: 'technicien', boxValidDR: true, acces: { caps: {}, modules: {} } };
  vrai('population : le créateur ne voit pas « Validations DR »', M.userSeesModule(par, 'validations') === false);
  const ret = M.droitsBorner(nu, par);
  vrai('⛔ le message ne prétend pas avoir retenu « Validations DR » à une personne soumise (elle l’a d’office)', !ret.some(x => /Validations DR/.test(x)), ret);
  vrai('… et elle le voit bien', M.userSeesModule(nu, 'validations') === true);
  const nu2 = { id: 'n2', role: 'technicien', acces: { caps: { validerDR: true }, modules: {} } };
  const ret2 = M.droitsBorner(nu2, par);
  vrai('⛔ la case de validation reste bornée : un créateur qui ne valide pas ne la donne pas — et le menu tombe avec elle',
    ret2.some(x => /Valider les mouvements/.test(x)) && M.userCap(nu2, 'validerDR') === false && M.userSeesModule(nu2, 'validations') === false, ret2);
}

console.log('\n── 821 · 4. ⛔⛔ la ligne de la personne : ouvert, verrouillé, la raison écrite — et suivi en direct ──');
/* Le vrai usrDroitsHtml, exécuté : l'interrupteur tel qu'il est dessiné. */
const interrupteur = h => { const m = /<input type="checkbox" data-d="mod_validations"[^>]*>/.exec(h); return m ? m[0] : ''; };
const noteDe = h => { const m = /<div class="pn-d" data-val-note style="([^"]*)">([^<]*)<\/div>/.exec(h); return m ? { style: m[1], texte: m[2] } : null; };
{ const H = u => M.usrDroitsHtml(u, true);
  const hVal = H({ id: 'tv', role: 'technicien', acces: { caps: { validerDR: true } } });
  const iVal = interrupteur(hVal), nVal = noteDe(hVal);
  vrai('population : l’interrupteur « Validations DR » est dessiné', !!iVal, hVal.length);
  vrai('⛔ valideur : ouvert ET verrouillé, marqué « d’office »', / checked/.test(iVal) && / disabled/.test(iVal) && /data-val-force="1"/.test(iVal), iVal);
  vrai('… sa valeur propre est gardée à part (la liste du technicien : fermé)', /data-val-av="0"/.test(iVal), iVal);
  vrai('⛔ … et la raison est écrite dessous', !!nVal && nVal.style === '' && nVal.texte === M.validationsNote(true), nVal);
  const hSou = H({ id: 'ts', role: 'technicien', boxValidDR: true });
  const iSou = interrupteur(hSou), nSou = noteDe(hSou);
  vrai('⛔ soumis : ouvert et verrouillé aussi, avec SA raison', / checked/.test(iSou) && /data-val-force="1"/.test(iSou) && /data-val-soumis="1"/.test(iSou) && !!nSou && nSou.texte === M.validationsNote(false), [iSou, nSou]);
  const hTech = H({ id: 't', role: 'technicien' });
  const iTech = interrupteur(hTech), nTech = noteDe(hTech);
  vrai('un technicien ordinaire : fermé, libre, sans raison affichée', !/ checked/.test(iTech) && !/ disabled/.test(iTech) && !/data-val-force/.test(iTech) && !!nTech && /display:none/.test(nTech.style), [iTech, nTech]);
  vrai('le compte de la catégorie compte le menu ouvert d’office (« Achats internes » du valideur : un menu de plus)',
    (/Achats internes<\/b><span class="usr-cn">(\d+)\//.exec(hVal) || [])[1] - (/Achats internes<\/b><span class="usr-cn">(\d+)\//.exec(hTech) || [])[1] === 1);
  const hLect = M.usrDroitsHtml({ id: 'tv', role: 'technicien', acces: { caps: { validerDR: true } } }, false);
  vrai('pour qui ne peut pas modifier, un seul « disabled » (pas d’attribut en double)', (interrupteur(hLect).match(/disabled/g) || []).length === 1, interrupteur(hLect));
}
/* L'éditeur en direct : une zone telle que usrDroitsHtml la dessine, jouée par les vraies fonctions. */
function zoneFactice(o) {
  const note = { textContent: o.force ? 'x' : '', style: { display: o.force ? '' : 'none' } };
  const rang = { querySelector: s => s === '[data-val-note]' ? note : null };
  const ins = [];
  const inp = (d, checked, ds, dis) => { const i = { checked, disabled: !!dis, dataset: Object.assign({ d }, ds || {}), closest: s => s === '.perm-row' ? rang : z }; ins.push(i); return i; };
  const z = { querySelector(sel) { const m = /\[data-d="([^"]+)"\]/.exec(sel); if (!m) return null; const i = ins.find(x => x.dataset.d === m[1]) || null;
      if (i && /\[data-val\]/.test(sel) && i.dataset.val !== '1') return null; return i; },
    querySelectorAll(sel) { if (sel === 'input[data-d^="cap_"]') return ins.filter(i => i.dataset.d.startsWith('cap_'));
      if (sel === 'input[data-deduit="1"]') return ins.filter(i => i.dataset.deduit === '1'); return []; },
    closest: () => z };
  z.cap = inp('cap_validerDR', !!o.valide);
  z.mv = inp('mod_validations', !!(o.force || o.av), Object.assign({ val: '1', valSoumis: o.soumis ? '1' : '0', valAv: o.av ? '1' : '0' }, o.force ? { valForce: '1' } : {}), o.force);
  z.autre = inp('mod_planning', true);
  z.note = note;
  return z;
}
{ const z = zoneFactice({});
  z.cap.checked = true; M.usrDeduire(z.cap);
  vrai('⛔ cocher « Valider les mouvements… » ouvre et verrouille le menu, en direct', z.mv.checked && z.mv.disabled && z.mv.dataset.valForce === '1', z.mv);
  vrai('… met sa valeur propre de côté (fermé)', z.mv.dataset.valAv === '0');
  vrai('… et écrit la raison', z.note.textContent === M.validationsNote(true) && z.note.style.display === '', z.note);
  v('⛔⛔ usrMenuLu lit la valeur PROPRE, pas l’interrupteur verrouillé', M.usrMenuLu(z, 'validations'), false);
  v('… un autre menu se lit tel qu’il est affiché', M.usrMenuLu(z, 'planning'), true);
  z.cap.checked = false; M.usrDeduire(z.cap);
  vrai('⛔ décocher : le menu retrouve sa valeur propre et se déverrouille', !z.mv.checked && !z.mv.disabled && z.mv.dataset.valForce === '0' && z.note.style.display === 'none', [z.mv, z.note]);
  z.mv.checked = true; z.cap.checked = true; M.usrDeduire(z.cap); z.cap.checked = false; M.usrDeduire(z.cap);
  vrai('⛔ une valeur propre changée à la main AVANT la case survit à l’aller-retour', z.mv.checked === true && !z.mv.disabled);
  const zs = zoneFactice({ soumis: true, force: true });
  zs.cap.checked = false; M.usrDeduireZone(zs);
  vrai('⛔ soumis : reste ouvert et verrouillé sans la case, avec sa raison', zs.mv.checked && zs.mv.disabled && zs.note.textContent === M.validationsNote(false));
}
{ /* usrDroitsValider : l'ouverture d'office n'est jamais écrite comme une décision */
  const u = { id: 'uV', role: 'technicien', login: 'val', acces: { caps: {}, modules: {} } };
  const z = zoneFactice({ valide: true, force: true, av: false });
  M.db.users = [u];
  M.poser('currentUser', { id: 'adm', role: 'admin' });
  M.poser('document', { getElementById: id => id === 'usr-d-uV' ? z : null });
  M.usrDroitsValider('uV');
  v('⛔⛔ « Valider ses droits » écrit la valeur PROPRE du menu (fermé), pas l’ouverture d’office', u.acces.modules.validations, false);
  v('… et la case, elle, est bien écrite', u.acces.caps.validerDR, true);
  vrai('… donc, la case retirée plus tard, le menu tombe avec elle', (u.acces.caps.validerDR = false, M.userSeesModule(u, 'validations') === false));
  const zp = zoneFactice({ valide: true, force: true, av: true });
  v('⛔ un profil enregistré depuis cette ligne garde la valeur PROPRE', M.profilLireZone(zp).modules.validations, true);
  const zq = zoneFactice({ valide: true, force: true, av: true });
  M.profilPoserZone(zq, { caps: { validerDR: false }, modules: { validations: false } });
  vrai('⛔ poser un profil sur un menu verrouillé : sa valeur va de côté, et revient quand la case tombe', !zq.mv.checked && !zq.mv.disabled && zq.mv.dataset.valAv === '0', zq.mv);
  M.poser('currentUser', null); M.poser('document', null);
}

console.log('\n── 821 · 5. ⛔⛔ un rôle créé à la main part de la liste du technicien — menus ET droits ──');
{ const maison = { id: 'm', role: 'r_technicien3d_ab12' }, tech = { id: 't', role: 'technicien' };
  vrai('population : le rôle maison n’a pas de liste à lui', !M.db.permissions[maison.role]);
  vrai('⛔ « Modifier les plans d’appâtage » : comme le technicien (v752 : refusé au rôle maison)', M.userCap(maison, 'modifierPlans') === true && M.userCap(tech, 'modifierPlans') === true);
  v('⛔ toutes les cases : exactement celles du technicien', M.USER_CAPS.map(c => c[0]).filter(k => M.userCap(maison, k) !== M.userCap(tech, k)), []);
  v('⛔ tous les gestes de catégorie : pareil', M.PERM_GRPS.flatMap(([g]) => ['ajouter', 'modifier', 'supprimer'].map(d => g + '.' + d)).filter(x => { const [g, d] = x.split('.'); return M.catDroit(maison, g, d) !== M.catDroit(tech, g, d); }), []);
  v('tous les menus : pareil (c’était déjà le cas)', CLES.filter(k => M.userSeesModule(maison, k) !== M.userSeesModule(tech, k)), []);
  vrai('un réglage à part l’emporte toujours', M.userCap({ id: 'm2', role: maison.role, acces: { caps: { modifierPlans: false } } }, 'modifierPlans') === false);
  /* même identifiant des deux côtés : l'identifiant du compte est écrit à plusieurs endroits de la ligne */
  const hM = M.usrDroitsHtml({ id: 'x', role: maison.role }, true), hT = M.usrDroitsHtml({ id: 'x', role: 'technicien' }, true);
  vrai('⛔ sa ligne affiche les mêmes interrupteurs que celle du technicien (cases et marques « suit »)', hM === hT && hM.length > 5000, [hM.length, hT.length]);
  const sans = monde(); delete sans.db.permissions.dr; delete sans.db.permissions.chefEquipe;
  vrai('DR et chef d’équipe sans liste ne se replient PAS sur celle du technicien (comme avant)', sans.tableDuRole('dr') === null && sans.tableDuRole('chefEquipe') === null && sans.tableDuRole('admin') === null);
  vrai('… ni un rôle inconnu quand l’entreprise n’a aucune liste', (() => { const w = monde(); w.db.permissions = {}; return w.tableDuRole('r_x') === null; })());
}

console.log(`\n════ test-821 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
