/* ═══════════════════════════════════════════════════════════════════════════
   MESSAGERIE TEAM OP — moteur complet (plusieurs boîtes connectées en même temps)
   Réception (IMAP) : dossiers, liste paginée, lecture, pièces jointes, recherche,
                      lu/non lu, marquage, déplacement, corbeille.
   Envoi (SMTP)     : nouveau message, réponse, réponse à tous, transfert,
                      copie/copie cachée, pièces jointes, copie dans « Envoyés ».
   Brouillons       : enregistrés dans le dossier Brouillons de la boîte.
   Les mots de passe vivent UNIQUEMENT dans le fichier de données du serveur.

   ⛔ LES MÊMES BOÎTES SERVENT LES DEUX CONSOLES DE LA TOUR (Justin, 17 octobre 2026 : « mêmes boîtes,
   triées »). Chaque message porte `console` — 'gestion', 'messages' ou 'atrier' — décidé par l'adresse
   de l'INTERLOCUTEUR (l'expéditeur d'un message reçu, le premier destinataire d'un message envoyé),
   dans cet ordre, et il n'y en a pas d'autre : 1. une règle posée à la main (adresse exacte, puis
   domaine « @exemple.fr ») ; 2. une adresse connue d'OP GESTION (`ctx.adresseGestion`, que
   `server/index.js` branche sur l'annuaire des espaces et sur les fiches clients) ; 3. une adresse
   connue d'OP MESSAGES (`ctx.adresseMessages` : le CROCHET est posé, il rend faux pour l'instant — OP
   MESSAGES aura son propre serveur, ses comptes sont des personnes et non des entreprises) ;
   4. sinon 'atrier', pour que quelqu'un le range. Un message à trier se montre dans LES DEUX consoles :
   un courriel qu'aucune console ne réclame ne doit pas disparaître.
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const coffreBoites = require('./coffre-boites');

const MAX_PIECES = 12;
const MAX_PIECES_OCTETS = 12 * 1024 * 1024;   // 12 Mo au total pour un envoi — environ 16 Mo de JSON une fois en base64, d'où l'analyseur à 20 Mo de `index.js`
const PAR_PAGE = 30;
const ENVOIS_PAR_HEURE = 60;           // par compte de la Tour, pas par boîte : c'est la session volée qu'on borne
const ENVOIS_AGENTS_PAR_HEURE = 30;     // le budget des AGENTS (Léa, Camille), à part de celui de la Tour : un agent qui boucle ne mange pas les envois de Justin, ni l'inverse
const BROUILLONS_PAR_HEURE = 30;        // un brouillon porte jusqu'à 12 Mo de pièces rangées dans la boîte : sans budget, une session remplit Brouillons
const MAX_TRI = 1500;                  // messages les plus récents examinés pour filtrer par console (`tronque` quand le dossier est plus long)
const MAX_REGLES = 2000;
const NON_LUS_MS = Math.max(1, parseInt(process.env.TEAMOP_MAIL_NONLUS_MS, 10) || 20000);   // les non-lus se périment vite, et tout geste qui les change les oublie aussitôt (la variable : pour les bancs seulement)

/* ── CE QUE LES AGENTS ONT LE DROIT DE TOUCHER (23 octobre 2026) ──────────────────────────────────────────────────────────────
   Justin : « Contrôle, ils ne l'utilisent pas. » ET le cahier : Léa, Chloé et Camille écrivent depuis contact@ ; Camille lit aussi support@. Une LISTE D'AUTORISATION, pas d'exclusion
   (relecture du 23 octobre 2026) : une exclusion de `controle@` laissait passer `controle+x@`, `ctrl@`, une boîte personnelle ou `compta@` connectée au Courrier — Camille y aurait
   lu le courrier et répondu seule à des tiers, avec « contact@teamop.fr » en signature, et ces messages seraient partis chez Anthropic. Seules contact@ et support@ sont ouvertes aux
   agents : la boîte n'est ni lue (la veille ne l'annonce à personne, `lireMessage` rend `null`), ni choisie pour envoyer (`boiteParRole` ne rend qu'elles, `envoyerAgent` refuse
   toute autre boîte même nommée par son identifiant). Le domaine n'est pas contrôlé : la boîte est une boîte de LA TOUR, ajoutée par le patron. */
const BOITES_AGENTS = /^(?:contact|support)@/i;
const boiteAgentOk = b => !!b && BOITES_AGENTS.test(String(b.email || '').trim());

/* ── L'EXPÉDITEUR EST-IL AUTHENTIFIÉ ? — l'en-tête Authentication-Results de NOTRE serveur de réception (RFC 8601), pas celui que l'expéditeur y glisse.
   Un MTA ajoute son en-tête EN TÊTE du message : le PREMIER est celui du dernier relais (le nôtre), les suivants viennent d'ailleurs et un expéditeur peut en
   forger autant qu'il veut. On ne lit donc que le premier, ET seulement si son « authserv-id » (le nom du serveur qui l'a écrit) est EXACTEMENT l'un de ceux que le
   patron a déclarés dans `config.agents.authservIds`. ⛔ AUCUN réglage par défaut (relecture du 23 octobre 2026) : le domaine de l'hôte IMAP et « teamop.fr » servaient
   de repli, mais ce sont des noms PUBLICS — un expéditeur qui écrit `Authentication-Results: teamop.fr; dkim=pass header.d=victime.com` dans son propre message passait pour
   authentifié, dès qu'aucun relais ne posait d'en-tête au-dessus du sien. Sans réglage : personne n'est authentifié, donc aucun courriel reçu n'est répondu SEUL (brouillon).
   Comparaison EXACTE, pas par suffixe : « mx.teamop.fr » n'est pas « teamop.fr ». Reste à vérifier une fois sur le VPS (voir REPRISE) qu'un faux en-tête envoyé de l'extérieur arrive
   SOUS le vrai : le code ne peut pas le voir.
   Sans en-tête, avec un authserv-id inconnu, ou sans « dkim=pass » / « spf=pass » ALIGNÉ sur le domaine de l'adresse « De » : non authentifié. Un doute ne vaut jamais « oui ». */
const domaineNu = d => String(d || '').toLowerCase().replace(/^.*@/, '').replace(/[>\s.;]+$/g, '').replace(/^\.+/, '');
/* Les suffixes à deux étiquettes les plus courants : « co.uk » n'est le domaine de personne, il ne peut donc pas SIGNER pour tous les .co.uk. (Liste partielle : un parent à deux
   étiquettes est par ailleurs exigé, c'est le plancher.) */
const SUFFIXES_PUBLICS = new Set(['co.uk', 'org.uk', 'ac.uk', 'gov.uk', 'com.au', 'net.au', 'org.au', 'co.nz', 'co.jp', 'com.br', 'co.za', 'com.mx', 'co.in', 'com.cn', 'com.tr', 'co.il']);
/* ALIGNÉ, dans UN seul sens : le domaine qui signe (ou celui du chemin SPF) est le domaine « De », ou l'un de ses PARENTS — jamais l'inverse, et jamais « com » ou « fr » tout seuls.
   (Un domaine signataire enfant du domaine « De » est refusé : plus strict que le DMARC relaxé, et sans coût — le courriel reste en brouillon.) */
const aligne = (signe, de) => {
  signe = domaineNu(signe); de = domaineNu(de);
  if (!signe || !de || signe.split('.').length < 2 || SUFFIXES_PUBLICS.has(signe)) return false;
  return de === signe || de.endsWith('.' + signe);
};
function authentification(lignes, adresseDe, serveursOk) {
  const faux = { ok: false, raison: 'aucun en-tête' };
  const premiere = (Array.isArray(lignes) ? lignes : []).find(h => h && h.key === 'authentication-results');
  if (!premiere) return faux;
  const brut = String(premiere.line || '').replace(/^[^:]*:/, '').replace(/\r?\n[ \t]+/g, ' ').trim();
  const morceaux = brut.split(';').map(x => x.trim()).filter(Boolean);
  const id = String((morceaux.shift() || '').split(/\s+/)[0] || '').toLowerCase();
  const connus = (Array.isArray(serveursOk) ? serveursOk : []).map(x => String(x).trim().toLowerCase()).filter(Boolean);
  if (!id || !connus.includes(id)) return { ok: false, raison: 'serveur inconnu' };
  const de = domaineNu(adresseDe);
  if (!de || de.indexOf('.') < 1) return { ok: false, raison: 'expéditeur sans domaine' };
  for (const m of morceaux) {
    /* ⛔ `header.d` SEUL : c'est le domaine qui a SIGNÉ (le `d=` de la signature, celui dont la clé publique a été vérifiée). `header.i` est l'identité que le signataire DÉCLARE (`i=`) : il choisit ce qu'il y
       met. `dkim=pass header.i=@victime.com header.d=evil.com` — signé par evil.com, qui prétend écrire pour victime.com — passait pour authentifié quand le premier des deux rencontrés décidait. */
    const dkim = /^dkim\s*=\s*pass\b/i.test(m) && /(?:^|\s)header\.d\s*=\s*"?@?([^\s";]+)/i.exec(m);
    if (dkim && aligne(dkim[1], de)) return { ok: true, par: 'dkim', domaine: domaineNu(dkim[1]) };
    const spf = /^spf\s*=\s*pass\b/i.test(m) && /smtp\.mailfrom\s*=\s*"?([^\s";]+)/i.exec(m);
    if (spf && /@/.test(spf[1]) && aligne(spf[1], de)) return { ok: true, par: 'spf', domaine: domaineNu(spf[1]) };
  }
  return { ok: false, raison: 'ni dkim ni spf aligné' };
}
/* Un message AUTOMATIQUE (réponse d'absence, liste de diffusion, accusé) ne reçoit jamais de réponse d'un agent : deux robots qui se répondent bouclent. */
function enteteAutomatique(headers) {
  const v = n => { const x = headers && headers.get ? headers.get(n) : undefined; return x == null ? '' : String(typeof x === 'object' && !Array.isArray(x) && x.text ? x.text : x).toLowerCase(); };
  const sub = v('auto-submitted');
  if (sub && sub.trim() !== 'no') return true;
  if (/\b(bulk|list|junk|auto_reply)\b/.test(v('precedence'))) return true;
  return !!(headers && headers.has && (headers.has('list-id') || headers.has('list-unsubscribe') || headers.has('x-auto-response-suppress') || headers.has('x-autoreply') || headers.has('x-autorespond')));
}
module.exports = function monterMessagerie(app, ctx) {
  const { DATA_DIR, monAdmin, monPatronStrict, monStr, pousseNotif, mailProtege } = ctx;
  /* Ce que `server/index.js` branche : le budget horaire (`quotaOk`, le même mécanisme que partout), le masquage
     des adresses (`masqueMail`, `sansAdresses`), l'analyseur de gros corps JSON des deux routes qui portent des
     pièces, et les deux questions « cette adresse est-elle connue de… ». Une réponse qui manque ne rend jamais
     « oui » : l'adresse reste à trier. */
  const quotaOk = typeof ctx.quotaOk === 'function' ? ctx.quotaOk : null;
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses
    : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));
  const masque = typeof ctx.masqueMail === 'function' ? ctx.masqueMail : (() => '(adresse)');
  const jsonGros = typeof ctx.jsonGros === 'function' ? ctx.jsonGros : require('express').json({ limit: '20mb' });
  const connueGestion = typeof ctx.adresseGestion === 'function' ? ctx.adresseGestion : () => false;
  const connueMessages = typeof ctx.adresseMessages === 'function' ? ctx.adresseMessages : () => false;
  /* ⛔ LES E-MAILS DE SÉCURITÉ DU SERVEUR (`gardien`, 27 septembre 2026, B4). Le code d'une suppression et
     l'avis qui la suit partent à la boîte de TEAM OP — que cette Messagerie relève. Une session de la Tour
     volée lisait le code qu'on lui demandait, puis supprimait l'avis qui l'aurait dénoncée. Ils restent
     LISIBLES (c'est le patron qu'ils préviennent, et il lit peut-être sa boîte ici), mais la Tour ne les
     déplace plus, ne les supprime plus, ne les marque plus — ni « lu » en les ouvrant — et ne les annonce
     pas en notification. Le serveur les reconnaît à leur identifiant (`mailProtege`, server/index.js),
     tiré au sort à l'envoi : rien qu'un expéditeur du dehors puisse imiter. */
  const protege = typeof mailProtege === 'function' ? mailProtege : () => false;
  /* Le crochet des agents (Camille) : chaque message neuf, « vrai » et non protégé de la Réception lui est annoncé. SANS ATTENDRE et sans
     jamais casser la veille : un agent qui jette ou qui se fige ne retarde ni la notification de la Tour, ni la boîte suivante. */
  const surNouveauMessage = typeof ctx.surNouveauMessage === 'function' ? ctx.surNouveauMessage : null;
  /* Les serveurs de RÉCEPTION dont l'en-tête Authentication-Results fait foi (`config.agents.authservIds`, branché par `index.js`). Sans réglage : AUCUN — voir `authentification`. */
  const authservIds = typeof ctx.authservIds === 'function' ? ctx.authservIds : (() => []);
  const REFUS_PROTEGE = 'E-mail de sécurité (code ou avis d\'une suppression) : la Tour ne le déplace pas, ne le supprime pas, ne le marque pas. Fais-le depuis ta messagerie habituelle.';
  const erreurProtege = () => Object.assign(new Error('protege'), { protege: true });
  async function verifierNonProtege(client, uid) {   // à appeler DANS la boîte ouverte, avant d'agir sur un message
    const m = await client.fetchOne(String(uid), { uid: true, envelope: true }, { uid: true });
    if (m && m.envelope && protege(m.envelope.messageId)) throw erreurProtege();
  }
  const envoiQuota = new Map();   // 'u:<compte>' -> { n, reset } (le format de `quotaOk`)
  const agentsQuota = new Map();  // budget d'envoi des agents : une seule clé, 'agents'
  const brouillonQuota = new Map();   // même forme, budget à part : écrire des brouillons ne doit pas manger les envois
  const BOITES_PATH = path.join(DATA_DIR, 'mail-boites.json');
  const SUIVI_PATH = path.join(DATA_DIR, 'mail-suivi.json');
  const REGLAGES_PATH = path.join(DATA_DIR, 'mail-reglages.json');
  const VU_PATH = path.join(DATA_DIR, 'mail-vu.json');

  /* ── suivi des demandes : un état par conversation, repéré par l'identifiant du message ── */
  let suivi = {};   // mid -> { statut:'aTraiter'|'enCours'|'resolu', assigne, par, ts, recuTs, repTs, de, objet }
  try { suivi = JSON.parse(fs.readFileSync(SUIVI_PATH, 'utf8')) || {}; } catch (e) {}
  let tSuivi = null;
  function suiviSauve() {
    clearTimeout(tSuivi);
    tSuivi = setTimeout(() => {
      try {
        const cles = Object.keys(suivi);
        if (cles.length > 3000) {   // on garde les 3000 plus récents
          const gardes = cles.map(k => [k, suivi[k].ts || suivi[k].recuTs || 0]).sort((a, b) => b[1] - a[1]).slice(0, 3000);
          const neuf = {}; gardes.forEach(([k]) => { neuf[k] = suivi[k]; }); suivi = neuf;
        }
        fs.writeFileSync(SUIVI_PATH, JSON.stringify(suivi));
      } catch (e) { console.error('mail suivi:', e.message); }
    }, 500);
  }

  /* ── réglages partagés : signature et réponses toutes prêtes ── */
  const MODELES_DEFAUT = [
    { id: 'm1', titre: '✅ Nous avons corrigé', objet: '', texte: 'Bonjour {prenom},\n\nNous avons corrigé le problème que vous nous avez signalé. Votre application est déjà à jour : vous n\'avez rien à faire de votre côté.\n\nN\'hésitez pas à nous écrire si quelque chose vous semble encore anormal.' },
    { id: 'm2', titre: '👀 Nous regardons', objet: '', texte: 'Bonjour {prenom},\n\nMerci pour votre message, nous prenons votre demande en compte. Nous regardons cela et nous revenons vers vous très vite.' },
    { id: 'm3', titre: '📄 Votre facture', objet: 'Votre facture — {entreprise}', texte: 'Bonjour {prenom},\n\nVous trouverez votre facture dans votre espace client, rubrique « Mes documents » : https://teamop.fr/espace.html\n\nBonne journée,' },
    { id: 'm4', titre: '💡 Comment faire', objet: '', texte: 'Bonjour {prenom},\n\nVoici comment procéder :\n\n1. \n2. \n3. \n\nDites-moi si cela fonctionne de votre côté.' },
    { id: 'm5', titre: '🎁 Offre 3 mois', objet: 'Votre offre — 3 mois offerts', texte: 'Bonjour {prenom},\n\nComme convenu, votre code {promo} vous offre 3 mois d\'abonnement. Il s\'applique directement au moment du paiement.\n\nBonne découverte de {formule} !' }
  ];
  /* `regles` : adresse exacte ou domaine (« @exemple.fr ») -> 'gestion' | 'messages', posées à la main depuis la Tour.
     Sans prototype : une clé vient d'un champ de formulaire, et rien ne doit pouvoir y glisser un « __proto__ ». */
  function regleAdresse(v) {
    if (typeof v !== 'string') return '';
    let a = v.trim().toLowerCase();
    if (a.length > 200) return '';
    const m = /<([^<>]+)>\s*$/.exec(a); if (m) a = m[1].trim();
    if (a.length > 160) return '';
    if (/^[^@\s,;<>"'()[\]]+@[^@\s,;<>"'()[\]]+\.[^@\s,;<>"'()[\]]+$/.test(a)) return a;     // une adresse
    if (/^@[^@\s,;<>"'()[\]]+\.[^@\s,;<>"'()[\]]+$/.test(a)) return a;                       // tout un domaine
    return '';
  }
  function reglesLues(r) {
    const out = Object.create(null);
    if (r && typeof r === 'object' && !Array.isArray(r)) {
      for (const k of Object.keys(r)) { const a = regleAdresse(k); if (a === k && (r[k] === 'gestion' || r[k] === 'messages') && Object.keys(out).length < MAX_REGLES) out[k] = r[k]; }
    }
    return out;
  }
  let reglages = { signature: 'L\'équipe TEAM OP\nsupport@teamop.fr · teamop.fr', modeles: MODELES_DEFAUT, regles: Object.create(null) };
  try {
    const r = JSON.parse(fs.readFileSync(REGLAGES_PATH, 'utf8'));
    if (r && typeof r === 'object') reglages = { signature: String(r.signature || reglages.signature), modeles: Array.isArray(r.modeles) && r.modeles.length ? r.modeles : MODELES_DEFAUT, regles: reglesLues(r.regles) };
  } catch (e) {}
  function reglagesSauve() { try { fs.writeFileSync(REGLAGES_PATH, JSON.stringify(reglages)); } catch (e) { console.error('mail reglages:', e.message); } }

  /* ── tri automatique : un vrai client ou une notification de service ? ── */
  const EXP_AUTO = /(^|[.@])(noreply|no-reply|donotreply|ne-pas-repondre|notifications?|mailer|postmaster|bounce|alerte?s?|info|newsletter)([.@]|$)/i;
  const DOM_AUTO = /(stripe|inpi|ovh|ionos|google|github|apple|microsoft|paypal|urssaf|impots|gouv|sendgrid|mailchimp|zimbra)\./i;
  function estNotification(de, objet) {
    const a = String(de || '').toLowerCase();
    if (EXP_AUTO.test(a) || DOM_AUTO.test(a)) return true;
    if (/^(🐛|\[alerte\]|automatic|automated)/i.test(String(objet || ''))) return true;
    return false;
  }

  /* ── dernier message vu par boîte (pour la veille et les notifications) ── */
  let vus = {};
  try { vus = JSON.parse(fs.readFileSync(VU_PATH, 'utf8')) || {}; } catch (e) {}
  function vusSauve() { try { fs.writeFileSync(VU_PATH, JSON.stringify(vus)); } catch (e) {} }

  /* ── les boîtes connectées ─────────────────────────────────────────────── */
  let boites = [];   // [{ id, email, pass, imapHost, imapPort, smtpHost, smtpPort, nom, ts, par }]
  /* ⛔ Les mots de passe sont chiffrés sur le disque (`coffre-boites.js`) : lus ici en clair, rechiffrés par `sauve`. L'ancienne boîte
     support se lit par la même porte — son fichier peut déjà être chiffré par `index.js`, et recopier son chiffré comme mot de passe
     tuerait la boîte. */
  boites = coffreBoites.lire(BOITES_PATH, []) || [];
  if (!Array.isArray(boites)) boites = [];
  // reprise de l'ancienne boîte support unique, pour ne rien perdre
  try {
    const anc = coffreBoites.lire(path.join(DATA_DIR, 'support-box.json'), null);
    if (anc && anc.email && !boites.some(b => b.email.toLowerCase() === String(anc.email).toLowerCase())) {
      boites.push({ id: 'b' + crypto.randomBytes(4).toString('hex'), email: anc.email, pass: anc.pass,
        imapHost: anc.imapHost || 'imap.mail.ovh.net', imapPort: anc.imapPort || 993,
        smtpHost: anc.smtpHost || 'smtp.mail.ovh.net', smtpPort: anc.smtpPort || 465,
        nom: 'TEAM OP', ts: anc.ts || Date.now(), par: 'reprise' });
      sauve();
    }
  } catch (e) {}
  function sauve() { return coffreBoites.ecrire(BOITES_PATH, boites); }   // temporaire + renommage, mots de passe chiffrés
  function publique(b) { return { id: b.id, email: b.email, nom: b.nom || '', imapHost: b.imapHost, smtpHost: b.smtpHost, ts: b.ts || 0, par: b.par || '' }; }
  function trouve(id) { return boites.find(b => b.id === String(id || '')) || null; }

  /* ── connexions IMAP : une à la fois par boîte, refermée après usage ──── */
  const filesAttente = new Map();
  function enFile(id, tache) {
    const prec = filesAttente.get(id) || Promise.resolve();
    const suite = prec.then(tache, tache);
    filesAttente.set(id, suite.catch(() => {}));
    return suite;
  }
  async function avecImap(b, tache) {
    return enFile(b.id, async () => {
      const { ImapFlow } = require('imapflow');
      const client = new ImapFlow({ host: b.imapHost, port: b.imapPort || 993, secure: true,
        auth: { user: b.email, pass: b.pass }, logger: false, emitLogs: false });
      client.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
      try {
        await client.connect();
        return await tache(client);
      } finally { try { await client.logout(); } catch (_) { try { client.close(); } catch (__) {} } }
    });
  }

  /* ── dossiers : rôles spéciaux reconnus (Envoyés, Brouillons, Corbeille…) ── */
  const ROLES = { '\\Sent': 'envoyes', '\\Drafts': 'brouillons', '\\Trash': 'corbeille', '\\Junk': 'indesirables', '\\Archive': 'archives' };
  const NOMS = { inbox: 'Réception', envoyes: 'Envoyés', brouillons: 'Brouillons', corbeille: 'Corbeille', indesirables: 'Indésirables', archives: 'Archives' };
  function roleDe(item) {
    if (item.specialUse && ROLES[item.specialUse]) return ROLES[item.specialUse];
    const p = String(item.path || '').toLowerCase();
    if (p === 'inbox') return 'inbox';
    if (/sent|envoy/.test(p)) return 'envoyes';
    if (/draft|brouillon/.test(p)) return 'brouillons';
    if (/trash|corbeille|deleted/.test(p)) return 'corbeille';
    if (/junk|spam|ind[eé]sirable/.test(p)) return 'indesirables';
    if (/archive/.test(p)) return 'archives';
    return '';
  }
  const cacheDossiers = new Map();   // id boîte -> { ts, liste }
  async function dossiersDe(b, frais) {
    const c = cacheDossiers.get(b.id);
    if (!frais && c && Date.now() - c.ts < 120000) return c.liste;
    const liste = await avecImap(b, async client => {
      const out = [];
      for (const item of await client.list()) {
        if (item.flags && item.flags.has && item.flags.has('\\Noselect')) continue;
        const role = roleDe(item);
        out.push({ chemin: item.path, nom: NOMS[role] || item.name || item.path, role: role });
      }
      // Réception d'abord, puis les dossiers spéciaux dans l'ordre habituel
      const ordre = ['inbox', 'envoyes', 'brouillons', 'archives', 'indesirables', 'corbeille'];
      out.sort((x, y) => {
        const a = ordre.indexOf(x.role), z = ordre.indexOf(y.role);
        if (a !== z) return (a < 0 ? 99 : a) - (z < 0 ? 99 : z);
        return String(x.nom).localeCompare(String(y.nom), 'fr');
      });
      return out;
    });
    cacheDossiers.set(b.id, { ts: Date.now(), liste });
    return liste;
  }
  /* Les non-lus de CHAQUE dossier (IMAP STATUS UNSEEN) — la Réception seule ne dit pas qu'un message attend dans les
     Indésirables. Un compteur par dossier, `null` quand le serveur n'a pas su répondre : « on n'a pas pu savoir » n'est
     pas « zéro » (la règle de `_mailboxes`, côté Tour). Gardé 20 s, et oublié à chaque geste qui le change. */
  const cacheNonLus = new Map();   // id boîte -> { ts, par: { chemin: n | null } }
  function nonLusOublier(id) { cacheNonLus.delete(id); }
  async function nonLusDe(b, liste, frais) {
    const c = cacheNonLus.get(b.id);
    if (!frais && c && Date.now() - c.ts < NON_LUS_MS) return c.par;
    let par;
    try {
      par = await avecImap(b, async client => {
        const out = {};
        for (const d of liste) {
          try { const st = await client.status(d.chemin, { unseen: true }); out[d.chemin] = (st && Number.isFinite(st.unseen)) ? st.unseen : null; }
          catch (e) { out[d.chemin] = null; }
        }
        return out;
      });
    } catch (e) {
      if (c) return c.par;   // la boîte ne répond pas : le dernier chiffre connu vaut mieux qu'un faux zéro
      par = {}; liste.forEach(d => { par[d.chemin] = null; });
      return par;            // et on ne le garde pas : la prochaine demande réessaie
    }
    cacheNonLus.set(b.id, { ts: Date.now(), par });
    return par;
  }
  async function cheminRole(b, role) {
    const d = (await dossiersDe(b)).find(x => x.role === role);
    return d ? d.chemin : null;
  }

  /* ── petits utilitaires ────────────────────────────────────────────────── */
  function pers(list) { return (list || []).map(a => ({ nom: String(a.name || '').slice(0, 80), adr: String(a.address || '').slice(0, 160) })); }
  function adr1(list) { const p = pers(list)[0] || {}; return { nom: p.nom || '', adr: (p.adr || '').toLowerCase() }; }
  function comptePieces(struct) {
    let n = 0;
    (function marche(p) {
      if (!p) return;
      if (Array.isArray(p.childNodes)) p.childNodes.forEach(marche);
      const d = p.disposition && String(p.disposition).toLowerCase();
      const nom = (p.dispositionParameters && p.dispositionParameters.filename) || (p.parameters && p.parameters.name);
      if ((d === 'attachment' || (nom && d !== 'inline')) && p.part) n++;
    })(struct);
    return n;
  }
  function htmlEnTexte(h) {
    if (!h) return '';
    return String(h).replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<head[\s\S]*?<\/head>/gi, ' ').replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|div|tr|li|h[1-6]|table)>/gi, '\n').replace(/<li[^>]*>/gi, '• ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&[a-z#0-9]{2,8};/gi, ' ')
      .replace(/[ \t ]+/g, ' ').replace(/ ?\n ?/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /* ── le tri par console ────────────────────────────────────────────────── */
  function appelle(f, a) { try { return !!f(a); } catch (e) { return false; } }   // une question qui échoue ne range pas : l'adresse reste à trier
  function consoleDeAdresse(adr) {
    const a = String(adr || '').trim().toLowerCase();
    if (!a || a.indexOf('@') < 1) return 'atrier';
    const r = reglages.regles[a] || reglages.regles['@' + a.slice(a.lastIndexOf('@') + 1)];   // l'adresse exacte passe avant son domaine
    if (r === 'gestion' || r === 'messages') return r;
    if (appelle(connueGestion, a)) return 'gestion';
    if (appelle(connueMessages, a)) return 'messages';
    return 'atrier';
  }
  /* L'interlocuteur : celui à qui l'on a affaire. Un message ENVOYÉ (dossier Envoyés ou Brouillons, ou écrit de
     l'adresse même de la boîte) a pour interlocuteur son premier destinataire ; un message REÇU, son expéditeur.
     Se fier au seul dossier rangerait mal un message d'un alias, se fier au seul expéditeur un brouillon. */
  function interlocuteurDe(b, role, de, pour, copie) {
    const envoye = role === 'envoyes' || role === 'brouillons' || (!!de && de === String(b.email || '').toLowerCase());
    if (envoye) return String((pour[0] && pour[0].adr) || (copie[0] && copie[0].adr) || '').toLowerCase();
    return String(de || '').toLowerCase();
  }
  /* Le rôle d'un dossier se lit AVANT d'ouvrir la boîte : `dossiersDe` passe par la file de la boîte, et l'appeler
     depuis une tâche de cette file l'attendrait elle-même, pour toujours. */
  async function roleDuChemin(b, chemin) {
    try { const d = (await dossiersDe(b)).find(x => x.chemin === chemin); if (d) return d.role; } catch (e) {}
    return roleDe({ path: chemin });
  }

  /* ═════════════════════ LES BOÎTES ═════════════════════ */
  app.get('/api/monitor/mail/boites', monAdmin, (req, res) => res.json({ boites: boites.map(publique) }));

  app.post('/api/monitor/mail/boites', monPatronStrict, async (req, res) => {
    const { email, pass, imapHost, imapPort, smtpHost, smtpPort, nom } = req.body || {};
    const adr = monStr(email, 160).trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(adr)) return res.status(400).json({ error: 'adresse invalide' });
    if (!pass) return res.status(400).json({ error: 'mot de passe requis' });
    if (boites.length >= 10 && !boites.some(b => b.email === adr)) return res.status(400).json({ error: '10 boîtes au maximum' });
    const b = { id: 'b' + crypto.randomBytes(4).toString('hex'), email: adr, pass: String(pass).slice(0, 200),
      imapHost: monStr(imapHost, 100) || 'imap.mail.ovh.net', imapPort: parseInt(imapPort, 10) || 993,
      smtpHost: monStr(smtpHost, 100) || 'smtp.mail.ovh.net', smtpPort: parseInt(smtpPort, 10) || 465,
      nom: monStr(nom, 60) || 'TEAM OP', ts: Date.now(), par: req.tourUser.nom };
    try {
      const nodemailer = require('nodemailer');
      await nodemailer.createTransport({ host: b.smtpHost, port: b.smtpPort, secure: b.smtpPort === 465,
        auth: { user: b.email, pass: b.pass }, connectionTimeout: 9000, greetingTimeout: 9000 }).verify();
    } catch (e) { return res.status(400).json({ error: "Connexion d'envoi (SMTP) refusée : " + sansAdr(String(e.message || e)).slice(0, 140) }); }
    try {
      const { ImapFlow } = require('imapflow');
      const c = new ImapFlow({ host: b.imapHost, port: b.imapPort, secure: true, auth: { user: b.email, pass: b.pass }, logger: false });
      c.on('error', () => {});   // une erreur émise en événement tuerait le processus : on l'absorbe, l'échec est déjà traité par le try/catch
      await c.connect(); await c.logout();
    } catch (e) { return res.status(400).json({ error: 'Connexion de réception (IMAP) refusée : ' + sansAdr(String(e.message || e)).slice(0, 140) }); }
    const i = boites.findIndex(x => x.email === adr);
    if (i >= 0) { b.id = boites[i].id; boites[i] = b; } else boites.push(b);
    cacheDossiers.delete(b.id); sauve();
    res.json({ ok: true, boite: publique(b) });
  });

  app.post('/api/monitor/mail/boites/retirer', monPatronStrict, (req, res) => {
    const i = boites.findIndex(b => b.id === (req.body || {}).id);
    if (i < 0) return res.status(404).json({ error: 'boîte introuvable' });
    const email = boites[i].email;
    cacheDossiers.delete(boites[i].id);
    boites.splice(i, 1); sauve();
    res.json({ ok: true, email });
  });

  /* ═════════════════════ DOSSIERS ═════════════════════ */
  app.get('/api/monitor/mail/dossiers', monAdmin, async (req, res) => {
    const out = [];
    const frais = String(req.query.frais || '') === '1';
    for (const b of boites) {
      try {
        const base = await dossiersDe(b, frais);
        const par = await nonLusDe(b, base, frais);
        // chaque dossier porte SON compteur ; `nonLus` de la boîte reste celui de la Réception (la Tour d'avant le lit)
        const liste = base.map(d => Object.assign({}, d, { nonLus: Number.isFinite(par[d.chemin]) ? par[d.chemin] : null }));
        const ib = liste.find(x => x.role === 'inbox');
        const nonLus = ib && Number.isFinite(ib.nonLus) ? ib.nonLus : 0;
        out.push({ boite: publique(b), dossiers: liste, nonLus });
      } catch (e) {
        out.push({ boite: publique(b), dossiers: [], nonLus: 0, erreur: sansAdr(String(e.message || e)).slice(0, 140) });
      }
    }
    res.json({ boites: out });
  });

  /* ═════════════════════ LISTE DES MESSAGES ═════════════════════ */
  const CHAMPS_LISTE = { uid: true, envelope: true, flags: true, bodyStructure: true, size: true };
  function ligneDe(b, chemin, role, m) {
    const env = m.envelope || {};
    const de = adr1(env.from), pour = pers(env.to), copie = pers(env.cc);
    const fl = m.flags || new Set();
    const interlocuteur = interlocuteurDe(b, role, de.adr, pour, copie);
    return { uid: m.uid, dossier: chemin, boite: b.id,
      de: de.adr, deNom: de.nom, pour: pour.map(p => p.adr).slice(0, 5),
      interlocuteur, console: consoleDeAdresse(interlocuteur),
      objet: String(env.subject || '(sans objet)').slice(0, 200),
      ts: env.date ? new Date(env.date).getTime() : 0,
      lu: fl.has ? fl.has('\\Seen') : false, marque: fl.has ? fl.has('\\Flagged') : false,
      repondu: fl.has ? fl.has('\\Answered') : false,
      pieces: comptePieces(m.bodyStructure), taille: m.size || 0,
      mid: String(env.messageId || '').slice(0, 300),
      protege: protege(env.messageId),
      auto: estNotification(de.adr, env.subject),
      suivi: (function () { const sv = suivi[String(env.messageId || '')]; return sv ? Object.assign({ statut: sv.statut, assigne: sv.assigne || '' }, estClasse(sv) ? { classe: sv.classe } : {}) : null; })() };
  }
  /* `filtre` ('gestion' | 'messages' | '') : la console qu'on regarde. Elle voit ses messages ET ceux à trier, jamais
     ceux de l'autre. Le rôle d'un message ne se connaît qu'une fois l'enveloppe lue : filtrer APRÈS avoir découpé
     la page rendrait des pages de tailles inégales et un total faux. On examine donc les `MAX_TRI` plus récents du
     dossier, on garde ceux de la console, et c'est cette liste qu'on pagine — `tronque` dit quand le dossier est
     plus long que la fenêtre. */
  async function listeDe(b, dossier, page, q, filtre) {
    const chemin = dossier || 'INBOX';
    const role = await roleDuChemin(b, chemin);
    return avecImap(b, async client => {
      const lock = await client.getMailboxLock(chemin);
      try {
        let uids;
        if (q) {
          const t = String(q).slice(0, 120);
          uids = await client.search({ or: [{ subject: t }, { from: t }, { to: t }, { body: t }] }, { uid: true });
        } else {
          uids = await client.search({ all: true }, { uid: true });
        }
        uids = (uids || []).sort((x, y) => y - x);
        const messages = [];
        let total = uids.length, tronque = false;
        if (!filtre) {
          const tranche = uids.slice(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE);
          if (tranche.length) {
            for await (const m of client.fetch({ uid: tranche.join(',') }, CHAMPS_LISTE, { uid: true })) messages.push(ligneDe(b, chemin, role, m));
          }
        } else {
          const fenetre = uids.slice(0, MAX_TRI);
          tronque = uids.length > fenetre.length;
          const gardes = [];
          for (let i = 0; i < fenetre.length; i += 150) {
            const lot = fenetre.slice(i, i + 150);
            for await (const m of client.fetch({ uid: lot.join(',') }, CHAMPS_LISTE, { uid: true })) {
              const l = ligneDe(b, chemin, role, m);
              if (l.console === filtre || l.console === 'atrier') gardes.push(l);
            }
          }
          gardes.sort((x, y) => y.uid - x.uid);
          total = gardes.length;
          messages.push.apply(messages, gardes.slice(page * PAR_PAGE, page * PAR_PAGE + PAR_PAGE));
        }
        messages.sort((x, y) => (y.ts || 0) - (x.ts || 0));
        const out = { messages, total, page, pages: Math.max(1, Math.ceil(total / PAR_PAGE)) };
        if (filtre) { out.console = filtre; out.tronque = tronque; }
        return out;
      } finally { lock.release(); }
    });
  }

  app.get('/api/monitor/mail/liste', monAdmin, async (req, res) => {
    const page = Math.max(0, Math.min(200, parseInt(req.query.page, 10) || 0));
    const q = monStr(req.query.q, 120).trim();
    const demande = monStr(req.query.console, 12).trim().toLowerCase();
    if (demande && demande !== 'gestion' && demande !== 'messages') return res.status(400).json({ error: 'console inconnue (gestion ou messages)' });
    const filtre = demande;
    // vue « toutes les boîtes » : les réceptions fusionnées
    if (!req.query.boite || req.query.boite === 'toutes') {
      let messages = [], total = 0; const erreurs = [];
      for (const b of boites) {
        try {
          const inbox = (await cheminRole(b, 'inbox')) || 'INBOX';
          const r = await listeDe(b, inbox, page, q, filtre);
          messages = messages.concat(r.messages); total += r.total;
        } catch (e) { erreurs.push(masque(b.email) + ' : ' + sansAdr(String(e.message || e)).slice(0, 100)); }
      }
      messages.sort((x, y) => (y.ts || 0) - (x.ts || 0));
      const out = { messages: messages.slice(0, PAR_PAGE * 2), total, page, pages: Math.max(1, Math.ceil(total / PAR_PAGE)), fusion: true, erreurs };
      if (filtre) out.console = filtre;
      return res.json(out);
    }
    const b = trouve(req.query.boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    try {
      const chemin = monStr(req.query.dossier, 200) || (await cheminRole(b, 'inbox')) || 'INBOX';
      res.json(await listeDe(b, chemin, page, q, filtre));
    } catch (e) { res.status(502).json({ error: 'boîte injoignable : ' + sansAdr(String(e.message || e)).slice(0, 140) }); }
  });

  /* ═════════════════════ LECTURE D'UN MESSAGE ═════════════════════ */
  /* UNE lecture, deux appelants : la route (qui MARQUE lu et crée le suivi, comme dans une vraie messagerie) et `lireMessage` (les agents), qui
     ne touche à rien — un agent qui lit pour préparer un brouillon ne doit ni effacer la pastille « non lu » de la Tour, ni ouvrir un suivi
     que Justin n'a pas ouvert. `marquer` est le seul interrupteur : une seconde copie du corps divergerait au premier champ ajouté. */
  async function lireMessageDe(b, chemin, uid, marquer) {
    const role = await roleDuChemin(b, chemin);   // avant d'ouvrir la boîte : voir `roleDuChemin`
    return avecImap(b, async client => {
      const lock = await client.getMailboxLock(chemin);
      try {
        const msg = await client.fetchOne(String(uid), { uid: true, envelope: true, flags: true, source: { maxLength: 4000000 } }, { uid: true });
        if (!msg) return null;
        const { simpleParser } = require('mailparser');
        let p = {};
        try { p = await simpleParser(msg.source); } catch (e) {}
        const env = msg.envelope || {};
        const de = adr1(env.from);
        const texte = String(p.text || '').trim() || htmlEnTexte(typeof p.html === 'string' ? p.html : '');
        const pieces = (p.attachments || []).map((a, i) => ({ idx: i, nom: String(a.filename || 'piece-' + (i + 1)).slice(0, 140), taille: a.size || 0, type: String(a.contentType || '').slice(0, 80) }))
          .filter(a => a.nom).slice(0, MAX_PIECES);
        // à l'ouverture, le message est marqué lu (comme dans une vraie messagerie) — sauf un e-mail de sécurité
        const estProtege = protege(env.messageId);
        if (marquer && !estProtege && !(msg.flags && msg.flags.has && msg.flags.has('\\Seen'))) { try { await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true }); nonLusOublier(b.id); } catch (_) {} }
        const midCle = String(env.messageId || '');
        if (marquer && !estProtege && midCle && !suivi[midCle] && role === 'inbox') {
          const deAdr = de.adr;
          suivi[midCle] = { statut: estNotification(deAdr, env.subject) ? 'resolu' : 'aTraiter', assigne: '', par: '',
            /* l'en-tête Date: vient de l'EXPÉDITEUR : une date dans le futur se borne à l'heure où le serveur voit le message (relecture du 22 octobre 2026) */
            ts: Date.now(), recuTs: Math.min((env.date && new Date(env.date).getTime()) || Date.now(), Date.now()), repTs: 0,
            de: deAdr, objet: String(env.subject || '').slice(0, 160), auto: estNotification(deAdr, env.subject) ? 1 : 0 };
          suiviSauve();
        }
        const pour = pers(env.to), copie = pers(env.cc);
        const interlocuteur = interlocuteurDe(b, role, de.adr, pour, copie);
        /* Pour les AGENTS seulement (la route de la Tour ne les rend pas) : l'expéditeur est-il authentifié par NOTRE serveur de réception, le message est-il automatique,
           et à quel message répond-il (In-Reply-To / References). */
        const extras = marquer ? {} : (() => {
          let serveurs = []; try { serveurs = (authservIds() || []).slice(); } catch (e) {}   // le SEUL réglage : `config.agents.authservIds` (aucun repli — voir `authentification`)
          const au = authentification(p.headerLines, de.adr, serveurs);
          const refs = [].concat(p.inReplyTo || [], p.references || []).map(x => String(x).slice(0, 300)).slice(0, 20);
          return { authentifie: au.ok === true, authPar: au.ok ? au.par : '', authRaison: au.ok ? '' : au.raison, enteteAuto: enteteAutomatique(p.headers), enReponseDe: refs };
        })();
        return Object.assign({ uid, dossier: chemin, boite: b.id, boiteEmail: b.email,
          suivi: suivi[midCle] ? Object.assign({ statut: suivi[midCle].statut, assigne: suivi[midCle].assigne || '' }, estClasse(suivi[midCle]) ? { classe: suivi[midCle].classe } : {}) : null,
          auto: estNotification(de.adr, env.subject),
          interlocuteur, console: consoleDeAdresse(interlocuteur),
          de: de.adr, deNom: de.nom, pour, copie,
          objet: String(env.subject || '(sans objet)').slice(0, 300),
          ts: env.date ? new Date(env.date).getTime() : 0,
          texte: texte.slice(0, 40000), html: (typeof p.html === 'string' ? p.html : '').slice(0, 400000),
          pieces, mid: String(env.messageId || '').slice(0, 300), protege: estProtege,
          marque: msg.flags && msg.flags.has ? msg.flags.has('\\Flagged') : false }, extras);
      } finally { lock.release(); }
    });
  }
  app.get('/api/monitor/mail/message', monAdmin, async (req, res) => {
    const b = trouve(req.query.boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    const chemin = monStr(req.query.dossier, 200) || 'INBOX';
    const uid = parseInt(req.query.uid, 10);
    if (!uid) return res.status(400).json({ error: 'message introuvable' });
    try {
      const out = await lireMessageDe(b, chemin, uid, true);
      if (!out) return res.status(404).json({ error: 'message introuvable' });
      res.json(out);
    } catch (e) { res.status(502).json({ error: 'lecture impossible : ' + sansAdr(String(e.message || e)).slice(0, 140) }); }
  });
  /* Pour les agents : le même corps, SANS marquer lu et SANS créer de suivi. `null` : boîte ou message introuvable ; une panne IMAP jette. */
  async function lireMessage(boiteId, dossier, uid) {
    const b = trouve(boiteId);
    const n = parseInt(uid, 10);
    if (!b || !n || !boiteAgentOk(b)) return null;   // controle@ : jamais lue par un agent
    return lireMessageDe(b, String(dossier || '') || 'INBOX', n, false);
  }

  /* ═════════════════════ L'ARRIÉRÉ, POUR CAMILLE (28 octobre 2026) ═════════════════════
     Justin : « il faut qu'elle puisse voir les anciens ». La veille ne lui annonce que les messages NON LUS et NEUFS : un courriel que Justin a ouvert dans la Tour (donc lu, et
     inscrit « à traiter » au suivi) ou arrivé avant qu'elle soit allumée ne lui parvenait JAMAIS — les « 35 à traiter » de Victor. On liste ici, dans les SEULES boîtes qu'un agent
     peut lire (`boiteAgentOk`), les messages reçus depuis `jours` jours, LUS OU NON, sauf : un e-mail de sécurité, une notification automatique, un message déjà répondu (drapeau
     \Answered, ou suivi « résolu », ou une réponse notée), une ligne de suivi déjà prise par quelqu'un (`assigne`). Trois identifiants par message, jamais son texte ; le plus ancien
     d'abord ; au plus `ARRIERE_MAX`. Rien n'est marqué lu ici. */
  const ARRIERE_MAX = 200, ARRIERE_LUS = 1000;
  /* une ligne du suivi est LIBRE tant que personne ne l'a prise ni n'y a répondu, et qu'elle n'est pas résolue — relu juste avant chaque reprise */
  const suiviLibre = mid => { const sv = suivi[String(mid || '')]; return !sv || !(sv.statut === 'resolu' || sv.repTs > 0 || sv.assigne); };
  /* (28 octobre 2026) UN courriel que Camille a LU et qui n'appelle aucune réponse (publicité, lettre d'information, message automatique, message de chez nous, expéditeur illisible) ne compte
     plus « à traiter » : « personne dessus » était faux, quelqu'un l'avait regardé. Mais « résolu » est définitif et une catégorie mal posée ferait disparaître un vrai message (gardien) :
     la ligne devient « en cours » chez Camille avec une RAISON tirée d'une liste fermée (`classe`). La Tour en service ne lit que statut, assigne et par — elle montre « En cours · Camille »,
     le message reste dans la Réception ; seuls les décomptes (`compter`, `/stats`) distinguent un classement d'un vrai travail en cours. Un humain qui touche la ligne efface la raison. */
  const CLASSES = ['ignore', 'automatique', 'interne'];
  const estClasse = sv => !!sv && sv.statut === 'enCours' && sv.par === 'Camille' && CLASSES.includes(sv.classe) && !(sv.repTs > 0);
  async function arriere(jours, opts) {
    /* `opts.ecarter(x)` : l'appelant dit « celui-là, je l'ai déjà décidé » — il ne compte pas dans les 200 de la file (les décidés sans ligne de suivi en tête de file cachaient tous les
       plus récents) et sa lecture complète n'est pas refaite ; la liste rendue les porte à part (`ecartes`), pour que l'appelant range ce qui doit l'être. */
    const ecarter = opts && typeof opts.ecarter === 'function' ? opts.ecarter : null;
    /* (28 octobre 2026, Justin : « sans limite ») toute la boîte par défaut ; `jours` borne seulement si on le demande */
    const j = Math.min(Math.max(parseInt(jours, 10) || 3650, 1), 3650), depuis = new Date(Date.now() - j * 86400000);
    const out = [], ecartes = []; let tronque = false;
    for (const b of boites) {
      if (!boiteAgentOk(b)) continue;
      try {
        const inbox = (await cheminRole(b, 'inbox')) || 'INBOX';
        const lus = await avecImap(b, async client => {
          const lock = await client.getMailboxLock(inbox);
          try {
            let uids = ((await client.search({ since: depuis }, { uid: true })) || []).slice().sort((x, y) => x - y);
            if (!uids.length) return [];
            /* (gardien) on FILTRE puis on borne — prendre les 200 derniers UID avant le filtre perdait les plus anciens non traités. Au plus ARRIERE_LUS en-têtes lus par boîte, par
               paquets de 200, le plus ancien d'abord ; au-delà, on le DIT (tronque). */
            if (uids.length > ARRIERE_LUS) { uids = uids.slice(-ARRIERE_LUS); tronque = true; }
            const l = [];
            for (let k = 0; k < uids.length && l.length < ARRIERE_MAX; k += 200) {
              for await (const m of client.fetch({ uid: uids.slice(k, k + 200).join(',') }, { uid: true, envelope: true, flags: true }, { uid: true })) {
                const env = m.envelope || {}, de = adr1(env.from), mid = String(env.messageId || '');
                if (protege(env.messageId) || estNotification(de.adr, env.subject)) continue;
                if (m.flags && m.flags.has && m.flags.has('\\Answered')) continue;
                if (mid && !suiviLibre(mid)) continue;
                const x = { boiteId: b.id, dossier: inbox, uid: m.uid, mid, ts: Math.min((env.date && new Date(env.date).getTime()) || Date.now(), Date.now()) };
                let decide = false; try { decide = !!(ecarter && ecarter(x)); } catch (e) { decide = false; }
                if (decide) { if (mid) ecartes.push({ mid, ts: x.ts }); continue; }
                l.push(x);
              }
            }
            return l;
          } finally { lock.release(); }
        });
        for (const x of (lus || [])) out.push(x);
      } catch (e) { /* boîte injoignable : elle sera reprise au prochain passage */ }
    }
    /* la même lettre dans deux boîtes (contact@ ET support@) : une seule ligne */
    const vus = new Set();
    const l = out.sort((x, y) => x.ts - y.ts).filter(x => { if (!x.mid) return true; if (vus.has(x.mid)) return false; vus.add(x.mid); return true; });
    const r = l.slice(0, ARRIERE_MAX); r.tronque = tronque || l.length > ARRIERE_MAX;
    r.ecartes = ecartes;
    return r;
  }
  /* Ce que Camille a décidé d'un courriel s'écrit au SUIVI du Courrier : sans ça, son travail ne faisait jamais baisser « à traiter » (Victor voyait 35 et croyait que personne n'y était).
     Un statut de la liste, un nom de la liste ; une ligne neuve porte l'expéditeur et l'objet (ce que le Courrier affiche déjà). Une ligne « résolue » ne redescend jamais. */
  const SUIVI_PAR = ['Camille', 'Justin'];
  function suiviMarquer(mid, o) {
    mid = String(mid || '').slice(0, 300); o = o || {};
    if (!mid || !['enCours', 'resolu'].includes(o.statut)) return false;
    const sv = suivi[mid] || (suivi[mid] = { statut: 'aTraiter', assigne: '', par: '', ts: Date.now(), recuTs: Math.min(Number(o.recuTs) || Date.now(), Date.now()), repTs: 0,
      de: monStr(o.de, 160), objet: monStr(o.objet, 160) });
    if (sv.statut === 'resolu') return true;
    /* (gardien) une ligne qu'un HUMAIN a touchée (prise, assignée à quelqu'un d'autre, répondue) n'est jamais réécrite par Camille — « un agent ne s'assigne pas la demande » */
    if (sv.repTs > 0 || (sv.par && sv.par !== 'Camille') || (sv.assigne && !SUIVI_PAR.includes(sv.assigne))) return false;
    sv.statut = o.statut;
    if (o.assigne !== undefined && SUIVI_PAR.includes(o.assigne)) sv.assigne = o.assigne;
    delete sv.classe;   // une vraie décision remplace un classement « rien à répondre »
    sv.par = 'Camille'; sv.ts = Date.now();
    suiviSauve();
    return true;
  }
  /* Classer « rien à répondre » : SEULEMENT une ligne qui existe déjà (un courriel que la Tour a ouvert), encore intacte — à traiter, personne dessus, jamais répondue, jamais touchée par
     quelqu'un. Pas de création : une lettre d'information n'a pas à entrer dans le suivi, elle n'y comptait pas. Rend vrai quand la ligne vient d'être classée. */
  function suiviClasser(mid, raison) {
    mid = String(mid || '').slice(0, 300);
    const sv = suivi[mid];
    if (!sv || !CLASSES.includes(raison)) return false;
    if (sv.statut !== 'aTraiter' || sv.repTs > 0 || sv.assigne || sv.par) return false;
    sv.statut = 'enCours'; sv.assigne = 'Camille'; sv.par = 'Camille'; sv.classe = raison; sv.ts = Date.now();
    suiviSauve();
    return true;
  }

  /* ═════════════════════ PIÈCE JOINTE ═════════════════════ */
  app.get('/api/monitor/mail/piece', monAdmin, async (req, res) => {
    const b = trouve(req.query.boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    const chemin = monStr(req.query.dossier, 200) || 'INBOX';
    const uid = parseInt(req.query.uid, 10), idx = parseInt(req.query.idx, 10);
    if (!uid || !(idx >= 0)) return res.status(400).json({ error: 'pièce introuvable' });
    try {
      const p = await avecImap(b, async client => {
        const lock = await client.getMailboxLock(chemin);
        try {
          const msg = await client.fetchOne(String(uid), { uid: true, source: { maxLength: 26000000 } }, { uid: true });
          if (!msg) return null;
          const { simpleParser } = require('mailparser');
          const parsed = await simpleParser(msg.source);
          const a = (parsed.attachments || [])[idx];
          if (!a) return null;
          return { nom: String(a.filename || 'piece'), type: String(a.contentType || 'application/octet-stream'), buf: a.content };
        } finally { lock.release(); }
      });
      if (!p) return res.status(404).json({ error: 'pièce introuvable' });
      res.setHeader('Content-Type', p.type);
      res.setHeader('Content-Disposition', 'attachment; filename="' + p.nom.replace(/[^\w.\- ]/g, '_') + '"');
      res.send(p.buf);
    } catch (e) { res.status(502).json({ error: 'téléchargement impossible' }); }
  });

  /* ═════════════════════ LU / NON LU / MARQUÉ ═════════════════════ */
  app.post('/api/monitor/mail/flag', monAdmin, async (req, res) => {
    const b = trouve((req.body || {}).boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    const { dossier, uid, lu, marque } = req.body || {};
    const u = parseInt(uid, 10);
    if (!u) return res.status(400).json({ error: 'message introuvable' });
    try {
      await avecImap(b, async client => {
        const lock = await client.getMailboxLock(monStr(dossier, 200) || 'INBOX');
        try {
          await verifierNonProtege(client, u);
          if (lu === true) await client.messageFlagsAdd(String(u), ['\\Seen'], { uid: true });
          if (lu === false) await client.messageFlagsRemove(String(u), ['\\Seen'], { uid: true });
          if (marque === true) await client.messageFlagsAdd(String(u), ['\\Flagged'], { uid: true });
          if (marque === false) await client.messageFlagsRemove(String(u), ['\\Flagged'], { uid: true });
        } finally { lock.release(); nonLusOublier(b.id); }
      });
      res.json({ ok: true });
    } catch (e) {
      if (e && e.protege) return res.status(403).json({ error: REFUS_PROTEGE });
      res.status(502).json({ error: 'action impossible' });
    }
  });

  /* ═════════════════════ DÉPLACER / CORBEILLE ═════════════════════ */
  const CREABLES = { archives: 'Archives', indesirables: 'Junk', corbeille: 'Trash' };
  async function creerDossier(b, nom) {
    const chemin = await avecImap(b, async client => {
      const essais = [nom];
      try { const l = await client.list(); const i = l.find(x => String(x.path).toUpperCase() === 'INBOX'); if (i && i.delimiter) essais.push('INBOX' + i.delimiter + nom); } catch (_) {}
      for (const c of essais) {
        try { const r = await client.mailboxCreate(c); return (r && r.path) || c; }
        catch (e) { if (e && /exist/i.test(String(e.responseText || e.message || ''))) return c; }
      }
      return '';
    });
    cacheDossiers.delete(b.id);
    return chemin;
  }
  app.post('/api/monitor/mail/deplacer', monAdmin, async (req, res) => {
    const b = trouve((req.body || {}).boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    const src = monStr((req.body || {}).dossier, 200) || 'INBOX';
    let dest = monStr((req.body || {}).vers, 200);
    const u = parseInt((req.body || {}).uid, 10);
    if (!u) return res.status(400).json({ error: 'message introuvable' });
    try {
      const role = monStr((req.body || {}).role, 20);
      if (role) dest = (await cheminRole(b, role)) || dest;
      // La boîte n'a pas ce dossier (beaucoup de boîtes OVH n'ont pas d'« Archives ») : on le CRÉE,
      // comme Apple Mail, plutôt que de refuser le geste. Seulement pour ces trois rôles, au nom
      // usuel, à la racine puis sous INBOX (serveurs à espace personnel « INBOX. »).
      if (!dest && CREABLES[role]) dest = await creerDossier(b, CREABLES[role]);
      if (!dest) return res.status(400).json({ error: 'dossier de destination introuvable' });
      if (dest === src) return res.json({ ok: true, deja: true });
      await avecImap(b, async client => {
        const lock = await client.getMailboxLock(src);
        try { await verifierNonProtege(client, u); await client.messageMove(String(u), dest, { uid: true }); } finally { lock.release(); nonLusOublier(b.id); }
      });
      res.json({ ok: true, vers: dest });
    } catch (e) {
      if (e && e.protege) return res.status(403).json({ error: REFUS_PROTEGE });
      res.status(502).json({ error: 'déplacement impossible : ' + sansAdr(String(e.message || e)).slice(0, 120) });
    }
  });

  // suppression : vers la corbeille ; déjà dans la corbeille → définitive
  app.post('/api/monitor/mail/supprimer', monAdmin, async (req, res) => {
    const b = trouve((req.body || {}).boite);
    if (!b) return res.status(404).json({ error: 'boîte introuvable' });
    const src = monStr((req.body || {}).dossier, 200) || 'INBOX';
    const u = parseInt((req.body || {}).uid, 10);
    if (!u) return res.status(400).json({ error: 'message introuvable' });
    try {
      const corbeille = await cheminRole(b, 'corbeille');
      const definitif = !corbeille || corbeille === src;
      await avecImap(b, async client => {
        const lock = await client.getMailboxLock(src);
        try {
          await verifierNonProtege(client, u);
          if (definitif) { await client.messageFlagsAdd(String(u), ['\\Deleted'], { uid: true }); try { await client.messageDelete(String(u), { uid: true }); } catch (_) {} }
          else await client.messageMove(String(u), corbeille, { uid: true });
        } finally { lock.release(); nonLusOublier(b.id); }
      });
      res.json({ ok: true, definitif });
    } catch (e) {
      if (e && e.protege) return res.status(403).json({ error: REFUS_PROTEGE });
      res.status(502).json({ error: 'suppression impossible : ' + sansAdr(String(e.message || e)).slice(0, 120) });
    }
  });

  /* ═════════════════════ ENVOI ═════════════════════ */
  function piecesValides(list) {
    const out = [];
    let total = 0;
    for (const p of (Array.isArray(list) ? list : []).slice(0, MAX_PIECES)) {
      const nom = monStr(p && p.nom, 140).trim(); const b64 = String((p && p.b64) || '');
      if (!nom || !b64) continue;
      const buf = Buffer.from(b64, 'base64');
      total += buf.length;
      if (total > MAX_PIECES_OCTETS) throw new Error('pièces jointes trop lourdes (12 Mo au total)');
      out.push({ filename: nom, content: buf, contentType: monStr(p && p.type, 80) || undefined });
    }
    return out;
  }
  function adrListe(v) {
    return String(v || '').split(/[,;]/).map(x => x.trim()).filter(x => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x.replace(/^.*</, '').replace(/>.*$/, ''))).slice(0, 20);
  }

  /* L'ENVOI, UNE SEULE FOIS : la route de la Tour et les agents passent par ici. Message construit, copie brute pour « Envoyés », envoi SMTP,
     copie rangée, suivi passé en « en cours », message d'origine marqué « répondu ». Les contrôles (destinataires, quota, longueur) restent à
     l'appelant : ils ne sont pas les mêmes pour un humain et pour un agent. Un refus du serveur SMTP jette une erreur qui porte `refus`, la
     phrase déjà nettoyée des adresses ; tout le reste (copie, suivi, drapeau) est du rangement et ne fait jamais échouer un envoi parti. */
  async function envoyerCourriel(b, o) {
    const rep = o.rep || null;   // { mid, dossier?, uid? }
    const options = { from: '"' + (o.deNom || b.nom || 'TEAM OP') + '" <' + b.email + '>', to: o.to.join(', '), subject: o.objet, text: o.texte };
    /* Un courriel d'AGENT se déclare automatique (RFC 3834) : le robot d'un tiers qui lit cet en-tête ne répond pas, donc deux automates ne s'écrivent pas en boucle. « auto-replied » pour
       une réponse à un message reçu, « auto-generated » pour un premier courriel (Léa à une inscription). Jamais sur un envoi de la Tour (un humain). */
    if (o.auto) options.headers = { 'Auto-Submitted': o.auto === 'auto-replied' ? 'auto-replied' : 'auto-generated' };
    if (o.messageId) options.messageId = o.messageId;
    if (o.cc && o.cc.length) options.cc = o.cc.join(', ');
    if (o.bcc && o.bcc.length) options.bcc = o.bcc.join(', ');
    if (o.pieces && o.pieces.length) options.attachments = o.pieces;
    if (rep && rep.mid) { options.inReplyTo = String(rep.mid).slice(0, 300); options.references = String(rep.mid).slice(0, 300); }

    const nodemailer = require('nodemailer');
    // 1) le message brut, pour en garder une copie dans « Envoyés »
    let brut = null;
    try {
      const constructeur = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
      const info = await constructeur.sendMail(options);
      brut = info.message;
    } catch (e) {}
    // 2) l'envoi réel
    try {
      const t = nodemailer.createTransport({ host: b.smtpHost, port: b.smtpPort, secure: b.smtpPort === 465,
        auth: { user: b.email, pass: b.pass }, connectionTimeout: 12000, greetingTimeout: 12000 });
      await t.sendMail(options);
    } catch (e) { throw Object.assign(new Error('envoi refusé'), { refus: 'envoi refusé : ' + sansAdr(String(e.message || e)).slice(0, 160) }); }
    // 3) copie dans « Envoyés » + le message d'origine passe en « répondu »
    let copieOk = false;
    try {
      const envoyes = await cheminRole(b, 'envoyes');
      if (envoyes && brut) await avecImap(b, async client => { await client.append(envoyes, brut, ['\\Seen']); copieOk = true; });
    } catch (e) {}
    if (rep && rep.mid) {
      const sv = suivi[String(rep.mid)];
      if (sv) {
        if (!sv.repTs) sv.repTs = Date.now();
        if (sv.statut === 'aTraiter') sv.statut = 'enCours';
        delete sv.classe;   // une réponse partie n'est plus un « rien à répondre »
        if (o.par) sv.assigne = sv.assigne || o.par;   // un agent ne s'assigne pas la demande : « personne » reste vrai tant qu'un humain ne la prend pas
        suiviSauve();
      }
    }
    if (rep && rep.dossier && rep.uid) {
      try { await avecImap(b, async client => { const l = await client.getMailboxLock(rep.dossier); try { await client.messageFlagsAdd(String(parseInt(rep.uid, 10)), ['\\Answered'], { uid: true }); } finally { l.release(); } }); } catch (e) {}
    }
    return { copieOk };
  }
  /* Qui peut envoyer pour les agents : une boîte par son identifiant, jamais une adresse écrite par un agent. */
  const ADRESSE_SIMPLE = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;
  /* La signature réglée dans le Courrier (`reglages.signature`) : celle de JUSTIN, ajoutée par le client de la Tour. Les agents n'en usent plus (depuis le 23 octobre 2026) : la leur vient d'`agents-signature.js`. */
  const signature = () => String(reglages.signature || '');
  /* « contact » ou « support » : la boîte dont l'adresse COMMENCE par ce rôle, à défaut l'AUTRE des deux. `null` : aucune des deux n'est connectée — jamais « la première boîte
     venue » (relecture du 23 octobre 2026 : elle devenait expéditeur ET signature de n'importe quelle boîte non exclue). */
  function boiteParRole(role) {
    const r = String(role || '').toLowerCase();
    const permises = boites.filter(boiteAgentOk);
    const b = permises.find(x => String(x.email || '').toLowerCase().startsWith(r + '@')) || permises.find(x => String(x.email || '').toLowerCase().startsWith('contact@')) || permises[0];
    return b ? b.id : null;
  }
  /* L'ENVOI D'UN AGENT, après validation de Justin (ou en mode auto, charte ouverte). Le destinataire est UNE adresse que l'appelant a prise
     dans la base ou dans l'en-tête d'un mail reçu — jamais dans un texte de Claude ; la signature de L'AGENT (fournie par l'appelant) est ajoutée ici, une seule fois ; le
     budget est celui des agents (30 par heure), séparé de celui de la Tour. */
  async function envoyerAgent(o) {
    o = o || {};
    const b = trouve(o.boiteId);
    if (!b) throw new Error('boîte introuvable');
    if (!boiteAgentOk(b)) throw new Error('boîte réservée : les agents ne l’utilisent pas');
    const a = String(o.a || '').trim().toLowerCase();
    if (!ADRESSE_SIMPLE.test(a) || a.length > 160) throw new Error('destinataire invalide');
    const objet = monStr(String(o.objet || '').replace(/[\r\n]+/g, ' '), 300).trim() || '(sans objet)';
    let texte = String(o.texte || '').trim();
    if (!texte) throw new Error('message vide');
    /* ⛔ La signature d'un agent est SA signature (« Léa — Assistante de TeamOP », et la mention de l'IA dessous), posée par le serveur et fournie par l'appelant : jamais celle
       du Courrier de Justin (qui peut porter son nom — Justin : « c'est hyper contradictoire de mettre Justin si c'est un agent qui répond »). Sans elle, rien ne part (Hugo, Margaux, Emma et Sarah la fournissent aussi : `agents-documents.js` — une seule règle d'envoi pour tous les agents, jamais un repli sur
       le Courrier de Justin). */
    const sig = String(o.signature || '').trim();
    if (!sig) throw new Error('signature de l’agent absente : rien ne part');
    if (!texte.endsWith(sig)) texte += '\n\n' + sig;   // déjà signé (le texte repart d'un envoi échoué) : pas deux fois
    texte = texte.slice(0, 60000);
    if (!quotaOk) throw new Error('la limite d’envoi n’est pas branchée');
    if (!quotaOk(agentsQuota, 'agents', ENVOIS_AGENTS_PAR_HEURE, 3600000)) throw new Error('limite d’envoi des agents atteinte (' + ENVOIS_AGENTS_PAR_HEURE + ' par heure)');
    const deNom = String(o.deNom || '').replace(/["\r\n<>]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
    const messageId = '<' + crypto.randomBytes(12).toString('hex') + '@' + (String(b.email).split('@')[1] || 'teamop.fr') + '>';   // connu AVANT l'envoi : la réponse du prospect s'y rattache (In-Reply-To)
    const r = await envoyerCourriel(b, { to: [a], objet, texte, pieces: [], rep: o.enReponseA || null, par: '', deNom, messageId, auto: o.enReponseA && o.enReponseA.mid ? 'auto-replied' : 'auto-generated' });
    return { copieOk: r.copieOk, messageId };
  }

  /* ⛔ LES DEUX ROUTES QUI PORTENT DES PIÈCES ONT LEUR PROPRE ANALYSEUR (`jsonGros`, 20 Mo), MONTÉ APRÈS `monAdmin`.
     Le plafond global d'`index.js` (6 Mo) refusait en 413 AVANT la route : « 12 pièces, 12 Mo » était une promesse que
     le serveur ne pouvait pas tenir, puisque 12 Mo d'octets font ~16 Mo de base64. Et l'ordre compte : lire 20 Mo avant
     de savoir QUI parle ferait de ces deux chemins le moyen le moins cher de remplir la mémoire du serveur. Les autres
     routes gardent leurs 6 Mo (`index.js` écarte ces deux chemins du plafond global, et eux seuls). */
  app.post('/api/monitor/mail/envoyer', monAdmin, jsonGros, async (req, res) => {
    const b = trouve((req.body || {}).boite) || boites[0];
    if (!b) return res.status(503).json({ error: 'aucune boîte connectée' });
    const to = adrListe((req.body || {}).a), cc = adrListe((req.body || {}).copie), bcc = adrListe((req.body || {}).copieCachee);
    if (!to.length && !cc.length) return res.status(400).json({ error: 'indiquez au moins un destinataire valide' });
    const objet = monStr((req.body || {}).objet, 300).trim() || '(sans objet)';
    const texte = String((req.body || {}).texte || '').slice(0, 60000);
    if (!texte.trim()) return res.status(400).json({ error: 'message vide' });
    let pieces;
    try { pieces = piecesValides((req.body || {}).pieces); }
    catch (e) { return res.status(400).json({ error: String(e.message) }); }
    /* Le budget d'envoi : par COMPTE de la Tour (une session volée n'écrit pas à tous nos clients en une nuit), compté
       APRÈS les contrôles — un message refusé pour une adresse fausse ne consomme rien — et AVANT l'envoi. */
    if (!quotaOk) return res.status(503).json({ error: 'envoi indisponible : la limite d\'envoi n\'est pas branchée' });
    if (envoiQuota.size > 2000) envoiQuota.clear();
    const cleQuota = 'u:' + String((req.tourUser && (req.tourUser.id || req.tourUser.nom)) || '?');
    if (!quotaOk(envoiQuota, cleQuota, ENVOIS_PAR_HEURE, 3600000)) {
      const q = envoiQuota.get(cleQuota);
      const attente = Math.max(1, Math.ceil(((q && q.reset) - Date.now()) / 1000) || 3600);
      res.setHeader('Retry-After', String(attente));   // la Tour est sur une autre origine : elle ne lit pas cet en-tête, d'où `reessayerDans` dans le corps
      return res.status(429).json({ error: 'trop d\'envois : ' + ENVOIS_PAR_HEURE + ' messages par heure et par compte — réessaie plus tard', limite: ENVOIS_PAR_HEURE, reessayerDans: attente });
    }

    let copieOk;
    try { copieOk = (await envoyerCourriel(b, { to, cc, bcc, objet, texte, pieces, rep: (req.body || {}).enReponseA || null, par: req.tourUser.nom })).copieOk; }
    catch (e) { return res.status(500).json({ error: e.refus || 'envoi impossible' }); }
    res.json({ ok: true, copieEnvoyes: copieOk, par: req.tourUser.nom });
  });

  /* ═════════════════════ BROUILLON ═════════════════════ */
  app.post('/api/monitor/mail/brouillon', monAdmin, jsonGros, async (req, res) => {
    const b = trouve((req.body || {}).boite) || boites[0];
    if (!b) return res.status(503).json({ error: 'aucune boîte connectée' });
    const options = { from: '"' + (b.nom || 'TEAM OP') + '" <' + b.email + '>',
      to: adrListe((req.body || {}).a).join(', '), subject: monStr((req.body || {}).objet, 300) || '(sans objet)',
      text: String((req.body || {}).texte || '').slice(0, 60000) };
    const cc = adrListe((req.body || {}).copie); if (cc.length) options.cc = cc.join(', ');
    // un brouillon garde ses pièces : sans elles, rouvrir le brouillon d'un envoi à joindre le rendrait incomplet, sans un mot
    try { const pj = piecesValides((req.body || {}).pieces); if (pj.length) options.attachments = pj; }
    catch (e) { return res.status(400).json({ error: String(e.message) }); }
    if (!quotaOk) return res.status(503).json({ error: 'brouillon indisponible : la limite n\'est pas branchée' });
    if (brouillonQuota.size > 2000) brouillonQuota.clear();
    const cleBr = 'u:' + String((req.tourUser && (req.tourUser.id || req.tourUser.nom)) || '?');
    if (!quotaOk(brouillonQuota, cleBr, BROUILLONS_PAR_HEURE, 3600000)) {
      const q = brouillonQuota.get(cleBr);
      const attente = Math.max(1, Math.ceil(((q && q.reset) - Date.now()) / 1000) || 3600);
      res.setHeader('Retry-After', String(attente));
      return res.status(429).json({ error: 'trop de brouillons : ' + BROUILLONS_PAR_HEURE + ' par heure et par compte — réessaie plus tard', limite: BROUILLONS_PAR_HEURE, reessayerDans: attente });
    }
    try {
      const nodemailer = require('nodemailer');
      const info = await nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' }).sendMail(options);
      const brouillons = await cheminRole(b, 'brouillons');
      if (!brouillons) return res.status(501).json({ error: 'cette boîte n\'a pas de dossier Brouillons' });
      await avecImap(b, async client => { await client.append(brouillons, info.message, ['\\Draft', '\\Seen']); });
      res.json({ ok: true });
    } catch (e) { res.status(502).json({ error: 'brouillon non enregistré : ' + sansAdr(String(e.message || e)).slice(0, 140) }); }
  });

  /* ═════════════════════ RÉGLAGES : signature et réponses toutes prêtes ═════════════════════ */
  app.get('/api/monitor/mail/reglages', monAdmin, (req, res) => res.json({ signature: reglages.signature, modeles: reglages.modeles }));
  app.post('/api/monitor/mail/reglages', monPatronStrict, (req, res) => {
    const b = req.body || {};
    if (typeof b.signature === 'string') reglages.signature = b.signature.slice(0, 1200);
    if (Array.isArray(b.modeles)) {
      reglages.modeles = b.modeles.slice(0, 24).map((m, i) => ({
        id: monStr(m && m.id, 12) || ('m' + (i + 1)),
        titre: monStr(m && m.titre, 60) || 'Modèle',
        objet: monStr(m && m.objet, 200),
        texte: String((m && m.texte) || '').slice(0, 4000)
      })).filter(m => m.texte.trim());
    }
    reglagesSauve();
    res.json({ ok: true, signature: reglages.signature, modeles: reglages.modeles });
  });

  /* ═════════════════════ LES RÈGLES DE TRI ═════════════════════ */
  app.get('/api/monitor/mail/regles', monAdmin, (req, res) => {
    res.json({ regles: Object.keys(reglages.regles).sort().map(adresse => ({ adresse, console: reglages.regles[adresse] })) });
  });
  /* POST { adresse, console } — `console` : 'gestion' | 'messages' pose la règle, `null` la retire. L'adresse est soit
     complète (« paul@exemple.fr »), soit un domaine entier (« @exemple.fr »). La règle de l'adresse passe avant celle
     de son domaine, et les deux passent avant l'annuaire d'OP GESTION. */
  app.post('/api/monitor/mail/regle', monAdmin, (req, res) => {
    const corps = req.body || {};
    const adresse = regleAdresse(corps.adresse);
    if (!adresse) return res.status(400).json({ error: 'adresse invalide : une adresse complète, ou un domaine « @exemple.fr »' });
    /* Un DOMAINE entier déplace tout un pan du courrier d'une console à l'autre — « @gmail.com → messages » le ferait disparaître
       de la vue d'un compte qui n'a que GESTION, en silence. C'est un réglage de la boîte, comme la signature : au patron.
       Une adresse seule (ce que la Tour propose sous un message) reste à tout compte du Courrier. */
    if (adresse[0] === '@' && !(req.tourUser && req.tourUser.role === 'patron')) return res.status(403).json({ error: 'ranger tout un domaine est réservé au patron' });
    if (!Object.prototype.hasOwnProperty.call(corps, 'console')) return res.status(400).json({ error: 'console manquante (gestion, messages, ou null pour retirer la règle)' });
    const c = corps.console;
    if (c !== null && c !== '' && c !== 'gestion' && c !== 'messages') return res.status(400).json({ error: 'console inconnue (gestion, messages, ou null pour retirer la règle)' });
    if (c === null || c === '') delete reglages.regles[adresse];
    else {
      if (!(adresse in reglages.regles) && Object.keys(reglages.regles).length >= MAX_REGLES) return res.status(400).json({ error: 'trop de règles (' + MAX_REGLES + ' au maximum)' });
      reglages.regles[adresse] = c;
    }
    reglagesSauve();
    res.json({ ok: true, adresse, console: c === '' ? null : c, regles: Object.keys(reglages.regles).length });
  });

  /* ═════════════════════ SUIVI D'UNE DEMANDE ═════════════════════ */
  app.post('/api/monitor/mail/suivi', monAdmin, (req, res) => {
    const mid = String((req.body || {}).mid || '').slice(0, 300);
    if (!mid) return res.status(400).json({ error: 'message introuvable' });
    const st = monStr((req.body || {}).statut, 12);
    const sv = suivi[mid] || (suivi[mid] = { statut: 'aTraiter', assigne: '', par: '', ts: Date.now(), recuTs: Date.now(), repTs: 0, de: '', objet: '' });
    if (['aTraiter', 'enCours', 'resolu'].includes(st)) sv.statut = st;
    if ((req.body || {}).assigne !== undefined) sv.assigne = monStr((req.body || {}).assigne, 60);
    delete sv.classe;   // la main d'un humain défait le classement de Camille
    sv.par = req.tourUser.nom; sv.ts = Date.now();
    suiviSauve();
    res.json({ ok: true, suivi: { statut: sv.statut, assigne: sv.assigne, par: sv.par } });
  });

  /* ═════════════════════ STATISTIQUES DU SUPPORT ═════════════════════ */
  /* UNE définition de « ce qui attend un client » : les notifications automatiques (`auto`) n'attendent personne. Les statistiques de la Tour
     et les agents (qui ne reçoivent que des NOMBRES) comptent par là — deux copies divergeraient le jour où un statut s'ajoute. */
  const suiviClients = () => Object.values(suivi).filter(x => !x.auto);
  function compter() {
    const clients = suiviClients();
    /* `enCours` ne compte que le travail RÉEL (pris par Camille ou par quelqu'un) ; `classes` : lus par Camille, rien à répondre. À traiter + en cours + classés + résolus = total. */
    return { aTraiter: clients.filter(x => x.statut === 'aTraiter').length, enCours: clients.filter(x => x.statut === 'enCours' && !estClasse(x)).length,
      classes: clients.filter(estClasse).length, resolus: clients.filter(x => x.statut === 'resolu').length, total: clients.length };
  }
  app.get('/api/monitor/mail/stats', monAdmin, (req, res) => {
    const now = Date.now(), SEM = 7 * 86400000;
    const tous = Object.values(suivi);
    const clients = suiviClients();
    const cpt = compter();
    const dans = (l, d) => l.filter(x => (x.recuTs || 0) > now - d);
    const delais = clients.filter(x => x.repTs && x.recuTs && x.repTs > x.recuTs).map(x => x.repTs - x.recuTs);
    const moyenne = delais.length ? Math.round(delais.reduce((a, b) => a + b, 0) / delais.length / 60000) : 0;
    // les sujets qui reviennent : on regroupe sur les mots significatifs de l'objet
    const mots = {};
    clients.forEach(x => String(x.objet || '').toLowerCase().replace(/[^a-zàâäéèêëîïôöùûüç' ]/g, ' ').split(/\s+/)
      .filter(m => m.length > 4 && !['bonjour', 'merci', 'demande', 'question', 'probleme', 'problème', 'nouvelle', 'pouvez', 'votre', 'notre'].includes(m))
      .forEach(m => { mots[m] = (mots[m] || 0) + 1; }));
    const sujets = Object.entries(mots).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([mot, n]) => ({ mot, n }));
    // par semaine sur 8 semaines
    const semaines = [];
    for (let i = 7; i >= 0; i--) {
      const deb = now - (i + 1) * SEM, fin = now - i * SEM;
      semaines.push({ n: clients.filter(x => (x.recuTs || 0) >= deb && (x.recuTs || 0) < fin).length });
    }
    res.json({
      total: clients.length, notifications: tous.length - clients.length,
      semaine: dans(clients, SEM).length, mois: dans(clients, 30 * 86400000).length,
      aTraiter: cpt.aTraiter, enCours: cpt.enCours, classes: cpt.classes, resolus: cpt.resolus,
      reponseMoyenneMin: moyenne, repondus: delais.length, sujets, semaines,
      /* « Au rapport » (lot 1 de la refonte de la Tour, 21 octobre 2026) : ce qui attend un client, du plus ancien au plus récent — vingt au plus,
         les notifications automatiques à part (elles n'attendent personne). En LECTURE : rien ne s'écrit ici. */
      /* `recuTs` vient de l'en-tête Date: de l'EXPÉDITEUR : borné à la création depuis le 22 octobre 2026 ; une entrée plus ancienne au futur
         se borne ici à maintenant. Une date trop ANCIENNE ne se borne pas — connecter une boîte relève de vrais vieux messages (REPRISE.md). */
      /* ⛔ (gardien) les classés RESTENT dans `ouverts`, derrière les vrais : la Tour EN SERVICE (v2.117) ne lit ni `classe` ni `classesRecents`, et un courriel mal classé disparaîtrait de « Au rapport »
         sans qu'elle puisse le montrer. Derrière les vrais, pour qu'une vingtaine de publicités anciennes ne chassent pas du tableau un courrier qui attend ; `classe` les marque pour une Tour qui sait la lire. */
      ouverts: clients.filter(x => x.statut === 'aTraiter' || x.statut === 'enCours').sort((a, b) => (estClasse(a) ? 1 : 0) - (estClasse(b) ? 1 : 0) || Math.min(a.recuTs || 0, now) - Math.min(b.recuTs || 0, now)).slice(0, 20)
        .map(x => Object.assign({ statut: x.statut, assigne: x.assigne || '', recuTs: Math.min(x.recuTs || 0, now), de: x.de || '', objet: x.objet || '' }, estClasse(x) ? { classe: x.classe } : {})),
      /* les courriels que Camille a lus et classés « rien à répondre » : à part des ouverts (ils n'attendent personne), mais RÉCUPÉRABLES — une Tour qui les montre les trouve ici */
      classesRecents: clients.filter(estClasse).sort((a, b) => (b.ts || 0) - (a.ts || 0)).slice(0, 20)
        .map(x => ({ classe: x.classe, recuTs: Math.min(x.recuTs || 0, now), de: x.de || '', objet: x.objet || '' }))
    });
  });

  /* ═════════════════════ VEILLE : nouveau message → notification téléphone ═════════════════════ */
  let veilleEnCours = false;
  async function veille() {
    if (veilleEnCours || !boites.length) return;
    veilleEnCours = true;
    try {
      for (const b of boites) {
        try {
          const inbox = (await cheminRole(b, 'inbox')) || 'INBOX';
          const nouveaux = await avecImap(b, async client => {
            const lock = await client.getMailboxLock(inbox);
            try {
              const uids = (await client.search({ seen: false }, { uid: true })) || [];
              const dernier = Number(vus[b.id] || 0);
              const frais = uids.filter(u => u > dernier);
              if (!frais.length) { if (uids.length) vus[b.id] = Math.max(dernier, Math.max.apply(null, uids)); return []; }
              const out = [];
              for await (const m of client.fetch({ uid: frais.slice(-10).join(',') }, { uid: true, envelope: true }, { uid: true })) {
                const env = m.envelope || {}; const de = adr1(env.from);
                if (protege(env.messageId)) continue;   // un e-mail de sécurité ne part pas en notification à toute la Tour
                out.push({ uid: m.uid, de: de.adr, deNom: de.nom, objet: String(env.subject || '(sans objet)').slice(0, 120), auto: estNotification(de.adr, env.subject) });
              }
              vus[b.id] = Math.max(dernier, Math.max.apply(null, uids));
              return out;
            } finally { lock.release(); }
          });
          vusSauve();
          const vrais = (nouveaux || []).filter(m => !m.auto);
          /* Chaque message « vrai » (jamais une notification, jamais un e-mail de sécurité : `protege` les a écartés plus haut) est annoncé aux
             agents — SANS ATTENDRE, et sans que rien de ce qu'ils font puisse remonter ici : la notification de la Tour part dans tous les cas. */
          if (surNouveauMessage && boiteAgentOk(b)) for (const m of vrais) {
            Promise.resolve().then(() => surNouveauMessage({ boiteId: b.id, dossier: inbox, uid: m.uid })).catch(() => {});
          }
          if (vrais.length && typeof pousseNotif === 'function') {
            const m = vrais[vrais.length - 1];
            const titre = vrais.length > 1 ? ('📬 ' + vrais.length + ' nouveaux messages') : '📬 Nouveau message support';
            await pousseNotif(titre, (m.deNom || m.de) + ' — ' + m.objet, '/tour.html#support');
          }
        } catch (e) { /* boîte injoignable : on réessaie au tour suivant */ }
      }
    } finally { veilleEnCours = false; }
  }
  setInterval(() => { veille().catch(() => {}); }, 120000);
  setTimeout(() => { veille().catch(() => {}); }, 20000);

  return { boites: () => boites.map(publique), compter, lireMessage, envoyerAgent, signature, boiteParRole, arriere, suiviMarquer, suiviClasser, suiviLibre };
};
module.exports.authentification = authentification;
module.exports.enteteAutomatique = enteteAutomatique;
module.exports.boiteAgentOk = boiteAgentOk;
