/* ══ v768 — LES OPTIONS DU PRO, CÔTÉ APPLICATION ═══════════════════════════════════════════════════════════════
   Décision de Justin, 1er octobre 2026 (« Plus cher ») : Pro ouvre le cœur du métier ; Stock, Achats, Compta et Registre
   sanitaire s'y ajoutent à la carte. Le serveur sert `options` (un tableau de clés) dans la réponse « payé » de
   /api/espaces/etat ; l'application s'en sert pour une seule chose : rouvrir des rubriques que PLAN_BLOQUE.pro ferme.
   Contrat : scratchpad/SPEC-OPTIONS.md §5 et §8.

   Ce banc EXÉCUTE les vraies fonctions d'app.html (planBloque, forfaitServeurSync, optionsPoser, usrMenuLu, notifVoitModule,
   formuleFermeMsg, bonMarquerRecue, respBonsPrevenir, stockExportBon, razLignes…) dans un bac à sable, et lit le TEXTE
   seulement là où la fonction est trop grosse pour tourner (go(), la fiche client, journalGo…) — par des motifs qui visent
   du CODE, sur un fichier dont les commentaires de début de ligne sont retirés.

   ⚠️ Ce que ce banc NE FAIT PAS, et qu'il faut faire à l'intégration : le serveur de CETTE branche ne connaît pas encore les
   options. La partie « serveur » ci-dessous parle donc à un petit serveur local qui rend la réponse du CONTRAT (champ `options`) ;
   le banc « vraie page + vrai serveur » (recette `test-845`, faux Stripe qui sert une option) reste à brancher quand le serveur
   des options est dans l'arbre — `test-852` compare ensuite les quatre copies de la grille. */
const fs = require('fs'), http = require('http'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d === undefined ? '' : '\n      → ' + d)); } };
const titre = t => console.log('\n══ ' + t + ' ══\n');

/* ── extraction : le code RÉEL d'app.html ── */
const bloc = (debut) => { const d0 = APP.indexOf(debut); if (d0 < 0) return ''; let p = 0;
  for (let k = APP.indexOf('{', d0); k < APP.length; k++) { if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(d0, k + 1); } } return ''; };
const fonction = nom => bloc('async function ' + nom + '(') || bloc('function ' + nom + '(');
/* le fichier sans ses commentaires DE DÉBUT DE LIGNE (CLAUDE.md : ne retirer que ceux-là — le motif naïf avale du vrai code) */
const NU = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const unique = (re, s) => { const m = (s || NU).match(re); return m ? m.length : 0; };

const NOMS = ['forfaitServeurSync', 'suspensionCle', 'suspensionPoser', 'suspensionSursis', 'suspensionGrise', 'accesSuspendu', 'suspensionBloque',
  'suspensionClasse', 'suspensionRappel', 'forfait', 'planBloque', 'optionsCle', 'optionsLire', 'optionsCharger', 'optionsPoser', 'optionServie',
  'optionOuvre', 'optionsDe', 'formuleFermeMsg', 'optionsCarteHtml', 'optionAjouter', 'notifVoitModule', 'usrMenuLu', 'bonMarquerRecue',
  'respBonsPrevenir', 'stockExportBon'];
const FN = NOMS.map(fonction);
const SRC = { PLANS: bloc('const PLANS={'), PLAN_BLOQUE: bloc('const PLAN_BLOQUE={'), OPT: bloc('const OPTIONS_GESTION={'),
  SUSP: (/^let _susp = \{[^\n]*\};$/m.exec(APP) || [''])[0], RAZ_RUB: bloc('const RAZ_RUBRIQUE={'), RAZ_FN: (/^const razLignes=.*$/m.exec(APP) || [''])[0] };
const RAZ_CLES = [...NU.matchAll(/\{k:'(\w+)',\s*defaut:/g)].map(m => m[1]);

/* La grille du CONTRAT (SPEC-OPTIONS §1), écrite ICI : un banc qui relit la grille de l'application pour s'y comparer garde une croyance. */
const SPEC = {
  stock: { prix: 9, vues: ['produits', 'stock', 'mouvements', 'saisieConso', 'boxes', 'carteBox', 'produitsDonnes', 'demandes', 'histoDemandes', 'brouillon', 'validations'] },
  achats: { prix: 6, vues: ['fournisseurs', 'bons', 'commandes', 'boiteMail'] },
  compta: { prix: 6, vues: ['comptabilite', 'telecollecte', 'enveloppes'] },
  sanitaire: { prix: 6, vues: ['registre', 'produits'], metier3d: true },
};
const CLES = Object.keys(SPEC);
const TOUTES_PRO = ['produits', 'stock', 'mouvements', 'boxes', 'carteBox', 'saisieConso', 'produitsDonnes', 'demandes', 'histoDemandes', 'validations', 'boiteMail', 'fournisseurs', 'bons', 'commandes', 'brouillon', 'registre', 'telecollecte', 'comptabilite', 'enveloppes'];

/* ── un appareil : une machine à sable avec les VRAIES fonctions et des témoins ── */
function machine(o = {}) {
  const LS = new Map(Object.entries(o.ls || {}));
  const vu = { toasts: [], saves: 0, nav: 0, onglets: 0, gos: [], opens: [], pushs: [], logs: [], confirms: [], bons: [] };
  const S = {
    fetch: o.fetch || ((u, x) => fetch(u, x)), PUSH_API: o.api || 'http://127.0.0.1:9', toast: m => vu.toasts.push(String(m)),
    renderNav: () => { vu.nav++; }, renderOnglets: () => { vu.onglets++; }, go: x => { vu.gos.push(x); }, save: () => { vu.saves++; },
    logEvent: (...a) => { vu.logs.push(a.join('|')); }, todayISO: () => '2026-10-01', espaceQuitter() {}, suiteRefresh() {}, views: {},
    document: { getElementById: () => null, documentElement: { classList: { toggle() {} } }, addEventListener() {} }, esc: s => String(s),
    metierBloque: o.metierBloque || (() => false), window: { open: u => { vu.opens.push(u); } },
    confirm: () => { vu.confirms.push(1); return o.confirmer !== false; },
    peutCommander: () => o.peutCommander !== false, refusCommander: () => { vu.toasts.push('refus commander'); }, fullName: u => 'Prénom Nom',
    bonNum: b => (b && b.numero) || 'BC-1', boxLabel: () => 'Box A', userName: () => 'Quelqu\'un', closeModal() {},
    respBonsIds: () => ['u-resp'], pushNotify: (...a) => { vu.pushs.push(a); },
    planPlaces: () => o.places || 1, uid: () => 'nouveau-id', norm: s => String(s).toLowerCase(), nextNum: () => 'BC-9',
    stockLines: () => o.lignesStock || [], boxEtat: () => ({ k: 'manque' }), alert() {}, location: { reload() {} },
  };
  S.localStorage = { getItem: k => (LS.has(k) ? LS.get(k) : null), setItem: (k, x) => { if (o.rangementPlein) throw new Error('quota'); LS.set(k, String(x)); }, removeItem: k => { LS.delete(k); } };
  const code = 'let STORE_KEY="elanB_banc851"; let currentUser=' + JSON.stringify({ id: 'u-' + (o.role || 'admin'), role: o.role || 'admin' }) + '; let current="dashboard";\n'
    + 'let db=' + JSON.stringify(Object.assign({ forfait: o.formule || 'pro', forfaitQty: 1, forfaitSrv: 'teamop' }, o.db || {})) + '; let _opMsgOuvert=false; let stockSearch="";\n'
    + 'const BETA_ESSAI=' + (o.beta ? 'true' : 'false') + ';\n'
    + SRC.PLANS + ';\n' + SRC.PLAN_BLOQUE + ';\n' + SRC.OPT + ';\nvar _placesSrv=null,_placesSrvF="";\nvar _optsSrv;var _etatLuLe=0;\n' + SRC.SUSP + '\n'
    + 'const userSeesModule=(u,k)=>!planBloque(k)&&!metierBloque(k);\n'   // la version réelle lit les droits de la personne : ici seule la FORMULE et le métier décident
    + FN.join('\n') + '\n'
    + (o.raz ? SRC.RAZ_RUB + ';\nconst RAZ_LIGNES=' + JSON.stringify(RAZ_CLES.map(k => ({ k }))) + ';\n' + SRC.RAZ_FN + '\n' : '')
    + (o.charger ? 'optionsCharger();\n' : '')
    + 'return { sync: forfaitServeurSync, planBloque, optionsPoser, optionsCharger, optionsLire, optionOuvre, optionServie, optionsDe, formuleFermeMsg, optionsCarteHtml, optionAjouter,\n'
    + '  notifVoitModule, usrMenuLu, bonMarquerRecue, respBonsPrevenir, stockExportBon, accesSuspendu, forfait, suspensionPoser, db: () => db, opts: () => _optsSrv, etatLuLe: () => _etatLuLe,\n'
    + '  susp: () => _susp, setUser: u => { currentUser = u; }, setSusp: s => { _susp = s; }, ' + (o.raz ? 'razLignes, ' : '') + 'setDb: d => { db = d; } };';
  const noms = Object.keys(S);
  const a = new Function(...noms, code)(...noms.map(k => S[k]));
  a.vu = vu; a.LS = LS; a.cleOpts = 'elanB_banc851_opts'; return a;
}
const apres = (ms) => new Promise(r => setTimeout(r, ms));

(async () => {
  titre('1. LA POPULATION : tout ce que le banc exécute existe dans le fichier réel');
  vrai('les ' + NOMS.length + ' fonctions, PLANS, PLAN_BLOQUE, OPTIONS_GESTION et l\'état de suspension sont trouvés (une tranche vide passe au vert sur tout)',
    FN.every(f => f.length > 20) && !!SRC.PLANS && !!SRC.PLAN_BLOQUE && !!SRC.OPT && !!SRC.SUSP && !!SRC.RAZ_RUB && !!SRC.RAZ_FN, NOMS.filter((n, i) => !FN[i]).join(', '));
  vrai('(population) les lignes de la remise à zéro sont lues dans le fichier (8)', RAZ_CLES.length === 8, RAZ_CLES.join(','));
  vrai('APP_VERSION vaut 768', /const APP_VERSION = '768';/.test(APP));
  const m0 = machine();
  /* la grille d'application contre le CONTRAT */
  const OG = (new Function(SRC.OPT.replace(/^const OPTIONS_GESTION=/, 'return ') + ';'))();
  v('les clés d\'option de l\'application sont celles du contrat, dans l\'ordre', Object.keys(OG), CLES);
  v('⛔ les prix par utilisateur et par mois sont ceux du contrat (9 / 6 / 6 / 6)', CLES.map(c => OG[c].prix), CLES.map(c => SPEC[c].prix));
  v('⛔ les écrans que chaque option ouvre sont ceux du contrat', CLES.map(c => OG[c].vues.slice().sort()), CLES.map(c => SPEC[c].vues.slice().sort()));
  v('seule `sanitaire` est réservée au métier 3D', CLES.filter(c => OG[c].metier3d), ['sanitaire']);
  const PB = (new Function(SRC.PLAN_BLOQUE.replace(/^const PLAN_BLOQUE=/, 'return ') + ';'))();
  vrai('⛔ `conso` — clé morte, aucune vue — n\'est plus dans PLAN_BLOQUE.pro', !PB.pro.includes('conso'));
  v('PLAN_BLOQUE.pro est la liste du contrat (carteBox y entre : le menu la montrait à un Pro, `go()` la refusait)', PB.pro.slice().sort(), TOUTES_PRO.slice().sort());
  v('Business et Business Premium ne ferment rien', [PB.business, PB.premium], [[], []]);
  const ouvertes = new Set(CLES.flatMap(c => OG[c].vues));
  v('⛔ toute rubrique fermée au Pro est rouverte par au moins UNE option (sinon elle ne s\'achète pas)', PB.pro.filter(k => !ouvertes.has(k)), []);
  v('⛔ et toute rubrique qu\'une option ouvre est bien fermée au Pro (sinon l\'option vend ce qui est déjà ouvert)', [...ouvertes].filter(k => !PB.pro.includes(k)), []);
  vrai('chaque rubrique d\'option existe : une entrée du menu, une sous-catégorie ou une vue',
    [...ouvertes].every(k => new RegExp("\\bk:'" + k + "'|views\\." + k + "\\s*=|\\b" + k + ":\\{p:'").test(NU)), [...ouvertes].filter(k => !new RegExp("\\bk:'" + k + "'|views\\." + k + "\\s*=|\\b" + k + ":\\{p:'").test(NU)).join(','));
  const prixPro = parseInt((/^(\d+) €/.exec((new Function(SRC.PLANS.replace(/^const PLANS=/, 'return ') + ';'))().pro.prix) || [])[1], 10);
  const prixBus = parseInt((/^(\d+) €/.exec((new Function(SRC.PLANS.replace(/^const PLANS=/, 'return ') + ';'))().business.prix) || [])[1], 10);
  vrai('cohérence voulue : Pro + 2 options ≥ 27 € > Business 25 € ; Pro + Stock = 24 € < 25 € (' + prixPro + ' / ' + prixBus + ')',
    prixPro === 15 && prixBus === 25 && prixPro + OG.achats.prix + OG.compta.prix >= 27 && prixPro + OG.stock.prix + OG.achats.prix > prixBus && prixPro + OG.stock.prix === 24 && prixPro + OG.stock.prix < prixBus);
  const PL = (new Function(SRC.PLANS.replace(/^const PLANS=/, 'return ') + ';'))();
  vrai('« PLANS dit la vérité » : Pro annonce ses options, Business dit qu\'il les comprend', /en option : stock, achats, compta, registre sanitaire/.test(PL.pro.desc) && /toutes les options/.test(PL.business.desc), PL.pro.desc + ' / ' + PL.business.desc);
  vrai('PLANS garde sa forme `{l,prix,maxU,desc}` (test-835 la relit)', Object.values(PL).every(p => Object.keys(p).join() === 'l,prix,maxU,desc' && p.maxU === 1));

  /* ── rangement et ordre de déclaration ── */
  vrai('⛔ `_optsSrv` est déclaré SANS valeur (`var _optsSrv;`) : la ligne s\'exécute APRÈS `load()`, une valeur y effacerait ce qu\'il a lu', /^var _optsSrv;/m.test(NU));
  const iCharge = NU.indexOf('try{ optionsCharger(); }catch(e){}'), iConst = NU.indexOf('const OPTIONS_GESTION='), iVar = NU.search(/^var _optsSrv;/m);
  vrai('⛔ la copie d\'appareil se lit à la TOUTE FIN du bloc, après `OPTIONS_GESTION` et `_optsSrv` — pas dans `load()`, qui les voit encore dans leur zone morte',
    iCharge > iConst && iConst > 0 && iCharge > iVar && iVar > 0, [iCharge, iConst, iVar].join(' / '));
  vrai('   `load()` ne lit pas les options (zone morte temporelle : le catch avalerait l\'erreur et la copie ne servirait jamais)', !/optionsCharger/.test(bloc('function load(')));
  vrai('⛔ rien dans `db` : aucune écriture `db.options…` ni `db.opts…` dans le fichier', unique(/\bdb\.(options|optsSrv|optionsServies)\b/g) === 0);
  vrai('les options ne touchent ni les places ni le « payé » : `planPlaces` et `placesSrvActives` ne les lisent pas', !/option/i.test(fonction('planPlaces')) && !/option/i.test(fonction('placesSrvActives')));
  vrai('⛔ « Quitter un espace » emporte la copie des options de l\'entreprise quittée', /localStorage\.removeItem\(STORE_KEY\+'_opts'\)/.test(fonction('espaceQuitter')));

  titre('2. `planBloque` EXÉCUTÉ : la formule ferme, l\'option rouvre, la suspension passe avant tout');
  const matrice = (formule, opts, extra = {}) => { const m = machine(Object.assign({ formule }, extra)); m.optionsPoser(opts); return m; };
  const attendu = (opts) => { const ouv = new Set(opts.flatMap(c => SPEC[c].vues)); return TOUTES_PRO.map(k => !ouv.has(k)); };
  const combos = [[], ['stock'], ['achats'], ['compta'], ['sanitaire'], ['stock', 'sanitaire'], ['stock', 'achats', 'compta', 'sanitaire']];
  combos.forEach(c => { const m = matrice('pro', c);
    v('⛔ Pro + [' + c.join(',') + '] : chaque rubrique fermée l\'est SAUF celles qu\'une option servie contient', TOUTES_PRO.map(k => m.planBloque(k)), attendu(c)); });
  { const m = matrice('pro', ['sanitaire']);
    v('⛔ `produits` est dans DEUX options : le Registre sanitaire seul le rouvre (l\'AMM d\'un biocide s\'y renseigne), Achats seul non',
      [m.planBloque('produits'), m.planBloque('stock'), matrice('pro', ['achats']).planBloque('produits')], [false, true, true]); }
  { const m = matrice('pro', ['stock']);
    v('⛔ une option rouvre les rubriques du Stock, JAMAIS celles d\'une autre (bons, comptabilité, registre restent fermés)', [m.planBloque('boxes'), m.planBloque('validations'), m.planBloque('bons'), m.planBloque('comptabilite'), m.planBloque('registre')], [false, false, true, true, true]);
    v('   et les rubriques que le Pro ouvre d\'office ne sont jamais touchées', ['dashboard', 'interventions', 'planning', 'clients', 'devis', 'factures', 'parametres'].map(k => m.planBloque(k)), [false, false, false, false, false, false, false]); }
  ['business', 'premium'].forEach(f => { const m = matrice(f, []);
    v('Business / Premium : RIEN n\'est fermé, avec ou sans option (elles y sont toutes comprises)', [TOUTES_PRO.some(k => m.planBloque(k)), matrice(f, ['stock']).planBloque('bons')], [false, false]); });
  v('une clé inconnue d\'un serveur plus récent n\'ouvre rien, les doublons tombent, la liste est triée', (() => { const m = machine(); m.optionsPoser(['zzz', 'stock', 'stock', 'achats', 42, null]); return [m.opts(), m.planBloque('boxes'), m.planBloque('zzz')]; })(), [['achats', 'stock'], false, false]);
  /* ⛔ LA SUSPENSION PASSE AVANT : une option ne lève rien */
  { const m = matrice('pro', CLES); m.setSusp({ suspendu: true, sursis: 0 });
    v('⛔ sursis écoulé : TOUT est fermé, options servies comprises — sauf les Paramètres', [m.accesSuspendu(), m.planBloque('stock'), m.planBloque('dashboard'), m.planBloque('interventions'), m.planBloque('parametres')], [true, true, true, true, false]);
    v('   et `horsSusp` montre ce qui reviendra au règlement, options servies comprises', [m.planBloque('stock', true), m.planBloque('boxes', true), m.planBloque('dashboard', true)], [false, false, false]);
    m.setSusp({ suspendu: true, sursis: 4 });
    v('   pendant le sursis rien ne grise : les options servies jouent normalement', [m.planBloque('stock'), matrice('pro', []).planBloque('stock')], [false, true]); }
  { const m = matrice('pro', [], { beta: true });
    v('⛔ la bêta voit tout (`BETA_ESSAI`), options ou non — et la règle de production se joue sur une copie', [TOUTES_PRO.some(k => m.planBloque(k)), m.optionsCarteHtml().includes('Ouverte (bêta)')], [false, true]); }

  titre('3. `forfaitServeurSync` : les options se rangent en MÉMOIRE et dans le rangement de l\'appareil — jamais dans `db`');
  const T = 'ent-851';
  const payee = (o) => Object.assign({ ok: true, formule: 'pro', quantite: 1, paye: true, motif: 'abonnement', places: 1, options: ['stock'] }, o || {});
  const serveurFixe = (rep, http_ok = true) => async () => ({ ok: http_ok, json: async () => rep });
  const appareil = (rep, extra) => machine(Object.assign({ ls: { elan_sync_team: T }, fetch: serveurFixe(rep) }, extra || {}));
  { const A = appareil(payee()); const avant = JSON.stringify(A.db());
    await A.sync();
    v('⛔ réponse payée avec `options` : la mémoire les porte, triées', A.opts(), ['stock']);
    v('   le rangement de l\'appareil en garde une copie AVEC l\'identifiant de l\'entreprise', JSON.parse(A.LS.get(A.cleOpts) || 'null'), { t: T, o: ['stock'] });
    vrai('⛔ `db` est INTACT, aucune écriture (rien ne part à la synchro) : ' + avant, JSON.stringify(A.db()) === avant && A.vu.saves === 0 && !('options' in A.db()));
    v('   `planBloque` suit : le stock s\'ouvre, les bons restent fermés', [A.planBloque('stock'), A.planBloque('bons')], [false, true]);
    vrai('   l\'heure de la lecture est notée (la relecture au retour part de là)', A.etatLuLe() > 0);
    vrai('   le menu et la barre se redessinent UNE fois (la liste a changé), l\'écran courant aussi', A.vu.nav === 1 && A.vu.onglets === 1 && A.vu.gos.length === 1, JSON.stringify([A.vu.nav, A.vu.onglets, A.vu.gos]));
    await A.sync(); vrai('   une seconde lecture identique ne redessine rien', A.vu.nav === 1 && A.vu.gos.length === 1);
  }
  /* ⛔ UN CHAMP ABSENT N'EST PAS « AUCUNE OPTION » : la machine garde ce qu'elle savait */
  for (const [nom, rep] of [['champ absent (un serveur d\'avant)', payee({ options: undefined })], ['`options` en chaîne', payee({ options: 'stock' })],
    ['`options: null`', payee({ options: null })], ['`options` en objet', payee({ options: { stock: true } })], ['`options` en nombre', payee({ options: 5 })]]) {
    const A = appareil(rep, { ls: { elan_sync_team: T, elanB_banc851_opts: JSON.stringify({ t: T, o: ['achats'] }) }, charger: true });
    await A.sync();
    v('⛔ ' + nom + ' : l\'appareil GARDE ses options d\'avant (achats)', [A.opts(), A.planBloque('bons'), A.planBloque('stock')], [['achats'], false, true]);
  }
  { const A = appareil(payee({ options: [] }), { ls: { elan_sync_team: T, elanB_banc851_opts: JSON.stringify({ t: T, o: ['achats', 'stock'] }) }, charger: true });
    v('   (témoin) avant la lecture, la copie d\'appareil est déjà servie : le premier démarrage hors ligne ne ferme rien', [A.opts(), A.planBloque('bons')], [['achats', 'stock'], false]);
    await A.sync();
    v('⛔ un tableau VIDE remplace (option résiliée) : tout se referme, et la copie le suit', [A.opts(), A.planBloque('bons'), JSON.parse(A.LS.get(A.cleOpts)).o], [[], true, []]); }
  { const A = appareil(payee({ formule: 'business', options: [] })); await A.sync();
    v('Business : `options: []` ne ferme rien (la liste est vide parce qu\'elles sont toutes comprises)', [A.opts(), A.planBloque('stock'), A.planBloque('bons')], [[], false, false]); }
  /* ⛔ PAS PAYÉ, DOUTE, PANNE : AUCUNE option ne se lit — la machine garde ce qu'elle savait */
  const gardee = JSON.stringify({ t: T, o: ['stock'] });
  for (const [nom, rep, h] of [
    ['suspendu (sans formule)', { ok: true, suspendu: true, sursisJours: 0, options: ['achats', 'compta'] }, true],
    ['formule servie avec `paye:false` (un serveur d\'avant)', payee({ paye: false, options: ['achats'] }), true],
    ['formule inconnue de cette version', payee({ formule: 'gratuit', options: ['achats'] }), true],
    ['vérification impossible', { ok: true, verificationImpossible: true, options: ['achats'] }, true],
    ['page d\'erreur du proxy (502)', payee({ options: ['achats'] }), false],
    ['réponse sans `ok:true`', { formule: 'pro', paye: true, options: ['achats'] }, true]]) {
    const A = machine({ ls: { elan_sync_team: T, elanB_banc851_opts: gardee }, fetch: serveurFixe(rep, h), charger: true });
    await A.sync();
    v('⛔ ' + nom + ' : les options d\'avant sont gardées, aucune lue', [A.opts(), JSON.parse(A.LS.get(A.cleOpts))], [['stock'], { t: T, o: ['stock'] }]);
  }
  { const A = machine({ ls: { elan_sync_team: T, elanB_banc851_opts: gardee }, charger: true, fetch: serveurFixe({ ok: true, suspendu: true, sursisJours: 0 }) });
    await A.sync();
    v('⛔ suspendu : l\'accès est suspendu ET l\'appareil garde ses options — le règlement rend tout d\'un coup, sans les relire', [A.accesSuspendu(), A.opts(), A.planBloque('stock'), A.planBloque('stock', true)], [true, ['stock'], true, false]); }
  { const A = machine({ ls: { elan_sync_team: T }, fetch: async () => { throw new Error('hors ligne'); } }); await A.sync();
    v('hors ligne : rien ne tombe, rien n\'est lu, l\'heure de lecture n\'est PAS posée (une panne ne repousse pas la relecture)', [A.opts() === undefined, A.etatLuLe()], [true, 0]); }
  /* la copie d'appareil */
  { const cas = (ls, nom, att) => { const A = machine({ ls, charger: true }); v('copie d\'appareil — ' + nom, A.opts() || [], att); };
    cas({ elan_sync_team: T, elanB_banc851_opts: JSON.stringify({ t: T, o: ['compta', 'zz'] }) }, 'une entreprise qui revient lit la sienne (clés inconnues écartées)', ['compta']);
    cas({ elan_sync_team: 'autre-entreprise', elanB_banc851_opts: JSON.stringify({ t: T, o: ['compta'] }) }, '⛔ celle d\'une AUTRE entreprise n\'est jamais lue', []);
    cas({ elan_sync_team: T, elanB_banc851_opts: '{pas du json' }, 'un rangement illisible ne casse rien', []);
    cas({ elanB_banc851_opts: JSON.stringify({ t: T, o: ['compta'] }) }, 'sans entreprise rattachée, rien', []);
    cas({ elan_sync_team: T, elanB_banc851_opts: JSON.stringify(['stock']) }, 'une forme inattendue est écartée', []); }
  { const A = machine({ ls: { elan_sync_team: T }, rangementPlein: true, fetch: serveurFixe(payee()) }); await A.sync();
    v('un rangement plein ne perd pas l\'état : la mémoire le porte, rien ne casse', [A.opts(), A.planBloque('stock')], [['stock'], false]); }
  /* la relecture au retour sur l'application */
  { const ligne = NU.split('\n').filter(l => /document\.addEventListener\('visibilitychange'/.test(l) && /forfaitServeurSync\(true\)/.test(l))[0] || '';   // il y en a plusieurs : celle qui relit l'état
    vrai('la ligne qui relit l\'état au retour est trouvée', ligne.length > 60);
    const jouer = (etat) => { let h = null, relu = 0;
      new Function('document', 'db', '_susp', '_etatLuLe', 'forfaitServeurSync', ligne)({ visibilityState: etat.vis || 'visible', addEventListener: (n, f) => { if (n === 'visibilitychange') h = f; } }, {}, { suspendu: !!etat.susp }, etat.lu, () => { relu++; });
      h(); return relu; };
    const maint = Date.now();
    v('⛔ retour sur l\'application, dernière lecture il y a 6 min : l\'état est relu (une option payée dans un autre onglet s\'ouvre)', jouer({ lu: maint - 6 * 60000 }), 1);
    v('   dernière lecture il y a 1 min : pas de relecture (le serveur relit Stripe, pas à chaque retour)', jouer({ lu: maint - 60000 }), 0);
    v('   jamais lue (ouverture hors ligne) : relu', jouer({ lu: 0 }), 1);
    v('   suspendu : relu même si la lecture est récente (comportement d\'avant, gardé)', jouer({ lu: maint - 1000, susp: true }), 1);
    v('   application en arrière-plan : rien', jouer({ lu: 0, vis: 'hidden' }), 0); }

  titre('4. LE CONTRAT PAR HTTP : un petit serveur qui rend la réponse du contrat (le vrai serveur : à l\'intégration)');
  { const vusServeur = []; let rep = payee({ options: ['achats', 'stock'] });
    const srv = http.createServer((q, r) => { let b = ''; q.on('data', d => b += d); q.on('end', () => { vusServeur.push({ u: q.url, m: q.method, b }); r.setHeader('Content-Type', 'application/json'); r.end(JSON.stringify(rep)); }); });
    await new Promise(r => srv.listen(0, '127.0.0.1', r)); const B = 'http://127.0.0.1:' + srv.address().port;
    const A = machine({ ls: { elan_sync_team: T }, api: B }); await A.sync();
    v('⛔ la VRAIE fonction parle à la route du contrat : POST /api/espaces/etat, corps `{t}` et RIEN d\'autre (l\'appareil ne dit jamais ce qu\'il croit avoir)',
      [vusServeur[0].m, vusServeur[0].u, JSON.parse(vusServeur[0].b)], ['POST', '/api/espaces/etat', { t: T }]);
    v('   la réponse HTTP réelle ouvre le Stock et les Achats, pas la Compta', [A.opts(), A.planBloque('boxes'), A.planBloque('fournisseurs'), A.planBloque('comptabilite')], [['achats', 'stock'], false, false, true]);
    rep = payee({ options: undefined }); await A.sync();
    v('⛔ puis le MÊME appareil face à un serveur qui ne sert plus le champ : il garde', A.opts(), ['achats', 'stock']);
    rep = payee({ options: ['achats'] }); await A.sync();
    v('   un serveur qui retire une option : elle se referme', [A.opts(), A.planBloque('boxes')], [['achats'], true]);
    await new Promise(r => srv.close(r)); }

  titre('5. Un module que la FORMULE ferme n\'est pas un réglage : `usrMenuLu`');
  { const zone = (cases) => ({ querySelector: sel => { const m = /data-d="mod_(\w+)"/.exec(sel); return m && cases[m[1]] ? cases[m[1]] : null; } });
  const cases = { stock: { checked: false, dataset: {} }, interventions: { checked: true, dataset: {} }, validations: { checked: false, dataset: { valForce: '1', valAv: '1' } }, bons: { checked: false, dataset: {} } };
  const Z = zone(cases);
  { const m = matrice('pro', []);
    v('⛔ Pro sans option : l\'interrupteur de Stock s\'affiche décoché, mais RIEN n\'est lu — on n\'écrit pas `false` en dur chez la personne', [m.usrMenuLu(Z, 'stock'), m.usrMenuLu(Z, 'bons'), m.usrMenuLu(Z, 'validations')], [null, null, null]);
    v('   une rubrique ouverte se lit comme avant (le réglage de la personne)', m.usrMenuLu(Z, 'interventions'), true);
    v('   un interrupteur absent de la fiche ne s\'écrit pas non plus', m.usrMenuLu(Z, 'planning'), null); }
  { const m = matrice('pro', ['stock']);
    v('⛔ l\'option achetée : Stock se lit (il s\'écrit si on y touche), Achats reste muet', [m.usrMenuLu(Z, 'stock'), m.usrMenuLu(Z, 'bons')], [false, null]);
    v('   et « Validations DR » ouvert d\'office garde sa valeur propre', m.usrMenuLu(Z, 'validations'), true); }
  { const m = matrice('business', []);
    v('Business : tout se lit comme avant', [m.usrMenuLu(Z, 'stock'), m.usrMenuLu(Z, 'bons')], [false, false]); }
  vrai('⛔ les DEUX enregistrements (la fiche d\'une personne et un profil) n\'écrivent que ce que `usrMenuLu` rend (`v!==null`)',
    /const v=usrMenuLu\(zone,m\.k\); if\(v!==null\) modules\[m\.k\]=v;/.test(NU) && /const v=usrMenuLu\(zone,m\.k\); if\(v!==null\) u\.acces\.modules\[m\.k\]=v;/.test(NU)); }

  titre('6. `notifVoitModule` : l\'administrateur ne court-circuite pas la FORMULE');
  { const m = matrice('pro', []);
    v('⛔ administrateur Pro sans option : pas de « Stock bas », d\'arrivages, de bons à préparer, d\'enveloppes, de télécollecte',
      ['boxes', 'stock', 'produits', 'validations', 'bons', 'enveloppes', 'telecollecte', 'comptabilite'].map(k => m.notifVoitModule(k)), [false, false, false, false, false, false, false, false]);
    v('   ce que son abonnement contient lui parle encore', ['interventions', 'planning', 'factures', 'messagerie'].map(k => m.notifVoitModule(k)), [true, true, true, true]);
    const s = matrice('pro', ['stock']);
    v('⛔ avec l\'option Stock : les alertes du Stock reviennent, pas celles des Achats ni de la Compta', [s.notifVoitModule('stock'), s.notifVoitModule('boxes'), s.notifVoitModule('validations'), s.notifVoitModule('bons'), s.notifVoitModule('enveloppes')], [true, true, true, false, false]);
    const b = matrice('business', []);
    v('Business : l\'administrateur reçoit tout', ['stock', 'bons', 'enveloppes'].map(k => b.notifVoitModule(k)), [true, true, true]);
    const n = matrice('pro', []); n.setUser({ id: 'u-tech', role: 'technicien' });
    v('un autre rôle passe par la même règle (formule, puis ses droits)', ['stock', 'interventions'].map(k => n.notifVoitModule(k)), [false, true]); }
  vrai('⛔ la facture impayée mène à la Comptabilité SEULEMENT si elle est ouverte (sinon aux Factures)', /act:notifVoitModule\('comptabilite'\)\?"go\('comptabilite'\)":"go\('factures'\)"/.test(NU));

  titre('7. Le message d\'une rubrique fermée par la FORMULE : jamais « réglable dans Permissions »');
  { const m = matrice('pro', []);
    const a1 = m.formuleFermeMsg('stock');
    vrai('⛔ l\'administrateur lit quoi acheter : l\'option, son prix, ou Business', /option Stock \(\+9 € par utilisateur et par mois\) ou avec Business/.test(a1) && !/Permissions/.test(a1), a1);
    const a2 = m.formuleFermeMsg('produits');
    vrai('   `produits` est dans deux options : les deux sont nommées', /option Stock \(\+9 €/.test(a2) && /option Registre sanitaire \(métier 3D\) \(\+6 €/.test(a2), a2);
    vrai('   une rubrique que la formule a laissée ouverte (ou inconnue) ne produit aucun message', matrice('pro', []).formuleFermeMsg('zzz-inconnue') === '');
    m.setUser({ id: 'u-t', role: 'technicien' });
    const a3 = m.formuleFermeMsg('stock');
    vrai('⛔ un autre rôle : « non incluse dans la formule de l\'entreprise » — pas un mot de prix, pas de « Permissions »', /n'est pas incluse dans la formule de l'entreprise/.test(a3) && !/€|Business|Permissions|option/.test(a3), a3);
    v('une rubrique ouverte ne produit aucun message (et la première fermée parmi plusieurs est nommée)', [matrice('pro', ['stock']).formuleFermeMsg('stock'), /option Achats/.test(matrice('pro', ['stock']).formuleFermeMsg('boxes', 'bons'))], ['', true]);
    v('Business : jamais de message de formule', matrice('business', []).formuleFermeMsg('stock', 'bons'), ''); }
  const GO = fonction('go');
  vrai('⛔ `go()` retient la rubrique demandée AVANT de changer `view`, puis dit le message de la formule — le mot « Permissions » n\'est que le repli',
    /const demandee=view;\s*if\(\(item && !canSee\(item\)\) \|\| \(VUE_PARENT\[view\] && !userSeesModule\(currentUser,view\)\)\)\{ view='dashboard'; try\{ toast\(formuleFermeMsg\(cible,demandee\)\|\|'🔒 Cette rubrique n\\'est pas ouverte à ton compte \(réglable dans Permissions\)'\)/.test(GO.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ')));

  titre('8. Achats SANS Stock, Stock SANS Achats');
  { const base = () => ({ bons: [{ id: 'b1', numero: 'BC-1', statut: 'envoyee', boxId: '', lignes: [{ produitId: 'p1', quantite: 5 }] }, { id: 'b2', numero: 'BC-2', statut: 'brouillon', lignes: [] }, { id: 'b3', numero: 'BC-3', statut: 'partielle', lignes: [] }],
      boxes: [{ id: 'bx1', nom: 'Box A', stock: { p1: { ctn: 0, u: 3 } } }], produits: [{ id: 'p1', nom: 'Gel', qte: 7 }], mouvements: [] });
    const A = machine({ formule: 'pro', db: base() }); A.optionsPoser([]);
    const avant = JSON.stringify([A.db().boxes, A.db().produits, A.db().mouvements]);
    A.bonMarquerRecue('b1');
    const b1 = A.db().bons.find(x => x.id === 'b1');
    v('⛔ « ✓ Marquer reçue » sans Stock : le bon passe à `livree`, avec la date et la personne', [b1.statut, b1.recuLe, !!b1.recuPar, b1.arrivage && b1.arrivage.conforme], ['livree', '2026-10-01', true, true]);
    v('⛔ … et AUCUN stock ne bouge : ni les box, ni les fiches produit, ni les mouvements (la population : un produit et une box existent)', [JSON.stringify([A.db().boxes, A.db().produits, A.db().mouvements]) === avant, A.db().boxes.length, A.db().produits.length], [true, 1, 1]);
    v('   une écriture, un journal, un message', [A.vu.saves, A.vu.logs.length, /aucun stock touché/.test(A.vu.toasts.join())], [1, 1, true]);
    A.bonMarquerRecue('b2'); vrai('⛔ un bon qui n\'attend pas de livraison (brouillon) ne se marque pas reçu', A.db().bons.find(x => x.id === 'b2').statut === 'brouillon' && A.vu.saves === 1);
    A.bonMarquerRecue('b3'); v('   une livraison PARTIELLE se solde (rien n\'est dû ailleurs)', A.db().bons.find(x => x.id === 'b3').statut, 'livree');
    A.bonMarquerRecue('inconnu'); vrai('   un bon disparu se dit, sans planter', /n’existe plus/.test(A.vu.toasts.join('|')));
    const S = machine({ formule: 'pro', db: base() }); S.optionsPoser(['stock']); S.bonMarquerRecue('b1');
    v('⛔ AVEC l\'option Stock le raccourci se refuse : la réception passe par « Arrivage », qui compte le stock', [S.db().bons[0].statut, S.vu.saves, /Arrivage/.test(S.vu.toasts.join())], ['envoyee', 0, true]);
    const R = machine({ formule: 'pro', db: base(), peutCommander: false }); R.optionsPoser([]); R.bonMarquerRecue('b1');
    v('   le droit de commander reste exigé (la consultation seule ne marque rien)', [R.db().bons[0].statut, R.vu.saves], ['envoyee', 0]);
    const BZ = machine({ formule: 'business', db: base() }); BZ.bonMarquerRecue('b1');
    v('   Business a les box : même refus, c\'est « Arrivage »', BZ.db().bons[0].statut, 'envoyee'); }
  { const demande = { num: 'DEM-1', boxId: 'bx1', chefNom: 'Chef' };
    const sans = machine({ formule: 'pro' }); sans.optionsPoser(['stock']); sans.respBonsPrevenir({ numero: 'BC-1' }, demande);
    v('⛔ Stock SANS Achats : rien ne pousse vers `#v=bons` fermé (aucun avis envoyé)', sans.vu.pushs.length, 0);
    const avec = machine({ formule: 'pro' }); avec.optionsPoser(['stock', 'achats']); avec.respBonsPrevenir({ numero: 'BC-1' }, demande);
    v('   (témoin) avec les Achats l\'avis part, vers `#v=bons`', [avec.vu.pushs.length, avec.vu.pushs[0] && avec.vu.pushs[0][2]], [1, '/app.html#v=bons']);
    const bz = machine({ formule: 'business' }); bz.respBonsPrevenir({ numero: 'BC-1' }, demande);
    v('   Business : l\'avis part', bz.vu.pushs.length, 1);
    const L = [{ p: { id: 'p1', nom: 'Gel', ref: '', categorie: '', qteCarton: 0, prix: 0 }, eff: 0 }];
    const s1 = machine({ formule: 'pro', db: { bons: [] }, lignesStock: L }); s1.optionsPoser(['stock']); s1.stockExportBon();
    v('⛔ Stock SANS Achats : « Créer le bon de commande » se refuse et le dit (aucun bon, aucun saut vers `bons`)', [s1.db().bons.length, s1.vu.gos.filter(x => x === 'bons').length, /Achats fournisseurs/.test(s1.vu.toasts.join())], [0, 0, true]);
    const s2 = machine({ formule: 'pro', db: { bons: [] }, lignesStock: L }); s2.optionsPoser(['stock', 'achats']); s2.stockExportBon();
    v('   (témoin) avec les Achats le bon naît et mène à `bons`', [s2.db().bons.length, s2.vu.gos.includes('bons')], [1, true]); }
  { const r = machine({ formule: 'pro', raz: true }); r.optionsPoser([]);
    v('⛔ la remise à zéro d\'un Pro sans option ne montre NI n\'applique le stock, les mouvements, les demandes, les bons', r.razLignes().map(l => l.k), ['inter', 'clients', 'vente', 'journal']);
    const rs = machine({ formule: 'pro', raz: true }); rs.optionsPoser(['stock']);
    v('   avec l\'option Stock : stock, mouvements et demandes reviennent (les bons attendent les Achats)', rs.razLignes().map(l => l.k), ['stock', 'mouv', 'attente', 'inter', 'clients', 'vente', 'journal']);
    const rb = machine({ formule: 'business', raz: true });
    v('   Business : les huit lignes', rb.razLignes().length, 8);
    vrai('⛔ `razAppliquer` écarte aussi une ligne COCHÉE avant un changement de formule (le choix est gardé en mémoire)', /RAZ_LIGNES\.forEach\(l=>\{ if\(!razLignes\(\)\.includes\(l\)\) c\[l\.k\]=false; \}\)/.test(NU)); }

  titre('9. Paramètres → Formule : les options, servies ✓ ou « Ajouter » (l\'administrateur seul)');
  { const m = matrice('pro', ['achats']); const h = m.optionsCarteHtml();
    vrai('⛔ Pro : une ligne par option (sanitaire comprise sur un métier 3D), l\'option servie porte ✓ et « Active »', /✓ Achats fournisseurs/.test(h) && /Stock/.test(h) && /Encaissements et compta/.test(h) && /Registre sanitaire \(métier 3D\)/.test(h) && />Active</.test(h), h.slice(0, 200));
    v('   « Ajouter » pour les trois options NON servies, jamais pour la servie', [(h.match(/optionAjouter\('(\w+)'\)/g) || []).map(x => x.slice(15, -2))], [['stock', 'compta', 'sanitaire']]);
    m.setUser({ id: 'u-t', role: 'technicien' });
    v('⛔ un autre rôle ne voit AUCUN bouton « Ajouter » (« c\'est pas aux utilisateurs de savoir si l\'entreprise paye »)', /optionAjouter/.test(m.optionsCarteHtml()), false);
    const non3d = machine({ formule: 'pro', metierBloque: k => k === 'registre' }); non3d.optionsPoser([]);
    vrai('   un métier qui n\'est pas la 3D ne se voit pas proposer le Registre sanitaire (il ne rouvrirait rien)', !/Registre sanitaire/.test(non3d.optionsCarteHtml()) && /Stock/.test(non3d.optionsCarteHtml()));
    const bz = machine({ formule: 'business' });
    vrai('   Business : « Toutes les options sont incluses », aucun bouton', /Toutes les options.*incluses dans Business/.test(bz.optionsCarteHtml()) && !/optionAjouter/.test(bz.optionsCarteHtml())); }
  { const m = machine({ formule: 'pro', places: 3 }); m.optionsPoser([]);
    m.optionAjouter('stock');
    v('⛔ « Ajouter » ouvre la page de paiement EN MODE AJOUT (ajout=options : sans price ni quantité, jamais un second Pro), formule Pro et UNE option', [m.vu.confirms.length, m.vu.opens], [1, ['https://teamop.fr/recap-abonnement.html?formule=pro&ajout=options&options=stock']]);
    m.optionAjouter('inconnue'); v('   une clé inconnue n\'ouvre rien', m.vu.opens.length, 1);
    const n = machine({ formule: 'pro', role: 'technicien' }); n.optionAjouter('stock');
    v('   un autre rôle : refusé, rien ne s\'ouvre', [n.vu.opens.length, /administrateur/.test(n.vu.toasts.join())], [0, true]);
    const s = machine({ formule: 'pro' }); s.setSusp({ suspendu: true, sursis: 0 }); s.optionAjouter('stock');
    v('   suspendu : on règle d\'abord l\'abonnement (l\'espace client), jamais un achat d\'option', s.vu.opens, ['https://teamop.fr/espace.html']);
    const d = machine({ formule: 'pro', confirmer: false }); d.optionAjouter('stock'); v('   « Annuler » n\'ouvre rien', d.vu.opens.length, 0); }

  titre('10. Les fuites fermées (lues dans le code, par des motifs qui visent du CODE)');
  vrai('⛔ le « Dossier sanitaire » de la fiche client suit le Registre sanitaire', /\$\{cliIsPro\(c\)&&!planBloque\('registre',true\)\?`<div/.test(NU));
  vrai('⛔ les cartes de Paramètres suivent la formule : contrôle des mouvements de stock, comptabilité',
    /\$\{currentUser\.role==='admin'&&!planBloque\('mouvements',true\)\?`<div class="card"><div class="card-head"><h3>🔒 Contrôle des mouvements de stock/.test(NU) && /\$\{isFinanceMgr\(\)&&!planBloque\('comptabilite',true\)\?`<div class="card"><div class="card-head"><h3>Comptabilité/.test(NU));
  vrai('⛔ la remise à zéro : `razLignes` filtre sur la formule (stock, mouv, attente, bons)', /const RAZ_RUBRIQUE=\{stock:'stock',mouv:'mouvements',attente:'demandes',bons:'bons'\};/.test(NU) && /const razLignes=\(\)=>RAZ_LIGNES\.filter\(l=>!\(RAZ_RUBRIQUE\[l\.k\]&&planBloque\(RAZ_RUBRIQUE\[l\.k\],true\)\)\);/.test(NU));
  vrai('⛔ `journalGo` n\'ouvre pas une box sans l\'option Stock (il ne passe pas par `go()`)', /m=planBloque\('boxes',true\)\?null:visibleBoxes\(db\.boxes\)\.find\(/.test(fonction('journalGo')));
  { const FB = fonction('ficheBon'), FBN = FB.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
    vrai('⛔ `ficheBon` : le lien « Box concernée » et le texte « ouvre la box… Arrivage » se taisent sans l\'option Stock',
      /\$\{b\.boxId&&!planBloque\('boxes',true\)\?`<div><div class="dt-lbl">Box concernée/.test(FBN) && /\$\{\(b\.statut==='envoyee'\|\|b\.statut==='enLivraison'\)&&!planBloque\('boxes',true\)\?`<div class="detail-desc"/.test(FBN) && /\$\{b\.statut==='partielle'&&!planBloque\('boxes',true\)\?`/.test(FBN));
    vrai('   … et le bouton « ✓ Marquer reçue » y paraît À LA PLACE, pour envoyée, en livraison et partielle',
      /\(b\.statut==='envoyee'\|\|b\.statut==='enLivraison'\|\|b\.statut==='partielle'\)&&planBloque\('boxes',true\)\?`[^`]*onclick="bonMarquerRecue\('\$\{b\.id\}'\)">✓ Marquer reçue/.test(FBN)); }
  { const FF = fonction('formBon');
    vrai('⛔ `formBon` : le choix de box se tait, et la box déjà posée par une demande est gardée dans un champ caché',
      /\$\{planBloque\('boxes',true\)\?`<input type="hidden" name="boxId" value="\$\{esc\(b\.boxId\|\|''\)\}">`:`<div class="frow"><span class="frow-lbl">Box concernée/.test(FF)); }
  vrai('⛔ « Commandes en cours » : le bouton « ✓ Marquer reçue » paraît sans l\'option Stock, et le pied de page ne renvoie plus à une fiche de box',
    /planBloque\('boxes',true\)&&peutCommander\(\)&&\['envoyee','enLivraison','partielle'\]\.includes\(b\.statut\)\?`<button type="button" class="btn sm" onclick="event\.stopPropagation\(\);bonMarquerRecue\('\$\{b\.id\}'\)">✓ Marquer reçue<\/button>`:''/.test(NU)
    && /const pied=planBloque\('boxes',true\)\s*\?/.test(NU));
  vrai('⛔ « Validée » ne dit plus « bon de commande créé » quand les bons sont fermés', /toast\(planBloque\('bons',true\)\?'Validée':'Validée — bon de commande créé'\)/.test(NU));
  vrai('⛔ la barre « produits à commander » du Stock ne propose plus le bon sans l\'option Achats', /\$\{planBloque\('bons',true\)\?'':'<button class="btn sm" onclick="stockExportBon\(\)">/.test(NU));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error('\n✗ le banc est tombé : ' + (e && e.stack || e)); process.exit(1); });
