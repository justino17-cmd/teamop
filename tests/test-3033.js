/* ⛔ CE QUE CE FICHIER GARDE — APRÈS UN APPEL, ON REVIENT À L'ÉCRAN D'OÙ L'ON EST PARTI (Justin, 26 octobre 2026, décision #8, testeur « appels@6 » ; l'état se range sur l'APPAREIL, jamais dans les
   données partagées).

   Avant : un appel lancé depuis une FEUILLE (la fiche d'une réunion, les détails d'un appel, un contact) ou reçu pendant qu'une feuille était ouverte REMPLAÇAIT cette feuille dans l'historique :
   raccrocher ramenait à la liste, feuille perdue. Maintenant l'écran de départ se note à l'appel (`origineAppelPoser`, en mémoire de la page, doublée par le MODULE DE DONNÉES dans le stockage de l'onglet : la page n'écrit sur aucun stockage, `test-856`) et se rouvre au
   raccrochage (`origineAppelRetour`) — SI l'écran d'appel était sous les yeux, JAMAIS par-dessus un autre choix (« Message », un onglet : l'appel réduit n'y ramène personne), et pas pour un
   sélecteur (« Nouvel appel », « Nouveau groupe » : on a choisi, on a appelé).

   Les VRAIES fonctions de la page sont extraites et exécutées :
     1. `origineAppelPoser` : la route de départ (feuille comprise) ; « avant d'entrer » est remplacée par la feuille d'en dessous ; le rangement de l'onglet est doublé, et un rangement qui REFUSE
        (mode privé, plein) ne casse rien ;
     2. `origineAppelRetour` : la feuille se rouvre (fiche de réunion, détails d'un appel, contact…) sur le même écran ; ⛔ pas si l'appel était réduit, pas si l'écran d'arrivée n'est plus le même,
        pas si une feuille est déjà ouverte, pas si un autre appel a commencé, pas pour un sélecteur ; l'origine d'un AUTRE appel n'est ni lue ni effacée ;
     3. `lancerAppel` et `surAppelEntrant` posent l'origine (avant de remplacer la feuille) ; `ouvrirConversationAvec` l'efface (aller à la conversation est un choix) ; `quitterAppel` la solde en
        sachant si l'écran d'appel était visible.
   La mesure de bout en bout au navigateur (la route, l'historique, le retour système) : scratchpad/sonde-opmessages-reunions-appels.js (parties « refus » et « retour »).
   ⛔ Une assertion sur un ensemble vide passe et ne prouve rien : chaque « rien ne se rouvre » est précédé du cas où la feuille se rouvre. */
'use strict';
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
const P = require('./outils-page-reunions');
const fs = require('fs'), path = require('path');

/* les trois gestes du module de données (`server-msg/public/source-serveur.js`) : les VRAIES fonctions, extraites du fichier, sur un faux stockage d'onglet */
const SOURCE_SERVEUR = fs.readFileSync(path.join(P.RACINE, 'server-msg/public/source-serveur.js'), 'utf8').replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ');
const iA = SOURCE_SERVEUR.indexOf('const stockageOnglet ='), iB = SOURCE_SERVEUR.indexOf('const CLE_ORIGINE_APPEL ='), iC = SOURCE_SERVEUR.indexOf('function origineAppelEffacer()');
const CODE_SOURCE = iA > 0 && iB > 0 && iC > 0 ? SOURCE_SERVEUR.slice(iA, SOURCE_SERVEUR.indexOf('\n', iA)) + '\n' + SOURCE_SERVEUR.slice(iB, SOURCE_SERVEUR.indexOf('\n', iC)) : '';
const fabriqueSource = (st) => new Function('sessionStorage', CODE_SOURCE + '\nreturn { origineAppelNoter, origineAppelLire, origineAppelEffacer };')(st);

const dormir = (ms) => new Promise((ok) => setTimeout(ok, ms));
function stockage(refuse) {
  const m = new Map();
  return { m, setItem(k, x) { if (refuse) throw new Error('quota'); m.set(k, String(x)); }, getItem(k) { return m.has(k) ? m.get(k) : null; }, removeItem(k) { m.delete(k); } };
}
function monde(over) {
  const poses = [], remplaces = [];
  const D = Object.assign({
    etat: { route: { vue: 'messages', conv: null, sec: null, feuille: false, photo: null, appel: null }, appelId: null, appelReduit: false, origineAppel: null, appelDemarre: false, appelUI: null },
    sessionStorage: stockage(false), cleFeuille: (f) => String(f === true ? 'chat' : f), entree: () => null,
    pousser: (r) => { poses.push(r); D.etat.route = r; }, remplacer: (r) => { remplaces.push(r); D.etat.route = r; }, poses, remplaces,
    CAP: { appelsMedias: true }, mot: () => {}, phrase: (e, d) => d, phraseSilence: (e, d) => d, montrerRefusFeuille: () => {}, erreurInfo: () => {}, dejaEnAppel: () => false,
  }, over || {});
  return D;
}
const FEUILLE = 'reunion:r_' + 'a'.repeat(8);
const route = (o) => Object.assign({ vue: 'messages', conv: null, sec: null, feuille: false, photo: null, appel: null }, o || {});
const monter = (over) => {
  const D = monde(over);
  D.source = Object.assign({}, CODE_SOURCE ? fabriqueSource(D.sessionStorage) : {}, (over && over.source) || {});
  const M = P.monter({ FEUILLES_RETOUR: P.ligne('const FEUILLES_RETOUR ='), origineAppelPoser: P.decl('function origineAppelPoser('), origineAppelLire: P.decl('function origineAppelLire('), origineAppelEffacer: P.decl('function origineAppelEffacer('),
    origineAppelRetour: P.decl('function origineAppelRetour('), lancerAppel: P.decl('async function lancerAppel('), surAppelEntrant: P.decl('function surAppelEntrant('), ouvrirConversationAvec: P.decl('async function ouvrirConversationAvec('),
    memeRoute: P.ligne('const memeRoute =') }, D);
  return { M, D, F: M.F };
};

(async () => {
  const base = monter();
  console.log('0. La population');
  v('(population) chaque morceau est trouvé', base.M.absents, []);

  console.log('\n1. `origineAppelPoser` : d\'où l\'on est parti');
  {
    const { D, F } = monter();
    D.etat.route = route({ conv: 'c_x', feuille: FEUILLE });
    F.origineAppelPoser('a1');
    v('⛔ la route de départ, FEUILLE comprise, est notée en mémoire…', D.etat.origineAppel, { id: 'a1', route: { vue: 'messages', conv: 'c_x', sec: null, feuille: FEUILLE } });
    v('… et doublée dans le rangement de l\'ONGLET (jamais ailleurs) : la clé, une chaîne JSON de la même note', [Array.from(D.sessionStorage.m.keys()), JSON.parse(D.sessionStorage.m.get('opmsg-origine-appel'))], [['opmsg-origine-appel'], D.etat.origineAppel]);
    const r = monter({ sessionStorage: stockage(true) }); r.D.etat.route = route({ feuille: FEUILLE });
    let leve = null; try { r.F.origineAppelPoser('a2'); } catch (e) { leve = e; }
    vrai('⛔ un rangement qui REFUSE (mode privé, plein) ne casse rien : la mémoire de la page suffit', leve === null && r.D.etat.origineAppel && r.D.etat.origineAppel.route.feuille === FEUILLE);
    const av = monter({ entree: () => ({ n: 2, p: route({ feuille: FEUILLE }) }) }); av.D.etat.route = route({ feuille: 'avant' });
    av.F.origineAppelPoser('a3');
    v('⛔ « avant d\'entrer » est une feuille de passage : l\'origine est la feuille d\'EN DESSOUS (la fiche de la réunion), pas elle', av.D.etat.origineAppel.route.feuille, FEUILLE);
    const av2 = monter(); av2.D.etat.route = route({ feuille: 'avant' }); av2.F.origineAppelPoser('a4');
    v('… sans entrée d\'historique pour l\'indiquer : aucune feuille (jamais « avant »)', av2.D.etat.origineAppel.route.feuille, false);
    const sans = monter(); sans.D.etat.route = route({ conv: 'c_y' }); sans.F.origineAppelPoser('a5');
    v('un départ sans feuille se note aussi (conversation) ; sans identifiant d\'appel, rien', [sans.D.etat.origineAppel.route.conv, (() => { const z = monter(); z.F.origineAppelPoser(''); return z.D.etat.origineAppel; })()], ['c_y', null]);
  }

  console.log('\n2. `origineAppelRetour` : la feuille se rouvre — ou pas');
  async function retour(feuille, o) {
    const x = o || {};
    const m = monter();
    m.D.etat.route = route({ vue: x.vueDepart || 'messages', conv: null, feuille });
    m.F.origineAppelPoser('a1');
    m.D.etat.route = x.arrivee || route({ vue: x.vueDepart || 'messages' });         // la route APRÈS la fermeture de la couche de l'appel
    if (x.avant) x.avant(m);
    m.F.origineAppelRetour(x.id || 'a1', x.visible !== false);
    await dormir(10);
    return m;
  }
  const r1 = await retour(FEUILLE);
  v('⛔ la fiche d\'une réunion d\'où l\'on a appelé se rouvre, sur le même écran (une route POUSSÉE : « retour » ramène à l\'écran d\'avant)', [r1.D.poses.length, r1.D.poses[0] && r1.D.poses[0].feuille, r1.D.poses[0] && r1.D.poses[0].vue], [1, FEUILLE, 'messages']);
  v('   … l\'origine est soldée (mémoire ET rangement de l\'onglet vidés)', [r1.D.etat.origineAppel, r1.D.sessionStorage.m.size], [null, 0]);
  const r2 = await retour('info:h42', { vueDepart: 'appels' });
  v('les détails d\'un appel (feuille « info: »), depuis la liste des appels : se rouvrent', [r2.D.poses.length, r2.D.poses[0] && r2.D.poses[0].feuille, r2.D.poses[0] && r2.D.poses[0].vue], [1, 'info:h42', 'appels']);
  v('une fiche contact se rouvre aussi', (await retour('contact:p_abc')).D.poses.map(r => r.feuille), ['contact:p_abc']);
  const r3 = await retour(FEUILLE, { visible: false });
  v('⛔ l\'appel était RÉDUIT (on était ailleurs, la barre verte) : on n\'y ramène personne — rien ne se rouvre', [r3.D.poses.length, r3.D.etat.origineAppel], [0, null]);
  v('⛔ un sélecteur n\'est pas un écran de départ : « Nouvel appel », « Nouveau groupe », « avant d\'entrer » ne se rouvrent pas', (await Promise.all(['appel', 'chat', 'nouvelle', 'avant'].map(async f => (await retour(f)).D.poses.length))), [0, 0, 0, 0]);
  const r4 = await retour(false);
  v('un départ sans feuille (la liste, une conversation) : rien à rouvrir — l\'historique ramène déjà là', r4.D.poses.length, 0);
  const r5 = await retour(FEUILLE, { arrivee: route({ vue: 'appels' }) });
  v('⛔ l\'écran d\'arrivée n\'est plus le même (on est ailleurs : l\'onglet Appels, alors qu\'on était sur Messages) : on ne tire personne', r5.D.poses.length, 0);
  const r6 = await retour(FEUILLE, { arrivee: route({ conv: 'c_autre' }) });
  v('… une AUTRE conversation que celle de départ : pareil', r6.D.poses.length, 0);
  const r7 = await retour(FEUILLE, { arrivee: route({ feuille: 'info:h1' }) });
  v('une feuille est déjà ouverte à l\'arrivée : on ne la remplace pas', r7.D.poses.length, 0);
  const r8 = await retour(FEUILLE, { avant: (m) => { m.D.etat.appelId = 'a2'; } });
  v('⛔ un AUTRE appel a commencé entre-temps (un appel entrant) : on ne rouvre rien par-dessus', r8.D.poses.length, 0);
  const r9 = await retour(FEUILLE, { id: 'a2' });
  v('⛔ l\'origine d\'un AUTRE appel n\'est ni lue ni effacée (celle du vrai appel reste notée)', [r9.D.poses.length, r9.D.etat.origineAppel && r9.D.etat.origineAppel.id], [0, 'a1']);
  const r10 = await (async () => { const m = monter(); m.D.sessionStorage.m.set('opmsg-origine-appel', JSON.stringify({ id: 'a1', route: { vue: 'messages', conv: null, sec: null, feuille: FEUILLE } })); m.D.etat.route = route(); m.F.origineAppelRetour('a1', true); await dormir(10); return m; })();
  v('la mémoire de la page est vide (la page a été rechargée) : l\'origine se relit dans le rangement de l\'onglet', [r10.D.poses.length, r10.D.poses[0] && r10.D.poses[0].feuille], [1, FEUILLE]);
  const r11 = await (async () => { const m = monter(); m.D.sessionStorage.m.set('opmsg-origine-appel', '{pas du json'); m.D.etat.route = route(); let e = null; try { m.F.origineAppelRetour('a1', true); await dormir(10); } catch (x) { e = x; } return [e, m.D.poses.length]; })();
  v('un rangement illisible ne casse rien et ne rouvre rien', r11, [null, 0]);

  console.log('\n3. Qui pose l\'origine, qui l\'efface');
  {
    const m = monter({ source: { demarrerAppel: async () => ({ id: 'a7' }) } });
    m.D.etat.route = route({ conv: null, feuille: FEUILLE });
    const ok = await m.F.lancerAppel({ membres: ['p_x'], video: false }, null, true, null);
    v('⛔ `lancerAppel` depuis une feuille : l\'origine (la feuille) est posée AVANT que la feuille soit remplacée par la couche de l\'appel', [ok, m.D.etat.origineAppel && m.D.etat.origineAppel.id, m.D.etat.origineAppel && m.D.etat.origineAppel.route.feuille, m.D.remplaces.length, m.D.remplaces[0] && m.D.remplaces[0].appel], [true, 'a7', FEUILLE, 1, 'a7']);
    const n = monter({ source: { demarrerAppel: async () => ({ id: 'a8' }) } });
    n.D.etat.route = route({ conv: 'c_x' });
    await n.F.lancerAppel({ membres: ['p_x'], video: false }, null, false, null);
    v('depuis une conversation (pas de feuille) : l\'origine est la conversation, la couche est POUSSÉE', [n.D.etat.origineAppel && n.D.etat.origineAppel.route.conv, n.D.etat.origineAppel && n.D.etat.origineAppel.route.feuille, n.D.poses.length], ['c_x', false, 1]);
    const ref = monter({ source: { demarrerAppel: async () => { throw new Error('refus'); } } });
    ref.D.etat.route = route({ feuille: FEUILLE });
    const ko = await ref.F.lancerAppel({ membres: ['p_x'] }, null, true, null);
    v('un appel qui ne part pas (refus du service) ne note rien — aucune origine orpheline', [ko, ref.D.etat.origineAppel], [false, null]);
    const e = monter(); e.D.etat.route = route({ conv: 'c_x', feuille: FEUILLE });
    e.F.surAppelEntrant('a9');
    v('⛔ un appel qui ARRIVE pendant qu\'une feuille est ouverte : l\'origine est notée, la feuille remplacée par la couche de l\'appel', [e.D.etat.origineAppel && e.D.etat.origineAppel.id, e.D.etat.origineAppel && e.D.etat.origineAppel.route.feuille, e.D.remplaces.length], ['a9', FEUILLE, 1]);
    const c = monter({ source: { conversationPour: async () => ({ id: 'c_z' }) }, entree: () => null });
    c.D.etat.origineAppel = { id: 'a1', route: { vue: 'messages', conv: null, sec: null, feuille: FEUILLE } }; c.D.sessionStorage.m.set('opmsg-origine-appel', '{}');
    await c.F.ouvrirConversationAvec(['p_x'], null);
    v('⛔ « Message » / « Revenir à la conversation » EFFACE l\'origine : aller à la conversation est un choix, le raccrochage qui suit ne rouvre pas la fiche', [c.D.etat.origineAppel, c.D.sessionStorage.m.size, c.D.remplaces.length], [null, 0, 1]);
    const c2 = monter({ source: { conversationPour: async () => null }, mot: () => {} });
    c2.D.etat.origineAppel = { id: 'a1', route: { vue: 'messages', conv: null, sec: null, feuille: FEUILLE } };
    await c2.F.ouvrirConversationAvec(['p_x'], null);
    vrai('… mais une conversation qui ne s\'ouvre pas ne l\'efface pas (rien n\'a changé d\'écran)', c2.D.etat.origineAppel !== null);
  }

  console.log('\n3 bis. Le module de données range (les trois gestes de `source-serveur.js`, les vrais, sur un faux stockage d\'onglet)');
  {
    vrai('(population) les trois gestes sont extraits du module de données', CODE_SOURCE.length > 100 && /origineAppelNoter/.test(CODE_SOURCE) && /origineAppelLire/.test(CODE_SOURCE) && /origineAppelEffacer/.test(CODE_SOURCE));
    const st = stockage(false), so = fabriqueSource(st);
    const o = { id: 'a1', route: { vue: 'appels', conv: null, sec: null, feuille: 'info:h1' } };
    so.origineAppelNoter(o);
    v('une route se range sous UNE clé de l\'onglet, et se relit pour le bon appel', [Array.from(st.m.keys()), so.origineAppelLire('a1')], [['opmsg-origine-appel'], o]);
    v('⛔ la note d\'un AUTRE appel ne se relit pas pour celui-ci', so.origineAppelLire('a2'), null);
    so.origineAppelNoter({ id: 'a1', route: { vue: 'appels', feuille: 'info:h1', contenu: 'secret', conv: 'c_x'.repeat(1) }, message: 'jamais rangé' });
    v('⛔ on ne range qu\'une ROUTE (vue, conversation, rubrique, feuille) : aucun autre champ ne passe', Object.keys(JSON.parse(st.m.get('opmsg-origine-appel')).route).sort().concat(Object.keys(JSON.parse(st.m.get('opmsg-origine-appel'))).sort()), ['conv', 'feuille', 'sec', 'vue', 'id', 'route']);
    so.origineAppelEffacer();
    v('effacer vide le rangement', [st.m.size, so.origineAppelLire('a1')], [0, null]);
    so.origineAppelNoter(o); so.origineAppelNoter(null);
    v('noter `null` efface aussi (jamais une note orpheline)', st.m.size, 0);
    st.m.set('opmsg-origine-appel', '{pas du json');
    v('un rangement illisible se lit « rien », sans exception', so.origineAppelLire('a1'), null);
    const refus = fabriqueSource(stockage(true));
    let leve = null; try { refus.origineAppelNoter(o); refus.origineAppelEffacer(); } catch (e) { leve = e; }
    v('⛔ un stockage qui REFUSE (mode privé, plein) ne casse rien : ni noter ni effacer ne jettent', [leve, refus.origineAppelLire('a1')], [null, null]);
    const sans = fabriqueSource(undefined);
    v('sans stockage du tout (un navigateur qui n\'en a pas) : rien ne jette, rien ne se relit', (() => { let e = null; try { sans.origineAppelNoter(o); sans.origineAppelEffacer(); } catch (x) { e = x; } return [e, sans.origineAppelLire('a1')]; })(), [null, null]);
    vrai('⛔ la PAGE n\'écrit sur aucun stockage elle-même (`test-856`) : le mot ne figure pas dans son code', !/sessionStorage|localStorage/.test(P.JS));
  }

  console.log('\n4. `quitterAppel` solde l\'origine en sachant si l\'écran d\'appel était visible');
  const JS = P.JS, qa = P.decl('function quitterAppel(');
  vrai('`visible` est lu AVANT que l\'état de l\'appel soit défait (`appelReduit` remis à faux), puis passé au retour — après les médias lâchés, avant d\'avertir la source', /const visible = !etat\.appelReduit;/.test(qa) && /origineAppelRetour\(id, visible\);/.test(qa)
    && qa.indexOf('const visible') < qa.indexOf('etat.appelReduit = false') && qa.indexOf('appelLacherMedias(A)') < qa.indexOf('origineAppelRetour(id, visible)') && qa.indexOf('origineAppelRetour(id, visible)') < qa.indexOf('source.terminerAppel(id)'));
  vrai('les feuilles qui se rouvrent sont nommées (jamais les sélecteurs) : réunion, détails d\'un appel, contact, infos de conversation, personne, événement', /FEUILLES_RETOUR = \['reunion', 'info', 'contact', 'convinfo', 'personne', 'evenement'\]/.test(JS));
  fin();
})().catch((e) => { console.error('✗ le banc est mort :', e && e.stack || e); process.exit(1); });
