#!/usr/bin/env node
/* ══ CRÉER CHEZ STRIPE LES TARIFS DES OPTIONS DU PRO — à lancer UNE FOIS, par Justin, SUR LE VPS ═══════════════════
   node /opt/teamop/repo/server/stripe-options.js            crée ce qui manque, puis affiche les identifiants
   node /opt/teamop/repo/server/stripe-options.js --essai    n'écrit RIEN chez Stripe : dit ce qu'il ferait

   Pourquoi ce fichier : les options du Pro (Stock 9 €, Achats 6 €, Encaissements et compta 6 €, Registre sanitaire 6 €, par
   utilisateur et par mois ; l'année dix mois — décision de Justin, 1er octobre 2026) se vendent par des tarifs Stripe que
   personne n'a encore créés. `STRIPE_PRIX_OPTION` (server/index.js) et `STRIPE_PRICES_OPTIONS` (recap-abonnement.html) sont
   VIDES tant que ce script n'a pas tourné : « les appareils d'abord, la porte ensuite » — vides, la page de paiement ne montre
   aucune case et le serveur refuse (`option_indisponible`). Le script imprime les deux blocs à coller ; il ne modifie aucun
   fichier du dépôt.

   ⛔ LA CLÉ STRIPE N'EST JAMAIS AFFICHÉE (CLAUDE.md : « ON NE FAIT JAMAIS AFFICHER UN SECRET SUR LE VPS — JUSTIN RECOLLE TOUTES
   SES SORTIES ICI »). Elle est lue dans `config.json` (`stripe.secretKey`), partie dans l'en-tête `Authorization` et nulle part
   ailleurs ; tout texte venu de Stripe passe par `propre()`, qui la retire avant de l'imprimer. Seuls les identifiants `price_…`
   sortent — ils sont publics (ils figurent déjà dans recap-abonnement.html).
   ⛔ IDEMPOTENT : chaque tarif porte une CLÉ DE RECHERCHE (`lookup_key` : `opg_option_<clé>_mensuel` ou `_annuel`). On la cherche
   AVANT de créer : relancé, le script ne crée rien de plus et réimprime les mêmes identifiants. Un produit déjà créé pour une
   option (étiquette `opg_option`) est réutilisé, jamais doublé. Un tarif trouvé dont le montant n'est pas celui de la grille
   est SIGNALÉ, jamais modifié : un tarif Stripe ne se change pas, il se remplace — c'est à Justin de décider.
   ⚠️ Il se conforme à un tarif Pro EXISTANT (devise, `tax_behavior` — « prix TTC » —, type récurrent) : un tarif d'option qui
   n'aurait pas la même nature que la formule qu'il complète ferait une facture mixte (Stripe refuse deux devises ou deux
   intervalles dans un abonnement). Si le tarif Pro n'est pas lisible, il S'ARRÊTE plutôt que de deviner.
   ⚠️ Le nom d'un produit d'option ne contient JAMAIS « messages » : `ligneMessages` (server/index.js) classerait la ligne comme
   OP MESSAGES. Le script le refuse lui-même. */
'use strict';
const fs = require('fs'), path = require('path');

const ARGS = process.argv.slice(2);
const ESSAI = ARGS.includes('--essai');
const CONFIG = process.env.TEAMOP_CONFIG || '/opt/teamop/config.json';
const SRC_SERVEUR = path.join(__dirname, 'index.js');

let CLE = '';
/* tout ce qui sort passe par ici : la clé n'apparaît jamais, même dans le message d'une erreur que Stripe nous renverrait */
const propre = x => { let t = String(x == null ? '' : x); if (CLE) t = t.split(CLE).join('[clé masquée]'); return t.replace(/\bsk_(live|test)_[A-Za-z0-9]+/g, '[clé masquée]'); };
const dis = x => process.stdout.write(propre(x) + '\n');
const echec = x => { process.stderr.write(propre(x) + '\n'); process.exit(1); };

/* la grille vient du SERVEUR (une seule définition) : son texte, jamais recopié ici */
function lireGrille() {
  let src = '';
  try { src = fs.readFileSync(SRC_SERVEUR, 'utf8'); } catch (e) { echec('server/index.js illisible à côté de ce script — impossible de lire la grille des options.'); }
  const prix = /^const OPTIONS_PRIX_MOIS = \{([^}]*)\};/m.exec(src);
  const cles = /^const OPTIONS_CLES = \[([^\]]*)\];/m.exec(src);
  const offerts = /^const MOIS_OFFERTS_ANNEE = (\d+);/m.exec(src);
  const pro = /^\s*pro: \['(price_\w+)', '(price_\w+)'\]/m.exec(src);
  if (!prix || !cles || !offerts) echec('la grille des options (OPTIONS_PRIX_MOIS, OPTIONS_CLES, MOIS_OFFERTS_ANNEE) est introuvable dans server/index.js.');
  const grille = {};
  for (const m of prix[1].matchAll(/(\w+):\s*(\d+)/g)) grille[m[1]] = parseInt(m[2], 10);
  const liste = [...cles[1].matchAll(/'(\w+)'/g)].map(m => m[1]);
  if (!liste.length || liste.some(k => !(grille[k] > 0))) echec('la grille des options est incomplète dans server/index.js.');
  return { liste, grille, mois: 12 - parseInt(offerts[1], 10), pro: pro ? [pro[1], pro[2]] : null };
}
const NOMS = { stock: 'OP GESTION — Option Stock', achats: 'OP GESTION — Option Achats fournisseurs',
  compta: 'OP GESTION — Option Encaissements et compta', sanitaire: 'OP GESTION — Option Registre sanitaire' };

async function stripe(methode, chemin, corps, cleIdem) {
  const h = { Authorization: 'Bearer ' + CLE };
  if (corps) h['Content-Type'] = 'application/x-www-form-urlencoded';
  if (cleIdem) h['Idempotency-Key'] = cleIdem;
  const r = await fetch('https://api.stripe.com' + chemin, { method: methode, headers: h, body: corps ? new URLSearchParams(corps).toString() : undefined });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) throw new Error('Stripe ' + methode + ' ' + chemin.split('?')[0] + ' a refusé (' + r.status + ') : ' + ((j && j.error && j.error.message) || 'sans détail'));
  return j || {};
}

(async () => {
  let cfg = null;
  try { cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { echec('Configuration illisible (' + CONFIG + ') : ' + (e && e.code === 'ENOENT' ? 'fichier absent' : 'JSON invalide') + '. Ce script se lance SUR LE VPS.'); }
  CLE = String((cfg && cfg.stripe && cfg.stripe.secretKey) || '').trim();
  if (!CLE) echec('Aucune clé Stripe dans ' + CONFIG + ' (stripe.secretKey) : rien n\'a été fait. Pose-la d\'abord (server/set-stripe.sh).');
  const G = lireGrille();
  if (G.liste.some(k => /messages/i.test(NOMS[k] || ''))) echec('un nom de produit d\'option contient « messages » : refusé (voir l\'en-tête).');
  if (G.liste.some(k => !NOMS[k])) echec('une option de la grille n\'a pas de nom de produit dans ce script.');
  if (!G.pro) echec('le tarif Pro (STRIPE_PRIX_FORMULE.pro) est introuvable dans server/index.js : impossible de s\'y conformer.');

  dis('Options du Pro — ' + (ESSAI ? 'ESSAI : rien ne sera écrit chez Stripe' : 'création des tarifs manquants') + '\n');
  /* la nature du tarif Pro : devise, « TTC » (tax_behavior), récurrent — et ses deux intervalles */
  const nature = [];
  for (let i = 0; i < 2; i++) {
    const p = await stripe('GET', '/v1/prices/' + encodeURIComponent(G.pro[i]));
    const r = p.recurring || {};
    if (!p.currency || !r.interval) echec('le tarif Pro ' + G.pro[i] + ' n\'est pas un tarif récurrent lisible : rien n\'a été créé.');
    nature.push({ devise: p.currency, taxe: p.tax_behavior || '', intervalle: r.interval, nb: r.interval_count || 1 });
  }
  const iMois = nature.findIndex(n => n.intervalle === 'month'), iAn = nature.findIndex(n => n.intervalle === 'year');
  if (iMois < 0 || iAn < 0 || nature[iMois].devise !== nature[iAn].devise) echec('les tarifs Pro ne sont pas un mensuel et un annuel de même devise : rien n\'a été créé.');
  dis('Nature relevée sur le tarif Pro : ' + nature[iMois].devise.toUpperCase() + ', ' + (nature[iMois].taxe ? 'taxe « ' + nature[iMois].taxe + ' »' : 'taxe non précisée') + '.\n');

  const produits = [];   // tous les produits actifs, une seule fois (lecture consistante, pas la recherche)
  for (let page = 0, apres = ''; page < 5; page++) {
    const l = await stripe('GET', '/v1/products?active=true&limit=100' + (apres ? '&starting_after=' + encodeURIComponent(apres) : ''));
    produits.push(...(l.data || []));
    if (!l.has_more || !(l.data || []).length) break;
    apres = l.data[l.data.length - 1].id;
  }
  const res = {}; let crees = 0, trouves = 0, alertes = 0;
  for (const k of G.liste) {
    res[k] = {};
    let produit = (produits.find(p => p && p.metadata && p.metadata.opg_option === k) || {}).id || '';
    for (const [cycle, n, montant] of [['mensuel', 'month', G.grille[k] * 100], ['annuel', 'year', G.grille[k] * G.mois * 100]]) {
      const cle = 'opg_option_' + k + '_' + cycle;
      const l = await stripe('GET', '/v1/prices?lookup_keys[]=' + encodeURIComponent(cle) + '&limit=1');
      const ex = (l.data || [])[0];
      if (ex) {
        /* ⛔ UN TARIF ARCHIVÉ OU D'UN AUTRE RYTHME N'EST PAS UN TARIF TROUVÉ (`gardien`, 1er octobre 2026, rejoué). La recherche par clé rend
           aussi les tarifs ARCHIVÉS : un tarif retiré de la vente était imprimé « existe déjà » — et son identifiant collé dans le
           serveur, où Stripe refuse tout paiement qui le porte. Un mensuel qui est en fait annuel (ou l'inverse) ferait payer un
           autre calendrier que celui qu'affiche la page. Rien n'est modifié ici : on s'arrête et on dit quoi regarder. */
        if (ex.active === false) echec('⚠️  ' + cle + ' existe chez Stripe (' + ex.id + ') mais il est ARCHIVÉ : il ne peut plus servir à un paiement. Rien n\'a été modifié — réactive-le dans le tableau de bord Stripe, ou change sa clé de recherche, puis relance.');
        const rythme = ex.recurring && ex.recurring.interval;
        if (rythme !== n) echec('⚠️  ' + cle + ' existe chez Stripe (' + ex.id + ') mais son rythme est « ' + (rythme || 'aucun') + ' » au lieu de « ' + n + ' » : le client paierait un autre calendrier que celui de la page. Rien n\'a été modifié — corrige-le dans le tableau de bord Stripe, puis relance.');
        trouves++; res[k][cycle] = ex.id; if (!produit) produit = typeof ex.product === 'string' ? ex.product : ((ex.product && ex.product.id) || '');
        if (ex.unit_amount !== montant) { alertes++; dis('⚠️  ' + cle + ' existe déjà à ' + ex.unit_amount / 100 + ' € (la grille dit ' + montant / 100 + ' €) : NON modifié — un tarif Stripe se remplace, c\'est ta décision.'); }
        else dis('✓ ' + cle + ' existe déjà (' + ex.id + ')');
        continue;
      }
      if (ESSAI) { dis('→ créerait ' + cle + ' : ' + montant / 100 + ' € par utilisateur ' + (cycle === 'mensuel' ? 'et par mois' : 'et par an') + (produit ? '' : ' (et le produit « ' + NOMS[k] + ' »)')); res[k][cycle] = ''; continue; }
      if (!produit) {
        const pr = await stripe('POST', '/v1/products', { name: NOMS[k], 'metadata[opg_option]': k }, 'opg-option-produit-' + k + '-v1');
        produit = pr.id; dis('+ produit créé : ' + NOMS[k]);
      }
      const nat = nature[n === 'month' ? iMois : iAn];
      const corps = { product: produit, currency: nat.devise, unit_amount: String(montant), 'recurring[interval]': nat.intervalle, lookup_key: cle, 'metadata[opg_option]': k };
      if (nat.nb > 1) corps['recurring[interval_count]'] = String(nat.nb);
      if (nat.taxe && nat.taxe !== 'unspecified') corps.tax_behavior = nat.taxe;
      const p = await stripe('POST', '/v1/prices', corps, 'opg-option-tarif-' + k + '-' + cycle + '-v1');
      crees++; res[k][cycle] = p.id; dis('+ ' + cle + ' créé (' + p.id + ')');
    }
  }
  dis('\n' + (ESSAI ? 'Essai terminé : rien n\'a été écrit chez Stripe.' : crees + ' tarif(s) créé(s), ' + trouves + ' déjà présent(s).') + (alertes ? ' ' + alertes + ' montant(s) à vérifier.' : ''));
  if (G.liste.some(k => !res[k].mensuel || !res[k].annuel)) { dis('Pas encore d\'identifiants à coller (essai, ou tarif manquant). Relance sans --essai.'); return; }
  const larg = Math.max(...G.liste.map(k => k.length)) + 3;
  dis('\n── 1. server/index.js : remplace le bloc STRIPE_PRIX_OPTION (garde ces deux espaces après les deux-points) ──');
  dis('const STRIPE_PRIX_OPTION = {\n' + G.liste.map(k => '  ' + (k + ':').padEnd(larg) + '[\'' + res[k].mensuel + '\', \'' + res[k].annuel + '\']').join(',\n') + ' };');
  dis('\n── 2. recap-abonnement.html : remplace le bloc STRIPE_PRICES_OPTIONS ──');
  dis('const STRIPE_PRICES_OPTIONS = {\n' + G.liste.map(k => '  ' + k + ': { mensuel: \'' + res[k].mensuel + '\', annuel: \'' + res[k].annuel + '\' }').join(',\n') + ' };');
  dis('\nLes deux blocs doivent porter les MÊMES identifiants (tests/test-852.js les compare). La clé Stripe n\'a pas été affichée.');
})().catch(e => echec('Échec : ' + (e && e.message ? e.message : e)));
