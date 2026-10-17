/* ══ LE COURRIEL D'INVITATION — UNE RÉUNION, UN TEXTE, UNE ADRESSE QUE L'HÔTE A SAISIE ═══════════════════════════════════════════════════════════
 *
 * L'hôte d'une réunion peut l'envoyer par courriel à quelqu'un qui n'a pas OP MESSAGES : le message dit le titre, la date, l'heure (dans le fuseau de la réunion) et le lieu.
 * ⛔ SANS FICHIER .ICS DEPUIS LE 15 OCTOBRE 2026 (Justin : « retire aussi », après « l'application fait déjà agenda ») : il n'y a plus d'« Ajouter à mon calendrier » nulle part,
 * ni dans la fiche, ni dans le menu, ni ici. Ce module est INERTE sans configuration (`config.courriel` : un relais SMTP) et le DIT — la page affiche « l'envoi par courriel n'est
 * pas encore ouvert » —, rien ne part, rien n'est demandé à personne.
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
   le message parle-t-il de TOUTE la série (alors il dit qu'elle se répète, et jusqu'à quand) — celui d'une seule date ne le dit pas.
   ⛔ Une série BORNÉE (un nombre de fois, une date de fin) dit sa DERNIÈRE date : le fichier .ics joint portait la règle (COUNT, UNTIL) ; sans lui, « se répète chaque semaine » tout
   court ferait noter une réunion sans fin (relecture, 15 octobre 2026). La dernière date est celle que la fiche compte (`cal.derniereDate` : la première des deux bornes qui arrive). */
const FMT_FIN = new Intl.DateTimeFormat('fr-FR', { timeZone: 'UTC', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
function finDeLaSerie(r) {
  if (!r.n && !r.jusqua) return '';
  const d = cal.derniereDate({ debut: r.debut, fin: r.fin, tz: r.tz, rep: r.repetition, n: r.n || null, jusqua: r.jusqua || null });
  return d ? ', jusqu\'au ' + FMT_FIN.format(Date.UTC(d.a, d.m - 1, d.j)).replace(/\u202f|\u00a0/g, ' ') : '';
}
function corpsDuMessage(hote, r, t, serie) {
  const quand = cal.dire(t, fuseauDe(null, r.tz)) + ' (heure de ' + r.tz + ')';
  return ['Bonjour,', '', nomAffiche(hote) + ' vous invite à une réunion.', '',
    '  Réunion : ' + r.titre, '  Quand : ' + quand + (serie && REPETE[r.repetition] ? ' — se répète ' + REPETE[r.repetition] + finDeLaSerie(r) : ''), r.lieu ? '  Lieu : ' + r.lieu : null, '',
    '--', 'Ce message a été envoyé par OP MESSAGES à la demande de ' + nomAffiche(hote) + '. Vous ne pouvez pas y répondre. Si vous ne connaissez pas cette personne, ignorez-le : rien n\'est inscrit à votre nom.', ''].filter(l => l !== null).join('\r\n');
}

function creerCourriel({ config, stockage, scelleur, horloge, journaliser }) {
  const cfg = config.courriel;
  const journal = (evt, champs) => { try { if (journaliser) journaliser(evt, champs); } catch (e) { /* un journal qui échoue ne défait rien */ } };
  let transport = null;
  /* `nodemailer` ne se charge qu'au premier envoi : un service sans relais ne le demande jamais. Ni fichier ni adresse web lus pour une pièce jointe (`disableFileAccess`, `disableUrlAccess`) —
     aucun message n'en porte plus, la garde reste en défense en profondeur. */
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
    /* La date dont parle le message : celle que l'hôte a choisie, qui doit EXISTER dans la série (une date inventée ne part pas dans un courriel), sinon la prochaine. Une réunion
       seule n'a qu'une date, la sienne : une occurrence donnée ne la remplace pas (le texte est désormais tout ce que la personne reçoit — il ne dit que ce que la réunion est).
       Un fuseau que le service n'a pas validé ne produit pas d'heure au décalage inventé (la garde que portait le fichier .ics). */
    if (cal.tzValide(reunion.tz) === null) throw erreur('occurrence_inconnue');
    const choisie = occurrence !== undefined && occurrence !== null;
    let quand;
    if (choisie) {
      const occ = reunion.repetition === 'aucune' ? { debut: reunion.debut } : cal.occurrenceA({ debut: reunion.debut, fin: reunion.fin, tz: reunion.tz, rep: reunion.repetition, n: reunion.n || null, jusqua: reunion.jusqua || null }, occurrence);
      if (!occ) throw erreur('occurrence_inconnue');
      quand = occ.debut;
    } else quand = (cal.premiereApres({ debut: reunion.debut, fin: reunion.fin, tz: reunion.tz, rep: reunion.repetition, n: reunion.n, jusqua: reunion.jusqua }, t, true) || { debut: reunion.debut }).debut;
    const reserve = stockage.courrierNoter({ uid, destH });         // RÉSERVÉ avant de partir : le plafond se prend dans le même souffle qu'il se vérifie
    try {
      await transporter().sendMail({
        from: { name: cfg.nom, address: cfg.de }, to: adresse, subject: SUJET, text: corpsDuMessage(hote, reunion, quand, !choisie),
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

  /* Un message de COMPTE (le code d'inscription, le code d'un nouveau mot de passe, « cette adresse a déjà un compte ») : `compte-courriel.js` seul l'appelle, avec SES gabarits fixes —
     aucun texte n'y vient d'un inconnu. Les plafonds sont ceux du module des comptes (par adresse et par réseau), pris avant d'appeler. Rend true, ou lève `courriel_echec`. */
  async function envoyerTexte({ a, sujet, texte }) {
    if (!ouvert()) throw erreur('courriel_non_ouvert');
    const adresse = adresseValide(a);
    if (!adresse) throw erreur('courriel_invalide');
    try {
      await transporter().sendMail({ from: { name: cfg.nom, address: cfg.de }, to: adresse, subject: sujet, text: texte, headers: { 'X-Auto-Response-Suppress': 'All', 'Auto-Submitted': 'auto-generated' } });
    } catch (e) {
      journal('courriel', { etat: 'echec', nom: (e && (e.code || e.name)) || 'Erreur' });
      throw erreur('courriel_echec');
    }
    journal('courriel', { etat: 'envoye' });
    return true;
  }

  /* Pour `configurer-courriel.js` et les bancs : le relais répond-il, et accepte-t-il l'identifiant ? (une connexion, aucun courriel). */
  async function verifier() {
    if (!ouvert()) throw erreur('courriel_non_ouvert');
    await transporter().verify();
    return true;
  }
  /* ⛔ LE RELAIS EST-IL JOIGNABLE ? — la santé du relais, INDÉPENDANTE de toute adresse (entree#0, lot m02). `ouvert()` dit « configuré », jamais « joignable » : avec un relais mort, `inscrire` et
     `oubli` répondaient 200 et la page annonçait « un code vient d'y partir » pour un courriel qui ne partirait jamais. Le silence de ces routes n'est voulu que pour ne pas dire si une
     adresse a un compte ; une panne du relais ne dépend d'aucune adresse, elle se dit. ⛔ Elle ne se DÉDUIT PAS des échecs d'envoi : ceux-là ne frappent que les adresses qui ont un compte
     (une adresse inconnue n'envoie rien), donc ils diraient qui est inscrit. C'est une SONDE (`verifier()`, une connexion, aucun courriel), gardée `SONDE_MS` : une connexion au relais par
     demande ferait de ces routes un moyen d'user le relais, et un relais qui flanche une seconde ne ferme pas l'inscription pour une minute de plus que nécessaire. Plusieurs demandes
     simultanées partagent UNE sonde. Jamais de rejet : une sonde qui lève dit « injoignable ». */
  const SONDE_MS = 45000;
  const sonde = { ok: null, t: 0, enCours: null };
  const joignableVu = () => ouvert() && sonde.ok !== false;       // la dernière réponse connue, sans attendre (`/api/config`) : tant qu'on ne sait pas, on ne ferme rien
  function joignable() {
    if (!ouvert()) return Promise.resolve(false);
    if (sonde.ok !== null && horloge() - sonde.t < SONDE_MS) return Promise.resolve(sonde.ok);
    if (sonde.enCours) return sonde.enCours;
    sonde.enCours = (async () => {
      let ok = true;
      try { await verifier(); } catch (e) { ok = false; if (sonde.ok !== false) journal('courriel', { etat: 'sonde_echec', nom: (e && (e.code || e.name)) || 'Erreur' }); }
      sonde.ok = ok; sonde.t = horloge(); sonde.enCours = null;
      return ok;
    })();
    return sonde.enCours;
  }
  function arreter() { try { if (transport && typeof transport.close === 'function') transport.close(); } catch (e) { /* déjà fermé */ } transport = null; }
  return { ouvert, joignable, joignableVu, envoyer, envoyerTexte, verifier, arreter, mode: () => cfg.mode, COMPTE_MAX, DEST_MAX };
}

module.exports = { creerCourriel, adresseValide, normalisee, corpsDuMessage, SUJET, COMPTE_MAX, DEST_MAX, COMPTE_FENETRE_MS, DEST_FENETRE_MS };
