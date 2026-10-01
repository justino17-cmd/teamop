/* ⛔ CE QUE CE FICHIER GARDE — LA RELECTURE ADVERSE DE L'ÉTAPE 1 (gardien + testeur adverse, 1er octobre 2026).

   Chaque contrôle ci-dessous est un défaut REJOUÉ sur le code d'avant, puis corrigé, puis gardé. Aucun n'est tombé
   des bancs 900 à 909 : les routes étaient justes chacune, c'est leur COMBINAISON qui ne l'était pas.

     · UN BLOCAGE TIENT : le bloqué qui « retire » le contact levait lui-même son blocage (la ligne de blocage de
       l'autre disparaissait), puis réutilisait son lien et se rétablissait ; écrire, saisir et lire le profil de qui
       nous a bloqués sont refusés ;
     · ENVOYER N'EST PAS LIRE : envoyer un message ne marquait pas lus les messages d'autrui jamais vus ;
     · UNE SESSION ÉVINCÉE FERME SON FLUX (la onzième connexion évince la première : son flux restait ouvert 24 h) ;
     · « ACCUSÉS DE LECTURE : NON » EST APPLIQUÉ — ni événement `lu`, ni `lu_seq` montré aux autres ;
     · UN LIEN DE GROUPE SE RÉVOQUE, MEURT AVEC LE DROIT DE SON CRÉATEUR, ET MEURT QUAND ON RETIRE QUELQU'UN (le retiré
       connaît le code) ;
     · UNE LIGNE ILLISIBLE RESTE UNE LIGNE ILLISIBLE : elle ne rend pas 500 sur la liste de tous les membres et ne coupe
       pas la reprise du flux ;
     · UN ÉPHÉMÈRE ÉCHU N'EST PLUS LU DÈS L'ÉCHÉANCE (le balayeur passe jusqu'à 60 s plus tard), et sa purge se dit
       `expire`, pas « supprimé pour tous » ;
     · `Last-Event-ID` est un ENTIER : « 1.5 » et « 1e3 » ne valent pas 1. */

const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
let ipN = 10; const ip = () => '198.51.100.' + (ipN++);
const hex = () => crypto.randomBytes(4).toString('hex');
const cid = (p) => 'cid-' + p + '-' + hex() + hex();

(async () => {
  const noms = ['alice', 'bob', 'carla', 'dave', 'eve', 'gus', 'hugo'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-1234', nom: n[0].toUpperCase() + n.slice(1), actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { balayageMs: 3600000 } });
  /* Un second service dont le balayeur passe vite : pour constater l'événement de purge d'un éphémère. */
  const og2 = await T.fauxOpGestion({ ella: { pass: 'pw-ella-1234', nom: 'Ella', actif: true }, fred: { pass: 'pw-fred-1234', nom: 'Fred', actif: true } });
  const svc2 = await T.lancerService({ urlGestion: og2.url, horloge: true, config: { balayageMs: 150 } });
  const ouvrirBase = (s) => { const { DatabaseSync } = require('node:sqlite'); return new DatabaseSync(path.join(s.data, 'msg.db')); };
  try {
    const P = {};
    for (const n of noms) P[n] = await T.connecter(svc, og, n, 'pw-' + n + '-1234', ip());
    const relier = async (a, b) => { const l = await P[a].post('/api/contacts/lien', { max: 5 }); return { code: l.j.code, r: await P[b].post('/api/liens/accepter', { code: l.j.code }) }; };
    const envoyer = (c, conv, texte, extra) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: cid('m'), texte }, extra || {}));
    const liste = async (c, conv) => ((await c.get('/api/conversations')).j.conversations || []).find(x => x.id === conv);

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('Un blocage tient : le bloqué ne peut ni le lever, ni le contourner par son lien');
    {
      const { code } = await relier('alice', 'eve');
      const d = await P.alice.post('/api/conversations/directe', { uid: P.eve.moi.id });
      const D = d.j.conversation.id;
      v('avant tout blocage, Eve écrit à Alice', (await envoyer(P.eve, D, 'bonjour')).code, 201);
      v('Alice bloque Eve', (await P.alice.post('/api/contacts/bloquer', { uid: P.eve.moi.id })).code, 200);
      v('Eve n\'écrit plus (404)', (await envoyer(P.eve, D, 'encore')).code, 404);
      v('⛔ Eve « retire » Alice de ses contacts : accepté', (await P.eve.post('/api/contacts/retirer', { uid: P.alice.moi.id })).code, 200);
      const l = (await P.alice.get('/api/contacts')).j.contacts.find(c => c.id === P.eve.moi.id);
      vrai('⛔ …et Alice la tient TOUJOURS pour bloquée (le retrait de Eve n\'a pas levé le blocage d\'Alice)', l && l.bloque === true);
      const re = await P.eve.post('/api/liens/accepter', { code });
      v('⛔ Eve réutilise le lien multi-usage d\'Alice : refusé (410), le contact n\'est pas rétabli', re.code, 410);
      v('⛔ et elle n\'écrit toujours pas à Alice', (await envoyer(P.eve, D, 'me revoici')).code, 404);
      v('⛔ Alice qui « bloque et retire » ne débloque pas non plus : le blocage survit à SON propre retrait',
        [(await P.alice.post('/api/contacts/retirer', { uid: P.eve.moi.id })).code, ((await P.alice.get('/api/contacts')).j.contacts.find(c => c.id === P.eve.moi.id) || {}).bloque], [200, true]);
      v('   et le lien reste refusé après ce retrait', (await P.eve.post('/api/liens/accepter', { code })).code, 410);
    }

    console.log('\nUn blocage coupe aussi la saisie et le profil — pas seulement l\'envoi');
    {
      const { r } = await relier('alice', 'gus');
      const d = await P.alice.post('/api/conversations/directe', { uid: P.gus.moi.id });
      const D = d.j.conversation.id;
      const fa = await T.flux(P.alice);
      await fa.attendre(e => e.event === 'bonjour');
      v('avant le blocage, Gus voit le profil d\'Alice et sa saisie arrive', [(await P.gus.get('/api/personnes/' + P.alice.moi.id)).code, (await P.gus.post('/api/conversations/' + D + '/saisie', { actif: true })).code], [200, 200]);
      await fa.attendre(e => e.event === 'saisie');
      await P.alice.post('/api/contacts/bloquer', { uid: P.gus.moi.id });
      const avant = fa.evenements.filter(e => e.event === 'saisie').length;
      await T.dort(2100);   // le plafond de saisie (1 par 2 s) ne doit pas être ce qui refuse
      v('⛔ Gus bloqué : sa saisie est refusée (404)', (await P.gus.post('/api/conversations/' + D + '/saisie', { actif: true })).code, 404);
      await T.dort(150);
      v('⛔ …et Alice n\'a reçu aucun événement de saisie de plus', fa.evenements.filter(e => e.event === 'saisie').length, avant);
      v('⛔ Gus bloqué ne lit plus le profil d\'Alice (404)', (await P.gus.get('/api/personnes/' + P.alice.moi.id)).code, 404);
      v('Alice, elle, lit encore le profil de celui qu\'elle a bloqué', (await P.alice.get('/api/personnes/' + P.gus.moi.id)).code, 200);
      fa.fermer();
      void r;
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nEnvoyer n\'est pas lire : les messages d\'autrui jamais vus restent non lus');
    let G;
    {
      for (const n of ['bob', 'carla']) await relier('alice', n);
      await relier('bob', 'carla');
      const g = await P.alice.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.bob.moi.id, P.carla.moi.id] });
      G = g.j.conversation.id;                                    // seq 1 : le message système de création
      await envoyer(P.bob, G, 'deux');                            // seq 2
      v('Alice marque lu jusqu\'au 2', (await P.alice.post('/api/conversations/' + G + '/lu', { seq: 2 })).j.lu_seq, 2);
      await envoyer(P.bob, G, 'trois'); await envoyer(P.carla, G, 'quatre'); await envoyer(P.bob, G, 'cinq');   // seq 3, 4, 5
      v('Alice a 3 messages non lus', (await liste(P.alice, G)).non_lus, 3);
      const e = await envoyer(P.alice, G, 'six');                 // seq 6
      v('Alice envoie le message 6', [e.code, e.j.seq], [201, 6]);
      const l = await liste(P.alice, G);
      v('⛔ envoyer n\'a PAS marqué lus les messages 3, 4 et 5 : toujours 3 non lus, lu_seq inchangé', [l.non_lus, l.lu_seq], [3, 2]);
      await P.alice.post('/api/conversations/' + G + '/lu', { seq: 6 });
      v('lire jusqu\'au bout les remet à zéro', (await liste(P.alice, G)).non_lus, 0);
      await envoyer(P.alice, G, 'sept');
      v('quand rien n\'est en attente, envoyer fait avancer lu_seq (sa propre ligne n\'est jamais « non lue »)', [(await liste(P.alice, G)).lu_seq, (await liste(P.alice, G)).non_lus], [7, 0]);
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne session évincée ferme son flux');
    {
      const premiere = await T.connecter(svc, og, 'hugo', 'pw-hugo-1234', ip());
      const f = await T.flux(premiere);
      await f.attendre(e => e.event === 'bonjour');
      for (let i = 0; i < 11; i++) await T.connecter(svc, og, 'hugo', 'pw-hugo-1234', ip());   // la 11e évince la plus ancienne (SESSIONS_MAX = 10)
      v('le cookie évincé ne vaut plus rien (401)', (await premiere.get('/api/moi')).code, 401);
      vrai('⛔ …et SON FLUX est fermé (il restait ouvert 24 h et recevait encore les messages)', await f.attendreFerme(3000));
      f.fermer();
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n« Accusés de lecture : non » est appliqué');
    {
      const fa = await T.flux(P.alice);
      await fa.attendre(e => e.event === 'bonjour');
      const detailPourAlice = async () => ((await P.alice.get('/api/conversations/' + G)).j.membres.find(m => m.id === P.carla.moi.id) || {}).lu_seq;
      await envoyer(P.bob, G, 'huit');                            // seq 8
      await P.carla.post('/api/conversations/' + G + '/lu', { seq: 4 });
      vrai('par défaut, Alice voit que Carla a lu jusqu\'au 4 (événement ET détail)', await fa.attendre(e => e.event === 'lu' && e.data.uid === P.carla.moi.id && e.data.seq === 4) && (await detailPourAlice()) === 4);
      v('Carla coupe ses accusés', (await P.carla.post('/api/moi/maj', { prefs: { accuses: false } })).code, 200);
      const nLu = fa.evenements.filter(e => e.event === 'lu').length;
      const r = await P.carla.post('/api/conversations/' + G + '/lu', { seq: 8 });
      v('Carla lit jusqu\'au 8 : accepté, son propre lu_seq avance', [r.code, r.j.lu_seq], [200, 8]);
      await T.dort(200);
      v('⛔ Alice ne reçoit AUCUN événement « lu » de Carla', fa.evenements.filter(e => e.event === 'lu').length, nLu);
      v('⛔ Alice ne voit plus le lu_seq de Carla dans le détail (null, pas 8 ni 4)', await detailPourAlice(), null);
      v('Carla voit toujours le sien, dans le détail', ((await P.carla.get('/api/conversations/' + G)).j.membres.find(m => m.id === P.carla.moi.id) || {}).lu_seq, 8);
      const fc = await T.flux(P.carla);
      await fc.attendre(e => e.event === 'bonjour');
      const P2 = await T.connecter(svc, og, 'carla', 'pw-carla-1234', ip());
      const fc2 = await T.flux(P2);
      await fc2.attendre(e => e.event === 'bonjour');
      await envoyer(P.bob, G, 'neuf');
      await P.carla.post('/api/conversations/' + G + '/lu', { seq: 9 });
      vrai('…et ses AUTRES appareils sont prévenus de sa lecture (événement adressé à elle seule)', await fc2.attendre(e => e.event === 'lu' && e.data.uid === P.carla.moi.id && e.data.seq === 9));
      fa.fermer(); fc.fermer(); fc2.fermer();
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn lien de groupe se révoque, meurt avec le droit de son créateur, et meurt quand on retire quelqu\'un');
    {
      const g = await P.alice.post('/api/conversations/groupe', { nom: 'Liens', membres: [P.bob.moi.id] });
      const L = g.j.conversation.id;
      const lien = async (c, conv, extra) => (await c.post('/api/conversations/' + conv + '/lien', Object.assign({ max: 10 }, extra || {})));
      const l1 = await lien(P.alice, L);
      v('un administrateur crée un lien', l1.code, 201);
      v('il est valide : l\'aperçu répond', (await P.dave.post('/api/liens/lire', { code: l1.j.code })).code, 200);
      v('⛔ un membre simple ne révoque pas (403)', (await P.bob.post('/api/conversations/' + L + '/liens/revoquer', {})).code, 403);
      v('un non-membre ne sait même pas que le groupe existe (404)', (await P.carla.post('/api/conversations/' + L + '/liens/revoquer', {})).code, 404);
      const rev = await P.alice.post('/api/conversations/' + L + '/liens/revoquer', {});
      v('⛔ l\'administrateur révoque les liens du groupe', [rev.code, rev.j.n], [200, 1]);
      v('⛔ le lien révoqué est mort (410), à la lecture comme à l\'acceptation', [(await P.dave.post('/api/liens/lire', { code: l1.j.code })).code, (await P.dave.post('/api/liens/accepter', { code: l1.j.code })).code], [410, 410]);
      // Un lien dont le créateur n'est plus administrateur.
      await P.alice.post('/api/conversations/' + L + '/admins', { uid: P.bob.moi.id, admin: true });
      const l2 = await lien(P.bob, L);
      v('Bob, promu, crée un lien', l2.code, 201);
      await P.alice.post('/api/conversations/' + L + '/admins', { uid: P.bob.moi.id, admin: false });
      v('⛔ Bob n\'est plus administrateur : SON lien meurt avec son droit (410)', (await P.dave.post('/api/liens/accepter', { code: l2.j.code })).code, 410);
      // Retirer quelqu'un révoque les liens : le retiré connaît le code.
      const l3 = await lien(P.alice, L);
      const entre = await P.carla.post('/api/liens/accepter', { code: l3.j.code });
      v('Carla entre par le lien', entre.code, 200);
      v('Alice retire Carla', (await P.alice.post('/api/conversations/' + L + '/membres/retirer', { uid: P.carla.moi.id })).code, 200);
      v('⛔ Carla, retirée, ne revient PAS par le lien qu\'elle connaît (410)', (await P.carla.post('/api/liens/accepter', { code: l3.j.code })).code, 410);
      const l4 = await lien(P.alice, L);
      v('Alice peut en créer un neuf : il fonctionne pour une autre personne', (await P.dave.post('/api/liens/accepter', { code: l4.j.code })).code, 200);
      // Les liens de contact se révoquent aussi.
      const lc = await P.dave.post('/api/contacts/lien', { max: 5 });
      const rc = await P.dave.post('/api/contacts/liens/revoquer', {});
      v('un lien de contact se révoque aussi', [rc.code, rc.j.n, (await P.carla.post('/api/liens/accepter', { code: lc.j.code })).code], [200, 1, 410]);
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUne ligne illisible reste une ligne illisible');
    {
      const a = await T.connecter(svc, og, 'alice', 'pw-alice-1234', ip());
      const g = await a.post('/api/conversations/groupe', { nom: 'Abîmé', membres: [P.bob.moi.id] });
      const C = g.j.conversation.id;
      const m1 = await envoyer(a, C, 'premier'), m2 = await envoyer(a, C, 'deuxième');
      v('deux messages posés', [m1.code, m2.code], [201, 201]);
      // On abîme le corps scellé du DERNIER message (un octet retourné) : l'authentification AES-GCM échoue.
      const b = ouvrirBase(svc);
      const ligne = b.prepare('SELECT corps_ch AS c FROM message WHERE conv = ? AND seq = ?').get(C, m2.j.seq).c;
      const abime = Buffer.from(ligne); abime[abime.length - 1] ^= 0xff;
      b.prepare('UPDATE message SET corps_ch = ? WHERE conv = ? AND seq = ?').run(abime, C, m2.j.seq); b.close();
      const lc = await a.get('/api/conversations');
      v('⛔ la liste des conversations répond toujours (pas de 500 pour tous les membres)', lc.code, 200);
      const ligneC = (lc.j.conversations || []).find(x => x.id === C);
      vrai('   la conversation y figure, son aperçu dit « illisible » sans texte', ligneC && ligneC.apercu && ligneC.apercu.illisible === true && ligneC.apercu.texte === null);
      const lm = await a.get('/api/conversations/' + C + '/messages');
      v('⛔ les messages répondent (200) : le bon est lu, le mauvais est marqué illisible', [lm.code, (lm.j.messages || []).filter(m => m.type !== 'systeme').map(m => [m.seq, m.texte, !!m.illisible])], [200, [[m1.j.seq, 'premier', false], [m2.j.seq, null, true]]]);
      // Un message PLUS TARD dans la même conversation doit continuer d'arriver, et la reprise ne doit pas s'arrêter.
      const f = await T.flux(a, { lastEventId: 0 });
      await envoyer(a, C, 'troisième');
      vrai('⛔ le flux rejoué depuis 0 ne meurt pas sur la ligne abîmée : le troisième message arrive', await f.attendre(e => e.event === 'message' && e.data.conv === C && e.data.texte === 'troisième', 4000));
      vrai('   et la ligne abîmée y est signalée, pas lue', f.evenements.some(e => e.event === 'message' && e.data.conv === C && e.data.seq === m2.j.seq && e.data.illisible === true && e.data.texte === undefined));
      f.fermer();
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nUn éphémère échu n\'est plus lu, même avant le passage du balayeur');
    {
      const g = await P.alice.post('/api/conversations/groupe', { nom: 'Éphémère', membres: [P.bob.moi.id], ephemere_s: 86400 });
      const E = g.j.conversation.id;
      const m = await envoyer(P.bob, E, 'ce texte doit disparaître');
      vrai('posé : Alice le lit', ((await P.alice.get('/api/conversations/' + E + '/messages')).j.messages || []).some(x => x.texte === 'ce texte doit disparaître'));
      vrai('   et son aperçu le montre', ((await liste(P.alice, E)).apercu || {}).texte === 'ce texte doit disparaître');
      svc.avancer(86400000 + 60000);   // 24 h 01 : échu ; le balayeur de CE service ne passe qu'une fois par heure
      v('⛔ Alice ne lit plus le message échu (les lectures filtrent l\'échéance)', ((await P.alice.get('/api/conversations/' + E + '/messages')).j.messages || []).some(x => x.texte === 'ce texte doit disparaître'), false);
      const l = await liste(P.alice, E);
      v('⛔ ni dans l\'aperçu de la liste, ni dans les non-lus', [(l.apercu || {}).texte === 'ce texte doit disparaître', l.non_lus], [false, 0]);
      void m;
    }
    {
      const A = await T.connecter(svc2, og2, 'ella', 'pw-ella-1234', ip()), B = await T.connecter(svc2, og2, 'fred', 'pw-fred-1234', ip());
      const l = await A.post('/api/contacts/lien', { max: 1 }); await B.post('/api/liens/accepter', { code: l.j.code });
      const g = await A.post('/api/conversations/groupe', { nom: 'Purge', membres: [B.moi.id], ephemere_s: 86400 });
      const E = g.j.conversation.id;
      const f = await T.flux(A); await f.attendre(e => e.event === 'bonjour');
      const m = await B.post('/api/conversations/' + E + '/messages', { cid: cid('e'), texte: 'bientôt purgé' });
      await f.attendre(e => e.event === 'message' && e.data.seq === m.j.seq);
      svc2.avancer(86400000 + 60000);
      const purge = await f.attendre(e => e.event === 'message_supprime' && e.data.seq === m.j.seq, 6000);
      vrai('la purge est annoncée', !!purge);
      v('⛔ …comme une EXPIRATION (pour = expire), pas comme une suppression « pour tous » : la page le retire, elle n\'écrit pas « Message supprimé »', purge && purge.data.pour, 'expire');
      f.fermer();
    }

    /* ═══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n`Last-Event-ID` est un entier');
    {
      const a = await T.connecter(svc, og, 'alice', 'pw-alice-1234', ip());
      const ouvert = async (id) => { const f = await T.flux(a, { lastEventId: id }); const e = await f.attendre(x => x.event === 'bonjour' || x.event === 'resync'); f.fermer(); return e ? { event: e.event, reprise: !!(e.data && e.data.reprise) } : null; };
      const max = ((await a.get('/api/sync')).j || {}).gid;
      v('un entier valide reprend', await ouvert(String(max)), { event: 'bonjour', reprise: true });
      for (const mauvais of ['1.5', '1e3', '7x', '-1', '0x10', '99999999999999999999']) {
        const r = await ouvert(mauvais);
        vrai('⛔ « ' + mauvais + ' » ne reprend PAS comme un entier (flux neuf ou resynchronisation)', r && r.reprise === false);
      }
    }
  } finally {
    await svc.arreter(); await svc2.arreter(); await og.fermer(); await og2.fermer();
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });
