/* 3087 — LES RÉUNIONS DEMANDÉES À VICTOR (28 octobre 2026). Justin, dans le fil de Victor : « demain 9 h, réunion avec tout le monde pour le démarrage de
     l'entreprise » — puis : « il faut qu'il puisse le faire lui-même ». Ce banc joue les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js` et `reunions.js`
     (cerveau scripté, horloge tenue) et garde :
       · l'outil `planifier_reunion` est offert à Victor SEUL, avec la date du jour de Paris dans sa description (« demain » se lit par rapport à maintenant) ;
       · il ne vaut que d'un message de JUSTIN ; un collègue qui le demande est refusé, et le fil le dit ;
       · le serveur vérifie tout : date lisible et réelle (pas de 31 novembre), ni passée ni à plus de 14 jours, 15 à 60 minutes, un sujet, des participants qui
         existent, ni sur le créneau du lundi/vendredi ni sur une autre réunion prévue, au plus 5 à venir ;
       · à son heure, la vérification de chaque minute la LANCE : Victor ouvre sur le sujet, seuls les participants visés (+ Victor) parlent, sans outil, compte rendu ;
         jamais deux fois (minute suivante, redémarrage) ; trop tard (2 h) : « manquée », dite une fois ;
       · Justin l'annule (route, ou en le demandant à Victor) ; une réunion annulée ne se lance pas. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3087-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);

(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REU = require(path.join(RACINE, 'server', 'reunions.js'));
  const REG = AG.AGENTS.map(a => a.id);
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  let n = 0;
  async function monter(o) {
    o = o || {};
    const D = path.join(banc, 'm' + (n++)); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const horloge = { t: o.depart || U(2026, 10, 28, 8, 5) };   // mercredi 28 octobre, 9 h 05 à Paris (hiver)
    const modes = {}; for (const id of (o.allumes || REG)) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    require('./banc-horaires.js').toujoursOuvert(D);
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t });
    const appels = [], pousses = []; let eq = null, reu = null;
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = { etatBudget: () => ({ illisible: false, cle: true }),
      penser: async (id, system, messages, opts) => { const t = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts, quand: horloge.t }; appels.push(t); await dormir(1); return o.script ? o.script(t) : rep('Mon point sur le sujet, numéro ' + appels.length + '.'); } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: () => '', outilsAgents: { get victor() { return reu && reu.outilsVictor; } } });
    const monte = () => REU(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, conversations: conv, cerveau, equipe: () => eq, maintenant: () => horloge.t,
      pousseNotif: (t, c, u) => { pousses.push([t, c, u]); return Promise.resolve(); } });
    reu = monte();
    const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const post = async (chemin, corps) => { const r = res(); await routes.post[chemin]({ body: corps, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    const get = async chemin => { const r = res(); await routes.get[chemin]({ params: {}, query: {}, tourUser: { nom: 'Justin' } }, r); return r; };
    const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(D, f), 'utf8')); } catch (x) { return null; } };
    return { D, horloge, appels, pousses, conv, post, get, lire, reu: () => reu, remonter: () => { reu = monte(); return reu; },
      tic: async () => { const r = reu.tic(); await reu.attendre(); return r; },
      fil: f => conv.lire(f, 100), plans: () => (lire('agents-reunions.json') || {}).planifiees || [] };
  }
  const calme = async () => { for (let i = 0; i < 15; i++) await dormir(30); };
  const PLAN = (quand, o) => Object.assign({ quand, duree_minutes: 60, sujet: 'le démarrage de l’entreprise', participants: ['tous'] }, o || {});

  console.log('\n1. Le serveur vérifie tout (planifier, pur)');
  {
    const H = await monter();
    const P = e => H.reu().planifier(e, 'victor');
    v('demain 9 h, tout le monde, une heure : planifiée', [P(PLAN('2026-10-29 09:00')).ok, H.plans().length, H.plans()[0].statut, H.plans()[0].ts], [true, 1, 'prevue', U(2026, 10, 29, 8)]);
    v('⛔ refus : date illisible, 31 novembre, passée, à plus de 14 jours', [P(PLAN('jeudi 9h')).raison, P(PLAN('2026-11-31 09:00')).raison, P(PLAN('2026-10-28 08:00')).raison, P(PLAN('2026-11-20 09:00')).raison], ['quand', 'quand', 'passe', 'trop_loin']);
    v('⛔ refus : 10 ou 90 minutes, sujet vide, personne de l’équipe', [P(PLAN('2026-10-29 14:00', { duree_minutes: 10 })).raison, P(PLAN('2026-10-29 14:00', { duree_minutes: 90 })).raison, P(PLAN('2026-10-29 14:00', { sujet: ' ' })).raison, P(PLAN('2026-10-29 14:00', { participants: ['inconnu'] })).raison], ['duree', 'duree', 'sujet', 'participants']);
    v('⛔ refus : sur le créneau du lundi 9 h, sur celui du vendredi 18 h, sur une autre réunion prévue', [P(PLAN('2026-11-02 09:30', { duree_minutes: 30 })).raison, P(PLAN('2026-10-30 17:30')).raison, P(PLAN('2026-10-29 09:30', { duree_minutes: 30 })).raison], ['creneau', 'creneau', 'chevauche']);
    v('un groupe et des noms : les membres du groupe « clients », Léa et Max', [P(PLAN('2026-10-29 14:00', { participants: ['clients'] })).ok, P(PLAN('2026-10-29 16:00', { participants: ['lea', 'max'] })).ok], [true, true]);
    v('…puis au plus 5 à venir', [P(PLAN('2026-10-30 09:00', { duree_minutes: 15 })).ok, P(PLAN('2026-10-30 10:00', { duree_minutes: 15 })).ok, P(PLAN('2026-10-30 11:00', { duree_minutes: 15 })).raison], [true, true, 'trop']);
  }

  console.log('\n2. Victor le fait lui-même, sur la demande de Justin (la vraie messagerie)');
  {
    const H = await monter({ script: t => {
      if (t.id === 'victor' && (t.opts && t.opts.outils || []).some(x => x.name === 'planifier_reunion') && /réunion/i.test(t.messages[t.messages.length - 1].content))
        return rep('C’est planifié pour demain 9 h, avec toute l’équipe.', [outil('planifier_reunion', PLAN('2026-10-29 09:00'))]);
      return rep('RAS');
    } });
    const r = await H.post('/api/monitor/conversations/envoyer', { fil: 'victor', texte: 'Demain 9 h, réunion avec tout le monde pour le démarrage de l’entreprise' });
    await calme();
    const av = H.appels.find(a => a.id === 'victor');
    vrai('(population) le message est parti et Victor a été appelé', r.code === 200 && !!av, JSON.stringify(r.corps));
    const def = av && (av.opts.outils || []).find(x => x.name === 'planifier_reunion');
    vrai('l’outil planifier_reunion est offert à Victor, avec la date du jour de Paris (« mercredi 2026-10-28 » ; « demain = jeudi 2026-10-29 »)', def && /mercredi 2026-10-28, 9 h 05/.test(def.description) && /demain = jeudi 2026-10-29/.test(def.description), def && def.description.slice(0, 200));
    v('…et la réunion est inscrite : jeudi 29, 9 h – 10 h, tout le monde', H.plans().map(x => [x.statut, x.ts, x.duree, x.participants, x.par]), [['prevue', U(2026, 10, 29, 8), 60, ['tous'], 'victor']]);
    const sys = H.fil('victor').filter(m => m.de === 'systeme').map(m => m.texte).join(' | ');
    vrai('le fil le dit : « Réunion planifiée : jeudi 29 octobre, 9 h – 10 h · tout le monde (16 agents) · « … » »', /Réunion planifiée : jeudi 29 octobre, 9 h – 10 h · tout le monde \(16 agents\)/.test(sys), sys);
    vrai('Justin est notifié', H.pousses.some(p => /Réunion planifiée par Victor/.test(p[0])));
    const lea = H.appels.find(a => a.id === 'lea');
    vrai('⛔ l’outil n’est offert à AUCUN autre agent', H.appels.filter(a => a.id !== 'victor').every(a => !(a.opts && a.opts.outils || []).some(x => x.name === 'planifier_reunion')) && true, lea && 'lea');
    const G = await H.get('/api/monitor/agents/reunions');
    v('…et « Prochaine » devient elle (avant le vendredi 18 h)', [G.corps.prochaine.type, G.corps.prochaine.ts], ['sujet', U(2026, 10, 29, 8)]);
    v('la Tour la voit : libellé, participants, nombre', (G.corps.planifiees || []).map(x => [x.libelle, x.participants, x.nb]), [['jeudi 29 octobre, 9 h – 10 h', 'tout le monde', 16]]);
  }
  {
    const H = await monter();
    const x = H.reu().outilsVictor.executer('planifier_reunion', PLAN('2026-10-29 09:00'), { de: 'lea', fil: 'equipe' });
    v('⛔ un COLLÈGUE qui le demande : refusé, et la phrase le dit', [x.ok, x.raison, /sur une demande de Justin/.test(x.ligne || ''), H.plans().length], [false, 'pas_justin', true, 0]);
  }

  console.log('\n3. À son heure, la réunion se tient — une fois');
  {
    const H = await monter({ allumes: ['victor', 'lea', 'camille', 'hugo', 'max', 'ines'] });
    H.reu().planifier(PLAN('2026-10-28 10:00', { participants: ['lea', 'max'], sujet: 'le planning des relances', duree_minutes: 30 }), 'victor');
    v('9 h 59 : rien', [(await H.tic()).saute || 'rien', H.appels.length], ['pas_l_heure', 0]);
    H.horloge.t = U(2026, 10, 28, 9, 0);
    const r = await H.tic();
    vrai('10 h : lancée', !!r.lancee && !r.annulee, JSON.stringify(r));
    const qui = [...new Set(H.appels.map(a => a.id))];
    v('⛔ seuls les visés parlent (Léa, Max) — et Victor, qui ouvre et conclut ; ni Camille, ni Hugo, ni Inès', qui.sort(), ['lea', 'max', 'victor']);
    vrai('Victor ouvre SUR LE SUJET', /Tu ouvres la réunion que Justin a demandée\. Le sujet : « le planning des relances »/.test(H.appels[0].messages[0].content));
    vrai('⛔ aucun outil dans cette réunion (rien ne s’enregistre)', H.appels.every(a => !(a.opts && a.opts.outils && a.opts.outils.length)));
    vrai('le tour de table porte le sujet', H.appels.filter(a => a.id === 'lea').some(a => /Le sujet de la réunion : « le planning des relances »/.test(a.messages[0].content)));
    const R = (H.lire('agents-reunions.json').reunions || []).slice(-1)[0];
    v('la réunion est inscrite : type « sujet », terminée, fin = 10 h 30, compte rendu écrit', [R.type, R.statut, R.fin, !!R.compteRendu, R.sujet], ['sujet', 'terminee', U(2026, 10, 28, 9, 30), true, 'le planning des relances']);
    v('…et la planification est « tenue »', H.plans().map(x => x.statut), ['tenue']);
    vrai('le fil l’annonce par son sujet', H.fil('reunions').some(m => m.de === 'systeme' && /Réunion demandée par Justin — « le planning des relances »/.test(m.texte)));
    const avant = H.appels.length;
    H.horloge.t = U(2026, 10, 28, 9, 1); await H.tic(); H.remonter(); await H.tic();
    v('⛔ jamais deux fois : minute suivante, redémarrage', H.appels.length, avant);
    vrai('Justin est notifié à la fin', H.pousses.some(p => /Réunion demandée par Justin terminée/.test(p[0])));
  }
  {
    const H = await monter();
    H.reu().planifier(PLAN('2026-10-28 10:00'), 'victor');
    H.horloge.t = U(2026, 10, 28, 11, 30);   // 12 h 30 : le serveur était éteint
    await H.tic();
    v('⛔ trop tard (2 h 30 après) : « manquée », pas tenue en retard, dite une fois', [H.plans()[0].statut, H.appels.length, H.fil('reunions').filter(m => /Réunion manquée/.test(m.texte)).length], ['manquee', 0, 1]);
    await H.tic();
    v('…une seule fois', H.fil('reunions').filter(m => /Réunion manquée/.test(m.texte)).length, 1);
  }

  console.log('\n4. Justin l’annule');
  {
    const H = await monter();
    const p = H.reu().planifier(PLAN('2026-10-28 10:00'), 'victor').plan;
    v('route : identifiant mal formé 400, inconnu 404', [(await H.post('/api/monitor/agents/reunions/annuler', { id: 'x' })).code, (await H.post('/api/monitor/agents/reunions/annuler', { id: 'p00000000' })).code], [400, 404]);
    const r = await H.post('/api/monitor/agents/reunions/annuler', { id: p.id });
    v('annulée par la route', [r.code, H.plans()[0].statut], [200, 'annulee']);
    H.horloge.t = U(2026, 10, 28, 9, 0); await H.tic();
    v('⛔ une réunion annulée ne se lance pas', H.appels.length, 0);
    const p2 = H.reu().planifier(PLAN('2026-10-29 09:00'), 'victor').plan;
    const x = H.reu().outilsVictor.executer('annuler_reunion', { reunion: p2.id }, { de: 'justin', fil: 'victor' });
    v('annulée par Victor, sur la demande de Justin', [x.ok, H.plans().find(y => y.id === p2.id).statut], [true, 'annulee']);
    const G = await H.get('/api/monitor/agents/reunions');
    v('la Tour ne la montre plus', (G.corps.planifiees || []).length, 0);
  }

  console.log(`\n════ test-3087 : ${ok} ✓ ${ko} ✗ ════`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
