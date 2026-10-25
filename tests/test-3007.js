/* 3007 — LES DEUX ÉCHECS DE L'EXAMEN DU 25 OCTOBRE 2026 AU SOIR (21 h 51 ; 7 réussis, 2 échecs).
     · Scénario 6 : « Dupont Plomberie : plafond_total » — le plafond d'appels DU SCÉNARIO (9) n'avait pas suivi la relance du juge posée le même jour ;
       et le juge prenait une reformulation fidèle de l'offre (« signalement automatique des conflits ») pour un fait inventé.
     · Scénario 9 : le juge disait « aucune occurrence vérifiable de tutoiement » sur « Si tu as besoin… », « Je te la sors » : le tutoiement se COMPTE
       désormais dans les fils privés de Justin (le VRAI `sc9`, joué ici avec un faux juge). */
'use strict';
const path = require('path');
const RACINE = path.join(__dirname, '..');
let ok = 0, ko = 0;
const vrai = (t, c, info) => { if (c) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + (info !== undefined ? ' — ' + String(info).slice(0, 300) : '')); } };
(async () => {
  const EX = require(path.join(RACINE, 'server', 'examen.js'));
  const CTRL = require(path.join(RACINE, 'server', 'agents-controle.js'));
  const sc6 = EX.SCENARIOS.find(s => s.cle === 'vente'), sc9 = EX.SCENARIOS.find(s => s.cle === 'ton');
  vrai('scénario 6 : 18 appels (trois courriels × rédiger, juger, relancer, réécrire, juger, relancer)', sc6 && sc6.appelsMax === 18, sc6 && sc6.appelsMax);
  vrai('le juge du contrôle qualité : une reformulation fidèle de l’offre n’est pas un fait inventé, il doit nommer ce qui manque', /nommer CE QUI manque à l’OFFRE/.test(CTRL.JUGE_SYSTEM) && /reformulation fidèle/.test(CTRL.JUGE_SYSTEM));

  const jouer = async messages => {
    const E = { capa: () => true, techniques: () => 0 };
    const X = { partage: { messages, mails: [{ de: 'lea', texte: 'Bonjour,\n\nNous vous remercions. Votre entreprise…' }, { de: 'camille', texte: 'Bonjour,\n\nVous pouvez…' }, { de: 'camille', texte: 'Bonjour,\n\nVotre demande…' }] },
      juge: { penser: async () => ({ ok: true, texte: '{"c1":true,"c2":true,"c4":true,"raison":"ok"}' }) } };
    const v = await sc9.jouer(E, X); return v.find(x => x.libelle === 'les agents tutoient Justin');
  };
  const base = Array.from({ length: 8 }, (_, k) => ({ de: 'lea', a: 'clients', texte: 'Côté prospects, une question simple marche mieux ' + k + '.' }));
  const ce_soir = base.concat([{ de: 'margaux', a: 'margaux', texte: 'Sur DOS-900001 : le paiement est marqué payé. Si tu as besoin de ces chiffres précis, il faut que je creuse autrement.' },
    { de: 'camille', a: 'camille', texte: 'Justin, je suis déjà dessus pour cette liste. Je te la sors aujourd’hui, promis.' }]);
  let r = await jouer(ce_soir);
  vrai('⛔ les vrais messages de ce soir (« Si tu as besoin… », « Je te la sors ») : Justin est tutoyé', r && r.etat === 'ok', JSON.stringify(r));
  r = await jouer(base.concat([{ de: 'margaux', a: 'margaux', texte: 'Pourriez-vous me dire si vous souhaitez le détail de la facture ?' }]));
  vrai('⛔ un agent qui VOUVOIE Justin dans son fil privé : échec, et le message est cité', r && r.etat === 'ko' && /Pourriez-vous/.test(r.detail), JSON.stringify(r));
  r = await jouer(base.concat([{ de: 'camille', a: 'camille', texte: 'Je te prépare la liste.' }, { de: 'margaux', a: 'margaux', texte: 'Souhaitez-vous que je vous envoie le détail ?' }]));
  vrai('⛔ un message tutoie, un AUTRE vouvoie : échec quand même (aucun ne le vouvoie)', r && r.etat === 'ko' && /Souhaitez-vous/.test(r.detail), JSON.stringify(r));
  r = await jouer(base.concat([{ de: 'margaux', a: 'margaux', texte: 'Le dossier DOS-900001 est payé, formule pro.' }]));
  vrai('⛔ des messages à Justin, mais aucun ne le tutoie : échec', r && r.etat === 'ko' && /aucun message ne le tutoie/.test(r.detail), JSON.stringify(r));
  r = await jouer(base);
  vrai('   aucun message dans un fil privé : échec (rien à compter n’est pas un succès)', r && r.etat === 'ko' && /aucun message dans un fil privé/.test(r.detail), JSON.stringify(r));
  r = await jouer(base.concat([{ de: 'camille', a: 'camille', texte: 'Le client nous écrit « vous êtes injoignables », je te prépare une réponse.' }]));
  vrai('   « vous » cité dans un message qui tutoie Justin : pas un vouvoiement', r && r.etat === 'ok', JSON.stringify(r));
  r = await jouer(base.concat([{ de: 'camille', a: 'clients', texte: 'Vous pouvez compter sur moi.' }, { de: 'camille', a: 'camille', texte: 'C’est noté, je te fais ça.' }]));
  vrai('   un « vous » dans un GROUPE ne compte pas (il parle à l’équipe), seul le fil privé compte', r && r.etat === 'ok', JSON.stringify(r));
  console.log(`\ntest-3007 : ${ok} ✓ ${ko} ✗`);
  process.exit(ko ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
