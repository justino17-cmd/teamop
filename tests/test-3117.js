/* ⛔ CE QUE CE FICHIER GARDE — LES AGENTS SE PARLENT : `demander`, `assigner`, Victor chef (28 octobre 2026, Justin : « J'aimerais que les agents communiquent entre eux. Parce que là, il n'y a aucune
   communication. Tout le monde fait tout et rien en même temps » ; « Qui gère tout ? »).
   Les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js`, `cerveau.js` (établi `banc-autonomie.js`) ; un faux Anthropic qui joue les outils demandés.
     · `demander` : depuis un FIL PRIVÉ (où « @camille » écrit dans la réponse ne réveille personne), le code écrit « @collègue … » dans Équipe, avec la racine et prof + 1 : le collègue est réveillé, et le fil du
       réveil reçoit une ligne « X vient de demander à Y » ;
     · `assigner` (Victor seul) : « qui fait quoi » — la tâche existe, « demandée par » Victor, et le titulaire est réveillé ; la même tâche déjà en cours chez quelqu'un est refusée (« déjà pris par… ») ;
       Hugo et Margaux : `consigne_libre_refusee`, aucune tâche née ; deux demandes au plus par réponse ;
     · Victor est le MENEUR et un membre des quatre groupes ; son prompt dit qu'il est le chef, celui des autres non ; le bloc « Travail en cours dans l'équipe » dit qui fait déjà quoi ;
     · Victor répartit depuis un titulaire non chargé, vers un collègue qui a moins de trois tâches — les autres gardent la règle d'avant ; Hugo et Margaux restent exclus ;
     · ACTIONS_MAX = 6 ; `ecrire` dans le fil du réveil est permis quand il cite un collègue de plus. */
'use strict';
const { monter, rep, outil, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 120 s'); process.exit(1); }, 120000).unref();

console.log('\n── 3117 · demander, assigner, Victor chef ──');
(async () => {
  const EQ = require(S('agent-equipe.js')), CV = require(S('conversations.js')), AG = require(S('agents.js'));

  console.log('\n1. Les outils (schémas purs)');
  {
    const noms = o => EQ.outilsDe('lea', o).map(t => t.name);
    const ids = AG.AGENTS.map(a => a.id).filter(x => x !== 'lea');
    v('⛔ pour tout agent : six outils communs, `demander` en dernier', noms({ fils: ['lea', 'equipe'], collegues: ['camille'], pairs: ids }), ['ecrire', 'prendre', 'passer', 'terminer', 'demander_justin', 'demander']);
    v('⛔ `assigner` pour le chef seulement (`chef:true`) — sept, huit avec l\'arbitrage', [noms({ chef: true, collegues: ['camille'] }).slice(-1)[0], noms({ chef: true, arbitre: true, collegues: ['camille'] }).length], ['assigner', 8]);
    const O = EQ.outilsDe('victor', { fils: ['victor', 'equipe'], collegues: ['lea', 'camille'], pairs: ['lea', 'camille', 'hugo', 'margaux'], chef: true });
    const dem = O.find(t => t.name === 'demander'), ass = O.find(t => t.name === 'assigner');
    v('`demander` peut joindre Hugo et Margaux (une QUESTION fermée) ; `assigner` ne les offre pas (un travail en texte libre, jamais)', [dem.input_schema.properties.vers.enum, ass.input_schema.properties.vers.enum], [['lea', 'camille', 'hugo', 'margaux'], ['lea', 'camille']]);
    vrai('…schémas fermés : additionalProperties:false et tous les champs requis', [dem, ass].every(t => t.input_schema.additionalProperties === false && t.input_schema.required.length === 2));
    vrai('(population) Victor reste sous la borne de 12 outils de `cerveau.js` avec ses outils propres (arbitrer + deux de réunion)', EQ.outilsDe('victor', { chef: true, arbitre: true, collegues: ['lea'], propres: [{ name: 'planifier_reunion' }, { name: 'annuler_reunion' }] }).length === 10);
  }

  console.log('\n2. `demander` depuis un fil PRIVÉ : le collègue est réveillé, Justin voit la demande');
  {
    const H = monter({ script: (t) => t.id === 'lea' && t.requete.tools.includes('demander') && !t.messages[t.messages.length - 1].content.includes('Tes outils sont faits')
      ? rep('Je regarde.', [outil('demander', { vers: 'camille', texte: 'Peux-tu relire le courrier de ce matin pour moi ?' })])
      : t.id === 'camille' ? rep('Oui, je le relis.') : rep('Je viens de le demander à Camille.') });
    const r = await H.justin('lea', 'Léa, demande à Camille de relire le courrier de ce matin');
    const eq = await H.messages('equipe'), priv = await H.messages('lea');
    v('⛔ Camille est réveillée (elle ne l\'aurait JAMAIS été par une citation écrite dans le fil privé de Léa)', H.appels.map(a => a.id).filter(x => x === 'camille').length, 1);
    v('…le code a écrit « @camille … » dans Équipe, de la part de Léa, profondeur 2 (Justin 0, la réponse de Léa 1, la demande 1…)', eq.filter(m => m.de === 'lea').map(m => [m.texte, m.prof]).slice(0, 1), [['@camille Peux-tu relire le courrier de ce matin pour moi ?', 1]]);
    vrai('…Camille répond dans Équipe, une profondeur plus loin', eq.some(m => m.de === 'camille' && m.prof === 2 && /je le relis/.test(m.texte)), JSON.stringify(eq.map(m => [m.de, m.prof])));
    vrai('⛔ la demande porte la RACINE de Justin (le budget est le sien, pas un plafond horaire)', H.registre().filter(m => m.de === 'lea' || m.de === 'camille').every(m => m.racine === r.corps.message.id));
    vrai('⛔ le fil PRIVÉ de Léa dit « Léa vient de demander à Camille : … » (ligne du système) ET garde la réponse de Léa à Justin', priv.some(m => m.de === 'systeme' && /Léa vient de demander à Camille : « Peux-tu relire/.test(m.texte)) && priv.some(m => m.de === 'lea' && /Je regarde/.test(m.texte)), JSON.stringify(priv.map(m => [m.de, m.texte.slice(0, 40)])));
    /* contre-épreuve : la même citation écrite dans la réponse d'un fil privé ne réveille personne */
    const H2 = monter({ script: (t) => rep(t.id === 'lea' ? '@camille tu peux relire le courrier ?' : 'Je lis.') });
    await H2.justin('lea', 'Léa, préviens Camille');
    v('⛔ contre-épreuve : « @camille » écrit DANS le fil privé de Léa ne réveille personne (un seul appel, celui de Léa)', H2.appels.map(a => a.id), ['lea']);
    H.nettoyer(); H2.nettoyer();
  }

  console.log('\n3. `demander` : bornes et refus');
  {
    const H = monter({ script: (t) => t.id === 'lea' ? rep('Je m\'en occupe.', [outil('demander', { vers: 'lea', texte: 'À moi-même' }), outil('demander', { vers: 'pirate', texte: 'À un inconnu' }), outil('demander', { vers: 'camille', texte: '@tous @hugo Une demande qui essaie de citer tout le monde' }), outil('demander', { vers: 'max', texte: 'Deuxième demande' }), outil('demander', { vers: 'jules', texte: 'Troisième : refusée' })]) : rep('Reçu.') });
    await H.justin('equipe', '@lea préviens les autres');
    const eq = await H.messages('equipe');
    const demandes = eq.filter(m => m.de === 'lea' && /^@/.test(m.texte));
    v('⛔ soi-même et un inconnu : refusés ; DEUX demandes au plus par réponse (la troisième : « trop_de_demandes »)', [demandes.length, H.agents.lireJournal().filter(e => e.agent === 'lea' && e.action === 'outil demander' && e.resultat === 'refuse').map(e => e.detail)], [2, ['destinataire', 'destinataire', 'trop_de_demandes']]);
    vrai('⛔ les « @ » du texte sont ôtés : la demande ne réveille que son destinataire (Camille et Max, pas Hugo ni tout le monde)', H.appels.map(a => a.id).filter(x => x !== 'lea').sort().join() === 'camille,max' && !demandes.some(m => /@tous|@hugo/.test(m.texte.slice(m.texte.indexOf(' ') + 1))), JSON.stringify(H.appels.map(a => a.id)));
    H.nettoyer();
  }

  console.log('\n4. `assigner` : « qui fait quoi » — Victor répartit');
  {
    let n = 0;
    const H = monter({ script: (t) => {
      if (t.id === 'victor') { n++; return rep('Je répartis.', [outil('assigner', { vers: 'chloe', texte: 'Relancer les devis en attente de cette semaine' }), outil('assigner', { vers: 'lea', texte: 'relancer les devis en attente de cette SEMAINE !' }), outil('assigner', { vers: 'hugo', texte: 'Vérifier tous les paiements du mois' }), outil('assigner', { vers: 'camille', texte: 'Préparer la réponse type aux demandes de démonstration' })]); }
      return rep('Bien reçu, je m\'y mets (' + t.id + ').'); } });
    const r = await H.justin('equipe', 'Répartissez-vous les relances et la réponse type, merci');
    const T = H.taches().filter(k => k.statut === 'prise');
    v('⛔ la tâche existe, « demandée par » VICTOR, en cours chez Chloé ; la même (à la casse et à la ponctuation près) chez Léa : REFUSÉE ; Hugo : refusé', T.map(k => [k.vers, k.de, k.type]), [['chloe', 'victor', 'consigne'], ['camille', 'victor', 'consigne']]);
    const j = H.agents.lireJournal().filter(e => e.agent === 'victor' && e.action === 'outil assigner');
    v('…le journal dit pourquoi : doublon, consigne_libre_refusee (Hugo) — les refus ne comptent pas dans les deux demandes permises, la quatrième (Camille) passe', j.map(e => e.detail || e.resultat), ['assigne chloe', 'doublon', 'consigne_libre_refusee', 'assigne camille']);
    const eq = await H.messages('equipe');
    vrai('⛔ le titulaire est RÉVEILLÉ par « @chloe Relancer les devis… » écrit par Victor dans Équipe, sous la racine de Justin', H.appels.filter(a => a.id === 'chloe').length === 1 && eq.some(m => m.de === 'victor' && /^@chloe Relancer les devis/.test(m.texte) && H.registre().find(x => x.id === m.id).racine === r.corps.message.id));
    vrai('…et Chloé voit sa tâche dans « Tes tâches en cours », demandée par Victor', /Relancer les devis en attente de cette semaine.*demandée par victor/.test(H.appels.find(a => a.id === 'chloe').system));
    vrai('⛔ le doublon est DIT dans le fil : « déjà pris par Chloé »', eq.some(m => m.de === 'systeme' && /déjà pris par Chloé/.test(m.texte)), JSON.stringify(eq.filter(m => m.de === 'systeme').map(m => m.texte)));
    vrai('⛔ Hugo : aucune tâche, aucun réveil, et le fil le dit (seul Justin donne un travail libre)', !T.some(k => k.vers === 'hugo') && !H.appels.some(a => a.id === 'hugo') && eq.some(m => m.de === 'systeme' && /ne peut pas confier de travail en texte libre à Hugo/.test(m.texte)));
    H.nettoyer();
    const H3 = monter({ script: (t) => t.id === 'victor' ? rep('Je répartit tout.', [outil('assigner', { vers: 'chloe', texte: 'Premier travail à confier' }), outil('assigner', { vers: 'camille', texte: 'Deuxième travail à confier' }), outil('assigner', { vers: 'lea', texte: 'Troisième travail à confier' })]) : rep('Ok.') });
    await H3.justin('equipe', 'Répartis trois choses');
    v('⛔ trois assignations valables dans une réponse : DEUX passent, la troisième est refusée « trop_de_demandes » (Léa ne reçoit rien)', [H3.taches().map(k => k.vers), H3.agents.lireJournal().filter(e => e.agent === 'victor' && e.action === 'outil assigner').map(e => e.detail || e.resultat)], [['chloe', 'camille'], ['assigne chloe', 'assigne camille', 'trop_de_demandes']]);
    H3.nettoyer();
    /* un agent qui n'est pas le chef ne dispose pas d'`assigner` : l'appel est écarté par le cerveau */
    const H2 = monter({ script: (t) => t.id === 'lea' ? rep('Je donne du travail.', [outil('assigner', { vers: 'camille', texte: 'Travail donné par Léa' })]) : rep('Ok.') });
    await H2.justin('lea', 'Léa, donne du travail à Camille');
    v('⛔ Léa n\'est pas le chef : `assigner` ne lui est pas offert, l\'appel est écarté — aucune tâche, aucun réveil de Camille', [H2.taches().length, H2.appels.some(a => a.id === 'camille'), H2.appels[0].requete.tools.includes('assigner')], [0, false, false]);
    H2.nettoyer();
  }

  console.log('\n5. Victor est le chef : meneur et membre des quatre groupes');
  {
    const H = monter({ script: (t) => rep('Réponse de ' + t.id + '.') });
    await H.justin('clients', 'Où en est-on côté clients ?');
    await H.justin('plateforme', 'Et la plateforme ?');
    v('⛔ Justin écrit dans « clients » puis « plateforme » sans citer personne : VICTOR répond les deux fois (Léa et Max ne sont plus le meneur)', H.appels.map(a => a.id), ['victor', 'victor']);
    await H.justin('clients', '@lea et toi ?');
    v('…Léa répond quand on la cite', H.appels.slice(2).map(a => a.id), ['lea']);
    v('Victor est membre des quatre groupes', ['equipe', 'clients', 'plateforme', 'reunions'].map(f => H.conv.estMembre('victor', f)), [true, true, true, true]);
    const sv = H.appels[0].system, sl = H.appels[2].system;
    vrai('⛔ son prompt dit qu\'il est le CHEF et ce que sont assigner et demander ; celui de Léa non', /TU ES LE CHEF D’ÉQUIPE/.test(sv) && /l’outil assigner/.test(sv) && !/TU ES LE CHEF/.test(sl));
    vrai('…tous les prompts disent : une question n\'est pas une tâche, demander est le seul moyen de joindre un collègue depuis un fil privé, demander à Justin ne bloque rien', [sv, sl].every(x => /ne sont pas une tâche/.test(x) && /l’outil demander/.test(x) && /ne bloque jamais le reste/.test(x)));
    H.nettoyer();
  }

  console.log('\n6. Le bloc « Travail en cours dans l\'équipe » : qui fait déjà quoi, douze lignes au plus');
  {
    const H = monter({ script: () => rep('Ok.') });
    H.agents.consigner('justin', 'camille', 'Reprendre les courriels de la semaine');
    H.agents.consigner('justin', 'chloe', 'Préparer le devis du restaurant');
    for (let i = 1; i <= 12; i++) H.agents.consigner('justin', 'jules', 'Tâche numéro ' + i + ' de Jules');   // dix seulement : CONSIGNES_PAR_AGENT
    for (let i = 1; i <= 2; i++) H.agents.consigner('justin', 'theo', 'Tâche numéro ' + i + ' de Théo');
    await H.justin('lea', 'Léa, où en est-on ?');
    const sl = H.appels[0].system;
    vrai('⛔ Léa voit le bloc : titulaire + titre court de chacun', /Travail en cours dans l’équipe[\s\S]*- camille : « Reprendre les courriels de la semaine »[\s\S]*- chloe : « Préparer le devis du restaurant »/.test(sl));
    v('…douze lignes au plus (14 tâches en cours chez quatre agents)', (/\nTravail en cours dans l’équipe \(titulaire[^\n]*\n((?:- [^\n]*\n?)+)/.exec(sl)[1].match(/^- /gm) || []).length, 12);
    await H.justin('equipe', 'Victor, un point ?');
    const sv = H.appels.find(a => a.id === 'victor').system;
    vrai('Victor, lui, garde « Tâches en cours de l\'équipe (pour redistribuer) » avec les identifiants, pas le bloc court', /Tâches en cours de l’équipe \(pour redistribuer\)/.test(sv) && !/\nTravail en cours dans l’équipe \(titulaire/.test(sv));
    H.nettoyer();
  }

  console.log('\n7. Victor répartit depuis un titulaire non chargé, vers un collègue qui a moins de trois tâches');
  {
    const H = monter({ script: () => rep('Ok.') });
    H.agents.consigner('justin', 'jules', 'La seule tâche de Jules');
    for (let i = 1; i <= 2; i++) H.agents.consigner('justin', 'noah', 'Tâche ' + i + ' de Noah');
    const T = id => H.agents.tachesDe(id)[0].id;
    v('⛔ Victor passe la seule tâche de Jules à Noah, qui en a DEUX (moins de trois) : accepté', H.agents.passerConsigne('victor', T('jules'), 'noah').ok, true);
    v('…Noah en a trois : un nouveau passage vers lui est refusé « occupe »', (() => { H.agents.consigner('justin', 'lea', 'Une tâche de Léa'); return H.agents.passerConsigne('victor', T('lea'), 'noah').raison; })(), 'occupe');
    v('Hugo et Margaux restent exclus, pour Victor aussi', [H.agents.passerConsigne('victor', T('lea'), 'hugo').raison, H.agents.passerConsigne('victor', T('lea'), 'margaux').raison], ['jamais_hugo_margaux', 'jamais_hugo_margaux']);
    v('un autre agent garde la règle d\'avant (Léa, une seule tâche : « pas_charge »)', H.agents.passerConsigne('lea', T('lea'), 'sarah').raison, 'pas_charge');
    v('…et le destinataire doit être libre : Camille chargée de deux tâches, Théo avec une seule → « occupe »', (() => { for (const t of ['A', 'B']) H.agents.consigner('justin', 'camille', 'Tâche ' + t + ' de Camille'); H.agents.consigner('justin', 'theo', 'Une tâche de Théo'); return H.agents.passerConsigne('camille', H.agents.tachesDe('camille')[0].id, 'theo').raison; })(), 'occupe');
    H.nettoyer();
  }

  console.log('\n8. ACTIONS_MAX = 6, et `ecrire` dans le fil du réveil quand il cite un collègue de plus');
  {
    v('(la constante) six actions par réveil', EQ.ACTIONS_MAX, 6);
    const H = monter({ script: (t) => t.id === 'camille' ? rep('Voilà.', Array.from({ length: 8 }, (x, i) => outil('prendre', { texte: 'Travail numéro ' + (i + 1) + ' pris par Camille' }))) : rep('Ok.') });
    await H.justin('equipe', '@camille prends tout ça');
    v('⛔ huit appels d\'outils dans une réponse : les SIX premiers sont exécutés', H.taches().filter(k => k.vers === 'camille').length, 6);
    const H2 = monter({ script: (t) => t.id === 'victor' ? rep('Tranché : on garde la relance à 7 jours.', [outil('ecrire', { fil: 'equipe', texte: 'Tranché : on garde la relance à 7 jours.' }), outil('ecrire', { fil: 'equipe', texte: '@lea tu prépares le texte ?' })]) : rep('Je prépare le texte.') });
    await H2.justin('equipe', 'Victor, tranche entre nous');
    const ev = (await H2.messages('equipe')).filter(m => m.de === 'victor').map(m => m.texte);
    v('⛔ la redite de la décision est refusée (« deja_dit_ici ») ; l\'`ecrire` qui cite Léa, de plus, passe — et Léa est réveillée', [ev.length, ev[1], H2.appels.some(a => a.id === 'lea')], [2, '@lea tu prépares le texte ?', true]);
    H.nettoyer(); H2.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
