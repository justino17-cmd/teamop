/* ══ LES HEURES DE TRAVAIL DES AGENTS (26 octobre 2026) ══════════════════════════════════════════════════════════════════
 *
 * Justin : « je voudrais pouvoir choisir les heures de travail des agents ; je veux que ce soit comme une vraie entreprise ».
 * Ce fichier DIT si l'équipe est ouverte à un instant donné, jour ouvré par jour ouvré, à l'heure de PARIS. Il ne fait agir personne : c'est
 * `agents.js` (`peutAgir`, la porte commune de tout geste d'agent) qui l'interroge, au même endroit que la pause générale.
 *
 *   · des horaires d'ENTREPRISE réglables — par défaut TOUS LES JOURS, du lundi au dimanche, 8 h – 24 h, jours fériés COMPRIS (depuis le 28 octobre 2026 ; avant :
 *     lundi – vendredi, 9 h – 18 h, fermés les fériés). Les jours fériés français restent calculés ici (Pâques compris, sans dépendance) : « feries: true » veut
 *     dire FERMÉ ces jours-là, « feries: false » OUVERT — c'est ce que Justin peut encore régler dans la Tour ;
 *   · des horaires PAR AGENT, facultatifs, qui surchargent ceux de l'entreprise jour par jour (Lola le samedi matin) ;
 *   · une ASTREINTE — LA MAINTENANCE DE NUIT : un agent par couche (Inès, Camille, Max et Théo, Louis, Noah) agit toujours, mais hors des heures il ne fait que de la
 *     MAINTENANCE — surveiller, vérifier, préparer, noter, et PRÉVENIR Justin si c'est urgent (`peutAgir` leur rend `horsHeures: true`, les portes qui écrivent à un
 *     client le refusent, et `agents.consigneNuit` le dit au modèle) ;
 *   · « ouvrir maintenant » : Justin force l'ouverture jusqu'à une heure donnée (une semaine au plus, pour qu'une faute de frappe ne laisse pas
 *     l'équipe ouverte pour toujours).
 *
 * ⛔ L'HEURE EST CELLE DE PARIS, COMPTÉE AU CALENDRIER — JAMAIS EN AJOUTANT 24 h. Le serveur tourne en UTC ; le dimanche 25 octobre 2026 a duré
 *    25 heures, et « lundi 9 h » vaut 07 h UTC l'été, 08 h UTC l'hiver. Un jour est une date civile de Paris (`jourPlus`), son ouverture se demande
 *    à `tsParis` : trois fois 24 h après vendredi 9 h d'été donneraient lundi 8 h d'hiver. Le même piège a fait tomber deux défauts du dépôt le
 *    25 octobre ; les bancs (`test-3021`) jouent les deux saisons et la nuit du changement.
 * ⛔ UN REGISTRE ILLISIBLE ARRÊTE LES AGENTS, IL NE LES OUVRE PAS (la règle d'`agents.js`, « on ne sait pas » n'est pas « ouvert »). `agents-horaires.json`
 *    est écrit en entier par un fichier temporaire puis un renommage, jamais par-dessus un fichier qu'on n'a pas pu lire, et une forme qui n'est pas
 *    celle qu'on a écrite (un jour qui manque, une heure absurde) vaut illisible autant qu'un JSON cassé. La Tour le DIT (503, `illisible: true`).
 * ⛔ UN REGISTRE ABSENT, C'EST LE RÉGLAGE PAR DÉFAUT — pas « ouvert tout le temps » : les agents sont ouverts tous les jours de 8 h à minuit.
 * ⛔ LA MIGRATION UNIQUE DU 28 OCTOBRE 2026 (`REGLE`) : changer un défaut du code ne touche pas un registre DÉJÀ ÉCRIT sur le VPS (Justin avait pu régler 9 h – 18 h dans la
 *    Tour). Le registre porte donc un champ `regle`. Au premier chargement d'un registre qui n'a pas la règle courante, ses horaires d'ENTREPRISE deviennent 8 h – 24 h tous les
 *    jours fériés compris, l'astreinte devient la liste ci-dessus, la permanence du week-end est désactivée (sans objet : tout le monde travaille le week-end) ; les horaires
 *    PAR AGENT (un choix individuel de Justin) et « ouvert jusqu'à » sont gardés. Écrit par temporaire + renommage, une ligne au journal, UNE fois : `regle` est ensuite relue
 *    et réécrite à l'identique, donc ce que Justin règle ensuite dans la Tour ne revient jamais en arrière. Un registre illisible n'est jamais migré (ni réécrit) : il reste
 *    illisible et arrête tout, comme avant.
 *
 * Les routes (déclarées EN ENTIER : la table `ROUTES_COMMUNES` d'`index.js` lit `req.route.path`) : lire `monAdmin`, écrire `monPatronStrict`, les trois
 * écritures dans `MON_GESTES`.
 */
'use strict';

const FUSEAU = 'Europe/Paris';
const F = 'agents-horaires.json';
const JOURS_FR = ['', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const MOIS_FR = ['', 'janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];
const JOURS_EN = { Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6, Sun: 7 };
const HM = /^([01]\d|2[0-3]):([0-5]\d)$/;
const OUVERTURE_FORCEE_MAX_MS = 7 * 86400000;
const OUVERTURE_FORCEE_MIN_MS = 60000;
const HORIZON_JOURS = 400;                 // jusqu'où on cherche la prochaine ouverture (une année et plus : un réglage qui ferme tout ne boucle pas)
/* LA MAINTENANCE DE NUIT (Justin, 28 octobre 2026 : « je veux des agents qui travaillent la nuit aussi en maintenance. Un agent dans chaque catégorie qui travaille en maintenance »).
   Un agent par COUCHE du registre (`agents.js`) : Coordination → Inès (contrôle qualité) ; Clients → Camille (elle ne répond à personne la nuit : les courriels attendent le matin) ;
   Plateforme → Max (sentinelle) ET Théo (les sauvegardes tournent la nuit : on garde les deux) ; Produit → Louis (documentation — Jules, « maintenance dev », est de la couche
   Plateforme, déjà servie, et ne touche à aucun code la nuit) ; Croissance → Noah (réputation, veille). */
const ASTREINTE_DEFAUT = ['ines', 'camille', 'max', 'theo', 'louis', 'noah'];
const REGLE = 1;                           // la règle des horaires par défaut : 1 = 28 octobre 2026 (tous les jours 8 h – 24 h, fériés compris, maintenance de nuit, pas de permanence)
/* LA PERMANENCE DU WEEK-END (Justin, 26 octobre 2026 : « deux agents qui tournent tous les week-ends, que ce soit jamais les mêmes », puis « Clients en
   rotation ») : chaque samedi et dimanche, DEUX agents de la liste travaillent comme en semaine (pas une astreinte : ils écrivent aux clients). Chaque binôme
   compte au moins un « pilier » — Camille lit le courrier, Hugo arrête un abonnement : sans l'un d'eux, une résiliation reçue le samedi attendrait lundi. Le
   binôme change chaque week-end (jamais le même deux fois de suite), au calendrier de Paris (jamais « +7 × 24 h »).
   ⛔ DÉSACTIVÉE PAR DÉFAUT DEPUIS LE 28 OCTOBRE 2026 : tout le monde travaille le week-end (8 h – 24 h), la permanence n'a plus d'objet. Sa forme, sa rotation et sa validation
   sont intactes : Justin peut la rallumer dans la Tour, par exemple après avoir fermé le week-end. */
const PERMANENCE_DEFAUT = { actif: false, agents: ['camille', 'hugo', 'margaux', 'lea'], piliers: ['camille', 'hugo'], debut: '09:00', fin: '18:00' };
const SAMEDI_REPERE = Date.UTC(2026, 9, 31) / 86400000;      // samedi 31 octobre 2026 : le week-end n° 0 de la rotation
const CHAMPS_LECTURE = ['regle', 'ok', 'maintenant', 'ouvertJusqua', 'agents', 'illisible', 'feriesAVenir', 'fuseau', 'ts', 'astreinteNote'];   // ce que la lecture rend en plus : renvoyé tel quel par un écran, ignoré à l'écriture

/* ── l'heure de Paris : pur, rejouable au banc ───────────────────────────────────────────────────────────────────────────────────── */
const FMT = new Intl.DateTimeFormat('en-US', { timeZone: FUSEAU, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', weekday: 'short' });
const pad = n => (n < 10 ? '0' : '') + n;
function parisParties(ts) {
  const p = {};
  for (const x of FMT.formatToParts(ts)) p[x.type] = x.value;
  const annee = +p.year, mois = +p.month, jour = +p.day;
  return { annee, mois, jour, heure: (+p.hour) % 24, minute: +p.minute, jourSemaine: JOURS_EN[p.weekday] || 0, date: annee + '-' + pad(mois) + '-' + pad(jour) };
}
/* L'écart entre Paris et l'UTC à cet instant (3 600 000 l'hiver, 7 200 000 l'été), lu sur la minute pleine. */
function decalageParis(ts) {
  const m = Math.floor(ts / 60000) * 60000, p = parisParties(m);
  return Date.UTC(p.annee, p.mois - 1, p.jour, p.heure, p.minute) - m;
}
/* L'instant (UTC) où il est `heure:minute` à Paris ce jour-là. Deux passes : l'écart se lit à l'instant VISÉ, pas à l'instant nominal (la veille d'un changement d'heure). */
function tsParis(annee, mois, jour, heure, minute) {
  const nominal = Date.UTC(annee, mois - 1, jour, heure || 0, minute || 0);
  const premier = nominal - decalageParis(nominal);
  return nominal - decalageParis(premier);
}
/* `k` jours CIVILS plus tard (jamais k × 24 h) : une date de Paris, avec son jour de semaine (1 = lundi … 7 = dimanche). */
function jourPlus(p, k) {
  const d = new Date(Date.UTC(p.annee, p.mois - 1, p.jour + k));
  return { annee: d.getUTCFullYear(), mois: d.getUTCMonth() + 1, jour: d.getUTCDate(), jourSemaine: ((d.getUTCDay() + 6) % 7) + 1 };
}
const dateDe = p => p.annee + '-' + pad(p.mois) + '-' + pad(p.jour);
const heureLib = (h, m) => h + ' h' + (m ? ' ' + pad(m) : '');
/* « lundi 26 octobre à 9 h » — pour une phrase que lit Justin. */
function libelle(ts) {
  if (!Number.isFinite(ts)) return '';
  const p = parisParties(ts);
  return JOURS_FR[p.jourSemaine] + ' ' + p.jour + ' ' + MOIS_FR[p.mois] + ' à ' + heureLib(p.heure, p.minute);
}

/* ── les jours fériés français ───────────────────────────────────────────────────────────────────────────────────────────────────── */
/* Pâques (calendrier grégorien) — l'algorithme de Meeus, Jones et Butcher. */
function paques(an) {
  const a = an % 19, b = Math.floor(an / 100), c = an % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31), jour = ((h + l - 7 * m + 114) % 31) + 1;
  return { annee: an, mois, jour };
}
const cacheFeries = new Map();
/* Les onze jours fériés légaux de l'année : { 'AAAA-MM-JJ': nom }. (Le Vendredi saint et le 26 décembre d'Alsace-Moselle n'y sont pas : TeamOP n'y est pas établie.) */
function joursFeries(an) {
  if (cacheFeries.has(an)) return cacheFeries.get(an);
  const o = {};
  const fixe = (mois, jour, nom) => { o[an + '-' + pad(mois) + '-' + pad(jour)] = nom; };
  const p = paques(an);
  const mobile = (k, nom) => { const d = new Date(Date.UTC(an, p.mois - 1, p.jour + k)); o[d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate())] = nom; };
  fixe(1, 1, 'Jour de l’An'); mobile(1, 'Lundi de Pâques'); fixe(5, 1, 'Fête du Travail'); fixe(5, 8, 'Victoire 1945'); mobile(39, 'Ascension'); mobile(50, 'Lundi de Pentecôte');
  fixe(7, 14, 'Fête nationale'); fixe(8, 15, 'Assomption'); fixe(11, 1, 'Toussaint'); fixe(11, 11, 'Armistice 1918'); fixe(12, 25, 'Noël');
  cacheFeries.set(an, o);
  return o;
}
const ferieDe = p => joursFeries(p.annee)[dateDe(p)] || '';

/* ── les réglages : la forme, ses bornes, ses valeurs par défaut ───────────────────────────────────────────────────────────────── */
const minutesDe = hm => { const m = /^(\d\d):(\d\d)$/.exec(hm); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
const jourOuvre = () => ({ ouvert: true, debut: '08:00', fin: '24:00' });
/* Sept jours ouverts, 8 h – 24 h, `feries: false` (= les fériés ne ferment pas : « feries: true » les fermerait). */
const defautEntreprise = () => ({ jours: [0, 1, 2, 3, 4, 5, 6].map(jourOuvre), feries: false });
const defaut = () => ({ regle: REGLE, entreprise: defautEntreprise(), parAgent: {}, astreinte: ASTREINTE_DEFAUT.slice(), permanence: JSON.parse(JSON.stringify(PERMANENCE_DEFAUT)), ouvertJusqua: null, maj: { ts: 0, par: '' } });
/* Les binômes possibles, dans l'ordre de passage : chaque paire de la liste qui compte un pilier (tous si aucun pilier), rangée pour que deux week-ends qui se
   suivent partagent le moins de monde possible. Une fonction pure de la liste : deux serveurs, ou deux lectures, rendent la même rotation. */
function binomes(perm) {
  const a = perm.agents, pil = perm.piliers.filter(x => a.includes(x));
  const tous = [];
  for (let i = 0; i < a.length; i++) for (let j = i + 1; j < a.length; j++) if (!pil.length || pil.includes(a[i]) || pil.includes(a[j])) tous.push([a[i], a[j]]);
  const ordre = tous.length ? [tous.shift()] : [];
  while (tous.length) {
    const der = ordre[ordre.length - 1];
    let k = 0, best = 3;
    tous.forEach((b, i) => { const c = b.filter(x => der.includes(x)).length; if (c < best) { best = c; k = i; } });
    ordre.push(tous.splice(k, 1)[0]);
  }
  return ordre;
}
/* Le numéro du week-end d'un jour de Paris (samedi et dimanche partagent le même) : des jours CIVILS comptés depuis le samedi repère. */
function numeroWeekEnd(p) {
  const sam = p.jourSemaine === 7 ? jourPlus(p, -1) : p;
  return Math.floor((Date.UTC(sam.annee, sam.mois - 1, sam.jour) / 86400000 - SAMEDI_REPERE) / 7);
}
function deGarde(perm, p) {
  if (!perm || !perm.actif || (p.jourSemaine !== 6 && p.jourSemaine !== 7)) return [];
  const l = binomes(perm);
  if (!l.length) return [];
  const n = numeroWeekEnd(p);
  return l[((n % l.length) + l.length) % l.length].slice();
}


/* Un jour : { ouvert, debut, fin }. `ouvert` est un booléen STRICT (« false » en chaîne ne ferme pas, et n'ouvre pas non plus : refus). Ouvert, il exige un début avant une fin
   (« HH:MM », la fin peut être « 24:00 ») ; fermé, ses heures sont gardées pour la réouverture. Rend { jour } ou { erreur }. */
function jourValide(j, nom) {
  if (!j || typeof j !== 'object' || Array.isArray(j)) return { erreur: nom + ' : un jour est un objet { ouvert, debut, fin }' };
  for (const k of Object.keys(j)) if (!['ouvert', 'debut', 'fin'].includes(k)) return { erreur: nom + ' : champ inconnu « ' + String(k).slice(0, 30) + ' »' };
  if (typeof j.ouvert !== 'boolean') return { erreur: nom + ' : « ouvert » doit valoir true ou false' };
  const lire = (k, dflt, max24) => {
    if (j[k] === undefined && !j.ouvert) return dflt;
    const v = j[k];
    if (typeof v !== 'string' || !(HM.test(v) || (max24 && v === '24:00'))) return null;
    return v;
  };
  const debut = lire('debut', '09:00', false), fin = lire('fin', '18:00', true);
  if (debut === null) return { erreur: nom + ' : « debut » doit être une heure « HH:MM » (00:00 à 23:59)' };
  if (fin === null) return { erreur: nom + ' : « fin » doit être une heure « HH:MM » (jusqu’à 24:00)' };
  if (j.ouvert && minutesDe(debut) >= minutesDe(fin)) return { erreur: nom + ' : l’ouverture (' + debut + ') doit venir avant la fermeture (' + fin + ')' };
  return { jour: { ouvert: j.ouvert, debut, fin } };
}
/* Sept jours (le rang 0 est LUNDI, le rang 6 DIMANCHE). `nulsPermis` : un jour `null` hérite de l'entreprise (horaires d'un agent). */
function joursValides(l, nom, nulsPermis) {
  if (!Array.isArray(l) || l.length !== 7) return { erreur: nom + ' : sept jours attendus (lundi en premier, dimanche en dernier)' };
  const out = [];
  for (let i = 0; i < 7; i++) {
    if (l[i] === null && nulsPermis) { out.push(null); continue; }
    const r = jourValide(l[i], nom + ' (' + JOURS_FR[i + 1] + ')');
    if (r.erreur) return r;
    out.push(r.jour);
  }
  return { jours: out };
}
const dedans = (o, cles) => Object.keys(o).every(k => cles.includes(k));
/* La permanence, validée champ par champ. Rend { perm } ou { erreur } (une phrase lisible). */
function permanenceValide(v, ids) {
  if (!v || typeof v !== 'object' || Array.isArray(v) || !dedans(v, ['actif', 'agents', 'piliers', 'debut', 'fin'])) return { erreur: 'permanence : { actif, agents, piliers, debut, fin } attendu' };
  if (typeof v.actif !== 'boolean') return { erreur: 'permanence : « actif » doit valoir true ou false' };
  if (!Array.isArray(v.agents) || v.agents.length < 2 || v.agents.length > ids.size) return { erreur: 'permanence : au moins deux agents dans la rotation' };
  for (const x of v.agents) if (typeof x !== 'string' || !ids.has(x)) return { erreur: 'permanence : agent inconnu « ' + String(x).slice(0, 30) + ' »' };
  const agents = v.agents.filter((x, i, a) => a.indexOf(x) === i);
  if (agents.length < 2) return { erreur: 'permanence : au moins deux agents dans la rotation' };
  const piliers = v.piliers === undefined ? [] : v.piliers;
  if (!Array.isArray(piliers)) return { erreur: 'permanence : « piliers » doit être une liste' };
  for (const x of piliers) if (typeof x !== 'string' || !agents.includes(x)) return { erreur: 'permanence : un pilier doit être dans la rotation (« ' + String(x).slice(0, 30) + ' »)' };
  const debut = v.debut === undefined ? '09:00' : v.debut, fin = v.fin === undefined ? '18:00' : v.fin;
  if (typeof debut !== 'string' || !HM.test(debut)) return { erreur: 'permanence : heure de début au format HH:MM' };
  if (typeof fin !== 'string' || !(HM.test(fin) || fin === '24:00')) return { erreur: 'permanence : heure de fin au format HH:MM' };
  if (minutesDe(debut) >= minutesDe(fin)) return { erreur: 'permanence : le début doit précéder la fin' };
  const perm = { actif: v.actif, agents, piliers: piliers.filter((x, i, a) => a.indexOf(x) === i), debut, fin };
  if (perm.actif && !binomes(perm).length) return { erreur: 'permanence : aucun binôme possible avec ces piliers' };
  return { perm };
}

module.exports = function horaires(o) {
  o = o || {};
  const fich = o.fichier || require('./agents-fichier')(o.DATA_DIR);
  const ids = new Set(Array.isArray(o.ids) && o.ids.length ? o.ids : require('./agents').AGENTS.map(a => a.id));

  let cfg = defaut();
  let corrompu = false;                    // une forme qui n'est pas la nôtre : même sort qu'un JSON cassé
  let migration = null;                    // { ts, ecrit } si ce chargement a migré le registre : la ligne du journal de la Tour part au montage des routes
  function charger() {
    const brut = fich.charger(F, null);
    if (brut === null) {                   // absent : le réglage par défaut. Illisible : `fich` a noté le nom (`illisible()` le dit) — et le journal du serveur aussi.
      if (fich.illisible(F)) console.error('⛔ ' + F + ' illisible — les agents restent À L’ARRÊT jusqu’à sa réparation (puis redémarrer)');
      return;
    }
    const r = normaliser(brut);
    if (r.erreur) { corrompu = true; console.error('⛔ ' + F + ' : forme inattendue (' + r.erreur + ') — les agents restent À L’ARRÊT jusqu’à sa réparation'); return; }
    cfg = r.cfg;
    migrer();
  }
  /* LA MIGRATION UNIQUE (voir l'en-tête) : un registre écrit avant la règle courante prend les horaires de Justin du 28 octobre 2026. Appelée par `charger()` SEULEMENT, donc jamais sur un
     registre absent (c'est déjà le défaut) ni illisible (rien n'est lu, rien n'est réécrit). Si l'écriture échoue, la règle courante reste valable en mémoire et le fichier garde l'ancienne :
     le prochain démarrage recommence — le fichier n'est jamais laissé à moitié. */
  function migrer() {
    if (cfg.regle >= REGLE) return;
    const d = defaut(), maj = { ts: Number(o.maintenant ? o.maintenant() : Date.now()) || Date.now(), par: 'migration du 28 octobre 2026' };
    const avant = cfg;
    cfg = Object.assign({}, avant, { regle: REGLE, entreprise: d.entreprise, astreinte: d.astreinte, permanence: Object.assign({}, avant.permanence, { actif: false }), maj });
    const ecrit = fich.ecrire(F, cfg);
    migration = { ts: maj.ts, ecrit: ecrit === true };
    console.log(F + ' : migration unique du 28 octobre 2026 — horaires de l’entreprise 8 h – 24 h tous les jours (fériés compris), astreinte ' + cfg.astreinte.join('/') + ', permanence du week-end désactivée'
      + ', horaires propres gardés pour ' + (Object.keys(cfg.parAgent).join(', ') || 'personne') + (ecrit ? '' : ' — ÉCRITURE ÉCHOUÉE : refaite au prochain démarrage'));
  }
  /* Le fichier relu : strictement la forme qu'on écrit. Rend { cfg } ou { erreur }. */
  function normaliser(b) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return { erreur: 'objet attendu' };
    const e = b.entreprise;
    if (!e || typeof e !== 'object') return { erreur: 'entreprise' };
    const jours = joursValides(e.jours, 'entreprise', false);
    if (jours.erreur) return { erreur: jours.erreur };
    if (typeof e.feries !== 'boolean') return { erreur: 'entreprise.feries' };
    const parAgent = {};
    if (b.parAgent !== undefined) {
      if (!b.parAgent || typeof b.parAgent !== 'object' || Array.isArray(b.parAgent)) return { erreur: 'parAgent' };
      for (const id of Object.keys(b.parAgent)) {
        const v = b.parAgent[id];
        if (!ids.has(id) || !v || typeof v !== 'object' || Array.isArray(v) || !dedans(v, ['jours', 'feries'])) return { erreur: 'parAgent.' + String(id).slice(0, 20) };
        const x = {};
        if (v.jours !== undefined) { const j = joursValides(v.jours, 'parAgent', true); if (j.erreur) return { erreur: j.erreur }; x.jours = j.jours; }
        if (v.feries !== undefined) { if (typeof v.feries !== 'boolean') return { erreur: 'parAgent.feries' }; x.feries = v.feries; }
        parAgent[id] = x;
      }
    }
    let regle = 0;                         // un registre d'avant la règle n'en porte pas : il sera migré
    if (b.regle !== undefined) { if (!Number.isInteger(b.regle) || b.regle < 0) return { erreur: 'regle' }; regle = b.regle; }
    let astreinte = ASTREINTE_DEFAUT.slice();
    if (b.astreinte !== undefined) {
      if (!Array.isArray(b.astreinte) || b.astreinte.some(x => typeof x !== 'string' || !ids.has(x))) return { erreur: 'astreinte' };
      astreinte = b.astreinte.filter((x, i, a) => a.indexOf(x) === i);
    }
    let permanence = JSON.parse(JSON.stringify(PERMANENCE_DEFAUT));
    if (b.permanence !== undefined) { const pv = permanenceValide(b.permanence, ids); if (pv.erreur) return { erreur: 'permanence' }; permanence = pv.perm; }
    let ouvertJusqua = null;
    if (b.ouvertJusqua !== undefined && b.ouvertJusqua !== null) { if (!Number.isFinite(b.ouvertJusqua) || b.ouvertJusqua < 0) return { erreur: 'ouvertJusqua' }; ouvertJusqua = b.ouvertJusqua; }
    const maj = b.maj && typeof b.maj === 'object' ? { ts: Number(b.maj.ts) || 0, par: String(b.maj.par || '').slice(0, 60) } : { ts: 0, par: '' };
    return { cfg: { regle, entreprise: { jours: jours.jours, feries: e.feries }, parAgent, astreinte, permanence, ouvertJusqua, maj } };
  }
  charger();

  const illisible = () => corrompu || fich.illisible(F);
  const ecrireCfg = () => !illisible() && fich.ecrire(F, cfg);
  const copie = x => JSON.parse(JSON.stringify(x));

  /* ── la règle : un agent, un jour de Paris → sa fenêtre ── */
  function effectif(id) {
    const ov = id && cfg.parAgent[id];
    return { jours: cfg.entreprise.jours.map((j, i) => (ov && ov.jours && ov.jours[i]) || j), feries: (ov && typeof ov.feries === 'boolean') ? ov.feries : cfg.entreprise.feries };
  }
  /* La fenêtre de ce jour civil : { debut, fin } (instants UTC) ou { cause } quand on ne travaille pas ('ferie' avec son nom, 'jour_ferme'). */
  function fenetre(id, p) {
    /* De garde ce week-end : la fenêtre de la permanence, férié ou pas (une résiliation n'attend pas la Toussaint) — sauf si l'agent travaille déjà ce jour-là. */
    if (id && deGarde(cfg.permanence, p).includes(id)) {
      const eff0 = effectif(id), j0 = eff0.jours[p.jourSemaine - 1];
      if (!j0.ouvert || (eff0.feries && ferieDe(p))) {
        const [h1, m1] = cfg.permanence.debut.split(':').map(Number), [h2, m2] = cfg.permanence.fin.split(':').map(Number);
        const debut = tsParis(p.annee, p.mois, p.jour, h1, m1);
        const fin = h2 === 24 ? (() => { const s = jourPlus(p, 1); return tsParis(s.annee, s.mois, s.jour, 0, 0); })() : tsParis(p.annee, p.mois, p.jour, h2, m2);
        return { debut, fin, cause: '', permanence: true };
      }
    }
    const eff = effectif(id);
    if (eff.feries) { const nom = ferieDe(p); if (nom) return { debut: null, fin: null, cause: 'ferie', ferie: nom }; }
    const j = eff.jours[p.jourSemaine - 1];
    if (!j.ouvert) return { debut: null, fin: null, cause: 'jour_ferme' };
    const [h1, m1] = j.debut.split(':').map(Number), [h2, m2] = j.fin.split(':').map(Number);
    const debut = tsParis(p.annee, p.mois, p.jour, h1, m1);
    const fin = h2 === 24 ? (() => { const s = jourPlus(p, 1); return tsParis(s.annee, s.mois, s.jour, 0, 0); })() : tsParis(p.annee, p.mois, p.jour, h2, m2);
    return { debut, fin, cause: '' };
  }
  const forcee = ts => cfg.ouvertJusqua !== null && cfg.ouvertJusqua > ts;

  /* La prochaine ouverture STRICTEMENT après `ts` pour cet agent (null : rien d'ouvert avant l'horizon). */
  function prochaineOuverture(id, ts) {
    const p0 = parisParties(ts);
    for (let k = 0; k <= HORIZON_JOURS; k++) {
      const w = fenetre(id, k === 0 ? p0 : jourPlus(p0, k));
      if (w.debut !== null && w.debut > ts) return w.debut;
    }
    return null;
  }

  /* L'état de l'ENTREPRISE (id absent) ou d'UN agent à cet instant — le calendrier seul, sans la règle de l'astreinte.
     { ouvert, raison, prochaineOuverture, prochaineFermeture, ferie? } ; `raison` : heures_ouvrees | ouverture_forcee | ferie | jour_ferme | hors_heures. */
  function etatA(ts, id) {
    const p = parisParties(ts), w = fenetre(id, p);
    const dans = w.debut !== null && ts >= w.debut && ts < w.fin;
    const f = forcee(ts);
    const ouvert = dans || f;
    const r = { ouvert, raison: dans ? 'heures_ouvrees' : f ? 'ouverture_forcee' : (w.cause || 'hors_heures'), prochaineOuverture: null, prochaineFermeture: null };
    if (w.ferie) r.ferie = w.ferie;
    if (ouvert) r.prochaineFermeture = f ? Math.max(cfg.ouvertJusqua, dans ? w.fin : 0) : w.fin;
    else r.prochaineOuverture = prochaineOuverture(id, ts);
    return r;
  }

  /* LA QUESTION D'`agents.peutAgir` : cet agent a-t-il le droit d'agir à cet instant ? Un registre illisible arrête TOUT LE MONDE, l'astreinte comprise. L'astreinte agit toujours,
     mais hors des heures elle le dit (`horsHeures`) : les portes qui écrivent à un client la refusent. */
  function peutAgir(id, ts) {
    if (illisible()) return { ok: false, raison: 'horaires_illisibles' };
    const e = etatA(ts, id);
    if (e.ouvert) return { ok: true, horsHeures: false };
    if (cfg.astreinte.includes(id)) return { ok: true, horsHeures: true, astreinte: true };
    return { ok: false, raison: 'hors_heures', prochaineOuverture: e.prochaineOuverture };
  }

  /* Le temps pendant lequel cet agent a pu travailler entre `de` et `a` (millisecondes) : le fil des JOURS CIVILS de Paris, chacun avec sa fenêtre. Sert à ce qu'une demande en attente
     ne vieillisse pas pendant que celui qui doit la prendre est fermé (un week-end, un lundi férié). L'astreinte travaille tout le temps. */
  function tempsOuvert(id, de, a) {
    if (!(a > de)) return 0;
    if (cfg.astreinte.includes(id)) return a - de;
    const p0 = parisParties(de), pN = parisParties(a);
    let total = 0;
    for (let k = 0; k <= HORIZON_JOURS; k++) {
      const p = k === 0 ? p0 : jourPlus(p0, k);
      const w = fenetre(id, p);
      if (w.debut !== null) total += Math.max(0, Math.min(a, w.fin) - Math.max(de, w.debut));
      if (p.annee === pN.annee && p.mois === pN.mois && p.jour === pN.jour) return total;
    }
    return a - de;
  }

  /* ── ce que lit la Tour ── */
  const feriesAVenir = (ts, n) => {
    const out = [], p0 = parisParties(ts);
    for (let k = 0; k < 400 && out.length < n; k++) { const p = jourPlus(p0, k); const nom = ferieDe(p); if (nom) out.push({ date: dateDe(p), nom }); }
    return out;
  };
  function vue(ts) {
    const ent = etatA(ts, null);
    const agents = {};
    for (const id of ids) {
      const e = etatA(ts, id), q = peutAgir(id, ts);
      agents[id] = { ouvert: e.ouvert, agit: q.ok === true, raison: e.raison, prochaineOuverture: e.prochaineOuverture, astreinte: cfg.astreinte.includes(id), horairesPropres: !!cfg.parAgent[id] };
    }
    /* Le week-end en cours (ou le prochain) et celui d'après : qui est de garde, pour la Tour. */
    const p0 = parisParties(ts);
    const samedi = p0.jourSemaine === 6 ? p0 : p0.jourSemaine === 7 ? jourPlus(p0, -1) : jourPlus(p0, 6 - p0.jourSemaine);
    const garde = q => ({ samedi: dateDe(q), agents: deGarde(cfg.permanence, q) });
    for (const id of deGarde(cfg.permanence, samedi)) if (agents[id]) agents[id].deGarde = true;
    return { ok: true, fuseau: FUSEAU, ts, illisible: false, entreprise: copie(cfg.entreprise), parAgent: copie(cfg.parAgent), astreinte: cfg.astreinte.slice(),
      permanence: Object.assign(copie(cfg.permanence), { ceWeekEnd: garde(samedi), suivant: garde(jourPlus(samedi, 7)) }),
      ouvertJusqua: forcee(ts) ? cfg.ouvertJusqua : null,
      maintenant: Object.assign({ ouvert: ent.ouvert, prochaineOuverture: ent.prochaineOuverture, prochaineFermeture: ent.prochaineFermeture, raison: ent.raison, libelleOuverture: ent.prochaineOuverture ? libelle(ent.prochaineOuverture) : '' }, ent.ferie ? { ferie: ent.ferie } : {}),
      agents, feriesAVenir: feriesAVenir(ts, 5) };
  }

  /* ── les écritures : tout est validé AVANT de toucher au registre, et un enregistrement raté remet l'ancien ── */
  /* `b` : { entreprise?: { jours?, feries? }, parAgent?: { id: { jours?, feries? } | null }, astreinte?: [id] }. Rend { cfg } (le neuf, rien n'est encore écrit) ou { erreur }. */
  function appliquer(b) {
    if (!b || typeof b !== 'object' || Array.isArray(b)) return { erreur: 'Corps attendu : { entreprise, parAgent, astreinte }' };
    for (const k of Object.keys(b)) if (!['entreprise', 'parAgent', 'astreinte', 'permanence'].includes(k) && !CHAMPS_LECTURE.includes(k)) return { erreur: 'Champ inconnu : « ' + String(k).slice(0, 30) + ' »' };
    if (b.entreprise === undefined && b.parAgent === undefined && b.astreinte === undefined && b.permanence === undefined) return { erreur: 'Rien à modifier : entreprise, parAgent, astreinte ou permanence' };
    const neuf = copie(cfg);
    if (b.entreprise !== undefined) {
      const e = b.entreprise;
      if (!e || typeof e !== 'object' || Array.isArray(e) || !dedans(e, ['jours', 'feries'])) return { erreur: 'entreprise : { jours, feries } attendu' };
      if (e.jours === undefined && e.feries === undefined) return { erreur: 'entreprise : ni jours ni feries à modifier' };
      if (e.jours !== undefined) {
        const j = joursValides(e.jours, 'entreprise', false);
        if (j.erreur) return { erreur: j.erreur };
        if (!j.jours.some(x => x.ouvert)) return { erreur: 'entreprise : aucun jour ouvert — pour arrêter tous les agents, utilise la pause générale' };
        neuf.entreprise.jours = j.jours;
      }
      if (e.feries !== undefined) { if (typeof e.feries !== 'boolean') return { erreur: 'entreprise : « feries » doit valoir true ou false' }; neuf.entreprise.feries = e.feries; }
    }
    if (b.parAgent !== undefined) {
      const pa = b.parAgent;
      if (!pa || typeof pa !== 'object' || Array.isArray(pa)) return { erreur: 'parAgent : un objet { agent: { jours, feries } } attendu' };
      for (const id of Object.keys(pa)) {
        if (!ids.has(id)) return { erreur: 'parAgent : agent inconnu « ' + String(id).slice(0, 30) + ' »' };
        const v = pa[id];
        if (v === null) { delete neuf.parAgent[id]; continue; }
        if (!v || typeof v !== 'object' || Array.isArray(v) || !dedans(v, ['jours', 'feries'])) return { erreur: 'parAgent.' + id + ' : { jours, feries } attendu (ou null pour retirer ses horaires)' };
        const x = {};
        if (v.jours !== undefined) { const j = joursValides(v.jours, 'parAgent.' + id, true); if (j.erreur) return { erreur: j.erreur }; if (j.jours.some(d => d !== null)) x.jours = j.jours; }
        if (v.feries !== undefined) { if (typeof v.feries !== 'boolean') return { erreur: 'parAgent.' + id + ' : « feries » doit valoir true ou false' }; x.feries = v.feries; }
        if (x.jours === undefined && x.feries === undefined) delete neuf.parAgent[id];      // rien qui surcharge : l'agent suit l'entreprise
        else neuf.parAgent[id] = x;
      }
    }
    if (b.astreinte !== undefined) {
      if (!Array.isArray(b.astreinte) || b.astreinte.length > ids.size) return { erreur: 'astreinte : une liste d’agents attendue' };
      for (const x of b.astreinte) if (typeof x !== 'string' || !ids.has(x)) return { erreur: 'astreinte : agent inconnu « ' + String(x).slice(0, 30) + ' »' };
      neuf.astreinte = b.astreinte.filter((x, i, a) => a.indexOf(x) === i);
    }
    if (b.permanence !== undefined) {
      /* La vue rend la permanence avec `ceWeekEnd` et `suivant` (lecture seule) : un écran qui renvoie la vue telle quelle ne se fait pas refuser. */
      const v = b.permanence && typeof b.permanence === 'object' && !Array.isArray(b.permanence) ? Object.assign({}, b.permanence) : b.permanence;
      if (v && typeof v === 'object') { delete v.ceWeekEnd; delete v.suivant; }
      const pv = permanenceValide(v, ids);
      if (pv.erreur) return { erreur: pv.erreur };
      neuf.permanence = pv.perm;
    }
    return { cfg: neuf };
  }
  /* Pose `neuf` ; si l'écriture échoue, l'ancien reste. Rend vrai si c'est écrit. */
  function poser(neuf, par, ts) {
    const avant = cfg;
    cfg = Object.assign({}, neuf, { maj: { ts, par: String(par || '').slice(0, 60) } });
    if (!ecrireCfg()) { cfg = avant; return false; }
    return true;
  }
  /* « jusqua » : un instant (millisecondes, ou texte ISO AVEC fuseau). Rend un nombre ou null. */
  function lireInstant(v) {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    if (typeof v !== 'string' || !v.trim()) return null;
    const s = v.trim();
    if (/^\d{10,14}$/.test(s)) return Number(s);
    if (!/(Z|[+-]\d\d:?\d\d)$/i.test(s)) return null;      // une date sans fuseau est ambiguë : refusée
    const t = Date.parse(s);
    return Number.isFinite(t) ? t : null;
  }

  /* ── les routes de la Tour ── */
  function routes(app, c) {
    const { monAdmin, monPatronStrict } = c;
    const maintenant = typeof c.maintenant === 'function' ? c.maintenant : Date.now;
    const noter = typeof c.noter === 'function' ? c.noter : () => {};
    const qui = req => String((req.tourUser && req.tourUser.nom) || '');
    if (migration) { noter('systeme', 'horaires', { detail: 'migration unique : 8 h – 24 h tous les jours, fériés compris, maintenance de nuit' + (migration.ecrit ? '' : ' (écriture échouée, refaite au démarrage)'), qui: 'migration' }); migration = null; }
    const illisibleRep = res => res.status(503).json({ ok: false, illisible: true, error: 'Les horaires des agents sont illisibles : les agents restent À L’ARRÊT jusqu’à la réparation de ' + F + ' (rien n’est modifié)' });

    app.get('/api/monitor/agents/horaires', monAdmin, (req, res) => {
      if (illisible()) return illisibleRep(res);
      res.json(vue(maintenant()));
    });
    app.post('/api/monitor/agents/horaires', monPatronStrict, (req, res) => {
      if (illisible()) return illisibleRep(res);
      const r = appliquer(req.body);
      if (r.erreur) return res.status(400).json({ error: r.erreur });
      const ts = maintenant();
      if (!poser(r.cfg, qui(req), ts)) return res.status(503).json({ error: 'Changement non enregistré' });
      noter('systeme', 'horaires', { detail: 'horaires réglés', qui: qui(req) });
      res.json(vue(ts));
    });
    app.post('/api/monitor/agents/horaires/ouvrir', monPatronStrict, (req, res) => {
      if (illisible()) return illisibleRep(res);
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const ts = maintenant(), jusqua = lireInstant(b.jusqua);
      if (jusqua === null) return res.status(400).json({ error: 'Jusqu’à quand ? « jusqua » : un instant (millisecondes, ou date ISO avec fuseau)' });
      if (jusqua < ts + OUVERTURE_FORCEE_MIN_MS) return res.status(400).json({ error: 'L’heure de fin est déjà passée (ou dans moins d’une minute)' });
      if (jusqua > ts + OUVERTURE_FORCEE_MAX_MS) return res.status(400).json({ error: 'Une ouverture forcée dure une semaine au plus : choisis une fin plus proche' });
      if (!poser(Object.assign({}, cfg, { ouvertJusqua: jusqua }), qui(req), ts)) return res.status(503).json({ error: 'Changement non enregistré' });
      noter('systeme', 'ouverture forcée', { detail: 'jusqu’à ' + libelle(jusqua), qui: qui(req) });
      res.json(vue(ts));
    });
    app.post('/api/monitor/agents/horaires/fermer', monPatronStrict, (req, res) => {
      if (illisible()) return illisibleRep(res);
      const ts = maintenant();
      if (!poser(Object.assign({}, cfg, { ouvertJusqua: null }), qui(req), ts)) return res.status(503).json({ error: 'Changement non enregistré' });
      noter('systeme', 'fin de l’ouverture forcée', { detail: 'retour aux horaires réglés', qui: qui(req) });
      res.json(vue(ts));
    });
  }

  return { etatA, peutAgir, tempsOuvert, prochaineOuverture, vue, libelle, illisible, routes, appliquer, ferieDe: p => ferieDe(p), config: () => copie(cfg) };
};
module.exports.parisParties = parisParties;
module.exports.tsParis = tsParis;
module.exports.jourPlus = jourPlus;
module.exports.paques = paques;
module.exports.joursFeries = joursFeries;
module.exports.libelle = libelle;
module.exports.defaut = defaut;
module.exports.FICHIER = F;
module.exports.OUVERTURE_FORCEE_MAX_MS = OUVERTURE_FORCEE_MAX_MS;
module.exports.REGLE = REGLE;
module.exports.ASTREINTE_DEFAUT = ASTREINTE_DEFAUT;
module.exports.PERMANENCE_DEFAUT = PERMANENCE_DEFAUT;
module.exports.binomes = binomes;
module.exports.deGarde = deGarde;
