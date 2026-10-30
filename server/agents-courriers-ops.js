/* LES COURRIERS DE HUGO, MARGAUX, EMMA ET SARAH — modèles, signature, contrôle qualité (23 octobre 2026).
 *
 * Justin : « on ne fera pas de remboursement » ; « s'il n'arrête pas l'abonnement et qu'il ne paye pas, là on fait les démarches pour les faire payer » ;
 * « la signature, c'est le nom de l'agent. Assistant, Léa par exemple. Équipe TeamOP » ; « fais un truc professionnel ».
 *
 * ⛔ CES COURRIERS SONT COMPOSÉS PAR LE CODE, PAS PAR CLAUDE. Un accusé de résiliation, une relance d'impayé, une mise en demeure disent des faits (une date de
 *    fin, un numéro de facture, un montant) que Stripe a rendus au serveur : un modèle de langage n'a aucune raison d'y toucher, et un texte venu d'un client ne peut
 *    pas s'y glisser (le seul texte libre d'un client qui puisse y figurer est le nom de son entreprise, dans la mise en demeure, nettoyé et borné). Claude écrit
 *    seulement ce qui doit sonner humain — l'annonce de Sarah et les réponses de la messagerie — et ce texte-là passe par le MÊME contrôle.
 * ⛔ LE CONTRÔLE EST UN FILET, pas une intention : il refuse un texte qui ne commence pas par « Bonjour, » (ou la formule de la lettre), qui tutoie, qui porte une
 *    adresse, un lien ou un numéro de téléphone que l'appelant n'a pas AUTORISÉ un par un, un montant hors de la liste autorisée, un pourcentage, un mot de promesse
 *    (gratuit, remise, remboursement…), un crochet ou une accolade (un modèle mal rempli), un titre en capitales, du Markdown, une signature écrite à la main, ou
 *    « Justin ». Il rend la LISTE des fautes (jamais le texte) : l'appelant la met au journal.
 * ⛔ LA SIGNATURE EST AJOUTÉE PAR LE SERVEUR au moment de l'envoi (`signatureAgent`) : prénom, rôle « Assistant(e) de TeamOP », adresse et site,
 *    et la mention « Message préparé par un assistant automatique de TeamOP. » (règlement européen sur l'IA, art. 50 — `agents-signature.js`). Un texte qui la porte déjà est refusé.
 * Aucune dépendance : ni Stripe, ni le courrier, ni le disque (seule la MISE EN FORME de la signature vient de `agents-signature.js`, qui ne touche à rien au chargement).
 */
'use strict';

const SIG = require('./agents-signature');
const FUSEAU = 'Europe/Paris';
const SIGNATURES = {
  hugo:    { prenom: 'Hugo',    role: 'Assistant de TeamOP' },
  margaux: { prenom: 'Margaux', role: 'Assistante de TeamOP' },
  emma:    { prenom: 'Emma',    role: 'Assistante de TeamOP' },
  sarah:   { prenom: 'Sarah',   role: 'Assistante de TeamOP' },
};
const ADRESSE_CONTACT = 'contact@teamop.fr';

/* La signature d'un agent : composée ICI, jamais écrite par Claude. Un agent inconnu n'a pas de signature (l'envoi est alors refusé par l'appelant). */
function signatureAgent(id, adresse) {
  const s = Object.prototype.hasOwnProperty.call(SIGNATURES, id) ? SIGNATURES[id] : null;
  if (!s) return '';
  /* La mise en forme est celle de TOUS les agents (`agents-signature.js`, `formater`) ; seule l'adresse est bornée ici à nos boîtes (@teamop.fr) : une adresse étrangère ne se glisse pas dans la signature. */
  return SIG.formater(s.prenom, s.role, SIG.EQUIPE_DEFAUT, /^[a-z0-9._-]+@teamop\.fr$/i.test(String(adresse || '')) ? adresse : ADRESSE_CONTACT);
}

/* ── les dates : toujours à l'heure de Paris (le serveur tourne en UTC) ── */
const fmtJour = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, day: 'numeric', month: 'long', year: 'numeric' });
const fmtJourSemaine = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, weekday: 'long', day: 'numeric', month: 'long' });
const fmtHeure = new Intl.DateTimeFormat('fr-FR', { timeZone: FUSEAU, hour: 'numeric', minute: '2-digit', hourCycle: 'h23' });
/* « 12 novembre 2026 » */
const dateLongue = ts => (Number.isFinite(ts) && ts > 0) ? fmtJour.format(new Date(ts)) : '';
/* « mardi 27 octobre à 10 h 00 » */
function creneauLibelle(ts) {
  if (!(Number.isFinite(ts) && ts > 0)) return '';
  const h = fmtHeure.formatToParts(new Date(ts)).reduce((o, x) => { o[x.type] = x.value; return o; }, {});
  return fmtJourSemaine.format(new Date(ts)) + ' à ' + (+h.hour) + ' h ' + String(h.minute).padStart(2, '0');
}
/* « 12,50 » — la virgule des factures françaises */
const eurosFr = n => (Math.round(Number(n) * 100) / 100).toFixed(2).replace('.', ',').replace(/,00$/, '');

/* ── LE CONTRÔLE QUALITÉ ── */
const TEL = /\+?\d[\d    .\-()]{6,}\d/g;
const PROMESSES = /\b(?:gratuit|offert|offre\s+(?:speciale|exclusive)|offrons|remise|rabais|reduction|promotion|illimite|garanti|garantissons|rembours|satisfait\s+ou|sans\s+engagement|sans\s+frais|a\s+vie\b)/;
const sansAccents = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const URL_RE = /https?:\/\/[^\s<>"')]+/gi;
const DOMAINE = /(?<![A-Za-z0-9@.-])((?:[A-Za-z0-9][A-Za-z0-9-]{0,62}\.)+[a-z]{2,24})(?![A-Za-z0-9-])/g;
const FICHIERS = new Set(['pdf', 'doc', 'docx', 'xls', 'xlsx', 'png', 'jpg', 'jpeg', 'gif', 'txt', 'zip', 'csv']);

/* `o` : { liens:[URL exactes autorisées], montants:[nombres autorisés], permis:[chaînes exactes à ne pas contrôler : un numéro de facture], lettre:boolean }.
   Rend la liste des fautes (vide : le texte est sain). */
function controle(objet, texte, o) {
  o = o && typeof o === 'object' ? o : {};
  const f = [];
  const ob = String(objet == null ? '' : objet), tx = String(texte == null ? '' : texte);
  if (ob.length < 3 || ob.length > 200 || /[\r\n]/.test(ob)) f.push('objet hors bornes');
  if (/\p{Extended_Pictographic}/u.test(ob + tx)) f.push('émoji');
  if (tx.length < 80 || tx.length > 6000) f.push('longueur hors bornes');
  const debut = o.lettre ? /^Madame, Monsieur,/ : /^Bonjour,/;
  const fin = o.lettre ? /Cordialement,\s*$/ : /Bien cordialement,\s*$/;
  if (!debut.test(tx)) f.push('ne commence pas par la formule d’appel');
  if (!fin.test(tx)) f.push('ne finit pas par la formule de politesse');
  /* ce que l'appelant autorise est retiré AVANT les contrôles : un numéro de facture n'est pas un téléphone, le lien de la facture n'est pas un site étranger */
  let nu = tx;
  for (const p of (Array.isArray(o.permis) ? o.permis : [])) if (p) nu = nu.split(String(p)).join(' ');
  const liens = (Array.isArray(o.liens) ? o.liens : []).map(String);
  for (const l of liens) nu = nu.split(l).join(' ');
  if (/\*\*|__|^[ \t]*#{1,6}[ \t]/m.test(nu) || /^[ \t]*[*•][ \t]/m.test(nu)) f.push('mise en forme parasite');
  if (/[\[\]{}]/.test(ob + nu) || /\b(?:undefined|NaN|null)\b/.test(ob + nu)) f.push('modèle mal rempli');
  if (nu.split('\n').some(l => { const lettres = l.replace(/[^A-Za-zÀ-ÝÇ]/g, ''); return lettres.length >= 12 && l === l.toUpperCase(); })) f.push('titre en capitales');
  for (const m of nu.matchAll(/[^\s<>"'(),;:[\]]+@([^\s<>"'(),;:[\]]+)/g)) if (!/(^|\.)teamop\.fr\.?$/i.test(m[1])) { f.push('adresse étrangère'); break; }
  for (const m of nu.matchAll(URL_RE)) { if (!/^https?:\/\/(?:www\.)?teamop\.fr(?:[/:?#]|$)/i.test(m[0])) { f.push('lien étranger'); break; } }
  const sansLiens = nu.replace(URL_RE, ' ').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, ' ');
  for (const m of sansLiens.matchAll(DOMAINE)) {
    const d = m[1].toLowerCase();
    if (/(^|\.)teamop\.fr$/.test(d) || FICHIERS.has(d.split('.').pop())) continue;
    f.push('nom de site étranger'); break;
  }
  for (const m of nu.matchAll(TEL)) if (m[0].replace(/\D/g, '').length >= 9) { f.push('numéro de téléphone'); break; }
  if (PROMESSES.test(sansAccents(ob + '\n' + nu))) f.push('promesse commerciale');
  const permis = (Array.isArray(o.montants) ? o.montants : []).map(Number).filter(Number.isFinite);
  for (const m of nu.matchAll(/(\d[\d  .,]*)\s*(?:€|euros?\b|eur\b)/gi)) {
    const n = parseFloat(m[1].replace(/[^\d.,]/g, '').replace(',', '.'));
    if (!permis.some(p => Math.abs(p - n) < 0.005)) { f.push('montant non autorisé'); break; }
  }
  if (/\d\s*%|pour\s?cent/i.test(nu)) f.push('pourcentage');
  if (!o.lettre && /(^|[^\p{L}])(?:tu|toi|ton|ta|tes|te)(?=[^\p{L}]|$)/iu.test(nu)) f.push('tutoiement');
  if (/(^|[^\p{L}])je\s+suis(?=[^\p{L}]|$)/iu.test(nu)) f.push('première personne du singulier');
  if (!o.lettre && /\bJustin\b/.test(nu)) f.push('nom du patron');
  if (/Assistante?\s+virtuel|Assistante?\s+de\s+TeamOP|Équipe\s+TeamOP/i.test(nu)) f.push('signature écrite à la main');
  return f;
}

/* ── les modèles ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────── */

/* Hugo — l'accusé de réception d'une fin d'abonnement. `finLe` : l'instant (ms) de la fin de période. Jamais un remboursement, jamais un arrêt immédiat. */
function accuseResiliation(o) {
  const date = dateLongue(o && o.finMs);
  if (!date) return null;
  const objet = 'Votre demande d’arrêt de l’abonnement OP GESTION';
  const texte = [
    'Bonjour,',
    '',
    'Nous avons bien reçu votre demande d’arrêt de l’abonnement OP GESTION de votre entreprise, et nous vous en accusons réception.',
    '',
    'Votre abonnement ne sera pas renouvelé : il prend fin le ' + date + ', à l’issue de la période déjà réglée. Jusqu’à cette date, votre accès à l’application reste le même, et aucun nouveau prélèvement n’aura lieu.',
    '',
    'Passé cette date, l’application est suspendue. Vos données ne sont pas supprimées : elles restent conservées et vous pouvez les exporter à tout moment.',
    '',
    'Si cette demande n’est pas la vôtre, ou si vous changez d’avis avant cette date, répondez simplement à ce courriel : nous le verrons et nous reviendrons vers vous.',
    '',
    'Bien cordialement,',
  ].join('\n');
  return { objet, texte };
}

/* ⛔ Le lien d'une facture n'est qu'une page de STRIPE (ou de teamop.fr) en https : même rendu par le serveur, un autre site ne se glisse pas dans un courriel de relance. */
const urlFacture = u => (/^https:\/\/(?:[a-z0-9-]+\.)*(?:stripe\.com|teamop\.fr)\/[^\s<>"')]*$/i.test(String(u || '')) && String(u).length <= 400) ? String(u) : '';

/* Margaux — la relance d'un abonnement impayé. `etape` : 3 ou 7 (les jours de la charte). `facture` : { numero, montantEur } lus chez Stripe. `url` : la page de la facture
   en attente (https, relue chez Stripe) ou '' — sans elle, on écrit à contact@, JAMAIS un lien inventé. */
/* Les morceaux que la relance tient de Stripe, UNE définition pour le modèle du code (`relanceImpaye`) et pour le mode « travail » (`relanceTravail`). */
function donneesRelance(o) {
  o = o || {};
  const etape = o.etape === 7 ? 7 : 3;
  const f = o.facture && typeof o.facture === 'object' ? o.facture : {};
  const numero = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(String(f.numero || '')) ? String(f.numero) : '';
  const montant = Number.isFinite(Number(f.montantEur)) && Number(f.montantEur) > 0 && Number(f.montantEur) < 100000 ? eurosFr(f.montantEur) : '';
  const url = urlFacture(o.url);
  const quoi = 'la facture de votre abonnement OP GESTION' + (numero ? ' (n° ' + numero + ')' : '') + (montant ? ', d’un montant de ' + montant + ' €,' : '');
  const regler = url
    ? 'Vous pouvez la régler en ligne, avec la carte de votre choix, depuis la page de la facture : ' + url
    : 'Pour la régler, écrivez-nous à ' + ADRESSE_CONTACT + ' : nous vous indiquerons comment faire.';
  return { etape, f, numero, montant, url, quoi, regler };
}
function relanceImpaye(o) {
  const { etape, f, numero, montant, url, quoi, regler } = donneesRelance(o);
  const corps = etape === 3 ? [
    'Bonjour,',
    '',
    'Sauf erreur de notre part, ' + quoi + ' n’a pas pu être prélevée et reste à régler. Une carte expirée ou un plafond atteint suffit souvent à expliquer ce genre d’incident.',
    '',
    'Tant que cette facture n’est pas réglée, l’accès aux fonctions payantes d’OP GESTION est suspendu. Rien n’est perdu : vos données sont intactes, et l’accès revient dès le règlement.',
    '',
    regler,
    '',
    'Si vous avez décidé d’arrêter votre abonnement, vous pouvez le faire à tout moment depuis le Support de votre espace client ou en répondant à ce courriel ; la facture ci-dessus reste alors à régler.',
    '',
    'Bien cordialement,',
  ] : [
    'Bonjour,',
    '',
    'Nous vous avons écrit il y a quelques jours au sujet de ' + quoi + ' : elle reste impayée à ce jour, et l’accès aux fonctions payantes d’OP GESTION reste suspendu.',
    '',
    regler,
    '',
    'Si cette facture n’est pas réglée prochainement, nous serons amenés à engager les démarches de recouvrement prévues à l’article 7 de nos conditions générales, après vous en avoir informé par écrit. Nous préférons de loin éviter d’en arriver là.',
    '',
    'Si vous avez décidé d’arrêter votre abonnement, répondez-nous : nous programmerons sa fin. La facture ci-dessus reste, dans ce cas, due.',
    '',
    'Bien cordialement,',
  ];
  return { objet: etape === 3 ? 'Un prélèvement à régler pour votre abonnement OP GESTION' : 'Rappel : votre facture OP GESTION reste impayée', texte: corps.join('\n'),
    autorises: { liens: url ? [url] : [], montants: montant ? [Number(f.montantEur)] : [], permis: numero ? [numero] : [] } };
}

/* L'INDEMNITÉ FORFAITAIRE DE RECOUVREMENT (30 octobre 2026, Justin : « droit français : indemnité forfaitaire de 40 € ») — article L. 441-10 et D. 441-5 du Code de commerce : tout retard de paiement entre professionnels
   donne lieu de plein droit à une indemnité de 40 € pour frais de recouvrement. Le TEXTE est écrit ICI, une fois, jamais par le modèle : une règle de droit ne se paraphrase pas. ⚠️ À faire confirmer par l'expert-comptable de
   Justin (la mention doit aussi figurer dans les CGV et sur les factures) : elle n'est ajoutée qu'à la SECONDE relance, et seulement quand le mode « travail » est allumé. */
const INDEMNITE_RECOUVREMENT_EUR = 40;
const PARAGRAPHE_INDEMNITE = 'Nous vous rappelons qu’en application des articles L. 441-10 et D. 441-5 du Code de commerce, tout retard de paiement entre professionnels donne lieu de plein droit, en plus des sommes dues, à une indemnité forfaitaire de ' + INDEMNITE_RECOUVREMENT_EUR + ' € pour frais de recouvrement.';

/* Margaux, mode « travail » — la relance dont le CODE tient les faits et les blocs de droit, et dont le MODÈLE écrit la situation (`corpsModele` : les paragraphes entre « Bonjour, » et « Bien cordialement, »).
   Rend { objet, texte, autorises } comme `relanceImpaye`, ou null si les paragraphes sont inutilisables. Le modèle n'écrit ni lien, ni montant de droit, ni mise en demeure : le contrôle ci-dessous le refuse. */
function relanceTravail(o, corpsModele) {
  const d = donneesRelance(o);
  const corps = String(corpsModele || '').replace(/\r/g, '').replace(/^\s*Bonjour,?\s*\n/i, '').replace(/\n\s*Bien cordialement,?\s*$/i, '').trim();
  if (corps.length < 80 || corps.length > 1800) return null;
  const arret = d.etape === 3
    ? 'Si vous avez décidé d’arrêter votre abonnement, vous pouvez le faire à tout moment depuis le Support de votre espace client ou en répondant à ce courriel ; la facture ci-dessus reste alors à régler.'
    : 'Si vous avez décidé d’arrêter votre abonnement, répondez-nous : nous programmerons sa fin. La facture ci-dessus reste, dans ce cas, due.';
  const acces = d.etape === 3
    ? 'Tant que cette facture n’est pas réglée, l’accès aux fonctions payantes d’OP GESTION est suspendu. Rien n’est perdu : vos données sont intactes, et l’accès revient dès le règlement.'
    : 'L’accès aux fonctions payantes d’OP GESTION reste suspendu jusqu’au règlement ; vos données sont intactes.';
  const suite = d.etape === 7 ? [PARAGRAPHE_INDEMNITE, '', 'Si cette facture n’est pas réglée prochainement, nous serons amenés à engager les démarches de recouvrement prévues à l’article 7 de nos conditions générales, après vous en avoir informé par écrit. Nous préférons de loin éviter d’en arriver là.', ''] : [];
  const texte = ['Bonjour,', '', corps, '', d.regler, '', acces, ''].concat(suite, [arret, '', 'Bien cordialement,']).join('\n');
  const montants = (d.montant ? [Number(d.f.montantEur)] : []).concat(d.etape === 7 ? [INDEMNITE_RECOUVREMENT_EUR] : []);
  return { objet: d.etape === 3 ? 'Un prélèvement à régler pour votre abonnement OP GESTION' : 'Rappel : votre facture OP GESTION reste impayée', texte,
    autorises: { liens: d.url ? [d.url] : [], montants, permis: d.numero ? [d.numero] : [] } };
}

/* Margaux — la MISE EN DEMEURE préparée (document pour Justin : il la relit, la corrige, la valide). Les faits viennent de Stripe, le nom de l'entreprise du registre
   (nettoyé, borné). Le délai est un réglage du texte, pas une règle de droit : Justin le relit avant de valider. */
const DELAI_MISE_EN_DEMEURE_JOURS = 8;
function miseEnDemeure(o) {
  o = o || {};
  const f = o.facture && typeof o.facture === 'object' ? o.facture : {};
  const numero = /^[A-Za-z0-9][A-Za-z0-9_-]{0,40}$/.test(String(f.numero || '')) ? String(f.numero) : '';
  const montant = Number.isFinite(Number(f.montantEur)) && Number(f.montantEur) > 0 && Number(f.montantEur) < 100000 ? eurosFr(f.montantEur) : '';
  const url = urlFacture(o.url);
  const nom = String(o.entreprise || '').replace(/[\u0000-\u001f\u007f<>[\]{}]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  const emise = dateLongue(f.emiseMs);
  /* ce qui a VRAIMENT été envoyé avant : une mise en demeure ne ment pas sur les relances (0, 1 ou 2) */
  const dejaEcrit = o.relances >= 2 ? ' Nous vous avons déjà écrit à ce sujet deux fois, sans réponse ni règlement.' : o.relances === 1 ? ' Nous vous avons déjà écrit à ce sujet, sans réponse ni règlement.' : '';
  const delai = Number.isInteger(o.delaiJours) && o.delaiJours >= 3 && o.delaiJours <= 30 ? o.delaiJours : DELAI_MISE_EN_DEMEURE_JOURS;
  const objet = 'Mise en demeure de payer' + (numero ? ' — facture n° ' + numero : '');
  const lignes = [
    'Madame, Monsieur,',
    '',
    'Nous vous écrivons au sujet de l’abonnement OP GESTION souscrit par ' + (nom ? 'l’entreprise ' + nom : 'votre entreprise') + ' auprès de TEAM OP.',
    '',
    'La facture' + (numero ? ' n° ' + numero : '') + (montant ? ', d’un montant de ' + montant + ' €,' : '') + (emise ? ' émise le ' + emise + ',' : '') + ' n’a pas été réglée à ce jour.' + dejaEcrit,
    '',
    'Nous vous mettons donc en demeure de régler cette somme dans un délai de ' + delai + ' jours à compter de la réception de ce courrier' + (url ? ', en ligne, depuis la page de la facture : ' + url : ', en nous écrivant à ' + ADRESSE_CONTACT + ' pour convenir des modalités') + '.',
    '',
    'À défaut de règlement dans ce délai, nous nous réservons le droit d’engager les démarches de recouvrement prévues à l’article 7 de nos conditions générales. Le présent courrier vaut information préalable écrite au sens de cet article.',
    '',
    'L’accès aux fonctions payantes d’OP GESTION reste suspendu jusqu’au règlement. Vos données sont conservées. Vous pouvez mettre fin à l’abonnement à tout moment ; cela ne supprime pas la facture due.',
    '',
    'Cordialement,',
  ];
  return { objet, texte: lignes.join('\n'),
    autorises: { liens: url ? [url] : [], montants: montant ? [Number(f.montantEur)] : [], permis: numero ? [numero] : [] } };
}

/* Emma — les créneaux proposés à un prospect qui veut être appelé. `creneaux` : [ms] tirés des disponibilités RÉGLÉES PAR JUSTIN (rien d'inventé). */
function propositionCreneaux(o) {
  o = o || {};
  const cr = (Array.isArray(o.creneaux) ? o.creneaux : []).filter(t => Number.isFinite(t) && t > 0).slice(0, 5);
  if (!cr.length) return null;
  const duree = Number.isInteger(o.dureeMin) && o.dureeMin >= 10 && o.dureeMin <= 120 ? o.dureeMin : 0;
  const corps = [
    'Bonjour,',
    '',
    'Merci de l’intérêt que vous portez à OP GESTION. Vous souhaitez échanger avec nous par téléphone : voici les créneaux auxquels un membre de notre équipe peut vous appeler.',
    '',
    ...cr.map((t, i) => (i + 1) + '. ' + creneauLibelle(t)),
    '',
    'Répondez simplement à ce courriel en indiquant le numéro du créneau qui vous convient' + (duree ? ' (l’appel dure environ ' + duree + ' minutes)' : '') + '. Si aucun ne vous va, dites-le-nous : nous trouverons un autre moment.',
    '',
    'Bien cordialement,',
  ];
  return { objet: 'Votre demande d’appel — créneaux proposés', texte: corps.join('\n') };
}
/* Emma — le prospect n'a pas répondu en deux jours : UNE relance courte, avec les créneaux qui restent libres pour lui (28 octobre 2026). `creneaux` : [{ n, ms }] — `n` est le NUMÉRO du créneau dans la
   première proposition (celui que le prospect citera en répondant : on ne renumérote pas). Rien d'inventé : les mêmes créneaux, jamais un nouveau. */
function relanceCreneaux(o) {
  o = o || {};
  const cr = (Array.isArray(o.creneaux) ? o.creneaux : []).filter(x => x && Number.isInteger(x.n) && x.n >= 1 && x.n <= 5 && Number.isFinite(x.ms) && x.ms > 0).slice(0, 5);
  if (!cr.length) return null;
  const corps = [
    'Bonjour,',
    '',
    'Nous vous avons proposé il y a quelques jours un appel avec notre équipe, et nous n’avons pas encore eu votre retour. Voici les créneaux qui restent disponibles :',
    '',
    ...cr.map(x => x.n + '. ' + creneauLibelle(x.ms)),
    '',
    'Répondez simplement à ce courriel en indiquant le numéro du créneau qui vous convient. Si aucun ne vous va, ou si vous n’avez plus besoin de cet appel, dites-le-nous : nous nous adapterons.',
    '',
    'Bien cordialement,',
  ];
  return { objet: 'Rappel — votre demande d’appel', texte: corps.join('\n') };
}
/* Emma — le rendez-vous est fixé. */
function confirmationRendezVous(o) {
  const l = creneauLibelle(o && o.ms);
  if (!l) return null;
  return { objet: 'Votre appel est confirmé', texte: [
    'Bonjour,', '',
    'Nous confirmons votre appel avec notre équipe : ' + l + '.', '',
    'Si ce créneau ne vous convient plus, répondez simplement à ce courriel : nous en trouverons un autre.', '',
    'Bien cordialement,'].join('\n') };
}
/* Emma — pas de créneau réglé (ou aucun ne convient) : on dit la vérité, on rappelle. */
function rappelProspect() {
  return { objet: 'Votre demande d’appel', texte: [
    'Bonjour,', '',
    'Nous avons bien reçu votre demande d’être appelé. Un membre de notre équipe vous rappellera, et nous reviendrons vers vous par courriel pour convenir du moment qui vous arrange.', '',
    'Bien cordialement,'].join('\n') };
}

module.exports = { signatureAgent, SIGNATURES, ADRESSE_CONTACT, controle, accuseResiliation, relanceImpaye, relanceTravail, donneesRelance, PARAGRAPHE_INDEMNITE, INDEMNITE_RECOUVREMENT_EUR, miseEnDemeure, propositionCreneaux, relanceCreneaux, confirmationRendezVous, rappelProspect,
  creneauLibelle, dateLongue, eurosFr, DELAI_MISE_EN_DEMEURE_JOURS, FUSEAU };
