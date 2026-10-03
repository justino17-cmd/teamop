/* ⛔ CE QUE CE FICHIER GARDE — LES ESPACES PROFESSIONNELS PAR LEURS ROUTES : LE VRAI SERVICE, EN HTTP, FORMULE DE PRODUCTION (famille 3, étape 5 ; modèle `test-903` et `test-909`).

   `test-960` éprouve ce qui est rangé et décidé, module seul ; `test-905` joue la garde de chaque route contre six profils. Celui-ci joue les GESTES, de bout en bout, à plusieurs personnes,
   avec la formule de PRODUCTION (`formule.toutOuvert: false` : le drapeau de la bêta éteint, ce qui n'est pas payé est refusé) — puis une seconde fois sur la bêta, tout ouvert :

     · créer un espace est une fonction Pro, décidée sur la formule de la PERSONNE (jamais sur le corps) ; créer un canal ou inviter, sur celle de l'ESPACE ;
     · inviter, aperçu, rejoindre : un code long, borné par les places payées, révocable ; « complet » et « abonnement en retard » répondent la MÊME phrase neutre à celui qui arrive ;
     · ⛔ « Contacts de l'entreprise » : les membres de MON espace, personne d'autre ; un non-membre ne voit RIEN (ni le nom, ni les membres, ni les canaux) et reçoit la réponse d'un espace inexistant ;
       aucune recherche par nom ; la fiche d'un collègue se lit, celle d'un étranger non ; on écrit à un collègue sans l'avoir en contact — et on peut le BLOQUER ;
     · les rôles : seul le propriétaire rétrograde ou retire un administrateur, passe la main, dissout (jamais avec un abonnement qui court) ; il ne part pas ;
     · les canaux sont des conversations : messages, accusés, pièces et flux SSE par la MÊME mécanique ; un privé n'est lu que par ses membres (l'administrateur de l'espace n'y est pas, sauf s'il y est) ;
       les routes des GROUPES refusent un canal ;
     · les plafonds par personne (espaces, canaux, liens) ; rien d'identifiant dans /health ni dans les journaux du service.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : les refus sont précédés de la population qu'ils auraient pu compter. */
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const F_PIECES = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const jeton = () => 'opm_' + crypto.randomBytes(32).toString('base64url');
const JOUR = 86400000;
const NOM_E = 'ENTREPRISEZXCANARIQESPACE';
const PNG = F_PIECES.png();
const roleCanalDe = (S, c, u) => { const m = S.convPourMembre(c, u); return m ? m.moi.role : null; };

/* Un service, sa base ouverte à côté (WAL : deux processus, une base), des personnes et leurs clients */
async function monter(config, instance) {
  const svc = await T.lancerService(Object.assign({ config }, instance ? { instance } : {}));
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const raw = () => new (require('node:sqlite').DatabaseSync)(path.join(svc.data, 'msg.db'));
  let k = 0;
  const pers = (nom) => S.personneCreer({ identifiant: 'beta:' + nom + (++k) + crypto.randomBytes(2).toString('hex'), prenom: nom, nom: 'Banc', origine: 'beta', verifie: true });
  const cl = (p) => { const c = T.client(svc.base); const j = jeton(); S.sessionAjouter({ h: sha(j), personne: p.id, appareil: null, ttlMs: 86400000 }); c.poserCookie(j); c.moi = p; return c; };
  const payer = (espace, o) => S.abonnementPoser(espace, Object.assign({ client: 'cus_banc961', abonnement: 'sub_b961_' + espace.slice(2, 14), statut: 'active', places: 5, fin_periode: Date.now() + 20 * JOUR, annule: false, impaye: false }, o || {}), { adopter: true });
  const retard = (espace, jours) => { const r = raw(); try { r.prepare(`UPDATE abonnement SET statut = 'past_due', impaye_depuis = ?, relu_le = ? WHERE espace = ?`).run(Date.now() - jours * JOUR, Date.now(), espace); } finally { r.close(); } };
  /* entrer dans un espace par une vraie invitation rangée à la main (sans passer par la route) */
  const entrer = (espace, par, uid) => { const code = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code), genre: 'espace', cible: espace, par, ttlMs: JOUR, max: 5 }); return S.invitationAccepter({ h: sha(code), uid, max: Infinity }); };
  return { svc, S, raw, pers, cl, payer, retard, entrer, fermer: async () => { try { S.fermer(); } catch (x) { /* déjà fermé */ } await svc.arreter(); } };
}

(async () => {
  const M = await monter({ formule: { toutOuvert: false } });
  const { svc, S, pers, cl, payer, retard, entrer } = M;
  const ana = pers('Ana'), ben = pers('Ben'), cleo = pers('Cleo'), dan = pers('Dan'), eve = pers('Eve'), fred = pers('Fred'), zed = pers('Zed'), yan = pers('Yan');
  const a = cl(ana), b = cl(ben), c = cl(cleo), d = cl(dan), e = cl(eve), f = cl(fred), z = cl(zed), y = cl(yan);
  const noms = (liste) => liste.map(x => x.prenom).sort();
  try {
    /* ═══ 1. CRÉER UN ESPACE : une fonction Pro, jugée sur la formule de la PERSONNE ═══════════════════════════════════════════════════════════════════════ */
    console.log('Créer un espace est une fonction Pro : la formule de la personne décide, jamais le corps');
    {
      const r0 = await e.get('/api/espaces');
      v('population : Eve n\'a aucun espace et sa formule est Perso ; l\'abonnement n\'est pas ouvert (aucune clé Stripe)', [r0.code, r0.j.espaces, r0.j.formule, r0.j.abonnement_ouvert], [200, [], 'perso', false]);
      const r = await e.post('/api/espaces', { nom: 'Ma boîte', formule: 'pro', proprio: ana.id, abonnement: { statut: 'active', places: 99 }, statut: 'active' });
      v('⛔ une personne Perso ne crée pas d\'espace : 402 `formule_requise`, sans la raison (la formule d\'une PERSONNE n\'a pas de « pourquoi » à lire), et le corps n\'y change rien', [r.code, r.j.error, 'raison' in r.j, r.j.abonnement_ouvert], [402, 'formule_requise', false, false]);
      v('… rien n\'a été créé', (await e.get('/api/espaces')).j.espaces.length, 0);
    }

    /* ═══ 2. L'ENTREPRISE PAYÉE : Ana propriétaire, 5 places ═════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nInviter : un code long, borné par les places payées, révocable — et la même phrase neutre quand l\'espace ne peut pas accueillir');
    const E = S.espaceCreer({ nom: NOM_E, proprio: ana.id }).id;
    payer(E);
    const pub0 = S.canalCreer({ espace: E, par: ana.id, nom: 'général', prive: false }).id;
    let code1 = null;
    {
      v('population : Ana propriétaire d\'un espace payé à 5 places, seule dedans', [S.espaceMembresN(E), S.abonnementLire(E).places, S.abonnementLire(E).statut], [1, 5, 'active']);
      const det = await a.get('/api/espaces/' + E);
      v('l\'administrateur lit la formule, les places et les invitations de SON espace', [det.code, det.j.fonctions_pro, det.j.admin.formule, det.j.admin.motif, det.j.admin.places, det.j.admin.invitations, det.j.moi.role, det.j.espace.proprio, det.j.membres_n], [200, true, 'pro', 'abonne', 5, 0, 'admin', true, 1]);
      for (const mauvais of [{ max: 0 }, { max: 101 }, { max: '3' }, { max: 1.5 }, { jours: 0 }, { jours: 31 }, { jours: '2' }, { max: null }]) {
        const r = await a.post('/api/espaces/' + E + '/invitations', mauvais);
        if (r.code !== 400) v('une borne invalide est refusée (400) : ' + JSON.stringify(mauvais), r.code, 400);
      }
      v('population : huit bornes invalides ont été jouées, aucune n\'a créé de lien', (await a.get('/api/espaces/' + E)).j.admin.invitations, 0);
      const r = await a.post('/api/espaces/' + E + '/invitations', { max: 3, jours: 2 });
      v('⛔ un lien : 201, un code LONG (au moins 22 signes aléatoires), une échéance, un nombre d\'utilisations borné par les PLACES RESTANTES (4 libres : 3 demandées)', [r.code, /^[A-Za-z0-9_-]{22,}$/.test(r.j.code), Math.abs(r.j.expire_le - (Date.now() + 2 * JOUR)) < 60000, r.j.max], [201, true, true, 3]);
      const code = r.j.code; code1 = code;
      const r2 = await a.post('/api/espaces/' + E + '/invitations', {});
      v('les valeurs par défaut (10 utilisations, 7 jours) sont bornées par les places restantes : 4', [r2.code, r2.j.max, Math.abs(r2.j.expire_le - (Date.now() + 7 * JOUR)) < 60000], [201, 4, true]);
      const ap = await d.post('/api/invitations/lire', { code });
      v('⛔ l\'aperçu dit l\'espace (son nom, combien de membres) et QUI invite — il n\'accepte rien, ne liste personne, ne parle ni de places ni d\'abonnement', [ap.code, ap.j.apercu.genre, ap.j.apercu.espace, ap.j.apercu.par.prenom, Object.keys(ap.j.apercu).sort(), (await d.get('/api/espaces')).j.espaces.length], [200, 'espace', { nom: NOM_E, membres: 1 }, 'Ana', ['espace', 'genre', 'par'], 0]);
      const mal = [{ code: '' }, { code: 'court' }, { code: 'a'.repeat(300) }, { code: 42 }, { code: { $ne: 1 } }, {}, { code: 'é'.repeat(30) }];
      v('⛔ un code absent, mal formé ou inconnu : 410 `lien_invalide`, toujours la même réponse (jamais une erreur de format, jamais un 500)', (await Promise.all(mal.concat([{ code: crypto.randomBytes(16).toString('base64url') }]).map(x => d.post('/api/invitations/lire', x)))).map(x => [x.code, x.j.error]), Array.from({ length: 8 }, () => [410, 'lien_invalide']));
      v('sans session : 401', (await T.client(svc.base).post('/api/invitations/lire', { code })).code, 401);
      v('⛔ un code d\'espace n\'ouvre QUE les invitations : ni la route des contacts, ni celle des groupes (410), et rien n\'a été accepté', [(await d.post('/api/liens/lire', { code })).code, (await d.post('/api/liens/accepter', { code })).code, (await d.get('/api/espaces')).j.espaces.length, (await d.get('/api/contacts')).j.contacts.length], [410, 410, 0, 0]);

      /* rejoindre : Ben, Cleo, Dan */
      for (const [p, cli] of [[ben, b], [cleo, c], [dan, d]]) {
        const j = await cli.post('/api/invitations/accepter', { code });
        v('rejoindre : ' + p.prenom + ' entre dans l\'espace (membre simple), sans qu\'on lui demande une formule', [j.code, j.j.deja, j.j.espace.id === E, j.j.espace.nom], [200, false, true, NOM_E]);
      }
      v('… un second passage de Dan avec un AUTRE lien ne consomme rien (`deja`), et Dan voit l\'espace et son canal public', [(await d.post('/api/invitations/accepter', { code: r2.j.code })).j.deja, (await d.get('/api/espaces')).j.espaces.map(x => [x.id === E, x.role, x.proprio === dan.id, x.membres_n]), (await d.get('/api/conversations')).j.conversations.map(x => [x.type, x.espace === E, x.prive])], [true, [[true, 'membre', false, 4]], [['canal', true, false]]]);
      v('population : le lien de Dan n\'a rien consommé (3 utilisations prévues, 3 prises par Ben, Cleo et Dan ; la quatrième personne est refusée)', (await e.post('/api/invitations/accepter', { code })).j.error, 'lien_invalide');
      const nt = (await a.get('/api/notifications')).j;
      vrai('⛔ Ana est prévenue dans l\'application (une notification « a rejoint l\'espace »)', nt.notifications.some(n => n.type === 'espace' && /a rejoint/.test(n.texte)));
      /* places : 4 membres sur 5 */
      const l3 = await a.post('/api/espaces/' + E + '/invitations', { max: 5 });
      v('quatre membres sur cinq places : un lien de cinq utilisations est ramené à UNE (les places restantes)', [l3.code, l3.j.max], [201, 1]);
      v('Eve prend la dernière place', (await e.post('/api/invitations/accepter', { code: l3.j.code })).code, 200);
      const plein = await a.post('/api/espaces/' + E + '/invitations', {});
      v('⛔ au-delà des places payées, plus de lien : 402 `places_epuisees`, avec les nombres que l\'administrateur doit lire', [plein.code, plein.j.error, plein.j.places, plein.j.membres], [402, 'places_epuisees', 5, 5]);
      /* un lien créé AVANT que l'espace ne soit plein ne fait pas entrer au-delà (l'acceptation recompte) */
      const L = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(L), genre: 'espace', cible: E, par: ana.id, ttlMs: JOUR, max: 9 });
      const complet = await f.post('/api/invitations/accepter', { code: L });
      v('⛔ un lien encore valable mais l\'espace est COMPLET : 409 `espace_indisponible` — la même phrase neutre que pour « abonnement en retard »', [complet.code, complet.j.error, Object.keys(complet.j)], [409, 'espace_indisponible', ['error']]);
      retard(E, 9);
      const enretard = await f.post('/api/invitations/accepter', { code: L });
      v('⛔ l\'abonnement en retard hors sursis : exactement la MÊME réponse (celui qui arrive ne sait pas pourquoi, il demande à l\'administrateur)', [enretard.code, enretard.txt], [complet.code, complet.txt]);
      payer(E);
      v('… Fred n\'est entré dans rien pendant tout cela', (await f.get('/api/espaces')).j.espaces.length, 0);
      const rev = await a.post('/api/espaces/' + E + '/invitations/revoquer', {});
      v('révoquer rend le nombre de liens vivants révoqués ; le code ne rouvre plus rien', [rev.code, rev.j.ok, rev.j.n >= 1, (await f.post('/api/invitations/lire', { code: L })).j.error], [200, true, true, 'lien_invalide']);
      v('un membre simple ne crée ni ne révoque d\'invitation (403, jamais 402 : la garde d\'appartenance passe avant la formule)', [(await b.post('/api/espaces/' + E + '/invitations', {})).code, (await b.post('/api/espaces/' + E + '/invitations/revoquer', {})).code], [403, 403]);
      /* nom invalide : Ben est maintenant membre d'un espace payé, donc Pro — la validation du nom se voit */
      v('un nom d\'espace invalide : 400 (vide, de blancs, trop long, pas du texte, absent)', (await Promise.all([{ nom: '' }, { nom: '   ' }, { nom: 'x'.repeat(81) }, { nom: 42 }, {}, { nom: ['a'] }].map(x => b.post('/api/espaces', x)))).map(x => x.code), [400, 400, 400, 400, 400, 400]);
    }

    /* ═══ 3. « CONTACTS DE L'ENTREPRISE » : MON espace seulement ══════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n« Contacts de l\'entreprise » : les membres de MON espace seulement — un non-membre ne voit RIEN');
    const E2 = S.espaceCreer({ nom: 'AUTREENTREPRISEZXQ', proprio: zed.id }).id; payer(E2); entrer(E2, zed.id, yan.id);
    const priv0 = S.canalCreer({ espace: E, par: ana.id, nom: 'direction', prive: true, membres: [ben.id] }).id;
    {
      const r = await b.get('/api/espaces/' + E + '/contacts');
      v('population : cinq personnes dans l\'espace de Ben ; l\'autre entreprise (Zed, Yan) existe', [r.code, r.j.contacts.length, S.espaceMembresN(E2)], [200, 5, 2]);
      v('⛔ « Contacts de l\'entreprise » liste les membres de CET espace — et personne d\'un autre (ni Zed, ni Yan)', noms(r.j.contacts), ['Ana', 'Ben', 'Cleo', 'Dan', 'Eve']);
      v('chaque ligne dit le rôle, si c\'est moi et si c\'est le propriétaire — rien d\'autre : ni adresse, ni numéro, ni identifiant de connexion', [Object.keys(r.j.contacts[0]).sort(), r.j.contacts.find(x => x.prenom === 'Ben').moi, r.j.contacts.find(x => x.prenom === 'Ana').role, /@|beta:|\+\d{6}/.test(r.txt)], [['avatar', 'contact', 'depuis', 'id', 'moi', 'nom', 'prenom', 'proprio', 'role', 'statut'], true, 'admin', false]);
      const repA = (await y.get('/api/espaces/' + E + '/contacts')), repB = (await y.get('/api/espaces/e_' + '0'.repeat(32) + '/contacts')), repC = (await f.get('/api/espaces/' + E + '/contacts'));
      v('⛔ un NON-MEMBRE (membre d\'une autre entreprise, ou étranger) reçoit EXACTEMENT la réponse d\'un espace inexistant : 404, le même corps', [repA.code, repA.txt, repC.txt], [404, repB.txt, repB.txt]);
      v('… il ne voit rien non plus de l\'espace lui-même, de ses canaux ni de ses actions', (await Promise.all([y.get('/api/espaces/' + E), y.get('/api/espaces/' + E + '/facturation/etat'), y.get('/api/conversations/' + pub0), y.get('/api/conversations/' + pub0 + '/messages'), y.post('/api/espaces/' + E + '/canaux', { nom: 'x' }), y.post('/api/espaces/' + E + '/maj', { nom: 'x' }), y.post('/api/espaces/' + E + '/quitter', {})])).map(x => [x.code, x.j && x.j.error]), Array.from({ length: 7 }, () => [404, 'introuvable']));
      v('… ni dans sa liste d\'espaces, ni dans celle de ses conversations', [(await y.get('/api/espaces')).j.espaces.map(x => x.id), (await y.get('/api/conversations')).j.conversations.length], [[E2], 0]);
      v('⛔ AUCUNE recherche par nom : le service ignore un filtre (`q`, `nom`, `recherche`) — la liste est la même, la page filtre ce qu\'elle a reçu', [(await b.get('/api/espaces/' + E + '/contacts?q=Ana')).txt === r.txt, (await b.get('/api/espaces/' + E + '/contacts?nom=Ana&recherche=Ana')).txt === r.txt], [true, true]);
      v('la fiche d\'un COLLÈGUE se lit (sans adresse ni numéro) ; celle d\'un étranger est « introuvable », comme une personne qui n\'existe pas', [(await b.get('/api/personnes/' + ana.id)).code, /@|beta:|identifiant/.test((await b.get('/api/personnes/' + ana.id)).txt), (await f.get('/api/personnes/' + ana.id)).code, (await y.get('/api/personnes/' + ana.id)).code], [200, false, 404, 404]);
      /* écrire à un collègue sans l'avoir en contact */
      v('population : Ben et Cleo ne sont PAS contacts', [(await b.get('/api/contacts')).j.contacts.length, (await c.get('/api/contacts')).j.contacts.length], [0, 0]);
      const dm = await b.post('/api/conversations/directe', { uid: cleo.id });
      v('⛔ des collègues s\'écrivent SANS être contacts : la directe s\'ouvre (201) et le message part', [dm.code, dm.j.conversation.type, (await b.post('/api/conversations/' + dm.j.conversation.id + '/messages', { cid: 'cid-col-000001', texte: 'salut collègue' })).code], [201, 'direct', 201]);
      v('… un étranger ne le peut pas : 404 `introuvable` (il n\'apprend rien)', [(await f.post('/api/conversations/directe', { uid: ben.id })).code, (await y.post('/api/conversations/directe', { uid: ben.id })).code], [404, 404]);
      v('Cleo reçoit le message', (await c.get('/api/conversations/' + dm.j.conversation.id + '/messages')).j.messages.map(m => m.texte), ['salut collègue']);
      /* ⛔ LE BLOCAGE : sans lui, celui qui harcèle un collègue ne s'arrêterait jamais */
      const bl = await c.post('/api/contacts/bloquer', { uid: ben.id });
      v('⛔ Cleo BLOQUE Ben, un collègue qu\'elle n\'a pas en contact : 200 (avant l\'étape 5, 404 — il n\'y avait rien à bloquer)', [bl.code, bl.j.ok], [200, true]);
      v('… Ben n\'écrit plus à Cleo (404, comme si la conversation n\'existait pas) ; l\'historique reste lisible', [(await b.post('/api/conversations/' + dm.j.conversation.id + '/messages', { cid: 'cid-col-000002', texte: 'je te harcèle' })).code, (await b.get('/api/conversations/' + dm.j.conversation.id + '/messages')).code, (await b.post('/api/conversations/directe', { uid: cleo.id })).code], [404, 200, 404]);
      v('… et chacun disparaît de l\'annuaire de l\'autre, pas de celui de l\'administrateur', [noms((await c.get('/api/espaces/' + E + '/contacts')).j.contacts), noms((await b.get('/api/espaces/' + E + '/contacts')).j.contacts), noms((await a.get('/api/espaces/' + E + '/contacts')).j.contacts)], [['Ana', 'Cleo', 'Dan', 'Eve'], ['Ana', 'Ben', 'Dan', 'Eve'], ['Ana', 'Ben', 'Cleo', 'Dan', 'Eve']]);
      v('le blocage est personnel : Dan, lui, écrit toujours à Ben', (await d.post('/api/conversations/directe', { uid: ben.id })).code, 201);
      v('⛔ on ne bloque pas un étranger (404 `introuvable`, rien n\'est créé) ; bloquer soi-même est une erreur de forme', [(await f.post('/api/contacts/bloquer', { uid: ana.id })).code, (await f.post('/api/contacts/bloquer', { uid: fred.id })).code, (await f.get('/api/contacts')).j.contacts.length], [404, 400, 0]);
      const db = await c.post('/api/contacts/debloquer', { uid: ben.id });
      v('Cleo débloque Ben : 200, l\'écriture reprend, et la ligne de blocage a DISPARU (elle ne reste pas comme un contact à moitié)', [db.code, (await b.post('/api/conversations/' + dm.j.conversation.id + '/messages', { cid: 'cid-col-000003', texte: 'de nouveau' })).code, (await c.get('/api/contacts')).j.contacts.length], [200, 201, 0]);
      v('débloquer quand rien n\'est bloqué : 404', (await c.post('/api/contacts/debloquer', { uid: ben.id })).code, 404);
    }
    /* ═══ 4. LES RÔLES, LES DÉPARTS, LA PROPRIÉTÉ ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes rôles : seul le propriétaire rétrograde ou retire un administrateur, passe la main, dissout ; il ne part pas');
    {
      const role = (cli, uid, admin) => cli.post('/api/espaces/' + E + '/membres/role', { uid, admin });
      const retirer = (cli, uid) => cli.post('/api/espaces/' + E + '/membres/retirer', { uid });
      const gus = pers('Gus'); const g = cl(gus);
      v('Ana nomme Ben administrateur ; redire la même chose ne change rien', [(await role(a, ben.id, true)).j, (await role(a, ben.id, true)).j], [{ ok: true, change: true }, { ok: true, change: false }]);
      v('⛔ Ben, administrateur de l\'espace, l\'est aussi des canaux où il est : le rôle dans un canal est le rôle dans l\'espace', [(await b.get('/api/conversations/' + priv0)).j.moi.role, (await b.get('/api/conversations/' + pub0)).j.moi.role, (await c.get('/api/conversations/' + pub0)).j.moi.role], ['admin', 'admin', 'membre']);
      v('⛔ Ben (administrateur, pas propriétaire) ne rétrograde pas le propriétaire (403) ; le propriétaire ne se rétrograde pas lui-même (409 `proprio`)', [(await role(b, ana.id, false)).code, (await role(a, ana.id, false)).j.error], [403, 'proprio']);
      v('un membre simple ne change aucun rôle, ne retire personne (403)', [(await role(c, dan.id, true)).code, (await retirer(c, dan.id)).code], [403, 403]);
      await role(a, cleo.id, true);
      v('⛔ Ben n\'enlève pas son rôle à un AUTRE administrateur (403) ; il en nomme un (200) ; le propriétaire, lui, rétrograde', [(await role(b, cleo.id, false)).code, (await role(b, dan.id, true)).code, (await role(a, cleo.id, false)).code, (await role(a, dan.id, false)).code], [403, 200, 200, 200]);
      v('un rôle pour quelqu\'un qui n\'est pas dans l\'espace : 404 ; un corps mal formé : 400', [(await role(a, fred.id, true)).code, (await role(a, 'x', true)).code, (await role(a, ben.id, 'oui')).code, (await a.post('/api/espaces/' + E + '/membres/role', {})).code], [404, 400, 400, 400]);
      /* retirer */
      const avantEve = (await e.get('/api/conversations')).j.conversations.length;
      v('population : Eve est dans l\'espace et dans son canal public', [avantEve, (await e.get('/api/espaces/' + E)).code], [1, 200]);
      v('⛔ Ben retire Eve (membre simple) : 200 ; Eve ne voit plus l\'espace NI ses canaux (404, la réponse d\'un espace inexistant)', [(await retirer(b, eve.id)).code, (await e.get('/api/espaces/' + E)).code, (await e.get('/api/conversations/' + pub0)).code, (await e.get('/api/conversations')).j.conversations.length, (await e.get('/api/espaces')).j.espaces.length], [200, 404, 404, 0, 0]);
      entrer(E, ana.id, gus.id); await role(a, gus.id, true);
      v('⛔ Ben ne retire pas le propriétaire (403), ni un autre administrateur (403) ; il ne se retire pas lui-même (400 : on part par « quitter ») ; un inconnu : 404', [(await retirer(b, ana.id)).code, (await retirer(b, gus.id)).code, (await retirer(b, ben.id)).code, (await retirer(b, fred.id)).code, (await retirer(b, 'p_x')).code], [403, 403, 400, 404, 400]);
      v('le propriétaire retire un administrateur (200)', [(await retirer(a, gus.id)).code, (await g.get('/api/espaces/' + E)).code], [200, 404]);
      /* quitter */
      const dd = await b.post('/api/conversations/directe', { uid: dan.id });
      v('population : Ben et Dan ont une directe de collègues (ouverte plus haut par Dan : 200)', dd.code, 200);
      v('⛔ Dan QUITTE l\'espace : 200, il en sort avec ses canaux ; sa directe avec Ben reste lisible mais on n\'y écrit plus (404) — plus collègues, pas contacts', [(await d.post('/api/espaces/' + E + '/quitter', {})).code, (await d.get('/api/espaces/' + E)).code, (await d.get('/api/conversations/' + pub0)).code, (await b.post('/api/conversations/' + dd.j.conversation.id + '/messages', { cid: 'cid-qui-000001', texte: 'tu es parti' })).code, (await b.get('/api/conversations/' + dd.j.conversation.id + '/messages')).code], [200, 404, 404, 404, 200]);
      v('⛔ le propriétaire ne quitte pas son espace : 409 `proprio` (il passe d\'abord la main) ; un non-membre qui « quitte » : 404', [(await a.post('/api/espaces/' + E + '/quitter', {})).j.error, (await d.post('/api/espaces/' + E + '/quitter', {})).code], ['proprio', 404]);
      v('le départ est RANGÉ dans le registre des purges (une archive d\'avant ne ramène pas Dan)', S.purgeLignes().some(x => x.genre === 'espace_membre' && x.objet.startsWith(E + '|' + dan.id + '|')), true);
      /* la propriété et la dissolution, dans un espace à part (E reste pour la suite) */
      const hal = pers('Hal'); const E3 = S.espaceCreer({ nom: 'Troisieme', proprio: ana.id }).id; payer(E3); entrer(E3, ana.id, ben.id); entrer(E3, ana.id, cleo.id); entrer(E3, ana.id, hal.id);
      const tr = (cli, uid) => cli.post('/api/espaces/' + E3 + '/transferer', { uid });
      v('⛔ passer la main : un membre simple ne le peut pas (403) ; vers soi-même (400), un étranger (404), un uid mal formé (400)', [(await tr(b, cleo.id)).code, (await tr(a, ana.id)).code, (await tr(a, fred.id)).code, (await tr(a, 'x')).code], [403, 400, 404, 400]);
      S.suppressionProgrammer(hal.id, Date.now() + JOUR);
      v('… vers un compte dont la suppression est programmée : 409 `destinataire_invalide`', (await tr(a, hal.id)).j.error, 'destinataire_invalide');
      const t1 = await tr(a, ben.id);
      v('⛔ Ana passe la main à Ben : il est propriétaire ET administrateur, Ana reste administrateur (la page le lit)', [t1.code, t1.j.espace.proprio, t1.j.moi.role, (await b.get('/api/espaces/' + E3)).j.espace.proprio, (await b.get('/api/espaces/' + E3)).j.moi.role], [200, false, 'admin', true, 'admin']);
      v('… Ana ne peut plus passer la main ni dissoudre (403), et peut maintenant partir (200)', [(await tr(a, cleo.id)).code, (await a.post('/api/espaces/' + E3 + '/supprimer', { confirmation: 'SUPPRIMER' })).code, (await a.post('/api/espaces/' + E3 + '/quitter', {})).code], [403, 403, 200]);
      const sup = (cli, corps) => cli.post('/api/espaces/' + E3 + '/supprimer', corps);
      const canalE3 = S.canalCreer({ espace: E3, par: ben.id, nom: 'equipe', prive: false }).id;
      S.messageEnvoyer({ conv: canalE3, auteur: ben.id, cid: 'cid-e3-000001', texte: 'à dissoudre' });
      v('⛔ dissoudre : la confirmation est exigée (400) ; un membre simple ne le peut pas (403) ; un abonnement qui COURT l\'interdit (409 `abonnement_actif`) — Stripe prélèverait pour rien', [(await sup(b, {})).j.error, (await sup(b, { confirmation: 'supprimer' })).j.error, (await sup(c, { confirmation: 'SUPPRIMER' })).code, (await sup(b, { confirmation: 'SUPPRIMER' })).j.error, S.espaceBrut(E3) !== null], ['confirmation_requise', 'confirmation_requise', 403, 'abonnement_actif', true]);
      S.abonnementPoser(E3, { client: 'cus_banc961', abonnement: 'sub_b961_' + E3.slice(2, 14), statut: 'canceled', places: 5, fin_periode: null, annule: true, impaye: false });
      const code3 = crypto.randomBytes(16).toString('base64url'); S.lienCreer({ h: sha(code3), genre: 'espace', cible: E3, par: ben.id, ttlMs: JOUR, max: 5 });
      const sd = await sup(b, { confirmation: 'SUPPRIMER' });
      v('⛔ résilié, le propriétaire dissout : 200 ; plus rien pour personne (404), ni canal, ni conversation, ni message, ni invitation vivante', [sd.code, sd.j.ok, (await b.get('/api/espaces/' + E3)).code, (await c.get('/api/conversations/' + canalE3)).code, (await c.get('/api/conversations')).j.conversations.filter(x => x.espace === E3).length, S.espaceBrut(E3), (await f.post('/api/invitations/lire', { code: code3 })).j.error], [200, true, 404, 404, 0, null, 'lien_invalide']);
      v('… et c\'est NOTÉ (l\'espace et son canal), pour qu\'une archive d\'avant ne les ramène pas', [S.purgeLignes().some(x => x.genre === 'espace' && x.objet === E3), S.purgeLignes().some(x => x.genre === 'conversation' && x.objet === canalE3)], [true, true]);
    }
    /* ═══ 5. LES CANAUX ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes canaux : des conversations — mêmes messages, accusés, pièces et flux ; un privé n\'est lu que par ses membres');
    {
      const creer = (cli, corps) => cli.post('/api/espaces/' + E + '/canaux', corps);
      const vus = async (cli) => (await cli.get('/api/espaces/' + E)).j.canaux.map(x => x.nom).sort();
      v('un membre simple ne crée pas de canal (403, jamais 402 : l\'appartenance passe avant la formule) ; un non-membre : 404', [(await creer(c, { nom: 'x' })).code, (await creer(y, { nom: 'x' })).code], [403, 404]);
      for (const mauvais of [{}, { nom: '' }, { nom: 'x'.repeat(81) }, { nom: 'ok', prive: 'oui' }, { nom: 'ok', prive: true, membres: 'ben' }, { nom: 'ok', prive: true, membres: ['x'] }, { nom: 'ok', prive: true, membres: Array.from({ length: 201 }, () => ben.id) }]) {
        const r = await creer(a, mauvais);
        if (r.code !== 400) v('une demande de canal invalide est refusée (400) : ' + JSON.stringify(mauvais).slice(0, 60), r.code, 400);
      }
      v('population : sept demandes invalides ont été jouées, aucun canal n\'est né', await vus(a), ['direction', 'général']);
      const cp = await creer(a, { nom: 'annonces', membres: [fred.id] });
      const idPub = cp.j.canal.id;
      v('Ana crée un canal PUBLIC : 201, avec la liste des canaux qu\'elle voit ; la liste de membres d\'un public est IGNORÉE (un public a pour membres ceux de l\'espace, Fred n\'en est pas)', [cp.code, cp.j.canal.nom, cp.j.canal.prive, cp.j.canaux.map(x => x.nom).sort(), S.membresActifs(idPub).slice().sort()], [201, 'annonces', false, ['annonces', 'direction', 'général'], [ana.id, ben.id, cleo.id].sort()]);
      const pr = await creer(a, { nom: 'rh', prive: true, membres: [cleo.id] });
      const idRh = pr.j.canal.id;
      v('⛔ un canal PRIVÉ : ses membres sont ceux qu\'on y met (Ana, Cleo) — Ben, administrateur de l\'espace, n\'y est pas et ne le voit pas (ni dans la liste, ni par la conversation)', [pr.code, pr.j.canal.prive, await vus(a), await vus(b), await vus(c), (await b.get('/api/conversations/' + idRh)).code, (await b.get('/api/conversations')).j.conversations.some(x => x.id === idRh)], [201, true, ['annonces', 'direction', 'général', 'rh'], ['annonces', 'direction', 'général'], ['annonces', 'général', 'rh'], 404, false]);
      v('un privé avec quelqu\'un qui n\'est pas de l\'espace : 400 `membre_inconnu`, et rien n\'est créé', [(await creer(a, { nom: 'dehors', prive: true, membres: [fred.id] })).j.error, (await vus(a)).length], ['membre_inconnu', 4]);
      /* ── la même mécanique que les conversations : messages, flux, accusés, réactions, pièces ── */
      const fc = await T.flux(c), fa = await T.flux(a);
      const m1 = await a.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000001', texte: 'Bonjour toute l\'équipe' });
      const ev = await fc.attendre(e2 => e2.event === 'message' && e2.data.seq === m1.j.seq && e2.data.conv === idPub);
      v('⛔ un message de canal est un message comme les autres : 201, il arrive par le FLUX SSE de chaque membre, avec un identifiant d\'événement', [m1.code, !!ev, typeof (ev || {}).id], [201, true, 'number']);
      v('… un renvoi avec le même `cid` ne crée rien de plus (idempotence)', [(await a.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000001', texte: 'Bonjour toute l\'équipe' })).j.deja, (await c.get('/api/conversations/' + idPub + '/messages')).j.messages.filter(m => m.type !== 'systeme').length], [true, 1]);
      const lu = await c.post('/api/conversations/' + idPub + '/lu', { seq: m1.j.seq });
      v('⛔ l\'accusé de lecture voyage comme dans un groupe : Ana reçoit « lu » de Cleo', [lu.code, !!(await fa.attendre(e2 => e2.event === 'lu' && e2.data.conv === idPub && e2.data.uid === cleo.id && e2.data.seq >= m1.j.seq))], [200, true]);
      v('une réaction, une réponse citée, une modification du texte : comme ailleurs', [(await c.post('/api/conversations/' + idPub + '/messages/reagir', { seq: m1.j.seq, emoji: '👍' })).code, (await c.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000002', texte: 'Merci', reponse_a: m1.j.seq })).code, (await a.post('/api/conversations/' + idPub + '/messages/modifier', { seq: m1.j.seq, texte: 'Bonjour à toute l\'équipe' })).code], [200, 201, 200]);
      const dep = await F_PIECES.deposer(c, { conv: idPub, genre: 'photo', corps: PNG });
      const ph = dep.code === 201 ? await c.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000003', type: 'photo', pieces: [{ id: dep.j.id, w: 8, h: 8 }] }) : { code: dep.code };
      v('⛔ une PHOTO se dépose dans un canal et s\'y envoie (même mécanique que les pièces) ; Ana la lit, un étranger non', [dep.code, ph.code, (await F_PIECES.lirePiece(a, dep.j.id)).code, (await F_PIECES.lirePiece(f, dep.j.id)).code], [201, 201, 200, 404]);
      v('le canal privé « rh » ne parle qu\'à ses membres : le flux de Ben ne reçoit rien de ce qu\'Ana y écrit', await (async () => { const fb = await T.flux(b); const mm = await a.post('/api/conversations/' + idRh + '/messages', { cid: 'cid-can-000004', texte: 'confidentiel RH' }); await fc.attendre(e2 => e2.event === 'message' && e2.data.seq === mm.j.seq && e2.data.conv === idRh); await T.dort(150); const n = fb.evenements.filter(e2 => (e2.event === 'message' || e2.event === 'lu') && e2.data && e2.data.conv === idRh).length; fb.fermer(); return [mm.code, n, (await b.get('/api/conversations/' + idRh + '/messages')).code, (await b.post('/api/conversations/' + idRh + '/messages', { cid: 'cid-can-000005', texte: 'je force' })).code]; })(), [201, 0, 404, 404]);
      fc.fermer(); fa.fermer();
      /* la modération : l'administrateur d'un canal supprime le message d'un autre ; un membre simple non */
      const mc = await c.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000006', texte: 'un message de Cleo' });
      const mb = await b.post('/api/conversations/' + idPub + '/messages', { cid: 'cid-can-000007', texte: 'un message de Ben' });
      const sup = (cli, seq) => cli.post('/api/conversations/' + idPub + '/messages/supprimer', { seq, pour: 'tous' });
      v('⛔ un membre simple ne supprime pas le message d\'un autre « pour tous » ; l\'administrateur du canal (celui de l\'espace) le fait', [(await sup(c, mb.j.seq)).code >= 400, (await sup(a, mc.j.seq)).code, (await c.get('/api/conversations/' + idPub + '/messages')).j.messages.find(m => m.seq === mc.j.seq).supprime], [true, 200, true]);
      /* ⛔ les routes des GROUPES refusent un canal : rien ne s'y passe */
      const avant = [S.membresActifs(idPub).length, S.convPourMembre(idPub, ana.id).conv.nom];
      const refus = [(await a.post('/api/conversations/' + idPub + '/membres/ajouter', { uids: [fred.id] })).code, (await a.post('/api/conversations/' + idPub + '/membres/retirer', { uid: cleo.id })).code, (await a.post('/api/conversations/' + idPub + '/admins', { uid: cleo.id, admin: true })).code, (await a.post('/api/conversations/' + idPub + '/lien', {})).code, (await a.post('/api/conversations/' + idPub + '/liens/revoquer', {})).code, (await a.post('/api/conversations/' + idPub + '/maj', { nom: 'pirate' })).code];
      v('⛔ les routes des GROUPES (ajouter, retirer, administrateur, lien, révocation, renommer) refusent un canal — aucune ne contourne les règles de l\'espace', [refus.every(x => x === 409 || x === 400), S.membresActifs(idPub).length, S.convPourMembre(idPub, ana.id).conv.nom, S.membresActifs(idPub).includes(fred.id)], [true, avant[0], avant[1], false]);
      /* renommer, supprimer : l'administrateur du canal, par la route de l'ESPACE */
      const maj = (cli, id, nom) => cli.post('/api/espaces/' + E + '/canaux/' + id + '/maj', { nom });
      v('renommer : l\'administrateur du canal (200, tous le voient) ; un membre simple (403) ; l\'administrateur de l\'espace qui n\'est pas dans le privé « rh » (404)', [(await maj(a, idPub, 'annonces-2026')).code, (await c.get('/api/conversations/' + idPub)).j.conversation.nom, (await maj(c, idPub, 'x')).code, (await maj(b, idRh, 'x')).code, (await maj(a, idPub, '')).code], [200, 'annonces-2026', 403, 404, 400]);
      /* le privé : qui y entre, qui en sort */
      const ajouter = (cli, id, uids) => cli.post('/api/espaces/' + E + '/canaux/' + id + '/membres/ajouter', { uids });
      const retirer = (cli, id, uid) => cli.post('/api/espaces/' + E + '/canaux/' + id + '/membres/retirer', { uid });
      v('⛔ ajouter à un canal PRIVÉ : un membre de l\'espace (200) ; un étranger (400 `membre_inconnu`) ; à un canal PUBLIC (409 `canal_public`) ; Ben, qui n\'est pas dans « rh », ne peut pas y ajouter (404)', [(await ajouter(a, idRh, [ben.id])).j.ajoutes, (await ajouter(a, idRh, [fred.id])).j.error, (await ajouter(a, idPub, [ben.id])).j.error, (await ajouter(y, idRh, [ben.id])).code], [[ben.id], 'membre_inconnu', 'canal_public', 404]);
      v('Ben, ajouté, lit « rh » depuis son arrivée seulement (pas le message d\'avant)', (await b.get('/api/conversations/' + idRh + '/messages')).j.messages.filter(m => m.type !== 'systeme').map(m => m.texte), []);
      v('⛔ retirer d\'un canal privé : 200, noté dans le registre ; d\'un public : 409 ; soi-même : 400', [(await retirer(a, idRh, ben.id)).code, S.purgeLignes().some(x => x.genre === 'canal_membre' && x.objet.startsWith(idRh + '|' + ben.id + '|')), (await retirer(a, idPub, cleo.id)).j.error, (await retirer(a, idRh, ana.id)).code, (await b.get('/api/conversations/' + idRh)).code], [200, true, 'canal_public', 400, 404]);
      v('⛔ quitter : un canal PUBLIC ne se quitte pas (409 `canal_public` — on en sort avec l\'espace) ; un privé se quitte (200), personne n\'est promu à la place', [(await c.post('/api/conversations/' + idPub + '/quitter', {})).j.error, (await c.post('/api/conversations/' + idRh + '/quitter', {})).code, S.membresActifs(idRh).join(), roleCanalDe(S, idRh, ana.id)], ['canal_public', 200, ana.id, 'admin']);
      /* supprimer */
      const supc = (cli, id, corps) => cli.post('/api/espaces/' + E + '/canaux/' + id + '/supprimer', corps);
      v('⛔ supprimer un canal : la confirmation est exigée (400) ; un membre simple non (403) ; l\'administrateur oui (200), et le canal disparaît pour tous (404), messages compris', [(await supc(a, idPub, {})).j.error, (await supc(c, idPub, { confirmation: 'SUPPRIMER' })).code, (await supc(a, idPub, { confirmation: 'SUPPRIMER' })).code, (await c.get('/api/conversations/' + idPub)).code, (await a.get('/api/conversations/' + idPub + '/messages')).code, S.purgeLignes().some(x => x.genre === 'conversation' && x.objet === idPub)], ['confirmation_requise', 403, 200, 404, 404, true]);
      /* un canal cherché par le chemin d'un AUTRE espace, ou mal formé : introuvable */
      v('un canal cherché dans l\'espace d\'un autre, ou par un identifiant mal formé : 404 (pas 400, pas 500)', [(await z.post('/api/espaces/' + E2 + '/canaux/' + idRh + '/maj', { nom: 'x' })).code, (await a.post('/api/espaces/' + E + '/canaux/x/maj', { nom: 'x' })).code, (await a.post('/api/espaces/' + E + '/canaux/c_' + '0'.repeat(32) + '/supprimer', { confirmation: 'SUPPRIMER' })).code], [404, 404, 404]);
    }
    /* ═══ 6. SANS CLÉ STRIPE : INERTE, ET LE DIT ══════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nSans clé Stripe : l\'abonnement est inerte, et il le dit (jamais un bouton qui ne mène nulle part)');
    {
      const o = await a.get('/api/facturation/offres');
      v('les offres : « pas encore ouvert », aucune offre, aucun prix ni identifiant de tarif', [o.code, o.j.ouvert, o.j.motif, o.j.offres, o.j.tout_ouvert, /price_|rk_|sk_/.test(o.txt)], [200, false, 'abonnement_pas_ouvert', [], false, false]);
      v('⛔ payer, ouvrir le portail, relire : 503 `abonnement_non_ouvert` (la garde du propriétaire a passé, la facturation est inerte)', [(await a.post('/api/espaces/' + E + '/facturation/paiement', { places: 3 })).j.error, (await a.post('/api/espaces/' + E + '/facturation/portail', {})).j.error, (await a.post('/api/espaces/' + E + '/facturation/relire', {})).j.error], ['abonnement_non_ouvert', 'abonnement_non_ouvert', 'abonnement_non_ouvert']);
      const et = await a.get('/api/espaces/' + E + '/facturation/etat');
      v('l\'état d\'un espace payé (rangé) se lit sans réseau : ouvert faux, payé, 5 places, 3 membres — sans identifiant d\'abonnement ni de client', [et.code, et.j.ouvert, et.j.abonnement.statut, et.j.abonnement.places, et.j.formule, et.j.places, et.j.membres, /sub_|cus_|cs_/.test(et.txt)], [200, false, 'active', 5, 'pro', 5, 3, false]);
      v('un membre simple ne lit pas l\'état (403) ; un non-membre : 404', [(await c.get('/api/espaces/' + E + '/facturation/etat')).code, (await y.get('/api/espaces/' + E + '/facturation/etat')).code], [403, 404]);
      v('⛔ payer : réservé au PROPRIÉTAIRE — Ben, administrateur, reçoit 403 (il ne dépense pas l\'argent de l\'entreprise)', [(await b.post('/api/espaces/' + E + '/facturation/paiement', { places: 3 })).code, (await b.post('/api/espaces/' + E + '/facturation/portail', {})).code], [403, 403]);
    }

    /* ═══ 7. LES PLAFONDS ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLes plafonds par personne : espaces, canaux, liens — 429 avec « Retry-After », jamais un 500');
    {
      const P = await monter({ formule: { toutOuvert: false }, quotas: { espace_creer: { max: 2, fenetreMs: 3600000 }, canal: { max: 2, fenetreMs: 3600000 }, lien: { max: 2, fenetreMs: 3600000 }, lien_ip: { max: 4, fenetreMs: 60000 } } });
      try {
        const own = P.pers('Pro'), mem = P.pers('Membre');
        const EP = P.S.espaceCreer({ nom: 'Plafonds', proprio: own.id }).id; P.payer(EP, { places: 50 }); P.entrer(EP, own.id, mem.id);
        const po = P.cl(own), pm = P.cl(mem);
        const r = [];
        for (let i = 0; i < 3; i++) r.push(await pm.post('/api/espaces', { nom: 'Espace ' + i }));
        v('⛔ créer un espace : deux par heure (réglage de ce banc), le troisième est refusé 429 `quota_atteint` avec `Retry-After`', [r.map(x => x.code), r[2].j.error, Number(r[2].h.get('retry-after')) > 0, P.S.espacesDe(mem.id).filter(x => x.proprio === mem.id).length], [[201, 201, 429], 'quota_atteint', true, 2]);
        const k = [];
        for (let i = 0; i < 3; i++) k.push(await po.post('/api/espaces/' + EP + '/canaux', { nom: 'canal' + i }));
        v('⛔ créer un canal : le troisième est refusé (429)', [k.map(x => x.code), Number(k[2].h.get('retry-after')) > 0], [[201, 201, 429], true]);
        const l = [];
        for (let i = 0; i < 3; i++) l.push(await po.post('/api/espaces/' + EP + '/invitations', {}));
        v('⛔ créer un lien d\'invitation : le troisième est refusé (429)', [l.map(x => x.code), Number(l[2].h.get('retry-after')) > 0], [[201, 201, 429], true]);
        const inconnu = crypto.randomBytes(16).toString('base64url');
        const devine = [];
        for (let i = 0; i < 6; i++) devine.push((await pm.post('/api/invitations/lire', { code: inconnu })).code);
        v('⛔ deviner des codes d\'invitation est limité PAR RÉSEAU (4 par minute ici) : 410, 410, 410, 410, puis 429', devine, [410, 410, 410, 410, 429, 429]);
        v('les refus de plafond n\'ont rien créé : trois espaces dans la liste de Membre (le sien et deux nés), deux canaux, trois liens (celui de la fixture et les deux nés)', [P.S.espacesDe(mem.id).length, P.S.canauxVisibles(EP, own.id).length, P.S.invitationsVivantes(EP)], [3, 2, 3]);
      } finally { await P.fermer(); }
    }

    /* ═══ 8. LA BÊTA : TOUT EST OUVERT, SANS PAIEMENT ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nLa bêta : tout est ouvert, sans paiement, le drapeau lu à un seul endroit — et la production, elle, ne l\'est pas');
    {
      const B = await monter({}, 'beta');
      try {
        const nouv = B.pers('Nouvelle'), invite = B.pers('Invite');
        const n = B.cl(nouv), i = B.cl(invite);
        const r0 = await n.get('/api/espaces');
        v('sur la bêta, une personne sans espace a déjà la formule Pro', [r0.code, r0.j.formule, r0.j.espaces], [200, 'pro', []]);
        const cr = await n.post('/api/espaces', { nom: 'Bêta ouverte' });
        v('⛔ elle crée un espace (201) sans rien payer ; l\'administrateur lit « Pro, bêta, places non comptées »', [cr.code, cr.j.fonctions_pro, cr.j.admin.formule, cr.j.admin.motif, cr.j.admin.places], [201, true, 'pro', 'beta', null]);
        const id = cr.j.espace.id;
        const inv = await n.post('/api/espaces/' + id + '/invitations', { max: 100 });
        v('… elle invite jusqu\'à cent personnes d\'un lien (aucune limite de places en bêta) et crée un canal', [inv.code, inv.j.max, (await n.post('/api/espaces/' + id + '/canaux', { nom: 'bêta' })).code, (await i.post('/api/invitations/accepter', { code: inv.j.code })).code], [201, 100, 201, 200]);
        const o = await n.get('/api/facturation/offres');
        v('l\'abonnement y est inerte aussi (aucune clé Stripe) mais la page sait que tout est ouvert', [o.j.ouvert, o.j.tout_ouvert], [false, true]);
        const h = (await T.client(B.svc.base).get('/health')).j;
        v('⛔ /health dit le drapeau et des nombres, jamais un espace', [h.facturation.toutOuvert, h.facturation.espaces, h.facturation.mode, /\b[pcemf]_[0-9a-f]{32}\b/.test(JSON.stringify(h))], [true, 1, 'inerte', false]);
      } finally { await B.fermer(); }
    }

    /* ═══ 9. CE QUE LE SERVICE NE DIT NI NE GARDE ═════════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nRien d\'identifiant dans /health ni dans les journaux : ni nom d\'espace, ni code d\'invitation, ni texte');
    {
      const h = await T.client(svc.base).get('/health');
      const journal = svc.sortie.texte();
      vrai('population : le service a travaillé (le nom de l\'espace est bien rangé chez lui, scellé ; deux espaces vivent) et son journal existe (il dit son démarrage)', S.espacePourMembre(E, ana.id).espace.nom === NOM_E && h.j.facturation.espaces === 2 && journal.includes('"evt":"demarre"'));
      v('⛔ /health : des nombres agrégés — aucun identifiant d\'espace, de personne ou de conversation, aucun nom', [/\b[pcemf]_[0-9a-f]{32}\b/.test(h.txt), /ZXCANARIQ|ENTREPRISE|AUTREENTREPRISE/.test(h.txt)], [false, false]);
      v('⛔ le journal du service ne contient ni nom d\'espace, ni code d\'invitation, ni texte de message, ni nom de personne', [journal.includes(NOM_E), journal.includes('AUTREENTREPRISEZXQ'), journal.includes(code1), journal.includes('Bonjour toute'), journal.includes('confidentiel RH'), /Ana Banc|Ben Banc/.test(journal)], [false, false, false, false, false, false]);
      const mal = svc.sortie.texte().split('\n').filter(l => /"evt":"(erreur|erreur_interne)"/.test(l));
      v('aucune erreur interne pendant tout ce banc (un 500 aurait laissé une ligne)', mal.length, 0);
    }
  } catch (er) {
    console.log('  ✗ le banc est mort : ' + (er && er.stack || er));
    console.log(svc.sortie.texte().slice(-1200));
    process.exitCode = 1;
  }
  await M.fermer();
  fin();
})();
