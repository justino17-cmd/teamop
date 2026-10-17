/* ⛔ CE QUE CE FICHIER GARDE — L'APERÇU D'UN MESSAGE SYSTÈME DIT CE QUI S'EST PASSÉ, PAS « ACTIVITÉ DU GROUPE » (lot m10 de la revue d'OP MESSAGES, 17 octobre 2026).

   La VRAIE `server-msg/public/source-serveur.js` contre le VRAI service (la liste lui vient de `GET /api/conversations`). Un groupe dont le dernier événement est système (quelqu'un est ajouté,
   quitte, le groupe est renommé…) affichait un texte vague. La liste dit maintenant la phrase de la conversation ouverte — la MÊME table (`texteSysteme`), aucune seconde copie :
     · le service joint à l'aperçu la méta du message système, le nom de celui qui agit (`par`) et de celui qui est concerné (`cible`) — seulement s'ils sont MEMBRES de la conversation ;
     · la page ne dit la phrase que si elle CONNAÎT les personnes nommées : sinon « Activité du groupe » (un parti, un retiré inconnu : « Quelqu'un a quitté le groupe » serait moins vrai) ;
     · un service d'avant (aucune méta dans l'aperçu) garde le mot générique ; un message ordinaire n'est pas touché.
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
  const NOMS = { alice: 'Alice Banc', bruno: 'Bruno Banc', chloe: 'Chloé Banc', dora: 'Dora Banc' };
  const MDP = Object.fromEntries(Object.keys(NOMS).map(k => [k, 'pw-' + k + '-12345678']));
  const og = await T.fauxOpGestion(Object.fromEntries(Object.keys(NOMS).map(k => [k, { pass: MDP[k], nom: NOMS[k], actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const sources = [];
  const faux = { priseEnCharge: () => ({ ok: false, raison: 'navigateur' }), permission: () => 'default', visible: () => true, surMessage: () => {}, abonnementActuel: async () => null };
  /* `ancien` : un service d'AVANT — la méta, `par` et `cible` ne sont pas joints à l'aperçu */
  function monter(ancien) {
    const nav = T.navigateur(svc.base);
    const f = async (url, init) => {
      const r = await nav.fetch(url, init);
      if (!ancien || !/\/api\/conversations$/.test(String(url).split('?')[0]) || (init && init.method && init.method !== 'GET')) return r;
      const j = await r.json();
      for (const c of j.conversations || []) if (c.apercu) { delete c.apercu.meta; delete c.apercu.cible; }
      return new Response(JSON.stringify(j), { status: 200, headers: { 'Content-Type': 'application/json' } });
    };
    const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: f, EventSource: nav.EventSource, navigateur: faux, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 500, delaiRelireMs: 5, delaiAckMs: 60 });
    src.ecouter(() => {}); sources.push(src);
    return { src, nav, async entrer(login) { await src.connexion(login, MDP[login]); const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé'); return src.moi(); } };
  }
  const apercu = async (X, id) => ((await X.src.lister(true)).find(c => c.id === id) || {}).apercu;

  try {
    const A = monter(), B = monter(), C = monter(), D = monter();
    const alice = await A.entrer('alice'); const bruno = await B.entrer('bruno'); const chloe = await C.entrer('chloe'); const dora = await D.entrer('dora');
    for (const X of [B, C, D]) { const l = await A.src.lienContact(); await X.src.accepterLien(l.code); }
    await att(() => A.src.contacts().length === 3);

    console.log('Un groupe vient d\'être créé : le dernier événement est système');
    const g = (await A.src.creerGroupe({ nom: 'Équipe banc', membres: [bruno.id, chloe.id] })).id;
    {
      v('Alice (qui l\'a créé) lit « Vous avez créé le groupe »', await apercu(A, g), 'Vous avez créé le groupe');
      const B2 = monter(); await B2.entrer('bruno');
      v('Bruno, qui ne connaît pas Alice (pas un contact), lit « Alice Banc a créé le groupe » : son nom vient avec l\'aperçu', await apercu(B2, g), 'Alice Banc a créé le groupe');
    }

    console.log('\nAjouter quelqu\'un : « Vous avez ajouté Dora Banc » — et chez Bruno, qui ne connaît ni l\'un ni l\'autre');
    {
      await A.src.ajouterMembres(g, [dora.id]);
      v('Alice', await apercu(A, g), 'Vous avez ajouté Dora Banc');
      const B2 = monter(); await B2.entrer('bruno');
      v('Bruno (la personne ajoutée est membre : son nom est joint)', await apercu(B2, g), 'Alice Banc a ajouté Dora Banc');
      v('Dora lit la phrase de la conversation ouverte, mot pour mot', await apercu(D, g), (await (async () => { const o = await D.src.ouvrir(g); return o.messages.filter(m => m.systeme).pop().texte; })()));
    }

    console.log('\nRenommer le groupe');
    {
      await A.src.majConversation(g, { nom: 'Équipe banc 2' });
      v('Alice', await apercu(A, g), 'Vous avez renommé le groupe');
      const B2 = monter(); await B2.entrer('bruno');
      v('Bruno', await apercu(B2, g), 'Alice Banc a renommé le groupe');
    }

    console.log('\nRetirer quelqu\'un qui n\'est plus membre : le nom manque à celui qui ne le connaît pas — le mot générique, jamais « Quelqu\'un »');
    {
      await A.src.retirerMembre(g, chloe.id);
      v('Alice connaît Chloé (son contact) : « Vous avez retiré Chloé Banc »', await apercu(A, g), 'Vous avez retiré Chloé Banc');
      const B2 = monter(); await B2.entrer('bruno');
      const a = await apercu(B2, g);
      v('Bruno ne connaît pas Chloé (retirée : le service ne la nomme plus) : « Activité du groupe »', a, 'Activité du groupe');
      vrai('⛔ et jamais « Quelqu\'un » dans une phrase d\'aperçu', !/Quelqu'un/.test(a));
    }

    console.log('\nUn service d\'avant (pas de méta dans l\'aperçu) : le mot générique, comme avant');
    {
      const V = monter(true); await V.entrer('alice');
      v('Alice, sur un service qui ne joint rien', await apercu(V, g), 'Activité du groupe');
    }

    console.log('\nUn message ordinaire après : l\'aperçu redevient le message (rien de système ne reste)');
    {
      await B.src.envoyer(g, { texte: 'Merci pour l\'accueil' });
      v('Alice lit le message de Bruno (le groupe affiche « Bruno : … »)', await att(async () => { const a = await apercu(A, g); return /Merci/.test(a) ? a : null; }), 'Bruno : Merci pour l\'accueil');
    }
  } finally {
    for (const s of sources) { try { s.arreter(); } catch (e) { /* déjà arrêtée */ } }
    try { await svc.arreter(); } catch (e) { /* idem */ }
    try { await og.fermer(); } catch (e) { /* idem */ }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
