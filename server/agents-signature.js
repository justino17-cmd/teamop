/* LA SIGNATURE DES AGENTS (23 octobre 2026) — posée par le SERVEUR, jamais écrite par Claude, jamais « Justin ».
 *
 * Justin : « C'est hyper contradictoire de mettre Justin si c'est un agent qui répond. La signature, c'est le nom de l'agent.
 * Assistante, Léa par exemple. Équipe TeamOP. »
 *
 *   Léa — Assistante de TeamOP
 *   contact@teamop.fr · https://teamop.fr/?de=lea      (le lien porte le nom de l'agent : Léa, Camille et Chloé seulement — voir `lienSite`)
 *   Pour recevoir nos messages sans faute, ajoutez contact@teamop.fr à vos contacts.   (Léa, Camille et Chloé seulement : `AGENTS_COURRIER`)
 *
 *   Message préparé par un assistant automatique de TeamOP.   (TOUS les agents : `MENTION_IA`)
 *
 * ⛔ « Assistante de TeamOP », PAS « virtuelle » — Justin, 25 octobre 2026 : « je veux pas qu'il dise virtuel dans les mails, tous les agents doivent dire
 *    assistant ou assistante de TeamOP ». Le règlement européen sur l'intelligence artificielle (article 50, en vigueur depuis le 2 août 2026) oblige
 *    pourtant à dire à une personne qu'elle échange avec une IA : la mention a donc quitté le RÔLE pour une ligne à elle, `MENTION_IA`, que le serveur
 *    pose sous CHAQUE signature d'agent et que rien ne retire (ni le rôle, ni le nom de l'équipe réglés dans la Tour). Justin peut changer la FORMULE
 *    depuis la Tour ; la signature garde toujours quatre choses : le prénom de l'agent, un rôle, l'adresse de la boîte qui envoie, et la mention.
 * ⛔ Le rôle réglé est une LIGNE : lettres, espaces, tirets, apostrophes — ni adresse, ni lien, ni chiffre, ni « Justin ». Un champ libre qui part chez des clients
 *    est le chemin le plus court vers un courriel que personne n'a relu.
 * ⛔ La signature n'est PAS celle du Courrier (`mail.js` : `reglages.signature`, qui vit sur l'appareil de Justin et peut porter son nom) : `mail.envoyerAgent`
 *    exige celle-ci et refuse d'envoyer sans elle.
 */
'use strict';

const F = 'agents-signatures.json';
const ROLE_RE = /^[\p{L}][\p{L} '’-]{1,59}$/u;
/* ⛔ LA MENTION IA (règlement européen sur l'IA, art. 50) n'est plus dans le rôle mais sous la signature, posée par `formater` pour TOUS les agents : un rôle réglé
   « Directrice commerciale » ne la retire plus (relecture du 23 octobre 2026, qui exigeait « virtuel » dans le rôle pour la même raison). « Virtuel » est refusé
   dans le rôle (Justin, 25 octobre 2026) : un rôle rangé avec lui (le défaut d'avant) retombe sur le défaut. */
const MENTION_IA = 'Message préparé par un assistant automatique de TeamOP.';
const roleValide = r => typeof r === 'string' && ROLE_RE.test(r) && !/virtuel/i.test(r) && !/justin/i.test(r);
const EQUIPE_DEFAUT = 'Équipe TeamOP';
const SITE = 'teamop.fr';
/* Les prénoms féminins du registre : « Assistante de TeamOP ». Les autres : « Assistant de TeamOP ». */
const FEMININS = new Set(['ines', 'camille', 'margaux', 'lea', 'nina', 'chloe', 'emma', 'sarah', 'lola']);
const roleDefaut = id => (FEMININS.has(id) ? 'Assistante de TeamOP' : 'Assistant de TeamOP');
const ADRESSE_BOITE = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/;
/* LA mise en forme d'une signature d'agent — UNE seule, pour tous les agents (fusion de l'intégration, 23 octobre 2026) : le courrier (Léa, Camille, Chloé) la tient du registre ci-dessous, que
   Justin règle depuis la Tour ; Hugo, Margaux, Emma et Sarah (`agents-courriers-ops.js`) l'appellent avec leurs rôles par défaut quand aucun registre n'est branché. Deux chantiers avaient écrit
   chacun la leur (« Léa — Assistante virtuelle — Équipe TeamOP » d'un côté, trois lignes de l'autre) : un client aurait reçu deux présentations de la même équipe. */
/* ⛔ LES TROIS AGENTS DU COURRIER DEMANDENT QU'ON ENREGISTRE LEUR ADRESSE (Justin, 23 octobre 2026 : « dis-le aux agents qui gèrent les mails »).
   teamop.fr est un domaine jeune : ses courriels passent tous les contrôles (SPF, DKIM, DMARC, 10/10 au test du 23 octobre), et pourtant Gmail, Outlook et
   Orange les rangent encore en indésirables, faute d'historique. Un expéditeur enregistré dans les contacts n'y est plus classé. Léa, Camille et Chloé écrivent
   aux prospects et aux clients qui découvrent TeamOP : leur signature porte la demande, avec l'adresse de la boîte qui ENVOIE (celle qu'il faut enregistrer).
   Camille la porte aussi sous ses accusés écrits par le code (résiliation, facture, remboursement…) : la réponse qui suit doit arriver.
   Les quatre agents de la gestion ne la portent pas : la lettre de Hugo ou la mise en demeure de Margaux n'invite pas à se faire enregistrer. Posée par le SERVEUR, à
   chaque envoi : écrite par Claude, elle serait oubliée une fois sur dix, ou porterait l'adresse d'une autre boîte que celle qui envoie. */
const AGENTS_COURRIER = new Set(['lea', 'camille', 'chloe']);
const ligneContacts = adr => 'Pour recevoir nos messages sans faute, ajoutez ' + adr + ' à vos contacts.';
/* ⛔ LE LIEN DU SITE PORTE LE NOM DE L'AGENT (25 octobre 2026, Justin : « voir si cet agent est lié à ce lien-là par rapport aux démarches qu'il fait »).
   Les courriels partent en texte brut : le lien qu'on lit EST celui qu'on touche. « https://teamop.fr/?de=lea » reste court et honnête, et l'onglet Audience
   de la Tour compte « Courriel de Léa » (`server/audience.js`, liste FERMÉE des agents). Sans `de`, une visite venue d'un courriel se perdait dans « Accès direct ».
   Seuls les trois agents du courrier (`AGENTS_COURRIER`) le portent : ce sont eux qui écrivent aux prospects. */
const lienSite = de => (/^[a-z]{2,20}$/.test(String(de || '')) ? 'https://' + SITE + '/?de=' + de : SITE);
const formater = (prenom, role, equipe, adresseBoite, contacts, de) => {
  const adr = ADRESSE_BOITE.test(String(adresseBoite || '')) ? String(adresseBoite).toLowerCase() : 'contact@' + SITE;
  /* « Léa — Assistante de TeamOP » : un rôle qui nomme déjà TeamOP ne répète pas « Équipe TeamOP » ; un rôle réglé autrement garde le nom de l'équipe. */
  const tete = prenom + ' — ' + role + (/team\s?op/i.test(role) ? '' : ' — ' + equipe);
  return tete + '\n' + adr + ' · ' + lienSite(de) + (contacts ? '\n' + ligneContacts(adr) : '') + '\n' + MENTION_IA;
};

module.exports = function signatures(app, ctx) {
  const { agents, monAdmin, monPatronStrict } = ctx;
  const fich = ctx.fichier || require('./agents-fichier')(ctx.DATA_DIR);
  const reg = fich.charger(F, { roles: {}, equipe: EQUIPE_DEFAUT });
  if (!reg.roles || typeof reg.roles !== 'object' || Array.isArray(reg.roles)) reg.roles = {};
  if (typeof reg.equipe !== 'string' || !ROLE_RE.test(reg.equipe) || /justin/i.test(reg.equipe)) reg.equipe = EQUIPE_DEFAUT;
  const IDS = new Map(agents.AGENTS.map(a => [a.id, a.nom]));
  const sauve = () => fich.ecrire(F, reg);

  const roleDe = id => { const r = reg.roles[id]; return roleValide(r) ? r : roleDefaut(id); };   // un rôle rangé sans la mention (fichier d'avant, édité à la main) retombe sur le défaut
  /* La signature d'un agent pour une boîte donnée (l'adresse de la boîte qui ENVOIE). Jamais vide pour un agent connu ; '' pour un inconnu — l'appelant refuse d'envoyer. */
  function composer(id, adresseBoite) {
    if (!IDS.has(id)) return '';
    return formater(IDS.get(id), roleDe(id), reg.equipe, adresseBoite, AGENTS_COURRIER.has(id), AGENTS_COURRIER.has(id) ? id : '');
  }
  const vue = () => ({ equipe: reg.equipe, site: SITE, agents: agents.AGENTS.map(a => ({ agent: a.id, nom: a.nom, role: roleDe(a.id), defaut: roleDefaut(a.id), apercu: composer(a.id, 'contact@' + SITE) })) });

  if (app) {
    app.get('/api/monitor/agents/signatures', monAdmin, (req, res) => {
      if (fich.illisible(F)) return res.status(503).json({ error: 'Le registre des signatures est illisible : les signatures par défaut servent' });
      res.json({ ok: true, ...vue() });
    });
    app.post('/api/monitor/agents/signatures', monPatronStrict, (req, res) => {
      const b = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
      if (fich.illisible(F)) return res.status(503).json({ error: 'Le registre des signatures est illisible : rien n’est modifié' });
      const avant = JSON.stringify(reg);
      if (typeof b.equipe === 'string') {
        const e = b.equipe.replace(/\s+/g, ' ').trim();
        if (!ROLE_RE.test(e) || /justin/i.test(e)) return res.status(400).json({ error: 'Le nom de l’équipe : des lettres seulement, sans « Justin » (2 à 60 caractères)' });
        reg.equipe = e;
      }
      if (b.agent !== undefined) {
        if (typeof b.agent !== 'string' || !IDS.has(b.agent) || typeof b.role !== 'string') { Object.assign(reg, JSON.parse(avant)); return res.status(400).json({ error: 'Un agent du registre et son rôle sont attendus' }); }
        const r = b.role.replace(/\s+/g, ' ').trim();
        if (!roleValide(r)) { Object.assign(reg, JSON.parse(avant)); return res.status(400).json({ error: 'Le rôle : des lettres seulement (pas d’adresse, de lien, de chiffre ni « Justin »), 2 à 60 caractères, sans « virtuel » (la mention de l’IA est posée sous la signature)' }); }
        reg.roles[b.agent] = r;
      }
      if (!sauve()) { const o = JSON.parse(avant); reg.roles = o.roles; reg.equipe = o.equipe; return res.status(503).json({ error: 'Signature non enregistrée' }); }
      agents.noter('systeme', 'signature des agents modifiée', { cible: typeof b.agent === 'string' ? b.agent : 'equipe', qui: req.tourUser && req.tourUser.nom });
      res.json({ ok: true, ...vue() });
    });
  }
  return { composer, roleDe, vue, illisible: () => fich.illisible(F) };
};
module.exports.ROLE_RE = ROLE_RE;
module.exports.MENTION_IA = MENTION_IA;
module.exports.roleDefaut = roleDefaut;
module.exports.formater = formater;
module.exports.EQUIPE_DEFAUT = EQUIPE_DEFAUT;
module.exports.SITE = SITE;
module.exports.AGENTS_COURRIER = AGENTS_COURRIER;
module.exports.ligneContacts = ligneContacts;
module.exports.lienSite = lienSite;
