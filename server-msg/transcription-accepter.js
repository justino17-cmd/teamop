/* ══ QUI A LE DROIT DE FAIRE PARTIR UNE TRANSCRIPTION — UNE SEULE FONCTION, DEUX PORTES (28 octobre 2026) ═══════════════════════════════════════
 *
 * Une transcription coûte du calcul à l'ouvrier (whisper.cpp, ~35 s par minute de vocal, deux cœurs). Ce qui décide si un travail PART — l'ouvrier répond, une place libre dans la file, une place
 * libre pour CETTE personne, le budget de secondes de l'heure, le plafond de demandes — est écrit ICI, et lu par les deux portes :
 *   · la page (`msg.transcrire`, « Voir la transcription », avec la session de la personne) ;
 *   · le pont des agents (`pont.transcrire`, au nom de Justin) : un vocal de Justin doit pouvoir être lu par les agents sans qu'il touche quoi que ce soit.
 * ⛔ Deux copies de cette règle divergeraient : le pont aurait un plafond que la page n'a pas (ou l'inverse), et un emballement côté Tour épuiserait la file de tout le monde. Le pont passe par
 * les MÊMES budgets que la page — Justin n'a aucun passe-droit sur l'ouvrier.
 */
'use strict';

const JOUR = 86400000;

/* Un compte public de moins de 24 h a des limites plus basses (SERVEUR.md § 3.6) ; un accès bêta n'est pas un inconnu. */
const facteurJeune = (moi, horloge) => (moi && moi.origine !== 'beta' && horloge() - moi.cree < JOUR) ? 1 / 3 : 1;

/* Les refus de l'accepteur : le code du stockage → [statut HTTP de la page, code que la page sait dire, attente par défaut en secondes] */
const REFUS_TRANSCRIPTION = { ouvrier_absent: [503, 'transcription_indisponible', 60], occupe: [503, 'transcription_occupee', 60], mes_vocaux: [429, 'transcription_en_cours', 30], budget: [429, 'transcription_budget'], quota: [429, 'quota_atteint'] };

/* → { accepter(travail), attente() } : `accepter` est ce que `stockage.transcriptionDemander` appelle quand un calcul naîtrait vraiment (null s'il part, sinon le CODE du refus) ;
   `attente()` dit, après un refus, combien de secondes patienter (budget, plafond). */
function creerAccepteur({ tr, quotas, config, horloge = Date.now }, uid, moi) {
  let attente = 0;
  const accepter = (travail) => {
    if (!tr.actif()) return 'ouvrier_absent';
    if (!tr.placeLibre()) return 'occupe';
    if (!tr.placeLibre(uid)) return 'mes_vocaux';
    attente = tr.budgetAttente(uid, travail.dur);
    if (attente > 0) return 'budget';
    const q = Object.assign({ max: tr.parHeure(), fenetreMs: 3600000 }, config.quotas.transcrire || {});
    const r = quotas.essai('transcrire:' + uid, Math.max(1, Math.floor(q.max * facteurJeune(moi, horloge))), q.fenetreMs);
    if (!r.ok) { attente = r.retry; return 'quota'; }
    return null;
  };
  return { accepter, attente: () => attente };
}

module.exports = { creerAccepteur, facteurJeune, REFUS_TRANSCRIPTION, JOUR };
