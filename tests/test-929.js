/* ⛔ CE QUE CE FICHIER GARDE — PERSO / PRO : DE QUEL CÔTÉ EST CHAQUE CONVERSATION, ET LE CÔTÉ OÙ L'ON TRAVAILLE (famille 3 : le VRAI service, en HTTP ; la base ouverte à côté
   pour poser un espace et ses membres, comme test-961).

   7 octobre 2026 : « ça serait bien d'avoir un bouton pour basculer de perso à pro, et le nom OP MESSAGES PRO quand on est en pro ». Le service dit, pour chaque conversation de
   MA liste (migration 20, `membre.cote`) :
     · `cote_auto` — un canal (il appartient à un espace) est Pro ; une directe ou un groupe est Pro quand TOUS les autres membres actifs sont des collègues (un espace en commun
       avec moi) ; le reste est Perso. Vu par CHACUN : le même groupe peut être Pro chez l'une et Perso chez l'autre ;
     · `cote_choisi` — rangé à la main par moi ('perso' | 'pro'), une directe ou un groupe seulement ; `null` rend l'automatique ; ⛔ ce que je range ne change rien chez les autres ;
     · `cote` — celui qui vaut ;
   et le côté où l'on travaille est une préférence du COMPTE (`prefs.mode`), une valeur parmi 'perso' | 'pro', rien d'autre — comme `confirmer_envoi` ('jamais' | 'groupes' |
   'partout'). ⛔ Une préférence ne se lit pas chez les autres (la fiche d'une personne n'en dit rien). */
'use strict';
const path = require('path');
const crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;

(async () => {
  const svc = await T.lancerService({});
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: JOUR }); c.poserCookie(j); c.moi = p; return c; };
  const entrer = (espace, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: espace, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid }); };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan');
    const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan);
    /* Ana, Ben et Dan sont collègues (un espace) ; Cléo est une amie d'Ana (un contact), d'aucun espace */
    const E = S.espaceCreer({ nom: 'ESPACEZXCOTEBANC', proprio: ana.id }).id;
    entrer(E, ana.id, ben.id); entrer(E, ana.id, dan.id);
    { const l = await a.post('/api/contacts/lien', {}); await c.post('/api/liens/accepter', { code: l.j.code }); }
    { const l = await a.post('/api/contacts/lien', {}); await b.post('/api/liens/accepter', { code: l.j.code }); }
    vrai('population : un espace à trois (Ana, Ben, Dan), Cléo contact d\'Ana seulement', S.espaceMembresN(E) === 3);
    const directe = async (x, y) => (await x.post('/api/conversations/directe', { uid: y.moi.id })).j.conversation.id;
    const AB = await directe(a, b), AC = await directe(a, c);
    const G1 = (await a.post('/api/conversations/groupe', { nom: 'Équipe', membres: [ben.id, dan.id] })).j.conversation.id;
    const G2 = (await a.post('/api/conversations/groupe', { nom: 'Mélange', membres: [ben.id, cleo.id] })).j.conversation.id;
    const K = S.canalCreer({ espace: E, par: ana.id, nom: 'général', prive: false }).id;
    const cid = () => 'cid-' + crypto.randomBytes(6).toString('hex');
    for (const conv of [AB, AC]) await a.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte: 'Bonjour' });   // une directe paraît chez l'autre dès qu'on y écrit
    const liste = async (P) => (await P.get('/api/conversations')).j.conversations || [];
    const cote = async (P, conv) => { const x = (await liste(P)).find(y => y.id === conv); return x ? [x.cote_auto, x.cote_choisi, x.cote] : null; };

    console.log('\n1. Le côté automatique, vu par chacun');
    v('Ana : la directe avec Ben (collègue) est Pro, celle avec Cléo (amie) est Perso', [await cote(a, AB), await cote(a, AC)], [['pro', null, 'pro'], ['perso', null, 'perso']]);
    v('Ana : « Équipe » (Ben, Dan : deux collègues) est Pro ; « Mélange » (Ben et Cléo) est Perso — un seul membre hors de mes espaces suffit', [await cote(a, G1), await cote(a, G2)], [['pro', null, 'pro'], ['perso', null, 'perso']]);
    v('le canal de l\'espace est Pro (il appartient à l\'entreprise)', await cote(a, K), ['pro', null, 'pro']);
    v('⛔ vu par CHACUN : chez Ben, « Mélange » (Ana collègue, Cléo inconnue) est Perso, la directe avec Ana est Pro ; chez Cléo, la directe avec Ana est Perso', [await cote(b, G2), await cote(b, AB), await cote(c, AC)], [['perso', null, 'perso'], ['pro', null, 'pro'], ['perso', null, 'perso']]);
    vrai('population : chaque conversation de la liste d\'Ana porte ses trois champs (5 conversations)', (await liste(a)).length === 5 && (await liste(a)).every(x => ['perso', 'pro'].includes(x.cote_auto) && (x.cote_choisi === null || ['perso', 'pro'].includes(x.cote_choisi)) && x.cote === (x.cote_choisi || x.cote_auto)));

    console.log('\n2. Ranger à la main : une directe ou un groupe, pour soi seul');
    const prefs = (P, conv, corps) => P.post('/api/conversations/' + conv + '/prefs', corps);
    let r = await prefs(a, AC, { cote: 'pro' });
    v('Ana range Cléo dans Pro : 200, son côté vaut Pro, l\'automatique reste Perso', [r.code, await cote(a, AC)], [200, ['perso', 'pro', 'pro']]);
    v('⛔ chez Cléo, rien ne change (Perso)', await cote(c, AC), ['perso', null, 'perso']);
    r = await prefs(a, G1, { cote: 'perso' });
    v('Ana range « Équipe » dans Perso : son côté vaut Perso', [r.code, await cote(a, G1)], [200, ['pro', 'perso', 'perso']]);
    v('⛔ chez Ben, « Équipe » reste Pro (automatique)', await cote(b, G1), ['pro', null, 'pro']);
    r = await prefs(a, G1, { cote: null });
    v('`null` rend le côté automatique', [r.code, await cote(a, G1)], [200, ['pro', null, 'pro']]);
    const refus = async (conv, corps) => { const x = await prefs(a, conv, corps); return [x.code, x.j && x.j.error]; };
    v('⛔ une valeur hors de « perso » | « pro » est refusée (400) : « travail », un booléen, un nombre, une majuscule', [await refus(AC, { cote: 'travail' }), await refus(AC, { cote: true }), await refus(AC, { cote: 1 }), await refus(AC, { cote: 'Pro' })], [[400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
    v('⛔ un canal ne se range pas : il est Pro par nature (400), et rien n\'a bougé', [await refus(K, { cote: 'perso' }), await cote(a, K)], [[400, 'champ_invalide'], ['pro', null, 'pro']]);
    v('⛔ une conversation dont on n\'est pas membre : 404 (Cléo ne range pas « Équipe »)', (await prefs(c, G1, { cote: 'perso' })).code, 404);
    v('la valeur refusée n\'a rien écrit (Cléo toujours rangée Pro chez Ana)', await cote(a, AC), ['perso', 'pro', 'pro']);

    console.log('\n3. Un collègue qui quitte l\'espace : l\'automatique suit, le choix à la main reste');
    r = await b.post('/api/espaces/' + E + '/quitter', {});
    v('population : Ben quitte l\'espace', [r.code, S.espaceMembresN(E)], [200, 2]);
    v('chez Ana : la directe avec Ben devient Perso (plus collègue), « Équipe » aussi (Ben n\'est plus de mes espaces)', [await cote(a, AB), await cote(a, G1)], [['perso', null, 'perso'], ['perso', null, 'perso']]);
    v('…le rangement à la main de Cléo, lui, tient (Pro)', await cote(a, AC), ['perso', 'pro', 'pro']);

    console.log('\n4. Le côté où l\'on travaille : une préférence du compte, à choix');
    const maj = (P, p) => P.post('/api/moi/maj', { prefs: p });
    r = await maj(a, { mode: 'pro' });
    v('Ana choisit Pro : 200, le compte le garde (relu par /api/moi)', [r.code, r.j.moi.prefs.mode, (await a.get('/api/moi')).j.moi.prefs.mode], [200, 'pro', 'pro']);
    r = await maj(a, { presence: false });
    v('une autre préférence posée ensuite ne l\'efface pas', [r.code, r.j.moi.prefs.mode, r.j.moi.prefs.presence], [200, 'pro', false]);
    await maj(a, { presence: true });
    const refusMoi = async (p) => { const x = await maj(a, p); return [x.code, x.j && x.j.error]; };
    v('⛔ une valeur hors du choix est refusée (400) : mode « travail », un booléen, null ; confirmer_envoi « toujours »', [await refusMoi({ mode: 'travail' }), await refusMoi({ mode: true }), await refusMoi({ mode: null }), await refusMoi({ confirmer_envoi: 'toujours' })], [[400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide'], [400, 'champ_invalide']]);
    v('…et rien n\'a changé (toujours Pro)', (await a.get('/api/moi')).j.moi.prefs.mode, 'pro');
    r = await maj(a, { mode: 'perso', confirmer_envoi: 'groupes' });
    v('Perso, et la confirmation avant d\'envoyer « groupes » : acceptés ensemble', [r.code, r.j.moi.prefs.mode, r.j.moi.prefs.confirmer_envoi], [200, 'perso', 'groupes']);
    v('les trois valeurs de confirmer_envoi passent', [(await maj(a, { confirmer_envoi: 'jamais' })).code, (await maj(a, { confirmer_envoi: 'partout' })).code, (await maj(a, { confirmer_envoi: 'groupes' })).code], [200, 200, 200]);
    /* l'Agenda au mois (8 octobre 2026) : la vue retenue par le compte, deux valeurs et rien d'autre */
    v('agenda_vue : « mois » et « semaine » passent, et le compte les rend ; « annee » est refusée (400)', [(await maj(a, { agenda_vue: 'mois' })).j.moi.prefs.agenda_vue, (await maj(a, { agenda_vue: 'semaine' })).j.moi.prefs.agenda_vue, await refusMoi({ agenda_vue: 'annee' })], ['mois', 'semaine', [400, 'champ_invalide']]);
    const fiche = await d.get('/api/personnes/' + ana.id);
    v('⛔ la fiche d\'Ana vue par Dan (un collègue) ne dit rien de ses préférences', [fiche.code, 'prefs' in (fiche.j.personne || {}), JSON.stringify(fiche.j).includes('groupes')], [200, false, false]);

    console.log('\n5. La base');
    const db = new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
    try { v('le schéma est à jour (migration 20 au moins), la colonne `membre.cote` porte le rangement d\'Ana', [db.prepare('PRAGMA user_version').get().user_version >= 20, db.prepare('SELECT cote FROM membre WHERE conv = ? AND uid = ?').get(AC, ana.id).cote], [true, 'pro']); } finally { db.close(); }
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally {
    try { S.fermer(); } catch (x) { /* déjà fermé */ }
    await svc.arreter();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
