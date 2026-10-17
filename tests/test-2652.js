/* ══ OP MESSAGES — RENOMMER UN GROUPE SE COMPTE EN SIGNES, À LA LIMITE DU SERVICE (80) (lot p04 : groupes n#5) ═════════════════════════════════════════════
   Le champ « Renommer » des Infos portait `maxlength="80"`, qui compte des unités UTF-16 : 40 émojis (80 unités) passaient, un texte ordinaire montait à 80 signes. Le défaut est l'UNITÉ, pas la limite :
   le service accepte 80 SIGNES (`Array.from(nom).length <= 80`, routes.js) et c'est la limite que l'utilisateur connaît du renommage (m04). La création, elle, coupe à 40 (`NOM_GROUPE_MAX`, m13) — une
   différence qui n'est pas à corriger ici (décision de produit, Justin). ⛔ Une première version de ce lot ramenait le renommage à 40 : la relecture l'a refusée (raccourcir ce qu'on connaît, rogner
   un nom de 41 à 80 signes dès la première frappe). Le compteur est partagé (`limiterNomSignes`), la limite du renommage est `NOM_RENOMMAGE_MAX`.
   Ce que ce banc garde — les VRAIES fonctions de la page :
     1. le champ « Renommer » n'a plus de `maxlength` (le balisage, lu dans le code sans ses commentaires) et son écouteur est posé sur `input` ET `compositionend` ;
     2. la coupe : 90 émojis donnent 80 émojis (pas 40), 90 lettres donnent 80 (comme avant), un nom court n'est pas touché, un signe n'est jamais coupé en deux ;
     3. pendant une composition on n'y touche pas, à sa fin on coupe ; un autre champ des Infos n'est jamais coupé ;
     4. la création garde sa règle (40 signes, `g().nom` suit) ;
     5. ⛔ rien n'est raccourci : un nom enregistré de 41 à 80 signes (lettres OU émojis) reste entier quand on y tape ; la limite du renommage est celle du service (lue dans routes.js).
   ⛔ Une absence se prouve sur une population : chaque morceau de la page est exigé trouvé avant de croire un contrôle. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const PAGE = fs.readFileSync(path.join(RACINE, 'apercu/opmessages/index.html'), 'utf8');
const JS = ((/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1]).replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const tranche = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i >= 0 && j > i ? JS.slice(i, j) : ''; };
const jusqua = (debut, finTexte) => { const i = JS.indexOf(debut), j = i < 0 ? -1 : JS.indexOf(finTexte, i); return i >= 0 && j > i ? JS.slice(i, j + finTexte.length) : ''; };

console.log('\n0. La population');
const M = {
  commun: tranche('const NOM_GROUPE_MAX', "$('g-nom').addEventListener('input'"),
  renommage: jusqua('const limiterRenommage = ', '\n  };'),
};
vrai('(population) la règle de la création est trouvée (NOM_GROUPE_MAX, limiterNomGroupe)', !!M.commun && /limiterNomGroupe/.test(M.commun));
const iChamp = JS.indexOf('id="gr-renom"');
const champ = iChamp > 0 ? JS.slice(JS.lastIndexOf('<input', iChamp), JS.indexOf('>', iChamp) + 1) : '';
vrai('(population) le champ « Renommer » est trouvé dans le balisage', /type="text"/.test(champ) && /aria-label="Nom du groupe"/.test(champ));

console.log('\n1. Le balisage et l\'écouteur');
vrai('⛔ le champ n\'a PLUS de `maxlength` (il comptait des unités UTF-16, 40 émojis pour 80)', champ !== '' && !/maxlength/.test(champ));
vrai('⛔ l\'écouteur est posé sur `input` ET sur `compositionend` du corps des Infos', /\$\('info-corps'\)\.addEventListener\('input', limiterRenommage\)/.test(JS) && /\$\('info-corps'\)\.addEventListener\('compositionend', limiterRenommage\)/.test(JS));

console.log('\n2. La coupe, par les vraies fonctions');
const ctx = { Array, String, console, g: () => ctx.__g }; vm.createContext(ctx);
ctx.__g = { nom: '' };
let F = null;
try {
  // la création a besoin de `g()` : on lui donne un état de feuille ; le renommage n'y touche pas
  vm.runInContext((M.commun || '') + '\n' + (M.renommage || '') + '\nthis.F = { creation: typeof limiterNomGroupe === "function" ? limiterNomGroupe : null, renommage: typeof limiterRenommage === "function" ? limiterRenommage : null };', ctx);
  F = ctx.F;
} catch (e) { console.log('  ✗ ' + e.message); }
vrai('(population) le bac à sable exécute la vraie règle de création et le vrai écouteur de renommage', !!F && typeof F.creation === 'function' && typeof F.renommage === 'function');
if (!F || !F.renommage) { fin(); } else {
  const evt = (valeur, extra = {}) => { const cible = { id: 'gr-renom', value: valeur }; F.renommage(Object.assign({ type: 'input', isComposing: false, target: cible }, extra)); return cible.value; };
  const signes = s => Array.from(s).length;
  const OUI = '😀'.repeat(90);
  v('(population) 90 émojis pèsent 180 unités UTF-16 et 90 signes — le cas que `maxlength="80"` coupait mal (40 émojis)', [OUI.length, signes(OUI)], [180, 90]);
  v('⛔ 90 émojis tapés : 80 SIGNES gardés (la limite du service), pas 40', signes(evt(OUI)), 80);
  v('…et le dernier signe est entier (aucun demi-signe)', Array.from(evt(OUI)).every(c => c === '😀'), true);
  v('⛔ 45 émojis tapés : tous gardés (avant : 40 seulement)', signes(evt('😀'.repeat(45))), 45);
  v('90 lettres : 80 gardées (comme avant — la limite ne bouge pas)', evt('x'.repeat(90)).length, 80);
  v('80 lettres exactement : gardées ; 81 : la 81e est refusée', [evt('b'.repeat(80)).length, evt('b'.repeat(81)).length], [80, 80]);
  v('un nom court n\'est pas touché', evt('Chantier Sud'), 'Chantier Sud');
  v('des accents et du chinois comptent un signe chacun', [signes(evt('é'.repeat(100))), signes(evt('字'.repeat(100)))], [80, 80]);
  const creation = { value: '😀'.repeat(45) }; F.creation(creation);
  v('(création, inchangée) 45 émojis : 40 signes, et `g().nom` suit', [signes(creation.value), ctx.__g.nom === creation.value], [40, true]);
  ctx.__g.nom = 'avant';
  evt('y'.repeat(90));
  v('⛔ le renommage n\'écrit JAMAIS dans le brouillon de la création (`g().nom`)', ctx.__g.nom, 'avant');

  console.log('\n3. Composition et autres champs');
  v('⛔ pendant une composition (clavier chinois, accents morts) : rien n\'est coupé', evt('z'.repeat(120), { isComposing: true }).length, 120);
  v('à la fin de la composition (`compositionend`) : coupé', evt('z'.repeat(120), { type: 'compositionend' }).length, 80);
  const autre = { id: 'cn-renom', value: 'k'.repeat(120) }; F.renommage({ type: 'input', isComposing: false, target: autre });
  v('un autre champ des Infos (le canal) n\'est jamais coupé par cet écouteur', autre.value.length, 120);
  let plante = null; try { F.renommage({ type: 'input', isComposing: false, target: null }); } catch (e) { plante = e.message; }
  v('un événement sans cible ne fait pas jeter l\'écouteur', plante, null);

  console.log('\n4. Rien n\'est raccourci : un nom déjà enregistré de 41 à 80 signes');
  const ancien = { id: 'gr-renom', value: 'n'.repeat(70) };
  F.renommage({ type: 'input', isComposing: false, target: ancien });
  v('⛔ un nom de 70 lettres (le service en accepte 80) reste entier dès qu\'on y tape — la relecture refusait de le ramener à 40', ancien.value.length, 70);
  const ancienEmoji = { id: 'gr-renom', value: '🙂'.repeat(60) };
  F.renommage({ type: 'input', isComposing: false, target: ancienEmoji });
  v('⛔ un nom de 60 émojis reste entier (avant : 40)', signes(ancienEmoji.value), 60);
  const SERVICE = fs.readFileSync(path.join(RACINE, 'server-msg/routes.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
  const limites = [...SERVICE.matchAll(/Array\.from\(nom\)\.length > (\d+)/g)].map(m => Number(m[1]));
  v('(population) le service pose sa limite de nom de groupe à deux endroits (création et renommage), la même', limites.length >= 2 && limites.every(n => n === limites[0]), true);
  v('⛔ la limite du renommage de la page est celle du service (lue dans routes.js, pas recopiée à la main)', evt('q'.repeat(limites[0] + 20)).length, limites[0]);
  fin();
}
