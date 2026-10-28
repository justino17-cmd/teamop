/* 2996 — LES QUATRE ÉCHECS DE L'EXAMEN DU 24 OCTOBRE 2026 AU SOIR (5 réussis, 4 échecs, examen de 21 h 07, le premier sur le serveur corrigé).
     · Scénario 2 : chargée, Camille passait « la mise à jour de la FAQ support » à Louis — refusé, « cette tâche n'existe pas » : l'outil attend l'identifiant
       entre crochets, elle donnait l'INTITULÉ → `resoudreTache` (un intitulé qui ne désigne qu'une tâche ; un doute reste un refus).
     · Scénario 4 : priée de demander à Hugo et de rapporter, Camille n'a rien dit dans le fil de Justin (un seul outil, la question écrite AILLEURS) → quand
       Justin écrit et que l'agent ne rend que des outils, un second appel SANS outil lui demande son message pour CE fil. À un collègue, non.
     · Scénario 9 : « je confirme mes objectifs », « rien à ajouter » d'un agent à l'autre en réunion → `sansRedites` retire ces phrases en DISCUSSION.
     · Scénario 6 : trois critères « illisibles » (au plus probable, un objet JSON par courriel) → un verdict par objet, ET entre eux ; la raison d'un critère est
       la sienne (`raisonDe`) ; un brouillon dit POURQUOI il n'est pas parti (`pourquoiBrouillon`). La lecture du verdict du contrôle qualité (une ligne
       d'explication n'est plus « hors forme ») est gardée par `test-2900`.
   Les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js` (montage de `test-2993`), faux cerveau scripté. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, info) => v(t + (info !== undefined && !c ? ' — ' + String(info).slice(0, 300) : ''), !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2996-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();
const sans = s => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

console.log('\n── 2996 · les quatre échecs de l’examen du 24 octobre 2026 au soir ──');
(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const RE = require(path.join(RACINE, 'server', 'reunions.js'));
  const EX = require(path.join(RACINE, 'server', 'examen.js'));
  const REG = AG.AGENTS.map(a => a.id);

  let n = 0;
  async function monter(script) {
    const D = path.join(banc, 'm' + (n++)); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    let horloge = 1.8e12;
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge });
    const appels = []; let eq = null;
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => (horloge += 1000), pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = { penser: async (id, system, messages, opts) => { const dernier = messages[messages.length - 1].content; appels.push({ id, dernier, outils: !!(opts && opts.outils && opts.outils.length), schema: opts && opts.outils }); return script(id, dernier, system); } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {} });
    const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const envoyer = async (fil, texte) => { const r = res(); await routes.post['/api/monitor/conversations/envoyer']({ body: { fil, texte }, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    const messages = async fil => { const r = res(); await routes.get['/api/monitor/conversations/:fil']({ params: { fil }, query: {}, tourUser: { nom: 'Justin' } }, r); return r.corps.messages; };
    return { agents, conv, eq, appels, envoyer, messages };
  }
  const calme = async () => { for (let i = 0; i < 8; i++) await dormir(40); };
  const rep = (texte, actions) => ({ ok: true, texte, actions: actions || [] });
  const passer = (vers, tache, raison) => ({ id: 'x', nom: 'passer', entree: { vers, tache, raison } });
  const charger = E => {
    E.agents.consigner('justin', 'camille', 'Éplucher les trois courriers à traiter pour les questions qui reviennent');
    E.agents.consigner('justin', 'camille', 'Relire les douze courriels restés sans réponse depuis lundi');
    E.agents.consigner('justin', 'camille', 'Mettre à jour la liste des questions fréquentes du support');
  };
  const tacheDe = (E, texte) => { for (const id of REG) for (const t of E.agents.tachesDe(id)) if (t.texte === texte) return Object.assign({ vers: id }, t); return null; };

  console.log('\n1. ⛔ Scénario 2 — une tâche se désigne par son IDENTIFIANT, choisi dans une liste fermée ; on ne devine jamais');
  {
    const E = await monter(id => id === 'camille' ? rep('Je m’en occupe ; je suis sur trois dossiers, je passe la FAQ à Louis.', [passer('louis', 'la mise à jour de la FAQ support', 'je suis sur trois dossiers')]) : rep('RAS'));
    charger(E);
    await E.envoyer('clients', '@Camille, il me faudrait aussi une réponse type pour les demandes de facture, avant ce soir.');
    await calme();
    const siens = E.agents.tachesDe('camille').map(t => t.id).sort();
    const sch = (E.appels.find(a => a.id === 'camille') || {}).schema || [];
    const champ = o => { const t = sch.find(x => x.name === o); return t && t.input_schema.properties.tache; };
    v('⛔ le schéma de passer ET de terminer offre la liste FERMÉE de ses tâches en cours (l’intitulé ne peut plus être pris pour un identifiant)', [(champ('passer') || {}).enum && champ('passer').enum.slice().sort(), (champ('terminer') || {}).enum && champ('terminer').enum.slice().sort()], [siens, siens]);
    v('⛔ un INTITULÉ n’est pas deviné (« répondre au prospect Dupont » attrapait la tâche Martin) : rien ne passe, le refus se dit', [tacheDe(E, 'Mettre à jour la liste des questions fréquentes du support').vers, (await E.messages('clients')).some(m => m.de === 'systeme' && /refusé, cette tâche n’existe pas/.test(m.texte))], ['camille', true]);
  }
  {
    let idVoulu = '';
    const E = await monter(id => id === 'camille' ? rep('Je passe la relecture à Louis.', [passer('louis', '[' + idVoulu.toUpperCase() + ']', 'je suis chargée')]) : rep('RAS'));
    charger(E);
    idVoulu = tacheDe(E, 'Relire les douze courriels restés sans réponse depuis lundi').id;
    await E.envoyer('camille', 'Camille, tu en es où ?');
    await calme();
    v('   l’identifiant écrit avec ses crochets, dans une autre casse, est reconnu', tacheDe(E, 'Relire les douze courriels restés sans réponse depuis lundi').vers, 'louis');
  }
  {
    const E = await monter(id => rep('RAS'));
    await E.envoyer('camille', 'Camille, tu es là ?');
    await calme();
    const sch = (E.appels.find(a => a.id === 'camille') || {}).schema || [];
    const t = sch.find(x => x.name === 'passer');
    v('   sans tâche en cours, l’outil reste offert (la liste des outils ne change pas) avec un champ libre', [!!t, t && t.input_schema.properties.tache.enum], [true, undefined]);
  }

  console.log('\n2. ⛔ Scénario 4 — des outils et pas un mot à JUSTIN : un second appel, sans outil, pour ce fil');
  {
    const E = await monter((id, dernier) => {
      if (id === 'camille' && /Tes outils sont faits/.test(dernier)) return rep('J’ai posé la question à @hugo pour DOS-900002, je te redis dès qu’il répond.');
      if (id === 'camille') return rep('', [{ id: 'y', nom: 'ecrire', entree: { fil: 'equipe', texte: '@hugo le dossier DOS-900002 a-t-il payé ?' } }]);
      if (id === 'hugo') return rep('DOS-900002 : impayé.');
      return rep('RAS');
    });
    await E.envoyer('clients', '@Camille, un client dit avoir payé le dossier DOS-900002. Demande à @Hugo, et dis-moi ce qu’il répond.');
    await calme();
    const cam = E.appels.filter(a => a.id === 'camille');
    v('⛔ Camille est rappelée UNE fois, sans outil, avec ce que ses outils ont donné', [cam.length, cam[1] && cam[1].outils, cam[1] && /Tes outils sont faits \(ecrire : fait\)/.test(cam[1].dernier)], [2, false, true]);
    const ms = await E.messages('clients');
    vrai('   et Justin LIT sa réponse, dans son fil', ms.some(m => m.de === 'camille' && /J’ai posé la question à @hugo/.test(m.texte)), JSON.stringify(ms.map(m => [m.de, m.texte])));
  }
  {
    const E = await monter((id, dernier) => {
      if (id === 'lea') return rep('@camille, tu peux regarder le courrier en attente ?');
      if (id === 'camille') return rep('', [{ id: 'z', nom: 'prendre', entree: { texte: 'Regarder le courrier en attente' } }]);
      return rep('RAS');
    });
    await E.envoyer('equipe', '@Léa, fais le point avec l’équipe.');
    await calme();
    v('   un COLLÈGUE (pas Justin) qui reçoit des outils sans un mot : pas de second appel', E.appels.filter(a => a.id === 'camille').length, 1);
  }
  {
    const E = await monter(id => id === 'camille' ? rep('Je prends.', [{ id: 'w', nom: 'prendre', entree: { texte: 'Préparer la réponse type' } }]) : rep('RAS'));
    await E.envoyer('camille', 'Camille, prépare une réponse type.');
    await calme();
    v('   une réponse AVEC du texte et des outils : un seul appel', E.appels.filter(a => a.id === 'camille').length, 1);
  }
  {
    const E = await monter(id => id === 'camille' ? rep('', [{ id: 'v', nom: 'ecrire', entree: { fil: 'clients', texte: 'Je regarde le dossier et je te redis.' } }]) : rep('RAS'));
    await E.envoyer('clients', '@Camille, tu peux regarder le dossier DOS-900003 ?');
    await calme();
    v('⛔ un outil a DÉJÀ écrit dans ce fil (ecrire vers ce fil) : pas de relance, pas de doublon (relecture du gardien)', [E.appels.filter(a => a.id === 'camille').length, (await E.messages('clients')).filter(m => m.de === 'camille').length], [1, 1]);
  }
  {
    const E = await monter(id => id === 'camille' ? rep('', [{ id: 'u', nom: 'demander_justin', entree: { question: 'Je relance le client ou j’attends lundi ?' } }]) : rep('RAS'));
    await E.envoyer('camille', 'Camille, pour le client Sigma, tu fais quoi ?');
    await calme();
    v('   la question à Justin posée dans SON fil privé : pas de relance non plus', E.appels.filter(a => a.id === 'camille').length, 1);
  }

  console.log('\n3. ⛔ Scénario 9 — les redites de réunion ne se publient pas');
  {
    const R = RE.sansRedites;
    const cas = [
      ['Confirmé, je garde ces trois objectifs pour la semaine. Rien à ajouter sur les autres dossiers, tout est clair de mon côté.', 'Tout est clair de mon côté.'],
      ['Je confirme mes objectifs de la semaine : finaliser ma proposition en attente, répondre sous 24h.', 'Finaliser ma proposition en attente, répondre sous 24h.'],
      ['Ça marche @ines, je te transmets le détail de mes 2 mails dès que tu veux. Je confirme mes objectifs de la semaine.', 'Ça marche @ines, je te transmets le détail de mes 2 mails dès que tu veux.'],
      ['Rien à signaler.', ''], ['@victor @max', ''], ['Je garde un œil sur les trois dossiers ouverts.', 'Je garde un œil sur les trois dossiers ouverts.']];
    v('les phrases de l’examen : la FORMULE retirée, le reste gardé', cas.map(x => R(x[0])), cas.map(x => x[1]));
    const utiles = [
      ['Je confirme mes objectifs, et je m’engage à livrer le rapport vendredi.', 'Je m’engage à livrer le rapport vendredi.'],
      ['Je garde mes objectifs, mais @hugo doit vérifier le paiement avant mardi.', '@hugo doit vérifier le paiement avant mardi.'],
      ['Rien à signaler sur le planning, en revanche la livraison de Max a deux jours de retard.', 'Rien à signaler sur le planning, en revanche la livraison de Max a deux jours de retard.'],
      ['Parfait, je retiens les objectifs de Léa : 20 inscriptions avant le 30.', 'Parfait, je retiens les objectifs de Léa : 20 inscriptions avant le 30.']];
    v('⛔ une phrase UTILE qui commence comme une redite garde son engagement, sa demande et son @ (relecture du gardien)', utiles.map(x => R(x[0])), utiles.map(x => x[1]));
    const SRC = sans(fs.readFileSync(path.join(RACINE, 'server', 'reunions.js'), 'utf8'));
    vrai('⛔ la DISCUSSION les retire (`redites: true`), et une parole vidée est un « RAS » qui ne s’écrit pas', /On t’a cité dans la discussion\.[^']*', \{ ras: true, redites: true \}\)/.test(SRC) && /if \(o\.redites\) \{ t = sansRedites\(t\); if \(!t\) return Object\.assign\(sortie, \{ ras: true \}\); \}/.test(SRC));
    vrai('   …pas le tour de table, où dire ses objectifs EST la parole attendue', /consignes\[R\.type\] \+ extra, \{ ecrire: true, varier: true \}\)/.test(SRC));
  }

  console.log('\n4. ⛔ Scénario 6 — le juge : un verdict par objet, ET entre eux ; chaque critère sa raison ; un brouillon dit pourquoi');
  {
    const c = ['c1', 'c2', 'c3'];
    const un = (a, b, d, r) => JSON.stringify({ c1: a, c2: b, c3: d, raison: r });
    v('⛔ trois objets (un par courriel) : un critère n’est respecté que s’il l’est dans TOUS', EX.lireVerdict(un(true, true, true, 'Toka : rien') + '\n' + un(false, true, true, 'c1 : Dupont promet un envoi automatique') + '\n' + un(true, true, true, 'rien'), c),
      { valeurs: { c1: false, c2: true, c3: true }, raison: 'Toka : rien ; c1 : Dupont promet un envoi automatique ; rien' });
    v('   un seul objet après une analyse : lu', EX.lireVerdict('Analyse rapide. ' + un(true, false, true, 'c2 : générique'), c).valeurs, { c1: true, c2: false, c3: true });
    v('⛔ un objet INCOMPLET parmi d’autres rend tout illisible (écarté, il rendait son critère vrai — relecture du gardien)', [EX.lireVerdict(un(true, true, true, 'rien') + ' {"c1":false,"raison":"x"}', c), EX.lireVerdict('{"c1":true} {"c2":false}', c)], [null, null]);
    v('⛔ une raison qui cite « {entreprise} » ne coupe pas son objet : le critère faux reste faux', EX.lireVerdict(un(true, true, true, 'rien') + '\n' + un(true, false, true, 'c2 : le courriel contient {entreprise} non remplacé'), c).valeurs, { c1: true, c2: false, c3: true });
    const cl = ['c1', 'c2', 'c3', 'c4'];
    v('⛔ la raison d’UN critère est la sienne (l’examen de 21 h 07 affichait la phrase des réunions sous les courriels)', [EX.raisonDe('c2 : formules répétées « je confirme mes objectifs » ; c4 : un courriel finit sans politesse', 'c2', cl), EX.raisonDe('c2 : formules répétées ; c4 : un courriel finit sec', 'c4', cl), EX.raisonDe('Ton naturel mais formules répétées', 'c4', cl)],
      ['formules répétées « je confirme mes objectifs »', 'un courriel finit sec', 'Ton naturel mais formules répétées']);
    const E = { brouillons: { vue: ref => ref === 'b1' ? { controle: { etat: 'non_verifie', fautes: [], raison: 'réponse du juge hors forme' } } : ref === 'b2' ? { controle: { etat: 'a_revoir', fautes: ['fait_invente'] } } : null } };
    v('⛔ un brouillon dit POURQUOI il n’est pas parti : le verdict du contrôle, ses fautes, sa raison', [EX.pourquoiBrouillon(E, { ref: 'b1' }), EX.pourquoiBrouillon(E, { ref: 'b2' }), EX.pourquoiBrouillon(E, { ref: 'b3', controle: 'bon' }), EX.pourquoiBrouillon(E, null)],
      [' ; contrôle « non verifie », réponse du juge hors forme', ' ; contrôle « a revoir », fautes : fait_invente', ' ; contrôle « bon »', '']);
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a JETÉ : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
