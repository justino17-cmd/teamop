/* 3001 — LES QUATRE ÉCHECS DE L'EXAMEN DU 25 OCTOBRE 2026 (13 h 28 ; 5 réussis, 4 échecs).
     · Scénario 1 : Margaux disait « paiement enregistré comme payé » et « pas de dossier en impayé sur ma liste » — l'examen lisait un IMPAYÉ (la négation
       « pas de dossier en » n'était pas reconnue). Défaut de l'EXAMEN : `PAS_D_IMPAYE`.
     · Scénario 2 : Justin confiait un travail clair ; Camille répondait par une question seule, sans prendre la tâche — la consigne lui laissait « répondre,
       prendre, OU demander une précision ». Une règle : un travail de Justin se prend, et la question va dans le même message.
     · Scénario 6 : le juge du contrôle qualité voyait une « incohérence » dans une activité DÉDUITE du nom (voulu) ; une réponse du juge hors forme qui ne
       commençait pas par « VERDICT » n'avait pas de seconde chance (« contrôle non fait ») ; et la vue d'un brouillon taisait la raison.
     · Scénario 9 : le juge du ton comptait comme « formules toutes faites » les deux phrases que le MODÈLE DE COURRIEL impose (validé par Justin).
   Les VRAIS modules : examen.js, agents-controle.js, agent-equipe.js (monté avec agents.js et conversations.js, cerveau scripté). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b3001-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();
const sans = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

(async () => {
  const EX = require(path.join(RACINE, 'server', 'examen.js'));
  const CTRL = require(path.join(RACINE, 'server', 'agents-controle.js'));

  console.log('\n1. Scénario 1 — une négation d’impayé n’est pas un impayé, un impayé reste un impayé');
  const MARGAUX = 'Pour DOS-900001 : paiement enregistré comme payé, formule pro. Par contre je n\'ai pas le détail de la dernière facture — lecture impossible sur ce dossier (montant et date indisponibles). Sinon côté compta, rien à signaler : pas de relance en cours, pas de dossier en impayé sur ma liste actuellement.';
  vrai('la vraie réponse de Margaux (examen du 25 octobre) se lit « payé », pas « impayé »', EX.DIT_PAYE.test(MARGAUX) && !EX.ditImpaye(MARGAUX));
  for (const t of ['pas d’impayé sur ce dossier', 'aucun impayé', 'aucun dossier impayé', 'pas de dossier en impayé', 'pas de factures impayées', 'rien en impayé'])
    vrai('   « ' + t + ' » : pas un impayé', !EX.ditImpaye(t));
  for (const t of ['dossier DOS-900002, paiement en impayé', 'le client n’a pas payé', 'pas encore réglé', 'le dossier est impayé, pas de relance en cours', 'il est marqué impayé'])
    vrai('   « ' + t + ' » : reste un impayé', EX.ditImpaye(t));

  console.log('\n2. Scénario 2 — un travail confié par Justin se prend, la question va dans le même message');
  {
    const AG = require(path.join(RACINE, 'server', 'agents.js'));
    const CV = require(path.join(RACINE, 'server', 'conversations.js'));
    const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
    const D = path.join(banc, 'eq'); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const modes = {}; for (const a of AG.AGENTS) modes[a.id] = 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    let horloge = 1.8e12, eq = null; const systemes = [];
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge });
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => (horloge += 1000), pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = { penser: async (id, system) => { systemes.push({ id, system }); return { ok: true, texte: 'Je m’en charge.', actions: [] }; } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {} });
    const r = { code: 200, status(c) { r.code = c; return r; }, json() { return r; } };
    await routes.post['/api/monitor/conversations/envoyer']({ body: { fil: 'camille', texte: 'Camille, prépare-moi la liste des questions qui reviennent le plus souvent dans le courrier cette semaine.' }, tourUser: { nom: 'Justin' }, query: {} }, r);
    for (let i = 0; i < 8; i++) await dormir(40);
    const s = (systemes.find(x => x.id === 'camille') || {}).system || '';
    vrai('(population) Camille a bien été appelée, avec ses consignes', s.length > 2000, s.length);
    vrai('⛔ ses consignes disent qu’un travail de Justin se PREND, même s’il manque une information', /TRAVAIL que Justin te confie[^\n]*se prend : outil prendre, même s’il te manque une information/.test(s));
    vrai('⛔ … et que la question va dans le même message, jamais seule', /DANS LE MÊME message/.test(s) && /jamais à un travail de Justin par une question seule/.test(s));
  }

  console.log('\n3. Scénario 6 — le juge du contrôle qualité');
  vrai('⛔ le juge sait qu’une activité DÉDUITE du nom, dite comme une déduction, est voulue', /DÉDUITE[^\n]*ni incohérent ni inventé/.test(CTRL.JUGE_SYSTEM));
  const juge = suite => { let k = 0; const vus = []; return { vus, cerveau: { penser: async (id, sys, msgs) => { vus.push(msgs.length); return { ok: true, texte: suite[Math.min(k++, suite.length - 1)] }; } } }; };
  {
    const J = juge(['Je relis le courriel attentivement.\nVERDICT : OK', 'VERDICT : OK']);
    const v = await CTRL.juger({ cerveau: J.cerveau, agent: 'lea', objet: 'Objet', corps: 'Bonjour,\n\nTexte.\n\nBien cordialement,', contexte: [] });
    vrai('⛔ une réponse hors forme qui ne COMMENCE pas par « VERDICT » a droit à UNE relance (ici : verdict OK)', v.etat === 'ok' && J.vus.length === 2, JSON.stringify([v, J.vus]));
    vrai('⛔ … À NEUF : la première réponse (peut-être influencée par un courriel piégé) n’est PAS remise en tour « assistant » (relecture du gardien)', J.vus[1] === 1, JSON.stringify(J.vus));
  }
  {
    const J = juge(['Le courriel me paraît correct.', 'Il est très bien.']);
    const v = await CTRL.juger({ cerveau: J.cerveau, agent: 'lea', objet: 'Objet', corps: 'Bonjour,', contexte: [] });
    vrai('   deux réponses hors forme : « indisponible », rien n’est deviné, et pas de troisième appel', v.etat === 'indisponible' && J.vus.length === 2, JSON.stringify([v, J.vus]));
  }
  {
    const J = juge(['VERDICT : OK']);
    const v = await CTRL.juger({ cerveau: J.cerveau, agent: 'lea', objet: 'Objet', corps: 'Bonjour,', contexte: [] });
    vrai('   une réponse en forme : un seul appel', v.etat === 'ok' && J.vus.length === 1);
  }
  {
    /* (27 octobre 2026) `incoherent` sans phrase citée ne bloque plus (test-3082) : la rigueur de la relance se garde sur une autre faute du juge */
    const J = juge(['Je trouve ce courriel robotique.\nVERDICT : OK', 'VERDICT : ECHEC\nFAUTE : ton_robotique']);
    const v = await CTRL.juger({ cerveau: J.cerveau, agent: 'lea', objet: 'Objet', corps: 'Bonjour,', contexte: [] });
    vrai('   la relance est lue avec la même rigueur (un ÉCHEC reste un échec, ses fautes comprises)', v.etat === 'echec' && v.fautes.join() === 'ton_robotique');
  }
  const LEA = sans(fs.readFileSync(path.join(RACINE, 'server', 'agent-lea.js'), 'utf8'));
  vrai('⛔ Léa dit au juge d’où vient l’activité (indiquée, déduite du site, ou à déduire du nom)', /\(indiquée par l’inscrit\)/.test(LEA) && /\(déduite d’une recherche sur l’entreprise\)/.test(LEA) && /le courriel peut la déduire du nom de l’entreprise/.test(LEA));
  const BR = sans(fs.readFileSync(path.join(RACINE, 'server', 'agents-brouillons.js'), 'utf8'));
  vrai('⛔ la vue d’un brouillon dit la RAISON d’un contrôle « non vérifié » (un code du serveur, borné par controleRange)', /controle: \{ etat: c\.etat, fautes: CTRL\.phrasesDe\(c\.fautes\), juge: c\.juge, reecrit: e\.reecrit === true, raison: c\.raison(?:, citations: c\.citations)? \}/.test(BR));

  console.log('\n4. Scénario 9 — les formules du modèle de courriel ne sont pas des formules toutes faites');
  vrai('(population) quatre formules maison déclarées (les deux de tous les courriels, l’accroche et la suite de Léa — examen du 27 octobre)', Array.isArray(EX.FORMULES_MAISON) && EX.FORMULES_MAISON.length === 4, JSON.stringify(EX.FORMULES_MAISON));
  for (const f of EX.FORMULES_MAISON) {
    const chez = ['agent-lea.js', 'agent-camille.js', 'agent-chloe.js'].filter(n => sans(fs.readFileSync(path.join(RACINE, 'server', n), 'utf8')).includes('« ' + f + ' »'));
    vrai('⛔ « ' + f + ' » est bien IMPOSÉE par le cahier d’un agent (sinon l’exemption serait pour du vide) : ' + chez.join(', '), chez.length >= 1);
  }
  const EXS = sans(fs.readFileSync(path.join(RACINE, 'server', 'examen.js'), 'utf8'));
  vrai('⛔ le critère « sans formule toute faite » du juge les exempte, par la liste (pas recopiées à la main)', /cle: 'c2', libelle: 'sans formule toute faite'[^\n]*FORMULES_MAISON\.map/.test(EXS));

  console.log(`\ntest-3001 : ${ok} ✓ ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
