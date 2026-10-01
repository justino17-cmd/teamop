/* ⛔ CE QUE CE FICHIER GARDE — LE TEMPS RÉEL : deux appareils, un flux SSE chacun, reprise sans perte (famille 6).

   Un message envoyé par l'un doit PARAÎTRE chez l'autre sans qu'il rafraîchisse — c'est la règle du dépôt :
   « un adaptateur qui remplace une API qui pousse doit pousser ses propres écritures » (21 septembre 2026 :
   18 s pour voir son propre message, parce que le temps n'était dans aucun contrôle). Ce banc mesure donc le
   TEMPS, et il joue les pannes : coupure et reprise par `Last-Event-ID`, journal élagué (`resync`), membre
   retiré, session coupée, saisie éphémère, présence avec sa grâce, plafond de flux.

   ⛔ LES ATTENTES SE JOUENT AU GESTE, JAMAIS AU CHRONOMÈTRE : on attend l'ÉVÉNEMENT (`attendre`), le délai n'est
   qu'un plafond qui dit « ça n'est jamais arrivé ». Les deux seuls chiffres de temps (500 ms de latence, 3
   requêtes par minute au repos) sont des MESURES comparées à la règle, jamais un pari qui fait passer le banc.
   ⛔ UNE ABSENCE SE PROUVE APRÈS UNE PRÉSENCE : « C ne reçoit plus rien » n'est cru qu'une fois B ayant REÇU le
   message (on sait alors que l'événement est parti), et C ayant reçu l'événement qui lui dit qu'il est retiré.
   ⛔ LA MESURE AU REPOS EST FAITE SUR UNE BASE PLUS LOURDE QUE LE CAS COURANT (40 000 messages) : la boucle du 25
   septembre n'existait que sur une base lourde ; deux appareils immobiles ne doivent rien demander. */

const fs = require('fs'), net = require('net'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const OPMSG = require(path.join(T.SERVICE, 'public', 'api.js'));
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const attrape = async (p) => { try { await p; return null; } catch (e) { return e; } };

/* Un compteur de REQUÊTES HTTP entre le client et le service : on compte les lignes de requête. */
async function proxyCompteur(portCible) {
  const etat = { n: 0, chemins: [] };
  const srv = net.createServer((c) => {
    const s = net.connect(portCible, '127.0.0.1');
    c.on('data', (d) => { for (const m of d.toString('latin1').matchAll(/^(GET|POST|PUT|DELETE|OPTIONS|HEAD) (\S+) HTTP\/1\.1/gm)) { etat.n++; etat.chemins.push(m[1] + ' ' + m[2].split('?')[0]); } s.write(d); });
    s.on('data', d => c.write(d));
    c.on('close', () => s.destroy()); s.on('close', () => c.destroy()); c.on('error', () => {}); s.on('error', () => {});
  });
  const port = await T.portLibre(); await new Promise(r => srv.listen(port, '127.0.0.1', r));
  etat.port = port; etat.fermer = () => new Promise(r => { srv.close(() => r()); });
  return etat;
}

(async () => {
  const og = await T.fauxOpGestion({ alice: { pass: 'pw-alice-1234', nom: 'Alice', actif: true }, bob: { pass: 'pw-bob-12345', nom: 'Bob', actif: true }, carl: { pass: 'pw-carl-12345', nom: 'Carl', actif: true }, dave: { pass: 'pw-dave-12345', nom: 'Dave', actif: true } });
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true, config: { pulsationMs: 150, presenceGraceMs: 500, balayageMs: 100, quotas: { saisie: { max: 1, fenetreMs: 2000 } } } });
  try {
    const A = await T.connecter(svc, og, 'alice', 'pw-alice-1234'), B = await T.connecter(svc, og, 'bob', 'pw-bob-12345'), C = await T.connecter(svc, og, 'carl', 'pw-carl-12345');
    const contact = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await contact(A, B); await contact(A, C);
    const D = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
    const G = (await A.post('/api/conversations/groupe', { nom: 'Équipe', membres: [B.moi.id, C.moi.id] })).j.conversation.id;
    const envoyer = (c, conv, texte, extra) => c.post('/api/conversations/' + conv + '/messages', Object.assign({ cid: 'cid-' + crypto.randomBytes(8).toString('hex'), texte }, extra || {}));
    let fluxOuverts = [];
    const flux = async (c, o) => { const f = await T.flux(c, o); fluxOuverts.push(f); return f; };
    /* Chaque section repart de ZÉRO flux ouvert : on attend que le service LE DISE (/health), on ne dort pas. */
    const fermerTout = async () => {
      for (const f of fluxOuverts) f.fermer();
      fluxOuverts = [];
      await T.attendre(async () => (await T.client(svc.base).get('/health')).j.flux.ouverts === 0, 6000, 20);
    };

    console.log('Un message PARAÎT chez l\'autre, tout de suite — et le temps est MESURÉ');
    {
      const fb = await flux(B);
      v('population : le flux de Bob est ouvert et il a reçu son « bonjour » avec un identifiant', [fb.statut, !!(await fb.attendre(e => e.event === 'bonjour')), typeof (await fb.attendre(e => e.event === 'bonjour')).id], [200, true, 'number']);
      const delais = [];
      for (let i = 0; i < 15; i++) {
        const t0 = process.hrtime.bigint();
        const r = await envoyer(A, D, 'message ' + i);
        const ev = await fb.attendre(e => e.event === 'message' && e.data.seq === r.j.seq);
        delais.push(Number(process.hrtime.bigint() - t0) / 1e6);
        if (!ev) break;
      }
      delais.sort((a, b) => a - b);
      const med = Math.round(delais[Math.floor(delais.length / 2)] * 10) / 10, max = Math.round(delais[delais.length - 1] * 10) / 10;
      console.log('    mesure : envoi → réception chez l\'autre, 15 essais : médiane ' + med + ' ms, maximum ' + max + ' ms');
      v('⛔ les 15 messages sont ARRIVÉS chez Bob par le flux (aucun n\'a eu besoin d\'un rafraîchissement)', delais.length, 15);
      vrai('⛔ le plus lent est arrivé en MOINS DE 500 ms (la règle du dépôt : on vise bien moins)', max < 500);
      const reçus = fb.messages().filter(e => e.data.conv === D).map(e => e.data.seq);
      v('dans l\'ordre de la conversation et sans doublon', [reçus.length, new Set(reçus).size, reçus.every((x, i) => i === 0 || x > reçus[i - 1])], [15, 15, true]);
      const ids = fb.evenements.filter(e => e.id !== null).map(e => e.id);
      vrai('les identifiants d\'événements croissent strictement (sinon la reprise ne peut pas dire où on en est)', ids.every((x, i) => i === 0 || x > ids[i - 1]));
      const e0 = fb.messages()[0].data;
      vrai('l\'événement PORTE le message (texte, auteur, numéro) : pas de second appel nécessaire pour un texte court', e0.texte === 'message 0' && e0.auteur === A.moi.id && typeof e0.seq === 'number' && !e0.relis);
      const gros = 'é'.repeat(1500);   // 3 000 octets en UTF-8
      const rg = await envoyer(A, D, gros);
      const eg = await fb.attendre(e => e.event === 'message' && e.data.seq === rg.j.seq);
      vrai('⛔ un message de plus de 2 Ko ne voyage pas dans l\'événement : « relis » (le client le relit par la route)', eg.data.relis === true && eg.data.texte === undefined);
      v('et la route le rend en entier', (await B.get('/api/conversations/' + D + '/messages?apres_seq=' + (rg.j.seq - 1) + '&limite=1')).j.messages[0].texte, gros);
      const own = await flux(A);
      const r2 = await envoyer(A, D, 'pour mes autres appareils');
      const ea = await own.attendre(e => e.event === 'message' && e.data.seq === r2.j.seq);
      vrai('l\'expéditeur reçoit aussi l\'événement sur SES autres appareils, avec son `cid` (pour retirer l\'envoi en attente)', ea && ea.data.cid && ea.data.cid.startsWith('cid-'));
      const eb = fb.evenements.find(e => e.event === 'message' && e.data.seq === r2.j.seq);
      vrai('⛔ …mais le `cid` d\'un message n\'est jamais montré aux AUTRES', eb && eb.data.cid === undefined);
    }

    console.log('\nLes événements : modification, suppression, réaction, lu, notification — tous poussés');
    {
      await fermerTout();
      const fb = await flux(B);
      const r = await envoyer(A, G, 'à modifier');
      await fb.attendre(e => e.event === 'message' && e.data.seq === r.j.seq);
      await A.post('/api/conversations/' + G + '/messages/modifier', { seq: r.j.seq, texte: 'modifié' });
      const m = await fb.attendre(e => e.event === 'message_modifie' && e.data.seq === r.j.seq);
      v('la modification arrive (texte neuf)', m && m.data.texte, 'modifié');
      await B.post('/api/conversations/' + G + '/messages/reagir', { seq: r.j.seq, emoji: '👍' });
      const re = await fb.attendre(e => e.event === 'reaction' && e.data.seq === r.j.seq);
      v('la réaction arrive avec l\'ensemble des réactions du message', re && re.data.reactions, [{ uid: B.moi.id, emoji: '👍' }]);
      const fa = await flux(A);
      await B.post('/api/conversations/' + G + '/lu', { seq: r.j.seq });
      const lu = await fa.attendre(e => e.event === 'lu' && e.data.uid === B.moi.id && e.data.seq >= r.j.seq);
      v('⛔ « Lu » arrive chez les autres membres (c\'est ce qui fait les coches)', lu && [lu.data.conv, lu.data.uid], [G, B.moi.id]);
      await A.post('/api/conversations/' + G + '/messages/supprimer', { seq: r.j.seq, pour: 'tous' });
      const s = await fb.attendre(e => e.event === 'message_supprime' && e.data.seq === r.j.seq);
      v('la suppression « pour tous » arrive', s && s.data.pour, 'tous');
      const r3 = await envoyer(A, G, 'masquer pour moi');
      await fb.attendre(e => e.event === 'message' && e.data.seq === r3.j.seq);
      const fa2 = await flux(A);
      await A.post('/api/conversations/' + G + '/messages/supprimer', { seq: r3.j.seq, pour: 'moi' });
      const sm = await fa2.attendre(e => e.event === 'message_supprime' && e.data.seq === r3.j.seq);
      v('« supprimer pour moi » arrive à MES appareils, avec pour:"moi"', sm && sm.data.pour, 'moi');
      await envoyer(A, G, 'témoin après le masquage');
      await fb.attendre(e => e.event === 'message' && e.data.texte === 'témoin après le masquage');
      v('⛔ …et PAS à Bob (population : Bob vient de recevoir le message témoin qui suit)', fb.evenements.filter(e => e.event === 'message_supprime' && e.data.seq === r3.j.seq).length, 0);
      await envoyer(A, G, 'bonjour @bob', { mentions: [B.moi.id, A.moi.id, C.moi.id] });
      const nt = await fb.attendre(e => e.event === 'notification' && e.data.type === 'mention');
      vrai('une mention arrive comme NOTIFICATION dans l\'application (titre et texte lus)', nt && nt.data.titre && /mentionné/.test(nt.data.texte));
      v('⛔ la notification n\'est pas envoyée à celle qui s\'est mentionnée elle-même', fa.evenements.filter(e => e.event === 'notification' && e.data.type === 'mention').length, 0);
    }

    console.log('\nLa reprise par Last-Event-ID : une coupure ne perd RIEN et ne duplique RIEN');
    {
      await fermerTout();
      const f1 = await flux(B);
      const r0 = await envoyer(A, D, 'avant la coupure');
      await f1.attendre(e => e.event === 'message' && e.data.seq === r0.j.seq);
      const dernier = f1.evenements.filter(e => e.id !== null).pop().id;
      f1.fermer(); await f1.attendreFerme();
      const manques = [];
      for (let i = 0; i < 4; i++) manques.push((await envoyer(A, D, 'pendant la coupure ' + i)).j.seq);
      await A.post('/api/conversations/' + D + '/messages/reagir', { seq: manques[0], emoji: '❤️' });
      const f2 = await flux(B, { lastEventId: dernier });
      const fin2 = await f2.attendre(e => e.event === 'reaction' && e.data.seq === manques[0]);
      vrai('population : l\'événement le plus récent a été rejoué', !!fin2);
      const rejoues = f2.messages().map(e => e.data.seq);
      v('⛔ exactement les 4 messages manqués sont rejoués, dans l\'ordre, sans doublon et sans celui d\'avant la coupure', rejoues, manques);
      vrai('⛔ aucun événement rejoué n\'a un identifiant ≤ à celui du dernier reçu (le « bonjour » de reprise porte, lui, ce dernier identifiant)', f2.evenements.filter(e => e.id !== null && e.event !== 'bonjour').every(e => e.id > dernier));
      const r1 = await envoyer(A, D, 'après la reprise');
      vrai('puis le direct reprend sur le même flux', !!(await f2.attendre(e => e.event === 'message' && e.data.seq === r1.j.seq)));
      v('le « bonjour » d\'une reprise le dit (reprise:true)', (await f2.attendre(e => e.event === 'bonjour')).data.reprise, true);
      const f3 = await flux(B, { requete: '?depuis=' + dernier });
      await f3.attendre(e => e.event === 'message' && e.data.seq === r1.j.seq);
      v('la reprise passe aussi par ?depuis= (un EventSource recréé à la main n\'a pas d\'en-tête)', f3.messages().map(e => e.data.seq).slice(0, 4), manques);
      const f4 = await flux(B, { lastEventId: 'abc' });
      v('un Last-Event-ID illisible est traité comme une connexion neuve (pas de rejeu, pas d\'erreur)', [f4.statut, (await f4.attendre(e => e.event === 'bonjour')).data.reprise === undefined, f4.messages().length], [200, true, 0]);
      const max = (await B.get('/api/sync')).j.gid;
      const f5 = await flux(B, { lastEventId: max + 1000 });
      v('⛔ un Last-Event-ID PLUS GRAND que tout ce qui existe (base restaurée) → resync', !!(await f5.attendre(e => e.event === 'resync')), true);
      const sy = await B.get('/api/sync?depuis=' + dernier);
      v('GET /api/sync?depuis= rend aussi les événements manqués (pour un client sans flux)', [sy.j.resync, sy.j.evenements.filter(e => e.event === 'message').map(e => e.data.seq).slice(0, 4)], [false, manques]);
    }

    console.log('\nLe journal élagué : un client trop en retard reçoit « resync » et relit sa liste');
    {
      await fermerTout();
      const fv = await flux(B);
      const vieux = fv.evenements.filter(e => e.id !== null).slice(-1)[0] ? fv.evenements.filter(e => e.id !== null).slice(-1)[0].id : (await B.get('/api/sync')).j.gid;
      const anc = (await B.get('/api/sync')).j.gid;
      svc.avancer(8 * 86400000);
      await envoyer(A, D, 'après huit jours');   // une ligne neuve, datée d'aujourd'hui+8 j
      const elague = await T.attendre(async () => { const g = await B.get('/api/sync?depuis=' + Math.max(1, anc - 40)); return g.j.resync === true; }, 8000);
      vrai('⛔ le balayeur élague le journal (plus de 7 jours) et un point de reprise ancien devient « resync »', !!elague);
      const fr = await flux(B, { lastEventId: Math.max(1, anc - 40) });
      vrai('le flux le dit aussi : « resync » plutôt qu\'un rejeu incomplet', !!(await fr.attendre(e => e.event === 'resync')));
      void vieux;
      svc.avancer(-8 * 86400000);
    }

    console.log('\nUn membre retiré ne reçoit PLUS RIEN de la conversation, dès l\'écriture du retrait');
    {
      await fermerTout();
      const fc = await flux(C), fb = await flux(B);
      const avant = await envoyer(A, G, 'C voit ceci');
      await fc.attendre(e => e.event === 'message' && e.data.seq === avant.j.seq);
      vrai('population : Carl reçoit les messages du groupe tant qu\'il en est membre', fc.messages().some(e => e.data.seq === avant.j.seq));
      await A.post('/api/conversations/' + G + '/membres/retirer', { uid: C.moi.id });
      const retire = await fc.attendre(e => e.event === 'retire' && e.data.conv === G);
      vrai('Carl reçoit l\'événement qui lui dit qu\'il est retiré (pour fermer l\'écran)', !!retire);
      const apres = await envoyer(A, G, 'C ne doit pas voir ceci');
      await fb.attendre(e => e.event === 'message' && e.data.seq === apres.j.seq);
      await envoyer(A, G, 'ni ceci');
      await fb.attendre(e => e.event === 'message' && e.data.texte === 'ni ceci');
      v('⛔ Bob (resté) a reçu les deux messages ; Carl (retiré) n\'en a reçu AUCUN après son retrait', [fb.messages().filter(e => /ne doit pas voir|ni ceci/.test(e.data.texte || '')).length, fc.messages().filter(e => e.data.conv === G && e.data.seq > avant.j.seq).length], [2, 0]);
      v('et rien non plus de ce que la conversation produit ensuite (lu, réaction)', (await (async () => { await B.post('/api/conversations/' + G + '/lu', { seq: apres.j.seq }); await T.dort(150); return fc.evenements.filter(e => (e.event === 'lu' || e.event === 'reaction') && e.data.conv === G).length; })()), 0);
      const rep = await fc.attendre(() => false, 50);
      void rep;
      const fc2 = await flux(C, { lastEventId: fc.evenements.filter(e => e.id !== null)[0].id });
      await fc2.attendre(e => e.event === 'bonjour');
      v('⛔ même en REPRENANT depuis avant le retrait, Carl ne se voit pas rejouer les messages qu\'il n\'a plus le droit de lire', fc2.messages().filter(e => e.data.conv === G && e.data.seq > avant.j.seq).length, 0);
    }

    console.log('\nUn membre ARRIVÉ APRÈS ne rejoue pas les accusés de lecture d\'avant, et ne devine pas l\'existence d\'un message d\'avant (relecture du gardien, remarques 3 et 4)');
    {
      await fermerTout();
      const Dv = await T.connecter(svc, og, 'dave', 'pw-dave-12345');
      await contact(A, Dv);
      const point = (await B.get('/api/sync')).j.gid;
      const G2 = (await A.post('/api/conversations/groupe', { nom: 'Avant-Après', membres: [B.moi.id] })).j.conversation.id;
      const avantM = await envoyer(A, G2, 'avant son arrivée');
      await B.post('/api/conversations/' + G2 + '/lu', { seq: avantM.j.seq });
      await A.post('/api/conversations/' + G2 + '/membres/ajouter', { uids: [Dv.moi.id] });
      const apresM = await envoyer(A, G2, 'après son arrivée');
      const fd = await flux(Dv, { lastEventId: point });
      await fd.attendre(e => e.event === 'message' && e.data.seq === apresM.j.seq);
      vrai('population : Dave reprend depuis avant la création du groupe et reçoit ce qui lui appartient (le message d\'après son arrivée)', fd.messages().some(e => e.data.seq === apresM.j.seq));
      v('⛔ …mais AUCUN accusé de lecture d\'avant son arrivée (Bob avait lu le message 2 avant lui) ne lui est rejoué', fd.evenements.filter(e => e.event === 'lu' && e.data.conv === G2).length, 0);
      await B.post('/api/conversations/' + G2 + '/lu', { seq: apresM.j.seq });
      vrai('population : un accusé d\'APRÈS son arrivée, lui, lui parvient (le filtre ne coupe pas tout)', !!(await fd.attendre(e => e.event === 'lu' && e.data.conv === G2 && e.data.uid === B.moi.id && e.data.seq === apresM.j.seq)));
      const lu = fd.evenements.find(e => e.event === 'lu' && e.data.conv === G2);
      vrai('l\'accusé porte l\'heure de la lecture (c\'est ce que la page écrit sous « Lu »)', Number.isInteger(lu.data.ts) && lu.data.ts > 1e12);
      const existant = await Dv.post('/api/conversations/' + G2 + '/messages/modifier', { seq: avantM.j.seq, texte: 'pirate' });
      const inexistant = await Dv.post('/api/conversations/' + G2 + '/messages/modifier', { seq: 9999, texte: 'pirate' });
      v('⛔ modifier un message d\'AVANT son arrivée répond comme un message qui n\'existe pas (404 des deux côtés, aucune différence à deviner)', [existant.code, existant.j.error, inexistant.code, inexistant.j.error], [404, 'introuvable', 404, 'introuvable']);
      const sien = await Dv.post('/api/conversations/' + G2 + '/messages/modifier', { seq: apresM.j.seq, texte: 'pirate' });
      v('et un message d\'après son arrivée, qui n\'est pas le sien, reste un refus franc (403) : il le voit déjà', sien.code, 403);
    }

    console.log('\nLa saisie est ÉPHÉMÈRE : poussée, sans identifiant, jamais stockée, jamais rejouée');
    {
      await fermerTout();
      const fb = await flux(B);
      const gavant = (await B.get('/api/sync')).j.gid;
      const s1 = await A.post('/api/conversations/' + D + '/saisie', { actif: true });
      v('la saisie part (200)', s1.code, 200);
      const ev = await fb.attendre(e => e.event === 'saisie' && e.data.uid === A.moi.id);
      v('⛔ Bob la reçoit, SANS identifiant d\'événement (rien à rejouer)', [!!ev, ev.id], [true, null]);
      const s2 = await A.post('/api/conversations/' + D + '/saisie', { actif: true });
      v('⛔ une saisie par 2 secondes au plus : la suivante est refusée 429 avec Retry-After', [s2.code, s2.j.error, !!s2.h.get('retry-after')], [429, 'quota_atteint', true]);
      v('⛔ la saisie n\'a laissé AUCUNE ligne : le journal n\'a pas bougé', (await B.get('/api/sync')).j.gid, gavant);
      const frep = await flux(B, { lastEventId: gavant });
      await frep.attendre(e => e.event === 'bonjour');
      v('et une reprise ne la rejoue pas', frep.evenements.filter(e => e.event === 'saisie').length, 0);
      v('la saisie va aux AUTRES membres, pas à l\'expéditeur', (await (async () => { const fa = await flux(A); await T.dort(30); return fa.evenements.filter(e => e.event === 'saisie').length; })()), 0);
    }

    console.log('\nLa présence : calculée depuis les flux ouverts, contacts seulement, avec 20 s de grâce (ici 500 ms)');
    {
      await fermerTout();
      /* Les flux de la section d'avant viennent de se fermer : Bob est encore « en grâce » (500 ms). On attend qu'il soit
         VRAIMENT hors ligne — au geste, via /api/contacts — avant de mesurer son apparition. */
      vrai('population : Bob est hors ligne au départ de la mesure (sa grâce est écoulée)', !!(await T.attendre(async () => !(await A.get('/api/contacts')).j.contacts.find(c => c.id === B.moi.id).en_ligne, 4000, 30)));
      const D2 = await T.connecter(svc, og, 'dave', 'pw-dave-12345');
      const fa = await flux(A), fd = await flux(D2);
      const fb = await flux(B);
      const on = await fa.attendre(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === true);
      vrai('⛔ Alice (contact) voit Bob apparaître en ligne quand son flux s\'ouvre', !!on);
      v('un événement de présence est éphémère (pas d\'identifiant)', on.id, null);
      vrai('⛔ Dave, qui n\'est le contact de personne, ne reçoit AUCUNE présence (population : Alice en a reçu)', fd.evenements.filter(e => e.event === 'presence').length === 0);
      v('/api/contacts dit « en ligne » pour Bob', (await A.get('/api/contacts')).j.contacts.find(c => c.id === B.moi.id).en_ligne, true);
      // recharger la page : fermer puis rouvrir DANS la grâce → personne ne voit « hors ligne »
      const horsAvant = fa.evenements.filter(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === false).length;
      for (const f of fluxOuverts.filter(x => x !== fa && x !== fd)) { /* on ne ferme que ceux de Bob ci-dessous */ void f; }
      const onlyB = fluxOuverts.filter(f => f.retourne && f.retourne.url && true);
      void onlyB;
      const fb2 = await T.flux(B);   // un second flux de Bob : fermer le premier ne le met pas hors ligne
      fb.fermer(); await fb.attendreFerme();
      await T.dort(700);
      v('⛔ fermer UN flux alors qu\'il en reste un n\'éteint pas Bob', fa.evenements.filter(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === false).length, horsAvant);
      fb2.fermer(); await fb2.attendreFerme();
      const fbBis = await T.flux(B);   // rechargement : retour dans la grâce de 500 ms
      await T.dort(900);
      v('⛔ un rechargement de page (fermer puis rouvrir dans la grâce) ne fait PAS clignoter « hors ligne »', fa.evenements.filter(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === false).length, horsAvant);
      fbBis.fermer(); await fbBis.attendreFerme();
      const off = await fa.attendre(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === false, 4000);
      vrai('⛔ après la grâce, Bob passe « hors ligne » chez ses contacts', !!off);
      v('et /api/contacts le dit', (await A.get('/api/contacts')).j.contacts.find(c => c.id === B.moi.id).en_ligne, false);
      await B.post('/api/moi/maj', { prefs: { presence: false } });
      const fb3 = await flux(B);
      const nbOn = fa.evenements.filter(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === true).length;
      await T.dort(200);
      v('⛔ « ne pas montrer ma présence » : aucun événement, et /api/contacts ne le montre pas', [fa.evenements.filter(e => e.event === 'presence' && e.data.uid === B.moi.id && e.data.en_ligne === true).length, (await A.get('/api/contacts')).j.contacts.find(c => c.id === B.moi.id).en_ligne], [nbOn, false]);
      await B.post('/api/moi/maj', { prefs: { presence: true } });
      fb3.fermer();
    }

    console.log('\nLes limites : 5 flux par personne, fermeture à 24 h, pulsation, déconnexion');
    {
      await fermerTout();
      const E = await T.connecter(svc, og, 'dave', 'pw-dave-12345');
      const cinq = []; for (let i = 0; i < 5; i++) cinq.push(await T.flux(E));
      v('cinq flux : cinq 200', cinq.map(f => f.statut), [200, 200, 200, 200, 200]);
      const sixieme = await T.flux(E);
      v('⛔ le SIXIÈME est refusé : 429 trop_de_flux avec Retry-After (jamais « on ferme le plus ancien » : six onglets se feraient la guerre)', [sixieme.statut, sixieme.corps && sixieme.corps.error, !!sixieme.entetes.get('retry-after')], [429, 'trop_de_flux', true]);
      v('les cinq premiers vivent toujours', cinq.filter(f => f.ferme).length, 0);
      const p0 = cinq[0].commentaires;
      await T.attendre(() => cinq[0].commentaires >= p0 + 3, 5000);
      vrai('⛔ la pulsation `:` tombe sur un flux au repos (150 ms ici, 20 s en production) : le relais ne coupe pas un flux silencieux', cinq[0].commentaires >= p0 + 3);
      cinq[4].fermer(); await cinq[4].attendreFerme();
      const reprise = await T.attendre(async () => { const f = await T.flux(E); if (f.statut === 200) { cinq.push(f); return f; } return null; }, 4000);
      vrai('un flux fermé libère une place : un nouveau passe', !!reprise);
      svc.avancer(25 * 3600000);
      const fin24 = await cinq[0].attendre(e => e.event === 'fin' && e.data.motif === 'duree', 6000);
      vrai('⛔ au-delà de 24 h le flux est fermé par le service (« fin duree »), le client reconnecte', !!fin24 && await cinq[0].attendreFerme(3000));
      svc.avancer(-25 * 3600000);
      for (const f of cinq) f.fermer();
    }

    console.log('\nLe VRAI client (api.js) : ecouter() reçoit, retient le dernier identifiant, et rouvre un flux refusé');
    {
      await fermerTout();
      const nA = T.navigateur(svc.base), nB = T.navigateur(svc.base);
      const ca = OPMSG.creer({ base: svc.base, fetch: nA.fetch, EventSource: nA.EventSource });
      const cb = OPMSG.creer({ base: svc.base, fetch: nB.fetch, EventSource: nB.EventSource, attente: () => 60 });
      await ca.connexionBeta('alice', 'pw-alice-1234'); await cb.connexionBeta('bob', 'pw-bob-12345');
      const recus = [], ouvertures = []; let erreur = null;
      const ecoute = cb.ecouter({ message: (d) => recus.push(d), ouvert: () => ouvertures.push(1), erreur: (e) => { erreur = e; } });
      vrai('ecouter() ouvre le flux (callback ouvert)', !!(await T.attendre(() => ouvertures.length >= 1, 4000)));
      await ca.envoyer(D, 'par le vrai client');
      vrai('⛔ le gestionnaire `message` reçoit l\'événement décodé (objet, pas du texte)', !!(await T.attendre(() => recus.find(d => d.texte === 'par le vrai client'), 4000)));
      vrai('le dernier identifiant vu est retenu (c\'est lui qui sert à reprendre)', Number.isInteger(ecoute.dernierId()) && ecoute.dernierId() > 0);
      // Le compte de Bob a 1 flux (ecouter) ; on en ouvre 4 autres puis un 6e refuse… on libère ensuite.
      const quatre = []; for (let i = 0; i < 4; i++) quatre.push(await T.flux(B));
      const cb2 = OPMSG.creer({ base: svc.base, fetch: nB.fetch, EventSource: nB.EventSource, attente: () => 60 });
      const recus2 = [], ouv2 = [];
      const e2 = cb2.ecouter({ message: (d) => recus2.push(d), ouvert: () => ouv2.push(1), erreur: () => {} });
      await T.dort(200);
      v('⛔ le sixième flux est refusé (429) : ouvert() n\'est PAS appelé', ouv2.length, 0);
      quatre[0].fermer(); await quatre[0].attendreFerme();
      vrai('⛔ une place libérée, ecouter() rouvre SEUL le flux refusé (reprise à la main, sans que la page fasse quoi que ce soit)', !!(await T.attendre(() => ouv2.length >= 1, 6000)));
      await ca.envoyer(D, 'après la réouverture');
      vrai('et il reçoit de nouveau', !!(await T.attendre(() => recus2.find(d => d.texte === 'après la réouverture'), 4000)));
      e2.fermer(); ecoute.fermer(); for (const f of quatre) f.fermer();
      await ca.deconnexion();
      const nC = T.navigateur(svc.base), cc = OPMSG.creer({ base: svc.base, fetch: nC.fetch, EventSource: nC.EventSource, attente: () => 60 });
      await cc.connexionBeta('carl', 'pw-carl-12345');
      let dit = null; const ouvC = [];
      const ecC = cc.ecouter({ ouvert: () => ouvC.push(1), erreur: (e) => { dit = e; } });
      vrai('population : le flux de Carl est ouvert avant la coupure de sa session', !!(await T.attendre(() => ouvC.length >= 1, 4000)));
      await cc.deconnexion();
      vrai('⛔ une session morte : ecouter() DIT « session_requise » au lieu de reconnecter en boucle', !!(await T.attendre(() => dit && dit.code === 'session_requise', 6000)));
      await T.dort(300);
      v('et il ne rouvre PAS de flux derrière (aucun flux ouvert, un seul « ouvert » enregistré)', [(await T.client(svc.base).get('/health')).j.flux.ouverts, ouvC.length], [0, 1]);
      ecC.fermer(); void erreur;
    }

    console.log('\nAu REPOS : deux appareils connectés sur une base LOURDE ne demandent rien');
    {
      await fermerTout();
      const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
      const l = S.convCreerGroupe({ createur: A.moi.id, nom: 'Base lourde', membres: [B.moi.id], annonces_seules: false, ephemere_s: 0 }).id;
      S.tx(() => { for (let i = 0; i < 40000; i++) S.messageEnvoyer({ conv: l, auteur: i % 2 ? A.moi.id : B.moi.id, cid: 'lourd-' + i + '-xxxxxxxx', texte: 'message de la base lourde numéro ' + i }); });
      S.fermer();
      const d = T.lireBase(path.join(svc.data, 'msg.db'));
      const n = d.prepare('SELECT COUNT(*) AS n FROM message').get().n, j = d.prepare('SELECT COUNT(*) AS n FROM journal').get().n; d.close();
      vrai('population : la base porte plus de 40 000 messages et plus de 10 000 lignes de journal (' + n + ' / ' + j + ')', n >= 40000 && j >= 10000);
      const px = await proxyCompteur(svc.port);
      const nA = T.navigateur('http://127.0.0.1:' + px.port, { origin: svc.base }), nB = T.navigateur('http://127.0.0.1:' + px.port, { origin: svc.base });
      const ca = OPMSG.creer({ base: 'http://127.0.0.1:' + px.port, fetch: nA.fetch, EventSource: nA.EventSource }), cb = OPMSG.creer({ base: 'http://127.0.0.1:' + px.port, fetch: nB.fetch, EventSource: nB.EventSource });
      await ca.connexionBeta('alice', 'pw-alice-1234'); await cb.connexionBeta('bob', 'pw-bob-12345');
      const ouv = [], pul = { n: 0 };
      const ea = ca.ecouter({ ouvert: () => ouv.push('a') }), eb = cb.ecouter({ ouvert: () => ouv.push('b') });
      vrai('les deux appareils sont connectés', !!(await T.attendre(() => ouv.length >= 2, 5000)));
      await ca.conversations(); await cb.conversations();   // ce que la page fait en s'ouvrant
      const avant = px.n, t0 = Date.now();
      await T.dort(4000);   // la fenêtre d'observation : on ne PARIE sur rien, on COMPTE ce qui s'est passé
      const requetes = px.n - avant, minutes = (Date.now() - t0) / 60000;
      const parMinute = Math.round(requetes / minutes * 10) / 10;
      console.log('    mesure : ' + requetes + ' requête(s) en ' + Math.round((Date.now() - t0) / 100) / 10 + ' s pour deux appareils au repos → ' + parMinute + ' par minute (règle : ~3 au plus)');
      vrai('⛔ deux appareils immobiles sur une base lourde : au plus 3 requêtes par minute (la règle de la boucle du 25 septembre)', parMinute <= 3);
      void pul;
      ea.fermer(); eb.fermer(); await px.fermer();
    }

    console.log('\nLe retard de boucle d\'événements, fsync actif, sous une rafale d\'écritures');
    {
      await fermerTout();
      const t0 = Date.now(); let ok = 0;
      for (let lot = 0; lot < 15; lot++) {
        const rs = await Promise.all(Array.from({ length: 20 }, (_, i) => envoyer(i % 2 ? A : B, D, 'rafale ' + lot + '-' + i)));
        ok += rs.filter(r => r.code === 201).length;
      }
      const dt = Date.now() - t0;
      const h = (await T.client(svc.base).get('/health')).j;
      console.log('    mesure : ' + ok + ' écritures (20 en parallèle) en ' + dt + ' ms, ' + Math.round(ok / dt * 1000) + ' par seconde ; retard de boucle p99 = ' + h.boucle.p99Ms + ' ms');
      v('population : les 300 écritures de la rafale ont réussi', ok, 300);
      vrai('⛔ le retard de boucle p99 reste sous 200 ms avec `synchronous=FULL` (sinon : grouper les validations, jamais NORMAL)', h.boucle.p99Ms < 200);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    console.log(svc.sortie.texte().slice(-1500));
    process.exitCode = 1;
  }
  await svc.arreter(); await og.fermer();
  fin();
})();
