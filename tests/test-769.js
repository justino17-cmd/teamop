/* ══════════════════════════════════════════════════════════════════════════════════════
   test-769 — UN NOM LOCAL NE RÉEMPLOIE JAMAIS LE NOM DE CE QU'IL ENVELOPPE

   Trouvé le 22 septembre 2026 par l'audit des écrans PROFONDS (un vrai clic sur « Tout le
   catalogue · 6 mois » dans Mouvements de stock) : RangeError, « Maximum call stack size
   exceeded », pile de 200 cadres tous identiques — roleLbl.

   La cause tenait en une ligne, dans consoAnalyseHTML (l'analyse de Consommation produits) :
       const roleLbl=r=>roleLbl(r)||'Rôle non renseigné';
   Une constante LOCALE du même nom que la fonction globale. Dans son propre corps, `roleLbl`
   ne désigne pas la globale : il désigne la constante elle-même. Récursion infinie dès que
   l'analyse devait écrire le rôle d'une personne.
   ⛔ ENTRÉE EN v613, TOUJOURS PRÉSENTE DANS LA 695 SERVIE AUX CLIENTS. Personne ne l'a vue
   parce qu'elle ne se déclenche qu'avec des données qui portent des rôles, sur un écran
   profond — c'est exactement ce que l'audit des rubriques ne pouvait pas atteindre.

   Ce banc cherche la FORME, partout : toute fonction fléchée locale qui s'appelle elle-même
   dans son propre corps et qui porte le nom d'une fonction globale. Et il se prouve deux
   fois avant de croire son zéro : sur un exemple fabriqué, et sur la ligne fautive réelle.
   ══════════════════════════════════════════════════════════════════════════════════════ */
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d ? '  → ' + d : '')); } };
const nu = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

function masquages(src) {
  const S = nu(src);
  const globales = new Set([...S.matchAll(/^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/gm)].map(m => m[1]));
  const re = /(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)|[A-Za-z_$][\w$]*)\s*=>\s*([^;\n]{0,160})/g;
  let m, n = 0; const trouves = [];
  while ((m = re.exec(S))) {
    n++;
    const nom = m[1], corps = m[2];
    const soi = new RegExp('(^|[^\\w$.])' + nom.replace(/\$/g, '\\$') + '\\s*\\(');
    if (soi.test(corps) && globales.has(nom)) trouves.push(m[0].slice(0, 90));
  }
  return { n, globales: globales.size, trouves };
}

console.log('\n══ 1. LE DÉTECTEUR SE PROUVE AVANT QU’ON LE CROIE ══\n');
{
  const fabrique = 'function roleLbl(k){ return k; }\nfunction ecran(){\n  const roleLbl=r=>roleLbl(r)||"x";\n  return roleLbl("a");\n}\n';
  vrai('⛔ il attrape la forme fautive sur un exemple fabriqué', masquages(fabrique).trouves.length === 1);
  const sain = 'function roleLbl(k){ return k; }\nfunction ecran(){\n  const roleNom=r=>roleLbl(r)||"x";\n  return roleNom("a");\n}\n';
  vrai('… et ne crie pas sur la forme corrigée', masquages(sain).trouves.length === 0);
  const recursionLocale = 'function f(){ const fact=n=>n<2?1:n*fact(n-1); return fact(5); }\n';
  vrai('… ni sur une récursion LOCALE voulue (le nom ne masque aucune globale)', masquages(recursionLocale).trouves.length === 0);
}

for (const f of ['app.html', 'beta.html']) {
  console.log('\n══ 2. ' + f + ' ══\n');
  const src = fs.readFileSync(path.join(RACINE, f), 'utf8');
  vrai('population : le nettoyage n’a rien avalé (saveVehicule survit)', /function saveVehicule/.test(nu(src)));
  const r = masquages(src);
  vrai('population : au moins 300 fonctions fléchées locales examinées', r.n >= 300, r.n + ' examinées');
  vrai('population : au moins 1 500 fonctions globales connues', r.globales >= 1500, r.globales + ' connues');
  vrai('⛔ aucune fonction fléchée locale ne s’appelle elle-même sous le nom d’une globale',
    r.trouves.length === 0, r.trouves.join(' | '));
  /* et le correctif précis : l'analyse de consommation passe par un nom à elle */
  const d = nu(src).indexOf('function consoAnalyseHTML(){');
  const corps = d > 0 ? nu(src).slice(d, nu(src).indexOf('\nfunction ', d + 10)) : '';
  vrai('population : consoAnalyseHTML est trouvée', corps.length > 2000, corps.length + ' caractères');
  vrai('⛔ elle enveloppe la globale sous un AUTRE nom (roleNom)', /const roleNom=r=>roleLbl\(r\)\|\|'Rôle non renseigné';/.test(corps));
  vrai('⛔ … et n’appelle plus roleLbl qu’une seule fois : dans roleNom', (corps.match(/roleLbl\(/g) || []).length === 1,
    (corps.match(/roleLbl\(/g) || []).length + ' appel(s)');
}

console.log('\n═══ test-769 : ' + ok + ' ✓ ' + ko + ' ✗ ═══\n');
process.exit(ko ? 1 : 0);
