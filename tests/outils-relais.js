/* ⛔ LE FAUX RELAIS SMTP DES BANCS, ET LA LECTURE D'UN COURRIEL COMME LE FERAIT UN CLIENT DE MESSAGERIE — extraits de `test-975` pour que la sonde navigateur des réunions
   (`sonde-opmessages-reunions.js`) joue le MÊME relais : deux copies d'un faux relais divergent toujours, et un faux relais qui diverge accuse le service d'un défaut qu'il n'a pas.
   Ce fichier n'est PAS une suite (il ne s'appelle pas `test-*.js` : le compteur ne le lance pas). Aucun secret n'y est écrit : les identifiants sont ceux que le banc passe en option. */
'use strict';
const fs = require('fs'), net = require('net'), tls = require('tls');
const TEXTE_RELAIS = 'RELAIS-WQXZ-TEXTE';   // des lettres hors [0-9a-f] : jamais le hasard d'une empreinte

/* ═══ LE FAUX RELAIS SMTP ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════
   Un relais minimal mais honnête : EHLO, STARTTLS (si on le lui demande), AUTH PLAIN et LOGIN, MAIL, RCPT, DATA, QUIT. ⛔ Il DÉFAIT LE POINT DOUBLÉ (RFC 5321 § 4.5.2) : une ligne du courriel qui
   commence par « . » voyage « .. », et le quoted-printable replie les lignes — n'importe quel mot peut se retrouver en tête de ligne. Un relais qui ne le défait pas accuse le service d'un défaut
   qu'il n'a pas (pris le 27 septembre 2026 sur `test-832`). Il note ce qu'il a reçu, jamais un identifiant (seulement s'il était juste). */
function fauxRelais(opts) {
  const o = Object.assign({ auth: null, tls: 'aucun', cert: null, exigerTls: false }, opts || {});
  const etat = { rcpt: 'ok', data: 'ok', silence: false, gel: false, retenir: false, connexions: 0, messages: [], auths: [], commandes: [], retenus: [] };
  const sockets = new Set();
  const materiel = o.cert ? { key: fs.readFileSync(o.cert.cle), cert: fs.readFileSync(o.cert.crt) } : null;   // (un `secureContext` passé à `createServer` donne « no suitable signature algorithm » avec ce Node : la clé et le certificat, tels quels)
  function gerer(brut, chiffre) {
    etat.connexions++;
    sockets.add(brut); brut.on('close', () => sockets.delete(brut));
    brut.on('error', () => { /* un client qui coupe n'est pas une erreur du relais */ });
    const s = { sock: brut, chiffre, tampon: '', mode: 'cmd', enveloppe: { de: null, a: [] }, authentifie: !o.auth, attente: null };
    const dire = (l) => { if (!s.sock.destroyed) s.sock.write(l + '\r\n'); };
    function attacher(sock) {
      sock.on('data', (d) => { s.tampon += d.toString('latin1'); traiter(); });
      sock.on('error', () => { /* idem */ });
    }
    function traiter() {
      for (;;) {
        if (s.mode === 'data') {
          const i = s.tampon.indexOf('\r\n.\r\n');
          if (i < 0) return;
          const brutData = s.tampon.slice(0, i); s.tampon = s.tampon.slice(i + 5); s.mode = 'cmd';
          finData(brutData.split('\r\n').map(l => l.startsWith('.') ? l.slice(1) : l).join('\r\n'));   // le point doublé, défait
          continue;
        }
        const j = s.tampon.indexOf('\r\n'); if (j < 0) return;
        const ligne = s.tampon.slice(0, j); s.tampon = s.tampon.slice(j + 2);
        commande(ligne);
      }
    }
    function finData(texte) {
      if (etat.data === 'refus') return dire('554 5.7.1 ' + TEXTE_RELAIS + ' message refusé');
      const accepter = () => { etat.messages.push({ de: s.enveloppe.de, a: s.enveloppe.a.slice(), brut: Buffer.from(texte, 'latin1'), tls: s.chiffre }); dire('250 2.0.0 OK mis en file'); };
      if (etat.retenir) { etat.retenus.push(accepter); return; }
      accepter();
    }
    function commande(l) {
      if (s.attente) { const f = s.attente; s.attente = null; return f(l); }   // la suite d'une authentification en deux temps arrive comme une « commande » : elle va d'abord à l'attente
      const u = l.toUpperCase();
      if (etat.gel && !/^(EHLO|HELO)/.test(u)) return;   // un relais qui GÈLE en pleine conversation : il a répondu à EHLO, il ne dit plus rien
      etat.commandes.push(u.startsWith('AUTH') ? 'AUTH' : u.split(' ')[0]);
      if (u.startsWith('EHLO') || u.startsWith('HELO')) {
        dire('250-relais.invalid');
        if (o.tls === 'starttls' && !s.chiffre) dire('250-STARTTLS');
        if ((o.auth && (!o.exigerTls || s.chiffre)) || o.annoncerAuth) dire('250-AUTH PLAIN LOGIN');   // `annoncerAuth` : un relais qui OFFRE l'authentification sans l'exiger (un relais local)
        dire('250 SIZE 10485760'); return;
      }
      if (u === 'STARTTLS') {
        if (o.tls !== 'starttls' || s.chiffre) return dire('502 5.5.1 pas de STARTTLS');
        dire('220 2.0.0 prêt pour TLS');
        const ancien = s.sock; ancien.removeAllListeners('data');
        const chiffreSock = new tls.TLSSocket(ancien, Object.assign({ isServer: true }, materiel));
        sockets.add(chiffreSock); chiffreSock.on('close', () => sockets.delete(chiffreSock));
        s.sock = chiffreSock; s.chiffre = true; s.tampon = ''; s.enveloppe = { de: null, a: [] }; s.authentifie = !o.auth;
        attacher(chiffreSock); return;
      }
      if (u.startsWith('AUTH')) {
        if (!o.auth) return dire('503 5.5.1 pas d\'authentification ici');
        if (o.exigerTls && !s.chiffre) return dire('530 5.7.0 STARTTLS d\'abord');
        const verifier = (utilisateur, mdp) => {
          const bon = utilisateur === o.auth.utilisateur && mdp === o.auth.mdp;
          etat.auths.push(bon); s.authentifie = bon;
          dire(bon ? '235 2.7.0 authentifié' : '535 5.7.8 ' + TEXTE_RELAIS + ' identifiant refusé');
        };
        const arg = l.split(/\s+/);
        if (arg[1] && arg[1].toUpperCase() === 'PLAIN') {
          if (arg[2]) { const p = Buffer.from(arg[2], 'base64').toString('utf8').split('\u0000'); return verifier(p[1], p[2]); }
          dire('334 '); s.attente = (rep) => { const p = Buffer.from(rep, 'base64').toString('utf8').split('\u0000'); verifier(p[1], p[2]); }; return;
        }
        if (arg[1] && arg[1].toUpperCase() === 'LOGIN') {
          dire('334 ' + Buffer.from('Username:').toString('base64'));
          s.attente = (rep) => { const utilisateur = Buffer.from(rep, 'base64').toString('utf8'); dire('334 ' + Buffer.from('Password:').toString('base64')); s.attente = (rep2) => verifier(utilisateur, Buffer.from(rep2, 'base64').toString('utf8')); };
          return;
        }
        return dire('504 5.5.4 mécanisme inconnu');
      }
      if (u.startsWith('MAIL FROM')) {
        if (!s.authentifie) return dire('530 5.7.0 authentification requise');
        s.enveloppe = { de: (/<([^>]*)>/.exec(l) || [])[1] || null, a: [] }; return dire('250 2.1.0 OK');
      }
      if (u.startsWith('RCPT TO')) {
        if (etat.rcpt === 'refus') return dire('550 5.1.1 ' + TEXTE_RELAIS + ' boîte inconnue');
        s.enveloppe.a.push((/<([^>]*)>/.exec(l) || [])[1] || null); return dire('250 2.1.5 OK');
      }
      if (u === 'DATA') { s.mode = 'data'; return dire('354 fin par <CRLF>.<CRLF>'); }
      if (u === 'RSET' || u === 'NOOP') return dire('250 2.0.0 OK');
      if (u === 'QUIT') { dire('221 2.0.0 au revoir'); try { s.sock.end(); } catch (e) { /* déjà fermé */ } return; }
      dire('502 5.5.2 commande inconnue');
    }
    attacher(brut);
    if (!etat.silence) dire('220 relais.invalid ESMTP prêt');
  }
  const serveur = o.tls === 'implicite'
    ? tls.createServer(materiel, (sock) => gerer(sock, true))
    : net.createServer((sock) => gerer(sock, false));
  serveur.on('tlsClientError', () => { /* un client qui refuse notre certificat : c'est le cas qu'on veut voir */ });
  return new Promise((resolve) => serveur.listen(0, '127.0.0.1', () => resolve({
    port: serveur.address().port, etat, messages: etat.messages, o,
    relacher() { const l = etat.retenus.splice(0); for (const f of l) f(); etat.retenir = false; return l.length; },
    async fermer() { for (const s of sockets) { try { s.destroy(); } catch (e) { /* déjà fermé */ } } await new Promise(r => serveur.close(() => r())); },
  })));
}

/* ═══ LA LECTURE D'UN COURRIEL, comme le ferait un client de messagerie ═════════════════════════════════════════════════════════════════════════ */
const coupe = (t) => { const i = t.indexOf('\r\n\r\n'); return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 4)]; };
function entetesDe(brut) {
  const h = {};
  for (const l of brut.replace(/\r\n[ \t]+/g, ' ').split('\r\n')) { const k = l.indexOf(':'); if (k < 1) continue; const nom = l.slice(0, k).toLowerCase(); (h[nom] = h[nom] || []).push(l.slice(k + 1).trim()); }
  return h;
}
/* RFC 2047 : « =?UTF-8?B?…?= » et « =?UTF-8?Q?…?= », les mots voisins se recollent sans l'espace qui les sépare */
function decoderMots(s) {
  return s.replace(/\?=\s+=\?/g, '?==?').replace(/=\?([^?]+)\?([BbQq])\?([^?]*)\?=/g, (_, cs, enc, txt) => {
    const octets = /^b$/i.test(enc) ? Buffer.from(txt, 'base64') : Buffer.from(txt.replace(/_/g, ' ').replace(/=([0-9A-Fa-f]{2})/g, (m, hex) => String.fromCharCode(parseInt(hex, 16))), 'latin1');
    return octets.toString('utf8');
  });
}
function octetsDe(corps, cte) {
  const c = (cte || '7bit').toLowerCase();
  if (c === 'base64') return Buffer.from(corps.replace(/\s+/g, ''), 'base64');
  if (c === 'quoted-printable') {
    const s = corps.replace(/=\r\n/g, ''), sortie = [];
    for (let i = 0; i < s.length; i++) {
      if (s[i] === '=' && /^[0-9A-Fa-f]{2}$/.test(s.slice(i + 1, i + 3))) { sortie.push(parseInt(s.slice(i + 1, i + 3), 16)); i += 2; } else sortie.push(s.charCodeAt(i) & 0xff);
    }
    return Buffer.from(sortie);
  }
  return Buffer.from(corps, 'latin1');
}
function feuilles(texte) {
  const [e, c] = coupe(texte), h = entetesDe(e), ct = (h['content-type'] || ['text/plain'])[0];
  const m = /^multipart\/[a-z]+\s*;.*?boundary="?([^";]+)"?/i.exec(ct);
  if (!m) return [{ h, type: ct.split(';')[0].trim().toLowerCase(), octets: octetsDe(c, (h['content-transfer-encoding'] || [])[0]) }];
  const sortie = [];
  for (const mo of ('\r\n' + c).split('\r\n--' + m[1]).slice(1)) { if (mo.startsWith('--')) break; sortie.push(...feuilles(mo.replace(/^\r\n/, ''))); }
  return sortie;
}
function lireMessage(m) {
  const texte = m.brut.toString('latin1'), [e] = coupe(texte), h = entetesDe(e), parts = feuilles(texte);
  const de = /^"?([^"<]*?)"?\s*<([^>]+)>$/.exec(decoderMots((h['from'] || [''])[0]));
  const txt = parts.find(p => p.type === 'text/plain'), cal = parts.find(p => p.type === 'text/calendar');
  return {
    h, parts, enveloppe: { de: m.de, a: m.a }, tls: m.tls,
    sujet: decoderMots((h['subject'] || [''])[0]), a: (h['to'] || [''])[0].replace(/^<|>$/g, ''), nomDe: de ? de[1] : null, adresseDe: de ? de[2] : null,
    texte: txt ? txt.octets.toString('utf8') : null, ics: cal ? cal.octets.toString('utf8') : null, icsEntetes: cal ? cal.h : null,
  };
}
const sansDtstamp = (t) => String(t).replace(/DTSTAMP:\d{8}T\d{6}Z/g, 'DTSTAMP:X');

module.exports = { fauxRelais, lireMessage, feuilles, sansDtstamp, TEXTE_RELAIS };
