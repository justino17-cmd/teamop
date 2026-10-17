/* ══ test-1414 — UN CHAMP OBLIGATOIRE NE SE REMPLIT PAS D'ESPACES (robustesse#8) ══════════════
   `required` n'écarte que le champ VIDE : cinq espaces passent, et on créait un client, une box,
   une intervention, un produit AU NOM VIDE (ligne blanche dans les listes, avatar sans initiales).
   La garde est UNE (`saisieGardeInstaller`, fin d'app.html) : un écouteur `submit` en CAPTURE sur
   le document, donc devant le `onsubmit` de n'importe quel formulaire — présent ou futur.

   Ce banc EXÉCUTE la vraie fonction extraite d'app.html dans un DOM minimal (un document qui garde
   ses écouteurs, des formulaires qui rendent leurs champs requis) : pour chaque formulaire il
   envoie l'événement `submit` puis, SEULEMENT s'il n'a pas été arrêté, appelle la fonction
   d'enregistrement du formulaire — qui note qu'elle a écrit. « Refusé » veut donc dire : rien
   n'a été écrit. Les huit formulaires de la consigne : client, box, intervention, produit
   refusés avec cinq espaces ; « A » accepté ; champ non requis vide accepté ; mot de passe en
   espaces non visé ; et les cas voisins (vide = navigateur, NBSP, espace de largeur nulle,
   « Dupont » entouré d'espaces, champ désactivé, nombre, date, liste).
   La preuve dans une vraie page est la sonde `agents/robustesse/bug-espaces.js` (scratchpad). */
const fs = require('fs'), path = require('path');
const APP = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const CODE = APP.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d).slice(0, 300) : '')); } };
const v = (t, a, b) => vrai(t, JSON.stringify(a) === JSON.stringify(b), a);
function bloc(debut) {
  const i = APP.indexOf(debut); if (i < 0) return '';
  let p = 0; for (let k = APP.indexOf('{', i); k < APP.length; k++) {
    if (APP[k] === '{') p++; else if (APP[k] === '}') { p--; if (!p) return APP.slice(i, k + 1); } }
  return ''; }

console.log('\n── 1414 · 0. la population ──');
const SRC = bloc('function saisieGardeInstaller(doc){');
vrai('la garde est trouvée dans app.html', SRC.length > 200, SRC.length);
vrai('elle est INSTALLÉE (un appel dans le code, pas dans un commentaire)', /^saisieGardeInstaller\(document\);/m.test(CODE));
vrai('une seule définition', (CODE.match(/function saisieGardeInstaller\(/g) || []).length === 1);
// les quatre formulaires de la consigne existent, leur champ de nom est `required` : la garde les couvre.
const FORMS = [
  { id: 'client', fn: 'saveClientForm', champ: /<form onsubmit="saveClientForm\([\s\S]{0,400}?<input name="nom" required/ },
  /* le numéro d'une box est requis — sauf celui du stockage, qui n'en porte pas (vague 1 : `${S?'':' required'}`) */
  { id: 'box', fn: 'saveBox', champ: /<form id="boxform" onsubmit="saveBox\([\s\S]{0,4000}?<input name="numero"(?: required|\$\{S\?'':' required'\})/ },
  { id: 'intervention', fn: 'saveIntervention', champ: /<form id="intform" onsubmit="saveIntervention\([\s\S]{0,6000}?<input name="titre" required/ },
  { id: 'produit', fn: 'saveProduit', champ: /<form id="prodform" onsubmit="saveProduit\([\s\S]{0,3000}?<input name="nom" required/ } ];
for (const f of FORMS) vrai('le formulaire « ' + f.id + ' » porte un champ de texte required (' + f.fn + ')', f.champ.test(CODE));

if (!SRC) { console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(1); }

/* ── le DOM minimal ─────────────────────────────────────────────────────────────────────── */
function champ(o) {
  const c = { tagName: (o.tag || 'INPUT'), type: o.type || 'text', name: o.name || '', value: o.value == null ? '' : o.value,
    required: o.required !== false, disabled: !!o.disabled, focus() { c.focused = true; }, select() { c.selected = true; },
    getAttribute(a) { return a === 'name' ? c.name : a === 'placeholder' ? (o.placeholder || null) : a === 'aria-label' ? (o.aria || null) : null; },
    closest(s) { return s === '.field' && o.label ? { querySelector: () => ({ textContent: o.label }) } : null; } };
  return c;
}
function formulaire(champs, ecrit) {
  return { querySelectorAll(sel) { return sel === 'input[required],textarea[required]' ? champs.filter(c => c.required) : []; }, champs, ecrit };
}
function monter() {
  const toasts = []; const ecouteurs = [];
  const doc = { addEventListener(type, fn, capture) { ecouteurs.push({ type, fn, capture }); } };
  new Function('toast', SRC + '\nsaisieGardeInstaller(arguments[1]);')((m) => toasts.push(m), doc);
  const envoyer = (form) => {
    const e = { target: form, defaut: false, stop: false, preventDefault() { e.defaut = true; }, stopImmediatePropagation() { e.stop = true; } };
    for (const l of ecouteurs.filter(l => l.type === 'submit' && l.capture === true)) { l.fn(e); if (e.stop) break; }
    if (!e.stop && !e.defaut) form.ecrit();           // le onsubmit du formulaire : la fonction save*
    return e;
  };
  return { ecouteurs, toasts, envoyer };
}
function essai(champs) { const b = monter(); let ecrit = 0; const f = formulaire(champs, () => { ecrit++; }); const e = b.envoyer(f); return { e, ecrit, toasts: b.toasts, champs, b }; }

console.log('\n── 1414 · 1. la garde se pose devant tout formulaire ──');
{ const b = monter();
  vrai('un seul écouteur, sur « submit »', b.ecouteurs.length === 1 && b.ecouteurs[0].type === 'submit', b.ecouteurs.map(l => l.type));
  vrai('posé en phase de CAPTURE (avant le onsubmit du formulaire)', b.ecouteurs[0].capture === true); }

console.log('\n── 1414 · 2. les quatre formulaires, cinq espaces → refusés, rien d’écrit ──');
const CINQ = '     ';
const jeu = {
  client: () => [champ({ name: 'nom', value: CINQ, label: 'Nom / Raison sociale *' }), champ({ name: 'email', value: '', required: false })],
  box: () => [champ({ name: 'numero', value: CINQ, placeholder: 'Numéro (ex : BOX-0001)' })],
  intervention: () => [champ({ name: 'titre', value: CINQ, placeholder: 'Titre (ex : Dératisation cuisine)' })],
  produit: () => [champ({ name: 'nom', value: CINQ, placeholder: 'Ex : XILIX 1000' })] };
for (const k of Object.keys(jeu)) {
  const r = essai(jeu[k]());
  vrai(k + ' : l’événement est annulé et arrêté', r.e.defaut === true && r.e.stop === true);
  vrai(k + ' : la fonction d’enregistrement n’est PAS appelée', r.ecrit === 0, r.ecrit);
  vrai(k + ' : le refus est dit à voix haute (un toast « obligatoire »)', r.toasts.length === 1 && /obligatoire/.test(r.toasts[0]), r.toasts);
  vrai(k + ' : le focus revient sur le champ', r.champs[0].focused === true);
}
{ const r = essai(jeu.client()); vrai('le toast nomme le champ par son libellé, sans l’astérisque : « Nom / Raison sociale »', /« Nom \/ Raison sociale »/.test(r.toasts[0]), r.toasts); }
{ const r = essai(jeu.box()); vrai('… par son placeholder sinon, sans l’exemple : « Numéro »', /« Numéro »/.test(r.toasts[0]), r.toasts); }
{ const r = essai(jeu.produit()); vrai('… et par le nom du champ quand le placeholder n’est qu’un exemple : « nom »', /« nom »/.test(r.toasts[0]), r.toasts); }

console.log('\n── 1414 · 3. ce qui doit PASSER comme avant ──');
{ const r = essai([champ({ name: 'nom', value: 'A', label: 'Nom *' })]); vrai('« A » est accepté', r.ecrit === 1 && !r.e.defaut && r.toasts.length === 0); }
{ const r = essai([champ({ name: 'nom', value: '   Dupont  ', label: 'Nom *' })]); vrai('« Dupont » entouré d’espaces est accepté', r.ecrit === 1); }
{ const r = essai([champ({ name: 'nom', value: '', label: 'Nom *' })]); vrai('un champ VIDE reste l’affaire du navigateur (la garde ne dit rien)', r.ecrit === 1 && r.toasts.length === 0); }
{ const r = essai([champ({ name: 'nom', value: 'Dupont', label: 'Nom *' }), champ({ name: 'tel', value: CINQ, required: false })]); vrai('un champ NON requis rempli d’espaces est accepté', r.ecrit === 1); }
{ const r = essai([champ({ name: 'nom', value: 'Dupont' }), champ({ name: 'mdp', type: 'password', value: CINQ })]); vrai('un mot de passe en espaces n’est pas visé (c’est un secret, pas un nom)', r.ecrit === 1); }
{ const r = essai([champ({ name: 'n', type: 'number', value: CINQ }), champ({ name: 'd', type: 'date', value: CINQ }), champ({ name: 's', tag: 'SELECT', type: 'select-one', value: CINQ }), champ({ name: 'h', type: 'hidden', value: CINQ })]); vrai('nombre, date, liste, caché : non visés', r.ecrit === 1); }
{ const r = essai([champ({ name: 'nom', value: CINQ, disabled: true })]); vrai('un champ désactivé n’est pas lu', r.ecrit === 1); }

console.log('\n── 1414 · 4. les autres formes de « rien de visible » et les autres champs de texte ──');
for (const [nom, val] of [['espace insécable', '  '], ['espace de largeur nulle', '​​'], ['tabulation et saut de ligne', '\t\n '], ['espace fine', ' ']]) {
  const r = essai([champ({ name: 'nom', value: val, label: 'Nom *' })]); vrai(nom + ' → refusé', r.ecrit === 0 && r.e.stop === true); }
{ const r = essai([champ({ name: 'note', tag: 'TEXTAREA', type: 'textarea', value: CINQ, label: 'Note *' })]); vrai('un <textarea> required en espaces est refusé', r.ecrit === 0 && /« Note »/.test(r.toasts[0]), r.toasts); }
for (const t of ['search', 'tel', 'email', 'url']) { const r = essai([champ({ name: 'x', type: t, value: CINQ })]); vrai('type ' + t + ' : refusé', r.ecrit === 0); }
{ const r = essai([champ({ name: 'a', value: 'ok' }), champ({ name: 'b', value: CINQ, label: 'Deuxième *' })]); vrai('un seul champ fautif suffit, même après un champ correct', r.ecrit === 0 && /« Deuxième »/.test(r.toasts[0]), r.toasts); }
{ const b = monter(); const e = b.envoyer({ ecrit() {} }); vrai('une cible sans champs (pas un formulaire) ne casse rien', e.defaut === false); }

console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
process.exit(ko ? 1 : 0);
