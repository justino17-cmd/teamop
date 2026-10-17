/* ⛔ LA FAUSSE BOÎTE IMAP DES BANCS DE LA MESSAGERIE — un module `imapflow` de banc, glissé dans le cache de
   `require` par `node -r tests/faux-imap.js` AVANT que le vrai serveur ne démarre.

   Sortie de `test-834` (qui en avait une version à deux dossiers, sans structure, sans recherche par texte et
   dont `append` ne faisait rien) pour servir à tout banc qui veut voir, SANS réseau, ce que la relève du support
   et la Messagerie (`server/mail.js`) font d'une vraie boîte. Rien ne sort d'ici.

   ── CE QU'ELLE JOUE, ET CE QUE LA PREMIÈRE VERSION NE JOUAIT PAS ──────────────────────────────────────────
   · LES SIX DOSSIERS d'une boîte réelle (Réception, Envoyés, Brouillons, Archives, Indésirables, Corbeille),
     reconnus à leur usage spécial comme le fait un serveur IMAP, plus un dossier « à ne pas ouvrir » (`\Noselect`).
   · `status` — le décompte des non-lus de CHAQUE dossier — et le nombre de fois qu'on l'a demandé : un cache se
     prouve en comptant les questions posées, pas en regardant la réponse.
   · une VRAIE structure de message (`bodyStructure`) : une partie texte, une partie HTML, des pièces jointes ;
     et une vraie source MIME que `mailparser` sait relire.
   · la recherche par texte (objet, expéditeur, destinataire, corps), par lu / non lu, par drapeau, avec `or` et `not`.
   · `append` RÉEL : le message copié dans Envoyés ou Brouillons existe ensuite, avec ses pièces, et se relit.
   · les drapeaux, le déplacement (le message reçoit un NOUVEL identifiant dans le dossier d'arrivée, comme chez
     un vrai serveur) et la suppression.
   · plusieurs boîtes à la fois, chacune sous son adresse, et des boîtes qui REFUSENT la connexion avec le message
     qu'on veut (un message d'erreur qui contient l'adresse : c'est ce que fait un vrai serveur d'e-mails).
   · comme `imapflow`, tout geste sur un message exige la boîte OUVERTE (`getMailboxLock`) : une route qui
     l'oublierait tombe ici, et pas seulement chez un client.

   ── LE FICHIER D'ÉTAT ──────────────────────────────────────────────────────────────────────────────────────
   Le banc l'écrit, le serveur le lit et le réécrit (écriture atomique) : `process.env.FAUX_IMAP` en donne le chemin.
     { "boites": { "<adresse en minuscules>": { dossiers?, messages: [...], actions: [...], ajouts: [...], statuts: {…} } },
       "pannes": { "<adresse>": "le message de l'erreur" } }
   Sans la clé `boites` (le format de `test-834`), l'état entier est LA boîte — la compatibilité tient à ça.
   Un message : { uid, messageId, dossier ('INBOX' par défaut), from, fromNom?, to, cc?, subject, text, html?,
                  pieces?: [{ nom, type?, taille?, b64? }], ts, flags: [] }
   `actions` note chaque geste (`{ action, messageId, dossier }`), `ajouts` chaque `append`, `statuts` chaque
   `status` demandé par dossier. */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DOSSIERS = [
  { chemin: 'INBOX' },
  { chemin: 'Envoyés', specialUse: '\\Sent' },
  { chemin: 'Brouillons', specialUse: '\\Drafts' },
  { chemin: 'Archives', specialUse: '\\Archive' },
  { chemin: 'Indésirables', specialUse: '\\Junk' },
  { chemin: 'Corbeille', specialUse: '\\Trash' },
  { chemin: 'Dossiers', noselect: true }
];
const FICHIER = () => process.env.FAUX_IMAP;
const RACINE_MODULES = () => process.env.FAUX_IMAP_RACINE;

function lireEtat(fichier) { try { return JSON.parse(fs.readFileSync(fichier || FICHIER(), 'utf8')); } catch (e) { return { messages: [], actions: [] }; } }
function ecrireEtat(etat, fichier) { const f = fichier || FICHIER(); fs.writeFileSync(f + '.tmp', JSON.stringify(etat)); fs.renameSync(f + '.tmp', f); }
/* La boîte d'un compte : dans `boites` s'il existe, sinon l'état entier. */
function partie(etat, user) {
  if (etat.boites) { const k = String(user || '').toLowerCase(); return etat.boites[k] || (etat.boites[k] = { messages: [], actions: [] }); }
  return etat;
}
const dossiersDe = (p) => (Array.isArray(p.dossiers) && p.dossiers.length ? p.dossiers : DOSSIERS);
const existe = (p, chemin) => dossiersDe(p).some(d => d.chemin === chemin && !d.noselect);
const dans = (p, d) => p.messages.filter(m => (m.dossier || 'INBOX') === d).sort((a, b) => a.uid - b.uid);
const aLe = (m, f) => (m.flags || []).includes(f);

/* ── des adresses ── */
function personnes(v) {
  const l = Array.isArray(v) ? v : String(v || '').split(/[,;]/);
  return l.map(x => (typeof x === 'string' ? x.trim() : x)).filter(Boolean).map(x => {
    if (typeof x !== 'string') return { address: String(x.address || ''), name: String(x.name || '') };
    const m = /^"?([^"<]*?)"?\s*<([^<>]+)>$/.exec(x);
    return m ? { address: m[2].trim(), name: m[1].trim() } : { address: x, name: '' };
  });
}
const enteteAdr = (l) => l.map(p => (p.name ? enc2047(p.name) + ' <' + p.address + '>' : p.address)).join(', ');
function enc2047(t) { t = String(t || ''); return /^[\x20-\x7e]*$/.test(t) ? t : '=?UTF-8?B?' + Buffer.from(t, 'utf8').toString('base64') + '?='; }
const b64Lignes = (buf) => (Buffer.isBuffer(buf) ? buf : Buffer.from(String(buf), 'utf8')).toString('base64').replace(/.{1,76}/g, '$&\r\n');

/* ── la source MIME d'un message : celle de l'`append` si elle existe, sinon fabriquée ── */
function source(m) {
  if (m.raw) return Buffer.from(m.raw, 'base64');
  const pieces = m.pieces || [];
  const tete = 'Message-ID: ' + m.messageId + '\r\nDate: ' + new Date(m.ts || Date.now()).toUTCString()
    + '\r\nFrom: ' + enteteAdr([{ address: m.from, name: m.fromNom || '' }]) + '\r\nTo: ' + enteteAdr(personnes(m.to))
    + (m.cc ? '\r\nCc: ' + enteteAdr(personnes(m.cc)) : '') + '\r\nSubject: ' + enc2047(m.subject) + '\r\nMIME-Version: 1.0\r\n';
  const texte = 'Content-Type: text/plain; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64Lignes(m.text || '');
  const html = 'Content-Type: text/html; charset=utf-8\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64Lignes(m.html || '');
  const corps = m.html
    ? 'Content-Type: multipart/alternative; boundary="ALT"\r\n\r\n--ALT\r\n' + texte + '--ALT\r\n' + html + '--ALT--\r\n'
    : texte;
  if (!pieces.length) return Buffer.from(tete + corps);
  let out = tete + 'Content-Type: multipart/mixed; boundary="MIX"\r\n\r\n--MIX\r\n' + corps;
  for (const p of pieces) {
    const contenu = p.b64 ? Buffer.from(p.b64, 'base64') : Buffer.alloc(p.taille || 0, 'x');
    out += '--MIX\r\nContent-Type: ' + (p.type || 'application/octet-stream') + '; name="' + p.nom + '"\r\nContent-Disposition: attachment; filename="' + p.nom
      + '"\r\nContent-Transfer-Encoding: base64\r\n\r\n' + b64Lignes(contenu);
  }
  return Buffer.from(out + '--MIX--\r\n');
}
/* ── la structure que `imapflow` rend : les conteneurs n'ont pas de `part`, les feuilles oui ── */
function structure(m) {
  const pieces = m.pieces || [];
  const corps = m.html
    ? { type: 'multipart/alternative', childNodes: [{ part: '1.1', type: 'text/plain' }, { part: '1.2', type: 'text/html' }] }
    : { part: '1', type: 'text/plain' };
  if (!pieces.length) return corps;
  return { type: 'multipart/mixed', childNodes: [corps].concat(pieces.map((p, i) => ({
    part: String(i + 2), type: p.type || 'application/octet-stream', size: p.taille || (p.b64 ? Buffer.from(p.b64, 'base64').length : 0),
    disposition: 'attachment', dispositionParameters: { filename: p.nom } }))) };
}
/* ── ce qu'on rend d'un message, SEULEMENT ce qui a été demandé (comme `imapflow`) ── */
function vue(m, seq, q) {
  q = q || {};
  const v = { seq, uid: m.uid };
  if (q.envelope) v.envelope = { messageId: m.messageId, from: [{ address: m.from, name: m.fromNom || '' }], to: personnes(m.to), cc: personnes(m.cc),
    subject: m.subject, date: new Date(m.ts || Date.now()) };
  if (q.flags) v.flags = new Set(m.flags || []);
  if (q.bodyStructure) v.bodyStructure = structure(m);
  if (q.size || q.source) { const s = source(m); if (q.size) v.size = s.length; if (q.source) v.source = (q.source.maxLength && s.length > q.source.maxLength) ? s.subarray(0, q.source.maxLength) : s; }
  return v;
}

/* ── la recherche ── */
function texteDe(m) { return [m.subject, m.from, m.fromNom, personnes(m.to).map(p => p.address + ' ' + p.name).join(' '), m.text, m.html].join('\n').toLowerCase(); }
function correspond(m, q) {
  if (!q || typeof q !== 'object') return true;
  for (const k of Object.keys(q)) {
    const w = q[k];
    if (k === 'all') continue;
    if (k === 'seen') { if (aLe(m, '\\Seen') !== !!w) return false; }
    else if (k === 'flagged') { if (aLe(m, '\\Flagged') !== !!w) return false; }
    else if (k === 'answered') { if (aLe(m, '\\Answered') !== !!w) return false; }
    else if (k === 'draft') { if (aLe(m, '\\Draft') !== !!w) return false; }
    else if (k === 'deleted') { if (aLe(m, '\\Deleted') !== !!w) return false; }
    else if (k === 'subject') { if (!String(m.subject || '').toLowerCase().includes(String(w).toLowerCase())) return false; }
    else if (k === 'from') { if (!(String(m.from || '') + ' ' + String(m.fromNom || '')).toLowerCase().includes(String(w).toLowerCase())) return false; }
    else if (k === 'to') { if (!personnes(m.to).map(p => p.address + ' ' + p.name).join(' ').toLowerCase().includes(String(w).toLowerCase())) return false; }
    else if (k === 'body' || k === 'text') { if (!(k === 'text' ? texteDe(m) : String(m.text || '').toLowerCase() + '\n' + String(m.html || '').toLowerCase()).includes(String(w).toLowerCase())) return false; }
    else if (k === 'uid') { if (!ensemble(String(w), m.uid)) return false; }
    else if (k === 'or') { if (!(Array.isArray(w) ? w : []).some(sub => correspond(m, sub))) return false; }
    else if (k === 'not') { if (correspond(m, w)) return false; }
    else throw new Error('faux-imap : critère de recherche inconnu « ' + k + ' » — le banc ne le joue pas');
  }
  return true;
}
/* « 3 », « 3,5 », « 4:9 », « 7:* » */
function ensemble(txt, n, max) {
  return String(txt).split(',').some(t => {
    const x = t.trim().split(':');
    const a = x[0] === '*' ? (max || Infinity) : Number(x[0]);
    const b = x.length === 1 ? a : (x[1] === '*' ? Infinity : Number(x[1]));
    return n >= Math.min(a, b) && n <= Math.max(a, b);
  });
}
/* Les messages visés : [{ m, seq }] — le numéro d'ordre (`seq`) se déduit de la place dans le dossier, il ne se range pas. */
function choisir(p, dossier, plage, parUid) {
  const l = dans(p, dossier).map((m, i) => ({ m, seq: i + 1 }));
  if (plage && typeof plage === 'object') {
    if (plage.uid != null) return l.filter(x => ensemble(String(plage.uid), x.m.uid));
    if (plage.seq != null) return l.filter(x => ensemble(String(plage.seq), x.seq));
    return l.filter(x => correspond(x.m, plage));
  }
  const max = l.length ? (parUid ? l[l.length - 1].m.uid : l.length) : 0;
  return l.filter(x => ensemble(String(plage), parUid ? x.m.uid : x.seq, max));
}

class ImapFlow {
  constructor(o) { this.o = o || {}; this.chemin = null; this.verrou = false; this.mailbox = false; this.user = String((this.o.auth && this.o.auth.user) || '').toLowerCase(); }
  on() {}
  async connect() {
    const e = lireEtat();
    const panne = e.pannes && e.pannes[this.user];
    if (panne) throw Object.assign(new Error(String(panne)), { authenticationFailed: true });
  }
  async logout() {}
  close() {}
  _p() { return partie(lireEtat(), this.user); }
  _exiger() { if (!this.verrou) throw new Error('faux-imap : aucune boîte ouverte — il faut `getMailboxLock` avant ce geste'); }
  async getMailboxLock(chemin) {
    const p = this._p(); const c = chemin || 'INBOX';
    if (!existe(p, c)) throw Object.assign(new Error('Mailbox does not exist : ' + c), { mailboxMissing: true });
    this.chemin = c; this.verrou = true;
    const l = dans(p, c);
    this.mailbox = { path: c, exists: l.length, uidValidity: 1, uidNext: (l.length ? l[l.length - 1].uid : 0) + 1 };
    return { release: () => { this.verrou = false; } };
  }
  async list() {
    return dossiersDe(this._p()).map(d => ({ path: d.chemin, name: d.chemin.split('/').pop(), specialUse: d.specialUse, flags: new Set(d.noselect ? ['\\Noselect'] : []) }));
  }
  async status(chemin, q) {
    const etat = lireEtat(); const p = partie(etat, this.user);
    if (!existe(p, chemin)) throw Object.assign(new Error('Mailbox does not exist : ' + chemin), { mailboxMissing: true });
    p.statuts = p.statuts || {}; p.statuts[chemin] = (p.statuts[chemin] || 0) + 1;
    ecrireEtat(etat);
    const l = dans(p, chemin); const r = { path: chemin };
    if (!q || q.messages) r.messages = l.length;
    if (!q || q.unseen) r.unseen = l.filter(m => !aLe(m, '\\Seen')).length;
    if (!q || q.uidNext) r.uidNext = (l.length ? l[l.length - 1].uid : 0) + 1;
    if (!q || q.uidValidity) r.uidValidity = 1;
    return r;
  }
  async search(q, o) {
    this._exiger();
    const l = choisir(this._p(), this.chemin, (q && typeof q === 'object') ? q : {}, true);
    return l.map(x => (o && o.uid) ? x.m.uid : x.seq);
  }
  async *fetch(plage, q, o) {
    this._exiger();
    for (const x of choisir(this._p(), this.chemin, plage, !!(o && o.uid))) yield vue(x.m, x.seq, q);
  }
  async fetchOne(id, q, o) {
    this._exiger();
    const l = choisir(this._p(), this.chemin, String(id), !!(o && o.uid));
    return l.length ? vue(l[0].m, l[0].seq, q) : false;
  }
  _agir(plage, o, fn, action) {
    this._exiger();
    const etat = lireEtat(); const p = partie(etat, this.user);
    p.actions = p.actions || [];
    for (const x of choisir(p, this.chemin, typeof plage === 'number' ? String(plage) : plage, !!(o && o.uid))) { fn(x.m, p); p.actions.push({ action, messageId: x.m.messageId, dossier: this.chemin }); }
    ecrireEtat(etat); return true;
  }
  async messageFlagsAdd(plage, f, o) { return this._agir(plage, o, m => { m.flags = [...new Set([...(m.flags || []), ...f])]; }, 'marque+' + f.join('')); }
  async messageFlagsRemove(plage, f, o) { return this._agir(plage, o, m => { m.flags = (m.flags || []).filter(x => !f.includes(x)); }, 'marque-' + f.join('')); }
  async messageMove(plage, dest, o) {
    this._exiger();
    if (!existe(this._p(), dest)) throw Object.assign(new Error('Mailbox does not exist : ' + dest), { mailboxMissing: true });
    return this._agir(plage, o, (m, p) => {
      const arrivee = dans(p, dest);
      m.uid = (arrivee.length ? arrivee[arrivee.length - 1].uid : 0) + 1;   // un nouvel identifiant dans le dossier d'arrivée
      m.dossier = dest;
    }, 'deplace');
  }
  async messageDelete(plage, o) { return this._agir(plage, o, m => { m.dossier = '(supprimé)'; }, 'supprime'); }
  async append(chemin, contenu, flags) {
    const etat = lireEtat(); const p = partie(etat, this.user);
    if (!existe(p, chemin)) throw Object.assign(new Error('Mailbox does not exist : ' + chemin), { mailboxMissing: true });
    const brut = Buffer.isBuffer(contenu) ? contenu : Buffer.from(String(contenu));
    const { simpleParser } = require(require.resolve('mailparser', { paths: [RACINE_MODULES() || process.cwd()] }));
    const a = await simpleParser(brut);
    const arrivee = dans(p, chemin);
    const m = { dossier: chemin, uid: (arrivee.length ? arrivee[arrivee.length - 1].uid : 0) + 1,
      messageId: String(a.messageId || '<append-' + crypto.randomBytes(6).toString('hex') + '@faux-imap>'),
      from: String(((a.from && a.from.value[0]) || {}).address || ''), fromNom: String(((a.from && a.from.value[0]) || {}).name || ''),
      to: ((a.to && a.to.value) || []).map(x => ({ address: x.address, name: x.name })),
      cc: ((a.cc && a.cc.value) || []).map(x => ({ address: x.address, name: x.name })),
      subject: String(a.subject || ''), text: String(a.text || ''), html: typeof a.html === 'string' ? a.html : '',
      pieces: (a.attachments || []).map(x => ({ nom: String(x.filename || ''), type: String(x.contentType || ''), taille: x.size || 0,
        sha: crypto.createHash('sha256').update(x.content).digest('hex') })),
      ts: a.date ? a.date.getTime() : Date.now(), flags: Array.from(flags || []) };
    if (brut.length < 200000) m.raw = brut.toString('base64');   // une grosse source ne se range pas : l'état se relit à chaque geste
    p.messages.push(m);
    p.ajouts = p.ajouts || [];
    p.ajouts.push({ dossier: chemin, flags: m.flags, messageId: m.messageId, pieces: m.pieces.map(x => ({ nom: x.nom, taille: x.taille, sha: x.sha })), taille: brut.length });
    ecrireEtat(etat);
    return { destination: chemin, uid: m.uid, uidValidity: 1 };
  }
}

/* `installer(racine)` : le module que `require('imapflow')` rendra désormais, depuis `racine` (le dossier `server/`). Appelé tout seul
   au chargement par `node -r` (le vrai serveur, dans un autre processus) ; appelé À LA MAIN par un banc qui monte un module DANS son
   propre processus (`test-1012`, le crochet d'OP MESSAGES). */
function installer(racine) {
  const Module = require('module');
  const cible = require.resolve('imapflow', { paths: [racine] });
  const m = new Module(cible); m.filename = cible; m.loaded = true; m.exports = module.exports;
  require.cache[cible] = m;
}

module.exports = { ImapFlow, DOSSIERS, lireEtat, ecrireEtat, partie, installer };

/* Chargé par `node -r tests/faux-imap.js` : le vrai serveur reçoit CE module quand il demande `imapflow`.
   Chargé par un banc qui veut seulement les outils d'état (`FAUX_IMAP_RACINE` absent) : rien n'est installé. */
if (RACINE_MODULES()) installer(RACINE_MODULES());
