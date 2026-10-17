/* ══ g19 · stock#2 — LE STOCKAGE SE MODIFIE ET SE DÉSACTIVE ═══════════════════════════════════════════
   Le message de refus de `delItem` renvoie vers « Stockage actif » (✎) : le seul geste qui retire le
   stockage de la circulation (il ne se supprime pas — sa pierre tombale, sur un identifiant fixe,
   éliminerait à la synchro tout ce qu'un autre appareil tenait). Or ce geste ne partait pas : la rangée
   « N° » est MASQUÉE (`hidden`) pour le stockage, mais son <input name="numero"> portait `required` et
   restait VIDE (`stockageCreer` pose numero:''). Le navigateur bloque l'envoi d'un formulaire invalide
   sur un champ qu'il ne peut pas focaliser (« An invalid form control … is not focusable »), sans un
   mot à l'écran : impossible de désactiver le stockage, d'y poser un responsable ou une adresse.

   Ce banc EXÉCUTE la vraie `formBox` (bac à sable) et lit le balisage qu'elle produit : aucune rangée
   masquée ne doit contenir un champ requis ; la rangée N° d'une box ordinaire reste requise (contre-
   épreuve : on ne retire pas la règle à tout le monde). La preuve au navigateur (formulaire valide, la
   fenêtre se ferme, `actif` passe à false) : scratchpad/gestion/correctifs/g19/sonde-stockage.js.     */
const fs = require('fs'), path = require('path'), vm = require('vm');
const BRUT = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const SRC = BRUT.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };
function bloc(debut) {
  const i = SRC.indexOf(debut); if (i < 0) return '';
  let j = SRC.indexOf('{', i), p = 0;
  for (let k = j; k < SRC.length; k++) { const c = SRC[k]; if (c === '{') p++; else if (c === '}') { p--; if (p === 0) return SRC.slice(i, k + 1); } }
  return '';
}
const ligne = debut => { const i = SRC.indexOf(debut); return i < 0 ? '' : SRC.slice(i, SRC.indexOf('\n', i)); };

console.log('\n── 1160 · 0. la population ──');
const FB = bloc('function formBox(id){'), ES = bloc('function estStockage(b){'), SID = ligne('const STOCKAGE_ID');
vrai('formBox, estStockage et STOCKAGE_ID sont trouvés', FB.length > 3000 && !!ES && !!SID, [FB.length, !!ES, !!SID]);
vrai('une seule définition de formBox (une seconde gagnerait partout, en silence)', SRC.split('function formBox(').length - 1 === 1);

/* Le bac à sable : tout identifiant que formBox appelle sans qu'on le fournisse est un double muet. */
function monde(box) {
  let html = '';
  const dbx = { boxes: box ? [box] : [], users: [], produits: [] };
  const propre = { db: dbx, JSON, Math, Date, Set, Map, Object, Array, String, Number, console, parseInt, parseFloat, Promise,
    openModal: h => { html = h; }, boxGererGarde: () => true, esc: s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])),
    todayISO: () => '2026-10-17', fullName: u => u.prenom, roleLbl: r => r, stkLienOk: () => true,
    renderBoxCodes() {}, renderBoxTechs() {}, renderBoxFormProds() {}, renderBoxPhoto() {} };
  const ctx = new Proxy(propre, { has: (t, k) => typeof k === 'string' && k !== 'undefined',
    get: (t, k) => k in t ? t[k] : (k === Symbol.unscopables ? undefined : (k in globalThis ? globalThis[k] : (() => ''))),
    set: (t, k, v) => { t[k] = v; return true; } });
  vm.createContext(ctx);
  vm.runInContext(`${SID}\n${ES}\n${FB}\nvar boxCodes,boxTechSel,boxUserSel,boxVisibleTous,boxFormStock,boxFormStockDepart,boxFormId,boxFormCatOpen,boxLat,boxLng,boxAddrResults,boxPhoto;`, ctx);
  return { ouvrir: id => { ctx.formBox(id); return html; }, STOCKAGE_ID: vm.runInContext('STOCKAGE_ID', ctx) };
}
/* Les rangées d'un formulaire : chaque `<div class="frow" …>` jusqu'à sa fermeture (la rangée N° est un
   bloc plat, sans imbrication). */
function rangees(html) { const out = []; const re = /<div class="frow"([^>]*)>([\s\S]*?)<\/div>/g; let m; while ((m = re.exec(html))) out.push({ attrs: m[1], corps: m[2] }); return out; }
const champsRequis = corps => (corps.match(/<(input|select|textarea)\b[^>]*>/g) || []).filter(t => /\srequired(\s|=|>|\/)/.test(t));

console.log('\n── 1160 · 1. le stockage : aucune rangée masquée ne porte un champ requis ──');
{ const sid = monde(null).STOCKAGE_ID;
  const stk = { id: sid, stockage: true, nom: 'Stockage', numero: '', groupe: 'Sans groupe', stock: {}, techIds: [], userIds: [], actif: true };
  const html = monde(stk).ouvrir(sid);
  vrai('le formulaire du stockage est rendu', /<form id="boxform"/.test(html), html.slice(0, 80));
  const R = rangees(html); const masq = R.filter(r => /\bhidden\b/.test(r.attrs));
  vrai('population : des rangées sont bien masquées pour le stockage (N°, classement, visites)', masq.length >= 5, masq.length);
  vrai('population : la rangée N° du stockage est masquée ET existe (le champ reste, saisie vide)', masq.some(r => /name="numero"/.test(r.corps)));
  const fautifs = masq.filter(r => champsRequis(r.corps).length).map(r => (r.corps.match(/name="([^"]+)"/) || [])[1]);
  vrai('⛔ aucune rangée masquée ne contient un champ requis (le navigateur bloquerait l\'envoi, sans un mot)', fautifs.length === 0, fautifs);
  vrai('le champ numero du stockage est toujours dans le formulaire (saveBox le relit : jamais un champ retiré)', /<input name="numero"/.test(html));
  vrai('le bouton « Enregistrer » est bien celui du formulaire', /form="boxform"[^>]*>Enregistrer</.test(html));
}
console.log('\n── 1160 · 2. contre-épreuve : une box ordinaire garde son N° obligatoire ──');
{ const html = monde({ id: 'b1', nom: 'Cuisine', numero: 'BOX-0001', actif: true, stock: {} }).ouvrir('b1');
  const rn = rangees(html).find(r => /name="numero"/.test(r.corps));
  vrai('la rangée N° d\'une box ordinaire est trouvée et visible', !!rn && !/\bhidden\b/.test(rn.attrs), rn);
  vrai('… et son champ reste requis', !!rn && champsRequis(rn.corps).length === 1, rn && rn.corps);
  const rn2 = rangees(monde(null).ouvrir('')).find(r => /name="numero"/.test(r.corps));
  vrai('une box NEUVE aussi (on crée une box avec son numéro)', !!rn2 && champsRequis(rn2.corps).length === 1);
}
console.log('\n' + (ok + ko) + ' contrôles — ' + ok + ' ✓ ' + ko + ' ✗');
console.log('════ test-1160 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
