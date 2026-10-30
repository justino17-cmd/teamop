/* ══ test-2810 : LOT 1 DE LA REFONTE DE LA TOUR — (a) LE MENU (21 octobre 2026) ══
   Justin a validé la maquette le 19 octobre (« là c'est parfait ») ; le lot 1 la pose sur la VRAIE Tour, partie par partie, chacune vérifiée
   (« tu fais partie par partie, tu testes, tu vérifies », 20 octobre). Partie (a) : le menu. On EXÉCUTE la vraie table `MENU` et ses lecteurs
   (`vuesDe`, `vuePermise`) tirés de tour.html :
     · les quatre vues neuves du lot (Facturation, Incidents, Contrats, Rapport) sont au menu, marquées « Nouveau », dans leur section ;
     · ⛔ l'argent, les contrats et le rapport des agents sont au PATRON seul ; un collaborateur ne les voit pas ;
     · ⛔ une vue « Nouveau » pas encore faite le DIT (`VUES_BIENTOT`) — aucun chiffre dedans, jamais un exemple pris pour une donnée ;
     · aucune vue d'avant n'a disparu du menu (Agents a changé de section, pas de console).
   v2.119 (Tour unifiée) : Facturation n'est plus une ENTRÉE du menu — c'est le 2ᵉ onglet d'Abonnements (alias `VUE_ALIAS.facturation`, au patron comme avant) ;
   Incidents est rangé dans « À traiter » (Tour). Les trois autres vues neuves restent au menu, dans leur section. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
let ok = 0, ko = 0;
const v = (n, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log((bon ? '  ✓ ' : '  ✗ ') + n + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
console.log('── test-2810 : la Tour, lot 1 (a) — le menu ──');
const T = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
const tranche = (debut, fin) => { const i = T.indexOf(debut), j = T.indexOf(fin, i + debut.length); return i > 0 && j > i ? T.slice(i, j) : ''; };
const MENU = tranche('var MENU=[', '\n];') + '\n];';
const PS = tranche('var PATRON_SEUL=', '\n');
const FN = tranche('function vueAlias(t)', '\n/* À quelle console appartient un tag');
const AL = tranche('var VUE_ALIAS=', '\n');
const VB = tranche('var VUES_BIENTOT={', '\n};') + '\n};';
v('(population) les cinq pièces sont trouvées dans le fichier livré', [MENU.length > 300, PS.length > 20, /function vuesDe/.test(FN), VB.indexOf('var VUES_BIENTOT={') === 0, AL.length > 30], [true, true, true, true, true]);
const ctx = vm.createContext({ MYROLE: 'patron', MYAPPS: ['gestion', 'messages'], SOUS: {} });
vm.runInContext(MENU + '\n' + PS + '\n' + AL + '\n' + FN + '\n' + VB + '\nthis.MENU=MENU;this.PATRON_SEUL=PATRON_SEUL;this.VUES_BIENTOT=VUES_BIENTOT;this.vuesDe=vuesDe;this.vuePermise=vuePermise;this.VUES_PAR_APP=VUES_PAR_APP;this.VUE_ALIAS=VUE_ALIAS;this.vueAlias=vueAlias;this.vues=vues;', ctx);
const { MENU: M } = ctx;
const ou = {}; M.forEach(g => g.vues.forEach(x => { ou[x[0]] = { section: g.section, apps: x[2], nouveau: x[5] === 1 }; }));
const NEUVES = ['incidents', 'contrats', 'rapport'];
v('les trois vues neuves du menu sont au menu, marquées « Nouveau » (la quatrième, Facturation, est l’onglet d’Abonnements)', NEUVES.map(k => !!ou[k] && ou[k].nouveau), [true, true, true]);
v('… chacune dans sa section (Tour — rangée dans « À traiter » —, Juridique, Équipe d’agents)', NEUVES.map(k => ou[k] && ou[k].section), ['Tour', 'Juridique', 'Équipe d’agents']);
v('⛔ Facturation n’est plus une entrée du menu : un lien d’avant (#facturation, la barre du bas) ouvre Abonnements sur son onglet Facturation — au patron seulement',
  [!ou.facturation, JSON.stringify(ctx.VUE_ALIAS.facturation), ctx.vueAlias('facturation'), ctx.SOUS.abonnements], [true, JSON.stringify({ vue: 'abonnements', sous: 'facturation' }), 'abonnements', 'facturation']);
v('Agents rejoint « Équipe d’agents », à côté du Rapport (et reste à la console OP GESTION)', [ou.agents && ou.agents.section, ou.agents && ou.agents.apps], ['Équipe d’agents', 'gestion']);
v('⛔ aucune vue d’avant n’a quitté le menu (hors Facturation, devenue un onglet)', ['accueil', 'demandes', 'comptes', 'entreprises', 'abonnements', 'support', 'surveillance', 'essais', 'equipe', 'journal', 'agents', 'donnees'].filter(k => !ou[k]), []);
v('⛔ seules les vues neuves portent « Nouveau »', Object.keys(ou).filter(k => ou[k].nouveau).sort(), NEUVES.slice().sort());
v('⛔ l’argent, les contrats et le rapport des agents : au patron seul', ['facturation', 'contrats', 'rapport'].map(k => ctx.PATRON_SEUL.includes(k)), [true, true, true]);
ctx.MYROLE = 'collaborateur';
v('⛔ un collaborateur ne les ouvre pas ; il garde les Incidents', ['facturation', 'contrats', 'rapport', 'incidents'].map(k => ctx.vuePermise(k)), [false, false, false, true]);
ctx.SOUS.abonnements = 'abos';
v('⛔ …et l’alias ne lui ouvre PAS Facturation : la clé reste telle quelle, setTab la renvoie à l’accueil', [ctx.vueAlias('facturation'), ctx.SOUS.abonnements], ['facturation', 'abos']);
/* relecture du 22 octobre 2026 : Facturation lit les factures d'OP GESTION — elle n'est donc pas dans la console OP MESSAGES */
v('les vues de chaque console sont DÉDUITES du menu (les neuves y sont ; Facturation à OP GESTION seulement)', [ctx.VUES_PAR_APP.gestion.includes('rapport'), ctx.VUES_PAR_APP.messages.includes('rapport'), ctx.VUES_PAR_APP.messages.includes('facturation'), ctx.VUES_PAR_APP.gestion.includes('abonnements')], [true, false, false, true]);
const VBk = Object.keys(ctx.VUES_BIENTOT);
/* lot 1 (g), 21 octobre 2026 : les quatre vues neuves sont faites — la table est VIDE, et le mécanisme reste pour la prochaine vue annoncée */
v('une vue neuve pas encore faite le dit (VUES_BIENTOT) — et rien d’autre n’y est ; les quatre du lot 1 sont faites, la table est vide', [VBk.every(k => NEUVES.includes(k)), VBk], [true, []]);
v('⛔ aucun chiffre dans une page « en construction » (jamais un exemple pris pour une donnée)', VBk.filter(k => /\d/.test(ctx.VUES_BIENTOT[k].join(' '))), []);
const SANS = T.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
v('le rendu les connaît : une branche pour les vues en construction, une icône et un nom court pour chacune',
  [/else if\(VUES_BIENTOT\[TAB\]\) v\.innerHTML=vueBientot\(TAB\);/.test(SANS), NEUVES.concat(['facturation']).every(k => new RegExp('\\n  ' + k + ":'<path").test(T)), NEUVES.every(k => new RegExp(k + ":'[A-Z]").test(tranche('var BAS_LIB=', '};')))], [true, true, true]);
v('la pastille « Nouveau » est dessinée par le menu (et se tait quand la barre est repliée)', [/\(x\[5\]\?'<span class="nv"/.test(SANS), /body\.barre-repliee \.tab \.nv\{display:none\}/.test(T)], [true, true]);
console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
