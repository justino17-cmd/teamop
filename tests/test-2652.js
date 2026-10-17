/* ══ OP MESSAGES — RENOMMER UN GROUPE SE COMPTE COMME LE CRÉER : EN SIGNES, À 40 (lot p04 : groupes n#5) ═══════════════════════════════════════════════════
   La création d'un groupe coupe le nom à 40 SIGNES (points de code : `limiterNomGroupe`, lot m13). Le champ « Renommer » des Infos portait `maxlength="80"`, qui compte des unités UTF-16 : 40 émojis
   (80 unités) passaient, un texte ordinaire montait à 80 signes — deux règles et deux compteurs pour un même nom. Le renommage prend la règle et le compteur de la création (`limiterNomSignes`).
   Ce que ce banc garde — les VRAIES fonctions de la page :
     1. le champ « Renommer » n'a plus de `maxlength` (le balisage, lu dans le code sans ses commentaires) et son écouteur est posé sur `input` ET `compositionend` ;
     2. la coupe : 45 émojis donnent 40 émojis (pas 20), 90 lettres donnent 40, un nom court n'est pas touché, un signe n'est jamais coupé en deux ;
     3. pendant une composition on n'y touche pas, à sa fin on coupe ; un autre champ des Infos n'est jamais coupé ;
     4. la création garde sa règle (40 signes, `g().nom` suit) ;
     5. un nom déjà enregistré plus long que 40 signes n'est pas raboté sans que la personne y tape.
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
  const OUI = '😀'.repeat(45);
  v('(population) 45 émojis pèsent 90 unités UTF-16 et 45 signes — le cas que `maxlength="80"` coupait mal', [OUI.length, signes(OUI)], [90, 45]);
  v('⛔ 45 émojis tapés : 40 SIGNES gardés (comme à la création), pas 40 unités ni 80', signes(evt(OUI)), 40);
  v('…et le dernier signe est entier (aucun demi-signe)', Array.from(evt(OUI)).every(c => c === '😀'), true);
  v('⛔ 90 lettres : 40 gardées (le renommage ne laisse plus passer 80)', evt('x'.repeat(90)).length, 40);
  v('40 lettres exactement : gardées ; 41 : la 41e est refusée', [evt('b'.repeat(40)).length, evt('b'.repeat(41)).length], [40, 40]);
  v('un nom court n\'est pas touché', evt('Chantier Sud'), 'Chantier Sud');
  v('des accents et du chinois comptent un signe chacun', [signes(evt('é'.repeat(60))), signes(evt('字'.repeat(60)))], [40, 40]);
  const creation = { value: OUI }; F.creation(creation);
  v('(création, inchangée) 45 émojis : 40 signes, et `g().nom` suit', [signes(creation.value), ctx.__g.nom === creation.value], [40, true]);
  ctx.__g.nom = 'avant';
  evt('y'.repeat(90));
  v('⛔ le renommage n\'écrit JAMAIS dans le brouillon de la création (`g().nom`)', ctx.__g.nom, 'avant');

  console.log('\n3. Composition et autres champs');
  v('⛔ pendant une composition (clavier chinois, accents morts) : rien n\'est coupé', evt('z'.repeat(90), { isComposing: true }).length, 90);
  v('à la fin de la composition (`compositionend`) : coupé', evt('z'.repeat(90), { type: 'compositionend' }).length, 40);
  const autre = { id: 'cn-renom', value: 'k'.repeat(90) }; F.renommage({ type: 'input', isComposing: false, target: autre });
  v('un autre champ des Infos (le canal) n\'est jamais coupé par cet écouteur', autre.value.length, 90);
  let plante = null; try { F.renommage({ type: 'input', isComposing: false, target: null }); } catch (e) { plante = e.message; }
  v('un événement sans cible ne fait pas jeter l\'écouteur', plante, null);

  console.log('\n4. Un nom déjà enregistré plus long');
  const ancien = { id: 'gr-renom', value: 'n'.repeat(70) };
  v('(population) un nom de 70 signes a été enregistré avant la règle (le service en accepte 80) ; un événement sur un AUTRE champ ne le touche pas', [(F.renommage({ type: 'input', isComposing: false, target: { id: 'ev-titre', value: '' } }), ancien.value.length), signes(ancien.value)], [70, 70]);
  F.renommage({ type: 'input', isComposing: false, target: ancien });
  v('dès qu\'on y tape, il est ramené à 40 signes (la règle de la création)', ancien.value.length, 40);
  fin();
}
