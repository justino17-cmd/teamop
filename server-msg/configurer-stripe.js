#!/usr/bin/env node
/* ══ BRANCHER STRIPE (MESSAGES PRO) SUR OP MESSAGES, SANS AFFICHER NI COLLER UN SECRET NULLE PART ══════════════════════════════════
 *
 * Usage, SUR LE VPS :   OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js
 *                       OPMSG_CONFIG=/etc/opmsg/beta.json node /opt/opmsg/beta/current/configurer-stripe.js --verifier
 *   (le fichier de configuration d'une instance : `/etc/opmsg/<instance>.json`, celui que le service lit)
 *
 * ⛔ « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS » (CLAUDE.md). La clé Stripe RESTREINTE d'OP MESSAGES se SAISIT ici, masquée
 * (`saisie.js` : même un retour arrière, une flèche ou un collage ne la réaffichent), et va de ce clavier au fichier : jamais en argument
 * (`ps` la montre à toute la machine, l'historique du shell la garde), jamais affichée, jamais recopiée dans la conversation. Le script
 * n'imprime que des valeurs qui ne sont pas des secrets (le mode, un nom de produit, un montant, un nombre).
 * ⛔ UNE CLÉ RESTREINTE ET PROPRE À OP MESSAGES, jamais celle d'OP GESTION (SERVEUR.md § 3.8) : créée dans le tableau de bord Stripe, avec les
 * seuls droits qu'on lui doit — Checkout Sessions (écriture), Customers (écriture), Subscriptions (lecture), Customer portal (écriture), et, pour
 * que ce script puisse vérifier les tarifs, Prices et Products (lecture). Une clé secrète complète (`sk_…`) est REFUSÉE : elle donnerait à ce
 * service tout le compte, celui d'OP GESTION compris.
 *
 * ⛔ ET IL ÉPROUVE LA CLÉ AVANT D'ÉCRIRE : une lecture sans effet (`GET /v1/subscriptions?limit=1`) dit si la clé répond et si elle lit les
 * abonnements ; chaque tarif est relu (`GET /v1/prices/<id>`) — existe-t-il dans CE mode (test ou production) ? est-il actif, récurrent, au
 * bon rythme (mensuel : `month`, annuel : `year`), facturé à l'unité (les places sont une QUANTITÉ) ? Le montant que Stripe facturera est
 * comparé à celui que l'écran annoncera. Il ne crée RIEN chez Stripe, n'envoie rien, ne facture rien.
 * ⚠️ UN TARIF QUE LE COMPTE PARTAGE AVEC OP GESTION : OP GESTION lit TOUS les abonnements du compte et range une ligne « OP MESSAGES » si son tarif
 * est dans sa liste (`STRIPE_PRIX_MESSAGES`) ou si le nom de son produit contient « messages ». Le script AVERTIT quand le produit n'a pas ce
 * nom (design/opmessages/INSTALLER-LE-SERVEUR.md, § Stripe) : sans ça, un abonnement de Messages Pro pourrait être lu par OP GESTION comme un
 * abonnement à lui — `tests/test-965.js` joue les deux services l'un contre l'autre.
 * ⛔ Le fichier n'est réécrit qu'une fois tout validé : temporaire (0600 dès sa création), propriétaire de l'ancien conservé, relu et revalidé
 * par le MÊME code que le démarrage du service, toutes les AUTRES clés vérifiées intactes, puis renommé — jamais à moitié (l'accolade
 * manquante du 17 septembre). Les montants affichés, le rythme de relecture et le délai d'attente ont des valeurs par défaut et ne sont pas
 * demandés ; une configuration déjà posée les garde.
 */
'use strict';
const fs = require('fs');
const { demander, fermer, AU_CLAVIER } = require('./saisie');
const { facturationConfig, RE_CLE_STRIPE } = require('./config');
const { HOTE_STRIPE } = require('./facturation');

const CONFIG_PATH = process.env.OPMSG_CONFIG;
const ARGS = process.argv.slice(2);
const VERIFIER = ARGS.includes('--verifier');

const echec = (m) => { console.error('\n✗ ' + m + ' Rien n\'a été modifié.'); fermer(); process.exit(1); };
/* Une clé telle qu'on la copie : les blancs autour n'y comptent pas (un collage emporte souvent un retour à la ligne ou un espace). */
const nettoyer = (s) => String(s || '').replace(/\s+/g, '');

/* Un appel à Stripe, en lecture. Rend { statut, corps } — jamais une exception pour un refus : le script DIT ce que le refus veut dire. `hote` : l'hôte de Stripe, ou le faux des bancs. */
async function lire(hote, cle, chemin) {
  try {
    const r = await fetch(hote + chemin, { method: 'GET', headers: { Authorization: 'Bearer ' + cle, Accept: 'application/json' }, signal: AbortSignal.timeout(15000), redirect: 'error' });
    let corps = null; try { corps = await r.json(); } catch (e) { corps = null; }
    return { statut: r.status, corps };
  } catch (e) { return { statut: 0, corps: null }; }
}
/* Ce que dit un refus, sans jamais citer une valeur : le statut seul, et ce qu'il veut dire en pratique. */
function diagnostic(statut, quoi) {
  if (statut === 401) return 'Stripe refuse la clé (401) : clé fausse, recopiée avec un espace, ou révoquée — ou d\'un AUTRE mode (une clé de test ne voit pas le compte de production, et inversement).';
  if (statut === 403) return 'Stripe refuse ce droit à la clé (403) : la clé restreinte n\'a pas le droit « ' + quoi + ' ». Dans le tableau de bord Stripe : Développeurs → Clés API → modifier la clé restreinte.';
  if (statut === 404) return 'Stripe ne connaît pas cet objet (404).';
  if (statut === 429) return 'Stripe répond « trop de demandes » (429) : réessaie dans une minute.';
  if (!statut) return 'Stripe n\'a pas répondu (réseau, délai dépassé, ou ce serveur n\'a pas de sortie vers Stripe).';
  return 'Stripe répond ' + statut + '.';
}

/* ══ l'épreuve : la clé répond, les tarifs sont ceux qu'on croit ═══════════════════════════════════════════════════════════════ */
async function eprouver({ hote, cle, mode, prix, affichage }) {
  console.log('── Essai de la clé et des tarifs (des lectures seulement — rien n\'est créé, rien n\'est facturé) ──');
  const ab = await lire(hote, cle, '/v1/subscriptions?limit=1');
  if (ab.statut !== 200) echec('LA CLÉ NE LIT PAS LES ABONNEMENTS — ' + diagnostic(ab.statut, 'Subscriptions — lecture'));
  console.log('✓ la clé répond, en mode ' + mode + ' et lit les abonnements.');
  const avertissements = [];
  for (const [rythme, id] of Object.entries(prix)) {
    const attendu = rythme === 'annuel' ? 'year' : 'month';
    let p = await lire(hote, cle, '/v1/prices/' + encodeURIComponent(id) + '?expand%5B%5D=product');
    if (p.statut === 403) p = await lire(hote, cle, '/v1/prices/' + encodeURIComponent(id));      // sans le droit de lire les produits : le tarif seul
    if (p.statut === 403) { avertissements.push('le tarif ' + rythme + ' n\'a pas pu être relu : la clé n\'a pas le droit « Prices — lecture ». Il sera vérifié au premier paiement.'); console.log('⚠ tarif ' + rythme + ' : non relu (droit « Prices — lecture » absent).'); continue; }
    if (p.statut === 404) echec('LE TARIF ' + rythme.toUpperCase() + ' N\'EXISTE PAS dans ce mode — ' + diagnostic(404) + ' Presque toujours : un tarif de PRODUCTION collé avec une clé de TEST (ou l\'inverse), ou une faute de frappe dans l\'identifiant.');
    if (p.statut !== 200 || !p.corps || typeof p.corps !== 'object') echec('LE TARIF ' + rythme.toUpperCase() + ' NE SE LIT PAS — ' + diagnostic(p.statut, 'Prices — lecture'));
    const t = p.corps;
    if (t.active === false) echec('Le tarif ' + rythme + ' est ARCHIVÉ chez Stripe : on ne peut plus s\'y abonner.');
    if (!t.recurring || t.recurring.interval !== attendu || (t.recurring.interval_count || 1) !== 1) echec('Le tarif ' + rythme + ' n\'est pas un tarif ' + (rythme === 'annuel' ? 'ANNUEL (une fois par an)' : 'MENSUEL (une fois par mois)') + ' : il se renouvelle ' + (t.recurring ? 'tous les ' + (t.recurring.interval_count || 1) + ' ' + t.recurring.interval : 'jamais (paiement unique)') + '.');
    if (t.billing_scheme && t.billing_scheme !== 'per_unit') avertissements.push('le tarif ' + rythme + ' n\'est pas facturé « à l\'unité » : les places sont une QUANTITÉ, un tarif par paliers ne se comportera pas comme annoncé.');
    if (t.livemode !== undefined && (t.livemode ? 'live' : 'test') !== mode) echec('Le tarif ' + rythme + ' est du mode ' + (t.livemode ? 'production' : 'test') + ' et la clé du mode ' + mode + '.');
    const euros = Number.isFinite(t.unit_amount) ? t.unit_amount / 100 : null;
    const produit = t.product && typeof t.product === 'object' ? t.product : null;
    const nomProduit = produit && typeof produit.name === 'string' ? produit.name : null;
    console.log('✓ tarif ' + rythme + ' : ' + (euros === null ? 'montant variable' : euros.toFixed(2).replace('.', ',') + ' ' + String(t.currency || '').toUpperCase()) + ' par place' + (rythme === 'annuel' ? ' et par an' : ' et par mois') + (nomProduit ? ' — produit « ' + nomProduit + ' »' : ''));
    if (String(t.currency || '').toLowerCase() !== 'eur') avertissements.push('le tarif ' + rythme + ' n\'est pas en euros (' + String(t.currency || '?').toUpperCase() + ') : l\'écran annonce des euros.');
    if (euros !== null && Math.abs(euros - affichage[rythme]) > 0.001) avertissements.push('LE MONTANT ANNONCÉ À L\'ÉCRAN (' + affichage[rythme] + ' €) N\'EST PAS CELUI DE STRIPE (' + euros + ' €) : régler `facturation.affichage.' + rythme + '` dans le fichier de configuration, ou changer de tarif.');
    if (nomProduit !== null && !/messages/i.test(nomProduit)) avertissements.push('LE PRODUIT DU TARIF ' + rythme.toUpperCase() + ' (« ' + nomProduit + ' ») NE CONTIENT PAS « messages » : OP GESTION, qui lit tous les abonnements de ce compte, ne le rangerait en « OP MESSAGES » que si l\'identifiant de ce tarif est dans sa liste (`STRIPE_PRIX_MESSAGES`, server/index.js). Renomme le produit chez Stripe (« OP MESSAGES Pro ») ou fais ajouter ce tarif à la liste — sinon un abonnement de Messages Pro pourrait être pris pour un abonnement d\'OP GESTION.');
    if (nomProduit === null) avertissements.push('le nom du produit du tarif ' + rythme + ' n\'a pas pu être lu (droit « Products — lecture » absent) : vérifie à la main qu\'il contient « messages » (voir INSTALLER-LE-SERVEUR.md, § Stripe).');
  }
  for (const a of avertissements) console.log('⚠ ' + a);
  return avertissements.length;
}

/* ══ écrire la configuration : temporaire, relue, revalidée, renommée ═════════════════════════════════════════════════════════ */
function ecrire(config, bloc, { instance }) {
  const sansBloc = (o) => { const c = Object.assign({}, o); delete c.facturation; return JSON.stringify(c); };
  const attendu = sansBloc(config);
  const neuve = Object.assign({}, config, { facturation: bloc });
  const tmp = CONFIG_PATH + '.tmp-' + process.pid;
  /* ⛔ Créé en 0600 DÈS L'ÉCRITURE (`mode`, flag `wx`) : écrit d'abord avec le umask par défaut puis `chmod`, le fichier portait la clé lisible par tous les comptes de la machine pendant l'intervalle. */
  fs.writeFileSync(tmp, JSON.stringify(neuve, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  fs.chmodSync(tmp, 0o600);
  /* ⛔ LE PROPRIÉTAIRE SUIT LE FICHIER : lancé en root, le renommage donnerait un fichier root:root en 0600, que le service (utilisateur `opmsg`) ne pourrait plus lire. */
  try { const st = fs.statSync(CONFIG_PATH); fs.chownSync(tmp, st.uid, st.gid); } catch (e) { /* hors root, le propriétaire est déjà le bon */ }
  /* Relu ET revalidé AVANT de remplacer : on ne met pas en place une configuration que le service refuserait au démarrage, ni une qui aurait touché une autre clé que la facturation. */
  try {
    const relu = JSON.parse(fs.readFileSync(tmp, 'utf8'));
    facturationConfig(relu, { OPMSG_TEST_STRIPE: process.env.OPMSG_TEST_STRIPE }, instance);
    if (sansBloc(relu) !== attendu) throw new Error('une autre clé a changé');
  } catch (err) {
    try { fs.unlinkSync(tmp); } catch (e) { /* déjà parti */ }
    echec('le fichier écrit ne se relit pas comme prévu, ou le service le refuserait au démarrage.');
  }
  fs.renameSync(tmp, CONFIG_PATH);
  fs.chmodSync(CONFIG_PATH, 0o600);
}

/* L'hôte de Stripe, ou — pour les bancs, sur la bêta seulement — le faux en boucle locale (la même porte que le service : `OPMSG_TEST_STRIPE`, refusée en production par `facturationConfig`). */
const hoteDe = (valide) => valide.testHote ? 'http://' + valide.testHote : HOTE_STRIPE;

/* ══ le programme ═════════════════════════════════════════════════════════════════════════════════════════════════════════════ */
(async () => {
  for (const a of ARGS) if (a !== '--verifier') echec('option inconnue (« --verifier » est la seule).');
  if (!CONFIG_PATH) echec('OPMSG_CONFIG n\'est pas posé (le fichier de configuration de l\'instance, par exemple /etc/opmsg/beta.json).');
  let config;
  try { config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8')); }
  catch (e) { echec(CONFIG_PATH + ' illisible (' + (e && e.code === 'ENOENT' ? 'introuvable' : 'JSON invalide') + ') — ce script MODIFIE une configuration existante, il n\'en crée pas une neuve.'); }
  if (!config || typeof config !== 'object' || Array.isArray(config)) echec('le fichier doit contenir un objet JSON.');
  /* L'instance : celle que le fichier écrit par l'installation porte (« instance »), ou — à défaut — celle de l'environnement, comme le service (`OPMSG_INSTANCE`). Si les deux parlent et se
     contredisent, on s'arrête : écrire la clé de la production dans le fichier de la bêta est la faute qu'aucun nom ne rattrape. */
  const instance = config.instance || process.env.OPMSG_INSTANCE;
  if (instance !== 'beta' && instance !== 'prod') echec('le fichier ne dit pas de quelle instance il est (« instance » : beta ou prod).');
  if (config.instance && process.env.OPMSG_INSTANCE && config.instance !== process.env.OPMSG_INSTANCE) echec('le fichier dit « ' + config.instance + ' » et OPMSG_INSTANCE dit « ' + process.env.OPMSG_INSTANCE + ' » : une des deux est fausse.');
  const env = { OPMSG_TEST_STRIPE: process.env.OPMSG_TEST_STRIPE };
  const avant = config.facturation && typeof config.facturation === 'object' && !Array.isArray(config.facturation) ? config.facturation : null;

  if (VERIFIER) {
    console.log('\n══ Relire la facturation posée (' + instance + ') — sans afficher la clé ══\n');
    if (!avant || !avant.cle) echec('aucune clé Stripe n\'est configurée dans ce fichier : il n\'y a rien à vérifier. Lance d\'abord ce script sans option.');
    let valide;
    try { valide = facturationConfig(config, env, instance); } catch (e) { console.error('✗ la configuration du fichier serait REFUSÉE au démarrage : ' + String(e.message).replace(/^config: /, '')); fermer(); process.exit(1); }
    console.log('✓ la configuration du fichier est valide : le service la lira (mode ' + valide.mode + ').');
    const n = await eprouver({ hote: hoteDe(valide), cle: valide.cle, mode: valide.mode, prix: valide.prix, affichage: valide.affichage });
    fermer();
    console.log(n ? '\n⚠ ' + n + ' point(s) à regarder (ci-dessus). La clé répond.' : '\n✅ tout est en ordre.');
    return;
  }

  console.log('\n══ Facturation Stripe d\'OP MESSAGES (' + instance + ') ══\n');
  if (avant && avant.cle) console.log('Une facturation est déjà configurée. Ce script va la remplacer (les montants affichés, le rythme de relecture et le délai déjà réglés sont conservés).\n');
  console.log('Il faut la clé RESTREINTE d\'OP MESSAGES (créée dans le tableau de bord Stripe, droits : Checkout Sessions, Customers, Customer portal en écriture ;');
  console.log('Subscriptions, Prices et Products en lecture) et l\'identifiant de chaque tarif vendu (« price_… »). Voir design/opmessages/INSTALLER-LE-SERVEUR.md, § Stripe.');
  if (instance === 'beta') console.log('Sur la bêta : une clé de TEST (rk_test_…) seulement — « sans Stripe réel ».');
  if (AU_CLAVIER) console.log('La clé ne s\'affichera PAS pendant la frappe — c\'est normal.\n');
  else console.log('⚠ Entrée redirigée : la clé n\'est pas affichée, mais elle vient d\'un fichier. Au clavier, elle est masquée.\n');

  const cle = nettoyer(await demander('Clé restreinte Stripe d\'OP MESSAGES (masquée)        : ', true));
  const mensuel = nettoyer(await demander('Tarif MENSUEL  (price_…, Entrée = aucun)            : ', false));
  const annuel = nettoyer(await demander('Tarif ANNUEL   (price_…, Entrée = aucun)            : ', false));

  if (!cle) echec('La clé manque.');
  if (!RE_CLE_STRIPE.test(cle)) {
    if (/^sk_/.test(cle)) echec('⛔ C\'est une clé SECRÈTE COMPLÈTE (sk_…) : elle donnerait à ce service tout le compte Stripe, celui d\'OP GESTION compris. Crée une clé RESTREINTE (rk_…) propre à OP MESSAGES.');
    if (/^pk_/.test(cle)) echec('⛔ C\'est une clé PUBLIABLE (pk_…) : elle ne sert qu\'au navigateur. Il faut la clé RESTREINTE (rk_…).');
    echec('Ce n\'est pas une clé restreinte de Stripe (rk_test_… ou rk_live_…, suivie de lettres et de chiffres).');
  }
  if (!mensuel && !annuel) echec('Aucun tarif : il faut au moins le tarif mensuel ou le tarif annuel (price_…).');
  const prix = {}; if (mensuel) prix.mensuel = mensuel; if (annuel) prix.annuel = annuel;

  /* La MÊME validation que le démarrage du service : ce qui passe ici démarrera là. */
  const bloc = Object.assign({}, avant || {}, { cle, prix });
  let valide;
  try { valide = facturationConfig(Object.assign({}, config, { facturation: bloc }), env, instance); } catch (e) { echec(String(e.message).replace(/^config: /, '')); }

  /* Remplacer une clé, un mode ou un tarif n'est pas un geste anodin : les abonnements déjà pris restent chez Stripe, sous l'ANCIENNE clé et les anciens tarifs. On le dit, et on demande « oui ». */
  const changeMode = !!(avant && avant.cle && /^rk_test_/.test(avant.cle) !== /^rk_test_/.test(cle));
  const changePrix = !!(avant && avant.prix && JSON.stringify(avant.prix) !== JSON.stringify(prix));
  if (changeMode || changePrix) {
    console.log('\n⚠ Tu remplaces une facturation qui existe déjà :');
    if (changeMode) console.log('   · le MODE change (test ↔ production) : les abonnements déjà pris restent dans l\'ancien mode, ce service ne les relira plus.');
    if (changePrix) console.log('   · les TARIFS changent : un abonnement pris à l\'ancien tarif n\'est plus reconnu comme un abonnement d\'OP MESSAGES par ce service (seuls les tarifs configurés comptent).');
    const rep = (await demander('Tape « oui » pour continuer (autre chose : on s\'arrête) : ', false)).toLowerCase();
    if (rep !== 'oui') echec('Pas de « oui » : abandon.');
  }

  const n = await eprouver({ hote: hoteDe(valide), cle: valide.cle, mode: valide.mode, prix: valide.prix, affichage: valide.affichage });
  fermer();

  ecrire(config, bloc, { instance });
  const domaine = typeof config.domaine === 'string' && /^[A-Za-z0-9.-]+$/.test(config.domaine) ? config.domaine : '<domaine>';
  console.log('✅ ' + CONFIG_PATH + ' mis à jour (chmod 600). Mode ' + valide.mode + ', ' + Object.keys(valide.prix).join(' et ') + '.' + (n ? ' (' + n + ' point(s) à regarder, ci-dessus.)' : ''));
  console.log('\nPour finir, dans cet ordre :');
  console.log('   1. systemctl restart teamop-msg@' + instance);
  console.log('   2. au bout d\'une minute :   curl -s https://' + domaine + '/health');
  console.log('      « facturation » doit dire "mode":"' + valide.mode + '" et « stripeEchecMin » 0.');
  console.log('   3. dans le tableau de bord Stripe : activer le PORTAIL de facturation (Paramètres → Facturation → Portail client) — sans lui, « Gérer l\'abonnement » répond « le paiement n\'a pas pu être préparé ».');
  console.log('   4. relire à tout moment :   OPMSG_CONFIG=' + CONFIG_PATH + ' node /opt/opmsg/' + instance + '/current/configurer-stripe.js --verifier\n');
})().catch((e) => { console.error('\n✗ Le script a échoué en route (' + (e && e.code ? e.code : 'erreur') + ') — le message n\'est pas cité, il pourrait porter un chemin. Rien n\'a été modifié.'); fermer(); process.exit(1); });
