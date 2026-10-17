/* ══ test-2522 — LE LIEN D'INVITATION D'UN GROUPE DONT ON FAIT DÉJÀ PARTIE ═══════════════════════════════════════════════════════════════════════════════
   Revue de la bêta (lot m04, groupes#5). Un membre qui ouvre le lien d'invitation de SON groupe lisait « Déjà dans tes contacts » : le toast de « Accepter l'invitation » ne connaissait
   que les contacts (`mot(r.deja ? 'Déjà dans tes contacts' : …)` sans regarder `r.genre`). La source rend bien `{ genre: 'groupe', deja: true }` ; la conversation s'ouvrait bien.

   Ce que ce banc garde — les VRAIES fonctions de la page :
     1. `motLienAccepte` : les quatre cas (groupe neuf, groupe déjà membre, contact neuf, contact déjà là) ;
     2. l'ÉCOUTEUR réel, branche « lien-accepter » : il passe par ce mot, et ouvre la conversation rendue par la source.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const T = require('./outils-msg');
const O = require('./outils-infos-msg');
const { v, vrai, fin } = T.compteur();

(async () => {
  console.log('\n0. La population');
  v('(population) aucune pièce ne manque', O.manquantes(['motLienAccepte']), []);
  vrai('(population) l\'écouteur des gestes des Infos est trouvé', !!O.ECOUTEUR);

  console.log('\n1. motLienAccepte : ce que dit le toast');
  const F = O.bac().F;
  vrai('la fonction existe', typeof F.motLienAccepte === 'function');
  if (typeof F.motLienAccepte === 'function') {
    v('un groupe qu\'on rejoint', F.motLienAccepte({ genre: 'groupe', deja: false, conv: 'c_g' }), 'Tu as rejoint le groupe');
    v('⛔ un groupe dont on est DÉJÀ membre ne parle pas de contacts', F.motLienAccepte({ genre: 'groupe', deja: true, conv: 'c_g' }), 'Tu fais déjà partie de ce groupe');
    v('un contact ajouté', F.motLienAccepte({ genre: 'contact', deja: false, conv: 'c_d' }), 'Contact ajouté');
    v('un contact déjà là', F.motLienAccepte({ genre: 'contact', deja: true, conv: 'c_d' }), 'Déjà dans tes contacts');
  }

  console.log('\n2. L\'écouteur réel, branche « lien-accepter »');
  for (const [r, mot] of [
    [{ genre: 'groupe', deja: true, conv: 'c_g' }, 'Tu fais déjà partie de ce groupe'],
    [{ genre: 'groupe', deja: false, conv: 'c_g' }, 'Tu as rejoint le groupe'],
    [{ genre: 'contact', deja: true, conv: 'c_d' }, 'Déjà dans tes contacts'],
    [{ genre: 'contact', deja: false, conv: 'c_d' }, 'Contact ajouté'],
  ]) {
    const B = O.bac();
    const codes = [];
    B.source.accepterLien = async code => { codes.push(code); return r; };
    await B.clic('lien-accepter', { code: 'abc' });
    v('(' + r.genre + (r.deja ? ', déjà' : ', neuf') + ') le toast dit « ' + mot + ' »', B.J.mots, [mot]);
    v('(' + r.genre + (r.deja ? ', déjà' : ', neuf') + ') la conversation s\'ouvre, le code vient du bouton', [B.J.ouverts, codes], [[r.conv], ['abc']]);
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort :', e); process.exitCode = 1; fin(); });
