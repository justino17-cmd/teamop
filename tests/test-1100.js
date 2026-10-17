/* ══ FENÊTRE EN FERMETURE : DOUBLE SOUMISSION ET BARRE « REPRENDRE » FANTÔME (lot g01) ═══════════════
   Rapport des agents de test (bêta, 16 octobre 2026) : planning#6, interventions#8, clients#0/#1/#2, ventes#4, stock#0/#1,
   equipe#7, achats#0/#6, technicien#1/#2/#8, facturation#2 — QUINZE constats, UNE cause.

   `closeModal()` (enveloppe du §6 « chemin de sortie d'une fenêtre ») garde l'overlay en « open ferme » 210 ms pour que la
   feuille ait le temps de ressortir. Pendant ces 210 ms, le formulaire ET ses boutons restent dans le DOM, cliquables :
     · un deuxième clic / toucher (0 à 200 ms mesurés, plus à 300) rappelle `save*` : deux clients, deux devis AU MÊME NUMÉRO,
       deux arrivages (stock crédité deux fois), deux lignes « Rapport enregistré »…
     · `save*` fait « closeModal(); go(current) », et `go()` appelle `multiCapturer()` EN TÊTE : qui ne lisait que la classe
       `open`, donc croyait la fenêtre encore ouverte et mémorisait le balisage du formulaire DÉJÀ ENREGISTRÉ → barre
       « Reprendre » → Reprendre + Créer = doublon (clients#0, achats#0) ; ou fiche d'un client SUPPRIMÉ → `formClient` jette
       une TypeError (clients#1).

   Le correctif tient en trois gestes, tous gardés ici :
     1. UNE garde centrale, en phase de CAPTURE sur le document : tout `click` / `submit` dont la cible est dans `#overlay`
        pendant « ferme » est avalé. ⛔ Pas de `pointer-events:none` — le deuxième toucher tomberait sur la page DESSOUS ;
     2. `multiCapturer` ne tient pour ouverte qu'une fenêtre `open` ET pas `ferme` ;
     3. `formClient` d'un client qui n'existe plus dit pourquoi au lieu de jeter.

   Ce banc EXÉCUTE les vraies `openModal`, `closeModal` et `multiCapturer` de `app.html`, et le vrai bloc §6, dans un bac à
   sable à DOM minimal (classes, écouteurs en capture, minuteries pilotées à la main). Le geste complet — douze formulaires,
   arrivage et rapport compris, au vrai pointeur — est mesuré au navigateur : scratchpad/gestion/correctifs/g01/sonde-g01.js.
   ⛔ Un motif vise du CODE, jamais un commentaire : les contrôles de forme lisent un fichier DONT LES COMMENTAIRES SONT RETIRÉS. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
/* ⛔ Nettoyage SÛR (CLAUDE.md) : seuls les blocs qui COMMENCENT une ligne. */
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let p = 0;
  for (let k = SRC.indexOf('{', i); k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1100 · 0. la population ──');
const PIECES = ['function multiCle(', 'function multiTout(', 'function multiEcrire(', 'function multiFrais(', 'function multiOublier(',
  'function multiDefil(', 'function multiPoserDefil(', 'function multiCapturer(', 'function openModal(', 'function closeModal(', 'function formClient('];
const T = {}; PIECES.forEach(p => { T[p] = p === 'function formClient(' ? SRC.slice(SRC.indexOf(p), SRC.indexOf('\nfunction ', SRC.indexOf(p) + 10)) : bloc(p); });
vrai('les onze fonctions réelles sont trouvées', PIECES.every(p => T[p].length > 40), PIECES.map(p => T[p].length));
v('⛔ une seule définition de chacune (une seconde gagnerait partout, en silence)',
  PIECES.map(p => SRC.split(p).length - 1), PIECES.map(() => 1));
const PAS = bloc("if(typeof window.closeModal==='function'&&typeof window.openModal==='function'){");
vrai('le bloc §6 (l\'enveloppe de sortie d\'une fenêtre) est trouvé', PAS.length > 300 && /minuterie/.test(PAS), PAS.length);
const L_MAX = ligne('const MULTI_MAX'), L_VIE = ligne('const MULTI_VIE_MS');
vrai('les constantes du multitâche sont trouvées', !!L_MAX && !!L_VIE);

/* ── Le bac à sable : un DOM minimal, mais fidèle sur ce qui compte ici — les classes de l'overlay, les écouteurs posés en
   CAPTURE sur le document (ils passent avant les gestionnaires en ligne), et des minuteries qu'on fait avancer à la main. ── */
function monde(opts) {
  opts = opts || {};
  const temps = { t: 0, file: [] };
  const setTimeoutF = (f, ms) => { const h = { f, a: temps.t + (ms || 0), vivant: true }; temps.file.push(h); return h; };
  const clearTimeoutF = h => { if (h) h.vivant = false; };
  const avancer = ms => { const fin = temps.t + ms; for (;;) { const p = temps.file.filter(h => h.vivant && h.a <= fin).sort((x, y) => x.a - y.a)[0]; if (!p) break; p.vivant = false; temps.t = p.a; p.f(); } temps.t = fin; };
  const classes = (...init) => { const s = new Set(init); return { add: (...c) => c.forEach(x => s.add(x)), remove: (...c) => c.forEach(x => s.delete(x)), contains: c => s.has(c), toString: () => [...s].join(' ') }; };
  const els = {};
  const el = (id, extra) => (els[id] = Object.assign({ id, classList: classes('overlay'), innerHTML: '', className: '', scrollTop: 0, children: [],
    querySelector() { return null; }, querySelectorAll() { return []; }, contains(x) { return x === this || (this.children || []).some(c => c === x || (c.contains && c.contains(x))); } }, extra));
  const overlay = el('overlay'), modal = el('modal', { classList: classes('modal'), querySelector: () => ({ textContent: 'Nouveau client' }) });
  overlay.children = [modal];
  const content = el('content', { classList: classes('content') });
  const page = { id: 'page-dessous' };                          // ce qui est SOUS l'overlay : une carte, une ligne qui ouvre une fiche
  const ecouteurs = { click: [], submit: [] };
  const store = {};
  const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, isNaN,
    setTimeout: setTimeoutF, clearTimeout: clearTimeoutF, clearInterval() {},
    localStorage: { getItem: k => (k in store ? store[k] : null), setItem: (k, x) => { store[k] = String(x); } },
    CSS: { escape: x => x }, Event: function () {},
    document: {
      getElementById: id => els[id] || null, querySelector: () => null, querySelectorAll: () => [],
      createElement: () => ({}),
      addEventListener(type, fn, cap) { if (ecouteurs[type]) ecouteurs[type].push({ fn, capture: cap === true || !!(cap && cap.capture) }); },
      removeEventListener() {},
    },
    $: id => els[id] || null,
    STORE_KEY: 'teamop_gestion_v2', currentUser: { id: 'u1' }, current: 'clients',
    kpiTailler() {}, stopBoxScanCamera() {}, toast(m) { ctx.__toasts.push(String(m)); },
    __toasts: [], __ouvertures: [], db: { clients: [] }, esc: x => String(x == null ? '' : x),
    scanStream: null, scanTimer: null, _pp: null,
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  vm.runInContext(`
    ${L_MAX}\n${L_VIE}
    var _modalForcee=${opts.forcee ? 'true' : 'false'}; let _multiHtml='';
    ${['multiCle', 'multiTout', 'multiEcrire', 'multiFrais', 'multiOublier', 'multiDefil', 'multiPoserDefil', 'multiCapturer'].map(n => T['function ' + n + '(']).join('\n')}
    function multiPastilles(){}
    ${T['function openModal(']}
    ${T['function closeModal(']}
    ${opts.sansPas ? '' : PAS}
    ${T['function formClient(']}
  `, ctx);
  /* dispatch fidèle sur l'essentiel : écouteurs en CAPTURE du document d'abord (dans l'ordre), puis le gestionnaire en ligne
     de la cible. stopImmediatePropagation les arrête tous ; preventDefault est noté. */
  const jouer = (type, cible, enLigne) => {
    let stop = false, defaut = false, mange = false;
    const e = { type, target: cible, preventDefault() { defaut = true; }, stopImmediatePropagation() { stop = true; }, stopPropagation() {} };
    for (const l of ecouteurs[type]) { if (!l.capture) continue; l.fn(e); if (stop) break; }
    if (!stop) { enLigne(); mange = true; }
    return { atteint: mange, empeche: defaut };
  };
  return { ctx, overlay, modal, content, page, avancer, jouer, store, run: s => vm.runInContext(s, ctx) };
}
const FORM = '<div class="modal-head"><h3>Nouveau client</h3></div><form onsubmit="saveClientForm(event,\'\')"><button type="submit">Créer</button></form>';
const ouvert = w => w.overlay.classList.contains('open');
const barre = w => { const o = JSON.parse(w.store[w.run('multiCle()')] || '{}'); return o.clients && o.clients.html ? o.clients : null; };

console.log('\n── 1100 · 1. la barre « Reprendre » ne propose JAMAIS ce qui vient d\'être enregistré ──');
{
  const w = monde();
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  vrai('population : la fenêtre est ouverte', ouvert(w));
  w.run('closeModal()');          // ce que fait saveClientForm
  vrai('population : pendant la sortie l\'overlay porte « open ferme » (la cause, mesurée)', ouvert(w) && w.overlay.classList.contains('ferme'));
  w.run('multiCapturer()');       // go(current) l'appelle EN TÊTE, dans la même respiration
  vrai('⛔⛔ clients#0 / achats#0 : la fenêtre déjà enregistrée n\'est PAS mémorisée (sinon : Reprendre + Créer = doublon)', barre(w) === null, barre(w) && barre(w).titre);
}
{
  const w = monde();
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  w.run('multiCapturer()');
  vrai('contre-épreuve : une fenêtre laissée OUVERTE puis quittée par navigation est bien mémorisée (la fonction sert encore)', barre(w) !== null);
  vrai('   avec son titre', barre(w) && /Nouveau client/.test(barre(w).titre), barre(w));
}
{
  const w = monde();
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  w.run('multiCapturer()');
  w.run('closeModal()'); w.avancer(300); w.run('multiCapturer()');
  vrai('fenêtre fermée PUIS rendue (210 ms passées) : plus rien à reprendre — comme avant', barre(w) === null);
}
{
  const w = monde({ forcee: true });
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  w.run('multiCapturer()');
  vrai('l\'écran obligatoire (_modalForcee) ne se mémorise toujours pas', barre(w) === null);
}

console.log('\n── 2. LA GARDE CENTRALE : une fenêtre qui part n\'accepte plus rien ──');
{
  const w = monde(); let appels = 0;
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  const bouton = { id: 'btn-creer' }; w.modal.children = [bouton];
  const geste = () => w.jouer('click', bouton, () => appels++);
  const g1 = geste();
  vrai('le premier clic atteint le formulaire (la fenêtre est ouverte)', g1.atteint && appels === 1);
  w.run('closeModal()');                                     // saveClientForm : enregistrer puis fermer
  for (const d of [0, 60, 120, 200]) {
    w.avancer(d === 0 ? 0 : 60);
    const s = w.jouer('click', bouton, () => appels++);
    vrai('⛔⛔ planning#6, interventions#8, clients#2, ventes#4, stock#0/#1, equipe#7, achats#6, technicien#1/#2/#8 : le clic à ~' + d + ' ms est AVALÉ',
      !s.atteint && s.empeche && appels === 1, { appels, s });
  }
  const sub = w.jouer('submit', bouton, () => appels++);
  vrai('le « submit » (Entrée dans un champ, ou le bouton) est avalé aussi — saveArrivage n\'est pas un submit, saveClientForm en est un', !sub.atteint && appels === 1, appels);
  w.avancer(400);
  vrai('population : au bout de 210 ms l\'overlay est rendu (plus « open », plus « ferme »)', !ouvert(w) && !w.overlay.classList.contains('ferme'));
  const apres = w.jouer('click', w.page, () => appels++);
  vrai('contre-épreuve : un clic à 400 ms (fenêtre fermée) sur la PAGE dessous n\'est pas avalé', apres.atteint && appels === 2, appels);
}
{
  const w = monde(); let appels = 0;
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  const bouton = { id: 'btn' }; w.modal.children = [bouton];
  w.run('closeModal()'); w.avancer(30);
  const dessous = w.jouer('click', w.page, () => appels++);
  vrai('⛔ le clic qui vise la PAGE (hors de l\'overlay) n\'est jamais avalé : on avale le geste sur la fenêtre, pas ce qui est dessous', dessous.atteint && appels === 1, appels);
}
{
  /* « closeModal(); ouvrirAutreChose() » — des dizaines d'enchaînements : la fenêtre suivante doit recevoir SES clics. */
  const w = monde(); let appels = 0;
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  w.run('closeModal(); openModal("<form><button id=b2>OK</button></form>")');
  const b2 = { id: 'b2' }; w.modal.children = [b2];
  const s = w.jouer('click', b2, () => appels++);
  vrai('⛔ closeModal() puis openModal() dans la même respiration : le premier clic de la fenêtre suivante n\'est PAS avalé', s.atteint && appels === 1, { appels, ferme: w.overlay.classList.contains('ferme') });
  w.avancer(400);
  vrai('   et la fenêtre suivante n\'est pas fermée par la minuterie de la précédente', ouvert(w));
}
{
  /* Un formulaire invalide ou refusé (toast « Indique un client ») RESTE ouvert : pas de « ferme », donc le renvoi reste possible. */
  const w = monde(); let appels = 0;
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  const bouton = { id: 'btn' }; w.modal.children = [bouton];
  const a = w.jouer('click', bouton, () => appels++), b = w.jouer('click', bouton, () => appels++);
  vrai('⛔ une fenêtre qui reste OUVERTE (formulaire refusé) accepte le renvoi : la garde ne se déclenche que pendant « ferme »', a.atteint && b.atteint && appels === 2, appels);
}
{
  const w = monde(); let appels = 0;
  w.run('openModal(' + JSON.stringify(FORM) + ')');
  const bouton = { id: 'btn' }; w.modal.children = [bouton];
  w.run('closeModal()');
  w.run('closeModal()');                                     // un 2e closeModal() pendant la sortie (double appel d'un save)
  w.avancer(210);
  vrai('un closeModal() redoublé ne laisse pas la fenêtre « ferme » à jamais (la minuterie la rend)', !ouvert(w) && !w.overlay.classList.contains('ferme'));
  const s = w.jouer('click', bouton, () => appels++);
  vrai('   et elle n\'avale rien une fois rendue', s.atteint, appels);
}

console.log('\n── 3. clients#1 : la fiche d\'un client supprimé ne jette plus ──');
{
  const w = monde();
  w.run('db.clients = [{id:"c1", nom:"Existe"}]');
  let erreur = null; try { w.run('formClient("fantome")'); } catch (e) { erreur = e; }
  vrai('⛔⛔ formClient d\'un client qui n\'existe plus ne lève pas de TypeError (« Cannot read properties of undefined (reading \'prefPassage\') »)', erreur === null, erreur && String(erreur.message).slice(0, 120));
  vrai('   elle ne rouvre aucune fenêtre', !ouvert(w) && w.modal.innerHTML === '', w.modal.innerHTML.slice(0, 40));
  vrai('   elle le dit à l\'écran (un geste qui ne fait rien est un geste qui ment)', w.ctx.__toasts.length === 1 && /n.existe plus|introuvable|supprim/i.test(w.ctx.__toasts[0]), w.ctx.__toasts);
}

console.log('\n── 4. la FORME du correctif (code seul, commentaires retirés) ──');
{
  const ECOUT = [...PAS.matchAll(/document\.addEventListener\(\s*'(click|submit)'\s*,[^;]*?,\s*true\s*\)/g)].map(m => m[1]).sort();
  v('⛔ la garde est posée en phase de CAPTURE sur « click » ET « submit »', ECOUT, ['click', 'submit']);
  vrai('⛔ elle arrête le geste avant les gestionnaires en ligne (stopImmediatePropagation + preventDefault)', /stopImmediatePropagation\(\)/.test(PAS) && /preventDefault\(\)/.test(PAS));
  const CSS = BRUT.replace(/\/\*[\s\S]*?\*\//g, ' ');
  /* ⛔ Recensé par indexOf, en temps linéaire : un `[^{}]*` devant un littéral, sur les 3,5 Mo d'app.html, peut prendre
     des dizaines de secondes sur une MUTATION (retour arrière à chaque position) — CLAUDE.md, test-781. */
  const regles = [];
  for (let i = CSS.indexOf('.overlay.ferme'); i >= 0; i = CSS.indexOf('.overlay.ferme', i + 1)) {
    const o = CSS.indexOf('{', i), c = CSS.indexOf('}', o); const dep = Math.max(CSS.lastIndexOf('}', i), CSS.lastIndexOf('{', i)) + 1;
    if (o < 0 || c < 0 || (CSS.indexOf('}', i) >= 0 && CSS.indexOf('}', i) < o)) continue;   // une occurrence dans un corps de règle, pas un sélecteur
    if (regles.length && regles[regles.length - 1][3] === dep) continue;
    regles.push([null, CSS.slice(dep, o), CSS.slice(o + 1, c), dep]);
  }
  vrai('population : les règles CSS de l\'overlay en sortie sont trouvées', regles.length >= 2, regles.length);
  vrai('⛔ aucune ne pose pointer-events:none sur l\'overlay qui part (le 2e toucher tomberait sur la page DESSOUS)',
    !regles.some(r => /pointer-events\s*:\s*none/.test(r[2]) && !/\.modal/.test(r[1])), regles.map(r => r[1].trim().slice(0, 60)));
  const MC = T['function multiCapturer('];
  vrai('multiCapturer lit « ferme » pour décider qu\'une fenêtre est ouverte', /contains\(\s*'ferme'\s*\)/.test(MC), MC.slice(0, 200));
  vrai('⛔ rien ne s\'écrit dans db (le multitâche est un état d\'appareil)', !/\bdb\./.test(MC + PAS));
}


console.log('\n── 5. LES GESTES QUE LA GARDE NE COUVRE PAS (relecture du lot) : lesquels se doublent vraiment ? ──');
const MB = bloc('function mailBoxSave(e,id){');
vrai('population : mailBoxSave est trouvée', MB.length > 200, MB.length);
{
  /* mailBoxSave est SYNCHRONE : elle ferme avant de rendre la main, donc la garde « ferme » la couvre. On la JOUE. */
  const w = monde();
  w.run('var __boites=[]; db.mailBoxes=__boites; function adminSeul(){ return true; } function save(){} function uid(){ return "b"+(__boites.length+1); } function FormData(t){ return Object.entries(t); }\n' + MB);
  w.run('openModal(' + JSON.stringify('<form onsubmit="mailBoxSave(event,\'\')"><button type="submit">Enregistrer</button></form>') + ')');
  const bouton = { id: 'btn-boite' }; w.modal.children = [bouton];
  const ev = { target: { user: 'rapports@ex.fr', pass: 'x', host: '', port: '', from: '' }, preventDefault() {} };
  const envoi = () => w.run('mailBoxSave(__e,"")');
  w.ctx.__e = ev;
  const g1 = w.jouer('submit', bouton, envoi);
  const g2 = w.jouer('submit', bouton, envoi);
  const g3 = w.jouer('click', bouton, envoi);
  vrai('⛔ mailBoxSave : la 1re soumission écrit, les suivantes pendant la sortie sont AVALÉES (une seule adresse)', g1.atteint && !g2.atteint && !g3.atteint && w.run('db.mailBoxes.length') === 1, w.run('db.mailBoxes.length'));
  vrai('   et mailBoxSave n\'attend rien avant de fermer (aucun await dans son code : la garde la voit)', !/\bawait\b/.test(MB) && /closeModal\(\)/.test(MB));
}
{
  const AX = bloc('async function aiGenDevisXylo(e){');
  const iSub = AX.indexOf('sub.disabled=true'), iAwait = AX.indexOf('await ');
  vrai('population : aiGenDevisXylo est trouvée avec son verrou et son premier await', AX.length > 500 && iSub > 0 && iAwait > 0, [AX.length, iSub, iAwait]);
  vrai('⛔ aiGenDevisXylo verrouille son bouton (sub.disabled=true) AVANT son premier await : un 2e toucher ne part pas (mesuré : 1 devis, 1 appel IA à 0/60/200 ms, sonde-g01c)', iSub < iAwait);
}
(async () => {
  /* saveUser : VRAIE fonction, VRAI btnOccupe, un « serveur » dont on tient la réponse (le réseau est ce qui laisse passer le 2e toucher). */
  const HOM = bloc('function compteHomonyme(prenom,nom,sauf){'), MSG = bloc('function homonymeMessage(h,prenom,nom){'), NN = bloc('function nomNorm(s){'),
    FN = ligne('const fullName = u =>'), SU = bloc('async function saveUser(e,id){'), BO = bloc('function btnOccupe(el,texte){');
  vrai('population : saveUser, btnOccupe et leurs voisines sont trouvées', [HOM, MSG, NN, FN, SU, BO].every(x => x.length > 50), [HOM, MSG, NN, FN, SU, BO].map(x => x.length));
  const monde2 = () => {
    const ctx = { console, JSON, Math, Date, Set, Map, Object, Array, String, Number, Promise, db: { users: [{ id: 'uA', prenom: 'Justin', nom: 'Roux', login: 'jroux', role: 'admin', actif: true }], techniciens: [], boxes: [], vehicules: [] },
      currentUser: { id: 'uA', role: 'admin' }, __toasts: [], __serveur: 0, __attente: [], __verdict: false, __fermees: 0, localStorage: { getItem: () => null, setItem: () => {} } };
    vm.createContext(ctx);
    vm.runInContext(`${NN}\n${FN.replace('const ', 'var ')}\n${HOM}\n${MSG}\n${BO}
      function esc(x){ return String(x); }
      var ROLE_PROTEGE='admin', drRattaches=new Set(), nuBoxes=new Set(), nuVehs=new Set(), nuStk=false, views={utilisateurs(){}};
      function toast(m){ __toasts.push(String(m)); } function save(){} function closeModal(){ __fermees++; } function logEvent(){}
      function can(){ return false; } function planPlaceLibre(){ return true; } function proposerAbonnement(){}
      function loginExisteAilleurs(){ __serveur++; return new Promise(function(ok){ __attente.push(function(){ ok(__verdict); }); }); }
      function roleEstTech(r){ return r==='technicien'; } function roleLbl(r){ return r; } function profilDroits(){ return null; }
      function droitsBorner(){ return []; } function stockageBox(){ return null; } function estStockage(){ return false; }
      function visibleBoxes(l){ return l||[]; } function visibleVehicules(l){ return l||[]; } function userBoxVoit(){} function userVehiculeVoit(){}
      function entrepriseNom(){ return 'Sonde SARL'; } async function sha256(){ return 'h'; } function userIdentifiantsModal(){}
      function setTimeout(f){ }
      var __id=0; function uid(){ return 'n'+(++__id); }
      function FormData(t){ return Object.entries(t); }
      ${SU}`, ctx);
    const bouton = { nodeType: 1, innerHTML: 'Créer', style: {}, isConnected: true, _occupe: false, classList: { add() {}, remove() {} }, getBoundingClientRect: () => ({ width: 80 }) };
    const evt = (login) => ({ submitter: bouton, preventDefault() {}, target: { prenom: 'Dbl', nom: 'Test' + login, login, role: 'technicien', email: '', pwd: 'provisoire1' } });
    const lacher = async () => { while (ctx.__attente.length) ctx.__attente.shift()(); await new Promise(r => setImmediate(r)); await new Promise(r => setImmediate(r)); };
    return { ctx, bouton, evt, lacher };
  };
  {
    const m = monde2();
    const p1 = m.ctx.saveUser(m.evt('dbl1'), '');
    await new Promise(r => setImmediate(r));
    vrai('population : le 1er geste attend le serveur (la fenêtre n\'est pas encore fermée : la garde centrale ne peut rien)', m.ctx.__serveur === 1 && m.ctx.__fermees === 0, [m.ctx.__serveur, m.ctx.__fermees]);
    vrai('⛔ le bouton est verrouillé pendant l\'attente (« Enregistrement… »)', m.bouton._occupe === true && m.bouton.innerHTML === 'Enregistrement…', [m.bouton._occupe, m.bouton.innerHTML]);
    const p2 = m.ctx.saveUser(m.evt('dbl1'), '');          // le 2e toucher, pendant l'attente
    await new Promise(r => setImmediate(r));
    await m.lacher(); await p1; await p2;
    vrai('⛔⛔ double toucher sur « Créer » un utilisateur : UN seul compte (deux avant le correctif)', m.ctx.db.users.length === 2, m.ctx.db.users.map(u => u.login));
    vrai('   le serveur n\'a été interrogé qu\'UNE fois, la fenêtre fermée une fois', m.ctx.__serveur === 1 && m.ctx.__fermees === 1, [m.ctx.__serveur, m.ctx.__fermees]);
    vrai('   le bouton est relâché et a retrouvé son libellé', m.bouton._occupe === false && m.bouton.innerHTML === 'Créer', [m.bouton._occupe, m.bouton.innerHTML]);
  }
  {
    const m = monde2(); m.ctx.__verdict = true;             // « cet identifiant existe déjà chez l'équipe »
    const p = m.ctx.saveUser(m.evt('pris'), ''); await new Promise(r => setImmediate(r)); await m.lacher(); await p;
    vrai('⛔ un REFUS (identifiant pris) relâche le bouton : la personne n\'est pas bloquée devant son formulaire', m.bouton._occupe === false && m.bouton.innerHTML === 'Créer' && m.ctx.db.users.length === 1, [m.bouton._occupe, m.bouton.innerHTML, m.ctx.db.users.length]);
    m.ctx.__verdict = false;
    const p2 = m.ctx.saveUser(m.evt('libre'), ''); await new Promise(r => setImmediate(r)); await m.lacher(); await p2;
    vrai('   et le renvoi, corrigé, aboutit', m.ctx.db.users.length === 2, m.ctx.db.users.length);
  }
  {
    const m = monde2();
    const p = m.ctx.saveUser(Object.assign(m.evt(''), {}), ''); await p;
    vrai('un refus de validation locale (identifiant vide) relâche aussi le bouton', m.bouton._occupe === false && m.bouton.innerHTML === 'Créer', [m.bouton._occupe, m.bouton.innerHTML]);
  }
  {
    const m = monde2(); vm.runInContext('sha256 = async function(){ throw new Error("crypto indisponible"); }', m.ctx);
    const p = m.ctx.saveUser(m.evt('boum'), '').then(() => null, e => e); await new Promise(r => setImmediate(r)); await m.lacher();
    const err = await p;
    vrai('⛔ une EXCEPTION en cours de route relâche le bouton (try/finally) : il ne reste pas mort', !!err && m.bouton._occupe === false && m.bouton.innerHTML === 'Créer', [!!err, m.bouton._occupe, m.bouton.innerHTML]);
  }
  {
    const m = monde2();
    const e = { preventDefault() {}, target: { prenom: 'Sans', nom: 'Bouton', login: 'sb', role: 'technicien', email: '', pwd: 'provisoire1' } };
    Object.defineProperty(e.target, 'querySelector', { value: () => m.bouton, enumerable: false });
    const p = m.ctx.saveUser(e, ''); await new Promise(r => setImmediate(r));
    vrai('sans e.submitter (Entrée dans un champ) : le bouton est retrouvé dans le formulaire et verrouillé', m.bouton._occupe === true);
    await m.lacher(); await p;
    const m2 = monde2(); const p3 = m2.ctx.saveUser({ preventDefault() {}, target: { prenom: 'A', nom: 'B', login: 'ab', role: 'technicien', email: '', pwd: 'provisoire1' } }, ''); await new Promise(r => setImmediate(r)); await m2.lacher(); await p3;
    vrai('sans aucun bouton trouvable : saveUser fonctionne comme avant', m2.ctx.db.users.length === 2, m2.ctx.db.users.length);
  }
  {
    const code = SU;
    vrai('FORME : saveUser verrouille par btnOccupe et relâche dans un finally (code seul, commentaires retirés)', /btnOccupe\(\s*_bt/.test(code) && /finally\s*\{\s*_relacher\(\)/.test(code));
    vrai('   et refuse un 2e geste tant que le bouton est occupé', /_bt\._occupe\)\s*return/.test(code));
  }
  console.log(`\n════ test-1100 : ${ok} ✓ ${ko} ✗ ════\n`);
  process.exit(ko ? 1 : 0);
})();
