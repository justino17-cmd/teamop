/* ⛔ CE QUE CE FICHIER GARDE — RETROUVER (9 octobre 2026 : l'inventaire d'OP MESSAGES — « pas de recherche dans les messages »), PAR LES VRAIES ROUTES ET LE VRAI SERVICE.

   GET /api/conversations/:id/messages/chercher?q=…[&avant_seq=N]   et   GET /api/conversations/:id/medias?genre=photo|fichier|lien[&avant_seq=N] :
     · la recherche trouve sans accents ni casse (« rochefort » trouve « Rochefort », « ecole » trouve « école »), dans le texte, la légende d'une photo et le NOM d'un fichier ;
       l'extrait garde le texte tel qu'il est écrit, autour de l'occurrence ; le plus récent d'abord ;
     · ⛔ ELLE NE VOIT QUE CE QUE JE VOIS : ni un message supprimé pour tous, ni un message masqué « pour moi », ni un message échu, ni un message d'avant mon arrivée ; une conversation
       dont je ne suis pas membre répond 404 (garde M) ;
     · elle se PAGINE : 30 résultats au plus, `suite` dit où reprendre, la page suivante n'en répète aucun, la dernière dit `suite: null` ;
     · les PHOTOS : un rang par message (ses images dans l'ordre, avec leurs dimensions), lisibles par la route des pièces ; les FICHIERS : pièce, nom, taille ; les LIENS : le texte
       des messages qui en portent ; rien de supprimé, ni le vocal dans les photos ou les fichiers ;
     · le corps piégé (requête trop courte, trop longue, absente ou répétée, `avant_seq` qui n'en est pas un, genre inconnu) → 400 ;
     · ⛔ un PLAFOND par compte (30 appels par minute) : le 31ᵉ → 429.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « absent » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
let ipN = 80; const ip = () => '198.51.100.' + (ipN++);
const cid = (p) => 'cid-' + p + '-' + crypto.randomBytes(5).toString('hex');

(async () => {
  const noms = ['ana', 'ben', 'cleo', 'dan', 'eve'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-12345', nom: n[0].toUpperCase() + n.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, config: {} });
  /* une écriture DIRECTE dans la base (le service tourne en WAL) : seulement pour poser une échéance passée, qu'aucune route ne sait poser */
  const ecrireBase = (sql, ...p) => { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(path.join(svc.data, 'msg.db')); try { d.prepare(sql).run(...p); } finally { d.close(); } };
  try {
    const P = {};
    for (const n of noms) P[n] = await T.connecter(svc, og, n, 'pw-' + n + '-12345', ip());
    const relier = async (a, b) => { const l = await P[a].post('/api/contacts/lien', {}); return P[b].post('/api/liens/accepter', { code: l.j.code }); };
    for (const n of ['ben', 'cleo', 'dan']) await relier('ana', n);
    const envoyer = (c, conv, corps) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid('m') }, corps));
    const chercher = (c, conv, q, av) => c.get('/api/conversations/' + conv + '/messages/chercher?q=' + encodeURIComponent(q) + (av !== undefined ? '&avant_seq=' + av : ''));
    const medias = (c, conv, genre, av) => c.get('/api/conversations/' + conv + '/medias?genre=' + genre + (av !== undefined ? '&avant_seq=' + av : ''));

    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
    const s1 = (await envoyer(P.ben, G, { texte: 'Le chantier de Rochefort démarre lundi' })).j.seq;
    const s2 = (await envoyer(P.cleo, G, { texte: 'Réunion à l\'école mardi' })).j.seq;
    const sSup = (await envoyer(P.ben, G, { texte: 'Rochefort : code du portail 4521' })).j.seq;
    await P.ben.post('/api/conversations/' + G + '/messages/supprimer', { seq: sSup, pour: 'tous' });
    const sMasq = (await envoyer(P.ben, G, { texte: 'Rochefort, à masquer' })).j.seq;
    await P.ana.post('/api/conversations/' + G + '/messages/supprimer', { seq: sMasq, pour: 'moi' });
    const sEch = (await envoyer(P.ben, G, { texte: 'Rochefort bientôt échu' })).j.seq;
    ecrireBase('UPDATE message SET expire_ts = 1 WHERE conv = ? AND seq = ?', G, sEch);
    const img = F.png({ w: 20, h: 10 }), img2 = F.png({ w: 8, h: 16 });
    const p1 = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: img }), p2 = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: img2 });
    const sPh = (await envoyer(P.ben, G, { type: 'photo', pieces: [{ id: p1.j.id, w: 20, h: 10 }, { id: p2.j.id, w: 8, h: 16 }], texte: 'Façade côté rue' })).j.seq;
    const pf = await F.deposer(P.cleo, { conv: G, genre: 'fichier', corps: F.pdf(3000), nom: 'Plan ROCHEFORT.pdf' });
    const sF = (await envoyer(P.cleo, G, { type: 'fichier', piece: pf.j.id })).j.seq;
    const pv = await F.deposer(P.ben, { conv: G, genre: 'vocal', corps: F.webm(3000) });
    await envoyer(P.ben, G, { type: 'vocal', piece: pv.j.id, dur: 3, bars: [10, 40] });
    const sL = (await envoyer(P.ana, G, { texte: 'Le plan : https://exemple.fr/plan et www.mairie-rochefort.fr' })).j.seq;
    const sA = (await envoyer(P.ana, G, { texte: 'rochefort encore' })).j.seq;
    v('population : les messages de la conversation sont là (texte, supprimé, masqué, échu, photo, fichier, vocal, lien)', [s1, s2, sSup, sMasq, sEch, sPh, sF, sL, sA].every(x => Number.isInteger(x) && x > 0), true);

    console.log('La RECHERCHE : sans accents ni casse, dans le texte, la légende et le nom d\'un fichier — le plus récent d\'abord');
    {
      const r = await chercher(P.ana, G, 'rochefort');
      v('« rochefort » : 200, quatre résultats — mon message, le lien, le fichier (par son NOM), le message de Ben — du plus récent au plus ancien ; rien à reprendre',
        [r.code, r.j.resultats.map(x => x.seq), r.j.suite], [200, [sA, sL, sF, s1], null]);
      const de1 = r.j.resultats.find(x => x.seq === s1);
      v('l\'extrait garde le texte tel qu\'il est écrit (« Rochefort », ses accents), avec son auteur et son heure', [de1.texte.includes('Rochefort démarre'), de1.auteur === P.ben.moi.id, Number.isInteger(de1.ts), de1.type], [true, true, true, 'texte']);
      v('le fichier se trouve par son nom (« Plan ROCHEFORT.pdf »)', [r.j.resultats.find(x => x.seq === sF).type, r.j.resultats.find(x => x.seq === sF).texte], ['fichier', 'Plan ROCHEFORT.pdf']);
      v('⛔ ni le message SUPPRIMÉ pour tous, ni celui MASQUÉ pour moi, ni l\'ÉCHU — population : les trois disaient « Rochefort »', r.j.resultats.some(x => [sSup, sMasq, sEch].includes(x.seq)), false);
      const rb = await chercher(P.ben, G, 'rochefort');
      v('… mais Ben, lui, retrouve celui qu\'Ana a masqué POUR ELLE (le masque est à chacun)', rb.j.resultats.some(x => x.seq === sMasq), true);
      v('« ECOLE » trouve « école » ; « façade » trouve la LÉGENDE de la photo', [(await chercher(P.ana, G, 'ECOLE')).j.resultats.map(x => x.seq), (await chercher(P.ana, G, 'facade')).j.resultats.map(x => x.seq)], [[s2], [sPh]]);
      v('une recherche qui ne trouve rien : 200, aucun résultat, rien à reprendre', [(await chercher(P.ana, G, 'zzqx')).code, (await chercher(P.ana, G, 'zzqx')).j.resultats.length, (await chercher(P.ana, G, 'zzqx')).j.suite], [200, 0, null]);
      const long = 'a'.repeat(300) + ' Rochefort ' + 'b'.repeat(300);
      const sLong = (await envoyer(P.ben, G, { texte: long })).j.seq;
      const ex = (await chercher(P.ana, G, 'rochefort')).j.resultats.find(x => x.seq === sLong);
      v('un long message : l\'EXTRAIT entoure l\'occurrence (coupé des deux côtés, « … »), il ne rend pas tout le texte', [!!ex, ex && ex.texte.startsWith('…') && ex.texte.endsWith('…') && ex.texte.includes('Rochefort') && Array.from(ex.texte).length < 200], [true, true]);
    }

    console.log('\nCe que je ne VOIS pas ne se cherche pas');
    {
      v('⛔ Eve, pas membre du Chantier : 404 (la garde de la conversation)', [(await chercher(P.eve, G, 'rochefort')).code, (await medias(P.eve, G, 'photo')).code], [404, 404]);
      const aj = await P.ana.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.dan.moi.id] });
      const sDan = (await envoyer(P.ben, G, { texte: 'Rochefort pour Dan aussi' })).j.seq;
      const rd = await chercher(P.dan, G, 'rochefort');
      v('⛔ Dan, arrivé après : il ne trouve QUE ce qui suit son arrivée — population : il est bien membre, et il trouve le message d\'après', [aj.code, rd.code, rd.j.resultats.map(x => x.seq)], [200, 200, [sDan]]);
      const pd = await medias(P.dan, G, 'photo');
      v('⛔ … ni les photos d\'avant son arrivée', [pd.code, pd.j.medias.length], [200, 0]);
    }

    console.log('\nLa PAGINATION : 30 au plus, `suite` dit où reprendre, rien de répété');
    {
      const R = (await P.ana.post('/api/conversations/groupe', { nom: 'Rafale', membres: [P.ben.moi.id, P.cleo.moi.id] })).j.conversation.id;
      const seqs = [];
      for (let i = 0; i < 23; i++) seqs.push((await envoyer(P.ben, R, { texte: 'rafale numéro ' + i })).j.seq);
      for (let i = 23; i < 45; i++) seqs.push((await envoyer(P.cleo, R, { texte: 'rafale numéro ' + i })).j.seq);
      const p1r = await chercher(P.ana, R, 'rafale'), p2r = await chercher(P.ana, R, 'rafale', p1r.j.suite);
      const tous = p1r.j.resultats.concat(p2r.j.resultats).map(x => x.seq);
      v('population : 45 messages « rafale » ; la première page en rend 30 et une `suite`, la seconde les 15 autres et `suite: null`',
        [seqs.length, p1r.j.resultats.length, Number.isInteger(p1r.j.suite), p2r.j.resultats.length, p2r.j.suite], [45, 30, true, 15, null]);
      v('⛔ aucun résultat répété d\'une page à l\'autre, aucun oublié, du plus récent au plus ancien', [new Set(tous).size, tous.join(), JSON.stringify(tous) === JSON.stringify(seqs.slice().reverse())], [45, seqs.slice().reverse().join(), true]);
    }

    console.log('\nLes PHOTOS, les FICHIERS, les LIENS d\'une conversation');
    {
      const ph = await medias(P.ana, G, 'photo');
      v('les photos : un rang par MESSAGE, ses deux images dans l\'ordre avec leurs dimensions', [ph.code, ph.j.medias.map(x => [x.seq, x.pieces.map(p => [p.id === p1.j.id ? 1 : p.id === p2.j.id ? 2 : 0, p.w, p.h])]), ph.j.suite], [200, [[sPh, [[1, 20, 10], [2, 8, 16]]]], null]);
      v('… et chaque image se LIT par la route des pièces (200)', [(await F.lirePiece(P.ana, p1.j.id)).code, (await F.lirePiece(P.ana, p2.j.id)).code], [200, 200]);
      const fi = await medias(P.ana, G, 'fichier');
      v('les fichiers : pièce, nom, taille — le vocal n\'y est pas', [fi.code, fi.j.medias.map(x => [x.seq, x.piece === pf.j.id, x.nom, x.taille > 0])], [200, [[sF, true, 'Plan ROCHEFORT.pdf', true]]]);
      const li = await medias(P.ana, G, 'lien');
      v('les liens : le texte des seuls messages qui en portent (la page y relit les adresses)', [li.code, li.j.medias.map(x => x.seq), li.j.medias[0] && li.j.medias[0].texte.includes('https://exemple.fr/plan'), li.j.suite], [200, [sL], true, null]);
      const pSup = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: F.png({ w: 4, h: 4 }) });
      const sPhSup = (await envoyer(P.ben, G, { type: 'photo', pieces: [{ id: pSup.j.id, w: 4, h: 4 }] })).j.seq;
      const avantSup = (await medias(P.ana, G, 'photo')).j.medias.length;
      await P.ben.post('/api/conversations/' + G + '/messages/supprimer', { seq: sPhSup, pour: 'tous' });
      v('⛔ une photo SUPPRIMÉE pour tous sort de la galerie — population : elle y était', [avantSup, (await medias(P.ana, G, 'photo')).j.medias.map(x => x.seq)], [2, [sPh]]);
    }

    console.log('\nLe corps piégé ; le plafond par compte');
    {
      const k = '/api/conversations/' + G;
      const codes = [];
      for (const u of [k + '/messages/chercher?q=a', k + '/messages/chercher?q=' + 'x'.repeat(101), k + '/messages/chercher', k + '/messages/chercher?q=ab&q=cd',
        k + '/messages/chercher?q=abc&avant_seq=x', k + '/messages/chercher?q=abc&avant_seq=-1', k + '/medias?genre=video', k + '/medias', k + '/medias?genre=photo&avant_seq=1.5']) codes.push((await P.ana.get(u)).code);
      v('⛔ neuf requêtes piégées (trop courte, trop longue, absente, répétée, avant_seq invalide ×3, genre inconnu ou absent) → 400', codes, codes.map(() => 400));
      v('« trois espaces » ne cherche pas tout : 400', (await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent('   '))).code, 400);
      let dernier = 0; for (let i = 0; i < 31; i++) dernier = (await chercher(P.cleo, G, 'mardi')).code;
      v('⛔ le 31ᵉ appel de la minute (Cléo) : 429 — le plafond est PAR COMPTE (Ana cherche encore)', [dernier, (await chercher(P.ana, G, 'mardi')).code], [429, 200]);
    }
  } catch (e) {
    vrai('le banc s\'est déroulé sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    await svc.arreter(); await og.fermer();
  }
  fin();
})();
