/* ⛔ CE QUE CE FICHIER GARDE — LE MODULE DE L'ESPACE DE TEST (`server/essais.js`, 23 octobre 2026) ET LA FORME DU CODE QUI LE BRANCHE.

   Justin : « toute modification, site, application, la Tour, je veux des espaces de test, et après on pousse ». Le serveur de test est le MÊME `index.js` lancé avec
   `config.espaceTest === true` ; `essais.js` est tout ce qu'il a de plus. Ici, le MODULE, dépendances injectées, et le vrai `nodemailer` ; `test-2981` (sans `espaceTest`) et
   `test-2982` (avec) jouent le VRAI serveur, `test-2983` le plafond des agents, `test-2984` la remise à zéro.

     1. la clé : 64 hexadécimaux, comparée à temps constant, jamais acceptée mal formée (de part et d'autre) ;
     2. le DÉPÔT des courriels : rangés du plus récent au plus ancien, 200 au plus, écriture par temporaire puis renommage, les liens du site réécrits vers l'origine de test
        (jamais un nom qui n'est que PRÉFIXÉ par teamop.fr), les pièces jointes réduites à leur nom, un message sans destinataire REFUSÉ comme nodemailer le ferait ;
     3. le REMPLACEMENT de `createTransport` sur le VRAI nodemailer : un transport SMTP ne se connecte à personne (un faux facteur compte ses connexions : zéro), mais
        `streamTransport` et `jsonTransport` — qui ne touchent jamais au réseau, la Messagerie en tire sa copie « Envoyés » — passent tels quels ;
     4. le DÉMARRAGE : la marque ne se pose que sur un dossier VIERGE, la production (`/opt/teamop/data`) est refusée nommément, un lien symbolique n'est jamais suivi, la
        remise à zéro vide le dossier SAUF la marque ;
     5. le SEMIS, avec un faux serveur : il joue les routes dans l'ordre, ne laisse aucun mot de passe dans le code, ne se dit « fait » que si tout a réussi ;
     6. la FORME du code qui branche : chaque `createTransport` du serveur est une propriété de `nodemailer` (donc interceptable), aucune autre bibliothèque d'envoi, aucune
        connexion réseau brute, les deux ajouts à `comptes.js` ne sont appelés que par `essais.js`, `espaceTest` ne se lit que par `=== true`.
   Un motif vise du CODE (commentaires retirés), jamais une phrase. */
const fs = require('fs'), os = require('os'), path = require('path'), net = require('net');
const RACINE = path.join(__dirname, '..');
const { dormir, facteur } = require('./banc-essais');
let ok = 0, ko = 0;
const v = (t, a, b) => { if (JSON.stringify(a) === JSON.stringify(b)) { ok++; console.log('  ✓ ' + t); } else { ko++; console.log('  ✗ ' + t + '\n      attendu : ' + String(JSON.stringify(b)).slice(0, 300) + '\n      obtenu  : ' + String(JSON.stringify(a)).slice(0, 300)); } };
const vrai = (t, c) => v(t, !!c, true);
/* ⛔ seuls les blocs qui COMMENCENT une ligne (CLAUDE.md : le motif naïf avale du vrai code — ici 3 des 7 appels de createTransport d'index.js) */
const sans = (s) => s.replace(/^[ \t]*\/\*[\s\S]*?\*\//gm, ' ').replace(/^[ \t]*\/\/.*$/gm, ' ');
const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'b2980-'));
process.on('exit', () => { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} });
const neuf = (nom) => { const d = path.join(tmp, nom); fs.mkdirSync(d, { recursive: true }); return d; };

(async () => {
  console.log('\n── test-2980 : le module de l\'espace de test ──');
  const E = require(path.join(RACINE, 'server', 'essais.js'));
  const CLE = 'ab'.repeat(32);

  console.log('\n1. La clé');
  v('la bonne clé passe', E.cleOk(CLE, CLE), true);
  v('une autre clé de même forme est refusée', E.cleOk(CLE, 'cd'.repeat(32)), false);
  v('une clé qui ne diffère que par le dernier caractère est refusée', E.cleOk(CLE, CLE.slice(0, 63) + 'c'), false);
  v('absente, vide, ou autre qu\'un texte : refusée', [E.cleOk(CLE, undefined), E.cleOk(CLE, ''), E.cleOk(CLE, null), E.cleOk(CLE, 42), E.cleOk(CLE, [CLE])], [false, false, false, false, false]);
  v('⛔ une clé ATTENDUE mal formée (trop courte, majuscules, vide, absente) n\'ouvre rien — même présentée à l\'identique',
    ['abc', CLE.toUpperCase(), '', undefined, 'g'.repeat(64)].map(a => E.cleOk(a, a)), [false, false, false, false, false]);
  const SRC = sans(lire('server/essais.js'));
  vrai('la comparaison est à TEMPS CONSTANT (`timingSafeEqual` dans le code, sur deux condensés de même longueur)', /crypto\.timingSafeEqual\(sha\(attendue\), sha\(/.test(SRC));

  console.log('\n2. Le dépôt des courriels');
  const d1 = neuf('depot'), t0 = Date.parse('2026-10-23T10:00:00Z');
  let horloge = t0;
  const dep = E.depot({ dossier: d1, origine: 'https://test.teamop.fr/', maintenant: () => horloge });
  const info = await dep.capter({ from: '"TEAM OP" <a@exemple-essai.fr>', to: 'client@exemple-essai.fr', subject: 'Confirmez votre adresse',
    text: 'Bonjour,\nConfirmez : https://teamop.fr/reinit.html?mode=verifyEmail&jeton=abc123.\nSite : https://www.teamop.fr/ et https://api.teamop.fr/api/x et http://teamop.fr/e/climessai\nPas le nôtre : https://teamop.fr.exemple.com/x et https://xteamop.fr/y\nContact : contact@teamop.fr',
    html: '<p><a href="https://teamop.fr/reinit.html?mode=resetPassword&amp;jeton=zzz">Réinitialiser</a></p>' });
  v('l\'envoi répond comme un envoi réussi (accepté, rien de refusé, un identifiant)', [info.accepted, info.rejected, /^<e[0-9a-f]+@essai\.invalid>$/.test(info.messageId), info.captee], [['client@exemple-essai.fr'], [], true, true]);
  const l1 = dep.liste();
  v('un courriel rangé', l1.length, 1);
  const c1 = l1[0];
  v('de, à, objet, date', [c1.de, c1.a, c1.objet, c1.date], ['"TEAM OP" <a@exemple-essai.fr>', ['client@exemple-essai.fr'], 'Confirmez votre adresse', '2026-10-23T10:00:00.000Z']);
  v('⛔ les liens du site (teamop.fr, www, api, même en http) pointent vers l\'ORIGINE DE TEST (la barre finale du réglage ne double pas)',
    [c1.texte.includes('https://test.teamop.fr/reinit.html?mode=verifyEmail&jeton=abc123.'), c1.texte.includes('Site : https://test.teamop.fr/ et https://test.teamop.fr/api/x et https://test.teamop.fr/e/climessai'), c1.texte.includes('//test.teamop.fr//')], [true, true, false]);
  v('⛔ …mais pas un nom qui n\'est que PRÉFIXÉ par teamop.fr, ni une adresse de courriel', [c1.texte.includes('https://teamop.fr.exemple.com/x'), c1.texte.includes('https://xteamop.fr/y'), c1.texte.includes('contact@teamop.fr')], [true, true, true]);
  v('le html est réécrit aussi', c1.html.includes('https://test.teamop.fr/reinit.html?mode=resetPassword&amp;jeton=zzz'), true);
  v('les liens sont extraits (texte ET html), sans la ponctuation finale ni doublon, tous vers le test', c1.liens.filter(u => /^https:\/\/test\.teamop\.fr/.test(u)).includes('https://test.teamop.fr/reinit.html?mode=verifyEmail&jeton=abc123') && c1.liens.includes('https://test.teamop.fr/reinit.html?mode=resetPassword&jeton=zzz'), true);
  v('   (population) il y en a plus d\'un, et aucun doublon', [c1.liens.length > 2, new Set(c1.liens).size === c1.liens.length], [true, true]);

  const destinataires = [[{ name: 'Léa Essai', address: 'lea@exemple-essai.fr' }, 'paul@exemple-essai.fr, "Dupont, Jean" <jd@exemple-essai.fr>'], 'x'];
  await dep.capter({ from: 'a@exemple-essai.fr', to: destinataires[0], cc: 'cc@exemple-essai.fr', bcc: ['cci@exemple-essai.fr'], subject: 's', text: 't',
    attachments: [{ filename: 'devis.pdf', content: 'QUJD'.repeat(100), encoding: 'base64' }] });
  const c2 = dep.liste()[0];
  v('à : un objet {name, address}, une liste, une chaîne à plusieurs adresses (la virgule d\'un nom entre guillemets ne coupe pas)',
    c2.a, ['Léa Essai <lea@exemple-essai.fr>', 'paul@exemple-essai.fr', '"Dupont, Jean" <jd@exemple-essai.fr>']);
  v('cc et cci conservés', [c2.cc, c2.bcc], [['cc@exemple-essai.fr'], ['cci@exemple-essai.fr']]);
  v('⛔ une pièce jointe se réduit à son NOM (jamais son contenu)', [c2.pieces, JSON.stringify(c2).includes('QUJD')], [[{ nom: 'devis.pdf' }], false]);
  v('du plus récent au plus ancien', dep.liste().map(c => c.objet), ['s', 'Confirmez votre adresse']);

  const refus = await dep.capter({ from: 'a@exemple-essai.fr', subject: 'sans destinataire', text: 'x' }).then(() => 'accepté', e => e.code);
  v('⛔ un message SANS destinataire est refusé (comme nodemailer le ferait) : un bug d\'appelant ne passe pas pour un succès', refus, 'ENODEST');
  v('…et un appel sans objet de message aussi', await dep.capter(null).then(() => 'accepté', e => e.code), 'EMESSAGE');
  v('…et rien n\'a été rangé pour eux', dep.nombre(), 2);

  const gros = await dep.capter({ from: 'a@exemple-essai.fr', to: 'g@exemple-essai.fr', subject: 'g', text: 'x'.repeat(500000), html: 'y'.repeat(500000) }).then(() => dep.liste()[0], () => null);
  v('un texte démesuré est borné à 200 000 caractères', [gros && gros.texte.length, gros && gros.html.length], [200000, 200000]);

  for (let i = 0; i < 210; i++) { horloge += 1000; await dep.capter({ from: 'a@exemple-essai.fr', to: 'n' + i + '@exemple-essai.fr', subject: 'n' + i, text: 't' }); }
  v('⛔ 200 courriels au plus, et ce sont les PLUS RÉCENTS', [dep.nombre(), dep.liste()[0].objet, dep.liste()[199].objet], [200, 'n209', 'n10']);
  v('l\'écriture est par temporaire puis renommage : aucun `.tmp` ne traîne, le fichier se relit', [fs.existsSync(dep.chemin + '.tmp'), JSON.parse(fs.readFileSync(dep.chemin, 'utf8')).length], [false, 200]);
  const dep2 = E.depot({ dossier: d1, origine: 'https://test.teamop.fr' });
  v('un redémarrage retrouve les courriels', [dep2.nombre(), dep2.liste()[0].objet], [200, 'n209']);
  const dep3 = E.depot({ dossier: path.join(tmp, 'absent', 'sous', 'dossier'), origine: 'https://test.teamop.fr' });
  v('un dossier qui n\'existe pas encore est créé à la première capture', await dep3.capter({ from: 'a@x.fr', to: 'b@x.fr', subject: 's', text: 't' }).then(() => dep3.nombre(), e => e.code), 1);
  const fichierEnTravers = path.join(tmp, 'fichier-pas-dossier'); fs.writeFileSync(fichierEnTravers, 'x');
  const dep4 = E.depot({ dossier: path.join(fichierEnTravers, 'sous'), origine: 'https://test.teamop.fr' });
  v('⛔ un disque qui refuse l\'écriture REJETTE l\'envoi (jamais un faux « envoyé »), et rien ne reste en mémoire', [await dep4.capter({ from: 'a@x.fr', to: 'b@x.fr', subject: 's', text: 't' }).then(() => 'accepté', e => e.code), dep4.nombre()], ['EDISQUE', 0]);
  const tr = dep.transport();
  const viaRappel = await new Promise(res => tr.sendMail({ from: 'a@x.fr', to: 'b@x.fr', subject: 'rappel', text: 't' }, (e, i) => res([e, i && i.captee])));
  v('le transport accepte aussi le style à rappel, `verify` et `close`', [viaRappel, await tr.verify(), typeof tr.close], [[null, true], true, 'function']);

  console.log('\n3. Le vrai nodemailer');
  let nodemailer;
  try { nodemailer = require(path.join(RACINE, 'server', 'node_modules', 'nodemailer')); }
  catch (e) { console.log('  … SAUTÉE (parties 3 et suivantes exécutées) : server/node_modules absent'); nodemailer = null; }
  if (nodemailer) {
    const orig = nodemailer.createTransport;
    const fac = facteur(); await new Promise(r => fac.s.listen(0, '127.0.0.1', r)); const portFac = fac.s.address().port;
    const d3 = neuf('nodemailer'), dp = E.depot({ dossier: d3, origine: 'https://test.teamop.fr' });
    // témoin : AVANT le remplacement, le même appel se connecte bel et bien au facteur — sinon « zéro connexion » ne prouverait rien
    const t0m = nodemailer.createTransport({ host: '127.0.0.1', port: portFac, secure: false, auth: { user: 'u', pass: 'p' } });
    await t0m.sendMail({ from: 'a@exemple-essai.fr', to: 'b@exemple-essai.fr', subject: 'témoin', text: 'x' });
    v('(témoin) avant le remplacement, un envoi atteint le facteur : une connexion, un message', [fac.connexions(), fac.recus.length], [1, 1]);
    vrai('le remplacement se fait', E.patcherNodemailer(nodemailer, dp));
    v('…une seule fois (le second appel ne double pas)', [E.patcherNodemailer(nodemailer, dp), nodemailer.createTransport.original === orig], [false, true]);
    const t1 = nodemailer.createTransport({ host: '127.0.0.1', port: portFac, secure: false, auth: { user: 'u', pass: 'p' } });
    const r1 = await t1.sendMail({ from: 'a@exemple-essai.fr', to: 'client@exemple-essai.fr', subject: 'après', text: 'x' });
    v('⛔ APRÈS : le même envoi ne se connecte à PERSONNE (le compteur du facteur n\'a pas bougé) et il est rangé', [fac.connexions(), fac.recus.length, r1.captee, dp.nombre(), dp.liste()[0].objet], [1, 1, true, 1, 'après']);
    const t2 = nodemailer.createTransport({ host: '127.0.0.1', port: portFac, secure: true, auth: { user: 'u', pass: 'p' }, connectionTimeout: 9000, greetingTimeout: 9000 });
    await t2.sendMail({ from: 'a@exemple-essai.fr', to: 'b@exemple-essai.fr', subject: 'tls', text: 'x' });
    v('…en TLS et avec délais aussi', [fac.connexions(), dp.nombre()], [1, 2]);
    v('`verify()` (la Tour teste une boîte) ne se connecte à personne non plus', [await t2.verify(), fac.connexions()], [true, 1]);
    const flux = nodemailer.createTransport({ streamTransport: true, buffer: true, newline: 'windows' });
    const info = await flux.sendMail({ from: 'a@exemple-essai.fr', to: 'b@exemple-essai.fr', subject: 'copie envoyes', text: 'corps' });
    v('⛔ `streamTransport` PASSE tel quel : il fabrique le message brut (la copie « Envoyés » de la Messagerie), et ne range rien', [Buffer.isBuffer(info.message), info.message.toString().includes('Subject: copie envoyes'), dp.nombre()], [true, true, 2]);
    const json = await nodemailer.createTransport({ jsonTransport: true }).sendMail({ from: 'a@exemple-essai.fr', to: 'b@exemple-essai.fr', subject: 'json', text: 'corps' });
    v('…`jsonTransport` aussi', [typeof json.message, dp.nombre()], ['string', 2]);
    nodemailer.createTransport = orig;
    v('(le banc rend le vrai transport à son processus)', nodemailer.createTransport === orig, true);
    try { E.patcherNodemailer({}, dp); v('un nodemailer illisible ne se laisse pas « patcher » en silence', 'accepté', 'refusé'); } catch (e) { v('⛔ un nodemailer illisible REFUSE (le serveur ne démarre pas : on ne garantit pas ce qu\'on ne peut pas intercepter)', true, true); }
    fac.s.close();
  }

  v('le plafond du mois des agents de test : le réglage s\'il est un nombre positif, sinon 10 $ (jamais « pas de plafond »)',
    [10, 25, 0.5, 0, -3, NaN, '10', Infinity, null, undefined, 500].map(x => E.plafondAgents(x)), [10, 25, 0.5, 10, 10, 10, 10, 10, 10, 10, 500]);

  console.log('\n4. Le démarrage : la marque et la remise à zéro');
  const dv = neuf('vierge');
  v('un dossier VIERGE reçoit la marque et devient sûr', [E.demarrage({ dossier: dv }).sur, E.demarrage({ dossier: dv }).neuf, fs.existsSync(path.join(dv, E.MARQUE))], [true, undefined, true]);
  const dn = neuf('non-vierge'); fs.writeFileSync(path.join(dn, 'espaces.json'), '{"clientreel":{}}');
  v('⛔ un dossier qui contient DÉJÀ quelque chose ne reçoit JAMAIS la marque (la production, par une erreur de réglage)', [E.demarrage({ dossier: dn }), fs.existsSync(path.join(dn, E.MARQUE))], [{ sur: false, raison: 'dossier_non_vierge' }, false]);
  fs.writeFileSync(path.join(dn, E.DEMANDE_RAZ), '1');
  E.demarrage({ dossier: dn });
  v('⛔ …et même une demande de remise à zéro y est ignorée : rien n\'est effacé', fs.existsSync(path.join(dn, 'espaces.json')), true);
  v('⛔ /opt/teamop/data est refusé NOMMÉMENT, et la racine ou un dossier trop haut aussi',
    ['/opt/teamop/data', '/opt/teamop/data/', '/opt/teamop', '/', '/tmp'].map(d => E.demarrage({ dossier: d }).raison), ['dossier_interdit', 'dossier_interdit', 'dossier_interdit', 'dossier_interdit', 'dossier_interdit']);
  v('un dossier qui n\'existe pas : illisible, rien n\'est créé', [E.demarrage({ dossier: path.join(tmp, 'nexistepas') }).raison, fs.existsSync(path.join(tmp, 'nexistepas'))], ['dossier_illisible', false]);

  const dr = neuf('remise'); const dehors = neuf('dehors'); fs.writeFileSync(path.join(dehors, 'temoin.txt'), 'à moi');
  E.demarrage({ dossier: dr });
  fs.writeFileSync(path.join(dr, 'espaces.json'), '{}'); fs.mkdirSync(path.join(dr, 'documents', 'sous'), { recursive: true }); fs.writeFileSync(path.join(dr, 'documents', 'sous', 'f.json'), '{}');
  fs.writeFileSync(path.join(dr, '.cache-cache'), 'x');
  fs.symlinkSync(dehors, path.join(dr, 'lien-vers-dehors')); fs.symlinkSync(path.join(dehors, 'temoin.txt'), path.join(dr, 'lien-vers-fichier'));
  fs.writeFileSync(path.join(dr, E.DEMANDE_RAZ), '1');
  const etat = E.demarrage({ dossier: dr });
  v('la remise à zéro vide TOUT le dossier — fichiers, sous-dossiers, fichiers cachés — sauf la marque', [etat.sur, etat.remise, fs.readdirSync(dr)], [true, true, [E.MARQUE]]);
  v('⛔ un lien symbolique est RETIRÉ, jamais suivi : le dossier et le fichier visés (hors de TEAMOP_DATA) sont intacts', [fs.readdirSync(dehors), fs.readFileSync(path.join(dehors, 'temoin.txt'), 'utf8')], [['temoin.txt'], 'à moi']);
  v('…et la demande est consommée : le démarrage suivant ne revide pas', [E.demarrage({ dossier: dr }).remise, fs.readdirSync(dr)], [false, [E.MARQUE]]);
  const dl = neuf('marque-lien'); fs.writeFileSync(path.join(dehors, 'marque'), 'x'); fs.symlinkSync(path.join(dehors, 'marque'), path.join(dl, E.MARQUE)); fs.writeFileSync(path.join(dl, E.DEMANDE_RAZ), '1'); fs.writeFileSync(path.join(dl, 'precieux.json'), '{}');
  v('⛔ une marque qui est un LIEN n\'est pas une marque : rien n\'est vidé', [E.demarrage({ dossier: dl }).raison, fs.existsSync(path.join(dl, 'precieux.json'))], ['marque_invalide', true]);

  console.log('\n5. Le semis, avec un faux serveur');
  const ds = neuf('semis'), appels = [], mots = [];
  const faux = {
    dossier: ds, journal: () => {},
    appeler: async (m, p, o) => { appels.push({ m, p, jeton: o.jeton, corps: o.corps }); return { code: 200, json: { ok: true } }; },
    comptes: { semer: async (x) => { mots.push(x); return true; }, sessionNeuve: (mail) => 'S' + mail.split('@')[0] },
    tour: { semer: (l) => { mots.push(...l); }, session: (nom) => ({ token: 'T' + nom.split(' ')[0] }) },
    refs: { conseil: (m) => ['planning', m], cats: ['a', 'b'] }, agents: ['lea', 'camille', 'victor'],
  };
  const r = await E.semis(faux).semer();
  v('le semis réussit sans erreur', [r.deja, r.erreurs], [false, []]);
  const routes = appels.map(a => a.m + ' ' + a.p);
  v('il joue les VRAIES routes, dans l\'ordre : dossier et fiche du client, espace, métier, rubriques, abonnement, fiche, demande traitée, puis le prospect, puis les heures de travail des agents (24 h sur 24), puis les agents',
    routes, ['POST /api/portail/demande', 'POST /api/clients/sync', 'POST /api/monitor/espaces', 'POST /api/monitor/espaces/metier', 'POST /api/monitor/espaces/cats', 'POST /api/monitor/espaces/abonnement',
      'POST /api/monitor/clients/metier', 'POST /api/monitor/clients/demande', 'POST /api/portail/demande', 'POST /api/clients/sync', 'POST /api/monitor/agents/horaires', 'POST /api/monitor/agents/mode', 'POST /api/monitor/agents/mode', 'POST /api/monitor/agents/mode']);
  v('le client : session du portail pour sa fiche, jeton du patron pour la Tour', [appels[0].jeton, appels[1].jeton, appels[2].jeton, appels[8].jeton], ['Sclient', 'Sclient', 'TPatron', 'Sprospect']);
  const ab = appels.find(a => /abonnement$/.test(a.p)).corps;
  v('Clim Essai : formule Pro, 3 places, en essai, fin dans ~30 jours', [ab.formule, ab.quantite, ab.statut, Math.abs(Math.round((Date.parse(ab.fin) - Date.now()) / 86400000) - 30) <= 1], ['pro', 3, 'essai', true]);
  const esp = appels.find(a => a.p === '/api/monitor/espaces').corps, code = JSON.parse(Buffer.from(esp.code, 'base64').toString('utf8'));
  v('le code de l\'espace porte un identifiant, une clé de 24 signes et l\'adresse fictive ; l\'adresse du client est celle du compte semé', [/^climessai-[a-z0-9]{4}$/.test(code.t), code.k.length, code.e, esp.email, esp.nom], [true, 24, 'client@exemple-essai.fr', 'client@exemple-essai.fr', 'Clim Essai']);
  const dp1 = appels[8].corps, dp2 = appels.find(a => a.p === '/api/clients/sync' && a.jeton === 'Sprospect').corps;
  v('le prospect : une demande EN ATTENTE (statut nouveau) pour la plomberie, rubriques choisies, aucune application ouverte', [dp1.demandes[0].statut, dp1.demandes[0].metier, dp1.demandes[0].cats, dp2.apps], ['nouveau', 'plomberie', ['planning', 'plomberie'], []]);
  v('les agents sont mis en Brouillon, chacun', appels.filter(a => /agents\/mode/.test(a.p)).map(a => a.corps), [{ agent: 'lea', mode: 'brouillon' }, { agent: 'camille', mode: 'brouillon' }, { agent: 'victor', mode: 'brouillon' }]);
  v('les comptes fictifs (domaine exemple-essai.fr) : deux du site, vérifiés par le module, deux de la Tour, mot de passe tiré au hasard', [mots.map(m => m.email), mots.every(m => /exemple-essai\.fr$/.test(m.email)), mots.filter(m => m.empreinte).every(m => /^[0-9a-f]{64}$/.test(m.empreinte)), mots.filter(m => m.mdp).every(m => /^[0-9a-f]{24}$/.test(m.mdp))],
    [['patron@exemple-essai.fr', 'collaborateur@exemple-essai.fr', 'client@exemple-essai.fr', 'prospect@exemple-essai.fr'], true, true, true]);
  v('le drapeau du semis est posé', JSON.parse(fs.readFileSync(path.join(ds, E.F_SEMIS), 'utf8')).ok, true);
  const nb = appels.length;
  v('⛔ rejoué (redémarrage), il ne refait RIEN', [(await E.semis(faux).semer()).deja, appels.length], [true, nb]);

  const dh = neuf('semis-echec'), appelsE = [];
  const echec = Object.assign({}, faux, { dossier: dh, appeler: async (m, p, o) => { appelsE.push(p); return /abonnement$/.test(p) ? { code: 409, json: { error: 'x' } } : { code: 200, json: {} }; } });
  const re = await E.semis(echec).semer();
  v('⛔ une route qui refuse : le semis le DIT (l\'étape et le code) et ne pose PAS son drapeau — le démarrage suivant recommence', [re.erreurs.length, /abonnement du client → 409/.test(re.erreurs[0]), fs.existsSync(path.join(dh, E.F_SEMIS))], [1, true, false]);
  const sansSession = await E.semis(Object.assign({}, faux, { dossier: neuf('sans-session'), comptes: { semer: async () => true, sessionNeuve: () => '' } })).semer();
  v('⛔ sans session de portail : erreur nommée, aucun appel parti', [sansSession.erreurs, appels.length], [['session du portail impossible'], nb]);
  const sansPatron = await E.semis(Object.assign({}, faux, { dossier: neuf('sans-patron'), tour: { semer: () => {}, session: () => null } })).semer();
  v('…et sans session de patron aussi', sansPatron.erreurs, ['la Tour : pas de session de patron']);
  const dnet = neuf('semis-reseau');
  const sansReseau = await E.semis(Object.assign({}, faux, { dossier: dnet, appeler: async () => null })).semer();
  v('un serveur qui ne répond pas est une erreur nommée, pas une exception', [sansReseau.erreurs.length > 0, /sans réponse/.test(sansReseau.erreurs[0])], [true, true]);
  vrai('aucun secret ni mot de passe écrit dans le module : pas une suite de 24 hexadécimaux ou plus, pas un `sk_`, pas un `password:` en dur', !/[0-9a-f]{24}/i.test(SRC.replace(/\b[a-f0-9]{8}-/g, '')) && !/\bsk[-_](test|live|ant)/.test(SRC) && !/pass(word)?\s*:\s*['"][^'"]{4,}['"]/.test(SRC));

  console.log('\n6. La forme du code qui branche');
  const fichiers = fs.readdirSync(path.join(RACINE, 'server')).filter(f => f.endsWith('.js') && !/^test-/.test(f));   // (test-acces.js, test-connexion.js : des outils de banc, jamais lancés par le serveur)
  const code2 = {}; for (const f of fichiers) code2[f] = sans(lire('server/' + f));
  const avec = (re) => fichiers.filter(f => f !== 'essais.js' && re.test(code2[f])).sort();
  v('(population) le serveur compte plus de 30 fichiers .js', fichiers.length > 30, true);
  v('⛔ `require(\'nodemailer\')` : index.js et mail.js SEULEMENT (plus essais.js qui le remplace) — une 3e porte d\'envoi serait un chemin non vu', avec(/require\(['"]nodemailer['"]\)/), ['index.js', 'mail.js']);
  v('⛔ chaque `createTransport` est une PROPRIÉTÉ de `nodemailer.` (interceptable) : jamais déstructuré, jamais gardé dans une variable',
    fichiers.filter(f => f !== 'essais.js').map(f => (code2[f].match(/createTransport/g) || []).length - (code2[f].match(/nodemailer\.createTransport\(/g) || []).length), fichiers.filter(f => f !== 'essais.js').map(() => 0));
  vrai('(population) il y a bien des createTransport à intercepter (index.js : 7, mail.js : 4)', [(code2['index.js'].match(/nodemailer\.createTransport\(/g) || []).length, (code2['mail.js'].match(/nodemailer\.createTransport\(/g) || []).length].join() === '7,4');
  const pk = JSON.parse(lire('server/package.json'));
  v('⛔ aucune autre bibliothèque d\'envoi dans les dépendances', Object.keys(pk.dependencies || {}).filter(d => /mail|smtp|sendgrid|postmark|mailgun|resend|brevo|sendinblue|ses\b/i.test(d) && !['nodemailer', 'imapflow', 'mailparser'].includes(d)), []);
  v('⛔ aucune connexion réseau BRUTE (net, tls, http2) dans le serveur : un envoi à la main contournerait nodemailer', avec(/require\(['"](net|tls|http2|dgram)['"]\)/), []);
  v('⛔ aucun appel `fetch` vers un service d\'envoi de courriels', avec(/fetch\([^)]*(sendgrid|mailgun|postmarkapp|api\.resend|brevo|sendinblue|amazonaws\.com\/.*ses|smtp2go|mailjet)/i), []);
  const IDX = code2['index.js'];
  v('⛔ `comptes.semer` et `comptes.sessionNeuve` ne sont JAMAIS appelés par index.js (seul `essais.js` les appelle, sur l\'objet qu\'on lui passe)', [/comptes\.semer\(|comptes\.sessionNeuve\(/.test(IDX), /ctx\.comptes\.semer\(/.test(code2['essais.js']), /ctx\.comptes\.sessionNeuve\(/.test(code2['essais.js'])], [false, true, true]);
  v('⛔ `espaceTest` ne se lit que par `=== true` : « oui », 1 ou "true" ne le lèvent pas', [(IDX.match(/config\.espaceTest\b/g) || []).length, (IDX.match(/config\.espaceTest === true/g) || []).length], [1, 1]);
  v('les réglages de test ne sont lus qu\'APRÈS ce drapeau, jamais seuls : `courrielsCaptes`, `espaceTestOrigine`, `plafondMoisTotal` (derrière `ESSAI`)',
    [/\bESSAI \? \(\/\^https/.test(IDX), /plafondTotalUsd: ESSAI \? essaisMod\.plafondAgents\(config\.agents && config\.agents\.plafondMoisTotal\)/.test(IDX), (IDX.match(/config\.courrielsCaptes/g) || []).length], [true, true, 1]);
  vrai('l\'origine de test n\'entre dans le CORS que derrière `ESSAI`', /\.concat\(ESSAI \? \[ESSAI_ORIGINE\] : \[\]\)/.test(IDX));
  vrai('le transport de capture remplace `mailer` derrière `ESSAI` (et l\'envoi réel reste la branche `else`)', /if \(ESSAI\) \{[\s\S]{0,900}mailer = essaiCourriels\.transport\(\);\s*\} else if \(config\.smtp && config\.smtp\.host\) \{/.test(IDX));
  vrai('les trois routes ne se montent que derrière `ESSAI` ET une clé bien formée', /if \(ESSAI\) \{\s*if \(essaisMod\.cleBienFormee\(config\.espaceTestCle\)\) \{\s*essaisMod\.monter\(app,/.test(IDX));
  vrai('et elles se montent AVANT le 404 final', IDX.indexOf('essaisMod.monter(app,') > 0 && IDX.indexOf('essaisMod.monter(app,') < IDX.indexOf("res.status(404).type('text/plain').send('introuvable')"));
  console.log('\n' + ok + ' ✓  ' + ko + ' ✗');
  process.exit(ko ? 1 : 0);
})().catch(e => { console.log('  ✗ le banc a levé : ' + (e && e.stack || e)); console.log('\n' + ok + ' ✓  ' + (ko + 1) + ' ✗'); process.exit(1); });
