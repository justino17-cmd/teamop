/* ══ OP MESSAGES — L'HEURE DE LECTURE SURVIT AU RECHARGEMENT : LE SERVICE LA GARDE ET LA REND (lot m-heure-lecture, 17 octobre 2026) ═══════════════════
   Campagne de test, conversations#2 : dans une conversation à deux, le statut sous le dernier message envoyé disait « Lu 22:50 » en direct, et « Lu » seul après un rechargement. Cause : le service ne retenait
   qu'un « lu jusqu'à » (`membre.lu_seq`) sans heure ; l'heure ne voyageait que dans l'événement `lu` en direct, et la page la rangeait dans une table de la séance. Décision de Justin (17 octobre 2026,
   « Lu 22:50 devient Lu après un rechargement — on garde l'heure de lecture ? » → « Oui, garder l'heure ») : le service la retient (`membre.lu_ts`, migration 30) et la REND avec le détail de la conversation.
   Ce banc lance le VRAI `server-msg/index.js` (horloge décalable : l'heure de lecture est connue) et joue, sur de vrais comptes :
     · LE CHARGEMENT RENDORT L'HEURE : Ben lit à une heure connue ; Ana, sur un appareil NEUF (le rechargement), relit la conversation par la route et y trouve la MÊME heure que celle de l'événement en direct
       (une seule source) ;
     · ELLE MONTE AVEC LE « LU JUSQU'À » ET NE REDESCEND PAS : un vieux « lu » rejoué ne rajeunit pas l'heure, une lecture plus loin la change ;
     · LE RÉGLAGE « ACCUSÉS DE LECTURE » EST RESPECTÉ À LA LETTRE, DANS LES DEUX SENS : coupé par Ben, Ana ne voit ni son « lu jusqu'à » ni son heure ; coupé par Ana, elle ne voit pas ceux de Ben (la réciprocité) ;
       Ben voit toujours la sienne ;
     · AUCUNE FUITE : une personne qui n'est pas dans la conversation n'obtient rien (404, aucun événement `lu`) ;
     · UN GROUPE GARDE SON COMPORTEMENT : chaque membre montre son heure aux autres, comme son « lu jusqu'à » ; revenir dans le groupe repart sans heure ;
     · UNE BASE EXISTANTE SE LIT SANS MIGRATION DESTRUCTIVE : une base au schéma 29 (copie « avant-v30 » conservée) garde ses « lu jusqu'à » ; sans heure, la page écrit « Lu » comme avant ; la première lecture
       d'après pose l'heure.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE NE PROUVE RIEN : chaque « null » est précédé de la preuve que la valeur existait (la même route, avant la coupure des accusés). Toute attente est au GESTE. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { DatabaseSync } = require('node:sqlite');
const crypto = require('crypto');

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (120 s)'); process.exit(1); }, 120000).unref();
let ipN = 40; const ip = () => '198.51.100.' + (ipN++);
const cid = (p) => 'cid-' + p + '-' + crypto.randomBytes(6).toString('hex');
const HEURE = 3600000;

(async () => {
  const noms = ['ana', 'ben', 'carla', 'dan'];
  const og = await T.fauxOpGestion(Object.fromEntries(noms.map(n => [n, { pass: 'pw-' + n + '-1234', nom: n[0].toUpperCase() + n.slice(1), actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true });
  const fluxOuverts = [];
  try {
    const P = {};
    for (const n of noms) P[n] = await T.connecter(svc, og, n, 'pw-' + n + '-1234', ip());
    const relier = async (a, b) => { const l = await P[a].post('/api/contacts/lien', { max: 5 }); return P[b].post('/api/liens/accepter', { code: l.j.code }); };
    const envoyer = (c, conv, texte) => c.post('/api/conversations/' + conv + '/messages', { cid: cid('m'), texte });
    const lire = (c, conv, seq) => c.post('/api/conversations/' + conv + '/lu', { seq });
    /* ce que Ana (ou qui regarde) lit de Ben : `lu_seq` et `lu_ts` dans les membres du détail */
    const de = async (c, conv, qui) => { const r = await c.get('/api/conversations/' + conv); return (r.j.membres || []).find(m => m.id === P[qui].moi.id) || null; };
    const ouvrirFlux = async (c) => { const f = await T.flux(c); fluxOuverts.push(f); await f.attendre(e => e.event === 'bonjour'); return f; };
    let decalage = 0;
    const avancer = (ms) => { decalage += ms; svc.avancer(ms); };
    const fenetre = async (geste) => { const a = Date.now() + decalage; const r = await geste(); return { r, a, b: Date.now() + decalage }; };

    await relier('ana', 'ben'); await relier('ana', 'carla'); await relier('ana', 'dan'); await relier('ben', 'dan');
    const D = (await P.ana.post('/api/conversations/directe', { uid: P.ben.moi.id })).j.conversation.id;

    console.log('Le schéma : la colonne de l\'heure existe');
    {
      const base = new DatabaseSync(path.join(svc.data, 'msg.db'));
      const colonnes = base.prepare("SELECT name FROM pragma_table_info('membre')").all().map(x => x.name);
      const schema = Number(base.prepare('PRAGMA user_version').get().user_version);
      base.close();
      vrai('(population) ' + colonnes.length + ' colonnes de `membre` lues', colonnes.length >= 10 && colonnes.includes('lu_seq'));
      vrai('la migration 30 pose `membre.lu_ts` et le service tourne au schéma ' + schema + ' (au moins 30)', colonnes.includes('lu_ts') && schema >= 30);
    }

    console.log('\nLe chargement rend l\'heure de lecture — la même que celle de l\'événement en direct');
    const fAna = await ouvrirFlux(P.ana), fCarla = await ouvrirFlux(P.carla);
    await envoyer(P.ana, D, 'un'); await envoyer(P.ana, D, 'deux');
    avancer(2 * HEURE);
    const lecture1 = await fenetre(() => lire(P.ben, D, 2));
    v('Ben lit jusqu\'au 2 : accepté', [lecture1.r.code, lecture1.r.j.lu_seq], [200, 2]);
    const ev1 = await fAna.attendre(e => e.event === 'lu' && e.data.uid === P.ben.moi.id && e.data.seq === 2);
    vrai('l\'événement en direct porte une heure (le « Lu 22:50 » d\'avant le rechargement), dans la fenêtre du geste', !!ev1 && ev1.data.ts >= lecture1.a && ev1.data.ts <= lecture1.b);
    const direct = await de(P.ana, D, 'ben');
    v('Ana relit la conversation : Ben a lu jusqu\'au 2', direct && direct.lu_seq, 2);
    v('⛔ …et le détail rend l\'HEURE de cette lecture, égale à celle de l\'événement (une seule source)', direct && direct.lu_ts, ev1 && ev1.data.ts);
    const AnaNeuve = await T.connecter(svc, og, 'ana', 'pw-ana-1234', ip());      // le rechargement de la page : un appareil neuf, rien en mémoire
    const apresRecharge = await de(AnaNeuve, D, 'ben');
    v('⛔ APRÈS UN RECHARGEMENT (appareil neuf), l\'heure est toujours là — plus de « Lu » seul', apresRecharge && apresRecharge.lu_ts, ev1 && ev1.data.ts);

    console.log('\nL\'heure monte avec le « lu jusqu\'à » et ne redescend jamais');
    avancer(HEURE);
    const vieux = await lire(P.ben, D, 1);
    v('un vieux « lu » rejoué (seq 1) ne fait pas reculer lu_seq', vieux.j.lu_seq, 2);
    v('⛔ …et ne rajeunit pas l\'heure de lecture', (await de(P.ana, D, 'ben')).lu_ts, ev1.data.ts);
    const memeSeq = await lire(P.ben, D, 2);
    v('relire la même position (seq 2) non plus', [memeSeq.j.lu_seq, (await de(P.ana, D, 'ben')).lu_ts], [2, ev1.data.ts]);
    await envoyer(P.ana, D, 'trois');
    avancer(10 * 60000);
    const lecture3 = await fenetre(() => lire(P.ben, D, 3));
    const ev3 = await fAna.attendre(e => e.event === 'lu' && e.data.uid === P.ben.moi.id && e.data.seq === 3);
    const plusLoin = await de(AnaNeuve, D, 'ben');
    vrai('lire plus loin (seq 3) pose une heure PLUS TARDIVE, dans la fenêtre de ce geste', plusLoin.lu_seq === 3 && plusLoin.lu_ts > ev1.data.ts && plusLoin.lu_ts >= lecture3.a && plusLoin.lu_ts <= lecture3.b);
    v('et c\'est encore celle de l\'événement', plusLoin.lu_ts, ev3 && ev3.data.ts);
    v('la liste des conversations ne change pas de forme : `lu_seq` y est, l\'heure n\'y est pas', await (async () => { const l = ((await P.ana.get('/api/conversations')).j.conversations || []).find(x => x.id === D); return [l && typeof l.lu_seq, l && 'lu_ts' in l]; })(), ['number', false]);

    console.log('\nLes accusés de lecture sont respectés exactement comme avant — dans les deux sens');
    await envoyer(P.ben, D, 'quatre');                                 // seq 4, de Ben
    avancer(5 * 60000);
    const lecture4 = await fenetre(() => lire(P.ana, D, 4));
    const benVoitAna = await de(P.ben, D, 'ana');
    vrai('(population) Ana a lu le 4 : Ben voit son « lu jusqu\'à » ET son heure', benVoitAna.lu_seq === 4 && benVoitAna.lu_ts >= lecture4.a && benVoitAna.lu_ts <= lecture4.b);
    v('Ben coupe ses accusés', (await P.ben.post('/api/moi/maj', { prefs: { accuses: false } })).code, 200);
    avancer(5 * 60000);
    await envoyer(P.ana, D, 'cinq');
    const lecture5 = await fenetre(() => lire(P.ben, D, 5));
    v('Ben lit le 5 : accepté, son propre « lu jusqu\'à » avance', lecture5.r.j.lu_seq, 5);
    const aLuSansAccuse = await de(AnaNeuve, D, 'ben');
    v('⛔ Ana ne voit NI le « lu jusqu\'à » NI l\'heure de Ben (accusés coupés par lui)', [aLuSansAccuse.lu_seq, aLuSansAccuse.lu_ts], [null, null]);
    const benSoi = await de(P.ben, D, 'ben');
    vrai('Ben voit toujours les siens (le « lu jusqu\'à » et l\'heure de cette lecture)', benSoi.lu_seq === 5 && benSoi.lu_ts >= lecture5.a && benSoi.lu_ts <= lecture5.b);
    const benVoitAnaCoupe = await de(P.ben, D, 'ana');
    v('⛔ réciprocité : Ben, qui a coupé les siens, ne voit pas non plus ceux d\'Ana (ni lu, ni heure)', [benVoitAnaCoupe.lu_seq, benVoitAnaCoupe.lu_ts], [null, null]);
    v('Ben rallume ses accusés', (await P.ben.post('/api/moi/maj', { prefs: { accuses: true } })).code, 200);
    const rallume = await de(P.ana, D, 'ben');
    vrai('rallumés, Ana revoit le « lu jusqu\'à » et l\'heure de Ben (rien n\'était perdu, seulement tu)', rallume.lu_seq === 5 && rallume.lu_ts === benSoi.lu_ts);
    v('Ana coupe SES accusés', (await P.ana.post('/api/moi/maj', { prefs: { accuses: false } })).code, 200);
    const anaCoupe = await de(P.ana, D, 'ben');
    v('⛔ Ana, qui a coupé les siens, ne voit plus ceux de Ben (ni lu, ni heure) — la moitié « je ne vois pas »', [anaCoupe.lu_seq, anaCoupe.lu_ts], [null, null]);
    const anaSoi = await de(P.ana, D, 'ana');
    v('…et voit toujours les siens (envoyer le 5 a fait avancer son propre « lu jusqu\'à »)', anaSoi.lu_seq, 5);
    await P.ana.post('/api/moi/maj', { prefs: { accuses: true } });

    console.log('\nAucune fuite : qui n\'est pas dans la conversation n\'obtient rien');
    const surCarla = await P.carla.get('/api/conversations/' + D);
    v('Carla (hors de la conversation) : 404', surCarla.code, 404);
    vrai('…et la réponse ne porte aucune heure de lecture', !/lu_ts|lu_seq/.test(JSON.stringify(surCarla.j || '')));
    await T.dort(300);
    vrai('(population) Ana, elle, a bien reçu des événements `lu` pendant ce temps : ' + fAna.evenements.filter(e => e.event === 'lu').length, fAna.evenements.filter(e => e.event === 'lu').length >= 2);
    v('⛔ Carla n\'a reçu AUCUN événement `lu` de cette conversation (flux ouvert depuis le début)', fCarla.evenements.filter(e => e.event === 'lu' && e.data.conv === D).length, 0);

    console.log('\nUn groupe garde son comportement : chaque membre montre son heure aux autres, comme son « lu jusqu\'à »');
    const G = (await P.ana.post('/api/conversations/groupe', { nom: 'Chantier', membres: [P.ben.moi.id, P.dan.moi.id] })).j.conversation.id;
    await envoyer(P.ana, G, 'bonjour le groupe');
    const dernierG = ((await P.ana.get('/api/conversations')).j.conversations || []).find(x => x.id === G).dernier_seq;
    avancer(HEURE);
    const lB = await fenetre(() => lire(P.ben, G, dernierG));
    avancer(7 * 60000);
    const lD = await fenetre(() => lire(P.dan, G, dernierG));
    const gB = await de(P.ana, G, 'ben'), gD = await de(P.ana, G, 'dan');
    vrai('(population) le groupe a ses trois membres et un dernier message : ' + dernierG, dernierG >= 2);
    vrai('Ana voit l\'heure de CHAQUE membre (Ben puis Dan, plus tard)', gB.lu_ts >= lB.a && gB.lu_ts <= lB.b && gD.lu_ts >= lD.a && gD.lu_ts <= lD.b && gD.lu_ts > gB.lu_ts);
    const danVoitBen = await de(P.dan, G, 'ben');
    v('Dan voit celle de Ben (comme son « lu jusqu\'à »)', danVoitBen.lu_ts, gB.lu_ts);
    v('Carla (hors du groupe) : 404', (await P.carla.get('/api/conversations/' + G)).code, 404);
    v('Ana retire Ben du groupe', (await P.ana.post('/api/conversations/' + G + '/membres/retirer', { uid: P.ben.moi.id })).code, 200);
    v('Ana le ré-ajoute', (await P.ana.post('/api/conversations/' + G + '/membres/ajouter', { uids: [P.ben.moi.id] })).code, 200);
    const revenu = await de(P.ana, G, 'ben');
    vrai('(population) Ben est revenu dans le groupe', !!revenu);
    v('⛔ revenir, c\'est repartir sans heure de lecture : celle d\'avant son départ ne se lit plus', revenu && revenu.lu_ts, null);
    vrai('…et Dan, resté, garde la sienne', (await de(P.ana, G, 'dan')).lu_ts === gD.lu_ts);
  } catch (e) { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { for (const f of fluxOuverts) f.fermer(); await svc.arreter(); await og.fermer(); }

  console.log('\nUne base EXISTANTE (schéma 29) se lit sans migration destructive : les « lu jusqu\'à » restent, l\'heure se pose à la lecture suivante');
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-2668-'));
  try {
    const chemin = path.join(bac, 'msg.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
    const ancien = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: MIGRATIONS.filter(m => m.v <= 29) });
    const mk = (n) => ancien.personneCreer({ identifiant: 'beta:' + n, prenom: n, nom: 'Test', origine: 'beta', verifie: true });
    const a = mk('ana'), b = mk('ben');
    ancien.contactLier(a.id, b.id);
    const conv = ancien.convDirecteObtenir(a.id, b.id).id;
    ancien.messageEnvoyer({ conv, auteur: a.id, cid: 'cid-2668-0001', texte: 'un' }); ancien.messageEnvoyer({ conv, auteur: a.id, cid: 'cid-2668-0002', texte: 'deux' });
    h.t += 1000; ancien.membreLu({ conv, uid: b.id, seq: 1 });
    const avantSchema = ancien.schema();
    const avant = ancien.membresDetail(conv, a.id).find(m => m.id === b.id);
    v('(population) la base d\'avant est au schéma 29 ; Ben a lu jusqu\'au 1, sans colonne d\'heure (le code d\'avant n\'a pas planté)', [avantSchema, avant.lu_seq, avant.lu_ts], [29, 1, null]);
    ancien.fermer();
    const neuve = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t });
    v('la base s\'ouvre au schéma courant, sans rien perdre', [neuve.schema() >= 30, neuve.membresDetail(conv, a.id).length], [true, 2]);
    vrai('une copie « avant-v30 » de la base d\'AVANT a été conservée (le mécanisme de version existant)', fs.existsSync(chemin + '.avant-v30'));
    const lu = neuve.membresDetail(conv, a.id).find(m => m.id === b.id);
    v('⛔ le « lu jusqu\'à » d\'avant est intact, SANS heure : la page écrit « Lu », comme avant', [lu.lu_seq, lu.lu_ts], [1, null]);
    h.t += 5000; neuve.membreLu({ conv, uid: b.id, seq: 2 });
    const apres = neuve.membresDetail(conv, a.id).find(m => m.id === b.id);
    v('la lecture suivante pose l\'heure (celle de l\'horloge du service)', [apres.lu_seq, apres.lu_ts], [2, h.t]);
    neuve.fermer();
  } catch (e) { console.log('  ✗ la base existante : ' + (e && e.stack || e)); process.exitCode = 1; }
  finally { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {} }
  fin();
})();
