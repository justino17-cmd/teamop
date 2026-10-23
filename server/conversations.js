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
 */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const F = 'agents-messages.json';
const NIVEAUX = ['info', 'important', 'urgent'];
const MOTIFS = { demande_humain: 'demande à parler à une vraie personne', litige: 'litige à traiter', sensible: 'sujet sensible', blocage: 'client bloqué', urgence: 'urgence' };
const TEXTE_MAX = 600, TEXTE_PATRON_MAX = 1000, MESSAGES_MAX = 500, PAR_HEURE = 12, DOUBLON_MS = 24 * 3600 * 1000, LISTE_MAX = 100;

module.exports = function monterConversations(app, ctx) {
  const { DATA_DIR, monAdmin, monPatronStrict, agents } = ctx;
  const sansAdr = typeof ctx.sansAdresses === 'function' ? ctx.sansAdresses : (t => String(t || '').replace(/[^\s<>"'(),;:[\]]+@[^\s<>"'(),;:[\]]+/g, '(adresse)'));
  const pousse = typeof ctx.pousseNotif === 'function' ? ctx.pousseNotif : null;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const FORME_DOSSIER = ctx.formeDossier instanceof RegExp ? ctx.formeDossier : /^DOS-\d{6}$/;
  const dossierExiste = typeof ctx.dossierExiste === 'function' ? ctx.dossierExiste : (() => true);
  const IDS = new Map(agents.AGENTS.map(a => [a.id, a.nom]));
  const filValide = f => f === 'equipe' || IDS.has(f);
  const nomDuFil = f => f === 'equipe' ? 'Équipe' : (IDS.get(f) || f);

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
    if (fil !== 'equipe' && fil !== de) return { ok: false, raison: 'fil' };
    const t = propre(sansAdr(texte), TEXTE_MAX);
    if (!t) return { ok: false, raison: 'texte' };
    const niveau = NIVEAUX.includes(o.niveau) ? o.niveau : 'info';
    const now = maintenant();
    if (messages.filter(m => m.de === de && now - m.ts < 3600000).length >= PAR_HEURE) return { ok: false, raison: 'trop_de_messages' };
    if (messages.some(m => m.de === de && m.fil === fil && m.texte === t && now - m.ts < DOUBLON_MS)) return { ok: false, raison: 'doublon' };
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: now, fil, de, texte: t, niveau, lu: false };
    if (!ajouter(m)) return { ok: false, raison: 'ecriture' };
    notifier(m);
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

  const vue = m => ({ id: m.id, ts: m.ts, fil: m.fil, de: m.de, nom: m.de === 'justin' ? 'Toi' : (IDS.get(m.de) || m.de), texte: m.texte, niveau: m.niveau, lu: m.lu === true,
    dossier: m.dossier || '', motif: m.motif || '' });
  const nonLus = f => messages.filter(m => m.fil === f && m.de !== 'justin' && m.lu !== true).length;

  app.get('/api/monitor/conversations', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const fils = ['equipe', ...IDS.keys()].map(f => {
      const ms = messages.filter(m => m.fil === f); const d = ms[ms.length - 1];
      return { fil: f, nom: nomDuFil(f), nonLus: nonLus(f), dernier: d ? { ts: d.ts, de: d.de, texte: d.texte.slice(0, 120), niveau: d.niveau } : null };
    }).filter(x => x.dernier || x.fil === 'equipe');
    res.json({ ok: true, fils, nonLus: fils.reduce((s, x) => s + x.nonLus, 0), agents: [...IDS].map(([id, nom]) => ({ id, nom })) });
  });
  app.get('/api/monitor/conversations/:fil', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const f = String(req.params.fil || '');
    if (!filValide(f)) return res.status(400).json({ error: 'Fil inconnu' });
    res.json({ ok: true, fil: f, nom: nomDuFil(f), messages: messages.filter(m => m.fil === f).slice(-LISTE_MAX).map(vue) });
  });
  app.post('/api/monitor/conversations/envoyer', monPatronStrict, (req, res) => {
    if (illisible) return res.status(503).json({ error: 'Les conversations sont illisibles' });
    const b = req.body || {};
    if (!filValide(b.fil)) return res.status(400).json({ error: 'Fil inconnu' });
    const t = propre(b.texte, TEXTE_PATRON_MAX);
    if (!t) return res.status(400).json({ error: 'Message vide' });
    const m = { id: crypto.randomBytes(6).toString('hex'), ts: maintenant(), fil: b.fil, de: 'justin', texte: t, niveau: 'info', lu: true };
    if (!ajouter(m)) return res.status(503).json({ error: 'Message non enregistré' });
    /* L'agent du fil peut répondre (s'il en a un « cerveau » et le droit d'agir) : sans attendre, et sans jamais faire échouer l'envoi. */
    if (typeof ctx.surMessagePatron === 'function') { try { Promise.resolve(ctx.surMessagePatron(b.fil, t)).catch(e => console.error('réponse d’agent :', e && e.message)); } catch (e) {} }
    res.json({ ok: true, message: vue(m) });
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

  return { parler, rappelClient, historique, MOTIFS, estIllisible: () => illisible };
};
module.exports.MOTIFS = MOTIFS;
