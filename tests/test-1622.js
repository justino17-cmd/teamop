/* ══ j03 · r4#2 — LE TOAST D'UN CHAMP OBLIGATOIRE NOMME LE CHAMP COMME L'ÉCRAN, JAMAIS PAR SON ATTRIBUT `name` ══════════════
   Formulaire Produit, « Nom » rempli de cinq espaces → « Le champ « nom » est obligatoire » (nom technique, minuscule). L'input est
   dans `.fgroup > .frow`, sans `.field` ni <label>, avec un placeholder « Ex : XILIX 1000 » (un exemple, écarté par la garde) :
   `libelle()` retombait sur `el.getAttribute('name')`. La rubrique « Nom du produit * » existe, mais en <div class="form-sec"> hors
   de tout champ.

   Ce banc lit le VRAI balisage du formulaire (l'input de `#prodform` est extrait d'app.html et ses attributs servent à bâtir le champ
   du faux document), puis EXÉCUTE la vraie `saisieGardeInstaller` : le toast doit nommer le champ comme l'écran. Il recense aussi,
   dans tout app.html, les champs de texte `required` écrits sans libellé reconnu (ni <label>, ni libellé de rangée, ni aria-label,
   ni placeholder qui ne soit pas un exemple) : ils retomberaient sur l'attribut technique.                                      */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
function bloc(debut) {
  const i = APP.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = APP.indexOf('{', i); k < APP.length; k++) {
    if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(i, k + 1); } }
  return ''; }

console.log('\n── 1622 · 0. la population ──');
const SRC = bloc('function saisieGardeInstaller(doc){');
vrai('la garde est trouvée dans app.html', SRC.length > 200, SRC.length);
const iForm = CODE.indexOf('<form id="prodform" onsubmit="saveProduit(');
const tagProduit = ((CODE.slice(iForm, iForm + 6000).match(/<input name="nom" required[^>]*>/) || [''])[0]);
vrai('le formulaire Produit et son input « nom » requis sont trouvés dans le balisage réel', iForm > 0 && tagProduit.length > 20, tagProduit);
if (!SRC || !tagProduit) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }
const attr = (tag, a) => { const m = new RegExp('\\s' + a + '="([^"]*)"').exec(tag); return m ? m[1] : null; };

/* un faux élément à partir d'un VRAI tag ; `rang` simule la rangée `.frow` qui porte un `.frow-lbl` */
function depuisTag(tag, o) {
  o = o || {};
  const c = { tagName: 'INPUT', type: attr(tag, 'type') || 'text', name: attr(tag, 'name') || '', value: '     ', disabled: false, focus() {}, select() {},
    getAttribute(a) { return attr(tag, a); },
    closest(s) { return s === '.field' && o.label ? { querySelector: () => ({ textContent: o.label }) } : s === '.frow' && o.rang ? { querySelector: sel => sel === '.frow-lbl' ? { textContent: o.rang } : null } : null; } };
  return c;
}
function toast(champ) {
  const toasts = [], ecouteurs = [], doc = { addEventListener(type, fn, capture) { ecouteurs.push({ type, fn, capture }); } };
  new Function('toast', SRC + '\nsaisieGardeInstaller(arguments[1]);')((m) => toasts.push(m), doc);
  const form = { querySelectorAll: sel => sel === 'input[required],textarea[required]' ? [champ] : [] };
  const e = { target: form, preventDefault() {}, stopImmediatePropagation() { e.stop = true; } };
  for (const l of ecouteurs.filter(l => l.type === 'submit' && l.capture === true)) { l.fn(e); if (e.stop) break; }
  return toasts;
}

console.log('\n── 1622 · 1. le formulaire Produit, cinq espaces dans « Nom » ──');
{ const t = toast(depuisTag(tagProduit));
  vrai('⛔ le toast nomme « Nom du produit » (le libellé de l\'écran)', t.length === 1 && /« Nom du produit »/.test(t[0]), t);
  vrai('⛔ et ne montre PAS l\'attribut technique « nom »', !/« nom »/.test(t[0] || ''), t); }
vrai('l\'input porte un aria-label (le nom accessible de l\'écran), à l\'identique de la rubrique « Nom du produit * »',
  attr(tagProduit, 'aria-label') === 'Nom du produit' && /<div class="form-sec">Nom du produit \*<\/div>/.test(CODE.slice(iForm, iForm + 6000)), attr(tagProduit, 'aria-label'));

console.log('\n── 1622 · 2. libelle() : l\'ordre des sources, et le libellé de rangée ──');
{ const t = toast(depuisTag('<input name="numero" required placeholder="Ex : BOX-1">', { rang: 'N°' }));
  vrai('un champ sans <label> dans une rangée « N° » se nomme « N° » (et non « numero »)', /« N° »/.test(t[0]), t); }
{ const t = toast(depuisTag('<input name="x" required aria-label="Raison sociale" placeholder="Autre chose">', { rang: 'Rangée' }));
  vrai('l\'aria-label passe avant le placeholder et la rangée', /« Raison sociale »/.test(t[0]), t); }
{ const t = toast(depuisTag('<input name="x" required placeholder="Titre (ex : Dératisation cuisine)">', { rang: 'Rangée' }));
  vrai('un placeholder qui n\'est pas un exemple passe avant la rangée, sans son exemple : « Titre »', /« Titre »/.test(t[0]), t); }
{ const t = toast(depuisTag('<input name="x" required>', { label: 'Nom / Raison sociale *' }));
  vrai('le <label> d\'un .field passe avant tout, astérisque retirée', /« Nom \/ Raison sociale »/.test(t[0]), t); }
{ const t = toast(depuisTag('<input name="nom" required placeholder="Ex : XILIX 1000">'));
  vrai('en tout dernier recours seulement (aucun libellé d\'aucune sorte) : l\'attribut name', /« nom »/.test(t[0]), t); }

console.log('\n── 1622 · 3. recensement : aucun champ de texte requis du fichier ne retombe sur son attribut `name` ──');
const NON_TEXTE = /type="(?:password|number|date|time|datetime-local|file|checkbox|radio|hidden|range|color|month|week)"/;
const sansNom = []; let vus = 0;
{ const re = /<input\b[^>]*\brequired\b[^>]*>/g; let m;
  while ((m = re.exec(CODE))) {
    const tag = m[0]; if (NON_TEXTE.test(tag)) continue;
    vus++;
    const ph = attr(tag, 'placeholder') || '';
    /* le <label> d'un `.field` qui précède (jusqu'à 900 caractères, la rangée de boutons du mot de passe tient dedans), ou un libellé de rangée */
    const avant = CODE.slice(Math.max(0, m.index - 900), m.index), iField = avant.lastIndexOf('class="field"'), iRang = avant.lastIndexOf('class="frow"');
    const dansField = iField >= 0 && iField > iRang && avant.indexOf('<label', iField) >= 0;
    const lblRang = iRang >= 0 && /frow-lbl/.test(avant.slice(iRang));
    const nomme = dansField || lblRang || attr(tag, 'aria-label') || (ph && !/^\s*ex\s*:/i.test(ph));
    if (!nomme) sansNom.push(CODE.slice(0, m.index).split('\n').length + ' : ' + tag.slice(0, 90));
  } }
vrai('la population n\'est pas vide (des champs de texte requis ont été comptés)', vus >= 10, vus);
vrai('⛔ aucun champ de texte requis n\'est écrit sans aucun libellé reconnu', sansNom.length === 0, sansNom);

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
