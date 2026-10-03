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
  'sauvegarde.ageH',       // une copie par heure est promise : la dernière réussie ne doit pas dater de plus de 2 h (et « configurée sans aucune réussie » crie aussi)
  'sauvegarde.echecs',     // deux passes ratées de suite : le coffre refuse, la relecture échoue, le disque manque — on le sait AVANT que l'âge ne grimpe
  'sauvegarde.essaiJours', // EN PRODUCTION seulement : aucun exercice de restauration réussi depuis 35 jours (voir `SEUIL_ESSAI_JOURS`)
  'stripeEchecMin',        // Stripe illisible depuis trop longtemps : la facturation ne se relit plus
  'base.illisibles',       // des lignes chiffrées qui ne s'ouvrent plus (octet retourné, restauration mélangée) : jamais normal
  'porte.relecturesEchec', // la relecture des accès bêta échoue depuis des minutes : un accès coupé dans la Tour garderait sa session
  'pieces.illisibles',     // un fichier de pièce qui ne s'ouvre plus (bloc abîmé, taille qui ne colle plus à la base) : jamais normal — des photos ou des fichiers perdus
  'pieces.effacementsRates', // des fichiers de pièces supprimées qui restent sur le disque (droits, disque) : le balayeur réessaie, mais cinq échecs ont une cause
  'push.actif',            // faux : la paire de clés VAPID est illisible, le push est coupé — personne ne reçoit plus rien hors de l'application
  'push.echecs24h',        // les services push refusent nos envois (clés refusées, adresse bloquée) ou ne répondent plus : plus d'échecs que de livraisons, sur un volume qui compte
  'push.envoyes24h',       // le dénominateur de l'alarme ci-dessus : sans lui un seul échec ferait crier
  /* ⛔ LES SMS (compte Perso par numéro) : « le but c'est qu'on gagne de l'argent » — chaque SMS est un coût, et la fraude au
     « SMS pumping » vise justement les destinations chères. Ces cinq champs sont l'alarme d'argent ; la garde vit dans `sms-garde.js`. */
  'sms.mode',              // en production, tout autre mode que « ovh » veut dire : plus aucun code ne part, personne ne peut s'inscrire
  'sms.coutJourEur',       // le coût réel des dernières 24 h : au-delà du seuil d'argent, on crie même si le budget tient encore
  'sms.budgetJourPct',     // le budget du jour, en pourcentage : à 80 %, quelqu'un doit regarder avant que les inscriptions s'arrêtent
  'sms.budgetHeurePct',    // idem pour l'heure : un robot qui pompe consomme l'heure en quelques minutes
  'sms.boucliers',         // un pays est passé en « preuve de travail » (emballement) : une attaque, ou un vrai pic — un humain tranche
  'sms.ovhEchecs',         // des envois refusés ou perdus à la suite : clés expirées, crédits épuisés, expéditeur non validé
  'sms.refus'              // les refus du jour par motif : un motif « budget_… » qui monte, c'est le budget qui coupe des inscriptions
];

/* Les champs vus et PAS surveillés, chacun avec sa raison. Une entrée qui parle d'un champ qui n'existe
   plus est une décision prise pour du vide : le banc le contrôle aussi. */
const CHAMPS_VUS = {
  'sms.envoyes24h': 'le nombre de SMS est une information ; ce qui compte est l\'ARGENT (sms.coutJourEur et les budgets), qui est surveillé',
  'push.abonnements': 'le nombre d\'appareils abonnés aux notifications est une information de croissance : le service borne lui-même chaque personne (dix appareils) et retire un abonnement après cinq échecs de suite — aucune alarme horaire n\'ajouterait une décision',
  'pieces.n': 'le nombre de pièces est une information de croissance : le service borne lui-même chaque personne (quota de stockage) et refuse d\'écrire sous son plancher de disque (503), aucune alarme horaire n\'ajouterait une décision',
  'pieces.octets': 'l\'espace pris par les pièces grandit avec l\'usage : il est borné par personne (quota) et par le plancher de disque du service, qui refuse d\'écrire plutôt que de priver OP GESTION — un total n\'a pas de seuil qui ait un sens'
};

const SEUIL_SAUVEGARDE_H = 2;    // une copie par heure promise (SERVEUR.md § 3.7) : au-delà de 2 h, une passe entière a manqué
const SEUIL_HORLOGE_H = 1;           // la tolérance d'une horloge qui se recale : au-delà d'une heure dans le futur, ce n'est plus un recalage
const SEUIL_SAUVEGARDE_ECHECS = 2;   // deux passes ratées de suite : une seule peut être un coffre qui hoquette, deux sont une panne
const SEUIL_ESSAI_JOURS = 35;    // l'exercice de restauration est MENSUEL : 35 jours = un mois et une semaine de grâce
const SEUIL_EFFACEMENTS = 5;     // des fichiers de pièces qu'on n'a pas pu effacer : un échec isolé se répare (le balayeur réessaie), cinq ont une cause
const SEUIL_RELECTURES = 5;      // la relecture passe chaque minute : cinq échecs de suite, c'est cinq minutes sans pouvoir couper un accès
const SEUIL_STRIPE_MIN = 90;     // la règle d'OP GESTION : la surveillance crie à 90 minutes de Stripe illisible
const SEUIL_SMS_PCT = 80;        // le budget du jour ou de l'heure consommé à 80 % : on regarde avant la coupure
const SEUIL_SMS_EUR = 12;        // le coût réel d'une journée au-delà duquel on crie (le budget par défaut est de 20 €) ; OPMSG_SMS_SEUIL_EUR le change
const SEUIL_SMS_ECHECS = 3;      // trois envois de suite refusés ou perdus par OVH
const SEUIL_PUSH_ECHECS = 20;    // vingt échecs d'envoi push en 24 h ET plus d'échecs que de livraisons : un appareil qui disparaît (404, 410) n'est pas un échec, c'est le fonctionnement normal

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
      p.push('la dernière sauvegarde date de ' + Math.round(j.sauvegarde.ageH) + ' h (une par heure est promise)');
    }
    /* ⛔ UN ÂGE NÉGATIF EST UNE HORLOGE EN DÉSORDRE, pas une sauvegarde toute fraîche. Le service écrêtait l'âge à 0 : après un saut d'horloge vers
       l'avant, la dernière sauvegarde « datée de dans vingt jours » s'affichait à 0 h, `echecs` restait à 0, et RIEN ne criait pendant que les
       sauvegardes ne partaient plus (gardien A2, 3 octobre 2026). Au-delà d'une heure de « futur », on crie. */
    if (typeof j.sauvegarde.ageH === 'number' && j.sauvegarde.ageH < -SEUIL_HORLOGE_H) {
      p.push('l\'horloge du serveur est en désordre : la dernière sauvegarde est datée de ' + Math.round(-j.sauvegarde.ageH) + ' h dans le FUTUR');
    }
    /* ⛔ « CONFIGURÉE » ET JAMAIS RÉUSSIE est la panne que l'âge ne voit pas : `ageH` vaut `null`, ce n'est pas un nombre, et rien d'autre ne crie
       tant que la minuterie ne tente rien. (Juste après la mise en service, une minute durant, c'est normal : la surveillance tourne à l'heure.) */
    if (j.sauvegarde.configuree === true && j.sauvegarde.ageH === null) p.push('la sauvegarde est configurée mais aucune n\'a réussi à ce jour');
    if (typeof j.sauvegarde.echecs === 'number' && j.sauvegarde.echecs >= SEUIL_SAUVEGARDE_ECHECS) {
      p.push(j.sauvegarde.echecs + ' sauvegardes de suite ont échoué (le coffre refuse, la relecture échoue, ou le disque manque)');
    }
    /* ⛔ L'EXERCICE DE RESTAURATION : EN PRODUCTION SEULEMENT. Une sauvegarde qu'on n'a jamais rouverte est une croyance, et la production porte
       les messages de vraies personnes — « avant toute personne extérieure à l'équipe, un essai de restauration doit avoir réussi » (SERVEUR.md
       § 3.7). La BÊTA, elle, est jetable et le dit : l'exercice y est un geste de mise en service (INSTALLER-LE-SERVEUR.md), pas une alarme —
       crier chaque mois sur une machine dont les données ne comptent pas apprendrait à ignorer l'alarme de celle où elles comptent. */
    if (j.instance === 'prod' && j.sauvegarde.configuree === true) {
      if (j.sauvegarde.essaiJours === null) p.push('aucun exercice de restauration n\'a JAMAIS réussi sur la production');
      else if (typeof j.sauvegarde.essaiJours === 'number' && j.sauvegarde.essaiJours > SEUIL_ESSAI_JOURS) p.push('aucun exercice de restauration depuis ' + j.sauvegarde.essaiJours + ' jours (un par mois)');
    }
  }
  if (j.base && typeof j.base === 'object' && typeof j.base.illisibles === 'number' && j.base.illisibles > 0) {
    p.push(j.base.illisibles + ' ligne(s) chiffrée(s) illisible(s) depuis le démarrage — la base est peut-être abîmée');
  }
  if (j.pieces && typeof j.pieces === 'object') {
    if (typeof j.pieces.illisibles === 'number' && j.pieces.illisibles > 0) {
      p.push(j.pieces.illisibles + ' pièce(s) illisible(s) depuis le démarrage — un fichier abîmé ou perdu : des photos ou des fichiers ne s\'ouvrent plus');
    }
    if (typeof j.pieces.effacementsRates === 'number' && j.pieces.effacementsRates >= SEUIL_EFFACEMENTS) {
      p.push(j.pieces.effacementsRates + ' fichier(s) de pièce non effacé(s) depuis le démarrage — des fichiers restent sur le disque : droits ou disque ?');
    }
  }
  if (j.push && typeof j.push === 'object') {
    if (j.push.actif === false) p.push('les notifications push sont désactivées (la paire de clés VAPID est illisible) — personne ne reçoit plus rien hors de l\'application');
    if (typeof j.push.echecs24h === 'number' && typeof j.push.envoyes24h === 'number' && j.push.echecs24h >= SEUIL_PUSH_ECHECS && j.push.echecs24h > j.push.envoyes24h) {
      p.push('push : ' + j.push.echecs24h + ' échecs d\'envoi contre ' + j.push.envoyes24h + ' livraisons en 24 h — les services push refusent nos envois ou ne répondent plus');
    }
  }
  if (j.porte && typeof j.porte === 'object' && typeof j.porte.relecturesEchec === 'number' && j.porte.relecturesEchec > SEUIL_RELECTURES) {
    p.push('la relecture des accès bêta échoue depuis ' + j.porte.relecturesEchec + ' passages — un accès coupé ne fermerait plus sa session');
  }
  if (typeof j.stripeEchecMin === 'number' && j.stripeEchecMin > SEUIL_STRIPE_MIN) {
    p.push('Stripe illisible depuis ' + Math.round(j.stripeEchecMin) + ' min');
  }
  if (j.sms && typeof j.sms === 'object') {
    const seuilEur = Number.isFinite(parseFloat(process.env.OPMSG_SMS_SEUIL_EUR)) ? parseFloat(process.env.OPMSG_SMS_SEUIL_EUR) : SEUIL_SMS_EUR;
    if (j.instance === 'prod' && j.sms.mode !== 'ovh') p.push('les SMS sont éteints en production (mode « ' + String(j.sms.mode).replace(/[^a-z]/g, '') + ' ») — plus personne ne peut s\'inscrire');
    if (typeof j.sms.coutJourEur === 'number' && j.sms.coutJourEur > seuilEur) p.push('SMS : ' + j.sms.coutJourEur + ' € dépensés en 24 h (seuil ' + seuilEur + ' €) — une fraude au SMS ? regarder la répartition par pays');
    if (typeof j.sms.budgetJourPct === 'number' && j.sms.budgetJourPct >= SEUIL_SMS_PCT) p.push('SMS : ' + j.sms.budgetJourPct + ' % du budget du jour consommé');
    if (typeof j.sms.budgetHeurePct === 'number' && j.sms.budgetHeurePct >= SEUIL_SMS_PCT) p.push('SMS : ' + j.sms.budgetHeurePct + ' % du budget de l\'heure consommé — un emballement ?');
    if (typeof j.sms.boucliers === 'number' && j.sms.boucliers > 0) p.push('SMS : ' + j.sms.boucliers + ' pays en mode bouclier (preuve de travail) — une attaque, ou un vrai pic ?');
    if (typeof j.sms.ovhEchecs === 'number' && j.sms.ovhEchecs >= SEUIL_SMS_ECHECS) p.push('SMS : ' + j.sms.ovhEchecs + ' envois de suite refusés ou perdus par OVH — clés, crédits ou expéditeur ?');
    if (j.sms.refus && typeof j.sms.refus === 'object') {
      const coupes = Object.entries(j.sms.refus).filter(([m, n]) => /^budget_/.test(m) && typeof n === 'number' && n > 0);
      if (coupes.length) p.push('SMS : des inscriptions refusées faute de budget (' + coupes.map(([m, n]) => m.replace(/[^a-z_]/g, '') + ' ×' + n).join(', ') + ')');
    }
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
