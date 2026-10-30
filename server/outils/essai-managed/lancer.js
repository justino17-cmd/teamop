#!/usr/bin/env node
/* LE LANCEMENT D'UNE SESSION D'ESSAI (30 octobre 2026) — une session de « Max (essai) », un rapport rangé dans un fichier, rien de publié.
 *
 *   node server/outils/essai-managed/lancer.js
 *
 * Le déroulé : (1) le script vérifie que l'outil maison répond (sans quoi on ne paierait pas une session pour rien) ; (2) il crée la session AVEC UN BUDGET
 * (jamais sans : `budget` est create-only, un oubli ne se rattrape pas) ; (3) il ouvre le flux AVANT d'envoyer la demande (stream-first) ; (4) il envoie un
 * « outcome » — la grille de `definition/grille.md` — qui fait réviser le rapport jusqu'à ce qu'il la satisfasse (3 tours au plus) ; (5) quand l'agent appelle
 * `faits_surveillance`, c'est CE SCRIPT qui répond, en lisant la route du serveur (`route.js`) ; (6) il range le rapport et ses chiffres dans
 * `<données>/essai-managed/rapports/`.
 *
 * ⛔ LE RAPPORT N'EST JAMAIS PUBLIÉ NI ENVOYÉ : ni messagerie des agents, ni courriel, ni incident, ni notification. Un fichier, à lire à côté du travail du vrai Max.
 * ⛔ Toute demande de permission de l'agent est REFUSÉE (personne ne surveille) ; un outil qu'il inventerait reçoit une erreur ; au plus 6 appels de l'outil maison ;
 *    un délai dur de 10 minutes, passé lequel on l'interrompt. Plafond de session : `budgetCents` (50 par défaut, jamais hors de 10 à 200).
 * ⛔ Ne montre aucun secret : ni la clé, ni le jeton. Les chiffres remis à l'agent sont ceux de `faits.js` (aucune donnée de client).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const C = require('./commun');

const APPELS_OUTIL_MAX = 6;
const DELAI_MS = 10 * 60000;
const RAPPORT_MAX = 100000;
const RECONNEXIONS_MAX = 2;
const attendre = ms => new Promise(r => setTimeout(r, ms));
const sain = s => String(s || '').replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80);

async function faitsDuServeur(o, jeton, zone) {
  const f = o.fetch || fetch;
  const url = o.urlServeur + '/api/essai-managed/faits' + (zone ? '?zone=' + encodeURIComponent(zone) : '');
  const r = await f(url, { headers: { authorization: 'Bearer ' + jeton }, signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error('l’outil maison ne répond pas (HTTP ' + r.status + ')');
  const j = await r.json();
  if (!j || j.essai !== true || typeof j.instant !== 'string') throw new Error('l’outil maison a rendu une forme inattendue');
  return j;
}

async function lancer(o) {
  o = o || {};
  const sortie = o.sortie || (t => console.log(t));
  const p = o.chemins || C.chemins(o.env);
  const env = o.env || process.env;
  const config = o.config || C.lireConfig(p);
  if (!config) return { ok: false, code: 2, raison: 'config_illisible', dit: 'La configuration du serveur est illisible (' + p.config + ').' };
  const reg = C.reglage(config);
  if (!reg.actif) return { ok: false, code: 2, raison: 'interrupteur_coupe', dit: 'L’essai est coupé : rien n’a été lancé. Pour l’allumer, voir le LISEZMOI (agents.essaiManaged).' };
  const cle = (config.agents && config.agents.cleApi) || '';
  if (!cle) return { ok: false, code: 2, raison: 'pas_de_cle', dit: 'La clé des agents (agents.cleApi) n’est pas posée dans la configuration.' };
  const etat = C.lireEtat(p);
  if (!etat.agent_id || !etat.environment_id) return { ok: false, code: 2, raison: 'pas_pose', dit: 'L’essai n’est pas posé : lancer d’abord poser.js.' };
  const jeton = C.lireJeton(p);
  if (!jeton) return { ok: false, code: 2, raison: 'pas_de_jeton', dit: 'Le jeton de l’outil maison manque : relancer poser.js.' };
  const maintenant = typeof o.maintenant === 'function' ? o.maintenant : Date.now;
  const pause = typeof o.pause === 'function' ? o.pause : attendre;
  o.urlServeur = o.urlServeur || 'http://127.0.0.1:' + (env.PORT || 8080);
  const def = C.definition();
  const client = o.client || C.client(cle, env);

  /* 1. l'outil maison répond-il ? (aucune session n'est créée, donc rien n'est payé, s'il ne répond pas) */
  let premiers;
  try { premiers = await faitsDuServeur(o, jeton); }
  catch (e) { return { ok: false, code: 1, raison: 'outil_muet', dit: 'Les chiffres de Max ne sont pas servis : ' + C.erreurDite(e) + '. Le service a-t-il été redémarré depuis que l’essai est allumé (systemctl restart teamop-api) ?' }; }

  /* 2. la session, AVEC son budget */
  const debut = maintenant();
  let session;
  try {
    session = await client.beta.sessions.create({
      agent: { type: 'agent', id: etat.agent_id, version: etat.agent_version },
      environment_id: etat.environment_id,
      title: 'Essai Max — ' + new Date(debut).toISOString().slice(0, 16).replace('T', ' '),
      budget: C.budgetSession(reg.budgetCents),
      metadata: { essai: 'teamop-max-managed' },
    });
  } catch (e) { return { ok: false, code: 1, raison: 'anthropic', dit: 'Anthropic a refusé la session : ' + C.erreurDite(e) }; }
  /* rangée tout de suite : si le script meurt, le nettoyage la retrouve (une session oubliée est une session qu'on paie à l'heure) */
  etat.sessions = (Array.isArray(etat.sessions) ? etat.sessions : []).concat([{ id: session.id, cree_le: new Date(debut).toISOString(), budget_cents: C.budgetCents(reg.budgetCents) }]);
  C.ecrireEtat(p, etat);
  sortie('Session ' + session.id + ' créée — plafond ' + (C.budgetCents(reg.budgetCents) / 100).toFixed(2) + ' $.');
  sortie('Pour la suivre en direct : https://platform.claude.com/workspaces/' + (typeof reg.espace === 'string' && reg.espace ? reg.espace : 'default') + '/sessions/' + session.id);

  /* 3-5. le flux, la demande, les réponses de l'outil maison */
  const bilan = { messages: [], outils: 0, outcome: null, issue: '', budgetAtteint: false, erreurs: [], faits: premiers, fini: false, expire: false };
  const repondus = new Set(), vus = new Set();
  const envoyer = events => client.beta.sessions.events.send(session.id, { events });
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => { bilan.expire = true; ctrl.abort(); }, typeof o.delaiMs === 'number' ? o.delaiMs : DELAI_MS);

  async function traiter(ev) {
    if (!ev || typeof ev.type !== 'string') return;
    switch (ev.type) {
      case 'agent.message':
        if (ev.id) { if (vus.has(ev.id)) break; vus.add(ev.id); }   // le seul événement qui s'ADDITIONNE : rejoué après une reprise, il serait écrit deux fois
        for (const b of (ev.content || [])) if (b && b.type === 'text' && typeof b.text === 'string') bilan.messages.push(b.text);
        break;
      case 'agent.custom_tool_use': {
        if (repondus.has(ev.id)) break;
        repondus.add(ev.id);
        if (ev.name !== C.OUTIL || ++bilan.outils > APPELS_OUTIL_MAX) {
          await envoyer([{ type: 'user.custom_tool_result', custom_tool_use_id: ev.id, is_error: true, content: [{ type: 'text', text: ev.name !== C.OUTIL ? 'Outil inconnu.' : 'Trop d’appels : utilise les chiffres déjà reçus.' }] }]);
          break;
        }
        let texte, erreur = false;
        try {
          const zone = ev.input && typeof ev.input.zone === 'string' ? ev.input.zone.slice(0, 30) : '';
          const f = await faitsDuServeur(o, jeton, zone);
          bilan.faits = f; texte = JSON.stringify(f);
        } catch (e) { erreur = true; texte = 'Les chiffres ne sont pas disponibles pour le moment.'; bilan.erreurs.push('outil : ' + C.erreurDite(e)); }
        await envoyer([{ type: 'user.custom_tool_result', custom_tool_use_id: ev.id, is_error: erreur, content: [{ type: 'text', text: texte }] }]);
        break;
      }
      case 'agent.tool_use':
      case 'agent.mcp_tool_use':
        /* personne ne surveille cette session : toute demande de permission est refusée */
        if (ev.evaluated_permission === 'ask' && !repondus.has(ev.id)) {
          repondus.add(ev.id);
          await envoyer([{ type: 'user.tool_confirmation', tool_use_id: ev.id, result: 'deny', deny_message: 'Essai sans surveillance : demande refusée.' }]);
        }
        break;
      case 'span.outcome_evaluation_end':
        bilan.outcome = { resultat: String(ev.result || ''), iteration: typeof ev.iteration === 'number' ? ev.iteration : null, explication: String(ev.explanation || '').slice(0, 1500) };
        break;
      case 'session.error': bilan.erreurs.push('session.error' + (ev.error && ev.error.type ? ' (' + String(ev.error.type).slice(0, 60) + ')' : '')); break;
      case 'session.status_idle': {
        const t = ev.stop_reason && ev.stop_reason.type;
        if (t === 'requires_action') break;
        bilan.fini = true; bilan.issue = t === 'budget_reached' ? 'budget_atteint' : 'termine';
        if (t === 'budget_reached') bilan.budgetAtteint = true;
        break;
      }
      case 'session.status_terminated': bilan.fini = true; bilan.issue = bilan.issue || 'terminee'; break;
    }
  }
  async function consommer(flux) {
    for await (const ev of flux) {
      await traiter(ev);
      if (bilan.fini) return;
    }
  }

  try {
    let flux = await client.beta.sessions.events.stream(session.id, undefined, { signal: ctrl.signal });
    await envoyer([{ type: 'user.define_outcome',
      description: 'Rédiger le rapport de surveillance de Max (essai) : appelle l’outil faits_surveillance, puis écris report.md dans /mnt/session/outputs/ en suivant la grille.',
      rubric: { type: 'text', content: def.grille }, max_iterations: 3 }]);
    for (let n = 0; ; n++) {
      try { await consommer(flux); } catch (e) { if (!bilan.expire) bilan.erreurs.push('flux : ' + C.erreurDite(e)); }
      if (bilan.fini || bilan.expire || n >= RECONNEXIONS_MAX) break;
      /* le flux est tombé sans fin de session : on reprend (flux d'abord, puis l'historique — la doc : le flux ne rejoue rien) */
      bilan.erreurs.push('flux interrompu, reprise ' + (n + 1));
      await pause(1000);
      flux = await client.beta.sessions.events.stream(session.id, undefined, { signal: ctrl.signal });
      try {
        const h = await client.beta.sessions.events.list(session.id);
        for (const ev of (h && h.data) || []) { await traiter(ev); if (bilan.fini) break; }
      } catch (e) { bilan.erreurs.push('historique : ' + C.erreurDite(e)); }
      if (bilan.fini) break;
    }
  } catch (e) { bilan.erreurs.push('session : ' + C.erreurDite(e)); }
  clearTimeout(minuteur);
  if (bilan.expire && !bilan.fini) { bilan.issue = 'delai_depasse'; try { await envoyer([{ type: 'user.interrupt' }]); } catch (e) {} }
  if (!bilan.issue) bilan.issue = 'incomplete';

  /* 6. le coût, puis le rapport */
  let cout = null, statut = '';
  try {
    const s = await client.beta.sessions.retrieve(session.id);
    statut = String(s.status || '');
    if (s.usage && s.usage.list_cost && /^\d{1,9}$/.test(String(s.usage.list_cost.amount))) cout = Number(s.usage.list_cost.amount);
    if (!bilan.outcome && Array.isArray(s.outcome_evaluations) && s.outcome_evaluations.length) { const d = s.outcome_evaluations[s.outcome_evaluations.length - 1]; bilan.outcome = { resultat: String(d.result || ''), iteration: null, explication: '' }; }
  } catch (e) { bilan.erreurs.push('relevé de la session : ' + C.erreurDite(e)); }

  let rapport = '', source = '';
  for (let i = 0; i < 3 && !rapport; i++) {
    try {
      const page = await client.beta.files.list({ scope_id: session.id, betas: ['managed-agents-2026-04-01'] });
      const f = ((page && page.data) || []).find(x => x && /\.md$/i.test(String(x.filename || '')));
      if (f) { const r = await client.beta.files.download(f.id); rapport = String(await r.text()).slice(0, RAPPORT_MAX); source = 'fichier ' + sain(f.filename); }
    } catch (e) { if (i === 2) bilan.erreurs.push('fichiers : ' + C.erreurDite(e)); }
    if (!rapport && i < 2) await pause(1500);
  }
  if (!rapport && bilan.messages.length) { rapport = bilan.messages.join('\n\n').slice(0, RAPPORT_MAX); source = 'message de l’agent (aucun fichier trouvé)'; }

  const fichier = ecrireRapport(p, { session, debut, fin: maintenant(), cout, statut, bilan, rapport, source, budgetCents: C.budgetCents(reg.budgetCents) });
  etat.sessions = (etat.sessions || []).map(s => (s.id === session.id ? Object.assign({}, s, { fini_le: new Date(maintenant()).toISOString(), issue: bilan.issue, cout_cents: cout, rapport: path.basename(fichier) }) : s));
  C.ecrireEtat(p, etat);
  sortie('Issue : ' + bilan.issue + (bilan.outcome ? ' · grille : ' + bilan.outcome.resultat : '') + ' · ' + bilan.outils + ' appel(s) de l’outil maison' + (cout !== null ? ' · coût ' + (cout / 100).toFixed(2) + ' $' : ' · coût non lu'));
  sortie('Rapport rangé : ' + fichier + (rapport ? '' : ' (VIDE : l’agent n’a rien produit)'));
  for (const m of bilan.erreurs.slice(0, 8)) sortie('Note : ' + m);
  return { ok: !!rapport, code: rapport ? 0 : 1, raison: rapport ? '' : 'pas_de_rapport', fichier, cout_cents: cout, issue: bilan.issue, outils: bilan.outils, sessionId: session.id, rapport };
}

/* Le fichier de comparaison : l'essai d'un côté, ce que le vrai Max voit au même instant de l'autre. Rien de plus que des chiffres et des phrases de NOTRE code. */
function ecrireRapport(p, x) {
  fs.mkdirSync(p.rapports, { recursive: true });
  const iso = new Date(x.debut).toISOString();
  const nom = iso.slice(0, 10) + '_' + iso.slice(11, 19).replace(/:/g, '') + '_' + sain(x.session.id) + '.md';
  const f = x.bilan.faits || {};
  const actives = (f.regles || []).filter(r => r && r.active);
  const L = [];
  L.push('# ESSAI — Max chez Anthropic (Managed Agents)', '');
  L.push('> **Rapport d’essai : jamais publié, jamais envoyé.** Il est rangé ici pour être lu à côté du travail du vrai Max (ses messages dans le fil « Plateforme » de la Tour). Aucune donnée de client n’a été transmise : seulement des chiffres de surveillance.', '');
  L.push('- Session : `' + sain(x.session.id) + '`', '- Lancée le : ' + iso, '- Issue : ' + x.bilan.issue + (x.statut ? ' (session : ' + x.statut + ')' : ''));
  L.push('- Grille (outcome) : ' + (x.bilan.outcome ? x.bilan.outcome.resultat + (x.bilan.outcome.explication ? ' — ' + x.bilan.outcome.explication.replace(/\s+/g, ' ') : '') : 'non lue'));
  L.push('- Appels de l’outil maison : ' + x.bilan.outils, '- Coût (tarif public, arrondi au centime) : ' + (x.cout !== null ? (x.cout / 100).toFixed(2) + ' $' : 'non lu') + ' pour un plafond de ' + (x.budgetCents / 100).toFixed(2) + ' $', '');
  L.push('## Ce que voit le vrai Max, au moment où l’agent a lu les chiffres', '');
  L.push('Instant des chiffres : ' + (f.instant || 'non disponible'), '');
  if (actives.length) for (const r of actives) L.push('- [' + r.niveau + '] ' + (r.phrase || r.cle) + ' (zone ' + r.zone + ')');
  else L.push(f.lisible === false ? '- état de santé illisible' : '- aucune règle active : le vrai Max ne dirait rien.');
  L.push('', '## Rapport de l’agent Managed', '', x.rapport ? '_Source : ' + x.source + '_\n\n' + x.rapport : '_L’agent n’a rien produit._', '');
  L.push('## Chiffres remis à l’agent (JSON)', '', '```json', JSON.stringify(f, null, 2), '```', '');
  if (x.bilan.erreurs.length) L.push('## Notes techniques', '', ...x.bilan.erreurs.slice(0, 20).map(e => '- ' + e), '');
  const chemin = path.join(p.rapports, nom);
  fs.writeFileSync(chemin, L.join('\n'), { mode: 0o640 });
  return chemin;
}

module.exports = { lancer, ecrireRapport, APPELS_OUTIL_MAX, DELAI_MS };
if (require.main === module) lancer().then(r => { if (!r.ok) console.error(r.dit || 'Terminé sans rapport.'); process.exit(r.code); }).catch(e => { console.error('Échec : ' + C.erreurDite(e)); process.exit(1); });
