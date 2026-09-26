/* ⛔ CE QUE CE FICHIER GARDE — l'organisation de la Tour (v2.68).
   Justin, 26 septembre 2026 : « je veux que dans la tour tu ranges tout bien comme il faut, pour que ce
   soit bien rangé et bien organisé ; je veux que tu regardes toutes les catégories et sous-catégories,
   et que tout ça soit bien organisé ; je veux un truc pro ».

   Ce que la réorganisation a trouvé, et que ce banc empêche de revenir :
     · une liste des vues tenue À LA MAIN à côté du menu (VUES_PAR_APP), qui avait déjà oublié une vue ;
     · deux noms pour un même écran (« Support » au menu, « Courrier » en titre ; « Comptes & accès »
       au menu, « Accès » dans la barre ; « Données » pour les Sauvegardes) ;
     · des phrases de droits écrites à la main qui mentaient (« pas le Journal » pendant que le menu du
       collaborateur le montrait ; « ni Équipe, ni Accès, ni Journal » sans les Sauvegardes) ;
     · ce que le serveur réserve au patron laissé au menu d'un collaborateur, pour n'y montrer qu'un
       refus — et ouvrable en tapant l'adresse ;
     · le statut des problèmes filtré par trois commandes à la fois (cartes, segments, menu à neuf
       choix), et un compteur « Ouverts » qui ne comptait pas comme sa liste filtrait ;
     · une tuile (« En essai ») qui filtrait sans qu'aucun segment ne s'allume ;
     · un identifiant d'espace d'ELAN écrit dans la page servie.

   Les VRAIES fonctions de la Tour sont extraites et exécutées dans un bac à sable ; ce qui ne peut
   pas s'exécuter ici (la mise en page) se relit dans le CODE, commentaires retirés (règle du dépôt),
   et se mesure au navigateur : scratchpad/sonde-tour-theme.js (textes couverts, textes écrasés).
   TOUR_FICHIER : une copie mutée, pour éprouver ce banc sans toucher au fichier du dépôt. */
'use strict';
const fs = require('fs'), vm = require('vm'), path = require('path');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER || path.join(RACINE, 'tour.html'), 'utf8');
const SERVEUR = fs.readFileSync(path.join(RACINE, 'server', 'index.js'), 'utf8');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); }
  else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + d : ''), !!c, true);
const sansCommentaires = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const CODE = sansCommentaires(SRC);
const CODE_SRV = sansCommentaires(SERVEUR);
/* une fonction jusqu'à SA fin : accolades comptées hors chaînes et hors commentaires. ⚠️ Une expression
   régulière qui porte une apostrophe (celle d'esc : /[&<>"']/) la tromperait : esc se prend par sa LIGNE. */
function fonction(nom) {
  const m = new RegExp('\\nfunction ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', m.index), prof = 0, q = null;
  for (; k < CODE.length; k++) {
    const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '/' && CODE[k + 1] === '*') { k = CODE.indexOf('*/', k) + 1; continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) break; }
  }
  return CODE.slice(m.index + 1, k + 1);
}
const ligne = (debut) => { const i = CODE.indexOf(debut); if (i < 0) return ''; return CODE.slice(i, CODE.indexOf('\n', i)); };
const bloc = (debut, fin) => { const i = CODE.indexOf(debut); if (i < 0) return ''; const j = CODE.indexOf(fin, i); return j < 0 ? '' : CODE.slice(i, j + fin.length); };

const PIECES = [bloc('var MENU=[', '];'), ligne('var PATRON_SEUL='), fonction('vuePermise'), fonction('vuesDe'), ligne('var VUES_PAR_APP='),
  fonction('vues'), fonction('menuVisible'), fonction('vueInfo'), bloc('var BAS_LIB={', '};'), fonction('eqNoteCollaborateur'),
  fonction('libsPatronSeul'), fonction('enPhrase'), ligne('function esc(s){')];
vrai('population : les pièces du menu sont extraites (13 sur 13)', PIECES.every(Boolean), PIECES.map((p, i) => p ? '' : i).join(' '));
function bac(role, app) {
  const ctx = { APP: app || 'gestion', MYROLE: role || 'patron', console };
  vm.createContext(ctx); vm.runInContext(PIECES.join('\n') + '\nthis.MENU=MENU; this.PATRON_SEUL=PATRON_SEUL; this.VUES_PAR_APP=VUES_PAR_APP; this.BAS_LIB=BAS_LIB;', ctx);
  return ctx;
}

console.log('\n1. Les catégories, et chaque vue rangée une fois');
const P = bac('patron', 'gestion');
const cles = P.MENU.reduce((a, g) => a.concat(g.vues.map(x => x[0])), []);
v('quatre catégories, rangées par sujet', P.MENU.map(g => g.section), ['Tour', 'Clients', 'Support', 'Administration']);
v('…et dans chacune, ses vues', P.MENU.map(g => g.vues.map(x => x[0]).join(',')),
  ['accueil', 'entreprises,abonnements,connexions,devisia', 'surveillance,support', 'essais,equipe,journal,donnees']);
v('chaque vue une seule fois', cles.length, new Set(cles).size);
const rendues = [...fonction('renderVue').matchAll(/TAB==='(\w+)'/g)].map(m => m[1]);
vrai('population : renderVue dessine des vues', rendues.length >= 11, rendues.length);
v('le menu et renderVue connaissent les MÊMES vues (aucune orpheline, aucune fantôme)', [...cles].sort(), [...new Set(rendues)].sort());
v('la liste des vues de GESTION est DÉDUITE du menu, dans son ordre', P.VUES_PAR_APP.gestion,
  cles.filter(k => P.MENU.some(g => g.vues.some(x => x[0] === k && x[2].split(' ').includes('gestion')))));
v('…celle de MESSAGES aussi', P.VUES_PAR_APP.messages, ['accueil', 'entreprises', 'surveillance', 'support', 'equipe', 'journal']);
vrai('⛔ plus aucune liste des vues écrite à la main', /var VUES_PAR_APP=\{gestion:vuesDe\('gestion'\),messages:vuesDe\('messages'\)\};/.test(CODE) && !/\nvar VUES=/.test(CODE));

console.log('\n2. Un nom par vue, partout');
const LIB = {}; P.MENU.forEach(g => g.vues.forEach(x => { LIB[x[0]] = x[1]; }));
v('les noms du menu', LIB, { accueil: 'Accueil', entreprises: 'Entreprises', abonnements: 'Abonnements', connexions: 'Connexions', devisia: 'Devis IA',
  surveillance: 'Surveillance', support: 'Courrier', essais: 'Accès', equipe: 'Équipe', journal: 'Journal', donnees: 'Sauvegardes' });
/* le titre de chaque page : toutes les chaînes passées à enTete() dans la fonction qui la dessine */
const rv = fonction('renderVue');
const dessin = {}; for (const m of rv.matchAll(/TAB==='(\w+)'\) v\.innerHTML=([^;]+);/g)) dessin[m[1]] = [...m[2].matchAll(/(vue\w+)\(\)/g)].map(x => x[1]);
let titres = 0;
for (const [cle, fns] of Object.entries(dessin)) {
  if (cle === 'accueil') continue;
  for (const f of fns) {
    const corps = fonction(f);
    /* un titre COMPOSÉ (« Courrier · » + le nom d'une entreprise) laisse des morceaux de concaténation —
       « · », une chaîne vide — qui ne sont pas des titres : on ne garde que les chaînes qui en commencent un */
    const lits = [...corps.matchAll(/enTete\(([^,]+),/g)].map(m => [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1])).flat()
      .filter(t => t.trim() && !/^\s*·/.test(t));
    titres += lits.length;
    vrai('« ' + LIB[cle] + ' » : ' + f + ' se titre du nom du menu', lits.length && lits.every(t => t === LIB[cle] || t.startsWith(LIB[cle] + ' · ')), JSON.stringify(lits));
  }
}
vrai('population : les titres de page relevés', titres >= 11, titres);
vrai('l’accueil se titre par vueInfo (plus de « Tour · Tableau de bord » écrit à la main)',
  (fonction('vueAccueil').match(/vueInfo\('accueil'\)/g) || []).length >= 2 && (fonction('vueAccueilMsg').match(/vueInfo\('accueil'\)/g) || []).length >= 2);
vrai('le fil d’Ariane du haut et la section de chaque page lisent vueInfo', /vueInfo\(TAB\)/.test(fonction('majHaut')) && /vueInfo\(TAB\)\.section/.test(fonction('enTete')));
v('la barre du bas : une entrée par vue du menu', Object.keys(P.BAS_LIB).sort(), [...cles].sort());
const abreges = Object.entries(P.BAS_LIB).filter(([k, l]) => !LIB[k].startsWith(l.replace(/\.$/, '')));
v('…et chacune n’est qu’une ABRÉVIATION du nom du menu (« Surveill. », « Sauveg. »)', abreges, []);

console.log('\n3. Ce qui est au patron seul — des deux côtés');
const C = bac('collaborateur', 'gestion');
v('les vues réservées au patron', C.PATRON_SEUL, ['essais', 'equipe', 'journal', 'donnees']);
const vuesC = C.menuVisible().reduce((a, g) => a.concat(g.vues.map(x => x[0])), []);
v('le menu d’un collaborateur n’en montre aucune', vuesC.filter(t => C.PATRON_SEUL.includes(t)), []);
v('…et il garde tout le reste', vuesC, ['accueil', 'entreprises', 'abonnements', 'connexions', 'devisia', 'surveillance', 'support']);
v('sa navigation (vues()) ne les ouvre pas non plus', C.vues().filter(t => C.PATRON_SEUL.includes(t)), []);
v('le patron, lui, a les onze vues de GESTION', P.vues().length, 11);
v('…une catégorie vide disparaît du menu (MESSAGES, collaborateur : pas d’Administration)', bac('collaborateur', 'messages').menuVisible().map(g => g.section), ['Tour', 'Clients', 'Support']);
vrai('setTab ne pose que ce que vues() permet (première instruction)', /^function setTab\(t,sansAnim\)\{\s*if\(vues\(\)\.indexOf\(t\)<0\) t='accueil';/.test(fonction('setTab')));
vrai('renderVue refuse d’abord un écran réservé (filet)', /^function renderVue\(v\)\{\s*if\(!vuePermise\(TAB\)\) TAB='accueil';/.test(fonction('renderVue')));
vrai('le rôle relu au démarrage (/moi) fait sortir d’un écran réservé', /apiGet\('\/api\/monitor\/moi'\)[\s\S]{0,260}if\(!vuePermise\(TAB\)\)\{ renderTabs\(\); setTab\('accueil',true\); \}/.test(fonction('entrer')));
/* ⛔ la même vérité que le serveur : chaque vue réservée charge une route que le serveur garde par monPatronStrict */
const ROUTES = { essais: ['chargerBeta', "app.get('/api/monitor/beta', monPatronStrict"], equipe: ['chargerEquipe', "app.get('/api/monitor/users', monPatronStrict"],
  journal: ['chargerJournal', "app.get('/api/monitor/journal', monPatronStrict"] };
const routeDe = { chargerBeta: '/api/monitor/beta', chargerEquipe: '/api/monitor/users', chargerJournal: '/api/monitor/journal' };
for (const [cle, [charge, garde]] of Object.entries(ROUTES)) {
  const corps = fonction(charge) || (cle === 'essais' ? CODE.slice(CODE.indexOf("apiGet('/api/monitor/beta')") - 1, CODE.indexOf("apiGet('/api/monitor/beta')") + 40) : '');
  vrai('« ' + LIB[cle] + ' » lit ' + routeDe[charge] + ', que le serveur réserve au patron', corps.includes("apiGet('" + routeDe[charge] + "')") && CODE_SRV.includes(garde));
}
vrai('« Sauvegardes » lit /api/monitor/sauvegarde/etat, monté avec la garde du patron',
  fonction('donCharger').includes("apiGet('/api/monitor/sauvegarde/etat')") && /require\('\.\/sauvegarde'\)\.monterSauvegarde\(app, \{[^}]*garde: monPatronStrict/.test(CODE_SRV));
v('la note d’Équipe se DÉDUIT du menu', P.eqNoteCollaborateur(),
  'Il voit Accueil, Entreprises, Abonnements, Connexions, Devis IA, Surveillance et Courrier — pas Accès, Équipe, Journal ni Sauvegardes.');
v('la ligne d’un compte aussi (collaborateur)', ' · ni ' + P.libsPatronSeul().join(', ni '), ' · ni Accès, ni Équipe, ni Journal, ni Sauvegardes');
v('…(patron)', P.enPhrase(P.libsPatronSeul(), 'et'), 'Accès, Équipe, Journal et Sauvegardes');
const lq = fonction('vueEquipe');
vrai('⛔ vueEquipe n’écrit plus aucune liste de vues à la main', /libsPatronSeul\(\)/.test(lq) && /eqNoteCollaborateur\(\)/.test(lq) && !/ni Équipe, ni Accès|pas Équipe, pas Accès|y compris Équipe, Accès/.test(lq));

console.log('\n4. Le statut des problèmes : UNE commande, et des chiffres qui comptent comme la liste');
const STAT = [ligne('var ST_L='), ligne('var ST_ECARTES='), fonction('incSegStatut'), fonction('incAffinePastille'), fonction('incFiltres'),
  fonction('incOuverts'), fonction('incDeLaConsole'), ligne('function esc(s){')];
vrai('population : les pièces du statut sont extraites', STAT.every(Boolean), STAT.map((p, i) => p ? '' : i).join(' '));
const S = { INC: { list: [], f: {} }, appVisible: () => true, gravite: () => 'moyenne', console };
vm.createContext(S); vm.runInContext(STAT.join('\n'), S);
S.INC.list = [{ statut: 'nouveau' }, { statut: 'encours' }, {}, { statut: 'corrige' }, { statut: 'ignore' }, { statut: 'veille' }, { statut: 'interne' }, { statut: 'transitoire' }, { statut: 'corrige' }];
const seg = st => { S.INC.f = { statut: st }; return S.incSegStatut(S.incDeLaConsole()); };
v('quatre segments : Ouverts · Corrigés · Écartés · Tout', seg('actifs').segs.map(x => x[1]), ['Ouverts', 'Corrigés', 'Écartés', 'Tout']);
for (const [cle, lib, n] of seg('actifs').segs) {
  S.INC.f = { statut: cle };
  v('« ' + lib + ' » annonce ' + n + ' et sa liste en montre autant', S.incFiltres().length, n);
}
v('…le problème SANS statut compte comme nouveau, partout (compteur, liste, pastille du menu)', [seg('actifs').segs[0][2], S.incOuverts().length], [3, 3]);
v('une carte « Nouveaux » AFFINE « Ouverts » : le segment parent reste allumé', [seg('nouveau').cour, seg('nouveau').affine], ['actifs', 'Nouveau']);
v('…et sa liste : les nouveaux, sans-statut compris', (S.INC.f = { statut: 'nouveau' }, S.incFiltres().length), 2);
v('un état écarté remonte à « Écartés »', [seg('veille').cour, seg('veille').affine], ['ecartes', 'Mise en veille']);
const pas = S.incAffinePastille(seg('encours'));
vrai('la pastille dit l’affinage et le RETIRE en remontant au parent', /class="filtre-pose"/.test(pas) && /incF\('statut','actifs'\)/.test(pas) && /En cours seulement/.test(pas), pas);
v('…et n’existe pas sans affinage', S.incAffinePastille(seg('actifs')), '');
vrai('⛔ plus de menu déroulant du statut (Surveillance, fiche d’une entreprise)', !/onchange="incF\(\\'statut\\'/.test(CODE));
vrai('les deux écrans passent par incSegStatut', /incSegStatut\(/.test(fonction('vueSurveillance')) && /incSegStatut\(/.test(fonction('vueEntreprise')));

console.log('\n5. Chaque tuile qui filtre se voit filtrer');
const abo = fonction('vueAbonnements');
const tuilesAbo = [...abo.matchAll(/tuile\('(\w*)'/g)].map(m => m[1]);
const segAbo = (/teteListe\('Formules et paiements','Filtrer les abonnements',\[(.*?)\],f,'aboF\('\)/.exec(abo) || [])[1] || '';
const segsAbo = [...segAbo.matchAll(/\['(\w*)','/g)].map(m => m[1]);
vrai('population : les tuiles et les segments d’Abonnements sont relevés', tuilesAbo.length >= 3 && segsAbo.length >= 3, tuilesAbo + ' / ' + segsAbo);
v('Abonnements : chaque tuile a son segment (« En essai » n’en avait pas)', tuilesAbo.filter(t => !segsAbo.includes(t)), []);
const ent = fonction('vueEntreprises');
const tuilesEnt = [...ent.matchAll(/compteur\([^;]*?,'(\w+)'\)/g)].map(m => m[1]);
const segsEnt = [...((/var segE=\[(.*?)\];/.exec(ent) || [])[1] || '').matchAll(/\['(\w*)','/g)].map(m => m[1]);
const libsEnt = (/var ENT_FILTRE_LIB=\{([^}]*)\}/.exec(CODE) || [])[1] || '';
vrai('population : les tuiles qui filtrent Entreprises sont relevées', tuilesEnt.length >= 5, tuilesEnt.join(','));
v('Entreprises : une tuile sans segment dit son filtre en clair (ENT_FILTRE_LIB)', tuilesEnt.filter(t => !segsEnt.includes(t) && !new RegExp('\\b' + t + ':').test(libsEnt)), []);
vrai('…par la même pièce que la Surveillance (.filtre-pose), qui se retire d’un toucher', /class="filtre-pose" onclick="entFiltre\(/.test(ent) && /ENT_FILTRE_LIB\[ENT\.filtre\]/.test(ent));
vrai('six chiffres en deux rangées de trois (k6), jamais « 5 + 1 »', /grille-kpi simple k6/.test(ent) && (ent.match(/compteur\(/g) || []).length === 6 && /\.grille-kpi\.k6\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/.test(CODE));

console.log('\n6. La mise en page que les captures ont prise en défaut (le détail se mesure : sonde-tour-theme.js)');
vrai('un en-tête de groupe ne colle pas dans une colonne à bords arrondis (il couvrait la 1ʳᵉ ligne d’Équipe)', /\.col-liste \.reg-tete\{position:relative;top:auto\}/.test(CODE));
vrai('Équipe : les commandes passent sous le nom, sans écart de rangée', /\.reg-l\.eqp-l\{flex-wrap:wrap;row-gap:0\}/.test(CODE));
vrai('fiche d’une entreprise : ses comptes aussi (« t o m », une lettre par ligne)', /\.reg-l\.cpt-l\{flex-wrap:wrap;row-gap:0\}/.test(CODE) && /class="reg-l inerte cpt-l"/.test(CODE));
vrai('…les commandes d’un compte à droite, groupées (cpt-act)', /\.reg-l\.cpt-l \.cpt-act\{display:flex;gap:6px;margin-left:auto\}/.test(CODE) && /<span class="cpt-act">/.test(CODE));
vrai('un encart qui porte un bouton le pose sous sa phrase (encart-pile)', /\.encart\.encart-pile\{flex-direction:column/.test(CODE) && /class="encart encart-pile"/.test(CODE));
vrai('la sonde du thème mesure les textes couverts et écrasés (DOM entier)', (() => { try { const s = fs.readFileSync(path.join(RACINE, 'scratchpad', 'sonde-tour-theme.js'), 'utf8'); return /const MESURE_TEXTES = /.test(s) && /couverts par la vue à l’ouverture/.test(s) && /textes écrasés/.test(s); } catch (e) { return false; } })());

console.log('\n7. Rien d’ELAN dans la page servie');
const ids = SRC.match(/\belan-[a-z0-9]{4}\b/g) || [];
v('aucun identifiant d’espace « elan-xxxx » (commentaires compris : la page est servie telle quelle)', ids, []);
vrai('l’exemple du champ « Espace » est fictif', /placeholder="ex\. boulangerie-7k2q"/.test(CODE));

console.log(`\n════ test-829 : ${ok} ✓ ${ko} ✗ ════`);
process.exit(ko ? 1 : 0);
