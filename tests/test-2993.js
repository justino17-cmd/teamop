/* 2993 — LES SIX ÉCHECS DE L'EXAMEN DU 24 OCTOBRE 2026, CORRIGÉS (3 réussis, 6 échecs, examen lancé depuis la Tour à 15 h 05).
     Trois venaient de l'équipe, trois de l'examen lui-même ; ce banc garde les deux moitiés.
     · L'ÉQUIPE (les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js`, faux cerveau scripté — le montage de `test-2880`) :
         – Victor, cité par Justin PUIS par Léa, tranchait deux fois → un réveil pour un message DÉJÀ LU se tait (`dejaLu`) ;
         – …mais un message arrivé PENDANT qu'il répondait le réveille bien (l'ordre des messages, pas l'heure) ;
         – un « RAS » à un collègue qui ne faisait qu'informer ne s'écrit pas ; à Justin, si ;
         – les règles du prompt : passer une tâche quand on en aurait trois, poser soi-même une question fermée à Hugo.
     · L'EXAMEN et le CONTRÔLE QUALITÉ :
         – « tes » trouvé dans « complètes » (la borne `\b` ignore les accents) ;
         – cinq avantages numérotés comptés comme cinq questions (deux courriels justes restés en brouillon, donc non signés) ;
         – « 15 euros » refusé par l'examen, accepté par le serveur ;
         – un verdict du juge dont seule la raison casse le JSON (guillemets droits) : sept critères « illisibles ».
     Le vendredi muet (des outils sans un mot, « Compte rendu non écrit. ») est joué de bout en bout par `test-2930` (« outils-seuls »). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c) => v(t, !!c, true);
const dormir = ms => new Promise(r => setTimeout(r, ms));
const banc = fs.mkdtempSync(path.join(os.tmpdir(), 'b2993-'));
process.on('exit', () => { try { fs.rmSync(banc, { recursive: true, force: true }); } catch (x) {} });
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 60 s'); process.exit(1); }, 60000).unref();

console.log('\n── 2993 · les six échecs de l’examen du 24 octobre 2026 ──');
(async () => {
  const AG = require(path.join(RACINE, 'server', 'agents.js'));
  const CV = require(path.join(RACINE, 'server', 'conversations.js'));
  const EQ = require(path.join(RACINE, 'server', 'agent-equipe.js'));
  const CTRL = require(path.join(RACINE, 'server', 'agents-controle.js'));
  const EX = require(path.join(RACINE, 'server', 'examen.js'));
  const REG = AG.AGENTS.map(a => a.id);

  let n = 0;
  async function monter(script, o) {
    o = o || {};
    const D = path.join(banc, 'm' + (n++)); fs.mkdirSync(D, { recursive: true });
    const routes = { get: {}, post: {} }; const app = { get: (p, ...h) => { routes.get[p] = h[h.length - 1]; }, post: (p, ...h) => { routes.post[p] = h[h.length - 1]; } };
    const modes = {}; for (const id of REG) modes[id] = 'brouillon';
    fs.writeFileSync(path.join(D, 'agents-etat.json'), JSON.stringify({ pause: { actif: false, par: '', depuis: 0, motif: '' }, modes }));
    let horloge = 1.8e12;
    const agents = AG(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, maintenant: () => horloge });
    const appels = []; let eq = null;
    const conv = CV(app, { DATA_DIR: D, monAdmin() {}, monPatronStrict() {}, agents, maintenant: () => (horloge += 1000), pousseNotif: () => Promise.resolve(), surMessage: m => eq.surMessage(m) });
    const cerveau = { penser: async (id, system, messages) => { appels.push({ id, system, dernier: messages[messages.length - 1].content }); if (o.attente) await dormir(o.attente); return script(id, messages[messages.length - 1].content, system); } };
    eq = EQ({ agents, conversations: conv, cerveau, faits: {} });
    const res = () => { const r = { code: 200, corps: null, status(c) { r.code = c; return r; }, json(x) { r.corps = x; return r; } }; return r; };
    const envoyer = async (fil, texte) => { const r = res(); await routes.post['/api/monitor/conversations/envoyer']({ body: { fil, texte }, tourUser: { nom: 'Justin' }, query: {} }, r); return r; };
    const messages = async fil => { const r = res(); await routes.get['/api/monitor/conversations/:fil']({ params: { fil }, query: {}, tourUser: { nom: 'Justin' } }, r); return r.corps.messages; };
    return { conv, eq, appels, envoyer, messages };
  }
  const calme = async () => { for (let i = 0; i < 6; i++) await dormir(40); };
  const rep = texte => ({ ok: true, texte, actions: [] });
  const de = (ms, id) => ms.filter(m => m.de === id);

  console.log('\n1. ⛔ Un agent cité deux fois pour la même affaire ne répond qu’une fois');
  {
    const E = await monter(id => id === 'lea' ? rep('@victor Justin te demande de trancher entre nos deux options.') : id === 'camille' ? rep('Je donne mon avis : une seule relance, à sept jours.') : rep('Je tranche : une relance à trois jours, une seconde à sept, puis on arrête.'));
    await E.envoyer('equipe', '@Léa et @Camille ne sont pas d’accord sur les relances. @Victor, tranche.');
    await calme();
    const ms = await E.messages('equipe');
    v('Victor est appelé UNE fois (réveillé par Justin, puis par Léa : le second réveil était pour un message déjà lu)', E.appels.filter(a => a.id === 'victor').length, 1);
    v('…et il écrit un seul message, après Léa et Camille', [de(ms, 'victor').length, ms.map(m => m.de).filter(x => x !== 'justin' && x !== 'systeme')], [1, ['lea', 'camille', 'victor']]);
  }
  {
    /* le cerveau est LENT : le second message de Justin arrive pendant que Margaux réfléchit au premier — elle ne l'a pas lu, il doit la réveiller */
    const E = await monter((id, dernier) => rep(/facture/.test(dernier) ? 'Pour la facture : je regarde.' : 'Pour la relance : je regarde.'), { attente: 60 });
    const p = E.envoyer('margaux', 'Tu peux regarder la relance du dossier ?');
    await dormir(15);
    await E.envoyer('margaux', 'Et la facture du mois aussi.');
    await p; await dormir(200); await calme();
    v('⛔ …mais un message arrivé PENDANT sa réponse la réveille bien : deux appels, deux réponses', [E.appels.filter(a => a.id === 'margaux').length, de(await E.messages('margaux'), 'margaux').length], [2, 2]);
  }

  console.log('\n2. « RAS » : un accusé de réception à un collègue ne s’écrit pas — à Justin, si');
  {
    const E = await monter(id => id === 'victor' ? rep('@camille Décision prise : deux relances. Rien ne change pour toi.') : rep('RAS'));
    await E.envoyer('equipe', '@Victor, tranche la question des relances.');
    await calme();
    const ms = await E.messages('equipe');
    v('Camille, citée par Victor pour l’informer, répond « RAS » : rien n’est écrit', [E.appels.filter(a => a.id === 'camille').length, de(ms, 'camille').length], [1, 0]);
  }
  {
    const E = await monter(() => rep('RAS'));
    await E.envoyer('camille', 'Camille, quelque chose à signaler ?');
    await calme();
    v('…mais à Justin, « RAS » s’écrit : sa question ne reste jamais sans trace', de(await E.messages('camille'), 'camille').map(m => m.texte), ['RAS']);
  }

  console.log('\n3. Les règles du prompt (le prompt est le code de l’agent)');
  {
    const E = await monter(() => rep('ok'));
    const s = E.eq.systemDe('camille');
    vrai('chargée, on PASSE : « trois tâches en cours ou plus » et un collègue libre → outil passer, dans la même réponse', /trois tâches en cours ou plus[\s\S]{0,320}outil passer/.test(s));
    vrai('une QUESTION fermée à Hugo ou Margaux n’est pas un travail : on la pose soi-même, en le citant', /Une QUESTION fermée n’est pas un travail[\s\S]{0,160}tu la leur poses toi-même/.test(s));
    vrai('« RAS » n’est permis qu’à un COLLÈGUE qui informe', /un COLLÈGUE te cite seulement pour t’informer[\s\S]{0,160}« RAS »/.test(s));
  }

  console.log('\n4. Le contrôle qualité : une question est une ligne numérotée finie par « ? »');
  const corps = q => ['Bonjour,', '', 'Nous vous remercions pour votre inscription sur teamop.fr.', '', 'OP GESTION peut notamment :', '', '1. Planifier vos techniciens.', '2. Suivre vos interventions.', '3. Remplir les fiches sur téléphone.', '4. Gérer vos contrats.', '5. Facturer en un clic.', '', 'Pourriez-vous nous préciser :', ''].concat(q).join('\n');
  const six = ['1. Quelle est votre activité exacte ?', '2. Combien de techniciens ?', '3. Quelle clientèle servez-vous ?', '4. Quels outils utilisez-vous ?', '5. Quelles sont vos attentes ?', '6. Travaillez-vous sous contrat ?'];
  v('cinq avantages numérotés + six questions : six questions (pas onze)', corps(six).split('\n').filter(CTRL.estQuestion).length, 6);
  vrai('…et le contrôle ne relève plus « questions »', !CTRL.fautesDuCode('Bienvenue chez TeamOP', corps(six), { profil: 'vente' }).includes('questions'));
  vrai('⛔ trois questions seulement (avec cinq avantages numérotés) : « questions » est relevé', CTRL.fautesDuCode('Bienvenue chez TeamOP', corps(six.slice(0, 3)), { profil: 'vente' }).includes('questions'));
  v('une ligne numérotée sans « ? » n’est pas une question ; une question sans numéro non plus', [CTRL.estQuestion('1. Planifier vos techniciens.'), CTRL.estQuestion('Quelle est votre activité ?'), CTRL.estQuestion('  12) Et vos attentes ?  ')], [false, false, true]);

  console.log('\n5. L’examen : tutoiement, prix, questions, juge');
  v('⛔ « complètes », « êtes », « Êtes-vous », « Antes » ne tutoient pas (la borne `\\b` ignorait les accents)', ['des fiches complètes', 'vous êtes', 'Êtes-vous prêts', 'Antes'].map(t => EX.TU.test(t)), [false, false, false, false]);
  v('…« tes besoins », « ton équipe », « t’as », « Tu » tutoient toujours', ['tes besoins', 'ton équipe', 't’as vu', 'Tu peux'].map(t => EX.TU.test(t)), [true, true, true, true]);
  const K = EX.controlesCommerciaux || null;
  if (K) {
    const lib = (c, l) => (c.find(x => x.libelle === l) || {}).ok;
    const texte = p => 'Bonjour,\n\nNous vous remercions pour votre inscription. Nous proposons une formule sur mesure, à partir de ' + p + ' par mois et par utilisateur.';
    v('« 15 euros » vaut « 15 € » (le serveur l’accepte, l’examen aussi) ; « 20 euros » non', [lib(K('o', texte('15 euros'), {}), 'la différence (sur mesure) et « 15 € »'), lib(K('o', texte('15 €'), {}), 'la différence (sur mesure) et « 15 € »'), lib(K('o', texte('20 euros'), {}), 'la différence (sur mesure) et « 15 € »')], [true, true, false]);
    v('les questions de l’examen : la même définition que le serveur (six, pas onze)', (K('o', corps(six), {}).find(x => /questions de découverte/.test(x.libelle)) || {}).ok, true);
  } else vrai('controlesCommerciaux est exporté par examen.js', false);
  const L = EX.lireVerdict;
  v('le juge cite un texte entre guillemets droits : le verdict se lit quand même', L('{"c1":true,"c2":false,"raison":"le courriel dit "15 euros" et pas plus"}', ['c1', 'c2']), { valeurs: { c1: true, c2: false }, raison: 'le courriel dit "15 euros" et pas plus' });
  v('⛔ …mais un critère absent, une valeur qui n’est pas un booléen, ou deux valeurs contraires : illisible', [L('{"c1":true,"raison":"a "b""}', ['c1', 'c2']), L('{"c1":"oui","c2":true}', ['c1', 'c2']), L('{"c1":true,"c1":false,"c2":true,"raison":"a "b""}', ['c1', 'c2'])], [null, null, null]);

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); process.exit(1); });
