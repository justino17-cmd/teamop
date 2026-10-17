/* ══ OP MESSAGES — LA LIGNE SYSTÈME « AJOUTÉ » ET LE MOT DU RETRAIT DISENT JUSTE (lot m05 : groupes#7, groupes@10) ═════════════════════════════════
   · groupes#7 — la personne ajoutée lisait « Ana Martin a ajouté vous » : la ligne système `membre_ajoute` écrivait « a ajouté » + « vous ». La VRAIE fonction
     `texteSysteme` de `server-msg/public/source-serveur.js` est extraite et EXÉCUTÉE (estMoi / nomDe posés) : « Ana Martin vous a ajouté » pour celui qui est ajouté,
     « Vous avez ajouté Dan » pour celle qui ajoute, « Ana Martin a ajouté Dan » pour un tiers — et le retrait garde sa forme (« vous a retiré du groupe »).
   · groupes@10 — le mot qui suit « Retirer du groupe » (page) accordait au masculin quel que soit le prénom (« Cléo Petit a été retiré du groupe ») : il dit maintenant
     « … n'est plus dans le groupe », sans genre — la VRAIE fonction de la page est exécutée, et le geste l'emploie (population comptée).
   ⛔ Un motif de banc vise du CODE, jamais une phrase : les commentaires qui COMMENCENT une ligne sont retirés avant de chercher. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const RACINE = process.env.OPMSG_RACINE ? path.resolve(process.env.OPMSG_RACINE) : path.join(__dirname, '..');
const lire = f => fs.readFileSync(path.join(RACINE, f), 'utf8');
const sansCommentairesJs = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

/* le corps d'une fonction nommée, par comptage d'accolades */
function extraire(src, entete) {
  const i = src.indexOf(entete); if (i < 0) return '';
  let n = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const c = src[j]; if (c === '{') n++; else if (c === '}') { n--; if (!n) break; } }
  return src.slice(i, j + 1);
}

const SERV = lire('server-msg/public/source-serveur.js');
const PAGE = lire('apercu/opmessages/index.html'), SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1], JS = sansCommentairesJs(SCRIPT);

console.log('\nLa ligne système « membre_ajoute » (source-serveur.js)');
{
  const code = extraire(SERV, 'function texteSysteme(m, genre)');
  vrai('(population) la fonction `texteSysteme` est trouvée (' + code.length + ' caractères) et porte la ligne membre_ajoute', code.length > 800 && code.includes("case 'membre_ajoute'"));
  const NOMS = { ana: 'Ana Martin', dan: 'Dan Roux' };
  const ctx = { MOI: 'dan', estMoi: null, nomDe: null, duree: s => s + ' s', dateCourte: () => '', Number, Intl, console };
  ctx.estMoi = id => id === ctx.MOI; ctx.nomDe = id => ctx.estMoi(id) ? 'Vous' : NOMS[id] || 'Quelqu\'un';
  vm.createContext(ctx);
  let T1 = null;
  try { vm.runInContext(code + '\nthis.t = texteSysteme;', ctx, { timeout: 2000 }); T1 = ctx.t; } catch (e) { T1 = null; }
  vrai('(population) la fonction extraite s\'exécute dans un bac à sable', typeof T1 === 'function');
  if (T1) {
    const ajoute = (a, u) => T1({ meta: { k: 'membre_ajoute', uid: u }, auteur: a }, 'groupe');
    ctx.MOI = 'dan';
    v('⛔ Dan, que Ana vient d\'ajouter, lit « Ana Martin vous a ajouté » (jamais « a ajouté vous »)', ajoute('ana', 'dan'), 'Ana Martin vous a ajouté');
    ctx.MOI = 'ana';
    v('Ana, qui ajoute Dan, lit « Vous avez ajouté Dan Roux »', ajoute('ana', 'dan'), 'Vous avez ajouté Dan Roux');
    ctx.MOI = 'zoe';
    v('un tiers lit « Ana Martin a ajouté Dan Roux »', ajoute('ana', 'dan'), 'Ana Martin a ajouté Dan Roux');
    ctx.MOI = 'dan';
    v('(non régressé) le retrait garde sa forme : « Ana Martin vous a retiré du groupe »', T1({ meta: { k: 'membre_retire', uid: 'dan' }, auteur: 'ana' }, 'groupe'), 'Ana Martin vous a retiré du groupe');
    v('… et pour un canal : « du canal »', T1({ meta: { k: 'membre_retire', uid: 'dan' }, auteur: 'ana' }, 'canal'), 'Ana Martin vous a retiré du canal');
    v('⛔ aucune ligne système ne contient « a ajouté vous » ni « a retiré vous » (toutes les formes, tous les genres)',
      ['groupe', 'canal', 'reunion'].flatMap(g => ['membre_ajoute', 'membre_retire'].map(k => T1({ meta: { k, uid: 'dan' }, auteur: 'ana' }, g))).filter(t => /a (ajouté|retiré) vous/.test(t)), []);
  }
}

console.log('\nLe mot qui suit « Retirer du groupe » (page)');
{
  const m = /const motRetireMembre = [^\n]*/.exec(JS);
  vrai('(population) la page déclare `motRetireMembre` (le mot du retrait) et le geste « Gérer » l\'emploie', !!m && /retirerMembre\(id, uid\), v === 'admin' \? [^\n]*: motRetireMembre\(nom\)\)/.test(JS));
  let f = null;
  try { const ctx = {}; vm.createContext(ctx); vm.runInContext((m ? m[0] : '') + '\nthis.f = motRetireMembre;', ctx, { timeout: 1000 }); f = ctx.f; } catch (e) { f = null; }
  vrai('(population) la fonction `motRetireMembre` s\'exécute', typeof f === 'function');
  if (f) v('⛔ le mot ne s\'accorde pas au masculin : « Cléo Petit n\'est plus dans le groupe » (pour Cléo comme pour Ben)', [f('Cléo Petit'), f('Ben Roux')], ['Cléo Petit n\'est plus dans le groupe', 'Ben Roux n\'est plus dans le groupe']);
  vrai('⛔ le code de la page ne dit plus « a été retiré du groupe » (population : le geste « Retirer du groupe » existe encore)', !/a été retiré du groupe/.test(JS) && /libelle: 'Retirer du groupe'/.test(JS));
}
fin();
