/* ══════════════════════════════════════════════════════════════════════════════════════════════
 *  L'HORLOGE DE CONSERVATION — 24 MOIS APRÈS LA FIN DE L'ABONNEMENT
 * ══════════════════════════════════════════════════════════════════════════════════════════════
 *
 *  ⛔ CE MODULE EXISTE PARCE QUE `mentions-legales.html` PROMET TROIS CHOSES QUE PERSONNE NE
 *     FAISAIT. Relu le 21 septembre 2026, article 5, mot pour mot :
 *
 *       « Un changement d'offre, une résiliation ou un impayé n'entraînent aucune suppression :
 *         le client retrouve l'intégralité de ses données s'il revient. Elles sont conservées
 *         24 mois après la fin de l'abonnement, puis supprimées — le RGPD interdit de conserver
 *         des données personnelles sans limite de durée. Un courriel prévient le client 30 jours
 *         avant cette suppression […] »
 *
 *     Mesuré le même jour : zéro ligne de `server/` ne compte ces 24 mois. Les seules occurrences
 *     de « rétention » concernent le coffre S3, qui est autre chose. C'est un engagement publié
 *     sur un site vivant, et c'est aussi le principe de limitation de conservation du RGPD.
 *
 *  ⛔⛔ CE QUE CE FICHIER FAIT, ET SURTOUT CE QU'IL NE FAIT PAS.
 *     Il TIENT L'HORLOGE. Il ne supprime RIEN, et il n'envoie AUCUN courriel. Deux raisons, et
 *     la seconde est la plus importante :
 *
 *     1. Supprimer automatiquement la base d'un client est la chose la plus dangereuse qu'on
 *        puisse écrire dans ce dépôt. Un défaut ici n'abîme pas un écran : il efface le travail
 *        d'une entreprise. Ça se conçoit, s'éprouve et s'allume SEUL, sur décision de Justin.
 *     2. Le courriel de préavis ANNONCE une suppression. Tant que rien ne supprime, l'envoyer
 *        serait mentir à un client — et lui faire peur pour rien. Le préavis vient AVEC la
 *        suppression, jamais avant.
 *
 *     Ce qui est URGENT, en revanche, et qui est la seule raison d'écrire ceci cette nuit :
 *     ⛔ **LA DATE NE SE RATTRAPE PAS.** Chaque jour qui passe sans noter « ne paie plus depuis
 *     le … » est un jour d'information perdu POUR TOUJOURS. Le jour où la suppression s'écrira,
 *     celui qui la branche n'aura que deux choix, tous deux faux : dater tout le monde
 *     d'aujourd'hui (un client parti depuis trois ans repart pour 24 mois) ou dater au plus tôt
 *     (des suppressions le jour du déploiement). C'est exactement la faute qu'on vient de
 *     refermer sur la suspension et ses sept jours.
 *
 *  ⛔ L'HORLOGE SE REMET À ZÉRO QUAND LE CLIENT REVIENT — c'est écrit dans les CGV
 *     (« le client retrouve l'intégralité de ses données s'il revient ») et c'est la seule
 *     lecture honnête : les 24 mois courent après la FIN de l'abonnement, pas depuis le premier
 *     incident de paiement d'une entreprise qui a régularisé depuis.
 */
'use strict';

const fs = require('fs');
const path = require('path');

/* 24 mois, comptés en jours pour ne pas avoir à parler de mois de longueurs différentes :
   730 jours = 2 × 365. Un client ne se fait pas effacer sur un jour bissextile. */
const CONSERVATION_JOURS = 730;
/* Le préavis des CGV. Il ne s'ENVOIE pas encore (voir l'en-tête) — mais la date se calcule,
   parce que c'est elle que la Tour doit montrer pour qu'un humain puisse prévenir à la main. */
const PREAVIS_JOURS = 30;
const JOUR = 86400000;

function monterConservation(deps) {
  const d = deps || {};
  const dossier = d.dossier || '.';
  const CHEMIN = path.join(dossier, 'conservation.json');
  const lister = typeof d.lister === 'function' ? d.lister : () => [];
  const intouchable = typeof d.intouchable === 'function' ? d.intouchable : () => false;
  const journal = typeof d.journal === 'function' ? d.journal : () => {};

  /* ⛔⛔ LE DERNIER BALAYAGE A-T-IL RÉUSSI ? MESURÉ LE 21 SEPTEMBRE 2026, ET C'EST LA PIRE
     PANNE POSSIBLE POUR CE MODULE. Au premier montage, `lister()` a jeté (`ESPACES_
     INTOUCHABLES` en zone morte temporelle dans `index.js`) : le balayage a rendu
     `{erreur:true}`, personne ne l'a lu, et `/health` a répondu `actif:true, suivis:0`.
     Une horloge qui ne tourne PAS ressemble EXACTEMENT à une horloge qui n'a rien à faire.
     Et ici le silence coûte pour toujours : chaque heure sans date est une date perdue
     définitivement. `sante()` porte donc l'état du dernier balayage, et la surveillance crie
     dessus. C'est la leçon d'`atts` et de `mailRefus`, appliquée avant d'être repayée. */
  let dernier = { ok: null, ts: 0, motif: '' };

  let reg = {};
  try { reg = JSON.parse(fs.readFileSync(CHEMIN, 'utf8')) || {}; } catch (e) { reg = {}; }
  if (!reg || typeof reg !== 'object') reg = {};

  /* ⛔ TEMPORAIRE PUIS RENOMMAGE, comme `espacesEcrire()`. Un fichier tronqué ici ne perd pas
     des données de client — il perd les DATES, donc il remet toutes les horloges à zéro en
     silence. C'est moins grave qu'`espaces.json` et ça se soigne pareil. */
  function ecrire() {
    try {
      const tmp = CHEMIN + '.tmp';
      fs.writeFileSync(tmp, JSON.stringify(reg));
      fs.renameSync(tmp, CHEMIN);
      return true;
    } catch (e) { journal('conservation.json non écrit —', e.message); return false; }
  }

  /* ── L'ÉTAT D'UNE ENTREPRISE ─────────────────────────────────────────────────────────────
     ⛔ TROIS VALEURS, PAS DEUX — la règle de ce dépôt, et ici elle décide d'un effacement.
     `null` veut dire « cette entreprise paie, il n'y a pas d'horloge », JAMAIS « zéro jour
     restant ». Les confondre effacerait des clients à jour de leur abonnement. */
  function etat(t) {
    const k = String(t || '');
    const e = reg[k];
    if (!e || !e.depuis) return null;
    const jours = Math.floor((Date.now() - e.depuis) / JOUR);
    return {
      depuis: e.depuis,
      jours: jours,
      /* Plafonné à zéro : un client parti depuis trois ans donnerait -365, et un écran qui
         affiche « -365 jours restants » est un écran qu'on ne croit plus. */
      restants: Math.max(0, CONSERVATION_JOURS - jours),
      /* La date du préavis des CGV — 30 jours avant l'échéance. */
      preavisLe: e.depuis + (CONSERVATION_JOURS - PREAVIS_JOURS) * JOUR,
      echeanceLe: e.depuis + CONSERVATION_JOURS * JOUR,
      /* ⚠️ `echu` NE DÉCLENCHE RIEN. C'est un constat, lu par la Tour et par la surveillance.
         Le jour où la suppression s'écrira, c'est elle qui lira ce drapeau — pas l'inverse. */
      echu: jours >= CONSERVATION_JOURS,
      preavis: jours >= (CONSERVATION_JOURS - PREAVIS_JOURS),
      motif: e.motif || '',
      /* ⚠️ `jamaisAbonne` : il n'y a pas de « fin d'abonnement » à laquelle rattacher les
         24 mois des CGV. Ce drapeau ne décide de rien aujourd'hui ; il existe pour que la
         suppression, quand elle s'écrira, n'ait pas à deviner. */
      jamaisAbonne: /aucune formule/i.test(e.motif || ''),
    };
  }

  /* ── LE BALAYAGE ─────────────────────────────────────────────────────────────────────────
     Il ne fait que DEUX choses : poser une date sur ce qui ne paie plus, et RETIRER celle de
     ce qui s'est remis à payer. Rien d'autre. */
  /* ⛔⛔ `balayer` EST ASYNCHRONE PARCE QUE `espacePaye()` L'EST — MESURÉ LE 21 SEPTEMBRE 2026,
     ET C'EST LE DÉFAUT LE PLUS GRAVE DE CE MODULE. La première version appelait `lister()` sans
     l'attendre : côté `index.js`, `espacePaye()` est `async` (elle interroge Stripe), donc elle
     rend une PROMESSE, donc `!!promesse.paye` vaut `!!undefined`, donc **FAUX POUR TOUT LE
     MONDE**. Résultat mesuré sur le vrai serveur : une horloge de suppression démarrée sur
     CHAQUE entreprise, y compris celles parfaitement à jour de leur abonnement.
     ⚠️ Et le banc ne l'a pas vu parce que SON `lister()` était synchrone : il n'a jamais joué
     la forme réelle. C'est la règle de CLAUDE.md, mot pour mot — quand une mutation ne casse
     rien, ou qu'un banc reste vert sur du code faux, la question est « qu'est-ce que le banc
     ne joue pas ? ». `tests/test-745.js` joue désormais un `lister()` asynchrone. */
  async function balayer() {
    let poses = 0, leves = 0, change = false;
    let espaces;
    try { espaces = (await lister()) || []; }
    catch (e) {
      dernier = { ok: false, ts: Date.now(), motif: String((e && e.message) || 'erreur').slice(0, 120) };
      journal('balayage impossible —', e.message);
      return { poses: 0, leves: 0, erreur: true, motif: dernier.motif };
    }

    const vus = new Set();
    for (const x of espaces) {
      const t = String((x && x.t) || '');
      if (!t) continue;
      /* ⛔ LES ESPACES TECHNIQUES N'ONT PAS D'ABONNEMENT ET NE SE COMPTENT PAS. La bêta, les
         espaces de service : leur donner une horloge de conservation reviendrait à les inscrire
         sur une liste de suppression pour un abonnement qui n'a jamais existé. */
      if (intouchable(t)) continue;
      vus.add(t);
      if (x.paye) {
        /* ⛔ LE CLIENT EST REVENU : l'horloge se lève. « Le client retrouve l'intégralité de
           ses données s'il revient » — donc les 24 mois aussi repartent de zéro. */
        if (reg[t] && reg[t].depuis) { delete reg[t]; leves++; change = true; }
      } else if (!reg[t] || !reg[t].depuis) {
        /* ⛔ LE MOTIF SE GARDE AVEC LA DATE, ET C'EST UNE DISTINCTION QUI COMPTE EN DROIT.
           Les CGV parlent de « 24 mois après la FIN DE L'ABONNEMENT ». Or `espacePaye()` rend
           `paye:false` dans deux cas très différents :
           · `aucune formule` — un espace qui n'a JAMAIS eu d'abonnement (créé hier, plan pas
             encore choisi). Il n'y a pas de « fin » à laquelle rattacher les 24 mois ;
           · `impayé`, `annulé`, `abonnement terminé le …` — là il y a bien une fin.
           Les confondre, c'est soit effacer un prospect dont on n'a rien promis, soit garder
           pour toujours les données d'un client parti. Le module ne TRANCHE pas — ce n'est pas
           à lui de le faire — mais il garde l'information, parce qu'elle ne se retrouve plus
           après coup. Le jour où la suppression s'écrira, elle aura de quoi distinguer. */
        reg[t] = { depuis: Date.now(), motif: String((x && x.motif) || '').slice(0, 80) };
        poses++; change = true;
      }
    }

    /* ⚠️ UNE ENTREPRISE QUI DISPARAÎT DE L'ANNUAIRE GARDE SA DATE. On ne nettoie pas ici : un
       annuaire momentanément illisible (disque, fichier en cours d'écriture) ferait alors
       perdre toutes les horloges d'un coup, et elles ne se rattrapent pas. Le ménage se fait
       avec la suppression, quand elle existera. */
    if (change) ecrire();
    dernier = { ok: true, ts: Date.now(), motif: '' };
    if (poses || leves) journal('conservation :', poses, 'horloge(s) posée(s),', leves, 'levée(s)');
    return { poses: poses, leves: leves, suivis: Object.keys(reg).length, vus: vus.size };
  }

  /* ── CE QUE LA TOUR LIT (route gardée) ───────────────────────────────────────────────────
     Les COMPTES : combien d'entreprises suivies, en préavis, échues, jamais abonnées. Jamais un
     nom ici non plus — la Tour joint les noms elle-même, sur sa route gardée. */
  function sante() {
    let suivis = 0, enPreavis = 0, echus = 0, jamais = 0;
    for (const t of Object.keys(reg)) {
      const e = etat(t);
      if (!e) continue;
      suivis++;
      if (e.jamaisAbonne) jamais++;
      if (e.echu) echus++; else if (e.preavis) enPreavis++;
    }
    /* ⛔ `balayageOk` : `true` le dernier balayage a réussi, `false` il a échoué, `null` aucun
       n'a encore eu lieu. Trois valeurs, comme partout — et `false` est ce qui doit réveiller
       quelqu'un, parce qu'une horloge arrêtée ne se rattrape pas. */
    return { suivis: suivis, enPreavis: enPreavis, echus: echus, jours: CONSERVATION_JOURS,
      jamaisAbonnes: jamais, balayageOk: dernier.ok };
  }

  /* ── CE QUE `/health` PUBLIE ─────────────────────────────────────────────────────────────
     ⛔⛔ DEUX BOOLÉENS ET L'ÉTAT DU BALAYAGE — PLUS AUCUN NOMBRE. Jusqu'au 24 septembre 2026,
     `/health` publiait `sante()` telle quelle : `suivis` (combien d'entreprises ne paient pas),
     `jamaisAbonnes` (combien de prospects), `enPreavis`, `echus`. Aucun nom, donc « rien de
     personnel » — mais `/health` est PUBLIQUE et sans identité : ces comptes sont un tableau de
     bord COMMERCIAL offert à qui passe (un concurrent lit notre taux d'impayés et de prospects,
     heure par heure). Relevé par `gardien` avant tout déploiement. La surveillance n'a besoin
     que de savoir S'IL FAUT PRÉVENIR : « au moins une échue », « au moins une en préavis ».
     Combien, et qui : la Tour, sur `/api/monitor/conservation`, qui exige une identité. */
  function santePublique() {
    const s = sante();
    return { balayageOk: s.balayageOk, echu: s.echus > 0, preavis: s.enPreavis > 0 };
  }

  /* Pour la Tour, qui est gardée : elle, elle a le droit de savoir QUI. */
  function tout() {
    return Object.keys(reg).map(t => Object.assign({ t: t }, etat(t))).filter(x => x.depuis);
  }

  /* ⛔ LA MINUTERIE : MÊME DESSIN QUE LA SAUVEGARDE, ET POUR LES MÊMES RAISONS. Pas de cron
     système (il se perdrait à la réinstallation), pas de « toutes les 24 h depuis le
     démarrage » (le serveur redémarre à chaque déploiement). Un réveil par heure suffit
     largement pour une horloge qui compte en jours. `unref()` : elle ne doit pas, à elle
     seule, empêcher un processus de se terminer — c'est ce qui ferait s'éterniser les bancs. */
  let minuterie = null;
  if (d.minuterie !== false) {
    minuterie = setInterval(() => { balayer().catch(e => journal('balayage —', e && e.message)); }, 3600000);
    if (minuterie.unref) minuterie.unref();
  }

  /* Un premier balayage au démarrage : sinon une entreprise qui cesse de payer juste après un
     déploiement attendrait une heure pour être datée, et un serveur qui redémarre souvent ne
     daterait jamais rien. */
  /* ⚠️ Le balayage initial ne se fait pas attendre : le montage doit rendre la main tout de
     suite, sinon il retarderait le démarrage du serveur d'un aller-retour Stripe par espace.
     Les erreurs sont attrapées DANS `balayer`, et `sante().balayageOk` les rend visibles. */
  Promise.resolve().then(balayer).catch(e => journal('balayage initial —', e && e.message));

  return {
    etat: etat, balayer: balayer, sante: sante, santePublique: santePublique, tout: tout,
    dernierBalayage: () => Object.assign({}, dernier),
    CONSERVATION_JOURS: CONSERVATION_JOURS, PREAVIS_JOURS: PREAVIS_JOURS,
    _minuterie: () => minuterie,
    _chemin: CHEMIN,
  };
}

module.exports = { monterConservation, CONSERVATION_JOURS, PREAVIS_JOURS };
