/* LA SIGNATURE DES AGENTS (23 octobre 2026) — posée par le SERVEUR, jamais écrite par Claude, jamais « Justin ».
 *
 * Justin : « C'est hyper contradictoire de mettre Justin si c'est un agent qui répond. La signature, c'est le nom de l'agent.
 * Assistante, Léa par exemple. Équipe TeamOP. »
 *
 *   Léa — Assistante virtuelle — Équipe TeamOP
 *   contact@teamop.fr · teamop.fr
 *
 * ⛔ « Assistante VIRTUELLE » n'est pas une coquetterie : le règlement européen sur l'intelligence artificielle (article 50, en vigueur depuis le
 *    2 août 2026) oblige à dire à une personne qu'elle échange avec une IA. Par défaut chaque agent porte donc « Assistante virtuelle » / « Assistant
 *    virtuel » ; Justin peut changer la FORMULE (le rôle de chaque agent, le nom de l'équipe) depuis la Tour, mais la signature garde toujours trois
 *    choses que rien ne retire : le prénom de l'agent, un rôle, et l'adresse de la boîte qui envoie.
 * ⛔ Le rôle réglé est une LIGNE : lettres, espaces, tirets, apostrophes — ni adresse, ni lien, ni chiffre, ni « Justin ». Un champ libre qui part chez des clients
 *    est le chemin le plus court vers un courriel que personne n'a relu.
 * ⛔ La signature n'est PAS celle du Courrier (`mail.js` : `reglages.signature`, qui vit sur l'appareil de Justin et peut porter son nom) : `mail.envoyerAgent`
 *    exige celle-ci et refuse d'envoyer sans elle.
 */
'use strict';

const F = 'agents-signatures.json';
const ROLE_RE = /^[\p{L}][\p{L} '’-]{1,59}$/u;
/* ⛔ Le rôle dit TOUJOURS que c'est une IA (règlement européen sur l'IA, art. 50) : « virtuel », « virtuelle » ou « IA ». Sans cette condition, le patron pouvait régler
   « Directrice commerciale » et retirer la mention des courriels que reçoivent les clients (relecture du 23 octobre 2026). Le nom de l'ÉQUIPE n'est pas concerné. */
const ROLE_IA = /(?:^|[^\p{L}])(?:virtuel(?:le)?|ia)(?![\p{L}])/iu;
const roleValide = r => typeof r === 'string' && ROLE_RE.test(r) && ROLE_IA.test(r) && !/justin/i.test(r);
const EQUIPE_DEFAUT = 'Équipe TeamOP';
const SITE = 'teamop.fr';
/* Les prénoms féminins du registre : « Assistante virtuelle ». Les autres : « Assistant virtuel ». */
const FEMININS = new Set(['ines', 'camille', 'margaux', 'lea', 'nina', 'chloe', 'emma', 'sarah', 'lola']);
const roleDefaut = id => (FEMININS.has(id) ? 'Assistante virtuelle' : 'Assistant virtuel');

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
    const adr = /^[^@\s<>",;]+@[^@\s<>",;]+\.[^@\s<>",;]+$/.test(String(adresseBoite || '')) ? String(adresseBoite).toLowerCase() : 'contact@' + SITE;
    return IDS.get(id) + ' — ' + roleDe(id) + ' — ' + reg.equipe + '\n' + adr + ' · ' + SITE;
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
        if (!roleValide(r)) { Object.assign(reg, JSON.parse(avant)); return res.status(400).json({ error: 'Le rôle : des lettres seulement (pas d’adresse, de lien, de chiffre ni « Justin »), 2 à 60 caractères, et il dit que c’est une IA (« virtuel », « virtuelle » ou « IA »)' }); }
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
module.exports.ROLE_IA = ROLE_IA;
module.exports.roleDefaut = roleDefaut;
module.exports.SITE = SITE;
