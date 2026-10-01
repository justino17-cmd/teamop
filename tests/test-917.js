/* ⛔ CE QUE CE FICHIER GARDE — RETROUVER UNE PERSONNE PAR SON NUMÉRO « COMME WHATSAPP », SANS DEVENIR UN ANNUAIRE (famille 3 de SERVEUR.md § 3.11).

   `POST /api/contacts/chercher {numero}` : si un compte existe, ne t'a pas bloqué et se laisse trouver → `{id, prenom}` et l'ajout est
   possible ; sinon une réponse NEUTRE, la même pour « personne », « il m'a bloqué », « il ne veut pas être trouvé », « c'est moi ».

   ⛔ ANTI-ÉNUMÉRATION : un compte qui peut tester des milliers de numéros reconstitue l'annuaire de tout le monde (et trouve qui a un
   compte). Donc 30 recherches par jour et par compte — 10 pour un compte de moins de 24 h —, 5 par minute, un plafond DURABLE (en
   base : un redémarrage ne le remet pas à zéro), compté AVANT de savoir si le numéro existe, et LA MÊME LATENCE que le numéro existe ou
   non (une réponse plus rapide pour « personne » dirait quels numéros ont un compte, plafond ou pas).
   ⛔ `ajouter` ne vaut que pour une personne qu'on VIENT de trouver (10 minutes) — et se revérifie au moment de l'ajout : elle a pu se
   rendre introuvable, ou nous bloquer, depuis. Un identifiant deviné ou ramassé ailleurs n'ouvre pas un contact.
   ⛔ Un réglage « qui peut me trouver par mon numéro » : tous | personne. Ni le numéro ni le nom de famille ne sortent jamais d'ici. */
const path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const { MIN, HEURE, JOUR } = TEL;

const retryDe = (r) => { const h = r.h.get('retry-after'); return /^\d+$/.test(h || '') ? parseInt(h, 10) : null; };
let SVC = null;   // le service de la section en cours : `cherche` avance l'horloge d'une minute avant chaque recherche pour ne jouer QUE ce que le banc veut mesurer (le plafond par minute est joué à part)
const cherche = async (c, numero, sansPause) => { if (SVC && !sansPause) SVC.avancer(61 * 1000); return c.post('/api/contacts/chercher', { numero }); };
const NEUTRE = JSON.stringify({ trouve: false });

(async () => {
  console.log('\n── 917 · retrouver une personne par son numéro ──');
  {
    const svc = await TEL.lancerTel({ sms: { rechercheLatenceMs: 120, ajoutJour: 3, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
    SVC = svc;
    try {
      const nA = TEL.numeroBE(), nB = TEL.numeroBE(), nC = TEL.numeroBE(), nInconnu = TEL.numeroBE();
      const A = await TEL.inscrire(svc, nA, 'Alice', { nom: 'Durand' }), B = await TEL.inscrire(svc, nB, 'Bruno', { nom: 'Martin' }), C = await TEL.inscrire(svc, nC, 'Chloé', { nom: 'Petit' });
      svc.avancer(25 * HEURE);   // Alice n'est plus un compte « neuf » : le plafond de 30 par jour s'applique (le plafond des comptes neufs est joué plus bas)
      const r = await cherche(A, nB);
      v('⛔ Alice cherche le numéro de Bruno → trouvé : son identifiant, son PRÉNOM, et l\'ajout possible', [r.code, r.j.trouve, r.j.id, r.j.prenom, r.j.deja_contact, r.j.ajout_possible], [200, true, B.moi.id, 'Bruno', false, true]);
      v('⛔ rien d\'autre ne sort : ni le nom de famille, ni le numéro, ni l\'origine', Object.keys(r.j).sort(), ['ajout_possible', 'deja_contact', 'id', 'prenom', 'trouve']);
      vrai('   (population : le nom de famille « Martin » existe bien en base — le contrôle ci-dessus ne passe pas sur du vide)', (await B.get('/api/moi')).j.moi.nom === 'Martin');
      vrai('   et la réponse ne contient aucun chiffre du numéro', !r.txt.includes(nB.slice(3)));
      v('un format de saisie différent (« 00 32 470… », avec espaces) retrouve la même personne', (await cherche(A, '0032 ' + nB.slice(3, 6) + ' ' + nB.slice(6, 8) + ' ' + nB.slice(8, 10) + ' ' + nB.slice(10))).j.id, B.moi.id);

      console.log('\n── 917 · ⛔ une réponse NEUTRE, la même pour « personne », « bloqué », « introuvable », « moi » ──');
      const neutres = {};
      neutres.inconnu = (await cherche(A, nInconnu)).txt;
      neutres.moi = (await cherche(A, nA)).txt;
      /* Caché : Chloé se rend introuvable. */
      v('Chloé règle « qui peut me trouver » sur « personne »', [(await C.post('/api/moi/confidentialite', { trouvable: 'personne' })).j, (await C.get('/api/moi/confidentialite')).j], [{ ok: true, trouvable: 'personne' }, { trouvable: 'personne' }]);
      neutres.cache = (await cherche(A, nC)).txt;
      /* Bloqué : Bruno bloque Alice (il doit d'abord la connaître). */
      const D = await TEL.inscrire(svc, TEL.numeroBE(), 'Dora'), nD = D.numero;
      const trouveD = await cherche(B, nD); await B.post('/api/contacts/ajouter', { id: trouveD.j.id });
      const bloc = await B.post('/api/contacts/bloquer', { uid: D.moi.id });
      v('(Bruno ajoute puis bloque Dora)', [trouveD.j.trouve, bloc.code], [true, 200]);
      neutres.bloque = (await cherche(D, nB)).txt;
      vrai('la population : quatre cas différents ont été joués (' + Object.keys(neutres).join(', ') + ')', Object.keys(neutres).length === 4);
      v('⛔ numéro sans compte, MOI-MÊME, personne qui se cache, personne qui m\'a bloqué : EXACTEMENT la même réponse, octet pour octet', Object.values(neutres).every(t => t === NEUTRE), true);
      v('   (et cette réponse est bien « trouve: false », sans rien d\'autre)', NEUTRE, '{"trouve":false}');
      v('un numéro mal formé → 400 (il ne compte pas comme une recherche)', [(await cherche(A, 'bonjour')).code, (await cherche(A, '+33')).code, (await cherche(A, undefined)).code], [400, 400, 400]);
      v('sans session → 401', (await T.client(svc.base).post('/api/contacts/chercher', { numero: nB })).code, 401);

      console.log('\n── 917 · ajouter : seulement une personne qu\'on VIENT de trouver, revérifiée au moment de l\'ajout ──');
      const sansRecherche = await A.post('/api/contacts/ajouter', { id: C.moi.id });
      v('⛔ ajouter un identifiant JAMAIS cherché → 404 (un identifiant deviné ou ramassé ailleurs n\'ouvre pas un contact)', [sansRecherche.code, sansRecherche.j.error], [404, 'introuvable']);
      v('un identifiant mal formé, ou le sien → 400', [(await A.post('/api/contacts/ajouter', { id: 'n-importe-quoi' })).code, (await A.post('/api/contacts/ajouter', { id: A.moi.id })).code], [400, 400]);
      const ajout = await A.post('/api/contacts/ajouter', { id: B.moi.id });
      v('Alice ajoute Bruno (qu\'elle vient de trouver) → 200, le contact avec son prénom', [ajout.code, ajout.j.ok, ajout.j.deja, ajout.j.contact.prenom], [200, true, false, 'Bruno']);
      vrai('   la réponse ne porte aucun numéro', !ajout.txt.includes(nB.slice(3)));
      const notif = (await B.get('/api/notifications')).j.notifications;
      vrai('⛔ Bruno est PRÉVENU (« Nouveau contact »), sans le numéro d\'Alice : ' + notif.length + ' notification(s)', notif.some(x => x.type === 'contact_ajoute' && x.titre === 'Nouveau contact' && !JSON.stringify(x).includes(nA.slice(3))));
      v('⛔ l\'ajout consomme la recherche : le même identifiant ajouté de nouveau sans nouvelle recherche → 404', (await A.post('/api/contacts/ajouter', { id: B.moi.id })).code, 404);
      const dejaVu = await cherche(A, nB);
      v('une recherche suivante dit « déjà contact », sans proposer l\'ajout', [dejaVu.j.deja_contact, dejaVu.j.ajout_possible], [true, false]);
      /* Il se rend introuvable ENTRE la recherche et l'ajout. */
      await cherche(A, nC);
      await C.post('/api/moi/confidentialite', { trouvable: 'personne' });
      v('⛔ trouvée, puis devenue introuvable avant l\'ajout : 404 (l\'ajout RELIT le réglage)', (await A.post('/api/contacts/ajouter', { id: C.moi.id })).code, 404);
      /* Il bloque ENTRE la recherche et l'ajout. */
      const E = await TEL.inscrire(svc, TEL.numeroBE(), 'Elsa');
      await cherche(A, E.numero);
      const blocE = await E.post('/api/contacts/bloquer', { uid: A.moi.id });
      void blocE;
      const ajE = await A.post('/api/contacts/ajouter', { id: E.moi.id });
      v('⛔ trouvée, puis qui BLOQUE avant l\'ajout (elle doit connaître Alice pour la bloquer : sinon le blocage est refusé et l\'ajout passe, ce qui est juste) — l\'ajout ne passe jamais contre un blocage', blocE.code === 200 ? ajE.code : 404, 404);
      /* Le réglage se relit. */
      v('un réglage qui n\'est ni « tous » ni « personne » → 400', (await C.post('/api/moi/confidentialite', { trouvable: 'mes-amis' })).code, 400);
      v('sans session → 401', [(await T.client(svc.base).get('/api/moi/confidentialite')).code, (await T.client(svc.base).post('/api/moi/confidentialite', { trouvable: 'tous' })).code], [401, 401]);
      await C.post('/api/moi/confidentialite', { trouvable: 'tous' });
      v('Chloé se laisse de nouveau trouver → on la retrouve', (await cherche(A, nC)).j.trouve, true);

      console.log('\n── 917 · ⛔ la MÊME LATENCE : trouvé ou non, le temps ne dit rien ──');
      {
        const svcL = await TEL.lancerTel({ sms: { rechercheLatenceMs: 400, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
        SVC = svcL;
        try {
          const X = await TEL.inscrire(svcL, TEL.numeroBE(), 'Xavier'), Y = await TEL.inscrire(svcL, TEL.numeroBE(), 'Yann');
          const mesure = async (num) => { const t0 = Date.now(); const r = await cherche(X, num); return [Date.now() - t0, r.j.trouve]; };
          const trouve = await mesure(Y.numero), absent = await mesure(TEL.numeroBE());
          v('population : une recherche trouvée, une non trouvée', [trouve[1], absent[1]], [true, false]);
          vrai('⛔ « personne » ne répond PAS plus vite : les deux attendent le plancher de 400 ms (' + trouve[0] + ' ms et ' + absent[0] + ' ms)', trouve[0] >= 380 && absent[0] >= 380);
          const cacheY = await mesure(X.numero);
          vrai('   ni « moi-même » (' + cacheY[0] + ' ms)', cacheY[0] >= 380);
        } finally { await svcL.arreter(); }
      }
    } finally { SVC = null; await svc.arreter(); }
  }

  console.log('\n── 917 · ⛔ ANTI-ÉNUMÉRATION : 10 par jour pour un compte NEUF, 30 pour un ancien, 5 par minute, plafond DURABLE ──');
  {
    const dossier = require('fs').mkdtempSync(path.join(require('os').tmpdir(), 'banc-tel-enum-'));
    const cle = require('crypto').randomBytes(32).toString('hex');
    const ovh = await TEL.fauxOvhService();
    const conf = { sms: { rechercheLatenceMs: 0, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 }, dossier, cle, ovh };
    let svc = await TEL.lancerTel(conf);
    const confRedemarrage = Object.assign({}, conf, { port: svc.port });   // le MÊME port : les clients gardent leur adresse
    try {
      const P = await TEL.inscrire(svc, TEL.numeroBE(), 'Pirate');
      const cible = await TEL.inscrire(svc, TEL.numeroBE(), 'Cible');
      const codes = [];
      for (let i = 0; i < 5; i++) codes.push((await cherche(P, i % 2 ? cible.numero : TEL.numeroBE())).code);
      const sixieme = await cherche(P, TEL.numeroBE());
      v('⛔ 5 recherches par minute : la sixième est refusée 429 « recherches_plafond », avec son Retry-After', [codes, sixieme.code, sixieme.j.error, retryDe(sixieme) >= 1 && retryDe(sixieme) <= 60], [Array(5).fill(200), 429, 'recherches_plafond', true]);
      svc.avancer(61 * 1000);
      for (let i = 0; i < 5; i++) await cherche(P, TEL.numeroBE());
      const totalApres10 = await cherche(P, TEL.numeroBE());
      v('⛔ un compte de moins de 24 h : DIX recherches par jour — la onzième est refusée, même après la minute (le plafond du jour, pas celui de la minute)', [totalApres10.code, totalApres10.j.error], [429, 'recherches_plafond']);
      svc.avancer(61 * 1000);
      vrai('   Retry-After : de l\'ordre d\'une heure', retryDe(await cherche(P, TEL.numeroBE())) === 3600);
      /* Le plafond est compté AVANT de savoir si le numéro existe : un numéro qui existe et un qui n'existe pas usent le même compteur, et un refus ne dit rien. */
      const refusExistant = await cherche(P, cible.numero), refusAbsent = await cherche(P, TEL.numeroBE());
      v('⛔ le plafond atteint, un numéro qui EXISTE et un qui n\'existe pas reçoivent le MÊME refus (le plafond est compté avant de chercher)', [refusExistant.code, refusAbsent.code, refusExistant.txt === refusAbsent.txt], [429, 429, true]);
      /* Durable : un redémarrage ne remet pas le compteur à zéro. */
      await svc.arreter(false);
      svc = await TEL.lancerTel(confRedemarrage);
      v('⛔ le service REDÉMARRÉ (compteurs mémoire à zéro, session conservée) refuse toujours : le plafond du jour est en base', (await cherche(P, TEL.numeroBE())).code, 429);
      /* Un compte ancien : 30. */
      svc.avancer(25 * HEURE);
      const ok = [];
      for (let i = 0; i < 30; i++) { if (i && i % 5 === 0) svc.avancer(61 * 1000); ok.push((await cherche(P, TEL.numeroBE())).code); }
      v('⛔ 25 heures plus tard le compte n\'est plus « neuf » : TRENTE recherches passent, par rafales de 5 par minute', ok.filter(c => c === 200).length, 30);
      svc.avancer(61 * 1000);
      v('et la trente et unième est refusée', (await cherche(P, TEL.numeroBE())).code, 429);
      svc.avancer(24 * HEURE);
      v('vingt-quatre heures plus tard, la fenêtre est vide : repart', (await cherche(P, TEL.numeroBE())).code, 200);
    } finally { await svc.arreter(false); await ovh.fermer(); require('fs').rmSync(dossier, { recursive: true, force: true }); }
  }
  {
    /* Chaque COMPTE a son plafond : un compte ne grille pas celui d'un autre. */
    const svc = await TEL.lancerTel({ sms: { rechercheLatenceMs: 0, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
    try {
      const P = await TEL.inscrire(svc, TEL.numeroBE(), 'P1'), Q = await TEL.inscrire(svc, TEL.numeroBE(), 'Q1');
      for (let i = 0; i < 5; i++) await cherche(P, TEL.numeroBE());
      v('le plafond est PAR COMPTE : un autre compte, au même instant, cherche encore', [(await cherche(P, TEL.numeroBE())).code, (await cherche(Q, TEL.numeroBE())).code], [429, 200]);
    } finally { await svc.arreter(); }
  }
  {
    /* Le plafond d'ajouts : un compte neuf en a le tiers. */
    const svc = await TEL.lancerTel({ sms: { rechercheLatenceMs: 0, ajoutJour: 3, budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
    try {
      const A = await TEL.inscrire(svc, TEL.numeroBE(), 'A'), cibles = [];
      for (let i = 0; i < 3; i++) cibles.push(await TEL.inscrire(svc, TEL.numeroBE(), 'Cible' + i));
      const codes = [];
      for (const c of cibles.slice(0, 2)) { await cherche(A, c.numero); codes.push((await A.post('/api/contacts/ajouter', { id: c.moi.id })).code); }
      v('⛔ un compte neuf a le TIERS du plafond d\'ajouts (3 par jour → 1) : le premier passe, le second → 429 « ajouts_plafond »', codes, [200, 429]);
    } finally { await svc.arreter(); }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
