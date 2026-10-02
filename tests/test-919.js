/* ⛔ CE QUE CE FICHIER GARDE — LES COMPTES PAR NUMÉRO FACE À UN TIERS : CODE LIÉ À L'APPAREIL, NOUVEL APPAREIL, APPAREILS BORNÉS, ÉLAGAGE
   (relecture adverse de `gardien` et de `testeur`, 2 octobre 2026 — chaque ligne rejoue un constat sur le VRAI service, un FAUX OVH).

     · ⛔ UN INCONNU NE VERROUILLE PAS LE NUMÉRO D'UN AUTRE. Il suffisait de connaître le numéro : cinq faux codes brûlaient le code de la
       victime, dix par heure bloquaient sa vérification pendant une heure — avec le BON code elle recevait 401 puis 429. Le code est
       désormais LIÉ À L'APPAREIL qui l'a demandé (cookie d'appareil, haché), et les échecs se comptent par (numéro, appareil) ;
     · un code collé avec ses espaces (« 123 456 ») est le même code ; un prénom invalide ne CONSOMME pas le code (un SMS perdu, et il
       fallait redemander avec tous les plafonds) ;
     · ⛔ UN NUMÉRO RÉATTRIBUÉ (ou une SIM échangée) entre dans le compte de l'ancien titulaire : les autres appareils sont PRÉVENUS (une
       notification « Nouvel appareil connecté »), et « Déconnecter les autres appareils » coupe leurs sessions ET leurs jetons d'appareil ;
     · un appareil ne se reconnecte pas SANS SMS plus d'un an après sa dernière preuve (plafond absolu), et l'USAGE de la session prolonge
       son jeton (un utilisateur actif 160 jours puis absent 91 jours ne retape plus un SMS) ;
     · un seul E.164 par téléphone : « +218 912345678 » et « +218 0912345678 » (pays sans plage mobile connue) sont le MÊME numéro ;
     · ⛔ L'ÉLAGAGE TOURNE : les empreintes de numéros de personnes non inscrites, les plafonds et les recherches ne restent pas indéfiniment.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque verdict est précédé de la population qu'il aurait pu manquer. */
const fs = require('fs'), path = require('path');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const { HEURE, JOUR } = TEL;
const { DatabaseSync } = require('node:sqlite');

const LARGE = { budgetJour: 5000, budgetHeure: 5000, budgetPaysJour: 5000, budgetPaysHeure: 5000, emballement: { plancher: 100000 } };
const aleaDigits = (n) => String(require('crypto').randomInt(0, 10 ** n)).padStart(n, '0');
const cookieAppareil = (c) => { const m = /(?:^|; )opma=([^;]+)/.exec(c.enteteCookie()); return m ? m[1] : null; };

(async () => {
  const svc = await TEL.lancerTel({ sms: LARGE, config: { balayageMs: 100 } });
  const ovh = svc.ovh, base = svc.base;
  try {
    /* ═══ 1. UN INCONNU NE BRÛLE PAS LE CODE D'UN AUTRE ═════════════════════════════════════════════════════════════════ */
    console.log('\n── 919 · le code est LIÉ À L\'APPAREIL qui l\'a demandé : un inconnu ne le brûle pas, ne le devine pas, ne verrouille pas le numéro ──');
    {
      const N = TEL.numeroBE();
      const victime = T.client(base, { xff: TEL.reseauNeuf() }), inconnu = T.client(base, { xff: TEL.reseauNeuf() });
      v('la victime demande son code', (await victime.post('/api/tel/code', { numero: N })).code, 200);
      const code = await svc.code(N);
      const faux = code === '000000' ? '000001' : '000000';
      const essais = [];
      for (let i = 0; i < 12; i++) essais.push((await inconnu.post('/api/tel/verifier', { numero: N, code: faux, prenom: 'X' })).code);
      vrai('la population : douze faux essais d\'un autre appareil — ils sont refusés (401, puis 429 sur SON propre compteur : ' + [...new Set(essais)].join('/') + ')', essais.length === 12 && essais.every(c => c === 401 || c === 429) && essais.slice(0, 10).every(c => c === 401));
      const bon = await victime.post('/api/tel/verifier', { numero: N, code, prenom: 'Victime', nom: 'Banc' });
      v('⛔ la victime, avec le BON code, entre : le code n\'a pas été brûlé (avant : 401, puis 429 « numero_plafond_jour » pendant une heure)', [bon.code, bon.j.nouveau], [200, true]);

      /* L'inconnu ne peut pas non plus se servir du BON code s'il l'obtient (celui d'un SMS lu par-dessus l'épaule, d'un autre navigateur) : il n'a pas l'appareil. */
      const N2 = TEL.numeroBE();
      const a = T.client(base, { xff: TEL.reseauNeuf() }), b = T.client(base, { xff: TEL.reseauNeuf() });
      await a.post('/api/tel/code', { numero: N2 });
      const code2 = await svc.code(N2);
      const autre = await b.post('/api/tel/verifier', { numero: N2, code: code2, prenom: 'B' });
      v('⛔ le bon code présenté depuis un AUTRE navigateur est refusé (401 « code_invalide »), et la réponse est celle de tout échec', [autre.code, autre.j], [401, { error: 'code_invalide' }]);
      const ok = await a.post('/api/tel/verifier', { numero: N2, code: code2, prenom: 'A' });
      v('   et le navigateur qui l\'a demandé l\'utilise (le refus de l\'autre n\'a rien brûlé)', ok.code, 200);

      /* Un code collé avec ses espaces. */
      const N3 = TEL.numeroBE(), c3 = T.client(base, { xff: TEL.reseauNeuf() });
      await c3.post('/api/tel/code', { numero: N3 });
      const code3 = await svc.code(N3);
      const espace = await c3.post('/api/tel/verifier', { numero: N3, code: code3.slice(0, 3) + ' ' + code3.slice(3) + ' ', prenom: 'Espace' });
      v('un code collé avec ses espaces (« 123 456 ») est le même code', [espace.code, espace.j.nouveau], [200, true]);
    }

    /* ═══ 2. UN PRÉNOM INVALIDE NE CONSOMME PAS LE CODE ════════════════════════════════════════════════════════════════ */
    console.log('\n── 919 · un prénom invalide ne CONSOMME pas le code ──');
    {
      const N = TEL.numeroBE(), c = T.client(base, { xff: TEL.reseauNeuf() });
      await c.post('/api/tel/code', { numero: N });
      const code = await svc.code(N);
      const trop = await c.post('/api/tel/verifier', { numero: N, code, prenom: 'x'.repeat(61) });
      const objet = await c.post('/api/tel/verifier', { numero: N, code, prenom: { a: 1 } });
      v('un prénom de 61 caractères, puis un prénom OBJET : 400 « champ_invalide »', [trop.code, trop.j.error, objet.code, objet.j.error], [400, 'champ_invalide', 400, 'champ_invalide']);
      const bon = await c.post('/api/tel/verifier', { numero: N, code, prenom: 'Valide' });
      v('⛔ le MÊME code, avec un prénom valide : 200 (avant : 401 « code_invalide », le code était déjà consommé — un SMS perdu)', [bon.code, bon.j.nouveau], [200, true]);
    }

    /* ═══ 3. UN NOUVEL APPAREIL PRÉVIENT LES AUTRES ; « DÉCONNECTER LES AUTRES » ═══════════════════════════════════════ */
    console.log('\n── 919 · un nouvel appareil prévient les autres ; « déconnecter les autres appareils » coupe sessions ET jetons ──');
    {
      const N = TEL.numeroBE();
      const A = await TEL.inscrire(svc, N, 'Ancienne', {});
      v('la première inscription ne prévient personne (rien d\'autre à prévenir)', (await A.get('/api/notifications')).j.notifications.filter(n => n.type === 'nouvel_appareil').length, 0);
      /* Un autre appareil entre avec le même numéro (SMS) : le nouveau titulaire d'un numéro réattribué, ou le deuxième téléphone du même. */
      const B = T.client(base, { xff: TEL.reseauNeuf() });
      svc.avancer(61 * 1000);   // le renvoi d'un code attend 60 s
      await B.post('/api/tel/code', { numero: N });
      const codeB = await svc.code(N);
      const entre = await B.post('/api/tel/verifier', { numero: N, code: codeB, appareil: 'Autre téléphone' });
      v('l\'autre appareil entre dans LE MÊME compte (nouveau: false)', [entre.code, entre.j.nouveau, entre.j.moi.id], [200, false, A.moi.id]);
      const notifs = (await A.get('/api/notifications')).j.notifications.filter(n => n.type === 'nouvel_appareil');
      v('⛔ l\'appareil d\'ORIGINE reçoit « Nouvel appareil connecté » (avant : aucun avertissement, l\'ancien titulaire ne le saurait jamais)', [notifs.length, notifs[0] && notifs[0].titre], [1, 'Nouvel appareil connecté']);
      /* Le même appareil qui se re-prouve ne prévient pas une seconde fois. */
      svc.avancer(61 * 1000);
      await B.post('/api/tel/code', { numero: N });
      v('(le même appareil, redemandant un code, reste reconnu : connexion sans SMS, aucune notification de plus)', [(await A.get('/api/notifications')).j.notifications.filter(n => n.type === 'nouvel_appareil').length], [1]);

      v('avant le geste, les DEUX appareils sont connectés', [(await A.get('/api/moi')).code, (await B.get('/api/moi')).code], [200, 200]);
      const deco = await A.post('/api/moi/appareils/deconnecter', {});
      v('⛔ « Déconnecter les autres appareils » : 200, les deux sessions de l\'autre appareil (celle de sa connexion par SMS et celle de sa reconnexion sans SMS) et son jeton d\'appareil coupés', [deco.code, deco.j.ok, deco.j.sessions, deco.j.appareils], [200, true, 2, 1]);
      v('   l\'appareil d\'où on le demande reste connecté', (await A.get('/api/moi')).code, 200);
      v('   l\'autre est DÉCONNECTÉ (sa session ne répond plus)', (await B.get('/api/moi')).code, 401);
      v('⛔ et il ne peut PAS se reconnecter sans SMS : son jeton d\'appareil est coupé (401 « appareil_inconnu »)', [(await B.post('/api/tel/appareil', {})).code, (await B.post('/api/tel/appareil', {})).j.error], [401, 'appareil_inconnu']);
      const jobs = ovh.jobs.length;
      const rep = await B.post('/api/tel/code', { numero: N });
      v('   il lui faut un nouveau SMS : « /api/tel/code » en envoie un (le cookie d\'appareil ne le reconnaît plus)', [rep.code, rep.j.connecte, ovh.jobs.length], [200, undefined, jobs + 1]);
      v('⛔ sans session, la route répond 401 (garde S)', (await T.client(base).post('/api/moi/appareils/deconnecter', {})).code, 401);
    }

    /* ═══ 4. L'USAGE PROLONGE LE JETON D'APPAREIL ; UN PLAFOND ABSOLU LE BORNE ═════════════════════════════════════════ */
    console.log('\n── 919 · l\'usage prolonge le jeton d\'appareil ; un an après sa dernière preuve par SMS, il ne reconnecte plus ──');
    {
      const N = TEL.numeroBE();
      const A = await TEL.inscrire(svc, N, 'Active', {});
      for (let i = 0; i < 3; i++) { svc.avancer(55 * JOUR); await A.get('/api/moi'); }   // jour 165 : la session est vivante, utilisée
      A.poserCookie(null);                                                               // elle disparaît (cookie effacé, onglet fermé)
      svc.avancer(91 * JOUR);                                                            // jour 256 : plus de 180 jours après le lien du jeton
      const jobs = ovh.jobs.length;
      const rec = await A.post('/api/tel/appareil', {});
      v('⛔ active pendant 165 jours puis absente 91 jours (256 jours après le lien) : reconnectée SANS SMS — l\'usage a prolongé le jeton (avant : 401, un SMS à retaper)', [rec.code, rec.j.ok, ovh.jobs.length], [200, true, jobs]);
      /* Le plafond absolu : un an après la dernière preuve par SMS, même un appareil actif repasse par un SMS. */
      for (let i = 0; i < 4; i++) { svc.avancer(30 * JOUR); await A.get('/api/moi'); }  // jour 376 : toujours actif
      A.poserCookie(null);
      const apres = await A.post('/api/tel/appareil', {});
      v('⛔ plafond ABSOLU : 376 jours après le SMS, le jeton, même touché tous les mois, ne reconnecte plus (401 « appareil_inconnu ») — un numéro réattribué n\'est pas reconnu pour toujours', [apres.code, apres.j.error], [401, 'appareil_inconnu']);
      const demande = await A.post('/api/tel/code', { numero: N });
      v('   et « /api/tel/code » demande alors un SMS, il ne reconnecte pas', [demande.code, demande.j.connecte, ovh.jobs.length], [200, undefined, jobs + 1]);
    }

    /* ═══ 5. UN SEUL E.164 PAR TÉLÉPHONE ═════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 919 · un seul E.164 par téléphone : le zéro de ligne se retire, même sans plage mobile connue ──');
    {
      const corps = aleaDigits(8);
      const ip1 = TEL.reseauNeuf(), ip2 = TEL.reseauNeuf();
      const a = await T.client(base, { xff: ip1 }).post('/api/tel/code', { numero: '+218 9' + corps });
      const jobs = ovh.jobs.length;
      const b = await T.client(base, { xff: ip2 }).post('/api/tel/code', { numero: '+218 09' + corps });
      v('⛔ « +218 9… » puis « +218 09… » (la Libye, sans plage mobile connue) : le SECOND est refusé 429 « renvoi_trop_tot » — c\'est le même téléphone (avant : deux SMS dans la minute, deux comptes)', [a.code, b.code, b.j.error, jobs], [200, 429, 'renvoi_trop_tot', jobs]);
      vrai('   (et un seul SMS est parti, vers le numéro SANS zéro)', ovh.jobs.filter(j => j.numero === '+2189' + corps).length === 1 && ovh.jobs.filter(j => j.numero === '+21809' + corps).length === 0);
    }

    /* ═══ 5 bis. LA COURSE : UN SEUL SMS, UN SEUL SUCCÈS ═════════════════════════════════════════════════════════════════ */
    console.log('\n── 919 · la course : quarante demandes simultanées pour un numéro envoient UN SMS ; dix preuves simultanées du même code : UN succès ──');
    {
      const N = TEL.numeroBE(), c = T.client(base, { xff: TEL.reseauNeuf() });
      await c.post('/api/tel/verifier', { numero: N, code: '000000' });   // un navigateur a UN cookie d'appareil : on le pose avant la course (quarante réponses en poseraient quarante)
      const jobs = ovh.jobs.length;
      const reps = await Promise.all(Array.from({ length: 40 }, () => c.post('/api/tel/code', { numero: N })));
      const comptes = {}; for (const r of reps) comptes[r.code] = (comptes[r.code] || 0) + 1;
      v('⛔ quarante demandes simultanées pour le même numéro : UN SMS (les autres → 429), plafond réservé dans la transaction', [comptes[200], comptes[429], ovh.jobs.length - jobs], [1, 39, 1]);
      const code = await svc.code(N);
      const ver = await Promise.all(Array.from({ length: 10 }, () => c.post('/api/tel/verifier', { numero: N, code, prenom: 'Course' })));
      const ok = ver.filter(r => r.code === 200).length;
      v('⛔ dix preuves simultanées du même code (le même appareil) : EXACTEMENT un succès (usage unique)', [ok, ver.filter(r => r.code === 401).length], [1, 9]);
    }

    /* ═══ 6. L'ÉLAGAGE TOURNE ════════════════════════════════════════════════════════════════════════════════════════════ */
    console.log('\n── 919 · l\'ÉLAGAGE tourne : les empreintes d\'un numéro non inscrit et les plafonds ne restent pas indéfiniment ──');
    {
      const base_db = path.join(svc.racineTel, 'data', 'msg.db');
      const compte = (sql) => { const d = new DatabaseSync(base_db, { readOnly: true }); try { return Number(d.prepare(sql).get().n); } finally { d.close(); } };
      const N = TEL.numeroBE();
      await T.client(base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: N });   // un code demandé, jamais prouvé : personne n'est inscrit à ce numéro
      const avant = [compte('SELECT COUNT(*) AS n FROM code_tel'), compte('SELECT COUNT(*) AS n FROM sms_tentative')];
      vrai('la population : au moins un code en attente et des lignes de plafond (' + avant.join(' et ') + ')', avant[0] >= 1 && avant[1] >= 1);
      svc.avancer(3 * JOUR);
      const parti = await T.attendre(() => compte('SELECT COUNT(*) AS n FROM code_tel') === 0 && compte('SELECT COUNT(*) AS n FROM sms_tentative') === 0, 15000, 100);
      v('⛔ le balayeur élague : trois jours plus tard, plus aucun code expiré ni ligne de plafond (avant : `smsElaguer` n\'était appelée nulle part, ces empreintes restaient pour toujours)', !!parti, true);
    }
  } finally { await svc.arreter(); }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
