/* ⛔ CE QUE CE FICHIER GARDE — L'ENVOI AUTONOME : QUAND UN COURRIEL PART SEUL, ET QUAND IL NE PART PAS (23 octobre 2026).
     Justin veut l'autonomie : la charte `repondre_client` est OUVERTE par défaut. Mais « ouvert » ne veut pas dire « sans garde » : un courriel ne part seul que si TOUT est vrai —
     le mode de l'agent est « auto », la charte est ouverte, le contrôle qualité a dit « bon », l'expéditeur est authentifié, personne n'a demandé la validation, et cette adresse n'a pas
     déjà reçu trois courriels en 24 h. Le moindre doute : une validation, et la RAISON s'écrit au journal.
       0. `authentification` (mail.js) : l'en-tête Authentication-Results de NOTRE serveur de réception — le PREMIER seulement, d'un serveur CONNU, dkim=pass ou spf=pass ALIGNÉ sur le
          domaine « De » ; un en-tête forgé plus bas, un serveur inconnu, un domaine d'ailleurs, un échec : « non » ; `enteteAutomatique` : réponses d'absence, listes, accusés ;
       1. `brouillons.deposer` : chaque condition retirée UNE à UNE → la validation, avec sa raison ; toutes réunies → l'envoi direct ; le plafond de trois par adresse ;
       2. la charte est ouverte par défaut, et le patron peut la refermer ;
       3. Léa et Camille en mode auto : un compte prouvé → direct ; un courriel reçu non authentifié → brouillon ; un message automatique → jamais de réponse. */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, courrielPour } = require('./banc-agents-courrier.js');
const MAIL = require(path.join(RACINE, 'server', 'mail.js'));
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const JOUR = 86400000;
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 90 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 90000).unref();

const ligne = l => ({ key: 'authentication-results', line: 'Authentication-Results: ' + l });
const A = (lignes, de, serveurs) => MAIL.authentification(lignes, de, serveurs || ['ionos.fr']);

(async () => {
  console.log('\n── 2902 · L’envoi autonome et ses gardes ──');

  console.log('\n0. L’expéditeur est-il authentifié ? (Authentication-Results de NOTRE serveur)');
  {
    const BON = 'mx1.ionos.fr; dkim=pass header.d=client.fr header.s=sel; spf=pass smtp.mailfrom=bounce@client.fr';
    v('dkim=pass aligné sur le domaine « De » : oui, par dkim', A([ligne(BON)], 'contact@client.fr'), { ok: true, par: 'dkim', domaine: 'client.fr' });
    v('un en-tête sur plusieurs lignes (repliement) se lit pareil', A([{ key: 'authentication-results', line: 'Authentication-Results: mx1.ionos.fr;\r\n\tdkim=pass\r\n\theader.d=client.fr' }], 'x@client.fr').ok, true);
    v('spf=pass seul, smtp.mailfrom aligné : oui, par spf', A([ligne('mx1.ionos.fr; dkim=none; spf=pass smtp.mailfrom=bounce@client.fr')], 'x@client.fr'), { ok: true, par: 'spf', domaine: 'client.fr' });
    v('un domaine signataire SOUS-domaine du domaine « De » (mail.client.fr) : aligné', A([ligne('mx1.ionos.fr; dkim=pass header.d=mail.client.fr')], 'x@client.fr').ok, true);
    v('header.i=user@client.fr (identité) : lu', A([ligne('mx1.ionos.fr; dkim=pass header.i=user@client.fr')], 'x@client.fr').ok, true);
    v('« DKIM=PASS » en majuscules, header.d entre guillemets : lu', A([ligne('MX1.IONOS.FR; DKIM=PASS header.d="client.fr"')], 'x@client.fr').ok, true);
    v('le serveur connu est un SOUS-domaine du réglage (mx1.ionos.fr, réglage ionos.fr) : oui', A([ligne(BON)], 'x@client.fr', ['ionos.fr']).ok, true);
    v('(contre-épreuve) le réglage est un nom d’hôte exact : oui aussi', A([ligne(BON)], 'x@client.fr', ['mx1.ionos.fr']).ok, true);
    for (const [nom, lignes, de, serveurs, raison] of [
      ['aucun en-tête', [], 'x@client.fr', null, 'aucun en-tête'],
      ['un autre en-tête que Authentication-Results', [{ key: 'received-spf', line: 'Received-SPF: pass' }], 'x@client.fr', null, 'aucun en-tête'],
      ['dkim=pass mais signé par UN AUTRE domaine (l’attaquant signe avec le sien)', [ligne('mx1.ionos.fr; dkim=pass header.d=attaquant.example')], 'direction@client.fr', null, 'ni dkim ni spf aligné'],
      ['spf=pass mais pour un autre domaine', [ligne('mx1.ionos.fr; spf=pass smtp.mailfrom=bounce@attaquant.example')], 'direction@client.fr', null, 'ni dkim ni spf aligné'],
      ['spf=pass sans adresse (smtp.helo seul)', [ligne('mx1.ionos.fr; spf=pass smtp.helo=mail.client.fr')], 'x@client.fr', null, 'ni dkim ni spf aligné'],
      ['dkim=fail et spf=softfail', [ligne('mx1.ionos.fr; dkim=fail header.d=client.fr; spf=softfail smtp.mailfrom=a@client.fr')], 'x@client.fr', null, 'ni dkim ni spf aligné'],
      ['dkim=none, spf=none', [ligne('mx1.ionos.fr; dkim=none; spf=none')], 'x@client.fr', null, 'ni dkim ni spf aligné'],
      ['un serveur INCONNU (l’expéditeur a écrit son propre en-tête)', [ligne('mx.attaquant.example; dkim=pass header.d=client.fr')], 'x@client.fr', null, 'serveur inconnu'],
      ['un serveur qui ressemble au nôtre (mx.ionos.fr.attaquant.example)', [ligne('mx.ionos.fr.attaquant.example; dkim=pass header.d=client.fr')], 'x@client.fr', null, 'serveur inconnu'],
      ['un serveur qui se termine comme le nôtre sans point (evilionos.fr)', [ligne('evilionos.fr; dkim=pass header.d=client.fr')], 'x@client.fr', null, 'serveur inconnu'],
      ['un expéditeur sans domaine', [ligne(BON)], 'pas-une-adresse', null, 'expéditeur sans domaine'],
      ['aucun serveur de réception connu', [ligne(BON)], 'x@client.fr', [], 'serveur inconnu'],
    ]) {
      const r = A(lignes, de, serveurs === null ? undefined : serveurs);
      v('⛔ ' + nom + ' : non (' + raison + ')', [r.ok, r.raison], [false, raison]);
    }
    v('⛔ UN EN-TÊTE FORGÉ PLUS BAS ne compte pas : le premier (le nôtre) dit dkim=fail, le second (du dehors) dit pass', A([ligne('mx1.ionos.fr; dkim=fail header.d=client.fr'), ligne('mx1.ionos.fr; dkim=pass header.d=client.fr')], 'x@client.fr').ok, false);
    v('⛔ …et si le PREMIER est un faux et le nôtre dessous : non plus (le faux est d’un serveur inconnu)', A([ligne('faux.example; dkim=pass header.d=client.fr'), ligne(BON)], 'x@client.fr').ok, false);
    v('un spf aligné rattrape un dkim qui échoue (l’ordre des méthodes ne compte pas)', A([ligne('mx1.ionos.fr; dkim=fail header.d=client.fr; spf=pass smtp.mailfrom=a@client.fr')], 'x@client.fr').ok, true);

    const H = o => ({ get: k => o[k], has: k => Object.prototype.hasOwnProperty.call(o, k) });
    const E = MAIL.enteteAutomatique;
    v('un message ordinaire n’est pas automatique', E(H({ subject: 'x' })), false);
    v('Auto-Submitted: auto-replied (réponse d’absence) : automatique', E(H({ 'auto-submitted': 'auto-replied' })), true);
    v('Auto-Submitted: no : pas automatique', E(H({ 'auto-submitted': 'no' })), false);
    v('Precedence: bulk / list / junk : automatique', [E(H({ precedence: 'bulk' })), E(H({ precedence: 'list' })), E(H({ precedence: 'junk' }))], [true, true, true]);
    v('List-Id, List-Unsubscribe, X-Auto-Response-Suppress : automatique', [E(H({ 'list-id': '<x>' })), E(H({ 'list-unsubscribe': '<mailto:x>' })), E(H({ 'x-auto-response-suppress': 'All' }))], [true, true, true]);
    v('sans en-têtes (null) : pas automatique', E(null), false);
    vrai('(population) le crochet de la veille ne soumet à Camille que ce qui n’est ni notification ni automatique : `enteteAuto` est lu par Camille', /m\.enteteAuto/.test(fs.readFileSync(path.join(RACINE, 'server', 'agent-camille.js'), 'utf8')));
  }

  console.log('\n1. Les gardes de l’envoi seul, une à une');
  {
    const base = (Z, n, plus) => Object.assign({ agent: 'lea', a: 'p' + n + '@exemple-2902.fr', objet: 'Objet', texte: 'Bonjour,\n\nTexte.\n\nBien cordialement,', source: 'inscription', entreprise: 'Toka Clim', role: 'contact',
      controle: { etat: 'bon', fautes: [], juge: true }, authentifie: true }, plus || {});
    const Z = monter({ modes: { lea: 'auto' } });
    v('(population) la charte laisse « répondre seul » ouvert par défaut', Z.direction.autorise('repondre_client'), { auto: true, raison: 'ok' });
    let r = await Z.brouillons.deposer(base(Z, 1));
    v('TOUT réuni (auto, charte ouverte, contrôle bon, expéditeur authentifié) : envoi DIRECT', [r.voie, Z.envoyes.length, Z.fichierJson('agents-brouillons.json')[r.ref].etat, (await Z.validations()).length], ['direct', 1, 'envoye', 0]);
    vrai('…journalisé, avec le fait que le contrôle était passé', Z.journal().some(e => e.action === 'réponse envoyée sans validation' && /contrôle qualité bon/.test(e.detail)));
    vrai('…et le courriel envoyé est le texte rangé, signé par Léa', Z.envoyes[0].texte === 'Bonjour,\n\nTexte.\n\nBien cordialement,' && /^Léa — Assistante virtuelle/.test(Z.envoyes[0].signature));

    const cas = [
      ['le contrôle dit « à revoir »', { controle: { etat: 'a_revoir', fautes: ['tutoiement'], juge: false } }, /contrôle a revoir/],
      ['le contrôle n’a pas pu se faire (« non vérifié »)', { controle: { etat: 'non_verifie', fautes: [], juge: false } }, /contrôle non verifie/],
      ['AUCUN verdict de contrôle (un appelant qui l’oublie)', { controle: undefined }, /contrôle non verifie/],
      ['un verdict inventé', { controle: { etat: 'excellent', fautes: [], juge: true } }, /contrôle non verifie/],
      ['l’expéditeur n’est pas authentifié', { authentifie: false }, /expéditeur non authentifié/],
      ['l’authentification n’est pas dite (undefined)', { authentifie: undefined }, /expéditeur non authentifié/],
      ['l’appelant demande la validation', { forceValidation: true }, /validation demandée/],
    ];
    let n = 2;
    for (const [nom, plus, motif] of cas) {
      const avant = Z.envoyes.length;
      r = await Z.brouillons.deposer(base(Z, n++, plus));
      vrai('⛔ ' + nom + ' : une VALIDATION, rien ne part', r.voie === 'validation' && Z.envoyes.length === avant, JSON.stringify(r));
      vrai('…et la RAISON est au journal', Z.journal().some(e => e.action === 'réponse laissée à la validation' && motif.test(e.detail)), JSON.stringify(Z.journal().filter(e => e.action === 'réponse laissée à la validation').slice(-1)));
    }
    Z.nettoyer();

    const B = monter({ modes: { lea: 'brouillon' } });
    r = await B.brouillons.deposer(base(B, 1));
    v('⛔ le MODE « brouillon » (tout le reste est bon) : validation', [r.voie, B.envoyes.length], ['validation', 0]);
    B.nettoyer();
    const F = monter({ modes: { lea: 'auto' } });
    await F.appeler('POST /api/monitor/agents/charte', { tourUser: F.PATRON, body: { gestes: { repondre_client: { auto: false } } } });
    r = await F.brouillons.deposer(base(F, 1));
    v('⛔ la charte REFERMÉE par le patron : validation', [r.voie, F.envoyes.length], ['validation', 0]);
    vrai('…et la raison dit « charte fermée »', F.journal().some(e => e.action === 'réponse laissée à la validation' && /charte fermée/.test(e.detail)));
    F.nettoyer();

    console.log('   … trois courriels par adresse en 24 h');
    const R = monter({ modes: { lea: 'auto' } });
    const memes = [];
    for (let i = 0; i < 4; i++) memes.push(await R.brouillons.deposer(base(R, 0, { a: 'meme@exemple-2902.fr', objet: 'Objet ' + i })));
    v('⛔ trois partent seuls, le QUATRIÈME vers la même adresse attend Justin', [memes.map(x => x.voie), R.envoyes.length], [['direct', 'direct', 'direct', 'validation'], 3]);
    vrai('…la raison dit pourquoi', R.journal().some(e => /déjà 3 courriels en 24 h/.test(e.detail || '')));
    v('…une AUTRE adresse n’est pas touchée', (await R.brouillons.deposer(base(R, 9))).voie, 'direct');
    R.horloge.t += JOUR + 1000;
    v('…le lendemain, la même adresse repart seule', (await R.brouillons.deposer(base(R, 0, { a: 'meme@exemple-2902.fr', objet: 'Lendemain' }))).voie, 'direct');
    v('l’adresse comptée est celle du DESTINATAIRE, en minuscules (« Meme@… » compte aussi)', R.brouillons.envoyesRecents('MEME@exemple-2902.fr'), 1);
    R.nettoyer();
  }

  console.log('\n2. La charte');
  {
    const Z = monter({ modes: {} });
    const fermer = body => Z.appeler('POST /api/monitor/agents/charte', { tourUser: Z.PATRON, body: { gestes: body } });
    v('le patron ferme puis rouvre', [(await fermer({ repondre_client: { auto: false } })).status, Z.direction.autorise('repondre_client').auto, (await fermer({ repondre_client: { auto: true } })).status, Z.direction.autorise('repondre_client').auto], [200, false, 200, true]);
    v('⛔ un collaborateur ne la change pas', (await Z.appeler('POST /api/monitor/agents/charte', { tourUser: Z.COLLAB, body: { gestes: { repondre_client: { auto: false } } } })).status, 403);
    v('⛔ ce qu’un serveur a DÉJÀ enregistré reste tel quel : une charte écrite « fermée » reste fermée au redémarrage', (() => {
      const Y = monter({ avant: D => fs.writeFileSync(path.join(D, 'agents-charte.json'), JSON.stringify({ repondre_client: { auto: false } })) });
      const x = Y.direction.autorise('repondre_client'); Y.nettoyer(); return x;
    })(), { auto: false, raison: 'brouillon' });
    v('⛔ les gestes qui engagent restent fermés : rembourser à 0 €, mise en demeure, changement de contrat et suppression de données ne s’ouvrent pas', [Z.direction.autorise('rembourser').auto, Z.direction.autorise('mise_en_demeure'), Z.direction.autorise('changer_contrat').auto, Z.direction.autorise('supprimer_donnees').auto], [false, { auto: false, raison: 'humain' }, false, false]);
    Z.nettoyer();
  }

  console.log('\n3. Léa et Camille en mode auto');
  {
    const Z = monter({ modes: { lea: 'auto', camille: 'auto' } });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'direct@client-2902.fr' });
    v('Léa : une inscription d’un compte PROUVÉ, contrôle bon : le courriel part SEUL', [r.voie, r.controle, Z.envoyes.length, Z.envoyes[0].a], ['direct', 'bon', 1, 'direct@client-2902.fr']);
    const nl = Z.recusJuge.length;
    vrai('…après UN rédacteur et UN juge', Z.recus.length === 1 && nl === 1, [Z.recus.length, nl]);
    vrai('…et Léa l’ANNONCE à l’équipe (groupe « Clients »), sans donnée personnelle', Z.paroles.some(p => p.de === 'lea' && p.fil === 'clients' && /répondu seule/.test(p.texte)) && !Z.paroles.some(p => /direct@|client-2902|Toka/.test(p.texte)), JSON.stringify(Z.paroles));

    const poser = (o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<a1@banc-2902>', de: 'prospect@exemple-2902.fr', pour: 'contact@teamop.fr', objet: 'Votre logiciel',
      texte: 'Bonjour, que proposez-vous pour une entreprise de climatisation ?', ts: Z.horloge.t - 3600000, auto: false, protege: false }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid: m.uid }; };
    let c = await Z.camille.surNouveauMessage(poser({ uid: 1, mid: '<na@x>' }));
    v('⛔ Camille : un courriel NON authentifié (rien ne le prouve) : un brouillon pour Justin, même en mode auto', [c.depose, c.voie, Z.envoyes.length], [true, 'validation', 1]);
    c = await Z.camille.surNouveauMessage(poser({ uid: 2, mid: '<ok@x>', authentifie: true, de: 'sur@exemple-2902.fr' }));
    v('Camille : le même courriel, authentifié par le serveur de réception : la réponse part SEULE', [c.voie, Z.envoyes.length, Z.envoyes[1].a, Z.envoyes[1].enReponseA.mid], ['direct', 2, 'sur@exemple-2902.fr', '<ok@x>']);
    vrai('…le destinataire est l’expéditeur de l’en-tête, la signature celle de Camille', /^Camille — Assistante virtuelle — Équipe TeamOP/.test(Z.envoyes[1].signature));
    for (const [nom, o] of [['une réponse d’absence (Auto-Submitted)', { enteteAuto: true }], ['une notification', { auto: true }], ['un avis de sécurité', { protege: true }]]) {
      const avant = Z.recus.length;
      c = await Z.camille.surNouveauMessage(poser(Object.assign({ uid: 10 + Math.floor(Math.random() * 1000), mid: '<auto' + Math.random() + '@x>', authentifie: true, de: 'robot@exemple-2902.fr' }, o)));
      v('⛔ ' + nom + ' : jamais de réponse, Claude n’est pas appelé (deux robots qui se répondent bouclent)', [c.saute, Z.recus.length], ['automatique', avant]);
    }
    Z.nettoyer();
  }

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
