/* ⛔ CE QUE CE FICHIER GARDE — LES FICHES DE POSTE DES AGENTS (29 octobre 2026, `server/agents-fiches.js`).
     Justin : « qu'ils soient plus intelligents, plus autonomes, qu'ils travaillent comme j'avais convenu, et qu'ils fassent des choses plus professionnelles. »
     Une fiche dit, pour CHAQUE agent du registre : sa mission, ses objectifs mesurables, ce qu'il décide seul, ce qu'il propose, ce qu'il ne fait jamais, à qui il passe la main — et
     la méthode de travail commune. Ce banc EXÉCUTE les vrais modules (la messagerie des agents, la conversation de repli, le contrôle qualité) : il ne cherche pas un texte dans un fichier.
       1. une fiche par agent du registre (seize), ni plus (Pauline n'est pas un agent de la Tour), chacune complète et mesurable ;
       2. aucun prénom d'agent dans le texte (les collègues s'écrivent par identifiant, le banc de Hugo cherche les prénoms), et chaque « @identifiant » existe au registre ;
       3. les interdits de la fiche sont ceux du code (Hugo et Margaux ne reçoivent pas de texte libre, « publier » et « répondre à un avis » sont des validations) ;
       4. la fiche ENTRE dans le prompt de chacun des seize, une fois, par la messagerie ET par la conversation de repli ;
       5. les noms d'écrans de la Tour dits par les agents existent dans la Tour publiée ET dans la nouvelle (aperçu v2.119) ;
       6. la formule creuse « n'hésitez pas à… » est une faute du contrôle qualité (non grave : réparée par la réécriture, jamais un courriel bloqué).
   Modules joués : server/agents-fiches.js, agent-equipe.js, agent-conversation.js, agents-controle.js, agents.js, conversations.js, cerveau.js. */
'use strict';
const fs = require('fs'), path = require('path');
const { monter, S, RACINE } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();
const sansCommentaires = t => t.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');

console.log('\n── 3190 · les fiches de poste des agents ──');
(async () => {
  const F = require(S('agents-fiches.js'));
  const AG = require(S('agents.js'));
  const REG = AG.AGENTS.map(a => a.id);

  console.log('\n1. Une fiche par agent du registre, complète et mesurable');
  v('(population) le registre compte seize agents', REG.length, 16);
  v('les fiches sont celles du registre, ni plus ni moins (Pauline n’y est pas)', Object.keys(F.FICHES).sort(), REG.slice().sort());
  for (const id of REG) {
    const f = F.FICHES[id] || {};
    const complete = typeof f.mission === 'string' && f.mission.length >= 30 && ['objectifs', 'decide', 'propose', 'jamais', 'passe'].every(k => Array.isArray(f[k]) && f[k].length >= 1 && f[k].every(x => typeof x === 'string' && x.length >= 8));
    vrai(id + ' : mission, objectifs, décide seul, propose, jamais, passe la main — tous présents et non vides', complete);
    vrai(id + ' : au moins deux objectifs, et au moins deux interdits', (f.objectifs || []).length >= 2 && (f.jamais || []).length >= 2, JSON.stringify([(f.objectifs || []).length, (f.jamais || []).length]));
    vrai(id + ' : un modèle d’écrit connu', !!F.MODELES[f.modele], f.modele);
    vrai(id + ' : au moins un objectif porte un nombre, un délai ou un état vérifiable', (f.objectifs || []).some(o => /\d|jour|chaque|aucun|zéro|toute|tous|jamais|semaine/i.test(o)), JSON.stringify(f.objectifs));
  }

  console.log('\n2. Aucun prénom d’agent dans le texte, et chaque collègue cité existe');
  const prenoms = AG.AGENTS.map(a => a.nom).concat(['Pauline']);
  for (const id of REG) {
    const t = F.bloc(id);
    const trouves = prenoms.filter(n => new RegExp('(^|[^\\p{L}@])' + n + '(?![\\p{L}])', 'u').test(t));
    v(id + ' : aucun prénom d’agent dans la fiche (un prénom d’agent peut être celui d’un client)', trouves, []);
    const cites = (t.match(/@([a-z]+)/g) || []).map(x => x.slice(1));
    vrai(id + ' : chaque @identifiant cité existe au registre', cites.every(x => REG.includes(x)), cites.join(','));
    vrai(id + ' : il ne se cite pas lui-même comme collègue à qui passer la main', !new RegExp('@' + id + '\\b').test((F.FICHES[id].passe || []).join(' ')), id);
  }
  vrai('(population) la méthode commune dit vérifier avant d’affirmer, citer la source, et le compte rendu en trois temps', /Vérifier avant d’affirmer/.test(F.METHODE) && /Citer la source et la date/.test(F.METHODE) && /ce qui est fait ; ce que Justin doit décider/.test(F.METHODE));
  vrai('la méthode annonce la revue du week-end ET que rien ne s’applique sans Justin', /relis ta semaine/i.test(F.METHODE) && /validées par lui/.test(F.METHODE));

  console.log('\n3. Les interdits de la fiche sont ceux du code');
  vrai('Hugo et Margaux sont les deux seuls à ne recevoir aucun texte libre d’un collègue (SANS_CONSIGNE_LIBRE), et la fiche de Victor le dit', AG.SANS_CONSIGNE_LIBRE.slice().sort().join() === 'hugo,margaux' && /@hugo ou @margaux/.test(F.FICHES.victor.jamais.join(' ')));
  vrai('« publier » et « répondre à un avis » existent comme validations (fiches de Lola et de Noah)', AG.TYPES_VALIDATION.includes('publier') && AG.TYPES_VALIDATION.includes('repondre_avis') && /publier/.test(F.FICHES.lola.propose.join(' ')) && /répondre à un avis/.test(F.FICHES.noah.propose.join(' ')));
  vrai('la fiche de Margaux range la mise en demeure parmi ce que Justin décide (type « mise_en_demeure »), celle de Sarah l’annonce à tous (« annonce_clients »)', AG.TYPES_VALIDATION.includes('mise_en_demeure') && AG.TYPES_VALIDATION.includes('annonce_clients') && /mise en demeure/.test(F.FICHES.margaux.propose.join(' ')) && /annonce/.test(F.FICHES.sarah.propose.join(' ')));
  v('aucune fiche ne donne un geste de remboursement, d’avoir ou de suppression comme un geste que l’agent fait seul', REG.filter(id => /rembours|avoir|supprim|effac/i.test(F.FICHES[id].decide.join(' '))), []);
  v('aucune fiche ne met un envoi à un client parmi les gestes « seul » de ceux dont le courriel est PROPOSÉ (Léa, Chloé, Emma, Sarah)', ['lea', 'chloe', 'emma', 'sarah'].filter(id => /envoy/i.test(F.FICHES[id].decide.join(' '))), []);

  console.log('\n4. La fiche entre dans le prompt des seize — messagerie ET conversation de repli');
  const H = monter({ mode: 'brouillon', sansReveil: true });
  try {
    for (const id of REG) {
      const s = H.eq.systemDe(id);
      vrai(id + ' (messagerie) : la fiche y est, UNE fois, et c’est la sienne', s.split('TA FICHE DE POSTE').length === 2 && s.includes(F.FICHES[id].objectifs[0]) && s.includes(F.FICHES[id].jamais[0]) && s.includes('MÉTHODE DE TRAVAIL'), s.length);
      vrai(id + ' (messagerie) : elle arrive AVANT les règles et ne contredit pas la longueur (600 caractères) ni l’absence de puces dans la réponse', s.indexOf('TA FICHE DE POSTE') < s.indexOf('Règles :') && /600 caractères au plus/.test(s) && /sans titre ni puce/.test(s));
      v(id + ' (messagerie) : aucune fiche d’un AUTRE agent dans son prompt', REG.filter(x => x !== id && s.includes(F.FICHES[x].objectifs[0])), []);
    }
    const AC = require(S('agent-conversation.js'));
    const vus = {};
    const cerveauStub = { penser: async (id, system) => { vus[system.match(/^Tu es ([^,]+),/)[1]] = system; return { ok: true, texte: 'Bien reçu.' }; } };
    const ac = AC({ agents: H.agents, conversations: H.conv, cerveau: cerveauStub, faits: {} });
    vrai('(population) la conversation de repli sert quinze agents (tous sauf Hugo, qui a son module)', ac.ids.length === 15 && !ac.ids.includes('hugo'), ac.ids.length);
    let servis = 0;
    for (const id of ac.ids) {
      H.conv.justinEcrit(id, 'Bonjour, où en es-tu cette semaine ?', { sansEcho: true });
      await ac.repondre(id, 'Bonjour, où en es-tu cette semaine ?');
      const nom = H.agents.AGENTS.find(a => a.id === id).nom, s = vus[nom] || '';
      if (s) servis++;
      vrai(id + ' (repli) : la fiche y est, UNE fois, et c’est la sienne', s.split('TA FICHE DE POSTE').length === 2 && s.includes(F.FICHES[id].objectifs[0]), s.length);
    }
    v('(population) les quinze prompts de repli ont bien été relevés', servis, 15);
  } finally { H.nettoyer(); }

  console.log('\n5. Les noms d’écrans dits par les agents existent dans les DEUX Tours');
  const publiee = fs.readFileSync(path.join(RACINE, 'tour.html'), 'utf8'), nouvelle = fs.readFileSync(path.join(RACINE, 'apercu', 'tour.html'), 'utf8');
  vrai('(population) les deux Tours ont été lues en entier', publiee.length > 500000 && nouvelle.length > 500000, publiee.length + ' / ' + nouvelle.length);
  const menu = t => { const i = t.indexOf('var MENU=['); return t.slice(i, t.indexOf('];', i)); };
  for (const [nom, t] of [['Tour publiée', publiee], ['nouvelle Tour', nouvelle]]) {
    const m = menu(t);
    vrai('(population) ' + nom + ' : le menu est trouvé', m.length > 500, m.length);
    for (const e of ['Agents', 'Messagerie', 'Surveillance', 'Incidents', 'Contrats', 'Sauvegardes', 'Courrier', 'Abonnements', 'Audience']) vrai(nom + ' : l’écran « ' + e + ' » existe dans le menu', new RegExp('\\[\'[a-z]+\',\'' + e + '\'').test(m), e);
    vrai(nom + ' : l’onglet « Heures de travail » de l’écran Agents existe (et pas un onglet « Horaires »)', /\['horaires','Heures de travail'\]/.test(t) && !/\['horaires','Horaires'\]/.test(t));
    vrai(nom + ' : l’onglet « Validations » de l’écran Agents existe', /\['valid','Validations'\]/.test(t));
    vrai(nom + ' : le groupe « Plateforme » de la Messagerie et sa section « Demandes RGPD » existent', /plateforme:'Plateforme'/.test(t) && /Demandes RGPD <small>/.test(t));
    vrai(nom + ' : le groupe « Réunions » de la Messagerie existe', /reunions:'Réunions'/.test(t));
  }
  v('les libellés du dictionnaire des écrans sont ceux-là (rien d’inventé)', F.ECRANS.agentsHeures + '|' + F.ECRANS.agentsValidations + '|' + F.ECRANS.messageriePlateforme + '|' + F.ECRANS.messagerieReunions, 'Agents, onglet Heures de travail|Agents, onglet Validations|Messagerie, groupe Plateforme|Messagerie, groupe Réunions');
  const eq = sansCommentaires(fs.readFileSync(S('agent-equipe.js'), 'utf8')), nina = sansCommentaires(fs.readFileSync(S('agent-nina.js'), 'utf8'));
  vrai('⛔ la consigne « ouvrir maintenant » dit « Heures de travail » (le CODE, commentaires retirés), plus « Horaires »', eq.includes('(page Agents, onglet Heures de travail)') && !eq.includes('page Agents, Horaires'));
  vrai('⛔ Nina dit où marquer une demande RGPD traitée : Messagerie, groupe Plateforme — plus « (Agents, Plateforme) »', nina.includes('(Messagerie, groupe Plateforme, section Demandes RGPD)') && !nina.includes('(Agents, Plateforme)'));
  const toutes = ['agent-victor', 'agent-ines', 'agent-camille', 'agent-hugo', 'agent-margaux', 'agent-lea', 'agent-max', 'agent-nina', 'agent-theo', 'agent-jules', 'agent-chloe', 'agent-emma', 'agent-louis', 'agent-sarah', 'agents-plateforme', 'agent-equipe', 'agent-conversation', 'reunions'].map(f => sansCommentaires(fs.readFileSync(S(f + '.js'), 'utf8'))).join('\n');
  v('aucune consigne d’agent ne range un écran « là où il est rangé » (Demandes, Facturation : leur place diffère entre les deux Tours)', (toutes.match(/(?:dans|sous|onglet de)\s+(?:l’écran |la rubrique |l’onglet )?(?:Demandes|Facturation)\b/g) || []), []);

  console.log('\n6. La formule creuse « n’hésitez pas à… » est une faute du contrôle qualité');
  const C = require(S('agents-controle.js'));
  const BON = ['Bonjour,', '',
    'Nous vous remercions pour votre inscription sur teamop.fr et nous avons bien noté que Toka Clim est une entreprise de climatisation et de chauffage.', '',
    'TeamOP édite deux applications, dont OP GESTION, qui rassemble la gestion de vos interventions sur ordinateur, tablette et téléphone, sans installation. Toute votre équipe travaille sur des informations à jour en temps réel, du planning des techniciens aux rapports d’intervention avec photos et signature du client, jusqu’aux devis et aux factures que vous pouvez envoyer par courriel.', '',
    'Notre différence : une formule sur mesure. Les catégories dont votre entreprise n’a pas besoin sont retirées et ne vous sont pas facturées, et nous pouvons en créer pour vos besoins, qui restent réservées à votre entreprise. Les tarifs restent maîtrisés, à partir de 15 € par mois et par utilisateur (TVA non applicable).', '',
    'Pour vous proposer quelque chose d’adapté, pourriez-vous nous préciser :',
    '1. Combien de techniciens compte votre équipe ?', '2. Quelle part de votre activité est de l’installation, de l’entretien ou du dépannage ?', '3. Quelle clientèle servez-vous : particuliers, entreprises, collectivités ?',
    '4. Quels outils utilisez-vous aujourd’hui pour planifier vos interventions ?', '5. Qu’attendez-vous en priorité d’un outil de gestion ?', '',
    'Dès réception de vos réponses, nous vous adresserons une proposition adaptée ; nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.', '',
    'Nous restons à votre disposition par retour de mail ou par téléphone.', '', 'Bien cordialement,'].join('\n');
  const OBJ = 'TeamOP — OP GESTION pour Toka Clim', VENTE = { profil: 'vente', entreprise: 'Toka Clim', activite: 'Chauffage / Climatisation' };
  v('(population) le bon courriel de vente ne porte AUCUNE faute', C.fautesDuCode(OBJ, BON, VENTE), []);
  const creux = BON.replace('Nous restons à votre disposition par retour de mail ou par téléphone.', 'N’hésitez pas à nous répondre. Nous restons à votre disposition par retour de mail ou par téléphone.');
  vrai('(population) le courriel modifié contient bien la formule', creux.includes('N’hésitez pas à nous répondre'));
  v('« N’hésitez pas à… » ressort comme faute « formule_creuse », et elle seule', C.fautesDuCode(OBJ, creux, VENTE), ['formule_creuse']);
  const droit = BON.replace('Nous restons', "n'hésitez surtout pas à écrire. Nous restons");
  vrai('(population) le second courriel modifié contient bien la formule, apostrophe droite', droit.includes("n'hésitez surtout pas à écrire"));
  v('avec l’apostrophe droite, en minuscules et avec « surtout », aussi', C.fautesDuCode(OBJ, droit, VENTE), ['formule_creuse']);
  vrai('⛔ ce n’est PAS une faute grave : elle est réparée par la réécriture, le courriel n’est jamais bloqué', C.estGrave('formule_creuse') === false && C.phrasesDe(['formule_creuse']).length === 1 && /répondez simplement/.test(C.phrasesDe(['formule_creuse'])[0]));
  v('la phrase permise de la fermeture (« Nous restons à votre disposition ») n’est pas touchée', C.fautesDuCode(OBJ, BON, VENTE), []);
  const K = require(S('agents-connaissance.js'));
  vrai('la FORME donnée à Léa, Camille et Chloé demande un courriel lu, une seule demande, et pas de formule creuse', /montre qu’on a lu la situation/.test(K.FORME) && /UNE seule demande claire/.test(K.FORME) && /n’écris jamais « n’hésitez pas à… »/.test(K.FORME));

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ exception : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
