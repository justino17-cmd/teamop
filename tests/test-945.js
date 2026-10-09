/* ⛔ CE QUE CE FICHIER GARDE — TRANSFÉRER UN MESSAGE (9 octobre 2026 : l'inventaire d'OP MESSAGES — « Transférer » manquait), PAR LA VRAIE ROUTE ET LE VRAI SERVICE.

   POST /api/conversations/:id/messages/transferer  { seq, vers: [1 à 5 conversations], cid } :
     · un TEXTE, une photo avec sa LÉGENDE, un VOCAL, un FICHIER, une fiche de contact arrivent dans chaque destination, marqués « Transférés » (`meta.tr`), au nom de celui qui transfère ;
     · ⛔ UNE PIÈCE SE RECOPIE : dans la destination, une NOUVELLE pièce (autre identifiant), lisible par ses membres, scellée sur le disque avec SA clé — les octets identiques ; la pièce
       d'origine reste illisible pour qui n'est pas de la conversation d'origine ; la copie compte dans le quota de celui qui transfère ;
     · ⛔ CE QUI NE SE TRANSFÈRE PAS : un message système, un sondage, une POSITION (celle de quelqu'un : elle ne circule pas sans lui), un message que je ne vois pas (masqué pour moi,
       supprimé, d'avant mon arrivée, d'une conversation dont je ne suis pas membre) — 404 comme un message qui n'existe pas ;
     · chaque destination est jugée SEULE avec les règles d'un envoi : une conversation dont je ne suis pas membre (404), un groupe d'annonces (403), une invitation qui attend (du texte seul) —
       les autres partent quand même ; aucune ne passe → le refus de la première ;
     · le corps piégé (pas de destination, six, un doublon, un identifiant mal formé, un `seq` qui n'en est pas un) → 400, rien d'écrit ;
     · ⛔ UN RENVOI (même `cid`, réponse perdue) ne double rien ET ne recopie rien (le nombre de pièces ne bouge pas) ;
     · le plafond des messages compte chaque destination ; le quota de stockage refuse une copie qui ne tient plus (402 → la destination le dit), sans laisser de pièce derrière ;
     · (relecture adverse du 9 octobre) le renvoi d'une PHOTO ne recopie rien ; deux envois SIMULTANÉS du même geste ne font qu'un message et qu'une copie ; un transféré ne se
       modifie pas (texte ni légende) ; une copie ne vit pas plus longtemps que l'original ; une fiche ne part pas vers une invitation qui attend ; un message d'avant mon arrivée,
       supprimé pour tous ou échu ne se transfère pas ; et la COUTURE — les vraies `api.js` et `source-serveur.js` contre ce service : les raisons par destination (avec leur
       phrase), même quand toutes refusent, le même `cid` d'un essai à l'autre, et « Transféré » lu chez qui le reçoit.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
let ipN = 60; const ip = () => '198.51.100.' + (ipN++);
const cid = (p) => 'cid-' + p + '-' + crypto.randomBytes(5).toString('hex');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));

(async () => {
  const noms = ['ana', 'ben', 'cleo', 'dan', 'eve'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-12345', nom: n[0].toUpperCase() + n.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, config: { pieces: { quotaPersonne: 3 * 1048576 } } });
  const lire = () => T.lireBase(path.join(svc.data, 'msg.db'));
  const compte = (sql, ...p) => { const d = lire(); try { return d.prepare(sql).get(...p).n; } finally { d.close(); } };
  const ligne = (sql, ...p) => { const d = lire(); try { return d.prepare(sql).get(...p); } finally { d.close(); } };
  /* une écriture DIRECTE dans la base (le service tourne en WAL) : seulement pour poser une échéance passée, qu'aucune route ne sait poser */
  const ecrireBase = (sql, ...p) => { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(path.join(svc.data, 'msg.db')); try { d.prepare(sql).run(...p); } finally { d.close(); } };
  try {
    const P = {};
    for (const n of noms) P[n] = await T.connecter(svc, og, n, 'pw-' + n + '-12345', ip());
    const relier = async (a, b) => { const l = await P[a].post('/api/contacts/lien', {}); return P[b].post('/api/liens/accepter', { code: l.j.code }); };
    for (const n of ['ben', 'cleo', 'dan']) await relier('ana', n);
    await relier('ben', 'cleo');
    await P.ana.post('/api/moi/confidentialite', { position: true });
    const envoyer = (c, conv, corps) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid('m') }, corps));
    const transferer = (c, conv, seq, vers, c2) => c.post('/api/conversations/' + conv + '/messages/transferer', { seq, vers, cid: c2 || cid('t') });
    const messagesDe = async (c, conv) => ((await c.get('/api/conversations/' + conv + '/messages')).j.messages || []);
    const dernier = async (c, conv) => (await messagesDe(c, conv)).filter(m => m.type !== 'systeme').slice(-1)[0];

    /* la source : un groupe Ana / Ben / Cléo ; les destinations : la directe Ana–Dan, un groupe Ana–Cléo–Ben « Équipe », un groupe d'annonces de Ben où Ana n'est que membre */
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
    const D = (await P.ana.post('/api/conversations/directe', { uid: P.dan.moi.id })).j.conversation.id;
    await envoyer(P.ana, D, { texte: 'Salut Dan' }); await envoyer(P.dan, D, { texte: 'Salut' });
    const E = (await P.ana.post('/api/conversations/groupe', { nom: 'Équipe', membres: [P.cleo.moi.id] })).j.conversation.id;
    const A = (await P.ben.post('/api/conversations/groupe', { nom: 'Annonces', membres: [P.ana.moi.id, P.cleo.moi.id], annonces_seules: true })).j.conversation.id;
    v('population : quatre conversations prêtes (la source, une directe, un groupe, un groupe d\'annonces)', [!!G, !!D, !!E, !!A], [true, true, true, true]);

    console.log('Un TEXTE : il arrive dans chaque destination, marqué « Transféré », au nom de celui qui transfère');
    {
      const s = (await envoyer(P.ben, G, { texte: 'Le portail est fermé à 18 h' })).j.seq;
      const r = await transferer(P.ana, G, s, [D, E]);
      v('200, deux résultats réussis', [r.code, r.j.resultats.map(x => [x.conv === D || x.conv === E, x.ok])], [200, [[true, true], [true, true]]]);
      const md = await dernier(P.dan, D), me = await dernier(P.cleo, E);
      v('Dan le lit : le même texte, auteur Ana (celui qui transfère, pas Ben), marqué transféré (`meta.tr`)', [md.texte, md.auteur === P.ana.moi.id, md.meta && md.meta.tr], ['Le portail est fermé à 18 h', true, 1]);
      v('Cléo aussi, dans « Équipe »', [me.texte, me.meta && me.meta.tr], ['Le portail est fermé à 18 h', 1]);
      const avant = compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D), c2 = cid('t');
      await transferer(P.ana, G, s, [D], c2);
      const ren = await transferer(P.ana, G, s, [D], c2);
      v('⛔ un RENVOI du même geste (même cid) ne double rien — population : le premier envoi a bien écrit une ligne', [compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D) - avant, ren.code, ren.j.resultats[0].deja], [1, 200, true]);
      const reTr = await transferer(P.dan, D, md.seq, [D]);
      v('un message transféré se retransfère (Dan dans sa directe) : marqué transféré une fois, pas « transféré de transféré »', [reTr.code, (await dernier(P.ana, D)).meta], [200, { tr: 1 }]);
    }

    console.log('\nUne PHOTO avec sa légende, un VOCAL, un FICHIER : la pièce se RECOPIE (nouvel identifiant, mêmes octets, lisible dans la destination)');
    {
      const img = F.png({ w: 24, h: 16 });
      const p = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: img });
      const s = (await envoyer(P.ben, G, { type: 'photo', pieces: [{ id: p.j.id, w: 24, h: 16 }], texte: 'La façade' })).j.seq;
      const avant = compte('SELECT COUNT(*) AS n FROM piece');
      const r = await transferer(P.ana, G, s, [D]);
      const md = await dernier(P.dan, D), nouv = md.meta && md.meta.pieces && md.meta.pieces[0];
      v('la photo arrive chez Dan avec sa légende, ses dimensions, marquée transférée', [r.code, md.type, md.texte, nouv && [nouv.w, nouv.h], md.meta.tr], [200, 'photo', 'La façade', [24, 16], 1]);
      vrai('⛔ c\'est une NOUVELLE pièce (autre identifiant), une ligne de plus dans la base', !!nouv && nouv.id !== p.j.id && compte('SELECT COUNT(*) AS n FROM piece') === avant + 1);
      const lu = await F.lirePiece(P.dan, nouv.id), luSrc = await F.lirePiece(P.ben, p.j.id);
      v('⛔ Dan la LIT (200), octets identiques à l\'original tel que le service l\'a rangé', [lu.code, Buffer.compare(lu.buf, luSrc.buf)], [200, 0]);
      v('⛔ … mais l\'original reste illisible pour Dan (il n\'est pas du « Chantier ») : 404', (await F.lirePiece(P.dan, p.j.id)).code, 404);
      v('la copie appartient à Ana (elle compte dans SON quota), rattachée à la directe', (() => { const d = lire(); try { return d.prepare('SELECT proprio, conv, attachee IS NOT NULL AS att FROM piece WHERE id = ?').get(nouv.id); } finally { d.close(); } })(), { proprio: P.ana.moi.id, conv: D, att: 1 });
      const fs = require('fs');
      const brutSrc = fs.readFileSync(path.join(svc.data, 'pieces', p.j.id.slice(2, 4), p.j.id)), brutNouv = fs.readFileSync(path.join(svc.data, 'pieces', nouv.id.slice(2, 4), nouv.id));
      v('⛔ sur le disque, la copie est scellée avec SA clé (les octets chiffrés diffèrent de l\'original) — population : les deux fichiers existent, de même taille', [brutSrc.length === brutNouv.length, Buffer.compare(brutSrc.subarray(32), brutNouv.subarray(32)) !== 0], [true, true]);

      const voc = F.webm(4000), pv = await F.deposer(P.ben, { conv: G, genre: 'vocal', corps: voc });
      const sv = (await envoyer(P.ben, G, { type: 'vocal', piece: pv.j.id, dur: 7.5, bars: [10, 50, 90] })).j.seq;
      const rv = await transferer(P.ana, G, sv, [E]);
      const mv = await dernier(P.cleo, E);
      v('un VOCAL : durée et forme d\'onde gardées, nouvelle pièce lisible par Cléo', [rv.code, mv.type, mv.meta.dur, mv.meta.bars, mv.meta.piece !== pv.j.id, (await F.lirePiece(P.cleo, mv.meta.piece)).code], [200, 'vocal', 7.5, [10, 50, 90], true, 200]);

      const doc = F.pdf(3000), pf = await F.deposer(P.ben, { conv: G, genre: 'fichier', corps: doc, nom: 'Devis 42.pdf' });
      const sf = (await envoyer(P.ben, G, { type: 'fichier', piece: pf.j.id })).j.seq;
      const rf = await transferer(P.ana, G, sf, [D]);
      const mf = await dernier(P.dan, D), luf = await F.lirePiece(P.dan, mf.meta.piece);
      v('un FICHIER : son nom gardé, nouvelle pièce, octets identiques', [rf.code, mf.type, mf.meta.nom, mf.meta.piece !== pf.j.id, luf.code, Buffer.compare(luf.buf, doc)], [200, 'fichier', 'Devis 42.pdf', true, 200, 0]);
    }

    console.log('\nUne FICHE de contact se transfère ; une POSITION, un SONDAGE, un message système non');
    {
      await P.cleo.post('/api/moi/confidentialite', { trouvable: 'tous' });
      const fc = await envoyer(P.ana, G, { type: 'contact', uid: P.cleo.moi.id });
      const rc = await transferer(P.ana, G, fc.j.seq, [D]);
      const mc = await dernier(P.dan, D);
      v('la fiche de Cléo arrive chez Dan (relue avec SES droits), marquée transférée — population : la fiche est bien partie dans le Chantier', [fc.code, rc.code, mc.meta && mc.meta.k, mc.meta && mc.meta.tr], [201, 200, 'contact', 1]);
      const pos = await envoyer(P.ana, G, { type: 'position', lat: 46.2, lng: -1.4, precision: 20 });
      const sd = await envoyer(P.ana, G, { type: 'sondage', question: 'Quand ?', choix: ['Lundi', 'Mardi'] });
      const sysSeq = (await messagesDe(P.ana, G)).find(m => m.type === 'systeme').seq;
      const avant = compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D);
      v('⛔ une position (403), un sondage (403), un message système (403) ne se transfèrent pas — population : les trois existent dans le Chantier',
        [pos.code, sd.code, (await transferer(P.ana, G, pos.j.seq, [D])).code, (await transferer(P.ana, G, sd.j.seq, [D])).code, (await transferer(P.ana, G, sysSeq, [D])).code], [201, 201, 403, 403, 403]);
      v('… et rien n\'est arrivé chez Dan', compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D) - avant, 0);
    }

    console.log('\nCe que je ne VOIS pas ne se transfère pas ; chaque destination est jugée seule');
    {
      const s = (await envoyer(P.ben, G, { texte: 'secret de Ben' })).j.seq;
      v('⛔ Eve (pas membre du Chantier) : 404 — la garde de la conversation source', (await transferer(P.eve, G, s, [D])).code, 404);
      await P.ana.post('/api/conversations/' + G + '/messages/supprimer', { seq: s, pour: 'moi' });
      v('⛔ un message masqué « pour moi » : 404 message_inconnu', [(await transferer(P.ana, G, s, [D])).code, (await transferer(P.ana, G, s, [D])).j.error], [404, 'message_inconnu']);
      v('⛔ un seq qui n\'existe pas : 404', (await transferer(P.ana, G, 99999, [D])).code, 404);
      const s2 = (await envoyer(P.ben, G, { texte: 'pour tout le monde' })).j.seq;
      const avA = compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', A);
      const r = await transferer(P.ana, G, s2, [A, D]);
      v('⛔ un groupe d\'annonces (Ana n\'y est pas admin) refuse, la directe reçoit : 200, la liste dit les deux', [r.code, r.j.resultats], [200, [{ conv: A, ok: false, error: 'annonces_seules' }, { conv: D, ok: true, seq: r.j.resultats[1].seq }]]);
      v('… rien n\'est écrit dans les Annonces', compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', A) - avA, 0);
      const Gb = (await P.ben.post('/api/conversations/groupe', { nom: 'Privé Ben', membres: [P.cleo.moi.id] })).j.conversation.id;
      const r2 = await transferer(P.ana, G, s2, [Gb]);
      v('⛔ une conversation dont Ana n\'est pas membre : 404, la liste le dit (pas un mot de plus sur elle)', [r2.code, r2.j.error, r2.j.resultats], [404, 'introuvable', [{ conv: Gb, ok: false, error: 'introuvable' }]]);
    }

    console.log('\nUne INVITATION qui attend n\'accepte que du texte ; le corps piégé est refusé');
    {
      /* Ana partage la fiche de Dan dans le Chantier ; Ben (pas un contact de Dan) lui « Écrit » depuis la fiche : une invitation qui attend (`test-928`) */
      await P.dan.post('/api/moi/confidentialite', { trouvable: 'tous' });
      const fd = await envoyer(P.ana, G, { type: 'contact', uid: P.dan.moi.id });
      const inv = await P.ben.post('/api/contacts/ecrire_carte', { conv: G, seq: fd.j.seq });
      const I = inv.j.conv;
      v('population : Ben écrit à Dan depuis la fiche — invitation envoyée', [inv.code, inv.j.resultat], [200, 'envoyee']);
      const img = F.png({ w: 8, h: 8 }), p = await F.deposer(P.ana, { conv: G, genre: 'photo', corps: img });
      const sp = (await envoyer(P.ana, G, { type: 'photo', pieces: [{ id: p.j.id, w: 8, h: 8 }] })).j.seq;
      const st = (await envoyer(P.ana, G, { texte: 'bonjour' })).j.seq;
      const avantP = compte('SELECT COUNT(*) AS n FROM piece');
      v('⛔ vers une invitation qui attend (Dan n\'a pas accepté) : une photo est refusée (invitation_texte) — et AUCUNE pièce n\'a été recopiée pour rien', [(await transferer(P.ben, G, sp, [I])).j.error, compte('SELECT COUNT(*) AS n FROM piece') - avantP], ['invitation_texte', 0]);
      v('… un texte passe', (await transferer(P.ben, G, st, [I])).code, 200);
      v('⛔ … une FICHE de contact non plus : c\'est une carte, pas du texte (population : la fiche de Dan existe dans le Chantier)', [fd.code, (await transferer(P.ben, G, fd.j.seq, [I])).j.error], [201, 'invitation_texte']);
      const avant = compte('SELECT COUNT(*) AS n FROM message');
      const pieges = [{ seq: st, vers: [], cid: cid('x') }, { seq: st, vers: [D, D], cid: cid('x') }, { seq: st, vers: [D, E, A, I, G, 'c_' + '0'.repeat(32)], cid: cid('x') }, { seq: st, vers: ['pas-un-id'], cid: cid('x') },
        { seq: 'a', vers: [D], cid: cid('x') }, { seq: 0, vers: [D], cid: cid('x') }, { seq: st, vers: [D], cid: '!' }, { seq: st, vers: D, cid: cid('x') }];
      const codes = []; for (const b of pieges) codes.push((await P.ana.post('/api/conversations/' + G + '/messages/transferer', b)).code);
      v('⛔ huit corps piégés (aucune destination, un doublon, six, un identifiant mal formé, seq non entier, seq 0, cid invalide, vers qui n\'est pas une liste) → 400, rien d\'écrit', [codes, compte('SELECT COUNT(*) AS n FROM message') - avant], [pieges.map(() => 400), 0]);
    }

    console.log('\nLes RENVOIS, la MODIFICATION, l\'ÉCHÉANCE (relecture adverse du 9 octobre)');
    /* ⛔ c'est CLÉO qui transfère ici (vers « Équipe ») : ses copies comptent dans SON quota — celui d'Ana sert plus bas au contrôle du stockage plein */
    {
      const img = F.png({ w: 12, h: 12 }), p = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: img });
      const s = (await envoyer(P.ben, G, { type: 'photo', pieces: [{ id: p.j.id, w: 12, h: 12 }] })).j.seq;
      const c3 = cid('t'), av = compte('SELECT COUNT(*) AS n FROM piece');
      const r1 = await transferer(P.cleo, G, s, [E], c3), ap1 = compte('SELECT COUNT(*) AS n FROM piece');
      const r2 = await transferer(P.cleo, G, s, [E], c3);
      v('⛔ le RENVOI d\'une PHOTO (même cid) ne recopie rien — population : le premier transfert a bien ajouté SA copie', [r1.code, ap1 - av, r2.code, r2.j.resultats[0].deja, compte('SELECT COUNT(*) AS n FROM piece') - ap1], [200, 1, 200, true, 0]);

      const doc = F.pdf(150000), pf = await F.deposer(P.ben, { conv: G, genre: 'fichier', corps: doc, nom: 'plan.pdf' });      // petit : le quota de Ben (3 Mo) sert plus bas
      const sf = (await envoyer(P.ben, G, { type: 'fichier', piece: pf.j.id })).j.seq;
      const c4 = cid('t'), avP = compte('SELECT COUNT(*) AS n FROM piece'), avM = compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', E);
      const deux = await Promise.all([transferer(P.cleo, G, sf, [E], c4), transferer(P.cleo, G, sf, [E], c4)]);
      const formes = deux.map(x => x.code === 409 ? 'en_cours:' + x.j.error : x.code === 200 ? (x.j.resultats[0].deja ? 'deja' : 'parti') : 'autre:' + x.code).sort();
      console.log('      (les deux envois : ' + formes.join(' + ') + ')');
      v('⛔ deux envois SIMULTANÉS du même geste : UN message et UNE copie — l\'autre est refusé tant que le premier recopie (409 transfert_en_cours), ou dit « déjà parti »',
        [compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', E) - avM, compte('SELECT COUNT(*) AS n FROM piece') - avP, formes.includes('parti'), formes.every(f => f === 'parti' || f === 'deja' || f === 'en_cours:transfert_en_cours')],
        [1, 1, true, true]);
      const r3 = await transferer(P.cleo, G, sf, [E], c4);
      v('… et une fois le premier fini, le même geste dit « déjà parti »', [r3.code, r3.j.resultats[0].deja], [200, true]);

      const st = (await envoyer(P.ben, G, { texte: 'mot de Ben' })).j.seq;
      const seqT = (await transferer(P.cleo, G, st, [E])).j.resultats[0].seq, seqP = r1.j.resultats[0].seq;
      const mien = (await envoyer(P.cleo, E, { texte: 'mon mot' })).j.seq;
      const modifier = (seq, texte) => P.cleo.post('/api/conversations/' + E + '/messages/modifier', { seq, texte });
      const mm = await modifier(mien, 'mon mot corrigé'), mt = await modifier(seqT, 'mot changé'), mp = await modifier(seqP, 'une légende');
      v('⛔ un message TRANSFÉRÉ ne se modifie pas — ni son texte, ni la légende d\'une photo (409 type_invalide) ; population : Cléo modifie bien un texte à elle',
        [mm.code, mt.code, mt.j.error, mp.code, mp.j.error], [200, 409, 'type_invalide', 409, 'type_invalide']);

      const gf = await F.deposer(P.ben, { conv: G, genre: 'fichier', corps: F.pdf(2000), nom: 'enregistrement.pdf' });
      const sg = await envoyer(P.ben, G, { type: 'fichier', piece: gf.j.id, garder_s: 259200 });
      const rg = await transferer(P.cleo, G, sg.j.seq, [E]);
      const exS = ligne('SELECT expire_ts AS e FROM message WHERE conv = ? AND seq = ?', G, sg.j.seq).e, exC = ligne('SELECT expire_ts AS e FROM message WHERE conv = ? AND seq = ?', E, rg.j.resultats[0].seq).e;
      v('⛔ la copie d\'un fichier « gardé 3 jours » ne vit pas plus longtemps que l\'original — population : l\'original a bien son échéance', [sg.code, rg.code, exS > 0, exC > 0 && exC <= exS], [201, 200, true, true]);
    }

    console.log('\nCe que je ne vois PLUS ne se transfère pas : d\'avant mon arrivée, supprimé pour tous, échu');
    {
      await relier('ana', 'eve');
      const H = (await P.ana.post('/api/conversations/groupe', { nom: 'Arrivée', membres: [P.ben.moi.id] })).j.conversation.id;
      const avantEve = (await envoyer(P.ben, H, { texte: 'avant Eve' })).j.seq;
      const aj = await P.ana.post('/api/conversations/' + H + '/membres/ajouter', { uids: [P.eve.moi.id] });
      const apresEve = (await envoyer(P.ben, H, { texte: 'après Eve' })).j.seq;
      const DE = (await P.eve.post('/api/conversations/directe', { uid: P.ana.moi.id })).j.conversation.id;
      v('⛔ Eve, arrivée après un message, ne le transfère pas (404 message_inconnu) — population : elle transfère bien celui d\'après', [aj.code, (await transferer(P.eve, H, avantEve, [DE])).j.error, (await transferer(P.eve, H, apresEve, [DE])).code], [200, 'message_inconnu', 200]);
      const sup = (await envoyer(P.ben, G, { texte: 'à effacer' })).j.seq;
      const avantSup = (await transferer(P.ana, G, sup, [D])).code;
      await P.ben.post('/api/conversations/' + G + '/messages/supprimer', { seq: sup, pour: 'tous' });
      v('⛔ un message SUPPRIMÉ pour tous ne se transfère plus (404) — population : il se transférait avant', [avantSup, (await transferer(P.ana, G, sup, [D])).code], [200, 404]);
      const ech = (await envoyer(P.ben, G, { texte: 'bientôt échu' })).j.seq;
      ecrireBase('UPDATE message SET expire_ts = 1 WHERE conv = ? AND seq = ?', G, ech);
      v('⛔ un message ÉCHU (son échéance est passée, le balayeur ne l\'a pas encore emporté) ne se transfère pas (404)', (await transferer(P.ana, G, ech, [D])).code, 404);
    }

    console.log('\nLa COUTURE : les VRAIES api.js et source-serveur.js (celles de la page) contre ce service');
    {
      const monter = async (login) => {
        const nav = T.navigateur(svc.base);
        const src = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, delaiRelireMs: 5 });
        await src.connexion(login, 'pw-' + login + '-12345');
        const d = await src.demarrer(); if (!d.connecte) throw new Error('démarrage refusé : ' + JSON.stringify(d));
        return src;
      };
      const sa = await monter('ana'), sd = await monter('dan');
      try {
        v('la source annonce « transferts » (la page n\'offre le geste que là)', sa.capacites.transferts, true);
        const s = (await envoyer(P.ben, G, { texte: 'par la couture' })).j.seq;
        const vue = await sa.ouvrir(G), m = vue && vue.messages.find(x => x.seq === s);
        vrai('population : la vraie source voit le message de Ben dans le Chantier', !!m);
        const cl = 'f'.repeat(32), avD = compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D);
        const r = await sa.transferer(G, m.id, [A, D], cl);
        v('⛔ un échec PARTIEL par la vraie source : chaque destination avec son issue, la phrase du SERVICE pour l\'annonce',
          r.map(x => [x.conv === A ? 'A' : x.conv === D ? 'D' : '?', x.ok, x.error, x.phrase]), [['A', false, 'annonces_seules', 'Seuls les administrateurs peuvent écrire dans ce groupe.'], ['D', true, null, null]]);
        const r2 = await sa.transferer(G, m.id, [D], cl);
        v('⛔ le même identifiant d\'envoi d\'un essai à l\'autre : rien ne part deux fois (population : le premier a écrit UNE ligne chez Dan)', [compte('SELECT COUNT(*) AS n FROM message WHERE conv = ?', D) - avD, r2.map(x => x.ok)], [1, [true]]);
        let jete = null, r3 = null; try { r3 = await sa.transferer(G, m.id, [A]); } catch (e) { jete = e && e.code; }
        v('⛔ TOUTES refusées : la source rend la raison de chacune (avec sa phrase), elle ne jette pas la seule première', [jete, r3 && r3.map(x => [x.ok, x.error, !!x.phrase])], [null, [[false, 'annonces_seules', true]]]);
        let e4 = null; try { await sa.transferer(G, m.id, []); } catch (e) { e4 = e && e.code; }
        v('une liste vide est refusée sur l\'appareil, sans requête', e4, 'invalide');
        const vd = await sd.ouvrir(D), md = vd && vd.messages.filter(x => !x.systeme).slice(-1)[0];
        v('⛔ chez Dan, la vraie source lit « Transféré » (`transfere`) sur le message reçu, au texte de Ben, d\'Ana', [md && md.transfere, md && md.texte, md && md.auteur === P.ana.moi.id], [true, 'par la couture', true]);
        const mien = (await envoyer(P.ana, D, { texte: 'pas transféré' })).j.seq;
        let m2 = null; await T.attendre(async () => { const vd2 = await sd.ouvrir(D); m2 = vd2 && vd2.messages.find(x => x.seq === mien); return !!m2; }, 5000);      // au geste : le message arrive par le flux
        v('… et un message ordinaire ne le porte pas', [!!m2, m2 && m2.transfere], [true, undefined]);
      } finally { try { sa.arreter(); } catch (e) { /* rien */ } try { sd.arreter(); } catch (e) { /* rien */ } }
    }

    console.log('\nLe QUOTA de stockage : une copie qui ne tient plus est refusée, sans rien laisser derrière');
    {
      const gros = F.pdf(1300000);
      const ids = [];
      for (let i = 0; i < 2; i++) { const pf = await F.deposer(P.ben, { conv: G, genre: 'fichier', corps: gros, nom: 'gros' + i + '.pdf' }); ids.push((await envoyer(P.ben, G, { type: 'fichier', piece: pf.j.id })).j.seq); }
      const r1 = await transferer(P.ana, G, ids[0], [D]);
      const avantP = compte('SELECT COUNT(*) AS n FROM piece WHERE proprio = ?', P.ana.moi.id);
      const r2 = await transferer(P.ana, G, ids[1], [D, E]);
      v('population : la première copie (1,3 Mo) passe dans le quota d\'Ana (3 Mo)', r1.code, 200);
      v('⛔ deux copies de plus ne tiennent plus : la première passe, la seconde est refusée (quota_stockage : l\'espace d\'Ana est plein) — et aucune pièce orpheline ne reste', [r2.code, r2.j.resultats.map(x => x.ok ? 'ok' : x.error), compte('SELECT COUNT(*) AS n FROM piece WHERE proprio = ?', P.ana.moi.id) - avantP], [200, ['ok', 'quota_stockage'], 1]);
    }
  } catch (e) {
    vrai('le banc s\'est déroulé sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
