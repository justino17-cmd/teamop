/* ══ test-3272 — LES BOÎTES MAIL D'OP MESSAGES : LES PIÈCES SEULES (configuration, destinations, réglages, base) ═══════════════════════════════════════════════════════════════════════════
   · la configuration : un bloc `boitesMail` invalide REFUSE le démarrage, les secrets des applications ne se copient ni ne se sérialisent, l'adresse de retour se déduit de l'origine ;
   · ⛔ la porte de test (`OPMSG_TEST_BOITES`) est refusée en production ;
   · ⛔ les destinations : un serveur n'est joignable que s'il est PUBLIC (boucle, réseaux privés, lien local, métadonnées, IPv6 mappées : tous refusés), les ports sont ceux du courriel chiffré ;
   · les réglages des grands fournisseurs, et la convention pour un domaine inconnu ;
   · la base : migration 31 sur un schéma 30, tout est scellé et lié à `id|uid` (une ligne recopiée chez une autre personne ne s'ouvre pas), l'isolement par personne, le plafond de cinq boîtes,
     le remplacement d'une adresse reliée, l'effacement du compte, le registre des purges et sa restauration (une boîte déliée ne revient pas avec une sauvegarde d'avant).
   Code 0 si tout passe, 1 sinon. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
const { v, vrai, fin } = T.compteur();
T.sauterSiSansDependances();
const { boitesMailConfig, boitesMailTest } = require(path.join(T.SERVICE, 'config.js'));
const { creerBoitesMail, adressePublique, PRESETS } = require(path.join(T.SERVICE, 'boites-mail.js'));
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));

const lance = (f) => { try { f(); return 'aucune erreur'; } catch (e) { return e && e.code === 'CONFIG' ? 'CONFIG' : String(e && e.message).slice(0, 60); } };
const OK = { clientId: 'client-id-12345', clientSecret: 'secret-de-l-application-9' };

(async () => {
  console.log('\n1. La configuration');
  v('absente, ou « ouvert » autre que true : INERTE (null)', [boitesMailConfig({}, 'beta', null), boitesMailConfig({ boitesMail: { ouvert: 'oui' } }, 'beta', ['https://msg.teamop.fr']), boitesMailConfig({ boitesMail: { ouvert: false } }, 'beta', null)], [null, null, null]);
  const c1 = boitesMailConfig({ boitesMail: { ouvert: true, oauth: { google: OK } } }, 'prod', ['https://msg.teamop.fr']);
  v('ouvert : l\'adresse de retour se déduit de la PREMIÈRE origine du service', [c1.ouvert, c1.redirection, Object.keys(c1.oauth)], [true, 'https://msg.teamop.fr/api/boites-mail/oauth/retour', ['google']]);
  v('⛔ le secret de l\'application se LIT mais ne se sérialise ni ne se copie', [c1.oauth.google.clientSecret, JSON.stringify(c1).includes(OK.clientSecret), JSON.stringify(Object.assign({}, c1.oauth.google)).includes(OK.clientSecret)], [OK.clientSecret, false, false]);
  const mauvais = [
    [{ boitesMail: [] }, 'prod'], [{ boitesMail: { ouvert: true, inconnu: 1 } }, 'prod'], [{ boitesMail: { ouvert: true } }, 'prod', null],
    [{ boitesMail: { ouvert: true, redirection: 'https://x.test/autre' } }, 'prod'], [{ boitesMail: { ouvert: true, redirection: 'http://msg.teamop.fr/api/boites-mail/oauth/retour' } }, 'prod'],
    [{ boitesMail: { ouvert: true, oauth: { yahoo: OK } } }, 'prod'], [{ boitesMail: { ouvert: true, oauth: { google: { clientId: 'court' } } } }, 'prod'],
    [{ boitesMail: { ouvert: true, oauth: { google: { clientId: 'id avec espace', clientSecret: 'secret-ok-123456' } } } }, 'prod'], [{ boitesMail: { ouvert: true, oauth: 'x' } }, 'prod'],
  ];
  v('un bloc invalide REFUSE le démarrage : pas un objet, clé inconnue, pas d\'adresse de retour, adresse de retour étrangère ou en clair en production, fournisseur inconnu, identifiant ou secret mal formés',
    mauvais.map(([c, i, o]) => lance(() => boitesMailConfig(c, i, o === undefined ? ['https://msg.teamop.fr'] : o))), mauvais.map(() => 'CONFIG'));
  v('   en bêta, le http n\'est permis que sur 127.0.0.1', [lance(() => boitesMailConfig({ boitesMail: { ouvert: true } }, 'beta', ['http://127.0.0.1:8091'])), lance(() => boitesMailConfig({ boitesMail: { ouvert: true } }, 'beta', ['http://msg-beta.teamop.fr']))], ['aucune erreur', 'CONFIG']);
  v('⛔ la porte de test : absente = rien ; en production = refusée ; mal formée ou visant autre chose que 127.0.0.1 = refusée',
    [boitesMailTest({}, 'prod'), lance(() => boitesMailTest({ OPMSG_TEST_BOITES: '{"boucle":true}' }, 'prod')), lance(() => boitesMailTest({ OPMSG_TEST_BOITES: 'pas du json' }, 'beta')),
      lance(() => boitesMailTest({ OPMSG_TEST_BOITES: '{"oauth":{"google":"https://accounts.google.com"}}' }, 'beta')), lance(() => boitesMailTest({ OPMSG_TEST_BOITES: '{"serveurs":{"imap":{"hote":"10.0.0.1","port":993},"smtp":{"hote":"127.0.0.1","port":25}}}' }, 'beta')),
      boitesMailTest({ OPMSG_TEST_BOITES: '{"boucle":true,"serveurs":{"imap":{"hote":"127.0.0.1","port":9993},"smtp":{"hote":"127.0.0.1","port":2525}}}' }, 'beta').boucle,
      lance(() => boitesMailTest({ OPMSG_TEST_BOITES: '{"boucle":true}' }, 'beta'))], [null, 'CONFIG', 'CONFIG', 'CONFIG', 'CONFIG', true, 'CONFIG']);
  v('⛔ B9 : la boucle locale exige des serveurs DÉSIGNÉS — « boucle » seul (n\'importe quel hôte saisi joindrait le réseau interne) refuse de démarrer', lance(() => boitesMailTest({ OPMSG_TEST_BOITES: '{"boucle":true,"delaiMs":500}' }, 'beta')), 'CONFIG');

  console.log('\n2. Les destinations : un serveur qu\'on nous donne est une destination');
  const publiques = ['8.8.8.8', '1.1.1.1', '142.250.74.5', '2606:4700:4700::1111', '172.15.0.1', '172.32.0.1', '100.63.0.1', '100.128.0.1', '2000::1', '2a00:1450:4001:81b::200e', '0:0:0:0:0:0:0:0'.replace(/^0/, '2606')];
  const interdites = ['127.0.0.1', '127.1.2.3', '10.0.0.5', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '198.18.0.1', '224.0.0.1', '255.255.255.255', '192.0.0.8',
    '::1', '::', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', '2001:db8::1', 'pas-une-ip', '',
    /* ⛔ B1 (gardien, 6 novembre 2026) : ce que la première liste laissait passer — et les plages de documentation */
    '::7f00:1', '::127.0.0.1', 'fec0::1', '2002::1', '2002:7f00:1::1', '0:0:0:0:0:ffff:7f00:1', '0:0:0:0:0:0:7f00:1', '0:0:0:0:0:0:0:1', '2001::1', '2001:db8:ffff::1', '64:ff9b::7f00:1', '100::1',
    '192.0.2.1', '198.51.100.7', '203.0.113.9', '012.0.0.1', '010.0.0.1', '127.1', '2130706433', '0x7f.0.0.1', '1.2.3', '256.1.1.1', '8.8.8.8 ', '169.254.0.1', '192.0.0.9'];
  v('adressePublique : le routage public passe', publiques.map(adressePublique), publiques.map(() => true));
  v('⛔ boucle, privé, lien local (métadonnées du nuage), multicast, partagé, IPv6 locale ou mappée : refusés', interdites.map(adressePublique), interdites.map(() => false));
  const quotas = { essai: () => ({ ok: true }) };
  const stockageVide = {};
  const M = creerBoitesMail({ config: { boitesMail: { ouvert: true }, origines: ['https://msg.teamop.fr'] }, stockage: stockageVide, quotas, journaliser: () => {}, oauth: null, crochet: null });
  const refus = async (h) => { try { await M._resoudre(h); return 'passe'; } catch (e) { return e.code; } };
  v('⛔ un nom qui se résout vers la boucle ou un IP privé n\'est PAS joignable ; une IP littérale non plus ; l\'IPv6 littérale et les noms invalides non plus',
    [await refus('localhost'), await refus('127.0.0.1'), await refus('169.254.169.254'), await refus('10.1.2.3'), await refus('[::1]'), await refus('::1'), await refus('a b'), await refus('-mauvais.test'), await refus('')],
    ['serveur_refuse', 'serveur_refuse', 'serveur_refuse', 'serveur_refuse', 'serveur_invalide', 'serveur_invalide', 'serveur_invalide', 'serveur_invalide', 'serveur_invalide']);
  const res = await M._resoudre('8.8.8.8');
  v('   une IP publique passe, et c\'est ELLE qu\'on vise (une seule résolution, le nom reste le nom TLS)', res, { ip: '8.8.8.8', nom: '8.8.8.8' });
  const R = (adresse, saisis) => { try { return M._reglagesPour(adresse, saisis); } catch (e) { return e.code; } };
  v('les ports sont ceux du courriel chiffré : 993 en réception, 465 ou 587 à l\'envoi — jamais 143, 110, 25, 22, 6379',
    [R('a@exemple.fr', { imapPort: 143 }), R('a@exemple.fr', { imapPort: 22 }), R('a@exemple.fr', { smtpPort: 25 }), R('a@exemple.fr', { smtpPort: 6379 }), R('a@exemple.fr', { imapPort: 993, smtpPort: 587 }).smtp.port],
    ['port_refuse', 'port_refuse', 'port_refuse', 'port_refuse', 587]);
  v('un nom de serveur saisi avec un chemin, un port collé, un espace ou une IPv6 : refusé', [R('a@exemple.fr', { imap: 'imap.exemple.fr/x' }), R('a@exemple.fr', { imap: 'imap.exemple.fr:993' }), R('a@exemple.fr', { smtp: 'smtp exemple.fr' }), R('a@exemple.fr', { imap: '::1' })],
    ['serveur_invalide', 'serveur_invalide', 'serveur_invalide', 'serveur_invalide']);

  console.log('\n3. Les réglages des grands fournisseurs');
  const att = [['a@gmail.com', 'google', 'imap.gmail.com', 'smtp.gmail.com', 465], ['a@googlemail.com', 'google', 'imap.gmail.com', 'smtp.gmail.com', 465], ['a@outlook.fr', 'microsoft', 'outlook.office365.com', 'smtp.office365.com', 587],
    ['a@hotmail.com', 'microsoft', 'outlook.office365.com', 'smtp.office365.com', 587], ['a@live.fr', 'microsoft', 'outlook.office365.com', 'smtp.office365.com', 587], ['a@yahoo.fr', 'imap', 'imap.mail.yahoo.com', 'smtp.mail.yahoo.com', 465],
    ['a@icloud.com', 'imap', 'imap.mail.me.com', 'smtp.mail.me.com', 587], ['a@orange.fr', 'imap', 'imap.orange.fr', 'smtp.orange.fr', 465], ['a@free.fr', 'imap', 'imap.free.fr', 'smtp.free.fr', 465],
    ['a@sfr.fr', 'imap', 'imap.sfr.fr', 'smtp.sfr.fr', 465], ['a@laposte.net', 'imap', 'imap.laposte.net', 'smtp.laposte.net', 465],
    ['a@societe-inconnue.fr', 'imap', 'imap.societe-inconnue.fr', 'smtp.societe-inconnue.fr', 465]];
  v('chaque fournisseur : voie d\'autorisation ou mot de passe, serveurs de réception et d\'envoi ; un domaine inconnu suit la convention imap./smtp.',
    att.map(([a]) => { const r = R(a); return [r.fournisseur, r.imap.hote, r.smtp.hote, r.smtp.port]; }), att.map(([, f, i, s, p]) => [f, i, s, p]));
  v('   tout est en 993 en réception', att.map(([a]) => R(a).imap.port), att.map(() => 993));
  vrai('   la table est une liste de domaines (population : ' + PRESETS.length + ' fournisseurs)', PRESETS.length >= 10);

  console.log('\n4. La base : la migration 31 sur un schéma 30');
  const racine = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-3272-'));
  const chemin = path.join(racine, 'msg.db'), kek = crypto.randomBytes(32);
  const horloge = { t: Date.now() };
  const brut = (c) => new (require('node:sqlite').DatabaseSync)(c || chemin);
  const lire = (sql, ...a) => { const d = brut(); try { return d.prepare(sql).all(...a); } finally { d.close(); } };
  try {
    const anciennes = MIGRATIONS.filter(m => m.v <= 30);
    const S0 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => horloge.t, migrations: anciennes });
    const mk = (S, n) => S.personneCreer({ identifiant: 'beta:' + n + crypto.randomBytes(2).toString('hex'), prenom: n, nom: 'Banc', origine: 'beta', verifie: true });
    const ana = mk(S0, 'Ana'), ben = mk(S0, 'Ben');
    v('population : la dernière migration est la 31, une base d\'avant n\'a pas la table', [MIGRATIONS[MIGRATIONS.length - 1].v, lire(`SELECT name FROM sqlite_master WHERE name = 'boite_mail'`).length, S0.boitesMailDe(ana.id)], [31, 0, []]);
    v('   (le code d\'après, sur une base d\'avant : aucune boîte, aucun plantage, un refus de créer qui n\'écrit rien)', S0.boiteMailCreer(ana.id, 'imap', { adresse: 'a@x.fr', secret: 's' }), null);
    S0.fermer();
    const S = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => horloge.t });
    v('la migration s\'applique : version 31, la table, ses deux index (et la clé primaire)', [lire('PRAGMA user_version')[0].user_version, lire(`SELECT name FROM sqlite_master WHERE tbl_name = 'boite_mail'`).map(r => r.name).sort()], [31, ['boite_mail', 'boite_mail_adresse', 'boite_mail_uid', 'sqlite_autoindex_boite_mail_1']]);
    const D = (a, s) => ({ adresse: a, nom: a.split('@')[0], imap: { hote: 'imap.x.fr', port: 993 }, smtp: { hote: 'smtp.x.fr', port: 465 }, secret: s });
    const c1 = S.boiteMailCreer(ana.id, 'imap', D('ana@x.fr', 'SECRET-ANA-QWXZ'));
    const c2 = S.boiteMailCreer(ben.id, 'google', D('ben@x.fr', 'SECRET-BEN-QWXZ'));
    v('deux personnes, une boîte chacune', [S.boitesMailDe(ana.id).map(b => b.adresse), S.boitesMailDe(ben.id).map(b => b.adresse), S.boitesMailCompter()], [['ana@x.fr'], ['ben@x.fr'], 2]);
    v('⛔ la vue d\'une liste ne porte ni serveur ni secret', Object.keys(S.boitesMailDe(ana.id)[0]).sort(), ['adresse', 'cree', 'etat', 'fournisseur', 'id', 'nom']);
    v('⛔ ISOLEMENT : lire la boîte d\'une autre personne rend null (comme une boîte inexistante)', [S.boiteMailLire(ben.id, c1.id), S.boiteMailLire(ana.id, c2.id), S.boiteMailLire(ana.id, 'bm_' + '0'.repeat(32)), S.boiteMailLire(ana.id, null)], [null, null, null, null]);
    v('   et on ne délie ni ne modifie celle d\'une autre', [S.boiteMailSupprimer(ben.id, c1.id), S.boiteMailEtat(ben.id, c1.id, 'a_reconnecter'), S.boiteMailSecretMaj(ben.id, c1.id, 'VOLE'), S.boiteMailLire(ana.id, c1.id).secret], [false, false, false, 'SECRET-ANA-QWXZ']);
    const r1 = S.boiteMailLire(ana.id, c1.id);
    v('le propriétaire relit tout (adresse, serveurs, secret) — c\'est le service seul qui le fait', [r1.adresse, r1.imap, r1.secret, r1.fournisseur], ['ana@x.fr', { hote: 'imap.x.fr', port: 993 }, 'SECRET-ANA-QWXZ', 'imap']);
    const fichier = fs.readFileSync(chemin);
    v('⛔ ni le secret ni l\'adresse en clair dans le fichier', [fichier.includes('SECRET-ANA-QWXZ'), fichier.includes('ana@x.fr'), fichier.includes('imap.x.fr')], [false, false, false]);
    const remplace = S.boiteMailCreer(ana.id, 'imap', D('ANA@X.FR', 'NOUVEAU-QWXZ'));
    v('la même adresse (majuscules comprises) REMPLACE : même identifiant, nouveau secret, état ok', [remplace.id === c1.id, remplace.remplacee, S.boiteMailLire(ana.id, c1.id).secret, S.boitesMailDe(ana.id).length], [true, true, 'NOUVEAU-QWXZ', 1]);
    S.boiteMailEtat(ana.id, c1.id, 'a_reconnecter');
    v('l\'état « à reconnecter » se pose, et se lève en reconnectant', [S.boitesMailDe(ana.id)[0].etat, (S.boiteMailCreer(ana.id, 'google', D('ana@x.fr', 'T')), S.boitesMailDe(ana.id)[0].etat)], ['a_reconnecter', 'ok']);
    v('un état inconnu est refusé', S.boiteMailEtat(ana.id, c1.id, 'autre'), false);
    S.boiteMailSecretMaj(ana.id, c1.id, 'ROTATION-QWXZ');
    v('le jeton de renouvellement tourné remplace l\'ancien', S.boiteMailLire(ana.id, c1.id).secret, 'ROTATION-QWXZ');
    for (let i = 0; i < 4; i++) S.boiteMailCreer(ana.id, 'imap', D('ana' + i + '@x.fr', 's'));
    let sixieme; try { S.boiteMailCreer(ana.id, 'imap', D('ana9@x.fr', 's')); sixieme = 'créée'; } catch (e) { sixieme = e.code; }
    v('⛔ cinq boîtes par personne : la sixième est refusée (trop_de_boites), la liste n\'a pas bougé', [sixieme, S.boitesMailDe(ana.id).length], ['trop_de_boites', 5]);
    /* une ligne recopiée chez une autre personne ne s'ouvre pas (données associées `id|uid`) */
    {
      const d = brut(); try { d.exec('PRAGMA busy_timeout = 2000'); d.prepare('UPDATE boite_mail SET uid = ? WHERE id = ?').run(ben.id, c1.id); } finally { d.close(); }
      v('⛔ UNE LIGNE DÉPLACÉE chez une autre personne ne s\'ouvre PLUS (le chiffré est lié à `id|uid`) : illisible, comptée, jamais rendue', [S.boiteMailLire(ben.id, c1.id), S.boitesMailDe(ben.id).map(b => b.adresse), S.illisibles() >= 1], [null, ['ben@x.fr'], true]);
      const d2 = brut(); try { d2.exec('PRAGMA busy_timeout = 2000'); d2.prepare('UPDATE boite_mail SET uid = ? WHERE id = ?').run(ana.id, c1.id); } finally { d2.close(); }
    }
    console.log('\n5. Délier, effacer, restaurer');
    horloge.t += 1000;
    const avantDelier = path.join(racine, 'archive-avant.db');
    S.instantane ? S.instantane(avantDelier) : null;
    vrai('population : une archive d\'AVANT la déliaison existe', fs.existsSync(avantDelier));
    horloge.t += 1000;
    v('délier : la ligne part, l\'identifiant entre au registre des purges (genre boite_mail)', [S.boiteMailSupprimer(ana.id, c1.id), S.boiteMailLire(ana.id, c1.id), lire(`SELECT objet FROM purge WHERE genre = 'boite_mail'`).map(r => r.objet)], [true, null, [c1.id]]);
    const registre = ouvrir.copie.purgeLire(chemin);
    const bilan = ouvrir.copie.rejouerPurge(avantDelier, registre);
    const dA = brut(avantDelier);
    const dansArchive = dA.prepare('SELECT COUNT(*) AS n FROM boite_mail WHERE id = ?').get(c1.id).n; dA.close();
    v('⛔ RESTAURER une archive d\'avant : le registre rejoué retire la boîte déliée (elle ne se relie pas toute seule)', [Number(dansArchive), bilan.boitesMailRetirees], [0, 1]);
    vrai('   et le genre est DÉCLARÉ dans le registre des genres rejoués par la copie', ouvrir.copie.GENRES_PURGE.boite_mail === 'copie');
    vrai('   la table est comptée par la sauvegarde (TABLES_COMPTEES)', ouvrir.copie.TABLES_COMPTEES.includes('boite_mail'));
    const nAna = S.boitesMailDe(ana.id).length;
    const eff = S.compteEffacer(ana.id, { rejeu: true });
    v('⛔ effacer le compte emporte ses boîtes (secrets compris), et rien de celles des autres', [nAna > 0, S.boitesMailDe(ana.id), lire('SELECT COUNT(*) AS n FROM boite_mail WHERE uid = ?', ana.id)[0].n, S.boitesMailDe(ben.id).length, eff.effacee], [true, [], 0, 1, true]);
    vrai('   les identifiants des boîtes effacées sont au registre (une restauration ne les ramène pas)', lire(`SELECT COUNT(*) AS n FROM purge WHERE genre = 'boite_mail'`)[0].n >= nAna);
    S.fermer();
  } finally { try { fs.rmSync(racine, { recursive: true, force: true }); } catch (e) {} }
  fin();
})().catch(e => { console.log('  ✗ MORT', e && e.stack || e); process.exit(1); });
