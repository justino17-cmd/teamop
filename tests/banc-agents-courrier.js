/* ⛔ L'ÉTABLI COMMUN DE test-2862, test-2863 ET test-2864 (23 octobre 2026) — les VRAIS modules, tout le reste simulé, rien ne sort.
 *
 * Monte, dans un dossier jetable : le vrai `agents.js` (registre, journal, validations, modes), le vrai `direction.js` (la charte), le vrai
 * `cerveau.js` (budget, `thinking` désactivé — seul `appeler`, l'appel réseau, est remplacé), le vrai `agents-brouillons.js`, le vrai `agent-lea.js`
 * et le vrai `agent-camille.js`. Sont simulés : le serveur HTTP (un `app` qui note ses routes, appelées par `appeler()` en rejouant leurs
 * intergiciels — `monAdmin` / `monPatronStrict` y ont leur sens : le patron seul passe le second), la messagerie (`mail` : boîtes, lecture
 * d'un message, envoi d'un agent — chaque appel est NOTÉ), et Claude (`claude(requete)` rend le texte voulu ; chaque requête reçue est GARDÉE,
 * c'est ce qui permet de prouver ce qui part chez Anthropic).
 * Ce que cet établi ne voit pas, les deux autres moitiés le voient : `mail.js` lui-même (lecture sans marquer, envoi, crochet de la veille) et le
 * câblage d'`index.js` sont joués par le VRAI serveur (test-2863 §3, test-2864 §2).
 */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
const S = f => path.join(RACINE, 'server', f);

const SIGNATURE = 'Justin Dupont\nTeamOP — OP GESTION';
/* Un courriel que Claude pourrait rendre : il passe `refusDe` (pas d'adresse, de lien, de numéro, un seul prix : 15 €). */
const COURRIEL = [
  'Objet : TeamOP — OP GESTION pour votre activité',
  '',
  'Bonjour,',
  '',
  'Nous vous remercions pour votre inscription sur teamop.fr. Nous avons bien noté votre activité.',
  '',
  'TeamOP édite OP GESTION, la gestion de vos interventions, sur ordinateur, tablette et téléphone, sans installation.',
  '',
  'Toute votre équipe travaille sur des informations à jour en temps réel : le planning des techniciens par jour, semaine ou mois, le suivi des interventions, les fiches clients et sites, les devis transformés en factures, et le rapport d’intervention envoyé au client en PDF avec les photos et la signature.',
  '',
  'Notre différence : une formule sur mesure, où les catégories dont vous n’avez pas besoin sont retirées et ne vous sont pas facturées, et à partir de 15 € par mois et par utilisateur (TVA non applicable).',
  '',
  'Pour vous proposer une offre adaptée, pourriez-vous nous préciser :',
  '1. La taille de votre équipe ?',
  '2. Votre clientèle ?',
  '3. Les outils que vous utilisez aujourd’hui ?',
  '4. Vos attentes principales ?',
  '',
  'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.',
  '',
  'Nous restons à votre disposition par retour de mail ou par téléphone.',
  '',
  'Bien cordialement,'
].join('\n');

/* Le courriel que Claude rendrait POUR CETTE DEMANDE (23 octobre 2026 : le contrôle qualité exige le nom de l'entreprise dans l'accroche) : il lit le nom et le métier dans le
   message de Léa et les écrit. Il passe le contrôle du code, quel que soit le nom. */
function courrielPour(requete) {
  if (String(requete && requete.system).startsWith('Tu es Chloé, l’assistante « Devis et propositions »')) return 'FORMULE : business\nObjet : Notre proposition pour Toka Clim\n\n' + PROPOSITION;
  /* Camille ne rend plus un courriel nu : une ligne « CATEGORIE : … » d'abord (ici « prospect », la démarche commerciale) */
  if (String(requete && requete.system).startsWith('Tu es Camille, l’assistante « Courrier et support »')) return 'CATEGORIE : prospect\n' + COURRIEL;
  const m = requete && requete.messages ? requete.messages[requete.messages.length - 1] : null;
  const t = m && typeof m.content === 'string' ? m.content : '';
  const nom = /Nom de l’entreprise : <<<([^>]*)>>>/.exec(t), met = /Métier : ([^\n]+)/.exec(t);
  const ent = nom ? nom[1].trim() : '';
  const metier = met && !/^non indiqué/.test(met[1]) ? met[1].trim() : '';
  return COURRIEL.replace('Nous avons bien noté votre activité.', (ent ? 'Nous avons bien noté que ' + ent + ' est une entreprise' + (metier ? ' de ' + metier.toLowerCase() : ' de terrain') + '.' : 'Nous avons bien noté votre activité.'));
}
/* La proposition que Chloé rendrait (23 octobre 2026) : la formule Business, les deux emplacements de rubriques, l'essai à la fin. Elle passe le contrôle du profil « proposition ». */
const PROPOSITION = ['Bonjour,', '', 'Nous vous remercions pour vos réponses. Nous avons compris que Toka Clim intervient surtout en entretien de climatisation chez des particuliers, avec une équipe de quatre techniciens.', '',
  'La formule que nous vous proposons est OP GESTION Business, à 25 € par mois et par utilisateur (TVA non applicable), sans engagement de durée. Elle comprend le planning des interventions, les rapports avec photos et signature, les devis et les factures, le stock avec seuils d’alerte et les bons de commande fournisseurs.', '',
  '{{RUBRIQUES_CONSERVEES}}', '', '{{RUBRIQUES_RETIREES}}', '',
  'Nous pouvons aussi créer pour vous une catégorie de suivi des fluides frigorigènes, réservée à votre entreprise : elle restera confidentielle, et le budget reste maîtrisé.', '',
  'Si cette proposition vous convient, nous pouvons vous ouvrir une période d’essai d’une semaine pour la tester avec votre équipe. Dites-nous si vous souhaitez la démarrer ou ajuster la proposition.', '',
  'Nous restons à votre disposition par retour de mail ou par téléphone.', '', 'Bien cordialement,'].join('\n');
const CHLOE_DEBUT = 'Tu es Chloé, l’assistante « Devis et propositions »';
const LOUIS_DEBUT = 'Tu es Louis, l’assistant « Documentation et aide »';
const JUGE_DEBUT = 'Tu es le relecteur qualité', NOTEUR_DEBUT = 'Tu es le relecteur de TeamOP. Tu NOTES', RECHERCHE_DEBUT = 'Tu es Léa, l’assistante de TeamOP. Avant d’écrire';

/* Ce que Justin enregistre dans la Tour en ouvrant « Répondre seul aux questions courantes par courrier » — la forme EXACTE d'`agents-charte.json`. */
const CHARTE_OUVERTE = { repondre_client: { auto: true } };

function monter(o) {
  o = o || {};
  const D = fs.mkdtempSync(path.join(os.tmpdir(), 'bcourrier-'));
  const horloge = { t: o.t0 || Date.UTC(2026, 9, 23, 9, 0, 0) };
  const maintenant = () => horloge.t;
  const routes = {};
  const app = { use() {} };
  for (const m of ['get', 'post', 'put', 'delete', 'patch']) app[m] = (p, ...h) => { routes[m.toUpperCase() + ' ' + p] = h; };
  const monAdmin = (req, res, next) => (req.tourUser ? next() : res.status(401).json({ error: 'non connecté' }));
  const monPatronStrict = (req, res, next) => (req.tourUser && req.tourUser.role === 'patron' ? next() : res.status(403).json({ error: 'réservé au patron' }));

  async function appeler(cle, req) {
    const hs = routes[cle];
    if (!hs) throw new Error('route absente : ' + cle);
    const res = { code: 200, corps: null, fini: false, status(c) { this.code = c; return this; }, json(x) { this.corps = x; this.fini = true; return this; }, setHeader() {} };
    req = Object.assign({ body: {}, query: {}, tourUser: null }, req);
    let i = 0;
    const suite = async () => { const h = hs[i++]; if (!h) return; let passe = false; await h(req, res, () => { passe = true; }); if (passe && !res.fini) await suite(); };
    await suite();
    return { status: res.code, corps: res.corps };
  }
  const PATRON = { nom: 'Justin', role: 'patron' }, COLLAB = { nom: 'Agent', role: 'collaborateur' };

  if (o.modes) fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes: o.modes }));
  /* La charte `repondre_client` est FERMÉE par défaut (`direction.js`) : l'établi ne l'ouvre PAS de lui-même — un banc qui joue l'envoi seul passe `charte: CHARTE_OUVERTE`, comme Justin
     l'ouvre dans la Tour. Écrite AVANT `direction.js` (qui la lit au démarrage) et avant `o.avant`, qui peut encore la réécrire. */
  if (o.charte) fs.writeFileSync(path.join(D, 'agents-charte.json'), JSON.stringify(o.charte));
  if (o.avant) o.avant(D);

  const agents = require(S('agents.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, maintenant, pousseNotif: async () => 0, cerveaux: [], cleCerveauPosee: true,
    horaires: typeof o.horaires === 'function' ? o.horaires(D) : undefined });   // les heures de travail (`test-3021`) : une FABRIQUE (le dossier n'existe qu'ici) ; sans elle, pas de garde horaire comme avant
  const direction = require(S('direction.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, maintenant });

  /* Claude simulé : chaque requête est gardée ; `o.claude(requete, n)` choisit la réponse (texte brut, ou un objet d'erreur à jeter). */
  /* `recus` : les appels du RÉDACTEUR seulement ; le juge (`recusJuge`, réponse par défaut « VERDICT : OK », réglable par `o.juge(requete, n)`) et la recherche web (`recusRecherche`,
     par défaut « IDENTIFIEE : non », réglable par `o.recherche(requete, n)` qui peut rendre { texte, recherches }) ont les leurs. */
  const recus = [], recusJuge = [], recusRecherche = [], recusLouis = [], recusNoteur = [];
  const cerveau = require(S('cerveau.js'))({ DATA_DIR: D, agents, cleApi: o.sansCle ? '' : 'sk-ant-banc-2862-xxxxxxxxxxxxxxxx', maintenant,
    appeler: async (cle, requete, optsAppel) => {
      const copie = JSON.parse(JSON.stringify(requete));
      /* LE MODE « TRAVAIL » (30 octobre 2026) : le relecteur noté (`agents-grille.js`) a son propre rôle ; `o.notes(requete, n)` rend ses lignes (par défaut huit 5 — « tout va bien »). */
      if (String(requete.system).startsWith(NOTEUR_DEBUT)) {
        recusNoteur.push(copie);
        const r = o.notes ? await o.notes(requete, recusNoteur.length) : ['repond_a_tout', 'etape_suivante', 'longueur', 'juste', 'charte', 'personnalise', 'professionnel'].map(c => 'NOTE ' + c + ' : 5').join('\n');
        if (r instanceof Error) throw r;
        return { texte: r, entree: 1500, sortie: 60, stop_reason: 'end_turn' };
      }
      if (String(requete.system).startsWith(JUGE_DEBUT)) {
        recusJuge.push(copie);
        const r = o.juge ? await o.juge(requete, recusJuge.length) : 'VERDICT : OK';
        if (r instanceof Error) throw r;
        return { texte: r, entree: 1200, sortie: 20, stop_reason: 'end_turn' };
      }
      if (String(requete.system).startsWith(RECHERCHE_DEBUT)) {
        recusRecherche.push(copie);
        const r = o.recherche ? await o.recherche(requete, recusRecherche.length) : 'IDENTIFIEE : non';
        if (r instanceof Error) throw r;
        return typeof r === 'object' ? Object.assign({ entree: 1500, sortie: 200, stop_reason: 'end_turn' }, r) : { texte: r, entree: 1500, sortie: 200, stop_reason: 'end_turn', recherches: 0 };
      }
      if (String(requete.system).startsWith(LOUIS_DEBUT)) {
        recusLouis.push(copie);
        const r = o.louisClaude ? await o.louisClaude(requete, recusLouis.length) : 'RIEN';
        if (r instanceof Error) throw r;
        return { texte: r, entree: 1500, sortie: 100, stop_reason: 'end_turn' };
      }
      recus.push(copie);
      copie.__appel = optsAppel || null;
      const r = o.claude ? await o.claude(requete, recus.length) : courrielPour(requete);
      if (r instanceof Error) throw r;
      /* une réponse OBJET (mode travail) : { texte, actions:[{id, nom, entree}], contenu?, entree?, sortie?, stop_reason? } — le faux Anthropic peut appeler un outil */
      if (r && typeof r === 'object') return Object.assign({ texte: '', entree: 900, sortie: 400, stop_reason: (r.actions && r.actions.length) ? 'tool_use' : 'end_turn' }, r);
      return { texte: r, entree: 900, sortie: 400, stop_reason: 'end_turn' };
    } });

  /* La messagerie simulée. `messages` : 'boite|dossier|uid' → le message que rendrait `lireMessage` (ou une Error à jeter). */
  const boites = o.boites || [{ id: 'b-contact', email: 'contact@teamop.fr', nom: 'TEAM OP' }, { id: 'b-support', email: 'support@teamop.fr', nom: 'TEAM OP' }];
  const messages = {}, lectures = [], envoyes = [];
  const mail = {
    boites: () => boites.map(b => Object.assign({}, b)),
    boiteParRole: r => { const b = boites.find(x => x.email.toLowerCase().startsWith(String(r) + '@')) || boites[0]; return b ? b.id : null; },
    signature: () => SIGNATURE,
    lireMessage: async (b, d, u) => { lectures.push([b, d, u]); const m = messages[b + '|' + d + '|' + u]; if (m instanceof Error) throw m; return m || null; },
    envoyerAgent: async (x) => { if (o.panneEnvoi) throw new Error('smtp en panne pour jean.dupont@client-secret.fr'); envoyes.push(JSON.parse(JSON.stringify(x))); return { copieOk: true, messageId: '<banc' + envoyes.length + '@teamop.fr>' }; }
  };
  const fichier = require(S('agents-fichier.js'))(D);
  const brouillons = require(S('agents-brouillons.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, mail, direction, fichier, maintenant, surCorrection: x => louis.surCorrection(x) });   // (Louis est créé plus bas : liaison tardive, comme dans index.js)
  const paroles = [];
  const conversations = o.conversations || { parler: (de, fil, texte, opts) => { paroles.push({ de, fil, texte, niveau: (opts || {}).niveau }); return { ok: true }; } };
  const louis = require(S('agent-louis.js'))(app, { DATA_DIR: D, monAdmin, monPatronStrict, agents, cerveau, fichier, maintenant, conversations });
  /* le mode « travail » : `o.travail` (true ou { camille: true }) le LÈVE ; sans lui, rien n'est passé aux agents — le chemin d'avant, au caractère près */
  const travail = o.travail ? require(S('agents-travail.js'))({ cerveau, agents, travail: o.travail }) : null;
  const outilsLecture = o.travail ? require(S('agents-outils-lecture.js'))({ brouillons, louis, agents, faits: o.faits || {}, margaux: () => o.margaux || null }) : null;
  const lea = require(S('agent-lea.js'))({ agents, cerveau, brouillons, fichier, maintenant, conversations, louis, travail, outilsLecture, recherche: o.recherche !== undefined || o.avecRecherche === true,
    libelleMetier: m => ({ chauffage: 'Chauffage / Climatisation', nettoyage: 'Nettoyage' }[m] || ''), metiers: ['chauffage', 'nettoyage', 'autre'] });
  const chloe = require(S('agent-chloe.js'))({ agents, cerveau, brouillons, fichier, maintenant, conversations, louis, metiersPath: o.metiersPath,
    libelleMetier: m => ({ chauffage: 'Chauffage / Climatisation', nettoyage: 'Nettoyage' }[m] || ''),
    contexteClient: o.contexteClient || (() => ({ entreprise: 'Toka Clim', metier: 'chauffage', users: 4, formule: 'pro' })) });
  const camille = require(S('agent-camille.js'))({ agents, cerveau, brouillons, mail, fichier, maintenant, conversations, louis, travail, outilsLecture, chloe: o.sansChloe ? null : chloe, dossierDe: o.dossierDe, domainesNotres: () => ['teamop.fr', 'notre-societe.fr'], adressesNotres: () => ['moi-meme@webmail-2863.example'] });

  const validations = async () => (await appeler('GET /api/monitor/agents/validations', { tourUser: PATRON, query: { statut: 'tout' } })).corps.validations;
  const journal = () => agents.lireJournal();
  const fichierJson = nom => JSON.parse(fs.readFileSync(path.join(D, nom), 'utf8'));
  const nettoyer = () => { try { fs.rmSync(D, { recursive: true, force: true }); } catch (e) {} };
  return { D, horloge, agents, direction, cerveau, mail, brouillons, lea, camille, chloe, louis, fichier, travail, outilsLecture, recusNoteur, recus, recusJuge, recusRecherche, recusLouis, paroles, messages, lectures, envoyes, routes, appeler, PATRON, COLLAB,
    validations, journal, fichierJson, nettoyer };
}
/* Le même courriel, pour une entreprise nommée « Toka Clim » (l'accroche doit porter le nom — contrôle qualité du 23 octobre 2026). `pourToka(x)` y ajoute une phrase. */
const NOTE_TOKA = 'Nous avons bien noté que Toka Clim est une entreprise de terrain.';
const COURRIEL_TOKA = COURRIEL.replace('Nous avons bien noté votre activité.', NOTE_TOKA);
const pourToka = x => COURRIEL_TOKA.replace(NOTE_TOKA, NOTE_TOKA + ' ' + x);
/* La signature qu'un agent porte à l'envoi (`agents-signature.js`), pour la boîte contact@. */
/* La signature d'un agent du Courrier (Léa, Camille, Chloé) : depuis le 23 octobre 2026, elle demande d'enregistrer l'adresse qui envoie (`agents-signature.js`). */
/* Depuis le 25 octobre 2026 : « Léa — Assistante de TeamOP » (plus « virtuelle », Justin), et la mention de l'IA sous la signature (règlement européen, art. 50). */
const signatureDe = (nom, role, adr) => nom + ' — ' + (role || 'Assistante de TeamOP') + (/team\s?op/i.test(role || 'TeamOP') ? '' : ' — Équipe TeamOP') + '\n' + (adr || 'contact@teamop.fr') + ' · https://teamop.fr/?de=' + nom.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase() + '\nPour recevoir nos messages sans faute, ajoutez ' + (adr || 'contact@teamop.fr') + ' à vos contacts.\nMessage préparé par un assistant automatique de TeamOP.';
module.exports = { NOTEUR_DEBUT, CHARTE_OUVERTE, LOUIS_DEBUT, PROPOSITION, CHLOE_DEBUT, JUGE_DEBUT, RECHERCHE_DEBUT, monter, COURRIEL, COURRIEL_TOKA, pourToka, NOTE_TOKA, SIGNATURE, courrielPour, signatureDe };
