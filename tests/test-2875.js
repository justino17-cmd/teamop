/* ══ test-2875 · LES CATÉGORIES RETENUES PAR TEAM OP, CÔTÉ APPLICATION (v772) ═══════════════════════════════════════════════
   Chantier « catégories par client » : la Tour coche les rubriques qu'un client a prises, `/api/espaces/etat` rend `cats`, et
   l'application ne montre QUE celles-là. Ce banc EXÉCUTE les vraies fonctions d'app.html ET de beta.html (`catsServeurAppliquer`,
   `catBloque`, `userSeesModule`, `canSee`, `ongletsLire`, `notifVoitModule`, `espaceQuitter`, la garde de `go()`) sur la vraie
   `NAV` — il garde ce que l'écran MONTRE et ce que `go()` REFUSE, pas le texte d'une règle.
   Cinq choses qu'il ne doit jamais laisser passer :
   · une entreprise SANS réglage (clé absente, serveur d'avant) qui perd une rubrique — le déploiement du serveur est séparé ;
   · une rubrique retirée qui reste ouverte à l'ADMINISTRATEUR, ou par une porte autre que le menu (la barre, `go()`, la
     carte des box, les notifications) ;
   · l'accueil, l'équipe, les modules et les réglages fermés — l'entreprise ne pourrait plus se rouvrir elle-même ;
   · la BÊTA qui masque quoi que ce soit (elle voit tout — `BETA_ESSAI`, comme `planBloque` et `metierBloque`) ;
   · une réponse illisible qui EFFACE ce que l'appareil sait (couper toute une entreprise sur une réponse qu'on ne comprend pas).
   Population vérifiée avant chaque absence comptée : un « rien n'est fermé » sur un menu vide passerait au vert.            */
'use strict';
const fs = require('fs'), path = require('path');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const egal = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), [a, b]);

/* Les commentaires qui OUVRENT une ligne se retirent ; jamais un bloc qui commence en fin de ligne (CLAUDE.md : « ne retirer
   que les blocs qui COMMENCENT une ligne »). Une fonction se cherche dans le code, jamais dans une phrase. */
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
/* Une fonction du fichier, ancrée sur sa DÉCLARATION, bornée par ses accolades (chaînes, commentaires et expressions
   régulières sautés) — la même découpe que test-848. */
function fonction(src, nom) {
  const m = new RegExp('(^|\\n)[ \\t]*(?:async )?function ' + nom + '\\(').exec(src); if (!m) return '';
  const d0 = src.indexOf('function ' + nom + '(', m.index) - (/async function/.test(m[0]) ? 6 : 0);
  let k = src.indexOf('{', src.indexOf(')', d0)), prof = 0, q = null;
  for (; k < src.length; k++) {
    const c = src[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && src[k + 1] === '/') { const n = src.indexOf('\n', k); k = n < 0 ? src.length : n; continue; }
    if (c === '/' && src[k + 1] === '*') { const n = src.indexOf('*/', k + 2); k = n < 0 ? src.length : n + 1; continue; }
    if (c === '/' && /(?:[(,=:[!&|?{};]|\breturn|\btypeof)\s*$/.test(src.slice(Math.max(0, k - 12), k))) {
      let cls = false;
      for (k++; k < src.length; k++) {
        const d = src[k];
        if (d === '\\') { k++; continue; }
        if (d === '\n') break;
        if (cls) { if (d === ']') cls = false; continue; }
        if (d === '[') { cls = true; continue; }
        if (d === '/') break;
      }
      continue;
    }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return src.slice(d0, k + 1);
}
const ligne = (src, re) => (re.exec(src) || [''])[0];
function tranche(src, debut, fin) { const i = src.indexOf(debut); if (i < 0) return ''; const j = src.indexOf(fin, i); return j < 0 ? '' : src.slice(i, j + fin.length); }

/* Les 38 clés que le serveur peut rendre (liste donnée par le chantier serveur) */
const CLES_SERVEUR = ['statistiques', 'historique', 'archives', 'planning', 'planningGeneral', 'taches', 'absences', 'interventions', 'rapports', 'carteInt', 'registre', 'carteBox', 'clients', 'devis', 'assistantDevis', 'factures', 'contrats', 'comptabilite', 'devisXylo', 'telecollecte', 'produits', 'stock', 'mouvements', 'boxes', 'saisieConso', 'enveloppes', 'pointage', 'vehicules', 'conducteurs', 'messagerie', 'boiteMail', 'fournisseurs', 'bons', 'brouillon', 'demandes', 'validations', 'commandes', 'secteurs'];
const TOUJOURS = ['dashboard', 'utilisateurs', 'modulesElan', 'parametres', 'suspendu'];

function pieces(SRC) {
  const N = nu(SRC);
  const P = {
    NAV: tranche(SRC, 'const NAV = [', '\n];'),
    SOUS_CATS: ligne(SRC, /^const SOUS_CATS=\[[^\n]*\];$/m),
    VUE_PARENT: ligne(SRC, /^const VUE_PARENT=[^\n]*;$/m),
    CATS_TOUJOURS: ligne(SRC, /^const CATS_TOUJOURS=[^\n]*;/m),
    cats_: ligne(SRC, /^let _cats;[^\n]*$/m),
    catsConnues_: ligne(SRC, /^let _catsConnues;[^\n]*$/m),
    ONGLETS: ligne(SRC, /^const ONGLETS_DEFAUT=[^\n]*;$/m) + '\n' + ligne(SRC, /^const ONGLETS_MAX=[^\n]*;$/m),
    garde: (() => { const i = SRC.indexOf("if(view!=='dashboard'&&view!=='suspendu'&&currentUser){ try{"), j = SRC.indexOf('  closeModal();', i); return i < 0 || j < 0 ? '' : SRC.slice(i, j); })(),
    /* l'ouverture par adresse (#v=…) : une garde à elle, AVANT go() — elle ne passait par aucun banc */
    hash: (() => { const i = SRC.indexOf('(function(){ const m=location.hash.match(/v='), fin = 'go(v); })();', j = SRC.indexOf(fin, i); return i < 0 || j < 0 ? '' : SRC.slice(i, j + fin.length); })(),
  };
  ['catsCle', 'catsConnues', 'catsListe', 'catsServeurAppliquer', 'catBloque', 'userSeesModule', 'canSee', 'tableDuRole', 'moduleReglage', 'defaultPerms', 'showAside',
    'ongletsDispo', 'ongletsLire', 'notifVoitModule', 'espaceQuitter', 'forfaitServeurSync'].forEach(n => { P[n] = fonction(SRC, n); });
  return { P, N, SRC };
}

/* Le monde d'un appareil : les vraies pièces, les bords (stockage, écran, navigation) simulés et COMPTÉS. */
function monde(PI, o) {
  o = o || {};
  const { P } = PI;
  const ls = {};
  Object.defineProperties(ls, {
    getItem: { value(k) { if (o.lectureImpossible) throw new Error('rangement refusé'); return Object.prototype.hasOwnProperty.call(this, k) ? this[k] : null; } },
    setItem: { value(k, v) { ls.__ecritures.n++; if (o.rangementPlein) throw new Error('QuotaExceeded'); this[k] = String(v); } },
    removeItem: { value(k) { delete this[k]; } },
    __ecritures: { value: { n: 0 } },
  });
  if (o.stock) Object.keys(o.stock).forEach(k => { ls[k] = o.stock[k]; });
  const vu = { nav: 0, vues: [], toasts: [], gos: [], idb: [], saves: 0 };
  const code = `
    let STORE_KEY=${JSON.stringify(o.storeKey || 'elan_gestion_v2')}; const BETA_ESSAI=${o.beta ? 'true' : 'false'};
    let currentUser=null; let current=${JSON.stringify(o.current || 'dashboard')}; let db={}; let location={hash:''};
    ${P.NAV}
    ${P.SOUS_CATS}
    ${P.VUE_PARENT}
    ${P.CATS_TOUJOURS}
    ${P.cats_}
    ${P.catsConnues_}
    ${P.ONGLETS}
    function planBloque(){ return false; } function metierBloque(){ return false; } function validationsOuvertes(){ return false; }
    function accesSuspendu(){ return false; } function prefLocalLire(){ return ''; }
    ${P.showAside}
    ${P.tableDuRole}
    ${P.moduleReglage}
    ${P.defaultPerms}
    ${P.catsCle}
    ${P.catsConnues}
    ${P.catsListe}
    ${P.catsServeurAppliquer}
    ${P.catBloque}
    ${P.userSeesModule}
    ${P.canSee}
    ${P.ongletsDispo}
    ${P.ongletsLire}
    ${P.notifVoitModule}
    ${P.espaceQuitter}
    function garde(view){ ${P.garde}
      return view; }
    db.permissions=defaultPerms();
    return {
      comme(u){ currentUser=u; }, vue(v){ current=v; },
      ouvrirParAdresse(h){ location={hash:h}; ${P.hash} },
      sync(j){ return catsServeurAppliquer(j); },
      bloque: k=>catBloque(k),
      voit: (u,k)=>userSeesModule(u,k),
      menu: ()=>NAV.flatMap(s=>s.items).filter(canSee).map(i=>i.k),
      barre: ()=>ongletsLire().slice(),
      garde,
      notif: k=>notifVoitModule(k),
      quitter: ()=>espaceQuitter(),
      connues: ()=>catsConnues().slice(),
      nav: ()=>NAV.flatMap(s=>s.items).map(i=>i.k),
      db: ()=>db,
    };`;
  const toast = m => vu.toasts.push(String(m));
  const views = new Proxy({}, { get: (_, v) => (typeof v === 'string' && v !== 'then' ? () => { vu.vues.push(v); } : undefined) });
  const A = new Function('localStorage', 'renderNav', 'toast', 'go', 'views', 'save', 'logEvent', 'indexedDB', 'lienLisibleOublier', 'renderOnglets', code)(
    ls, () => { vu.nav++; }, toast, v => { vu.gos.push(v); }, views, () => { vu.saves++; }, () => {}, { deleteDatabase: n => vu.idb.push(n), open: () => ({}) }, () => {}, () => {});
  A.ls = ls; A.vu = vu;
  const ouvrir = A.ouvrirParAdresse; A.adresse = h => { const n = vu.gos.length; ouvrir(h); return vu.gos.length > n ? vu.gos[vu.gos.length - 1] : '(go() jamais appelé)'; };
  A.admin = { id: 'u-adm', role: 'admin', acces: {} };
  A.tech = { id: 'u-tec', role: 'technicien', acces: {} };
  A.comme(A.admin);
  return A;
}

const fichiers = [['app.html', false], ['beta.html', true]];
const base = path.join(__dirname, '..');
(async () => {
  for (const [nomFichier, estBeta] of fichiers) {
    const SRC = fs.readFileSync(process.env.APP_FICHIER || path.join(base, nomFichier), 'utf8');
    const PI = pieces(SRC), { P, N } = PI;
    const NOM = '2875/' + nomFichier;
    console.log('\n══ ' + NOM + ' ══');

    console.log('\n── 0. la population ──');
    const manque = Object.keys(P).filter(k => !P[k]);
    vrai('toutes les pièces sont trouvées dans le fichier réel (NAV, SOUS_CATS, VUE_PARENT, les fonctions, la garde de go())', manque.length === 0, manque);
    vrai('une seule définition de chaque fonction neuve (une seconde remplacerait la première pour toute la page)',
      ['catsServeurAppliquer', 'catBloque', 'catsListe', 'catsConnues', 'catsCle'].every(n => (N.match(new RegExp('function ' + n + '\\(', 'g')) || []).length === 1));
    const W0 = monde(PI);
    const nav = W0.nav();
    vrai('la NAV compte les 38 rubriques du serveur + dashboard, utilisateurs, modulesElan (' + nav.length + ')', nav.length === 41, nav.length);
    egal('⛔ ÉCART DE CLÉS : les 38 clés du serveur sont toutes des rubriques de NAV, et NAV n\'en a pas d\'autre que les toujours ouvertes',
      { absentes: CLES_SERVEUR.filter(k => nav.indexOf(k) < 0), enTrop: nav.filter(k => CLES_SERVEUR.indexOf(k) < 0 && TOUJOURS.indexOf(k) < 0) }, { absentes: [], enTrop: [] });
    egal('catsConnues() = exactement les 38 clés (les toujours ouvertes n\'y sont pas)', W0.connues().slice().sort(), CLES_SERVEUR.slice().sort());
    const plein = W0.menu();
    vrai('population : sans réglage, l\'administrateur voit les 41 rubriques (un menu vide ferait passer tous les « fermé »)', plein.length === 41, plein.length);
    const pleinTech = (() => { const W = monde(PI); W.comme(W.tech); return W.menu(); })();
    vrai('population : le technicien en voit ' + pleinTech.length + ' (> 20), et pas « utilisateurs »', pleinTech.length > 20 && pleinTech.indexOf('utilisateurs') < 0, pleinTech);

    console.log('\n── 1. SANS clé `cats` (un serveur d\'avant) : rien ne bouge ──');
    { const W = monde(PI);
      vrai('{ok:true} sans `cats` : rien (faux)', W.sync({ ok: true, metier: 'plomberie' }) === false);
      egal('… le menu est identique', W.menu(), plein);
      vrai('… rien n\'est rangé, rien n\'est redessiné', W.ls.__ecritures.n === 0 && W.vu.nav === 0 && Object.keys(W.ls).length === 0, [W.ls.__ecritures.n, W.vu.nav]);
      vrai('… un appel sans réponse (undefined / null / texte) ne casse rien non plus', [undefined, null, 'x', 4].every(j => W.sync(j) === false)); }
    { const W = monde(PI); W.sync({ cats: ['planning'] }); const apres = W.menu();
      vrai('⛔ une entreprise AVEC une liste puis un serveur d\'avant (clé absente) : la liste tient (l\'appareil garde ce qu\'il sait)',
        W.sync({ ok: true }) === false && JSON.stringify(W.menu()) === JSON.stringify(apres) && apres.length < 10, apres); }

    console.log('\n── 2. UNE LISTE : planning, clients, boxes ──');
    { const W = monde(PI, { current: 'interventions' });
      vrai('la liste s\'applique (vrai)', W.sync({ ok: true, cats: ['planning', 'clients', 'boxes'] }) === true);
      egal('⛔ le menu de l\'ADMINISTRATEUR : les trois rubriques + l\'accueil, l\'équipe et les modules — rien d\'autre',
        W.menu().slice().sort(), ['boxes', 'clients', 'dashboard', 'modulesElan', 'planning', 'utilisateurs']);
      W.comme(W.tech);
      egal('… celui du TECHNICIEN : les trois + l\'accueil (il n\'a jamais « utilisateurs » ni « modules »)', W.menu().slice().sort(), ['boxes', 'clients', 'dashboard', 'planning']);
      egal('… la BARRE du bas : plus d\'« interventions » (c\'était un onglet d\'origine) ; ce qui reste est retenu',
        W.barre().slice().sort(), ['boxes', 'clients', 'dashboard', 'planning']);
      W.comme(W.admin);
      const barreAdmin = W.barre();
      vrai('… la barre de l\'administrateur : non vide et sans rubrique retirée', barreAdmin.length >= 3 && barreAdmin.every(k => W.menu().indexOf(k) >= 0), barreAdmin);
      vrai('⛔ l\'administrateur ne voit pas une rubrique retirée : interventions, factures, comptabilité, stock, pointage',
        ['interventions', 'factures', 'comptabilite', 'stock', 'pointage', 'statistiques'].every(k => W.voit(W.admin, k) === false));
      egal('⛔ go(\'interventions\') est refusé : retour à l\'accueil, avec un message qui parle de l\'ENTREPRISE (pas de « Permissions »)', [W.garde('interventions'), /entreprise/.test(W.vu.toasts[W.vu.toasts.length - 1] || '') && !/Permissions/.test(W.vu.toasts[W.vu.toasts.length - 1] || '')], ['dashboard', true]);
      egal('… go(\'planning\') passe', W.garde('planning'), 'planning');
      egal('… l\'accueil, les modules et les utilisateurs passent', ['dashboard', 'modulesElan', 'utilisateurs'].map(v => W.garde(v)), ['dashboard', 'modulesElan', 'utilisateurs']);
      egal('… les Paramètres et l\'écran suspendu passent aussi (jamais fermés)', ['parametres', 'suspendu'].map(v => W.garde(v)), ['parametres', 'suspendu']);
      vrai('… une vue qui n\'est pas une rubrique (techniciens) n\'est pas fermée par ce réglage', W.bloque('techniciens') === false && W.garde('techniciens') === 'techniciens');
      vrai('⛔ rien n\'est écrit dans `db` ni sauvegardé (le réglage est un état d\'APPAREIL)', W.vu.saves === 0 && Object.keys(W.db()).join() === 'permissions', [W.vu.saves, Object.keys(W.db())]);
      egal('… le réglage est rangé sur l\'appareil, sous le préfixe de STORE_KEY (elan_cats)', JSON.parse(W.ls['elan_cats'] || 'null'), ['boxes', 'clients', 'planning']);
      vrai('… le menu est redessiné, et l\'écran courant (interventions, retiré) est quitté pour l\'accueil, avec un message',
        W.vu.nav === 1 && W.vu.gos.join() === 'dashboard' && W.vu.toasts.some(t => /plus ouverte à ton entreprise/.test(t)), [W.vu.nav, W.vu.gos, W.vu.toasts]);
      vrai('… les notifications d\'une rubrique retirée ne sont plus montrées, même à l\'administrateur (notifVoitModule)', W.notif('factures') === false && W.notif('planning') === true); }

    console.log('\n── 3. toujours ouvertes, et une liste vide ferme tout le reste ──');
    { const W = monde(PI);
      vrai('un tableau VIDE s\'applique (rien de retenu)', W.sync({ cats: [] }) === true);
      egal('⛔ dashboard, utilisateurs, modulesElan restent au menu de l\'administrateur — et c\'est TOUT', W.menu().slice().sort(), ['dashboard', 'modulesElan', 'utilisateurs']);
      vrai('… catBloque ne ferme jamais dashboard, utilisateurs, modulesElan, parametres, suspendu', TOUJOURS.every(k => W.bloque(k) === false), TOUJOURS.map(k => W.bloque(k)));
      vrai('… et ferme les 38 autres (population : 38 fermées)', CLES_SERVEUR.filter(k => W.bloque(k)).length === 38);
      egal('… la barre du bas garde l\'accueil', W.barre(), ['dashboard', 'utilisateurs', 'modulesElan']);
      W.comme(W.tech); egal('… un technicien : l\'accueil seul', W.menu(), ['dashboard']); }

    console.log('\n── 4. sous-catégories et carte des box ──');
    { const W = monde(PI);
      W.sync({ cats: ['boxes'] }); W.comme(W.tech);
      vrai('« Produits donnés » SUIT SON PARENT : les Box retenues, la sous-catégorie est ouverte (le technicien a la case)', W.bloque('produitsDonnes') === false && W.voit(W.tech, 'produitsDonnes') === true);
      egal('… mais la CARTE des box est une rubrique à part : non cochée, elle est fermée', [W.bloque('carteBox'), W.voit(W.tech, 'carteBox')], [true, false]);
      egal('⛔ … et go(\'carteBox\') est refusé même si les Box sont retenues (la garde la ramène à `boxes` : elle ne suffit pas)', W.garde('carteBox'), 'dashboard');
      egal('… go(\'produitsDonnes\') passe', W.garde('produitsDonnes'), 'produitsDonnes');
      W.sync({ cats: ['boxes', 'carteBox'] });
      egal('… cochée avec les Box, la carte passe', W.garde('carteBox'), 'carteBox');
      W.sync({ cats: ['planning'] });
      vrai('⛔ Box NON retenues : la sous-catégorie est fermée avec son parent (menu, droit et go())',
        W.bloque('produitsDonnes') === true && W.voit(W.tech, 'produitsDonnes') === false && W.garde('produitsDonnes') === 'dashboard' && W.garde('boxes') === 'dashboard'); }

    console.log('\n── 4 bis. la carte retenue SANS les Box (relecture adverse, v772) ──');
    { const W = monde(PI);
      W.sync({ cats: ['carteBox'] });
      vrai('population : la carte est retenue, les Box non (' + W.bloque('carteBox') + ' / ' + W.bloque('boxes') + ')', W.bloque('carteBox') === false && W.bloque('boxes') === true);
      vrai('⛔ le MENU de l\'administrateur montre la carte', W.menu().indexOf('carteBox') >= 0 && W.menu().indexOf('boxes') < 0, W.menu());
      egal('⛔ … et go(\'carteBox\') la LAISSE PASSER (avant : refusée au clic, alors que le menu la montrait)', W.garde('carteBox'), 'carteBox');
      egal('… sans message de refus', W.vu.toasts.filter(t => /pas ouverte/.test(t)).length, 0);
      egal('⛔ … l\'adresse #v=carteBox aussi', W.adresse('#v=carteBox'), 'carteBox');
      egal('… mais go(\'boxes\') et #v=boxes restent refusés (les Box ne sont pas retenues)', [W.garde('boxes'), W.adresse('#v=boxes')], ['dashboard', 'dashboard']);
      W.comme(W.tech);
      egal('… le technicien (qui a les droits des box) passe lui aussi, par go() et par l\'adresse', [W.garde('carteBox'), W.adresse('#v=carteBox')], ['carteBox', 'carteBox']);
      W.comme({ id: 'u-sans', role: 'technicien', acces: { modules: { boxes: false, carteBox: false } } });
      egal('⛔ … mais une personne SANS les droits des box n\'y entre pas : retenir la carte ne donne aucun droit (go() et adresse)', [W.garde('carteBox'), W.adresse('#v=carteBox')], ['dashboard', 'dashboard']); }
    { const W = monde(PI);
      W.sync({ cats: ['boxes'] });
      egal('⛔ contre-épreuve : les Box retenues SANS la carte, la carte reste fermée par go() ET par l\'adresse', [W.garde('carteBox'), W.adresse('#v=carteBox')], ['dashboard', 'dashboard']);
      W.sync({ cats: ['boxes', 'carteBox'] });
      egal('… les deux retenues : elle passe par les deux', [W.garde('carteBox'), W.adresse('#v=carteBox')], ['carteBox', 'carteBox']);
      W.sync({ cats: ['planning'] });
      egal('… ni l\'une ni l\'autre : fermée par les deux, avec le message de l\'ENTREPRISE', [W.garde('carteBox'), W.adresse('#v=carteBox'), /entreprise/.test(W.vu.toasts[W.vu.toasts.length - 1] || '')], ['dashboard', 'dashboard', true]);
      W.sync({ cats: null });
      egal('… sans réglage : ouverte (rien ne change pour une entreprise sans liste)', [W.garde('carteBox'), W.adresse('#v=carteBox')], ['carteBox', 'carteBox']); }

    console.log('\n── 5. null : tout se rouvre ──');
    { const W = monde(PI, { current: 'interventions' });
      W.sync({ cats: ['planning'] });
      const ferme = W.menu().length;
      vrai('(témoin) avec la liste, le menu est réduit (' + ferme + ')', ferme === 4, W.menu());
      const n0 = W.vu.nav;
      vrai('`cats: null` s\'applique', W.sync({ cats: null }) === true);
      egal('⛔ tout est rouvert, comme avant', W.menu(), plein);
      vrai('… le réglage de l\'appareil est RETIRÉ (pas une liste vide)', !('elan_cats' in W.ls), Object.keys(W.ls));
      vrai('… le menu est redessiné', W.vu.nav === n0 + 1, [W.vu.nav, n0]);
      egal('… et la rubrique qu\'on avait quittée se rouvre à la demande', W.garde('interventions'), 'interventions');
      vrai('… null répété : rien (déjà le bon)', W.sync({ cats: null }) === false && W.vu.nav === n0 + 1); }

    console.log('\n── 6. une valeur ILLISIBLE n\'efface jamais ce que l\'appareil sait ──');
    { const W = monde(PI);
      W.sync({ cats: ['planning', 'clients'] });
      const avant = W.menu(), ecr = W.ls.__ecritures.n, nav0 = W.vu.nav;
      const illisibles = ['planning', 42, true, {}, { planning: true }, ['inconnue1', 'inconnue2'], [1, 2], [null], ['dashboard_x']];
      const rendus = illisibles.map(c => W.sync({ cats: c }));
      vrai('⛔ texte, nombre, booléen, objet, tableau sans AUCUNE clé connue : aucun ne s\'applique', rendus.every(r => r === false), rendus);
      egal('… le menu est inchangé', W.menu(), avant);
      vrai('… rien n\'est écrit ni redessiné', W.ls.__ecritures.n === ecr && W.vu.nav === nav0, [W.ls.__ecritures.n, ecr, W.vu.nav, nav0]);
      vrai('… le rangement garde la liste d\'avant', JSON.stringify(JSON.parse(W.ls['elan_cats'])) === JSON.stringify(['clients', 'planning']), W.ls['elan_cats']);
      vrai('(contre-épreuve) une liste lisible mais mêlée d\'inconnues s\'applique, ne garde que les clés connues, sans doublon',
        W.sync({ cats: ['stock', 'clef_future', 'stock', 7, 'pointage'] }) === true && JSON.stringify(JSON.parse(W.ls['elan_cats'])) === JSON.stringify(['pointage', 'stock']), W.ls['elan_cats']);
      vrai('(contre-épreuve) les clés « toujours ouvertes » seules sont une réponse LISIBLE : tout le reste se ferme',
        W.sync({ cats: ['dashboard'] }) === true && W.menu().length === 3, W.menu()); }
    { /* un rangement corrompu sur l'appareil ne ferme rien non plus */
      const W = monde(PI, { stock: { elan_cats: '{pas du json' } });
      egal('⛔ le rangement de l\'appareil est illisible (JSON cassé) : tout reste ouvert', W.menu(), plein);
      const W2 = monde(PI, { stock: { elan_cats: '"planning"' } });
      egal('… et une valeur rangée qui n\'est pas un tableau : tout reste ouvert', W2.menu(), plein); }

    console.log('\n── 7. même liste : ni écriture ni redessin ──');
    { const W = monde(PI);
      W.sync({ cats: ['planning', 'clients'] });
      const e = W.ls.__ecritures.n, nv = W.vu.nav;
      vrai('la même liste dans un autre ordre, avec des doublons : rien (faux)', W.sync({ cats: ['clients', 'planning', 'clients'] }) === false && W.ls.__ecritures.n === e && W.vu.nav === nv); }

    console.log('\n── 8. l\'écran courant : redessiné s\'il reste ouvert, quitté s\'il se ferme ──');
    { const W = monde(PI, { current: 'planning' });
      W.sync({ cats: ['planning', 'clients'] });
      vrai('l\'écran courant reste ouvert : il est redessiné, on ne le quitte pas', W.vu.vues.join() === 'planning' && W.vu.gos.length === 0, [W.vu.vues, W.vu.gos]); }
    { const W = monde(PI, { current: 'produitsDonnes' });
      W.sync({ cats: ['planning'] });
      vrai('une sous-catégorie ouverte quand son parent se ferme : retour à l\'accueil', W.vu.gos.join() === 'dashboard', W.vu.gos); }
    { const W = monde(PI, { current: 'dashboard' });
      W.sync({ cats: ['planning'] });
      vrai('sur l\'accueil : redessiné, pas de navigation ni de message', W.vu.gos.length === 0 && W.vu.toasts.length === 0 && W.vu.vues.join() === 'dashboard', [W.vu.gos, W.vu.toasts, W.vu.vues]); }
    { const W = monde(PI, { current: 'interventions' }); W.comme(null);
      W.sync({ cats: ['planning'] });
      vrai('personne n\'est connecté (l\'écran de connexion) : le réglage se range, rien ne se redessine ni ne navigue', W.vu.nav === 0 && W.vu.gos.length === 0 && 'elan_cats' in W.ls, [W.vu.nav, W.vu.gos]); }

    console.log('\n── 9. le rangement : un appareil qui redémarre, un rangement plein ou refusé ──');
    { const A = monde(PI); A.sync({ cats: ['planning', 'clients'] });
      const B = monde(PI, { stock: Object.assign({}, A.ls) });
      egal('⛔ un appareil qui REDÉMARRE relit son réglage sans avoir parlé au serveur : même menu', B.menu().slice().sort(), ['clients', 'dashboard', 'modulesElan', 'planning', 'utilisateurs']);
      const C = monde(PI, { storeKey: 'elanB_gestion_v2', stock: { elan_cats: '["planning"]' } });
      egal('… la clé suit le préfixe de STORE_KEY : celle de la bêta (elanB_) ne lit pas celle de la production (elan_)', C.menu(), plein);
      C.sync({ cats: ['clients'] });
      vrai('… et elle écrit sous le sien', JSON.parse(C.ls['elanB_cats']).join() === 'clients' && C.ls['elan_cats'] === '["planning"]', Object.keys(C.ls)); }
    { const W = monde(PI, { rangementPlein: true });
      vrai('rangement qui refuse d\'écrire (plein, navigation privée) : la liste s\'applique quand même, pour la séance',
        W.sync({ cats: ['planning'] }) === true && W.menu().length === 4, W.menu()); }
    { const W = monde(PI, { lectureImpossible: true });
      egal('rangement qu\'on ne peut pas LIRE : la page fonctionne, tout est ouvert (jamais fermé sur un doute)', W.menu(), plein);
      vrai('… et une liste reçue du serveur s\'applique en mémoire', W.sync({ cats: ['planning'] }) === true && W.menu().length === 4); }

    console.log('\n── 10. la BÊTA voit tout, quoi qu\'il y ait de réglé ──');
    { const W = monde(PI, { beta: true, stock: { elan_cats: '["planning"]' } });
      egal('⛔ BETA_ESSAI : le menu est complet malgré une liste rangée', W.menu(), plein);
      vrai('… catBloque est faux pour les 38 clés', CLES_SERVEUR.every(k => W.bloque(k) === false));
      W.sync({ cats: ['planning'] });
      vrai('… même après réception d\'une liste, et go() ne refuse rien', W.menu().length === 41 && CLES_SERVEUR.every(k => W.garde(k) === k));
      W.comme(W.tech); vrai('… le technicien aussi', W.menu().length === pleinTech.length); }
    if (estBeta) {
      vrai('beta.html est bien la bêta : BETA_ESSAI y vaut true (la bêta générée voit tout par construction)', /const BETA_ESSAI=true;/.test(SRC));
      const R = monde(PI, { beta: false, stock: { elanB_cats: '["planning"]' }, storeKey: 'elanB_gestion_v2' });
      vrai('⛔ la MÊME page, BETA_ESSAI forcé à false (la sonde de production) : la règle s\'applique — la bêta ne l\'ignore que par ce drapeau', R.menu().length === 4, R.menu());
    } else {
      vrai('app.html : BETA_ESSAI y vaut false (en production, le réglage décide)', /const BETA_ESSAI=false;/.test(SRC));
      const R = monde(PI, { beta: true, stock: { elan_cats: '["planning"]' } });
      vrai('⛔ la MÊME page, BETA_ESSAI forcé à true : tout est ouvert — le drapeau est bien ce qui décide', R.menu().length === 41);
    }

    console.log('\n── 11. quitter une entreprise emporte son réglage ──');
    { const W = monde(PI, { stock: { elan_gestion_v2: '{}', elan_susp: 'x' } });
      W.sync({ cats: ['planning'] });
      vrai('(témoin) le réglage est là et ferme des rubriques', 'elan_cats' in W.ls && W.bloque('factures') === true);
      W.quitter();
      vrai('⛔ espaceQuitter() retire la clé du rangement', !('elan_cats' in W.ls), Object.keys(W.ls));
      vrai('⛔ … et la mémoire de la séance : l\'entreprise suivante ne reçoit pas les rubriques de la précédente', W.bloque('factures') === false && W.menu().length === 41, W.menu().length); }

    console.log('\n── 12. le câblage dans le fichier réel ──');
    { const F = nu(P.forfaitServeurSync);
      const iM = F.indexOf('metierServeurAppliquer(j)'), iC = F.indexOf('catsServeurAppliquer(j)'), iF = F.indexOf('const nonPaye');
      vrai('forfaitServeurSync appelle catsServeurAppliquer(j) APRÈS le métier et AVANT le test de formule', iM > 0 && iC > iM && iF > iC, [iM, iC, iF]);
      vrai('… sous un try (une exception n\'arrête pas la lecture de la formule)', /try\{\s*catsServeurAppliquer\(j\);?\s*\}catch\(e\)\{\}/.test(F)); }
    { const C = nu(P.catsServeurAppliquer);
      vrai('⛔ catsServeurAppliquer n\'écrit ni dans `db` ni par `save()` (rien ne s\'écrit au seul chargement)', !/\bdb\b/.test(C) && !/\bsave\(/.test(C) && !/logEvent\(/.test(C), C.match(/\bdb\b|\bsave\(|logEvent\(/)); }
    { const B = nu(P.catBloque);
      vrai('⛔ catBloque commence par `if(BETA_ESSAI) return false;` (la règle de test-749, étendue à la nouvelle fonction)', /^function catBloque\(k\)\{\s*if\(BETA_ESSAI\) return false;/.test(B), B.slice(0, 80)); }
    { const U = nu(P.userSeesModule);
      const iCat = U.indexOf('catBloque(k)'), iAdm = U.indexOf("u.role==='admin'");
      vrai('⛔ userSeesModule ferme une rubrique retirée AVANT le test de l\'administrateur (comme planBloque et metierBloque)', iCat > 0 && iAdm > iCat, [iCat, iAdm]);
      vrai('… et la garde de go() lit catBloque sous la clé demandée', /catBloque\(view\)/.test(nu(P.garde))); }
    { const NN = nu(P.notifVoitModule);
      vrai('notifVoitModule ne laisse pas l\'administrateur voir une rubrique retirée', /role==='admin'\)\s*return !catBloque\(k\)/.test(NN), NN); }
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})();
