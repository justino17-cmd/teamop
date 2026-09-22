/* ══════════════════════════════════════════════════════════════════════════════════════
   test-770 — TOUTE LA RANGÉE DE FORMULAIRE RÉPOND AU DOIGT

   Trouvé le 22 septembre 2026 par l'audit des écrans PROFONDS, règles relues par
   CSS.getMatchedStylesForNode : dans les 179 rangées `.frow` (le formulaire façon Réglages
   d'iOS — libellé, champ nu, filet), `.frow > input{padding:0;border:none}` réduisait le
   champ à sa seule ligne de texte : 17 px dans une rangée de 46 à 74. Et aucun gestionnaire
   ne faisait suivre le tap. Au doigt, toucher la rangée à côté du texte n'ouvrait pas le
   clavier — sur l'Intervention, la Box, le Produit, le Bon, le Compte-rendu, le Devis…

   Deux moitiés, et ce banc garde les deux :
   · le CSS agrandit la zone du champ lui-même, sans bouger la mise en page (rembourrage
     rendu par une marge négative) — ⚠️ VERS LE BAS SEULEMENT sous un libellé : la première
     version s'étendait aussi vers le haut, mordait la ligne du libellé, et un doigt posé sur
     « Date et heure » ouvrait le premier de deux champs. La contre-épreuve l'a attrapé ;
   · un écouteur fait suivre le tap du reste de la cellule (le libellé est un <span>, pas un
     <label>) — et il sait REFUSER : une rangée à deux champs, une rangée qui a son propre
     geste, un champ désactivé.
   ⛔ L'écouteur est EXTRAIT de la page et EXÉCUTÉ sur des rangées simulées : un droit se
   mesure à ce qu'il laisse passer, pas au texte qui le nomme.
   Mesuré au navigateur, vrais événements tactiles : 3 libellés sur 3 ouvrent leur champ,
   rangées 74/74/73 px avant comme après, les deux contre-épreuves injectées tiennent.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ ' + f + ' ══\n');
  const SRC = nu(fs.readFileSync(path.join(RACINE, f), 'utf8'));
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(SRC));

  /* ── 1. le CSS : la zone du champ grandit, la mise en page non ── */
  vrai('⛔ sous un libellé, le champ ne s’étend QUE vers le bas',
    /\.frow > input:not\(\[type=checkbox\]\):not\(\[type=radio\]\):not\(\[type=hidden\]\),\s*html\[data-refonte\] \.frow > select\{padding-bottom:12px!important;margin-bottom:-12px!important\}/.test(SRC));
  vrai('⛔ … et JAMAIS vers le haut (il mordrait la ligne du libellé)',
    !/\.frow > select\{[^}]*padding-top:12px/.test(SRC));
  vrai('à côté d’un libellé (.frow-val), les deux sens',
    /\.frow-val > select\{padding-top:12px!important;padding-bottom:12px!important;\s*margin-top:-12px!important;margin-bottom:-12px!important\}/.test(SRC));

  /* ── 2. l'écouteur : on l'EXTRAIT et on l'EXÉCUTE ── */
  const d = SRC.indexOf("document.addEventListener('click',function(e){\n  const t=e.target; if(!t||!t.closest) return;\n  const r=t.closest('.frow');");
  vrai('population : l’écouteur de la rangée est trouvé', d > 0);
  const fin = SRC.indexOf('\n});', d);
  const corps = d > 0 ? SRC.slice(SRC.indexOf('{', d) + 1, fin) : '';
  vrai('population : son corps est extrait', corps.length > 300, corps.length + ' caractères');
  const gerer = new Function('e', corps);

  /* un mini-DOM : juste ce que l'écouteur interroge */
  const el = (tag, o = {}) => Object.assign({ tagName: tag, parent: null, focused: 0, picked: 0, disabled: false, readOnly: false, attrs: {},
    focus() { this.focused++; }, showPicker() { this.picked++; } }, o);
  const correspond = (n, sel) => sel.split(',').some(s => { s = s.trim();
    if (s === '.frow') return n.cls === 'frow';
    if (s === '[onclick]') return !!n.attrs.onclick;
    if (s === '.chip') return n.cls === 'chip';
    if (s.startsWith('[contenteditable')) return false;
    return n.tagName.toLowerCase() === s; });
  const cablage = n => { n.closest = function (sel) { let x = this; while (x) { if (correspond(x, sel)) return x; x = x.parent; } return null; }; return n; };
  const rangee = (champs, o = {}) => { const r = cablage(el('DIV', { cls: 'frow', ...o })); const lbl = cablage(el('SPAN', { parent: r }));
    champs.forEach(c => { c.parent = r; cablage(c); }); r.querySelectorAll = () => champs; return { r, lbl, champs }; };

  { const c = el('INPUT'); const { lbl } = rangee([c]); gerer({ target: lbl });
    vrai('⛔ un doigt sur le libellé ouvre le champ de la rangée', c.focused === 1); }
  { const a = el('INPUT'), b = el('INPUT'); const { lbl } = rangee([a, b]); gerer({ target: lbl });
    vrai('⛔ … mais pas dans une rangée à DEUX champs (lequel ouvrir ?)', a.focused + b.focused === 0); }
  { const c = el('INPUT'); const { lbl } = rangee([c], { attrs: { onclick: 'x()' } }); gerer({ target: lbl });
    vrai('⛔ … ni dans une rangée qui a son propre geste', c.focused === 0); }
  { const c = el('INPUT', { disabled: true }); const { lbl } = rangee([c]); gerer({ target: lbl });
    vrai('⛔ … ni sur un champ désactivé', c.focused === 0); }
  { const c = el('INPUT'); const { lbl } = rangee([c]); gerer({ target: c });
    vrai('… et il ne se mêle pas d’un tap posé SUR le champ (le navigateur s’en charge)', c.focused === 0); }
  { const s = el('SELECT'); const { lbl } = rangee([s]); gerer({ target: lbl });
    vrai('un menu déroulant s’ouvre, pas seulement se sélectionne', s.focused === 1 && s.picked === 1); }
}

console.log('\n═══ test-770 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
