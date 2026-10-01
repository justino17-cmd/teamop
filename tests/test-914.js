/* ⛔ CE QUE CE FICHIER GARDE — LE COMPTE PERSO PAR NUMÉRO : INSCRIPTION, SESSION, NOUVEL APPAREIL, RECONNEXION SANS SMS (famille 3 de SERVEUR.md § 3.11).

   Le VRAI service, lancé isolé, parlé en HTTP, avec un FAUX OVH qui recalcule la signature : on joue ce que fait un téléphone.
   Décision de Justin (1er octobre 2026) : « pour l'utilisateur classique c'est avec leur numéro de téléphone » — et « le but c'est
   qu'on gagne de l'argent » : chaque SMS est un coût, donc

     · UN SMS à l'inscription et sur un NOUVEL appareil, JAMAIS à chaque connexion : une session de 90 jours GLISSANTS, et un
       appareil déjà vérifié (jeton d'appareil, haché en base) qui se reconnecte SANS SMS, même session perdue ;
     · le code : 6 chiffres, 10 minutes, 5 essais comptés avant d'être jugés, usage unique — et RANGÉ HACHÉ ;
     · DES RÉPONSES UNIFORMES : on ne dit jamais « ce numéro a un compte » avant la preuve du code ;
     · AUCUNE TRACE du numéro ni du code ailleurs que là où elle doit être (scellée) : ni journal, ni /health, ni réponse d'un autre
       compte, ni octet en clair sur le disque — des CANARIS, cherchés dans tout ce que le service écrit ;
     · la porte de TEST des codes (un fichier en clair) est REFUSÉE au démarrage en production.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque « aucune trace » est précédé de ce qu'il aurait pu trouver. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const { MIN, HEURE, JOUR } = TEL;

(async () => {
  /* Les budgets en euros sont joués par test-915 : ici ils sont relevés pour que ce parcours (une vingtaine de SMS belges) ne tombe pas sur le plafond horaire d'un pays (1,5 €). */
  const svc = await TEL.lancerTel({ sms: { budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500 } });
  const ovh = svc.ovh;
  const base = svc.base;
  const ip = () => TEL.reseauNeuf();
  try {
    const NUM = TEL.numeroBE(), NUM2 = TEL.numeroBE();
    const chiffres = (n) => n.replace(/\D/g, '');

    console.log('\n── 914 · l\'inscription : un SMS, un code, un compte ──');
    const alice = T.client(base, { xff: ip() });
    const r1 = await alice.post('/api/tel/code', { numero: NUM });
    v('POST /api/tel/code → 200, le délai de renvoi (60 s), la durée du code (10 min), sa longueur (6)', [r1.code, r1.j.ok, r1.j.delai_s, r1.j.expire_s, r1.j.longueur], [200, true, 60, 600, 6]);
    v('⛔ EXACTEMENT UN SMS est parti, vers le bon numéro, signé comme OVH le veut', [ovh.jobs.length, ovh.jobs[0].numero, ovh.signaturesFausses], [1, NUM, 0]);
    const code1 = await svc.code(NUM);
    vrai('le SMS porte le code à 6 chiffres que le service a rangé (lu par la porte de test)', /^\d{6}$/.test(code1) && ovh.jobs[0].message.includes(code1));
    v('⛔ un message court, transactionnel (« Votre code OP MESSAGES : … »), sans clause STOP facturée', [/^Votre code OP MESSAGES : \d{6}/.test(ovh.jobs[0].message), ovh.jobs[0].message.length < 100, ovh.jobs[0].noStopClause], [true, true, true]);
    vrai('   la réponse HTTP ne contient NI le code ni le numéro', !r1.txt.includes(code1) && !r1.txt.includes(chiffres(NUM).slice(2)));
    vrai('   le cookie d\'appareil est posé (HttpOnly, SameSite=Strict) — c\'est lui qui évitera le prochain SMS', (r1.h.getSetCookie() || []).some(c => /^opma=opd_/.test(c) && /HttpOnly/i.test(c) && /SameSite=Strict/i.test(c)));

    const faux = await alice.post('/api/tel/verifier', { numero: NUM, code: code1 === '000000' ? '000001' : '000000', prenom: 'Alice', nom: 'Durand' });
    v('un code FAUX → 401 « code_invalide », sans session', [faux.code, faux.j, alice.cookie()], [401, { error: 'code_invalide' }, null]);
    const bon = await alice.post('/api/tel/verifier', { numero: NUM, code: code1, prenom: 'Alice', nom: 'Durand', appareil: 'iPhone d\'Alice' });
    v('le bon code → 200, compte NEUF', [bon.code, bon.j.ok, bon.j.nouveau], [200, true, true]);
    v('   le compte porte son prénom et son nom, l\'origine « telephone », un identifiant opaque', [bon.j.moi.prenom, bon.j.moi.nom, bon.j.moi.origine, /^p_[0-9a-f]{32}$/.test(bon.j.moi.id)], ['Alice', 'Durand', 'telephone', true]);
    vrai('⛔ le compte ne rend JAMAIS le numéro (ni dans la réponse, ni dans /api/moi)', !bon.txt.includes(chiffres(NUM).slice(2)) && !(await alice.get('/api/moi')).txt.includes(chiffres(NUM).slice(2)));
    const moi = await alice.get('/api/moi');
    v('la session est posée : GET /api/moi → 200, la même personne', [moi.code, moi.j.moi.id], [200, bon.j.moi.id]);
    v('⛔ un code ne sert qu\'UNE fois : le même code rejoué (autre appareil) → 401', (await T.client(base, { xff: ip() }).post('/api/tel/verifier', { numero: NUM, code: code1, prenom: 'X' })).code, 401);

    console.log('\n── 914 · ⛔ MOINS DE SMS : session perdue, appareil connu → reconnexion SANS SMS ──');
    const jobsAvant = ovh.jobs.length;
    alice.poserCookie(null);   // la session disparaît (cookie effacé, onglet fermé…) ; le cookie d'appareil reste
    v('sans session, /api/moi → 401', (await alice.get('/api/moi')).code, 401);
    const rec = await alice.post('/api/tel/appareil', {});
    v('POST /api/tel/appareil avec le seul cookie d\'appareil → 200, session rendue', [rec.code, rec.j.ok, rec.j.moi.id], [200, true, bon.j.moi.id]);
    v('⛔ AUCUN SMS n\'est parti', ovh.jobs.length, jobsAvant);
    alice.poserCookie(null);
    const rec2 = await alice.post('/api/tel/code', { numero: NUM });
    v('« demander un code » depuis un appareil déjà vérifié pour ce numéro : connecté tout de suite, SANS SMS', [rec2.code, rec2.j.connecte, ovh.jobs.length], [200, true, jobsAvant]);
    v('   et la session marche', (await alice.get('/api/moi')).code, 200);
    {
      /* Un cookie d'appareil FORGÉ, ou celui d'un AUTRE compte avec le numéro d'Alice, ne connecte pas. */
      const forge = T.client(base, { xff: ip() });
      forge.absorber({ headers: { getSetCookie: () => ['opma=opd_' + 'A'.repeat(43) + '; Path=/'] } });
      v('⛔ un cookie d\'appareil inventé → 401 « appareil_inconnu »', (await forge.post('/api/tel/appareil', {})).j, { error: 'appareil_inconnu' });
      const sans = T.client(base, { xff: ip() });
      v('sans aucun cookie → 401 aussi', (await sans.post('/api/tel/appareil', {})).code, 401);
    }

    console.log('\n── 914 · ⛔ UN NOUVEL APPAREIL : un SMS, et le compte est LE MÊME ──');
    svc.avancer(61 * 1000);   // le renvoi pour ce numéro attend 60 s
    const tel2 = T.client(base, { xff: ip() });
    const n1 = await tel2.post('/api/tel/code', { numero: NUM });
    v('un appareil sans cookie : un SMS part', [n1.code, n1.j.ok, n1.j.connecte, ovh.jobs.length], [200, true, undefined, jobsAvant + 1]);
    const code2 = await svc.code(NUM);
    const n2 = await tel2.post('/api/tel/verifier', { numero: NUM, code: code2, appareil: 'iPad' });
    v('le code juste → 200, « nouveau » FAUX : c\'est le même compte', [n2.code, n2.j.nouveau, n2.j.moi.id], [200, false, bon.j.moi.id]);
    v('   le deuxième appareil se reconnecte à son tour sans SMS', await (async () => { tel2.poserCookie(null); const r = await tel2.post('/api/tel/appareil', {}); return [r.code, ovh.jobs.length]; })(), [200, jobsAvant + 1]);

    console.log('\n── 914 · ⛔ DES RÉPONSES UNIFORMES : jamais « ce numéro a un compte » avant la preuve ──');
    {
      const inconnu = TEL.numeroBE();
      svc.avancer(61 * 1000);
      const a = T.client(base, { xff: ip() }), b = T.client(base, { xff: ip() });
      const ra = await a.post('/api/tel/code', { numero: NUM }), rb = await b.post('/api/tel/code', { numero: inconnu });
      v('demander un code : même statut, mêmes champs, mêmes valeurs pour un numéro AVEC compte et SANS', [ra.code, rb.code, JSON.stringify(ra.j) === JSON.stringify(rb.j)], [200, 200, true]);
      v('   et un SMS part dans les deux cas (rien ne distingue les deux au prix payé)', ovh.jobs.slice(-2).map(j => j.numero).sort(), [NUM, inconnu].sort());
      const codeInconnu = await svc.code(inconnu);
      /* Prouver avec un faux code : numéro avec compte, numéro sans compte, numéro qui n'a JAMAIS demandé de code. */
      const jamais = TEL.numeroBE();
      const reps = [];
      for (const n of [NUM, inconnu, jamais]) { const r = await T.client(base, { xff: ip() }).post('/api/tel/verifier', { numero: n, code: '000000' === codeInconnu ? '000001' : '000000', prenom: 'Z' }); reps.push([r.code, r.txt]); }
      v('⛔ un code faux : 401 « code_invalide » IDENTIQUE (octet pour octet) pour un compte, un numéro sans compte, un numéro sans code demandé', [reps[0][0], reps[0][1] === reps[1][1] && reps[1][1] === reps[2][1], JSON.parse(reps[0][1])], [401, true, { error: 'code_invalide' }]);
      /* Un numéro dont le compte est suspendu ne le dit pas non plus : le code juste donne la même réponse qu'un code faux. */
      const bobN = TEL.numeroBE();
      const bob = await TEL.inscrire(svc, bobN, 'Bob');
      v('(un compte existant, code absent) un code juste d\'un AUTRE numéro n\'ouvre pas ce compte', (await T.client(base, { xff: ip() }).post('/api/tel/verifier', { numero: bobN, code: codeInconnu, prenom: 'Y' })).code, 401);
      vrai('   et Bob existe bien (la population du contrôle précédent n\'est pas vide)', !!bob.moi.id);
    }
    {
      const mal = [['numero manquant', {}], ['numéro n\'est pas du texte', { numero: 3247012345 }], ['numéro n\'est pas un numéro', { numero: 'bonjour' }], ['numéro sans indicatif', { numero: '0470123456' }]];
      const codes = [], avantMal = ovh.jobs.length;
      for (const [, corps] of mal) codes.push((await T.client(base, { xff: ip() }).post('/api/tel/code', corps)).code);
      v('⛔ quatre numéros mal formés → quatre 400, et AUCUN SMS ne part', [codes, ovh.jobs.length - avantMal], [[400, 400, 400, 400], 0]);
      v('un code qui n\'a pas 6 chiffres → 400 (jamais comparé)', (await T.client(base, { xff: ip() }).post('/api/tel/verifier', { numero: NUM, code: '12345' })).code, 400);
      v('un code qui n\'est pas du texte → 400', (await T.client(base, { xff: ip() }).post('/api/tel/verifier', { numero: NUM, code: 123456 })).code, 400);
    }

    console.log('\n── 914 · le code : 10 minutes, 5 essais comptés avant d\'être jugés, usage unique ──');
    {
      /* Expiré. */
      const n = TEL.numeroBE(), c = T.client(base, { xff: ip() });
      await c.post('/api/tel/code', { numero: n }); const code = await svc.code(n);
      svc.avancer(10 * MIN + 1000);
      v('⛔ un code vieux de plus de 10 minutes → 401, même juste', (await c.post('/api/tel/verifier', { numero: n, code, prenom: 'E' })).code, 401);
      svc.avancer(-(10 * MIN + 1000));
    }
    {
      /* Juste à temps. */
      const n = TEL.numeroBE(), c = T.client(base, { xff: ip() });
      await c.post('/api/tel/code', { numero: n }); const code = await svc.code(n);
      svc.avancer(9 * MIN + 30000);
      v('un code de 9 min 30 s → accepté (la fenêtre est de 10 minutes)', (await c.post('/api/tel/verifier', { numero: n, code, prenom: 'J' })).code, 200);
      svc.avancer(-(9 * MIN + 30000));
    }
    {
      /* Cinq essais : le sixième est refusé même avec le bon code. */
      const n = TEL.numeroBE(), c = T.client(base, { xff: ip() });
      await c.post('/api/tel/code', { numero: n }); const code = await svc.code(n);
      const mauvais = code === '111111' ? '222222' : '111111';
      const codes = [];
      for (let i = 0; i < 5; i++) codes.push((await c.post('/api/tel/verifier', { numero: n, code: mauvais, prenom: 'F' })).code);
      v('cinq essais faux → cinq 401', codes, Array(5).fill(401));
      v('⛔ le BON code arrive au sixième essai → refusé : les essais sont épuisés, il faut redemander un code (donc passer les plafonds)', [(await c.post('/api/tel/verifier', { numero: n, code, prenom: 'F' })).code, ovh.jobs.length > 0], [401, true]);
      svc.avancer(61 * 1000);
      const jobs = ovh.jobs.length;
      await c.post('/api/tel/code', { numero: n }); const neuf = await svc.code(n);
      v('un code NEUF (après 60 s) remet les essais à zéro et rend le compte accessible', [ovh.jobs.length, (await c.post('/api/tel/verifier', { numero: n, code: neuf, prenom: 'F' })).code], [jobs + 1, 200]);
    }
    {
      /* Le dernier essai épuise le code, juste ou faux : on ne gagne pas un essai gratuit par un appel interrompu. */
      const n = TEL.numeroBE(), c = T.client(base, { xff: ip() });
      await c.post('/api/tel/code', { numero: n }); const code = await svc.code(n);
      const mauvais = code === '111111' ? '222222' : '111111';
      for (let i = 0; i < 4; i++) await c.post('/api/tel/verifier', { numero: n, code: mauvais, prenom: 'G' });
      v('quatre faux puis le juste au cinquième essai → accepté', (await c.post('/api/tel/verifier', { numero: n, code, prenom: 'G' })).code, 200);
    }
    {
      /* Un code neuf REMPLACE l'ancien : l'ancien ne vaut plus. */
      const n = TEL.numeroBE(), c = T.client(base, { xff: ip() });
      await c.post('/api/tel/code', { numero: n }); const ancien = await svc.code(n);
      svc.avancer(61 * 1000);
      await c.post('/api/tel/code', { numero: n });
      let neuf = await TEL_attendreAutre(svc, n, ancien);
      const ra = await c.post('/api/tel/verifier', { numero: n, code: ancien, prenom: 'H' });
      v('⛔ le code d\'avant un renvoi ne vaut plus (un seul code vivant par numéro)', ancien === neuf ? 'même' : ra.code, ancien === neuf ? 'même' : 401);
    }

    console.log('\n── 914 · ⛔ la session dure 90 jours GLISSANTS (le moins de SMS possible) ──');
    {
      const n = TEL.numeroBE(), c = await TEL.inscrire(svc, n, 'Sonia');
      const db = T.lireBase(path.join(svc.data, 'msg.db'));
      const lire = () => db.prepare('SELECT exp, vu FROM session WHERE personne = ? ORDER BY cree DESC LIMIT 1').get(c.moi.id);
      const t0 = Date.now(), s0 = lire();
      vrai('à l\'inscription, la session expire dans ~90 jours (' + Math.round((Number(s0.exp) - t0) / JOUR) + ' j)', Math.abs((Number(s0.exp) - t0) / JOUR - 90) < 0.1);
      v('quatre-vingts jours plus tard, la session vit encore — et l\'usage la renouvelle', [(svc.avancer(80 * JOUR), (await c.get('/api/moi')).code)], [200]);
      const s1 = lire();
      vrai('⛔ l\'échéance a RECULÉ de ~80 jours (glissante) : elle est de nouveau à ~90 jours DE L\'HORLOGE DU SERVICE (avancée de 80 jours) — ' + ((Number(s1.exp) - Date.now()) / JOUR).toFixed(1) + ' j d\'ici', Math.abs((Number(s1.exp) - Date.now()) / JOUR - 170) < 0.3);
      svc.avancer(80 * JOUR);
      v('⛔ cent soixante jours après l\'inscription : toujours connecté (une session fixe de 90 jours serait morte)', (await c.get('/api/moi')).code, 200);
      svc.avancer(91 * JOUR);
      v('quatre-vingt-onze jours SANS usage : la session est morte', (await c.get('/api/moi')).code, 401);
      db.close();
      svc.avancer(-(80 + 80 + 91) * JOUR);
    }
    {
      /* Les autres origines ne changent pas : une session de la porte bêta reste à 30 jours (cette durée n'est pas à nous de la relâcher). */
      const src = fs.readFileSync(path.join(T.SERVICE, 'app.js'), 'utf8');
      vrai('la durée de 30 jours des autres comptes est conservée (seul le compte par numéro passe à 90)', /p\.origine === 'telephone' \? SESSION_TEL_MS : 30 \* 86400000/.test(src));
    }

    console.log('\n── 914 · se déconnecter coupe aussi le jeton d\'appareil (sinon « se déconnecter » se déferait au prochain lancement) ──');
    {
      const n = TEL.numeroBE(), c = await TEL.inscrire(svc, n, 'Denis');
      const jobs = ovh.jobs.length;
      const sortie = await c.post('/api/compte/deconnexion', {});
      v('POST /api/compte/deconnexion → 200', sortie.code, 200);
      v('⛔ le jeton d\'appareil ne reconnecte plus', (await c.post('/api/tel/appareil', {})).code, 401);
      svc.avancer(61 * 1000);
      const r = await c.post('/api/tel/code', { numero: n });
      v('et se reconnecter DEMANDE un SMS (aucun raccourci après une déconnexion volontaire)', [r.code, r.j.connecte, ovh.jobs.length], [200, undefined, jobs + 1]);
    }

    console.log('\n── 914 · ⛔ AUCUNE TRACE du numéro ni du code : journal, /health, disque ──');
    {
      const sortie = svc.sortie.texte();
      const sante = (await T.client(base).get('/health')).txt;
      const jetons = [chiffres(NUM).slice(2), NUM2.slice(3), '470123', code1, code2];
      vrai('la population : le service a écrit du journal (' + sortie.length + ' octets) et /health répond (' + sante.length + ' octets)', sortie.length > 20 && sante.length > 50);
      v('⛔ ni le numéro ni un code dans ce que le service a écrit (sortie standard et d\'erreur)', jetons.filter(j => j.length >= 6 && sortie.includes(j)), []);
      v('⛔ ni dans /health', jetons.filter(j => j.length >= 6 && sante.includes(j)), []);
      const brut = TEL.octetsDe(svc.data);
      vrai('la population : la base fait ' + brut.length + ' octets (le contrôle ci-dessous regarde du vrai)', brut.length > 50000);
      v('⛔ aucun octet du numéro en clair sur le disque (le numéro est SCELLÉ : `tel:+…` dans `email_ch`, haché pour l\'unicité)', [brut.includes(Buffer.from(NUM)), brut.includes(Buffer.from(chiffres(NUM).slice(2))), brut.includes(Buffer.from('+' + chiffres(NUM)))], [false, false, false]);
      const db = T.lireBase(path.join(svc.data, 'msg.db'));
      const lignes = db.prepare('SELECT code_h FROM code_tel').all();
      vrai('la population : des codes sont en attente (' + lignes.length + ')', lignes.length > 0);
      v('⛔ un code est rangé HACHÉ : 64 hexadécimaux, jamais les 6 chiffres', lignes.every(l => /^[0-9a-f]{64}$/.test(l.code_h)), true);
      const envois = db.prepare('SELECT * FROM sms_envoi').all();
      vrai('la population : ' + envois.length + ' SMS dans le journal des envois', envois.length > 5);
      v('⛔ le journal des envois ne porte QUE la date, le pays, le coût et l\'état — jamais un numéro', [...new Set(envois.flatMap(e => Object.keys(e)))].sort(), ['cout', 'etat', 'id', 'pays', 'ts']);
      v('   le pays est un code à deux lettres', envois.every(e => /^[A-Z]{2}$/.test(e.pays)), true);
      const appareils = db.prepare('SELECT h FROM appareil_tel').all();
      vrai('la population : ' + appareils.length + ' appareils vérifiés', appareils.length >= 3);
      v('⛔ un jeton d\'appareil est rangé HACHÉ (SHA-256) : le cookie lui-même n\'est nulle part dans la base', [appareils.every(a => /^[0-9a-f]{64}$/.test(a.h)), brut.includes(Buffer.from('opd_'))], [true, false]);
      db.close();
    }
  } finally { await svc.arreter(); }

  console.log('\n── 914 · la porte de TEST des codes : refusée en production ──');
  {
    const racine = fs.mkdtempSync(path.join(require('os').tmpdir(), 'banc-tel-prod-'));
    let echec = null;
    try { await T.lancerService({ instance: 'prod', dossier: racine, env: { OPMSG_TEST_CODES: path.join(racine, 'codes.jsonl') }, attendreSante: true }); }
    catch (e) { echec = e.message; }
    vrai('⛔ le démarrage en PRODUCTION avec OPMSG_TEST_CODES est refusé (le service n\'a pas démarré)', echec !== null);
    vrai('   et la raison nommée est bien la porte de test, pas une autre panne', /OPMSG_TEST_CODES/.test(String(echec)));
    vrai('   et aucun fichier de codes n\'a été écrit', !fs.existsSync(path.join(racine, 'codes.jsonl')));
    fs.rmSync(racine, { recursive: true, force: true });
  }
  {
    /* En production sans identifiants OVH : plus de SMS — 503 « sms_indisponible », dit clairement ; l'appareil connu, lui, passe encore. */
    const prod = await T.lancerService({ instance: 'prod', config: {} });
    try {
      const c = T.client(prod.base, { xff: TEL.reseauNeuf() });
      const r = await c.post('/api/tel/code', { numero: TEL.numeroBE() });
      v('⛔ production SANS identifiants OVH → 503 « sms_indisponible » (jamais un « envoyé » qui ment)', [r.code, r.j.error], [503, 'sms_indisponible']);
      const h = (await c.get('/health')).j;
      v('   /health le DIT : mode « inactif »', h.sms.mode, 'inactif');
    } finally { await prod.arreter(); }
  }
  {
    /* En bêta sans identifiants : le mode « journal » — aucun SMS réel, et le code n'est JAMAIS écrit en clair dans le journal. */
    const bj = await TEL.lancerTel({ sansOvh: true, testCodes: false });
    try {
      const n = TEL.numeroBE();
      const r = await T.client(bj.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: n });
      v('bêta sans identifiants : mode « journal » — la demande réussit', [r.code, (await T.client(bj.base).get('/health')).j.sms.mode], [200, 'journal']);
      vrai('⛔ et le code n\'est écrit NULLE PART en clair : ni le numéro ni un nombre à 6 chiffres près du mot « code » dans le journal', !/(?:code|Code)[^\n]{0,40}\b\d{6}\b/.test(bj.sortie.texte()) && !bj.sortie.texte().includes(n.slice(3)));
      vrai('   (et la porte de test est fermée : aucun fichier de codes n\'existe)', !fs.existsSync(bj.fichierCodes));
    } finally { await bj.arreter(); }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });

/* Attend qu'un code DIFFÉRENT de `ancien` soit écrit pour ce numéro (le renvoi pose un code neuf) ; une chance sur un million qu'il soit
   identique : on rend alors l'ancien, et le contrôle se déclare « même » plutôt que de mentir. */
async function TEL_attendreAutre(svc, n, ancien) {
  const c = await T.attendre(async () => { const x = await svc.code(n); return x && x !== ancien ? x : null; }, 1500, 20);
  return c || ancien;
}
