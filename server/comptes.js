/* ══ LES COMPTES DU PORTAIL, CHEZ NOUS ═══════════════════════════════════════════════════════
 *
 * ⛔ CE QUE CE FICHIER REMPLACE, ET POURQUOI IL N'ÉTAIT NULLE PART DANS LE PLAN.
 * `PLAN-OP-SOCLE.md` ne parle que de FIRESTORE — la base. Il ne mentionne pas une seule fois
 * FIREBASE AUTH, qui est l'autre moitié de la dépendance : les comptes du portail client, la
 * vérification d'adresse et les liens de mot de passe. `reinit.html` en est la preuve : 125
 * lignes, ZÉRO collection Firestore, uniquement de l'authentification. On pouvait retirer
 * Firestore en entier, se croire arrivé, et tous les « mot de passe oublié » passeraient
 * encore par Google.
 *
 * ✅ ON NE PART PAS DE ZÉRO, ET C'EST DÉLIBÉRÉ. `comptesReg` (`server/index.js`) tient déjà
 * les comptes des gens DANS une entreprise, avec PBKDF2 120 000 tours et un sel par compte.
 * Ce fichier applique la MÊME dérivation aux comptes du PORTAIL — ceux des entreprises qui
 * s'abonnent. Deux dérivations différentes pour deux sortes de comptes, ce serait deux
 * qualités de sécurité, et on finirait par oublier laquelle est laquelle.
 *
 * ⛔ LE MOT DE PASSE BRUT N'ARRIVE JAMAIS ICI. L'appareil envoie une EMPREINTE, comme le fait
 * déjà la page de connexion d'OP GESTION. Sur le fil c'est équivalent (HTTPS des deux côtés),
 * mais le serveur ne peut pas écrire un mot de passe dans un journal, une trace d'erreur ou
 * un rapport d'incident — et c'est exactement ce genre d'accident qui coûte cher.
 *
 * ⛔ ON NE DIT JAMAIS SI UNE ADRESSE EXISTE. Ni à la création, ni à la connexion, ni à la
 * demande de mot de passe. Une réponse différente selon que le compte existe transforme cette
 * API en annuaire des clients de TeamOP. Le code existant le faisait déjà pour `/api/mdp/lien`
 * (« compte inconnu : on répond comme pour un succès ») — on tient la même ligne partout.
 */
'use strict';
const fs = require('fs'), path = require('path'), crypto = require('crypto');

/* Le même chiffre que `CNX_ITER` d'`index.js` et que `syncKey()` de l'application. ⚠️ Il est
   répété ici parce que ce module ne dépend pas d'`index.js` — mais un banc vérifie qu'ils ne
   divergent pas, sinon un mot de passe posé d'un côté serait refusé de l'autre. */
const ITER = 120000;
const SEL_OCTETS = 16, CLE_OCTETS = 32;

/* Durées. Un lien de vérification vit plus longtemps qu'un lien de mot de passe : le premier
   se clique quand on relève ses courriels, le second quand on est bloqué devant l'écran. */
const VERIF_VIE_MS = 7 * 24 * 3600 * 1000;
const MDP_VIE_MS = 60 * 60 * 1000;
const SESSION_VIE_MS = 30 * 24 * 3600 * 1000;

/* ⛔ LE BLOCAGE APRÈS ÉCHECS EST PAR COMPTE, PAS PAR ADRESSE IP. Une entreprise de terrain
   sort par une seule adresse : bloquer l'IP punirait trente personnes pour une faute de
   frappe. Et l'attaquant, lui, change d'adresse. */
const ECHECS_MAX = 8, BLOCAGE_MS = 15 * 60 * 1000;

const normMail = (x) => String(x == null ? '' : x).trim().toLowerCase();
const mailOk = (x) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(x) && x.length <= 200;
const borne = (x, n) => String(x == null ? '' : x).slice(0, n);
const sha = (x) => crypto.createHash('sha256').update(String(x)).digest('hex');

/* ⛔ COMPARAISON À TEMPS CONSTANT. `a === b` sur deux empreintes sort à la première
   différence : la durée de la réponse dit alors combien de caractères sont justes, et un
   mot de passe se devine caractère par caractère sans jamais le connaître. */
function memeSecret(a, b) {
  const x = Buffer.from(String(a || ''), 'utf8'), y = Buffer.from(String(b || ''), 'utf8');
  if (x.length !== y.length) return false;
  try { return crypto.timingSafeEqual(x, y); } catch (e) { return false; }
}

const deriver = (empreinte, sel) => new Promise((ok, ko) =>
  crypto.pbkdf2(String(empreinte), Buffer.from(sel, 'hex'), ITER, CLE_OCTETS, 'sha256',
    (err, d) => err ? ko(err) : ok(d.toString('hex'))));

function monterComptes(app, deps) {
  const d = deps || {};
  const DOSSIER = d.dossier;                       // TEAMOP_DATA
  const envoyer = d.mailerEnvoi;                   // (opts) => Promise
  const quotaOk = d.quotaOk || (() => true);
  const quota = new Map();
  /* ⛔ UN PLAFOND PAR ADRESSE IP EN PLUS DU PLAFOND PAR ADRESSE E-MAIL (`gardien`, N5). Le second
     seul laissait créer des comptes en masse et envoyer des rafales de courriels : cinq par
     heure et par adresse, sans limite sur le NOMBRE d'adresses. Les chiffres sont larges exprès
     — une entreprise de terrain sort par une seule adresse IP (voir le blocage par compte plus
     bas) : on arrête une machine, pas un bureau. `req.ip` et non l'en-tête brut : le serveur est
     derrière nginx (`trust proxy`), et un en-tête fourni par le client se falsifie. */
  const parIp = (req, genre, max) => quotaOk(quota, genre + '-ip:' + String((req && req.ip) || ''), max, 3600000);
  const base = String(d.siteBase || 'https://teamop.fr').replace(/\/+$/, '');
  const journal = d.journal || ((...a) => console.log('comptes:', ...a));
  /* Un courriel qui part DERRIÈRE la réponse. ⚠️ `mailerEnvoi` jette de façon SYNCHRONE quand le
     courrier n'est pas configuré (`mailer.sendMail` sur `null`) : un simple `.catch()` laisserait
     l'exception sortir de la route, et Express 4 laisserait la requête pendue. Les deux voies
     finissent au journal, avec le motif et jamais l'adresse. */
  const envoyerDerriere = (o, motif) => {
    try { Promise.resolve(envoyer(o)).catch((e) => journal(motif + ' —', (e && e.code) || 'erreur')); }
    catch (e) { journal(motif + ' —', (e && e.code) || 'erreur'); }
  };

  const CHEMIN = path.join(DOSSIER, 'comptes-portail.json');
  let reg = { c: Object.create(null), j: Object.create(null) };   // comptes, jetons

  /* ⛔ DES TABLES SANS PROTOTYPE, AUSSI APRÈS UNE RELECTURE (`gardien`, C6). `JSON.parse` rend des
     objets ORDINAIRES : une clé `__proto__` y désignerait `Object.prototype`, et une écriture
     derrière toucherait tous les objets du processus. Les adresses passent `mailOk` avant
     d'arriver ici, mais une table se protège elle-même, elle ne compte pas sur ses appelants. */
  const table = (o) => { const t = Object.create(null); if (o && typeof o === 'object') for (const k of Object.keys(o)) t[k] = o[k]; return t; };
  const a = (t, k) => Object.prototype.hasOwnProperty.call(t, k) ? t[k] : undefined;
  function lire() {
    try {
      const o = JSON.parse(fs.readFileSync(CHEMIN, 'utf8'));
      reg = { c: table(o && o.c), j: table(o && o.j) };
    } catch (e) { /* fichier absent au premier démarrage : c'est normal */ }
  }
  /* ⛔ TEMPORAIRE PUIS RENOMMAGE, comme `espacesEcrire`. Un fichier tronqué ici, ce sont TOUS
     les clients du portail qui ne peuvent plus se connecter — et le renommage est la seule
     écriture atomique que le système de fichiers nous offre. */
  function ecrire() {
    const tmp = CHEMIN + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify(reg));
    fs.renameSync(tmp, CHEMIN);
  }
  lire();

  /* Le ménage des jetons périmés passe à chaque écriture plutôt que sur une minuterie : une
     minuterie de plus, c'est une fuite de plus à surveiller, et le fichier est petit. */
  function menage() {
    const n = Date.now();
    let bouge = false;
    for (const k of Object.keys(reg.j)) if (!reg.j[k] || reg.j[k].exp < n) { delete reg.j[k]; bouge = true; }
    return bouge;
  }

  const compte = (mail) => a(reg.c, mail) || null;

  /* ── LES JETONS ───────────────────────────────────────────────────────────────────────────
     32 octets au hasard ; SEUL leur sha256 est rangé, exactement comme les jetons d'appareil
     du socle. Une copie volée du fichier ne donne aucune session utilisable. */
  function jetonNeuf(mail, genre, vieMs) {
    const brut = crypto.randomBytes(32).toString('hex');
    reg.j[sha(brut)] = { m: mail, g: genre, exp: Date.now() + vieMs };
    menage(); ecrire();
    return brut;
  }
  function jetonLire(brut, genre) {
    const e = a(reg.j, sha(String(brut || '')));
    if (!e || e.exp < Date.now()) return null;
    if (genre && e.g !== genre) return null;
    return e;
  }
  /* ⛔ UN JETON DE VÉRIFICATION OU DE MOT DE PASSE NE SERT QU'UNE FOIS. Sans ça, un lien qui
     traîne dans une boîte mail rouvre le compte des mois plus tard — et une boîte mail se
     fait pirater bien plus souvent qu'un serveur. */
  function jetonBruler(brut) {
    const k = sha(String(brut || ''));
    if (a(reg.j, k)) { delete reg.j[k]; ecrire(); }
  }

  /* ⛔ CHANGER DE MOT DE PASSE COUPE LES SESSIONS — PAS LA VÉRIFICATION D'ADRESSE.
     Première écriture : `for (k of reg.j) if (reg.j[k].m === mail) delete reg.j[k]`, c'est-à-
     dire TOUS les jetons du compte, quel que soit leur genre. Mesuré le 20 septembre 2026 par
     `tests/test-741.js` : quelqu'un qui crée son compte, ne confirme pas son adresse tout de
     suite, puis fait une remise à zéro de mot de passe (le cas le plus banal des premières
     minutes) voyait son lien de confirmation MOURIR — et aucune route ne permet d'en
     redemander un. Il restait non vérifié pour toujours, sans rien pouvoir y faire.
     Ce qu'on coupe, et pourquoi :
     · `session` — c'est le geste qu'on fait quand on pense s'être fait voler quelque chose ;
     · `mdp`     — un AUTRE lien de remise à zéro encore vivant est une porte ouverte : celui
                    qui a déclenché la demande ne doit pas garder la sienne en réserve ;
     · `verif`   — NON. Confirmer son adresse n'a rien à voir avec le mot de passe, et le lien
                    vit sept jours exprès. */
  function couperSessions(mail) {
    for (const k of Object.keys(reg.j)) {
      const e = reg.j[k];
      if (e && e.m === mail && (e.g === 'session' || e.g === 'mdp')) delete reg.j[k];
    }
  }

  const vue = (mail) => {
    const c = compte(mail);
    return c ? { email: mail, prenom: c.pr || '', nom: c.no || '', societe: c.so || '', verifie: !!c.v } : null;
  };

  /* ⛔ LA MÊME RÉPONSE, QUOI QU'IL ARRIVE. Chaque route publique de ce fichier rend cet objet
     dès qu'elle a fini son travail, succès ou non — sauf refus de forme (400) et budget
     dépassé (429), qui ne disent rien d'un compte. */
  const RIEN_DIRE = { ok: true };

  /* ── CRÉER UN COMPTE ────────────────────────────────────────────────────────────────────── */
  app.post('/api/compte/creer', async (req, res) => {
    const b = req.body || {};
    const mail = normMail(b.email);
    if (!mailOk(mail)) return res.status(400).json({ error: 'email_invalide' });
    const emp = borne(b.h, 200);
    if (emp.length < 16) return res.status(400).json({ error: 'empreinte_invalide' });
    if (!quotaOk(quota, 'creer:' + mail, 5, 3600000) || !parIp(req, 'creer', 20)) return res.status(429).json({ error: 'trop_de_tentatives' });

    /* ⛔ LA MÊME DURÉE, QUE L'ADRESSE AIT UN COMPTE OU NON (`gardien`, C4). Avant : une adresse
       connue sautait la dérivation (~100 ms) et attendait un courriel, une adresse libre dérivait
       puis attendait un autre courriel — la durée seule disait lesquelles existaient. On dérive
       dans les deux cas, et AUCUN courriel n'est attendu : il part derrière la réponse, son échec
       se journalise, et la réponse est la même de toute façon. */
    const deja = compte(mail);
    const sel = crypto.randomBytes(SEL_OCTETS).toString('hex');
    let cle;
    try { cle = await deriver(emp, sel); }
    catch (e) { journal('dérivation impossible —', e.code || 'erreur'); return res.status(503).json({ error: 'indisponible' }); }
    if (deja || compte(mail)) {
      /* ⛔ ON NE DIT PAS QUE LE COMPTE EXISTE — on le dit à SON PROPRIÉTAIRE, par courriel.
         C'est la seule façon d'être à la fois muet pour un inconnu et utile pour la personne :
         elle apprend que quelqu'un a essayé, et on lui dit comment entrer. ⚠️ Un compte « à
         poser » (repris de Google) n'a pas de mot de passe : « connectez-vous simplement » lui
         mentait (`gardien`, N3) — son chemin est « Mot de passe oublié ». */
      const ap = !!(compte(mail) || {}).ap;
      envoyerDerriere({ to: mail, confidentiel: true,
        subject: 'Quelqu\'un a essayé de créer un compte avec votre adresse',
        text: 'Bonjour,\n\nUne inscription vient d\'être tentée sur teamop.fr avec cette adresse, '
          + (ap
            ? 'qui a déjà un espace client. Votre espace a changé de serveur : la première fois, choisissez '
              + 'un mot de passe avec « Mot de passe oublié » sur cette page :\n' + base + '/espace.html\n\n'
            : 'qui a déjà un compte. Si c\'était vous, connectez-vous simplement :\n' + base + '/espace.html\n\n'
              + 'Vous avez oublié votre mot de passe ? Utilisez « Mot de passe oublié » sur cette page.\n\n')
          + 'Si ce n\'était pas vous, il n\'y a rien à faire : aucun compte n\'a été créé et le vôtre n\'a pas bougé.\n' },
        'avis de doublon non envoyé');
      return res.json(RIEN_DIRE);
    }

    reg.c[mail] = { s: sel, e: cle, pr: borne(b.prenom, 60), no: borne(b.nom, 60),
      so: borne(b.societe, 120), v: 0, cree: Date.now(), maj: Date.now(), ech: 0, bloq: 0 };
    ecrire();

    const jv = jetonNeuf(mail, 'verif', VERIF_VIE_MS);
    envoyerDerriere({ to: mail, confidentiel: true, subject: 'Confirmez votre adresse — TEAM OP',
      text: 'Bienvenue,\n\nConfirmez votre adresse pour activer votre espace :\n'
        + base + '/reinit.html?mode=verifyEmail&jeton=' + jv + '\n\nCe lien est valable 7 jours.\n' },
      'courriel de vérification non envoyé');
    return res.json(RIEN_DIRE);
  });

  /* ── SE CONNECTER ───────────────────────────────────────────────────────────────────────── */
  app.post('/api/compte/connexion', async (req, res) => {
    const b = req.body || {};
    const mail = normMail(b.email);
    if (!mailOk(mail)) return res.status(400).json({ error: 'email_invalide' });
    const emp = borne(b.h, 200);
    if (!emp) return res.status(400).json({ error: 'empreinte_invalide' });
    if (!quotaOk(quota, 'cnx:' + mail, 30, 3600000) || !parIp(req, 'cnx', 200)) return res.status(429).json({ error: 'trop_de_tentatives' });

    const c0 = compte(mail);
    /* Un compte « à poser » (repris de Google, voir `preparer`) n'a pas encore de mot de passe :
       il se refuse exactement comme une adresse inconnue — même durée, même réponse, et aucun
       essai compté contre lui. */
    const c = (c0 && !c0.ap) ? c0 : null;
    const maintenant = Date.now();
    /* ⛔ ON DÉRIVE MÊME QUAND LE COMPTE N'EXISTE PAS. PBKDF2 à 120 000 tours coûte ~100 ms :
       répondre tout de suite sur une adresse inconnue et lentement sur une adresse connue
       dirait lesquelles existent, sans qu'un seul mot de passe soit juste. Le sel factice est
       tiré au hasard, donc la comparaison échoue toujours — mais elle a duré le même temps. */
    const sel = c ? c.s : crypto.randomBytes(SEL_OCTETS).toString('hex');
    let cle;
    try { cle = await deriver(emp, sel); }
    catch (e) { journal('dérivation impossible —', e.code || 'erreur'); return res.status(503).json({ error: 'indisponible' }); }

    if (!c || (c.bloq && c.bloq > maintenant) || !memeSecret(cle, c.e)) {
      if (c) {
        c.ech = (c.ech || 0) + 1;
        if (c.ech >= ECHECS_MAX) { c.bloq = maintenant + BLOCAGE_MS; c.ech = 0; }
        ecrire();
      }
      return res.status(401).json({ error: 'identifiants_refuses' });
    }
    c.ech = 0; c.bloq = 0; c.maj = maintenant; ecrire();
    const jeton = jetonNeuf(mail, 'session', SESSION_VIE_MS);
    return res.json({ ok: true, jeton, compte: vue(mail) });
  });

  /* ── QUI SUIS-JE ────────────────────────────────────────────────────────────────────────── */
  const porteur = (req) => {
    const h = String(req.headers['authorization'] || '');
    const m = /^Bearer\s+([A-Fa-f0-9]{64})$/.exec(h);
    return m ? m[1] : '';
  };
  app.get('/api/compte/moi', (req, res) => {
    const e = jetonLire(porteur(req), 'session');
    if (!e) return res.status(401).json({ error: 'session_refusee' });
    const v = vue(e.m);
    if (!v) return res.status(401).json({ error: 'session_refusee' });
    return res.json({ ok: true, compte: v });
  });
  app.post('/api/compte/deconnexion', (req, res) => {
    jetonBruler(porteur(req));
    return res.json({ ok: true });
  });

  /* ── VÉRIFIER SON ADRESSE ───────────────────────────────────────────────────────────────── */
  app.post('/api/compte/verifier', (req, res) => {
    const brut = borne((req.body || {}).jeton, 200);
    const e = jetonLire(brut, 'verif');
    if (!e) return res.status(400).json({ error: 'lien_expire' });
    const c = compte(e.m);
    if (c) { c.v = Date.now(); c.maj = Date.now(); ecrire(); }
    jetonBruler(brut);
    return res.json({ ok: true, email: e.m });
  });

  /* ── CONFIRMER SON MOT DE PASSE, ET EN CHANGER ────────────────────────────────
     ⛔ CES DEUX ROUTES EXISTENT PARCE QU'`accReauth()` MENTAIT. Dans `espace.html`, trois
     écrans redemandent le mot de passe avant un geste grave — changer d'adresse, changer de
     mot de passe, supprimer le compte. Avec Firebase, `reauthenticateWithCredential` le
     vérifiait vraiment. Avec l'adaptateur, `accReauth` rendait `true` sans rien contrôler :
     le champ « mot de passe actuel » était devenu un décor. Un formulaire qui demande un
     secret et ne le regarde pas est pire que pas de formulaire du tout — il fait croire à
     une garde.
     ⚠️ `confirmer` COMPTE LES ÉCHECS comme la connexion : sans ça, une session volée
     donnerait un oracle pour deviner le mot de passe tranquillement, puis le changer. */
  const confirmerMdp = async (mail, emp) => {
    const c = compte(mail);
    const maintenant = Date.now();
    /* Même dérivation à vide que la connexion : la durée ne doit rien dire. */
    const sel = c ? c.s : crypto.randomBytes(SEL_OCTETS).toString('hex');
    let cle;
    try { cle = await deriver(emp, sel); }
    catch (e) { journal('dérivation impossible —', e.code || 'erreur'); return 'indisponible'; }
    if (!c || (c.bloq && c.bloq > maintenant) || !memeSecret(cle, c.e)) {
      if (c) {
        c.ech = (c.ech || 0) + 1;
        if (c.ech >= ECHECS_MAX) { c.bloq = maintenant + BLOCAGE_MS; c.ech = 0; }
        ecrire();
      }
      return 'refuse';
    }
    c.ech = 0; c.bloq = 0; ecrire();
    return '';
  };

  app.post('/api/compte/mdp/confirmer', async (req, res) => {
    const e = jetonLire(porteur(req), 'session');
    if (!e) return res.status(401).json({ error: 'session_refusee' });
    const emp = borne((req.body || {}).h, 200);
    if (emp.length < 16) return res.status(400).json({ error: 'empreinte_invalide' });
    if (!quotaOk(quota, 'cfm:' + e.m, 30, 3600000)) return res.status(429).json({ error: 'trop_de_tentatives' });
    const mal = await confirmerMdp(e.m, emp);
    if (mal === 'indisponible') return res.status(503).json({ error: 'indisponible' });
    if (mal) return res.status(401).json({ error: 'identifiants_refuses' });
    return res.json({ ok: true });
  });

  app.post('/api/compte/mdp/changer', async (req, res) => {
    const e = jetonLire(porteur(req), 'session');
    if (!e) return res.status(401).json({ error: 'session_refusee' });
    const b = req.body || {};
    const emp = borne(b.h, 200), neuve = borne(b.hNouveau, 200);
    if (emp.length < 16 || neuve.length < 16) return res.status(400).json({ error: 'empreinte_invalide' });
    if (memeSecret(emp, neuve)) return res.status(400).json({ error: 'mot_de_passe_identique' });
    if (!quotaOk(quota, 'cfm:' + e.m, 30, 3600000)) return res.status(429).json({ error: 'trop_de_tentatives' });
    const mal = await confirmerMdp(e.m, emp);
    if (mal === 'indisponible') return res.status(503).json({ error: 'indisponible' });
    if (mal) return res.status(401).json({ error: 'identifiants_refuses' });
    const c = compte(e.m);
    if (!c) return res.status(401).json({ error: 'session_refusee' });
    const sel = crypto.randomBytes(SEL_OCTETS).toString('hex');
    let cle;
    try { cle = await deriver(neuve, sel); }
    catch (err) { journal('dérivation impossible —', err.code || 'erreur'); return res.status(503).json({ error: 'indisponible' }); }
    c.s = sel; c.e = cle; c.ech = 0; c.bloq = 0; c.maj = Date.now();
    /* ⛔ MÊME RÈGLE QUE `mdp/poser` : on coupe TOUTES les sessions, celle qui parle comprise.
       On rend ensuite un jeton NEUF à l'appelant — sinon la personne qui vient de changer son
       mot de passe se fait déconnecter de la page où elle se tient, ce qui ressemble à une
       panne. Les autres appareils, eux, repassent par la connexion : c'est le but. */
    couperSessions(e.m);
    const jeton = jetonNeuf(e.m, 'session', SESSION_VIE_MS);
    ecrire();
    return res.json({ ok: true, jeton });
  });
  /* ── MOT DE PASSE OUBLIÉ ────────────────────────────────────────────────────────────────── */
  app.post('/api/compte/mdp/demander', async (req, res) => {
    const mail = normMail((req.body || {}).email);
    if (!mailOk(mail)) return res.status(400).json({ error: 'email_invalide' });
    if (!quotaOk(quota, 'mdp:' + mail, 5, 3600000) || !parIp(req, 'mdp', 20)) return res.status(429).json({ error: 'trop_de_tentatives' });
    /* Le courriel part DERRIÈRE la réponse (`gardien`, C4) : l'attendre pour une adresse connue
       seulement faisait dire à la durée lesquelles existent. */
    if (compte(mail)) {
      const j = jetonNeuf(mail, 'mdp', MDP_VIE_MS);
      envoyerDerriere({ to: mail, confidentiel: true, subject: 'Votre nouveau mot de passe — TEAM OP',
        text: 'Bonjour,\n\nPour choisir un nouveau mot de passe :\n'
          + base + '/reinit.html?mode=resetPassword&jeton=' + j + '\n\n'
          + 'Ce lien est valable une heure et ne fonctionne qu\'une fois.\n'
          + 'Si vous n\'avez rien demandé, ignorez ce message : votre mot de passe n\'a pas changé.\n' },
        'courriel de mot de passe non envoyé');
    }
    /* Adresse inconnue : on répond exactement pareil et on n'envoie rien. */
    return res.json(RIEN_DIRE);
  });

  app.post('/api/compte/mdp/poser', async (req, res) => {
    const b = req.body || {};
    const brut = borne(b.jeton, 200);
    const emp = borne(b.h, 200);
    if (emp.length < 16) return res.status(400).json({ error: 'empreinte_invalide' });
    const e = jetonLire(brut, 'mdp');
    if (!e) return res.status(400).json({ error: 'lien_expire' });
    const c = compte(e.m);
    if (!c) { jetonBruler(brut); return res.status(400).json({ error: 'lien_expire' }); }

    const sel = crypto.randomBytes(SEL_OCTETS).toString('hex');
    let cle;
    try { cle = await deriver(emp, sel); }
    catch (err) { journal('dérivation impossible —', err.code || 'erreur'); return res.status(503).json({ error: 'indisponible' }); }
    c.s = sel; c.e = cle; c.ech = 0; c.bloq = 0; c.maj = Date.now();
    /* Le lien est arrivé dans la boîte de l'adresse : c'est la preuve qu'on attendait. Un compte
       « à poser » devient ordinaire, et TOUT compte a désormais son adresse vérifiée — y compris
       celui qu'un tiers avait créé avec elle sans pouvoir la confirmer : son propriétaire le
       reprend ici, et les sessions du tiers tombent juste en dessous. */
    if (c.ap) delete c.ap;
    if (!c.v) c.v = Date.now();
    /* Les sessions en cours tombent — c'est le geste qu'on fait quand on pense s'être fait
       voler quelque chose, et c'est la faute déjà payée côté Firebase (refuser les nouveaux
       jetons sans couper les sessions déjà échangées). Le lien de VÉRIFICATION, lui, survit :
       voir `couperSessions`. */
    couperSessions(e.m);
    ecrire();
    jetonBruler(brut);
    return res.json({ ok: true });
  });

  return {
    ITER, VERIF_VIE_MS, MDP_VIE_MS, SESSION_VIE_MS, ECHECS_MAX, BLOCAGE_MS,
    /* ⛔ LA SEULE FAÇON POUR UN AUTRE MODULE DE SAVOIR QUI PARLE. `portail.js` en a besoin, et
       il ne doit PAS relire `comptes-portail.json` de son côté : deux lectures du même fichier,
       ce sont deux vérités qui divergent le jour où l'une garde un jeton que l'autre a brûlé.
       Rend l'adresse, ou '' — jamais un objet qu'on pourrait prendre pour une autorisation. */
    parJeton: (brut) => { const e = jetonLire(brut, 'session'); const c = e && compte(e.m); return (c && !c.ap) ? e.m : ''; },
    vue,
    /* L'adresse de ce compte a-t-elle été prouvée (lien de vérification, ou lien de mot de passe
       reçu dans sa boîte) ? `portail.js` le demande avant de montrer un dossier repris de Google
       ou d'y déposer un code d'accès. */
    verifie: (mail) => { const c = compte(normMail(mail)); return !!(c && !c.ap && c.v); },
    /* ⛔ LES COMPTES « À POSER », CRÉÉS À L'IMPORT DES DOSSIERS DE GOOGLE (`portail.js`).
       Un dossier repris est rangé sous une ADRESSE ; sans compte maison à cette adresse,
       n'importe qui pouvait le créer AVANT son propriétaire — la connexion n'exige pas une
       adresse vérifiée — et lire le dossier d'un client. Un compte « à poser » ferme la porte :
       « Créer un compte » y tombe sur « déjà existant » (son propriétaire est prévenu par
       courriel, `creer`), la connexion le refuse comme une adresse inconnue, et SEUL le lien de
       « Mot de passe oublié », reçu dans la boîte du client, y pose un mot de passe (`poser`).
       ⛔ ET UN COMPTE DÉJÀ LÀ MAIS JAMAIS VÉRIFIÉ REDEVIENT « À POSER » (`gardien`, B1, rejoué sur le
       vrai serveur). L'import n'existe qu'une fois les comptes allumés : entre les deux, n'importe
       qui pouvait créer le compte d'un client de Google, s'y connecter sans jamais prouver
       l'adresse, et lire son dossier dès l'import. Un compte dont l'adresse n'a jamais été prouvée
       ne prouve rien : son mot de passe s'efface, ses sessions tombent, et le vrai client passe,
       comme les autres, par « Mot de passe oublié ». Un compte VÉRIFIÉ, lui, n'est jamais touché.
       Rend `{ prepares, remis, douteux }` — `douteux` : les adresses dont le compte n'était pas
       sûr, que `portail.js` ne laisse pas garder un dossier posé avant l'import. */
    preparer: (liste) => {
      let prepares = 0, remis = 0; const douteux = [];
      for (const x of (liste || [])) {
        const mail = normMail(x && x.email);
        if (!mailOk(mail)) continue;
        const c = compte(mail);
        if (c && c.v && !c.ap) continue;                     // adresse prouvée : on n'y touche pas
        if (c && c.ap) { douteux.push(mail); continue; }     // déjà « à poser » (import relancé)
        if (c) {
          for (const k of Object.keys(reg.j)) { const e = reg.j[k]; if (e && e.m === mail && e.g !== 'verif') delete reg.j[k]; }
          c.s = ''; c.e = ''; c.ap = 1; c.ech = 0; c.bloq = 0; c.maj = Date.now();
          c.pr = borne(x.prenom, 60) || c.pr; c.no = borne(x.nom, 60) || c.no; c.so = borne(x.societe, 120) || c.so;
          remis++; douteux.push(mail); continue;
        }
        reg.c[mail] = { s: '', e: '', ap: 1, pr: borne(x.prenom, 60), no: borne(x.nom, 60), so: borne(x.societe, 120),
          v: 0, cree: Date.now(), maj: Date.now(), ech: 0, bloq: 0 };
        prepares++; douteux.push(mail);
      }
      if (prepares || remis) ecrire();
      return { prepares, remis, douteux };
    },
    /* ⛔ SUPPRIMER UN COMPTE DU SITE SUPPRIME AUSSI CELUI-CI — le compte ET tous ses jetons. Les
       trois portes de la Tour (fermer un client, suppression totale, compte du site) passaient
       par Google seul : après la bascule, le compte, le dossier et le fil seraient restés chez
       nous pour toujours. Rend `true` s'il existait. */
    supprimer: (mail) => {
      const m = normMail(mail); if (!compte(m)) return false;
      delete reg.c[m];
      for (const k of Object.keys(reg.j)) { const e = reg.j[k]; if (e && e.m === m) delete reg.j[k]; }
      ecrire();
      return true;
    },
    /* Pour la Tour : ce qu'il faut pour trier, jamais un sel ni un vérificateur. */
    liste: () => Object.keys(reg.c).map(m => { const c = reg.c[m] || {};
      return { email: m, prenom: c.pr || '', nom: c.no || '', societe: c.so || '', verifie: !!(c.v && !c.ap), aPoser: !!c.ap,
        cree: c.cree || 0, maj: c.maj || 0 }; }),
    combien: () => Object.keys(reg.c).length,
    sessions: () => Object.keys(reg.j).filter(k => reg.j[k] && reg.j[k].g === 'session').length,
    _reg: () => reg, _relire: lire,
  };
}

module.exports = { monterComptes, ITER, deriver, memeSecret, normMail, mailOk };
