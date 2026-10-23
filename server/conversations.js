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
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const F = 'agents-messages.json';
const NIVEAUX = ['info', 'important', 'urgent'];
const MOTIFS = { demande_humain: 'demande à parler à une vraie personne', litige: 'litige à traiter', sensible: 'sujet sensible', blocage: 'client bloqué', urgence: 'urgence' };
const TEXTE_MAX = 600, TEXTE_PATRON_MAX = 1000, MESSAGES_MAX = 500, PAR_HEURE = 12, DOUBLON_MS = 24 * 3600 * 1000, LISTE_MAX = 100;
const PAR_HEURE_FIL = 20;          // messages d'AGENTS par heure et par fil, en plus des douze par agent : deux agents qui s'emballent s'arrêtent ici
const ECRIT_TTL_MS = 120000;       // « X écrit… » expire seul : un appel resté pendu ne laisse pas un agent « en train d'écrire » pour toujours
const SYSTEME_MAX = 300;
/* ── QUI EST DANS QUEL FIL — la seule définition. `'*'` : tous les agents du registre. Un fil privé n'a qu'un membre : son agent. ── */
const MEMBRES = {
  equipe: '*',
  clients: ['lea', 'chloe', 'camille', 'hugo', 'margaux', 'emma'],
  plateforme: ['max', 'jules', 'theo', 'nina', 'ines'],
  reunions: '*',
};
/* Qui répond quand Justin écrit dans un groupe sans citer personne. */
const MENEUR = { equipe: 'victor', clients: 'lea', plateforme: 'max', reunions: 'victor' };
const NOMS_GROUPES = { equipe: 'Équipe', clients: 'Clients', plateforme: 'Plateforme', reunions: 'Réunions' };
const GROUPES = Object.keys(MEMBRES);

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
  const nomDuFil = f => NOMS_GROUPES[f] || (IDS.get(f) || f);
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
  const propre = (t, n) => String(t == null ? '' : t).replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
  function ajouter(m) {
    messages.push(m);
    if (messages.length > MESSAGES_MAX) messages = messages.slice(-MESSAGES_MAX);
    if (!ecrire()) { messages.pop(); return false; }
    return true;
  }
  /* Prévenir l'équipe qu'un message est arrivé — sans attendre et sans JAMAIS faire échouer l'écriture. `surMessage(m)` reçoit une copie du message ;
     l'ancienne forme `surMessagePatron(fil, texte)` (un seul agent, seulement pour Justin) reste servie tant que rien d'autre n'est branché. */
  function declencher(m) {
    const copie = { id: m.id, fil: m.fil, de: m.de, texte: m.texte, ts: m.ts, prof: m.prof || 0, mentions: (m.mentions || []).slice() };
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

  /* Un agent parle. `{ok:true}` ou `{ok:false, raison}` — l'agent doit lire la réponse. */
  function parler(de, fil, texte, o) {
    o = o && typeof o === 'object' ? o : {};
    if (illisible) return { ok: false, raison: 'registre_illisible' };
    if (!IDS.has(de)) return { ok: false, raison: 'inconnu' };
    const p = agents.peutAgir(de);
    if (!p.ok) return { ok: false, raison: p.raison };
    /* un agent parle dans SON fil et dans les groupes dont il est membre — jamais dans le fil privé d'un collègue */
    if (typeof fil !== 'string' || !filValide(fil) || !estMembre(de, fil)) return { ok: false, raison: 'fil' };
    const t = propre(sansAdr(texte), TEXTE_MAX);
    if (!t) return { ok: false, raison: 'texte' };
    const niveau = NIVEAUX.includes(o.niveau) ? o.niveau : 'info';
    const now = maintenant();
    if (messages.filter(m => m.de === de && now - m.ts < 3600000).length >= PAR_HEURE) return { ok: false, raison: 'trop_de_messages' };
    if (messages.filter(m => m.fil === fil && IDS.has(m.de) && now - m.ts < 3600000).length >= PAR_HEURE_FIL) return { ok: false, raison: 'trop_de_messages_fil' };
    if (messages.some(m => m.de === de && m.fil === fil && m.texte === t && now - m.ts < DOUBLON_MS)) return { ok: false, raison: 'doublon' };
    /* La profondeur : celle du message auquel l'agent répond + 1 (donnée par l'appelant) ; un message spontané en compte 1. */
    const prof = Number.isInteger(o.prof) && o.prof >= 1 && o.prof <= 20 ? o.prof : 1;
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil, de, texte: t, niveau, lu: false, prof, mentions: mentionsDe(t, fil) };
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    notifier(m);
    if (m.mentions.some(id => id !== de)) declencher(m);
    return { ok: true, id: m.id, prof, mentions: m.mentions.slice() };
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
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil, de: 'systeme', texte: t, niveau: 'info', lu: true, prof: 0, mentions: [] };
    if (cle) m.cle = cle;
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    return { ok: true, id: m.id };
  }

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
    dossier: m.dossier || '', motif: m.motif || '', mentions: Array.isArray(m.mentions) ? m.mentions.slice() : [], prof: m.prof || 0, systeme: m.de === 'systeme' });
  const nonLus = f => messages.filter(m => m.fil === f && m.de !== 'justin' && m.lu !== true).length;
  /* Un fil pour la liste : le dernier message, son heure, les non-lus de Justin, les membres, le meneur, qui écrit. */
  const resume = f => {
    const ms = messages.filter(m => m.fil === f); const d = ms[ms.length - 1];
    return { fil: f, nom: nomDuFil(f), groupe: GROUPES.includes(f), nonLus: nonLus(f), membres: membresDe(f), meneur: meneurDe(f), ecrit: quiEcrit(f),
      dernier: d ? { ts: d.ts, de: d.de, texte: d.texte.slice(0, 120), niveau: d.niveau } : null };
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
  app.post('/api/monitor/conversations/envoyer', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const b = req.body || {};
    if (!filValide(b.fil)) return res.status(400).json({ error: 'Fil inconnu' });
    const t = propre(b.texte, TEXTE_PATRON_MAX);
    if (!t) return res.status(400).json({ error: 'Message vide' });
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: maintenant(), fil: b.fil, de: 'justin', texte: t, niveau: 'info', lu: true, prof: 0, mentions: mentionsDe(t, b.fil) };
    if (!ajouter(m)) return res.status(503).json({ error: 'Message non enregistré' });
    /* L'équipe peut répondre (le cité, l'agent du fil privé, ou le meneur du groupe) : sans attendre, et sans jamais faire échouer l'envoi. */
    declencher(m);
    res.json({ ok: true, message: vue(m), mentions: m.mentions.slice() });
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
    return messages.filter(m => m.fil === fil).slice(-k).map(m => ({ id: m.id, de: m.de, texte: m.texte, ts: m.ts, prof: m.prof || 0, mentions: Array.isArray(m.mentions) ? m.mentions.slice() : [] }));
  }

  return { parler, systeme, rappelClient, historique, lire, ecrit, quiEcrit, membres: membresDe, meneur: meneurDe, estMembre, filValide, nom: nomDuFil, MOTIFS, estIllisible: () => illisible };
};
module.exports.MOTIFS = MOTIFS;
module.exports.MEMBRES = MEMBRES;
module.exports.MENEUR = MENEUR;
module.exports.GROUPES = GROUPES;
module.exports.analyserMentions = analyserMentions;
module.exports.PAR_HEURE_FIL = PAR_HEURE_FIL;
