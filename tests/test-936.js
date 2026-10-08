/* ⛔ CE QUE CE FICHIER GARDE — LES MENTIONS (famille 3 : le VRAI service, en HTTP, son balayeur qui tourne pour de bon, et un FAUX SERVICE PUSH local dont chaque charge est DÉCHIFFRÉE
   avec les clés de l'appareil de banc ; la base ouverte à côté).

   8 octobre 2026, Justin (« fais tout ça ») : « @prénom dans un groupe, et la personne est prévenue ». Ce que le service promet (`routes.js`, `citesDe` / `mentionner`) :
     · dans un groupe, un canal ou une réunion, une personne CITÉE qui est membre (pas l'auteur, vingt au plus) reçoit la notification « vous a mentionné » ET une push « Nouvelle mention » ;
     · ⛔ JAMAIS DEUX PUSHS POUR UN MESSAGE : la push du message ne part pas chez une personne citée (sa mention la prévient) ; les autres reçoivent « Nouveau message » comme avant ;
     · ⛔ la mention passe la SOURDINE (c'est ce qu'on attend d'elle) — mais en sourdine, une push de mention par conversation et par minute au plus : citer quelqu'un en boucle ne fait pas
       sonner son téléphone en boucle (la notification de l'application, elle, s'écrit à chaque fois) ;
     · ⛔ DANS UNE CONVERSATION À DEUX, LA MENTION RESTE CE QU'ELLE ÉTAIT : la notification de l'application (au NOM de l'auteur), SANS push — on y est déjà prévenu par le message
       (sa push n'écarte pas la personne citée), et citer l'autre n'y contourne pas sa sourdine. Retirée en silence au premier jet, elle avait fait tomber test-957 (l'effacement d'un
       compte tait ce titre) ;
     · une liste de la page n'est jamais une raison de perdre un message : un non-membre, l'auteur, un identifiant mal formé sont IGNORÉS, l'envoi passe ;
     · la push d'une mention se RE-JUGE au moment de partir (elle attend qu'une page ouverte l'acquitte) : message supprimé « pour tous » entre-temps → rien ne part ;
     · ⛔ un message PROGRAMMÉ emporte ses personnes citées (des membres d'aujourd'hui) — leur appartenance se rejuge à l'heure : partie du groupe entre-temps, rien pour elle.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien n'est parti » est prouvé par une SENTINELLE (un envoi qui, lui, doit arriver APRÈS), jamais au chronomètre. */
'use strict';
const path = require('path');
const crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const P = require('./outils-push');
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const MIN = 60000, JOUR = 86400000;

(async () => {
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ horloge: true, env: { OPMSG_TEST_PUSH: fps.hote }, config: { balayageMs: 200, push: { ackMs: 600, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const sql = (req, ...a) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  let k = 0, avance = 0;
  const maintenant = () => Date.now() + avance;
  const avancer = (ms) => { avance += ms; svc.avancer(ms); };
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  /* un appareil de banc, et ce qu'il a reçu — DÉCHIFFRÉ */
  const dev = (nom) => { const d = P.appareil(fps.endpoint(nom)); d.chemin = '/push/' + nom; return d; };
  const recus = (d) => fps.envois.filter(e => e.chemin === d.chemin).map(e => JSON.parse(P.dechiffrer(d, e.corps)));
  const attendreN = (d, n) => T.attendre(() => recus(d).length >= n, 8000, 10);
  const flux = [];
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve');
    const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan), e = cl(eve);
    for (const x of [b, c, d, e]) { const l = await a.post('/api/contacts/lien', {}); await x.post('/api/liens/accepter', { code: l.j.code }); }
    const G = (await a.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id, cleo.id, dan.id] })).j.conversation.id;
    const AB = (await a.post('/api/conversations/directe', { uid: ben.id })).j.conversation.id;
    /* les conversations TÉMOINS : leurs messages servent de sentinelles (une autre étiquette de push que le groupe, jamais en sourdine) */
    const GT = (await a.post('/api/conversations/groupe', { nom: 'Témoin', membres: [ben.id, dan.id] })).j.conversation.id;
    const AD = (await a.post('/api/conversations/directe', { uid: dan.id })).j.conversation.id;
    const dB = dev('ben'), dC = dev('cleo'), dD = dev('dan');
    const abo = [await b.post('/api/push/abonner', { sub: dB.sub }), await c.post('/api/push/abonner', { sub: dC.sub }), await d.post('/api/push/abonner', { sub: dD.sub })].map(r => r.code);
    v('population : un groupe « Chantier » à quatre, une directe Ana ↔ Ben, trois appareils abonnés', [!!G, !!AB, abo], [true, true, [200, 200, 200]]);
    const muet = await c.post('/api/conversations/' + G + '/prefs', { muet_jusqua: maintenant() + 365 * JOUR });
    v('Cléo met le groupe en sourdine', muet.code, 200);
    const envoyer = (P, conv, texte, mentions) => P.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'm_' + crypto.randomBytes(8).toString('hex'), texte }, mentions ? { mentions } : {}));
    const mentionsDe = async (P) => ((await P.get('/api/notifications')).j.notifications || []).filter(n => n.type === 'mention');

    console.log('\n1. Le témoin : un message sans mention');
    {
      const r = await envoyer(a, G, 'Bonjour à tous');
      const ok = await attendreN(dB, 1) && await attendreN(dD, 1);
      v('201, et Ben comme Dan reçoivent « Nouveau message » (le témoin : la push part bien)', [r.code, !!ok, recus(dB)[0] && recus(dB)[0].corps, recus(dD)[0] && recus(dD)[0].type], [201, true, 'Nouveau message', 'message']);
    }

    console.log('\n2. Ana mentionne Ben et Cléo');
    {
      const nB = recus(dB).length, nC = recus(dC).length, nD = recus(dD).length;
      const r = await envoyer(a, G, '@Ben et @Cleo, vous passez demain ?', [ben.id, cleo.id]);
      v('201 : le message part', r.code, 201);
      const okB = await attendreN(dB, nB + 1), okC = await attendreN(dC, nC + 1), okD = await attendreN(dD, nD + 1);
      const pB = recus(dB)[nB], pC = recus(dC)[nC], pD = recus(dD)[nD];
      v('Ben reçoit « Nouvelle mention » (type mention, l\'étiquette ET le lien de la conversation)', [!!okB, pB && pB.type, pB && pB.corps, pB && pB.tag, pB && pB.url], [true, 'mention', 'Nouvelle mention', G, '/#messages/' + G]);
      v('⛔ Cléo, en SOURDINE, reçoit sa mention quand même', [!!okC, pC && pC.type, pC && pC.corps], [true, 'mention', 'Nouvelle mention']);
      v('Dan, pas cité, reçoit « Nouveau message » comme d\'habitude', [!!okD, pD && pD.type], [true, 'message']);
      /* ⛔ la SENTINELLE : un message neuf, sans mention — il doit être le SUIVANT chez Ben. S'il y avait eu une seconde push pour le même message, c'est elle qu'on lirait. */
      await envoyer(a, G, 'sentinelle 1');
      await attendreN(dB, nB + 2); await attendreN(dD, nD + 2);
      v('⛔ JAMAIS DEUX POUR UN MESSAGE : chez Ben, la push suivante est celle de la sentinelle (« Nouveau message »), pas un « Nouveau message » pour la mention', [recus(dB).length, recus(dB)[nB + 1] && recus(dB)[nB + 1].type], [nB + 2, 'message']);
      const mB = await mentionsDe(b), mC = await mentionsDe(c), mD = await mentionsDe(d);
      v('la notification « vous a mentionné » est écrite pour Ben et Cléo (la conversation, son nom, qui), aucune pour Dan',
        [mB.length, mB[0] && mB[0].cible, mB[0] && mB[0].titre, mB[0] && mB[0].texte, mC.length, mD.length], [1, G, 'Chantier', 'Ana Banc vous a mentionné.', 1, 0]);
      const lue = await b.post('/api/notifications/lues', { ids: [mB[0].id] });
      v('Ben la marque lue (ce que fait le tableau de bord) : elle l\'est, et elle seule', [lue.code, (await mentionsDe(b))[0].lue], [200, true]);
    }

    console.log('\n3. Ce qui n\'est pas une mention est ignoré — sans perdre le message');
    {
      const nB = recus(dB).length, avantE = (await mentionsDe(e)).length, avantA = (await mentionsDe(a)).length;
      const bruit = [eve.id, ana.id, 'p_pasunidentifiant', 42, null, 'c_' + '0'.repeat(32)];
      const r = await envoyer(a, G, 'Liste abîmée', bruit);
      v('201 : une liste abîmée (non-membre, l\'auteure, des identifiants faux) ne fait pas refuser l\'envoi', r.code, 201);
      await attendreN(dB, nB + 1);
      v('Ben reçoit le message ordinaire (il n\'est pas cité)', recus(dB)[nB] && recus(dB)[nB].type, 'message');
      v('⛔ ni Eve (pas membre) ni Ana (l\'auteure) n\'ont de mention', [(await mentionsDe(e)).length - avantE, (await mentionsDe(a)).length - avantA], [0, 0]);
      /* vingt au plus : Dan cité en VINGT-ET-UNIÈME position ne l'est pas */
      const nD = recus(dD).length, avantD = (await mentionsDe(d)).length;
      await envoyer(a, G, 'Vingt et un', Array.from({ length: 20 }, () => 'p_' + crypto.randomBytes(16).toString('hex')).concat([dan.id]));
      await attendreN(dD, nD + 1);
      v('⛔ vingt au plus : cité en vingt-et-unième position, Dan n\'est pas prévenu d\'une mention (« Nouveau message »)', [recus(dD)[nD] && recus(dD)[nD].type, (await mentionsDe(d)).length - avantD], ['message', 0]);
    }

    console.log('\n4. Dans une conversation à deux : la notification de l\'application, sans push');
    {
      const nB = recus(dB).length, avant = (await mentionsDe(b)).length;
      await envoyer(a, AB, '@Ben tu me rappelles ?', [ben.id]);
      await attendreN(dB, nB + 1);
      const m1 = (await mentionsDe(b)).filter(n => n.cible === AB);     // la liste vient la plus récente d'abord : on la prend par sa conversation, pas par sa place
      v('dans la directe, Ben reçoit « Nouveau message » (la push du message ne l\'écarte pas), et la mention s\'écrit comme avant — au NOM d\'Ana, sur la directe',
        [recus(dB)[nB] && recus(dB)[nB].type, m1.length, m1[0] && m1[0].titre, m1[0] && m1[0].texte, m1[0] && m1[0].cible], ['message', 1, 'Ana Banc', 'Ana Banc vous a mentionné.', AB]);
      await b.post('/api/conversations/' + AB + '/prefs', { muet_jusqua: maintenant() + 365 * JOUR });
      await envoyer(a, AB, '@Ben en sourdine', [ben.id]);
      await envoyer(a, G, 'sentinelle 2');
      await attendreN(dB, nB + 2);
      v('⛔ la directe en sourdine : citer Ben ne la contourne PAS — sa push suivante est la sentinelle du groupe (la notification de l\'application, elle, s\'écrit)',
        [recus(dB).length, recus(dB)[nB + 1] && recus(dB)[nB + 1].tag, (await mentionsDe(b)).length - avant], [nB + 2, G, 2]);
    }

    console.log('\n5. En sourdine : une push de mention par conversation et par minute');
    {
      /* la mention du § 2 a posé la marque de Cléo pour ce groupe : on part d'une minute plus tard, pour une marque neuve */
      avancer(61000);
      const nC = recus(dC).length, avant = (await mentionsDe(c)).length;
      await envoyer(a, G, '@Cleo un', [cleo.id]);
      await attendreN(dC, nC + 1);
      v('la première mention de la minute sonne chez Cléo', recus(dC)[nC] && recus(dC)[nC].type, 'mention');
      await envoyer(a, G, '@Cleo deux', [cleo.id]);
      await envoyer(a, G, '@Cleo trois', [cleo.id]);
      v('⛔ les deux suivantes s\'ÉCRIVENT dans l\'application (le tableau de bord les liste)…', (await mentionsDe(c)).length - avant, 3);
      avancer(61000);
      await envoyer(a, G, '@Cleo quatre', [cleo.id]);
      await attendreN(dC, nC + 2);
      v('⛔ … mais ne sonnent pas : la push suivante de Cléo est celle d\'une minute plus tard (la sentinelle)', [recus(dC).length, recus(dC)[nC + 1] && recus(dC)[nC + 1].type], [nC + 2, 'mention']);
      const nB = recus(dB).length;
      await envoyer(a, G, '@Ben un', [ben.id]); await envoyer(a, G, '@Ben deux', [ben.id]);
      await attendreN(dB, nB + 2);
      v('hors sourdine, rien n\'est retenu : deux mentions de Ben, deux pushs (une par message, jamais deux)', [recus(dB).length - nB, recus(dB).slice(nB).map(x => x.type)], [2, ['mention', 'mention']]);
    }

    console.log('\n6. La push d\'une mention se re-juge au moment de partir');
    {
      /* une page ouverte chez Ben (qui n'acquitte rien) : chaque push attend 600 ms, puis se re-juge. Ana supprime le message « pour tous » avant ; la SENTINELLE part dans le groupe
         TÉMOIN (une autre étiquette, donc sa propre attente), mise en file APRÈS : quand elle arrive, la mention a déjà été jugée — si elle était partie, on la lirait avant. */
      const f = await T.flux(b); flux.push(f);
      vrai('population : le flux de Ben est ouvert (une page sur un autre appareil)', f.statut === 200);
      const nB = recus(dB).length;
      const r = await envoyer(a, G, '@Ben oublie ça', [ben.id]);
      const sup = await a.post('/api/conversations/' + G + '/messages/supprimer', { seq: r.j.seq, pour: 'tous' });
      v('le message part puis est supprimé « pour tous » dans la foulée', [r.code, sup.code], [201, 200]);
      await envoyer(a, GT, 'sentinelle 3');
      await attendreN(dB, nB + 1);
      v('⛔ rien n\'est parti pour la mention d\'un message supprimé : la push suivante de Ben est la sentinelle du groupe témoin', [recus(dB).length, recus(dB)[nB] && recus(dB)[nB].tag], [nB + 1, GT]);
      f.fermer(); flux.pop();
      v('la fonction du magasin le dit aussi : message supprimé → null ; sourdine → { muet: true } ; pas membre → null',
        [S.mentionEncore({ uid: ben.id, conv: G, seq: r.j.seq }), S.mentionEncore({ uid: cleo.id, conv: G, seq: r.j.seq - 1 }), S.mentionEncore({ uid: eve.id, conv: G, seq: r.j.seq - 1 })], [null, { muet: true }, null]);
    }

    console.log('\n7. Un message programmé emporte ses personnes citées');
    {
      const quand = maintenant() + 2 * MIN;
      const p = await a.post('/api/conversations/' + G + '/programmes', { texte: '@Ben @Dan rendez-vous à 8 h', quand, mentions: [ben.id, eve.id, dan.id, 'p_faux'] });
      v('201 : il est programmé', p.code, 201);
      v('⛔ en base : seuls les MEMBRES d\'aujourd\'hui sont gardés (ni Eve, ni un identifiant faux)', JSON.parse(sql('SELECT mentions FROM programme WHERE id = ?', p.j.programme.id).mentions), [ben.id, dan.id]);
      const q = await d.post('/api/conversations/' + G + '/quitter', {});
      v('Dan quitte le groupe avant l\'heure', q.code, 200);
      const nB = recus(dB).length, nD = recus(dD).length, avantB = (await mentionsDe(b)).length, avantD = (await mentionsDe(d)).length;
      avancer(3 * MIN);
      const ok = await attendreN(dB, nB + 1);
      v('à l\'heure, il part, et Ben reçoit sa mention (une push « Nouvelle mention », une notification)', [!!ok, recus(dB)[nB] && recus(dB)[nB].type, (await mentionsDe(b)).length - avantB], [true, 'mention', 1]);
      /* la SENTINELLE de Dan part APRÈS le message programmé (déjà traité : Ben l'a reçu) : s'il avait eu sa mention, elle serait arrivée avant */
      await envoyer(a, AD, 'sentinelle 4');
      await attendreN(dD, nD + 1);
      v('⛔ Dan, parti entre-temps : ni push ni mention — la seule push qui lui vient est la sentinelle', [recus(dD).length - nD, recus(dD)[nD] && recus(dD)[nD].tag, (await mentionsDe(d)).length - avantD], [1, AD, 0]);
    }
  } catch (err) {
    vrai('le banc s\'est déroulé sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    try { S.fermer && S.fermer(); } catch (e) { /* tant pis */ }
    await svc.arreter();
    await fps.fermer();
  }
  fin();
})();
