/* ⛔ CE QUE CE FICHIER GARDE — « NE PAS DÉRANGER PENDANT UNE RÉUNION » (famille 3 : le VRAI service, en HTTP, son balayeur d'appels qui tourne pour de bon, un FAUX SERVICE PUSH dont chaque
   charge est DÉCHIFFRÉE ; la base ouverte à côté).

   8 octobre 2026, Justin (« fais tout ça ») : pendant une réunion, les messages ne font pas sonner le téléphone, et les autres voient qu'on est en réunion. Ce que le service promet :
     · ⛔ DANS une salle (un appel de groupe ou une réunion, présent), un message ou une mention ne fait sonner AUCUN appareil de la personne (`push.js`, `retenable`) — ce qui n'est pas un message
       (un ajout à un groupe…) passe, lui ;
     · à la SORTIE, UNE notification résume — « Pendant la réunion : nouveaux messages dans une conversation, dont une mention » —, sans un nom ni un mot du texte, et rien quand il n'y avait rien ;
     · ensuite, tout repart comme avant ;
     · ⛔ coupé dans les réglages (`prefs.pause_reunion: false`), rien n'est retenu ; le réglage n'accepte qu'un booléen ;
     · « En réunion » se VOIT : la liste des contacts le dit (`en_reunion`), et un événement de présence l'annonce en entrant et en sortant — ⛔ avec la règle RÉCIPROQUE de la présence : qui a coupé
       la sienne ne le voit pas.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « rien n'a sonné » est prouvé par une SENTINELLE (une notification qui, elle, doit arriver APRÈS), jamais au chronomètre. */
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
const JOUR = 86400000;

(async () => {
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ horloge: true, env: { OPMSG_TEST_PUSH: fps.hote }, config: { presenceGraceMs: 300, appels: { balayageMs: 100, perduMs: 600000 }, push: { ackMs: 600, timeoutMs: 3000, contact: 'mailto:exploitation@exemple.invalid' } } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const dev = (nom) => { const d = P.appareil(fps.endpoint(nom)); d.chemin = '/push/' + nom; return d; };
  const recus = (d) => fps.envois.filter(e => e.chemin === d.chemin).map(e => JSON.parse(P.dechiffrer(d, e.corps)));
  const attendreN = (d, n) => T.attendre(() => recus(d).length >= n, 8000, 10);
  const flux = [];
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan');
    for (const [x, y] of [[ana, ben], [ana, cleo], [ana, dan], [ben, cleo], [ben, dan]]) S.contactLier(x.id, y.id);
    const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan);
    const G1 = (await a.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id, cleo.id] })).j.conversation.id;
    const G2 = (await a.post('/api/conversations/groupe', { nom: 'Réunion', membres: [ben.id] })).j.conversation.id;
    const G3 = (await a.post('/api/conversations/groupe', { nom: 'Dépôt', membres: [ben.id] })).j.conversation.id;      // un message SEUL pendant la réunion (sans mention qui partage son attente)
    const dB = dev('ben');
    const ab = await b.post('/api/push/abonner', { sub: dB.sub });
    await d.post('/api/moi/maj', { prefs: { presence: false } });
    v('population : deux groupes, l\'appareil de Ben abonné, Dan a coupé sa présence', [!!G1, !!G2, ab.code, (await d.get('/api/moi')).j.moi.prefs.presence], [true, true, 200, false]);
    const envoyer = (X, conv, texte, mentions) => X.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'm_' + crypto.randomBytes(8).toString('hex'), texte }, mentions ? { mentions } : {}));
    const contactsDe = async (X) => Object.fromEntries(((await X.get('/api/contacts')).j.contacts || []).map(x => [x.id, x]));
    /* la SENTINELLE : Cléo ajoute Ben à un groupe neuf — « Vous avez été ajouté », qui n'est pas un message et n'est jamais retenu */
    let nSent = 0;
    const sentinelle = async () => { await c.post('/api/conversations/groupe', { nom: 'Sentinelle ' + (++nSent), membres: [ben.id] }); };
    const appelsDe = (l) => l.filter(x => x.type !== 'appel');      // une sonnerie d'appel de groupe (le service la pousse aussi) n'est pas ce qu'on compte ici

    console.log('\n1. Le témoin : hors réunion, un message sonne');
    await envoyer(a, G1, 'Bonjour');
    vrai('Ben reçoit « Nouveau message »', await attendreN(dB, 1) && recus(dB)[0].type === 'message');

    console.log('\n2. Ben entre dans un appel de groupe : il est « En réunion »');
    const fC = await T.flux(c); flux.push(fC);
    const fB = await T.flux(b); flux.push(fB);          // la page de Ben est ouverte (on est en ligne quand on est dans une salle) — et elle n'acquitte rien : une push attend puis part
    const appel = await a.post('/api/appels', { conv: G2, type: 'audio' });
    const id = appel.j && appel.j.appel && appel.j.appel.id;
    /* ⛔ appelé, PAS ENCORE DEDANS (son téléphone sonne) : il n'est pas en réunion — un message sonne encore */
    const nS = recus(dB).length;
    await envoyer(a, G3, 'Avant que tu décroches');
    await T.attendre(() => appelsDe(recus(dB).slice(nS)).length >= 1, 8000, 10);
    v('⛔ pendant que l\'appel SONNE chez Ben (il n\'a pas répondu), un message sonne : être appelé n\'est pas être en réunion', appelsDe(recus(dB).slice(nS)).map(x => x.type), ['message']);
    const rep = await b.post('/api/appels/' + id + '/repondre', { accepte: true });
    v('population : Ana lance l\'appel du groupe « Réunion », Ben répond', [appel.code, rep.code], [201, 200]);
    const vu = await T.attendre(async () => !!(await contactsDe(a))[ben.id].en_reunion, 8000, 50);
    vrai('⛔ la liste des contacts d\'Ana dit Ben « en réunion » (le balayeur l\'a vu entrer)', vu);
    v('… et Cléo aussi ; ⛔ pas Dan, qui a coupé sa présence (la règle est réciproque) — population : Dan a bien Ben pour contact', [(await contactsDe(c))[ben.id].en_reunion, !!(await contactsDe(d))[ben.id], (await contactsDe(d))[ben.id].en_reunion], [true, true, false]);
    vrai('le flux de Cléo l\'a appris : un événement de présence « en réunion » pour Ben', await T.attendre(() => fC.evenements.some(e => e.event === 'presence' && e.data && e.data.uid === ben.id && e.data.en_reunion === true), 8000, 20),
      JSON.stringify(fC.evenements.filter(e => e.event === 'presence').slice(-3)));

    console.log('\n3. Pendant la réunion : rien ne sonne chez Ben');
    const n0 = recus(dB).length;
    await envoyer(a, G3, 'Tu as vu le devis ?');
    await envoyer(a, G1, '@Ben urgent', [ben.id]);
    await sentinelle();
    await attendreN(dB, n0 + 1);
    const pendant = recus(dB).slice(n0);
    v('⛔ ni le message ni la mention n\'ont sonné : la seule notification de Ben est la sentinelle (« ajouté à un groupe », jamais retenue)', appelsDe(pendant).map(x => x.type), ['groupe']);
    v('la mention est bien écrite dans l\'application (le tableau de bord la liste)', ((await b.get('/api/notifications')).j.notifications || []).filter(x => x.type === 'mention').length, 1);

    console.log('\n4. Ben sort : UNE notification résume');
    const n1 = recus(dB).length;
    const q = await b.post('/api/appels/' + id + '/quitter', {});
    v('Ben quitte l\'appel', q.code, 200);
    vrai('le résumé arrive', await attendreN(dB, n1 + 1));
    const r = appelsDe(recus(dB).slice(n1))[0] || {};
    v('« Pendant la réunion : nouveaux messages dans 2 conversations, dont une mention » — ni nom ni texte, l\'application s\'ouvre (deux conversations : pas une seule à ouvrir)', [r.type, r.corps, r.url, r.tag], ['resume', 'Pendant la réunion : nouveaux messages dans 2 conversations, dont une mention', '/', 'resume-reunion']);
    v('⛔ le résumé ne porte aucun mot du texte ni aucun nom', /devis|urgent|Ana|Ben/.test(JSON.stringify(r)), false);
    await a.post('/api/appels/' + id + '/quitter', {});          // Ana raccroche aussi (on ne lance pas un second appel en étant encore dans le premier)
    vrai('« en réunion » s\'éteint : la liste d\'Ana ne le dit plus', await T.attendre(async () => !(await contactsDe(a))[ben.id].en_reunion, 8000, 50));
    vrai('… et le flux de Cléo l\'apprend', await T.attendre(() => fC.evenements.some(e => e.event === 'presence' && e.data && e.data.uid === ben.id && e.data.en_reunion === false), 8000, 20));

    console.log('\n5. Après : tout sonne de nouveau, et un second résumé ne part pas');
    const n2 = recus(dB).length;
    await envoyer(a, G1, 'Merci !');
    await attendreN(dB, n2 + 1);
    await sentinelle();
    await attendreN(dB, n2 + 2);
    v('le message sonne (« Nouveau message »), puis la sentinelle — ⛔ et aucun second résumé entre les deux', appelsDe(recus(dB).slice(n2)).map(x => x.type), ['message', 'groupe']);

    console.log('\n6. Coupé dans les réglages : rien n\'est retenu');
    v('⛔ le réglage n\'accepte qu\'un booléen', (await b.post('/api/moi/maj', { prefs: { pause_reunion: 'non' } })).code, 400);
    const coupe = await b.post('/api/moi/maj', { prefs: { pause_reunion: false } });
    v('Ben coupe « Pause pendant les réunions »', [coupe.code, (await b.get('/api/moi')).j.moi.prefs.pause_reunion], [200, false]);
    const appel2 = await a.post('/api/appels', { conv: G2, type: 'audio' });
    const id2 = appel2.j && appel2.j.appel && appel2.j.appel.id;
    await b.post('/api/appels/' + id2 + '/repondre', { accepte: true });
    vrai('population : Ben est de nouveau « en réunion »', await T.attendre(async () => !!(await contactsDe(a))[ben.id].en_reunion, 8000, 50));
    const n3 = recus(dB).length;
    await envoyer(a, G1, 'Pendant la deuxième réunion');
    await attendreN(dB, n3 + 1);
    v('⛔ coupé : le message SONNE pendant la réunion', appelsDe(recus(dB).slice(n3)).map(x => x.type), ['message']);
    await b.post('/api/appels/' + id2 + '/quitter', {});
    await a.post('/api/appels/' + id2 + '/quitter', {});
    await T.attendre(async () => !(await contactsDe(a))[ben.id].en_reunion, 8000, 50);
    await sentinelle();
    await attendreN(dB, recus(dB).length + 1);
    v('⛔ … et à la sortie, aucun résumé (rien n\'avait été retenu) : la suivante est la sentinelle', appelsDe(recus(dB).slice(n3 + 1)).map(x => x.type), ['groupe']);
    console.log('\n7. « En réunion » suppose « en ligne »');
    const appel3 = await a.post('/api/appels', { conv: G2, type: 'audio' });
    await b.post('/api/appels/' + (appel3.j && appel3.j.appel && appel3.j.appel.id) + '/repondre', { accepte: true });
    vrai('population : Ben, page ouverte, est « en réunion »', await T.attendre(async () => !!(await contactsDe(a))[ben.id].en_reunion, 8000, 50));
    fB.fermer();
    vrai('⛔ sa page fermée (et la grâce de la présence passée), il n\'est plus « en réunion » pour les autres — même si la salle le compte encore', await T.attendre(async () => { const x = (await contactsDe(a))[ben.id]; return !x.en_ligne && !x.en_reunion; }, 8000, 50));
    fC.fermer();
  } catch (err) {
    vrai('le banc s\'est déroulé sans exception (' + (err && err.stack ? err.stack.split('\n').slice(0, 3).join(' | ') : err) + ')', false);
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    await svc.arreter();
    await fps.fermer();
  }
  fin();
})();
