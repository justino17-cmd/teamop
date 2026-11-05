/* ⛔ LA FAUSSE BOÎTE IMAP DES BANCS DES BOÎTES MAIL D'OP MESSAGES — `tests/faux-imap.js` (la fausse boîte de la messagerie d'OP GESTION), plus UNE chose : elle NOTE chaque connexion que le service ouvre
   (qui, avec quoi, vers où), dans le fichier que `FAUX_IMAP_JOURNAL` désigne. C'est ce qui permet à un banc de dire « le service s'est présenté avec CE jeton d'accès » ou « il a visé l'adresse résolue,
   pas le nom », sans réseau.

   Chargé par `node -r` (variable `NODE_OPTIONS`) dans le processus du VRAI `server-msg/index.js` : `require('imapflow')` y rend cette classe. `FAUX_IMAP` donne le fichier d'état des boîtes (voir
   `faux-imap.js`), `FAUX_IMAP_RACINE` le dossier `server-msg/` (où se résout `imapflow`). Ce fichier n'est PAS une suite. Rien ne sort sur le réseau. */
'use strict';
const fs = require('fs');
const base = require('./faux-imap');

const JOURNAL = () => process.env.FAUX_IMAP_JOURNAL;

class ImapFlowNote extends base.ImapFlow {
  async connect() {
    const o = this.o || {}, a = o.auth || {};
    if (JOURNAL()) {
      try {
        fs.appendFileSync(JOURNAL(), JSON.stringify({ t: Date.now(), user: a.user || null, pass: a.pass || null, accessToken: a.accessToken || null, host: o.host || null, port: o.port || null,
          secure: o.secure === true, servername: o.servername || null, tlsServername: (o.tls && o.tls.servername) || null }) + '\n');
      } catch (e) { /* un journal de banc qui échoue ne change pas la conversation */ }
    }
    return super.connect();
  }
}

function installer(racine) {
  const Module = require('module');
  const cible = require.resolve('imapflow', { paths: [racine] });
  const m = new Module(cible); m.filename = cible; m.loaded = true; m.exports = Object.assign({}, base, { ImapFlow: ImapFlowNote });
  require.cache[cible] = m;
}
if (process.env.FAUX_IMAP_RACINE) installer(process.env.FAUX_IMAP_RACINE);

function lireJournal(fichier) {
  try { return fs.readFileSync(fichier, 'utf8').split('\n').filter(Boolean).map(l => JSON.parse(l)); } catch (e) { return []; }
}
module.exports = { ImapFlowNote, installer, lireJournal };
