/* ⛔ CE QUE CE FICHIER GARDE — « NON LU » NE S'ALLUME PAS SUR UNE CONVERSATION OÙ LE DERNIER MOT EST LE MIEN (lot m10 de la revue d'OP MESSAGES, 17 octobre 2026).

   La VRAIE `server-msg/public/source-serveur.js` contre le VRAI service. Le testeur l'a mesuré : « Chantier Nord » et « Dan Roux » portaient un point « Non lu » et un nom en gras sous
   l'aperçu « Vous : Oui, on démarre lundi. » — on venait de répondre, l'écran disait le contraire. Le service tient « ENVOYER N'EST PAS LIRE » exprès (un envoi sorti d'une file hors
   ligne ne marque pas lus des messages jamais vus : `lu_seq` ne bouge pas, `stockage.js` « D2 ») : c'est donc l'AFFICHAGE (`resume()`) qui ne montre plus « Non lu » quand le dernier
   message visible est de moi. Rien n'est écrit dans le service pour cela.
   Ce que le banc garde, dans les deux sens :
     · le dernier message est de moi (envoyé depuis cet appareil, ou depuis un AUTRE appareil de la même personne) : `nonLu` faux, `nonLus` 0 ;
     · le service, lui, n'a pas bougé (son `non_lus` et son `lu_seq` sont ceux d'avant) ;
     · un message reçu APRÈS le mien rallume « Non lu » (et compte ce que le service compte) ;
     · la conversation que je n'ai pas touchée garde son « Non lu » ; un groupe se comporte comme une conversation à deux.
   Toute attente est au GESTE, jamais au chronomètre. */
'use strict';
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
const att = (cond, ms = 8000) => T.attendre(cond, ms, 10);

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();

(async () => {
  const NOMS = { alice: 'Alice Banc', bruno: 'Bruno Banc', chloe: 'Chloé Banc' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345678']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
  function monter() {
    const nav = T.navigateur(svc.base);
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    src.ecouter(() => {}); sources.push(src);
    return { src, nav, async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
  }
  /* ce que le SERVICE dit de la conversation pour Alice (la liste brute, sans la page) */
  const brut = async (X, id) => ((await (await X.nav.fetch(svc.base + '/api/conversations')).json()).conversations || []).find(c => c.id === id);

  try {
    const A = monter(), A2 = monter(), B = monter(), C = monter();
    await A.entrer('alice'); await A2.entrer('alice'); const bruno = await B.entrer('bruno'); await C.entrer('chloe');
    const l1 = await B.src.lienContact(); const r1 = await A.src.accepterLien(l1.code); const AB = r1.conv;
    const l2 = await C.src.lienContact(); const r2 = await A.src.accepterLien(l2.code); const AC = r2.conv;
    await B.src.envoyer(AB, { texte: 'Peux-tu confirmer lundi ?' }); await B.src.envoyer(AB, { texte: 'Et le matériel ?' });
    await C.src.envoyer(AC, { texte: 'Salut, tu as vu le devis ?' });
    const ligne = async (X, id) => (await X.src.lister(true)).find(c => c.id === id);

    console.log('Avant toute réponse : « Non lu » est vrai, sur les deux conversations');
    {
      const x = await ligne(A, AB), y = await ligne(A, AC);
      v('Bruno a écrit deux fois, Chloé une : 2 et 1 non lus', [x.nonLu, x.nonLus, y.nonLu, y.nonLus], [true, 2, true, 1]);
    }

    console.log('\nJe réponds à Bruno SANS ouvrir la conversation (depuis un AUTRE appareil) : le dernier mot est le mien, plus de « Non lu »');
    {
      await A2.src.envoyer(AB, { texte: 'Oui, on démarre lundi.' });
      const x = await ligne(A, AB);
      v('l\'aperçu dit « Vous : … » et la ligne n\'est plus « non lue »', [x.apercu, x.nonLu, x.nonLus], ['Vous : Oui, on démarre lundi.', false, 0]);
      const b = await brut(A, AB);
      v('⛔ le SERVICE n\'a rien écrit pour cela : « envoyer n\'est pas lire » (il compte toujours 2 non lus, lu_seq inchangé à 0)', [b.non_lus, b.lu_seq], [2, 0]);
      const y = await ligne(A, AC);
      v('la conversation que je n\'ai pas touchée garde son « Non lu » (population : le correctif ne les éteint pas toutes)', [y.nonLu, y.nonLus], [true, 1]);
    }

    console.log('\nBruno répond APRÈS moi : « Non lu » revient, avec ce que le service compte');
    {
      await B.src.envoyer(AB, { texte: 'Parfait, merci' });
      const x = await att(async () => { const z = await ligne(A, AB); return z.apercu === 'Parfait, merci' ? z : null; });
      v('le dernier message est le sien : non lu, et le compte du service (2 d\'avant + 1)', [!!x, x && x.nonLu, x && x.nonLus], [true, true, 3]);
    }

    console.log('\nJe réponds depuis cet appareil, puis j\'ouvre : tout est lu (le chemin ordinaire ne change pas)');
    {
      await A.src.envoyer(AB, { texte: 'À lundi' });
      const x = await ligne(A, AB);
      v('mon envoi éteint « Non lu » (le dernier mot est le mien)', [x.apercu, x.nonLu, x.nonLus], ['Vous : À lundi', false, 0]);
      await A.src.ouvrir(AB); await A.src.marquerLu(AB);
      const b = await att(async () => { const z = await brut(A, AB); return z.non_lus === 0 ? z : null; });
      vrai('ouvrir puis marquerLu remet le SERVICE à zéro aussi (c\'est cela, lire)', !!b);
      const x2 = await ligne(A, AB);
      v('et la ligne reste non lue : faux', [x2.nonLu, x2.nonLus], [false, 0]);
    }

    console.log('\nUn groupe se comporte comme une conversation à deux');
    {
      const g = await A.src.creerGroupe({ nom: 'Équipe banc', membres: [bruno.id] });
      await B.src.envoyer(g.id, { texte: 'Bienvenue dans le groupe' });
      await att(async () => (await ligne(A, g.id)).nonLu);
      vrai('population : le groupe est non lu (un message de Bruno)', (await ligne(A, g.id)).nonLu === true);
      await A.src.envoyer(g.id, { texte: 'Merci Bruno' });
      const x = await ligne(A, g.id);
      v('mon message dans un groupe : « Vous : Merci Bruno » et plus de « Non lu »', [x.apercu, x.nonLu], ['Vous : Merci Bruno', false]);
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    try { await svc.arreter(); } catch (e) { /* idem */ }
    try { await og.fermer(); } catch (e) { /* idem */ }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
