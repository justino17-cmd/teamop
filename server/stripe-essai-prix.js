#!/usr/bin/env node
/* ══ CRÉER CHEZ STRIPE, EN MODE TEST, LES DIX TARIFS DE L'ESPACE DE TEST — lancé par l'installeur (`bash install-test.sh stripe`), SUR LE VPS ═══
   node /opt/teamop/test/repo/server/stripe-essai-prix.js            crée ce qui manque, puis écrit la table dans la config de TEST
   node /opt/teamop/test/repo/server/stripe-essai-prix.js --essai    n'écrit RIEN (ni chez Stripe, ni dans la config) : dit ce qu'il ferait

   Pourquoi ce fichier (Justin, 23 octobre 2026 : « Stripe en mode test, carte 4242 ») : la page de paiement et la route `/api/stripe/checkout`
   ne connaissent que les dix identifiants `price_…` de PRODUCTION (`STRIPE_PRIX_FORMULE`, server/index.js). Avec une clé `sk_test_`, Stripe répond
   « No such price ». Ce script crée chez Stripe, en mode test, les dix tarifs ÉQUIVALENTS (mêmes montants, même devise, même rythme) et écrit
   dans la config de test la table `stripe.prixEssai` : { "<price_ de production>": "<price_ de test>", … }. Le serveur de test (seulement
   `espaceTest`) et `scripts/essais-build.js` la lisent — voir leurs commentaires.

   ⛔ REFUS, avant la moindre requête : une config qui n'est pas celle d'un serveur de test (`espaceTest` absent), ou une clé qui n'est pas
   `sk_test_` / `rk_test_`. Ce script ne doit JAMAIS créer un tarif dans le compte réel. Le chemin par défaut est celui de la config de TEST
   (/opt/teamop/test/config.json), jamais /opt/teamop/config.json.
   ⛔ LA CLÉ N'EST JAMAIS AFFICHÉE (CLAUDE.md : Justin recolle toutes ses sorties dans la conversation). Elle est lue dans la config, partie dans l'en-tête
   `Authorization` et nulle part ailleurs ; tout texte venu de Stripe ou d'une erreur passe par `propre()`, qui la retire avant de l'imprimer.
   ⛔ IDEMPOTENT : chaque tarif porte une CLÉ DE RECHERCHE (`teamop_essai_<formule>_<mensuel|annuel>`), cherchée AVANT de créer ; un produit par formule
   (étiquette `teamop_essai`), réutilisé. Relancé, le script ne crée rien de plus et réécrit la même table. Un tarif trouvé qui n'a plus le bon montant,
   le bon rythme ou qui est archivé est REMPLACÉ (nouveau tarif, la clé de recherche lui est transférée) : en mode test c'est sans risque, et la grille a pu
   changer depuis. Un tarif Stripe ne se modifie pas, il se remplace.
   La GRILLE n'est pas recopiée ici : les identifiants de production viennent de server/index.js, les prix mensuels, les noms et la remise annuelle de
   recap-abonnement.html (la page qui les affiche) — « Messages Business Premium » (retirée de la vente, donc absente de la page) est la seule valeur
   écrite ici, 25 €, avec son nom. Les options du Pro n'ont pas de tarif en production (`STRIPE_PRIX_OPTION` est vide) : rien n'est créé pour elles.
   La table est écrite par un fichier temporaire puis un renommage, avec le mode et le propriétaire de la config conservés. */
'use strict';
const fs = require('fs'), path = require('path');

const ARGS = process.argv.slice(2);
const ESSAI = ARGS.includes('--essai');
const CONFIG = process.env.TEAMOP_CONFIG || '/opt/teamop/test/config.json';
const SRC_SERVEUR = path.join(__dirname, 'index.js');
const SRC_PAGE = path.join(__dirname, '..', 'recap-abonnement.html');
const RETIREES = { msgpremium: { groupe: 'msg', nom: 'Messages Business Premium', prixMensuel: 25 } };   // absente de la page : retirée de la vente (1er octobre 2026)

let CLE = '';
/* tout ce qui sort passe par ici : la clé n'apparaît jamais, même dans le message d'une erreur que Stripe nous renverrait */
const propre = x => { let t = String(x == null ? '' : x); if (CLE) t = t.split(CLE).join('[clé masquée]'); return t.replace(/\b[sr]k_(live|test)_[A-Za-z0-9]+/g, '[clé masquée]'); };
const dis = x => process.stdout.write(propre(x) + '\n');
const echec = x => { process.stderr.write(propre(x) + '\n'); process.exit(1); };

/* la grille : ids de production dans le SERVEUR (sa définition), prix et noms dans la PAGE (la sienne) */
function lireGrille() {
  let srv = '', page = '';
  try { srv = fs.readFileSync(SRC_SERVEUR, 'utf8'); } catch (e) { echec('server/index.js illisible à côté de ce script — impossible de lire les tarifs de production.'); }
  try { page = fs.readFileSync(SRC_PAGE, 'utf8'); } catch (e) { echec('recap-abonnement.html illisible (le dépôt entier doit être là) — impossible de lire les prix.'); }
  const bloc = /^const STRIPE_PRIX_FORMULE = \{([\s\S]*?)\};/m.exec(srv);
  if (!bloc) echec('STRIPE_PRIX_FORMULE est introuvable dans server/index.js.');
  const formules = [];
  for (const m of bloc[1].matchAll(/^\s*(\w+): \['(price_[A-Za-z0-9]+)', '(price_[A-Za-z0-9]+)'\]/gm)) formules.push({ cle: m[1], prod: [m[2], m[3]] });
  if (formules.length !== 5 || new Set(formules.flatMap(f => f.prod)).size !== 10) echec('STRIPE_PRIX_FORMULE ne porte pas cinq formules de deux tarifs distincts (' + formules.length + ' lues) : rien n\'a été fait.');
  const remise = /^const REMISE_ANNUELLE = (\d+);/m.exec(page);
  if (!remise) echec('REMISE_ANNUELLE est introuvable dans recap-abonnement.html.');
  const debut = page.indexOf('\nconst FORMULES = {'), fin = page.indexOf('\nconst FORMULES_RETIREES');
  if (debut < 0 || fin < debut) echec('FORMULES est introuvable dans recap-abonnement.html.');
  const zone = page.slice(debut, fin);
  for (const f of formules) {
    const i = zone.indexOf('\n  ' + f.cle + ': {');
    let d = null;
    if (i >= 0) {
      const j = zone.indexOf('\n  }', i);
      const corps = zone.slice(i, j < 0 ? zone.length : j);
      const g = /\bgroupe: '(\w+)'/.exec(corps), n = /\bnom: '([^']+)'/.exec(corps), p = /\bprixMensuel: (\d+)/.exec(corps);
      if (g && n && p) d = { groupe: g[1], nom: n[1], prixMensuel: parseInt(p[1], 10) };
    } else if (RETIREES[f.cle]) d = RETIREES[f.cle];
    if (!d || !(d.prixMensuel > 0)) echec('la formule « ' + f.cle + ' » n\'a pas de prix lisible dans recap-abonnement.html : rien n\'a été fait.');
    f.groupe = d.groupe; f.nom = d.nom; f.prixMensuel = d.prixMensuel;
  }
  return { formules, mois: 12 - parseInt(remise[1], 10) };
}

async function stripe(methode, chemin, corps, cleIdem) {
  const h = { Authorization: 'Bearer ' + CLE };
  if (corps) h['Content-Type'] = 'application/x-www-form-urlencoded';
  if (cleIdem) h['Idempotency-Key'] = cleIdem;
  const r = await fetch('https://api.stripe.com' + chemin, { method: methode, headers: h, body: corps ? new URLSearchParams(corps).toString() : undefined, signal: AbortSignal.timeout(20000) });
  let j = null; try { j = await r.json(); } catch (e) { j = null; }
  if (!r.ok) throw new Error('Stripe ' + methode + ' ' + chemin.split('?')[0] + ' a refusé (' + r.status + ') : ' + ((j && j.error && j.error.message) || 'sans détail'));
  return j || {};
}

/* la config réécrite : fichier temporaire PUIS renommage, mode et propriétaire de l'original conservés (le service la lit en groupe, root la possède) */
function ecrireConfig(table) {
  const cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8'));   // relue ici, juste avant d'écrire : on ne repose pas une copie vieille de plusieurs secondes
  cfg.stripe = Object.assign({}, cfg.stripe, { prixEssai: table });
  const st = fs.statSync(CONFIG), tmp = path.join(path.dirname(CONFIG), '.' + path.basename(CONFIG) + '.' + process.pid + '.nouveau');
  try {
    const fd = fs.openSync(tmp, 'wx', st.mode & 0o777);
    try { fs.writeFileSync(fd, JSON.stringify(cfg, null, 2) + '\n'); fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
    fs.chmodSync(tmp, st.mode & 0o7777);
    try { fs.chownSync(tmp, st.uid, st.gid); } catch (e) { if (process.getuid && process.getuid() === 0) throw e; }
    fs.renameSync(tmp, CONFIG);
  } catch (e) { try { fs.unlinkSync(tmp); } catch (e2) {} throw e; }
}

(async () => {
  let cfg = null;
  try { cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { echec('Configuration illisible (' + CONFIG + ') : ' + (e && e.code === 'ENOENT' ? 'fichier absent' : 'JSON invalide') + '. Ce script se lance SUR LE VPS.'); }
  if (!cfg || cfg.espaceTest !== true) echec('⛔ ' + CONFIG + ' n\'est pas la configuration d\'un serveur de TEST (espaceTest absent) : rien n\'a été fait. Ce script ne crée jamais de tarif dans le compte réel.');
  CLE = String((cfg.stripe && cfg.stripe.secretKey) || '').trim();
  if (!CLE) echec('Aucune clé Stripe dans ' + CONFIG + ' (stripe.secretKey) : rien n\'a été fait. Pose-la d\'abord (bash install-test.sh stripe).');
  if (!/^(sk|rk)_test_[A-Za-z0-9]+$/.test(CLE)) { CLE = ''; echec('⛔ La clé Stripe de ' + CONFIG + ' n\'est pas une clé de TEST (sk_test_ / rk_test_) : rien n\'a été fait, rien n\'est parti chez Stripe.'); }
  const G = lireGrille();

  dis('Tarifs de TEST — ' + (ESSAI ? 'ESSAI : rien ne sera écrit' : 'création des tarifs manquants') + '\n');
  const produits = [];   // tous les produits actifs, une seule fois (lecture consistante, pas la recherche)
  for (let page = 0, apres = ''; page < 5; page++) {
    const l = await stripe('GET', '/v1/products?active=true&limit=100' + (apres ? '&starting_after=' + encodeURIComponent(apres) : ''));
    produits.push(...(l.data || []));
    if (!l.has_more || !(l.data || []).length) break;
    apres = l.data[l.data.length - 1].id;
  }
  const table = {}; let crees = 0, trouves = 0, remplaces = 0, manque = false;
  for (const f of G.formules) {
    let produit = (produits.find(p => p && p.metadata && p.metadata.teamop_essai === f.cle) || {}).id || '';
    const nomProduit = (f.groupe === 'msg' ? 'OP MESSAGES — ' : 'OP GESTION — ') + f.nom + ' (essai)';
    for (const [i, cycle, intervalle, montant] of [[0, 'mensuel', 'month', f.prixMensuel * 100], [1, 'annuel', 'year', f.prixMensuel * G.mois * 100]]) {
      const cle = 'teamop_essai_' + f.cle + '_' + cycle;
      const l = await stripe('GET', '/v1/prices?lookup_keys[]=' + encodeURIComponent(cle) + '&limit=1');
      const ex = (l.data || [])[0];
      let aRemplacer = false;
      if (ex) {
        const bon = ex.active !== false && ex.currency === 'eur' && ex.unit_amount === montant && ex.recurring && ex.recurring.interval === intervalle && (ex.recurring.interval_count || 1) === 1;
        if (bon) { trouves++; table[f.prod[i]] = ex.id; dis('✓ ' + cle + ' existe déjà (' + ex.id + ')'); continue; }
        aRemplacer = true;
        if (!produit) produit = typeof ex.product === 'string' ? ex.product : ((ex.product && ex.product.id) || '');
      }
      if (ESSAI) { dis('→ ' + (aRemplacer ? 'remplacerait ' : 'créerait ') + cle + ' : ' + montant / 100 + ' € par ' + (cycle === 'mensuel' ? 'mois' : 'an') + (produit ? '' : ' (et le produit « ' + nomProduit + ' »)')); manque = true; continue; }
      if (!produit) {
        const pr = await stripe('POST', '/v1/products', { name: nomProduit, 'metadata[teamop_essai]': f.cle }, 'teamop-essai-produit-' + f.cle + '-v1');
        produit = pr.id; dis('+ produit créé : ' + nomProduit);
      }
      const corps = { product: produit, currency: 'eur', unit_amount: String(montant), 'recurring[interval]': intervalle, lookup_key: cle, 'metadata[teamop_essai]': f.cle };
      if (aRemplacer) corps.transfer_lookup_key = 'true';
      const p = await stripe('POST', '/v1/prices', corps, 'teamop-essai-tarif-' + f.cle + '-' + cycle + '-' + montant + '-v1');
      if (aRemplacer) remplaces++; else crees++;
      table[f.prod[i]] = p.id; dis('+ ' + cle + (aRemplacer ? ' remplacé (' : ' créé (') + p.id + ')');
    }
  }
  const complet = Object.keys(table).length === 10 && Object.values(table).every(v => /^price_[A-Za-z0-9]+$/.test(String(v)));
  dis('\n' + (ESSAI ? 'Essai terminé : rien n\'a été écrit.' : crees + ' tarif(s) créé(s), ' + remplaces + ' remplacé(s), ' + trouves + ' déjà présent(s).'));
  if (ESSAI || manque || !complet) { dis(ESSAI ? 'La table n\'est pas écrite (essai).' : 'Table incomplète : rien n\'a été écrit dans la configuration.'); if (!ESSAI && !complet) process.exit(1); return; }
  let avant = null; try { avant = (cfg.stripe || {}).prixEssai; } catch (e) {}
  if (avant && JSON.stringify(Object.keys(table).sort().map(k => [k, table[k]])) === JSON.stringify(Object.keys(avant).sort().map(k => [k, avant[k]]))) { dis('La table `stripe.prixEssai` de la configuration était déjà à jour : rien n\'a été réécrit.'); return; }
  try { ecrireConfig(table); } catch (e) { echec('Les tarifs existent chez Stripe, mais la table n\'a pas pu être écrite dans la configuration : ' + (e && e.message ? e.message : e) + '. Relance le script.'); }
  dis('Table `stripe.prixEssai` écrite dans la configuration de test (10 tarifs). Relance le serveur de test pour qu\'elle serve : l\'installeur le fait au déploiement. La clé Stripe n\'a pas été affichée.');
})().catch(e => echec('Échec : ' + (e && e.message ? e.message : e)));
