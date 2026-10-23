/* LES RELEVÉS DES AGENTS DE LA PLATEFORME (23 octobre 2026) — ce que Max, Jules, Théo, Nina, Inès et Victor ont le droit de lire quand on leur PARLE.
 *
 * `agent-conversation.js` donne à chaque rôle une liste de relevés (`faits`) ; `agent-equipe.js` les lit à chaque réveil, par `fermer()` : des nombres, des booléens,
 * des clés. Les agents de la plateforme en ajoutent ici, sans toucher aux listes des autres : Max voit les épisodes en cours, Jules la file des incidents, Théo les
 * sauvegardes et la conservation, Nina la sécurité et les contrats, Inès sa dernière relecture. UN seul endroit, relu par `test-2924`.
 * ⛔ Les relevés eux-mêmes (`agents-plateforme.js`, `faits`) ne rendent que des nombres et des clés : jamais le texte d'un incident, d'un courriel ni d'une demande. */
'use strict';

const AJOUTS = {
  max:    { faits: ['plateforme'], mission: ' Toutes les cinq minutes tu relis l’état de santé : un franchissement ouvre un incident dans la Tour, tu l’annonces dans « Plateforme » (une fois) et tu dis quand c’est rétabli. Tu ne lis jamais le texte d’un incident venu des appareils.' },
  jules:  { faits: ['incidents', 'plateforme'], mission: ' Tu prends les incidents que Max ouvre : tu proposes un diagnostic et une correction à Justin — jamais de code poussé, jamais un incident client passé en « corrigé » (c’est à Justin).' },
  theo:   { faits: ['sauvegardes', 'conservation'], mission: ' Tu annonces ce qui approche (sauvegarde, conservation) et tu alertes si une sauvegarde manque ; tu ne dupliques pas Max.' },
  nina:   { faits: ['securite', 'contrats'], mission: ' Tu suis les connexions suspectes que le serveur signale, les demandes RGPD que Camille te passe (accusé de réception, rappel avant le délai d’un mois) et les contrats qui attendent une signature.' },
  ines:   { faits: ['qualite'], mission: ' Chaque jour tu relis ce que les agents ont envoyé avec des critères écrits (le cahier §8 pour les courriels) et tu signales à l’agent concerné et à Victor.' },
  victor: { faits: ['plateforme', 'incidents', 'qualite'], mission: ' Chaque matin tu fais le point à Justin ; tu redistribues le travail d’un agent chargé vers un agent libre ; quand deux agents ne s’accordent pas tu tranches par écrit, et ce qui dépasse la charte devient une question à Justin.' },
};

function appliquer(ROLES) {
  for (const id of Object.keys(AJOUTS)) {
    const r = ROLES[id]; if (!r) continue;
    ROLES[id] = Object.assign({}, r, { faits: [...new Set([...(r.faits || []), ...AJOUTS[id].faits])], mission: String(r.mission || '') + AJOUTS[id].mission });
  }
  return ROLES;
}
module.exports = { AJOUTS, appliquer };
