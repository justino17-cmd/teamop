/* ══ LE DOCUMENT D'ÉQUIPE, RANGÉ CHEZ NOUS — LA SORTIE DE FIREBASE ══════════════════════════
 *
 * Décision de Justin, 25 septembre 2026 : « moi je veux que quand j'envoie la mise à jour c'est
 * que Firebase soit supprimé », puis « on envoie la mise à jour pour le public, sans délai ».
 *
 * ⛔ ON DÉMÉNAGE LE COFFRE, ON NE LE RECONVERTIT PAS. Le plan du socle (`PLAN-OP-SOCLE.md`)
 * éclate la base en lignes, et c'est la bonne cible — mais pas en un seul geste un jour de
 * publication. Relevé le 25 septembre en préparant la copie :
 *   · la 695 garde des photos EN CLAIR dans les fiches (« data:image/… », sans identifiant) ;
 *     `syncSortirPieces` ne sort que le format déposé, donc elles partiraient dans les lignes ;
 *   · une intervention à plusieurs photos dépasse `CORPS_MAX` (512 Ko scellés, `socle.js`) :
 *     refusée par le serveur, donc ABSENTE pour tous les appareils ;
 *   · l'identifiant d'une pièce est donné par le serveur au dépôt, sur un contenu chiffré avec
 *     un vecteur aléatoire : la même photo convertie ici et sur un téléphone aurait deux
 *     identifiants, donc deux copies d'une fiche à la même date et deux empreintes — un conflit.
 * Ce module range donc EXACTEMENT ce que Firestore rangeait : un document par entreprise, tel que
 * l'appareil l'a chiffré avec la clé d'équipe, remplacé EN ENTIER à chaque envoi — ce que faisait
 * `_fbDoc.set()`. Toute la logique de fusion reste dans l'application : c'est celle qu'ELAN
 * emploie depuis des mois, éprouvée par des pannes réelles. On change le TRANSPORT, pas les
 * données. Le socle reste disponible pour plus tard, sans Firebase et sans date imposée.
 *
 * ⛔ TROIS GESTES, CEUX QUE L'APPLICATION FAISAIT À FIRESTORE, ET AUCUN AUTRE :
 *   · `POST /api/doc/lire`     — `_fbDoc.get()` ;
 *   · `POST /api/doc/ecrire`   — `_fbDoc.set(doc)`, ou `set({ver,verNum},{merge:true})` ;
 *   · `POST /api/doc/attendre` — `onSnapshot` : une attente longue, rendue dès qu'une écriture
 *     arrive, ou au bout de `ATTENTE_MS` sans rien (l'appareil repose alors la question).
 * Le serveur ne DÉCHIFFRE rien pour servir : il range et rend des octets. Il le POURRAIT (la clé
 * de chaque entreprise est dans l'annuaire, voir `pieces.js`), il n'en a pas besoin ici.
 *
 * ⛔ LA COPIE DEPUIS FIREBASE SE FAIT AU PREMIER ACCÈS, ET UN ÉCHEC N'EST JAMAIS « VIDE ».
 * Un document absent d'ici est cherché chez Firebase, recopié tel quel, et gardé À PART
 * (`<t>.firebase.json`) en plus d'être la version 1. Si la copie échoue (réseau, clé
 * d'administration absente, 5xx), on rend 503 et l'appareil réessaie : rendre « vide » ferait
 * croire à l'application que l'équipe est NEUVE — elle poserait un compte de départ et
 * pousserait sa propre base comme base de l'équipe. C'est la confusion que ce dépôt a payée deux
 * fois (`_mailboxes`, `syncDecrypt`) : `null` veut dire « on ne sait pas », jamais « rien ».
 * Seul un 404 de Firestore dit « cette entreprise n'a jamais rien écrit ».
 * ⚠️ Le jour où le projet Firebase est supprimé, `config.documents.copieFirebase` passe à
 * `false` : sans ce réglage, chaque NOUVELLE entreprise tomberait sur une copie impossible.
 *
 * ⛔ ET L'ÉCRITURE ATTEND LA COPIE. Une écriture qui trouverait la place vide sans avoir demandé
 * à Firebase écraserait la base de l'équipe par celle d'un seul appareil — la copie paresseuse
 * passe donc aussi par `ecrire`, sous le même verrou que `lire`.
 *
 * ⛔ AUCUNE PORTE NEUVE : `sauvRefus(t, kh)`, la même garde que les copies de sauvegarde et les
 * pièces jointes. Elle refuse l'espace de repli, un espace FERMÉ (pas suspendu : une suspension
 * est un état de facturation, décision de Justin du 20 septembre 2026), un espace inconnu et une
 * clé fausse. On y ajoute la clé PARTAGÉE (409), comme `/api/op/session` : une clé écrite en
 * clair dans `app.html` ne prouve rien.
 * ⚠️ LES ESPACES TECHNIQUES DE LA BÊTA passent sans preuve, exactement comme la règle
 * `elanB_teams` de `firestore.rules` : leur clé est publique, la bêta ne porte jamais de données
 * d'entreprise, et la refuser couperait l'outil de développement sans rien protéger. Ils restent
 * bornés (poids, quotas) et ne partagent aucun fichier avec une entreprise.
 *
 * ⛔ ÉCRITURE PAR FICHIER TEMPORAIRE PUIS RENOMMAGE, et la version d'avant gardée (`.prec`).
 * Un document tronqué, c'est une entreprise qui repart de rien au prochain appareil qui lit. Et
 * un fichier ILLISIBLE n'est pas un document absent : 503, compteur, et la surveillance le dit.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/* Comme `/api/op/flux` : sous les 60 s de nginx, largement. `TEAMOP_DOC_ATTENTE_MS` ne sert qu'aux
   bancs (une attente de 25 s par essai les rendrait interminables), et reste BORNÉ : aucun réglage
   ne peut dépasser 25 s, donc aucun ne peut faire couper l'attente par nginx. */
const ATTENTE_MS = Math.min(25000, Math.max(200, parseInt(process.env.TEAMOP_DOC_ATTENTE_MS, 10) || 25000));
const DOC_MAX = 5500000;               // caractères de JSON — sous les 6 Mo d'`express.json`
const ATTENTES_MAX = 200;              // attentes ouvertes par espace (borne mémoire)
const ESPACES_TECHNIQUES = ['opgestion-beta', 'elan-gestion-beta'];
/* Les champs que l'application écrit (`syncPush`, et la fusion de version). Firestore acceptait
   n'importe quoi ; ici, un champ inconnu est refusé — c'est un document d'équipe, pas un casier. */
const CHAMPS = { enc: 'texte', iv: 'texte', salt: 'texte', z: 'nombre', ts: 'nombre', writer: 'texte',
  at: 'texte', by: 'texte', ver: 'texte', verNum: 'entier' };
const TEXTE_MAX = { iv: 200, salt: 200, writer: 120, at: 40, by: 200, ver: 40 };

function monterDocuments(app, d) {
  const { DATA_DIR, sauvRefus, cleEstPublique, quotaOk, monStr, versionMin, fbLireDocument, config } = d;
  const DIR = path.join(DATA_DIR, 'documents');
  fs.mkdirSync(DIR, { recursive: true });

  const memo = new Map();       // t → { v, doc, maj } ; absent de la Map = pas encore lu
  const attentes = new Map();   // t → Set d'attentes ouvertes
  const verrous = new Map();    // t → promesse de la dernière opération sérialisée
  const quotas = new Map();
  const compte = { copies: 0, ecritures: 0 };
  /* ⛔ DES ÉCHECS RÉCENTS, PAS UN TOTAL. Un compteur cumulé ne repart à zéro qu'au redémarrage :
     un seul échec passager ferait crier la surveillance TOUTES LES HEURES jusqu'au prochain
     déploiement — la leçon de `mailRefus` (CLAUDE.md). On garde des horodatages, bornés, et
     `/health` publie ce qui tombe dans la dernière heure. */
  const recents = { copie: [], illisible: [], ecriture: [] };
  const noter = (k) => { const a = recents[k]; a.push(Date.now()); if (a.length > 500) a.splice(0, a.length - 500); };
  const dansLHeure = (k) => { const lim = Date.now() - 3600000; return recents[k].filter(ts => ts > lim).length; };

  const copieActive = () => !(config && config.documents && config.documents.copieFirebase === false);
  const technique = t => ESPACES_TECHNIQUES.includes(t);
  /* Un nom de fichier sûr. La garde de clé passe AVANT et refuse déjà tout espace inconnu ;
     celle-ci empêche qu'un identifiant, même connu, puisse jamais désigner un autre chemin. */
  const nomSur = t => /^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(t);
  const chemin = (t, suffixe) => path.join(DIR, t + (suffixe || '') + '.json');

  function porte(t, kh) {
    if (!t || !nomSur(t)) return { code: 400, error: 'espace invalide', motif: 'identite' };
    if (technique(t)) return null;
    const r = sauvRefus(t, kh, 'synchro');
    if (r) {
      const motif = r.code === 404 ? 'inconnu' : /repli/.test(r.error) ? 'repli' : /ferm/.test(r.error) ? 'ferme' : 'cle';
      return { code: r.code, error: r.error, motif };
    }
    if (cleEstPublique(t)) return { code: 409, motif: 'cle_partagee',
      error: 'Cette entreprise utilise encore la clé de synchronisation partagée. Elle doit recevoir sa propre clé.' };
    return null;
  }

  /* ⛔ SÉRIALISÉ PAR ESPACE. Deux appareils qui lisent en même temps une place vide lanceraient
     deux copies depuis Firebase, et une écriture arrivée ENTRE les deux serait effacée par la
     seconde. Une chaîne de promesses par espace, jamais un verrou global : une entreprise lente
     ne doit pas faire attendre les autres. */
  function verrou(t, fn) {
    const avant = verrous.get(t) || Promise.resolve();
    const suite = avant.then(fn, fn);
    const fin = suite.catch(() => {});
    verrous.set(t, fin);
    fin.then(() => { if (verrous.get(t) === fin) verrous.delete(t); });
    return suite;
  }

  function lireFichier(p) {
    try { return fs.readFileSync(p, 'utf8'); }
    catch (e) { if (e.code === 'ENOENT') return null; noter('illisible'); throw Object.assign(new Error('lecture'), { code: 'ILLISIBLE' }); }
  }
  /* Rend `null` quand le document n'existe pas, JETTE quand il existe et ne se lit pas. */
  function charger(t) {
    if (memo.has(t)) return memo.get(t);
    let brut = lireFichier(chemin(t));
    /* Un redémarrage entre les deux renommages laisse `.prec` seul : c'est la dernière version
       complète, et c'est elle qu'on sert plutôt que de croire l'entreprise vide. */
    if (brut === null) brut = lireFichier(chemin(t, '.prec'));
    if (brut === null) return null;
    let e = null;
    try { e = JSON.parse(brut); } catch (x) { e = null; }
    if (!e || typeof e !== 'object' || !(e.v > 0) || !e.doc || typeof e.doc !== 'object') {
      noter('illisible');
      throw Object.assign(new Error('document illisible'), { code: 'ILLISIBLE' });
    }
    memo.set(t, e);
    return e;
  }
  function ecrireAtomique(p, contenu) {
    const tmp = p + '.tmp-' + process.pid + '-' + crypto.randomBytes(4).toString('hex');
    const fd = fs.openSync(tmp, 'w', 0o600);
    try { fs.writeSync(fd, contenu); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    return tmp;
  }
  function ranger(t, e) {
    const p = chemin(t);
    const tmp = ecrireAtomique(p, JSON.stringify(e));
    try {
      if (fs.existsSync(p)) fs.renameSync(p, chemin(t, '.prec'));
      fs.renameSync(tmp, p);
    } catch (x) { try { fs.unlinkSync(tmp); } catch (_e) {} throw x; }
    memo.set(t, e);
  }

  function notifier(t, e) {
    const s = attentes.get(t);
    if (!s) return;
    attentes.delete(t);
    for (const a of s) { clearTimeout(a.minuteur); a.rendre({ v: e.v, doc: e.doc }); }
  }

  /* La copie depuis Firebase. Rend l'entrée copiée, `{ vide: true }` quand Firebase n'a jamais eu
     de document pour cet espace, `null` quand on n'a PAS PU savoir. */
  async function copierDepuisFirebase(t) {
    if (!copieActive()) return { vide: true };
    let r = null;
    try { r = await fbLireDocument(technique(t) ? 'elanB_teams' : 'elan_teams', t); } catch (e) { r = null; }
    if (!r) { noter('copie'); return null; }
    if (!r.existe) return { vide: true };
    const champs = (r.champs && typeof r.champs === 'object') ? r.champs : {};
    const e = { v: 1, doc: champs, maj: Date.now(), copieFirebase: true };
    try {
      /* L'original, À PART et jamais réécrit : c'est la preuve de ce que Firebase contenait le
         jour de la copie, et le point de retour si la nouvelle version devait être retirée. */
      const pf = chemin(t, '.firebase');
      if (!fs.existsSync(pf)) {
        const tmp = ecrireAtomique(pf, JSON.stringify({ champs, majFirebase: r.majFirebase || '', copieLe: Date.now() }));
        fs.renameSync(tmp, pf);
      }
      ranger(t, e);
    } catch (x) { noter('copie'); console.error('documents : copie depuis Firebase non rangée —', x.code || 'erreur'); return null; }
    compte.copies++;
    console.log('documents : un document d\'équipe copié depuis Firebase (' + Math.round(JSON.stringify(champs).length / 1024) + ' Ko)');
    return e;
  }
  /* Le document de l'espace, copie paresseuse comprise. Rend l'entrée, `null` pour une équipe
     neuve, et JETTE (`ILLISIBLE` / `COPIE`) quand on ne sait pas. */
  async function obtenir(t) {
    const e = charger(t);
    if (e) return e;
    const c = await copierDepuisFirebase(t);
    if (c === null) throw Object.assign(new Error('copie impossible'), { code: 'COPIE' });
    return c.vide ? null : c;
  }

  function champsValides(doc, fusion) {
    if (!doc || typeof doc !== 'object' || Array.isArray(doc)) return 'document attendu';
    const cles = Object.keys(doc);
    for (const k of cles) {
      const genre = CHAMPS[k];
      if (!genre) return 'champ inconnu';
      const v = doc[k];
      if (genre === 'texte' && typeof v !== 'string') return 'champ ' + k + ' : texte attendu';
      if (genre === 'texte' && TEXTE_MAX[k] && v.length > TEXTE_MAX[k]) return 'champ ' + k + ' trop long';
      if (genre === 'nombre' && !(typeof v === 'number' && isFinite(v))) return 'champ ' + k + ' : nombre attendu';
      if (genre === 'entier' && !Number.isInteger(v)) return 'champ ' + k + ' : entier attendu';
    }
    if (!Number.isInteger(doc.verNum)) return 'verNum requis';
    if (fusion) { if (cles.some(k => k !== 'ver' && k !== 'verNum')) return 'une fusion ne porte que la version'; }
    else if (!(doc.enc && doc.iv && doc.salt)) return 'document chiffré attendu (enc, iv, salt)';
    return '';
  }

  const refuser = (res, code, error, motif, plus) => res.status(code).json(Object.assign({ error, motif }, plus || {}));
  const erreurDe = (res, x) => x && x.code === 'COPIE'
    ? refuser(res, 503, 'copie depuis Firebase impossible pour le moment — réessaie', 'copie')
    : refuser(res, 503, 'document illisible sur le serveur', 'illisible');

  /* Le budget PAR ESPACE se compte APRÈS la preuve : compté avant, n'importe qui épuiserait le
     quota d'une entreprise en tapant son identifiant (la règle de `op-socle.js`). Les plafonds
     sont larges : un téléphone qui écoute repose sa question toutes les 25 s, et un bureau
     entier partage une seule adresse IP. */
  const budget = (cle, t, max) => quotaOk(quotas, cle + ':' + t, max, 3600000);

  app.post('/api/doc/lire', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    if (!budget('l', t, 6000)) return refuser(res, 429, 'trop de lectures — réessaie plus tard', 'quota');
    try {
      const e = await verrou(t, () => obtenir(t));
      res.set('Cache-Control', 'no-store');
      res.json(e ? { v: e.v, doc: e.doc } : { v: 0, doc: null });
    } catch (x) { erreurDe(res, x); }
  });

  app.post('/api/doc/ecrire', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    const fusion = b.fusion === true;
    const doc = b.doc;
    const faute = champsValides(doc, fusion);
    if (faute) return refuser(res, 400, faute, 'forme');
    let taille = 0; try { taille = JSON.stringify(doc).length; } catch (x) { taille = Infinity; }
    if (taille > DOC_MAX) return refuser(res, 413, 'document trop lourd', 'poids', { max: DOC_MAX });
    /* ⛔ LA PORTE DE VERSION, CELLE QUE LA RÈGLE FIRESTORE TENAIT (`versionOk()`) : en dessous du
       minimum exigé depuis la Tour, l'écriture est refusée. Sans elle, un appareil resté en
       arrière écrirait un format que les autres ne savent plus lire. */
    const min = +versionMin() || 0;
    if (min && doc.verNum < min) return refuser(res, 426, 'version trop ancienne — mets l\'application à jour', 'version', { min });
    if (!budget('e', t, 6000)) return refuser(res, 429, 'trop d\'écritures — réessaie plus tard', 'quota');
    try {
      const r = await verrou(t, async () => {
        const e = await obtenir(t);
        let neuf;
        if (fusion) {
          const base = e ? e.doc : {};
          /* Une fusion qui ne change rien ne fait pas une version : chaque appareil annonce sa
             version à chaque démarrage, et chaque version réveille TOUS les appareils à l'écoute. */
          if (e && Object.keys(doc).every(k => base[k] === doc[k])) return { v: e.v, inchange: true };
          neuf = Object.assign({}, base, doc);
        } else neuf = Object.assign({}, doc);
        const entree = { v: (e ? e.v : 0) + 1, doc: neuf, maj: Date.now() };
        try { ranger(t, entree); }
        catch (x) { noter('ecriture'); console.error('documents : écriture non rangée —', x.code || 'erreur'); throw Object.assign(new Error('écriture'), { code: 'ECRITURE' }); }
        compte.ecritures++;
        notifier(t, entree);
        return { v: entree.v };
      });
      res.json(Object.assign({ ok: true }, r));
    } catch (x) {
      if (x && x.code === 'ECRITURE') return refuser(res, 503, 'écriture impossible sur le serveur', 'ecriture');
      erreurDe(res, x);
    }
  });

  app.post('/api/doc/attendre', async (req, res) => {
    const b = req.body || {};
    const t = monStr(b.t, 80), kh = monStr(b.kh, 64).toLowerCase();
    const refus = porte(t, kh); if (refus) return refuser(res, refus.code, refus.error, refus.motif);
    if (!budget('a', t, 20000)) return refuser(res, 429, 'trop d\'attentes — réessaie plus tard', 'quota');
    const connu = parseInt(b.v, 10) || 0;
    let e;
    try { e = charger(t); } catch (x) { return erreurDe(res, x); }
    const v = e ? e.v : 0;
    if (v > connu) return res.json({ v, doc: e.doc });   // déjà en retard : tout de suite
    const s = attentes.get(t) || (attentes.set(t, new Set()), attentes.get(t));
    if (s.size >= ATTENTES_MAX) return res.json({ v, inchange: true });
    const a = { minuteur: null, rendre: null };
    a.rendre = (o) => { if (!res.headersSent) res.json(o); };
    a.minuteur = setTimeout(() => { s.delete(a); if (!s.size && attentes.get(t) === s) attentes.delete(t); a.rendre({ v, inchange: true }); }, ATTENTE_MS);
    if (a.minuteur.unref) a.minuteur.unref();
    /* Un onglet fermé ne doit laisser ni minuteur ni réponse en l'air.
       ⛔ `res.on('close')`, JAMAIS `req.on('close')` — MESURÉ le 25 septembre 2026, banc figé :
       sur une requête POST, Node émet `close` sur la REQUÊTE dès que son corps est lu, c'est-à-dire
       tout de suite, par `express.json`. L'attente se retirait elle-même à l'instant où elle
       était posée, et plus aucune écriture ne la réveillait : l'appareil restait sourd, sans
       erreur. `/api/op/flux` n'a pas ce piège parce qu'il est en GET, sans corps. La RÉPONSE,
       elle, ne se ferme que quand on a répondu ou que la connexion tombe. */
    res.on('close', () => { clearTimeout(a.minuteur); s.delete(a); if (!s.size && attentes.get(t) === s) attentes.delete(t); });
    s.add(a);
  });

  /* ⛔ FERMER OU SUPPRIMER UNE ENTREPRISE EFFACE AUSSI SON DOCUMENT ICI — le pendant exact de
     l'effacement de `elan_teams/<t>` chez Firebase. Les attentes ouvertes sont rendues : les
     appareils reposent leur question et tombent sur le refus de `sauvRefus`. */
  function effacer(t) {
    if (!t || !nomSur(t)) return false;
    let fait = false;
    for (const suf of ['', '.prec', '.firebase']) {
      try { fs.unlinkSync(chemin(t, suf)); fait = true; } catch (e) { if (e.code !== 'ENOENT') console.error('documents : effacement incomplet —', e.code || 'erreur'); }
    }
    memo.delete(t);
    const s = attentes.get(t);
    if (s) { attentes.delete(t); for (const a of s) { clearTimeout(a.minuteur); a.rendre({ v: 0, inchange: true }); } }
    return fait;
  }

  /* Pour `/health` : des compteurs et des booléens, jamais un identifiant d'espace. */
  function sante() {
    return { actif: true, copieFirebase: copieActive(), copiesEchec1h: dansLHeure('copie'), illisibles1h: dansLHeure('illisible'),
      ecrituresEchec1h: dansLHeure('ecriture') };
  }

  return { effacer, sante, ESPACES_TECHNIQUES, ATTENTE_MS, DOC_MAX,
    _pourBanc: { charger, memo, compte } };
}

/* ⛔ LA FORME DES VALEURS FIRESTORE (API REST), DÉPLIÉE UNE FOIS, ICI. Un `integerValue` arrive
   en TEXTE ; le lire comme tel ferait comparer « 1695 » à 1695 et tout document paraîtrait
   différent. */
function valeurFirestore(v) {
  if (!v || typeof v !== 'object') return null;
  if ('stringValue' in v) return v.stringValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return Number(v.doubleValue);
  if ('booleanValue' in v) return !!v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if ('mapValue' in v) { const o = {}; const f = (v.mapValue && v.mapValue.fields) || {}; for (const k of Object.keys(f)) o[k] = valeurFirestore(f[k]); return o; }
  if ('arrayValue' in v) return ((v.arrayValue && v.arrayValue.values) || []).map(valeurFirestore);
  return null;
}
function champsFirestore(fields) {
  const o = {};
  for (const k of Object.keys(fields || {})) o[k] = valeurFirestore(fields[k]);
  return o;
}

module.exports = { monterDocuments, champsFirestore, valeurFirestore, ESPACES_TECHNIQUES, ATTENTE_MS, DOC_MAX };
