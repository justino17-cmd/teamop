/* LES AGENTS DE LA PLATEFORME, ASSEMBLÉS (23 octobre 2026) — Max, Jules, Théo, Nina, Inès, Victor.
 *
 * Justin : « je veux des agents qui gèrent toutes les catégories de la Tour ». Chaque agent a son fichier (`agent-max.js`, `agent-jules.js`, `agent-theo.js`,
 * `agent-nina.js`, `agent-ines.js`, `agent-victor.js`) ; ce fichier-ci les MONTE ensemble, leur donne la mémoire commune (`plateforme-etat.js`), le registre des
 * incidents (`incidents-agents.js`), la cadence, les routes de la Tour et les relevés fermés que la messagerie leur confie. Il n'arme sa minuterie que sur
 * `demarrer()` : un banc le monte et joue `tic()` à sa propre horloge.
 *
 * ⛔ Cadence : le CODE surveille, le modèle ne juge que ce qui est neuf (Jules : un diagnostic par épisode ; Victor : le point du matin, une redistribution
 *    quand la charge change, un arbitrage quand une chaîne se coupe). Max, Théo et Nina : toutes les 5 minutes ; Jules : à chaque minute (il ne fait rien
 *    sans épisode neuf) ; Inès : toutes les 10 minutes (une relecture par jour) ; Victor : à chaque minute (8 h – midi pour le point).
 * ⛔ Une route qui ENGAGE (faire passer un agent, dire le point, clore une demande RGPD) est réservée au patron (`monPatronStrict`) et déclarée dans `MON_GESTES`.
 *    La lecture (`GET`) est celle de la Tour (`monAdmin`) ; elle ne rend que des nombres, des clés de NOS tables et des phrases composées ici — aucun texte forgeable.
 */
'use strict';
const PLATEFORME_ETAT = require('./plateforme-etat');
const INCIDENTS = require('./incidents-agents');
const R = require('./plateforme-regles');
const O = require('./plateforme-outils');

const MIN = 60000;
const ORDRE = ['max', 'theo', 'nina', 'jules', 'ines', 'victor'];
const PAS = { max: 5, theo: 5, nina: 5, jules: 1, ines: 10, victor: 1 };
const DEBUT_RETARD_MS = 20000;

module.exports = function agentsPlateforme(app, ctx) {
  ctx = ctx || {};
  const { agents, conversations, cerveau, monAdmin, monPatronStrict } = ctx;
  const maintenant = typeof ctx.maintenant === 'function' ? ctx.maintenant : Date.now;
  const lire = f => { try { return typeof f === 'function' ? f() : null; } catch (e) { return null; } };
  const etat = PLATEFORME_ETAT({ fichier: ctx.fichier, maintenant });
  const incidents = INCIDENTS({ lire: () => (typeof ctx.issues === 'function' ? ctx.issues() : []), sauver: () => { try { if (typeof ctx.sauverIssues === 'function') ctx.sauverIssues(); } catch (e) {} }, maintenant });

  /* L'état de santé : la MÊME fonction que /health, sans vider sa fenêtre (`santeCorps(false)`), passée par JSON — ce que la route publierait, rien d'autre. */
  const sante = async () => { try { const j = typeof ctx.sante === 'function' ? await ctx.sante() : null; return j && typeof j === 'object' ? JSON.parse(JSON.stringify(j)) : null; } catch (e) { return null; } };

  const commun = { agents, conversations, etat, incidents, maintenant, cerveau, equipe: ctx.equipe };
  const max = require('./agent-max')(Object.assign({}, commun, { sante }));
  const jules = require('./agent-jules')(commun);
  const theo = require('./agent-theo')(Object.assign({}, commun, { sante, sauvegarde: ctx.sauvegarde, conservation: ctx.conservation }));
  const nina = require('./agent-nina')(Object.assign({}, commun, { sante, securite: ctx.securite, contrats: ctx.contrats }));
  const ines = require('./agent-ines')(Object.assign({}, commun, { courriels: ctx.courriels }));
  /* Victor lit des relevés fermés ; les alarmes viennent de NOTRE mémoire d'épisodes (ouverts, dont critiques), jamais d'un texte d'incident. */
  const alarmes = () => { const o = etat.ouverts(); return { ouvertes: o.length, critiques: o.filter(e => e.niveau === 'critique').length }; };
  const victor = require('./agent-victor')(Object.assign({}, commun, { rgpd: () => nina.rgpd(), contrats: () => lire(ctx.contrats && ctx.contrats.etat && (() => ctx.contrats.etat())),
    courrier: ctx.courrier, reprise: ctx.reprise, clients: ctx.clients, alarmes, qualite: () => ines.faits.qualite() }));
  const mods = { max, theo, nina, jules, ines, victor };

  /* ── la cadence ── */
  let enCours = false;
  const dernier = {};
  async function tic() {
    if (enCours) return { saute: 'en_cours' };
    enCours = true;
    const sortie = {};
    try {
      const now = maintenant();
      for (const id of ORDRE) {
        if (now - (dernier[id] || 0) < PAS[id] * MIN) continue;
        dernier[id] = now;
        try { sortie[id] = await mods[id].passer(); }
        catch (e) { sortie[id] = { saute: 'erreur' }; console.error('agent ' + id + ' :', (e && e.message) || e); }
      }
    } finally { enCours = false; }
    return sortie;
  }
  let minuteries = [];
  function demarrer() {
    arreter();
    const premiere = setTimeout(() => { tic().catch(e => console.error('agents de la plateforme :', e && e.message)); }, DEBUT_RETARD_MS);
    const boucle = setInterval(() => { tic().catch(e => console.error('agents de la plateforme :', e && e.message)); }, MIN);
    for (const t of [premiere, boucle]) if (t && t.unref) t.unref();
    minuteries = [premiere, boucle];
  }
  function arreter() { for (const t of minuteries) { clearTimeout(t); clearInterval(t); } minuteries = []; }

  /* ── les relevés fermés que la messagerie confie aux agents : des NOMBRES, des booléens, des CLÉS de nos tables (jamais un texte) ── */
  const minutes = t => Math.max(0, Math.round((maintenant() - t) / MIN));
  const faits = {
    plateforme: () => {
      const o = etat.ouverts();
      const actives = {}; for (const e of o) actives[e.cle] = minutes(e.depuis);
      return { episodesOuverts: o.length, critiques: o.filter(e => e.niveau === 'critique').length, importants: o.filter(e => e.niveau === 'important').length, actives,
        retablisSur24h: etat.passes(maintenant() - 86400000).length, memoireIllisible: etat.illisible() };
    },
    incidents: () => { const c = incidents.compteurs(); return c ? { ouverts: c.ouverts, haute: c.haute, nouveau: c.nouveau, sansPersonne: c.sansPersonne, plusVieuxSansPersonneH: c.plusVieuxSansPersonneH, corriges30j: c.corriges30j, parApp: c.parApp } : null; },
    sauvegardes: () => lire(theo.faits && theo.faits.sauvegardes),
    conservation: () => lire(theo.faits && theo.faits.conservation),
    securite: () => lire(nina.faits && nina.faits.securite),
    contrats: () => lire(nina.faits && nina.faits.contrats),
    qualite: () => lire(ines.faits && ines.faits.qualite),
  };

  /* ── ce que la Tour lit : un seul relevé ── */
  async function resume() {
    const now = maintenant();
    const modeDe = id => { try { return agents.modeDe(id); } catch (e) { return 'arret'; } };
    const par = {};
    for (const id of ORDRE) {
      let e = {}; try { e = mods[id].etat() || {}; } catch (x) { e = {}; }
      par[id] = Object.assign({ mode: modeDe(id), pasMin: PAS[id] }, e);
    }
    /* le relevé des sauvegardes est une PROMESSE (il lit la santé) : sérialisé tel quel, il sortait `{}` — le contrat de la route mentait (revue du 23 octobre 2026) */
    let sauvegardes = null; try { sauvegardes = await faits.sauvegardes(); } catch (e) { sauvegardes = null; }
    const ep = e => ({ id: e.id, proprio: e.proprio, cle: e.cle, zone: e.zone, niveau: e.niveau, depuis: e.depuis, fin: e.fin || 0, annonce: !!e.annonce, incident: !!e.incident, pris: !!e.pris, texte: R.texteDe(e.cle, e.valeurs) || e.cle });
    return { ok: true, ts: now, illisible: etat.illisible(), agents: par,
      episodes: etat.episodes().sort((a, b) => b.depuis - a.depuis).slice(0, 30).map(ep),
      recents: etat.passes(now - 7 * 86400000).slice(0, 12).map(x => ({ cle: x.cle, depuis: x.depuis, fin: x.fin, niveau: x.niveau, texte: R.texteDe(x.cle, {}) || x.cle })),
      incidents: lire(faits.incidents), rgpd: lire(() => nina.rgpd()), securite: lire(faits.securite), sauvegardes, conservation: lire(faits.conservation),
      qualite: lire(faits.qualite), victor: lire(() => victor.etat()), ines: lire(() => ines.etat()) };
  }

  /* ── les routes ── */
  if (app && typeof app.get === 'function') {
    app.get('/api/monitor/agents/plateforme', monAdmin, async (req, res) => { try { res.json(await resume()); } catch (e) { console.error('agents de la plateforme :', (e && e.message) || e); res.status(500).json({ error: 'Relevé non lu' }); } });
    app.post('/api/monitor/agents/plateforme/passer', monPatronStrict, async (req, res) => {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (typeof b.agent !== 'string' || !ORDRE.includes(b.agent)) return res.status(400).json({ error: 'Agent : max, theo, nina, jules, ines ou victor' });
      if (enCours) return res.status(409).json({ error: 'Un passage est déjà en cours' });
      enCours = true;
      try { const r = await mods[b.agent].passer(b.agent === 'ines' ? { forcer: true } : undefined); dernier[b.agent] = maintenant(); res.json({ ok: true, agent: b.agent, resultat: r || {} }); }
      catch (e) { console.error('agent ' + b.agent + ' :', (e && e.message) || e); res.status(500).json({ error: 'Passage non traité' }); }
      finally { enCours = false; }
    });
    app.post('/api/monitor/agents/plateforme/point', monPatronStrict, async (req, res) => {
      try {
        if (enCours) return res.status(409).json({ error: 'Un passage est déjà en cours' });
        const r = await victor.pointDuMatin({ forcer: true });
        if (r && r.dit) return res.json({ ok: true, modele: !!r.modele });
        res.status(409).json({ error: ({ memoire: 'La mémoire de Victor ne s’écrit pas', pause: 'Les agents sont en pause', erreur: 'Le point n’a pas pu être dit' })[r && r.saute] || 'Le point n’est pas parti' });
      } catch (e) { console.error('victor :', (e && e.message) || e); res.status(500).json({ error: 'Point non traité' }); }
    });
    app.post('/api/monitor/agents/plateforme/rgpd', monPatronStrict, (req, res) => {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      if (typeof b.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(b.id)) return res.status(400).json({ error: 'Demande inconnue' });
      const r = nina.cloturer(b.id, req.tourUser && req.tourUser.nom);
      if (r.ok) return res.json({ ok: true });
      res.status(r.raison === 'inconnue' ? 404 : 503).json({ error: r.raison === 'inconnue' ? 'Demande inconnue' : 'Demande non enregistrée' });
    });
    /* Enregistrer une demande RGPD reçue (par courriel, par courrier) avec sa date de réception AAAA-MM-JJ : Nina tient alors le délai légal d'un mois. */
    app.post('/api/monitor/agents/plateforme/rgpd/declarer', monPatronStrict, (req, res) => {
      const b = req.body && typeof req.body === 'object' ? req.body : {};
      const m = typeof b.recu === 'string' ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(b.recu) : null;
      const [a, mo, j] = m ? [+m[1], +m[2], +m[3]] : [0, 0, 0];
      const ts = m && mo >= 1 && mo <= 12 && j >= 1 && j <= 31 ? O.tsParis(a, mo, j, 0, 0) : NaN;
      const rond = Number.isFinite(ts) ? O.parisParties(ts) : null;
      if (!rond || rond.date !== b.recu) return res.status(400).json({ error: 'Date de réception : AAAA-MM-JJ' });
      const r = nina.declarer(ts, req.tourUser && req.tourUser.nom);
      if (r.ok) return res.json({ ok: true, limite: r.limite });
      const dit = { date_future: [400, 'La date de réception est dans le futur'], date_ancienne: [400, 'La date de réception remonte à plus de quatre mois : vérifie l’année'], plafond: [409, 'Trop de demandes ouvertes : marque des demandes traitées d’abord'] }[r.raison];
      res.status(dit ? dit[0] : 503).json({ error: dit ? dit[1] : 'Demande non enregistrée' });
    });
  }

  return { max, jules, theo, nina, ines, victor, etat, incidents, tic, demarrer, arreter, resume, faits, PAS, ORDRE,
    qualite: (debut, fin) => lire(() => ines.qualite(debut, fin)),
    arbitrer: (entree, c) => { try { return victor.arbitrer(entree, c); } catch (e) { return { ok: false, raison: 'erreur' }; } },
    attendre: () => new Promise(r => setImmediate(r)) };
};
module.exports.ORDRE = ORDRE;
module.exports.PAS = PAS;
