/* Les contrôles DÉFENSIFS du contrôle — ce que le parcours a laissé derrière lui, relu après coup. Rien n'y attaque le
   serveur : on lit ce que le jumeau a VU (erreurs de page, réponses de l'API, journal du serveur, requêtes coupées) et
   on le confronte aux règles écrites du dépôt (CLAUDE.md). La relecture de sécurité du code reste à l'agent `gardien`.

   Ce qui est vérifié :
     · aucune erreur JavaScript chez le client (exception non rattrapée, console.error) ;
     · aucune réponse 5xx de l'API pendant le parcours (un 4xx VOULU est rangé à part, avec sa raison) ;
     · le journal du serveur ne porte ni pile d'erreur, ni AUCUNE donnée personnelle du client fictif
       (CLAUDE.md : « ne pas écrire de données personnelles de clients dans les journaux ») ;
     · aucune page ne pointe vers un fichier absent du site publié ;
     · aucun fichier interne (CLAUDE.md, REPRISE.md, server/, .claude/…) dans le site assemblé ;
     · ce que les pages et le serveur ont tenté d'appeler HORS de teamop.fr (coupé ici, réel en ligne). */
'use strict';
const fs = require('fs'), path = require('path');

/* Les refus qu'un parcours normal PROVOQUE et qui sont voulus — chacun avec sa raison. Un refus absent de cette liste
   n'est pas une faute : il est rangé « à regarder », pour qu'un humain tranche une fois et l'ajoute ici. */
const REFUS_VOULUS = [
  { chemin: /^\/api\/compte\/moi$/, statut: [401], raison: 'pas encore de compte : la page de paiement le demande' },
  { chemin: /^\/api\/op\/session$/, statut: [404], raison: 'le socle est éteint (CLAUDE.md, chantier TOUT SUR LE SERVEUR)' },
  { chemin: /^\/api\/clients\/sync$/, statut: [403], raison: 'adresse pas encore prouvée : le portail réessaie après la confirmation' },
  { chemin: /^\/api\/monitor\/espaces\/lien-existant$/, statut: [404], raison: 'la Tour vérifie que le lien est libre' },
  { chemin: /^\/api\/espaces\/libre$/, statut: [404], raison: 'le nom demandé est libre' },
];

async function verifier(J, K, r) {
  const C = (r && r.C) || {};
  /* 1. les erreurs de page — sauf celles que le jumeau CAUSE (une ressource externe coupée) */
  for (const og of J.ongletsOuverts()) {
    const vues = new Set();
    for (const x of og.erreurs) {
      if (/jumeau : pas de service worker|net::ERR_BLOCKED_BY_CLIENT|Failed to load resource/i.test(x.texte)) continue;
      const cle = x.texte.slice(0, 120); if (vues.has(cle)) continue; vues.add(cle);
      K.constat('défaut', 'Erreur JavaScript (' + og.nom + ', ' + x.type + ')', x.texte + '\npage : ' + String(x.page).replace('https://teamop.fr', '') + (x.ligne !== undefined ? ' · ligne ' + x.ligne : ''), x.etape);
    }
    /* une fenêtre du navigateur montrée au CLIENT se signale ; celles de la Tour sont son fonctionnement (l'identifiant
       demandé à l'acceptation) et vivent dans les notes de l'étape */
    if (og.nom !== 'Tour') for (const d of og.dialogues) K.constat('à regarder', 'Fenêtre du navigateur (' + d.type + ') montrée à ' + og.nom, d.message, d.etape);
  }
  /* 1 bis. les commandes trop petites au doigt, une fois chacune, avec les pages où on les a vues */
  const petites = (r && r.etat && r.etat.petites) || new Map();
  if (petites.size) K.constat('à regarder', 'Commandes petites au doigt (la zone qui répond fait moins de 44 px, le plancher du dépôt)',
    [...petites].map(([k, v]) => '« ' + k + ' » ' + v.taille + ' — ' + [...v.pages].join(', ')).join('\n'));
  /* 2. les réponses de l'API */
  const vus = new Map();
  for (const a of J.traces.api) {
    if (a.statut < 400 && a.statut !== 0) continue;
    const cle = a.methode + ' ' + a.chemin + ' ' + a.statut; if (vus.has(cle)) { vus.get(cle).n++; continue; }
    const v = { n: 1, a }; vus.set(cle, v);
  }
  for (const [cle, { n, a }] of vus) {
    const voulu = REFUS_VOULUS.find(x => x.chemin.test(a.chemin) && x.statut.includes(a.statut));
    if (a.statut >= 500 || a.statut === 0) K.constat('défaut', 'L\'API répond ' + (a.statut || 'rien') + ' : ' + a.methode + ' ' + a.chemin + (n > 1 ? ' (×' + n + ')' : ''), (a.corps || '') + '\ndepuis ' + String(a.depuis).replace('https://teamop.fr', ''));
    else if (!voulu) K.constat('à regarder', 'Refus de l\'API : ' + cle + (n > 1 ? ' (×' + n + ')' : ''), (a.corps || '') + '\ndepuis ' + String(a.depuis).replace('https://teamop.fr', '') + '\n(voulu ? l\'ajouter à REFUS_VOULUS de scripts/controle/defense.js, avec sa raison)');
  }
  /* 3. le journal du serveur : erreurs, et données personnelles */
  const jl = J.journalServeur();
  const piles = jl.split('\n').filter(l => /\b(TypeError|ReferenceError|RangeError|SyntaxError|Unhandled|uncaught)\b/i.test(l));
  if (piles.length) K.constat('défaut', 'Erreurs dans le journal du serveur (' + piles.length + ')', [...new Set(piles)].slice(0, 6).join('\n'));
  const perso = [['adresse e-mail', C.email], ['téléphone', C.tel], ['téléphone (sans espaces)', C.tel && C.tel.replace(/\s/g, '')], ['nom de l\'entreprise', C.entreprise], ['nom de famille', C.nom && C.prenom ? C.prenom + ' ' + C.nom : '']]
    .filter(([, v]) => v && jl.includes(v));
  if (perso.length) K.constat('défaut', 'Donnée personnelle du client dans le journal du serveur', perso.map(([k]) => k).join(', ') + ' — CLAUDE.md : « ne pas écrire de données personnelles de clients dans les journaux »');
  /* 4. le site publié : liens morts, fichiers internes */
  for (const x of [...new Map(J.traces.site404.map(x => [x.url, x])).values()].slice(0, 10))
    if (!/\/e\/[a-z0-9]+$/.test(x.url))   // /e/<lien> passe VOLONTAIREMENT par 404.html (GitHub Pages), qui redirige
      K.constat('défaut', 'Fichier absent du site publié : ' + x.url.replace('https://teamop.fr', ''), 'demandé par ' + String(x.depuis).replace('https://teamop.fr', ''));
  const internes = ['CLAUDE.md', 'REPRISE.md', 'firestore.rules', '.claude', 'server', 'server-msg', 'tests', 'scratchpad', '.github', 'scripts'].filter(f => fs.existsSync(path.join(J.SITE, f)));
  if (internes.length) K.constat('bloquant', 'Fichiers internes dans le site publié', internes.join(', '));
  /* 5. ce qui a voulu sortir */
  const domaines = l => [...new Set(l.map(u => { try { return new URL(u).hostname; } catch (e) { return u.slice(0, 60); } }))];
  const parDomaine = new Map();
  for (const x of J.traces.sorties) { const d = domaines([x.url])[0], pg = String(x.depuis || '').replace('https://teamop.fr', '').split(/[?#]/)[0];
    if (!parDomaine.has(d)) parDomaine.set(d, new Set()); parDomaine.get(d).add(pg); }
  if (parDomaine.size) K.constat('à regarder', 'Appels des pages hors de teamop.fr (coupés ici)', [...parDomaine].map(([d, pg]) => d + ' (depuis ' + [...pg].join(', ') + ')').join(' · ') +
    '\nen ligne, chaque service appelé voit l\'adresse IP du client : à couvrir par la politique de confidentialité');
  const srv = domaines(J.sortiesServeur());
  if (srv.length) K.constat('à regarder', 'Appels du serveur hors de la machine (coupés ici)', srv.join(', '));
  /* 6. une hygiène qui ne coûte rien */
  const h = await J.api('/health');
  if (h.entetes['x-powered-by']) K.constat('à regarder', 'L\'API annonce sa technologie (X-Powered-By: ' + h.entetes['x-powered-by'] + ')', 'app.disable(\'x-powered-by\') la retire');
}

module.exports = { verifier, REFUS_VOULUS };
