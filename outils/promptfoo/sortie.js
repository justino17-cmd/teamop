/* LA FORME COMMUNE DE CE QUE « DIT » UN AGENT : son texte, puis une ligne par outil appelé (28 octobre 2026).
 *
 * Le fournisseur (`fournisseur-teamop.js`) écrit cette forme, les assertions (`assertions.js`) la relisent — UNE définition, pour que l'écriture et la lecture ne
 * divergent jamais (la leçon de CLAUDE.md sur l'appareil et le serveur qui « ne se parlent pas » : chacun juste, séparément). Un appel d'outil est ce que le modèle
 * DEMANDE ; le code des agents le valide ensuite (`agent-equipe.js`), jamais ici : on évalue le jugement du modèle, pas la garde qui le rattrape.
 */
'use strict';

const LIGNE_OUTIL = /^\[OUTIL ([a-z_]{1,40})\] (\{.*\})\s*$/;

function ecrireSortie(reponse) {
  const texte = String(reponse && reponse.texte || '').trim();
  const actions = Array.isArray(reponse && reponse.actions) ? reponse.actions : [];
  const lignes = actions.map(a => '[OUTIL ' + String(a.nom) + '] ' + JSON.stringify(a.entree && typeof a.entree === 'object' ? a.entree : {}));
  return [texte].concat(lignes).filter(x => x !== '').join('\n');
}

/* → { texte, outils:[{nom, entree}] } — le texte est tout ce qui n'est pas une ligne d'outil */
function lireSortie(sortie) {
  const texte = [], outils = [];
  for (const l of String(sortie == null ? '' : sortie).split('\n')) {
    const m = LIGNE_OUTIL.exec(l);
    if (m) { try { outils.push({ nom: m[1], entree: JSON.parse(m[2]) }); continue; } catch (e) { /* une ligne d'outil illisible reste du texte : elle se verra */ } }
    texte.push(l);
  }
  return { texte: texte.join('\n').trim(), outils };
}

module.exports = { ecrireSortie, lireSortie, LIGNE_OUTIL };
