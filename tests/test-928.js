/* ⛔ CE QUE CE FICHIER GARDE — L'INVITATION À ÉCRIRE : ÉCRIRE À LA PERSONNE D'UNE FICHE REÇUE, QUI N'EST PAS (ENCORE) UN CONTACT (famille 3 : le VRAI service, en HTTP).

   7 octobre 2026 : « quand on partage un contact, qu'on puisse lui envoyer un message ; et dans Messages, une invitation — un message envoyé à quelqu'un qui ne vous a pas ajouté ».
   Une invitation n'est pas une seconde notion : c'est une DEMANDE DE CONTACT qui porte une conversation directe (migration 19, `demande_contact.message`). Ce banc tient :
     · « Écrire » depuis la fiche reçue (`/api/contacts/ecrire_carte`) : les mêmes preuves que « Ajouter » (la fiche est un message que JE vois, la personne se laisse trouver) ;
       déjà en contact → la directe, sans demande ; sinon la demande part, marquée invitation, et la directe s'ouvre ;
     · l'AUTEUR écrit ; la personne invitée LIT, mais n'écrit pas (ni message, ni frappe) tant qu'elle n'a pas accepté ;
     · sa liste range la conversation en « recue » (la page en fait « Invitations ») — l'auteur la voit « envoyee » ;
     · ⛔ l'auteur ne sait pas si l'invitation a été LUE : ni `lu_seq` dans le détail, ni événement `lu` dans son flux ;
     · accepter = un contact (la règle des demandes) : chacun écrit, les accusés reviennent ;
     · ⛔ REFUSER ne se dit pas : la conversation quitte la liste de qui refuse, l'auteur la voit toujours « envoyee », écrit, et rien n'arrive ;
     · ⛔ BLOQUER efface tout : l'auteur ne peut plus écrire ;
     · ⛔ une simple demande de contact (« Ajouter ») n'ouvre PAS le droit d'écrire ; une fiche qu'on ne voit pas ne prouve rien.  */
'use strict';
const path = require('path');
const T = require('./outils-msg');
const PC = require('./outils-pieces');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const MDP = (l) => 'pw-' + l + '-1234';
const NOMS = ['alice', 'bruno', 'carla', 'dave', 'eve', 'fanny'];

(async () => {
  const og = await T.fauxOpGestion(Object.fromEntries(NOMS.map(l => [l, { pass: MDP(l), nom: l[0].toUpperCase() + l.slice(1) + ' Banc', actif: true }])));
  const svc = await T.lancerService({ urlGestion: og.url, horloge: true });
  const flux = [];
  try {
    const [A, B, C, D, E, F] = await Promise.all(NOMS.map(l => T.connecter(svc, og, l, MDP(l))));
    const relier = async (x, y) => { const l = await x.post('/api/contacts/lien', {}); await y.post('/api/liens/accepter', { code: l.j.code }); };
    await relier(A, B); await relier(A, C); await relier(A, D); await relier(A, E); await relier(A, F);
    /* Alice partage, dans « Chantier Nord » (Alice, Bruno), les fiches de Carla, Dave et Eve — trois de SES contacts, pas de ceux de Bruno */
    const G = (await A.post('/api/conversations/groupe', { nom: 'Chantier Nord', membres: [B.moi.id] })).j.conversation.id;
    const cid = () => 'cid-' + Math.random().toString(36).slice(2);
    const fiche = async (P) => (await A.post('/api/conversations/' + G + '/messages', { cid: cid(), type: 'contact', uid: P.moi.id })).j.seq;
    const [sC, sD, sE] = [await fiche(C), await fiche(D), await fiche(E)];
    const ecrire = (P, corps) => P.post('/api/contacts/ecrire_carte', corps);
    const dire = (P, conv, texte) => P.post('/api/conversations/' + conv + '/messages', { cid: cid(), texte });
    const ligne = async (P, conv) => ((await P.get('/api/conversations')).j.conversations || []).find(c => c.id === conv) || null;
    const detail = async (P, conv) => (await P.get('/api/conversations/' + conv)).j;

    console.log('\n1. « Écrire » depuis la fiche : l\'invitation part, la directe s\'ouvre');
    let r = await ecrire(B, { conv: G, seq: sC });
    v('Bruno écrit à Carla (la fiche reçue d\'Alice, pas son contact) : invitation envoyée, une conversation', [r.code, r.j.resultat, /^c_[0-9a-f]{32}$/.test(r.j.conv || '')], [200, 'envoyee', true]);
    const BC = r.j.conv;
    v('le redemander : la même conversation, « déjà envoyée »', [(await ecrire(B, { conv: G, seq: sC })).j.resultat, (await ecrire(B, { conv: G, seq: sC })).j.conv], ['deja_envoyee', BC]);
    v('Carla voit la demande de Bruno (dans Contacts › Demandes reçues aussi)', ((await C.get('/api/contacts/demandes')).j.recues || []).map(x => x.id), [B.moi.id]);
    v('la liste de Bruno : la directe, « envoyee »', (await ligne(B, BC) || {}).invitation, 'envoyee');
    v('⛔ celle de Carla : rien tant que Bruno n\'a rien écrit (une directe vide ne s\'impose pas)', await ligne(C, BC), null);
    r = await ecrire(A, { conv: G, seq: sC });
    const lAC = await ligne(A, r.j.conv);
    v('Alice (déjà en contact avec Carla) : « deja », leur directe (dans sa liste) — aucune invitation', [r.code, r.j.resultat, !!lAC, lAC && 'invitation' in lAC], [200, 'deja', true, false]);

    console.log('\n2. L\'auteur écrit ; la personne invitée lit, et n\'écrit pas avant d\'avoir accepté');
    const fB = await T.flux(B); flux.push(fB);
    r = await dire(B, BC, 'Bonjour Carla, c\'est Bruno du chantier Nord.');
    v('Bruno écrit : 201', r.code, 201);
    const s1 = r.j.seq;
    const lc = await ligne(C, BC);
    v('Carla : la conversation paraît, « recue », un message non lu', [lc && lc.invitation, lc && lc.non_lus], ['recue', 1]);
    v('le détail le dit aussi (Carla : recue ; Bruno : envoyee)', [(await detail(C, BC)).conversation.invitation, (await detail(B, BC)).conversation.invitation], ['recue', 'envoyee']);
    v('Carla lit le message', ((await C.get('/api/conversations/' + BC + '/messages')).j.messages || []).map(m => m.texte), ['Bonjour Carla, c\'est Bruno du chantier Nord.']);
    v('⛔ Carla ne répond pas avant d\'avoir accepté : message 404, frappe 404', [(await dire(C, BC, 'Salut')).code, (await C.post('/api/conversations/' + BC + '/saisie', { actif: true })).code], [404, 404]);
    r = await C.post('/api/conversations/' + BC + '/lu', { seq: s1 });
    v('Carla marque l\'invitation lue', r.code, 200);
    await new Promise(x => setTimeout(x, 300));
    const luC = (await detail(B, BC)).membres.find(m => m.id === C.moi.id);
    v('⛔ Bruno ne sait PAS qu\'elle l\'a lue : pas de lu_seq dans son détail, aucun événement « lu » de Carla dans son flux', [luC && luC.lu_seq, fB.evenements.some(e => e.event === 'lu' && e.data && e.data.uid === C.moi.id)], [null, false]);
    v('…mais Carla voit son propre lu_seq', ((await detail(C, BC)).membres.find(m => m.id === C.moi.id) || {}).lu_seq, s1);
    /* ⛔ relecture du gardien (bloquant) : l'invitation ne donne pas le profil de la personne invitée — ni la route, ni la liste, ni le détail */
    v('⛔ Bruno ne lit PAS le profil de Carla (404, comme avant l\'invitation) ; Carla, elle, lit celui de Bruno (il lui écrit)', [(await B.get('/api/personnes/' + C.moi.id)).code, (await C.get('/api/personnes/' + B.moi.id)).code], [404, 200]);
    v('⛔ sa liste et son détail ne disent que le premier mot du prénom : ni nom, ni photo', [(await ligne(B, BC)).autre, (({ prenom, nom, avatar }) => ({ prenom, nom, avatar }))((await detail(B, BC)).membres.find(m => m.id === C.moi.id) || {})], [{ id: C.moi.id, prenom: 'Carla', nom: '', avatar: null }, { prenom: 'Carla', nom: '', avatar: null }]);      // ⛔ le PRÉNOM aussi : un compte de banc y range son nom entier (mutation G9)
    v('⛔ du TEXTE seul tant qu\'elle n\'a pas accepté : une carte, une photo → 403 invitation_texte', [(await B.post('/api/conversations/' + BC + '/messages', { cid: cid(), type: 'contact', uid: A.moi.id })).j.error, (await PC.deposer(B, { conv: BC, genre: 'photo', corps: PC.png({ w: 8, h: 8 }) })).j.error], ['invitation_texte', 'invitation_texte']);
    const encore = [];
    for (let i = 0; i < 5; i++) encore.push((await dire(B, BC, 'Relance ' + i)).code);
    v('⛔ cinq messages au plus avant d\'être accepté : les quatre suivants passent, le sixième est refusé (409 invitation_plafond)', [encore, (await dire(B, BC, 'Encore')).j.error], [[201, 201, 201, 201, 409], 'invitation_plafond']);

    console.log('\n3. Accepter : un contact, chacun écrit, les accusés reviennent');
    r = await C.post('/api/contacts/demandes/repondre', { id: B.moi.id, accepter: true });
    v('Carla accepte : un contact', [r.code, r.j.resultat], [200, 'acceptee']);
    v('plus d\'invitation, des deux côtés', [(await ligne(B, BC) || {}).invitation, (await ligne(C, BC) || {}).invitation, (await detail(C, BC)).conversation.invitation], [undefined, undefined, undefined]);
    v('Carla répond : 201', (await dire(C, BC, 'Bonjour Bruno !')).code, 201);
    v('acceptée : Bruno lit son profil, son nom entier (un compte de banc le range dans le prénom), et n\'est plus plafonné', [(await B.get('/api/personnes/' + C.moi.id)).code, (await ligne(B, BC)).autre.prenom, (await dire(B, BC, 'Merci !')).code], [200, 'Carla Banc', 201]);
    const luApres = ((await detail(B, BC)).membres.find(m => m.id === C.moi.id) || {}).lu_seq;
    vrai('Bruno voit maintenant jusqu\'où Carla a lu (au moins son message : ' + luApres + ')', Number.isInteger(luApres) && luApres >= s1);

    console.log('\n4. ⛔ Refuser ne se dit pas');
    r = await ecrire(B, { conv: G, seq: sD });
    const BD = r.j.conv;
    v('Bruno écrit à Dave (invitation)', [r.j.resultat, (await dire(B, BD, 'Bonjour Dave')).code], ['envoyee', 201]);
    v('Dave la voit « recue »', (await ligne(D, BD) || {}).invitation, 'recue');
    v('Dave refuse', (await D.post('/api/contacts/demandes/repondre', { id: B.moi.id, accepter: false })).j.resultat, 'refusee');
    v('⛔ la conversation quitte la liste de Dave', await ligne(D, BD), null);
    v('⛔ Bruno n\'en sait rien : toujours « envoyee », il écrit encore (201), « déjà envoyée » s\'il recommence', [(await ligne(B, BD) || {}).invitation, (await detail(B, BD)).conversation.invitation, (await dire(B, BD, 'Tu es là ?')).code, (await ecrire(B, { conv: G, seq: sD })).j.resultat], ['envoyee', 'envoyee', 201, 'deja_envoyee']);
    v('⛔ …et rien ne revient chez Dave', await ligne(D, BD), null);

    console.log('\n5. ⛔ Bloquer efface tout');
    r = await ecrire(B, { conv: G, seq: sE });
    const BE = r.j.conv;
    v('Bruno écrit à Eve (invitation)', [r.j.resultat, (await dire(B, BE, 'Bonjour Eve')).code], ['envoyee', 201]);
    v('Eve bloque Bruno', (await E.post('/api/contacts/bloquer', { uid: B.moi.id })).code, 200);
    v('⛔ Bruno ne peut plus écrire (404), et ce n\'est plus une invitation', [(await dire(B, BE, 'Encore moi')).code, (await detail(B, BE)).conversation.invitation], [404, undefined]);
    const ficheE = ((await B.get('/api/conversations/' + G + '/messages')).j.messages || []).find(m => m.seq === sE);
    v('⛔ la fiche d\'Eve, chez Bruno qu\'elle a bloqué, se lit « introuvable » (comme une personne qui ne se laisse pas trouver) — chez Alice, non', [ficheE && ficheE.meta, (((await A.get('/api/conversations/' + G + '/messages')).j.messages || []).find(m => m.seq === sE) || {}).meta.uid], [{ k: 'contact', uid: null, prenom: null, identifiant: null }, E.moi.id]);

    console.log('\n6. ⛔ Ce qui n\'ouvre rien');
    const refuses = await Promise.all([
      ecrire(F, { conv: G, seq: sC }), ecrire(B, { conv: G, seq: 1 }), ecrire(B, { conv: G, seq: 0 }), ecrire(B, { conv: 'x', seq: sC }), ecrire(B, { conv: G, seq: String(sC) }), ecrire(C, { conv: G, seq: sC }),
    ]);
    v('Fanny (étrangère au groupe), un message qui n\'est pas une fiche, un numéro nul, une conversation mal formée, un numéro en texte, Carla sur SA propre fiche : 404, 404, 400, 400, 400, 404', refuses.map(x => x.code), [404, 404, 400, 400, 400, 404]);
    /* Dave (il a refusé Bruno) devient introuvable : sa fiche ne permet plus de lui écrire, à personne */
    const G2 = (await A.post('/api/conversations/groupe', { nom: 'Dépôt', membres: [E.moi.id] })).j.conversation.id;
    const sD2 = (await A.post('/api/conversations/' + G2 + '/messages', { cid: cid(), type: 'contact', uid: D.moi.id })).j.seq;
    await D.post('/api/moi/confidentialite', { trouvable: 'personne' });
    v('⛔ Dave se rend introuvable : Eve ne peut pas lui écrire depuis sa fiche (404)', (await ecrire(E, { conv: G2, seq: sD2 })).code, 404);
    await D.post('/api/moi/confidentialite', { trouvable: 'tous' });
    v('Dave se laisse trouver de nouveau : Eve peut (invitation)', (await ecrire(E, { conv: G2, seq: sD2 })).j.resultat, 'envoyee');
    v('…et deux invitations croisées valent un accord (Dave écrit à Eve depuis une fiche d\'elle : « acceptee »)', await (async () => {
      const G4 = (await A.post('/api/conversations/groupe', { nom: 'Atelier', membres: [D.moi.id] })).j.conversation.id;
      const s = (await A.post('/api/conversations/' + G4 + '/messages', { cid: cid(), type: 'contact', uid: E.moi.id })).j.seq;
      return (await ecrire(D, { conv: G4, seq: s })).j.resultat; })(), 'acceptee');
    /* une demande ORDINAIRE (« Ajouter ») ne donne pas le droit d'écrire */
    const G3 = (await A.post('/api/conversations/groupe', { nom: 'Bureau', membres: [D.moi.id] })).j.conversation.id;
    const sF3 = (await A.post('/api/conversations/' + G3 + '/messages', { cid: cid(), type: 'contact', uid: F.moi.id })).j.seq;
    v('Dave demande Fanny (« Ajouter », pas « Écrire ») : demande envoyée', (await D.post('/api/contacts/demander_carte', { conv: G3, seq: sF3 })).j.resultat, 'envoyee');
    v('⛔ …et ne peut pas ouvrir de directe avec elle (404)', (await D.post('/api/conversations/directe', { uid: F.moi.id })).code, 404);
    /* ⛔ une directe d'AVANT (deux anciens contacts) ne se rouvre pas par une demande ordinaire : seule une invitation (« Écrire ») donne le droit d'y écrire — mutation M9 */
    await relier(C, F);
    const CF = (await C.post('/api/conversations/directe', { uid: F.moi.id })).j.conversation.id;
    v('population : Carla et Fanny, contacts, s\'écrivent', (await dire(C, CF, 'Coucou')).code, 201);
    await F.post('/api/contacts/retirer', { uid: C.moi.id });
    v('Fanny retire Carla : Carla ne peut plus écrire dans leur directe (404)', (await dire(C, CF, 'Encore là ?')).code, 404);
    const GF = (await A.post('/api/conversations/groupe', { nom: 'Quai', membres: [C.moi.id] })).j.conversation.id;
    const sF = (await A.post('/api/conversations/' + GF + '/messages', { cid: cid(), type: 'contact', uid: F.moi.id })).j.seq;
    v('Carla redemande Fanny (« Ajouter ») : demande envoyée', (await C.post('/api/contacts/demander_carte', { conv: GF, seq: sF })).j.resultat, 'envoyee');
    v('⛔ …une demande ordinaire ne rouvre PAS leur directe (404), et ce n\'est pas une invitation', [(await dire(C, CF, 'Tu m\'acceptes ?')).code, (await detail(C, CF)).conversation.invitation], [404, undefined]);
    v('« Écrire » depuis la fiche la change en invitation : Carla écrit (201)', [(await ecrire(C, { conv: GF, seq: sF })).j.conv, (await dire(C, CF, 'C\'est Carla')).code], [CF, 201]);
    v('population : Fanny voit l\'invitation de Carla', (await ligne(F, CF) || {}).invitation, 'recue');
    v('Carla retire sa demande', (await C.post('/api/contacts/demandes/annuler', { id: F.moi.id })).code, 200);
    v('⛔ retirée, l\'invitation ne REVIENT pas dans la liste principale de Fanny ; Carla ne peut plus écrire', [await ligne(F, CF), (await dire(C, CF, 'Et maintenant ?')).code], [null, 404]);
  } catch (e) {
    vrai('le banc est mort : ' + (e && e.stack || e), false);
  } finally {
    for (const f of flux) { try { f.fermer(); } catch (e) {} }
    await svc.arreter(); await og.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
