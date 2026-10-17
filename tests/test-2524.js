/* ══ test-2524 — ÊTRE RETIRÉ D'UN GROUPE OU D'UN CANAL PENDANT QU'ON LE REGARDE ══════════════════════════════════════════════════════════════════════════
   Revue de la bêta (lot m04, groupes@3 et securite@0). Retiré d'un groupe pendant qu'on le regarde, on revenait à la liste avec « Tu n'es plus dans cette conversation. » — vrai, mais
   qui ? lequel ? — et, si un message était en cours de saisie, rien ne disait qu'il n'était pas parti (« on croit à un bug »). Le brouillon n'est PAS rangé sur l'appareil (voulu : une
   conversation quittée ne garde rien) ; on le DIT, c'est tout.

   Ce que ce banc garde — les VRAIES `surRetire` et `motRetire`, dans un bac à sable :
     · un groupe : « Tu as été retiré de <nom>. » ; un canal : « … du canal <nom>. » ; une directe ou une réunion (pas de nom à dire) : l'ancienne phrase, inchangée ;
     · un message en cours est dit, une saisie vide ou faite d'espaces ne l'est pas ;
     · ⛔ la contre-épreuve : ce que le toast NE fait PAS — rien quand la conversation retirée n'est pas celle qu'on regarde, rien quand c'est MOI qui l'ai fait disparaître (une réunion
       supprimée : elle a déjà son avis) ;
     · la feuille des Infos ouverte sur la conversation se ferme d'abord, puis la conversation ; la liste est relue.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const T = require('./outils-msg');
const O = require('./outils-infos-msg');
const { v, vrai, fin } = T.compteur();
const LISTE = { vue: 'messages', conv: null, feuille: false, photo: null, appel: null };

(async () => {
  console.log('\n0. La population');
  v('(population) aucune pièce ne manque', O.manquantes(['motRetire', 'surRetire', 'convQuittees']), []);

  console.log('\n1. motRetire : ce que dit le toast');
  {
    const F = O.bac().F;
    vrai('la fonction existe', typeof F.motRetire === 'function');
    if (typeof F.motRetire === 'function') {
      v('un groupe, par son nom', F.motRetire({ type: 'groupe', nom: 'Chantier Nord' }, false), 'Tu as été retiré de Chantier Nord.');
      v('un canal, par son nom', F.motRetire({ type: 'canal', nom: 'general' }, false), 'Tu as été retiré du canal general.');
      v('une conversation à deux : pas de « retiré », l\'ancienne phrase', F.motRetire({ type: 'direct', nom: 'Ben Durand' }, false), 'Tu n\'es plus dans cette conversation.');
      v('une réunion : l\'ancienne phrase', F.motRetire({ type: 'reunion', nom: 'Point lundi' }, false), 'Tu n\'es plus dans cette conversation.');
      v('une conversation que la liste ne connaît plus : l\'ancienne phrase', F.motRetire(undefined, false), 'Tu n\'es plus dans cette conversation.');
      v('un groupe sans nom lisible : l\'ancienne phrase (jamais « retiré de undefined »)', F.motRetire({ type: 'groupe', nom: '' }, false), 'Tu n\'es plus dans cette conversation.');
      v('⛔ un message en cours est dit', F.motRetire({ type: 'groupe', nom: 'Chantier Nord' }, true), 'Tu as été retiré de Chantier Nord. Ton message en cours n\'a pas été envoyé.');
      v('… même sans nom à dire', F.motRetire(undefined, true), 'Tu n\'es plus dans cette conversation. Ton message en cours n\'a pas été envoyé.');
    }
  }

  console.log('\n2. surRetire réelle');
  const retirer = (opts, saisie, id = 'c_g', avant) => {
    const B = O.bac(opts);
    B.champ('saisie', saisie || '');
    if (avant) avant(B);
    B.F.surRetire(id);
    return B;
  };
  const GROUPE = { id: 'c_g', type: 'groupe', nom: 'Chantier Nord' };
  {
    const B = retirer({ conv: 'c_g', feuille: false, conversations: [GROUPE] }, '');
    v('retiré du groupe qu\'on regarde : retour à la liste', B.J.remplacer, [LISTE]);
    v('… avec le nom du groupe dans le toast', B.J.mots, ['Tu as été retiré de Chantier Nord.']);
    v('… et la liste est relue', B.J.appels, ['rafraichirListe']);
  }
  {
    const B = retirer({ conv: 'c_g', feuille: false, conversations: [GROUPE] }, 'Je suis encore là ?');
    v('un brouillon en cours est dit', B.J.mots, ['Tu as été retiré de Chantier Nord. Ton message en cours n\'a pas été envoyé.']);
    const C = retirer({ conv: 'c_g', feuille: false, conversations: [GROUPE] }, '   ');
    v('une saisie d\'espaces n\'est pas un brouillon', C.J.mots, ['Tu as été retiré de Chantier Nord.']);
  }
  {
    const B = retirer({ conv: 'c_g', conversations: [GROUPE] }, '');     // les Infos du groupe sont ouvertes (feuille)
    vrai('(population) les Infos étaient ouvertes sur ce groupe', B.etat.groupe.ouvert && B.etat.groupe.convId === 'c_g');
    v('la feuille se ferme d\'abord (route gardée, feuille retirée), puis la conversation', [B.J.remplacer[0] && B.J.remplacer[0].feuille, B.J.remplacer[1]], [false, LISTE]);
    v('un seul toast, avec le nom', B.J.mots, ['Tu as été retiré de Chantier Nord.']);
  }
  {
    const B = retirer({ conv: 'c_x', conversations: [{ id: 'c_x', type: 'canal', nom: 'general' }] }, '', 'c_x');
    v('un canal : « du canal general »', B.J.mots, ['Tu as été retiré du canal general.']);
  }
  {
    const B = retirer({ conv: 'c_g', feuille: false, conversations: [GROUPE, { id: 'c_h', type: 'groupe', nom: 'Autre' }] }, 'texte', 'c_h');
    v('⛔ retiré d\'un AUTRE groupe que celui qu\'on regarde : aucun toast, rien ne se ferme', [B.J.mots, B.J.remplacer], [[], []]);
    v('… la liste est relue quand même', B.J.appels, ['rafraichirListe']);
  }
  {
    const B = retirer({ conv: 'c_g', feuille: false, conversations: [GROUPE] }, '', 'c_g', b => b.F.convQuittees.set('c_g', Date.now()));
    v('⛔ une conversation que J\'ai moi-même fait disparaître : on ferme, sans toast (le geste a déjà son avis)', [B.J.remplacer, B.J.mots], [[LISTE], []]);
  }
  {
    const B = retirer({ conv: 'c_d', feuille: false, conversations: [{ id: 'c_d', type: 'direct', nom: 'Ben Durand' }] }, '', 'c_d');
    v('une conversation à deux : l\'ancienne phrase, inchangée', B.J.mots, ['Tu n\'es plus dans cette conversation.']);
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort :', e); process.exitCode = 1; fin(); });
