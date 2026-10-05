/* ⛔ CE QUE CE FICHIER GARDE — L'IDENTIFIANT « Prénom#1234 » ET LES DEMANDES DE CONTACT (Justin, 5 octobre 2026).

   « Qu'on puisse ajouter des personnes qui ont déjà l'application… un petit système avec un hashtag. » Puis, à la question : « Nom#1234 exact » et « demande à accepter ».
   · Chaque personne a un identifiant PUBLIC : son prénom suivi de quatre chiffres (« Camille#4821 »). Deux « Camille » n'ont jamais le même. Il suit le prénom quand il change.
   · On retrouve quelqu'un par cet identifiant EXACT, sous toutes ses écritures (casse, accents, espace avant « # ») — JAMAIS par un nom seul (400, avant même d'être compté) :
     ce n'est pas un annuaire (SERVEUR.md § 2.5). La recherche partage TOUT ce qui protège déjà la recherche par numéro : le plafond durable du jour (les deux ensemble), la
     rafale par minute, la même latence plancher, la même réponse NEUTRE pour « personne », « c'est moi », « ne veut pas être trouvé », « m'a bloqué ».
   · Trouver ne crée PAS de contact : `demander` envoie une demande — seulement à quelqu'un qu'on VIENT de trouver. La personne l'accepte (contact mutuel, l'auteur est prévenu) ou
     la refuse (en silence : l'auteur la voit toujours « en attente », et redemander ne relance personne). Deux demandes croisées valent un accord. L'auteur peut retirer la sienne.
   · Avant l'accord, rien n'est partagé : pas de contact, donc ni présence ni statut.
   · L'effacement d'un compte emporte ses demandes et libère son identifiant ; une base d'AVANT la migration 11 donne un identifiant à chacun au démarrage ; l'export le contient. */
const path = require('path'), fs = require('fs'), os = require('os'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const { HEURE, JOUR } = TEL;
const { ouvrir, MIGRATIONS, identLire } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const NEUTRE = '{"trouve":false}';
const mk2 = (chemin, kek) => ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => 1790000000000, migrations: MIGRATIONS });
const IDENT = /^[^#\s]+#\d{4}$/;
let SVC = null;
/* chaque recherche avance l'horloge d'une minute : le banc ne mesure que ce qu'il veut (la rafale par minute est jouée à part) */
const parIdent = async (c, identifiant, sansPause) => { if (SVC && !sansPause) SVC.avancer(61 * 1000); return c.post('/api/contacts/identifiant', { identifiant }); };
const notifs = async (c) => (await c.get('/api/notifications')).j.notifications || [];
const demandes = async (c) => (await c.get('/api/contacts/demandes')).j;
const mutuel = async (c, id) => ((await c.get('/api/contacts')).j.contacts || []).some(x => x.id === id && x.mutuel && !x.bloque);

/* ══ 1. LE MODULE SEUL : la normalisation, la base d'avant, l'effacement ══ */
function moduleSeul() {
  console.log('\n── 996 · la normalisation de l\'identifiant ──');
  v('« Hélène#4821 », « helene #4821 », « HÉLÈNE#4821 » : la même personne', ['Hélène#4821', 'helene #4821', 'HÉLÈNE#4821', '  Hélène # 4821 '].map(t => JSON.stringify(identLire(t))), Array(4).fill(JSON.stringify({ base: 'helene', num: 4821 })));
  v('⛔ un NOM seul, trois chiffres, six chiffres, 0999, 09999, un texte trop long : refusés (null)', ['Hélène', 'Hélène#482', 'Hélène#482111', 'Hélène#0999', 'Hélène#09999', 'x'.repeat(90) + '#4821', '#', null, 4821].map(identLire), Array(9).fill(null));
  v('cinq chiffres (un prénom dont les quatre sont tous pris) : lus', JSON.stringify(identLire('Thomas#48213')), JSON.stringify({ base: 'thomas', num: 48213 }));
  v('un prénom sans lettre latine se range sous « op » : « Ахмед#4821 » se retrouve', JSON.stringify(identLire('Ахмед#4821')), JSON.stringify({ base: 'op', num: 4821 }));

  console.log('\n── 996 · une base d\'AVANT la migration 11 : chacun reçoit son identifiant au démarrage ──');
  const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-996-'));
  try {
    const chemin = path.join(bac, 'avant.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
    const mk = (migrations) => ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations });
    const v10 = mk(MIGRATIONS.slice(0, 10));
    const anc = ['Camille', 'Camille', 'Hélène'].map((p, i) => v10.personneCreer({ identifiant: 'beta:avant' + i, prenom: p, nom: 'Avant', origine: 'beta', verifie: true }));
    v('(population : trois comptes d\'avant, sans identifiant public — la colonne n\'existe pas encore)', anc.map(p => p.identifiant || null), [null, null, null]);
    v10.fermer();
    const v11 = mk(MIGRATIONS);
    const apres = anc.map(p => v11.personneParId(p.id).identifiant);
    vrai('⛔ au démarrage du schéma 11, les trois ont reçu un identifiant « Prénom#1234 » (' + apres.join(', ') + ')', apres.every(x => IDENT.test(x || '')), apres.join(', '));
    vrai('   les deux « Camille » n\'ont pas le même numéro', apres[0] !== apres[1] && apres[0].startsWith('Camille#') && apres[1].startsWith('Camille#'));
    vrai('   et un compte NEUF en reçoit un à sa création', IDENT.test(v11.personneCreer({ identifiant: 'beta:neuf', prenom: 'Zoé', nom: 'N', origine: 'beta', verifie: true }).identifiant || ''));

    console.log('\n── 996 · l\'effacement emporte les demandes et libère l\'identifiant ──');
    const [a, b] = anc;
    v('(population : a → b en attente, b → c en attente)', [v11.demandeCreer(a.id, b.id), v11.demandeCreer(b.id, anc[2].id), v11.demandesRecues(b.id).length], ['envoyee', 'envoyee', 1]);
    v11.suppressionProgrammer(b.id, h.t - 1);
    const e = v11.compteEffacer(b.id, { rejeu: true });
    const d = require('node:sqlite'), brut = new d.DatabaseSync(chemin, { readOnly: true });
    try {
      const reste = brut.prepare('SELECT COUNT(*) AS n FROM demande_contact WHERE de = ? OR vers = ?').get(b.id, b.id).n;
      const id = brut.prepare('SELECT ident_base, ident_num FROM personne WHERE id = ?').get(b.id);
      v('⛔ effacé : plus AUCUNE demande qui le touche (reçue ou envoyée), et son identifiant est libéré (base et numéro vides)', [e.effacee, Number(reste), id.ident_base, id.ident_num], [true, 0, null, null]);
    } finally { brut.close(); }
    v('   l\'autre ne voit plus la demande envoyée à un compte effacé', v11.demandesEnvoyees(a.id).length, 0);
    v11.fermer();

    console.log('\n── 996 · ⛔ un numéro déjà pris n\'est JAMAIS rendu : 8 999 « Ana » sur 9 000, la suivante reçoit le dernier libre, la d\'après passe à cinq chiffres ──');
    /* Le hasard ne rencontre une collision qu'une fois sur 9 000 : sans ce bloc, « ignorer le numéro déjà pris » survivait au banc (mutation M13). On occupe donc tous les numéros
       sauf un, à la main, et on exige le dernier libre ; puis plus aucun à quatre chiffres : la suivante passe à CINQ (un prénom courant ne bloque aucune inscription). */
    const chemin2 = path.join(bac, 'plein.db'), S2 = mk2(chemin2, kek);
    const brut2 = new (require('node:sqlite').DatabaseSync)(chemin2);
    brut2.exec('BEGIN');
    const ins = brut2.prepare(`INSERT INTO personne(id, prenom, nom, origine, cree, ident_base, ident_num) VALUES(?, 'Ana', '', 'beta', 1, 'ana', ?)`);
    for (let n = 1000; n < 10000; n++) if (n !== 7321) ins.run('p_' + crypto.randomBytes(16).toString('hex'), n);
    brut2.exec('COMMIT'); brut2.close();
    v('⛔ la nouvelle « Ana » reçoit le SEUL numéro libre', S2.personneCreer({ identifiant: 'beta:ana-neuve', prenom: 'Ana', nom: 'N', origine: 'beta', verifie: true }).identifiant, 'Ana#7321');
    const cinq = S2.personneCreer({ identifiant: 'beta:ana-de-trop', prenom: 'Ana', nom: 'T', origine: 'beta', verifie: true }).identifiant;
    vrai('⛔ plus aucun à quatre chiffres : la suivante reçoit un identifiant à CINQ chiffres (' + cinq + '), et il se retrouve', /^Ana#\d{5}$/.test(cinq || '') && (() => { const l = identLire(cinq); return S2.personneParIdent(l.base, l.num) !== null; })());
    S2.fermer();
  } finally { fs.rmSync(bac, { recursive: true, force: true }); }
}

/* ══ 2. LE VRAI SERVICE, PARLÉ EN HTTP ══ */
async function service() {
  const svc = await TEL.lancerTel({ sms: { rechercheLatenceMs: 120, rechercheJour: 8, ajoutJour: 10, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
  SVC = svc;
  try {
    const A = await TEL.inscrire(svc, TEL.numeroBE(), 'Alice', { nom: 'Durand' });
    const B = await TEL.inscrire(svc, TEL.numeroBE(), 'Bruno', { nom: 'Martin' });
    const C = await TEL.inscrire(svc, TEL.numeroBE(), 'Chloé', { nom: 'Petit' });
    const H = await TEL.inscrire(svc, TEL.numeroBE(), 'Hélène', { nom: 'Roux' });
    const K1 = await TEL.inscrire(svc, TEL.numeroBE(), 'Karim', { nom: 'Un' }), K2 = await TEL.inscrire(svc, TEL.numeroBE(), 'Karim', { nom: 'Deux' });
    svc.avancer(25 * HEURE);   // plus des comptes « neufs » : le plafond ordinaire s'applique (celui des comptes neufs est celui de la recherche par numéro, joué par test-917)

    console.log('\n── 996 · chacun a son identifiant ──');
    const moi = async (c) => (await c.get('/api/moi')).j.moi;
    const iA = (await moi(A)).identifiant, iB = (await moi(B)).identifiant, iH = (await moi(H)).identifiant, iK1 = (await moi(K1)).identifiant, iK2 = (await moi(K2)).identifiant;
    vrai('⛔ /api/moi rend « Prénom#1234 » (' + [iA, iB, iH].join(', ') + ')', /^Alice#\d{4}$/.test(iA) && /^Bruno#\d{4}$/.test(iB) && /^Hélène#\d{4}$/.test(iH));
    vrai('   deux « Karim » : deux numéros différents (' + iK1 + ', ' + iK2 + ')', iK1 !== iK2 && /^Karim#/.test(iK1) && /^Karim#/.test(iK2));
    v('   GET /api/contacts/demandes le redit (identifiant), avec deux listes vides', [(await demandes(A)).identifiant, (await demandes(A)).recues, (await demandes(A)).envoyees], [iA, [], []]);

    console.log('\n── 996 · retrouver par l\'identifiant EXACT ──');
    const r = await parIdent(A, iB);
    v('⛔ Alice tape l\'identifiant de Bruno → trouvé : son identifiant, son PRÉNOM, pas encore contact, aucune demande', [r.code, r.j.trouve, r.j.id, r.j.prenom, r.j.identifiant, r.j.deja_contact, r.j.demande], [200, true, B.moi.id, 'Bruno', iB, false, 'aucune']);
    v('⛔ rien d\'autre ne sort (ni le nom de famille, ni l\'origine, ni le numéro)', Object.keys(r.j).sort(), ['deja_contact', 'demande', 'id', 'identifiant', 'prenom', 'trouve']);
    vrai('   (population : le nom de famille « Martin » existe bien — le contrôle ci-dessus ne passe pas sur du vide) et la réponse ne le contient pas', (await moi(B)).nom === 'Martin' && !r.txt.includes('Martin') && !r.txt.includes(B.numero.slice(3)));
    v('toutes les écritures retrouvent Hélène : minuscules sans accent, majuscules, une espace avant « # »', await Promise.all([iH.replace('Hélène', 'helene'), iH.toUpperCase(), iH.replace('#', ' #')].map(async t => (await parIdent(A, t)).j.id)), [H.moi.id, H.moi.id, H.moi.id]);

    console.log('\n── 996 · ⛔ un NOM seul n\'est pas un identifiant ──');
    const c0 = (await parIdent(C, 'Bruno')), c1 = await parIdent(C, 'Bruno#12'), c2 = await parIdent(C, undefined);
    v('« Bruno », « Bruno#12 », rien : 400 identifiant_invalide', [c0.code, c0.j.error, c1.code, c2.code], [400, 'identifiant_invalide', 400, 400]);

    console.log('\n── 996 · ⛔ la réponse NEUTRE : personne, moi, caché, bloqué — octet pour octet ──');
    const neutres = {};
    neutres.inconnu = (await parIdent(B, 'Personne#' + (iB.endsWith('1000') ? 1001 : 1000))).txt;
    neutres.moi = (await parIdent(B, iB)).txt;
    v('(Chloé règle « qui peut me trouver » sur « personne »)', (await C.post('/api/moi/confidentialite', { trouvable: 'personne' })).code, 200);
    neutres.cache = (await parIdent(B, (await moi(C)).identifiant)).txt;
    /* Hélène bloque Karim Un : il faut d'abord qu'ils se connaissent — par une demande acceptée */
    await parIdent(K1, iH); await K1.post('/api/contacts/demander', { id: H.moi.id }); await H.post('/api/contacts/demandes/repondre', { id: K1.moi.id, accepter: true });
    v('(Hélène bloque Karim Un)', (await H.post('/api/contacts/bloquer', { uid: K1.moi.id })).code, 200);
    neutres.bloque = (await parIdent(K1, iH)).txt;
    vrai('population : quatre cas joués (' + Object.keys(neutres).join(', ') + ')', Object.keys(neutres).length === 4);
    v('⛔ identifiant sans compte, MOI, personne qui se cache, personne qui m\'a bloqué : EXACTEMENT la même réponse', Object.entries(neutres).filter(([, t]) => t !== NEUTRE).map(([k]) => k), []);

    console.log('\n── 996 · ⛔ la même latence, trouvé ou non ──');
    const chrono = async (t) => { const t0 = Date.now(); await parIdent(B, t); return Date.now() - t0; };
    const lat = [await chrono(iA), await chrono('Personne#4242')];
    vrai('trouvé (' + lat[0] + ' ms) et pas trouvé (' + lat[1] + ' ms) : tous deux au moins 120 ms, la latence plancher réglée', lat.every(x => x >= 115));

    console.log('\n── 996 · ⛔ le plafond du jour est PARTAGÉ avec la recherche par numéro ──');
    {
      const D = await TEL.inscrire(svc, TEL.numeroBE(), 'Dora');
      svc.avancer(25 * HEURE);
      const codes = [];
      for (let i = 0; i < 4; i++) codes.push((await D.post('/api/contacts/chercher', { numero: TEL.numeroBE() }).then(x => (svc.avancer(61000), x))).code);
      for (let i = 0; i < 4; i++) codes.push((await parIdent(D, 'Personne#' + (2000 + i))).code);
      const neuvieme = await parIdent(D, 'Personne#3000');
      v('quatre recherches par numéro + quatre par identifiant passent (8, le plafond réglé), la neuvième est refusée : 429 recherches_plafond', [codes, neuvieme.code, neuvieme.j.error], [[200, 200, 200, 200, 200, 200, 200, 200], 429, 'recherches_plafond']);
      const nomSeul = await parIdent(D, 'Bruno');
      v('   un nom seul au-delà du plafond reste un 400 (il n\'est jamais compté)', nomSeul.code, 400);
      const E = await TEL.inscrire(svc, TEL.numeroBE(), 'Emma'); svc.avancer(25 * HEURE);
      const rafale = [];
      for (let i = 0; i < 6; i++) rafale.push((await parIdent(E, 'Personne#' + (5000 + i), true)).code);
      v('la rafale : cinq recherches dans la minute, la sixième 429', rafale, [200, 200, 200, 200, 200, 429]);
    }

    console.log('\n── 996 · demander : seulement quelqu\'un qu\'on VIENT de trouver ──');
    const R = await TEL.inscrire(svc, TEL.numeroBE(), 'Rémi', { nom: 'Fort' }), S = await TEL.inscrire(svc, TEL.numeroBE(), 'Sarah', { nom: 'Lune' });
    svc.avancer(25 * HEURE);
    const iS = (await moi(S)).identifiant, iR = (await moi(R)).identifiant;
    v('⛔ sans recherche préalable : 404 introuvable (un identifiant ramassé ailleurs n\'envoie rien)', (await R.post('/api/contacts/demander', { id: S.moi.id })).code, 404);
    v('   son propre identifiant, un identifiant mal formé : 400', [(await R.post('/api/contacts/demander', { id: R.moi.id })).code, (await R.post('/api/contacts/demander', { id: 'p_x' })).code], [400, 400]);
    await parIdent(R, iS);
    const n0 = (await notifs(S)).length;
    const dm = await R.post('/api/contacts/demander', { id: S.moi.id });
    v('Rémi trouve Sarah puis demande : « envoyee »', [dm.code, dm.j.resultat], [200, 'envoyee']);
    const nS = await notifs(S);
    v('⛔ Sarah est prévenue : une notification « Demande de contact » qui nomme Rémi', [nS.length - n0, nS[0] && nS[0].type, nS[0] && nS[0].titre, nS[0] && /Rémi Fort/.test(nS[0].texte)], [1, 'contact_demande', 'Demande de contact', true]);
    const dS = await demandes(S), dR = await demandes(R);
    v('⛔ elle la voit dans ses demandes REÇUES (prénom, nom, identifiant) ; Rémi dans ses ENVOYÉES', [dS.recues.map(d => [d.id, d.prenom, d.nom, d.identifiant]), dR.envoyees.map(d => [d.id, d.identifiant])], [[[R.moi.id, 'Rémi', 'Fort', iR]], [[S.moi.id, iS]]]);
    v('⛔ AVANT l\'accord, ils ne sont PAS en contact (ni présence, ni statut partagés)', [await mutuel(R, S.moi.id), await mutuel(S, R.moi.id)], [false, false]);
    v('⛔ et Rémi ne lit pas la fiche de Sarah (404, comme quelqu\'un qu\'on ne connaît pas)', (await R.get('/api/personnes/' + S.moi.id)).code, 404);
    await parIdent(R, iS);
    const re = await R.post('/api/contacts/demander', { id: S.moi.id });
    v('redemander : « deja_envoyee », et Sarah n\'est PAS relancée', [re.j.resultat, (await notifs(S)).length - n0], ['deja_envoyee', 1]);
    v('la recherche suivante dit « envoyee » à Rémi', (await parIdent(R, iS)).j.demande, 'envoyee');
    v('   et « recue » à Sarah', (await parIdent(S, iR)).j.demande, 'recue');

    console.log('\n── 996 · accepter ──');
    const nR0 = (await notifs(R)).length;
    const ac = await S.post('/api/contacts/demandes/repondre', { id: R.moi.id, accepter: true });
    v('Sarah accepte : « acceptee »', [ac.code, ac.j.resultat], [200, 'acceptee']);
    v('⛔ ils sont maintenant en contact, des deux côtés', [await mutuel(R, S.moi.id), await mutuel(S, R.moi.id)], [true, true]);
    const nR = await notifs(R);
    v('⛔ Rémi est prévenu : « Demande acceptée », qui nomme Sarah', [nR.length - nR0, nR[0] && nR[0].type, nR[0] && nR[0].titre, nR[0] && /Sarah Lune/.test(nR[0].texte)], [1, 'contact_ajoute', 'Demande acceptée', true]);
    v('   et la demande a disparu des deux listes', [(await demandes(S)).recues.length, (await demandes(R)).envoyees.length], [0, 0]);
    v('répondre une seconde fois : 404', (await S.post('/api/contacts/demandes/repondre', { id: R.moi.id, accepter: true })).code, 404);
    v('« accepter » qui n\'est pas un booléen : 400', (await S.post('/api/contacts/demandes/repondre', { id: R.moi.id, accepter: 'oui' })).code, 400);

    console.log('\n── 996 · refuser : en silence, et sans relance possible ──');
    const U = await TEL.inscrire(svc, TEL.numeroBE(), 'Ugo'); svc.avancer(25 * HEURE);
    await parIdent(U, iS); await U.post('/api/contacts/demander', { id: S.moi.id });
    const nU0 = (await notifs(U)).length, nS1 = (await notifs(S)).length;
    v('Sarah refuse la demande d\'Ugo : « refusee »', (await S.post('/api/contacts/demandes/repondre', { id: U.moi.id, accepter: false })).j.resultat, 'refusee');
    v('⛔ Ugo n\'est PAS prévenu, et la voit toujours dans ses envoyées ; Sarah ne la voit plus', [(await notifs(U)).length - nU0, (await demandes(U)).envoyees.map(d => d.id), (await demandes(S)).recues.length], [0, [S.moi.id], 0]);
    await parIdent(U, iS);
    v('⛔ Ugo redemande : « deja_envoyee », et Sarah n\'en reçoit RIEN', [(await U.post('/api/contacts/demander', { id: S.moi.id })).j.resultat, (await notifs(S)).length - nS1, (await demandes(S)).recues.length], ['deja_envoyee', 0, 0]);
    v('   ils ne sont pas en contact', await mutuel(U, S.moi.id), false);
    v('Ugo retire sa demande refusée : elle quitte SA liste…', [(await U.post('/api/contacts/demandes/annuler', { id: S.moi.id })).code, (await demandes(U)).envoyees.length], [200, 0]);
    await parIdent(U, iS);
    v('   …mais redemander ne relance toujours pas Sarah (la trace reste : pas de demande en boucle)', [(await U.post('/api/contacts/demander', { id: S.moi.id })).j.resultat, (await notifs(S)).length - nS1], ['deja_envoyee', 0]);

    console.log('\n── 996 · deux demandes croisées valent un accord ; retirer une demande en attente ──');
    const X = await TEL.inscrire(svc, TEL.numeroBE(), 'Xavier'), Y = await TEL.inscrire(svc, TEL.numeroBE(), 'Yasmine'); svc.avancer(25 * HEURE);
    const iX = (await moi(X)).identifiant, iY = (await moi(Y)).identifiant;
    await parIdent(X, iY); await X.post('/api/contacts/demander', { id: Y.moi.id });
    await parIdent(Y, iX);
    v('Xavier demande Yasmine, puis Yasmine demande Xavier : « acceptee », contact mutuel', [(await Y.post('/api/contacts/demander', { id: X.moi.id })).j.resultat, await mutuel(X, Y.moi.id), await mutuel(Y, X.moi.id)], ['acceptee', true, true]);
    v('   plus aucune demande entre eux', [(await demandes(X)).envoyees.length, (await demandes(Y)).recues.length], [0, 0]);
    const W = await TEL.inscrire(svc, TEL.numeroBE(), 'Wanda'); svc.avancer(25 * HEURE);
    await parIdent(W, iX); await W.post('/api/contacts/demander', { id: X.moi.id });
    v('Wanda retire sa demande EN ATTENTE : Xavier ne la voit plus', [(await W.post('/api/contacts/demandes/annuler', { id: X.moi.id })).code, (await demandes(X)).recues.length, (await demandes(W)).envoyees.length], [200, 0, 0]);
    v('   retirer ce qui n\'existe pas : 404', (await W.post('/api/contacts/demandes/annuler', { id: X.moi.id })).code, 404);
    v('⛔ trouvé par NUMÉRO, on peut aussi demander (sans ajout direct)', await (async () => { await W.post('/api/contacts/chercher', { numero: Y.numero }); svc.avancer(61000); return (await W.post('/api/contacts/demander', { id: Y.moi.id })).j.resultat; })(), 'envoyee');

    console.log('\n── 996 · l\'identifiant suit le prénom ──');
    const numA = iA.split('#')[1];
    v('Alice devient « Alicia » : son identifiant devient « Alicia#' + numA + ' » (le numéro est gardé, il est libre)', (await A.post('/api/moi/maj', { prenom: 'Alicia' })).j.moi.identifiant, 'Alicia#' + numA);
    v('⛔ l\'ancien « ' + iA + ' » ne mène plus à personne (réponse neutre), le nouveau si', [(await parIdent(B, iA)).txt, (await parIdent(B, 'Alicia#' + numA)).j.id], [NEUTRE, A.moi.id]);
    v('changer de nom de famille ou de statut ne change pas l\'identifiant', (await A.post('/api/moi/maj', { nom: 'Autre', statut: 'Au dépôt' })).j.moi.identifiant, 'Alicia#' + numA);

    console.log('\n── 996 · l\'export le contient ──');
    const ex = await S.post('/api/compte/export', {});
    v('l\'export de Sarah porte son identifiant et ses demandes de contact', [ex.code, ex.j && ex.j.profil && ex.j.profil.identifiant, ex.j && ex.j.demandes_contact && Array.isArray(ex.j.demandes_contact.recues)], [200, iS, true]);
    v('⛔ sans session : 401 partout', await Promise.all([['POST', '/api/contacts/identifiant', { identifiant: iS }], ['POST', '/api/contacts/demander', { id: S.moi.id }], ['GET', '/api/contacts/demandes'], ['POST', '/api/contacts/demandes/repondre', { id: S.moi.id, accepter: true }], ['POST', '/api/contacts/demandes/annuler', { id: S.moi.id }]]
      .map(async ([m, p, b]) => (await T.client(svc.base).appel(m, p, b)).code)), [401, 401, 401, 401, 401]);
  } finally { await svc.arreter(); }
}

(async () => {
  moduleSeul();
  await service();
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exit(1); });
