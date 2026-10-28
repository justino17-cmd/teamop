/* ⛔ CE QUE CE FICHIER GARDE — « JE VIENS D'EFFECTUER ÇA » : L'ANNONCE DE FIN DE TRAVAIL (28 octobre 2026, Justin : « je veux qu'à chaque fois qu'ils ont fini, ils mettent dans le groupe "je viens d'effectuer ça",
   comme ça moi je vois tout en temps réel »).
   Les VRAIS `agents.js`, `conversations.js`, `agent-equipe.js`, `agent-faits.js`, `cerveau.js` (établi `banc-autonomie.js`) ; un faux Anthropic, et un faux « pont » qui garde ce qu'on lui offre.
   Ce que le banc exige, pour des agents de COUCHES DIFFÉRENTES :
     · Clients : Hugo (une demande de Camille terminée), Camille (un courriel préparé, puis ENVOYÉ après la validation de Justin), Emma ; Plateforme : Jules (une erreur traitée), Théo (la sauvegarde vérifiée) ;
       Coordination : Victor (l'outil `terminer`, avec SON résumé) ;
     · la phrase est celle du CODE (forme fermée : un code, un numéro de dossier, un nombre) — ni adresse, ni numéro de téléphone, ni nom de client, même quand le module donne un résumé qui en porte ;
     · en Brouillon, « je viens de préparer … (en attente de ta validation) » ; un échec se dit aussi (« je n'ai pas pu… ») ;
     · elle ne compte dans AUCUN plafond (quinze annonces d'un agent n'entament pas ses douze messages), ne réveille PERSONNE (aucun appel), n'est jamais une racine ni une mention ;
     · elle ne se répète pas pour la même tâche — même après un redémarrage ; un code inconnu n'écrit rien ;
     · le pont (`surAjout`) en reçoit une copie ; une rafale de 35 donne UNE ligne « ×35 » ;
     · un agent qui vient de fermer annonce encore ce qu'il avait fini ; une tâche qui expire se dit. */
'use strict';
const { monter, rep, outil, S } = require('./banc-autonomie');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 500) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 500)); } };
const vrai = (t, c, d) => v(t + (!c && d !== undefined ? ' — ' + String(d).slice(0, 300) : ''), !!c, true);
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); process.exit(1); }, 90000).unref();

console.log('\n── 3118 · « Je viens de… » : l\'annonce de fin de travail ──');
(async () => {
  const CV = require(S('conversations.js')), FAITS = require(S('agent-faits.js'));
  const faitsDe = async H => (await H.messages('equipe')).filter(m => m.fait);
  const idTache = (system) => { const m = [...String(system).matchAll(/^- \[([0-9a-f]{12})\]/gm)]; return m[0] && m[0][1]; };

  console.log('\n1. Hugo (couche Clients) : une demande de Camille terminée — phrase fermée, dossier nommé, demandeur NOMMÉ sans @');
  {
    const H = monter({ script: () => rep('Ok.') });
    const d = H.agents.deposer('camille', 'hugo', 'resilier_fin_periode', { dossier: 'DOS-123456' });
    const k = H.agents.prendre('hugo');
    vrai('(population) la demande de Camille est bien prise par Hugo', d.ok && k && k.id === d.id);
    H.agents.terminer(k.id, 'hugo', 'ok', 'Fin d’abonnement programmée pour jean.dupont@entreprise-privee.fr, tél 06 12 34 56 78, Mme Dupont');
    const f = await faitsDe(H);
    v('⛔ UNE ligne dans « Équipe », de Hugo, marquée « fait »', [f.length, f[0] && f[0].de, f[0] && f[0].fait, f[0] && f[0].niveau], [1, 'hugo', true, 'info']);
    v('⛔ la phrase est celle du CODE : « ✅ Je viens de traiter une fin d\'abonnement (dossier DOS-123456) (demandé par Camille). »', f[0].texte, '✅ Je viens de traiter une fin d’abonnement (dossier DOS-123456) (demandé par Camille).');
    vrai('⛔ ni adresse, ni téléphone, ni nom du résumé du module n\'y passent', !/@|dupont|entreprise-privee|06 12|\(adresse\)/i.test(f[0].texte), f[0].texte);
    v('le demandeur est NOMMÉ, pas cité : le message n\'a aucune mention', H.registre().find(m => m.id === f[0].id).mentions, []);
    v('⛔ personne n\'est réveillé : aucun appel à Claude', H.appels.length, 0);
    vrai('⛔ le pont a reçu une COPIE (fil Équipe, de Hugo, avec la phrase)', H.pont.some(m => m.fil === 'equipe' && m.de === 'hugo' && /Je viens de traiter une fin d’abonnement/.test(m.texte)), JSON.stringify(H.pont));
    H.nettoyer();
  }

  console.log('\n2. Jules (Plateforme) : une erreur signalée par Max, traitée ; et un échec se dit aussi');
  {
    const H = monter({ script: () => rep('Ok.') });
    const d = H.agents.deposer('max', 'jules', 'signaler_erreur', { source: 'api', ref: 'abc123' });
    const k = H.agents.prendre('jules');
    H.agents.terminer(k.id, 'jules', 'ok', 'corrigé');
    const d2 = H.agents.deposer('max', 'jules', 'signaler_erreur', { source: 'site', ref: 'def456' });
    const k2 = H.agents.prendre('jules');
    H.agents.terminer(k2.id, 'jules', 'echec', 'je n\'ai pas pu');
    const f = await faitsDe(H);
    v('⛔ « ✅ Je viens de traiter une erreur signalée (demandé par Max). » puis « ⚠️ Je n\'ai pas pu traiter une erreur signalée (demandé par Max). »', f.map(m => m.texte), ['✅ Je viens de traiter une erreur signalée (demandé par Max).', '⚠️ Je n’ai pas pu traiter une erreur signalée (demandé par Max).']);
    H.nettoyer();
  }

  console.log('\n3. Camille (Clients) : un courriel PRÉPARÉ (en attente de la validation de Justin), puis ENVOYÉ après sa validation');
  {
    const H = monter({ script: () => rep('Ok.') });
    let envoye = null;
    H.agents.executeur('envoyer_mail', async (params) => { envoye = params; });
    const p = H.agents.proposer('camille', 'envoyer_mail', 'Réponse à jean@client.fr sur sa facture', { boite: 'contact', fil: 'abc123' });
    await H.conv.viderFaits(); await H.dormir(60);
    let f = await faitsDe(H);
    v('⛔ en Brouillon : « 📝 Je viens de préparer un courriel — en attente de ta validation. » (le résumé de la demande, qui porte une adresse, ne passe PAS)', f.map(m => m.texte), ['📝 Je viens de préparer un courriel — en attente de ta validation.']);
    const r = await H.post('/api/monitor/agents/validations/decider', { id: p.id, decision: 'accepter' });
    await H.conv.viderFaits(); await H.dormir(60);
    f = await faitsDe(H);
    v('Justin accepte : le courriel part (l\'exécuteur a tourné), et Camille l\'annonce', [r.code, !!envoye, f.map(m => m.texte)], [200, true, ['📝 Je viens de préparer un courriel — en attente de ta validation.', '✅ Je viens d’envoyer le courriel que tu avais validé.']]);
    vrai('…chaque ligne est de Camille', f.every(m => m.de === 'camille'));
    H.nettoyer();
  }

  console.log('\n4. Emma (Produit) et Théo (Plateforme)');
  {
    const H = monter({ script: () => rep('Ok.') });
    H.agents.deposer('camille', 'emma', 'rendez_vous_prospect', { dossier: 'DOS-654321' });
    const k = H.agents.prendre('emma'); H.agents.terminer(k.id, 'emma', 'ok', 'créneaux proposés');
    H.agents.fait('theo', 'sauvegarde_verifiee', {});
    H.agents.fait('theo', 'sauvegarde_verifiee', {});
    const f = await faitsDe(H);
    v('Emma : « traité une demande de rendez-vous (dossier DOS-654321) » ; Théo : « vérifié la sauvegarde hors site », UNE seule fois dans la journée', f.map(m => [m.de, m.texte]), [['emma', '✅ Je viens de traiter une demande de rendez-vous (dossier DOS-654321) (demandé par Camille).'], ['theo', '✅ Je viens de vérifier la sauvegarde hors site.']]);
    H.nettoyer();
  }

  console.log('\n5. Victor (Coordination) : l\'outil `terminer`, avec SON résumé — masqué, sans @');
  {
    const H = monter({ script: (t) => t.id === 'victor' ? rep('C\'est fait.', [outil('terminer', { tache: idTache(t.system), resume: 'Plan de la semaine rédigé, envoyé à jean@client.fr et @camille (06 12 34 56 78)' })]) : rep('Ok.') });
    H.agents.consigner('justin', 'victor', 'Rédiger le plan de la semaine');
    await H.justin('victor', 'Victor, où en est le plan ?');
    const f = await faitsDe(H);
    v('⛔ UNE annonce : « ✅ Je viens de terminer : … (demandé par Justin) », le résumé masqué', f.length, 1);
    vrai('…adresses et numéros masqués, aucun « @ »', /^✅ Je viens de terminer : Plan de la semaine rédigé, envoyé à \(adresse\) et camille \(\(numéro\)\) \(demandé par Justin\)$/.test(f[0].texte) && !/@/.test(f[0].texte), f[0].texte);
    vrai('…et dans « Équipe » une seule expression du geste : pas de ligne du système « Victor a terminé » à côté de l\'annonce (elle reste dans le fil privé de Victor, où il n\'y a pas d\'annonce à lire)', !(await H.messages('equipe')).some(m => m.de === 'systeme' && /a terminé/.test(m.texte)) && (await H.messages('victor')).some(m => m.de === 'systeme' && /Victor a terminé/.test(m.texte)));
    H.nettoyer();
  }

  console.log('\n6. Hors plafonds, sans réveiller, jamais une racine, jamais une mention');
  {
    const H = monter({ script: () => rep('Ok.') });
    for (let i = 1; i <= 15; i++) H.conv.annoncerFait('lea', '✅ Je viens de finir le travail numéro ' + i + '.', { cle: 'fait:test:' + i });
    v('(population) quinze annonces de Léa dans l\'heure', (await faitsDe(H)).length, 15);
    for (let i = 1; i <= 12; i++) H.conv.parler('lea', 'equipe', 'Message ordinaire de Léa ' + i);
    v('⛔ quinze annonces n\'entament pas ses douze messages de l\'heure : le douzième part, le treizième seul est refusé', [H.registre().filter(m => m.de === 'lea' && !m.fait).length, H.conv.parler('lea', 'equipe', 'Treizième').raison], [12, 'trop_de_messages']);
    v('…ni le plafond du fil (vingt messages d\'agents) : quinze annonces + douze messages, et un autre agent parle encore', H.conv.parler('max', 'equipe', 'Max parle').ok, true);
    v('⛔ aucune annonce ne réveille quiconque : aucun appel à Claude', H.appels.length, 0);
    const f = await faitsDe(H);
    vrai('…aucune porte de racine ni de mention : ni `racine`, ni mentions, ni `tous`', f.every(m => { const r = H.registre().find(x => x.id === m.id); return !r.racine && r.mentions.length === 0 && !r.tous; }));
    v('⛔ un « @ » dans le texte est ôté (rien ne peut devenir une mention)', (() => { H.conv.annoncerFait('lea', '✅ Je viens de prévenir @camille et @tous.', { cle: 'fait:arobase' }); const m = H.registre().filter(x => x.fait).pop(); return [m.texte.includes('@'), m.mentions, H.appels.length]; })(), [false, [], 0]);
    v('⛔ une adresse que le texte porterait quand même est masquée', (() => { H.conv.annoncerFait('lea', '✅ Je viens d\'écrire à jean.dupont@entreprise.fr.', { cle: 'fait:adresse' }); return !/dupont|entreprise/.test(H.registre().filter(x => x.fait).pop().texte); })(), true);
    v('le message d\'un agent qui n\'existe pas, sans clé ou sans texte : refusé', [H.conv.annoncerFait('pierre', 'x', { cle: 'k' }).raison, H.conv.annoncerFait('lea', 'x', {}).raison, H.conv.annoncerFait('lea', '  ', { cle: 'k2' }).raison], ['inconnu', 'cle', 'texte']);
    H.nettoyer();
  }

  console.log('\n7. Elle ne se répète pas pour la même tâche — même après un redémarrage — et un code inconnu n\'écrit rien');
  {
    const H = monter({ script: () => rep('Ok.') });
    H.agents.deposer('max', 'jules', 'signaler_erreur', { source: 'api', ref: 'abc123' });
    const k = H.agents.prendre('jules');
    H.agents.terminer(k.id, 'jules', 'ok', 'fait');
    H.agents.terminer(k.id, 'jules', 'ok', 'fait');
    v('⛔ une tâche terminée deux fois : une seule annonce', (await faitsDe(H)).length, 1);
    const app2 = { get() {}, post() {}, use() {} };
    const conv2 = CV(app2, { DATA_DIR: H.D, monAdmin() {}, monPatronStrict() {}, agents: H.agents, maintenant: () => H.horloge.t });
    const ann2 = FAITS({ agents: H.agents, conversations: conv2 });
    const r = ann2.annoncer({ agent: 'jules', code: 'tache:signaler_erreur', issue: 'fait', tache: k.id, demandeur: 'max', ts: H.horloge.t });
    v('⛔ après un REDÉMARRAGE (la clé est rangée avec le message) : la même tâche n\'est pas annoncée une seconde fois', [r.ok, r.raison], [false, 'deja_dit']);
    const avant = H.registre().length;
    v('un code inconnu n\'écrit rien (et le journal le dit)', [H.agents.fait('lea', 'code_qui_nexiste_pas', {}), ann2.annoncer({ agent: 'lea', code: 'code_qui_nexiste_pas' }).raison, H.registre().length, H.agents.lireJournal().some(e => e.agent === 'lea' && e.action === 'annonce' && e.resultat === 'refuse')], [true, 'code', avant, true]);
    v('…ni un agent inconnu, ni une phrase composée par le modèle (`libre` absent de la table : le code décide)', [H.agents.fait('pierre', 'sauvegarde_verifiee', {}), H.registre().length], [false, avant]);
    H.nettoyer();
  }

  console.log('\n8. Une rafale de 35 donne UNE ligne « ×35 »');
  {
    const H = monter({ script: () => rep('Ok.') });
    for (let i = 1; i <= 35; i++) H.agents.fait('camille', 'courrier_brouillon', { ref: 'c' + i });
    v('(population) trente-cinq faits demandés, aucun écrit pendant la fenêtre', (await faitsDe(H)).length, 0);
    await H.dormir(120);
    const f = await faitsDe(H);
    v('⛔ UNE ligne, « ×35 », de Camille', [f.length, f[0] && f[0].de, f[0] && f[0].texte], [1, 'camille', '✅ Je viens de mettre un courriel en brouillon ×35']);
    H.agents.fait('camille', 'courrier_brouillon', { ref: 'c7' });
    await H.dormir(120);
    v('…un fait déjà dit (même clé) n\'est pas redit', (await faitsDe(H)).length, 1);
    H.agents.fait('camille', 'courrier_brouillon', { ref: 'c99' });
    await H.dormir(120);
    v('…un fait seul, ensuite : sa propre ligne, sans ×', (await faitsDe(H)).map(m => m.texte).pop(), '✅ Je viens de mettre un courriel en brouillon.');
    /* deux codes différents ne s'agrègent pas */
    for (let i = 1; i <= 3; i++) { H.agents.fait('camille', 'courrier_brouillon', { ref: 'd' + i }); H.agents.fait('camille', 'courrier_classe', { ref: 'e' + i }); }
    await H.dormir(120);
    v('deux codes dans la même fenêtre : une ligne chacun', (await faitsDe(H)).slice(-2).map(m => m.texte).sort(), ['✅ Je viens de classer un courriel reçu ×3', '✅ Je viens de mettre un courriel en brouillon ×3']);
    H.nettoyer();
  }

  console.log('\n9. Un agent qui vient de fermer annonce encore ce qu\'il avait fini');
  {
    const T1820 = Date.UTC(2026, 9, 28, 17, 20, 0);   // 18 h 20 à Paris
    const H = monter({ horaires: true, t0: T1820, script: () => rep('Ok.') });
    vrai('(population) à 18 h 20, Hugo est fermé', H.agents.peutAgir('hugo').raison === 'hors_heures');
    H.agents.fait('hugo', 'incident_traite', {});
    await H.conv.viderFaits(); await H.dormir(60);
    v('⛔ l\'annonce passe quand même (elle ne passe pas par `peutAgir`)', (await faitsDe(H)).map(m => m.texte), ['✅ Je viens de traiter un incident.']);
    v('…alors qu\'un message ordinaire de Hugo est refusé', H.conv.parler('hugo', 'equipe', 'Un mot').raison, 'hors_heures');
    H.nettoyer();
  }

  console.log('\n10. Une tâche qui expire se dit au lieu de disparaître');
  {
    const H = monter({ script: () => rep('Ok.') });
    H.agents.consigner('justin', 'camille', 'Relancer les devis en attente');
    H.agents.deposer('max', 'jules', 'signaler_erreur', { source: 'api', ref: 'abc123' });
    H.avance(8 * 24 * 3600 * 1000);
    H.agents.charge();
    const sys = (await H.messages('equipe')).filter(m => m.de === 'systeme').map(m => m.texte);
    vrai('⛔ la consigne de Camille et la demande faite à Jules : une ligne chacune, qui dit ce qui est tombé', sys.length === 2 && sys.some(t => /« Relancer les devis en attente » de Camille a expiré/.test(t)) && sys.some(t => /« traiter une erreur signalée » faite à Jules a expiré/.test(t)), JSON.stringify(sys));
    H.agents.charge(); H.agents.charge();
    v('…et elle n\'est pas redite à chaque lecture', (await H.messages('equipe')).filter(m => m.de === 'systeme').length, 2);
    H.nettoyer();
  }

  console.log('\n11. Le composeur : pur, fermé');
  {
    const C = FAITS.composer, nom = x => ({ victor: 'Victor' }[x] || x);
    v('un dossier mal formé n\'entre pas dans la phrase', C({ agent: 'lea', code: 'courrier_brouillon', dossier: 'DOS-12 jean@x.fr' }, nom).texte, '✅ Je viens de mettre un courriel en brouillon.');
    v('un nombre : borné (entier, ≤ 9999) ; sinon ignoré', [C({ agent: 'lea', code: 'courrier_brouillon', n: 12 }, nom).texte, C({ agent: 'lea', code: 'courrier_brouillon', n: '12 jean@x.fr' }, nom).texte], ['✅ Je viens de mettre un courriel en brouillon (12).', '✅ Je viens de mettre un courriel en brouillon.']);
    v('une raison hors de la liste n\'est pas recopiée', C({ agent: 'lea', code: 'courrier_brouillon', issue: 'echec', raison: 'connexion refusée par smtp.client.fr' }, nom).texte, '⚠️ Je n’ai pas pu mettre un courriel en brouillon.');
    v('une raison de la liste est dite', C({ agent: 'lea', code: 'courrier_brouillon', issue: 'echec', raison: 'hors_heures' }, nom).texte, '⚠️ Je n’ai pas pu mettre un courriel en brouillon (hors des heures de travail).');
    v('un code inconnu, une tâche inconnue, une validation inconnue : null', [C({ agent: 'lea', code: 'x' }, nom), C({ agent: 'lea', code: 'tache:x' }, nom), C({ agent: 'lea', code: 'valide:x' }, nom), C({ agent: 'lea', code: 'valide-fait:x' }, nom), C(null, nom), C({ code: 'courrier_brouillon' }, nom)], [null, null, null, null, null, null]);
    v('`__proto__` et `constructor` ne sont pas des codes', [C({ agent: 'lea', code: '__proto__' }, nom), C({ agent: 'lea', code: 'tache:constructor' }, nom)], [null, null]);
    vrai('la clé d\'une tâche est stable et ne porte que l\'identifiant', C({ agent: 'lea', code: 'tache:consigne', tache: 'abcdef012345' }, nom).cle === 'fait:abcdef012345');
    vrai('(population) toutes les tables écrivent une phrase sans « @ » ni accolade', [].concat(Object.keys(FAITS.CODES).map(c => C({ agent: 'lea', code: c }, nom)), Object.keys(FAITS.TACHES).map(c => C({ agent: 'lea', code: 'tache:' + c }, nom)), Object.keys(FAITS.VALIDATIONS).map(c => C({ agent: 'lea', code: 'valide:' + c, issue: 'prepare' }, nom)), Object.keys(FAITS.VALIDATIONS_FAITES).map(c => C({ agent: 'lea', code: 'valide-fait:' + c }, nom))).length > 30 && [].concat(Object.keys(FAITS.CODES).map(c => C({ agent: 'lea', code: c }, nom))).every(x => x && !/[@{}]/.test(x.texte)));
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ ERREUR ' + (e && e.stack || e)); process.exit(2); });
