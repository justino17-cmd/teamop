/* test-2995 — « Copier le résultat pour Claude » (onglet Examen de la Tour, v2.109, 24 octobre 2026).
   Justin copiait le résultat écran par écran pour que Claude Code le lise. Le bouton copie TOUT le résultat que le serveur a rendu
   (contrôles, verdicts, conversations). Le banc EXÉCUTE la vraie `exCopier` (extraite de tour.html, commentaires retirés avant de
   chercher) avec un faux presse-papiers, et vérifie que le bouton est bien dessiné dans `exResultatHtml`, sous l'en-tête du résultat. */
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = fs.readFileSync(path.join(__dirname, '..', 'tour.html'), 'utf8');
const CODE = SRC.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
let ok = 0, ko = 0;
const vrai = (m, c) => { if (c) { ok++; console.log('  ✓ ' + m); } else { ko++; console.log('  ✗ ' + m); } };
function fonction(nom) { const i = CODE.indexOf('\nfunction ' + nom + '('); if (i < 0) return null;
  let n = 0; for (let j = CODE.indexOf('{', i); j < CODE.length; j++) { if (CODE[j] === '{') n++; else if (CODE[j] === '}' && --n === 0) return CODE.slice(i + 1, j + 1); } return null; }
const fCop = fonction('exCopier'), fRes = fonction('exResultatHtml');
vrai('exCopier et exResultatHtml sont trouvées dans le code', !!fCop && !!fRes);
(async () => {
  const resultat = { id: 'ex-1', debut: 1761320000000, bilan: { ok: 4, ko: 5 }, scenarios: [{ n: 2, titre: 'Un travail à Camille', etat: 'echec', verifs: [{ etat: 'echec', libelle: 'Camille passe le travail' }], conversation: [{ de: 'justin', texte: 'Camille, prépare le devis' }] }] };
  const copie = [], toasts = [];
  const mk = refuse => ({ EX: { res: { 'ex-1': resultat } }, fmtDate: () => '24/10/2026 18:43', JSON, toast: t => toasts.push(t),
    navigator: { clipboard: { writeText: t => { if (refuse) return Promise.reject(new Error('non')); copie.push(t); return Promise.resolve(); } } } });
  const ctx = mk(false); vm.createContext(ctx); vm.runInContext(fCop, ctx);
  ctx.exCopier('ex-1'); await new Promise(r => setTimeout(r, 10));
  const t = copie[0] || '';
  vrai('le presse-papiers reçoit le résultat ENTIER, relisible (contrôles et conversation compris)', copie.length === 1 && JSON.stringify(JSON.parse(t.slice(t.indexOf('\n') + 1))) === JSON.stringify(resultat));
  vrai('   avec un titre daté en tête', /^Résultat de l’examen de l’équipe d’agents — 24\/10\/2026 18:43\n/.test(t));
  vrai('   et le geste le DIT', toasts.some(x => /Résultat copié/.test(x)));
  const ctx2 = mk(true); vm.createContext(ctx2); vm.runInContext(fCop, ctx2);
  ctx2.exCopier('ex-1'); await new Promise(r => setTimeout(r, 10));
  vrai('un presse-papiers refusé se DIT (pas de « copié » qui ment)', toasts.some(x => /Copie impossible/.test(x)) && toasts.filter(x => /Résultat copié/.test(x)).length === 1);
  const ctx3 = mk(false); ctx3.EX.res = {}; vm.createContext(ctx3); vm.runInContext(fCop, ctx3);
  const avant = copie.length; ctx3.exCopier('inconnu'); await new Promise(r => setTimeout(r, 10));
  vrai('un résultat pas encore lu : rien n’est copié', copie.length === avant);
  vrai('le bouton est dessiné dans exResultatHtml, avec l’identifiant du résultat affiché', /onclick="exCopier\(\\''\+esc\(id\)\+'\\'\)">📋 Copier le résultat pour Claude<\/button>/.test(fRes));
  console.log(`\ntest-2995 : ${ok} ✓ ${ko} ✗`); process.exit(ko ? 1 : 0);
})();
