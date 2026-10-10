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
     · ⛔ DEUX plafonds par compte : `chercher` (30 par minute — le texte, et les LIENS qui le déchiffrent aussi) et `medias` (60 — photos et fichiers) ; épuiser l'un laisse
       l'autre ; un compte public de moins de 24 h en a le tiers (10 et 20) ;
     · ⛔ deux ACCENTS seuls (vides sans leurs signes combinants — une chaîne vide se trouve partout) → 400, sur la route comme dans la vraie source ;
     · ⛔ les LIENS rendent le texte ENTIER (un lien au-delà de 2 000 signes se perdait) ; la galerie ne montre ni le masqué « pour moi » ni l'échu ;
     · ⛔ BORNÉE PAR `config.recherche` (un second service, réglé petit) : au plus `lignesMax` messages et `signesMax` signes déchiffrés par appel, `resultatsMax` résultats,
       `mediasMax` photos par page — chaque borne rend une `suite`, la suite reprend sans rien répéter ni oublier, la dernière page dit `suite: null`.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « absent » est précédé de ce qu'il aurait pu compter. */
'use strict';
const path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
let ipN = 80; const ip = () => '198.51.100.' + (ipN++);
const cid = (p) => 'cid-' + p + '-' + crypto.randomBytes(5).toString('hex');
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const { creerSourceServeur } = require(path.join(T.SERVICE, 'public', 'source-serveur.js'));

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
      const pMq = await F.deposer(P.ben, { conv: G, genre: 'photo', corps: F.png({ w: 5, h: 5 }) });
      const sPhMq = (await envoyer(P.ben, G, { type: 'photo', pieces: [{ id: pMq.j.id, w: 5, h: 5 }] })).j.seq;
      const avantMq = (await medias(P.ana, G, 'photo')).j.medias.map(x => x.seq);
      await P.ana.post('/api/conversations/' + G + '/messages/supprimer', { seq: sPhMq, pour: 'moi' });
      v('⛔ une photo MASQUÉE pour moi sort de MA galerie — population : elle y était ; Ben la voit toujours',
        [avantMq, (await medias(P.ana, G, 'photo')).j.medias.map(x => x.seq), (await medias(P.ben, G, 'photo')).j.medias.map(x => x.seq)], [[sPhMq, sPh], [sPh], [sPhMq, sPh]]);
      const pfE = await F.deposer(P.cleo, { conv: G, genre: 'fichier', corps: F.pdf(2000), nom: 'Échu.pdf' });
      const sFE = (await envoyer(P.cleo, G, { type: 'fichier', piece: pfE.j.id })).j.seq;
      const avantE = (await medias(P.ana, G, 'fichier')).j.medias.map(x => x.seq);
      ecrireBase('UPDATE message SET expire_ts = 1 WHERE conv = ? AND seq = ?', G, sFE);
      v('⛔ un fichier ÉCHU sort de la galerie — population : il y était', [avantE, (await medias(P.ana, G, 'fichier')).j.medias.map(x => x.seq)], [[sFE, sF], [sF]]);
      const L = (await P.ana.post('/api/conversations/groupe', { nom: 'Liens longs', membres: [P.ben.moi.id] })).j.conversation.id;
      const sLong = (await envoyer(P.ben, L, { texte: 'b'.repeat(3000) + ' https://loin.exemple.fr/plan' })).j.seq;
      const ll = await medias(P.ana, L, 'lien');
      v('⛔ un lien au-delà de 2 000 signes : le texte ENTIER revient (la page y relit TOUS les liens — coupé, celui-ci se perdait)',
        [ll.code, ll.j.medias.map(x => x.seq), ll.j.medias[0] && ll.j.medias[0].texte.endsWith('https://loin.exemple.fr/plan'), ll.j.medias[0] && ll.j.medias[0].texte.length], [200, [sLong], true, 3029]);
    }

    console.log('\nLa COUTURE : les VRAIES api.js et source-serveur.js (celles de la page) contre ce service');
    {
      const nav = T.navigateur(svc.base);
      const sa = creerSourceServeur({ OPMSG, base: svc.base, fetch: nav.fetch, EventSource: nav.EventSource, attente: () => 60, delaiRelireMs: 5 });
      await sa.connexion('ana', 'pw-ana-12345');
      const d = await sa.demarrer();
      try {
        v('population : la vraie source démarre et annonce « retrouver »', [d.connecte, sa.capacites.retrouver], [true, true]);
        const r = await sa.chercher(G, '  RocheFort  ');
        const rr = (await chercher(P.ana, G, 'rochefort')).j.resultats;
        v('⛔ la vraie source cherche (requête nettoyée, casse ignorée) : les MÊMES résultats que la route, dans le même ordre, « moi » posé sur les miens seulement — population : il y en a des deux auteurs',
          [r.resultats.map(x => x.seq), r.resultats.map(x => x.moi), rr.some(x => x.auteur === P.ana.moi.id) && rr.some(x => x.auteur !== P.ana.moi.id)], [rr.map(x => x.seq), rr.map(x => x.auteur === P.ana.moi.id), true]);
        let e1 = null; try { await sa.chercher(G, 'a'); } catch (e) { e1 = e && e.code; }
        let e3 = null; try { await sa.chercher(G, '\u0301\u0301'); } catch (e) { e3 = e && e.code; }
        v('une requête d\'un seul signe, ou de deux ACCENTS seuls, est refusée sur l\'appareil, sans requête', [e1, e3], ['invalide', 'invalide']);
        const ph = await sa.medias(G, 'photo'), fi = await sa.medias(G, 'fichier'), li = await sa.medias(G, 'lien');
        v('⛔ les photos, les fichiers, les liens par la vraie source', [ph.medias.map(x => [x.seq, x.pieces.length]), fi.medias.map(x => [x.seq, x.fichier.nom]), li.medias.map(x => x.seq), li.medias[0].texte.includes('www.mairie-rochefort.fr')],
          [[[sPh, 2]], [[sF, 'Plan ROCHEFORT.pdf']], [sL], true]);
        let e2 = null; try { await sa.medias(G, 'video'); } catch (e) { e2 = e && e.code; }
        v('un genre inconnu est refusé sur l\'appareil', e2, 'invalide');
      } finally { try { sa.arreter(); } catch (e) { /* rien */ } }
    }

    console.log('\nLe corps piégé ; le plafond par compte');
    {
      const k = '/api/conversations/' + G;
      const codes = [];
      for (const u of [k + '/messages/chercher?q=a', k + '/messages/chercher?q=' + 'x'.repeat(101), k + '/messages/chercher', k + '/messages/chercher?q=ab&q=cd',
        k + '/messages/chercher?q=abc&avant_seq=x', k + '/messages/chercher?q=abc&avant_seq=-1', k + '/medias?genre=video', k + '/medias', k + '/medias?genre=photo&avant_seq=1.5']) codes.push((await P.ana.get(u)).code);
      v('⛔ neuf requêtes piégées (trop courte, trop longue, absente, répétée, avant_seq invalide ×3, genre inconnu ou absent) → 400', codes, codes.map(() => 400));
      v('« trois espaces » ne cherche pas tout : 400', (await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent('   '))).code, 400);
      v('⛔ deux ACCENTS seuls (vides sans leurs signes combinants : ils trouveraient TOUT), ou « é » seul : 400 — population : « ée » cherche (200)',
        [(await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent('\u0301\u0301'))).code, (await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent('e\u0301'))).code,
          (await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent(' \u0301 \u0301 '))).code, (await P.ana.get(k + '/messages/chercher?q=' + encodeURIComponent('e\u0301e'))).code], [400, 400, 400, 200]);
      let okC = 0, dernier = 0; for (let i = 0; i < 31; i++) { dernier = (await chercher(P.cleo, G, 'mardi')).code; if (dernier === 200) okC++; }
      v('⛔ « chercher » : 30 appels dans la minute, le 31ᵉ → 429 — PAR COMPTE (Ana cherche encore)', [okC, dernier, (await chercher(P.ana, G, 'mardi')).code], [30, 429, 200]);
      v('⛔ deux plafonds : Cléo, recherche épuisée, feuillette encore photos et fichiers (200) — mais pas les LIENS, qui déchiffrent le texte comme la recherche (429)',
        [(await medias(P.cleo, G, 'photo')).code, (await medias(P.cleo, G, 'fichier')).code, (await medias(P.cleo, G, 'lien')).code], [200, 200, 429]);
      /* Eve n'a encore rien demandé à la galerie (son 404 de non-membre est rendu par la garde, AVANT le plafond) : on la fait entrer */
      await relier('ana', 'eve');                                              // un membre s'ajoute parmi ses contacts
      const ajE = await P.ana.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.eve.moi.id] });
      let okM = 0, dernierM = 0; for (let i = 0; i < 61; i++) { dernierM = (await medias(P.eve, G, i % 2 ? 'fichier' : 'photo')).code; if (dernierM === 200) okM++; }
      v('⛔ « medias » : 60 appels dans la minute (photos et fichiers ensemble), le 61ᵉ → 429 ; la recherche d\'Eve reste ouverte', [ajE.code, okM, dernierM, (await chercher(P.eve, G, 'mardi')).code], [200, 60, 429, 200]);
    }

    console.log('\nUn compte public de moins de 24 h : le TIERS des deux plafonds');
    {
      const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
      const jeune = S.personneCreer({ identifiant: 'compte:jeune' + crypto.randomBytes(3).toString('hex') + '@exemple.invalide', prenom: 'Jeune', nom: 'Compte', origine: 'compte', verifie: true });
      const j = 'opm_' + crypto.randomBytes(32).toString('base64url'); S.sessionAjouter({ h: sha(j), personne: jeune.id, appareil: null, ttlMs: 86400000 });
      const cj = T.client(svc.base, { xff: ip() }); cj.poserCookie(j);
      const J = (await cj.post('/api/conversations/groupe', { nom: 'Jeune', membres: [] })).j.conversation.id;
      let okJ = 0, dJ = 0; for (let i = 0; i < 11; i++) { dJ = (await chercher(cj, J, 'rien')).code; if (dJ === 200) okJ++; }
      let okJm = 0, dJm = 0; for (let i = 0; i < 21; i++) { dJm = (await medias(cj, J, 'photo')).code; if (dJm === 200) okJm++; }
      v('⛔ population : le compte public existe (sa conversation est née) ; « chercher » : 10 puis 429 ; « medias » : 20 puis 429 (un tiers de 30 et de 60)', [typeof J, okJ, dJ, okJm, dJm], ['string', 10, 429, 20, 429]);
    }
  } catch (e) {
    vrai('le banc s\'est déroulé sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    await svc.arreter();
  }

  /* ── LES BORNES (`config.recherche`), sur un second service réglé petit : chaque borne doit rendre une suite, et la suite doit tout reprendre ── */
  console.log('\nLes BORNES d\'un appel (config.recherche, réglée petite) : chacune rend une `suite`, la suite reprend sans rien répéter ni oublier');
  const svc2 = await T.lancerService({ urlGestion: og.url, config: { recherche: { lignesMax: 5, signesMax: 1000, resultatsMax: 3, mediasMax: 2 } } });
  try {
    const A = await T.connecter(svc2, og, 'ana', 'pw-ana-12345', ip()), B = await T.connecter(svc2, og, 'ben', 'pw-ben-12345', ip());
    const l = await A.post('/api/contacts/lien', {}); await B.post('/api/liens/accepter', { code: l.j.code });
    const groupe = async (nom) => (await A.post('/api/conversations/groupe', { nom, membres: [B.moi.id] })).j.conversation.id;
    const envoyer = (conv, corps) => B.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid('b') }, corps));
    /* toutes les pages d'une recherche (ou d'une galerie), jusqu'à `suite: null` — au plus 20 */
    const pages = async (url, cle) => { const out = []; let av; for (let i = 0; i < 20; i++) { const r = await A.get(url + (av !== undefined ? '&avant_seq=' + av : '')); out.push({ code: r.code, n: (r.j[cle] || []).map(x => x.seq), suite: r.j.suite }); if (r.j.suite === null || r.code !== 200) break; av = r.j.suite; } return out; };
    const base = (conv) => '/api/conversations/' + conv;

    const C1 = await groupe('Lignes');
    const aig = (await envoyer(C1, { texte: 'une aiguille au fond' })).j.seq;
    for (let i = 0; i < 11; i++) await envoyer(C1, { texte: 'paille ' + i });
    const p1 = await pages(base(C1) + '/messages/chercher?q=aiguille', 'resultats');
    v('⛔ `lignesMax` 5, douze messages, l\'aiguille au plus ancien : trois appels (5 + 5 + 2 ouverts), les deux premiers VIDES mais avec une suite — rien ne prétend « aucun »',
      [p1.map(x => x.code), p1.map(x => x.n), p1.map(x => x.suite === null)], [[200, 200, 200], [[], [], [aig]], [false, false, true]]);

    const C2 = await groupe('Signes');
    const aig2 = (await envoyer(C2, { texte: 'aiguille' })).j.seq;
    const gros = []; for (let i = 0; i < 4; i++) gros.push((await envoyer(C2, { texte: 'p'.repeat(600) })).j.seq);
    const p2 = await pages(base(C2) + '/messages/chercher?q=aiguille', 'resultats');
    v('⛔ `signesMax` 1 000, des messages de 600 signes : l\'appel s\'arrête au DEUXIÈME (1 200 déchiffrés) — trois appels, les suites tombent sur les messages lus',
      [p2.map(x => x.n), p2.map(x => x.suite)], [[[], [], [aig2]], [gros[2], gros[0], null]]);

    const C3 = await groupe('Résultats');
    const tr = []; for (let i = 0; i < 7; i++) tr.push((await envoyer(C3, { texte: 'trouvé ' + i })).j.seq);
    const p3 = await pages(base(C3) + '/messages/chercher?q=trouve', 'resultats');
    const tous3 = p3.flatMap(x => x.n);
    v('⛔ `resultatsMax` 3, sept occurrences : 3 + 3 + 1, du plus récent au plus ancien, aucune répétée, aucune oubliée', [p3.map(x => x.n.length), tous3.join()], [[3, 3, 1], tr.slice().reverse().join()]);

    const C4 = await groupe('Galerie');
    const phs = [];
    for (let i = 0; i < 5; i++) { const d = await F.deposer(B, { conv: C4, genre: 'photo', corps: F.png({ w: 6 + i, h: 6 }) }); phs.push((await envoyer(C4, { type: 'photo', pieces: [{ id: d.j.id, w: 6 + i, h: 6 }] })).j.seq); }
    const p4 = await pages(base(C4) + '/medias?genre=photo', 'medias');
    v('⛔ `mediasMax` 2, cinq photos : 2 + 2 + 1, la suite reprend après la dernière rendue, rien de répété', [p4.map(x => x.n.length), p4.flatMap(x => x.n).join(), p4[p4.length - 1].suite], [[2, 2, 1], phs.slice().reverse().join(), null]);

    const C5 = await groupe('Liens rares');
    const lien = (await envoyer(C5, { texte: 'le plan : https://exemple.fr/plan' })).j.seq;
    for (let i = 0; i < 7; i++) await envoyer(C5, { texte: 'rien ' + i });
    const p5 = await pages(base(C5) + '/medias?genre=lien', 'medias');
    v('⛔ les LIENS aussi sont bornés : huit messages, le seul lien au plus ancien — un premier lot VIDE avec une suite (« aucun parmi les récents »), puis le lien',
      [p5.map(x => x.n), p5[0].suite !== null], [[[], [lien]], true]);
  } catch (e) {
    vrai('le second service s\'est déroulé sans exception (' + String(e && e.stack || e).split('\n').slice(0, 3).join(' | ') + ')', false);
  } finally {
    await svc2.arreter(); await og.fermer();
  }
  fin();
})();
