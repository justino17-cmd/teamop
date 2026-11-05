/* ══ g10 · clients#8 (2/2) — L'ÉCRAN CLIENTS SE CHERCHE ET SE TRIE, ET UN DOUBLON SE SIGNALE ════════════════
   Mesuré au navigateur : la liste Clients n'avait ni champ de recherche ni tri (ordre d'insertion : « Aaa Premier
   Client » après « M. et Mme Durand », les doublons en fin), et deux « Doublon Test » au même téléphone étaient
   créés sans une question.

   Ce banc EXÉCUTE la vraie `views.clients` + `renderClientsList` (liste, recherche, tri) et la vraie
   `saveClientForm` (avertissement de doublon) dans des bacs à sable. Le champ de recherche est utilisé par son
   `oninput` ÉVALUÉ tel qu'écrit, et l'on vérifie que frapper une lettre ne reconstruit PAS le champ (la liste
   seule se redessine : sinon le clavier se ferme à chaque frappe). L'avertissement est un `confirm` NON
   bloquant : refusé, rien n'est créé et la fenêtre reste ouverte ; accepté, le client est créé.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
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

console.log('\n── 1134 · 0. la population ──');
const VC = bloc('views.clients=function(){'), RL = bloc('function renderClientsList('), SC = bloc('function saveClientForm(e,id){'),
  AIDES = ['function cliAdresseDerive(', 'function cliGeoRequete(', 'function cliLocaliserFond(', 'function cliDoublon('].map(bloc).join('\n'),
  AT = ligne('function allTags(){'), TC = ligne('function tagChipsHtml(x){'), CP = ligne('function cliIsPro(c){'), ES = ligne('function emptyState(ico,txt,btn,fn){'),
  ESC = ligne('const esc = s =>'), INI = ligne('const initials = (name,max) =>')   /* h02 : un 2e paramètre (nombre d'initiales), l'ancre suit la signature */, NM = ligne('const norm = s =>'), NN = ligne('function nomNorm(s){'),
  ETAT = ligne('let cliTagFilter='), ETAT2 = ligne('let cliTypeF='), ETAT3 = ligne('let cliSearch=');
vrai('views.clients et saveClientForm sont trouvées', VC.length > 800 && SC.length > 900 && !!AT && !!TC && !!CP && !!ES && !!NN && !!NM, [VC.length, SC.length]);
vrai('renderClientsList existe (la liste vit à part du champ, comme renderBoxesList)', RL.length > 800, RL.length);
v('⛔ une seule définition de chacune', ['views.clients=function(', 'function renderClientsList(', 'function saveClientForm('].map(n => SRC.split(n).length - 1), [1, 1, 1]);

function monde(clients, { visible = null, confirmer = true } = {}) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, RegExp, Intl,
    __page: { innerHTML: '' }, __liste: { innerHTML: '' }, __sub: '', __confirms: [], __toasts: [], __ferme: 0, __saves: 0, __rep: confirmer, __masque: visible || [],
    db: { clients, interventions: [], devis: [], factures: [] }, currentUser: { id: 'u1', role: 'admin' }, current: 'clients' };
  vm.createContext(ctx);
  vm.runInContext(`${ESC.replace('const ', 'var ')}\n${INI.replace('const ', 'var ')}\n${NM.replace('const ', 'var ')}\n${NN}\n${ETAT}\n${ETAT2}\n${ETAT3}\n${AT}\n${TC}\n${CP}\nvar boxTxt = function (s) { return s; };\n${ES}\n${AIDES}
    function $(id){ return id==='content'?__page:(id==='cli-liste'?__liste:{value:'',focus(){},innerHTML:''}); }
    function setHeader(t,s){ __sub=s; } function can(){ return true; } function visibleClients(l){ return l.filter(c=>!__masque.includes(c.id)); }
    function save(){ __saves++; } function exportClientsCsv(){} function formClient(){} function ficheClient(){} function rechDiffere(f){ f(); }
    function permGarde(){ return true; } function toast(m){ __toasts.push(String(m)); } function closeModal(){ __ferme++; } function go(){} function logEvent(){}
    var __id=0; function uid(){ return 'n'+(++__id); } function FormData(t){ return Object.entries(t); }
    function confirm(m){ __confirms.push(m); return __rep; } function geocode(){ return new Promise(()=>{}); }
    var views={};
    ${RL}\n${VC}\n${SC}`, ctx);
  return ctx;
}
const html = W => W.__page.innerHTML + W.__liste.innerHTML;   // la liste vit dans #cli-liste (ou, avant, dans #content)
const noms = W => [...W.__liste.innerHTML.matchAll(/class="tf-titre"[^>]*>([^<]*)</g)].concat([...W.__page.innerHTML.matchAll(/class="tf-titre"[^>]*>([^<]*)</g)]).map(m => m[1]);
const base = () => [
  { id: 'z', nom: 'Zed Dépannage', tel: '0600000009', tags: [] },
  { id: 'a', nom: 'Aaa Premier Client', ville: 'Niort', codePostal: '79000', tel: '07 77 00 01 11', email: 'zed@exemple.fr', contact: 'Zoé Marchand', tags: [] },
  { id: 'd', nom: 'M. et Mme Durand', ville: 'La Rochelle', tel: '05 46 00 11 22', tags: [] },
  { id: 'e', nom: 'Émile Garage', tags: [] }];

console.log('\n── 1134 · 1. la liste est triée par nom ──');
{ const W = monde(base());
  W.views.clients();
  v('⛔ ordre alphabétique, accents et casse ignorés (plus l’ordre d’insertion)', noms(W), ['Aaa Premier Client', 'Émile Garage', 'M. et Mme Durand', 'Zed Dépannage']); }

console.log('\n── 1134 · 2. un champ de recherche, qui ne se reconstruit pas à la frappe ──');
{ const W = monde(base());
  W.views.clients();
  const champ = (W.__page.innerHTML.match(/<input class="search-inp" id="cli-recherche"[^>]*oninput="([^"]*)"/) || [])[1];
  vrai('⛔ le champ de recherche est là', !!champ, W.__page.innerHTML.slice(0, 200));
  const taper = t => { vm.runInContext(`(function(){ ${champ.replace(/&quot;/g, '"')} }).call({ value: ${JSON.stringify(t)} })`, W); };
  const avant = W.__page.innerHTML;
  if (champ) {
    taper('0777000111');
    v('par téléphone (0777000111, enregistré « 07 77 00 01 11 »)', noms(W), ['Aaa Premier Client']);
    vrai('⛔ frapper ne reconstruit PAS le champ (sinon le clavier se ferme à chaque lettre)', W.__page.innerHTML === avant);
    taper('zed@exemple'); v('par e-mail', noms(W), ['Aaa Premier Client']);
    taper('rochelle'); v('par ville', noms(W), ['M. et Mme Durand']);
    taper('marchand'); v('par contact', noms(W), ['Aaa Premier Client']);
    taper('emile'); v('sans accent ni casse', noms(W), ['Émile Garage']);
    taper('zzzz');
    vrai('aucune correspondance : on le dit, sans proposer d’« Ajouter » (ce n’est pas une base vide)', /Aucun client ne correspond/.test(W.__liste.innerHTML) && !/formClient\(\)/.test(W.__liste.innerHTML), W.__liste.innerHTML);
    const tout = (W.__liste.innerHTML.match(/<button class="btn" onclick="([^"]*)">Tout afficher/) || [])[1];
    vrai('… mais « Tout afficher » lève la recherche', !!tout, W.__liste.innerHTML);
    if (tout) { vm.runInContext(tout.replace(/&quot;/g, '"'), W); }
    v('… et les quatre clients reviennent', noms(W).length, 4); } }
{ const W = monde(base());
  vm.runInContext("cliSearch='durand'", W); W.views.clients();
  vrai('une recherche posée avant de rouvrir l’écran se VOIT dans le champ (jamais un filtre caché)', /id="cli-recherche"[^>]*value="durand"/.test(W.__page.innerHTML), W.__page.innerHTML.slice(0, 300));
  v('… et filtre la liste', noms(W), ['M. et Mme Durand']); }
{ const W = monde([{ id: 'u', nom: 'Seul', tags: [] }]);
  vm.runInContext("cliSearch='xx'", W); W.views.clients();
  vrai('un seul client mais une recherche active : le champ reste visible (rien de caché qui filtre)', /id="cli-recherche"/.test(W.__page.innerHTML)); }
{ const W = monde(base());
  vm.runInContext("cliTypeF='part'", W); W.views.clients();
  vrai('⛔ un filtre « Particuliers » devenu sans objet (aucun particulier, donc plus de barre) ne laisse pas « Aucun client »', noms(W).length === 4 && /./.test(vm.runInContext('cliTypeF', W)) && vm.runInContext('cliTypeF', W) === 'tous', [noms(W).length, vm.runInContext('cliTypeF', W)]); }

console.log('\n── 1134 · 3. un doublon est signalé, sans bloquer ──');
const creer = (W, champs, id) => W.saveClientForm({ preventDefault() {}, target: champs }, id || '');
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '06 00 00 00 00' }]);
  creer(W, { nom: 'Autre Société', tel: '0611111111' });
  v('rien de semblable : aucune question, créé', [W.__confirms.length, W.db.clients.length], [0, 2]); }
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '06 00 00 00 00' }]);
  creer(W, { nom: 'doublon  TEST!', tel: '0611111111' });
  v('⛔ même nom (casse, espaces, ponctuation ignorés) : une question', W.__confirms.length, 1);
  vrai('… qui nomme le client existant et la raison', /Doublon Test/.test(W.__confirms[0] || '') && /même nom/.test(W.__confirms[0] || ''), W.__confirms);
  v('… accepté : le client est créé', W.db.clients.length, 2); }
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '06 00 00 00 00' }], { confirmer: false });
  creer(W, { nom: 'Doublon Test', tel: '0600000000' });
  v('⛔ refusé : rien n’est créé', W.db.clients.length, 1);
  v('… la fenêtre reste ouverte (rien n’est fermé, rien n’est enregistré)', [W.__ferme, W.__saves], [0, 0]); }
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '06 00 00 00 00' }]);
  creer(W, { nom: 'Tout Autre Nom', tel: '0 6.00.00.00.00' });
  v('⛔ même téléphone (espaces et points ignorés), nom différent : une question', W.__confirms.length, 1);
  vrai('… qui parle du téléphone', /téléphone/.test(W.__confirms[0] || ''), W.__confirms); }
{ const W = monde([{ id: 'c1', nom: 'Sans Tel Un' }]);
  creer(W, { nom: 'Sans Tel Deux', tel: '' });
  v('deux clients sans téléphone ne sont pas « le même téléphone »', [W.__confirms.length, W.db.clients.length], [0, 2]); }
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '0600000000' }]);
  creer(W, { nom: 'Doublon Test', tel: '0600000000' }, 'c1');
  v('modifier une fiche (même nom, même téléphone qu’elle-même) ne demande rien', W.__confirms.length, 0); }
{ const W = monde([{ id: 'c1', nom: 'Doublon Test', tel: '0600000000' }], { visible: ['c1'] });
  creer(W, { nom: 'Doublon Test', tel: '0600000000' });
  v('⛔ un client hors de mon périmètre n’est pas révélé par la question', W.__confirms.length, 0); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
