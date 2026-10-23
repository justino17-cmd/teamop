/* ⛔ CE QUE CE FICHIER GARDE — LES SIX CORRECTIONS DE LA RELECTURE ADVERSE DE LÉA ET DE CAMILLE (23 octobre 2026).
     Une relecture adverse de `test-2862` à `test-2865` a rendu six constats « à corriger » et un mineur ; chacun est rejoué ici avec les VRAIS modules
     (`tests/banc-agents-courrier.js`), et le vrai serveur pour la couture d'`index.js`. Chaque garde a été vue TOMBER par une mutation (voir le rapport du commit).
       0. `refusDe` refuse un domaine nu (« bit.ly/3xYz », « paiement.example/pay ») et une promesse sans chiffre (« trois mois gratuits », « illimitée »,
          « sans engagement ») — sans refuser teamop.fr, « p.ex », une phrase ordinaire ;
       1. Léa n'est PLUS appelée par la route publique : douze inscriptions factices n'appellent ni Claude ni ne remplissent la file ; elle part de la
          première synchro d'un compte dont l'adresse est PROUVÉE ; trois préparations par heure et par adresse, trois réécritures par brouillon ;
       2. file pleine : pas d'appel payé pour rien, le journal le dit, l'inscription se REPREND (plafond du jour compris) au lieu de se perdre ;
       3. l'envoi en échec ne ferme pas la porte (brouillon « attente », nouvelle validation), et une adresse en échec définitif peut être préparée de nouveau ;
       4. le texte envoyé est celui que Justin a lu (empreinte), la Tour la renvoie, la décision dit le résultat RÉEL ;
       5. Camille : une lettre dans deux boîtes = un brouillon ; un expéditeur n'a que deux brouillons en attente ;
       6. le vrai serveur : la route publique n'appelle plus Léa, une liste de demandes qui oscille ne rappelle pas Claude sans fin.
     (Les pages juridiques sont gardées par `test-2867`, qui lit des fichiers de la racine que `main` ne sert pas encore ; la Tour, par `test-2865`.) */
'use strict';
const fs = require('fs'), path = require('path');
const RACINE = path.join(__dirname, '..');
const { monter, COURRIEL } = require('./banc-agents-courrier.js');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 400) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 400)); } };
const vrai = (t, c, d) => v(t + (d !== undefined && !c ? ' — ' + String(d).slice(0, 200) : ''), !!c, true);
const JOUR = 86400000, HEURE = 3600000;
setTimeout(() => { console.log('  ✗ banc FIGÉ au-delà de 170 s'); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }, 170000).unref();

const apercu = async (Z, ref) => (await Z.appeler('GET /api/monitor/agents/brouillons', { tourUser: Z.PATRON, query: { refs: ref } })).corps[ref];
/* accepter = lire l'aperçu, renvoyer SON empreinte (comme la Tour) ; `empreinte` imposée ou null (aucune) pour les cas d'abus */
const accepter = async (Z, id, empreinte) => {
  const body = { id, decision: 'accepter' };
  const vl = (await Z.validations()).find(x => x.id === id), fil = vl && vl.params && vl.params.fil;
  if (empreinte === undefined) { const b = fil ? await apercu(Z, fil) : null; if (b) body.empreinte = b.empreinte; } else if (empreinte !== null) body.empreinte = empreinte;
  return Z.appeler('POST /api/monitor/agents/validations/decider', { tourUser: Z.PATRON, body });
};
const refuser = (Z, id) => Z.appeler('POST /api/monitor/agents/validations/decider', { tourUser: Z.PATRON, body: { id, decision: 'refuser' } });
const msg = (Z, o) => { const m = Object.assign({ uid: 1, dossier: 'INBOX', boite: 'b-contact', mid: '<m@2866>', de: 'prospect@exemple-2866.fr', deNom: '', pour: 'contact@teamop.fr', objet: 'Question', texte: 'Que proposez-vous pour une entreprise de chauffage ?', ts: Z.horloge.t - 1000, auto: false, protege: false }, o); Z.messages[m.boite + '|' + m.dossier + '|' + m.uid] = m; return { boiteId: m.boite, dossier: m.dossier, uid: m.uid }; };

(async () => {
  console.log('\n── 2866 · Léa et Camille : les corrections de la relecture adverse ──');
  const K = require(path.join(RACINE, 'server', 'agents-connaissance.js'));
  const LEA = require(path.join(RACINE, 'server', 'agent-lea.js'));

  console.log('\n0. refusDe : un domaine nu et une promesse sans chiffre sont refusés');
  {
    const base = 'Bonjour,\n\nNous vous remercions pour votre inscription sur teamop.fr. OP GESTION sert votre activité, à partir de 15 € par mois et par utilisateur (TVA non applicable). Pouvez-vous préciser la taille de votre équipe ?\n\nBien cordialement,';
    const t = x => K.refusDe('TeamOP — OP GESTION', base + (x ? ' ' + x : ''));
    v('(population) le texte de référence passe', t(''), '');
    for (const [nom, x] of [['un domaine nu avec chemin', 'Réglez sur teamop-paiement.example/pay'], ['un raccourci', 'Voyez bit.ly/3xYz'], ['un domaine d’une lettre', 'Voyez x.com'], ['un faux teamop', 'Voyez faux-teamop.fr'], ['teamop.fr en sous-domaine d’un autre', 'Voyez teamop.fr.evil.com'], ['un domaine en majuscules', 'Voyez Paiement.Exemple.com']])
      v('⛔ ' + nom + ' : refusé', t(x), 'lien étranger');
    for (const [nom, x] of [['« trois mois gratuits »', 'Nous vous offrons trois mois gratuits.'], ['« formule illimitée »', 'Profitez de la formule illimitée.'], ['« sans engagement »', 'Le tout sans engagement.'], ['« garantie »', 'Satisfaction garantie.'], ['« remboursé »', 'Vous serez remboursé.'], ['une remise', 'Une remise de bienvenue.'], ['le mot en majuscules accentuées', 'ESSAI GRATUIT'], ['« à vie »', 'Accès à vie.']])
      v('⛔ ' + nom + ' : refusé', t(x), 'promesse commerciale');
    for (const [nom, x] of [['teamop.fr et un sous-domaine', 'Voyez teamop.fr/tarifs et app.teamop.fr.'], ['« p.ex » et « etc. »', 'Des outils (p.ex. un planning, etc.) vous aident.'], ['« notre offre »', 'Notre offre sur mesure vous plaira.'], ['un nom de fichier', 'Le fichier plan.pdf est joint.'], ['un nombre à virgule et une version', 'Version 2.102 en 1.5 jour.'], ['la période d’essai d’une semaine', 'Nous pourrons ensuite vous ouvrir une période d’essai d’une semaine.']])
      v('(contre-épreuve) ' + nom + ' : passe', t(x), '');
    vrai('(population) l’offre dit à Claude de ne pas employer ces mots (moins de refus inutiles)', /Tu n’écris jamais les mots « gratuit »/.test(K.OFFRE) && K.OFFRE.includes('teamop.fr'));
    vrai('…et la consigne elle-même passe sa propre vérification (elle n’est pas dans un courriel, mais ses mots ne sont pas ceux d’une promesse faite)', !K.refusDe('Objet de test', base + ' ' + K.OFFRE.split('\n').filter(l => /Tu n’écris jamais les mots/.test(l)).join('').replace(/gratuit|offert|remise|réduction|illimité|garanti|remboursé|sans engagement/g, 'x')));

    /* par Léa : un texte hostile ne devient jamais un brouillon */
    const Z = monter({ modes: { lea: 'brouillon' }, claude: () => COURRIEL.replace('Bien cordialement,', 'Réglez sur paiement-teamop.example/pay\n\nBien cordialement,') });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'hostile@client-2866.fr' });
    v('⛔ Léa : un texte avec un domaine nu est écarté (texte_refuse), ni brouillon ni validation', [r.saute, r.raison, (await Z.validations()).length, fs.existsSync(path.join(Z.D, 'agents-brouillons.json')) ? Object.keys(Z.fichierJson('agents-brouillons.json')).length : 0], ['texte_refuse', 'lien étranger', 0, 0]);
    Z.nettoyer();
  }

  console.log('\n1. Léa : trois préparations par heure et par adresse, trois réécritures par brouillon');
  {
    const Z = monter({ modes: { lea: 'brouillon' } });
    const ADR = 'cap@client-2866.fr';
    const d = n => Z.lea.surDemande({ email: ADR, entreprise: 'Cap Clim', metier: 'chauffage', users: n, formule: 'pro', besoin: 'besoin ' + n });
    const r0 = await Z.lea.surInscription({ entreprise: 'Cap Clim', email: ADR });
    vrai('(population) l’inscription dépose un brouillon', r0.depose === true, JSON.stringify(r0));
    const r1 = await d(2), r2 = await d(3), r3 = await d(4), r4 = await d(5);
    v('les deux premières demandes réécrivent le brouillon', [r1.reecrit, r2.reecrit], [true, true]);
    v('⛔ la troisième et la quatrième DANS L’HEURE : « plafond_adresse », Claude n’est pas rappelé', [r3.saute, r4.saute, Z.recus.length], ['plafond_adresse', 'plafond_adresse', 3]);
    vrai('…le refus est au journal (qui le lit sait pourquoi)', Z.journal().some(e => e.agent === 'lea' && e.resultat === 'refuse' && /plafond par adresse/.test(e.detail || '')));
    Z.horloge.t += HEURE + 1000;
    const r5 = await d(6);
    v('une heure plus tard, la réécriture passe (c’est la TROISIÈME du brouillon)', [r5.reecrit, Z.recus.length], [true, 4]);
    Z.horloge.t += HEURE + 1000;
    const r6 = await d(7);
    v('⛔ la quatrième réécriture du même brouillon : « trop_de_reecritures », Claude n’est pas rappelé', [r6.saute, Z.recus.length], ['trop_de_reecritures', 4]);
    v('le registre de Léa ne porte aucune adresse en clair', /cap@client-2866|client-2866/.test(fs.readFileSync(path.join(Z.D, 'agents-lea.json'), 'utf8')), false);
    Z.nettoyer();
  }

  console.log('\n2. Léa : la file de Justin pleine, le plafond du jour — l’inscription se REPREND au lieu de se perdre');
  {
    const Z = monter({ modes: { lea: 'brouillon' } });
    for (let i = 0; i < 20; i++) await Z.lea.surInscription({ entreprise: 'Société ' + i, email: 'f' + i + '@file-2866.fr' });
    v('(population) 20 brouillons, 20 validations en attente, 20 appels', [(await Z.validations()).filter(x => x.statut === 'en_attente').length, Z.recus.length], [20, 20]);
    Z.horloge.t += JOUR;   // le lendemain : le plafond du jour est remis à zéro, les validations (7 jours) attendent toujours
    const ADR = 'tardive@file-2866.fr';
    const rp = await Z.lea.surInscription({ entreprise: 'Tardive', email: ADR });
    v('⛔ file pleine : « file_pleine » AVANT d’appeler Claude (aucun appel payé pour un texte jeté)', [rp.saute, Z.recus.length], ['file_pleine', 20]);
    vrai('…le journal le DIT (réponse non préparée), il ne perd pas l’inscription en silence', Z.journal().some(e => e.agent === 'lea' && /file de validations pleine/.test(e.detail || '')));
    v('⛔ …l’inscription est à REPRENDRE (par empreinte), et le plafond du jour n’a rien consommé', [Z.lea.aRepriser(ADR), Z.fichierJson('agents-lea.json').jour.n, /tardive/.test(JSON.stringify(Z.fichierJson('agents-lea.json')))], [true, 0, false]);
    v('…une autre adresse n’est pas à reprendre', Z.lea.aRepriser('autre@file-2866.fr'), false);
    await refuser(Z, (await Z.validations()).find(x => x.statut === 'en_attente').id);
    const rq = await Z.lea.surInscription({ entreprise: 'Tardive', email: ADR });
    v('⛔ la file se libère : la reprise dépose le brouillon, la mémoire de reprise est effacée', [rq.depose, Z.lea.aRepriser(ADR), Z.recus.length], [true, false, 21]);
    Z.nettoyer();

    const J = monter({ modes: { lea: 'brouillon' } });
    for (let i = 0; i < 20; i++) { const r = await J.lea.surInscription({ entreprise: 'Jour ' + i, email: 'j' + i + '@jour-2866.fr' }); await refuser(J, (await J.validations()).find(x => x.params.fil === r.ref).id); }
    const rj = await J.lea.surInscription({ entreprise: 'Vingt-et-un', email: 'v21@jour-2866.fr' });
    v('⛔ plafond du jour (20) : « plafond_jour », l’inscription est à reprendre', [rj.saute, J.lea.aRepriser('v21@jour-2866.fr'), J.recus.length], ['plafond_jour', true, 20]);
    J.horloge.t += JOUR;
    const rk = await J.lea.surInscription({ entreprise: 'Vingt-et-un', email: 'v21@jour-2866.fr' });
    v('…le lendemain la reprise dépose le brouillon', [rk.depose, J.lea.aRepriser('v21@jour-2866.fr')], [true, false]);
    J.nettoyer();

    const F = monter({ modes: { lea: 'brouillon' }, claude: () => 'Je ne sais pas quoi écrire.' });
    const AF = 'forme@client-2866.fr';
    const a1 = await F.lea.surInscription({ entreprise: 'Forme Clim', email: AF }), b1 = F.lea.aRepriser(AF);
    const a2 = await F.lea.surInscription({ entreprise: 'Forme Clim', email: AF }), b2 = F.lea.aRepriser(AF);
    const a3 = await F.lea.surInscription({ entreprise: 'Forme Clim', email: AF }), b3 = F.lea.aRepriser(AF);
    v('⛔ une réponse de Claude sans « Objet : » se reprend deux fois, puis on abandonne (trois essais au plus)', [a1.saute, a2.saute, a3.saute, b1, b2, b3], ['forme', 'forme', 'forme', true, true, false]);
    F.nettoyer();
  }

  console.log('\n3. L’envoi en échec ne ferme pas la porte');
  {
    const E = monter({ modes: { lea: 'brouillon' }, panneEnvoi: true });
    const ADR = 'echec@client-2866.fr';
    const re = await E.lea.surInscription({ entreprise: 'Echec Clim', email: ADR });
    const a = await accepter(E, (await E.validations())[0].id);
    const b1 = E.fichierJson('agents-brouillons.json')[re.ref], v1 = await E.validations();
    v('⛔ l’envoi échoue : la décision est enregistrée (exécution « echec »), le brouillon revient « attente », UNE nouvelle validation attend', [a.corps.validation.execution, b1.etat, b1.echecs, v1.filter(x => x.statut === 'en_attente').length, /à renvoyer/.test(v1.find(x => x.statut === 'en_attente').resume)], ['echec', 'attente', 1, 1, true]);
    const rLea = await E.lea.surInscription({ entreprise: 'Echec Clim', email: ADR });
    v('…Léa ne prépare pas une seconde réponse tant que la première peut encore partir', [rLea.saute, E.recus.length], ['deja_repondu', 1]);
    await accepter(E, v1.find(x => x.statut === 'en_attente').id);
    await accepter(E, (await E.validations()).find(x => x.statut === 'en_attente').id);
    const bf = E.fichierJson('agents-brouillons.json')[re.ref];
    v('trois échecs : « echec » définitif, plus de validation ouverte', [bf.etat, bf.echecs, (await E.validations()).filter(x => x.statut === 'en_attente').length], ['echec', 3, 0]);
    const r2 = await E.lea.surInscription({ entreprise: 'Echec Clim', email: ADR });
    v('⛔ …et l’adresse dont la réponse n’est JAMAIS partie peut recevoir une nouvelle préparation (ce n’est plus « déjà répondu » pendant 30 jours)', [r2.depose, E.recus.length], [true, 2]);
    vrai('le registre de Léa pointe vers le NOUVEAU brouillon', E.fichierJson('agents-lea.json').adresses[Object.keys(E.fichierJson('agents-lea.json').adresses)[0]].ref === r2.ref);
    E.nettoyer();

    const S2 = monter({ modes: { lea: 'brouillon' } });
    const r3 = await S2.lea.surInscription({ entreprise: 'Envoyée Clim', email: 'envoyee@client-2866.fr' });
    await accepter(S2, (await S2.validations())[0].id);
    const r4 = await S2.lea.surInscription({ entreprise: 'Envoyée Clim', email: 'envoyee@client-2866.fr' });
    v('(contre-épreuve) une réponse ENVOYÉE : « deja_repondu », rien de nouveau', [r3.depose, S2.envoyes.length, r4.saute], [true, 1, 'deja_repondu']);
    S2.nettoyer();
  }

  console.log('\n4. Le texte qui part est celui que Justin a lu');
  {
    const MARQUE = 'MARQUE-B-2866';
    const Z = monter({ modes: { lea: 'brouillon' }, claude: (r, n) => (n === 1 ? COURRIEL : COURRIEL.replace('Nous avons bien noté votre activité.', 'Nous avons bien noté votre besoin (' + MARQUE + ').')) });
    const r = await Z.lea.surInscription({ entreprise: 'Toka Clim', email: 'lu@client-2866.fr' });
    const id = (await Z.validations())[0].id;
    const e1 = (await apercu(Z, r.ref)).empreinte;
    vrai('(population) l’aperçu porte une empreinte', /^[0-9a-f]{32}$/.test(e1), e1);
    const rw = await Z.lea.surDemande({ email: 'lu@client-2866.fr', entreprise: 'Toka Clim', metier: 'chauffage', users: 4, formule: 'pro', besoin: 'x' });
    vrai('(population) Léa réécrit le brouillon APRÈS que Justin l’a lu (même référence, une autre empreinte)', rw.reecrit === true && (await apercu(Z, r.ref)).empreinte !== e1 && (await apercu(Z, r.ref)).texte.includes(MARQUE));
    const a = await accepter(Z, id, e1);
    v('⛔ « Valider et envoyer » avec l’empreinte du texte LU : 409 « a changé », rien ne part, la validation reste EN ATTENTE', [a.status, /a changé/.test(a.corps.error), Z.envoyes.length, (await Z.validations())[0].statut], [409, true, 0, 'en_attente']);
    const b = await accepter(Z, id, null);
    v('⛔ sans aucune empreinte (un appel direct, une Tour d’avant) : 409 aussi', [b.status, Z.envoyes.length], [409, 0]);
    const c = await accepter(Z, id);
    v('avec l’empreinte à jour : 200, le texte envoyé est celui de l’aperçu relu', [c.status, c.corps.validation.execution, Z.envoyes.length, Z.envoyes[0].texte.includes(MARQUE)], [200, 'ok', 1, true]);

    const Y = monter({ modes: { lea: 'brouillon' } });
    const ry = await Y.lea.surInscription({ entreprise: 'Toka Clim', email: 'corrige@client-2866.fr' });
    const iy = (await Y.validations())[0].id, ey = (await apercu(Y, ry.ref)).empreinte;
    await Y.appeler('POST /api/monitor/agents/brouillons/modifier', { tourUser: Y.PATRON, body: { ref: ry.ref, objet: 'Objet corrigé', texte: 'Bonjour,\n\nTexte corrigé par un autre appareil.\n\nBien cordialement,' } });
    const ay = await accepter(Y, iy, ey);
    v('⛔ une CORRECTION faite ailleurs entre la lecture et le clic change aussi l’empreinte : 409, rien ne part', [ay.status, Y.envoyes.length], [409, 0]);
    const ay2 = await accepter(Y, iy);
    v('…relu, il part avec le texte corrigé', [ay2.status, Y.envoyes[0].texte.includes('corrigé par un autre appareil')], [200, true]);
    const rr = await Y.lea.surInscription({ entreprise: 'Autre', email: 'refus2@client-2866.fr' });
    const refus = await refuser(Y, (await Y.validations()).find(x => x.params.fil === rr.ref).id);
    v('(contre-épreuve) REFUSER n’exige aucune empreinte', [refus.status, refus.corps.validation.statut], [200, 'refuse']);
    Z.nettoyer(); Y.nettoyer();
  }

  console.log('\n5. Camille : une lettre dans deux boîtes = un brouillon ; un expéditeur n’a que deux brouillons en attente');
  {
    const Z = monter({ modes: { camille: 'brouillon' } });
    const e1 = msg(Z, { boite: 'b-contact', uid: 1, mid: '<double@2866>' }), e2 = msg(Z, { boite: 'b-support', uid: 1, mid: '<double@2866>', pour: 'support@teamop.fr' });
    const [x, y] = await Promise.all([Z.camille.surNouveauMessage(e1), Z.camille.surNouveauMessage(e2)]);
    v('⛔ le MÊME Message-ID reçu dans deux boîtes, annoncé en même temps : UN appel à Claude, UN brouillon, UNE validation', [[x, y].filter(r => r.depose).length, [x, y].filter(r => r.saute === 'deja_vu').length, Z.recus.length, (await Z.validations()).length], [1, 1, 1, 1]);
    const z = await Z.camille.surNouveauMessage(e2);
    v('…et plus tard, la même lettre est « deja_vu » (le registre la retient)', z.saute, 'deja_vu');
    Z.nettoyer();

    const W = monter({ modes: { camille: 'brouillon' } });
    const res = [];
    for (let i = 1; i <= 3; i++) res.push(await W.camille.surNouveauMessage(msg(W, { uid: i, mid: '<s' + i + '@2866>' })));
    v('⛔ trois mails du MÊME expéditeur : deux brouillons, le troisième « expediteur_deja_en_attente » sans appel à Claude', [res.map(r => r.depose || r.saute), W.recus.length], [[true, true, 'expediteur_deja_en_attente'], 2]);
    const autre = await W.camille.surNouveauMessage(msg(W, { uid: 4, mid: '<s4@2866>', de: 'autre@exemple-2866.fr' }));
    v('(contre-épreuve) un AUTRE expéditeur n’est pas gêné', autre.depose, true);
    await refuser(W, (await W.validations()).find(x => x.statut === 'en_attente' && x.params.fil && W.fichierJson('agents-brouillons.json')[x.params.fil].a === 'prospect@exemple-2866.fr').id);
    const apres = await W.camille.surNouveauMessage(msg(W, { uid: 5, mid: '<s5@2866>' }));
    v('…une place libérée par le refus de Justin, son mail suivant passe', apres.depose, true);
    W.nettoyer();
  }

  console.log('\n6. Le vrai serveur : la route publique n’appelle plus Léa, une liste de demandes qui oscille ne rappelle pas Claude sans fin');
  try { require(path.join(RACINE, 'server', 'node_modules', 'web-push')); require.resolve('imapflow', { paths: [path.join(RACINE, 'server')] }); }
  catch (e) { console.log('  … SAUTÉ : server/node_modules absent'); console.log('\n' + ok + ' ✓  ' + ko + ' ✗'); process.exit(ko ? 1 : 0); }
  const { demarrer, dormir } = require('./banc-serveur-courrier.js');
  /* le faux Claude rend un texte sans « Objet : » la PREMIÈRE fois qu'il voit « Rep Clim » (l'inscription à reprendre), puis le courriel */
  const S = await demarrer({ modes: { lea: 'brouillon' }, comptes: true, claude: "(r, n) => (/Rep Clim/.test(JSON.stringify(r)) && !globalThis.__rep ? (globalThis.__rep = 1, 'Je ne sais pas quoi écrire.') : " + JSON.stringify(COURRIEL) + ")" });
  vrai('le serveur démarre (portail des comptes allumé, faux Claude)', S.vivant);
  if (!S.vivant) { console.log(S.journal().slice(0, 800)); await S.fin(); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); }
  for (let k = 0; k < 6; k++) await S.public('/api/nouveau-compte', { email: 'anonyme' + k + '@exemple-2866.fr', prenom: 'A', nom: 'B', company: 'Factice ' + k });
  await dormir(2000);
  v('⛔ six inscriptions PUBLIQUES (sans preuve d’adresse) : aucun appel à Claude, aucune validation', [S.claudeRecus().length, ((await S.get('/api/monitor/agents/validations')).j.validations || []).length], [0, 0]);
  const ins = await S.inscrire('alt@exemple-2866.fr', 'Alt Clim');
  v('(population) un compte à adresse PROUVÉE : sa première synchro répond 200', ins.sync && ins.sync.s, 200);
  vrai('…et Léa prépare SON brouillon (une validation)', await S.attendre(async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).length === 1, 15000));
  const dem = { app: 'OP GESTION', formule: 'Pro', statut: 'en attente', date: 1, besoin: 'planning', users: '3', metier: 'chauffage' };
  for (let k = 0; k < 5; k++) { await S.http('POST', '/api/clients/sync', ins.jeton, { entreprise: 'Alt Clim', nom: 'Prénom Nom', demandes: [dem] }); await S.http('POST', '/api/clients/sync', ins.jeton, { entreprise: 'Alt Clim', nom: 'Prénom Nom', demandes: [] }); }
  await dormir(2500);
  v('⛔ cinq fois « une demande de plus » depuis le même compte vérifié : Claude n’est appelé que TROIS fois en tout (une inscription, deux réécritures)', S.claudeRecus().length, 3);
  v('…et il reste UNE validation', ((await S.get('/api/monitor/agents/validations')).j.validations || []).length, 1);

  const rep = await S.inscrire('rep@exemple-2866.fr', 'Rep Clim');
  await dormir(1500);
  const nbRep = async () => ((await S.get('/api/monitor/agents/validations')).j.validations || []).filter(x => /Rep Clim/.test(x.resume)).length;
  v('(population) la première préparation d\u2019une inscription échoue (Claude rend un texte sans « Objet : ») : aucune validation pour elle', [rep.sync && rep.sync.s, await nbRep()], [200, 0]);
  await S.http('POST', '/api/clients/sync', rep.jeton, { entreprise: 'Rep Clim', nom: 'Prénom Nom', demandes: [] });
  vrai('⛔ la synchro SUIVANTE du même compte REPREND l\u2019inscription (index.js appelle aRepriser) : le brouillon arrive', await S.attendre(async () => (await nbRep()) === 1, 10000));
  await S.http('POST', '/api/clients/sync', rep.jeton, { entreprise: 'Rep Clim', nom: 'Prénom Nom', demandes: [] });
  await dormir(1200);
  v('…et une troisième synchro n\u2019appelle plus Claude (la mémoire de reprise est effacée) : toujours UNE validation', await nbRep(), 1);
  await S.fin();

  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
