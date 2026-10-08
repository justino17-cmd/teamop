/* ⛔ CE QUE CE FICHIER GARDE — ENVOYER PLUS TARD (famille 3 : le VRAI service, en HTTP, son balayeur qui tourne pour de bon, l'horloge AVANCÉE au geste ; la base ouverte à côté).

   8 octobre 2026, Justin (« fais tout ça ») : « écrire un message maintenant et le programmer pour demain 8 h ». Ce que le service promet (`routes.js`, migration 22) :
     · un message programmé n'est PAS un message : personne d'autre ne le voit avant l'heure (ni dans la conversation, ni dans une liste) ; son texte est SCELLÉ en base ;
     · seul son auteur le liste et l'annule — un autre reçoit « introuvable » ; annulé, il ne part pas et le registre des purges s'en souvient ;
     · à l'heure, il part par le MÊME chemin qu'un envoi : un message de son auteur, vu par les autres ; sa ligne s'en va (registre des purges : une restauration ne le refait pas partir) ;
     · ⛔ les règles d'écriture sont jugées À L'HEURE : une conversation quittée entre-temps, il ne part pas (et sa ligne s'en va) ;
     · les refus se disent : une heure à moins d'une minute ou à plus d'un an, un texte vide, trop long, un non-membre (404), cinquante en attente au plus.
   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « zéro » ci-dessous est précédé de ce qu'il aurait pu compter. */
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
const MIN = 60000, HEURE = 3600000, JOUR = 86400000;

(async () => {
  const svc = await T.lancerService({ horloge: true, config: { balayageMs: 200 } });
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const sql = (req, ...a) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  let k = 0, avance = 0;
  const maintenant = () => Date.now() + avance;
  const avancer = (ms) => { avance += ms; svc.avancer(ms); };
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 30 * JOUR }); c.poserCookie(j); c.moi = p; return c; };
  try {
    const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo');
    const a = cl(ana), b = cl(ben), c = cl(cleo);
    for (const x of [b, c]) { const l = await a.post('/api/contacts/lien', {}); await x.post('/api/liens/accepter', { code: l.j.code }); }
    const AB = (await a.post('/api/conversations/directe', { uid: ben.id })).j.conversation.id;
    const G = (await a.post('/api/conversations/groupe', { nom: 'Chantier', membres: [ben.id, cleo.id] })).j.conversation.id;
    vrai('population : une directe Ana ↔ Ben et un groupe à trois', !!AB && !!G);
    const textes = async (P, conv) => ((await P.get('/api/conversations/' + conv + '/messages')).j.messages || []).map(m => m.texte);

    console.log('\n1. Programmer : personne d\'autre ne le voit avant l\'heure');
    const T1 = 'Bonjour Ben, on se voit à 8 h QXVPROG';
    const p1 = await a.post('/api/conversations/' + AB + '/programmes', { texte: T1, quand: maintenant() + 2 * HEURE });
    v('201, et la réponse dit le texte et l\'heure retenus', [p1.code, p1.j.programme && p1.j.programme.texte, p1.j.programme && Math.abs(p1.j.programme.quand - (maintenant() + 2 * HEURE)) < 5000], [201, T1, true]);
    v('Ana le liste (seule, dans cette conversation)', ((await a.get('/api/conversations/' + AB + '/programmes')).j.programmes || []).map(x => x.texte), [T1]);
    v('⛔ Ben ne le voit nulle part : ni dans la conversation, ni dans SA liste des programmés', [(await textes(b, AB)).includes(T1), ((await b.get('/api/conversations/' + AB + '/programmes')).j.programmes || []).length], [false, 0]);
    v('⛔ le texte est SCELLÉ en base (aucun en clair), et la ligne y est', [Number(sql("SELECT COUNT(*) AS n FROM programme WHERE CAST(texte_ch AS TEXT) LIKE '%QXVPROG%'").n), Number(sql('SELECT COUNT(*) AS n FROM programme').n)], [0, 1]);

    console.log('\n2. Les refus se disent');
    const refus = async (corps, conv = AB, P = a) => { const r = await P.post('/api/conversations/' + conv + '/programmes', corps); return [r.code, r.j && r.j.error]; };
    v('une heure dans moins d\'une minute : 400 heure_invalide', await refus({ texte: 'x', quand: maintenant() + 20000 }), [400, 'heure_invalide']);
    v('dans plus d\'un an : 400 heure_invalide', await refus({ texte: 'x', quand: maintenant() + 400 * JOUR }), [400, 'heure_invalide']);
    v('sans heure, ou une heure en texte : 400', [(await refus({ texte: 'x' }))[0], (await refus({ texte: 'x', quand: 'demain' }))[0]], [400, 400]);
    v('un texte vide, des espaces seuls : 400 ; pas de texte : 400', [(await refus({ texte: '', quand: maintenant() + HEURE }))[0], (await refus({ texte: '   ', quand: maintenant() + HEURE }))[0], (await refus({ quand: maintenant() + HEURE }))[0]], [400, 400, 400]);
    v('un texte trop long (plus de 8 000 signes) : 413', (await refus({ texte: 'é'.repeat(8001), quand: maintenant() + HEURE }))[0], 413);
    const AC = (await a.post('/api/conversations/directe', { uid: cleo.id })).j.conversation.id;
    v('⛔ Ben n\'est pas de la directe Ana ↔ Cléo : 404, comme une conversation qui n\'existe pas', [await refus({ texte: 'x', quand: maintenant() + HEURE }, AC, b), await refus({ texte: 'x', quand: maintenant() + HEURE }, 'c_' + '0'.repeat(32), b)],
      [[404, 'introuvable'], [404, 'introuvable']]);

    console.log('\n3. Annuler');
    const p2 = await a.post('/api/conversations/' + AB + '/programmes', { texte: 'À annuler QXVPROG2', quand: maintenant() + HEURE });
    v('⛔ Ben ne peut pas annuler celui d\'Ana (404, comme un programme qui n\'existe pas)', [(await b.post('/api/programmes/' + p2.j.programme.id + '/annuler', {})).code, (await b.post('/api/programmes/g_' + '0'.repeat(32) + '/annuler', {})).code], [404, 404]);
    const an = await a.post('/api/programmes/' + p2.j.programme.id + '/annuler', {});
    v('Ana l\'annule : 200, il quitte sa liste, puis 404 (déjà parti)', [an.code, ((await a.get('/api/conversations/' + AB + '/programmes')).j.programmes || []).map(x => x.texte), (await a.post('/api/programmes/' + p2.j.programme.id + '/annuler', {})).code], [200, [T1], 404]);
    v('   noté au registre des purges (genre « programme ») : une restauration ne le ferait pas repartir', Number(sql("SELECT COUNT(*) AS n FROM purge WHERE genre = 'programme' AND objet = ?", p2.j.programme.id).n), 1);

    console.log('\n4. ⛔ Les règles d\'écriture sont jugées À L\'HEURE');
    const p3 = await c.post('/api/conversations/' + G + '/programmes', { texte: 'Cléo, plus tard QXVPROG3', quand: maintenant() + 90 * MIN });
    vrai('population : Cléo programme un message dans le groupe', p3.code === 201, p3.j);
    v('   puis elle QUITTE le groupe', (await c.post('/api/conversations/' + G + '/quitter', {})).code, 200);

    console.log('\n5. À l\'heure : il part, par le même chemin qu\'un envoi');
    v('rien n\'est parti avant l\'heure (population : le message de Ana attend, celui de Cléo aussi)', [(await textes(b, AB)).includes(T1), Number(sql('SELECT COUNT(*) AS n FROM programme').n)], [false, 2]);
    avancer(2 * HEURE + MIN);
    const parti = await T.attendre(async () => (await textes(b, AB)).includes(T1), 8000, 100);
    vrai('⛔ l\'heure passée : Ben VOIT le message dans la conversation', parti);
    const m = ((await b.get('/api/conversations/' + AB + '/messages')).j.messages || []).find(x => x.texte === T1);
    v('   c\'est un message d\'Ana, un texte ordinaire', m ? [m.auteur, m.type] : null, [ana.id, 'texte']);
    v('   sa ligne s\'en va (la liste d\'Ana est vide), et le registre s\'en souvient', [((await a.get('/api/conversations/' + AB + '/programmes')).j.programmes || []).length, Number(sql("SELECT COUNT(*) AS n FROM purge WHERE genre = 'programme' AND objet = ?", p1.j.programme.id).n)], [0, 1]);
    await T.dort(700);
    v('⛔ il ne part qu\'UNE fois (les passages suivants n\'en refont pas)', (await textes(b, AB)).filter(t => t === T1).length, 1);
    v('⛔ celui de Cléo, qui a quitté le groupe, n\'est PAS parti — et sa ligne s\'en est allée', [(await textes(a, G)).some(t => /QXVPROG3/.test(t || '')), Number(sql('SELECT COUNT(*) AS n FROM programme').n)], [false, 0]);

    console.log('\n6. Un plafond');
    const res = [];
    for (let i = 0; i < 51; i++) res.push((await a.post('/api/conversations/' + AB + '/programmes', { texte: 'Plafond ' + i, quand: maintenant() + JOUR + i * MIN })).code);
    v('cinquante en attente au plus : le cinquante et unième est refusé (409 programmes_plein)', [res.slice(0, 50).every(x => x === 201), res[50]], [true, 409]);
    v('   l\'erreur se dit', (await a.post('/api/conversations/' + AB + '/programmes', { texte: 'encore', quand: maintenant() + JOUR })).j.error, 'programmes_plein');

    console.log('\n7. ⛔ Aucun nom en double dans les fichiers de la page (8 octobre 2026 : « programmer » écrasait PROGRAMMER UNE RÉUNION)');
    /* Deux `function x(` dans la même portée : la SECONDE remplace la première partout, sans erreur ; deux clés `x:` dans un objet littéral : idem. Pris le jour même : la première version
       de l'envoi programmé appelait sa fonction `programmer`, qui existait déjà pour les réunions — la page de la sonde programmait… une réunion sans titre (« Donne un titre à la réunion »). */
    const fs = require('fs');
    const src = fs.readFileSync(path.join(T.SERVICE, 'public', 'source-serveur.js'), 'utf8'), api = fs.readFileSync(path.join(T.SERVICE, 'public', 'api.js'), 'utf8');
    const doublons = (noms) => { const vus = new Map(); for (const n of noms) vus.set(n, (vus.get(n) || 0) + 1); return Array.from(vus).filter(([, k]) => k > 1).map(([n]) => n).sort(); };
    /* la PORTÉE de la source (la fonction `creerSourceServeur`) : les moteurs d'appel, plus haut, ont leurs propres fonctions — et leurs propres noms, légitimement les mêmes */
    const a0 = src.indexOf('  function creerSourceServeur('), a1 = src.indexOf('\n  }\n', a0);
    const fonctions = a0 > 0 && a1 > a0 ? Array.from(src.slice(a0, a1).matchAll(/^ {4}(?:async )?function (\w+)\(/gm), m => m[1]) : [];
    const cles = Array.from(api.matchAll(/^ {6}(\w+): /gm), m => m[1]);
    vrai('population : les fonctions de la source (4 espaces) et les clés de l\'API (6 espaces) sont lues', fonctions.length > 150 && cles.length > 100, fonctions.length + ' / ' + cles.length);
    v('⛔ aucune fonction déclarée deux fois dans la source, aucune clé en double dans l\'API', [doublons(fonctions), doublons(cles)], [[], []]);
    vrai('   la contre-épreuve : un doublon posé à la main est vu', doublons(fonctions.concat(['programmer', 'programmer'])).includes('programmer'));
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally { try { S.fermer(); } catch (e) { /* déjà fermé */ } await svc.arreter(); }
  fin();
})();
