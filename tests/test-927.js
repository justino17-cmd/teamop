/* ⛔ CE QUE CE FICHIER GARDE — LE THÈME D'UNE CONVERSATION : SON FOND, LA COULEUR DE MES BULLES (famille 3 : le VRAI service, en HTTP).

   7 octobre 2026 : « personnaliser les conversations, mettre des thèmes derrière, les bulles de couleurs ». Le thème est À CHACUN (comme le fond d'une discussion chez WhatsApp : ce que je
   choisis ne change rien chez les autres membres), suit la personne sur tous ses appareils, et n'est qu'un NOM pris dans deux listes fermées — jamais une couleur ni une image libres :
   rien de ce qu'une personne écrit ne devient du style. Ce banc tient :
     · par défaut, aucun thème (`null`) ; `POST /api/conversations/:id/prefs { theme: { fond, bulle } }` le pose, `null` (ou « aucun / défaut ») le retire ;
     · ⛔ une valeur hors des listes (une couleur, une adresse d'image, un nom inventé), une chaîne, un tableau : 400 — rien n'est écrit ;
     · ⛔ À MOI SEUL : le thème d'Alice ne paraît ni dans la liste ni dans la conversation de Bruno ;
     · mes autres appareils l'apprennent (l'événement de la conversation) ;
     · un étranger à la conversation : la garde (404).  */
'use strict';
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const MDP = (l) => 'pw-' + l + '-1234';

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(['alice', 'bruno', 'eve'].map(l => [l, { pass: MDP(l), nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url });
  const flux = [];
  try {
    const [A, B, E] = await Promise.all(['alice', 'bruno', 'eve'].map(l => T.connecter(svc, og, l, MDP(l))));
    const A2 = await T.connecter(svc, og, 'alice', MDP('alice'));         // le second appareil d'Alice
    const l = await A.post('/api/contacts/lien', {}); await B.post('/api/liens/accepter', { code: l.j.code });
    const G = (await A.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B.moi.id] })).j.conversation.id;
    const prefs = (P, theme) => P.post('/api/conversations/' + G + '/prefs', { theme });
    const themeListe = async (P) => ((await P.get('/api/conversations')).j.conversations || (await P.get('/api/conversations')).j).find(c => c.id === G).theme;
    const themeConv = async (P) => (await P.get('/api/conversations/' + G)).j.moi.theme;

    console.log('\n1. Par défaut, rien');
    v('la liste et la conversation disent « aucun thème » (null) chez Alice et chez Bruno', [await themeListe(A), await themeConv(A), await themeListe(B)], [null, null, null]);

    console.log('\n2. Alice pose un thème');
    const f2 = await T.flux(A2); flux.push(f2);
    const n0 = f2.evenements.length;
    let r = await prefs(A, { fond: 'ocean', bulle: 'violet' });
    v('« Océan », bulles violettes : 200', r.code, 200);
    v('la liste et la conversation le disent (« fond/bulle »)', [await themeListe(A), await themeConv(A)], ['ocean/violet', 'ocean/violet']);
    vrai('son second appareil l\'apprend (un événement de la conversation)', !!(await f2.attendre(e => f2.evenements.indexOf(e) >= n0 && e.data && e.data.conv === G)));
    v('⛔ À ELLE SEULE : Bruno ne voit aucun thème', [await themeListe(B), await themeConv(B)], [null, null]);
    await prefs(A, { fond: 'aube' });
    v('un fond seul : les bulles restent par défaut', await themeListe(A), 'aube/defaut');
    await prefs(A, { bulle: 'graphite' });
    v('une couleur seule : le fond par défaut', await themeListe(A), 'aucun/graphite');

    console.log('\n3. Ce qui est refusé');
    const refus = await Promise.all([
      prefs(A, { fond: 'url(https://exemple.invalid/x.png)' }), prefs(A, { bulle: '#ff0000' }), prefs(A, { fond: 'plage' }), prefs(A, { bulle: 'red; background:url(x)' }),
      prefs(A, 'ocean/violet'), prefs(A, ['ocean', 'violet']), prefs(A, { fond: 12 }),
    ]);
    v('une adresse d\'image, une couleur, un nom inventé, du style glissé, une chaîne, un tableau, un nombre : 400', refus.map(x => x.code), Array(7).fill(400));
    v('⛔ …et rien n\'a été écrit', await themeListe(A), 'aucun/graphite');
    v('un étranger à la conversation : la garde (404)', (await E.post('/api/conversations/' + G + '/prefs', { theme: { fond: 'ocean' } })).code, 404);

    console.log('\n4. Retirer le thème');
    await prefs(A, { fond: 'aucun', bulle: 'defaut' });
    v('« aucun / défaut » : plus de thème', await themeListe(A), null);
    await prefs(A, { fond: 'foret', bulle: 'vert' }); await prefs(A, null);
    v('null : plus de thème', await themeListe(A), null);
    v('les autres préférences ne bougent pas avec le thème (épingle)', [(await A.post('/api/conversations/' + G + '/prefs', { epingle: true, theme: { fond: 'sable' } })).code, (await A.get('/api/conversations/' + G)).j.moi.epingle, await themeListe(A)], [200, true, 'sable/defaut']);
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally {
    for (const f of flux) f.fermer();
    await svc.arreter(); await og.fermer();
    fin('test-927');
  }
})();
