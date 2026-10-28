/* LA MESSAGERIE DES AGENTS (23 octobre 2026) — une VRAIE conversation, pas un aiguillage. Cahier : `design/EQUIPE-AGENTS.md` §6 et §11.
 *
 * Justin, après avoir essayé la maquette (il demande à Margaux « sur la compta, tu en es où ? » et elle « passe la demande » à Victor) :
 * « Les réponses, c'est pas ouf… là ça se refile les tâches : je pose une question et c'est l'autre qui prend la main. Après, si une personne
 * est occupée et qu'une autre ne fait rien et peut gérer, pour ne pas la surcharger de travail, c'est bien. »
 *
 * ⛔ UNE QUESTION REÇOIT LA RÉPONSE DE CELUI À QUI ELLE EST POSÉE. Un message qui cite un agent n'est PAS une tâche d'office et n'est JAMAIS
 *    délégué mécaniquement : l'agent cité lit le fil, comprend et DÉCIDE avec son cerveau — répondre, prendre le travail, demander une précision.
 *    Rien dans ce fichier n'envoie un message vers un autre agent « parce que » : c'est le modèle qui choisit, et le CODE qui valide.
 * ⛔ UN AGENT AGIT PAR DES OUTILS FERMÉS (`outilsDe`) : ecrire, prendre, passer, terminer, demander_justin. Chaque appel est VALIDÉ ici avant d'être
 *    exécuté, et la règle qui compte (qui peut passer quoi à qui) vit dans `agents.js` (`consigner`, `passerConsigne`) — une seule définition.
 *    Un appel refusé ne fait rien d'autre qu'une ligne au journal et une ligne du système dans le fil, qui dit POURQUOI.
 * ⛔ HUGO ET MARGAUX (l'argent et les accès) ne reçoivent un texte libre que de JUSTIN. D'un collègue vers eux : seulement les types fermés de
 *    `agents.js` (`deposer`). Un texte venu d'un client ne devient jamais une consigne — et ce fichier n'en reçoit aucun : seuls les messages des
 *    fils (Justin, les agents) et des FAITS fermés entrent dans ce que Claude lit.
 * ⛔ ANTI-BOUCLE. Sans elle, deux agents qui se citent se répondent à l'infini et vident le budget : un message porte sa profondeur (Justin 0,
 *    une réponse = celle du message + 1) ; un agent réveillé par un AUTRE agent ne l'est que si cette profondeur est < `PROF_MAX` ; jamais sur son
 *    propre message ni sur un message du système ; au plus `REVEILS_AGENT_MAX` agents réveillés par un message d'agent ; et le module des
 *    conversations plafonne les messages d'agents par heure et par fil, en plus du plafond par agent.
 * ⛔ UN AGENT À L'ARRÊT NE PARLE PAS, et ne lit rien : `peutAgir` est demandé avant les faits, avant Claude, avant le mot. Le fil reçoit alors une
 *    ligne du système, une fois par heure.
 * ⛔ CE QUE CLAUDE REÇOIT : le fil (15 messages, adresses et numéros masqués), ses tâches en cours, la charge de l'équipe (des NOMS et des NOMBRES)
 *    et un bloc FAITS fermé (même seconde barrière que `agent-conversation.js`, dont `fermer` est repris tel quel).
 */
'use strict';
const AC = require('./agent-conversation');
const { fermer, raccourcir, sansTel, ADRESSE, CAUSES, FORME_DOSSIER } = AC;
const { SANS_CONSIGNE_LIBRE } = require('./agents');
const { GROUPES, RACINE } = require('./conversations');

const HISTORIQUE_N = 15;
const PROF_MAX = 3;
/* SOUS UNE RACINE (un message de Justin, `conversations.racine`) la chaîne peut aller plus loin : le budget de la racine (messages, dollars) la borne, pas l'heure. Sans racine, `PROF_MAX` reste 3. */
const PROF_MAX_RACINE = 6;
const REVEILS_AGENT_MAX = 4;
/* (28 octobre 2026) 4 -> 6 : un agent autonome enchaîne prendre, demander, assigner, terminer sans qu'on lui coupe la fin de sa liste. Aucune n'est une sécurité : chaque outil se VALIDE en lui-même. */
const ACTIONS_MAX = 6;
/* « @tous » (28 octobre 2026) : chacun répond UNE fois, court, sans outil ; Victor fait la synthèse en dernier et lit TOUTES les réponses (l'historique de CE réveil-là passe de 15 à 30). */
const TOUS_CARS = 300, TOUS_JETONS = 400, HISTORIQUE_SYNTHESE = 30;
const MESSAGE_MAX = 1000;
const DOSSIERS_MAX = 3;

/* HUGO, MARGAUX, EMMA, SARAH (23 octobre 2026) : leur mission dans la messagerie. Les gestes qu'ils font vraiment passent par des outils propres (`outilsAgents`, plus bas), validés par
   leur module — jamais par une phrase. */
const ROLES_GESTION = {
  hugo: { faits: ['dossier'], rien: 'Tu ne rembourses JAMAIS et tu n’annules jamais un abonnement tout de suite : la seule fin possible est celle de la période déjà réglée, et seulement sur une demande fermée de Camille ou de Justin. Tu ne peux RIEN faire d’autre sur les paiements ni sur les accès.',
    mission: 'Tu t’occupes des paiements et des accès : tu relis les paiements Stripe, tu prépares la création des espaces clients, et tu programmes la FIN d’un abonnement à la fin de la période réglée quand le client l’a demandé (tu accuses réception au client et tu préviens Justin). Quand un collègue te demande si un client a payé (il te donne un numéro de dossier), tu réponds oui, non, ou « en impayé » — jamais un montant, jamais un nom.' },
  margaux: { faits: ['dossier', 'facture'], rien: 'Tu ne peux RIEN faire sur l’argent : ni remboursement (« on ne fera pas de remboursement », Justin), ni avoir, ni résiliation. Tes seuls gestes : relancer les impayés (J+3, J+7) et PRÉPARER la mise en demeure, que seul Justin valide.',
    mission: 'Tu t’occupes de la facturation : les factures, les paiements, ce que doit ou a payé un client. Tu relances les impayés puis tu prépares la mise en demeure pour Justin. Quand un collègue te pose une question de facture (il te donne un numéro de dossier), tu réponds avec les faits du bloc Faits : le statut, le montant et la date de la dernière facture — sans jamais citer de nom ni d’adresse.' },
  emma:    { faits: [], mission: 'Tu t’occupes des rendez-vous avec les prospects : quand l’un veut être appelé, tu lui proposes des créneaux pris dans les disponibilités de Justin (jamais d’autres), puis tu crées le rendez-vous pour Justin quand le prospect a choisi. Sans disponibilités réglées, tu dis au prospect qu’on le rappelle.' },
  sarah:   { faits: [], mission: 'Tu rédiges les annonces aux clients (nouvelle version d’OP GESTION, maintenance) à partir des notes de Justin. Une annonce à tous les clients ne part JAMAIS sans la validation de Justin : tu la déposes, il décide.' },
};

/* Les rôles : ceux de la conversation générique, plus Hugo (qui avait son module — il parle désormais ici, comme les autres). */
const ROLES = Object.assign({}, AC.ROLES, {
  /* 23 octobre 2026 — Hugo, Margaux, Emma et Sarah (`agent-hugo.js`, `agent-margaux.js`, `agent-emma.js`, `agent-sarah.js`) : leur mission, et les faits qu'ils lisent.
     Une question de FAIT d'un collègue (« tel client a-t-il payé ? ») reçoit la réponse de celui à qui elle est posée, sur les faits fermés du dossier cité — sans montant pour Hugo,
     avec le montant et la date pour Margaux (« facture »), jamais un nom ni une adresse. */
  ...ROLES_GESTION,
});
/* Les relevés des agents de la plateforme (Max, Jules, Théo, Nina, Inès, Victor) : leur liste vit dans `plateforme-roles.js`, qui remplace leur entrée par une copie élargie (AC.ROLES reste intact). */
require('./plateforme-roles').appliquer(ROLES);

/* Une ligne de caractère par agent : une façon de parler, pas une liste de qualités. Pas de formule toute faite (Justin : « pas des robots »). */
const PERSO = {
  victor:  'Posé et organisé, tu vas à l’essentiel ; quand deux collègues ne sont pas d’accord tu tranches calmement, et tu dis nettement ce qui revient à Justin.',
  ines:    'Exigeante mais bienveillante : tu relèves un défaut avec précision, jamais pour le plaisir de reprocher.',
  camille: 'Chaleureuse et patiente ; tu reformules ce que le client a vécu avant de proposer quoi que ce soit.',
  hugo:    'Carré et discret ; tu parles en faits vérifiés et tu n’avances rien dont tu n’es pas sûr.',
  margaux: 'Rigoureuse, un peu sèche sur les chiffres mais jamais froide ; tu dis où en est la compta sans détour.',
  lea:     'Enthousiaste et curieuse ; tu t’intéresses d’abord à ce que le client veut réussir avec l’application.',
  max:     'Calme quand ça chauffe ; tu parles court, avec des chiffres, sans jamais dramatiser.',
  nina:    'Prudente et pédagogue ; tu expliques un risque en une phrase simple, sans jargon.',
  theo:    'Méthodique et tranquille ; tu aimes les choses vérifiées deux fois, et tu le dis.',
  jules:   'Pragmatique, avec un brin d’ironie ; tu cherches la cause avant de parler de correctif.',
  chloe:   'Créative mais concrète ; tu penses toujours au chantier du client avant de penser au devis.',
  emma:    'Organisée et souriante ; les horaires, les lieux et les détails pratiques sont ton terrain.',
  louis:   'Pédagogue patient ; tu cherches l’exemple qui fait comprendre plutôt que l’explication complète.',
  sarah:   'Soigneuse avec les mots ; tu pèses chaque phrase et tu tiens au ton juste.',
  lola:    'Vive et visuelle ; tu penses en images, en accroches, en idées de publications.',
  noah:    'Observateur et mesuré ; tu lis ce qui se dit de Team OP sans t’emballer.',
};

/* ── QUI EST RÉVEILLÉ PAR UN MESSAGE — pur, donc rejouable au banc ─────────────────────────────────────────────────────────────────────
   `m` : { de, prof, mentions }. `o` : { membres:[ids], meneur, prive, filId }.
   · un message du SYSTÈME ne réveille personne ;
   · Justin cite quelqu'un → les cités ; sinon l'agent d'un fil privé ; sinon le meneur du groupe ;
   · un AGENT ne réveille que ceux qu'il cite, et seulement si la profondeur du message est < PROF_MAX ;
   · jamais l'auteur lui-même. */
function destinataires(m, o) {
  if (!m || typeof m !== 'object' || m.de === 'systeme' || !o) return [];
  const membres = Array.isArray(o.membres) ? o.membres : [];
  const cites = (Array.isArray(m.mentions) ? m.mentions : []).filter(id => id !== m.de && membres.includes(id));
  if (m.de === 'justin') {
    if (cites.length) return cites;
    if (o.prive) return membres.includes(o.filId) ? [o.filId] : [];
    return o.meneur && membres.includes(o.meneur) ? [o.meneur] : [];
  }
  /* la réponse d'un agent à un « @tous » ne réveille personne : chacun répond UNE fois, c'est Victor qui synthétise */
  if (m.tous === true) return [];
  /* `o.profMax` : la profondeur permise PAR LA RACINE (6) ; absent ou hors forme, c'est PROF_MAX (3) — le régime de ce qui n'est pas enraciné */
  const profMax = Number.isInteger(o.profMax) && o.profMax >= 1 ? Math.min(o.profMax, PROF_MAX_RACINE) : PROF_MAX;
  if (!(Number(m.prof) < profMax)) return [];
  return cites;
}

/* ── LES OUTILS : une liste fermée, des schémas stricts. `o.fils` : les fils où l'agent peut écrire. `o.collegues` : à qui il peut passer. ── */
function outilsDe(id, o) {
  o = o || {};
  const fils = Array.isArray(o.fils) ? o.fils : [];
  const collegues = Array.isArray(o.collegues) ? o.collegues : [];
  /* ⛔ LA TÂCHE EST UNE LISTE FERMÉE (examen du 24 octobre 2026, scénario 2 ; relecture du gardien) : Camille donnait l'INTITULÉ d'une tâche (« la mise à jour de
     la FAQ support ») au lieu de son identifiant, et l'outil refusait. La deviner à ses mots pouvait clôturer ou passer la MAUVAISE tâche (« répondre au prospect
     Dupont » attrapait la tâche Martin) : on ne devine pas. Le schéma offre les identifiants de SES tâches en cours (`o.taches`, celles de l'équipe pour Victor) :
     le modèle choisit dans la liste, et `passerConsigne` / `terminer` revérifient tout. Sans tâche, la chaîne reste libre (l'outil refusera). */
  const taches = Array.isArray(o.taches) ? o.taches.filter(t => typeof t === 'string' && t).slice(0, 40) : [];
  const champTache = Object.assign({ type: 'string', description: 'l’identifiant de la tâche, celui entre crochets dans « Tes tâches en cours »' }, taches.length ? { enum: taches } : {});
  const communs = [
    { name: 'ecrire', description: 'Écrire un message dans un fil dont tu es membre (ton fil privé avec Justin, ou un groupe). Pour qu’un collègue le lise, cite-le avec @identifiant dans le texte (par exemple @lea). Pas besoin de cet outil pour répondre à ce qu’on te demande ici : ta réponse normale va déjà dans ce fil. 600 caractères au plus.',
      input_schema: { type: 'object', properties: { fil: { type: 'string', enum: fils }, texte: { type: 'string' } }, required: ['fil', 'texte'], additionalProperties: false } },
    { name: 'prendre', description: 'Accepter un travail : il devient TA tâche en cours, « demandée par » celui qui vient de te la demander. À n’utiliser que si tu t’en charges vraiment ; une simple question n’est pas un travail. Décris le travail en une phrase (500 caractères au plus).',
      input_schema: { type: 'object', properties: { texte: { type: 'string' } }, required: ['texte'], additionalProperties: false } },
    { name: 'passer', description: 'Passer une de tes tâches en cours à un collègue LIBRE (aucune tâche en cours), seulement si tu es réellement chargé (tu as au moins une autre tâche en cours). Jamais Hugo ni Margaux. Dis la raison, elle sera écrite dans le fil.',
      input_schema: { type: 'object', properties: { vers: { type: 'string', enum: collegues }, tache: champTache, raison: { type: 'string' } }, required: ['vers', 'tache', 'raison'], additionalProperties: false } },
    { name: 'terminer', description: 'Marquer une de tes tâches en cours comme terminée, avec un résumé d’une phrase.',
      input_schema: { type: 'object', properties: { tache: champTache, resume: { type: 'string' } }, required: ['tache', 'resume'], additionalProperties: false } },
    { name: 'demander_justin', description: 'Poser une question que Justin doit trancher : elle arrive dans ton fil privé avec lui, en « important » (il est notifié). Une question à la fois, courte.',
      input_schema: { type: 'object', properties: { question: { type: 'string' } }, required: ['question'], additionalProperties: false } },
  ];
  /* L'ARBITRAGE (23 octobre 2026) : un SIXIÈME outil, pour Victor seul — `o.arbitre` n'est vrai que pour lui, et seulement quand le module qui range la décision est monté. La règle (deux agents, une décision
     écrite, ce qui touche à l'argent ou aux accès devient une question à Justin) vit dans `agent-victor.js` : ce fichier-ci ne fait que l'offrir et passer l'appel. */
  if (o.arbitre) {
    communs.push({ name: 'arbitrer', description: 'Trancher un désaccord entre DEUX collègues : ta décision en une phrase et la raison ; elle est écrite et dite dans le fil. Si la question touche à l’argent, un contrat, un accès ou des données (ce qui est à Justin), remplis pour_justin avec la question à lui poser : tu ne tranches pas seul.',
      input_schema: { type: 'object', properties: { entre: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 }, decision: { type: 'string' }, raison: { type: 'string' }, pour_justin: { type: 'string' } }, required: ['entre', 'decision', 'raison'], additionalProperties: false } });
  }
  /* les outils propres à l'agent (`ctx.outilsAgents`) : jamais un nom déjà pris par un outil commun */
  const noms = new Set(communs.map(t => t.name));
  return communs.concat((Array.isArray(o.propres) ? o.propres : []).filter(t => t && typeof t.name === 'string' && !noms.has(t.name)));
}

const MOTIFS_PASSER = {
  tache: 'cette tâche n’existe pas ou n’est plus en cours',
  pas_le_tien: 'ce n’est pas sa tâche',
  pas_charge: 'il n’a pas d’autre tâche en cours : il garde ce qu’on lui a demandé',
  occupe: 'ce collègue a déjà du travail en cours',
  jamais_hugo_margaux: 'Hugo et Margaux ne reçoivent pas de travail passé par un collègue',
  destinataire: 'collègue inconnu',
  arret: 'ce collègue est à l’arrêt',
  pause: 'les agents sont en pause',
  registre_illisible: 'le registre des tâches est illisible',
  ecriture: 'la tâche n’a pas pu être enregistrée',
  inconnu: 'agent inconnu',
};

const RAS = /^\s*RAS\s*\.?\s*$/i;
/* LES TICS DE GROUPE (examen du 27 octobre 2026, 14 h 49, scénario 9) : à « @tous, une idée ? », quatre agents « plussoyaient Léa » et trois ouvraient par
   « Côté X, ça m'arrange… ». Inès l'a jugé, à raison : une formule toute faite, recyclée. Une réponse de GROUPE qui approuve un collègue au lieu d'apporter le
   sien, ou qui ouvre comme un collègue vient d'ouvrir (même tic d'ouverture), est redemandée UNE fois, sans outil (`ticDeGroupe`). */
const APPROUVE = /\b(?:je\s+)?plussoie|\bje\s+(?:rejoins|confirme\s+(?:ce\s+que|l['’]int[ée]r[êe]t|les\s+propos|l['’]id[ée]e))|\bcomme\s+(?:le\s+dit|l['’]a\s+dit|dit)\s+@?[\p{L}]+|\bd['’]accord\s+avec\s+@?[\p{L}]+|\bje\s+suis\s+(?:tout\s+[àa]\s+fait\s+)?d['’]accord\b|\bje\s+valide\s+(?:l['’]id[ée]e|ce\s+que)/iu;
const OUVERTURES = /^\s*(?:c[ôo]t[ée]|du\s+c[ôo]t[ée]|de\s+mon\s+c[ôo]t[ée]|niveau|pour\s+ma\s+part|chez\s+moi|moi\s+aussi|tout\s+[àa]\s+fait|enti[èe]rement|pareil)(?=[\s,:;.!]|$)/i;   /* pas de \b : après « é », \b ne voit pas la fin du mot */
function ouvertureDe(t) { const m = OUVERTURES.exec(String(t || '').replace(/^\s*@[\p{L}\p{N}_]+[\s,:]*/u, '')); return m ? m[0].trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') : ''; }
/* Rend la raison du tic (texte pour la redemande) ou '' : `autres` = ce que les COLLÈGUES ont déjà répondu au même message, dans ce fil. */
function ticDeGroupe(texte, autres) {
  if (APPROUVE.test(texte)) return 'tu approuves un collègue au lieu d’apporter ce qui t’est propre';
  const o = ouvertureDe(texte);
  if (o && autres.some(a => ouvertureDe(a) === o)) return 'tu ouvres comme un collègue vient d’ouvrir (« ' + o + ' … »)';
  return '';
}

module.exports = function agentEquipe(ctx) {
  const { agents, conversations, cerveau } = ctx;
  const faits = ctx.faits && typeof ctx.faits === 'object' ? ctx.faits : {};
  const requis = ['parler', 'systeme', 'lire', 'ecrit', 'membres', 'meneur', 'estMembre'];
  if (!agents || !Array.isArray(agents.AGENTS) || !conversations || requis.some(f => typeof conversations[f] !== 'function') || !cerveau || typeof cerveau.penser !== 'function') {
    return { ids: [], surMessage: async () => ({ saute: 'pas_de_cerveau' }) };
  }
  const registre = new Map(agents.AGENTS.map(a => [a.id, a]));
  /* LES OUTILS PROPRES À UN AGENT (23 octobre 2026) : `ctx.outilsAgents = { hugo: { outils:[définitions], executer(nom, entree, c) → { ok, raison, ligne } }, … }`. Ils s'ajoutent
     aux cinq outils communs, pour CET agent seulement ; leur module les valide (c'est lui qui sait qui peut quoi), ce fichier ne fait que les passer — `c` porte l'auteur du message
     qui a réveillé l'agent (`de`) et son texte : un outil qui engage (une fin d'abonnement, une mise en demeure) n'agit que sur un message de Justin. */
  const propres = ctx.outilsAgents && typeof ctx.outilsAgents === 'object' ? ctx.outilsAgents : {};
  const outilsPropres = id => (Object.prototype.hasOwnProperty.call(propres, id) && propres[id] && Array.isArray(propres[id].outils)) ? propres[id].outils : [];
  /* La mémoire d'équipe de l'agent (leçons et objectifs des réunions, `reunions.js`) : injectée, donc absente tant que les réunions ne sont pas montées. */
  const memoire = id => { try { return typeof ctx.memoire === 'function' ? String(ctx.memoire(id) || '') : ''; } catch (e) { return ''; } };
  const ids = agents.AGENTS.map(a => a.id).filter(id => ROLES[id] && PERSO[id]);
  const IDS = new Set(ids);
  const nomDe = id => id === 'justin' ? 'Justin' : (registre.get(id) || {}).nom || id;
  const nomFil = f => (typeof conversations.nom === 'function' ? conversations.nom(f) : '') || (registre.get(f) || {}).nom || f;
  const masquer = t => sansTel(String(t || '').replace(ADRESSE, '(adresse)'));
  /* ⛔ « [lea] [camille] » AU LIEU DE « @lea @camille » (examen du 27 octobre 2026, 23 h 36, scénario 5) : Victor recopiait l'étiquette du fil (« [Léa a écrit…] »)
     au lieu de citer ses collègues. Un nom de l'équipe entre crochets devient la citation qu'il voulait faire ; rien d'autre n'est touché. */
  const parNom = new Map(); for (const x of agents.AGENTS) { parNom.set(x.id.toLowerCase(), x.id); parNom.set(String(x.nom || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(), x.id); }
  const crochets = t => String(t || '').replace(/\[([A-Za-zÀ-ÿ]{2,20})\]/g, (m, n) => { const k = parNom.get(n.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()); return k ? '@' + k : m; });
  const nettoyer = t => masquer(t).replace(/\s+/g, ' ').trim().slice(0, MESSAGE_MAX);
  const court = (t, n) => { t = String(t || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1) + '…' : t; };
  /* couper à ≤ n caractères, à une fin de phrase si l'on en trouve une passé le tiers (sinon au dernier mot) : la réponse brève d'un @tous */
  const coupe = (t, n) => {
    t = String(t || '').replace(/\s+/g, ' ').trim();
    if (t.length <= n) return t;
    const tete = t.slice(0, n), fin = Math.max(tete.lastIndexOf('. '), tete.lastIndexOf('! '), tete.lastIndexOf('? '));
    if (fin >= Math.floor(n / 3)) return tete.slice(0, fin + 1);
    const mot = tete.lastIndexOf(' ');
    return (mot >= Math.floor(n / 3) ? tete.slice(0, mot) : tete.slice(0, n - 1)) + '…';
  };
  /* ce qu'on met dans le prompt vient de messages ou de tâches : pas d'accolade, qui ferait passer une phrase pour une ligne de faits */
  const affichable = (t, n) => court(masquer(t).replace(/[{}]/g, ' '), n);
  const filsDe = id => [id, ...GROUPES.filter(g => conversations.estMembre(id, g))];
  const colleguesPassables = id => ids.filter(x => x !== id && !SANS_CONSIGNE_LIBRE.includes(x));

  /* ── le prompt ── */
  function systemDe(id, mode) {
    const a = registre.get(id), r = ROLES[id];
    /* Les collègues sont donnés par leur IDENTIFIANT (« lea », « camille »), qui est aussi ce qu'on écrit après le « @ » : le prompt ne porte ainsi
       aucun prénom d'agent, qui pourrait être celui d'un client (le banc de Hugo cherche « Léa » dans tout ce qui part chez Claude). */
    const collegues = agents.AGENTS.filter(x => x.id !== id).map(x => x.id + ' (' + x.role + ')').join(', ');
    return 'Tu es ' + a.nom + ', l’agent « ' + a.role + ' » de Team OP. ' +
      'Team OP édite deux applications pour les entreprises de terrain (nettoyage, lutte anti-nuisibles) : OP GESTION, la gestion des interventions — planning, interventions et rapports PDF, contrats d’entretien, clients, devis et factures, stock, pointage — et OP MESSAGES, la messagerie, bientôt disponible. ' +
      'Tu parles à Justin, le fondateur, que tu tutoies comme un collègue, en français, avec des phrases courtes et concrètes. Tu fais partie d’une vraie équipe ; tes collègues (identifiant, rôle) : ' + collegues + '.\n' +
      r.mission + '\n' +
      'Ton caractère : ' + PERSO[id] + '\n' +
      'Règles :\n' +
      '- Tu ne peux RIEN exécuter en dehors de tes outils : aucun geste sur un client, un paiement ou un accès. Tout autre geste passe par une demande que Justin valide dans la Tour. Tu ne promets jamais d’avoir fait ce que tu n’as pas fait, ni de faire ce qu’aucun de tes outils ne fait : si tu ne peux pas, tu le dis et tu dis ce qu’il faudrait.\n' +
      '- Un sujet que tu as toi-même déclaré clos dans ce fil, tu ne le relances pas : seul un nouveau message de Justin le rouvre.\n' +
      (r.rien ? '- ' + r.rien + '\n' : '') +
      '- Tu ne cites que les faits du bloc Faits ci-dessous. Si tu ne sais pas, tu le dis : tu n’inventes ni chiffre, ni nom, ni date.\n' +
      '- Ne répète jamais une adresse électronique ni un numéro de téléphone.\n' +
      '- Réponse courte : 600 caractères au plus, concrète, comme un collègue qui parle — sans titre ni liste à puces, sans formule toute faite.\n' +
      '- Les messages sans crochet sont ceux de Justin ; ceux qui commencent par « [Nom a écrit dans le fil …] » sont ceux de tes collègues.\n' +
      '- Dans un groupe, quand des collègues ont déjà répondu : tu apportes ce qui est PROPRE à ton rôle, avec tes mots. Tu n’approuves pas un collègue (« je plussoie », « je confirme ce que dit… », « d’accord avec… ») et tu ne reprends pas sa tournure d’ouverture (« Côté … »). Si tu n’as rien de propre à ajouter à une question posée à tous, tu réponds exactement « RAS ».\n' +
      '- Une question reçoit TA réponse, à toi qui es interrogé : tu ne la passes jamais à un collègue. Un message qui te cite n’est pas forcément une tâche : tu lis, tu comprends, et tu décides — répondre, prendre le travail, ou demander une précision.\n' +
      '- Un TRAVAIL que Justin te confie (« prépare », « fais », « rédige », « trouve », avec ou sans délai) se prend : outil prendre, même s’il te manque une information. Tu dis alors ce qui te manque et tu poses ta question DANS LE MÊME message — prendre le travail et demander une précision ne s’excluent pas. Tu ne réponds jamais à un travail de Justin par une question seule.\n' +
      '- Tu réponds toujours par un message, même court, avant ou avec tes outils. Une seule exception : un COLLÈGUE te cite seulement pour t’informer (une décision prise, un merci, « rien ne change pour toi ») et tu n’as rien à ajouter — tu réponds alors exactement « RAS » et rien d’autre ; tes outils, eux, s’appliquent. Pour parler à un collègue, cite-le dans ton message avec @ suivi de son identifiant (par exemple @lea) : c’est ainsi qu’il le lit. @tous cite tout le fil.\n' +
      '- Outil prendre : tu acceptes un travail, il devient ta tâche. Outil terminer : c’est fait. Outil passer : seulement si tu es vraiment chargé (une autre tâche en cours) et à un collègue libre, jamais Hugo ni Margaux, et tu en dis la raison ; un collègue libre peut aussi proposer de prendre une tâche d’un collègue chargé. Dès que tu aurais trois tâches en cours ou plus (le nouveau travail compris) et qu’un collègue est libre (voir « Charge de l’équipe »), tu ne gardes pas tout : dans la même réponse, tu passes à ce collègue celle de tes tâches déjà en cours qui lui va le mieux (outil passer, son identifiant est entre crochets dans « Tes tâches en cours »), avec la raison, et tu le dis. Outil demander_justin : une décision qui lui revient.\n' +
      '- Hugo et Margaux (l’argent, les accès) ne reçoivent de travail en texte libre que de Justin. Une QUESTION fermée n’est pas un travail : « le dossier DOS-… a-t-il payé ? », tu la leur poses toi-même en les citant (@hugo, @margaux), ils te répondent. Quand Justin te demande de poser une question à un collègue, tu la poses toi-même DANS CE FIL, dans ta réponse, en le citant (pas avec l’outil ecrire dans un autre fil) : il te répond ici, et Justin lit sa réponse.\n' +
      (id === 'victor' ? '- Tu vois la charge de chacun : si un collègue est débordé et qu’un autre est libre, tu peux redistribuer avec l’outil passer, et tu le dis dans le fil. Quand deux collègues ne sont pas d’accord (ou qu’on te demande de trancher), tu arbitres avec l’outil arbitrer : une décision écrite ; ce qui touche à l’argent, un contrat, un accès ou des données est à Justin, tu lui poses la question avec pour_justin.\n' : '') +
      memoire(id) + modeDe(id, mode);
  }
  /* Le complément d'un réveil particulier. Le texte est écrit ICI, jamais composé d'après un message. */
  function modeDe(id, mode) {
    if (mode === 'tous') return '\nCE RÉVEIL-CI : Justin a écrit à TOUTE l’équipe (un « point », une question posée à tous). Réponds UNE fois, en ' + TOUS_CARS + ' caractères au plus, avec ce qui est vrai pour toi (tes tâches, tes faits) ; ne cite personne, ne prends aucune tâche, n’utilise aucun outil. Si tu n’as rien de neuf, écris exactement « RAS ».';
    if (mode === 'synthese') return '\nCE RÉVEIL-CI : tu es le chef d’équipe et Justin a écrit à toute l’équipe ; tes collègues viennent de répondre (tu les lis tous ci-dessus). Écris UNE synthèse de cinq lignes au plus : ce qui avance, ce qui bloque, ce qui revient à Justin. Tu ne re-cites pas tout le monde ; si un point demande une action, tu la confies à quelqu’un avec l’outil assigner (ou demander).';
    if (mode === 'arbitre') return '\nCE RÉVEIL-CI : deux collègues se répondent depuis plusieurs messages sans que rien n’ait avancé (aucune tâche prise, passée ou terminée). Tranche : outil arbitrer si c’est un désaccord, outil assigner pour confier le travail à quelqu’un, ou une question à Justin (demander_justin) si cela dépasse l’équipe. Dis-le en une phrase.';
    return '';
  }

  /* Des NOMS et des NOMBRES : qui a du travail en cours. Écrit avant le bloc Faits, qui reste la dernière chose du prompt. */
  function blocCharge() {
    let ch = null; try { ch = agents.charge ? agents.charge() : null; } catch (e) { ch = null; }
    if (!ch) return '\nCharge de l’équipe : illisible — tu ne passes aucun travail à personne tant que tu ne la connais pas.';
    const occupes = ids.filter(x => ch[x] > 0).map(x => x + ' ' + ch[x]);
    const libres = ids.filter(x => !(ch[x] > 0));
    return '\nCharge de l’équipe (tâches en cours, relevé du serveur) — occupés : ' + (occupes.join(', ') || 'personne') + ' ; libres : ' + (libres.join(', ') || 'personne') + '.';
  }
  function blocTaches(id) {
    let l = []; try { l = agents.tachesDe ? agents.tachesDe(id) : []; } catch (e) { l = []; }
    let txt = '\nTes tâches en cours :' + (l.length ? '' : ' aucune.');
    for (const t of l.slice(0, 10)) txt += '\n- [' + t.id + '] ' + (t.type === 'consigne' ? '« ' + affichable(t.texte, 200) + ' »' : 'demande « ' + t.type + ' »') + ' — demandée par ' + (t.de === 'justin' ? 'Justin' : t.de);
    if (id === 'victor') {
      txt += '\nTâches en cours de l’équipe (pour redistribuer) :';
      let n = 0;
      for (const x of ids) { if (x === 'victor') continue; let lx = []; try { lx = agents.tachesDe(x); } catch (e) { lx = []; } for (const t of lx) if (t.type === 'consigne' && n++ < 30) txt += '\n- [' + t.id + '] ' + x + ' : « ' + affichable(t.texte, 100) + ' »';
      }
      if (!n) txt += ' aucune.';
    }
    return txt;
  }

  async function lire(f, ...args) {
    if (typeof faits[f] !== 'function') return null;
    try { const r = await faits[f](...args); return r == null ? null : fermer(r); } catch (e) { return null; }
  }
  /* Les dossiers que Justin cite DEPUIS LA DERNIÈRE RÉPONSE de l'agent (huit messages au plus), du plus récent au plus ancien : les faits suivent ce qu'on
     lui demande maintenant, pas ce qu'on lui a demandé il y a une heure. */
  function dossiersCites(fil, id) {
    const vus = [];
    const recents = conversations.lire(fil, 8).reverse();
    for (const m of recents) {
      if (m.de === id) break;
      /* Justin, OU un collègue : un numéro de dossier est une forme fermée (DOS- et six chiffres), et ce qu'on en lit ce sont des faits fermés — « tel client a-t-il payé ? » posé
         par Camille reçoit la réponse de Hugo (23 octobre 2026). Une ligne du système n'est à personne. */
      if (m.de === 'systeme') continue;
      for (const n of (String(m.texte).toUpperCase().match(/DOS-\d{6}/g) || [])) if (!vus.includes(n) && vus.length < DOSSIERS_MAX) vus.push(n);
    }
    return vus;
  }
  async function blocFaits(id, fil) {
    const voulus = ROLES[id].faits;
    if (!voulus.length) return '\nBloc Faits : aucun fait n’est fourni à ton rôle — tu ne connais que ta mission ; pour tout chiffre ou toute donnée, tu dis que tu ne sais pas.';
    const lignes = [];
    for (const f of voulus) {
      if (f === 'dossier' || f === 'facture') {
        const nums = dossiersCites(fil, id);
        if (!nums.length) { lignes.push(f + ' : aucun dossier cité, tu n’as aucun fait client sous les yeux'); continue; }
        for (const n of nums) { const r = await lire(f, n); lignes.push(f + ' ' + n + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r)); }
        continue;
      }
      const r = await lire(f);
      lignes.push(f + ' ' + JSON.stringify(r === null ? { lecture: 'impossible' } : r));
    }
    return '\nBloc Faits (relevés par le serveur à l’instant — ta seule source de chiffres ; « lecture impossible » veut dire que tu ne sais pas) :\n' + lignes.join('\n');
  }

  /* Le fil en messages pour Claude : `user` (Justin sans crochet ; un collègue, nommé) et `assistant` (l'agent), consécutifs fusionnés, jamais un
     `assistant` en tête, TOUJOURS un `user` à la fin. Les lignes du système n'y sont pas : elles ne sont à personne. */
  function messagesDe(fil, id, d, n) {
    const prefixe = de => (de === 'systeme' ? '[Le système a écrit dans le fil ' : '[' + nomDe(de) + ' a écrit dans le fil ') + nomFil(fil) + '] ';
    const brut = [];
    /* les annonces de fin de travail (`fait`) ne sont pas de la conversation : elles ne chassent pas le vrai fil de la fenêtre que Claude lit */
    for (const m of conversations.lire(fil, 50).filter(x => x.de !== 'systeme' && x.fait !== true).slice(-(n || HISTORIQUE_N))) {
      const t = nettoyer(m.texte); if (!t) continue;
      if (m.de === id) brut.push({ role: 'assistant', texte: t });
      else if (m.de === 'justin') brut.push({ role: 'user', texte: t });
      else brut.push({ role: 'user', texte: prefixe(m.de) + t });
    }
    while (brut.length && brut[0].role === 'assistant') brut.shift();
    if (!brut.length || brut[brut.length - 1].role !== 'user') { const t = nettoyer(d.texte); if (t) brut.push({ role: 'user', texte: d.de === 'justin' ? t : prefixe(d.de) + t }); }
    const messages = [];
    for (const m of brut) {
      const dernier = messages[messages.length - 1];
      if (dernier && dernier.role === m.role) dernier.content += '\n' + m.texte; else messages.push({ role: m.role, content: m.texte });
    }
    return messages;
  }

  /* L'identifiant d'une tâche, tel que le modèle l'écrit : parfois avec ses crochets ou ses guillemets, parfois dans une autre casse. Rien d'autre n'est reconnu —
     un intitulé ne désigne pas une tâche (le schéma offre la liste fermée des identifiants : `champTache`, dans `outilsDe`). `equipe` : Victor, toute l'équipe. */
  function resoudreTache(id, ref, equipe) {
    const brut = String(ref || '').trim().replace(/^[\[«"'“\s]+|[\]»"'”\s.]+$/g, '');
    if (!brut) return '';
    let l = [];
    try { l = agents.tachesDe(id).slice(); if (equipe) for (const x of ids) if (x !== id) l = l.concat(agents.tachesDe(x)); } catch (e) { return brut; }
    const t = l.find(x => x.id === brut) || l.find(x => String(x.id).toLowerCase() === brut.toLowerCase());
    return t ? t.id : brut;
  }
  /* Les identifiants offerts au schéma : SES tâches en cours (celles de toute l'équipe pour Victor, qui redistribue). */
  function tachesOffertes(id) {
    let l = [];
    try { l = agents.tachesDe(id).slice(); if (id === 'victor') for (const x of ids) if (x !== id) l = l.concat(agents.tachesDe(x).filter(t => t.type === 'consigne')); } catch (e) { l = []; }
    return l.map(t => t.id);
  }

  const journal = (id, action, resultat, detail) => { try { agents.noter(id, action, { cible: 'conversation', resultat, detail }); } catch (e) {} };
  const dire = (fil, texte, o) => { try { return conversations.systeme(fil, texte, o); } catch (e) { return { ok: false, raison: 'erreur' }; } };

  /* Un agent qui ne peut pas être réveillé : la raison que Justin peut lever se dit, UNE fois par heure. Les autres (agent inconnu, état illisible) se taisent. */
  function signalerArret(id, fil, raison) {
    if (raison === 'arret') dire(fil, nomDe(id) + ' est à l’arrêt : allume-le dans la page Agents.', { cle: 'arret:' + id, parHeure: true });
    else if (raison === 'pause') dire(fil, 'Les agents sont en pause : reprends-les dans la page Agents.', { cle: 'pause', parHeure: true });
    /* HORS DES HEURES DE TRAVAIL (26 octobre 2026) : le message de Justin n'est pas perdu dans le vide — on lui dit pourquoi personne ne répond, et quand ils reprennent. */
    else if (raison === 'hors_heures') {
      let o = null; try { o = typeof agents.ouverture === 'function' ? agents.ouverture(id) : null; } catch (e) { o = null; }
      dire(fil, nomDe(id) + ' est hors des heures de travail' + (o && o.libelle ? ' : il reprend ' + o.libelle : '') + '. « Ouvrir maintenant » (page Agents, Horaires) le fait travailler tout de suite.', { cle: 'hors_heures:' + id, parHeure: true });
    }
    else if (raison === 'horaires_illisibles') dire(fil, 'Les horaires des agents sont illisibles : tous les agents restent à l’arrêt tant que le registre n’est pas réparé.', { cle: 'horaires_illisibles', parHeure: true });
  }

  /* ── les outils, exécutés et VALIDÉS ici ── */
  function executer(id, a, c) {
    const e = a && a.entree && typeof a.entree === 'object' ? a.entree : {};
    const str = k => typeof e[k] === 'string' ? e[k] : '';
    const refus = (raison, ligne) => { journal(id, 'outil ' + a.nom, 'refuse', raison); if (ligne) dire(c.fil, ligne); return { ok: false, raison }; };
    const bon = (detail) => { journal(id, 'outil ' + a.nom, 'ok', detail); return { ok: true }; };
    const nom = nomDe(id);
    if (a.nom === 'ecrire') {
      const fil = str('fil');
      if (!filsDe(id).includes(fil)) return refus('fil');
      /* ⛔ UNE RÉPONSE, UN MESSAGE (examen du 27 octobre 2026 à 12 h 19, scénario 5) : Victor tranchait dans sa réponse, puis l'outil ecrire redisait la décision
         DANS LE MÊME FIL (« @lea @camille Tranché : on combine… ») — deux messages pour un seul réveil, que l'examen lit comme un Victor qui se répète. Sa
         réponse est déjà dans ce fil : un ecrire vers CE fil, après elle, ne s'écrit pas. Vers un AUTRE fil, il reste permis (c'est son rôle). */
      if (fil === c.fil && c.dejaDit) return refus('deja_dit_ici');
      const t = raccourcir(masquer(str('texte')));
      if (!t) return refus('texte');
      const r = conversations.parler(id, fil, t, { niveau: 'info', prof: c.prof });
      return r.ok ? bon(fil) : refus(r.raison);
    }
    if (a.nom === 'prendre') {
      const t = court(masquer(str('texte')).replace(/\s+/g, ' ').trim(), 500);
      if (!t) return refus('texte');
      const r = agents.consigner(c.d.de, id, t);
      if (r.ok) { dire(c.fil, nom + ' a pris « ' + court(t, 90) + ' »'); return bon('consigne'); }
      const motif = { consigne_libre_refusee: 'seul Justin donne une consigne libre à ' + nom, trop_de_taches: nom + ' a déjà trop de tâches en cours', doublon: nom + ' l’a déjà en cours' }[r.raison] || r.raison;
      return refus(r.raison, r.raison === 'doublon' ? '' : nom + ' ne peut pas prendre « ' + court(t, 90) + ' » : ' + motif + '.');
    }
    if (a.nom === 'passer') {
      const vers = str('vers'), tache = resoudreTache(id, str('tache'), id === 'victor'), raison = court(masquer(str('raison')).replace(/\s+/g, ' ').trim(), 150);
      let avant = null; try { avant = agents.tachesDe(id).find(t => t.id === tache) || null; } catch (x) {}
      if (!avant && id === 'victor') { for (const x of ids) { try { avant = agents.tachesDe(x).find(t => t.id === tache) || avant; } catch (y) {} } }
      const r = agents.passerConsigne(id, tache, vers);
      const q = avant && avant.texte ? '« ' + court(avant.texte, 90) + ' »' : 'une tâche';
      if (r.ok) {
        dire(c.fil, (r.de === id ? nom + ' a passé ' + q + ' à ' + nomDe(vers) : nom + ' a confié ' + q + ' de ' + nomDe(r.de) + ' à ' + nomDe(vers)) + (raison ? ' : ' + raison : '') + '.');
        return bon(r.de + ' → ' + vers);
      }
      return refus(r.raison, nom + ' voulait passer ' + q + ' à ' + (registre.has(vers) ? nomDe(vers) : 'un collègue inconnu') + ' : refusé, ' + (MOTIFS_PASSER[r.raison] || r.raison) + '.');
    }
    if (a.nom === 'terminer') {
      const tache = resoudreTache(id, str('tache'), false), resume = court(masquer(str('resume')).replace(/\s+/g, ' ').trim(), 200);
      let avant = null; try { avant = agents.tachesDe(id).find(t => t.id === tache) || null; } catch (x) {}
      if (!avant || !agents.terminer(tache, id, 'ok', resume)) return refus('tache');
      dire(c.fil, nom + ' a terminé ' + (avant.texte ? '« ' + court(avant.texte, 90) + ' »' : 'une tâche') + (resume ? ' : ' + resume : '') + '.');
      return bon('terminee');
    }
    if (outilsPropres(id).some(t => t.name === a.nom) && typeof propres[id].executer === 'function') {
      /* un outil PROPRE : son module le valide et l'exécute (asynchrone) ; le résultat est journalisé ici, et sa phrase éventuelle dite dans le fil par le système */
      return Promise.resolve().then(() => propres[id].executer(a.nom, e, { fil: c.fil, de: c.d.de, texte: String(c.d.texte || ''), prof: c.prof })).then(x => {
        x = x && typeof x === 'object' ? x : { ok: false, raison: 'erreur' };
        if (x.ligne) dire(c.fil, x.ligne);
        return x.ok ? bon(a.nom) : refus(String(x.raison || 'refus'));
      });
    }
    if (a.nom === 'arbitrer' && id === 'victor' && typeof ctx.arbitrer === 'function') {
      const r = ctx.arbitrer(e, { fil: c.fil, prof: c.prof });
      if (r && r.ok) return bon(r.attendJustin ? 'question à Justin' : 'décision');
      return refus((r && r.raison) || 'arbitrage', nomDe(id) + ' voulait arbitrer : refusé' + ({ deux_agents: ', il faut deux collègues', decision: ', il faut une décision', arret: '', memoire_illisible: ', sa mémoire est illisible', ecriture: ', la décision n’a pas pu être écrite' }[r && r.raison] || '') + '.');
    }
    if (a.nom === 'demander_justin') {
      const q = raccourcir(masquer(str('question')));
      if (!q) return refus('texte');
      const r = conversations.parler(id, id, q, { niveau: 'important', prof: c.prof });
      return r.ok ? bon('question') : refus(r.raison);
    }
    return refus('outil_inconnu');
  }

  /* Une réponse que `parler` REFUSE ne se perd pas en silence (23 octobre 2026, campagne de vérification de la Tour) : le même texte déjà dit dans ce fil depuis 24 h, par exemple. Justin
     posait sa question, « X écrit… » s'éteignait, et rien ne venait : ni réponse ni raison. Une ligne du système, UNE fois par heure pour chaque cause.
     ⛔ MAIS PLUS UNE LIGNE « LIMITE DE MESSAGES PAR HEURE » (28 octobre 2026, Justin : « La limite de messages par heure, c'est pas normal ») : « X a atteint sa limite de messages par heure », « ce fil a
     atteint la limite… » n'existent plus dans le fil. Un message de Justin a désormais une RACINE et un budget (`conversations.js`) ; ce qui n'en a pas (un agent qui s'emballe SEUL) s'arrête toujours sur les
     plafonds d'avant, mais en silence pour Justin : une ligne de journal et un compteur (`refus()`, lu par /health) — c'est une alarme d'exploitation, pas un message à lire. Ce qui reste visible, une ligne par
     cause : le budget en dollars (`echec`), une racine close (`refusAvant`), un ping-pong (`surMessage`), un agent fermé, en pause ou à l'arrêt (`signalerArret`). */
  const REFUS_DIT = {
    doublon: nom => nom + ' vient de dire exactement la même chose dans ce fil : relis plus haut, ou reformule ta question.',
  };
  const REFUS_SILENCIEUX = { trop_de_messages: 'horaire', trop_de_messages_fil: 'horaire' };
  const refusCompte = { horaire: [], chaine: [] };
  function compter(genre) { const l = refusCompte[genre]; l.push(Date.now()); while (l.length > 500) l.shift(); }
  /* Des NOMBRES de la dernière heure, pour /health : ni agent, ni fil, ni texte. */
  function refus() { const lim = Date.now() - 3600000; return { horaire: refusCompte.horaire.filter(t => t > lim).length, chaine: refusCompte.chaine.filter(t => t > lim).length }; }
  function refusDit(id, fil, raison) {
    if (Object.prototype.hasOwnProperty.call(REFUS_SILENCIEUX, raison)) { compter(REFUS_SILENCIEUX[raison]); journal(id, 'refus horaire', 'refuse', raison); return; }
    const f = REFUS_DIT[raison]; if (!f) return;
    dire(fil, f(nomDe(id)), { cle: 'refus:' + raison + ':' + id + ':' + fil, parHeure: true });
  }
  /* Le contrôle fait AVANT l'appel payant (`conversations.peutParler`) : ce que Justin doit savoir, une fois. Une racine close : UNE ligne par racine ; l'agent qui a assez parlé dans la racine, ou un plafond
     horaire (hors racine) : le journal et le compteur seulement. */
  function refusAvant(id, fil, pp, prof) {
    if (pp.raison === 'racine_close' && pp.racine) {
      compter('chaine'); journal(id, 'racine close', 'refuse', pp.raison);
      dire(fil, 'L’échange lancé par ton message est clos (' + pp.racine.messages + ' messages) : réécris pour le reprendre.', { cle: 'chaine:' + pp.racine.id, unique: true });
    } else if (pp.raison === 'racine_agent') { compter('chaine'); journal(id, 'racine : assez parlé', 'refuse', pp.raison); }
    else if (Object.prototype.hasOwnProperty.call(REFUS_SILENCIEUX, pp.raison)) refusDit(id, fil, pp.raison);
    return { saute: pp.raison };
  }

  /* Pourquoi Claude n'a pas répondu, quand Justin peut le lever ou doit le savoir. Dans le fil privé de l'agent, c'est lui qui le dit ; dans un
     groupe, une ligne du système (une fois par heure) : quinze « je ne peux pas répondre » ne noient pas le fil. */
  function echec(id, fil, raison, prof) {
    if (Object.prototype.hasOwnProperty.call(CAUSES, raison)) {
      if (fil === id) { try { conversations.parler(id, fil, 'Je ne peux pas te répondre pour l’instant (' + CAUSES[raison] + ').', { niveau: 'important', prof }); } catch (e) {} }
      else dire(fil, nomDe(id) + ' ne peut pas répondre pour l’instant (' + CAUSES[raison] + ').', { cle: 'panne:' + id + ':' + raison, parHeure: true });
    }
    return { saute: raison };
  }

  /* DÉJÀ LU (24 octobre 2026, examen) : Victor, cité par Justin PUIS par Léa dans le même fil, recevait deux réveils — il tranchait, puis tranchait une seconde fois
     (« Je l'ai déjà tranché… »). `vus` retient, par fil et par agent, le dernier message que l'agent avait sous les yeux quand il a répondu ; un réveil pour un message
     qu'il avait DÉJÀ lu à ce moment-là n'a plus rien à lui apprendre : il se tait, sans appeler Claude. (L'ordre des messages, pas l'heure : une réponse partie pendant
     qu'un nouveau message arrivait ne l'avait pas lu, et ce nouveau message la réveille bien.) */
  const vus = new Map();
  function dejaLu(id, d) {
    const k = vus.get(d.fil + ':' + id); if (!k || !d.id) return false;
    const recents = conversations.lire(d.fil, 50), iD = recents.findIndex(x => x.id === d.id), iV = recents.findIndex(x => x.id === k);
    return iD >= 0 && iV >= iD;
  }

  /* ── un réveil : lire, réfléchir, répondre dans CE fil, agir par les outils ── */
  /* `mode` : '' (un réveil ordinaire), 'tous' (la réponse brève à un @tous), 'synthese' (Victor, une fois les réponses reçues), 'arbitre' (Victor, deux collègues qui se répondent à vide).
     La RACINE (`d.racine`) est REVALIDÉE ici contre le registre : ce que le message porte n'est jamais cru. Un réveil d'une racine née avant la fermeture de l'agent finit dans les 45 minutes qui
     suivent (`agents.sousRacine` : l'agent « agit hors des heures » MAIS le dit, donc aucune porte qui écrit à un client ne s'ouvre). */
  async function reveiller(id, d, mode) {
    const rac = d && d.racine ? conversations.racine(d.racine) : null;
    const tolere = !!(rac && rac.age < RACINE.HORS_HEURES_MS && typeof agents.sousRacine === 'function' && typeof agents.ouvertA === 'function' && agents.ouvertA(id, rac.ts));
    return tolere ? agents.sousRacine(() => reveillerDans(id, d, mode || '', rac)) : reveillerDans(id, d, mode || '', rac);
  }
  async function reveillerDans(id, d, mode, rac) {
    const fil = d.fil;
    if (!IDS.has(id)) return { saute: 'pas_de_cerveau' };
    const p = agents.peutAgir(id);
    if (!p.ok) { signalerArret(id, fil, p.raison); return { saute: p.raison };  /* à l'arrêt : ni faits, ni Claude, ni mot */ }
    if (!mode && dejaLu(id, d)) return { saute: 'deja_lu' };
    const messages = messagesDe(fil, id, d, mode === 'synthese' ? HISTORIQUE_SYNTHESE : HISTORIQUE_N);
    if (!messages.length) return { saute: 'vide' };
    const lus = conversations.lire(fil, 50), dernierLu = lus.length ? lus[lus.length - 1].id : null;
    const prof = (Number(d.prof) || 0) + 1;
    const racineId = rac ? rac.id : '';
    /* ⛔ LE CONTRÔLE AVANT LE PAIEMENT : tout ce que `parler` refuserait à l'écriture est connu MAINTENANT, avant l'appel à Claude. Avant le 28 octobre 2026, la réponse était payée puis jetée
       (« trop_de_messages ») — Justin voyait « limite atteinte » après avoir payé l'appel qui ne servirait à rien. */
    const pp = conversations.peutParler(id, fil, { racine: racineId, prof });
    if (!pp.ok) return refusAvant(id, fil, pp, prof);
    /* ce que ce réveil a coûté : chaque appel à Claude entre dans le budget en dollars de la racine, et le message écrit le porte (un redémarrage retrouve la somme) */
    let cout = 0;
    const penser = async (agent, system, msgs, opts) => {
      const x = await cerveau.penser(agent, system, msgs, Object.assign({}, opts, { racine: !!rac }));
      if (x && typeof x.cout === 'number' && Number.isFinite(x.cout)) { cout += x.cout; if (rac) conversations.racineDepense(rac.id, x.cout); }
      return x;
    };
    /* une relance (un second appel) ne part que si la racine tient encore : on ne paie pas pour un message qui sera refusé */
    const encoreOk = () => conversations.peutParler(id, fil, { racine: racineId, prof }).ok;
    const parle = (texte, niveau) => conversations.parler(id, fil, texte, { niveau: niveau || 'info', prof, racine: racineId, cout, sansReveil: mode === 'tous' || mode === 'synthese' });
    conversations.ecrit(fil, id, true);
    try {
      const system = systemDe(id, mode) + blocCharge() + blocTaches(id) + await blocFaits(id, fil);
      const outils = mode === 'tous' ? [] : outilsDe(id, { fils: filsDe(id), collegues: colleguesPassables(id), taches: tachesOffertes(id), propres: outilsPropres(id), arbitre: id === 'victor' && typeof ctx.arbitrer === 'function' });
      const r = await penser(id, system, messages, mode === 'tous' ? { outils, reflechir: false, maxTokens: TOUS_JETONS } : { outils, reflechir: true });
      if (!r.ok) return echec(id, fil, r.raison, prof);
      if (dernierLu) { vus.set(fil + ':' + id, dernierLu); if (vus.size > 2000) vus.clear(); }
      const sortie = { repondu: false, actions: [] };
      /* « RAS » à un COLLÈGUE qui ne faisait qu'informer (une décision, un merci) : rien n'est écrit — sinon chaque décision de Victor appelait un « Bien noté » de
         chacun (examen du 24 octobre). À Justin, un « RAS » s'écrit tel quel : une question de lui ne reste jamais sans trace. */
      /* « RAS » à une question posée à TOUS (@tous, @équipe) : rien n'est écrit non plus — les collègues qui ont à dire répondent, la question a sa trace. */
      const aTous = d.de === 'justin' && /(^|[\s,(])@(?:tous|[ée]quipe)\b/i.test(String(d.texte || ''));
      let texteFinal = r.texte;
      if (mode === 'tous' && texteFinal && !RAS.test(texteFinal)) texteFinal = coupe(texteFinal, TOUS_CARS);
      if (!mode && texteFinal && !RAS.test(texteFinal) && conversations.membres(fil).length > 1) {
        const lus2 = conversations.lire(fil, 50), i0 = d.id ? lus2.findIndex(x => x.id === d.id) : -1;
        const autres = i0 < 0 ? [] : lus2.slice(i0 + 1).filter(x => x.de !== id && x.de !== 'justin' && x.de !== 'systeme').map(x => String(x.texte || ''));
        const tic = ticDeGroupe(texteFinal, autres);
        if (tic) {
          const suite = messages.map(m => Object.assign({}, m)), fin = suite[suite.length - 1];
          const relance = 'Ta réponse ne passe pas : ' + tic + '. Réécris-la, sans outil, en apportant ce qui est propre à ton rôle, avec tes mots et une autre ouverture. Si tu n’as rien de propre à ajouter, réponds exactement « RAS ».\n\nTa réponse refusée : « ' + affichable(texteFinal, 600) + ' »';
          if (fin && fin.role === 'user') fin.content += '\n\n' + relance; else suite.push({ role: 'user', content: relance });
          let r3 = null;
          try { r3 = encoreOk() ? await penser(id, system, suite, { reflechir: true }) : null; } catch (err) { r3 = null; }
          if (r3 && r3.ok && r3.texte && (RAS.test(r3.texte) || !ticDeGroupe(r3.texte, autres))) texteFinal = r3.texte;
          else if (aTous) texteFinal = 'RAS';   /* à une question posée à tous, un tic qui résiste à la redemande se tait : les autres ont répondu */
        }
      }
      /* ⛔ « RAS » À JUSTIN QUI TE CITE (examen du 27 octobre 2026, 23 h 36, scénario 5 : « @Camille préfère une seule relance au bout de 7 jours. @Victor, tranche. »
         — Camille répondait « RAS », publié tel quel ; sa position n'était jamais défendue, et Victor tranchait sans elle). Justin qui cite un agent attend sa
         réponse : UNE redemande, sans outil ; si l'agent persiste, son « RAS » s'écrit comme avant (une question de Justin ne reste jamais sans trace). */
      if (!mode && texteFinal && RAS.test(texteFinal) && d.de === 'justin' && !aTous) {
        const suite = messages.map(m => Object.assign({}, m)), fin = suite[suite.length - 1];
        const relance = 'Justin t’a cité directement : il attend TA réponse, pas « RAS ». Si son message t’attribue un avis ou une position, défends-la ou nuance-la en une à trois phrases, avec tes raisons, en t’adressant à ceux qu’il a cités (@ suivi de leur identifiant). Sinon, dis en une phrase ce qui te concerne.';
        if (fin && fin.role === 'user') fin.content += '\n\n' + relance; else suite.push({ role: 'user', content: relance });
        let r4 = null;
        try { r4 = encoreOk() ? await penser(id, system, suite, { reflechir: true }) : null; } catch (err) { r4 = null; }
        if (r4 && r4.ok && r4.texte && !RAS.test(r4.texte)) texteFinal = r4.texte;
      }
      if (texteFinal && RAS.test(texteFinal) && (d.de !== 'justin' || aTous || mode)) sortie.ras = true;
      else if (texteFinal) {
        const dit = parle(mode === 'tous' ? coupe(masquer(crochets(texteFinal)), TOUS_CARS) : raccourcir(masquer(crochets(texteFinal))));
        if (dit.ok) sortie.repondu = true; else { sortie.saute = dit.raison; if (dit.raison === 'racine_close') refusAvant(id, fil, conversations.peutParler(id, fil, { racine: racineId }), prof); else refusDit(id, fil, dit.raison); }
      }
      for (const a of (mode === 'tous' ? [] : Array.isArray(r.actions) ? r.actions : []).slice(0, ACTIONS_MAX)) {
        let x; try { x = await executer(id, a, { fil, d, prof, dejaDit: sortie.repondu, racine: racineId }); } catch (err) { journal(id, 'outil ' + a.nom, 'erreur', 'exception'); x = { ok: false, raison: 'erreur' }; }
        sortie.actions.push({ nom: a.nom, ok: x.ok, raison: x.raison, ici: !!(x.ok && ((a.nom === 'ecrire' && a.entree && a.entree.fil === fil) || (a.nom === 'demander_justin' && fil === id))) });
      }
      /* ⛔ DES OUTILS ET PAS UN MOT À JUSTIN (examen du 24 octobre 2026, scénario 4) : priée de demander à Hugo et de rapporter sa réponse, Camille n'a rien dit
         dans le fil de Justin — un seul appel d'outil, la question écrite dans un AUTRE fil. Justin ne voyait rien, et Hugo, cité ailleurs, répondait à côté. Une
         règle du prompt (« tu réponds toujours par un message ») ne suffisait pas : quand JUSTIN écrit et que l'agent n'a rendu que des outils, UN second appel,
         SANS outil (rien ne s'exécute deux fois), lui demande son message pour CE fil. Comme les réunions (`parole`, reunions.js). */
      /* (relecture du gardien) pas de relance si un outil a DÉJÀ écrit dans ce fil — elle doublerait le message ; et elle voit le résultat de chaque outil, et
         l'état d'APRÈS (charge, tâches) : sinon elle décrirait un travail passé comme s'il était encore à faire. */
      if (!r.texte && d.de === 'justin' && sortie.actions.length && !sortie.saute && !sortie.actions.some(a => a.ici)) {
        const faits = sortie.actions.map(a => a.nom + (a.ok ? ' : fait' : ' : refusé (' + (MOTIFS_PASSER[a.raison] || a.raison || 'refus') + ')')).join(' ; ');
        let systemApres = system; try { systemApres = systemDe(id, mode) + blocCharge() + blocTaches(id) + await blocFaits(id, fil); } catch (err) { systemApres = system; }
        const suite = messages.map(m => Object.assign({}, m));
        const fin = suite[suite.length - 1];
        const relance = 'Tes outils sont faits (' + faits + ') : ne les rappelle pas. Écris maintenant, sans outil, ton message pour ce fil, à Justin qui te l’a demandé ici.';
        if (fin && fin.role === 'user') fin.content += '\n\n' + relance; else suite.push({ role: 'user', content: relance });
        let r2 = null;
        try { r2 = encoreOk() ? await penser(id, systemApres, suite, { reflechir: true }) : null; } catch (err) { r2 = null; }
        if (r2 && r2.ok && r2.texte && !RAS.test(r2.texte)) {
          const dit = parle(raccourcir(masquer(crochets(r2.texte))));
          if (dit.ok) sortie.repondu = true; else { sortie.saute = dit.raison; if (dit.raison === 'racine_close') refusAvant(id, fil, conversations.peutParler(id, fil, { racine: racineId }), prof); else refusDit(id, fil, dit.raison); }
        }
      }
      return sortie;
    } finally { conversations.ecrit(fil, id, false); }
  }

  /* Une réponse à la fois par fil : plusieurs réveils d'un même fil se suivent, chacun voyant ce que le précédent a dit. Un autre fil n'attend pas. */
  const files = new Map();
  function enfiler(f, travail) {
    const suite = (files.get(f) || Promise.resolve()).catch(() => {}).then(travail);
    files.set(f, suite);
    const nettoie = () => { if (files.get(f) === suite) files.delete(f); };
    suite.then(nettoie, nettoie);
    return suite;
  }
  const deja = new Set();   // un message ne réveille un agent qu'une fois
  const aTousDe = texte => /(^|[\s,(])@(?:tous|[ée]quipe)\b/i.test(String(texte || ''));
  /* LE PING-PONG (28 octobre 2026) : sous une racine la chaîne peut aller jusqu'à six, donc deux agents peuvent s'écrire A, B, A, B sans rien produire. Si les QUATRE derniers messages d'agents de la racine sont
     ABAB, que chacun cite l'autre et qu'aucun ACTE n'a eu lieu depuis le début de l'alternance (une tâche prise, passée, terminée, une demande déposée, une décision — `agents.actesDepuis`), le réveil suivant n'a pas
     lieu : ce n'est pas un plafond horaire, c'est un arrêt anticipé qui économise des appels. `{a, b}` ou `null`. */
  function pingPong(m, rac) {
    if (!rac || !m || m.de === 'justin' || m.de === 'systeme' || typeof agents.actesDepuis !== 'function') return null;
    const q = conversations.lire(m.fil, 50).filter(x => x.racine === rac.id && IDS.has(x.de) && x.fait !== true).slice(-4);
    if (q.length < 4 || q[3].id !== m.id) return null;
    const a = q[0].de, b = q[1].de;
    if (a === b || q[2].de !== a || q[3].de !== b) return null;
    const cite = (x, y) => Array.isArray(x.mentions) && x.mentions.includes(y);
    if (!(cite(q[0], b) && cite(q[1], a) && cite(q[2], b) && cite(q[3], a))) return null;
    if (agents.actesDepuis([a, b], q[0].ts)) return null;
    return { a, b };
  }
  function surMessage(m) {
    if (!m || typeof m !== 'object' || typeof m.fil !== 'string' || !conversations.filValide(m.fil)) return Promise.resolve({ saute: 'message' });
    const membres = conversations.membres(m.fil).map(x => x.id);
    const prive = membres.length === 1 && membres[0] === m.fil;
    const rac = m.racine ? conversations.racine(m.racine) : null;
    let cibles = destinataires(m, { membres, meneur: conversations.meneur(m.fil), prive, filId: m.fil, profMax: rac ? PROF_MAX_RACINE : PROF_MAX }).filter(id => IDS.has(id));
    if (m.de !== 'justin') cibles = cibles.slice(0, REVEILS_AGENT_MAX);
    /* le ping-pong : le réveil qui prolongerait l'alternance n'a pas lieu ; une ligne par paire et par heure ; Victor, s'il n'est pas l'un des deux, arbitre UNE fois */
    let arbitre = null;
    const pp = pingPong(m, rac);
    if (pp && cibles.includes(pp.a)) {
      cibles = cibles.filter(x => x !== pp.a);
      compter('chaine'); journal(m.de, 'ping-pong coupé', 'refuse', pp.a + '/' + pp.b);
      const dite = dire(m.fil, nomDe(pp.a) + ' et ' + nomDe(pp.b) + ' se répondent sans rien faire avancer : leur échange s’arrête là.', { cle: 'pingpong:' + [pp.a, pp.b].sort().join(':'), parHeure: true });
      if (dite && dite.ok && pp.a !== 'victor' && pp.b !== 'victor' && IDS.has('victor') && membres.includes('victor')) {
        arbitre = { id: null, fil: m.fil, de: 'systeme', prof: Number(m.prof) || 0, racine: m.racine, texte: nomDe(pp.a) + ' et ' + nomDe(pp.b) + ' se répondent depuis quatre messages sans qu’aucune tâche n’ait été prise, passée ou terminée. Dernier message de ' + nomDe(m.de) + ' : « ' + affichable(m.texte, 200) + ' »' };
      }
    }
    cibles = cibles.filter(id => { const k = m.id + ':' + id; if (deja.has(k)) return false; deja.add(k); if (deja.size > 2000) deja.clear(); return true; });
    const lance = (id, mode, msg) => enfiler(m.fil, () => reveiller(id, msg || m, mode).catch(e => { console.error('agent ' + id + ' :', String(e && e.message || e).slice(0, 120)); return { saute: 'erreur' }; }));
    /* « @tous » de Justin dans un groupe, sous une racine : UNE vague ordonnée — chacun répond une fois, brièvement, sans cascade — puis Victor, qui lit toutes les réponses et synthétise. */
    if (m.de === 'justin' && rac && !prive && aTousDe(m.texte) && cibles.length > 1) {
      const ordre = cibles.filter(x => x !== 'victor');
      const chef = IDS.has('victor') && membres.includes('victor') ? 'victor' : '';
      const travail = enfiler(m.fil, async () => {
        const sorties = [];
        for (const id of ordre) sorties.push(await reveiller(id, m, 'tous').catch(e => { console.error('agent ' + id + ' :', String(e && e.message || e).slice(0, 120)); return { saute: 'erreur' }; }));
        if (chef) sorties.push(await reveiller(chef, m, 'synthese').catch(e => { console.error('agent ' + chef + ' :', String(e && e.message || e).slice(0, 120)); return { saute: 'erreur' }; }));
        return sorties;
      });
      return travail;
    }
    const travaux = cibles.map(id => lance(id, ''));
    if (arbitre) travaux.push(lance('victor', 'arbitre', arbitre));
    return Promise.all(travaux);
  }

  return { ids, surMessage, systemDe, refus, enCours: () => files.size };
};
module.exports.destinataires = destinataires;
module.exports.outilsDe = outilsDe;
module.exports.ROLES = ROLES;
module.exports.PERSO = PERSO;
module.exports.PROF_MAX = PROF_MAX;
module.exports.PROF_MAX_RACINE = PROF_MAX_RACINE;
module.exports.ACTIONS_MAX = ACTIONS_MAX;
module.exports.REVEILS_AGENT_MAX = REVEILS_AGENT_MAX;
module.exports.FORME_DOSSIER = FORME_DOSSIER;
module.exports.ticDeGroupe = ticDeGroupe;
module.exports.APPROUVE = APPROUVE;
