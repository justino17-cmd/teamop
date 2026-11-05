/* ══ test-3275 — LES BOÎTES MAIL D'OP MESSAGES : CE QUE LA RELECTURE ADVERSE A TROUVÉ (gardien, 6 novembre 2026) — LE MODULE DANS CE PROCESSUS, avec un FAUX `imapflow` et un FAUX `nodemailer` ═════════════════════
   Les gestionnaires sont appelés avec de fausses requêtes (le garde de session est joué par les bancs 3270 et 905) ; `imapflow` et `nodemailer` sont REMPLACÉS dans le cache de `require` : le banc voit les options
   que le module leur passe, et peut faire traîner une commande, mentir sur `exists`, ou casser le chargement d'une bibliothèque. Rien ne sort de ce processus.
     · B2  la connexion se fait sur l'ADRESSE résolue (jamais sur le nom), le nom reste le nom TLS, TLS 1.2 au moins — pour la réception ET l'envoi ; remplacer l'adresse par le nom fait tomber ce banc ;
     · B1  un nom dont UNE réponse DNS n'est pas publique (::7f00:1, fec0::1, 2002::…, 192.0.2.x) est refusé, aucune connexion n'est tentée ;
     · A2  une échéance globale par commande (un serveur qui goutte ne tient pas l'emplacement), des emplacements PAR RÉSEAU et pour tout le service, un plafond d'octets et de messages sur une liste (un serveur
           qui ment sur `exists`), deux lectures de pièce au plus, un DNS qui traîne coupé au bout de 5 s ;
     · A3  aucun gestionnaire ne rejette sans réponse (un rejet ARRÊTERAIT le processus) : même quand la base jette ;
     · B5  jamais le texte d'une exception dans une réponse : seulement nos codes ; le chargement cassé d'une bibliothèque se dit, rend son emplacement et ne fait rien tomber.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const path = require('path'), Module = require('module'), dns = require('dns');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

/* ── les faux modules, glissés dans le cache de `require` depuis `server-msg/` ── */
const ETAT = { imap: [], smtp: [], mode: {}, brise: false };
class FauxImap {
  constructor(o) { this.o = o; ETAT.imap.push(o); this.mailbox = { exists: ETAT.mode.exists === undefined ? 3 : ETAT.mode.exists }; this.ferme = false; ETAT.dernier = this; }
  on() {}
  async connect() { if (ETAT.mode.connect) await ETAT.mode.connect(this); }
  async logout() {}
  close() { this.ferme = true; if (ETAT.mode.surFermeture) ETAT.mode.surFermeture(this); }
  async getMailboxLock() { return { release() {} }; }
  async *fetch() { if (ETAT.mode.fetch) yield* ETAT.mode.fetch(this); }
  async fetchOne() { if (ETAT.mode.fetchOne) return ETAT.mode.fetchOne(this); return false; }
}
function glisser(nom, exports) {
  const cible = require.resolve(nom, { paths: [T.SERVICE] });
  const m = new Module(cible); m.filename = cible; m.loaded = true; m.exports = exports; require.cache[cible] = m;
}
glisser('imapflow', { get ImapFlow() { if (ETAT.brise) throw new Error('CHARGEMENT-CASSE-QXZ /opt/secret/chemin'); return FauxImap; } });
glisser('nodemailer', { createTransport(o) { ETAT.smtp.push(o); return { async sendMail(m) { ETAT.dernierMail = m; return {}; }, close() {}, verify: async () => true }; } });

const { creerBoitesMail } = require(path.join(T.SERVICE, 'boites-mail.js'));

const HOTE_IMAP = 'imap.exemple-public.test', HOTE_SMTP = 'smtp.exemple-public.test', IP_PUBLIQUE = '93.184.216.34';
let reponduDNS = () => [{ address: IP_PUBLIQUE, family: 4 }];
dns.promises.lookup = async (h) => reponduDNS(h);              // ⛔ le banc ne résout rien sur Internet

const ID = (n) => 'bm_' + String(n).padStart(32, '0');
const BOITE = (o) => Object.assign({ id: ID(1), fournisseur: 'imap', etat: 'ok', adresse: 'alice@exemple-public.test', nom: 'Alice', secret: 'MDP-APP-QXZ-123', imap: { hote: HOTE_IMAP, port: 993 }, smtp: { hote: HOTE_SMTP, port: 465 } }, o || {});
const stockageDe = (over) => Object.assign({
  boiteMailLire: (uid, id) => BOITE({ id }), boitesMailDe: () => [], boiteMailCreer: () => ({ id: ID(9), remplacee: false }), boiteMailEtat: () => true, boiteMailSecretMaj: () => true, boiteMailSupprimer: () => true,
}, over || {});
const quotas = { essai: () => ({ ok: true }) };
const journaux = [];
const monter = (o) => creerBoitesMail({ config: { boitesMail: { ouvert: true }, cookie: { nom: 'opm' }, origines: ['http://127.0.0.1:1'] }, stockage: (o && o.stockage) || stockageDe(), quotas, journaliser: (e, c) => journaux.push([e, c]),
  oauth: null, crochet: (o && o.crochet) || null }).handlers;

/* une fausse réponse : se termine à `json`, `end` ou `send` — et note ce qu'elle a dit */
function appeler(H, id, req, attenteMs) {
  return new Promise((ok) => {
    const res = { code: 200, headers: {}, corps: null, headersSent: false, status(c) { this.code = c; return this; }, set(k, v2) { if (typeof k === 'object') Object.assign(this.headers, k); else this.headers[k] = v2; return this; },
      cookie() { return this; }, clearCookie() { return this; }, json(o) { this.corps = o; this.headersSent = true; ok(this); return this; }, send(t) { this.corps = t; this.headersSent = true; ok(this); return this; }, end() { this.headersSent = true; ok(this); return this; } };
    const r = Object.assign({ moi: { id: 'p_' + '1'.repeat(32) }, params: { id: ID(1), uid: '1', p: '1' }, ip: '203.0.113.7', body: {}, headers: {}, query: {} }, req || {});
    const t = setTimeout(() => { res.corps = res.corps || 'PAS DE REPONSE'; res.code = 'attente'; ok(res); }, attenteMs || 6000);
    const fin2 = res.json; res.json = function (o) { clearTimeout(t); return fin2.call(this, o); };
    try { H[id](r, res, () => {}); } catch (e) { res.corps = 'EXCEPTION SYNCHRONE ' + e.message; ok(res); }
  });
}
const moi = (n) => ({ moi: { id: 'p_' + String(n).padStart(32, '0') }, ip: n > 255 ? '198.51.100.' + (n % 250) : '203.0.113.' + n });
const dort = (ms) => new Promise(r => setTimeout(r, ms));
let rejets = 0; process.on('unhandledRejection', () => { rejets++; });

(async () => {
  console.log('\nB2. La connexion se fait sur l\'ADRESSE résolue — jamais sur le nom');
  {
    ETAT.imap.length = 0; ETAT.smtp.length = 0; ETAT.mode = { fetch: async function* () { /* rien */ } };
    const H = monter();
    const r = await appeler(H, 'boites.messages', {});
    const o = ETAT.imap[0] || {};
    v('réception : la requête a abouti, et ImapFlow a reçu host = L\'ADRESSE résolue, servername = le NOM, TLS 1.2 au moins, chiffrée, port 993',
      [r.code, o.host, o.servername, o.tls && o.tls.servername, o.tls && o.tls.minVersion, o.secure, o.port], [200, IP_PUBLIQUE, HOTE_IMAP, HOTE_IMAP, 'TLSv1.2', true, 993]);
    v('   ses délais sont posés (aucune connexion sans fin)', [o.connectionTimeout > 0, o.greetingTimeout > 0, o.socketTimeout > 0, o.doSTARTTLS], [true, true, true, false]);
    const e465 = await appeler(H, 'boites.envoyer', { body: { a: 'dest@exemple-public.test', objet: 'x', texte: 'y' } });
    const s = ETAT.smtp[0] || {};
    v('envoi (465) : nodemailer a reçu host = L\'ADRESSE résolue, tls.servername = le NOM, TLS 1.2 au moins, connexion chiffrée d\'emblée', [e465.code, s.host, s.tls && s.tls.servername, s.tls && s.tls.minVersion, s.secure, s.requireTLS, s.port], [200, IP_PUBLIQUE, HOTE_SMTP, 'TLSv1.2', true, false, 465]);
    const H587 = monter({ stockage: stockageDe({ boiteMailLire: (uid, id) => BOITE({ id, smtp: { hote: HOTE_SMTP, port: 587 } }) }) });
    await appeler(H587, 'boites.envoyer', { body: { a: 'dest@exemple-public.test', objet: 'x', texte: 'y' } });
    const s2 = ETAT.smtp[1] || {};
    v('envoi (587) : STARTTLS EXIGÉ (jamais un mot de passe en clair), toujours sur l\'adresse résolue', [s2.host, s2.secure, s2.requireTLS, s2.ignoreTLS], [IP_PUBLIQUE, false, true, false]);
    vrai('⛔ le nom du serveur n\'est jamais passé comme `host` (le DNS d\'un attaquant ferait changer la réponse entre la vérification et la connexion)', ![o.host, s.host, s2.host].includes(HOTE_IMAP) && ![o.host, s.host, s2.host].includes(HOTE_SMTP));
  }

  console.log('\nB1. Une seule réponse DNS non publique refuse tout le nom');
  {
    const cas = { 'IPv6 « ::7f00:1 »': [{ address: '::7f00:1', family: 6 }], 'IPv6 « ::127.0.0.1 »': [{ address: '::127.0.0.1', family: 6 }], 'IPv6 locale de site « fec0::1 »': [{ address: 'fec0::1', family: 6 }],
      '6to4 « 2002:7f00:1:: »': [{ address: '2002:7f00:1::', family: 6 }], 'IPv6 dépliée « 0:0:0:0:0:ffff:7f00:1 »': [{ address: '0:0:0:0:0:ffff:7f00:1', family: 6 }], 'documentation 192.0.2.5': [{ address: '192.0.2.5', family: 4 }],
      'documentation 198.51.100.5': [{ address: '198.51.100.5', family: 4 }], 'documentation 203.0.113.5': [{ address: '203.0.113.5', family: 4 }], 'métadonnées 169.254.169.254': [{ address: '169.254.169.254', family: 4 }],
      'une publique MÊLÉE à une privée': [{ address: IP_PUBLIQUE, family: 4 }, { address: '10.0.0.8', family: 4 }] };
    const H = monter(); const sortie = [];
    for (const [nom, rep] of Object.entries(cas)) {
      reponduDNS = () => rep; ETAT.imap.length = 0; ETAT.mode = {};
      const r = await appeler(H, 'boites.messages', {});
      sortie.push([nom, r.code, r.corps && r.corps.error, ETAT.imap.length]);
    }
    reponduDNS = () => [{ address: IP_PUBLIQUE, family: 4 }];
    v('⛔ chacune est refusée (400 serveur_refuse) et AUCUNE connexion n\'est tentée', sortie, Object.keys(cas).map(n => [n, 400, 'serveur_refuse', 0]));
    reponduDNS = () => [{ address: '2606:4700:4700::1111', family: 6 }];
    ETAT.imap.length = 0; ETAT.mode = { fetch: async function* () {} };
    const r6 = await appeler(H, 'boites.messages', {});
    reponduDNS = () => [{ address: IP_PUBLIQUE, family: 4 }];
    v('(contre-épreuve) une IPv6 publique passe, et la connexion se fait sur son écriture NORMALISÉE', [r6.code, ETAT.imap[0] && ETAT.imap[0].host], [200, '2606:4700:4700:0:0:0:0:1111'.replace(/:0:0:0:0:/, ':0:0:0:0:')]);
  }

  console.log('\nA2. Un serveur qui traîne, ou qui ment, ne tient ni la mémoire ni les emplacements');
  {
    /* une échéance globale : la commande n'aboutit jamais, la connexion est fermée de force, l'emplacement RENDU */
    const H = monter({ crochet: { echeanceMs: 300, dnsMs: 200, delaiMs: 3000 } });
    ETAT.mode = { fetch: async function* () { await new Promise(() => {}); } };   // une liste qui ne finit jamais
    const t0 = Date.now(); const r = await appeler(H, 'boites.messages', {}, 5000); const dt = Date.now() - t0;
    v('⛔ une liste qui ne finit jamais : coupée à l\'ÉCHÉANCE (≈ 300 ms ici), 502 serveur_injoignable, connexion fermée de force', [r.code, r.corps && r.corps.error, dt < 2500 && dt >= 250, ETAT.dernier && ETAT.dernier.ferme], [502, 'serveur_injoignable', true, true]);
    const suite = [];
    for (let i = 0; i < 4; i++) suite.push((await appeler(H, 'boites.messages', {}, 5000)).code);
    v('   l\'emplacement est RENDU à chaque fois (quatre échecs de suite, plus que les trois emplacements d\'une personne : aucun n\'a fui)', suite, [502, 502, 502, 502]);
    ETAT.mode = { fetch: async function* () {} };
    v('   et la suite normale répond', (await appeler(H, 'boites.messages', {}, 5000)).code, 200);
    /* un serveur qui ne répond JAMAIS à la connexion : la même échéance */
    ETAT.mode = { connect: () => new Promise(() => {}) };
    const rc = await appeler(H, 'boites.messages', {}, 5000);
    v('   un serveur qui ne finit jamais de se CONNECTER : la même échéance', [rc.code, rc.corps && rc.corps.error], [502, 'serveur_injoignable']);
    ETAT.mode = { fetchOne: () => new Promise(() => {}) };
    const rm = await appeler(H, 'boites.message', {}, 5000);
    v('   et un message qui ne vient jamais', [rm.code, rm.corps && rm.corps.error], [502, 'serveur_injoignable']);

    /* des emplacements PAR RÉSEAU : sept personnes d'un même réseau, six emplacements */
    const Hg = monter({ crochet: { echeanceMs: 4000, dnsMs: 200, delaiMs: 3000 } });
    let lacher; const barrière = new Promise(r2 => { lacher = r2; });
    ETAT.mode = { fetch: async function* () { await barrière; } };
    const memeReseau = []; for (let i = 1; i <= 7; i++) memeReseau.push(appeler(Hg, 'boites.messages', { moi: { id: 'p_' + String(i).padStart(32, '0') }, ip: '198.51.100.9' }, 8000));
    await dort(400);
    const pris = await Promise.race([Promise.all(memeReseau), dort(150).then(() => null)]);
    const septieme = await Promise.race(memeReseau.map((p, i) => p.then(r2 => [i, r2]))).then(([i, r2]) => [i, r2.code, r2.corps && r2.corps.error]);
    v('⛔ sept personnes d\'un MÊME réseau, une connexion chacune : la septième est refusée tout de suite (429 trop_de_connexions) — le plafond par PERSONNE (3) n\'y suffisait pas', [pris === null, septieme], [true, [6, 429, 'trop_de_connexions']]);
    lacher();
    const rendus = await Promise.all(memeReseau);
    v('   les six autres finissent normalement, et les emplacements sont rendus', [rendus.filter(r2 => r2.code === 200).length, (await appeler(Hg, 'boites.messages', { ip: '198.51.100.9' })).code], [6, 200]);
    /* …et pour TOUT le service : seize, de réseaux différents */
    let lacher2; const barrière2 = new Promise(r2 => { lacher2 = r2; });
    ETAT.mode = { fetch: async function* () { await barrière2; } };
    const tous = []; for (let i = 1; i <= 17; i++) tous.push(appeler(Hg, 'boites.messages', { moi: { id: 'p_' + String(100 + i).padStart(32, '0') }, ip: '192.0.2.' + (i + 100) }, 8000));
    await dort(400);
    const dix7 = await Promise.race(tous.map((p, i) => p.then(r2 => [i, r2.code, r2.corps && r2.corps.error])));
    v('⛔ seize connexions au plus pour tout le service : la dix-septième est refusée', dix7, [16, 429, 'trop_de_connexions']);
    lacher2(); await Promise.all(tous);

    /* un plafond de messages et d'octets sur une liste */
    const Hl = monter({ crochet: { echeanceMs: 8000, dnsMs: 200, delaiMs: 3000 } });
    let lus = 0;
    ETAT.mode = { exists: 1e9, fetch: async function* () { for (let i = 1; i <= 5000; i++) { lus++; yield { uid: i, envelope: { subject: 'x', date: new Date(), from: [{ address: 'a@b.fr' }] }, flags: new Set(), source: Buffer.from('Subject: x\r\n\r\ncorps') }; } } };
    const rl = await appeler(Hl, 'boites.messages', {}, 8000);
    v('⛔ un serveur qui ment sur `exists` et rend 5 000 messages : 40 au plus, et la lecture S\'ARRÊTE (pas cinq mille tours)', [rl.code, rl.corps.messages.length <= 40, lus <= 42], [200, true, true]);
    lus = 0;
    ETAT.mode = { exists: 100, fetch: async function* () { for (let i = 1; i <= 100; i++) { lus++; yield { uid: i, envelope: { subject: 'x', date: new Date(), from: [{ address: 'a@b.fr' }] }, flags: new Set(), source: Buffer.alloc(200 * 1024, 120) }; } } };
    const ro = await appeler(Hl, 'boites.messages', {}, 8000);
    v('⛔ des messages « de 200 Ko » alors qu\'on en a demandé 6 Ko : la lecture s\'arrête au cumul d\'octets (1,5 Mo ≈ huit messages), pas au bout des cent', [ro.code, lus >= 7 && lus <= 10, ro.corps.messages.length <= 10], [200, true, true]);

    /* deux lectures de pièce au plus */
    const Hp = monter({ crochet: { echeanceMs: 8000, dnsMs: 200, delaiMs: 3000 } });
    let lacher3; const barrière3 = new Promise(r2 => { lacher3 = r2; });
    ETAT.mode = { fetchOne: async () => { await barrière3; return false; } };
    const pj = []; for (let i = 1; i <= 3; i++) pj.push(appeler(Hp, 'boites.piece', { moi: { id: 'p_' + String(200 + i).padStart(32, '0') }, ip: '192.0.2.' + (50 + i) }, 8000));
    await dort(400);
    const troisieme = await Promise.race(pj.map((p, i) => p.then(r2 => [i, r2.code, r2.corps && r2.corps.error])));
    v('⛔ trois lectures de pièce en même temps (trois personnes, trois réseaux) : la troisième est refusée — chacune tient jusqu\'à 15 Mo', troisieme, [2, 429, 'trop_de_connexions']);
    lacher3(); await Promise.all(pj);
    ETAT.mode = { fetchOne: async () => false };
    v('   et la place revient une fois les lectures finies (404 : le message est absent, mais la lecture a eu lieu)', (await appeler(Hp, 'boites.piece', {}, 5000)).code, 404);

    /* un DNS qui traîne */
    reponduDNS = () => new Promise(() => {});
    ETAT.imap.length = 0;
    const Hd = monter({ crochet: { echeanceMs: 8000, dnsMs: 250, delaiMs: 3000 } });
    const t1 = Date.now(); const rd = await appeler(Hd, 'boites.messages', {}, 5000); const dtd = Date.now() - t1;
    reponduDNS = () => [{ address: IP_PUBLIQUE, family: 4 }];
    v('⛔ un DNS qui ne répond jamais : coupé à son délai (≈ 250 ms ici ; cinq secondes en service), 502 serveur_introuvable, aucune connexion, l\'emplacement rendu', [rd.code, rd.corps && rd.corps.error, dtd < 2500, ETAT.imap.length], [502, 'serveur_introuvable', true, 0]);
    ETAT.mode = { fetch: async function* () {} };
    v('   la requête suivante passe', (await appeler(Hd, 'boites.messages', {}, 5000)).code, 200);
  }

  console.log('\nA3 et B5. Aucun gestionnaire ne rejette sans réponse, et aucun texte d\'exception ne part');
  {
    const BRUIT = 'SQLITE_CONSTRAINT_QXZ secret-interne /var/lib/opmsg/msg.db';
    const jette = () => { throw new Error(BRUIT); };
    const casse = new Proxy({}, { get: () => jette });
    const Hc = monter({ stockage: casse });
    const ROUTES = [['boites.lister', {}], ['boites.ajouter', { body: { adresse: 'a@exemple-public.test', mdp: 'x' } }], ['boites.oauth.demarrer', { body: { fournisseur: 'google' } }], ['boites.supprimer', {}], ['boites.messages', {}], ['boites.message', {}],
      ['boites.piece', {}], ['boites.marquer', { body: { lu: true } }], ['boites.envoyer', { body: { a: 'a@exemple-public.test', objet: 'x', texte: 'y' } }]];
    const avantRejets = rejets;
    const sorties = [];
    for (const [id, req] of ROUTES) { const r = await appeler(Hc, id, req, 4000); sorties.push([id, r.code, r.corps && r.corps.error, JSON.stringify(r.corps).includes('QXZ')]); }
    await dort(100);
    v('⛔ la base JETTE (une erreur SQLite brute) : CHAQUE gestionnaire répond 500 `boites_mail_erreur`, sans un mot de l\'exception, aucune attente sans réponse', sorties, ROUTES.map(([id]) => [id, 500, 'boites_mail_erreur', false]));
    v('   ⛔ et aucun rejet non rattrapé (qui arrêterait le processus : `index.js` sort sur un rejet)', rejets - avantRejets, 0);
    /* le cas nommé : l'ajout d'une boîte dont la création jette une erreur qui n'est pas « trop_de_boites » */
    ETAT.mode = {};
    const Ha = monter({ stockage: stockageDe({ boiteMailCreer: () => { throw new Error(BRUIT); } }) });
    const ra = await appeler(Ha, 'boites.ajouter', { body: { adresse: 'a@exemple-public.test', mdp: 'mot-de-passe' } }, 4000);
    v('A3 : `boiteMailCreer` jette une erreur SQLite : 500 `boites_mail_erreur`, rien du texte, pas de rejet', [ra.code, ra.corps.error, JSON.stringify(ra.corps).includes('QXZ'), rejets - avantRejets], [500, 'boites_mail_erreur', false, 0]);
    const ec = journaux.filter(j => j[0] === 'boite_mail_echec' && j[1].motif === 'erreur_interne').length;
    vrai('   l\'échec est JOURNALISÉ par un motif fixe (« erreur_interne ») — jamais le texte', ec >= 1 && !JSON.stringify(journaux).includes('QXZ'));
    /* une bibliothèque qui ne se charge pas */
    const Hb = monter();
    ETAT.brise = true; ETAT.imap.length = 0;
    const rb = await appeler(Hb, 'boites.messages', {}, 4000);
    ETAT.brise = false; ETAT.mode = { fetch: async function* () {} };
    v('B5 : `require(\'imapflow\')` qui jette (module cassé) : 502 `boite_indisponible` DIT, sans le texte de l\'exception ni le chemin', [rb.code, rb.corps.error, JSON.stringify(rb.corps).includes('QXZ') || /\/opt\//.test(JSON.stringify(rb.corps))], [502, 'boite_indisponible', false]);
    const apres = []; for (let i = 0; i < 4; i++) apres.push((await appeler(Hb, 'boites.messages', {}, 4000)).code);
    v('   l\'emplacement a été RENDU (le chargement cassé a eu lieu DANS le try) : quatre lectures de suite passent', apres, [200, 200, 200, 200]);
    /* l'exception d'une bibliothèque en pleine lecture : jamais citée */
    ETAT.mode = { fetch: async function* () { throw new Error('ERREUR-BIBLIOTHEQUE-QXZ alice@exemple-public.test'); } };
    const rx = await appeler(Hb, 'boites.messages', {}, 4000);
    v('   une exception de la bibliothèque en plein relevé : 502 `boite_indisponible`, sans son texte (il peut citer l\'adresse)', [rx.code, rx.corps.error, JSON.stringify(rx.corps).includes('QXZ')], [502, 'boite_indisponible', false]);
  }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });
