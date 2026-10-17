/* ══ test-2520 — « AJOUTER AU GROUPE » : UN REFUS DU SERVICE SE DIT ═══════════════════════════════════════════════════════════════════════════════════════
   Revue de la bêta (lot m04, groupes#0). Dans les Infos d'un groupe, « Ajouter » sur quelqu'un qui m'a bloqué (ou avec qui je ne suis plus en contact) ne disait RIEN : le service répond
   200 `{ ajoutes: [], non_ajoutes: [ce_contact] }`, et la page faisait `await source.ajouterMembres(…)` sans lire la réponse — ni toast, ni phrase dans la feuille, la ligne restait là.
   Le service est juste (`routes.js` : « les autres sont RENDUS »), c'est la page qui n'écoutait pas ce qu'il rendait.

   Ce que ce banc garde — les VRAIES fonctions de la page, dans un bac à sable (`tests/outils-infos-msg.js`) :
     1. `phraseNonAjoutes` : rien à dire quand tout est ajouté, le NOM de la personne sinon (« Dan Roux n'a pas pu être ajouté(e). »), plusieurs, un nom inconnu, une réponse sans la liste ;
     2. l'ÉCOUTEUR réel, branche « ajouter » : le refus s'écrit dans la feuille (`erreurInfo`), un ajout réussi n'en dit rien et EFFACE le refus d'avant (CLAUDE.md : « une réussite efface le
        refus d'avant »), un échec réseau garde sa phrase, et l'identifiant envoyé au service est celui de la ligne.
   ⛔ Une mutation à la fois est dans le rapport du lot : sans la lecture de `non_ajoutes`, le banc tombe.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const T = require('./outils-msg');
const O = require('./outils-infos-msg');
const { v, vrai, fin } = T.compteur();

(async () => {
  console.log('\n0. La population : les vraies pièces sont trouvées dans la page');
  v('(population) aucune pièce ne manque', O.manquantes(['phraseNonAjoutes', 'apresChoixInfo']), []);
  vrai('(population) l\'écouteur des gestes des Infos est trouvé', !!O.ECOUTEUR);

  const CONTACTS = [{ id: 'u_dan', nom: 'Dan Roux' }, { id: 'u_eve', nom: 'Eve Blanc' }];
  const nomDe = u => { const c = CONTACTS.find(x => x.id === u); return c ? c.nom : ''; };
  {
    console.log('\n1. phraseNonAjoutes : ce que la page dit d\'un refus');
    const F = O.bac({ contacts: CONTACTS }).F;
    vrai('la fonction existe', typeof F.phraseNonAjoutes === 'function');
    if (typeof F.phraseNonAjoutes === 'function') {
      v('tout est ajouté : rien à dire', F.phraseNonAjoutes({ ajoutes: ['u_dan'], non_ajoutes: [] }, nomDe), '');
      v('une réponse sans la liste (une source qui ne la rend pas) : rien à dire', F.phraseNonAjoutes({ ajoutes: ['u_dan'] }, nomDe), '');
      v('pas de réponse du tout : rien à dire', F.phraseNonAjoutes(undefined, nomDe), '');
      v('un refus dit le NOM', F.phraseNonAjoutes({ ajoutes: [], non_ajoutes: ['u_dan'] }, nomDe), 'Dan Roux n\'a pas pu être ajouté(e).');
      v('un nom inconnu ne rend pas « undefined »', F.phraseNonAjoutes({ ajoutes: [], non_ajoutes: ['u_x'] }, nomDe), 'Cette personne n\'a pas pu être ajouté(e).');
      v('plusieurs refus', F.phraseNonAjoutes({ ajoutes: [], non_ajoutes: ['u_dan', 'u_eve'] }, nomDe), 'Dan Roux et Eve Blanc n\'ont pas pu être ajoutés.');
    }
  }
  {
    console.log('\n2. L\'écouteur réel, branche « ajouter »');
    const B = O.bac({ contacts: CONTACTS });
    const recus = [];
    B.source.ajouterMembres = async (id, uids) => { recus.push([id, uids]); return { ajoutes: [], non_ajoutes: uids }; };
    await B.clic('ajouter', { uid: 'u_dan' });
    v('(population) le geste est parti vers le service, avec l\'identifiant de la ligne', recus, [['c_g', ['u_dan']]]);
    v('le refus s\'écrit dans la feuille', B.J.erreurs.filter(Boolean), ['Dan Roux n\'a pas pu être ajouté(e).']);
    vrai('le geste a effacé l\'erreur d\'avant AVANT de travailler (première écriture : vide)', B.J.erreurs[0] === '');

    B.source.ajouterMembres = async (id, uids) => ({ ajoutes: uids, non_ajoutes: [] });
    const avant = B.J.erreurs.length;
    await B.clic('ajouter', { uid: 'u_eve' });
    const apres = B.J.erreurs.slice(avant);
    v('un ajout réussi ne dit rien… et la dernière écriture est VIDE (le refus d\'avant est effacé)', [apres.filter(Boolean), apres[apres.length - 1]], [[], '']);

    B.source.ajouterMembres = async () => { const er = new Error('réseau'); er.phrase = 'Le service ne répond pas.'; throw er; };
    const avant2 = B.J.erreurs.length;
    await B.clic('ajouter', { uid: 'u_eve' });
    v('un échec du service garde sa phrase', B.J.erreurs.slice(avant2).filter(Boolean), ['Le service ne répond pas.']);
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort :', e); process.exitCode = 1; fin(); });
