/* ⛔ CE QUE CE FICHIER GARDE — « EXPORTER MES DONNÉES » ET « SUPPRIMER MON COMPTE » (famille 6, étape 2).

   Le VRAI service (comptes par numéro de téléphone, un FAUX OVH pour les codes, une horloge décalable), une base écrite aussi par un second processus pour les grosses données.

   L'EXPORT — le geste le plus coûteux d'une personne, et celui qui peut le plus facilement dire ce qu'il ne doit pas :
     · CONTENU EXACT : les conversations dont elle est membre, les messages qu'elle peut y LIRE (texte déchiffré, auteur, date, réponse, réactions, pièces listées sans leur contenu), ses contacts, ses
       réglages, ses notifications — dans l'ordre ;
     · RIEN D'UN AUTRE : une conversation dont elle n'est pas membre (le canari d'une conversation entre deux autres), un message d'AVANT son arrivée dans un groupe, un message supprimé « pour moi »,
       le texte d'un message supprimé « pour tous » (la pierre tombale reste, sans texte), le numéro de téléphone de QUI QUE CE SOIT (le sien compris : le service ne le rend à personne),
       son jeton de session ;
     · UN PAR JOUR (429 `export_quotidien`), le créneau revient avec la journée ; un export abandonné en route RENDRE son créneau ;
     · AU FIL DE L'EAU et PLAFONNÉ : le fichier d'une grosse conversation est un JSON valide, écrit par morceaux (pas de longueur annoncée), et se termine proprement avec `tronque` quand le plafond est atteint.
   LA SUPPRESSION — en deux temps :
     · LE PREMIER, À L'INSTANT : la confirmation est un MOT (400 sans lui) ; toutes les sessions (l'appareil d'où l'on demande ET les autres), les jetons d'appareil, les abonnements push, les liens d'invitation
       sont coupés, le flux est fermé, les cookies sont effacés ; la personne n'est plus trouvée par numéro, et un appareil qu'on aurait ré-inscrit ne la reconnecte PAS sans code ;
     · SE RECONNECTER AVANT L'ÉCHÉANCE L'ANNULE (le code SMS, la porte bêta), et la réponse le DIT ;
     · LE SECOND, À J+14 (horloge décalée) : l'identité part (numéro, nom, photo, réglages, contacts, notifications, appareils), la ligne reste VIDE, les groupes sont quittés (le dernier administrateur passe
       la main, le dernier membre emporte le groupe), les pièces jamais envoyées et la photo de profil sont effacées du disque, les messages ENVOYÉS restent chez les autres — signés « Compte supprimé » — avec leurs pièces ;
       écrire à un compte supprimé répond 410 ; et le numéro se réinscrit à NEUF, sans rien retrouver.
   ⛔ Une assertion « absent » est précédée de la preuve que la chose était PRÉSENTE avant (canari présent dans ce qu'on envoie, pièce présente sur le disque avant l'effacement). */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto'), http = require('http');
const T = require('./outils-msg');
const TEL = require('./outils-tel');
const F = require('./outils-pieces');
const P = require('./outils-push');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const { JOUR, HEURE } = TEL;
const sha = (x) => crypto.createHash('sha256').update(x).digest('hex');
const LARGE = { budgetJour: 5000, budgetHeure: 5000, budgetPaysJour: 5000, budgetPaysHeure: 5000, emballement: { plancher: 100000 } };
const PNG = F.png();

setTimeout(() => { console.log('  ✗ délai global du banc dépassé (240 s)'); process.exit(1); }, 240000).unref();

let cidN = 0;
const nouveauCid = () => 'cid-957-' + String(++cidN).padStart(7, '0');
const cookieDe = (c, nom) => { const m = new RegExp('(?:^|; )' + nom + '=([^;]+)').exec(c.enteteCookie()); return m ? m[1] : null; };

(async () => {
  const og = await T.fauxOpGestion({
    eve: { pass: 'pw-eve-123456', nom: 'Eve Beta', actif: true },
    xan: { pass: 'pw-xan-123456', nom: 'Xan Lourd', actif: true }, yan: { pass: 'pw-yan-123456', nom: 'Yan Lourd', actif: true }, zan: { pass: 'pw-zan-123456', nom: 'Zan Lourd', actif: true },
    wen: { pass: 'pw-wen-123456', nom: 'Wen Lourd', actif: true }, vin: { pass: 'pw-vin-123456', nom: 'Vin Lourd', actif: true },
  });
  const fps = await P.fauxServicePush();
  const svc = await TEL.lancerTel({ urlGestion: og.url, sms: LARGE, config: { balayageMs: 150, push: { ackMs: 1500, contact: 'mailto:exploitation@exemple.invalid' }, compte: { exportOctetsMax: 60000 } }, env: { OPMSG_TEST_PUSH: fps.hote } });
  let decalage = 0;        // ce dont l'horloge du service a avancé : « maintenant » pour lui = Date.now() + decalage
  const avancer = (ms) => { decalage += ms; svc.avancer(ms); };
  const lourds = [];       // les services de la partie « grosses données », à arrêter quoi qu'il arrive
  const dossiersLourds = [];
  const flux = [];
  const S = ouvrir({ chemin: path.join(svc.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(svc.cle, 'hex')) });
  const sql = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).get(...args); } finally { d.close(); } };
  const tous = (req, ...args) => { const d = T.lireBase(path.join(svc.data, 'msg.db')); try { return d.prepare(req).all(...args); } finally { d.close(); } };
  const ecrire = async (c, conv, texte) => { const r = await c.post('/api/conversations/' + conv + '/messages', { cid: nouveauCid(), texte }); if (r.code !== 201) throw new Error('message refusé (' + r.code + ') : ' + JSON.stringify(r.j)); return r.j; };
  const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); const r = await y.post('/api/liens/accepter', { code: l.j.code }); if (r.code !== 200) throw new Error('lien refusé : ' + r.code); };
  const fichierPiece = (id) => path.join(svc.data, 'pieces', id.slice(2, 4), id);
  const abosDe = (uid) => sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uid).n;
  const etatDe = (uid) => sql('SELECT etat, suppression_le FROM personne WHERE id = ?', uid);
  try {
    /* ═══ 0. LA DISTRIBUTION : quatre personnes par numéro, des conversations, des canaris ═══════════════════════════════════════════════ */
    const nA = TEL.numeroBE(), nB = TEL.numeroBE(), nC = TEL.numeroBE(), nD = TEL.numeroBE();
    const A = await TEL.inscrire(svc, nA, 'Alice'), B = await TEL.inscrire(svc, nB, 'Bob'), C = await TEL.inscrire(svc, nC, 'Cleo'), D = await TEL.inscrire(svc, nD, 'Dan');
    await relier(A, B); await relier(A, C); await relier(B, C); await relier(B, D);
    const AB = (await A.post('/api/conversations/directe', { uid: B.moi.id })).j.conversation.id;
    const BC = (await B.post('/api/conversations/directe', { uid: C.moi.id })).j.conversation.id;
    const BD = (await B.post('/api/conversations/directe', { uid: D.moi.id })).j.conversation.id;
    const G = (await B.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [A.moi.id, C.moi.id] })).j.conversation.id;
    const H = (await B.post('/api/conversations/groupe', { nom: 'Équipe du matin', membres: [A.moi.id] })).j.conversation.id;

    const m1 = await ecrire(B, AB, 'CANARI-AB-un');
    const m2 = await ecrire(A, AB, 'CANARI-AB-deux');
    const m3 = await ecrire(B, AB, 'CANARI-AB-trois-supprime-pour-tous');
    const m4 = await ecrire(A, AB, 'CANARI-AB-quatre-supprime-pour-moi');
    await B.post('/api/conversations/' + AB + '/messages/modifier', { seq: m1.seq, texte: 'CANARI-AB-un-modifie' });
    await B.post('/api/conversations/' + AB + '/messages/reagir', { seq: m2.seq, emoji: '👍' });
    await B.post('/api/conversations/' + AB + '/messages/supprimer', { seq: m3.seq, pour: 'tous' });
    await A.post('/api/conversations/' + AB + '/messages/supprimer', { seq: m4.seq, pour: 'moi' });
    const photoA = (await F.deposer(A, { conv: AB, genre: 'photo', corps: PNG })).j.id;
    const photoEnvoyee = await A.post('/api/conversations/' + AB + '/messages', { cid: nouveauCid(), type: 'photo', pieces: [{ id: photoA, w: 8, h: 8 }] });
    await ecrire(B, BC, 'CANARI-BC-SECRET');
    await ecrire(C, BC, 'CANARI-BC-retour');
    await ecrire(B, G, 'CANARI-G-bob'); await ecrire(A, G, 'CANARI-G-alice'); await ecrire(C, G, 'CANARI-G-cleo');
    await ecrire(B, H, 'AVANT-DAN-1'); await ecrire(B, H, 'AVANT-DAN-2');
    const ajout = await B.post('/api/conversations/' + H + '/membres/ajouter', { uids: [D.moi.id] });
    await ecrire(B, H, 'APRES-DAN-1');
    const orphelineA = (await F.deposer(A, { conv: AB, genre: 'photo', corps: PNG })).j.id;
    const avatarA = (await F.deposer(A, { genre: 'avatar', corps: PNG })).j.id;
    await A.post('/api/moi/avatar', { piece: avatarA });
    await A.post('/api/moi/confidentialite', { trouvable: 'tous' });

    console.log('La distribution : les canaris sont bien posés (population avant tout verdict « absent »)');
    v('trois conversations pour Alice (AB, G, H), une pour Bob et Cléo seuls (BC), une pour Bob et Dan (BD)', [AB, G, H, BC, BD].every(x => /^c_[0-9a-f]{32}$/.test(x)), true);
    vrai('Dan a été ajouté au groupe H APRÈS deux messages', ajout.code === 200 && (await D.get('/api/conversations/' + H)).j.moi.depuis_seq > 2);
    vrai('Bob a bien écrit dans la conversation BC, dont Alice ne fait pas partie', (await B.get('/api/conversations/' + BC + '/messages')).j.messages.some(m => m.texte === 'CANARI-BC-SECRET') && (await A.get('/api/conversations/' + BC)).code === 404);
    vrai('population : la photo envoyée, la photo jamais envoyée et la photo de profil existent sur le disque', [photoA, orphelineA, avatarA].every(id => fs.existsSync(fichierPiece(id))) && photoEnvoyee.code === 201);

    /* ═══ 1. L'EXPORT D'ALICE : CONTENU EXACT ══════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'export d\'Alice : un fichier JSON téléchargé, le contenu exact');
    const numerosDigits = [nA, nB, nC, nD].map(n => n.replace('+', ''));
    const hashA = (() => { const r = sql('SELECT email_h AS h FROM personne WHERE id = ?', A.moi.id); return Buffer.isBuffer(r.h) ? r.h.toString('hex') : String(r.h); })();
    const jetonA = cookieDe(A, 'opm'), appareilA = cookieDe(A, 'opma');
    const ex = await A.post('/api/compte/export', {});
    const E = ex.j;
    v('l\'export répond 200 et son corps est du JSON valide', [ex.code, E && E.format], [200, 'opmessages-export-v1']);
    v('c\'est un TÉLÉCHARGEMENT (attachment, nom daté), jamais mis en cache, écrit au fil de l\'eau (pas de longueur annoncée)', [/^attachment; filename="opmessages-export-\d{4}-\d{2}-\d{2}\.json"$/.test(ex.h.get('content-disposition')), ex.h.get('cache-control'), /application\/json/.test(ex.h.get('content-type')), ex.h.get('content-length')], [true, 'no-store', true, null]);
    v('le profil : son identifiant, son prénom et son nom', [E.profil.id, E.profil.prenom, E.profil.nom], [A.moi.id, 'Alice', 'Banc']);
    v('les réglages (présence, accusés, aperçu des notifications, qui me trouve)', E.reglages, { presence: true, accuses: true, apercu_notif: false, trouvable: 'tous' });
    v('les contacts d\'Alice : Bob et Cléo (pas Dan)', E.contacts.map(c => c.prenom).sort(), ['Bob', 'Cleo']);
    const conv = Object.fromEntries(E.conversations.map(c => [c.id, c]));
    v('⛔ les conversations d\'Alice : AB, G, H — PAS BC (entre deux autres), PAS BD', Object.keys(conv).sort(), [AB, G, H].sort());
    const vue = (c) => c.messages.filter(m => m.type !== 'systeme').map(m => [m.seq, m.de, m.type, m.texte, m.supprime]);
    const activite = (c) => c.messages.filter(m => m.type === 'systeme').map(m => [m.evenement && m.evenement.type, m.evenement && m.evenement.cible]);
    v('AB : les messages qu\'Alice peut lire, dans l\'ordre — texte déchiffré, « moi », pierre tombale SANS texte, le message supprimé « pour moi » ABSENT', vue(conv[AB]),
      [[1, 'Bob Banc', 'texte', 'CANARI-AB-un-modifie', false], [2, 'moi', 'texte', 'CANARI-AB-deux', false], [3, 'Bob Banc', 'texte', null, true], [5, 'moi', 'photo', null, false]]);
    v('AB : une conversation directe n\'a aucune « activité de groupe »', activite(conv[AB]), []);
    vrai('AB : le message modifié dit QUAND, le deuxième porte la réaction de Bob', conv[AB].messages[0].modifie_le !== null && JSON.stringify(conv[AB].messages[1].reactions) === JSON.stringify([{ emoji: '👍', par: 'Bob Banc' }]));
    v('AB : la photo envoyée est LISTÉE (identifiant, taille) — pas son contenu', [conv[AB].messages[3].pieces.length, conv[AB].messages[3].pieces[0].id, conv[AB].messages[3].pieces[0].taille > 0], [1, photoA, true]);
    v('G : trois messages, de trois auteurs', vue(conv[G]).map(x => [x[1], x[3]]), [['Bob Banc', 'CANARI-G-bob'], ['moi', 'CANARI-G-alice'], ['Cleo Banc', 'CANARI-G-cleo']]);
    v('⛔ G : la création du groupe figure AVEC son évènement (un message d\'activité sans texte ne se montre pas comme un message vide)', activite(conv[G]), [['groupe_cree', undefined]]);
    v('G : le nom du groupe, son rôle, ses membres', [conv[G].nom, conv[G].mon_role, conv[G].membres.map(m => m.prenom).sort()], ['Chantier Nord', 'membre', ['Alice', 'Bob', 'Cleo']]);
    v('H : Alice y était dès le début, elle lit les trois messages', vue(conv[H]).map(x => x[3]), ['AVANT-DAN-1', 'AVANT-DAN-2', 'APRES-DAN-1']);
    v('H : elle lit aussi l\'activité — la création, puis l\'arrivée de Dan (cible nommée)', activite(conv[H]), [['groupe_cree', undefined], ['membre_ajoute', 'Dan Banc']]);
    v('les pièces d\'Alice sont listées (genre, taille) : deux photos et sa photo de profil — sans contenu', E.pieces.map(p => p.genre).sort(), ['avatar', 'photo', 'photo']);
    v('rien n\'a été tronqué', [E.tronque, E.pieces_tronquees === undefined], [null, true]);
    vrai('l\'export contient un avertissement qui dit que le numéro n\'y est pas (ce n\'est pas un oubli)', /numéro de téléphone n'y figure pas/.test(E.avertissement));
    const brut = ex.txt;
    vrai('population : le texte brut de l\'export est lu en entier (' + brut.length + ' octets) et contient bien des canaris d\'Alice', brut.includes('CANARI-AB-deux') && brut.includes('CANARI-G-cleo') && brut.length > 1500);
    v('⛔ RIEN D\'UN AUTRE dans le texte brut : ni le canari de la conversation BC, ni le texte supprimé « pour tous », ni le supprimé « pour moi »', ['CANARI-BC', 'trois-supprime', 'quatre-supprime'].map(x => brut.includes(x)), [false, false, false]);
    v('⛔ aucun numéro de téléphone (celui d\'Alice, de Bob, de Cléo, de Dan), ni l\'empreinte du sien, ni son jeton de session ou d\'appareil', [...numerosDigits.map(n => brut.includes(n)), brut.includes(hashA), brut.includes(jetonA), brut.includes(appareilA)], [false, false, false, false, false, false, false]);
    vrai('population : l\'empreinte du numéro d\'Alice existe bien en base (' + hashA.slice(0, 6) + '…), le jeton de session aussi', hashA.length >= 32 && !!jetonA && !!appareilA);
    vrai('(l\'export d\'Alice pèse ' + brut.length + ' octets, loin du plafond de 60 000 que ce banc a posé : il n\'est pas tronqué par accident)', brut.length < 30000);

    console.log('\nL\'export des autres : chacun ne lit que ce qu\'il voit');
    {
      const eb = (await B.post('/api/compte/export', {})).j;
      v('Bob voit AB, BC, BD, G, H — et BC contient bien le canari que l\'export d\'Alice n\'avait pas', [eb.conversations.map(c => c.id).sort(), JSON.stringify(eb).includes('CANARI-BC-SECRET')], [[AB, BC, BD, G, H].sort(), true]);
      const ed = (await D.post('/api/compte/export', {})).j;
      const dh = ed.conversations.find(c => c.id === H);
      v('⛔ Dan, ajouté au groupe H après deux messages : il n\'y lit que ce qui est arrivé APRÈS lui (son propre ajout, puis le message)', [dh.messages.map(m => m.type === 'systeme' ? 'activité:' + m.evenement.type : m.texte), JSON.stringify(ed).includes('AVANT-DAN')], [['activité:membre_ajoute', 'APRES-DAN-1'], false]);
      v('et Dan n\'est que dans H et BD', ed.conversations.map(c => c.id).sort(), [BD, H].sort());
    }

    console.log('\nUn export par jour : le créneau revient avec la journée');
    {
      const deux = await A.post('/api/compte/export', {});
      v('⛔ le 2e export du jour → 429 export_quotidien (un par jour), qui dit quand réessayer', [deux.code, deux.j.error, Number(deux.h.get('retry-after')) > 0], [429, 'export_quotidien', true]);
      v('sans session → 401', (await T.client(svc.base).post('/api/compte/export', {})).code, 401);
      avancer(25 * HEURE);
      const trois = await A.post('/api/compte/export', {});
      v('25 heures plus tard, l\'export revient (200)', [trois.code, trois.j && trois.j.format], [200, 'opmessages-export-v1']);
    }

    /* ═══ 2. SUPPRIMER SON COMPTE (Alice) : TOUT EST COUPÉ À L'INSTANT, SE RECONNECTER ANNULE ═══════════════════════════════════════════ */
    console.log('\nSupprimer son compte : la confirmation est un MOT, TOUT est coupé à l\'instant');
    const A2 = T.client(svc.base, { xff: TEL.reseauNeuf() });
    avancer(61 * 1000);
    await A2.post('/api/tel/code', { numero: nA });
    const second = await A2.post('/api/tel/verifier', { numero: nA, code: await svc.code(nA), appareil: 'Second téléphone' });
    const apA = P.appareil(fps.endpoint('alice-tel'));
    await A.post('/api/push/abonner', { sub: apA.sub });
    const fl = await T.flux(A); flux.push(fl);
    await fl.attendre(e => e.event === 'bonjour');
    const lienA = (await A.post('/api/contacts/lien', {})).j.code;
    const chercheur = await D.post('/api/contacts/chercher', { numero: nA });
    v('population : Alice a DEUX sessions ouvertes, un flux, un abonnement push, un jeton par appareil, un lien valable, et Dan la trouve par son numéro',
      [(await A.get('/api/moi')).code, second.code, (await A2.get('/api/moi')).code, abosDe(A.moi.id), sql('SELECT COUNT(*) AS n FROM appareil_tel WHERE personne = ?', A.moi.id).n >= 2, (await B.post('/api/liens/lire', { code: lienA })).code, chercheur.j.trouve],
      [200, 200, 200, 1, true, 200, true]);
    {
      const refus = [['sans corps', {}], ['un mot en minuscules', { confirmation: 'supprimer' }], ['un booléen', { confirmation: true }], ['le mot avec un espace', { confirmation: 'SUPPRIMER ' }], ['un autre mot', { confirmation: 'OUI' }], ['un objet', { confirmation: { a: 1 } }]];
      const rs = [];
      for (const [, corps] of refus) rs.push(await A.post('/api/compte/supprimer', corps));
      v('⛔ sans LE mot « SUPPRIMER » (' + refus.map(r => r[0]).join(', ') + ') → 400 confirmation_requise', rs.map(r => [r.code, r.j.error]), refus.map(() => [400, 'confirmation_requise']));
      v('population : rien n\'a été programmé par ces refus, Alice est toujours connectée', [etatDe(A.moi.id).suppression_le, (await A.get('/api/moi')).code], [null, 200]);
      v('sans session → 401', (await T.client(svc.base).post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' })).code, 401);
    }
    const avantSuppr = Date.now() + decalage;
    const suppr = await A.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
    v('Alice confirme → 200, avec la date de l\'effacement', [suppr.code, suppr.j.ok], [200, true]);
    vrai('⛔ la date est à QUATORZE jours (à cinq minutes près)', Math.abs(suppr.j.suppression_le - (avantSuppr + 14 * JOUR)) < 5 * 60000);
    vrai('la base porte la même échéance', etatDe(A.moi.id).suppression_le === suppr.j.suppression_le && etatDe(A.moi.id).etat === 'actif');
    v('⛔ les DEUX cookies (session et appareil) sont effacés dans la réponse', [A.cookie(), cookieDe(A, 'opma')], [null, null]);
    v('⛔ la session d\'où l\'on a demandé ET celle de l\'autre téléphone sont coupées : 401 partout', [(await A.get('/api/moi')).code, (await A2.get('/api/moi')).code], [401, 401]);
    vrai('⛔ le flux ouvert d\'Alice est fermé par le service', await fl.attendreFerme(4000));
    v('⛔ plus aucune session, plus aucun jeton d\'appareil, plus aucun jeton de sécurité, plus aucun abonnement push', ['session WHERE personne', 'appareil_tel WHERE personne', 'jeton WHERE personne', 'push WHERE uid'].map(t => sql('SELECT COUNT(*) AS n FROM ' + t + ' = ?', A.moi.id).n), [0, 0, 0, 0]);
    v('⛔ son lien d\'invitation ne marche plus (410)', (await B.post('/api/liens/lire', { code: lienA })).code, 410);
    {
      /* la recherche de Dan (plus haut) date d'AVANT la demande : l'ajout se revérifie au moment d'ajouter, et un compte qui va disparaître n'entre plus dans un carnet d'adresses */
      const dejaDansLeCarnet = (await D.get('/api/contacts')).j.contacts.some(c => c.id === A.moi.id);
      const tardif = await D.post('/api/contacts/ajouter', { id: A.moi.id });
      v('⛔ Dan ajoute Alice depuis sa recherche d\'AVANT la demande de suppression : refusé 404 introuvable, et rien n\'est ajouté', [dejaDansLeCarnet, tardif.code, tardif.j && tardif.j.error, (await D.get('/api/contacts')).j.contacts.some(c => c.id === A.moi.id)], [false, 404, 'introuvable', false]);
    }
    v('⛔ Dan ne la trouve plus par son numéro (un compte qui va disparaître n\'est trouvé par personne)', (await (async () => { avancer(61000); return D.post('/api/contacts/chercher', { numero: nA }); })()).j.trouve, false);
    vrai('pendant les quatorze jours, rien ne change pour les autres : Bob la voit toujours dans ses contacts et la conversation existe', (await B.get('/api/contacts')).j.contacts.some(c => c.id === A.moi.id) && (await B.get('/api/conversations/' + AB)).code === 200);

    /* un appareil dont le jeton serait RÉ-INSCRIT (course, restauration) ne reconnecte pas une suppression programmée */
    console.log('\nSe reconnecter annule la suppression ; un jeton d\'appareil ne suffit pas');
    {
      S.telAppareilLier({ h: sha(appareilA), personne: A.moi.id, nom: 'jeton ré-inscrit', ttlMs: 180 * JOUR });
      vrai('population : le jeton d\'appareil a été remis en base (une ligne pour Alice)', sql('SELECT COUNT(*) AS n FROM appareil_tel WHERE personne = ?', A.moi.id).n === 1);
      const X = T.client(svc.base, { xff: TEL.reseauNeuf() });
      X.jar.set('opma', appareilA);
      avancer(61 * 1000);
      const sans = await X.post('/api/tel/appareil', {});
      v('⛔ /api/tel/appareil avec ce jeton : 401 appareil_inconnu (une suppression programmée exige un CODE)', [sans.code, sans.j.error], [401, 'appareil_inconnu']);
      const demande = await X.post('/api/tel/code', { numero: nA });
      v('⛔ /api/tel/code avec ce jeton ne connecte PAS sans SMS : il demande un code', [demande.code, demande.j.connecte === undefined, (await X.get('/api/moi')).code], [200, true, 401]);
      const ok = await X.post('/api/tel/verifier', { numero: nA, code: await svc.code(nA), appareil: 'Retour' });
      v('⛔ avec le code SMS, Alice rentre — et la réponse DIT que la suppression est annulée', [ok.code, ok.j.suppression_annulee, ok.j.moi.id], [200, true, A.moi.id]);
      v('l\'échéance est effacée en base, le compte est actif', [etatDe(A.moi.id).suppression_le, etatDe(A.moi.id).etat], [null, 'actif']);
      v('Alice est de nouveau trouvable par son numéro', (await (async () => { avancer(61000); return D.post('/api/contacts/chercher', { numero: nA }); })()).j.trouve, true);
      const bis = await X.post('/api/tel/verifier', { numero: nA, code: '000000' });
      v('(un second code faux ne dit pas « suppression annulée » : la mention ne vient que d\'une vraie reconnexion)', [bis.code, bis.j.suppression_annulee], [401, undefined]);
      A.jar.set('opm', cookieDe(X, 'opm')); A.jar.set('opma', cookieDe(X, 'opma'));
    }

    console.log('\nLa porte bêta : se reconnecter annule aussi');
    {
      const E1 = await T.connecter(svc, og, 'eve', 'pw-eve-123456');
      const s = await E1.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      v('Eve (accès bêta) supprime son compte', [s.code, (await E1.get('/api/moi')).code], [200, 401]);
      const retour = await T.client(svc.base).post('/api/beta/entrer', { login: 'eve', pass: 'pw-eve-123456' });
      v('⛔ elle se reconnecte par la porte bêta : 200, et la réponse dit « suppression annulée »', [retour.code, retour.j.suppression_annulee], [200, true]);
      v('l\'échéance est effacée', etatDe(E1.moi.id).suppression_le, null);
      const normal = await T.client(svc.base).post('/api/beta/entrer', { login: 'eve', pass: 'pw-eve-123456' });
      v('(une connexion ordinaire, sans suppression en cours, ne porte pas cette mention)', [normal.code, normal.j.suppression_annulee], [200, undefined]);
    }

    /* ═══ 3. « NOUVEL APPAREIL CONNECTÉ » : LA SÉCURITÉ PASSE PAR LE PUSH ═══════════════════════════════════════════════════════════════ */
    console.log('\nUn nouvel appareil se connecte avec mon numéro : les autres appareils sont PRÉVENUS par une notification');
    {
      const cp = P.appareil(fps.endpoint('cleo-tel'));
      await C.post('/api/push/abonner', { sub: cp.sub });
      const avant = fps.envois.filter(e => e.chemin === '/push/cleo-tel').length;
      const C2 = T.client(svc.base, { xff: TEL.reseauNeuf() });
      avancer(61 * 1000);
      await C2.post('/api/tel/code', { numero: nC });
      const c2 = await C2.post('/api/tel/verifier', { numero: nC, code: await svc.code(nC), appareil: 'Téléphone inconnu' });
      v('un second appareil entre dans le compte de Cléo avec son numéro', [c2.code, c2.j.nouveau, c2.j.moi.id], [200, false, C.moi.id]);
      const arrive = await T.attendre(() => fps.envois.filter(e => e.chemin === '/push/cleo-tel').length > avant, 8000, 10);
      vrai('population : l\'appareil de Cléo a reçu une notification push', !!arrive);
      const charge = JSON.parse(P.dechiffrer(cp, fps.envois.filter(e => e.chemin === '/push/cleo-tel')[avant].corps));
      v('⛔ « Nouvel appareil connecté » par push, charge minimale : ni nom, ni lieu, ni modèle d\'appareil', [charge.type, charge.titre, JSON.stringify(charge).includes('Téléphone inconnu'), JSON.stringify(charge).includes('Cleo')], ['appareil', 'Nouvel appareil connecté', false, false]);
      v('la notification dans l\'application existe aussi', (await C.get('/api/notifications')).j.notifications.filter(n => n.type === 'nouvel_appareil').length, 1);
      /* un contact ajouté PAR NUMÉRO prévient la personne trouvée : une notification MINIMALE (« Nouveau contact »), sans le nom de celui qui l'a ajoutée (Cléo n'a pas activé l'aperçu) */
      avancer(61 * 1000);
      const trouveC = await D.post('/api/contacts/chercher', { numero: nC });
      const avantContact = fps.envois.filter(e => e.chemin === '/push/cleo-tel').length;
      const ajoutC = await D.post('/api/contacts/ajouter', { id: C.moi.id });
      const arriveC = await T.attendre(() => fps.envois.filter(e => e.chemin === '/push/cleo-tel').length > avantContact, 8000, 10);
      vrai('population : Dan a trouvé Cléo par son numéro, l\'a ajoutée, et la notification de Cléo est arrivée', trouveC.j.trouve === true && ajoutC.code === 200 && !!arriveC);
      const chargeC = arriveC ? JSON.parse(P.dechiffrer(cp, fps.envois.filter(e => e.chemin === '/push/cleo-tel')[avantContact].corps)) : {};
      v('⛔ « Nouveau contact » par push, charge minimale : ni le nom de Dan ni le texte « est maintenant dans vos contacts »', [chargeC.type, chargeC.corps, JSON.stringify(chargeC).includes('Dan'), JSON.stringify(chargeC).includes('dans vos contacts')], ['contact', 'Nouveau contact', false, false]);
      await C.post('/api/push/desabonner', { endpoint: cp.sub.endpoint });
    }

    /* ═══ 4. L'EFFACEMENT À J+14 (Dan) ═════════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\nL\'effacement à J+14 : l\'identité part, la ligne reste vide, les messages restent chez les autres');
    const K = (await D.post('/api/conversations/groupe', { nom: 'Groupe de Dan', membres: [B.moi.id] })).j.conversation.id;
    const L = (await D.post('/api/conversations/groupe', { nom: 'Groupe solitaire', membres: [] })).j.conversation.id;
    await ecrire(D, BD, 'CANARI-BD-dan'); await ecrire(B, BD, 'CANARI-BD-bob'); await ecrire(D, H, 'DAN-DANS-H'); await ecrire(D, K, 'DAN-DANS-K');
    const photoD = (await F.deposer(D, { conv: BD, genre: 'photo', corps: PNG })).j.id;
    await D.post('/api/conversations/' + BD + '/messages', { cid: nouveauCid(), type: 'photo', pieces: [{ id: photoD, w: 8, h: 8 }] });
    const orphelineD = (await F.deposer(D, { conv: BD, genre: 'photo', corps: PNG })).j.id;
    const avatarD = (await F.deposer(D, { genre: 'avatar', corps: PNG })).j.id;
    await D.post('/api/moi/avatar', { piece: avatarD });
    const apD = P.appareil(fps.endpoint('dan-tel'));
    await D.post('/api/push/abonner', { sub: apD.sub });
    await D.post('/api/moi/maj', { statut: 'En déplacement', prefs: { apercu_notif: true } });
    const danId = D.moi.id;
    const traces = (uid) => ['session WHERE personne', 'appareil_tel WHERE personne', 'jeton WHERE personne', 'push WHERE uid', 'notification WHERE uid', 'lien WHERE par', 'recherche_tel WHERE uid', 'msg_masque WHERE uid', 'journal WHERE uid'].map(t => sql('SELECT COUNT(*) AS n FROM ' + t + ' = ?', uid).n);
    vrai('population : avant la suppression, Dan a des sessions, un appareil, un abonnement, des notifications — et trois pièces sur le disque (envoyée, jamais envoyée, photo de profil)',
      [0, 1, 3, 4].every(i => traces(danId)[i] > 0) && [photoD, orphelineD, avatarD].every(id => fs.existsSync(fichierPiece(id))));
    v('population : Dan est administrateur de K et seul membre de L', [(await D.get('/api/conversations/' + K)).j.moi.role, (await D.get('/api/conversations/' + L)).j.conversation.membres_n], ['admin', 1]);
    /* Fay supprime son compte UN JOUR avant Dan : à cinq minutes de l'échéance de Dan, la sienne est échue depuis vingt-quatre heures. Son effacement est la SENTINELLE : il prouve que le balayeur est passé
       APRÈS le saut d'horloge — donc que Dan, qu'il a épargné, n'était pas échu (et non que le balayeur dormait). */
    const Fay = await TEL.inscrire(svc, TEL.numeroBE(), 'Fay');
    v('Fay supprime son compte', (await Fay.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' })).code, 200);
    avancer(1 * JOUR);
    const sD = await D.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
    v('Dan supprime son compte, un jour plus tard', sD.code, 200);
    vrai('population : les deux échéances sont distinctes (Dan a un jour de plus que Fay)', sD.j.suppression_le - etatDe(Fay.moi.id).suppression_le >= 23 * HEURE);
    avancer(14 * JOUR - 5 * 60000);
    const fayEfface = await T.attendre(() => etatDe(Fay.moi.id).etat === 'supprime', 8000, 50);
    vrai('⛔ Fay (échue depuis un jour) est effacée par le balayeur', !!fayEfface);
    v('⛔ Dan, à cinq minutes de son échéance, est toujours actif : le balayeur est passé (Fay le prouve) et l\'a épargné', etatDe(danId).etat, 'actif');
    avancer(6 * 60000);
    const efface = await T.attendre(() => etatDe(danId).etat === 'supprime', 8000, 50);
    vrai('⛔ passé l\'échéance, le balayeur efface le compte de Dan', !!efface);
    {
      const r = sql('SELECT prenom, nom, statut, langue, tz, prefs, avatar_piece, email_h, mdp, sel, params, suppression_le, trouvable FROM personne WHERE id = ?', danId);
      v('⛔ la ligne de Dan est VIDE : ni nom, ni statut, ni photo, ni numéro (email_h), ni réglage ; l\'identifiant demeure', [r.prenom, r.nom, r.statut, r.avatar_piece, r.email_h, r.mdp, r.sel, r.params, r.prefs, r.suppression_le, r.trouvable], ['', '', '', null, null, null, null, null, '{}', null, 'personne']);
      v('⛔ plus rien de lui dans les tables de travail : sessions, appareils, jetons, abonnements, notifications, liens, recherches, masques, journal', traces(danId), [0, 0, 0, 0, 0, 0, 0, 0, 0]);
      v('aucun contact ne le lie à quiconque', sql('SELECT COUNT(*) AS n FROM contact WHERE de = ? OR vers = ?', danId, danId).n, 0);
      v('la trace de l\'effacement est gardée (table purge, genre « compte »)', sql("SELECT COUNT(*) AS n FROM purge WHERE objet = ? AND genre = 'compte'", danId).n, 1);
      v('⛔ les pièces JAMAIS envoyées et la photo de profil sont effacées du disque ET de la base ; la photo ENVOYÉE reste (les autres la voient)',
        [fs.existsSync(fichierPiece(orphelineD)), fs.existsSync(fichierPiece(avatarD)), fs.existsSync(fichierPiece(photoD)), sql('SELECT COUNT(*) AS n FROM piece WHERE id IN (?, ?)', orphelineD, avatarD).n, sql('SELECT COUNT(*) AS n FROM piece WHERE id = ?', photoD).n], [false, false, true, 0, 1]);
    }
    {
      const lue = await F.lirePiece(B, photoD);
      v('Bob lit toujours la photo que Dan lui avait envoyée (octet pour octet)', [lue.code, lue.buf.equals(PNG)], [200, true]);
      const msgs = (await B.get('/api/conversations/' + BD + '/messages')).j;
      vrai('⛔ les messages de Dan restent chez Bob, TEXTE COMPRIS, et la page est PRÉVENUE que l\'auteur est un compte supprimé (`supprimes`)', msgs.messages.some(m => m.texte === 'CANARI-BD-dan' && m.auteur === danId) && Array.isArray(msgs.supprimes) && msgs.supprimes.includes(danId));
      const liste = (await B.get('/api/conversations')).j.conversations.find(c => c.id === BD);
      v('la liste de Bob marque l\'autre comme supprimé, sans nom', [liste.autre.supprime, liste.autre.prenom, liste.autre.nom], [true, '', '']);
      const ecrit = await B.post('/api/conversations/' + BD + '/messages', { cid: nouveauCid(), texte: 'tu es là ?' });
      v('⛔ écrire à un compte supprimé : 410 compte_supprime (pas un « introuvable » qui ferait croire à une panne)', [ecrit.code, ecrit.j.error], [410, 'compte_supprime']);
      v('(écrire à Alice, dont la suppression a été annulée, marche)', (await B.post('/api/conversations/' + AB + '/messages', { cid: nouveauCid(), texte: 'content de te revoir' })).code, 201);
      const kk = (await B.get('/api/conversations/' + K)).j;
      v('⛔ le groupe K, dont Dan était le seul administrateur : Bob en est devenu administrateur, et seul membre', [kk.moi.role, kk.conversation.membres_n], ['admin', 1]);
      v('⛔ le groupe L, dont Dan était le seul membre, est emporté avec lui', sql('SELECT COUNT(*) AS n FROM conversation WHERE id = ?', L).n, 0);
      const eb = (await B.post('/api/compte/export', {})).j;
      const mH = eb.conversations.find(c => c.id === H).messages.find(m => m.texte === 'DAN-DANS-H');
      v('l\'export de Bob nomme l\'auteur d\'un groupe « Compte supprimé »', mH && mH.de, 'Compte supprimé');
      v('Dan n\'est plus membre de H (quitté)', (await B.get('/api/conversations/' + H)).j.membres.some(m => m.id === danId), false);
      v('Dan est introuvable (404) pour qui consulte son profil', (await B.get('/api/personnes/' + danId)).code, 404);
    }
    {
      const D2 = await TEL.inscrire(svc, nD, 'Dan2');
      v('⛔ le numéro de Dan se réinscrit à NEUF : un autre identifiant, un compte tout neuf', [D2.moi.id === danId, D2.moi.prenom, etatDe(D2.moi.id).etat], [false, 'Dan2', 'actif']);
      v('⛔ ... qui ne retrouve RIEN de l\'ancien : ni contacts, ni conversations, ni messages', [(await D2.get('/api/contacts')).j.contacts.length, (await D2.get('/api/conversations')).j.conversations.length, (await D2.get('/api/conversations/' + BD + '/messages')).code], [0, 0, 404]);
      v('l\'ancienne ligne reste vide et supprimée', etatDe(danId).etat, 'supprime');
      v('l\'ancienne session de Dan est morte', (await D.get('/api/moi')).code, 401);
    }
    {
      v('⛔ Alice, qui a programmé puis ANNULÉ, n\'a pas été effacée quinze jours plus tard (le balayeur vient d\'effacer Dan) : elle est active, et connectée', [etatDe(A.moi.id).etat, (await A.get('/api/moi')).code], ['actif', 200]);
      v('(Cléo et Bob non plus)', [etatDe(B.moi.id).etat, etatDe(C.moi.id).etat], ['actif', 'actif']);
    }

    /* ═══ 4 bis. UN DISQUE PLEIN NE RETIENT PAS LA PERSONNE QUI S'EN VA ═══════════════════════════════════════════════════════════════
       Le plancher d'espace disque refuse toute écriture (503) — sauf trois : se déconnecter, supprimer son compte, acquitter. Un service dont le disque est plein est précisément celui qu'on veut pouvoir QUITTER,
       et la page visible qui acquitte ne doit pas recevoir un refus de plus. La même base redémarre avec un plancher impossible à tenir (`disqueMinMo` énorme) : les sessions ouvertes avant survivent au redémarrage. */
    console.log('\nUn disque plein : les écritures sont refusées (503) — mais PAS la déconnexion, la suppression du compte, ni l\'acquittement');
    {
      const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-957-disque-')); dossiersLourds.push(dossier);
      const cle = crypto.randomBytes(32).toString('hex');
      const avant = await T.lancerService({ dossier, cle, urlGestion: og.url }); lourds.push(avant);
      const ce = await T.connecter(avant, og, 'eve', 'pw-eve-123456'), cx = await T.connecter(avant, og, 'xan', 'pw-xan-123456');
      const sessions = { eve: ce.cookie(), xan: cx.cookie() };
      await avant.arreter(false);
      const plein = await T.lancerService({ dossier, cle, urlGestion: og.url, config: { disqueMinMo: 1e12 } }); lourds.push(plein);
      const E = T.client(plein.base), X2 = T.client(plein.base);
      E.poserCookie(sessions.eve); X2.poserCookie(sessions.xan);
      v('population : les deux sessions ouvertes AVANT le redémarrage sont valides sur le service redémarré, dont le disque est « bas »', [(await E.get('/api/moi')).code, (await X2.get('/api/moi')).code, (await E.get('/health')).j.disque.bas], [200, 200, true]);
      const temoin = await E.post('/api/moi/maj', { statut: 'Disque plein' });
      v('⛔ témoin : une écriture ordinaire est REFUSÉE 503 disque_plein (le plancher tient vraiment, sans quoi les trois exceptions ne prouveraient rien)', [temoin.code, temoin.j && temoin.j.error], [503, 'disque_plein']);
      v('⛔ l\'acquittement d\'une page visible passe malgré le disque plein', (await E.post('/api/flux/ack', { gid: 0 })).code, 200);
      v('⛔ se déconnecter passe malgré le disque plein, et la session est bien morte ensuite', [(await X2.post('/api/compte/deconnexion', {})).code, (await X2.get('/api/moi')).code], [200, 401]);
      const sup = await E.post('/api/compte/supprimer', { confirmation: 'SUPPRIMER' });
      v('⛔ supprimer son compte passe malgré le disque plein : l\'échéance est posée, et la session est coupée', [sup.code, Number.isFinite(sup.j && sup.j.suppression_le), (await E.get('/api/moi')).code], [200, true, 401]);
      const dsup = T.lireBase(path.join(plein.data, 'msg.db')); let ech; try { ech = dsup.prepare('SELECT suppression_le AS s FROM personne WHERE suppression_le IS NOT NULL').get(); } finally { dsup.close(); }
      v('l\'échéance est bien dans la base (la suppression n\'est pas qu\'une réponse)', typeof (ech && ech.s), 'number');
    }

    /* ═══ 5. LES GROSSES DONNÉES : AU FIL DE L'EAU, PLAFONNÉ, UN EXPORT ABANDONNÉ RENDS SON CRÉNEAU ═══════════════════════════════════ */
    console.log('\nUne grosse conversation : l\'export s\'écrit par morceaux, le plafond le tronque proprement, un export abandonné rend son créneau');
    {
      const dossier = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-957-lourd-')); dossiersLourds.push(dossier);
      const cle = crypto.randomBytes(32).toString('hex');
      let s2 = await T.lancerService({ dossier, cle, urlGestion: og.url }); lourds.push(s2);
      const X = await T.connecter(s2, og, 'xan', 'pw-xan-123456'), Y = await T.connecter(s2, og, 'yan', 'pw-yan-123456'), Z = await T.connecter(s2, og, 'zan', 'pw-zan-123456'), V = await T.connecter(s2, og, 'vin', 'pw-vin-123456');
      await relier(X, Y); await relier(X, Z); await relier(X, V);
      const GL = (await X.post('/api/conversations/groupe', { nom: 'Lourd', membres: [Y.moi.id, Z.moi.id, V.moi.id] })).j.conversation.id;
      const W0 = await T.connecter(s2, og, 'wen', 'pw-wen-123456');
      const S2 = ouvrir({ chemin: path.join(s2.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(cle, 'hex')) });
      const N = 12000, ids = [X.moi.id, Y.moi.id, Z.moi.id];
      const t0 = Date.now();
      S2.tx(() => { for (let i = 1; i <= N; i++) S2.messageEnvoyer({ conv: GL, auteur: ids[i % 3], cid: 'cid-lourd-' + String(i).padStart(6, '0'), type: 'texte', texte: 'Message de charge numéro ' + i + ' ' + 'x'.repeat(90), repondA: null, pieces: null, vocal: null }); });
      console.log('      (' + N + ' messages écrits directement en base en ' + (Date.now() - t0) + ' ms)');
      S2.fermer();
      const nombre = await (async () => { const d = T.lireBase(path.join(s2.data, 'msg.db')); try { return d.prepare('SELECT dernier_seq AS n FROM conversation WHERE id = ?').get(GL).n; } finally { d.close(); } })();
      v('population : la conversation lourde porte ' + N + ' messages (plus celui de la création du groupe)', nombre, N + 1);

      /* l'export complet */
      const debut = Date.now();
      const complet = await X.post('/api/compte/export', {});
      const duree = Date.now() - debut;
      const lourd = complet.j && complet.j.conversations.find(c => c.id === GL);
      v('⛔ l\'export d\'une grosse conversation est un JSON VALIDE, complet, dans l\'ordre, sans plafond atteint', [complet.code, lourd && lourd.messages.length, lourd && lourd.messages.every((m, i) => m.seq === i + 1), complet.j && complet.j.tronque], [200, N + 1, true, null]);
      v('il est écrit AU FIL DE L\'EAU : aucune longueur annoncée', complet.h.get('content-length'), null);
      console.log('      (export complet : ' + complet.txt.length + ' octets en ' + duree + ' ms)');
      vrai('population : l\'export complet dure assez (' + duree + ' ms ≥ 150) pour qu\'un abandon tombe AU MILIEU', duree >= 150);

      /* un export abandonné en route rend son créneau */
      const raw = await new Promise((resolve, reject) => {
        const u = new URL(s2.base);
        const h = { Origin: s2.base, 'X-OPM': '1', 'Content-Type': 'application/json', 'Content-Length': '2', Cookie: Y.enteteCookie() };
        const req = http.request({ host: u.hostname, port: u.port, method: 'POST', path: '/api/compte/export', headers: h, agent: false }, (res) => {
          let recu = 0;
          res.once('data', async (d) => {
            recu += d.length;
            const parallele = await Y.post('/api/compte/export', {});     // pendant que le premier court encore : le créneau est PRIS
            req.destroy(); res.destroy();
            resolve({ premier: res.statusCode, recu, parallele });
          });
          res.on('error', () => {});
        });
        req.on('error', () => {});
        req.end('{}');
        setTimeout(() => reject(new Error('aucun octet reçu')), 8000).unref();
      });
      v('pendant qu\'un export court, un second du même jour est refusé (le créneau est PRIS)', [raw.premier, raw.parallele.code, raw.parallele.j.error], [200, 429, 'export_quotidien']);
      const rendu = await T.attendre(async () => (await Y.post('/api/compte/export', {})).code === 200, 8000, 50);
      v('⛔ le client a abandonné en route : le créneau est RENDU, un nouvel export marche tout de suite (avant : 429 pendant 24 h pour un fichier jamais reçu)', !!rendu, true);

      /* deux exports EN COURS au plus pour le service : un troisième est refusé tout de suite (429 quota_atteint), même d'une personne dont le quota du jour est intact.
         Deux lecteurs LENTS (la réponse n'est pas lue : le service attend le client, l'export reste en cours) tiennent les deux places. */
      const lent = (client) => new Promise((resolve, reject) => {
        const u = new URL(s2.base);
        const h = { Origin: s2.base, 'X-OPM': '1', 'Content-Type': 'application/json', 'Content-Length': '2', Cookie: client.enteteCookie() };
        const req = http.request({ host: u.hostname, port: u.port, method: 'POST', path: '/api/compte/export', headers: h, agent: false }, (res) => { res.pause(); resolve({ req, res }); });
        req.on('error', () => {});
        req.end('{}');
        setTimeout(() => reject(new Error('export lent : aucune réponse')), 8000).unref();
      });
      const L1 = await lent(Z), L2 = await lent(V);
      const troisieme = await W0.post('/api/compte/export', {});
      v('⛔ deux exports sont EN COURS (deux lecteurs lents) : un troisième, d\'une personne dont le quota du jour est intact, est refusé 429 quota_atteint avec un délai', [L1.res.statusCode, L2.res.statusCode, troisieme.code, troisieme.j && troisieme.j.error, troisieme.h.get('retry-after')], [200, 200, 429, 'quota_atteint', '30']);
      L1.req.destroy(); L1.res.destroy(); L2.req.destroy(); L2.res.destroy();
      const libre = await T.attendre(async () => (await W0.post('/api/compte/export', {})).code === 200, 8000, 50);
      v('les deux places se libèrent quand les clients partent : le même export passe ensuite', !!libre, true);

      /* le plafond */
      await s2.arreter(false);
      s2 = await T.lancerService({ dossier, cle, urlGestion: og.url, config: { compte: { exportOctetsMax: 50000 } } }); lourds.push(s2);
      const Z2 = await T.connecter(s2, og, 'zan', 'pw-zan-123456');
      const plafonne = await Z2.post('/api/compte/export', {});
      const pl = plafonne.j && plafonne.j.conversations.find(c => c.id === GL);
      v('⛔ plafond de 50 000 octets : le fichier reste un JSON VALIDE et DIT qu\'il est tronqué (`tronque` et `messages_tronques`)', [plafonne.code, plafonne.j && plafonne.j.tronque, pl && pl.messages_tronques], [200, 'messages', true]);
      vrai('⛔ il s\'arrête près du plafond (' + plafonne.txt.length + ' octets, pas les ' + complet.txt.length + ' du fichier entier)', plafonne.txt.length > 50000 && plafonne.txt.length < 50000 + 80000);
      v('les messages gardés sont les PREMIERS, sans trou', [pl.messages.length > 0 && pl.messages.length < N, pl.messages.every((m, i) => m.seq === i + 1)], [true, true]);

      /* le plafond coupe aussi la LISTE des conversations : trois groupes lourds, le premier atteint le plafond, les deux autres ne sont pas écrits (et le fichier le dit) */
      const W = await T.connecter(s2, og, 'wen', 'pw-wen-123456');
      await relier(W, Z2);
      const gs = [];
      for (const nom of ['Lourd A', 'Lourd B', 'Lourd C']) gs.push((await W.post('/api/conversations/groupe', { nom, membres: [Z2.moi.id] })).j.conversation.id);
      const S3 = ouvrir({ chemin: path.join(s2.data, 'msg.db'), scelleur: creerScelleur(Buffer.from(cle, 'hex')) });
      S3.tx(() => { for (const g of gs) for (let i = 1; i <= 300; i++) S3.messageEnvoyer({ conv: g, auteur: i % 2 ? W.moi.id : Z2.moi.id, cid: 'cid-' + g.slice(-6) + '-' + String(i).padStart(4, '0'), type: 'texte', texte: 'Charge ' + i + ' ' + 'y'.repeat(90), repondA: null, pieces: null, vocal: null }); });
      S3.fermer();
      v('population : Wen est membre de trois groupes lourds (300 messages chacun, de quoi dépasser le plafond dès le premier)', [(await W.get('/api/conversations')).j.conversations.length, gs.every(g => /^c_[0-9a-f]{32}$/.test(g))], [3, true]);
      const liste = await W.post('/api/compte/export', {});
      v('⛔ le plafond coupe aussi la LISTE des conversations : UNE seule est écrite (tronquée), le fichier reste valide et dit `tronque: "conversations"`', [liste.code, liste.j && liste.j.conversations.length, liste.j && liste.j.conversations[0] && liste.j.conversations[0].messages_tronques, liste.j && liste.j.tronque], [200, 1, true, 'conversations']);
    }
  } catch (e) {
    console.log('  ✗ le banc est mort : ' + (e && e.stack || e));
    process.exitCode = 1;
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) { /* déjà fermé */ } }
    try { S.fermer(); } catch (e) { /* déjà fermée */ }
    await svc.arreter();
    for (const s of lourds) { try { await s.arreter(false); } catch (e) { /* déjà arrêté */ } }
    for (const d of dossiersLourds) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) { /* tant pis */ } }
    await og.fermer(); await fps.fermer();
  }
  fin();
})();
