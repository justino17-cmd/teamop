/* LES CONVERSATIONS DE LA TOUR (19 octobre 2026) — les agents parlent à Justin : un fil privé par agent, un fil « Équipe » commun.
 *
 * Justin : « que les agents me parlent en privé et même en groupe » ; « s'il y a un agent qui me fait un retour comme quoi ce client veut me
 * parler à une vraie personne, ça me donne toutes les informations des clients que je puisse leur rappeler » ; « le groupe, c'est que les
 * agents communiquent entre eux, comme une entreprise » (la Tour y montre aussi la file de tâches entre agents).
 *
 * ⛔ UN AGENT NE PARLE QUE SI `peutAgir` LE LUI PERMET, à chaque message : à l'arrêt ou en pause, silence. Il ne parle que dans SON fil ou
 *    dans « Équipe » ; son texte passe par `sansAdresses` (jamais une adresse dans un fil), 600 caractères, douze messages par heure, et
 *    le même texte ne se répète pas en vingt-quatre heures. Un agent bavard ne noie pas le patron.
 * ⛔ LE RAPPEL CLIENT NE PORTE QUE DES FORMES FERMÉES : un numéro de dossier (DOS-nnnnnn) et un motif d'une liste. La phrase est composée
 *    ICI, jamais écrite par l'agent — donc aucune phrase d'un client (qui a pu écrire « ignore tes règles… ») n'atteint le fil par ce chemin.
 *    Les coordonnées (téléphone, adresse) ne sont PAS recopiées dans le fil : le message renvoie au dossier, composé par le serveur au moment
 *    où le patron l'ouvre. Rien à périmer, rien à fuiter.
 * ⛔ `agents-messages.json` s'écrit par temporaire puis renommage, JAMAIS par-dessus un fichier illisible (503, comme les autres registres).
 * ⛔ Justin écrit dans un fil : le message est gardé, MAIS aucun agent ne le lit encore — la Tour le dit. Un message de Justin n'est jamais
 *    un ordre exécuté par ce module.
 *
 * LA MESSAGERIE DES AGENTS (23 octobre 2026, cahier `design/EQUIPE-AGENTS.md` §1, §6, §11) — en plus de « Équipe » et des fils privés (un par
 * agent, identifiant = celui de l'agent : leur forme ne change pas), trois groupes : « clients », « plateforme », « reunions ».
 *  · UNE table `MEMBRES` dit qui est dans quel fil, UN `MENEUR` par groupe répond quand Justin écrit sans citer personne.
 *  · Les @mentions sont lues ICI, par le serveur (`analyserMentions`) : le navigateur colore, il ne décide de rien. Chaque message garde
 *    `mentions:[ids]`, et ce module PRÉVIENT l'équipe (`ctx.surMessage`) — c'est lui qui réveille, pas la Tour.
 *  · Un message porte sa PROFONDEUR de chaîne (`prof`) : Justin = 0, la réponse d'un agent = celle du message auquel il répond + 1. C'est ce
 *    qui borne deux agents qui se répondent (sans elle, ils videraient le budget) ; la borne est appliquée par l'équipe (`agent-equipe.js`).
 *  · « X écrit… » est un état EN MÉMOIRE (`ecrit`) : il ne se range pas, il ne survit pas à un redémarrage, et il expire seul.
 *  · Un message `systeme` dit ce qui s'est passé (« Camille a pris… », « X est à l'arrêt ») : il n'est jamais une consigne et personne n'y répond.
 *
 * LES AGENTS AUTONOMES (28 octobre 2026) — Justin : « La limite de messages par heure, c'est pas normal. Je t'ai dit que je veux des agents qui soient autonomes de A à Z. » ; « je veux qu'à chaque fois qu'ils ont fini, ils
 * mettent dans le groupe "je viens d'effectuer ça", comme ça moi je vois tout en temps réel. » Trois changements, tous dans ce fichier :
 *  · LA RACINE (voir `RACINE_VIE_MS`) : un message de Justin est la racine de la chaîne qu'il lance ; sa borne est un budget par message (20 messages d'agents, 40 si @tous, 6 par agent, 8 pour Victor, 4 $), vérifié AVANT
 *    l'appel payant par `peutParler` — plus l'heure. Sans racine valide (un agent qui s'emballe seul, un texte de client relayé), les plafonds d'avant tiennent, et se taisent pour Justin (journal + compteur).
 *  · LES ANNONCES (`annoncerFait`) : « Je viens de… » dans « Équipe », écrit par le code (`agent-faits.js`), hors plafonds, sans réveiller personne, une clé stable par fait, copie au pont.
 *  · VICTOR EST LE MENEUR DES QUATRE GROUPES et membre de « clients » et « plateforme » : il répond quand Justin ne cite personne et répartit (`assigner`, `demander`, `agent-equipe.js`).
 *
 * LES GROUPES PERSONNALISÉS (25 octobre 2026) — Justin choisit pour chaque groupe un nom, une icône, une couleur, une description
 * (`POST /api/monitor/conversations/groupe`, registre `conversations-groupes.json`). ⛔ SEUL L'AFFICHAGE CHANGE : l'identifiant (equipe, clients,
 * plateforme, reunions) reste celui que les agents, les @mentions (« @tous ») et les réunions lisent, et `nom()` — que les agents mettent dans
 * leurs consignes (`agent-equipe.js`, `agent-victor.js`) — rend TOUJOURS le nom d'origine : le comportement d'un agent ne dépend jamais d'un mot
 * choisi par un humain. Le choix voyage à part, dans `perso` (liste des fils), présent seulement si le groupe est personnalisé.
 * ⛔ Une valeur du corps n'entre au registre qu'après `validerGroupe` (liste de caractères PERMIS, pas liste de refus), et elle est REVALIDÉE à la
 * lecture du fichier : un registre modifié à la main ne sert pas ce que la route aurait refusé. Registre illisible : 503 à l'écriture, liste servie
 * sans `perso` (le défaut), jamais écrasé.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const F = 'agents-messages.json';
const NIVEAUX = ['info', 'important', 'urgent'];
const MOTIFS = { demande_humain: 'demande à parler à une vraie personne', litige: 'litige à traiter', sensible: 'sujet sensible', blocage: 'client bloqué', urgence: 'urgence' };
/* (28 octobre 2026) 1000 et plus 500 : les chaînes de 40 messages et les annonces de fin de travail chassaient l'historique ET la mémoire du doublon (le fichier fait ~300 Ko et se réécrit entier). */
const TEXTE_MAX = 600, TEXTE_PATRON_MAX = 1000, MESSAGES_MAX = 1000, PAR_HEURE = 12, DOUBLON_MS = 24 * 3600 * 1000, LISTE_MAX = 100;
const PAR_HEURE_FIL = 20;          // messages d'AGENTS par heure et par fil, en plus des douze par agent : deux agents qui s'emballent s'arrêtent ici
/* LES RÉUNIONS (`reunions.js`, 23 octobre 2026) ont leur plafond propre, et SEULEMENT dans le fil « reunions » : une ouverture, un tour de table de seize,
   une discussion bornée et une conclusion tiennent en moins de quarante messages. Elles réveillent personne par l'@mention (le déroulé donne la parole lui-même,
   une réponse après l'autre) et leur compte rendu peut dépasser les 600 caractères d'un message d'agent. Le tout par `o.reunion === true` ET fil « reunions ». */
const PAR_HEURE_FIL_REUNION = 45, REUNION_TEXTE_MAX = 1500;
/* ── LA RACINE D'UN MESSAGE DE JUSTIN (28 octobre 2026) ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
   Justin, capture de la Tour à l'appui : il écrit « @tous faites-moi un point de votre journée » et reçoit « Victor a atteint sa limite de messages par heure : sa prochaine réponse viendra dans
   l'heure » — « la limite de messages par heure, c'est pas normal ». Le défaut était un seul choix de conception : le code traitait un message de JUSTIN comme du bavardage d'agents, le comptait dans
   `PAR_HEURE` (12) et `PAR_HEURE_FIL` (20), et ne le contrôlait qu'APRÈS l'appel payé à Claude. Désormais chaque chaîne née d'un message de Justin porte un identifiant, la RACINE (l'identifiant de
   ce message). Sa borne n'est plus l'heure : c'est un BUDGET par message de Justin (messages, messages par agent, dollars), vérifié AVANT l'appel payant (`peutParler`).
   ⛔ UNE RACINE NE SE FABRIQUE QUE PAR UN MESSAGE DE JUSTIN, VALIDÉ AU REGISTRE : le message existe, il est de Justin, il a moins de deux heures, et son `racine` est son propre identifiant. Une racine
   lue dans le corps d'une requête, celle d'un message d'agent, d'un client ou d'un message périmé n'est PAS reconnue : le message est alors traité comme avant (plafonds horaires). Et un jeton du pont
   volé ne fabrique pas plus de 60 racines par heure — au-delà, un message de Justin n'est plus exempté (le filet du jour de `cerveau.js` coupe le reste).
   ⛔ Les plafonds d'AVANT (12 par heure et par agent, 20 par fil, 45 en réunion, doublon de 24 h, profondeur 3) restent le régime de tout ce qui n'a PAS de racine : un agent qui s'emballe seul s'arrête là. */
const RACINE_VIE_MS = 2 * 3600 * 1000;       // une racine ne vaut que deux heures
const RACINE_MESSAGES = 20, RACINE_MESSAGES_VASTE = 40, VASTE_CITES = 6;   // 20 messages d'agents par racine ; 40 si Justin cite six agents ou « @tous »
const RACINE_PAR_AGENT = 6, RACINE_PAR_VICTOR = 8;                          // et par agent (Victor, le chef, répartit : huit)
const RACINE_USD = 4;                          // dollars par racine : la somme des `cout` rendus par `penser` (un @tous normal coûte ~0,5 $)
const RACINES_PAR_HEURE = 60;                  // naissances par heure : au-delà, un message de Justin n'est plus une racine
const HORS_HEURES_MS = 45 * 60 * 1000;         // un réveil d'une racine née AVANT la fermeture finit dans les 45 minutes qui suivent
/* L'ANNONCE DE FIN DE TRAVAIL : les faits d'un même agent et d'un même code s'agrègent pendant cette fenêtre en UNE ligne « ×N ». */
const FAITS_FENETRE_MS = 20000, FAIT_MAX = 300;
const ECRIT_TTL_MS = 120000;       // « X écrit… » expire seul : un appel resté pendu ne laisse pas un agent « en train d'écrire » pour toujours
const SYSTEME_MAX = 300;
/* ── QUI EST DANS QUEL FIL — la seule définition. `'*'` : tous les agents du registre. Un fil privé n'a qu'un membre : son agent. ── */
const MEMBRES = {
  equipe: '*',
  clients: ['victor', 'lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma'],
  plateforme: ['victor', 'max', 'jules', 'theo', 'nina', 'ines'],
  reunions: '*',
};
/* Qui répond quand Justin écrit dans un groupe sans citer personne. (28 octobre 2026, Justin : « Qui gère tout ? » — VICTOR, chef d'équipe, dans les quatre groupes : il répond avec les faits et répartit
   (`assigner`), Léa et Max répondent quand on les cite. Victor est donc membre de « clients » et « plateforme » : il y voit et y répartit. Pour revenir à Léa et Max, c'est cette table et la précédente ;
   `test-2880` et `test-3117` la gardent.) */
const MENEUR = { equipe: 'victor', clients: 'victor', plateforme: 'victor', reunions: 'victor' };
const NOMS_GROUPES = { equipe: 'Équipe', clients: 'Clients', plateforme: 'Plateforme', reunions: 'Réunions' };
const GROUPES = Object.keys(MEMBRES);

/* ── LA PERSONNALISATION D'UN GROUPE — validation, une seule définition (la route ET la relecture du fichier). ── */
const F_GROUPES = 'conversations-groupes.json';
const COULEURS = ['bleu', 'vert', 'orange', 'rouge', 'violet', 'gris'];
const NOM_MAX = 40, DESCRIPTION_MAX = 120;
const CTRL = /[\u0000-\u001f\u007f-\u009f\u200b\u200c\u200e\u200f\u2028-\u202e\u2060-\u2064\ufeff]/;   // contrôles, retours, caractères invisibles et de sens d'écriture
const NOM_PERMIS = /^[\p{L}\p{N} '’.,:;!?&()\-–_/+]+$/u;
const DESCRIPTION_PERMISE = /^[\p{L}\p{N} '’.,:;!?&()\-–—_/+%€…«»*#°]*$/u;
const AVEC_LIEN = /(?:[a-z][a-z0-9+.-]*:\/\/|\bwww\.|\bmailto:|[\p{L}\p{N}-]\.\p{L}{2,})/iu;                // « exemple.fr », « http://… », « www. » — un point suivi d'un espace n'en est pas un
const UN_EMOJI = /^(?:\p{RI}{2}|[0-9#*]\uFE0F?\u20E3|\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])?(?:\u200D\p{Extended_Pictographic}(?:\uFE0F|[\u{1F3FB}-\u{1F3FF}])?)*)$/u;
const unEspace = t => t.replace(/ {2,}/g, ' ').trim();
/* `{ok:true, perso}` ou `{ok:false, erreur}` (un texte lisible, en français). `sansAdr` : la même détection d'adresse que les fils. */
function validerGroupe(b, sansAdr) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, erreur: 'Demande vide' };
  for (const k of ['nom', 'icone', 'couleur']) if (typeof b[k] !== 'string') return { ok: false, erreur: k === 'nom' ? 'Donne un nom au groupe' : k === 'icone' ? 'Choisis une icône' : 'Choisis une couleur' };
  if (b.description != null && typeof b.description !== 'string') return { ok: false, erreur: 'La description doit être un texte' };
  if ([b.nom, b.icone, b.couleur, b.description || ''].some(x => CTRL.test(x))) return { ok: false, erreur: 'Le texte contient un caractère interdit' };
  const nom = unEspace(b.nom.normalize('NFC')), icone = b.icone.normalize('NFC').trim(), description = unEspace(String(b.description || '').normalize('NFC'));
  const longueur = t => Array.from(t).length;
  if (!nom) return { ok: false, erreur: 'Donne un nom au groupe' };
  if (longueur(nom) > NOM_MAX) return { ok: false, erreur: 'Le nom est trop long (' + NOM_MAX + ' caractères au plus)' };
  if (!NOM_PERMIS.test(nom) || !/[\p{L}\p{N}]/u.test(nom)) return { ok: false, erreur: 'Le nom ne peut contenir que des lettres, des chiffres, des espaces et une ponctuation simple' };
  if (norm(nom).includes('justin')) return { ok: false, erreur: 'Le nom ne peut pas porter le prénom de Justin' };
  if (AVEC_LIEN.test(nom) || nom !== sansAdr(nom)) return { ok: false, erreur: 'Le nom ne peut pas contenir de lien ni d’adresse' };
  /* « # » est l'icône d'ORIGINE des groupes : la Tour la pré-remplit quand le groupe n'a jamais été personnalisé. La refuser ferait
     tomber le premier « Enregistrer » de Justin sur un refus, alors qu'il n'a changé que le nom ou la couleur. */
  if (icone !== '#' && !(UN_EMOJI.test(icone) && icone.length <= 16) && !/^\p{L}{1,2}$/u.test(icone)) return { ok: false, erreur: 'L’icône est un émoji, ou une ou deux lettres' };
  if (!COULEURS.includes(b.couleur)) return { ok: false, erreur: 'Couleur inconnue (' + COULEURS.join(', ') + ')' };
  if (longueur(description) > DESCRIPTION_MAX) return { ok: false, erreur: 'La description est trop longue (' + DESCRIPTION_MAX + ' caractères au plus)' };
  if (!DESCRIPTION_PERMISE.test(description)) return { ok: false, erreur: 'La description ne peut contenir que des lettres, des chiffres, des espaces et une ponctuation simple' };
  if (AVEC_LIEN.test(description) || description !== sansAdr(description)) return { ok: false, erreur: 'La description ne peut pas contenir de lien ni d’adresse' };
  return { ok: true, perso: { nom, icone, couleur: b.couleur, description } };
}

/* Sans accent ni casse : « @Léa », « @lea » et « @LÉA » sont la même personne. */
const norm = t => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
/* Les @mentions d'un texte, rendues comme une liste d'identifiants d'agents, sans doublon, dans l'ordre où elles paraissent. `membres` : `[{id, nom}]`
   — les agents DU FIL : citer quelqu'un qui n'y est pas ne le réveille pas et ne se colore pas (« non reconnue = texte simple », Justin).
   « @tous » et « @équipe » = tous les membres. Le « @ » doit commencer un mot : une adresse (« jean@camille.fr ») n'est pas une mention. */
function analyserMentions(texte, membres) {
  const liste = Array.isArray(membres) ? membres : [];
  const parNom = new Map();
  for (const m of liste) { parNom.set(norm(m.id), m.id); parNom.set(norm(m.nom), m.id); }
  const sortie = [];
  const ajoute = id => { if (!sortie.includes(id)) sortie.push(id); };
  for (const x of String(texte == null ? '' : texte).matchAll(/(?<![\p{L}\p{N}_.@])@([\p{L}\p{N}_]+)/gu)) {
    const mot = norm(x[1]);
    if (mot === 'tous' || mot === 'equipe') { for (const m of liste) ajoute(m.id); continue; }
    if (parNom.has(mot)) ajoute(parNom.get(mot));
  }
  return sortie;
}

module.exports = function monterConversations(app, ctx) {
  const { DATA_DIR, monAdmin, monPatronStrict, agents } = ctx;
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));
  const pousse = typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const FORME_DOSSIER = ctx.formeDossier instanceof RegExp ? ctx.formeDossier : /^DOS-\d{6}$/;
  const dossierExiste = typeof ctx.dossierExiste === 'function' ? ctx.dossierExiste : (() => true);
  const IDS = new Map(agents.AGENTS.map(a => [a.id, a.nom]));
  const filValide = f => GROUPES.includes(f) || IDS.has(f);
  const nomDuFil = f => NOMS_GROUPES[f] || (IDS.get(f) || f);   // ⛔ le nom D'ORIGINE, toujours : `nom()` nourrit les consignes des agents (voir l'en-tête)
  /* Les agents d'un fil, `[{id, nom}]` : ceux du registre seulement (un identifiant de la table qui n'y serait plus ne fait pas un fantôme). */
  const membresDe = f => (MEMBRES[f] === '*' ? [...IDS.keys()] : Array.isArray(MEMBRES[f]) ? MEMBRES[f].filter(id => IDS.has(id)) : (IDS.has(f) ? [f] : [])).map(id => ({ id, nom: IDS.get(id) }));
  const meneurDe = f => (MENEUR[f] && IDS.has(MENEUR[f])) ? MENEUR[f] : '';
  const estMembre = (id, f) => membresDe(f).some(m => m.id === id);
  const mentionsDe = (texte, f) => analyserMentions(texte, membresDe(f));

  /* « X écrit… » : fil → (agent → heure). En mémoire seulement. */
  const ecrits = new Map();
  function ecrit(fil, id, oui) {
    if (!filValide(fil) || !IDS.has(id)) return false;
    let m = ecrits.get(fil);
    if (oui) { if (!m) { m = new Map(); ecrits.set(fil, m); } m.set(id, maintenant()); return true; }
    if (m) { m.delete(id); if (!m.size) ecrits.delete(fil); }
    return true;
  }
  function quiEcrit(fil) {
    const m = ecrits.get(fil); if (!m) return [];
    const now = maintenant();
    return [...m].filter(([, ts]) => now - ts < ECRIT_TTL_MS).map(([id]) => ({ id, nom: IDS.get(id) }));
  }

  let illisible = false;
  function charger() {
    let brut;
    try { brut = fs.readFileSync(path.join(DATA_DIR, F), 'utf8'); }
    catch (e) { if (e && e.code === 'ENOENT') return []; illisible = true; return []; }
    try { const j = JSON.parse(brut); if (!Array.isArray(j)) throw new Error('forme'); return j; }
    catch (e) { illisible = true; return []; }
  }
  let messages = charger();
  function ecrire() {
    if (illisible) { console.error('⛔ ' + F + ' NON réécrit : il était illisible au démarrage — le réparer, puis redémarrer'); return false; }
    try { const f = path.join(DATA_DIR, F), tmp = f + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(messages)); fs.renameSync(tmp, f); return true; }
    catch (e) { console.error(F + ' non écrit :', e.message); return false; }
  }
  /* Les groupes personnalisés : { fil → { nom, icone, couleur, description } }, seulement pour les quatre groupes. Jamais d'objet de la requête recopié tel quel :
     on ne garde que les clés de GROUPES (ni `__proto__` ni `constructor` n'entrent), et chaque entrée est revalidée (un fichier modifié à la main). */
  const fichier = typeof ctx.fichier === 'object' && ctx.fichier && typeof ctx.fichier.charger === 'function' ? ctx.fichier : require('./agents-fichier')(DATA_DIR);
  const lireGroupes = () => {
    const brut = fichier.charger(F_GROUPES, {}), sortie = {};
    for (const g of GROUPES) {
      if (!Object.prototype.hasOwnProperty.call(brut, g)) continue;
      const v = validerGroupe(brut[g], sansAdr);
      if (v.ok) sortie[g] = v.perso; else console.error(F_GROUPES + ' : l’entrée « ' + g + ' » est refusée à la relecture (' + v.erreur + ') — le groupe garde son nom d’origine');
    }
    return sortie;
  };
  let groupes = lireGroupes();
  const groupesIllisible = () => fichier.illisible(F_GROUPES);
  const persoDe = f => (!groupesIllisible() && GROUPES.includes(f) && Object.prototype.hasOwnProperty.call(groupes, f)) ? Object.assign({}, groupes[f]) : null;
  const propre = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  /* ⛔ Un message qu'on n'a pas encore lu et qui porte un dossier ou le niveau « urgent » (le rappel d'un client) n'existe QU'ICI : le chasser du registre,
     c'est que Justin ne rappelle jamais ce client, sans erreur ni trace — le dossier est toujours là, plus l'alerte. */
  const protege = m => !!m && m.lu !== true && (m.niveau === 'urgent' || !!m.dossier);
  /* Le plafond évince d'abord les plus anciens messages NON protégés (le bavardage, les lignes du système, ce qui est lu). Les protégés ne partent que si TOUT
     le registre l'est — plus de MESSAGES_MAX rappels non lus —, du plus ancien : le fichier ne grossit jamais sans borne. */
  function elaguer(liste) {
    const exces = liste.length - MESSAGES_MAX;
    if (exces <= 0) return liste;
    const sortir = new Set();
    for (const x of liste) { if (sortir.size >= exces) break; if (!protege(x)) sortir.add(x); }
    for (const x of liste) { if (sortir.size >= exces) break; sortir.add(x); }
    return liste.filter(x => !sortir.has(x));
  }
  /* `sansEcho` : le message VIENT d'OP MESSAGES (le pont, `pont-messages.js`) — le recopier là-bas le ferait revenir à sa source. */
  function ajouter(m, sansEcho) {
    const avant = messages;
    messages = elaguer(avant.concat([m]));
    /* un échec d'écriture rend le registre EXACTEMENT comme il était — évincés compris (l'ancienne version ne retirait que le dernier). */
    if (!ecrire()) { messages = avant; return false; }
    /* LE PONT VERS OP MESSAGES (28 octobre 2026) : tout message écrit au registre — agent, système, Justin — est offert à `surAjout`, qui le recopie dans OP MESSAGES. Sans attendre et sans
       JAMAIS faire échouer l'écriture : une panne d'OP MESSAGES ne change rien à ce que les agents lisent et écrivent ici. Une COPIE : le pont ne touche pas au registre. */
    if (!sansEcho && typeof ctx.surAjout === 'function') {
      try { ctx.surAjout({ id: m.id, ts: m.ts, fil: m.fil, de: m.de, texte: m.texte, niveau: m.niveau, lu: m.lu === true, prof: m.prof || 0, dossier: m.dossier || '' }); } catch (e) { console.error('pont messages :', e && e.message); }
    }
    return true;
  }
  /* Prévenir l'équipe qu'un message est arrivé — sans attendre et sans JAMAIS faire échouer l'écriture. `surMessage(m)` reçoit une copie du message ;
     l'ancienne forme `surMessagePatron(fil, texte)` (un seul agent, seulement pour Justin) reste servie tant que rien d'autre n'est branché. */
  function declencher(m) {
    const copie = { id: m.id, fil: m.fil, de: m.de, texte: m.texte, ts: m.ts, prof: m.prof || 0, mentions: (m.mentions || []).slice() };
    /* la racine voyage avec le message ; l'équipe la REVALIDE (`racine(id)`) — ce qu'on lit ici n'est jamais cru tel quel */
    if (m.racine) copie.racine = m.racine;
    if (m.tous === true) copie.tous = true;
    try {
      if (typeof ctx.surMessage === 'function') Promise.resolve(ctx.surMessage(copie)).catch(e => console.error('réponse d’agent :', e && e.message));
      else if (m.de === 'justin' && typeof ctx.surMessagePatron === 'function') Promise.resolve(ctx.surMessagePatron(m.fil, m.texte)).catch(e => console.error('réponse d’agent :', e && e.message));
    } catch (e) {}
  }
  function notifier(m) {
    if (!pousse || m.de === 'justin' || m.niveau === 'info') return;
    const nom = IDS.get(m.de) || m.de;
    try { Promise.resolve(pousse(m.niveau === 'urgent' ? '🔴 ' + nom : nom + ' te parle', m.texte, '/tour.html#agents')).catch(() => {}); } catch (e) {}
  }

  /* ── LA RACINE : validée au registre, jamais crue ── */
  /* Les dollars d'une racine : en mémoire (`racineDepense`), et à défaut — après un redémarrage — la somme des `cout` rangés sur les messages que la racine a produits. */
  const usdRacine = new Map();
  const naissancesHeure = now => messages.filter(x => x.de === 'justin' && x.racine && now - x.ts < 3600000).length;
  /* `{id, ts, age, vaste, messages, parAgent, usd}` d'une racine VALIDE, sinon `null`. `id` vient d'un appelant : seul un message de Justin, vivant, de moins de deux heures, qui est SA propre racine passe. */
  function racine(id) {
    if (illisible || typeof id !== 'string' || !/^[a-f0-9]{6,32}$/.test(id)) return null;
    const r = messages.find(x => x.id === id);
    if (!r || r.de !== 'justin' || r.racine !== id) return null;
    const now = maintenant();
    if (!(now - r.ts >= 0 && now - r.ts < RACINE_VIE_MS)) return null;
    const parAgent = {}; let n = 0, somme = 0;
    for (const x of messages) if (x.racine === id && IDS.has(x.de) && x.fait !== true) { n++; parAgent[x.de] = (parAgent[x.de] || 0) + 1; somme += Number(x.cout) || 0; }
    return { id, ts: r.ts, age: now - r.ts, vaste: r.vaste === true, messages: n, parAgent, usd: usdRacine.has(id) ? usdRacine.get(id) : somme, texte: r.texte };
  }
  /* L'argent dépensé pour cette racine, par `cerveau.penser` (`cout`) : à ajouter APRÈS chaque appel. Une racine inconnue ne compte rien. */
  function racineDepense(id, usd) {
    if (!racine(id) || typeof usd !== 'number' || !Number.isFinite(usd) || usd <= 0) return false;
    usdRacine.set(id, (usdRacine.has(id) ? usdRacine.get(id) : racine(id).usd) + usd);
    if (usdRacine.size > 500) { const k = usdRacine.keys().next().value; usdRacine.delete(k); }
    return true;
  }

  /* TOUS les refus de `parler`, sans rien écrire : `peutParler` les rend avant l'appel payant, `parler` les rejoue à l'écriture. `o.texte` (facultatif) : sans lui, les contrôles qui lisent le
     texte (vide, doublon) sont sautés — on ne l'a pas encore. */
  function controler(de, fil, texte, o) {
    if (illisible) return { ok: false, raison: 'registre_illisible' };
    if (!IDS.has(de)) return { ok: false, raison: 'inconnu' };
    const p = agents.peutAgir(de);
    if (!p.ok) return { ok: false, raison: p.raison };
    /* un agent parle dans SON fil et dans les groupes dont il est membre — jamais dans le fil privé d'un collègue */
    if (typeof fil !== 'string' || !filValide(fil) || !estMembre(de, fil)) return { ok: false, raison: 'fil' };
    const reunion = o.reunion === true && fil === 'reunions';
    const max = reunion && Number.isInteger(o.max) ? Math.min(Math.max(o.max, TEXTE_MAX), REUNION_TEXTE_MAX) : TEXTE_MAX;
    let t = null;
    if (texte !== undefined) { t = propre(sansAdr(texte), max); if (!t) return { ok: false, raison: 'texte' }; }
    const now = maintenant();
    const rac = o.racine ? racine(o.racine) : null;
    if (rac && !reunion) {
      /* LE BUDGET DE LA RACINE remplace les plafonds horaires : messages d'agents, messages de CET agent, dollars */
      /* ⛔ les dollars d'AVANT ce réveil : `o.cout` est ce que la réponse qu'on écrit a elle-même coûté, déjà ajouté à la racine (`racineDepense`). Le dernier appel qui fait franchir les 4 $ n'est pas jeté
         après avoir été payé — c'est le suivant qui n'a pas lieu (`peutParler`, avant l'appel, lui, voit la somme entière). */
      const avantCeReveil = rac.usd - (typeof o.cout === 'number' && Number.isFinite(o.cout) && o.cout > 0 ? o.cout : 0);
      if (rac.messages >= (rac.vaste ? RACINE_MESSAGES_VASTE : RACINE_MESSAGES) || avantCeReveil >= RACINE_USD) return { ok: false, raison: 'racine_close', racine: rac };
      if ((rac.parAgent[de] || 0) >= (de === 'victor' ? RACINE_PAR_VICTOR : RACINE_PAR_AGENT)) return { ok: false, raison: 'racine_agent', racine: rac };
    } else {
      /* sans racine valide (ou en réunion, qui a son plafond) : les plafonds d'avant. N'y comptent NI une annonce de fin de travail (`fait`) NI un message écrit sous une racine : un @tous de Justin
         ne doit pas saturer le plafond du fil et refuser, pendant une heure, ce qu'un agent dit de lui-même (le point du matin de Victor, une alerte de Max). */
      if (messages.filter(m => m.de === de && m.fait !== true && !m.racine && now - m.ts < 3600000).length >= PAR_HEURE) return { ok: false, raison: 'trop_de_messages' };
      if (messages.filter(m => m.fil === fil && IDS.has(m.de) && m.fait !== true && !m.racine && now - m.ts < 3600000).length >= (reunion ? PAR_HEURE_FIL_REUNION : PAR_HEURE_FIL)) return { ok: false, raison: 'trop_de_messages_fil' };
    }
    if (t !== null && messages.some(m => m.de === de && m.fil === fil && m.fait !== true && m.texte === t && now - m.ts < DOUBLON_MS)) return { ok: false, raison: 'doublon' };
    return { ok: true, t, reunion, rac, now };
  }
  /* « Peut-il parler ? » AVANT de payer l'appel : `{ok:true}` ou `{ok:false, raison, racine?}`. N'écrit rien. */
  function peutParler(de, fil, o) {
    o = o && typeof o === 'object' ? o : {};
    const c = controler(de, fil, typeof o.texte === 'string' ? o.texte : undefined, o);
    return c.ok ? { ok: true } : (c.racine ? { ok: false, raison: c.raison, racine: c.racine } : { ok: false, raison: c.raison });
  }

  /* Un agent parle. `{ok:true}` ou `{ok:false, raison}` — l'agent doit lire la réponse.
     `o.racine` : la racine de la chaîne (un message de Justin) — REVALIDÉE ici. `o.sansReveil` : le message ne réveille personne (la réponse à un @tous). `o.cout` : ce que la réponse a coûté. */
  function parler(de, fil, texte, o) {
    o = o && typeof o === 'object' ? o : {};
    const c = controler(de, fil, texte, o);
    if (!c.ok) return { ok: false, raison: c.raison };
    const { t, reunion, rac, now } = c;
    const niveau = NIVEAUX.includes(o.niveau) ? o.niveau : 'info';
    /* La profondeur : celle du message auquel l'agent répond + 1 (donnée par l'appelant) ; un message spontané en compte 1. */
    const prof = Number.isInteger(o.prof) && o.prof >= 1 && o.prof <= 20 ? o.prof : 1;
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil, de, texte: t, niveau, lu: false, prof, mentions: mentionsDe(t, fil) };
    if (rac && !reunion) m.racine = rac.id;
    if (o.sansReveil === true) m.tous = true;
    if (rac && !reunion && typeof o.cout === 'number' && Number.isFinite(o.cout) && o.cout > 0) m.cout = Math.round(o.cout * 1e6) / 1e6;
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    notifier(m);
    if (!reunion && o.sansReveil !== true && m.mentions.some(id => id !== de)) declencher(m);
    return { ok: true, id: m.id, prof, mentions: m.mentions.slice(), racine: m.racine || '' };
  }

  /* Une ligne du SYSTÈME : ce qui vient de se passer (une tâche prise, passée, un agent à l'arrêt). `o.cle` + `o.parHeure` : ne se dit qu'une fois par
     heure pour cette clé dans ce fil (un agent à l'arrêt qu'on cite dix fois ne remplit pas le fil). Jamais lue comme un ordre, jamais notifiée. */
  function systeme(fil, texte, o) {
    o = o && typeof o === 'object' ? o : {};
    if (illisible) return { ok: false, raison: 'registre_illisible' };
    if (!filValide(fil)) return { ok: false, raison: 'fil' };
    const t = propre(sansAdr(texte), SYSTEME_MAX);
    if (!t) return { ok: false, raison: 'texte' };
    const cle = typeof o.cle === 'string' ? o.cle.slice(0, 80) : '';
    const now = maintenant();
    if (cle && o.parHeure === true && messages.some(m => m.de === 'systeme' && m.fil === fil && m.cle === cle && now - m.ts < 3600000)) return { ok: false, raison: 'deja_dit' };
    /* `o.unique` : une seule fois tant que la ligne est au registre (« l'échange lancé par ton message est clos » : une ligne par racine, pas une par heure) */
    if (cle && o.unique === true && messages.some(m => m.de === 'systeme' && m.fil === fil && m.cle === cle)) return { ok: false, raison: 'deja_dit' };
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil, de: 'systeme', texte: t, niveau: 'info', lu: true, prof: 0, mentions: [] };
    if (cle) m.cle = cle;
    if (!ajouter(m, o.sansEcho === true)) return { ok: false, raison: 'ecriture' };
    return { ok: true, id: m.id };
  }

  /* ── L'ANNONCE DE FIN DE TRAVAIL (28 octobre 2026) ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
     Justin : « je veux qu'à chaque fois qu'ils ont fini, ils mettent dans le groupe "je viens d'effectuer ça", comme ça moi je vois tout en temps réel ». UNE voie d'écriture à part, qui n'est PAS `parler` :
       · le message est de l'agent (`de`), marqué `fait:true`, sans analyse de mentions (`mentions: []`) — il ne réveille donc PERSONNE, et le demandeur y est NOMMÉ, jamais cité ;
       · il ne passe pas par `peutAgir` (un agent qui ferme à 18 h annonce ce qu'il a fini à 17 h 59) et n'entre dans AUCUN plafond (`PAR_HEURE`, fil, racine, doublon de texte) : `controler` les écarte ;
       · sa CLÉ (`fait:<tâche>`, `fait:<agent>:<code>:<dossier>:<jour>`) l'empêche de se répéter, même après un redémarrage — elle est rangée avec le message ;
       · il passe par `ajouter`, donc le pont (`surAjout`) en reçoit une COPIE comme du reste du fil ; niveau `info`, sans notification ;
       · le TEXTE est composé par le code (`agent-faits.js`) et passe encore par `sansAdr` ici ; il ne contient jamais de « @ ».
     `o.groupe` : les faits d'un même agent et d'un même code s'agrègent pendant `FAITS_FENETRE_MS` en UNE ligne « ×N » (les 35 courriels d'un rattrapage donnent une ligne). Une perte est possible sur
     un arrêt brutal dans cette fenêtre — le journal d'`agents.noter` garde la vérité ; `viderFaits()` écrit ce qui attend (à la sortie du processus, et dans les bancs). */
  const rafales = new Map();
  const faitDit = cle => messages.some(m => m.fait === true && (m.cle === cle || (Array.isArray(m.cles) && m.cles.includes(cle))));
  function ecrireFait(agentId, texte, cle, cles) {
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: maintenant(), fil: 'equipe', de: agentId, texte, niveau: 'info', lu: false, prof: 0, mentions: [], fait: true, cle };
    if (cles && cles.length > 1) m.cles = cles.slice(0, 100);
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    return { ok: true, id: m.id };
  }
  function viderRafale(groupe) {
    const r = rafales.get(groupe); if (!r) return null;
    rafales.delete(groupe);
    if (r.timer) clearTimeout(r.timer);
    const n = r.cles.length;
    return ecrireFait(r.agentId, n > 1 ? r.texteSeul + ' ×' + n : r.texte, r.cles[0], r.cles);
  }
  function viderFaits() { const r = []; for (const g of [...rafales.keys()]) r.push(viderRafale(g)); return r; }
  function annoncerFait(agentId, texte, o) {
    o = o && typeof o === 'object' ? o : {};
    if (illisible) return { ok: false, raison: 'registre_illisible' };
    if (!IDS.has(agentId)) return { ok: false, raison: 'inconnu' };
    const cle = typeof o.cle === 'string' ? o.cle.slice(0, 120) : '';
    if (!cle) return { ok: false, raison: 'cle' };
    const t = propre(sansAdr(String(texte == null ? '' : texte)).replace(/@/g, ''), FAIT_MAX);
    if (!t) return { ok: false, raison: 'texte' };
    if (faitDit(cle)) return { ok: false, raison: 'deja_dit' };
    const groupe = typeof o.groupe === 'string' ? o.groupe.slice(0, 80) : '';
    if (!groupe) return ecrireFait(agentId, t, cle);
    let r = rafales.get(groupe);
    if (r && r.cles.includes(cle)) return { ok: false, raison: 'deja_dit' };
    if (!r) {
      /* « ×N » : la ligne de la rafale est la phrase SANS son point final ni son demandeur — le nombre s'ajoute au verbe, pas à un nom */
      r = { agentId, texte: t, texteSeul: t.replace(/\s*\([^()]*demandé par[^()]*\)\.?$/, '').replace(/\.$/, ''), cles: [], timer: null };
      rafales.set(groupe, r);
      const fenetre = Number.isInteger(ctx.fenetreFaitsMs) && ctx.fenetreFaitsMs >= 0 ? ctx.fenetreFaitsMs : FAITS_FENETRE_MS;
      r.timer = setTimeout(() => { try { viderRafale(groupe); } catch (e) { console.error('annonces :', e && e.message); } }, fenetre);
      if (r.timer && typeof r.timer.unref === 'function') r.timer.unref();
    }
    r.cles.push(cle);
    return { ok: true, groupe: true };
  }
  if (ctx.viderALaSortie === true) process.once('exit', () => { try { viderFaits(); } catch (e) {} });

  /* « Ce client veut parler à une vraie personne » : un numéro de dossier et un motif de la liste, rien d'autre. */
  function rappelClient(de, dossier, motif) {
    if (illisible) return { ok: false, raison: 'registre_illisible' };
    if (!IDS.has(de)) return { ok: false, raison: 'inconnu' };
    const p = agents.peutAgir(de);
    if (!p.ok) return { ok: false, raison: p.raison };
    if (typeof dossier !== 'string' || !FORME_DOSSIER.test(dossier)) return { ok: false, raison: 'dossier' };
    if (!Object.prototype.hasOwnProperty.call(MOTIFS, motif)) return { ok: false, raison: 'motif' };
    let existe = false; try { existe = dossierExiste(dossier) !== false; } catch (e) { existe = false; }
    if (!existe) return { ok: false, raison: 'dossier_inconnu' };
    const now = maintenant();
    if (messages.some(m => m.dossier === dossier && m.motif === motif && now - m.ts < DOUBLON_MS)) return { ok: false, raison: 'doublon' };
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil: de, de, niveau: 'urgent', lu: false, dossier, motif,
      texte: 'Le client du dossier ' + dossier + ' ' + MOTIFS[motif] + '. À rappeler : ouvre le dossier pour ses coordonnées.' };
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    try { agents.noter(de, 'rappel client', { cible: dossier, resultat: 'ok', detail: motif }); } catch (e) {}
    notifier(m);
    return { ok: true, id: m.id };
  }

  const vue = m => ({ id: m.id, ts: m.ts, fil: m.fil, de: m.de, nom: m.de === 'justin' ? 'Toi' : m.de === 'systeme' ? 'Système' : (IDS.get(m.de) || m.de), texte: m.texte, niveau: m.niveau, lu: m.lu === true,
    dossier: m.dossier || '', motif: m.motif || '', mentions: Array.isArray(m.mentions) ? m.mentions.slice() : [], prof: m.prof || 0, systeme: m.de === 'systeme', fait: m.fait === true });
  const nonLus = f => messages.filter(m => m.fil === f && m.de !== 'justin' && m.lu !== true).length;
  /* Un fil pour la liste : le dernier message, son heure, les non-lus de Justin, les membres, le meneur, qui écrit. */
  const resume = f => {
    const ms = messages.filter(m => m.fil === f); const d = ms[ms.length - 1];
    const r = { fil: f, nom: nomDuFil(f), groupe: GROUPES.includes(f), nonLus: nonLus(f), membres: membresDe(f), meneur: meneurDe(f), ecrit: quiEcrit(f),
      dernier: d ? { ts: d.ts, de: d.de, texte: d.texte.slice(0, 120), niveau: d.niveau } : null };
    const perso = persoDe(f); if (perso) r.perso = perso;   // présent SEULEMENT si Justin a personnalisé ce groupe
    return r;
  };

  app.get('/api/monitor/conversations', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    /* Par défaut, la liste d'avant : « Équipe » et les fils qui ont un message (les groupes, dès qu'ils en ont un). `?tous=1` : TOUS les fils,
       vides compris — c'est ce dont l'écran de messagerie a besoin pour proposer chaque groupe et chaque agent. */
    const tous = String(req.query.tous || '') === '1';
    const fils = [...GROUPES, ...IDS.keys()].map(resume).filter(x => tous || x.dernier || x.fil === 'equipe');
    res.json({ ok: true, fils, nonLus: fils.reduce((s, x) => s + x.nonLus, 0), agents: [...IDS].map(([id, nom]) => ({ id, nom })) });
  });
  app.get('/api/monitor/conversations/:fil', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const f = String(req.params.fil || '');
    if (!filValide(f)) return res.status(400).json({ error: 'Fil inconnu' });
    /* Lecture INCRÉMENTALE : `?apres=<id>` ne rend que les messages arrivés après celui-là. Un identifiant qu'on ne retrouve pas (le fil a été
       rogné) rend le fil entier et le DIT (`complet:true`) : l'écran se redessine au lieu de croire qu'il n'a rien manqué. */
    const tous = messages.filter(m => m.fil === f);
    const apres = String(req.query.apres || '');
    let liste = tous.slice(-LISTE_MAX), complet = true;
    if (apres) { const i = tous.findIndex(m => m.id === apres); if (i >= 0) { liste = tous.slice(i + 1).slice(-LISTE_MAX); complet = false; } }
    res.json({ ok: true, fil: f, nom: nomDuFil(f), groupe: GROUPES.includes(f), membres: membresDe(f), meneur: meneurDe(f), ecrit: quiEcrit(f), complet, messages: liste.map(vue) });
  });
  /* JUSTIN ÉCRIT dans un fil — UN SEUL CHEMIN, pour la route de la Tour ET pour le pont (OP MESSAGES : ce qu'il y écrit entre ici, par la même porte). → `{ok:true, message, mentions}` ou
     `{ok:false, statut, error}`. `o.sansEcho` : le message vient d'OP MESSAGES, il n'y est pas recopié. */
  function justinEcrit(fil, texte, o) {
    if (illisible) return { ok: false, statut: 503, error: 'Les conversations sont illisibles' };
    if (!filValide(fil)) return { ok: false, statut: 400, error: 'Fil inconnu' };
    const t = propre(texte, TEXTE_PATRON_MAX);
    if (!t) return { ok: false, statut: 400, error: 'Message vide' };
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: maintenant(), fil, de: 'justin', texte: t, niveau: 'info', lu: true, prof: 0, mentions: mentionsDe(t, fil) };
    /* ⛔ LA RACINE NAÎT ICI ET NULLE PART AILLEURS : l'identifiant du message lui-même — jamais une valeur du corps de la requête (`o` ne porte que `sansEcho`). Soixante naissances par heure : au-delà
       (un jeton du pont volé), le message est écrit, mais il n'est plus une racine. */
    if (naissancesHeure(m.ts) < RACINES_PAR_HEURE) { m.racine = m.id; if (m.mentions.length >= VASTE_CITES) m.vaste = true; }
    if (!ajouter(m, !!(o && o.sansEcho))) return { ok: false, statut: 503, error: 'Message non enregistré' };
    /* L'équipe peut répondre (le cité, l'agent du fil privé, ou le meneur du groupe) : sans attendre, et sans jamais faire échouer l'envoi. */
    declencher(m);
    return { ok: true, message: vue(m), mentions: m.mentions.slice() };
  }
  app.post('/api/monitor/conversations/envoyer', monPatronStrict, (req, res) => {
    const r = justinEcrit((req.body || {}).fil, (req.body || {}).texte);
    if (!r.ok) return res.status(r.statut).json({ error: r.error });
    res.json({ ok: true, message: r.message, mentions: r.mentions });
  });
  /* SUPPRIMER UN MESSAGE (28 octobre 2026, Justin : « il faudrait aussi que je puisse supprimer les messages »). Le patron seul, n'importe quel message
     (le sien, celui d'un agent, une ligne du système) : il sort du registre, donc de ce que les agents relisent du fil. Tout ou rien — un registre qui ne
     s'écrit pas garde le message (503). Le journal (MON_GESTES) dit le GESTE, jamais le texte. Un identifiant inconnu : 404, rien ne bouge. */
  /* RETIRER UN MESSAGE — UN SEUL CHEMIN, pour la route de la Tour ET pour le pont (Justin l'a supprimé dans OP MESSAGES). → `{ok:true, fil}` ou `{ok:false, statut, error}`.
     `o.sansEcho` : la suppression vient d'OP MESSAGES, elle n'y est pas redite. */
  function retirer(idBrut, o) {
    if (illisible) return { ok: false, statut: 503, error: 'Les conversations sont illisibles' };
    const id = String(idBrut || '');
    if (!/^[a-f0-9]{6,32}$/.test(id)) return { ok: false, statut: 400, error: 'Identifiant de message manquant' };
    const i = messages.findIndex(m => m && m.id === id);
    if (i < 0) return { ok: false, statut: 404, error: 'Message introuvable (déjà supprimé ?)' };
    /* (gardien, 28 octobre 2026) un rappel client non lu n'existe QU'ICI (voir `protege`) : un toucher de travers l'effaçait, et le client n'était jamais
       rappelé. On le lit d'abord (ouvrir le fil le marque lu), on le supprime ensuite. */
    if (protege(messages[i])) return { ok: false, statut: 409, error: 'Rappel client non lu : ouvre-le d’abord, puis supprime-le' };
    const avant = messages;
    messages = avant.filter((m, k) => k !== i);
    if (!ecrire()) { messages = avant; return { ok: false, statut: 503, error: 'Suppression non enregistrée : le message reste' }; }
    if (!(o && o.sansEcho) && typeof ctx.surRetrait === 'function') { try { ctx.surRetrait({ id, fil: avant[i].fil }); } catch (e) { console.error('pont messages :', e && e.message); } }
    return { ok: true, fil: avant[i].fil };
  }
  app.post('/api/monitor/conversations/supprimer', monPatronStrict, (req, res) => {
    const r = retirer((req.body || {}).id);
    if (!r.ok) return res.status(r.statut).json({ error: r.error });
    res.json({ ok: true, fil: r.fil });
  });
  app.post('/api/monitor/conversations/lire', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const f = String((req.body || {}).fil || '');
    if (!filValide(f)) return res.status(400).json({ error: 'Fil inconnu' });
    const touches = messages.filter(m => m.fil === f && m.de !== 'justin' && m.lu !== true);
    touches.forEach(m => { m.lu = true; });
    if (touches.length && !ecrire()) { touches.forEach(m => { m.lu = false; }); return res.status(503).json({ error: 'Lecture non enregistrée' }); }
    res.json({ ok: true, lus: touches.length });
  });

  /* Personnaliser un groupe — ou le remettre par défaut. Seul le patron (`monPatronStrict`). L'écriture est tout ou rien : un registre qui ne s'écrit pas
     laisse le groupe exactement comme il était (503). Le journal dit le GESTE et le groupe (son identifiant), jamais le nom ni la description choisis. */
  app.post('/api/monitor/conversations/groupe', monPatronStrict, (req, res) => {
    const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
    if (typeof b.fil !== 'string' || !GROUPES.includes(b.fil)) return res.status(400).json({ error: 'Groupe inconnu' });
    const fil = b.fil;
    req._gesteCible = fil;   // la cible du journal des gestes : l'identifiant du groupe — sinon `nom` (le texte choisi) y passerait en premier
    let perso = null;
    if (b.defaut === true) { /* remise par défaut */ }
    else {
      const v = validerGroupe(b, sansAdr);
      if (!v.ok) return res.status(400).json({ error: v.erreur });
      perso = v.perso;
    }
    /* la demande est jugée d'abord (une faute de frappe reste un 400), le registre ensuite : illisible, on n'écrit rien par-dessus */
    if (groupesIllisible()) return res.status(503).json({ error: 'Les groupes personnalisés sont illisibles' });
    const suite = {};
    for (const g of GROUPES) if (g !== fil && Object.prototype.hasOwnProperty.call(groupes, g)) suite[g] = groupes[g];
    if (perso) suite[fil] = perso;
    if (!fichier.ecrire(F_GROUPES, suite)) return res.status(503).json({ error: 'Le choix n’a pas pu être enregistré' });
    groupes = suite;
    try { agents.noter('systeme', perso ? 'groupe personnalisé' : 'groupe remis par défaut', { cible: fil, resultat: 'ok' }); } catch (e) {}
    res.json({ ok: true, perso: perso ? Object.assign({}, perso) : null });
  });

  /* Les `n` derniers messages d'un fil (1 à 50), du plus ancien au plus récent : `[{de, texte, ts}]`. Pour qu'un agent REPRENNE la conversation
     sans qu'on lui recopie tout. Le texte est celui qui est rangé : sans caractère de contrôle, borné ; il n'est PAS passé par `sansAdresses`
     côté patron (seuls les agents y passent à l'écriture) — l'appelant qui l'envoie hors du serveur le nettoie lui-même. Un fil inconnu ou
     un registre illisible rend `[]` : « rien à lire » ne devient jamais une erreur qui ferait parler un agent à tort. */
  function historique(fil, n) {
    if (illisible || !filValide(fil)) return [];
    const k = Math.min(Math.max(Math.floor(Number(n)) || 1, 1), 50);
    return messages.filter(m => m.fil === fil).slice(-k).map(m => ({ de: m.de, texte: m.texte, ts: m.ts }));
  }

  /* La même lecture, avec ce qu'il faut pour RÉPONDRE : l'identifiant, la profondeur et les mentions de chaque message. Les lignes `systeme` y sont :
     c'est l'appelant qui décide de les écarter. */
  function lire(fil, n) {
    if (illisible || !filValide(fil)) return [];
    const k = Math.min(Math.max(Math.floor(Number(n)) || 1, 1), 50);
    return messages.filter(m => m.fil === fil).slice(-k).map(m => ({ id: m.id, de: m.de, texte: m.texte, ts: m.ts, prof: m.prof || 0, mentions: Array.isArray(m.mentions) ? m.mentions.slice() : [], racine: m.racine || '', fait: m.fait === true }));
  }

  /* Une COPIE du registre, du plus ancien au plus récent : ce que le pont recopie dans OP MESSAGES (l'historique, et ce qu'une panne a laissé en arrière). Rien à écrire par-dessus. */
  const tous = () => messages.map(m => ({ id: m.id, ts: m.ts, fil: m.fil, de: m.de, texte: m.texte, niveau: m.niveau, lu: m.lu === true, dossier: m.dossier || '' }));
  return { parler, peutParler, systeme, rappelClient, historique, lire, ecrit, quiEcrit, membres: membresDe, meneur: meneurDe, estMembre, filValide, nom: nomDuFil, MOTIFS, estIllisible: () => illisible, justinEcrit, retirer, tous,
    racine, racineDepense, annoncerFait, viderFaits };
};
module.exports.MOTIFS = MOTIFS;
module.exports.MEMBRES = MEMBRES;
module.exports.MENEUR = MENEUR;
module.exports.GROUPES = GROUPES;
module.exports.COULEURS = COULEURS;
module.exports.analyserMentions = analyserMentions;
module.exports.PAR_HEURE_FIL = PAR_HEURE_FIL;
module.exports.PAR_HEURE = PAR_HEURE;
module.exports.RACINE = { VIE_MS: RACINE_VIE_MS, MESSAGES: RACINE_MESSAGES, MESSAGES_VASTE: RACINE_MESSAGES_VASTE, VASTE_CITES, PAR_AGENT: RACINE_PAR_AGENT, PAR_VICTOR: RACINE_PAR_VICTOR, USD: RACINE_USD, NAISSANCES_PAR_HEURE: RACINES_PAR_HEURE, HORS_HEURES_MS };
