/* ⛔ CE QUE CE FICHIER GARDE — DEUX BOUTONS QUI FONT DEUX CHOSES NE PORTENT PAS LE MÊME MOT : LE TRAJET (lot m16, amélioration « agenda@6 », 17 octobre 2026).

   Constat du testeur : dans le bloc « Trajet » d'un rendez-vous et d'une réunion, le bouton qui DÉPLIE le formulaire (replié, depuis le 15 octobre) et celui qui CALCULE (une fois dépliée) portaient le
   même libellé, « Calculer l'heure de départ ». On touche le premier, le formulaire s'ouvre — et le bouton qui se trouve alors sous le doigt dit la même chose : le premier toucher semble n'avoir
   rien fait. Seuls les LIBELLÉS changent (les gestes, les attributs, les ordres du service sont ceux d'avant) : le bouton replié dit « Heure de départ », celui qui calcule dit « Calculer »
   (« Recalculer » quand un trajet est rangé, comme avant).

   Les VRAIES `htmlTrajet` (rendez-vous) et `htmlTrajetReu` (réunion) de la page sont extraites et exécutées, replié puis déplié :
     1. replié : le bouton « trajet-ouvrir » dit « Heure de départ » ; ⛔ aucun bouton de la page ne dit plus « Calculer l'heure de départ » ;
     2. déplié : le bouton « trajet-calculer » dit « Calculer » ; avec un trajet rangé, « Recalculer » ;
     3. ⛔ le mot du bouton qui déplie n'est celui d'aucun bouton qui calcule ;
     4. les gestes sont intacts : « Y aller » est toujours là, le bouton qui déplie garde `aria-expanded="false"`, le bouton qui calcule garde son action et sa classe.
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque libellé est lu sur un bouton qui EXISTE (la population est comptée avant). */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');

const boutons = (html) => Array.from(html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)).map((m) => ({ attrs: m[1], texte: m[2].replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim() }));
const geste = (html, attr) => boutons(html).find((b) => b.attrs.includes(attr));
const decor = {
  CHEVRON: '', icone: () => '', TJ: { lieux: { domicile: null, travail: null }, ouvert: null }, NOM_DEPART: { position: 'Ma position', domicile: 'Domicile', travail: 'Travail', adresse: 'Une autre adresse' },
  AVANCES_TR: [], BOUTON_GPS_EVT: '<button type="button" class="mini" data-evt="trajet-gps">Y aller</button>', lieuARanger: () => false, optionsDe: () => '', FMT_HEURE: { format: () => '09:30' },
  dureeTr: () => '20 min', modeTr: () => 'en voiture', kmTr: () => '12 km', heureDans: () => '09:30', trajetHeures: () => ({ partir: 1, arrivee: 2, debut: 3 }),
};

(async () => {
  const esc = P.ligne('const esc ='), estUrl = P.ligne('const estUrl =');
  console.log('\n0. La population');
  /* — le rendez-vous — */
  const rdv = (T0) => {
    const F = { tr: Object.assign({ depart: 'position', mode: 'voiture', avance: 5, adresse: '', autres: [], ouvert: false }, T0 || {}), tz: 'Europe/Paris' };
    const M = P.monter({ esc, htmlTrajet: P.decl('function htmlTrajet(') }, Object.assign({ $: () => null, destinationGps: () => 'Rue de la Paix, Paris' }, decor));
    return { html: M.F.htmlTrajet ? M.F.htmlTrajet(F, true) : '', absents: M.absents };
  };
  /* — la réunion — */
  const reu = (T0, c) => {
    const d = { lieu: 'Rue de la Paix, Paris', repetition: 'aucune', moi: { trajet: c || null, trajetPerime: false } };
    const M = P.monter({ esc, estUrl, htmlTrajetReu: P.decl('function htmlTrajetReu(') }, Object.assign({ trajetReuPossible: () => true, destinationGps: () => 'Rue de la Paix, Paris', $: () => null }, decor));
    const Tr = Object.assign({ depart: 'position', mode: 'voiture', avance: 5, adresse: '', autres: [], ouvert: false, calcul: false, erreur: null }, T0 || {});
    return { html: M.F.htmlTrajetReu ? M.F.htmlTrajetReu(d, { debut: Date.now() + 3600000, fin: Date.now() + 7200000 }, Tr) : '', absents: M.absents };
  };
  v('(population) les vraies `htmlTrajet` et `htmlTrajetReu` sont trouvées', [rdv().absents, reu().absents], [[], []]);

  for (const [nom, plie, ouvert, range, cle] of [
    ['le rendez-vous', rdv().html, rdv({ ouvert: true }).html, rdv({ ouvert: true, calc: { minutes: 20, avance: 5, mode: 'voiture', vers_label: 'Rue de la Paix' } }).html, 'evt'],
    ['la réunion', reu().html, reu({ ouvert: true }).html, reu({ ouvert: true }, { minutes: 20, avance: 5, mode: 'voiture', vers_label: 'Rue de la Paix', depart_label: 'Domicile' }).html, 'reu'],
  ]) {
    console.log('\n' + nom);
    const ouvrir = geste(plie, 'data-' + cle + '="trajet-ouvrir"'), calculer = geste(ouvert, 'data-' + cle + '="trajet-calculer"'), recalcul = geste(range, 'data-' + cle + '="trajet-calculer"');
    vrai('(population) le bouton replié, le bouton qui calcule et le bouton « recalculer » existent', !!ouvrir && !!calculer && !!recalcul);
    v('⛔ replié : le bouton qui déplie dit « Heure de départ »', ouvrir && ouvrir.texte, 'Heure de départ');
    v('déplié : le bouton qui calcule dit « Calculer »', calculer && calculer.texte, 'Calculer');
    v('avec un trajet rangé : « Recalculer » (inchangé)', recalcul && recalcul.texte, 'Recalculer');
    vrai('⛔ le mot du bouton qui déplie n\'est celui d\'aucun bouton qui calcule', ouvrir && calculer && recalcul && ouvrir.texte !== calculer.texte && ouvrir.texte !== recalcul.texte);
    vrai('⛔ aucun bouton, dans aucun état, ne dit plus « Calculer l\'heure de départ »', [plie, ouvert, range].every((h) => !boutons(h).some((b) => /Calculer l.heure de départ/.test(b.texte))));
    vrai('les gestes sont intacts : « Y aller » est là, le bouton qui déplie garde aria-expanded="false", celui qui calcule garde sa classe', /Y aller/.test(plie) && /aria-expanded="false"/.test(ouvrir.attrs) && /class="mini plein"/.test(calculer.attrs));
  }
  fin();
})().catch((e) => { console.error(e); process.exit(2); });
