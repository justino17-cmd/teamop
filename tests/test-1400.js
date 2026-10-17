/* ══ h01 · « REPRENDRE » RESTITUE CE QUE LA FENÊTRE DESSINE APRÈS SON OUVERTURE (robustesse#4 et #5) ══════════════════
   Le multitâche gardait le balisage passé à openModal (`_multiHtml`, pris AVANT les rendus qui suivent l'ouverture) et les
   valeurs des input/select/textarea. Il ne gardait NI l'état JavaScript que le formulaire dessine ensuite (les lignes d'un
   devis, les nuisibles d'une intervention, les fournisseurs d'un produit…), NI la classe `.active` des puces. Mesuré au
   navigateur (beta.html, 17 octobre 2026) :
     · « Reprendre » un devis : la section Lignes revenait VIDE (aucun champ, aucun bouton « ＋ Ligne ») ; après un rechargement,
       total 0,00 € et le devis s'enregistrait VIDE, sans un mot ;
     · une intervention : 2 techniciens cochés → 0 après la reprise, `cli-id` vidé (le champ client rejoué par un événement
       `input` appelle `cliFilter`, qui vide le champ caché que la reprise venait de poser) ;
     · un client : champ caché `typeClient` = particulier, puce active = professionnel.

   Ce banc EXÉCUTE les vraies `multiCapturer`, `multiReprendre`, le registre `MULTI_MODELES`, `renderLignes`, `ligTot` et
   `cliFilter` d'app.html contre un DOM minimal (pas de jsdom : les suites de ce dépôt n'installent rien). Un aller-retour
   COMPLET : capture → localStorage → NOUVEAU monde (aucune variable globale du précédent : c'est le rechargement de la page)
   → reprise. Le geste au doigt, sur le vrai navigateur : scratchpad/gestion/correctifs/h01/sonde-h01.js.            */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
let ok = 0, ko = 0;
const CLE = 'elan_multi_u1';   // STORE_KEY « elan_gestion_v2 » → « elan_ » + « multi_ » + identifiant du compte
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);

/* ── extraction : du TEXTE BRUT (une ancre est un commentaire : on découpe d'abord, on ne nettoie rien) ── */
function bloc(debut) {
  const i = BRUT.indexOf(debut); if (i < 0) return '';
  let j = BRUT.indexOf('{', i), p = 0;
  for (let k = j; k < BRUT.length; k++) { const c = BRUT[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return BRUT.slice(i, k + 1); } }
  return '';
}
const iMulti = BRUT.indexOf('const MULTI_VIE_MS'), jMulti = BRUT.indexOf('/* La barre de reprise');
const MULTI = iMulti > 0 && jMulti > iMulti ? BRUT.slice(iMulti, jMulti) : '';
const PARTS = {
  multi: MULTI,
  openModal: bloc('function openModal(html,taille){'),
  renderLignes: bloc('function renderLignes(){'),
  ligTot: bloc('function ligTot(){'),
  cliFilter: bloc('function cliFilter(q){'),
  esc: (BRUT.match(/^const esc = .*$/m) || [''])[0],
};
console.log('\n── 1400 · 0. la population ──');
v('les pièces réelles sont trouvées', Object.keys(PARTS).map(k => PARTS[k].length > 40), Object.keys(PARTS).map(() => true));
/* ⛔ un conteneur renommé dans le balisage laisserait le registre muet, sans erreur : chaque id existe UNE fois dans app.html,
   et chaque variable que le registre lit est déclarée (une seule fois) */
['lignes-box', 'int-nuis', 'int-meth', 'prod-fours', 'dem-lignes', 'bon-lignes', 'bon-livraison', 'dur-chips'].forEach(id =>
  v('   le conteneur #' + id + ' existe une fois dans le balisage', BRUT.split('id="' + id + '"').length - 1, 1));
['formLignes', 'intNuis', 'intMeth', 'intTrait', 'prodFours', 'demLignes', 'bonLignes', '_bonEditId', 'bonSites'].forEach(n =>
  vrai('   la variable ' + n + ' est déclarée', new RegExp('\\b(let|var|const)\\s+(?:[\\w$]+\\s*=\\s*[^;]*?[,;]\\s*)*?' + n.replace('$', '\\$') + '\\s*=').test(BRUT) || new RegExp('(let|var)\\s[^;\\n]*\\b' + n + '\\s*=').test(BRUT)));
['renderLignes', 'renderIntNuis', 'renderIntMeth', 'renderProdFours', 'renderDemLignes', 'renderBonLignes', 'renderBonSites', 'intDureePose'].forEach(n =>
  v('   la fonction ' + n + ' existe, une seule fois', BRUT.split('function ' + n + '(').length - 1, 1));
vrai('le registre est trouvé et porte les sept conteneurs de modèle + les puces de durée',
  ['lignes-box', 'int-nuis', 'int-meth', 'prod-fours', 'dem-lignes', 'bon-lignes', 'bon-livraison', 'dur-chips'].every(id => MULTI.indexOf("id: '" + id + "'") > 0));

/* ── un DOM minimal : assez pour que les vraies fonctions tournent, pas plus ── */
const VIDES = new Set(['input', 'br', 'img', 'hr', 'meta']);
const dec = s => String(s).replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
class El {
  constructor(tag, attrs) {
    this.tagName = tag.toUpperCase(); this.attrs = attrs || {}; this.children = []; this.parent = null; this._txt = ''; this.style = {};
    this.classes = new Set(String(this.attrs.class || '').split(/\s+/).filter(Boolean));
    this.dataset = {}; Object.keys(this.attrs).forEach(k => { if (k.startsWith('data-')) this.dataset[k.slice(5).replace(/-(\w)/g, (_, c) => c.toUpperCase())] = this.attrs[k]; });
    this._value = this.attrs.value !== undefined ? this.attrs.value : ''; this._fixe = undefined; this.checked = 'checked' in this.attrs;
    const self = this;
    this.classList = { contains: c => self.classes.has(c), add: (...a) => a.forEach(c => self.classes.add(c)), remove: (...a) => a.forEach(c => self.classes.delete(c)),
      toggle: (c, f) => { const on = f === undefined ? !self.classes.has(c) : !!f; on ? self.classes.add(c) : self.classes.delete(c); return on; } };
    this.scrollTop = 0; this.className = '';
  }
  get id() { return this.attrs.id || ''; }
  get name() { return this.attrs.name || ''; }
  get type() { return this.tagName === 'INPUT' ? (this.attrs.type || 'text') : this.tagName === 'SELECT' ? 'select-one' : this.tagName === 'TEXTAREA' ? 'textarea' : ''; }
  get value() {
    if (this._fixe !== undefined) return this._fixe;
    if (this.tagName === 'SELECT') { const o = this.querySelectorAll('option'); const s = o.find(x => 'selected' in x.attrs) || o[0]; return s ? (s.attrs.value !== undefined ? s.attrs.value : s.textContent) : ''; }
    if (this.tagName === 'TEXTAREA') return this.textContent;
    return this._value;
  }
  set value(x) { this._fixe = String(x); this._value = String(x); }
  getAttribute(n) { return this.attrs[n] !== undefined ? this.attrs[n] : null; }
  get textContent() { return this._txt + this.children.map(c => c.textContent).join(''); }
  set textContent(t) { this.children = []; this._txt = String(t); }
  set innerHTML(h) { this.children = []; this._txt = ''; analyser(h, this); }
  get innerHTML() { return this._brut || ''; }
  get firstElementChild() { return this.children[0] || null; }
  closest(sel) { for (let e = this; e; e = e.parent) if (correspond(e, sel)) return e; return null; }
  querySelectorAll(sel) { const r = []; const dfs = e => e.children.forEach(c => { if (correspondChaine(c, sel)) r.push(c); dfs(c); }); dfs(this); return r; }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
  remove() { if (this.parent) this.parent.children = this.parent.children.filter(c => c !== this); }
  appendChild(c) { c.parent = this; this.children.push(c); return c; }
  insertBefore(c) { c.parent = this; this.children.unshift(c); return c; }
  dispatchEvent(ev) { const code = this.attrs['on' + ev.type]; if (code) this._ctx.__exec(code, this, ev); return true; }
}
function correspond(e, sel) {   // sélecteur composé simple : tag #id .classe [attr="v"]
  sel = sel.trim(); if (!sel) return false;
  const re = /^([a-zA-Z][\w-]*)?|#([\w-]+)|\.([\w-]+)|\[([\w-]+)(?:([\^*]?=)"?([^"\]]*)"?)?\]/g; let m, ok2 = true, reste = sel, n = 0;
  while (reste) {
    const mm = /^([a-zA-Z][\w-]*)|^#([\w-]+)|^\.([\w-]+)|^\[([\w-]+)(?:(=)"?([^"\]]*)"?)?\]/.exec(reste); if (!mm) return false;
    if (mm[1] && e.tagName.toLowerCase() !== mm[1].toLowerCase()) ok2 = false;
    if (mm[2] && e.id !== mm[2]) ok2 = false;
    if (mm[3] && !e.classes.has(mm[3])) ok2 = false;
    if (mm[4]) { const val = mm[4] === 'class' ? [...e.classes].join(' ') : (e.attrs[mm[4]]); if (mm[5] ? val !== mm[6] : val === undefined) ok2 = false; }
    reste = reste.slice(mm[0].length); if (++n > 20) return false;
  }
  return ok2;
}
function correspondChaine(e, sel) {   // « a, b » et « ancêtre descendant »
  return sel.split(',').some(alt => {
    const chaine = alt.trim().split(/\s+/); if (!correspond(e, chaine[chaine.length - 1])) return false;
    let courant = e.parent;
    for (let i = chaine.length - 2; i >= 0; i--) { while (courant && !correspond(courant, chaine[i])) courant = courant.parent; if (!courant) return false; courant = courant.parent; }
    return true;
  });
}
function analyser(html, racine) {
  const re = /<!--[\s\S]*?-->|<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^'">])*)>|([^<]+)/g; let m; const pile = [racine];
  while ((m = re.exec(html))) {
    const haut = pile[pile.length - 1];
    if (m[4] !== undefined) { if (m[4].trim()) { const t = new El('#texte', {}); t._txt = dec(m[4]); t.parent = haut; haut.children.push(t); } continue; }
    if (!m[2]) continue;
    const tag = m[2].toLowerCase();
    if (m[1]) { for (let i = pile.length - 1; i > 0; i--) if (pile[i].tagName.toLowerCase() === tag) { pile.length = i; break; } continue; }
    const attrs = {}; String(m[3]).replace(/\/\s*$/, '').replace(/([\w:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g, (_, k, a, b, c) => { attrs[k] = dec(a !== undefined ? a : b !== undefined ? b : c !== undefined ? c : ''); return ''; });
    const e = new El(tag, attrs); e._ctx = racine._ctx; e.parent = haut; haut.children.push(e);
    if (!VIDES.has(tag) && !/\/\s*$/.test(m[3])) pile.push(e);
  }
  (function propager(e) { e.children.forEach(c => { c._ctx = racine._ctx; propager(c); }); })(racine);
}

const CADRE = '<div id="overlay" class="overlay"><div id="modal" class="modal"></div></div><div id="content"></div>';
/* Un « monde » = une page chargée. Le stockage (localStorage) est PASSÉ de l'un à l'autre ; rien d'autre : c'est le rechargement. */
function monde(stockage) {
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, parseInt, parseFloat, isNaN, RegExp,
    __toasts: [], __rendus: [], localStorage: { getItem: k => stockage.has(k) ? stockage.get(k) : null, setItem: (k, x) => stockage.set(k, String(x)) },
    window: { scrollY: 0, scrollTo() {} }, CSS: { escape: s => String(s).replace(/[^\w-]/g, '\\$&') } };
  ctx.Event = class { constructor(type, o) { this.type = type; this.bubbles = !!(o && o.bubbles); } };
  const racine = new El('#racine', {}); racine._ctx = ctx; racine.innerHTML = CADRE;
  const trouve = id => { const f = e => { for (const c of e.children) { if (c.id === id) return c; const r = f(c); if (r) return r; } return null; }; return f(racine); };
  ctx.document = { getElementById: trouve, querySelectorAll: s => racine.querySelectorAll(s), querySelector: s => racine.querySelector(s) };
  vm.createContext(ctx);
  ctx.__exec = (code, el, ev) => vm.runInContext('(function(event){ ' + code + '\n})', ctx).call(el, ev);
  vm.runInContext(`
    var STORE_KEY='elan_gestion_v2', currentUser={id:'u1'}, current='devis', _modalForcee=false;
    var $=id=>document.getElementById(id);
    var db={clients:[{id:'c1',nom:'Boulangerie'},{id:'c2',nom:'Bar'}]};
    var formLignes=[], intNuis=new Set(), intMeth=new Set(), intTrait={}, prodFours=new Set(), demLignes=[], bonLignes=[], _bonEditId='', bonSites=[];
    function toast(m){ __toasts.push(String(m)); } function kpiTailler(){} function setTimeout(){} function clearTimeout(){}
    var window2=window;
    function clientsProposes(){ return db.clients; } function canCat(){ return false; }
    const ligHT=l=>l.reduce((s,x)=>s+(Number(x.qte)||0)*(Number(x.pu)||0),0);
    const eur=n=>(Number(n)||0).toFixed(2).replace('.',',')+' €';
    ${PARTS.esc}
    ${PARTS.multi}
    ${PARTS.openModal}
    ${PARTS.renderLignes}
    ${PARTS.ligTot}
    ${PARTS.cliFilter}
    function renderIntNuis(){ __rendus.push(['int-nuis',[...intNuis],JSON.stringify(intTrait)]); const e=$('int-nuis'); if(e) e.textContent=[...intNuis].join(','); }
    function renderIntMeth(){ __rendus.push(['int-meth',[...intMeth]]); const e=$('int-meth'); if(e) e.textContent=[...intMeth].join(','); }
    function renderProdFours(){ __rendus.push(['prod-fours',[...prodFours]]); const e=$('prod-fours'); if(e) e.textContent=[...prodFours].join(','); }
    function renderDemLignes(){ __rendus.push(['dem-lignes',JSON.stringify(demLignes)]); const e=$('dem-lignes'); if(e) e.textContent=JSON.stringify(demLignes); }
    function renderBonLignes(){ __rendus.push(['bon-lignes',JSON.stringify(bonLignes),_bonEditId]); const e=$('bon-lignes'); if(e) e.textContent=bonLignes.length+' article(s)'; }
    function renderBonSites(){ __rendus.push(['bon-livraison',JSON.stringify(bonSites)]); const e=$('bon-livraison'); if(e) e.textContent=bonSites.map(s=>s.nom).join('|'); }
    function intFinDit(){ const h=document.querySelector('#modal [name="heure"]'), z=document.getElementById('fin-dit'); __rendus.push(['fin',h&&h.value]); if(z&&h) z.textContent='Fin prévue : '+h.value; }
    function intDureePose(n){ __rendus.push(['duree',n]); const f=document.querySelector('#modal [name="duree"]'); if(f) f.value=n; }
  `, ctx);
  return ctx;
}
const ex = (W, code) => vm.runInContext(code, W);
const champ = (W, sel) => W.document.querySelector(sel);

/* ═══════════════ 1. LE DEVIS : les lignes reviennent, même après un rechargement ═══════════════ */
console.log('\n── 1400 · 1. un devis en cours (formDoc simplifié, vraies renderLignes / ligTot) ──');
const FORM_DEVIS = `<div class="modal-head"><h3>Nouveau devis</h3></div><form>
  <input name="num" value="DV-1"><select name="clientId" required><option value="">—</option><option value="c1">Boulangerie</option><option value="c2" selected>Bar</option></select>
  <div class="field"><label>Lignes</label><div id="lignes-box"></div></div><div id="lig-tot"></div>
  <input id="f-tva" type="number" name="tva" value="20" oninput="ligTot()"><input name="notes" value="">
  <textarea name="desc"></textarea></form>`;
const stock1 = new Map();
const W1 = monde(stock1);
ex(W1, `formLignes=[{designation:'Dératisation locaux',qte:1,pu:10},{designation:'Pose',qte:2,pu:150.5}]; openModal(${JSON.stringify(FORM_DEVIS)}); renderLignes();`);
const ligne0 = champ(W1, '#lignes-box input');
vrai('avant : la section Lignes porte ses 6 champs et le bouton « ＋ Ligne »', W1.document.querySelectorAll('#lignes-box input').length === 6 && W1.document.querySelectorAll('#lignes-box button').length === 3, W1.document.querySelectorAll('#lignes-box input').length);
champ(W1, '[name="notes"]').value = 'À rappeler'; champ(W1, '#f-tva').value = '5.5'; champ(W1, '[name="desc"]').value = 'Texte long';
ex(W1, 'multiCapturer()');
const cap1 = JSON.parse(stock1.get(CLE));
vrai('la capture existe pour la rubrique', !!(cap1 && cap1.devis && cap1.devis.html));
vrai('⛔ elle porte le MODÈLE des lignes (2 lignes)', cap1.devis && cap1.devis.modeles && Array.isArray(cap1.devis.modeles['lignes-box']) && cap1.devis.modeles['lignes-box'].length === 2, cap1.devis && cap1.devis.modeles);
vrai('⛔ et AUCUN champ de ligne n\'est capturé comme champ nu (leur rang n\'existe pas dans le balisage neuf)',
  cap1.devis.champs.every(c => c.n || c.id) && cap1.devis.champs.length === 5, cap1.devis.champs.map(c => c.n || c.id));
/* rechargement : monde NEUF, mêmes lignes de stockage, aucune variable globale du précédent */
const W2 = monde(stock1);
v('rechargement : formLignes est vide (aucune mémoire de la page précédente)', ex(W2, 'formLignes'), []);
ex(W2, "current='devis'; multiReprendre('devis');");
v('⛔ formLignes est restitué APRÈS rechargement', ex(W2, 'formLignes'), [{ designation: 'Dératisation locaux', qte: 1, pu: 10 }, { designation: 'Pose', qte: 2, pu: 150.5 }]);
vrai('⛔ la section Lignes revient avec ses 6 champs et ses boutons', W2.document.querySelectorAll('#lignes-box input').length === 6 && W2.document.querySelectorAll('#lignes-box button').length === 3, W2.document.querySelectorAll('#lignes-box input').length);
const tot = champ(W2, '#lig-tot').textContent;
vrai('⛔ le total est recalculé : 311 € HT (et pas 0,00 €)', /311,00/.test(tot) && !/Total HT : 0,00/.test(tot), tot);
vrai('   la TVA du champ est celle de la saisie (5.5)', /TVA 5.5%/.test(tot), tot);
v('   les champs ordinaires sont restitués (notes, description, client, tva)', [champ(W2, '[name="notes"]').value, champ(W2, '[name="desc"]').value, champ(W2, '[name="clientId"]').value, champ(W2, '#f-tva').value], ['À rappeler', 'Texte long', 'c2', '5.5']);
vrai('   la reprise a oublié le brouillon (pas de doublon)', !JSON.parse(stock1.get(CLE) || '{}').devis);
/* une ligne éditée APRÈS la reprise alimente bien le modèle restitué (les gestionnaires `oninput` écrivent dans formLignes) */
const l0 = champ(W2, '#lignes-box input'); if (l0) { l0.value = 'Dératisation 2'; l0.dispatchEvent(new W2.Event('input')); }
v('   et le modèle restitué est VIVANT : modifier une ligne le modifie', ex(W2, '(formLignes[0] || {}).designation'), 'Dératisation 2');

/* ═══════════════ 2. L'INTERVENTION : techniciens, client, nuisibles, méthodes, durée ═══════════════ */
console.log('\n── 1400 · 2. une intervention en cours (vrai cliFilter : il vide cli-id à l\'événement input) ──');
const FORM_INTERV = `<div class="modal-head"><h3>Intervention</h3></div><form id="intform">
  <input type="hidden" name="clientId" id="cli-id" value="">
  <input id="cli-search" oninput="cliFilter(this.value)"><div id="cli-list" class="soc-list" style="display:none"></div>
  <input name="titre" value="">
  <span class="chip int-tech" data-tid="t1" onclick="this.classList.toggle('active')">Ana</span>
  <span class="chip int-tech" data-tid="t2" onclick="this.classList.toggle('active')">Ben</span>
  <span class="chip int-tech" data-tid="t3" onclick="this.classList.toggle('active')">Carla</span>
  <span class="chip active" onclick="toggleUnSet('x')">Piloté par un Set</span>
  <input type="hidden" name="heure" value="09:00"><span id="deb-aff">09:00</span><div id="fin-dit"></div>
  <input type="hidden" name="duree" value="60"><div id="dur-chips"><div class="chip active" onclick="intDureePose(60)">1 h</div></div>
  <div id="int-nuis"></div><div id="int-meth"></div></form>`;
const stock2 = new Map();
const W3 = monde(stock2);
ex(W3, `openModal(${JSON.stringify(FORM_INTERV)}); intNuis=new Set(['Rats']); intTrait={Rats:{_infest:'Moyen'}}; intMeth=new Set(['Appâtage']); renderIntNuis(); renderIntMeth();`);
champ(W3, '[name="titre"]').value = 'Cuisine'; champ(W3, '#cli-search').value = 'Boulangerie'; champ(W3, '#cli-id').value = 'c1';
W3.document.querySelectorAll('.int-tech').forEach(x => { if (x.dataset.tid !== 't1') x.classList.add('active'); });
champ(W3, '[name="duree"]').value = '90';
/* la roue d'heure écrit le champ caché ET l'affichage « Début » (ouvreRouesInt) : ici 14:00, l'ouverture disait 09:00 */
champ(W3, '[name="heure"]').value = '14:00'; champ(W3, '#deb-aff').textContent = '14:00';
ex(W3, 'multiCapturer()');
const puces2 = (JSON.parse(stock2.get(CLE)).devis || {}).puces || [];
v('⛔ seules les puces dont le clic ne fait que basculer une classe sont gardées (3 techniciens) — ni celle d\'un Set, ni celles de la durée (leur modèle)', puces2.length, 3);
const W4 = monde(stock2);
ex(W4, "current='devis'; multiReprendre('devis');");
v('⛔ cli-id restitué (le champ caché est rejoué APRÈS l\'événement input qui le vide)', champ(W4, '#cli-id').value, 'c1');
v('   le texte du champ client aussi', champ(W4, '#cli-search').value, 'Boulangerie');
v('⛔ les techniciens cochés restent cochés (t2, t3) et le décoché reste décoché', W4.document.querySelectorAll('.int-tech.active').map(x => x.dataset.tid), ['t2', 't3']);
v('⛔ nuisibles + traitement restitués après rechargement', ex(W4, '[[...intNuis], intTrait]'), [['Rats'], { Rats: { _infest: 'Moyen' } }]);
v('⛔ méthodes restituées', ex(W4, '[...intMeth]'), ['Appâtage']);
vrai('   et redessinés (les vrais rendus ont été appelés, dans les conteneurs)', champ(W4, '#int-nuis').textContent === 'Rats' && champ(W4, '#int-meth').textContent === 'Appâtage');
v('⛔ la durée 90 est restituée ET ses puces redessinées (intDureePose(90))', [champ(W4, '[name="duree"]').value, W4.__rendus.filter(r => r[0] === 'duree').map(r => r[1])], ['90', [90]]);
v('⛔ l\'affichage « Début » suit l\'heure restituée (14:00, pas l\'09:00 de l\'ouverture) ET « Fin prévue » est redessinée', [champ(W4, '[name="heure"]').value, champ(W4, '#deb-aff').textContent, champ(W4, '#fin-dit').textContent, W4.__rendus.filter(r => r[0] === 'fin').slice(-1)[0]], ['14:00', '14:00', 'Fin prévue : 14:00', ['fin', '14:00']]);
vrai('   la liste de suggestions rouverte par l\'événement input est refermée', champ(W4, '#cli-list').style.display === 'none', champ(W4, '#cli-list').style);

/* ═══════════════ 3. LE CLIENT : la puce suit le champ caché ═══════════════ */
console.log('\n── 1400 · 3. un client en cours : Particulier / Professionnel ──');
const FORM_CLIENT = `<div class="modal-head"><h3>Nouveau client</h3></div><form><input name="nom" value="">
  <input type="hidden" name="typeClient" value="pro">
  <div class="chip tc-chip active" data-v="pro" onclick="cliSetType(this)">🏢 Professionnel</div><div class="chip tc-chip" data-v="particulier" onclick="cliSetType(this)">🏠 Particulier</div></form>`;
const stock3 = new Map(); const W5 = monde(stock3);
ex(W5, `openModal(${JSON.stringify(FORM_CLIENT)});`);
champ(W5, '[name="nom"]').value = 'Mme Test'; champ(W5, '[name="typeClient"]').value = 'particulier';
W5.document.querySelectorAll('.tc-chip').forEach(x => x.classList.toggle('active', x.dataset.v === 'particulier'));
/* `icones()` remplace les émojis par des SVG après coup : le texte lu à la CAPTURE n'a plus « 🏠 », celui du balisage neuf de la reprise l'a */
W5.document.querySelectorAll('.tc-chip').forEach(x => { x.textContent = x.dataset.v === 'pro' ? 'Professionnel' : 'Particulier'; });
ex(W5, 'multiCapturer()');
const W6 = monde(stock3); ex(W6, "current='devis'; multiReprendre('devis');");
v('⛔ le champ caché dit particulier', champ(W6, '[name="typeClient"]').value, 'particulier');
v('⛔ ET la puce active est « Particulier » (une seule)', W6.document.querySelectorAll('.tc-chip.active').map(x => x.dataset.v), ['particulier']);

/* ═══════════════ 4. LES AUTRES FENÊTRES DU REGISTRE ═══════════════ */
console.log('\n── 1400 · 4. produit, demande, bon de commande ──');
const stock4 = new Map(); const W7 = monde(stock4);
ex(W7, `openModal('<form><input name="nom"><div id="prod-fours"></div></form>'); prodFours=new Set(['ORCAD','MABI']); renderProdFours(); multiCapturer();`);
const W8 = monde(stock4); ex(W8, "current='devis'; multiReprendre('devis');");
v('produit : fournisseurs restitués et redessinés', [ex(W8, '[...prodFours].sort()'), champ(W8, '#prod-fours').textContent], [['MABI', 'ORCAD'], 'ORCAD,MABI']);
const stock5 = new Map(); const W9 = monde(stock5);
ex(W9, `openModal('<form><select name="boxId"><option value="">—</option></select><div id="dem-lignes"></div></form>'); demLignes=[{produitId:'p1',quantite:4},{produitId:'p2',quantite:1}]; renderDemLignes(); multiCapturer();`);
const W10 = monde(stock5); ex(W10, "current='devis'; multiReprendre('devis');");
v('demande : lignes restituées', ex(W10, 'demLignes'), [{ produitId: 'p1', quantite: 4 }, { produitId: 'p2', quantite: 1 }]);
const stock6 = new Map(); const W11 = monde(stock6);
ex(W11, `openModal('<form><div id="bon-lignes"></div><div id="bon-livraison"></div></form>'); bonLignes=[{designation:'Gants',quantite:3}]; bonSites=[{nom:'Site A'},{nom:'Site B'}]; _bonEditId='bon9'; multiCapturer();`);
const W12 = monde(stock6); ex(W12, "current='devis'; multiReprendre('devis');");
v('bon : lignes, sites ET identifiant d\'édition restitués (bonValider(_bonEditId))', ex(W12, '[bonLignes, bonSites, _bonEditId]'), [[{ designation: 'Gants', quantite: 3 }], [{ nom: 'Site A' }, { nom: 'Site B' }], 'bon9']);
vrai('bon : les deux blocs sont redessinés', champ(W12, '#bon-lignes').textContent === '1 article(s)' && champ(W12, '#bon-livraison').textContent === 'Site A|Site B');

/* ═══════════════ 5. LES GARDES ═══════════════ */
console.log('\n── 1400 · 5. gardes : ancienne capture, modèle trop gros, champ disparu, mot de passe ──');
const stock7 = new Map();
stock7.set(CLE, JSON.stringify({ devis: { ts: Date.now(), y: 0, html: FORM_DEVIS, titre: 'Nouveau devis', champs: [{ n: 'notes', id: '', i: 3, t: 'text', v: 'ancienne capture' }] } }));
const W14 = monde(stock7);
let jete = null; try { ex(W14, "current='devis'; multiReprendre('devis');"); } catch (e) { jete = e.message; }
vrai('une capture d\'AVANT (sans modèles ni puces) se reprend sans jeter', jete === null, jete);
v('   et ses champs sont restitués comme avant', champ(W14, '[name="notes"]').value, 'ancienne capture');
const stock8 = new Map(); const W15 = monde(stock8);
ex(W15, `openModal('<form><input name="a" value="x"><div id="lignes-box"></div></form>'); formLignes=[{designation:'x'.repeat(150000),qte:1,pu:1}]; multiCapturer();`);
const c8 = JSON.parse(stock8.get(CLE)).devis;
vrai('un modèle plus gros que le plafond n\'est pas gardé (le reste de la capture, si)', !!c8 && !(c8.modeles && 'lignes-box' in c8.modeles) && c8.champs.length === 1, c8 && Object.keys(c8.modeles || {}));
v('⛔ un champ capturé qui n\'existe plus dans le balisage neuf n\'écrit pas dans son voisin',
  (() => { const s = new Map(); const A = monde(s); ex(A, `openModal('<form><input name="a" value="1"><input name="b" value="2"></form>'); multiCapturer();`);
    const o = JSON.parse(s.get(CLE)); o.devis.champs.unshift({ n: 'disparu', id: '', i: 0, t: 'text', v: 'INTRUS' }); o.devis.champs.push({ n: '', id: '', i: 1, t: 'select-one', v: 'AUTRE' }); s.set(CLE, JSON.stringify(o));
    const B = monde(s); ex(B, "current='devis'; multiReprendre('devis');"); return [champ(B, '[name="a"]').value, champ(B, '[name="b"]').value]; })(), ['1', '2']);
const stock10 = new Map(); const W18 = monde(stock10);
ex(W18, `openModal('<form><input name="a" value="1"><input type="password" name="pw"></form>'); document.querySelector('[name="pw"]').value='secret123'; multiCapturer();`);
vrai('⛔ aucun mot de passe dans le brouillon', !/secret123/.test(stock10.get(CLE)));
const stock11 = new Map(); const W19 = monde(stock11);
ex(W19, `openModal('<form><div id="lignes-box"></div></form>'); formLignes=[{designation:'a',qte:1,pu:1}]; _modalForcee=true; multiCapturer();`);
vrai('une fenêtre obligatoire (mot de passe forcé) n\'est jamais capturée', !(JSON.parse(stock11.get(CLE) || '{}').devis));

console.log('\n══ 1400 : ' + ok + ' ✓  ' + ko + ' ✗ ══');
console.log(ok + ' ✓ ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
