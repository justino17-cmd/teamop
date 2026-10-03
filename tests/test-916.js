/* ⛔ CE QUE CE FICHIER GARDE — LA GARDE DES SMS ET LA MIGRATION DU TÉLÉPHONE, MODULES SEULS (famille 2 de SERVEUR.md § 3.11).

   `server-msg/sms-garde.js` et `server-msg/stockage.js` montés eux-mêmes, clé, horloge et fichier injectés : ce que le HTTP de
   `test-915` ne peut pas jouer parce que ça demande des SEMAINES d'historique.

     · L'EMBALLEMENT se juge sur l'HISTORIQUE : un pays qui envoie 20 SMS par heure d'habitude n'est pas « emballé » à 50 ; un pays qui
       en envoie 2 d'habitude l'est à 11 (×5 sa moyenne) — et sans historique (moins d'un jour), seul le PLANCHER décide ;
     · LE DÉFI (preuve de travail) : signé et lié au numéro et au pays, délai tenu, validité bornée, usage unique, mémoire bornée ;
     · LA CONFIGURATION `sms.*` est VALIDÉE au démarrage : un budget négatif, des identifiants à moitié posés, une base d'OVH étrangère en
       production REFUSENT le démarrage plutôt que de tourner de travers ;
     · LA MIGRATION 2 : reconstruit `personne` (SQLite ne change pas un CHECK en place) sans perdre une ligne, garde une copie, et le
       compte par numéro entre.

   ⛔ UNE ASSERTION SUR UN ENSEMBLE VIDE PASSE ET NE PROUVE RIEN : chaque verdict est précédé de la population qu'il aurait pu manquer. */
const fs = require('fs'), os = require('os'), path = require('path'), crypto = require('crypto');
const T = require('./outils-msg');
T.sauterSiSansDependances();
const { v, vrai, fin } = T.compteur();
const { ouvrir, MIGRATIONS } = require(path.join(T.SERVICE, 'stockage.js'));
const { creerScelleur } = require(path.join(T.SERVICE, 'scelle.js'));
const G = require(path.join(T.SERVICE, 'sms-garde.js'));
const { DatabaseSync } = require('node:sqlite');

const HEURE = 3600000, JOUR = 86400000;
const bac = fs.mkdtempSync(path.join(os.tmpdir(), 'banc-916-'));
let n = 0;
/* `brut` : la configuration TELLE QUELLE (les défauts de production : bouclier à 40 % de l'argent, réserve du marché d'origine). Sans lui, les parcours de budget et d'emballement
   mesurent leur propre règle SEULE : ni le bouclier de l'argent ni la réserve ne s'en mêlent. */
function neuf(cfgSms, instance, brut, fetchImpl) {
  const chemin = path.join(bac, 'msg-' + (++n) + '.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
  const scelleur = creerScelleur(kek);
  const S = ouvrir({ chemin, scelleur, horloge: () => h.t });
  const journal = [];
  const c0 = cfgSms || {};
  const cfg = G.lireConfigSms(brut ? c0 : Object.assign({ reserve: { part: 0 } }, c0, { emballement: Object.assign({ partBudget: 1 }, c0.emballement) }), instance || 'beta');
  const garde = G.creerGarde(Object.assign({ cfg, instance: instance || 'beta', stockage: S, scelleur, horloge: () => h.t, journaliser: (e, c) => journal.push([e, c]) }, fetchImpl ? { fetchImpl } : {}));
  return { S, h, garde, cfg, journal, chemin, kek, scelleur };
}
const lance = (f) => { try { f(); return null; } catch (e) { return e.code + ' ' + e.message; } };
/* Seme `parHeure` SMS par heure pour un pays, sur `jours` jours qui finissent AVANT la dernière heure (l'historique « d'avant »). */
function semer(a, pays, parHeure, jours) {
  const fin0 = a.h.t;
  for (let k = jours * 24; k >= 2; k--) { a.h.t = fin0 - k * HEURE; for (let i = 0; i < parHeure; i++) a.S.smsReserver({ pays, cout: 100000 }); }
  a.h.t = fin0;
}
/* Envoie `m` SMS de plus dans la DERNIÈRE heure. */
function recents(a, pays, m) { for (let i = 0; i < m; i++) { a.h.t += 1000; a.S.smsReserver({ pays, cout: 100000 }); } }

console.log('\n── 916 · L\'EMBALLEMENT se juge sur l\'historique du pays (×5 sa moyenne, avec un plancher) ──');
{
  const a = neuf({ emballement: { plancher: 5, facteur: 5 } });
  semer(a, 'BE', 2, 7);
  const histo = a.S.smsSommes(0, 'BE').n;
  vrai('la population : 7 jours à 2 SMS par heure = ' + histo + ' lignes d\'historique', histo >= 300);
  recents(a, 'BE', 8);
  v('⛔ moyenne 2/h, huit SMS dans l\'heure : le neuvième (8+1 ≤ 10) n\'est pas un emballement', a.garde.bouclierDe('BE'), null);
  recents(a, 'BE', 2);
  v('⛔ dix SMS dans l\'heure (×5 la moyenne) : le onzième est un EMBALLEMENT → bouclier automatique', a.garde.bouclierDe('BE'), { motif: 'auto' });
  v('   le bouclier est durable (une ligne en base, jusqu\'à une date) — il survit à l\'arrêt de l\'envoi qu\'il a provoqué', [a.S.smsBoucliers().map(b => b.pays), a.S.smsBoucliers()[0].motif], [['BE'], 'auto']);
  v('   et l\'événement est journalisé avec le PAYS seulement', a.journal.filter(j => j[0] === 'sms_bouclier'), [['sms_bouclier', { motif: 'auto', pays: 'BE' }]]);
  v('⛔ un autre pays n\'est pas touché', a.garde.bouclierDe('FR'), null);
  a.h.t += 7 * HEURE;
  v('le bouclier tombe après `bouclierMs` (6 h) si l\'emballement a cessé', [a.garde.bouclierDe('BE'), a.S.smsBoucliers().length], [null, 0]);
  a.S.fermer();
}
{
  const a = neuf({ emballement: { plancher: 30, facteur: 5 } });
  semer(a, 'IN', 20, 7);
  vrai('la population : ' + a.S.smsSommes(0, 'IN').n + ' lignes (un pays gros : 20 par heure d\'habitude)', a.S.smsSommes(0, 'IN').n >= 3000);
  recents(a, 'IN', 50);
  v('⛔ un pays qui envoie 20 SMS/h d\'habitude n\'est pas emballé à 50 (le plancher de 30 est dépassé, mais 5 × 20 = 100 ne l\'est pas)', a.garde.bouclierDe('IN'), null);
  recents(a, 'IN', 60);
  v('   et il l\'est à 110', a.garde.bouclierDe('IN'), { motif: 'auto' });
  a.S.fermer();
}
{
  const a = neuf({ emballement: { plancher: 12, facteur: 5 } });
  recents(a, 'BE', 11);
  v('sans historique (moins d\'un jour) : seul le PLANCHER décide — onze SMS, le douzième passe', a.garde.bouclierDe('BE'), null);
  recents(a, 'BE', 1);
  v('⛔ douze SMS : le treizième dépasse le plancher → bouclier', a.garde.bouclierDe('BE'), { motif: 'auto' });
  a.S.fermer();
}
{
  const a = neuf({ emballement: { plancher: 5, facteur: 5 } });
  /* Les lignes REFUSÉES par OVH ne comptent pas (rien n'est parti) : elles ne déclenchent pas un bouclier. */
  for (let i = 0; i < 20; i++) { const id = a.S.smsReserver({ pays: 'BE', cout: 100000 }); a.S.smsRegler(id, { etat: 'refuse', cout: 0 }); }
  v('vingt envois REFUSÉS net par OVH ne comptent pas comme un emballement', [a.S.smsSommes(0, 'BE').n, a.garde.bouclierDe('BE')], [0, null]);
  a.S.fermer();
}

console.log('\n── 916 · le BUDGET : la somme se fait sur le journal durable, en micro-euros entiers ──');
{
  const a = neuf({ budgetJour: 1, budgetHeure: 1, budgetPaysJour: 1, budgetPaysHeure: 1 });
  const r = [];
  for (let i = 0; i < 14; i++) { const x = a.garde.reserver({ pays: 'FR', cc: '33' }); r.push(x.ok); }
  v('un SMS français coûte 0,075 € : treize passent sous 1 € ; le quatorzième (0,975 + 0,075 > 1) est refusé', [r.filter(Boolean).length, r[13], a.garde.reserver({ pays: 'FR', cc: '33' }).motif], [13, false, 'budget_jour']);
  vrai('⛔ aucune dérive de virgule : la somme exacte est 975 000 micro-euros', a.S.smsSommes(0).cout === 975000);
  v('chaque motif porte son nom : l\'heure, puis le pays', (() => { const b = neuf({ budgetJour: 50, budgetHeure: 0.05, budgetPaysJour: 50, budgetPaysHeure: 50 }); const m1 = b.garde.reserver({ pays: 'FR', cc: '33' }).motif; const c = neuf({ budgetJour: 50, budgetHeure: 50, budgetPaysJour: 0.05, budgetPaysHeure: 50 }); const m2 = c.garde.reserver({ pays: 'FR', cc: '33' }).motif; const d = neuf({ budgetJour: 50, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 0.05 }); const m3 = d.garde.reserver({ pays: 'FR', cc: '33' }).motif; return [m1, m2, m3]; })(), ['budget_heure', 'budget_pays_jour', 'budget_pays_heure']);
  a.h.t += 24 * HEURE + 1;
  v('la fenêtre glisse : 24 h plus tard, le budget est libre', a.garde.reserver({ pays: 'FR', cc: '33' }).ok, true);
  a.S.fermer();
}
{
  /* Deux réservations SIMULTANÉES ne franchissent pas le budget ensemble : la réservation est UNE transaction. */
  const a = neuf({ budgetJour: 0.1, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 });
  const rs = [a.garde.reserver({ pays: 'FR', cc: '33' }), a.garde.reserver({ pays: 'FR', cc: '33' }), a.garde.reserver({ pays: 'FR', cc: '33' })];
  v('⛔ budget de 0,10 € à 0,075 € le SMS : UN seul passe (la somme est relue DANS la transaction qui réserve)', rs.map(x => x.ok), [true, false, false]);
  a.S.fermer();
}
{
  /* `sante()` ne donne que des nombres et des motifs. */
  const a = neuf({ budgetJour: 2 });
  a.garde.reserver({ pays: 'FR', cc: '33' }); a.garde.refuser('numero_non_mobile'); a.garde.refuser('numero_non_mobile'); a.garde.refuser('reseau_plafond');
  const s = a.garde.sante();
  v('⛔ /health : le mode, des nombres et des refus par motif — rien d\'autre', Object.keys(s).sort(), ['boucliers', 'budgetHeurePct', 'budgetJourPct', 'coutJourEur', 'envoyes24h', 'mode', 'ovhEchecs', 'refus']);
  v('   les refus du jour par motif', s.refus, { numero_non_mobile: 2, reseau_plafond: 1 });
  v('   le budget du jour : 0,075 € sur 2 € = 4 %', [s.coutJourEur, s.budgetJourPct], [0.08, 4]);
  a.h.t += 25 * HEURE;
  v('les refus de plus de 24 h sortent du compte (et la mémoire est bornée)', a.garde.sante().refus, {});
  v('mode : « journal » en bêta sans identifiants, « inactif » en production sans identifiants, « ovh » avec', [a.garde.mode, neuf({}, 'prod').garde.mode, neuf({ ovh: { appKey: 'abcdefgh', appSecret: 'abcdefgh', consumerKey: 'abcdefgh', serviceName: 'sms-ab1234-1', expediteur: 'OPMSG' } }, 'prod').garde.mode], ['journal', 'inactif', 'ovh']);
  a.S.fermer();
}

console.log('\n── 916 · le DÉFI : signé, lié au numéro et au pays, délai tenu, validité bornée, usage unique ──');
{
  const a = neuf({ bouclier: { bits: 8, attenteMs: 2000, validiteMs: 600000 } });
  const g = a.garde, nonceDe = (d) => { for (let i = 0; i < 1e7; i++) { const x = i.toString(36); if (crypto.createHash('sha256').update(d.jeton + ':' + x).digest()[0] === 0) return x; } };
  const numH = 'a'.repeat(64);
  const d = g.defiEmettre({ pays: 'BE', num_h: numH }), nonce = nonceDe(d);
  v('un défi : un jeton, les bits, le délai', [typeof d.jeton, d.bits, d.attente_s], ['string', 8, 2]);
  v('⛔ avant le délai (2 s) : refusé', g.defiVerifier({ jeton: d.jeton, nonce, pays: 'BE', num_h: numH }), false);
  a.h.t += 2001;
  /* ⛔ UN MAUVAIS NONCE SE PROUVE MAUVAIS (3 octobre 2026). `zzzzzz-pas-bon`, FIXE, contre un défi tiré au hasard, donnait les 8 zéros
     une fois sur 256 : accepté, il consommait le défi, et « le bon : accepté une fois » tombait derrière lui — 2 ✗ sur « Vérification
     des pages » de main (17a4b92), vert partout ailleurs. On le cherche donc MAUVAIS pour CE défi, et on le prouve avant de s'en servir. */
  const mauvais = (() => { for (let i = 0; i < 1e4; i++) { const x = 'pas-bon-' + i; if (crypto.createHash('sha256').update(d.jeton + ':' + x).digest()[0] !== 0) return x; } return null; })();
  vrai('(population) le mauvais nonce ne donne VRAIMENT pas les 8 zéros pour ce défi (premier octet de son empreinte non nul)', !!mauvais && crypto.createHash('sha256').update(d.jeton + ':' + mauvais).digest()[0] !== 0);
  v('⛔ un nonce qui ne donne pas les zéros : refusé', g.defiVerifier({ jeton: d.jeton, nonce: mauvais || 'pas-bon', pays: 'BE', num_h: numH }), false);
  v('⛔ le même défi pour un AUTRE numéro : refusé (le jeton est signé AVEC l\'empreinte du numéro)', g.defiVerifier({ jeton: d.jeton, nonce, pays: 'BE', num_h: 'b'.repeat(64) }), false);
  v('⛔ le même défi pour un AUTRE pays : refusé', g.defiVerifier({ jeton: d.jeton, nonce, pays: 'FR', num_h: numH }), false);
  const trafique = d.jeton.replace(/\.8\./, '.1.');
  v('⛔ un jeton dont on a baissé les bits à la main : refusé (la signature ne couvre plus)', g.defiVerifier({ jeton: trafique, nonce: '0', pays: 'BE', num_h: numH }), false);
  const forge = d.jeton.slice(0, -4) + 'abcd';
  v('⛔ un jeton à la signature fausse : refusé', g.defiVerifier({ jeton: forge, nonce, pays: 'BE', num_h: numH }), false);
  v('des entrées absurdes ne lèvent jamais : refusées', [g.defiVerifier({}), g.defiVerifier({ jeton: 5, nonce: 6 }), g.defiVerifier({ jeton: 'x'.repeat(500), nonce: 'a' }), g.defiVerifier({ jeton: d.jeton, nonce: 'é'.repeat(5), pays: 'BE', num_h: numH })], [false, false, false, false]);
  v('le bon : accepté une fois', g.defiVerifier({ jeton: d.jeton, nonce, pays: 'BE', num_h: numH }), true);
  v('⛔ et PAS DEUX : le même rejoué est refusé (usage unique)', g.defiVerifier({ jeton: d.jeton, nonce, pays: 'BE', num_h: numH }), false);
  const d2 = g.defiEmettre({ pays: 'BE', num_h: numH }), n2 = nonceDe(d2);
  a.h.t += 11 * 60000;
  v('⛔ un défi vieux de plus de 10 minutes : refusé (la preuve ne se stocke pas pour plus tard)', g.defiVerifier({ jeton: d2.jeton, nonce: n2, pays: 'BE', num_h: numH }), false);
  a.S.fermer();
}

console.log('\n── 916 · la configuration `sms.*` est VALIDÉE au démarrage ──');
{
  const ref = G.lireConfigSms({}, 'prod');
  v('⛔ les défauts : 20 € par jour, 5 € par heure, 3 € par pays et par jour, 1,5 € par pays et par heure', [ref.budgetJour, ref.budgetHeure, ref.budgetPaysJour, ref.budgetPaysHeure], [20, 5, 3, 1.5]);
  v('   le code : 10 minutes, 5 essais, renvoi à 60 s ; la recherche : 30 par jour, 10 pour un compte neuf', [ref.codeMs, ref.essaisCode, ref.renvoiMs, ref.rechercheJour, ref.rechercheJourJeune], [600000, 5, 60000, 30, 10]);
  v('   l\'emballement : ×5, plancher 30 ; le bouclier : 18 bits (≈ 0,3 s de calcul), 5 s de délai', [ref.emballement.facteur, ref.emballement.plancher, ref.bouclier.bits, ref.bouclier.attenteMs], [5, 30, 18, 5000]);
  const REFUS = [
    ['budget négatif', { budgetJour: -1 }], ['budget qui n\'est pas un nombre', { budgetJour: '20' }], ['budget infini', { budgetJour: Infinity }], ['budget NaN', { budgetHeure: NaN }],
    ['code pays en minuscules', { budgetPays: { be: { jour: 1 } } }], ['prix négatif', { prix: { FR: -1 } }], ['prix de pays mal écrit', { prix: { 'France': 1 } }],
    ['interdits : pas un tableau', { interdits: '+33' }], ['interdits : préfixe sans +', { interdits: ['33'] }], ['domaine invalide', { domaine: 'https://x' }],
    ['bouclier : bits trop bas (un défi trivial)', { bouclier: { bits: 2 } }], ['bouclier : pays invalide', { bouclier: { pays: ['belgique'] } }], ['bouclier global pas booléen', { bouclier: { global: 'oui' } }],
    ['⛔ identifiants OVH INCOMPLETS (une moitié de configuration ne passe pas en silence en mode journal)', { ovh: { appKey: 'abcdefgh', appSecret: 'abcdefgh' } }],
    ['expéditeur trop long', { ovh: { appKey: 'abcdefgh', appSecret: 'abcdefgh', consumerKey: 'abcdefgh', serviceName: 'sms-ab1234-1', expediteur: 'UNEXPEDITEURTROPLONG' } }],
    ['clé avec un espace', { ovh: { appKey: 'abc defgh', appSecret: 'abcdefgh', consumerKey: 'abcdefgh', serviceName: 'sms-ab1234-1', expediteur: 'OPMSG' } }],
    ['emballement : facteur négatif', { emballement: { facteur: -3 } }], ['codeMs à zéro', { codeMs: 0 }],
  ];
  vrai('la population : ' + REFUS.length + ' configurations absurdes', REFUS.length >= 15);
  for (const [nom, c] of REFUS) vrai(nom + ' → le démarrage est REFUSÉ (code CONFIG)', /^CONFIG /.test(String(lance(() => G.lireConfigSms(c, 'prod')))));
  const ovh = { appKey: 'abcdefgh', appSecret: 'abcdefgh', consumerKey: 'abcdefgh', serviceName: 'sms-ab1234-1', expediteur: 'OPMSG' };
  v('⛔ EN PRODUCTION, une base d\'API autre qu\'OVH est refusée (nos clés de signature ne partent pas ailleurs)', [lance(() => G.lireConfigSms({ ovh: Object.assign({ urlBase: 'https://evil.example.com/1.0' }, ovh) }, 'prod')) !== null, lance(() => G.lireConfigSms({ ovh: Object.assign({ urlBase: 'https://eu.api.ovh.com/1.0' }, ovh) }, 'prod'))], [true, null]);
  v('   en bêta (les bancs), une base locale est permise', lance(() => G.lireConfigSms({ ovh: Object.assign({ urlBase: 'http://127.0.0.1:9/1.0' }, ovh) }, 'beta')), null);
  v('une configuration entière et juste passe, et rend la liste des pays interdits telle quelle', G.lireConfigSms({ interdits: ['+2519', '+9919'], budgetPays: { BE: { jour: 2 } }, prix: { FR: 0.07, '+33': 0.08 }, ovh }, 'prod').interdits, ['+2519', '+9919']);
  v('l\'objet de configuration brut n\'est jamais muté ni exposé tel quel (les secrets restent dans `ovh`, jamais dans /health)', Object.keys(neuf({ ovh }).garde.sante()).includes('ovh'), false);
}

console.log('\n── 916 · la MIGRATION 2 : `personne` reconstruite sans perdre une ligne, une copie gardée, le téléphone entre ──');
{
  const chemin = path.join(bac, 'ancienne.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
  const v1 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: MIGRATIONS.slice(0, 1) });
  const al = v1.personneCreer({ identifiant: 'beta:alice', prenom: 'Alice', nom: 'A', origine: 'beta', verifie: true });
  const bo = v1.personneCreer({ identifiant: 'beta:bob', prenom: 'Bob', nom: 'B', origine: 'beta', verifie: true });
  v1.contactLier(al.id, bo.id);
  const conv = v1.convDirecteObtenir(al.id, bo.id).id;
  v1.messageEnvoyer({ conv, auteur: al.id, cid: 'cid-migr-0001', texte: 'écrit AVANT la migration' });
  v1.sessionAjouter({ h: 'h'.repeat(64), personne: al.id, appareil: 'x', ttlMs: 86400000 });
  v('une base d\'AVANT est au schéma 1', v1.schema(), 1);
  v1.fermer();
  const v2 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: MIGRATIONS.slice(0, 2) });   // la migration 3 (les pièces) a son propre banc : test-943
  v('⛔ rouverte avec la migration 2 : schéma 2', v2.schema(), 2);
  vrai('⛔ une copie « avant-v2 » a été gardée AVANT de reconstruire la table', fs.existsSync(chemin + '.avant-v2'));
  v('les deux personnes sont intactes (prénom, nom, origine)', [v2.personneParId(al.id), v2.personneParId(bo.id)].map(p => [p.prenom, p.nom, p.origine]), [['Alice', 'A', 'beta'], ['Bob', 'B', 'beta']]);
  v('⛔ le contact, la conversation et le message écrit avant survivent (les clés étrangères ont suivi la reconstruction)', [v2.contactActif(al.id, bo.id), v2.messagesDe(conv, al.id).messages.map(m => m.texte)], [true, ['écrit AVANT la migration']]);
  v('la session survit', v2.sessionLire('h'.repeat(64)).personne, al.id);
  v('⛔ la nouvelle colonne « qui peut me trouver » vaut « tous » pour les personnes d\'avant (le comportement d\'un compte ne change pas)', [v2.telTrouvableLire(al.id), v2.telTrouvableLire(bo.id)], ['tous', 'tous']);
  const brut = new DatabaseSync(chemin);
  v('aucune ligne orpheline après la reconstruction (foreign_key_check)', brut.prepare('PRAGMA foreign_key_check').all().length, 0);
  v('les clés étrangères sont REMISES en marche après la migration', brut.prepare('PRAGMA foreign_keys').get().foreign_keys, 1);
  const tel = v2.personneCreer({ identifiant: 'tel:+32470123456', prenom: 'Tel', nom: '', origine: 'telephone', verifie: true });
  v('⛔ le compte par numéro entre (origine « telephone » acceptée par la table reconstruite)', [tel.origine, v2.telPersonneParNumero('tel:+32470123456').id === tel.id], ['telephone', true]);
  vrai('   l\'origine reste CONTRAINTE : une valeur inventée est refusée par la base elle-même', lance(() => brut.prepare("INSERT INTO personne(id, origine, cree) VALUES('p_x', 'pirate', 1)").run()) !== null);
  vrai('   « qui peut me trouver » aussi', lance(() => brut.prepare("UPDATE personne SET trouvable = 'les-amis' WHERE id = ?").run(al.id)) !== null);
  brut.close();
  v('un numéro n\'est trouvé QUE par son empreinte scellée : un identifiant d\'une autre origine ne le retrouve pas', [v2.telPersonneParNumero('beta:alice'), v2.telPersonneParNumero('tel:+32470123457')], [null, null]);
  v2.telAppareilLier({ h: 'a'.repeat(64), personne: tel.id, nom: 'x', ttlMs: 1000 });
  v2.fermer();
  const v2b = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: MIGRATIONS.slice(0, 2) });
  v('rouvrir une base DÉJÀ migrée ne rejoue rien et garde le compte par numéro et son appareil', [v2b.schema(), v2b.telPersonneParNumero('tel:+32470123456').id === tel.id, v2b.telAppareilLire('a'.repeat(64)) !== null], [2, true, true]);
  v2b.fermer();
  const stockSrc = T.sansCommentaires(fs.readFileSync(path.join(T.SERVICE, 'stockage.js'), 'utf8'));
  vrai('⛔ aucun numéro en clair n\'est un argument de ce module : toutes les fonctions du téléphone reçoivent une empreinte (`num_h`) ou l\'identifiant scellé', !/telCode\w*\(\s*\{?\s*numero/.test(stockSrc) && !/function tel\w+\(\s*\{?\s*numero/.test(stockSrc));
}

console.log('\n── 916 · la MIGRATION 2 refuse une base qui a des lignes orphelines (et ne la laisse pas à moitié migrée) ──');
{
  const chemin = path.join(bac, 'orpheline.db'), kek = crypto.randomBytes(32), h = { t: 1790000000000 };
  const v1 = ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t, migrations: MIGRATIONS.slice(0, 1) });
  v1.personneCreer({ identifiant: 'beta:alice', prenom: 'Alice', nom: 'A', origine: 'beta', verifie: true });
  v1.fermer();
  const brut = new DatabaseSync(chemin);
  brut.exec('PRAGMA foreign_keys = OFF');
  brut.prepare('INSERT INTO session(h, personne, appareil, cree, vu, exp) VALUES(?, ?, ?, ?, ?, ?)').run('o'.repeat(64), 'p_' + 'f'.repeat(32), 'x', 1, 1, 9e15);
  const orphelins = brut.prepare('PRAGMA foreign_key_check').all().length;
  brut.close();
  vrai('la population : la base d\'avant porte ' + orphelins + ' ligne orpheline (session d\'une personne qui n\'existe pas)', orphelins === 1);
  v('⛔ la migration REFUSE (`migration_orphelins`) plutôt que de reconstruire `personne` au-dessus d\'un lien cassé', lance(() => ouvrir({ chemin, scelleur: creerScelleur(kek), horloge: () => h.t })), 'migration_orphelins migration_orphelins');
  const apres = new DatabaseSync(chemin);
  v('⛔ et elle ne laisse rien à moitié fait : la base est toujours au schéma 1, la table `personne` d\'origine est là, aucune table neuve', [apres.prepare('PRAGMA user_version').get().user_version, apres.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE name IN ('personne', 'code_tel', 'sms_envoi')").get().n], [1, 1]);
  vrai('   et la copie « avant-v2 » existe (on peut revenir)', fs.existsSync(chemin + '.avant-v2'));
  apres.close();
}

(async () => {
console.log('\n── 916 · le bouclier de l\'ARGENT : 40 % du budget (pays, total, heure, jour) — pas un nombre de SMS que le budget empêche d\'atteindre ──');
{
  const d = G.lireConfigSms({}, 'beta');
  v('les défauts : le bouclier s\'allume à 40 % ; 40 % du budget global sont réservés à la France et ses départements', [d.emballement.partBudget, d.reserve.part, d.reserve.pays.includes('FR'), d.reserve.pays.includes('RE')], [0.4, 0.4, true, true]);
  const refus = (c) => { try { G.lireConfigSms(c, 'beta'); return null; } catch (e) { return e.code; } };
  v('⛔ une part de bouclier absurde (0, 2) ou une réserve de 95 % ou un code pays en minuscules REFUSENT le démarrage', [refus({ emballement: { partBudget: 0 } }), refus({ emballement: { partBudget: 2 } }), refus({ reserve: { part: 0.95 } }), refus({ reserve: { pays: ['fr'] } })], ['CONFIG', 'CONFIG', 'CONFIG', 'CONFIG']);
  const a = neuf({ budgetJour: 20, budgetHeure: 5, budgetPaysJour: 3, budgetPaysHeure: 1.5 }, 'beta', true);
  const reserve = (pays, cc, n) => { for (let i = 0; i < n; i++) { const r = a.garde.reserver({ pays, cc }); if (!r.ok) return r; } return { ok: true }; };
  reserve('FR', '33', 7);
  v('sept SMS français (0,525 € : sous 40 % de 1,5 €) : pas de bouclier', a.garde.bouclierDe('FR'), null);
  reserve('FR', '33', 1);
  v('⛔ le huitième SMS (0,60 € = 40 % du budget de l\'heure du pays) : le bouclier s\'allume — le plancher de 30 n\'aurait JAMAIS été atteint (le budget coupe à 20)', a.garde.bouclierDe('FR'), { motif: 'budget_pays' });
  v('   un autre pays qui n\'a rien dépensé : rien', a.garde.bouclierDe('BE'), null);
  v('   /health compte ce bouclier (un nombre)', a.garde.sante().boucliers, 1);
  reserve('RU', '7', 1); reserve('ID', '62', 1); reserve('AZ', '994', 1);
  v('⛔ trois SMS vers trois pays chers (2,49 €, 50 % du budget global de l\'heure) : le bouclier du TOTAL s\'allume, pour TOUS les pays', [a.garde.bouclierDe('BE'), a.garde.bouclierDe('JP')], [{ motif: 'budget_global' }, { motif: 'budget_global' }]);
  v('   et /health le compte une seule fois', a.garde.sante().boucliers, 1);
  a.h.t += HEURE + 1000;
  v('une heure plus tard, la dépense de l\'heure est retombée : le bouclier tombe SEUL (il suit la fenêtre glissante)', a.garde.bouclierDe('BE'), null);
  a.S.fermer();
  const b = neuf({ budgetJour: 20, budgetHeure: 5, budgetPaysJour: 3, budgetPaysHeure: 1.5, emballement: { partBudget: 1 } }, 'beta', true);
  for (let i = 0; i < 18; i++) b.garde.reserver({ pays: 'FR', cc: '33' });
  v('contre-épreuve : « partBudget: 1 » éteint ce bouclier (18 SMS français, 90 % du budget du pays)', b.garde.bouclierDe('FR'), null);
  b.S.fermer();
  const c = neuf({ budgetJour: 20, budgetHeure: 0, budgetPaysJour: 3, budgetPaysHeure: 1.5 }, 'beta', true);
  v('un budget de zéro n\'allume pas un bouclier (il n\'y a rien à protéger : tout est refusé)', c.garde.bouclierDe('FR'), null);
  c.S.fermer();
}

console.log('\n── 916 · la RÉSERVE du marché d\'origine : les autres pays ne se partagent que 60 % du budget global ──');
{
  const a = neuf({}, 'beta', true);
  const r = [a.garde.reserver({ pays: 'RU', cc: '7' }), a.garde.reserver({ pays: 'ID', cc: '62' }), a.garde.reserver({ pays: 'AZ', cc: '994' }), a.garde.reserver({ pays: 'UZ', cc: '998' })];
  v('RU, ID, AZ passent (2,49 € sur 3 €) ; UZ (3,11 €) dépasserait les 60 % du budget de l\'heure réservés aux AUTRES pays : « budget_heure »', [r[0].ok, r[1].ok, r[2].ok, r[3].ok, r[3].motif], [true, true, true, false, 'budget_heure']);
  v('⛔ la France, elle, passe : la réserve est faite pour elle', a.garde.reserver({ pays: 'FR', cc: '33' }).ok, true);
  v('   et un département (la Réunion) aussi', a.garde.reserver({ pays: 'RE', cc: '262' }).ok, true);
  a.S.fermer();
  const b = neuf({ reserve: { part: 0 } }, 'beta', true);
  const r2 = [b.garde.reserver({ pays: 'RU', cc: '7' }), b.garde.reserver({ pays: 'ID', cc: '62' }), b.garde.reserver({ pays: 'AZ', cc: '994' }), b.garde.reserver({ pays: 'UZ', cc: '998' })];
  v('contre-épreuve : SANS réserve, UZ passe (le total 3,11 € tient sous 5 €) — c\'est ainsi que sept pays chers ferment la France', r2.map(x => x.ok), [true, true, true, true]);
  b.S.fermer();
}

console.log('\n── 916 · les PLAFONDS par numéro et par réseau : durables, glissants, réservés dans la MÊME transaction que le budget ──');
{
  const a = neuf({ budgetJour: 50, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 });
  const caps = (k, max, fenetreMs, code) => [{ code: code || 'plafond_x', k, max, fenetreMs }];
  const r1 = a.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:aaa', 2, 60000) }), r2 = a.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:aaa', 2, 60000) });
  const r3 = a.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:aaa', 2, 60000) });
  v('deux passent, le troisième est refusé avec le NOM du plafond et un Retry-After de 1 à 60 s', [r1.ok, r2.ok, r3.ok, r3.plafond, r3.retry >= 1 && r3.retry <= 60], [true, true, false, 'plafond_x', true]);
  v('⛔ le refus n\'a écrit AUCUN envoi (le journal compte deux lignes)', a.S.smsSommes(0).n, 2);
  a.h.t += 61000;
  v('la fenêtre GLISSE : soixante et une secondes plus tard, le plafond est libre', a.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:aaa', 2, 60000) }).ok, true);
  const nb = a.S.smsTentativesCompter('n:aaa', 0);
  const ra = a.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:bbb', 5, 86400000) });
  v('un plafond est une ligne par SMS et par clé', a.S.smsTentativesCompter('n:bbb', 0), 1);
  a.garde.rendre(ra.id);
  v('⛔ rendre un SMS qui n\'est jamais parti rend SES lignes de plafond (et seulement les siennes)', [a.S.smsTentativesCompter('n:bbb', 0), a.S.smsTentativesCompter('n:aaa', 0)], [0, nb]);
  a.S.fermer();
  const b = neuf({ budgetJour: 0.05, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 });
  const rb = b.garde.reserver({ pays: 'FR', cc: '33', caps: caps('n:ccc', 5, 86400000) });
  v('⛔ un budget refusé n\'a consommé AUCUN plafond (tout se décide dans la même transaction)', [rb.ok, rb.motif, b.S.smsTentativesCompter('n:ccc', 0)], [false, 'budget_jour', 0]);
  b.S.fermer();
  /* DURABLES : la base, rouverte, sait. */
  const d = neuf({ budgetJour: 50, budgetHeure: 50, budgetPaysJour: 50, budgetPaysHeure: 50 });
  d.garde.reserver({ pays: 'BE', cc: '32', caps: caps('n:ddd', 1, 60000) });
  d.S.fermer();
  const S2 = ouvrir({ chemin: d.chemin, scelleur: creerScelleur(d.kek), horloge: () => d.h.t });
  v('⛔ la base rouverte garde le plafond (rien ne vit en mémoire)', S2.smsTentativesCompter('n:ddd', d.h.t - 60000), 1);
  S2.fermer();
}

console.log('\n── 916 · le DÉFI : une table remplie par un robot ne refuse PAS les personnes honnêtes (elle évince les plus anciens) ──');
{
  const a = neuf({ bouclier: { bits: 8, attenteMs: 0, validiteMs: 600000 } });
  const g = a.garde, numH = 'c'.repeat(64);
  const nonceDe = (d) => { for (let i = 0; i < 1e7; i++) { const x = i.toString(36); if (crypto.createHash('sha256').update(d.jeton + ':' + x).digest()[0] === 0) return x; } };
  let acceptes = 0;
  for (let i = 0; i < 20100; i++) { const d = g.defiEmettre({ pays: 'BE', num_h: numH }); if (g.defiVerifier({ jeton: d.jeton, nonce: nonceDe(d), pays: 'BE', num_h: numH })) acceptes++; }
  v('⛔ vingt mille cent défis brûlés (5 000 refusaient déjà toute preuve, pendant dix minutes) : TOUS acceptés — la table évince, elle ne refuse pas', acceptes, 20100);
  const dn = g.defiEmettre({ pays: 'BE', num_h: numH }), nn = nonceDe(dn);
  v('   et un client honnête, juste après, passe', g.defiVerifier({ jeton: dn.jeton, nonce: nn, pays: 'BE', num_h: numH }), true);
  v('   son défi ne se rejoue toujours pas', g.defiVerifier({ jeton: dn.jeton, nonce: nn, pays: 'BE', num_h: numH }), false);
  a.S.fermer();
}

console.log('\n── 916 · l\'ENVOI : « numéro invalide » n\'est pas une panne, « refus » et « non envoyé » en sont une (ovhEchecs) ──');
{
  const mode = { v: 'ok' };
  const fauxFetch = async (url, o) => {
    const rep = (st, corps) => ({ status: st, ok: st >= 200 && st < 300, text: async () => String(corps), json: async () => corps });
    if (/auth\/time$/.test(url)) return rep(200, Math.floor(Date.now() / 1000));
    if (mode.v === 'ok') return rep(200, { validReceivers: ['+32470123456'], invalidReceivers: [], ids: [1], totalCreditsRemoved: 1 });
    if (mode.v === 'invalide') return rep(200, { validReceivers: [], invalidReceivers: ['+32470123456'], ids: [], totalCreditsRemoved: 0 });
    if (mode.v === 'refus') return rep(400, { message: 'not enough credits' });
    if (mode.v === '503') return rep(503, { message: 'Service Unavailable' });
    if (mode.v === '500') return rep(500, { message: 'Internal' });
    return rep(200, {});
  };
  const ovh = { appKey: 'abcdefgh', appSecret: 'abcdefgh', consumerKey: 'abcdefgh', serviceName: 'sms-xx1-1', expediteur: 'OPMSG', urlBase: 'http://ovh.test/1.0' };
  const a = neuf({ ovh }, 'beta', true, fauxFetch);
  const essai = async (m) => { mode.v = m; const r = a.garde.reserver({ pays: 'BE', cc: '32' }); const e = await a.garde.envoyer({ id: r.id, cout: r.cout, numero: '+32470123456', message: 'x' }); return [e.ok ? 'ok' : e.genre, a.garde.sante().ovhEchecs]; };
  v('un envoi réussi : ovhEchecs à zéro', await essai('ok'), ['ok', 0]);
  v('⛔ « numéro invalide » (400 du destinataire) ne compte PAS comme une panne', await essai('invalide'), ['numero', 0]);
  v('⛔ un refus franc d\'OVH (400 : crédits épuisés) COMPTE (avant : seul un 403 ou un 5xx montait, des crédits épuisés seraient restés muets)', await essai('refus'), ['refus', 1]);
  v('⛔ un 503 compte, et c\'est « non_envoye »', await essai('503'), ['non_envoye', 2]);
  v('un 500 compte, et reste « incertain »', await essai('500'), ['incertain', 3]);
  v('un envoi réussi remet le compteur à zéro', await essai('ok'), ['ok', 0]);
  const refuses = a.S.smsSommes(0);
  vrai('⛔ le journal : seuls les envois réussis et l\'incertain comptent en euros (3 lignes comptées sur 7, ' + refuses.n + ')', refuses.n === 3);
  a.S.fermer();
}

console.log('\n── 916 · le CODE est lié à l\'appareil qui l\'a demandé ; l\'appareil est borné dans le temps ──');
{
  const a = neuf();
  const S = a.S, num = 'n'.repeat(64);
  S.telCodePoser({ num_h: num, code_h: 'h1', exp: a.h.t + 600000, ap_h: 'appareil-A' });
  let autres = [];
  for (let i = 0; i < 12; i++) autres.push(S.telCodeEssayer(num, 5, 'appareil-B'));
  v('⛔ un AUTRE appareil (l\'inconnu qui connaît le numéro) : douze essais, aucun résultat — et ils ne brûlent PAS le code', [autres.every(x => x === null), S.telCodeEssayer(num, 5, 'appareil-A')], [true, { code_h: 'h1' }]);
  const essais = S.telCodeEssayer(num, 5, 'appareil-A');
  v('l\'appareil qui l\'a demandé garde ses cinq essais (on a compté UN essai juste avant, pas les douze de l\'autre)', essais, { code_h: 'h1' });
  for (let i = 0; i < 3; i++) S.telCodeEssayer(num, 5, 'appareil-A');
  v('au cinquième essai de SON appareil, le code est épuisé', S.telCodeEssayer(num, 5, 'appareil-A'), null);

  const pers = S.personneCreer({ identifiant: 'tel:+32470000001', prenom: 'A', nom: '', origine: 'telephone', verifie: true });
  S.telAppareilLier({ h: 'ap1', personne: pers.id, nom: 'x', ttlMs: 180 * JOUR });
  v('un appareil lié se relit', S.telAppareilLire('ap1', 365 * JOUR).personne, pers.id);
  a.h.t += 366 * JOUR;
  S.telAppareilToucher('ap1', 180 * JOUR);
  v('⛔ plafond ABSOLU : un an après sa dernière preuve par SMS, même « touché » tous les jours, il ne reconnecte plus (un numéro réattribué ne laisse pas l\'ancien titulaire connecté pour toujours)', S.telAppareilLire('ap1', 365 * JOUR), null);
  S.telAppareilLier({ h: 'ap2', personne: pers.id, nom: 'y', ttlMs: 180 * JOUR });
  a.h.t += 150 * JOUR;
  S.telAppareilLier({ h: 'ap2', personne: pers.id, nom: 'y', ttlMs: 180 * JOUR });
  a.h.t += 150 * JOUR;
  v('un nouveau SMS remet la date de preuve à jour (300 jours après le premier lien, 150 après le second : reconnu)', S.telAppareilLire('ap2', 365 * JOUR) !== null, true);

  const s1 = S.sessionAjouter({ h: 's1', personne: pers.id, ttlMs: JOUR }); const s2 = S.sessionAjouter({ h: 's2', personne: pers.id, ttlMs: JOUR }); S.sessionAjouter({ h: 's3', personne: pers.id, ttlMs: JOUR });
  S.telAppareilLier({ h: 'ap3', personne: pers.id, nom: 'z', ttlMs: 180 * JOUR }); S.telAppareilLier({ h: 'ap4', personne: pers.id, nom: 'w', ttlMs: 180 * JOUR });
  v('« déconnecter les autres » : toutes les sessions sauf celle d\'où l\'on le demande (on rend leurs empreintes pour fermer leurs flux)', S.sessionsSupprimerAutres(pers.id, 's2').sort(), ['s1', 's3']);
  v('   et tous les jetons d\'appareil sauf le sien', [S.telAppareilsSupprimerAutres(pers.id, 'ap3') >= 1, S.telAppareilLire('ap3', 365 * JOUR) !== null, S.telAppareilLire('ap2', 365 * JOUR)], [true, true, null]);
  vrai('   (la session gardée existe encore)', S.sessionLire('s2') !== null && S.sessionLire('s1') === null);
  void s1; void s2;
  a.S.fermer();
}

console.log('\n── 916 · l\'ÉLAGAGE : chaque table du téléphone a SA rétention (rien ne reste indéfiniment) ──');
{
  const a = neuf();
  const S = a.S, t = a.h.t;
  S.telCodePoser({ num_h: 'x'.repeat(64), code_h: 'h', exp: t - 2 * HEURE, ap_h: 'a' });   // un code expiré depuis deux heures : l'empreinte d'un numéro NON inscrit
  const id = S.smsReserver({ pays: 'BE', cout: 100000 }); S.smsTentativesNoter(id, ['n:vieux'], t - 3 * JOUR); S.smsTentativesNoter(id, ['n:recent'], t - HEURE);
  const vieux = S.smsReserver({ pays: 'BE', cout: 100000 }); S.smsRegler(vieux, { etat: 'envoye', cout: 100000 });
  a.h.t = t + 10 * JOUR;
  S.telCodePoser({ num_h: 'y'.repeat(64), code_h: 'h', exp: a.h.t + 10 * 60000, ap_h: 'a' });  // un code vivant
  const brut = new DatabaseSync(a.chemin);
  const compte = (tb) => Number(brut.prepare('SELECT COUNT(*) AS n FROM ' + tb).get().n);
  const avant = [compte('code_tel'), compte('sms_tentative'), compte('sms_envoi')];
  const n = S.smsElaguer({ journalAvant: a.h.t - 8 * JOUR, codesAvant: a.h.t - HEURE, recherchesAvant: a.h.t - 2 * JOUR, tentativesAvant: a.h.t - 2 * JOUR, appareilsAbsMs: 365 * JOUR });
  const apres = [compte('code_tel'), compte('sms_tentative'), compte('sms_envoi')];
  v('la population : un code expiré, un vivant ; deux lignes de plafond ; deux envois — tous plus vieux que leur rétention', avant, [2, 2, 2]);
  vrai('⛔ rien ne reste de trop : les codes expirés, les plafonds de plus de deux jours et le journal de plus de huit jours sont partis (' + n + ' lignes) : ' + JSON.stringify(apres), apres[0] === 1 && apres[1] === 0 && apres[2] === 0);
  brut.close();
  a.S.fermer();
}

})().then(() => { try { fs.rmSync(bac, { recursive: true, force: true }); } catch (e) {} fin(); }).catch(e => { console.log('  ✗ le banc est mort : ' + (e && e.stack || e)); process.exitCode = 1; fin(); });
