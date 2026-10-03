/* ⛔ CE QUE CE FICHIER GARDE — LE COURRIEL D'INVITATION AUX RÉUNIONS (étape 6, lot 5) : LE VRAI MODULE, LE VRAI SERVICE, UN FAUX RELAIS SMTP, ET L'OUTIL DE CONFIGURATION.

   `test-973` joue les routes des réunions, `test-974` le planificateur ; celui-ci joue la dernière pièce : l'hôte écrit l'adresse de quelqu'un qui n'a pas OP MESSAGES, et un courriel part avec le
   fichier .ics. Ce qui est gardé, dans l'ordre :

     · l'adresse : une boîte, une ligne, jamais une injection d'en-tête, jamais deux destinataires ; comptée sur sa forme normalisée (majuscules, « +étiquette ») ;
     · INERTE sans relais, et le DIT (503 `courriel_non_ouvert`, `/api/config` → `courriel.ouvert:false`) — même pour une adresse fausse, sans rien ranger, sans charger la bibliothèque d'envoi ;
     · le message QUI PART, relu par un faux relais comme le relirait un vrai : enveloppe, en-têtes, gabarit FIXE (objet, texte simple, aucun lien), pièce jointe .ics DÉCODÉE et comparée au fichier de la
       route `GET …/ics` ; le point doublé (RFC 5321 § 4.5.2) est défait par le relais du banc, sinon il accuserait le service ;
     · deux plafonds DURABLES, à la milliseconde : dix par compte et par 24 heures, deux par destinataire et par 7 jours (la boîte, pas l'écriture) — un redémarrage ne les remet pas à zéro, un envoi
       en vol compte déjà (deux demandes simultanées ne passent pas à deux quand il n'en reste qu'une), un relais qui refuse RENDS la place ;
     · le canal : TLS implicite et STARTTLS jouent pour de vrai (un certificat fabriqué par `openssl`, déclaré à la machine par `NODE_EXTRA_CA_CERTS`) ; un relais qui n'offre pas STARTTLS n'a JAMAIS vu
       l'identifiant ni le mot de passe ; un certificat qu'on ne connaît pas est refusé ;
     · RIEN d'une adresse, d'un identifiant ou d'un mot de passe n'est rangé, journalisé, publié ou répondu : la base, la sortie du service, /health, /api/config et chaque réponse HTTP sont lus ;
     · la configuration : chaque bloc à moitié posé REFUSE le démarrage (et le message ne cite pas le secret) ; l'outil `configurer-courriel.js` éprouve le relais AVANT d'écrire, n'affiche rien de masqué,
       n'écrit qu'un fichier que le service accepte (0600, autres clés intactes) — et ce fichier-là suffit à faire partir un courriel.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de la population qu'il aurait pu compter. Les secrets du banc sont fictifs et portent des lettres
   hors de [0-9a-f] : jamais le hasard d'une empreinte. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net'), tls = require('tls'), crypto = require('crypto');
const { spawn, spawnSync } = require('child_process');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const COURRIEL = require(path.join(T.SERVICE, 'courriel.js'));
const CONFIG = require(path.join(T.SERVICE, 'config.js'));

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

const MIN = 60000, HEURE = 3600000, JOUR = 86400000;
const ZERO = Date.UTC(2026, 9, 19, 8, 0, 0);          // lundi 19 octobre 2026, 08:00 UTC = 10:00 à Paris (l'heure d'été court encore)
const L26 = Date.UTC(2026, 9, 26, 13, 0);             // lundi 26 octobre, 14:00 à Paris — l'heure d'hiver est revenue le dimanche 25
const SUJET = 'Invitation à une réunion — OP MESSAGES';
const CANARI_T = 'TITRE-WQXZ-CANARI', CANARI_L = 'LIEU-WQXZ-CANARI';
const ADR = (n) => 'wqxz.dest' + n + '@exemple.invalid';   // des lettres hors [0-9a-f] : jamais le hasard d'une empreinte
const UTIL = 'UTIL-WQXZ-CANARI', MDP = 'MDP-WQXZ-CANARI-7', MDP_FAUX = 'MDP-FAUX-WQXZ', EXPEDITEUR = 'invitations@exemple.invalid';
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-975-'));
process.on('exit', () => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) { /* déjà parti */ } });
const dort = T.dort;
const lance = (f) => { try { f(); return null; } catch (e) { return e.code === 'CONFIG' ? String(e.message).replace(/^config: /, '') : (e.code || e.message); } };
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');

const { fauxRelais, lireMessage, sansDtstamp, TEXTE_RELAIS } = require('./outils-relais');   // le faux relais et la lecture d'un courriel vivent dans `outils-relais.js` (la sonde navigateur s'en sert aussi)

/* ═══ UN CERTIFICAT POUR LE FAUX RELAIS ═════════════════════════════════════════════════════════════════════════════════════════════════════════ */
function fabriquerCertificat() {
  const cle = path.join(bac, 'relais.key'), crt = path.join(bac, 'relais.crt');
  const r = spawnSync('openssl', ['req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-keyout', cle, '-out', crt, '-days', '2', '-subj', '/CN=127.0.0.1', '-addext', 'subjectAltName=IP:127.0.0.1'], { encoding: 'utf8', timeout: 30000 });
  return r.status === 0 && fs.existsSync(cle) && fs.existsSync(crt) ? { cle, crt } : null;
}

/* ═══ UN SERVICE, SA BASE OUVERTE À CÔTÉ (WAL : deux processus, une base), L'HORLOGE CALÉE SUR ZERO ═══════════════════════════════════════════ */
async function monter(config, opts) {
  const o = Object.assign({ env: {}, reprise: null, decal: null }, opts || {});
  const svc = await T.lancerService(Object.assign({ horloge: true, config, env: o.env }, o.reprise || {}));
  let decal = o.decal !== null ? o.decal : ZERO - Date.now(); svc.avancer(decal);
  const maintenant = () => Date.now() + decal;
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')), horloge: maintenant });
  let k = 0;
  const pers = (nom, nomFamille) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: nomFamille || 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 60 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const lignes = () => Number(sql('SELECT COUNT(*) AS n FROM courrier_envoi').n);
  const avancer = (ms) => { decal += ms; svc.avancer(ms); };
  return { svc, S, pers, cl, sql, lignes, avancer, maintenant, decal: () => decal, fermer: async (nettoyer) => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(nettoyer); } };
}
const RELAIS_CFG = (relais, extra) => Object.assign({ hote: '127.0.0.1', port: relais.port, securite: 'aucune', utilisateur: UTIL, mot_de_passe: MDP, de: EXPEDITEUR, timeoutMs: 3000 }, extra || {});
const QUOTAS_LARGES = { reunion: { max: 100000, fenetreMs: HEURE }, ics: { max: 100000, fenetreMs: MIN }, courriel: { max: 100000, fenetreMs: MIN } };
const B0 = { titre: 'Point ' + CANARI_T, lieu: CANARI_L, debut: '2026-10-26T14:00', fin: '2026-10-26T15:00', tz: 'Europe/Paris' };
const mk = async (cli, extra) => { const r = await cli.post('/api/reunions', Object.assign({}, B0, extra || {})); if (r.code !== 201) throw new Error('création de banc refusée : ' + r.code + ' ' + JSON.stringify(r.j)); return r.j.reunion; };

/* un petit programme qui ESSAIE le relais comme le ferait le service (une connexion, la sécurité, l'authentification — aucun courriel), dans un processus à part : c'est la seule façon de lui faire
   connaître le certificat du banc (`NODE_EXTRA_CA_CERTS` se lit au démarrage du processus) */
const PROGRAMME_ESSAI = `
  const { courrielConfig } = require(process.env.BANC_CONFIG), { creerCourriel } = require(process.env.BANC_COURRIEL);
  const c = creerCourriel({ config: { courriel: courrielConfig({ courriel: JSON.parse(process.env.BANC_CFG) }, 'beta') } });
  c.verifier().then(() => { console.log(JSON.stringify({ ok: true })); c.arreter(); }, (e) => { console.log(JSON.stringify({ ok: false, code: e && e.code })); c.arreter(); });`;
function essayerRelais(cfg, env) {
  return new Promise((resolve) => {
    const enfant = spawn(process.execPath, ['-e', PROGRAMME_ESSAI], { env: Object.assign({}, process.env, { BANC_CONFIG: path.join(T.SERVICE, 'config.js'), BANC_COURRIEL: path.join(T.SERVICE, 'courriel.js'), BANC_CFG: JSON.stringify(cfg) }, env || {}), stdio: ['ignore', 'pipe', 'pipe'] });
    let sortie = ''; enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { sortie += d; });
    const minuteur = setTimeout(() => { try { enfant.kill('SIGKILL'); } catch (e) { /* déjà sorti */ } }, 25000);
    enfant.on('exit', () => { clearTimeout(minuteur); try { resolve(JSON.parse(sortie.trim().split('\n').pop())); } catch (e) { resolve({ ok: false, code: 'ILLISIBLE', sortie: sortie.slice(0, 300) }); } });
  });
}

(async () => {
  /* ═══ 1. L'ADRESSE ══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('L\'adresse du destinataire : une boîte, une ligne — jamais une injection d\'en-tête, jamais deux destinataires');
  {
    const OK = ['a.b@exemple.invalid', 'prenom.nom+etiquette@sous.domaine.exemple.fr', 'o\'neil@exemple.fr', 'x_y-z@e-x.fr'];
    v('des adresses ordinaires passent, telles quelles (population : quatre)', OK.map(a => COURRIEL.adresseValide(a)), OK);
    v('… les blancs de bord sont retirés', COURRIEL.adresseValide('  a.b@exemple.invalid \n'), 'a.b@exemple.invalid');
    const KO = ['', ' ', 'a', 'a@', '@exemple.fr', 'a@exemple', 'a b@exemple.fr', 'a@exemple.fr\r\nBcc: x@exemple.fr', 'a@exemple.fr\nBcc: x@exemple.fr', 'a@exemple.fr,b@exemple.fr', 'a@exemple.fr;b@exemple.fr', '<a@exemple.fr>', 'Ana <a@exemple.fr>',
      '"a"@exemple.fr', 'a@@exemple.fr', 'é@exemple.fr', 'a@é.fr', 'a@exemple..fr', 'a@-exemple.fr', 'a@exemple.fr.', 'a@127.0.0.1', 'a@[127.0.0.1]', 'a@exemple.fr\u0000', 'a@exemple.fr\\', 'a(c)@exemple.fr', 'a:b@exemple.fr',
      'x'.repeat(250) + '@e.fr', 'a'.repeat(65) + '@exemple.fr', 'a@b.c',
      'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(63) + '.fr'];   // la dernière : toutes ses parties sont permises, c'est sa LONGUEUR (259) qui la refuse
    v('⛔ chaque forme dangereuse ou fausse est refusée (population : ' + KO.length + ' : un saut de ligne, deux adresses, un nom affiché, une adresse numérique, une partie locale de 65 signes, une adresse de 259 signes, trop courte pour être une boîte…)', KO.filter(a => COURRIEL.adresseValide(a) !== null), []);
    const LONGUE_OK = 'a'.repeat(64) + '@' + 'b'.repeat(63) + '.' + 'c'.repeat(63) + '.' + 'd'.repeat(58) + '.fr';   // 254 signes pile : la limite passe
    v('… et la limite est à 254 signes (254 passe, 259 non) et à 6 signes au plus bas (« a@b.cd »)', [LONGUE_OK.length, COURRIEL.adresseValide(LONGUE_OK) === LONGUE_OK, COURRIEL.adresseValide('a@b.cd')], [254, true, 'a@b.cd']);
    v('… et ce qui n\'est pas du texte aussi', [null, undefined, 12, true, ['a@exemple.fr'], { a: 1 }].map(a => COURRIEL.adresseValide(a)), [null, null, null, null, null, null]);
    const meme = ['Wqxz.Canari+a@Exemple.Invalid', 'wqxz.canari@exemple.invalid', 'WQXZ.CANARI+zz@EXEMPLE.invalid'].map(COURRIEL.normalisee);
    v('⛔ une boîte, trois écritures : les majuscules et l\'« +étiquette » ne font pas une autre boîte (population : trois)', [meme[0], meme[1], meme[2]], ['wqxz.canari@exemple.invalid', 'wqxz.canari@exemple.invalid', 'wqxz.canari@exemple.invalid']);
    v('… et une étiquette SEULE n\'efface pas la partie locale (sinon toutes les adresses de ce genre tomberaient dans la même boîte)', [COURRIEL.normalisee('+x@D.fr'), COURRIEL.normalisee('+y@D.fr')], ['+x@d.fr', '+y@d.fr']);
    const gmail = ['J.Dupont@Gmail.com', 'jdupont@gmail.com', 'j.dupont+travail@googlemail.com', 'JDU.PONT@GOOGLEMAIL.COM', 'j.d.u.p.o.n.t@gmail.com'].map(COURRIEL.normalisee);
    v('⛔ GMAIL ignore les points de la partie locale et sert googlemail.com comme gmail.com : une boîte, cinq écritures (population : cinq) — sans quoi « deux par semaine » se contournait en variant les points', gmail, Array(5).fill('jdupont@gmail.com'));
    v('… ailleurs qu\'à Gmail un point COMPTE : `a.b@exemple.fr` et `ab@exemple.fr` sont deux boîtes (le même nom chez un autre fournisseur n\'est pas la même boîte), et `a.b@gmail.com.fr` n\'est pas Gmail',
      [COURRIEL.normalisee('a.b@exemple.fr'), COURRIEL.normalisee('ab@exemple.fr'), COURRIEL.normalisee('a.b@gmail.com.fr'), COURRIEL.normalisee('a.b@notgmail.com')], ['a.b@exemple.fr', 'ab@exemple.fr', 'a.b@gmail.com.fr', 'a.b@notgmail.com']);
    v('… et une partie locale faite de points seuls n\'est pas vidée', COURRIEL.normalisee('...@gmail.com'), '...@gmail.com');
  }

  /* ═══ 2. LE GABARIT ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe gabarit du message : fixe, en texte simple, sans lien');
  {
    const hote = { prenom: 'Ana', nom: 'Banc' }, r = { titre: 'Point ' + CANARI_T, lieu: CANARI_L, tz: 'Europe/Paris', repetition: 'hebdomadaire' };
    const c1 = COURRIEL.corpsDuMessage(hote, r, L26, true), c2 = COURRIEL.corpsDuMessage(hote, r, L26, false), c3 = COURRIEL.corpsDuMessage(hote, Object.assign({}, r, { lieu: '' }), L26, true);
    v('du TEXTE : des fins de ligne CRLF, aucune balise, aucune adresse web', [/\r\n/.test(c1), /<[a-z\/!]/i.test(c1), /https?:|www\.|\/#/i.test(c1)], [true, false, false]);
    v('il nomme l\'hôte, le titre, le lieu et l\'heure dans le fuseau de la réunion', [/Ana Banc vous invite à une réunion\./.test(c1), c1.includes('Réunion : Point ' + CANARI_T), c1.includes('Lieu : ' + CANARI_L), c1.includes('Quand : lundi 26 octobre à 14:00 (heure de Europe/Paris)')], [true, true, true, true]);
    v('⛔ il dit que la série SE RÉPÈTE quand le fichier porte la série — et le tait pour une seule occurrence (elle ne se répète pas)', [/— se répète chaque semaine/.test(c1), /se répète/.test(c2)], [true, false]);
    v('sans lieu, pas de ligne « Lieu » vide', [/Lieu :/.test(c3)], [false]);
    v('⛔ il dit d\'où vient le message, qu\'on n\'y répond pas, et qu\'on peut l\'ignorer sans rien inscrire', [/envoyé par OP MESSAGES à la demande de Ana Banc/.test(c1), /Vous ne pouvez pas y répondre/.test(c1), /ignorez-le : rien n'est inscrit à votre nom/.test(c1)], [true, true, true]);
    v('l\'objet est FIXE', COURRIEL.SUJET, SUJET);
  }

  /* ═══ 3. LA CONFIGURATION ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLa configuration : inerte sans relais, un bloc à moitié posé refuse le démarrage, le secret ne se copie pas');
  {
    const cc = (b, inst) => CONFIG.courrielConfig({ courriel: b }, inst || 'prod');
    const base = { hote: 'smtp.exemple.invalid', de: EXPEDITEUR, utilisateur: UTIL, mot_de_passe: MDP };
    for (const [nom, b] of [['aucun bloc', undefined], ['un bloc vide', {}], ['un hôte vide', { hote: '' }], ['un hôte nul', { hote: null }]]) v('INERTE : ' + nom, [cc(b).mode, cc(b).hote], ['inerte', null]);
    for (const k of ['port', 'securite', 'utilisateur', 'mot_de_passe', 'de']) vrai('⛔ « ' + k + ' » sans hôte : un bloc à moitié posé REFUSE le démarrage (pas un relais qu\'on croirait ouvert)', /courriel\.[a-z_]+ sans courriel\.hote/.test(String(lance(() => cc({ [k]: k === 'port' ? 587 : 'x' })))));
    const ok = cc(base);
    v('un bloc complet : relais ouvert, STARTTLS par défaut, port 587, nom « OP MESSAGES », 15 s', [ok.mode, ok.securite, ok.port, ok.nom, ok.timeoutMs, ok.hote, ok.de, ok.utilisateur], ['smtp', 'starttls', 587, 'OP MESSAGES', 15000, 'smtp.exemple.invalid', EXPEDITEUR, UTIL]);
    v('… le port suit la sécurité : ssl 465, aucune (relais local) 25', [cc(Object.assign({}, base, { securite: 'ssl' })).port, cc(Object.assign({}, base, { hote: '127.0.0.1', securite: 'aucune' })).port], [465, 25]);
    v('⛔ « aucune » (en clair) est REFUSÉE en production hors d\'un relais local — le mot de passe ne traverse pas Internet en clair ; acceptée vers 127.0.0.1 et localhost, et sur la bêta',
      [lance(() => cc(Object.assign({}, base, { securite: 'aucune' }))), lance(() => cc(Object.assign({}, base, { hote: '127.0.0.1', securite: 'aucune' }))), lance(() => cc(Object.assign({}, base, { hote: 'localhost', securite: 'aucune' }))), lance(() => cc(Object.assign({}, base, { securite: 'aucune' }), 'beta'))],
      ['courriel.securite « aucune » est refusée en production hors d\'un relais local : un mot de passe ne traverse pas Internet en clair', null, null, null]);
    const REFUS = [
      ['un hôte avec une espace', { hote: 'smtp exemple' }, 'courriel.hote doit être un nom d\'hôte'], ['un hôte avec un saut de ligne', { hote: 'smtp.exemple.invalid\r\nX: y' }, 'courriel.hote doit être un nom d\'hôte'],
      ['un hôte qui est une adresse web', { hote: 'https://smtp.exemple.invalid' }, 'courriel.hote doit être un nom d\'hôte'], ['un hôte qui n\'est pas du texte', { hote: 25 }, 'courriel.hote doit être un nom d\'hôte'],
      ['une sécurité inconnue', { securite: 'tls' }, 'courriel.securite doit valoir ssl, starttls ou aucune'],
      ['un port à 0', { port: 0 }, 'courriel.port doit être un entier entre 1 et 65535'], ['un port à 65536', { port: 65536 }, 'courriel.port doit être un entier entre 1 et 65535'], ['un port écrit en texte', { port: '587' }, 'courriel.port doit être un entier entre 1 et 65535'],
      ['un identifiant sans mot de passe', { mot_de_passe: undefined }, 'courriel.utilisateur et courriel.mot_de_passe vont ensemble'], ['un mot de passe sans identifiant', { utilisateur: undefined }, 'courriel.utilisateur et courriel.mot_de_passe vont ensemble'],
      ['un identifiant sur deux lignes', { utilisateur: 'a\nb' }, 'courriel.utilisateur doit être un texte d\'une ligne'], ['un mot de passe de 501 signes', { mot_de_passe: 'x'.repeat(501) }, 'courriel.mot_de_passe doit être un texte d\'une ligne'],
      ['pas d\'adresse d\'expédition', { de: undefined }, 'courriel.de doit être l\'adresse d\'expédition'], ['une adresse d\'expédition fausse', { de: 'pas une adresse' }, 'courriel.de doit être l\'adresse d\'expédition'],
      ['un nom de 61 signes', { nom: 'N'.repeat(61) }, 'courriel.nom doit être un texte d\'une ligne'], ['un nom avec un saut de ligne', { nom: 'a\nb' }, 'courriel.nom doit être un texte d\'une ligne'],
      ['un délai de 999 ms', { timeoutMs: 999 }, 'courriel.timeoutMs doit être un entier entre 1000 et 60000'], ['un délai de 60001 ms', { timeoutMs: 60001 }, 'courriel.timeoutMs doit être un entier entre 1000 et 60000'], ['un délai écrit en texte', { timeoutMs: '5000' }, 'courriel.timeoutMs doit être un entier entre 1000 et 60000'],
    ];
    const lances = REFUS.map(([, extra]) => lance(() => cc(Object.assign({}, base, extra))));
    v('⛔ chaque réglage faux REFUSE le démarrage, et dit lequel (population : ' + REFUS.length + ')', lances.map((m, i) => m !== null && m.startsWith(REFUS[i][2])), REFUS.map(() => true));
    v('⛔ et le message du refus ne cite JAMAIS le mot de passe ni l\'identifiant', lances.filter(m => m && (m.includes(MDP) || m.includes(UTIL))), []);
    v('les bornes passent : 1000 et 60000 ms, port 1 et 65535, nom de 60 signes', [cc(Object.assign({}, base, { timeoutMs: 1000 })).timeoutMs, cc(Object.assign({}, base, { timeoutMs: 60000 })).timeoutMs, cc(Object.assign({}, base, { port: 1 })).port, cc(Object.assign({}, base, { port: 65535 })).port, cc(Object.assign({}, base, { nom: 'N'.repeat(60) })).nom.length], [1000, 60000, 1, 65535, 60]);
    for (const x of ['texte', 12, ['a'], true]) vrai('un bloc qui n\'est pas un objet (' + JSON.stringify(x) + ') REFUSE le démarrage', /courriel doit être un objet/.test(String(lance(() => cc(x)))));
    v('un relais SANS identifiant (local) est permis : aucune authentification demandée', [cc({ hote: '127.0.0.1', securite: 'aucune', de: EXPEDITEUR }).utilisateur, cc({ hote: '127.0.0.1', securite: 'aucune', de: EXPEDITEUR }).motDePasse], [null, null]);
    v('⛔ le mot de passe SE LIT mais ne se copie ni ne se sérialise (un `JSON.stringify(config)` ou un `Object.assign` oublié dans un journal ne l\'emporte pas)',
      [ok.motDePasse, JSON.stringify(ok).includes(MDP), Object.keys(ok).includes('motDePasse'), JSON.stringify(Object.assign({}, ok)).includes(MDP), require('util').inspect(ok).includes(MDP)], [MDP, false, false, false, false]);
  }

  /* ═══ 4. INERTE SANS RELAIS, LE MODULE SEUL ═════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nSans relais, le module est INERTE : il refuse, ne range rien, et ne charge même pas la bibliothèque d\'envoi');
  const KEK = crypto.randomBytes(32);
  let nAtelier = 0;
  function atelier(t0, courriel) {
    const h = { t: t0 };
    const scelleur = creerScelleur(KEK);
    const S = ouvrir({ chemin: path.join(bac, 'msg-' + (++nAtelier) + '.db'), scelleur, horloge: () => h.t });
    const journal = [];
    const ana = S.personneCreer({ identifiant: 'beta:Ana' + nAtelier, prenom: 'Ana', nom: 'Banc', origine: 'beta', verifie: true });
    const c = COURRIEL.creerCourriel({ config: { courriel }, stockage: S, scelleur, horloge: () => h.t, journaliser: (evt, champs) => journal.push({ evt, champs: champs || {} }) });
    const destH = (adresse) => scelleur.hmac('courrier', 'destinataire', COURRIEL.normalisee(adresse));
    const rangs = () => Number(S.courrierCompter({ uid: ana.id, destH: destH(ADR(0)), depuis: { compte: 0, destinataire: 0 } }).compte);
    return { h, S, c, ana, journal, scelleur, destH, rangs };
  }
  const REUNION = { id: 'r_' + 'a1'.repeat(16), titre: 'Point ' + CANARI_T, lieu: CANARI_L, debut: L26, fin: L26 + HEURE, tz: 'Europe/Paris', repetition: 'hebdomadaire', n: null, jusqua: null, annulee: false, version: 1, rappels: [15] };
  const HOTE = { prenom: 'Ana', nom: 'Banc' };
  const chargeeNodemailer = () => Object.keys(require.cache).some(k => /node_modules[\\/]nodemailer[\\/]/.test(k));
  {
    const a = atelier(ZERO, CONFIG.courrielConfig({}, 'prod'));
    v('population : avant tout envoi, la bibliothèque d\'envoi n\'est pas chargée', chargeeNodemailer(), false);
    const e1 = await a.c.envoyer({ uid: a.ana.id, hote: HOTE, destinataire: ADR(1), reunion: REUNION }).then(() => 'envoyé', (e) => e.code);
    const e2 = await a.c.envoyer({ uid: a.ana.id, hote: HOTE, destinataire: 'pas une adresse', reunion: REUNION }).then(() => 'envoyé', (e) => e.code);
    const e3 = await a.c.verifier().then(() => 'vérifié', (e) => e.code);
    v('⛔ INERTE : un envoi est refusé « courriel_non_ouvert » — AVANT de juger l\'adresse (une adresse fausse ne dit pas autre chose), et la vérification aussi', [a.c.ouvert(), e1, e2, e3], [false, 'courriel_non_ouvert', 'courriel_non_ouvert', 'courriel_non_ouvert']);
    v('… rien n\'est rangé, rien n\'est journalisé, et la bibliothèque d\'envoi n\'a TOUJOURS pas été chargée', [a.rangs(), a.journal.length, chargeeNodemailer()], [0, 0, false]);
    a.S.fermer();
  }

  /* ═══ 5. LE MODULE CONTRE UN FAUX RELAIS ════════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe module contre un faux relais : un message, les plafonds à la milliseconde, un envoi en vol compte déjà, un refus rend la place');
  {
    const relais = await fauxRelais({ auth: { utilisateur: UTIL, mdp: MDP } });
    const b = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais) }, 'prod'));
    const envoie = (destinataire, extra) => b.c.envoyer(Object.assign({ uid: b.ana.id, hote: HOTE, destinataire, reunion: REUNION }, extra || {})).then(() => 'ok', (e) => e.code);
    const etat = () => ({ lignes: b.rangs(), mails: relais.messages.length });
    v('population : le relais est ouvert, la bibliothèque d\'envoi ne se charge qu\'au premier usage', [b.c.ouvert(), chargeeNodemailer()], [true, false]);
    v('⛔ `verifier` joue une connexion et l\'authentification — sans envoyer de courriel', [await b.c.verifier(), relais.etat.auths, relais.messages.length, chargeeNodemailer()], [true, [true], 0, true]);

    /* un mot de passe faux : l'envoi échoue, et la place est RENDUE */
    const faux = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais, { mot_de_passe: MDP_FAUX }) }, 'prod'));
    const eFaux = await faux.c.envoyer({ uid: faux.ana.id, hote: HOTE, destinataire: ADR(1), reunion: REUNION }).then(() => 'ok', (e) => e.code);
    const vFaux = await faux.c.verifier().then(() => 'vérifié', (e) => e.code);
    v('⛔ un mot de passe FAUX : l\'envoi dit « courriel_echec » (jamais le texte du relais), la vérification dit EAUTH, le relais a refusé deux fois, aucun message n\'est parti, et RIEN n\'est compté',
      [eFaux, vFaux, relais.etat.auths.slice(1), relais.messages.length, faux.rangs(), faux.journal.map(j => j.evt + ':' + j.champs.etat + ':' + j.champs.nom)], ['courriel_echec', 'EAUTH', [false, false], 0, 0, ['courriel:echec:EAUTH']]);
    faux.S.fermer();
    relais.etat.auths.length = 0;

    const avant = etat();
    v('⛔ une adresse fausse est refusée AVANT toute réservation et tout contact avec le relais', [await envoie('pas une adresse'), etat()], ['courriel_invalide', avant]);
    v('⛔ un envoi qui PART : « ok », une ligne réservée, un message chez le relais, une ligne de journal qui ne porte qu\'un état', [await envoie(ADR(1)), etat(), b.journal.map(j => j.evt + ':' + j.champs.etat)], ['ok', { lignes: 1, mails: 1 }, ['courriel:envoye']]);
    const m1 = lireMessage(relais.messages[0]);
    v('… le relais a reçu l\'enveloppe (expéditeur, UN destinataire) et le courriel sur un canal en clair (relais local)', [m1.enveloppe.de, m1.enveloppe.a, m1.tls, relais.etat.auths], [EXPEDITEUR, [ADR(1)], false, [true]]);

    /* les plafonds, à la milliseconde. Ana a déjà envoyé UN courriel à la boîte ADR(1), à ZERO. */
    const t0 = b.h.t;
    v('un second courriel à la même boîte (écrite autrement) passe : c\'est le deuxième sur deux', [await envoie('WQXZ.Dest1+Etiquette@EXEMPLE.invalid'), etat().lignes], ['ok', 2]);
    v('⛔ le TROISIÈME à cette boîte est refusé (deux par destinataire) — quelle que soit l\'écriture de l\'adresse —, sans réserver ni contacter le relais', [await envoie(ADR(1)), await envoie('WQXZ.DEST1@exemple.invalid'), etat()], ['courriel_quota_destinataire', 'courriel_quota_destinataire', { lignes: 2, mails: 2 }]);
    b.h.t = t0 + 7 * JOUR;
    v('⛔ la fenêtre de 7 jours est à la milliseconde : à l\'instant PILE où le plus ancien aurait sept jours, il compte encore', await envoie(ADR(1)), 'courriel_quota_destinataire');
    b.h.t = t0 + 7 * JOUR + 1;
    v('… une milliseconde plus tard la boîte est libre', [await envoie(ADR(1)), etat().lignes], ['ok', 3]);

    /* le plafond du compte : dix par 24 heures */
    const c = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais) }, 'prod'));
    const envC = (destinataire, uid) => c.c.envoyer({ uid: uid || c.ana.id, hote: HOTE, destinataire, reunion: REUNION }).then(() => 'ok', (e) => e.code);
    const dix = []; for (let i = 1; i <= 10; i++) dix.push(await envC(ADR(100 + i)));
    v('population : dix courriels à dix boîtes différentes passent (le dixième est le dernier)', [dix.every(x => x === 'ok'), c.rangs()], [true, 10]);
    const mails10 = relais.messages.length;
    v('⛔ le ONZIÈME, à une boîte neuve, est refusé « courriel_quota_compte » — sans réserver ni contacter le relais', [await envC(ADR(111)), c.rangs(), relais.messages.length === mails10], ['courriel_quota_compte', 10, true]);
    c.h.t = ZERO + JOUR;
    v('⛔ la fenêtre de 24 heures est à la milliseconde : à l\'instant PILE, les dix comptent encore', await envC(ADR(111)), 'courriel_quota_compte');
    c.h.t = ZERO + JOUR + 1;
    v('… une milliseconde plus tard, le compte est libre', [await envC(ADR(111)), c.rangs()], ['ok', 11]);
    const ben = c.S.personneCreer({ identifiant: 'beta:Ben-c', prenom: 'Ben', nom: 'Banc', origine: 'beta', verifie: true });
    v('⛔ le plafond d\'une BOÎTE est commun à tous les hôtes (trois hôtes ne pourraient pas inonder une même personne) : Ben, à zéro envoi, écrit UNE fois à la boîte qui a déjà reçu un courriel d\'Ana, pas deux ; le plafond du COMPTE est propre à chacun',
      [await envC(ADR(101), ben.id), await envC(ADR(101), ben.id), c.S.courrierCompter({ uid: ben.id, destH: c.destH(ADR(101)), depuis: { compte: 0, destinataire: 0 } })], ['ok', 'courriel_quota_destinataire', { compte: 1, destinataire: 2 }]);

    /* GMAIL : le plafond d'une boîte se compte sur la boîte, pas sur l'écriture de ses points */
    const gm = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais) }, 'prod'));
    const envG = (destinataire) => gm.c.envoyer({ uid: gm.ana.id, hote: HOTE, destinataire, reunion: REUNION }).then(() => 'ok', (x) => x.code);
    v('⛔ GMAIL : la même boîte écrite avec d\'autres points, une étiquette, puis en googlemail.com : les deux premiers envois passent, le TROISIÈME est refusé « courriel_quota_destinataire » (population : deux passent, deux lignes)',
      [await envG('Wqxz.Gm.Un@gmail.com'), await envG('wqxzgmun+rdv@googlemail.com'), await envG('w.q.x.z.g.m.u.n@GMAIL.com'), gm.rangs()], ['ok', 'ok', 'courriel_quota_destinataire', 2]);
    v('… une AUTRE boîte Gmail (un autre nom) n\'est pas touchée', [await envG('wqxz.gm.deux@gmail.com'), gm.rangs()], ['ok', 3]);

    /* un envoi EN VOL compte déjà : deux demandes simultanées pour la dernière place d'une boîte */
    const d = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais) }, 'prod'));
    const envD = () => d.c.envoyer({ uid: d.ana.id, hote: HOTE, destinataire: ADR(200), reunion: REUNION }).then(() => 'ok', (x) => x.code);
    await d.c.envoyer({ uid: d.ana.id, hote: HOTE, destinataire: ADR(200), reunion: REUNION });
    relais.etat.retenir = true;
    const p1 = envD(), p2 = envD();
    const premier = await Promise.race([p1, p2]);        // le refusé se règle sans le relais ; l'autre attend que le relais réponde
    const enVol = await T.attendre(async () => relais.etat.retenus.length, 8000);   // le relais retient bien UN message (la population de la mesure) avant qu'on le relâche
    relais.relacher();
    const [r1, r2] = await Promise.all([p1, p2]);
    v('⛔ DEUX demandes simultanées pour la dernière place d\'une boîte (une sur deux déjà prise) : UNE passe, l\'autre est refusée tout de suite — l\'envoi en vol compte déjà (la place se prend AVANT de partir, pas après) ; population : le relais retenait bien un message',
      [premier, enVol, [r1, r2].sort(), d.rangs()], ['courriel_quota_destinataire', 1, ['courriel_quota_destinataire', 'ok'], 2]);

    /* un relais qui REFUSE rend la place */
    const e = atelier(ZERO, CONFIG.courrielConfig({ courriel: RELAIS_CFG(relais) }, 'prod'));
    const envE = (destinataire) => e.c.envoyer({ uid: e.ana.id, hote: HOTE, destinataire, reunion: REUNION }).then(() => 'ok', (x) => x.code);
    relais.etat.rcpt = 'refus';
    const sRcpt = await envE(ADR(300));
    relais.etat.rcpt = 'ok'; relais.etat.data = 'refus';
    const sData = await envE(ADR(300));
    relais.etat.data = 'ok';
    v('⛔ un relais qui refuse le destinataire, puis le message : « courriel_echec » deux fois, AUCUNE place consommée (le compte ET la boîte restent à zéro), deux lignes de journal d\'échec sans adresse',
      [sRcpt, sData, e.rangs(), e.journal.map(j => j.champs.etat + ':' + j.champs.nom)], ['courriel_echec', 'courriel_echec', 0, ['echec:EENVELOPE', 'echec:EMESSAGE']]);
    v('… et la place rendue sert : le même destinataire reçoit ensuite deux fois, pas trois', [await envE(ADR(300)), await envE(ADR(300)), await envE(ADR(300)), e.rangs()], ['ok', 'ok', 'courriel_quota_destinataire', 2]);
    v('⛔ aucun journal du module ne cite une adresse, un titre ou un nom (population : ' + (b.journal.length + c.journal.length + d.journal.length + e.journal.length) + ' lignes)', JSON.stringify([b.journal, c.journal, d.journal, e.journal]).match(/wqxz|WQXZ|Banc|Ana/g), null);
    /* un relais SANS identifiant (un relais local) : le courriel part, aucune authentification n'est tentée */
    const libre = await fauxRelais({ annoncerAuth: true });
    const l = atelier(ZERO, CONFIG.courrielConfig({ courriel: { hote: '127.0.0.1', port: libre.port, securite: 'aucune', de: EXPEDITEUR, timeoutMs: 3000 } }, 'prod'));
    const eL = await l.c.envoyer({ uid: l.ana.id, hote: HOTE, destinataire: ADR(800), reunion: REUNION }).then(() => 'ok', (x) => x.code);
    v('un relais SANS identifiant (local), qui OFFRE pourtant l\'authentification : le courriel part, et aucune authentification n\'est tentée (population : le message est arrivé)', [eL, libre.messages.length, libre.etat.commandes.includes('AUTH'), l.rangs()], ['ok', 1, false, 1]);
    l.S.fermer(); await libre.fermer();
    for (const x of [b, c, d, e]) x.S.fermer();
    await relais.fermer();
  }

  /* ═══ 6. LE CANAL : TLS IMPLICITE, STARTTLS, PAS DE REPLI EN CLAIR, UN CERTIFICAT INCONNU REFUSÉ ═════════════════════════════════════════════ */
  console.log('\nLe canal : TLS implicite et STARTTLS jouent pour de vrai, jamais de repli en clair, un certificat inconnu est refusé');
  const cert = fabriquerCertificat();
  vrai('population : `openssl` a fabriqué un certificat pour 127.0.0.1 (sans lui, ces essais ne diraient rien)', cert !== null);
  const identifiants = { utilisateur: UTIL, mdp: MDP };
  if (cert) {
    const confiance = { NODE_EXTRA_CA_CERTS: cert.crt };
    const ssl = await fauxRelais({ auth: identifiants, tls: 'implicite', cert });
    const rSsl = await essayerRelais(RELAIS_CFG(ssl, { securite: 'ssl' }), confiance);
    v('⛔ « ssl » : la connexion chiffrée s\'établit (le certificat est connu de la machine), l\'identifiant est accepté', [rSsl.ok, ssl.etat.auths], [true, [true]]);
    const sslInconnu = await essayerRelais(RELAIS_CFG(ssl, { securite: 'ssl' }), {});
    v('⛔ … SANS que la machine connaisse ce certificat, la connexion est REFUSÉE (aucun réglage ne désactive la vérification) : aucune authentification de plus, aucun message', [sslInconnu.ok, ssl.etat.auths.length, ssl.messages.length], [false, 1, 0]);
    const sslContreClair = await fauxRelais({ auth: identifiants });
    const rClair = await essayerRelais(RELAIS_CFG(sslContreClair, { securite: 'ssl' }), confiance);
    v('« ssl » contre un relais qui parle en clair : la connexion échoue (et le relais n\'a vu aucun identifiant)', [rClair.ok, sslContreClair.etat.auths.length], [false, 0]);
    await sslContreClair.fermer(); await ssl.fermer();

    const st = await fauxRelais({ auth: identifiants, tls: 'starttls', cert, exigerTls: true });
    const rSt = await essayerRelais(RELAIS_CFG(st, { securite: 'starttls' }), confiance);
    v('⛔ « starttls » : le relais REFUSE l\'authentification en clair (il ne l\'offre qu\'après) ; le service passe par STARTTLS d\'abord, puis s\'authentifie — le relais a vu STARTTLS avant AUTH', [rSt.ok, st.etat.auths, st.etat.commandes.indexOf('STARTTLS') >= 0 && st.etat.commandes.indexOf('STARTTLS') < st.etat.commandes.indexOf('AUTH')], [true, [true], true]);
    const stInconnu = await essayerRelais(RELAIS_CFG(st, { securite: 'starttls' }), {});
    v('⛔ … certificat inconnu : REFUSÉ après STARTTLS, avant tout identifiant', [stInconnu.ok, st.etat.auths.length], [false, 1]);
    await st.fermer();

    const opportun = await fauxRelais({ auth: identifiants, tls: 'starttls', cert });
    const rAucune = await essayerRelais(RELAIS_CFG(opportun, { securite: 'aucune' }), confiance);
    v('⛔ « aucune » ne chiffre RIEN, même quand le relais OFFRE STARTTLS (le choix de l\'exploitant est respecté) : le relais n\'a jamais vu une commande STARTTLS (population : l\'authentification a bien eu lieu)', [rAucune.ok, opportun.etat.commandes.includes('STARTTLS'), opportun.etat.auths], [true, false, [true]]);
    await opportun.fermer();

    const sansTls = await fauxRelais({ auth: identifiants });
    const rSans = await essayerRelais(RELAIS_CFG(sansTls, { securite: 'starttls' }), confiance);
    v('⛔⛔ « starttls » contre un relais qui n\'OFFRE PAS STARTTLS : le service REFUSE (pas de repli en clair) — le relais n\'a JAMAIS reçu l\'identifiant ni le mot de passe (population : il a bien été contacté)',
      [rSans.ok, sansTls.etat.connexions >= 1, sansTls.etat.commandes.includes('AUTH'), sansTls.etat.auths, sansTls.messages.length], [false, true, false, [], 0]);
    await sansTls.fermer();
  }

  /* ═══ 7. LE SERVICE SANS RELAIS : INERTE, ET IL LE DIT ══════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\nLe service sans relais : « l\'envoi par courriel n\'est pas encore ouvert » — la route, /api/config, et rien de rangé');
  {
    const M = await monter({ quotas: QUOTAS_LARGES });
    try {
      const ana = M.pers('Ana'), ben = M.pers('Ben', 'Quux'), eve = M.pers('Eve');
      const a = M.cl(ana), e = M.cl(eve);
      M.S.contactLier(ana.id, ben.id);
      const R = await mk(a, { invites: [ben.id] });
      const cfg = await T.client(M.svc.base).get('/api/config');
      v('/api/config dit que le courriel n\'est pas ouvert (sans session : la page le lit avant de proposer le champ)', [cfg.code, cfg.j.courriel], [200, { ouvert: false }]);
      const r1 = await a.post('/api/reunions/' + R.id + '/courriel', { destinataire: ADR(1) });
      const r2 = await a.post('/api/reunions/' + R.id + '/courriel', { destinataire: 'pas une adresse' });
      const r3 = await a.post('/api/reunions/' + R.id + '/courriel', {});
      v('⛔ une adresse juste, une adresse fausse, pas d\'adresse : le MÊME refus 503 `courriel_non_ouvert` (le relais absent se dit avant tout)', [r1, r2, r3].map(r => [r.code, r.j.error]), [[503, 'courriel_non_ouvert'], [503, 'courriel_non_ouvert'], [503, 'courriel_non_ouvert']]);
      v('… et rien n\'est rangé (population : la réunion existe, l\'hôte est connecté)', [R.id.startsWith('r_'), M.lignes()], [true, 0]);
      const r4 = await e.post('/api/reunions/' + R.id + '/courriel', { destinataire: ADR(1) });
      v('la garde passe AVANT le relais absent : une personne qui n\'est pas invitée reçoit le 404 d\'une réunion inexistante, pas un 503', [r4.code, r4.j.error], [404, 'introuvable']);
    } finally { await M.fermer(); }
  }

  /* ═══ 8. LE SERVICE AVEC UN RELAIS : LE MESSAGE, LES REFUS, LES PLAFONDS, LA DURABILITÉ, LES FUITES ═══════════════════════════════════════════ */
  console.log('\nLe service avec un relais : le message qui part, comparé au fichier de la route ; chaque refus ; les plafonds durables ; rien ne fuit');
  const relais = await fauxRelais({ auth: identifiants });
  const REPONSES = [];
  const suivre = async (promesse) => { const r = await promesse; REPONSES.push(r.txt); return r; };
  const COURRIEL_M = RELAIS_CFG(relais);
  let M = await monter({ courriel: COURRIEL_M, quotas: QUOTAS_LARGES });
  let sortie1 = '';
  const racineM = M.svc.racine;
  try {
    const ana = M.pers('Ana'), ben = M.pers('Ben', 'Quux'), cleo = M.pers('Cleo'), eve = M.pers('Eve');
    const a = M.cl(ana), b = M.cl(ben), c = M.cl(cleo), e = M.cl(eve);
    M.S.contactLier(ana.id, ben.id);
    const RS = await mk(a, { repetition: 'hebdomadaire', invites: [ben.id] });
    const RU = await mk(a, { debut: '2026-10-27T10:00', fin: '2026-10-27T11:00', titre: 'Unique ' + CANARI_T });
    const RA = await mk(a, { titre: 'Annulée ' + CANARI_T }); await a.post('/api/reunions/' + RA.id + '/annuler');
    const RP = await mk(a, { debut: '2026-10-20T10:00', fin: '2026-10-20T11:00', titre: 'Passée ' + CANARI_T });
    const post = (cli, id, corps) => suivre(cli.post('/api/reunions/' + id + '/courriel', corps));
    const etat = () => ({ lignes: M.lignes(), mails: relais.messages.length });
    const cfg = await T.client(M.svc.base).get('/api/config');
    REPONSES.push(cfg.txt);
    v('/api/config dit que le courriel est ouvert — et RIEN d\'autre du relais : ni l\'hôte, ni l\'identifiant, ni le mot de passe, ni l\'expéditeur', [cfg.j.courriel, [UTIL, MDP, EXPEDITEUR, 'exemple.invalid', '127.0.0.1'].filter(x => cfg.txt.includes(x))], [{ ouvert: true }, []]);

    /* ── le message qui part ── */
    const r1 = await post(a, RS.id, { destinataire: ADR(1) });
    v('⛔ l\'hôte envoie la SÉRIE à une adresse : 200, une ligne réservée, UN message chez le relais', [r1.code, r1.j, etat()], [200, { ok: true }, { lignes: 1, mails: 1 }]);
    const m1 = lireMessage(relais.messages[0]);
    const route = await a.get('/api/reunions/' + RS.id + '/ics?serie=1');
    v('⛔ l\'enveloppe : l\'adresse d\'expédition configurée, UN seul destinataire (celui qu\'on a écrit)', [m1.enveloppe.de, m1.enveloppe.a], [EXPEDITEUR, [ADR(1)]]);
    v('⛔ les en-têtes : l\'objet FIXE, le destinataire, l\'expéditeur nommé « OP MESSAGES », « envoi automatique » — et NI Cc, NI Bcc, NI Reply-To (aucune adresse de l\'hôte n\'est connue ni donnée)',
      [m1.sujet, m1.a, m1.nomDe, m1.adresseDe, m1.h['auto-submitted'], m1.h['x-auto-response-suppress'], ['cc', 'bcc', 'reply-to'].filter(k => m1.h[k])], [SUJET, ADR(1), 'OP MESSAGES', EXPEDITEUR, ['auto-generated'], ['All'], []]);
    v('⛔ la forme : UNE partie texte simple et UNE pièce jointe .ics — aucune partie HTML, aucune image (population : deux feuilles)', [m1.parts.map(p => p.type).sort(), m1.h['content-type'][0].startsWith('multipart/mixed')], [['text/calendar', 'text/plain'], true]);
    const lignesTexte = m1.texte.split(/\r?\n/);
    v('⛔ le texte nomme l\'hôte, le titre, la prochaine occurrence dans le fuseau de la réunion, le lieu — et dit que la série se répète',
      [lignesTexte.includes('Ana Banc vous invite à une réunion.'), lignesTexte.includes('  Réunion : Point ' + CANARI_T), lignesTexte.includes('  Quand : lundi 26 octobre à 14:00 (heure de Europe/Paris) — se répète chaque semaine'), lignesTexte.includes('  Lieu : ' + CANARI_L)], [true, true, true, true]);
    v('⛔ … et RIEN d\'autre de la réunion : ni les autres invités (Ben Quux), ni un lien vers la conversation, ni une adresse web, ni un identifiant de réunion', [/Quux|Ben/.test(m1.texte), /https?:|www\.|\/#|r_[0-9a-f]{32}/.test(m1.texte)], [false, false]);
    v('⛔ le fichier .ics DÉCODÉ est celui de la route `GET …/ics` (à l\'estampille près) : la même série, avec son rappel — et il se déclare calendrier, en pièce jointe, sous un nom ASCII sûr',
      [sansDtstamp(m1.ics) === sansDtstamp(route.txt), (m1.ics.match(/BEGIN:VALARM/g) || []).length, /RRULE:FREQ=WEEKLY;BYDAY=MO/.test(m1.ics), /METHOD:PUBLISH/.test(m1.ics), /^text\/calendar/.test(m1.icsEntetes['content-type'][0]) && /method=PUBLISH/i.test(m1.icsEntetes['content-type'][0]) && /charset=utf-8/i.test(m1.icsEntetes['content-type'][0]), /attachment/.test(m1.icsEntetes['content-disposition'][0]), /filename="?reunion-point-titre-wqxz-canari\.ics"?/.test(m1.icsEntetes['content-disposition'][0])],
      [true, 1, true, true, true, true, true]);

    /* ── une seule occurrence ── */
    const L9 = L26 + 14 * JOUR;
    const r2 = await post(a, RS.id, { destinataire: ADR(2), occurrence: L9 });
    const m2 = lireMessage(relais.messages[1]);
    const route2 = await a.get('/api/reunions/' + RS.id + '/ics?occurrence=' + L9);
    v('⛔ UNE occurrence : le texte dit CELLE-LÀ (lundi 9 novembre) et ne dit pas que la série se répète ; le fichier ne porte que cette occurrence (pas de RRULE) et est celui de la route',
      [r2.code, /Quand : lundi 9 novembre à 14:00 \(heure de Europe\/Paris\)\r?\n/.test(m2.texte), /se répète/.test(m2.texte), /RRULE/.test(m2.ics), /DTSTART:20261109T130000Z/.test(m2.ics), sansDtstamp(m2.ics) === sansDtstamp(route2.txt)], [200, true, false, false, true, true]);
    const apres = etat();
    const r3 = await post(a, RS.id, { destinataire: ADR(3), occurrence: L26 + JOUR });
    v('une date qui n\'est PAS une occurrence : 404 `occurrence_inconnue`, rien de réservé, rien d\'envoyé', [r3.code, r3.j.error, etat()], [404, 'occurrence_inconnue', apres]);
    for (const mauvaise of [-1, 1.5, '1793019600000', true, [L9]]) { const r = await post(a, RS.id, { destinataire: ADR(3), occurrence: mauvaise }); vrai('une occurrence mal formée (' + JSON.stringify(mauvaise) + ') : 400 `champ_invalide`', r.code === 400 && r.j.error === 'champ_invalide'); }
    v('… et toujours rien de réservé ni d\'envoyé', etat(), apres);
    const rU = await post(a, RU.id, { destinataire: ADR(4) });
    const mU = lireMessage(relais.messages[2]);
    v('une réunion SANS répétition : le texte ne dit pas « se répète », le fichier est écrit en UTC sans RRULE', [rU.code, /se répète/.test(mU.texte), /RRULE/.test(mU.ics), /DTSTART:20261027T090000Z/.test(mU.ics)], [200, false, false, true]);

    /* ── les adresses fausses, au service ── */
    const avantAdr = etat();
    const MAUVAISES = [undefined, null, '', 'pas une adresse', ADR(5) + '\r\nBcc: x@exemple.invalid', ADR(5) + ',' + ADR(6), 'Ana <' + ADR(5) + '>', 'a@127.0.0.1', 12, [ADR(5)], { adresse: ADR(5) }];
    const codesAdr = []; for (const x of MAUVAISES) { const r = await post(a, RS.id, x === undefined ? {} : { destinataire: x }); codesAdr.push([r.code, r.j.error]); }
    v('⛔ chaque adresse fausse ou dangereuse : 400 `courriel_invalide` (population : ' + MAUVAISES.length + ')', codesAdr, MAUVAISES.map(() => [400, 'courriel_invalide']));
    v('… et rien n\'a été réservé ni envoyé', etat(), avantAdr);

    /* ── les gardes ── */
    const gardes = [];
    for (const [cli, id] of [[b, RS.id], [c, RS.id], [a, 'r_' + '0'.repeat(32)], [a, 'pas-une-reunion']]) { const r = await post(cli, id, { destinataire: ADR(7) }); gardes.push([r.code, r.j.error]); }
    const sansSession = await T.client(M.svc.base).post('/api/reunions/' + RS.id + '/courriel', { destinataire: ADR(7) });
    v('⛔ un INVITÉ qui n\'est pas l\'hôte : 403 ; une personne non invitée, une réunion inexistante, un identifiant mal formé : le MÊME 404 ; sans session : 401 — et rien ne part', [gardes, sansSession.code, etat()], [[[403, 'interdit'], [404, 'introuvable'], [404, 'introuvable'], [404, 'introuvable']], 401, avantAdr]);
    const annulee = await post(a, RA.id, { destinataire: ADR(7) });
    v('⛔ une réunion ANNULÉE ne s\'envoie pas : 409 `reunion_annulee`', [annulee.code, annulee.j.error, etat()], [409, 'reunion_annulee', avantAdr]);

    /* ── les plafonds, de bout en bout (le détail à la milliseconde est joué sur le module) ── */
    const variante = await post(a, RS.id, { destinataire: 'WQXZ.Dest1+Etiquette@EXEMPLE.invalid' });
    const troisieme = await post(a, RS.id, { destinataire: ADR(1) });
    v('⛔ la boîte ADR(1) a reçu un deuxième courriel (écrit autrement), un troisième est refusé : 429 `courriel_quota_destinataire` — et rien de plus n\'est parti', [variante.code, troisieme.code, troisieme.j.error, etat()], [200, 429, 'courriel_quota_destinataire', { lignes: 4, mails: 4 }]);
    for (let i = 10; i <= 15; i++) await post(a, RS.id, { destinataire: ADR(i) });
    v('population : dix courriels sont partis du compte d\'Ana (la série, une occurrence, l\'unique, la variante, six autres)', etat(), { lignes: 10, mails: 10 });
    const onzieme = await post(a, RS.id, { destinataire: ADR(16) });
    v('⛔ le onzième : 429 `courriel_quota_compte`', [onzieme.code, onzieme.j.error, etat()], [429, 'courriel_quota_compte', { lignes: 10, mails: 10 }]);
    const REB = await mk(b, { titre: 'De Ben ' + CANARI_T });
    const benVers16 = await post(b, REB.id, { destinataire: ADR(16) });
    const benVers1 = await post(b, REB.id, { destinataire: ADR(1) });
    v('⛔ le plafond du COMPTE est propre à chacun (Ben écrit à une boîte neuve), celui de la BOÎTE est commun (Ben ne peut pas écrire à ADR(1), qui a déjà reçu deux courriels d\'Ana)', [benVers16.code, benVers1.code, benVers1.j.error, M.lignes()], [200, 429, 'courriel_quota_destinataire', 11]);

    /* ── un redémarrage ne remet rien à zéro ── */
    sortie1 = M.svc.sortie.texte();
    const decal = M.decal();
    const reprise = { dossier: M.svc.racine, port: M.svc.port, cle: M.svc.cle };
    await M.fermer(false);
    M = await monter({ courriel: COURRIEL_M, quotas: QUOTAS_LARGES }, { reprise, decal });
    const apresRedemarrage = await post(a, RS.id, { destinataire: ADR(17) });
    const boiteRedemarrage = await post(a, RS.id, { destinataire: ADR(1) });
    v('⛔ un REDÉMARRAGE du service ne remet pas les plafonds à zéro : le compte d\'Ana (dix) est toujours plein (population : le service a bien redémarré, sa base garde onze lignes)',
      [M.lignes(), apresRedemarrage.j.error, boiteRedemarrage.j.error], [11, 'courriel_quota_compte', 'courriel_quota_compte']);

    /* ── le temps passe : les fenêtres glissent ── */
    M.avancer(JOUR + MIN);
    const glisse = await post(a, RS.id, { destinataire: ADR(18) });
    const boiteGlisse = await post(a, RS.id, { destinataire: ADR(1) });
    v('⛔ vingt-quatre heures plus tard le COMPTE est libre (un envoi passe) mais la BOÎTE ADR(1) ne l\'est pas encore (sept jours)', [glisse.code, boiteGlisse.code, boiteGlisse.j.error], [200, 429, 'courriel_quota_destinataire']);
    M.avancer(7 * JOUR);
    const boiteLibre = await post(a, RS.id, { destinataire: ADR(1) });
    v('… et sept jours après les envois, la boîte reçoit de nouveau', boiteLibre.code, 200);
    const passee = await post(a, RP.id, { destinataire: ADR(19) });
    v('⛔ une réunion FINIE (elle a eu lieu le 20 octobre) ne s\'envoie plus : 409 `reunion_passee`, et rien ne part', [passee.code, passee.j.error], [409, 'reunion_passee']);
    const sSerie = await post(a, RS.id, { destinataire: ADR(19) });
    const mS = lireMessage(relais.messages[relais.messages.length - 1]);
    v('… alors qu\'une SÉRIE encore à venir part — le texte dit sa PROCHAINE occurrence (lundi 2 novembre), pas la première (26 octobre)', [sSerie.code, /Quand : lundi 2 novembre à 14:00 \(heure de Europe\/Paris\) — se répète chaque semaine/.test(mS.texte)], [200, true]);

    /* ── un relais qui refuse, vu de la page : une phrase, jamais le texte du relais ── */
    const REE = await mk(e, { debut: '2026-11-03T10:00', fin: '2026-11-03T11:00', titre: 'D\'Eve ' + CANARI_T });
    const avantE = etat();
    relais.etat.rcpt = 'refus';
    const fRcpt = await post(e, REE.id, { destinataire: ADR(30) });
    relais.etat.rcpt = 'ok'; relais.etat.data = 'refus';
    const fData = await post(e, REE.id, { destinataire: ADR(30) });
    relais.etat.data = 'ok';
    v('⛔ un relais qui refuse le destinataire, puis le message : 502 `courriel_echec` deux fois, le corps ne dit RIEN d\'autre (jamais le texte du relais), et la place d\'Eve n\'est pas consommée',
      [[fRcpt, fData].map(r => [r.code, r.j]), [fRcpt.txt, fData.txt].filter(t => t.includes(TEXTE_RELAIS) || t.includes('550') || t.includes('554')), etat()], [[[502, { error: 'courriel_echec' }], [502, { error: 'courriel_echec' }]], [], avantE]);
    const ok30 = await post(e, REE.id, { destinataire: ADR(30) });
    v('… et le même envoi, relais rétabli, part (200) — la place rendue servait', [ok30.code, etat().lignes - avantE.lignes], [200, 1]);

    /* ── RIEN NE FUIT ── */
    const sante = await T.client(M.svc.base).get('/health');
    REPONSES.push(sante.txt);
    const sortie2 = M.svc.sortie.texte();
    const octetsBase = ['msg.db', 'msg.db-wal'].map(f => { try { return fs.readFileSync(path.join(M.svc.data, f)).toString('latin1'); } catch (x) { return ''; } }).join('\n');
    const destH = M.sql('SELECT dest_h AS h FROM courrier_envoi LIMIT 1').h;
    v('population : la lecture de la base voit ce qui y est en clair (le nom d\'une personne, l\'empreinte d\'un destinataire de 64 hexadécimaux) — et la sortie du service porte une ligne d\'état par envoi',
      [octetsBase.includes('Quux'), /^[0-9a-f]{64}$/.test(destH) && octetsBase.includes(destH), (sortie1.match(/"evt":"courriel","etat":"envoye"/g) || []).length, (sortie2.match(/"evt":"courriel","etat":"envoye"/g) || []).length, (sortie2.match(/"evt":"courriel","etat":"echec","nom":"E[A-Z]+"/g) || []).length],
      [true, true, 11, 4, 2]);
    const tout = { base: octetsBase, sortie: sortie1 + sortie2, reponses: REPONSES.join('\n') };
    const motifs = [/wqxz\.dest/i, /exemple\.invalid/, new RegExp(UTIL), new RegExp(MDP), new RegExp(TEXTE_RELAIS)];
    v('⛔⛔ RIEN d\'une adresse de destinataire, de l\'expéditeur, de l\'identifiant, du mot de passe ou du texte d\'un relais n\'est rangé dans la base, écrit dans le journal du service, publié par /health ou /api/config, ni répondu par aucune route (population : ' + REPONSES.length + ' réponses lues, la base, deux sorties de service)',
      Object.keys(tout).map(k => [k, motifs.filter(re => re.test(tout[k])).map(String)]), Object.keys(tout).map(k => [k, []]));
    v('/health ne dit rien du courriel (ni état, ni compteur) : une panne de relais se voit à la réponse de la page, pas à une alarme muette', /courriel|smtp|relais/i.test(sante.txt), false);
    v('les lignes réservées ne portent que des empreintes : chacune a 64 hexadécimaux (population : ' + Number(M.sql('SELECT COUNT(*) AS n FROM courrier_envoi').n) + ' lignes)', Number(M.sql("SELECT COUNT(*) AS n FROM courrier_envoi WHERE length(dest_h) <> 64 OR dest_h GLOB '*[^0-9a-f]*'").n), 0);
  } finally { await M.fermer(); try { fs.rmSync(racineM, { recursive: true, force: true }); } catch (x) { /* déjà parti */ } }

  /* ═══ 9. LE PLAFOND PAR MINUTE (les plafonds de production, pas ceux du banc) ═══════════════════════════════════════════════════════════════ */
  console.log('\nLe plafond par minute : cinq envois par personne, le sixième attend — propre à chacun');
  {
    const D = await monter({ courriel: RELAIS_CFG(relais), quotas: { reunion: QUOTAS_LARGES.reunion, ics: QUOTAS_LARGES.ics } });
    try {
      const gil = D.pers('Gil'), hana = D.pers('Hana');
      const g = D.cl(gil), h = D.cl(hana);
      const RG = await mk(g), RH = await mk(h);
      const avant = relais.messages.length;
      const invalides = []; for (let i = 0; i < 6; i++) invalides.push((await g.post('/api/reunions/' + RG.id + '/courriel', { destinataire: 'pas une adresse ' + i })).code);
      const codes = []; for (let i = 1; i <= 5; i++) codes.push((await g.post('/api/reunions/' + RG.id + '/courriel', { destinataire: ADR(400 + i) })).code);
      const sixieme = await g.post('/api/reunions/' + RG.id + '/courriel', { destinataire: ADR(406) });
      const hanaOk = await h.post('/api/reunions/' + RH.id + '/courriel', { destinataire: ADR(407) });
      v('⛔ six adresses FAUSSES ne consomment pas le plafond par minute (400 chaque fois) ; puis cinq envois passent, le SIXIÈME est refusé 429 `quota_atteint` avec le délai (`Retry-After`) — sans réserver ni contacter le relais — et le plafond est PROPRE à chacun (Hana envoie)',
        [invalides, codes, sixieme.code, sixieme.j.error, Number(sixieme.h.get('retry-after')) > 0, D.lignes(), relais.messages.length - avant, hanaOk.code], [[400, 400, 400, 400, 400, 400], [200, 200, 200, 200, 200], 429, 'quota_atteint', true, 6, 6, 200]);
    } finally { await D.fermer(); }
  }

  /* ═══ 10. LE CANAL, DE BOUT EN BOUT : UN COURRIEL QUI PART EN TLS ═══════════════════════════════════════════════════════════════════════════ */
  if (cert) {
    console.log('\nUn courriel part pour de vrai par TLS implicite, puis par STARTTLS (le certificat du banc est connu de la machine)');
    const env = { NODE_EXTRA_CA_CERTS: cert.crt };
    for (const [securite, mode] of [['ssl', 'implicite'], ['starttls', 'starttls']]) {
      const rl = await fauxRelais({ auth: identifiants, tls: mode, cert, exigerTls: mode === 'starttls' });
      const X = await monter({ courriel: RELAIS_CFG(rl, { securite }), quotas: QUOTAS_LARGES }, { env });
      try {
        const ana = X.pers('Ana'); const a = X.cl(ana);
        const R = await mk(a);
        const r = await a.post('/api/reunions/' + R.id + '/courriel', { destinataire: ADR(500) });
        const m = rl.messages[0] ? lireMessage(rl.messages[0]) : null;
        v('⛔ « ' + securite + ' » : 200, le message est arrivé CHIFFRÉ (le relais le dit), l\'authentification a eu lieu une fois, le fichier .ics est joint', [r.code, m && m.tls, rl.etat.auths, m && m.ics && /BEGIN:VCALENDAR/.test(m.ics), m && m.sujet], [200, true, [true], true, SUJET]);
      } finally { await X.fermer(); await rl.fermer(); }
    }
  }

  /* ═══ 11. UN RELAIS QUI NE VA PAS : UN MOT DE PASSE FAUX, UN RELAIS MUET, UN RELAIS ÉTEINT ═════════════════════════════════════════════════ */
  console.log('\nUn relais qui ne va pas : une phrase à la page, jamais le texte du relais, jamais un blocage, jamais une place consommée');
  {
    const B = await monter({ courriel: RELAIS_CFG(relais, { mot_de_passe: MDP_FAUX, timeoutMs: 1000 }), quotas: QUOTAS_LARGES });
    try {
      const ana = B.pers('Ana'); const a = B.cl(ana);
      const R = await mk(a);
      const envoyer = async () => { const t = Date.now(); const r = await a.post('/api/reunions/' + R.id + '/courriel', { destinataire: ADR(600) }); return { code: r.code, j: r.j, txt: r.txt, ms: Date.now() - t }; };
      const auths0 = relais.etat.auths.length;
      const faux = await envoyer();
      v('⛔ un mot de passe FAUX : 502 `courriel_echec`, le corps ne cite NI le texte du relais NI un identifiant, le relais a refusé, et la place n\'est pas consommée', [faux.code, faux.j, [TEXTE_RELAIS, UTIL, MDP_FAUX, MDP].filter(x => faux.txt.includes(x)), relais.etat.auths.slice(auths0), B.lignes()], [502, { error: 'courriel_echec' }, [], [false], 0]);
      relais.etat.silence = true;
      const connexions0 = relais.etat.connexions;
      const muet = await envoyer();
      v('⛔ un relais MUET (il accepte la connexion et ne dit rien) : 502 au bout du délai réglé (1 s), pas un blocage — et rien de consommé (population : le relais a bien été contacté)', [muet.code, muet.j, muet.ms < 8000 && muet.ms >= 900, relais.etat.connexions > connexions0, B.lignes()], [502, { error: 'courriel_echec' }, true, true, 0]);
      relais.etat.silence = false;
      relais.etat.gel = true;
      const connexionsGel = relais.etat.connexions;
      const gele = await envoyer();
      relais.etat.gel = false;
      v('⛔ un relais qui GÈLE en pleine conversation (il répond à EHLO puis ne dit plus rien) : 502 au bout du délai réglé, pas un blocage de dix minutes — rien de consommé (population : le relais a bien été contacté)', [gele.code, gele.j, gele.ms < 8000 && gele.ms >= 900, relais.etat.connexions > connexionsGel, B.lignes()], [502, { error: 'courriel_echec' }, true, true, 0]);
      await relais.fermer();
      const eteint = await envoyer();
      v('⛔ un relais ÉTEINT (connexion refusée) : 502 tout de suite, rien de consommé', [eteint.code, eteint.j, eteint.ms < 5000, B.lignes()], [502, { error: 'courriel_echec' }, true, 0]);
      v('⛔ le journal du service dit chaque échec par un NOM de code et rien d\'autre : ni adresse, ni identifiant, ni mot de passe, ni texte du relais', [(B.svc.sortie.texte().match(/"evt":"courriel","etat":"echec","nom":"E[A-Z]+"/g) || []).length, [UTIL, MDP_FAUX, MDP, TEXTE_RELAIS, 'wqxz.dest'].filter(x => B.svc.sortie.texte().includes(x))], [4, []]);
    } finally { await B.fermer(); }
  }

  /* ═══ 12. LE SERVICE REFUSE DE DÉMARRER SUR UN BLOC À MOITIÉ POSÉ — ET NE CITE PAS LE SECRET ═══════════════════════════════════════════════ */
  console.log('\nUn bloc de courriel à moitié posé REFUSE le démarrage du service, et le dit sans citer le secret');
  {
    const refus = async (courriel) => {
      const svc = await T.lancerService({ attendreSante: false, config: { courriel } });
      await T.attendre(() => svc.sorti() !== null, 10000);
      const r = { code: svc.sorti(), sortie: svc.sortie.texte() };
      await svc.arreter();
      return r;
    };
    const r1 = await refus({ hote: 'smtp.exemple.invalid', utilisateur: UTIL, mot_de_passe: MDP, de: 'pas une adresse' });
    v('⛔ pas d\'adresse d\'expédition valable : le service sort en erreur (code non nul), dit « courriel.de », et ne cite NI le mot de passe NI l\'identifiant', [r1.code, /courriel\.de doit être l'adresse d'expédition/.test(r1.sortie), r1.sortie.includes(MDP), r1.sortie.includes(UTIL)], [1, true, false, false]);
    const r2 = await refus({ port: 587, de: EXPEDITEUR });
    v('⛔ un port SANS hôte (le bloc qu\'on croirait ouvert) : refus', [r2.code, /courriel\.port sans courriel\.hote/.test(r2.sortie)], [1, true]);
    const r3 = await refus({ hote: 'smtp.exemple.invalid', utilisateur: UTIL, de: EXPEDITEUR });
    v('⛔ un identifiant sans mot de passe : refus, sans citer l\'identifiant', [r3.code, /vont ensemble/.test(r3.sortie), r3.sortie.includes(UTIL)], [1, true, false]);
    const svcOk = await T.lancerService({ config: { courriel: { hote: '127.0.0.1', securite: 'aucune', port: 25, de: EXPEDITEUR } } });
    const sante = await T.client(svcOk.base).get('/api/config');
    v('population : un bloc COMPLET (un relais local sans identifiant) démarre le service — la page le voit ouvert', [svcOk.sorti(), sante.j.courriel], [null, { ouvert: true }]);
    await svcOk.arreter();
  }

  /* ═══ 13. L'OUTIL : `configurer-courriel.js` ════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n`configurer-courriel.js` : il éprouve le relais avant d\'écrire, n\'affiche rien de masqué, n\'écrit qu\'un fichier que le service accepte');
  {
    const OUTIL = path.join(T.SERVICE, 'configurer-courriel.js');
    const lancerOutil = (args, lignes, env) => new Promise((resolve) => {
      const env2 = Object.assign({}, process.env, env); for (const k of Object.keys(env2)) if (env2[k] === undefined) delete env2[k];
      const enfant = spawn(process.execPath, [OUTIL].concat(args), { env: env2, stdio: ['pipe', 'pipe', 'pipe'] });
      let sortie = '', erreur = '';
      enfant.stdout.on('data', d => { sortie += d; }); enfant.stderr.on('data', d => { erreur += d; });
      const minuteur = setTimeout(() => { try { enfant.kill('SIGKILL'); } catch (x) { /* déjà sorti */ } }, 40000);
      enfant.on('exit', (code) => { clearTimeout(minuteur); resolve({ code, sortie, erreur, tout: sortie + erreur }); });
      enfant.stdin.end(lignes === null ? '' : lignes.join('\n') + '\n');
    });
    const rl = await fauxRelais({ auth: identifiants });
    const fichier = path.join(bac, 'outil.json');
    const INITIAL = { origines: ['http://127.0.0.1:1'], marqueur: 'GARDE-WQXZ', imbrique: { a: [1, 2, { b: 'c' }] }, courriel: { timeoutMs: 5000 } };
    const ecrire = (obj) => fs.writeFileSync(fichier, JSON.stringify(obj, null, 2), { mode: 0o640 });
    const octets = () => fs.readFileSync(fichier);
    const ENV = { OPMSG_CONFIG: fichier };
    const saisie = (extra) => Object.assign({ hote: '127.0.0.1', securite: 'aucune', port: String(rl.port), utilisateur: UTIL, mdp: MDP, de: EXPEDITEUR, nom: 'Banc WQXZ' }, extra || {});
    const lignes = (s) => [s.hote, s.securite, s.port, s.utilisateur].concat(s.utilisateur ? [s.mdp] : []).concat([s.de, s.nom]);
    const SECRETS = [UTIL, MDP, MDP_FAUX, TEXTE_RELAIS];
    const fuite = (r) => SECRETS.filter(x => r.tout.includes(x));

    ecrire(INITIAL);
    const avant = Buffer.from(octets());
    const messages0 = rl.messages.length;
    const ok = await lancerOutil([], lignes(saisie()), ENV);
    const ecrit = JSON.parse(octets().toString('utf8'));
    v('⛔ la pose : sortie 0, le relais a répondu ET accepté l\'identifiant (un AUTH réussi, AUCUN courriel envoyé), le fichier est écrit en 0600 sans fichier temporaire, les AUTRES clés sont intactes, le délai déjà posé est gardé',
      [ok.code, rl.etat.auths, rl.messages.length === messages0, (fs.statSync(fichier).mode & 0o777).toString(8), fs.readdirSync(bac).filter(f => f.startsWith('outil.json.tmp')), ecrit.origines, ecrit.marqueur, ecrit.imbrique, ecrit.courriel.timeoutMs],
      [0, [true], true, '600', [], INITIAL.origines, INITIAL.marqueur, INITIAL.imbrique, 5000]);
    v('… le bloc écrit est celui qu\'on a saisi (le port en NOMBRE), et le service l\'accepterait : même validation', [ecrit.courriel.hote, ecrit.courriel.securite, ecrit.courriel.port, ecrit.courriel.utilisateur, ecrit.courriel.mot_de_passe, ecrit.courriel.de, ecrit.courriel.nom, lance(() => CONFIG.courrielConfig(ecrit, 'prod'))], ['127.0.0.1', 'aucune', rl.port, UTIL, MDP, EXPEDITEUR, 'Banc WQXZ', null]);
    v('⛔⛔ ce que l\'outil AFFICHE peut se recoller : ni l\'identifiant ni le mot de passe (population : il a bien parlé — l\'hôte et l\'adresse d\'expédition y sont, et il annonce l\'écriture)', [fuite(ok), ok.sortie.includes('127.0.0.1') && ok.sortie.includes(EXPEDITEUR), /mis à jour \(chmod 600\)/.test(ok.sortie), /le relais répond et accepte l'identifiant/.test(ok.sortie)], [[], true, true, true]);

    const apresOk = Buffer.from(octets());
    const faux = await lancerOutil([], lignes(saisie({ mdp: MDP_FAUX })), ENV);
    v('⛔ un mot de passe FAUX : sortie 1, la phrase dit pourquoi (identifiant refusé, mot de passe d\'APPLICATION), le fichier n\'a pas bougé d\'un octet, rien n\'est cité — ni le secret ni le texte du relais', [faux.code, /refuse l'identifiant ou le mot de passe/.test(faux.erreur), /Rien n'a été modifié/.test(faux.erreur), Buffer.compare(octets(), apresOk), fuite(faux)], [1, true, true, 0, []]);
    const morte = await T.portLibre();
    const injoignable = await lancerOutil([], lignes(saisie({ port: String(morte) })), ENV);
    v('un relais qui n\'écoute pas : sortie 1, « refuse la connexion », fichier intact', [injoignable.code, /refuse la connexion/.test(injoignable.erreur), Buffer.compare(octets(), apresOk)], [1, true, 0]);

    const connexionsAvant = rl.etat.connexions;
    const REFUS = [
      ['une sécurité inconnue', saisie({ securite: 'tls' }), /courriel\.securite doit valoir ssl, starttls ou aucune/],
      ['« aucune » vers un relais qui n\'est pas local (la règle de la production, quelle que soit l\'instance)', saisie({ hote: 'smtp.exemple.invalid' }), /refusée en production hors d'un relais local/],
      ['un port qui n\'est pas un nombre', saisie({ port: 'abc' }), /Le port est un nombre/],
      ['un identifiant sans mot de passe', saisie({ mdp: '' }), /Un identifiant sans mot de passe ne ferait rien/],
      ['pas d\'adresse d\'expédition', saisie({ de: '' }), /Une valeur manque/],
      ['une adresse d\'expédition fausse', saisie({ de: 'pas une adresse' }), /courriel\.de doit être l'adresse d'expédition/],
    ];
    const rr = []; for (const [, s] of REFUS) rr.push(await lancerOutil([], lignes(s), ENV));
    v('⛔ chaque saisie fausse : sortie 1, la phrase de CE refus, fichier intact, aucun secret cité — et la validation précède la connexion (le relais n\'a pas été contacté une fois de plus)', [rr.map((r, i) => r.code === 1 && REFUS[i][2].test(r.erreur)), rr.map(fuite).filter(f => f.length), Buffer.compare(octets(), apresOk), rl.etat.connexions - connexionsAvant], [REFUS.map(() => true), [], 0, 0]);

    const verif = await lancerOutil(['--verifier'], null, ENV);
    v('`--verifier` relit ce qui est posé et essaie le relais : sortie 0, un AUTH de plus, aucun courriel, rien de secret affiché, fichier intact', [verif.code, /le relais répond et accepte l'identifiant — aucun courriel n'a été envoyé/.test(verif.sortie), fuite(verif), rl.etat.auths.length, rl.messages.length === messages0, Buffer.compare(octets(), apresOk)], [0, true, [], 3, true, 0]);
    const cassee = JSON.parse(apresOk.toString('utf8')); cassee.courriel.mot_de_passe = MDP_FAUX; ecrire(cassee);
    const verifFaux = await lancerOutil(['--verifier'], null, ENV);
    v('⛔ `--verifier` d\'une configuration dont le mot de passe n\'est plus le bon : sortie 1, la phrase dit pourquoi, rien de cité', [verifFaux.code, /refuse l'identifiant ou le mot de passe/.test(verifFaux.erreur), fuite(verifFaux)], [1, true, []]);
    ecrire(INITIAL);
    const verifInerte = await lancerOutil(['--verifier'], null, ENV);
    v('`--verifier` sans relais configuré : sortie 1, « INERTE » (rien à vérifier — et le dit)', [verifInerte.code, /INERTE/.test(verifInerte.erreur)], [1, true]);
    const sansEnv = await lancerOutil([], lignes(saisie()), { OPMSG_CONFIG: undefined });
    const optionInconnue = await lancerOutil(['--x'], lignes(saisie()), ENV);
    const introuvable = await lancerOutil([], lignes(saisie()), { OPMSG_CONFIG: path.join(bac, 'absent.json') });
    v('sans OPMSG_CONFIG, avec une option inconnue, sur un fichier qui n\'existe pas : sortie 1 chaque fois, et le dernier ne CRÉE pas le fichier', [sansEnv.code, optionInconnue.code, introuvable.code, /introuvable/.test(introuvable.erreur), fs.existsSync(path.join(bac, 'absent.json'))], [1, 1, 1, true, false]);

    /* ce que l'outil écrit suffit à faire partir un courriel */
    ecrire(INITIAL);
    await lancerOutil([], lignes(saisie()), ENV);
    const posee = JSON.parse(octets().toString('utf8')).courriel;
    const Z = await monter({ courriel: posee, quotas: QUOTAS_LARGES });
    try {
      const ana = Z.pers('Ana'); const a = Z.cl(ana);
      const R = await mk(a);
      const n0 = rl.messages.length;
      const r = await a.post('/api/reunions/' + R.id + '/courriel', { destinataire: ADR(700) });
      const m = rl.messages[n0] ? lireMessage(rl.messages[n0]) : null;
      v('⛔ le bloc ÉCRIT PAR L\'OUTIL, donné tel quel au service, fait partir une invitation (nom affiché choisi, expéditeur, objet fixe, fichier joint)', [r.code, m && m.nomDe, m && m.adresseDe, m && m.sujet, m && /BEGIN:VCALENDAR/.test(m.ics)], [200, 'Banc WQXZ', EXPEDITEUR, SUJET, true]);
    } finally { await Z.fermer(); }
    await rl.fermer();

    /* la sécurité LAISSÉE VIDE vaut « starttls » : le défaut chiffre */
    if (cert) {
      const st = await fauxRelais({ auth: identifiants, tls: 'starttls', cert, exigerTls: true });
      const fichier2 = path.join(bac, 'outil2.json');
      fs.writeFileSync(fichier2, JSON.stringify({ origines: ['http://127.0.0.1:1'] }, null, 2), { mode: 0o600 });
      const defaut = await lancerOutil([], lignes(saisie({ securite: '', port: String(st.port) })), { OPMSG_CONFIG: fichier2, NODE_EXTRA_CA_CERTS: cert.crt });
      const ecrit2 = JSON.parse(fs.readFileSync(fichier2, 'utf8'));
      v('⛔ une sécurité LAISSÉE VIDE vaut « starttls » : le fichier porte « starttls », le relais a vu STARTTLS avant l\'authentification, rien de secret affiché', [defaut.code, ecrit2.courriel && ecrit2.courriel.securite, st.etat.commandes.indexOf('STARTTLS') >= 0 && st.etat.commandes.indexOf('STARTTLS') < st.etat.commandes.indexOf('AUTH'), fuite(defaut)], [0, 'starttls', true, []]);
      await st.fermer();
    }
  }

  fin();
})().catch((e) => { console.log('  ✗ le banc a levé : ' + (e && e.stack ? e.stack : e)); process.exitCode = 1; process.exit(1); });
