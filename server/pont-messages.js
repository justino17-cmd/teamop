/* ══ LE PONT VERS OP MESSAGES — LA MESSAGERIE DES AGENTS S'AFFICHE DANS OP MESSAGES (28 octobre 2026) ═══════════════════════════════════════════
 *
 * Justin : « tu vas implanter OP MESSAGES à la place » ; « bascule directe » ; « l'historique est importé » ; « moi je récupère tout sur OP MESSAGES sur mon téléphone ».
 * Les agents, leurs règles, leurs réunions et la suppression de messages restent CE QU'ILS SONT : `conversations.js` reste le registre (`agents-messages.json`), c'est ce que les
 * agents relisent. OP MESSAGES devient le TRANSPORT et l'écran. Ce module est le côté Tour ; le côté OP MESSAGES est `pont-agents.js`, dans le service d'OP MESSAGES (le contrat des quatre routes y est écrit).
 *
 * Il fait six choses, et AUCUNE ne peut faire échouer un agent :
 *   1. INSTALLER  au démarrage (et chaque fois que le service dit « pas installé ») : les seize personnes-robots, l'espace, les groupes, une conversation directe par agent.
 *   2. RECOPIER   chaque message écrit au registre (agent, système, Justin) dans la conversation d'OP MESSAGES — par une FILE bornée (2 000), réessayée avec une attente qui grandit.
 *   3. IMPORTER   l'historique : tout message du registre que la table des recopies ne connaît pas encore part avec SA DATE D'ORIGINE, sans notification (la table fait que cela ne se fait
 *                 qu'une fois ; le `cid` « tour-<id> » le garantit aussi côté OP MESSAGES, même si la table était perdue). C'est aussi le RATTRAPAGE après une panne ou un redémarrage.
 *   4. LIRE       toutes les 3 s ce que JUSTIN a écrit ou supprimé dans OP MESSAGES. Un message entre par `conversations.justinEcrit` — LE MÊME chemin que la route de la Tour : mentions,
 *                 réveil de l'agent du fil, du meneur du groupe, des cités. Une suppression retire le message du registre (`conversations.retirer`, avec sa garde des rappels non lus).
 *   5. SUPPRIMER  dans OP MESSAGES ce que la Tour supprime.
 *   6. PHOTOGRAPHIER  les visages des agents (`icons/agents/<id>.jpg`), l'image du Système et celles des quatre groupes (`icons/groupes/<fil>.png`) : après chaque installation réussie, celles que le
 *                 service n'a pas encore (ou dont l'empreinte a changé) partent, UNE à la fois, vers `POST /api/pont/avatar`. Le service rend `avatars: { cible: empreinte }` à l'installation ;
 *                 on compare avec le SHA-256 du fichier. ⛔ Les noms de fichiers viennent des listes FIXES (les agents, les groupes du registre), JAMAIS de ce que le service répond. ⛔ Une photo
 *                 refusée, absente ou trop grosse ne retarde AUCUN message et ne compte pas comme une panne du pont (`echecMin`) : elle part en tâche de fond, et se retente à l'installation
 *                 suivante (le démarrage de la Tour). Rien à faire sur le VPS : le déploiement redémarre la Tour, qui réinstalle et envoie les photos toutes seules.
 *
 * ⛔ UN AGENT NE DÉPEND JAMAIS D'OP MESSAGES. Le crochet de `conversations.js` (`surAjout`, `surRetrait`) est appelé APRÈS l'écriture du registre, dans un `try`, et ne rend rien : un OP MESSAGES
 * à l'arrêt, lent, refusant le secret ou répondant n'importe quoi ne retarde, ne change et ne perd aucun message d'agent. La file est BORNÉE (au-delà, le plus ancien part — le rattrapage le
 * reprendra au prochain démarrage) ; le temps passé en échec se lit dans `/health` (`pont.echecMin`, surveillé), la file aussi (`pont.file`).
 * ⛔ SEUL JUSTIN FAIT RÉPONDRE UN AGENT. Ce que le pont lit vient d'`/api/pont/nouveaux`, qui ne rend que les actes de la personne de l'accès bêta de Justin dans les conversations du pont ; le
 * message de Justin est écrit au registre par `justinEcrit`, jamais celui d'une autre personne. Un message qui NE VIENT PAS de lui n'a aucun chemin jusqu'ici.
 * ⛔ LE SECRET (`config.opmsgPont.secret`, sur le VPS, jamais dans le dépôt) ne part que vers la BOUCLE LOCALE : une adresse qui n'est pas 127.0.0.1 / localhost refuse le montage.
 * ⛔ Ce qui est recopié reste ce que le registre contenait déjà : le texte d'un message d'agent est déjà passé par `sansAdresses` ; le rappel client ne porte qu'un numéro de dossier. OP MESSAGES
 * chiffre les corps au repos mais n'est PAS un chiffrement de bout en bout : le service lit le texte — c'est le même VPS, le même patron, sa décision.
 * ⛔ LES VOCAUX DE JUSTIN (28 octobre 2026 : « ça serait bien qu'ils puissent lire ça ») : un vocal est TRANSCRIT par l'ouvrier d'OP MESSAGES (whisper.cpp, sur notre serveur), puis son texte entre au registre
 * comme un texte de Justin marqué « 🎤 » (`justinEcrit`, donc mentions et réveil des agents, une seule fois). Le pont DEMANDE la transcription (`POST /api/pont/transcrire`), range le vocal en attente (sur
 * disque, avec le curseur), le redemande tant que l'ouvrier est occupé ou le budget épuisé, et DIT chaque issue qui n'est pas un texte (rien entendu, échec après un second essai, non installée, trop long, délai
 * de 15 minutes dépassé). Un texte rendu à la main (Justin touche « Voir la transcription » après un échec) finit aussi chez les agents. Le texte de Justin va alors aux agents, donc à Anthropic, comme un texte écrit.
 * ⚠️ Limites assumées (REPRISE.md) : seuls le TEXTE et les VOCAUX passent (une photo ou un sondage de Justin n'arrive pas aux agents, et le pont le lui dit) ; une modification de message dans OP MESSAGES ne revient
 * pas ; « supprimer pour moi » d'un message de Justin dans OP MESSAGES vaut suppression (il est seul à lire ces fils) ; un rappel client non lu ne se supprime pas depuis OP MESSAGES (409 côté Tour) ;
 * un groupe renommé dans la Tour ne se renomme pas là-bas.
 */
'use strict';

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const F = 'pont-messages.json';
const FILE_MAX = 2000, LOT_MAX = 25, LOT_OCTETS = 48000, LIES_MAX = 4000;
const VOCAL_DELAI_DEFAUT_MS = 15 * 60000;     // un vocal de Justin qui n'a pas reçu son texte au bout de ce temps : il est dit « délai dépassé » et on arrête d'attendre
const VOCAL_PAS_DEFAUT_MS = 20000;            // l'attente entre deux demandes de transcription refusées pour un motif passager (ouvrier occupé, budget de l'heure)
const VOCAL_ESSAIS_MAX = 2;            // un échec de calcul se retente UNE fois tout seul ; au second, Justin est prévenu (et peut réessayer à la main : « Voir la transcription »)
const VOCAUX_MAX = 200;                // les vocaux en attente d'un texte (persistés)
const VOCAL_TEXTE_MAX = 2400;          // ce qu'un vocal transcrit peut peser dans le registre (deux minutes de parole environ) ; au-delà : coupé, et DIT
const VOCAL_MARQUE = '🎤 ';            // la marque du texte d'un vocal : les agents savent que des mots peuvent être faux (machine), Justin voit d'où ça vient
const ANCIEN_MS = 120000;              // un message plus vieux que ça au moment de partir est un RATTRAPAGE : sa date d'origine, aucune notification
const NOTE_PAS_MS = 600000;            // « les agents ne lisent que le texte » : une fois par fil et par dix minutes
const ATTENTE_MAX_MS = 60000;           // la plus longue attente entre deux essais quand OP MESSAGES ne répond pas (les bancs l'abaissent)
const BOUCLE = /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d{2,5})?\/?$/;
const SECRET = /^[0-9a-f]{64}$/;
const RE_ID_PHOTO = /^[a-z][a-z0-9]{1,19}$/;     // un agent, un groupe, « systeme » : la seule forme qui entre dans un nom de fichier
const PHOTO_MAX = 2 * 1024 * 1024;               // le plafond de `pieces.avatarMax` côté OP MESSAGES : plus gros, le service dirait 413
const REJETS = ['fil_inconnu', 'auteur_inconnu', 'pas_membre', 'champ_invalide', 'justin_interdit'];

module.exports = function creerPontMessages(o) {
  const { DATA_DIR, conversations, agents, groupes, fichier } = o;
  const horloge = typeof o.horloge === 'function' ? o.horloge : Date.now;
  const fetchImpl = typeof o.fetchImpl === 'function' ? o.fetchImpl : fetch;
  const pasEnvoiMs = Number.isInteger(o.pasEnvoiMs) ? o.pasEnvoiMs : 500;
  const pasLireMs = Number.isInteger(o.pasLireMs) ? o.pasLireMs : 3000;
  const delaiMs = Number.isInteger(o.delaiMs) ? o.delaiMs : 5000;
  const attenteMax = Number.isInteger(o.attenteMaxMs) && o.attenteMaxMs >= 50 && o.attenteMaxMs <= ATTENTE_MAX_MS ? o.attenteMaxMs : ATTENTE_MAX_MS;
  /* les bancs règlent l'attente d'un vocal (jamais en production : 15 minutes de patience, 20 secondes entre deux demandes refusées) */
  const VOCAL_DELAI_MS = Number.isInteger(o.vocalDelaiMs) && o.vocalDelaiMs >= 200 ? o.vocalDelaiMs : VOCAL_DELAI_DEFAUT_MS;
  const VOCAL_PAS_MS = Number.isInteger(o.vocalPasMs) && o.vocalPasMs >= 20 ? o.vocalPasMs : VOCAL_PAS_DEFAUT_MS;
  const journal = (typeof o.journal === 'function') ? o.journal : ((nom, n) => console.error('pont messages : ' + nom + (n !== undefined ? ' (' + n + ')' : '')));
  const url = String(o.url || '').replace(/\/+$/, '');
  const secret = String(o.secret || '').toLowerCase();
  const dossierIcones = typeof o.iconesDir === 'string' && o.iconesDir ? o.iconesDir : path.join(__dirname, '..', 'icons');   // la Tour tourne depuis le clone COMPLET du dépôt
  /* ⛔ fermé sans secret valable ni adresse de boucle locale : on rend `null`, l'appelant ne monte rien */
  if (!SECRET.test(secret) || !BOUCLE.test(url + '/')) return null;
  if (!conversations || !agents || !Array.isArray(agents.AGENTS) || !fichier) return null;

  /* ── L'état rangé : le curseur d'OP MESSAGES et la table des recopies (id du registre ↔ numéro dans la conversation) ── */
  const etatFichier = fichier.charger(F, { v: 1, curseur: null, lies: [], vocaux: [] });
  const illisible = fichier.illisible(F);
  let curseur = Number.isInteger(etatFichier.curseur) ? etatFichier.curseur : null;
  const parId = new Map(), parSeq = new Map();           // id → {fil, seq} ; "fil#seq" → id
  for (const x of Array.isArray(etatFichier.lies) ? etatFichier.lies : []) {
    if (Array.isArray(x) && typeof x[0] === 'string' && typeof x[1] === 'string' && Number.isInteger(x[2])) { parId.set(x[0], { fil: x[1], seq: x[2] }); parSeq.set(x[1] + '#' + x[2], x[0]); }
  }
  /* Les vocaux de Justin qui attendent leur texte : { fil, seq, depuis, essais, prochain, demande } — rangés avec le curseur, pour qu'un redémarrage de la Tour ne perde pas un vocal (le curseur
     d'OP MESSAGES, lui, est déjà passé dessus : sans cette liste, il ne reviendrait jamais). */
  const vocaux = [];
  for (const x of Array.isArray(etatFichier.vocaux) ? etatFichier.vocaux : []) {
    if (x && typeof x.fil === 'string' && Number.isInteger(x.seq) && Number.isFinite(x.depuis)) vocaux.push({ fil: x.fil, seq: x.seq, depuis: x.depuis, essais: Number.isInteger(x.essais) ? x.essais : 0, prochain: Number.isFinite(x.prochain) ? x.prochain : 0, demande: x.demande === true });
  }
  function sauver() {
    if (illisible) return false;
    const lies = [];
    for (const [id, v] of parId) lies.push([id, v.fil, v.seq]);
    return fichier.ecrire(F, { v: 1, curseur, lies: lies.slice(-LIES_MAX), vocaux: vocaux.slice(-VOCAUX_MAX) });
  }
  function lier(id, fil, seq) {
    parId.set(id, { fil, seq }); parSeq.set(fil + '#' + seq, id);
    while (parId.size > LIES_MAX) { const [vieux, v] = parId.entries().next().value; parId.delete(vieux); parSeq.delete(v.fil + '#' + v.seq); }
  }
  function delier(id) { const v = parId.get(id); if (v) { parId.delete(id); parSeq.delete(v.fil + '#' + v.seq); } }

  /* ── La file : des messages à recopier, des suppressions à dire, des notes du pont ── */
  const file = [], enFile = new Set();
  const compte = { recopies: 0, rejets: 0, abandons: 0, lus: 0, suppressionsLues: 0, suppressionsRefusees: 0, notes: 0, vocaux: 0, transcrits: 0, vocauxSansTexte: 0, photos: 0, photosRefusees: 0, photosAbsentes: 0 };
  let installe = false, photosEnCours = false, enCours = false, lectureEnCours = false, arrete = false, echecDepuis = illisible ? horloge() : 0, attenteJusqua = 0, attenteMs = 0, derniereNote = {};
  let minuteurEnvoi = null, minuteurLecture = null;

  function enfiler(it) {
    if (it.id) { if (enFile.has(it.id) && it.k === 'm') return; if (it.k === 'm') enFile.add(it.id); }
    file.push(it);
    while (file.length > FILE_MAX) { const x = file.shift(); sortieDeFile(x); compte.abandons++; }
    return true;
  }
  const sortieDeFile = (it) => { if (it.id && it.k === 'm') enFile.delete(it.id); };
  /* ⛔ ON RETIRE UN ÉLÉMENT DE LA FILE PAR SON IDENTITÉ, jamais « le premier » : pendant qu'un lot voyage, la file peut avoir rogné sa tête (elle est pleine) — retirer le premier
     emporterait alors un message qui n'est pas parti. */
  const quitter = (it) => { const i = file.indexOf(it); if (i >= 0) file.splice(i, 1); sortieDeFile(it); };

  /* ── Les appels : toujours bornés dans le temps, jamais une exception qui remonte ── */
  async function appeler(methode, chemin, corps) {
    let r;
    try {
      r = await fetchImpl(url + chemin, { method: methode, headers: Object.assign({ 'X-OPM-Pont': secret, Accept: 'application/json' }, corps === undefined ? {} : { 'Content-Type': 'application/json' }),
        body: corps === undefined ? undefined : JSON.stringify(corps), redirect: 'error', signal: AbortSignal.timeout(delaiMs) });
    } catch (e) { return panne(); }
    let j = null; try { j = await r.json(); } catch (e) { j = null; }
    if (r.status >= 200 && r.status < 300 && j && typeof j === 'object') { echecDepuis = 0; attenteMs = 0; attenteJusqua = 0; return { statut: r.status, j }; }
    if (r.status === 409 && j && j.error === 'pont_non_installe') { installe = false; return { statut: 409, j }; }
    if (r.status === 400) return { statut: 400, j };
    /* 404 : le service refuse (secret différent, pont inactif de son côté) ; 429 et 5xx : il est occupé ou en panne. Dans tous les cas la file attend, rien n'est perdu. */
    if (r.status === 429) { const s = parseInt(r.headers.get('retry-after') || '', 10); return panne(Number.isInteger(s) && s > 0 ? s * 1000 : 0); }
    return panne(r.status === 404 ? attenteMax : 0);
  }
  function panne(minimum) {
    if (!echecDepuis) echecDepuis = horloge();
    attenteMs = Math.min(attenteMax, Math.max(minimum || 0, attenteMs ? attenteMs * 2 : Math.min(1000, attenteMax)));
    attenteJusqua = horloge() + attenteMs;
    return null;
  }
  const enAttente = () => horloge() < attenteJusqua;

  /* ── 1. installer ── */
  async function installer() {
    const corps = {
      agents: agents.AGENTS.map(a => ({ id: a.id, nom: a.nom, role: a.role })),
      groupes: groupes.map(fil => ({ fil, nom: conversations.nom(fil), membres: conversations.membres(fil).map(m => m.id) })),
    };
    const r = await appeler('POST', '/api/pont/installer', corps);
    if (!r || r.statut !== 200 || r.j.ok !== true) { if (r && r.statut === 400) { compte.rejets++; journal('installation refusée (400)'); } return false; }
    installe = true;
    rattraper();
    /* ⛔ en TÂCHE DE FOND, jamais attendue : les messages ne dépendent pas des photos (une photo lente ou refusée ne retarde rien) */
    photographier(r.j.avatars).catch(() => {});
    return true;
  }

  /* ── 6. photographier ── */
  /* Les cibles et leurs fichiers, tirés de LISTES FIXES : les agents du registre, « systeme », les groupes du registre. Rien de ce que le service répond n'entre dans un chemin. */
  function photosVoulues() {
    const v = [];
    for (const a of agents.AGENTS) if (a && typeof a.id === 'string' && RE_ID_PHOTO.test(a.id)) v.push({ cible: a.id, fichier: path.join(dossierIcones, 'agents', a.id + '.jpg') });
    v.push({ cible: 'systeme', fichier: path.join(dossierIcones, 'groupes', 'systeme.png') });
    for (const fil of groupes) if (typeof fil === 'string' && RE_ID_PHOTO.test(fil)) v.push({ cible: fil, fichier: path.join(dossierIcones, 'groupes', fil + '.png') });
    return v;
  }
  /* Un envoi de photo : jamais une exception, et JAMAIS un effet sur l'attente de la file (`panne()`, `echecDepuis`) — une photo n'est pas un message. → le code HTTP, 0 si le service n'a pas répondu. */
  async function envoyerPhoto(cible, octets, empreinte) {
    try {
      const r = await fetchImpl(url + '/api/pont/avatar?cible=' + encodeURIComponent(cible), { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(delaiMs), body: octets,
        headers: { 'X-OPM-Pont': secret, 'X-OPM-Empreinte': empreinte, 'Content-Type': 'application/octet-stream', Accept: 'application/json' } });
      try { await r.arrayBuffer(); } catch (e) {}
      return r.status;
    } catch (e) { return 0; }
  }
  async function photographier(deja) {
    if (photosEnCours || arrete) return;
    photosEnCours = true;
    const posees = deja && typeof deja === 'object' && !Array.isArray(deja) ? deja : {};
    let absentes = 0;
    try {
      for (const { cible, fichier } of photosVoulues()) {
        if (arrete) return;
        let octets;
        try {
          const st = await fs.promises.stat(fichier);
          if (!st.isFile() || st.size === 0 || st.size > PHOTO_MAX) { compte.photosAbsentes++; absentes++; continue; }
          octets = await fs.promises.readFile(fichier);
        } catch (e) { compte.photosAbsentes++; absentes++; continue; }       // un fichier absent se saute : le pont ne s'arrête pas pour une image
        const empreinte = crypto.createHash('sha256').update(octets).digest('hex');
        if (Object.prototype.hasOwnProperty.call(posees, cible) && posees[cible] === empreinte) continue;       // le service l'a déjà, à l'identique
        const code = await envoyerPhoto(cible, octets, empreinte);
        if (code === 200) { compte.photos++; continue; }
        compte.photosRefusees++;
        /* le service ne répond pas, refuse le secret, est occupé ou n'est plus installé : inutile d'insister photo après photo, la série reprendra à l'installation suivante.
           Un refus qui ne concerne QUE cette image (400, 413, 415) : on passe à la suivante, celle-ci sera retentée au prochain démarrage. */
        if (![400, 413, 415].includes(code)) return;
      }
    } finally {
      if (absentes) journal('photos : ' + absentes + ' fichier(s) absent(s), vide(s) ou trop gros, non envoyé(s)');
      photosEnCours = false;
    }
  }

  /* ── 3. importer / rattraper : tout ce que la table ne connaît pas encore, du plus ancien au plus récent ── */
  function rattraper() {
    let n = 0;
    for (const m of conversations.tous().sort((a, b) => a.ts - b.ts)) {
      if (parId.has(m.id) || enFile.has(m.id)) continue;
      enfiler(elementDe(m, true)); n++;
    }
    return n;
  }
  function elementDe(m, rattrapage) {
    const importe = rattrapage === true || m.de === 'justin' || horloge() - m.ts > ANCIEN_MS;
    return { k: 'm', id: m.id, fil: m.fil, de: m.de, texte: m.texte, ts: m.ts, importe, lu: m.lu === true || m.de === 'justin',
      push: !!(!importe && m.niveau && m.niveau !== 'info' && m.de !== 'justin' && m.de !== 'systeme') };
  }

  /* ── 2. recopier : les crochets de `conversations.js` ── */
  function surAjout(m) {
    if (arrete || illisible || !m || typeof m.id !== 'string' || parId.has(m.id)) return;
    enfiler(elementDe(m, false));
    petitCoupDePouce();
  }
  function surRetrait(x) {
    if (arrete || illisible || !x || typeof x.id !== 'string') return;
    enfiler({ k: 's', id: x.id, fil: x.fil });
    petitCoupDePouce();
  }
  let pouce = null;
  function petitCoupDePouce() { if (pouce) return; pouce = setTimeout(() => { pouce = null; envoyer(); }, 0); if (pouce.unref) pouce.unref(); }

  /* Le travail d'envoi : UN à la fois ; il s'arrête au premier échec (la file garde tout) et reprend à l'attente suivante. */
  async function envoyer() {
    if (enCours || arrete || illisible || enAttente()) return;
    enCours = true;
    try {
      if (!installe && !(await installer())) return;
      while (file.length && !arrete) {
        const tete = file[0];
        if (tete.k === 's') {
          const v = parId.get(tete.id);
          if (!v) { quitter(tete); continue; }                       // jamais recopié (ou déjà retiré) : rien à retirer là-bas
          const r = await appeler('POST', '/api/pont/supprimer', { fil: v.fil, seq: v.seq });
          if (!r) return;
          if (r.statut === 409) return;                              // pas installé : la boucle réinstalle au tour suivant
          quitter(tete); delier(tete.id); sauver();
          continue;
        }
        /* un lot de messages consécutifs de même sorte (importés ou en direct), dans la limite du nombre et du poids */
        const lot = []; let octets = 0;
        for (const it of file) {
          if (it.k === 's' || it.importe !== tete.importe || lot.length >= LOT_MAX) break;
          const part = Buffer.byteLength(it.texte, 'utf8') + 160;          // des OCTETS : OP MESSAGES lit 64 Ko au plus, et un émoji en pèse quatre
          if (lot.length && octets + part > LOT_OCTETS) break;
          lot.push(it); octets += part;
        }
        const messages = lot.map((it, i) => {
          const m = { fil: it.fil, de: it.de, texte: it.texte, cid: it.k === 'n' ? it.cid : 'tour-' + it.id };
          if (it.importe) { m.ts = it.ts; m.lu = it.lu === true; }
          else if (it.push) m.push = true;
          return m;
        });
        const r = await appeler('POST', '/api/pont/poster', { messages, import: tete.importe === true });
        if (!r) return;
        if (r.statut === 409) return;
        if (r.statut === 400) { for (const it of lot) { quitter(it); compte.rejets++; } journal('lot refusé (400)'); continue; }
        const res = Array.isArray(r.j.resultats) ? r.j.resultats : [];
        for (let i = 0; i < lot.length; i++) {
          const it = lot[i], x = res[i];
          if (x && x.ok === true) { if (it.k === 'm') { lier(it.id, it.fil, x.seq); compte.recopies++; } else compte.notes++; quitter(it); }
          else if (x && REJETS.includes(x.raison)) { quitter(it); compte.rejets++; journal('message refusé : ' + x.raison); }
          else { it.essais = (it.essais || 0) + 1; if (it.essais >= 5) { quitter(it); compte.rejets++; journal('message abandonné'); } else { sauver(); return; } }
        }
        sauver();
      }
    } catch (e) { panne(); journal('envoi : ' + ((e && e.name) || 'erreur')); }
    finally { enCours = false; }
  }

  /* ── 4. lire ce que Justin fait dans OP MESSAGES ── */
  function noteTexteSeul(fil) {
    const t = horloge();
    if (derniereNote[fil] && t - derniereNote[fil] < NOTE_PAS_MS) return;
    derniereNote[fil] = t;
    enfiler({ k: 'n', fil, de: 'systeme', texte: 'Les agents ne lisent que le texte : ce que tu viens d’envoyer n’a pas été transmis.', ts: t, importe: false, cid: 'note-' + t.toString(36) + Math.random().toString(36).slice(2, 8) });
  }
  /* Une ligne du Système dans le fil, SANS limite de fréquence (contrairement à `noteTexteSeul`) : chaque vocal a son propre sort à dire. Le `cid` est propre à la note. */
  function noteSysteme(fil, texte) {
    const t = horloge();
    enfiler({ k: 'n', fil, de: 'systeme', texte, ts: t, importe: false, cid: 'note-' + t.toString(36) + Math.random().toString(36).slice(2, 8) });
    petitCoupDePouce();
  }
  const vocalDe = (fil, seq) => vocaux.find(v => v.fil === fil && v.seq === seq);
  const vocalRetirer = (v) => { const i = vocaux.indexOf(v); if (i >= 0) vocaux.splice(i, 1); };
  /* Le texte d'un vocal entre au registre COMME UN TEXTE de Justin (`justinEcrit` : mentions, réveil de l'agent du fil, du meneur du groupe), marqué 🎤. `lier` : le vocal supprimé ensuite emporte son texte
     par le chemin des suppressions. ⛔ Une seule fois : `parSeq` dit que ce vocal a déjà donné un message. */
  function vocalTexteEntre(fil, seq, texte) {
    let t = String(texte).replace(/\s+/g, ' ').trim();
    if (!t) return true;
    const max = VOCAL_TEXTE_MAX - VOCAL_MARQUE.length;
    if (t.length > max) { const c = t.slice(0, max - 2), i = c.lastIndexOf(' '); t = (i > max * 0.6 ? c.slice(0, i) : c) + ' […]'; }
    const r = conversations.justinEcrit(fil, VOCAL_MARQUE + t, { sansEcho: true, max: VOCAL_TEXTE_MAX });
    if (!r.ok) return r.statut !== 503;                          // registre qui ne s'écrit pas : on réessaie ; vide ou fil inconnu : on passe
    lier(r.message.id, fil, seq); compte.transcrits++;
    return true;
  }
  function traiterTranscription(e) {
    if (!conversations.filValide(e.fil) || parSeq.has(e.fil + '#' + e.seq)) return true;
    const v = vocalDe(e.fil, e.seq);
    if (e.etat === 'prete' && typeof e.texte === 'string') {
      /* aussi un texte que NOUS n'avons pas demandé : Justin a touché « Voir la transcription » après un échec (ou avant nous) — le vocal est le sien, il doit finir chez les agents */
      if (!vocalTexteEntre(e.fil, e.seq, e.texte)) return false;
      if (v) vocalRetirer(v);
      return true;
    }
    if (!v) return true;                                          // un échec ou un vide d'un vocal qu'on n'attendait pas : la page le dit déjà, rien à ajouter
    if (e.etat === 'vide') { vocalRetirer(v); compte.vocauxSansTexte++; noteSysteme(e.fil, 'Je n’ai rien entendu dans ton vocal : il n’a pas été transmis.'); return true; }
    /* échec du calcul : une seconde demande toute seule, puis Justin est prévenu */
    v.demande = false; v.essais++;
    if (v.essais < VOCAL_ESSAIS_MAX) { v.prochain = horloge() + VOCAL_PAS_MS; return true; }
    vocalRetirer(v); compte.vocauxSansTexte++;
    noteSysteme(e.fil, 'Ton vocal n’a pas pu être transcrit : il n’a pas été transmis. Touche « Voir la transcription » sous ton vocal pour réessayer, et je le transmettrai.');
    return true;
  }
  /* Demander les textes des vocaux en attente, un par un, à la boucle de lecture : le service répond `{ ok, etat }` ou `{ ok:false, raison }` (toujours un 200 : un refus passager n'est pas une panne). */
  async function demanderVocaux() {
    /* ⛔ L'ORDRE D'UNE CONVERSATION SE GARDE (28 octobre 2026) : un vocal refusé passagèrement (occupée, « mes vocaux », budget, indisponible) ou qui attend sa reprise RETIENT les vocaux suivants DU MÊME
       FIL dans cette passe. Sans ça, avec deux places par personne, le 3e vocal d'une rafale attendait VOCAL_PAS_MS pendant que le 4e — jamais demandé — passait devant dès qu'une place se libérait :
       le registre des agents recevait le texte du 4e avant celui du 3e, et ils répondaient à Justin dans l'ordre inverse de ce qu'il avait dit. Un autre fil n'attend personne. */
    const retenus = new Set();
    for (const v of vocaux.slice()) {
      if (arrete) return;
      if (horloge() - v.depuis > VOCAL_DELAI_MS) {
        vocalRetirer(v); compte.vocauxSansTexte++;
        noteSysteme(v.fil, 'Ton vocal n’a pas été transcrit à temps (délai dépassé) : il n’a pas été transmis. Touche « Voir la transcription » sous ton vocal pour réessayer, et je le transmettrai.'); sauver();
        continue;
      }
      if (v.demande) continue;                                    // sa demande est acceptée : il n'a pas à retenir les suivants (l'ouvrier les prend dans l'ordre d'arrivée)
      if (retenus.has(v.fil)) continue;
      if (v.prochain > horloge()) { retenus.add(v.fil); continue; }
      const r = await appeler('POST', '/api/pont/transcrire', { fil: v.fil, seq: v.seq });
      if (!r) return;                                             // OP MESSAGES ne répond pas : la boucle suivante
      if (r.statut === 409) return;                               // pas installé : la boucle réinstalle
      if (r.statut === 400) { vocalRetirer(v); compte.rejets++; sauver(); continue; }
      if (!vocalDe(v.fil, v.seq)) continue;                       // l'événement du résultat est passé pendant l'attente
      if (r.j.ok === true) { v.demande = true; sauver(); continue; }
      const raison = r.j.raison;
      if (raison === 'absente') { vocalRetirer(v); compte.vocauxSansTexte++; noteSysteme(v.fil, 'La transcription des vocaux n’est pas installée sur le serveur : ton vocal n’a pas été transmis.'); }
      else if (raison === 'trop_long') { vocalRetirer(v); compte.vocauxSansTexte++; noteSysteme(v.fil, 'Ton vocal est trop long pour être transcrit : il n’a pas été transmis.'); }
      else if (raison === 'introuvable') vocalRetirer(v);       // supprimé entre-temps : rien à transmettre
      else { v.prochain = horloge() + Math.max(VOCAL_PAS_MS, Math.min(300000, (Number(r.j.attente) || 0) * 1000)); retenus.add(v.fil); }   // indisponible, occupee, mes_vocaux, budget : on retentera, dans le délai de 15 minutes
      sauver();
    }
  }
  function traiter(e) {
    if (e.type === 'transcription') return traiterTranscription(e);
    if (e.type === 'message') {
      if (!conversations.filValide(e.fil) || parSeq.has(e.fil + '#' + e.seq)) return true;
      if (e.genre === 'vocal') {
        if (!vocalDe(e.fil, e.seq)) { vocaux.push({ fil: e.fil, seq: e.seq, depuis: horloge(), essais: 0, prochain: 0, demande: false }); compte.vocaux++; while (vocaux.length > VOCAUX_MAX) vocaux.shift(); }
        return true;
      }
      if (e.genre !== 'texte' || typeof e.texte !== 'string') { noteTexteSeul(e.fil); return true; }
      const r = conversations.justinEcrit(e.fil, e.texte, { sansEcho: true });
      if (!r.ok) return r.statut !== 503;                          // vide ou fil inconnu : on passe ; registre qui ne s'écrit pas : on réessaie (le curseur n'avance pas)
      lier(r.message.id, e.fil, e.seq); compte.lus++;
      return true;
    }
    if (e.type === 'suppression') {
      const vp = vocalDe(e.fil, e.seq); if (vp) vocalRetirer(vp);            // un vocal supprimé n'attend plus son texte
      const id = parSeq.get(e.fil + '#' + e.seq);
      if (!id) return true;
      const r = conversations.retirer(id, { sansEcho: true });
      if (r.ok || r.statut === 404) { delier(id); compte.suppressionsLues++; return true; }
      if (r.statut === 409) { compte.suppressionsRefusees++; return true; }   // un rappel client non lu ne se retire pas d'ici : il reste dans la Tour
      return false;
    }
    return true;
  }
  async function lire() {
    if (lectureEnCours || arrete || illisible || !installe || enAttente()) return;
    lectureEnCours = true;
    try {
      for (let tour = 0; tour < 20; tour++) {
        const r = await appeler('GET', '/api/pont/nouveaux' + (curseur === null ? '' : '?depuis=' + curseur));
        if (!r) return;
        if (r.statut !== 200 || !Number.isInteger(r.j.curseur)) return;
        if (curseur === null) { curseur = r.j.curseur; sauver(); return; }     // le premier passage ne fait que poser le curseur : rien n'existait avant l'installation
        let tout = true;
        for (const e of Array.isArray(r.j.evenements) ? r.j.evenements : []) {
          if (!traiter(e)) { tout = false; break; }
          if (Number.isInteger(e.gid)) curseur = Math.max(curseur, e.gid);
          sauver();
        }
        if (!tout) return;
        curseur = Math.max(curseur, r.j.curseur); sauver();
        if (r.j.plein !== true) break;
      }
      if (vocaux.length) await demanderVocaux();
    } catch (e) { panne(); journal('lecture : ' + ((e && e.name) || 'erreur')); }
    finally { lectureEnCours = false; }
  }

  /* ── Vie du module ── */
  function demarrer() {
    if (illisible) { journal('⛔ ' + F + ' illisible : le pont ne démarre pas (le réparer, puis redémarrer)'); return; }
    minuteurEnvoi = setInterval(() => { envoyer(); }, pasEnvoiMs); if (minuteurEnvoi.unref) minuteurEnvoi.unref();
    minuteurLecture = setInterval(() => { lire(); }, pasLireMs); if (minuteurLecture.unref) minuteurLecture.unref();
    envoyer();
  }
  function arreter() { arrete = true; clearInterval(minuteurEnvoi); clearInterval(minuteurLecture); if (pouce) clearTimeout(pouce); }

  /* ⛔ `/health` : des NOMBRES — minutes d'échec d'affilée (surveillé : la surveillance crie à 30), taille de la file (surveillée). Jamais un texte, un fil, un identifiant. */
  const sante = () => ({ echecMin: echecDepuis ? Math.floor((horloge() - echecDepuis) / 60000) : 0, file: file.length });

  return { demarrer, arreter, surAjout, surRetrait, sante,
    /* pour les bancs */
    _envoyer: envoyer, _lire: lire, _installer: installer, _etat: () => Object.assign({ installe, curseur, file: file.length, lies: parId.size, enAttente: enAttente(), echecDepuis, vocauxEnAttente: vocaux.length, vocauxDemandes: vocaux.filter(x => x.demande).length }, compte), _photographier: photographier, _attendreFini: async () => { for (let i = 0; i < 400 && (enCours || lectureEnCours || photosEnCours); i++) await new Promise(r => setTimeout(r, 5)); } };
};
module.exports.F = F;
