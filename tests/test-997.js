/* ══ test-997 — LE COMPTE PAR ADRESSE E-MAIL, « COMME DISCORD » (numéro facultatif) : LE VRAI SERVICE, UN FAUX RELAIS SMTP ═══════════════════════════════════════════════
   Décision de Justin, 6 octobre 2026. `server-msg/compte-courriel.js` : s'inscrire (un code à six chiffres par courriel), confirmer, se connecter, mot de passe oublié, nouveau mot de passe.
   Ce que ce banc garde, en parlant au VRAI service en HTTP, son courriel lu par un faux relais comme le lirait un client de messagerie (`outils-relais.js`) :
     · fermé par défaut : sans `inscriptionCourriel: true`, ou sans relais, rien ne s'inscrit et /api/config le dit ;
     · le code arrive, se tape, crée le compte ; il est lié à l'APPAREIL qui l'a demandé, à usage unique, et un faux code ne crée rien ;
     · ⛔ PERSONNE NE DEVINE QUI A UN COMPTE : inscrire une adresse prise et une neuve, demander « mot de passe oublié » pour une adresse inscrite et une inconnue, se tromper de mot de passe
       ou d'adresse — les réponses sont IDENTIQUES, et les plafonds tombent à la même demande dans les deux cas ;
     · un inconnu qui se trompe dix fois ne verrouille pas le compte de sa victime ;
     · changer de mot de passe COUPE toutes les sessions ; l'ancien mot de passe ne passe plus ;
     · aucune adresse dans les journaux du service.
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path');
const T = require('./outils-msg');
const P = require('./outils-push');
const STOCK = require(path.join(__dirname, '..', 'server-msg', 'stockage.js'));
const { fauxRelais, lireMessage } = require('./outils-relais');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();

const ADR = 'zoe.martin@exemple.invalid', ADR2 = 'ADRESSE-INCONNUE-QXW@exemple.invalid', MDP = 'un-mot-de-passe-solide', MDP2 = 'un-autre-mot-de-passe-solide';
const codeDe = (m) => { const x = /\b(\d{6})\b/.exec(m.texte || ''); return x ? x[1] : null; };
const sansAleas = (r) => JSON.stringify({ code: r.code, j: r.j });

(async () => {
  const relais = await fauxRelais({});
  const courriel = { hote: '127.0.0.1', port: relais.port, securite: 'aucune', de: 'comptes@exemple.invalid', timeoutMs: 3000 };
  const ferme = await T.lancerService({ config: { courriel } });                                       // relais, mais inscriptions FERMÉES (le défaut)
  const sansRelais = await T.lancerService({ config: { inscriptionCourriel: true } });                   // ouvertes, mais aucun relais
  const fps = await P.fauxServicePush();
  const svc = await T.lancerService({ horloge: true, config: { courriel, inscriptionCourriel: true, push: { ackMs: 1500, contact: 'mailto:exploitation@exemple.invalid' }, quotas: { mel_envoi: { renvoiMs: 60000 } } }, env: { OPMSG_TEST_PUSH: fps.hote } });
  const BASE = path.join(svc.data, 'msg.db');
  const sql = (req, ...a) => { const d = T.lireBase(BASE); try { return d.prepare(req).get(...a); } finally { d.close(); } };
  const messages = () => relais.messages.map(lireMessage);
  const attendreMessages = (n) => T.attendre(() => relais.messages.length >= n, 8000, 25);
  try {
    console.log('\n1. Fermé par défaut, et /api/config le dit');
    {
      const cf = (await T.client(ferme.base).get('/api/config')).j, cs = (await T.client(sansRelais.base).get('/api/config')).j, co = (await T.client(svc.base).get('/api/config')).j;
      v('/api/config `comptes` : fermé (relais sans drapeau), fermé (drapeau sans relais), ouvert (les deux)', [cf.comptes, cs.comptes, co.comptes],
        [{ inscription: false, courriel: true }, { inscription: false, courriel: false }, { inscription: true, courriel: true }]);
      const corps = { courriel: ADR, mdp: MDP, prenom: 'Zoé', conditions: true };
      const r1 = await T.client(ferme.base).post('/api/mel/inscrire', corps), r2 = await T.client(sansRelais.base).post('/api/mel/inscrire', corps);
      v('⛔ s\'inscrire est refusé (503 inscription_fermee) dans les deux cas, et aucun courriel ne part', [r1.code, r1.j.error, r2.code, r2.j.error, relais.messages.length], [503, 'inscription_fermee', 503, 'inscription_fermee', 0]);
    }

    console.log('\n2. Ce qui est refusé avant tout envoi');
    {
      const c = T.client(svc.base);
      const essais = [
        [{ courriel: 'pas une adresse', mdp: MDP, prenom: 'Zoé', conditions: true }, 'courriel_invalide'],
        [{ courriel: ADR, mdp: 'court', prenom: 'Zoé', conditions: true }, 'mdp_faible'],
        [{ courriel: ADR, mdp: 'motdepasse', prenom: 'Zoé', conditions: true }, 'mdp_faible'],
        [{ courriel: ADR, mdp: '0000000000', prenom: 'Zoé', conditions: true }, 'mdp_faible'],            // ⛔ relecture du gardien, C4 : un caractère répété
        [{ courriel: ADR, mdp: 'azerty12345', prenom: 'Zoé', conditions: true }, 'mdp_faible'],           //   une suite de clavier
        [{ courriel: ADR, mdp: 'zoe.martin2026', prenom: 'Zoé', conditions: true }, 'mdp_faible'],        //   la partie locale de l'adresse
        [{ courriel: ADR, mdp: 'zoeline!2026', prenom: 'Zoéline', conditions: true }, 'mdp_faible'],     //   le prénom
        [{ courriel: ADR, mdp: MDP, prenom: '', conditions: true }, 'champ_invalide'],
        [{ courriel: ADR, mdp: MDP, prenom: 'x'.repeat(61), conditions: true }, 'champ_invalide'],
        [{ courriel: ADR, mdp: MDP, prenom: 'Zoé' }, 'conditions_requises'],
      ];
      const rep = [];
      for (const [b, attendu] of essais) { const r = await c.post('/api/mel/inscrire', b); rep.push(r.code === 400 && r.j.error === attendu); }
      v('adresse fausse, mot de passe court, courant, répété, suite de clavier, tiré de l\'adresse ou du prénom, prénom vide ou trop long, conditions non acceptées : 400, chacun avec SON code', rep, essais.map(() => true));
      v('   et rien n\'est parti', relais.messages.length, 0);
    }

    console.log('\n3. S\'inscrire : le code arrive, se tape, crée le compte');
    const A = T.client(svc.base), autre = T.client(svc.base);
    let sessionB = null, sessionC = null;
    let codeA;
    {
      const r = await A.post('/api/mel/inscrire', { courriel: ADR, mdp: MDP, prenom: '  Zoé ', nom: 'Martin', conditions: true });
      v('la demande répond 200 {ok:true}', [r.code, r.j], [200, { ok: true }]);
      vrai('population : UN courriel arrive au relais', await attendreMessages(1));
      const m = messages()[0];
      codeA = codeDe(m);
      v('il va à l\'adresse tapée, sujet « Ton code OP MESSAGES », un code de six chiffres, AUCUN lien', [m.enveloppe.a, m.sujet, /^\d{6}$/.test(codeA || ''), /https?:\/\//.test(m.texte)], [[ADR], 'Ton code OP MESSAGES', true, false]);
      const faux = String((Number(codeA) + 1) % 1000000).padStart(6, '0');
      const r1 = await A.post('/api/mel/confirmer', { courriel: ADR, code: faux });
      v('un faux code : 401 code_invalide', [r1.code, r1.j.error], [401, 'code_invalide']);
      const r2 = await autre.post('/api/mel/confirmer', { courriel: ADR, code: codeA });
      v('⛔ le BON code depuis un AUTRE appareil : 401 (le code est lié à l\'appareil qui l\'a demandé — un inconnu ne peut ni l\'utiliser ni le brûler)', [r2.code, r2.j.error], [401, 'code_invalide']);
      const r3 = await A.post('/api/mel/confirmer', { courriel: ADR.toUpperCase(), code: codeA.slice(0, 3) + ' ' + codeA.slice(3) });
      v('le bon code, depuis le bon appareil (l\'adresse en majuscules, le code collé avec son espace) : 200, un compte NEUF, « Zoé Martin »', [r3.code, r3.j.nouveau, r3.j.moi && r3.j.moi.prenom, r3.j.moi && r3.j.moi.nom], [200, true, 'Zoé', 'Martin']);
      const mo = await A.get('/api/moi');
      v('   une session est posée : /api/moi répond, avec un identifiant « Zoé#1234 » (le prénom, quatre chiffres)', [mo.code, /^Zo[ée]#\d{4}$/i.test(mo.j && mo.j.moi && mo.j.moi.identifiant || '')], [200, true], mo.j && mo.j.moi && mo.j.moi.identifiant);
      const r4 = await T.client(svc.base).post('/api/mel/confirmer', { courriel: ADR, code: codeA });
      v('⛔ le code ne sert qu\'une fois', r4.code, 401);
    }

    console.log('\n4. ⛔ Personne ne devine qui a un compte');
    {
      svc.avancer(61000);
      const x = T.client(svc.base), y = T.client(svc.base);
      const pris = await x.post('/api/mel/inscrire', { courriel: ADR, mdp: MDP2, prenom: 'Intrus', conditions: true });
      const neuf = await y.post('/api/mel/inscrire', { courriel: ADR2, mdp: MDP2, prenom: 'Intrus', conditions: true });
      v('s\'inscrire avec une adresse PRISE et avec une adresse NEUVE : la même réponse', [sansAleas(pris), sansAleas(neuf)], [sansAleas(neuf), JSON.stringify({ code: 200, j: { ok: true } })]);
      vrai('population : deux courriels de plus', await attendreMessages(3));
      const m = messages(), existe = m.find(x2 => x2.enveloppe.a[0] === ADR && x2 !== m[0]), autreM = m.find(x2 => x2.enveloppe.a[0] === ADR2);
      v('l\'adresse prise reçoit « déjà un compte » SANS code ; la neuve reçoit son code', [existe && existe.sujet, existe && codeDe(existe), autreM && autreM.sujet, /^\d{6}$/.test(autreM && codeDe(autreM) || '')],
        ['Ton adresse a déjà un compte OP MESSAGES', null, 'Ton code OP MESSAGES', true]);
      const c1 = await T.client(svc.base).post('/api/mel/connexion', { courriel: ADR, mdp: 'pas-le-bon-mot-de-passe' });
      const c2 = await T.client(svc.base).post('/api/mel/connexion', { courriel: 'personne-QXW@exemple.invalid', mdp: 'pas-le-bon-mot-de-passe' });
      v('se tromper de mot de passe et se tromper d\'adresse : la même réponse (401 identifiants)', [sansAleas(c1), sansAleas(c2)], [sansAleas(c2), JSON.stringify({ code: 401, j: { error: 'identifiants' } })]);
      svc.avancer(61000);
      const z = T.client(svc.base);
      const o1 = await z.post('/api/mel/oubli', { courriel: ADR }), o2 = await z.post('/api/mel/oubli', { courriel: 'inconnue-QXW@exemple.invalid' });
      v('« mot de passe oublié » pour une adresse inscrite et pour une inconnue : la même réponse', [sansAleas(o1), sansAleas(o2)], [sansAleas(o2), JSON.stringify({ code: 200, j: { ok: true } })]);
      const o3 = await z.post('/api/mel/oubli', { courriel: ADR }), o4 = await z.post('/api/mel/oubli', { courriel: 'inconnue-QXW@exemple.invalid' });
      v('⛔ et redemandé aussitôt, les DEUX tombent sur le même délai (429 code_recent) — un délai qui ne compterait que les envois dirait qui est inscrit', [o3.code, o3.j.error, o4.code, o4.j.error], [429, 'code_recent', 429, 'code_recent']);
      vrai('population : la demande pour l\'adresse inscrite a bien envoyé un code, celle de l\'inconnue rien', await attendreMessages(4) && !messages().some(x2 => x2.enveloppe.a[0] === 'inconnue-QXW@exemple.invalid'));
    }

    console.log('\n5. Se connecter, et un inconnu qui se trompe ne verrouille pas la victime');
    {
      const intrus = T.client(svc.base);
      let derniers = [];
      for (let i = 0; i < 11; i++) derniers.push((await intrus.post('/api/mel/connexion', { courriel: ADR, mdp: 'essai-numero-' + i + '-xx' })).code);
      v('dix faux mots de passe depuis un appareil : 401, puis 429 au onzième (pour CET appareil)', [derniers.slice(0, 10).every(c => c === 401), derniers[10]], [true, 429]);
      const B = T.client(svc.base);
      const r = await B.post('/api/mel/connexion', { courriel: ' ' + ADR.replace('zoe', 'Zoe') + ' ', mdp: MDP });
      v('⛔ la victime, depuis SON appareil, avec le bon mot de passe : 200 (l\'adresse en casse différente, des blancs autour)', [r.code, r.j.moi && r.j.moi.prenom], [200, 'Zoé']);
      vrai('   sa session marche', (await B.get('/api/moi')).code === 200);
      sessionB = B;
    }

    console.log('\n6. Mot de passe oublié → nouveau mot de passe : toutes les sessions tombent');
    {
      const n0 = relais.messages.length;
      svc.avancer(3600000 + 1000);   // l'adresse a déjà eu ses trois demandes de l'heure (§ 3 et 4) : le plafond fait son travail, on passe l'heure
      const C = T.client(svc.base);
      v('demander un code de réinitialisation : 200', (await C.post('/api/mel/oubli', { courriel: ADR })).code, 200);
      vrai('population : le courriel arrive (« nouveau mot de passe », un code)', await attendreMessages(n0 + 1));
      const m = messages()[n0], code = codeDe(m);
      v('son sujet, son code', [m.sujet, /^\d{6}$/.test(code || '')], ['Ton code pour un nouveau mot de passe OP MESSAGES', true]);
      /* ⛔ relecture du gardien, C2 : une minute plus tard, un INCONNU (un autre appareil) redemande un code pour la même adresse — il ne doit ni écraser ni brûler celui de la personne */
      svc.avancer(61000);
      const intrus = T.client(svc.base), n1 = relais.messages.length;
      v('un inconnu redemande un code pour cette adresse : la même réponse (200)', (await intrus.post('/api/mel/oubli', { courriel: ADR })).code, 200);
      await T.attendre(() => relais.messages.length > n1, 4000, 25);
      v('⛔ son code à LUI part (lié à son appareil) — celui de la personne n\'est ni remplacé ni brûlé (elle s\'en sert plus bas)', relais.messages.length, n1 + 1);
      /* ⛔ relecture du gardien, B1 : l'appareil B (une session de l'intrus, disons) s'abonne aux notifications push */
      const apB = P.appareil(fps.endpoint('zoe-b'));
      v('population : l\'appareil B s\'abonne aux notifications push', (await sessionB.post('/api/push/abonner', { sub: apB.sub })).code, 200);
      const uidZ = (await sessionB.get('/api/moi')).j.moi.id;
      vrai('   (une ligne dans la base)', Number(sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uidZ).n) >= 1);
      /* une copie de la base AVANT le changement (une archive de la sauvegarde) : la restaurer ne doit pas ramener l'ancien mot de passe (C5) */
      const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-997-'));
      const copie = path.join(bac, 'avant.db');
      { const d = T.lireBase(BASE); try { d.exec("VACUUM INTO '" + copie.replace(/'/g, "''") + "'"); } finally { d.close(); } }
      const r0 = await C.post('/api/mel/reinit', { courriel: ADR, code, mdp: 'court' });
      v('un mot de passe trop court est refusé AVANT de consommer le code', [r0.code, r0.j.error], [400, 'mdp_faible']);
      const fB = await T.flux(sessionB);
      vrai('population : l\'appareil B a son flux temps réel ouvert', fB.statut === 200);
      const r1 = await C.post('/api/mel/reinit', { courriel: ADR, code, mdp: MDP2 });
      const finB = await fB.attendre(e => e.event === 'fin', 6000);
      vrai('⛔ et le flux temps réel de B se FERME tout de suite (sinon l\'appareil de celui qui avait pris le compte continuerait de recevoir les messages)', !!finB);
      fB.fermer();
      v('le nouveau mot de passe : 200, et il dit combien de sessions sont tombées (celles de A et B)', [r1.code, r1.j.sessions >= 2], [200, true]);
      v('⛔ les anciennes sessions ne passent plus (A, B), la nouvelle oui', [(await A.get('/api/moi')).code, (await sessionB.get('/api/moi')).code, (await C.get('/api/moi')).code], [401, 401, 200]);
      const vieux = await T.client(svc.base).post('/api/mel/connexion', { courriel: ADR, mdp: MDP }), neuf = await T.client(svc.base).post('/api/mel/connexion', { courriel: ADR, mdp: MDP2 });
      v('l\'ancien mot de passe ne passe plus, le nouveau oui', [vieux.code, neuf.code], [401, 200]);
      const r2 = await C.post('/api/mel/reinit', { courriel: ADR, code, mdp: 'encore-un-mot-de-passe' });
      v('le code de réinitialisation ne sert qu\'une fois', r2.code, 401);
      v('⛔ les abonnements push d\'avant sont partis (l\'appareil de l\'intrus ne reçoit plus rien)', Number(sql('SELECT COUNT(*) AS n FROM push WHERE uid = ?', uidZ).n), 0);
      vrai('un courriel « ton mot de passe a changé » part à l\'adresse', await T.attendre(() => messages().some(x => x.enveloppe.a[0] === ADR && x.sujet === 'Ton mot de passe OP MESSAGES a changé'), 8000, 25));
      /* la restauration : le registre de la base vivante rejoué sur la copie d'avant */
      const registre = STOCK.ouvrir.copie.purgeLire(BASE);
      vrai('population : le registre porte le changement (genre « mdp », jamais l\'empreinte ni le mot de passe)', registre.some(r => r.genre === 'mdp' && r.objet.startsWith(uidZ + '|')));
      const avant = (() => { const d = T.lireBase(copie); try { return [d.prepare('SELECT mdp IS NOT NULL AS x FROM personne WHERE id = ?').get(uidZ).x, Number(d.prepare('SELECT COUNT(*) AS n FROM session WHERE personne = ?').get(uidZ).n), Number(d.prepare('SELECT COUNT(*) AS n FROM push WHERE uid = ?').get(uidZ).n)]; } finally { d.close(); } })();
      v('population : la copie d\'avant porte l\'ancien mot de passe, des sessions et l\'abonnement push', [avant[0], avant[1] >= 1, avant[2] >= 1], [1, true, true]);
      STOCK.ouvrir.copie.rejouerPurge(copie, registre);
      const apres = (() => { const d = T.lireBase(copie); try { return [d.prepare('SELECT mdp IS NULL AS x FROM personne WHERE id = ?').get(uidZ).x, Number(d.prepare('SELECT COUNT(*) AS n FROM session WHERE personne = ?').get(uidZ).n), Number(d.prepare('SELECT COUNT(*) AS n FROM push WHERE uid = ?').get(uidZ).n)]; } finally { d.close(); } })();
      v('⛔ restaurée puis rejouée : l\'ancien mot de passe est OUBLIÉ (il faudra le réinitialiser), ses sessions et abonnements d\'avant aussi', apres, [1, 0, 0]);
      fs.rmSync(bac, { recursive: true, force: true });
      sessionC = C;
    }

    console.log('\n7. Les plafonds par adresse');
    {
      /* deux adresses qui ont chacune UNE demande comptée : une inscription jamais confirmée (pas de compte), et une adresse qui crée VRAIMENT son compte */
      const adrN = 'nul-qxw@exemple.invalid', adrY = 'yann-qxw@exemple.invalid', Y = T.client(svc.base), n0 = relais.messages.length;
      svc.avancer(61000);
      await T.client(svc.base).post('/api/mel/inscrire', { courriel: adrN, mdp: MDP, prenom: 'Nul', conditions: true });
      await Y.post('/api/mel/inscrire', { courriel: adrY, mdp: MDP, prenom: 'Yann', conditions: true });
      vrai('population : les deux inscriptions envoient leur code, Yann reçoit le sien', await attendreMessages(n0 + 2) && await T.attendre(() => messages().some(m => m.enveloppe.a[0] === adrY), 8000, 25));
      const code = codeDe(messages().find(m => m.enveloppe.a[0] === adrY));
      v('population : le compte de Yann existe', (await Y.post('/api/mel/confirmer', { courriel: adrY, code })).code, 200);
      const P = T.client(svc.base), reps = [];
      for (let i = 0; i < 5; i++) { svc.avancer(61000); reps.push([(await P.post('/api/mel/oubli', { courriel: adrN })).code, (await P.post('/api/mel/oubli', { courriel: adrY })).code]); }
      v('⛔ « mot de passe oublié » : cinq demandes par heure et par adresse — la cinquième de plus tombe (429), au MÊME rang pour une adresse sans compte et une adresse inscrite', reps, [[200, 200], [200, 200], [200, 200], [200, 200], [429, 429]]);
    }

    console.log('\n7 bis. Les attaques de la relecture : en même temps, depuis mille appareils, depuis un appareil inconnu');
    {
      /* C1 : vingt inscriptions SIMULTANÉES vers une même adresse neuve — la demande se note avant l'attente du hachage */
      const cible = 'simultane-qxw@exemple.invalid', n0 = relais.messages.length;
      svc.avancer(61000);
      const reps = await Promise.all(Array.from({ length: 20 }, (_, i) => T.client(svc.base, { xff: '10.9.' + i + '.1' }).post('/api/mel/inscrire', { courriel: cible, mdp: MDP, prenom: 'Sim', conditions: true })));
      await T.dort(800);
      const vers = messages().slice(n0).filter(m => m.enveloppe.a[0] === cible).length;
      v('⛔ vingt inscriptions simultanées vers une même adresse : UNE passe, les autres attendent (429), et UN courriel part', [reps.filter(r => r.code === 200).length, reps.filter(r => r.code === 429).length, vers], [1, 19, 1]);
      /* C3 : cinquante appareils inconnus (chacun son réseau) se trompent de mot de passe — le cinquante et unième est arrêté, le propriétaire sur SON appareil passe */
      /* (les essais faux des sections 4 à 6 comptent déjà : on va jusqu'au premier 429, cinquante au plus) */
      const echecs = [];
      for (let i = 0; i < 60; i++) { const c = (await T.client(svc.base, { xff: '10.8.' + i + '.1' }).post('/api/mel/connexion', { courriel: ADR, mdp: 'essai-faux-' + i + '-zz' })).code; echecs.push(c); if (c === 429) break; }
      const k = echecs.indexOf(429);
      const cinquanteEtUn = await T.client(svc.base, { xff: '10.7.0.1' }).post('/api/mel/connexion', { courriel: ADR, mdp: MDP2 });
      v('des appareils inconnus (chacun son réseau) se trompent : 401, puis 429 avant le cinquante et unième ; un autre inconnu, même avec le BON mot de passe, est arrêté (429)',
        [k > 0 && k <= 50, echecs.slice(0, k).every(c => c === 401), cinquanteEtUn.code], [true, true, 429], echecs.length);
      const r = await sessionC.post('/api/mel/connexion', { courriel: ADR, mdp: MDP2 });
      v('⛔ le propriétaire, sur l\'appareil où il s\'est déjà connecté, entre (200) : un inconnu ne lui ferme pas la porte', r.code, 200);
      /* C6 : une connexion depuis un appareil INCONNU prévient (« Nouvel appareil connecté ») ; depuis un appareil connu, non */
      const uidZ = r.j.moi.id;
      const nNotif = () => Number(sql("SELECT COUNT(*) AS n FROM notification WHERE uid = ? AND type = 'nouvel_appareil'", uidZ).n);
      const a0 = nNotif();
      await sessionC.post('/api/mel/connexion', { courriel: ADR, mdp: MDP2 });
      const a1 = nNotif();
      svc.avancer(86400000 + 1000);   // le plafond des inconnus est passé
      const neuf = await T.client(svc.base, { xff: '10.6.0.1' }).post('/api/mel/connexion', { courriel: ADR, mdp: MDP2 });
      const a2 = nNotif();
      v('⛔ un appareil connu ne crée pas d\'alerte ; un appareil INCONNU qui entre crée « Nouvel appareil connecté »', [a1 - a0, neuf.code, a2 - a1], [0, 200, 1]);
    }

    console.log('\n7 ter. Le second tour de la relecture');
    {
      /* N1 : « nouveau mot de passe » avec un mot de passe qui contient le prénom du titulaire — la réponse ne dit pas si l'adresse a un compte */
      const x = T.client(svc.base, { xff: '10.5.0.1' });
      /* (le compte de Yann, § 7 : un prénom de QUATRE lettres — la règle ignore un prénom plus court, « Zoé » ne mettrait rien à l'épreuve) */
      const n1a = await x.post('/api/mel/reinit', { courriel: 'yann-qxw@exemple.invalid', code: '000000', mdp: 'yann-et-son-velo-rouge' });
      const n1b = await x.post('/api/mel/reinit', { courriel: 'personne-n1-qxw@exemple.invalid', code: '000000', mdp: 'yann-et-son-velo-rouge' });
      v('⛔ un mot de passe qui contient le prénom du titulaire, sans code : la MÊME réponse pour l\'adresse inscrite et une inconnue (401 code_invalide)', [sansAleas(n1a), sansAleas(n1b)], [sansAleas(n1b), JSON.stringify({ code: 401, j: { error: 'code_invalide' } })]);
      /* N3 : l'attaquant demande un code le PREMIER ; la personne, ensuite, reçoit LE SIEN et s'en sert */
      svc.avancer(3600000 + 1000);
      const atk = T.client(svc.base, { xff: '10.4.0.1' }), vic = T.client(svc.base, { xff: '10.4.1.1' }), n0 = relais.messages.length;
      v('l\'attaquant demande un code pour l\'adresse de la personne (200)', (await atk.post('/api/mel/oubli', { courriel: ADR })).code, 200);
      svc.avancer(61000);
      v('puis la personne demande le sien (200)', (await vic.post('/api/mel/oubli', { courriel: ADR })).code, 200);
      vrai('⛔ DEUX codes sont partis (un par appareil) : la personne n\'est pas privée du sien', await T.attendre(() => relais.messages.length >= n0 + 2, 8000, 25));
      const codes = messages().slice(n0).map(codeDe);
      const essaiVic = [];
      for (const c of codes) essaiVic.push((await vic.post('/api/mel/reinit', { courriel: ADR, code: c, mdp: 'cheval-batterie-agrafe-91' })).code);
      v('   et l\'un des deux (le sien) lui sert — l\'ordre d\'arrivée des deux courriels n\'est pas garanti, on les essaie tous les deux', essaiVic.filter(c => c === 200).length, 1, essaiVic);
      /* N2 : un mot de passe EFFACÉ (le rejeu d'une restauration) : « mot de passe oublié » reste la porte, et elle s'ouvre */
      const uidZ = (await vic.get('/api/moi')).j.moi.id;
      { const { DatabaseSync } = require('node:sqlite'); const d = new DatabaseSync(BASE); d.exec('PRAGMA busy_timeout=5000'); d.prepare('UPDATE personne SET sel = NULL, mdp = NULL, params = NULL WHERE id = ?').run(uidZ); d.close(); }
      v('population : le mot de passe est effacé — la connexion ne passe plus', (await T.client(svc.base, { xff: '10.3.0.1' }).post('/api/mel/connexion', { courriel: ADR, mdp: 'cheval-batterie-agrafe-91' })).code, 401);
      svc.avancer(61000);
      const R = T.client(svc.base, { xff: '10.3.1.1' }), n2 = relais.messages.length;
      await R.post('/api/mel/oubli', { courriel: ADR });
      vrai('⛔ « mot de passe oublié » envoie quand même un code (sinon le compte serait verrouillé pour toujours)', await T.attendre(() => relais.messages.length > n2, 8000, 25));
      const c2 = codeDe(messages()[n2]);
      v('   et le nouveau mot de passe se pose : on entre', (await R.post('/api/mel/reinit', { courriel: ADR, code: c2, mdp: 'riviere-lanterne-sapin-47' })).code, 200);
    }

    console.log('\n8. Rien d\'une adresse dans les journaux du service');
    {
      const t = svc.sortie.texte();
      vrai('population : le service a journalisé des envois de courriels de compte', /compte_courriel/.test(t));
      v('⛔ aucune adresse, aucun code dans ses journaux', [t.includes('exemple.invalid'), /QXW/.test(t), t.includes(codeA)], [false, false, false]);
    }
  } finally {
    await svc.arreter(); await ferme.arreter(); await sansRelais.arreter(); await relais.fermer(); await fps.fermer();
  }
  fin();
})().catch(e => { console.error(e); process.exit(1); });
