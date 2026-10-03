/* ══ LE COURRIEL D'INVITATION — UNE RÉUNION, UN FICHIER .ICS, UNE ADRESSE QUE L'HÔTE A SAISIE ═══════════════════════════════════════════════════
 *
 * L'hôte d'une réunion peut l'envoyer par courriel à quelqu'un qui n'a pas OP MESSAGES : le message porte le fichier `.ics` (le même que celui de la route `GET …/ics`) et l'agenda de
 * la personne le lit. Ce module est INERTE sans configuration (`config.courriel` : un relais SMTP) et le DIT — la page affiche « l'envoi par courriel n'est pas encore ouvert » —, rien
 * ne part, rien n'est demandé à personne.
 *
 *   · LE GABARIT EST FIXE. L'objet est toujours le même (« Invitation à une réunion — OP MESSAGES »), le corps est du TEXTE SIMPLE (aucun HTML, aucun lien, aucune image) : ce que l'hôte
 *     écrit (le titre, le lieu) y entre comme du texte, une seule fois, dans une phrase qui nomme l'hôte et dit d'où vient le message. Un service qui laisserait écrire l'objet et le
 *     corps serait un relais de courriers non sollicités ; un titre de cent vingt signes dans un gabarit qui dit « ignorez-le si vous ne connaissez pas cette personne » en est le
 *     moindre abus. Il n'y a pas de réponse possible (aucune adresse de l'hôte n'est connue ni donnée) et rien n'est inscrit au nom du destinataire.
 *   · DEUX PLAFONDS DURABLES (un redémarrage ne les remet pas à zéro) : dix courriels par compte et par 24 heures, deux par destinataire et par 7 jours. Le destinataire se compte sur son
 *     EMPREINTE (`scelleur.hmac`, l'adresse écrite sans « +étiquette » et en minuscules) : l'adresse elle-même n'est rangée NULLE PART — ni dans la base, ni dans un journal, ni dans /health.
 *     L'envoi est RÉSERVÉ avant de partir (le plafond se prend dans le même souffle qu'il se vérifie) et RENDU si le relais refuse : une panne du relais ne consomme pas les plafonds.
 *   · LE SECRET. Le mot de passe du compte de messagerie vit dans le fichier de configuration (0600), posé par `configurer-courriel.js` en saisie masquée ; il ne sort pas d'ici : jamais
 *     un journal, jamais /health, jamais /api/config (qui ne dit que `courriel.ouvert`).
 *   · LE JOURNAL ne reçoit qu'un état et un nombre (`courriel` : envoye, echec) — jamais une adresse, un nom, un titre.
 */
'use strict';
const ics = require('./ics');
const cal = require('./calendrier');
const { RE_ADRESSE_MEL } = require('./config');
const { nomAffiche, fuseauDe } = require('./reunions-outils');

const JOUR = 86400000;
const COMPTE_MAX = 10, COMPTE_FENETRE_MS = JOUR;
const DEST_MAX = 2, DEST_FENETRE_MS = 7 * JOUR;
const SUJET = 'Invitation à une réunion — OP MESSAGES';
const REPETE = { quotidienne: 'chaque jour', hebdomadaire: 'chaque semaine', mensuelle: 'chaque mois' };

const erreur = (code) => { const e = new Error(code); e.code = code; return e; };

/* Une adresse telle que l'hôte l'a tapée, ou null : une ligne, 254 signes au plus, la forme `nom@domaine.tld` — pas de blanc, pas de saut de ligne (aucun en-tête ne s'ouvre par là), pas deux
   adresses, pas de nom affiché, et un dernier segment qui COMMENCE PAR UNE LETTRE (`nom@127.0.0.1` n'est pas une boîte). */
function adresseValide(brut) {
  if (typeof brut !== 'string') return null;
  const a = brut.trim();
  if (a.length < 6 || a.length > 254 || /[\s\u0000-\u001f\u007f<>(),;:\\"]/.test(a) || !RE_ADRESSE_MEL.test(a) || !/\.[A-Za-z][A-Za-z0-9-]*$/.test(a)) return null;
  return a;
}
/* L'adresse comptée pour le plafond : en minuscules et sans « +étiquette » (`nom+1@x.fr`, `nom+2@x.fr`, `NOM@x.fr` sont une seule boîte). Une partie locale qui n'est QUE l'étiquette (`+x@d.fr`)
   est gardée telle quelle : sinon toutes ces adresses-là tomberaient dans la même boîte `@d.fr`.
   ⛔ GMAIL IGNORE LES POINTS de la partie locale et sert `googlemail.com` comme `gmail.com` : `j.dupont@gmail.com`, `jdupont@gmail.com` et `j.dupont@googlemail.com` sont UNE boîte — sans quoi
   « deux courriels par semaine et par destinataire » se contournait en variant les points (relecture du gardien, remarque 1). Ailleurs un point compte : `a.b@x.fr` et `ab@x.fr` sont deux boîtes. */
const normalisee = (a) => {
  const i = a.lastIndexOf('@'), local = a.slice(0, i), sans = local.replace(/\+.*$/, '');
  let l = (sans || local).toLowerCase(), d = a.slice(i + 1).toLowerCase();
  if (d === 'gmail.com' || d === 'googlemail.com') { d = 'gmail.com'; l = l.replace(/\./g, '') || l; }
  return l + '@' + d;
};

/* Le corps : du texte simple. `hote` : celui qui invite ; `r` : la réunion (titre, lieu, fuseau, répétition) ; `t` : l'occurrence dont on parle (la prochaine, ou celle qu'on a choisie) ; `serie` :
   le fichier joint porte-t-il TOUTE la série (alors le message dit qu'elle se répète) — un fichier d'une seule occurrence ne le dit pas, il ne se répète pas. */
function corpsDuMessage(hote, r, t, serie) {
  const quand = cal.dire(t, fuseauDe(null, r.tz)) + ' (heure de ' + r.tz + ')';
  return ['Bonjour,', '', nomAffiche(hote) + ' vous invite à une réunion.', '',
    '  Réunion : ' + r.titre, '  Quand : ' + quand + (serie && REPETE[r.repetition] ? ' — se répète ' + REPETE[r.repetition] : ''), r.lieu ? '  Lieu : ' + r.lieu : null, '',
    'Le fichier joint (.ics) ajoute cette réunion à votre agenda : ouvrez-le avec votre application de calendrier.', '',
    '--', 'Ce message a été envoyé par OP MESSAGES à la demande de ' + nomAffiche(hote) + '. Vous ne pouvez pas y répondre. Si vous ne connaissez pas cette personne, ignorez-le : rien n\'est inscrit à votre nom.', ''].filter(l => l !== null).join('\r\n');
}

function creerCourriel({ config, stockage, scelleur, horloge, journaliser }) {
  const cfg = config.courriel;
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  let transport = null;
  /* `nodemailer` ne se charge qu'au premier envoi : un service sans relais ne le demande jamais. Ni fichier ni adresse web lus pour une pièce jointe (`disableFileAccess`, `disableUrlAccess`). */
  function transporter() {
    if (transport) return transport;
    const nodemailer = require('nodemailer');
    transport = nodemailer.createTransport({
      host: cfg.hote, port: cfg.port, secure: cfg.securite === 'ssl', requireTLS: cfg.securite === 'starttls', ignoreTLS: cfg.securite === 'aucune',
      auth: cfg.utilisateur !== null ? { user: cfg.utilisateur, pass: cfg.motDePasse } : undefined,
      connectionTimeout: cfg.timeoutMs, greetingTimeout: cfg.timeoutMs, socketTimeout: cfg.timeoutMs, disableFileAccess: true, disableUrlAccess: true, tls: { minVersion: 'TLSv1.2' },
    });
    return transport;
  }
  const ouvert = () => cfg.mode === 'smtp';

  /* Envoie l'invitation. `reunion` : la fiche telle que la voit l'hôte (`reunionPourMembre().reunion`) ; `occurrence` : le début d'une occurrence, ou undefined (toute la série).
     → { ok: true } ; sinon lève une erreur COUPLÉE d'un code : courriel_non_ouvert, courriel_invalide, courriel_quota_compte, courriel_quota_destinataire, occurrence_inconnue, courriel_echec. */
  async function envoyer({ uid, hote, destinataire, reunion, occurrence }) {
    if (!ouvert()) throw erreur('courriel_non_ouvert');
    const adresse = adresseValide(destinataire);
    if (!adresse) throw erreur('courriel_invalide');
    const t = horloge();
    const destH = scelleur.hmac('courrier', 'destinataire', normalisee(adresse));
    const n = stockage.courrierCompter({ uid, destH, depuis: { compte: t - COMPTE_FENETRE_MS, destinataire: t - DEST_FENETRE_MS } });
    if (n.compte >= COMPTE_MAX) throw erreur('courriel_quota_compte');
    if (n.destinataire >= DEST_MAX) throw erreur('courriel_quota_destinataire');
    const opts = { maintenant: t, rappels: reunion.rappels };
    if (occurrence !== undefined && occurrence !== null) opts.occurrence = occurrence;
    const fichier = ics.fichier({ id: reunion.id, titre: reunion.titre, lieu: reunion.lieu, debut: reunion.debut, fin: reunion.fin, tz: reunion.tz, rep: reunion.repetition, n: reunion.n, jusqua: reunion.jusqua, annulee: reunion.annulee, version: reunion.version }, opts);
    if (fichier === null) throw erreur('occurrence_inconnue');
    const quand = occurrence !== undefined && occurrence !== null ? occurrence : (cal.premiereApres({ debut: reunion.debut, fin: reunion.fin, tz: reunion.tz, rep: reunion.repetition, n: reunion.n, jusqua: reunion.jusqua }, t, true) || { debut: reunion.debut }).debut;
    const reserve = stockage.courrierNoter({ uid, destH });         // RÉSERVÉ avant de partir : le plafond se prend dans le même souffle qu'il se vérifie
    try {
      await transporter().sendMail({
        from: { name: cfg.nom, address: cfg.de }, to: adresse, subject: SUJET, text: corpsDuMessage(hote, reunion, quand, occurrence === undefined || occurrence === null),
        attachments: [{ filename: ics.nom({ titre: reunion.titre }), content: fichier, contentType: 'text/calendar; charset=utf-8; method=PUBLISH' }],
        headers: { 'X-Auto-Response-Suppress': 'All', 'Auto-Submitted': 'auto-generated' },
      });
    } catch (e) {
      stockage.courrierRetirer(reserve);                            // le relais a refusé : la place est rendue
      journal('courriel', { etat: 'echec', nom: (e && (e.code || e.name)) || 'Erreur' });
      throw erreur('courriel_echec');
    }
    journal('courriel', { etat: 'envoye' });
    return { ok: true };
  }

  /* Pour `configurer-courriel.js` et les bancs : le relais répond-il, et accepte-t-il l'identifiant ? (une connexion, aucun courriel). */
  async function verifier() {
    if (!ouvert()) throw erreur('courriel_non_ouvert');
    await transporter().verify();
    return true;
  }
  function arreter() { try { if (transport && typeof transport.close === 'function') transport.close(); } catch (e) { /* déjà fermé */ } transport = null; }
  return { ouvert, envoyer, verifier, arreter, mode: () => cfg.mode, COMPTE_MAX, DEST_MAX };
}

module.exports = { creerCourriel, adresseValide, normalisee, corpsDuMessage, SUJET, COMPTE_MAX, DEST_MAX, COMPTE_FENETRE_MS, DEST_FENETRE_MS };
