/* ══ CLIENTS — LE CHAMP DE RECHERCHE DE LA LISTE NE PORTE PLUS L'IDENTIFIANT DU CHAMP « CLIENT » D'UNE INTERVENTION ══
   Lot i03 (17 octobre 2026), bug r3#8. views.clients écrivait `<input id="cli-search">` dans #content ; la fenêtre
   d'intervention (formIntervention) écrit le sien, `<input id="cli-search">` aussi, dans #overlay (après #content
   dans le document). `getElementById('cli-search')` rend le PREMIER : cliPick() et saveIntervention() lisaient donc
   la recherche de la liste — le nom choisi dans la fenêtre atterrissait dans la liste, « Indique un client » refusait
   un client neuf, et un texte de recherche (« Durand ») créait un client et y rattachait l'intervention (donnée fausse).
   Recensement des lecteurs de l'identifiant (grep) : cliPick, saveIntervention (+ le champ de formIntervention lui-même).
   Ce banc EXÉCUTE la vraie views.clients : l'identifiant du champ de la liste n'est plus celui de la fenêtre, et il
   n'existe qu'UN `id="cli-search"` dans tout le fichier. La preuve au navigateur (liste ouverte PUIS fenêtre par-dessus)
   est la sonde du scratchpad, citée dans le message de commit.                                                    */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('— la population');
const VC = bloc('views.clients=function(){'), RL = bloc('function renderClientsList(');
const AT = ligne('function allTags(){'), TC = ligne('function tagChipsHtml(x){'), CP = ligne('function cliIsPro(c){'), ES = ligne('function emptyState(ico,txt,btn,fn){'),
  ESC = ligne('const esc = s =>'), INI = ligne('const initials = (name,max) =>'), NM = ligne('const norm = s =>'), ETAT = ligne('let cliTagFilter='), ETAT2 = ligne('let cliTypeF='), ETAT3 = ligne('let cliSearch=');
vrai('views.clients et renderClientsList sont trouvées', VC.length > 1500 && RL.length > 800, [VC.length, RL.length]);

function monde() {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, RegExp, Intl, __page: { innerHTML: '' }, __liste: { innerHTML: '' },
    db: { clients: [{ id: 'c1', nom: 'Boulangerie Au Bon Pain', tags: [] }, { id: 'c2', nom: 'Cabinet Martin', tags: [] }, { id: 'c3', nom: 'M. Durand', tags: [] }], interventions: [], devis: [], factures: [] },
    currentUser: { id: 'u1', role: 'admin' } };
  vm.createContext(ctx);
  vm.runInContext(`${ESC.replace('const ', 'var ')}\n${INI.replace('const ', 'var ')}\n${NM.replace('const ', 'var ')}\n${ETAT}\n${ETAT2}\n${ETAT3}\n${AT}\n${TC}\n${CP}\n${ES}
    function $(id){ return id==='content'?__page:(id==='cli-liste'?__liste:{value:'',focus(){},innerHTML:''}); }
    function setHeader(){} function can(){ return true; } function visibleClients(l){ return l; } function save(){} function exportClientsCsv(){}
    function formClient(){} function ficheClient(){} function rechDiffere(f){ f(); } var views={};
    ${RL}\n${VC}`, ctx);
  return ctx;
}

console.log('— le champ de recherche de la liste des clients');
{ const W = monde(); W.views.clients(); const h = W.__page.innerHTML;
  vrai('(population) le champ de recherche est affiché (trois clients)', /<input class="search-inp"/.test(h), h.slice(0, 200));
  vrai('⛔ il ne porte PAS id="cli-search" (celui de la fenêtre d\'intervention)', !/id="cli-search"/.test(h), h.slice(0, 200));
  vrai('il garde un identifiant à lui, et sa frappe filtre toujours la liste', /<input class="search-inp" id="cli-recherche"[^>]*oninput="cliSearch=this\.value;rechDiffere\(renderClientsList\)"/.test(h), h.slice(0, 300)); }

console.log('— dans tout le fichier : UN SEUL id="cli-search", et c\'est celui du formulaire d\'intervention');
{ const occ = []; const re = /id="cli-search"/g; let m; while ((m = re.exec(SRC))) occ.push(m.index);
  vrai('un seul id="cli-search" écrit dans app.html', occ.length === 1, occ.length);
  const ctxe = occ.length ? SRC.slice(occ[0], occ[0] + 400) : '';
  vrai('c\'est le champ « Client » de la fenêtre (cliFilter / cli-id / cli-list autour)', /oninput="cliFilter\(this\.value\)"/.test(ctxe), ctxe.slice(0, 200));
  const lecteurs = [...SRC.matchAll(/getElementById\('cli-search'\)|\$\('cli-search'\)/g)].length;
  vrai('les lecteurs de cet identifiant sont les deux du formulaire (cliPick, saveIntervention)', lecteurs === 2, lecteurs);
  vrai('cliPick lit le champ de la fenêtre', /function cliPick\(id,nom\)\{[^}]*getElementById\('cli-search'\)/.test(SRC));
  vrai('saveIntervention lit le champ de la fenêtre pour créer un client neuf', /if\(!data\.clientId\)\{ const n=\(\(document\.getElementById\('cli-search'\)/.test(SRC)); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
