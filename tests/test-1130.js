/* ══ g10 · clients#3 — UN FILTRE D'ÉTIQUETTE NE SURVIT PAS À L'ÉTIQUETTE QU'IL VISE ═══════════════════
   Mesuré au navigateur (bêta, rapport du testeur) : donner « VIP » à UN client, filtrer sur la puce VIP,
   ouvrir le client, retirer VIP. De retour sur Clients : « Aucun client. », plus aucune barre d'étiquettes
   (aucune n'existe), donc plus rien pour lever le filtre ; `cliTagFilter` est un `let` global que seul un
   rechargement remet à zéro. Les sept clients semblaient avoir disparu.

   Ce banc EXÉCUTE la vraie `views.clients` (avec les vraies `allTags`, `tagChipsHtml`, `cliIsPro`) dans un
   bac à sable : il retire l'étiquette par le vrai `toggleTag`, puis rouvre l'écran. Et il rejoue le
   clic de la puce « Filtre : … ✕ » telle que la page l'écrit (l'attribut onclick, évalué), sans la
   reconstruire à la main.                                                                              */
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

console.log('\n── 1130 · 0. la population ──');
const VC = bloc('views.clients=function(){'), AT = ligne('function allTags(){'), TC = ligne('function tagChipsHtml(x){'), CP = ligne('function cliIsPro(c){'),
  TG = ligne('function toggleTag(coll,id,t){'), ES = ligne('function emptyState(ico,txt,btn,fn){'), ESC = ligne('const esc = s =>'), INI = ligne('const initials = (name,max) =>')   /* h02 : un 2e paramètre (nombre d'initiales), l'ancre suit la signature */,
  NM = ligne('const norm = s =>'), ETAT = ligne('let cliTagFilter='), ETAT2 = ligne('let cliTypeF='),
  RL = bloc('function renderClientsList(');   // g10 clients#8 : la liste se redessine à part, dans #cli-liste
v('les pièces sont trouvées', [VC.length > 1500, !!AT, !!TC, !!CP, !!TG, !!ES, !!ESC, !!INI, !!NM, !!ETAT, !!ETAT2], [true, true, true, true, true, true, true, true, true, true, true]);
v('⛔ une seule définition de views.clients et de allTags (une seconde gagnerait en silence)', [SRC.split('views.clients=function(').length - 1, SRC.split('function allTags(').length - 1], [1, 1]);

function monde(clients, interventions) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, __sub: '', __page: { innerHTML: '' }, __liste: { innerHTML: '' },
    db: { clients, interventions: interventions || [], devis: [], factures: [] }, currentUser: { id: 'u1', role: 'admin' },
    __saves: 0 };
  vm.createContext(ctx);
  vm.runInContext(`${ESC.replace('const ', 'var ')}\n${INI.replace('const ', 'var ')}\n${NM.replace('const ', 'var ')}\n${ETAT}\n${ETAT2}\n${AT}\n${TC}\n${CP}\n${TG}\nvar boxTxt = function (s) { return s; };\n${ES}
    function $(id){ return id==='content' ? __page : (id==='cli-liste' ? __liste : { value:'', focus(){}, innerHTML:'' }); }
    function setHeader(t,s){ __sub=s; } function can(){ return true; } function visibleClients(l){ return l; }
    function save(){ __saves++; } function openTagEditor(){}
    function exportClientsCsv(){} function formClient(){} function ficheClient(){}
    function rechDiffere(f){ f(); } var views={};
    ${RL}\n${VC}`, ctx);
  return ctx;
}
const base = () => [
  { id: 'c1', nom: 'Boulangerie Au Bon Pain', ville: 'La Rochelle', tel: '0612345678', tags: ['VIP'] },
  { id: 'c2', nom: 'Cabinet Martin', ville: 'Niort', tags: [] }, { id: 'c3', nom: 'M. Durand', tags: [] },
  { id: 'c4', nom: 'Garage Leroy', tags: [] }, { id: 'c5', nom: 'Hôtel du Port', tags: [] }, { id: 'c6', nom: 'Pharmacie Nord', tags: [] }, { id: 'c7', nom: 'Résidence Les Pins', tags: [] }];
const html = W => W.__page.innerHTML + W.__liste.innerHTML;   // la liste vit dans #cli-liste (avant clients#8 : dans #content)
const lignes = W => (html(W).match(/class="tf-rangee"/g) || []).length;
const evalDansPage = (W, code) => vm.runInContext(code, W);
const filtreLu = W => vm.runInContext('cliTagFilter', W);

console.log('\n── 1130 · 1. le scénario du testeur : retirer la dernière étiquette filtrée ──');
{ const W = monde(base());
  evalDansPage(W, "cliTagFilter='VIP'"); W.views.clients();
  v('filtre posé : une seule ligne (le client VIP)', lignes(W), 1);
  evalDansPage(W, "toggleTag('clients','c1','VIP')");
  v('l’étiquette n’existe plus nulle part (population)', evalDansPage(W, 'allTags()'), []);
  W.views.clients();
  v('⛔ le filtre mort est levé : les sept clients reparaissent', lignes(W), 7);
  v('… et cliTagFilter est remis à zéro', filtreLu(W), '');
  vrai('… et l’écran ne dit pas « Aucun client. »', !/Aucun client\./.test(html(W))); }

console.log('\n── 1130 · 2. un filtre actif se voit toujours, et se lève d’un geste ──');
/* i03/r3#9 : la puce « Filtre : VIP ✕ » DOUBLAIT la puce VIP, déjà active. La garde reste la même — le filtre se voit
   et se lève d'un geste — mais la marque est la puce de l'étiquette elle-même (test-1524 garde l'absence de doublon). */
{ const W = monde(base());
  evalDansPage(W, "cliTagFilter='VIP'"); W.views.clients();
  const h = W.__page.innerHTML;
  const puce = (h.match(/<div class="chip active" onclick="([^"]*)"[^>]*>VIP<\/div>/) || [])[1];
  vrai('la puce VIP est affichée active tant que le filtre est actif', !!puce, h.slice(0, 300));
  vrai('… et c’est la seule marque (pas de « Filtre : »)', !/Filtre : /.test(h), h.slice(0, 300));
  if (puce) { evalDansPage(W, puce.replace(/&quot;/g, '"').replace(/&#39;/g, "'")); }
  v('… son clic (évalué tel qu’écrit) lève le filtre', filtreLu(W), '');
  W.views.clients();
  v('… et la liste est complète', lignes(W), 7);
  evalDansPage(W, "cliTagFilter=''"); W.views.clients();
  vrai('sans filtre, aucune puce active autre que « Tous »', !/Filtre : /.test(W.__page.innerHTML)); }

console.log('\n── 1130 · 3. une étiquette qui n’existe que sur une intervention ne piège pas non plus ──');
{ const cl = base(); cl[0].tags = [];
  const W = monde(cl, [{ id: 'i1', clientId: 'c2', tags: ['Urgent'] }]);
  evalDansPage(W, "cliTagFilter='Urgent'"); W.views.clients();
  const h = W.__page.innerHTML;
  vrai('l’étiquette existe (sur une intervention) : le filtre tient, aucun client n’en porte → liste vide', lignes(W) === 0, lignes(W));
  vrai('… mais la puce active et le « Tous » sont là pour le lever', /<div class="chip active" onclick="cliTagFilter='';views.clients\(\)"[^>]*>Urgent<\/div>/.test(h) && />Tous<\/div>/.test(h), h.slice(0, 400)); }

console.log('\n── 1130 · 4. contre-épreuve : un filtre valable continue de filtrer ──');
{ const cl = base(); cl[1].tags = ['VIP']; const W = monde(cl);
  evalDansPage(W, "cliTagFilter='VIP'"); W.views.clients();
  v('deux clients VIP : deux lignes', lignes(W), 2);
  evalDansPage(W, "toggleTag('clients','c1','VIP')"); W.views.clients();
  v('on en retire un : le filtre reste, une ligne', [lignes(W), filtreLu(W)], [1, 'VIP']); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
