/* ══ LES CANAUX DU CODE À USAGE UNIQUE — COMMENT LE CODE ARRIVE AU SIGNATAIRE ═══════════════════════════════════════════
 * Le moteur interne ne sait pas envoyer : il appelle `canaux.email({ destination, code, titre, expediteur, nom })` ou `canaux.sms(…)`. Un canal ABSENT veut
 * dire « pas disponible » : la création d'une demande qui en a besoin est refusée AVANT d'enregistrer quoi que ce soit (`canal_indisponible`).
 *  · e-mail : SMTP d'une boîte TeamOP dédiée (`signature.smtp` dans la configuration, posée par `configurer-signature.js`, saisie masquée). `nodemailer`, comme `server/`.
 *  · SMS    : pas encore (phase 2 du plan : fournisseur à choisir). Tant qu'il n'existe pas, « Code SMS » est refusé avec un message qui propose « Code e-mail ».
 * ⛔ Le code n'est écrit nulle part ailleurs que dans le message : ni au journal, ni dans la base (on n'y garde que son HMAC).
 */
'use strict';
const nodemailer = require('nodemailer');

function creerCanaux({ smtp, transport } = {}) {
  const canaux = {};
  const t = transport || (smtp && smtp.host && smtp.from ? nodemailer.createTransport({
    host: smtp.host, port: Number(smtp.port) || (smtp.secure ? 465 : 587), secure: !!smtp.secure,
    auth: smtp.user ? { user: smtp.user, pass: smtp.pass } : undefined,
    tls: { minVersion: 'TLSv1.2' }, connectionTimeout: 10000, greetingTimeout: 10000, socketTimeout: 15000,
  }) : null);
  if (t) {
    const de = (smtp && smtp.from) || 'TeamOP Signature <signature@localhost>';
    canaux.email = async ({ destination, code, titre, expediteur, nom }) => {
      const prenom = String(nom || '').trim().split(/\s+/)[0] || '';
      const corps = 'Bonjour' + (prenom ? ' ' + prenom : '') + ',\n\n'
        + 'Voici votre code pour signer « ' + titre + ' »' + (expediteur ? ', demandé par ' + expediteur : '') + ' :\n\n'
        + '    ' + code + '\n\n'
        + 'Il est valable 10 minutes. Ne le communiquez à personne : TeamOP ne vous le demandera jamais.\n'
        + 'Si vous n\'êtes pas à l\'origine de cette demande, ignorez ce message : sans ce code, rien n\'est signé.\n\n'
        + 'TeamOP - signature électronique\n';
      await t.sendMail({ from: de, to: destination, subject: 'Votre code de signature : ' + code, text: corps, headers: { 'X-Auto-Response-Suppress': 'All' } });
    };
  }
  return canaux;
}
module.exports = { creerCanaux };
