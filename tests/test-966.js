/* test-966 — OP MESSAGES : LA LÉGENDE SOUS LES PHOTOS, « COMME WHATSAPP » (6 octobre 2026).
 *
 * Justin : « quand j'envoie une photo, il faudrait pouvoir mettre un texte en dessous, comme WhatsApp ». Une photo porte désormais une
 * LÉGENDE facultative, dans le MÊME message (un envoi, pas deux). Ce banc lance le VRAI service (127.0.0.1) et garde :
 *   · une photo avec légende : relue telle quelle par l'autre, scellée sur le disque (jamais en clair) ;
 *   · sans légende, vide ou faite d'invisibles : une photo sans texte, comme avant ;
 *   · une légende trop longue : 413 ; un texte sur un vocal ou un fichier : 400 (ils n'en portent pas) ;
 *   · l'aperçu de la liste dit « 📷 la légende » (et « Photo » sans légende) ;
 *   · la légende se MODIFIE comme un message ; un vocal, non ;
 *   · et le vrai `source-serveur.js` (contre le vrai service) l'envoie et la rend dans la vue du message.
 */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const C = T.compteur(), v = C.v, vrai = C.vrai;
const PNG = F.png();
const LOGINS = ['alice', 'bruno'];
const COMPTES = () => Object.fromEntries(LOGINS.map(l => [l, { pass: 'pw-' + l + '-1234', nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }]));
const aleatoire = () => crypto.randomBytes(6).toString('hex');

(async () => {
  let svc = null, og = null;
  try {
    og = await T.fauxOpGestion(COMPTES());
    svc = await T.lancerService({ urlGestion: og.url, config: { quotas: { piece: { max: 100000, fenetreMs: 3600000 } } } });
    const compte = (login) => T.connecter(svc, og, login, 'pw-' + login + '-1234');
    const A = await compte('alice'), B = await compte('bruno');
    const l = await A.post('/api/contacts/lien', { max: 1 }); await B.post('/api/liens/accepter', { code: l.j.code });
    const conv = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
    const envoyer = (c, corps) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'cid-' + aleatoire() }, corps));
    const photo = async () => { const d = await F.deposer(A, { conv, genre: 'photo', corps: PNG }); if (d.code !== 201) throw new Error('dépôt refusé ' + d.code); return d.j.id; };
    const lireMsgs = async (c) => (await c.get('/api/conversations/' + conv + '/messages')).j.messages;
    const apercu = async (c) => ((await c.get('/api/conversations')).j.conversations.find(x => x.id === conv) || {}).apercu;

    console.log('\n── 966 · une photo, sa légende ──');
    const LEG = 'Le compteur du local technique — relevé ce matin';
    let r = await envoyer(A, { type: 'photo', pieces: [{ id: await photo(), w: 8, h: 8 }], texte: LEG });
    v('la photo légendée part (201)', r.code, 201);
    const seqLeg = r.j.seq;
    let m = (await lireMsgs(B)).find(x => x.seq === seqLeg);
    v('⛔ l\'autre la relit : une photo, ET sa légende, dans le même message', [m && m.type, m && m.texte, m && m.meta && m.meta.pieces && m.meta.pieces.length], ['photo', LEG, 1]);
    v('l\'aperçu de la liste dit « 📷 la légende »', (await apercu(B)).texte, '📷 ' + LEG);
    const brut = fs.readFileSync(path.join(svc.data, 'msg.db'));
    vrai('⛔ la légende est SCELLÉE : elle n\'est nulle part en clair dans la base', brut.indexOf(Buffer.from('relevé ce matin')) < 0 && brut.indexOf(Buffer.from('compteur du local')) < 0);

    console.log('\n── 966 · sans légende : comme avant ──');
    for (const [texte, quoi] of [[undefined, 'absente'], ['', 'vide'], ['   \n  ', 'faite d\'espaces'], ['​​', 'faite d\'invisibles'], [null, 'nulle']]) {
      r = await envoyer(A, Object.assign({ type: 'photo', pieces: [{ id: await photo(), w: 8, h: 8 }] }, texte === undefined ? {} : { texte }));
      m = (await lireMsgs(B)).find(x => x.seq === r.j.seq);
      v('légende ' + quoi + ' : une photo sans texte', [r.code, m && (m.texte === null || m.texte === undefined)], [201, true]);
    }
    v('l\'aperçu dit « Photo » (sans légende)', (await apercu(B)).texte, 'Photo');

    console.log('\n── 966 · ce qui est refusé ──');
    r = await envoyer(A, { type: 'photo', pieces: [{ id: await photo(), w: 8, h: 8 }], texte: 'x'.repeat(8001) });
    v('⛔ une légende de plus de 8 000 signes : 413', r.code, 413);
    r = await envoyer(A, { type: 'photo', pieces: [{ id: await photo(), w: 8, h: 8 }], texte: 42 });
    v('⛔ une légende qui n\'est pas un texte : 400', r.code, 400);
    const dv = await F.deposer(A, { conv, genre: 'vocal', corps: F.webm(2000) });
    r = await envoyer(A, { type: 'vocal', piece: dv.j.id, dur: 2, bars: [5, 9], texte: 'un texte sur un vocal' });
    v('⛔ un texte sur un vocal : 400 (seule une photo porte une légende)', r.code, 400);
    r = await envoyer(A, { type: 'vocal', piece: dv.j.id, dur: 2, bars: [5, 9] });
    v('   le même vocal, sans texte, part', r.code, 201);
    const seqVocal = r.j.seq;

    console.log('\n── 966 · la légende se modifie ──');
    r = await A.post('/api/conversations/' + conv + '/messages/modifier', { seq: seqLeg, texte: 'Le compteur — corrigé' });
    v('modifier la légende : 200', r.code, 200);
    m = (await lireMsgs(B)).find(x => x.seq === seqLeg);
    v('   l\'autre lit la nouvelle légende, marquée modifiée, sur la même photo', [m.texte, !!m.modifie, m.type], ['Le compteur — corrigé', true, 'photo']);
    r = await A.post('/api/conversations/' + conv + '/messages/modifier', { seq: seqVocal, texte: 'non' });
    v('⛔ un vocal ne se modifie pas : 409 type_invalide', [r.code, r.j && r.j.error], [409, 'type_invalide']);
    r = await A.post('/api/conversations/' + conv + '/messages/modifier', { seq: seqLeg, texte: '   ' });
    m = (await lireMsgs(B)).find(x => x.seq === seqLeg);
    v('retirer la légende (un texte vide) : 200, la photo reste, sans texte', [r.code, m.type, m.texte === null || m.texte === undefined], [200, 'photo', true]);
    const t1 = await envoyer(A, { texte: 'un message texte' });
    r = await A.post('/api/conversations/' + conv + '/messages/modifier', { seq: t1.j.seq, texte: '' });
    v('⛔ un message TEXTE ne se vide pas : 400', r.code, 400);
    r = await envoyer(A, { type: 'photo', pieces: [{ id: await photo(), w: 8, h: 8 }], texte: 'y'.repeat(20000) });
    v('⛔ une légende démesurée : 413, comme un message', r.code, 413);
    r = await B.post('/api/conversations/' + conv + '/messages/modifier', { seq: seqLeg, texte: 'pas à moi' });
    v('⛔ la légende d\'un autre ne se modifie pas', r.code >= 400, true);

    console.log('\n── 966 · la vraie source de la page ──');
    const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
    const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));
    const nav = T.navigateur(svc.base);
    const source = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, attenteEnvoi: () => 120, delaiRelireMs: 5 });
    await source.connexion('alice', 'pw-alice-1234');
    vrai('population : la vraie source de la page est connectée', (await source.demarrer()).connecte === true);
    await source.ouvrir(conv);
    await source.envoyer(conv, { photos: [{ blob: new Blob([PNG], { type: 'image/png' }), url: 'blob:banc', w: 8, h: 8 }], texte: '  Vue de la source  ' });
    m = (await lireMsgs(B)).slice(-1)[0];
    v('⛔ la source envoie photo ET légende en UN message (légende rognée)', [m.type, m.texte], ['photo', 'Vue de la source']);
    const vue = await source.ouvrir(conv);
    const derniere = vue && vue.messages ? vue.messages.slice(-1)[0] : null;
    v('   et la vue du message rend la légende avec la photo', [derniere && !!derniere.photos, derniere && derniere.texte], [true, 'Vue de la source']);
    await source.envoyer(conv, { photos: [{ blob: new Blob([PNG], { type: 'image/png' }), url: 'blob:banc', w: 8, h: 8 }], texte: '   ' });
    m = (await lireMsgs(B)).slice(-1)[0];
    v('   une légende faite d\'espaces ne part pas : une photo sans texte', [m.type, m.texte === null || m.texte === undefined], ['photo', true]);
    try { source.deconnexion && await source.deconnexion(); } catch (e) { /* fin du banc */ }
  } catch (e) { C.ko++; console.log('  ✗ exception : ' + (e && e.stack || e)); }
  finally { if (svc) await svc.arreter(); if (og) try { await og.fermer(); } catch (e) {} }
  C.fin();
})();
