/* ══ CLIENTS — LE FILTRE D'ÉTIQUETTE ACTIF N'A QU'UNE MARQUE ═════════════════════════════════════════════
   Lot i03 (17 octobre 2026), bug r3#9. Filtrer sur « VIP » affichait « Tous | VIP (actif) | Filtre : VIP ✕ » : la
   puce de l'étiquette est déjà active, et la puce « Filtre : VIP ✕ » (g10, clients#3) la doublait à côté. Le geste
   de retrait que la seconde offrait (lever le filtre) passe désormais par la puce active elle-même, que l'on retouche,
   et par « Tous » : une seule marque du filtre, un geste pour le lever.
   Le banc EXÉCUTE la vraie views.clients (avec allTags / tagChipsHtml / cliIsPro) et rejoue les clics tels que la page
   les écrit (l'attribut onclick, évalué).                                                                       */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 400) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };
const VC = bloc('views.clients=function(){'), RL = bloc('function renderClientsList(');
const AT = ligne('function allTags(){'), TC = ligne('function tagChipsHtml(x){'), CP = ligne('function cliIsPro(c){'), ES = ligne('function emptyState(ico,txt,btn,fn){'),
  ESC = ligne('const esc = s =>'), INI = ligne('const initials = (name,max) =>'), NM = ligne('const norm = s =>'), ETAT = ligne('let cliTagFilter='), ETAT2 = ligne('let cliTypeF='), ETAT3 = ligne('let cliSearch=');
vrai('(population) les pièces sont trouvées', VC.length > 1500 && RL.length > 800 && !!AT && !!TC && !!ESC && !!INI && !!NM && !!ETAT, [VC.length, RL.length]);

function monde(clients, interventions) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, Intl, __page: { innerHTML: '' }, __liste: { innerHTML: '' },
    db: { clients, interventions: interventions || [], devis: [], factures: [] }, currentUser: { id: 'u1', role: 'admin' } };
  vm.createContext(ctx);
  vm.runInContext(`${ESC.replace('const ', 'var ')}\n${INI.replace('const ', 'var ')}\n${NM.replace('const ', 'var ')}\n${ETAT}\n${ETAT2}\n${ETAT3}\n${AT}\n${TC}\n${CP}\nvar boxTxt = function (s) { return s; };\n${ES}
    function $(id){ return id==='content'?__page:(id==='cli-liste'?__liste:{value:'',focus(){},innerHTML:''}); }
    function setHeader(){} function can(){ return true; } function visibleClients(l){ return l; } function save(){} function exportClientsCsv(){}
    function formClient(){} function ficheClient(){} function rechDiffere(f){ f(); } var views={};
    ${RL}\n${VC}`, ctx);
  return ctx;
}
const base = () => [{ id: 'c1', nom: 'Boulangerie Au Bon Pain', tags: ['VIP'] }, { id: 'c2', nom: 'Cabinet Martin', tags: [] }, { id: 'c3', nom: 'M. Durand', tags: [] }];
const lignes = W => (W.__liste.innerHTML.match(/class="tf-rangee"/g) || []).length;
const filtre = W => vm.runInContext('cliTagFilter', W);
// les puces de la barre d'étiquettes : [{ libelle, active, onclick }]
function puces(W) {
  const h = W.__page.innerHTML; // k02/r5#2 : les deux barres portent désormais `filters cli-barre` — on coupe sur le début de la classe, pas sur l'attribut entier
  const barres = h.split('<div class="filters').slice(1);
  return barres.map(b => [...b.matchAll(/<div class="chip ?(active)?" onclick="([^"]*)"[^>]*>([^<]*)<\/div>/g)].map(m => ({ libelle: m[3].trim(), active: !!m[1], onclick: m[2] })));
}
const clic = (W, onclick) => { const W2 = W; vm.runInContext(onclick.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/this\.textContent\.trim\(\)/g, "'VIP'"), W2); };

console.log('— filtre « VIP » actif');
{ const W = monde(base()); vm.runInContext("cliTagFilter='VIP'", W); W.views.clients();
  const barres = puces(W); const bar = barres[barres.length - 1];
  vrai('(population) la barre d\'étiquettes est là, avec « Tous » et « VIP »', bar && bar.some(p => p.libelle === 'Tous') && bar.some(p => p.libelle === 'VIP'), barres);
  vrai('⛔ une seule puce porte le filtre actif (la puce VIP)', bar.filter(p => p.active).map(p => p.libelle).join() === 'VIP', bar);
  vrai('⛔ plus de puce « Filtre : VIP ✕ » à côté de la puce VIP', !/Filtre : /.test(W.__page.innerHTML), W.__page.innerHTML.slice(0, 400));
  vrai('(population) le filtre filtre : une ligne', lignes(W) === 1, lignes(W));
  const vip = bar.find(p => p.libelle === 'VIP');
  clic(W, vip.onclick); W.views.clients();
  vrai('le geste de retrait existe : retoucher la puce VIP active lève le filtre', filtre(W) === '' && lignes(W) === 3, [filtre(W), lignes(W)]);
  vm.runInContext("cliTagFilter='VIP'", W); W.views.clients();
  const tous = puces(W).pop().find(p => p.libelle === 'Tous'); clic(W, tous.onclick); W.views.clients();
  vrai('… et « Tous » aussi', filtre(W) === '' && lignes(W) === 3, [filtre(W), lignes(W)]); }

console.log('— sans filtre : la puce VIP se pose comme avant');
{ const W = monde(base()); W.views.clients();
  const bar = puces(W).pop(); const vip = bar.find(p => p.libelle === 'VIP');
  vrai('« Tous » est actif, VIP ne l\'est pas', bar.filter(p => p.active).map(p => p.libelle).join() === 'Tous', bar);
  clic(W, vip.onclick); W.views.clients();
  vrai('toucher VIP pose le filtre', filtre(W) === 'VIP' && lignes(W) === 1, [filtre(W), lignes(W)]); }

console.log('— étiquette qui n\'existe que sur une intervention : filtre tenu, une marque, un geste');
{ const cl = base(); cl[0].tags = []; const W = monde(cl, [{ id: 'i1', clientId: 'c2', tags: ['Urgent'] }]);
  vm.runInContext("cliTagFilter='Urgent'", W); W.views.clients();
  const bar = puces(W).pop();
  vrai('la puce « Urgent » est active, une seule marque', bar.filter(p => p.active).map(p => p.libelle).join() === 'Urgent' && !/Filtre : /.test(W.__page.innerHTML), bar); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
