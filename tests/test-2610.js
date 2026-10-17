/* test-2610 — LA PAGE D'OP MESSAGES SE COMPILE EN ENTIER (17 octobre 2026, fusion des correctifs d'octobre).

   ⛔ POURQUOI CE BANC EXISTE. Vingt et un lots de correctifs ont été écrits EN PARALLÈLE, chacun sur le même ancien
   code, puis fusionnés. Deux d'entre eux ont déclaré `phraseNonAjoutes`, deux autres `motRetire`, dans la MÊME portée
   du script de la page. Git a fusionné sans un conflit (les lignes étaient loin l'une de l'autre) ; le résultat est une
   SyntaxError au chargement : AUCUN script de la page ne s'exécute, OP MESSAGES est une page blanche.
   Et rien ne l'a vu :
     · `scripts/verifier-syntaxe.js` ne lit que les pages de la RACINE — ni `apercu/opmessages/`, ni `server-msg/public/` ;
     · les bancs d'OP MESSAGES extraient chacun SES fonctions dans un bac à sable : chacun a compilé sa tranche, aucun le tout ;
     · le générateur (`scripts/opmsg-public.js`) copie le script, il ne le compile pas.
   C'est le banc navigateur test-2600 (lot m20) qui a buté sur une page morte — sans pouvoir dire pourquoi.

   Ce banc compile (sans l'exécuter) le script ENTIER de la page source et celui que le service sert, et prouve sur une
   copie mutée qu'il voit une déclaration en double. Aucune dépendance, aucun réseau. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, d) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); } };

/* les scripts EN LIGNE d'une page (pas ceux d'un autre type : un bloc JSON n'est pas du code) */
function scriptsEnLigne(html) {
  const out = []; const re = /<script(\s[^>]*)?>([\s\S]*?)<\/script>/gi; let m;
  while ((m = re.exec(html))) {
    const attrs = m[1] || '';
    if (/\bsrc\s*=/.test(attrs)) continue;
    const type = (/\btype\s*=\s*["']?([^"'\s>]+)/i.exec(attrs) || [])[1];
    if (type && !/^(text|application)\/(javascript|ecmascript)$|^module$/i.test(type)) continue;
    out.push({ code: m[2], module: /^module$/i.test(type || '') });
  }
  return out;
}
/* compile sans exécuter : rend '' ou le message de l'erreur (une déclaration en double est une erreur ANTICIPÉE) */
function compile(code, nom) {
  try { new vm.Script(code, { filename: nom }); return ''; } catch (e) { return (e && e.name) + ': ' + (e && e.message); }
}

console.log('\n── 2610 · 1. la page source (apercu/opmessages/index.html) ──');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const S = scriptsEnLigne(PAGE);
const total = S.reduce((n, s) => n + s.code.length, 0);
vrai('(population) la page porte au moins un script en ligne, et le gros du code y est (> 200 000 signes)', S.length >= 1 && total > 200000, { scripts: S.length, signes: total });
vrai('aucun script de la page n\'est un module (le banc les compile comme des scripts classiques)', S.every(s => !s.module));
S.forEach((s, i) => vrai('le script en ligne n° ' + (i + 1) + ' (' + s.code.length + ' signes) se compile', compile(s.code, 'index.html#' + (i + 1)) === '', compile(s.code, 'index.html#' + (i + 1))));

console.log('\n── 2610 · 2. ce que le service sert (server-msg/public/) ──');
const UI = fs.readFileSync(path.join(RACINE, 'server-msg/public/opmsg-ui.js'), 'utf8');
vrai('(population) opmsg-ui.js est le script de la page (> 200 000 signes)', UI.length > 200000, UI.length);
vrai('opmsg-ui.js se compile', compile(UI, 'opmsg-ui.js') === '', compile(UI, 'opmsg-ui.js'));
for (const f of ['api.js', 'source-serveur.js', 'sw.js']) {
  const p = path.join(RACINE, 'server-msg/public', f);
  if (!fs.existsSync(p)) { vrai(f + ' existe', false); continue; }
  vrai(f + ' se compile', compile(fs.readFileSync(p, 'utf8'), f) === '', compile(fs.readFileSync(p, 'utf8'), f));
}
const SERVI = fs.readFileSync(path.join(RACINE, 'server-msg/public/index.html'), 'utf8');
vrai('la page servie n\'a plus de script en ligne (la politique du service est script-src \'self\' : tout est dans opmsg-ui.js)', scriptsEnLigne(SERVI).length === 0, scriptsEnLigne(SERVI).length);

console.log('\n── 2610 · 3. contre-épreuve : le banc VOIT une déclaration en double ──');
/* le défaut du 17 octobre, remis sur une COPIE : une seconde déclaration d'un nom déjà déclaré dans la même portée */
const ancre = UI.indexOf('  const motRetireMembre = ');
vrai('(population) la déclaration témoin est trouvée dans le script servi', ancre > 0, ancre);
if (ancre > 0) {
  const fin = UI.indexOf('\n', ancre);
  const ligneT = UI.slice(ancre, fin);
  const mute = UI.slice(0, fin + 1) + ligneT + '\n' + UI.slice(fin + 1);
  const err = compile(mute, 'opmsg-ui.js (muté)');
  vrai('une déclaration doublée dans la même portée est refusée (SyntaxError « already been declared »)', /SyntaxError/.test(err) && /already been declared/.test(err), err);
}
/* et les deux noms qu'on a dû séparer restent séparés */
const decl = (nom) => (UI.match(new RegExp('^\\s*(?:const|let|var|function)\\s+' + nom + '\\b', 'gm')) || []).length;
vrai('`phraseNonAjoutes` (la feuille « Nouveau groupe ») et `phraseRefusAjout` (« Ajouter au groupe ») : une déclaration chacune', decl('phraseNonAjoutes') === 1 && decl('phraseRefusAjout') === 1, [decl('phraseNonAjoutes'), decl('phraseRefusAjout')]);
vrai('`motRetire` (son propre retrait) et `motRetireMembre` (celui d\'un autre membre) : une déclaration chacune', decl('motRetire') === 1 && decl('motRetireMembre') === 1, [decl('motRetire'), decl('motRetireMembre')]);

console.log('\n════ test-2610 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
process.exit(ko ? 1 : 0);
