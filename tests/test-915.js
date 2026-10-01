/* ⛔ CE QUE CE FICHIER GARDE — L'ARGENT : AUCUNE POSSIBILITÉ DE NOUS FAIRE PAYER DES SMS EN MASSE (famille 3 de SERVEUR.md § 3.11).

   Justin, 1er octobre 2026 : « le but c'est qu'on gagne de l'argent » — le Perso est GRATUIT, donc chaque SMS est un coût — et
   « une connexion pour TOUS les pays ». La fraude au « SMS pumping » (des robots qui déclenchent des milliers de SMS vers des numéros
   surtaxés ou étrangers) ne se traite donc pas par une liste de pays mais par le COMBIEN. Le VRAI service, un FAUX OVH, chaque défense :

     · seuls les MOBILES ordinaires reçoivent un SMS : France 06/07 seulement, ni fixe, ni 08/09, ni satellite, ni premium — refusés
       AVANT l'envoi (400, aucun SMS, aucun coût) ; un belge, un réunionnais, un américain, un indien passent ;
     · les PLAFONDS, chacun avec un `Retry-After` vrai : par numéro (1 par 60 s, 5 par jour), par réseau (/24 en IPv4, /64 en IPv6 :
       10 par heure), par appareil (5 par jour) — et un refus RENDU ne consomme pas le plafond d'à côté ;
     · le BUDGET EN EUROS, global (jour, heure) et PAR PAYS, durable (un redémarrage ne le remet pas à zéro), glissant (minuit n'est pas
       un moment où l'on peut recommencer), qui compte le coût RÉEL d'OVH et garde le coût d'un envoi INCERTAIN ;
     · l'EMBALLEMENT d'un pays : au-delà de son plancher (ou de ×5 sa moyenne), CE pays passe en BOUCLIER (preuve de travail + délai)
       pendant que les autres continuent ; la preuve est liée au numéro, à usage unique, et le délai est tenu.

   ⛔ Un refus du budget ou d'un plafond n'ENVOIE RIEN : chaque contrôle compte le nombre de SMS que le faux OVH a vus. */
const T = require('./outils-msg');
T.sauterSiSansDependances();
const TEL = require('./outils-tel');
const { v, vrai, fin } = T.compteur();
const { MIN, HEURE, JOUR } = TEL;

/* Les budgets en euros sont joués plus bas : les parcours de plafonds, eux, les relèvent pour ne mesurer QUE le plafond qu'ils visent (quarante SMS belges dépassent 1,5 € par heure). */
const LARGE = { budgetJour: 5000, budgetHeure: 5000, budgetPaysJour: 5000, budgetPaysHeure: 5000 };
const retryDe = (r) => { const h = r.h.get('retry-after'); return /^\d+$/.test(h || '') ? parseInt(h, 10) : null; };
const demander = (svc, numero, ip, client) => (client || T.client(svc.base, { xff: ip || TEL.reseauNeuf() })).post('/api/tel/code', { numero });
const aleaDigits = (n) => String(require('crypto').randomInt(0, 10 ** n)).padStart(n, '0');
const sante = async (svc) => (await T.client(svc.base).get('/health')).j.sms;

(async () => {
  /* ═══ 1. QUI REÇOIT UN SMS ═══════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 915 · seuls les MOBILES reçoivent un SMS — les autres sont refusés AVANT l\'envoi ──');
  {
    const svc = await TEL.lancerTel({ sms: LARGE }); const ovh = svc.ovh;
    try {
      const REFUSES = [['France 01', '+33112345678'], ['France 04', '+33412345678'], ['⛔ France 08 (surtaxé)', '+33899123456'], ['⛔ France 09', '+33912345678'], ['France 0800', '+33800123456'],
        ['⛔ États-Unis 900', '+19005551234'], ['⛔ satellite +881', '+881123456789'], ['⛔ réseaux internationaux +882', '+882123456789'], ['⛔ gratuit mondial +800', '+80012345678'], ['Royaume-Uni 09', '+449012345678'], ['Allemagne fixe', '+493012345678']];
      let tous = 0;
      for (const [nom, n] of REFUSES) { const r = await demander(svc, n); if (r.code === 400 && r.j.error === 'numero_non_mobile') tous++; else console.log('     ⚠ ' + nom + ' : ' + r.code + ' ' + JSON.stringify(r.j)); }
      vrai('la population : ' + REFUSES.length + ' numéros qui ne sont pas des mobiles', REFUSES.length >= 10);
      v('⛔ chacun est refusé 400 « numero_non_mobile »', tous, REFUSES.length);
      v('⛔ et AUCUN SMS n\'est parti : ni coût, ni ligne au journal des envois', [ovh.jobs.length, (await sante(svc)).envoyes24h], [0, 0]);
      v('   /health compte ces refus par motif (un nombre, jamais un numéro)', (await sante(svc)).refus.numero_non_mobile, REFUSES.length);

      const ACCEPTES = [['belge', '+3247' + aleaDigits(7)], ['réunionnais', '+262692' + aleaDigits(6)], ['américain', '+1212555' + aleaDigits(4)], ['indien', '+9198' + aleaDigits(8)], ['français 06', '+336' + aleaDigits(8)], ['français 07', '+337' + aleaDigits(8)],
        ['japonais', '+8190' + aleaDigits(8)], ['brésilien', '+55119' + aleaDigits(8)], ['nigérian', '+234801' + aleaDigits(7)], ['australien', '+614' + aleaDigits(8)]];
      const bons = [];
      for (const [nom, n] of ACCEPTES) { const r = await demander(svc, n); bons.push([nom, r.code]); }
      v('⛔ « une connexion pour tous les pays » : un belge, un réunionnais, un américain, un indien, un japonais, un brésilien, un nigérian, un australien, un français 06 et 07 reçoivent leur code', bons.map(b => b[1]), Array(ACCEPTES.length).fill(200));
      v('   et le faux OVH a vu EXACTEMENT ces numéros, ni plus ni moins', ovh.jobs.map(j => j.numero).sort(), ACCEPTES.map(a => a[1].replace(/\s/g, '')).sort());
      const h = await sante(svc);
      vrai('   le coût du jour est compté (' + h.coutJourEur + ' € pour ' + h.envoyes24h + ' SMS)', h.envoyes24h === ACCEPTES.length && h.coutJourEur > 0 && h.coutJourEur < 3);
    } finally { await svc.arreter(); }
  }

  /* ═══ 2. LES PLAFONDS ════════════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 915 · les plafonds : par numéro, par réseau, par appareil — chacun avec un Retry-After VRAI ──');
  {
    const svc = await TEL.lancerTel({ sms: LARGE }); const ovh = svc.ovh;
    try {
      /* — par numéro, 60 secondes — */
      const n = TEL.numeroBE();
      const a = await demander(svc, n), b = await demander(svc, n);
      v('un premier code part ; le deuxième, tout de suite, est refusé 429 « renvoi_trop_tot »', [a.code, b.code, b.j.error], [200, 429, 'renvoi_trop_tot']);
      vrai('⛔ Retry-After est un entier de 1 à 60 (le délai VRAI), repris dans le corps', retryDe(b) >= 1 && retryDe(b) <= 60 && b.j.retry === retryDe(b));
      v('⛔ le refus n\'a envoyé AUCUN SMS', ovh.jobs.length, 1);
      svc.avancer(61 * 1000);
      v('soixante et une secondes plus tard : le renvoi passe', (await demander(svc, n)).code, 200);

      /* — par numéro, 5 par jour : chaque envoi depuis un appareil et un réseau NEUFS pour ne pas user les autres plafonds — */
      const m = TEL.numeroBE(), codes = [];
      for (let i = 0; i < 5; i++) { codes.push((await demander(svc, m)).code); svc.avancer(61 * 1000); }
      const sixieme = await demander(svc, m);
      v('⛔ cinq codes par jour pour un numéro : le sixième est refusé 429 « numero_plafond_jour »', [codes, sixieme.code, sixieme.j.error], [Array(5).fill(200), 429, 'numero_plafond_jour']);
      vrai('   Retry-After : de l\'ordre du jour (entre une heure et 24 h)', retryDe(sixieme) > 3600 && retryDe(sixieme) <= 86400);
      svc.avancer(JOUR);
      v('une journée plus tard, le numéro peut de nouveau demander', (await demander(svc, m)).code, 200);

      /* — par réseau : 10 par heure dans un /24 — */
      const base24 = TEL.reseauNeuf(), codesR = [];
      for (let i = 0; i < 10; i++) codesR.push((await demander(svc, TEL.numeroBE(), TEL.memeReseau(base24, i))).code);
      const onze = await demander(svc, TEL.numeroBE(), TEL.memeReseau(base24, 11));
      v('⛔ dix SMS par heure et par réseau /24 : le onzième (même /24, autre adresse, autre numéro, autre appareil) est refusé 429 « reseau_plafond »', [codesR, onze.code, onze.j.error], [Array(10).fill(200), 429, 'reseau_plafond']);
      vrai('   Retry-After : au plus une heure', retryDe(onze) >= 1 && retryDe(onze) <= 3600);
      const jobsAvant = ovh.jobs.length;
      await demander(svc, TEL.numeroBE(), TEL.memeReseau(base24, 12));
      v('⛔ et le refus n\'a rien envoyé', ovh.jobs.length, jobsAvant);
      v('un AUTRE réseau n\'est pas touché', (await demander(svc, TEL.numeroBE())).code, 200);
      svc.avancer(HEURE + 1000);
      v('une heure plus tard, le réseau repart', (await demander(svc, TEL.numeroBE(), TEL.memeReseau(base24, 13))).code, 200);

      /* — par réseau IPv6 : un /64 est UN seau, quelle que soit l'adresse complète — */
      const codes6 = [];
      for (let i = 0; i < 10; i++) codes6.push((await demander(svc, TEL.numeroBE(), '2001:db8:aaaa:bbbb:' + (i + 1) + ':' + (i + 7) + '::' + (i + 1))).code);
      const onze6 = await demander(svc, TEL.numeroBE(), '2001:db8:aaaa:bbbb:ffff::1');
      v('⛔ IPv6 : dix adresses d\'un MÊME /64 usent UN plafond ; la onzième est refusée « reseau_plafond »', [codes6, onze6.code, onze6.j.error], [Array(10).fill(200), 429, 'reseau_plafond']);
      v('   un autre /64 passe', (await demander(svc, TEL.numeroBE(), '2001:db8:aaaa:cccc::1')).code, 200);
    } finally { await svc.arreter(); }
  }
  {
    const svc = await TEL.lancerTel({ sms: LARGE }); const ovh = svc.ovh;
    try {
      /* — par appareil : le même cookie d'appareil, des numéros et des réseaux différents — */
      const c = T.client(svc.base), codes = [];
      for (let i = 0; i < 5; i++) codes.push((await c.post('/api/tel/code', { numero: TEL.numeroBE() }, { entetes: { 'X-Forwarded-For': TEL.reseauNeuf() } })).code);
      const sixieme = await c.post('/api/tel/code', { numero: TEL.numeroBE() }, { entetes: { 'X-Forwarded-For': TEL.reseauNeuf() } });
      v('⛔ cinq codes par jour pour un APPAREIL (le même cookie) même en changeant de numéro et de réseau : le sixième → 429 « appareil_plafond »', [codes, sixieme.code, sixieme.j.error], [Array(5).fill(200), 429, 'appareil_plafond']);
      v('   aucun SMS pour le refus', ovh.jobs.length, 5);
      v('   un appareil NEUF (sans cookie) passe', (await demander(svc, TEL.numeroBE())).code, 200);
    } finally { await svc.arreter(); }
  }
  {
    const svc = await TEL.lancerTel({ sms: LARGE }); const ovh = svc.ovh;
    try {
      /* — un refus RENDU ne consomme pas le plafond d'à côté : 1 envoi + 9 refus « renvoi_trop_tot » + 9 envois = 10, et pas 19 — */
      const reseau = TEL.reseauNeuf(), A = TEL.numeroBE();
      v('un premier envoi depuis ce réseau', (await demander(svc, A, TEL.memeReseau(reseau, 0))).code, 200);
      const refus = [];
      for (let i = 1; i <= 9; i++) refus.push((await demander(svc, A, TEL.memeReseau(reseau, i))).code);
      v('neuf demandes pour le MÊME numéro dans la minute : neuf refus « renvoi_trop_tot »', refus, Array(9).fill(429));
      const suite = [];
      for (let i = 10; i < 19; i++) suite.push((await demander(svc, TEL.numeroBE(), TEL.memeReseau(reseau, i))).code);
      v('⛔ neuf autres numéros passent depuis le même réseau : les refus ont RENDU le plafond du réseau (sinon il serait épuisé à vide)', suite, Array(9).fill(200));
      v('et le onzième SMS du réseau est refusé (le plafond est entier : dix envois réels)', (await demander(svc, TEL.numeroBE(), TEL.memeReseau(reseau, 30))).code, 429);
      v('   dix SMS, pas dix-neuf', ovh.jobs.length, 10);
    } finally { await svc.arreter(); }
  }

  /* ═══ 3. LE BUDGET EN EUROS ══════════════════════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 915 · le BUDGET du jour : au-delà, plus aucun SMS pour personne (503, dit à l\'écran, crié par /health) ──');
  {
    const dossier = require('fs').mkdtempSync(require('path').join(require('os').tmpdir(), 'banc-tel-budget-'));
    const conf = { sms: { budgetJour: 0.35, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 }, dossier, cle: require('crypto').randomBytes(32).toString('hex') };
    const ovh = await TEL.fauxOvhService();
    const conf2 = Object.assign({}, conf, { ovh });
    let svc = await TEL.lancerTel(conf2);
    try {
      const reps = [];
      for (let i = 0; i < 3; i++) reps.push((await demander(svc, TEL.numeroBE())).code);
      v('un SMS belge coûte 0,10125 € estimé : trois passent sous 0,35 €', reps, [200, 200, 200]);
      const coupe = await demander(svc, TEL.numeroBE());
      v('⛔ le quatrième dépasserait le budget du jour : 503 « sms_indisponible », portée « global »', [coupe.code, coupe.j.error, coupe.j.portee], [503, 'sms_indisponible', 'global']);
      vrai('   Retry-After est posé (l\'écran peut dire « réessayez plus tard »)', retryDe(coupe) > 0);
      v('⛔ AUCUN SMS pour ce refus, et il n\'a rien réservé', [ovh.jobs.length, (await sante(svc)).envoyes24h], [3, 3]);
      const fr = await demander(svc, '+336' + aleaDigits(8));
      v('⛔ le budget est GLOBAL : même un pays moins cher (la France, 0,075 €) est coupé', [fr.code, fr.j.portee], [503, 'global']);
      const h = await sante(svc);
      vrai('/health le CRIE : le budget du jour est à ' + h.budgetJourPct + ' % et le refus est compté par motif', h.budgetJourPct >= 85 && h.refus.budget_jour >= 2);
      v('   (le coût du jour est un nombre en euros)', [typeof h.coutJourEur, h.coutJourEur > 0.29 && h.coutJourEur < 0.32], ['number', true]);
      /* La fenêtre est GLISSANTE : minuit ne remet rien à zéro. */
      svc.avancer(23 * HEURE);
      v('⛔ vingt-trois heures plus tard : toujours coupé (le budget glisse sur 24 h, il ne repart pas à minuit)', (await demander(svc, TEL.numeroBE())).code, 503);
      /* Un redémarrage ne remet pas le budget à zéro : la base le sait. */
      await svc.arreter(false);
      svc = await TEL.lancerTel(conf2);
      v('⛔ le service REDÉMARRÉ sur la même base refuse toujours : le budget est DURABLE (un redémarrage ne rend pas 20 €)', (await demander(svc, TEL.numeroBE())).code, 503);
      svc.avancer(24 * HEURE + 60000);
      v('plus de 24 heures après les trois envois : le budget est de nouveau libre', (await demander(svc, TEL.numeroBE())).code, 200);
    } finally { await svc.arreter(false); await ovh.fermer(); require('fs').rmSync(dossier, { recursive: true, force: true }); }
  }
  console.log('\n── 915 · le budget de l\'HEURE : un robot qui pompe consomme une heure en quelques minutes ──');
  {
    const svc = await TEL.lancerTel({ sms: { budgetJour: 50, budgetHeure: 0.25, budgetPaysJour: 50, budgetPaysHeure: 50 } });
    try {
      const reps = [];
      for (let i = 0; i < 2; i++) reps.push((await demander(svc, TEL.numeroBE())).code);
      const coupe = await demander(svc, TEL.numeroBE());
      v('deux SMS passent sous 0,25 € l\'heure ; le troisième : 503', [reps, coupe.code, coupe.j.error], [[200, 200], 503, 'sms_indisponible']);
      vrai('   motif « budget_heure » compté', (await sante(svc)).refus.budget_heure >= 1);
      svc.avancer(HEURE + 60000);
      v('une heure et une minute plus tard : repart (le budget du jour, lui, est large)', (await demander(svc, TEL.numeroBE())).code, 200);
    } finally { await svc.arreter(); }
  }
  console.log('\n── 915 · le budget PAR PAYS : un pays qui s\'emballe est coupé SEUL, les autres continuent ──');
  {
    const svc = await TEL.lancerTel({ sms: { budgetJour: 50, budgetHeure: 50, budgetPaysJour: 0.25, budgetPaysHeure: 50, budgetPays: { US: { jour: 1 } } } }); const ovh = svc.ovh;
    try {
      const be = [];
      for (let i = 0; i < 2; i++) be.push((await demander(svc, TEL.numeroBE())).code);
      const coupe = await demander(svc, TEL.numeroBE());
      v('⛔ la Belgique : deux SMS passent sous 0,25 € par jour ; le troisième → 503 « sms_indisponible », portée « pays »', [be, coupe.code, coupe.j.error, coupe.j.portee], [[200, 200], 503, 'sms_indisponible', 'pays']);
      const fr = await demander(svc, '+336' + aleaDigits(8)), inde = await demander(svc, '+9198' + aleaDigits(8));
      v('⛔ pendant ce temps, la France et l\'Inde continuent (le budget d\'un pays n\'éteint pas les autres)', [fr.code, inde.code], [200, 200]);
      const us = [];
      for (let i = 0; i < 4; i++) us.push((await demander(svc, '+1212555' + aleaDigits(4))).code);
      v('une surcharge de la configuration par pays (« US » : 1 €/jour) s\'applique : quatre SMS américains à 0,026 € passent', us, Array(4).fill(200));
      vrai('   /health compte « budget_pays_jour »', (await sante(svc)).refus.budget_pays_jour >= 1);
      v('   le total envoyé par le faux OVH : 2 BE + 1 FR + 1 IN + 4 US', ovh.jobs.length, 8);
    } finally { await svc.arreter(); }
  }
  console.log('\n── 915 · le coût RÉEL d\'OVH remplace l\'estimation ; un envoi INCERTAIN garde son coût ──');
  {
    const svc = await TEL.lancerTel({ sms: { budgetJour: 0.35, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 } }); const ovh = svc.ovh;
    try {
      ovh.credits = 5;   // OVH retire 5 crédits (0,30 €) : bien plus que les 0,10 € estimés
      v('un SMS dont OVH retire 5 crédits passe', (await demander(svc, TEL.numeroBE())).code, 200);
      const h = await sante(svc);
      vrai('⛔ le budget compte le coût RÉEL (0,30 €), pas l\'estimation (0,10 €) : ' + h.coutJourEur + ' €', h.coutJourEur >= 0.29 && h.coutJourEur <= 0.31);
      v('le suivant dépasserait 0,35 € : refusé', (await demander(svc, TEL.numeroBE())).code, 503);
    } finally { await svc.arreter(); }
  }
  {
    const svc = await TEL.lancerTel({ sms: LARGE }); const ovh = svc.ovh;
    try {
      const n = TEL.numeroBE();
      ovh.mode = '500';
      const r = await demander(svc, n);
      v('OVH répond 500 : 503 « sms_indisponible » (portée « service »), sans dire que le SMS est parti', [r.code, r.j.error, r.j.portee], [503, 'sms_indisponible', 'service']);
      const h = await sante(svc);
      vrai('⛔ un envoi INCERTAIN garde son coût dans le budget (on ne sait pas s\'il est parti : on suppose le pire) — ' + h.coutJourEur + ' €', h.coutJourEur > 0.09 && h.envoyes24h === 1);
      ovh.mode = 'normal';
      v('⛔ et il garde le plafond du numéro (un doute ne s\'efface pas) : redemander tout de suite → 429', (await demander(svc, n)).code, 429);
      const n2 = TEL.numeroBE();
      ovh.mode = 'invalide';
      const r2 = await demander(svc, n2);
      v('OVH déclare le numéro invalide : 400 « numero_invalide »', [r2.code, r2.j.error], [400, 'numero_invalide']);
      const h2 = await sante(svc);
      v('⛔ un refus franc RENDU : le coût n\'est pas gardé', h2.coutJourEur, h.coutJourEur);
      ovh.mode = 'normal';
      v('⛔ et le plafond du numéro est rendu : on peut redemander tout de suite', (await demander(svc, n2)).code, 200);
      ovh.mode = '403';
      const r3 = await demander(svc, TEL.numeroBE());
      v('OVH refuse la clé (403) : 503 « sms_indisponible » — un geste de Justin, pas la faute du client', [r3.code, r3.j.error], [503, 'sms_indisponible']);
      vrai('   /health le crie : « ovhEchecs » monte', (await sante(svc)).ovhEchecs >= 1);
    } finally { await svc.arreter(); }
  }

  /* ═══ 4. L'EMBALLEMENT D'UN PAYS → BOUCLIER ══════════════════════════════════════════════════════════════════════════ */
  console.log('\n── 915 · l\'EMBALLEMENT : un pays qui dépasse son plancher passe en BOUCLIER (preuve de travail + délai), LUI SEUL ──');
  {
    const svc = await TEL.lancerTel({ sms: { budgetJour: 500, budgetHeure: 500, budgetPaysJour: 500, budgetPaysHeure: 500, emballement: { plancher: 5, facteur: 5 }, bouclier: { bits: 8, attenteMs: 2000, validiteMs: 600000 } } }); const ovh = svc.ovh;
    try {
      const reps = [];
      for (let i = 0; i < 5; i++) reps.push((await demander(svc, TEL.numeroBE())).code);
      v('cinq SMS belges dans l\'heure : sous le plancher, ils passent sans preuve', reps, Array(5).fill(200));
      const N = TEL.numeroBE(), ipN = TEL.reseauNeuf();
      const sixieme = await demander(svc, N, ipN);
      v('⛔ le sixième dépasse le plancher : 428 « defi_requis » — la Belgique passe en bouclier', [sixieme.code, sixieme.j.error], [428, 'defi_requis']);
      const d = sixieme.j.defi;
      v('   le défi : un jeton, 8 bits de travail, un délai de 2 s (Retry-After le dit aussi)', [typeof d.jeton, d.bits, d.attente_s, retryDe(sixieme)], ['string', 8, 2, 2]);
      v('⛔ AUCUN SMS pour la demande sans preuve', ovh.jobs.length, 5);
      const fr = await demander(svc, '+336' + aleaDigits(8));
      v('⛔ la France n\'est PAS touchée : le bouclier est PAR PAYS', [fr.code, fr.j.defi], [200, undefined]);
      v('   /health : un bouclier actif', (await sante(svc)).boucliers, 1);
      vrai('   le journal le dit, avec le PAYS et jamais un numéro', /"evt":"sms_bouclier"[^\n]*"pays":"BE"/.test(svc.sortie.texte()) && !svc.sortie.texte().includes(N.slice(3)));

      /* La preuve, mais AVANT le délai : refusée (un robot ne gagne pas de temps en calculant vite). */
      const nonce = TEL.resoudre(d.jeton, d.bits);
      const tot = await T.client(svc.base, { xff: ipN }).post('/api/tel/code', { numero: N, defi: { jeton: d.jeton, nonce } });
      v('⛔ une preuve juste mais RENDUE AVANT le délai de 2 s → 428 de nouveau (le délai est tenu)', [tot.code, tot.j.error, typeof tot.j.defi.jeton], [428, 'defi_requis', 'string']);
      svc.avancer(2100);
      const d2 = tot.j.defi, nonce2 = TEL.resoudre(d2.jeton, d2.bits);
      const faux = await T.client(svc.base, { xff: ipN }).post('/api/tel/code', { numero: N, defi: { jeton: d2.jeton, nonce: nonce2 + 'x' } });
      v('une preuve FAUSSE (un nonce qui ne donne pas les zéros) → 428', faux.code, 428);
      /* Le défi est lié au numéro. */
      svc.avancer(2100);
      const dA = (await demander(svc, N, ipN)).j.defi; svc.avancer(2100);
      const autre = TEL.numeroBE();
      v('⛔ un défi gagné pour un numéro ne sert pas à un AUTRE numéro', (await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: autre, defi: { jeton: dA.jeton, nonce: TEL.resoudre(dA.jeton, dA.bits) } })).code, 428);
      const bon = await T.client(svc.base, { xff: ipN }).post('/api/tel/code', { numero: N, defi: { jeton: dA.jeton, nonce: TEL.resoudre(dA.jeton, dA.bits) } });
      v('⛔ la preuve juste, rendue APRÈS le délai, pour LE bon numéro → le SMS part', [bon.code, bon.j.ok, ovh.jobs.length, ovh.jobs[ovh.jobs.length - 1].numero], [200, true, 7, N]);
      svc.avancer(61 * 1000);
      const rejoue = await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: N, defi: { jeton: dA.jeton, nonce: TEL.resoudre(dA.jeton, dA.bits) } });
      v('⛔ une preuve ne sert QU\'UNE fois : la même, rejouée → 428', rejoue.code, 428);
      /* Le bouclier tombe de lui-même quand l'emballement passe. */
      svc.avancer(7 * HEURE);
      const apres = await demander(svc, TEL.numeroBE());
      v('sept heures plus tard (le bouclier dure 6 h, la fenêtre d\'une heure est vide) : la Belgique repasse sans preuve', [apres.code, apres.j.defi, (await sante(svc)).boucliers], [200, undefined, 0]);
    } finally { await svc.arreter(); }
  }
  {
    /* Le bouclier FORCÉ par la configuration (un pays qu'on veut protéger d'avance) et le bouclier GLOBAL. */
    const svc = await TEL.lancerTel({ sms: { bouclier: { pays: ['IN'], bits: 8, attenteMs: 0 }, emballement: { plancher: 1000 } } });
    try {
      const inde = await demander(svc, '+9198' + aleaDigits(8)), be = await demander(svc, TEL.numeroBE());
      v('⛔ un pays forcé en bouclier par la configuration exige la preuve DÈS LE PREMIER SMS ; les autres non', [inde.code, be.code], [428, 200]);
    } finally { await svc.arreter(); }
  }
  {
    const svc = await TEL.lancerTel({ sms: { bouclier: { global: true, bits: 8, attenteMs: 0 } } });
    try {
      const r = await demander(svc, TEL.numeroBE());
      v('⛔ le bouclier GLOBAL (l\'interrupteur d\'urgence) : tous les pays exigent la preuve', [r.code, r.j.error], [428, 'defi_requis']);
      const d = r.j.defi;
      const bon = await T.client(svc.base, { xff: TEL.reseauNeuf() }).post('/api/tel/code', { numero: TEL.numeroBE(), defi: { jeton: d.jeton, nonce: TEL.resoudre(d.jeton, d.bits) } });
      v('   (un défi pris pour un autre numéro ne passe toujours pas)', bon.code, 428);
    } finally { await svc.arreter(); }
  }
  fin();
})().catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
