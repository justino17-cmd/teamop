/* ══ test-2521 — RENOMMER UN GROUPE, COMME UN CANAL ═══════════════════════════════════════════════════════════════════════════════════════════════════════
   Revue de la bêta (lot m04, groupes#3). Un canal a son champ « Renommer » (`can-renommer`) ; les Infos d'un GROUPE n'en avaient aucun : le nom était du texte, alors que le service
   accepte `POST /api/conversations/:id/maj { nom }` pour un groupe (administrateur, 1 à 80 signes) et que `majConversation` de la source sait déjà le dire. Deux groupes créés sans nom
   s'appelaient donc tous deux « Nouveau groupe » pour toujours. (Le NOM PAR DÉFAUT d'un groupe — tiré de ses membres — est une décision de Justin : non faite ici.)

   Ce que ce banc garde — les VRAIES fonctions de la page :
     1. l'ÉCOUTEUR réel, branche « groupe-renommer » : le nom est ROGNÉ avant d'être envoyé, il part avec l'identifiant de la conversation, la page le dit (« Groupe renommé ») ;
        ⛔ un nom vide est refusé AVEC une phrase et ne part pas (le service le refuserait ; un refus se dit, sans aller-retour) ; un refus du service garde sa phrase ;
        un renommage réussi efface le refus d'avant ;
     2. le BALISAGE de la feuille, lu dans le code (commentaires retirés) : le champ et son bouton sont dans le bloc réservé à l'ADMINISTRATEUR du groupe, après « Ajouter au groupe »
        et avant « Quitter le groupe » ; pas de `maxlength` (la coupe au signe, à 80 comme le service, est gardée par test-2652) ; et la frappe en cours survit au redessin de la feuille (la présence d'un membre redessine : le nom tapé ne s'envole pas).
   Le comportement bout en bout (le vrai service, deux navigateurs) est la sonde du lot : `correctifs/m04/sonde-m04.js`, bloc B.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const T = require('./outils-msg');
const O = require('./outils-infos-msg');
const { v, vrai, fin } = T.compteur();

(async () => {
  console.log('\n0. La population');
  vrai('(population) l\'écouteur des gestes des Infos est trouvé', !!O.ECOUTEUR);

  console.log('\n1. L\'écouteur réel, branche « groupe-renommer »');
  {
    const B = O.bac({ conv: 'c_g' });
    const envois = [];
    B.source.majConversation = async (id, champs) => { envois.push([id, champs]); };
    B.champ('gr-renom', '  Chantier Sud  ');
    await B.clic('groupe-renommer');
    v('le nom rogné part avec l\'identifiant de la conversation', envois, [['c_g', { nom: 'Chantier Sud' }]]);
    v('la page le dit', B.J.mots, ['Groupe renommé']);
    v('aucune erreur affichée (hors l\'effacement de départ)', B.J.erreurs.filter(Boolean), []);

    B.champ('gr-renom', '    ');
    await B.clic('groupe-renommer');
    v('un nom vide ne part pas', envois.length, 1);
    v('un nom vide est refusé AVEC une phrase', B.J.erreurs.filter(Boolean), ['Le nom du groupe ne peut pas être vide.']);

    B.champ('gr-renom', 'Chantier Est');
    await B.clic('groupe-renommer');
    v('un renommage réussi efface le refus d\'avant', [envois.length, B.J.erreurs[B.J.erreurs.length - 1]], [2, '']);

    B.source.majConversation = async () => { const er = new Error('refus'); er.phrase = 'Seul un administrateur peut renommer ce groupe.'; throw er; };
    B.champ('gr-renom', 'Autre');
    const avant = B.J.erreurs.length;
    await B.clic('groupe-renommer');
    v('un refus du service garde sa phrase', B.J.erreurs.slice(avant).filter(Boolean), ['Seul un administrateur peut renommer ce groupe.']);
  }

  console.log('\n2. Le balisage de la feuille (le code, sans ses commentaires)');
  {
    const J = O.JS;
    const iAjout = J.indexOf('const ajoutables = CONTACTS.filter(c => !i.membres.some(m => m.id === c.id));');
    const iChamp = J.indexOf('id="gr-renom"');
    const iBouton = J.indexOf('data-act="groupe-renommer"');
    const iQuitter = J.indexOf('data-act="quitter"');
    vrai('(population) les repères du bloc sont trouvés', iAjout > 0 && iQuitter > 0);
    vrai('le champ est dans la feuille du groupe, réservé à l\'administrateur (après « Ajouter au groupe », avant « Quitter »)', iChamp > iAjout && iChamp < iQuitter);
    vrai('son bouton « Enregistrer » est avec lui', iBouton > iChamp && iBouton < iQuitter);
    const champ = iChamp > 0 ? J.slice(J.lastIndexOf('<input', iChamp), J.indexOf('>', iChamp) + 1) : '';
    /* (p04) plus de `maxlength` : il comptait 80 unités UTF-16 (40 émojis) ; la coupe au signe, à la limite du service, est dans `limiterRenommage` (tests/test-2652.js) */
    vrai('c\'est un champ texte nommé pour un lecteur d\'écran, sans `maxlength` (la coupe au signe, à 80 comme le service, est faite à la frappe)', /type="text"/.test(champ) && !/maxlength/.test(champ) && /aria-label="Nom du groupe"/.test(champ));
    const iRedessin = J.indexOf('corps.innerHTML = h;');
    vrai('(population) le redessin de la feuille est trouvé', iRedessin > 0);
    vrai('la frappe en cours est relevée AVANT le redessin et rendue APRÈS', /const frappe = actif && corps\.contains\(actif\) && actif\.tagName === 'INPUT' && actif\.type === 'text'/.test(J) &&
      /corps\.innerHTML = h;\s*if \(frappe\) \{[^]*?n\.value = frappe\.valeur;/.test(J));
  }
  fin();
})().catch(e => { console.error('✗ le banc est mort :', e); process.exitCode = 1; fin(); });
