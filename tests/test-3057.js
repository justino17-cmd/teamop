/* ⛔ CE QUE CE FICHIER GARDE — L'ORGANISATEUR ET LE SERVICE SE PARLENT SUR LE LIEN « INVITÉ (SANS COMPTE) » (famille 4, modèle `test-3043`) : les VRAIES fonctions de `server-msg/public/api.js` et de
   `source-serveur.js` (`lienInviteReunion`, `regenererLienInviteReunion` — ce que touchent « Copier / Partager / Régénérer le lien invité » de l'interface) contre le VRAI `server-msg/index.js`.

   Ce que ni le service seul (`test-3050`) ni la page seule ne voient : la forme de la réponse que l'appareil lit.
     · le jeton rendu est celui que `invite.html` attend (32 signes), le même tant qu'on ne régénère pas ;
     · régénérer rend un AUTRE jeton et le nombre de personnes renvoyées (`coupes`), un ENTIER (la source le jette sinon) ;
     · l'ancien jeton meurt (410 `lien_remplace`), le nouveau marche ; celui qui attendait avec l'ancien perd sa session ;
     · un invité (cookie `-i`) ne peut ni créer ni régénérer un lien (la route est celle de l'organisateur, garde H).
   ⛔ Une absence se prouve sur une population : « l'ancien est mort » est précédé de « l'ancien marchait ». */
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const IV = require('./outils-invite');
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));

(async () => {
  const I = await IV.monter();
  try {
    const hote = I.pers('Hote');
    const cH = I.cl(hote);
    const rid = await I.programmer(cH);
    await I.entrerSalle(cH, rid);   // la salle est ouverte : l'organisateur est arrivé (sans lui, la porte répond 409 pas_ouverte)
    /* la VRAIE source de l'organisateur : son navigateur porte le cookie du compte */
    const nav = T.navigateur(I.svc.base);
    nav.client.poserCookie(cH.cookie());
    const src = creerSourceServeur({ OPMSG, base: I.svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiSaisieMs: 6000, delaiRelireMs: 5 });
    const d = await src.demarrer();
    vrai('population : la source de l\'organisateur est connectée avec son compte', d && d.connecte === true);
    vrai('la source expose les deux gestes du lien invité', typeof src.lienInviteReunion === 'function' && typeof src.regenererLienInviteReunion === 'function');

    console.log('Le lien');
    const j1 = await src.lienInviteReunion(rid);
    vrai('le jeton est une chaîne de 32 signes (le format qu\'attend invite.html)', /^[A-Za-z0-9_-]{32}$/.test(j1));
    const j1b = await src.lienInviteReunion(rid);
    v('le demander deux fois rend le MÊME jeton (« Copier » ne tue pas le lien déjà partagé)', j1b, j1);
    const ap = await I.clientInvite().post('/api/invite/apercu', { jeton: j1 });
    v('un client vierge l\'ouvre : titre et organisateur, rien d\'autre', [ap.code, Object.keys((ap.j && ap.j.reunion) || {}).sort()], [200, ['organisateur', 'titre']]);

    console.log('\nRégénérer');
    const attend = await I.invite(j1, 'Paul', 'Plomberie Durand');
    vrai('population : un invité attend à la porte avec l\'ancien lien (201, attente)', attend.rep.code === 201 && attend.rep.j.attente === true);
    const etatAvant = await attend.c.get('/api/invite/etat');
    vrai('… et sa session marche avant la régénération', etatAvant.code === 200);
    const r = await src.regenererLienInviteReunion(rid);
    vrai('un AUTRE jeton, de la même forme', r.jeton !== j1 && /^[A-Za-z0-9_-]{32}$/.test(r.jeton));
    v('le nombre de personnes renvoyées est un entier, et il compte celui qui attendait', [Number.isInteger(r.coupes), r.coupes >= 1], [true, true]);
    const vieux = await I.clientInvite().post('/api/invite/apercu', { jeton: j1 });
    v('⛔ l\'ANCIEN lien est mort : 410 lien_remplace', [vieux.code, vieux.j && vieux.j.error], [410, 'lien_remplace']);
    const neuf = await I.clientInvite().post('/api/invite/apercu', { jeton: r.jeton });
    v('le nouveau marche', neuf.code, 200);
    const apres = await attend.c.get('/api/invite/etat');
    v('⛔ celui qui attendait avec l\'ancien lien a perdu sa session (401)', apres.code, 401);
    const re = await I.invite(j1, 'Paul', 'Plomberie Durand');
    vrai('⛔ et ne rentre pas de nouveau avec l\'ancien lien', re.rep.code === 410);
    const sans = await src.lienInviteReunion(rid);
    v('le lien que « Copier » rend désormais est le nouveau', sans, r.jeton);

    console.log('\nUn invité ne touche pas au lien');
    const inv2 = await I.invite(r.jeton, 'Léa', '');
    vrai('population : une invitée est à la porte', inv2.rep.code === 201);
    const a1 = await inv2.c.post('/api/reunions/' + rid + '/invite/lien', {});
    const a2 = await inv2.c.post('/api/reunions/' + rid + '/invite/regenerer', {});
    v('⛔ ni créer ni régénérer le lien depuis une session d\'invité (401)', [a1.code, a2.code], [401, 401]);
    const apres2 = await I.clientInvite().post('/api/invite/apercu', { jeton: r.jeton });
    v('… et le lien n\'a pas bougé', apres2.code, 200);
    src.arreter && src.arreter();
  } finally { await I.arreter(); }
  fin();
})().catch(e => { console.error('banc mort :', e && e.stack || e); process.exit(1); });
