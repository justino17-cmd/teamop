/* L'OUTIL MAISON DE L'ESSAI : LES CHIFFRES DE MAX, EN FORME FERMÉE (30 octobre 2026).
 *
 * Ce que `faits_surveillance` rend à l'agent hébergé chez Anthropic : exactement ce que le vrai Max lit déjà — l'état de santé du serveur
 * (`santeCorps(false)`) passé par SES règles (`plateforme-regles.js`) — et rien d'autre.
 *
 * ⛔ UNE FORME FERMÉE, JAMAIS UN TEXTE VENU D'AILLEURS. La sortie n'est composée que de : des nombres finis, des booléens, des clés de NOS tables (`cle`, `zone`,
 *    `niveau`), des phrases écrites dans `plateforme-regles.js` (avec des nombres arrondis) et l'instant. Un champ de l'état de santé qui n'est pas dans la
 *    liste blanche ci-dessous N'ENTRE PAS (c'est ainsi qu'une chaîne libre de /health — l'erreur d'un registre, par exemple — ne part jamais chez Anthropic).
 *    Aucune entreprise, aucun identifiant, aucune adresse, aucun incident d'un appareil (leur texte est forgeable) : `test-2930` le prouve en nourrissant
 *    la fonction d'un état de santé EMPOISONNÉ et en balayant toute la sortie.
 * Fonctions pures : l'état de santé et l'horloge sont fournis.
 */
'use strict';
const R = require('../../plateforme-regles');
const O = require('../../plateforme-outils');

/* Les compteurs publiés (chemin dans l'état de santé → nom). Chacun est un NOMBRE ou un BOOLÉEN ; tout autre type est jeté. */
const COMPTEURS = [
  ['ok', 'ok'], ['uptime', 'uptime_s'], ['bugs1h', 'bugs_1h'], ['bugs24h', 'bugs_24h'], ['stripeEchecMin', 'stripe_echec_min'], ['email', 'email_actif'], ['atts', 'pieces_jointes_actives'],
  ['sauvegarde.ok', 'sauvegarde_ok'], ['sauvegarde.ageH', 'sauvegarde_age_h'], ['sauvegarde.instantaneEchecs', 'sauvegarde_echecs'],
  ['limites.refusSynchro1h', 'refus_synchro_1h'], ['limites.refusAutres1h', 'refus_autres_1h'],
  ['processus.rejets1h', 'rejets_1h'], ['processus.erreurs1h', 'erreurs_processus_1h'],
  ['registres.espaces', 'registre_annuaire_lisible'], ['registres.fermes', 'registre_fermetures_lisible'], ['registres.promos', 'registre_codes_promo_lisible'],
];
const lire = (j, chemin) => { let c = j; for (const k of chemin.split('.')) { if (c === null || typeof c !== 'object') return undefined; c = c[k]; } return c; };
const propre = x => (typeof x === 'number' ? Number.isFinite(x) : typeof x === 'boolean');

function faitsMax(j, maintenant, filtre) {
  const now = typeof maintenant === 'function' ? maintenant() : (Number.isFinite(maintenant) ? maintenant : Date.now());
  const instant = new Date(now).toISOString();
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { essai: true, instant, lisible: false, regles: [], compteurs: {}, regles_actives: [] };
  const actives = R.evaluer(j, 'max', () => now) || new Map();
  const zone = typeof filtre === 'string' && R.ZONES.includes(filtre) ? filtre : '';
  const regles = R.REGLES.filter(r => r.proprio === 'max' && (!zone || r.zone === zone)).map(r => {
    const a = actives.get(r.cle);
    const f = { cle: r.cle, zone: r.zone, niveau: r.niveau, active: !!a, condition: r.ref };
    if (a) { f.valeurs = a.valeurs; f.phrase = O.court(R.texteDe(r.cle, a.valeurs), 300); f.piste = r.pistes; }
    return f;
  });
  const compteurs = {};
  for (const [chemin, nom] of COMPTEURS) { const x = lire(j, chemin); if (propre(x)) compteurs[nom] = x; }
  return { essai: true, instant, jour: O.jourParis(now), lisible: true, regles, regles_actives: [...actives.keys()].filter(c => regles.some(r => r.cle === c)), compteurs };
}

module.exports = { faitsMax, COMPTEURS };
