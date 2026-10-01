// Surveillance d'OP MESSAGES — lit /health de l'instance et dit ce qui ne va pas.
//
// ⛔ CE SCRIPT N'EST PAS ENCORE BRANCHÉ SUR UN WORKFLOW, ET C'EST VOULU : `msg-beta.teamop.fr` n'a pas
// de DNS tant que Justin n'a pas posé l'enregistrement (design/opmessages/INSTALLER-LE-SERVEUR.md,
// geste 2). Branché maintenant, il crierait toutes les heures sur une machine qui n'existe pas encore.
// Le jour du DNS : une étape « node .github/scripts/surveillance-messages.js » dans
// `.github/workflows/surveillance.yml`, ou un workflow à part (même format que `surveillance.js` :
// exit 1 → GitHub ouvre une issue et prévient par e-mail).
//
// ⛔ UN CHAMP DE /health QUE PERSONNE NE LIT EST DU CODE MORT QUI A L'AIR D'UNE GARDE (leçon d'`atts` et
// de `mailRefus`, CLAUDE.md). Chaque champ publié par le service est donc, ici, SOIT surveillé
// (`CHAMPS_SURVEILLES`, avec la forme de lecture `j.<chemin>` dans `evaluer`), SOIT nommé « vu et pas
// surveillé » (`CHAMPS_VUS`) avec sa raison. `tests/test-934.js` l'exige, sur le chemin complet et sur
// ce fichier dont les COMMENTAIRES sont retirés. Les champs que la conception annonce (§ 3.7, § 3.8)
// et que le service n'a pas encore publiés sont évalués seulement s'ils sont présents.
// ⚠️ Le service est écrit à part : à la fusion, le banc du service (« chaque champ de /health surveillé
// ou nommé ») doit lire CES deux listes — elles sont exportées pour cela.
//
// ⛔ Il n'écrit JAMAIS ce que /health ne publie pas : pas d'identifiant, pas d'adresse, pas de corps.
// Le dépôt est public et le journal d'un run lisible par tous pendant 90 jours.
'use strict';
const https = require('https');

/* Ce qu'on regarde, et ce que ça veut dire quand ça sort de la norme. Un tableau : le banc le lit. */
const CHAMPS_SURVEILLES = [
  'ok',                    // le service dit lui-même qu'il va bien
  'instance',              // beta ou prod, et ce doit être celle du domaine interrogé
  'sha',                   // le code qui tourne : 7 à 40 hexadécimaux, sinon le déploiement n'a pas posé OPMSG_SHA
  'sauvegarde.configuree', // une sauvegarde jamais branchée est une croyance, pas une sauvegarde
  'sauvegarde.ageH',       // la dernière copie réussie ne doit pas dater de plus d'un jour
  'stripeEchecMin'         // Stripe illisible depuis trop longtemps : la facturation ne se relit plus
];

/* Les champs vus et PAS surveillés, chacun avec sa raison. Une entrée qui parle d'un champ qui n'existe
   plus est une décision prise pour du vide : le banc le contrôle aussi. */
const CHAMPS_VUS = {
  'sauvegarde.essaiJours': 'l\'exercice de restauration est mensuel et se décide par un humain (§ 3.7), pas par une alarme horaire'
};

const SEUIL_SAUVEGARDE_H = 26;   // une copie par heure promise, un jour de grâce pour un week-end de panne légère
const SEUIL_STRIPE_MIN = 90;     // la règle d'OP GESTION : la surveillance crie à 90 minutes de Stripe illisible

/* beta ou prod, d'après le domaine interrogé — pour comparer à ce que le service dit de lui-même. */
function instanceDe(url) {
  const h = new URL(url).hostname;
  if (h.startsWith('msg-beta.')) return 'beta';
  if (h.startsWith('msg.')) return 'prod';
  return null;
}

/* Rend la liste des problèmes (vide : tout va bien). Pure : le banc la joue sur des /health fabriqués. */
function evaluer(j, instanceAttendue) {
  const p = [];
  if (!j || typeof j !== 'object') return ['/health n\'est pas un objet JSON'];
  if (j.ok !== true) p.push('ok n\'est pas vrai (ok=' + j.ok + ')');
  if (instanceAttendue && j.instance !== instanceAttendue) {
    p.push('l\'instance dit « ' + String(j.instance).replace(/[^a-z]/g, '') + ' » au lieu de « ' + instanceAttendue + ' » — mauvais service derrière ce domaine');
  }
  if (typeof j.sha !== 'string' || !/^[0-9a-f]{7,40}$/.test(j.sha)) {
    p.push('le sha du code en service est absent ou illisible — le déployeur n\'a pas posé OPMSG_SHA');
  }
  if (j.sauvegarde && typeof j.sauvegarde === 'object') {
    if (j.sauvegarde.configuree === false) p.push('la sauvegarde hors site n\'est pas configurée');
    if (j.sauvegarde.configuree !== false && typeof j.sauvegarde.ageH === 'number' && j.sauvegarde.ageH > SEUIL_SAUVEGARDE_H) {
      p.push('la dernière sauvegarde date de ' + Math.round(j.sauvegarde.ageH) + ' h');
    }
  }
  if (typeof j.stripeEchecMin === 'number' && j.stripeEchecMin > SEUIL_STRIPE_MIN) {
    p.push('Stripe illisible depuis ' + Math.round(j.stripeEchecMin) + ' min');
  }
  return p;
}

/* Les chemins feuilles d'un /health (« sauvegarde.ageH »), pour dire ce qui n'est ni surveillé ni nommé. Les
   tables à clés dynamiques s'arrêtent à leur conteneur : y descendre ferait un faux orphelin au premier refus. */
function chemins(o, prefixe) {
  const out = [];
  for (const k of Object.keys(o || {})) {
    const c = prefixe ? prefixe + '.' + k : k;
    const v = o[k];
    if (v && typeof v === 'object' && !Array.isArray(v) && !/^(parMotif|refus|latence)$/.test(k)) out.push(...chemins(v, c));
    else out.push(c);
  }
  return out;
}
function nonClasses(j) {
  return chemins(j).filter(c => !CHAMPS_SURVEILLES.includes(c) && !(c in CHAMPS_VUS));
}

function get(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TeamOP-Surveillance-Messages' } }, r => {
      let d = '';
      r.on('data', c => { d += c; if (d.length > 65536) req.destroy(new Error('réponse trop grosse')); });
      r.on('end', () => resolve({ status: r.statusCode, body: d }));
    });
    req.on('error', reject);
    req.setTimeout(25000, () => { req.destroy(new Error('délai dépassé (25 s)')); });
  });
}

async function main() {
  const url = process.env.OPMSG_SURVEILLE_URL || 'https://msg-beta.teamop.fr/health';
  const problems = [];
  try {
    const r = await get(url);
    if (r.status !== 200) problems.push('HTTP ' + r.status);
    else {
      let j = null;
      try { j = JSON.parse(r.body); } catch (e) { problems.push('/health n\'est pas du JSON'); }
      if (j) {
        problems.push(...evaluer(j, instanceDe(url)));
        // Un champ neuf ne fait pas crier : on le NOMME, pour que quelqu'un tranche une fois (surveillé ou vu).
        for (const c of nonClasses(j)) console.log('::notice::champ de /health ni surveillé ni nommé : ' + c);
      }
    }
  } catch (e) { problems.push('injoignable — ' + e.message); }

  if (problems.length) {
    for (const p of problems) console.log('::error::OP MESSAGES : ' + p);
    process.exit(1);
  }
  console.log('OP MESSAGES : /health sain.');
}

if (require.main === module) main();
module.exports = { CHAMPS_SURVEILLES, CHAMPS_VUS, evaluer, nonClasses, chemins, instanceDe };
