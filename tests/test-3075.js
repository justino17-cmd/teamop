/* 3075 — L'EXAMEN DU 27 OCTOBRE 2026 (12 h 19) : 7 sur 9, deux scénarios rouges et un constat.
     · scénario 5 : Victor tranchait dans sa réponse, puis l'outil ecrire redisait la décision DANS LE MÊME FIL — deux messages pour un réveil ;
     · scénario 9 : au bilan du vendredi, cinq agents ouvraient par « Chez moi aussi le journal est à zéro… » (chacun reprend la tournure d'avant) ;
     · scénario 9 : le juge reprochait à Léa deux courriels « quasi mot pour mot »… c'est le PLAN que son modèle impose (accroche, fonctions avec les mots de l'offre, suite) ;
     · scénario 8 : « Sans objectif enregistré : Max » — un fixer_objectifs REFUSÉ comptait comme fait, et le second appel ne se reprenait pas sur un refus.
   Ce banc joue les VRAIS `agent-equipe.js`, `conversations.js` et `reunions.js` (cerveau scripté), et lit `examen.js`. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3075-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();
const U = (a, m, j, h, mi) => Date.UTC(a, m - 1, j, h, mi || 0);

(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const REU = require(path.join(RACINE, 'server', 'reunions.js'));
  const REG = AG.AGENTS.map(a => a.id);

  let n = 0;
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const outil = (nom, entree) => ({ id: 'tu_' + nom, nom, entree });
  /* la phase d'un appel : la redemande SANS outil porte « Écris maintenant, sans outil » dans son dernier message */
  const phase = t => {
    const u = t.messages[0].content, fin = t.messages[t.messages.length - 1].content;
    const redemande = /Écris maintenant, sans outil/.test(fin);
    return /Tu ouvres la réunion/.test(u) ? 'ouverture' : /Clos la réunion/.test(u) ? (redemande ? 'conclusion-redemande' : 'conclusion') : /On t’a cité/.test(u) ? 'discussion' : (redemande ? 'tour-redemande' : 'tour');
  };
  async function monter(o) {
    const Dd = path.join(banc, 'm' + (n++)); fs.mkdirSync(Dd, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const horloge = { t: o.depart };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(Dd, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    const agents = AG(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge.t });
    const appels = []; let eq = null, reu = null;
    const conv = CV(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => horloge.t, pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = {
      etatBudget: () => ({ illisible: false, cle: true }),
      penser: async (id, system, messages, opts) => {
        const trace = { id, system, messages: JSON.parse(JSON.stringify(messages)), opts }; trace.phase = phase(trace); appels.push(trace);
        await dormir(1);
        return o.script(trace, appels.length);
      } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {}, memoire: id => reu ? reu.memoire(id) : '' });
    reu = REU(app, { DATA_DIR: Dd, monAdmin() {}, monPatronStrict() {}, agents, conversations: conv, cerveau, pousseNotif: () => Promise.resolve(), equipe: () => eq, maintenant: () => horloge.t });
    const lire = f => { try { return JSON.parse(fs.readFileSync(path.join(Dd, f), 'utf8')); } catch (x) { return null; } };
    const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const envoyer = async (fil, texte) => { const r = res(); await routes.post['/api/monitor/conversations/envoyer']({ body: { fil, texte }, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    return { appels, horloge, conv, envoyer, tic: async () => { const r = reu.tic(); await reu.attendre(); return r; }, messages: () => conv.lire('reunions', 200),
      reunion: () => ((lire('agents-reunions.json') || { reunions: [] }).reunions || [])[0] };
  }

  const LUNDI = U(2026, 11, 2, 8);      // lundi 2 novembre 2026, 9 h à Paris (hiver)
  const VENDREDI = U(2026, 11, 6, 17);  // vendredi 6 novembre 2026, 18 h à Paris
  const calme = async () => { for (let i = 0; i < 8; i++) await dormir(30); };

  console.log('\n1. ⛔ Une réponse, un message : l’outil ecrire ne redit pas dans le fil ce que la réponse vient d’y dire');
  {
    const H = await monter({ depart: LUNDI, script: async t => t.id === 'victor'
      ? rep('Je tranche : une relance à J+2, puis une dernière à J+7.', [outil('ecrire', { fil: 'equipe', texte: '@lea @camille Tranché : on combine, J+2 puis J+7.' }), outil('ecrire', { fil: 'victor', texte: 'Justin, j’ai tranché la relance entre Léa et Camille.' })])
      : rep('Mon avis, de ' + t.id + ' : je donne ma position.') });
    await H.envoyer('equipe', 'Léa et Camille ne sont pas d’accord. @Léa veut J+2, @Camille J+7. @Victor, tranche.');
    await calme();
    const eq = H.conv.lire('equipe', 50).filter(m => m.de !== 'systeme' && m.de !== 'justin');
    vrai('(population) Léa, Camille et Victor ont parlé', ['lea', 'camille', 'victor'].every(id => eq.some(m => m.de === id)), JSON.stringify(eq.map(m => m.de)));
    v('⛔ Victor : UN message dans le fil de l’équipe (sa réponse), pas la décision redite par ecrire', eq.filter(m => m.de === 'victor').map(m => m.texte), ['Je tranche : une relance à J+2, puis une dernière à J+7.']);
    vrai('…ecrire vers un AUTRE fil (le sien, avec Justin) reste permis', H.conv.lire('victor', 50).some(m => m.de === 'victor' && /j’ai tranché/.test(m.texte)), JSON.stringify(H.conv.lire('victor', 50)));
  }
  {
    /* sans réponse en texte, l'outil ecrire EST sa parole dans ce fil : il passe */
    const H = await monter({ depart: LUNDI, script: async t => t.id === 'victor' ? rep('', [outil('ecrire', { fil: 'equipe', texte: 'Tranché : J+2 puis J+7.' })]) : rep('RAS') });
    await H.envoyer('equipe', '@Victor, tranche la relance.');
    await calme();
    v('…et sans réponse en texte, ecrire vers ce fil s’écrit (c’est sa seule parole)', H.conv.lire('equipe', 50).filter(m => m.de === 'victor').map(m => m.texte), ['Tranché : J+2 puis J+7.']);
  }

  console.log('\n2. ⛔ Au tour de table, on n’ouvre pas comme le collègue d’avant');
  v('le début d’un message : trois mots, sans accent, sans ponctuation, sans @', [REU.debutDe('Chez moi aussi, le journal…'), REU.debutDe('@victor Chez moi AUSSI le'), REU.debutDe('Ok.')], ['chez moi aussi', 'chez moi aussi', '']);
  const PAREIL = 'Chez moi aussi le journal est à zéro : rien à signaler.';
  const bilan = reecrire => async t => {
    const u = t.messages[0].content;
    if (/Il commence exactement comme celui de/.test(u)) return reecrire(t);
    if (t.phase === 'ouverture') return rep('On fait le bilan de la semaine, faits à l’appui.');
    if (t.phase === 'tour' || t.phase === 'tour-redemande') return rep(PAREIL);
    if (/Clos la réunion/.test(u)) return rep('Compte rendu du vendredi. Décisions : rien de neuf. Qui fait quoi : chacun ses dossiers. Ce qui attend Justin : rien.');
    return rep('RAS');
  };
  {
    const H = await monter({ depart: VENDREDI, script: bilan(t => rep(t.id + ', de mon côté : rien à signaler non plus.')) });
    const r = await H.tic();
    const tours = H.messages().filter(m => m.de !== 'systeme' && m.de !== 'victor');
    vrai('(population) la réunion du vendredi a eu lieu, le tour de table a parlé', !!r.lancee && H.reunion() && H.reunion().type === 'bilan' && tours.length >= 10, JSON.stringify(r) + ' ' + tours.length);
    const debuts = tours.map(m => REU.debutDe(m.texte));
    v('⛔ aucun début de message n’est pris deux fois au tour de table', debuts.length - new Set(debuts).size, 0);
    v('…le premier garde sa phrase, chacun des suivants est redemandé UNE fois', [tours.filter(m => m.texte === PAREIL).length, H.appels.filter(a => /Il commence exactement comme celui de/.test(a.messages[0].content)).length], [1, tours.length - 1]);
    const re = H.appels.find(a => /Il commence exactement comme celui de/.test(a.messages[0].content));
    vrai('⛔ la redemande est SANS outil (rien ne s’enregistre deux fois), donne le message et nomme le collègue', re && !re.opts.outils && re.messages[0].content.includes(PAREIL) && /comme celui de \S+ \(« chez moi aussi … »\)/.test(re.messages[0].content), re && re.messages[0].content.slice(-400));
    vrai('…et la consigne du tour le dit d’avance (« sans reprendre la tournure d’un collègue »)', H.appels.filter(a => a.phase === 'tour').every(a => /sans reprendre la tournure d’un collègue/.test(a.messages[0].content)));
  }
  {
    const H = await monter({ depart: VENDREDI, script: bilan(() => rep(PAREIL)) });
    await H.tic();
    const tours = H.messages().filter(m => m.de !== 'systeme' && m.de !== 'victor');
    vrai('une redemande qui recommence pareil : la première version part quand même (on ne perd pas une parole pour une tournure)', tours.length >= 10 && tours.every(m => m.texte === PAREIL), tours.length);
  }
  {
    /* une seconde version DIFFÉRENTE qui recommence pareil : elle n'apporte rien, la première part (sans la garde, la variante passerait) */
    const H = await monter({ depart: VENDREDI, script: bilan(t => rep('Chez moi aussi, ' + t.id + ' : journal à zéro.')) });
    await H.tic();
    const tours = H.messages().filter(m => m.de !== 'systeme' && m.de !== 'victor');
    vrai('…une seconde version qui recommence pareil (même avec d’autres mots ensuite) n’est pas prise : la première part', tours.length >= 10 && tours.every(m => m.texte === PAREIL), JSON.stringify(tours.slice(0, 3).map(m => m.texte)));
  }
  {
    const H = await monter({ depart: VENDREDI, script: bilan(() => ({ ok: false, raison: 'erreur_api' })) });
    await H.tic();
    vrai('…une redemande en panne aussi', H.messages().filter(m => m.de !== 'systeme' && m.de !== 'victor' && m.texte === PAREIL).length >= 10);
  }

  console.log('\n3. ⛔ Lundi : un fixer_objectifs REFUSÉ ne compte pas comme enregistré');
  const DIT = 'Je fixe : annoncer l’incident restant dès confirmation, garder zéro erreur, ne rater aucun cycle de relecture.';
  const MAL = { objectifs: [{ texte: 'ok', mesure: 'x' }] };
  const BON = { objectifs: [{ texte: 'Annoncer l’incident restant dès confirmation', mesure: 'annonce publiée le jour même' }, { texte: 'Garder zéro erreur sur mes vérifications', mesure: 'zéro erreur au journal' }] };
  const lundi = (forces) => { let k = 0; return async t => {
    const u = t.messages[0].content;
    if (/Tu viens de dire, à la réunion du lundi/.test(u)) return rep('', [outil('fixer_objectifs', forces[k++] || MAL)]);
    if (t.phase === 'ouverture') return rep('On démarre la semaine.');
    if (t.phase === 'tour' || t.phase === 'tour-redemande') return t.id === 'max' ? rep(DIT, [outil('fixer_objectifs', MAL)]) : rep(t.id + ' fixe ses objectifs.', [outil('fixer_objectifs', BON)]);
    if (/Clos la réunion/.test(u)) return rep('Compte rendu du lundi. Décisions : chacun tient ses objectifs. Ce qui attend Justin : rien.');
    return rep('RAS');
  }; };
  const forcesDe = H => H.appels.filter(a => /Tu viens de dire, à la réunion du lundi/.test(a.messages[0].content));
  {
    const H = await monter({ depart: LUNDI, script: lundi([BON]) });
    await H.tic();
    v('⛔ Max a appelé l’outil, mais REFUSÉ : la reprise part quand même (un second appel, pour lui seul)', forcesDe(H).map(a => a.id), ['max']);
    vrai('…ses objectifs sont enregistrés, plus de « Sans objectif enregistré : Max »', !H.messages().some(m => /Sans objectif enregistré/.test(m.texte)), JSON.stringify(H.messages().filter(m => m.de === 'systeme').map(m => m.texte)));
  }
  {
    const H = await monter({ depart: LUNDI, script: lundi([MAL, BON]) });
    await H.tic();
    const f = forcesDe(H);
    v('⛔ la reprise refusée (objectif sans mesure) se reprend UNE fois, en disant pourquoi', [f.length, /ont été refusés/.test((f[1] || { messages: [{ content: '' }] }).messages[0].content), f.every(a => a.opts.forcerOutil === 'fixer_objectifs')], [2, true, true]);
    vrai('…et cette fois les objectifs sont enregistrés', !H.messages().some(m => /Sans objectif enregistré/.test(m.texte)));
  }
  {
    const H = await monter({ depart: LUNDI, script: lundi([MAL, MAL, BON]) });
    await H.tic();
    v('…pas plus de deux reprises : refusé deux fois, le constat reste DIT', [forcesDe(H).length, H.messages().some(m => /Sans objectif enregistré : Max/.test(m.texte))], [2, true]);
  }

  console.log('\n4. Le juge du ton connaît le PLAN imposé des courriels de Léa');
  {
    const EX = require(path.join(RACINE, 'server', 'examen.js'));
    vrai('l’accroche et la suite de Léa sont des formules maison', EX.FORMULES_MAISON.includes('Nous vous remercions pour votre inscription sur teamop.fr.') && EX.FORMULES_MAISON.some(f => /^Dès réception de vos réponses/.test(f)));
    const SRC = fs.readFileSync(path.join(RACINE, 'server', 'examen.js'), 'utf8');
    vrai('⛔ le critère c2 dit le plan imposé et ne juge que ce qui est propre au client', /cle: 'c2'[^\n]*le PLAN de chaque premier courriel[^\n]*ne sont PAS du texte recyclé[^\n]*ne juge que ce qui doit être propre au client/.test(SRC));
  }

  console.log('\n════ test-3075 : ' + ok + ' ✓  ' + ko + ' ✗ ════');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
