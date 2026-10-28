/* ⛔ CE QUE CE FICHIER GARDE — LA TOUR RANGÉE PAR SUJET (v2.89, 18 octobre 2026).

   Justin : « refaire la Tour, tout bien ranger catégorie par catégorie ». Trois rangements, JOUÉS ici avec les vraies fonctions
   de tour.html (les blocs lourds de la fiche sont remplacés par des repères) :
     · la FICHE D'UNE ENTREPRISE : une carte par sujet, toujours dans le même ordre (Identité et argent · Accès · Abonnement ·
       Utilisateurs · Son espace · Activité · Contact · Comptes du site · Supprimer) ; chaque geste n'a QU'UNE place (le lien de
       connexion avec l'adresse, « Voir dans Stripe » avec l'abonnement, le métier et le chiffrement avec l'espace) ; l'espace, la
       formule et OP MESSAGES ne sont plus dits trois fois ; OP MESSAGES ne s'ouvre plus depuis la console GESTION (un lien mène à
       la sienne) ;
     · la SURVEILLANCE a la même forme dans les deux consoles : « Incidents » | « Service » — les versions, la publication, la
       sortie de Firebase et la bascule d'OP MESSAGES sont dans « Service », plus sous la liste des incidents ;
     · tout lien « vers les incidents » ouvre l'onglet Incidents (jamais le dernier onglet vu). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(__dirname, '..', 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 160) : ''), !!c, true);
function bloc(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  const suite = /\n(?:async function |function |var |setInterval|document\.|try\{)/g; suite.lastIndex = m.index + 8;
  const f = suite.exec(CODE);
  return CODE.slice(m.index + 1, f ? f.index : CODE.length);
}
console.log('\n── test-1019 : la Tour rangée par sujet ──');

/* ── 1. la fiche d'une entreprise ── */
const NOMS = ['esc', 'nomTechnique', 'jsq', 'sigle', 'svg', 'nMot', 'fmtJour', 'fmtDate', 'ficheChiffrement', 'ficheEntreprise', 'gestionClientParts', 'carteSi', 'joursRestants', 'metDemande'];
const SRCS = NOMS.map(bloc);
vrai('(population) les fonctions de la fiche sont trouvées dans tour.html', SRCS.every(Boolean), NOMS.filter((n, i) => !SRCS[i]).join(', '));
function fiche(o, avecCompte, pblCharge) {
  const REP = nom => () => '<div class="sous-sec"><div class="sec">[' + nom + ']</div></div>';
  const ctx = { console, JSON, String, Object, Array, Number, Math, Date, isFinite, encodeURIComponent, setTimeout() {}, clearTimeout() {}, window: {},
    IC: {}, MYAPPS: ['gestion', 'messages'], MET_L: { nettoyage: 'Nettoyage' }, MYROLE: 'patron', CATS_APPLIQUEES: false, catExpl: () => '', CAT_L: [['Planification', [['planning', 'Planning']]]],   /* (22 octobre 2026) le bloc des catégories d'OP GESTION se range avec le métier, et lit le rôle */
    ENT: { sel: o.t, liste: [o] }, CLI: { sel: o.email, list: avecCompte ? [{ email: o.email, entreprise: o.nom, nom: 'Claire Martin', tel: '', inscrit: 1, majTs: 1, demandes: [], apps: ['OP GESTION'] }] : [] },
    PBL: { loaded: pblCharge !== false, liste: [{ nom: o.nom, slug: 'boulmartin', email: o.email, opMessages: true }] },
    cliStatut: () => ['Sans formule', 'p-gris'], demandesATraiter: () => [], optsCasesHtml: () => '<div class="opts">[cases]</div>', squelListe: () => '<div>…</div>',
    videTour: () => '', tourActiviteCharge() {}, espSlugJs: x => String(x || '').toLowerCase(),
    blocUtilisateurs: REP('utilisateurs'), blocDossier: REP('dossier'), blocAccesFiche: REP('acces'), blocEspaceDe: REP('espace'), blocComptesDe: REP('comptes'),
    blocOrphelin: () => '', blocSupprimer: () => '<div class="sec">[supprimer]</div>', entSel() {} };
  vm.createContext(ctx); vm.runInContext(SRCS.join('\n'), ctx);
  return ctx.ficheEntreprise();
}
const O = { t: 'boulmartin-7k2q', nom: 'Boulangerie Martin', slug: 'boulmartin', email: 'contact@bm.test', formule: 'business', origine: 'site', cleEtat: 'propre', opMessages: true };
const H = fiche(O, true);
/* v2.94 — Justin : « tout ça avec écrit elan gestion, tu supprimes » : le pavé « 3 espaces techniques — jamais des entreprises » sous la liste Entreprises est RETIRÉ, et aucun
   identifiant « elan-gestion… » ne s'affiche plus (l'AFFICHAGE seulement : l'identifiant du code, lui, ne change pas). Les espaces techniques restent NON comptés comme entreprises. */
{ const TOUR = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8'), NU = TOUR.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  vrai('⛔ le pavé des espaces techniques n\'est plus construit sous la liste Entreprises (ni `var pave`, ni ses boutons vers entSel)', !/var pave\b/.test(NU) && !/class="reg-tech-l" onclick="entSel\(/.test(NU) && !/ — jamais des entreprises\.<\/b>/.test(NU));
  vrai('⛔ les espaces techniques ne sont PAS comptés comme entreprises : aucun des groupes de la liste (clientes, à identifier, essais) n\'est « technique », et la liste ne se rend que sur les groupes', (NU.match(/var GROUPES=\[([\s\S]*?)\n  \];/) || ['', ''])[1].match(/\{cle:'/g).length === 3 && !/\{cle:'technique'/.test((NU.match(/var GROUPES=\[([\s\S]*?)\n  \];/) || ['', ''])[1]) && /var liste=groupes\? '<div class="reg">'\+groupes\+'<\/div>'/.test(NU));
  vrai('⛔ aucun identifiant brut ne s\'affiche plus pour un espace technique : le nom, jamais « elan-gestion » (infobulle, fiche, Connexions, Équipes devis, suppression)', !/esc\(CNX\.sel\)\+'<\/div><\/div><\/div>'/.test(NU) && !/title="'\+esc\(x\.t\)\+'"/.test(NU) && !/<span class="mono">'\+esc\(t\)\+'<\/span>/.test(NU) && !/espace '\+esc\(o\.t\)\+'/.test(NU));
  const T = fiche({ t: 'elan-gestion', nom: '', slug: '', email: 'x@y.fr', formule: 'business', origine: 'site', cleEtat: 'propre' }, false, false);
  vrai('(rendu) la fiche d\'un espace technique dit « Espace par défaut — TEAM OP », pas son identifiant (le TEXTE rendu : l\'attribut du bouton garde l\'identifiant du code)', T.includes('Espace par défaut') && !/elan-gestion/.test(T.replace(/<[^>]*>/g, ' '))); }
const secs = [...H.matchAll(/class="sec">([^<]*)</g)].map(m => m[1].replace(/&amp;/g, '&').trim());
v('⛔ la fiche : une carte par sujet, dans cet ordre',
  secs, ['FORMULE ET PAIEMENT', '[acces]', 'ABONNEMENT', '[utilisateurs]', '[espace]', 'MÉTIER', 'CATÉGORIES D’OP GESTION', 'APPLICATIONS ET CHIFFREMENT', '[dossier]', 'CONNEXIONS', 'ACTIVITÉ PAR ONGLET & PROBLÈMES', 'CONTACT', 'DEMANDES DU SITE', '[comptes]', '[supprimer]']);
const nb = (re, h) => (String(h || H).match(re) || []).length;
v('⛔ chaque geste n’a qu’UNE place : lien de connexion, Stripe, métier, abonnement, code promo, écrire',
  [nb(/tourLienEntreprise\(/g), nb(/dashboard\.stripe\.com/g), nb(/tourMetierEnregistrer\(/g), nb(/tourAboEnregistrer\(/g), nb(/tourPromoEntreprise\(/g), nb(/courrierEcrire\(/g)], [1, 1, 1, 1, 1, 1]);
v('⛔ … et les catégories d\'OP GESTION aussi : une seule place pour « Enregistrer » et « Tout rouvrir », juste après le métier, dans la carte « Son espace »',
  [nb(/tourCatsEnregistrer\(/g), nb(/tourCatsRouvrir\(/g), /MÉTIER<\/div>[\s\S]*?CATÉGORIES D’OP GESTION<\/div>[\s\S]*?APPLICATIONS ET CHIFFREMENT/.test(H)], [1, 1, true]);
v('le lien de connexion est dans la carte Accès (avant l’abonnement), « Voir dans Stripe » dans l’abonnement',
  [H.indexOf('tourLienEntreprise(') < H.indexOf('class="sec">ABONNEMENT'), H.indexOf('dashboard.stripe.com') > H.indexOf('class="sec">ABONNEMENT') && H.indexOf('dashboard.stripe.com') < H.indexOf('[utilisateurs]')], [true, true]);
v('⛔ la formule et l’argent : « Formule » n’est dite qu’une fois, OP MESSAGES et le chiffrement ne sont plus sous « Formule et paiement »',
  [nb(/<span class="k">Formule<\/span>/g), H.slice(0, H.indexOf('[acces]')).includes('OP MESSAGES'), H.slice(0, H.indexOf('[acces]')).includes('Chiffrement'), nb(/<span class="k">Chiffrement<\/span>/g), nb(/<span class="k">OP MESSAGES<\/span>/g)], [1, false, false, 1, 1]);
v('l’espace n’est plus répété sous le nom quand la carte Accès le dit',
  H.slice(0, H.indexOf('[acces]')).includes('espace boulmartin-7k2q'), false);
v('…mais il l’est encore si la carte Accès n’existe pas (rien ne se perd)', fiche(O, true, false).includes('espace boulmartin-7k2q'), true);
const appelants = []; CODE.replace(/tourApps\(/g, (m, i) => { const d = CODE.lastIndexOf('\nfunction ', i); appelants.push((/function (\w+)/.exec(CODE.slice(d + 1, d + 60)) || [0, '?'])[1]); return m; });
/* v2.119 (Tour unifiée) : il n'y a plus de console OP MESSAGES — le geste d'ouvrir ou fermer OP MESSAGES est dans la FICHE de l'entreprise (patron seul) et dans les deux
   portes des accès publics ; l'onglet « Depuis OP GESTION » (vueEntreprisesMsg), seconde liste des mêmes entreprises, est supprimé. */
v('OP MESSAGES s’ouvre et se ferme depuis la fiche d’entreprise et les accès publics — et plus depuis une seconde liste (vueEntreprisesMsg n’existe plus)', appelants.filter(n => n !== 'tourApps').sort(), ['accFichePub', 'gestionClientParts', 'pubLigne']);
vrai('…et plus aucun lien de la fiche ne mène à « sa console » (elle n’existe plus)', !/setApp\(|SOUS\.entreprisesmsg/.test(SRC) && !/function vueEntreprisesMsg\(/.test(SRC));
vrai('…le geste de la fiche est réservé au patron (le bouton n’est dessiné que pour lui)', /MYROLE==='patron'&&es\.slug\?' <button type="button" class="btn-fant'\+\(es\.opMessages/.test(CODE));
const sans = fiche(Object.assign({}, O, { email: '' }), false);
v('une entreprise sans compte du site : pas de carte Abonnement ni Contact, mais le lien d’accès, l’espace et l’activité restent',
  [...sans.matchAll(/class="sec">([^<]*)</g)].map(m => m[1].trim()), ['FORMULE ET PAIEMENT', '[acces]', '[utilisateurs]', '[espace]', 'APPLICATIONS ET CHIFFREMENT', '[dossier]', '[comptes]', '[supprimer]']);

/* ── 2. la Surveillance : Incidents | Service, dans les deux consoles ── */
const rv = bloc('renderVue');
vrai('(population) renderVue est trouvée', rv.length > 500);
vrai('UNE Surveillance : deux onglets, « Service » montre vueService (les deux applications), « Incidents » la liste filtrée',
  /TAB==='surveillance'\)\s*v\.innerHTML=sousOnglets\('surveillance',\[\['apps','Incidents'\],\['service','Service'\]\]\)\+\(SOUS\.surveillance==='service'\?vueService\(\):survAvert\(\)\+vueSurveillance\(\)\)/.test(rv));
vrai('OP MESSAGES : « Service » montre l’état du service, la bascule, puis les versions — dans SA colonne de vueService',
  /corpsServiceMsg\(\)\+blocBasculeMsg\(\)\+blocVersionsMsg\(\)/.test(bloc('vueService')));
const vs = bloc('vueSurveillance');
vrai('⛔ la liste des incidents ne porte plus les versions ni la sortie de Firebase', vs.length > 500 && !/blocVersions|blocSortieFirebase/.test(vs));
{ const vsv = bloc('vueService'), colG = (/var cg=([\s\S]*?);\s*var cm=/.exec(vsv) || [0, ''])[1];
  vrai('⛔ « Service » d’OP GESTION : les versions puis la sortie de Firebase, et rien d’OP MESSAGES dans SA colonne',
    /blocVersions\(\)\+blocSortieFirebase\(\)/.test(colG) && !/Msg\(/.test(colG.replace(/srcTitre\('gestion'\)/, '')) && /aGestion\(\)/.test(vsv)); }
vrai('la bascule d’OP MESSAGES n’est plus sur l’accueil (un lien y mène), et elle est réservée au patron',
  bloc('accueilMessages').length > 500 && !/onclick="opmBascule\(\)"/.test(bloc('accueilMessages')) && /onclick="opmBascule\(\)"/.test(bloc('blocBasculeMsg')) && /MYROLE!=='patron'\) return ''/.test(bloc('blocBasculeMsg')));
vrai('les onglets de la Surveillance se masquent dans le dossier d’un problème (comme ceux d’Entreprises dans une fiche)',
  /vue==='surveillance'&&\(INC\.sel\|\|INC\.grp\)\) return ''/.test(bloc('sousOnglets')));
{
  const ctx = { SOUS: { surveillance: 'service' }, setTab: t => { ctx.ouvert = t; }, INC: { sel: null, f: {} } };
  vm.createContext(ctx); vm.runInContext(bloc('allerIncidents') + '\n' + bloc('allerIncident'), ctx);
  ctx.allerIncidents();
  v('⛔ « vers les incidents » ouvre l’onglet Incidents, jamais le dernier onglet vu', [ctx.SOUS.surveillance, ctx.ouvert], ['apps', 'surveillance']);
  ctx.SOUS.surveillance = 'service'; ctx.allerIncident('i1');
  v('…et un incident précis aussi', [ctx.SOUS.surveillance, ctx.INC.sel, ctx.INC.f.statut], ['apps', 'i1', '']);
}
const libres = []; CODE.replace(/setTab\(\\?'surveillance\\?'\)/g, (m, i) => { const ctx = CODE.slice(Math.max(0, i - 70), i); if (!/SOUS\.surveillance=\\?'service\\?';$/.test(ctx) && !/function allerIncidents\(\)\{[^}]*$/.test(ctx)) libres.push(ctx.slice(-40)); return m; });
v('aucun lien « setTab(surveillance) » direct n’échappe à allerIncidents (hors le lien vers l’onglet Service)', libres, []);
console.log('\n════ test-1019 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
