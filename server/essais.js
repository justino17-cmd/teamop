/* ══ L'ESPACE DE TEST — LE MODE TEST DU SERVEUR (23 octobre 2026) ════════════════════════════════
 *
 * Justin : « toute modification — site, application, la Tour — je veux des espaces de test, et après on pousse ; chaque
 * test expliqué dans un ordre ». Un SECOND serveur, le MÊME code (`index.js`), lancé sur le VPS avec sa propre config, ses
 * propres données et sa propre clé maître (`test.teamop.fr` → 127.0.0.1:8095 — 8090 est à OP MESSAGES). Ce fichier est tout ce que ce serveur-là a
 * de plus que l'autre — et rien de ceci ne se monte sans `config.espaceTest === true`.
 *
 * ⛔ INERTE EN PRODUCTION, ET UN BANC LE PROUVE (`tests/test-2981.js`, sur le VRAI serveur) : sans `espaceTest`, les trois
 *    routes répondent 404, un courriel PART vers le serveur d'envoi, le plafond des agents reste à 195 $, aucune origine
 *    de test n'est admise. `courrielsCaptes`, `espaceTestOrigine` et `agents.plafondMoisTotal` sont ignorés seuls : un
 *    réglage oublié ne doit jamais couper les courriels d'un vrai client.
 *
 * ⛔ UN SERVEUR DE TEST N'ENVOIE JAMAIS UN VRAI COURRIEL. Un seul endroit sait envoyer dans ce dépôt : `nodemailer`. On ne
 *    capte donc pas appelant par appelant (`mailerEnvoi`, la Messagerie de la Tour, la boîte support, le SMTP d'un client…
 *    — un chemin oublié enverrait un vrai message depuis le test), on remplace `createTransport` lui-même : tout transport
 *    qui irait vers le réseau devient un transport qui RANGE le message (`courriels-essais.json`, 200 au plus) et répond
 *    comme un envoi réussi. Seuls `streamTransport` et `jsonTransport`, qui ne touchent jamais au réseau (la Messagerie
 *    s'en sert pour garder une copie « Envoyés »), passent tels quels.
 *    Les liens `https://teamop.fr/…` du message sont réécrits vers l'origine de test AU RANGEMENT : le lien de confirmation
 *    d'une inscription de test doit ouvrir la page de test, pas la production (où son jeton n'existe pas).
 *
 * ⛔ LA REMISE À ZÉRO NE TOUCHE JAMAIS HORS DE `TEAMOP_DATA`, ET PAS N'IMPORTE QUEL `TEAMOP_DATA`. Elle se fait AU DÉMARRAGE
 *    SUIVANT, avant que `index.js` lise le moindre fichier (la route pose une demande et arrête le serveur proprement ;
 *    l'unité systemd le relance — `Restart=always`) : vider des fichiers sous les pieds d'un serveur qui les a en mémoire,
 *    et dont des minuteries réécrivent, ne laisserait que des états mêlés. Elle exige une MARQUE (`.espace-de-test`) posée au
 *    premier démarrage SUR UN DOSSIER VIERGE : un `TEAMOP_DATA` qui contenait déjà quelque chose (la production, par une
 *    erreur de réglage) ne reçoit jamais la marque, donc ne se vide jamais. `/opt/teamop/data` est refusé nommément.
 *
 * ⛔ LES COMPTES SEMÉS SONT FICTIFS (`exemple-essai.fr`), leur mot de passe est tiré au hasard et JETÉ : on entre par les liens
 *    de `/api/essais/connexion`, qui ouvrent une vraie session (celle du portail, celle de la Tour). Rien n'est écrit dans le
 *    dépôt, rien n'est affiché.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

const MARQUE = '.espace-de-test';                 // posée au premier démarrage sur un dossier VIERGE
const DEMANDE_RAZ = '.remise-a-zero';             // posée par la route ; lue (et consommée) au démarrage suivant
const F_COURRIELS = 'courriels-essais.json';
const F_SEMIS = 'essais-semis.json';
const MAX_COURRIELS = 200;
const MAX_CHAMP = 200000;                         // un courriel capté ne pèse pas plus (texte, html)
const ORIGINE_DEFAUT = 'https://test.teamop.fr';
const DOMAINE = 'exemple-essai.fr';
const PROD_DATA = '/opt/teamop/data';
const PLAFOND_AGENTS_DEFAUT = 10;                 // dollars par mois, tous agents confondus : un serveur de test mal réglé ne dépense JAMAIS les 195 $ de la production
/* Le plafond du mois des agents DU SERVEUR DE TEST : le réglage s'il est un nombre positif, sinon 10 $ (jamais « pas de plafond »). `cerveau.js` le ramène à 195 $ au plus. */
const plafondAgents = (reglage) => (typeof reglage === 'number' && Number.isFinite(reglage) && reglage > 0) ? reglage : PLAFOND_AGENTS_DEFAUT;

/* Les quatre portes de « Se connecter comme… ». Les adresses sont fixes (fictives) : le lien doit retrouver le compte après
   une remise à zéro, qui les recrée à l'identique. */
const COMPTES = {
  client:        { genre: 'portail', email: 'client@' + DOMAINE,   prenom: 'Camille', nom: 'Essai',    societe: 'Clim Essai',      page: '/espace.html' },
  prospect:      { genre: 'portail', email: 'prospect@' + DOMAINE, prenom: 'Paul',    nom: 'Prospect', societe: 'Plomberie Essai', page: '/espace.html' },
  patron:        { genre: 'tour', nom: 'Patron Essai',        email: 'patron@' + DOMAINE,        role: 'patron',        page: '/tour.html' },
  collaborateur: { genre: 'tour', nom: 'Collaborateur Essai', email: 'collaborateur@' + DOMAINE, role: 'collaborateur', page: '/tour.html' },
};

const aleatoire = (n) => crypto.randomBytes(n).toString('hex');
const sha = (x) => crypto.createHash('sha256').update(String(x)).digest();

/* ── LA CLÉ : 64 hexadécimaux, comparée à TEMPS CONSTANT (les deux côtés passent par SHA-256 : même longueur, rien à dire) ── */
const cleBienFormee = (x) => typeof x === 'string' && /^[0-9a-f]{64}$/.test(x);
function cleOk(attendue, recue) {
  if (!cleBienFormee(attendue)) return false;
  try { return crypto.timingSafeEqual(sha(attendue), sha(typeof recue === 'string' ? recue : '')); } catch (e) { return false; }
}

/* ── LE DÉMARRAGE : la marque, et la remise à zéro demandée ─────────────────────────────────────────────────────────────── */
/* Rend { sur, raison?, neuf?, remise? }. `sur` : ce dossier est BIEN un dossier de test (la remise à zéro n'est permise que là). */
function demarrage(o) {
  const dossier = path.resolve(String((o && o.dossier) || ''));
  const profondeur = dossier.split(path.sep).filter(Boolean).length;
  if (profondeur < 2 || dossier === PROD_DATA || dossier === path.dirname(PROD_DATA)) return { sur: false, raison: 'dossier_interdit' };
  let noms;
  try { noms = fs.readdirSync(dossier); } catch (e) { return { sur: false, raison: 'dossier_illisible' }; }
  const marque = path.join(dossier, MARQUE);
  if (noms.includes(MARQUE)) {
    /* la marque doit être un FICHIER ordinaire de ce dossier, pas un lien vers ailleurs */
    let st = null; try { st = fs.lstatSync(marque); } catch (e) { st = null; }
    if (!st || !st.isFile()) return { sur: false, raison: 'marque_invalide' };
    let remise = false, monitorVide = false;
    if (noms.includes(DEMANDE_RAZ)) { vider(dossier); remise = true; monitorVide = viderMonitor(o && o.monitor); }
    return { sur: true, remise, monitorVide };
  }
  if (noms.length === 0) {
    try { fs.writeFileSync(marque, JSON.stringify({ ts: Date.now(), note: 'dossier de TEST : la remise à zéro y est permise' })); }
    catch (e) { return { sur: false, raison: 'marque_non_ecrite' }; }
    return { sur: true, neuf: true };
  }
  return { sur: false, raison: 'dossier_non_vierge' };
}
/* ⛔ LE FICHIER DE LA TOUR VIT À CÔTÉ DE LA CONFIGURATION, PAS DANS LES DONNÉES (relecture adverse, 23 octobre 2026) : `monitor.json` — comptes de la Tour, incidents, journal, archive — est rangé par `index.js`
   dans le dossier de `TEAMOP_CONFIG`, donc hors de `TEAMOP_DATA` que `vider()` balaie. La page promettait « les données d'essai sont vidées » : les incidents et le journal d'avant la remise
   à zéro survivaient. Il est remis à `{}` au même moment (les comptes de la Tour reviennent par le semis), et SEULEMENT si c'est un fichier ordinaire nommé `monitor.json` qui existe déjà
   (jamais créé ailleurs) et que ce n'est pas celui de la production, nommé en toutes lettres. Écrit EN PLACE, comme le fait `monSave()` : le service n'a le droit d'écrire que ce fichier-là. */
const PROD_MONITOR = '/opt/teamop/monitor.json';
function viderMonitor(chemin) {
  if (typeof chemin !== 'string' || !chemin) return false;
  const p = path.resolve(chemin);
  if (path.basename(p) !== 'monitor.json' || p === PROD_MONITOR) return false;
  try { if (!fs.lstatSync(p).isFile()) return false; fs.writeFileSync(p, '{}\n'); return true; } catch (e) { return false; }
}
/* Ce que la remise à zéro ne vide JAMAIS : la marque, et le COMPTEUR DE DÉPENSE des agents. Ce compteur dit combien de la vraie clé `agents.cleApi`
   a été consommé ce mois-ci : le vider, c'était racheter 10 $ de crédit réel à chaque clic sur « Remettre l'espace à zéro » (relecture adverse, 23 octobre 2026).
   Il ne porte aucune donnée de test — des dollars par agent —, et `cerveau.js` le remet à neuf tout seul au changement de mois. */
const EPARGNES = [MARQUE, 'agents-budget.json'];
/* Vide le contenu direct du dossier, sauf `EPARGNES`. `rmSync` ne suit PAS un lien symbolique : il retire le lien, jamais sa cible. */
function vider(dossier) {
  let n = 0;
  for (const nom of fs.readdirSync(dossier)) {
    if (EPARGNES.includes(nom)) continue;
    try { fs.rmSync(path.join(dossier, nom), { recursive: true, force: true }); n++; } catch (e) { console.error('essais : non retiré —', nom, (e && e.code) || 'erreur'); }
  }
  return n;
}

/* ── LES COURRIELS CAPTÉS ────────────────────────────────────────────────────────────────────────────────────────────────── */
/* « "Dupont, Jean" <jd@x.fr>, paul@x.fr » : la virgule d'un nom entre guillemets, ou d'une adresse entre chevrons, ne sépare rien. */
function decouper(texte) {
  const out = []; let cur = '', guill = false, chev = false;
  for (const c of texte) {
    if (c === '"') guill = !guill; else if (!guill && c === '<') chev = true; else if (!guill && c === '>') chev = false;
    if (c === ',' && !guill && !chev) { out.push(cur); cur = ''; } else cur += c;
  }
  out.push(cur);
  return out;
}
function adresses(x) {
  const l = Array.isArray(x) ? x : (x == null || x === '' ? [] : [x]);
  const out = [];
  for (const a of l) {
    if (a && typeof a === 'object' && !Array.isArray(a)) { const ad = String(a.address || ''); if (ad) out.push(a.name ? String(a.name) + ' <' + ad + '>' : ad); }
    else if (typeof a === 'string') for (const p of decouper(a)) if (p.trim()) out.push(p.trim());
  }
  return out;
}
const borne = (x) => String(x == null ? '' : x).slice(0, MAX_CHAMP);
/* Les liens du site, de l'API ou du sous-domaine `www` pointent vers l'origine de test. `(?![\w-]|\.[a-z0-9])` : « teamop.fr.exemple.com » n'est pas le site. */
function reecrire(texte, origine) {
  return String(texte).replace(/https?:\/\/(?:www\.|api\.)?teamop\.fr(?![\w-]|\.[a-z0-9])/gi, origine);
}
function liens(texte, html) {
  const vus = [];
  const ajoute = (u) => { u = String(u).replace(/&amp;/g, '&').replace(/[.,;:!?]+$/, ''); if (u && !vus.includes(u)) vus.push(u); };
  for (const m of String(html || '').matchAll(/href\s*=\s*["']([^"']+)["']/gi)) if (/^https?:\/\//i.test(m[1])) ajoute(m[1]);
  for (const m of String(texte || '').matchAll(/https?:\/\/[^\s<>"')\]]+/g)) ajoute(m[0]);
  for (const m of String(html || '').matchAll(/https?:\/\/[^\s<>"')\]]+/g)) ajoute(m[0]);
  return vus.slice(0, 40);
}

/* Le dépôt des courriels : un fichier, du plus récent au plus ancien, écrit par temporaire puis renommage. */
function depot(o) {
  const chemin = path.join(o.dossier, F_COURRIELS);
  const origine = String(o.origine || ORIGINE_DEFAUT).replace(/\/+$/, '');
  const maintenant = typeof o.maintenant === 'function' ? o.maintenant : Date.now;
  let liste = [];
  try { const j = JSON.parse(fs.readFileSync(chemin, 'utf8')); if (Array.isArray(j)) liste = j.slice(0, MAX_COURRIELS); } catch (e) { liste = []; }
  function ecrire() {
    try { fs.mkdirSync(path.dirname(chemin), { recursive: true }); fs.writeFileSync(chemin + '.tmp', JSON.stringify(liste)); fs.renameSync(chemin + '.tmp', chemin); return true; }
    catch (e) { console.error('essais : courriel non rangé —', (e && e.code) || 'erreur'); return false; }
  }
  function capter(opts) {
    if (!opts || typeof opts !== 'object') return Promise.reject(Object.assign(new Error('message vide'), { code: 'EMESSAGE' }));
    const a = adresses(opts.to), cc = adresses(opts.cc), bcc = adresses(opts.bcc);
    if (!a.length && !cc.length && !bcc.length) return Promise.reject(Object.assign(new Error('Aucun destinataire'), { code: 'ENODEST' }));
    const texte = reecrire(borne(opts.text), origine), html = reecrire(borne(opts.html), origine);
    const ent = { id: 'e' + aleatoire(6), date: new Date(maintenant()).toISOString(), de: adresses(opts.from).join(', '), a, cc, bcc,
      objet: reecrire(borne(opts.subject).slice(0, 300), origine), texte, html, liens: liens(texte, html),
      pieces: (Array.isArray(opts.attachments) ? opts.attachments : []).slice(0, 20).map(p => ({ nom: String((p && (p.filename || p.path)) || 'sans nom').slice(0, 120) })) };
    liste.unshift(ent);
    if (liste.length > MAX_COURRIELS) liste.length = MAX_COURRIELS;
    if (!ecrire()) { liste.shift(); return Promise.reject(Object.assign(new Error('courriel non rangé'), { code: 'EDISQUE' })); }
    const tous = a.concat(cc, bcc);
    return Promise.resolve({ accepted: tous, rejected: [], envelope: { from: ent.de, to: tous }, messageId: '<' + ent.id + '@essai.invalid>',
      response: '250 capté par l\'espace de test (rien n\'est parti)', captee: true });
  }
  /* Un transport qui se fait passer pour celui de nodemailer : `sendMail` (promesse ou rappel), `verify`, `close`. */
  function transport() {
    return {
      captee: true, options: {},
      sendMail(opts, cb) { const p = capter(opts); if (typeof cb === 'function') { p.then(i => cb(null, i), e => cb(e)); return undefined; } return p; },
      verify(cb) { const p = Promise.resolve(true); if (typeof cb === 'function') { p.then(() => cb(null, true)); return undefined; } return p; },
      close() {}, isIdle() { return true; },
    };
  }
  return { capter, transport, liste: (n) => liste.slice(0, Math.max(0, Math.min(MAX_COURRIELS, n == null ? MAX_COURRIELS : n))), nombre: () => liste.length, vider: () => { liste = []; ecrire(); }, chemin };
}

/* Remplace `createTransport` sur le module nodemailer lui-même : tout appelant, présent ou futur, le traverse. Une seule fois. */
function patcherNodemailer(nodemailer, d) {
  if (!nodemailer || typeof nodemailer.createTransport !== 'function') throw new Error('nodemailer illisible : le mode test ne peut pas garantir qu\'aucun courriel ne part');
  if (nodemailer.createTransport.__essais) return false;
  const original = nodemailer.createTransport;
  const faux = function createTransport(options, ...reste) {
    /* ces deux-là ne touchent jamais au réseau : ils fabriquent un message (copie « Envoyés ») ou le rendent en JSON */
    if (options && typeof options === 'object' && (options.streamTransport || options.jsonTransport)) return original.call(this, options, ...reste);
    return d.transport();
  };
  faux.__essais = true; faux.original = original;
  nodemailer.createTransport = faux;
  return true;
}

/* ── LE SEMIS : des comptes fictifs, joués par les VRAIES routes ─────────────────────────────────────────────────────────── */
const lettres = 'abcdefghjkmnpqrstuvwxyz23456789';
function tirage(n) { const b = crypto.randomBytes(n); let s = ''; for (let i = 0; i < n; i++) s += lettres[b[i] % lettres.length]; return s; }

/* ctx : { dossier, appeler(methode, chemin, {jeton, corps}) → {code, json}, comptes:{semer, sessionNeuve}, tour:{semer(liste), session(nom)}, refs:{conseil(metier), cats}, agents:[ids], journal } */
function semis(ctx) {
  const journal = ctx.journal || ((...a) => console.log('essais :', ...a));
  const chemin = path.join(ctx.dossier, F_SEMIS);
  const jour = (n) => new Date(Date.now() + n * 86400000).toISOString().slice(0, 10);
  async function semer() {
    try { if (JSON.parse(fs.readFileSync(chemin, 'utf8')).ok === true) return { deja: true, erreurs: [] }; } catch (e) { /* pas encore semé */ }
    const erreurs = [];
    const verifie = (etape, r, attendus) => { if (!r || !(attendus || [200]).includes(r.code)) erreurs.push(etape + ' → ' + (r ? r.code + ' ' + JSON.stringify(r.json || {}).slice(0, 120) : 'sans réponse')); return r; };

    /* 1 · la Tour : un patron et un collaborateur (le mot de passe est tiré et jeté) */
    ctx.tour.semer([COMPTES.patron, COMPTES.collaborateur].map(c => ({ nom: c.nom, email: c.email, role: c.role, mdp: aleatoire(12) })));
    const patron = ctx.tour.session(COMPTES.patron.nom);
    if (!patron) { erreurs.push('la Tour : pas de session de patron'); return { deja: false, erreurs }; }
    const T = (m, p, corps, etape) => ctx.appeler(m, p, { jeton: patron.token, corps }).then(r => verifie(etape || p, r));

    /* 2 · les comptes du site : adresses confirmées, mot de passe jeté */
    for (const k of ['client', 'prospect']) {
      const c = COMPTES[k];
      let ok = false; try { ok = await ctx.comptes.semer({ email: c.email, prenom: c.prenom, nom: c.nom, societe: c.societe, empreinte: aleatoire(32) }); } catch (e) { ok = false; }
      if (!ok) erreurs.push('compte ' + k + ' non semé');
    }
    const sClient = ctx.comptes.sessionNeuve(COMPTES.client.email), sProspect = ctx.comptes.sessionNeuve(COMPTES.prospect.email);
    if (!sClient || !sProspect) { erreurs.push('session du portail impossible'); return { deja: false, erreurs }; }
    const P = (jeton, m, p, corps, etape) => ctx.appeler(m, p, { jeton, corps }).then(r => verifie(etape || p, r));
    const cats = (ctx.refs && typeof ctx.refs.conseil === 'function' && ctx.refs.conseil('chauffage')) || ((ctx.refs && ctx.refs.cats) || []).slice(0, 14);
    const catsPlomb = (ctx.refs && typeof ctx.refs.conseil === 'function' && ctx.refs.conseil('plomberie')) || ((ctx.refs && ctx.refs.cats) || []).slice(0, 10);

    /* 3 · le CLIENT : « Clim Essai », chauffage, Pro, en période d'essai de 30 jours, rubriques posées */
    const t0 = Date.now();
    const demandeC = { app: 'OP GESTION', formule: 'Pro', statut: 'fourni', date: t0, besoin: 'Entretien de chaudières — compte d\'essai', users: '3', metier: 'chauffage', cats, lien: 'climessai' };
    const fiche = (c, dem, plan) => ({ nom: c.prenom + ' ' + c.nom, prenom: c.prenom, nomFam: c.nom, tel: '0600000000', entreprise: c.societe, inscrit: t0, apps: ['OP GESTION'], demandes: [dem], plan, planStatus: 'actif' });
    await P(sClient, 'POST', '/api/portail/demande', { prenom: COMPTES.client.prenom, nom: COMPTES.client.nom, name: COMPTES.client.prenom + ' ' + COMPTES.client.nom, company: COMPTES.client.societe,
      tel: '0600000000', status: 'fourni', apps: ['elan'], plan: 'Pro', planStatus: 'actif', demandes: [demandeC] }, 'dossier du client');
    await P(sClient, 'POST', '/api/clients/sync', fiche(COMPTES.client, demandeC, 'Pro'), 'fiche du client');
    const code = Buffer.from(JSON.stringify({ t: 'climessai-' + tirage(4), k: tirage(24), n: 'Clim Essai', a: 'admin', m: tirage(12), e: COMPTES.client.email, p: COMPTES.client.prenom, f: COMPTES.client.nom }), 'utf8').toString('base64').replace(/=+$/, '');
    await T('POST', '/api/monitor/espaces', { nom: 'Clim Essai', code, email: COMPTES.client.email, origine: 'site' }, 'espace du client');
    await T('POST', '/api/monitor/espaces/metier', { nom: 'Clim Essai', metier: 'chauffage' }, 'métier du client');
    await T('POST', '/api/monitor/espaces/cats', { nom: 'Clim Essai', cats }, 'rubriques du client');
    await T('POST', '/api/monitor/espaces/abonnement', { nom: 'Clim Essai', formule: 'pro', quantite: 3, statut: 'essai', fin: jour(30) }, 'abonnement du client');
    await T('POST', '/api/monitor/clients/metier', { email: COMPTES.client.email, metier: 'chauffage' }, 'métier de la fiche');
    await T('POST', '/api/monitor/clients/demande', { email: COMPTES.client.email, idx: 0 }, 'demande du client traitée');

    /* 4 · le PROSPECT : une demande d'accès EN ATTENTE (plomberie, rubriques choisies), aucun espace */
    const demandeP = { app: 'OP GESTION', formule: 'Pro', statut: 'nouveau', date: t0 + 1000, besoin: 'Dépannage plomberie — demande d\'essai', users: '2', metier: 'plomberie', cats: catsPlomb };
    await P(sProspect, 'POST', '/api/portail/demande', { prenom: COMPTES.prospect.prenom, nom: COMPTES.prospect.nom, name: COMPTES.prospect.prenom + ' ' + COMPTES.prospect.nom,
      company: COMPTES.prospect.societe, tel: '0600000001', status: 'nouveau', apps: [], plan: 'Pro', demandes: [demandeP] }, 'dossier du prospect');
    await P(sProspect, 'POST', '/api/clients/sync', Object.assign(fiche(COMPTES.prospect, demandeP, 'Pro'), { apps: [] }), 'fiche du prospect');

    /* 5 · les agents : tous en Brouillon (ils préparent, rien ne part sans le patron), et ils travaillent 24 h sur 24 — l'espace de test sert à les essayer à toute heure, le soir et le week-end
       compris (les heures de travail de l'entreprise, `agents-horaires.js`, y sont ouvertes en permanence, jours fériés compris) */
    await T('POST', '/api/monitor/agents/horaires', { entreprise: { jours: [0, 1, 2, 3, 4, 5, 6].map(() => ({ ouvert: true, debut: '00:00', fin: '24:00' })), feries: false } }, 'heures de travail des agents (24 h sur 24)');
    for (const id of (ctx.agents || [])) await T('POST', '/api/monitor/agents/mode', { agent: id, mode: 'brouillon' }, 'agent ' + id);

    if (erreurs.length) { journal('semis INCOMPLET —', erreurs.join(' · ')); return { deja: false, erreurs }; }
    try { fs.writeFileSync(chemin + '.tmp', JSON.stringify({ ok: true, ts: Date.now() })); fs.renameSync(chemin + '.tmp', chemin); } catch (e) { erreurs.push('marque du semis non écrite'); }
    journal('semis fait : client, prospect, patron, collaborateur, ' + (ctx.agents || []).length + ' agent(s) en brouillon');
    return { deja: false, erreurs };
  }
  return { semer };
}

/* Le serveur se parle à lui-même, en HTTP, sur 127.0.0.1 : le semis joue les VRAIES routes (mêmes gardes, mêmes écritures) au lieu de
   recopier leurs règles. Rend { code, json } — ou null si la connexion échoue. */
function appelerLocal(port) {
  const http = require('http');
  return (methode, chemin, o) => new Promise((ok) => {
    const corps = o && o.corps !== undefined ? JSON.stringify(o.corps) : null;
    const entetes = { 'Content-Type': 'application/json' };
    if (o && o.jeton) entetes.Authorization = 'Bearer ' + o.jeton;
    if (corps) entetes['Content-Length'] = Buffer.byteLength(corps);
    const req = http.request({ host: '127.0.0.1', port, path: chemin, method: methode, headers: entetes }, (r) => {
      let t = ''; r.on('data', d => { t += d; });
      r.on('end', () => { let j = null; try { j = JSON.parse(t); } catch (e) { j = null; } ok({ code: r.statusCode, json: j }); });
    });
    req.on('error', () => ok(null));
    req.setTimeout(20000, () => req.destroy());
    if (corps) req.write(corps);
    req.end();
  });
}

/* ── LES TROIS ROUTES ────────────────────────────────────────────────────────────────────────────────────────────────────── */
/* ctx : { app, cle, origine, depot, sur, comptes:{sessionNeuve}, tour:{session(nom)}, quitter(), dossier, quotaOk?, journal? } */
function monter(app, ctx) {
  const origine = String(ctx.origine || ORIGINE_DEFAUT).replace(/\/+$/, '');
  const journal = ctx.journal || ((...a) => console.log('essais :', ...a));
  const quotaFautes = new Map();
  const garde = (req, res) => {
    res.setHeader('Cache-Control', 'no-store'); res.setHeader('Referrer-Policy', 'no-referrer'); res.setHeader('X-Robots-Tag', 'noindex');
    /* La clé voyage de préférence dans l'EN-TÊTE `X-Essai-Cle` : une adresse (`?cle=`) s'écrit dans le journal d'accès de nginx, dans l'historique du navigateur et dans un lien copié.
       Les pages l'envoient en en-tête pour leurs `fetch` ; seuls les liens « Se connecter comme… », qui sont de la navigation, gardent le paramètre (et nginx ne les journalise pas). */
    const recue = typeof (req.headers && req.headers['x-essai-cle']) === 'string' ? req.headers['x-essai-cle'] : (req.query && req.query.cle);
    if (cleOk(ctx.cle, recue)) return true;
    /* une clé fausse se compte (par IP) : trente par heure, puis on se tait */
    if (typeof ctx.quotaOk === 'function' && !ctx.quotaOk(quotaFautes, 'essai-cle:' + String(req.ip || ''), 30, 3600000)) { res.status(429).json({ error: 'trop_de_tentatives' }); return false; }
    res.status(403).json({ error: 'cle_refusee' });
    return false;
  };
  const b64url = (o) => Buffer.from(JSON.stringify(o), 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

  app.get('/api/essais/courriels', (req, res) => {
    if (!garde(req, res)) return;
    /* `?n=` : les n plus récents (1 à 200). Une page qui se rafraîchit n'a pas besoin de tirer 200 corps de courriels à chaque fois. */
    const n = Math.max(1, Math.min(MAX_COURRIELS, parseInt(req.query && req.query.n, 10) || MAX_COURRIELS));
    res.json({ ok: true, nombre: ctx.depot.nombre(), courriels: ctx.depot.liste(n) });
  });

  app.get('/api/essais/connexion', (req, res) => {
    if (!garde(req, res)) return;
    const k = String((req.query && req.query.compte) || '');
    const c = Object.prototype.hasOwnProperty.call(COMPTES, k) ? COMPTES[k] : null;
    if (!c) return res.status(400).json({ error: 'compte_inconnu', comptes: Object.keys(COMPTES) });
    let stockage = null;
    if (c.genre === 'portail') {
      /* exactement ce que range `espace.html` après une connexion (`poserJeton`) */
      const jeton = ctx.comptes.sessionNeuve(c.email);
      if (jeton) stockage = { teamop_portail_jeton: jeton };
    } else {
      /* exactement ce que range `tour.html` après une connexion (`localStorage`, « rester connecté ») */
      const s = ctx.tour.session(c.nom);
      if (s) stockage = { tour_token: s.token, tour_nom: s.nom, tour_role: s.role, tour_apps: JSON.stringify(s.apps) };
    }
    if (!stockage) return res.status(503).json({ error: 'pas_encore_seme', conseil: 'le semis des comptes de test n\'est pas fini : réessaie dans un instant' });
    res.redirect(302, origine + c.page + '#essai=' + b64url({ stockage, page: c.page, compte: k }));
  });

  app.post('/api/essais/remise-a-zero', (req, res) => {
    if (!garde(req, res)) return;
    /* ⛔ pas de marque, pas de remise à zéro : ce dossier n'a jamais été reconnu comme un dossier de TEST */
    if (!ctx.sur || !ctx.sur.sur) return res.status(409).json({ error: 'dossier_non_reconnu', raison: (ctx.sur && ctx.sur.raison) || 'inconnue' });
    try { fs.writeFileSync(path.join(ctx.dossier, DEMANDE_RAZ), String(Date.now())); }
    catch (e) { return res.status(500).json({ error: 'demande_non_ecrite' }); }
    res.json({ ok: true, redemarrage: true, conseil: 'le serveur de test redémarre et resème les comptes : compte une quinzaine de secondes' });
    res.on('finish', () => { journal('remise à zéro demandée — arrêt propre, vidage au démarrage suivant'); setTimeout(() => { try { ctx.quitter(); } catch (e) { console.error('essais : arrêt impossible'); } }, 200); });
  });
}

module.exports = { plafondAgents, PLAFOND_AGENTS_DEFAUT, appelerLocal, demarrage, vider, viderMonitor, depot, patcherNodemailer, semis, monter, cleOk, cleBienFormee, reecrire, liens, adresses, COMPTES, MARQUE, DEMANDE_RAZ, F_COURRIELS, F_SEMIS, MAX_COURRIELS, ORIGINE_DEFAUT, DOMAINE };
