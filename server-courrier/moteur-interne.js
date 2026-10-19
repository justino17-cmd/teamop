/* ══ LE MOTEUR DE SIGNATURE INTERNE — LE NÔTRE, SANS PRESTATAIRE ═══════════════════════════════════════════════════════
 * Justin, 19 octobre 2026 : « on arrête Yousign, on crée le nôtre, de A à Z, sans passer par d'autres services ». Ce module remplace `yousign.js` :
 * il porte les MÊMES fonctions (créer, déposer, signataire, activer, relancer, annuler, télécharger), donc `demandes.js` ne sait pas lequel il
 * emploie. Il ajoute ce qu'un prestataire faisait pour nous : le lien de chaque signataire, la page publique, le code à usage unique, les preuves.
 *
 * ⛔ SIGNATURE ÉLECTRONIQUE SIMPLE. Jamais « avancée » ni « qualifiée » : ni à l'écran, ni dans un mail, ni sur le certificat. Sa valeur tient à ses
 * PREUVES : le journal chaîné (`chaine.js`), l'empreinte SHA-256 de chaque document, le texte de consentement versionné et son empreinte, le code
 * reçu par un canal que la personne seule lit, l'adresse réseau et le navigateur. Le certificat (`certificat.js`) les met en page.
 * ⛔ LE LIEN NE SE RETIENT PAS : seule son empreinte SHA-256 est rangée ; le lien lui-même ne sort qu'UNE fois (la réponse d'« activer » ou de « relancer »,
 * au patron authentifié), et un nouveau lien REMPLACE l'ancien. Le code à usage unique n'est jamais écrit, ni en clair ni au journal : on garde son HMAC.
 * ⛔ Les états de la demande (en attente, ouvert, à contresigner, signé…) restent ceux de `demandes.js` : on lui rend des événements du même nom que
 * ceux du webhook de Yousign (`signer.link_opened`, `signer.signed`, `signature_request.done`…) et c'est LUI qui décide.
 */
'use strict';
const crypto = require('crypto');
const chaine = require('./chaine');
const { certificat } = require('./certificat');
const { Refus } = require('./demandes');

const MIN = 60000;
const CODE_VALIDE_MS = 10 * MIN, ESSAIS_MAX = 5, ENVOIS_MAX = 5, DELAI_RENVOI_MS = 60000;
const VERSION_CONSENTEMENT = '2026-10-19-2';
const consentementTexte = (titre) => 'J\'ai eu la possibilité de consulter le document « ' + titre + ' » ci-dessus et j\'en approuve le contenu. En saisissant le code de vérification que je viens de recevoir, je signe électroniquement ce document. Je comprends qu\'il s\'agit d\'une signature électronique simple et que TeamOP conserve les preuves de ma signature (date et heure, adresse réseau, navigateur).';
const RE_ID = /^[0-9a-f]{24}$/, RE_JETON = /^[A-Za-z0-9_-]{43}$/;
const sha = chaine.sha;
const shaOctets = (b) => crypto.createHash('sha256').update(b).digest('hex');
const masqueMail = (e) => { const i = String(e).indexOf('@'); return i < 1 ? '***' : e.slice(0, 1) + '***' + e.slice(i); };
const masqueTel = (t) => { const s = String(t); return s.length < 6 ? '***' : s.slice(0, 3) + ' ' + '*'.repeat(Math.max(3, s.length - 5)) + s.slice(-2); };
const net = (s, max) => String(s == null ? '' : s).replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);

class ErreurMoteur extends Error { constructor(etape, statut) { super('moteur:' + etape + ':' + statut); this.etape = etape; this.statut = statut; this.champ = ''; this.raison = ''; } }

function creerMoteurInterne({ stockage, horloge = Date.now, canaux = {}, journal = () => {} }) {
  let demandes = null;
  const nouveaux = new Map();   // « id:n » → lien en clair, le temps d'« activer » ou de « relancer » seulement
  const charger = (id) => { const b = RE_ID.test(String(id)) ? stockage.pieceLire(id, 'ev') : null; return b ? JSON.parse(b.toString('utf8')) : null; };
  const garder = (ev) => stockage.pieceEcrire(ev.id, 'ev', Buffer.from(JSON.stringify(ev)));
  const note = (ev, evt, champs) => chaine.ajouter(ev.journal, horloge(), evt, champs);
  const numero = (sid) => { const n = Number(String(sid).slice(1)); return Number.isInteger(n) && n >= 1 ? n : 0; };
  const canalDe = (niveau) => niveau === 'avance' ? 'sms' : 'email';
  const jetonNeuf = () => crypto.randomBytes(32).toString('base64url');
  const hmacCode = (ev, n, code) => crypto.createHmac('sha256', ev.secret).update(n + ':' + code).digest('hex');

  /* ───────── La partie « client de prestataire » : les mêmes fonctions que yousign.js ───────── */
  const api = {
    lier(d) { demandes = d; },
    canalDisponible: (niveau) => typeof canaux[canalDe(niveau)] === 'function',
    async tester() { return true; },
    async creerDemande({ nom, jours, relances, ordonne, idInterne, expediteur }) {
      const id = RE_ID.test(String(idInterne || '')) ? idInterne : crypto.randomBytes(12).toString('hex');
      stockage.jetonsEffacer(id);
      const ev = { v: 1, id, titre: net(nom, 200), expediteur: net(expediteur, 100), jours, relances: !!relances, ordonne: !!ordonne, cree: horloge(), secret: crypto.randomBytes(32).toString('hex'), docs: [], signataires: [], journal: [], termine: null };
      note(ev, 'creee', {}); garder(ev);
      return { id };
    },
    async ajouterDocument(id, { nom, pdf }) {
      const ev = charger(id); if (!ev) throw new ErreurMoteur('document', 404);
      const n = ev.docs.length + 1, h = shaOctets(pdf);
      ev.docs.push({ n, nom: net(nom, 120), taille: pdf.length, sha256: h });
      note(ev, 'document_ajoute', { n, sha256: h }); garder(ev);
      return { id: 'd' + n, pages: 1 };
    },
    async ajouterSignataire(id, { prenom, nom, nomComplet, email, telephone, niveau }) {
      const ev = charger(id); if (!ev) throw new ErreurMoteur('signataire', 404);
      const canal = canalDe(niveau), n = ev.signataires.length + 1, jeton = jetonNeuf(), h = sha(jeton);
      ev.signataires.push({ n, nom: net(nomComplet || (prenom + ' ' + nom), 100), email: net(email, 254), tel: net(telephone, 20), canal, jetonH: h, vu: false, docsVus: [], otp: null, envois: 0, signe: null });
      stockage.jetonPoser(h, id, n); nouveaux.set(id + ':' + n, jeton);
      note(ev, 'signataire_ajoute', { n, canal }); garder(ev);
      return { id: 's' + n };
    },
    async activer(id) {
      const ev = charger(id); if (!ev) throw new ErreurMoteur('activer', 404);
      note(ev, 'activee', { signataires: ev.signataires.length }); garder(ev);
      const liens = ev.signataires.map((s) => ({ n: s.n, jeton: nouveaux.get(id + ':' + s.n) })).filter((l) => l.jeton);
      ev.signataires.forEach((s) => nouveaux.delete(id + ':' + s.n));
      return { liens };
    },
    /* « Relancer » = un NOUVEAU lien (l'ancien meurt) que le patron renvoie par la boîte du pro. */
    async relancer(id, sid) {
      const ev = charger(id), n = numero(sid), s = ev && ev.signataires.find((x) => x.n === n);
      if (!s) throw new ErreurMoteur('relancer', 404);
      stockage.jetonEffacer(id, n);
      const jeton = jetonNeuf(); s.jetonH = sha(jeton); stockage.jetonPoser(s.jetonH, id, n);
      note(ev, 'lien_renvoye', { n }); garder(ev);
      return { n, jeton };
    },
    async annuler(id) {
      const ev = charger(id); if (ev) { note(ev, 'annulee', {}); garder(ev); }
      stockage.jetonsEffacer(id); return {};
    },
    async supprimerBrouillon(id) { if (RE_ID.test(String(id))) { stockage.jetonsEffacer(id); stockage.piecesEffacer(id, 'ev'); } },
    /* Le « document signé » : le PDF d'origine, JAMAIS modifié (son empreinte est dans le certificat). */
    async telechargerSigne(id, docId) {
      const b = stockage.pieceLire(id, 'src' + numero(docId));
      if (!b) throw new ErreurMoteur('signe', 404);
      return b;
    },
    async telechargerPreuve(id, sid) {
      const ev = charger(id), n = numero(sid);
      if (!ev || !ev.signataires.some((s) => s.n === n)) throw new ErreurMoteur('preuve', 404);
      return certificatDe(ev, n);
    },
  };

  function certificatDe(ev, focus) {
    return certificat({
      id: ev.id, titre: ev.titre, expediteur: ev.expediteur, cree: ev.cree, termine: ev.termine,
      documents: ev.docs, consentement: { version: VERSION_CONSENTEMENT, texte: consentementTexte(ev.titre) },
      signataires: ev.signataires.map((s) => ({ n: s.n, nom: s.nom, email: s.email, canal: s.canal, destination: s.canal === 'sms' ? masqueTel(s.tel) : masqueMail(s.email), signe: s.signe })),
      journal: ev.journal, chaine: chaine.verifier(ev.journal), focus,
    });
  }

  /* ───────── La partie « page publique du signataire » ───────── */
  function resoudre(jeton) {
    if (typeof jeton !== 'string' || !RE_JETON.test(jeton)) return null;
    const h = sha(jeton), r = stockage.jetonLire(h);
    if (!r) return null;
    const ev = charger(r.id), s = ev && ev.signataires.find((x) => x.n === r.n);
    if (!s || s.jetonH !== h) return null;
    let rec; try { rec = stockage.lire(r.id); } catch (e) { rec = null; }
    return rec ? { ev, s, rec } : null;
  }
  const TERMINAUX = new Set(['signe', 'refuse', 'annule', 'expire']);
  function etatPour({ ev, s, rec }) {
    if (rec.etat === 'annule') return 'annulee';
    if (rec.etat === 'refuse') return 'refusee';
    if (rec.etat === 'expire' || (rec.echeance && horloge() > rec.echeance && !TERMINAUX.has(rec.etat) && !s.signe)) return 'expiree';
    if (s.signe) return 'signe';
    if (rec.etat === 'signe') return 'terminee';
    if (rec.etat === 'brouillon' || rec.etat === 'activation') return 'indisponible';
    const autres = ev.signataires.filter((x) => !rec.signataires.find((r) => r.n === x.n && r.contre));
    const contre = rec.signataires.find((r) => r.n === s.n && r.contre);
    if (contre && !autres.every((x) => x.signe)) return 'attente_autres';
    return 'a_signer';
  }
  const evenement = (ev, nom, n) => demandes.appliquerEvenement({ event_name: nom, data: { signature_request: { id: ev.id }, signer: n ? { id: 's' + n } : undefined } });
  const contexte = (ctx) => ({ ip: net(ctx && ctx.ip, 64), ua: net(ctx && ctx.ua, 200) });

  async function consulter(jeton) {
    const r = resoudre(jeton); if (!r) return null;
    const etat = etatPour(r), { ev, s } = r;
    if ((etat === 'a_signer' || etat === 'attente_autres') && !s.vu) {
      s.vu = true; note(ev, 'ouvert', { n: s.n }); garder(ev);
      try { await evenement(ev, 'signer.link_opened', s.n); } catch (e) { journal('evenement_echec', { id: ev.id, nom: 'link_opened' }); }
    }
    const montre = etat === 'a_signer' || etat === 'attente_autres' || etat === 'signe';
    return {
      etat, titre: ev.titre, expediteur: ev.expediteur,
      signataire: { nom: s.nom, canal: s.canal, destination: s.canal === 'sms' ? masqueTel(s.tel) : masqueMail(s.email) },
      echeance: r.rec.echeance || 0,
      documents: montre ? ev.docs.map((d) => ({ n: d.n, nom: d.nom, taille: d.taille })) : [],
      consentement: { version: VERSION_CONSENTEMENT, texte: consentementTexte(ev.titre) },
      codeEnvoye: !!(s.otp && s.otp.exp > horloge()), envoisRestants: Math.max(0, ENVOIS_MAX - s.envois),
    };
  }

  function document(jeton, n) {
    const r = resoudre(jeton); if (!r) return null;
    const etat = etatPour(r), { ev, s } = r, d = ev.docs.find((x) => x.n === Number(n));
    if (!d || !(etat === 'a_signer' || etat === 'attente_autres' || etat === 'signe')) return null;
    const b = stockage.pieceLire(ev.id, 'src' + d.n) || stockage.pieceLire(ev.id, 'sig' + d.n);
    if (!b) return null;
    if (!s.docsVus.includes(d.n)) { s.docsVus.push(d.n); note(ev, 'document_consulte', { n: s.n, doc: d.n }); garder(ev); }
    return { nom: d.nom, pdf: b };
  }

  async function envoyerCode(jeton, ctx) {
    const r = resoudre(jeton); if (!r) throw new Refus(404, 'introuvable');
    const etat = etatPour(r); if (etat !== 'a_signer') throw new Refus(409, 'pas_possible', { etat });
    const { ev, s } = r, envoyer = canaux[s.canal];
    if (typeof envoyer !== 'function') throw new Refus(503, 'canal_indisponible');
    const now = horloge();
    if (s.envois >= ENVOIS_MAX) throw new Refus(429, 'trop_de_codes');
    if (s.otp && now - s.otp.dernier < DELAI_RENVOI_MS) throw new Refus(429, 'trop_tot', { attenteS: Math.ceil((DELAI_RENVOI_MS - (now - s.otp.dernier)) / 1000) });
    const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
    s.otp = { h: hmacCode(ev, s.n, code), exp: now + CODE_VALIDE_MS, essais: 0, dernier: now }; s.envois++;
    const vers = s.canal === 'sms' ? masqueTel(s.tel) : masqueMail(s.email);
    note(ev, 'code_envoye', { n: s.n, canal: s.canal, vers }); garder(ev);
    try { await envoyer({ destination: s.canal === 'sms' ? s.tel : s.email, code, titre: ev.titre, expediteur: ev.expediteur, nom: s.nom }); }
    catch (e) {
      const ev2 = charger(ev.id), s2 = ev2 && ev2.signataires.find((x) => x.n === s.n);
      if (s2) { s2.otp = null; note(ev2, 'code_non_parti', { n: s.n, canal: s.canal }); garder(ev2); }
      journal('code_echec', { id: ev.id, raison: s.canal });
      throw new Refus(502, 'envoi_code_impossible');
    }
    return { envoye: true, destination: vers, renvoiS: DELAI_RENVOI_MS / 1000, restants: ENVOIS_MAX - s.envois };
  }

  async function signer(jeton, b, ctx) {
    const r = resoudre(jeton); if (!r) throw new Refus(404, 'introuvable');
    const etat = etatPour(r); if (etat !== 'a_signer') throw new Refus(409, 'pas_possible', { etat });
    const { ev, s } = r; b = b || {};
    if (b.consentement !== true) throw new Refus(400, 'consentement_requis');
    if (b.version !== VERSION_CONSENTEMENT) throw new Refus(400, 'consentement_obsolete');
    const now = horloge();
    if (!s.otp) throw new Refus(400, 'code_requis');
    if (now > s.otp.exp) { s.otp = null; garder(ev); throw new Refus(400, 'code_expire'); }
    if (s.otp.essais >= ESSAIS_MAX) throw new Refus(429, 'code_bloque');
    const code = String(b.code == null ? '' : b.code).trim();
    const attendu = Buffer.from(s.otp.h, 'hex'), recu = Buffer.from(/^\d{6}$/.test(code) ? hmacCode(ev, s.n, code) : '0'.repeat(64), 'hex');
    if (!/^\d{6}$/.test(code) || attendu.length !== recu.length || !crypto.timingSafeEqual(attendu, recu)) {
      s.otp.essais++; note(ev, 'code_refuse', { n: s.n, essais: s.otp.essais }); garder(ev);
      if (s.otp.essais >= ESSAIS_MAX) throw new Refus(429, 'code_bloque');
      throw new Refus(400, 'code_incorrect', { restants: ESSAIS_MAX - s.otp.essais });
    }
    const c = contexte(ctx);
    s.signe = { t: now, ip: c.ip, ua: c.ua, consent: { version: VERSION_CONSENTEMENT, h: sha(consentementTexte(ev.titre)) } }; s.otp = null;
    note(ev, 'signe', { n: s.n });
    const tous = ev.signataires.every((x) => x.signe);
    if (tous) {
      const derniere = ev.journal[ev.journal.length - 1].h;
      ev.termine = { t: now, sceau: sha(derniere + '|' + ev.docs.map((d) => d.sha256).join(',')) };
      note(ev, 'terminee', { sceau: ev.termine.sceau });
    }
    garder(ev);
    try { await evenement(ev, 'signer.signed', s.n); if (tous) await evenement(ev, 'signature_request.done'); }
    catch (e) { journal('evenement_echec', { id: ev.id, nom: 'signed' }); }   // la signature est écrite : le balayage rattrape l'état
    return { signe: true, termine: tous };
  }

  return Object.assign(api, { consulter, document, envoyerCode, signer, certificatDe, resoudre, etatPour, VERSION_CONSENTEMENT, consentementTexte, ErreurMoteur });
}
module.exports = { creerMoteurInterne, VERSION_CONSENTEMENT, consentementTexte, masqueMail, masqueTel };
