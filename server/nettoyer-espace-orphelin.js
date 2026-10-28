#!/usr/bin/env node
/* ══ NETTOYER UN ESPACE ORPHELIN — HORS ANNUAIRE, INVISIBLE DANS LA TOUR ═══════════════════════════════
 *
 * Usage, SUR LE VPS, en root :
 *     TEAMOP_DATA=/opt/teamop/data node /opt/teamop/repo/server/nettoyer-espace-orphelin.js <t>              → CONSTAT : dit ce qu'il trouverait, n'écrit rien
 *     TEAMOP_DATA=/opt/teamop/data node /opt/teamop/repo/server/nettoyer-espace-orphelin.js <t> --faire      → efface (le service doit être ARRÊTÉ)
 * Options : `--nom "ELAN"` (répétable) retire cette entreprise des incidents de `monitor.json` ; `--bloquer` (voir plus bas).
 *
 * ⛔ POURQUOI CET OUTIL EXISTE. Un espace d'AVANT le renommage (l'ancien espace de repli `elan-gestion`, l'ancienne bêta
 * `elan-gestion-beta`) n'est dans AUCUN annuaire : la Tour ne le liste pas (sa liste « hors annuaire » ne montre que les espaces
 * vus récemment), donc la suppression totale (`/api/monitor/entreprise/supprimer`, deux temps avec code par courriel) ne
 * l'atteint pas — elle refuse même ces deux identifiants (`ESPACES_INTOUCHABLES`). Ils gardent pourtant, mesuré sur le VPS
 * le 28 octobre 2026 : un journal de connexions AVEC les identifiants des salariés, des abonnements push, de l'usage, des
 * lignes de `bugs.jsonl`. Des données de personnes qui n'appartiennent plus à aucun espace vivant.
 *
 * ⛔ CE QU'IL REFUSE, code 2, avant toute lecture des autres fichiers :
 *   · un identifiant vide ou mal formé (même forme que `exigerT` de `socle.js` : 1 à 64 signes `[A-Za-z0-9_-]`, un chiffre ou
 *     une lettre en tête — c'est aussi ce qui interdit `..` et `/` : un chemin se construit sur cet identifiant) ;
 *   · un identifiant qui est dans l'annuaire (`espaces.json` : une entrée porte ce `t`, lu comme `espaceT()`, ou ce slug) :
 *     un espace VIVANT ne se nettoie pas par cet outil, on passe par la Tour ;
 *   · `opgestion-beta` : c'est la bêta vivante, pas un orphelin.
 *   Code 3 : le service tourne (voir plus bas). Code 4 : un fichier à modifier est illisible, ou l'annuaire est introuvable
 *   (`TEAMOP_DATA` pointe peut-être au mauvais endroit) — RIEN n'est écrit : tout est lu et validé avant la première écriture.
 *
 * ⛔ CE QU'IL FAIT AVEC `--faire`, dans cet ordre, chaque écriture par un temporaire du MÊME dossier puis un renommage
 * (comme `espacesEcrire` : écrit en place, un arrêt au mauvais moment laisse un fichier tronqué) :
 *   a. le BLOCAGE d'abord, comme la route de suppression : `entreprises-fermees.json` → `espaces` (retiré de `suspendus` et de
 *      `suspendusLe` s'il y était). ⚠️ Pour `elan-gestion` et `elan-gestion-beta` (les « espaces techniques » du serveur), le
 *      blocage n'est PAS posé tout seul : fermer l'espace de repli ferait répondre `ferme: true` à tout appareil qui s'y connecte
 *      encore, et l'application se VIDE à ce signal. `--bloquer` le pose quand même, une fois qu'on sait qu'aucun appareil n'y vit.
 *   b. les registres indexés par `t` : `connexions.json`, `usage.json`, `ordres.json`, `acces.json`, `comptes.json`,
 *      `devis-acces.json` ; les entrées de `subscriptions.json` dont `teamId === t` ; les boîtes de `mailboxes.json` dont
 *      `teamId === t` (les mots de passe restent scellés tels quels dans les AUTRES boîtes : l'outil ne déchiffre rien et n'a pas
 *      besoin de la clé maître) ;
 *   c. `sauvegardes/<t>`, `pieces/<t>`, le socle de `t` (`socle/<t>` et ses lignes de `socle-annuaire.db`, par
 *      `socle.effacerEntreprise` — la fonction même de la route de suppression ; sans annuaire du socle, le dossier seul) ;
 *   d. `bugs.jsonl` : les lignes dont `team === t` ; toutes les autres restent INTACTES, octet pour octet ;
 *   e. `monitor.json` (à côté de `TEAMOP_CONFIG`) : avec `--nom`, l'entreprise est retirée des incidents ET de l'archive (nom
 *      comparé sans casse ni accents, espaces repliés) ; un incident qui n'a plus aucune entreprise disparaît, les autres restent.
 *      L'outil ne connaît pas le nom d'une entreprise à partir de `t` : sans `--nom`, il ne touche pas aux incidents, et le dit.
 *      Il y écrit aussi UNE ligne de journal (`journal` et `actions`, sans aucune donnée) pour que la Tour garde la trace.
 *   Il ne touche PAS à `replies.jsonl` ni `sentmap.jsonl` (courrier de l'espace) : il en COMPTE les lignes pour le dire.
 *
 * ⛔ POURQUOI IL FAUT ARRÊTER LE SERVICE. `teamop-api` tient `connexions.json`, `subscriptions.json`, `usage.json`,
 * `monitor.json`… EN MÉMOIRE et les réécrit en entier quelques centaines de millisecondes après un geste : un fichier nettoyé
 * sous ses pieds est réécrit tel qu'il était — l'espace revient, identifiants des salariés compris. Avec `--faire`, l'outil
 * REFUSE donc de s'exécuter tant que `systemctl is-active teamop-api` répond « active » (code 3). Le constat, lui, lit sans
 * condition. Sans `systemctl` (machine de test), le service est considéré arrêté, et l'outil le dit.
 *     systemctl stop teamop-api
 *     TEAMOP_DATA=/opt/teamop/data node …/nettoyer-espace-orphelin.js <t> --faire
 *     systemctl start teamop-api
 *
 * ⛔ IL N'AFFICHE JAMAIS une adresse, un identifiant de salarié ni un nom de personne : des NOMBRES et des chemins. Une
 * exception n'est jamais imprimée avec son message (un message de `JSON.parse` cite un extrait du texte) : son code seulement.
 */
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');

const DATA_DIR = process.env.TEAMOP_DATA || '/opt/teamop/data';
const CONFIG_PATH = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const MONITOR_PATH = path.join(path.dirname(CONFIG_PATH), 'monitor.json');   // même formule que MONITOR_PATH d'index.js
const SERVICE = 'teamop-api';
/* Même forme que `RE_T` de `socle.js` : une seule règle d'identifiant, et c'est elle qui rend sûrs tous les chemins ci-dessous. */
const RE_T = /^[A-Za-z0-9][A-Za-z0-9_-]{0,63}$/;
/* `ESPACES_INTOUCHABLES` d'index.js (≈8587) : le repli, l'ancienne bêta, la bêta vivante. */
const TECHNIQUES = ['elan-gestion', 'elan-gestion-beta'];
const BETA_VIVANTE = 'opgestion-beta';

const dit = (...a) => console.log(...a);
const refus = (code, m) => { console.error('\n✗ ' + m + '\n'); process.exit(code); };

/* ── les arguments ── */
const args = process.argv.slice(2);
let T = null, FAIRE = false, BLOQUER = false; const NOMS = [];
for (let i = 0; i < args.length; i++) {
  const a = args[i];
  if (a === '--faire') FAIRE = true;
  else if (a === '--bloquer') BLOQUER = true;
  else if (a === '--nom') { if (i + 1 >= args.length) refus(2, '--nom attend un nom d\'entreprise.'); NOMS.push(args[++i]); }
  else if (a.startsWith('--nom=')) NOMS.push(a.slice(6));
  else if (a.startsWith('--')) refus(2, 'option inconnue : ' + a.slice(0, 20) + '. Usage : nettoyer-espace-orphelin.js <t> [--faire] [--nom "…"]… [--bloquer]');
  else if (T === null) T = a;
  else refus(2, 'un seul identifiant à la fois.');
}
const norm = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const NOMS_NORM = new Set(NOMS.map(norm));
if (NOMS_NORM.has('')) refus(2, '--nom ne peut pas être vide.');

if (T === null) refus(2, 'identifiant d\'espace manquant.\nUsage : TEAMOP_DATA=/opt/teamop/data node nettoyer-espace-orphelin.js <t> [--faire] [--nom "…"]…');
if (!RE_T.test(T)) refus(2, 'identifiant refusé : attendu 1 à 64 signes parmi [A-Za-z0-9_-], une lettre ou un chiffre en tête. Rien n\'a été lu ni modifié.');
if (T === BETA_VIVANTE) refus(2, 'cet identifiant est la bêta vivante, pas un orphelin. Rien n\'a été modifié.');

/* ── lecture ── */
function lireJSON(chemin) {
  let brut;
  try { brut = fs.readFileSync(chemin); }
  catch (e) { return e && e.code === 'ENOENT' ? { absent: true } : { illisible: true, code: (e && e.code) || 'lecture' }; }
  try { return { donnees: JSON.parse(brut.toString('utf8')) }; }
  catch (e) { return { illisible: true, code: 'JSON invalide' }; }
}
const estObjet = (x) => !!x && typeof x === 'object' && !Array.isArray(x);

/* ── 1. L'ANNUAIRE : un espace vivant ne se nettoie pas ici ── */
/* Comme `espaceT(e)` d'index.js (≈6555) : le champ `t`, sinon le `t` du code (du base64 qui porte du JSON). */
function espaceT(e) {
  if (!e) return '';
  if (e.t) return String(e.t);
  try { return String(JSON.parse(Buffer.from(e.code, 'base64').toString('utf8')).t || ''); } catch (err) { return ''; }
}
const ESPACES = path.join(DATA_DIR, 'espaces.json');
{
  const a = lireJSON(ESPACES);
  if (a.illisible || (a.donnees !== undefined && !estObjet(a.donnees)))
    refus(4, 'espaces.json est illisible (' + (a.code || 'forme inattendue') + ') : impossible de dire si cet espace est vivant. Rien n\'a été modifié.');
  if (a.absent && FAIRE)
    refus(4, 'espaces.json est introuvable dans ' + DATA_DIR + ' : TEAMOP_DATA pointe-t-il au bon endroit ? Rien n\'a été modifié.');
  if (!a.absent) {
    const vivants = Object.keys(a.donnees).filter(slug => slug === T || espaceT(a.donnees[slug]) === T);
    if (vivants.length)
      refus(2, 'cet identifiant est dans l\'annuaire (' + vivants.length + ' entrée(s)) : un espace vivant ne se nettoie pas par cet outil — passer par la Tour. Rien n\'a été modifié.');
  }
}

/* ── 2. LE SERVICE ── */
function etatService() {
  let r;
  try { r = cp.spawnSync('systemctl', ['is-active', SERVICE], { encoding: 'utf8', timeout: 10000 }); }
  catch (e) { return { actif: false, absent: true }; }
  if (r.error && r.error.code === 'ENOENT') return { actif: false, absent: true };
  const sortie = String(r.stdout || '').trim();
  return { actif: ['active', 'activating', 'reloading', 'deactivating', 'refreshing'].includes(sortie), absent: false, sortie };
}
const SVC = etatService();
if (FAIRE && SVC.actif)
  refus(3, 'le service ' + SERVICE + ' tourne : il tient ces fichiers en mémoire et les réécrirait tels qu\'ils étaient.\n'
    + '  Arrête d\'abord :  systemctl stop ' + SERVICE + '\n  puis relance cet outil, puis :  systemctl start ' + SERVICE + '\n  Rien n\'a été modifié.');

/* ── 3. CE QU'IL Y A À NETTOYER (tout est lu et calculé AVANT la première écriture) ── */
const f = (n) => path.join(DATA_DIR, n);
const plan = [];      // { nom, chemin, n, texte|null }
const nonTouche = []; // lignes d'information
const illisibles = [];
let trouve = 0;       // total de ce qui existe sous ce `t`, tous fichiers confondus

/* Un registre { <t>: … } : retire la clé `t`. */
function registreParCle(fichier, libelle, unite, compter) {
  const l = lireJSON(f(fichier));
  if (l.absent) { dit('  ' + fichier + ' : absent'); return; }
  if (l.illisible || !estObjet(l.donnees)) { illisibles.push(fichier); dit('  ' + fichier + ' : ILLISIBLE (' + (l.code || 'forme inattendue') + ')'); return; }
  if (!Object.prototype.hasOwnProperty.call(l.donnees, T)) { dit('  ' + fichier + ' : ' + libelle + ' — aucune entrée'); return; }
  const n = compter ? compter(l.donnees[T]) : 1;
  const sans = Object.assign({}, l.donnees); delete sans[T];
  plan.push({ nom: fichier, chemin: f(fichier), n, texte: JSON.stringify(sans) });
  trouve += 1;
  dit('  ' + fichier + ' : ' + libelle + ' — 1 entrée' + (unite ? ' (' + n + ' ' + unite + ')' : ''));
}

dit('');
dit('  Nettoyage d\'un espace orphelin — ' + (FAIRE ? 'MODE ACTION (--faire)' : 'CONSTAT (rien n\'est modifié)'));
dit('  données : ' + DATA_DIR);
dit('  service ' + SERVICE + ' : ' + (SVC.absent ? 'systemctl introuvable — considéré ARRÊTÉ (machine sans systemd)' : (SVC.actif ? 'ACTIF' : 'arrêté' + (SVC.sortie ? ' (' + SVC.sortie + ')' : ''))));
dit('  ⚠️ le service tient ces fichiers en mémoire : avec --faire il doit être arrêté, puis redémarré après (systemctl start ' + SERVICE + ')');
dit('');
dit('  annuaire : cet identifiant n\'y est pas (c\'est bien un orphelin)');
dit('');

/* (a) le blocage */
const FERMEES = f('entreprises-fermees.json');
const poserBlocage = !TECHNIQUES.includes(T) || BLOQUER;
{
  const l = lireJSON(FERMEES);
  if (l.illisible || (l.donnees !== undefined && !estObjet(l.donnees))) { illisibles.push('entreprises-fermees.json'); dit('  entreprises-fermees.json : ILLISIBLE (' + (l.code || 'forme inattendue') + ')'); }
  else if (!poserBlocage) dit('  entreprises-fermees.json : blocage NON posé — espace technique du serveur (fermer l\'espace de repli vide les appareils qui s\'y connectent encore) ; --bloquer pour le poser quand même');
  else {
    const e = l.absent ? { emails: [], espaces: [], suspendus: [], suspendusLe: {} } : Object.assign({}, l.donnees);
    for (const k of ['emails', 'espaces', 'suspendus']) if (!Array.isArray(e[k])) e[k] = [];
    if (!estObjet(e.suspendusLe)) e.suspendusLe = {};
    const deja = e.espaces.includes(T), susp = e.suspendus.includes(T) || Object.prototype.hasOwnProperty.call(e.suspendusLe, T);
    if (deja && !susp) dit('  entreprises-fermees.json : déjà bloqué');
    else {
      if (!deja) e.espaces = e.espaces.concat([T]);
      e.suspendus = e.suspendus.filter(x => x !== T);
      e.suspendusLe = Object.assign({}, e.suspendusLe); delete e.suspendusLe[T];
      plan.push({ nom: 'entreprises-fermees.json', chemin: FERMEES, n: 1, texte: JSON.stringify(e), bloquage: true });
      dit('  entreprises-fermees.json : blocage ' + (deja ? 'déjà posé, suspension retirée' : 'à poser' + (susp ? ' (suspension retirée)' : '')));
    }
  }
}

/* (b) les registres */
registreParCle('connexions.json', 'journal de connexions', 'ligne(s) de journal', (v) => Array.isArray(v) ? v.length : 1);
registreParCle('usage.json', 'usage', '');
registreParCle('ordres.json', 'ordres', '');
registreParCle('acces.json', 'code d\'accès', '');
registreParCle('comptes.json', 'annuaire de connexion', '');
registreParCle('devis-acces.json', 'accès devis', '');

/* subscriptions.json : { endpoint: { sub, teamId, … } } */
{
  const fichier = 'subscriptions.json', l = lireJSON(f(fichier));
  if (l.absent) dit('  ' + fichier + ' : absent');
  else if (l.illisible || !estObjet(l.donnees)) { illisibles.push(fichier); dit('  ' + fichier + ' : ILLISIBLE (' + (l.code || 'forme inattendue') + ')'); }
  else {
    const sans = {}; let n = 0;
    for (const [ep, x] of Object.entries(l.donnees)) { if (x && x.teamId === T) n++; else sans[ep] = x; }
    if (n) { plan.push({ nom: fichier, chemin: f(fichier), n, texte: JSON.stringify(sans) }); trouve += n; }
    dit('  ' + fichier + ' : ' + n + ' abonnement(s) sur ' + Object.keys(l.donnees).length);
  }
}
/* mailboxes.json : { <boîte>: { id, teamId, email, passScelle|pass, … } } — rien n'est déchiffré, les autres boîtes restent telles quelles */
{
  const fichier = 'mailboxes.json', l = lireJSON(f(fichier));
  if (l.absent) dit('  ' + fichier + ' : absent');
  else if (l.illisible || !l.donnees || typeof l.donnees !== 'object') { illisibles.push(fichier); dit('  ' + fichier + ' : ILLISIBLE (' + (l.code || 'forme inattendue') + ')'); }
  else {
    const visee = (b) => !!b && typeof b === 'object' && b.teamId === T;
    let n = 0, total = 0, sans;
    if (Array.isArray(l.donnees)) { total = l.donnees.length; n = l.donnees.filter(visee).length; sans = l.donnees.filter(b => !visee(b)); }
    else { sans = {}; for (const [k, b] of Object.entries(l.donnees)) { total++; if (visee(b)) n++; else sans[k] = b; } }
    if (n) { plan.push({ nom: fichier, chemin: f(fichier), n, texte: JSON.stringify(sans), mode: 0o600 }); trouve += n; }
    dit('  ' + fichier + ' : ' + n + ' boîte(s) sur ' + total);
  }
}

/* (c) les dossiers et le socle */
function compterFichiers(dossier) {
  let n = 0;
  const marcher = (d) => { let es; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch (e) { return; } for (const x of es) { if (x.isDirectory()) marcher(path.join(d, x.name)); else n++; } };
  marcher(dossier); return n;
}
const DOSSIERS = [
  ['sauvegardes', 'copies de sauvegarde', path.join(DATA_DIR, 'sauvegardes', T)],
  ['pieces', 'pièces jointes', path.join(DATA_DIR, 'pieces', T)],
  ['socle', 'socle (fichiers)', path.join(DATA_DIR, 'socle', T)],
];
for (const [cle, libelle, dossier] of DOSSIERS) {
  if (!fs.existsSync(dossier)) { dit('  ' + cle + '/<t> : absent'); continue; }
  const n = compterFichiers(dossier);
  trouve += 1;
  plan.push({ nom: cle + '/<t>', chemin: dossier, n, dossier: true, socle: cle === 'socle' });
  dit('  ' + cle + '/<t> : ' + libelle + ' — ' + n + ' fichier(s)');
}
const ANNUAIRE_SOCLE = path.join(DATA_DIR, 'socle-annuaire.db');
/* ⛔ AUCUN SQL ICI : `node:sqlite` n'est requis que par `socle.js` (une seule porte pour le SQL, gardée par `test-723`). On passe donc par ses
   fonctions exportées — `appareilsDe` et `existe`, lectures seules —, et seulement si l'annuaire du socle existe déjà (`annuaire()` en CRÉE un sinon). */
function socleLignes() {
  if (!fs.existsSync(ANNUAIRE_SOCLE)) return { absent: true };
  process.env.TEAMOP_DATA = DATA_DIR;   // socle.js lit son dossier au chargement : le même que cet outil
  const ew = process.emitWarning; process.emitWarning = () => {};   // « SQLite est expérimental » : sans intérêt ici
  try {
    const S = require('./socle');
    return { appareils: S.appareilsDe(T).length, connue: !!S.existe(T) };
  } catch (e) { return { illisible: true }; }
  finally { process.emitWarning = ew; }
}
{
  const s = socleLignes();
  if (s.absent) dit('  socle-annuaire.db : absent');
  else if (s.illisible) { dit('  socle-annuaire.db : présent, non lisible depuis cet outil (le service du socle le relira au démarrage)'); }
  else {
    dit('  socle-annuaire.db : ' + s.appareils + ' appareil(s) ; entreprise ' + (s.connue ? 'connue (annuaire ou base)' : 'inconnue'));
    if (s.appareils || s.connue) { trouve += 1; plan.push({ nom: 'socle-annuaire.db', chemin: ANNUAIRE_SOCLE, n: s.appareils, annuaireSocle: true }); }
  }
}

/* (d) bugs.jsonl — par enregistrement (ligne + son saut de ligne), pour que les autres restent intactes octet pour octet */
{
  const chemin = f('bugs.jsonl');
  let brut = null;
  try { brut = fs.readFileSync(chemin); } catch (e) { if (e && e.code !== 'ENOENT') { illisibles.push('bugs.jsonl'); dit('  bugs.jsonl : ILLISIBLE (' + (e.code || 'lecture') + ')'); } else dit('  bugs.jsonl : absent'); }
  if (brut) {
    const garde = []; let n = 0, total = 0, d = 0;
    while (d < brut.length) {
      let i = brut.indexOf(10, d); const fin = i < 0 ? brut.length : i + 1; i = fin;
      const rec = brut.subarray(d, fin); d = fin;
      const txt = rec.toString('utf8').trim();
      if (txt) total++;
      let vise = false; try { const o = JSON.parse(txt); vise = !!o && o.team === T; } catch (e) {}
      if (vise) n++; else garde.push(rec);
    }
    if (n) { plan.push({ nom: 'bugs.jsonl', chemin, n, binaire: Buffer.concat(garde) }); trouve += n; }
    dit('  bugs.jsonl : ' + n + ' ligne(s) sur ' + total);
  }
}

/* (e) monitor.json */
const JOURNAL_QUI = 'outil nettoyer-espace-orphelin';
let monitor = null;
{
  const l = lireJSON(MONITOR_PATH);
  if (l.absent) dit('  monitor.json : absent (' + MONITOR_PATH + ') — pas de ligne de journal');
  else if (l.illisible || !estObjet(l.donnees)) { illisibles.push('monitor.json'); dit('  monitor.json : ILLISIBLE (' + (l.code || 'forme inattendue') + ')'); }
  else {
    const d = Object.assign({}, l.donnees);
    let entRetirees = 0, issuesRetirees = 0, archiveRetirees = 0;
    if (NOMS_NORM.size) {
      const trier = (liste, cle) => {
        if (!Array.isArray(liste)) return liste;
        const sortie = [];
        for (const i of liste) {
          if (!i || !Array.isArray(i.entreprises)) { sortie.push(i); continue; }
          const reste = i.entreprises.filter(e => !NOMS_NORM.has(norm(e && e.nom)));
          const ote = i.entreprises.length - reste.length;
          if (!ote) { sortie.push(i); continue; }
          entRetirees += ote;
          if (!reste.length) { if (cle === 'issues') issuesRetirees++; else archiveRetirees++; continue; }   // plus aucune entreprise : l'incident n'a plus de raison d'être ici
          sortie.push(Object.assign({}, i, { entreprises: reste }));
        }
        return sortie;
      };
      d.issues = trier(d.issues, 'issues');
      d.archive = trier(d.archive, 'archive');
      dit('  monitor.json : ' + entRetirees + ' entreprise(s) retirée(s) des incidents (' + issuesRetirees + ' incident(s) supprimé(s), ' + archiveRetirees + ' dans l\'archive) pour ' + NOMS_NORM.size + ' nom(s) donné(s)');
      trouve += entRetirees;
    } else dit('  monitor.json : incidents NON touchés (pas de --nom : l\'outil ne connaît pas le nom d\'une entreprise à partir de son identifiant)');
    monitor = { d, entRetirees };
  }
}

/* ce qu'il ne touche pas, mais qu'il compte */
function compterLignes(fichier, champ) {
  let brut; try { brut = fs.readFileSync(f(fichier), 'utf8'); } catch (e) { return null; }
  let n = 0; for (const l of brut.split('\n')) { try { const o = JSON.parse(l); if (o && o[champ] === T) n++; } catch (e) {} }
  return n;
}
for (const [fichier, champ] of [['replies.jsonl', 'teamId'], ['sentmap.jsonl', 'teamId']]) {
  const n = compterLignes(fichier, champ);
  if (n) nonTouche.push(fichier + ' : ' + n + ' ligne(s) de cet espace — NON touchées par cet outil');
}
if (nonTouche.length) { dit(''); nonTouche.forEach(x => dit('  ⚠️ ' + x)); }

/* ── 4. CONCLUSION DU CONSTAT / REFUS SI ILLISIBLE ── */
dit('');
if (illisibles.length) {
  if (FAIRE) refus(4, illisibles.length + ' fichier(s) illisible(s) (' + illisibles.join(', ') + ') : à réparer d\'abord. Rien n\'a été modifié.');
  dit('  ⚠️ ' + illisibles.length + ' fichier(s) illisible(s) : --faire refuserait (code 4) tant qu\'ils ne sont pas réparés.');
}
if (!FAIRE) {
  dit('  CONSTAT : ' + (trouve ? plan.length + ' fichier(s) ou dossier(s) seraient modifiés.' : 'aucune trace de cet identifiant.'));
  dit('  Pour agir :  systemctl stop ' + SERVICE + '  &&  TEAMOP_DATA=' + DATA_DIR + ' node ' + process.argv[1] + ' ' + T + ' --faire' + (NOMS.length ? NOMS.map(() => ' --nom "…"').join('') : ' [--nom "…"]') + '  ;  systemctl start ' + SERVICE);
  dit('');
  process.exit(0);
}
if (!trouve) {
  dit('  Aucune trace de cet identifiant : rien à nettoyer, rien n\'est écrit (pas même un blocage — vérifier l\'orthographe).');
  dit('');
  process.exit(0);
}

/* ── 5. L'ACTION ── */
/* Temporaire du MÊME dossier (un renommage ne traverse pas les volumes), puis renommage : le fichier est toujours entier.
   Propriétaire et droits de l'ancien conservés — sinon un service qui ne tourne pas en root ne pourrait plus le réécrire. */
function ecrireAtomique(chemin, contenu, modeParDefaut) {
  const tmp = path.join(path.dirname(chemin), '.' + path.basename(chemin) + '.nettoyage-' + process.pid + '.tmp');
  let st = null; try { st = fs.statSync(chemin); } catch (e) {}
  let fd = null;
  try {
    fd = fs.openSync(tmp, 'wx', st ? (st.mode & 0o777) : (modeParDefaut || 0o600));
    fs.writeSync(fd, contenu);
    fs.fsyncSync(fd);
    fs.closeSync(fd); fd = null;
    if (st) { try { fs.chownSync(tmp, st.uid, st.gid); } catch (e) {} fs.chmodSync(tmp, st.mode & 0o777); }
    fs.renameSync(tmp, chemin);
  } catch (e) {
    if (fd !== null) { try { fs.closeSync(fd); } catch (x) {} }
    try { fs.unlinkSync(tmp); } catch (x) {}
    throw e;
  }
}

const faits = [];
function echecEtape(nom, e) {
  console.error('\n✗ ' + nom + ' : écriture impossible (' + ((e && e.code) || 'erreur') + ').');
  console.error('  Déjà fait : ' + (faits.length ? faits.join(', ') : 'rien') + '. L\'outil peut être relancé : il reprend où il s\'est arrêté.');
  console.error('  Le service ' + SERVICE + ' reste à redémarrer : systemctl start ' + SERVICE + '\n');
  process.exit(1);
}
const ordre = (p) => p.bloquage ? 0 : (p.dossier || p.annuaireSocle) ? 2 : p.nom === 'bugs.jsonl' ? 3 : 1;
for (const p of plan.slice().sort((a, b) => ordre(a) - ordre(b))) {
  try {
    if (p.dossier && !p.socle) fs.rmSync(p.chemin, { recursive: true, force: true });
    else if (p.socle || p.annuaireSocle) {
      /* Une seule fois pour les deux : `effacerEntreprise` retire le dossier ET les lignes de l'annuaire du socle. */
      if (!p.fait) {
        const lies = plan.filter(x => x.socle || x.annuaireSocle); lies.forEach(x => { x.fait = true; });
        if (fs.existsSync(ANNUAIRE_SOCLE)) {
          process.env.TEAMOP_DATA = DATA_DIR;
          const ew = process.emitWarning; process.emitWarning = () => {};
          let r; try { r = require('./socle').effacerEntreprise(T); } finally { process.emitWarning = ew; }
          if (!r || !r.ok) throw Object.assign(new Error('socle'), { code: 'socle non effacé' });
        } else fs.rmSync(path.join(DATA_DIR, 'socle', T), { recursive: true, force: true });
        if (fs.existsSync(path.join(DATA_DIR, 'socle', T))) throw Object.assign(new Error('socle'), { code: 'dossier du socle encore là' });
      }
    }
    else if (p.binaire) ecrireAtomique(p.chemin, p.binaire);
    else ecrireAtomique(p.chemin, p.texte, p.mode);
    faits.push(p.nom);
  } catch (e) { echecEtape(p.nom, e); }
}

/* La trace, sans donnée : une ligne dans `journal` (la forme de `monLog`) et une dans `actions` (la forme de `monGesteNoter`, que le Journal de la Tour affiche). */
if (monitor) {
  try {
    const maintenant = Date.now();
    const d = monitor.d;
    d.journal = (Array.isArray(d.journal) ? d.journal : []).concat([{ ts: maintenant, qui: JOURNAL_QUI, ok: true, appareil: 'serveur', motif: 'espace orphelin nettoyé' }]).slice(-300);
    d.actions = (Array.isArray(d.actions) ? d.actions : []).concat([{ ts: maintenant, qui: JOURNAL_QUI, geste: 'a nettoyé un espace orphelin (hors annuaire)', cible: T }]).slice(-500);
    ecrireAtomique(MONITOR_PATH, JSON.stringify(d), 0o600);
    faits.push('monitor.json');
  } catch (e) { echecEtape('monitor.json', e); }
}

dit('  ✓ FAIT — ' + faits.length + ' élément(s) : ' + faits.join(', '));
dit('');
dit('  ⛔ Le service est resté arrêté : REDÉMARRE-LE →  systemctl start ' + SERVICE);
dit('  Puis relancer l\'outil sans --faire doit répondre « aucune trace » (ou ne plus rien trouver que le blocage).');
dit('');
