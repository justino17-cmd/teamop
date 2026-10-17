/* ══ test-1523 — « RANGER DANS » SUR LA CONVERSATION OUVERTE ═════════════════════════════════════════════════════════════════════════════════════════════
   Revue de la bêta (lot m04, conversations#4). Le principe est écrit dans le code (`ouvrirConv`, `changerMode`) : la conversation ouverte est toujours dans la liste qu'on voit. « Ranger dans
   Pro » depuis les Infos de la conversation OUVERTE (côté Perso) la rangeait de l'autre côté : elle quittait la liste affichée mais restait ouverte à droite, la bascule Perso / Pro ne bougeait pas
   (à raison : le côté est une préférence du compte), et le toast disait « Rangée dans Pro » devant une conversation toujours là.
   Le correctif relit la liste (elle porte le côté) puis FERME la conversation, comme le fait « Bloquer ce contact » — sans `changerMode`.

   Ce que ce banc garde — l'ÉCOUTEUR réel (branche « cote ») et `apresChoixInfo`, dans un bac à sable :
     · rangée de l'autre côté, elle se ferme (`remplacer` vers la liste, feuille comprise) ; ⛔ l'application NE change PAS de côté (`changerMode` jamais appelé) ;
     · l'ORDRE : le rangement part, puis la liste est relue, puis la conversation se ferme ; le toast reste « Rangée dans Pro » ;
     · ⛔ les cas où elle NE se ferme PAS (la contre-épreuve) : rangée dans le côté où l'on est ; les Infos ouvertes sur une conversation qui n'est pas celle qu'on regarde ; les côtés éteints
       (`modesActifs` faux) ; « Automatique » qui retombe sur le côté d'ici ; la conversation absente de la liste relue ; un rangement refusé par le service (rien ne se ferme, le refus se dit).
   Code 0 si tout passe, 1 sinon. */
'use strict';
const T = require('./outils-msg');
const O = require('./outils-infos-msg');
const { v, vrai, fin } = T.compteur();
const LISTE = { vue: 'messages', conv: null, feuille: false, photo: null, appel: null };

/* un geste « Ranger dans » : on touche la ligne (le menu s'ouvre), on choisit `valeur` ; `apres` est la liste que le service rend ensuite */
async function ranger(opts, valeur, apres, avant = { valeur: 'auto', auto: 'perso' }) {
  const B = O.bac(opts);
  B.source.rangerCote = async (id, cote) => { B.J.appels.push('rangerCote:' + id + ':' + cote); };      // le même journal que `rafraichirListe` : il garde l'ORDRE des deux
  B.listeApres = apres;
  await B.clic('cote', avant);
  vrai('(population) le menu « Ranger dans » est ouvert, avec ses trois choix', B.J.deroule && B.J.deroule.items.filter(x => x && x.valeur).length === 3);
  const motsAvant = B.J.mots.length;
  B.J.deroule.cb(valeur);
  await Promise.all(B.promesses.splice(0));
  return { B, ordre: B.J.appels.slice(), mots: B.J.mots.slice(motsAvant) };
}

(async () => {
  console.log('\n0. La population');
  v('(population) aucune pièce ne manque', O.manquantes(['apresChoixInfo', 'coteDe']), []);
  vrai('(population) l\'écouteur des gestes des Infos est trouvé', !!O.ECOUTEUR);

  console.log('\n1. Rangée de l\'autre côté : la conversation ouverte se ferme');
  {
    const r = await ranger({ conv: 'c_ab', mode: 'perso', conversations: [{ id: 'c_ab', cote: 'perso' }] }, 'pro', [{ id: 'c_ab', cote: 'pro' }]);
    v('elle se ferme : retour à la liste, feuille fermée', r.B.J.remplacer, [LISTE]);
    v('⛔ l\'application ne change pas de côté (c\'est une préférence du compte)', r.B.J.changerMode, []);
    v('l\'ordre : le rangement part, puis la liste est relue', r.ordre, ['rangerCote:c_ab:pro', 'rafraichirListe']);
    v('le toast reste « Rangée dans Pro »', r.mots, ['Rangée dans Pro']);
    v('la liste relue est celle qui décide (le côté est lu DEDANS)', r.B.etat.conversations, [{ id: 'c_ab', cote: 'pro' }]);
  }
  {
    const r = await ranger({ conv: 'c_ab', mode: 'pro', conversations: [{ id: 'c_ab', cote: 'pro' }] }, 'perso', [{ id: 'c_ab', cote: 'perso' }], { valeur: 'pro', auto: 'perso' });
    v('dans l\'autre sens (Pro → Perso) elle se ferme aussi', r.B.J.remplacer, [LISTE]);
  }
  {
    const r = await ranger({ conv: 'c_ab', mode: 'perso', conversations: [{ id: 'c_ab', cote: 'pro' }] }, 'auto', [{ id: 'c_ab', cote: 'pro' }], { valeur: 'pro', auto: 'pro' });
    v('« Automatique » qui retombe de l\'autre côté la ferme aussi', [r.B.J.remplacer, r.mots], [[LISTE], ['Rangée automatiquement (Pro)']]);
  }

  console.log('\n2. Les cas où elle reste ouverte (la contre-épreuve)');
  {
    const r = await ranger({ conv: 'c_ab', mode: 'pro', conversations: [{ id: 'c_ab', cote: 'pro' }] }, 'pro', [{ id: 'c_ab', cote: 'pro' }], { valeur: 'auto', auto: 'pro' });
    v('rangée dans le côté où l\'on est : elle reste ouverte', r.B.J.remplacer, []);
    vrai('(population) le rangement a bien eu lieu', r.ordre.includes('rangerCote:c_ab:pro'));
  }
  {
    const r = await ranger({ conv: 'c_ab', ouverte: null, mode: 'perso', conversations: [{ id: 'c_ab', cote: 'perso' }] }, 'pro', [{ id: 'c_ab', cote: 'pro' }]);
    v('Infos ouvertes sans que la conversation le soit (depuis Contacts) : on ne ferme rien', r.B.J.remplacer, []);
  }
  {
    const r = await ranger({ conv: 'c_ab', ouverte: 'c_autre', mode: 'perso', conversations: [{ id: 'c_ab', cote: 'perso' }] }, 'pro', [{ id: 'c_ab', cote: 'pro' }]);
    v('une AUTRE conversation est ouverte derrière : on ne la ferme pas', r.B.J.remplacer, []);
  }
  {
    const r = await ranger({ conv: 'c_ab', mode: 'perso', modesActifs: false, conversations: [{ id: 'c_ab', cote: 'perso' }] }, 'pro', [{ id: 'c_ab', cote: 'pro' }]);
    v('les deux côtés éteints : un seul fil, rien ne se ferme', r.B.J.remplacer, []);
  }
  {
    const r = await ranger({ conv: 'c_ab', mode: 'perso', conversations: [{ id: 'c_ab', cote: 'perso' }] }, 'pro', []);
    v('la conversation n\'est plus dans la liste relue : on ne devine pas, rien ne se ferme', r.B.J.remplacer, []);
  }
  {
    const B = O.bac({ conv: 'c_ab', mode: 'perso', conversations: [{ id: 'c_ab', cote: 'perso' }] });
    B.source.rangerCote = async () => { const er = new Error('refus'); er.phrase = 'Le rangement n\'a pas pu se faire.'; throw er; };
    B.listeApres = [{ id: 'c_ab', cote: 'pro' }];
    await B.clic('cote', { valeur: 'auto', auto: 'perso' });
    B.J.deroule.cb('pro'); await Promise.all(B.promesses.splice(0));
    v('un rangement refusé : rien ne se ferme, le refus se dit', [B.J.remplacer, B.J.erreurs.filter(Boolean), B.J.mots], [[], ['Le rangement n\'a pas pu se faire.'], []]);
    v('la liste n\'a pas été relue pour rien', B.J.appels, []);
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort :', e); process.exitCode = 1; fin(); });
