/* ⛔ CE QUE CE FICHIER GARDE — L'ÉCRAN « DEMANDES » DE LA TOUR (v2.87, 17 octobre 2026).

   Justin, ce jour-là : « je veux que tu sépares bien les demandes de OP GESTION et les demandes de OP MESSAGES ».
   Mesuré le même jour par le contrôle client mystère (scripts/controle/) : une demande NEUVE n'apparaissait nulle part
   dans la Tour, et « Accepter la demande » ne vivait que sur la fiche d'une entreprise déjà connue.
   On JOUE les vraies fonctions de l'écran (`demandesListe`, `vueDemandes`, `demCarte`…), extraites de tour.html, sur des
   demandes de toutes les formes : payée, d'OP MESSAGES, déjà traitée, ancienne écrite en simple texte, sans espace et avec.
   Ce qui est gardé :
     · une demande d'OP MESSAGES n'entre jamais dans la console OP GESTION ;
     · « À traiter » et « Traitées » se partagent les demandes, sans perte ni doublon, et le compteur du menu dit le vrai ;
     · « payé » vient de Stripe par l'adresse — et seulement d'un abonnement qui court ;
     · le lien souhaité s'affiche sous la forme de la VRAIE adresse (teamop.fr/e/hygieneexemple), pas tel que tapé ;
     · aucun identifiant d'élément ne porte une adresse en clair ;
     · un refus du serveur se DIT (CLAUDE.md : « un refus ne doit pas ressembler à un vide »). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
const SRC = fs.readFileSync(process.env.TOUR_FICHIER ? path.resolve(process.env.TOUR_FICHIER) : path.join(RACINE, 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const v = (t, a, b) => { const bon = JSON.stringify(a) === JSON.stringify(b); bon ? ok++ : ko++; console.log('  ' + (bon ? '✓' : '✗') + ' ' + t + (bon ? '' : '\n      attendu : ' + JSON.stringify(b) + '\n      obtenu  : ' + JSON.stringify(a))); };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 160) : ''), !!c, true);
function fonction(nom) {
  const m = new RegExp('\\n(?:async )?function ' + nom + '\\(').exec(CODE); if (!m) return '';
  let k = CODE.indexOf('{', CODE.indexOf(')', m.index)), prof = 0, q = null;
  for (; k < CODE.length; k++) { const c = CODE[k];
    if (q) { if (c === '\\') { k++; continue; } if (c === q) q = null; continue; }
    if (c === "'" || c === '"' || c === '`') { q = c; continue; }
    if (c === '/' && CODE[k + 1] === '/') { k = CODE.indexOf('\n', k); continue; }
    if (c === '{') prof++; else if (c === '}') { prof--; if (!prof) return CODE.slice(m.index + 1, k + 1); } }
  return '';
}
const ligne = debut => { const i = CODE.indexOf(debut); return i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n', i)); };
/* esc et jsq portent des guillemets DANS une expression régulière (`/[&<>"']/g`) : le parcours d'accolades les prend pour
   des chaînes. Ces deux-là se lisent par lignes, jusqu'à la première qui finit par `}` — et chaque morceau doit compiler
   seul (sinon on saurait qu'on a coupé au mauvais endroit). */
const parLignes = nom => { const m = new RegExp('\\n(function ' + nom + '\\()').exec(CODE); if (!m) return '';
  const l = CODE.slice(m.index + 1).split('\n'), r = [];
  for (const x of l) { r.push(x); if (/\}\s*$/.test(x)) break; }
  return r.join('\n'); };
const compile = s => { try { new vm.Script(s); return true; } catch (e) { return false; } };

console.log('\n── test-1014 : l\'écran Demandes de la Tour ──');
const NOMS = ['demEstGestion', 'demandesListe', 'demandesATraiter', 'demPaiement', 'demEspace', 'vueDemandes', 'demCarte', 'sigleAdr',
  'teteListe', 'esc', 'jsq', 'nMot', 'sigle', 'espSlugJs', 'tourIdentDefaut', 'acErr', 'acSquel', 'aboPast', 'aboFiable',
  'demCatsHtml', 'demCatsInfo', 'demCatsDepart', 'demCatsCle', 'catExpl'];   // (23 octobre 2026 : la grille des rubriques de la demande)
const COURTES = ['esc', 'jsq'];
const FN = NOMS.map(n => COURTES.includes(n) ? parLignes(n) : fonction(n)), LIGNES = [ligne('var DEM='), ligne('var MET_L=')];
vrai('(population) les fonctions de l\'écran et ce qu\'elles appellent sont trouvées dans tour.html', FN.every(Boolean) && LIGNES.every(Boolean), NOMS.filter((n, i) => !FN[i]).join(', '));
vrai('(population) chaque morceau extrait compile seul', FN.concat(LIGNES).every(compile), NOMS.concat(['DEM', 'MET_L']).filter((n, i) => !compile(FN.concat(LIGNES)[i])).join(', '));

const J = Date.now();
const CLIENTS = [
  { email: 'camille@exemple-1014.fr', entreprise: 'Hygiène Exemple', prenom: 'Camille', nomFam: 'Exemple', tel: '06 12 34 56 78',
    demandes: [{ app: 'OP GESTION', formule: 'Business', users: '3', metier: 'nettoyage', lien: 'Hygiène Exemple', code: '', besoin: 'Suivre nos passages.', date: J - 3600e3 }] },
  { email: 'marc@exemple-1014.fr', entreprise: 'Messagerie Marc', prenom: 'Marc', nomFam: 'Martin',
    demandes: [{ app: 'OP MESSAGES', formule: 'Pro', besoin: 'Discuter avec mon équipe.', date: J - 7200e3 }] },
  { email: 'lea@exemple-1014.fr', entreprise: 'Plomberie Léa', prenom: 'Léa', nomFam: 'Durand',
    demandes: [{ app: 'OP GESTION', formule: 'Pro', users: '1', metier: 'plomberie', date: J - 86400e3 }],
    demandesTraitees: { 0: { par: 'justin', ts: J - 60e3 } } },
  { email: 'ancien@exemple-1014.fr', entreprise: 'Ancienne Demande', prenom: 'Paul', nomFam: 'Ancien',
    demandes: ['Une demande d\'avant, écrite en texte seul'] },
];
const ABOS = [
  { clientEmail: 'camille@exemple-1014.fr', statut: 'actif', formule: 'Business' },
  { clientEmail: 'ancien@exemple-1014.fr', statut: 'annule', formule: 'Pro' },
];
const ENTS = [{ t: 't-lea', slug: 'plomberielea', email: 'lea@exemple-1014.fr', dansAnnuaire: true }];
const bac = (cli, opt) => {
  const o = opt || {};
  const ctx = { console, MET_L: null };
  vm.createContext(ctx);
  vm.runInContext([
    'var CLI=' + JSON.stringify({ list: cli, loaded: o.charge !== false, err: o.err || '' }) + ';',
    'var ABO=' + JSON.stringify({ abos: o.abos || ABOS, loaded: true, configured: true, videFaute: !!o.videFaute }) + ';',
    'var ENT=' + JSON.stringify({ liste: ENTS, loaded: true }) + ';',
    'var SDEM={list:[],loaded:true,err:""};',   /* les demandes du formulaire du site (30 octobre 2026) : l'écran les lit à côté des comptes */
    'function enTete(t,p){ return "<h1>"+t+"</h1>"; }',
    'function videTour(t,s){ return "<div class=\\"vide\\">"+t+" — "+s+"</div>"; }',
    'var REFM={d:null,err:"",enCours:false}; var CAT_L=[]; var CAT_CLES=[];',
    'function fmtJour(ts){ return "le jour"; } function svg(){ return ""; } var INJOIGNABLE="injoignable"; var MYROLE=' + JSON.stringify(o.role || 'patron') + ';',
  ].concat(LIGNES, FN).join('\n'), ctx);
  return ctx;
};

/* 1. le partage des demandes */
const C = bac(CLIENTS);
const tout = C.demandesListe().map(x => x.c.email + '#' + x.i + (x.traitee ? '/traitée' : ''));
vrai('(population) quatre comptes du site, cinq formes de demande lues', CLIENTS.length === 4 && tout.length >= 3, tout.join(' '));
v('une demande d\'OP MESSAGES n\'entre jamais dans la console OP GESTION', tout.filter(x => /marc@/.test(x)), []);
v('« À traiter » : la demande payée et l\'ancienne en texte seul, la plus récente d\'abord', C.demandesATraiter().map(x => x.c.email), ['camille@exemple-1014.fr', 'ancien@exemple-1014.fr']);
v('« Traitées » : celle que la Tour a déjà traitée', C.demandesListe().filter(x => x.traitee).map(x => x.c.email), ['lea@exemple-1014.fr']);
v('rien n\'est perdu ni compté deux fois (à traiter + traitées = toutes)', C.demandesATraiter().length + C.demandesListe().filter(x => x.traitee).length, C.demandesListe().length);

/* 2. ce que l'écran montre */
const html = C.vueDemandes();
const cartes = html.split('class="carte p24 dem-carte"').length - 1;
v('l\'écran « À traiter » montre deux cartes', cartes, 2);
vrai('la carte de Camille dit « payé » (Stripe, par son adresse, abonnement qui court)', /camille@exemple-1014\.fr[\s\S]*?/.test(html) && /💳 payé · Business/.test(html.slice(0, html.indexOf('ancien@'))));
vrai('l\'ancienne demande ne dit PAS « payé » (son abonnement est annulé)', !/💳 payé/.test(html.slice(html.indexOf('Ancienne Demande'))));
vrai('…elle dit « abonnement annulé », dans les mots de l\'écran Abonnements (pas le code « annule » de Stripe)', /💳 abonnement annulé/.test(html.slice(html.indexOf('Ancienne Demande'))) && !/💳 annule\b/.test(html));
vrai('le lien souhaité s\'écrit sous sa VRAIE adresse (teamop.fr/e/hygieneexemple), et dit ce qui a été tapé', /teamop\.fr\/e\/hygieneexemple<\/span> <span class="g">\(tapé « Hygiène Exemple »\)/.test(html));
v('deux gestes « Accepter » (un par carte)', (html.match(/Accepter et ouvrir l’espace/g) || []).length, 2);
/* 23 octobre 2026 — la grille des rubriques de la demande (pré-cochée, expliquée) vit dans la carte À TRAITER du patron, et nulle part ailleurs */
v('⛔ chaque carte à traiter porte sa grille « RUBRIQUES D’OP GESTION » (patron) — deux cartes, deux grilles', (html.match(/class="dem-cats"/g) || []).length, 2);
v('   un collaborateur (qui ne peut pas ouvrir l\'espace) n\'a pas la grille', (bac(CLIENTS, { role: 'collaborateur' }).vueDemandes().match(/class="dem-cats"/g) || []).length, 0);
v('   une demande TRAITÉE n\'en a pas non plus', (bac(CLIENTS).vueDemandes.call ? (() => { const T = bac(CLIENTS); T.DEM.vue = 'traitees'; return (T.vueDemandes().match(/class="dem-cats"/g) || []).length; })() : -1), 0);
vrai('l\'identifiant de départ est prérempli du prénom (camille)', /value="camille"/.test(html));
v('⛔ aucun identifiant d\'élément ne porte une adresse en clair', (html.match(/id="[^"]*@[^"]*"/g) || []), []);
vrai('aucune demande d\'OP MESSAGES à l\'écran', !/Messagerie Marc/.test(html));

/* 3. les traitées, les refus, l'attente */
C.DEM.vue = 'traitees';
const htmlT = C.vueDemandes();
vrai('« Traitées » : la carte de Léa, son espace déjà ouvert, et « Remettre à traiter »', /Plomberie Léa/.test(htmlT) && /déjà ouvert : <span class="mono">plomberielea/.test(htmlT) && /Remettre à traiter/.test(htmlT) && !/Accepter et ouvrir/.test(htmlT));
const E = bac(CLIENTS, { err: 'Serveur injoignable' });
vrai('un refus du serveur se DIT (pas « aucune demande »)', /Les demandes[^<]* ne répondent pas/.test(E.vueDemandes()) && !/Aucune demande/.test(E.vueDemandes()));
const A = bac(CLIENTS, { charge: false });
vrai('pendant le chargement : un squelette, pas « aucune demande »', /ac-squel/.test(A.vueDemandes()) && !/Aucune demande/.test(A.vueDemandes()));
const V = bac([]);
vrai('sans aucune demande : l\'écran le dit, et dit d\'où elles viendront', /Aucune demande à traiter/.test(V.vueDemandes()));

const K = bac(CLIENTS, { role: 'collaborateur' });
const htmlK = K.vueDemandes();
vrai('⛔ un collaborateur ne se voit pas offrir « Accepter » (le serveur le réserve au patron) — et on le lui dit', !/Accepter et ouvrir/.test(htmlK) && /réservé au patron/.test(htmlK) && /Classer sans suite/.test(htmlK));
vrai('(population) Stripe lu et aucun abonnement : « pas encore payé »', /pas encore payé/.test(bac(CLIENTS, { abos: [] }).vueDemandes()));
const S = bac(CLIENTS, { abos: [], videFaute: true });
vrai('⛔ Stripe qui ne répond pas : jamais « pas encore payé » (un vide de panne n\'est pas un vide)', !/pas encore payé/.test(S.vueDemandes()) && /Stripe ne répond pas/.test(S.vueDemandes()));

/* 4. le câblage : le menu, le rendu, le compteur, l'accueil */
/* v2.119 : « Demandes » est une vue d'OP GESTION rangée dans le groupe « À traiter » (Courrier · Demandes · Incidents) ; son compteur s'ajoute à celui du Courrier (`bdg-att`) */
vrai('« Demandes » est au menu d\'OP GESTION, dans le groupe « À traiter » dont le compteur additionne les demandes et le courrier', /\['demandes','Demandes','gestion','','support'\]/.test(CODE) && /\['support','Courrier','gestion','bdg-att'\]/.test(CODE) && /id==='bdg-supp'\|\|id==='bdg-dem'\)\{ id='bdg-att'/.test(CODE));
vrai('renderVue dessine l\'écran Demandes, sous la rangée du groupe', /TAB==='demandes'\) v\.innerHTML=groupeOnglets\('demandes'\)\+vueDemandes\(\)(\+demComptesHtml\(\))?;/.test(fonction('renderVue')));
vrai('le compteur du menu suit les demandes à traiter quand les comptes du site arrivent', /setBdg\('bdg-dem',(demandesATraiter\(\)\.length|attendDemandes\(\))\)/.test(fonction('chargerClients')));
vrai('l\'accueil (son groupe OP GESTION) met les demandes à traiter en tête de ce qui attend', /demandesATraiter\(\)/.test(fonction('accueilGestion')) && /titre:'Demandes à traiter'/.test(fonction('accueilGestion')));
vrai('accepter depuis la carte passe l\'identifiant ET la demande touchée à tourAccepterDemande (pas de fenêtre du navigateur)', /tourAccepterDemande\(email,nom,ident,i,cats\)/.test(fonction('demAccepter')) && /identVoulu!=null\?identVoulu:prompt\(/.test(fonction('tourAccepterDemande')));

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
