/* LE PONT DE PAULINE (25 octobre 2026) — voir dans la Tour ce que fait l'agente de prospection.
 *
 * Pauline n'est PAS un agent de ce serveur : c'est Harvey (https://github.com/ethanplusai/harvey, correctif français de TeamOP) qui tourne sur le
 * Mac de Justin, avec sa propre base SQLite. Ce module ne la pilote pas, il ne l'écoute pas : il REÇOIT, toutes les quinze minutes, un RELEVÉ complet
 * (un instantané, pas un flux) fabriqué par `outils/pauline-releve.py`, et le range pour que la Tour l'affiche. Un relevé remplace le précédent.
 *
 * ┌─ LE CONTRAT DU RELEVÉ (version 1) — ce que l'écran de la Tour lit ──────────────────────────────────────────────────────────────────────────────┐
 *   { version: 1,
 *     genereLe: ISO,                                   // l'heure du Mac, au moment où il a lu la base de Harvey
 *     chauffe:  { debut: 'AAAA-MM-JJ'|null,            // warmup.start_date de harvey.local.yaml ; « 2099-12-31 » = le verrou (aucun courriel à froid)
 *                 jour: entier|null,                   // jours écoulés depuis `debut` (négatif : la chauffe n'a pas commencé) ; null = pas de rampe
 *                 plafondDuJour: entier,               // le plafond de courriels À FROID aujourd'hui (la rampe, bornée par max_daily_sends)
 *                 plafondMax?: entier,                 // max_daily_sends : le plafond de tous les envois, réponses comprises
 *                 phase?: 'verrou'|'chauffe'|'rodee'|'sans_rampe' },
 *     jour:     { date?: 'AAAA-MM-JJ',                 // le jour LOCAL du Mac (c'est le jour que Harvey compte pour son plafond à froid)
 *                 envoyes: entier,                     // tous les courriels partis depuis minuit
 *                 envoyesFroid?: entier,               // dont courriels à froid (séquence) : ceux que `plafondDuJour` borne
 *                 reponses: entier,                    // réponses de prospects reçues depuis minuit
 *                 refus: entier,                       // refus / désinscriptions enregistrés depuis minuit
 *                 enAttente: entier },                 // courriels qui attendent l'accord de Justin, maintenant
 *     recherches: [ { quand: ISO, metier: texte, ville: texte, trouvees: entier,
 *                     origine?: 'decouverte'|'cycle' } ],      // ≤ 100, les plus récentes d'abord
 *     entreprises: [ { id, nom, ville, metier,
 *                      etat: 'trouvee'|'courriel_pret'|'envoye'|'a_repondu'|'refus',
 *                      email?, contact?, site?: domaine, majLe: ISO } ],   // ≤ 500, les plus récemment touchées d'abord ; `site` = le nom de domaine seul (Tour v2.116)
 *     courriels: [ { id, entrepriseId, etat: 'en_attente'|'envoye'|'refuse'|'repondu', objet, texte, quand: ISO,
 *                    genre?: 'sequence'|'reponse', etape?: entier, statutBrut?: texte } ],   // ≤ 300 ; `quand` = l'envoi, sinon la rédaction
 *     reponses: [ { entrepriseId, quand: ISO, resume: texte, nature: 'interesse'|'refus'|'question'|'autre' } ],   // ≤ 300
 *     attentes?: { verificateur?: booléen,               // une clé de vérification des adresses est posée sur le Mac (OUI/NON, jamais la clé) — sans elle Harvey n'écrit jamais
 *                  signaux?: { proposes, confirmes, rejetes: entier, liste: [ { code, libelle, description } ] },   // ≤ 40 : les critères PROPOSÉS, à confirmer par Justin
 *                  adresses?: { verifiees, risquees, invalides, aConfirmer: entier } },   // Tour v2.114 : ce qui attend Justin, dit en français dans la Tour
 *     avancement?: { entreprises, avecSite?, sansSite?, sitesLus?, mailsCherches?, adresses?, verifiees?, risquees?, invalides?, aConfirmer?,
 *                    ecrits?, aEcrire?, envoyes?, reponses?: entier } }   // Tour v2.116 : la bande « Today » de Harvey (get_live_status), comptée pareil ; absent = inconnu
 *   Ce qui n'existe PAS dans la base de Harvey (et qu'on n'invente donc pas) : le métier et la ville d'une recherche ne sont écrits nulle part — ils se
 *   déduisent des entreprises rattachées à l'exécution (`runs` ↔ `observations`) ; le « résumé » d'une réponse est le début de son texte, pas un résumé ;
 *   aucune notion de « chauffe » en base (elle vient du fichier de réglages). Tout champ optionnel absent vaut « inconnu », jamais zéro.
 * └─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
 *
 * ⛔ DONNÉES PERSONNELLES. Des prospects : entreprises, parfois le nom d'un dirigeant, des adresses professionnelles. Elles restent chez TEAM OP (même responsable
 *    de traitement que Harvey) mais :
 *    · le fichier est CHIFFRÉ AU REPOS quand la clé maître du socle est là (AES-256-GCM de `socle.sceller`, sous-clé HKDF à étiquette propre, comme les boîtes mail
 *      de `coffre-boites.js`). Sans clé (installation de test) : clair, droits 600, et le journal le DIT une fois — sur le VPS la clé est déposée depuis le 24 septembre ;
 *    · AUCUNE donnée de prospect n'entre dans le journal du serveur : ni nom, ni adresse, ni objet, ni texte — seulement des NOMBRES et des motifs de refus génériques ;
 *    · l'historique est ÉLAGUÉ à 90 jours (courriels, recherches, réponses) à la réception et à la lecture ;
 *    · seul le patron lit (`monPatronStrict`), comme l'audience.
 * ⛔ LA PORTE : `POST /api/pauline/releve`, `Authorization: Bearer <jeton>`. Le serveur ne détient QUE l'empreinte SHA-256 du jeton (`config.pauline.jetonSha256`, posée par
 *    Justin sur le VPS) : le jeton vit dans `~/harvey/.env` sur le Mac, jamais ici, jamais dans le dépôt, jamais dans un journal. Comparaison en temps constant des
 *    deux empreintes. Pas d'empreinte configurée (ou mal formée) → 503, et RIEN n'est lu du corps. L'authentification passe AVANT la lecture du corps : 2 Mo ne se
 *    lisent pas pour un inconnu. Le corps est borné (2 Mo) sur CETTE route seulement, et l'adresse est limitée (`req.ip`, jamais l'en-tête brut : il se falsifie).
 * ⛔ DEUX ÉTATS D'ÉCHEC DISTINCTS À LA LECTURE : « rien reçu » (`recuLe: null`, le pont n'a jamais parlé) n'est PAS « fichier illisible » (503) — on ne dit pas à Justin
 *    qu'il n'y a rien quand le registre est cassé.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const FICHIER = 'pauline-releve.json';
const CORPS_MAX = '2mb';
const GARDE_JOURS = 90;
const MAX = { entreprises: 500, courriels: 300, recherches: 100, reponses: 300 };
const QUOTA_PAR_MINUTE = 8;                 // par adresse, toutes tentatives comprises (un relevé toutes les 15 minutes : 8 laisse de la place aux reprises)
const QUOTA_TABLE_MAX = 5000;
const ETIQUETTE_CLE = 'teamop-pauline-releve-v1';
const ETATS_ENTREPRISE = ['trouvee', 'courriel_pret', 'envoye', 'a_repondu', 'refus'];
const ETATS_COURRIEL = ['en_attente', 'envoye', 'refuse', 'repondu'];
const NATURES = ['interesse', 'refus', 'question', 'autre'];
const PHASES = ['verrou', 'chauffe', 'rodee', 'sans_rampe'];
const ORIGINES = ['decouverte', 'cycle'];
const GENRES = ['sequence', 'reponse'];
/* les décisions de Justin depuis la Tour (27 octobre 2026) : voir « LES DÉCISIONS » plus bas */
const FICHIER_DEC = 'pauline-decisions.json';
const ACTIONS = ['accepter', 'refuser', 'modifier'];
const ETATS_DECISION = ['a_faire', 'fait', 'echec'];
const MOTIFS_RESULTAT = ['deja_traite', 'modifie', 'introuvable', 'erreur'];
const DEC_GARDE_JOURS = 30;
const DEC_MAX = 2000;
const VUS_MAX = 3000;
const DEC_CORPS_MAX = '64kb';
const MAX_SIGNAUX = 40;
/* le site d'une entreprise : un nom de domaine, rien d'autre (ni schéma, ni chemin) — la Tour en fait un lien https:// sans rien y ajouter */
const RE_SITE = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;
const AVANCEMENT = ['entreprises', 'avecSite', 'sansSite', 'sitesLus', 'mailsCherches', 'adresses', 'verifiees', 'risquees', 'invalides', 'aConfirmer', 'ecrits', 'aEcrire', 'envoyes', 'reponses'];

/* ── la validation, champ par champ : un type faux jette l'élément, un texte trop long est coupé, une clé inconnue n'entre jamais ── */
const estObjet = o => !!o && typeof o === 'object' && !Array.isArray(o);
/* sans caractères de contrôle (sauf, pour les textes longs, la fin de ligne et la tabulation) */
// eslint-disable-next-line no-control-regex
const NETTOYER_COURT = /[\u0000-\u001f\u007f\u2028\u2029]+/g;
// eslint-disable-next-line no-control-regex
const NETTOYER_LONG = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g;
function texte(v, max, long) {
  if (typeof v !== 'string') return null;
  return v.replace(long ? NETTOYER_LONG : NETTOYER_COURT, long ? '' : ' ').slice(0, max).trim();
}
function entier(v, min, max) {
  return typeof v === 'number' && Number.isInteger(v) && v >= min && v <= max ? v : null;
}
const RE_ID = /^(?!(?:__proto__|constructor|prototype)$)[A-Za-z0-9_.:-]{1,64}$/;   /* jamais un nom de propriété d'objet : un identifiant sert de CLÉ (décisions) */
const RE_JOUR = /^\d{4}-\d{2}-\d{2}$/;
const RE_HEURE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d{1,9})?)?(Z|[+-]\d{2}:?\d{2})?)?$/;
const RE_COURRIEL = /^[^\s@<>"',;]{1,64}@[^\s@<>"',;]{1,190}$/;
function jour(v) {
  if (typeof v !== 'string' || !RE_JOUR.test(v)) return null;
  const t = Date.parse(v + 'T00:00:00Z');
  return Number.isFinite(t) && new Date(t).toISOString().slice(0, 10) === v ? v : null;
}
/* Une heure ISO → ISO UTC normalisée. Une heure sans fuseau est lue comme UTC (le script du Mac envoie toujours « Z »). Au-delà de deux jours dans le futur : refusée
   (une horloge fausse ne doit pas rendre un élément « éternellement récent » : il ne serait jamais élagué). */
function heure(v, maintenant) {
  if (typeof v !== 'string' || !RE_HEURE.test(v)) return null;
  const s = /T/.test(v) && !/(Z|[+-]\d{2}:?\d{2})$/.test(v) ? v + 'Z' : v.length === 10 ? v + 'T00:00:00Z' : v;
  const t = Date.parse(s);
  if (!Number.isFinite(t) || t > maintenant + 2 * 86400000 || t < Date.UTC(2020, 0, 1)) return null;
  return new Date(t).toISOString();
}

/* Le cœur, sans Express ni disque. Rend { ok:true, releve, ecartes } ou { ok:false, motif } — le motif ne porte JAMAIS une valeur du corps. */
function validerReleve(corps, maintenant) {
  const t0 = Number.isFinite(maintenant) ? maintenant : Date.now();
  if (!estObjet(corps)) return { ok: false, motif: 'le relevé doit être un objet' };
  if (corps.version !== 1) return { ok: false, motif: 'version du relevé inconnue (1 attendu)' };
  const genereLe = heure(corps.genereLe, t0);
  if (!genereLe) return { ok: false, motif: 'genereLe absent ou illisible' };

  const ch = corps.chauffe;
  if (!estObjet(ch)) return { ok: false, motif: 'chauffe absente' };
  const chauffe = {
    debut: ch.debut === null || ch.debut === undefined ? null : jour(ch.debut),
    jour: ch.jour === null || ch.jour === undefined ? null : entier(ch.jour, -100000, 100000),
    plafondDuJour: entier(ch.plafondDuJour, 0, 100000),
  };
  if (ch.debut !== null && ch.debut !== undefined && chauffe.debut === null) return { ok: false, motif: 'chauffe.debut illisible' };
  if (ch.jour !== null && ch.jour !== undefined && chauffe.jour === null) return { ok: false, motif: 'chauffe.jour illisible' };
  if (chauffe.plafondDuJour === null) return { ok: false, motif: 'chauffe.plafondDuJour illisible' };
  const pm = entier(ch.plafondMax, 0, 100000); if (pm !== null) chauffe.plafondMax = pm;
  if (PHASES.includes(ch.phase)) chauffe.phase = ch.phase;

  const jr = corps.jour;
  if (!estObjet(jr)) return { ok: false, motif: 'jour absent' };
  const J = { envoyes: entier(jr.envoyes, 0, 1e6), reponses: entier(jr.reponses, 0, 1e6), refus: entier(jr.refus, 0, 1e6), enAttente: entier(jr.enAttente, 0, 1e6) };
  for (const k of Object.keys(J)) if (J[k] === null) return { ok: false, motif: 'jour.' + k + ' illisible' };
  const jd = jour(jr.date); if (jd) J.date = jd;
  const fr = entier(jr.envoyesFroid, 0, 1e6); if (fr !== null) J.envoyesFroid = fr;

  for (const k of Object.keys(MAX)) if (!Array.isArray(corps[k])) return { ok: false, motif: k + ' doit être une liste' };
  const ecartes = { entreprises: 0, courriels: 0, recherches: 0, reponses: 0, tronque: [] };
  /* au-delà du plafond, on garde les PREMIERS (le script du Mac envoie les plus récents d'abord) ; ce qui dépasse n'est même pas regardé */
  const prendre = (k) => { const l = corps[k]; if (l.length > MAX[k]) { ecartes.tronque.push(k); return l.slice(0, MAX[k]); } return l; };

  const recherches = [];
  for (const r of prendre('recherches')) {
    if (!estObjet(r)) { ecartes.recherches++; continue; }
    const quand = heure(r.quand, t0), metier = texte(r.metier, 120), ville = texte(r.ville, 120), trouvees = entier(r.trouvees, 0, 1e6);
    if (!quand || metier === null || ville === null || trouvees === null) { ecartes.recherches++; continue; }
    const o = { quand, metier, ville, trouvees };
    if (ORIGINES.includes(r.origine)) o.origine = r.origine;
    recherches.push(o);
  }
  const entreprises = [], idsEnt = new Set();
  for (const e of prendre('entreprises')) {
    if (!estObjet(e)) { ecartes.entreprises++; continue; }
    const id = typeof e.id === 'string' && RE_ID.test(e.id) ? e.id : null;
    const nom = texte(e.nom, 200), ville = texte(e.ville, 120), metier = texte(e.metier, 120), majLe = heure(e.majLe, t0);
    if (!id || idsEnt.has(id) || nom === null || ville === null || metier === null || !ETATS_ENTREPRISE.includes(e.etat) || !majLe) { ecartes.entreprises++; continue; }
    idsEnt.add(id);
    const o = { id, nom, ville, metier, etat: e.etat, majLe };
    const em = texte(e.email, 254); if (em && RE_COURRIEL.test(em)) o.email = em.toLowerCase();
    const ct = texte(e.contact, 120); if (ct) o.contact = ct;
    if (typeof e.site === 'string' && RE_SITE.test(e.site)) o.site = e.site;
    entreprises.push(o);
  }
  const courriels = [], idsCou = new Set();
  for (const c of prendre('courriels')) {
    if (!estObjet(c)) { ecartes.courriels++; continue; }
    const id = typeof c.id === 'string' && RE_ID.test(c.id) ? c.id : null;
    const entrepriseId = typeof c.entrepriseId === 'string' && (c.entrepriseId === '' || RE_ID.test(c.entrepriseId)) ? c.entrepriseId : null;
    const objet = texte(c.objet, 300), corpsTxt = texte(c.texte, 20000, true), quand = heure(c.quand, t0);
    if (!id || idsCou.has(id) || entrepriseId === null || objet === null || corpsTxt === null || !ETATS_COURRIEL.includes(c.etat) || !quand) { ecartes.courriels++; continue; }
    idsCou.add(id);
    const o = { id, entrepriseId, etat: c.etat, objet, texte: corpsTxt, quand };
    if (GENRES.includes(c.genre)) o.genre = c.genre;
    const et = entier(c.etape, 0, 1000); if (et !== null) o.etape = et;
    const sb = texte(c.statutBrut, 40); if (sb) o.statutBrut = sb;
    const mj = texte(c.maj, 40); if (mj) o.maj = mj;   /* la version du brouillon dans Harvey (updated_at) : « accepter » ne vaut que pour CE texte */
    courriels.push(o);
  }
  const reponses = [];
  for (const r of prendre('reponses')) {
    if (!estObjet(r)) { ecartes.reponses++; continue; }
    const entrepriseId = typeof r.entrepriseId === 'string' && (r.entrepriseId === '' || RE_ID.test(r.entrepriseId)) ? r.entrepriseId : null;
    const quand = heure(r.quand, t0), resume = texte(r.resume, 400, true);
    if (entrepriseId === null || !quand || resume === null || !NATURES.includes(r.nature)) { ecartes.reponses++; continue; }
    reponses.push({ entrepriseId, quand, resume, nature: r.nature });
  }
  /* CE QUI ATTEND JUSTIN (Tour v2.114) : optionnel — un relevé d'un script plus ancien n'en a pas, et ce qui manque reste « inconnu », jamais « rien à faire ».
     Une partie mal formée est ÉCARTÉE seule (le reste du relevé est bon) ; une clé inconnue n'entre jamais. */
  const releve = { version: 1, genereLe, chauffe, jour: J, recherches, entreprises, courriels, reponses };
  const at = corps.attentes;
  if (estObjet(at)) {
    const attentes = {};
    if (typeof at.verificateur === 'boolean') attentes.verificateur = at.verificateur;
    const sg = at.signaux;
    if (estObjet(sg)) {
      const n = { proposes: entier(sg.proposes, 0, 1e5), confirmes: entier(sg.confirmes, 0, 1e5), rejetes: entier(sg.rejetes, 0, 1e5) };
      if (n.proposes !== null && n.confirmes !== null && n.rejetes !== null && Array.isArray(sg.liste)) {
        const liste = [];
        for (const x of sg.liste.slice(0, MAX_SIGNAUX)) {
          if (!estObjet(x)) continue;
          const code = texte(x.code, 64), libelle = texte(x.libelle, 120), description = texte(x.description, 300);
          if (code && libelle !== null && description !== null) liste.push({ code, libelle: libelle || code, description });
        }
        attentes.signaux = Object.assign(n, { liste });
      }
    }
    const ad = at.adresses;
    if (estObjet(ad)) {
      const a = { verifiees: entier(ad.verifiees, 0, 1e6), risquees: entier(ad.risquees, 0, 1e6), invalides: entier(ad.invalides, 0, 1e6), aConfirmer: entier(ad.aConfirmer, 0, 1e6) };
      if (Object.values(a).every(v => v !== null)) attentes.adresses = a;
    }
    releve.attentes = attentes;
  }
  /* OÙ EN EST PAULINE (Tour v2.116) : optionnel, chiffre par chiffre — un chiffre illisible est écarté seul ; sans le nombre d'entreprises, rien n'est gardé. */
  const av = corps.avancement;
  if (estObjet(av) && entier(av.entreprises, 0, 1e7) !== null) {
    const a = {};
    for (const k of AVANCEMENT) { const n = entier(av[k], 0, 1e7); if (n !== null) a[k] = n; }
    releve.avancement = a;
  }
  return { ok: true, releve, ecartes };
}

/* L'élagage : courriels, recherches et réponses de plus de 90 jours s'en vont (les entreprises sont un ÉTAT, pas un historique). Rend un relevé neuf. */
function elaguer(releve, maintenant) {
  const limite = maintenant - GARDE_JOURS * 86400000;
  const recent = x => Date.parse(x.quand) >= limite;
  return Object.assign({}, releve, { courriels: releve.courriels.filter(recent), recherches: releve.recherches.filter(recent), reponses: releve.reponses.filter(recent) });
}

/* ── le rangement : un fichier, écrit en entier par un temporaire puis un renommage (droits 600), chiffré quand la clé maître est là ── */
function sousCle() {
  let socle; try { socle = require('./socle'); } catch (e) { return null; }
  const k = socle.kek();
  return k ? Buffer.from(crypto.hkdfSync('sha256', k, Buffer.alloc(0), Buffer.from(ETIQUETTE_CLE, 'utf8'), 32)) : null;
}
const aad = recuLe => 'pauline-releve|v1|' + recuLe;
function ecrireAtomique(chemin, txt) {
  const tmp = chemin + '.' + process.pid + '.tmp';
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'w', 0o600);
    fs.writeSync(fd, txt); fs.fsyncSync(fd); fs.closeSync(fd); fd = null;
    fs.renameSync(tmp, chemin);
    try { fs.chmodSync(chemin, 0o600); } catch (e) {}
  } catch (e) {
    if (fd !== null) { try { fs.closeSync(fd); } catch (_) {} }
    try { fs.unlinkSync(tmp); } catch (_) {}
    throw e;
  }
}
/* Ce qui va sur le disque. Rend { texte, chiffre }. */
function versDisque(releve, recuLe, cle) {
  if (!cle) return { texte: JSON.stringify({ v: 1, chiffre: false, recuLe, releve }), chiffre: false };
  const socle = require('./socle');
  const scelle = socle.sceller(cle, Buffer.from(JSON.stringify(releve), 'utf8'), aad(recuLe)).toString('base64');
  return { texte: JSON.stringify({ v: 1, chiffre: true, recuLe, scelle }), chiffre: true };
}
/* Rend { etat:'vide' } | { etat:'ok', recuLe, releve } | { etat:'illisible', cause:'forme'|'cle' } — jamais de valeur du fichier dans la cause. */
function deDisque(chemin, cle) {
  let brut;
  try { brut = fs.readFileSync(chemin, 'utf8'); } catch (e) { return e && e.code === 'ENOENT' ? { etat: 'vide' } : { etat: 'illisible', cause: 'forme' }; }
  let o;
  try { o = JSON.parse(brut); } catch (e) { return { etat: 'illisible', cause: 'forme' }; }
  if (!estObjet(o) || o.v !== 1 || !Number.isFinite(o.recuLe)) return { etat: 'illisible', cause: 'forme' };
  if (o.chiffre === true) {
    if (typeof o.scelle !== 'string') return { etat: 'illisible', cause: 'forme' };
    if (!cle) return { etat: 'illisible', cause: 'cle' };
    try {
      const socle = require('./socle');
      const releve = JSON.parse(socle.desceller(cle, Buffer.from(o.scelle, 'base64'), aad(o.recuLe)).toString('utf8'));
      return { etat: 'ok', recuLe: o.recuLe, releve };
    } catch (e) { return { etat: 'illisible', cause: 'cle' }; }
  }
  return estObjet(o.releve) ? { etat: 'ok', recuLe: o.recuLe, releve: o.releve } : { etat: 'illisible', cause: 'forme' };
}

/* ── LES DÉCISIONS (27 octobre 2026) — accepter, refuser ou modifier un courriel de Pauline depuis la Tour, sur le téléphone ──
 * Justin : « je peux pas être tout le temps sur le site de Harvey ; que Pauline m'envoie le mail dans la messagerie de la Tour, j'accepte, je refuse,
 * je modifie, et quand j'accepte elle l'envoie. » Le serveur ne PILOTE toujours pas Harvey : il garde une liste de décisions que le Mac vient
 * chercher (`GET /api/pauline/decisions`, même jeton que le relevé), applique dans la base de Harvey, puis rend compte (`POST …/resultats`).
 *   ⛔ Une décision ne vise qu'un courriel QUI ATTEND l'accord (`en_attente` et, quand il est connu, `statutBrut` « pending_review ») dans le DERNIER relevé :
 *      on ne décide pas sur un courriel que le serveur ne connaît pas, ni sur un courriel déjà parti.
 *   ⛔ « modifier » remplace l'objet et le texte PUIS accepte : c'est ce que fait le geste de la Tour (« Enregistrer et envoyer »).
 *   ⛔ Le Mac applique sous la garde du statut (`WHERE status = 'pending_review'`) : une décision arrivée trop tard ne fait rien, et le DIT (`deja_traite`).
 *   ⛔ Le fichier porte des textes de courriels : chiffré au repos comme le relevé, élagué à 30 jours, et rien de son contenu ne va au journal.
 * Rend { ok:true, id, decision } ou { ok:false, motif } — le motif ne cite jamais une valeur du corps. */
function validerDecision(corps) {
  if (!estObjet(corps)) return { ok: false, motif: 'la décision doit être un objet' };
  const id = typeof corps.id === 'string' && RE_ID.test(corps.id) ? corps.id : null;
  if (!id) return { ok: false, motif: 'identifiant de courriel illisible' };
  if (!ACTIONS.includes(corps.action)) return { ok: false, motif: 'action inconnue (accepter, refuser ou modifier)' };
  const decision = { action: corps.action };
  if (corps.action === 'modifier') {
    const objet = texte(corps.objet, 300), t = texte(corps.texte, 20000, true);
    if (!objet) return { ok: false, motif: 'objet vide' };
    if (!t) return { ok: false, motif: 'texte vide' };
    decision.objet = objet; decision.texte = t;
  }
  const maj = texte(corps.maj, 40); if (maj) decision.maj = maj;   /* la version du texte que Justin a LU (relevé) */
  return { ok: true, id, decision };
}
/* Le courriel attend-il l'accord de Justin, d'après le relevé ? (`approved` et `sending` sont aussi « en_attente » dans le relevé : ils attendent l'ENVOI, pas l'accord.) */
function attendAccord(c) { return !!c && c.etat === 'en_attente' && (c.statutBrut === undefined || c.statutBrut === 'pending_review'); }
/* Ce que le Mac doit appliquer : les décisions « à faire », les plus anciennes d'abord. */
function decisionsAFaire(etat) {
  return Object.keys(etat.decisions).filter(id => etat.decisions[id].etat === 'a_faire')
    .sort((x, y) => String(etat.decisions[x].le).localeCompare(String(etat.decisions[y].le)))
    .map(id => Object.assign({ id }, ...['action', 'objet', 'texte', 'maj', 'le'].filter(k => etat.decisions[id][k] !== undefined).map(k => ({ [k]: etat.decisions[id][k] }))));
}
/* Un état de décisions propre : formes vérifiées, 30 jours, au plus DEC_MAX décisions (les plus récentes), au plus VUS_MAX identifiants déjà signalés. */
function elaguerDecisions(etat, maintenant) {
  const limite = maintenant - DEC_GARDE_JOURS * 86400000, decisions = {};
  const src = estObjet(etat) && estObjet(etat.decisions) ? etat.decisions : {};
  const ids = Object.keys(src).filter(id => RE_ID.test(id) && estObjet(src[id]) && ACTIONS.includes(src[id].action) && ETATS_DECISION.includes(src[id].etat) && Date.parse(src[id].le) >= limite)
    .sort((x, y) => String(src[y].le).localeCompare(String(src[x].le))).slice(0, DEC_MAX);
  for (const id of ids) decisions[id] = src[id];
  const vus = (estObjet(etat) && Array.isArray(etat.vus) ? etat.vus : []).filter(v => typeof v === 'string' && RE_ID.test(v)).slice(-VUS_MAX);
  return { decisions, vus };
}
/* Les courriels qui attendent l'accord et qu'on n'a encore jamais signalés (ni décidés) : ceux qui valent une notification. */
function nouveauxEnAttente(releve, etat) {
  const vus = new Set(etat.vus);
  return releve.courriels.filter(c => attendAccord(c) && !vus.has(c.id) && !etat.decisions[c.id]).map(c => c.id);
}
const aadDec = le => 'pauline-decisions|v1|' + le;
function decVersDisque(etat, le, cle) {
  if (!cle) return { texte: JSON.stringify({ v: 1, chiffre: false, le, etat }), chiffre: false };
  const socle = require('./socle');
  return { texte: JSON.stringify({ v: 1, chiffre: true, le, scelle: socle.sceller(cle, Buffer.from(JSON.stringify(etat), 'utf8'), aadDec(le)).toString('base64') }), chiffre: true };
}
/* Rend { etat:'vide' } | { etat:'ok', d } | { etat:'illisible' } — un fichier cassé n'est JAMAIS lu comme « aucune décision » (on écraserait les décisions en attente). */
function decDeDisque(chemin, cle) {
  let brut;
  try { brut = fs.readFileSync(chemin, 'utf8'); } catch (e) { return e && e.code === 'ENOENT' ? { etat: 'vide' } : { etat: 'illisible' }; }
  let o;
  try { o = JSON.parse(brut); } catch (e) { return { etat: 'illisible' }; }
  if (!estObjet(o) || o.v !== 1 || !Number.isFinite(o.le)) return { etat: 'illisible' };
  if (o.chiffre === true) {
    if (typeof o.scelle !== 'string' || !cle) return { etat: 'illisible' };
    try { return { etat: 'ok', d: JSON.parse(require('./socle').desceller(cle, Buffer.from(o.scelle, 'base64'), aadDec(o.le)).toString('utf8')) }; }
    catch (e) { return { etat: 'illisible' }; }
  }
  return estObjet(o.etat) ? { etat: 'ok', d: o.etat } : { etat: 'illisible' };
}

module.exports = function pauline(app, ctx) {
  const { DATA_DIR, monPatronStrict, config } = ctx;
  const now = typeof ctx.maintenant === 'function' ? ctx.maintenant : () => Date.now();
  const P = path.join(DATA_DIR, FICHIER);
  let clairDit = false, empreinteDite = false;

  /* L'empreinte attendue : 64 hexadécimaux, sinon le pont est « non configuré » (et le journal le dit, une fois, sans rien citer de la valeur). */
  function empreinte() {
    const v = config && config.pauline && config.pauline.jetonSha256;
    if (typeof v === 'string' && /^[0-9a-fA-F]{64}$/.test(v.trim())) return Buffer.from(v.trim(), 'hex');
    if (v !== undefined && !empreinteDite) { empreinteDite = true; console.error('pauline : config.pauline.jetonSha256 mal formée (64 hexadécimaux attendus) — le pont reste fermé'); }
    return null;
  }
  function jetonValide(req, attendue) {
    const m = /^Bearer\s+(\S{16,300})$/.exec(String(req.headers.authorization || ''));
    if (!m) return false;
    const vue = crypto.createHash('sha256').update(m[1], 'utf8').digest();
    return vue.length === attendue.length && crypto.timingSafeEqual(vue, attendue);
  }

  /* L'anti-abus : par adresse, fenêtre d'une minute, EN MÉMOIRE. `req.ip` (derrière nginx : `trust proxy` = 1), jamais l'en-tête brut — il se falsifie. */
  const quota = new Map();
  function quotaOk(ip) {
    const t = now();
    if (quota.size > QUOTA_TABLE_MAX) for (const [k, q] of quota) if (t > q.reset) quota.delete(k);
    if (quota.size > QUOTA_TABLE_MAX) return false;
    const k = String(ip || '?'), q = quota.get(k) || { n: 0, reset: t + 60000 };
    if (t > q.reset) { q.n = 0; q.reset = t + 60000; }
    q.n++; quota.set(k, q);
    return q.n <= QUOTA_PAR_MINUTE;
  }

  /* Le dernier relevé, relu du disque (un fichier de 2 Mo au plus, une lecture par visite de l'écran). */
  function lire() { return deDisque(P, sousCle()); }
  const PD = path.join(DATA_DIR, FICHIER_DEC);
  const notifier = typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  /* null = fichier illisible : l'appelant refuse (503) plutôt que de repartir d'un état vide */
  function lireDec() {
    const r = decDeDisque(PD, sousCle());
    if (r.etat === 'illisible') return null;
    return elaguerDecisions(r.etat === 'ok' ? r.d : {}, now());
  }
  function rangerDec(etat) { ecrireAtomique(PD, decVersDisque(elaguerDecisions(etat, now()), now(), sousCle()).texte); }
  /* Au relevé : un courriel qui attend l'accord et qu'on n'a jamais signalé → UNE notification au téléphone (des nombres, jamais un nom ni un objet). */
  function signalerNouveaux(releve) {
    const etat = lireDec(); if (!etat) return 0;
    const neufs = nouveauxEnAttente(releve, etat);
    if (!neufs.length) return 0;
    etat.vus = etat.vus.concat(neufs);
    try { rangerDec(etat); } catch (e) { console.error('pauline : décisions non écrites (' + (e && e.code || 'erreur') + ')'); return 0; }
    if (notifier) {
      const n = neufs.length;
      Promise.resolve().then(() => notifier('Pauline', n + (n > 1 ? ' nouveaux mails attendent' : ' nouveau mail attend') + ' ton accord', '/tour.html#gestion/messagerie'))
        .catch(() => console.error('pauline : notification non partie'));
    }
    return neufs.length;
  }

  function ranger(releve, recuLe0) {
    const recuLe = Number.isFinite(recuLe0) ? recuLe0 : now();
    const cle = sousCle();
    const { texte: txt, chiffre } = versDisque(releve, recuLe, cle);
    ecrireAtomique(P, txt);
    if (!chiffre && !clairDit) { clairDit = true; console.error('pauline : clé maître absente — le relevé est écrit EN CLAIR (droits 600), installation sans clé'); }
    return recuLe;
  }

  /* ⛔ L'ÉLAGAGE DU DISQUE : si le Mac se tait, le dernier relevé resterait là pour toujours (courriels, adresses, noms). Au démarrage puis toutes les six heures : ce qui dépasse 90 jours
     s'efface du fichier (la date de réception, elle, ne bouge pas) ; un relevé reçu il y a plus de 90 jours s'efface en entier. Un fichier illisible n'est jamais touché. */
  function purger() {
    const r = lire();
    if (r.etat !== 'ok') return r.etat;
    const t = now();
    if (t - r.recuLe > GARDE_JOURS * 86400000) { try { fs.unlinkSync(P); } catch (e) { console.error('pauline : relevé périmé non effacé (' + (e && e.code || 'erreur') + ')'); return 'echec'; } return 'efface'; }
    const nu = elaguer(r.releve, t);
    const change = ['courriels', 'recherches', 'reponses'].some(k => nu[k].length !== r.releve[k].length);
    if (!change) return 'inchange';
    try { ranger(nu, r.recuLe); } catch (e) { console.error('pauline : élagage non écrit (' + (e && e.code || 'erreur') + ')'); return 'echec'; }
    return 'elague';
  }
  if (!ctx.sansMinuterie) {
    try { purger(); } catch (e) { console.error('pauline : élagage impossible'); }
    const minuterie = setInterval(() => { try { purger(); } catch (e) { console.error('pauline : élagage impossible'); } }, 6 * 3600 * 1000);
    if (minuterie.unref) minuterie.unref();
  }

  /* ⛔ LA SEULE FAÇON D'ENREGISTRER UNE DÉCISION DE JUSTIN (29 octobre 2026) : la route de la Tour ET les réponses « NON <n> » d'OP MESSAGES (`pont-messages.js`) passent ICI.
     Un second chemin vers un courriel de prospect n'existe pas. Rend { statut, corps } ; ne jette jamais pour un corps hostile (validerDecision). */
  function decider(brut) {
    const v = validerDecision(brut);
    if (!v.ok) return { statut: 400, corps: { error: v.motif } };
    const r = lire();
    if (r.etat !== 'ok') return { statut: 409, corps: { error: 'Le relevé de Pauline n’est pas lisible : on ne décide pas sur un mail qu’on ne voit pas.' } };
    const c = r.releve.courriels.find(x => x.id === v.id);
    if (!c) return { statut: 409, corps: { error: 'Ce mail n’est plus dans le relevé de Pauline.' } };
    if (!attendAccord(c)) return { statut: 409, corps: { error: 'Ce mail n’attend plus ton accord (déjà accepté, envoyé ou refusé).' } };
    if (v.decision.action === 'modifier' && c.genre === 'reponse') v.decision.objet = c.objet;
    /* ⛔ (relecture de gardien) « accepter » vaut pour le texte LU : si Harvey l'a réécrit depuis, on ne l'accepte pas à l'aveugle */
    if (v.decision.action === 'accepter' && c.maj && v.decision.maj && v.decision.maj !== c.maj) return { statut: 409, corps: { error: 'Ce mail a été réécrit depuis que tu l’as lu : relis-le avant de l’accepter.' } };
    if (v.decision.action !== 'accepter') delete v.decision.maj; else if (c.maj) v.decision.maj = c.maj;   /* une réponse garde son objet : sinon elle sortirait du fil de la conversation */
    const etat = lireDec();
    if (!etat) return { statut: 503, corps: { error: 'Les décisions de Pauline sont illisibles sur le serveur : rien n’a été enregistré.' } };
    const avant = etat.decisions[v.id];
    if (avant && avant.etat === 'fait') return { statut: 409, corps: { error: 'Ce mail a déjà été traité sur le Mac.' } };
    etat.decisions[v.id] = Object.assign({ etat: 'a_faire', le: new Date(now()).toISOString() }, v.decision);
    if (!etat.vus.includes(v.id)) etat.vus.push(v.id);
    try { rangerDec(etat); } catch (e) { console.error('pauline : décision non écrite (' + (e && e.code || 'erreur') + ')'); return { statut: 500, corps: { error: 'Décision non enregistrée.' } }; }
    return { statut: 200, corps: { ok: true, id: v.id, action: v.decision.action, etat: 'a_faire' } };
  }

  if (app) {
    const express = require('express');
    const json = express.json({ limit: CORPS_MAX });
    app.post('/api/pauline/releve', (req, res, next) => {
      const attendue = empreinte();
      if (!attendue) return res.status(503).json({ error: 'pont non configuré' });
      if (!quotaOk(req.ip)) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'trop de relevés' }); }
      if (!jetonValide(req, attendue)) return res.status(401).json({ error: 'jeton refusé' });
      next();
    }, json, (req, res) => {
      const v = validerReleve(req.body, now());
      if (!v.ok) return res.status(400).json({ error: 'relevé refusé', motif: v.motif });
      const releve = elaguer(v.releve, now());
      try { ranger(releve); }
      catch (e) { console.error('pauline : relevé non écrit (' + (e && e.code || 'erreur') + ')'); return res.status(500).json({ error: 'relevé non écrit' }); }
      try { signalerNouveaux(releve); } catch (e) { console.error('pauline : signalement impossible'); }
      /* OP MESSAGES (bêta, 29 octobre 2026) : le même relevé, au même moment — sous son propre `try`, rien ne remonte */
      if (typeof ctx.surReleve === 'function') { try { ctx.surReleve(releve, lireDec()); } catch (e) { console.error('pauline : pont OP MESSAGES impossible'); } }
      /* de la comptabilité, rien d'autre : ni nom, ni adresse, ni texte */
      res.json({ ok: true, recu: { entreprises: releve.entreprises.length, courriels: releve.courriels.length, recherches: releve.recherches.length, reponses: releve.reponses.length }, ecartes: v.ecartes });
    });

    app.get('/api/monitor/pauline', monPatronStrict, (req, res) => {
      const r = lire();
      /* `?resume=1` : la pastille de la Messagerie, chaque minute — un NOMBRE, pas le relevé (jusqu'à 900 Ko sur un téléphone en 4G). */
      if (req.query && req.query.resume === '1') {
        if (r.etat !== 'ok') return res.json({ ok: true, attente: 0, connu: false });
        const dec = lireDec();
        if (!dec) return res.json({ ok: true, attente: 0, connu: false });
        return res.json({ ok: true, connu: true, attente: r.releve.courriels.filter(c => attendAccord(c) && !(dec.decisions[c.id] && dec.decisions[c.id].etat !== 'echec')).length });
      }
      if (r.etat === 'illisible') {
        return res.status(503).json({ error: r.cause === 'cle' ? 'Le relevé de Pauline est chiffré et la clé maître ne le déchiffre pas : on ne sait pas ce que fait Pauline.' : 'Le relevé de Pauline est illisible sur le serveur : on ne sait pas ce que fait Pauline.' });
      }
      if (r.etat === 'vide') return res.json({ ok: true, recuLe: null });
      const t = now();
      /* l'état de chaque décision (sans son texte : la Tour l'a déjà) ; illisible → null, et la Tour le DIT au lieu de proposer de redécider */
      const dec = lireDec();
      const decisions = dec ? Object.fromEntries(Object.keys(dec.decisions).map(id => { const x = dec.decisions[id]; return [id, Object.assign({ action: x.action, etat: x.etat, le: x.le }, x.motif ? { motif: x.motif } : {}, x.faitLe ? { faitLe: x.faitLe } : {})]; })) : null;
      res.json({ ok: true, recuLe: new Date(r.recuLe).toISOString(), age: Math.max(0, Math.round((t - r.recuLe) / 1000)), releve: elaguer(r.releve, t), decisions });
    });

    /* La décision de Justin (Tour, patron seul). */
    app.post('/api/monitor/pauline/decision', monPatronStrict, express.json({ limit: DEC_CORPS_MAX }), (req, res) => {
      const r = decider(req.body);
      res.status(r.statut).json(r.corps);
    });

    /* Le Mac vient chercher ce qu'il doit appliquer (même porte que le relevé : empreinte, quota, jeton AVANT tout). */
    const porteMac = (req, res, next) => {
      const attendue = empreinte();
      if (!attendue) return res.status(503).json({ error: 'pont non configuré' });
      if (!quotaOk(req.ip)) { res.setHeader('Retry-After', '60'); return res.status(429).json({ error: 'trop de demandes' }); }
      if (!jetonValide(req, attendue)) return res.status(401).json({ error: 'jeton refusé' });
      next();
    };
    app.get('/api/pauline/decisions', porteMac, (req, res) => {
      const etat = lireDec();
      if (!etat) return res.status(503).json({ error: 'décisions illisibles' });
      res.json({ ok: true, decisions: decisionsAFaire(etat) });
    });
    /* Le compte rendu du Mac : { resultats: [ { id, ok, motif? } ] }. Seule une décision « à faire » change d'état ; un motif hors liste devient « erreur ». */
    app.post('/api/pauline/decisions/resultats', porteMac, express.json({ limit: DEC_CORPS_MAX }), (req, res) => {
      const l = estObjet(req.body) && Array.isArray(req.body.resultats) ? req.body.resultats.slice(0, 500) : null;
      if (!l) return res.status(400).json({ error: 'resultats doit être une liste' });
      const etat = lireDec();
      if (!etat) return res.status(503).json({ error: 'décisions illisibles' });
      let n = 0;
      const t = new Date(now()).toISOString();
      for (const x of l) {
        if (!estObjet(x) || typeof x.id !== 'string' || !RE_ID.test(x.id)) continue;
        const d = etat.decisions[x.id];
        if (!d || d.etat !== 'a_faire') continue;
        /* ⛔ (relecture de gardien) le compte rendu vaut pour la décision que le Mac a LUE : si Justin a changé d'avis entre-temps (refuser après accepter),
           ce résultat-là ne clôt PAS la nouvelle décision — le Mac la verra au passage suivant, et dira « déjà traité » si l'ancienne est partie */
        if (x.le !== d.le) continue;
        if (x.ok === true) { d.etat = 'fait'; delete d.motif; }
        else { d.etat = 'echec'; d.motif = MOTIFS_RESULTAT.includes(x.motif) ? x.motif : 'erreur'; }
        d.faitLe = t; delete d.texte; delete d.objet;   /* appliqué : le texte n'a plus rien à faire ici */
        n++;
      }
      if (n) { try { rangerDec(etat); } catch (e) { console.error('pauline : résultats non écrits (' + (e && e.code || 'erreur') + ')'); return res.status(500).json({ error: 'résultats non écrits' }); } }
      res.json({ ok: true, pris: n });
    });
  }
  return { validerReleve, elaguer, lire, ranger, purger, lireDec, rangerDec, signalerNouveaux, decider };
};
module.exports.validerReleve = validerReleve;
module.exports.validerDecision = validerDecision;
module.exports.attendAccord = attendAccord;
module.exports.decisionsAFaire = decisionsAFaire;
module.exports.elaguerDecisions = elaguerDecisions;
module.exports.nouveauxEnAttente = nouveauxEnAttente;
module.exports.FICHIER_DEC = FICHIER_DEC;
module.exports.elaguer = elaguer;
module.exports.versDisque = versDisque;
module.exports.sousCle = sousCle;
module.exports.deDisque = deDisque;
module.exports.MAX = MAX;
module.exports.GARDE_JOURS = GARDE_JOURS;
module.exports.CORPS_MAX = CORPS_MAX;
module.exports.QUOTA_PAR_MINUTE = QUOTA_PAR_MINUTE;
module.exports.FICHIER = FICHIER;
