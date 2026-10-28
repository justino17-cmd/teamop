/* LE CALENDRIER DE LA COMPTA DE TEAMOP (28 octobre 2026) — une table FERMÉE, avec le niveau de preuve de chaque ligne.
 *
 * Justin : « je veux un agent pro pour les devis, les factures et la compta — pour moi, pour la Tour ». Ce fichier ne lit rien (ni Stripe, ni le disque) : il dit ce que la loi demande
 * à TeamOP et QUAND, d'après `obligations-teamop.md` (la recherche du 28 octobre 2026), et il le dit avec le NIVEAU DE PREUVE de chaque ligne :
 *   · « lu »        — texte lu en entier (livret et FAQ de la DGFiP, version du 1er septembre 2026) ;
 *   · « extrait »   — page officielle ouverte par résumé : le contenu vient de la page, mais il n'a pas été relu mot à mot ;
 *   · « à vérifier » — source non officielle, contradiction entre sources, ou point de mémoire : jamais présenté comme une obligation.
 * ⛔ AUCUNE de ces règles n'est écrite dans un prompt, et aucune n'est dite comme une obligation avant d'avoir été relue par l'expert-comptable de Justin : changer une date ou un seuil,
 *    c'est changer UNE ligne de cette table, pas une phrase du modèle. Le modèle n'écrit jamais une date de la loi : le code la lit ici.
 * ⛔ Le régime de TeamOP (franchise, micro, réel) et la plateforme de réception NE SE SUPPOSENT PAS : tant que Justin ne les a pas dits (`regler_compta`), le calendrier demande.
 */
'use strict';
const { parisParties } = require('./agents-horaires');

const REGIMES = ['franchise', 'micro', 'reel', 'inconnu'];
const REGIMES_LIBELLE = { franchise: 'franchise en base de TVA', micro: 'micro-entreprise', reel: 'au réel', inconnu: 'inconnu' };
const PLATEFORMES = ['oui', 'non', 'inconnu'];
const PREUVE_COURTE = { lu: 'lu', extrait: 'extrait, à confirmer', verifier: 'à vérifier' };
const PREUVE_LONGUE = {
  lu: 'preuve : lu (texte officiel lu en entier)',
  extrait: 'preuve : extrait (page officielle résumée) — à confirmer avec ton expert-comptable',
  verifier: 'preuve : à vérifier — ne pas la prendre pour une obligation',
};
const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/* Les échéances DATÉES. `rappel` : le rappel J-30 / J-7 existe. `regimes` : seuls ces régimes sont concernés (`null` : tous, y compris « inconnu »). */
const ECHEANCES = [
  { id: 'reception', date: '2026-09-01', niveau: 'lu', rappel: true, regimes: null,
    titre: 'Réception des factures électroniques : avoir désigné une plateforme agréée',
    detail: 'Obligatoire pour toutes les entreprises, franchise comprise. Amende de 500 €, puis 1 000 € par trimestre.' },
  { id: 'cibs', date: '2026-09-01', niveau: 'extrait', rappel: false, regimes: null,
    titre: 'La mention de franchise devient « art. L. 223 et s. du CIBS »',
    detail: 'L’ancienne mention « art. 293 B du CGI » reste tolérée jusqu’au 31 décembre 2027.' },
  { id: 'simplifie', date: '2027-01-01', niveau: 'extrait', rappel: true, regimes: ['reel'],
    titre: 'Fin du régime simplifié de TVA (CA12)',
    detail: 'Passage au réel normal (CA3), sans démarche. Sans effet en franchise.' },
  { id: 'emission', date: '2027-09-01', niveau: 'lu', rappel: true, regimes: null,
    titre: 'Émission des factures électroniques et e-reporting',
    detail: 'Micro et petites entreprises (taille de TeamOP à confirmer). Amende de 50 € par facture non émise (15 000 € par an au plus). Un PDF Stripe ne suffira probablement pas (à vérifier).' },
  { id: 'ereporting', date: '2027-09-01', niveau: 'verifier', rappel: false, regimes: null,
    titre: 'E-reporting des encaissements, tous les deux mois en franchise (entre le 25 et la fin du mois suivant)',
    detail: 'À confirmer dans le BOFiP (vise-t-il un franchisé ?).' },
  { id: 'tolerance', date: '2027-12-31', niveau: 'extrait', rappel: true, regimes: null,
    titre: 'Fin de la tolérance sur la mention « art. 293 B »',
    detail: 'Au-delà, la mention de franchise doit citer le CIBS.' },
];

/* Les seuils de la franchise en base de TVA, pour des prestations de services (euros). */
const SEUIL_FRANCHISE = 37500, SEUIL_MAJORE = 41250;
const SEUILS = { niveau: 'extrait', texte: 'Franchise en base de TVA (prestations de services) : 37 500 €, limite majorée 41 250 € — au-delà de la limite majorée la franchise cesse tout de suite, entre les deux elle tient jusqu’à la fin de l’année.' };
const CONSERVATION = { niveau: 'extrait', texte: 'À conserver : factures et pièces comptables 10 ans, devis et correspondance commerciale 5 ans, pièces fiscales 6 ans. Les factures Stripe sont à exporter et archiver par TeamOP, pas par Stripe (à vérifier).' };
const DECLARATIONS = {
  franchise: { niveau: 'extrait', texte: 'Franchise en base : aucune déclaration ni paiement de TVA.' },
  micro: { niveau: 'extrait', texte: 'Micro-entreprise : déclarer le chiffre d’affaires à l’Urssaf chaque mois ou chaque trimestre, même s’il est nul.' },
  reel: { niveau: 'extrait', texte: 'Au réel : CA3 chaque mois entre le 15 et le 24 du mois suivant (trimestrielle si la TVA annuelle est inférieure à 4 000 €).' },
  inconnu: { niveau: 'verifier', texte: 'Régime inconnu : dis-moi s’il s’agit de la franchise, de la micro-entreprise ou du réel, et je te rappellerai les bonnes déclarations.' },
};

/* Ce que l'API de Stripe NE MONTRE PAS d'une facture : à cocher par Justin dans les réglages de facture de Stripe. */
const A_COCHER = [
  { id: 'vendeur', niveau: 'extrait', texte: 'nom, prénom et « Entrepreneur individuel » (ou « EI ») du vendeur, avec son adresse' },
  { id: 'siren', niveau: 'extrait', texte: 'SIREN du vendeur' },
  { id: 'siren_client', niveau: 'extrait', texte: 'SIREN du client quand c’est une entreprise (nouvelle mention de la facturation électronique)' },
  { id: 'categorie', niveau: 'extrait', texte: 'catégorie de l’opération : prestation de services' },
  { id: 'penalites', niveau: 'extrait', texte: 'taux des pénalités de retard (au moins 3 fois le taux d’intérêt légal)' },
  { id: 'indemnite', niveau: 'extrait', texte: 'indemnité forfaitaire de 40 € pour frais de recouvrement' },
  { id: 'escompte', niveau: 'extrait', texte: 'conditions d’escompte, ou « escompte pour paiement anticipé : néant »' },
];

const pad = n => (n < 10 ? '0' : '') + n;
const jourDe = ts => parisParties(ts).date;                                            // « AAAA-MM-JJ », jour de Paris
const nombreJours = (a, b) => Math.round((Date.UTC(+b.slice(0, 4), +b.slice(5, 7) - 1, +b.slice(8, 10)) - Date.UTC(+a.slice(0, 4), +a.slice(5, 7) - 1, +a.slice(8, 10))) / 86400000);
/* « 1er septembre 2027 », « 28 octobre 2026 » */
const dateFr = d => { const j = +d.slice(8, 10); return (j === 1 ? '1er' : String(j)) + ' ' + MOIS[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4); };
/* « 28 octobre à 14 h 05 » (heure de Paris) */
const moment = ts => { const p = parisParties(ts); return p.jour + ' ' + MOIS[p.mois - 1] + ' à ' + p.heure + ' h ' + pad(p.minute); };
/* « 1 234,50 € » — la même mise en forme que `fmtEur` de la Tour (espaces ordinaires : le fil n'aime pas les insécables) */
const euros = n => { n = Number(n) || 0; return n.toLocaleString('fr-FR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 }).replace(/[  ]/g, ' ') + ' €'; };

/* L'échéance concerne-t-elle ce régime ? « inconnu » concerne tout le monde : on ne cache rien à qui n'a pas répondu. */
const concerne = (e, regime) => !e.regimes || regime === 'inconnu' || e.regimes.includes(regime);

/* Range des segments en lignes de `max` signes au plus, SANS jamais couper un segment (une ligne du fil est coupée en silence à 300 signes : un chiffre coupé serait faux). Un segment plus long que
   `max` est lui-même découpé aux espaces. */
function ranger(segments, max, sep) {
  max = max || 290; sep = sep === undefined ? ' · ' : sep;
  const morceaux = [];
  for (const s0 of segments) {
    const s = String(s0 == null ? '' : s0).replace(/\s+/g, ' ').trim();
    if (!s) continue;
    if (s.length <= max) { morceaux.push(s); continue; }
    let reste = s;
    while (reste.length > max) { let i = reste.lastIndexOf(' ', max); if (i < max / 2) i = max; morceaux.push(reste.slice(0, i).trim()); reste = reste.slice(i).trim(); }
    if (reste) morceaux.push(reste);
  }
  const lignes = [];
  let cour = '';
  for (const m of morceaux) {
    if (!cour) cour = m;
    else if ((cour + sep + m).length <= max) cour += sep + m;
    else { lignes.push(cour); cour = m; }
  }
  if (cour) lignes.push(cour);
  return lignes;
}

/* Les réglages par défaut, et leur lecture tolérante : une valeur hors liste redevient « inconnu » (on ne devine pas). */
const reglagesPropres = r => {
  r = r && typeof r === 'object' && !Array.isArray(r) ? r : {};
  const e = r.expert && typeof r.expert === 'object' && !Array.isArray(r.expert) ? r.expert : null;
  return {
    regime: REGIMES.includes(r.regime) ? r.regime : 'inconnu',
    plateforme: PLATEFORMES.includes(r.plateforme) ? r.plateforme : 'inconnu',
    expert: e && (e.aucun === true || (typeof e.nom === 'string' && e.nom && typeof e.adresse === 'string' && e.adresse)) ? { aucun: e.aucun === true, nom: String(e.nom || ''), adresse: String(e.adresse || '') } : null,
  };
};

/* LE CALENDRIER, en lignes de fil. `r` : les réglages ; `now` : l'heure ; `cumul` : { ok, centimes } | { ok:false, raison } | null (non demandé).
   Les lignes ne portent AUCUN nom de client ni numéro de facture ; le seul chiffre de TeamOP est le cumul de l'année, écrit par le code. */
function lignesCalendrier(r, now, cumul) {
  r = reglagesPropres(r);
  const aujourdhui = jourDe(now);
  const lignes = [];
  const reponses = [
    'régime : ' + REGIMES_LIBELLE[r.regime] + (r.regime === 'inconnu' ? ' (dis-le-moi)' : ''),
    'plateforme de réception : ' + (r.plateforme === 'oui' ? 'désignée' : r.plateforme === 'non' ? 'pas désignée — à faire' : 'je ne sais pas (dis-le-moi)'),
    'expert-comptable : ' + (r.expert ? (r.expert.aucun ? 'aucun' : 'noté') : 'inconnu (dis-le-moi)'),
  ];
  lignes.push(...ranger(['Calendrier de la compta de TeamOP — ce que tu m’as dit : ' + reponses.join(' ; ') + '.']));
  const listees = ECHEANCES.filter(e => concerne(e, r.regime)).sort((a, b) => a.date.localeCompare(b.date));
  for (const e of listees) {
    const j = nombreJours(aujourdhui, e.date);
    const quand = j < 0 ? 'passée' : j === 0 ? 'aujourd’hui' : 'dans ' + j + ' jour' + (j > 1 ? 's' : '');
    const etat = e.id === 'reception' && j <= 0 ? (r.plateforme === 'oui' ? ' ✓ plateforme désignée.' : r.plateforme === 'non' ? ' ⚠️ pas encore désignée : à faire.' : ' ⚠️ plateforme désignée ? dis-le-moi.') : '';
    /* UNE ligne par échéance quand elle tient en 290 signes (c'est le cas de la table) ; sinon le détail passe à la ligne suivante, jamais coupé */
    lignes.push(...ranger(['• ' + dateFr(e.date) + ' (' + quand + ') — ' + e.titre + '.' + etat + ' ' + e.detail + ' [' + PREUVE_COURTE[e.niveau] + ']']));
  }
  /* le seuil de la franchise, avec le cumul de l'année si Stripe le donne */
  const dernier = [SEUILS.texte + ' [' + PREUVE_COURTE[SEUILS.niveau] + ']'];
  if (cumul) {
    if (cumul.ok) {
      const c = cumul.centimes / 100;
      dernier.push('Encaissé chez Stripe depuis janvier : ' + euros(c) + (c > SEUIL_MAJORE ? ' — au-dessus de la limite majorée !' : c > SEUIL_FRANCHISE ? ' — au-dessus du seuil de 37 500 €.' : ' — sous le seuil de 37 500 €.') + ' (Les ventes hors Stripe n’y sont pas.)');
    } else dernier.push('Cumul de l’année : Stripe illisible, je ne donne aucun chiffre.');
  }
  lignes.push(...ranger(dernier, 290, ' '));
  lignes.push(...ranger([DECLARATIONS[r.regime].texte + ' [' + PREUVE_COURTE[DECLARATIONS[r.regime].niveau] + ']', CONSERVATION.texte + ' [' + PREUVE_COURTE[CONSERVATION.niveau] + ']'], 290, ' '));
  return lignes;
}

/* LES RAPPELS À FAIRE MAINTENANT : pour chaque échéance à rappel qui concerne ce régime et n'est pas passée, le palier atteint (30 ou 7 jours avant). `marques` : { 'id:j30': ts, 'id:j7': ts }. Rend
   [{ id, palier:'j30'|'j7', jours, sauter:['id:j30'] }] — `sauter` : les paliers dépassés sans avoir été dits (on n'écrit pas « J-30 » et « J-7 » le même jour). */
function rappelsDus(r, now, marques) {
  r = reglagesPropres(r); marques = marques && typeof marques === 'object' ? marques : {};
  const aujourdhui = jourDe(now), dus = [];
  for (const e of ECHEANCES) {
    if (!e.rappel || !concerne(e, r.regime)) continue;
    const j = nombreJours(aujourdhui, e.date);
    if (j < 0) continue;
    if (j <= 7 && !marques[e.id + ':j7']) dus.push({ id: e.id, palier: 'j7', jours: j, sauter: marques[e.id + ':j30'] ? [] : [e.id + ':j30'] });
    else if (j > 7 && j <= 30 && !marques[e.id + ':j30']) dus.push({ id: e.id, palier: 'j30', jours: j, sauter: [] });
  }
  return dus;
}

/* La phrase d'un rappel : composée ICI, jamais par le modèle. */
function texteRappel(id, jours, now) {
  const e = ECHEANCES.find(x => x.id === id);
  if (!e) return '';
  const quand = jours === 0 ? 'aujourd’hui' : 'dans ' + jours + ' jour' + (jours > 1 ? 's' : '');
  return ('📅 Compta — ' + quand + ' (' + dateFr(e.date) + ') : ' + e.titre + '. ' + e.detail + ' [' + PREUVE_COURTE[e.niveau] + ']').slice(0, 560);
}

/* La question sur la plateforme de réception : posée UNE fois, quand la date est passée et que Justin n'a pas dit « oui ». */
function questionPlateforme(r, now) {
  r = reglagesPropres(r);
  const e = ECHEANCES.find(x => x.id === 'reception');
  if (r.plateforme === 'oui' || nombreJours(jourDe(now), e.date) > 0) return '';
  return ('📅 Compta — depuis le ' + dateFr(e.date) + ', toute entreprise doit pouvoir recevoir les factures électroniques par une plateforme agréée [lu]. En as-tu désigné une ? Dis-moi « j’ai désigné une plateforme » ou « pas encore » et je le note.').slice(0, 560);
}

module.exports = { REGIMES, REGIMES_LIBELLE, PLATEFORMES, PREUVE_COURTE, PREUVE_LONGUE, ECHEANCES, SEUILS, SEUIL_FRANCHISE, SEUIL_MAJORE, CONSERVATION, DECLARATIONS, A_COCHER,
  jourDe, nombreJours, dateFr, moment, euros, ranger, reglagesPropres, lignesCalendrier, rappelsDus, texteRappel, questionPlateforme, concerne };
