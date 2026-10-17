/* ⛔ CE QUE CE FICHIER GARDE — LE CHAT D'UNE SALLE PREND LE MÊME VERDICT « CONFIRMER L'ENVOI » QUE LE FIL DE SA RÉUNION (pro#5 ; modèle `test-857` : les VRAIES fonctions de la page, exécutées).

   Constat du testeur : Cléo règle « Confirmer l'envoi = Partout ». Une réunion rangée côté PERSO (invitée à son nom, un client y est) — dans le fil, le message part sans demander (`confirmationRequise()`
   exclut le Perso, décision du 10 octobre 2026) ; dans le chat de la SALLE de la même réunion, le champ répondait « Envoyer à la réunion ? Touche « Confirmer » pour envoyer. » et le message n'était pas parti.
   Le gestionnaire du chat de salle ne lisait que le réglage (`confirmerActif() && confirmerEnvoi() !== 'jamais'`), jamais le côté de la conversation de la réunion.

     1. LA FONCTION RÉELLE `salleConfirmationRequise(A)` est extraite de la page et jouée contre `confirmationRequise()` (aussi réelle) : pour chaque réglage (jamais, groupes, partout) et chaque côté (Perso, Pro,
        conversation pas encore chargée), le chat de la salle rend le verdict du fil — sauf « Groupes et canaux », qui vaut « oui » dans une salle (une réunion est toujours à plusieurs) ;
     2. LA CONVERSATION VIENT DE LA RÉUNION, pas de celle qui est ouverte à l'écran (un fil Pro ouvert derrière ne retient pas une salle Perso) ;
     3. LE GESTIONNAIRE DU CHAT LA LIT (le texte du CODE, commentaires retirés) : il appelle `salleConfirmationRequise(A)` et ne teste plus le réglage tout seul.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « non » est précédé d'un « oui » du même réglage côté Pro (la fonction demande bien quelque part). Le comportement de bout en bout (le champ, le
   bouton « Confirmer », le toast, le message parti) est dans la sonde du navigateur citée dans le rapport (`repro-confirm-salle-perso.js`, relancée sur ce code). */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const PAGE = fs.readFileSync(path.join(T.RACINE, 'apercu', 'opmessages', 'index.html'), 'utf8');
const SCRIPT = (/<script>([\s\S]*?)<\/script>/.exec(PAGE) || [, ''])[1];
const CODE = T.sansCommentaires(SCRIPT);

/* une pièce du script : de son ancre jusqu'à la fin de la ligne (const) ou de l'accolade fermante en colonne 2 (function) */
function piece(ancre) {
  const i = CODE.indexOf(ancre); if (i < 0) return '';
  if (ancre.startsWith('  function ')) { const f = CODE.indexOf('\n  }\n', i); return f < 0 ? '' : CODE.slice(i, f + 5); }
  const f = CODE.indexOf('\n', i); return CODE.slice(i, f);
}
const PIECES = ['  const multi = c =>', '  const modesActifs = () =>', '  const coteDe = c =>', '  const confirmerActif = () =>', '  const convCourante = () =>', '  function confirmationRequise() {', '  function salleConfirmationRequise(A) {'].map(piece);

function monter(reglage, opts) {
  const o = opts || {};
  const ctx = vm.createContext({ console });
  const ini = 'const etat = { pro: true, conv: "fil", convDonnees: null, conversations: [] };\n' +
    'const CAP = { confirmerEnvoi: true, modes: ' + (o.modes === false ? 'false' : 'true') + ' };\n' +
    'const source = { confirmerEnvoi: () => ' + JSON.stringify(reglage) + ', choisirMode: () => {} };\n';
  vm.runInContext(ini + PIECES.join('\n') + '\nthis.etat = etat; this.confirmationRequise = confirmationRequise; this.salleConfirmationRequise = typeof salleConfirmationRequise === "function" ? salleConfirmationRequise : null;', ctx, { timeout: 3000 });
  return ctx;
}

(async () => {
  console.log('La fonction du chat de salle : les pièces réelles de la page');
  vrai('(population) les ' + PIECES.length + ' pièces sont trouvées dans le script (' + PIECES.map(p => p.length).join(', ') + ' caractères)', PIECES.length === 7 && PIECES.every(p => p.length > 40));
  const ctx0 = monter('partout');
  vrai('la page définit `salleConfirmationRequise`', typeof ctx0.salleConfirmationRequise === 'function');

  if (typeof ctx0.salleConfirmationRequise === 'function') {
    const reunion = (cote) => ({ id: 'reu', type: 'reunion', cote, membres: ['a', 'b', 'c'] });
    const salleDe = { snap: { conv: 'reu' } };
    for (const reglage of ['jamais', 'groupes', 'partout']) {
      const attendu = reglage === 'jamais' ? [false, false] : [true, false];       // [côté Pro, côté Perso] : « groupes » vaut « oui » dans une salle
      const rendu = [];
      for (const cote of ['pro', 'perso']) { const c = monter(reglage); c.etat.conversations.push(reunion(cote)); rendu.push(c.salleConfirmationRequise(salleDe)); }
      v('⛔ réglage « ' + reglage + ' » : le chat de la salle demande en Pro, ' + (reglage === 'jamais' ? 'jamais' : 'jamais en Perso') + ' — [Pro, Perso]', rendu, attendu);
    }
    /* le même verdict que le fil, sur la même réunion */
    const comp = [];
    for (const reglage of ['groupes', 'partout']) for (const cote of ['pro', 'perso']) {
      const c = monter(reglage); const r = reunion(cote); c.etat.conversations.push(r); c.etat.conv = 'reu';
      comp.push([reglage, cote, c.confirmationRequise(), c.salleConfirmationRequise(salleDe)]);
    }
    v('⛔ la salle et le fil de la MÊME réunion rendent le même verdict (réglages « groupes » et « partout », côtés Pro et Perso)', comp.map(x => x[2] === x[3]), [true, true, true, true]);
    vrai('   (population) le fil demande bien quelque part (Pro) : la comparaison ne porte pas sur quatre « non »', comp.some(x => x[2] === true) && comp.some(x => x[2] === false));

    /* la conversation est celle de la RÉUNION, pas celle qui est ouverte derrière */
    const c1 = monter('partout'); c1.etat.conversations.push(reunion('perso'), { id: 'fil', type: 'groupe', cote: 'pro', membres: ['a', 'b', 'c'] }); c1.etat.conv = 'fil';
    v('⛔ un fil PRO ouvert derrière une salle PERSO ne retient pas la salle', [c1.confirmationRequise(), c1.salleConfirmationRequise(salleDe)], [true, false]);
    const c2 = monter('partout'); c2.etat.conversations.push(reunion('pro'), { id: 'fil', type: 'groupe', cote: 'perso', membres: ['a', 'b', 'c'] }); c2.etat.conv = 'fil';
    v('   et un fil PERSO ouvert derrière une salle PRO ne la libère pas', [c2.confirmationRequise(), c2.salleConfirmationRequise(salleDe)], [false, true]);
    /* les données chargées de la conversation ouverte priment sur le résumé de la liste (comme `convCourante`) */
    const c3 = monter('partout'); c3.etat.conversations.push(reunion('pro')); c3.etat.convDonnees = reunion('perso');
    v('la conversation ouverte et chargée (`convDonnees`) fait foi sur son résumé de la liste', c3.salleConfirmationRequise(salleDe), false);
    /* une conversation pas encore connue de la liste : comme le fil (le doute ne libère pas, le réglage décide) */
    const c4 = monter('partout');
    v('une réunion pas encore dans la liste : le réglage décide (comme `confirmationRequise` quand la conversation manque)', [c4.salleConfirmationRequise({ snap: { conv: 'inconnue' } }), c4.confirmationRequise()], [true, true]);
    /* pas de côtés (aucune bascule Perso/Pro) : le réglage seul, comme avant */
    const c5 = monter('partout', { modes: false }); c5.etat.conversations.push(reunion('perso')); c5.etat.conv = 'reu';
    v('sans bascule Perso / Pro (`modesActifs()` faux) : le réglage seul décide, comme le fil', [c5.salleConfirmationRequise(salleDe), c5.confirmationRequise()], [true, true]);
  }

  console.log('\nLe gestionnaire du chat de salle la lit (le CODE, pas une phrase)');
  const i = CODE.indexOf("$('salle-panneau-corps').addEventListener('submit'");
  const gest = i < 0 ? '' : CODE.slice(i, CODE.indexOf('\n  });\n', i));
  vrai('(population) le gestionnaire du formulaire du chat de salle est trouvé (' + gest.length + ' caractères)', gest.length > 400);
  vrai('⛔ il demande à `salleConfirmationRequise(A)`', /if \(salleConfirmationRequise\(A\) && X\.confirme !== t\)/.test(gest));
  vrai('   et ne teste plus le réglage tout seul (`source.confirmerEnvoi() !==`)', !/source\.confirmerEnvoi\(\)\s*!==/.test(gest));
  fin();
})();
