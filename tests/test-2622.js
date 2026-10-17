/* ⛔ CE QUE CE FICHIER GARDE — UNE SALLE SIMPLEMENT VIDÉE N'EST PAS UNE RÉUNION « TERMINÉE » (lot p01, `n#9`, 17 octobre 2026 ; les VRAIES fonctions de la page, exécutées).

   Constat du testeur : Ana (hôte) entre seule dans « Point chantier » (début prévu dans une minute) et ressort trois secondes plus tard SANS « Terminer pour tous ». Cléo, invitée jamais entrée, voit alors dans
   l'agenda « Durée 1 min · 1 présent · Terminée » sans « Rejoindre », et la fiche dit « Cette réunion est terminée » et n'a plus ni « Rejoindre » ni « Rejoindre en audio » — alors que le service dit
   `salle.rejoignable: true` et laisse entrer (200). La liste (`o.seance && !r.salleOuverte`) et, depuis le lot m16, la fiche prenaient toute séance écrite pour une séance TERMINÉE : une salle vidée passait pour
   fermée à tous, avant même l'heure de fin. Ce qui est terminé pour tous, c'est le GESTE de l'hôte (`seance.pourTous`) ; une salle vide se rouvre. Une occurrence dont la fin prévue est passée, elle, a eu lieu :
   elle garde son « Terminée · durée · présents » (8 octobre 2026).

   La règle est UNE fonction de la page (`occTerminee`), lue par la ligne (`ligneReunion`), la case de l'agenda (`termineeElt`), le tableau de bord et la fiche (`seanceFiche`). Les vraies sont exécutées :
     1. `occTerminee` : vrai pour terminée pour tous (même avant la fin prévue), vrai pour une occurrence passée dont la salle s'est vidée ; FAUX pour une salle vidée AVANT la fin prévue, pour une salle
        rouverte, pour une occurrence sans séance ;
     2. `ligneReunion` : la salle vidée avant la fin garde « Rejoindre » et ne dit pas « Terminée » ; terminée pour tous : « Terminée », durée, présents, plus de « Rejoindre » ; la contre-épreuve passée ;
     3. `termineeElt` (la case) suit la même règle ; `seanceFiche` rend la séance seulement pour une occurrence terminée au sens de la ligne (et la fiche garde donc « Rejoindre »).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « pas de Rejoindre » est précédé du cas où il y en a un. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const MAINT = Date.now(), MIN = 60000;
const SEANCE = (pourTous) => ({ debut: MAINT - 4 * MIN, fin: MAINT - 3 * MIN, dureeS: 3, n: 1, pourTous: !!pourTous, presents: null });
const REU = (extra) => Object.assign({ id: 'r_x', titre: 'Point chantier', lieu: '', hote: 'u_ana', participantsN: 3, rejoignable: true, salleOuverte: false, annulee: false, repetition: 'aucune', moi: { hote: false, statut: 'accepte', trajet: null } }, extra || {});
/* une occurrence qui a commencé il y a 5 minutes et finit dans 55 (la réunion est EN COURS, sa salle s'est vidée) ; ou une occurrence passée */
const OCC_COURS = (seance) => ({ debut: MAINT - 5 * MIN, fin: MAINT + 55 * MIN, seance });
const OCC_PASSEE = (seance) => ({ debut: MAINT - 3 * 3600000, fin: MAINT - 2 * 3600000, seance });

const CTX = { esc: (x) => String(x).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])), CAP: { salles: true }, MOI: { id: 'u_cleo' },
  libelleHoraire: () => ({ h: '10:00 – 11:00', note: '', hz: '', ville: '' }), libelleEtat: () => '', FMT_HEURE: { format: () => '10:00' }, nomPersonne: () => 'Ana', icone: () => '', source: {} };
const morceaux = { occTerminee: P.ligne('const occTerminee ='), dureeSeance: P.ligne('const dureeSeance ='), ligneReunion: P.decl('function ligneReunion('), termineeElt: P.ligne('const termineeElt =') };

(async () => {
  console.log('0. La population : les vraies fonctions sont trouvées');
  const M = P.monter(morceaux, CTX);
  v('(population) chaque morceau est trouvé', M.absents, []);
  const { occTerminee, ligneReunion, termineeElt } = M.F;

  console.log('\n1. `occTerminee` : la règle');
  v('terminée POUR TOUS, avant la fin prévue : oui (le geste de l\'hôte)', occTerminee(REU(), OCC_COURS(SEANCE(true))), true);
  v('⛔ salle simplement VIDÉE avant la fin prévue : NON (une salle vide se rouvre) — avant : oui', occTerminee(REU(), OCC_COURS(SEANCE(false))), false);
  v('une occurrence PASSÉE dont la salle s\'est vidée : oui (elle a eu lieu : « Terminée · durée · présents »)', occTerminee(REU(), OCC_PASSEE(SEANCE(false))), true);
  v('une salle ROUVERTE : non, même terminée pour tous (le « Rejoindre » revient)', occTerminee(REU({ salleOuverte: true }), OCC_COURS(SEANCE(true))), false);
  v('une occurrence sans séance : non', occTerminee(REU(), { debut: MAINT - 5 * MIN, fin: MAINT + 55 * MIN }), false);

  console.log('\n2. La ligne de la liste');
  const vide = ligneReunion(REU(), OCC_COURS(SEANCE(false)));
  vrai('(population) la ligne d\'une réunion en cours sans séance propose « Rejoindre »', /data-rejoindre="r_x"/.test(ligneReunion(REU(), { debut: MAINT - 5 * MIN, fin: MAINT + 55 * MIN })));
  vrai('⛔ salle vidée avant la fin : « Rejoindre » est toujours là, et la ligne ne dit pas « Terminée » (avant : ni l\'un ni l\'autre)', /data-rejoindre="r_x"/.test(vide) && !/Terminée/.test(vide) && !/reunion-ligne terminee/.test(vide));
  const toutes = ligneReunion(REU(), OCC_COURS(SEANCE(true)));
  vrai('terminée pour tous : plus de « Rejoindre », la ligne dit sa durée et ses présents (la ligne n\'est plus un bouton)', !/data-rejoindre/.test(toutes) && /Durée 1 min/.test(toutes) && /1 présent/.test(toutes) && /reunion-ligne terminee/.test(toutes));
  const passee = ligneReunion(REU({ rejoignable: false }), OCC_PASSEE(SEANCE(false)));
  vrai('une occurrence passée dont la salle s\'est vidée garde son historique : durée et présents, ligne non cliquable', /Durée 1 min/.test(passee) && /reunion-ligne terminee/.test(passee) && !/data-rejoindre/.test(passee));

  console.log('\n3. La case de l\'agenda, et la fiche');
  v('la case : salle vidée avant la fin → non terminée ; terminée pour tous → oui ; passée → oui',
    [termineeElt({ r: REU(), o: OCC_COURS(SEANCE(false)) }), termineeElt({ r: REU(), o: OCC_COURS(SEANCE(true)) }), termineeElt({ r: REU(), o: OCC_PASSEE(SEANCE(false)) })], [false, true, true]);
  const oc = { debut: OCC_COURS().debut, fin: OCC_COURS().fin };
  const dRej = { id: 'r_x', annulee: false, salle: { rejoignable: true, ouverte: false, occurrence: oc } };
  const lire = async (seance) => {
    const L = P.monter({ occTerminee: morceaux.occTerminee, seanceFiche: P.decl('async function seanceFiche(') },
      { CAP: { salles: true }, source: { reunions: async () => [Object.assign(REU(), { occurrences: [Object.assign({}, oc, { seance })] })] } });
    return L.absents.length ? 'absents:' + L.absents.join() : L.F.seanceFiche(dRej, 'r_x');
  };
  const sV = SEANCE(false), sT = SEANCE(true);
  v('⛔ la fiche : salle vidée avant la fin → pas de séance finie (« Rejoindre » reste) ; terminée pour tous → la séance', [await lire(sV), await lire(sT)], [null, sT]);
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
